// 56 Events Service Worker — network-first, never caches API routes
const CACHE_NAME = '56events-shell-v1';
const SHELL_ASSETS = ['/', '/index.html'];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

// Activate: remove stale caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first strategy
// API requests (/api/*) are ALWAYS passed straight to the network —
// never cached — so auth tokens and live data are never stale.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests (POST, PUT, DELETE, OPTIONS, etc.)
  if (request.method !== 'GET') return;

  // 2. Skip ALL API routes — must never be intercepted or cached
  if (url.pathname.startsWith('/api/')) return;

  // 3. Skip cross-origin requests (CDN, external fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // 4. Network-first for static assets and SPA shell
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
