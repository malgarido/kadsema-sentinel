# dispatch-alert — Edge Function

Fans a newly-issued alert out to every selected channel (SMS, WhatsApp, sirens,
radio queue) and records delivery receipts. This is the bridge between the
**Early Warning Console → Dispatch alert** button and the real world.

```
alert INSERT ──(DB webhook / trigger)──▶ dispatch-alert ──┬─▶ Africa's Talking  (SMS/USSD)
                                                          ├─▶ WhatsApp Cloud API
                                                          ├─▶ Siren controller
                                                          └─▶ broadcast_queue   (radio desk)
                                                                   │
                                                          alert_delivery ◀── receipts
```

## Deploy

```bash
# 1. tables + trigger
psql "$DATABASE_URL" -f dispatch-alert.sql      # or paste in the SQL editor

# 2. the function
supabase functions deploy dispatch-alert --no-verify-jwt

# 3. provider secrets (set only the ones you use)
supabase secrets set \
  AT_API_KEY=...           AT_USERNAME=...      AT_SENDER_ID=KADSEMA \
  WHATSAPP_TOKEN=...       WHATSAPP_PHONE_ID=... \
  SIREN_ENDPOINT=https://siren.kadsema.gov.ng/activate  SIREN_KEY=...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in the
Edge runtime.

## Trigger options

- **Database Webhooks** (recommended) — Dashboard → Database → Webhooks → on
  `INSERT` to `alert`, POST to the function URL. Supabase handles auth; you can
  skip the SQL trigger.
- **SQL trigger** — `dispatch-alert.sql` uses `pg_net` to POST directly. Set the
  service-role key as shown in that file.

## Providers

| Channel | Provider | Swap-in |
|---|---|---|
| SMS / USSD | Africa's Talking | Termii / Twilio — change `sendSMS()` |
| WhatsApp | WhatsApp Business Cloud API | — |
| Siren | HTTP controller endpoint | your hardware vendor's API |
| Radio / TV | `broadcast_queue` table | a human acknowledges in the desk UI |

Each adapter returns `{ provider, status, detail }`; rows land in `alert_delivery`
so the console can show real delivery state per channel.

## Local test

```bash
supabase functions serve dispatch-alert
curl -X POST http://localhost:54321/functions/v1/dispatch-alert \
  -H "Content-Type: application/json" \
  -d '{"record":{"id":"test","channels":["SMS","Siren"],"message":"Test flood alert","language":"Hausa","scope":"Kaduna North"}}'
```

Without provider secrets set, each channel returns `skipped` with a reason — so you
can verify the wiring before going live.
