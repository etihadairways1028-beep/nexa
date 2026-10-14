// Serves manifest.webmanifest with the festival logo during Halloween, Diwali and Christmas,
// so Android picks up the festive home-screen icon (it checks the manifest about once a day).
import { festIconNow } from '../server/festicon.mjs';
export async function onRequest(ctx) {
  const res = await ctx.next();
  try {
    const m = await res.clone().json();
    const k = festIconNow();
    if (k) m.icons = [
      { src: `icon-192-${k}.png`, sizes: '192x192', type: 'image/png' },
      { src: `icon-512-${k}.png`, sizes: '512x512', type: 'image/png' },
      { src: `icon-maskable-${k}.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ];
    return new Response(JSON.stringify(m), { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=3600' } });
  } catch { return res; }
}
