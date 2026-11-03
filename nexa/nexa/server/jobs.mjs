// Nexa Team applications. People apply inside Nexa (a Nexa account is required): the app sends the application
// to Nexa Support as a chat message, and also files it here so it shows in Nexa Support › Jobs.
// Applications are saved in Firestore "applications" and show up in Nexa Support › Jobs.
// Spam protection: a hidden field, size limits, and at most 3 applications per day from one connection.
import admin from './fbadmin.js';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { sendAs } from './owner.mjs';

const ROLES = { support: 'Support & Safety', community: 'Community Guide', creative: 'Designer & Video Creator', webdev: 'Web Developer', tester: 'Tester', moderator: 'Support & Safety' };
const AGES = ['13-15', '16-17', '18+'];
const HOURS = ['1-2', '3-5', '6+'];
const TEST = () => (process.env.JOBS_TEST || '') === '1';
const cors = () => TEST() ? { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'POST,OPTIONS' } : {};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors() } });
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n);

function init() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  return admin.initializeApp({ credential: admin.credential.cert(sa) });
}

export default async (req, ctx = {}) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  let b = {}; try { b = await req.json(); } catch { return json({ error: 'Something went wrong. Please try again.' }, 400); }
  if (b.website) return json({ ok: true, ref: 'NX-' + Date.now().toString(36).toUpperCase() }); // hidden field: only bots fill it
  // must be signed in to Nexa
  let who = '';
  const tm = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/);
  if (tm) { if (TEST() && tm[1].startsWith('local:')) who = tm[1].slice(6); else { try { init(); who = (await admin.auth().verifyIdToken(tm[1])).uid; } catch {} } }
  if (!who) return json({ error: 'Please apply from your Nexa account: open Nexa, then ••• › Join the Nexa Team.' }, 401);

  const a = {
    name: clip(b.name, 80), email: clip(b.email, 120).toLowerCase(), handle: clip(b.handle, 30).replace(/^@/, '').toLowerCase(),
    age: clip(b.age, 8), role: clip(b.role, 20), hours: clip(b.hours, 8), why: clip(b.why, 1500), links: clip(b.links, 600), where: clip(b.where, 60),
  };
  const bad = m => json({ error: m }, 400);
  if (a.name.length < 2) return bad('Please add your name.');
  if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) return bad('That email doesn’t look right.');
  if (a.handle && !/^[a-z0-9_.]{2,24}$/.test(a.handle)) return bad('That Nexa username doesn’t look right.');
  if (!AGES.includes(a.age)) return bad('Please pick your age group.');
  if (!ROLES[a.role]) return bad('Please pick a role.');
  if (!HOURS.includes(a.hours)) return bad('Please pick how much time you have.');
  if (a.why.length < 30) return bad('Tell us a little more about why you want to join (at least a couple of sentences).');
  if (!b.agree || !b.volunteer) return bad('Please tick the boxes at the end of the form.');
  if (a.age !== '18+' && !b.parent) return bad('If you’re under 18, please tick the box to confirm a parent or guardian is OK with you volunteering.');

  try { init(); } catch (e) { return json({ error: 'Applications are closed for a moment. Please try again later.' }, 503); }
  const db = admin.firestore(), now = Date.now(), day = new Date().toISOString().slice(0, 10);
  const ip = (ctx.ip || req.headers.get('cf-connecting-ip') || 'x');
  const ipKey = crypto.createHash('sha256').update('nexa-jobs:' + who).digest('hex').slice(0, 32); // 3 a day per Nexa account
  const rr = db.doc('jobsRate/' + ipKey), r = (await rr.get()).data() || {};
  const n = r.day === day ? (r.n || 0) : 0;
  if (n >= 3) return json({ error: 'You’ve sent 3 applications today. Please try again tomorrow.' }, 429);
  await rr.set({ day, n: n + 1 });

  const uid = who;
  const ref = /^NX-[A-Z0-9]{4,12}$/.test(String(b.ref || '')) ? String(b.ref) : 'NX-' + now.toString(36).toUpperCase().slice(-6) + crypto.randomBytes(2).toString('hex').toUpperCase();
  let conv = /^[\w-]{1,128}$/.test(String(b.conv || '')) ? String(b.conv) : '';
  const prof = (await db.doc('users/' + uid).get()).data() || {};
  if (!a.handle) a.handle = String(prof.handle || '');
  // sent from the hiring page: deliver it to @owner as a chat message from the applicant (the app does this itself)
  if (!conv && b.fromWeb) {
    try {
      const owner = (await db.doc('handles/owner').get()).data()?.uid;
      if (owner && owner !== uid) {
        const cid = 'dm_' + [uid, owner].sort().join('__'), cr = db.doc('conversations/' + cid);
        let c = (await cr.get()).data();
        if (!c) { c = { type: 'dm', members: [uid, owner].sort(), createdAt: now, reads: {}, typing: {} }; await cr.set(c); }
        const AGE_N = { '13-15': '13–15', '16-17': '16–17', '18+': '18+' }, HRS_N = { '1-2': '1–2 hours a week', '3-5': '3–5 hours a week', '6+': '6+ hours a week' };
        const text = [`📋 Nexa Team application · ${ref}`, `Role: ${ROLES[a.role]}`, `Name: ${a.name}`, `Age: ${AGE_N[a.age]} · Time: ${HRS_N[a.hours]}`, a.email ? `Email: ${a.email}` : '', '', `Why: ${a.why}`, a.links ? `Links: ${a.links}` : '', '', `✓ Volunteer role${a.age !== '18+' ? ' · ✓ Parent/guardian OK' : ''} · ✓ Terms · sent from the hiring page`].filter((x, i, A) => x || (A[i - 1] && A[i - 1] !== '')).join('\n');
        await sendAs(db, uid, cid, c, text, req);
        conv = cid;
      }
    } catch (e) { /* the application is still saved for Nexa Support › Jobs */ }
  }
  await db.collection('applications').add({ ...a, roleName: ROLES[a.role], uid, conv, parentOk: !!b.parent, ref, status: 'new', at: now });
  return json({ ok: true, ref });
};
