/* Service Worker — Guida alle Carte Lenormand */
var CACHE_VERSION = "lenormand-v1";
var PRECACHE = [
  "./",
  "index.html",
  "manifest.json",
  "css/variables.css",
  "css/style.css",
  "js/app.js",
  "assets/icons/cards-sprite.svg",
  "assets/icons/favicon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "data/cards.json",
  "data/bonus-corte.json",
  "data/bonus-arcani-minori.json",
  "data/bonus-rituali.json",
  "data/bonus-rune.json",
  "data/bonus-diario.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(PRECACHE).catch(function (err) {
        console.warn("Precache parziale:", err);
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var resClone = res.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, resClone); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
