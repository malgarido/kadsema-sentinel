/* ============================================================
   KADSEMA SENTINEL — Supabase store adapter (Vite / npm build)
   Exposes the SAME window.SentinelStore surface as the local
   prototype store, so no view code changes. Activated when
   VITE_DATA_MODE=supabase. Requires VITE_SUPABASE_URL and
   VITE_SUPABASE_ANON_KEY in your .env.
   See ../../supabase/ for schema.sql, seed.sql and the
   log_incident RPC.
   ============================================================ */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("[SENTINEL] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — falling back to read-only empty state.");
}
const db = createClient(url || "http://localhost", key || "anon");

const FLOW = ["Reported", "Verified", "Responding", "Closed"];
const KAD = window.KAD;

let state = { incidents: [], dissemination: [], broadcasts: [], lgas: [], toasts: [] };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const patch = (p) => { state = { ...state, ...p }; emit(); };

/* ---------- shapers: DB row -> UI object shape ---------- */
function minsAgo(ts) { return Math.round((Date.now() - new Date(ts)) / 60000); }
function fmtPoint(g) { try { return g.coordinates[1].toFixed(4) + ", " + g.coordinates[0].toFixed(4); } catch { return "—"; } }
function lgaName(id) { return (state.lgas.find((l) => l.id === id) || {}).name || "—"; }
function lgaId(name) { return (state.lgas.find((l) => l.name === name) || {}).id; }

function shapeIncident(row, events) {
  return {
    id: row.id, type: row.type, icon: row.icon, sev: row.severity, status: row.status,
    lga: lgaName(row.lga_id), ward: row.ward, channel: row.channel,
    reporter: row.reporter_name, desc: row.description, sla: row.sla,
    team: row.assigned_team || "—", at: new Date(row.created_at),
    coords: row.geom ? fmtPoint(row.geom) : "—",
    chain: (events || []).map((e) => [e.actor_tier, e.note, minsAgo(e.created_at)]),
  };
}
function shapeAlert(row) {
  return {
    ch: (row.channels || []).join(" · "), lang: row.language,
    lga: row.scope || "Statewide", recipients: row.recipients,
    msg: row.message, at: new Date(row.sent_at),
  };
}

/* ---------- load + realtime ---------- */
async function hydrate() {
  const [inc, ev, al, lg, bc] = await Promise.all([
    db.from("incident").select("*").order("created_at", { ascending: false }),
    db.from("incident_event").select("*").order("created_at", { ascending: true }),
    db.from("alert").select("*").order("sent_at", { ascending: false }),
    db.from("lga").select("*"),
    db.from("broadcast_queue").select("*").order("created_at", { ascending: false }),
  ]);
  const byInc = {};
  (ev.data || []).forEach((e) => (byInc[e.incident_id] ||= []).push(e));
  patch({
    lgas: lg.data || [],
    incidents: (inc.data || []).map((i) => shapeIncident(i, byInc[i.id])),
    dissemination: (al.data || []).map(shapeAlert),
    broadcasts: (bc.data || []).map((b) => ({
      id: b.id, scope: b.scope, lang: b.language, msg: b.message,
      priority: b.priority || "Routine", status: b.status || "Queued",
      at: new Date(b.created_at), operator: b.operator || null,
    })),
  });
}
function subscribeRealtime() {
  db.channel("ops")
    .on("postgres_changes", { event: "*", schema: "public", table: "incident" }, hydrate)
    .on("postgres_changes", { event: "*", schema: "public", table: "alert" }, hydrate)
    .on("postgres_changes", { event: "*", schema: "public", table: "broadcast_queue" }, hydrate)
    .subscribe();
}

/* ---------- toasts ---------- */
let toastSeq = 1;
function toast(msg, kind = "ok") {
  const t = { id: toastSeq++, msg, kind };
  patch({ toasts: [...state.toasts, t] });
  setTimeout(() => patch({ toasts: state.toasts.filter((x) => x.id !== t.id) }), 4200);
}
function dismissToast(id) { patch({ toasts: state.toasts.filter((x) => x.id !== id) }); }

/* ---------- actions (identical signatures to local store) ---------- */
async function addIncident(d) {
  const { data, error } = await db.rpc("log_incident", {
    p_type: d.type, p_icon: d.icon, p_severity: d.sev,
    p_lga: lgaId(d.lga), p_ward: d.ward, p_channel: d.channel, p_description: d.desc,
  });
  if (error) { toast("Could not log incident: " + error.message, "info"); return; }
  toast("Incident " + data.id + " logged · " + d.lga, "ok");
  await hydrate();
  return data.id;
}
async function advanceIncident(id) {
  const inc = state.incidents.find((i) => i.id === id);
  if (!inc) return;
  const next = FLOW[FLOW.indexOf(inc.status) + 1];
  if (!next) return;
  const team = next === "Responding"
    ? "Zonal Response — " + ((state.lgas.find((l) => l.name === inc.lga) || {}).zone || "")
    : inc.team;
  const { error } = await db.from("incident")
    .update({ status: next, assigned_team: team, sla: next === "Closed" ? "ok" : inc.sla })
    .eq("id", id);
  if (error) { toast(error.message, "info"); return; }
  const verb = { Verified: "validated", Responding: "escalated — team deploying", Closed: "closed" }[next];
  toast(id + " " + verb, next === "Closed" ? "ok" : "info");
  await hydrate();
}
async function dispatchAlert(payload) {
  const { error } = await db.from("alert").insert({
    channels: payload.channels, language: payload.lang,
    lga_id: lgaId(payload.lga), scope: payload.lga || "Statewide",
    message: payload.msg, recipients: payload.recipients,
  });
  if (error) { toast(error.message, "info"); return; }
  toast("Alert dispatched via " + payload.channels.join(", "), "alert");
  await hydrate();
}
function reset() { toast("Reset is disabled in live mode", "info"); }

/* ---------- broadcast desk (radio/TV human-in-the-loop) ---------- */
async function setBroadcastStatus(id, status) {
  const operator = (status === "On Air" || status === "Aired") ? "Broadcast Desk" : null;
  const { error } = await db.from("broadcast_queue")
    .update({ status, ...(operator ? { operator } : {}) })
    .eq("id", id);
  if (error) { toast(error.message, "info"); return; }
  const msg = { "On Air": "now reading on air", "Aired": "marked as aired", "Queued": "returned to queue" }[status];
  toast(id + " " + msg, status === "Aired" ? "ok" : "info");
  await hydrate();
}

/* ---------- selectors ---------- */
function incidentsView() { return state.incidents; }
function dissView() { return state.dissemination; }
function broadcastView() { return state.broadcasts || []; }
function counts() {
  const inc = state.incidents;
  return {
    active: inc.filter((i) => i.status !== "Closed").length,
    responding: inc.filter((i) => i.status === "Responding").length,
    level3: inc.filter((i) => i.sev === 3 && i.status !== "Closed").length,
    reported: inc.filter((i) => i.status === "Reported").length,
    pendingBroadcast: (state.broadcasts || []).filter((b) => b.status === "Queued").length,
    displaced: KAD ? KAD.counts.displaced : 0,
  };
}
function useStore() {
  return window.React.useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state
  );
}

window.SentinelStore = {
  useStore, get state() { return state; },
  incidentsView, dissView, broadcastView, counts,
  addIncident, advanceIncident, dispatchAlert, setBroadcastStatus, reset, toast, dismissToast,
};

/* boot */
await hydrate();
subscribeRealtime();
emit();
