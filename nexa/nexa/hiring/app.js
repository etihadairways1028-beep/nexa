// Only runs when an older saved copy of the Nexa app opens on /hiring/ by mistake
// (it then looks for its files here). It swaps in the real hiring page, fresh from the server.
fetch('/hiring/?fresh=' + Date.now(), { cache: 'no-store' })
  .then(r => r.ok ? r.text() : Promise.reject())
  .then(t => { if (!/Nexa Team/i.test(t)) throw 0; document.open(); document.write(t); document.close(); })
  .catch(() => { location.replace('/careers.html?fresh=' + Date.now()); });
try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}); } catch {}
