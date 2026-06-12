# KADSEMA SENTINEL

**Multi-hazard early-warning & emergency operations platform** for the Kaduna State
Emergency Management Agency (KADSEMA).

One connected internal product: EOC command dashboard · GIS risk map · incident
lifecycle management · early-warning console · mobile field app. Built React + Vite,
with an env-switchable data layer — runs fully offline for demos, or against a live
PostgreSQL/PostGIS backend for production.

---

## Quick start

```bash
git clone <your-repo-url> kadsema-sentinel
cd kadsema-sentinel
nvm use            # Node 18+ (see .nvmrc)
npm install
cp .env.example .env
npm run dev        # http://localhost:5173
```

Out of the box it runs in **local mode** — full working app, browser persistence, no
backend required. This is the Phase-0 demo build.

---

## Data modes

The entire app talks to one store interface (`window.SentinelStore`). You choose its
implementation with a single env var — **no view code changes between modes**.

| `VITE_DATA_MODE` | Store | Use for |
|---|---|---|
| `local` (default) | `src/lib/store.local.js` — localStorage | Demos, offline, UI work |
| `supabase` | `src/lib/store.supabase.js` — live DB + realtime | Phase-1 production |

### Going live (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → run in order:
   - `supabase/schema.sql` — tables, RLS, `log_incident` RPC, `sentinel_role()` helper
   - `supabase/seed.sql` — 23 LGAs, gauges, triggers, demo incidents
   - `supabase/functions/dispatch-alert/dispatch-alert.sql` — delivery tables + invoke trigger
3. Enable realtime: uncomment the final line of `supabase/schema.sql`.
4. In `.env`:
   ```
   VITE_DATA_MODE=supabase
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
5. `npm run dev` — the same UI is now a live multi-user client with role-based access
   (HQ · Zonal · LGA · Community) enforced by Postgres row-level security.

Full runbook, GIS-boundary loading, and integration hooks (SMS/USSD, NiMet, NIHSA,
Kobo): see `docs/Deployment Blueprint.html`.

---

## CI/CD

Three workflows ship in `.github/workflows/`:

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | push / PR to `main` | `npm ci` + build (local mode) + upload artifact |
| `deploy-pages.yml` | push to `main` | builds and publishes to **GitHub Pages** (demo, local mode) |
| `deploy-netlify.yml` | push to `main` | builds and deploys to **Netlify** (use for the live Supabase build) |

**GitHub Pages (free demo):** repo Settings → Pages → Source = *GitHub Actions*. The
demo deploys in `local` mode — no secrets, no backend. For project pages served from
`/<repo>/`, the workflow sets `BASE_PATH=./` (honoured by `vite.config.js`).

**Netlify (production / live):** a `netlify.toml` is already in the repo — drag-and-drop
`dist/` to Netlify Drop for an instant demo. For the GitHub-connected live build, add
repository secrets `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, and set repo variable `VITE_DATA_MODE=supabase`. Push to
`main` → live deploy with SPA routing, security headers, and immutable asset caching
already configured.

---

## Alert dispatch (Edge Function)

`supabase/functions/dispatch-alert/` turns the **Dispatch alert** button into real
multi-channel delivery: a Postgres webhook on `alert` insert invokes the function, which
fans out to SMS (Africa's Talking), WhatsApp (Cloud API), sirens, and a radio broadcast
queue, then writes per-channel receipts to `alert_delivery`.

```bash
psql "$DATABASE_URL" -f supabase/functions/dispatch-alert/dispatch-alert.sql
supabase functions deploy dispatch-alert --no-verify-jwt
supabase secrets set AT_API_KEY=... AT_USERNAME=... WHATSAPP_TOKEN=... # etc
```

Full provider list, secrets, and a local-test curl: see that folder's `README.md`.
Without provider secrets each channel safely returns `skipped`, so you can verify the
wiring before going live.

---

## Project structure

```
kadsema-sentinel/
├─ index.html                 Vite entry
├─ package.json · vite.config.js · .env.example · .nvmrc
├─ src/
│  ├─ main.jsx                bootstrap — ordered module loader + mode switch
│  ├─ styles.css              full design system (tokens, components, views)
│  ├─ lib/
│  │  ├─ globals.js           React global shim (load order contract)
│  │  ├─ data.js              LGAs, risk model, demo datasets, map geometry → window.KAD
│  │  ├─ store.local.js       localStorage store  (window.SentinelStore)
│  │  └─ store.supabase.js    live backend adapter (same surface)
│  ├─ components/
│  │  ├─ ui.jsx               Icon set, Panel, Stat, badges, gauges, sparkline
│  │  └─ map.jsx              stylized Kaduna State SVG map
│  └─ views/
│     ├─ dashboard.jsx        EOC command overview
│     ├─ riskview.jsx         GIS risk & hazard map
│     ├─ incidents.jsx        incident board + filters
│     ├─ earlywarning.jsx     gauges, triggers, alert dispatch
│     ├─ broadcast.jsx        broadcast desk — radio/TV read queue
│     ├─ mobile.jsx           field app (reporting / tasks / alerts)
│     └─ app.jsx              shell, nav, router, drawer, modal, toasts
├─ supabase/
│  ├─ schema.sql              Postgres + PostGIS DDL, RLS, triggers
│  ├─ seed.sql                23 LGAs + gauges + triggers + incidents
│  └─ functions/
│     └─ dispatch-alert/      Edge Function: multi-channel alert fan-out
│        ├─ index.ts          SMS · WhatsApp · siren · radio adapters
│        ├─ dispatch-alert.sql  delivery tables + invoke trigger
│        └─ README.md
├─ .github/workflows/         ci.yml · deploy-pages.yml · deploy-netlify.yml
└─ docs/
   └─ Deployment Blueprint.html
```

### A note on the module pattern

The view modules currently attach their components to `window` and read shared helpers
(`KAD`, `Icon`, `SentinelStore`) from global scope — the runtime contract from the
original single-file build, preserved here so the proven code runs **unchanged** under
Vite. `main.jsx` loads them in dependency order; `globals.js` (a static import) guarantees
`window.React` exists first.

This is intentional and works, but the natural **Phase-1 refactor** is to convert each
module to idiomatic `import`/`export`. Because the boundaries are already clean
(one component per concern, one store interface), that migration is mechanical and can be
done file-by-file without touching behaviour.

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start dev server (HMR) at :5173 |
| `npm run build` | Production build → `dist/` (base `/`) |
| `npm run build:pages` | Production build for GitHub Pages (base `./`) |
| `npm run preview` | Preview the production build |

---

## Deploy the static build

`npm run build` emits a static `dist/` — host on Netlify, Vercel, GitHub Pages, S3,
or any static host. In `supabase` mode the same static bundle is a full production client
(the backend is Supabase).

The build includes a PWA service worker (`sw.js`) and manifest — field officers can
install the app to their device's home screen for offline-capable access.

---

## License & ownership

Internal system for the Kaduna State Emergency Management Agency. Add your
organisation's license before publishing.
