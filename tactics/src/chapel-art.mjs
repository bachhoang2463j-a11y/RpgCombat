// ==========================================
// 礼拜堂底图渲染：权威场景（compileScene 产物）→ 正交俯视 SVG（对齐原型缩略图画法）
// 画法：外壁深色斜纹 / 室内深灰棋盘石砖 + 贴墙内阴影 / 浅色细墙线带冷光 / 中轴暗红长毯（金色点饰）
//       / 长椅、立柱、雕像龛、祭坛、墓碑、挂毯、碎石 / 五点暖灯。
// 只读几何：墙线由格表（void 边界）派生，不另存第二份墙体；本层不产生任何规则数据。
// ==========================================

const Q = 50; // 美术像素/米（与 sandbox/叠加层一致）

function edgesPath(compiled) {
  const { columns, rows } = compiled.grid;
  const isFloor = (c, r) => c >= 0 && r >= 0 && c < columns && r < rows && !compiled.cells[r * columns + c].void;
  // 收集墙线段并合并共线相邻段
  const h = new Map(), v = new Map();
  const add = (m, k, a) => { if (!m.has(k)) m.set(k, []); m.get(k).push(a); };
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
    if (!isFloor(c, r)) continue;
    if (!isFloor(c, r - 1)) add(h, r, c);
    if (!isFloor(c, r + 1)) add(h, r + 1, c);
    if (!isFloor(c - 1, r)) add(v, c, r);
    if (!isFloor(c + 1, r)) add(v, c + 1, r);
  }
  const runs = (list) => { list.sort((a, b) => a - b); const out = []; let s = list[0], p = list[0]; for (let i = 1; i < list.length; i++) { if (list[i] === p + 1) { p = list[i]; continue; } out.push([s, p + 1]); s = p = list[i]; } out.push([s, p + 1]); return out; };
  let d = '';
  for (const [y, xs] of h) for (const [a, b] of runs(xs)) d += 'M' + a * Q + ' ' + y * Q + 'H' + b * Q;
  for (const [x, ys] of v) for (const [a, b] of runs(ys)) d += 'M' + x * Q + ' ' + a * Q + 'V' + b * Q;
  return d;
}

const rect = (b, inset = 0) => ({ x: b.col * Q + inset, y: b.row * Q + inset, w: b.width * Q - inset * 2, h: b.height * Q - inset * 2 });

function pew(b) {
  const r = rect(b, 6);
  const horiz = b.width >= b.height;
  return '<g class="pew">' +
    '<rect x="' + (r.x + 3) + '" y="' + (r.y + 6) + '" width="' + r.w + '" height="' + r.h + '" rx="3" fill="rgba(0,0,0,0.5)"/>' +
    '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="3" fill="url(#g-wood)" stroke="#2b1a12" stroke-width="1.5"/>' +
    (horiz ? '<rect x="' + (r.x + 2) + '" y="' + (r.y + 2) + '" width="' + (r.w - 4) + '" height="7" rx="2" fill="#8e5d3c" opacity="0.85"/>' +
      '<rect x="' + r.x + '" y="' + r.y + '" width="7" height="' + r.h + '" rx="2" fill="#3d2417"/><rect x="' + (r.x + r.w - 7) + '" y="' + r.y + '" width="7" height="' + r.h + '" rx="2" fill="#3d2417"/>' : '') +
    '</g>';
}
function pewGroup(o) {
  if (!o.cells || o.bounds.width === 1 || o.bounds.height === 1) return pew(o.bounds);
  return o.cells.map(c => pew({ ...c, width: 1, height: 1 })).join('');
}

function wallGroup(o) {
  return (o.cells || []).map(c => {
    const r = rect({ ...c, width: 1, height: 1 });
    return '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" fill="#262c34" stroke="#55616f" stroke-width="1.2"/>';
  }).join('');
}

function chapelSteps(o) {
  const { x } = rect(o.bounds);
  const cx = x + o.bounds.width * Q / 2;
  const north = o.facing === 0;
  const edge = (o.bounds.row + 1) * Q;
  return '<g class="chapel-steps" transform="translate(' + cx + ' ' + edge + ') scale(1 ' + (north ? 1 : -1) + ')">' +
    '<path d="M-95 2V-20H-75V-41H75V-20H95V2Z" fill="#242b34" stroke="#8a9aaf" stroke-width="2"/>' +
    '<path d="M-91-3H91M-87-13H87M-72-24H72M-65-35H65" stroke="#5f6a79" stroke-width="2"/>' +
    '<path d="M-67 2H67" stroke="#b3a18c" stroke-width="2"/>' +
    '<path d="M-43-1V-18H43V-1Z" fill="#481d25" opacity=".85"/></g>';
}

function pillar(b) {
  const cx = (b.col + b.width / 2) * Q, cy = (b.row + b.height / 2) * Q, R1 = Math.min(b.width, b.height) * Q * 0.46;
  const oct = (rad) => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + i * Math.PI / 4; return (cx + Math.cos(a) * rad).toFixed(1) + ',' + (cy + Math.sin(a) * rad).toFixed(1); }).join(' ');
  return '<g class="pillar"><circle cx="' + (cx + 4) + '" cy="' + (cy + 7) + '" r="' + R1 + '" fill="rgba(0,0,0,0.55)"/>' +
    '<polygon points="' + oct(R1) + '" fill="#262c34" stroke="#a9b4c2" stroke-width="2.2"/>' +
    '<polygon points="' + oct(R1 * 0.72) + '" fill="#1d2229" stroke="#66717f" stroke-width="1.4"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R1 * 0.28) + '" fill="none" stroke="#8994a2" stroke-width="1.4"/></g>';
}
function statue(b) {
  const r = rect(b, 4), cx = r.x + r.w / 2;
  return '<g class="statue"><rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" fill="#1a1f26" stroke="#8b96a4" stroke-width="1.6"/>' +
    '<rect x="' + (r.x + 5) + '" y="' + (r.y + 5) + '" width="' + (r.w - 10) + '" height="' + (r.h - 10) + '" fill="#3b2a1f" stroke="#7a5c3c" stroke-width="1"/>' +
    '<circle cx="' + cx + '" cy="' + (r.y + 13) + '" r="4" fill="#cbbfa6"/><path d="M' + cx + ' ' + (r.y + 17) + 'V' + (r.y + r.h - 9) + 'M' + (cx - 6) + ' ' + (r.y + 22) + 'H' + (cx + 6) + 'M' + cx + ' ' + (r.y + r.h - 9) + 'l-5 5M' + cx + ' ' + (r.y + r.h - 9) + 'l5 5" stroke="#cbbfa6" stroke-width="1.6" fill="none"/></g>';
}
function altar(b) {
  const r = rect(b, 3);
  const candles = [0.14, 0.86].map(k => { const x = r.x + r.w * k, y = r.y + 7; return '<circle cx="' + x + '" cy="' + y + '" r="11" fill="url(#g-candle)"/><circle cx="' + x + '" cy="' + y + '" r="2.6" fill="#fff4cf"/>'; }).join('');
  return '<g class="altar"><rect x="' + (r.x - 8) + '" y="' + (r.y - 8) + '" width="' + (r.w + 16) + '" height="' + (r.h + 16) + '" rx="6" fill="url(#g-altar-glow)"/>' +
    '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="2" fill="#d8d0c1" stroke="#8c7f69" stroke-width="1.5"/>' +
    '<rect x="' + (r.x + r.w * 0.38) + '" y="' + r.y + '" width="' + (r.w * 0.24) + '" height="' + r.h + '" fill="#8e2229"/>' +
    '<rect x="' + (r.x + 3) + '" y="' + (r.y + r.h - 6) + '" width="' + (r.w - 6) + '" height="3" fill="#b8913f"/>' + candles + '</g>';
}
function tomb(b) {
  const r = rect(b, 6), cx = r.x + r.w / 2;
  return '<g class="tomb"><rect x="' + (r.x + 3) + '" y="' + (r.y + 5) + '" width="' + r.w + '" height="' + r.h + '" rx="4" fill="rgba(0,0,0,0.5)"/>' +
    '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="5" fill="#2f3741" stroke="#7d8b9c" stroke-width="1.6"/>' +
    '<rect x="' + (r.x - 2) + '" y="' + (r.y - 2) + '" width="' + (r.w + 4) + '" height="' + (r.h + 4) + '" rx="6" fill="none" stroke="rgba(120,170,230,0.28)" stroke-width="3"/>' +
    '<path d="M' + cx + ' ' + (r.y + 10) + 'V' + (r.y + 30) + 'M' + (cx - 7) + ' ' + (r.y + 16) + 'H' + (cx + 7) + '" stroke="#9fb0c3" stroke-width="2"/>' +
    [44, 54, 64].map(dy => '<path d="M' + (r.x + 6) + ' ' + (r.y + dy) + 'H' + (r.x + r.w - 6) + '" stroke="#5c6878" stroke-width="1.4"/>').join('') + '</g>';
}
function banner(o) {
  const b = o.bounds, west = o.side !== 'e';
  const x = west ? b.col * Q + 4 : (b.col + b.width) * Q - 22, y = b.row * Q + 10, w = 18, h = b.height * Q - 20;
  return '<g class="banner"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#4b151a" stroke="#8a2f35" stroke-width="1.4"/>' +
    '<rect x="' + (x + 3) + '" y="' + (y + 3) + '" width="' + (w - 6) + '" height="' + (h - 6) + '" fill="none" stroke="#6b2228" stroke-width="1"/>' +
    '<path d="M' + (x + w / 2) + ' ' + (y + h / 2 - 7) + 'v14M' + (x + w / 2 - 5) + ' ' + (y + h / 2) + 'h10" stroke="#c46a5c" stroke-width="1.6"/></g>';
}
function rubble(b, seed) {
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const r = rect(b, 4);
  let out = '<g class="rubble">';
  const n = Math.max(3, Math.round(b.width * b.height * 2.2));
  for (let i = 0; i < n; i++) {
    const cx = r.x + rnd() * r.w, cy = r.y + rnd() * r.h, rad = 4 + rnd() * 8;
    const pts = Array.from({ length: 5 }, (_, k) => { const a = k / 5 * Math.PI * 2 + rnd() * 0.6; const rr = rad * (0.6 + rnd() * 0.5); return (cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1); }).join(' ');
    out += '<polygon points="' + pts + '" fill="' + (rnd() < 0.5 ? '#4b525c' : '#5f5048') + '" stroke="#1c2026" stroke-width="1"/>';
  }
  return out + '</g>';
}
function lantern(at) {
  const x = at.col * Q, y = at.row * Q;
  const petals = [0, 72, 144, 216, 288].map(deg => { const a = (deg - 90) * Math.PI / 180; return '<circle cx="' + (x + Math.cos(a) * 6).toFixed(1) + '" cy="' + (y + Math.sin(a) * 6).toFixed(1) + '" r="2.6" fill="#ffe6b8"/>'; }).join('');
  return '<g class="lantern"><circle cx="' + x + '" cy="' + y + '" r="30" fill="url(#g-lamp)"/>' + petals + '<circle cx="' + x + '" cy="' + y + '" r="1.8" fill="#fff8e6"/></g>';
}
function carpet(b) {
  const r = rect(b, 3);
  let dots = '';
  for (let y = r.y + 30; y < r.y + r.h - 10; y += 100) dots += '<path d="M' + (r.x + r.w / 2) + ' ' + (y - 6) + 'l6 6l-6 6l-6-6z" fill="#c99a4a" opacity="0.75"/>';
  return '<g class="carpet"><rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" fill="url(#g-carpet)" stroke="#3f0c10" stroke-width="3"/>' +
    '<rect x="' + (r.x + 6) + '" y="' + (r.y + 2) + '" width="' + (r.w - 12) + '" height="' + (r.h - 4) + '" fill="none" stroke="#a8343b" stroke-width="1.2" opacity="0.7"/>' + dots + '</g>';
}

export function renderChapelArt(compiled) {
  const { columns, rows } = compiled.grid;
  const W = columns * Q, H = rows * Q;
  const floor = compiled.floor || [];
  const floorRects = floor.map(f => { const r = rect(f); return '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '"/>'; }).join('');
  const objs = [...compiled.objectsIndex.values()];
  const by = k => objs.filter(o => o.kind === k);
  const wallD = edgesPath(compiled);
  const defs =
    '<defs>' +
      '<pattern id="p-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#11161d"/><path d="M0 0V7" stroke="#1a2129" stroke-width="2"/></pattern>' +
      '<pattern id="p-check" width="100" height="100" patternUnits="userSpaceOnUse">' +
        '<rect width="100" height="100" fill="#2a3038"/><rect width="50" height="50" fill="#323944"/><rect x="50" y="50" width="50" height="50" fill="#323944"/>' +
        '<path d="M0 .5H100M0 50.5H100M.5 0V100M50.5 0V100" stroke="#1d2228" stroke-width="1"/>' +
        '<path d="M1 1.5H49M51 51.5H99" stroke="#3d4551" stroke-width="1" opacity="0.6"/></pattern>' +
      '<filter id="f-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.55  0 0 0 0 0.6  0 0 0 0.10 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>' +
      '<filter id="f-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<filter id="f-glow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4"/></filter>' +
      '<clipPath id="c-floor">' + floorRects + '</clipPath>' +
      '<linearGradient id="g-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e4932"/><stop offset="1" stop-color="#4a2f20"/></linearGradient>' +
      '<linearGradient id="g-carpet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5b1217"/><stop offset=".5" stop-color="#7d1b22"/><stop offset="1" stop-color="#5b1217"/></linearGradient>' +
      '<radialGradient id="g-lamp"><stop offset="0" stop-color="rgba(255,210,150,0.55)"/><stop offset="1" stop-color="rgba(255,190,120,0)"/></radialGradient>' +
      '<radialGradient id="g-candle"><stop offset="0" stop-color="rgba(255,225,160,0.85)"/><stop offset="1" stop-color="rgba(255,200,120,0)"/></radialGradient>' +
      '<radialGradient id="g-altar-glow"><stop offset="0" stop-color="rgba(255,220,170,0.35)"/><stop offset="1" stop-color="rgba(255,220,170,0)"/></radialGradient>' +
    '</defs>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="display:block">' + defs +
    '<rect width="' + W + '" height="' + H + '" fill="url(#p-hatch)"/>' +
    '<g clip-path="url(#c-floor)">' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#p-check)"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="#000" filter="url(#f-grain)" opacity="0.9"/>' +
      by('carpet').map(o => carpet(o.bounds)).join('') +
      '<path d="' + wallD + '" stroke="rgba(0,0,0,0.75)" stroke-width="30" fill="none" filter="url(#f-soft)"/>' +
    '</g>' +
    by('rubble').map((o, i) => rubble(o.bounds, i + 3)).join('') +
    by('banner').map(banner).join('') +
    by('pew').map(pewGroup).join('') +
    by('wall').map(wallGroup).join('') +
    by('tomb').map(o => tomb(o.bounds)).join('') +
    by('altar').map(o => altar(o.bounds)).join('') +
    by('statue').map(o => statue(o.bounds)).join('') +
    by('pillar').map(o => pillar(o.bounds)).join('') +
    '<path d="' + wallD + '" stroke="rgba(140,185,235,0.45)" stroke-width="7" fill="none" stroke-linecap="square" filter="url(#f-glow)"/>' +
    '<path d="' + wallD + '" stroke="#d3dde9" stroke-width="2.4" fill="none" stroke-linecap="square"/>' +
    by('chapelSteps').map(chapelSteps).join('') +
    by('light').map(o => lantern(o.at)).join('') +
    '</svg>';
}
