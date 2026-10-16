// Nexa Face ID / fingerprint log-in (passkeys).
// Your face or fingerprint never leaves your phone: the phone only signs a one-time challenge with a key it keeps.
// 1. A logged-in phone registers ("regBegin" → "regFinish"): we keep the PUBLIC half of its key.
// 2. On the log-in screen ("loginBegin" → "loginFinish") the phone checks your face/finger and signs the
//    challenge; we check the signature and hand back a one-time Firebase sign-in token.
// Collections passkeys / passkeyChallenges are server-only (no app user can read them).
import admin from './fbadmin.js';
import { Buffer } from 'node:buffer';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const TTL = 3 * 60 * 1000;
const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => new Uint8Array(Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
const subtle = globalThis.crypto.subtle;
const sha256 = async data => new Uint8Array(await subtle.digest('SHA-256', data));
const keyId = async credId => b64u(await sha256(new TextEncoder().encode('nexa-pk:' + credId))).slice(0, 40);

function init() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  return admin.initializeApp({ credential: admin.credential.cert(sa) });
}
// ECDSA signatures arrive DER-encoded; WebCrypto wants the raw 64-byte r||s
function derToRaw(der) {
  if (der[0] !== 0x30) return der;
  let i = 2; if (der[1] & 0x80) i = 2 + (der[1] & 0x7f);
  const part = () => { if (der[i] !== 0x02) throw new Error('bad sig'); const len = der[i + 1]; let v = der.slice(i + 2, i + 2 + len); i += 2 + len; while (v.length > 32 && v[0] === 0) v = v.slice(1); const out = new Uint8Array(32); out.set(v, 32 - v.length); return out; };
  const r = part(), s = part(), raw = new Uint8Array(64); raw.set(r, 0); raw.set(s, 32); return raw;
}
async function importKey(pk) {
  if (pk.alg === -7) return pk.spki ? subtle.importKey('spki', unb64u(pk.spki), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']) : subtle.importKey('jwk', pk.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  if (pk.alg === -257) return pk.spki ? subtle.importKey('spki', unb64u(pk.spki), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']) : subtle.importKey('jwk', pk.jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  throw new Error('Unsupported key');
}
async function newChallenge(db, data) {
  const c = b64u(globalThis.crypto.getRandomValues(new Uint8Array(32)));
  const id = b64u(globalThis.crypto.getRandomValues(new Uint8Array(12)));
  await db.doc('passkeyChallenges/' + id).set({ c, exp: Date.now() + TTL, ...data });
  return { id, challenge: c };
}
async function takeChallenge(db, id) {
  if (!/^[\w-]{8,40}$/.test(String(id || ''))) return null;
  const ref = db.doc('passkeyChallenges/' + id);
  const d = (await ref.get()).data(); if (!d) return null;
  await ref.delete().catch(() => {});
  return d.exp > Date.now() ? d : null;
}
function checkClient(clientDataB64, type, challenge, req) {
  const cd = JSON.parse(new TextDecoder().decode(unb64u(clientDataB64)));
  const origin = new URL(req.url).origin;
  if (cd.type !== type) throw new Error('wrong type');
  if (cd.challenge !== challenge) throw new Error('wrong challenge');
  if (cd.origin !== origin && !(process.env.PASSKEY_ORIGINS || '').split(',').map(s => s.trim()).includes(cd.origin)) throw new Error('wrong site');
  return cd;
}


// ---------- two-step verification (codes from an authenticator app: Google Authenticator, iPhone Passwords…)
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const toB32 = bytes => { let bits = 0, val = 0, out = ''; for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; return out; };
const fromB32 = s => { let bits = 0, val = 0; const out = []; for (const ch of String(s).replace(/=+$/, '').toUpperCase()) { const i = B32.indexOf(ch); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(out); };
async function totp(secret, step) {
  const key = await subtle.importKey('raw', fromB32(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new Uint8Array(8); let c = step; for (let i = 7; i >= 0; i--) { msg[i] = c & 255; c = Math.floor(c / 256); }
  const h = new Uint8Array(await subtle.sign('HMAC', key, msg)), o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
}
async function totpOk(secret, code) { code = String(code || '').replace(/\D/g, ''); if (code.length !== 6) return false; const st = Math.floor(Date.now() / 30000); for (const d of [0, -1, 1]) if (await totp(secret, st + d) === code) return true; return false; }
const hex = async s => Array.from(await sha256(new TextEncoder().encode('nexa-2fa:' + s)), b => b.toString(16).padStart(2, '0')).join('');
async function tooMany(db, uid) { const ref = db.doc('twoFactorTries/' + uid + '_' + Math.floor(Date.now() / 600000)); const d = (await ref.get()).data(); const n = (d && d.n || 0) + 1; await ref.set({ n, at: Date.now() }); return n > 8; }

export default async (req, ctx = {}) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try { init(); } catch { return json({ error: 'Face ID log-in is not set up on the server.' }, 500); }
  const db = admin.firestore();
  let body; try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const signedIn = async () => { const m = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/); if (!m) return null; try { return (await admin.auth().verifyIdToken(m[1])).uid; } catch { return null; } };

  // ---- register this phone (you're logged in)
  if (body.action === 'regBegin') {
    const uid = await signedIn(); if (!uid) return json({ error: 'Not signed in' }, 401);
    return json(await newChallenge(db, { uid, kind: 'reg' }));
  }
  if (body.action === 'regFinish') {
    const uid = await signedIn(); if (!uid) return json({ error: 'Not signed in' }, 401);
    const ch = await takeChallenge(db, body.id); if (!ch || ch.uid !== uid || ch.kind !== 'reg') return json({ error: 'That took too long — try again.' }, 400);
    try { checkClient(body.clientData, 'webauthn.create', ch.c, req); } catch (e) { return json({ error: 'Couldn\'t save Face ID (' + e.message + ').' }, 400); }
    const credId = String(body.credId || ''); if (!/^[\w-]{10,400}$/.test(credId)) return json({ error: 'Bad request' }, 400);
    const pk = { alg: +body.alg, spki: body.spki || null, jwk: body.jwk || null };
    try { await importKey(pk); } catch { return json({ error: 'This phone\'s key type isn\'t supported.' }, 400); }
    await db.doc('passkeys/' + await keyId(credId)).set({ uid, credId, ...pk, at: Date.now(), ua: String(req.headers.get('user-agent') || '').slice(0, 160) });
    return json({ ok: true });
  }

  // ---- log in with Face ID / fingerprint (not logged in yet)
  if (body.action === 'loginBegin') return json(await newChallenge(db, { kind: 'login' }));
  if (body.action === 'loginFinish') {
    const ch = await takeChallenge(db, body.id); if (!ch || ch.kind !== 'login') return json({ error: 'That took too long — tap Sign in with Face ID again.' }, 400);
    const credId = String(body.credId || '');
    const pk = (await db.doc('passkeys/' + await keyId(credId)).get()).data();
    if (!pk || pk.credId !== credId) return json({ error: 'Face ID isn\'t set up for Nexa on this phone yet. Log in with your password once, then turn it on in Settings › Privacy.' }, 400);
    try { checkClient(body.clientData, 'webauthn.get', ch.c, req); } catch (e) { return json({ error: 'Face ID log-in failed (' + e.message + ').' }, 400); }
    const auth = unb64u(body.authData), clientHash = await sha256(unb64u(body.clientData));
    if (auth.length < 37 || !(auth[32] & 0x01) || !(auth[32] & 0x04)) return json({ error: 'Your face or fingerprint wasn\'t checked — try again.' }, 400); // user present + verified
    const rpHash = await sha256(new TextEncoder().encode(new URL(req.url).hostname));
    if (!rpHash.every((b, i) => b === auth[i])) return json({ error: 'Face ID log-in failed (wrong site).' }, 400);
    const signed = new Uint8Array(auth.length + clientHash.length); signed.set(auth, 0); signed.set(clientHash, auth.length);
    let ok = false;
    try { const key = await importKey(pk); const sig = unb64u(body.sig); ok = pk.alg === -7 ? await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(sig), signed) : await subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, sig, signed); } catch {}
    if (!ok) return json({ error: 'Face ID log-in failed — try again or use your password.' }, 400);
    if ((await db.doc('bans/' + pk.uid).get()).exists) return json({ error: 'This account is suspended.' }, 403);
    await db.doc('passkeys/' + await keyId(credId)).update({ used: Date.now() }).catch(() => {});
    return json({ token: await admin.auth().createCustomToken(pk.uid, { via: 'faceid' }) });
  }
  // ---- two-step verification
  if (/^tfa/.test(body.action || '')) {
    const uid = await signedIn(); if (!uid) return json({ error: 'Not signed in' }, 401);
    const ref = db.doc('twoFactor/' + uid), cur = (await ref.get()).data() || {};
    if (body.action === 'tfaSetup') {
      if (cur.on) return json({ error: 'Two-step verification is already on.' }, 400);
      const secret = toB32(globalThis.crypto.getRandomValues(new Uint8Array(20)));
      await ref.set({ pending: secret, at: Date.now() });
      return json({ secret });
    }
    if (body.action === 'tfaEnable') {
      if (!cur.pending) return json({ error: 'Start again — tap Turn on.' }, 400);
      if (await tooMany(db, uid)) return json({ error: 'Too many tries. Wait 10 minutes.' }, 429);
      if (!(await totpOk(cur.pending, body.code))) return json({ error: 'That code didn\'t match. Use the newest 6-digit code from your authenticator app.' }, 400);
      const codes = Array.from({ length: 8 }, () => toB32(globalThis.crypto.getRandomValues(new Uint8Array(5))).slice(0, 8));
      await ref.set({ secret: cur.pending, on: true, backup: await Promise.all(codes.map(c => hex(c))), at: Date.now() });
      return json({ ok: true, backup: codes });
    }
    if (body.action === 'tfaVerify' || body.action === 'tfaDisable') {
      if (!cur.on) return json({ ok: true, off: true });
      if (await tooMany(db, uid)) return json({ error: 'Too many tries. Wait 10 minutes.' }, 429);
      const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      let ok = await totpOk(cur.secret, code), usedBackup = false;
      if (!ok && code.length === 8) { const h = await hex(code); if ((cur.backup || []).includes(h)) { ok = true; usedBackup = true; await ref.update({ backup: cur.backup.filter(x => x !== h) }); } }
      if (!ok) return json({ error: 'That code didn\'t work. Use the newest code from your authenticator app, or one of your backup codes.' }, 400);
      if (body.action === 'tfaDisable') { await ref.set({ on: false, at: Date.now() }); return json({ ok: true, off: true }); }
      return json({ ok: true, usedBackup, left: usedBackup ? (cur.backup || []).length - 1 : undefined });
    }
  }
  return json({ error: 'Unknown action' }, 400);
};
