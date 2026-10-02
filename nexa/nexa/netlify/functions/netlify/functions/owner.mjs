// Nexa owner console — the server side of nexaconnect-chat.netlify.app/owner
// Locked three ways: (1) signed in as OWNER_EMAIL with a verified email, (2) the owner PIN,
// (3) a 6-digit code from an authenticator app (2-step verification). 5 wrong tries = locked for 15 minutes.
// Shows how many people use Nexa and who they are (name, @username, email) — never passwords.
import admin from 'firebase-admin';
import crypto from 'node:crypto';

const OWNER_EMAIL = 'etihadairways1028@gmail.com';
const PERSONAL_HANDLE = 'shiv';   // your everyday Nexa account — sign-in codes can be sent here
const SECRET_DOC = 'ownerSecrets/main';           // no Firestore rule allows clients to read this
const UI_DOC = 'ownerSecrets/ui';                 // your owner-page settings (background, auto-reply…)
const OWNER_HANDLE = 'owner';
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function init() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const ms = v => !v ? 0 : typeof v === 'number' ? v : v.toMillis ? v.toMillis() : Date.parse(v) || 0;

// ---- 2-step verification codes (TOTP, the same kind Google Authenticator uses)
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32enc = buf => { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)]; return out; };
const b32dec = s => { let bits = ''; for (const c of s.replace(/=+$/, '').toUpperCase()) { const v = B32.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, '0'); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
function totp(secret, step) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', b32dec(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
const codeOk = (secret, code) => { const c = String(code || '').replace(/\D/g, ''); if (c.length !== 6) return false; const s = Math.floor(Date.now() / 30000); return [-1, 0, 1].some(d => crypto.timingSafeEqual(Buffer.from(totp(secret, s + d)), Buffer.from(c))); };
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
const pinOk = (pin, sec) => { const a = Buffer.from(hashPin(pin, sec.salt), 'hex'), b = Buffer.from(sec.pinHash || '', 'hex'); return a.length === b.length && crypto.timingSafeEqual(a, b); };
// ---- short sessions (30 minutes) so you don't type codes on every refresh
const sign = (data, key) => { const p = Buffer.from(JSON.stringify(data)).toString('base64url'); return p + '.' + crypto.createHmac('sha256', key).update(p).digest('base64url'); };
const unsign = (tok, key) => { const [p, s] = String(tok || '').split('.'); if (!p || !s) return null; const want = crypto.createHmac('sha256', key).update(p).digest('base64url'); if (want.length !== s.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(s))) return null; try { return JSON.parse(Buffer.from(p, 'base64url').toString()); } catch { return null; } };


const uiOut = u => ({ bg: u.bg || 'sky', dim: u.dim ?? 30, forward: u.forward !== false, autoReply: u.autoReply || '' });
const label = m => m.video ? 'Video' : m.audio ? 'Voice message' : m.stickerImg || m.sticker ? 'Sticker' : m.gif ? 'GIF' : (m.images && m.images.length > 1) ? `${m.images.length} photos` : (m.images || m.image) ? 'Photo' : m.poll ? 'Poll: ' + (m.poll.q || '') : m.game ? 'Sent a game' : m.live ? 'Live location' : m.theme ? 'Chat theme' : m.todo ? 'To-do list' : 'Message';

// Makes sure @owner always points at this account, so "Message the owner" in Nexa reaches you.
export async function ensureOwnerHandle(db, uid) {
  const out = { handle: OWNER_HANDLE, ok: true, fixed: [] };
  const [h, p] = await Promise.all([db.doc('handles/' + OWNER_HANDLE).get(), db.doc('users/' + uid).get()]);
  if (!h.exists || h.data().uid !== uid) { await db.doc('handles/' + OWNER_HANDLE).set({ uid }); out.fixed.push('@owner now points to this account'); }
  const prof = p.data();
  if (!prof) {
    await db.doc('users/' + uid).set({ name: 'Nexa Owner', nameLower: 'nexa owner', handle: OWNER_HANDLE, handleLower: OWNER_HANDLE, bio: 'The owner of Nexa — message me if you need help.', avatar: '', status: 'online', createdAt: Date.now(), lastSeen: Date.now(), showOnline: true, receipts: true, typingOn: true, discoverable: true, allowRequests: 'everyone' });
    out.fixed.push('created the @owner profile');
  } else if ((prof.handleLower || '') !== OWNER_HANDLE) {
    if (prof.handleLower) { const old = await db.doc('handles/' + prof.handleLower).get(); if (old.exists && old.data().uid === uid) await db.doc('handles/' + prof.handleLower).delete(); }
    await db.doc('users/' + uid).update({ handle: OWNER_HANDLE, handleLower: OWNER_HANDLE });
    out.fixed.push('changed this account\'s username from @' + (prof.handle || '?') + ' to @owner');
  }
  if (prof && prof.allowMessages === 'friends') { await db.doc('users/' + uid).update({ allowMessages: 'everyone' }); out.fixed.push('turned on messages from everyone'); }
  out.name = (prof && prof.name) || 'Nexa Owner';
  return out;
}

export async function deliver(db, uid, data, ttl) {
  const pdoc = db.doc(`users/${uid}/private/push`);
  const push = (await pdoc.get()).data() || {};
  const tokens = [...new Set([...Object.values(push.devices || {}), ...(push.tokens || [])])].filter(t => typeof t === 'string' && t).slice(0, 20);
  if (!tokens.length) return 0;
  const res = await admin.messaging().sendEachForMulticast({ tokens, data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])), webpush: { headers: { Urgency: 'high', TTL: String(ttl) } } });
  return res.successCount;
}

// Send a chat message as the owner account (used by replies from the owner page and auto-replies).
export async function sendAs(db, me, cid, conv, text, req) {
  const at = Date.now();
  const ref = await db.collection(`conversations/${cid}/messages`).add({ from: me, at, text });
  await db.doc('conversations/' + cid).update({ last: { text: text.slice(0, 140), from: me, at, exp: 0 }, ['reads.' + me]: at, ['typing.' + me]: 0 });
  const prof = (await db.doc('users/' + me).get()).data() || {};
  await Promise.all((conv.members || []).filter(u => u !== me).map(async u => {
    const prefs = (await db.doc(`users/${u}/private/prefs`).get()).data() || {};
    if (prefs.deviceNotifs === false || (prefs.muted || {})[cid]) return;
    await deliver(db, u, { kind: 'message', title: prof.name || 'Nexa Owner', body: prefs.pushPreview === false ? 'New message' : text.slice(0, 140), chat: cid, tag: 'c_' + cid, msg: ref.id }, 86400).catch(() => 0);
  }));
  return ref.id;
}

async function dashboard(db) {
  const accounts = {};
  let page;
  do {
    page = await admin.auth().listUsers(1000, page && page.pageToken);
    for (const u of page.users) accounts[u.uid] = { email: u.email || '', verified: !!u.emailVerified, created: ms(u.metadata && u.metadata.creationTime), lastSignIn: ms(u.metadata && u.metadata.lastSignInTime), disabled: !!u.disabled };
  } while (page.pageToken && Object.keys(accounts).length < 20000);
  const profiles = {};
  (await db.collection('users').get()).forEach(d => { const p = d.data() || {}; profiles[d.id] = { name: p.name || '', handle: p.handle || '', lastSeen: ms(p.lastSeen), createdAt: ms(p.createdAt), deleted: !!p.deleted, bio: p.bio || '', ref: typeof p.ref === 'string' ? p.ref : '' }; });
  const ids = [...new Set([...Object.keys(accounts), ...Object.keys(profiles)])];
  const users = ids.map(id => { const ac = accounts[id] || {}, pr = profiles[id] || {}; return { id, name: pr.name || '', handle: pr.handle || '', email: ac.email || '', verified: !!ac.verified, joined: pr.createdAt || ac.created || 0, lastActive: Math.max(pr.lastSeen || 0, ac.lastSignIn || 0), finishedSignup: !!profiles[id], deleted: !!pr.deleted, ref: pr.ref || '' }; }).sort((x, y) => y.joined - x.joined);
  const now = Date.now(), day = 864e5;
  const count = async q => { try { return (await q.count().get()).data().count; } catch { return null; } };
  const [chats, groups, messages, events, moments, reports, bans, friendships] = await Promise.all([
    count(db.collection('conversations')), count(db.collection('conversations').where('type', '==', 'group')), count(db.collectionGroup('messages')),
    count(db.collection('events')), count(db.collection('moments')), count(db.collection('reports')), count(db.collection('bans')), count(db.collection('friendships'))
  ]);
  const signups = Array.from({ length: 30 }, (_, i) => { const st = new Date(now - (29 - i) * day); st.setHours(0, 0, 0, 0); const s = +st, e = s + day; return { day: s, n: users.filter(u => u.joined >= s && u.joined < e).length, active: users.filter(u => u.lastActive >= s && u.lastActive < e).length }; });
  return {
    stats: { users: users.filter(u => !u.deleted).length, unfinished: users.filter(u => !u.finishedSignup).length, new24h: users.filter(u => now - u.joined < day).length, new7d: users.filter(u => now - u.joined < 7 * day).length, active24h: users.filter(u => now - u.lastActive < day).length, active7d: users.filter(u => now - u.lastActive < 7 * day).length, onlineNow: users.filter(u => now - u.lastActive < 3 * 60e3).length, chats, groups, messages, events, moments, reports, bans, friendships },
    signups, users, at: now,
    inviters: Object.entries(users.reduce((o, u) => { if (u.ref) o[u.ref] = (o[u.ref] || 0) + 1; return o; }, {})).map(([id, n]) => { const u = users.find(x => x.id === id) || {}; return { id, n, name: u.name || 'Nexa user', handle: u.handle || '' }; }).sort((a, b) => b.n - a.n).slice(0, 10)
  };
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try { init(); } catch (e) { return json({ error: 'Server not configured: ' + e.message }, 500); }
  const db = admin.firestore();
  const m = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/);
  if (!m) return json({ error: 'Not signed in' }, 401);
  let tok; try { tok = await admin.auth().verifyIdToken(m[1]); } catch { return json({ error: 'Not signed in' }, 401); }
  if ((tok.email || '').toLowerCase() !== OWNER_EMAIL) return json({ error: 'This page is only for the owner of Nexa.' }, 403);
  // Proof it's really the owner: either the account's ID is saved in Netlify (OWNER_UID), or the email is verified.
  const ownerUid = (process.env.OWNER_UID || '').trim();
  if (ownerUid ? tok.uid !== ownerUid : !tok.email_verified) return json({ error: 'verify-email', message: ownerUid ? 'This account isn\'t the one saved as OWNER_UID in Netlify.' : 'Confirm it\'s you: add OWNER_UID in Netlify (see the steps), or verify your email.', uid: tok.uid }, 403);
  let body = {}; try { body = await req.json(); } catch {}
  const ref = db.doc(SECRET_DOC);
  const sec = (await ref.get()).data() || {};
  const now = Date.now();

  const method = sec.method || (sec.totp ? 'totp' : '');
  const active = !!(sec.active || sec.totp);
  if (body.action === 'status') { ensureOwnerHandle(db, tok.uid).catch(() => {}); return json({ version: 4, setup: active, method, locked: (sec.lockUntil || 0) > now ? sec.lockUntil : 0, emailReady: !!process.env.RESEND_API_KEY }); }

  // first-time setup: choose a PIN, then how you get your second code
  if (body.action === 'setup') {
    if (active) return json({ error: 'Already set up' }, 400);
    const pin = String(body.pin || ''); if (!/^\d{6,12}$/.test(pin)) return json({ error: 'Your PIN must be 6 to 12 numbers.' }, 400);
    const how = ['nexa', 'email', 'totp'].includes(body.method) ? body.method : 'totp';
    if (how === 'email' && !process.env.RESEND_API_KEY) return json({ error: 'Email codes need RESEND_API_KEY in Netlify first (see the steps).' }, 400);
    const salt = crypto.randomBytes(16).toString('hex');
    const base = { pinHash: hashPin(pin, salt), salt, sessionKey: crypto.randomBytes(32).toString('hex'), uid: tok.uid, fails: 0, lockUntil: 0, createdAt: now, method: how };
    if (how === 'totp') {
      const secret = b32enc(crypto.randomBytes(20));
      await ref.set({ ...base, pendingTotp: secret, active: false });
      return json({ secret, otpauth: `otpauth://totp/Nexa%20Owner:${encodeURIComponent(OWNER_EMAIL)}?secret=${secret}&issuer=Nexa%20Owner&digits=6&period=30` });
    }
    await ref.set({ ...base, active: true });
    return json({ ok: true, method: how });
  }
  if (body.action === 'confirm') {
    if (active || !sec.pendingTotp) return json({ error: 'Nothing to confirm' }, 400);
    if (!codeOk(sec.pendingTotp, body.code)) return json({ error: 'That code didn\'t match. Check your authenticator app and try again.' }, 400);
    await ref.update({ totp: sec.pendingTotp, active: true, method: 'totp', pendingTotp: admin.firestore.FieldValue.delete ? admin.firestore.FieldValue.delete() : null });
    return json({ ok: true });
  }
  // send a one-time code (to @shiv in Nexa, or by email)
  if (body.action === 'sendCode') {
    if (!active || method === 'totp') return json({ error: 'Not needed' }, 400);
    if ((sec.lockUntil || 0) > now) return json({ error: 'Locked for a few minutes after too many wrong tries.' }, 429);
    if (now - (sec.codeSentAt || 0) < 30e3) return json({ error: 'Wait 30 seconds before asking for another code.' }, 429);
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    await ref.update({ codeHash: hashPin(code, sec.salt), codeExp: now + 10 * 60e3, codeSentAt: now, codeTries: 0 });
    if (method === 'email') {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM || 'Nexa Owner <onboarding@resend.dev>', to: [OWNER_EMAIL], subject: `Your Nexa Owner code: ${code}`, html: `<div style="font-family:system-ui;padding:20px"><h2>Nexa Owner sign-in</h2><p>Your code is</p><p style="font-size:34px;font-weight:800;letter-spacing:8px">${code}</p><p style="color:#666">It works for 10 minutes. If you didn't try to open the owner page, change your password.</p></div>` }) });
      if (!r.ok) return json({ error: 'The email couldn\'t be sent (' + r.status + '). Check RESEND_API_KEY in Netlify.' }, 502);
      return json({ ok: true, to: OWNER_EMAIL.replace(/^(.).*(@.*)$/, '$1•••$2') });
    }
    // Nexa: notification + push to the @shiv account
    const h = await db.doc('handles/' + PERSONAL_HANDLE).get(); const to = h.exists && h.data().uid;
    if (!to) return json({ error: 'Couldn\'t find @' + PERSONAL_HANDLE + ' in Nexa.' }, 400);
    await db.collection('notifications').add({ to, from: 'nexa-owner', type: 'owner_code', title: 'Nexa Owner code: ' + code, body: 'Someone is opening the owner page. Code works for 10 minutes.', at: now, read: false });
    try {
      const push = (await db.doc(`users/${to}/private/push`).get()).data() || {};
      const tokens = [...new Set([...Object.values(push.devices || {}), ...(push.tokens || [])])].filter(Boolean).slice(0, 20);
      if (tokens.length) await admin.messaging().sendEachForMulticast({ tokens, data: { kind: 'notification', title: 'Nexa Owner code: ' + code, body: 'Works for 10 minutes', tag: 'owner_code', page: 'notifications' }, webpush: { headers: { Urgency: 'high', TTL: '600' } } });
    } catch {}
    return json({ ok: true, to: '@' + PERSONAL_HANDLE + ' in Nexa' });
  }
  // sign in: PIN + second code → 30-minute session
  if (body.action === 'login') {
    if (!active) return json({ error: 'Set up the owner console first.' }, 400);
    if ((sec.lockUntil || 0) > now) return json({ error: 'Too many wrong tries. Locked until ' + new Date(sec.lockUntil).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' (UTC).', locked: sec.lockUntil }, 429);
    const c = String(body.code || '').replace(/\D/g, '');
    let second = false;
    if (method === 'totp') second = codeOk(sec.totp, c);
    else if (sec.codeHash && (sec.codeExp || 0) > now && c.length === 6) { const x = Buffer.from(hashPin(c, sec.salt), 'hex'), y = Buffer.from(sec.codeHash, 'hex'); second = x.length === y.length && crypto.timingSafeEqual(x, y); }
    if (!pinOk(body.pin, sec) || !second) {
      const fails = (sec.fails || 0) + 1, lock = fails >= 5 ? now + 15 * 60e3 : 0;
      await ref.update({ fails: lock ? 0 : fails, lockUntil: lock });
      return json({ error: lock ? 'Too many wrong tries — locked for 15 minutes.' : (method !== 'totp' && (!sec.codeHash || (sec.codeExp || 0) <= now) ? 'Tap "Send code" first — codes last 10 minutes. ' : 'Wrong PIN or code. ') + `${5 - fails} ${5 - fails === 1 ? 'try' : 'tries'} left.` }, 401);
    }
    await ref.update({ fails: 0, lockUntil: 0, lastLogin: now, codeHash: '', codeExp: 0 });
    return json({ session: sign({ uid: tok.uid, iat: now, exp: now + 30 * 60e3 }, sec.sessionKey), exp: now + 30 * 60e3 });
  }
  // ---------- everything below needs an unlocked session (PIN + code)
  const s = sec.sessionKey && unsign(body.session, sec.sessionKey);
  if (!s || s.uid !== tok.uid || s.exp < now || (sec.sessionsFrom || 0) > (s.iat || 0)) return json({ error: 'session', message: 'Your session ended. Enter your PIN and code again.' }, 401);
  // sliding session: every call while you're using the page keeps you signed in for another 30 minutes
  const fresh = sign({ uid: tok.uid, iat: s.iat || now, exp: now + 30 * 60e3 }, sec.sessionKey);
  const ok = o => json({ ...o, session: fresh });
  const me = tok.uid;
  const uiRef = db.doc(UI_DOC);

  if (body.action === 'data') {
    const [d, link, ui, bans] = await Promise.all([dashboard(db), ensureOwnerHandle(db, me), uiRef.get().then(x => x.data() || {}), db.collection('bans').get()]);
    d.bans = bans.docs.map(b => ({ id: b.id, ...b.data() }));
    return ok({ ...d, link, ui: uiOut(ui), me });
  }
  if (body.action === 'inbox') {
    const qs = await db.collection('conversations').where('members', 'array-contains', me).get();
    const convs = qs.docs.map(x => ({ id: x.id, ...x.data() })).filter(c => c.type === 'dm' && c.last);
    const others = [...new Set(convs.map(c => (c.members || []).find(u => u !== me)).filter(Boolean))];
    const profs = {}; await Promise.all(others.map(async u => { profs[u] = (await db.doc('users/' + u).get()).data() || {}; }));
    const bans = new Set((await db.collection('bans').get()).docs.map(b => b.id));
    const list = convs.map(c => { const u = (c.members || []).find(x => x !== me) || me, p = profs[u] || {}; const last = c.last || {}; return { id: c.id, uid: u, name: p.name || 'Nexa user', handle: p.handle || '', avatar: typeof p.avatar === 'string' && p.avatar.length < 80000 ? p.avatar : '', online: Date.now() - ms(p.lastSeen) < 3 * 60e3, help: !!c.help, last: { text: String(last.text || '').slice(0, 140), from: last.from === me ? 'me' : 'them', at: last.at || 0 }, unread: last.from && last.from !== me && (last.at || 0) > ((c.reads || {})[me] || 0), banned: bans.has(u) }; }).sort((a, b) => b.last.at - a.last.at);
    return ok({ list, unread: list.filter(c => c.unread).length });
  }
  const myConv = async cid => { if (!/^[\w-]{1,200}$/.test(String(cid || ''))) return null; const c = (await db.doc('conversations/' + cid).get()).data(); return c && (c.members || []).includes(me) ? c : null; };
  if (body.action === 'thread') {
    const c = await myConv(body.cid); if (!c) return json({ error: 'Chat not found' }, 404);
    const qs = await db.collection(`conversations/${body.cid}/messages`).orderBy('at', 'desc').limit(80).get();
    const msgs = qs.docs.map(x => { const m = x.data(); const imgs = (m.images || (m.image ? [m.image] : [])).filter(i => typeof i === 'string' && i.length < 600000).slice(0, 4); return { id: x.id, mine: m.from === me, at: m.at || 0, text: m.deleted ? '' : String(m.text || ''), label: m.deleted ? 'Message deleted' : m.text ? '' : label(m), imgs: m.deleted ? [] : imgs, system: !!m.system }; }).reverse();
    if (c.last && c.last.from !== me) await db.doc('conversations/' + body.cid).update({ ['reads.' + me]: Math.max(now, (c.last.at || 0) + 1) }).catch(() => {});
    return ok({ msgs, typing: Object.entries(c.typing || {}).some(([u, t]) => u !== me && now - (t || 0) < 6000) });
  }
  if (body.action === 'reply') {
    const c = await myConv(body.cid); if (!c) return json({ error: 'Chat not found' }, 404);
    const text = String(body.text || '').trim().slice(0, 4000); if (!text) return json({ error: 'Type a message first' }, 400);
    await sendAs(db, me, body.cid, c, text, req);
    return ok({ sent: true });
  }
  if (body.action === 'startChat') {
    const u = String(body.uid || ''); if (!/^[\w-]{1,128}$/.test(u) || u === me) return json({ error: 'Bad user' }, 400);
    const cid = 'dm_' + [me, u].sort().join('__'); const ref2 = db.doc('conversations/' + cid);
    if (!(await ref2.get()).exists) await ref2.set({ type: 'dm', members: [me, u].sort(), createdAt: now, reads: {}, typing: {}, help: true });
    return ok({ cid });
  }
  if (body.action === 'ban' || body.action === 'unban') {
    const u = String(body.uid || ''); if (!/^[\w-]{1,128}$/.test(u)) return json({ error: 'Bad user' }, 400);
    if (u === me) return json({ error: 'You can\'t ban yourself.' }, 400);
    if (body.action === 'ban') await db.doc('bans/' + u).set({ by: me, at: now, reason: String(body.reason || '').slice(0, 200) });
    else await db.doc('bans/' + u).delete();
    return ok({ done: true });
  }
  if (body.action === 'warn') {
    const u = String(body.uid || ''); if (!/^[\w-]{1,128}$/.test(u)) return json({ error: 'Bad user' }, 400);
    const t = String(body.text || '').trim().slice(0, 300) || 'Please keep Nexa friendly and respectful.';
    const n = await db.collection('notifications').add({ to: u, from: me, type: 'admin_warn', title: 'A message from the Nexa team', body: t, at: now, read: false });
    await deliver(db, u, { kind: 'notification', title: 'A message from the Nexa team', body: t, page: 'notifications', tag: 'n_' + n.id }, 86400).catch(() => 0);
    return ok({ done: true });
  }
  if (body.action === 'announce') {
    const t = String(body.text || '').trim().slice(0, 300); if (!t) return json({ error: 'Write your announcement first' }, 400);
    if (now - (sec.lastAnnounce || 0) < 60e3) return json({ error: 'Wait a minute between announcements.' }, 429);
    await ref.update({ lastAnnounce: now });
    const ids = (await db.collection('users').select().get()).docs.map(d => d.id).filter(u => u !== me);
    for (let i = 0; i < ids.length; i += 400) { const b = db.batch(); ids.slice(i, i + 400).forEach(u => b.set(db.collection('notifications').doc(), { to: u, from: me, type: 'announcement', title: '📣 ' + (body.title ? String(body.title).slice(0, 60) : 'News from Nexa'), body: t, at: now, read: false })); await b.commit(); }
    let pushed = 0; if (body.push !== false) for (let i = 0; i < ids.length; i += 25) { const r = await Promise.all(ids.slice(i, i + 25).map(u => deliver(db, u, { kind: 'notification', title: '📣 ' + (body.title ? String(body.title).slice(0, 60) : 'News from Nexa'), body: t, page: 'notifications', tag: 'ann_' + now }, 86400).catch(() => 0))); pushed += r.reduce((a, b) => a + b, 0); }
    return ok({ people: ids.length, pushed });
  }
  if (body.action === 'prefs') {
    const p = body.prefs || {}, patch = {};
    if ('bg' in p) { const b = String(p.bg || ''); if (b.length > 950000) return json({ error: 'That photo is too big.' }, 400); patch.bg = b; }
    if ('dim' in p) patch.dim = Math.max(0, Math.min(80, +p.dim || 0));
    if ('forward' in p) patch.forward = !!p.forward;
    if ('autoReply' in p) patch.autoReply = String(p.autoReply || '').slice(0, 300);
    await uiRef.set(patch, { merge: true });
    return ok({ ui: uiOut({ ...((await uiRef.get()).data() || {}) }) });
  }
  if (body.action === 'changePin') {
    if (!pinOk(body.oldPin, sec)) return json({ error: 'Your current PIN is wrong.' }, 401);
    const pin = String(body.pin || ''); if (!/^\d{6,12}$/.test(pin)) return json({ error: 'Your new PIN must be 6 to 12 numbers.' }, 400);
    const salt = crypto.randomBytes(16).toString('hex');
    await ref.update({ pinHash: hashPin(pin, salt), salt, codeHash: '', codeExp: 0 });
    return ok({ done: true });
  }
  if (body.action === 'setMethod') {
    const how = body.method;
    if (how === 'totp') { const secret = b32enc(crypto.randomBytes(20)); await ref.update({ pendingTotp: secret }); return ok({ secret, otpauth: `otpauth://totp/Nexa%20Owner:${encodeURIComponent(OWNER_EMAIL)}?secret=${secret}&issuer=Nexa%20Owner&digits=6&period=30` }); }
    if (!['nexa', 'email'].includes(how)) return json({ error: 'Pick a method' }, 400);
    if (how === 'email' && !process.env.RESEND_API_KEY) return json({ error: 'Email codes need RESEND_API_KEY in Netlify first.' }, 400);
    await ref.update({ method: how });
    return ok({ method: how });
  }
  if (body.action === 'confirmTotp') {
    if (!sec.pendingTotp || !codeOk(sec.pendingTotp, body.code)) return json({ error: 'That code didn\'t match. Try the newest one.' }, 400);
    await ref.update({ totp: sec.pendingTotp, method: 'totp', pendingTotp: '' });
    return ok({ method: 'totp' });
  }
  if (body.action === 'logoutAll') { await ref.update({ sessionsFrom: now + 1 }); return json({ done: true }); }
  return json({ error: 'Unknown action' }, 400);
};
