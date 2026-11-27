// ==========================================
// 角色栏职业粒子剪影：按职业徽记形状采样落点 → 墨色模糊底影 + 暗金柔光粒子在落点附近按职业动势浮动，叠成「烟雾剪影」。
// 状态只读卡片 class（t-current / t-low / t-tp-half / t-tp-full / t-tp-burst / t-down），不碰规则；
// 整体漂移与低血心跳由 CSS 作用在画布外层。全部卡片共用一个 rAF，画布离开 DOM 即回收。
// ==========================================

// 徽记轮廓（viewBox 0..100）：盾 / 双刃斧 / 羽 / 毒瓶 / 匕首 / 星杖 / 圣十字 / 旗枪 / 缺省菱形
const SHAPES = {
  guard:   'M50 6 L88 18 C88 52 74 78 50 94 C26 78 12 52 12 18 Z',
  berserk: 'M46 6 H54 V96 H46 Z M46 18 C28 10 8 24 4 50 C18 42 32 44 46 56 Z M54 18 C72 10 92 24 96 50 C82 42 68 44 54 56 Z',
  swift:   'M82 4 C52 14 28 42 22 78 L14 96 L28 82 C52 76 74 54 88 22 C80 32 70 40 61 43 C74 33 82 20 82 4 Z',
  blight:  'M38 6 H62 V13 H57 V32 C74 40 86 54 86 68 C86 84 70 95 50 95 C30 95 14 84 14 68 C14 54 26 40 43 32 V13 H38 Z',
  stealth: 'M50 2 L60 22 L57 62 H43 L40 22 Z M26 62 H74 V70 H26 Z M44 70 H56 V86 H44 Z M50 84 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z',
  caster:  'M46 34 H54 V96 H46 Z M50 0 L58 17 L77 25 L58 33 L50 50 L42 33 L23 25 L42 17 Z',
  holy:    'M43 14 H57 V35 H78 V49 H57 V94 H43 V49 H22 V35 H43 Z',
  conquer: 'M20 10 L24 0 L28 10 V97 H20 Z M28 12 H88 L73 31 L88 50 H28 Z',
  default: 'M50 6 L90 50 L50 94 L10 50 Z',
};
const SIZE = 130, OFF = 15, N = 300, SPARKS = 22, RING = 40;
const RGB = { gold: '236,210,155', bright: '255,243,214', red: '230,72,88', gray: '150,146,138' };

const sprites = {}, shapeCache = {};
function sprite(name) {
  if (sprites[name]) return sprites[name];
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(' + RGB[name] + ',1)'); gr.addColorStop(0.28, 'rgba(' + RGB[name] + ',.5)'); gr.addColorStop(1, 'rgba(' + RGB[name] + ',0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return (sprites[name] = c);
}
// 形状一次采样：边缘点（暗金描边感）+ 内部点（烟雾填充）+ 墨色模糊底影
function shapeOf(key) {
  if (shapeCache[key]) return shapeCache[key];
  const path = new Path2D(SHAPES[key] || SHAPES.default);
  const m = document.createElement('canvas'); m.width = m.height = 100;
  const mg = m.getContext('2d'); mg.fill(path);
  const d = mg.getImageData(0, 0, 100, 100).data, on = (x, y) => x >= 0 && y >= 0 && x < 100 && y < 100 && d[(y * 100 + x) * 4 + 3] > 128;
  const edge = [], inner = [];
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
    if (!on(x, y)) continue;
    (on(x - 2, y) && on(x + 2, y) && on(x, y - 2) && on(x, y + 2) ? inner : edge).push([x, y]);
  }
  const shadow = document.createElement('canvas'); shadow.width = shadow.height = SIZE;
  const sg = shadow.getContext('2d');
  sg.filter = 'blur(3px)'; sg.translate(OFF, OFF); sg.fillStyle = 'rgba(6,5,4,.9)'; sg.fill(path);
  let cx = 0, cy = 0;
  for (const [x, y] of edge) { cx += x; cy += y; }
  return (shapeCache[key] = { edge, inner, shadow, cx: cx / edge.length + OFF, cy: cy / edge.length + OFF });
}

function makeParticles(shape) {
  const pick = list => list[(Math.random() * list.length) | 0];
  const out = [];
  for (let i = 0; i < N; i++) {
    const isEdge = i < N * 0.48 || !shape.inner.length, [x, y] = pick(isEdge ? shape.edge : shape.inner);
    out.push({ hx: x + OFF + Math.random() - 0.5, hy: y + OFF + Math.random() - 0.5, ph: Math.random(), sp: 0.6 + Math.random() * 0.8,
      s: isEdge ? 5 + Math.random() * 5 : 7 + Math.random() * 9, a: isEdge ? 0.5 + Math.random() * 0.42 : 0.12 + Math.random() * 0.2, edge: isEdge, kind: 'body' });
  }
  for (let i = 0; i < SPARKS; i++) { const [x, y] = pick(shape.edge); out.push({ hx: x + OFF, hy: y + OFF, ph: Math.random(), sp: 0.7 + Math.random() * 0.7, s: 4 + Math.random() * 4, a: 0.9, kind: 'spark' }); }
  for (let i = 0; i < RING; i++) out.push({ ph: i / RING, sp: 0.8 + Math.random() * 0.4, s: 5 + Math.random() * 5, a: 0.5 + Math.random() * 0.4, kind: 'ring' });
  return out;
}

// 职业动势：返回 [dx, dy, alpha 系数]；cyc = 0..1 循环相位
const TAU = Math.PI * 2, cyc = (t, p) => ((t * 0.5 * p.sp + p.ph) % 1);
const MOTION = {
  guard: (p, t, sh) => { const k = Math.sin(t * 1.1 + p.ph * 0.6) * 0.025; return [(p.hx - sh.cx) * k, (p.hy - sh.cy) * k, 0.8 + 0.2 * Math.sin(t * 2 + p.ph * TAU)]; },
  berserk: (p, t) => {
    if (p.edge) return [Math.sin(t * 7 + p.ph * 40) * 0.6, 0, 0.55 + 0.45 * Math.sin(t * 9 + p.ph * 30)];
    const u = cyc(t * 1.4, p); return [Math.sin(t * 3 + p.ph * 20) * 1.6, -u * 16, Math.sin(Math.PI * u) * 1.6];
  },
  swift: (p, t) => { const u = cyc(t * 1.6, p) - 0.5; return [u * 9, -u * 7 + Math.sin(t * 2 + p.ph * 9) * 0.8, 1 - Math.abs(u) * 1.5]; },
  blight: (p, t) => {
    const u = cyc(t * 0.6, p);
    return p.edge ? [Math.sin(t * 1.3 + p.ph * 9) * 1.2, u * 3, 1 - u * 0.6] : [Math.sin(t * 1.7 + p.ph * 11) * 2, -u * 9, Math.sin(Math.PI * u) * 1.5];
  },
  stealth: (p, t) => { const f = Math.max(0, Math.sin(t * 1.6 + p.ph * 12)); return [Math.sin(t * 0.6 + p.ph * 7) * 3.2 + Math.sin(t * 0.25) * 2, Math.cos(t * 0.5 + p.ph * 5), 0.2 + 0.9 * f * f]; },
  caster: (p, t) => { const a = t * 1.7 * p.sp + p.ph * TAU, r = p.edge ? 1.4 : 2.6; return [Math.cos(a) * r, Math.sin(a) * r, 0.65 + 0.35 * Math.sin(t * 3 + p.ph * 20)]; },
  holy: (p, t, sh) => {
    if (p.edge) return [0, 0, 0.7 + 0.3 * Math.sin(t * 2.2 + p.ph * 8)];
    const u = cyc(t * 0.9, p), dx = p.hx - sh.cx, dy = p.hy - sh.cy, l = Math.hypot(dx, dy) || 1;
    return [dx / l * u * 9, dy / l * u * 9, Math.sin(Math.PI * u) * 1.4];
  },
  conquer: (p, t) => { const w = Math.max(0, (p.hx - OFF - 28) / 60); return [Math.sin(t * 2.4 - p.hx * 0.1) * 0.8 * w, Math.sin(t * 3.2 - p.hx * 0.13) * 2.6 * w, 0.75 + 0.25 * Math.sin(t * 2 + p.ph * TAU)]; },
};
MOTION.default = MOTION.guard;

const recs = new Set();
let raf = 0;
function frame(now) {
  raf = 0;
  const t = now / 1000;
  for (const rec of recs) {
    if (!rec.canvas.isConnected) { recs.delete(rec); continue; }
    draw(rec, t);
  }
  if (recs.size) raf = requestAnimationFrame(frame);
}
function draw(rec, t) {
  const { g, shape, parts, card, key } = rec, cl = card.classList;
  const down = cl.contains('t-down'), low = cl.contains('t-low') && !down, full = cl.contains('t-tp-full') && !down;
  const half = (cl.contains('t-tp-half') || full) && !down, cur = cl.contains('t-current');
  if (cl.contains('t-tp-burst') && !rec.burstSeen) { rec.burstSeen = true; rec.burstAt = t; }
  if (!cl.contains('t-tp-burst')) rec.burstSeen = false;
  const be = rec.burstAt == null ? 9 : t - rec.burstAt;
  const push = be < 0.16 ? be / 0.16 : Math.max(0, 1 - (be - 0.16) / 0.95);
  const pushK = push * push * 30;
  const tt = down ? t * 0.2 : full ? t * 1.35 : t;
  g.setTransform(rec.dpr, 0, 0, rec.dpr, 0, 0);
  g.clearRect(0, 0, SIZE, SIZE);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = down ? 0.35 : 0.92;
  g.drawImage(shape.shadow, 0, down ? 5 : 0);
  g.globalCompositeOperation = 'lighter';
  const body = sprite(down ? 'gray' : low ? 'red' : full ? 'bright' : 'gold'), gold = sprite(low ? 'red' : 'gold');
  const gain = (down ? 0.35 : 1) * (cur ? 1.25 : 1) * (half ? 1.15 : 1) * (1 + push * 1.2);
  const mot = MOTION[key] || MOTION.default;
  for (const p of parts) {
    let x, y, a, s = p.s, img = body;
    if (p.kind === 'body') {
      const [dx, dy, am] = mot(p, tt, shape);
      x = p.hx + dx; y = p.hy + dy + (down ? 6 : 0); a = p.a * Math.max(0, am) * gain;
      if (pushK) { const ox = p.hx - shape.cx, oy = p.hy - shape.cy, l = Math.hypot(ox, oy) || 1; x += ox / l * pushK * p.sp; y += oy / l * pushK * p.sp; }
    } else if (p.kind === 'spark') {
      if (!half) continue;
      const u = ((t * (full ? 0.75 : 0.45) * p.sp + p.ph) % 1);
      x = p.hx + Math.sin(t * 2 + p.ph * 17) * 3 - u * 4; y = p.hy - u * 34; a = Math.sin(Math.PI * u) * (full ? 1 : 0.75); img = sprite('bright');
    } else {
      if (!full) continue;
      const ang = t * 1.5 * p.sp + p.ph * TAU, r = 50 + Math.sin(t * 2.3 + p.ph * 13) * 3;
      x = shape.cx + Math.cos(ang) * r; y = shape.cy + Math.sin(ang) * r * 0.92; a = p.a * (0.55 + 0.45 * Math.sin(t * 4 + p.ph * 25)); img = gold;
    }
    if (a <= 0.01) continue;
    g.globalAlpha = Math.min(1, a);
    g.drawImage(img, x - s / 2, y - s / 2, s, s);
  }
}

export function attachEmblemFx(canvas, key, card) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.height = Math.round(SIZE * dpr);
  const shape = shapeOf(SHAPES[key] ? key : 'default');
  recs.add({ canvas, g: canvas.getContext('2d'), key: SHAPES[key] ? key : 'default', card, shape, parts: makeParticles(shape), dpr, burstAt: null, burstSeen: false });
  if (!raf) raf = requestAnimationFrame(frame);
}
