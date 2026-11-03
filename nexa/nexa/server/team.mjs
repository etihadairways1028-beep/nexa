// Nexa team websites — the server side of /videoeditor/ (Nexa Studio, designers & video creators)
// and /webdev/ (Nexa Dev Hub, web developers). One file for both, chosen by body.site.
// Sign-in: pick your name, type the site password (the owner chose these):
//   Nexa Studio  → nexaeditor     Nexa Dev Hub → nexadev
// People get a login when they're hired (Nexa Support › Jobs) or added on the owner page › Team.
// Everything lives in Firestore under teamSites/<site>/… which no app user can read.
import admin from './fbadmin.js';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { gemini } from './gemini.mjs';

export const SITES = {
  studio: { name: 'Nexa Studio', path: '/videoeditor/', password: 'nexaeditor', role: 'creative', kinds: ['post', 'file', 'msg'] },
  devhub: { name: 'Nexa Dev Hub', path: '/webdev/', password: 'nexadev', role: 'webdev', kinds: ['task', 'file', 'msg'] },
};
export const SITE_OF_ROLE = { creative: 'studio', webdev: 'devhub' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const hash = (pw, salt) => crypto.pbkdf2Sync(String(pw), salt, 3000, 32, 'sha256').toString('hex');
const pwOk = (pw, a) => { if (!a || !a.hash) return false; const x = Buffer.from(hash(pw, a.salt), 'hex'), y = Buffer.from(a.hash, 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const sign = (data, key) => { const p = Buffer.from(JSON.stringify(data)).toString('base64url'); return p + '.' + crypto.createHmac('sha256', key).update(p).digest('base64url'); };
const unsign = (tok, key) => { const [p, s] = String(tok || '').split('.'); if (!p || !s) return null; const want = crypto.createHmac('sha256', key).update(p).digest('base64url'); if (want.length !== s.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(s))) return null; try { return JSON.parse(Buffer.from(p, 'base64url').toString()); } catch { return null; } };
const ID = /^[\w-]{1,120}$/;
const clip = (v, n) => String(v ?? '').slice(0, n);
const PART = 600 * 1024;          // raw bytes per stored piece (fits a Firestore document)
const MAX_FILE = 40 * 1024 * 1024; // 40 MB per file

function init() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT; if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

// Give someone a login (used by Nexa Support › Jobs › Accept and by the owner page › Team).
export async function addSiteLogin(db, site, { uid, name }) {
  const S = SITES[site]; if (!S) return null;
  const ref = db.doc('teamSites/' + site), sec = (await ref.get()).data() || {};
  const members = { ...(sec.members || {}) };
  let id = Object.keys(members).find(k => members[k].uid && members[k].uid === uid);
  if (!id) { const base = String(name || 'member').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) || 'member'; id = base; let n = 2; while (members[id]) id = base + n++; }
  const salt = crypto.randomBytes(16).toString('hex');
  members[id] = { ...(members[id] || {}), name: String(name || 'Member').trim().split(' ')[0].slice(0, 20), uid: uid || '', salt, hash: hash(S.password, salt), at: Date.now(), removed: false };
  await ref.set({ members, ...(sec.sessionKey ? {} : { sessionKey: crypto.randomBytes(32).toString('hex') }) }, { merge: true });
  return { site: S.name, path: S.path, name: members[id].name, password: S.password, id };
}
export async function removeSiteLogin(db, uid) {
  for (const site of Object.keys(SITES)) {
    const ref = db.doc('teamSites/' + site), sec = (await ref.get()).data(); if (!sec?.members) continue;
    const ids = Object.keys(sec.members).filter(k => sec.members[k].uid === uid); if (!ids.length) continue;
    await ref.update(Object.fromEntries(ids.map(k => ['members.' + k + '.removed', true])));
  }
}
// for the owner page: what's waiting for approval + who's on each site
export async function siteOverview(db) {
  const out = {};
  for (const site of Object.keys(SITES)) {
    const sec = (await db.doc('teamSites/' + site).get()).data() || {};
    const kind = site === 'studio' ? 'post' : 'task';
    const qs = await db.collection(`teamSites/${site}/${kind}`).orderBy('at', 'desc').limit(150).get().catch(() => ({ docs: [] }));
    out[site] = { name: SITES[site].name, members: Object.entries(sec.members || {}).filter(([, m]) => !m.removed).map(([id, m]) => ({ id, name: m.name, uid: m.uid || '', seen: m.seen || 0 })), items: qs.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.status === 'review' || x.status === 'approved' || x.status === 'changes').slice(0, 60) };
  }
  return out;
}
export async function siteDecide(db, { site, id, status, note }) {
  if (!SITES[site] || !ID.test(String(id || ''))) throw new Error('Bad item');
  const kind = site === 'studio' ? 'post' : 'task', ref = db.doc(`teamSites/${site}/${kind}/${id}`);
  const it = (await ref.get()).data(); if (!it) throw new Error('Not found');
  const st = ['approved', 'changes', 'published', 'done'].includes(status) ? status : 'changes';
  const comments = [...(it.comments || []), { by: 'owner', name: 'Owner', text: clip(note || (st === 'approved' ? 'Approved ✅' : st === 'changes' ? 'Please make some changes.' : 'Done'), 1000), at: Date.now(), owner: true }].slice(-80);
  await ref.update({ status: st, comments, decidedAt: Date.now() });
  return { done: true };
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try { init(); } catch { return json({ error: 'Server not configured' }, 500); }
  let body = {}; try { body = await req.json(); } catch {}
  const site = String(body.site || ''), S = SITES[site]; if (!S) return json({ error: 'Unknown website' }, 400);
  const db = admin.firestore(), ref = db.doc('teamSites/' + site), now = Date.now();
  let sec = (await ref.get()).data() || {};
  if (!sec.sessionKey) { sec.sessionKey = crypto.randomBytes(32).toString('hex'); await ref.set({ sessionKey: sec.sessionKey }, { merge: true }); }
  const members = sec.members || {};
  const list = () => Object.entries(members).filter(([, m]) => !m.removed).map(([id, m]) => ({ id, name: m.name, online: now - (m.seen || 0) < 3 * 60e3 }));

  if (body.action === 'names') return json({ names: list().map(({ id, name }) => ({ id, name })), site: S.name });
  if (body.action === 'login') {
    const m = members[body.id]; if (!m || m.removed) return json({ error: 'Pick your name' }, 400);
    if ((m.lockUntil || 0) > now) return json({ error: 'Too many tries. Wait a few minutes.' }, 429);
    if (!pwOk(body.password, m)) { const f = (m.fails || 0) + 1; await ref.update({ ['members.' + body.id + '.fails']: f, ['members.' + body.id + '.lockUntil']: f >= 8 ? now + 10 * 60e3 : 0 }); return json({ error: 'Wrong password' }, 401); }
    await ref.update({ ['members.' + body.id + '.fails']: 0, ['members.' + body.id + '.seen']: now, ['members.' + body.id + '.lastLogin']: now });
    return json({ session: sign({ site, id: body.id, at: m.at || 0, exp: now + 14 * 864e5 }, sec.sessionKey), me: { id: body.id, name: m.name } });
  }
  // ---- everything below needs a session
  const s = unsign(body.session, sec.sessionKey), me = s && members[s.id];
  if (!s || s.site !== site || s.exp < now || !me || me.removed || (me.at || 0) !== (s.at || 0)) return json({ error: 'session', message: 'Please sign in again.' }, 401);
  const ok = o => json({ ...o });
  if (now - (me.seen || 0) > 60e3) ref.update({ ['members.' + s.id + '.seen']: now }).catch(() => {});
  const col = k => db.collection(`teamSites/${site}/${k}`);
  const who = { by: s.id, name: me.name };

  if (body.action === 'load') {
    const kinds = S.kinds;
    const res = await Promise.all(kinds.map(k => col(k).orderBy('at', 'desc').limit(k === 'msg' ? 80 : 200).get().catch(() => ({ docs: [] }))));
    const out = { me: { id: s.id, name: me.name }, team: list() };
    kinds.forEach((k, i) => { out[k] = res[i].docs.map(d => ({ id: d.id, ...d.data() })); });
    if (out.msg) out.msg.reverse();
    return ok(out);
  }
  // posts (Studio) and tasks (Dev Hub): add / change / delete / comment
  const ITEM = site === 'studio' ? 'post' : 'task';
  if (body.action === 'save') {
    const x = body.item || {}, isNew = !x.id;
    if (!isNew && !ID.test(String(x.id))) return json({ error: 'Bad item' }, 400);
    const STATUSES = site === 'studio' ? ['idea', 'making', 'review', 'changes', 'approved', 'published'] : ['todo', 'doing', 'review', 'changes', 'approved', 'done'];
    const old = isNew ? null : (await col(ITEM).doc(x.id).get()).data(); if (!isNew && !old) return json({ error: 'Not found' }, 404);
    let status = STATUSES.includes(x.status) ? x.status : (old?.status || STATUSES[0]);
    const FINAL = ['approved', 'published', 'done'];
    if (FINAL.includes(status) && !FINAL.includes(old?.status) && status !== old?.status) status = 'review'; // only the owner approves
    const d = { title: clip(x.title, 140) || 'Untitled', text: clip(x.text, 4000), status, date: clip(x.date, 10), platforms: (Array.isArray(x.platforms) ? x.platforms : []).map(p => clip(p, 20)).slice(0, 6), fileId: ID.test(String(x.fileId || '')) ? x.fileId : '', link: /^https?:\/\//.test(String(x.link || '')) ? clip(x.link, 400) : '', who: clip(x.who, 40), prio: ['low', 'normal', 'high'].includes(x.prio) ? x.prio : 'normal', updatedAt: now, updatedBy: me.name };
    if (isNew) { const r = col(ITEM).doc(); await r.set({ ...d, ...who, at: now, comments: [] }); return ok({ id: r.id }); }
    await col(ITEM).doc(x.id).update(d); return ok({ id: x.id });
  }
  if (body.action === 'del') {
    const k = S.kinds.includes(body.kind) ? body.kind : ''; if (!k || !ID.test(String(body.id || ''))) return json({ error: 'Bad item' }, 400);
    if (k === 'file') { const f = (await col('file').doc(body.id).get()).data(); for (let i = 0; i < (f?.parts || 0); i++) await col('part').doc(body.id + '_' + i).delete().catch(() => {}); }
    await col(k).doc(body.id).delete(); return ok({ done: true });
  }
  if (body.action === 'comment') {
    const k = [ITEM, 'file'].includes(body.kind) ? body.kind : ITEM; if (!ID.test(String(body.id || ''))) return json({ error: 'Bad item' }, 400);
    const r = col(k).doc(body.id), it = (await r.get()).data(); if (!it) return json({ error: 'Not found' }, 404);
    const text = clip(body.text, 1000).trim(); if (!text) return json({ error: 'Write something' }, 400);
    await r.update({ comments: [...(it.comments || []), { ...who, text, at: now }].slice(-80) }); return ok({ done: true });
  }
  // team chat
  if (body.action === 'say') {
    const text = clip(body.text, 2000).trim(); if (!text) return json({ error: 'Write something' }, 400);
    const r = col('msg').doc(); await r.set({ ...who, text, at: now, fileId: ID.test(String(body.fileId || '')) ? body.fileId : '' }); return ok({ id: r.id });
  }
  // files, stored in pieces (videos, designs, exports)
  if (body.action === 'fileStart') {
    const size = +body.size || 0; if (size <= 0 || size > MAX_FILE) return json({ error: 'Files can be up to 40 MB.' }, 400);
    const type = /^[\w.+-]+\/[\w.+-]+$/.test(String(body.type || '')) ? body.type : 'application/octet-stream';
    const r = col('file').doc(); await r.set({ ...who, name: clip(body.name, 120) || 'file', type, size, parts: Math.ceil(size / PART), got: 0, ready: false, thumb: /^data:image\/(jpeg|webp|png);base64,[\w+/=]+$/.test(String(body.thumb || '')) && body.thumb.length < 90000 ? body.thumb : '', dur: Math.max(0, Math.min(36000, +body.dur || 0)), folder: clip(body.folder, 30) || 'files', at: now, comments: [] });
    return ok({ id: r.id, part: PART });
  }
  if (body.action === 'filePart') {
    if (!ID.test(String(body.id || ''))) return json({ error: 'Bad file' }, 400);
    const fr = col('file').doc(body.id), f = (await fr.get()).data(); if (!f) return json({ error: 'Not found' }, 404);
    const n = +body.n; if (!(n >= 0 && n < f.parts)) return json({ error: 'Bad piece' }, 400);
    if (body.data) { // upload a piece
      if (f.by !== s.id) return json({ error: 'Not your file' }, 403);
      const d = String(body.data); if (d.length > PART * 1.4) return json({ error: 'Piece too big' }, 400);
      await col('part').doc(body.id + '_' + n).set({ d });
      const got = (f.got || 0) + 1; await fr.update({ got, ready: got >= f.parts }); return ok({ done: true, ready: got >= f.parts });
    }
    const p = (await col('part').doc(body.id + '_' + n).get()).data(); if (!p) return json({ error: 'Missing piece' }, 404);
    return ok({ data: p.d });
  }
  // Nexa AI for the team
  if (body.action === 'ai') {
    const sys = site === 'studio'
      ? 'You are Nexa AI inside Nexa Studio, helping the Nexa designers and video creators. Nexa is a messaging app for friends, groups and communities (liquid-glass look, purple/pink/blue colours). Help with video ideas, scripts, hooks, captions, hashtags, titles, posting plans and design feedback. Be short, friendly and practical. Use simple words.'
      : 'You are Nexa AI inside Nexa Dev Hub, helping the Nexa web developers. Nexa is a web messaging app (HTML/CSS/JS ES modules, Firebase Firestore, Cloudflare Pages Functions). Help with code, bugs, reviews and task plans. Give short, correct answers with small code examples. Use simple words.';
    try { const out = await gemini({ system: sys, contents: Array.isArray(body.contents) ? body.contents : null, prompt: clip(body.prompt, 12000) }); return ok({ text: out.text }); }
    catch (e) { return json({ error: e.message, code: e.code }, e.status || 502); }
  }
  return json({ error: 'Unknown action' }, 400);
};
