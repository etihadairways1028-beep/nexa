// Nexa email: every email Nexa sends goes through here.
// Uses your own SMTP server (set in Nexa Support → Settings → Email, or SMTP_* settings on the server),
// and falls back to Resend (RESEND_API_KEY) if no SMTP server is set.
// The SMTP client is built in (no extra packages): plain, STARTTLS (port 587) or SSL/TLS (port 465).
import admin from './fbadmin.js';
import { Buffer } from 'node:buffer';

const env = k => (globalThis.process && process.env && process.env[k]) || '';
const DOC = 'supportSecrets/main';

// ---- where the settings come from: the support page first, then the server settings
export async function smtpSettings(db) {
  let s = null;
  try { s = ((await db.doc(DOC).get()).data() || {}).smtp || null; } catch {}
  if (s && s.host && s.enabled !== false) return { source: 'support', ...s };
  if (env('SMTP_HOST')) return { source: 'server', host: env('SMTP_HOST'), port: +env('SMTP_PORT') || 587, security: env('SMTP_SECURITY') || (env('SMTP_PORT') === '465' ? 'ssl' : 'starttls'), user: env('SMTP_USER'), pass: env('SMTP_PASS'), from: env('SMTP_FROM') || env('SMTP_USER'), fromName: env('SMTP_FROM_NAME') || 'Nexa' };
  return null;
}
export const mailReady = async db => !!(await smtpSettings(db)) || !!env('RESEND_API_KEY');

const b64 = s => Buffer.from(String(s), 'utf8').toString('base64');
const encWord = s => /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + b64(s) + '?=';
const addr = (name, email) => name ? `"${encWord(String(name).replace(/["\\\r\n]/g, ''))}" <${email}>` : `<${email}>`;
const clean = s => String(s || '').replace(/[\r\n]/g, ' ').trim();
const wrap76 = s => s.replace(/.{1,76}/g, m => m + '\r\n');

function buildMessage({ from, fromName, to, subject, text, html, replyTo }) {
  const boundary = 'nexa_' + Math.random().toString(36).slice(2);
  const domain = String(from).split('@')[1] || 'nexa.local';
  const head = [
    'From: ' + addr(fromName, from),
    'To: ' + [].concat(to).map(t => '<' + clean(t) + '>').join(', '),
    'Subject: ' + encWord(clean(subject)),
    'Date: ' + new Date().toUTCString(),
    'Message-ID: <' + Date.now().toString(36) + '.' + Math.random().toString(36).slice(2) + '@' + domain + '>',
    'MIME-Version: 1.0',
    ...(replyTo ? ['Reply-To: <' + clean(replyTo) + '>'] : []),
    'Content-Type: multipart/alternative; boundary="' + boundary + '"'
  ].join('\r\n');
  const part = (type, body) => `--${boundary}\r\nContent-Type: ${type}; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(b64(body))}`;
  return head + '\r\n\r\n' + part('text/plain', text || '') + '\r\n' + part('text/html', html || `<p>${String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`) + `\r\n--${boundary}--\r\n`;
}

// ---- a tiny SMTP client. Works on Cloudflare (cloudflare:sockets) and on plain Node.js (net/tls).
const isWorkers = () => typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
const te = new TextEncoder(), td = new TextDecoder();
async function openConn(s) {
  const port = +s.port || (s.security === 'ssl' ? 465 : 587);
  if (isWorkers()) {
    const { connect } = await import('cloudflare:sockets');
    let sock = connect({ hostname: s.host, port }, { secureTransport: s.security === 'ssl' ? 'on' : s.security === 'none' ? 'off' : 'starttls', allowHalfOpen: false });
    let rd = sock.readable.getReader(), wr = sock.writable.getWriter();
    return {
      write: str => wr.write(te.encode(str)),
      read: async () => { const { value, done } = await rd.read(); return done ? null : td.decode(value, { stream: true }); },
      startTls: async () => { rd.releaseLock(); wr.releaseLock(); sock = sock.startTls(); rd = sock.readable.getReader(); wr = sock.writable.getWriter(); },
      close: () => { try { sock.close(); } catch {} }
    };
  }
  const net = await import('node:net'), tls = await import('node:tls');
  let sock, q = [], waiting = null, ended = null;
  const push = v => { if (waiting) { const w = waiting; waiting = null; w(v); } else q.push(v); };
  const hook = sk => { sk.on('data', d => push(d.toString('utf8'))); sk.on('error', e => { ended = e; push(null); }); sk.on('close', () => push(null)); };
  sock = await new Promise((res, rej) => { const o = { host: s.host, port, servername: /^[\d.]+$/.test(s.host) ? undefined : s.host }; const c = s.security === 'ssl' ? tls.connect(o, () => res(c)) : net.connect(o, () => res(c)); c.once('error', rej); });
  hook(sock);
  return {
    write: str => new Promise(r => sock.write(str, r)),
    read: () => q.length ? Promise.resolve(q.shift()) : new Promise(r => { waiting = r; }),
    startTls: async () => { sock.removeAllListeners('data'); sock.removeAllListeners('close'); sock.removeAllListeners('error'); q = []; sock = await new Promise((res, rej) => { const t = tls.connect({ socket: sock, servername: /^[\d.]+$/.test(s.host) ? undefined : s.host }, () => res(t)); t.once('error', rej); }); hook(sock); },
    close: () => { try { sock.end(); sock.destroy(); } catch {} },
    get error() { return ended; }
  };
}
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(what)), ms))]);
async function smtpSend(s, msg) {
  let c;
  try { c = await withTimeout(openConn(s), 15000, 'The email server didn\'t answer (timed out). Check the server name and port.'); }
  catch (e) { throw new Error(/ECONNREFUSED|refused/i.test(e.message) ? 'The email server refused the connection — check the server name and port.' : /ENOTFOUND|resolve|DNS/i.test(e.message) ? 'Couldn\'t find that email server — check the server name.' : e.message); }
  let buf = '';
  // one reply can be several lines ("250-…" … "250 …")
  const reply = async () => {
    for (;;) {
      const lines = buf.split(/\r?\n/);
      for (let i = 0; i < lines.length - 1; i++) if (/^\d{3}(?: |$)/.test(lines[i])) { const out = lines.slice(0, i + 1); buf = lines.slice(i + 1).join('\r\n'); return { code: +out[i].slice(0, 3), text: out.join('\n') }; }
      const chunk = await withTimeout(c.read(), 20000, 'The email server stopped answering (timed out). Check the port and security setting.');
      if (chunk == null) throw new Error('The email server closed the connection' + (c.error ? ' (' + c.error.message + ')' : '') + '. Check the port and security setting.');
      buf += chunk;
    }
  };
  const cmd = async (line, ok = [250]) => {
    if (line != null) await c.write(line + '\r\n');
    const r = await reply();
    if (!ok.includes(r.code)) { const last = r.text.split('\n').pop(); throw new Error(r.code === 535 || r.code === 534 ? 'The email server said the username or password is wrong (' + last + ').' : 'Email server said: ' + last); }
    return r;
  };
  let stage = 'connect';
  try {
    await cmd(null, [220]); stage = 'hello';
    let ehlo = await cmd('EHLO nexa.local');
    if (s.security === 'starttls' || (s.security !== 'ssl' && s.security !== 'none' && /STARTTLS/i.test(ehlo.text))) {
      if (!/STARTTLS/i.test(ehlo.text)) throw new Error('This email server doesn\'t offer STARTTLS on this port. Try port 465 with SSL/TLS.');
      await cmd('STARTTLS', [220]); buf = ''; stage = 'tls';
      await c.startTls();
      ehlo = await cmd('EHLO nexa.local');
    }
    stage = 'login';
    if (s.user) {
      if (/AUTH[^\n]*PLAIN/i.test(ehlo.text)) await cmd('AUTH PLAIN ' + b64('\0' + s.user + '\0' + s.pass), [235]);
      else { await cmd('AUTH LOGIN', [334]); await cmd(b64(s.user), [334]); await cmd(b64(s.pass), [235]); }
    }
    await cmd('MAIL FROM:<' + clean(s.from) + '>');
    for (const t of [].concat(msg.to)) await cmd('RCPT TO:<' + clean(t) + '>', [250, 251]);
    await cmd('DATA', [354]);
    await c.write(msg.raw.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..') + '\r\n.\r\n');
    await cmd(null, [250]);
    try { await c.write('QUIT\r\n'); } catch {}
  } catch (e) {
    if (/^(Email server said|The email server said)/.test(e.message)) throw e;
    if (stage === 'connect') throw new Error(s.security === 'ssl' ? 'Couldn\'t connect securely to the email server — check the server name, the port (usually 465 for SSL/TLS) and the security setting.' : 'Couldn\'t connect to the email server — check the server name and port (usually 587).');
    if (stage === 'tls') throw new Error('The secure connection (STARTTLS) failed — check the security setting, or try port 465 with SSL/TLS.');
    throw e;
  } finally { setTimeout(() => c.close(), 300); }
}

// ---- send one email. Returns { ok:true, via } or throws with a readable message.
export async function sendMail(db, { to, subject, text, html, replyTo }) {
  if (!to) throw new Error('No email address');
  const s = await smtpSettings(db);
  if (s) {
    const from = s.from || s.user; if (!from) throw new Error('Set the "From" email address in the email settings.');
    await smtpSend(s, { to, raw: buildMessage({ from, fromName: s.fromName || 'Nexa', to, subject, text, html, replyTo }) });
    return { ok: true, via: 'smtp' };
  }
  if (env('RESEND_API_KEY')) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env('RESEND_API_KEY'), 'content-type': 'application/json' }, body: JSON.stringify({ from: env('RESEND_FROM') || 'Nexa <onboarding@resend.dev>', to: [].concat(to), subject, text, html }) });
    if (!r.ok) throw new Error('The email couldn\'t be sent (Resend said ' + r.status + ').');
    return { ok: true, via: 'resend' };
  }
  throw new Error('No email server is set up yet. Add one in Nexa Support → Settings → Email.');
}

// ---- a simple branded email layout
export function emailHtml(title, bodyHtml, button) {
  return `<!doctype html><html><body style="margin:0;background:#070b1d;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#e8ecff">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070b1d;padding:28px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111735;border-radius:22px;padding:30px;border:1px solid #26305f">
<tr><td style="font-size:13px;letter-spacing:.3em;color:#9fb0ff;font-weight:700">N E X A</td></tr>
<tr><td style="font-size:24px;font-weight:800;padding:14px 0 8px;color:#fff">${title}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#c9d1f5">${bodyHtml}</td></tr>
${button ? `<tr><td style="padding-top:22px"><a href="${button.url}" style="display:inline-block;background:linear-gradient(135deg,#5b7cff,#9b6bff);color:#fff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:14px">${button.label}</a></td></tr>` : ''}
<tr><td style="padding-top:26px;font-size:12px;color:#7d87b8">Sent by Nexa · A messaging app like never before</td></tr>
</table></td></tr></table></body></html>`;
}
export const _admin = admin;
