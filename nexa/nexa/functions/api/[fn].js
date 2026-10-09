// Cloudflare Pages Functions: every /api/<name> request runs the matching file in /server.
// (On Netlify these lived at /.netlify/functions/<name>.)
import notify from '../../server/notify.mjs';
import owner from '../../server/owner.mjs';
import support from '../../server/support.mjs';
import music from '../../server/music.mjs';
import avatar from '../../server/avatar.mjs';
import turn from '../../server/turn.mjs';
import quicklogin from '../../server/quicklogin.mjs';

const HANDLERS = { notify, owner, support, music, avatar, turn, quicklogin };

export async function onRequest(ctx) {
  const h = HANDLERS[ctx.params.fn];
  if (!h) return new Response('Not found', { status: 404 });
  // the server code reads its settings from process.env (FIREBASE_SERVICE_ACCOUNT, OWNER_UID, …)
  globalThis.process = globalThis.process || {};
  const pe = globalThis.process.env || (globalThis.process.env = {});
  for (const [k, v] of Object.entries(ctx.env || {})) if (typeof v === 'string') pe[k] = v;
  try {
    return await h(ctx.request, { ip: ctx.request.headers.get('cf-connecting-ip') || '', waitUntil: p => ctx.waitUntil(p) });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error: ' + (e && e.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
}
