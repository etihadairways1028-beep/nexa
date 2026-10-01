// Nexa push server — runs free on Netlify Functions.
// The app calls this right after it sends a message, a notification (friend request, invite…) or starts a call.
// It checks the caller really is that sender, then sends a push to the other people through Firebase Cloud Messaging,
// so they get it on their phone / iPad / laptop even when Nexa is closed.
import admin from 'firebase-admin';
import { avatarSig } from './avatar.mjs';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const ID = /^[\w-]{1,200}$/;
const FRESH_MS = 2 * 60 * 1000;

function init() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  KEY = sa.private_key || '';
  return admin.initializeApp({ credential: admin.credential.cert(sa) });
}
let KEY = '';
// A signed link to the sender's profile photo, shown as the big picture on the notification.
function iconFor(req, uid, user) {
  if (!user || !user.avatar || !KEY) return '';
  try { const o = new URL(req.url).origin; return `${o}/.netlify/functions/avatar?u=${encodeURIComponent(uid)}&s=${avatarSig(uid, KEY)}&v=${(user.avatar.length % 99991).toString(36)}`; } catch { return ''; }
}

const label = m => m.video ? (m.video.round ? 'Video message' : 'Video') : m.live ? 'Shared live location' : m.bot ? 'Nexa AI: ' + (m.text || '') : m.audio ? 'Voice message' : m.stickerImg || m.sticker ? 'Sticker' : m.gif ? 'GIF'
  : (m.images && m.images.length > 1) ? `${m.images.length} photos` : (m.images || m.image) ? 'Photo' : m.poll ? 'Poll: ' + (m.poll.q || '')
  : m.game ? 'Sent a game' : m.theme ? 'Shared a chat theme' : (m.text || 'New message');

async function once(db, key) {
  try { await db.doc('pushLog/' + key).create({ at: Date.now() }); return true; } catch { return false; }
}

async function deliver(db, uid, data, ttl, exclude) {
  const pdoc = db.doc(`users/${uid}/private/push`);
  const push = (await pdoc.get()).data() || {};
  const tokens = [...new Set([...Object.values(push.devices || {}), ...(push.tokens || [])])].filter(t => typeof t === 'string' && t && !(exclude || []).includes(t)).slice(0, 20);
  if (!tokens.length) return 0;
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])),
    webpush: { headers: { Urgency: 'high', TTL: String(ttl) } }
  });
  const dead = [];
  res.responses.forEach((r, i) => { const code = r.error && r.error.code || ''; if (!r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(code)) dead.push(tokens[i]); });
  if (dead.length) await pdoc.update({ tokens: admin.firestore.FieldValue.arrayRemove(...dead) }).catch(() => {});
  return res.successCount;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try { init(); } catch (e) { return json({ error: 'Push server not configured: ' + e.message }, 500); }
  const db = admin.firestore();

  const m = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/);
  if (!m) return json({ error: 'Not signed in' }, 401);
  let uid;
  try { uid = (await admin.auth().verifyIdToken(m[1])).uid; } catch { return json({ error: 'Not signed in' }, 401); }

  let body; try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const sender = (await db.doc(`users/${uid}`).get()).data() || {};
  const name = sender.name || 'Someone';
  if (!KEY) { try { const raw = process.env.FIREBASE_SERVICE_ACCOUNT; KEY = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')).private_key || ''; } catch {} }
  const icon = iconFor(req, uid, sender);
  if ((await db.doc('bans/' + uid).get()).exists) return json({ ok: false, skip: 'banned' });

  // ---------- a new chat message
  if (body.kind === 'message') {
    const cid = String(body.conv || ''), mid = String(body.msg || '');
    if (!ID.test(cid) || !ID.test(mid)) return json({ error: 'Bad request' }, 400);
    const [cs, ms] = await Promise.all([db.doc(`conversations/${cid}`).get(), db.doc(`conversations/${cid}/messages/${mid}`).get()]);
    const conv = cs.data(), msg = ms.data();
    if (!conv || !msg || msg.from !== uid || msg.system || !(conv.members || []).includes(uid)) return json({ ok: false, skip: 'invalid' });
    // Messages written offline are pushed when the sender reconnects, so allow a longer window (dedupe prevents repeats).
    if (Date.now() - (msg.at || 0) > 30 * 60 * 1000) return json({ ok: false, skip: 'old' });
    if (!(await once(db, `m_${cid}_${mid}`))) return json({ ok: true, skip: 'duplicate' });
    const isDm = conv.type === 'dm';
    const isReq = isDm && conv.request && conv.request.from === uid;
    const title = isReq ? `Message request from ${name}` : isDm ? name : conv.type === 'channel' ? '#' + (conv.name || 'channel') : (conv.name || 'Group chat');
    let sent = 0;
    await Promise.all((conv.members || []).filter(u => u !== uid).map(async u => {
      const prefs = (await db.doc(`users/${u}/private/prefs`).get()).data() || {};
      const mentioned = !isDm && (msg.mentions || []).includes(u);
      if (prefs.deviceNotifs === false || ((prefs.muted || {})[cid] && !mentioned) || (prefs.blocked || []).includes(uid) || (prefs.notif && prefs.notif.msg === false)) return;
      const text = prefs.pushPreview === false ? 'New message' : label(msg).slice(0, 140);
      sent += await deliver(db, u, { kind: 'message', title: mentioned ? `${name.split(' ')[0]} mentioned you in ${title}` : title, body: isDm || mentioned ? text : `${name.split(' ')[0]}: ${text}`, chat: cid, tag: 'c_' + cid, msg: mid, icon }, 86400);
    }));
    return json({ ok: true, sent });
  }

  // ---------- you read a chat on one device → clear its notifications on your other devices
  if (body.kind === 'read') {
    const cid = String(body.conv || ''); if (!ID.test(cid)) return json({ error: 'Bad request' }, 400);
    const conv = (await db.doc(`conversations/${cid}`).get()).data();
    if (!conv || !(conv.members || []).includes(uid)) return json({ ok: false, skip: 'invalid' });
    const sent = await deliver(db, uid, { kind: 'clear', tag: 'c_' + cid }, 300, [String(body.self || '')]);
    return json({ ok: true, sent });
  }

  // ---------- friend requests, invites, event updates, warnings…
  if (body.kind === 'notification') {
    const nid = String(body.id || ''); if (!ID.test(nid)) return json({ error: 'Bad request' }, 400);
    const ns = await db.doc('notifications/' + nid).get(); const n = ns.data();
    if (!n || n.from !== uid || n.to === uid || Date.now() - (n.at || 0) > FRESH_MS) return json({ ok: false, skip: 'invalid' });
    if (!(await once(db, 'n_' + nid))) return json({ ok: true, skip: 'duplicate' });
    const prefs = (await db.doc(`users/${n.to}/private/prefs`).get()).data() || {};
    const t = n.type || '';
    if (prefs.deviceNotifs === false || (prefs.blocked || []).includes(uid)) return json({ ok: true, skip: 'off' });
    if ((t.startsWith('friend') && prefs.notif && prefs.notif.friend === false) || (t.startsWith('event') && prefs.notif && prefs.notif.event === false)) return json({ ok: true, skip: 'off' });
    const link = n.link || {};
    const sent = await deliver(db, n.to, { kind: 'notification', title: n.title || 'Nexa', body: n.body || '', chat: link.page === 'conv' ? link.id || '' : '', page: link.page && link.page !== 'conv' ? (link.page === 'profile' ? 'people' : link.page === 'community' ? 'notifications' : link.page) : 'notifications', tag: 'n_' + nid, icon }, 86400);
    return json({ ok: true, sent });
  }

  // ---------- incoming call
  if (body.kind === 'call') {
    const id = String(body.id || ''); if (!ID.test(id)) return json({ error: 'Bad request' }, 400);
    const c = (await db.doc('calls/' + id).get()).data();
    if (!c || c.from !== uid || c.status !== 'ringing' || Date.now() - (c.at || 0) > 60000) return json({ ok: false, skip: 'invalid' });
    if (!(await once(db, 'c_' + id))) return json({ ok: true, skip: 'duplicate' });
    const prefs = (await db.doc(`users/${c.to}/private/prefs`).get()).data() || {};
    if (prefs.deviceNotifs === false || (prefs.blocked || []).includes(uid)) return json({ ok: true, skip: 'off' });
    const sent = await deliver(db, c.to, { kind: 'call', title: `${name} is calling`, body: c.kind === 'video' ? 'Video call on Nexa — tap to answer' : 'Voice call on Nexa — tap to answer', chat: c.conv || '', tag: 'call_' + id, icon }, 60);
    return json({ ok: true, sent });
  }

  return json({ error: 'Unknown kind' }, 400);
};
