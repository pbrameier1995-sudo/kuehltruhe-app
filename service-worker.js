 JS
// Einfacher Service Worker: erlaubt "Zum Home-Bildschirm hinzufügen"
// und sorgt für einen schnellen Start auch bei wackliger Verbindung.
// Die eigentlichen Daten kommen live aus Firestore, nicht aus dem Cache.
//
// WICHTIG: Nutzt "Network-first" statt "Cache-first" für die eigenen
// Dateien (HTML/JS/JSON). Das heißt: Ist Internet da, wird IMMER zuerst
// die aktuelle Version vom Server geholt (und der Cache aktualisiert).
// Nur wenn gar keine Verbindung besteht, greift der Cache als Fallback.
// So bleiben Updates (z.B. an app.js oder firebase-config.js) sofort
// sichtbar, statt tagelang durch eine alte, zwischengespeicherte Version
// überdeckt zu werden.
 
const CACHE_NAME = "kuehltruhe-cache-v2";
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
  // Firestore/Google-Anfragen niemals über den Service Worker leiten,
  // nur eigene, gleich-origin statische Dateien.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
 
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
