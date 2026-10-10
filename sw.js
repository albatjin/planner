// Service Worker for Covey Modern - Offline Caching
const CACHE_NAME = "covey-modern-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "https://unpkg.com/lucide@latest",
  "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js",
  "https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback if offline
        return caches.match("./index.html");
      });
    })
  );
});
