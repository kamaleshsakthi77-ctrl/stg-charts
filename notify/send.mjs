// Sends the daily "lists are ready" alert once per trading day. Runs from GitHub Actions; secrets hold the keys.
import webpush from "web-push";
const { API_URL, API_TOKEN, VAPID_PUBLIC, VAPID_PRIVATE, FORCE } = process.env;
webpush.setVapidDetails("https://kamaleshsakthi77-ctrl.github.io/stg-charts/", VAPID_PUBLIC, VAPID_PRIVATE);
const call = async (q) => (await fetch(`${API_URL}?t=${encodeURIComponent(API_TOKEN)}&${q}`)).json();

const st = await call("a=status");
console.log("status", JSON.stringify({ day: st.day, ready: st.ready, sent: st.sent }));
if (!st.ready) { console.log("Today's tab is not built yet; nothing sent."); process.exit(0); }
if (st.sent === st.day && FORCE !== "true") { console.log("Already sent today."); process.exit(0); }

const { subs } = await call("a=subs");
console.log("subscribers", subs.length);
const payload = JSON.stringify({
  title: "Midday lists are ready",
  body: `${st.upFresh} fresh uptrend Ã‚Â· ${st.downFresh} fresh downtrend`,
});
const gone = [];
let ok = 0;
for (const s of subs) {
  try { await webpush.sendNotification(s, payload, { TTL: 6 * 3600 }); ok++; }
  catch (e) { if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.endpoint); else console.log("failed", e.statusCode); }
}
console.log(`sent ${ok}, expired ${gone.length}`);
if (gone.length) await call("a=prune&e=" + encodeURIComponent(gone.join(",")));
if (ok > 0) await call("a=mark&day=" + encodeURIComponent(st.day));