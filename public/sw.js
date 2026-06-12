/* KADSEMA SENTINEL — Service Worker
   Provides offline fallback and enables PWA installability.
   Cache strategy:
     - Hashed static assets (/assets/*): cache-first (immutable filenames)
     - Navigation (HTML):               network-first, fall back to cache
     - Supabase API & cross-origin:     network-only (pass through)
*/
const CACHE = 'sentinel-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.add(new Request(self.registration.scope, { cache: 'reload' })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Pass Supabase and other external API calls straight through
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Cache-first for Vite's content-hashed bundles
      if (url.pathname.includes('/assets/')) {
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      }

      // Network-first for HTML (keeps the app up-to-date)
      try {
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(request);
        return cached || cache.match(self.registration.scope);
      }
    })
  );
});
