/* sw.js — cache-first 离线缓存 */
const CACHE = "piggy-v6";
const ASSETS = [
  "./", "./index.html", "./styles.css?v=6",
  "./js/store.js?v=6", "./js/charts.js?v=6", "./js/app.js?v=6",
  "./manifest.webmanifest", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", function (e) {
  e.waitUntil(Promise.allSettled(ASSETS.map(function (u) { return caches.open(CACHE).then(function (c) { return c.add(u); }); }))
    .then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.status === 200 && e.request.url.indexOf(self.location.origin) === 0) {
          const clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
