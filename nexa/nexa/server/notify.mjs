// Nexa push server — runs free on Netlify Functions.
// The app calls this right after it sends a message, a notification (friend request, invite…) or starts a call.
// It checks the caller really is that sender, then sends a push to the other people through Firebase Cloud Messaging,
// so they get it on their phone / iPad / laptop even when Nexa is closed.
import admin from './fbadmin.js';
import { sendMail, mailReady, emailHtml } from './mail.mjs';
import { Buffer } from 'node:buffer';
import { avatarSig } from './avatar.mjs';
import { sendAs, pushAgents, dayKey } from './owner.mjs';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const ID = /^[\w-]{1,200}$/;
const FRESH_MS = 2 * 60 * 1000;
const PART = 8; // people per push request

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
  try { const o = new URL(req.url).origin; return `${o}/api/avatar?u=${encodeURIComponent(uid)}&s=${avatarSig(uid, KEY)}&v=${(user.avatar.length % 99991).toString(36)}`; } catch { return ''; }
}

const label = m => m.once ? 'View-once photo' : m.meet ? 'Google Meet — tap to join' : m.video ? (m.video.round ? 'Video message' : 'Video') : m.live ? 'Shared live location' : m.bot ? 'Nexa AI: ' + (m.text || '') : m.audio ? 'Voice message' : m.stickerImg || m.sticker ? 'Sticker' : m.gif ? 'GIF'
  : (m.images && m.images.length > 1) ? `${m.images.length} photos` : (m.images || m.image) ? 'Photo' : m.poll ? 'Poll: ' + (m.poll.q || '')
  : m.game ? 'Sent a game' : m.theme ? 'Shared a chat theme' : (m.text || 'New message');

async function once(db, key) {
  try { await db.doc('pushLog/' + key).create({ at: Date.now() }); return true; } catch { return false; }
}

async function deliver(db, uid, data, ttl, exclude, pre, maxTokens = 20) {
  const pdoc = db.doc(`users/${uid}/private/push`);
  const push = pre || (await pdoc.get()).data() || {};
  // newest devices first; each phone/browser is one request to Google
  const tokens = [...new Set([...(push.tokens || []).slice().reverse(), ...Object.values(push.devices || {})])].filter(t => typeof t === 'string' && t && !(exclude || []).includes(t)).slice(0, maxTokens);
  if (!tokens.length) return 0;
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])),
    webpush: { headers: { Urgency: 'high', TTL: String(ttl) } }
  });
  const dead = [];
  // only "this phone/browser is gone" errors mean a dead token (a bad message is not the token's fault)
  res.responses.forEach((r, i) => { const code = r.error && r.error.code || ''; if (!r.success && /registration-token-not-registered|invalid-registration-token/.test(code)) dead.push(tokens[i]); });
  if (dead.length) {
    const upd = { tokens: admin.firestore.FieldValue.arrayRemove(...dead) };
    for (const [k, v] of Object.entries(push.devices || {})) if (dead.includes(v) && /^[\w-]{1,200}$/.test(k)) upd['devices.' + k] = admin.firestore.FieldValue.delete();
    await pdoc.update(upd).catch(() => {});
  }
  return res.successCount;
}

// ---------- offensive message detection → flagged for the support team
const BAD = ['fuck', 'fck', 'fuk', 'fking', 'fcking', 'fukin', 'fucker', 'fucking', 'motherfucker', 'shit', 'bullshit', 'bitch', 'bastard', 'asshole', 'arsehole', 'dick', 'dickhead', 'cunt', 'pussy', 'whore', 'slut', 'wanker', 'twat', 'prick', 'retard', 'retarded', 'faggot', 'fag', 'nigger', 'nigga', 'chink', 'spic', 'kike', 'paki', 'tranny', 'dyke', 'cock', 'cocksucker', 'douchebag', 'stfu', 'kys'];
const PHRASES = ['kill yourself', 'kill urself', 'go die', 'you should die', 'i will kill you', 'ill kill you', 'hope you die', 'neck yourself'];
const LEET = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't' };
const BAD_RE = new RegExp('\\b(' + BAD.map(w => w.split('').map(c => c + '+').join('')).join('|') + ')(s|es|ed|ing|er|ers)?\\b', 'i');
export function offensive(text) {
  const t = String(text || '').toLowerCase().replace(/[01!34@5$7+]/g, c => LEET[c] || c).replace(/[*_.\-]/g, '').replace(/\s+/g, ' ');
  const hits = []; const m = t.match(BAD_RE); if (m) hits.push(m[1]);
  PHRASES.forEach(p => { if (t.includes(p)) hits.push(p); });
  return hits;
}
async function checkMessage(db, uid, name, cid, conv, mid, msg) {
  const hits = offensive(msg.text); if (!hits.length) return;
  const id = 'f_' + cid + '_' + mid; const ref = db.doc('flags/' + id);
  try { await ref.create({ conv: cid, msg: mid, from: uid, fromName: name, text: String(msg.text || '').slice(0, 400), words: hits.slice(0, 5), at: Date.now(), status: 'open', convType: conv.type || 'dm', convName: conv.name || '' }); } catch { return; }
  await pushAgents(db, { title: '🚩 Offensive message', body: `${name}: ${String(msg.text || '').slice(0, 120)}`, url: '/support/#flags', tag: 'flag_' + id });
}
const DEFAULT_AUTO_REPLY = 'Thank you for reaching out to Nexa Support. The next Nexa Support agent will get back to you soon! Thank you for choosing Nexa 💙';
async function supportForward(db, uid, name, cid, conv, msg) {
  const sec = (await db.doc('supportSecrets/main').get()).data() || {};
  const sup = (process.env.SUPPORT_UID || '').trim() || sec.uid;
  if (!sup || uid === sup || !(conv.members || []).includes(sup)) return;
  const asked = ['shiv', 'arrick', 'yaseen'].includes(conv.askedFor) ? conv.askedFor : '';
  const askedName = asked ? asked[0].toUpperCase() + asked.slice(1) : '';
  await pushAgents(db, { title: asked ? `💬 ${name} asked for ${askedName}` : `💬 ${name} needs help`, body: label(msg).slice(0, 140), url: '/support/#inbox', tag: 'sup_' + cid }, asked);
  const autoReply = sec.autoReply ?? DEFAULT_AUTO_REPLY;
  // the auto-reply is sent once per chat; it's only marked done after it was really sent
  if (autoReply && !conv.autoReplied && await once(db, 'ar_' + cid)) { await sendAs(db, sup, cid, conv, autoReply, null, { agent: 'Nexa Support', staff: 'support', auto: true }); await db.doc('conversations/' + cid).update({ autoReplied: true }); }
}

async function ownerForward(db, uid, name, cid, conv, msg, icon, req) {
  const sec = (await db.doc('ownerSecrets/main').get()).data() || {};
  const ownerUid = (process.env.OWNER_UID || '').trim() || sec.uid;
  if (!ownerUid || uid === ownerUid || !(conv.members || []).includes(ownerUid)) return;
  const ui = (await db.doc('ownerSecrets/ui').get()).data() || {};
  if (ui.forward !== false) {
    const h = await db.doc('handles/shiv').get(); const shiv = h.exists && h.data().uid;
    if (shiv && shiv !== uid) {
      const text = label(msg).slice(0, 140);
      // one notification in the list per chat every 10 minutes, but a push for every message
      if (await once(db, `ohn_${cid}_${Math.floor(Date.now() / 600000)}`)) await db.collection('notifications').add({ to: shiv, from: 'nexa-owner', type: 'owner_help', title: `🛟 ${name} messaged @owner`, body: text, at: Date.now(), read: false, link: { url: '/owner/#inbox' } });
      await deliver(db, shiv, { kind: 'notification', title: `🛟 ${name} messaged @owner`, body: text, url: '/owner/#inbox', page: 'notifications', tag: 'oh_' + cid, icon }, 86400, null, null, 3);
    }
  }
  if (ui.autoReply && !conv.autoReplied && await once(db, 'ar_' + cid)) {
    await sendAs(db, ownerUid, cid, conv, ui.autoReply, req);
    await db.doc('conversations/' + cid).update({ autoReplied: true });
  }
}


// ---------- scheduled messages go out even when your phone is off / Nexa is closed
// Each person's list lives in users/{uid}/private/scheduled; schedIndex/{uid}.next = when the next one is due.
let lastSweep = 0;
export async function sweepScheduled(db, req) {
  lastSweep = Date.now();
  const due = await db.collection('schedIndex').where('next', '<=', Date.now()).limit(3).get();
  let sent = 0;
  for (const d of due.docs) {
    const uid = d.id, ref = db.doc(`users/${uid}/private/scheduled`);
    const items = (((await ref.get()).data() || {}).items || []), t = Date.now();
    const go = items.filter(x => x.at <= t), rest = items.filter(x => x.at > t);
    if (go.length) await ref.set({ items: rest });
    const banned = (await db.doc('bans/' + uid).get()).exists;
    for (const x of go) {
      if (banned || !(await once(db, 'sm_' + uid + '_' + String(x.id || x.at).slice(0, 60)))) continue;
      const conv = (await db.doc('conversations/' + x.conv).get()).data();
      if (!conv || !(conv.members || []).includes(uid)) continue;
      try { await sendAs(db, uid, x.conv, conv, String(x.text || '').slice(0, 2000), req, { scheduled: true }); sent++; } catch {}
    }
    if (rest.length) await d.ref.set({ next: Math.min(...rest.map(x => x.at)) }); else await d.ref.delete().catch(() => {});
  }
  return sent;
}

export default async (req, ctx = {}) => {
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

  // ---------- scheduled messages: your list changed → remember when the next one is due
  if (body.kind === 'schedSync') {
    const items = (((await db.doc(`users/${uid}/private/scheduled`).get()).data() || {}).items || []).filter(x => x && x.at);
    if (items.length) await db.doc('schedIndex/' + uid).set({ next: Math.min(...items.map(x => x.at)) }); else await db.doc('schedIndex/' + uid).delete().catch(() => {});
    return json({ ok: true, n: items.length });
  }
  // any open Nexa asks about once a minute: due messages (from anyone) go out, even if their sender's phone is off
  if (body.kind === 'schedTick') { if (Date.now() - lastSweep < 15000) return json({ ok: true, skip: 'recent' }); return json({ ok: true, sent: await sweepScheduled(db, req) }); }

  // ---------- welcome email, once per account (only if an email server is set up)
  if (body.kind === 'welcome') {
    try {
      const tok = await admin.auth().getUser(uid); const email = tok.email;
      if (!email || !(await mailReady(db))) return json({ ok: false, skip: 'no-mail' });
      try { await db.doc('mailLog/welcome_' + uid).create({ to: email, at: Date.now() }); } catch { return json({ ok: true, skip: 'already-sent' }); }
      const site = new URL(req.url).origin, first = String(sender.name || '').split(' ')[0] || 'there';
      await sendMail(db, { to: email, subject: 'Welcome to Nexa 💙', text: `Hi ${first}! Welcome to Nexa — a messaging app like never before. Your username is @${sender.handle || ''}. Add friends by their full @username, share moments, make groups and call. Open Nexa: ${site}`, html: emailHtml(`Welcome to Nexa, ${first.replace(/[<>&]/g, '')}! 💙`, `You're all set. Your username is <b style="color:#fff">@${String(sender.handle || '').replace(/[<>&]/g, '')}</b>.<br><br>✨ Add friends by their full @username<br>📸 Share moments with songs<br>👥 Make groups and call your friends<br><br>Need help? Tap <b>Help</b> in Nexa to reach Nexa Support.`, { url: site, label: 'Open Nexa' }) });
      return json({ ok: true, sent: true });
    } catch (e) { return json({ ok: false, error: e.message }); }
  }

  // ---------- a new chat message
  if (body.kind === 'message') {
    const cid = String(body.conv || ''), mid = String(body.msg || '');
    if (!ID.test(cid) || !ID.test(mid)) return json({ error: 'Bad request' }, 400);
    const [cs, ms] = await Promise.all([db.doc(`conversations/${cid}`).get(), db.doc(`conversations/${cid}/messages/${mid}`).get()]);
    const conv = cs.data(), msg = ms.data();
    if (!conv || !msg || msg.from !== uid || msg.system || !(conv.members || []).includes(uid)) return json({ ok: false, skip: 'invalid' });
    // Messages written offline are pushed when the sender reconnects, so allow a longer window (dedupe prevents repeats).
    if (Date.now() - (msg.at || 0) > 30 * 60 * 1000) return json({ ok: false, skip: 'old' });
    // Big groups are split into parts of 8 people (the app sends one request per part), so each request
    // stays well inside Cloudflare's free limit of 50 outgoing requests.
    const everyone = (conv.members || []).filter(u => u !== uid), part = Math.max(0, Math.floor(+body.part || 0));
    const slice = everyone.slice(part * PART, part * PART + PART);
    if (!slice.length) return json({ ok: true, skip: 'empty-part' });
    if (!(await once(db, part ? `m_${cid}_${mid}_p${part}` : `m_${cid}_${mid}`))) return json({ ok: true, skip: 'duplicate' });
    const isDm = conv.type === 'dm';
    const isReq = isDm && conv.request && conv.request.from === uid;
    const title = isReq ? `Message request from ${name}` : isDm ? name : conv.type === 'channel' ? '#' + (conv.name || 'channel') : (conv.name || 'Group chat');
    let sent = 0;
    // everyone's settings and devices in ONE read
    const snaps = await db.getAll(...slice.map(u => db.doc(`users/${u}/private/prefs`)), ...slice.map(u => db.doc(`users/${u}/private/push`)));
    await Promise.all(slice.map(async (u, i) => {
      const prefs = snaps[i].data() || {}, pushDoc = snaps[slice.length + i].data() || {};
      const mentioned = !isDm && (msg.mentions || []).includes(u);
      if (prefs.deviceNotifs === false || ((prefs.muted || {})[cid] && !mentioned) || (prefs.blocked || []).includes(uid) || (prefs.notif && prefs.notif.msg === false)) return;
      const text = prefs.pushPreview === false ? 'New message' : label(msg).slice(0, 140);
      const n = await deliver(db, u, { kind: 'message', title: mentioned ? `${name.split(' ')[0]} mentioned you in ${title}` : title, body: isDm || mentioned ? text : `${name.split(' ')[0]}: ${text}`, chat: cid, tag: 'c_' + cid, msg: mid, icon, vibe: (prefs.alerts || {}).vibe || '', silent: (prefs.alerts || {}).push === 'silent' ? '1' : '' }, 86400, null, pushDoc, 4);
      sent += n;
    }));
    // Someone messaged @owner → tell your everyday @shiv account, and send the auto-reply if you set one.
    // older app versions don't send the separate 'msgside' request, so do the extra jobs here for them
    if (part === 0 && body.side !== false) {
      if (isDm) { try { await ownerForward(db, uid, name, cid, conv, msg, icon, req); } catch {} try { await supportForward(db, uid, name, cid, conv, msg); } catch {} }
      try { await checkMessage(db, uid, name, cid, conv, mid, msg); } catch {}
      try { await db.doc('stats/' + dayKey()).set({ day: dayKey(), messages: admin.firestore.FieldValue.increment(1) }, { merge: true }); } catch {}
    }
    return json({ ok: true, sent, parts: Math.ceil(everyone.length / PART) });
  }

  // ---------- the extra jobs for a message (help desk forwarding, auto-replies, safety check, stats) — own request budget
  if (body.kind === 'msgside') {
    const cid = String(body.conv || ''), mid = String(body.msg || '');
    if (!ID.test(cid) || !ID.test(mid)) return json({ error: 'Bad request' }, 400);
    const [cs, ms] = await Promise.all([db.doc(`conversations/${cid}`).get(), db.doc(`conversations/${cid}/messages/${mid}`).get()]);
    const conv = cs.data(), msg = ms.data();
    if (!conv || !msg || msg.from !== uid || msg.system || !(conv.members || []).includes(uid) || Date.now() - (msg.at || 0) > 30 * 60 * 1000) return json({ ok: false, skip: 'invalid' });
    if (!(await once(db, `ms_${cid}_${mid}`))) return json({ ok: true, skip: 'duplicate' });
    if (conv.type === 'dm') { try { await ownerForward(db, uid, name, cid, conv, msg, icon, req); } catch {} try { await supportForward(db, uid, name, cid, conv, msg); } catch {} }
    try { await checkMessage(db, uid, name, cid, conv, mid, msg); } catch {}
    try { await db.doc('stats/' + dayKey()).set({ day: dayKey(), messages: admin.firestore.FieldValue.increment(1) }, { merge: true }); } catch {}
    return json({ ok: true });
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

  // ---------- someone reported a person → tell the support team
  if (body.kind === 'report') {
    const id = String(body.id || ''); if (!ID.test(id)) return json({ error: 'Bad request' }, 400);
    const r = (await db.doc('reports/' + id).get()).data();
    if (!r || r.reporter !== uid || Date.now() - (r.at || 0) > FRESH_MS) return json({ ok: false, skip: 'invalid' });
    if (!(await once(db, 'r_' + id))) return json({ ok: true, skip: 'duplicate' });
    const t = (await db.doc('users/' + (r.target || 'x')).get()).data() || {};
    const sent = await pushAgents(db, { title: '🚩 New report', body: `${name} reported ${t.name || 'someone'}${r.reason ? ' — ' + r.reason : ''}`, url: '/support/#reports', tag: 'rep_' + id });
    return json({ ok: true, sent });
  }

  // ---------- "Test: ring this phone" — rings your OWN phones like a real call (3 rings), 8 seconds from now, so you can close Nexa first
  if (body.kind === 'ringtest') {
    if (!(await once(db, 'rt_' + uid + '_' + Math.floor(Date.now() / 60000)))) return json({ ok: false, skip: 'once-a-minute' });
    const pushDoc = (await db.doc(`users/${uid}/private/push`).get()).data() || {};
    const n = [...new Set([...(pushDoc.tokens || []), ...Object.values(pushDoc.devices || {})])].length;
    if (!n) return json({ ok: false, skip: 'no-devices' });
    const id = 'test' + Date.now().toString(36);
    const rings = (async () => { for (let r = 0; r < 3; r++) { await new Promise(ok => setTimeout(ok, r ? 4500 : 8000)); try { await deliver(db, uid, { kind: 'call', title: 'Nexa Test is calling', body: 'This is a test call — it works! 🎉', chat: '', tag: 'call_' + id, rep: '1', ring: r }, 30, null, pushDoc, 4); } catch {} } })();
    if (ctx.waitUntil) ctx.waitUntil(rings); else await rings;
    return json({ ok: true, devices: n });
  }

  // ---------- incoming call
  if (body.kind === 'call') {
    const id = String(body.id || ''); if (!ID.test(id)) return json({ error: 'Bad request' }, 400);
    const c = (await db.doc('calls/' + id).get()).data();
    if (!c || c.from !== uid || c.status !== 'ringing' || Date.now() - (c.at || 0) > 60000) return json({ ok: false, skip: 'invalid' });
    if (!(await once(db, 'c_' + id))) return json({ ok: true, skip: 'duplicate' });
    const prefs = (await db.doc(`users/${c.to}/private/prefs`).get()).data() || {};
    if (prefs.deviceNotifs === false || (prefs.blocked || []).includes(uid)) return json({ ok: true, skip: 'off' });
    const pushDoc = (await db.doc(`users/${c.to}/private/push`).get()).data() || {};
    const data = r => ({ kind: 'call', title: `${name} is calling`, body: c.kind === 'video' ? 'Video call on Nexa — tap to answer' : 'Voice call on Nexa — tap to answer', chat: c.conv || '', tag: 'call_' + id, icon, rep: '1', ring: r, video: c.kind === 'video' ? '1' : '' });
    const sent = await deliver(db, c.to, data(0), 45, null, pushDoc, 4);
    // Ring again every few seconds while the call is still ringing, so a phone with Nexa closed keeps buzzing
    // like a real call (each ring is a fresh alert with sound) — stops as soon as it's answered, declined,
    // cancelled, or the person is already looking at the call inside Nexa.
    const again = (async () => {
      for (let r = 1; r <= 6; r++) {
        await new Promise(ok => setTimeout(ok, 4500));
        let cur; try { cur = (await db.doc('calls/' + id).get()).data(); } catch { return; }
        if (!cur || cur.status !== 'ringing' || cur.seenAt || Date.now() - (cur.at || 0) > 38000) return;
        try { await deliver(db, c.to, data(r), 30, null, pushDoc, 3); } catch {}
      }
    })();
    if (ctx.waitUntil) ctx.waitUntil(again); else await again;
    return json({ ok: true, sent });
  }

  // ---------- a call stopped ringing (answered, declined or cancelled) → stop it ringing on the other person's phones;
  // if the caller gave up before anyone answered, it becomes "Missed call from …"
  if (body.kind === 'callEnd') {
    const id = String(body.id || ''); if (!ID.test(id)) return json({ error: 'Bad request' }, 400);
    const c = (await db.doc('calls/' + id).get()).data();
    if (!c || (c.from !== uid && c.to !== uid) || Date.now() - (c.at || 0) > 3600000) return json({ ok: false, skip: 'invalid' });
    if (!(await once(db, 'ce_' + id + '_' + uid))) return json({ ok: true, skip: 'duplicate' });
    const missed = uid === c.from && !c.acceptedAt && c.status !== 'accepted';
    const sent = missed
      ? await deliver(db, c.to, { kind: 'missed', title: `Missed ${c.kind === 'video' ? 'video' : 'voice'} call from ${name}`, body: 'Tap to call back', chat: c.conv || '', tag: 'call_' + id, icon }, 86400)
      : await deliver(db, c.to, { kind: 'clear', tag: 'call_' + id }, 60);
    return json({ ok: true, sent, missed });
  }

  return json({ error: 'Unknown kind' }, 400);
};
