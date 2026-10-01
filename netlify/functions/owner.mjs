// Nexa owner console — the server side of nexaconnect-chat.netlify.app/owner
// Locked three ways: (1) signed in as OWNER_EMAIL with a verified email, (2) the owner PIN,
// (3) a 6-digit code from an authenticator app (2-step verification). 5 wrong tries = locked for 15 minutes.
// Shows how many people use Nexa and who they are (name, @username, email) — never passwords.
import admin from 'firebase-admin';
import crypto from 'node:crypto';

const OWNER_EMAIL = 'etihadairways1028@gmail.com';
const PERSONAL_HANDLE = 'shiv';   // your everyday Nexa account — sign-in codes can be sent here
const SECRET_DOC = 'ownerSecrets/main';           // no Firestore rule allows clients to read this
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

async function dashboard(db) {
  const accounts = {};
  let page;
  do {
    page = await admin.auth().listUsers(1000, page && page.pageToken);
    for (const u of page.users) accounts[u.uid] = { email: u.email || '', verified: !!u.emailVerified, created: ms(u.metadata && u.metadata.creationTime), lastSignIn: ms(u.metadata && u.metadata.lastSignInTime), disabled: !!u.disabled };
  } while (page.pageToken && Object.keys(accounts).length < 20000);
  const profiles = {};
  (await db.collection('users').get()).forEach(d => { const p = d.data() || {}; profiles[d.id] = { name: p.name || '', handle: p.handle || '', lastSeen: ms(p.lastSeen), createdAt: ms(p.createdAt), deleted: !!p.deleted, bio: p.bio || '' }; });
  const ids = [...new Set([...Object.keys(accounts), ...Object.keys(profiles)])];
  const users = ids.map(id => { const ac = accounts[id] || {}, pr = profiles[id] || {}; return { id, name: pr.name || '', handle: pr.handle || '', email: ac.email || '', verified: !!ac.verified, joined: pr.createdAt || ac.created || 0, lastActive: Math.max(pr.lastSeen || 0, ac.lastSignIn || 0), finishedSignup: !!profiles[id], deleted: !!pr.deleted }; }).sort((x, y) => y.joined - x.joined);
  const now = Date.now(), day = 864e5;
  const count = async q => { try { return (await q.count().get()).data().count; } catch { return null; } };
  const [chats, groups, messages, events, moments, reports, bans, friendships] = await Promise.all([
    count(db.collection('conversations')), count(db.collection('conversations').where('type', '==', 'group')), count(db.collectionGroup('messages')),
    count(db.collection('events')), count(db.collection('moments')), count(db.collection('reports')), count(db.collection('bans')), count(db.collection('friendships'))
  ]);
  const signups = Array.from({ length: 30 }, (_, i) => { const st = new Date(now - (29 - i) * day); st.setHours(0, 0, 0, 0); const s = +st, e = s + day; return { day: s, n: users.filter(u => u.joined >= s && u.joined < e).length, active: users.filter(u => u.lastActive >= s && u.lastActive < e).length }; });
  return {
    stats: { users: users.filter(u => !u.deleted).length, unfinished: users.filter(u => !u.finishedSignup).length, new24h: users.filter(u => now - u.joined < day).length, new7d: users.filter(u => now - u.joined < 7 * day).length, active24h: users.filter(u => now - u.lastActive < day).length, active7d: users.filter(u => now - u.lastActive < 7 * day).length, onlineNow: users.filter(u => now - u.lastActive < 3 * 60e3).length, chats, groups, messages, events, moments, reports, bans, friendships },
    signups, users, at: now
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
  if (body.action === 'status') return json({ setup: active, method, locked: (sec.lockUntil || 0) > now ? sec.lockUntil : 0, emailReady: !!process.env.RESEND_API_KEY });

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
    return json({ session: sign({ uid: tok.uid, exp: now + 30 * 60e3 }, sec.sessionKey), exp: now + 30 * 60e3 });
  }
  if (body.action === 'data') {
    const s = sec.sessionKey && unsign(body.session, sec.sessionKey);
    if (!s || s.uid !== tok.uid || s.exp < now) return json({ error: 'session', message: 'Your session ended. Enter your PIN and code again.' }, 401);
    return json(await dashboard(db));
  }
  return json({ error: 'Unknown action' }, 400);
};
