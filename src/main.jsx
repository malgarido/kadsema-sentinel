/* ============================================================
   KADSEMA SENTINEL — application entry
   Loads the modules in dependency order. `globals.js` is a
   STATIC import so window.React is set before anything else
   evaluates; the rest load sequentially so each module's
   window.* exports exist before the next one needs them.
   ============================================================ */
import "./styles.css";
import "./lib/globals.js";

// Register service worker for offline capability and PWA installability.
// BASE_URL is injected by Vite: "/" for root hosts, "/repo-name/" for GitHub Pages.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swPath = import.meta.env.BASE_URL + "sw.js";
    navigator.serviceWorker.register(swPath, { scope: import.meta.env.BASE_URL })
      .catch((err) => console.warn("[SENTINEL] SW registration failed:", err));
  });
}

const MODE = import.meta.env.VITE_DATA_MODE || "local";

(async () => {
  await import("./lib/data.js");                 // window.KAD
  if (MODE === "supabase") {
    await import("./lib/store.supabase.js");      // live backend
    console.info("[SENTINEL] data mode: supabase (live)");
  } else {
    await import("./lib/store.local.js");         // window.SentinelStore (localStorage)
    console.info("[SENTINEL] data mode: local (browser persistence)");
  }
  await import("./components/ui.jsx");            // Icon, Panel, Stat, …
  await import("./components/map.jsx");           // KadunaMap
  await import("./views/dashboard.jsx");
  await import("./views/incidents.jsx");
  await import("./views/earlywarning.jsx");
  await import("./views/broadcast.jsx");
  await import("./views/riskview.jsx");
  await import("./views/mobile.jsx");
  await import("./views/app.jsx");               // mounts <App/> into #root
})();
