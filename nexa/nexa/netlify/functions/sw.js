// Nexa service worker: makes Nexa installable, keeps the app shell available offline,
// and focuses the app when a notification is tapped. Live data always comes from the network.
const CACHE = 'nexa-shell-v27';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'store.js', 'config.js', 'manifest.webmanifest', 'icon-192-v3.png', 'icon-512-v3.png', 'apple-touch-icon-v3.png', 'sky.jpg', 'qr.js', 'badge-96.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Firebase, fonts, previews: straight to network
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'clear' && d.tag) e.waitUntil(self.registration.getNotifications({ tag: d.tag }).then(ns => ns.forEach(n => n.close())));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
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
const seen = new Map(); // message ids already shown (stops doubles if a device is registered twice)
const isIOS = () => /iPhone|iPad|iPod/.test(self.navigator.userAgent) || (/Macintosh/.test(self.navigator.userAgent) && self.navigator.maxTouchPoints > 1);
// iPhone/iPad insist every push shows *something*, so when we don't want one we show it and close it at once.
async function showNothing() {
  try { await self.registration.showNotification('Nexa', { tag: 'nexa-sync', silent: true, body: '' }); } catch {}
  try { (await self.registration.getNotifications({ tag: 'nexa-sync' })).forEach(n => n.close()); } catch {}
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
    // Same message twice (e.g. two registrations for this browser) → show it once.
    const id = x.msg || x.tag && x.kind !== 'message' && x.tag;
    if (id) {
      const t = Date.now(); for (const [k, v] of seen) if (t - v > 120000) seen.delete(k);
      if (seen.has(id)) { if (ios) await showNothing(); return; }
      seen.set(id, t);
      if (x.tag) try { const old = await self.registration.getNotifications({ tag: x.tag }); if (old.some(o => (o.data?.ids || []).includes(id))) { if (ios) await showNothing(); return; } } catch {}
    }
    // Nexa is open on screen → no system pop-up; the app shows its own from the top.
    if (cs.some(c => c.visibilityState === 'visible')) {
      if (ios) await showNothing();
      return;
    }
    // Several messages from the same chat stack into one notification: "Sam (3 new messages)"
    let lines = [body], count = 1, ids = id ? [id] : [];
    if (x.kind === 'message' && x.tag) {
      try { const old = await self.registration.getNotifications({ tag: x.tag }); const o = old[old.length - 1]; if (o) { const od = o.data || {}; lines = [...(od.lines || [o.body]), body].slice(-6); count = (od.count || 1) + 1; ids = [...(od.ids || []), ...ids].slice(-20); } } catch {}
    }
    return self.registration.showNotification(count > 1 ? `${title} (${count} new messages)` : title, {
      body: lines.join('\n'), icon: /^https:\/\//.test(x.icon || '') ? x.icon : 'icon-192-v3.png', badge: 'badge-96.png', tag: x.tag || undefined, renotify: !!x.tag,
      data: { chat: x.chat || '', page: x.page || '', url: x.url || '', lines, count, ids }, vibrate: x.kind === 'call' ? [300, 150, 300, 150, 300] : [80],
      requireInteraction: x.kind === 'call',
      actions: x.kind === 'message' && x.chat ? [{ action: 'reply', title: 'Reply', type: 'text', placeholder: 'Reply…' }] : x.kind === 'call' ? [{ action: 'open', title: 'Answer' }] : []
    });
  }));
});
