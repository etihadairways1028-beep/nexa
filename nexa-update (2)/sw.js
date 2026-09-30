// Nexa service worker: makes Nexa installable, keeps the app shell available offline,
// and focuses the app when a notification is tapped. Live data always comes from the network.
const CACHE = 'nexa-shell-v12';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'store.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'sky.jpg', 'qr.js'];
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
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { data: { title: 'Nexa', body: e.data ? e.data.text() : '' } }; }
  const x = d.data || {}, n = d.notification || {};
  const title = x.title || n.title || 'Nexa', body = x.body || n.body || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async cs => {
    // If Nexa is open and visible, it already shows its own pop-up.
    // (iPhone/iPad require every push to show something, so we always show there.)
    const ios = /iPhone|iPad|iPod/.test(self.navigator.userAgent);
    if (!ios && cs.some(c => c.visibilityState === 'visible' && c.focused)) return;
    // Several messages from the same chat stack into one notification: "Sam (3 new messages)"
    let lines = [body], count = 1;
    if (x.kind === 'message' && x.tag) {
      try { const old = await self.registration.getNotifications({ tag: x.tag }); const o = old[old.length - 1]; if (o) { const od = o.data || {}; lines = [...(od.lines || [o.body]), body].slice(-6); count = (od.count || 1) + 1; } } catch {}
    }
    return self.registration.showNotification(count > 1 ? `${title} (${count} new messages)` : title, {
      body: lines.join('\n'), icon: 'icon-192.png', badge: 'icon-192.png', tag: x.tag || undefined, renotify: !!x.tag,
      data: { chat: x.chat || '', page: x.page || '', lines, count }, vibrate: x.kind === 'call' ? [300, 150, 300, 150, 300] : [80],
      requireInteraction: x.kind === 'call',
      actions: x.kind === 'message' && x.chat ? [{ action: 'reply', title: 'Reply', type: 'text', placeholder: 'Reply…' }] : x.kind === 'call' ? [{ action: 'open', title: 'Answer' }] : []
    });
  }));
});
