// Sends the "lists are ready" alert twice per trading day (1 pm and 7 pm IST). Runs from GitHub Actions; secrets hold the keys.
import webpush from "web-push";
const { API_URL, API_TOKEN, VAPID_PUBLIC, VAPID_PRIVATE, FORCE } = process.env;
webpush.setVapidDetails("https://kamaleshsakthi77-ctrl.github.io/stg-charts/", VAPID_PUBLIC, VAPID_PRIVATE);
const call = async (q) => (await fetch(`${API_URL}?t=${encodeURIComponent(API_TOKEN)}&${q}`)).json();

const st = await call("a=status");
console.log("status", JSON.stringify({ day: st.day, ready: st.ready, sent: st.sent }));
if (!st.ready) { console.log("Today's tab is not built yet; nothing sent."); process.exit(0); }
// Which of the two daily alerts is this run? Anything before 4 pm IST is the 1 pm alert, anything after is the 7 pm one.
const hourIST = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
const slot = hourIST < 16 ? "1pm" : "7pm";
const key = `${st.day}|${slot}`;
// The API keeps one "sent" marker; before this change it held just the day, which counts as the 1 pm alert being sent.
const done = st.sent === key || (slot === "1pm" && st.sent === st.day);
console.log("slot", slot);
if (done && FORCE !== "true") { console.log(`Already sent the ${slot} alert today.`); process.exit(0); }

const { subs } = await call("a=subs");
console.log("subscribers", subs.length);
const payload = JSON.stringify({
  title: slot === "1pm" ? "Midday lists are ready" : "Evening lists are ready",
  body: `${st.upFresh} fresh uptrend · ${st.downFresh} fresh downtrend`,
  tag: `stg-${slot}`,
});
const gone = [];
let ok = 0;
for (const s of subs) {
  try { await webpush.sendNotification(s, payload, { TTL: 6 * 3600 }); ok++; }
  catch (e) { if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.endpoint); else console.log("failed", e.statusCode); }
}
console.log(`sent ${ok}, expired ${gone.length}`);
if (gone.length) await call("a=prune&e=" + encodeURIComponent(gone.join(",")));
if (ok > 0) await call("a=mark&day=" + encodeURIComponent(key));