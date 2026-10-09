// Nexa quick login — log in on a new device with a code or QR code from a device that's already logged in.
// 1. The logged-in device asks for a code ("create"). It lasts 2 minutes and works once.
// 2. The new device sends the code ("redeem") and gets a one-time Firebase sign-in token.
// Codes are stored only as a hash in Firestore (collection quickLogins, which no app user can read).
import admin from './fbadmin.js';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const TTL = 2 * 60 * 1000;
const hash = c => crypto.createHash('sha256').update('nexa-ql:' + c).digest('hex');
const norm = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function init() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  return admin.initializeApp({ credential: admin.credential.cert(sa) });
}
function newCode() { const b = crypto.randomBytes(8); let s = ''; for (let i = 0; i < 8; i++) s += ALPHA[b[i] % ALPHA.length]; return s; }

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try { init(); } catch (e) { return json({ error: 'Quick login is not set up on the server.' }, 500); }
  const db = admin.firestore();
  let body; try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }

  if (body.action === 'create') {
    const m = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/);
    if (!m) return json({ error: 'Not signed in' }, 401);
    let uid; try { uid = (await admin.auth().verifyIdToken(m[1])).uid; } catch { return json({ error: 'Not signed in' }, 401); }
    if ((await db.doc('bans/' + uid).get()).exists) return json({ error: 'This account is suspended.' }, 403);
    const mine = db.doc('quickLoginsByUser/' + uid);
    const old = (await mine.get()).data();
    if (old && old.h) await db.doc('quickLogins/' + old.h).delete().catch(() => {});
    const code = newCode(), h = hash(code), exp = Date.now() + TTL;
    await db.doc('quickLogins/' + h).set({ uid, exp, at: Date.now() });
    await mine.set({ h, exp });
    return json({ code, exp, ttl: TTL });
  }

  if (body.action === 'redeem') {
    const code = norm(body.code);
    if (code.length !== 8) return json({ error: 'Codes are 8 letters and numbers.' }, 400);
    // Slow down guessing: at most 10 tries a minute from one address.
    const ip = (context && context.ip) || req.headers.get('cf-connecting-ip') || req.headers.get('x-nf-client-connection-ip') || 'unknown';
    const slot = db.doc('quickLoginTries/' + hash(ip + ':' + Math.floor(Date.now() / 60000)));
    const tries = await db.runTransaction(async t => { const d = (await t.get(slot)).data(); const n = (d && d.n || 0) + 1; t.set(slot, { n, at: Date.now() }); return n; });
    if (tries > 10) return json({ error: 'Too many tries. Wait a minute and try again.' }, 429);
    const ref = db.doc('quickLogins/' + hash(code));
    const got = await db.runTransaction(async t => { const d = (await t.get(ref)).data(); if (d) t.delete(ref); return d; });
    if (!got || got.exp < Date.now()) return json({ error: 'That code didn\'t work. Codes last 2 minutes — get a new one on your other device.' }, 400);
    if ((await db.doc('bans/' + got.uid).get()).exists) return json({ error: 'This account is suspended.' }, 403);
    const token = await admin.auth().createCustomToken(got.uid, { via: 'quickLogin' });
    return json({ token });
  }
  return json({ error: 'Unknown action' }, 400);
};
