// Sends four alerts per trading day (11 am, 1 pm, 3 pm, 7 pm IST). Runs from GitHub Actions; secrets hold the keys.
import webpush from "web-push";
const { API_URL, API_TOKEN, VAPID_PUBLIC, VAPID_PRIVATE, FORCE } = process.env;
webpush.setVapidDetails("https://kamaleshsakthi77-ctrl.github.io/stg-charts/", VAPID_PUBLIC, VAPID_PRIVATE);
const call = async (q) => (await fetch(`${API_URL}?t=${encodeURIComponent(API_TOKEN)}&${q}`)).json();

const st = await call("a=status");
console.log("status", JSON.stringify({ day: st.day, ready: st.ready, sent: st.sent }));
// Four reminders per trading day (IST): 11 am and 3 pm are plain reminders, 1 pm and 7 pm go with the lists.
const hourIST = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
const slot = hourIST < 12 ? "11am" : hourIST < 15 ? "1pm" : hourIST < 18 ? "3pm" : "7pm";
const key = `${st.day}|${slot}`;
// The API keeps one "sent" marker; before this change it held just the day, which counts as the 1 pm alert being sent.
const done = st.sent === key || (slot === "1pm" && st.sent === st.day);
console.log("slot", slot);
const listSlot = slot === "1pm" || slot === "7pm";
if (listSlot && !st.ready) { console.log("Today's tab is not built yet; nothing sent."); process.exit(0); }
if (done && FORCE !== "true") { console.log(`Already sent the ${slot} alert today.`); process.exit(0); }

const { subs } = await call("a=subs");
console.log("subscribers", subs.length);
const lists = `${st.upFresh} new in uptrend list · ${st.downFresh} new in downtrend list. Education only, not advice.`;
const msg = {
  "11am": { title: "Market check-in", body: "Open your trend lists and note what changed since the open. Education only, not advice." },
  "1pm": { title: "Midday lists are ready", body: lists },
  "3pm": { title: "Last hour of the market", body: "Review your trend lists before the close. Education only, not advice." },
  "7pm": { title: "Time for your post-market analysis", body: "Evening lists are ready. " + lists },
}[slot];
const payload = JSON.stringify({ ...msg, tag: `stg-${slot}` });
const gone = [];
let ok = 0;
for (const s of subs) {
  try { await webpush.sendNotification(s, payload, { TTL: 6 * 3600 }); ok++; }
  catch (e) { if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.endpoint); else console.log("failed", e.statusCode); }
}
console.log(`sent ${ok}, expired ${gone.length}`);
if (gone.length) await call("a=prune&e=" + encodeURIComponent(gone.join(",")));
if (ok > 0) await call("a=mark&day=" + encodeURIComponent(key));