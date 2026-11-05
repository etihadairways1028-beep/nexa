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
// strongest first; if one isn't available on this account, the next one is used
const CF_CHAT = ['@cf/openai/gpt-oss-120b', '@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct'];
const CF_CODE = ['@cf/openai/gpt-oss-120b', '@cf/qwen/qwen2.5-coder-32b-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-4-scout-17b-16e-instruct'];
const bad = new Set(); // models this account can't use (skipped until the server restarts)
const cfText = r => {
  if (!r) return ''; if (typeof r === 'string') return r;
  if (typeof r.response === 'string') return r.response; if (r.response && typeof r.response === 'object') return cfText(r.response);
  if (typeof r.output_text === 'string') return r.output_text;
  const ch = r.choices?.[0]?.message?.content; if (typeof ch === 'string') return ch;
  if (Array.isArray(r.output)) { const hasMsg = r.output.some(o => o && o.type === 'message'); return r.output.filter(o => o && (hasMsg ? o.type === 'message' : o.type !== 'reasoning' && o.content)).flatMap(o => Array.isArray(o.content) ? o.content : [o.content]).map(c => typeof c === 'string' ? c : (c && (c.text || c.output_text)) || '').join(''); }
  if (r.result) return cfText(r.result);
  return '';
};
async function workersAI({ system, conv, maxTokens, code }) {
  const AI = ENV().AI, msgs = textOf(conv), messages = [...(system ? [{ role: 'system', content: String(system).slice(0, 24000) }] : []), ...msgs];
  let last;
  for (const m of (code ? CF_CODE : CF_CHAT)) {
    if (bad.has(m)) continue;
    const big = /gpt-oss/.test(m);
    const tries = big ? [{ messages, max_tokens: Math.max(maxTokens, 4000), reasoning: { effort: code ? 'medium' : 'low' } }, { instructions: system || undefined, input: msgs.map(x => ({ role: x.role, content: x.content })), max_output_tokens: Math.max(maxTokens, 4000), reasoning: { effort: code ? 'medium' : 'low' } }] : [{ messages, max_tokens: maxTokens }];
    for (const body of tries) {
      try { const r = await AI.run(m, body); const text = cfText(r).replace(/^[\s\S]*?<\/think>/, '').trim(); if (text) return { text, model: m }; last = err('Nexa AI didn’t answer. Try asking differently.', 'empty', 422); }
      catch (e) { const msg = String(e?.message || e); if (/limit|quota|neuron|429/i.test(msg)) throw err('Nexa AI used up today’s free Cloudflare AI. Try again tomorrow.', 'quota', 429); if (/not found|no such model|unknown model|5007|not exist/i.test(msg)) { bad.add(m); last = err('Model ' + m + ' isn’t available', 'model', 502); break; } last = err('Cloudflare AI (' + m + '): ' + msg.slice(0, 120), 'model', 502); }
    }
  }
  throw last || err('Nexa AI didn’t answer.', 'empty', 502);
}
const CLAUDE_MODELS = ['claude-sonnet-4-5', 'claude-haiku-4-5'];
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
  const { system, contents, prompt, maxTokens = 1400, code } = opts;
  const conv = Array.isArray(contents) && contents.length
    ? contents.slice(-24).map(c => ({ role: c.role === 'model' ? 'model' : 'user', parts: cleanParts(c.parts) })).filter(c => c.parts.length)
    : [{ role: 'user', parts: cleanParts(prompt) }];
  if (!conv.length) throw err('Ask something first.', 'empty', 400);
  const tries = [];
  // Claude first when its key is set (strongest), then Cloudflare's free AI, then Gemini
  if (keyOf('ANTHROPIC_API_KEY')) tries.push(() => claude({ system, conv, maxTokens }));
  if (ENV().AI) tries.push(() => workersAI({ system, conv, maxTokens, code }));
  if (keyOf('GEMINI_API_KEY')) tries.push(() => geminiOnly(opts));
  if (!tries.length) throw err('Nexa AI isn’t switched on yet. In Cloudflare add a Workers AI binding called AI (free), or a Claude / Gemini key.', 'nokey', 503);
  let last;
  for (const t of tries) { try { return await t(); } catch (e) { last = e; if (e.code === 'badkey' && tries.length === 1) throw e; } }
  throw last;
}
