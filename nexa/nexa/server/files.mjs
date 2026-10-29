// Nexa file sending — files up to 2 GB, stored in Cloudflare R2 (10 GB free, free downloads).
// Big files go up in 50 MB pieces (a Cloudflare request can be at most 100 MB), straight into R2.
// Only people in the chat can get a download link, and links stop working after 6 hours.
//
// Cloudflare setup (once):
//   1. R2 › Create bucket › name it  nexa-files
//   2. Workers & Pages › your Nexa site › Settings › Bindings › Add › R2 bucket:
//        Variable name  FILES   →  bucket  nexa-files
//   3. (recommended) R2 › nexa-files › Settings › Object lifecycle rules › delete files after 30 days,
//      so the free 10 GB doesn't fill up.
// FIREBASE_SERVICE_ACCOUNT (already set) is used to check who is sending.
import admin from './fbadmin.js';
import { Buffer } from 'node:buffer';

const MAX = 2 * 1024 ** 3;            // 2 GB per file
const PART = 50 * 1024 ** 2;          // 50 MB pieces
const DAY_LIMIT = 6 * 1024 ** 3;      // 6 GB per person per day (keeps the free storage safe)
const TEST = () => (process.env.FILES_TEST || '') === '1';
const cors = () => TEST() ? { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-expose-headers': 'content-range,content-length' } : {};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors() } });

function init() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  return admin.initializeApp({ credential: admin.credential.cert(sa) });
}

// ---- signed tickets (HMAC-SHA256), so pieces and downloads don't need a database check every time
const enc = new TextEncoder();
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
let keyP = null;
async function hkey() {
  if (!keyP) {
    const secret = process.env.FILES_SECRET || ('nexa-files:' + (process.env.FIREBASE_SERVICE_ACCOUNT || 'dev'));
    const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret));
    keyP = crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  return keyP;
}
async function sign(o) { const body = b64u(enc.encode(JSON.stringify(o))); const sig = await crypto.subtle.sign('HMAC', await hkey(), enc.encode(body)); return body + '.' + b64u(new Uint8Array(sig)); }
async function unsign(t) {
  const [body, sig] = String(t || '').split('.'); if (!body || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await hkey(), unb64u(sig), enc.encode(body)); if (!ok) return null;
  try { const o = JSON.parse(unb64u(body).toString('utf8')); return o.exp > Date.now() ? o : null; } catch { return null; }
}

async function who(req) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/); if (!m) return '';
  if (TEST() && m[1].startsWith('local:')) return m[1].slice(6);
  try { init(); return (await admin.auth().verifyIdToken(m[1])).uid; } catch { return ''; }
}
async function inChat(uid, conv) {
  if (!/^[\w-]{1,128}$/.test(String(conv || ''))) return false;
  if (TEST()) return true;
  const c = (await admin.firestore().doc('conversations/' + conv).get()).data();
  return !!(c && (c.members || []).includes(uid));
}
const safeName = n => String(n || 'file').replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 120) || 'file';
const disp = (n, dl) => `${dl ? 'attachment' : 'inline'}; filename="${safeName(n).replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'")}"; filename*=UTF-8''${encodeURIComponent(safeName(n))}`;

export default async (req, ctx = {}) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  const B = ctx.env && ctx.env.FILES;
  if (!B) return json({ error: 'files-off', message: 'File sending isn’t switched on yet (R2 bucket “FILES” not connected).' }, 503);
  const url = new URL(req.url);

  // ---- download (a signed link: works in <a href>, video players and "Save as")
  if (req.method === 'GET') {
    const g = await unsign(url.searchParams.get('g')); if (!g || !g.k) return new Response('This link has expired. Open the chat and tap the file again.', { status: 403, headers: cors() });
    const range = req.headers.get('range');
    const obj = await B.get(g.k, range ? { range: req.headers } : {});
    if (!obj) return new Response('File not found (it may have been deleted after 30 days).', { status: 404, headers: cors() });
    const h = new Headers(cors());
    if (obj.writeHttpMetadata) obj.writeHttpMetadata(h);
    h.set('content-disposition', disp(g.n || (obj.customMetadata || {}).name, url.searchParams.get('dl') === '1'));
    h.set('cache-control', 'private, max-age=3600'); h.set('accept-ranges', 'bytes'); h.set('x-content-type-options', 'nosniff');
    if (obj.httpEtag) h.set('etag', obj.httpEtag);
    if (range && obj.range) {
      const off = obj.range.offset ?? (obj.range.suffix != null ? obj.size - obj.range.suffix : 0);
      const len = obj.range.length ?? (obj.range.suffix != null ? obj.range.suffix : obj.size - off);
      h.set('content-range', `bytes ${off}-${off + len - 1}/${obj.size}`); h.set('content-length', String(len));
      return new Response(obj.body, { status: 206, headers: h });
    }
    h.set('content-length', String(obj.size));
    return new Response(obj.body, { status: 200, headers: h });
  }

  // ---- one 50 MB piece of an upload
  if (req.method === 'PUT') {
    const t = await unsign(url.searchParams.get('t')); const n = +url.searchParams.get('n');
    if (!t || !t.up) return json({ error: 'Upload expired — try again.' }, 403);
    if (!(n >= 1 && n <= 10000) || n > Math.ceil(t.size / PART)) return json({ error: 'Bad piece' }, 400);
    const len = +req.headers.get('content-length');
    if (!(len > 0) || len > PART) return json({ error: 'Piece too big' }, 413);
    const part = await B.resumeMultipartUpload(t.k, t.up).uploadPart(n, req.body);
    return json({ partNumber: part.partNumber, etag: part.etag });
  }

  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  let body = {}; try { body = await req.json(); } catch {}

  if (body.action === 'done' || body.action === 'abort') {
    const t = await unsign(body.ticket); if (!t || !t.up) return json({ error: 'Upload expired — try again.' }, 403);
    const mp = B.resumeMultipartUpload(t.k, t.up);
    if (body.action === 'abort') { try { await mp.abort(); } catch {} return json({ ok: true }); }
    const parts = (Array.isArray(body.parts) ? body.parts : []).filter(p => p && p.partNumber && p.etag).sort((a, b) => a.partNumber - b.partNumber);
    const obj = await mp.complete(parts);
    if (obj.size > MAX) { await B.delete(t.k); return json({ error: 'Files can be up to 2 GB.' }, 413); }
    if (!TEST()) { try { init(); const ref = admin.firestore().doc('fileUse/' + t.uid), day = new Date().toISOString().slice(0, 10), u = (await ref.get()).data() || {}; await ref.set({ day, bytes: (u.day === day ? u.bytes || 0 : 0) + obj.size }); } catch {} }
    return json({ ok: true, key: t.k, size: obj.size });
  }

  const uid = await who(req); if (!uid) return json({ error: 'Not signed in' }, 401);

  if (body.action === 'start') {
    const size = +body.size, conv = String(body.conv || '');
    if (!(size > 0)) return json({ error: 'Empty file' }, 400);
    if (size > MAX) return json({ error: 'Files can be up to 2 GB.' }, 413);
    if (!(await inChat(uid, conv))) return json({ error: 'You’re not in this chat.' }, 403);
    if (!TEST()) {
      const u = (await admin.firestore().doc('fileUse/' + uid).get()).data() || {}, day = new Date().toISOString().slice(0, 10);
      if (u.day === day && (u.bytes || 0) + size > DAY_LIMIT) return json({ error: 'You’ve sent a lot of big files today. Try again tomorrow.' }, 429);
    }
    const name = safeName(body.name), type = /^[\w.+-]+\/[\w.+-]+$/.test(body.type || '') ? body.type : 'application/octet-stream';
    const key = `c/${conv}/${uid}/${Date.now().toString(36)}${b64u(crypto.getRandomValues(new Uint8Array(9)))}/${name}`;
    const mp = await B.createMultipartUpload(key, { httpMetadata: { contentType: type }, customMetadata: { uid, conv, name } });
    const ticket = await sign({ k: key, up: mp.uploadId, uid, size, exp: Date.now() + 24 * 3600e3 });
    return json({ key, ticket, partSize: PART });
  }

  if (body.action === 'link') {
    const key = String(body.key || ''), m = key.match(/^c\/([\w-]{1,128})\//);
    if (!m || !(await inChat(uid, m[1]))) return json({ error: 'You’re not in this chat.' }, 403);
    const g = await sign({ k: key, n: body.name || '', exp: Date.now() + 6 * 3600e3 });
    return json({ url: `${url.origin}${url.pathname}?g=${encodeURIComponent(g)}` });
  }

  return json({ error: 'Unknown action' }, 400);
};
