// ============================================================
// KADSEMA SENTINEL — Alert fan-out Edge Function
// ------------------------------------------------------------
// Triggered by a Postgres webhook on INSERT into `alert`.
// Reads the alert's channels[] and dispatches to each provider:
//   SMS / USSD  -> Africa's Talking (or Termii)
//   WhatsApp    -> WhatsApp Business Cloud API
//   Siren       -> siren controller HTTP endpoint
//   Radio       -> writes a task to the broadcast desk queue
// Delivery receipts are written back to `alert_delivery`.
//
// Deploy:
//   supabase functions deploy dispatch-alert --no-verify-jwt
//   supabase secrets set AT_API_KEY=... AT_USERNAME=... \
//       AT_SENDER_ID=KADSEMA WHATSAPP_TOKEN=... WHATSAPP_PHONE_ID=... \
//       SIREN_ENDPOINT=... SIREN_KEY=...
//
// Wire the webhook (Supabase → Database → Webhooks), or use the
// SQL trigger in dispatch-alert.sql (same folder).
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------- provider adapters ----------
// Each returns { provider, status, detail }. Stubbed network calls
// are clearly marked — drop in real credentials/endpoints to go live.

async function sendSMS(alert: AlertRow, recipients: string[]) {
  const key = Deno.env.get("AT_API_KEY");
  const username = Deno.env.get("AT_USERNAME");
  if (!key || !username) return note("SMS", "skipped", "AT credentials not set");
  // Africa's Talking bulk SMS
  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey: key,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      username,
      to: recipients.join(","),
      message: alert.message,
      from: Deno.env.get("AT_SENDER_ID") ?? "KADSEMA",
    }),
  });
  const body = await res.json().catch(() => ({}));
  return note("SMS", res.ok ? "sent" : "error", JSON.stringify(body).slice(0, 280));
}

async function sendWhatsApp(alert: AlertRow, recipients: string[]) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
  if (!token || !phoneId) return note("WhatsApp", "skipped", "WA credentials not set");
  const results = [];
  for (const to of recipients) {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: alert.message },
      }),
    });
    results.push(res.ok);
  }
  const ok = results.filter(Boolean).length;
  return note("WhatsApp", ok ? "sent" : "error", `${ok}/${recipients.length} delivered`);
}

async function fireSirens(alert: AlertRow) {
  const endpoint = Deno.env.get("SIREN_ENDPOINT");
  if (!endpoint) return note("Siren", "skipped", "siren endpoint not set");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": Deno.env.get("SIREN_KEY") ?? "" },
    body: JSON.stringify({ zone: alert.scope, pattern: "evacuate", ttl: 600 }),
  });
  return note("Siren", res.ok ? "activated" : "error", `zone ${alert.scope}`);
}

async function queueRadio(alert: AlertRow) {
  // Radio/TV is a human step — push to the broadcast desk queue.
  const urgent = (alert.channels || []).some((c) => /siren/i.test(c));
  await supabase.from("broadcast_queue").insert({
    alert_id: alert.id, scope: alert.scope, message: alert.message, language: alert.language,
    priority: urgent ? "Urgent" : "Routine", status: "Queued",
  }).catch(() => {});
  return note("Radio", "queued", "broadcast desk");
}

// ---------- main handler ----------
serve(async (req) => {
  try {
    const payload = await req.json();
    // Supabase DB webhook shape: { type, table, record, ... }
    const alert: AlertRow = payload.record ?? payload;
    if (!alert || !alert.channels) {
      return json({ error: "no alert record" }, 400);
    }

    // Resolve recipient phone numbers for the alert scope.
    const recipients = await resolveRecipients(alert);

    const channels: string[] = alert.channels.map((c: string) => c.split(" ")[0]);
    const jobs: Promise<DeliveryNote>[] = [];
    if (channels.includes("SMS")) jobs.push(sendSMS(alert, recipients));
    if (channels.includes("WhatsApp")) jobs.push(sendWhatsApp(alert, recipients));
    if (channels.includes("Siren")) jobs.push(fireSirens(alert));
    if (channels.includes("Radio")) jobs.push(queueRadio(alert));

    const results = await Promise.all(jobs);

    // Write delivery receipts back.
    await supabase.from("alert_delivery").insert(
      results.map((r) => ({ alert_id: alert.id, ...r })),
    ).catch(() => {});

    return json({ alert_id: alert.id, recipients: recipients.length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// ---------- helpers ----------
interface AlertRow { id: string; channels: string[]; message: string; language: string; scope: string; lga_id?: string; }
interface DeliveryNote { provider: string; status: string; detail: string; }
function note(provider: string, status: string, detail: string): DeliveryNote { return { provider, status, detail }; }
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function resolveRecipients(alert: AlertRow): Promise<string[]> {
  // Statewide -> everyone with a phone; otherwise users in the alert's LGA.
  let q = supabase.from("app_user").select("phone").not("phone", "is", null);
  if (alert.lga_id) q = q.eq("lga_id", alert.lga_id);
  const { data } = await q;
  return (data ?? []).map((r: { phone: string }) => r.phone).filter(Boolean);
}
