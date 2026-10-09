// Nexa call relay (TURN) credentials — runs free on Netlify Functions.
// Most phone networks and many home routers block direct calls between two devices.
// A TURN relay passes the call through a server so it always connects. This function hands
// signed-in Nexa users short-lived relay credentials from Cloudflare Realtime TURN (1,000 GB/month free)
// or from Metered Open Relay (20 GB/month free, no card).
//
// Netlify environment variables:
//   TURN_KEY_ID          — the Turn Token ID from Cloudflare (Realtime → TURN Server)
//   TURN_KEY_API_TOKEN   — the API Token shown next to it
//   or METERED_USERNAME + METERED_PASSWORD (a credential from dashboard.metered.ca)
//   or METERED_APP (your app name) + METERED_API_KEY
//   FIREBASE_SERVICE_ACCOUNT — already set for push; used to check the caller is signed in to Nexa
import admin from './fbadmin.js';
import { Buffer } from 'node:buffer';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function init() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  return admin.initializeApp({ credential: admin.credential.cert(sa) });
}

export default async (req) => {
  const keyId = process.env.TURN_KEY_ID, token = process.env.TURN_KEY_API_TOKEN;
  const mApp = process.env.METERED_APP, mKey = process.env.METERED_API_KEY;
  const mUser = process.env.METERED_USERNAME, mPass = process.env.METERED_PASSWORD;
  if (!(keyId && token) && !(mApp && mKey) && !(mUser && mPass)) return json({ iceServers: [], note: 'No TURN provider set (Cloudflare TURN_KEY_ID/TURN_KEY_API_TOKEN or Metered METERED_APP/METERED_API_KEY)' });
  const m = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/);
  if (!m) return json({ error: 'Not signed in' }, 401);
  try { init(); await admin.auth().verifyIdToken(m[1]); } catch (e) { return json({ error: 'Not signed in' }, 401); }
  // Metered credential copied from the dashboard (username + password)
  if (!(keyId && token) && mUser && mPass) {
    const c = { username: mUser, credential: mPass };
    return json({ ttl: 6 * 3600, iceServers: [
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'turn:global.relay.metered.ca:80', ...c },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', ...c },
      { urls: 'turn:global.relay.metered.ca:443', ...c },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', ...c }
    ] });
  }
  // Metered API key (free tier, no card needed)
  if (!(keyId && token)) {
    try {
      const app = String(mApp).replace(/^https?:\/\//, '').replace(/\.metered\.live.*$/, '');
      const r = await fetch(`https://${encodeURIComponent(app)}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(mKey)}`);
      if (!r.ok) return json({ iceServers: [], error: 'Metered said ' + r.status }, 502);
      const j = await r.json();
      const list = Array.isArray(j) ? j : (j.iceServers || []);
      return json({ iceServers: list.filter(s => s && s.urls), ttl: 6 * 3600 });
    } catch (e) { return json({ iceServers: [], error: e.message }, 502); }
  }
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ ttl: 43200 })
    });
    if (!r.ok) return json({ iceServers: [], error: 'Cloudflare said ' + r.status }, 502);
    const j = await r.json();
    // Browsers time out on port 53, so drop those URLs.
    const iceServers = (j.iceServers || []).map(s => ({ ...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) })).filter(s => s.urls.length);
    return json({ iceServers, ttl: 43200 });
  } catch (e) { return json({ iceServers: [], error: e.message }, 502); }
};
