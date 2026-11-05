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
  devhub: { name: 'Nexa Dev Hub', path: '/webdev/', password: 'nexadev', role: 'webdev', kinds: ['task', 'file', 'msg', 'build'] },
};
export const SITE_OF_ROLE = { creative: 'studio', webdev: 'devhub', tester: 'devhub' }; // testers test builds in Nexa Dev Hub
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
export async function addSiteLogin(db, site, { uid, name, role }) {
  const S = SITES[site]; if (!S) return null;
  const ref = db.doc('teamSites/' + site), sec = (await ref.get()).data() || {};
  const members = { ...(sec.members || {}) };
  let id = Object.keys(members).find(k => members[k].uid && members[k].uid === uid);
  if (!id) { const base = String(name || 'member').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) || 'member'; id = base; let n = 2; while (members[id]) id = base + n++; }
  const salt = crypto.randomBytes(16).toString('hex');
  members[id] = { ...(members[id] || {}), name: String(name || 'Member').trim().split(' ')[0].slice(0, 20), uid: uid || '', salt, hash: hash(S.password, salt), at: Date.now(), removed: false, role: role === 'tester' ? 'tester' : (members[id]?.role === 'tester' && !role ? 'tester' : (role || S.role)) };
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
    if (site === 'devhub') { const bq = await db.collection('teamSites/devhub/build').orderBy('at', 'desc').limit(60).get().catch(() => ({ docs: [] })); out[site].builds = bq.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => ['verified', 'testing', 'issues'].includes(b.status)).slice(0, 30); }
  }
  return out;
}
export async function siteDecide(db, { site, id, status, note, kind: k }) {
  if (!SITES[site] || !ID.test(String(id || ''))) throw new Error('Bad item');
  if (site === 'devhub' && k === 'build') { // owner: a tested build is added to the real Nexa (or sent back)
    const br = db.doc('teamSites/devhub/build/' + id), b = (await br.get()).data(); if (!b) throw new Error('Not found');
    const st = status === 'shipped' ? 'shipped' : 'issues';
    const issues = st === 'issues' ? [...(b.issues || []), { by: 'owner', name: 'Owner', text: clip(note || 'Please fix this before it goes into Nexa.', 2000), at: Date.now(), owner: true }].slice(-40) : (b.issues || []);
    await br.update({ status: st, issues, shippedAt: st === 'shipped' ? Date.now() : 0 }); return { done: true };
  }
  const kind = site === 'studio' ? 'post' : 'task', ref = db.doc(`teamSites/${site}/${kind}/${id}`);
  const it = (await ref.get()).data(); if (!it) throw new Error('Not found');
  const st = ['approved', 'changes', 'published', 'done'].includes(status) ? status : 'changes';
  const comments = [...(it.comments || []), { by: 'owner', name: 'Owner', text: clip(note || (st === 'approved' ? 'Approved ✅' : st === 'changes' ? 'Please make some changes.' : 'Done'), 1000), at: Date.now(), owner: true }].slice(-80);
  await ref.update({ status: st, comments, decidedAt: Date.now() });
  return { done: true };
}

// free stock videos and photos for Nexa Studio (Pexels / Pixabay keys in Cloudflare: PEXELS_API_KEY, PIXABAY_API_KEY)
const STOCK_HOSTS = /^https:\/\/([\w-]+\.)*(pexels\.com|pixabay\.com)\//;
async function stockSearch(q, kind) {
  const out = [], pk = String(process.env.PEXELS_API_KEY || '').trim(), xk = String(process.env.PIXABAY_API_KEY || '').trim();
  if (!pk && !xk) { const e = new Error('Stock videos aren’t switched on yet. Owner: add PEXELS_API_KEY (free from pexels.com/api) in Cloudflare.'); e.code = 'nokey'; throw e; }
  if (pk) {
    const u = kind === 'photo' ? `https://api.pexels.com/v1/search?per_page=24&query=${encodeURIComponent(q)}` : `https://api.pexels.com/videos/search?per_page=24&size=medium&query=${encodeURIComponent(q)}`;
    const j = await fetch(u, { headers: { authorization: pk } }).then(r => r.json()).catch(() => ({}));
    if (kind === 'photo') for (const p of j.photos || []) out.push({ kind: 'photo', thumb: p.src?.medium, url: p.src?.large2x || p.src?.large, w: p.width, h: p.height, by: p.photographer, src: 'Pexels' });
    else for (const v of j.videos || []) { const f = (v.video_files || []).filter(f => f.file_type === 'video/mp4' && f.width).sort((a, b) => Math.abs(a.height - 720) - Math.abs(b.height - 720))[0]; if (f) out.push({ kind: 'video', thumb: v.image, url: f.link, w: f.width, h: f.height, dur: v.duration, by: v.user?.name, src: 'Pexels' }); }
  }
  if (xk && out.length < 12) {
    const u = kind === 'photo' ? `https://pixabay.com/api/?per_page=24&safesearch=true&key=${xk}&q=${encodeURIComponent(q)}` : `https://pixabay.com/api/videos/?per_page=24&safesearch=true&key=${xk}&q=${encodeURIComponent(q)}`;
    const j = await fetch(u).then(r => r.json()).catch(() => ({}));
    for (const h of j.hits || []) { if (kind === 'photo') out.push({ kind: 'photo', thumb: h.webformatURL, url: h.largeImageURL, w: h.imageWidth, h: h.imageHeight, by: h.user, src: 'Pixabay' }); else { const f = h.videos?.medium || h.videos?.small; if (f?.url) out.push({ kind: 'video', thumb: h.videos?.tiny?.thumbnail || f.thumbnail || '', url: f.url, w: f.width, h: f.height, dur: h.duration, by: h.user, src: 'Pixabay' }); } }
  }
  return out.filter(x => x.url && STOCK_HOSTS.test(x.url));
}
const NEXA_FACTS = `About the Nexa codebase (what you know as the Nexa Dev Hub AI):
- Nexa is a web messaging app (PWA) at www.nexaconnect.qd.je, hosted on Cloudflare Pages from GitHub (folder nexa/nexa). Backend: Firebase (Auth + Firestore). Server code: Cloudflare Pages Functions in functions/api/[fn].js → server/*.mjs (owner, support, jobs, team, ai, files, notify…).
- Front end: one big ES module app.js that renders HTML strings and "morphs" them into the page; actions are buttons with data-a="name" handled by an actions object; styles.css has the themes (Liquid Glass with data-lq="1", Smooth mode data-smooth="1" for slow devices, light/dark, festival looks for Diwali/Halloween/Christmas).
- Features: chats and groups with channels, @everyone and #channels, voice notes, video/photo sending, calls, events, memories/stories, profiles with banners and name styles, Nexa Team tick, games in chats, Nexa AI, notifications, invites, Face ID/passkey login.
- Team websites: /support/ (Nexa Support), /videoeditor/ (Nexa Studio), /webdev/ (this Dev Hub), /hiring/, /owner/.
- Known things to improve: speed on old/school laptops and phones, more games (a city builder is planned), chat themes per chat, stickers and a GIF maker, better voice notes (speed, transcripts), accessibility (keyboard and screen readers), loading time of big chats, offline support.
When asked what to improve, give a short prioritised list with why it matters and how to build it. When asked for code, give complete working code. When a change is for the existing app, say which file it belongs in and give the full new function or CSS block to paste.`;
const CODE_SYS = NEXA_FACTS + `\n\nYou are Nexa AI, an expert front-end developer building pages and widgets for Nexa, a messaging web app.
Write COMPLETE, WORKING code that runs as-is in one page (no build tools, no imports, no external libraries, no fetch to other sites).
Style: Nexa "liquid glass" — dark background with soft colour glows; glass panels use background: rgba(255,255,255,.08), backdrop-filter: blur(18px) saturate(170%), border: 1px solid rgba(255,255,255,.18), border-radius 20-28px, box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 20px 50px -20px rgba(0,0,0,.6); font-family: system-ui; text #F3F1EC; accent gradient #8C97FF → #FF8FB1; buttons are pills; smooth transitions with cubic-bezier(.22,1.3,.36,1). Must work on phones (responsive, no sideways scrolling) and be accessible (labels, contrast, keyboard).
Rules so it always works: every id/class the JS uses must exist in the HTML; put all JS in "js" (no inline onclick); no import/export, no top-level await, no external files or CDNs; wrap localStorage in try/catch; check elements exist before using them; no alert() or prompt(); make every button do something real. Before answering, run through the code in your head and fix any mistake.
Reply with ONLY a JSON object, no other text: {"title":"short name","html":"body HTML only (no <html>/<head>/<body>)","css":"all CSS","js":"all JavaScript (plain, runs after the HTML)","notes":"1-3 short sentences on what it does"}`;
const VIDEO_SYS = `You are Nexa AI inside Nexa Studio, a video editor for Nexa (a messaging app for friends and groups; blue glass logo, liquid-glass look). Plan a short, fun, entertaining vertical video for TikTok/Reels/Shorts that young people would watch to the end: a strong hook in the first second, fast scenes, humour or relatable moments, and a clear call to action at the end.
Scene types ("bg"): list (a glass card with items ticking in; "text" = heading, "sub" = items split with |; great for feature lists), kinetic (big words punching in one by one: best for hooks), meme (top + bottom meme text with an emoji: "text" = top line, "sub" = bottom line), emoji (emoji rain; put 3-6 emojis in "emoji"), countdown (3-2-1 then "text"), confetti (celebration), phone (a phone showing Nexa chat with a notification; "sub" = the notification text), chat (Nexa chat bubbles), spot (spotlights for a reveal), aurora, glass, waves, grid (calm backgrounds), logo (Nexa logo), stock (a real video clip; give search words).
Reply with ONLY a JSON object: {"title":"","caption":"post caption with 3-6 hashtags","music":"hype|chill|lofi|epic","transition":"zoom|slide|whip|flash|fade","captions":"pop","search":["2-4 short stock video search words"],"scenes":[{"text":"on-screen words (max 7 words)","sub":"optional small line","bg":"one of the types","emoji":"optional emojis","sticker":"optional one emoji sticker","dur":2.5}]}
Use 5-8 scenes, 1.2-3.5 seconds each. Start with kinetic, meme or countdown. End with logo or kinetic saying "Try Nexa".`;
function parseJSON(t) { const s = String(t || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b <= a) return null; try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; } }
function codeFrom(t) {
  const j = parseJSON(t); if (j && (j.html || j.js || j.css)) return { title: clip(j.title, 80), html: String(j.html || ''), css: String(j.css || ''), js: String(j.js || ''), notes: clip(j.notes, 600) };
  const f = lang => { const m = String(t).match(new RegExp('```' + lang + '\\s*\\n([\\s\\S]*?)```', 'i')); return m ? m[1] : ''; };
  const html = f('html'), css = f('css'), js = f('(?:js|javascript)'); if (html || css || js) return { title: '', html: html.replace(/^[\s\S]*<body[^>]*>|<\/body>[\s\S]*$/gi, ''), css, js, notes: '' };
  return null;
}

export default async (req) => {
  if (req.method === 'GET') { // stream a stock video/photo through Nexa, so the editor can use it (same website = no CORS problems)
    const u = new URL(req.url), src = u.searchParams.get('stock') || '', site = u.searchParams.get('site') || '';
    try { init(); } catch { return new Response('no', { status: 500 }); }
    const sec = (await admin.firestore().doc('teamSites/' + site).get()).data() || {}; const s = sec.sessionKey && unsign(u.searchParams.get('session'), sec.sessionKey);
    if (!s || s.site !== site || s.exp < Date.now() || !STOCK_HOSTS.test(src)) return new Response('Not allowed', { status: 403 });
    const r = await fetch(src, { headers: req.headers.get('range') ? { range: req.headers.get('range') } : {} });
    const h = new Headers(); for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges']) { const v = r.headers.get(k); if (v) h.set(k, v); } h.set('cache-control', 'private, max-age=3600');
    return new Response(r.body, { status: r.status, headers: h });
  }
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try { init(); } catch { return json({ error: 'Server not configured' }, 500); }
  let body = {}; try { body = await req.json(); } catch {}
  const site = String(body.site || ''), S = SITES[site]; if (!S) return json({ error: 'Unknown website' }, 400);
  const db = admin.firestore(), ref = db.doc('teamSites/' + site), now = Date.now();
  let sec = (await ref.get()).data() || {};
  if (!sec.sessionKey) { sec.sessionKey = crypto.randomBytes(32).toString('hex'); await ref.set({ sessionKey: sec.sessionKey }, { merge: true }); }
  const members = sec.members || {};
  const list = () => Object.entries(members).filter(([, m]) => !m.removed).map(([id, m]) => ({ id, name: m.name, role: m.role || S.role, online: now - (m.seen || 0) < 3 * 60e3 }));

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
    const out = { me: { id: s.id, name: me.name, role: me.role || S.role }, team: list() };
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
  // ---------- Dev Hub builds: code → testers → owner adds it to the real Nexa
  if (site === 'devhub' && body.action === 'buildSave') {
    const x = body.item || {}, isNew = !x.id; if (!isNew && !ID.test(String(x.id))) return json({ error: 'Bad build' }, 400);
    const html = String(x.html || ''), css = String(x.css || ''), js = String(x.js || '');
    const files = (Array.isArray(x.files) ? x.files : []).slice(0, 20).map(f => ({ path: clip(f.path, 160).replace(/^\/+/, '').replace(/\.\.+/g, '.'), code: String(f.code || ''), how: clip(f.how, 1200), mode: ['new', 'replace', 'add', 'snippet'].includes(f.mode) ? f.mode : 'snippet' })).filter(f => f.path && f.code);
    if (html.length + css.length + js.length + files.reduce((a, f) => a + f.code.length, 0) > 400000) return json({ error: 'That’s too much code for one build (400 KB max).' }, 400);
    const old = isNew ? null : (await col('build').doc(x.id).get()).data(); if (!isNew && !old) return json({ error: 'Not found' }, 404);
    if (old && ['testing', 'verified', 'shipped'].includes(old.status) && !body.send) return json({ error: 'This build is being tested. Make a new version to change it.' }, 409);
    const d = { title: clip(x.title, 100) || 'Untitled build', html, css, js, files, kind: files.length && !html && !js ? 'change' : 'page', notes: clip(x.notes, 2000), taskId: ID.test(String(x.taskId || '')) ? x.taskId : '', updatedAt: now, updatedBy: me.name };
    if (body.send) Object.assign(d, { status: 'testing', sentAt: now, version: (old?.version || 0) + 1 });
    if (isNew) { const r = col('build').doc(); await r.set({ ...d, status: d.status || 'draft', version: d.version || 1, ...who, at: now, issues: [], tests: [] }); return ok({ id: r.id }); }
    if (!body.send) d.status = old.status === 'issues' ? 'issues' : 'draft';
    await col('build').doc(x.id).update(d); return ok({ id: x.id });
  }
  if (site === 'devhub' && body.action === 'buildTest') {
    if ((me.role || S.role) !== 'tester') return json({ error: 'Only testers can approve or send back builds.' }, 403);
    if (!ID.test(String(body.id || ''))) return json({ error: 'Bad build' }, 400);
    const br = col('build').doc(body.id), b = (await br.get()).data(); if (!b) return json({ error: 'Not found' }, 404);
    if (b.status !== 'testing') return json({ error: 'This build isn’t waiting for a test.' }, 409);
    const okd = !!body.ok, note = clip(body.note, 3000).trim(); if (!okd && note.length < 5) return json({ error: 'Write what’s wrong, so it can be fixed.' }, 400);
    const checks = (Array.isArray(body.checks) ? body.checks : []).map(c => clip(c, 60)).slice(0, 10), device = clip(body.device, 200), shot = ID.test(String(body.shot || '')) ? body.shot : '';
    const tests = [...(b.tests || []), { ...who, ok: okd, note, at: now, version: b.version || 1, checks, device, shot }].slice(-40);
    const issues = okd ? (b.issues || []) : [...(b.issues || []), { ...who, text: note, at: now, version: b.version || 1, device, shot }].slice(-40);
    await br.update({ status: okd ? 'verified' : 'issues', tests, issues, testedAt: now, testedBy: me.name }); return ok({ done: true });
  }
  if (site === 'devhub' && body.action === 'aiCode') {
    if (body.mode === 'change') { // add a feature to the real Nexa: AI writes the exact code for the files
      const sys = NEXA_FACTS + `\n\nYou are Nexa AI, a senior developer adding a feature to the existing Nexa codebase. You get the user's request and parts of a real file.
Write code that fits the existing style (app.js: functions are overridden by wrapping, e.g. const _old = vChat; vChat = function (...a) { ... }; buttons use data-a="name" and actions.name = d => {...}; styles.css uses plain CSS; keep everything working).
Prefer ADDING new code at the end of a file (mode "add") over editing existing lines. Use mode "new" for a brand-new file, "replace" only when you give the full new version of a whole function (say which one in "how").
Rules so it always works: no build tools, no new libraries, check elements exist, keep old features working.
Reply with ONLY a JSON object: {"title":"short name","notes":"what it does and how to test it (2-4 sentences)","files":[{"path":"app.js","mode":"add|new|replace","how":"where it goes, e.g. paste at the very end of app.js","code":"the code"}]}`;
      const prompt = `Request: ${clip(body.prompt, 3000)}\nFile: ${clip(body.path, 160)}\n${body.excerpt ? 'Relevant part of the file (line numbers on the left):\n' + clip(body.excerpt, 40000) : ''}${body.outline ? '\nFile outline:\n' + clip(body.outline, 8000) : ''}`;
      try { const out = await gemini({ system: sys, prompt, maxTokens: 8000, code: true }); const j = parseJSON(out.text);
        const files = j && Array.isArray(j.files) ? j.files.filter(f => f && f.code).slice(0, 8).map(f => ({ path: clip(f.path || body.path, 160), mode: ['new', 'replace', 'add'].includes(f.mode) ? f.mode : 'add', how: clip(f.how, 800), code: String(f.code) })) : [];
        if (!files.length) { const c = codeFrom(out.text); if (c && (c.js || c.css || c.html)) files.push({ path: body.path || 'app.js', mode: 'add', how: 'Paste at the end of the file', code: c.js || c.css || c.html }); }
        if (!files.length) return json({ error: 'Nexa AI didn’t send code. Try asking more exactly.' }, 422);
        return ok({ change: { title: clip(j?.title, 80) || clip(body.prompt, 60), notes: clip(j?.notes, 1000), files } });
      } catch (e) { return json({ error: e.message, code: e.code }, e.status || 502); }
    }
    const mode = body.mode === 'fix' ? 'fix' : 'make', cur = body.code || {};
    const prompt = mode === 'fix'
      ? `Fix this Nexa build so it fully works. Keep what already works and the liquid-glass style.\nProblems to fix:\n${clip(body.issues, 4000) || '(find and fix any bugs)'}\n${body.errors ? 'Errors from the browser console:\n' + clip(body.errors, 2000) + '\n' : ''}\nCurrent HTML:\n${clip(cur.html, 30000)}\nCurrent CSS:\n${clip(cur.css, 30000)}\nCurrent JS:\n${clip(cur.js, 30000)}`
      : `Build this for Nexa: ${clip(body.prompt, 4000)}`;
    try {
      let out = await gemini({ system: CODE_SYS, prompt, maxTokens: 8000, code: true }), code = codeFrom(out.text);
      if (!code) { out = await gemini({ system: CODE_SYS, prompt: prompt + '\n\nRemember: reply with ONLY the JSON object.', maxTokens: 8000, code: true }); code = codeFrom(out.text); }
      if (!code) return json({ error: 'Nexa AI didn’t send back code. Try asking in a different way.' }, 422);
      return ok({ code });
    } catch (e) { return json({ error: e.message, code: e.code }, e.status || 502); }
  }
  if (site === 'devhub' && body.action === 'aiIdeas') {
    try {
      const out = await gemini({ system: NEXA_FACTS + '\nReply with ONLY a JSON object: {"ideas":[{"title":"short task title","why":"why it matters (1 sentence)","how":"how to build it (2-3 sentences)","prio":"high|normal|low"}]} with 5-8 ideas, most important first.', prompt: 'What should the Nexa web team improve next?' + (body.focus ? ' Focus on: ' + clip(body.focus, 500) : ''), maxTokens: 2500 });
      const j = parseJSON(out.text); if (!j || !Array.isArray(j.ideas)) return json({ error: 'Nexa AI didn’t send ideas. Try again.' }, 422);
      return ok({ ideas: j.ideas.slice(0, 10).map(x => ({ title: clip(x.title, 120), why: clip(x.why, 400), how: clip(x.how, 800), prio: ['high', 'normal', 'low'].includes(x.prio) ? x.prio : 'normal' })) });
    } catch (e) { return json({ error: e.message, code: e.code }, e.status || 502); }
  }
  if (site === 'studio' && body.action === 'aiVideo') {
    try {
      const out = await gemini({ system: VIDEO_SYS, prompt: 'Make a video about: ' + clip(body.prompt, 2000), maxTokens: 2500 }); const j = parseJSON(out.text);
      if (!j || !Array.isArray(j.scenes) || !j.scenes.length) return json({ error: 'Nexa AI didn’t send a plan. Try again.' }, 422);
      const BGS = ['list', 'kinetic', 'meme', 'emoji', 'countdown', 'confetti', 'phone', 'chat', 'spot', 'aurora', 'glass', 'waves', 'grid', 'logo', 'stock'];
      return ok({ plan: { title: clip(j.title, 80), caption: clip(j.caption, 600), music: ['hype', 'chill', 'lofi', 'epic'].includes(j.music) ? j.music : 'hype', transition: ['zoom', 'slide', 'whip', 'flash', 'fade'].includes(j.transition) ? j.transition : 'zoom', captions: 'pop', search: (Array.isArray(j.search) ? j.search : []).map(x => clip(x, 40)).slice(0, 4), scenes: j.scenes.slice(0, 9).map(x => ({ text: clip(x.text, 70), sub: clip(x.sub, 90), emoji: clip(x.emoji, 40), sticker: clip(x.sticker, 8), bg: BGS.includes(x.bg) ? x.bg : 'kinetic', dur: Math.max(1.2, Math.min(6, +x.dur || 2.5)) })) } });
    } catch (e) { return json({ error: e.message, code: e.code }, e.status || 502); }
  }
  if (site === 'studio' && body.action === 'stock') {
    try { return ok({ list: await stockSearch(clip(body.q, 80) || 'city', body.kind === 'photo' ? 'photo' : 'video') }); }
    catch (e) { return json({ error: e.message, code: e.code }, e.code === 'nokey' ? 503 : 502); }
  }
  // Nexa AI for the team
  if (body.action === 'ai') {
    const sys = site === 'studio'
      ? 'You are Nexa AI inside Nexa Studio, helping the Nexa designers and video creators. Nexa is a messaging app for friends, groups and communities (liquid-glass look, blue glass logo with sky and mountains). Help with video ideas, scripts, hooks, captions, hashtags, titles, posting plans and design feedback. Be short, friendly and practical. Use simple words.'
      : 'You are Nexa AI inside Nexa Dev Hub, helping the Nexa web developers. Help with code, bugs, reviews, what to improve and task plans. Give correct, complete answers; put code in fenced code blocks with the language (```html, ```css, ```js) and say which file it goes in. Use simple words.\n' + NEXA_FACTS;
    try { const out = await gemini({ system: sys, contents: Array.isArray(body.contents) ? body.contents : null, prompt: clip(body.prompt, 12000), maxTokens: site === 'devhub' ? 4000 : 1400 }); return ok({ text: out.text }); }
    catch (e) { return json({ error: e.message, code: e.code }, e.status || 502); }
  }
  return json({ error: 'Unknown action' }, 400);
};
