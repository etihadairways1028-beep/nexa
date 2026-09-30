import { createBackend, ops } from './store.js';
import CONFIG from './config.js';

/* =====================================================================
   NEXA — app
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Date.now();
const lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const safeImg = u => (typeof u === 'string' && (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(u) || /^https:\/\/[^\s"'()<>]+$/.test(u))) ? u : '';

/* ---------------- icons (inline stroke svg) ---------------- */
const P = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  userplus: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  photo: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1.3"/><circle cx="17.5" cy="10.5" r="1.3"/><circle cx="8.5" cy="7.5" r="1.3"/><path d="M12 2a10 10 0 1 0 0 20c1 0 1.5-.8 1.5-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a6 6 0 0 0 6-6C22 6 17.5 2 12 2z"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  reply: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 6 6v5"/>',
  pin: '<path d="M12 17v5M5 17h14l-2-5V4H7v8z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  checks: '<path d="M1 12l5 5L16 7M9 17l1 1L22 7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  brush: '<path d="M9.5 14.5L3 21M14 4l6 6-8.5 8.5a3 3 0 0 1-4.2-4.2z"/>',
  chat2: '<path d="M4 5h16v11H8l-4 4z"/>',
  group: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20a6 6 0 0 1 12 0M10 20a6 6 0 0 1 12 0"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  play: '<path d="M7 5l12 7-12 7z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  sticker: '<path d="M20 12a8 8 0 1 1-8-8h8z"/><path d="M20 12h-5a3 3 0 0 1-3-3V4"/><path d="M8.5 14a4 4 0 0 0 6 0"/>',
  poll: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  block: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  bellOff: '<path d="M6 8a6 6 0 0 1 9.3-5M18 8c0 7 3 8 3 8H9M3 16s3-1 3-8M10 20a2 2 0 0 0 4 0M3 3l18 18"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  album: '<rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/>',
  share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14"/>',
  wand: '<path d="M15 4V2M15 10V8M11 6h2M17 6h2M4 20L14 10M18 14l1-1M18 18l1 1"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/>',
  micOff: '<path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V6a3 3 0 0 0-5.9-.8M5 11a7 7 0 0 0 11.9 5M19 11a7 7 0 0 1-.6 2.8M12 18v3M3 3l18 18"/>',
  videoOff: '<path d="M16 16v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2M9 6h6a1 1 0 0 1 1 1v3l6-3v10M3 3l18 18"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  forward: '<path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0-6 6v5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  game: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3M15 12h.01M18 13h.01"/>',
  cake: '<path d="M4 21h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2zM4 16c2 1 4 1 6 0s4-1 6 0 3 1 4 0M12 12V8M12 5.5a1 1 0 1 1 0-.01"/>',
  images: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-9 0 4-4 7-4 12 0 5 3 8 7 8z"/>',
  hangup: '<path d="M3 15c5-4 13-4 18 0l-2 3-4-1v-3a10 10 0 0 0-6 0v3l-4 1z"/>'
};
const ic = (n, s = 20, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
let logoN = 0;
// Nexa mark: a folded, glowing ribbon "N"
const logo = (s = 34, frame = true, cls = '') => { const i = 'lg' + (logoN++); return `<svg class="nlogo ${cls}" width="${s}" height="${s}" viewBox="0 0 64 64" fill="none" aria-hidden="true"><defs><linearGradient id="${i}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#58c8ff"/><stop offset="1" stop-color="#2a6dff"/></linearGradient><linearGradient id="${i}c" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3a6cff"/><stop offset="1" stop-color="#7fdcff"/></linearGradient><linearGradient id="${i}b" x1="14" y1="16" x2="50" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8be4ff"/><stop offset=".5" stop-color="#4f86ff"/><stop offset="1" stop-color="#3159f0"/></linearGradient><filter id="${i}s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="1.2" flood-color="#000a30" flood-opacity=".75"/></filter></defs>${frame ? '<rect x="1.5" y="1.5" width="61" height="61" rx="17" fill="#0a1030" stroke="rgba(120,170,255,.35)"/>' : ''}<g ${frame ? 'transform="translate(9.6 9.6) scale(.7)"' : ''} stroke-linejoin="round" stroke-width="3.5"><path class="lg-l" d="M14 16H24V48H14Z" fill="url(#${i}a)" stroke="url(#${i}a)"/><path class="lg-r" d="M40 16H50V48H40Z" fill="url(#${i}c)" stroke="url(#${i}c)"/><path class="lg-d" d="M14 16L24 16L50 48L40 48Z" fill="url(#${i}b)" stroke="url(#${i}b)" filter="url(#${i}s)"/></g></svg>`; };

/* ---------------- constants ---------------- */
const BGS = [
  { id: 'nexa', name: 'Default Nexa', css: 'radial-gradient(90% 70% at 0% 0%, rgba(76,110,255,.30), transparent 60%), radial-gradient(80% 60% at 100% 100%, rgba(255,122,69,.20), transparent 60%), rgba(8,11,26,.45)' },
  { id: 'midnight', name: 'Midnight', css: 'linear-gradient(180deg,#04060e,#0b1230)' },
  { id: 'blue', name: 'Blue Glow', css: 'radial-gradient(70% 70% at 50% 110%, #2c55ff, transparent 70%), #060a1e' },
  { id: 'purple', name: 'Purple', css: 'radial-gradient(80% 80% at 20% 10%, #6b2fd1, transparent 65%), radial-gradient(60% 60% at 90% 90%, #3a1d7a, transparent 70%), #0a0616' },
  { id: 'sunset', name: 'Sunset', css: 'linear-gradient(180deg,#1b1238 0%,#5a2350 45%,#e0673f 85%,#ffae5c 100%)' },
  { id: 'clouds', name: 'Clouds', css: 'radial-gradient(40% 25% at 30% 70%, rgba(220,225,255,.35), transparent 70%), radial-gradient(45% 25% at 75% 40%, rgba(200,190,255,.3), transparent 70%), linear-gradient(180deg,#27336b,#6a79b8)' },
  { id: 'minimal', name: 'Minimal', css: 'var(--ground)' },
  { id: 'aurora', name: 'Aurora (animated)', css: 'linear-gradient(120deg,#07122e,#0c3b4a,#1e1856,#4a1a5c,#07122e)', cls: 'bg-aurora' },
  { id: 'snow', name: 'Winter (animated)', css: 'linear-gradient(180deg,#0b1430,#23325f)', cls: 'bg-snow' },
  { id: 'neon', name: 'Neon', css: 'radial-gradient(60% 50% at 0% 100%, #ff2fa0, transparent 70%), radial-gradient(60% 50% at 100% 0%, #2fe6ff, transparent 70%), #0a0718' },
  { id: 'ocean', name: 'Ocean', css: 'linear-gradient(180deg,#031a2e 0%,#06405e 60%,#0b7b8f 100%)' },
  { id: 'stars', name: 'Starry night (animated)', css: 'radial-gradient(120% 80% at 50% 0%,#1b2a6b,#070a1c 70%)', cls: 'bg-stars' },
  { id: 'waves', name: 'Ocean waves (animated)', css: 'linear-gradient(180deg,#041a33,#0a3d62)', cls: 'bg-waves' },
  { id: 'lava', name: 'Lava lamp (animated)', css: '#1a0826', cls: 'bg-lava' },
  { id: 'halloween', name: 'Halloween (animated)', css: 'radial-gradient(60% 45% at 75% 18%,#ffb347,transparent 60%),linear-gradient(180deg,#1c0b2e,#3a1242 60%,#0b0612)', cls: 'bg-halloween' },
  { id: 'blossom', name: 'Cherry blossom (animated)', css: 'linear-gradient(180deg,#ffd6e5,#ffb3c9 55%,#f48fb1)', cls: 'bg-blossom' },
  { id: 'summer', name: 'Summer sunset (animated)', css: 'linear-gradient(180deg,#2b1055,#d53a9d 55%,#ffb347)', cls: 'bg-summer' },
  { id: 'autumn', name: 'Autumn', css: 'radial-gradient(70% 60% at 80% 20%, rgba(255,150,60,.55), transparent 70%), linear-gradient(180deg,#2a1208,#5b2410)' }
];
const ACCENTS = [
  { a: '#3d7bff', b: '#5aa2ff', n: 'Nexa blue' }, { a: '#9b6bff', b: '#d46bff', n: 'Violet' }, { a: '#ff8a4c', b: '#ff4d6d', n: 'Ember' },
  { a: '#ff4d6d', b: '#ff8a4c', n: 'Signal' }, { a: '#2fd4c4', b: '#5b7cff', n: 'Aqua' }, { a: '#3fbf6f', b: '#2fd4c4', n: 'Mint' }
];
const GRADS = ['linear-gradient(135deg,#5b7cff,#9b6bff)', 'linear-gradient(135deg,#ff8a4c,#ff4d6d)', 'linear-gradient(135deg,#9b6bff,#ff8a4c)', 'linear-gradient(135deg,#2fd4c4,#5b7cff)', 'linear-gradient(135deg,#ff4d6d,#9b6bff)', 'linear-gradient(135deg,#3fbf6f,#2fd4c4)'];
const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];
const DEFAULT_PREFS = { nicknames: {}, chatBgs: {}, defaultBg: 'nexa', textSize: 'm', theme: 'dark', accent: 0, customAccent: '', appBg: '', appStyle: 'atmosphere', motion: false, notif: { msg: true, friend: true, event: true, remind: true }, sounds: true, effects: true, deviceNotifs: false, typing: true, reminded: {}, blocked: [], muted: {}, archived: {}, pinnedConvs: [], starred: {}, themes: [], bday: {} };
const STICKERS = [['hi', 'hi!', '#5b7cff', '#9b6bff'], ['gm', 'gm', '#ff8a4c', '#ffc36b'], ['gn', 'gn', '#3b3f9e', '#9b6bff'], ['lol', 'LOL', '#ff4d6d', '#ff8a4c'], ['omw', 'omw', '#2fd4c4', '#5b7cff'], ['ty', 'ty!', '#3fbf6f', '#2fd4c4'], ['yay', 'yay', '#d46bff', '#ff4d6d'], ['brb', 'brb', '#6b7396', '#9aa3c4'], ['heart', '♥', '#ff4d6d', '#ff8ab0'], ['star', '★', '#ffb547', '#ff8a4c'], ['wow', 'WOW', '#9b6bff', '#2fd4c4'], ['miss', 'miss u', '#ff8ab0', '#9b6bff']];
const EMOJI = ['😀', '😂', '🥹', '😍', '😎', '🤔', '😴', '😭', '🥳', '😅', '🙏', '👏', '🙌', '💪', '👀', '✨', '🔥', '❤️', '💜', '💙', '🧡', '👍', '👎', '🎉', '🎂', '🍕', '☕', '🎮', '🎵', '📸', '🌙', '☀️'];
const MOMENT_BGS = ['linear-gradient(160deg,#5b7cff,#9b6bff)', 'linear-gradient(160deg,#ff8a4c,#ff4d6d)', 'linear-gradient(160deg,#2fd4c4,#5b7cff)', 'linear-gradient(160deg,#1b1238,#e0673f)', 'linear-gradient(160deg,#0b1024,#3a1d7a)'];
const PAGES = ['home', 'messages', 'people', 'events', 'notifications', 'settings'];

/* ---------------- state ---------------- */
const S = {
  be: null, me: null, email: '', profile: undefined, prefs: { ...DEFAULT_PREFS }, users: {},
  friends: [], reqIn: [], reqOut: [], convs: [], msgs: {}, evA: [], evB: [], notifs: [],
  view: 'loading', authMode: 'login', authErr: '', busy: false, onbStep: 0,
  form: {}, page: 'home', conv: null, draft: {}, replyTo: null, editing: null, wide: false,
  findOpen: false, find: '', bgPop: false, convFilter: 'all', convQ: '',
  msgLimit: {}, hasMore: {}, isAdmin: false, banned: null, reports: [], bans: [], call: null, incoming: null, allSearch: null, gameBusy: false,
  peopleQ: '', peopleRes: [], directory: [], searching: false, moments: [], rec: null, playing: null, sugg: null, attach: false, story: null, invite: null, installEvt: null, ptab: 'friends', profileUid: null, evTab: 'upcoming',
  setSec: 'profile', modal: null, palette: false, palQ: '', palSel: 0, menu: null, lightbox: '', selMsg: null,
  ai: { open: false, typing: false, msgs: [{ me: false, text: 'Hi, I\'m Nexa AI. I can show you how anything in Nexa works — friends, chats, events, your profile and settings.' }] },
  startedAt: now()
};
const unsubs = { base: [], users: {}, msgs: null, msgsId: null };

/* ---------------- tiny utils ---------------- */
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const gradFor = id => GRADS[hash(id) % GRADS.length];
const SOLIDS = ['#3d7bff', '#e8604c', '#2a9d8f', '#8a63d2', '#d9a441', '#d94f86', '#4f9d4a', '#5c6784'];
const solidFor = id => SOLIDS[hash(id || '') % SOLIDS.length];
const initials = n => (n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
const pad = n => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtTime = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function fmtWhen(t) {
  if (!t) return '';
  const d = new Date(t), n = new Date();
  if (d.toDateString() === n.toDateString()) return fmtTime(t);
  const y = new Date(n); y.setDate(n.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  if (n - d < 6 * 864e5) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function fmtDay(t) {
  const d = new Date(t), n = new Date();
  if (d.toDateString() === n.toDateString()) return 'Today';
  const y = new Date(n); y.setDate(n.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}
function linkify(text, q) {
  let s = esc(text);
  s = s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
  if (q) { const r = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*>)', 'gi'); s = s.replace(r, '<mark>$1</mark>'); }
  return s;
}
function compress(file, max = 1280, q = .82) {
  return new Promise((res, rej) => {
    if (!file || !file.type.startsWith('image/')) return rej(new Error('Please choose an image.'));
    const r = new FileReader();
    r.onerror = () => rej(new Error('Couldn\'t read that file.'));
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = () => rej(new Error('That image couldn\'t be opened.'));
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

/* ---------------- people helpers ---------------- */
const U = uid => S.users[uid] || null;
const nickOf = uid => (S.prefs.nicknames || {})[uid] || '';
const dname = uid => uid === S.me ? (S.profile?.name || 'You') : (nickOf(uid) || U(uid)?.name || 'Nexa user');
function presence(uid) {
  const u = uid === S.me ? S.profile : U(uid);
  if (!u) return 'offline';
  if (uid !== S.me && u.showOnline === false) return 'offline';
  if (uid !== S.me && now() - (u.lastSeen || 0) > 150000) return 'offline';
  return u.status || 'online';
}
const presLabel = p => ({ online: 'Online', away: 'Away', busy: 'Busy', offline: 'Offline' }[p]);
function av(uid, size = 40, withStatus = false) {
  const u = uid === S.me ? S.profile : U(uid);
  const img = safeImg((uid !== S.me && (S.pics || {})[uid]) || u?.avatar);
  const st = withStatus ? `<span class="st ${presence(uid)}"></span>` : '';
  const col = /^#[0-9a-f]{6}$/i.test(u?.color || '') ? u.color : solidFor(uid);
  return `<span class="av" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .36)}px;--grad:${col}">${img ? `<img src="${img}" alt="">` : esc(initials(u?.name))}${st}</span>`;
}
const friendIds = () => S.friends.map(f => f.members.find(m => m !== S.me)).filter(Boolean);
const isFriend = uid => friendIds().includes(uid);
const pairId = (a, b) => [a, b].sort().join('__');

/* ---------------- conversations helpers ---------------- */
const convOf = id => S.convs.find(c => c.id === id);
const others = c => (c.members || []).filter(m => m !== S.me);
const convName = c => c.type === 'channel' ? '#' + (c.name || 'channel') + (commOf(c.communityId) ? ' · ' + commOf(c.communityId).name : '') : c.type !== 'dm' ? (c.name || others(c).map(dname).join(', ') || 'Group') : dname(others(c)[0]);
function convAv(c, size = 44, status = true) {
  if (c.type === 'dm') return av(others(c)[0], size, status);
  if (c.type === 'channel') return `<span class="av group" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px;--grad:${gradFor(c.communityId || c.id)}">#</span>`;
  if (c.type === 'event') { const e = allEvents().find(x => x.id === c.eventId); const img = safeImg(e?.image); return `<span class="av group" style="width:${size}px;height:${size}px;--grad:${gradFor(c.eventId || c.id)}">${img ? `<img src="${img}" alt="" style="border-radius:30%">` : ic('cal', Math.round(size * .45))}</span>`; }
  return `<span class="av group" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .34)}px;--grad:${gradFor(c.id)}">${esc(initials(c.name || 'G'))}</span>`;
}
const hiddenAt = c => (c.hidden || {})[S.me] || 0;
const visibleConv = c => !hiddenAt(c) || (c.last && c.last.at > hiddenAt(c));
const unread = c => !!(c.last && c.last.from !== S.me && c.last.at > ((c.reads || {})[S.me] || 0) && visibleConv(c));
const draftOf = id => id !== S.conv ? ((S.draft[id] || '').trim() || (S.remoteDrafts || {})[id] || '') : '';
const lastLine = c => !c.last ? (c.type !== 'dm' ? 'Group created' : 'Say hello') : c.last.exp && c.last.exp < now() ? 'Message disappeared' : /^Nexa AI: /.test(c.last.text || '') ? c.last.text : (c.last.from === S.me ? 'You: ' : c.type !== 'dm' ? dname(c.last.from).split(' ')[0] + ': ' : '') + (c.last.text || 'Photo');
function typers(c) {
  const t = c.typing || {};
  return others(c).filter(u => now() - (t[u] || 0) < 5000 && U(u)?.typingOn !== false);
}
const blocked = uid => (S.prefs.blocked || []).includes(uid);
const isMuted = id => !!(S.prefs.muted || {})[id];
const isArchived = id => !!(S.prefs.archived || {})[id];
const isPinnedConv = id => (S.prefs.pinnedConvs || []).includes(id);
const dmBlocked = c => c.type === 'dm' && others(c).some(blocked);
const sortedConvs = (withArchived, all) => S.convs.filter(c => visibleConv(c) && !dmBlocked(c) && (withArchived || !isArchived(c.id)) && (all || (!isRequestForMe(c) && c.type !== 'channel'))).sort((a, b) => (isPinnedConv(b.id) - isPinnedConv(a.id)) || ((b.last?.at || b.createdAt || 0) - (a.last?.at || a.createdAt || 0)));
const safeAudio = u => (typeof u === 'string' && /^data:audio\/[a-z0-9.+-]+(;codecs=[a-z0-9.,]+)?;base64,[A-Za-z0-9+/=]+$/i.test(u)) ? u : '';
const fmtDur = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + pad(s % 60); };
function stickerSvg(id, size = 120) {
  const st = STICKERS.find(x => x[0] === id); if (!st) return '';
  const [, label, a, b] = st, gid = 'st' + id + (logoN++);
  const fs = label.length > 4 ? 26 : label.length > 2 ? 34 : 44;
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="Sticker: ${esc(label)}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><g transform="rotate(-6 60 60)"><rect x="10" y="18" width="100" height="84" rx="30" fill="#fff"/><rect x="15" y="23" width="90" height="74" rx="26" fill="url(#${gid})"/><ellipse cx="45" cy="36" rx="22" ry="7" fill="#fff" opacity=".28"/><text x="60" y="${60 + fs * .35}" text-anchor="middle" font-family="Sora,sans-serif" font-weight="800" font-size="${fs}" fill="#fff">${esc(label)}</text></g></svg>`;
}

/* ---------------- sound & effects ---------------- */
let actx = null;
function sound(kind) {
  if (!S.prefs.sounds) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const notes = { send: [[620, 0], [930, .05]], recv: [[880, 0], [1320, .09]], ping: [[740, 0], [988, .08], [1318, .16]], pop: [[520, 0]] }[kind] || [];
    notes.forEach(([f, d]) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(.07, t + d + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d + .24); o.connect(g).connect(actx.destination); o.start(t + d); o.stop(t + d + .26); });
  } catch {}
}
function confetti() {
  if (!S.prefs.effects || S.prefs.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'fx'; c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; document.body.appendChild(c);
  const x = c.getContext('2d'); x.scale(devicePixelRatio, devicePixelRatio);
  const cs = getComputedStyle(document.documentElement);
  const cols = [cs.getPropertyValue('--ac').trim() || '#5b7cff', '#9b6bff', '#ff8a4c', '#ff4d6d', '#ffffff'];
  const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4, r: Math.random() * 6 + 3, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, s: (Math.random() - .5) * .3 }));
  const t0 = performance.now();
  (function f(t) {
    const k = (t - t0) / 1600; x.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => { p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.s; x.save(); x.globalAlpha = Math.max(0, 1 - k); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
    k < 1 ? requestAnimationFrame(f) : c.remove();
  })(t0);
}
const nStack = {};
function deviceNotify(title, body, onClick, tag) {
  if (!S.prefs.deviceNotifs || document.visibilityState === 'visible' || !('Notification' in window) || Notification.permission !== 'granted') return;
  // When closed-app alerts (push) are on, the push server already sends this one — don't show it twice.
  if (S.be?.push && lsGet('nexa.pushToken', null) && tag) return;
  tag = tag || 'nexa-' + title;
  const st = nStack[tag] = nStack[tag] && now() - nStack[tag].at < 30 * 60e3 ? nStack[tag] : { lines: [], at: 0 };
  st.lines = [...st.lines, body].slice(-6); st.at = now();
  const n0 = st.lines.length;
  if (n0 > 1) title = `${title} (${n0} new messages)`;
  const opts = { body: st.lines.join('\n'), icon: 'icon-192.png', badge: 'icon-192.png', tag, renotify: true };
  try { const n = new Notification(title, opts); n.onclick = () => { window.focus(); onClick && onClick(); n.close(); }; }
  catch { navigator.serviceWorker?.ready.then(r => r.showNotification(title, opts)).catch(() => {}); }
}

/* ---------------- events helpers ---------------- */
const allEvents = () => { const m = {}; [...S.evA, ...S.evB].forEach(e => m[e.id] = e); return Object.values(m).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); };
const evStart = e => new Date(`${e.date}T${e.time || '00:00'}`).getTime();
const upcoming = () => allEvents().filter(e => e.date >= todayStr());
const going = e => (e.attendees || []).includes(S.me);
const rsvpOf = e => going(e) ? 'going' : (e.maybe || []).includes(S.me) ? 'maybe' : (e.declined || []).includes(S.me) ? 'no' : null;
const rsvpPills = e => `<div class="pills rsvp">${[['going', 'Going'], ['maybe', 'Maybe'], ['no', 'Can\'t go']].map(([k, l]) => `<button class="pill ${rsvpOf(e) === k ? 'on' : ''}" data-a="rsvp" data-v="${e.id}" data-r="${k}">${k === 'going' && rsvpOf(e) === 'going' ? ic('check', 14, 2.4) : ''}${l}</button>`).join('')}</div>`;

/* ---------------- theme ---------------- */
function applyTheme() {
  const p = S.prefs, r = document.documentElement;
  r.dataset.theme = p.theme === 'light' ? 'light' : 'dark';
  r.dataset.motion = p.motion ? 'reduced' : '';
  r.dataset.contrast = p.contrast ? 'high' : '';
  r.dataset.targets = p.bigTargets ? 'big' : '';
  const acc = p.customAccent ? { a: p.customAccent, b: p.customAccent } : ACCENTS[p.accent] || ACCENTS[0];
  r.style.setProperty('--ac', acc.a);
  r.style.setProperty('--ac2', p.customAccent ? `color-mix(in oklab, ${p.customAccent} 70%, #ff4d6d)` : acc.b);
  r.dataset.sky = p.appBg ? 'custom' : p.appStyle === 'seasonal' ? 'season-' + season() : (p.appStyle || 'atmosphere');
  const sky = $('.sky .custom');
  if (sky) sky.style.backgroundImage = safeImg(p.appBg) ? `url(${p.appBg})` : 'none';
  lsSet('nexa.look', { theme: p.theme, accent: p.accent, customAccent: p.customAccent, motion: p.motion, appStyle: p.appStyle, contrast: p.contrast, bigTargets: p.bigTargets });
}

/* =====================================================================
   DATA
   ===================================================================== */
const db = () => S.be.db;
function stopAll() {
  unsubs.base.forEach(u => u && u()); unsubs.base = [];
  Object.values(unsubs.users).forEach(u => u && u()); unsubs.users = {};
  if (unsubs.msgs) unsubs.msgs(); unsubs.msgs = null; unsubs.msgsId = null;
}
function watchUser(uid) {
  if (!uid || uid === S.me || unsubs.users[uid]) return;
  unsubs.users[uid] = db().listenDoc('users/' + uid, u => { if (u) S.users[uid] = u; else S.users[uid] = { name: 'Deleted account', deleted: true }; render(); });
}
function startData() {
  const me = S.me;
  unsubs.base.push(db().listenDoc('users/' + me, p => {
    S.profile = p;
    if (!p) { if (S.view !== 'auth') { S.view = 'onboard'; S.onbStep = 0; } }
    else if (S.view === 'loading' || S.view === 'auth') { S.view = 'app'; checkInvite(); checkJoin(); checkCommunityInvite(); checkAddHandle(); const oc = lsGet('nexa.openChat', null), op = lsGet('nexa.openPage', null); lsSet('nexa.openChat', null); lsSet('nexa.openPage', null); if (oc) setTimeout(() => openConv(oc), 300); else if (op) go(op); const qr = lsGet('nexa.reply', null); if (qr) { lsSet('nexa.reply', null); setTimeout(() => quickReply(qr.chat, qr.text), 900); } }
    render();
  }));
  let prefsFirst = true;
  unsubs.base.push(db().listenDoc(`users/${me}/private/prefs`, p => { S.prefs = { ...DEFAULT_PREFS, ...(p || {}) }; S.prefs.notif = { ...DEFAULT_PREFS.notif, ...(p?.notif || {}) }; applyTheme();  render(); }));
  unsubs.base.push(db().listen('friendships', [['members', 'array-contains', me]], r => { S.friends = r; r.forEach(f => f.members.forEach(watchUser)); render(); }));
  unsubs.base.push(db().listen('friendRequests', [['to', '==', me]], r => { S.reqIn = r.filter(x => !blocked(x.from)); r.filter(x => blocked(x.from)).forEach(x => db().del('friendRequests/' + x.id).catch(() => {})); S.reqIn.forEach(x => watchUser(x.from)); render(); }));
  unsubs.base.push(db().listen('friendRequests', [['from', '==', me]], r => { S.reqOut = r; r.forEach(x => watchUser(x.to)); render(); }));
  let firstConvs = true;
  unsubs.base.push(db().listen('conversations', [['members', 'array-contains', me]], r => {
    if (!firstConvs) {
      r.forEach(c => {
        const old = convOf(c.id);
        if (c.last && c.last.from !== me && (!old || !old.last || c.last.at > old.last.at) && c.last.at > S.startedAt) {
          const viewing = S.page === 'messages' && S.conv === c.id && document.visibilityState === 'visible';
          if (blocked(c.last.from) || isMuted(c.id)) return;
          if (isRequestForMe(c)) { if (!old || !isRequestForMe(old) || !old.last) { toast(`<b>Message request</b> <span class="mute">from ${esc(dname(c.last.from))}</span>`, () => { S.convFilter = 'requests'; openConv(c.id); }, c.last.from); sound('ping'); } return; }
          playTone(toneFor(c.last.from)); buzz([12, 40, 12]);
          if (!viewing && S.prefs.notif.msg) toast(`<b>${esc(c.type !== 'dm' ? convName(c) : dname(c.last.from))}</b> <span class="mute ellip" style="max-width:260px">${esc(c.last.text || 'Photo')}</span>`, () => openConv(c.id), c.last.from);
          if (S.prefs.notif.msg) deviceNotify(c.type !== 'dm' ? convName(c) : dname(c.last.from), (c.type !== 'dm' ? dname(c.last.from).split(' ')[0] + ': ' : '') + (c.last.text || 'Photo'), () => openConv(c.id), 'c_' + c.id);
        }
      });
    }
    firstConvs = false;
    S.convs = r; S.ready.convs = true; r.forEach(c => (c.members || []).forEach(watchUser));
    render();
  }));
  unsubs.base.push(db().listen('events', [['viewers', 'array-contains', me]], r => { S.evA = r; r.forEach(e => (e.attendees || []).forEach(watchUser)); render(); }));
  unsubs.base.push(db().listen('events', [['public', '==', true]], r => { S.evB = r; r.forEach(e => watchUser(e.creator)); render(); }));
  let firstN = true;
  unsubs.base.push(db().listen('notifications', [['to', '==', me]], r => {
    r.sort((a, b) => b.at - a.at);
    if (!firstN) r.filter(n => !S.notifs.find(o => o.id === n.id) && n.at > S.startedAt && n.from !== me).forEach(n => {
      const allow = n.type?.startsWith('friend') ? S.prefs.notif.friend : n.type?.startsWith('event') ? S.prefs.notif.event : true;
      if (allow && !blocked(n.from)) { toast(`<b>${esc(n.title)}</b> <span class="mute">${esc(n.body || '')}</span>`, () => openNotif(n), n.from); sound('ping'); deviceNotify(n.title, n.body || '', () => openNotif(n)); }
    });
    firstN = false; S.notifs = r; r.forEach(n => n.from && watchUser(n.from)); render();
  }));
  S.directory = []; // Nexa no longer lists everyone who joined — people are found by searching their @handle or name.
  unsubs.base.push(db().listenDoc(`users/${me}/private/pics`, d => { S.pics = d || {}; render(); }));
  S.ready = {}; S.myStickers = []; S.scheduled = [];
  watchStickers(); watchScheduled(); watchDrafts(); watchCommunities(); watchRooms();
  if (hasPin()) S.locked = true;
  unsubs.base.push(db().listenDoc('admins/' + me, a => { const was = S.isAdmin; S.isAdmin = !!a; if (S.isAdmin && !was) watchAdmin(); render(); }));
  unsubs.base.push(db().listenDoc('bans/' + me, b => { S.banned = b; render(); }));
  unsubs.base.push(db().listen('calls', [['to', '==', me], ['status', '==', 'ringing']], r => onIncomingCalls(r)));
  unsubs.base.push(db().listen('moments', [['audience', 'array-contains', me]], r => {
    S.moments = r.filter(m => m.expiresAt > now()).sort((a, b) => a.at - b.at);
    r.filter(m => m.author === me && m.expiresAt <= now()).forEach(m => db().del('moments/' + m.id).catch(() => {}));
    S.moments.forEach(m => watchUser(m.author)); render();
  }));
  heartbeat(); setTimeout(loadIce, 3000);
}
function heartbeat() { if (S.me && S.profile) db().update('users/' + S.me, { lastSeen: now() }).catch(() => {}); }
setInterval(heartbeat, 45000);
let tick = 0;
setInterval(() => {
  if (S.view !== 'app') return;
  tick++; checkReminders(); runScheduled(); if (tick % 4 === 2) checkBadges(); if (!S.pushChecked && S.profile && S.prefs.deviceNotifs && 'Notification' in window && Notification.permission === 'granted') { S.pushChecked = true; registerPush(true); } if (!S.devChecked && S.profile && S.prefs) { S.devChecked = true; checkDevice(); } if (tick % 15 === 1) checkBirthdays();
  if (tick % 15 === 0 && (S.profile?.mood || S.convs.length)) render();
  const typingLive = S.convs.some(c => Object.values(c.typing || {}).some(t => now() - t < 9000));
  if (typingLive || tick % 8 === 0) render();
}, 4000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { heartbeat(); markRead(); } });

const PAGE = 50;
function watchMsgs(id, force) {
  if (unsubs.msgsId === id && !force) return;
  if (unsubs.msgs) unsubs.msgs();
  unsubs.msgsId = id;
  const lim = (S.msgLimit[id] = S.msgLimit[id] || PAGE);
  unsubs.msgs = id ? db().listen(`conversations/${id}/messages`, [], r => {
    S.msgs[id] = r.sort((a, b) => a.at - b.at); S.hasMore[id] = r.length >= lim;
    markRead(); cleanupExpired(id); const cc = convOf(id); if (cc) maybePlayFx(cc); render();
  }, { order: ['at', 'desc'], limit: lim, pending: true }) : null;
}
function cleanupExpired(id) {
  (S.msgs[id] || []).filter(m => m.expiresAt && m.expiresAt < now() && m.from === S.me).forEach(m => db().del(`conversations/${id}/messages/${m.id}`).catch(() => {}));
}
function markRead() {
  const c = convOf(S.conv);
  if (!c || S.page !== 'messages' || document.visibilityState !== 'visible' || isRequestForMe(c)) return;
  if (unread(c)) db().update('conversations/' + c.id, { ['reads.' + S.me]: now() }).catch(() => {});
}
const savePrefs = patch => { Object.assign(S.prefs, patch); applyTheme(); render(); return db().update(`users/${S.me}/private/prefs`, patch).catch(e => toast(esc(e.message))); };
const notify = (to, n) => to && to !== S.me ? db().add('notifications', { to, from: S.me, at: now(), read: false, ...n }).then(id => { if (id) pushNotify('notification', { id }); return id; }).catch(() => {}) : null;

async function checkReminders() {
  if (!S.prefs.notif.remind) return;
  const soon = allEvents().filter(e => going(e) && !S.prefs.reminded?.[e.id] && evStart(e) - now() < 3600e3 && evStart(e) > now());
  for (const e of soon) {
    S.prefs.reminded = { ...(S.prefs.reminded || {}), [e.id]: true };
    db().update(`users/${S.me}/private/prefs`, { ['reminded.' + e.id]: true }).catch(() => {});
    db().add('notifications', { to: S.me, from: S.me, type: 'event_reminder', title: 'Starting soon', body: `${e.title} starts at ${e.time}`, at: now(), read: false, link: { page: 'events', id: e.id } });
    toast(`<b>Starting soon</b> <span class="mute">${esc(e.title)} · ${esc(e.time)}</span>`, () => go('events'));
  }
}

/* =====================================================================
   RENDER
   ===================================================================== */
let seenPrev = new Set(), seenNext = new Set(), raf = 0;
const A = key => { seenNext.add(key); return seenPrev.has(key) ? '' : ' anim'; };
function render() { if (!raf) raf = requestAnimationFrame(doRender); }
function doRender() {
  raf = 0;
  const root = $('#app');
  const act = document.activeElement;
  const focusId = act && act.id && root.contains(act) ? act.id : null;
  const sel = focusId && 'selectionStart' in act ? [act.selectionStart, act.selectionEnd] : null;
  const stream = $('#stream');
  const atBottom = !stream || stream.scrollHeight - stream.scrollTop - stream.clientHeight < 90;
  const prevTop = stream ? stream.scrollTop : 0;
  const prevConv = stream?.dataset.conv;
  const scrollers = {}; root.querySelectorAll('[data-keep-scroll]').forEach(el => scrollers[el.dataset.keepScroll] = el.scrollTop);
  seenNext = new Set();
  let html = '';
  if (S.view === 'loading') html = '';
  else if (S.view === 'auth') html = vAuth();
  else if (S.view === 'onboard') html = vOnboard();
  else if (S.view === 'app' && S.profile && S.locked) html = vLock();
  else if (S.view === 'app' && S.profile && S.banned) html = vBanned();
  else if (S.view === 'app' && S.profile) html = vShell();
  html += vOverlays();
  root.innerHTML = html;
  seenPrev = seenNext;
  root.querySelectorAll('[data-keep-scroll]').forEach(el => { if (scrollers[el.dataset.keepScroll] != null) el.scrollTop = scrollers[el.dataset.keepScroll]; });
  const s2 = $('#stream');
  if (s2 && S.keepBottom != null) { s2.scrollTop = s2.scrollHeight - S.keepBottom; if (s2.scrollHeight > S.keepBottom + 50) S.keepBottom = null; }
  else if (s2) s2.scrollTop = (atBottom || prevConv !== s2.dataset.conv) ? s2.scrollHeight : prevTop;
  paintVoice(); paintWatch(); if (S.tour != null) paintTour();
  if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch {} } }
  const auto = $('[data-autofocus]'); if (auto && !focusId && !auto.dataset.done) { auto.focus(); }
  autosize();
}
function autosize() { const t = $('#composer'); if (t) { t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight) + 'px'; } }

/* ---------------- auth ---------------- */
function vAuth() {
  if (S.authMode === 'code') return vAuthCode();
  const su = S.authMode === 'signup', f = S.form;
  return `<div class="auth${A('auth')}">
    <div class="col intro" style="gap:28px">
      <div class="brandhero">${logo(92, false, 'logo-glow')}<div><div class="brandword">NEXA</div><div class="brandtag">Connect · Chat · Share · Together</div></div></div>
      <h1>Every conversation, <span class="grad-text">a little closer.</span></h1>
      <p class="mute" style="margin:0;font-size:18px;line-height:1.55;max-width:470px">Messages, friends and plans in one calm, glassy place — built for the people you actually talk to.</p>
    </div>
    <form class="auth-card glass card" data-submit="auth" novalidate>
      <div class="seg" role="tablist"><button type="button" class="${su ? '' : 'on'}" data-a="authMode" data-v="login">Log in</button><button type="button" class="${su ? 'on' : ''}" data-a="authMode" data-v="signup">Sign up</button></div>
      <div><h2 class="disp" style="margin:0 0 4px;font-size:24px">${su ? 'Create your Nexa' : 'Welcome back'}</h2><div class="mute small">${su ? 'Pick how friends will find you.' : 'Log in to pick up where you left off.'}</div></div>
      ${su ? `<div class="row" style="gap:12px;align-items:flex-start">
        <label class="field grow">Display name<input class="inp" id="f-name" data-model="form.name" value="${esc(f.name || '')}" autocomplete="name" placeholder="Your name" required></label>
        <label class="field grow">Username<input class="inp" id="f-handle" data-model="form.handle" value="${esc(f.handle || '')}" autocomplete="username" placeholder="yourhandle" required></label></div>` : ''}
      <label class="field">${su ? 'Email' : 'Email' + (S.be.kind === 'local' ? ' or username' : '')}<input class="inp" id="f-email" data-model="form.email" value="${esc(f.email || '')}" type="${su ? 'email' : 'text'}" autocomplete="${su ? 'email' : 'username'}" placeholder="you@example.com"></label>
      <label class="field">Password<input class="inp" id="f-pw" data-model="form.pw" type="password" autocomplete="${su ? 'new-password' : 'current-password'}" placeholder="${su ? 'At least 6 characters' : '••••••••'}"></label>
      ${S.authErr ? `<div class="err" role="alert">${esc(S.authErr)}</div>` : ''}
      <button class="btn pri" style="height:50px;font-size:15px" ${S.busy ? 'disabled' : ''}>${S.busy ? 'One moment…' : su ? 'Create account' : 'Log in'}</button>
      ${su ? '' : `<button type="button" class="small mute" style="align-self:center;text-decoration:underline;text-underline-offset:3px" data-a="resetOpen">Forgot password?</button>
      <div class="orline"><span>or</span></div>
      <button type="button" class="btn" style="height:48px" data-a="authMode" data-v="code">${ic('qr', 18)} Log in with a code or QR</button>`}
      <div class="mute small" style="text-align:center">${S.be.kind === 'local' ? 'Local mode: accounts live in this browser. Connect Firebase to go live.' : su ? 'By signing up you agree to be kind.' : `New here? <button type="button" class="grad-text" style="font-weight:700" data-a="authMode" data-v="signup">Create an account</button>`}</div>
    </form>
  </div>`;
}

/* ---------------- onboarding ---------------- */
function vOnboard() {
  const st = S.onbStep, f = S.form;
  const dots = `<div class="dots">${[0, 1, 2].map(i => `<i class="${i === st ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (st === 0) body = `<div class="sec">Step 1 of 3</div><h2 class="h1">Set up your profile</h2>
    <div class="row" style="gap:18px">${`<span class="av" style="width:88px;height:88px;font-size:30px;--grad:${gradFor(S.me)}">${safeImg(f.avatar) ? `<img src="${f.avatar}" alt="">` : esc(initials(f.name))}</span>`}
      <label class="btn" style="cursor:pointer">${ic('photo', 18)} Add a photo<input type="file" accept="image/*" class="sr" data-file="onbAvatar"></label></div>
    <div class="row" style="gap:12px;align-items:flex-start"><label class="field grow">Display name<input class="inp" id="o-name" data-model="form.name" value="${esc(f.name || '')}"></label>
    <label class="field grow">Username<input class="inp" id="o-handle" data-model="form.handle" value="${esc(f.handle || '')}"></label></div>
    <label class="field">Bio <span style="font-weight:500">(optional)</span><textarea class="inp" id="o-bio" data-model="form.bio" rows="2" placeholder="A line about you">${esc(f.bio || '')}</textarea></label>`;
  if (st === 1) body = `<div class="sec">Step 2 of 3</div><h2 class="h1">Make it yours</h2><div class="mute">Pick a look. You can change this anytime in Settings.</div>
    <div class="field">Theme<div class="pills"><button class="pill ${S.prefs.theme !== 'light' ? 'on' : ''}" data-a="pref" data-k="theme" data-v="dark">${ic('moon', 16)} Dark</button><button class="pill ${S.prefs.theme === 'light' ? 'on' : ''}" data-a="pref" data-k="theme" data-v="light">Bright</button></div></div>
    <div class="field">Accent<div class="accs">${ACCENTS.map((a, i) => `<button class="acc ${!S.prefs.customAccent && S.prefs.accent === i ? 'on' : ''}" style="background:${a.a};box-shadow:0 0 16px -2px ${a.a}" aria-label="${a.n}" data-a="accent" data-v="${i}"></button>`).join('')}</div></div>`;
  if (st === 2) body = `<div class="sec">Step 3 of 3</div><h2 class="h1">You're in, ${esc((f.name || '').split(' ')[0])}.</h2>
    <div class="col" style="gap:10px">
      ${[['people', 'Find friends', 'Search a name or @handle on the People page.'], ['msg', 'Start chatting', 'Message friends one-on-one or create a group.'], ['cal', 'Make plans', 'Create an event and choose who can join.'], ['spark', 'Ask Nexa AI', 'Stuck? Nexa AI explains how anything works.']].map(([i, t, d]) => `<div class="row" style="padding:12px;border-radius:16px;border:1px solid var(--line2)"><span class="qa" style="padding:0;width:40px;height:40px;align-items:center;justify-content:center;color:var(--ac)">${ic(i)}</span><div><b>${t}</b><div class="mute small">${d}</div></div></div>`).join('')}
    </div><div class="mute small">Tip: press <span class="kbd">Ctrl K</span> anywhere to jump around.</div>`;
  return `<div class="onb"><div class="card glass${A('onb' + st)}"><div class="row spread">${logo(36)}${dots}</div>${body}
    ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
    <div class="row" style="justify-content:flex-end;gap:10px">${st > 0 ? '<button class="btn" data-a="onbBack">Back</button>' : ''}<button class="btn pri" data-a="onbNext" ${S.busy ? 'disabled' : ''}>${st === 2 ? 'Enter Nexa' : 'Continue'}</button></div></div></div>`;
}

/* ---------------- shell ---------------- */
function counts() {
  return { msg: S.convs.filter(c => unread(c) && !isMuted(c.id) && !isArchived(c.id) && !dmBlocked(c) && !isRequestForMe(c)).length, notif: S.notifs.filter(n => !n.read && !blocked(n.from)).length, req: S.reqIn.filter(r => !blocked(r.from)).length };
}
function vShell() {
  const c = counts();
  const navs = [['home', 'home', 'Home', 0], ['messages', 'msg', 'Messages', c.msg], ['people', 'people', 'People', c.req], ['events', 'cal', 'Events', 0], ['notifications', 'bell', 'Notifications', c.notif], ['settings', 'gear', 'Settings', 0]].concat(S.isAdmin ? [['admin', 'shield', 'Moderation', S.reports.length]] : []);
  const pg = S.page;
  const titles = { admin: 'Moderation', home: 'Home', messages: 'Messages', people: 'People', events: 'Events', notifications: 'Notifications', settings: 'Settings', profile: 'Profile' };
  return `<div class="shell">
    <nav class="side glass" aria-label="Main">
      <div class="brand">${logo(36)}<span class="word">NEXA</span></div>
      ${navs.map(([k, i, l, n]) => `<button class="nav ${pg === k ? 'on' : ''}" data-a="go" data-v="${k}" data-tour="${k}" title="${l}" ${pg === k ? 'aria-current="page"' : ''}>${ic(i)}<span class="lbl">${l}</span>${n ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : ''}</button>`).join('')}
      <button class="aicard" data-a="aiOpen" data-tour="ai" title="Nexa AI"><span class="row" style="gap:8px;font-weight:700">${ic('spark', 18)}<span class="t">Nexa AI</span></span><span class="t mute small" style="font-weight:500">Ask how anything works</span></button>
      <button class="me-chip" data-a="profile" data-v="${S.me}">${av(S.me, 38, true)}<span class="t grow"><span class="ellip" style="display:block;font-weight:700;font-size:14px">${esc(S.profile.name)}</span><span class="mute small ellip" style="display:block">${moodOf(S.me) ? esc(moodOf(S.me)) : presLabel(presence(S.me))}</span></span></button>
    </nav>
    <div class="main">
      <header class="top glass">
        <button class="search" data-a="palette">${ic('search', 18)}<span class="ellip">Search people, chats, events, settings…</span><span class="kbd">Ctrl K</span></button>
        <div style="flex:1"></div>
        <button class="ibtn" aria-label="Notifications" data-a="go" data-v="notifications">${ic('bell')}${c.notif ? '<span class="badge" style="position:absolute;top:-6px;right:-6px">' + c.notif + '</span>' : ''}</button>
        <button class="me-chip" style="width:auto;margin:0;padding:6px 12px 6px 6px" data-a="profile" data-v="${S.me}">${av(S.me, 36)}<span><span style="display:block;font-weight:700;font-size:14px">${esc(S.profile.name)}</span><span class="mute small">@${esc(S.profile.handle)}</span></span></button>
      </header>
      <header class="mtop">${pg === 'profile' && S.profileUid !== S.me ? `<button class="ibtn" aria-label="Back" data-a="back">${ic('back')}</button>` : logo(30)}<span class="t">${titles[pg]}</span>
        <button class="ibtn" aria-label="Search" data-a="palette">${ic('search')}</button>
        <button class="ibtn" aria-label="Notifications" data-a="go" data-v="notifications">${ic('bell')}${c.notif ? '<span class="badge" style="position:absolute;top:-6px;right:-6px">' + c.notif + '</span>' : ''}</button></header>
      ${S.offline ? `<div class="offbar${A('offbar')}" role="status">${ic('wifiOff', 16)}<span>You're offline. Messages you send will go out when you reconnect.</span></div>` : ''}
      ${vPage()}
    </div>
    <nav class="tabbar glass" aria-label="Main">
      ${[['home', 'home', 'Home', 0], ['messages', 'msg', 'Chats', c.msg], ['people', 'people', 'People', c.req], ['events', 'cal', 'Events', 0], ['me', 'user', 'Me', 0]].map(([k, i, l, n]) => `<button data-tour="${k === 'me' ? 'settings' : k}" class="${(pg === k || (k === 'me' && (pg === 'settings' || (pg === 'profile' && S.profileUid === S.me)))) ? 'on' : ''}" data-a="${k === 'me' ? 'profile' : 'go'}" data-v="${k === 'me' ? S.me : k}">${ic(i, 22)}${l}${n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}
    </nav>
    ${(pg === 'home' || (pg === 'messages' && !S.conv)) ? `<button class="fab" aria-label="New message" data-a="newChat">${ic('pen', 24, 2)}</button>` : ''}
  </div>`;
}
function vPage() {
  const k = S.page + (S.page === 'profile' ? S.profileUid : '');
  const m = { admin: vAdmin, home: vHome, messages: vMessages, people: vPeople, events: vEvents, notifications: vNotifs, profile: vProfile, settings: vSettings }[S.page] || vHome;
  return `<main class="page${A('page:' + k)} ${S.page === 'home' || S.page === 'people' || S.page === 'profile' ? 'pad-scroll' : ''}" data-keep-scroll="page">${m()}</main>`;
}

/* ---------------- home ---------------- */
function vHome() {
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const convs = sortedConvs().slice(0, 5);
  const evs = upcoming().slice(0, 3);
  const onl = friendIds().filter(u => presence(u) !== 'offline');
  const acts = S.notifs.slice(0, 4);
  const nUnread = counts().msg, today = evs.find(e => e.date === todayStr());
  const subBits = [nUnread ? `<b>${nUnread} unread chat${nUnread > 1 ? 's' : ''}</b>` : '', today ? `<b>${esc(today.title)}</b>${today.time ? ' at ' + esc(today.time) : ' today'}` : ''].filter(Boolean);
  const sub = subBits.length ? subBits.join(' · ') : friendIds().length ? 'You\'re all caught up.' : 'Here\'s your space. Add a few friends to bring it to life.';
  const evThumb = e => safeImg(e.image) ? `background-image:url(${e.image})` : `background-position:${20 + hash(e.id) % 60}% ${55 + hash(e.id + 'y') % 35}%`;
  const right = `
      <section class="panel glass card">
        <div class="row spread"><h2 class="h2">Online friends</h2><span class="small" style="color:var(--ac2);font-weight:800">${onl.length}</span></div>
        ${onl.length ? `<div class="list">${onl.slice(0, 6).map(u => { const r = (S.rooms || []).find(x => roomLive(x.id).includes(u) && x.id !== S.room); return `<div class="item" style="min-height:52px">${av(u, 40, true)}<button class="grow" style="text-align:left" data-a="profile" data-v="${u}"><b class="ellip" style="display:block">${esc(dname(u).split(' ')[0])}</b><span class="mute small">${r ? 'In a voice room' : presLabel(presence(u))}</span></button>${r ? `<button class="btn sm" data-a="roomJoinId" data-v="${r.id}">Join</button>` : `<button class="ibtn sm" aria-label="Message ${esc(dname(u))}" data-a="dm" data-v="${u}">${ic('msg', 15)}</button>`}</div>`; }).join('')}</div>`
          : `<div class="mute small" style="line-height:1.5">${friendIds().length ? 'No friends online right now.' : `Share <b style="color:var(--text)">@${esc(S.profile.handle)}</b> so friends can add you.`}</div>`}
      </section>
      <section class="panel glass card">
        <div class="row spread"><h2 class="h2">Notifications</h2><button class="small" style="color:var(--ac2);font-weight:800" data-a="go" data-v="notifications">See all</button></div>
        ${acts.length ? `<div class="list">${acts.map(n => notifRow(n, true)).join('')}</div>` : `<div class="mute small">Requests, invites and updates show up here.</div>`}
      </section>
      <section class="panel glass card">
        <div class="row spread"><h2 class="h2">Moments</h2><button class="small" style="color:var(--ac2);font-weight:800" data-a="momentNew">+ Add</button></div>
        ${vMoments()}
      </section>
      ${suggestions().length ? `<section class="panel glass card"><h2 class="h2">People you may know</h2>${suggestions().slice(0, 2).map(sg => suggRow(sg)).join('')}</section>` : ''}`;
  return `<div class="home v8">
    <div class="h-main">
      <section class="hero glass card">
        <h1 class="disp hello">${greet}, ${esc(S.profile.name.split(' ')[0])}</h1>
        <div class="mute hsub">${sub}</div>
        <div class="qa-grid">
          <button class="qa" data-a="newChat"><span class="ic">${ic('pen', 20)}</span>New message</button>
          <button class="qa" data-a="newEvent"><span class="ic">${ic('cal', 20)}</span>Create event</button>
          <button class="qa" data-a="go" data-v="people"><span class="ic">${ic('userplus', 20)}</span>Add friend</button>
          <button class="qa" data-a="aiOpen"><span class="ic">${ic('spark', 20)}</span>Nexa AI</button>
        </div>
      </section>
      ${vBirthdayCard()}
      ${vLiveCard()}
      <div class="two">
        <section class="panel glass card">
          <div class="row spread"><h2 class="h2">Recent conversations</h2><button class="small" style="color:var(--ac2);font-weight:800" data-a="go" data-v="messages">See all</button></div>
          ${!S.ready?.convs ? `<div class="list">${skelRows(3, 42)}</div>` : convs.length ? `<div class="list">${convs.map(c => `<button class="item" data-a="openConv" data-v="${c.id}">${convAv(c, 42)}<span class="grow"><b class="ellip" style="display:block">${esc(convName(c))}</b><span class="small ellip ${unread(c) ? '' : 'mute'}" style="display:block;${unread(c) ? 'font-weight:700' : ''}">${typers(c).length ? '<span style="color:var(--ac2)">typing…</span>' : esc(lastLine(c))}</span></span><span class="col" style="align-items:flex-end;gap:5px;flex-shrink:0"><span class="mute small">${fmtWhen(c.last?.at)}</span>${unread(c) ? '<span class="unread-dot"></span>' : ''}</span></button>`).join('')}</div>`
            : `<div class="empty"><div class="ring">${ic('msg', 24)}</div><b>No conversations yet</b><span>Message a friend or start a group.</span><button class="btn sm pri" data-a="newChat">New message</button></div>`}
        </section>
        <div class="col" style="gap:16px;min-width:0">
          <section class="panel glass card">
            <div class="row spread"><h2 class="h2">Upcoming events</h2><button class="small" style="color:var(--ac2);font-weight:800" data-a="go" data-v="events">View all</button></div>
            ${evs.length ? evs.map(e => `<button class="evrow" data-a="eventOpen" data-v="${e.id}"><span class="evthumb" style="${evThumb(e)}"></span><span class="grow" style="min-width:0;text-align:left"><b class="ellip" style="display:block">${esc(e.title)}</b><span class="mute small" style="display:block">${new Date(e.date + 'T00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}${e.time ? ' · ' + esc(e.time) : ''}</span><span class="mute small">${(e.attendees || []).length} going</span></span>${going(e) ? '<span class="btn sm pri" style="pointer-events:none">Going</span>' : '<span class="btn sm" style="pointer-events:none">RSVP</span>'}</button>`).join('')
              : `<div class="empty" style="padding:14px 0"><b>Nothing planned yet</b><span>Plan a hangout and invite friends.</span><button class="btn sm pri" data-a="newEvent">Create event</button></div>`}
          </section>
          <section class="panel glass card">
            <div class="row spread"><h2 class="h2">Friend requests</h2>${S.reqIn.length ? `<span class="small" style="color:var(--ac2);font-weight:800">${S.reqIn.length} new</span>` : ''}</div>
            ${S.reqIn.length ? S.reqIn.slice(0, 3).map(r => reqRow(r)).join('') : `<div class="mute small" style="line-height:1.5">No requests right now. Share your link from People so friends can add you.</div>`}
          </section>
          ${S.convs.some(c => c.last) ? `<button class="panel glass card react wrapcard" data-a="wrappedOpen"><span class="row" style="gap:14px"><span class="notif-ic" style="width:44px;height:44px;background:var(--ac)">${ic('spark', 20)}</span><span class="grow" style="text-align:left"><b class="disp" style="font-size:15px;display:block">Your ${new Date().toLocaleDateString([], { month: 'long' })} Wrapped</b><span class="mute small">Top friends, busiest day and more</span></span>${ic('forward', 18)}</span></button>` : ''}
        </div>
      </div>
      <div class="h-right-inline">${right}</div>
    </div>
    <aside class="h-right">${right}</aside>
  </div>`;
}
function vMoments() {
  const by = {};
  S.moments.forEach(m => { if (!blocked(m.author) && (m.author === S.me || isFriend(m.author))) (by[m.author] = by[m.author] || []).push(m); });
  const seenAll = u => by[u].every(m => (m.seen || []).includes(S.me));
  const list = Object.keys(by).filter(u => u !== S.me).sort((a, b) => (seenAll(a) - seenAll(b)) || (by[b].at(-1).at - by[a].at(-1).at));
  const mine = by[S.me];
  return `<div class="moments" aria-label="Moments">
    <div class="mo"><button class="mring ${mine ? '' : 'none'}" data-a="${mine ? 'storyOpen' : 'momentNew'}" data-v="${S.me}" aria-label="${mine ? 'View your moment' : 'Add a moment'}">${av(S.me, 58)}</button>${mine ? '' : `<button class="mplus" data-a="momentNew" aria-label="Add a moment">${ic('plus', 14, 2.6)}</button>`}<span class="small">${mine ? 'Your moment' : 'Add moment'}</span></div>
    ${list.map(u => `<div class="mo"><button class="mring ${seenAll(u) ? 'seen' : by[u].some(m => m.close && !(m.seen || []).includes(S.me)) ? 'close' : ''}" data-a="storyOpen" data-v="${u}" aria-label="View ${esc(dname(u))}'s moment">${av(u, 58)}</button><span class="small ellip">${esc(dname(u).split(' ')[0])}</span></div>`).join('')}
    ${mine ? `<div class="mo"><button class="mring none" data-a="momentNew" aria-label="Add another moment"><span class="av" style="width:58px;height:58px;background:rgba(255,255,255,.05);color:var(--ac)">${ic('plus', 22, 2)}</span></button><span class="small">Add</span></div>` : ''}
    ${!list.length && !mine ? `<span class="mute small" style="align-self:center;max-width:240px">Moments disappear after 24 hours. Share one with your friends.</span>` : ''}
  </div>`;
}
function suggestions() {
  const fr = new Set(friendIds()), out = {};
  const pend = new Set([...S.reqOut.map(r => r.to), ...S.reqIn.map(r => r.from)]);
  const add = (u, why) => { if (u && u !== S.me && !fr.has(u) && !blocked(u) && !pend.has(u) && !U(u)?.deleted && U(u)?.allowRequests !== 'nobody' && !out[u]) out[u] = why; };
  S.convs.filter(c => c.type !== 'dm').forEach(c => c.members.forEach(u => add(u, 'In ' + convName(c))));
  allEvents().forEach(e => (e.attendees || []).forEach(u => add(u, 'Going to ' + e.title)));
  return Object.entries(out).map(([uid, why]) => ({ uid, why })).slice(0, 8);
}
function suggRow(sg) {
  return `<div class="person${A('sg' + sg.uid)}">${av(sg.uid, 42)}<button class="grow" style="text-align:left" data-a="profile" data-v="${sg.uid}"><b class="ellip" style="display:block">${esc(dname(sg.uid))}</b><span class="mute small ellip" style="display:block">${esc(sg.why)}</span></button><button class="btn sm pri" data-a="addFriend" data-v="${sg.uid}">${ic('userplus', 16)} Add</button></div>`;
}
function dateChip(e) {
  const d = new Date(e.date + 'T00:00');
  return `<span class="datechip" style="background:${gradFor(e.id)}"><small>${d.toLocaleString([], { month: 'short' }).toUpperCase()}</small><b>${d.getDate()}</b></span>`;
}
function reqRow(r) {
  return `<div class="person${A('req' + r.id)}">${av(r.from, 44, true)}<button class="grow" style="text-align:left" data-a="profile" data-v="${r.from}"><b class="ellip" style="display:block">${esc(dname(r.from))}</b><span class="mute small">@${esc(U(r.from)?.handle || '')}</span></button>
    <button class="btn sm pri" data-a="accept" data-v="${r.id}">Accept</button><button class="btn sm" data-a="decline" data-v="${r.id}">Decline</button></div>`;
}
const NIC = { friend_request: ['userplus', 'linear-gradient(135deg,#9b6bff,#5b7cff)'], friend_accept: ['check', 'linear-gradient(135deg,#3fbf6f,#2fd4c4)'], event_invite: ['cal', 'linear-gradient(135deg,#ff8a4c,#ff4d6d)'], event_update: ['cal', 'linear-gradient(135deg,#ff8a4c,#9b6bff)'], event_join: ['cal', 'linear-gradient(135deg,#5b7cff,#2fd4c4)'], event_reminder: ['clock', 'linear-gradient(135deg,#ff4d6d,#ff8a4c)'], group_add: ['group', 'linear-gradient(135deg,#5b7cff,#9b6bff)'], security: ['lock', 'linear-gradient(135deg,#5b7cff,#2fd4c4)'], admin_warn: ['shield', 'linear-gradient(135deg,#ff4d6d,#ff8a4c)'], birthday: ['cake', 'linear-gradient(135deg,#ff8a4c,#ff4d6d)'], welcome: ['spark', 'linear-gradient(135deg,#5b7cff,#9b6bff 60%,#ff8a4c)'] };
function notifRow(n, compact) {
  const [i, g] = NIC[n.type] || ['bell', GRADS[0]];
  const who = n.from && n.from !== S.me && n.type !== 'admin_warn' ? av(n.from, compact ? 36 : 42) : `<span class="notif-ic" style="background:${g}">${ic(i, 18)}</span>`;
  return `<button class="item${A('n' + n.id)}" data-a="notif" data-v="${n.id}" style="${!compact && !n.read ? 'background:color-mix(in oklab,var(--ac) 8%,transparent)' : ''}">${who}<span class="grow"><b class="ellip" style="display:block;font-size:14px">${esc(n.title)}</b><span class="mute small" style="display:block">${esc(n.body || '')}</span></span><span class="mute small">${fmtWhen(n.at)}</span>${!n.read ? '<span class="unread-dot"></span>' : ''}</button>`;
}

/* ---------------- messages ---------------- */
function vMessages() {
  if (S.convFilter === 'archived' && !S.convs.some(c => isArchived(c.id) && visibleConv(c))) S.convFilter = 'all';
  const q = S.convQ.toLowerCase();
  let list = sortedConvs(S.convFilter === 'archived');
  if (S.convFilter === 'direct') list = list.filter(c => c.type === 'dm');
  if (S.convFilter === 'groups') list = list.filter(c => c.type !== 'dm');
  if (S.convFilter === 'unread') list = list.filter(unread);
  if (S.convFilter === 'archived') list = list.filter(c => isArchived(c.id));
  if (S.convFilter === 'requests') list = S.convs.filter(c => isRequestForMe(c) && visibleConv(c) && !dmBlocked(c)).sort((a, b) => (b.last?.at || 0) - (a.last?.at || 0));
  const fo = S.convFilter.startsWith('f:') ? (S.prefs.folders || []).find(x => 'f:' + x.id === S.convFilter) : null;
  if (S.convFilter.startsWith('f:') && !fo) S.convFilter = 'all';
  if (fo) list = sortedConvs(true, true).filter(c => fo.convs.includes(c.id));
  const nReq = S.convs.filter(c => isRequestForMe(c) && visibleConv(c) && !dmBlocked(c)).length;
  if (S.convFilter === 'requests' && !nReq) S.convFilter = 'all';
  const commUnread = S.convs.filter(c => c.type === 'channel' && unread(c) && !isMuted(c.id)).length;
  if (q) list = list.filter(c => convName(c).toLowerCase().includes(q) || (c.last?.text || '').toLowerCase().includes(q) || (S.msgs[c.id] || []).some(m => (m.text || '').toLowerCase().includes(q)));
  const nArch = S.convs.filter(c => isArchived(c.id) && visibleConv(c)).length;
  const c = convOf(S.conv);
  return `<div class="msgs-page ${S.wide ? 'wide' : ''} ${c ? 'open' : ''}">
    <aside class="convs glass card">
      <div class="row spread"><h2 class="disp hide-m" style="margin:0;font-size:22px">Messages</h2>
        <div class="row" style="gap:8px"><button class="ibtn" aria-label="New group" title="New group" data-a="newGroup">${ic('group', 18)}</button><button class="ibtn" aria-label="New message" title="New message" data-a="newChat">${ic('pen', 18)}</button></div></div>
      <label class="search" style="flex:none;max-width:none">${ic('search', 16)}<input id="convQ" data-model="convQ" value="${esc(S.convQ)}" placeholder="Search chats and messages" aria-label="Search chats and messages"></label>
      <div class="pills convpills">${[['all', 'All'], ['unread', 'Unread'], ['direct', 'Direct'], ['groups', 'Groups'], ['communities', 'Communities' + (commUnread ? ` <span class="badge">${commUnread}</span>` : '')]].concat(nReq ? [['requests', `Requests <span class="badge">${nReq}</span>`]] : []).concat((S.prefs.folders || []).map(x => ['f:' + x.id, esc(x.name)])).concat(nArch || S.convFilter === 'archived' ? [['archived', 'Archived' + (nArch ? ' ' + nArch : '')]] : []).concat(Object.keys(S.prefs.starred || {}).length || S.convFilter === 'starred' ? [['starred', 'Starred']] : []).map(([k, l]) => `<button class="pill ${S.convFilter === k ? 'on' : ''}" data-a="convFilter" data-v="${k}">${l}</button>`).join('')}<button class="pill addpill" data-a="folderNew" aria-label="New folder" title="New folder">${ic('plus', 14, 2.2)} Folder</button></div>
      ${fo ? `<div class="row spread small mute" style="padding:0 4px"><span>${ic('folder', 14)} ${esc(fo.name)} · ${fo.convs.length} chat${fo.convs.length === 1 ? '' : 's'}</span><button class="small" style="color:var(--ac);font-weight:700" data-a="folderEdit" data-v="${fo.id}">Edit folder</button></div>` : ''}
      ${S.convFilter === 'requests' ? '<div class="small mute" style="padding:0 4px;line-height:1.5">People who aren\'t your friends yet. They won\'t know you\'ve seen their message until you accept.</div>' : ''}
      <div class="conv-list scroll" data-keep-scroll="convs">
        ${!S.ready?.convs ? skelRows(6, 48) : ''}
        ${S.convFilter === 'starred' ? vStarred() : ''}${S.convFilter === 'communities' ? vCommunities() : ''}${S.convFilter === 'starred' || S.convFilter === 'communities' ? '' : list.map(x => `<button class="item ${x.id === S.conv ? 'on' : ''}" data-a="openConv" data-v="${x.id}">${convAv(x, 48)}<span class="grow"><span class="row spread" style="gap:8px"><b class="ellip">${esc(convName(x))}${streakBadge(x)}</b><span class="row mute small" style="flex-shrink:0;gap:4px">${isPinnedConv(x.id) ? ic('pin', 13) : ''}${isMuted(x.id) ? ic('bellOff', 13) : ''}${fmtWhen(x.last?.at || x.createdAt)}</span></span><span class="row spread" style="gap:8px"><span class="small ellip ${unread(x) ? '' : 'mute'}" style="${unread(x) ? 'font-weight:700' : ''}">${typers(x).length ? '<span style="color:var(--ac)">typing…</span>' : draftOf(x.id) ? `<span style="color:var(--warm)">Draft:</span> ${esc(draftOf(x.id))}` : esc(lastLine(x))}</span>${unread(x) ? `<span class="unread-dot" style="${isMuted(x.id) ? 'background:var(--faint);box-shadow:none' : ''}"></span>` : ''}</span></span></button>`).join('')}
        ${S.convFilter !== 'starred' && q.length >= 2 ? vAllSearch() : ''}
        ${S.convFilter === 'starred' || S.convFilter === 'communities' ? '' : fo && !list.length ? `<div class="empty"><b>This folder is empty</b><span>Add chats to it with Edit folder.</span></div>` : !list.length && !(q.length >= 2 && S.allSearch?.items?.length) ? (S.convs.length ? `<div class="empty"><b>${S.convFilter === 'archived' ? 'Nothing archived' : 'No matches'}</b><span>${S.convFilter === 'archived' ? 'Archive chats from their ••• menu.' : 'Try another name or word.'}</span></div>`
          : `<div class="empty"><div class="ring">${ic('msg', 24)}</div><b>No conversations yet</b><span>${friendIds().length ? 'Pick a friend to start chatting.' : 'Add a friend first, then message them here.'}</span><button class="btn sm pri" data-a="${friendIds().length ? 'newChat' : 'go'}" data-v="people">${friendIds().length ? 'New message' : 'Find people'}</button></div>`) : ''}
      </div>
    </aside>
    ${c ? vChat(c) : `<section class="chat glass card"><div class="empty">${logo(72, true, 'logo-glow')}<b class="disp" style="font-size:20px;margin-top:8px">Pick a conversation</b><span>Or start a new one — messages sync live across your devices.</span><div class="row" style="gap:8px"><button class="btn pri" data-a="newChat">${ic('pen', 18)} New message</button><button class="btn" data-a="newGroup">${ic('group', 18)} New group</button></div></div></section>`}
  </div>`;
}
function vMsgBody(m, q, quote) {
  if (m.game && !m.deleted) return vGame(m);
  if (m.theme && !m.deleted) { const t = m.theme; const ok = /^#[0-9a-f]{6}$/i; if (ok.test(t.c1) && ok.test(t.c2) && ok.test(t.c3)) return `<div class="bub themecard"><div class="tprev" style="background:linear-gradient(160deg,${t.c1},${t.c2})"><span class="tb" style="background:${t.c3}"></span><span class="tb them"></span></div><b>${esc(t.name || 'Chat theme')}</b><button class="btn sm" data-a="useTheme" data-v="${m.id}">${ic('palette', 14)} Use this theme</button></div>`; }
  if (m.deleted) return `<div class="bub deleted">Message deleted</div>`;
  if (m.from !== S.me && blocked(m.from)) return `<div class="bub deleted">Message from someone you blocked</div>`;
  if (m.stickerImg && safeImg(m.stickerImg)) return `<div class="sticker">${quote ? `<div class="bub" style="margin-bottom:4px">${quote}</div>` : ''}<img class="custom-st" src="${safeImg(m.stickerImg)}" alt="Sticker"></div>`;
  if (m.sticker) return `<div class="sticker">${quote ? `<div class="bub" style="margin-bottom:4px">${quote}</div>` : ''}${stickerSvg(m.sticker, 132)}</div>`;
  if (m.audio) {
    const src = safeAudio(m.audio.src); const peaks = (m.audio.peaks || []).slice(0, 48);
    const on = S.playing?.id === m.id;
    return `<div class="bub voice-bub">${quote}<div class="voice" id="vp-${m.id}"><button class="vplay" aria-label="${on && S.playing.on ? 'Pause' : 'Play'} voice message" data-a="playVoice" data-v="${m.id}">${ic(on && S.playing.on ? 'pause' : 'play', 16, 2)}</button><span class="bars">${(peaks.length ? peaks : Array(32).fill(30)).map(h => `<i style="height:${Math.max(12, Math.min(100, +h || 0))}%"></i>`).join('')}</span><span class="vt">${fmtDur(m.audio.dur || 0)}</span><button class="vrate" data-a="voiceRate" aria-label="Playback speed ${voiceRate()}×">${voiceRate()}×</button></div>${src ? '' : '<span class="small">Audio unavailable</span>'}${m.transcript ? `<div class="transcript">${esc(m.transcript)}</div>` : src ? `<button class="tlink" data-a="transcribe" data-v="${m.id}">${(S.transcribing || {})[m.id] ? 'Transcribing…' : 'Transcribe'}</button>` : ''}</div>`;
  }
  if (m.video && !m.deleted) return vVideoBubble(m, quote);
  if (m.live && !m.deleted) return vLiveBubble(m, quote);
  if (m.roomCall && !m.deleted) { const live = roomLive(m.roomCall), inIt = S.room === m.roomCall; return `<div class="bub roomcard">${quote}<span class="row" style="gap:10px"><span class="notif-ic" style="width:40px;height:40px;background:linear-gradient(135deg,#3fbf6f,#2fd4c4)">${ic('video', 18)}</span><span class="grow"><b style="display:block">Group video call</b><span class="small" style="opacity:.8">${live.length ? `${live.length} in the call` : 'Call ended'}</span></span>${live.length ? `<span class="stack">${live.slice(0, 3).map(u => av(u, 22)).join('')}</span>` : ''}</span>${live.length && !inIt ? `<button class="btn sm pri" data-a="groupCall">Join</button>` : inIt ? '<span class="small" style="opacity:.8">You\'re in this call</span>' : `<button class="btn sm" data-a="groupCall">Start again</button>`}</div>`; }
  if (m.poll) {
    const opts = m.poll.opts || [], total = opts.reduce((n, o) => n + (o.v || []).length, 0);
    const voters = new Set(opts.flatMap(o => o.v || []));
    const closed = m.poll.closesAt && m.poll.closesAt < now(), top = Math.max(0, ...opts.map(o => (o.v || []).length));
    return `<div class="bub poll">${quote}<b class="disp" style="display:block;font-size:15px;margin-bottom:8px">${esc(m.poll.q)}</b>
      ${opts.map((o, i) => { const n = (o.v || []).length, pct = total ? Math.round(n / total * 100) : 0, mine = (o.v || []).includes(S.me); return `<button class="popt ${mine ? 'mine' : ''} ${closed && n && n === top ? 'win' : ''}" ${closed ? 'disabled' : ''} data-a="vote" data-v="${m.id}" data-i="${i}"><span class="pbar" style="width:${pct}%"></span><span class="pchk">${mine ? ic('check', 14, 2.4) : ''}</span><span class="pt">${esc(o.t)}</span><span class="stack">${(o.v || []).slice(0, 3).map(u => av(u, 20)).join('')}</span><span class="pc">${pct}%</span></button>`; }).join('')}
      <span class="small" style="opacity:.75">${voters.size} voted · ${closed ? '<b>Poll closed</b>' : (m.poll.multi ? 'Pick any' : 'Pick one') + (m.poll.closesAt ? ' · closes ' + fmtWhenFuture(m.poll.closesAt) : '')}</span></div>`;
  }
  const imgs = m.images && m.images.length ? m.images.map(safeImg).filter(Boolean) : (m.image ? [safeImg(m.image)] : []);
  if (imgs.length && shouldBlur(m)) return `<div class="bub img">${quote}<button class="blurwrap" data-a="reveal" data-v="${m.id}" aria-label="Show photo"><div class="album n${Math.min(imgs.length, 4)}">${imgs.map(u => `<img src="${u}" alt="">`).join('')}</div><span class="blurmsg">${ic('eye', 18)}<b>${m.sensitive ? 'May contain sensitive content' : 'Photo from someone you don\'t know'}</b><span class="small">Tap to view</span></span></button></div>`;
  if (imgs.length) return `<div class="bub img">${quote}<div class="album n${Math.min(imgs.length, 4)}">${imgs.map((u, i) => `<img src="${u}" alt="Photo ${i + 1}" data-a="lightbox" data-v="${m.id}" data-i="${i}">`).join('')}</div>${m.text ? `<div style="padding:6px 8px 2px">${linkify(m.text, q)}</div>` : ''}</div>`;
  const p = m.preview;
  const card = p && p.url && /^https?:\/\//.test(p.url) ? `<a class="lp" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${safeImg(p.image) ? `<img src="${safeImg(p.image)}" alt="" loading="lazy">` : ''}<span class="lpt"><b>${esc(p.title || p.url)}</b>${p.desc ? `<span>${esc(p.desc)}</span>` : ''}<small>${esc(p.site || new URL(p.url).hostname)}</small></span></a>` : '';
  return `<div class="bub">${quote}${linkify(m.text, q)}${card}</div>`;
}
function vChat(c) {
  const wall = c.wallpaper;
  const bgPref = (S.prefs.chatBgs || {})[c.id] || (wall ? (wall.theme ? { sharedTheme: wall.theme } : wall.image ? { image: wall.image } : { preset: wall.preset }) : undefined);
  const bgObj = BGS.find(b => b.id === (bgPref?.preset || S.prefs.defaultBg)) || BGS[0];
  const thm = bgPref?.sharedTheme || (bgPref?.theme ? (S.prefs.themes || []).find(t => t.id === bgPref.theme) : null);
  const bgCss = thm ? `linear-gradient(160deg,${thm.c1},${thm.c2})` : bgPref?.image && safeImg(bgPref.image) ? `url(${bgPref.image}) center/cover` : bgObj.css;
  const bgCls = bgPref?.image || thm ? '' : (bgObj.cls || '');
  const all = (S.msgs[c.id] || []).filter(m => m.at > hiddenAt(c) && !(m.expiresAt && m.expiresAt < now()));
  const q = S.findOpen ? S.find.trim().toLowerCase() : '';
  const msgs = q ? all.filter(m => (m.text || '').toLowerCase().includes(q) || (m.poll?.q || '').toLowerCase().includes(q)) : all;
  const ty = typers(c);
  const isGroup = c.type !== 'dm';
  const other = others(c)[0];
  const ev = c.type === 'event' ? allEvents().find(e => e.id === c.eventId) : null;
  const cm = c.type === 'channel' ? commOf(c.communityId) : null;
  const reqIn = isRequestForMe(c), reqOut = isRequestFromMe(c);
  const sub = ty.length ? `<span style="color:var(--ac)">${isGroup ? esc(ty.map(u => dname(u).split(' ')[0]).join(', ')) + ' typing…' : 'typing…'}</span>`
    : cm ? `${esc(cm.name)} · ${c.members.length} members`
    : c.type === 'event' ? `Event chat · ${c.members.length} going${ev ? ' · ' + new Date(ev.date + 'T00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}`
    : isGroup ? `${c.members.length} members` : (U(other)?.deleted ? 'Account deleted' : (moodOf(other) ? esc(moodOf(other)) + ' · ' : '') + presLabel(presence(other)) + (presence(other) === 'offline' && U(other)?.lastSeen ? ' · seen ' + fmtWhen(U(other).lastSeen) : ''));
  const lastMine = [...all].reverse().find(m => m.from === S.me && !m.deleted);
  let receipt = '';
  if (lastMine && all[all.length - 1]?.id === lastMine.id) {
    const readers = others(c).filter(u => ((c.reads || {})[u] || 0) >= lastMine.at && U(u)?.receipts !== false);
    receipt = readers.length ? `<div class="receipt${A('rc' + lastMine.id + readers.length)}">${ic('checks', 16, 2.2).replace('currentColor', 'var(--ac)')}${isGroup ? `Seen by ${readers.length}` : 'Read ' + fmtWhen(Math.max(...readers.map(u => c.reads[u])))}</div>`
      : `<div class="receipt">${ic('check', 14, 2.2)}Sent</div>`;
  }
  let lastDay = '', lastFrom = '', out = '';
  msgs.forEach((m, idx) => {
    const day = new Date(m.at).toDateString();
    if (day !== lastDay) { out += `<div class="day">${fmtDay(m.at)}</div>`; lastDay = day; lastFrom = ''; }
    if (m.system) { out += `<div class="day" style="background:transparent;opacity:.8">${esc(m.text)}</div>`; lastFrom = ''; return; }
    const me = m.from === S.me && !m.bot;
    const fromKey = m.bot ? 'nexa-bot' : m.from;
    const cont = lastFrom === fromKey;
    lastFrom = fromKey;
    const starred = !!(S.prefs.starred || {})[m.id];
    const reacts = Object.entries(m.reactions || {}).filter(([, us]) => us && us.length);
    const quote = m.replyTo ? `<div class="quote"><b>${esc(dname(m.replyTo.from))}</b> · ${esc((m.replyTo.text || 'Attachment').slice(0, 90))}</div>` : '';
    const canEdit = me && !m.image && !m.images && !m.audio && !m.sticker && !m.poll && !m.roomCall;
    const tr = (S.translations || {})[m.id];
    const tools = m.deleted ? '' : `<div class="tools glass">
      ${REACTIONS.slice(0, 3).map(r => `<button class="ibtn" aria-label="React ${r}" data-a="react" data-v="${m.id}" data-r="${r}">${r}</button>`).join('')}
      <button class="ibtn" aria-label="More reactions" data-a="reactMenu" data-v="${m.id}">${ic('smile', 16)}</button>
      <button class="ibtn" aria-label="Reply" data-a="reply" data-v="${m.id}">${ic('reply', 16)}</button>
      <button class="ibtn" aria-label="Pin" data-a="pin" data-v="${m.id}">${ic('pin', 16)}</button>
      ${!me && m.text && !m.bot ? `<button class="ibtn" aria-label="Translate" data-a="translate" data-v="${m.id}">${ic('globe', 16)}</button>` : ''}
      ${canEdit ? `<button class="ibtn" aria-label="Edit" data-a="edit" data-v="${m.id}">${ic('edit', 16)}</button>` : ''}
      ${m.game || m.poll ? '' : `<button class="ibtn" aria-label="Forward" data-a="fwdOpen" data-v="${m.id}">${ic('forward', 16)}</button>`}
      ${m.stickerImg && m.from !== S.me ? `<button class="ibtn" aria-label="Save sticker" data-a="saveSticker" data-v="${m.id}">${ic('plus', 16)}</button>` : ''}
      <button class="ibtn ${starred ? 'on' : ''}" aria-label="${starred ? 'Unstar' : 'Star'}" data-a="starMsg" data-v="${m.id}">${ic('star', 16)}</button>
      ${m.from === S.me ? `<button class="ibtn" aria-label="Delete" data-a="delMsg" data-v="${m.id}">${ic('trash', 16)}</button>` : `<button class="ibtn" aria-label="Report message" data-a="report" data-v="${m.from}" data-m="${m.id}">${ic('flag', 16)}</button>`}</div>`;
    const slam = m.effect === 'slam' && !seenPrev.has('m' + m.id) && now() - m.at < 60000;
    out += `<div class="m ${me ? 'me' : 'them'} ${cont ? 'cont' : ''} ${S.selMsg === m.id ? 'sel' : ''} ${slam ? 'slam' : ''} ${m._pending ? 'pending' : ''}${A('m' + m.id)}" data-a="selMsg" data-v="${m.id}">
      ${m.bot && !cont ? `<span class="who row" style="gap:6px;color:var(--ac)">${ic('spark', 13)}Nexa AI</span>` : isGroup && !me && !cont ? `<span class="who">${esc(dname(m.from))}</span>` : ''}
      ${m.forwarded ? `<span class="fwd">${ic('forward', 12)} Forwarded</span>` : ''}
      ${vMsgBody(m, q, quote)}${tr ? `<div class="trans">${ic('globe', 12)} ${tr === '…' ? 'Translating…' : esc(tr)}</div>` : ''}${tools}
      ${reacts.length ? `<div class="reacts">${reacts.map(([r, us]) => `<button class="${us.includes(S.me) ? 'mine' : ''}" data-a="react" data-v="${m.id}" data-r="${esc(r)}" title="${esc(us.map(dname).join(', '))}">${esc(r)} ${us.length > 1 ? us.length : ''}</button>`).join('')}</div>` : ''}
      ${m._pending || m.editedAt || (msgs[idx + 1]?.from !== m.from) ? `<span class="meta">${m.effect && m.effect !== 'slam' ? `<button class="fxreplay" data-a="fxReplay" data-v="${m.effect}" aria-label="Replay effect">${ic('spark', 11)}</button>` : ''}${starred ? ic('star', 11) : ''}${m.expiresAt ? ic('timer', 11) : ''}${fmtTime(m.at)}${m.editedAt && !m.deleted ? ' · edited' : ''}${m._pending && me ? ` · ${ic('clock', 11)} ${S.offline ? 'Waiting for connection' : 'Sending'}` : ''}</span>` : ''}
    </div>`;
  });
  if (!S.draft[c.id] && S.remoteDrafts?.[c.id] && !S.draftRestored?.[c.id]) { S.draftRestored = { ...(S.draftRestored || {}), [c.id]: 1 }; S.draft[c.id] = S.remoteDrafts[c.id]; }
  const draft = S.draft[c.id] || '';
  const pinned = c.pinned && c.pinned.text != null;
  const cantSend = (U(other)?.deleted && !isGroup) || dmBlocked(c);
  const sugg = S.sugg && S.sugg.conv === c.id ? S.sugg : null;
  const rec = S.rec;
  const th = thm;
  return `<section class="chat glass card fs-${S.prefs.textSize}${A('chat' + c.id)}" style="${th ? `--ac:${th.c3};--ac2:color-mix(in oklab,${th.c3} 70%,#fff)` : ''}">
    <div class="chatbg ${bgCls}" style="background:${bgCss}"></div>
    <header class="chathead">
      <button class="ibtn back" aria-label="Back to chats" data-a="closeConv">${ic('back')}</button>
      <button class="row grow" style="gap:12px;text-align:left;min-width:0" data-a="${cm ? 'commOpen' : c.type === 'event' ? 'eventOpen' : isGroup ? 'groupInfo' : 'profile'}" data-v="${cm ? cm.id : c.type === 'event' ? c.eventId : isGroup ? c.id : other}">${convAv(c, 44)}<span class="grow"><b class="ellip" style="display:block;font-size:16px">${streakBadge(c)}${esc(convName(c))}${!isGroup && nickOf(other) ? ` <span class="mute small" style="font-weight:600">· ${esc(U(other)?.name || '')}</span>` : ''}</b><span class="small mute row" style="gap:6px">${isMuted(c.id) ? ic('bellOff', 13) : ''}${c.ttl ? ic('timer', 13) : ''}${sub}</span></span></button>
      ${c.type === 'dm' && !cantCall(c) && !reqIn && !reqOut ? `<button class="ibtn" aria-label="Voice call" title="Voice call" data-a="call" data-v="audio">${ic('phone', 18)}</button><button class="ibtn" aria-label="Video call" title="Video call" data-a="call" data-v="video">${ic('video', 18)}</button>` : ''}
      ${isGroup && c.members.length > 1 ? `<button class="ibtn ${roomLive('gc_' + c.id).length ? 'on' : ''}" aria-label="Group video call" title="Group video call" data-a="groupCall">${ic('video', 18)}</button>` : ''}
      <button class="ibtn hide-m ${S.findOpen ? 'on' : ''}" aria-label="Search in conversation" title="Search (Ctrl F)" data-a="find">${ic('search', 18)}</button>
      <button class="ibtn hide-m ${S.bgPop ? 'on' : ''}" aria-label="Chat appearance" title="Background &amp; text size" data-a="bgPop">${ic('palette', 18)}</button>
      <button class="ibtn hide-m ${S.wide ? 'on' : ''}" aria-label="Larger chat view" title="Larger view" data-a="wide">${ic('expand', 18)}</button>
      <button class="ibtn" aria-label="Conversation options" data-a="convMenu">${ic('more', 18)}</button>
    </header>
    ${S.bgPop ? vBgPop(c) : ''}
    ${S.findOpen ? `<div class="findbar glass${A('find')}">${ic('search', 16)}<input id="findQ" data-model="find" value="${esc(S.find)}" placeholder="Search this conversation" aria-label="Search this conversation" data-autofocus><span class="mute small">${q ? msgs.length + ' found' : ''}</span><button class="ibtn sm" aria-label="Close search" data-a="find">${ic('x', 16)}</button></div>` : ''}
    ${pinned && !S.findOpen ? `<div class="pinbar glass">${ic('pin', 16)}<b style="color:var(--warm)">Pinned</b><button class="grow ellip" style="text-align:left" data-a="jumpPin">${esc(c.pinned.text || 'Attachment')}</button><button class="ibtn sm" aria-label="Unpin" data-a="unpin">${ic('x', 14)}</button></div>` : ''}
    <div class="stream" id="stream" data-conv="${c.id}" role="log" aria-live="polite" aria-label="Messages">
      ${S.msgs[c.id] === undefined ? skelBubbles() : ''}
      ${S.hasMore[c.id] && !q ? `<button class="btn sm" style="align-self:center;margin:6px 0 10px" data-a="loadMore">Load earlier messages</button>` : ''}
      ${S.msgs[c.id] === undefined ? '' : msgs.length ? out : q ? `<div class="empty"><b>No messages match "${esc(S.find)}"</b></div>` : `<div class="empty">${convAv(c, 72, false)}<b class="disp" style="font-size:18px">${esc(convName(c))}</b><span>${c.type === 'event' ? 'Everyone going to this event is here. Plan the details!' : isGroup ? `Group with ${c.members.length} members. Say hi to everyone.` : 'This is the start of your conversation.'}</span></div>`}
      ${!q ? receipt : ''}
      ${ty.length && !q ? `<div class="typing${A('ty' + c.id)}" aria-label="typing"><i></i><i></i><i></i></div>` : ''}
    </div>
    <div class="composer-wrap">
      ${sugg ? `<div class="suggs${A('sugg')}">${sugg.loading ? `<span class="chip" style="display:inline-flex;gap:8px;align-items:center">${ic('spark', 14)} Thinking…</span>` : sugg.items.map((t, i) => `<button class="chip" data-a="useSugg" data-i="${i}">${esc(t)}</button>`).join('')}<button class="ibtn sm" aria-label="Close suggestions" data-a="closeSugg">${ic('x', 14)}</button></div>` : ''}
      ${S.picker ? vPicker() : ''}
      ${S.attach ? `<div class="menu glass${A('attach')}" style="position:absolute;left:16px;bottom:78px"><label class="mbtn">${ic('album', 18)}Photos (up to 6)<input type="file" accept="image/*" multiple class="sr" data-file="sendPhotos"></label><button data-a="vnoteStart">${ic('video', 18)}Video message</button><label class="mbtn">${ic('film', 18)}Send a video<input type="file" accept="video/*" class="sr" data-file="sendVideo"></label><button data-a="liveOpen">${ic('map', 18)}Share live location</button><button data-a="fxOpen">${ic('spark', 18)}Send with effect</button><button data-a="pollOpen">${ic('poll', 18)}Poll</button><button data-a="schOpen">${ic('clock', 18)}Schedule message</button><label class="mbtn">${ic('sticker', 18)}Make a sticker<input type="file" accept="image/*" class="sr" data-file="newSticker"></label><button data-a="watchOpen">${ic('play', 18)}Watch together</button><button data-a="boardOpen">${ic('brush', 18)}Drawing board</button><div class="msep">Games</div><button data-a="newGame" data-v="ttt">${ic('game', 18)}Tic-tac-toe</button><button data-a="newGame" data-v="c4">${ic('game', 18)}Connect Four</button><button data-a="wordNewOpen">${ic('game', 18)}Word guess</button><button data-a="newGame" data-v="trivia">${ic('game', 18)}Trivia battle</button><button data-a="newGame" data-v="rps">${ic('game', 18)}Rock, paper, scissors</button><button data-a="addLink">${ic('link', 18)}Link</button></div>` : ''}
      ${(S.scheduled || []).some(x => x.conv === c.id) ? `<button class="ctx glass" style="width:100%;text-align:left" data-a="schOpen">${ic('clock', 16)}<span class="grow">${(S.scheduled || []).filter(x => x.conv === c.id).length} scheduled message${(S.scheduled || []).filter(x => x.conv === c.id).length > 1 ? 's' : ''}</span><span class="mute small">Manage</span></button>` : ''}
      ${S.replyTo ? `<div class="ctx glass${A('ctx')}"><span style="color:var(--ac);font-weight:700">${ic('reply', 16)}</span><span class="grow ellip"><b>Replying to ${esc(dname(S.replyTo.from))}</b> <span class="mute">${esc(S.replyTo.text || 'Attachment')}</span></span><button class="ibtn sm" aria-label="Cancel reply" data-a="cancelCtx">${ic('x', 14)}</button></div>` : ''}
      ${S.editing ? `<div class="ctx glass${A('ctxe')}"><span style="color:var(--warm)">${ic('edit', 16)}</span><span class="grow"><b>Editing message</b> <span class="mute small">Esc to cancel</span></span><button class="ibtn sm" aria-label="Cancel edit" data-a="cancelCtx">${ic('x', 14)}</button></div>` : ''}
      ${reqOut ? `<div class="ctx glass small">${ic('send', 16)}<span class="grow">Message request sent. ${esc(dname(other).split(' ')[0])} can reply once they accept. <button class="grad-text" style="font-weight:700" data-a="addFriend" data-v="${other}">Add friend</button></span></div>` : ''}
      ${reqIn && !cantSend ? `<div class="reqbanner glass${A('reqb' + c.id)}"><div>${av(other, 44)}</div><div class="grow"><b>${esc(dname(other))} wants to message you</b><div class="mute small">@${esc(U(other)?.handle || '')} · Not your friend yet. Accept to reply — they won't know you've seen this until you do.</div></div><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm danger" data-a="reqBlock">Block</button><button class="btn sm" data-a="reqDelete">Delete</button><button class="btn sm pri" data-a="reqAccept">Accept</button></div></div>`
      : cantSend ? `<div class="ctx glass mute">${dmBlocked(c) ? `You blocked this person. <button class="btn sm" data-a="unblock" data-v="${other}">Unblock</button>` : 'This account no longer exists.'}</div>`
      : rec ? `<div class="composer glass recbar${A('rec')}"><button class="ibtn" style="border:0" aria-label="Cancel recording" data-a="recCancel">${ic('trash', 18)}</button><span class="recdot"></span><span id="recTime" class="vt" style="min-width:40px">0:00</span><span class="bars live grow" id="recBars"></span><button class="send" aria-label="Send voice message" data-a="recSend">${ic('send', 20, 2)}</button></div>`
      : `<div class="composer glass">
        <button class="ibtn ${S.attach ? 'on' : ''}" style="border:0" aria-label="Attach" title="Photos, poll, link" data-a="attach">${ic('plus', 20, 2)}</button>
        <label class="ibtn hide-xs" style="cursor:pointer;border:0" aria-label="Send photos" title="Send photos">${ic('photo')}<input type="file" accept="image/*" multiple class="sr" data-file="sendPhotos"></label>
        <button class="ibtn ${S.picker ? 'on' : ''}" style="border:0" aria-label="Emoji, stickers and GIFs" title="Emoji, stickers & GIFs" data-a="picker">${ic('smile')}</button>
        <textarea id="composer" rows="1" data-model="draft" placeholder="Message ${esc(convName(c).split(',')[0])}" aria-label="Message">${esc(draft)}</textarea>
        <button class="ibtn hide-xs" style="border:0;color:var(--ac)" aria-label="Suggest replies with Nexa AI" title="Suggest replies" data-a="suggest">${ic('spark')}</button>
        ${S.editing ? '' : `<button class="ibtn" style="border:0" aria-label="Record voice message" title="Voice message" data-a="recStart">${ic('mic')}</button>`}
        <button class="send" aria-label="Send" data-a="send">${ic(S.editing ? 'check' : 'send', 20, 2)}</button>
      </div>`}
    </div>
  </section>`;
}
function vPicker() {
  const tab = S.pickTab || 'emoji';
  const gifOn = !!gifKey();
  let body = '';
  if (tab === 'emoji') body = `<div class="emgrid">${EMOJI.map(e => `<button data-a="insEmoji" data-v="${e}" aria-label="${e}">${e}</button>`).join('')}</div>`;
  if (tab === 'stickers') body = `<div class="row spread"><span class="sec">Yours</span>${(S.myStickers || []).length ? `<button class="small mute" data-a="stickerEdit">${S.stickerEdit ? 'Done' : 'Edit'}</button>` : ''}</div><div class="stgrid">${(S.myStickers || []).map((u, i) => `<button class="mysticker" data-a="${S.stickerEdit ? 'delMySticker' : 'sendMySticker'}" data-i="${i}" aria-label="${S.stickerEdit ? 'Remove sticker' : 'Send your sticker'}"><img src="${safeImg(u)}" alt="">${S.stickerEdit ? `<span class="stx">${ic('x', 12, 2.5)}</span>` : ''}</button>`).join('')}<label class="mysticker add" aria-label="Make a sticker from a photo" title="Make a sticker from a photo">${ic('plus', 20)}<input type="file" accept="image/*" class="sr" data-file="newSticker"></label></div><div class="sec">Nexa</div><div class="stgrid">${STICKERS.map(s => `<button data-a="sendSticker" data-v="${s[0]}" aria-label="Send ${esc(s[1])} sticker">${stickerSvg(s[0], 72)}</button>`).join('')}</div>`;
  if (tab === 'gifs') body = `<label class="search" style="flex:none;max-width:none;height:40px">${ic('search', 16)}<input id="gifQ" data-model="form.gifQ" value="${esc(S.form.gifQ || '')}" placeholder="Search GIFs" aria-label="Search GIFs"></label><div class="gifgrid scroll">${(S.gifs || []).map((g, i) => `<button data-a="sendGif" data-i="${i}"><img src="${esc(g.preview)}" alt="${esc(g.alt || 'GIF')}" loading="lazy"></button>`).join('') || `<div class="empty small">${S.gifLoading ? 'Loading…' : 'Type to search GIFs'}</div>`}</div><div class="mute" style="font-size:10px;text-align:right">Powered by KLIPY</div>`;
  return `<div class="picker glass${A('picker')}"><div class="tabs">${[['emoji', 'Emoji'], ['stickers', 'Stickers']].concat(gifOn ? [['gifs', 'GIFs']] : []).map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-a="pickTab" data-v="${k}">${l}</button>`).join('')}</div>${body}</div>`;
}
function vBgPop(c) {
  const p = (S.prefs.chatBgs || {})[c.id] || {};
  const cur = p.image ? 'custom' : p.theme ? 'theme' : (p.preset || S.prefs.defaultBg);
  return `<div class="menu glass${A('bgpop')}" style="right:14px;top:80px;width:320px;padding:16px;gap:12px">
    <div class="sec">Background · this chat</div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
      ${BGS.map(b => `<button class="sw ${b.cls || ''} ${cur === b.id ? 'on' : ''}" style="height:54px;background:${b.css}" title="${b.name}" aria-label="${b.name}" data-a="chatBg" data-v="${b.id}"></button>`).join('')}
      <label class="sw add ${cur === 'custom' ? 'on' : ''}" style="height:54px;${p.image ? `background:url(${safeImg(p.image)}) center/cover` : ''}" title="Custom image">${p.image ? '' : ic('plus', 18)}<input type="file" accept="image/*" class="sr" data-file="chatBgImg"></label>
    </div>
    <div class="mute small">${esc(cur === 'custom' ? 'Custom image' : cur === 'theme' ? ((S.prefs.themes || []).find(t => t.id === p.theme)?.name || 'Theme') : (BGS.find(b => b.id === cur) || BGS[0]).name)} — just for you.</div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm" data-a="shareWall">${ic('group', 14)} Use for everyone in this chat</button>${c.wallpaper ? '<button class="btn sm" data-a="clearWall">Remove shared</button>' : ''}<label class="btn sm" style="cursor:pointer">${ic('photo', 14)} Shared photo<input type="file" accept="image/*" class="sr" data-file="wallImg"></label></div>
    ${c.wallpaper ? `<div class="mute small">Shared wallpaper set by ${esc(c.wallpaper.by === S.me ? 'you' : dname(c.wallpaper.by))}. Your own pick above overrides it just for you.</div>` : ''}
    <div class="sec row spread">Your themes<button class="btn sm" style="height:28px" data-a="themeNew">${ic('plus', 14)} Create</button></div>
    ${(S.prefs.themes || []).length ? `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${S.prefs.themes.map(t => `<button class="sw ${p.theme === t.id ? 'on' : ''}" style="height:54px;background:linear-gradient(160deg,${t.c1},${t.c2});position:relative" title="${esc(t.name)}" aria-label="${esc(t.name)}" data-a="useThemeSaved" data-v="${t.id}"><span style="position:absolute;right:6px;bottom:6px;width:14px;height:14px;border-radius:50%;background:${t.c3};border:2px solid #fff"></span></button>`).join('')}</div>` : '<div class="mute small">Make your own colours and share them with friends.</div>'}
    <div class="sec">Text size</div>
    <div class="pills">${[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']].map(([k, l]) => `<button class="pill ${S.prefs.textSize === k ? 'on' : ''}" data-a="pref" data-k="textSize" data-v="${k}">${l}</button>`).join('')}</div>
  </div>`;
}

/* ---------------- people ---------------- */
function vPeople() {
  const fr = friendIds().sort((a, b) => dname(a).localeCompare(dname(b)));
  const q = S.peopleQ.trim();
  let list = '';
  if (q) {
    list = S.peopleRes.length ? S.peopleRes.map(u => personRow(u.id)).join('') : S.searching ? `<div class="empty"><b>Searching…</b></div>` : `<div class="empty"><div class="ring">${ic('search', 24)}</div><b>No one matches "${esc(q)}"</b><span>${q.replace(/^@/, '').length < 2 ? 'Type at least 2 letters of their @handle or name.' : 'Check the spelling of their @handle — ask them for it, or share yours.'}</span></div>`;
  } else if (S.ptab === 'friends') {
    list = fr.length ? fr.map(personRow).join('') : `<div class="empty"><div style="position:relative;width:170px;height:110px"><span style="position:absolute;left:53px;top:18px">${av(S.me, 64)}</span><div class="ghosts" style="position:absolute;inset:0;justify-content:space-between;align-items:flex-start"><span></span><span style="margin-top:50px"></span></div></div><b class="disp" style="font-size:18px">Your circle starts here</b><span style="max-width:360px">Search for someone above by name or @handle. Friends you add show up here with their status.</span></div>`;
  } else if (S.ptab === 'requests') {
    list = S.reqIn.length ? S.reqIn.map(reqRow).join('') : `<div class="empty"><div class="ring">${ic('userplus', 24)}</div><b>No requests yet</b><span>When someone sends you a friend request, it appears here.</span></div>`;
  } else {
    list = S.reqOut.length ? S.reqOut.map(r => `<div class="person${A('ro' + r.id)}">${av(r.to, 44)}<span class="grow"><b class="ellip" style="display:block">${esc(dname(r.to))}</b><span class="mute small">@${esc(U(r.to)?.handle || '')} · waiting</span></span><button class="btn sm" data-a="cancelReq" data-v="${r.id}">Cancel</button></div>`).join('') : `<div class="empty"><div class="ring">${ic('send', 24)}</div><b>Nothing sent</b><span>Requests you send wait here until they're accepted.</span></div>`;
  }
  return `<div class="people">
    <section class="panel glass card" style="padding:24px;gap:16px">
      <div class="row spread"><h1 class="h1 hide-m">People</h1><button class="btn sm pri" data-a="copyHandle">${ic('link', 16)} Share my handle</button></div>
      <label class="search" style="flex:none;max-width:none;height:52px">${ic('search', 18)}<input id="peopleQ" data-model="peopleQ" value="${esc(S.peopleQ)}" placeholder="Search by name or @handle" aria-label="Search Nexa users" style="font-size:15px"></label>
      ${q ? `<div class="sec">Results</div>` : `<div class="tabs">${[['friends', 'Friends', fr.length], ['requests', 'Requests', S.reqIn.length], ['sent', 'Sent', S.reqOut.length]].map(([k, l, n]) => `<button class="tab ${S.ptab === k ? 'on' : ''}" data-a="ptab" data-v="${k}">${l}${n ? ` <span class="${k === 'requests' ? 'badge' : 'mute'}">${n}</span>` : ''}</button>`).join('')}</div>`}
      <div class="col scroll" style="gap:8px;flex:1" data-keep-scroll="people">${list}</div>
    </section>
    <section class="col" style="gap:16px">
      ${suggestions().length ? `<div class="panel glass card react"><h2 class="h2">People you may know</h2>${suggestions().map(suggRow).join('')}</div>` : ''}
      <div class="panel glass card react"><h2 class="h2">How friends work</h2>
        <div class="step"><span class="n">1</span><span><b>Search</b> <span class="mute">a name or @handle and send a request.</span></span></div>
        <div class="step"><span class="n">2</span><span><b>Accept</b> <span class="mute">their request, or they accept yours — you'll both get notified.</span></span></div>
        <div class="step"><span class="n">3</span><span><b>Nickname</b> <span class="mute">friends privately. Only you see it; they keep their public name.</span></span></div></div>
      <div class="panel glass card react"><h2 class="h2">Your Nexa handle</h2>
        <div class="row" style="padding:14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--line2)"><span class="grow" style="min-width:0"><span class="disp ellip" style="display:block;font-size:20px;font-weight:600">@${esc(S.profile.handle)}</span><span class="mute small ellip" style="display:block">${esc(profileLink().replace(/^https?:\/\//, ''))}</span></span><button class="btn sm" data-a="copyHandle">Copy link</button><button class="ibtn sm" aria-label="Show my QR code" data-a="myQr">${ic('qr', 16)}</button></div>
        <div class="mute small">Friends can tap your link or scan your QR code to add you. Change who can send requests in Settings › Privacy.</div></div>
    </section>
  </div>`;
}
function personRow(uid) {
  const u = U(uid) || S.peopleRes.find(x => x.id === uid) || {};
  const fr = isFriend(uid);
  const out = S.reqOut.find(r => r.to === uid), inn = S.reqIn.find(r => r.from === uid);
  const nk = nickOf(uid);
  const actions = personActions(uid);
  return `<div class="person${A('p' + uid)}"><button data-a="profile" data-v="${uid}" aria-label="View profile">${av(uid, 46, fr)}</button>
    <button class="grow" style="text-align:left" data-a="profile" data-v="${uid}"><span class="row" style="gap:8px"><b class="ellip">${esc(nk || u.name || 'Nexa user')}</b>${nk ? `<span class="nick">${ic('tag', 11)} nickname</span>` : ''}</span><span class="mute small ellip" style="display:block">@${esc(u.handle || '')}${nk ? ' · ' + esc(u.name) : ''}${moodOf(uid) ? ' · ' + esc(moodOf(uid)) : ''}${u.nowText ? ' · ' + esc(u.nowText) : u.bio ? ' · ' + esc(u.bio) : ''}</span></button>
    <div class="row" style="gap:8px">${actions}</div></div>`;
}
function personActions(uid) {
  const u = U(uid) || S.peopleRes.find(x => x.id === uid) || {};
  const fr = isFriend(uid);
  const out = S.reqOut.find(r => r.to === uid), inn = S.reqIn.find(r => r.from === uid);
  let actions = '';
  if (uid === S.me) actions = '<span class="mute small">You</span>';
  else if (fr) actions = `<button class="btn sm pri" data-a="dm" data-v="${uid}">${ic('msg', 16)} Message</button><button class="ibtn sm" aria-label="More" data-a="personMenu" data-v="${uid}">${ic('more', 16)}</button>`;
  else if (inn && !blocked(uid)) actions = `<button class="btn sm pri" data-a="accept" data-v="${inn.id}">Accept</button><button class="btn sm" data-a="decline" data-v="${inn.id}">Decline</button>`;
  else if (out) actions = `<button class="btn sm" data-a="cancelReq" data-v="${out.id}">Requested</button>`;
  else if (u.allowRequests === 'nobody') actions = '<span class="mute small">Not accepting requests</span>';
  else if (blocked(uid)) actions = `<button class="btn sm" data-a="unblock" data-v="${uid}">Unblock</button>`;
  else actions = `<button class="btn sm pri" data-a="addFriend" data-v="${uid}">${ic('userplus', 16)} Add friend</button>`;
  if (uid !== S.me && !fr) actions += `<button class="ibtn sm" aria-label="More" data-a="personMenu" data-v="${uid}">${ic('more', 16)}</button>`;
  return actions;
}

/* ---------------- events ---------------- */
function vEvents() {
  const t = todayStr();
  let list = allEvents();
  if (S.evTab === 'upcoming') list = list.filter(e => e.date >= t);
  if (S.evTab === 'going') list = list.filter(e => e.date >= t && going(e));
  if (S.evTab === 'hosting') list = list.filter(e => e.creator === S.me);
  if (S.evTab === 'past') list = list.filter(e => e.date < t).reverse();
  return `<div class="panel glass card" style="height:100%;padding:24px;gap:16px">
    <div class="row spread"><div><h1 class="h1 hide-m">Events</h1><div class="mute">Plans with the people you care about.</div></div><button class="btn pri" data-a="newEvent">${ic('plus', 18, 2)} Create event</button></div>
    <div class="tabs">${[['upcoming', 'Upcoming'], ['going', 'Going'], ['hosting', 'Hosting'], ['past', 'Past']].map(([k, l]) => `<button class="tab ${S.evTab === k ? 'on' : ''}" data-a="evTab" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="ev-grid scroll" style="flex:1" data-keep-scroll="ev">
      ${list.map((e, i) => evCard(e, i)).join('')}
      ${S.evTab !== 'past' ? `<button class="newcard" data-a="newEvent"><span class="empty" style="flex:none;padding:0"><span class="ring">${ic('plus', 26, 2)}</span></span><b style="color:var(--text)">${list.length ? 'New event' : S.evTab === 'going' ? 'Nothing you\'re going to yet' : 'Create your first event'}</b><span class="small">Pick a date, add a cover and choose who can see it.</span></button>` : !list.length ? '<div class="empty"><b>No past events</b></div>' : ''}
    </div>
  </div>`;
}
function evCard(e, i) {
  const d = new Date(e.date + 'T00:00');
  const cover = safeImg(e.image) ? `url(${e.image})` : `${gradFor(e.id)}`;
  const att = e.attendees || [];
  const mine = e.creator === S.me;
  return `<article class="ev glass card react${A('ev' + e.id)}" style="animation-delay:${Math.min(i, 8) * 40}ms">
    <button class="cover" style="background:${cover};background-size:cover;background-position:center" data-a="eventOpen" data-v="${e.id}" aria-label="Open ${esc(e.title)}">
      <span class="when"><small style="display:block;font-size:10px">${d.toLocaleString([], { month: 'short' }).toUpperCase()}</small><span style="font-size:19px">${d.getDate()}</span></span>
      <span class="aud">${{ friends: 'Friends', invite: 'Invite only', public: 'Public' }[e.audience] || ''}</span></button>
    <div class="body">
      <button class="disp ellip" style="font-weight:600;font-size:17px;text-align:left" data-a="eventOpen" data-v="${e.id}">${esc(e.title)}</button>
      <span class="mute small">${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}${e.time ? ' · ' + esc(e.time) : ''}</span>
      <div class="row" style="gap:10px;margin-top:auto"><span class="stack">${att.slice(0, 4).map(u => av(u, 28)).join('')}</span><span class="mute small grow">${att.length} going${(e.maybe || []).length ? ' · ' + e.maybe.length + ' maybe' : ''}${mine ? ' · hosting' : ''}</span></div>
      <div class="row" style="gap:8px">${mine ? `<button class="btn sm grow" data-a="eventOpen" data-v="${e.id}">Manage</button><button class="ibtn sm" aria-label="Delete event" data-a="delEvent" data-v="${e.id}">${ic('trash', 16)}</button>`
        : rsvpPills(e)}${mine ? `<button class="ibtn sm" aria-label="Share invite link" data-a="shareEvent" data-v="${e.id}">${ic('share', 16)}</button>` : ''}</div>
    </div></article>`;
}

/* ---------------- notifications ---------------- */
function vNotifs() {
  const f = S.form.nf || 'all';
  let list = S.notifs.filter(n => !blocked(n.from));
  if (f === 'friends') list = list.filter(n => n.type?.startsWith('friend'));
  if (f === 'events') list = list.filter(n => n.type?.startsWith('event'));
  if (f === 'other') list = list.filter(n => !n.type?.startsWith('friend') && !n.type?.startsWith('event'));
  return `<div class="panel glass card" style="height:100%;padding:24px;gap:14px;max-width:900px">
    <div class="row spread"><h1 class="h1 hide-m">Notifications</h1><div class="row" style="gap:8px"><button class="btn sm" data-a="markAll" ${S.notifs.some(n => !n.read) ? '' : 'disabled'}>Mark all read</button><button class="btn sm" data-a="clearNotifs" ${S.notifs.length ? '' : 'disabled'}>Clear</button></div></div>
    <div class="pills">${[['all', 'All'], ['friends', 'Friends'], ['events', 'Events'], ['other', 'Other']].map(([k, l]) => `<button class="pill ${f === k ? 'on' : ''}" data-a="nf" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="list scroll" style="flex:1" data-keep-scroll="nt">${list.length ? list.map(n => notifRow(n)).join('') : `<div class="empty"><div class="ring">${ic('bell', 24)}</div><b>You're all caught up</b><span>Friend requests, invites and event updates will appear here. New messages show as badges on Messages.</span></div>`}</div>
  </div>`;
}

/* ---------------- profile ---------------- */
function vProfile() {
  const uid = S.profileUid || S.me, mine = uid === S.me;
  const u = mine ? S.profile : U(uid);
  if (!u) return `<div class="empty">Loading profile…</div>`;
  const fr = isFriend(uid), nk = nickOf(uid);
  const p = presence(uid);
  const hosted = allEvents().filter(e => e.creator === uid).length;
  const groups = S.convs.filter(c => c.type === 'group' && c.members.includes(uid)).length;
  const btns = mine ? `<button class="btn" data-a="go" data-v="settings">${ic('pen', 16)} Edit profile</button><button class="btn pri" data-a="copyHandle">Share profile</button>`
    : fr ? `<button class="btn pri" data-a="dm" data-v="${uid}">${ic('msg', 16)} Message</button><button class="btn" data-a="nickname" data-v="${uid}">${ic('tag', 16)} ${nk || (S.pics || {})[uid] ? 'Edit nickname & photo' : 'Nickname & photo'}</button><button class="ibtn" aria-label="More" data-a="personMenu" data-v="${uid}">${ic('more')}</button>`
    : personActions(uid) + (canDM(uid) && !blocked(uid) && !U(uid)?.deleted ? `<button class="btn" data-a="dm" data-v="${uid}">${ic('msg', 16)} Message</button>` : '');
  const wg = u.widgets || {}, earned = u.badges || {};
  return `<div class="profile">
    <section class="glass card" style="overflow:hidden;display:flex;flex-direction:column">
      <div class="cover-art" style="${safeImg(u.banner) ? `background:url(${u.banner}) center/cover` : /^#[0-9a-f]{6}$/i.test(u.color || '') ? `background:radial-gradient(80% 120% at 20% 0%,${u.color},transparent 65%),radial-gradient(60% 100% at 90% 30%,color-mix(in oklab,${u.color} 50%,#ff8a4c),transparent 60%),#0b1024` : ''}"><div class="sky" style="position:absolute"><div class="grain"></div></div></div>
      <div class="col" style="padding:0 clamp(18px,3vw,32px) 28px;margin-top:-66px;gap:14px;position:relative">
        <div class="row spread" style="align-items:flex-end;flex-wrap:wrap;gap:12px"><span style="border-radius:50%;padding:4px;background:var(--ground);box-shadow:0 0 50px -10px var(--ac)">${av(uid, 128, true)}</span><div class="row" style="gap:8px;flex-wrap:wrap">${btns}</div></div>
        <div><h1 class="h1" style="font-size:30px">${esc(nk || u.name)}</h1><div class="mute">@${esc(u.handle || '')}${nk ? ` · public name <b style="color:var(--text)">${esc(u.name)}</b>` : ''}</div></div>
        ${!mine && (nk || (S.pics || {})[uid]) ? `<div class="row small" style="gap:8px;padding:10px 12px;border-radius:12px;background:color-mix(in oklab,var(--warm) 10%,transparent);border:1px solid color-mix(in oklab,var(--warm) 30%,transparent)">${ic('lock', 16)}<span>${nk && (S.pics || {})[uid] ? `The nickname "${esc(nk)}" and this photo are private` : nk ? `"${esc(nk)}" is your private nickname` : 'This photo is your private pick'} — only you can see ${nk && (S.pics || {})[uid] ? 'them' : 'it'}.</span></div>` : ''}
        ${moodOf(uid) || mine ? `<div class="row" style="gap:8px;flex-wrap:wrap">${moodOf(uid) ? `<span class="moodtag">${ic('clock', 13)} ${esc(moodOf(uid))} <span class="mute">· until ${new Date(u.mood.until).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span></span>` : ''}${mine ? `<button class="btn sm" data-a="moodOpen">${moodOf(uid) ? 'Change status' : 'Set a status'}</button>` : ''}</div>` : ''}
        ${u.nowText ? `<div class="nowtag">${ic('spark', 14)} ${esc(u.nowText)}</div>` : ''}
        <div style="font-size:15px;line-height:1.6;max-width:580px">${u.bio ? esc(u.bio) : `<span class="mute">${mine ? 'No bio yet — add one in Settings › Profile.' : 'No bio yet.'}</span>`}</div>
        <div class="pills"><span class="pill on"><span class="av" style="width:10px;height:10px;background:none"><span class="st ${p}" style="position:static;width:10px;height:10px;border:0"></span></span>${presLabel(p)}</span><span class="pill">Joined ${new Date(u.createdAt || now()).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>${u.birthday && (mine || fr) && u.showBirthday !== false ? `<span class="pill">${ic('cake', 14)} ${new Date('2000-' + u.birthday + 'T00:00').toLocaleDateString([], { month: 'long', day: 'numeric' })}</span>` : ''}${fr ? '<span class="pill">Friends</span>' : ''}</div>
      </div>
    </section>
    <section class="col" style="gap:16px">
      <div class="panel glass card" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="stat"><b>${mine ? friendIds().length : '—'}</b><span class="mute small">Friends</span></div>
        <div class="stat"><b>${hosted}</b><span class="mute small">Events hosted</span></div>
        <div class="stat"><b>${groups}</b><span class="mute small">${mine ? 'Groups' : 'Shared groups'}</span></div></div>
      ${mine ? `<div class="panel glass card"><h2 class="h2">Status</h2><div class="pills">${['online', 'away', 'busy'].map(k => `<button class="pill ${S.profile.status === k || (!S.profile.status && k === 'online') ? 'on' : ''}" data-a="status" data-v="${k}"><span class="av" style="width:10px;height:10px;background:none"><span class="st ${k}" style="position:static;width:10px;height:10px;border:0"></span></span>${presLabel(k)}</button>`).join('')}</div><div class="mute small">Friends see this next to your name.</div></div>
        <div class="panel glass card"><h2 class="h2">What others see</h2><div class="mute small" style="line-height:1.6">Your photo, display name, @handle, bio and status are public. Nicknames friends give you stay private to them.</div><button class="btn sm" style="align-self:flex-start" data-a="logout">${ic('logout', 16)} Log out</button></div>`
        : ''}
      ${wg.song || wg.game || (wg.photos || []).length ? `<div class="panel glass card"><h2 class="h2">${mine ? 'Your widgets' : 'On their profile'}</h2>
        ${wg.song ? `<div class="widget"><span class="notif-ic" style="width:40px;height:40px;background:linear-gradient(135deg,#ff4d6d,#9b6bff)">${ic('music', 18)}</span><span class="grow"><span class="mute small" style="display:block">On repeat</span><b class="ellip" style="display:block">${esc(wg.song)}</b></span></div>` : ''}
        ${wg.game ? `<div class="widget"><span class="notif-ic" style="width:40px;height:40px;background:linear-gradient(135deg,#3fbf6f,#2fd4c4)">${ic('game', 18)}</span><span class="grow"><span class="mute small" style="display:block">Favourite game</span><b class="ellip" style="display:block">${esc(wg.game)}</b></span></div>` : ''}
        ${(wg.photos || []).length ? `<div class="wphotos">${wg.photos.map(p => `<img src="${safeImg(p)}" alt="" loading="lazy">`).join('')}</div>` : ''}
        ${mine ? '<button class="btn sm" style="align-self:flex-start" data-a="setSecGo" data-v="profile">Edit widgets</button>' : ''}</div>` : mine ? `<div class="panel glass card"><h2 class="h2">Profile widgets</h2><div class="mute small">Show your favourite song, game and photos on your profile.</div><button class="btn sm pri" style="align-self:flex-start" data-a="setSecGo" data-v="profile">Add widgets</button></div>` : ''}
      <div class="panel glass card"><div class="row spread"><h2 class="h2">Badges</h2><span class="mute small">${Object.keys(earned).length} of ${BADGES.length}</span></div><div class="badges">${BADGES.filter(b => mine || earned[b[0]]).map(b => badgeChip(b, !!earned[b[0]])).join('') || '<span class="mute small">No badges yet.</span>'}</div></div>
      ${mine ? '' : `<div class="panel glass card"><h2 class="h2">${fr ? 'Your friendship' : 'About'}</h2><div class="mute small" style="line-height:1.6">${fr ? 'You can message, invite to events and add them to groups.' : 'Send a friend request to message each other and share events.'}</div></div>`}
    </section>
  </div>`;
}

/* ---------------- settings ---------------- */
function vSettings() {
  const secs = [['profile', 'user', 'Profile'], ['appearance', 'brush', 'Appearance'], ['chats', 'msg', 'Chats'], ['notifications', 'bell', 'Notifications'], ['privacy', 'lock', 'Privacy'], ['account', 'gear', 'Account'], ['shortcuts', 'keyboard', 'Shortcuts']];
  const s = S.setSec, f = S.form, pr = S.profile, p = S.prefs;
  const tog = (on, a, k, label) => `<button class="tog ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" aria-label="${label}" data-a="${a}" data-k="${k}"></button>`;
  let body = '';
  if (s === 'profile') body = `<h2 class="h1" style="font-size:24px">Profile</h2>
    <div class="row" style="gap:18px;flex-wrap:wrap">${av(S.me, 92)}<label class="btn" style="cursor:pointer">${ic('photo', 18)} Upload photo<input type="file" accept="image/*" class="sr" data-file="avatar"></label>${pr.avatar ? '<button class="btn" data-a="removeAvatar">Remove</button>' : ''}</div>
    <label class="field">Display name<input class="inp" id="s-name" data-model="form.sName" value="${esc(f.sName ?? pr.name)}" maxlength="40"></label>
    <label class="field">Nexa username<div class="row" style="gap:0"><span class="inp" style="width:auto;display:flex;align-items:center;border-right:0;border-radius:13px 0 0 13px;color:var(--mute)">@</span><input class="inp" style="border-radius:0 13px 13px 0" id="s-handle" data-model="form.sHandle" value="${esc(f.sHandle ?? pr.handle)}" maxlength="24"></div></label>
    <label class="field">Bio<textarea class="inp" id="s-bio" data-model="form.sBio" rows="3" maxlength="160" placeholder="Say something about yourself">${esc(f.sBio ?? pr.bio ?? '')}</textarea></label>
    <label class="field">What you're up to <span style="font-weight:500">(shows on your profile)</span><input class="inp" id="s-now" data-model="form.sNow" value="${esc(f.sNow ?? pr.nowText ?? '')}" maxlength="60" placeholder="Listening to… / Working on… / Playing…"></label>
    <div class="pills" style="margin-top:-12px">${['Listening to ', 'Working on ', 'Playing ', 'Reading ', 'Travelling to '].map(t => `<button class="chip" data-a="nowPreset" data-v="${t}">${t.trim()}…</button>`).join('')}</div>
    <div class="field">Profile banner<div class="row" style="gap:10px;flex-wrap:wrap"><span class="bannerprev" style="${safeImg(pr.banner) ? `background:url(${pr.banner}) center/cover` : ''}"></span><label class="btn sm" style="cursor:pointer">${ic('photo', 16)} ${pr.banner ? 'Change' : 'Upload'} banner<input type="file" accept="image/*" class="sr" data-file="banner"></label>${pr.banner ? '<button class="btn sm" data-a="removeBanner">Remove</button>' : ''}</div></div>
    <div class="field">Profile colour<div class="accs">${['#5b7cff', '#9b6bff', '#ff8a4c', '#ff4d6d', '#2fd4c4', '#3fbf6f', '#ffb547', '#e45fb4'].map(c => `<button class="acc ${pr.color === c ? 'on' : ''}" style="background:${c}" aria-label="Profile colour ${c}" data-a="profColor" data-v="${c}"></button>`).join('')}</div></div>
    <div class="field">Birthday <span style="font-weight:500">(optional — friends get a reminder, the year is never shown)</span><div class="row" style="gap:10px;flex-wrap:wrap"><select class="inp" style="width:auto" id="s-bm" data-model="form.sBm" aria-label="Birth month"><option value="">Month</option>${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((mo, i) => `<option value="${pad(i + 1)}" ${(f.sBm ?? (pr.birthday || '').slice(0, 2)) === pad(i + 1) ? 'selected' : ''}>${mo}</option>`).join('')}</select><select class="inp" style="width:auto" id="s-bd" data-model="form.sBd" aria-label="Birth day"><option value="">Day</option>${Array.from({ length: 31 }, (_, i) => `<option value="${pad(i + 1)}" ${(f.sBd ?? (pr.birthday || '').slice(3)) === pad(i + 1) ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div></div>
    ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
    <div><button class="btn pri" data-a="saveProfile" ${S.busy ? 'disabled' : ''}>Save changes</button></div>
    <div class="sec" style="margin-top:8px">Profile widgets</div>
    <label class="field">Song on repeat<input class="inp" id="w-song" data-model="form.wSong" value="${esc(f.wSong ?? pr.widgets?.song ?? '')}" maxlength="60" placeholder="Artist – Song"></label>
    <label class="field">Favourite game<input class="inp" id="w-game" data-model="form.wGame" value="${esc(f.wGame ?? pr.widgets?.game ?? '')}" maxlength="40" placeholder="Minecraft"></label>
    <div class="field">Photos <span style="font-weight:500">(up to 3)</span><div class="wphotos edit">${(pr.widgets?.photos || []).map((p, i) => `<span class="wph"><img src="${safeImg(p)}" alt=""><button class="stx" aria-label="Remove photo" data-a="widgetDel" data-i="${i}">${ic('x', 12, 2.5)}</button></span>`).join('')}${(pr.widgets?.photos || []).length < 3 ? `<label class="wph add" aria-label="Add a photo">${ic('plus', 20)}<input type="file" accept="image/*" class="sr" data-file="widgetPhoto"></label>` : ''}</div></div>
    <div><button class="btn" data-a="saveWidgets">Save widgets</button></div>`;
  if (s === 'appearance') body = `<h2 class="h1" style="font-size:24px">Appearance</h2>
    <div class="field">Mode<div class="pills"><button class="pill ${p.theme !== 'light' ? 'on' : ''}" data-a="pref" data-k="theme" data-v="dark">${ic('moon', 16)} Dark</button><button class="pill ${p.theme === 'light' ? 'on' : ''}" data-a="pref" data-k="theme" data-v="light">Bright</button></div></div>
    <div class="field">Accent color<div class="accs">${ACCENTS.map((a, i) => `<button class="acc ${!p.customAccent && p.accent === i ? 'on' : ''}" style="background:${a.a};box-shadow:0 0 16px -2px ${a.a}" aria-label="${a.n}" title="${a.n}" data-a="accent" data-v="${i}"></button>`).join('')}<label class="acc acc-custom ${p.customAccent ? 'on' : ''}" title="Custom color"><input type="color" value="${esc(p.customAccent || '#5b7cff')}" data-change="customAccent" aria-label="Custom accent color"></label></div></div>
    <div class="field">App background<div class="swatches">
      <button class="sw ${!p.appBg && p.appStyle !== 'aurora' && p.appStyle !== 'still' ? 'on' : ''}" style="background:radial-gradient(80% 80% at 10% 0%,var(--ac),transparent 60%),radial-gradient(60% 60% at 100% 100%,var(--warm),transparent 60%),#05070f" data-a="appStyle" data-v="atmosphere">Nexa atmosphere</button>
      <button class="sw bg-aurora ${!p.appBg && p.appStyle === 'aurora' ? 'on' : ''}" style="background:linear-gradient(120deg,#07122e,#0c3b4a,#1e1856,#4a1a5c,#07122e)" data-a="appStyle" data-v="aurora">Aurora (animated)</button>
      <button class="sw ${!p.appBg && p.appStyle === 'still' ? 'on' : ''}" style="background:#0a0d1c" data-a="appStyle" data-v="still">Still night</button>
      <button class="sw bg-${season()} ${!p.appBg && p.appStyle === 'seasonal' ? 'on' : ''}" style="background:${(BGS.find(b => b.id === season()) || BGS[0]).css}" data-a="appStyle" data-v="seasonal">Seasonal (${SEASON_NAMES[season()]})</button>
      <label class="sw add ${p.appBg ? 'on' : ''}" style="${p.appBg ? `background:url(${safeImg(p.appBg)}) center/cover;color:#fff` : ''}">${p.appBg ? 'Custom image' : ic('plus', 18) + '&nbsp;Custom image'}<input type="file" accept="image/*" class="sr" data-file="appBg"></label></div></div>
    <div class="field">Text size<div class="pills">${[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']].map(([k, l]) => `<button class="pill ${p.textSize === k ? 'on' : ''}" data-a="pref" data-k="textSize" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div><div class="setrow"><span><b>Celebration effects</b><div class="mute small">A little confetti for new friends and plans.</div></span>${tog(p.effects, 'prefTog', 'effects', 'Celebration effects')}</div>
    <div class="setrow"><span><b>Reduce motion</b><div class="mute small">Keep transitions to quick fades.</div></span>${tog(p.motion, 'prefTog', 'motion', 'Reduce motion')}</div></div>
    <div class="sec">Accessibility</div>
    <div><div class="setrow"><span><b>High contrast</b><div class="mute small">Solid panels, brighter text and stronger outlines.</div></span>${tog(p.contrast, 'prefTog', 'contrast', 'High contrast')}</div>
    <div class="setrow"><span><b>Bigger buttons</b><div class="mute small">Larger tap targets and text across the app.</div></span>${tog(p.bigTargets, 'prefTog', 'bigTargets', 'Bigger buttons')}</div>
    <div class="setrow"><span><b>Screen readers</b><div class="mute small">Nexa labels every button and reads new messages aloud with VoiceOver, TalkBack and NVDA.</div></span></div></div>`;
  if (s === 'chats') body = `<h2 class="h1" style="font-size:24px">Chats</h2>
    <div class="field">Default chat background<div class="swatches">${BGS.map(b => `<button class="sw ${b.cls || ''} ${p.defaultBg === b.id ? 'on' : ''}" style="background:${b.css}" data-a="pref" data-k="defaultBg" data-v="${b.id}">${b.name}</button>`).join('')}</div><span style="font-weight:500">Change a single conversation from its palette button.</span></div>
    <div class="field">Message text size<div class="pills">${[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']].map(([k, l]) => `<button class="pill ${p.textSize === k ? 'on' : ''}" data-a="pref" data-k="textSize" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div><div class="setrow"><span><b>Read receipts</b><div class="mute small">Let people see when you've read their messages.</div></span>${tog(pr.receipts !== false, 'profTog', 'receipts', 'Read receipts')}</div>
    <div class="setrow"><span><b>Streaks</b><div class="mute small">Show a flame when you and a friend chat every day.</div></span>${tog(!p.hideStreaks, 'prefFlag', 'hideStreaks', 'Streaks')}</div>
    <div class="setrow"><span><b>Typing indicator</b><div class="mute small">Show others when you're typing.</div></span>${tog(pr.typingOn !== false, 'profTog', 'typingOn', 'Typing indicator')}</div></div>`;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (s === 'notifications') body = `<h2 class="h1" style="font-size:24px">Notifications</h2>
    <div class="panel" style="padding:18px;border-radius:18px;border:1px solid var(--line);background:color-mix(in oklab,var(--ac) 8%,transparent)">
      <div class="row spread" style="align-items:flex-start"><span><b>Notifications on this device</b><div class="mute small" style="line-height:1.5">${perm === 'unsupported' ? (ios && !standalone ? 'On iPhone, add Nexa to your Home Screen first (below), then turn this on.' : 'This browser doesn\'t support notifications.') : perm === 'denied' ? 'Blocked in your browser settings. Allow notifications for this site, then come back.' : (S.be.push ? (p.deviceNotifs && perm === 'granted' ? (S.pushOn || lsGet('nexa.pushToken', null) ? 'On — you\'ll get messages, calls, requests and invites on this device even when Nexa is closed.' : 'On while Nexa is open. Setting up alerts for when it\'s closed…') : 'Get messages, calls, requests and invites on this device — even when Nexa is closed.') : 'Get alerts for messages, requests and invites while Nexa is open in the background.')}</div></span>${perm === 'unsupported' || perm === 'denied' ? '' : tog(p.deviceNotifs && perm === 'granted', 'deviceNotifs', '', 'Notifications on this device')}</div>
      ${standalone ? '' : `<div class="row" style="gap:10px;flex-wrap:wrap"><span class="mute small grow">${ios ? 'Install: tap Share, then “Add to Home Screen”.' : 'Install Nexa as an app for its own window and dock icon.'}</span>${S.installEvt ? `<button class="btn sm pri" data-a="install">${ic('download', 16)} Install Nexa</button>` : ''}</div>`}
    </div>
    ${S.be.push && p.deviceNotifs && perm === 'granted' ? `<div class="setrow"><span><b>Show message text in alerts</b><div class="mute small">Turn off to only show who messaged you, for privacy on your lock screen.</div></span>${tog(p.pushPreview !== false, 'prefFlagInv', 'pushPreview', 'Show message text')}</div>` : ''}
    <div><div class="setrow"><span><b>Sounds</b><div class="mute small">Soft chimes for sent and received messages.</div></span>${tog(p.sounds, 'prefTog', 'sounds', 'Sounds')}</div>
    ${'vibrate' in navigator ? `<div class="setrow"><span><b>Vibration</b><div class="mute small">A light buzz when you send or get a message (Android phones).</div></span>${tog(p.haptics !== false, 'prefFlagInv', 'haptics', 'Vibration')}</div>` : ''}
    ${[['msg', 'New messages', 'Pop-up when a message arrives in another chat.'], ['friend', 'Friend requests', 'Requests and accepted requests.'], ['event', 'Events', 'Invitations, updates and people joining.'], ['remind', 'Event reminders', 'One hour before events you\'re going to.']].map(([k, t, d]) => `<div class="setrow"><span><b>${t}</b><div class="mute small">${d}</div></span>${tog(p.notif[k], 'notifTog', k, t)}</div>`).join('')}</div>
    <div class="mute small">Muted chats never notify. Mute a chat from its ••• menu.</div>`;
  if (s === 'privacy') body = `<h2 class="h1" style="font-size:24px">Privacy</h2>
    <div class="field">Who can message me<div class="pills">${[['everyone', 'Everyone'], ['friends', 'Friends only']].map(([k, l]) => `<button class="pill ${(pr.allowMessages || 'everyone') === k ? 'on' : ''}" data-a="profSet" data-k="allowMessages" data-v="${k}">${l}</button>`).join('')}</div><span style="font-weight:500">Messages from people who aren't your friends go to Requests.</span></div>
    <div class="setrow"><span><b>Blur unknown or sensitive photos</b><div class="mute small">Photos from people you don't know, or that Nexa AI flags, stay blurred until you tap.</div></span>${tog(p.safePhotos !== false, 'prefFlagInv', 'safePhotos', 'Blur photos')}</div>
    <div class="field">Who can send me friend requests<div class="pills">${[['everyone', 'Everyone'], ['nobody', 'No one']].map(([k, l]) => `<button class="pill ${(pr.allowRequests || 'everyone') === k ? 'on' : ''}" data-a="profSet" data-k="allowRequests" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div><div class="setrow"><span><b>Show my online status</b><div class="mute small">When off, friends see you as offline.</div></span>${tog(pr.showOnline !== false, 'profTog', 'showOnline', 'Show online status')}</div>
    <div class="setrow"><span><b>Appear in search</b><div class="mute small">Let people find you by name or @handle.</div></span>${tog(pr.discoverable !== false, 'profTog', 'discoverable', 'Appear in search')}</div></div>
    <div class="setrow"><span><b>App lock on this device</b><div class="mute small">${hasPin() ? 'On — Nexa asks for your PIN after 5 minutes away.' : 'Ask for a 4-digit PIN when you come back to Nexa.'}</div></span><span class="row" style="gap:6px">${hasPin() ? '<button class="btn sm" data-a="pinRemove">Turn off</button>' : ''}<button class="btn sm ${hasPin() ? '' : 'pri'}" data-a="pinOpen">${hasPin() ? 'Change PIN' : 'Set PIN'}</button></span></div>
    <div class="field">Blocked people<div class="col" style="gap:6px">${(p.blocked || []).length ? p.blocked.map(u => { watchUser(u); return `<div class="person">${av(u, 40)}<span class="grow"><b class="ellip" style="display:block">${esc(U(u)?.name || 'Nexa user')}</b><span class="mute small">@${esc(U(u)?.handle || '')}</span></span><button class="btn sm" data-a="unblock" data-v="${u}">Unblock</button></div>`; }).join('') : '<span style="font-weight:500">No one. Blocked people can\'t message you, send requests or see your moments.</span>'}</div></div>
    <div class="mute small" style="line-height:1.6">Nicknames you give friends are stored privately in your account and are never shown to them. Reports go to the Nexa team for review.</div>`;
  if (s === 'account') body = `<h2 class="h1" style="font-size:24px">Account</h2>
    <div class="setrow"><span><b>Email</b><div class="mute small">${esc(S.email || '')}</div></span></div>
    <div class="setrow"><span><b>Email verification</b><div class="mute small">${S.be.auth.verified() || S.verified ? 'Verified — your email is confirmed.' : 'Confirm your email so you can always recover your account.'}</div></span>${S.be.auth.verified() || S.verified ? `<span class="nick" style="background:color-mix(in oklab,var(--ok) 20%,transparent);color:var(--ok)">${ic('check', 12, 2.5)} Verified</span>` : '<span class="row" style="gap:6px"><button class="btn sm" data-a="checkVerify">I\'ve verified</button><button class="btn sm pri" data-a="sendVerify">Send email</button></span>'}</div>
    <div class="field">Devices that logged in<div class="col" style="gap:6px">${Object.entries(S.prefs.devices || {}).sort((a, b) => b[1].seen - a[1].seen).map(([id, d]) => `<div class="item" style="min-height:48px">${ic('lock', 18)}<span class="grow"><b class="small" style="display:block">${esc(d.name || 'Device')}${id === deviceId ? ' · this device' : ''}</b><span class="mute small">Last active ${fmtWhen(d.seen)}</span></span></div>`).join('') || '<span style="font-weight:500">Just this one.</span>'}</div><span style="font-weight:500">You get a notification whenever a new device logs in. <button class="grad-text" style="font-weight:700" data-a="logoutAll">Forget other devices</button></span></div>
    <div class="setrow"><span><b>Account ID</b><div class="mute small" style="word-break:break-all">${esc(S.me)}</div></span><button class="btn sm" data-a="copyId">Copy</button></div>
    <div class="setrow"><span><b>Storage</b><div class="mute small">${S.be.kind === 'local' ? 'Local mode — data lives in this browser only. Add Firebase keys in config.js to go live.' : 'Synced to the cloud.'}</div></span></div>
    <div class="setrow"><span><b>Log in on another device</b><div class="mute small">Show a code and QR code — scan or type it on the new device to log in without your password.</div></span><button class="btn sm pri" data-a="qlShow">${ic('qr', 14)} Show code</button></div>
    <div class="setrow"><span><b>Download your data</b><div class="mute small">Your profile, friends, chats and events in one file.</div></span><button class="btn sm" data-a="exportOpen">${ic('download', 14)} Download</button></div>
    <div class="row" style="gap:10px"><button class="btn" data-a="logout">${ic('logout', 18)} Log out</button></div>
    <div style="padding:18px;border-radius:18px;border:1px solid rgba(255,77,109,.35);background:rgba(255,77,109,.06)"><b>Delete account</b><div class="mute small" style="margin:4px 0 12px">Removes your profile and signs you out. Messages you sent stay visible to people you sent them to.</div><button class="btn sm danger" data-a="deleteAccount">Delete my account</button></div>`;
  if (s === 'shortcuts') body = `<h2 class="h1" style="font-size:24px">Keyboard shortcuts</h2><div class="setrow"><span><b>Take the tour again</b><div class="mute small">A quick walk-through of Nexa.</div></span><button class="btn sm pri" data-a="tourStart">Start tour</button></div><div>${[['Ctrl / ⌘ + K', 'Search & jump anywhere'], ['Ctrl / ⌘ + J', 'Open Nexa AI'], ['Alt + 1–6', 'Home, Messages, People, Events, Notifications, Settings'], ['/', 'Focus search on the current page'], ['Enter', 'Send message'], ['Shift + Enter', 'New line'], ['↑ (empty message)', 'Edit your last message'], ['Ctrl / ⌘ + F (in chat)', 'Search this conversation'], ['Esc', 'Close / cancel reply or edit']].map(([k, d]) => `<div class="setrow"><span>${d}</span><span class="kbd">${k}</span></div>`).join('')}</div>`;
  return `<div class="settings">
    <aside class="setnav glass card">${`<div class="disp hide-m" style="font-size:20px;font-weight:600;padding:6px 10px 12px">Settings</div>`}${secs.map(([k, i, l]) => `<button class="${s === k ? 'on' : ''}" data-a="setSec" data-v="${k}">${ic(i, 18)}${l}</button>`).join('')}</aside>
    <section class="setbody glass card scroll" data-keep-scroll="set"><div class="${A('set' + s)}">${body}</div></section>
  </div>`;
}

/* ---------------- overlays ---------------- */
function vOverlays() {
  let o = '';
  if (S.modal && S.modal.type === 'reset' && S.view === 'auth') o += `<div class="overlay${A('ovreset')}" data-a="closeModal" data-self="1"><div class="modal glass" role="dialog" aria-modal="true">${vModal()}</div></div>`;
  if (S.view === 'app' && S.profile) {
    if (S.ai.open) o += vAi();
    if (S.story) o += vStory();
    if (S.modal) o += `<div class="overlay${A('ov' + S.modal.type)}" data-a="closeModal" data-self="1"><div class="modal glass" role="dialog" aria-modal="true">${vModal()}</div></div>`;
    if (S.palette) o += vPalette();
    if (S.menu) o += vMenu();
  }
  if (S.lightbox) o += `<div class="lightbox" data-a="lightboxClose"><img src="${safeImg(S.lightbox)}" alt="Photo"></div>`;
  return o;
}
function vMenu() {
  const m = S.menu;
  let items = [];
  if (m.type === 'conv') {
    const c = convOf(S.conv); if (!c) return '';
    const isG = c.type === 'group', isE = c.type === 'event', owner = isG && (c.roles || {})[S.me] === 'owner', o = others(c)[0];
    items = [
      isE ? ['eventOpen', 'cal', 'Event details', c.eventId] : isG ? ['groupInfo', 'group', 'Group info & members'] : ['profile', 'user', 'View profile', o],
      !isG && !isE && isFriend(o) ? ['nickname', 'tag', nickOf(o) || (S.pics || {})[o] ? 'Edit nickname & photo' : 'Nickname & photo', o] : null,
      c.type === 'dm' ? ['toneOpen', 'volume', 'Notification sound', o] : null,
      ['folderAdd', 'folder', 'Add to folder'],
      ['summarize', 'spark', 'Summarize with Nexa AI'],
      ['bgPop', 'palette', 'Background & text size'],
      ['muteConv', isMuted(c.id) ? 'bell' : 'bellOff', isMuted(c.id) ? 'Unmute' : 'Mute notifications'],
      ['pinConv', 'pin', isPinnedConv(c.id) ? 'Unpin chat' : 'Pin chat to top'],
      ['archiveConv', 'archive', isArchived(c.id) ? 'Unarchive' : 'Archive'],
      c.pinned ? ['unpin', 'pin', 'Unpin message'] : null,
      ['mediaOpen', 'images', 'Photos, links & voice'],
      ['ttlOpen', 'timer', c.ttl ? 'Disappearing: ' + (TTL_OPTS.find(o => o[0] === c.ttl)?.[1] || 'on') : 'Disappearing messages'],
      ['hideConv', 'trash', 'Delete conversation', '', 'danger'],
      isG ? ['leaveGroup', 'logout', owner ? 'Leave group (transfer ownership)' : 'Leave group', '', 'danger'] : null,
      !isG && !isE ? ['report', 'flag', 'Report', o, 'danger'] : null,
      !isG && !isE ? ['blockUser', 'block', 'Block', o, 'danger'] : null
    ].filter(Boolean);
  }
  if (m.type === 'person') items = [isFriend(m.uid) || (canDM(m.uid) && !blocked(m.uid)) ? ['dm', 'msg', 'Message', m.uid] : null, isFriend(m.uid) ? ['toneOpen', 'volume', 'Notification sound', m.uid] : null, isFriend(m.uid) ? ['nickname', 'tag', nickOf(m.uid) || (S.pics || {})[m.uid] ? 'Edit nickname & photo' : 'Nickname & photo', m.uid] : null, ['profile', 'user', 'View profile', m.uid], isFriend(m.uid) ? ['removeFriend', 'trash', 'Remove friend', m.uid, 'danger'] : null, ['report', 'flag', 'Report', m.uid, 'danger'], ['blockUser', 'block', 'Block', m.uid, 'danger']].filter(Boolean);
  if (m.type === 'react') items = REACTIONS.map(r => ['react', '', r, m.mid, '', r]);
  const style = m.type === 'react' ? 'display:flex;flex-direction:row;gap:4px;min-width:0' : '';
  return `<div class="overlay" style="background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none" data-a="closeMenu" data-self="1">
    <div class="menu glass${A('menu')}" style="position:fixed;left:${Math.min(m.x, innerWidth - 230)}px;top:${Math.max(8, Math.min(m.y, innerHeight - 20 - items.length * 42))}px;${style}">
      ${items.map(([a, i, l, v, cls, r]) => `<button class="${cls || ''}" data-a="${a}" data-v="${v || ''}" ${r ? `data-r="${r}" style="font-size:20px;width:44px;justify-content:center;padding:0"` : ''}>${i ? ic(i, 18) : ''}${l}</button>`).join('')}
    </div></div>`;
}
function vAi() {
  const chips = ['How do I add a friend?', 'How do I change my chat background?', 'How do I create an event?', 'How do I change my profile picture?', 'What are nicknames?', 'Keyboard shortcuts'];
  return `<aside class="ai glass${A('ai')}" aria-label="Nexa AI">
    <div class="row" style="padding:16px;border-bottom:1px solid var(--line2)"><span class="notif-ic" style="width:42px;height:42px;background:linear-gradient(135deg,var(--ac),var(--ac2) 60%,var(--warm))">${ic('spark')}</span><span class="grow"><b style="display:block">Nexa AI</b><span class="mute small">Your guide to Nexa</span></span><button class="ibtn" aria-label="Close Nexa AI" data-a="aiClose">${ic('x', 18)}</button></div>
    <div class="stream" id="aiStream" style="flex:1">${S.ai.msgs.map((m, i) => `<div class="m ${m.me ? 'me' : 'them'}${A('ai' + i)}"><div class="bub" style="white-space:pre-line">${m.me ? esc(m.text) : m.html || esc(m.text)}</div></div>`).join('')}
      ${S.ai.typing ? `<div class="typing${A('aity')}"><i></i><i></i><i></i></div>` : ''}</div>
    <div class="pills" style="padding:0 14px 10px">${chips.map(c => `<button class="chip" data-a="aiAsk" data-v="${esc(c)}">${c}</button>`).join('')}</div>
    <form class="composer glass" style="margin:0 12px 12px;border-radius:18px" data-submit="ai"><input id="aiQ" data-model="form.aiQ" value="${esc(S.form.aiQ || '')}" placeholder="Ask how something works…" aria-label="Ask Nexa AI" style="flex:1;height:44px;border:0;background:transparent;outline:none;color:var(--text);padding:0 10px;font-size:14px"><button class="send" aria-label="Ask">${ic('send', 18, 2)}</button></form>
  </aside>`;
}
function palItems() {
  const q = S.palQ.trim().toLowerCase();
  const items = [];
  const add = (k, label, hint, a, v, extra) => items.push({ k, label, hint, a, v, extra });
  PAGES.forEach((p, i) => add(ic(['home', 'msg', 'people', 'cal', 'bell', 'gear'][i], 16), p[0].toUpperCase() + p.slice(1), 'Page', 'go', p));
  add(ic('user', 16), 'My profile', 'Page', 'profile', S.me);
  if (S.isAdmin) add(ic('shield', 16), 'Moderation', 'Page', 'go', 'admin');
  add(ic('pen', 16), 'New message', 'Action', 'newChat');
  add(ic('group', 16), 'New group chat', 'Action', 'newGroup');
  add(ic('plus', 16), 'Create event', 'Action', 'newEvent');
  add(ic('spark', 16), 'Ask Nexa AI', 'Action', 'aiOpen');
  add(ic('moon', 16), S.prefs.theme === 'light' ? 'Switch to dark mode' : 'Switch to bright mode', 'Action', 'pref', S.prefs.theme === 'light' ? 'dark' : 'light', { k: 'theme' });
  [['profile', 'Edit profile & photo'], ['appearance', 'Theme, accent & background'], ['chats', 'Chat background & text size'], ['notifications', 'Notification settings'], ['privacy', 'Privacy settings'], ['account', 'Account & log out'], ['shortcuts', 'Keyboard shortcuts']].forEach(([k, l]) => add(ic('gear', 16), l, 'Settings', 'setSecGo', k));
  friendIds().forEach(u => add(av(u, 30), dname(u), '@' + (U(u)?.handle || '') + ' · Friend', 'profile', u));
  sortedConvs().forEach(c => add(convAv(c, 30, false), convName(c), c.type === 'group' ? 'Group chat' : 'Chat', 'openConv', c.id));
  allEvents().forEach(e => add(ic('cal', 16), e.title, 'Event · ' + e.date, 'eventOpen', e.id));
  const res = q ? items.filter(i => (i.label + ' ' + i.hint).toLowerCase().includes(q)) : items.slice(0, 11);
  return res.slice(0, 12);
}
function vPalette() {
  const items = palItems();
  S.palSel = Math.min(S.palSel, Math.max(0, items.length - 1));
  return `<div class="overlay${A('pal')}" data-a="closePalette" data-self="1"><div class="palette glass" role="dialog" aria-label="Search">
    <label class="search">${ic('search', 18)}<input id="palQ" data-model="palQ" value="${esc(S.palQ)}" placeholder="Jump to people, chats, events, settings…" aria-label="Search" autocomplete="off" data-autofocus><span class="kbd">Esc</span></label>
    <div class="scroll" style="padding:6px 0">${items.length ? items.map((it, i) => `<button class="pitem ${i === S.palSel ? 'sel' : ''}" data-a="${it.a}" data-v="${esc(it.v || '')}" ${it.extra ? `data-k="${it.extra.k}"` : ''} data-pal="1"><span class="k">${it.k}</span><span class="grow ellip">${esc(it.label)}</span><span class="mute small">${esc(it.hint)}</span></button>`).join('') : `<div class="empty"><b>No results</b><span>Try a friend's name, a chat or a setting.</span></div>`}</div>
  </div></div>`;
}
function vModal() {
  const m = S.modal, f = S.form;
  const head = (t, sub) => `<div class="row spread"><div><h2 class="disp" style="margin:0;font-size:22px">${t}</h2>${sub ? `<div class="mute small">${sub}</div>` : ''}</div><button class="ibtn" aria-label="Close" data-a="closeModal">${ic('x', 18)}</button></div>`;
  const r3 = vModal3(m, f, head); if (r3 != null) return r3;
  const r4 = vModal4(m, f, head); if (r4 != null) return r4;
  const r5 = vModal5(m, f, head); if (r5 != null) return r5;
  const r5b = vModal5b(m, f, head); if (r5b != null) return r5b;
  const pickFriends = (sel, multi) => {
    const fr = friendIds().filter(u => !f.pickQ || dname(u).toLowerCase().includes(f.pickQ.toLowerCase()) || (U(u)?.handle || '').includes(f.pickQ.toLowerCase()));
    return `<label class="search" style="flex:none;max-width:none">${ic('search', 16)}<input id="pickQ" data-model="form.pickQ" value="${esc(f.pickQ || '')}" placeholder="Search friends" aria-label="Search friends"></label>
      <div class="col scroll" style="gap:4px;max-height:280px" data-keep-scroll="pick">${fr.length ? fr.map(u => `<button class="item ${sel.includes(u) ? 'on' : ''}" data-a="pick" data-v="${u}" data-multi="${multi ? 1 : ''}">${av(u, 40, true)}<span class="grow"><b class="ellip" style="display:block">${esc(dname(u))}</b><span class="mute small">@${esc(U(u)?.handle || '')}</span></span>${multi ? `<span class="tog ${sel.includes(u) ? 'on' : ''}" style="width:24px;height:24px;border-radius:8px" aria-hidden="true"></span>` : ''}</button>`).join('')
        : `<div class="empty"><div class="ring">${ic('people', 24)}</div><b>${friendIds().length ? 'No matches' : 'No friends yet'}</b><span>${friendIds().length ? '' : 'Add friends on the People page first.'}</span>${friendIds().length ? '' : '<button class="btn sm pri" data-a="go" data-v="people">Find people</button>'}</div>`}</div>`;
  };
  if (m.type === 'newChat') return head('New message', 'Choose a friend') + pickFriends([], false) + `<button class="btn" data-a="newGroup">${ic('group', 18)} Create a group instead</button>`;
  if (m.type === 'newGroup') { const sel = f.pick || []; return head(m.addTo ? 'Add members' : 'New group', m.addTo ? '' : 'Name it and pick at least two friends') + (m.addTo ? '' : `<label class="field">Group name<input class="inp" id="g-name" data-model="form.gName" value="${esc(f.gName || '')}" placeholder="Weekend crew" maxlength="40"></label>`) + pickFriends(sel, true) + `${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}<div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="${m.addTo ? 'addMembers' : 'createGroup'}">${m.addTo ? 'Add' : 'Create group'}${sel.length ? ` (${sel.length})` : ''}</button></div>`; }
  if (m.type === 'nickname') { const u = U(m.uid); return head('Private nickname & photo', `Only you will see these. ${esc(u?.name || '')} keeps their own name and photo for everyone else.`) + `<div class="row" style="gap:14px;flex-wrap:wrap">${av(m.uid, 64)}<div class="grow"><b>${esc(u?.name || '')}</b><div class="mute small">@${esc(u?.handle || '')}</div></div><label class="btn sm" style="cursor:pointer">${ic('photo', 14)} ${(S.pics || {})[m.uid] ? 'Change photo' : 'Set a photo'}<input type="file" accept="image/*" class="sr" data-file="customPic"></label>${(S.pics || {})[m.uid] ? '<button class="btn sm" data-a="picClear">Use their photo</button>' : ''}</div><label class="field">Nickname<input class="inp" id="nick" data-model="form.nick" value="${esc(f.nick ?? nickOf(m.uid))}" placeholder="e.g. Bestie" maxlength="30" data-autofocus></label><div class="row" style="justify-content:flex-end;gap:10px">${nickOf(m.uid) ? '<button class="btn" data-a="saveNick" data-v="clear">Remove nickname</button>' : ''}<button class="btn pri" data-a="saveNick">Save</button></div>`; }
  if (m.type === 'confirm') return head(m.title) + `<div class="mute" style="line-height:1.55">${esc(m.body)}</div><div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn ${m.danger ? 'danger' : 'pri'}" data-a="confirmYes">${esc(m.yes || 'Confirm')}</button></div>`;
  if (m.type === 'link') return head('Share a link') + `<label class="field">URL<input class="inp" id="linkUrl" data-model="form.link" value="${esc(f.link || 'https://')}" data-autofocus></label><div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="sendLink">Send link</button></div>`;
  if (m.type === 'group') {
    const c = convOf(m.id); if (!c) return head('Group');
    const owner = roleOf(c, S.me) === 'owner', mgr = canManage(c);
    return head(mgr ? 'Group settings' : 'Group info', `${c.members.length} members`) + `<div class="row">${convAv(c, 56)}${mgr ? `<label class="field grow">Group name<input class="inp" id="g-rename" data-model="form.gRename" value="${esc(f.gRename ?? c.name)}" maxlength="40"></label><button class="btn" style="align-self:flex-end" data-a="renameGroup">Save</button>` : `<b class="disp" style="font-size:18px">${esc(c.name)}</b>`}</div>
      <div class="sec">Members</div><div class="col" style="gap:4px">${c.members.map(u => `<div class="item">${av(u, 40, true)}<span class="grow"><b style="display:block">${esc(dname(u))}${u === S.me ? ' (you)' : ''}</b><span class="mute small">${{ owner: 'Owner', admin: 'Admin', member: 'Member' }[roleOf(c, u)]}</span></span>${owner && u !== S.me ? `<button class="btn sm" data-a="setRole" data-v="${u}" data-r="${roleOf(c, u) === 'admin' ? 'member' : 'admin'}">${roleOf(c, u) === 'admin' ? 'Remove admin' : 'Make admin'}</button>` : ''}${mgr && u !== S.me && roleOf(c, u) !== 'owner' && (owner || roleOf(c, u) === 'member') ? `<button class="btn sm" data-a="kick" data-v="${u}">Remove</button>` : ''}</div>`).join('')}</div>
      ${mgr ? `<div class="setrow"><span><b>Invite link</b><div class="mute small">Anyone with the link can join this group.</div></span><span class="row" style="gap:6px">${c.inviteCode ? '<button class="btn sm" data-a="groupLinkReset">Turn off</button>' : ''}<button class="btn sm pri" data-a="groupLink">${ic('link', 14)} ${c.inviteCode ? 'Copy link' : 'Create link'}</button></span></div>` : ''}
      <div class="row" style="gap:10px;flex-wrap:wrap">${mgr ? `<button class="btn" data-a="addMembersOpen">${ic('userplus', 18)} Add members</button>` : ''}<button class="btn" data-a="boardOpen">${ic('brush', 18)} Drawing board</button><button class="btn danger" data-a="leaveGroup">Leave group</button></div>`;
  }
  if (m.type === 'event') {
    const e = allEvents().find(x => x.id === m.id); if (!e) return head('Event') + '<div class="empty">This event was removed.</div>';
    const mine = e.creator === S.me, att = e.attendees || [];
    return `<div class="cover" style="height:180px;margin:-26px -26px 0;background:${safeImg(e.image) ? `url(${e.image}) center/cover` : gradFor(e.id)};position:relative"><button class="ibtn" style="position:absolute;right:14px;top:14px;background:rgba(0,0,0,.35)" aria-label="Close" data-a="closeModal">${ic('x', 18)}</button></div>
      <div><h2 class="disp" style="margin:0;font-size:24px">${esc(e.title)}</h2><div class="mute">${new Date(e.date + 'T00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}${e.time ? ' · ' + esc(e.time) : ''} · ${{ friends: 'Friends', invite: 'Invite only', public: 'Public' }[e.audience]}</div></div>
      ${e.desc ? `<div style="line-height:1.6;white-space:pre-line">${linkify(e.desc)}</div>` : ''}
      ${e.place ? `<a class="placecard" href="${esc(mapsLink(e.place))}" target="_blank" rel="noopener noreferrer"><span class="notif-ic" style="width:40px;height:40px;background:linear-gradient(135deg,#3fbf6f,#2fd4c4)">${ic('map', 18)}</span><span class="grow"><b style="display:block">${esc(e.place)}</b><span class="mute small">Open in Maps</span></span>${ic('forward', 16)}</a>` : ''}
      ${going(e) && evStart(e) - now() < 6 * 3600e3 && evStart(e) - now() > -3 * 3600e3 ? `<div class="row" style="gap:10px;flex-wrap:wrap">${(e.onway || []).includes(S.me) ? `<span class="nick" style="background:color-mix(in oklab,var(--ok) 20%,transparent);color:var(--ok)">${ic('check', 12, 2.5)} You're on the way</span>` : `<button class="btn sm pri" data-a="onMyWay" data-v="${e.id}">${ic('map', 14)} I'm on my way</button>`}${(e.onway || []).filter(u => u !== S.me).length ? `<span class="row small" style="gap:6px"><span class="stack">${e.onway.filter(u => u !== S.me).slice(0, 4).map(u => av(u, 22)).join('')}</span>${e.onway.filter(u => u !== S.me).length} on the way</span>` : ''}</div>` : ''}
      <div class="row">${av(e.creator, 32)}<span class="small">Hosted by <b>${esc(dname(e.creator))}</b></span></div>
      ${[['Going', att], ['Maybe', e.maybe || []]].filter(([, l]) => l.length || true).map(([t, l]) => l.length || t === 'Going' ? `<div class="sec">${t} · ${l.length}</div><div class="row" style="flex-wrap:wrap;gap:10px">${l.length ? l.map(u => `<button class="row" style="gap:8px;padding:4px 10px 4px 4px;border-radius:20px;border:1px solid var(--line2)" data-a="profile" data-v="${u}">${av(u, 28)}<span class="small">${esc(dname(u))}</span></button>`).join('') : '<span class="mute small">No one yet.</span>'}</div>` : '').join('')}
      ${mine ? '' : `<div class="field">Your RSVP${rsvpPills(e)}</div>`}
      ${(watchAlbum(e.id), '')}<div class="sec row spread">Shared album · ${(S.album || []).length}${going(e) || mine ? `<label class="btn sm" style="cursor:pointer">${ic('photo', 14)} Add photos<input type="file" accept="image/*" multiple class="sr" data-file="albumPhotos"></label>` : ''}</div>
      ${(S.album || []).length ? `<div class="albumgrid">${S.album.map(p => `<div class="aph"><img src="${safeImg(p.img)}" alt="Photo by ${esc(dname(p.by))}" loading="lazy" data-a="albumView" data-v="${p.id}">${p.by === S.me || mine ? `<button class="ibtn sm" aria-label="Delete photo" data-a="delPhoto" data-v="${p.id}">${ic('trash', 13)}</button>` : ''}</div>`).join('')}</div>` : `<div class="mute small">${going(e) || mine ? 'Everyone going can add photos here — before, during and after.' : 'RSVP “Going” to see and add photos.'}</div>`}
      <div class="row" style="justify-content:flex-end;gap:10px;flex-wrap:wrap">${mine ? `<button class="btn danger" data-a="delEvent" data-v="${e.id}">${ic('trash', 16)} Delete</button>` : ''}${mine || e.public ? `<button class="btn" data-a="shareEvent" data-v="${e.id}">${ic('share', 16)} Invite link</button>` : ''}${e.convId && going(e) ? `<button class="btn pri" data-a="eventChat" data-v="${e.id}">${ic('msg', 16)} Event chat</button>` : ''}</div>`;
  }
  if (m.type === 'newEvent') {
    const aud = f.evAud || 'friends', sel = f.pick || [];
    return head('Create event', 'Plan something with your people') + `
      <label class="sw add" style="height:140px;border-radius:18px;${safeImg(f.evImg) ? `background:url(${f.evImg}) center/cover;color:#fff` : ''}">${f.evImg ? '' : ic('photo', 22) + '&nbsp; Add a cover image (optional)'}<input type="file" accept="image/*" class="sr" data-file="evImg"></label>
      <label class="field">Event name<input class="inp" id="ev-title" data-model="form.evTitle" value="${esc(f.evTitle || '')}" placeholder="Rooftop movie night" maxlength="60"></label>
      <label class="field"><span class="row spread">Description<button type="button" class="btn sm" style="height:30px" data-a="aiDescribe">${ic('wand', 14)} ${S.aiBusy ? 'Writing…' : 'Help me write it'}</button></span><textarea class="inp" id="ev-desc" data-model="form.evDesc" rows="3" placeholder="What's the plan? Where are you meeting?">${esc(f.evDesc || '')}</textarea></label>
      <label class="field">Where <span style="font-weight:500">(optional — friends can open it in Maps)</span><input class="inp" id="ev-place" data-model="form.evPlace" value="${esc(f.evPlace || '')}" placeholder="Central Park, Bethesda Fountain" maxlength="120"></label>
      <div class="row" style="gap:12px"><label class="field grow">Date<input class="inp" id="ev-date" type="date" min="${todayStr()}" data-model="form.evDate" value="${esc(f.evDate || '')}"></label><label class="field grow">Time<input class="inp" id="ev-time" type="time" data-model="form.evTime" value="${esc(f.evTime || '')}"></label></div>
      <div class="field">Who can see and join<div class="pills">${[['friends', 'All friends'], ['invite', 'Invite only'], ['public', 'Public']].map(([k, l]) => `<button class="pill ${aud === k ? 'on' : ''}" data-a="evAud" data-v="${k}">${l}</button>`).join('')}</div>
        <span style="font-weight:500">${{ friends: 'Every current friend is invited and notified.', invite: 'Only the friends you pick below can see it.', public: 'Anyone on Nexa can find and join it.' }[aud]}</span></div>
      ${aud === 'invite' ? pickFriends(sel, true) : ''}
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="createEvent" ${S.busy ? 'disabled' : ''}>Create event</button></div>`;
  }
  if (m.type === 'report') {
    const reasons = ['Spam', 'Harassment or bullying', 'Inappropriate content', 'Pretending to be someone', 'Something else'];
    return head('Report ' + esc(U(m.uid)?.name || 'user'), m.mid ? 'Reporting a message' : 'Reports are private — they won\'t know it was you.') + `
      <div class="col" style="gap:6px">${reasons.map(r => `<button class="item ${f.repReason === r ? 'on' : ''}" data-a="repReason" data-v="${r}">${ic(f.repReason === r ? 'check' : 'flag', 18)}<span>${r}</span></button>`).join('')}</div>
      <label class="field">Details <span style="font-weight:500">(optional)</span><textarea class="inp" id="rep-details" data-model="form.repDetails" rows="2" maxlength="500">${esc(f.repDetails || '')}</textarea></label>
      <div class="setrow"><span><b>Also block them</b><div class="mute small">They won't be able to message you or send requests.</div></span><button class="tog ${f.repBlock ? 'on' : ''}" role="switch" aria-checked="${!!f.repBlock}" aria-label="Also block" data-a="repBlock"></button></div>
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn danger" data-a="sendReport">Send report</button></div>`;
  }
  if (m.type === 'poll') {
    const opts = f.pollOpts || ['', ''];
    return head('Create a poll') + `<label class="field">Question<input class="inp" id="poll-q" data-model="form.pollQ" value="${esc(f.pollQ || '')}" placeholder="Which day works?" maxlength="120" data-autofocus></label>
      <div class="field">Options${opts.map((o, i) => `<div class="row" style="gap:8px"><input class="inp" id="poll-o${i}" data-model="form.pollOpts.${i}" value="${esc(o)}" placeholder="Option ${i + 1}" maxlength="60">${opts.length > 2 ? `<button class="ibtn" aria-label="Remove option" data-a="pollDel" data-v="${i}">${ic('x', 16)}</button>` : ''}</div>`).join('')}${opts.length < 6 ? `<button class="btn sm" style="align-self:flex-start" data-a="pollAdd">${ic('plus', 16)} Add option</button>` : ''}</div>
      <div class="setrow"><span><b>Allow multiple answers</b></span><button class="tog ${f.pollMulti ? 'on' : ''}" role="switch" aria-checked="${!!f.pollMulti}" aria-label="Allow multiple answers" data-a="pollMulti"></button></div>
      <div class="field">Voting closes<div class="pills">${[['', 'Never'], ['1', 'In 1 hour'], ['24', 'In 1 day'], ['72', 'In 3 days'], ['168', 'In a week']].map(([k, l]) => `<button class="pill ${(f.pollEnd || '') === k ? 'on' : ''}" data-a="pollEnd" data-v="${k}">${l}</button>`).join('')}</div></div>
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="sendPoll">Send poll</button></div>`;
  }
  if (m.type === 'moment') {
    const bg = MOMENT_BGS[f.moBg || 0];
    const cf = closeFriendIds();
    return head('New moment', f.moClose ? `Only your ${cf.length} close friend${cf.length === 1 ? '' : 's'} will see it · 24 hours` : 'Visible to your friends for 24 hours') + `
      <div class="pills"><button class="pill ${f.moClose ? '' : 'on'}" data-a="moAud" data-v="all">${ic('people', 14)} All friends</button><button class="pill ${f.moClose ? 'on cfpill' : ''}" data-a="moAud" data-v="close">${ic('star', 14)} Close friends${cf.length ? ' · ' + cf.length : ''}</button><button class="pill addpill" data-a="cfOpen">Edit list</button></div>
      <div class="mopreview" style="background:${safeImg(f.moImg) ? `url(${f.moImg}) center/cover` : bg}">${f.moText ? `<span class="motext">${esc(f.moText)}</span>` : safeImg(f.moImg) ? '' : '<span class="motext" style="opacity:.6">Say something…</span>'}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn sm" style="cursor:pointer">${ic('photo', 16)} ${f.moImg ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" class="sr" data-file="moImg"></label>${f.moImg ? '<button class="btn sm" data-a="moNoImg">Remove photo</button>' : MOMENT_BGS.map((b, i) => `<button class="acc ${(f.moBg || 0) === i ? 'on' : ''}" style="width:30px;height:30px;background:${b}" aria-label="Background ${i + 1}" data-a="moBg" data-v="${i}"></button>`).join('')}</div>
      <label class="field">Caption<input class="inp" id="mo-text" data-model="form.moText" value="${esc(f.moText || '')}" maxlength="140" placeholder="What's happening?" data-rerender="1"></label>
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="postMoment" ${S.busy ? 'disabled' : ''}>Share moment</button></div>`;
  }
  if (m.type === 'invite') {
    const iv = m.inv;
    if (!iv) return head('Invite') + '<div class="empty">This invite link is no longer valid.</div>';
    return `<div class="cover" style="height:160px;margin:-26px -26px 0;background:${safeImg(iv.image) ? `url(${iv.image}) center/cover` : gradFor(iv.eventId)}"></div>
      <div class="sec">You're invited</div><h2 class="disp" style="margin:0;font-size:24px">${esc(iv.title)}</h2>
      <div class="mute">${new Date(iv.date + 'T00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}${iv.time ? ' · ' + esc(iv.time) : ''}</div>
      <div class="row">${av(iv.host, 32)}<span class="small">Hosted by <b>${esc(U(iv.host)?.name || 'a Nexa user')}</b></span></div>
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Not now</button><button class="btn pri" data-a="acceptInvite" ${S.busy ? 'disabled' : ''}>Join event</button></div>`;
  }
  if (m.type === 'reset') return head('Reset your password', 'We\'ll email you a link to choose a new one.') + `<label class="field">Email<input class="inp" id="reset-email" type="email" data-model="form.resetEmail" value="${esc(f.resetEmail || '')}" data-autofocus></label>${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}${m.sent ? '<div class="small" style="color:var(--ok);font-weight:700">Sent! Check your inbox (and spam folder).</div>' : ''}<div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Close</button><button class="btn pri" data-a="sendReset" ${S.busy ? 'disabled' : ''}>Send link</button></div>`;
  if (m.type === 'seen') { const mo = S.moments.find(x => x.id === m.id); const ss = (mo?.seen || []); return head('Seen by ' + ss.length) + `<div class="col" style="gap:4px">${ss.length ? ss.map(u => `<div class="item">${av(u, 40)}<b>${esc(dname(u))}</b></div>`).join('') : '<div class="empty">No views yet.</div>'}</div>`; }
  return '';
}
function vStory() {
  const st = S.story; const list = S.moments.filter(m => m.author === st.author);
  const mo = list[st.idx]; if (!mo) return '';
  const mine = mo.author === S.me;
  return `<div class="story${A('story' + st.author)}" role="dialog" aria-label="Moment">
    <div class="story-card" style="background:${safeImg(mo.image) ? `#000 url(${mo.image}) center/contain no-repeat` : MOMENT_BGS[mo.bg || 0]}">
      <div class="sbars">${list.map((m, i) => `<i><b style="${i < st.idx ? 'width:100%' : i === st.idx ? '' : 'width:0'}" class="${i === st.idx ? 'run' : ''}"></b></i>`).join('')}</div>
      <div class="shead">${av(mo.author, 36)}<b>${esc(dname(mo.author))}</b><span class="small" style="opacity:.8">${fmtWhen(mo.at)}</span><span class="grow"></span>${mine ? `<button class="ibtn" style="background:rgba(0,0,0,.3)" aria-label="Delete moment" data-a="delMoment" data-v="${mo.id}">${ic('trash', 18)}</button>` : `<button class="ibtn" style="background:rgba(0,0,0,.3)" aria-label="Report" data-a="report" data-v="${mo.author}">${ic('flag', 18)}</button>`}<button class="ibtn" style="background:rgba(0,0,0,.3)" aria-label="Close" data-a="storyClose">${ic('x', 18)}</button></div>
      ${mo.text ? `<div class="motext big" style="${safeImg(mo.image) ? 'position:absolute;bottom:90px;left:20px;right:20px;background:rgba(0,0,0,.45);padding:10px 14px;border-radius:14px;font-size:18px' : ''}">${esc(mo.text)}</div>` : ''}
      <button class="szone l" aria-label="Previous" data-a="storyPrev"></button><button class="szone r" aria-label="Next" data-a="storyNext"></button>
      <div class="sfoot">${mine ? `<button class="btn sm" style="background:rgba(0,0,0,.35)" data-a="seenList" data-v="${mo.id}">${ic('eye', 16)} Seen by ${(mo.seen || []).length}</button>` : `<form class="row grow" data-submit="storyReply" style="gap:8px"><input id="storyReply" class="inp" style="background:rgba(0,0,0,.35);border-color:rgba(255,255,255,.25)" data-model="form.storyReply" value="${esc(S.form.storyReply || '')}" placeholder="Reply to ${esc(dname(mo.author).split(' ')[0])}…" aria-label="Reply"><button class="send" aria-label="Send reply">${ic('send', 18, 2)}</button></form>`}</div>
    </div></div>`;
}

/* =====================================================================
   TOASTS
   ===================================================================== */
function toast(html, onClick, fromUid) {
  let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const t = document.createElement(onClick ? 'button' : 'div');
  t.className = 'toast glass';
  t.innerHTML = (fromUid ? av(fromUid, 28) : `<span class="unread-dot"></span>`) + `<span class="row" style="gap:6px;min-width:0">${html}</span>`;
  let moved = false;
  if (onClick) t.onclick = () => { if (moved) return; onClick(); t.remove(); };
  // swipe up to dismiss
  let y0 = null;
  t.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; moved = false; }, { passive: true });
  t.addEventListener('touchmove', e => { if (y0 == null) return; const dy = Math.min(0, e.touches[0].clientY - y0); if (dy < -6) moved = true; t.style.transform = `translateY(${dy}px)`; t.style.opacity = 1 + dy / 120; }, { passive: true });
  t.addEventListener('touchend', () => { const dy = parseFloat((t.style.transform.match(/-?[\d.]+/) || [0])[0]); if (dy < -40) { t.classList.add('out'); setTimeout(() => t.remove(), 250); } else { t.style.transform = ''; t.style.opacity = ''; } y0 = null; });
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 4200);
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
function go(p) {
  S.picker = false; S.attach = false; S.sugg = null; S.story = null; if (S.rec) stopRec(false);
  S.page = p; S.menu = null; S.palette = false; S.modal = null; S.bgPop = false; S.selMsg = null; S.authErr = '';
  if (p === 'settings') { S.form.sName = undefined; S.form.sHandle = undefined; S.form.sBio = undefined; }
  if (p !== 'messages' && innerWidth <= 700) S.conv = null;
  if (p === 'messages' && S.conv) { watchMsgs(S.conv); markRead(); }
  render();
}
function openConv(id) {
  S.keepBottom = null;
  S.picker = false; S.attach = false; S.sugg = null; if (S.rec) stopRec(false);
  S.page = 'messages'; S.conv = id; S.replyTo = null; S.editing = null; S.findOpen = false; S.find = ''; S.bgPop = false; S.modal = null; S.palette = false; S.menu = null; S.selMsg = null;
  delete nStack['c_' + id]; try { navigator.serviceWorker?.controller?.postMessage({ type: 'clear', tag: 'c_' + id }); } catch {}
  watchMsgs(id); render(); setTimeout(() => { markRead(); if (innerWidth > 700) $('#composer')?.focus(); }, 60);
}
async function ensureDM(uid) {
  const id = 'dm_' + pairId(S.me, uid);
  const ex = convOf(id) || await db().get('conversations/' + id).catch(() => null);
  if (!ex) await db().set('conversations/' + id, { type: 'dm', members: [S.me, uid].sort(), createdAt: now(), reads: {}, typing: {}, ...(isFriend(uid) ? {} : { request: { from: S.me, at: now() } }) });
  else if (hiddenAt(ex)) { /* keep hidden marker; it reappears on next message */ }
  return id;
}
function openNotif(n) {
  if (!n.read) db().update('notifications/' + n.id, { read: true });
  const l = n.link || {};
  if (l.page === 'conv' && l.id) return openConv(l.id);
  if (l.page === 'profile') { S.profileUid = l.id; return go('profile'); }
  if (l.page === 'community' && l.id) { lsSet('nexa.community', l.id); return checkCommunityInvite(); }
  if (l.page === 'events' && l.id) { go('events'); S.modal = { type: 'event', id: l.id }; return render(); }
  if (l.page) go(l.page);
}
const confirmModal = (title, body, yes, fn, danger = true) => { S.modal = { type: 'confirm', title, body, yes, fn, danger }; S.menu = null; render(); };
let typingSent = 0;
function onTyping() {
  const c = convOf(S.conv);
  if (!c || S.profile?.typingOn === false) return;
  if (now() - typingSent > 2500) { typingSent = now(); db().update('conversations/' + c.id, { ['typing.' + S.me]: now() }).catch(() => {}); }
}
const msgLabel = m => m.video ? (m.video.round ? 'Video message' : 'Video') + (m.text ? ' · ' + m.text : '') : m.live ? 'Live location' : m.stickerImg ? 'Sticker' : m.bot ? 'Nexa AI: ' + (m.text || '') : m.game ? ({ ttt: 'Tic-tac-toe', rps: 'Rock, paper, scissors', c4: 'Connect Four', word: 'Word guess', trivia: 'Trivia battle' }[m.game.t] || 'Game') : m.theme ? 'Chat theme' : m.audio ? 'Voice message' : m.sticker ? 'Sticker' : m.poll ? 'Poll: ' + m.poll.q : m.gif ? 'GIF' : (m.images && m.images.length > 1) ? m.images.length + ' photos' + (m.text ? ' · ' + m.text : '') : (m.images || m.image) ? 'Photo' + (m.text ? ' · ' + m.text : '') : (m.text || '');
async function sendMessage(payload, convId) {
  const c = convOf(convId || S.conv); if (!c) return;
  const t = now();
  const msg = { from: S.me, at: t, ...payload };
  if (c.ttl) msg.expiresAt = t + c.ttl;
  if (S.replyTo && !convId) msg.replyTo = { id: S.replyTo.id, from: S.replyTo.from, text: msgLabel(S.replyTo).slice(0, 120) };
  if (!convId) S.replyTo = null;
  S.sugg = null;
  let id;
  const fail = e => toast(dmBlocked(c) || /permission/i.test(e.message) ? 'Message couldn\'t be delivered.' : esc(e.message));
  const convPatch = { last: { text: msgLabel(msg).slice(0, 140), from: S.me, at: t, exp: msg.expiresAt || 0 }, ['reads.' + S.me]: t, ['typing.' + S.me]: 0 };
  if (!navigator.onLine && db().addFast) {
    // Offline: queue locally; Firestore sends it as soon as the connection is back.
    id = db().addFast(`conversations/${c.id}/messages`, msg, fail);
    db().update('conversations/' + c.id, convPatch).catch(() => {});
    sound('send'); if (!payload.system && !payload.bot) { bumpStat('sent'); const h = new Date().getHours(); if (h >= 1 && h < 4) bumpStat('night', true); }
    S.queued = (S.queued || []).concat({ conv: c.id, msg: id }); return id;
  }
  try { id = await db().add(`conversations/${c.id}/messages`, msg); }
  catch (e) { fail(e); return; }
  sound('send'); buzz(8);
  if (!payload.system && !payload.bot) { bumpStat('sent'); const h = new Date().getHours(); if (h >= 1 && h < 4) bumpStat('night', true); }
  await db().update('conversations/' + c.id, convPatch);
  typingSent = 0;
  const url = (payload.text || '').match(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/);
  if (url && !payload.images) linkPreview(url[0]).then(pv => { if (pv) db().update(`conversations/${c.id}/messages/${id}`, { preview: pv }).catch(() => {}); });
  if (!payload.system && !payload.bot) bumpStreak(c);
  if (!payload.system && id) pushNotify('message', { conv: c.id, msg: id });
  if (!payload.bot && /(^|\s)@nexa\b/i.test(payload.text || '')) nexaInChat(c, payload.text);
  return id;
}
const previewCache = {};
async function linkPreview(u) {
  if (previewCache[u] !== undefined) return previewCache[u];
  try {
    const r = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(u), { signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined });
    const j = await r.json();
    if (j.status !== 'success' || !j.data) return (previewCache[u] = null);
    const d = j.data, cut = (x, n) => String(x || '').slice(0, n);
    const img = d.image?.url && /^https:\/\/[^\s"'()<>]+$/.test(d.image.url) ? d.image.url : '';
    return (previewCache[u] = { url: u, title: cut(d.title, 120), desc: cut(d.description, 200), image: img, site: cut(d.publisher, 60) });
  } catch { return (previewCache[u] = null); }
}

/* ---------------- AI ---------------- */
const AI_SYSTEM = `You are Nexa AI, the friendly assistant built into Nexa, a messaging and social app. Nexa has: Home (greeting, moments, quick actions, recent chats, events, friend requests, online friends, activity), Messages (direct chats, group chats with owner/member roles, event chats, photos and albums up to 6, voice messages via the mic button, stickers/emoji/GIFs via the smiley button, polls and links via the + button, reactions, reply, edit, delete, pin, in-chat search, per-chat backgrounds via the palette button, mute/pin/archive/block/report via the ••• menu), People (search by name or @handle, friend requests, private nicknames only you can see, people you may know), Events (create with name, description, date, time, cover image and audience: all friends, invite only or public; RSVP Going/Maybe/Can't go; invite links; every event has its own event chat), Moments (photos or text shared with friends for 24 hours), Notifications, and Settings (profile, photo, username, dark/bright mode, accent color, app background, text size, sounds, device notifications, privacy, blocked people, account, keyboard shortcuts). Also: voice and video calls from any direct chat, @nexa mentions in chats, tic-tac-toe and rock-paper-scissors via the + button, disappearing messages and shared media in the ••• menu, forwarding and starring messages, custom chat themes, profile banners/colours/birthdays, search across all chats in Messages. New: Communities (Messages › Communities pill: create one with text channels and voice rooms, roles, invite links), drop-in voice hangouts (Home › Hang out › Start my hangout), group video calls (video button in any group chat) with screen sharing, message requests from people who aren't friends (Requests pill; Settings › Privacy › Who can message me), chat folders (+ Folder pill), per-friend notification sounds (••• menu › Notification sound), translate button on messages, send with effect (+ › Send with effect: confetti, balloons, hearts, fireworks, slam), polls that close at a deadline, drafts that sync across devices, offline sending, event places with Maps links, shared event photo albums and "I'm on my way", profile widgets (Settings › Profile › Profile widgets), badges on your profile, blurred photos from strangers (Settings › Privacy), Download your data (Settings › Account), high contrast and bigger buttons (Settings › Appearance › Accessibility). Ctrl/Cmd+K opens search. Answer in plain text, warm and brief (under 110 words). For how-to questions give short numbered steps using these exact names. Never invent features.`;
async function aiText(prompt) {
  if (!S.be.ai) throw new Error('offline');
  return (await S.be.ai.generate(prompt, AI_SYSTEM)).trim();
}
const convTranscript = (c, n) => (S.msgs[c.id] || []).filter(m => !m.deleted && !m.system && m.at > hiddenAt(c) && !blocked(m.from)).slice(-n).map(m => `${m.from === S.me ? 'Me' : dname(m.from)}: ${msgLabel(m)}`).join('\n');
const actions = {
  authMode: (d) => { S.authMode = d.v; S.authErr = ''; render(); },
  go: d => go(d.v),
  back: () => { history.length > 1 ? go(S.prevPage || 'home') : go('home'); },
  profile: d => { S.prevPage = S.page; S.profileUid = d.v || S.me; S.menu = null; S.modal = null; S.palette = false; S.ai.open = innerWidth > 700 && S.ai.open; S.page = 'profile'; watchUser(d.v); render(); },
  palette: () => { S.palette = true; S.palQ = ''; S.palSel = 0; render(); },
  closePalette: () => { S.palette = false; render(); },
  aiOpen: () => { S.ai.open = true; S.palette = false; render(); setTimeout(() => $('#aiQ')?.focus(), 50); },
  aiClose: () => { S.ai.open = false; render(); },
  aiAsk: d => askAi(d.v),
  closeModal: () => { if (S.modal?.type === 'event') stopAlbum(); S.modal = null; S.authErr = ''; S.form.pick = []; S.form.pickQ = ''; render(); },
  closeMenu: () => { S.menu = null; render(); },
  lightbox: (d) => { const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (m) { S.lightbox = (m.images || [])[+d.i || 0] || m.image; render(); } },
  lightboxClose: () => { S.lightbox = ''; render(); },
  confirmYes: async () => { const fn = S.modal?.fn; S.modal = null; render(); if (fn) try { await fn(); } catch (e) { toast(esc(e.message)); } },
  // onboarding
  onbBack: () => { S.onbStep--; S.authErr = ''; render(); },
  onbNext: async () => {
    const f = S.form;
    if (S.onbStep === 0) {
      const name = (f.name || '').trim(), handle = (f.handle || '').trim().toLowerCase().replace(/^@/, '');
      if (!name) { S.authErr = 'Add a display name.'; return render(); }
      if (!/^[a-z0-9_.]{3,24}$/.test(handle)) { S.authErr = 'Usernames are 3–24 letters, numbers, dots or underscores.'; return render(); }
      S.busy = true; render();
      try {
        const h = await db().get('handles/' + handle);
        if (h && h.uid !== S.me) throw new Error('@' + handle + ' is taken. Try another.');
        const mine = await db().get('users/' + S.me);
        if (mine?.handleLower && mine.handleLower !== handle) await db().del('handles/' + mine.handleLower).catch(() => {});
        await db().set('handles/' + handle, { uid: S.me });
        S.form.handle = handle; S.authErr = ''; S.onbStep = 1;
      } catch (e) { S.authErr = e.message; }
      S.busy = false; return render();
    }
    if (S.onbStep === 1) { S.onbStep = 2; return render(); }
    S.busy = true; render();
    try {
      await db().set('users/' + S.me, { name: f.name.trim(), nameLower: f.name.trim().toLowerCase(), handle: f.handle, handleLower: f.handle, bio: (f.bio || '').trim(), avatar: f.avatar || '', status: 'online', createdAt: now(), lastSeen: now(), showOnline: true, receipts: true, typingOn: true, discoverable: true, allowRequests: 'everyone' });
      await db().update(`users/${S.me}/private/prefs`, { theme: S.prefs.theme, accent: S.prefs.accent, customAccent: S.prefs.customAccent || '' });
      await db().add('notifications', { to: S.me, from: '', type: 'welcome', title: 'Welcome to Nexa', body: 'Your space is ready. Find friends to start chatting.', at: now(), read: false, link: { page: 'people' } });
      S.view = 'app'; S.page = 'home'; S.form = {}; checkInvite(); checkJoin(); confetti(); setTimeout(() => { if (!S.prefs.tourDone) { S.tour = 0; paintTour(); } }, 1400);
    } catch (e) { S.authErr = e.message; }
    S.busy = false; render();
  },
  // prefs
  pref: d => { S.palette = false; savePrefs({ [d.k]: d.v }); },
  prefTog: d => savePrefs({ [d.k]: !S.prefs[d.k] }),
  notifTog: d => savePrefs({ notif: { ...S.prefs.notif, [d.k]: !S.prefs.notif[d.k] } }),
  accent: d => savePrefs({ accent: +d.v, customAccent: '' }),
  appBg: () => savePrefs({ appBg: '' }),
  profTog: d => { const v = S.profile[d.k] === false; S.profile[d.k] = v; render(); db().update('users/' + S.me, { [d.k]: v }); },
  profSet: d => { S.profile[d.k] = d.v; render(); db().update('users/' + S.me, { [d.k]: d.v }); },
  status: d => { S.profile.status = d.v; render(); db().update('users/' + S.me, { status: d.v, lastSeen: now() }); },
  setSec: d => { S.setSec = d.v; S.authErr = ''; render(); },
  setSecGo: d => { S.setSec = d.v; go('settings'); },
  removeAvatar: () => db().update('users/' + S.me, { avatar: '' }),
  saveProfile: async () => {
    const f = S.form, name = (f.sName ?? S.profile.name).trim(), handle = (f.sHandle ?? S.profile.handle).trim().toLowerCase().replace(/^@/, ''), bio = (f.sBio ?? S.profile.bio ?? '').trim();
    const nowText = (f.sNow ?? S.profile.nowText ?? '').trim().slice(0, 60), bm = f.sBm ?? (S.profile.birthday || '').slice(0, 2), bd = f.sBd ?? (S.profile.birthday || '').slice(3);
    const birthday = bm && bd ? bm + '-' + bd : '';
    if (!name) { S.authErr = 'Display name can\'t be empty.'; return render(); }
    if (!/^[a-z0-9_.]{3,24}$/.test(handle)) { S.authErr = 'Usernames are 3–24 letters, numbers, dots or underscores.'; return render(); }
    S.busy = true; S.authErr = ''; render();
    try {
      if (handle !== S.profile.handleLower) {
        const h = await db().get('handles/' + handle);
        if (h && h.uid !== S.me) throw new Error('@' + handle + ' is taken.');
        await db().set('handles/' + handle, { uid: S.me });
        await db().del('handles/' + S.profile.handleLower).catch(() => {});
      }
      await db().update('users/' + S.me, { name, nameLower: name.toLowerCase(), handle, handleLower: handle, bio, nowText, birthday });
      f.sNow = f.sBm = f.sBd = undefined;
      f.sName = f.sHandle = f.sBio = undefined;
      toast('Profile saved');
    } catch (e) { S.authErr = e.message; }
    S.busy = false; render();
  },
  logout: () => confirmModal('Log out?', 'You can log back in anytime.', 'Log out', async () => { await leaveRoom().catch(() => {}); await unregisterPush().catch(() => {}); await db().update('users/' + S.me, { lastSeen: 0 }).catch(() => {}); await S.be.auth.signOut(); }, false),
  deleteAccount: () => confirmModal('Delete your account?', 'This removes your profile, handle, friendships and events you host, then signs you out. This can\'t be undone.', 'Delete account', async () => {
    const me = S.me;
    for (const f of S.friends) await db().del('friendships/' + f.id).catch(() => {});
    for (const e of allEvents().filter(e => e.creator === me)) await db().del('events/' + e.id).catch(() => {});
    for (const r of [...S.reqIn, ...S.reqOut]) await db().del('friendRequests/' + r.id).catch(() => {});
    await db().del('handles/' + S.profile.handleLower).catch(() => {});
    await db().del(`users/${me}/private/prefs`).catch(() => {});
    await db().del('users/' + me);
    await S.be.auth.deleteMe();
  }),
  // people
  ptab: d => { S.ptab = d.v; render(); },
  ptabClear: d => { S.peopleQ = ''; S.peopleRes = []; S.ptab = d.v; render(); },
  copyHandle: async () => { const link = profileLink(); if (navigator.share && innerWidth <= 1100) { try { await navigator.share({ title: 'Add me on Nexa', text: `Add me on Nexa: @${S.profile.handle}`, url: link }); return; } catch {} } try { await navigator.clipboard.writeText(link); return toast('Your invite link is copied — send it to friends'); } catch {} const t = '@' + S.profile.handle; try { await navigator.clipboard.writeText(t); toast('Copied ' + esc(t)); } catch { toast('Your handle is ' + esc(t)); } },
  addFriend: async d => {
    const uid = d.v, id = S.me + '__' + uid;
    const back = S.reqIn.find(r => r.from === uid);
    if (back) return actions.accept({ v: back.id });
    if (!rateOk('req')) return toast('You\'ve sent a lot of friend requests. Try again in a little while.');
    await db().set('friendRequests/' + id, { from: S.me, to: uid, at: now() });
    notify(uid, { type: 'friend_request', title: `${S.profile.name} sent you a friend request`, body: '@' + S.profile.handle, link: { page: 'people' } });
    toast('Friend request sent');
  },
  cancelReq: d => db().del('friendRequests/' + d.v),
  accept: async d => {
    const r = S.reqIn.find(x => x.id === d.v); if (!r) return;
    await db().set('friendships/' + pairId(r.from, S.me), { members: [r.from, S.me].sort(), at: now() });
    await db().del('friendRequests/' + r.id);
    notify(r.from, { type: 'friend_accept', title: `${S.profile.name} accepted your request`, body: 'You can message each other now.', link: { page: 'profile', id: S.me } });
    toast(`You and ${esc(dname(r.from))} are now friends`, () => actions.dm({ v: r.from }), r.from);
  },
  decline: d => db().del('friendRequests/' + d.v),
  removeFriend: d => confirmModal('Remove friend?', `${dname(d.v)} won't be notified. You can send a new request later.`, 'Remove', async () => { await db().del('friendships/' + pairId(S.me, d.v)); const nk = { ...(S.prefs.nicknames || {}) }; delete nk[d.v]; savePrefs({ nicknames: nk }); toast('Friend removed'); }),
  personMenu: (d, el, ev) => { const r = el.getBoundingClientRect(); S.menu = { type: 'person', uid: d.v, x: r.left - 160, y: r.bottom + 6 }; render(); },
  nickname: d => { S.form.nick = undefined; S.modal = { type: 'nickname', uid: d.v }; S.menu = null; render(); },
  saveNick: d => { const nk = { ...(S.prefs.nicknames || {}) }; const v = (S.form.nick ?? '').trim(); if (d.v === 'clear' || !v) delete nk[S.modal.uid]; else nk[S.modal.uid] = v; S.modal = null; savePrefs({ nicknames: nk }); toast(d.v === 'clear' || !v ? 'Nickname removed' : 'Nickname saved — only you can see it'); },
  dm: async d => { S.menu = null; if (blocked(d.v)) return toast('Unblock them first'); if (!isFriend(d.v) && !convOf('dm_' + pairId(S.me, d.v)) && !rateOk('dmreq')) return toast('You\'ve started a lot of new chats. Try again later.'); if (!canDM(d.v)) return toast(`${esc(dname(d.v).split(' ')[0])} only gets messages from friends. Send a friend request instead.`); const id = await ensureDM(d.v); openConv(id); },
  // messages
  newChat: () => { S.form.pickQ = ''; S.modal = { type: 'newChat' }; S.palette = false; render(); },
  newGroup: () => { S.form.pick = []; S.form.pickQ = ''; S.form.gName = ''; S.authErr = ''; S.modal = { type: 'newGroup' }; S.palette = false; S.menu = null; render(); },
  pick: async d => {
    if (!d.multi) { S.modal = null; const id = await ensureDM(d.v); return openConv(id); }
    const p = S.form.pick || []; S.form.pick = p.includes(d.v) ? p.filter(x => x !== d.v) : [...p, d.v]; render();
  },
  createGroup: async () => {
    const sel = S.form.pick || [], name = (S.form.gName || '').trim();
    if (sel.length < 2) { S.authErr = 'Pick at least two friends for a group.'; return render(); }
    const members = [S.me, ...sel], roles = {}; members.forEach(u => roles[u] = u === S.me ? 'owner' : 'member');
    const id = await db().add('conversations', { type: 'group', name: name || [S.profile.name.split(' ')[0], ...sel.map(u => U(u)?.name?.split(' ')[0])].join(', '), members, roles, createdAt: now(), reads: {}, typing: {}, last: { text: `${S.profile.name} created the group`, from: S.me, at: now() } });
    sel.forEach(u => notify(u, { type: 'group_add', title: `${S.profile.name} added you to a group`, body: name || 'New group chat', link: { page: 'conv', id } }));
    S.modal = null; S.form.pick = []; openConv(id);
  },
  openConv: d => openConv(d.v),
  closeConv: () => { S.conv = null; render(); },
  convFilter: d => { S.convFilter = d.v; render(); },
  send: () => submitComposer(),
  addLink: () => { S.form.link = 'https://'; S.modal = { type: 'link' }; render(); },
  sendLink: async () => { const u = (S.form.link || '').trim(); if (!/^https?:\/\/\S+\.\S+/.test(u)) return toast('Enter a full link starting with https://'); S.modal = null; render(); await sendMessage({ text: u }); },
  find: () => { S.findOpen = !S.findOpen; S.find = ''; S.bgPop = false; render(); },
  bgPop: () => { S.bgPop = !S.bgPop; S.findOpen = false; S.menu = null; render(); },
  wide: () => { S.wide = !S.wide; render(); },
  chatBg: d => savePrefs({ chatBgs: { ...(S.prefs.chatBgs || {}), [S.conv]: { preset: d.v } } }),
  convMenu: (d, el) => { const r = el.getBoundingClientRect(); S.menu = { type: 'conv', x: r.right - 230, y: r.bottom + 6 }; S.bgPop = false; render(); },
  selMsg: (d, el, ev) => { if (innerWidth <= 700 && !ev.target.closest('button,a,img')) { S.selMsg = S.selMsg === d.v ? null : d.v; render(); } },
  reply: d => { const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); S.replyTo = m; S.editing = null; S.selMsg = null; render(); $('#composer')?.focus(); },
  edit: d => { const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m) return; S.editing = m; S.replyTo = null; S.draft[S.conv] = m.text; S.selMsg = null; render(); setTimeout(() => { const t = $('#composer'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 30); },
  cancelCtx: () => { if (S.editing) S.draft[S.conv] = ''; S.replyTo = null; S.editing = null; render(); },
  delMsg: d => confirmModal('Delete message?', 'It will be removed for everyone in this chat.', 'Delete', async () => {
    const c = convOf(S.conv); await db().update(`conversations/${c.id}/messages/${d.v}`, { deleted: true, text: '', image: '', reactions: {} });
    if (c.pinned?.id === d.v) await db().update('conversations/' + c.id, { pinned: null });
  }),
  react: async d => {
    S.menu = null; S.selMsg = null;
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m) return;
    const has = (m.reactions?.[d.r] || []).includes(S.me);
    await db().update(`conversations/${S.conv}/messages/${d.v}`, { ['reactions.' + d.r]: has ? ops.remove(S.me) : ops.union(S.me) });
  },
  reactMenu: (d, el) => { const r = el.getBoundingClientRect(); S.menu = { type: 'react', mid: d.v, x: r.left - 100, y: r.top - 60 }; render(); },
  pin: async d => { const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); await db().update('conversations/' + S.conv, { pinned: { id: m.id, text: m.text || 'Photo', by: S.me } }); S.selMsg = null; toast('Message pinned'); },
  unpin: () => { S.menu = null; db().update('conversations/' + S.conv, { pinned: null }); },
  jumpPin: () => { const c = convOf(S.conv); const el = [...document.querySelectorAll('.m')].find(x => x.dataset.v === c?.pinned?.id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.animate([{ filter: 'brightness(1.6)' }, { filter: 'none' }], 900); } },
  hideConv: () => confirmModal('Delete conversation?', 'This clears the chat history for you only. It reappears if someone sends a new message.', 'Delete', async () => { await db().update('conversations/' + S.conv, { ['hidden.' + S.me]: now() }); S.conv = null; render(); }),
  groupInfo: d => { S.form.gRename = undefined; S.modal = { type: 'group', id: d.v || S.conv }; S.menu = null; render(); },
  renameGroup: async () => { const n = (S.form.gRename || '').trim(); if (!n) return; await db().update('conversations/' + S.modal.id, { name: n }); toast('Group renamed'); },
  kick: d => { const id = S.modal.id; confirmModal('Remove member?', `${dname(d.v)} will be removed from the group.`, 'Remove', () => db().update('conversations/' + id, { members: ops.remove(d.v), ['roles.' + d.v]: ops.del() })); },
  addMembersOpen: () => { S.form.pick = []; S.form.pickQ = ''; S.modal = { type: 'newGroup', addTo: S.modal.id }; render(); },
  addMembers: async () => { const id = S.modal.addTo, c = convOf(id), sel = (S.form.pick || []).filter(u => !c.members.includes(u)); if (!sel.length) { S.modal = null; return render(); } const patch = { members: ops.union(...sel) }; sel.forEach(u => patch['roles.' + u] = 'member'); await db().update('conversations/' + id, patch); sel.forEach(u => notify(u, { type: 'group_add', title: `${S.profile.name} added you to ${c.name}`, body: 'Group chat', link: { page: 'conv', id } })); S.modal = null; render(); toast('Members added'); },
  leaveGroup: () => { const id = S.modal?.id || S.conv; const c = convOf(id); confirmModal('Leave group?', 'You\'ll stop getting messages from this group.', 'Leave', async () => {
    const patch = { members: ops.remove(S.me), ['roles.' + S.me]: ops.del() };
    const rest = c.members.filter(u => u !== S.me);
    if ((c.roles || {})[S.me] === 'owner' && rest.length) patch['roles.' + rest[0]] = 'owner';
    await db().update('conversations/' + id, patch); S.conv = null; render();
  }); },
  // events
  newEvent: () => { S.form = { ...S.form, evTitle: '', evDesc: '', evDate: '', evTime: '', evImg: '', evAud: 'friends', pick: [], pickQ: '' }; S.authErr = ''; S.modal = { type: 'newEvent' }; S.palette = false; render(); },
  evAud: d => { S.form.evAud = d.v; render(); },
  evTab: d => { S.evTab = d.v; render(); },
  createEvent: async () => {
    const f = S.form, title = (f.evTitle || '').trim();
    if (!title) { S.authErr = 'Give your event a name.'; return render(); }
    if (!f.evDate) { S.authErr = 'Pick a date.'; return render(); }
    const aud = f.evAud || 'friends';
    const invitees = aud === 'friends' ? friendIds() : aud === 'invite' ? (f.pick || []) : [];
    if (aud === 'invite' && !invitees.length) { S.authErr = 'Pick at least one friend to invite.'; return render(); }
    S.busy = true; render();
    try {
      const code = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
      const id = await db().add('events', { title, desc: (f.evDesc || '').trim(), date: f.evDate, time: f.evTime || '', image: f.evImg || '', place: (f.evPlace || '').trim(), creator: S.me, audience: aud, public: aud === 'public', viewers: [S.me, ...invitees], attendees: [S.me], maybe: [], declined: [], inviteCode: code, createdAt: now() });
      const convId = await db().add('conversations', { type: 'event', eventId: id, name: title, members: [S.me], roles: { [S.me]: 'owner' }, createdAt: now(), reads: {}, typing: {}, last: { text: 'Event chat created', from: S.me, at: now() } });
      await db().update('events/' + id, { convId });
      await db().set('eventInvites/' + code, { eventId: id, title, date: f.evDate, time: f.evTime || '', host: S.me, image: f.evImg || '' });
      confetti();
      invitees.forEach(u => notify(u, { type: 'event_invite', title: `${S.profile.name} invited you to ${title}`, body: new Date(f.evDate + 'T00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + (f.evTime ? ' · ' + f.evTime : ''), link: { page: 'events', id } }));
      S.modal = null; S.page = 'events'; S.evTab = 'upcoming'; toast('Event created');
    } catch (e) { S.authErr = e.message; }
    S.busy = false; render();
  },
  eventOpen: d => { S.modal = { type: 'event', id: d.v }; S.palette = false; render(); },
  joinEvent: d => actions.rsvp({ v: d.v, r: 'going' }),
  rsvp: async d => {
    const e = allEvents().find(x => x.id === d.v); if (!e) return;
    const prev = rsvpOf(e), next = prev === d.r ? null : d.r;
    const patch = { attendees: next === 'going' ? ops.union(S.me) : ops.remove(S.me), maybe: next === 'maybe' ? ops.union(S.me) : ops.remove(S.me), declined: next === 'no' ? ops.union(S.me) : ops.remove(S.me) };
    await db().update('events/' + e.id, patch);
    if (e.convId && (next === 'going') !== (prev === 'going')) await db().update('conversations/' + e.convId, { members: next === 'going' ? ops.union(S.me) : ops.remove(S.me) }).catch(() => {});
    if (next === 'going') { notify(e.creator, { type: 'event_join', title: `${S.profile.name} is going to ${e.title}`, body: `${(e.attendees || []).length + 1} going`, link: { page: 'events', id: e.id } }); toast('You\'re going to ' + esc(e.title)); confetti(); }
  },
  eventChat: d => { const e = allEvents().find(x => x.id === d.v); if (e?.convId) openConv(e.convId); },
  shareEvent: async d => {
    const e = allEvents().find(x => x.id === d.v); if (!e) return;
    let code = e.inviteCode;
    if (!code && e.creator === S.me) { code = Math.random().toString(36).slice(2, 12); await db().update('events/' + e.id, { inviteCode: code }); await db().set('eventInvites/' + code, { eventId: e.id, title: e.title, date: e.date, time: e.time || '', host: S.me, image: e.image || '' }); }
    if (!code) return toast('Ask the host for an invite link.');
    const link = location.origin + location.pathname + '?invite=' + code;
    if (navigator.share && innerWidth <= 1100) { try { await navigator.share({ title: e.title, text: `Join me at ${e.title} on Nexa`, url: link }); return; } catch {} }
    try { await navigator.clipboard.writeText(link); toast('Invite link copied — anyone with it can join'); } catch { S.modal = { type: 'confirm', title: 'Invite link', body: link, yes: 'Done', fn: null, danger: false }; render(); }
  },
  acceptInvite: async () => {
    const iv = S.modal?.inv; if (!iv) return;
    S.busy = true; render();
    try {
      await db().update('events/' + iv.eventId, { viewers: ops.union(S.me), attendees: ops.union(S.me), lastInvite: iv.code });
      const ev = await db().get('events/' + iv.eventId);
      if (ev?.convId) await db().update('conversations/' + ev.convId, { members: ops.union(S.me) }).catch(() => {});
      notify(iv.host, { type: 'event_join', title: `${S.profile.name} joined ${iv.title}`, body: 'Via your invite link', link: { page: 'events', id: iv.eventId } });
      S.modal = null; S.page = 'events'; confetti(); toast('You\'re going to ' + esc(iv.title));
    } catch (e) { toast('This invite no longer works.'); S.modal = null; }
    S.busy = false; render();
  },
  delEvent: d => { const e = allEvents().find(x => x.id === d.v); confirmModal('Delete event?', `${e.title} will be removed and everyone going will be notified.`, 'Delete event', async () => {
    (e.attendees || []).forEach(u => notify(u, { type: 'event_update', title: `${e.title} was cancelled`, body: `${S.profile.name} deleted this event.`, link: { page: 'events' } }));
    if (e.convId) { await db().add(`conversations/${e.convId}/messages`, { from: S.me, at: now(), system: true, text: 'This event was cancelled' }).catch(() => {}); await db().update('conversations/' + e.convId, { name: e.title + ' (cancelled)', last: { text: 'Event cancelled', from: S.me, at: now() } }).catch(() => {}); }
    if (e.inviteCode) await db().del('eventInvites/' + e.inviteCode).catch(() => {});
    await db().del('events/' + e.id); toast('Event deleted');
  }); },
  // ---------- new: auth
  resetOpen: () => { S.form.resetEmail = S.form.email && S.form.email.includes('@') ? S.form.email : ''; S.authErr = ''; S.modal = { type: 'reset' }; render(); },
  sendReset: async () => { const em = (S.form.resetEmail || '').trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { S.authErr = 'Enter the email you signed up with.'; return render(); } S.busy = true; S.authErr = ''; render(); try { await S.be.auth.resetPassword(em); S.modal = { type: 'reset', sent: true }; } catch (e) { S.authErr = e.message; } S.busy = false; render(); },
  // ---------- composer extras
  attach: () => { S.attach = !S.attach; S.picker = false; render(); },
  picker: () => { S.picker = !S.picker; S.attach = false; render(); },
  pickTab: d => { S.pickTab = d.v; render(); if (d.v === 'gifs' && !S.gifs) searchGifs(); },
  insEmoji: d => { const t = $('#composer'); const cur = S.draft[S.conv] || ''; const pos = t ? t.selectionStart : cur.length; S.draft[S.conv] = cur.slice(0, pos) + d.v + cur.slice(pos); render(); setTimeout(() => { const t2 = $('#composer'); if (t2) { t2.focus(); t2.setSelectionRange(pos + d.v.length, pos + d.v.length); } }, 20); },
  sendSticker: d => { S.picker = false; render(); sendMessage({ sticker: d.v }); },
  sendGif: d => { const g = (S.gifs || [])[+d.i]; if (!g) return; S.picker = false; render(); sendMessage({ images: [g.url], gif: true, text: '' }); },
  pollOpen: () => { S.attach = false; S.form.pollQ = ''; S.form.pollOpts = ['', '']; S.form.pollMulti = false; S.form.pollEnd = ''; S.authErr = ''; S.modal = { type: 'poll' }; render(); },
  pollEnd: d => { S.form.pollEnd = d.v; render(); },
  pollAdd: () => { S.form.pollOpts.push(''); render(); },
  pollDel: d => { S.form.pollOpts.splice(+d.v, 1); render(); },
  pollMulti: () => { S.form.pollMulti = !S.form.pollMulti; render(); },
  sendPoll: async () => { const q = (S.form.pollQ || '').trim(), opts = S.form.pollOpts.map(x => x.trim()).filter(Boolean); if (!q) { S.authErr = 'Add a question.'; return render(); } if (opts.length < 2) { S.authErr = 'Add at least two options.'; return render(); } S.modal = null; render(); const hrs = +S.form.pollEnd || 0; await sendMessage({ poll: { q, opts: opts.map(t => ({ t, v: [] })), multi: !!S.form.pollMulti, ...(hrs ? { closesAt: now() + hrs * 3600e3 } : {}) } }); },
  vote: async d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m?.poll) return;
    if (m.poll.closesAt && m.poll.closesAt < now()) return toast('This poll has closed.');
    const i = +d.i, opts = m.poll.opts.map(o => ({ t: o.t, v: [...(o.v || [])] }));
    const had = opts[i].v.includes(S.me);
    if (!m.poll.multi) opts.forEach(o => o.v = o.v.filter(u => u !== S.me));
    if (had) opts[i].v = opts[i].v.filter(u => u !== S.me); else opts[i].v.push(S.me);
    sound('pop');
    await db().update(`conversations/${S.conv}/messages/${m.id}`, { 'poll.opts': opts });
  },
  // ---------- voice
  recStart: async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Voice messages aren\'t supported in this browser.');
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return toast('Microphone access was blocked. Allow it in your browser to record.'); }
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
    const chunks = []; mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    let ctx, an, buf; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an); buf = new Uint8Array(an.fftSize); } catch {}
    const rec = { mr, stream, ctx, chunks, start: now(), peaks: [] };
    rec.iv = setInterval(() => {
      let v = 20; if (an) { an.getByteTimeDomainData(buf); let sum = 0; for (const x of buf) sum += (x - 128) ** 2; v = Math.min(100, Math.sqrt(sum / buf.length) * 5 + 8); }
      rec.peaks.push(v);
      const t = $('#recTime'); if (t) t.textContent = fmtDur((now() - rec.start) / 1000);
      const b = $('#recBars'); if (b) b.innerHTML = rec.peaks.slice(-44).map(h => `<i style="height:${h}%"></i>`).join('');
      if (now() - rec.start > 60000) actions.recSend();
    }, 100);
    mr.start(250); S.rec = rec; S.attach = false; S.picker = false; render();
  },
  recCancel: () => stopRec(false),
  recSend: () => stopRec(true),
  playVoice: d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); const src = safeAudio(m?.audio?.src); if (!src) return;
    if (S.playing?.id === d.v) { const a = S.playing.a; if (a.paused) { a.play(); S.playing.on = true; } else { a.pause(); S.playing.on = false; } render(); return; }
    if (S.playing) S.playing.a.pause();
    const a = new Audio(src); a.playbackRate = voiceRate(); S.playing = { id: d.v, a, on: true };
    a.ontimeupdate = () => paintVoice();
    a.onended = () => { S.playing = null; render(); };
    a.play().catch(() => { toast('This voice message can\'t play in this browser.'); S.playing = null; render(); }); render();
  },
  // ---------- AI in chats
  suggest: async () => {
    const c = convOf(S.conv); if (!c) return;
    S.sugg = { conv: c.id, loading: true, items: [] }; render();
    const last = [...(S.msgs[c.id] || [])].reverse().find(m => m.from !== S.me && !m.deleted && !m.system);
    let items = null;
    if (S.be.ai) {
      try {
        const raw = await aiText(`Here is the end of a chat. Suggest 3 short, natural replies I (Me) could send next, matching the tone. Reply ONLY with a JSON array of 3 strings.\n\n${convTranscript(c, 14)}`);
        const arr = JSON.parse(raw.replace(/^```(json)?|```$/g, '').trim()); if (Array.isArray(arr)) items = arr.slice(0, 3).map(x => String(x).slice(0, 120));
      } catch {}
    }
    if (!items) { const t = (last && msgLabel(last)) || ''; items = !last ? ['Hey! 👋', 'How\'s it going?', 'What are you up to?'] : /\?\s*$/.test(t) ? ['Yes, definitely!', 'Hmm, not sure yet', 'Let me check and get back to you'] : ['😂', 'Sounds good!', 'Tell me more']; }
    if (S.sugg && S.sugg.conv === c.id) { S.sugg = { conv: c.id, items }; render(); }
  },
  useSugg: d => { const t = S.sugg?.items[+d.i]; if (t) { S.draft[S.conv] = t; S.sugg = null; render(); setTimeout(() => $('#composer')?.focus(), 20); } },
  closeSugg: () => { S.sugg = null; render(); },
  summarize: async () => {
    const c = convOf(S.conv); S.menu = null; if (!c) return;
    S.ai.open = true;
    const tr = convTranscript(c, 80);
    S.ai.msgs.push({ me: true, text: 'Summarize “' + convName(c) + '”' });
    if (!tr) { S.ai.msgs.push({ me: false, text: 'There\'s nothing to summarize in this chat yet.' }); return render(); }
    if (!S.be.ai) { S.ai.msgs.push({ me: false, text: 'Chat summaries use Nexa AI, which is available on the live version of Nexa.' }); return render(); }
    S.ai.typing = true; render();
    try { const out = await aiText(`Summarize this chat for me in 3-5 short bullet points (use "• "). Mention any plans, decisions or questions waiting for my answer.\n\n${tr}`); S.ai.msgs.push({ me: false, text: out }); }
    catch { S.ai.msgs.push({ me: false, text: 'I couldn\'t reach Nexa AI just now. Try again in a moment.' }); }
    S.ai.typing = false; render();
  },
  aiDescribe: async () => {
    const f = S.form, title = (f.evTitle || '').trim();
    if (!title) { S.authErr = 'Add an event name first.'; return render(); }
    S.aiBusy = true; S.authErr = ''; render();
    const when = f.evDate ? new Date(f.evDate + 'T00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + (f.evTime ? ' at ' + f.evTime : '') : '';
    let out = '';
    if (S.be.ai) { try { out = await aiText(`Write a short, friendly event description (2-3 sentences, no hashtags, no emoji overload) for an event called "${title}"${when ? ' on ' + when : ''}. ${f.evDesc ? 'Include these notes: ' + f.evDesc : ''}`); } catch {} }
    if (!out) out = `Join us for ${title}${when ? ' on ' + when : ''}! ${f.evDesc ? f.evDesc.trim() + ' ' : ''}Bring good vibes — let me know if you can make it.`;
    S.form.evDesc = out.slice(0, 600); S.aiBusy = false; render();
  },
  // ---------- chat organisation
  muteConv: () => { const m = { ...(S.prefs.muted || {}) }; m[S.conv] ? delete m[S.conv] : (m[S.conv] = true); S.menu = null; savePrefs({ muted: m }); toast(m[S.conv] ? 'Chat muted' : 'Chat unmuted'); },
  pinConv: () => { let pc = [...(S.prefs.pinnedConvs || [])]; pc = pc.includes(S.conv) ? pc.filter(x => x !== S.conv) : [S.conv, ...pc]; S.menu = null; savePrefs({ pinnedConvs: pc }); },
  archiveConv: () => { const m = { ...(S.prefs.archived || {}) }; const was = !!m[S.conv]; was ? delete m[S.conv] : (m[S.conv] = true); S.menu = null; if (!was) S.conv = null; savePrefs({ archived: m }); toast(was ? 'Moved back to chats' : 'Chat archived'); },
  // ---------- safety
  blockUser: d => { S.menu = null; confirmModal(`Block ${dname(d.v)}?`, 'They won\'t be able to message you, send friend requests or see your moments. They won\'t be told.', 'Block', () => doBlock(d.v)); },
  unblock: async d => { await savePrefs({ blocked: (S.prefs.blocked || []).filter(u => u !== d.v) }); await db().del('blocks/' + S.me + '__' + d.v).catch(() => {}); toast('Unblocked'); },
  report: d => { S.menu = null; S.story = null; S.form.repReason = ''; S.form.repDetails = ''; S.form.repBlock = false; S.authErr = ''; S.modal = { type: 'report', uid: d.v, mid: d.m || '' }; render(); },
  repReason: d => { S.form.repReason = d.v; render(); },
  repBlock: () => { S.form.repBlock = !S.form.repBlock; render(); },
  sendReport: async () => {
    const m = S.modal; if (!S.form.repReason) { S.authErr = 'Pick a reason.'; return render(); }
    const msg = m.mid ? (S.msgs[S.conv] || []).find(x => x.id === m.mid) : null;
    await db().add('reports', { reporter: S.me, target: m.uid, reason: S.form.repReason, details: (S.form.repDetails || '').slice(0, 500), convId: m.mid ? S.conv : '', messageId: m.mid || '', excerpt: msg ? msgLabel(msg).slice(0, 300) : '', at: now() });
    S.modal = null; render();
    if (S.form.repBlock) await doBlock(m.uid);
    toast('Thanks — your report was sent.');
  },
  // ---------- moments
  momentNew: () => { S.form.moText = ''; S.form.moImg = ''; S.form.moBg = 0; S.form.moClose = false; S.authErr = ''; S.modal = { type: 'moment' }; S.story = null; render(); },
  moBg: d => { S.form.moBg = +d.v; render(); },
  moNoImg: () => { S.form.moImg = ''; render(); },
  postMoment: async () => {
    const f = S.form; if (!(f.moText || '').trim() && !f.moImg) { S.authErr = 'Add a photo or some text.'; return render(); }
    S.busy = true; render();
    try { bumpStat('moments'); const close = !!f.moClose && closeFriendIds().length > 0; if (f.moClose && !close) { S.busy = false; S.authErr = 'Add some close friends first — tap Edit list.'; return render(); } await db().add('moments', { author: S.me, close, audience: [S.me, ...(close ? closeFriendIds() : friendIds()).filter(u => !blocked(u))], text: (f.moText || '').trim(), image: f.moImg || '', bg: f.moBg || 0, at: now(), expiresAt: now() + 864e5, seen: [] }); S.modal = null; toast('Moment shared with your friends'); }
    catch (e) { S.authErr = e.message; }
    S.busy = false; render();
  },
  storyOpen: d => { const list = S.moments.filter(m => m.author === d.v); if (!list.length) return; const idx = Math.max(0, list.findIndex(m => !(m.seen || []).includes(S.me))); S.story = { author: d.v, idx: d.v === S.me ? 0 : idx }; S.form.storyReply = ''; storyTick(); render(); },
  storyClose: () => { clearTimeout(storyT); S.story = null; render(); },
  storyNext: () => storyStep(1),
  storyPrev: () => storyStep(-1),
  delMoment: d => { clearTimeout(storyT); confirmModal('Delete this moment?', 'Your friends won\'t see it anymore.', 'Delete', async () => { await db().del('moments/' + d.v); S.story = null; render(); }); },
  seenList: d => { clearTimeout(storyT); S.modal = { type: 'seen', id: d.v }; render(); },
  // ---------- app
  appStyle: d => savePrefs({ appStyle: d.v, appBg: '' }),
  deviceNotifs: async () => {
    if (S.prefs.deviceNotifs && Notification.permission === 'granted') { await unregisterPush(); return savePrefs({ deviceNotifs: false }); }
    const r = await Notification.requestPermission();
    if (r === 'granted') {
      savePrefs({ deviceNotifs: true });
      const ok = await registerPush();
      toast(ok ? 'Notifications are on — even when Nexa is closed' : S.be.push ? 'Notifications are on while Nexa is open' : 'Notifications are on while Nexa is open');
    } else { toast('Notifications weren\'t allowed.'); render(); }
  },
  install: async () => { const e = S.installEvt; if (!e) return; e.prompt(); await e.userChoice.catch(() => {}); S.installEvt = null; render(); },
  // notifications
  notif: d => { const n = S.notifs.find(x => x.id === d.v); if (n) openNotif(n); },
  nf: d => { S.form.nf = d.v; render(); },
  markAll: () => S.notifs.filter(n => !n.read).forEach(n => db().update('notifications/' + n.id, { read: true })),
  clearNotifs: () => confirmModal('Clear notifications?', 'All notifications will be removed.', 'Clear', () => Promise.all(S.notifs.map(n => db().del('notifications/' + n.id))))
};
async function doBlock(uid) {
  await savePrefs({ blocked: [...new Set([...(S.prefs.blocked || []), uid])] });
  await db().set('blocks/' + S.me + '__' + uid, { from: S.me, to: uid, at: now() }).catch(() => {});
  await db().del('friendships/' + pairId(S.me, uid)).catch(() => {});
  for (const r of [...S.reqIn.filter(r => r.from === uid), ...S.reqOut.filter(r => r.to === uid)]) await db().del('friendRequests/' + r.id).catch(() => {});
  const c = convOf(S.conv); if (c && c.type === 'dm' && others(c).includes(uid)) S.conv = null;
  toast(`${esc(dname(uid))} is blocked`); render();
}
function stopRec(send) {
  const r = S.rec; if (!r) return;
  clearInterval(r.iv); S.rec = null; render();
  r.mr.onstop = async () => {
    r.stream.getTracks().forEach(t => t.stop()); try { r.ctx && r.ctx.close(); } catch {}
    if (!send) return;
    const dur = (now() - r.start) / 1000;
    if (dur < 0.8) return toast('Hold on a little longer to record.');
    const blob = new Blob(r.chunks, { type: r.mr.mimeType || 'audio/webm' });
    if (blob.size > 700000) return toast('That recording is too long. Keep voice messages under a minute.');
    const src = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
    const n = 40, pk = r.peaks, peaks = Array.from({ length: n }, (_, i) => { const a = pk.slice(Math.floor(i * pk.length / n), Math.floor((i + 1) * pk.length / n) || undefined); return Math.round(a.length ? Math.max(...a) : 15); });
    await sendMessage({ audio: { src: String(src).replace(/;codecs=[^;,]+/, ''), dur: Math.round(dur * 10) / 10, peaks } });
  };
  try { r.mr.stop(); } catch {}
}
function paintVoice() {
  const p = S.playing; if (!p) return;
  const el = document.getElementById('vp-' + p.id); if (!el) return;
  const bars = el.querySelectorAll('.bars i'), k = p.a.duration ? p.a.currentTime / p.a.duration : 0;
  bars.forEach((b, i) => b.classList.toggle('on', i / bars.length < k));
  const t = el.querySelector('.vt'); if (t) t.textContent = fmtDur(p.a.currentTime);
}
let storyT = 0;
function storyTick() {
  clearTimeout(storyT);
  const st = S.story; if (!st) return;
  const list = S.moments.filter(m => m.author === st.author); const mo = list[st.idx];
  if (mo && mo.author !== S.me && !(mo.seen || []).includes(S.me)) db().update('moments/' + mo.id, { seen: ops.union(S.me) }).catch(() => {});
  storyT = setTimeout(() => storyStep(1), 6000);
}
function storyStep(k) {
  const st = S.story; if (!st) return;
  const list = S.moments.filter(m => m.author === st.author);
  const ni = st.idx + k;
  if (ni >= 0 && ni < list.length) { S.story = { ...st, idx: ni }; storyTick(); return render(); }
  if (k > 0) {
    const authors = [...new Set(S.moments.filter(m => m.author !== S.me && isFriend(m.author) && !blocked(m.author)).map(m => m.author))];
    const nextA = authors[authors.indexOf(st.author) + 1];
    if (st.author !== S.me && nextA) { S.story = { author: nextA, idx: 0 }; storyTick(); return render(); }
    clearTimeout(storyT); S.story = null; return render();
  }
  S.story = { ...st, idx: 0 }; storyTick(); render();
}
let gifT = 0;
async function searchGifs() {
  if (!gifKey()) return;
  const q = (S.form.gifQ || '').trim();
  S.gifLoading = true; render();
  try {
    const u = q ? `https://api.klipy.com/v2/search?q=${encodeURIComponent(q)}` : 'https://api.klipy.com/v2/featured?';
    const r = await fetch(`${u}&key=${encodeURIComponent(gifKey())}&client_key=nexa&limit=24&media_filter=tinygif,gif&contentfilter=medium`);
    const j = await r.json();
    S.gifs = (j.results || []).map(x => ({ preview: x.media_formats?.tinygif?.url, url: x.media_formats?.gif?.url || x.media_formats?.tinygif?.url, alt: x.content_description })).filter(g => g.preview && /^https:\/\/[^\s"'()<>]+$/.test(g.url));
  } catch { S.gifs = []; }
  S.gifLoading = false; render();
}
const files = {
  onbAvatar: async f => { S.form.avatar = await compress(f, 360, .85); render(); },
  avatar: async f => { const url = await storeImg(await compress(f, 480, .85), 'avatar'); await db().update('users/' + S.me, { avatar: url }); toast('Profile photo updated'); },
  sendPhoto: async f => { const url = await compress(f, 1280, .8); await sendMessage({ image: url, text: '' }); },
  sendPhotos: async fl => {
    const list = [...fl].filter(f => f.type.startsWith('image/')).slice(0, 6); if (!list.length) return;
    S.attach = false; if (fl.length > 6) toast('Sending the first 6 photos.');
    const q = list.length === 1 ? [1280, .8] : list.length <= 2 ? [1024, .74] : [800, .7];
    const imgs = await Promise.all(list.map(async f => S.be.storage ? storeImg(await compress(f, 2048, .85), 'photos') : compress(f, q[0], q[1])));
    const text = (S.draft[S.conv] || '').trim(); S.draft[S.conv] = ''; saveDraftSoon(); render();
    const sensitive = imgs.every(u => String(u).startsWith('data:')) ? await classifyImages(imgs) : false;
    await sendMessage({ images: imgs, text, ...(sensitive ? { sensitive: true } : {}) });
  },
  moImg: async f => { S.form.moImg = await storeImg(await compress(f, 1080, .8), 'moments'); render(); },
  chatBgImg: async f => { const url = await compress(f, 900, .7); savePrefs({ chatBgs: { ...(S.prefs.chatBgs || {}), [S.conv]: { image: url } } }); },
  appBg: async f => { const url = await compress(f, 1400, .7); savePrefs({ appBg: url }); },
  evImg: async f => { S.form.evImg = await storeImg(await compress(f, 1280, .8), 'events'); render(); }
};
async function submitComposer() {
  const c = convOf(S.conv); if (!c) return;
  const text = (S.draft[c.id] || '').trim();
  if (!text) return;
  S.draft[c.id] = ''; saveDraftSoon();
  if (S.editing) {
    const m = S.editing; S.editing = null; render();
    await db().update(`conversations/${c.id}/messages/${m.id}`, { text, editedAt: now() });
    if (c.last && c.last.at === m.at) db().update('conversations/' + c.id, { 'last.text': text });
    return;
  }
  render();
  await sendMessage({ text });
}

/* ---------------- Nexa AI ---------------- */
const HELP = [
  { k: ['call', 'video', 'phone'], a: 'Open a chat with a friend and tap the **phone** icon for a voice call or the **camera** icon for a video call. They get a ringing pop-up to accept or decline. During the call you can mute, turn your camera off or hang up.', go: null },
  { k: ['@nexa', 'mention'], a: 'Type **@nexa** followed by a question in any chat — like “@nexa what time did we agree on?” — and Nexa AI answers right in the conversation for everyone.', go: null },
  { k: ['game', 'tic', 'rock', 'play'], a: 'In a chat tap **+**, then **Tic-tac-toe** or **Rock, paper, scissors**. Your friend plays right inside the message.', go: null },
  { k: ['disappear', 'self-destruct', 'auto delete'], a: 'In a chat tap **•••** › **Disappearing messages** and choose 24 hours, 7 days or 90 days. New messages delete themselves after that time.', go: null },
  { k: ['forward', 'star', 'save message'], a: 'Hover a message (tap on phone) and use the **forward** arrow to send it to other chats, or the **star** to save it. Find saved ones under the **Starred** filter in Messages.', go: null },
  { k: ['theme', 'colour', 'color of chat'], a: 'Open a chat, tap the **palette** button, then **Create** under Your themes. Pick colours, save, and tap **Share in chat** to send it to friends.', go: null },
  { k: ['birthday', 'banner', 'profile colour'], a: 'Go to **Settings › Profile** to add a banner, pick a profile colour, set what you\'re up to and add your birthday (friends get a reminder).', go: ['Edit profile', 'setSecGo', 'profile'] },
  { k: ['voice', 'record', 'audio', 'mic'], a: 'Open a chat and tap the **mic** button next to Send. Talk (up to a minute), then tap Send — or the bin to cancel. Friends see a waveform they can play.', go: null },
  { k: ['moment', 'story', 'stories'], a: 'On **Home**, tap **Add moment** at the top. Add a photo or some text — your friends can see it for 24 hours. Tap a friend\'s ring to watch theirs and reply.', go: ['Add a moment', 'momentNew', ''] },
  { k: ['poll', 'vote'], a: 'In any chat tap the **+** button, then **Poll**. Add a question and up to 6 options. Everyone taps to vote and results update live.', go: null },
  { k: ['sticker', 'gif', 'emoji'], a: 'Tap the **smiley** button in the message bar to add emoji, send a Nexa sticker, or search GIFs.', go: null },
  { k: ['block', 'report', 'harass', 'spam'], a: 'Open the chat or their profile, tap **•••**, then **Block** or **Report**. Blocked people can\'t message you, send requests or see your moments. Manage blocks in Settings › Privacy.', go: ['Privacy settings', 'setSecGo', 'privacy'] },
  { k: ['mute', 'archive', 'pin chat'], a: 'In a chat tap **•••** to mute notifications, pin it to the top of your list, or archive it. Archived chats live under the Archived filter in Messages.', go: null },
  { k: ['password', 'forgot', 'reset'], a: 'On the log-in screen tap **Forgot password?** and enter your email — we\'ll send you a reset link.', go: null },
  { k: ['install', 'app', 'home screen', 'notification'], a: 'Settings › Notifications lets you turn on alerts for this device and install Nexa as an app. On iPhone: tap Share, then “Add to Home Screen”.', go: ['Notification settings', 'setSecGo', 'notifications'] },
  { k: ['rsvp', 'maybe', 'invite link', 'event chat'], a: 'Open an event to answer **Going**, **Maybe** or **Can\'t go**. Everyone going joins the event chat automatically. Hosts can tap **Invite link** to share it with anyone — even people not on Nexa yet.', go: ['Events', 'go', 'events'] },
  { k: ['add a friend', 'add friend', 'friend request', 'find people', 'find friend'], a: 'To add a friend:\n1. Open **People**.\n2. Search their name or @handle.\n3. Tap **Add friend**.\nWhen they accept, you both get a notification and can message right away.', go: ['People', 'go', 'people'] },
  { k: ['background', 'wallpaper'], a: 'Open a chat and tap the **palette** button in its top bar. Pick Default Nexa, Midnight, Blue Glow, Purple, Sunset, Clouds or Minimal — or tap **+** to use your own photo. It only changes that chat, and only you see it.\nFor every chat at once: Settings › Chats › Default chat background.', go: ['Chat settings', 'setSecGo', 'chats'] },
  { k: ['event', 'plan', 'invite'], a: 'Go to **Events** and tap **Create event**. Add a name, description, date, time and an optional cover. Then choose who can see and join:\n• All friends — every friend is invited\n• Invite only — you pick people\n• Public — anyone on Nexa\nEveryone invited gets a notification.', go: ['Create event', 'newEvent', ''] },
  { k: ['profile picture', 'profile photo', 'avatar', 'picture', 'photo of me'], a: 'Go to **Settings › Profile** and tap **Upload photo**. You can also change your display name, @username and bio there.', go: ['Edit profile', 'setSecGo', 'profile'] },
  { k: ['nickname'], a: 'Open a friend\'s profile and choose **Set nickname**. Nicknames are private — only you see them. Your friend keeps seeing their own public name.', go: null },
  { k: ['group'], a: 'In **Messages**, tap the group icon (or press Ctrl K → "New group chat"). Name it and pick two or more friends. You\'re the owner, so you can rename it, add or remove members.', go: ['New group', 'newGroup', ''] },
  { k: ['text size', 'font', 'bigger', 'smaller'], a: 'Settings › Appearance › Text size: Small, Medium or Large. You can also change it from any chat\'s palette button.', go: ['Appearance', 'setSecGo', 'appearance'] },
  { k: ['accent', 'color', 'dark', 'bright', 'light mode', 'theme'], a: 'Settings › Appearance lets you switch Dark / Bright mode, pick an accent color (or any custom color) and set your own app background image.', go: ['Appearance', 'setSecGo', 'appearance'] },
  { k: ['shortcut', 'keyboard', 'ctrl'], a: '• Ctrl/⌘ K — search & jump\n• Ctrl/⌘ J — Nexa AI\n• Alt 1–6 — switch pages\n• Enter — send, Shift+Enter — new line\n• ↑ in an empty message — edit your last one\n• Esc — close or cancel', go: ['All shortcuts', 'setSecGo', 'shortcuts'] },
  { k: ['read receipt', 'seen', 'typing'], a: 'You\'ll see **Read** under your last message once they\'ve opened it, and animated dots while they type. Turn yours off in Settings › Chats.', go: ['Chat settings', 'setSecGo', 'chats'] },
  { k: ['delete', 'remove'], a: 'Hover (or tap) your message to edit or delete it. To remove a whole chat for you, open ••• in the chat header › Delete conversation. To remove a friend, open ••• next to them in People.', go: null },
  { k: ['status', 'online', 'away', 'busy'], a: 'Set Online, Away or Busy on your profile. To appear offline, turn off Settings › Privacy › Show my online status.', go: ['My profile', 'profile', 'me'] },
  { k: ['reply', 'react', 'pin', 'edit'], a: 'Hover a message (tap on phone) for quick tools: reactions, reply, pin and — for your own — edit and delete. Pinned messages stay at the top of the chat.', go: null }
];
async function askAi(q) {
  q = (q || '').trim(); if (!q) return;
  S.ai.msgs.push({ me: true, text: q }); S.ai.typing = true; S.form.aiQ = ''; render();
  const s = q.toLowerCase();
  const hit = HELP.find(h => h.k.some(k => s.includes(k)));
  let aiOut = '';
  if (S.be.ai) { try { const hist = S.ai.msgs.slice(-7, -1).map(m => (m.me ? 'User: ' : 'Nexa AI: ') + (m.text || (m.html || '').replace(/<[^>]+>/g, ' '))).join('\n'); aiOut = await aiText((hist ? 'Conversation so far:\n' + hist + '\n\n' : '') + 'User: ' + q); } catch {} }
  setTimeout(() => {
    const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    let html = aiOut ? md(aiOut) : hit ? md(hit.a) : 'I can help with friends, messages, voice notes, group chats, moments, chat backgrounds, events, your profile and settings. Try one of the suggestions below.';
    if (hit?.go) html += `<div style="margin-top:10px"><button class="btn sm pri" data-a="${hit.go[1]}" data-v="${hit.go[2] === 'me' ? S.me : hit.go[2]}">${esc(hit.go[0])} →</button></div>`;
    S.ai.msgs.push({ me: false, html }); S.ai.typing = false; render();
    setTimeout(() => { const st = $('#aiStream'); if (st) st.scrollTop = st.scrollHeight; }, 30);
  }, aiOut ? 0 : 650);
}

/* =====================================================================
   EVENTS (DOM)
   ===================================================================== */
function setModel(path, val) { const parts = path.split('.'); if (parts[0] === 'draft') { S.draft[S.conv] = val; return; } let o = S; for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]]; o[parts[parts.length - 1]] = val; }
let peopleT = 0;
document.addEventListener('input', e => {
  const el = e.target, m = el.dataset?.model; if (!m) return;
  setModel(m, el.value);
  if (m === 'draft') { autosize(); onTyping(); saveDraftSoon(); return; }
  if (m === 'peopleQ') { clearTimeout(peopleT); peopleT = setTimeout(searchPeople, 220); render(); return; }
  if (m === 'palQ') S.palSel = 0;
  if (m === 'convQ') { clearTimeout(allT); allT = setTimeout(() => searchAll(S.convQ), 350); }
  if (m === 'form.gifQ') { clearTimeout(gifT); gifT = setTimeout(searchGifs, 350); return; }
  if (['convQ', 'find', 'palQ', 'form.pickQ'].includes(m) || el.dataset.rerender) render();
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset?.file && el.files?.[0]) { const multi = el.dataset.file === 'sendPhotos' || el.dataset.file === 'albumPhotos'; const f = multi ? [...el.files] : el.files[0]; el.value = ''; try { await files[el.dataset.file](f); } catch (err) { toast(esc(err.message)); } }
  if (el.dataset?.change === 'customAccent') savePrefs({ customAccent: el.value });
  if (/^thC[123]$/.test(el.dataset?.change || '')) { S.form[el.dataset.change] = el.value; render(); }
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || !$('#app').contains(el)) return;
  if (el.dataset.self && e.target !== el) return;
  const fn = actions[el.dataset.a]; if (!fn) return;
  if (el.tagName === 'A') return;
  e.preventDefault();
  if (el.dataset.pal) S.palette = false;
  Promise.resolve(fn(el.dataset, el, e)).catch(err => toast(esc(err.message || 'Something went wrong')));
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-submit]'); if (!f) return;
  e.preventDefault();
  if (f.dataset.submit === 'ai') return askAi(S.form.aiQ);
  if (f.dataset.submit === 'unlock') { const h = await pinHash(S.form.pinIn || ''); if (h === lsGet(pinKey(), null)) { S.locked = false; S.authErr = ''; S.form.pinIn = ''; } else { S.authErr = 'Wrong PIN.'; S.form.pinIn = ''; } return render(); }
  if (f.dataset.submit === 'storyReply') {
    const t = (S.form.storyReply || '').trim(); const st = S.story; if (!t || !st) return;
    const mo = S.moments.filter(m => m.author === st.author)[st.idx];
    if (!isFriend(st.author)) return toast('You can reply to friends\' moments.');
    const id = await ensureDM(st.author); S.form.storyReply = '';
    await sendMessage({ text: t, replyTo: { id: mo.id, from: st.author, text: 'Moment: ' + (mo.text || 'Photo') } }, id);
    toast('Reply sent'); storyTick(); return render();
  }
  if (f.dataset.submit === 'qcode') return redeemCode(S.form.qcode);
  if (f.dataset.submit === 'auth') {
    const fm = S.form; S.authErr = '';
    try {
      if (S.authMode === 'signup') {
        const name = (fm.name || '').trim(), handle = (fm.handle || '').trim().toLowerCase().replace(/^@/, '');
        if (!name) throw new Error('Add your display name.');
        if (!/^[a-z0-9_.]{3,24}$/.test(handle)) throw new Error('Usernames are 3–24 letters, numbers, dots or underscores.');
        S.busy = true; render();
        S.pendingOnboard = true;
        await S.be.auth.signUp(fm.email || '', fm.pw || '');
      } else { S.busy = true; render(); await S.be.auth.signIn(fm.email || '', fm.pw || ''); }
    } catch (err) { S.authErr = err.message; S.pendingOnboard = false; }
    S.busy = false; render();
  }
});
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  const inField = e.target.matches?.('input,textarea,[contenteditable]');
  if (S.view !== 'app') return;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); S.palette ? actions.closePalette() : actions.palette(); return; }
  if (mod && e.key.toLowerCase() === 'j') { e.preventDefault(); S.ai.open ? actions.aiClose() : actions.aiOpen(); return; }
  if (mod && e.key.toLowerCase() === 'f' && S.page === 'messages' && S.conv) { e.preventDefault(); S.findOpen = true; S.bgPop = false; render(); setTimeout(() => $('#findQ')?.focus(), 20); return; }
  if (e.altKey && /^[1-6]$/.test(e.key)) { e.preventDefault(); go(PAGES[+e.key - 1]); return; }
  if (e.key === 'Escape' && board) { closeBoard(); return; }
  if (e.key === 'Escape') {
    if (S.story) { clearTimeout(storyT); S.story = null; return render(); }
    if (S.rec) { stopRec(false); return; }
    if (S.picker || S.attach) { S.picker = false; S.attach = false; return render(); }
    if (S.lightbox) S.lightbox = ''; else if (S.menu) S.menu = null; else if (S.palette) S.palette = false; else if (S.modal) S.modal = null;
    else if (S.replyTo || S.editing) { if (S.editing) S.draft[S.conv] = ''; S.replyTo = null; S.editing = null; }
    else if (S.bgPop) S.bgPop = false; else if (S.findOpen) { S.findOpen = false; S.find = ''; } else if (S.ai.open) S.ai.open = false;
    render(); return;
  }
  if (S.palette && e.target.id === 'palQ') {
    const n = palItems().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); S.palSel = (S.palSel + 1) % Math.max(1, n); render(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); S.palSel = (S.palSel - 1 + n) % Math.max(1, n); render(); }
    if (e.key === 'Enter') { e.preventDefault(); $('.pitem.sel')?.click(); }
    return;
  }
  if (e.target.id === 'composer') {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submitComposer(); }
    if (e.key === 'ArrowUp' && !e.target.value) { const mine = [...(S.msgs[S.conv] || [])].reverse().find(m => m.from === S.me && !m.deleted && !m.image); if (mine) { e.preventDefault(); actions.edit({ v: mine.id }); } }
    return;
  }
  if (e.key === '/' && !inField) { const t = $('#peopleQ') || $('#convQ'); e.preventDefault(); t ? t.focus() : actions.palette(); }
});
document.addEventListener('pointermove', e => {
  const c = e.target.closest?.('.card.react'); if (!c) return;
  const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });
window.addEventListener('resize', () => render());

function everyone() {
  return S.directory.filter(u => !blocked(u.id) && u.id !== S.me).sort((a, b) => ((presence(b.id) !== 'offline') - (presence(a.id) !== 'offline')) || (a.name || '').localeCompare(b.name || ''));
}
async function searchPeople() {
  const q = S.peopleQ.trim().toLowerCase().replace(/^@/, '');
  if (!q) { S.peopleRes = []; return render(); }
  const m = {};
  // Look up by @handle or name (starts with). Nexa never lists everyone, so you need to know who you're looking for.
  if (q.length < 2) { S.peopleRes = []; S.searching = false; return render(); }
  S.searching = true; render();
  try {
    const [a, b] = await Promise.all([db().query('users', [['handleLower', 'prefix', q]], { limit: 20 }), db().query('users', [['nameLower', 'prefix', q]], { limit: 20 })]);
    [...a, ...b].forEach(u => { if (u.discoverable !== false) m[u.id] = u; });
  } catch {}
  S.searching = false;
  if (q !== S.peopleQ.trim().toLowerCase().replace(/^@/, '')) return; // a newer search is running
  Object.keys(m).forEach(id => { if (id === S.me || m[id].deleted) delete m[id]; });
  // friends by nickname
  friendIds().forEach(u => { if (nickOf(u).toLowerCase().includes(q) && U(u)) m[u] = { id: u, ...U(u) }; });
  S.peopleRes = Object.values(m).sort((x, y) => ((x.handleLower === q) ? -1 : 0) - ((y.handleLower === q) ? -1 : 0)).slice(0, 40);
  S.peopleRes.forEach(u => { if (!S.users[u.id]) S.users[u.id] = u; watchUser(u.id); });
  render();
}

/* =====================================================================
   BOOT
   ===================================================================== */
async function checkInvite() {
  const code = lsGet('nexa.invite', null); if (!code) return;
  lsSet('nexa.invite', null);
  const inv = await db().get('eventInvites/' + code).catch(() => null);
  if (inv) { inv.code = code; watchUser(inv.host); if (allEvents().some(e => e.id === inv.eventId && going(e))) { S.page = 'events'; S.modal = { type: 'event', id: inv.eventId }; return render(); } }
  S.modal = { type: 'invite', inv }; render();
}
async function boot() {
  try { const q0 = new URLSearchParams(location.search); const ch = q0.get('chat'), pg = q0.get('page'); if (ch && /^[\w-]{3,80}$/.test(ch)) lsSet('nexa.openChat', ch); if (pg && PAGES.includes(pg)) lsSet('nexa.openPage', pg); const hm = location.pathname.match(/\/@([a-z0-9_.]{2,24})\/?$/i) || [null, q0.get('add')]; if (hm[1] && /^[a-z0-9_.]{2,24}$/i.test(hm[1])) { lsSet('nexa.addHandle', hm[1].toLowerCase()); history.replaceState(null, '', location.pathname.replace(/@[^/]*\/?$/, '')); } const rp = q0.get('reply'), cmc = q0.get('community'), ql = q0.get('login'); if (ql && /^[a-z0-9-]{6,12}$/i.test(ql)) { sessionStorage.setItem('nexa.qlogin', ql); history.replaceState(null, '', location.pathname); } if (rp && ch) lsSet('nexa.reply', { chat: ch, text: rp.slice(0, 2000) }); if (cmc && /^[a-z0-9]{4,40}$/i.test(cmc)) lsSet('nexa.community', cmc); if (ch || pg || cmc) history.replaceState(null, '', location.pathname); } catch {}
  navigator.serviceWorker?.addEventListener?.('message', e => { const d = e.data || {}; if (d.type === 'open' && S.view === 'app') { if (d.chat) openConv(d.chat); else if (d.page) go(d.page); } if (d.type === 'reply' && d.chat && d.text) quickReply(d.chat, d.text); });
  try { const q = new URLSearchParams(location.search); const code = q.get('invite'), jc = q.get('join'); if (code && /^[a-z0-9]{4,40}$/i.test(code)) lsSet('nexa.invite', code); if (jc && /^[a-z0-9]{4,40}$/i.test(jc)) lsSet('nexa.join', jc); if (code || jc) history.replaceState(null, '', location.pathname); } catch {}
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; render(); });
  try { if ('serviceWorker' in navigator && location.protocol === 'https:' && CONFIG.firebase?.apiKey && !String(CONFIG.firebase.apiKey).startsWith('YOUR')) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch {}
  const look = lsGet('nexa.look', null);
  if (look) { Object.assign(S.prefs, look); applyTheme(); }
  const splash = document.createElement('div');
  splash.className = 'splash';
  splash.innerHTML = `<div class="splash-mark">${logo(112, false, 'build')}</div><div class="word">NEXA</div><div class="tagline">Connect · Chat · Share · Together</div>`;
  document.body.appendChild(splash);
  setTimeout(() => splash.remove(), 2700);
  try { S.be = await createBackend(CONFIG); }
  catch (e) { $('#app').innerHTML = `<div class="onb"><div class="card glass col" style="text-align:center;align-items:center">${logo(56)}<h2 class="h1" style="font-size:22px">Can't reach Nexa right now</h2><p class="mute">Check your internet connection and try again.</p><button class="btn pri" onclick="location.reload()">Try again</button></div></div>`; return; }
  S.be.auth.onChange(u => {
    stopAll();
    S.me = u?.uid || null; S.email = u?.email || ''; S.devChecked = false; S.pushChecked = false; S.pushOn = false; S.locked = false; S.tour = null; closeBoard(); S.users = {}; S.convs = []; S.msgs = {}; S.friends = []; S.reqIn = []; S.reqOut = []; S.evA = []; S.evB = []; S.notifs = [];
    S.conv = null; S.modal = null; S.menu = null; S.palette = false; S.ai.open = false; S.page = 'home'; S.profile = undefined;
    if (!u) { S.view = 'auth'; S.authMode = 'login'; S.form = {}; S.authErr = ''; const qlc = sessionStorage.getItem('nexa.qlogin'); if (qlc) { sessionStorage.removeItem('nexa.qlogin'); S.authMode = 'code'; S.form.qcode = qlc; setTimeout(() => redeemCode(qlc), 50); } S.prefs = { ...DEFAULT_PREFS, ...(lsGet('nexa.look', {}) || {}) }; applyTheme(); render(); return; }
    S.form.pw = '';
    if (S.pendingOnboard) { S.view = 'onboard'; S.onbStep = 0; S.pendingOnboard = false; }
    else S.view = 'loading';
    startData();
    render();
  });
}
boot();

/* =====================================================================
   v3 — calls, moderation, games, search, forwarding, themes, birthdays
   ===================================================================== */

/* ---------------- storage helper (Firebase Storage when enabled) ---------------- */
async function storeImg(dataUrl, kind) {
  if (!S.be.storage || !dataUrl) return dataUrl;
  try { return await S.be.storage.upload(`u/${S.me}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`, dataUrl); }
  catch (e) { console.warn('storage upload failed, keeping inline image', e); return dataUrl; }
}

/* ---------------- @nexa in chats ---------------- */
async function nexaInChat(c, text) {
  const q = text.replace(/@nexa\b/ig, '').trim();
  let out = '';
  if (S.be.ai) {
    try { out = await aiText(`You were mentioned as @nexa in a ${c.type === 'dm' ? 'direct' : 'group'} chat on Nexa. Reply helpfully and briefly (under 90 words) to the latest request, using the chat for context. Plain text, no markdown.\n\nChat:\n${convTranscript(c, 30)}\n\nRequest from ${S.profile.name}: ${q || '(no question, just say hi and offer help)'}`); } catch {}
  }
  if (!out) {
    const hit = HELP.find(h => h.k.some(k => q.toLowerCase().includes(k)));
    out = hit ? hit.a.replace(/\*\*/g, '') : 'Hi! I\'m Nexa AI. Mention me with a question, like “@nexa how do polls work?” or “@nexa summarize”.';
  }
  await sendMessage({ text: out.slice(0, 1500), bot: true }, c.id);
}

/* ---------------- games ---------------- */
const TTT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function tttWinner(b) { for (const [a, x, y] of TTT_LINES) if (b[a] !== '_' && b[a] === b[x] && b[a] === b[y]) return { p: b[a], line: [a, x, y] }; return b.includes('_') ? null : { p: 'draw', line: [] }; }
const RPS = { r: ['Rock', 'M7 12V7a1.5 1.5 0 0 1 3 0v4M10 11V5.5a1.5 1.5 0 0 1 3 0V11M13 11V6.5a1.5 1.5 0 0 1 3 0V12M16 12v-2a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2-3.5a1.5 1.5 0 0 1 2.5-1.6L7 14'], p: ['Paper', 'M6 3h9l4 4v14H6zM14 3v5h5'], s: ['Scissors', 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12'] };
const rpsIc = k => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${RPS[k][1]}"/></svg>`;
function vGame(m) {
  const g = m.game;
  if (['c4', 'word', 'trivia'].includes(g.t)) return vGame4(m);
  if (g.t === 'ttt') {
    const w = tttWinner(g.b), myMark = g.x === S.me ? 'X' : g.o === S.me ? 'O' : null;
    const turnUid = g.turn === 'X' ? g.x : g.o;
    const status = w ? (w.p === 'draw' ? 'It\'s a draw!' : `${w.p === 'X' ? dname(g.x) : dname(g.o)} wins!`) : !g.o ? (g.x === S.me ? 'Waiting for someone to join…' : 'Tap a square to join as O') : turnUid === S.me ? 'Your turn' : `${dname(turnUid).split(' ')[0]}'s turn`;
    return `<div class="bub game"><div class="row spread" style="gap:10px"><b class="disp">Tic-tac-toe</b><span class="small" style="opacity:.8">${esc(dname(g.x).split(' ')[0])} (X) vs ${g.o ? esc(dname(g.o).split(' ')[0]) + ' (O)' : '…'}</span></div>
      <div class="ttt">${[...g.b].map((v, i) => `<button class="${w && w.line.includes(i) ? 'win' : ''}" aria-label="Square ${i + 1}${v !== '_' ? ' ' + v : ''}" data-a="tttMove" data-v="${m.id}" data-i="${i}" ${v !== '_' || w ? 'disabled' : ''}>${v === '_' ? '' : v}</button>`).join('')}</div>
      <div class="row spread"><span class="small" style="font-weight:700">${esc(status)}</span>${w ? `<button class="btn sm" data-a="newGame" data-v="ttt">Play again</button>` : myMark ? `<span class="small" style="opacity:.75">You're ${myMark}</span>` : ''}</div></div>`;
  }
  if (g.t === 'rps') {
    const ps = Object.entries(g.p || {}), done = ps.length >= 2, mine = (g.p || {})[S.me];
    let res = '';
    if (done) { const [[ua, a], [ub, b]] = ps; const beats = { r: 's', p: 'r', s: 'p' }; res = a === b ? 'Draw!' : beats[a] === b ? `${dname(ua).split(' ')[0]} wins!` : `${dname(ub).split(' ')[0]} wins!`; }
    return `<div class="bub game"><b class="disp">Rock, paper, scissors</b>
      ${done ? `<div class="rpsres">${ps.map(([u, k]) => `<div class="col" style="align-items:center;gap:4px">${av(u, 32)}<span class="rpsbig">${rpsIc(k)}</span><span class="small">${esc(RPS[k][0])}</span></div>`).join('<b class="disp" style="align-self:center">vs</b>')}</div><div class="row spread"><b>${esc(res)}</b><button class="btn sm" data-a="newGame" data-v="rps">Rematch</button></div>`
      : `<div class="row" style="gap:8px;margin:10px 0">${Object.keys(RPS).map(k => `<button class="rpsbtn ${mine === k ? 'on' : ''}" aria-label="${RPS[k][0]}" data-a="rpsPick" data-v="${m.id}" data-k="${k}" ${mine ? 'disabled' : ''}>${rpsIc(k)}<span>${RPS[k][0]}</span></button>`).join('')}</div>
        <span class="small" style="opacity:.8">${mine ? 'Locked in! Waiting for the other player…' : ps.length ? `${esc(dname(ps[0][0]).split(' ')[0])} has picked. Your move!` : 'Pick one — choices stay hidden until both have played.'}</span>`}</div>`;
  }
  return '';
}

/* ---------------- moderation ---------------- */
function watchAdmin() {
  unsubs.base.push(db().listen('reports', [], r => { S.reports = r; r.forEach(x => { watchUser(x.target); watchUser(x.reporter); }); render(); }, { order: ['at', 'desc'], limit: 200 }));
  unsubs.base.push(db().listen('bans', [], r => { S.bans = r; r.forEach(b => watchUser(b.id)); render(); }));
}
function vAdmin() {
  if (!S.isAdmin) return `<div class="empty">This page is only for Nexa moderators.</div>`;
  const tab = S.form.admTab || 'reports';
  const list = tab === 'reports' ? (S.reports.length ? S.reports.map(r => `<div class="report${A('rp' + r.id)}">
      <div class="row" style="align-items:flex-start">${av(r.target, 44)}<div class="grow"><div class="row" style="gap:8px;flex-wrap:wrap"><b>${esc(U(r.target)?.name || 'Unknown user')}</b><span class="mute small">@${esc(U(r.target)?.handle || '')}</span>${S.bans.some(b => b.id === r.target) ? '<span class="nick" style="background:rgba(255,77,109,.2);color:#ff7d93">Banned</span>' : ''}</div>
        <div class="small" style="margin-top:4px"><b style="color:var(--warm)">${esc(r.reason)}</b> · reported by ${esc(U(r.reporter)?.name || 'someone')} · ${fmtWhen(r.at)}</div>
        ${r.details ? `<div class="small mute" style="margin-top:4px">“${esc(r.details)}”</div>` : ''}${r.excerpt ? `<div class="quote" style="margin-top:8px;background:rgba(255,255,255,.04)">${esc(r.excerpt)}</div>` : ''}</div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn sm" data-a="profile" data-v="${r.target}">Profile</button>
        <button class="btn sm" data-a="admWarn" data-v="${r.target}">Warn</button>
        ${r.messageId && r.convId ? `<button class="btn sm" data-a="admDelMsg" data-v="${r.id}">Delete message</button>` : ''}
        ${S.bans.some(b => b.id === r.target) ? '' : `<button class="btn sm danger" data-a="admBan" data-v="${r.target}" data-r="${esc(r.reason)}">Ban</button>`}
        <button class="btn sm pri" data-a="admDismiss" data-v="${r.id}">Resolve</button></div></div>`).join('') : `<div class="empty"><div class="ring">${ic('shield', 24)}</div><b>No open reports</b><span>When someone reports a person or message, it shows up here.</span></div>`)
    : (S.bans.length ? S.bans.map(b => `<div class="person">${av(b.id, 44)}<span class="grow"><b style="display:block">${esc(U(b.id)?.name || 'Unknown user')}</b><span class="mute small">Banned ${fmtWhen(b.at)}${b.reason ? ' · ' + esc(b.reason) : ''}</span></span><button class="btn sm" data-a="admUnban" data-v="${b.id}">Unban</button></div>`).join('') : `<div class="empty"><b>No one is banned</b></div>`);
  return `<div class="panel glass card" style="height:100%;padding:24px;gap:14px">
    <div class="row spread"><div><h1 class="h1 hide-m">Moderation</h1><div class="mute small">Only you can see this page.</div></div></div>
    <div class="tabs"><button class="tab ${tab === 'reports' ? 'on' : ''}" data-a="admTab" data-v="reports">Reports${S.reports.length ? ` <span class="badge">${S.reports.length}</span>` : ''}</button><button class="tab ${tab === 'bans' ? 'on' : ''}" data-a="admTab" data-v="bans">Banned · ${S.bans.length}</button></div>
    <div class="col scroll" style="gap:10px;flex:1" data-keep-scroll="adm">${list}</div></div>`;
}
function vBanned() {
  return `<div class="onb"><div class="card glass col${A('ban')}" style="text-align:center;align-items:center">${logo(56)}<h2 class="h1" style="font-size:22px">Your account is suspended</h2><p class="mute" style="line-height:1.6">A Nexa moderator suspended this account for breaking the community rules${S.banned?.reason ? ` (${esc(S.banned.reason)})` : ''}. You can't send messages or friend requests right now.</p><button class="btn" data-a="logoutNow">${ic('logout', 18)} Log out</button></div></div>`;
}

/* ---------------- calls (WebRTC, signalled through Firestore) ---------------- */
// Relay (TURN) servers: fetched from the Nexa server (netlify/functions/turn) so calls connect on phone networks
// and strict routers, where a direct connection is impossible. Falls back to STUN only.
let iceCache = lsGet('nexa.ice', null);
const ICE = () => ({ iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, ...(CONFIG.turn || []), ...(iceCache && iceCache.exp > now() ? iceCache.servers : [])] });
const hasRelay = () => !!((CONFIG.turn || []).length || (iceCache && iceCache.exp > now() && iceCache.servers.length));
let iceLoading = null;
function loadIce() {
  if (iceCache && iceCache.exp > now() + 3600e3) return Promise.resolve();
  if (!S.be || S.be.kind === 'local') return Promise.resolve();
  return iceLoading || (iceLoading = (async () => {
    try {
      const tok = await S.be.auth.idToken(); if (!tok) return;
      const r = await fetch(CONFIG.turnEndpoint || '/.netlify/functions/turn', { headers: { authorization: 'Bearer ' + tok }, signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined });
      const j = await r.json().catch(() => ({}));
      if (Array.isArray(j.iceServers)) { iceCache = { servers: j.iceServers, exp: now() + (j.iceServers.length ? (j.ttl || 43200) * 1000 - 60e3 : 600e3) }; lsSet('nexa.ice', iceCache); }
    } catch {} finally { iceLoading = null; }
  })());
}
const cantCall = c => dmBlocked(c) || !!U(others(c)[0])?.deleted;
let ringIv = 0, callTick = 0;
function ring(on) { clearInterval(ringIv); if (on) { sound('ping'); ringIv = setInterval(() => sound('ping'), 1800); } }
function onIncomingCalls(r) {
  const fresh = r.filter(c => now() - c.at < 45000 && !blocked(c.from)).sort((a, b) => b.at - a.at);
  if (!fresh.length) { if (S.incoming) { S.incoming = null; ring(false); paintCall(); } return; }
  if (S.call) { fresh.forEach(c => { if (c.id !== S.call.id) db().update('calls/' + c.id, { status: 'busy' }).catch(() => {}); }); return; }
  if (S.incoming?.id === fresh[0].id) return;
  S.incoming = fresh[0]; watchUser(S.incoming.from); ring(true);
  deviceNotify(`${dname(S.incoming.from)} is calling`, S.incoming.kind === 'video' ? 'Video call' : 'Voice call');
  paintCall();
}
function newPC(callId, mine, theirs) {
  const pc = new RTCPeerConnection(ICE());
  const remote = new MediaStream(), pending = [], outbox = [];
  const P = { pc, remote, pending, ready: false };
  pc.ontrack = e => { (e.streams[0] ? e.streams[0].getTracks() : [e.track]).forEach(t => { if (!remote.getTracks().includes(t)) remote.addTrack(t); }); attachMedia(true); };
  pc.onicecandidate = e => { if (!e.candidate) return; const c = e.candidate.toJSON(); P.ready ? db().add(`calls/${callId}/${mine}`, c).catch(() => {}) : outbox.push(c); };
  P.flushOut = () => { P.ready = true; outbox.splice(0).forEach(c => db().add(`calls/${callId}/${mine}`, c).catch(() => {})); };
  P.flushIn = () => pending.splice(0).forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
  pc.onconnectionstatechange = () => {
    if (!S.call || S.call.pc !== pc) return;
    S.call.state = pc.connectionState;
    if (pc.connectionState === 'connected' && !S.call.startedAt) { S.call.startedAt = now(); clearTimeout(S.call.timeout); }
    if (pc.connectionState === 'failed') { toast(hasRelay() ? 'The call couldn\'t connect. Check your internet and try again.' : 'The call couldn\'t connect — your networks block direct calls. Nexa needs its call relay turned on (see README › Calls).'); hangUp(); }
    paintCall();
  };
  const seen = new Set();
  P.unC = db().listen(`calls/${callId}/${theirs}`, [], r => r.forEach(cd => {
    if (seen.has(cd.id)) return; seen.add(cd.id);
    const { id, ...cand } = cd;
    pc.remoteDescription ? pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {}) : pending.push(cand);
  }));
  return P;
}
async function getMedia(kind) {
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: kind === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false });
}
async function startCall(kind) {
  const c = convOf(S.conv); if (!c || c.type !== 'dm' || cantCall(c)) return;
  if (S.call) return toast('You\'re already on a call.');
  if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) return toast('Calls aren\'t supported in this browser.');
  let local; try { [local] = await Promise.all([getMedia(kind), loadIce()]); } catch { return toast(kind === 'video' ? 'Camera or microphone access was blocked.' : 'Microphone access was blocked.'); }
  const to = others(c)[0], id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const P = newPC(id, 'fromC', 'toC');
  local.getTracks().forEach(t => P.pc.addTrack(t, local));
  S.call = { id, kind, peer: to, conv: c.id, role: 'caller', local, ...P, state: 'ringing', muted: false, camOff: false };
  paintCall();
  const offer = await P.pc.createOffer(); await P.pc.setLocalDescription(offer);
  await db().set('calls/' + id, { from: S.me, to, conv: c.id, kind, status: 'ringing', at: now(), offer: { type: offer.type, sdp: offer.sdp } });
  P.flushOut();
  pushNotify('call', { id });
  S.call.unDoc = db().listenDoc('calls/' + id, d => onCallDoc(d));
  S.call.timeout = setTimeout(() => { if (S.call?.id === id && !S.call.startedAt) { db().update('calls/' + id, { status: 'missed' }).catch(() => {}); if (S.call.state === 'connecting') { toast('The call couldn\'t connect. Try again in a moment.'); db().update('calls/' + id, { status: 'ended' }).catch(() => {}); return endLocal(); } sendMessage({ system: true, text: `Missed ${kind === 'video' ? 'video' : 'voice'} call` }, c.id); toast('No answer'); endLocal(); } }, 40000);
}
async function onCallDoc(d) {
  const call = S.call; if (!call) return;
  if (!d) return endLocal();
  if (call.role === 'caller' && d.answer && !call.pc.currentRemoteDescription) {
    try { await call.pc.setRemoteDescription(new RTCSessionDescription(d.answer)); call.flushIn(); call.state = 'connecting'; paintCall(); } catch {}
  }
  if (['ended', 'declined', 'missed', 'busy'].includes(d.status)) {
    if (call.role === 'caller' && d.status === 'declined') toast(`${esc(dname(call.peer))} declined the call`);
    if (call.role === 'caller' && d.status === 'busy') toast(`${esc(dname(call.peer))} is on another call`);
    endLocal();
  }
}
async function acceptCall() {
  const inc = S.incoming; if (!inc) return;
  ring(false); S.incoming = null; paintCall();
  let local; try { [local] = await Promise.all([getMedia(inc.kind), loadIce()]); } catch { toast('Microphone access was blocked.'); db().update('calls/' + inc.id, { status: 'declined' }).catch(() => {}); return; }
  const d = await db().get('calls/' + inc.id);
  if (!d || !d.offer || d.status !== 'ringing') { local.getTracks().forEach(t => t.stop()); return toast('That call has ended.'); }
  const P = newPC(inc.id, 'toC', 'fromC');
  local.getTracks().forEach(t => P.pc.addTrack(t, local));
  S.call = { id: inc.id, kind: inc.kind, peer: inc.from, conv: inc.conv, role: 'callee', local, ...P, state: 'connecting', muted: false, camOff: false };
  paintCall();
  await P.pc.setRemoteDescription(new RTCSessionDescription(d.offer)); P.flushIn();
  const ans = await P.pc.createAnswer(); await P.pc.setLocalDescription(ans);
  await db().update('calls/' + inc.id, { answer: { type: ans.type, sdp: ans.sdp }, status: 'accepted', acceptedAt: now() });
  P.flushOut();
  S.call.unDoc = db().listenDoc('calls/' + inc.id, x => onCallDoc(x));
}
function declineCall() { const inc = S.incoming; if (!inc) return; ring(false); S.incoming = null; paintCall(); db().update('calls/' + inc.id, { status: 'declined' }).catch(() => {}); }
async function hangUp() {
  const call = S.call; if (!call) return;
  const dur = call.startedAt ? (now() - call.startedAt) / 1000 : 0;
  await db().update('calls/' + call.id, { status: 'ended', endedAt: now() }).catch(() => {});
  if (dur > 0) sendMessage({ system: true, text: `${call.kind === 'video' ? 'Video' : 'Voice'} call · ${fmtDur(dur)}` }, call.conv);
  else if (call.role === 'caller') sendMessage({ system: true, text: `Cancelled ${call.kind === 'video' ? 'video' : 'voice'} call` }, call.conv);
  endLocal();
}
function endLocal() {
  const call = S.call; if (!call) return;
  S.call = null;
  clearTimeout(call.timeout);
  try { call.local.getTracks().forEach(t => t.stop()); } catch {}
  try { call.pc.close(); } catch {}
  try { call.unC && call.unC(); call.unDoc && call.unDoc(); } catch {}
  paintCall(); render();
}
function attachMedia(force) {
  const call = S.call; if (!call) return;
  const lv = document.getElementById('callLocal'), rv = document.getElementById('callRemote');
  if (lv && (force || lv.srcObject !== call.local)) lv.srcObject = call.local;
  if (rv && (force || rv.srcObject !== call.remote)) { rv.srcObject = call.remote; rv.play && rv.play().catch(() => {}); }
}
function paintCall() {
  let layer = document.getElementById('callLayer');
  if (!S.call && !S.incoming) { if (layer) layer.remove(); clearInterval(callTick); return; }
  if (!layer) {
    layer = document.createElement('div'); layer.id = 'callLayer'; document.body.appendChild(layer);
    layer.addEventListener('click', e => { const b = e.target.closest('[data-call]'); if (!b) return; ({ accept: acceptCall, decline: declineCall, hang: hangUp, mute: toggleMute, cam: toggleCam })[b.dataset.call]?.(); });
  }
  if (S.incoming && !S.call) {
    const inc = S.incoming;
    layer.className = 'call-incoming glass';
    layer.innerHTML = `<div class="row" style="gap:14px">${av(inc.from, 56)}<div class="grow"><b style="display:block;font-size:17px">${esc(dname(inc.from))}</b><span class="mute small">${inc.kind === 'video' ? 'Incoming video call…' : 'Incoming voice call…'}</span></div></div>
      <div class="row" style="gap:10px"><button class="cbtn red" data-call="decline" aria-label="Decline">${ic('hangup', 22, 2)}</button><button class="cbtn green" data-call="accept" aria-label="Accept">${ic(inc.kind === 'video' ? 'video' : 'phone', 22, 2)}</button></div>`;
    return;
  }
  const call = S.call, video = call.kind === 'video';
  const hasRemoteVideo = call.remote.getVideoTracks().length > 0;
  if (!layer.dataset.built || layer.dataset.built !== call.id) {
    layer.dataset.built = call.id; layer.className = 'call-screen';
    layer.innerHTML = `<video id="callRemote" autoplay playsinline></video><div class="call-center" id="callCenter"></div><video id="callLocal" autoplay playsinline muted></video><div class="call-controls" id="callCtl"></div>`;
    attachMedia(true);
    clearInterval(callTick); callTick = setInterval(() => { const t = document.getElementById('callTime'); if (t && S.call?.startedAt) t.textContent = fmtDur((now() - S.call.startedAt) / 1000); }, 1000);
  }
  layer.classList.toggle('has-video', video && hasRemoteVideo);
  document.getElementById('callLocal').style.display = video && !call.camOff ? '' : 'none';
  const status = call.startedAt ? `<span id="callTime">${fmtDur((now() - call.startedAt) / 1000)}</span>` : call.state === 'ringing' ? 'Ringing…' : 'Connecting…';
  document.getElementById('callCenter').innerHTML = `${video && hasRemoteVideo ? '' : `<div class="call-ring ${call.startedAt ? '' : 'pulse'}">${av(call.peer, 120)}</div>`}<b class="disp" style="font-size:24px">${esc(dname(call.peer))}</b><span class="mute">${status}</span>`;
  document.getElementById('callCtl').innerHTML = `<button class="cbtn ${call.muted ? 'on' : ''}" data-call="mute" aria-label="${call.muted ? 'Unmute' : 'Mute'}">${ic(call.muted ? 'micOff' : 'mic', 22, 2)}</button>${video ? `<button class="cbtn ${call.camOff ? 'on' : ''}" data-call="cam" aria-label="${call.camOff ? 'Turn camera on' : 'Turn camera off'}">${ic(call.camOff ? 'videoOff' : 'video', 22, 2)}</button>` : ''}<button class="cbtn red" data-call="hang" aria-label="Hang up">${ic('hangup', 24, 2)}</button>`;
  attachMedia();
}
function toggleMute() { const c = S.call; if (!c) return; c.muted = !c.muted; c.local.getAudioTracks().forEach(t => t.enabled = !c.muted); paintCall(); }
function toggleCam() { const c = S.call; if (!c) return; c.camOff = !c.camOff; c.local.getVideoTracks().forEach(t => t.enabled = !c.camOff); paintCall(); }
window.addEventListener('beforeunload', () => { if (S.call) db().update('calls/' + S.call.id, { status: 'ended' }).catch(() => {}); if (R) db().update('rooms/' + R.id, { ['participants.' + S.me]: ops.del() }).catch(() => {}); });

/* ---------------- search across all chats ---------------- */
const msgCache = {};
let allT = 0;
async function searchAll(q) {
  q = q.trim().toLowerCase();
  if (q.length < 2) { S.allSearch = null; return render(); }
  S.allSearch = { q, items: S.allSearch?.q === q ? S.allSearch.items : [], loading: true }; render();
  const convs = sortedConvs(true).slice(0, 40);
  await Promise.all(convs.map(async c => {
    const cached = msgCache[c.id];
    if (!cached || now() - cached.at > 60000) { try { msgCache[c.id] = { at: now(), list: await db().query(`conversations/${c.id}/messages`, [], { order: ['at', 'desc'], limit: 300 }) }; } catch { msgCache[c.id] = { at: now(), list: [] }; } }
  }));
  if (S.convQ.trim().toLowerCase() !== q) return;
  const items = [];
  convs.forEach(c => (msgCache[c.id]?.list || []).forEach(m => {
    if (m.deleted || m.system || (m.expiresAt && m.expiresAt < now()) || m.at <= hiddenAt(c) || blocked(m.from)) return;
    const t = (m.text || m.poll?.q || '');
    if (t.toLowerCase().includes(q)) items.push({ c, m, t });
  }));
  items.sort((a, b) => b.m.at - a.m.at);
  S.allSearch = { q, items: items.slice(0, 40), loading: false }; render();
}
function snippet(t, q) {
  const i = t.toLowerCase().indexOf(q); const start = Math.max(0, i - 30);
  const s = (start ? '…' : '') + t.slice(start, i + q.length + 60);
  return esc(s).replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
}
function vAllSearch() {
  const a = S.allSearch; if (!a) return '';
  return `<div class="sec" style="margin:10px 4px 4px">Messages${a.loading ? ' · searching…' : ` · ${a.items.length}`}</div>
    ${a.items.map(({ c, m, t }) => `<button class="item" data-a="openHit" data-v="${c.id}" data-m="${m.id}">${convAv(c, 40, false)}<span class="grow"><span class="row spread" style="gap:8px"><b class="ellip small">${esc(convName(c))}</b><span class="mute small" style="flex-shrink:0">${fmtWhen(m.at)}</span></span><span class="small ellip mute" style="display:block">${m.from === S.me ? 'You: ' : c.type !== 'dm' ? esc(dname(m.from).split(' ')[0]) + ': ' : ''}${snippet(t, a.q)}</span></span></button>`).join('')}
    ${!a.loading && !a.items.length ? '<div class="mute small" style="padding:6px 10px">No messages found.</div>' : ''}`;
}

/* ---------------- starred ---------------- */
function vStarred() {
  const st = Object.entries(S.prefs.starred || {}).sort((a, b) => b[1].at - a[1].at);
  if (!st.length) return `<div class="empty"><div class="ring">${ic('star', 24)}</div><b>No starred messages</b><span>Hover a message and tap the star to save it here.</span></div>`;
  return st.map(([mid, x]) => { const c = convOf(x.c); return `<button class="item" data-a="openHit" data-v="${x.c}" data-m="${mid}">${c ? convAv(c, 40, false) : av(x.f, 40)}<span class="grow"><span class="row spread" style="gap:8px"><b class="ellip small">${esc(c ? convName(c) : 'Chat')}</b><span class="mute small">${fmtWhen(x.at)}</span></span><span class="small ellip" style="display:block">${esc(x.f === S.me ? 'You: ' : dname(x.f).split(' ')[0] + ': ')}${esc(x.t)}</span></span>${ic('star', 14)}</button>`; }).join('');
}
function jumpTo(mid, tries = 0) {
  const el = [...document.querySelectorAll('.m')].find(x => x.dataset.v === mid);
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.animate([{ filter: 'brightness(1.7)' }, { filter: 'none' }], 1200); return; }
  const c = S.conv;
  if (tries < 6 && S.hasMore[c]) { S.msgLimit[c] = (S.msgLimit[c] || PAGE) + 100; watchMsgs(c, true); setTimeout(() => jumpTo(mid, tries + 1), 500); }
  else if (tries < 3) setTimeout(() => jumpTo(mid, tries + 1), 400);
}

/* ---------------- birthdays ---------------- */
const mmdd = d => pad(d.getMonth() + 1) + '-' + pad(d.getDate());
function birthdaysToday() { const t = mmdd(new Date()); return friendIds().filter(u => U(u)?.birthday === t && U(u)?.showBirthday !== false); }
function checkBirthdays() {
  const y = new Date().getFullYear(), seen = S.prefs.bday || {};
  birthdaysToday().forEach(u => {
    if (seen[u] === y) return;
    S.prefs.bday = { ...seen, [u]: y };
    db().update(`users/${S.me}/private/prefs`, { ['bday.' + u]: y }).catch(() => {});
    db().add('notifications', { to: S.me, from: S.me, type: 'birthday', title: `It's ${dname(u)}'s birthday`, body: 'Send them a wish!', at: now(), read: false, link: { page: 'profile', id: u } }).catch(() => {});
  });
  if (S.profile?.birthday === mmdd(new Date())) { let k = ''; try { k = sessionStorage.getItem('nexa.bdayfx'); } catch {} if (k !== String(y)) { try { sessionStorage.setItem('nexa.bdayfx', String(y)); } catch {} setTimeout(confetti, 1600); } }
}
function vBirthdayCard() {
  const list = birthdaysToday(), mine = S.profile?.birthday === mmdd(new Date());
  if (!list.length && !mine) return '';
  return `<section class="panel glass card react bday">${mine ? `<div class="row"><span class="notif-ic" style="background:linear-gradient(135deg,#ff8a4c,#ff4d6d)">${ic('cake', 20)}</span><b class="disp" style="font-size:17px">Happy birthday, ${esc(S.profile.name.split(' ')[0])}!</b></div>` : ''}
    ${list.map(u => `<div class="row">${av(u, 40)}<span class="grow"><b>${esc(dname(u))}</b> <span class="mute small">has a birthday today</span></span><button class="btn sm pri" data-a="bdayWish" data-v="${u}">${ic('cake', 16)} Send a wish</button></div>`).join('')}</section>`;
}

/* ---------------- extra modals ---------------- */
const TTL_OPTS = [[0, 'Off'], [864e5, '24 hours'], [7 * 864e5, '7 days'], [90 * 864e5, '90 days']];
function vModal3(m, f, head) {
  if (m.type === 'fwd') {
    const sel = f.fwdSel || [];
    return head('Forward message', 'Pick one or more chats') + `<div class="col scroll" style="gap:4px;max-height:360px">${sortedConvs(true).map(c => `<button class="item ${sel.includes(c.id) ? 'on' : ''}" data-a="fwdPick" data-v="${c.id}">${convAv(c, 40, false)}<b class="grow ellip">${esc(convName(c))}</b><span class="tog ${sel.includes(c.id) ? 'on' : ''}" style="width:24px;height:24px;border-radius:8px" aria-hidden="true"></span></button>`).join('') || '<div class="empty">No chats yet.</div>'}</div>
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="fwdSend" ${sel.length ? '' : 'disabled'}>${ic('forward', 16)} Forward${sel.length ? ` (${sel.length})` : ''}</button></div>`;
  }
  if (m.type === 'ttl') {
    const c = convOf(S.conv);
    return head('Disappearing messages', 'New messages in this chat delete themselves after the time you pick. Everyone in the chat sees this setting.') + `<div class="col" style="gap:6px">${TTL_OPTS.map(([v, l]) => `<button class="item ${(c?.ttl || 0) === v ? 'on' : ''}" data-a="setTtl" data-v="${v}">${ic(v ? 'timer' : 'x', 18)}<b>${l}</b></button>`).join('')}</div>`;
  }
  if (m.type === 'media') {
    const tab = m.tab || 'photos', it = m.items || { photos: [], links: [], voice: [] };
    let body = m.loading ? '<div class="empty">Loading…</div>' : '';
    if (!m.loading && tab === 'photos') body = it.photos.length ? `<div class="mgrid">${it.photos.map(p => `<button data-a="mediaView" data-v="${esc(p)}"><img src="${esc(p)}" alt="" loading="lazy"></button>`).join('')}</div>` : '<div class="empty">No photos shared yet.</div>';
    if (!m.loading && tab === 'links') body = it.links.length ? it.links.map(l => `<a class="item" href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">${ic('link', 18)}<span class="grow ellip">${esc(l.u)}</span><span class="mute small">${fmtWhen(l.at)}</span></a>`).join('') : '<div class="empty">No links shared yet.</div>';
    if (!m.loading && tab === 'voice') body = it.voice.length ? it.voice.map(v => `<button class="item" data-a="mediaVoice" data-v="${v.id}">${av(v.from, 36)}<span class="grow"><b class="small">${esc(dname(v.from))}</b><span class="mute small" style="display:block">Voice message · ${fmtDur(v.dur || 0)}</span></span><span class="mute small">${fmtWhen(v.at)}</span></button>`).join('') : '<div class="empty">No voice messages yet.</div>';
    return head('Shared in this chat') + `<div class="tabs">${[['photos', 'Photos', it.photos.length], ['links', 'Links', it.links.length], ['voice', 'Voice', it.voice.length]].map(([k, l, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-a="mediaTab" data-v="${k}">${l} <span class="mute">${n}</span></button>`).join('')}</div><div class="col scroll" style="gap:4px;max-height:420px">${body}</div>`;
  }
  if (m.type === 'theme') {
    const c1 = f.thC1 || '#1b2a6b', c2 = f.thC2 || '#6b2fd1', c3 = f.thC3 || '#ff8a4c';
    return head('Create a chat theme', 'Pick a background and a colour for your messages') + `
      <div class="tprev big" style="background:linear-gradient(160deg,${c1},${c2})"><span class="tb" style="background:${c3}"></span><span class="tb them"></span><span class="tb" style="background:${c3};width:40%"></span></div>
      <div class="row" style="gap:12px;flex-wrap:wrap">${[['thC1', 'Top', c1], ['thC2', 'Bottom', c2], ['thC3', 'Your bubbles', c3]].map(([k, l, v]) => `<label class="field grow" style="min-width:120px">${l}<input type="color" class="inp" style="padding:4px;height:44px" value="${v}" data-change="${k}"></label>`).join('')}</div>
      <label class="field">Name<input class="inp" id="th-name" data-model="form.thName" value="${esc(f.thName || '')}" placeholder="Late night" maxlength="30"></label>
      <div class="row" style="justify-content:flex-end;gap:10px;flex-wrap:wrap"><button class="btn" data-a="themeShare">${ic('send', 16)} Share in chat</button><button class="btn pri" data-a="themeSave">Save &amp; use</button></div>`;
  }
  if (m.type === 'warn') return head('Warn ' + esc(U(m.uid)?.name || 'user'), 'They\'ll get a notification from the Nexa team.') + `<label class="field">Message<textarea class="inp" id="warn-text" data-model="form.warnText" rows="3" maxlength="300">${esc(f.warnText ?? 'Please keep Nexa friendly and respectful. Further reports may lead to a suspension.')}</textarea></label><div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="admWarnSend">Send warning</button></div>`;
  return null;
}

/* ---------------- push (optional; needs config.firebase.vapidKey + Cloud Function) ---------------- */
async function registerPush(quiet) {
  if (!S.be.push || !('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    await navigator.serviceWorker.register('sw.js');
    const reg = await navigator.serviceWorker.ready;
    const token = await S.be.push.token(reg);
    if (!token) return false;
    lsSet('nexa.pushToken', token);
    await db().update(`users/${S.me}/private/push`, { tokens: ops.union(token), ['devices.' + deviceId]: token, updatedAt: now() });
    S.pushOn = true; render();
    return true;
  } catch (e) { if (!quiet) toast('Couldn\'t turn on notifications for when Nexa is closed on this device.'); console.warn('push registration failed', e); return false; }
}
async function unregisterPush() {
  const token = lsGet('nexa.pushToken', null);
  if (token) await db().update(`users/${S.me}/private/push`, { tokens: ops.remove(token), ['devices.' + deviceId]: ops.del() }).catch(() => {});
  lsSet('nexa.pushToken', null); S.pushOn = false;
  if (S.be.push) await S.be.push.remove();
}
// Ask the Nexa push server (a Netlify Function) to alert people who have Nexa closed.
async function pushNotify(kind, body) {
  if (!S.be.push) return;
  try {
    const tok = await S.be.auth.idToken(); if (!tok) return;
    fetch(CONFIG.pushEndpoint || '/.netlify/functions/notify', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: JSON.stringify({ kind, ...body }), keepalive: true }).catch(() => {});
  } catch {}
}

/* ---------------- actions ---------------- */
Object.assign(actions, {
  copyId: async () => { try { await navigator.clipboard.writeText(S.me); toast('Account ID copied'); } catch { toast(esc(S.me)); } },
  loadMore: () => { const c = S.conv; const st = $('#stream'); S.keepBottom = st ? st.scrollHeight - st.scrollTop : null; S.msgLimit[c] = (S.msgLimit[c] || PAGE) + PAGE; watchMsgs(c, true); },
  call: d => startCall(d.v),
  logoutNow: () => S.be.auth.signOut(),
  // moderation
  admTab: d => { S.form.admTab = d.v; render(); },
  admWarn: d => { S.form.warnText = undefined; S.modal = { type: 'warn', uid: d.v }; render(); },
  admWarnSend: async () => { const t = (S.form.warnText ?? '').trim() || 'Please keep Nexa friendly and respectful.'; const nid = await db().add('notifications', { to: S.modal.uid, from: S.me, type: 'admin_warn', title: 'A message from the Nexa team', body: t.slice(0, 300), at: now(), read: false }); pushNotify('notification', { id: nid }); S.modal = null; render(); toast('Warning sent'); },
  admBan: d => confirmModal(`Ban ${U(d.v)?.name || 'this user'}?`, 'They won\'t be able to send messages, friend requests, events or moments. You can unban them anytime.', 'Ban', async () => { await db().set('bans/' + d.v, { by: S.me, at: now(), reason: d.r || '' }); toast('User banned'); }),
  admUnban: async d => { await db().del('bans/' + d.v); toast('User unbanned'); },
  admDismiss: async d => { await db().del('reports/' + d.v); },
  admDelMsg: d => { const r = S.reports.find(x => x.id === d.v); if (!r) return; confirmModal('Delete this message?', 'It will be removed for everyone in that chat.', 'Delete', async () => { await db().update(`conversations/${r.convId}/messages/${r.messageId}`, { deleted: true, text: '', image: '', images: [], audio: null, preview: null, reactions: {} }); toast('Message removed'); }); },
  // forward & star
  fwdOpen: d => { S.form.fwdSel = []; S.modal = { type: 'fwd', mid: d.v, conv: S.conv }; render(); },
  fwdPick: d => { const s = S.form.fwdSel || []; S.form.fwdSel = s.includes(d.v) ? s.filter(x => x !== d.v) : [...s, d.v]; render(); },
  fwdSend: async () => {
    const m = (S.msgs[S.modal.conv] || []).find(x => x.id === S.modal.mid); if (!m) return;
    const keep = ['text', 'image', 'images', 'sticker', 'audio', 'gif', 'preview', 'theme'], payload = { forwarded: true };
    keep.forEach(k => { if (m[k] != null && m[k] !== '') payload[k] = m[k]; });
    const targets = S.form.fwdSel || []; S.modal = null; render();
    for (const cid of targets) await sendMessage({ ...payload }, cid);
    toast(`Forwarded to ${targets.length} chat${targets.length > 1 ? 's' : ''}`);
  },
  starMsg: d => {
    const st = { ...(S.prefs.starred || {}) };
    if (st[d.v]) delete st[d.v];
    else { const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m) return; st[d.v] = { c: S.conv, t: msgLabel(m).slice(0, 140), f: m.bot ? S.me : m.from, at: m.at }; }
    S.selMsg = null; savePrefs({ starred: st }); toast(st[d.v] ? 'Starred' : 'Removed from starred');
  },
  openHit: d => { openConv(d.v); if (S.convQ.trim()) { S.findOpen = true; S.find = S.convQ.trim(); } render(); setTimeout(() => jumpTo(d.m), 350); },
  // disappearing
  ttlOpen: () => { S.menu = null; S.modal = { type: 'ttl' }; render(); },
  setTtl: async d => {
    const v = +d.v, c = convOf(S.conv); S.modal = null; render(); if (!c || (c.ttl || 0) === v) return;
    await db().update('conversations/' + c.id, { ttl: v });
    await sendMessage({ system: true, text: v ? `${S.profile.name.split(' ')[0]} turned on disappearing messages (${TTL_OPTS.find(o => o[0] === v)[1]})` : `${S.profile.name.split(' ')[0]} turned off disappearing messages` }, c.id);
  },
  // shared media
  mediaOpen: async () => {
    const cid = S.conv; S.menu = null; S.modal = { type: 'media', tab: 'photos', loading: true }; render();
    let list = []; try { list = await db().query(`conversations/${cid}/messages`, [], { order: ['at', 'desc'], limit: 400 }); } catch {}
    const items = { photos: [], links: [], voice: [] };
    list.filter(m => !m.deleted && !(m.expiresAt && m.expiresAt < now())).forEach(m => {
      (m.images || (m.image ? [m.image] : [])).map(safeImg).filter(Boolean).forEach(p => items.photos.push(p));
      ((m.text || '').match(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g) || []).forEach(u => items.links.push({ u, at: m.at }));
      if (m.audio) items.voice.push({ id: m.id, from: m.from, dur: m.audio.dur, at: m.at, src: m.audio.src });
    });
    S.mediaVoice = items.voice;
    if (S.modal?.type === 'media') { S.modal = { type: 'media', tab: 'photos', items }; render(); }
  },
  mediaTab: d => { S.modal.tab = d.v; render(); },
  mediaView: d => { S.lightbox = d.v; render(); },
  mediaVoice: d => { const v = (S.mediaVoice || []).find(x => x.id === d.v); const src = safeAudio(v?.src); if (src) { new Audio(src).play().catch(() => toast('Can\'t play this voice message here.')); } },
  // games
  newGame: async d => {
    S.attach = false; const c = convOf(S.conv); if (!c) return; bumpStat('games');
    if (d.v === 'word') return actions.wordNewOpen();
    const pick5 = () => { const idx = [...TRIVIA.keys()]; for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx.slice(0, 5); };
    const game = d.v === 'ttt' ? { t: 'ttt', b: '_________', x: S.me, o: c.type === 'dm' ? others(c)[0] : null, turn: 'X' }
      : d.v === 'c4' ? { t: 'c4', b: '_'.repeat(C4W * C4H), r: S.me, y: c.type === 'dm' ? others(c)[0] : null, turn: 'R' }
      : d.v === 'trivia' ? { t: 'trivia', qs: pick5(), ans: {} } : { t: 'rps', p: {} };
    render(); await sendMessage({ game });
  },
  tttMove: async d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m?.game || S.gameBusy) return;
    const g = { ...m.game }, i = +d.i;
    if (tttWinner(g.b) || g.b[i] !== '_') return;
    if (!g.o && g.x !== S.me) g.o = S.me;
    const mark = g.x === S.me && g.turn === 'X' ? 'X' : g.o === S.me && g.turn === 'O' ? 'O' : null;
    if (!mark) return toast(g.x === S.me || g.o === S.me ? 'Wait for your turn' : 'This game already has two players');
    g.b = g.b.slice(0, i) + mark + g.b.slice(i + 1); g.turn = mark === 'X' ? 'O' : 'X';
    S.gameBusy = true; sound('pop');
    try { await db().update(`conversations/${S.conv}/messages/${m.id}`, { game: g }); } finally { S.gameBusy = false; }
    const w = tttWinner(g.b); if (w && w.p !== 'draw' && ((w.p === 'X' && g.x === S.me) || (w.p === 'O' && g.o === S.me))) confetti();
  },
  rpsPick: async d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m?.game) return;
    const p = { ...(m.game.p || {}) }; if (p[S.me] || Object.keys(p).length >= 2) return;
    p[S.me] = d.k; sound('pop');
    await db().update(`conversations/${S.conv}/messages/${m.id}`, { game: { ...m.game, p } });
  },
  // themes
  themeNew: () => { S.bgPop = false; S.form.thName = ''; S.modal = { type: 'theme' }; render(); },
  themeSave: () => {
    const f = S.form, t = { id: 't' + Date.now().toString(36), name: (f.thName || 'My theme').trim().slice(0, 30), c1: f.thC1 || '#1b2a6b', c2: f.thC2 || '#6b2fd1', c3: f.thC3 || '#ff8a4c' };
    S.modal = null; savePrefs({ themes: [...(S.prefs.themes || []), t], chatBgs: { ...(S.prefs.chatBgs || {}), [S.conv]: { theme: t.id } } }); toast('Theme saved');
  },
  themeShare: async () => { const f = S.form; S.modal = null; render(); await sendMessage({ theme: { name: (f.thName || 'My theme').trim().slice(0, 30), c1: f.thC1 || '#1b2a6b', c2: f.thC2 || '#6b2fd1', c3: f.thC3 || '#ff8a4c' } }); },
  useThemeSaved: d => savePrefs({ chatBgs: { ...(S.prefs.chatBgs || {}), [S.conv]: { theme: d.v } } }),
  delTheme: d => savePrefs({ themes: (S.prefs.themes || []).filter(t => t.id !== d.v) }),
  useTheme: d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m?.theme) return;
    const t = { id: 't' + Date.now().toString(36), name: String(m.theme.name || 'Shared theme').slice(0, 30), c1: m.theme.c1, c2: m.theme.c2, c3: m.theme.c3 };
    savePrefs({ themes: [...(S.prefs.themes || []), t], chatBgs: { ...(S.prefs.chatBgs || {}), [S.conv]: { theme: t.id } } }); toast('Theme applied to this chat');
  },
  // birthdays & profile
  bdayWish: async d => { const id = await ensureDM(d.v); S.draft[id] = 'Happy birthday! 🎉'; openConv(id); },
  profColor: d => { S.profile.color = d.v; render(); db().update('users/' + S.me, { color: d.v }); },
  removeBanner: () => db().update('users/' + S.me, { banner: '' }),
  nowPreset: d => { S.form.sNow = d.v; render(); setTimeout(() => { const el = $('#s-now'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 20); }
});
Object.assign(files, {
  banner: async f => { const url = await storeImg(await compress(f, 1400, .8), 'banner'); await db().update('users/' + S.me, { banner: url }); toast('Banner updated'); }
});

/* =====================================================================
   v4 — gestures, custom stickers, shared wallpapers, scheduling, transcripts,
   statuses, group roles & invites, streaks, Wrapped, more games, watch together,
   drawing board, account security, skeletons, onboarding tour
   ===================================================================== */
const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return todayKey(d); };

/* ---------------- swipe to reply + long-press reactions (touch) ---------------- */
(() => {
  let sx = 0, sy = 0, el = null, dx = 0, lp = 0, moved = false;
  document.addEventListener('touchstart', e => {
    const m = e.target.closest('#stream .m'); if (!m || e.target.closest('button,a,input,.ttt,.c4') || e.touches[0].clientX < 24) return;
    el = m; sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; moved = false;
    clearTimeout(lp);
    lp = setTimeout(() => { if (!moved && el) { navigator.vibrate?.(12); const r = el.getBoundingClientRect(); S.menu = { type: 'react', mid: el.dataset.v, x: Math.max(8, r.left), y: r.top - 60 }; S.selMsg = el.dataset.v; el = null; render(); } }, 480);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!el) return;
    const x = e.touches[0].clientX - sx, y = e.touches[0].clientY - sy;
    if (Math.abs(y) > 12 && Math.abs(y) > Math.abs(x)) { clearTimeout(lp); el.style.transform = ''; el = null; return; }
    if (Math.abs(x) > 6) { moved = true; clearTimeout(lp); }
    dx = Math.max(0, Math.min(80, x));
    el.style.transform = `translateX(${dx}px)`; el.style.transition = 'none';
    el.classList.toggle('swipe-ready', dx > 55);
  }, { passive: true });
  document.addEventListener('touchend', () => {
    clearTimeout(lp); if (!el) return;
    const m = el; m.style.transition = 'transform .25s var(--spring)'; m.style.transform = ''; m.classList.remove('swipe-ready');
    if (dx > 55) { navigator.vibrate?.(8); actions.reply({ v: m.dataset.v }); }
    el = null;
  });
})();

/* ---------------- custom stickers ---------------- */
async function makeSticker(file) {
  const src = await compress(file, 512, .9);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const s = Math.min(img.width, img.height), r = 46;
  const rr = (p) => { x.beginPath(); x.moveTo(p + r, p); x.arcTo(N - p, p, N - p, N - p, r); x.arcTo(N - p, N - p, p, N - p, r); x.arcTo(p, N - p, p, p, r); x.arcTo(p, p, N - p, p, r); x.closePath(); };
  x.fillStyle = '#fff'; rr(4); x.fill();
  x.save(); rr(14); x.clip(); x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 14, 14, N - 28, N - 28); x.restore();
  return c.toDataURL('image/webp', .82).startsWith('data:image/webp') ? c.toDataURL('image/webp', .82) : c.toDataURL('image/png');
}
function watchStickers() { unsubs.base.push(db().listenDoc(`users/${S.me}/private/stickers`, d => { S.myStickers = (d && d.list) || []; render(); })); }

/* ---------------- scheduled messages ---------------- */
function watchScheduled() { unsubs.base.push(db().listenDoc(`users/${S.me}/private/scheduled`, d => { S.scheduled = (d && d.items) || []; render(); })); }
let schedBusy = false;
async function runScheduled() {
  if (schedBusy || !S.scheduled?.length) return;
  const due = S.scheduled.filter(x => x.at <= now());
  if (!due.length) return;
  schedBusy = true;
  try {
    const rest = S.scheduled.filter(x => x.at > now());
    await db().set(`users/${S.me}/private/scheduled`, { items: rest });
    S.scheduled = rest;
    for (const x of due) if (convOf(x.conv)) await sendMessage({ text: x.text, scheduled: true }, x.conv);
  } finally { schedBusy = false; }
}

/* ---------------- statuses that expire ---------------- */
const MOODS = [['At the gym', 'Working out'], ['Studying', 'Head down'], ['In class', 'Back soon'], ['Sleeping', 'Zzz'], ['Gaming', 'In a match'], ['Out with friends', 'Might reply late'], ['On holiday', 'Offline-ish'], ['Busy', 'Do not disturb']];
const moodOf = uid => { const u = uid === S.me ? S.profile : U(uid); return u?.mood && u.mood.until > now() ? u.mood.text : ''; };

/* ---------------- streaks ---------------- */
function streakOf(c) {
  const st = c.streak; if (!st || !st.count || S.prefs.hideStreaks) return 0;
  return st.lastDay === todayKey() || st.lastDay === yesterdayKey() ? st.count : 0;
}
async function bumpStreak(c) {
  if (c.type !== 'dm') return;
  const t = todayKey(), st = c.streak || {}, days = { ...(st.days || {}), [S.me]: t };
  const patch = { ['streak.days.' + S.me]: t };
  const other = others(c)[0];
  if (days[other] === t && st.lastDay !== t) { patch['streak.count'] = st.lastDay === yesterdayKey() ? (st.count || 0) + 1 : 1; patch['streak.lastDay'] = t; }
  await db().update('conversations/' + c.id, patch).catch(() => {});
}
const streakBadge = c => { const n = streakOf(c); return n >= 2 ? `<span class="streak" title="${n}-day streak">${ic('flame', 12, 2)}${n}</span>` : ''; };

/* ---------------- group roles & invite links ---------------- */
const roleOf = (c, u) => (c.roles || {})[u] || 'member';
const canManage = c => c.type === 'group' && ['owner', 'admin'].includes(roleOf(c, S.me));
async function checkJoin() {
  const code = lsGet('nexa.join', null); if (!code) return;
  lsSet('nexa.join', null);
  const inv = await db().get('groupInvites/' + code).catch(() => null);
  if (inv) { inv.code = code; if (convOf(inv.convId)) return openConv(inv.convId); }
  S.modal = { type: 'joinGroup', inv }; render();
}

/* ---------------- games: connect four, word guess, trivia ---------------- */
const C4W = 7, C4H = 6;
function c4Winner(b) {
  const at = (x, y) => (x < 0 || y < 0 || x >= C4W || y >= C4H) ? '_' : b[y * C4W + x];
  for (let y = 0; y < C4H; y++) for (let x = 0; x < C4W; x++) {
    const p = at(x, y); if (p === '_') continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const cells = [0, 1, 2, 3].map(k => [x + dx * k, y + dy * k]); if (cells.every(([a, bb]) => at(a, bb) === p)) return { p, cells: cells.map(([a, bb]) => bb * C4W + a) }; }
  }
  return b.includes('_') ? null : { p: 'draw', cells: [] };
}
const TRIVIA = [
  ['What is the largest planet in our solar system?', ['Saturn', 'Jupiter', 'Neptune', 'Earth'], 1], ['How many continents are there?', ['5', '6', '7', '8'], 2],
  ['Which gas do plants absorb from the air?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 2], ['What is the capital of Japan?', ['Seoul', 'Kyoto', 'Tokyo', 'Osaka'], 2],
  ['How many sides does a hexagon have?', ['5', '6', '7', '8'], 1], ['Which ocean is the largest?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3],
  ['What is H2O more commonly called?', ['Salt', 'Water', 'Hydrogen', 'Steam'], 1], ['Who painted the Mona Lisa?', ['Van Gogh', 'Picasso', 'Leonardo da Vinci', 'Monet'], 2],
  ['What is the fastest land animal?', ['Cheetah', 'Lion', 'Horse', 'Pronghorn'], 0], ['How many minutes are in a day?', ['1,440', '1,240', '2,400', '960'], 0],
  ['Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Mercury', 'Jupiter'], 1], ['What is the smallest prime number?', ['0', '1', '2', '3'], 2],
  ['In which country are the pyramids of Giza?', ['Mexico', 'Egypt', 'Peru', 'Greece'], 1], ['What is the hardest natural substance?', ['Gold', 'Iron', 'Diamond', 'Quartz'], 2],
  ['How many players are on a football (soccer) team on the pitch?', ['9', '10', '11', '12'], 2], ['What is the boiling point of water at sea level in °C?', ['90', '100', '110', '120'], 1],
  ['Which is the longest river in the world?', ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], 1], ['What do bees make?', ['Milk', 'Honey', 'Silk', 'Wax only'], 1],
  ['Which language has the most native speakers?', ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'], 2], ['How many bones are in the adult human body?', ['106', '206', '306', '156'], 1],
  ['What is the largest desert in the world (including polar)?', ['Sahara', 'Gobi', 'Antarctica', 'Arabian'], 2], ['Which instrument has 88 keys?', ['Guitar', 'Piano', 'Violin', 'Flute'], 1],
  ['What colour do you get mixing blue and yellow?', ['Purple', 'Green', 'Orange', 'Brown'], 1], ['Which animal is known as the King of the Jungle?', ['Tiger', 'Elephant', 'Lion', 'Gorilla'], 2],
  ['How many hours are in a week?', ['148', '168', '178', '158'], 1], ['What is the capital of Australia?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2],
  ['Which planet has the most famous rings?', ['Mars', 'Saturn', 'Uranus', 'Venus'], 1], ['What is the freezing point of water in °F?', ['0', '32', '100', '212'], 1],
  ['What is the tallest mountain on Earth?', ['K2', 'Kilimanjaro', 'Everest', 'Denali'], 2], ['Which shape has three sides?', ['Square', 'Triangle', 'Circle', 'Pentagon'], 1]
];
function vGame4(m) {
  const g = m.game;
  if (g.t === 'c4') {
    const w = c4Winner(g.b), turnUid = g.turn === 'R' ? g.r : g.y;
    const status = w ? (w.p === 'draw' ? 'It\'s a draw!' : `${dname(w.p === 'R' ? g.r : g.y).split(' ')[0]} wins!`) : !g.y ? (g.r === S.me ? 'Waiting for a challenger…' : 'Tap a column to join as yellow') : turnUid === S.me ? 'Your turn' : `${dname(turnUid).split(' ')[0]}'s turn`;
    return `<div class="bub game"><div class="row spread"><b class="disp">Connect Four</b><span class="small" style="opacity:.8"><i class="c4dot R"></i>${esc(dname(g.r).split(' ')[0])} vs <i class="c4dot Y"></i>${g.y ? esc(dname(g.y).split(' ')[0]) : '…'}</span></div>
      <div class="c4">${Array.from({ length: C4W }, (_, x) => `<button class="c4col" aria-label="Drop in column ${x + 1}" data-a="c4Drop" data-v="${m.id}" data-i="${x}" ${w ? 'disabled' : ''}>${Array.from({ length: C4H }, (_, y) => { const i = y * C4W + x, v = g.b[i]; return `<i class="${v !== '_' ? v : ''} ${w && w.cells.includes(i) ? 'win' : ''}"></i>`; }).join('')}</button>`).join('')}</div>
      <div class="row spread"><span class="small" style="font-weight:700">${esc(status)}</span>${w ? '<button class="btn sm" data-a="newGame" data-v="c4">Play again</button>' : ''}</div></div>`;
  }
  if (g.t === 'word') {
    const W = g.w, guessed = g.g || '', miss = [...guessed].filter(ch => !W.includes(ch)).length, max = 6;
    const solved = [...W].every(ch => ch === ' ' || guessed.includes(ch)), lost = miss >= max, host = g.by === S.me;
    const shown = [...W].map(ch => ch === ' ' ? '<i class="sp"></i>' : `<i>${guessed.includes(ch) || lost || host ? ch : ''}</i>`).join('');
    return `<div class="bub game"><div class="row spread"><b class="disp">Word guess</b><span class="small" style="opacity:.8">by ${esc(dname(g.by).split(' ')[0])}</span></div>
      ${g.hint ? `<span class="small" style="opacity:.85">Hint: ${esc(g.hint)}</span>` : ''}
      <div class="wordrow">${shown}</div>
      <div class="lives">${Array.from({ length: max }, (_, i) => `<i class="${i < max - miss ? 'on' : ''}"></i>`).join('')}</div>
      ${solved || lost ? `<b>${solved ? `Solved!${g.last ? ' Nice one, ' + esc(dname(g.last).split(' ')[0]) + '.' : ''}` : `Out of lives — it was “${esc(W)}”.`}</b>`
        : host ? '<span class="small" style="opacity:.8">Friends are guessing your word…</span>'
        : `<div class="keys">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => `<button data-a="wordGuess" data-v="${m.id}" data-k="${ch}" ${guessed.includes(ch) ? 'disabled' : ''} class="${guessed.includes(ch) ? (W.includes(ch) ? 'hit' : 'miss') : ''}">${ch}</button>`).join('')}</div>`}</div>`;
  }
  if (g.t === 'trivia') {
    const mine = (g.ans || {})[S.me] || [], qi = mine.length, total = g.qs.length;
    const score = u => ((g.ans || {})[u] || []).filter((a, i) => a === TRIVIA[g.qs[i]][2]).length;
    const board = Object.keys(g.ans || {}).map(u => ({ u, s: score(u), done: (g.ans[u] || []).length >= total })).sort((a, b) => b.s - a.s);
    const q = qi < total ? TRIVIA[g.qs[qi]] : null;
    return `<div class="bub game trivia"><div class="row spread"><b class="disp">Trivia battle</b><span class="small" style="opacity:.8">${qi < total ? `Question ${qi + 1} of ${total}` : 'Finished'}</span></div>
      ${q ? `<b style="display:block">${esc(q[0])}</b><div class="col" style="gap:6px">${q[1].map((o, i) => `<button class="popt" data-a="triviaAns" data-v="${m.id}" data-i="${i}"><span class="pt">${esc(o)}</span></button>`).join('')}</div>`
        : `<b>You scored ${score(S.me)}/${total}</b>`}
      ${board.length ? `<div class="sec" style="color:inherit;opacity:.75">Scoreboard</div>${board.map((x, i) => `<div class="row small" style="gap:8px">${i === 0 && x.done ? ic('star', 14) : `<span style="width:14px">${i + 1}</span>`}${av(x.u, 22)}<span class="grow">${esc(dname(x.u).split(' ')[0])}</span><b>${x.s}/${total}</b>${x.done ? '' : '<span style="opacity:.7">playing…</span>'}</div>`).join('')}` : ''}</div>`;
  }
  return '';
}

/* ---------------- watch together (YouTube) ---------------- */
const ytId = u => { const m = String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(u) ? u : ''); };
let yt = null, ytReady = null, ytApplying = 0, ytConv = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise(res => {
    if (window.YT && window.YT.Player) return res();
    window.onYouTubeIframeAPIReady = () => res();
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => res('fail'); document.head.appendChild(s);
  });
  return ytReady;
}
async function paintWatch() {
  const c = S.page === 'messages' ? convOf(S.conv) : null, w = c?.watch;
  let layer = document.getElementById('watchLayer');
  if (!w || !w.vid) { if (layer) { layer.remove(); yt = null; ytConv = null; } return; }
  if (!layer || layer.dataset.vid !== w.vid || ytConv !== c.id) {
    if (layer) layer.remove();
    layer = document.createElement('div'); layer.id = 'watchLayer'; layer.className = 'glass'; layer.dataset.vid = w.vid; ytConv = c.id;
    layer.innerHTML = `<div class="row spread wl-head"><span class="row" style="gap:8px">${ic('play', 14)}<b class="small">Watching together</b><span class="small mute" id="wlWho"></span></span><span class="row" style="gap:4px"><button class="ibtn sm" aria-label="Bigger" data-w="big">${ic('expand', 14)}</button><button class="ibtn sm" aria-label="Stop watching" data-w="stop">${ic('x', 14)}</button></span></div><div class="wl-frame"><div id="ytHost"></div></div>`;
    document.body.appendChild(layer);
    layer.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; if (b.dataset.w === 'big') layer.classList.toggle('big'); if (b.dataset.w === 'stop') { db().update('conversations/' + ytConv, { watch: null }); } });
    const ok = await loadYT();
    if (ok === 'fail' || !window.YT) { document.getElementById('ytHost').outerHTML = `<div class="empty small">Couldn't load YouTube here.</div>`; return; }
    yt = new YT.Player('ytHost', { videoId: w.vid, playerVars: { playsinline: 1, rel: 0, modestbranding: 1 }, events: {
      onReady: () => applyWatch(convOf(ytConv)?.watch, true),
      onStateChange: e => {
        if (now() < ytApplying) return;
        const st = e.data; if (st !== 1 && st !== 2) return;
        db().update('conversations/' + ytConv, { watch: { vid: w.vid, playing: st === 1, t: yt.getCurrentTime(), at: now(), by: S.me } }).catch(() => {});
      } } });
  } else applyWatch(w);
  const who = document.getElementById('wlWho'); if (who) who.textContent = w.by && w.by !== S.me ? '· synced with ' + dname(w.by).split(' ')[0] : '';
}
let lastApplied = 0;
function applyWatch(w, force) {
  if (!yt || !yt.seekTo || !w) return;
  if (!force && (w.by === S.me || w.at <= lastApplied)) return;
  lastApplied = w.at; ytApplying = now() + 900;
  const target = w.t + (w.playing ? (now() - w.at) / 1000 : 0);
  try { if (Math.abs((yt.getCurrentTime() || 0) - target) > 1.2) yt.seekTo(target, true); w.playing ? yt.playVideo() : yt.pauseVideo(); } catch {}
}

/* ---------------- drawing board ---------------- */
let board = null;
function openBoard(cid) {
  closeBoard();
  const c = convOf(cid); if (!c) return;
  const layer = document.createElement('div'); layer.id = 'boardLayer'; layer.className = 'overlay';
  const cols = ['#ffffff', '#5b7cff', '#9b6bff', '#ff8a4c', '#ff4d6d', '#35d58a', '#ffd84d', '#111111'];
  layer.innerHTML = `<div class="board glass"><div class="row spread"><b class="disp">Drawing board · ${esc(convName(c))}</b><div class="row" style="gap:6px"><button class="btn sm" data-b="clear">Clear</button><button class="ibtn sm" aria-label="Close board" data-b="close">${ic('x', 16)}</button></div></div>
    <canvas id="boardCv" aria-label="Shared drawing board"></canvas>
    <div class="row" style="gap:8px;flex-wrap:wrap">${cols.map((cl, i) => `<button class="acc ${i === 1 ? 'on' : ''}" style="width:30px;height:30px;background:${cl}" data-b="col" data-c="${cl}" aria-label="Colour ${cl}"></button>`).join('')}<span class="grow"></span>${[3, 7, 14].map((w, i) => `<button class="pill ${i === 1 ? 'on' : ''}" data-b="w" data-w="${w}">${['Fine', 'Medium', 'Bold'][i]}</button>`).join('')}<button class="pill" data-b="erase">Eraser</button></div></div>`;
  document.body.appendChild(layer);
  const cv = layer.querySelector('#boardCv'), ctx = cv.getContext('2d');
  board = { cid, cv, ctx, color: '#5b7cff', w: 7, erase: false, strokes: [], cur: null, layer, clearedAt: c.boardClearedAt || 0 };
  const fit = () => { const r = cv.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; redraw(); };
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); board.cur = { pts: [...pos(e)], c: board.erase ? 'erase' : board.color, w: board.w }; });
  cv.addEventListener('pointermove', e => { if (!board.cur) return; board.cur.pts.push(...pos(e)); drawStroke(board.cur); });
  cv.addEventListener('pointerup', () => { const s = board.cur; board.cur = null; if (!s || s.pts.length < 4) return; const pts = s.pts.map(v => Math.round(v * 1000) / 1000); board.strokes.push({ ...s, pts, at: now() }); db().add(`conversations/${cid}/board`, { pts, c: s.c, w: s.w, by: S.me, at: now() }).catch(() => toast('Couldn\'t save that stroke')); });
  layer.addEventListener('click', e => {
    const b = e.target.closest('[data-b]'); if (e.target === layer) return closeBoard(); if (!b) return;
    const k = b.dataset.b;
    if (k === 'close') closeBoard();
    if (k === 'clear') db().update('conversations/' + cid, { boardClearedAt: now() });
    if (k === 'col') { board.color = b.dataset.c; board.erase = false; layer.querySelectorAll('[data-b=col],[data-b=erase]').forEach(x => x.classList.toggle('on', x === b)); }
    if (k === 'w') { board.w = +b.dataset.w; layer.querySelectorAll('[data-b=w]').forEach(x => x.classList.toggle('on', x === b)); }
    if (k === 'erase') { board.erase = true; layer.querySelectorAll('[data-b=col],[data-b=erase]').forEach(x => x.classList.toggle('on', x === b)); }
  });
  board.unsub = db().listen(`conversations/${cid}/board`, [], r => { board && (board.strokes = r.filter(s => s.at > board.clearedAt).sort((a, b) => a.at - b.at), redraw()); }, { order: ['at', 'asc'], limit: 2000 });
  board.unConv = db().listenDoc('conversations/' + cid, d => { if (!board || !d) return; board.clearedAt = d.boardClearedAt || 0; board.strokes = board.strokes.filter(s => s.at > board.clearedAt); redraw(); });
  board.onResize = fit; window.addEventListener('resize', fit); requestAnimationFrame(fit);
}
function drawStroke(s) {
  const { cv, ctx } = board, W = cv.width, H = cv.height;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = s.w * devicePixelRatio * (W / devicePixelRatio / 700);
  if (s.c === 'erase') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth *= 2.5; } else ctx.strokeStyle = s.c;
  ctx.beginPath(); ctx.moveTo(s.pts[0] * W, s.pts[1] * H); for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i] * W, s.pts[i + 1] * H); ctx.stroke(); ctx.restore();
}
function redraw() { if (!board) return; board.ctx.clearRect(0, 0, board.cv.width, board.cv.height); board.strokes.forEach(drawStroke); if (board.cur) drawStroke(board.cur); }
function closeBoard() { if (!board) return; board.unsub && board.unsub(); board.unConv && board.unConv(); window.removeEventListener('resize', board.onResize); board.layer.remove(); board = null; }

/* ---------------- Nexa Wrapped ---------------- */
async function buildWrapped() {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const since = start.getTime(); const convs = sortedConvs(true);
  let sent = 0, received = 0, words = 0, voice = 0, photos = 0; const per = {}, days = [0, 0, 0, 0, 0, 0, 0], reacts = {};
  await Promise.all(convs.map(async c => {
    let list = []; try { list = await db().query(`conversations/${c.id}/messages`, [], { order: ['at', 'desc'], limit: 500 }); } catch {}
    list.filter(m => m.at >= since && !m.system && !m.deleted).forEach(m => {
      const mine = m.from === S.me && !m.bot;
      if (mine) { sent++; words += (m.text || '').split(/\s+/).filter(Boolean).length; if (m.audio) voice++; if (m.images || m.image) photos++; days[new Date(m.at).getDay()]++; }
      else if (!m.bot) received++;
      if (c.type === 'dm') { const o = others(c)[0]; per[o] = (per[o] || 0) + 1; }
      Object.entries(m.reactions || {}).forEach(([r, us]) => { if ((us || []).includes(S.me)) reacts[r] = (reacts[r] || 0) + 1; });
    });
  }));
  const top = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const busiest = sent ? dayNames[days.indexOf(Math.max(...days))] : '';
  const evs = allEvents().filter(e => going(e) && new Date(e.date + 'T00:00').getTime() >= since).length;
  const favR = Object.entries(reacts).sort((a, b) => b[1] - a[1])[0];
  return { month: start.toLocaleDateString([], { month: 'long' }), sent, received, words, voice, photos, top, busiest, evs, favR: favR ? favR[0] : '', streak: Math.max(0, ...S.convs.map(streakOf)) };
}
function vWrapped(m) {
  const w = m.data, i = m.i || 0;
  if (!w) return `<div class="empty">${logo(56, true, 'logo-glow')}<b>Crunching your month…</b></div>`;
  const slides = [
    [`Your ${esc(w.month)} on Nexa`, `<div class="wbig">${w.sent + w.received}</div><div>messages sent and received</div>`],
    ['You said a lot', `<div class="wbig">${w.sent}</div><div>messages from you · ${w.words.toLocaleString()} words${w.voice ? ` · ${w.voice} voice notes` : ''}${w.photos ? ` · ${w.photos} photos` : ''}</div>`],
    ['Your people', w.top.length ? w.top.map(([u, n], k) => `<div class="row" style="gap:12px;justify-content:center">${av(u, k ? 44 : 64)}<div style="text-align:left"><b style="font-size:${k ? 16 : 20}px">${esc(dname(u))}</b><div class="small" style="opacity:.8">${n} messages</div></div></div>`).join('') : '<div>Start chatting with friends to see your top people.</div>'],
    ['Your vibe', `<div class="col" style="gap:14px;align-items:center">${w.busiest ? `<div>You're most chatty on <b>${w.busiest}</b></div>` : ''}${w.favR ? `<div>Favourite reaction <span style="font-size:40px">${esc(w.favR)}</span></div>` : ''}${w.streak ? `<div>Longest active streak: <b>${w.streak} days</b></div>` : ''}<div>${w.evs} event${w.evs === 1 ? '' : 's'} this month</div></div>`],
    ['See you next month', `<div>${logo(72, true, 'logo-glow')}</div><div>Thanks for being on Nexa.</div>`]
  ];
  const [t, body] = slides[i];
  return `<div class="wrapped" style="background:${['linear-gradient(160deg,#2b47d9,#9b6bff)', 'linear-gradient(160deg,#9b6bff,#ff4d6d)', 'linear-gradient(160deg,#ff8a4c,#ff4d6d)', 'linear-gradient(160deg,#0c3b4a,#2fd4c4)', 'linear-gradient(160deg,#1b1238,#e0673f)'][i]}">
    <div class="sbars">${slides.map((_, k) => `<i><b style="width:${k <= i ? 100 : 0}%"></b></i>`).join('')}</div>
    <button class="ibtn" style="position:absolute;right:12px;top:22px;background:rgba(0,0,0,.25)" aria-label="Close" data-a="closeModal">${ic('x', 16)}</button>
    <div class="sec" style="color:#fff;opacity:.85">Nexa Wrapped</div><h2 class="disp" style="margin:0;font-size:26px">${t}</h2><div class="wbody">${body}</div>
    <div class="row spread" style="width:100%"><button class="btn sm" style="background:rgba(0,0,0,.25);color:#fff" data-a="wrapStep" data-v="-1" ${i ? '' : 'disabled'}>Back</button><button class="btn sm" style="background:#fff;color:#111" data-a="${i < slides.length - 1 ? 'wrapStep' : 'closeModal'}" data-v="1">${i < slides.length - 1 ? 'Next' : 'Done'}</button></div></div>`;
}

/* ---------------- account security: device PIN + login alerts ---------------- */
const deviceId = (() => { let d = lsGet('nexa.device', null); if (!d) { d = Math.random().toString(36).slice(2, 12); lsSet('nexa.device', d); } return d; })();
const deviceName = () => { const ua = navigator.userAgent; const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'a device'; const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'a browser'; return `${br} on ${os}`; };
async function checkDevice() {
  const devs = S.prefs.devices || {};
  if (devs[deviceId]) { if (now() - (devs[deviceId].seen || 0) > 864e5) db().update(`users/${S.me}/private/prefs`, { ['devices.' + deviceId + '.seen']: now() }).catch(() => {}); return; }
  const first = !Object.keys(devs).length;
  await db().update(`users/${S.me}/private/prefs`, { ['devices.' + deviceId]: { name: deviceName(), first: now(), seen: now() } }).catch(() => {});
  if (!first) db().add('notifications', { to: S.me, from: S.me, type: 'security', title: 'New login to your account', body: `${deviceName()} · ${new Date().toLocaleString()}. Not you? Change your password in Settings.`, at: now(), read: false, link: { page: 'settings' } }).catch(() => {});
}
const pinKey = () => 'nexa.pin.' + S.me;
const hasPin = () => !!lsGet(pinKey(), null);
async function pinHash(p) { return sha256hex(S.me + ':' + p); }
async function sha256hex(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return 'h' + h; } }
let hiddenAt2 = 0;
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hiddenAt2 = now(); else if (S.me && hasPin() && hiddenAt2 && now() - hiddenAt2 > 5 * 60e3) { S.locked = true; S.form.pinIn = ''; render(); } });
function vLock() {
  return `<div class="onb"><div class="card glass col${A('lock')}" style="text-align:center;align-items:center;max-width:380px">${logo(52)}<h2 class="h1" style="font-size:22px">Nexa is locked</h2><p class="mute" style="margin:0">Enter your 4-digit PIN.</p>
    <form class="col" style="width:100%;align-items:center" data-submit="unlock"><input class="inp pin" id="pinIn" data-model="form.pinIn" inputmode="numeric" maxlength="4" autocomplete="off" type="password" value="${esc(S.form.pinIn || '')}" data-autofocus aria-label="PIN">
    ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}<button class="btn pri" style="width:100%">Unlock</button></form>
    <button class="small mute" style="text-decoration:underline" data-a="pinForgot">Forgot PIN? Log out</button></div></div>`;
}

/* ---------------- onboarding tour ---------------- */
const TOUR = [
  ['home', 'Home', 'Your day at a glance: moments, recent chats, plans and friend requests.'],
  ['messages', 'Messages', 'Chat one-on-one or in groups. Tap + for polls, games and more, and the phone icon to call.'],
  ['people', 'People', 'Find everyone on Nexa, add friends and give them private nicknames.'],
  ['events', 'Events', 'Plan hangouts, RSVP, and chat with everyone going.'],
  ['settings', 'Settings', 'Make Nexa yours: themes, backgrounds, privacy and your profile.'],
  ['ai', 'Nexa AI', 'Stuck? Ask Nexa AI anything about the app, or type @nexa in any chat.']
];
function paintTour() {
  let layer = document.getElementById('tourLayer');
  if (S.tour == null || S.view !== 'app') { if (layer) layer.remove(); return; }
  const [key, title, text] = TOUR[S.tour];
  const target = [...document.querySelectorAll(`[data-tour="${key}"]`)].find(el => el.offsetParent !== null);
  if (!layer) { layer = document.createElement('div'); layer.id = 'tourLayer'; document.body.appendChild(layer); layer.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; if (b.dataset.t === 'next') { S.tour = S.tour + 1 >= TOUR.length ? null : S.tour + 1; if (S.tour == null) savePrefs({ tourDone: true }); } else { S.tour = null; savePrefs({ tourDone: true }); } paintTour(); }); }
  const r = target ? target.getBoundingClientRect() : { left: innerWidth / 2 - 40, top: innerHeight / 2 - 20, width: 80, height: 40 };
  const tipW = Math.min(300, innerWidth - 24);
  let tx = r.left + r.width + 16, ty = r.top - 10;
  if (tx + tipW > innerWidth - 12) { tx = Math.max(12, Math.min(innerWidth - tipW - 12, r.left + r.width / 2 - tipW / 2)); ty = r.top > innerHeight / 2 ? r.top - 170 : r.top + r.height + 14; }
  layer.innerHTML = `<div class="tour-spot" style="left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px"></div>
    <div class="tour-tip glass" style="left:${tx}px;top:${Math.max(12, Math.min(innerHeight - 180, ty))}px;width:${tipW}px"><div class="sec">${S.tour + 1} of ${TOUR.length}</div><b class="disp" style="font-size:17px">${title}</b><p class="small mute" style="margin:0;line-height:1.5">${text}</p><div class="row spread"><button class="small mute" data-t="skip">Skip tour</button><button class="btn sm pri" data-t="next">${S.tour + 1 === TOUR.length ? 'Done' : 'Next'}</button></div></div>`;
}

/* ---------------- skeletons ---------------- */
const skelRows = (n, sz = 44) => Array.from({ length: n }, (_, i) => `<div class="item skel-row" aria-hidden="true"><span class="skel" style="width:${sz}px;height:${sz}px;border-radius:50%"></span><span class="grow col" style="gap:8px"><span class="skel" style="width:${50 + (i * 17) % 35}%;height:12px"></span><span class="skel" style="width:${70 - (i * 11) % 30}%;height:10px"></span></span></div>`).join('');
const skelBubbles = () => `<div class="col" style="gap:12px;padding:10px 0" aria-hidden="true">${[['60%', 'them'], ['40%', 'me'], ['52%', 'them'], ['35%', 'me'], ['48%', 'me']].map(([w, s]) => `<span class="skel" style="width:${w};height:38px;border-radius:18px;align-self:${s === 'me' ? 'flex-end' : 'flex-start'}"></span>`).join('')}</div>`;

/* ---------------- v4 modals ---------------- */
function vModal4(m, f, head) {
  if (m.type === 'schedule') {
    const c = convOf(S.conv), mine = (S.scheduled || []).filter(x => x.conv === S.conv).sort((a, b) => a.at - b.at);
    const def = new Date(now() + 3600e3); def.setMinutes(0, 0, 0);
    const local = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return head('Schedule a message', `Sends to ${esc(c ? convName(c) : 'this chat')} at the time you pick.`) + `
      <label class="field">Message<textarea class="inp" id="sch-text" data-model="form.schText" rows="3" maxlength="2000">${esc(f.schText ?? '')}</textarea></label>
      <label class="field">Send at<input class="inp" id="sch-at" type="datetime-local" data-model="form.schAt" value="${esc(f.schAt || local(def))}" min="${local(new Date())}"></label>
      <div class="mute small" style="line-height:1.5">It sends on time while Nexa is open on any of your devices — otherwise the moment you next open it.</div>
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      ${mine.length ? `<div class="sec">Scheduled in this chat</div>${mine.map(x => `<div class="item">${ic('clock', 18)}<span class="grow"><span class="small ellip" style="display:block">${esc(x.text)}</span><span class="mute small">${new Date(x.at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></span><button class="btn sm" data-a="schCancel" data-v="${x.id}">Cancel</button></div>`).join('')}` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Close</button><button class="btn pri" data-a="schSave">${ic('clock', 16)} Schedule</button></div>`;
  }
  if (m.type === 'mood') {
    return head('Set a status', 'Friends see it next to your name until it expires.') + `
      <div class="pills">${MOODS.map(([t]) => `<button class="chip ${f.moodText === t ? 'on' : ''}" style="${f.moodText === t ? 'border-color:var(--ac)' : ''}" data-a="moodPick" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <label class="field">Or write your own<input class="inp" id="mood-text" data-model="form.moodText" value="${esc(f.moodText || '')}" maxlength="40" placeholder="What's up?"></label>
      <div class="field">Clear after<div class="pills">${[[3600e3, '1 hour'], [4 * 3600e3, '4 hours'], ['today', 'Today'], [7 * 864e5, 'This week']].map(([v, l]) => `<button class="pill ${String(f.moodFor || 3600e3 * 4) === String(v) ? 'on' : ''}" data-a="moodFor" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="row" style="justify-content:flex-end;gap:10px">${moodOf(S.me) ? '<button class="btn" data-a="moodClear">Clear status</button>' : ''}<button class="btn pri" data-a="moodSave">Set status</button></div>`;
  }
  if (m.type === 'wordNew') return head('Word guess', 'Pick a secret word. Friends guess it letter by letter.') + `
      <label class="field">Secret word or phrase<input class="inp" id="w-word" data-model="form.wWord" value="${esc(f.wWord || '')}" maxlength="24" placeholder="e.g. PIZZA NIGHT" autocomplete="off" data-autofocus></label>
      <label class="field">Hint <span style="font-weight:500">(optional)</span><input class="inp" id="w-hint" data-model="form.wHint" value="${esc(f.wHint || '')}" maxlength="60"></label>
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="wordStart">Start game</button></div>`;
  if (m.type === 'watchNew') return head('Watch together', 'Paste a YouTube link. Play, pause and skip stay in sync for everyone in this chat.') + `
      <label class="field">YouTube link<input class="inp" id="yt-url" data-model="form.ytUrl" value="${esc(f.ytUrl || '')}" placeholder="https://youtube.com/watch?v=…" data-autofocus></label>
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="watchStart">${ic('play', 14)} Start watching</button></div>`;
  if (m.type === 'joinGroup') {
    const iv = m.inv; if (!iv) return head('Group invite') + '<div class="empty">This invite link is no longer valid.</div>';
    return head('Join group') + `<div class="row">${`<span class="av group" style="width:60px;height:60px;font-size:20px;--grad:${gradFor(iv.convId)}">${esc(initials(iv.name))}</span>`}<div><b class="disp" style="font-size:20px">${esc(iv.name)}</b><div class="mute small">Invited by ${esc(U(iv.by)?.name || 'a Nexa user')}</div></div></div>
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Not now</button><button class="btn pri" data-a="joinGroupYes" ${S.busy ? 'disabled' : ''}>Join group</button></div>`;
  }
  if (m.type === 'wrapped') return vWrapped(m);
  if (m.type === 'pinSet') return head(hasPin() ? 'Change app lock PIN' : 'Set an app lock PIN', 'Nexa will ask for this PIN on this device when you come back after 5 minutes away.') + `
      <label class="field">New 4-digit PIN<input class="inp pin" id="pin1" data-model="form.pin1" inputmode="numeric" maxlength="4" type="password" autocomplete="off" value="${esc(f.pin1 || '')}" data-autofocus></label>
      <label class="field">Repeat PIN<input class="inp pin" id="pin2" data-model="form.pin2" inputmode="numeric" maxlength="4" type="password" autocomplete="off" value="${esc(f.pin2 || '')}"></label>
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="pinSave">Save PIN</button></div>`;
  return null;
}

/* ---------------- v4 actions ---------------- */
Object.assign(actions, {
  // stickers
  stickerEdit: () => { S.stickerEdit = !S.stickerEdit; render(); },
  sendMySticker: d => { const u = (S.myStickers || [])[+d.i]; if (!u) return; S.picker = false; render(); sendMessage({ stickerImg: u }); },
  delMySticker: async d => { const list = [...(S.myStickers || [])]; list.splice(+d.i, 1); await db().set(`users/${S.me}/private/stickers`, { list }); },
  saveSticker: async d => { const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); const u = safeImg(m?.stickerImg); if (!u) return; const list = [...(S.myStickers || [])]; if (list.includes(u)) return toast('Already in your stickers'); if (list.length >= 24) return toast('You can keep up to 24 stickers'); list.push(u); await db().set(`users/${S.me}/private/stickers`, { list }); toast('Added to your stickers'); },
  // shared wallpaper
  shareWall: async () => {
    const c = convOf(S.conv); if (!c) return; const p = (S.prefs.chatBgs || {})[c.id] || {};
    let wall = null;
    if (p.theme) { const t = (S.prefs.themes || []).find(x => x.id === p.theme); if (t) wall = { theme: { c1: t.c1, c2: t.c2, c3: t.c3 } }; }
    else if (p.image) wall = { image: p.image }; else wall = { preset: p.preset || S.prefs.defaultBg };
    await db().update('conversations/' + c.id, { wallpaper: { ...wall, by: S.me, at: now() } });
    const cb = { ...(S.prefs.chatBgs || {}) }; delete cb[c.id]; savePrefs({ chatBgs: cb });
    await sendMessage({ system: true, text: `${S.profile.name.split(' ')[0]} changed the chat wallpaper` }, c.id);
    S.bgPop = false; render();
  },
  clearWall: async () => { const c = convOf(S.conv); if (!c) return; await db().update('conversations/' + c.id, { wallpaper: null }); S.bgPop = false; render(); },
  // scheduling
  schOpen: () => { S.attach = false; S.form.schText = S.draft[S.conv] || ''; S.form.schAt = ''; S.authErr = ''; S.modal = { type: 'schedule' }; render(); },
  schSave: async () => {
    const t = (S.form.schText || '').trim(); const def = new Date(now() + 3600e3); def.setMinutes(0, 0, 0);
    const at = S.form.schAt ? new Date(S.form.schAt).getTime() : def.getTime();
    if (!t) { S.authErr = 'Write a message first.'; return render(); }
    if (!(at > now() + 30e3)) { S.authErr = 'Pick a time in the future.'; return render(); }
    const items = [...(S.scheduled || []), { id: 's' + now().toString(36), conv: S.conv, text: t.slice(0, 2000), at }];
    await db().set(`users/${S.me}/private/scheduled`, { items }); S.scheduled = items;
    if ((S.draft[S.conv] || '').trim() === t) S.draft[S.conv] = '';
    S.modal = null; render(); toast('Scheduled for ' + new Date(at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }));
  },
  schCancel: async d => { const items = (S.scheduled || []).filter(x => x.id !== d.v); await db().set(`users/${S.me}/private/scheduled`, { items }); S.scheduled = items; render(); },
  // transcripts
  transcribe: async d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); const src = safeAudio(m?.audio?.src); if (!src) return;
    if (!S.be.ai) return toast('Transcripts use Nexa AI, which works on the live version.');
    S.transcribing = { ...(S.transcribing || {}), [m.id]: true }; render();
    try {
      const [, mime, b64] = src.match(/^data:([^;,]+)[^,]*,(.*)$/);
      const out = await S.be.ai.generate([{ text: 'Transcribe this voice message word for word. Reply with only the transcript. If it is silent or unclear, reply with: (no speech)' }, { inlineData: { mimeType: mime, data: b64 } }], AI_SYSTEM);
      await db().update(`conversations/${S.conv}/messages/${m.id}`, { transcript: String(out).trim().slice(0, 2000) });
    } catch { toast('Couldn\'t transcribe that one. Try again in a moment.'); }
    delete S.transcribing[m.id]; render();
  },
  // statuses
  moodOpen: () => { S.form.moodText = moodOf(S.me) || ''; S.form.moodFor = 4 * 3600e3; S.modal = { type: 'mood' }; S.menu = null; render(); },
  moodPick: d => { S.form.moodText = d.v; render(); },
  moodFor: d => { S.form.moodFor = d.v === 'today' ? 'today' : +d.v; render(); },
  moodSave: async () => {
    const t = (S.form.moodText || '').trim().slice(0, 40); if (!t) return actions.moodClear();
    let until = now() + (+S.form.moodFor || 4 * 3600e3); if (S.form.moodFor === 'today') { const e = new Date(); e.setHours(23, 59, 59, 0); until = e.getTime(); }
    S.modal = null; render(); await db().update('users/' + S.me, { mood: { text: t, until } }); toast('Status set');
  },
  moodClear: async () => { S.modal = null; render(); await db().update('users/' + S.me, { mood: null }); },
  // group roles & invites
  setRole: async d => { const c = convOf(S.modal?.id); if (!c) return; await db().update('conversations/' + c.id, { ['roles.' + d.v]: d.r }); toast(d.r === 'admin' ? 'Made admin' : 'Admin removed'); },
  groupLink: async () => {
    const c = convOf(S.modal?.id); if (!c) return;
    let code = c.inviteCode;
    if (!code) { code = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8); await db().set('groupInvites/' + code, { convId: c.id, name: c.name || 'Group', by: S.me, at: now() }); await db().update('conversations/' + c.id, { inviteCode: code }); }
    const link = location.origin + location.pathname + '?join=' + code;
    if (navigator.share && innerWidth <= 1100) { try { await navigator.share({ title: c.name, text: `Join ${c.name} on Nexa`, url: link }); return; } catch {} }
    try { await navigator.clipboard.writeText(link); toast('Invite link copied'); } catch { toast(esc(link)); }
  },
  groupLinkReset: async () => { const c = convOf(S.modal?.id); if (!c?.inviteCode) return; await db().del('groupInvites/' + c.inviteCode).catch(() => {}); await db().update('conversations/' + c.id, { inviteCode: '' }); toast('Old invite link turned off'); },
  joinGroupYes: async () => {
    const iv = S.modal?.inv; if (!iv) return; S.busy = true; render();
    try { await db().update('conversations/' + iv.convId, { members: ops.union(S.me), ['roles.' + S.me]: 'member', lastJoin: iv.code }); S.modal = null; await new Promise(r => setTimeout(r, 400)); await sendMessage({ system: true, text: `${S.profile.name.split(' ')[0]} joined with an invite link` }, iv.convId).catch(() => {}); openConv(iv.convId); confetti(); }
    catch { toast('This invite link doesn\'t work anymore.'); S.modal = null; }
    S.busy = false; render();
  },
  // games
  c4Drop: async d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m?.game || S.gameBusy) return;
    const g = { ...m.game }, x = +d.i; if (c4Winner(g.b)) return;
    if (!g.y && g.r !== S.me) g.y = S.me;
    const mark = g.r === S.me && g.turn === 'R' ? 'R' : g.y === S.me && g.turn === 'Y' ? 'Y' : null;
    if (!mark) return toast(g.r === S.me || g.y === S.me ? 'Wait for your turn' : 'This game already has two players');
    let row = -1; for (let y = C4H - 1; y >= 0; y--) if (g.b[y * C4W + x] === '_') { row = y; break; }
    if (row < 0) return toast('That column is full');
    const i = row * C4W + x; g.b = g.b.slice(0, i) + mark + g.b.slice(i + 1); g.turn = mark === 'R' ? 'Y' : 'R';
    S.gameBusy = true; sound('pop');
    try { await db().update(`conversations/${S.conv}/messages/${m.id}`, { game: g }); } finally { S.gameBusy = false; }
    const w = c4Winner(g.b); if (w && w.p === mark) confetti();
  },
  wordNewOpen: () => { S.attach = false; S.form.wWord = ''; S.form.wHint = ''; S.authErr = ''; S.modal = { type: 'wordNew' }; render(); },
  wordStart: async () => {
    const w = (S.form.wWord || '').toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
    if (w.replace(/ /g, '').length < 3) { S.authErr = 'Use at least 3 letters (A–Z).'; return render(); }
    S.modal = null; render(); await sendMessage({ game: { t: 'word', w, g: '', by: S.me, hint: (S.form.wHint || '').trim().slice(0, 60) } });
  },
  wordGuess: async d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m?.game || m.game.by === S.me) return;
    const g = { ...m.game }; if ((g.g || '').includes(d.k)) return;
    g.g = (g.g || '') + d.k; g.last = S.me; sound('pop');
    await db().update(`conversations/${S.conv}/messages/${m.id}`, { game: g });
    if ([...g.w].every(ch => ch === ' ' || g.g.includes(ch))) confetti();
  },
  triviaAns: async d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m?.game || S.gameBusy) return;
    const g = { ...m.game, ans: { ...(m.game.ans || {}) } }, mine = [...(g.ans[S.me] || [])];
    if (mine.length >= g.qs.length) return;
    const qi = mine.length, right = TRIVIA[g.qs[qi]][2] === +d.i;
    mine.push(+d.i); g.ans[S.me] = mine; sound(right ? 'send' : 'pop');
    toast(right ? 'Correct!' : `Not quite — it was ${esc(TRIVIA[g.qs[qi]][1][TRIVIA[g.qs[qi]][2]])}`);
    S.gameBusy = true;
    try { await db().update(`conversations/${S.conv}/messages/${m.id}`, { ['game.ans.' + S.me]: mine }); } finally { S.gameBusy = false; }
  },
  // watch together
  watchOpen: () => { S.attach = false; S.form.ytUrl = ''; S.authErr = ''; S.modal = { type: 'watchNew' }; render(); },
  watchStart: async () => {
    const vid = ytId((S.form.ytUrl || '').trim()); if (!vid) { S.authErr = 'That doesn\'t look like a YouTube link.'; return render(); }
    S.modal = null; render();
    await db().update('conversations/' + S.conv, { watch: { vid, playing: false, t: 0, at: now(), by: S.me } });
    await sendMessage({ system: true, text: `${S.profile.name.split(' ')[0]} started a watch party` });
  },
  // drawing board
  boardOpen: () => { S.attach = false; S.menu = null; render(); openBoard(S.conv); },
  // wrapped
  wrappedOpen: async () => { S.modal = { type: 'wrapped', i: 0 }; render(); const data = await buildWrapped(); if (S.modal?.type === 'wrapped') { S.modal.data = data; render(); } },
  wrapStep: d => { const m = S.modal; if (!m?.data) return; m.i = Math.max(0, Math.min(4, (m.i || 0) + +d.v)); render(); },
  // security
  sendVerify: async () => { try { await S.be.auth.sendVerify(); toast('Verification email sent — check your inbox'); } catch (e) { toast(esc(e.message)); } },
  checkVerify: async () => { const v = await S.be.auth.refresh(); S.verified = v; render(); toast(v ? 'Email verified' : 'Not verified yet — tap the link in the email first'); },
  pinOpen: () => { S.form.pin1 = ''; S.form.pin2 = ''; S.authErr = ''; S.modal = { type: 'pinSet' }; render(); },
  pinSave: async () => { const a = S.form.pin1 || '', b = S.form.pin2 || ''; if (!/^\d{4}$/.test(a)) { S.authErr = 'Use exactly 4 digits.'; return render(); } if (a !== b) { S.authErr = 'The PINs don\'t match.'; return render(); } lsSet(pinKey(), await pinHash(a)); S.modal = null; S.form.pin1 = S.form.pin2 = ''; render(); toast('App lock is on for this device'); },
  pinRemove: () => { lsSet(pinKey(), null); render(); toast('App lock turned off'); },
  pinForgot: () => { lsSet(pinKey(), null); S.locked = false; S.be.auth.signOut(); },
  logoutAll: () => confirmModal('Forget other devices?', 'Clears your device list. Nexa will alert you the next time any device logs in. To fully sign others out, change your password.', 'Forget devices', async () => { await db().update(`users/${S.me}/private/prefs`, { devices: { [deviceId]: { name: deviceName(), first: now(), seen: now() } } }); toast('Device list cleared'); }, false),
  tourStart: () => { S.tour = 0; go('home'); setTimeout(paintTour, 350); },
  prefFlag: d => savePrefs({ [d.k]: !S.prefs[d.k] }),
  prefFlagInv: d => savePrefs({ [d.k]: S.prefs[d.k] === false })
});
Object.assign(files, {
  newSticker: async f => { S.attach = false; S.picker = false; render(); const u = await makeSticker(f); const list = [...(S.myStickers || [])]; if (list.length < 24) { list.push(u); await db().set(`users/${S.me}/private/stickers`, { list }); } await sendMessage({ stickerImg: u }); },
  wallImg: async f => { const url = await compress(f, 900, .7); const c = convOf(S.conv); if (!c) return; await db().update('conversations/' + c.id, { wallpaper: { image: url, by: S.me, at: now() } }); const cb = { ...(S.prefs.chatBgs || {}) }; delete cb[c.id]; savePrefs({ chatBgs: cb }); await sendMessage({ system: true, text: `${S.profile.name.split(' ')[0]} changed the chat wallpaper` }, c.id); S.bgPop = false; render(); }
});

/* =====================================================================
   v5a — requests, folders, effects, translate, deadlines, drafts, offline,
   sounds, quick reply, photo safety, event album & place, widgets, badges,
   export, accessibility
   ===================================================================== */

/* ---------------- message requests ---------------- */
const isRequestForMe = c => !!(c.request && c.request.from && c.request.from !== S.me && !isFriend(c.request.from));
const isRequestFromMe = c => !!(c.request && c.request.from === S.me && !others(c).every(isFriend));
const canDM = uid => isFriend(uid) || (U(uid)?.allowMessages || 'everyone') !== 'friends';

/* ---------------- effects ---------------- */
const EFFECTS = [['confetti', 'Confetti'], ['balloons', 'Balloons'], ['hearts', 'Hearts'], ['fireworks', 'Fireworks'], ['slam', 'Slam']];
function playFx(kind) {
  if (kind === 'confetti') return confetti();
  if (kind === 'slam' || !S.prefs.effects || S.prefs.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'fx'; c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; document.body.appendChild(c);
  const x = c.getContext('2d'); x.scale(devicePixelRatio, devicePixelRatio);
  const W = innerWidth, H = innerHeight, cols = ['#5b7cff', '#9b6bff', '#ff8a4c', '#ff4d6d', '#2fd4c4', '#ffd84d'];
  let ps = [], dur = 2600;
  const heart = (px, py, s) => { x.beginPath(); x.moveTo(px, py + s / 4); x.bezierCurveTo(px, py, px - s / 2, py, px - s / 2, py + s / 4); x.bezierCurveTo(px - s / 2, py + s / 2, px, py + s * .7, px, py + s); x.bezierCurveTo(px, py + s * .7, px + s / 2, py + s / 2, px + s / 2, py + s / 4); x.bezierCurveTo(px + s / 2, py, px, py, px, py + s / 4); x.fill(); };
  if (kind === 'hearts') ps = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: H + Math.random() * 300, vy: -(2 + Math.random() * 3), s: 14 + Math.random() * 22, c: ['#ff4d6d', '#ff8ab0', '#ff2f6d'][Math.floor(Math.random() * 3)], w: Math.random() * 6 }));
  if (kind === 'balloons') ps = Array.from({ length: 28 }, () => ({ x: Math.random() * W, y: H + Math.random() * 400, vy: -(1.6 + Math.random() * 2), s: 26 + Math.random() * 20, c: cols[Math.floor(Math.random() * cols.length)], w: Math.random() * 6 }));
  if (kind === 'fireworks') { dur = 2400; for (let b = 0; b < 5; b++) { const cx = W * (.15 + Math.random() * .7), cy = H * (.15 + Math.random() * .4), col = cols[b % cols.length], t0 = b * 320; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, sp = 2 + Math.random() * 4; ps.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: col, t0, s: 2.4 }); } } }
  const t0 = performance.now();
  (function f(t) {
    const el = t - t0, k = el / dur; x.clearRect(0, 0, W, H);
    ps.forEach(p => {
      if (kind === 'hearts') { p.y += p.vy; p.x += Math.sin((el / 400) + p.w) * .8; x.globalAlpha = Math.max(0, 1 - k * .9); x.fillStyle = p.c; heart(p.x, p.y, p.s); }
      if (kind === 'balloons') { p.y += p.vy; p.x += Math.sin((el / 600) + p.w) * .6; x.globalAlpha = Math.max(0, 1 - k * .7); x.fillStyle = p.c; x.beginPath(); x.ellipse(p.x, p.y, p.s * .8, p.s, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.moveTo(p.x, p.y + p.s); x.quadraticCurveTo(p.x + 6, p.y + p.s * 1.6, p.x, p.y + p.s * 2.4); x.stroke(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(p.x - p.s * .3, p.y - p.s * .4, p.s * .15, p.s * .25, -.5, 0, Math.PI * 2); x.fill(); }
      if (kind === 'fireworks') { if (el < p.t0) return; p.x += p.vx; p.y += p.vy; p.vy += .05; p.vx *= .985; x.globalAlpha = Math.max(0, 1 - (el - p.t0) / 1400); x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.s, 0, Math.PI * 2); x.fill(); }
    });
    k < 1 ? requestAnimationFrame(f) : c.remove();
  })(t0);
}
const playedFx = new Set();
function maybePlayFx(c) {
  if (S.page !== 'messages' || S.conv !== c.id) return;
  (S.msgs[c.id] || []).forEach(m => { if (m.effect && !playedFx.has(m.id)) { playedFx.add(m.id); if (now() - m.at < 10 * 60e3) setTimeout(() => playFx(m.effect), 150); } });
}

/* ---------------- per-friend sounds ---------------- */
const TONES = { chime: [[880, 0], [1320, .09]], pop: [[520, 0]], bell: [[1046, 0], [1318, .12], [1568, .24]], marimba: [[659, 0], [784, .08], [988, .16]], blip: [[1200, 0], [900, .06]], soft: [[440, 0], [660, .12]] };
const TONE_NAMES = { chime: 'Chime (default)', pop: 'Pop', bell: 'Bell', marimba: 'Marimba', blip: 'Blip', soft: 'Soft', silent: 'Silent' };
function playTone(name) {
  if (!S.prefs.sounds || name === 'silent') return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime;
    (TONES[name] || TONES.chime).forEach(([f, d]) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = name === 'marimba' ? 'triangle' : 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(.08, t + d + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d + .3); o.connect(g).connect(actx.destination); o.start(t + d); o.stop(t + d + .32); });
  } catch {}
}
const toneFor = uid => (S.prefs.friendSounds || {})[uid] || 'chime';

/* ---------------- drafts synced across devices ---------------- */
function watchDrafts() { unsubs.base.push(db().listenDoc(`users/${S.me}/private/drafts`, d => { S.remoteDrafts = d || {}; render(); })); }
let draftT = 0;
function saveDraftSoon() {
  clearTimeout(draftT); const cid = S.conv; if (!cid) return;
  draftT = setTimeout(() => { const t = (S.draft[cid] || '').trim(); if (((S.remoteDrafts || {})[cid] || '') === t) return; db().update(`users/${S.me}/private/drafts`, { [cid]: t ? t.slice(0, 2000) : ops.del() }).catch(() => {}); }, 1200);
}

/* ---------------- photo safety ---------------- */
async function classifyImages(urls) {
  if (!S.be.ai || S.prefs.safeCheck === false) return false;
  try {
    const parts = [{ text: 'You are a safety filter for a social app used by teenagers. Look at these images. Reply with exactly one word: SENSITIVE if any image contains nudity, sexual content, graphic violence, gore or self-harm; otherwise SAFE.' }];
    urls.slice(0, 3).forEach(u => { const m = String(u).match(/^data:([^;,]+)[^,]*,(.*)$/); if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } }); });
    if (parts.length < 2) return false;
    const out = await Promise.race([S.be.ai.generate(parts, AI_SYSTEM), new Promise(r => setTimeout(() => r('SAFE'), 5000))]);
    return /SENSITIVE/i.test(String(out));
  } catch { return false; }
}
const shouldBlur = (m) => m.from !== S.me && !(S.revealed || {})[m.id] && S.prefs.safePhotos !== false && (m.sensitive || (!isFriend(m.from) && convOf(S.conv)?.type === 'dm'));

/* ---------------- badges ---------------- */
const BADGES = [
  ['first_friend', 'First friend', 'Made your first friend', 'userplus', '#5b7cff'],
  ['social', 'Social butterfly', 'Have 10 friends', 'people', '#9b6bff'],
  ['chatter', 'Chatterbox', 'Sent 100 messages', 'msg', '#2fd4c4'],
  ['legend', 'Legend', 'Sent 1,000 messages', 'star', '#ffb547'],
  ['host', 'Host', 'Hosted an event', 'cal', '#ff8a4c'],
  ['party', 'Party animal', 'Went to 5 events', 'cake', '#ff4d6d'],
  ['streak7', 'On fire', 'A 7-day streak', 'flame', '#ff8a4c'],
  ['streak30', 'Unstoppable', 'A 30-day streak', 'flame', '#ff4d6d'],
  ['night_owl', 'Night owl', 'Chatted between 1 and 4 am', 'moon', '#3b3f9e'],
  ['storyteller', 'Storyteller', 'Shared a moment', 'spark', '#d46bff'],
  ['gamer', 'Game on', 'Played a chat game', 'game', '#3fbf6f'],
  ['early', 'Early adopter', 'Joined Nexa in 2026', 'shield', '#5b7cff']
];
function earnedNow() {
  const st = S.profile?.stats || {}, fr = friendIds().length, evs = allEvents();
  return {
    first_friend: fr >= 1, social: fr >= 10, chatter: (st.sent || 0) >= 100, legend: (st.sent || 0) >= 1000,
    host: evs.some(e => e.creator === S.me) || !!st.hosted, party: evs.filter(e => going(e) && e.creator !== S.me).length >= 5,
    streak7: Math.max(0, ...S.convs.map(c => c.streak?.count || 0)) >= 7, streak30: Math.max(0, ...S.convs.map(c => c.streak?.count || 0)) >= 30,
    night_owl: !!st.night, storyteller: (st.moments || 0) >= 1, gamer: (st.games || 0) >= 1, early: (S.profile?.createdAt || now()) < new Date('2027-01-01').getTime()
  };
}
function checkBadges() {
  if (!S.profile) return;
  const have = S.profile.badges || {}, e = earnedNow(), fresh = BADGES.filter(([id]) => e[id] && !have[id]);
  if (!fresh.length) return;
  const patch = {}; fresh.forEach(([id]) => patch['badges.' + id] = now());
  db().update('users/' + S.me, patch).catch(() => {});
  if (Object.keys(have).length) { fresh.forEach(b => toast(`<b>Badge unlocked:</b> ${esc(b[1])}`)); confetti(); }
}
const bumpStat = (k, v = 1) => db().update('users/' + S.me, { ['stats.' + k]: v === true ? true : ops.inc(v) }).catch(() => {});
const badgeChip = (b, got) => `<span class="badgechip ${got ? '' : 'locked'}" title="${esc(b[2])}"><span class="bi" style="background:${got ? b[4] : 'rgba(255,255,255,.08)'}">${ic(b[3], 15, 2)}</span><span><b class="small">${esc(b[1])}</b><span class="mute" style="display:block;font-size:11px">${esc(b[2])}</span></span></span>`;

/* ---------------- export ---------------- */
async function exportData(withPhotos) {
  toast('Preparing your download…');
  const convs = [];
  for (const c of sortedConvs(true, true)) {
    let list = []; try { list = await db().query(`conversations/${c.id}/messages`, [], { order: ['at', 'asc'], limit: 5000 }); } catch {}
    convs.push({ id: c.id, name: convName(c), type: c.type, members: c.members.map(u => ({ id: u, name: u === S.me ? S.profile.name : (U(u)?.name || ''), handle: u === S.me ? S.profile.handle : (U(u)?.handle || '') })),
      messages: list.filter(m => !m.deleted).map(m => ({ from: m.from === S.me ? 'me' : (U(m.from)?.name || m.from), at: new Date(m.at).toISOString(), text: m.text || '', type: msgLabel(m), ...(withPhotos && (m.images || m.image) ? { photos: m.images || [m.image] } : {}) })) });
  }
  const { devices, ...prefs } = S.prefs;
  const data = { exportedAt: new Date().toISOString(), app: 'Nexa', profile: { ...S.profile, email: S.email }, friends: friendIds().map(u => ({ name: U(u)?.name, handle: U(u)?.handle, nickname: nickOf(u) || undefined })),
    events: allEvents().filter(e => e.creator === S.me || going(e)).map(e => ({ title: e.title, date: e.date, time: e.time, place: e.place || '', hosting: e.creator === S.me })), settings: prefs, conversations: convs };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nexa-data-${todayKey()}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  toast('Your Nexa data is downloading');
}

/* ---------------- event album & place ---------------- */
function watchAlbum(eid) {
  if (unsubs.album && unsubs.albumId === eid) return;
  if (unsubs.album) unsubs.album();
  unsubs.albumId = eid;
  unsubs.album = db().listen(`events/${eid}/photos`, [], r => { S.album = r.sort((a, b) => b.at - a.at); render(); }, { order: ['at', 'desc'], limit: 200 });
}
function stopAlbum() { if (unsubs.album) unsubs.album(); unsubs.album = null; unsubs.albumId = null; S.album = []; }
const mapsLink = p => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p);

/* ---------------- modals ---------------- */
function vModal5(m, f, head) {
  if (m.type === 'folder') {
    const sel = f.fSel || [];
    return head(m.id ? 'Edit folder' : 'New folder', 'Group your chats — like School, Family or Gaming.') + `
      <label class="field">Folder name<input class="inp" id="f-name" data-model="form.fName" value="${esc(f.fName || '')}" maxlength="20" placeholder="School" data-autofocus></label>
      <div class="sec">Chats in this folder</div>
      <div class="col scroll" style="gap:4px;max-height:320px">${sortedConvs(true).map(c => `<button class="item ${sel.includes(c.id) ? 'on' : ''}" data-a="fPick" data-v="${c.id}">${convAv(c, 38, false)}<b class="grow ellip">${esc(convName(c))}</b><span class="tog ${sel.includes(c.id) ? 'on' : ''}" style="width:24px;height:24px;border-radius:8px" aria-hidden="true"></span></button>`).join('') || '<div class="empty">No chats yet.</div>'}</div>
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px">${m.id ? '<button class="btn danger" data-a="folderDel">Delete folder</button>' : ''}<button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="folderSave">Save</button></div>`;
  }
  if (m.type === 'effect') return head('Send with effect', (S.draft[S.conv] || '').trim() ? `“${esc((S.draft[S.conv] || '').trim().slice(0, 60))}”` : 'Type your message first, then pick an effect.') + `<div class="fxgrid">${EFFECTS.map(([k, l]) => `<button class="fxbtn" data-a="sendFx" data-v="${k}" ${(S.draft[S.conv] || '').trim() ? '' : 'disabled'}><span class="fxic fx-${k}"></span>${l}</button>`).join('')}</div>`;
  if (m.type === 'tone') {
    const cur = toneFor(m.uid);
    return head('Notification sound', `Plays when ${esc(dname(m.uid))} messages you while Nexa is open.`) + `<div class="col" style="gap:4px">${Object.entries(TONE_NAMES).map(([k, l]) => `<button class="item ${cur === k ? 'on' : ''}" data-a="setTone" data-v="${k}">${ic(k === 'silent' ? 'bellOff' : 'volume', 18)}<b class="grow">${l}</b>${cur === k ? ic('check', 16, 2.4) : ''}</button>`).join('')}</div>`;
  }
  if (m.type === 'export') return head('Download your data', 'A file with your profile, friends, chats and events.') + `
      <div class="setrow"><span><b>Include photos</b><div class="mute small">Makes the file much bigger.</div></span><button class="tog ${f.exPhotos ? 'on' : ''}" role="switch" aria-checked="${!!f.exPhotos}" aria-label="Include photos" data-a="exPhotos"></button></div>
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="exportGo">${ic('download', 16)} Download</button></div>`;
  return null;
}

/* ---------------- actions ---------------- */
Object.assign(actions, {
  // requests
  reqAccept: async () => { const c = convOf(S.conv); if (!c) return; await db().update('conversations/' + c.id, { request: null }); toast('Request accepted'); },
  reqDelete: async () => { const c = convOf(S.conv); if (!c) return; await db().update('conversations/' + c.id, { ['hidden.' + S.me]: now() }); S.conv = null; render(); },
  reqBlock: () => { const c = convOf(S.conv); if (c) actions.blockUser({ v: others(c)[0] }); },
  // folders
  folderNew: () => { S.form.fName = ''; S.form.fSel = S.conv ? [S.conv] : []; S.authErr = ''; S.modal = { type: 'folder' }; render(); },
  folderEdit: d => { const fo = (S.prefs.folders || []).find(x => x.id === d.v); if (!fo) return; S.form.fName = fo.name; S.form.fSel = [...fo.convs]; S.authErr = ''; S.modal = { type: 'folder', id: fo.id }; render(); },
  fPick: d => { const s = S.form.fSel || []; S.form.fSel = s.includes(d.v) ? s.filter(x => x !== d.v) : [...s, d.v]; render(); },
  folderSave: () => {
    const name = (S.form.fName || '').trim(); if (!name) { S.authErr = 'Give the folder a name.'; return render(); }
    const list = [...(S.prefs.folders || [])], id = S.modal.id || 'f' + now().toString(36), fo = { id, name: name.slice(0, 20), convs: S.form.fSel || [] };
    const i = list.findIndex(x => x.id === id); i >= 0 ? list.splice(i, 1, fo) : list.push(fo);
    S.modal = null; S.convFilter = 'f:' + id; savePrefs({ folders: list });
  },
  folderDel: () => { const id = S.modal.id; S.modal = null; S.convFilter = 'all'; savePrefs({ folders: (S.prefs.folders || []).filter(x => x.id !== id) }); },
  // effects
  fxOpen: () => { S.attach = false; S.modal = { type: 'effect' }; render(); },
  sendFx: async d => {
    const c = convOf(S.conv), t = (S.draft[S.conv] || '').trim(); if (!c || !t) return;
    S.modal = null; S.draft[c.id] = ''; render();
    const id = await sendMessage({ text: t, effect: d.v }); if (id) playedFx.add(id);
    playFx(d.v);
  },
  // translate
  translate: async d => {
    const m = (S.msgs[S.conv] || []).find(x => x.id === d.v); if (!m?.text) return;
    if (!S.be.ai) return toast('Translation uses Nexa AI, which works on the live version.');
    S.translations = { ...(S.translations || {}), [m.id]: '…' }; render();
    const lang = new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }).of((navigator.language || 'en').split('-')[0]) || 'English';
    try { S.translations[m.id] = (await aiText(`Translate this chat message into ${lang}. Reply with only the translation, keep emoji and tone. If it is already in ${lang}, reply with it unchanged.\n\n${m.text}`)).slice(0, 2000); }
    catch { delete S.translations[m.id]; toast('Couldn\'t translate right now.'); }
    render();
  },
  // sounds
  toneOpen: d => { S.menu = null; S.modal = { type: 'tone', uid: d.v }; render(); },
  setTone: d => { playTone(d.v); savePrefs({ friendSounds: { ...(S.prefs.friendSounds || {}), [S.modal.uid]: d.v } }); },
  // safety
  reveal: d => { S.revealed = { ...(S.revealed || {}), [d.v]: true }; render(); },
  // event album & place
  delPhoto: async d => { const eid = unsubs.albumId; if (!eid) return; await db().del(`events/${eid}/photos/${d.v}`); },
  onMyWay: async d => {
    const e = allEvents().find(x => x.id === d.v); if (!e) return;
    await db().update('events/' + e.id, { onway: ops.union(S.me) });
    if (e.convId) await sendMessage({ system: true, text: `${S.profile.name.split(' ')[0]} is on the way` }, e.convId).catch(() => {});
    toast('Everyone going can see you\'re on the way');
  },
  // export & a11y
  exportOpen: () => { S.form.exPhotos = false; S.modal = { type: 'export' }; render(); },
  exPhotos: () => { S.form.exPhotos = !S.form.exPhotos; render(); },
  exportGo: () => { const w = !!S.form.exPhotos; S.modal = null; render(); exportData(w); }
});
Object.assign(files, {
  albumPhotos: async fl => {
    const eid = unsubs.albumId; if (!eid) return;
    const list = [...fl].filter(f => f.type.startsWith('image/')).slice(0, 10);
    toast(`Adding ${list.length} photo${list.length > 1 ? 's' : ''}…`);
    for (const f of list) { const img = await storeImg(await compress(f, 1280, .78), 'album'); await db().add(`events/${eid}/photos`, { by: S.me, img, at: now() }); }
  },
  widgetPhoto: async f => { const u = await storeImg(await compress(f, 600, .78), 'widgets'); const ph = [...((S.profile.widgets || {}).photos || [])].slice(0, 2); ph.push(u); await db().update('users/' + S.me, { 'widgets.photos': ph }); }
});

/* =====================================================================
   v5b — communities & channels, drop-in voice rooms, group video calls,
   screen sharing (mesh WebRTC signalled through Firestore)
   ===================================================================== */

/* ---------------- communities ---------------- */
const commOf = id => (S.communities || []).find(c => c.id === id);
const commRole = (cm, u = S.me) => (cm?.roles || {})[u] || 'member';
const commAdmin = cm => ['owner', 'admin'].includes(commRole(cm));
const chanName = c => '#' + (c.name || 'channel');
function watchCommunities() {
  unsubs.base.push(db().listen('communities', [['members', 'array-contains', S.me]], r => { S.communities = r; r.forEach(cm => (cm.members || []).slice(0, 60).forEach(watchUser)); render(); }));
}
async function createCommunity(name, desc) {
  const me = S.me, code = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
  const cid = await db().add('communities', { name, desc, owner: me, members: [me], roles: { [me]: 'owner' }, channels: [], inviteCode: code, createdAt: now() });
  const gen = await db().add('conversations', { type: 'channel', communityId: cid, name: 'general', members: [me], createdAt: now(), reads: {}, typing: {}, last: { text: `Welcome to ${name}!`, from: me, at: now() } });
  await db().update('communities/' + cid, { channels: [{ id: gen, name: 'general', kind: 'text' }, { id: 'v_lounge', name: 'Lounge', kind: 'voice' }] });
  await db().set('communityInvites/' + code, { communityId: cid, name, by: me, at: now() });
  return { cid, gen };
}
async function joinCommunity(cid, code) {
  await db().update('communities/' + cid, { members: ops.union(S.me), lastJoin: code });
  const cm = await db().get('communities/' + cid);
  for (const ch of (cm?.channels || []).filter(x => x.kind === 'text')) await db().update('conversations/' + ch.id, { members: ops.union(S.me) }).catch(() => {});
  return cm;
}
async function checkCommunityInvite() {
  const code = lsGet('nexa.community', null); if (!code) return;
  lsSet('nexa.community', null);
  const inv = await db().get('communityInvites/' + code).catch(() => null);
  if (inv) { inv.code = code; if (commOf(inv.communityId)) { S.modal = { type: 'community', id: inv.communityId }; return render(); } }
  S.modal = { type: 'joinCommunity', inv }; render();
}
function vCommunities() {
  const list = S.communities || [];
  return `${list.map(cm => `<div class="commcard">
      <button class="row commhead" data-a="commOpen" data-v="${cm.id}"><span class="av group" style="width:36px;height:36px;font-size:14px;--grad:${gradFor(cm.id)}">${esc(initials(cm.name))}</span><b class="grow ellip">${esc(cm.name)}</b><span class="mute small">${cm.members.length}</span>${ic('gear', 16)}</button>
      ${(cm.channels || []).map(ch => { if (ch.kind === 'voice') { const r = roomLive('cv_' + cm.id + '_' + ch.id); return `<button class="item chan" data-a="roomJoin" data-v="cv_${cm.id}_${ch.id}" data-k="voice" data-n="${esc(ch.name)}" data-c="${cm.id}">${ic('volume', 16)}<span class="grow ellip">${esc(ch.name)}</span>${r.length ? `<span class="stack">${r.slice(0, 3).map(u => av(u, 20)).join('')}</span><span class="live">LIVE</span>` : ''}</button>`; }
        const c = convOf(ch.id); return `<button class="item chan ${S.conv === ch.id ? 'on' : ''}" data-a="openConv" data-v="${ch.id}"><span class="hash">#</span><span class="grow ellip ${c && unread(c) ? '' : 'mute'}" style="${c && unread(c) ? 'font-weight:800' : ''}">${esc(ch.name)}</span>${c && unread(c) ? '<span class="unread-dot"></span>' : ''}</button>`; }).join('')}
    </div>`).join('')}
    <button class="newcard" style="min-height:120px" data-a="commNew"><span class="empty" style="flex:none;padding:0"><span class="ring">${ic('plus', 24, 2)}</span></span><b style="color:var(--text)">Create a community</b><span class="small">Channels, voice rooms and roles for your crew.</span></button>`;
}

/* ---------------- rooms (voice rooms & group video calls) ---------------- */
const MAX_ROOM = 6;
const fresh = (t) => now() - (t || 0) < 60000;
const roomLive = rid => { const r = (S.rooms || []).find(x => x.id === rid); return r ? Object.entries(r.participants || {}).filter(([, t]) => fresh(t)).map(([u]) => u) : []; };
function watchRooms() { unsubs.base.push(db().listen('rooms', [['audience', 'array-contains', S.me]], r => { S.rooms = r; r.forEach(x => Object.keys(x.participants || {}).forEach(watchUser)); render(); if (S.room) paintRoom(); })); }
let R = null; // active room state
async function joinRoom(rid, kind, name, meta) {
  if (S.call) return toast('Finish your call first.');
  if (R) { if (R.id === rid) { R.min = false; return paintRoom(); } await leaveRoom(); }
  if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) return toast('Voice and video rooms aren\'t supported in this browser.');
  const iceP = loadIce();
  let local; try { local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: kind === 'video' ? { width: { ideal: 960 }, height: { ideal: 540 } } : false }); }
  catch { return toast(kind === 'video' ? 'Camera or microphone access was blocked.' : 'Microphone access was blocked.'); }
  await iceP;
  let room = await db().get('rooms/' + rid).catch(() => null);
  const audience = meta.audience;
  if (!room) { await db().set('rooms/' + rid, { name, kind, scope: meta.scope, ref: meta.ref || '', audience, participants: {}, createdAt: now() }); room = { participants: {} }; }
  else if (audience && audience.some(u => !(room.audience || []).includes(u))) await db().update('rooms/' + rid, { audience: ops.union(...audience) }).catch(() => {});
  const others0 = Object.entries(room.participants || {}).filter(([u, t]) => u !== S.me && fresh(t)).map(([u]) => u);
  if (others0.length >= MAX_ROOM - 1) { local.getTracks().forEach(t => t.stop()); return toast('This room is full.'); }
  R = { id: rid, kind, name, local, peers: {}, muted: false, camOff: false, min: false, joinedAt: now(), screen: null, seen: new Set() };
  S.room = rid;
  await db().update('rooms/' + rid, { ['participants.' + S.me]: now() });
  R.hb = setInterval(() => db().update('rooms/' + rid, { ['participants.' + S.me]: now() }).catch(() => {}), 20000);
  R.unSig = db().listen(`rooms/${rid}/sig`, [['to', '==', S.me]], list => list.forEach(onSignal));
  R.unRoom = db().listenDoc('rooms/' + rid, d => { if (!R || !d) return; R.doc = d; const live = Object.entries(d.participants || {}).filter(([u, t]) => u !== S.me && fresh(t)).map(([u]) => u); Object.keys(R.peers).forEach(u => { if (!live.includes(u)) dropPeer(u); }); paintRoom(); });
  for (const u of others0) makePeer(u, true);
  paintRoom(); sound('send');
}
function makePeer(u, initiator) {
  if (R.peers[u]) return R.peers[u];
  const pc = new RTCPeerConnection(ICE()), remote = new MediaStream(), sess = initiator ? S.me + '_' + now().toString(36) : null;
  const P = R.peers[u] = { pc, remote, sess, pending: [], level: 0 };
  R.local.getTracks().forEach(t => pc.addTrack(t, R.local));
  if (R.screen && R.kind === 'video') { const vs = pc.getSenders().find(s => s.track && s.track.kind === 'video'); vs && vs.replaceTrack(R.screen.getVideoTracks()[0]); }
  pc.ontrack = e => { (e.streams[0] ? e.streams[0].getTracks() : [e.track]).forEach(t => { if (!remote.getTracks().includes(t)) remote.addTrack(t); }); paintRoom(true); };
  pc.onicecandidate = e => { if (e.candidate && P.sess) sig(u, 'cand', { cand: e.candidate.toJSON(), sess: P.sess }); };
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') dropPeer(u); paintRoom(); };
  if (initiator) (async () => { const o = await pc.createOffer(); await pc.setLocalDescription(o); sig(u, 'offer', { sdp: { type: o.type, sdp: o.sdp }, sess }); })();
  return P;
}
function sig(to, type, data) { if (!R) return; db().add(`rooms/${R.id}/sig`, { from: S.me, to, type, ...data, at: now() }).catch(() => {}); }
async function onSignal(s) {
  if (!R || R.seen.has(s.id)) return; R.seen.add(s.id);
  db().del(`rooms/${R.id}/sig/${s.id}`).catch(() => {});
  if (now() - (s.at || 0) > 60000) return;
  const u = s.from;
  if (s.type === 'offer') {
    if (R.peers[u] && R.peers[u].sess !== s.sess) dropPeer(u);
    const P = makePeer(u, false); P.sess = s.sess;
    await P.pc.setRemoteDescription(new RTCSessionDescription(s.sdp));
    P.pending.splice(0).forEach(c => P.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
    const a = await P.pc.createAnswer(); await P.pc.setLocalDescription(a);
    sig(u, 'answer', { sdp: { type: a.type, sdp: a.sdp }, sess: s.sess });
  } else if (s.type === 'answer') {
    const P = R.peers[u]; if (!P || P.sess !== s.sess || P.pc.currentRemoteDescription) return;
    await P.pc.setRemoteDescription(new RTCSessionDescription(s.sdp)); P.pending.splice(0).forEach(c => P.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
  } else if (s.type === 'cand') {
    const P = R.peers[u]; if (!P || P.sess !== s.sess) return;
    P.pc.remoteDescription ? P.pc.addIceCandidate(new RTCIceCandidate(s.cand)).catch(() => {}) : P.pending.push(s.cand);
  }
}
function dropPeer(u) { const P = R?.peers[u]; if (!P) return; try { P.pc.close(); } catch {} delete R.peers[u]; paintRoom(); }
async function leaveRoom() {
  if (!R) return; const r = R; R = null; S.room = null;
  clearInterval(r.hb); r.unSig && r.unSig(); r.unRoom && r.unRoom();
  Object.values(r.peers).forEach(P => { try { P.pc.close(); } catch {} });
  r.local.getTracks().forEach(t => t.stop()); r.screen && r.screen.getTracks().forEach(t => t.stop());
  await db().update('rooms/' + r.id, { ['participants.' + S.me]: ops.del() }).catch(() => {});
  paintRoom(); render();
}
function roomMute() { if (!R) return; R.muted = !R.muted; R.local.getAudioTracks().forEach(t => t.enabled = !R.muted); paintRoom(); }
function roomCam() { if (!R) return; R.camOff = !R.camOff; R.local.getVideoTracks().forEach(t => t.enabled = !R.camOff); paintRoom(); }
async function toggleShare(target) {
  // target: 'room' or 'call'
  const ctx = target === 'call' ? S.call : R; if (!ctx) return;
  const senders = target === 'call' ? [ctx.pc] : Object.values(ctx.peers).map(p => p.pc);
  const camTrack = ctx.local.getVideoTracks()[0];
  if (ctx.screen) { ctx.screen.getTracks().forEach(t => t.stop()); ctx.screen = null; senders.forEach(pc => { const s = pc.getSenders().find(x => x.track && x.track.kind === 'video' || (x.track === null && camTrack)); s && s.replaceTrack(camTrack); }); target === 'call' ? paintCall() : paintRoom(true); return; }
  if (!navigator.mediaDevices?.getDisplayMedia) return toast('Screen sharing isn\'t supported on this device.');
  if (!camTrack) return toast('Screen sharing works in video calls.');
  let st; try { st = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); } catch { return; }
  ctx.screen = st; const vt = st.getVideoTracks()[0];
  senders.forEach(pc => { const s = pc.getSenders().find(x => x.track && x.track.kind === 'video'); s && s.replaceTrack(vt); });
  vt.onended = () => { if (ctx.screen === st) toggleShare(target); };
  target === 'call' ? paintCall() : paintRoom(true);
}
let roomTick = 0;
function paintRoom(force) {
  let layer = document.getElementById('roomLayer');
  if (!R) { if (layer) layer.remove(); clearInterval(roomTick); return; }
  if (!layer) {
    layer = document.createElement('div'); layer.id = 'roomLayer'; document.body.appendChild(layer);
    layer.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; const k = b.dataset.r; if (k === 'leave') leaveRoom(); if (k === 'mute') roomMute(); if (k === 'cam') roomCam(); if (k === 'share') toggleShare('room'); if (k === 'min') { R.min = !R.min; paintRoom(true); } });
    clearInterval(roomTick); roomTick = setInterval(() => { if (!R) return; const t = layer.querySelector('#roomTime'); if (t) t.textContent = fmtDur((now() - R.joinedAt) / 1000); }, 1000);
  }
  const ids = [S.me, ...Object.keys(R.peers)];
  layer.className = (R.min ? 'room-min glass' : 'room-full') + (R.kind === 'video' ? ' video' : ' voice');
  if (R.min) {
    layer.innerHTML = `<button class="row" style="gap:10px" data-r="min"><span class="live">LIVE</span><b class="small ellip" style="max-width:150px">${esc(R.name)}</b><span class="stack">${ids.slice(0, 4).map(u => av(u, 22)).join('')}</span></button><button class="cbtn sm ${R.muted ? 'on' : ''}" data-r="mute" aria-label="${R.muted ? 'Unmute' : 'Mute'}">${ic(R.muted ? 'micOff' : 'mic', 16, 2)}</button><button class="cbtn sm red" data-r="leave" aria-label="Leave room">${ic('hangup', 16, 2)}</button>`;
    return;
  }
  const key = ids.join(',') + '|' + R.kind + '|' + !!R.screen;
  if (force || layer.dataset.key !== key) {
    layer.dataset.key = key;
    layer.innerHTML = `<div class="room-head"><span class="live">LIVE</span><b class="disp">${esc(R.name)}</b><span class="mute small" id="roomTime">${fmtDur((now() - R.joinedAt) / 1000)}</span><span class="grow"></span><button class="ibtn" data-r="min" aria-label="Minimise">${ic('back', 18)}</button></div>
      <div class="tiles n${Math.min(ids.length, 6)}">${ids.map(u => `<div class="tile" data-u="${u}">${R.kind === 'video' ? `<video autoplay playsinline ${u === S.me ? 'muted' : ''}></video>` : `<audio autoplay></audio>`}<div class="tile-av">${av(u, R.kind === 'video' ? 64 : 96)}</div><span class="tile-name">${esc(u === S.me ? 'You' : dname(u).split(' ')[0])}${u === S.me && R.muted ? ' · muted' : ''}</span></div>`).join('')}</div>
      <div class="call-controls" style="position:static;transform:none;margin:0 auto">
        <button class="cbtn ${R.muted ? 'on' : ''}" data-r="mute" aria-label="${R.muted ? 'Unmute' : 'Mute'}">${ic(R.muted ? 'micOff' : 'mic', 22, 2)}</button>
        ${R.kind === 'video' ? `<button class="cbtn ${R.camOff ? 'on' : ''}" data-r="cam" aria-label="${R.camOff ? 'Turn camera on' : 'Turn camera off'}">${ic(R.camOff ? 'videoOff' : 'video', 22, 2)}</button>${navigator.mediaDevices?.getDisplayMedia ? `<button class="cbtn ${R.screen ? 'on' : ''}" data-r="share" aria-label="${R.screen ? 'Stop sharing' : 'Share screen'}">${ic('expand', 22, 2)}</button>` : ''}` : ''}
        <button class="cbtn red" data-r="leave" aria-label="Leave room">${ic('hangup', 24, 2)}</button></div>`;
  }
  layer.querySelectorAll('.tile').forEach(t => {
    const u = t.dataset.u, stream = u === S.me ? (R.screen || R.local) : R.peers[u]?.remote, el = t.querySelector('video,audio');
    if (el && stream && el.srcObject !== stream) { el.srcObject = stream; el.play && el.play().catch(() => {}); }
    const hasV = R.kind === 'video' && stream && stream.getVideoTracks().some(x => x.readyState === 'live') && !(u === S.me && R.camOff && !R.screen);
    t.classList.toggle('has-video', !!hasV);
  });
}

/* ---------------- v5b modals ---------------- */
function vModal5b(m, f, head) {
  if (m.type === 'commNew') return head('Create a community', 'A home for your crew, class or club — with channels and voice rooms.') + `
      <label class="field">Name<input class="inp" id="cm-name" data-model="form.cmName" value="${esc(f.cmName || '')}" maxlength="40" placeholder="Weekend Warriors" data-autofocus></label>
      <label class="field">Description <span style="font-weight:500">(optional)</span><input class="inp" id="cm-desc" data-model="form.cmDesc" value="${esc(f.cmDesc || '')}" maxlength="120"></label>
      <div class="sec">Invite friends now</div>${pickList(f.pick || [])}
      ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="commCreate" ${S.busy ? 'disabled' : ''}>Create community</button></div>`;
  if (m.type === 'community') {
    const cm = commOf(m.id); if (!cm) return head('Community') + '<div class="empty">You\'re not in this community anymore.</div>';
    const adm = commAdmin(cm), owner = commRole(cm) === 'owner', tab = m.tab || 'channels';
    let body = '';
    if (tab === 'channels') body = `${(cm.channels || []).map(ch => `<div class="item">${ch.kind === 'voice' ? ic('volume', 18) : '<span class="hash">#</span>'}<b class="grow">${esc(ch.name)}</b>${ch.kind === 'voice' ? `<span class="mute small">${roomLive('cv_' + cm.id + '_' + ch.id).length} in room</span><button class="btn sm pri" data-a="roomJoin" data-v="cv_${cm.id}_${ch.id}" data-k="voice" data-n="${esc(ch.name)}" data-c="${cm.id}">Join</button>` : `<button class="btn sm" data-a="openConv" data-v="${ch.id}">Open</button>`}${adm && (cm.channels || []).length > 1 ? `<button class="ibtn sm" aria-label="Remove channel" data-a="chanDel" data-v="${ch.id}">${ic('trash', 14)}</button>` : ''}</div>`).join('')}
      ${adm ? `<div class="row" style="gap:8px"><input class="inp" id="ch-name" data-model="form.chName" value="${esc(f.chName || '')}" maxlength="24" placeholder="new-channel"><button class="btn sm" data-a="chanAdd" data-v="text"># Text</button><button class="btn sm" data-a="chanAdd" data-v="voice">${ic('volume', 14)} Voice</button></div>` : ''}`;
    if (tab === 'members') body = cm.members.map(u => `<div class="item">${av(u, 38, true)}<span class="grow"><b style="display:block">${esc(u === S.me ? S.profile.name + ' (you)' : dname(u))}</b><span class="mute small">${{ owner: 'Owner', admin: 'Admin', member: 'Member' }[commRole(cm, u)]}</span></span>${owner && u !== S.me ? `<button class="btn sm" data-a="commRole" data-v="${u}" data-r="${commRole(cm, u) === 'admin' ? 'member' : 'admin'}">${commRole(cm, u) === 'admin' ? 'Remove admin' : 'Make admin'}</button>` : ''}${adm && u !== S.me && commRole(cm, u) === 'member' ? `<button class="btn sm" data-a="commKick" data-v="${u}">Remove</button>` : ''}</div>`).join('');
    if (tab === 'about') body = `<div class="col" style="gap:12px">${cm.desc ? `<div style="line-height:1.6">${esc(cm.desc)}</div>` : ''}
      <div class="setrow"><span><b>Invite link</b><div class="mute small">Anyone with the link can join ${esc(cm.name)}.</div></span><button class="btn sm pri" data-a="commLink">${ic('link', 14)} Copy link</button></div>
      <div class="row" style="gap:10px;flex-wrap:wrap"><button class="btn danger" data-a="commLeave">${owner ? 'Delete community' : 'Leave community'}</button></div></div>`;
    return head(esc(cm.name), `${cm.members.length} member${cm.members.length > 1 ? 's' : ''}`) + `<div class="tabs">${[['channels', 'Channels'], ['members', 'Members'], ['about', 'About & invite']].map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-a="commTab" data-v="${k}">${l}</button>`).join('')}</div><div class="col scroll" style="gap:4px;max-height:420px">${body}</div>`;
  }
  if (m.type === 'joinCommunity') {
    const iv = m.inv; if (!iv) return head('Community invite') + '<div class="empty">This invite link is no longer valid.</div>';
    return head('Join community') + `<div class="row"><span class="av group" style="width:60px;height:60px;font-size:20px;--grad:${gradFor(iv.communityId)}">${esc(initials(iv.name))}</span><div><b class="disp" style="font-size:20px">${esc(iv.name)}</b><div class="mute small">Invited by ${esc(U(iv.by)?.name || 'a Nexa user')}</div></div></div>
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="closeModal">Not now</button><button class="btn pri" data-a="commJoinYes" ${S.busy ? 'disabled' : ''}>Join</button></div>`;
  }
  return null;
}
function pickList(sel) {
  const fr = friendIds();
  return `<div class="col scroll" style="gap:4px;max-height:220px">${fr.length ? fr.map(u => `<button class="item ${sel.includes(u) ? 'on' : ''}" data-a="pick" data-v="${u}" data-multi="1">${av(u, 36)}<b class="grow ellip">${esc(dname(u))}</b><span class="tog ${sel.includes(u) ? 'on' : ''}" style="width:24px;height:24px;border-radius:8px" aria-hidden="true"></span></button>`).join('') : '<span class="mute small">Add friends first — or share the invite link later.</span>'}</div>`;
}

/* ---------------- v5b actions ---------------- */
Object.assign(actions, {
  commNew: () => { S.form.cmName = ''; S.form.cmDesc = ''; S.form.pick = []; S.authErr = ''; S.modal = { type: 'commNew' }; render(); },
  commCreate: async () => {
    const name = (S.form.cmName || '').trim(); if (!name) { S.authErr = 'Give your community a name.'; return render(); }
    S.busy = true; render();
    try {
      const { cid, gen } = await createCommunity(name.slice(0, 40), (S.form.cmDesc || '').trim().slice(0, 120));
      const cm = await db().get('communities/' + cid);
      for (const u of (S.form.pick || [])) notify(u, { type: 'group_add', title: `${S.profile.name} invited you to ${name}`, body: 'Tap to join the community', link: { page: 'community', id: cm.inviteCode } });
      S.modal = null; S.convFilter = 'communities'; openConv(gen); confetti();
    } catch (e) { S.authErr = e.message; }
    S.busy = false; render();
  },
  commOpen: d => { S.modal = { type: 'community', id: d.v, tab: 'channels' }; render(); },
  commTab: d => { S.modal.tab = d.v; render(); },
  chanAdd: async d => {
    const cm = commOf(S.modal.id); if (!cm) return;
    const name = (S.form.chName || '').trim().toLowerCase().replace(/[^a-z0-9-_ ]/g, '').replace(/\s+/g, '-').slice(0, 24); if (!name) return toast('Name the channel first');
    if (d.v === 'voice') await db().update('communities/' + cm.id, { channels: [...cm.channels, { id: 'v_' + now().toString(36), name, kind: 'voice' }] });
    else { const id = await db().add('conversations', { type: 'channel', communityId: cm.id, name, members: cm.members, createdAt: now(), reads: {}, typing: {}, last: { text: `#${name} was created`, from: S.me, at: now() } }); await db().update('communities/' + cm.id, { channels: [...cm.channels, { id, name, kind: 'text' }] }); }
    S.form.chName = ''; render(); toast('Channel added');
  },
  chanDel: d => { const cm = commOf(S.modal.id); if (!cm) return; confirmModal('Remove channel?', 'It disappears for everyone in the community.', 'Remove', () => db().update('communities/' + cm.id, { channels: cm.channels.filter(c => c.id !== d.v) })); },
  commRole: async d => { const cm = commOf(S.modal.id); if (cm) await db().update('communities/' + cm.id, { ['roles.' + d.v]: d.r }); },
  commKick: d => { const cm = commOf(S.modal.id); if (!cm) return; const id = S.modal.id; confirmModal('Remove member?', `${dname(d.v)} will be removed from ${cm.name}.`, 'Remove', async () => { await db().update('communities/' + id, { members: ops.remove(d.v), ['roles.' + d.v]: ops.del() }); for (const ch of cm.channels.filter(c => c.kind === 'text')) await db().update('conversations/' + ch.id, { members: ops.remove(d.v) }).catch(() => {}); }); },
  commLink: async () => { const cm = commOf(S.modal.id); if (!cm) return; const link = location.origin + location.pathname + '?community=' + cm.inviteCode; if (navigator.share && innerWidth <= 1100) { try { await navigator.share({ title: cm.name, url: link }); return; } catch {} } try { await navigator.clipboard.writeText(link); toast('Invite link copied'); } catch { toast(esc(link)); } },
  commLeave: () => { const cm = commOf(S.modal.id); if (!cm) return; const owner = commRole(cm) === 'owner'; confirmModal(owner ? 'Delete community?' : 'Leave community?', owner ? 'This removes the community for everyone. Channel chats stay in members\' chat lists.' : `You'll leave all of ${cm.name}'s channels.`, owner ? 'Delete' : 'Leave', async () => {
    for (const ch of cm.channels.filter(c => c.kind === 'text')) await db().update('conversations/' + ch.id, { members: ops.remove(S.me) }).catch(() => {});
    if (owner) { await db().del('communityInvites/' + cm.inviteCode).catch(() => {}); await db().del('communities/' + cm.id); }
    else await db().update('communities/' + cm.id, { members: ops.remove(S.me), ['roles.' + S.me]: ops.del() });
    S.conv = null; render();
  }); },
  commJoinYes: async () => { const iv = S.modal?.inv; if (!iv) return; S.busy = true; render(); try { const cm = await joinCommunity(iv.communityId, iv.code); S.modal = null; confetti(); const gen = (cm?.channels || []).find(c => c.kind === 'text'); if (gen) setTimeout(() => openConv(gen.id), 500); } catch { toast('This invite doesn\'t work anymore.'); S.modal = null; } S.busy = false; render(); },
  // rooms
  roomJoin: d => { const cm = d.c ? commOf(d.c) : null; joinRoom(d.v, d.k || 'voice', d.n || 'Room', { scope: cm ? 'community' : 'friends', ref: d.c || S.me, audience: cm ? cm.members : [S.me, ...friendIds()] }); },
  hangoutOpen: () => joinRoom('hg_' + S.me, 'voice', `${S.profile.name.split(' ')[0]}'s hangout`, { scope: 'friends', ref: S.me, audience: [S.me, ...friendIds()] }),
  groupCall: async () => {
    const c = convOf(S.conv); if (!c) return;
    const rid = 'gc_' + c.id;
    await joinRoom(rid, 'video', convName(c), { scope: 'group', ref: c.id, audience: c.members });
    if (R && R.id === rid && roomLive(rid).filter(u => u !== S.me).length === 0) await sendMessage({ text: 'Started a group video call', roomCall: rid });
  },
  shareCall: () => toggleShare('call')
});

/* =====================================================================
   v5c — glue: icons, live rooms on Home, quick reply, offline, extras
   ===================================================================== */
Object.assign(P, {
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  map: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  wifiOff: '<path d="M2 8.5a15 15 0 0 1 5-3M22 8.5a15 15 0 0 0-9.5-4M5 12.5a10 10 0 0 1 4-2.3M19 12.5a10 10 0 0 0-3-2M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'
});
function fmtWhenFuture(t) {
  const d = t - now(); if (d <= 0) return 'now';
  if (d < 3600e3) return 'in ' + Math.max(1, Math.round(d / 60e3)) + ' min';
  if (d < 86400e3) return 'in ' + Math.round(d / 3600e3) + ' h';
  return new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function vLiveCard() {
  const live = (S.rooms || []).map(r => ({ r, who: roomLive(r.id) })).filter(x => x.who.length && !x.who.every(u => u === S.me) && x.r.id.startsWith('hg_'));
  const cm = (S.rooms || []).map(r => ({ r, who: roomLive(r.id) })).filter(x => x.who.length && x.r.scope === 'community' && !x.who.every(u => u === S.me));
  const all = [...live, ...cm];
  const mineLive = S.room === 'hg_' + S.me;
  return `<section class="panel glass card react livecard">
    <div class="row spread"><h2 class="h2 row" style="gap:8px">${all.length ? '<span class="live">LIVE</span>' : ic('volume', 18)} Hang out</h2><button class="btn sm ${mineLive ? '' : 'pri'}" data-a="hangoutOpen" ${friendIds().length ? '' : 'disabled title="Add friends first"'}>${mineLive ? 'Open my room' : 'Start my hangout'}</button></div>
    ${all.length ? `<div class="list">${all.map(({ r, who }) => `<button class="item" data-a="roomJoinId" data-v="${r.id}">${`<span class="stack">${who.slice(0, 3).map(u => av(u, 30)).join('')}</span>`}<span class="grow"><b class="ellip" style="display:block">${esc(r.name || 'Room')}</b><span class="mute small ellip" style="display:block">${who.map(u => u === S.me ? 'You' : dname(u).split(' ')[0]).join(', ')}</span></span><span class="btn sm pri" aria-hidden="true">${S.room === r.id ? 'Open' : 'Join'}</span></button>`).join('')}</div>`
      : `<div class="mute small">Drop-in voice rooms — start one and friends can jump in anytime. Up to ${MAX_ROOM} people.</div>`}
  </section>`;
}
async function quickReply(chat, text) {
  for (let i = 0; i < 20 && !convOf(chat); i++) await new Promise(r => setTimeout(r, 300));
  if (!convOf(chat)) return toast('That chat isn\'t available.');
  const id = await sendMessage({ text }, chat);
  if (id) toast(`Reply sent to <b>${esc(convName(convOf(chat)))}</b>`, () => openConv(chat));
}
S.offline = !navigator.onLine;
window.addEventListener('offline', () => { S.offline = true; render(); });
window.addEventListener('online', () => {
  S.offline = false; render();
  const q = S.queued || []; S.queued = [];
  // Messages written offline are sent by Firestore itself; tell the other side's devices once they land.
  setTimeout(() => q.forEach(x => pushNotify('message', { conv: x.conv, msg: x.msg })), 2500);
  if (q.length) toast(`Back online — sending ${q.length} message${q.length > 1 ? 's' : ''}`);
});
Object.assign(actions, {
  folderAdd: () => { S.menu = null; const fs = S.prefs.folders || []; if (!fs.length) return actions.folderNew(); S.modal = { type: 'folderPick' }; render(); },
  folderPut: d => { const list = (S.prefs.folders || []).map(x => x.id === d.v ? { ...x, convs: x.convs.includes(S.conv) ? x.convs.filter(y => y !== S.conv) : [...x.convs, S.conv] } : x); savePrefs({ folders: list }); },
  fxReplay: d => playFx(d.v),
  albumView: d => { const p = (S.album || []).find(x => x.id === d.v); if (p) { S.lightbox = p.img; render(); } },
  roomJoinId: d => { const r = (S.rooms || []).find(x => x.id === d.v); if (!r) return; joinRoom(r.id, r.kind || 'voice', r.name || 'Room', { scope: r.scope, ref: r.ref, audience: r.audience }); },
  saveWidgets: async () => {
    const f = S.form, w = S.profile.widgets || {};
    await db().update('users/' + S.me, { 'widgets.song': (f.wSong ?? w.song ?? '').trim().slice(0, 60), 'widgets.game': (f.wGame ?? w.game ?? '').trim().slice(0, 40) });
    toast('Widgets saved');
  },
  widgetDel: async d => { const ph = [...((S.profile.widgets || {}).photos || [])]; ph.splice(+d.i, 1); await db().update('users/' + S.me, { 'widgets.photos': ph }); }
});
const _vModal5 = vModal5;
vModal5 = function (m, f, head) {
  if (m.type === 'folderPick') {
    const c = convOf(S.conv);
    return head('Add to folder', c ? esc(convName(c)) : '') + `<div class="col" style="gap:4px">${(S.prefs.folders || []).map(x => `<button class="item ${x.convs.includes(S.conv) ? 'on' : ''}" data-a="folderPut" data-v="${x.id}">${ic('folder', 18)}<b class="grow">${esc(x.name)}</b>${x.convs.includes(S.conv) ? ic('check', 16, 2.4) : ''}</button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="folderNew">${ic('plus', 16)} New folder</button><button class="btn pri" data-a="closeModal">Done</button></div>`;
  }
  return _vModal5(m, f, head);
};

/* ---------------- private photos for friends (only you see them) ---------------- */
Object.assign(files, {
  customPic: async f => { const uid = S.modal?.uid; if (!uid) return; const img = await compress(f, 320, .8); S.pics = { ...(S.pics || {}), [uid]: img }; render(); await db().update(`users/${S.me}/private/pics`, { [uid]: img }); toast('Photo set — only you can see it'); }
});
Object.assign(actions, {
  picClear: async () => { const uid = S.modal?.uid; if (!uid) return; const p = { ...(S.pics || {}) }; delete p[uid]; S.pics = p; render(); await db().update(`users/${S.me}/private/pics`, { [uid]: ops.del() }); }
});

/* =====================================================================
   Quick login — log in on a new device with a code / QR from a logged-in one
   ===================================================================== */
Object.assign(P, { qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4M20 20v1"/>',
  scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16"/>' });
const QL_URL = () => CONFIG.quickLoginEndpoint || '/.netlify/functions/quicklogin';
const fmtCode = c => String(c || '').replace(/(.{4})(.{4})/, '$1-$2');
async function qlCall(body, auth) {
  let r;
  try { r = await fetch(QL_URL(), { method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer ' + auth } : {}) }, body: JSON.stringify(body) }); }
  catch { throw new Error('Can\'t reach Nexa right now. Check your internet.'); }
  if (r.status === 404 || r.status === 405 || r.status === 501) throw new Error('Quick login needs Nexa\'s server, which isn\'t switched on for this site yet. Log in with your email and password for now.');
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Try again.');
  return j;
}
function vAuthCode() {
  const f = S.form, canScan = 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
  return `<div class="auth${A('auth')}">
    <div class="col intro" style="gap:28px">
      <div class="brandhero">${logo(92, false, 'logo-glow')}<div><div class="brandword">NEXA</div><div class="brandtag">Connect · Chat · Share · Together</div></div></div>
      <h1>Log in <span class="grad-text">instantly.</span></h1>
      <p class="mute" style="margin:0;font-size:17px;line-height:1.6;max-width:470px">On a device where you're already logged in, open <b style="color:var(--text)">Settings › Account › Log in on another device</b>. Then scan the QR code or type the code here.</p>
    </div>
    <form class="auth-card glass card" data-submit="qcode" novalidate>
      <div><h2 class="disp" style="margin:0 0 4px;font-size:24px">Log in with a code</h2><div class="mute small">The code is 8 letters and numbers and lasts 2 minutes.</div></div>
      <label class="field">Code<input class="inp codein" id="f-code" data-model="form.qcode" value="${esc(f.qcode || '')}" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="ABCD-EFGH" data-autofocus></label>
      ${S.authErr ? `<div class="err" role="alert">${esc(S.authErr)}</div>` : ''}
      <button class="btn pri" style="height:50px;font-size:15px" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Logging in…' : 'Log in'}</button>
      ${canScan ? `<button type="button" class="btn" style="height:48px" data-a="qlScan">${ic('scan', 18)} Scan QR code</button>` : `<div class="mute small" style="text-align:center;line-height:1.5">${ic('scan', 14)} On a phone? Point your <b style="color:var(--text)">Camera app</b> at the QR code — it opens Nexa and logs you in.</div>`}
      <button type="button" class="small mute" style="align-self:center;text-decoration:underline;text-underline-offset:3px" data-a="authMode" data-v="login">Log in with email instead</button>
    </form>
  </div>`;
}
async function redeemCode(code) {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== 8) { S.authErr = 'Codes are 8 letters and numbers, like ABCD-EFGH.'; return render(); }
  if (S.be.kind === 'local' || !S.be.auth.signInWithToken) { S.authErr = 'Quick login works on the live version of Nexa.'; return render(); }
  S.busy = true; S.authErr = ''; render();
  try { const { token } = await qlCall({ action: 'redeem', code: c }); await S.be.auth.signInWithToken(token); }
  catch (e) { S.authErr = e.message; }
  S.busy = false; render();
}
/* ---- scanner (browsers with BarcodeDetector: Chrome on Android, Mac, ChromeOS) ---- */
let scan = null;
async function startScan() {
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); } catch { S.authErr = 'Camera access was blocked. Type the code instead.'; return render(); }
  const layer = document.createElement('div'); layer.id = 'scanLayer';
  layer.innerHTML = `<video autoplay playsinline muted></video><div class="scanframe"></div><div class="scanhint">Point at the QR code on your other device</div><button class="cbtn" aria-label="Close scanner">${ic('x', 22, 2)}</button>`;
  document.body.appendChild(layer);
  const v = layer.querySelector('video'); v.srcObject = stream; v.play().catch(() => {});
  const det = new BarcodeDetector({ formats: ['qr_code'] });
  scan = { stream, layer, on: true };
  layer.querySelector('button').onclick = stopScan;
  const loop = async () => {
    if (!scan?.on) return;
    try { const r = await det.detect(v); const raw = r[0]?.rawValue || ''; const m = raw.match(/[?&]login=([A-Za-z0-9-]{6,12})/) || raw.match(/^([A-Za-z0-9]{4}-?[A-Za-z0-9]{4})$/); if (m) { stopScan(); S.form.qcode = fmtCode(m[1].replace(/-/g, '').toUpperCase()); return redeemCode(m[1]); } } catch {}
    setTimeout(loop, 250);
  };
  loop();
}
function stopScan() { if (!scan) return; scan.on = false; scan.stream.getTracks().forEach(t => t.stop()); scan.layer.remove(); scan = null; }
/* ---- showing a code on the logged-in device ---- */
let qlTimer = 0;
async function qlFetch() {
  const m = S.modal; if (!m || m.type !== 'qlogin') return;
  m.loading = true; m.err = ''; render();
  try {
    const tok = await S.be.auth.idToken?.();
    if (S.be.kind === 'local' || !tok) throw new Error('Quick login works on the live version of Nexa.');
    const j = await qlCall({ action: 'create' }, tok);
    const link = location.origin + location.pathname + '?login=' + j.code;
    let svg = '';
    try { const Q = (await import('./qr.js')).default; const q = Q(0, 'M'); q.addData(link); q.make(); svg = q.createSvgTag({ cellSize: 6, margin: 3, scalable: true }); } catch {}
    if (S.modal !== m) return;
    Object.assign(m, { code: j.code, exp: j.exp || now() + 120000, svg, loading: false });
  } catch (e) { if (S.modal === m) Object.assign(m, { err: e.message, loading: false }); }
  render();
}
Object.assign(actions, {
  qlScan: () => startScan(),
  qlShow: () => {
    S.modal = { type: 'qlogin' }; render(); qlFetch();
    clearInterval(qlTimer);
    qlTimer = setInterval(() => {
      const m = S.modal; if (!m || m.type !== 'qlogin') return clearInterval(qlTimer);
      const el = document.getElementById('qlTime'); const left = Math.max(0, Math.round(((m.exp || 0) - now()) / 1000));
      if (el) el.textContent = fmtDur(left);
      if (m.code && left <= 0 && !m.loading) qlFetch();
    }, 1000);
  },
  qlNew: () => qlFetch()
});
const _vModal5b = vModal5b;
vModal5b = function (m, f, head) {
  if (m.type === 'qlogin') {
    const left = Math.max(0, Math.round(((m.exp || 0) - now()) / 1000));
    return head('Log in on another device', 'On the new device, open Nexa and tap “Log in with a code or QR”.') + (m.err ? `<div class="err">${esc(m.err)}</div>` : m.loading && !m.code ? `<div class="qlbox"><div class="qrsvg skel"></div><div class="skel" style="width:180px;height:34px;border-radius:10px"></div></div>` : `
      <div class="qlbox">
        <div class="qrsvg" aria-label="QR code to log in">${m.svg || ''}</div>
        <div class="qlcode" aria-label="Code ${esc(fmtCode(m.code).split('').join(' '))}">${esc(fmtCode(m.code))}</div>
        <div class="mute small">New code in <b id="qlTime" style="color:var(--text)">${fmtDur(left)}</b> · works once</div>
      </div>
      <div class="row small" style="gap:8px;padding:10px 12px;border-radius:12px;background:color-mix(in oklab,var(--warm) 10%,transparent);border:1px solid color-mix(in oklab,var(--warm) 30%,transparent)">${ic('lock', 16)}<span>Only use this on your own devices. Anyone with this code can log in as you for the next 2 minutes.</span></div>`) + `
      <div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="qlNew" ${m.loading ? 'disabled' : ''}>New code</button><button class="btn pri" data-a="closeModal">Done</button></div>`;
  }
  return _vModal5b(m, f, head);
};

/* =====================================================================
   v6 — phone gestures & bottom sheets, haptics, video messages,
   voice speed, KLIPY GIFs, close friends, live location, animated &
   seasonal wallpapers, spam limits, invite links (/@handle)
   ===================================================================== */
Object.assign(P, { film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>' });

/* ---- small helpers ---- */
const buzz = p => { try { if (S.prefs?.haptics !== false && navigator.vibrate) navigator.vibrate(p); } catch {} };
const voiceRate = () => +(lsGet('nexa.vrate', 1) || 1);
const gifKey = () => CONFIG.gifKey || CONFIG.klipyKey || CONFIG.tenorKey || '';
const closeFriendIds = () => (S.prefs.closeFriends || []).filter(u => isFriend(u) && !blocked(u));
const profileLink = () => location.origin + location.pathname.replace(/[^/]*$/, '') + '@' + (S.profile?.handle || '');
const SEASON_NAMES = { halloween: 'Halloween', autumn: 'Autumn', snow: 'Winter', blossom: 'Spring', summer: 'Summer' };
function season() { const m = new Date().getMonth(); return m === 9 ? 'halloween' : m === 10 ? 'autumn' : (m === 11 || m <= 1) ? 'snow' : m <= 4 ? 'blossom' : 'summer'; }
// Simple rate limits so new accounts can't spam people
function rateOk(kind) {
  const young = now() - (S.profile?.createdAt || 0) < 3 * 864e5;
  const lim = { req: young ? 10 : 30, dmreq: young ? 5 : 20 }[kind] || 20, win = kind === 'dmreq' ? 864e5 : 3600e3;
  const key = 'nexa.rate.' + kind + '.' + S.me, log = (lsGet(key, []) || []).filter(t => now() - t < win);
  if (log.length >= lim) return false;
  log.push(now()); lsSet(key, log); return true;
}
/* ---- invite links: nexa.../@handle ---- */
async function checkAddHandle() {
  const h = lsGet('nexa.addHandle', null); if (!h) return;
  lsSet('nexa.addHandle', null);
  if (h === S.profile?.handle) return toast('That\'s your own invite link — share it with friends!');
  const rec = await db().get('handles/' + h).catch(() => null);
  if (!rec?.uid) return toast(`No one on Nexa has the handle @${esc(h)}.`);
  watchUser(rec.uid); S.profileUid = rec.uid; S.page = 'profile'; render();
  if (!isFriend(rec.uid)) setTimeout(() => toast(`Tap <b>Add friend</b> to connect with @${esc(h)}`), 600);
}

/* ---- video bubbles ---- */
const safeVideo = u => (typeof u === 'string' && /^data:video\/(mp4|webm|quicktime)(;[a-z0-9=.,+-]+)*;base64,[A-Za-z0-9+/=]+$/i.test(u)) ? u : '';
function vVideoBubble(m, quote) {
  const v = m.video, th = safeImg(v.thumb);
  if (v.round) return `<div class="vnote-wrap">${quote ? `<div class="bub" style="margin-bottom:4px">${quote}</div>` : ''}<button class="vnote" data-a="playVideo" data-v="${m.id}" aria-label="Play video message, ${fmtDur(v.dur || 0)}">${th ? `<img src="${th}" alt="">` : ''}<span class="vplayic">${ic('play', 22, 2)}</span><span class="vdur">${fmtDur(v.dur || 0)}</span></button></div>`;
  return `<div class="bub img">${quote}<button class="vclip" data-a="playVideo" data-v="${m.id}" aria-label="Play video, ${fmtDur(v.dur || 0)}" style="aspect-ratio:${(v.w && v.h) ? v.w + '/' + v.h : '16/9'}">${th ? `<img src="${th}" alt="">` : ''}<span class="vplayic">${ic('play', 26, 2)}</span><span class="vdur">${ic('film', 12)} ${fmtDur(v.dur || 0)}</span></button>${m.text ? `<div style="padding:6px 8px 2px">${linkify(m.text)}</div>` : ''}</div>`;
}
function openVideo(m) {
  const src = safeVideo(m?.video?.src); if (!src) return toast('This video can\'t play here.');
  closeVideo();
  const L = document.createElement('div'); L.id = 'videoLayer'; L.className = m.video.round ? 'round' : '';
  L.innerHTML = `<div class="vbox"><video playsinline autoplay ${m.video.round ? '' : 'controls'} src="${src}"></video>${m.video.round ? '<svg class="vring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48"/></svg>' : ''}</div><button class="cbtn" aria-label="Close video">${ic('x', 22, 2)}</button>`;
  document.body.appendChild(L);
  const v = L.querySelector('video'), ring = L.querySelector('.vring circle');
  if (ring) { const len = 2 * Math.PI * 48; ring.style.strokeDasharray = len; ring.style.strokeDashoffset = len; v.ontimeupdate = () => { ring.style.strokeDashoffset = len * (1 - (v.currentTime / (v.duration || m.video.dur || 1))); }; v.onended = closeVideo; v.onclick = () => v.paused ? v.play() : v.pause(); }
  v.play().catch(() => {});
  L.addEventListener('click', e => { if (e.target === L || e.target.closest('.cbtn')) closeVideo(); });
}
function closeVideo() { const L = document.getElementById('videoLayer'); if (L) { const v = L.querySelector('video'); try { v.pause(); v.removeAttribute('src'); v.load(); } catch {} L.remove(); } }
const pickVideoMime = () => ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '';
const blobToData = b => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
async function videoThumb(url, size = 220) {
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = url;
  await new Promise(r => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 3000); });
  try { v.currentTime = Math.min(0.2, (v.duration || 1) / 2); await new Promise(r => { v.onseeked = r; setTimeout(r, 1500); }); } catch {}
  const w = v.videoWidth || 240, h = v.videoHeight || 240, k = Math.min(1, size / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  try { c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); return { thumb: c.toDataURL('image/jpeg', .65), w, h, dur: v.duration }; } catch { return { thumb: '', w, h, dur: v.duration }; }
}
const MAX_VIDEO_BYTES = 700000, MAX_VIDEO_SEC = 20;
async function sendVideoBlob(blob, dur, round) {
  if (blob.size > MAX_VIDEO_BYTES) return toast('That video is too big to send. Try a shorter one.');
  const url = URL.createObjectURL(blob), t = await videoThumb(url); URL.revokeObjectURL(url);
  const src = String(await blobToData(blob)).replace(/;codecs=[^;,]+/, '');
  const text = round ? '' : (S.draft[S.conv] || '').trim(); if (!round) { S.draft[S.conv] = ''; saveDraftSoon(); }
  await sendMessage({ video: { src, thumb: t.thumb, dur: Math.round((dur || t.dur || 0) * 10) / 10, w: t.w, h: t.h, round: !!round }, text });
}
/* Re-encode a picked video so it's small enough to send (first 20 seconds, 360p) */
async function shrinkVideo(file) {
  const mime = pickVideoMime(); if (!mime || !HTMLCanvasElement.prototype.captureStream) throw new Error('Your browser can\'t prepare videos. Try a shorter clip.');
  const url = URL.createObjectURL(file), v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = url;
  await new Promise((r, j) => { v.onloadedmetadata = r; v.onerror = () => j(new Error('That video can\'t be opened.')); });
  const k = Math.min(1, 360 / Math.max(v.videoWidth, v.videoHeight)), W = Math.round(v.videoWidth * k / 2) * 2, H = Math.round(v.videoHeight * k / 2) * 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const stream = c.captureStream(24), len = Math.min(v.duration || MAX_VIDEO_SEC, MAX_VIDEO_SEC);
  let actx, srcNode;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); const buf = await actx.decodeAudioData(await file.arrayBuffer()); const dest = actx.createMediaStreamDestination(); srcNode = actx.createBufferSource(); srcNode.buffer = buf; srcNode.connect(dest); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); } catch {}
  const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 200000, audioBitsPerSecond: 32000 }), chunks = [];
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(r => mr.onstop = r);
  mr.start(500); await v.play(); if (srcNode) srcNode.start(0, 0);
  const t0 = performance.now();
  await new Promise(r => { const draw = () => { g.drawImage(v, 0, 0, W, H); const el = (performance.now() - t0) / 1000; const p = document.getElementById('vprog'); if (p) p.textContent = Math.min(100, Math.round(el / len * 100)) + '%'; if (el >= len || v.ended) return r(); requestAnimationFrame(draw); }; draw(); });
  v.pause(); try { srcNode && srcNode.stop(); } catch {} mr.stop(); await done; try { actx && actx.close(); } catch {} URL.revokeObjectURL(url);
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), dur: len, trimmed: (v.duration || 0) > MAX_VIDEO_SEC + .5 };
}
/* Round video notes */
let VN = null;
async function vnoteStart() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Video messages aren\'t supported in this browser.');
  S.attach = false; render();
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }, audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { return toast('Camera or microphone access was blocked.'); }
  const L = document.createElement('div'); L.id = 'vnoteLayer';
  L.innerHTML = `<div class="vnote-live"><video autoplay playsinline muted></video><svg class="vring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48"/></svg></div><div class="vnote-time" id="vnTime">0:00 / 0:20</div><div class="call-controls" style="position:static;transform:none"><button class="cbtn" data-vn="cancel" aria-label="Cancel">${ic('trash', 22, 2)}</button><button class="cbtn red" data-vn="rec" aria-label="Start recording"><span class="recdot" style="width:18px;height:18px"></span></button><button class="cbtn" data-vn="flip" aria-label="Switch camera">${ic('expand', 20, 2)}</button></div>`;
  document.body.appendChild(L);
  const v = L.querySelector('video'); v.srcObject = stream; v.play().catch(() => {});
  VN = { stream, L, facing: 'user', recording: false };
  L.addEventListener('click', async e => { const b = e.target.closest('[data-vn]'); if (!b) return; const k = b.dataset.vn;
    if (k === 'cancel') return vnoteStop(false);
    if (k === 'flip') { if (VN.recording) return; VN.facing = VN.facing === 'user' ? 'environment' : 'user'; try { const s2 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: VN.facing, width: { ideal: 480 }, height: { ideal: 480 } }, audio: true }); VN.stream.getTracks().forEach(t => t.stop()); VN.stream = s2; v.srcObject = s2; L.classList.toggle('back', VN.facing !== 'user'); } catch {} return; }
    if (k === 'rec') { if (VN.recording) return vnoteStop(true); vnoteRecord(b); }
  });
}
function vnoteRecord(btn) {
  const mime = pickVideoMime(), mr = new MediaRecorder(VN.stream, mime ? { mimeType: mime, videoBitsPerSecond: 200000, audioBitsPerSecond: 32000 } : { videoBitsPerSecond: 200000 });
  const R0 = VN; R0.chunks = []; R0.mr = mr; R0.recording = true; R0.t0 = now(); R0.mime = mime;
  mr.ondataavailable = e => e.data.size && R0.chunks.push(e.data);
  mr.start(500); buzz(10);
  btn.innerHTML = `<span style="width:18px;height:18px;border-radius:4px;background:#fff;display:block"></span>`; btn.setAttribute('aria-label', 'Stop and send');
  const ring = VN.L.querySelector('.vring circle'), len = 2 * Math.PI * 48; ring.style.strokeDasharray = len;
  VN.iv = setInterval(() => { const el = (now() - VN.t0) / 1000; ring.style.strokeDashoffset = len * (1 - el / MAX_VIDEO_SEC); const t = document.getElementById('vnTime'); if (t) t.textContent = fmtDur(el) + ' / 0:20'; if (el >= MAX_VIDEO_SEC) vnoteStop(true); }, 100);
}
function vnoteStop(send) {
  const r = VN; if (!r) return; VN = null; clearInterval(r.iv);
  const finish = async () => { r.stream.getTracks().forEach(t => t.stop()); r.L.remove();
    if (!send || !r.chunks?.length) return;
    const dur = (now() - r.t0) / 1000; if (dur < 1) return toast('Hold on a little longer to record.');
    await sendVideoBlob(new Blob(r.chunks, { type: (r.mime || 'video/webm').split(';')[0] }), dur, true); };
  if (r.mr && r.mr.state !== 'inactive') { r.mr.onstop = finish; r.mr.stop(); } else finish();
}

/* ---- live location ---- */
let LIVE = lsGet('nexa.live', null);
function tileFor(lat, lng, z) { const n = 2 ** z, x = (lng + 180) / 360 * n, r = lat * Math.PI / 180, y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; return { x, y }; }
function vLiveBubble(m, quote) {
  const L = m.live, on = L.until > now(), z = 15, t = tileFor(L.lat, L.lng, z), W = 260, H = 150;
  const tx = Math.floor(t.x), ty = Math.floor(t.y), ox = W / 2 - (t.x - tx) * 256, oy = H / 2 - (t.y - ty) * 256;
  let tiles = ''; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) tiles += `<img src="https://tile.openstreetmap.org/${z}/${tx + dx}/${ty + dy}.png" alt="" loading="lazy" style="left:${ox + dx * 256}px;top:${oy + dy * 256}px">`;
  const mine = m.from === S.me;
  return `<div class="bub livecard">${quote}<a class="livemap" href="https://www.google.com/maps/search/?api=1&query=${L.lat},${L.lng}" target="_blank" rel="noopener noreferrer" style="width:${W}px;height:${H}px">${tiles}<span class="livepin ${on ? 'on' : ''}">${av(m.from, 30)}</span><span class="osm">© OpenStreetMap</span></a>
    <div class="row" style="gap:8px;padding:8px 6px 2px"><span class="grow"><b style="display:block">${on ? 'Live location' : 'Location sharing ended'}</b><span class="small" style="opacity:.8">${on ? `Updated ${fmtWhen(L.at)} · until ${fmtTime(L.until)}` : 'Last seen ' + fmtWhen(L.at)}</span></span>${on && mine ? `<button class="btn sm" data-a="liveStop" data-v="${m.id}">Stop</button>` : ''}</div></div>`;
}
function liveWatch() {
  if (!LIVE || LIVE.until < now()) { lsSet('nexa.live', null); LIVE = null; return; }
  if (LIVE.watch != null || !navigator.geolocation) return;
  let last = 0;
  LIVE.watch = navigator.geolocation.watchPosition(p => {
    if (!LIVE) return; if (LIVE.until < now()) return liveEnd();
    if (now() - last < 15000) return; last = now();
    db().update(`conversations/${LIVE.conv}/messages/${LIVE.msg}`, { 'live.lat': +p.coords.latitude.toFixed(5), 'live.lng': +p.coords.longitude.toFixed(5), 'live.acc': Math.round(p.coords.accuracy), 'live.at': now() }).catch(() => {});
  }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
  clearTimeout(LIVE.tm); LIVE.tm = setTimeout(liveEnd, LIVE.until - now());
}
function liveEnd() { if (!LIVE) return; try { navigator.geolocation.clearWatch(LIVE.watch); } catch {} clearTimeout(LIVE.tm); LIVE = null; lsSet('nexa.live', null); }
setTimeout(() => { if (LIVE && S.me) liveWatch(); }, 4000);

/* ---- phone gestures: edge swipe back, pull to refresh, drag sheets down ---- */
function goBack() {
  if (document.getElementById('videoLayer')) return closeVideo();
  if (S.lightbox) { S.lightbox = ''; return render(); }
  if (S.menu) { S.menu = null; return render(); }
  if (S.modal) return actions.closeModal();
  if (S.story) return actions.storyClose();
  if (S.ai?.open) return actions.aiClose();
  if (S.page === 'messages' && S.conv) return actions.closeConv();
  if (S.page === 'profile') return actions.back();
  if (S.page !== 'home') return go('home');
}
(() => {
  let g = null;
  const hint = () => document.getElementById('edgeHint') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'edgeHint', innerHTML: ic('back', 20, 2.4) }));
  const ptr = () => document.getElementById('ptr') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'ptr', innerHTML: '<span></span>' }));
  const atTop = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) if (e.scrollTop > 0) return false; return true; };
  const layers = '#callLayer,#roomLayer,#videoLayer,#vnoteLayer,#scanLayer,#watchLayer,#boardLayer,#tourLayer';
  document.addEventListener('touchstart', e => {
    g = null; if (innerWidth > 900 || e.touches.length > 1 || S.view !== 'app') return;
    const t = e.touches[0], el = e.target; if (el.closest(layers)) return;
    const sheet = innerWidth <= 700 && el.closest('.overlay .modal, .overlay .menu');
    if (sheet && t.clientY - sheet.getBoundingClientRect().top < 56 && !el.closest('input,textarea,select')) g = { k: 'sheet', y: t.clientY, el: sheet };
    else if (t.clientX < 22) g = { k: 'edge', x: t.clientX, y: t.clientY };
    else if (!el.closest('#stream,.overlay,textarea,input,.picker,.ai,.tiles') && atTop(el)) g = { k: 'pull', x: t.clientX, y: t.clientY };
  }, { passive: true, capture: true });
  document.addEventListener('touchmove', e => {
    if (!g) return; const t = e.touches[0], dx = t.clientX - (g.x || 0), dy = t.clientY - g.y;
    if (g.k === 'edge') { if (Math.abs(dy) > 70) { g = null; hint().style.cssText = ''; return; } g.dx = dx; const h = hint(); h.style.opacity = Math.min(1, dx / 90); h.style.transform = `translate(${Math.min(dx, 110) - 50}px,${t.clientY - 22}px)`; h.classList.toggle('go', dx > 90); }
    if (g.k === 'pull') { if (dy < 0 || Math.abs(dx) > Math.abs(dy)) { g = null; ptr().style.cssText = ''; return; } g.dy = dy; const p = ptr(); p.style.opacity = Math.min(1, dy / 120); p.style.transform = `translate(-50%,${Math.min(dy / 2, 90)}px) rotate(${dy * 2}deg)`; p.classList.toggle('go', dy > 150); }
    if (g.k === 'sheet') { g.dy = Math.max(0, dy); g.el.style.transition = 'none'; g.el.style.transform = `translateY(${g.dy}px)`; }
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!g) return; const k = g;
    g = null;
    if (k.k === 'edge') { const h = hint(); h.style.cssText = ''; h.classList.remove('go'); if (k.dx > 90) { buzz(6); goBack(); } }
    if (k.k === 'pull') { const p = ptr(); if (k.dy > 150) { p.classList.add('spin'); buzz(6); setTimeout(() => location.reload(), 350); } else { p.style.cssText = ''; p.classList.remove('go'); } }
    if (k.k === 'sheet') { k.el.style.transition = 'transform .25s var(--ease)'; if (k.dy > 110) { k.el.style.transform = 'translateY(110%)'; setTimeout(() => { k.el.style.transform = ''; S.menu ? (S.menu = null, render()) : actions.closeModal(); }, 200); } else k.el.style.transform = ''; }
  }, { passive: true });
})();

/* ---- modals ---- */
const _vModal5v6 = vModal5;
vModal5 = function (m, f, head) {
  if (m.type === 'closeFriends') {
    const sel = S.prefs.closeFriends || [], fr = friendIds().sort((a, b) => dname(a).localeCompare(dname(b)));
    return head('Close friends', 'Share some Moments with just these people. They won\'t be told they\'re on your list.') + `<div class="col scroll" style="gap:4px;max-height:380px">${fr.length ? fr.map(u => `<button class="item ${sel.includes(u) ? 'on' : ''}" data-a="cfPick" data-v="${u}">${av(u, 40)}<b class="grow ellip">${esc(dname(u))}</b><span class="tog ${sel.includes(u) ? 'on' : ''}" style="width:24px;height:24px;border-radius:8px" aria-hidden="true"></span></button>`).join('') : '<div class="empty">Add some friends first.</div>'}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn pri" data-a="${m.back ? 'cfBack' : 'closeModal'}">Done</button></div>`;
  }
  if (m.type === 'live') return head('Share live location', 'Your friend sees where you are on a map, updating while Nexa is open on this device.') + `
      <div class="col" style="gap:6px">${[[15, 'For 15 minutes'], [60, 'For 1 hour'], [480, 'For 8 hours']].map(([n, l]) => `<button class="item" data-a="liveGo" data-v="${n}">${ic('map', 18)}<b class="grow">${l}</b>${ic('forward', 16)}</button>`).join('')}</div>
      <div class="mute small" style="line-height:1.5">You can stop sharing any time. On phones, sharing pauses if you close Nexa.</div>`;
  if (m.type === 'myQr') return head('Your invite code', 'Friends scan this with their phone camera to add you.') + `<div class="qlbox"><div class="qrsvg">${m.svg || '<div class="skel" style="width:100%;height:100%"></div>'}</div><div class="disp" style="font-size:22px;font-weight:700">@${esc(S.profile.handle)}</div><div class="mute small ellip" style="max-width:100%">${esc(profileLink().replace(/^https?:\/\//, ''))}</div></div><div class="row" style="justify-content:flex-end;gap:10px"><button class="btn" data-a="copyHandle">${ic('link', 16)} Copy link</button><button class="btn pri" data-a="closeModal">Done</button></div>`;
  return _vModal5v6(m, f, head);
};

/* ---- actions & files ---- */
Object.assign(actions, {
  voiceRate: () => { const r = { 1: 1.5, 1.5: 2, 2: 1 }[voiceRate()] || 1; lsSet('nexa.vrate', r); if (S.playing) S.playing.a.playbackRate = r; render(); },
  moAud: d => { S.form.moClose = d.v === 'close'; if (S.form.moClose && !closeFriendIds().length) return actions.cfOpen({ back: 1 }); S.authErr = ''; render(); },
  cfOpen: d => { S.modal = { type: 'closeFriends', back: S.modal?.type === 'moment' || d?.back ? 1 : 0 }; render(); },
  cfPick: d => { const s = S.prefs.closeFriends || []; savePrefs({ closeFriends: s.includes(d.v) ? s.filter(x => x !== d.v) : [...s, d.v] }); },
  cfBack: () => { S.modal = { type: 'moment' }; S.form.moClose = closeFriendIds().length > 0; render(); },
  vnoteStart: () => vnoteStart(),
  playVideo: d => openVideo((S.msgs[S.conv] || []).find(x => x.id === d.v)),
  liveOpen: () => { S.attach = false; if (!navigator.geolocation) return toast('Location isn\'t available on this device.'); S.modal = { type: 'live' }; render(); },
  liveGo: async d => {
    const mins = +d.v; S.modal = null; render(); toast('Finding your location…');
    let p; try { p = await new Promise((r, j) => navigator.geolocation.getCurrentPosition(r, j, { enableHighAccuracy: true, timeout: 15000 })); } catch { return toast('Location access was blocked. Allow it in your browser settings.'); }
    if (LIVE) { await db().update(`conversations/${LIVE.conv}/messages/${LIVE.msg}`, { 'live.until': now() }).catch(() => {}); liveEnd(); }
    const until = now() + mins * 60e3, conv = S.conv;
    const id = await sendMessage({ live: { lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5), acc: Math.round(p.coords.accuracy), at: now(), until } });
    if (id) { LIVE = { conv, msg: id, until }; lsSet('nexa.live', { conv, msg: id, until }); liveWatch(); }
  },
  liveStop: async d => { await db().update(`conversations/${S.conv}/messages/${d.v}`, { 'live.until': now() }); if (LIVE?.msg === d.v) liveEnd(); toast('Stopped sharing your location'); },
  myQr: async () => {
    S.modal = { type: 'myQr' }; render();
    try { const Q = (await import('./qr.js')).default; const q = Q(0, 'M'); q.addData(profileLink()); q.make(); if (S.modal?.type === 'myQr') { S.modal.svg = q.createSvgTag({ cellSize: 6, margin: 3, scalable: true }); render(); } } catch {}
  }
});
Object.assign(files, {
  sendVideo: async f => {
    S.attach = false; render();
    if (!f.type.startsWith('video/')) return toast('Pick a video file.');
    if (f.size > 300e6) return toast('That video is too big.');
    const probe = await videoThumb(URL.createObjectURL(f));
    if (f.size <= MAX_VIDEO_BYTES && (probe.dur || 0) <= 30 && /mp4|webm|quicktime/.test(f.type)) return sendVideoBlob(f, probe.dur, false);
    toast(`Preparing your video… <b id="vprog">0%</b>`);
    try { const out = await shrinkVideo(f); if (out.trimmed) toast('Videos can be up to 20 seconds — sending the first 20.'); await sendVideoBlob(out.blob, out.dur, false); }
    catch (e) { toast(esc(e.message || 'Couldn\'t prepare that video.')); }
  }
});
