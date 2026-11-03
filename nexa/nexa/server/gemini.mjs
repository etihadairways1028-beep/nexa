// Nexa AI on the server: one place that talks to Google Gemini for the app and every Nexa team website.
// Setup (once): make a free API key at https://aistudio.google.com/apikey, then in Cloudflare:
//   Workers & Pages › your Nexa site › Settings › Variables and secrets › Add › GEMINI_API_KEY (Secret)
// If a model is retired, the next one on the list is used automatically.
const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
let preferred = 0;
const ENV = () => globalThis.__nexaEnv || {};
const keyOf = k => String(process.env[k] || '').trim();
export const aiReady = () => !!(ENV().AI || keyOf('ANTHROPIC_API_KEY') || keyOf('GEMINI_API_KEY'));
const err = (message, code, status) => Object.assign(new Error(message), { code, status });
const cleanParts = parts => (Array.isArray(parts) ? parts : [{ text: String(parts || '') }]).slice(0, 12).map(p => p && typeof p.text === 'string' ? { text: p.text.slice(0, 20000) } : p && p.inlineData && /^(image|audio)\/[\w.+-]+$/.test(p.inlineData.mimeType || '') && typeof p.inlineData.data === 'string' && p.inlineData.data.length < 4e6 ? { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } } : null).filter(Boolean);
async function geminiOnly({ system, contents, prompt, search, maxTokens = 1400 }) {
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

// ---------- Nexa AI: works with any of these. The first one that's set up is used:
//  1) Cloudflare Workers AI (free, no key): Cloudflare › your Pages site › Settings › Bindings › Add › Workers AI, name it AI
//  2) Claude (Anthropic): add ANTHROPIC_API_KEY in Settings › Variables and secrets
//  3) Google Gemini: add GEMINI_API_KEY in Settings › Variables and secrets
const textOf = conv => conv.map(c => ({ role: c.role === 'model' ? 'assistant' : 'user', content: c.parts.filter(p => p.text).map(p => p.text).join('\n') })).filter(m => m.content);
const CF_MODELS = ['@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct'];
let cfPref = 0;
async function workersAI({ system, conv, maxTokens }) {
  const AI = ENV().AI, messages = [...(system ? [{ role: 'system', content: String(system).slice(0, 20000) }] : []), ...textOf(conv)];
  let last;
  for (let i = 0; i < CF_MODELS.length; i++) {
    const m = CF_MODELS[(cfPref + i) % CF_MODELS.length];
    try { const r = await AI.run(m, { messages, max_tokens: maxTokens }); const text = String(r?.response ?? r?.result?.response ?? '').trim(); if (text) { cfPref = (cfPref + i) % CF_MODELS.length; return { text, model: m }; } last = err('Nexa AI didn’t answer. Try asking differently.', 'empty', 422); }
    catch (e) { const msg = String(e?.message || e); if (/limit|quota|neuron|429/i.test(msg)) throw err('Nexa AI used up today’s free Cloudflare AI. Try again tomorrow.', 'quota', 429); last = err('Cloudflare AI (' + m + '): ' + msg.slice(0, 120), 'model', 502); }
  }
  throw last;
}
const CLAUDE_MODELS = ['claude-haiku-4-5', 'claude-sonnet-4-5'];
async function claude({ system, conv, maxTokens }) {
  const key = keyOf('ANTHROPIC_API_KEY'); let last;
  const messages = textOf(conv); if (!messages.length || messages[0].role !== 'user') messages.unshift({ role: 'user', content: '(start)' });
  for (const m of CLAUDE_MODELS) {
    let r, j; try { r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: m, max_tokens: maxTokens, ...(system ? { system: String(system).slice(0, 20000) } : {}), messages }) }); j = await r.json().catch(() => ({})); }
    catch { last = err('Couldn’t reach Claude.', 'net', 502); continue; }
    if (r.ok) { const text = (j.content || []).map(c => c.text || '').join('').trim(); if (text) return { text, model: m }; last = err('Nexa AI didn’t answer.', 'empty', 422); continue; }
    if (r.status === 401) throw err('The Claude key in Cloudflare is wrong (ANTHROPIC_API_KEY).', 'badkey', 503);
    if (r.status === 429 || r.status === 529) throw err('Nexa AI is very busy right now. Try again in a minute.', 'quota', 429);
    last = err('Claude ' + m + ': ' + String(j.error?.message || r.status).slice(0, 120), 'model', 502);
  }
  throw last;
}
export async function gemini(opts) {
  const { system, contents, prompt, maxTokens = 1400 } = opts;
  const conv = Array.isArray(contents) && contents.length
    ? contents.slice(-24).map(c => ({ role: c.role === 'model' ? 'model' : 'user', parts: cleanParts(c.parts) })).filter(c => c.parts.length)
    : [{ role: 'user', parts: cleanParts(prompt) }];
  if (!conv.length) throw err('Ask something first.', 'empty', 400);
  const tries = [];
  if (ENV().AI) tries.push(() => workersAI({ system, conv, maxTokens }));
  if (keyOf('ANTHROPIC_API_KEY')) tries.push(() => claude({ system, conv, maxTokens }));
  if (keyOf('GEMINI_API_KEY')) tries.push(() => geminiOnly(opts));
  if (!tries.length) throw err('Nexa AI isn’t switched on yet. In Cloudflare add a Workers AI binding called AI (free), or a Claude / Gemini key.', 'nokey', 503);
  let last;
  for (const t of tries) { try { return await t(); } catch (e) { last = e; if (e.code === 'badkey' && tries.length === 1) throw e; } }
  throw last;
}
