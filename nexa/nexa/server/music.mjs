// Nexa music search for moments: "Choose a song" → any song, with a 30-second preview to play.
// Uses Apple's free iTunes Search (no key needed); falls back to Deezer.
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' } });
export default async (req) => {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (!q) return json({ list: [] });
  try {
    const r = await fetch('https://itunes.apple.com/search?' + new URLSearchParams({ term: q, media: 'music', entity: 'song', limit: '20' }));
    if (r.ok) {
      const d = await r.json();
      const list = (d.results || []).filter(x => x.previewUrl).map(x => ({ id: 'it' + x.trackId, t: x.trackName, a: x.artistName, art: (x.artworkUrl100 || '').replace('100x100', '200x200'), url: x.previewUrl, len: 30 }));
      if (list.length) return json({ list });
    }
  } catch {}
  try {
    const r = await fetch('https://api.deezer.com/search?' + new URLSearchParams({ q, limit: '20' }));
    const d = await r.json();
    return json({ list: (d.data || []).filter(x => x.preview).map(x => ({ id: 'dz' + x.id, t: x.title, a: x.artist && x.artist.name, art: x.album && x.album.cover_medium, url: x.preview, len: 30 })) });
  } catch (e) { return json({ list: [], error: 'Music search is busy — try again.' }, 502); }
};
