// Nexa AI on the server: one place that talks to Google Gemini for the app and every Nexa team website.
// Setup (once): make a free API key at https://aistudio.google.com/apikey, then in Cloudflare:
//   Workers & Pages › your Nexa site › Settings › Variables and secrets › Add › GEMINI_API_KEY (Secret)
// If a model is retired, the next one on the list is used automatically.
const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
let preferred = 0;
export const aiReady = () => !!String(process.env.GEMINI_API_KEY || '').trim();
const err = (message, code, status) => Object.assign(new Error(message), { code, status });
const cleanParts = parts => (Array.isArray(parts) ? parts : [{ text: String(parts || '') }]).slice(0, 12).map(p => p && typeof p.text === 'string' ? { text: p.text.slice(0, 20000) } : p && p.inlineData && /^(image|audio)\/[\w.+-]+$/.test(p.inlineData.mimeType || '') && typeof p.inlineData.data === 'string' && p.inlineData.data.length < 4e6 ? { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } } : null).filter(Boolean);
export async function gemini({ system, contents, prompt, search, maxTokens = 1400 }) {
  const key = String(process.env.GEMINI_API_KEY || '').trim();
  if (!key) throw err('Nexa AI isn’t switched on yet (GEMINI_API_KEY is missing in Cloudflare).', 'nokey', 503);
  const conv = Array.isArray(contents) && contents.length
    ? contents.slice(-24).map(c => ({ role: c.role === 'model' ? 'model' : 'user', parts: cleanParts(c.parts) })).filter(c => c.parts.length)
    : [{ role: 'user', parts: cleanParts(prompt) }];
  if (!conv.length) throw err('Ask something first.', 'empty', 400);
  const body = { contents: conv, generationConfig: { temperature: .7, maxOutputTokens: maxTokens }, ...(system ? { systemInstruction: { parts: [{ text: String(system).slice(0, 20000) }] } } : {}), ...(search ? { tools: [{ google_search: {} }] } : {}) };
  let last;
  for (let i = 0; i < MODELS.length; i++) {
    const m = MODELS[(preferred + i) % MODELS.length];
    let r, j;
    try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) }); j = await r.json().catch(() => ({})); }
    catch (e) { last = err('Couldn’t reach Google AI.', 'net', 502); continue; }
    if (r.ok) {
      const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
      if (text) { preferred = (preferred + i) % MODELS.length; return { text, model: m }; }
      last = err(j.candidates?.[0]?.finishReason === 'SAFETY' ? 'Nexa AI can’t help with that one.' : 'Nexa AI didn’t answer. Try asking differently.', 'empty', 422);
      if (search) { delete body.tools; search = false; i--; }
      continue;
    }
    const msg = String(j.error?.message || r.status);
    if (r.status === 429) throw err('Nexa AI is very busy right now. Try again in a minute.', 'quota', 429);
    if (r.status === 400 && /API key|API_KEY/i.test(msg)) throw err('The Nexa AI key in Cloudflare is wrong (GEMINI_API_KEY).', 'badkey', 503);
    if (r.status === 403) throw err('Google blocked Nexa AI: ' + msg.slice(0, 120), 'denied', 503);
    if (search && r.status === 400) { delete body.tools; search = false; i--; continue; } // search not allowed for this model: try again without it
    last = err('Model ' + m + ': ' + msg.slice(0, 120), 'model', 502); // retired / not found: next model
  }
  throw last || err('Nexa AI didn’t answer.', 'empty', 502);
}
