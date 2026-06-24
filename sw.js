// ══════════════════════════════════════════════════════════════
// Service Worker — نظام إدارة مجمع بستان العارفين
// يضمن عمل التطبيق بدون إنترنت
// ══════════════════════════════════════════════════════════════

var CACHE_NAME = 'boustan-v3';
var ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: cache all assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fallback to network
self.addEventListener('fetch', function(e) {
  // Skip Google Sheets API requests — always go to network
  if (e.request.url.indexOf('script.google.com') >= 0 ||
      e.request.url.indexOf('sheets.googleapis.com') >= 0) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cache new successful responses
        if (response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Listen for sync events (Background Sync API)
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-to-sheets') {
    e.waitUntil(
      self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'DO_SYNC' });
        });
      })
    );
  }
});
