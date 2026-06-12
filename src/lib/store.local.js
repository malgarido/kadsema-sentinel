/* ============================================================
   KADSEMA SENTINEL — Live state store (persistent)
   Client-side persistence layer. Acts as the system's
   working memory; swap for a real REST/Supabase backend
   by re-implementing the same actions (see deploy/ docs).
   ============================================================ */
(function () {
  "use strict";
  const LS_KEY = "kadsema_sentinel_v2";
  const listeners = new Set();
  let state;

  function seed() {
    return {
      incidents: KAD.INCIDENTS.map((i) => ({ ...i, at: i.at.getTime(), chain: i.chain.map((c) => [...c]) })),
      dissemination: KAD.DISSEMINATION.map((d) => ({ ...d, at: d.at.getTime() })),
      broadcasts: KAD.BROADCASTS.map((b) => ({ ...b, at: b.at.getTime() })),
      seq: 2062,
      bseq: 5,
      log: [],          // audit trail
      toasts: [],
      seededAt: Date.now(),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.incidents) {
          // migrate older persisted state that predates new fields
          if (!s.broadcasts) { s.broadcasts = KAD.BROADCASTS.map((b) => ({ ...b, at: b.at.getTime() })); }
          if (s.bseq == null) { s.bseq = 5; }
          return s;
        }
      }
    } catch (e) {}
    return seed();
  }

  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...state, toasts: [] })); } catch (e) {}
  }

  function set(next) {
    state = next;
    persist();
    listeners.forEach((l) => l());
  }

  state = load();

  /* ---- derived helpers (Date revival on read) ---- */
  function incidentsView() {
    return state.incidents.map((i) => ({ ...i, at: new Date(i.at) }));
  }
  function dissView() {
    return state.dissemination.map((d) => ({ ...d, at: new Date(d.at) }));
  }
  function broadcastView() {
    return (state.broadcasts || []).map((b) => ({ ...b, at: new Date(b.at) }));
  }
  function counts() {
    const inc = state.incidents;
    return {
      active: inc.filter((i) => i.status !== "Closed").length,
      responding: inc.filter((i) => i.status === "Responding").length,
      level3: inc.filter((i) => i.sev === 3 && i.status !== "Closed").length,
      reported: inc.filter((i) => i.status === "Reported").length,
      pendingBroadcast: (state.broadcasts || []).filter((b) => b.status === "Queued").length,
      displaced: KAD.counts.displaced,
    };
  }

  /* ---- audit log ---- */
  function logEntry(action, ref, detail) {
    return { id: "log" + Date.now() + Math.random().toString(36).slice(2, 5), action, ref, detail, at: KAD.NOW.getTime() };
  }

  /* ---- toast ---- */
  let toastSeq = 1;
  function toast(msg, kind) {
    const t = { id: toastSeq++, msg, kind: kind || "ok" };
    set({ ...state, toasts: [...state.toasts, t] });
    setTimeout(() => {
      set({ ...state, toasts: state.toasts.filter((x) => x.id !== t.id) });
    }, 4200);
  }
  function dismissToast(id) { set({ ...state, toasts: state.toasts.filter((x) => x.id !== id) }); }

  /* ---- incident lifecycle ---- */
  const FLOW = KAD.STATUS_FLOW; // Reported, Verified, Responding, Closed
  const CHAIN_FOR_STATUS = {
    Verified: ["LGA", "Validated by desk officer"],
    Responding: ["Zonal", "Verified · response team assigned"],
    Closed: ["HQ", "Resolved · report filed"],
  };

  function addIncident(d) {
    const lga = KAD.lgaByName[d.lga] || {};
    const id = "INC-" + state.seq;
    const inc = {
      id, type: d.type, icon: d.icon, lga: d.lga, ward: d.ward || "—",
      sev: d.sev, status: "Reported", channel: d.channel || "EOC Console",
      reporter: d.reporter || "EOC Operator", at: KAD.NOW.getTime(),
      team: "—", desc: d.desc || "Incident logged from EOC console — awaiting validation.",
      coords: d.coords || (lga.center ? (10 + Math.random()).toFixed(4) + ", " + (7 + Math.random()).toFixed(4) : "—"),
      sla: "watch",
      chain: [["Community", "Logged via " + (d.channel || "EOC Console"), 0]],
    };
    set({
      ...state, seq: state.seq + 1,
      incidents: [inc, ...state.incidents],
      log: [logEntry("INCIDENT_LOGGED", id, d.type + " · " + d.lga), ...state.log],
    });
    toast("Incident " + id + " logged · " + d.lga, "ok");
    return id;
  }

  function advanceIncident(id) {
    const inc = state.incidents.find((i) => i.id === id);
    if (!inc) return;
    const idx = FLOW.indexOf(inc.status);
    if (idx >= FLOW.length - 1) return;
    const next = FLOW[idx + 1];
    const ch = CHAIN_FOR_STATUS[next];
    const team = next === "Responding" ? "Zonal Response — " + (KAD.lgaByName[inc.lga] || {}).zone : inc.team;
    const updated = {
      ...inc, status: next, team,
      sla: next === "Closed" ? "ok" : inc.sla,
      chain: [...inc.chain, [ch[0], ch[1], 0]],
    };
    set({
      ...state,
      incidents: state.incidents.map((i) => (i.id === id ? updated : i)),
      log: [logEntry("STATUS_" + next.toUpperCase(), id, inc.type + " → " + next), ...state.log],
    });
    const verb = { Verified: "validated", Responding: "escalated — team deploying", Closed: "closed" }[next];
    toast(id + " " + verb, next === "Closed" ? "ok" : "info");
  }

  function dispatchAlert(payload) {
    const entry = {
      ch: payload.channels.join(" · "),
      lang: payload.lang,
      lga: payload.lga || "Statewide",
      at: KAD.NOW.getTime(),
      recipients: payload.recipients || "—",
      msg: payload.msg,
    };
    const next = {
      ...state,
      dissemination: [entry, ...state.dissemination],
      log: [logEntry("ALERT_DISPATCHED", payload.lga || "Statewide", payload.channels.join("/")), ...state.log],
    };
    // Radio / TV is a person-in-the-loop step -> enqueue to the broadcast desk
    if (payload.channels.some((c) => /radio|tv/i.test(c))) {
      const b = {
        id: "BC-" + state.bseq,
        scope: payload.lga || "Statewide",
        lang: payload.lang,
        msg: payload.msg,
        priority: payload.priority || (payload.channels.some((c) => /siren/i.test(c)) ? "Urgent" : "Routine"),
        status: "Queued",
        at: KAD.NOW.getTime(),
        operator: null,
      };
      next.broadcasts = [b, ...(state.broadcasts || [])];
      next.bseq = state.bseq + 1;
    }
    set(next);
    toast("Alert dispatched via " + payload.channels.join(", "), "alert");
  }

  /* ---- broadcast desk (radio/TV human-in-the-loop) ---- */
  function setBroadcastStatus(id, status) {
    const b = (state.broadcasts || []).find((x) => x.id === id);
    if (!b) return;
    const updated = { ...b, status, operator: status === "On Air" || status === "Aired" ? "Broadcast Desk · A. Bello" : b.operator };
    set({
      ...state,
      broadcasts: state.broadcasts.map((x) => (x.id === id ? updated : x)),
      log: [logEntry("BROADCAST_" + status.toUpperCase().replace(/\s/g, "_"), id, b.scope), ...state.log],
    });
    const msg = { "On Air": "now reading on air", "Aired": "marked as aired", "Queued": "returned to queue" }[status];
    toast(id + " " + msg, status === "Aired" ? "ok" : "info");
  }

  function reset() {
    set(seed());
    toast("Demo data reset to baseline", "info");
  }

  /* ---- React hook ---- */
  function useStore() {
    return React.useSyncExternalStore(
      (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
      () => state
    );
  }

  window.SentinelStore = {
    useStore,
    get state() { return state; },
    incidentsView, dissView, broadcastView, counts,
    addIncident, advanceIncident, dispatchAlert, setBroadcastStatus, reset,
    toast, dismissToast,
  };
})();
