// Nexa Arcade 2 — 11 games in one file, loaded only when someone opens a game.
// Every game: keyboard + mouse + touch, best score saved per account, sound you can mute, pause when you leave the tab.
const GLASS = `
#nxg{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;color:#F6F4EF;font-family:"Nexa Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#05060d;animation:nxgIn .45s cubic-bezier(.16,1,.3,1) both;-webkit-user-select:none;user-select:none}
@keyframes nxgIn{from{opacity:0;transform:scale(.985)}}
#nxg [hidden]{display:none!important}
#nxg .g-top{position:absolute;left:0;right:0;top:0;z-index:5;display:flex;align-items:center;gap:8px;padding:12px 14px;pointer-events:none}
#nxg .g-top>*{pointer-events:auto}
#nxg .g-gl{position:relative;background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.06) 45%,rgba(255,255,255,.1)),rgba(18,16,40,.28);border:1px solid rgba(255,255,255,.26);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.7),inset 0 -1px 0 rgba(255,255,255,.12),inset 0 -14px 24px -18px rgba(255,255,255,.35),0 14px 34px -16px rgba(0,0,0,.6);backdrop-filter:blur(18px) saturate(190%);-webkit-backdrop-filter:blur(18px) saturate(190%)}
#nxg .g-title{border-radius:999px;padding:9px 16px;font-weight:800;font-size:16px;display:flex;gap:8px;align-items:center}
#nxg .g-stat{border-radius:999px;padding:9px 14px;font-weight:800;font-size:14px;white-space:nowrap;font-variant-numeric:tabular-nums}
#nxg .g-stat small{opacity:.7;font-weight:700;margin-right:4px}
#nxg .g-sp{flex:1}
#nxg .g-ib{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;cursor:pointer;font-size:17px;color:inherit;transition:transform .5s cubic-bezier(.3,1.12,.5,1)}
#nxg .g-ib:active{transform:scale(.93);transition-duration:.1s}
#nxg .g-stage{position:relative;flex:1;min-height:0;overflow:hidden}
#nxg canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
#nxg .g-over{position:absolute;inset:0;z-index:6;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 50% 40%,rgba(10,10,30,.25),rgba(4,4,12,.6));animation:nxgF .35s ease both}
@keyframes nxgF{from{opacity:0}}
#nxg .g-card{border-radius:30px;padding:28px 26px 24px;text-align:center;width:min(380px,100%);background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.05) 40%,rgba(255,255,255,.08)),rgba(14,12,34,.66)!important;animation:nxgUp .55s cubic-bezier(.16,1,.3,1) both}
@keyframes nxgUp{from{opacity:0;transform:translateY(18px) scale(.97)}}
#nxg .g-card .g-em{font-size:62px;line-height:1;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))}
#nxg .g-card h2{margin:10px 0 6px;font-size:30px;letter-spacing:-.01em}
#nxg .g-card p{margin:0;opacity:.82;line-height:1.5;font-size:15px}
#nxg .g-keys{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:12px}
#nxg .g-keys span{font-size:12.5px;font-weight:700;padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14)}
#nxg .g-go{margin-top:18px;height:50px;padding:0 30px;border-radius:999px;border:0;font:inherit;font-weight:800;font-size:16px;cursor:pointer;color:#0b0b12;background:linear-gradient(180deg,#fff,#e6e2f3);box-shadow:inset 0 -2px 0 rgba(0,0,0,.08),0 12px 30px -10px rgba(255,255,255,.5);transition:transform .5s cubic-bezier(.3,1.12,.5,1)}
#nxg .g-go:hover{transform:translateY(-1px)}#nxg .g-go:active{transform:scale(.96);transition-duration:.1s}
#nxg .g-big{font-size:44px;font-weight:900;letter-spacing:-.02em;margin:6px 0 2px;font-variant-numeric:tabular-nums}
#nxg .g-new{display:inline-block;margin-top:6px;padding:5px 12px;border-radius:99px;font-weight:800;font-size:13px;color:#1b1300;background:linear-gradient(90deg,#FFE27A,#FFB86B)}
#nxg .g-toast{position:absolute;left:50%;top:76px;z-index:6;transform:translateX(-50%);padding:9px 16px;border-radius:999px;font-weight:800;pointer-events:none;opacity:0;transition:opacity .3s,transform .5s cubic-bezier(.16,1,.3,1)}
#nxg .g-toast.on{opacity:1;transform:translateX(-50%) translateY(4px)}
#nxg .g-pad{position:absolute;z-index:4;bottom:18px;left:0;right:0;display:flex;justify-content:space-between;padding:0 18px;pointer-events:none}
#nxg .g-pad button{pointer-events:auto;width:76px;height:76px;border-radius:50%;font-size:26px;color:inherit}
@media (hover:hover) and (pointer:fine){#nxg .g-pad{display:none}}
#nxg .cf-grid{position:absolute;inset:80px 0 0;display:grid;place-content:center;gap:12px;perspective:900px;padding:12px}
#nxg .cf-card{position:relative;border:0;padding:0;background:none;cursor:pointer;transform-style:preserve-3d;transition:transform .6s cubic-bezier(.3,1.12,.5,1)}
#nxg .cf-card.up,#nxg .cf-card.done{transform:rotateY(180deg)}
#nxg .cf-card i,#nxg .cf-card b{position:absolute;inset:0;border-radius:18px;display:grid;place-items:center;backface-visibility:hidden;-webkit-backface-visibility:hidden}
#nxg .cf-card i{background:linear-gradient(150deg,rgba(255,255,255,.24),rgba(255,255,255,.06)),linear-gradient(150deg,#6a5cff,#ff5fa8);border:1px solid rgba(255,255,255,.3);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.7),0 10px 24px -12px rgba(0,0,0,.7);font-style:normal;font-size:28px;opacity:.95}
#nxg .cf-card b{transform:rotateY(180deg);background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(235,232,248,.92));box-shadow:inset 0 -3px 0 rgba(0,0,0,.06),0 10px 24px -12px rgba(0,0,0,.7);font-size:clamp(28px,7vmin,46px)}
#nxg .cf-card.done b{box-shadow:0 0 0 3px #7BF0B8,0 0 30px -4px #7BF0B8}
@media (prefers-reduced-motion:reduce){#nxg,#nxg *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, pick = a => a[(Math.random() * a.length) | 0];
const rr = (x, l, t, w, h, r) => { x.beginPath(); if (!(w > 0 && h > 0)) return; r = Math.max(0, Math.min(r, w / 2, h / 2)); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); };
// a glass tile drawn on canvas: colour body, frosted top light, bright rim
function glassTile(x, l, t, w, h, r, col, a = 1) {
  x.save(); x.globalAlpha = a;
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = h * .35; x.shadowOffsetY = h * .12; rr(x, l, t, w, h, r); x.fillStyle = col; x.fill(); x.shadowColor = 'transparent';
  const k = h > 160 && w > 160 ? .22 : 1, g = x.createLinearGradient(0, t, 0, t + h); g.addColorStop(0, `rgba(255,255,255,${.55 * k})`); g.addColorStop(.45, `rgba(255,255,255,${.08 * k})`); g.addColorStop(1, `rgba(255,255,255,${.18 * k})`); x.fillStyle = g; rr(x, l, t, w, h, r); x.fill();
  x.lineWidth = Math.max(1, Math.min(2, h * .04)); x.strokeStyle = `rgba(255,255,255,${k < 1 ? .25 : .55})`; rr(x, l + .5, t + .5, w - 1, h - 1, r); x.stroke();
  x.restore();
}

// ---------- tiny sound kit (no files) ----------
let AC = null, muted = false; try { muted = localStorage.getItem('nexa.g.mute') === '1'; } catch {}
function tone(f = 440, d = .08, type = 'sine', v = .06, slide = 0) {
  if (muted) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .02); } catch {}
}
const SFX = { coin: () => { tone(880, .07, 'square', .04); setTimeout(() => tone(1320, .09, 'square', .04), 60); }, hit: () => tone(140, .25, 'sawtooth', .07, -90), jump: () => tone(380, .12, 'triangle', .06, 300), pop: () => tone(620, .06, 'sine', .07, 200), lose: () => { tone(330, .18, 'triangle', .07, -120); setTimeout(() => tone(220, .3, 'triangle', .07, -100), 160); }, win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .12, 'triangle', .06), i * 90)), tick: () => tone(1200, .03, 'square', .025), shoot: () => tone(900, .06, 'square', .025, -500), boom: () => tone(90, .35, 'sawtooth', .08, -50) };

// ---------- particles ----------
function Parts() { const L = []; return { add(x0, y0, n, col, sp = 4, life = 40, size = 3) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = Math.random() * sp; L.push({ x: x0, y: y0, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * .3, l: life * rnd(.6, 1), m: life, c: typeof col === 'function' ? col() : col, s: size * rnd(.6, 1.3) }); } }, step(x, g = .12) { for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.x += p.vx; p.y += p.vy; p.vy += g; p.vx *= .985; if (--p.l <= 0) { L.splice(i, 1); continue; } x.globalAlpha = Math.max(0, p.l / p.m); x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.s, 0, 6.283); x.fill(); } x.globalAlpha = 1; }, clear() { L.length = 0; } }; }

// ======================================================================
// The games
// ======================================================================
const GAMES = {};

// ---------- 1. Nexa Racer 3D: a real road with curves, hills, traffic and nitro ----------
GAMES.racer = {
  t: 'Nexa Racer', e: '🏎️', hint: 'A real 3D road. Overtake traffic, grab coins and hit nitro.', keys: ['← → steer', '↑ go faster', '↓ brake', 'Space = nitro', 'Tap the sides on a phone'], pad: true,
  make(E) {
    const SEG = 200, RW = 2000, LANES = 3, CAMH = 1000, DRAW = 220, FOV = 100, camD = 1 / Math.tan(FOV / 2 * Math.PI / 180);
    let segs = [], len = 0, cars = [], coins = [], p, S;
    const ease = (a, b, t) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + .5);
    const lastY = () => segs.length ? segs[segs.length - 1].p2.y : 0;
    const add = (curve, y) => { const n = segs.length; segs.push({ i: n, p1: { z: n * SEG, y: lastY() }, p2: { z: (n + 1) * SEG, y }, curve, dark: Math.floor(n / 3) % 2, sprites: [] }); };
    const road = (en, ho, le, c, h) => { const y0 = lastY(), y1 = y0 + h * SEG, tot = en + ho + le; for (let i = 0; i < en; i++) add(ease(0, c, i / en), ease(y0, y1, i / tot)); for (let i = 0; i < ho; i++) add(c, ease(y0, y1, (en + i) / tot)); for (let i = 0; i < le; i++) add(ease(c, 0, i / le), ease(y0, y1, (en + ho + i) / tot)); };
    const build = () => {
      segs = []; road(25, 25, 25, 0, 0); for (let k = 0; k < 14; k++) road(ri(20, 50), ri(20, 60), ri(20, 50), pick([0, 2, -2, 4, -4, 6, -6, 3, -3]), pick([0, 0, 20, -20, 40, -40, 60]));
      road(40, 40, 40, 0, -lastY() / SEG); len = segs.length * SEG;
      segs.forEach((s, i) => { if (i > 20 && i % 4 === 0) s.sprites.push({ k: pick(['tree', 'tree', 'pine', 'palm', 'lamp']), x: pick([-1, 1]) * rnd(1.25, 2.6) }); if (i > 20 && i % 50 === 0) s.sprites.push({ k: 'sign', x: pick([-1.35, 1.35]) }); });
      cars = []; for (let i = 0; i < 26; i++) cars.push({ z: rnd(.08, 1) * len, x: pick([-.66, 0, .66]), sp: rnd(.32, .6), col: pick(['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8ecae6', '#ffffff', '#6a4c93', '#222831']), w: pick([1, 1, 1.15]) });
      coins = []; for (let i = 0; i < 90; i++) coins.push({ z: rnd(.05, 1) * len, x: pick([-.66, 0, .66]), got: false });
    };
    const seg = z => segs[Math.floor(z / SEG) % segs.length];
    const proj = (pt, cx, cy, cz, cl, W, H) => { const dz = pt.z - cz; const s = camD / dz; pt.sx = Math.round(W / 2 + s * (pt.wx - cx) * W / 2); pt.sy = Math.round(H / 2 - s * (pt.wy - cy) * H / 2); pt.sw = Math.round(s * RW * W / 2); pt.s = s; };
    const poly = (x, a, b, c, d, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(c[0], c[1]); x.lineTo(d[0], d[1]); x.closePath(); x.fill(); };
    function sprite(x, k, sx, sy, sc, W) {
      const u = sc * W * 1.6; if (u < .015) return; x.save(); x.translate(sx, sy);
      if (k === 'tree' || k === 'pine') { x.fillStyle = '#5b3a1e'; x.fillRect(-u * 18, -u * 120, u * 36, u * 120); const cols = k === 'pine' ? ['#1d5e3a', '#24744a', '#2f8a58'] : ['#2f7d3a', '#3f9a47', '#58b85a']; if (k === 'pine') { for (let i = 0; i < 3; i++) { x.fillStyle = cols[i]; x.beginPath(); x.moveTo(0, -u * (330 - i * 70)); x.lineTo(u * (120 - i * 10), -u * (110 + i * 40 - 60)); x.lineTo(-u * (120 - i * 10), -u * (110 + i * 40 - 60)); x.fill(); } } else { [[0, -200, 110], [-60, -150, 80], [60, -150, 80], [0, -280, 80]].forEach(([dx, dy, r], i) => { x.fillStyle = cols[i % 3]; x.beginPath(); x.arc(u * dx, u * dy, u * r, 0, 6.283); x.fill(); }); x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(-u * 30, -u * 250, u * 40, 0, 6.283); x.fill(); } }
      else if (k === 'palm') { x.strokeStyle = '#8a6239'; x.lineWidth = u * 26; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(u * 40, -u * 160, u * 10, -u * 300); x.stroke(); x.strokeStyle = '#2f9e44'; x.lineWidth = u * 18; for (let a = 0; a < 6; a++) { const an = a / 6 * 6.283; x.beginPath(); x.moveTo(u * 10, -u * 300); x.quadraticCurveTo(u * (10 + Math.cos(an) * 120), -u * (340 + Math.sin(an) * 30), u * (10 + Math.cos(an) * 190), -u * (260 + Math.sin(an) * 60)); x.stroke(); } }
      else if (k === 'lamp') { x.fillStyle = '#555c6e'; x.fillRect(-u * 8, -u * 360, u * 16, u * 360); x.fillRect(-u * 8, -u * 360, u * 90, u * 12); x.fillStyle = '#fff3c4'; x.shadowColor = '#ffe08a'; x.shadowBlur = u * 60; x.fillRect(u * 60, -u * 352, u * 34, u * 12); }
      else if (k === 'sign') { x.fillStyle = '#4a4f63'; x.fillRect(-u * 120, -u * 260, u * 12, u * 260); x.fillRect(u * 108, -u * 260, u * 12, u * 260); glassTile(x, -u * 170, -u * 420, u * 340, u * 170, u * 30, '#3d6cff'); x.fillStyle = '#fff'; x.font = `800 ${u * 70}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('NEXA', 0, -u * 335); }
      x.restore();
    }
    function car(x, cx, cy, w, col, me, tilt = 0, brake = false) {
      const h = w * .52; x.save(); x.translate(cx, cy); x.rotate(tilt);
      x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(0, 0, w * .58, h * .16, 0, 0, 6.283); x.fill();
      x.fillStyle = '#111'; rr(x, -w * .5, -h * .34, w * .17, h * .34, w * .03); x.fill(); rr(x, w * .33, -h * .34, w * .17, h * .34, w * .03); x.fill();
      const g = x.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, col); g.addColorStop(.55, col); g.addColorStop(1, 'rgba(0,0,0,.55)');
      x.fillStyle = g; rr(x, -w * .5, -h * .9, w, h * .62, w * .12); x.fill();
      x.fillStyle = col; rr(x, -w * .36, -h * 1.22, w * .72, h * .42, w * .14); x.fill();
      const gl = x.createLinearGradient(0, -h * 1.18, 0, -h * .86); gl.addColorStop(0, '#9fc3ff'); gl.addColorStop(1, '#1b2340'); x.fillStyle = gl; rr(x, -w * .3, -h * 1.16, w * .6, h * .3, w * .08); x.fill();
      x.fillStyle = 'rgba(255,255,255,.35)'; rr(x, -w * .46, -h * .88, w * .92, h * .08, w * .04); x.fill();
      x.fillStyle = brake ? '#ff2a2a' : '#c4121a'; if (brake) { x.shadowColor = '#ff2a2a'; x.shadowBlur = w * .25; } rr(x, -w * .46, -h * .62, w * .2, h * .12, w * .03); x.fill(); rr(x, w * .26, -h * .62, w * .2, h * .12, w * .03); x.fill(); x.shadowBlur = 0;
      x.fillStyle = '#dfe3ea'; rr(x, -w * .14, -h * .5, w * .28, h * .1, w * .02); x.fill();
      if (me) { x.fillStyle = '#ffd23f'; x.font = `900 ${h * .16}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('NEXA', 0, -h * .44); }
      x.restore();
    }
    return {
      init() { build(); p = { x: 0, z: 0, sp: 0, max: SEG * 60, nitro: 100, boost: 0, hearts: 3, coins: 0, dist: 0, hitT: 0, steer: 0 }; S = { L: false, R: false, U: false, D: false, N: false }; E.score(0); },
      key(k, down) { if (k === 'ArrowLeft' || k === 'a' || k === 'A') S.L = down; if (k === 'ArrowRight' || k === 'd' || k === 'D') S.R = down; if (k === 'ArrowUp' || k === 'w' || k === 'W') S.U = down; if (k === 'ArrowDown' || k === 's' || k === 'S') S.D = down; if (k === ' ' || k === 'Shift') S.N = down; },
      down(pt) { if (pt.y < E.H() * .35) { S.N = true; return; } if (pt.x < E.W() / 2) S.L = true; else S.R = true; },
      up() { S.L = S.R = S.N = false; },
      padL(d) { S.L = d; }, padR(d) { S.R = d; },
      update(dt) {
        const f = dt * 60, accel = p.max / 5, s0 = seg(p.z);
        const boosting = S.N && p.nitro > 0; if (boosting) { p.nitro = Math.max(0, p.nitro - .6 * f); p.boost = Math.min(1, p.boost + .08 * f); } else { p.nitro = Math.min(100, p.nitro + .05 * f); p.boost = Math.max(0, p.boost - .04 * f); }
        const top = p.max * (1 + p.boost * .45);
        if (S.D) p.sp -= accel * 2 * dt; else if (S.U || true) p.sp += accel * (S.U ? 1 : .7) * dt; // goes by itself; ↑ faster
        const dx = dt * 2 * (p.sp / p.max); p.steer = lerp(p.steer, (S.L ? -1 : 0) + (S.R ? 1 : 0), .2 * f);
        p.x += p.steer * dx; p.x -= dx * (p.sp / p.max) * s0.curve * .3;
        if (Math.abs(p.x) > 1) { p.sp -= accel * 2.5 * dt; if (Math.abs(p.x) > 2.2) p.x = Math.sign(p.x) * 2.2; }
        p.sp = clamp(p.sp, 0, top); if (p.hitT > 0) { p.hitT -= dt; }
        p.z = (p.z + p.sp * dt) % len; p.dist += p.sp * dt;
        cars.forEach(c => { c.z = (c.z + c.sp * p.max * dt) % len;
          const rel = (c.z - p.z + len) % len; if (rel < SEG * .9 && rel > 0 && Math.abs(c.x - p.x) < .42 && p.hitT <= 0 && p.sp > c.sp * p.max) { p.sp = c.sp * p.max * .5; p.hitT = 1.2; p.hearts--; E.shake(14); SFX.hit(); E.vib(140); E.toast(p.hearts > 0 ? `💥 Crash! ${'❤️'.repeat(p.hearts)} left` : '💥 Wrecked!'); if (p.hearts <= 0) E.end(Math.round(p.dist / 100) + p.coins * 50, `🪙 ${p.coins} coins · ${(p.dist / 100000).toFixed(1)} km`); } });
        coins.forEach(c => { if (c.got) { if (((c.z - p.z + len) % len) > len * .5) c.got = false; return; } const rel = (c.z - p.z + len) % len; if (rel < SEG && Math.abs(c.x - p.x) < .35) { c.got = true; p.coins++; SFX.coin(); } });
        E.score(Math.round(p.dist / 100) + p.coins * 50);
        E.stat2(`🪙 ${p.coins}  ${'❤️'.repeat(Math.max(0, p.hearts))}  ⚡${Math.round(p.nitro)}%`);
      },
      draw(x, W, H) {
        const cam = p ? p.z : 0, base = seg(cam), bp = (cam % SEG) / SEG, py = lerp(base.p1.y, base.p2.y, bp), camY = CAMH + py;
        const sky = x.createLinearGradient(0, 0, 0, H * .6); sky.addColorStop(0, '#1a1f5c'); sky.addColorStop(.45, '#c0508a'); sky.addColorStop(.8, '#ffb56b'); sky.addColorStop(1, '#ffd9a0'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
        const curveOff = p ? (p.z / len) * 2400 : 0;
        x.fillStyle = 'rgba(255,240,200,.95)'; x.shadowColor = '#ffd08a'; x.shadowBlur = 60; x.beginPath(); x.arc(W * .62 - (curveOff * .05 % W), H * .36, Math.min(W, H) * .08, 0, 6.283); x.fill(); x.shadowBlur = 0;
        [[.42, '#6b3a7a', .2, 60], [.47, '#4a2a6a', .4, 40], [.52, '#2f2357', .7, 26]].forEach(([yy, col, par, amp]) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 8) { const t = (i + curveOff * par) / W; x.lineTo(i, H * yy - Math.abs(Math.sin(t * 5.3) * amp + Math.sin(t * 13.1) * amp * .4) * (H / 700)); } x.lineTo(W, H); x.fill(); });
        let maxy = H, xo = 0, dxo = -(base.curve * bp);
        const list = [];
        for (let n = 0; n < DRAW; n++) {
          const s = segs[(base.i + n) % segs.length], loop = s.i < base.i; const cz = cam - (loop ? len : 0);
          const pcx = (p ? p.x : 0) * RW;
          const a = { z: s.p1.z, wx: xo, wy: s.p1.y }, b = { z: s.p2.z, wx: xo + dxo, wy: s.p2.y };
          proj(a, pcx, camY, cz, 0, W, H); proj(b, pcx, camY, cz, 0, W, H); xo += dxo; dxo += s.curve;
          s._a = a; s._b = b; s._clip = maxy;
          if (a.s <= 0 || b.sy >= maxy || a.sy <= b.sy) { list.push(s); continue; }
          const fog = Math.min(1, n / DRAW * 1.4);
          const gcol = s.dark ? '#2f7a3d' : '#37894a', rum = s.dark ? '#e8e8f0' : '#d1323c', rd = s.dark ? '#3a3d4c' : '#40435a';
          x.fillStyle = gcol; x.fillRect(0, b.sy, W, a.sy - b.sy);
          const r1 = a.sw / 6, r2 = b.sw / 6;
          poly(x, [a.sx - a.sw - r1, a.sy], [a.sx - a.sw, a.sy], [b.sx - b.sw, b.sy], [b.sx - b.sw - r2, b.sy], rum);
          poly(x, [a.sx + a.sw + r1, a.sy], [a.sx + a.sw, a.sy], [b.sx + b.sw, b.sy], [b.sx + b.sw + r2, b.sy], rum);
          poly(x, [a.sx - a.sw, a.sy], [a.sx + a.sw, a.sy], [b.sx + b.sw, b.sy], [b.sx - b.sw, b.sy], rd);
          if (s.dark) { const l1 = a.sw / 40, l2 = b.sw / 40; for (let l = 1; l < LANES; l++) { const ax = a.sx - a.sw + a.sw * 2 / LANES * l, bx = b.sx - b.sw + b.sw * 2 / LANES * l; poly(x, [ax - l1, a.sy], [ax + l1, a.sy], [bx + l2, b.sy], [bx - l2, b.sy], '#f2f2f2'); } }
          if (fog > .3) { x.fillStyle = `rgba(255,190,150,${(fog - .3) * .5})`; x.fillRect(0, b.sy, W, a.sy - b.sy); }
          maxy = b.sy; list.push(s);
        }
        for (let n = list.length - 1; n > 0; n--) {
          const s = list[n], a = s._a; if (!a || a.s <= 0) continue;
          s.sprites.forEach(sp => { const sx = a.sx + a.sw * sp.x, sy = a.sy; if (sy < s._clip + 2) sprite(x, sp.k, sx, sy, a.s, W); });
          coins.forEach(c => { if (c.got || seg(c.z) !== s) return; const sx = a.sx + a.sw * c.x, u = a.s * W * 1.6, r = u * 40; if (r < 1) return; const yy = a.sy - u * 70; x.fillStyle = '#ffd23f'; x.shadowColor = '#ffd23f'; x.shadowBlur = r; x.beginPath(); x.ellipse(sx, yy, r * Math.abs(Math.cos(performance.now() / 200)) + r * .2, r, 0, 0, 6.283); x.fill(); x.shadowBlur = 0; });
          cars.forEach(c => { if (seg(c.z) !== s) return; const sx = a.sx + a.sw * c.x, w = a.s * W * 340 * c.w; if (w < 2) return; car(x, sx, a.sy, w, c.col, false, 0, Math.random() < .02); });
        }
        if (p) { const w = Math.min(W * .34, 300), tilt = p.steer * .06 * (p.sp / p.max); car(x, W / 2, H - H * .06 + Math.sin(performance.now() / 60) * (p.sp / p.max) * 1.2, w, p.hitT > 0 && (performance.now() / 80 | 0) % 2 ? '#ffffff' : '#2f6bff', true, tilt, S.D);
          if (p.boost > .1) { x.fillStyle = `rgba(120,200,255,${p.boost * .6})`; for (let i = 0; i < 2; i++) { x.beginPath(); x.ellipse(W / 2 + (i ? 1 : -1) * w * .2, H - H * .02, w * .06, w * .14 * (1 + Math.random()), 0, 0, 6.283); x.fill(); } for (let i = 0; i < 18; i++) { const yy = rnd(0, H), xx = rnd(0, 1) < .5 ? rnd(0, W * .2) : rnd(W * .8, W); x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(xx, yy, 2, 40 * p.boost); } }
          const sp = Math.round(p.sp / p.max * 220); x.font = '900 34px system-ui'; x.textAlign = 'right'; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 10; x.fillText(sp + ' km/h', W - 22, H - 26); x.shadowBlur = 0;
          x.fillStyle = 'rgba(255,255,255,.18)'; rr(x, 22, H - 44, 160, 14, 7); x.fill(); const ng = x.createLinearGradient(22, 0, 182, 0); ng.addColorStop(0, '#5ad1ff'); ng.addColorStop(1, '#b98bff'); x.fillStyle = ng; rr(x, 22, H - 44, 160 * p.nitro / 100, 14, 7); x.fill(); x.font = '800 12px system-ui'; x.textAlign = 'left'; x.fillStyle = '#fff'; x.fillText('NITRO', 24, H - 52);
        }
      },
    };
  },
};

// ---------- 2. Sky Glide ----------
GAMES.glide = {
  t: 'Sky Glide', e: '🕊️', hint: 'Tap to flap through the glass towers. Don’t touch them!', keys: ['Tap / Space to flap'],
  make(E) {
    let b, pipes, t, sc, P = Parts(), clouds = [];
    return {
      init() { b = { y: E.H() * .45, v: 0, r: 0 }; pipes = []; t = 0; sc = 0; E.score(0); clouds = Array.from({ length: 8 }, () => ({ x: rnd(0, E.W()), y: rnd(0, E.H() * .6), s: rnd(.5, 1.4), v: rnd(.2, .6) })); },
      flap() { b.v = -7.4; SFX.jump(); P.add(E.W() * .28, b.y + 10, 6, 'rgba(255,255,255,.8)', 2, 20, 2); },
      key(k, d) { if (d && (k === ' ' || k === 'ArrowUp' || k === 'w')) this.flap(); }, down() { this.flap(); },
      update(dt) {
        const f = dt * 60, W = E.W(), H = E.H(), gap = Math.max(150, 210 - sc * 2), sp = (3.2 + Math.min(3, sc * .06)) * f;
        b.v += .42 * f; b.y += b.v * f; b.r = clamp(b.v / 12, -.5, 1.2); t += f;
        if (!pipes.length || pipes[pipes.length - 1].x < W - Math.max(230, 300 - sc * 3)) pipes.push({ x: W + 40, gy: rnd(H * .22, H * .72), gap, done: false, hue: ri(0, 360) });
        pipes.forEach(p => { p.x -= sp; if (!p.done && p.x + 40 < W * .28) { p.done = true; sc++; E.score(sc); SFX.coin(); P.add(W * .28, b.y, 14, '#ffe27a', 4, 30, 3); } });
        pipes = pipes.filter(p => p.x > -120);
        clouds.forEach(c => { c.x -= c.v * f; if (c.x < -200) { c.x = W + 100; c.y = rnd(0, H * .6); } });
        const bx = W * .28; const dead = b.y > H - 40 || b.y < -40 || pipes.some(p => bx + 16 > p.x && bx - 16 < p.x + 78 && (b.y - 14 < p.gy - p.gap / 2 || b.y + 14 > p.gy + p.gap / 2));
        if (dead) { SFX.hit(); E.shake(12); E.vib(120); P.add(bx, b.y, 30, '#fff', 6, 40, 3); E.end(sc, sc >= 40 ? '🥇 Gold wings!' : sc >= 20 ? '🥈 Silver wings' : sc >= 10 ? '🥉 Bronze wings' : 'Keep flapping!'); }
      },
      draw(x, W, H) {
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3b7bff'); g.addColorStop(.6, '#9ad0ff'); g.addColorStop(1, '#ffe3b3'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        clouds.forEach(c => { x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.arc(c.x, c.y, 30 * c.s, 0, 6.283); x.arc(c.x + 30 * c.s, c.y + 8, 24 * c.s, 0, 6.283); x.arc(c.x - 30 * c.s, c.y + 10, 20 * c.s, 0, 6.283); x.fill(); });
        const off = (t || 0) * .6; [['#7fa7d9', .7, 80], ['#5c84c0', 1.2, 50]].forEach(([c, sp, h]) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W + 40; i += 40) { const k = Math.floor((i + off * sp) / 40); x.lineTo(i - ((off * sp) % 40), H - h - ((k * 9301 + 49297) % 233280) / 233280 * h * 1.6); } x.lineTo(W, H); x.fill(); });
        (pipes || []).forEach(p => { const col = `hsl(${p.hue} 80% 60% / .55)`; glassTile(x, p.x, -20, 78, p.gy - p.gap / 2 + 20, 18, col); glassTile(x, p.x, p.gy + p.gap / 2, 78, H - (p.gy + p.gap / 2) + 20, 18, col); });
        if (b) { x.save(); x.translate(W * .28, b.y); x.rotate(b.r); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0, 0, 20, 15, 0, 0, 6.283); x.fill(); x.fillStyle = '#ffd23f'; x.beginPath(); x.moveTo(18, -2); x.lineTo(30, 3); x.lineTo(18, 8); x.fill(); x.fillStyle = '#1b1b2a'; x.beginPath(); x.arc(9, -4, 3, 0, 6.283); x.fill(); x.fillStyle = '#dfe8ff'; x.beginPath(); x.ellipse(-6, Math.sin(performance.now() / 60) * 6, 12, 7, -.4, 0, 6.283); x.fill(); x.restore(); }
        P.step(x);
      },
    };
  },
};

// ---------- 3. Merge 2048 ----------
GAMES.m2048 = {
  t: 'Merge 2048', e: '🔢', hint: 'Slide the tiles. Same numbers merge. Get to 2048!', keys: ['Arrow keys', 'Swipe'],
  make(E) {
    let g, tiles, sc, id = 0, won = false; const N = 4;
    const COL = { 2: '#8ecae6', 4: '#7bdff2', 8: '#ffb86b', 16: '#ff9f68', 32: '#ff7a7a', 64: '#ff4f6d', 128: '#ffd166', 256: '#ffc43d', 512: '#b5e48c', 1024: '#7bf0b8', 2048: '#b794ff' };
    const spawn = () => { const e = []; for (let i = 0; i < N * N; i++) if (!g[i]) e.push(i); if (!e.length) return; const i = pick(e); const t = { id: id++, v: Math.random() < .9 ? 2 : 4, i, x: i % N, y: (i / N) | 0, s: 0 }; g[i] = t; tiles.push(t); };
    const moves = () => { for (let i = 0; i < N * N; i++) { if (!g[i]) return true; const x0 = i % N, y0 = (i / N) | 0; if (x0 < N - 1 && g[i + 1] && g[i + 1].v === g[i].v) return true; if (y0 < N - 1 && g[i + N] && g[i + N].v === g[i].v) return true; } return false; };
    const slide = (dx, dy) => {
      let moved = false; const order = [...Array(N).keys()]; if (dx > 0 || dy > 0) order.reverse(); const merged = new Set();
      for (const yy of (dy ? order : [...Array(N).keys()])) for (const xx of (dx ? order : [...Array(N).keys()])) {
        const t = g[yy * N + xx]; if (!t) continue; let nx = xx, ny = yy;
        while (true) { const tx = nx + dx, ty = ny + dy; if (tx < 0 || ty < 0 || tx >= N || ty >= N) break; const o = g[ty * N + tx]; if (!o) { nx = tx; ny = ty; continue; } if (o.v === t.v && !merged.has(o.id)) { g[yy * N + xx] = null; o.v *= 2; o.s = 1.25; merged.add(o.id); sc += o.v; t.dead = o; t.tx = tx; t.ty = ty; moved = true; SFX.pop(); if (o.v === 2048 && !won) { won = true; SFX.win(); E.toast('🎉 2048! Keep going'); } } break; }
        if (!t.dead && (nx !== xx || ny !== yy)) { g[yy * N + xx] = null; g[ny * N + nx] = t; t.tx = nx; t.ty = ny; moved = true; }
      }
      if (moved) { setTimeout(() => { tiles = tiles.filter(t => !t.dead); spawn(); E.score(sc); if (!moves()) E.end(sc, 'Biggest tile: ' + Math.max(...tiles.map(t => t.v))); }, 110); }
    };
    return {
      init() { g = Array(N * N).fill(null); tiles = []; sc = 0; won = false; spawn(); spawn(); E.score(0); },
      key(k, d) { if (!d) return; const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[k]; if (m) slide(...m); },
      swipe(dx, dy) { slide(dx, dy); },
      update(dt) { tiles.forEach(t => { if (t.tx != null) { t.x = lerp(t.x, t.tx, .45); t.y = lerp(t.y, t.ty, .45); } t.s = lerp(t.s, 1, .25); }); },
      draw(x, W, H) {
        const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1d1740'); bg.addColorStop(1, '#3d1440'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
        const sz = Math.min(W - 32, H - 140, 520), cell = sz / N, l = (W - sz) / 2, t = (H - sz) / 2 + 30;
        glassTile(x, l - 10, t - 10, sz + 20, sz + 20, 26, 'rgba(255,255,255,.06)');
        for (let i = 0; i < N * N; i++) { x.fillStyle = 'rgba(255,255,255,.06)'; rr(x, l + (i % N) * cell + 6, t + ((i / N) | 0) * cell + 6, cell - 12, cell - 12, 16); x.fill(); }
        (tiles || []).forEach(tl => { const s = tl.s, w = (cell - 12) * s, cx = l + tl.x * cell + cell / 2, cy = t + tl.y * cell + cell / 2; glassTile(x, cx - w / 2, cy - w / 2, w, w, 16 * s, COL[tl.v] || '#e0aaff'); x.fillStyle = tl.v <= 4 ? '#14213d' : '#fff'; x.font = `900 ${cell * (tl.v > 999 ? .28 : tl.v > 99 ? .34 : .42) * s}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(tl.v, cx, cy + 2); });
      },
    };
  },
};

// ---------- 4. Neon Snake ----------
GAMES.snake = {
  t: 'Neon Snake', e: '🐍', hint: 'Eat the glowing fruit and grow. Don’t bite yourself or the walls.', keys: ['Arrow keys / WASD', 'Swipe'],
  make(E) {
    let s, dir, nd, food, acc, sc, N = 20, P = Parts();
    const place = () => { do food = { x: ri(0, N - 1), y: ri(0, N - 1), k: pick(['🍎', '🍇', '🍒', '🍑', '🍋']) }; while (s.some(c => c.x === food.x && c.y === food.y)); };
    const turn = (dx, dy) => { if (dx === -dir.x && dy === -dir.y) return; nd = { x: dx, y: dy }; };
    return {
      init() { s = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]; dir = { x: 1, y: 0 }; nd = dir; acc = 0; sc = 0; place(); E.score(0); },
      key(k, d) { if (!d) return; const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[k]; if (m) turn(...m); },
      swipe(dx, dy) { turn(dx, dy); },
      update(dt) { acc += dt; const step = Math.max(.055, .13 - sc * .0025); while (acc > step) { acc -= step; dir = nd; const h = { x: s[0].x + dir.x, y: s[0].y + dir.y }; if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || s.some(c => c.x === h.x && c.y === h.y)) { SFX.lose(); E.shake(10); E.end(sc, 'Length ' + s.length); return; } s.unshift(h); if (h.x === food.x && h.y === food.y) { sc += 10; E.score(sc); SFX.coin(); this._eat = 1; place(); } else s.pop(); } },
      draw(x, W, H) {
        x.fillStyle = '#060814'; x.fillRect(0, 0, W, H);
        const sz = Math.min(W - 24, H - 120), c = sz / N, l = (W - sz) / 2, t = (H - sz) / 2 + 30;
        glassTile(x, l - 8, t - 8, sz + 16, sz + 16, 22, 'rgba(90,120,255,.08)');
        x.strokeStyle = 'rgba(120,140,255,.08)'; x.lineWidth = 1; for (let i = 1; i < N; i++) { x.beginPath(); x.moveTo(l + i * c, t); x.lineTo(l + i * c, t + sz); x.moveTo(l, t + i * c); x.lineTo(l + sz, t + i * c); x.stroke(); }
        if (food) { x.font = `${c * .85}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ff5fa8'; x.shadowBlur = 20; x.fillText(food.k, l + food.x * c + c / 2, t + food.y * c + c / 2 + 1); x.shadowBlur = 0; }
        (s || []).forEach((p, i) => { const k = i / s.length, hue = 160 + k * 120; x.fillStyle = `hsl(${hue} 90% ${62 - k * 18}%)`; x.shadowColor = `hsl(${hue} 90% 60%)`; x.shadowBlur = i ? 10 : 22; rr(x, l + p.x * c + 2, t + p.y * c + 2, c - 4, c - 4, c * .35); x.fill(); });
        x.shadowBlur = 0; if (s) { const h = s[0]; x.fillStyle = '#0b0b16'; const ex = dir.x * c * .15, ey = dir.y * c * .15; [[-.17, -.12], [.17, .12]].forEach(([a, b2]) => { x.beginPath(); x.arc(l + h.x * c + c / 2 + ex + (dir.y ? a : 0) * c, t + h.y * c + c / 2 + ey + (dir.x ? b2 : 0) * c, c * .09, 0, 6.283); x.fill(); }); }
        P.step(x);
      },
    };
  },
};

// ---------- 5. Glass Breaker ----------
GAMES.breaker = {
  t: 'Glass Breaker', e: '🧱', hint: 'Smash every glass brick. Catch the power-ups!', keys: ['Move mouse / finger', '← → keys', 'Space to launch'],
  make(E) {
    let pad, balls, bricks, pw, lives, sc, lvl, P = Parts(), L = false, R = false;
    const COLS = ['#ff5f7e', '#ffb86b', '#ffe27a', '#7bf0b8', '#5aa8ff', '#b794ff'];
    const level = () => { bricks = []; const W = E.W(), rows = Math.min(8, 4 + lvl), cols = W < 520 ? 7 : 10, bw = Math.min(70, (W - 40) / cols - 6); const left = (W - cols * (bw + 6)) / 2; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (lvl > 1 && (r + c + lvl) % 7 === 0) continue; bricks.push({ x: left + c * (bw + 6), y: 110 + r * 30, w: bw, h: 22, hp: r < lvl - 1 ? 2 : 1, col: COLS[r % COLS.length] }); } };
    const serve = () => { balls = [{ x: pad.x, y: pad.y - 14, vx: 0, vy: 0, stuck: true, r: 8 }]; };
    return {
      init() { pad = { x: E.W() / 2, y: E.H() - 70, w: 120 }; lives = 3; sc = 0; lvl = 1; pw = []; level(); serve(); E.score(0); },
      key(k, d) { if (k === 'ArrowLeft' || k === 'a') L = d; if (k === 'ArrowRight' || k === 'd') R = d; if (d && k === ' ') this.launch(); },
      launch() { balls.forEach(b => { if (b.stuck) { b.stuck = false; b.vx = rnd(-3, 3); b.vy = -7 - lvl * .4; } }); },
      move(p) { pad.x = clamp(p.x, pad.w / 2, E.W() - pad.w / 2); }, down(p) { this.move(p); this.launch(); },
      update(dt) {
        const f = dt * 60, W = E.W(), H = E.H(); pad.y = H - 70; if (L) pad.x -= 9 * f; if (R) pad.x += 9 * f; pad.x = clamp(pad.x, pad.w / 2, W - pad.w / 2);
        balls.forEach(b => { if (b.stuck) { b.x = pad.x; b.y = pad.y - 14; return; } const steps = 3; for (let s = 0; s < steps; s++) { b.x += b.vx * f / steps; b.y += b.vy * f / steps;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); } if (b.y < 80) { b.y = 80; b.vy = Math.abs(b.vy); }
          if (b.vy > 0 && b.y + b.r > pad.y - 8 && b.y < pad.y + 8 && Math.abs(b.x - pad.x) < pad.w / 2 + b.r) { const k = (b.x - pad.x) / (pad.w / 2), sp = Math.hypot(b.vx, b.vy) * 1.01; b.vx = k * sp * .8; b.vy = -Math.sqrt(Math.max(4, sp * sp - b.vx * b.vx)); SFX.tick(); }
          for (const br of bricks) { if (br.hp <= 0) continue; if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h) { const ox = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r)), oy = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r)); if (ox < oy) b.vx *= -1; else b.vy *= -1; br.hp--; if (br.hp <= 0) { sc += 10 * lvl; SFX.pop(); P.add(br.x + br.w / 2, br.y + br.h / 2, 16, br.col, 5, 40, 3); if (Math.random() < .14) pw.push({ x: br.x + br.w / 2, y: br.y, k: pick(['wide', 'multi', 'life']) }); } else SFX.tick(); E.score(sc); break; } } } });
        balls = balls.filter(b => b.y < H + 20);
        if (!balls.length) { lives--; SFX.lose(); E.shake(8); if (lives <= 0) return E.end(sc, 'Level ' + lvl); E.toast('❤️ ' + lives + ' left'); serve(); }
        pw.forEach(p => { p.y += 3 * f; if (p.y > pad.y - 10 && p.y < pad.y + 12 && Math.abs(p.x - pad.x) < pad.w / 2) { p.got = true; SFX.coin(); if (p.k === 'wide') { pad.w = Math.min(220, pad.w + 50); E.toast('↔️ Wide paddle'); } if (p.k === 'life') { lives++; E.toast('❤️ Extra life'); } if (p.k === 'multi') { const b = balls[0]; if (b) for (let i = 0; i < 2; i++) balls.push({ ...b, stuck: false, vx: rnd(-5, 5), vy: -6 }); E.toast('✨ Multi-ball'); } } });
        pw = pw.filter(p => !p.got && p.y < H);
        if (bricks.every(b => b.hp <= 0)) { lvl++; SFX.win(); E.toast('🎉 Level ' + lvl); pad.w = 120; level(); serve(); }
        E.stat2('❤️'.repeat(Math.max(0, lives)) + '  Lv ' + lvl);
      },
      draw(x, W, H) {
        const bg = x.createRadialGradient(W / 2, 0, 0, W / 2, 0, H); bg.addColorStop(0, '#2b1f6b'); bg.addColorStop(1, '#07060f'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
        (bricks || []).forEach(b => { if (b.hp > 0) glassTile(x, b.x, b.y, b.w, b.h, 8, b.col, b.hp > 1 ? 1 : .85); });
        (pw || []).forEach(p => { x.font = '24px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText({ wide: '↔️', multi: '✨', life: '❤️' }[p.k], p.x, p.y); });
        if (pad) glassTile(x, pad.x - pad.w / 2, pad.y - 8, pad.w, 16, 8, '#c9d4ff');
        (balls || []).forEach(b => { x.fillStyle = '#fff'; x.shadowColor = '#9fd0ff'; x.shadowBlur = 18; x.beginPath(); x.arc(b.x, b.y, b.r, 0, 6.283); x.fill(); x.shadowBlur = 0; });
        P.step(x, .15);
      },
    };
  },
};

// ---------- 6. Block Drop ----------
GAMES.blocks = {
  t: 'Block Drop', e: '🟪', hint: 'Fit the falling blocks. Fill a line to clear it.', keys: ['← → move', '↑ / tap = turn', '↓ faster', 'Space = drop', 'Drag & swipe down on a phone'],
  make(E) {
    const C = 10, Rw = 20, SH = { I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1]], S: [[0, 1, 1], [1, 1, 0]], Z: [[1, 1, 0], [0, 1, 1]], J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]] }, COL = { I: '#5ad1ff', O: '#ffe27a', T: '#b794ff', S: '#7bf0b8', Z: '#ff6b81', J: '#5a8bff', L: '#ffb86b' };
    let g, cur, next, acc, sc, lines, lvl, flash = [], bag = [], dragX = null, P = Parts();
    const newP = () => { if (!bag.length) bag = Object.keys(SH).sort(() => Math.random() - .5); const k = bag.pop(); return { k, m: SH[k].map(r => [...r]), x: 3, y: 0 }; };
    const fits = (m, px, py) => m.every((r, y) => r.every((v, x2) => !v || (px + x2 >= 0 && px + x2 < C && py + y < Rw && (py + y < 0 || !g[py + y][px + x2]))));
    const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
    const lock = () => { cur.m.forEach((r, y) => r.forEach((v, x2) => { if (v && cur.y + y >= 0) g[cur.y + y][cur.x + x2] = cur.k; })); const full = []; g.forEach((r, y) => { if (r.every(Boolean)) full.push(y); }); if (full.length) { flash = full.map(y => ({ y, t: 1 })); full.forEach(y => { P.add(E.W() / 2, 0, 0, '#fff'); }); setTimeout(() => { g = g.filter((_, y) => !full.includes(y)); while (g.length < Rw) g.unshift(Array(C).fill('')); }, 120); lines += full.length; sc += [0, 100, 300, 500, 800][full.length] * lvl; lvl = 1 + Math.floor(lines / 10); E.score(sc); full.length >= 4 ? (SFX.win(), E.toast('💥 NEXA! 4 lines')) : SFX.coin(); } else SFX.tick(); cur = next; next = newP(); if (!fits(cur.m, cur.x, cur.y)) { SFX.lose(); E.end(sc, lines + ' lines · level ' + lvl); } };
    const mv = d => { if (fits(cur.m, cur.x + d, cur.y)) cur.x += d; }, turn = () => { const m = rot(cur.m); for (const k of [0, -1, 1, -2, 2]) if (fits(m, cur.x + k, cur.y)) { cur.m = m; cur.x += k; SFX.tick(); return; } };
    const drop = () => { let n = 0; while (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; n++; } sc += n * 2; E.score(sc); E.shake(4); lock(); };
    let soft = false, geo = {};
    return {
      init() { g = Array.from({ length: Rw }, () => Array(C).fill('')); bag = []; cur = newP(); next = newP(); acc = 0; sc = 0; lines = 0; lvl = 1; E.score(0); },
      key(k, d) { if (k === 'ArrowDown' || k === 's') soft = d; if (!d) return; if (k === 'ArrowLeft' || k === 'a') mv(-1); if (k === 'ArrowRight' || k === 'd') mv(1); if (k === 'ArrowUp' || k === 'w' || k === 'x') turn(); if (k === ' ') drop(); },
      down(p) { dragX = p.x; this._moved = false; }, move(p) { if (dragX == null) return; const c = geo.c || 30; while (p.x - dragX > c) { mv(1); dragX += c; this._moved = true; } while (dragX - p.x > c) { mv(-1); dragX -= c; this._moved = true; } },
      up() { if (!this._moved && dragX != null) turn(); dragX = null; }, swipe(dx, dy) { if (dy > 0) { drop(); this._moved = true; } },
      update(dt) { acc += dt * (soft ? 12 : 1); const step = Math.max(.07, .8 - (lvl - 1) * .07); while (acc > step) { acc -= step; if (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; if (soft) sc++; } else lock(); } flash.forEach(f => f.t -= dt * 5); flash = flash.filter(f => f.t > 0); E.stat2(`${lines} lines · Lv ${lvl}`); },
      draw(x, W, H) {
        const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#120c33'); bg.addColorStop(1, '#2a0f3a'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
        const c = Math.floor(Math.min((H - 120) / Rw, (W - 140) / C)), bw = c * C, bh = c * Rw, l = Math.round((W - bw) / 2 - (W > 600 ? 50 : 20)), t = Math.round((H - bh) / 2 + 30); geo = { c };
        glassTile(x, l - 8, t - 8, bw + 16, bh + 16, 18, 'rgba(255,255,255,.05)');
        if (!g) return;
        g.forEach((r, y) => r.forEach((k, x2) => { if (k) glassTile(x, l + x2 * c + 1, t + y * c + 1, c - 2, c - 2, c * .22, COL[k]); }));
        let gy = cur.y; while (fits(cur.m, cur.x, gy + 1)) gy++;
        cur.m.forEach((r, y) => r.forEach((v, x2) => { if (!v) return; x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 2; rr(x, l + (cur.x + x2) * c + 3, t + (gy + y) * c + 3, c - 6, c - 6, c * .2); x.stroke(); if (cur.y + y >= 0) glassTile(x, l + (cur.x + x2) * c + 1, t + (cur.y + y) * c + 1, c - 2, c - 2, c * .22, COL[cur.k]); }));
        flash.forEach(f => { x.fillStyle = `rgba(255,255,255,${f.t * .8})`; x.fillRect(l, t + f.y * c, bw, c); });
        const nx = l + bw + 20, ny = t; if (nx + c * 4 < W) { glassTile(x, nx, ny, c * 4.4, c * 3.6, 14, 'rgba(255,255,255,.07)'); x.fillStyle = '#fff'; x.font = '800 12px system-ui'; x.textAlign = 'left'; x.fillText('NEXT', nx + 10, ny + 16); const s = c * .8; next.m.forEach((r, y) => r.forEach((v, x2) => { if (v) glassTile(x, nx + c * .6 + x2 * s, ny + c * 1.1 + y * s, s - 2, s - 2, s * .2, COL[next.k]); })); }
        P.step(x);
      },
    };
  },
};

// ---------- 7. Rooftop Run ----------
GAMES.runner = {
  t: 'Rooftop Run', e: '🏃', hint: 'Run across the city at night. Jump the gaps, double-jump for big ones.', keys: ['Tap / Space = jump', 'Tap again = double jump'],
  make(E) {
    let me, roofs, coins, sp, dist, cn, P = Parts(), sky = [];
    const addRoof = (x0) => { const W = E.W(), H = E.H(); const w = rnd(220, 520), y = clamp((roofs.length ? roofs[roofs.length - 1].y : H * .7) + rnd(-90, 90), H * .45, H * .82); roofs.push({ x: x0, w, y, win: Array.from({ length: 40 }, () => Math.random() < .35) }); if (Math.random() < .7) for (let i = 0; i < 4; i++) coins.push({ x: x0 + w * .2 + i * 36, y: y - 60 - Math.sin(i / 3 * Math.PI) * 40 }); };
    return {
      init() { const H = E.H(); roofs = []; coins = []; me = { x: E.W() * .25, y: H * .6, vy: 0, jumps: 0, ground: false, t: 0 }; sp = 6; dist = 0; cn = 0; addRoof(-50); roofs[0].w = E.W() * .8; roofs[0].y = H * .7; me.y = roofs[0].y - 30; while (roofs[roofs.length - 1].x < E.W() * 2) { const lr = roofs[roofs.length - 1]; addRoof(lr.x + lr.w + rnd(70, 160)); } sky = Array.from({ length: 90 }, () => ({ x: rnd(0, 1), y: rnd(0, .5), r: rnd(.5, 1.6) })); E.score(0); },
      jump() { if (me.jumps < 2) { me.vy = me.jumps ? -11 : -13.5; me.jumps++; me.ground = false; SFX.jump(); P.add(me.x, me.y + 20, 8, 'rgba(255,255,255,.7)', 2, 20, 2); } },
      key(k, d) { if (d && (k === ' ' || k === 'ArrowUp' || k === 'w')) this.jump(); }, down() { this.jump(); },
      update(dt) {
        const f = dt * 60, W = E.W(), H = E.H(); sp = Math.min(15, 6 + dist / 3000); dist += sp * f; me.t += f;
        roofs.forEach(r => r.x -= sp * f); coins.forEach(c => c.x -= sp * f); roofs = roofs.filter(r => r.x + r.w > -50); coins = coins.filter(c => c.x > -40 && !c.got);
        while (roofs[roofs.length - 1].x < W * 1.5) { const lr = roofs[roofs.length - 1]; addRoof(lr.x + lr.w + rnd(80, 120 + sp * 12)); }
        me.vy += .7 * f; const ny = me.y + me.vy * f; const r = roofs.find(r => me.x + 12 > r.x && me.x - 12 < r.x + r.w);
        if (r && me.vy >= 0 && me.y + 24 <= r.y + 2 && ny + 24 >= r.y) { me.y = r.y - 24; me.vy = 0; me.jumps = 0; me.ground = true; } else { me.y = ny; me.ground = false; }
        if (r && me.y + 24 > r.y + 8 && me.y < r.y + 60 && me.x + 12 > r.x && me.x < r.x + 16) { me.vy = 6; }
        coins.forEach(c => { if (Math.hypot(c.x - me.x, c.y - me.y) < 30) { c.got = true; cn++; SFX.coin(); P.add(c.x, c.y, 8, '#ffd23f', 3, 25, 2); } });
        E.score(Math.round(dist / 10) + cn * 20); E.stat2('🪙 ' + cn + '  ' + Math.round(sp * 12) + ' km/h');
        if (me.y > H + 60) { SFX.lose(); E.end(Math.round(dist / 10) + cn * 20, `${Math.round(dist / 100)} m · 🪙 ${cn}`); }
      },
      draw(x, W, H) {
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0b2e'); g.addColorStop(.6, '#3b1d5e'); g.addColorStop(1, '#ff7a59'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        sky.forEach(s => { x.fillStyle = `rgba(255,255,255,${.4 + Math.sin(performance.now() / 500 + s.x * 50) * .3})`; x.beginPath(); x.arc(s.x * W, s.y * H, s.r, 0, 6.283); x.fill(); });
        x.fillStyle = '#ffe9c4'; x.shadowColor = '#ffe9c4'; x.shadowBlur = 40; x.beginPath(); x.arc(W * .8, H * .18, 34, 0, 6.283); x.fill(); x.shadowBlur = 0;
        const d = dist || 0; [[.25, '#24164a', .55], [.45, '#1a1036', .72]].forEach(([par, col, top]) => { x.fillStyle = col; for (let i = -1; i < W / 60 + 2; i++) { const k = Math.floor(d * par / 60) + i, hh = ((k * 7919) % 100) / 100; const bx = i * 60 - (d * par % 60); x.fillRect(bx, H * top - hh * H * .25, 54, H); x.fillStyle = 'rgba(255,220,140,.35)'; for (let wy = 0; wy < 6; wy++) for (let wx = 0; wx < 3; wx++) if (((k + wy * 3 + wx) * 31) % 7 < 2) x.fillRect(bx + 8 + wx * 15, H * top - hh * H * .25 + 12 + wy * 18, 7, 9); x.fillStyle = col; } });
        (roofs || []).forEach(r => { const gr = x.createLinearGradient(0, r.y, 0, H); gr.addColorStop(0, '#2e2a52'); gr.addColorStop(1, '#141228'); x.fillStyle = gr; x.fillRect(r.x, r.y, r.w, H - r.y); x.fillStyle = '#5b56a0'; x.fillRect(r.x - 4, r.y - 6, r.w + 8, 8); x.fillStyle = 'rgba(255,214,120,.55)'; r.win.forEach((on, i) => { if (on) x.fillRect(r.x + 14 + (i % 8) * (r.w - 28) / 8, r.y + 24 + Math.floor(i / 8) * 34, 12, 16); }); });
        (coins || []).forEach(c => { x.fillStyle = '#ffd23f'; x.shadowColor = '#ffd23f'; x.shadowBlur = 12; x.beginPath(); x.ellipse(c.x, c.y, 10 * Math.abs(Math.cos(performance.now() / 180 + c.x / 40)) + 2, 10, 0, 0, 6.283); x.fill(); x.shadowBlur = 0; });
        if (me) { x.save(); x.translate(me.x, me.y); const run = me.ground ? Math.sin(me.t * .4) : .6; x.strokeStyle = '#fff'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 4); x.lineTo(-run * 10, 24); x.moveTo(0, 4); x.lineTo(run * 10, 24); x.moveTo(0, -12); x.lineTo(-run * 12, 2); x.moveTo(0, -12); x.lineTo(run * 12, 0); x.stroke(); x.strokeStyle = '#5aa8ff'; x.lineWidth = 10; x.beginPath(); x.moveTo(0, -16); x.lineTo(0, 4); x.stroke(); x.fillStyle = '#ffd6a5'; x.beginPath(); x.arc(0, -26, 9, 0, 6.283); x.fill(); x.fillStyle = '#ff5f7e'; x.fillRect(-9, -36, 18, 6); x.restore(); }
        P.step(x, .2);
      },
    };
  },
};

// ---------- 8. Star Blaster ----------
GAMES.space = {
  t: 'Star Blaster', e: '🚀', hint: 'Blast the alien waves. Your ship fires by itself. Grab ⚡ for double shots.', keys: ['Move mouse / finger', 'Arrow keys / WASD'],
  make(E) {
    let me, shots, foes, eshots, stars, sc, lives, wave, t, pw, P = Parts(), K = {}, inv = 0;
    const spawnWave = () => { wave++; const n = 5 + wave * 2, W = E.W(); for (let i = 0; i < n; i++) foes.push({ x: rnd(40, W - 40), y: -rnd(40, 400), hp: wave > 3 && Math.random() < .3 ? 3 : 1, k: pick(['👾', '👽', '🛸']), ph: rnd(0, 6), sp: rnd(1, 1.6) + wave * .12 }); E.toast('🌊 Wave ' + wave); };
    return {
      init() { const W = E.W(), H = E.H(); me = { x: W / 2, y: H - 110, tx: W / 2, ty: H - 110 }; shots = []; foes = []; eshots = []; pw = null; sc = 0; lives = 3; wave = 0; t = 0; inv = 0; stars = Array.from({ length: 140 }, () => ({ x: rnd(0, W), y: rnd(0, H), z: rnd(.3, 1.6) })); spawnWave(); E.score(0); },
      key(k, d) { K[k] = d; }, move(p) { me.tx = p.x; me.ty = p.y - 60; }, down(p) { this.move(p); },
      update(dt) {
        const f = dt * 60, W = E.W(), H = E.H(); t += f; if (inv > 0) inv -= dt;
        if (K.ArrowLeft || K.a) me.tx -= 9 * f; if (K.ArrowRight || K.d) me.tx += 9 * f; if (K.ArrowUp || K.w) me.ty -= 9 * f; if (K.ArrowDown || K.s) me.ty += 9 * f;
        me.tx = clamp(me.tx, 24, W - 24); me.ty = clamp(me.ty, H * .3, H - 60); me.x = lerp(me.x, me.tx, .25 * f); me.y = lerp(me.y, me.ty, .25 * f);
        if (t % 9 < f) { shots.push({ x: me.x, y: me.y - 26 }); if (pw && pw > 0) { shots.push({ x: me.x - 16, y: me.y - 16, vx: -1.2 }); shots.push({ x: me.x + 16, y: me.y - 16, vx: 1.2 }); } SFX.shoot(); }
        if (pw) { pw -= dt; if (pw <= 0) pw = null; }
        shots.forEach(s => { s.y -= 14 * f; s.x += (s.vx || 0) * f; }); shots = shots.filter(s => s.y > -20 && !s.hit);
        stars.forEach(s => { s.y += s.z * 2 * f; if (s.y > H) { s.y = 0; s.x = rnd(0, W); } });
        foes.forEach(o => { o.y += o.sp * f; o.x += Math.sin(t / 30 + o.ph) * 1.5 * f; if (o.y > 0 && Math.random() < .004 * f * (1 + wave * .2)) eshots.push({ x: o.x, y: o.y + 16, vy: 4 + wave * .3 });
          shots.forEach(s => { if (!s.hit && Math.abs(s.x - o.x) < 22 && Math.abs(s.y - o.y) < 22) { s.hit = true; o.hp--; if (o.hp <= 0) { o.dead = true; sc += 50; E.score(sc); SFX.boom(); P.add(o.x, o.y, 22, () => pick(['#ff9f43', '#ffe27a', '#ff5f7e', '#fff']), 5, 40, 3); if (Math.random() < .08) pw = 8, E.toast('⚡ Double shots!'); } } });
          if (!o.dead && inv <= 0 && Math.abs(o.x - me.x) < 28 && Math.abs(o.y - me.y) < 28) { o.dead = true; this.hurt(); }
          if (o.y > H + 40) { o.y = -40; } });
        foes = foes.filter(o => !o.dead);
        eshots.forEach(s => { s.y += s.vy * f; if (inv <= 0 && Math.abs(s.x - me.x) < 16 && Math.abs(s.y - me.y) < 20) { s.y = H + 99; this.hurt(); } }); eshots = eshots.filter(s => s.y < H + 20);
        if (!foes.length) { sc += wave * 100; E.score(sc); SFX.win(); spawnWave(); }
        E.stat2('❤️'.repeat(Math.max(0, lives)) + '  🌊 ' + wave);
      },
      hurt() { lives--; inv = 2; SFX.hit(); E.shake(14); E.vib(150); P.add(me.x, me.y, 30, '#5ad1ff', 6, 40, 3); if (lives <= 0) E.end(sc, 'You reached wave ' + wave); },
      draw(x, W, H) {
        x.fillStyle = '#03030c'; x.fillRect(0, 0, W, H); const neb = x.createRadialGradient(W * .3, H * .3, 0, W * .3, H * .3, W * .7); neb.addColorStop(0, 'rgba(120,60,200,.35)'); neb.addColorStop(1, 'transparent'); x.fillStyle = neb; x.fillRect(0, 0, W, H);
        (stars || []).forEach(s => { x.fillStyle = `rgba(255,255,255,${s.z / 1.8})`; x.fillRect(s.x, s.y, s.z * 1.4, s.z * 2.6); });
        x.fillStyle = '#7bf0ff'; x.shadowColor = '#7bf0ff'; x.shadowBlur = 10; (shots || []).forEach(s => { rr(x, s.x - 2, s.y - 10, 4, 18, 2); x.fill(); }); x.fillStyle = '#ff5f7e'; x.shadowColor = '#ff5f7e'; (eshots || []).forEach(s => { x.beginPath(); x.arc(s.x, s.y, 5, 0, 6.283); x.fill(); }); x.shadowBlur = 0;
        x.textAlign = 'center'; x.textBaseline = 'middle'; (foes || []).forEach(o => { x.font = `${o.hp > 1 ? 40 : 32}px system-ui`; x.fillText(o.k, o.x, o.y); });
        if (me && !(inv > 0 && (performance.now() / 100 | 0) % 2)) { x.save(); x.translate(me.x, me.y); x.fillStyle = 'rgba(120,200,255,.7)'; x.beginPath(); x.ellipse(0, 26, 7, 14 + Math.random() * 8, 0, 0, 6.283); x.fill(); const g = x.createLinearGradient(0, -28, 0, 22); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8c97ff'); x.fillStyle = g; x.beginPath(); x.moveTo(0, -28); x.lineTo(20, 18); x.lineTo(6, 12); x.lineTo(0, 22); x.lineTo(-6, 12); x.lineTo(-20, 18); x.closePath(); x.fill(); x.fillStyle = '#1b2a6b'; x.beginPath(); x.ellipse(0, -6, 5, 9, 0, 0, 6.283); x.fill(); x.restore(); }
        P.step(x, 0);
      },
    };
  },
};

// ---------- 9. Hoops ----------
GAMES.hoops = {
  t: 'Hoops', e: '🏀', hint: 'Pull back and let go to shoot. 60 seconds. Swish for bonus!', keys: ['Drag back & release'],
  make(E) {
    let ball, hoop, sc, time, drag, streak, P = Parts(), msg = '';
    const reset = () => { const W = E.W(), H = E.H(); ball = { x: W * .25, y: H - 140, vx: 0, vy: 0, fly: false, r: 22, rot: 0, scored: false, touched: false }; };
    return {
      init() { const W = E.W(), H = E.H(); hoop = { x: W * .72, y: H * .38, dir: 1 }; sc = 0; time = 60; streak = 0; reset(); E.score(0); },
      down(p) { if (!ball.fly && Math.hypot(p.x - ball.x, p.y - ball.y) < 120) drag = { x: p.x, y: p.y }; },
      move(p) { if (drag) { drag.cx = p.x; drag.cy = p.y; } },
      up() { if (drag && drag.cx != null) { const dx = drag.x - drag.cx, dy = drag.y - drag.cy; if (Math.hypot(dx, dy) > 20) { ball.vx = dx * .16; ball.vy = dy * .16; ball.fly = true; SFX.jump(); } } drag = null; },
      key() {},
      update(dt) {
        const f = dt * 60, W = E.W(), H = E.H(); time -= dt; if (time <= 0) { time = 0; SFX.win(); return E.end(sc, `Best streak 🔥 ${streak}`); }
        if (sc >= 10) { hoop.x += hoop.dir * 1.6 * f; if (hoop.x > W - 80 || hoop.x < W * .45) hoop.dir *= -1; }
        if (ball.fly) { const st = 3; for (let i = 0; i < st; i++) { ball.vy += .5 * f / st; ball.x += ball.vx * f / st; ball.y += ball.vy * f / st;
          [[hoop.x - 46, hoop.y], [hoop.x + 46, hoop.y]].forEach(([rx, ry]) => { const d = Math.hypot(ball.x - rx, ball.y - ry); if (d < ball.r + 5) { const nx = (ball.x - rx) / d, ny = (ball.y - ry) / d, dot = ball.vx * nx + ball.vy * ny; ball.vx -= 1.6 * dot * nx; ball.vy -= 1.6 * dot * ny; ball.x = rx + nx * (ball.r + 5); ball.y = ry + ny * (ball.r + 5); ball.touched = true; SFX.tick(); } });
          const bx = hoop.x + 56; if (ball.x + ball.r > bx && ball.x < bx + 14 && ball.y > hoop.y - 120 && ball.y < hoop.y + 10) { ball.vx = -Math.abs(ball.vx) * .7; ball.x = bx - ball.r; ball.touched = true; }
          if (!ball.scored && ball.vy > 0 && Math.abs(ball.x - hoop.x) < 36 && ball.y > hoop.y - 4 && ball.y < hoop.y + 16) { ball.scored = true; const pts = ball.touched ? 2 : 3; streak++; sc += pts + (streak > 2 ? 1 : 0); E.score(sc); msg = ball.touched ? (streak > 2 ? '🔥 On fire!' : 'Nice!') : '💦 SWISH! +3'; E.toast(msg); SFX.coin(); P.add(hoop.x, hoop.y + 20, 24, () => pick(['#ffb86b', '#fff', '#ff5f7e']), 5, 40, 3); } }
          ball.rot += ball.vx * .02 * f;
          if (ball.y > H - 30) { ball.y = H - 30; ball.vy *= -.5; ball.vx *= .8; if (Math.abs(ball.vy) < 2) { if (!ball.scored) streak = 0; reset(); } }
          if (ball.x < -60 || ball.x > W + 60) { if (!ball.scored) streak = 0; reset(); } }
        E.stat2(`⏱️ ${Math.ceil(time)}s  🔥 ${streak}`);
      },
      draw(x, W, H) {
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b2a6b'); g.addColorStop(1, '#0b0f2a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); x.moveTo(W * (i / 5), 0); x.lineTo(W * (i / 5) + 120, 0); x.lineTo(W * (i / 5) + 300, H); x.lineTo(W * (i / 5) + 200, H); x.fill(); }
        const fl = x.createLinearGradient(0, H - 60, 0, H); fl.addColorStop(0, '#c98a4b'); fl.addColorStop(1, '#8a5a2b'); x.fillStyle = fl; x.fillRect(0, H - 52, W, 52); x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 3; x.beginPath(); x.arc(W * .25, H - 52, 160, Math.PI, 2 * Math.PI); x.stroke();
        if (!hoop) return;
        glassTile(x, hoop.x + 56, hoop.y - 130, 14, 150, 6, 'rgba(255,255,255,.35)'); glassTile(x, hoop.x - 20, hoop.y - 120, 140, 100, 12, 'rgba(255,255,255,.12)'); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; x.strokeRect(hoop.x + 10, hoop.y - 70, 44, 36);
        x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 2; for (let i = 0; i <= 6; i++) { x.beginPath(); x.moveTo(hoop.x - 44 + i * 14.6, hoop.y); x.lineTo(hoop.x - 28 + i * 9.3, hoop.y + 46); x.stroke(); }
        if (drag && drag.cx != null) { x.setLineDash([6, 8]); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 3; x.beginPath(); let px = ball.x, py = ball.y, vx = (drag.x - drag.cx) * .16, vy = (drag.y - drag.cy) * .16; x.moveTo(px, py); for (let i = 0; i < 26; i++) { vy += .5; px += vx; py += vy; x.lineTo(px, py); } x.stroke(); x.setLineDash([]); }
        x.save(); x.translate(ball.x, ball.y); x.rotate(ball.rot); const bg2 = x.createRadialGradient(-7, -7, 2, 0, 0, ball.r); bg2.addColorStop(0, '#ffb26b'); bg2.addColorStop(1, '#d4621c'); x.fillStyle = bg2; x.beginPath(); x.arc(0, 0, ball.r, 0, 6.283); x.fill(); x.strokeStyle = '#5a2a0a'; x.lineWidth = 2; x.beginPath(); x.moveTo(-ball.r, 0); x.lineTo(ball.r, 0); x.moveTo(0, -ball.r); x.lineTo(0, ball.r); x.stroke(); x.beginPath(); x.arc(-ball.r * 1.1, 0, ball.r * .8, -1, 1); x.stroke(); x.beginPath(); x.arc(ball.r * 1.1, 0, ball.r * .8, Math.PI - 1, Math.PI + 1); x.stroke(); x.restore();
        x.strokeStyle = '#ff5f3d'; x.lineWidth = 6; x.beginPath(); x.moveTo(hoop.x - 46, hoop.y); x.lineTo(hoop.x + 46, hoop.y); x.stroke();
        if (!ball.fly && !drag) { x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '700 14px system-ui'; x.textAlign = 'center'; x.fillText('Pull back & let go', ball.x, ball.y + 46); }
        P.step(x, .15);
      },
    };
  },
};

// ---------- 10. Card Flip (memory) ----------
GAMES.memory = {
  t: 'Card Flip', e: '🃏', hint: 'Find all the pairs with as few moves as you can.', keys: ['Tap two cards'], dom: true,
  make(E) {
    let cards, open, moves, found, t0, lock, grid;
    const EM = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦄', '🐝', '🐢', '🦋', '🐬', '🍕', '🚀'];
    const paint = () => { const n = cards.length, st = E.stage, wide = st.clientWidth > st.clientHeight * 1.2, cols = wide ? (n > 12 ? 8 : 6) : 4, rows = Math.ceil(n / cols), s = Math.max(40, Math.min(130, (st.clientWidth - 40) / cols - 12, (st.clientHeight - 110) / rows / 1.2 - 12)); grid.style.gridTemplateColumns = `repeat(${cols}, ${s}px)`; grid.innerHTML = cards.map((c, i) => `<button class="cf-card ${c.up ? 'up' : ''} ${c.done ? 'done' : ''}" data-i="${i}" style="width:${s}px;height:${s * 1.2}px" aria-label="Card"><i>✦</i><b>${c.e}</b></button>`).join(''); };
    return {
      init() { const lvl = 8; const pairs = EM.slice().sort(() => Math.random() - .5).slice(0, lvl); cards = [...pairs, ...pairs].sort(() => Math.random() - .5).map(e => ({ e, up: false, done: false })); open = []; moves = 0; found = 0; t0 = performance.now(); lock = false;
        grid?.remove(); grid = document.createElement('div'); grid.className = 'cf-grid'; E.stage.append(grid); paint(); E.score(0);
        grid.onclick = ev => { const b = ev.target.closest('.cf-card'); if (!b || lock || !E.playing()) return; const c = cards[+b.dataset.i]; if (c.up || c.done) return; c.up = true; open.push(c); b.classList.add('up'); SFX.tick();
          if (open.length === 2) { moves++; lock = true; const [a, d] = open; if (a.e === d.e) { setTimeout(() => { a.done = d.done = true; open = []; lock = false; found++; SFX.coin(); paint(); if (found === cards.length / 2) { const secs = Math.round((performance.now() - t0) / 1000); const score = Math.max(50, 2000 - moves * 40 - secs * 8); SFX.win(); E.end(score, `${moves} moves · ${secs}s`); } }, 380); } else setTimeout(() => { a.up = d.up = false; open = []; lock = false; paint(); }, 820); }
          E.stat2(`🃏 ${moves} moves`); }; },
      resize() { if (cards) paint(); }, update() {}, draw(x, W, H) { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#24124f'); g.addColorStop(1, '#0c2a3f'); x.fillStyle = g; x.fillRect(0, 0, W, H); },
      stop() { grid?.remove(); },
    };
  },
};

// ---------- 11. Stack Tower ----------
GAMES.stack = {
  t: 'Stack Tower', e: '🏗️', hint: 'Tap to drop each block. Line them up perfectly to keep them big.', keys: ['Tap / Space'],
  make(E) {
    let blocks, cur, falling, sc, cam, combo, P = Parts();
    const D = 120; // depth of each block (iso)
    const hue = i => (200 + i * 9) % 360;
    return {
      init() { blocks = [{ x: 0, w: 220, y: 0 }]; cur = { x: -260, w: 220, dir: 1, sp: 3.4 }; falling = []; sc = 0; cam = 0; combo = 0; E.score(0); },
      drop() { const top = blocks[blocks.length - 1], ov = Math.min(cur.x + cur.w, top.x + top.w) - Math.max(cur.x, top.x); if (ov <= 0) { falling.push({ ...cur, y: blocks.length, vy: 0 }); SFX.lose(); return E.end(sc, `${sc} blocks high`); }
        let nx = Math.max(cur.x, top.x), nw = ov; if (Math.abs(cur.x - top.x) < 6) { nx = top.x; nw = top.w; combo++; SFX.win(); E.toast(combo > 2 ? `✨ Perfect x${combo}` : '✨ Perfect!'); if (combo > 2) nw = Math.min(260, nw + 10); P.add(E.W() / 2, E.H() * .55, 24, '#fff', 4, 30, 2); } else { combo = 0; SFX.pop(); const cutX = cur.x < top.x ? cur.x : nx + nw, cutW = cur.w - nw; falling.push({ x: cutX, w: cutW, y: blocks.length, vy: 0 }); }
        blocks.push({ x: nx, w: nw, y: blocks.length }); sc++; E.score(sc); cur = { x: blocks.length % 2 ? -300 : 300, w: nw, dir: blocks.length % 2 ? 1 : -1, sp: Math.min(9, 3.4 + sc * .18) }; E.vib(20); },
      key(k, d) { if (d && (k === ' ' || k === 'Enter')) this.drop(); }, down() { this.drop(); },
      update(dt) { const f = dt * 60; cur.x += cur.dir * cur.sp * f; if (cur.x > 300) cur.dir = -1; if (cur.x < -300) cur.dir = 1; cam = lerp(cam, Math.max(0, blocks.length - 6) * 40, .08); falling.forEach(b => { b.vy += .5 * f; b.fy = (b.fy || 0) + b.vy * f; }); falling = falling.filter(b => b.fy < 1200); },
      draw(x, W, H) {
        const n = blocks ? blocks.length : 0, h1 = hue(n), bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, `hsl(${h1} 60% 22%)`); bg.addColorStop(1, `hsl(${(h1 + 40) % 360} 70% 12%)`); x.fillStyle = bg; x.fillRect(0, 0, W, H);
        if (!blocks) return; const s = Math.min(1, W / 700), ox = W / 2, oy = H * .78 + cam * s, BH = 40 * s;
        const box = (bx, bw, by, col, a = 1, fy = 0) => { const L = ox + bx * s - (by * 0), T = oy - by * BH + fy, w = bw * s, d = D * s * .5; x.globalAlpha = a; x.fillStyle = `hsl(${col} 70% 58%)`; x.beginPath(); x.moveTo(L, T - BH); x.lineTo(L + w, T - BH); x.lineTo(L + w + d, T - BH - d); x.lineTo(L + d, T - BH - d); x.fill(); x.fillStyle = `hsl(${col} 65% 44%)`; x.fillRect(L, T - BH, w, BH); x.fillStyle = `hsl(${col} 60% 34%)`; x.beginPath(); x.moveTo(L + w, T - BH); x.lineTo(L + w + d, T - BH - d); x.lineTo(L + w + d, T - d); x.lineTo(L + w, T); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(L, T - BH, w, 2); x.globalAlpha = 1; };
        blocks.forEach((b, i) => box(b.x - 110, b.w, i, hue(i)));
        falling.forEach(b => box(b.x - 110, b.w, b.y, hue(b.y), Math.max(0, 1 - b.fy / 600), b.fy));
        if (!E.isOver()) box(cur.x - 110, cur.w, n, hue(n));
        x.fillStyle = 'rgba(255,255,255,.9)'; x.font = `900 ${Math.min(96, W * .18)}px system-ui`; x.textAlign = 'center'; x.globalAlpha = .18; x.fillText(sc, W / 2, H * .3); x.globalAlpha = 1;
        P.step(x);
      },
    };
  },
};

// ---------- 12. Penalty Kick ----------
GAMES.penalty = {
  t: 'Penalty Kick', e: '⚽', hint: 'Swipe or drag to shoot. Beat the keeper — 5 shots per round, keep scoring to go on!', keys: ['Swipe / drag to shoot', 'Curve it with a bend'],
  make(E) {
    let ball, keeper, shots, goals, round, msg, flight, P = Parts(), path = [];
    const reset = () => { ball = { x: .5, y: .86, z: 0, s: 1 }; flight = null; keeper = { x: .5, dive: 0, t: 0, side: 0 }; };
    return {
      init() { shots = 0; goals = 0; round = 1; reset(); E.score(0); },
      down(p) { if (!flight) path = [p]; }, move(p) { if (path.length && !flight) path.push(p); },
      up() { if (flight || path.length < 3) { path = []; return; } const W = E.W(), H = E.H(), a = path[0], b = path[path.length - 1], m = path[path.length >> 1]; const dx = (b.x - a.x) / W, dy = (b.y - a.y) / H; if (dy > -.05) { path = []; return; } const bend = ((m.x - (a.x + b.x) / 2) / W) * -2.2; flight = { t: 0, tx: clamp(.5 + dx * 1.6, -.1, 1.1), ty: clamp(.86 + dy * 1.25, .05, .6), bend, pw: clamp(-dy * 2.2, .5, 1.3) };
        const guess = Math.random() < Math.min(.62, .3 + round * .05) ? (flight.tx < .5 ? -1 : 1) : pick([-1, 0, 1]); keeper.side = guess; SFX.jump(); path = []; },
      key() {},
      update(dt) {
        if (!flight) return; const f = dt * 60; flight.t += .028 * f * flight.pw; const t = Math.min(1, flight.t);
        ball.x = lerp(.5, flight.tx, t) + Math.sin(t * Math.PI) * flight.bend * .25; ball.y = lerp(.86, flight.ty, t); ball.s = lerp(1, .38, t); ball.z = Math.sin(t * Math.PI) * .05;
        keeper.t = Math.min(1, keeper.t + .04 * f); keeper.x = .5 + keeper.side * .2 * keeper.t;
        if (t >= 1 && !flight.done) { flight.done = true; shots++; const inGoal = ball.x > .21 && ball.x < .79 && ball.y > .21 && ball.y < .43; const kx = keeper.x, saved = inGoal && Math.abs(ball.x - kx) < .12 && ball.y > .28;
          if (inGoal && !saved) { goals++; msg = pick(['⚽ GOAL!', '🔥 What a strike!', '🎯 Top bins!']); SFX.win(); P.add(ball.x * E.W(), ball.y * E.H(), 40, () => pick(['#fff', '#7bf0b8', '#ffe27a']), 6, 50, 3); E.vib(60); } else { msg = saved ? '🧤 Saved!' : '😬 Missed'; SFX.lose(); E.shake(6); }
          E.toast(msg); E.score(goals * 100 + (round - 1) * 200);
          setTimeout(() => { if (shots >= 5) { if (goals >= 3 * round) { round++; shots = 0; E.toast(`🏆 Round ${round}! Keeper gets better`); } else return E.end(goals * 100 + (round - 1) * 200, `${goals} goals · round ${round}`); } reset(); }, 900); }
        E.stat2(`🥅 ${goals} goals  Round ${round}  Shot ${Math.min(5, shots + 1)}/5`);
      },
      draw(x, W, H) {
        const sky = x.createLinearGradient(0, 0, 0, H * .45); sky.addColorStop(0, '#0b1d4a'); sky.addColorStop(1, '#2d4e9a'); x.fillStyle = sky; x.fillRect(0, 0, W, H * .45);
        x.fillStyle = '#121a3a'; x.fillRect(0, H * .02, W, H * .17); for (let r = 0; r < 5; r++) for (let i = 0; i < 60; i++) { const bob = Math.sin(performance.now() / 300 + i * 1.7 + r) * (flight ? 2 : .6); x.fillStyle = `hsl(${(i * 47 + r * 13) % 360} 45% ${28 + r * 6}%)`; x.beginPath(); x.arc((i + .5 + (r % 2) * .5) / 60 * W, H * (.05 + r * .03) + bob, W / 150, 0, 6.283); x.fill(); } x.fillStyle = '#e9ecf5'; x.fillRect(0, H * .19, W, H * .012); x.fillStyle = '#1d4fd8'; for (let i = 0; i < 6; i++) { rr(x, W * (i / 6) + W * .02, H * .165, W / 6 - W * .04, H * .025, 4); x.fill(); } x.fillStyle = '#fff'; x.font = `800 ${H * .016}px system-ui`; x.textAlign = 'center'; for (let i = 0; i < 6; i++) x.fillText('NEXA', W * (i / 6) + W / 12, H * .183);
        [[.15, 0], [.85, 0]].forEach(([lx]) => { x.fillStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 40; x.beginPath(); x.arc(lx * W, H * .04, 10, 0, 6.283); x.fill(); x.shadowBlur = 0; });
        const gr = x.createLinearGradient(0, H * .4, 0, H); gr.addColorStop(0, '#2f8a3f'); gr.addColorStop(1, '#3fae52'); x.fillStyle = gr; x.fillRect(0, H * .4, W, H * .6);
        for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)'; x.fillRect(0, H * (.4 + i * .075), W, H * .075); }
        x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 3; x.beginPath(); x.moveTo(W * .08, H * .62); x.lineTo(W * .92, H * .62); x.stroke(); x.beginPath(); x.ellipse(W * .5, H * .86, 6, 3, 0, 0, 6.283); x.stroke();
        const gl = W * .2, gt = H * .2, gw = W * .6, gh = H * .22; x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; for (let i = 0; i <= 24; i++) { x.beginPath(); x.moveTo(gl + gw * i / 24, gt); x.lineTo(gl + gw * i / 24, gt + gh); x.stroke(); } for (let i = 0; i <= 10; i++) { x.beginPath(); x.moveTo(gl, gt + gh * i / 10); x.lineTo(gl + gw, gt + gh * i / 10); x.stroke(); }
        x.strokeStyle = '#fff'; x.lineWidth = 8; x.lineJoin = 'round'; x.beginPath(); x.moveTo(gl, gt + gh); x.lineTo(gl, gt); x.lineTo(gl + gw, gt); x.lineTo(gl + gw, gt + gh); x.stroke();
        if (keeper) { const kx = keeper.x * W, ky = gt + gh, dv = keeper.side * keeper.t; x.save(); x.translate(kx, ky); x.rotate(dv * 1.1); x.fillStyle = '#ffcf33'; rr(x, -16, -80, 32, 50, 10); x.fill(); x.fillStyle = '#1b1b2a'; x.fillRect(-14, -32, 12, 32); x.fillRect(2, -32, 12, 32); x.fillStyle = '#ffd6a5'; x.beginPath(); x.arc(0, -92, 12, 0, 6.283); x.fill(); x.strokeStyle = '#ffcf33'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(-14, -74); x.lineTo(-34, -96 + keeper.t * 10); x.moveTo(14, -74); x.lineTo(34, -96 + keeper.t * 10); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(-36, -98 + keeper.t * 10, 7, 0, 6.283); x.arc(36, -98 + keeper.t * 10, 7, 0, 6.283); x.fill(); x.restore(); }
        if (ball) { const bx = ball.x * W, by = ball.y * H - ball.z * H, r = 16 * ball.s * Math.min(1.4, W / 600 + .6); x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(bx, ball.y * H + r * .8, r, r * .35, 0, 0, 6.283); x.fill(); const bg2 = x.createRadialGradient(bx - r * .3, by - r * .3, 1, bx, by, r); bg2.addColorStop(0, '#fff'); bg2.addColorStop(1, '#cfd3dc'); x.fillStyle = bg2; x.beginPath(); x.arc(bx, by, r, 0, 6.283); x.fill(); x.fillStyle = '#1b1b2a'; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + (flight ? flight.t * 20 : 0); x.beginPath(); x.arc(bx + Math.cos(a) * r * .55, by + Math.sin(a) * r * .55, r * .2, 0, 6.283); x.fill(); } x.beginPath(); x.arc(bx, by, r * .24, 0, 6.283); x.fill(); }
        if (path.length > 1) { x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(path[0].x, path[0].y); path.forEach(p => x.lineTo(p.x, p.y)); x.stroke(); }
        if (!flight && !path.length) { x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '700 15px system-ui'; x.textAlign = 'center'; x.fillText('Swipe up from the ball to shoot', W / 2, H * .95); }
        P.step(x, .15);
      },
    };
  },
};

// ======================================================================
// The engine: one glass window, a loop, input, scores
// ======================================================================
let cur = null;
export const LIST = Object.entries(GAMES).map(([id, g]) => ({ id, t: g.t, e: g.e, hint: g.hint }));
export function close() { if (!cur) return; cur.stop(); cur = null; }
export function play(id, ctx = {}) {
  const def = GAMES[id]; if (!def) return; close();
  if (!document.getElementById('nxgstyle')) document.head.insertAdjacentHTML('beforeend', `<style id="nxgstyle">${GLASS}</style>`);
  const me = ctx.me || 'me', BK = `nexa.g.${id}.best.${me}`; let best = 0; try { best = +(localStorage.getItem(BK) || 0); } catch {}
  const root = document.createElement('div'); root.id = 'nxg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', def.t);
  root.innerHTML = `<div class="g-stage"><canvas></canvas>
    <div class="g-top"><div class="g-gl g-title">${def.e} ${def.t}</div><div class="g-gl g-stat" id="g-sc"><small>Score</small>0</div><div class="g-gl g-stat" id="g-s2" hidden></div><div class="g-gl g-stat" id="g-bs"><small>Best</small>${best.toLocaleString()}</div><span class="g-sp"></span><button class="g-gl g-ib" id="g-mu" aria-label="Sound">${muted ? '🔇' : '🔊'}</button><button class="g-gl g-ib" id="g-x" aria-label="Close">✕</button></div>
    <div class="g-gl g-toast" id="g-t"></div>
    ${def.pad ? '<div class="g-pad"><button class="g-gl" id="g-pl" aria-label="Left">◀</button><button class="g-gl" id="g-pr" aria-label="Right">▶</button></div>' : ''}
    <div class="g-over" id="g-o"></div></div>`;
  document.body.append(root);
  const stage = root.querySelector('.g-stage'), cv = root.querySelector('canvas'), x = cv.getContext('2d'), $ = s => root.querySelector(s);
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, state = 'menu', shake = 0, tt = 0;
  const fit = () => { const r = stage.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); game.resize && game.resize(); };
  const E = {
    W: () => W, H: () => H, stage, playing: () => state === 'play', isOver: () => state === 'over',
    score(n) { $('#g-sc').innerHTML = `<small>Score</small>${Number(n).toLocaleString()}`; E._s = n; },
    stat2(t) { const el = $('#g-s2'); el.hidden = !t; if (el._t !== t) { el.textContent = t; el._t = t; } },
    toast(t) { const el = $('#g-t'); el.textContent = t; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 1500); },
    shake(n) { shake = Math.max(shake, n); }, vib(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} },
    end(sc, line) { if (state !== 'play') return; state = 'over'; const nb = sc > best; if (nb) { best = sc; try { localStorage.setItem(BK, best); } catch {} $('#g-bs').innerHTML = `<small>Best</small>${best.toLocaleString()}`; }
      setTimeout(() => card(`<div class="g-em">${nb ? '🏆' : def.e}</div><h2>${nb ? 'New best!' : 'Game over'}</h2><div class="g-big">${Number(sc).toLocaleString()}</div><p>${line || ''}</p>${nb ? '<span class="g-new">Your best ever</span>' : `<p style="margin-top:6px">Best: ${best.toLocaleString()}</p>`}<button class="g-go" id="g-go">Play again</button>`), 600); },
  };
  const game = def.make(E);
  const card = html => { const o = $('#g-o'); o.hidden = false; o.innerHTML = `<div class="g-gl g-card">${html}</div>`; const b = o.querySelector('#g-go'); b && (b.onclick = start, setTimeout(() => b.focus(), 50)); };
  const start = () => { $('#g-o').hidden = true; $('#g-o').innerHTML = ''; game.init(); state = 'play'; last = performance.now(); };
  card(`<div class="g-em">${def.e}</div><h2>${def.t}</h2><p>${def.hint}</p><div class="g-keys">${(def.keys || []).map(k => `<span>${k}</span>`).join('')}</div><button class="g-go" id="g-go">Play</button>`);
  // input
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  let sw = null;
  cv.addEventListener('pointerdown', e => { if (state !== 'play') return; cv.setPointerCapture?.(e.pointerId); const p = pt(e); sw = { ...p, t: performance.now() }; game.down && game.down(p); });
  cv.addEventListener('pointermove', e => { if (state !== 'play') return; const p = pt(e); game.move && (e.buttons || e.pointerType === 'mouse') && game.move(p); });
  cv.addEventListener('pointerup', e => { if (state !== 'play') return; const p = pt(e); if (sw && game.swipe) { const dx = p.x - sw.x, dy = p.y - sw.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > 30 && performance.now() - sw.t < 600) { Math.abs(dx) > Math.abs(dy) ? game.swipe(Math.sign(dx), 0) : game.swipe(0, Math.sign(dy)); } } sw = null; game.up && game.up(p); });
  cv.addEventListener('pointercancel', () => { sw = null; game.up && game.up({ x: 0, y: 0 }); });
  const kd = e => { if (e.key === 'Escape') { e.stopPropagation(); return close(); } if (state !== 'play') { if (e.key === 'Enter' || e.key === ' ') { const b = $('#g-go'); if (b) { e.preventDefault(); b.click(); } } return; } if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault(); game.key && game.key(e.key, true); };
  const ku = e => { if (state === 'play' && game.key) game.key(e.key, false); };
  document.addEventListener('keydown', kd, true); document.addEventListener('keyup', ku, true);
  if (def.pad) { const pl = $('#g-pl'), pr = $('#g-pr'); const on = (b, f) => { b.onpointerdown = e => { e.preventDefault(); state === 'play' && f(true); }; b.onpointerup = b.onpointerleave = b.onpointercancel = () => f(false); }; on(pl, d => game.padL && game.padL(d)); on(pr, d => game.padR && game.padR(d)); }
  $('#g-x').onclick = close; $('#g-mu').onclick = () => { muted = !muted; try { localStorage.setItem('nexa.g.mute', muted ? '1' : '0'); } catch {} $('#g-mu').textContent = muted ? '🔇' : '🔊'; };
  const vis = () => { if (document.hidden && state === 'play') { state = 'pause'; card(`<div class="g-em">⏸️</div><h2>Paused</h2><button class="g-go" id="g-go">Keep playing</button>`); $('#g-go').onclick = () => { $('#g-o').hidden = true; state = 'play'; last = performance.now(); }; } };
  document.addEventListener('visibilitychange', vis);
  const ro = new ResizeObserver(fit); ro.observe(stage); fit();
  if (!game._inited) { try { game.init(); } catch {} } // draws a live preview behind the start card
  const frame = now => {
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    try { if (state === 'play') game.update(dt); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.save(); if (shake > .3) { x.translate(rnd(-shake, shake), rnd(-shake, shake)); shake *= .88; } game.draw(x, W, H); x.restore(); } catch (err) { console.error(err); }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(t => { last = t; frame(t); });
  cur = { stop() { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('keydown', kd, true); document.removeEventListener('keyup', ku, true); document.removeEventListener('visibilitychange', vis); game.stop && game.stop(); root.remove(); ctx.onClose && ctx.onClose(); } };
  return cur;
}
