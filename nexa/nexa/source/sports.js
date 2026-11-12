// Nexa Sports — Football match (vs Nexa, 2 players on one device, or online with a friend),
// Penalty Duel and Cricket (play a friend in chat, swap roles), all in Liquid Glass.
import { GLASS, rr, glassTile, SFX, tone, Parts, rnd, clamp, lerp, pick, isMuted } from './games.js';

const css = `
#nxg .sp-score{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:0;border-radius:16px;overflow:hidden;font-weight:800;font-size:15px;pointer-events:none}
#nxg .sp-score span{padding:8px 12px;display:flex;align-items:center;gap:8px}
#nxg .sp-score .sc{background:rgba(255,255,255,.92);color:#0b0b14;font-variant-numeric:tabular-nums;min-width:62px;justify-content:center;font-size:17px}
#nxg .sp-score .tm{font-variant-numeric:tabular-nums;opacity:.9;font-size:13px}
#nxg .sp-kit{width:12px;height:12px;border-radius:4px;display:inline-block;box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}
#nxg .sp-pad{position:absolute;z-index:5;bottom:16px;right:14px;display:grid;grid-template-columns:repeat(2,auto);gap:10px;align-items:end}
#nxg .sp-btn{width:68px;height:68px;border-radius:50%;font:inherit;font-weight:800;font-size:13px;color:#fff;display:grid;place-items:center;touch-action:none;user-select:none}
#nxg .sp-btn.big{width:84px;height:84px;font-size:15px}
#nxg .sp-btn.on{background:rgba(255,255,255,.35)!important}
#nxg .sp-joy{position:absolute;z-index:5;left:18px;bottom:22px;width:132px;height:132px;border-radius:50%;touch-action:none}
#nxg .sp-joy i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,.3));box-shadow:0 6px 16px rgba(0,0,0,.4)}
@media (hover:hover) and (pointer:fine){#nxg .sp-touch{display:none}}
#nxg .sp-modes{display:grid;gap:10px;margin-top:16px}
#nxg .sp-modes button{height:52px;border-radius:16px;border:1px solid rgba(255,255,255,.25);background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.05));color:#fff;font:inherit;font-weight:800;font-size:15px;cursor:pointer}
#nxg .sp-modes button.pri{background:linear-gradient(180deg,#fff,#e6e2f3);color:#0b0b12}
#nxg .sp-zones{position:absolute;z-index:5;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:6px}
#nxg .sp-zones button{border-radius:12px;border:2px dashed rgba(255,255,255,.55);background:rgba(255,255,255,.08);color:#fff;font:inherit;font-weight:800;cursor:pointer}
#nxg .sp-zones button:hover{background:rgba(255,255,255,.22)}
#nxg .sp-hint{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:5;padding:10px 16px;border-radius:999px;font-weight:700;font-size:14px;white-space:nowrap;pointer-events:none}
#nxg .sp-shots{display:flex;gap:4px;align-items:center}
#nxg .sp-shots b{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.25);display:inline-block}
#nxg .sp-shots b.g{background:#3ddc84}#nxg .sp-shots b.m{background:#ff5f6d}
`;

// ---------------------------------------------------------------- a glass window to play in
function shell(title, emoji, onClose) {
  try { import('./games.js').then(m => m.close && m.close()); } catch {}
  document.getElementById('nxg')?.remove();
  if (!document.getElementById('nxgstyle')) document.head.insertAdjacentHTML('beforeend', `<style id="nxgstyle">${GLASS}</style>`);
  if (!document.getElementById('nxsstyle')) document.head.insertAdjacentHTML('beforeend', `<style id="nxsstyle">${css}</style>`);
  const root = document.createElement('div'); root.id = 'nxg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', title);
  root.innerHTML = `<div class="g-stage"><canvas></canvas><div class="g-top"><div class="g-gl g-title">${emoji} ${title}</div><div class="g-gl g-stat" id="s-a" hidden></div><span class="g-sp"></span><button class="g-gl g-ib" id="s-x" aria-label="Close">✕</button></div><div class="g-gl g-toast" id="s-t"></div><div class="g-over" id="s-o" hidden></div></div>`;
  document.body.append(root);
  const stage = root.querySelector('.g-stage'), cv = root.querySelector('canvas'), x = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, tt = 0, alive = true, shake = 0;
  const fit = () => { const r = stage.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
  const ro = new ResizeObserver(fit); ro.observe(stage); fit();
  const S = {
    root, stage, cv, x, W: () => W, H: () => H,
    toast(t, ms = 1600) { const el = root.querySelector('#s-t'); el.textContent = t; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), ms); },
    stat(t) { const el = root.querySelector('#s-a'); el.hidden = !t; el.innerHTML = t || ''; },
    card(html, wire) { const o = root.querySelector('#s-o'); o.hidden = false; o.innerHTML = `<div class="g-gl g-card">${html}</div>`; wire && wire(o); },
    hide() { const o = root.querySelector('#s-o'); o.hidden = true; o.innerHTML = ''; },
    shake(n) { shake = Math.max(shake, n); },
    loop(frame) { const f = now => { if (!alive) return; const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.save(); if (shake > .3) { x.translate(rnd(-shake, shake), rnd(-shake, shake)); shake *= .88; } try { frame(dt, W, H); } catch (e) { console.error(e); } x.restore(); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(t => { last = t; f(t); }); },
    close() { if (!alive) return; alive = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('keydown', esc, true); root.remove(); onClose && onClose(); },
    get alive() { return alive; },
  };
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); S.close(); } };
  document.addEventListener('keydown', esc, true);
  root.querySelector('#s-x').onclick = () => S.close();
  return S;
}

// crowd + whistle + kick sounds (made on the fly, no files)
let AC = null; const ac = () => { if (isMuted()) return null; try { return AC || (AC = new (window.AudioContext || window.webkitAudioContext)()); } catch { return null; } };
function crowd() {
  const a = ac(); if (!a) return { level() {}, stop() {} };
  const len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0); let b = 0; for (let i = 0; i < len; i++) { b = (b + (Math.random() * 2 - 1) * .02) * .995; d[i] = b * 3 + (Math.random() * 2 - 1) * .04; }
  const src = a.createBufferSource(); src.buffer = buf; src.loop = true; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .6; const g = a.createGain(); g.gain.value = .05; src.connect(f).connect(g).connect(a.destination); src.start();
  return { level(v) { try { g.gain.setTargetAtTime(.04 + v * .25, a.currentTime, .3); } catch {} }, stop() { try { src.stop(); } catch {} } };
}
const whistle = (n = 1) => { for (let i = 0; i < n; i++) setTimeout(() => { tone(2600, .18, 'square', .04, 120); }, i * 260); };
const thump = (p = 1) => tone(90 + p * 40, .08, 'sine', .12 * p, -40);

// ---------------------------------------------------------------- online: a direct link between two phones (WebRTC), set up through the chat message
async function linkUp(api, host, onState) {
  const pc = new RTCPeerConnection(api.ice ? api.ice() : { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  let dc = null, handlers = [], unsub = null, done = false;
  const ready = new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('timeout')), 30000);
    const wire = ch => { dc = ch; ch.onopen = () => { clearTimeout(to); res(); }; ch.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } handlers.forEach(h => h(m)); }; ch.onclose = () => onState && onState('closed'); };
    if (host) wire(pc.createDataChannel('nexa-game', { ordered: false, maxRetransmits: 0 })); else pc.ondatachannel = e => wire(e.channel);
  });
  const gathered = () => new Promise(r => { if (pc.iceGatheringState === 'complete') return r(); const t = setTimeout(r, 3000); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); } }); });
  const stamp = Date.now();
  if (host) {
    await pc.setLocalDescription(await pc.createOffer()); await gathered();
    await api.update({ 'game.sig': { offer: pc.localDescription.sdp, t: stamp } });
    unsub = api.listen(g => { const s = g && g.sig; if (!done && s && s.answer && s.t === stamp) { done = true; pc.setRemoteDescription({ type: 'answer', sdp: s.answer }).catch(() => {}); } });
  } else {
    unsub = api.listen(async g => { const s = g && g.sig; if (done || !s || !s.offer || s.answer || Date.now() - s.t > 120000) return; done = true;
      try { await pc.setRemoteDescription({ type: 'offer', sdp: s.offer }); await pc.setLocalDescription(await pc.createAnswer()); await gathered(); await api.update({ 'game.sig.answer': pc.localDescription.sdp }); } catch (e) { console.warn(e); } });
  }
  return { ready, send(o) { try { dc && dc.readyState === 'open' && dc.send(JSON.stringify(o)); } catch {} }, on(h) { handlers.push(h); }, close() { try { unsub && unsub(); } catch {} try { dc && dc.close(); pc.close(); } catch {} } };
}

// ======================================================================
// FOOTBALL — 5-a-side with real ball physics, passing, shooting, tackles, keepers and a crowd
// ======================================================================
const L = 72, Wp = 46, GOAL = 7.3, GH = 2.44, BOX_D = 11, BOX_W = 26, SIX_D = 4, SIX_W = 12;
const KITS = [{ a: '#2f6bff', b: '#123a9e', n: '#fff', gk: '#ffd23f', name: 'Nexa Blue' }, { a: '#ff4d5e', b: '#9e1f2c', n: '#fff', gk: '#3ddc84', name: 'Nexa Red' }];
const FORM = [[3, .5, 'gk'], [16, .28, 'df'], [16, .72, 'df'], [29, .5, 'mf'], [33, .5, 'fw']];

export function football(opts = {}) {
  const mode = opts.mode || 'ai'; // 'ai' | 'local' | 'host' | 'guest'
  const net = opts.net || null, guest = mode === 'guest';
  const names = opts.names || ['You', mode === 'ai' ? 'Nexa' : 'Player 2'];
  const S = shell('Football', '⚽', () => { stop(); opts.onClose && opts.onClose(); });
  const P = Parts(); let crowdSnd = null, matchT = 0, half = 1, score = [0, 0], state = 'menu', pauseT = 0, banner = '', bannerT = 0, kickTeam = 0, switchT = 0, lastSend = 0;
  const HALF = opts.halfSecs || 150;
  const players = []; for (let t = 0; t < 2; t++) FORM.forEach(([fx, fy, role], i) => players.push({ t, i, role, x: 0, y: 0, vx: 0, vy: 0, face: t ? Math.PI : 0, run: 0, cd: 0, dive: 0, human: -1 }));
  const ball = { x: L / 2, y: Wp / 2, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, rot: 0, owner: null, last: 0, cool: 0 };
  const humans = [{ t: 0, p: null, ax: 0, ay: 0, pass: false, shoot: false, sprint: false, power: 0, tackle: false }, { t: 1, p: null, ax: 0, ay: 0, pass: false, shoot: false, sprint: false, power: 0, tackle: false, off: mode === 'ai' }];
  if (guest) humans[0].off = true; // the host runs the match; we only draw it and send our controls
  const home = (p) => { const [fx, fy, role] = FORM[p.i]; let bx = (ball.x - L / 2) * .42, by = (ball.y - Wp / 2) * .32; if (role === 'gk') { bx = 0; by *= .2; } let x0 = fx + (role === 'gk' ? 0 : bx), y0 = fy * Wp + by; if (p.t === 1) x0 = L - (fx + (role === 'gk' ? 0 : -bx)); return { x: clamp(x0, 1, L - 1), y: clamp(y0, 2, Wp - 2) }; };
  const kickoff = (team) => { kickTeam = team; players.forEach(p => { const [fx, fy] = FORM[p.i]; const side = p.t === 0 ? Math.min(fx, L / 2 - 2) : L - Math.min(fx, L / 2 - 2); p.x = side; p.y = fy * Wp; p.vx = p.vy = 0; p.dive = 0; p.face = p.t ? Math.PI : 0; }); const fw = players.find(p => p.t === team && p.role === 'fw'); fw.x = L / 2 + (team ? .8 : -.8); fw.y = Wp / 2; Object.assign(ball, { x: L / 2, y: Wp / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: fw, last: team, cool: 0 }); pauseT = 1.2; whistle(1); };
  const goalX = t => t === 0 ? L : 0; // the goal team t attacks
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const mates = p => players.filter(q => q.t === p.t && q !== p);
  const opps = p => players.filter(q => q.t !== p.t);
  function release(p) { if (ball.owner === p) { ball.owner = null; ball.cool = .25; } }
  function pass(p, dirx, diry) {
    let best = null, bs = -1e9; const fl = Math.hypot(dirx, diry) > .2;
    for (const q of mates(p)) { if (q.role === 'gk' && dist(p, q) > 25) continue; const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1; const al = fl ? (dx * dirx + dy * diry) / (d * Math.hypot(dirx, diry)) : (q.t === 0 ? dx : -dx) / d * .5 + .3; let open = 9; for (const o of opps(p)) { const t2 = clamp(((o.x - p.x) * dx + (o.y - p.y) * dy) / (d * d), 0, 1); open = Math.min(open, Math.hypot(p.x + dx * t2 - o.x, p.y + dy * t2 - o.y)); } const sc = al * 3 + Math.min(open, 4) - Math.abs(d - 14) * .08 + (q.t === 0 ? q.x - p.x : p.x - q.x) * .03; if (sc > bs) { bs = sc; best = q; } }
    if (!best) return; const lead = .45, tx = best.x + best.vx * lead, ty = best.y + best.vy * lead, d = Math.hypot(tx - p.x, ty - p.y), lob = d > 22;
    const sp = lob ? clamp(d * .78, 12, 22) : clamp(d * 1.15 + 5, 8, 24); release(p); ball.vx = (tx - p.x) / d * sp; ball.vy = (ty - p.y) / d * sp; ball.vz = lob ? clamp(d * .28, 4, 9) : .4; ball.last = p.t; ball.spin = 0; thump(.6); p.cd = .3;
  }
  function shoot(p, power, aimY) {
    const gx = goalX(p.t), gy = Wp / 2 + clamp(aimY, -1, 1) * (GOAL / 2 - .45) + rnd(-1, 1) * (1.4 - power) * 1.2 + (power > .92 ? rnd(-1.2, 1.2) : 0), d = Math.hypot(gx - p.x, gy - p.y);
    const sp = 15 + power * 15; release(p); ball.vx = (gx - p.x) / d * sp; ball.vy = (gy - p.y) / d * sp; ball.vz = 1.2 + power * power * 6.2 + (d > 25 ? 1.5 : 0); ball.spin = rnd(-.6, .6); ball.last = p.t; thump(1); p.cd = .5; S.shake(3);
  }
  function step(dt) {
    if (pauseT > 0) { pauseT -= dt; return; }
    matchT += dt;
    if (matchT >= HALF && half === 1) { half = 2; matchT = 0; whistle(2); banner = 'Half time'; bannerT = 2.2; pauseT = 2.2; kickoff(1); return; }
    if (matchT >= HALF && half === 2 && state === 'play') { state = 'over'; whistle(3); end(); return; }
    // who each person controls: whoever has the ball in your team, otherwise the nearest outfield player to it
    switchT -= dt;
    humans.forEach(h => { if (h.off) { h.p = null; return; } const own = ball.owner && ball.owner.t === h.t ? ball.owner : null; if (own) { h.p = own; return; } if (!h.p || switchT <= 0) { const cand = players.filter(p => p.t === h.t && p.role !== 'gk').sort((a, b) => dist(a, ball) - dist(b, ball))[0]; if (!h.p || dist(cand, ball) + 2 < dist(h.p, ball)) h.p = cand; } });
    if (switchT <= 0) switchT = .3;
    players.forEach(p => p.human = -1); humans.forEach((h, i) => { if (h.p) h.p.human = i; });
    for (const p of players) {
      p.cd = Math.max(0, p.cd - dt); let tx = p.x, ty = p.y, sprint = false, max = 5.6;
      const h = p.human >= 0 ? humans[p.human] : null;
      if (h) {
        const m = Math.hypot(h.ax, h.ay); tx = p.x + h.ax * 3; ty = p.y + h.ay * 3; sprint = h.sprint; if (m < .1) { tx = p.x; ty = p.y; }
        if (ball.owner === p && p.cd <= 0) {
          if (h.pass) { h.pass = false; pass(p, h.ax, h.ay); }
          else if (h.shootRel) { h.shootRel = false; shoot(p, clamp(h.power, .25, 1), h.ay * (p.t === 0 ? 1 : 1)); h.power = 0; }
        } else if (h.pass && ball.owner && ball.owner.t !== p.t && dist(p, ball.owner) < 1.6 && p.cd <= 0) { h.pass = false; tackle(p); }
        else if (h.pass && !ball.owner) h.pass = false;
        if (h.shootRel && ball.owner !== p) { h.shootRel = false; h.power = 0; }
      } else ({ tx, ty, sprint } = ai(p));
      if (p.role === 'gk') max = 6.2; if (sprint) max *= 1.35; if (ball.owner === p) max *= .9;
      let dx = tx - p.x, dy = ty - p.y; const d = Math.hypot(dx, dy); let wx = 0, wy = 0; if (d > .15) { const s = Math.min(max, d * 3); wx = dx / d * s; wy = dy / d * s; }
      const acc = p.dive > 0 ? 0 : 24 * dt; p.vx += clamp(wx - p.vx, -acc, acc); p.vy += clamp(wy - p.vy, -acc, acc);
      if (p.dive > 0) { p.dive -= dt; p.vx *= .97; p.vy *= .97; }
      p.x = clamp(p.x + p.vx * dt, -1, L + 1); p.y = clamp(p.y + p.vy * dt, -1, Wp + 1);
      const sp = Math.hypot(p.vx, p.vy); if (sp > .4) p.face = Math.atan2(p.vy, p.vx); p.run += sp * dt * 2.2;
    }
    // players don't walk through each other
    for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) { const a = players[i], b = players[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d > 0 && d < .9) { const push = (.9 - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; } }
    ballStep(dt);
  }
  function tackle(p) { p.cd = .8; const o = ball.owner; if (!o) return; const win = Math.random() < (p.human >= 0 ? .62 : .42); if (win) { ball.owner = null; ball.cool = .15; const a = Math.atan2(o.y - p.y, o.x - p.x) + rnd(-1, 1); ball.vx = Math.cos(a) * 6 + p.vx * .4; ball.vy = Math.sin(a) * 6 + p.vy * .4; ball.vz = .5; o.cd = .7; tone(180, .06, 'triangle', .05); } else { p.vx *= .3; p.vy *= .3; } }
  function ai(p) {
    const own = ball.owner, mine = own && own.t === p.t, gx = goalX(p.t), myGoal = goalX(1 - p.t);
    if (p.role === 'gk') {
      const gy = clamp(ball.y, Wp / 2 - GOAL / 2 + .4, Wp / 2 + GOAL / 2 - .4), out = clamp(Math.abs(ball.x - myGoal) * .08, .8, 3.2);
      let tx = myGoal + (p.t === 0 ? out : -out), ty = Wp / 2 + (gy - Wp / 2) * .85;
      // shot coming: dive across
      const toward = p.t === 0 ? ball.vx < -6 : ball.vx > 6;
      if (!own && toward && Math.abs(ball.x - myGoal) < 22) { const tt = Math.abs((p.x - ball.x) / (ball.vx || 1)), py = ball.y + ball.vy * tt; ty = clamp(py, Wp / 2 - GOAL / 2 - .5, Wp / 2 + GOAL / 2 + .5); if (Math.abs(py - p.y) > 1.2 && tt < .55 && p.dive <= 0) { p.dive = .6; const dir = Math.sign(py - p.y); p.vy = dir * 8.5; } }
      const inBox = Math.abs(ball.x - myGoal) < BOX_D && Math.abs(ball.y - Wp / 2) < BOX_W / 2;
      if (!own && inBox && Math.hypot(ball.vx, ball.vy) < 7) { tx = ball.x; ty = ball.y; }
      if (own === p && p.cd <= 0) { pass(p, p.t ? -1 : 1, 0); }
      return { tx, ty, sprint: true };
    }
    if (own === p) { // AI on the ball
      const dGoal = Math.hypot(gx - p.x, Wp / 2 - p.y), near = Math.min(...opps(p).map(o => dist(o, p)));
      if (p.cd <= 0 && dGoal < 21 && Math.random() < .05) { shoot(p, clamp(.55 + (21 - dGoal) * .02 + rnd(0, .25), .4, .95), rnd(-.9, .9)); return { tx: p.x, ty: p.y }; }
      if (p.cd <= 0 && near < 2.6 && Math.random() < .08) { pass(p, 0, 0); return { tx: p.x, ty: p.y }; }
      if (p.cd <= 0 && Math.random() < .006) { pass(p, 0, 0); return { tx: p.x, ty: p.y }; }
      let tx = gx, ty = Wp / 2 + (p.y - Wp / 2) * .6; // dribble toward goal, slipping past the nearest defender
      const o = opps(p).sort((a, b) => dist(a, p) - dist(b, p))[0]; if (o && dist(o, p) < 4) ty += (p.y > o.y ? 4 : -4);
      return { tx, ty, sprint: dGoal > 14 };
    }
    if (!mine) { // defend: the nearest two press, the rest hold shape
      const chasers = players.filter(q => q.t === p.t && q.role !== 'gk' && q.human < 0).sort((a, b) => dist(a, ball) - dist(b, ball));
      if (chasers[0] === p || (chasers[1] === p && own)) { if (own && dist(p, own) < 1.4 && p.cd <= 0 && Math.random() < .07) tackle(p); return { tx: ball.x + ball.vx * .25, ty: ball.y + ball.vy * .25, sprint: true }; }
      const h = home(p); return { tx: lerp(h.x, myGoal, .18), ty: lerp(h.y, ball.y, .2) };
    }
    const h = home(p); return { tx: h.x + (p.t === 0 ? 5 : -5), ty: h.y + Math.sin(matchT * .7 + p.i) * 3 };
  }
  function ballStep(dt) {
    ball.cool = Math.max(0, ball.cool - dt);
    if (ball.owner) { const o = ball.owner, k = .75; ball.x = o.x + Math.cos(o.face) * k; ball.y = o.y + Math.sin(o.face) * k; ball.z = 0; ball.vx = o.vx; ball.vy = o.vy; ball.vz = 0; ball.last = o.t; ball.rot += Math.hypot(o.vx, o.vy) * dt * 2; return; }
    const sp = Math.hypot(ball.vx, ball.vy);
    if (ball.spin && ball.z > .1) { const a = ball.spin * dt * .9, c = Math.cos(a), s = Math.sin(a); [ball.vx, ball.vy] = [ball.vx * c - ball.vy * s, ball.vx * s + ball.vy * c]; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt; ball.vz -= 9.8 * dt; ball.rot += sp * dt * 1.6;
    if (ball.z <= 0) { ball.z = 0; if (ball.vz < -1.4) { ball.vz = -ball.vz * .45; ball.vx *= .85; ball.vy *= .85; } else ball.vz = 0; }
    const fr = ball.z > 0 ? .995 : Math.pow(.42, dt); ball.vx *= ball.z > 0 ? Math.pow(.92, dt) : fr; ball.vy *= ball.z > 0 ? Math.pow(.92, dt) : fr;
    // posts and crossbar
    for (const gx of [0, L]) for (const py of [Wp / 2 - GOAL / 2, Wp / 2 + GOAL / 2]) { const d = Math.hypot(ball.x - gx, ball.y - py); if (d < .25 && ball.z < GH) { const nx = (ball.x - gx) / (d || 1), ny = (ball.y - py) / (d || 1), dot = ball.vx * nx + ball.vy * ny; if (dot < 0) { ball.vx -= 1.7 * dot * nx; ball.vy -= 1.7 * dot * ny; tone(900, .12, 'triangle', .07); S.toast('🥅 Off the post!'); } } }
    // goal / out of play
    const inMouth = Math.abs(ball.y - Wp / 2) < GOAL / 2 && ball.z < GH;
    if (ball.x < 0 || ball.x > L) { if (inMouth) return goal(ball.x > L ? 0 : 1); return restart(ball.x < 0 ? 0 : 1); }
    if (ball.y < 0 || ball.y > Wp) return throwIn();
    // someone gets the ball
    if (ball.cool <= 0 && ball.z < 1.3) {
      let best = null, bd = 1.05;
      for (const p of players) { const reach = p.role === 'gk' && Math.abs(ball.x - goalX(1 - p.t)) < BOX_D && Math.abs(ball.y - Wp / 2) < BOX_W / 2 ? (p.dive > 0 ? 2.2 : 1.5) : 1.05; const d = dist(p, ball); if (d < reach && d < bd + (reach - 1.05)) { best = p; bd = d; } }
      if (best) { const fast = Math.hypot(ball.vx, ball.vy) > 15; if (best.role === 'gk' && fast && Math.random() < .4) { ball.vx *= -.45; ball.vy = rnd(-8, 8); ball.vz = 2; ball.cool = .3; S.toast('🧤 What a save!'); tone(400, .1, 'triangle', .06); } else { if (best.role === 'gk' && fast) S.toast('🧤 Caught!'); ball.owner = best; ball.last = best.t; } }
    }
    if (ball.z < 2.6 && ball.cool <= 0) for (const p of players) if (p.role === 'gk' && p.dive > 0 && dist(p, ball) < 1.9 && Math.hypot(ball.vx, ball.vy) > 9) { ball.vx = (p.t ? 1 : -1) * Math.abs(ball.vx) * .35; ball.vy = rnd(-9, 9); ball.vz = 3; ball.cool = .35; S.toast('🧤 Saved!'); break; }
  }
  function goal(team) { score[team]++; whistle(1); SFX.win(); S.shake(10); banner = 'GOAL!'; bannerT = 2.4; crowdSnd && crowdSnd.level(1); setTimeout(() => crowdSnd && crowdSnd.level(.2), 2400); for (let i = 0; i < 4; i++) P.add(rnd(0, S.W()), rnd(0, S.H() * .5), 30, () => pick(['#ffd23f', '#fff', KITS[team].a, '#7bf0b8']), 6, 70, 3); pauseT = 2.4; setTimeout(() => state === 'play' && kickoff(1 - team), 2400); ball.vx *= .2; ball.vy *= .2; net && net.send({ ev: 'goal', team }); }
  function restart(sideAtLeftGoal) { // crossed a goal line
    const defTeam = sideAtLeftGoal ? 0 : 1; const lastAtt = ball.last !== defTeam;
    if (lastAtt) { const gk = players.find(p => p.t === defTeam && p.role === 'gk'); gk.x = sideAtLeftGoal ? 2 : L - 2; gk.y = Wp / 2; Object.assign(ball, { x: gk.x, y: gk.y, z: 0, vx: 0, vy: 0, vz: 0, owner: gk }); S.toast('Goal kick'); }
    else { const att = 1 - defTeam, cy = ball.y < Wp / 2 ? .3 : Wp - .3, cx = sideAtLeftGoal ? .3 : L - .3; const p = players.filter(q => q.t === att && q.role !== 'gk').sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0]; p.x = cx; p.y = cy; Object.assign(ball, { x: cx, y: cy, z: 0, vx: 0, vy: 0, vz: 0, owner: p }); p.face = Math.atan2(Wp / 2 - cy, (sideAtLeftGoal ? 8 : L - 8) - cx); S.toast('🚩 Corner'); }
    pauseT = .7; whistle(1);
  }
  function throwIn() { const t = 1 - ball.last, y = ball.y < 0 ? .4 : Wp - .4, x0 = clamp(ball.x, 1, L - 1); const p = players.filter(q => q.t === t && q.role !== 'gk').sort((a, b) => Math.hypot(a.x - x0, a.y - y) - Math.hypot(b.x - x0, b.y - y))[0]; p.x = x0; p.y = y; p.face = y < 1 ? Math.PI / 2 : -Math.PI / 2; Object.assign(ball, { x: x0, y, z: 0, vx: 0, vy: 0, vz: 0, owner: p }); S.toast('Throw-in'); pauseT = .5; }
  function end() {
    crowdSnd && crowdSnd.level(.6); setTimeout(() => crowdSnd && crowdSnd.level(.15), 2500);
    const r = score[0] > score[1] ? `${names[0]} win!` : score[0] < score[1] ? `${names[1]} win!` : 'It’s a draw!';
    net && net.send({ ev: 'end', score });
    S.card(`<div class="g-em">🏆</div><h2>Full time</h2><div class="g-big">${score[0]} – ${score[1]}</div><p>${r}</p>${guest ? '' : '<button class="g-go" id="sp-again">Play again</button>'}`, o => { const b = o.querySelector('#sp-again'); b && (b.onclick = () => begin()); });
    opts.onEnd && opts.onEnd(score.slice());
  }
  // ---------------- controls
  const K = {};
  const onKey = (e, down) => {
    if (!S.alive) return; const c = e.code; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault(); K[c] = down;
    const two = mode === 'local';
    const map = two ? [{ u: 'KeyW', d: 'KeyS', l: 'KeyA', r: 'KeyD', pass: 'KeyF', shoot: 'KeyG', sprint: 'ShiftLeft' }, { u: 'ArrowUp', d: 'ArrowDown', l: 'ArrowLeft', r: 'ArrowRight', pass: 'KeyK', shoot: 'KeyL', sprint: 'ShiftRight' }]
      : [{ u: ['KeyW', 'ArrowUp'], d: ['KeyS', 'ArrowDown'], l: ['KeyA', 'ArrowLeft'], r: ['KeyD', 'ArrowRight'], pass: ['Space', 'KeyJ', 'KeyF'], shoot: ['KeyK', 'Enter', 'KeyG'], sprint: ['ShiftLeft', 'ShiftRight'] }];
    map.forEach((m, i) => { const hi = guest ? 1 : i; const h = humans[hi], has = k => [].concat(m[k]).some(q => K[q]), is = k => [].concat(m[k]).includes(c);
      h.ax = (has('r') ? 1 : 0) - (has('l') ? 1 : 0); h.ay = (has('d') ? 1 : 0) - (has('u') ? 1 : 0); h.sprint = has('sprint');
      if (is('pass') && down && !e.repeat) h.pass = true;
      if (is('shoot')) { if (down && !e.repeat) { h.charging = true; h.power = 0; } if (!down && h.charging) { h.charging = false; h.shootRel = true; } } });
  };
  const kd = e => onKey(e, true), ku = e => onKey(e, false);
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  // touch: joystick + Pass / Shoot / Sprint
  S.stage.insertAdjacentHTML('beforeend', `<div class="g-gl sp-joy sp-touch"><i></i></div><div class="sp-pad sp-touch"><button class="g-gl sp-btn" data-k="sprint">Sprint</button><span></span><button class="g-gl sp-btn" data-k="pass">Pass<br>Tackle</button><button class="g-gl sp-btn big" data-k="shoot">Shoot</button></div><div class="g-gl sp-score" id="sp-sc"></div>`);
  const me = () => humans[guest ? 1 : 0];
  { const joy = S.stage.querySelector('.sp-joy'), knob = joy.querySelector('i'); let id = null;
    const mv = e => { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } knob.style.transform = `translate(${dx * 38}px,${dy * 38}px)`; const h = me(); h.ax = dx; h.ay = dy; };
    joy.onpointerdown = e => { id = e.pointerId; joy.setPointerCapture(id); mv(e); }; joy.onpointermove = e => { if (e.pointerId === id) mv(e); }; joy.onpointerup = joy.onpointercancel = () => { id = null; knob.style.transform = ''; const h = me(); h.ax = h.ay = 0; };
    S.stage.querySelectorAll('.sp-btn').forEach(b => { const k = b.dataset.k; b.onpointerdown = e => { e.preventDefault(); b.classList.add('on'); const h = me(); if (k === 'pass') h.pass = true; if (k === 'sprint') h.sprint = true; if (k === 'shoot') { h.charging = true; h.power = 0; } }; b.onpointerup = b.onpointercancel = b.onpointerleave = () => { b.classList.remove('on'); const h = me(); if (k === 'sprint') h.sprint = false; if (k === 'shoot' && h.charging) { h.charging = false; h.shootRel = true; } }; }); }
  // ---------------- networking
  let snap = null, prevSnap = null, snapAt = 0;
  if (net && mode === 'host') net.on(m => { if (m.i) { const h = humans[1]; [h.ax, h.ay] = m.i; h.sprint = !!m.i[2]; if (m.i[3]) h.pass = true; if (m.i[4]) { h.shootRel = true; h.power = m.i[5] || .6; } } });
  if (net && guest) net.on(m => { if (m.p) { prevSnap = snap; snap = m; snapAt = performance.now(); } if (m.ev === 'goal') { SFX.win(); S.shake(10); banner = 'GOAL!'; bannerT = 2.4; } if (m.ev === 'end') { score = m.score; end(); } });
  const sendState = () => net.send({ p: players.map(p => [+p.x.toFixed(2), +p.y.toFixed(2), +p.face.toFixed(2), +p.run.toFixed(1), p.human, +(p.dive > 0)]), b: [+ball.x.toFixed(2), +ball.y.toFixed(2), +ball.z.toFixed(2), +ball.rot.toFixed(1)], s: score, t: +matchT.toFixed(1), h: half, bn: bannerT > 0 ? banner : '' });
  let gPassQ = false, gShootQ = false, gPow = 0;
  // ---------------- drawing
  let crowdCv = null;
  const makeCrowd = () => { crowdCv = document.createElement('canvas'); crowdCv.width = 512; crowdCv.height = 64; const c = crowdCv.getContext('2d'); c.fillStyle = '#1a1c2e'; c.fillRect(0, 0, 512, 64); for (let i = 0; i < 1400; i++) { c.fillStyle = `hsl(${(Math.random() * 360) | 0} ${30 + Math.random() * 40}% ${25 + Math.random() * 35}%)`; c.beginPath(); c.arc(Math.random() * 512, Math.random() * 64, 1.6 + Math.random() * 1.4, 0, 7); c.fill(); } };
  function draw(x, W, H) {
    const view = W < 700 ? 26 : W < 1000 ? 30 : 46, s = Math.min(W / view, H / (view * .62)), bx = guest && snap ? snap.b[0] : ball.x, by = guest && snap ? snap.b[1] : ball.y;
    cam.x = lerp(cam.x, clamp(bx, W / s / 2 - 6, L - W / s / 2 + 6), .08); cam.y = lerp(cam.y, clamp(by, H / s / 2 - 8, Wp - H / s / 2 + 8), .08);
    const X = v => (v - cam.x) * s + W / 2, Y = v => (v - cam.y) * s + H / 2;
    // stadium
    x.fillStyle = '#0c0e1c'; x.fillRect(0, 0, W, H); if (!crowdCv) makeCrowd();
    const pad = 9; x.save(); x.beginPath(); x.rect(X(-pad), Y(-pad), (L + pad * 2) * s, (Wp + pad * 2) * s); x.clip(); for (let yy = Y(-pad); yy < Y(Wp + pad); yy += 64 * s / 12) x.drawImage(crowdCv, X(-pad) + (yy % 97), yy, (L + pad * 2) * s, 64 * s / 12); x.restore();
    x.fillStyle = '#26482f'; x.fillRect(X(-4), Y(-4), (L + 8) * s, (Wp + 8) * s);
    for (let i = 0; i < L / 5; i++) { x.fillStyle = i % 2 ? '#3f8a45' : '#4a9a4f'; x.fillRect(X(i * 5), Y(0), 5 * s + 1, Wp * s); }
    const gl = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .8); gl.addColorStop(0, 'rgba(255,255,255,.06)'); gl.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = gl; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,.88)'; x.lineWidth = Math.max(1.5, .12 * s); x.lineJoin = 'round';
    x.strokeRect(X(0), Y(0), L * s, Wp * s); x.beginPath(); x.moveTo(X(L / 2), Y(0)); x.lineTo(X(L / 2), Y(Wp)); x.stroke(); x.beginPath(); x.arc(X(L / 2), Y(Wp / 2), 6 * s, 0, 7); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(X(L / 2), Y(Wp / 2), .25 * s, 0, 7); x.fill();
    for (const g of [0, 1]) { const gx = g ? L : 0, dir = g ? -1 : 1; x.strokeRect(Math.min(X(gx), X(gx + dir * BOX_D)), Y(Wp / 2 - BOX_W / 2), BOX_D * s, BOX_W * s); x.strokeRect(Math.min(X(gx), X(gx + dir * SIX_D)), Y(Wp / 2 - SIX_W / 2), SIX_D * s, SIX_W * s); x.beginPath(); x.arc(X(gx + dir * 8), Y(Wp / 2), .22 * s, 0, 7); x.fill(); x.beginPath(); x.arc(X(gx + dir * 8), Y(Wp / 2), 5 * s, g ? Math.PI * .63 : -Math.PI * .37, g ? Math.PI * 1.37 : Math.PI * .37); x.stroke(); for (const cy of [0, Wp]) { x.beginPath(); x.arc(X(gx), Y(cy), 1 * s, 0, 7); x.stroke(); } }
    // goals (net behind the line, white posts)
    for (const g of [0, 1]) { const gx = g ? L : 0, dir = g ? 1 : -1, x0 = X(gx), x1 = X(gx + dir * 1.8), y0 = Y(Wp / 2 - GOAL / 2), y1 = Y(Wp / 2 + GOAL / 2); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0); x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 1; for (let k = 0; k <= 10; k++) { x.beginPath(); x.moveTo(x0, y0 + (y1 - y0) * k / 10); x.lineTo(x1, y0 + (y1 - y0) * k / 10); x.stroke(); } for (let k = 0; k <= 3; k++) { x.beginPath(); x.moveTo(x0 + (x1 - x0) * k / 3, y0); x.lineTo(x0 + (x1 - x0) * k / 3, y1); x.stroke(); } x.strokeStyle = '#fff'; x.lineWidth = Math.max(3, .2 * s); x.beginPath(); x.moveTo(x1, y0); x.lineTo(x0, y0); x.lineTo(x0, y1); x.lineTo(x1, y1); x.stroke(); }
    // players + ball (guest draws the host's picture)
    const list = guest && snap ? snap.p.map((q, i) => { const pv = prevSnap && prevSnap.p[i], k = clamp((performance.now() - snapAt) / 50, 0, 1); return { t: i < 5 ? 0 : 1, role: FORM[i % 5][2], x: pv ? lerp(pv[0], q[0], k) : q[0], y: pv ? lerp(pv[1], q[1], k) : q[1], face: q[2], run: q[3], human: q[4], dive: q[5] ? .3 : 0, i: i % 5 }; }) : players;
    const B = guest && snap ? { x: snap.b[0], y: snap.b[1], z: snap.b[2], rot: snap.b[3] } : ball;
    const drawP = p => { const px = X(p.x), py = Y(p.y), r = .62 * s, kit = KITS[p.t], col = p.role === 'gk' ? kit.gk : kit.a;
      x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(px + r * .5, py + r * .7, r * 1.15, r * .55, .3, 0, 7); x.fill();
      if (p.human >= 0) { x.strokeStyle = p.human === (guest ? 1 : 0) || mode === 'local' ? (p.t ? '#ff9aa5' : '#9ec1ff') : 'rgba(255,255,255,.5)'; x.lineWidth = 3; x.beginPath(); x.ellipse(px, py + r * .2, r * 1.7, r * 1.05, 0, 0, 7); x.stroke(); x.fillStyle = x.strokeStyle; x.beginPath(); x.moveTo(px + Math.cos(p.face) * r * 2.3, py + Math.sin(p.face) * r * 2.3); x.lineTo(px + Math.cos(p.face + .35) * r * 1.7, py + Math.sin(p.face + .35) * r * 1.7); x.lineTo(px + Math.cos(p.face - .35) * r * 1.7, py + Math.sin(p.face - .35) * r * 1.7); x.fill(); }
      const sw = Math.sin(p.run) * .5; x.strokeStyle = '#1a1a22'; x.lineWidth = r * .42; x.lineCap = 'round'; const fx = Math.cos(p.face), fy = Math.sin(p.face); for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(px - fy * r * .3 * sd, py + fx * r * .3 * sd); x.lineTo(px - fy * r * .3 * sd + fx * r * sw * sd * 1.3, py + fx * r * .3 * sd + fy * r * sw * sd * 1.3); x.stroke(); }
      x.save(); x.translate(px, py); x.rotate(p.face + (p.dive > 0 ? 1.2 : 0)); const g = x.createLinearGradient(0, -r, 0, r); g.addColorStop(0, col); g.addColorStop(1, p.role === 'gk' ? col : kit.b); x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, r * .62, r * 1.02, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-r * .15, -r * .3, r * .25, r * .5, 0, 0, 7); x.fill(); x.fillStyle = '#e8c3a0'; x.beginPath(); x.arc(r * .05, 0, r * .42, 0, 7); x.fill(); x.fillStyle = '#2a1d14'; x.beginPath(); x.arc(-r * .06, 0, r * .36, Math.PI * .5, Math.PI * 1.5); x.fill(); x.restore();
      if (s > 9) { x.fillStyle = '#fff'; x.font = `800 ${Math.max(9, r * .9)}px system-ui`; x.textAlign = 'center'; x.fillText(p.role === 'gk' ? '1' : String([0, 4, 5, 8, 9][p.i]), px, py - r * 1.4); } };
    list.filter(p => p.y <= B.y).forEach(drawP);
    // ball with shadow and height
    const bxp = X(B.x), byp = Y(B.y), br = Math.max(3, .22 * s * (1 + B.z * .06)); x.fillStyle = `rgba(0,0,0,${.35 - Math.min(.25, B.z * .04)})`; x.beginPath(); x.ellipse(bxp + B.z * s * .25, byp + br * .6 + B.z * s * .15, br * (1 + B.z * .08), br * .5, 0, 0, 7); x.fill();
    const by2 = byp - B.z * s * .55; const bg = x.createRadialGradient(bxp - br * .3, by2 - br * .3, br * .1, bxp, by2, br); bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#cfd4de'); x.fillStyle = bg; x.beginPath(); x.arc(bxp, by2, br, 0, 7); x.fill(); x.fillStyle = '#1b1d28'; for (let k = 0; k < 3; k++) { const a = B.rot + k * 2.1; x.beginPath(); x.arc(bxp + Math.cos(a) * br * .55, by2 + Math.sin(a) * br * .45, br * .28, 0, 7); x.fill(); }
    list.filter(p => p.y > B.y).forEach(drawP);
    // shot power bar
    const h = me(); if (h.charging) { const bw = 160, bx0 = W / 2 - bw / 2, by0 = H - 120; glassTile(x, bx0 - 6, by0 - 6, bw + 12, 24, 12, 'rgba(20,20,40,.55)'); const pg = x.createLinearGradient(bx0, 0, bx0 + bw, 0); pg.addColorStop(0, '#7bf0b8'); pg.addColorStop(.7, '#ffd23f'); pg.addColorStop(1, '#ff5f6d'); x.fillStyle = pg; rr(x, bx0, by0, bw * clamp(h.power, 0, 1), 12, 6); x.fill(); }
    // minimap
    const coarse = matchMedia('(pointer: coarse)').matches, mw = Math.min(coarse ? 110 : 150, W * .26), mh = mw * Wp / L, mx = 14, my = coarse ? 66 : H - mh - 14; glassTile(x, mx, my, mw, mh, 10, 'rgba(30,80,40,.55)'); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(mx + mw / 2, my); x.lineTo(mx + mw / 2, my + mh); x.stroke();
    list.forEach(p => { x.fillStyle = p.role === 'gk' ? KITS[p.t].gk : KITS[p.t].a; x.beginPath(); x.arc(mx + p.x / L * mw, my + p.y / Wp * mh, p.human >= 0 ? 3.6 : 2.6, 0, 7); x.fill(); }); x.fillStyle = '#fff'; x.beginPath(); x.arc(mx + B.x / L * mw, my + B.y / Wp * mh, 2.4, 0, 7); x.fill();
    // banner
    const bn = guest && snap ? (snap.bn || (bannerT > 0 ? banner : '')) : bannerT > 0 ? banner : '';
    if (bn) { x.save(); x.font = `900 ${Math.min(110, W * .16)}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(0,0,0,.35)'; x.fillText(bn, W / 2 + 4, H * .42 + 5); const tg = x.createLinearGradient(0, H * .35, 0, H * .5); tg.addColorStop(0, '#fff'); tg.addColorStop(1, '#ffd23f'); x.fillStyle = tg; x.fillText(bn, W / 2, H * .42); x.restore(); }
    P.step(x, .15);
  }
  const cam = { x: L / 2, y: Wp / 2 };
  function hud() { const sc = guest && snap ? snap.s : score, t = guest && snap ? snap.t : matchT, hf = guest && snap ? snap.h : half; const min = Math.min(90, Math.floor((hf - 1) * 45 + t / HALF * 45)); S.root.querySelector('#sp-sc').innerHTML = `<span class="g-gl" style="border-radius:0"><i class="sp-kit" style="background:${KITS[0].a}"></i>${names[0]}</span><span class="sc">${sc[0]} – ${sc[1]}</span><span class="g-gl" style="border-radius:0">${names[1]}<i class="sp-kit" style="background:${KITS[1].a}"></i></span><span class="g-gl tm" style="border-radius:0 16px 16px 0">${min}'</span>`; }
  let acc = 0;
  S.loop((dt, W, H) => {
    if (state === 'play') {
      const h = me(); if (h.charging) h.power = Math.min(1.05, h.power + dt * 1.15);
      if (guest) { if (h.pass) { gPassQ = true; h.pass = false; } if (h.shootRel) { gShootQ = true; gPow = h.power; h.shootRel = false; h.power = 0; } if (performance.now() - lastSend > 33) { lastSend = performance.now(); net.send({ i: [+h.ax.toFixed(2), +h.ay.toFixed(2), h.sprint ? 1 : 0, gPassQ ? 1 : 0, gShootQ ? 1 : 0, +gPow.toFixed(2)] }); gPassQ = gShootQ = false; } }
      else { acc += dt; while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; } if (bannerT > 0) bannerT -= dt; if (net && performance.now() - lastSend > 50) { lastSend = performance.now(); sendState(); } }
    }
    if (guest && bannerT > 0) bannerT -= dt;
    draw(S.x, W, H); hud();
  });
  function begin() { S.hide(); score = [0, 0]; half = 1; matchT = 0; state = 'play'; if (!crowdSnd) crowdSnd = crowd(); crowdSnd.level(.2); if (!guest) kickoff(0); S.toast(matchMedia('(pointer: coarse)').matches ? 'Move with the stick · Pass · hold Shoot' : mode === 'local' ? 'P1: WASD · F pass · hold G shoot · P2: arrows · K pass · hold L shoot' : 'Move: arrows/WASD · Pass: Space · Shoot: hold K · Sprint: Shift', 4200); }
  function stop() { document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); crowdSnd && crowdSnd.stop(); net && net.close(); }
  kickoff(0); pauseT = 0;
  if (mode === 'host' || guest) { S.card(`<div class="g-em">📡</div><h2>Connecting…</h2><p>Waiting for your friend to join the match.</p>`); net.ready.then(() => { begin(); }).catch(() => S.card(`<div class="g-em">😕</div><h2>Couldn’t connect</h2><p>Make sure you’re both online, then try again from the chat.</p><button class="g-go" id="sp-x2">Close</button>`, o => o.querySelector('#sp-x2').onclick = () => S.close())); }
  else S.card(`<div class="g-em">⚽</div><h2>Football</h2><p>${mode === 'local' ? '2 players on this device. Blue: WASD, F pass, hold G shoot, Left Shift sprint. Red: arrows, K pass, hold L shoot, Right Shift sprint.' : '5-a-side vs Nexa. Pass, dribble, tackle and hold Shoot for power.'}</p><div class="g-keys"><span>Arrows / WASD move</span><span>Space pass · tackle</span><span>Hold K shoot</span><span>Shift sprint</span></div><button class="g-go" id="sp-go">Kick off</button>`, o => o.querySelector('#sp-go').onclick = begin);
  return S;
}

// ======================================================================
// PENALTY DUEL — take turns: one shoots, the other dives. Swap every kick. 5 each, then sudden death.
// ======================================================================
const ZONES = [[-1, 1], [0, 1], [1, 1], [-1, 0], [0, 0], [1, 0]]; // (left/centre/right, high/low)
export function penResult(shot, dive) { // shot {x:-1..1, y:0..1 (0 low), p:0..1}; dive zone index
  const over = shot.p > .93 && shot.y > .78, wide = Math.abs(shot.x) > 1.02; if (over || wide) return { goal: false, why: over ? 'Over the bar!' : 'Wide!' };
  const zx = shot.x < -.33 ? -1 : shot.x > .33 ? 1 : 0, zy = shot.y > .5 ? 1 : 0, [dx, dy] = ZONES[dive] || [0, 0];
  const reach = dx === zx && (dy === zy || (Math.abs(shot.x) < .85 && shot.p < .8)); const corner = Math.abs(shot.x) > .8 && shot.y > .7;
  if (reach && !(corner && shot.p > .7)) return { goal: false, why: 'Saved!' };
  return { goal: true, why: corner ? 'Top corner!' : 'GOAL!' };
}
export function penaltyDuel(api) {
  const S = shell('Penalty Duel', '⚽', () => { unsub && unsub(); api.onClose && api.onClose(); });
  let g = api.get(), unsub = null, anim = null, aim = null, drag = null, P = Parts(), shownKicks = (g.kicks || []).length;
  const turn = gm => { const n = (gm.kicks || []).length; return { shooter: n % 2 === 0 ? gm.a : gm.b, keeper: n % 2 === 0 ? gm.b : gm.a, n }; };
  const tally = gm => { const t = { [gm.a]: 0, [gm.b]: 0 }, taken = { [gm.a]: 0, [gm.b]: 0 }; (gm.kicks || []).forEach(k => { taken[k.s]++; if (k.goal) t[k.s]++; }); return { t, taken }; };
  const winner = gm => { const { t, taken } = tally(gm), a = gm.a, b = gm.b; if (!b) return null; const ta = taken[a], tb = taken[b]; if (ta <= 5 && tb <= 5) { if (t[a] > t[b] + (5 - tb)) return a; if (t[b] > t[a] + (5 - ta)) return b; } if (ta >= 5 && ta === tb && t[a] !== t[b]) return t[a] > t[b] ? a : b; return null; };
  const curOf = gm => ((gm.cs || {})[(gm.kicks || []).length] || {});
  const resolve = async gm => { const c = curOf(gm); if (!c.shot || c.dive == null || gm.win) return; const { shooter } = turn(gm); const r = penResult(c.shot, c.dive); const kicks = [...(gm.kicks || []), { s: shooter, shot: c.shot, dive: c.dive, goal: r.goal }]; const w = winner({ ...gm, kicks }); await api.update({ 'game.kicks': kicks, ...(w ? { 'game.win': w } : {}) }); };
  function ui() {
    const gm = g; S.root.querySelectorAll('.sp-zones,.sp-hint').forEach(e => e.remove());
    if (!gm.b) { S.stat(''); return hint(gm.a === api.me ? 'Waiting for a friend to join…' : 'Tap Join in the chat'); }
    const { t, taken } = tally(gm), { shooter, keeper } = turn(gm);
    const dots = uid => (gm.kicks || []).filter(k => k.s === uid).map(k => `<b class="${k.goal ? 'g' : 'm'}"></b>`).join('') + '<b></b>'.repeat(Math.max(0, 5 - taken[uid]));
    S.stat(`<span style="display:flex;gap:10px;align-items:center;white-space:nowrap"><span class="sp-shots">${esc(api.name(gm.a).split(' ')[0])} <b style="background:none;width:auto;height:auto">${t[gm.a]}</b> ${dots(gm.a)}</span><span style="opacity:.6">vs</span><span class="sp-shots">${dots(gm.b)} <b style="background:none;width:auto;height:auto">${t[gm.b]}</b> ${esc(api.name(gm.b).split(' ')[0])}</span></span>`);
    if (gm.win) return hint(`🏆 ${gm.win === api.me ? 'You win!' : esc(api.name(gm.win)) + ' wins!'}`);
    if (anim) return;
    const c = curOf(gm);
    if (shooter === api.me) { if (c.shot) hint('⏳ Shot locked in — waiting for the keeper'); else { hint('🎯 You’re shooting! Drag from the ball to aim, let go to shoot'); } }
    else if (keeper === api.me) { if (c.dive != null) hint('⏳ Dive locked in — waiting for the shot'); else zones(); }
    else hint(`${esc(api.name(shooter))} vs ${esc(api.name(keeper))}`);
  }
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const hint = t => S.stage.insertAdjacentHTML('beforeend', `<div class="g-gl sp-hint">${t}</div>`);
  const geo = () => { const W = S.W(), H = S.H(), gw = Math.min(W * .8, 620), gh = gw * .33, gl = (W - gw) / 2, gt = H * .2; return { W, H, gw, gh, gl, gt, bx: W / 2, by: H * .82 }; };
  function zones() { const q = geo(); S.stage.insertAdjacentHTML('beforeend', `<div class="sp-zones" style="left:${q.gl}px;top:${q.gt}px;width:${q.gw}px;height:${q.gh}px">${ZONES.map((z, i) => `<button data-z="${i}">${['↖', '⬆', '↗', '↙', '⬇', '↘'][i]}</button>`).join('')}</div>`); hint('🧤 You’re in goal! Pick where to dive'); S.stage.querySelectorAll('.sp-zones button').forEach(b => b.onclick = async () => { S.root.querySelectorAll('.sp-zones').forEach(e => e.remove()); SFX.pop(); await api.update({ ['game.cs.' + (g.kicks || []).length + '.dive']: +b.dataset.z }); }); }
  S.cv.addEventListener('pointerdown', e => { const { shooter } = turn(g); if (g.win || !g.b || shooter !== api.me || curOf(g).shot || anim) return; const r = S.cv.getBoundingClientRect(); drag = { x: e.clientX - r.left, y: e.clientY - r.top }; aim = { ...drag }; });
  S.cv.addEventListener('pointermove', e => { if (!drag) return; const r = S.cv.getBoundingClientRect(); aim = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  S.cv.addEventListener('pointerup', async () => { if (!drag || !aim) { drag = null; return; } const q = geo(), dx = aim.x - drag.x, dy = aim.y - drag.y; drag = null; if (dy > -30) { aim = null; return; } const tx = q.bx + dx * 1.6, ty = q.by + dy * 1.25; const shot = { x: +clamp((tx - (q.gl + q.gw / 2)) / (q.gw / 2), -1.3, 1.3).toFixed(2), y: +clamp((q.gt + q.gh - ty) / q.gh, -.2, 1.3).toFixed(2), p: +clamp(Math.hypot(dx, dy) / (S.H() * .5), .3, 1).toFixed(2) }; aim = null; SFX.jump(); await api.update({ ['game.cs.' + (g.kicks || []).length + '.shot']: shot }); });
  function play(k) { anim = { k, t: 0 }; }
  unsub = api.listen(gm => { if (!gm) return; g = gm; const n = (gm.kicks || []).length; if (n > shownKicks) { play(gm.kicks[n - 1]); shownKicks = n; } const c = curOf(gm); if (c.shot && c.dive != null) resolve(gm); ui(); });
  S.loop((dt, W, H) => {
    const x = S.x, q = geo();
    const sky = x.createLinearGradient(0, 0, 0, H * .5); sky.addColorStop(0, '#0a1838'); sky.addColorStop(1, '#22437e'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
    for (let r = 0; r < 5; r++) for (let i = 0; i < 70; i++) { x.fillStyle = `hsl(${(i * 47 + r * 13) % 360} 40% ${24 + r * 5}%)`; x.beginPath(); x.arc((i + .5 + (r % 2) * .5) / 70 * W, H * (.03 + r * .028) + Math.sin(performance.now() / 300 + i + r) * .8, W / 190, 0, 7); x.fill(); }
    x.fillStyle = '#e9ecf5'; x.fillRect(0, H * .17, W, 4); const gr = x.createLinearGradient(0, H * .17, 0, H); gr.addColorStop(0, '#2f8a3f'); gr.addColorStop(1, '#45b056'); x.fillStyle = gr; x.fillRect(0, H * .17 + 4, W, H); for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; x.fillRect(0, H * (.17 + i * .093), W, H * .093); }
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 3; x.beginPath(); x.moveTo(W * .05, q.gt + q.gh); x.lineTo(W * .95, q.gt + q.gh); x.stroke(); x.beginPath(); x.moveTo(q.gl - q.gw * .25, q.gt + q.gh); x.lineTo(q.gl - q.gw * .45, H * .62); x.lineTo(q.gl + q.gw * 1.45, H * .62); x.lineTo(q.gl + q.gw * 1.25, q.gt + q.gh); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(q.bx, q.by + 6, 8, 3, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = 1; for (let i = 0; i <= 24; i++) { x.beginPath(); x.moveTo(q.gl + q.gw * i / 24, q.gt); x.lineTo(q.gl + q.gw * i / 24, q.gt + q.gh); x.stroke(); } for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(q.gl, q.gt + q.gh * i / 8); x.lineTo(q.gl + q.gw, q.gt + q.gh * i / 8); x.stroke(); }
    x.strokeStyle = '#fff'; x.lineWidth = 9; x.lineJoin = 'round'; x.beginPath(); x.moveTo(q.gl, q.gt + q.gh); x.lineTo(q.gl, q.gt); x.lineTo(q.gl + q.gw, q.gt); x.lineTo(q.gl + q.gw, q.gt + q.gh); x.stroke();
    // keeper + ball (animated on a kick)
    let kx = q.gl + q.gw / 2, kd = 0, ky = 0, bx = q.bx, by = q.by, bs = 1;
    if (anim) { anim.t += dt; const t = Math.min(1, anim.t / .65), k = anim.k, [dx, dy] = ZONES[k.dive] || [0, 0]; const tx = q.gl + q.gw / 2 + k.shot.x * q.gw / 2, ty = q.gt + q.gh - k.shot.y * q.gh; bx = lerp(q.bx, tx, t); by = lerp(q.by, ty, t) - Math.sin(t * Math.PI) * 40; bs = lerp(1, .45, t); const kt = clamp((anim.t - .12) / .4, 0, 1); kx += dx * q.gw * .3 * kt; kd = dx * kt * 1.1; ky = -dy * q.gh * .35 * kt;
      if (anim.t > .65 && !anim.done) { anim.done = true; const r = penResult(k.shot, k.dive); S.toast(k.goal ? '⚽ ' + r.why : r.why === 'Saved!' ? '🧤 Saved!' : '😬 ' + r.why, 1400); if (k.goal) { SFX.win(); for (let i = 0; i < 3; i++) P.add(tx, ty, 30, () => pick(['#fff', '#ffd23f', '#7bf0b8']), 6, 60, 3); } else SFX.lose(); }
      if (anim.t > 2) { anim = null; ui(); } }
    x.save(); x.translate(kx, q.gt + q.gh + ky); x.rotate(kd); const ks = q.gh / 95; x.scale(ks, ks); x.fillStyle = '#ffcf33'; rr(x, -16, -80, 32, 50, 10); x.fill(); x.fillStyle = '#1b1b2a'; x.fillRect(-14, -32, 12, 32); x.fillRect(2, -32, 12, 32); x.fillStyle = '#e8c3a0'; x.beginPath(); x.arc(0, -92, 12, 0, 7); x.fill(); x.strokeStyle = '#ffcf33'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(-14, -74); x.lineTo(-36, -96); x.moveTo(14, -74); x.lineTo(36, -96); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(-38, -98, 7, 0, 7); x.arc(38, -98, 7, 0, 7); x.fill(); x.restore();
    const r = 15 * bs * Math.min(1.4, W / 600 + .6); x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(bx, by + r, r, r * .35, 0, 0, 7); x.fill(); const bgd = x.createRadialGradient(bx - r * .3, by - r * .3, 1, bx, by, r); bgd.addColorStop(0, '#fff'); bgd.addColorStop(1, '#cfd3dc'); x.fillStyle = bgd; x.beginPath(); x.arc(bx, by, r, 0, 7); x.fill(); x.fillStyle = '#1b1b2a'; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + (anim ? anim.t * 20 : 0); x.beginPath(); x.arc(bx + Math.cos(a) * r * .55, by + Math.sin(a) * r * .55, r * .2, 0, 7); x.fill(); }
    if (drag && aim) { const dx = aim.x - drag.x, dy = aim.y - drag.y; x.setLineDash([8, 8]); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 3; x.beginPath(); x.moveTo(q.bx, q.by); x.lineTo(q.bx + dx * 1.6, q.by + dy * 1.25); x.stroke(); x.setLineDash([]); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(q.bx + dx * 1.6, q.by + dy * 1.25, 9, 0, 7); x.fill(); }
    P.step(x, .15);
  });
  ui();
  return S;
}

// ======================================================================
// CRICKET — a 2-over match. Bowler picks line, length and pace; batter times the swing. Then swap.
// ======================================================================
const LINES = ['Off', 'Middle', 'Leg'], LENS = ['Yorker', 'Good', 'Short'], PACE = ['Fast', 'Spin'];
export function crkOutcome(d, s) { // d {l:0-2,n:0-2,p:0-1}  s {shot:0-3 (defend/drive/pull/loft), err: seconds early(-)/late(+)}
  const e = Math.abs(s.err), good = e < .045, ok = e < .1, miss = e > .17;
  const matchup = [[3, 2, 0], [1, 3, 1], [0, 1, 3], [1, 2, 2]][s.shot][d.n]; // how well the shot suits the length (0 bad … 3 great)
  const seed = Math.abs(Math.sin((d.l + 1) * 12.9898 + (d.n + 1) * 78.233 + s.err * 1e3)) % 1;
  if (miss) return (d.l === 1 || d.n === 0) && seed < .7 ? { r: 'W', how: 'Bowled!' } : { r: 0, how: 'Beaten!' };
  if (s.shot === 0) return good ? { r: 1, how: 'Pushed for one' } : { r: 0, how: 'Solid defence' };
  if (s.shot === 3) { if (good && matchup >= 2) return { r: 6, how: 'SIX! Into the crowd' }; if (ok && seed > .55) return { r: 4, how: 'Lofted for four' }; return seed < .5 ? { r: 'W', how: 'Caught in the deep!' } : { r: 2, how: 'Top edge, two runs' }; }
  if (good && matchup >= 2) return seed > .35 ? { r: 4, how: 'FOUR! Cracking shot' } : { r: 6, how: 'SIX! Huge hit' };
  if (good) return { r: 2, how: 'Placed for two' };
  if (ok) return matchup >= 2 ? { r: 1, how: 'Quick single' } : seed < .3 ? { r: 'W', how: 'Edged and caught!' } : { r: 0, how: 'Dot ball' };
  return seed < .25 ? { r: 'W', how: 'LBW!' } : { r: 0, how: 'Dot ball' };
}
export function cricket(api) {
  const vsAI = !!api.ai, BALLS = 12, WK = 3;
  const S = shell('Cricket', '🏏', () => { unsub && unsub(); api.onClose && api.onClose(); });
  let g = api.get(), unsub = null, anim = null, swing = null, shot = 1, P = Parts(), shown = 0;
  const inn = gm => gm.inn || [{ bat: gm.a, balls: [] }];
  const nBalls = gm => inn(gm).reduce((a, x) => a + x.balls.length, 0), curC = gm => ((gm.cs || {})[nBalls(gm)] || {});
  const curInn = gm => { const I = inn(gm); return I[I.length - 1]; };
  const total = I => I.balls.reduce((a, b) => a + (b.r === 'W' ? 0 : b.r), 0), wk = I => I.balls.filter(b => b.r === 'W').length;
  const over = (I, gm, idx) => I.balls.length >= BALLS || wk(I) >= WK || (idx === 1 && total(I) > total(inn(gm)[0]));
  const bowler = gm => { const I = curInn(gm); return I.bat === gm.a ? gm.b : gm.a; };
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const hint = t => S.stage.insertAdjacentHTML('beforeend', `<div class="g-gl sp-hint">${t}</div>`);
  async function resolve(gm) {
    const I = inn(gm), idx = I.length - 1, c = curC(gm); if (!c.d || !c.s || gm.win) return;
    const res = crkOutcome(c.d, c.s); const balls = [...I[idx].balls, { d: c.d, s: c.s, r: res.r }]; const I2 = I.map((x, i) => i === idx ? { ...x, balls } : x);
    let patch = { 'game.inn': I2 };
    if (over(I2[idx], { ...gm, inn: I2 }, idx)) { if (idx === 0) patch['game.inn'] = [...I2, { bat: I2[0].bat === gm.a ? gm.b : gm.a, balls: [] }]; else { const a = total(I2[0]), b = total(I2[1]); patch['game.win'] = a === b ? 'tie' : a > b ? I2[0].bat : I2[1].bat; } }
    await api.update(patch);
  }
  function ui() {
    const gm = g; S.root.querySelectorAll('.sp-zones,.sp-hint,.sp-crk').forEach(e => e.remove());
    if (!gm.b) { S.stat(''); return hint(gm.a === api.me ? 'Waiting for a friend to join…' : 'Tap Join in the chat'); }
    const I = inn(gm), A = I[0], B = I[1];
    S.stat(`🏏 ${esc(api.name(A.bat).split(' ')[0])} ${total(A)}/${wk(A)} (${Math.floor(A.balls.length / 6)}.${A.balls.length % 6})${B ? ` · ${esc(api.name(B.bat).split(' ')[0])} ${total(B)}/${wk(B)} (${Math.floor(B.balls.length / 6)}.${B.balls.length % 6}) · need ${Math.max(0, total(A) + 1 - total(B))}` : ''}`);
    if (gm.win) return hint(gm.win === 'tie' ? '🤝 It’s a tie!' : `🏆 ${gm.win === api.me ? 'You win!' : esc(api.name(gm.win)) + ' wins!'}`);
    if (anim) return;
    const c = curC(gm), bat = curInn(gm).bat, bwl = bowler(gm);
    if (bwl === api.me) { if (c.d) hint('⏳ Ball bowled — waiting for the batter'); else pickDelivery(); }
    else if (bat === api.me) { if (!c.d) hint(`⏳ ${esc(api.name(bwl))} is running in…`); else if (!c.s) readyToBat(c.d); }
  }
  function pickDelivery() {
    const sel = { l: 1, n: 1, p: 0 };
    S.stage.insertAdjacentHTML('beforeend', `<div class="g-gl g-card sp-crk" style="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:6;width:min(440px,94%);padding:16px"><b>Your ball 🎯</b><div style="display:grid;gap:8px;margin-top:10px">${[['l', LINES], ['n', LENS], ['p', PACE]].map(([k, arr]) => `<div class="sp-modes" style="grid-template-columns:repeat(${arr.length},1fr);margin:0">${arr.map((n, i) => `<button data-k="${k}" data-v="${i}" class="${sel[k] === i ? 'pri' : ''}" style="height:42px">${n}</button>`).join('')}</div>`).join('')}<button class="g-go" id="crk-bowl" style="margin-top:4px">Bowl</button></div></div>`);
    const box = S.stage.querySelector('.sp-crk'); box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { sel[b.dataset.k] = +b.dataset.v; box.querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach(z => z.classList.toggle('pri', z === b)); });
    box.querySelector('#crk-bowl').onclick = async () => { box.remove(); SFX.pop(); await api.update({ ['game.cs.' + nBalls(g) + '.d']: { ...sel } }); };
  }
  function readyToBat(d) {
    S.stage.insertAdjacentHTML('beforeend', `<div class="g-gl g-card sp-crk" style="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:6;width:min(440px,94%);padding:16px"><b>You’re batting 🏏</b><p style="margin:6px 0 10px">Pick a shot, press Face the ball, then tap (or press Space) right as the ball reaches you.</p><div class="sp-modes" style="grid-template-columns:repeat(4,1fr);margin:0">${['Defend', 'Drive', 'Pull', 'Loft'].map((n, i) => `<button data-s="${i}" class="${shot === i ? 'pri' : ''}" style="height:42px">${n}</button>`).join('')}</div><button class="g-go" id="crk-face">Face the ball</button></div>`);
    const box = S.stage.querySelector('.sp-crk'); box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { shot = +b.dataset.s; box.querySelectorAll('[data-s]').forEach(z => z.classList.toggle('pri', z === b)); });
    box.querySelector('#crk-face').onclick = () => { box.remove(); swing = { d, t: 0, hitAt: d.p ? 1.25 : .95, done: false }; hint('Tap when the ball reaches the bat!'); };
  }
  const doSwing = async () => { if (!swing || swing.done) return; swing.done = true; const err = +(swing.t - swing.hitAt).toFixed(3); tone(320, .05, 'square', .04); S.root.querySelectorAll('.sp-hint').forEach(e => e.remove()); const s = { shot, err }; const d = swing.d; setTimeout(() => { swing = null; }, 50); anim = { d, s, t: 0, res: crkOutcome(d, s) }; await api.update({ ['game.cs.' + nBalls(g) + '.s']: s }); };
  S.cv.addEventListener('pointerdown', () => doSwing());
  const kd = e => { if (e.code === 'Space') { e.preventDefault(); doSwing(); } }; document.addEventListener('keydown', kd);
  unsub = api.listen(gm => { if (!gm) return; const before = g; g = gm; const I = inn(gm), n = I.reduce((a, x) => a + x.balls.length, 0); if (n > shown) { const all = I.flatMap(x => x.balls), b = all[all.length - 1]; if (!anim) anim = { d: b.d, s: b.s, t: 0, res: crkOutcome(b.d, b.s) }; shown = n; } const c = curC(gm); if (c.d && c.s) resolve(gm); ui(); });
  shown = inn(g).reduce((a, x) => a + x.balls.length, 0);
  S.loop((dt, W, H) => {
    const x = S.x;
    const sky = x.createLinearGradient(0, 0, 0, H * .45); sky.addColorStop(0, '#3a7bd5'); sky.addColorStop(1, '#a8d4ff'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 60; i++) { x.fillStyle = `hsl(${(i * 53 + r * 17) % 360} 45% ${35 + r * 6}%)`; x.beginPath(); x.arc((i + .5 + (r % 2) * .5) / 60 * W, H * (.24 + r * .03), W / 170, 0, 7); x.fill(); }
    x.fillStyle = '#d9dee8'; x.fillRect(0, H * .35, W, 5);
    const gg = x.createLinearGradient(0, H * .35, 0, H); gg.addColorStop(0, '#3c9a46'); gg.addColorStop(1, '#58b85f'); x.fillStyle = gg; x.fillRect(0, H * .35 + 5, W, H);
    // pitch strip in perspective
    const top = H * .42, bot = H * 1.02, tw = W * .07, bw = W * .34; x.fillStyle = '#d8c48f'; x.beginPath(); x.moveTo(W / 2 - tw, top); x.lineTo(W / 2 + tw, top); x.lineTo(W / 2 + bw, bot); x.lineTo(W / 2 - bw, bot); x.fill(); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 2; const cr = y => { const k = (y - top) / (bot - top); return [W / 2 - lerp(tw, bw, k) * .95, W / 2 + lerp(tw, bw, k) * .95]; }; for (const yy of [top + (bot - top) * .07, top + (bot - top) * .78]) { const [a, b] = cr(yy); x.beginPath(); x.moveTo(a, yy); x.lineTo(b, yy); x.stroke(); }
    // stumps (far = bowler end, near = batter)
    const stumps = (yy, sc, fall) => { for (let i = -1; i <= 1; i++) { x.save(); x.translate(W / 2 + i * 7 * sc, yy); x.rotate(fall ? i * .5 + .3 : 0); x.fillStyle = '#f3e3b8'; x.fillRect(-2 * sc, -48 * sc, 4 * sc, 48 * sc); x.restore(); } x.fillStyle = '#c9a04a'; if (!fall) x.fillRect(W / 2 - 10 * sc, yy - 50 * sc, 20 * sc, 3 * sc); };
    stumps(top + (bot - top) * .05, .55, false);
    // ball flight
    const nearY = top + (bot - top) * .8; let bx = W / 2, by = top + (bot - top) * .1, br = 4, bowled = false;
    const run = swing || anim; if (run) { if (swing) swing.t += dt; if (anim) anim.t += dt; const d = run.d, T = d.p ? 1.25 : .95, t = (swing ? swing.t : anim.t) / T; const bounceK = [.92, .7, .45][d.n], lx = [-.55, 0, .55][d.l] * W * .05;
      if (t <= 1.05) { const k = Math.min(t, 1.05), yb = lerp(top + (bot - top) * .1, nearY, k); bx = W / 2 + lx * k * 2 + (d.p ? Math.sin(k * 3) * 6 : 0); const h = k < bounceK ? Math.sin(k / bounceK * Math.PI) * 60 * (d.n === 2 ? 1.6 : 1) : Math.sin((k - bounceK) / (1 - bounceK) * Math.PI / 2) * (d.n === 2 ? 70 : 28); by = yb - h; br = lerp(3, 11, k); x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(bx, yb, br, br * .35, 0, 0, 7); x.fill(); }
      if (swing && t > 1.45 && !swing.done) doSwing();
      if (anim && anim.t > T) { const res = anim.res, k2 = (anim.t - T) / 1.2; if (res.r === 'W' && /Bowled|LBW/.test(res.how)) bowled = true; else if (res.r !== 0 && res.r !== 'W' || /Caught/.test(res.how)) { const dir = [[-.2, -1], [.1, -1], [-.9, -.4], [.4, -1.2]][anim.s.shot]; bx = W / 2 + dir[0] * W * .6 * k2; by = nearY + dir[1] * H * .7 * k2 - Math.sin(Math.min(1, k2) * Math.PI) * (res.r === 6 ? 180 : 60); br = lerp(11, 3, Math.min(1, k2)); } else { bx = W / 2 + 30; by = nearY + 10; br = 10; }
        if (!anim.done) { anim.done = true; const r = res.r; S.toast((r === 'W' ? '☝️ ' : r === 6 ? '💥 ' : r === 4 ? '🔥 ' : '') + res.how + (r !== 'W' ? ` (${r})` : ''), 1800); if (r === 'W') { SFX.lose(); S.shake(6); } else if (r >= 4) { SFX.win(); for (let i = 0; i < 2; i++) P.add(W / 2, H * .4, 30, () => pick(['#fff', '#ffd23f', '#5ab0ff']), 6, 60, 3); } else SFX.pop(); }
        if (anim.t > T + 2.2) { anim = null; ui(); } } }
    // batter
    const sc = 1.25; x.save(); x.translate(W / 2 - 46, nearY); x.scale(sc, sc); x.fillStyle = '#f5f5f8'; rr(x, -12, -70, 24, 42, 8); x.fill(); x.fillStyle = '#1d3b8f'; x.beginPath(); x.arc(0, -82, 11, 0, 7); x.fill(); x.fillStyle = '#e8c3a0'; x.fillRect(-6, -80, 12, 9); x.fillStyle = '#f5f5f8'; x.fillRect(-11, -28, 9, 28); x.fillRect(2, -28, 9, 28);
    const sw = anim && anim.t > (anim.d.p ? 1.25 : .95) - .12 ? Math.min(1, (anim.t - ((anim.d.p ? 1.25 : .95) - .12)) / .18) : 0; x.save(); x.translate(10, -50); x.rotate(-1.9 + sw * 2.6); x.fillStyle = '#d7b779'; rr(x, -4, 0, 9, 46, 3); x.fill(); x.fillStyle = '#333'; x.fillRect(-3, -14, 7, 16); x.restore(); x.restore();
    stumps(nearY + 4, 1, bowled);
    if (by < H) { const bg = x.createRadialGradient(bx - br * .3, by - br * .3, 1, bx, by, br); bg.addColorStop(0, '#ff8a8a'); bg.addColorStop(1, '#b3121f'); x.fillStyle = bg; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill(); }
    P.step(x, .15);
  });
  const _close = S.close; S.close = () => { document.removeEventListener('keydown', kd); _close(); };
  ui();
  return S;
}

// ---------------------------------------------------------------- a pretend friend for practice (works offline)
export function aiApi(kind, me = 'me', onClose) {
  let game = kind === 'pen' ? { t: 'pen', a: me, b: 'nexa', kicks: [], cs: {} } : { t: 'crk', a: me, b: 'nexa', inn: [{ bat: me, balls: [] }], cs: {} };
  const subs = new Set(), copy = () => JSON.parse(JSON.stringify(game));
  const set = (path, v) => { const ks = path.split('.').slice(1); let o = game; ks.slice(0, -1).forEach(k => { o[k] = o[k] && typeof o[k] === 'object' ? { ...o[k] } : {}; o = o[k]; }); o[ks[ks.length - 1]] = v; };
  const emit = () => { const snap = copy(); subs.forEach(f => f(snap)); clearTimeout(emit.t); emit.t = setTimeout(think, 700); };
  function think() {
    const g = game; if (g.win) return;
    if (kind === 'pen') { const n = (g.kicks || []).length, c = (g.cs || {})[n] || {}, shooter = n % 2 === 0 ? g.a : g.b;
      if (shooter === 'nexa' && !c.shot) return api.update({ ['game.cs.' + n + '.shot']: { x: +rnd(-.95, .95).toFixed(2), y: +rnd(.05, .9).toFixed(2), p: +rnd(.45, .95).toFixed(2) } });
      if (shooter !== 'nexa' && c.shot && c.dive == null) return api.update({ ['game.cs.' + n + '.dive']: (Math.random() * 6) | 0 }); }
    else { const I = g.inn[g.inn.length - 1], n = g.inn.reduce((a, x) => a + x.balls.length, 0), c = (g.cs || {})[n] || {}, bowler = I.bat === g.a ? g.b : g.a;
      if (bowler === 'nexa' && !c.d) return api.update({ ['game.cs.' + n + '.d']: { l: (Math.random() * 3) | 0, n: (Math.random() * 3) | 0, p: Math.random() < .35 ? 1 : 0 } });
      if (I.bat === 'nexa' && c.d && !c.s) return api.update({ ['game.cs.' + n + '.s']: { shot: (Math.random() * 4) | 0, err: +rnd(-.13, .13).toFixed(3) } }); }
  }
  const api = { me, ai: true, name: u => u === 'nexa' ? 'Nexa' : 'You', get: copy, listen(f) { subs.add(f); setTimeout(() => f(copy()), 0); setTimeout(think, 900); return () => subs.delete(f); }, async update(patch) { for (const [k, v] of Object.entries(patch)) set(k, v); emit(); }, onClose };
  return api;
}

export function footballMenu(opts = {}) {
  const S = shell('Football', '⚽', () => {});
  S.card(`<div class="g-em">⚽</div><h2>Football</h2><p>A full 5-a-side match with real ball physics, passing, tackles, keepers and a crowd.</p><div class="sp-modes"><button class="pri" data-m="ai">Play vs Nexa</button><button data-m="local">2 players on this device</button></div><p style="margin-top:12px;font-size:13px">Play a friend online: open your chat with them › + › Fun › Football match.</p>`, o => o.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { S.close(); football({ ...opts, mode: b.dataset.m, names: b.dataset.m === 'ai' ? ['You', 'Nexa'] : ['Blue', 'Red'] }); }));
  return S;
}
export { linkUp };
