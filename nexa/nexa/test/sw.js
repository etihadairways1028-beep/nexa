// Nexa service worker: makes Nexa installable and keeps the app working offline.
// Updates: a new version downloads in the background and WAITS — people keep using the version they have
// until they tap "Update" in Nexa. Then everything (app, look, logo) switches at once.
const VERSION = '20.0';
// QUIET = a small fix: it installs by itself in the background — no update screen, no walk-through.
const QUIET = false;
const NOTES = ["Prism — a brand-new look made only for Nexa: ink black, beautiful headings and a rainbow edge from the Nexa logo", "Pick your style in Settings › Appearance: Prism, Halo (rich glass), Onyx (pure black & white) or the Glass look you had before", "New Nexa fonts and a glowing send button", "Everything from 19.6: new Home, glass levels, Face ID log-in that knows you, invites"];
// The test site (www…/test/) has its own copy and its own saved files, so testing never touches the real app.
const TEST = /\/test\/$/.test(new URL(self.registration.scope).pathname);
const PREFIX = TEST ? 'nexa-test-v' : 'nexa-shell-v';
const CACHE = PREFIX + '63';
const SHELL = ['./', 'styles.css', 'app.js', 'store.js', 'config.js', 'favicon-v4.png', 'icon-192-v4.png', 'icon-512-v4.png', 'icon-maskable-v4.png', 'apple-touch-icon-v4.png', 'sky.jpg', 'qr.js', 'badge-96.png'];
const FONTS = ['nexa-sans.woff2', 'nexa-serif.woff2', 'nexa-serif-italic.woff2', 'nexa-round.woff2'];
const LIVE = /^\/(test\/)?(\.netlify|api|owner|support|__seen)(\/|$)|^\/(test\/)?manifest\.webmanifest$/; // always straight from the server
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
  await Promise.all(FONTS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
  // Moving from the old "update straight away" versions: switch once now; from here on, updates wait for a tap.
  const olds = (await caches.keys()).filter(k => k.startsWith(PREFIX) && /v\d+$/.test(k) && k !== CACHE);
  if (!olds.length || olds.every(k => +k.split('-v')[1] < 29)) self.skipWaiting();
})()));
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'nexa-seen' && (TEST ? k.startsWith('nexa-test') : !k.startsWith('nexa-test'))).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || LIVE.test(u.pathname)) return;
  if (!TEST && u.pathname.startsWith('/test/')) return; // the test site looks after itself // Firebase, fonts, server, staff apps: network
  const nav = e.request.mode === 'navigate';
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    // the app itself comes from this version's saved copy, so it only changes when you tap Update
    const hit = nav ? await c.match('./') : await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try { const r = await fetch(e.request); if (r.ok && !nav) c.put(e.request, r.clone()); return r; }
    catch { return (await c.match(e.request)) || (await c.match('./')) || Response.error(); }
  })());
});
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'clear' && d.tag) e.waitUntil(self.registration.getNotifications({ tag: d.tag }).then(ns => ns.forEach(n => n.close())));
  if (d.type === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage({ version: VERSION, notes: NOTES, quiet: QUIET, test: TEST });
  if (d.type === 'skipWaiting') self.skipWaiting();
  if (d.type === 'fest') festOff = !d.k;
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  if (e.action === 'decline' && d.call) return; // just stop ringing here; the call stops on its own
  // Quick reply: browsers that support inline replies hand us the text in e.reply.
  const reply = e.action === 'reply' && typeof e.reply === 'string' ? e.reply.trim() : '';
  if (d.url) { // e.g. a help message for the owner page
    const target = new URL(d.url, self.registration.scope).href;
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { const c = cs.find(x => x.url.split('#')[0] === target.split('#')[0]); return c ? c.focus() : self.clients.openWindow(target); }));
    return;
  }
  let url = d.chat ? './?chat=' + encodeURIComponent(d.chat) : d.page ? './?page=' + encodeURIComponent(d.page) : './';
  if (reply && d.chat) url += '&reply=' + encodeURIComponent(reply.slice(0, 2000));
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs[0];
    if (c && reply && d.chat) { c.postMessage({ type: 'reply', chat: d.chat, text: reply }); return; }
    if (c) { c.postMessage({ type: 'open', chat: d.chat || '', page: d.page || '' }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});

// Web push: sent by the Nexa push server (netlify/functions/notify) through Firebase Cloud Messaging.
// festival logo on notifications (Halloween, Diwali, Christmas) — same dates as the app
const DIWALI = ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26'];
function festIconNow(now = new Date()) {
  const today = Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  const day = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  let best = null;
  for (const y of [now.getFullYear(), now.getFullYear() + 1]) for (const [k, ds] of [['halloween', `${y}-10-31`], ['christmas', `${y}-12-25`], ...DIWALI.filter(d => d.startsWith(y + '-')).map(d => ['diwali', d])]) { const left = day(ds) - today; if (left > 7 || left < -1) continue; const score = left >= 0 ? left : 10 - left; if (!best || score < best.score) best = { k, score }; }
  return best ? best.k : '';
}
let festOff = null; // the app tells us if this person turned festival looks off
const appIcon = () => { const k = festOff ? '' : festIconNow(); return k ? `icon-192-${k}.png` : 'icon-192-v4.png'; };
const seen = new Map(); // message ids already shown (stops doubles if a device is registered twice)
const isIOS = () => /iPhone|iPad|iPod/.test(self.navigator.userAgent) || (/Macintosh/.test(self.navigator.userAgent) && self.navigator.maxTouchPoints > 1);
// iPhone/iPad insist every push shows *something*, so when we don't want one we show it and close it at once.
async function showNothing() {
  try { await self.registration.showNotification('Nexa', { tag: 'nexa-sync', silent: true, body: '' }); } catch {}
  try { (await self.registration.getNotifications({ tag: 'nexa-sync' })).forEach(n => n.close()); } catch {}
}
async function ringCall(title, body, x) {
  const opts = (re) => ({ body, icon: /^https:\/\//.test(x.icon || '') ? x.icon : appIcon(), badge: 'badge-96.png', tag: x.tag || 'nexa-call', renotify: true, requireInteraction: true,
    vibrate: [900, 400, 900, 400, 900, 400, 900], data: { chat: x.chat || '', page: '', url: '', call: true }, actions: [{ action: 'open', title: '📞 Answer' }, { action: 'decline', title: 'Decline' }], silent: false, timestamp: Date.now() });
  // the Nexa server rings again every few seconds: show each ring as a brand-new alert so it makes a sound every time
  if (x.rep === '1') {
    try { (await self.registration.getNotifications({ tag: x.tag || 'nexa-call' })).forEach(o => o.close()); } catch {}
    return self.registration.showNotification('📞 ' + title, opts());
  }
  await self.registration.showNotification('📞 ' + title, opts());
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const still = (await self.registration.getNotifications({ tag: x.tag || 'nexa-call' })).length;
    const open = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).some(c => c.visibilityState === 'visible');
    if (!still || open) return; // answered, dismissed, or Nexa is on screen (it shows the full-screen call)
    await self.registration.showNotification('📞 ' + title, opts(true));
  }
}
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { data: { title: 'Nexa', body: e.data ? e.data.text() : '' } }; }
  const x = d.data || {}, n = d.notification || {};
  const title = x.title || n.title || 'Nexa', body = x.body || n.body || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async cs => {
    const ios = isIOS();
    // Read on another device → clear this chat's notifications here too.
    if (x.kind === 'clear') {
      try { (await self.registration.getNotifications({ tag: x.tag })).forEach(o => o.close()); } catch {}
      if (ios) await showNothing();
      return;
    }
    // a call that rang out: swap the ringing alert for "Missed call from …"
    if (x.kind === 'missed') {
      try { (await self.registration.getNotifications({ tag: x.tag })).forEach(o => o.close()); } catch {}
      return self.registration.showNotification('📞 ' + title, { body, icon: /^https:\/\//.test(x.icon || '') ? x.icon : appIcon(), badge: 'badge-96.png', tag: 'missed_' + (x.tag || ''), data: { chat: x.chat || '', page: '', url: '' }, vibrate: [120, 80, 120] });
    }
    // Same message twice (e.g. two registrations for this browser) → show it once.
    // only tags that name one specific thing can be duplicates (a new owner code or support alert reuses its tag)
    const id = x.msg || (x.kind === 'call' ? (x.tag || 'call') + '_r' + (x.ring || 0) : /^(n_|call_|flag_|rep_)/.test(x.tag || '') ? x.tag : '');
    if (id) {
      const t = Date.now(); for (const [k, v] of seen) if (t - v > 120000) seen.delete(k);
      if (seen.has(id)) { if (ios) await showNothing(); return; }
      seen.set(id, t);
      if (x.tag) try { const old = await self.registration.getNotifications({ tag: x.tag }); if (old.some(o => (o.data?.ids || []).includes(id))) { if (ios) await showNothing(); return; } } catch {}
    }
    // Remember shown pushes on disk too — phones restart the worker between pushes, so memory alone isn't enough.
    const diskId = id;
    if (diskId) { try { const sc = await caches.open('nexa-seen'); const key = new Request('/__seen/' + encodeURIComponent(diskId)); if (await sc.match(key)) { if (ios) await showNothing(); return; } await sc.put(key, new Response(String(Date.now()))); if (Math.random() < .05) { const ks = await sc.keys(); for (const k of ks.slice(0, Math.max(0, ks.length - 300))) await sc.delete(k); } } catch {} }
    // Nexa is open on screen → no system pop-up; the app shows its own from the top.
    // (calls: only when Nexa is really in front — iPhone sometimes says a closed app is "visible", so there a call always alerts)
    if (x.kind === 'call' ? (!ios && cs.some(c => c.focused)) : cs.some(c => c.visibilityState === 'visible')) {
      if (ios) await showNothing();
      return;
    }
    // Several messages from the same chat stack into one notification: "Sam (3 new messages)"
    let lines = [body], count = 1, ids = id ? [id] : [];
    if (x.kind === 'message' && x.tag) {
      try { const old = await self.registration.getNotifications({ tag: x.tag }); const o = old[old.length - 1]; if (o) { const od = o.data || {}; const prev = od.lines || String(o.body || '').split('\n'); if (!od.ids && prev[prev.length - 1] === body) { if (ios) await showNothing(); return; } lines = [...prev, body].slice(-6); count = (od.count || prev.length) + 1; ids = [...(od.ids || []), ...ids].slice(-20); } } catch {}
    }
    // calls: ring like a phone — long buzzes, stays on screen, and rings again a few times until answered or dismissed
    if (x.kind === 'call') return ringCall(title, body, x);
    return self.registration.showNotification(count > 1 ? `${title} (${count} new messages)` : title, {
      body: lines.join('\n'), icon: /^https:\/\//.test(x.icon || '') ? x.icon : appIcon(), badge: 'badge-96.png', tag: x.tag || undefined, renotify: !!x.tag,
      data: { chat: x.chat || '', page: x.page || '', url: x.url || '', lines, count, ids }, vibrate: x.kind === 'call' ? [300, 150, 300, 150, 300] : x.vibe === 'off' ? [] : x.vibe === 'long' ? [200, 100, 200, 100, 200] : x.vibe === 'double' ? [80, 80, 80] : [80], silent: x.silent === '1',
      requireInteraction: x.kind === 'call',
      actions: x.kind === 'message' && x.chat ? [{ action: 'reply', title: 'Reply', type: 'text', placeholder: 'Reply…' }] : x.kind === 'call' ? [{ action: 'open', title: 'Answer' }] : []
    });
  }));
});
