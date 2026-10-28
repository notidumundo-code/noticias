"use strict";
// Shell offline + última respuesta de la API. Network-first para la API, cache-first para el shell.
const VERSION = "v3";
const OFFLINE_MAX_AGE_MS = 48 * 3600 * 1000; // older offline copies are not shown
const SHELL = ["/", "/index.html", "/styles.css", "/app.js", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(`shell-${VERSION}`).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  if (url.pathname.startsWith("/api/news")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(`api-${VERSION}`).then((c) => c.put(e.request, copy));
          } else if (res.status === 401 || res.status === 403) {
            // Session gone: drop the offline copy so news is not readable without login.
            caches.delete(`api-${VERSION}`);
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((r) => {
            const age = r ? Date.now() - Date.parse(r.headers.get("Date") || "") : Infinity;
            return r && age < OFFLINE_MAX_AGE_MS ? r : Response.error();
          }),
        ),
    );
    return;
  }
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && !res.redirected) {
          const copy = res.clone();
          caches.open(`shell-${VERSION}`).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html"))),
  );
});
