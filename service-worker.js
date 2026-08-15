// Einfacher Service Worker: erlaubt "Zum Home-Bildschirm hinzufügen"
// und cached die statischen Grunddateien für schnelleren Start.
// Die eigentlichen Daten kommen live aus Firestore, nicht aus dem Cache.

const CACHE_NAME = "kuehltruhe-cache-v1";
const CORE_ASSETS = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./firebase-config.js",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Firestore/Google-Anfragen niemals cachen, nur eigene statische Dateien.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("./index.html"))
      );
    })
  );
});
