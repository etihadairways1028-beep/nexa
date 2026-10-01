// Serves a person's profile photo for push notifications, so a message alert shows the sender's
// picture (Android / computers). Links are signed by the push server, so nobody can look up
// photos just by guessing an account id.
import admin from 'firebase-admin';
import crypto from 'node:crypto';

let secret = '';
function init() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  secret = sa.private_key || '';
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
export const avatarSig = (uid, key) => crypto.createHmac('sha256', key).update('avatar:' + uid).digest('base64url').slice(0, 22);

export default async (req) => {
  const u = new URL(req.url), uid = u.searchParams.get('u') || '', sig = u.searchParams.get('s') || '';
  const fallback = () => Response.redirect(new URL('/icon-192.png', u.origin).toString(), 302);
  if (!/^[\w-]{1,128}$/.test(uid)) return fallback();
  try { init(); } catch { return fallback(); }
  if (!secret) { const raw = process.env.FIREBASE_SERVICE_ACCOUNT || ''; try { secret = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')).private_key || ''; } catch {} }
  const want = avatarSig(uid, secret);
  if (!sig || sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return fallback();
  const a = ((await admin.firestore().doc('users/' + uid).get()).data() || {}).avatar || '';
  const m = a.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (m) return new Response(Buffer.from(m[2], 'base64'), { headers: { 'content-type': m[1], 'cache-control': 'public, max-age=3600' } });
  if (/^https:\/\//.test(a)) return Response.redirect(a, 302);
  return fallback();
};
