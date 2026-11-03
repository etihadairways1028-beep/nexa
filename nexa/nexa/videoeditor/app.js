// Only runs when an older saved copy of the Nexa app opens on /videoeditor/ by mistake
// (it then looks for its files here). It swaps in the real page, fresh from the server.
fetch('/videoeditor/?fresh=' + Date.now(), { cache: 'no-store' })
  .then(r => r.ok ? r.text() : Promise.reject())
  .then(t => { if (!/Nexa (Studio|Dev Hub)/i.test(t)) throw 0; document.open(); document.write(t); document.close(); })
  .catch(() => { document.body.innerHTML = '<p style="font:16px system-ui;color:#fff;background:#09090F;padding:24px;margin:0;min-height:100vh">Please refresh this page.</p>'; });
try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}); } catch {}
