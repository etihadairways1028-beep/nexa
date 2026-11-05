/* Nexa Liquid Glass 4 — one shared look + motion layer for every Nexa website.
   Add it with: <script src="/glass4.js" data-lens=".card,.panel" data-light=".card,.btn" data-reveal=".card"></script>
   - smooth, calm motion (no wobbly squash, no bouncing modals)
   - light that follows the mouse across glass
   - real lens edges on glass (Chrome/Edge on computers), plain frosted glass everywhere else
   - things slide in softly as you scroll
   - faster backgrounds on every device */
(() => {
  if (window.NexaGlass4) return;
  const d = document, R = d.documentElement, me = d.currentScript;
  const mm = q => { try { return matchMedia(q).matches; } catch { return false; } };
  const reduce = mm('(prefers-reduced-motion: reduce)');
  const lite = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const fine = mm('(hover: hover) and (pointer: fine)');
  R.classList.add('g4'); if (lite) R.classList.add('g4-lite'); if (reduce) R.classList.add('g4-still');

  const CSS = `
:root{--g4-out:cubic-bezier(.16,1,.3,1);--g4-soft:cubic-bezier(.33,1,.68,1);--g4-spring:cubic-bezier(.3,1.12,.5,1)}
@supports (transition-timing-function:linear(0,1)){:root{--g4-spring:linear(0,.006,.025 2.8%,.101 6.1%,.539 18.9%,.721 25.3%,.849 31.5%,.937 38.1%,.968 41.8%,.991 45.7%,1.006 50.1%,1.015 55%,1.017 63.9%,1.001 85.9%,1)}}
/* backgrounds: the colour blobs are already soft gradients, so no live blur (this was the main cause of lag) */
.g4 :is(.aurora i,.sx-bg i,.k-bg i:nth-child(-n+3),.g4-blob){filter:none!important;will-change:transform;animation-name:g4drift!important;animation-timing-function:ease-in-out!important;animation-iteration-count:infinite!important;animation-direction:alternate!important}
@keyframes g4drift{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(4vmax,3vmax,0) scale(1.08)}}
.g4-lite :is(.aurora i,.sx-bg i,.k-bg i,.k-bg b,.g4-blob),.g4-still :is(.aurora i,.sx-bg i,.k-bg i,.k-bg b,.g4-blob){animation:none!important}
/* buttons: lift a little on hover, press down evenly (no squash), settle with a soft spring */
.g4 :is(.btn,.k-btn,.chip,.pill,.k-pill,.k-navb,.sx-btn,.ibtn,.g4-press):not(:disabled){transition:transform .55s var(--g4-spring),background-color .25s var(--g4-soft),border-color .25s var(--g4-soft),color .25s var(--g4-soft),opacity .25s var(--g4-soft)}
@media (hover:hover){.g4 :is(.btn,.k-btn,.chip,.pill,.k-pill,.sx-btn):not(:disabled):hover{transform:translateY(-1px)}}
.g4 :is(.btn,.k-btn,.chip,.pill,.k-pill,.k-navb,.sx-btn,.ibtn,.g4-press):not(:disabled):active{transform:scale(.965)!important;transition:transform .12s var(--g4-out)!important}
/* cards: float up gently */
.g4 :is(.g4-card){transition:transform .6s var(--g4-spring)}
@media (hover:hover){.g4 .g4-card:hover{transform:translateY(-3px)}}
/* scroll-in */
.g4 .g4-r{opacity:0;transform:translateY(16px) scale(.985);transition:opacity .7s var(--g4-out),transform .9s var(--g4-out);transition-delay:calc(var(--g4-i,0) * 55ms)}
.g4 .g4-r.g4-in{opacity:1;transform:none}
.g4-still .g4-r{opacity:1!important;transform:none!important;transition:none!important}
/* glass rim: catches more light when you point at it */
.g4 .g4-rim{position:relative}
.g4 .g4-rim::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:linear-gradient(150deg,rgba(255,255,255,.75),rgba(255,255,255,.1) 28%,rgba(255,255,255,0) 52%,rgba(150,180,255,.35) 78%,rgba(255,150,210,.6));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.7;transition:opacity .5s var(--g4-soft)}
@media (hover:hover){.g4 .g4-rim:hover::before{opacity:1}}
/* light that follows the mouse */
.g4 .g4-lit{background-image:radial-gradient(280px circle at var(--mx,-999px) var(--my,-999px),rgba(255,255,255,.10),rgba(255,255,255,.025) 45%,transparent 70%)}
/* focus rings that glow instead of a hard outline */
.g4 :focus-visible{outline:2px solid rgba(170,178,255,.95)!important;outline-offset:3px;transition:outline-offset .25s var(--g4-out)}
/* glassy scrollbars + selection */
.g4 ::selection{background:rgba(140,151,255,.4)}
.g4 *{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.22) transparent}
.g4 ::-webkit-scrollbar{width:10px;height:10px}.g4 ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:99px;border:3px solid transparent;background-clip:padding-box}.g4 ::-webkit-scrollbar-thumb:hover{background-color:rgba(255,255,255,.3)}.g4 ::-webkit-scrollbar-track{background:transparent}
/* real lens edges (Chrome/Edge on computers) */
.g4-lens [data-g4lens]{backdrop-filter:var(--g4lens,none) blur(var(--g4blur,16px)) saturate(180%) brightness(1.05)!important;-webkit-backdrop-filter:blur(var(--g4blur,16px)) saturate(180%)!important}
@media (prefers-reduced-motion:reduce){.g4 *{transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
`;
  d.head.insertAdjacentHTML('beforeend', '<style id="g4css">' + CSS + '</style>');

  const cfg = { lens: '', light: '', reveal: '', card: '', rim: '' };
  const q = s => { try { return s ? [...d.querySelectorAll(s)] : []; } catch { return []; } };

  // ---- light that follows the mouse
  if (fine) {
    let el = null, raf = 0, x = 0, y = 0;
    addEventListener('pointermove', e => {
      const t = cfg.light && e.target.closest ? e.target.closest(cfg.light) : null;
      if (t !== el) { el && (el.style.removeProperty('--mx'), el.style.removeProperty('--my')); el = t; }
      x = e.clientX; y = e.clientY;
      if (el && !raf) raf = requestAnimationFrame(() => { raf = 0; if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (x - r.left) + 'px'); el.style.setProperty('--my', (y - r.top) + 'px'); });
    }, { passive: true });
  }

  // ---- scroll-in
  const io = !reduce && 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const el = e.target; el.classList.add('g4-in'); io.unobserve(el); setTimeout(() => { el.classList.remove('g4-r', 'g4-in'); el.style.removeProperty('--g4-i'); }, 1300); } }), { rootMargin: '0px 0px -6% 0px' }) : null;
  const seen = new WeakSet();
  const tag = () => {
    q(cfg.card).forEach(el => el.classList.add('g4-card'));
    q(cfg.rim).forEach(el => el.classList.add('g4-rim'));
    if (!io) return;
    const groups = new Map();
    q(cfg.reveal).forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * .92 && r.bottom > 0 && d.readyState !== 'loading' && performance.now() > 1500) return; // already on screen after load: don't hide it
      const p = el.parentElement, i = groups.get(p) || 0; groups.set(p, i + 1);
      el.style.setProperty('--g4-i', Math.min(i, 6)); el.classList.add('g4-r'); io.observe(el);
    });
  };

  // ---- real liquid-glass lens: the edges bend what's behind (same idea as Nexa Studio / Dev Hub)
  const lensOK = /Chrome|Edg\//.test(navigator.userAgent) && !/Mobile|Android/.test(navigator.userAgent) && fine && !reduce && !lite;
  let defs = null, n = 0; const cache = new Map(), done = new WeakMap(), ro = lensOK && 'ResizeObserver' in window ? new ResizeObserver(es => es.forEach(e => lens(e.target))) : null;
  function lens(el) {
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight); if (w < 60 || h < 40 || w * h > 2.2e6) return;
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 20, h / 2, w / 2), band = Math.min(32, Math.max(12, Math.min(w, h) * .3));
    const key = w + 'x' + h + 'r' + Math.round(r); if (done.get(el) === key) return; done.set(el, key);
    const hit = cache.get(key); if (hit) { cache.delete(key); cache.set(key, hit); el.style.setProperty('--g4lens', `url(#${hit})`); return; }
    const c = d.createElement('canvas'), sc = .5; c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc);
    const x = c.getContext('2d'), im = x.createImageData(c.width, c.height), px = im.data;
    for (let jj = 0; jj < c.height; jj++) for (let ii = 0; ii < c.width; ii++) {
      const i2 = ii / sc, j2 = jj / sc, cx0 = Math.min(Math.max(i2, r), w - r), cy0 = Math.min(Math.max(j2, r), h - r); let nx = 0, ny = 0, dist;
      if ((i2 < r || i2 > w - r) && (j2 < r || j2 > h - r)) { const dx = i2 - cx0, dy = j2 - cy0, L = Math.hypot(dx, dy) || 1; dist = r - L; nx = dx / L; ny = dy / L; }
      else { const m = Math.min(i2, w - i2, j2, h - j2); dist = m; nx = m === i2 ? -1 : m === w - i2 ? 1 : 0; ny = m === j2 ? -1 : m === h - j2 ? 1 : 0; }
      const k = Math.max(0, 1 - dist / band), s3 = k * k * k, p = (jj * c.width + ii) * 4; px[p] = 128 + nx * s3 * 127; px[p + 1] = 128 + ny * s3 * 127; px[p + 2] = 128; px[p + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    if (!defs) { defs = d.createElementNS('http://www.w3.org/2000/svg', 'svg'); defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.setAttribute('aria-hidden', 'true'); defs.style.cssText = 'position:absolute;width:0;height:0'; d.body.append(defs); }
    const id = 'g4lens' + (n++), amt = Math.min(56, band * 2);
    const ch = (s, m, res) => `<feDisplacementMap in="SourceGraphic" in2="m" scale="${s}" xChannelSelector="R" yChannelSelector="G" result="${res}d"/><feColorMatrix in="${res}d" type="matrix" values="${m}" result="${res}"/>`;
    defs.insertAdjacentHTML('beforeend', `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage href="${c.toDataURL()}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>${ch(amt, '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', 'R')}${ch(amt * 1.08, '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', 'G')}${ch(amt * 1.16, '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0', 'B')}<feBlend in="R" in2="G" mode="screen" result="RG"/><feBlend in="RG" in2="B" mode="screen"/></filter>`);
    cache.set(key, id); if (cache.size > 48) { const [k0, id0] = cache.entries().next().value; cache.delete(k0); d.getElementById(id0)?.remove(); }
    el.style.setProperty('--g4lens', `url(#${id})`);
  }
  const watched = new Set();
  const scanLens = () => { if (!ro) return; watched.forEach(el => { if (!el.isConnected) { ro.unobserve(el); watched.delete(el); } }); q(cfg.lens).forEach(el => { if (!el.dataset.g4lens) { el.dataset.g4lens = 1; ro.observe(el); watched.add(el); } }); };

  let t = 0;
  const scan = () => { tag(); scanLens(); };
  const init = (o = {}) => {
    Object.assign(cfg, o); if (lensOK && cfg.lens) R.classList.add('g4-lens');
    const go = () => { scan(); new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 120); }).observe(d.body, { childList: true, subtree: true }); };
    d.body ? go() : d.addEventListener('DOMContentLoaded', go);
  };
  window.NexaGlass4 = { init, scan };
  if (me && me.dataset && (me.dataset.lens || me.dataset.light || me.dataset.reveal || me.dataset.card)) {
    const ds = me.dataset; const o = { lens: ds.lens || '', light: ds.light || '', reveal: ds.reveal || '', card: ds.card || '', rim: ds.rim || '' };
    d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', () => init(o)) : init(o);
  }
})();
