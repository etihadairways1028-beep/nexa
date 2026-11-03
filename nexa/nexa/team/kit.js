// Nexa team websites kit: shared by /videoeditor/ (Nexa Studio) and /webdev/ (Nexa Dev Hub).
// Sign-in, liquid-glass layout, files, team chat and Nexa AI. Each site adds its own tabs.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const S = { tab: 'home', data: null, modal: null, ai: { open: false, msgs: [], busy: false }, up: null };
let CFG = null, root = null, lastJson = '', pollT = 0;
const LS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
const skey = () => 'nexa.team.' + CFG.site;

export const ic = n => ({
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h11"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  send: '<path d="M4 12l16-8-6 16-2-6z"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  up: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  play: '<path d="M7 5v14l12-7z"/>', pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
}[n] || '');
export const icon = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic(n)}</svg>`;
export const ago = t => { const d = (Date.now() - t) / 1000; if (d < 60) return 'just now'; if (d < 3600) return Math.floor(d / 60) + 'm ago'; if (d < 86400) return Math.floor(d / 3600) + 'h ago'; if (d < 7 * 86400) return Math.floor(d / 86400) + 'd ago'; return new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' }); };
export const size = n => n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
export const avatar = (name, sz = 34) => { const h = [...String(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360; return `<span class="av" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * .42)}px;background:linear-gradient(135deg,hsl(${h} 80% 66%),hsl(${(h + 50) % 360} 80% 58%))">${esc(String(name || '?')[0].toUpperCase())}</span>`; };

export function toast(msg, ms = 2600) { let t = document.querySelector('.k-toast'); if (!t) { t = document.createElement('div'); t.className = 'k-toast'; document.body.append(t); } t.innerHTML = msg; t.classList.add('on'); clearTimeout(t._h); if (ms) t._h = setTimeout(() => t.classList.remove('on'), ms); }

export async function api(action, data = {}) {
  const r = await fetch('/api/team', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ site: CFG.site, session: LS.get(skey()), action, ...data }) });
  let j = {}; try { j = await r.json(); } catch {}
  if (r.status === 401 && j.error === 'session') { LS.set(skey(), null); S.data = null; render(); throw new Error('Please sign in again.'); }
  if (!r.ok) { const e = new Error(j.error || 'Something went wrong (' + r.status + ')'); e.code = j.code; throw e; }
  return j;
}
export async function reload(force) {
  if (!LS.get(skey())) return;
  try {
    const d = await api('load'); const js = JSON.stringify(d);
    if (!force && js === lastJson) return; lastJson = js; S.data = d;
    const a = document.activeElement, typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && root.contains(a);
    if (force || (!typing && !S.modal && !(CFG.tabs.find(t => t.id === S.tab) || {}).live)) render();
    else if (S.tab === 'chat') paintChat();
  } catch (e) { if (force) toast(esc(e.message)); }
}

// ---------- files: stored in pieces on the server
const blobs = new Map();
export async function uploadFile(file, folder, extra = {}) {
  if (file.size > 40e6) { toast('Files can be up to 40 MB. Try a shorter or smaller video.'); return null; }
  const thumb = extra.thumb ?? await makeThumb(file).catch(() => '');
  const st = await api('fileStart', { name: file.name, type: file.type, size: file.size, folder, thumb, dur: extra.dur || 0 });
  const buf = new Uint8Array(await file.arrayBuffer()), n = Math.ceil(buf.length / st.part);
  for (let i = 0; i < n; i++) {
    toast(`${icon('up', 16)} Uploading ${esc(file.name)}… ${Math.round(i / n * 100)}%`, 0);
    const part = buf.subarray(i * st.part, (i + 1) * st.part); let b = ''; for (let j = 0; j < part.length; j += 32768) b += String.fromCharCode.apply(null, part.subarray(j, j + 32768));
    let tries = 0; for (;;) { try { await api('filePart', { id: st.id, n: i, data: btoa(b) }); break; } catch (e) { if (++tries > 2) throw e; await new Promise(r => setTimeout(r, 800)); } }
  }
  blobs.set(st.id, new Blob([buf], { type: file.type }));
  toast(`${icon('check', 16)} ${esc(file.name)} uploaded`); await reload(true); return st.id;
}
export async function getBlob(f, onP) {
  if (blobs.has(f.id)) return blobs.get(f.id);
  const parts = [];
  for (let i = 0; i < f.parts; i++) { onP && onP(i / f.parts); const { data } = await api('filePart', { id: f.id, n: i }); const bin = atob(data), u = new Uint8Array(bin.length); for (let j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j); parts.push(u); }
  const b = new Blob(parts, { type: f.type }); blobs.set(f.id, b); return b;
}
export function makeThumb(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), done = el => { const c = document.createElement('canvas'), w = el.videoWidth || el.naturalWidth, h = el.videoHeight || el.naturalHeight, k = Math.min(1, 320 / Math.max(w, h)); c.width = Math.max(1, w * k); c.height = Math.max(1, h * k); c.getContext('2d').drawImage(el, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .7)); };
    if (/^image\//.test(file.type)) { const i = new Image(); i.onload = () => done(i); i.onerror = rej; i.src = url; }
    else if (/^video\//.test(file.type)) { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 3); }; v.onseeked = () => done(v); v.onerror = rej; v.src = url; setTimeout(() => rej(new Error('slow')), 8000); }
    else res('');
  });
}
export function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
export const pickFile = (accept, multiple) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || ''; i.multiple = !!multiple; i.onchange = () => res([...i.files]); i.click(); });

// ---------- shared views
const folderOf = f => /^video\//.test(f.type) ? 'video' : /^image\//.test(f.type) ? 'image' : 'other';
function vFiles() {
  const F = (S.data.file || []).filter(f => f.ready), fl = S.ff || 'all';
  const list = F.filter(f => fl === 'all' || folderOf(f) === fl);
  return `<div class="k-head"><div><h1 class="k-h1">Files</h1><p class="mute">${CFG.filesHint}</p></div><button class="k-btn pri" data-a="upload">${icon('up', 18)} Upload</button></div>
  <div class="k-pills">${[['all', 'All'], ['video', 'Videos'], ['image', 'Pictures & designs'], ['other', 'Other']].map(([k, l]) => `<button class="k-pill ${fl === k ? 'on' : ''}" data-a="ff" data-v="${k}">${l} <span class="mute">${k === 'all' ? F.length : F.filter(f => folderOf(f) === k).length}</span></button>`).join('')}</div>
  ${list.length ? `<div class="k-grid">${list.map(f => `<button class="k-file glass" data-a="openFile" data-v="${f.id}"><span class="k-thumb">${f.thumb ? `<img src="${esc(f.thumb)}" alt="" loading="lazy">` : `<span class="k-ext">${esc((f.name.split('.').pop() || 'file').slice(0, 5).toUpperCase())}</span>`}${folderOf(f) === 'video' ? `<span class="k-play">${icon('play', 16)}</span>` : ''}</span><span class="k-fname">${esc(f.name)}</span><span class="mute small">${esc(f.by === S.data.me.id ? 'You' : (S.data.team.find(t => t.id === f.by) || {}).name || 'Someone')} · ${size(f.size)} · ${ago(f.at)}${(f.comments || []).length ? ' · 💬 ' + f.comments.length : ''}</span></button>`).join('')}</div>`
    : `<div class="k-empty glass">${icon('folder', 34)}<b>No files here yet</b><span class="mute">Drop files anywhere on this page, or press Upload.</span></div>`}`;
}
function vChat() {
  return `<div class="k-head"><div><h1 class="k-h1">Team chat</h1><p class="mute">Only the ${esc(CFG.name)} team sees this. ${esc(CFG.chatHint || '')}</p></div></div>
  <div class="k-chat glass"><div class="k-stream" id="kstream"></div><form class="k-comp" id="f-say"><input class="k-in" id="say" placeholder="Message the team" autocomplete="off" maxlength="2000"><button class="k-send" aria-label="Send">${icon('send', 18)}</button></form></div>`;
}
function paintChat() {
  const el = document.getElementById('kstream'); if (!el) return; const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  const M = S.data.msg || [];
  el.innerHTML = M.length ? M.map((m, i) => { const mine = m.by === S.data.me.id, first = i === 0 || M[i - 1].by !== m.by || m.at - M[i - 1].at > 5 * 60e3; return `<div class="k-m ${mine ? 'me' : ''} ${first ? 'first' : ''}">${first && !mine ? avatar(m.name, 30) : '<span class="k-avsp"></span>'}<div>${first ? `<div class="k-who"><b>${esc(mine ? 'You' : m.name)}</b> <span class="mute">${ago(m.at)}</span></div>` : ''}<div class="k-bub">${linkify(esc(m.text))}</div></div></div>`; }).join('') : '<div class="k-empty">Say hi to the team 👋</div>';
  if (near || !el.dataset.done) { el.scrollTop = el.scrollHeight; el.dataset.done = 1; }
}
export const linkify = s => s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
export const md = s => esc(s).replace(/```(\w*)\n?([\s\S]*?)```/g, (_, l, c) => `<pre class="k-code"><code>${c}</code></pre>`).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/^#{1,4} (.+)$/gm, '<b>$1</b>').replace(/^[-*] (.+)$/gm, '• $1').replace(/\n/g, '<br>').replace(/<pre class="k-code"><code>([\s\S]*?)<\/code><\/pre>/g, m => m.replace(/<br>/g, '\n'));

// ---------- Nexa AI drawer
function vAI() {
  const A = S.ai; if (!A.open) return '';
  return `<div class="k-ai glass" role="dialog" aria-label="Nexa AI"><div class="k-aihead"><span class="k-aiorb">${icon('spark', 18)}</span><div><b>Nexa AI</b><div class="mute small">${esc(CFG.aiHint)}</div></div><button class="k-x" data-a="aiClose" aria-label="Close">${icon('x', 18)}</button></div>
  <div class="k-aistream" id="aistream">${A.msgs.length ? A.msgs.map(m => `<div class="k-aim ${m.role}">${m.role === 'user' ? esc(m.text) : md(m.text)}</div>`).join('') : `<div class="mute small" style="padding:4px 2px 10px">Try one:</div>${CFG.aiStarters.map(q => `<button class="k-starter" data-a="aiAsk" data-v="${esc(q)}">${esc(q)}</button>`).join('')}`}${A.busy ? '<div class="k-aim model"><span class="k-dots"><i></i><i></i><i></i></span></div>' : ''}</div>
  <form class="k-comp" id="f-ai"><input class="k-in" id="aiq" placeholder="Ask Nexa AI" autocomplete="off"><button class="k-send" aria-label="Ask">${icon('send', 18)}</button></form></div>`;
}
export async function askAI(q, opts = {}) {
  const A = S.ai; if (!opts.silent) { A.open = true; A.msgs.push({ role: 'user', text: q }); A.busy = true; render(); }
  try {
    const contents = opts.silent ? null : A.msgs.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const { text } = await api('ai', contents ? { contents } : { prompt: q });
    if (opts.silent) return text;
    A.msgs.push({ role: 'model', text: text || 'No answer, try again.' });
  } catch (e) {
    const msg = e.code === 'nokey' ? 'Nexa AI isn’t switched on yet. The owner adds GEMINI_API_KEY in Cloudflare (Settings › Variables and secrets).' : e.code === 'quota' ? 'Nexa AI is busy right now (free limit). Try again in a minute.' : 'Nexa AI had a problem: ' + e.message;
    if (opts.silent) throw new Error(msg);
    A.msgs.push({ role: 'model', text: msg });
  }
  A.busy = false; render(); const s = document.getElementById('aistream'); if (s) s.scrollTop = s.scrollHeight;
}

// ---------- layout
function vLogin() {
  const L = S.login || {};
  return `<div class="k-login"><div class="k-lcard glass k-enter"><div class="k-logo">${CFG.emoji}</div><h1 class="k-serif">${esc(CFG.name)}</h1><p class="mute">${esc(CFG.tagline)}</p>
  ${L.names == null ? '<div class="k-skel" style="height:44px"></div>' : L.names.length ? `<div class="mute small" style="margin:14px 0 8px">Who are you?</div><div class="k-names">${L.names.map(n => `<button class="k-pill ${L.pick === n.id ? 'on' : ''}" data-a="pick" data-v="${n.id}">${avatar(n.name, 24)} ${esc(n.name)}</button>`).join('')}</div>
  <form id="f-login" class="k-lform"><input class="k-in" id="lpw" type="password" placeholder="Password" autocomplete="current-password" ${L.pick ? 'autofocus' : 'disabled'}><button class="k-btn pri" ${L.pick ? '' : 'disabled'}>Sign in</button></form>${L.err ? `<div class="k-err">${esc(L.err)}</div>` : ''}`
    : `<div class="k-note">No one has a login yet. The owner adds people on the <b>owner page › Team</b>, or by accepting a job application.</div>`}
  <div class="mute small" style="margin-top:16px">For the Nexa Team only · <a href="/hiring/">Join the team</a></div></div></div>`;
}
function vShell() {
  const D = S.data, tab = CFG.tabs.find(t => t.id === S.tab) || CFG.tabs[0];
  const online = D.team.filter(t => t.online);
  return `<div class="k-shell"><aside class="k-side glass"><div class="k-brand"><span class="k-logo sm">${CFG.emoji}</span><div><b>${esc(CFG.name)}</b><div class="mute small">Nexa Team</div></div></div>
    <nav class="k-nav">${CFG.tabs.map(t => `<button class="k-navb ${t.id === tab.id ? 'on' : ''}" data-a="tab" data-v="${t.id}">${icon(t.icon)}<span>${esc(t.label)}</span>${t.badge && t.badge(D) ? `<span class="k-badge">${t.badge(D)}</span>` : ''}</button>`).join('')}</nav>
    <div class="k-sidefoot"><div class="mute small" style="margin-bottom:8px">Online now</div><div class="k-online">${online.map(t => `<span title="${esc(t.name)}" class="k-on">${avatar(t.name, 28)}</span>`).join('') || '<span class="mute small">Just you</span>'}</div>
    <button class="k-navb" data-a="logout">${icon('out')}<span>Sign out (${esc(D.me.name)})</span></button></div></aside>
  <main class="k-main"><div class="k-top"><span class="k-logo sm k-mob">${CFG.emoji}</span><b class="k-mob">${esc(tab.label)}</b><span style="flex:1"></span><button class="k-btn ai" data-a="aiOpen">${icon('spark', 18)} Nexa AI</button></div>
    <div class="k-page k-enter" data-key="${tab.id}">${tab.id === 'files' ? vFiles() : tab.id === 'chat' ? vChat() : tab.view(S)}</div></main>
  <nav class="k-tabbar glass">${CFG.tabs.filter(t => !t.desktopOnly).slice(0, 5).map(t => `<button class="${t.id === tab.id ? 'on' : ''}" data-a="tab" data-v="${t.id}">${icon(t.icon, 22)}<span>${esc(t.short || t.label)}</span></button>`).join('')}</nav>
  ${vAI()}${S.modal ? `<div class="k-modal" data-a="modalBg"><div class="k-mcard glass" role="dialog">${S.modal.html()}</div></div>` : ''}</div>`;
}
let lastTab = '';
export function render() {
  if (!root) return;
  if (!LS.get(skey()) || !S.data) { root.innerHTML = vLogin(); if (!S.login) loadNames(); return; }
  const tab = CFG.tabs.find(t => t.id === S.tab) || CFG.tabs[0];
  if (tab.live && lastTab === tab.id && root.querySelector('.k-page')) {
    // a live tab (like the video editor) keeps its DOM: only refresh the overlays
    root.querySelectorAll('.k-ai,.k-modal').forEach(e => e.remove());
    root.querySelector('.k-shell').insertAdjacentHTML('beforeend', vAI() + (S.modal ? `<div class="k-modal" data-a="modalBg"><div class="k-mcard glass" role="dialog">${S.modal.html()}</div></div>` : ''));
    S.modal?.after && S.modal.after(); return;
  }
  const same = lastTab === tab.id; root.innerHTML = vShell(); if (same) root.querySelector('.k-page')?.classList.remove('k-enter');
  if (lastTab !== tab.id) { lastTab = tab.id; tab.mount && tab.mount(root.querySelector('.k-page')); }
  else if (tab.mount && !tab.live) tab.mount(root.querySelector('.k-page'));
  if (tab.id === 'chat') paintChat();
  S.modal?.after && S.modal.after();
  const s = document.getElementById('aistream'); if (s) s.scrollTop = s.scrollHeight;
}
async function loadNames() { S.login = { names: null }; try { const r = await fetch('/api/team', { method: 'POST', body: JSON.stringify({ site: CFG.site, action: 'names' }) }).then(r => r.json()); S.login = { names: r.names || [] }; } catch { S.login = { names: [], err: 'Can’t reach the server. Check your internet.' }; } render(); }
export function openModal(html, after) { S.modal = { html, after }; render(); }
export function closeModal() { S.modal = null; render(); }

// ---------- file modal
function fileModal(id) {
  const f = (S.data.file || []).find(x => x.id === id); if (!f) return;
  openModal(() => { const F = (S.data.file || []).find(x => x.id === id) || f; return `<div class="k-mhead"><b>${esc(F.name)}</b><button class="k-x" data-a="close">${icon('x', 18)}</button></div>
    <div class="k-prev" id="fprev">${F.thumb ? `<img src="${esc(F.thumb)}" alt="" style="filter:blur(6px);opacity:.6">` : ''}<span class="k-load">Loading…</span></div>
    <div class="mute small">${esc((S.data.team.find(t => t.id === F.by) || {}).name || 'Someone')} · ${size(F.size)} · ${ago(F.at)}</div>
    <div class="k-row" style="margin:12px 0"><button class="k-btn" data-a="dlFile" data-v="${F.id}">${icon('dl', 18)} Download</button>${CFG.fileActions ? CFG.fileActions(F) : ''}${F.by === S.data.me.id ? `<button class="k-btn danger" data-a="delFile" data-v="${F.id}">${icon('trash', 18)} Delete</button>` : ''}</div>
    ${vComments(F, 'file')}`; }, async () => {
    const el = document.getElementById('fprev'); if (!el || el.dataset.ok) return; el.dataset.ok = 1;
    try { const b = await getBlob(f, p => { const l = el.querySelector('.k-load'); if (l) l.textContent = 'Loading… ' + Math.round(p * 100) + '%'; }); const u = URL.createObjectURL(b); const e2 = document.getElementById('fprev'); if (!e2) return;
      e2.innerHTML = /^video\//.test(f.type) ? `<video src="${u}" controls playsinline></video>` : /^image\//.test(f.type) ? `<img src="${u}" alt="">` : /^text\/html/.test(f.type) ? `<iframe sandbox="allow-scripts" src="${u}"></iframe>` : `<span class="k-ext big">${esc((f.name.split('.').pop() || '').toUpperCase())}</span>`; e2.dataset.ok = 1;
    } catch (e) { el.innerHTML = '<span class="k-load">Couldn’t load: ' + esc(e.message) + '</span>'; }
  });
}
export function vComments(it, kind) {
  const C = it.comments || [];
  return `<div class="k-comments"><div class="mute small" style="margin-bottom:8px">Comments ${C.length ? '· ' + C.length : ''}</div>${C.map(c => `<div class="k-cm ${c.owner ? 'own' : ''}">${avatar(c.name, 26)}<div><b>${esc(c.name)}</b>${c.owner ? ' <span class="k-tag">Owner</span>' : ''} <span class="mute small">${ago(c.at)}</span><div>${linkify(esc(c.text))}</div></div></div>`).join('')}
  <form class="k-comp" data-form="comment" data-kind="${kind}" data-id="${it.id}"><input class="k-in" name="c" placeholder="Add a comment" autocomplete="off" maxlength="1000"><button class="k-send" aria-label="Send">${icon('send', 18)}</button></form></div>`;
}

// ---------- events
const common = {
  tab: d => { CFG.onTab && CFG.onTab(d.v); S.tab = d.v; S.modal = null; history.replaceState(null, '', '#' + d.v); render(); window.scrollTo(0, 0); },
  pick: d => { S.login.pick = d.v; S.login.err = ''; render(); setTimeout(() => document.getElementById('lpw')?.focus(), 30); },
  logout: () => { LS.set(skey(), null); S.data = null; S.login = null; lastTab = ''; render(); },
  aiOpen: () => { S.ai.open = !S.ai.open; render(); setTimeout(() => document.getElementById('aiq')?.focus(), 30); },
  aiClose: () => { S.ai.open = false; render(); },
  aiAsk: d => askAI(d.v),
  ff: d => { S.ff = d.v; render(); },
  upload: async () => { const fs = await pickFile(CFG.accept || '', true); for (const f of fs) await uploadFile(f, CFG.site).catch(e => toast(esc(e.message))); },
  openFile: d => fileModal(d.v),
  dlFile: async d => { const f = S.data.file.find(x => x.id === d.v); toast('Getting the file…', 0); try { download(await getBlob(f), f.name); toast('Downloaded'); } catch (e) { toast(esc(e.message)); } },
  delFile: async d => { if (!confirm('Delete this file for everyone?')) return; await api('del', { kind: 'file', id: d.v }); S.modal = null; await reload(true); toast('Deleted'); },
  close: () => closeModal(),
  modalBg: (d, e) => { if (e.target.classList.contains('k-modal')) closeModal(); },
};
async function onSubmit(e) {
  const f = e.target; e.preventDefault();
  if (f.id === 'f-login') {
    const pw = document.getElementById('lpw').value; if (!pw) return;
    try { const r = await fetch('/api/team', { method: 'POST', body: JSON.stringify({ site: CFG.site, action: 'login', id: S.login.pick, password: pw }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not sign in'); LS.set(skey(), j.session); S.login = null; await reload(true); }
    catch (er) { S.login.err = er.message; render(); }
    return;
  }
  if (f.id === 'f-say') { const i = document.getElementById('say'), t = i.value.trim(); if (!t) return; i.value = ''; S.data.msg.push({ by: S.data.me.id, name: S.data.me.name, text: t, at: Date.now() }); paintChat(); try { await api('say', { text: t }); reload(); } catch (er) { toast(esc(er.message)); } return; }
  if (f.id === 'f-ai') { const i = document.getElementById('aiq'), t = i.value.trim(); if (!t || S.ai.busy) return; i.value = ''; askAI(t); return; }
  if (f.dataset.form === 'comment') { const t = f.c.value.trim(); if (!t) return; f.c.value = ''; try { await api('comment', { kind: f.dataset.kind, id: f.dataset.id, text: t }); await reload(true); } catch (er) { toast(esc(er.message)); } return; }
  CFG.onSubmit && CFG.onSubmit(f, e);
}

export function boot(cfg) {
  CFG = cfg; root = document.getElementById('app');
  const h = location.hash.slice(1); if (CFG.tabs.some(t => t.id === h)) S.tab = h;
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el || !root.contains(el)) return;
    const a = el.dataset.a, fn = common[a] || (CFG.actions || {})[a]; if (!fn) return;
    if (el.tagName === 'A') e.preventDefault(); if (a !== 'modalBg') e.stopPropagation();
    fn(el.dataset, e, el);
  });
  root.addEventListener('submit', onSubmit);
  root.addEventListener('input', e => CFG.onInput && CFG.onInput(e));
  root.addEventListener('change', e => CFG.onChange && CFG.onChange(e));
  // drop files anywhere
  addEventListener('dragover', e => { if (S.data) e.preventDefault(); });
  addEventListener('drop', async e => { if (!S.data) return; e.preventDefault(); const fs = [...(e.dataTransfer?.files || [])]; if (CFG.onDrop && CFG.onDrop(fs)) return; for (const f of fs) await uploadFile(f, CFG.site).catch(er => toast(esc(er.message))); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (S.modal) closeModal(); else if (S.ai.open) { S.ai.open = false; render(); } } });
  render(); reload(true);
  const tick = () => { clearTimeout(pollT); pollT = setTimeout(async () => { if (!document.hidden) await reload(); tick(); }, S.tab === 'chat' ? 5000 : 15000); };
  tick(); document.addEventListener('visibilitychange', () => { if (!document.hidden) reload(); });
}

// ---------- styles (liquid glass, like the hiring page)
document.head.insertAdjacentHTML('beforeend', `<style>
@font-face{font-family:"Nexa Serif";src:url(/nexa-serif.woff2) format("woff2");font-display:swap}
@font-face{font-family:"Nexa Serif";font-style:italic;src:url(/nexa-serif-italic.woff2) format("woff2");font-display:swap}
@font-face{font-family:"Nexa Sans";font-weight:100 900;src:url(/nexa-sans.woff2) format("woff2");font-display:swap}
:root{--ink:#09090F;--text:#F3F1EC;--mute:#A3A1AE;--line:rgba(255,255,255,.1);--line2:rgba(255,255,255,.18);--ac:#8C97FF;--ac2:#FF8FB1;--glass:linear-gradient(155deg,rgba(255,255,255,.12),rgba(255,255,255,.04) 45%,rgba(255,255,255,.07));--prism:linear-gradient(90deg,#FF7AB6,#FFB86B,#FFE27A,#7BF0B8,#7FB2FF,#B794FF);color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{background:var(--ink);color:var(--text);font:15.5px/1.55 "Nexa Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:#B9C0FF}button{font:inherit;color:inherit}
.k-bg{position:fixed;inset:0;z-index:-1;overflow:hidden;background:radial-gradient(1200px 700px at 10% -10%,rgba(124,108,255,.28),transparent 60%),radial-gradient(900px 600px at 110% 20%,rgba(255,110,170,.18),transparent 60%),radial-gradient(900px 700px at 50% 120%,rgba(60,200,170,.14),transparent 60%),var(--ink)}
.k-bg i{position:absolute;border-radius:50%;filter:blur(60px);opacity:.5;animation:kfloat 22s ease-in-out infinite alternate}
.k-bg i:nth-child(1){width:420px;height:420px;left:-80px;top:20%;background:#6E5BFF}.k-bg i:nth-child(2){width:360px;height:360px;right:-60px;top:-60px;background:#FF6FA8;animation-delay:-8s}.k-bg i:nth-child(3){width:380px;height:380px;left:40%;bottom:-160px;background:#2FC8A8;animation-delay:-14s;opacity:.32}
@keyframes kfloat{to{transform:translate(60px,-40px) scale(1.12)}}
@media (prefers-reduced-motion:reduce){.k-bg i{animation:none}.k-enter{animation:none!important}}
.glass{background:radial-gradient(120% 70% at 18% -12%,rgba(255,255,255,.22),rgba(255,255,255,.04) 38%,transparent 56%),radial-gradient(80% 60% at 104% 112%,rgba(255,255,255,.08),transparent 55%),var(--glass),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .055 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),rgba(20,20,30,.55);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(22px) saturate(170%);-webkit-backdrop-filter:blur(22px) saturate(170%);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(255,255,255,.08),inset 6px 0 12px -10px rgba(255,140,220,.5),inset -6px 0 12px -10px rgba(90,220,255,.55),inset 0 -2px 6px -2px rgba(0,0,0,.2),0 1px 1px rgba(0,0,0,.08),0 22px 50px -22px rgba(0,0,0,.6);border-radius:22px}
.mute{color:var(--mute)}.small{font-size:13px}.k-serif{font-family:"Nexa Serif",Georgia,serif;font-weight:400;letter-spacing:-.01em}
.ic{flex:none}.k-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.k-enter{animation:kin .32s cubic-bezier(.2,.8,.2,1)}@keyframes kin{from{opacity:0;transform:translateY(8px)}}
.k-btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.35);cursor:pointer;font-weight:600;font-size:14.5px;transition:transform .45s cubic-bezier(.22,1.3,.36,1),background .2s,filter .2s;white-space:nowrap}
.k-btn:hover{background:rgba(255,255,255,.14);transform:translateY(-1px)}.k-btn:active{transform:scale(1.04,.9);transition-duration:.12s}.k-btn:disabled{opacity:.45;cursor:default}
.k-btn.pri{background:#F3F1EC;color:#0B0B12;border-color:transparent;box-shadow:0 8px 26px -8px rgba(255,255,255,.45)}.k-btn.pri:hover{background:#fff}
.k-btn.ai{background:linear-gradient(135deg,rgba(140,151,255,.35),rgba(255,143,177,.3));border-color:rgba(255,255,255,.28)}
.k-btn.danger{color:#FF9DA8}.k-btn.sm{height:34px;padding:0 12px;font-size:13.5px}
.k-in,.k-sel,textarea.k-in{width:100%;height:44px;padding:0 14px;border-radius:14px;border:1px solid var(--line2);background:rgba(0,0,0,.28);color:var(--text);font:inherit;outline:none;transition:border-color .15s,box-shadow .15s}
textarea.k-in{height:auto;min-height:90px;padding:12px 14px;resize:vertical;line-height:1.5}
.k-in:focus{border-color:rgba(140,151,255,.7);box-shadow:0 0 0 4px rgba(140,151,255,.18)}
.k-sel{appearance:none;background-image:linear-gradient(45deg,transparent 50%,#aaa 50%),linear-gradient(135deg,#aaa 50%,transparent 50%);background-position:calc(100% - 18px) 19px,calc(100% - 13px) 19px;background-size:5px 5px;background-repeat:no-repeat;padding-right:32px}
label.k-lab{display:block;font-size:13px;color:var(--mute);margin:12px 0 6px;font-weight:600}
.av{display:inline-grid;place-items:center;border-radius:50%;color:#0B0B12;font-weight:800;flex:none}
/* login */
.k-login{min-height:100vh;display:grid;place-items:center;padding:24px 16px}
.k-lcard{width:min(440px,100%);padding:34px 28px;text-align:center}.k-lcard h1{font-size:44px;margin:8px 0 2px;line-height:1.05}
.k-logo{display:inline-grid;place-items:center;width:64px;height:64px;border-radius:20px;font-size:32px;background:linear-gradient(135deg,rgba(140,151,255,.5),rgba(255,143,177,.45));border:1px solid rgba(255,255,255,.3);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 10px 30px -10px rgba(140,151,255,.6)}
.k-logo.sm{width:38px;height:38px;border-radius:12px;font-size:20px}
.k-names{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.k-lform{display:flex;gap:8px;margin-top:14px}
.k-err{color:#FF9DA8;margin-top:10px;font-size:14px}.k-note{margin-top:16px;padding:14px;border-radius:16px;background:rgba(255,255,255,.06);font-size:14px;line-height:1.5}
.k-skel{border-radius:14px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.12),rgba(255,255,255,.05));background-size:200% 100%;animation:ksk 1.2s linear infinite;margin-top:16px}@keyframes ksk{to{background-position:-200% 0}}
/* shell */
.k-shell{display:flex;min-height:100vh}
.k-side{position:sticky;top:12px;height:calc(100vh - 24px);margin:12px 0 12px 12px;width:248px;flex:none;padding:16px 12px;display:flex;flex-direction:column;gap:14px}
.k-brand{display:flex;align-items:center;gap:10px;padding:2px 6px 8px}
.k-nav{display:flex;flex-direction:column;gap:4px}
.k-navb{display:flex;align-items:center;gap:12px;width:100%;height:44px;padding:0 12px;border-radius:14px;border:0;background:none;cursor:pointer;text-align:left;font-weight:600;color:#D9D7E0;transition:background .15s}
.k-navb:hover{background:rgba(255,255,255,.07)}.k-navb.on{background:rgba(255,255,255,.14);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}
.k-badge{margin-left:auto;min-width:22px;height:22px;padding:0 7px;border-radius:99px;background:var(--ac2);color:#1A0A12;font-size:12px;font-weight:800;display:grid;place-items:center}
.k-sidefoot{margin-top:auto}.k-online{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}.k-on{position:relative}.k-on::after{content:"";position:absolute;right:0;bottom:0;width:9px;height:9px;border-radius:50%;background:#5BE3A4;border:2px solid #15151d}
.k-main{flex:1;min-width:0;padding:12px 24px 40px}
.k-top{display:flex;align-items:center;gap:10px;height:56px;position:sticky;top:0;z-index:5}
.k-mob{display:none}.k-page{max-width:1180px}
.k-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:6px 0 18px;flex-wrap:wrap}.k-head p{margin:4px 0 0}
.k-h1{font-family:"Nexa Serif",Georgia,serif;font-weight:400;font-size:44px;line-height:1.05;margin:0;letter-spacing:-.01em}
.k-pills{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.k-pill{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:999px;border:1px solid var(--line2);background:rgba(255,255,255,.06);cursor:pointer;font-weight:600;font-size:14px}
.k-pill.on{background:#F3F1EC;color:#0B0B12}.k-pill.on .mute{color:#555}
.k-card{padding:18px}.k-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
.k-stat b{display:block;font-size:34px;font-family:"Nexa Serif",Georgia,serif;font-weight:400;line-height:1.1}
.k-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:40px 20px;text-align:center}
/* files */
.k-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
.k-file{display:flex;flex-direction:column;gap:4px;padding:10px;text-align:left;cursor:pointer;border-radius:20px;transition:transform .18s}.k-file:hover{transform:translateY(-3px)}
.k-thumb{position:relative;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:rgba(0,0,0,.35);display:grid;place-items:center;margin-bottom:6px}.k-thumb img{width:100%;height:100%;object-fit:cover}
.k-play{position:absolute;left:8px;bottom:8px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.55);backdrop-filter:blur(6px)}
.k-ext{font-weight:800;letter-spacing:.08em;color:var(--mute)}.k-ext.big{font-size:40px}
.k-fname{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.k-prev{position:relative;border-radius:16px;overflow:hidden;background:rgba(0,0,0,.4);min-height:200px;display:grid;place-items:center;margin:10px 0}
.k-prev img,.k-prev video{max-width:100%;max-height:60vh;display:block}.k-prev iframe{width:100%;height:50vh;border:0;background:#fff}.k-prev>img[style]{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.k-load{position:relative;font-weight:700}
/* chat */
.k-chat{display:flex;flex-direction:column;height:calc(100vh - 210px);min-height:380px;overflow:hidden}
.k-stream{flex:1;overflow-y:auto;padding:18px}
.k-m{display:flex;gap:10px;margin-top:2px}.k-m.first{margin-top:14px}.k-avsp{width:30px;flex:none}
.k-m.me{flex-direction:row-reverse}.k-m.me .k-who{text-align:right}.k-m>div{max-width:min(560px,80%)}
.k-who{font-size:13px;margin-bottom:3px}
.k-bub{display:inline-block;padding:9px 14px;border-radius:18px;background:rgba(255,255,255,.1);border:1px solid var(--line);line-height:1.45;overflow-wrap:anywhere}
.k-m.me>div{display:flex;flex-direction:column;align-items:flex-end}.k-m.me .k-bub{background:linear-gradient(135deg,#8C97FF,#B48CFF);color:#0B0B12;border-color:transparent}.k-m.me .k-bub a{color:#1d1d6b}
.k-comp{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)}
.k-send{width:44px;height:44px;flex:none;border-radius:50%;border:0;background:#F3F1EC;color:#0B0B12;display:grid;place-items:center;cursor:pointer}
/* AI */
.k-ai{position:fixed;right:16px;bottom:16px;top:76px;width:min(420px,calc(100vw - 32px));z-index:40;display:flex;flex-direction:column;overflow:hidden;animation:kin .25s ease}
.k-aihead{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;border-bottom:1px solid var(--line)}.k-aihead>div{flex:1}
.k-aiorb{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#8C97FF,#FF8FB1);color:#0B0B12}
.k-x{width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.08);display:grid;place-items:center;cursor:pointer}
.k-aistream{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.k-aim{padding:10px 14px;border-radius:16px;line-height:1.5;overflow-wrap:anywhere;font-size:14.5px}.k-aim.user{align-self:flex-end;background:rgba(140,151,255,.3);max-width:85%}.k-aim.model{background:rgba(255,255,255,.07);border:1px solid var(--line)}
.k-starter{display:block;width:100%;text-align:left;padding:10px 14px;border-radius:14px;border:1px solid var(--line2);background:rgba(255,255,255,.05);cursor:pointer;margin-bottom:6px;font-size:14px}.k-starter:hover{background:rgba(255,255,255,.1)}
.k-code{background:rgba(0,0,0,.45);padding:10px 12px;border-radius:12px;overflow-x:auto;font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre}code{font:13px ui-monospace,Menlo,Consolas,monospace;background:rgba(255,255,255,.08);padding:1px 5px;border-radius:6px}.k-code code{background:none;padding:0}
.k-dots{display:inline-flex;gap:4px}.k-dots i{width:7px;height:7px;border-radius:50%;background:#ccc;animation:kdot 1s infinite}.k-dots i:nth-child(2){animation-delay:.15s}.k-dots i:nth-child(3){animation-delay:.3s}@keyframes kdot{50%{opacity:.25;transform:translateY(-3px)}}
/* modal */
.k-modal{position:fixed;inset:0;z-index:50;background:rgba(5,5,10,.55);backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px;animation:kfade .2s}@keyframes kfade{from{opacity:0}}
.k-mcard{width:min(640px,100%);max-height:calc(100vh - 32px);overflow-y:auto;padding:20px;animation:kopen .42s cubic-bezier(.22,1.3,.36,1) both}@keyframes kopen{0%{opacity:0;transform:translateY(14px) scale(.94)}60%{opacity:1;transform:translateY(-2px) scale(1.008)}100%{transform:none}}
.k-mhead{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:18px;margin-bottom:6px}
.k-comments{border-top:1px solid var(--line);padding-top:12px;margin-top:6px}.k-comments .k-comp{padding:10px 0 0;border:0}
.k-cm{display:flex;gap:10px;margin-bottom:10px;font-size:14.5px}.k-cm.own{background:rgba(255,215,120,.08);border-radius:12px;padding:8px}
.k-tag{font-size:11px;font-weight:800;padding:2px 7px;border-radius:99px;background:#FFD27A;color:#2a1d00}
.k-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,30px);opacity:0;z-index:60;padding:12px 18px;border-radius:999px;background:rgba(30,30,42,.92);border:1px solid var(--line2);backdrop-filter:blur(14px);display:flex;align-items:center;gap:8px;font-weight:600;transition:.25s;pointer-events:none;max-width:calc(100vw - 32px)}.k-toast.on{opacity:1;transform:translate(-50%,0)}
.k-tabbar{display:none}
@media (max-width:860px){
  .k-side{display:none}.k-main{padding:8px 16px 100px}.k-mob{display:inline-grid}
  .k-h1{font-size:34px}.k-tabbar{display:flex;position:fixed;left:12px;right:12px;bottom:12px;z-index:30;padding:6px;border-radius:24px;justify-content:space-around}
  .k-tabbar button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;border:0;background:none;border-radius:16px;font-size:11px;font-weight:600;color:#CFCDD6;cursor:pointer}.k-tabbar button.on{background:rgba(255,255,255,.14);color:#fff}
  .k-chat{height:calc(100vh - 250px)}.k-ai{top:12px;bottom:12px;right:12px;width:calc(100vw - 24px)}
  .k-grid{grid-template-columns:repeat(2,1fr);gap:10px}
}
</style>`);
document.body.insertAdjacentHTML('afterbegin', '<div class="k-bg" aria-hidden="true"><i></i><i></i><i></i></div>');
