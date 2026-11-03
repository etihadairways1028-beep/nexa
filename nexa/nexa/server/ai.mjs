// /api/ai — Nexa AI for people signed in to Nexa (the app falls back to this when the in-browser AI fails).
// Up to 150 questions a day per person, so the free Gemini allowance lasts.
import admin from './fbadmin.js';
import { Buffer } from 'node:buffer';
import { gemini } from './gemini.mjs';
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
function init() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT; if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try { init(); } catch (e) { return json({ error: 'Server not configured' }, 500); }
  const m = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/);
  let uid = ''; if (m) { try { uid = (await admin.auth().verifyIdToken(m[1])).uid; } catch {} }
  if (!uid) return json({ error: 'Please sign in to Nexa.', code: 'auth' }, 401);
  let b = {}; try { b = await req.json(); } catch {}
  const db = admin.firestore(), day = new Date().toISOString().slice(0, 10), ref = db.doc('aiUse/' + uid);
  const u = (await ref.get()).data() || {}, n = u.day === day ? (u.n || 0) : 0;
  if (n >= 150) return json({ error: 'You’ve asked Nexa AI a lot today. Try again tomorrow.', code: 'quota' }, 429);
  try {
    const out = await gemini({ system: b.system, contents: b.contents, prompt: b.parts || b.prompt, search: !!b.search });
    ref.set({ day, n: n + 1 }).catch(() => {});
    return json({ text: out.text, model: out.model });
  } catch (e) { return json({ error: e.message, code: e.code || 'error' }, e.status || 502); }
};
