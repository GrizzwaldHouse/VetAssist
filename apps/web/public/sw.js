// sw.js
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Service Worker — cache-first for static assets, network-first with cache fallback for API routes.
//          Pre-caches offline shell on install. Deletes stale caches on activate.

const CACHE_VERSION = 'vetassist-v1';
const OFFLINE_SHELL_ROUTES = ['/', '/discover', '/faq', '/glossary', '/learn'];
const NETWORK_FIRST_API_PATHS = ['/api/benefits', '/api/faq', '/api/glossary', '/api/learning'];

// Determine whether a request URL targets a network-first API path
function isNetworkFirstRequest(url) {
  return NETWORK_FIRST_API_PATHS.some((path) => url.pathname.startsWith(path));
}

// Install: pre-cache the offline shell pages so the app loads without network
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(OFFLINE_SHELL_ROUTES)),
  );
  // Activate immediately — do not wait for existing clients to close
  self.skipWaiting();
});

// Activate: delete any cache whose name does not match the current version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  // Take control of all clients without waiting for a page reload
  self.clients.claim();
});

// Fetch: network-first for API routes, cache-first for everything else
self.addEventListener('fetch', (event) => {
  // Only handle GET requests — mutations must always go to the network
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (isNetworkFirstRequest(url)) {
    // Network-first: try live data, fall back to cached copy when offline
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Clone before consuming — Response body can only be read once
          const toCache = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, toCache));
          return networkResponse;
        })
        .catch(() => caches.match(event.request)),
    );
  } else {
    // Cache-first: serve from cache, fall back to network and update cache
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkResponse) => {
          const toCache = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, toCache));
          return networkResponse;
        });
      }),
    );
  }
});
