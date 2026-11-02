const C = "stg-v2";
const OPEN = "https://script.google.com/macros/s/AKfycbxkRSULWATLQwxj0GhB_3SXFuANh6-yzJfJs0V6xSLYn2qM8PoILXMppeP_xfqtrLSr/exec";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(["./", "icon-192.png"]))); });
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
});
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { /* plain text or empty */ }
  e.waitUntil(self.registration.showNotification(d.title || "Swing Trading Guide", {
    body: d.body || "Today's lists are ready.", icon: "icon-192.png", badge: "icon-192.png", tag: "stg-daily", renotify: false, data: { url: OPEN },
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) { c.navigate(OPEN).catch(() => {}); return c.focus(); } }
    return clients.openWindow(OPEN);
  }));
});