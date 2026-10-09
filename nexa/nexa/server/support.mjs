// Nexa Support — the server side of /support (the Nexa Support app for the support team).
// No email sign-in: people pick their own name (Shiv, Arrick, Yaseen)
// and type their own password (starts as "nexaofficial" — change it in Settings).
// Agents can read & answer help chats as @support, see flagged (offensive) messages and reports,
// warn, ban/unban, and message anyone (with or without letting them reply).
import admin from './fbadmin.js';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { deliver, sendAs, warnUser, setReply, startStaffChat, ensureStaffHandle } from './owner.mjs';

const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || 'nexaconnectofficial@gmail.com').toLowerCase();
const AGENTS = [{ id: 'shiv', name: 'Shiv' }, { id: 'arrick', name: 'Arrick' }, { id: 'yaseen', name: 'Yaseen' }];
const DEFAULT_PASSWORD = 'nexaofficial';
const DEFAULT_AUTO_REPLY = 'Thank you for reaching out to Nexa Support. The next Nexa Support agent will get back to you soon! Thank you for choosing Nexa 💙';
const DOC = 'supportSecrets/main'; // no Firestore rule lets app users read this
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const ms = v => !v ? 0 : typeof v === 'number' ? v : v.toMillis ? v.toMillis() : Date.parse(v) || 0;

function init() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
// fast PBKDF2 (fits Cloudflare's free CPU limit). Records from the old Netlify server (scrypt, no v:2) only accept the starting password once, then must be changed.
const hash = (pw, salt) => crypto.pbkdf2Sync(String(pw), salt, 3000, 32, 'sha256').toString('hex');
const pwOk = (pw, a) => { if (!a || !a.hash) return false; if (a.v !== 2) return String(pw) === DEFAULT_PASSWORD; const x = Buffer.from(hash(pw, a.salt), 'hex'), y = Buffer.from(a.hash, 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const sign = (data, key) => { const p = Buffer.from(JSON.stringify(data)).toString('base64url'); return p + '.' + crypto.createHmac('sha256', key).update(p).digest('base64url'); };
const unsign = (tok, key) => { const [p, s] = String(tok || '').split('.'); if (!p || !s) return null; const want = crypto.createHmac('sha256', key).update(p).digest('base64url'); if (want.length !== s.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(s))) return null; try { return JSON.parse(Buffer.from(p, 'base64url').toString()); } catch { return null; } };
const ID = /^[\w-]{1,200}$/;

async function userInfo(db, ids) {
  const out = {};
  await Promise.all([...new Set(ids.filter(Boolean))].map(async u => { const p = (await db.doc('users/' + u).get()).data() || {}; out[u] = { id: u, name: p.name || 'Nexa user', handle: p.handle || '', avatar: typeof p.avatar === 'string' && p.avatar.length < 60000 ? p.avatar : '', online: Date.now() - ms(p.lastSeen) < 3 * 60e3 }; }));
  return out;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try { init(); } catch (e) { return json({ error: 'Server not configured: ' + e.message }, 500); }
  const db = admin.firestore();
  // No email sign-in: people open /support, pick their name and type their own password.
  // The server works as the shared Nexa Support account (it's created automatically the first time).
  let tokUid = '';
  const m = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/);
  if (m) { try { const t = await admin.auth().verifyIdToken(m[1]); if ((t.email || '').toLowerCase() === SUPPORT_EMAIL) tokUid = t.uid; } catch {} }
  let body = {}; try { body = await req.json(); } catch {}
  const ref = db.doc(DOC); const now = Date.now();
  let sec = (await ref.get()).data();
  // which Nexa account answers as Nexa Support
  let me = (process.env.SUPPORT_UID || '').trim() || (sec && sec.uid) || tokUid;
  if (!me) {
    try { me = (await admin.auth().getUserByEmail(SUPPORT_EMAIL)).uid; }
    catch { me = (await admin.auth().createUser({ email: SUPPORT_EMAIL, emailVerified: true, password: crypto.randomBytes(24).toString('base64url'), displayName: 'Nexa Support' })).uid; }
  }
  if (!sec || !sec.sessionKey) {
    // first time: everyone starts with the same password; each person changes theirs in Settings
    const agents = {}; AGENTS.forEach(a => { const salt = crypto.randomBytes(16).toString('hex'); agents[a.id] = { salt, hash: hash(DEFAULT_PASSWORD, salt), changed: 0, v: 2 }; });
    sec = { sessionKey: crypto.randomBytes(32).toString('hex'), agents, devices: {}, uid: me, createdAt: now };
    await ref.set(sec);
  }
  if (sec.uid !== me) await ref.update({ uid: me });

  if (body.action === 'status') {
    const link = await ensureStaffHandle(db, me, 'support', 'Nexa Support', 'Official Nexa Support — message us any time.');
    // the Nexa Support photo is always the Nexa logo
    try { const logo = new URL('/icon-512-v4.png', req.url).href; const p = (await db.doc('users/' + me).get()).data() || {}; if (p.avatar !== logo) await db.doc('users/' + me).update({ avatar: logo }); } catch {}
    return json({ version: 1, agents: AGENTS.map(a => ({ ...a, changed: !!(sec.agents[a.id] || {}).changed, locked: ((sec.agents[a.id] || {}).lockUntil || 0) > now })), link });
  }
  if (body.action === 'login') {
    const a = AGENTS.find(x => x.id === body.agent); if (!a) return json({ error: 'Pick your name' }, 400);
    const rec = sec.agents[a.id] || {};
    if ((rec.lockUntil || 0) > now) return json({ error: 'Too many wrong tries. Try again in a few minutes.' }, 429);
    if (!pwOk(body.password, rec)) {
      const fails = (rec.fails || 0) + 1, lock = fails >= 5 ? now + 15 * 60e3 : 0;
      await ref.update({ [`agents.${a.id}.fails`]: lock ? 0 : fails, [`agents.${a.id}.lockUntil`]: lock });
      return json({ error: lock ? 'Too many wrong tries — locked for 15 minutes.' : `Wrong password. ${5 - fails} ${5 - fails === 1 ? 'try' : 'tries'} left.` }, 401);
    }
    const legacy = rec.v !== 2, salt = legacy ? crypto.randomBytes(16).toString('hex') : '';
    await ref.update({ [`agents.${a.id}.fails`]: 0, [`agents.${a.id}.lockUntil`]: 0, [`agents.${a.id}.lastLogin`]: now, ...(legacy ? { [`agents.${a.id}.salt`]: salt, [`agents.${a.id}.hash`]: hash(DEFAULT_PASSWORD, salt), [`agents.${a.id}.v`]: 2, [`agents.${a.id}.changed`]: 0 } : {}) });
    return json({ session: sign({ agent: a.id, uid: me, iat: now, exp: now + 12 * 3600e3 }, sec.sessionKey), agent: a, mustChange: legacy || !rec.changed });
  }

  // ---------- everything below needs a signed-in agent
  const s = unsign(body.session, sec.sessionKey);
  if (!s || s.uid !== me || s.exp < now || (sec.sessionsFrom || 0) > (s.iat || 0)) return json({ error: 'session', message: 'Please sign in again.' }, 401);
  const agent = AGENTS.find(x => x.id === s.agent); if (!agent) return json({ error: 'session' }, 401);
  const fresh = sign({ ...s, exp: now + 12 * 3600e3 }, sec.sessionKey);
  const ok = o => json({ ...o, session: fresh, agent });
  const myConv = async cid => { if (!ID.test(String(cid || ''))) return null; const c = (await db.doc('conversations/' + cid).get()).data(); return c && (c.members || []).includes(me) ? c : null; };
  const uidOk = u => /^[\w-]{1,128}$/.test(String(u || '')) && u !== me;

  if (body.action === 'dashboard') {
    const [qs, flags, reports, bans] = await Promise.all([
      db.collection('conversations').where('members', 'array-contains', me).get(),
      db.collection('flags').where('status', '==', 'open').get().catch(() => ({ docs: [] })),
      db.collection('reports').orderBy('at', 'desc').limit(100).get().catch(() => ({ docs: [] })),
      db.collection('bans').get()
    ]);
    const convs = qs.docs.map(x => ({ id: x.id, ...x.data() })).filter(c => c.type === 'dm' && (c.last || c.help));
    const waiting = convs.filter(c => c.last && c.last.from && c.last.from !== me && (c.last.at || 0) > ((c.reads || {})[me] || 0)).length;
    const openReports = reports.docs.filter(d => !d.data().resolved).length;
    let users = null, online = null; try { users = (await db.collection('users').count().get()).data().count; } catch {}
    try { online = (await db.collection('users').where('lastSeen', '>=', now - 3 * 60e3).count().get()).data().count; } catch {}
    return ok({ stats: { waiting, chats: convs.length, flags: flags.docs.length, reports: openReports, bans: bans.size, users, online }, ui: { autoReply: sec.autoReply ?? DEFAULT_AUTO_REPLY } });
  }
  if (body.action === 'inbox') {
    const qs = await db.collection('conversations').where('members', 'array-contains', me).get();
    const convs = qs.docs.map(x => ({ id: x.id, ...x.data() })).filter(c => c.type === 'dm' && (c.last || c.help));
    const info = await userInfo(db, convs.map(c => (c.members || []).find(u => u !== me)));
    const bans = new Set((await db.collection('bans').get()).docs.map(b => b.id));
    const list = convs.map(c => { const u = (c.members || []).find(x => x !== me) || me, p = info[u] || {}, last = c.last || {}; return { id: c.id, uid: u, name: p.name, handle: p.handle, avatar: p.avatar, online: p.online, last: { text: String(last.text || '').slice(0, 140), from: last.from === me ? 'me' : 'them', at: last.at || c.createdAt || 0 }, unread: !!last.from && last.from !== me && (last.at || 0) > ((c.reads || {})[me] || 0), banned: bans.has(u), readOnly: (c.readOnlyFor || []).includes(u), claimed: c.claimedBy || '', asked: ['shiv', 'arrick', 'yaseen'].includes(c.askedFor) ? c.askedFor : '' }; }).sort((a, b) => b.last.at - a.last.at);
    return ok({ list, unread: list.filter(c => c.unread).length });
  }
  if (body.action === 'thread') {
    const c = await myConv(body.cid); if (!c) return json({ error: 'Chat not found' }, 404);
    const qs = await db.collection(`conversations/${body.cid}/messages`).orderBy('at', 'desc').limit(80).get();
    const msgs = qs.docs.map(x => { const m = x.data(); const imgs = (m.images || (m.image ? [m.image] : [])).filter(i => typeof i === 'string' && i.length < 600000).slice(0, 4); return { id: x.id, mine: m.from === me, agent: m.agent || '', at: m.at || 0, text: m.deleted ? '' : String(m.text || ''), label: m.deleted ? 'Message deleted' : m.text ? '' : (m.audio ? 'Voice message' : m.video ? 'Video' : imgs.length ? '' : m.sticker || m.stickerImg ? 'Sticker' : 'Message'), imgs: m.deleted ? [] : imgs, system: !!m.system }; }).reverse();
    if (c.last && c.last.from !== me) await db.doc('conversations/' + body.cid).update({ ['reads.' + me]: Math.max(now, (c.last.at || 0) + 1) }).catch(() => {});
    return ok({ msgs, typing: Object.entries(c.typing || {}).some(([u, t]) => u !== me && now - (t || 0) < 6000), readOnly: (c.readOnlyFor || []).length > 0, claimed: c.claimedBy || '' });
  }
  if (body.action === 'reply') {
    const c = await myConv(body.cid); if (!c) return json({ error: 'Chat not found' }, 404);
    const text = String(body.text || '').trim().slice(0, 4000); if (!text) return json({ error: 'Type a message first' }, 400);
    await sendAs(db, me, body.cid, c, text, req, { agent: agent.name, staff: 'support' });
    if (!c.claimedBy) await db.doc('conversations/' + body.cid).update({ claimedBy: agent.name }).catch(() => {});
    return ok({ sent: true });
  }
  if (body.action === 'setReply') {
    const c = await myConv(body.cid); if (!c) return json({ error: 'Chat not found' }, 404);
    await setReply(db, body.cid, c, me, !!body.allow); return ok({ done: true });
  }
  if (body.action === 'startChat') {
    if (!uidOk(body.uid)) return json({ error: 'Bad user' }, 400);
    const cid = await startStaffChat(db, me, body.uid, body.allowReply !== false);
    if (body.text) { const c = (await db.doc('conversations/' + cid).get()).data(); await sendAs(db, me, cid, c, String(body.text).trim().slice(0, 4000), req, { agent: agent.name, staff: 'support' }); }
    return ok({ cid });
  }
  if (body.action === 'search') {
    const q = String(body.q || '').trim().toLowerCase().replace(/^@/, ''); if (q.length < 1) return ok({ list: [] });
    const [a, b] = await Promise.all([
      db.collection('users').where('handleLower', '>=', q).where('handleLower', '<=', q + '').limit(10).get().catch(() => ({ docs: [] })),
      db.collection('users').where('nameLower', '>=', q).where('nameLower', '<=', q + '').limit(10).get().catch(() => ({ docs: [] }))
    ]);
    const seen = new Set(), bans = new Set((await db.collection('bans').get()).docs.map(x => x.id));
    const list = [...a.docs, ...b.docs].filter(d => !seen.has(d.id) && seen.add(d.id) && d.id !== me).map(d => { const p = d.data(); return { id: d.id, name: p.name || '', handle: p.handle || '', avatar: typeof p.avatar === 'string' && p.avatar.length < 60000 ? p.avatar : '', banned: bans.has(d.id), joined: ms(p.createdAt), lastSeen: ms(p.lastSeen) }; });
    return ok({ list });
  }
  if (body.action === 'flags') {
    const qs = await db.collection('flags').orderBy('at', 'desc').limit(150).get().catch(() => ({ docs: [] }));
    const list = qs.docs.map(d => ({ id: d.id, ...d.data() }));
    const info = await userInfo(db, list.map(f => f.from));
    const bans = new Set((await db.collection('bans').get()).docs.map(x => x.id));
    return ok({ list: list.map(f => ({ ...f, user: info[f.from] || {}, banned: bans.has(f.from) })) });
  }
  if (body.action === 'flagAction') {
    if (!ID.test(String(body.id || ''))) return json({ error: 'Bad flag' }, 400);
    const fr = db.doc('flags/' + body.id); const f = (await fr.get()).data(); if (!f) return json({ error: 'Not found' }, 404);
    const act = body.do;
    if (act === 'warn') await warnUser(db, f.from, body.reason || `Your message "${String(f.text || '').slice(0, 80)}" broke the Nexa rules. Please be respectful.`, me, agent.name + ' (Nexa Support)');
    if (act === 'ban') await db.doc('bans/' + f.from).set({ by: me, byName: agent.name, at: now, reason: String(body.reason || 'Offensive messages').slice(0, 200) });
    await fr.update({ status: act === 'reopen' ? 'open' : 'done', action: act, handledBy: agent.name, handledAt: now });
    return ok({ done: true });
  }
  if (body.action === 'reports') {
    const qs = await db.collection('reports').orderBy('at', 'desc').limit(150).get().catch(() => ({ docs: [] }));
    const list = qs.docs.map(d => ({ id: d.id, ...d.data() }));
    const info = await userInfo(db, list.flatMap(r => [r.reporter, r.target]));
    const bans = new Set((await db.collection('bans').get()).docs.map(x => x.id));
    return ok({ list: list.map(r => ({ id: r.id, at: ms(r.at), reason: r.reason || '', details: r.details || '', resolved: !!r.resolved, handledBy: r.handledBy || '', reporter: info[r.reporter] || {}, target: info[r.target] || { id: r.target }, banned: bans.has(r.target), msgText: r.excerpt || '' })) });
  }
  if (body.action === 'reportAction') {
    if (!ID.test(String(body.id || ''))) return json({ error: 'Bad report' }, 400);
    const rr = db.doc('reports/' + body.id); const r = (await rr.get()).data(); if (!r) return json({ error: 'Not found' }, 404);
    if (body.do === 'warn' && r.target) await warnUser(db, r.target, body.reason, me, agent.name + ' (Nexa Support)');
    if (body.do === 'ban' && r.target) await db.doc('bans/' + r.target).set({ by: me, byName: agent.name, at: now, reason: String(body.reason || r.reason || 'Reported').slice(0, 200) });
    await rr.update({ resolved: body.do !== 'reopen', handledBy: agent.name, handledAt: now, action: body.do });
    return ok({ done: true });
  }
  if (body.action === 'warn') { if (!uidOk(body.uid)) return json({ error: 'Bad user' }, 400); const n = await warnUser(db, body.uid, body.reason, me, agent.name + ' (Nexa Support)'); return ok({ n }); }
  if (body.action === 'ban' || body.action === 'unban') {
    if (!uidOk(body.uid)) return json({ error: 'Bad user' }, 400);
    if (body.action === 'ban') await db.doc('bans/' + body.uid).set({ by: me, byName: agent.name, at: now, reason: String(body.reason || '').slice(0, 200) });
    else await db.doc('bans/' + body.uid).delete();
    return ok({ done: true });
  }
  if (body.action === 'warnings') {
    if (!uidOk(body.uid)) return json({ error: 'Bad user' }, 400);
    const qs = await db.collection('warnings').where('to', '==', body.uid).get().catch(() => ({ docs: [] }));
    return ok({ list: qs.docs.map(d => d.data()).sort((a, b) => b.at - a.at) });
  }
  if (body.action === 'registerDevice') {
    const t = String(body.token || ''); if (!/^[\w:-]{20,400}$/.test(t)) return json({ error: 'Bad token' }, 400);
    const devs = { ...(sec.devices || {}) }; devs[t] = { agent: agent.id, at: now };
    const keys = Object.keys(devs).sort((a, b) => devs[b].at - devs[a].at).slice(0, 30); const out = {}; keys.forEach(k => out[k] = devs[k]);
    await ref.update({ devices: out }); return ok({ done: true });
  }
  if (body.action === 'unregisterDevice') { const devs = { ...(sec.devices || {}) }; delete devs[String(body.token || '')]; await ref.update({ devices: devs }); return ok({ done: true }); }
  if (body.action === 'changePassword') {
    if (!pwOk(body.old, sec.agents[agent.id])) return json({ error: 'Your current password is wrong.' }, 401);
    const pw = String(body.password || ''); if (pw.length < 6) return json({ error: 'Use at least 6 characters.' }, 400);
    const salt = crypto.randomBytes(16).toString('hex');
    await ref.update({ [`agents.${agent.id}.salt`]: salt, [`agents.${agent.id}.hash`]: hash(pw, salt), [`agents.${agent.id}.changed`]: now, [`agents.${agent.id}.v`]: 2 });
    return ok({ done: true });
  }
  if (body.action === 'autoReply') { await ref.update({ autoReply: String(body.text || '').slice(0, 300) }); return ok({ done: true }); }
  // finished helping someone: delete the whole chat (for them too) so nothing piles up
  if (body.action === 'deleteChat') {
    const c = await myConv(body.cid); if (!c) return json({ error: 'Chat not found' }, 404);
    const base = db.doc('conversations/' + body.cid);
    for (const sub of ['messages', 'meta', 'board']) {
      for (;;) { const qs = await base.collection(sub).limit(400).get(); if (qs.empty) break; const b = db.batch(); qs.docs.forEach(d => b.delete(d.ref)); await b.commit(); if (qs.size < 400) break; }
    }
    await base.delete();
    return ok({ deleted: true });
  }
  // who's on the newest Nexa and who isn't
  if (body.action === 'versions') {
    const qs = await db.collection('users').orderBy('lastSeen', 'desc').limit(400).get();
    const list = qs.docs.filter(d => d.id !== me && !d.data().staff && !d.data().deleted).map(d => { const p = d.data(); return { id: d.id, name: p.name || 'Nexa user', handle: p.handle || '', avatar: typeof p.avatar === 'string' && p.avatar.length < 6000 ? p.avatar : '', version: String(p.appVersion || ''), versionAt: ms(p.appVersionAt), lastSeen: ms(p.lastSeen), asked: ms(p.updateAskedAt) }; });
    return ok({ list });
  }
  // nudge people to update: a notification + a push to their phone/computer
  if (body.action === 'askUpdate') {
    const ids = [...new Set((Array.isArray(body.uids) ? body.uids : []).filter(uidOk))].slice(0, 400);
    const v = String(body.version || '').slice(0, 12);
    let n = 0;
    for (const u of ids) {
      try {
        const nd = await db.collection('notifications').add({ to: u, from: me, type: 'update_ask', title: '🚀 Update Nexa', body: `A new version of Nexa${v ? ' (v' + v + ')' : ''} is ready — open Nexa and tap Update now.`, at: now, read: false });
        await db.doc('users/' + u).update({ updateAskedAt: now }).catch(() => {});
        await deliver(db, u, { kind: 'notification', title: '🚀 Update Nexa', body: 'A new version of Nexa is ready — open Nexa and tap Update now.', page: 'notifications', tag: 'upd_' + nd.id }, 86400).catch(() => 0);
        n++;
      } catch {}
    }
    return ok({ asked: n });
  }
  if (body.action === 'logoutAll') { await ref.update({ sessionsFrom: now + 1 }); return json({ done: true }); }
  return json({ error: 'Unknown action' }, 400);
};
