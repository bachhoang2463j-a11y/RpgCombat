// ==========================================
// L3/L4 屏幕主演出（视口宿主，iframe 内地图视口上层；不挂世界坐标）
// 每个全屏条目一套独立 SVG 构图：蓄势（四周向内聚拢）→ 爆发（条目真实冲击拍点调用）→ 降透明（首个结果揭示）→ 余韵外撤。
// 构图纪律：主体集中在外缘 ~30% 环带，中心保留战场阅读窗口；爆发帧允许半透明穿屏元素 ≤ 450ms；
// 纯渐变 + 羽化辉光（feGaussianBlur/feMerge），无硬边线框；所有 id 带 uid；只动 transform/opacity/stroke-dashoffset。
// viewBox 1600×900，preserveAspectRatio=slice：任意视口比例下铺满，边缘元素贴边。
// ==========================================

const W = 1600, H = 900, CX = 800, CY = 450;
const TAU = Math.PI * 2;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const f1 = n => (+n).toFixed(1);
// 变换锚点：view-box 坐标系下的绝对像素原点
const org = (x, y) => 'transform-box:view-box;transform-origin:' + f1(x) + 'px ' + f1(y) + 'px;';
const box = 'transform-box:fill-box;transform-origin:50% 50%;';

function defs(u, extra = '') {
  return '<defs>' +
    '<filter id="g' + u + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '<filter id="s' + u + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>' +
    '<filter id="t' + u + '" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="' + (u % 97) + '"/><feDisplacementMap in="SourceGraphic" scale="46"/></filter>' +
    extra + '</defs>';
}
const rad = (id, stops, cx = '50%', cy = '50%', r = '50%') => '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '">' + stops + '</radialGradient>';
const lin = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stops + '</linearGradient>';
const st = (o, c, a = 1) => '<stop offset="' + o + '" stop-color="' + c + '" stop-opacity="' + a + '"/>';
const draw = (d, stroke, w, k, extra = '') => '<path data-k="' + k + '" d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" ' + extra + '/>';
// 锯齿分形闪电/裂纹路径
function jag(r, x0, y0, x1, y1, n = 9, amp = 40) {
  let d = 'M' + f1(x0) + ',' + f1(y0);
  const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < n; i++) {
    const t = i / n, o = (r() - 0.5) * amp * (1 - Math.abs(t - 0.5));
    d += ' L' + f1(x0 + (x1 - x0) * t + nx / L * o) + ',' + f1(y0 + (y1 - y0) * t + ny / L * o);
  }
  return d + ' L' + f1(x1) + ',' + f1(y1);
}
// 屏幕边缘点（t∈[0,1) 顺时针绕周长）
function edgePt(t) {
  const p = (t % 1) * 2 * (W + H);
  if (p < W) return { x: p, y: 0 };
  if (p < W + H) return { x: W, y: p - W };
  if (p < 2 * W + H) return { x: 2 * W + H - p, y: H };
  return { x: 0, y: 2 * (W + H) - p };
}
const toward = (p, k) => ({ x: p.x + (CX - p.x) * k, y: p.y + (CY - p.y) * k });
const orb = (x, y, r, fill, k, extra = '') => '<circle data-k="' + k + '" cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="' + fill + '" ' + extra + '/>';

// 动画工具：返回 Animation；all(k, fn) 对同键全部元素逐个调用
function tools(root) {
  const q = k => [...root.querySelectorAll('[data-k="' + k + '"]')];
  const a = (el, frames, ms, o = {}) => el.animate(frames, Object.assign({ duration: ms, fill: 'forwards', easing: 'cubic-bezier(0.3,0.7,0.2,1)' }, o));
  const all = (k, fn) => q(k).forEach((el, i, arr) => fn(el, i, arr.length));
  const drawIn = (k, ms, stagger = 0, o = {}) => all(k, (el, i) => a(el, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], ms, Object.assign({ delay: i * stagger }, o)));
  const fade = (k, from, to, ms, o = {}) => all(k, (el, i) => a(el, [{ opacity: from }, { opacity: to }], ms, o));
  return { q, a, all, drawIn, fade };
}

// ---------- 18 套构图 ----------
export const SHOWPIECES = {
  // 压缩爆燃：四角炽焰涡旋回卷 → 火环冲击 + 热浪扭曲 → 余烬上浮
  'fire-blast': {
    build(u, r) {
      const vort = [[0, 0], [W, 0], [W, H], [0, H]].map(([x, y], i) => {
        let d = ''; for (let k = 0; k <= 60; k++) { const t = k / 60, a = i * 1.57 + t * 9.5, rr = 260 * (1 - t) + 20; d += (k ? ' L' : 'M') + f1(x + Math.cos(a) * rr) + ',' + f1(y + Math.sin(a) * rr); }
        return '<g style="' + org(x, y) + '" data-k="vg"><path d="' + d + '" fill="none" stroke="url(#fl' + u + ')" stroke-width="14" stroke-linecap="round" filter="url(#t' + u + ')" opacity=".7"/><path d="' + d + '" fill="none" stroke="#fff7d6" stroke-width="5" filter="url(#g' + u + ')" opacity=".9"/></g>';
      }).join('');
      const tongues = Array.from({ length: 22 }, (_, i) => { const p = edgePt(i / 22 + r() * 0.015), q = toward(p, 0.14 + r() * 0.1); const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, w = 22 + r() * 26, bend = (r() - 0.5) * 0.6;
        const d = 'M' + f1(p.x + nx * w) + ',' + f1(p.y + ny * w) + ' Q' + f1(p.x + dx * .55 + nx * w * (.6 + bend)) + ',' + f1(p.y + dy * .55 + ny * w * (.6 + bend)) + ' ' + f1(q.x) + ',' + f1(q.y) + ' Q' + f1(p.x + dx * .5 - nx * w * (.5 - bend)) + ',' + f1(p.y + dy * .5 - ny * w * (.5 - bend)) + ' ' + f1(p.x - nx * w) + ',' + f1(p.y - ny * w) + 'Z';
        return '<path data-k="tg" d="' + d + '" fill="url(#ft' + u + ')" filter="url(#t' + u + ')" opacity="0" style="' + org(p.x, p.y) + '"/>'; }).join('');
      const embers = Array.from({ length: 26 }, () => orb(r() * W, H + 10, 3 + r() * 5, 'url(#em' + u + ')', 'em')).join('');
      return defs(u, lin('fl' + u, st(0, '#7c2d12', 0) + st(.35, '#ea580c') + st(.75, '#fbbf24') + st(1, '#fff7d6'), 0, 0, 1, 0) + rad('ft' + u, st(0, '#fff7d6', .95) + st(.3, '#fbbf24', .9) + st(.7, '#ea580c', .55) + st(1, '#7c2d12', 0), '50%', '50%', '70%') + rad('em' + u, st(0, '#fff7d6') + st(.5, '#fb923c') + st(1, '#7c2d12', 0)) + rad('hz' + u, st(0, '#fff7d6', .55) + st(.4, '#f97316', .3) + st(1, '#7c2d12', 0))) +
        vort + tongues + '<circle data-k="ring" cx="' + CX + '" cy="' + CY + '" r="120" fill="none" stroke="url(#fl' + u + ')" stroke-width="30" filter="url(#g' + u + ')" opacity="0" style="' + org(CX, CY) + '"/>' +
        '<rect data-k="haze" x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#hz' + u + ')" filter="url(#t' + u + ')" opacity="0"/>' + embers;
    },
    gather(T, ms) { T.all('vg', (el, i) => T.a(el, [{ transform: 'rotate(0deg) scale(.4)', opacity: 0 }, { transform: 'rotate(' + (i % 2 ? -140 : 140) + 'deg) scale(1)', opacity: 1 }], ms, { easing: 'cubic-bezier(.5,0,.8,.5)' })); T.all('tg', (el, i) => T.a(el, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.05)', opacity: .9, offset: .7 }, { transform: 'scale(.92)', opacity: .8 }], ms * .9, { delay: (i % 7) * 40, easing: 'cubic-bezier(.4,0,.6,1)' })); },
    burst(T) {
      T.all('vg', el => T.a(el, [{ opacity: 1 }, { transform: 'scale(1.25)', opacity: 0 }], 420));
      T.all('tg', el => T.a(el, [{ transform: 'scale(.92)', opacity: .8 }, { transform: 'scale(1.5)', opacity: 1, offset: .25 }, { transform: 'scale(.2)', opacity: 0 }], 420));
      T.all('ring', el => T.a(el, [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(7)', opacity: 0 }], 620, { easing: 'cubic-bezier(.1,.8,.3,1)' }));
      T.all('haze', el => T.a(el, [{ opacity: 0 }, { opacity: .8, offset: .15 }, { opacity: 0 }], 420));
    },
    linger(T) { T.all('em', (el, i) => T.a(el, [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: 'translate(' + ((i % 5) - 2) * 30 + 'px,-' + (220 + (i % 7) * 50) + 'px)', opacity: 0 }], 1100, { delay: (i % 9) * 40, easing: 'ease-out' })); },
  },

  // 浓雾：深渊雾潮自两侧涌入、触须于下角卷起 → 拉莱耶之眼睁开 → 雾退
  'abyss-fog': {
    blend: 'normal',
    build(u, r) {
      const banks = [0, 1].map(s => '<g data-k="bank" data-s="' + s + '"><ellipse cx="' + (s ? W + 40 : -40) + '" cy="' + CY + '" rx="420" ry="560" fill="url(#fg' + u + ')" filter="url(#t' + u + ')"/></g>').join('');
      const tent = [[0, H, 1], [W, H, -1], [0, 0, 1], [W, 0, -1]].map(([x, y, s], i) => { const sy = y ? -1 : 1, d = 'M' + x + ',' + y + ' C' + f1(x + s * 160) + ',' + f1(y + sy * 40) + ' ' + f1(x + s * 120) + ',' + f1(y + sy * 260) + ' ' + f1(x + s * 300) + ',' + f1(y + sy * 230) + ' S' + f1(x + s * 360) + ',' + f1(y + sy * 90) + ' ' + f1(x + s * 280) + ',' + f1(y + sy * 120); return draw(d, 'url(#tn' + u + ')', 22 - i * 2, 'tn', 'filter="url(#g' + u + ')"'); }).join('');
      const eye = '<g data-k="eye" style="' + org(CX, 110) + '" opacity="0"><path d="M' + (CX - 260) + ',110 Q' + CX + ',-40 ' + (CX + 260) + ',110 Q' + CX + ',260 ' + (CX - 260) + ',110Z" fill="url(#ey' + u + ')" filter="url(#g' + u + ')"/><ellipse data-k="pupil" cx="' + CX + '" cy="110" rx="16" ry="74" fill="#020617" style="' + box + '"/></g>';
      return defs(u, rad('fg' + u, st(0, '#0f766e', .75) + st(.6, '#134e4a', .45) + st(1, '#042f2e', 0)) + lin('tn' + u, st(0, '#2dd4bf', .2) + st(.6, '#14b8a6', .9) + st(1, '#ccfbf1'), 0, 0, 1, 1) + rad('ey' + u, st(0, '#fef08a') + st(.25, '#facc15') + st(.55, '#0d9488', .9) + st(1, '#042f2e', .2))) +
        banks + tent + eye;
    },
    gather(T, ms) { T.all('bank', el => T.a(el, [{ transform: 'translateX(' + (el.dataset.s === '1' ? 420 : -420) + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], ms)); T.drawIn('tn', ms, 90); },
    burst(T) { T.all('eye', el => T.a(el, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1.08)', opacity: 1, offset: .35 }, { transform: 'scaleY(1)', opacity: .95 }], 520)); T.all('pupil', el => T.a(el, [{ transform: 'scaleX(3)' }, { transform: 'scaleX(1)' }], 520, { delay: 160 })); },
    linger(T) { T.all('eye', el => T.a(el, [{ transform: 'scaleY(1)', opacity: .95 }, { transform: 'scaleY(0)', opacity: 0 }], 360)); T.all('bank', el => T.a(el, [{ opacity: 1 }, { transform: 'translateX(' + (el.dataset.s === '1' ? 300 : -300) + 'px)', opacity: 0 }], 800)); T.fade('tn', 1, 0, 600); },
  },

  // 归尘礼赞 L4：天穹三重光冕逆转、圣光柱从天而降 → 十字裂光 + 羽落
  'holy-judgment': {
    build(u, r) {
      const HY = -60; const halo = [600, 510, 420].map((R, i) => { const ticks = Array.from({ length: 36 }, (_, k) => { const a = k / 36 * TAU; return '<circle cx="' + f1(CX + Math.cos(a) * R) + '" cy="' + f1(HY + Math.sin(a) * R) + '" r="' + (k % 3 ? 5 : 11) + '" fill="url(#hp' + u + ')"/>'; }).join(''); return '<g data-k="halo" data-i="' + i + '" style="' + org(CX, HY) + '"><circle cx="' + CX + '" cy="' + HY + '" r="' + R + '" fill="none" stroke="url(#hr' + u + ')" stroke-width="' + (14 - i * 3) + '" filter="url(#g' + u + ')"/>' + ticks + '</g>'; }).join('');
      const rays = Array.from({ length: 9 }, (_, i) => { if (i === 4) return ''; /* 中央光束去除：避免与目标处真实光柱形成双重攻击假象 */ const x = 120 + i * 170; return '<path data-k="ray" d="M' + (x - 30) + ',-10 L' + (x + 30) + ',-10 L' + (x + 140 * (i - 4) / 4 + 90) + ',' + H + ' L' + (x + 140 * (i - 4) / 4 - 90) + ',' + H + 'Z" fill="url(#ry' + u + ')" opacity="0"/>'; }).join('');
      const feathers = Array.from({ length: 16 }, () => { const x = r() < .5 ? r() * 360 : W - r() * 360, y = -40 - r() * 200; return '<path data-k="fe" d="M' + f1(x) + ',' + f1(y) + ' q12,-30 0,-60 q-12,30 0,60Z" fill="url(#hp' + u + ')" filter="url(#g' + u + ')" opacity="0" style="' + box + '"/>'; }).join('');
      return defs(u, lin('hr' + u, st(0, '#fde68a') + st(.5, '#fffbeb') + st(1, '#facc15'), 0, 0, 1, 0) + rad('hp' + u, st(0, '#fffbeb') + st(.6, '#fde047') + st(1, '#f59e0b', 0)) + lin('ry' + u, st(0, '#fffbeb', .8) + st(.6, '#fde68a', .25) + st(1, '#fde68a', 0)) + lin('pl' + u, st(0, '#fde047', 0) + st(.35, '#fef9c3', .85) + st(.5, '#ffffff') + st(.65, '#fef9c3', .85) + st(1, '#fde047', 0), 0, 0, 1, 0)) +
        rays + halo + feathers;
    },
    gather(T, ms) { T.all('halo', el => { const s = el.dataset.i % 2 ? -1 : 1; T.a(el, [{ transform: 'scale(.6) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(' + s * 60 + 'deg)', opacity: 1 }], ms); }); T.all('ray', (el, i) => T.a(el, [{ opacity: 0 }, { opacity: .7 }], ms * .9, { delay: i * 40 })); },
    burst(T) {
      T.all('halo', el => T.a(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', opacity: .55 }], 360));
    },
    linger(T) { T.all('fe', (el, i) => T.a(el, [{ transform: 'translate(0,0) rotate(0deg)', opacity: 0 }, { opacity: .9, offset: .15 }, { transform: 'translate(' + ((i % 3) - 1) * 60 + 'px,' + (420 + (i % 5) * 60) + 'px) rotate(' + (i % 2 ? 160 : -160) + 'deg)', opacity: 0 }], 1300, { delay: (i % 6) * 70, easing: 'ease-in-out' })); T.fade('halo', .55, 0, 700); T.fade('ray', .7, 0, 600); },
  },

  // 召雷术：顶部雷云压境、两侧电弧游走 → 五道分形落雷 + 紫闪 → 余电
  'thunder-storm': {
    blend: 'normal',
    build(u, r) {
      const clouds = Array.from({ length: 9 }, (_, i) => '<ellipse data-k="cl" cx="' + f1(i * 200 + r() * 60) + '" cy="' + f1(-30 + r() * 60) + '" rx="' + f1(200 + r() * 90) + '" ry="' + f1(110 + r() * 50) + '" fill="url(#cd' + u + ')" filter="url(#s' + u + ')"/>').join('');
      const arcs = [0, W].flatMap(x => Array.from({ length: 3 }, (_, k) => { const y0 = 120 + k * 260; return '<path data-k="arc" d="' + jag(r, x, y0, x + (x ? -1 : 1) * 70, y0 + 200, 7, 60) + '" fill="none" stroke="#c4b5fd" stroke-width="3" filter="url(#g' + u + ')" opacity="0"/>'; })).join('');
      const bolts = Array.from({ length: 5 }, (_, i) => { const x0 = 200 + i * 300 + (r() - .5) * 80, x1 = x0 + (r() - .5) * 260, y1 = i === 2 ? H * .62 : H * (.42 + r() * .3), d = jag(r, x0, 0, x1, y1, 12, 110), br = jag(r, (x0 + x1) / 2, y1 * .45, (x0 + x1) / 2 + (r() - .5) * 300, y1 * .8, 6, 60); return '<g data-k="bolt" opacity="0"><path d="' + d + '" fill="none" stroke="#8b5cf6" stroke-width="16" filter="url(#g' + u + ')" opacity=".55"/><path d="' + d + '" fill="none" stroke="#fef9c3" stroke-width="4" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" data-k="core"/><path d="' + br + '" fill="none" stroke="#ddd6fe" stroke-width="2.4" filter="url(#g' + u + ')"/></g>'; }).join('');
      return defs(u, rad('cd' + u, st(0, '#1e1b4b', .95) + st(.7, '#312e81', .6) + st(1, '#1e1b4b', 0)) + rad('fv' + u, st(0, '#ede9fe', .5) + st(.5, '#8b5cf6', .22) + st(1, '#1e1b4b', 0))) +
        clouds + arcs + bolts + '<rect data-k="flash" width="' + W + '" height="' + H + '" fill="url(#fv' + u + ')" opacity="0"/>';
    },
    gather(T, ms) { T.all('cl', (el, i) => T.a(el, [{ transform: 'translateY(-160px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], ms, { delay: i * 25 })); T.all('arc', (el, i) => T.a(el, [{ opacity: 0 }, { opacity: 1 }, { opacity: .1 }, { opacity: .9 }, { opacity: 0 }], 320, { delay: 120 + i * 70, iterations: Math.max(1, Math.floor(ms / 420)) })); },
    burst(T) {
      T.all('bolt', (el, i) => T.a(el, [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: .2, offset: .4 }, { opacity: 1, offset: .55 }, { opacity: 0 }], 520, { delay: i * 55, easing: 'steps(6)' }));
      T.all('core', (el, i) => T.a(el, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 110, { delay: i * 55 }));
      T.all('flash', el => T.a(el, [{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: .2, offset: .3 }, { opacity: .7, offset: .45 }, { opacity: 0 }], 520, { easing: 'steps(5)' }));
    },
    linger(T) { T.fade('cl', 1, 0, 900); T.all('arc', (el, i) => T.a(el, [{ opacity: .8 }, { opacity: 0 }], 260, { delay: i * 60 })); },
  },

  // 冰霜爆炸：四角冰晶分形生长 + 霜缘 → 巨晶花闪现后碎裂外飞 → 细雪
  'frost-blast': {
    build(u, r) {
      const flake = (x, y, R, k) => Array.from({ length: 6 }, (_, i) => { const a = i / 6 * TAU, ex = x + Math.cos(a) * R, ey = y + Math.sin(a) * R; let d = 'M' + f1(x) + ',' + f1(y) + ' L' + f1(ex) + ',' + f1(ey); for (const t of [.45, .7]) { const bx = x + Math.cos(a) * R * t, by = y + Math.sin(a) * R * t; for (const s of [-1, 1]) d += ' M' + f1(bx) + ',' + f1(by) + ' L' + f1(bx + Math.cos(a + s * .7) * R * .28) + ',' + f1(by + Math.sin(a + s * .7) * R * .28); } return draw(d, 'url(#ic' + u + ')', 5, k, 'filter="url(#g' + u + ')"'); }).join('');
      const corners = [[60, 60], [W - 60, 60], [W - 60, H - 60], [60, H - 60], [CX, -40], [CX, H + 40]].map(([x, y], i) => flake(x, y, i > 3 ? 160 : 230, 'fk')).join('');
      const shards = Array.from({ length: 20 }, (_, i) => { const a = i / 20 * 360, s = 18 + r() * 26, d = 520 + r() * 260; return '<g transform="rotate(' + f1(a) + ' ' + CX + ' ' + CY + ')"><path data-k="sh" data-d="' + f1(d) + '" d="M' + CX + ',' + (CY - s * 1.6) + ' L' + (CX + s * .4) + ',' + CY + ' L' + CX + ',' + (CY + s) + ' L' + (CX - s * .4) + ',' + CY + 'Z" fill="url(#sh' + u + ')" filter="url(#g' + u + ')" opacity="0"/></g>'; }).join('');
      const snow = Array.from({ length: 30 }, () => orb(r() * W, -10 - r() * 80, 2 + r() * 3.5, 'url(#sn' + u + ')', 'sn')).join('');
      return defs(u, lin('ic' + u, st(0, '#e0f2fe') + st(1, '#38bdf8'), 0, 0, 1, 1) + rad('rim' + u, st(.55, '#e0f2fe', 0) + st(.85, '#7dd3fc', .28) + st(1, '#e0f2fe', .55)) + lin('sh' + u, st(0, '#f0f9ff') + st(.5, '#7dd3fc', .8) + st(1, '#0ea5e9', .3), 0, 0, 1, 1) + rad('sn' + u, st(0, '#ffffff') + st(1, '#bae6fd', 0))) +
        '<rect data-k="rim" width="' + W + '" height="' + H + '" fill="url(#rim' + u + ')" opacity="0"/>' + corners +
        '<g data-k="big" opacity="0" style="' + org(CX, CY) + '">' + flake(CX, CY, 330, 'bf') + '</g>' + shards + snow;
    },
    gather(T, ms) { T.drawIn('fk', ms * .9, 18); T.fade('rim', 0, 1, ms); },
    burst(T) {
      T.all('big', el => T.a(el, [{ transform: 'scale(.4) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(20deg)', opacity: .75, offset: .35 }, { transform: 'scale(1.15) rotate(30deg)', opacity: 0 }], 460));
      T.all('bf', el => { el.style.strokeDashoffset = 0; });
      T.all('sh', el => T.a(el, [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: .95, offset: .15 }, { transform: 'translate(0,-' + el.dataset.d + 'px)', opacity: 0 }], 640, { delay: 160, easing: 'cubic-bezier(.1,.8,.3,1)' }));
      T.all('fk', el => T.a(el, [{ opacity: 1 }, { opacity: .35 }], 300));
    },
    linger(T) { T.all('sn', (el, i) => T.a(el, [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: 'translate(' + ((i % 5) - 2) * 25 + 'px,' + (300 + (i % 6) * 80) + 'px)', opacity: 0 }], 1300, { delay: (i % 10) * 45 })); T.fade('fk', .35, 0, 800); T.fade('rim', 1, 0, 800); },
  },

  // 纳克提特障壁术：蜂巢晶格自四缘扫入、八芒几何阵描边 → 锁定闪耀 → 晶格由内向外淡出
  'nak-tith-barrier': {
    build(u) {
      const hex = (x, y, s) => { let d = ''; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; d += (k ? ' L' : 'M') + f1(x + Math.cos(a) * s) + ',' + f1(y + Math.sin(a) * s); } return d + 'Z'; };
      let cells = '';
      for (let row = -1; row < 12; row++) for (let col = -1; col < 19; col++) {
        const x = col * 90 + (row % 2 ? 45 : 0), y = row * 78; const dd = Math.hypot((x - CX) / W, (y - CY) / H);
        if (dd < .3) continue;
        cells += '<path data-k="hx" data-d="' + f1(dd) + '" d="' + hex(x, y, 44) + '" fill="url(#hf' + u + ')" stroke="url(#hs' + u + ')" stroke-width="1.6" opacity="0"/>';
      }
      const sq = (rot) => '<rect x="' + (CX - 300) + '" y="' + (CY - 300) + '" width="600" height="600" fill="none" stroke="url(#hs' + u + ')" stroke-width="5" transform="rotate(' + rot + ' ' + CX + ' ' + CY + ')" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" data-k="oc" filter="url(#g' + u + ')"/>';
      return defs(u, rad('hf' + u, st(0, '#a78bfa', .02) + st(1, '#6366f1', .18)) + lin('hs' + u, st(0, '#c4b5fd') + st(1, '#67e8f9'), 0, 0, 1, 1)) +
        '<g data-k="lat">' + cells + '</g><g data-k="octo" style="' + org(CX, CY) + '">' + sq(0) + sq(45) + '<circle cx="' + CX + '" cy="' + CY + '" r="420" fill="none" stroke="url(#hs' + u + ')" stroke-width="3" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" data-k="oc" filter="url(#g' + u + ')"/></g>';
    },
    gather(T, ms) { T.all('hx', el => T.a(el, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: .9, transform: 'scale(1)' }], ms * .5, { delay: (1 - +el.dataset.d) * ms * .6 })); T.all('hx', el => { el.style.transformBox = 'fill-box'; el.style.transformOrigin = '50% 50%'; }); T.drawIn('oc', ms, 80); T.all('octo', el => T.a(el, [{ transform: 'rotate(-30deg)' }, { transform: 'rotate(0deg)' }], ms)); },
    burst(T) { T.all('lat', el => T.a(el, [{ opacity: 1, filter: 'brightness(1)' }, { opacity: 1, filter: 'brightness(2.6)', offset: .2 }, { opacity: 1, filter: 'brightness(1)' }], 380, { easing: 'steps(4)' })); T.all('octo', el => T.a(el, [{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 300, { easing: 'cubic-bezier(.2,1.6,.4,1)' })); },
    linger(T) { T.all('hx', el => T.a(el, [{ opacity: .9 }, { opacity: 0 }], 420, { delay: +el.dataset.d * 600 })); T.fade('octo', 1, 0, 700); },
  },

  // 伊西丝之拥：两扇金翡翠巨翼自两侧展开、安卡徽记描画 → 双翼合拥 + 金尘 → 羽落
  'isis-embrace': {
    build(u, r) {
      const wing = s => Array.from({ length: 9 }, (_, i) => { const L = 380 - i * 22, a = (-60 + i * 15) * Math.PI / 180, x0 = s > 0 ? 0 : W, y0 = CY + 40; const ex = x0 + s * Math.cos(a) * L, ey = y0 + Math.sin(a) * L; return '<path d="M' + x0 + ',' + y0 + ' Q' + f1(x0 + s * Math.cos(a - .25) * L * .6) + ',' + f1(y0 + Math.sin(a - .25) * L * .6) + ' ' + f1(ex) + ',' + f1(ey) + ' Q' + f1(x0 + s * Math.cos(a + .2) * L * .55) + ',' + f1(y0 + Math.sin(a + .2) * L * .55) + ' ' + x0 + ',' + y0 + 'Z" fill="url(#wf' + u + ')" opacity="' + f1(.55 + i * .04) + '"/>'; }).join('');
      const ankh = 'M' + CX + ',150 L' + CX + ',40 M' + (CX - 46) + ',150 L' + (CX + 46) + ',150 M' + CX + ',150 C' + (CX - 52) + ',150 ' + (CX - 52) + ',40 ' + CX + ',40 C' + (CX + 52) + ',40 ' + (CX + 52) + ',150 ' + CX + ',150 L' + CX + ',260';
      const dust = Array.from({ length: 30 }, () => orb(CX + (r() - .5) * 900, CY + (r() - .5) * 500, 2 + r() * 4, 'url(#gd' + u + ')', 'gd', 'opacity="0"')).join('');
      return defs(u, lin('wf' + u, st(0, '#fde68a', .9) + st(.55, '#14b8a6', .55) + st(1, '#0f766e', 0), 0, 0, 1, 0) + rad('gd' + u, st(0, '#fffbeb') + st(1, '#f59e0b', 0))) +
        '<g data-k="wl" style="' + org(0, CY + 40) + '" filter="url(#g' + u + ')">' + wing(1) + '</g><g data-k="wr" style="' + org(W, CY + 40) + '" filter="url(#g' + u + ')">' + wing(-1) + '</g>' +
        draw(ankh, '#fde68a', 9, 'ank', 'filter="url(#g' + u + ')"') + dust;
    },
    gather(T, ms) { T.all('wl', el => T.a(el, [{ transform: 'rotate(70deg) scale(.5)', opacity: 0 }, { transform: 'rotate(0deg) scale(1)', opacity: 1 }], ms)); T.all('wr', el => T.a(el, [{ transform: 'rotate(-70deg) scale(.5)', opacity: 0 }, { transform: 'rotate(0deg) scale(1)', opacity: 1 }], ms)); T.drawIn('ank', ms); },
    burst(T) {
      T.all('wl', el => T.a(el, [{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(-22deg) scale(1.12)', offset: .45 }, { transform: 'rotate(-10deg) scale(1.05)', opacity: .7 }], 520));
      T.all('wr', el => T.a(el, [{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(22deg) scale(1.12)', offset: .45 }, { transform: 'rotate(10deg) scale(1.05)', opacity: .7 }], 520));
      T.all('gd', (el, i) => T.a(el, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.4)', offset: .3 }, { opacity: 0, transform: 'scale(.6) translateY(-60px)' }], 900, { delay: (i % 8) * 30 }));
    },
    linger(T) { T.fade('wl', .7, 0, 800); T.fade('wr', .7, 0, 800); T.fade('ank', 1, 0, 600); },
  },

  // 连续扫射：底缘枪焰频闪 → 曳光弹幕斜贯上下三分区 + 弹壳翻滚 → 硝烟
  'strafe-burst': {
    build(u, r) {
      const tracers = Array.from({ length: 18 }, (_, i) => { const top = i % 2 === 0, y0 = top ? 40 + r() * 200 : H - 40 - r() * 200, y1 = y0 + (r() - .5) * 120; return '<line data-k="tr" x1="-200" y1="' + f1(y0) + '" x2="' + (W + 200) + '" y2="' + f1(y1) + '" stroke="url(#tc' + u + ')" stroke-width="' + f1(2 + r() * 2.5) + '" pathLength="1" stroke-dasharray=".14 1" stroke-dashoffset=".14" filter="url(#g' + u + ')"/>'; }).join('');
      const casings = Array.from({ length: 14 }, () => '<rect data-k="cs" x="' + f1(W - 60 - r() * 120) + '" y="' + f1(H * .35 + r() * H * .3) + '" width="9" height="22" rx="3" fill="url(#br' + u + ')" opacity="0" style="' + box + '"/>').join('');
      const flashes = Array.from({ length: 5 }, (_, i) => '<ellipse data-k="mz" cx="' + (180 + i * 300) + '" cy="' + (H + 10) + '" rx="120" ry="70" fill="url(#mz' + u + ')" opacity="0"/>').join('');
      const smoke = Array.from({ length: 10 }, (_, i) => '<ellipse data-k="sm" cx="' + (i * 170) + '" cy="' + (i % 2 ? 60 : H - 60) + '" rx="150" ry="60" fill="url(#sk' + u + ')" filter="url(#s' + u + ')" opacity="0"/>').join('');
      return defs(u, lin('tc' + u, st(0, '#fef3c7', 0) + st(.6, '#f59e0b') + st(1, '#fffbeb'), 0, 0, 1, 0) + lin('br' + u, st(0, '#fde68a') + st(.5, '#b45309') + st(1, '#fde68a'), 0, 0, 1, 0) + rad('mz' + u, st(0, '#fffbeb', .9) + st(.4, '#f59e0b', .5) + st(1, '#7c2d12', 0)) + rad('sk' + u, st(0, '#57534e', .5) + st(1, '#292524', 0))) +
        smoke + flashes + tracers + casings;
    },
    gather(T, ms) { T.all('mz', (el, i) => T.a(el, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], 140, { delay: i * 60, iterations: Math.max(2, Math.floor(ms / 300)), easing: 'steps(3)' })); },
    burst(T) {
      T.all('tr', (el, i) => T.a(el, [{ strokeDashoffset: .14 }, { strokeDashoffset: -1 }], 260, { delay: i * 34, easing: 'linear' }));
      T.all('cs', (el, i) => T.a(el, [{ transform: 'translate(0,0) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: .1 }, { transform: 'translate(' + (40 + i * 6) + 'px,' + (-60 - (i % 4) * 30) + 'px) rotate(' + (300 + i * 40) + 'deg)', offset: .4 }, { transform: 'translate(' + (90 + i * 6) + 'px,' + (240 + (i % 5) * 30) + 'px) rotate(' + (720 + i * 40) + 'deg)', opacity: 0 }], 900, { delay: i * 40, easing: 'ease-in' }));
    },
    linger(T) { T.all('sm', (el, i) => T.a(el, [{ opacity: 0, transform: 'translateY(0)' }, { opacity: .8, offset: .3 }, { opacity: 0, transform: 'translateY(' + (i % 2 ? 40 : -40) + 'px)' }], 1200, { delay: i * 40 })); },
  },

  // 克虏伯重狙 L4：千米狙镜暗环收缩、密位分划与呼吸晃动 → 枪焰横贯 + 冲击环 + 镜框后坐张开 → 硝烟
  'krupp-snipe': {
    blend: 'normal',
    build(u, r, F = { x: 800, y: 450 }) {
      const CX = F.x, CY = F.y;   // 准星锁定真实受击目标（视口坐标换算到 viewBox）
      const mil = Array.from({ length: 9 }, (_, i) => { const d = (i - 4) * 34; return i === 4 ? '' : '<circle cx="' + (CX + d) + '" cy="' + CY + '" r="3.2" fill="#fca5a5"/><circle cx="' + CX + '" cy="' + (CY + d) + '" r="3.2" fill="#fca5a5"/>'; }).join('');
      return defs(u, '<mask id="m' + u + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/><circle data-k="hole" cx="' + CX + '" cy="' + CY + '" r="330" fill="#000" style="' + org(CX, CY) + '"/></mask>' + rad('sc' + u, st(0, '#000', 0) + st(.82, '#020617', .2) + st(1, '#020617', .92)) + lin('mf' + u, st(0, '#fef2f2', 0) + st(.45, '#fde68a', .9) + st(.5, '#ffffff') + st(.55, '#fde68a', .9) + st(1, '#fef2f2', 0), 0, 0, 0, 1)) +
        '<g data-k="scope" style="' + org(CX, CY) + '"><rect width="' + W + '" height="' + H + '" fill="#020617" opacity=".86" mask="url(#m' + u + ')"/>' +
        '<circle cx="' + CX + '" cy="' + CY + '" r="330" fill="url(#sc' + u + ')"/><circle cx="' + CX + '" cy="' + CY + '" r="334" fill="none" stroke="#fca5a5" stroke-opacity=".55" stroke-width="2" filter="url(#g' + u + ')"/>' +
        '<g data-k="cross" opacity="0" filter="url(#g' + u + ')"><path d="M' + (CX - 320) + ',' + CY + ' L' + (CX - 40) + ',' + CY + ' M' + (CX + 40) + ',' + CY + ' L' + (CX + 320) + ',' + CY + ' M' + CX + ',' + (CY - 320) + ' L' + CX + ',' + (CY - 40) + ' M' + CX + ',' + (CY + 40) + ' L' + CX + ',' + (CY + 320) + '" stroke="#fecaca" stroke-width="1.6"/>' + mil + '<circle cx="' + CX + '" cy="' + CY + '" r="5" fill="#ef4444"/></g></g>' +
        '<rect data-k="mf" x="0" y="' + (CY - 50) + '" width="' + W + '" height="100" fill="url(#mf' + u + ')" opacity="0" style="' + org(CX, CY) + '"/>' +
        [1, 2].map(i => '<circle data-k="sw" cx="' + CX + '" cy="' + CY + '" r="60" fill="none" stroke="#fde68a" stroke-width="' + (8 / i) + '" filter="url(#g' + u + ')" opacity="0" style="' + org(CX, CY) + '"/>').join('');
    },
    gather(T, ms) {
      T.all('scope', el => T.a(el, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'scale(1)', offset: .5 }, { transform: 'translate(4px,-3px) scale(1)', offset: .75 }, { transform: 'translate(-3px,2px) scale(1)' }], ms));
      T.fade('cross', 0, 1, ms * .5, { delay: ms * .35 });
    },
    burst(T) {
      T.all('mf', el => T.a(el, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1.4)', opacity: 1, offset: .2 }, { transform: 'scaleY(.2)', opacity: 0 }], 380));
      T.all('sw', (el, i) => T.a(el, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(12)', opacity: 0 }], 700, { delay: i * 90, easing: 'cubic-bezier(.1,.8,.3,1)' }));
      T.all('scope', el => T.a(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.08) translateY(-10px)', offset: .25 }, { transform: 'scale(2.6)', opacity: 0 }], 720, { easing: 'cubic-bezier(.4,0,.2,1)' }));
    },
    linger() {},
  },

  // 谐律之庇：上下五线谱声波起伏、四角共鸣环 → 中心和声三重环扩散 + 音符上浮 → 余辉
  'harmony-ward': {
    build(u, r) {
      const staff = (y0, k) => Array.from({ length: 5 }, (_, i) => { let d = ''; for (let x = -200; x <= W + 400; x += 20) d += (x === -200 ? 'M' : ' L') + x + ',' + f1(y0 + i * 14 + Math.sin(x / 90 + i) * 18); return '<path data-k="' + k + '" d="' + d + '" fill="none" stroke="url(#hm' + u + ')" stroke-width="2" opacity=".85" filter="url(#g' + u + ')"/>'; }).join('');
      const corner = [[0, 0], [W, 0], [W, H], [0, H]].flatMap(([x, y]) => [0, 1, 2].map(i => '<circle data-k="cr" cx="' + x + '" cy="' + y + '" r="80" fill="none" stroke="url(#hm' + u + ')" stroke-width="3" opacity="0" style="' + org(x, y) + '" data-i="' + i + '"/>')).join('');
      const notes = Array.from({ length: 12 }, (_, i) => '<text data-k="nt" x="' + f1(i % 2 ? 60 + r() * 220 : W - 60 - r() * 220) + '" y="' + f1(H - 40 - r() * 200) + '" font-size="' + f1(30 + r() * 18) + '" fill="url(#hm' + u + ')" filter="url(#g' + u + ')" opacity="0">' + '♪♫♩♬'[i % 4] + '</text>').join('');
      return defs(u, lin('hm' + u, st(0, '#a7f3d0') + st(.5, '#fef9c3') + st(1, '#93c5fd'), 0, 0, 1, 0)) +
        '<g data-k="st">' + staff(40, 'sv') + staff(H - 110, 'sv') + '</g>' + corner +
        [0, 1, 2].map(i => '<circle data-k="hr" cx="' + CX + '" cy="' + CY + '" r="70" fill="none" stroke="url(#hm' + u + ')" stroke-width="' + (6 - i * 1.5) + '" filter="url(#g' + u + ')" opacity="0" style="' + org(CX, CY) + '"/>').join('') + notes;
    },
    gather(T, ms) { T.all('sv', (el, i) => T.a(el, [{ transform: 'translateX(0)', opacity: 0 }, { opacity: .85, offset: .2 }, { transform: 'translateX(-' + (180 + i * 6) + 'px)', opacity: .85 }], ms, { easing: 'linear' })); T.all('cr', el => T.a(el, [{ transform: 'scale(.3)', opacity: 0 }, { opacity: .9, offset: .3 }, { transform: 'scale(4)', opacity: 0 }], 700, { delay: +el.dataset.i * 220, iterations: Math.max(1, Math.round(ms / 700)) })); },
    burst(T) { T.all('hr', (el, i) => T.a(el, [{ transform: 'scale(.5)', opacity: 1 }, { transform: 'scale(9)', opacity: 0 }], 900, { delay: i * 130, easing: 'cubic-bezier(.15,.7,.3,1)' })); T.all('nt', (el, i) => T.a(el, [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: .25 }, { transform: 'translateY(-160px)', opacity: 0 }], 1100, { delay: i * 60 })); },
    linger(T) { T.fade('st', 1, 0, 700); },
  },

  // 静默之域：边缘褪色帷幕吞没色彩、涟漪向内坍缩 → 万籁俱寂的竖瞳缄口 → 帷幕抬起
  'silence-field': {
    blend: 'normal',
    build(u) {
      return defs(u, rad('sv' + u, st(.45, '#1e1b4b', 0) + st(.8, '#312e81', .35) + st(1, '#0f172a', .7)) + lin('sl' + u, st(0, '#c4b5fd', 0) + st(.5, '#e0e7ff') + st(1, '#c4b5fd', 0), 0, 0, 0, 1)) +
        '<rect data-k="veil" width="' + W + '" height="' + H + '" fill="url(#sv' + u + ')" opacity="0"/>' +
        [0, 1, 2, 3].map(i => '<circle data-k="rp" data-i="' + i + '" cx="' + CX + '" cy="' + CY + '" r="760" fill="none" stroke="#c4b5fd" stroke-width="' + (4 - i * .6) + '" filter="url(#g' + u + ')" opacity="0" style="' + org(CX, CY) + '"/>').join('') +
        '<g data-k="hush" opacity="0" style="' + org(CX, CY) + '"><rect x="' + (CX - 10) + '" y="' + (CY - 380) + '" width="20" height="760" rx="10" fill="url(#sl' + u + ')" filter="url(#g' + u + ')"/><ellipse cx="' + CX + '" cy="' + CY + '" rx="60" ry="380" fill="none" stroke="#a5b4fc" stroke-width="2" opacity=".6" filter="url(#g' + u + ')"/></g>';
    },
    // 褪色：叠一层 backdrop 灰度（只在边缘，中心透明）
    overlay: '<div data-k="gray" style="position:absolute;inset:0;backdrop-filter:grayscale(.9) brightness(.85);-webkit-backdrop-filter:grayscale(.9) brightness(.85);-webkit-mask-image:radial-gradient(ellipse at center,transparent 38%,#000 78%);mask-image:radial-gradient(ellipse at center,transparent 38%,#000 78%);opacity:0;"></div>',
    gather(T, ms) { T.fade('veil', 0, 1, ms); T.fade('gray', 0, 1, ms); T.all('rp', el => T.a(el, [{ transform: 'scale(1.2)', opacity: 0 }, { opacity: .8, offset: .3 }, { transform: 'scale(.45)', opacity: 0 }], 900, { delay: +el.dataset.i * 200, iterations: Math.max(1, Math.round(ms / 900)), easing: 'ease-in' })); },
    burst(T) { T.all('hush', el => T.a(el, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1.2)', opacity: 1, offset: .3 }, { transform: 'scaleX(1)', opacity: .9 }], 420)); T.all('rp', el => el.getAnimations().forEach(a => a.pause())); },
    linger(T) { T.fade('hush', .9, 0, 400); T.fade('veil', 1, 0, 800); T.fade('gray', 1, 0, 800); T.fade('rp', .6, 0, 300); },
  },

  // 碎裂之响：裂纹网自屏缘爬向内圈 → 裂纹闪亮、玻璃碎片坠落 + 色散闪 → 微光
  'shatter-echo': {
    build(u, r) {
      const cracks = Array.from({ length: 16 }, (_, i) => { const p = edgePt(i / 16 + r() * .03), q = toward(p, .42 + r() * .12); const main = jag(r, p.x, p.y, q.x, q.y, 8, 70); const m = toward(p, .2), b = { x: m.x + (r() - .5) * 220, y: m.y + (r() - .5) * 220 }; return draw(main, 'url(#ck' + u + ')', 3.2, 'ck', 'filter="url(#g' + u + ')"') + draw(jag(r, m.x, m.y, b.x, b.y, 5, 40), 'url(#ck' + u + ')', 2, 'ck', 'filter="url(#g' + u + ')"'); }).join('');
      const shards = Array.from({ length: 22 }, () => { const p = edgePt(r()), s = 20 + r() * 40, q = toward(p, .08); return '<path data-k="sd" d="M' + f1(q.x) + ',' + f1(q.y) + ' l' + f1(s) + ',' + f1(s * .3) + ' l' + f1(-s * .5) + ',' + f1(s * .9) + 'Z" fill="url(#sd' + u + ')" opacity="0" style="' + box + '"/>'; }).join('');
      return defs(u, lin('ck' + u, st(0, '#f5d0fe') + st(1, '#ffffff'), 0, 0, 1, 1) + lin('sd' + u, st(0, '#ffffff', .85) + st(.5, '#e9d5ff', .4) + st(1, '#a855f7', .15), 0, 0, 1, 1)) +
        '<g data-k="cg">' + cracks + '</g>' + shards +
        '<rect data-k="ca" width="' + W + '" height="' + H + '" fill="#ec4899" opacity="0" style="mix-blend-mode:screen"/><rect data-k="cb" width="' + W + '" height="' + H + '" fill="#22d3ee" opacity="0" style="mix-blend-mode:screen"/>';
    },
    gather(T, ms) { T.drawIn('ck', ms * .9, 25, { easing: 'cubic-bezier(.6,0,.9,.6)' }); },
    burst(T) {
      T.all('cg', el => T.a(el, [{ filter: 'brightness(1)' }, { filter: 'brightness(2.8)', offset: .2 }, { filter: 'brightness(1)' }], 320, { easing: 'steps(3)' }));
      T.all('ca', el => T.a(el, [{ opacity: 0, transform: 'translateX(0)' }, { opacity: .22, transform: 'translateX(-8px)', offset: .3 }, { opacity: 0, transform: 'translateX(0)' }], 260));
      T.all('cb', el => T.a(el, [{ opacity: 0, transform: 'translateX(0)' }, { opacity: .22, transform: 'translateX(8px)', offset: .3 }, { opacity: 0, transform: 'translateX(0)' }], 260));
      T.all('sd', (el, i) => T.a(el, [{ transform: 'translate(0,0) rotate(0deg)', opacity: 0 }, { opacity: .95, offset: .1 }, { transform: 'translate(' + ((i % 7) - 3) * 20 + 'px,' + (260 + (i % 5) * 70) + 'px) rotate(' + (i % 2 ? 220 : -220) + 'deg)', opacity: 0 }], 950, { delay: i * 22, easing: 'cubic-bezier(.5,0,.9,.6)' }));
    },
    linger(T) { T.fade('cg', 1, 0, 700); },
  },

  // 塞赫美特之愠 L4：天顶烈日升起、日轮光芒缓转、拉之眼描画 → 太阳耀斑穿屏 + 热浪 → 灰烬
  'sekhmet-wrath': {
    build(u, r) {
      const rays = Array.from({ length: 24 }, (_, i) => { const a = i / 24 * TAU; return '<path d="M' + f1(CX + Math.cos(a - .03) * 270) + ',' + f1(-60 + Math.sin(a - .03) * 270) + ' L' + f1(CX + Math.cos(a) * 1100) + ',' + f1(-60 + Math.sin(a) * 1100) + ' L' + f1(CX + Math.cos(a + .03) * 270) + ',' + f1(-60 + Math.sin(a + .03) * 270) + 'Z" fill="url(#sr' + u + ')"/>'; }).join('');
      const eye = 'M' + (CX - 150) + ',250 Q' + CX + ',170 ' + (CX + 150) + ',250 Q' + CX + ',300 ' + (CX - 150) + ',250 M' + (CX - 20) + ',290 C' + (CX - 40) + ',340 ' + (CX - 90) + ',360 ' + (CX - 120) + ',330 M' + (CX + 30) + ',290 L' + (CX + 60) + ',360 L' + (CX + 90) + ',352';
      const ash = Array.from({ length: 26 }, () => orb(r() * W, H * (.3 + r() * .7), 2 + r() * 3, '#78716c', 'ash', 'opacity="0"')).join('');
      return defs(u, rad('sun' + u, st(0, '#fffbeb') + st(.35, '#fde047') + st(.7, '#ea580c', .9) + st(1, '#7f1d1d', 0)) + lin('sr' + u, st(0, '#fde047', .55) + st(1, '#ea580c', 0), 0, 0, 1, 1) + rad('ht' + u, st(0, '#fff7ed', .6) + st(.5, '#f97316', .3) + st(1, '#7f1d1d', 0))) +
        '<g data-k="rays" style="' + org(CX, -60) + '" opacity="0">' + rays + '</g>' +
        '<circle data-k="sun" cx="' + CX + '" cy="-60" r="270" fill="url(#sun' + u + ')" filter="url(#g' + u + ')" style="' + org(CX, -60) + '"/>' +
        draw(eye, '#fff7ed', 6, 'ey', 'filter="url(#g' + u + ')"') +
        '<rect data-k="heat" width="' + W + '" height="' + H + '" fill="url(#ht' + u + ')" filter="url(#t' + u + ')" opacity="0"/>' + ash;
    },
    gather(T, ms) { T.all('sun', el => T.a(el, [{ transform: 'translateY(-260px) scale(.6)' }, { transform: 'translateY(0) scale(1)' }], ms)); T.all('rays', el => T.a(el, [{ opacity: 0, transform: 'rotate(0deg) scale(.5)' }, { opacity: .9, transform: 'rotate(18deg) scale(1)' }], ms)); T.drawIn('ey', ms * .8, 120, { delay: ms * .2 }); },
    burst(T) { T.all('rays', el => T.a(el, [{ transform: 'rotate(18deg) scale(1)', opacity: .9 }, { transform: 'rotate(26deg) scale(1.6)', opacity: 1, offset: .3 }, { transform: 'rotate(30deg) scale(1.8)', opacity: .3 }], 520)); T.all('heat', el => T.a(el, [{ opacity: 0 }, { opacity: .85, offset: .15 }, { opacity: 0 }], 480)); T.all('sun', el => T.a(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: .2 }, { transform: 'scale(1.1)' }], 420)); },
    linger(T) { T.fade('rays', .3, 0, 700); T.fade('ey', 1, 0, 500); T.all('sun', el => T.a(el, [{ transform: 'scale(1.1)', opacity: 1 }, { transform: 'translateY(-300px) scale(.7)', opacity: 0 }], 900)); T.all('ash', (el, i) => T.a(el, [{ opacity: 0, transform: 'translate(0,0)' }, { opacity: .8, offset: .2 }, { opacity: 0, transform: 'translate(' + ((i % 5) - 2) * 30 + 'px,-' + (160 + (i % 6) * 40) + 'px)' }], 1200, { delay: (i % 8) * 50 })); },
  },

  // 奇异海螺：对角两枚对数螺旋海螺回旋、底缘浪潮翻涌、气泡上升 → 涡流声环 + 水花 → 气泡
  'strange-conch': {
    build(u, r) {
      const spiral = (x, y, s) => { let d = ''; for (let k = 0; k <= 80; k++) { const t = k / 80 * 4.2 * Math.PI, R = 6 * Math.exp(.21 * t); d += (k ? ' L' : 'M') + f1(x + s * Math.cos(t) * R) + ',' + f1(y + Math.sin(t) * R); } return d; };
      const conch = (x, y, s) => '<g data-k="cn" style="' + org(x, y) + '">' + draw(spiral(x, y, s), 'url(#wv' + u + ')', 10, 'sp', 'filter="url(#g' + u + ')"') + '</g>';
      let wave = ''; for (let x = -300; x <= W + 300; x += 25) wave += (x === -300 ? 'M' : ' L') + x + ',' + f1(H - 70 + Math.sin(x / 70) * 26);
      const bubbles = Array.from({ length: 24 }, () => '<circle data-k="bb" cx="' + f1(r() * W) + '" cy="' + f1(H - r() * 80) + '" r="' + f1(4 + r() * 9) + '" fill="url(#bb' + u + ')" opacity="0"/>').join('');
      return defs(u, lin('wv' + u, st(0, '#cffafe') + st(.5, '#22d3ee') + st(1, '#0e7490'), 0, 0, 1, 1) + rad('bb' + u, st(0, '#ecfeff', .1) + st(.75, '#a5f3fc', .35) + st(.95, '#ecfeff', .9) + st(1, '#ecfeff', 0)) + lin('wf' + u, st(0, '#22d3ee', .55) + st(1, '#083344', 0), 0, 0, 0, 1)) +
        conch(170, H - 170, 1) + conch(W - 170, 170, -1) +
        '<g data-k="wave"><path d="' + wave + ' L' + (W + 300) + ',' + (H + 40) + ' L-300,' + (H + 40) + 'Z" fill="url(#wf' + u + ')" filter="url(#g' + u + ')"/></g>' + bubbles +
        [0, 1, 2].map(i => '<ellipse data-k="vx" cx="' + CX + '" cy="' + CY + '" rx="90" ry="54" fill="none" stroke="url(#wv' + u + ')" stroke-width="' + (6 - i * 1.6) + '" filter="url(#g' + u + ')" opacity="0" style="' + org(CX, CY) + '"/>').join('');
    },
    gather(T, ms) { T.drawIn('sp', ms * .8); T.all('cn', el => T.a(el, [{ transform: 'rotate(-120deg) scale(.6)', opacity: 0 }, { transform: 'rotate(0deg) scale(1)', opacity: 1 }], ms)); T.all('wave', el => T.a(el, [{ transform: 'translate(0,140px)' }, { transform: 'translate(-120px,0)' }], ms, { easing: 'ease-out' })); T.all('bb', (el, i) => T.a(el, [{ opacity: 0, transform: 'translateY(0)' }, { opacity: 1, offset: .3 }, { opacity: 0, transform: 'translateY(-' + (220 + (i % 6) * 40) + 'px)' }], ms + 400, { delay: (i % 8) * 60 })); },
    burst(T) { T.all('vx', (el, i) => T.a(el, [{ transform: 'scale(.4) rotate(0deg)', opacity: 1 }, { transform: 'scale(9) rotate(' + (60 + i * 30) + 'deg)', opacity: 0 }], 820, { delay: i * 110, easing: 'cubic-bezier(.15,.7,.3,1)' })); T.all('wave', el => T.a(el, [{ transform: 'translate(-120px,0)' }, { transform: 'translate(-160px,-60px)', offset: .3 }, { transform: 'translate(-200px,30px)' }], 600)); },
    linger(T) { T.fade('cn', 1, 0, 700); T.all('wave', el => T.a(el, [{ opacity: 1 }, { transform: 'translate(-260px,160px)', opacity: 0 }], 800)); },
  },

  // 高阶召唤术：屏缘星座连线点亮、巨型召唤环刻符缓转 → 星门收束至一点再炸开 → 星光渐隐
  'high-summon': {
    build(u, r) {
      const stars = Array.from({ length: 22 }, (_, i) => { const p = toward(edgePt(i / 22 + r() * .02), .05 + r() * .12); return { x: p.x, y: p.y }; });
      const lines = stars.map((s, i) => { const t = stars[(i + 1) % stars.length]; return draw('M' + f1(s.x) + ',' + f1(s.y) + ' L' + f1(t.x) + ',' + f1(t.y), '#c7d2fe', 1.6, 'cl', 'opacity=".7"'); }).join('');
      const dots = stars.map(s => orb(s.x, s.y, 5, 'url(#st' + u + ')', 'sr', 'opacity="0" filter="url(#g' + u + ')"')).join('');
      const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'.split('').map((g, i) => { const a = i / 24 * TAU; return '<text x="' + f1(CX + Math.cos(a) * 560) + '" y="' + f1(CY + Math.sin(a) * 560) + '" font-size="30" fill="#e0e7ff" text-anchor="middle" dominant-baseline="central" transform="rotate(' + f1(a * 57.3 + 90) + ' ' + f1(CX + Math.cos(a) * 560) + ' ' + f1(CY + Math.sin(a) * 560) + ')">' + g + '</text>'; }).join('');
      return defs(u, rad('st' + u, st(0, '#ffffff') + st(.5, '#a5b4fc') + st(1, '#6366f1', 0)) + lin('cr' + u, st(0, '#818cf8') + st(.5, '#e0e7ff') + st(1, '#22d3ee'), 0, 0, 1, 1)) +
        lines + dots +
        '<g data-k="ring" style="' + org(CX, CY) + '" filter="url(#g' + u + ')" opacity="0"><circle cx="' + CX + '" cy="' + CY + '" r="600" fill="none" stroke="url(#cr' + u + ')" stroke-width="4"/><circle cx="' + CX + '" cy="' + CY + '" r="520" fill="none" stroke="url(#cr' + u + ')" stroke-width="2"/>' + runes + '</g>' +
        orb(CX, CY, 40, 'url(#st' + u + ')', 'gate', 'opacity="0" style="' + org(CX, CY) + '"');
    },
    gather(T, ms) { T.all('sr', (el, i) => T.a(el, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1)' }], 260, { delay: i * (ms / 30) })); T.all('sr', el => { el.style.transformBox = 'fill-box'; el.style.transformOrigin = '50% 50%'; }); T.drawIn('cl', 300, ms / 30); T.all('ring', el => T.a(el, [{ opacity: 0, transform: 'rotate(-40deg) scale(1.2)' }, { opacity: .95, transform: 'rotate(0deg) scale(1)' }], ms)); },
    burst(T) { T.all('ring', el => T.a(el, [{ transform: 'scale(1)', opacity: .95 }, { transform: 'scale(.12) rotate(140deg)', opacity: 1, offset: .35 }, { transform: 'scale(1.6) rotate(180deg)', opacity: 0 }], 760, { easing: 'cubic-bezier(.6,0,.2,1)' })); T.all('gate', el => T.a(el, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(.4)', opacity: 1, offset: .35 }, { transform: 'scale(14)', opacity: 0 }], 760)); },
    linger(T) { T.all('sr', (el, i) => T.a(el, [{ opacity: 1 }, { opacity: 0 }], 500, { delay: i * 25 })); T.fade('cl', .7, 0, 600); },
  },

  // 蝎眼钥匙：双蝎尾节节自下角卷入、钥孔之眼于天顶描画、金砂浮游 → 蝎尾前刺、钥孔透光 → 砂落
  'scorpion-key': {
    build(u, r) {
      const tail = s => { const x0 = s > 0 ? -40 : W + 40, segs = []; for (let i = 0; i < 11; i++) { const t = i / 10, a = Math.PI * (1.15 - t * 1.05); const x = x0 + s * (120 + Math.cos(a) * 220 + t * 120), y = H + 40 - t * 420 + Math.sin(a) * 40; segs.push('<ellipse cx="' + f1(x) + '" cy="' + f1(y) + '" rx="' + f1(30 - i * 1.6) + '" ry="' + f1(22 - i * 1.1) + '" fill="url(#sc' + u + ')"/>'); }
        const tip = segs.length; return '<g data-k="tail" data-s="' + s + '" style="' + org(x0, H + 40) + '" filter="url(#g' + u + ')">' + segs.join('') + '<path d="M' + f1(x0 + s * 300) + ',' + f1(H - 420) + ' q' + s * 50 + ',-20 ' + s * 30 + ',-70 q-' + s * 10 + ',40 -' + s * 30 + ',70Z" fill="#fde68a"/></g>'; };
      const key = 'M' + CX + ',70 m-42,0 a42,42 0 1,0 84,0 a42,42 0 1,0 -84,0 M' + (CX - 18) + ',104 L' + (CX - 30) + ',190 L' + (CX + 30) + ',190 L' + (CX + 18) + ',104';
      const sand = Array.from({ length: 34 }, () => orb(r() * W, H * .5 + r() * H * .5, 1.5 + r() * 2.5, '#fbbf24', 'sa', 'opacity="0"')).join('');
      return defs(u, rad('sc' + u, st(0, '#fde68a') + st(.6, '#a16207', .9) + st(1, '#4c1d95', .6)) + rad('kl' + u, st(0, '#ffffff') + st(.5, '#fde68a', .8) + st(1, '#7c3aed', 0))) +
        tail(1) + tail(-1) + draw(key, '#fde68a', 6, 'key', 'filter="url(#g' + u + ')"') +
        '<ellipse data-k="kl" cx="' + CX + '" cy="120" rx="60" ry="120" fill="url(#kl' + u + ')" opacity="0" style="' + org(CX, 120) + '"/>' + sand;
    },
    gather(T, ms) { T.all('tail', el => { const s = +el.dataset.s; T.a(el, [{ transform: 'translate(' + (-s * 260) + 'px,160px) rotate(' + (-s * 25) + 'deg)', opacity: 0 }, { transform: 'translate(0,0) rotate(0deg)', opacity: 1 }], ms); }); T.drawIn('key', ms * .9); T.all('sa', (el, i) => T.a(el, [{ opacity: 0, transform: 'translate(0,0)' }, { opacity: .9, offset: .4 }, { opacity: .2, transform: 'translate(' + ((i % 5) - 2) * 40 + 'px,-60px)' }], ms, { delay: (i % 9) * 40 })); },
    burst(T) { T.all('tail', el => { const s = +el.dataset.s; T.a(el, [{ transform: 'rotate(0deg)' }, { transform: 'translate(' + s * 80 + 'px,-40px) rotate(' + s * 18 + 'deg)', offset: .3 }, { transform: 'rotate(' + s * 6 + 'deg)', opacity: .7 }], 460, { easing: 'cubic-bezier(.2,1.5,.4,1)' }); }); T.all('kl', el => T.a(el, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1.2)', opacity: 1, offset: .3 }, { transform: 'scaleY(1)', opacity: .6 }], 480)); },
    linger(T) { T.fade('tail', .7, 0, 700); T.fade('key', 1, 0, 600); T.fade('kl', .6, 0, 600); T.all('sa', (el, i) => T.a(el, [{ opacity: .4 }, { opacity: 0, transform: 'translateY(80px)' }], 700, { delay: (i % 6) * 30 })); },
  },

  // 异种坏死雾：菌丝脉络自四缘蔓生、脓泡沿边膨胀 → 脓泡破裂喷出孢子 + 病绿闪 → 孢子飘散
  'xenon-blight-fog': {
    blend: 'normal',
    build(u, r) {
      const veins = Array.from({ length: 20 }, (_, i) => { const p = edgePt(i / 20 + r() * .03), q = toward(p, .3 + r() * .1), c1 = toward(p, .12), b = { x: c1.x + (r() - .5) * 180, y: c1.y + (r() - .5) * 180 }; return draw('M' + f1(p.x) + ',' + f1(p.y) + ' Q' + f1(b.x) + ',' + f1(b.y) + ' ' + f1(q.x) + ',' + f1(q.y), 'url(#vn' + u + ')', f1(3 + r() * 4), 'vn', 'filter="url(#g' + u + ')"'); }).join('');
      const pust = Array.from({ length: 14 }, (_, i) => { const p = toward(edgePt(i / 14 + .03), .06 + r() * .08); return '<g data-k="pu" style="' + org(p.x, p.y) + '"><circle cx="' + f1(p.x) + '" cy="' + f1(p.y) + '" r="' + f1(22 + r() * 22) + '" fill="url(#pu' + u + ')"/></g>'; }).join('');
      const spores = Array.from({ length: 34 }, () => { const p = toward(edgePt(r()), .1); return orb(p.x, p.y, 3 + r() * 4, 'url(#sp' + u + ')', 'sp', 'opacity="0"'); }).join('');
      return defs(u, lin('vn' + u, st(0, '#14532d', .6) + st(.6, '#22c55e') + st(1, '#d9f99d'), 0, 0, 1, 1) + rad('pu' + u, st(0, '#ecfccb', .9) + st(.4, '#84cc16', .8) + st(.85, '#365314', .7) + st(1, '#1a2e05', 0)) + rad('sp' + u, st(0, '#d9f99d') + st(1, '#4d7c0f', 0)) + rad('bl' + u, st(.4, '#14532d', 0) + st(1, '#052e16', .55))) +
        '<rect data-k="bl" width="' + W + '" height="' + H + '" fill="url(#bl' + u + ')" opacity="0"/>' + veins + pust + spores;
    },
    gather(T, ms) { T.fade('bl', 0, 1, ms); T.drawIn('vn', ms * .9, 20, { easing: 'cubic-bezier(.3,0,.7,1)' }); T.all('pu', (el, i) => T.a(el, [{ transform: 'scale(0)' }, { transform: 'scale(1.15)', offset: .8 }, { transform: 'scale(1)' }], ms * .7, { delay: ms * .2 + i * 20 })); },
    burst(T) {
      T.all('pu', el => T.a(el, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.8)', opacity: 0 }], 260, { easing: 'cubic-bezier(.2,1.4,.4,1)' }));
      T.all('sp', (el, i) => { const dx = (CX - +el.getAttribute('cx')) * .25, dy = (CY - +el.getAttribute('cy')) * .25; T.a(el, [{ opacity: 0, transform: 'translate(0,0)' }, { opacity: 1, offset: .2 }, { opacity: 0, transform: 'translate(' + f1(dx) + 'px,' + f1(dy - 40) + 'px)' }], 1100, { delay: (i % 10) * 25 }); });
    },
    linger(T) { T.fade('vn', 1, 0, 800); T.fade('bl', 1, 0, 900); },
  },

  // 圣域帷幕 L4：发光帷幔自天降下、穹顶玫瑰窗缓转 → 帷幕向两侧拉开、十字圣辉 → 光尘
  'sanctum-veil': {
    build(u, r) {
      const drapes = Array.from({ length: 10 }, (_, i) => { const x = i * 160 - 20, w = 200; let d = 'M' + x + ',0'; for (let y = 0; y <= H; y += 60) d += ' Q' + f1(x + w * .5 + Math.sin(y / 90 + i) * 26) + ',' + (y + 30) + ' ' + f1(x + w + Math.sin(y / 120 + i) * 12) + ',' + (y + 60); d += ' L' + x + ',' + H + 'Z'; return '<path data-k="dr" data-i="' + i + '" d="' + d + '" fill="url(#dr' + u + ')" opacity="0"/>'; }).join('');
      const petals = Array.from({ length: 16 }, (_, i) => { const a = i / 16 * TAU; return '<path d="M' + CX + ',-40 Q' + f1(CX + Math.cos(a - .2) * 150) + ',' + f1(-40 + Math.sin(a - .2) * 150) + ' ' + f1(CX + Math.cos(a) * 230) + ',' + f1(-40 + Math.sin(a) * 230) + ' Q' + f1(CX + Math.cos(a + .2) * 150) + ',' + f1(-40 + Math.sin(a + .2) * 150) + ' ' + CX + ',-40Z" fill="url(#rw' + u + ')" opacity=".75"/>'; }).join('');
      const motes = Array.from({ length: 28 }, () => orb(r() * W, r() * H, 2 + r() * 3, 'url(#mt' + u + ')', 'mt', 'opacity="0"')).join('');
      return defs(u, lin('dr' + u, st(0, '#e0f2fe', .55) + st(.4, '#7dd3fc', .28) + st(1, '#0c4a6e', .05), 0, 0, 0, 1) + rad('rw' + u, st(0, '#fef9c3') + st(.6, '#38bdf8', .7) + st(1, '#0369a1', .1)) + rad('mt' + u, st(0, '#ffffff') + st(1, '#7dd3fc', 0)) + lin('cx' + u, st(0, '#fef9c3', 0) + st(.5, '#ffffff', .9) + st(1, '#fef9c3', 0), 0, 0, 1, 0)) +
        '<g data-k="cur" filter="url(#g' + u + ')">' + drapes + '</g>' +
        '<g data-k="rose" style="' + org(CX, -40) + '" filter="url(#g' + u + ')" opacity="0">' + petals + '<circle cx="' + CX + '" cy="-40" r="250" fill="none" stroke="#fef9c3" stroke-width="3"/></g>' +
        '<rect data-k="cv" x="' + (CX - 26) + '" y="0" width="52" height="' + H + '" fill="url(#cx' + u + ')" opacity="0" style="' + org(CX, CY) + '"/><rect data-k="ch" x="0" y="' + (CY - 120) + '" width="' + W + '" height="40" fill="url(#cx' + u + ')" opacity="0" style="' + org(CX, CY - 100) + '"/>' + motes;
    },
    gather(T, ms) { T.all('dr', (el, i) => T.a(el, [{ transform: 'translateY(-100%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], ms * .8, { delay: Math.abs(i - 4.5) * 50, easing: 'cubic-bezier(.3,.8,.3,1)' })); T.all('rose', el => T.a(el, [{ opacity: 0, transform: 'rotate(-30deg) scale(.6)' }, { opacity: 1, transform: 'rotate(0deg) scale(1)' }], ms)); },
    burst(T) {
      T.all('dr', el => { const i = +el.dataset.i, s = i < 5 ? -1 : 1; T.a(el, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + s * (380 + Math.abs(i - 4.5) * 60) + 'px,0) skewX(' + s * 6 + 'deg)', opacity: .45 }], 620, { easing: 'cubic-bezier(.2,.8,.2,1)' }); });
      T.all('cv', el => T.a(el, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1, offset: .3 }, { transform: 'scaleY(1)', opacity: 0 }], 520));
      T.all('ch', el => T.a(el, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: .85, offset: .3 }, { transform: 'scaleX(1)', opacity: 0 }], 520, { delay: 60 }));
    },
    linger(T) { T.fade('cur', 1, 0, 800); T.fade('rose', 1, 0, 800); T.all('mt', (el, i) => T.a(el, [{ opacity: 0, transform: 'translateY(0)' }, { opacity: 1, offset: .3 }, { opacity: 0, transform: 'translateY(-90px)' }], 1100, { delay: (i % 9) * 50 })); },
  },
};

// 播放器：startAtmos 内部使用；返回 { burst, lower, end }，均幂等
// focus：视口像素坐标（真实目标/瞄点）；按 slice 铺满规则换算到 viewBox，供需要锁定目标的构图（重狙准星）使用
export function mountShowpiece(host, id, uid, focus = null) {
  const sp = SHOWPIECES[id];
  if (!sp) return null;
  const r = rng(uid * 7919 + id.length * 131);
  const vw = host.clientWidth || W, vh = host.clientHeight || H, k = Math.max(vw / W, vh / H);
  const F = focus ? { x: (focus.x - (vw - W * k) / 2) / k, y: (focus.y - (vh - H * k) / 2) / k } : { x: CX, y: CY };
  const wrap = document.createElement('div');
  wrap.setAttribute('data-showpiece', id);
  wrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;mix-blend-mode:normal;';
  wrap.innerHTML = (sp.overlay || '') + '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden;mix-blend-mode:' + (sp.blend || 'screen') + ';">' + sp.build(uid, r, F) + '</svg>';
  host.appendChild(wrap);
  const T = tools(wrap);
  let phase = 'gather';
  return {
    el: wrap,
    gather(ms) { sp.gather(T, ms); },
    burst() { if (phase !== 'gather') return; phase = 'burst'; sp.burst(T); },
    lower() { if (phase === 'lower' || phase === 'end') return; if (phase === 'gather') this.burst(); phase = 'lower'; wrap.animate([{ opacity: 1 }, { opacity: .32 }], { duration: 320, delay: 260, fill: 'forwards' }); },
    end() { if (phase === 'end') return; if (phase === 'gather') this.burst(); phase = 'end'; sp.linger(T); wrap.animate([{ opacity: +getComputedStyle(wrap).opacity || .32 }, { opacity: 0 }], { duration: 900, delay: 300, fill: 'forwards' }); },
  };
}
