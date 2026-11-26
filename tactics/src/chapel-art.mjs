// ==========================================
// 礼拜堂底图渲染：权威场景（compileScene 产物）→ 正交俯视 SVG（对齐原型缩略图画法）
// 画法：外壁深色斜纹 / 室内深灰棋盘石砖 + 贴墙内阴影 / 浅色细墙线带冷光 / 中轴暗红长毯（金色点饰）
//       / 长椅、立柱、雕像龛、祭坛、墓碑、挂毯、碎石 / 五点暖灯。
//       单房间另有：圣坛台面与彩窗、烛台、布道坛、读经台、告解亭、圣器柜、圣水池、南墙大门。
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
// 东侧物件按西侧画法绕自身中线水平镜像
const flipX = (b, side, body) => side === 'e' ? `<g transform="translate(${(b.col * 2 + b.width) * Q} 0) scale(-1 1)">${body}</g>` : body;
const octPoints = (cx, cy, rad) => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + i * Math.PI / 4; return (cx + Math.cos(a) * rad).toFixed(1) + ',' + (cy + Math.sin(a) * rad).toFixed(1); }).join(' ');

// 长椅：南侧靠背、北侧跪凳；variant=toppled 仰倒露出椅腿，broken 外端断裂（西侧画法，东侧镜像）
function pew(b, variant, side) {
  const { x, y, w, h } = rect(b, 6);
  if (b.width < b.height) return `<g class="pew"><rect x="${x + 3}" y="${y + 6}" width="${w}" height="${h}" rx="3" fill="rgba(0,0,0,0.5)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#g-wood)" stroke="#2b1a12" stroke-width="1.5"/></g>`;
  const cx = x + w / 2, cy = y + h / 2;
  if (variant === 'toppled') {
    const n = Math.max(2, b.width);
    const legs = Array.from({ length: n }, (_, i) => `<rect x="${(x + 8 + i * (w - 21) / (n - 1)).toFixed(1)}" y="${y - 5}" width="5" height="9" fill="#24160e"/>`).join('');
    return '<g class="pew pew-toppled">' + flipX(b, side,
      `<path d="M${x + 6} ${y + h + 9}L${x + w - 10} ${y + h + 4}M${x + 14} ${y + h + 13}L${x + w - 24} ${y + h + 9}" stroke="rgba(205,195,175,0.14)" stroke-width="2"/>` +
      `<g transform="rotate(-5 ${cx} ${cy})">` +
      `<rect x="${x + 4}" y="${y + 9}" width="${w}" height="${h - 4}" rx="3" fill="rgba(0,0,0,0.55)"/>` + legs +
      `<rect x="${x}" y="${y + 12}" width="${w}" height="${h - 12}" rx="2" fill="url(#g-wood)" stroke="#2b1a12" stroke-width="1.5"/>` +
      `<path d="M${x + 4} ${y + 20}H${x + w - 4}M${x + 4} ${y + 28}H${x + w - 4}" stroke="rgba(0,0,0,0.28)" stroke-width="1"/>` +
      `<rect x="${x + 3}" y="${y + 2}" width="${w - 6}" height="10" rx="2" fill="#3d2417" stroke="#22140c" stroke-width="1"/></g>`) + '</g>';
  }
  const broken = variant === 'broken';
  const body = broken
    ? `<path d="M${x + w} ${y}H${x + 9}L${x + 2} ${y + 7}L${x + 8} ${y + 14}L${x} ${y + 21}L${x + 7} ${y + 29}L${x + 3} ${y + h}H${x + w}Z" fill="url(#g-wood)" stroke="#2b1a12" stroke-width="1.5"/>` +
      `<path d="M${x + 2} ${y + 9}l-9 -4M${x + 1} ${y + 20}l-11 2M${x + 4} ${y + 31}l-8 6" stroke="#6e4932" stroke-width="2" stroke-linecap="round"/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#g-wood)" stroke="#2b1a12" stroke-width="1.5"/>` +
      `<rect x="${x}" y="${y}" width="7" height="${h}" rx="2" fill="#3d2417"/>`;
  return '<g class="pew">' + flipX(b, side,
    `<rect x="${x + 3}" y="${y + 6}" width="${w}" height="${h}" rx="3" fill="rgba(0,0,0,0.5)"/>` +
    `<rect x="${x + 9}" y="${y - 4}" width="${w - 18}" height="5" rx="1.5" fill="#2e1c12"/>` + body +
    `<path d="M${x + 9} ${y + 11}H${x + w - 8}M${x + 9} ${y + 19}H${x + w - 8}" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>` +
    `<rect x="${x + (broken ? 6 : 2)}" y="${y + h - 10}" width="${w - (broken ? 8 : 4)}" height="8" rx="2" fill="#8e5d3c" opacity="0.9"/>` +
    `<rect x="${x + w - 7}" y="${y}" width="7" height="${h}" rx="2" fill="#3d2417"/>`) + '</g>';
}
function pewGroup(o) {
  if (!o.cells || o.bounds.width === 1 || o.bounds.height === 1) return pew(o.bounds, o.variant, o.side);
  return o.cells.map(c => pew({ ...c, width: 1, height: 1 })).join('');
}

function wallGroup(o) {
  return (o.cells || []).map(c => {
    const r = rect({ ...c, width: 1, height: 1 });
    return '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" fill="#262c34" stroke="#55616f" stroke-width="1.2"/>';
  }).join('');
}

// ---------- 圣坛：抬高大理石台面（前沿两级台阶 + 金边红毯）、后墙彩窗及其落光 ----------
function dais(o) {
  const { x, y, w, h } = rect(o.bounds), cx = x + w / 2;
  return '<g class="dais">' +
    `<rect x="${x}" y="${y + h - 6}" width="${w}" height="22" fill="rgba(0,0,0,0.5)" filter="url(#f-soft)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#p-marble)" stroke="#8f9aa8" stroke-width="2"/>` +
    `<rect x="${x - 6}" y="${y + h - 18}" width="${w + 12}" height="9" fill="#5d6470" stroke="#9aa6b5" stroke-width="1.2"/>` +
    `<rect x="${x - 12}" y="${y + h - 9}" width="${w + 24}" height="9" fill="#4a5059" stroke="#8a96a5" stroke-width="1.2"/>` +
    `<rect x="${cx - 150}" y="${y + 4}" width="300" height="${h - 26}" fill="#5b1217" stroke="#c99a4a" stroke-width="2"/>` +
    `<rect x="${cx - 143}" y="${y + 10}" width="286" height="${h - 38}" fill="none" stroke="#8e2a30" stroke-width="1.4"/>` +
    '</g>';
}
const APSE_GLASS = [['b', -200], ['y', 0], ['r', 200]];
function apseLight(o) {
  const cx = (o.bounds.col + o.bounds.width / 2) * Q, top = (o.bounds.row + 1) * Q;
  return '<g class="apse-light" filter="url(#f-soft)">' + APSE_GLASS.map(([c, dx]) => {
    const wx = cx + dx, spread = dx ? 70 : 90, drift = dx * 0.15;
    return `<path d="M${wx - 16} ${top}H${wx + 16}L${wx + spread + drift} ${top + 200}H${wx - spread + drift}Z" fill="url(#g-ray-${c})"/>`;
  }).join('') + '</g>';
}
function apseWindows(o) {
  const cx = (o.bounds.col + o.bounds.width / 2) * Q, y = o.bounds.row * Q, ry = y + 25;
  const lancet = (wx, c) => {
    const d = `M${wx - 13} ${y + 46}V${y + 22}Q${wx - 13} ${y + 10} ${wx} ${y + 5}Q${wx + 13} ${y + 10} ${wx + 13} ${y + 22}V${y + 46}Z`;
    return `<path d="${d}" fill="url(#g-glass-${c})" opacity="0.7" filter="url(#f-glow)"/>` +
      `<path d="${d}" fill="url(#g-glass-${c})" stroke="#8a96a5" stroke-width="2"/>` +
      `<path d="M${wx} ${y + 8}V${y + 46}M${wx - 13} ${y + 27}H${wx + 13}M${wx - 13} ${y + 37}H${wx + 13}" stroke="#0d1014" stroke-width="1.6"/>`;
  };
  const spokes = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${cx} ${ry}L${(cx + Math.cos(a) * 20).toFixed(1)} ${(ry + Math.sin(a) * 20).toFixed(1)}" stroke="#0d1014" stroke-width="1.5"/>`; }).join('');
  return '<g class="apse">' + lancet(cx - 200, 'b') + lancet(cx + 200, 'r') +
    `<circle cx="${cx}" cy="${ry}" r="24" fill="rgba(255,215,140,0.45)" filter="url(#f-glow)"/>` +
    `<circle cx="${cx}" cy="${ry}" r="20" fill="url(#g-glass-y)" stroke="#8a96a5" stroke-width="2.2"/>` + spokes +
    `<circle cx="${cx}" cy="${ry}" r="7" fill="#c8323c" stroke="#0d1014" stroke-width="1.5"/></g>`;
}

// ---------- 圣坛陈设：落地烛台、布道坛（带梯）、读经台 ----------
function candelabra(b) {
  const cx = (b.col + 0.5) * Q, cy = (b.row + 0.5) * Q;
  const flames = [0, 72, 144, 216, 288].map(deg => {
    const a = (deg - 90) * Math.PI / 180, px = (cx + Math.cos(a) * 13).toFixed(1), py = (cy + Math.sin(a) * 13).toFixed(1);
    return `<circle cx="${px}" cy="${py}" r="3.4" fill="#efe3c4"/><circle cx="${px}" cy="${py}" r="1.8" fill="#ffcf6a"/>`;
  }).join('');
  return `<g class="candelabra"><circle cx="${cx}" cy="${cy}" r="46" fill="url(#g-candle)" opacity="0.55"/>` +
    `<circle cx="${cx + 3}" cy="${cy + 5}" r="17" fill="rgba(0,0,0,0.5)"/>` +
    `<path d="M${cx - 16} ${cy + 14}L${cx} ${cy}L${cx + 16} ${cy + 14}M${cx} ${cy}V${cy - 18}" stroke="#1d1a17" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="#8a7448" stroke-width="3"/>` +
    `<circle cx="${cx}" cy="${cy}" r="5" fill="#6b5a38" stroke="#b39a62" stroke-width="1.2"/>` + flames + '</g>';
}
function pulpit(o) {
  // 八角讲坛靠中道一侧，外侧一段直梯向南落到台面
  const b = o.bounds, x = b.col * Q, y = b.row * Q, cx = x + 62, cy = y + 42, sy = cy - 4, sh = y + 96 - sy;
  const stairs = `<rect x="${x + 6}" y="${sy}" width="20" height="${sh}" fill="#4a2f20" stroke="#2b1a12" stroke-width="1.2"/>` +
    [1, 2, 3, 4, 5].map(i => `<path d="M${x + 7} ${(sy + i * sh / 6).toFixed(1)}h18" stroke="#8e5d3c" stroke-width="1.6"/>`).join('') +
    `<path d="M${x + 5} ${sy}V${y + 96}" stroke="#b8913f" stroke-width="2"/>`;
  return '<g class="pulpit">' + flipX(b, o.side,
    `<rect x="${x + 9}" y="${sy + 5}" width="20" height="${sh}" fill="rgba(0,0,0,0.5)"/>` +
    `<polygon points="${octPoints(cx + 4, cy + 7, 33)}" fill="rgba(0,0,0,0.55)"/>` + stairs +
    `<polygon points="${octPoints(cx, cy, 32)}" fill="url(#g-wood)" stroke="#2b1a12" stroke-width="2"/>` +
    `<polygon points="${octPoints(cx, cy, 28)}" fill="none" stroke="#b8913f" stroke-width="1.4" opacity="0.7"/>` +
    `<polygon points="${octPoints(cx, cy, 21)}" fill="#24160e" stroke="#4a2f20" stroke-width="1.2"/>` +
    `<rect x="${cx + 15}" y="${cy - 12}" width="12" height="24" rx="2" fill="#6e4932" stroke="#2b1a12" stroke-width="1"/>` +
    `<rect x="${cx + 16}" y="${cy - 10}" width="10" height="9.5" fill="#e7dcc4"/><rect x="${cx + 16}" y="${cy + 0.5}" width="10" height="9.5" fill="#ddd1b6"/>`) + '</g>';
}
function lectern(b) {
  const cx = (b.col + 0.5) * Q, cy = (b.row + 0.5) * Q;
  return `<g class="lectern"><circle cx="${cx + 3}" cy="${cy + 6}" r="15" fill="rgba(0,0,0,0.5)"/>` +
    `<circle cx="${cx}" cy="${cy + 4}" r="9" fill="#2b1a12" stroke="#4a2f20" stroke-width="1.2"/>` +
    `<polygon points="${cx - 16},${cy - 13} ${cx + 16},${cy - 13} ${cx + 19},${cy + 9} ${cx - 19},${cy + 9}" fill="url(#g-wood)" stroke="#2b1a12" stroke-width="1.5"/>` +
    `<rect x="${cx - 14}" y="${cy - 10}" width="13" height="16" fill="#e9dfc8" stroke="#9b8b6c" stroke-width="0.8"/>` +
    `<rect x="${cx + 1}" y="${cy - 10}" width="13" height="16" fill="#e1d6bc" stroke="#9b8b6c" stroke-width="0.8"/>` +
    `<path d="M${cx - 11} ${cy - 5}h8M${cx - 11} ${cy - 1}h8M${cx + 4} ${cy - 5}h8M${cx + 4} ${cy - 1}h8" stroke="#8c7d62" stroke-width="0.8"/>` +
    `<path d="M${cx} ${cy - 10}V${cy + 12}" stroke="#9e2a30" stroke-width="1.6"/></g>`;
}

// ---------- 侧廊陈设：告解亭、圣器柜（西侧画法，东侧镜像） ----------
function confessional(o) {
  const b = o.bounds, { x, y, w, h } = rect(b, 3), mx = x + 5 + (w - 18) / 2, my = y + h / 2;
  const curtain = cy => `<rect x="${x + w - 11}" y="${cy}" width="11" height="22" fill="#6b1a20" stroke="#3a0d11" stroke-width="1"/>` +
    `<path d="M${x + w - 7} ${cy + 2}V${cy + 20}M${x + w - 3} ${cy + 2}V${cy + 20}" stroke="#8e2a30" stroke-width="1"/>`;
  return '<g class="confessional">' + flipX(b, o.side,
    `<rect x="${x + 4}" y="${y + 7}" width="${w}" height="${h}" rx="3" fill="rgba(0,0,0,0.55)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#4a2f20" stroke="#22140c" stroke-width="2"/>` +
    `<rect x="${x + 5}" y="${y + 5}" width="${w - 18}" height="${h - 10}" fill="url(#g-wood)" stroke="#8e5d3c" stroke-width="1.2"/>` +
    `<path d="M${x + 5} ${y + h / 3}H${x + w - 13}M${x + 5} ${y + h * 2 / 3}H${x + w - 13}" stroke="#22140c" stroke-width="3"/>` +
    `<path d="M${mx} ${my - 9}V${my + 9}M${mx - 6} ${my - 3}H${mx + 6}" stroke="#c9a35a" stroke-width="2"/>` +
    curtain(y + 6) + curtain(y + h - 28) +
    `<rect x="${x + w - 10}" y="${my - 12}" width="9" height="24" fill="#2b1a12" stroke="#1a0f08" stroke-width="1"/>` +
    `<circle cx="${x + w - 4}" cy="${my}" r="1.8" fill="#c9a35a"/>`) + '</g>';
}
function cabinet(o) {
  const b = o.bounds, { x, y, w, h } = rect(b, 4), tx = x + 4 + (w - 14) / 2, ky = y + h * 0.55;
  return '<g class="cabinet">' + flipX(b, o.side,
    `<rect x="${x + 4}" y="${y + 6}" width="${w}" height="${h}" rx="2" fill="rgba(0,0,0,0.55)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#3d2417" stroke="#1d110a" stroke-width="2"/>` +
    `<rect x="${x + 4}" y="${y + 4}" width="${w - 14}" height="${h - 8}" fill="url(#g-wood)" stroke="#8e5d3c" stroke-width="1"/>` +
    `<rect x="${x + w - 9}" y="${y + 2}" width="8" height="${h - 4}" fill="#2b1a12"/>` +
    `<path d="M${x + w - 9} ${y + h / 2}h8" stroke="#1a0f08" stroke-width="1.5"/>` +
    `<circle cx="${x + w - 5}" cy="${y + h / 2 - 6}" r="1.8" fill="#c9a35a"/><circle cx="${x + w - 5}" cy="${y + h / 2 + 6}" r="1.8" fill="#c9a35a"/>` +
    `<rect x="${x + 8}" y="${ky}" width="${w - 22}" height="20" fill="#e6dfd0" stroke="#a79e8a" stroke-width="0.8"/>` +
    `<path d="M${tx} ${ky + 4}v12M${tx - 5} ${ky + 9}h10" stroke="#b8913f" stroke-width="1.4"/>` +
    `<circle cx="${tx}" cy="${y + 18}" r="7" fill="#b8913f" stroke="#7a5c24" stroke-width="1.2"/>` +
    `<circle cx="${tx}" cy="${y + 18}" r="3.4" fill="#5b3c12"/>`) + '</g>';
}

// ---------- 入口：南墙双开大门（门槛、门垫、门缝冷光）与门内圣水池 ----------
function chapelDoor(o) {
  const { x, y, w } = rect(o.bounds), cx = x + w / 2, lw = w / 2 - 4;
  const leaf = lx => `<rect x="${lx}" y="${y + 3}" width="${lw}" height="36" fill="url(#g-wood)" stroke="#2b1a12" stroke-width="1.5"/>` +
    Array.from({ length: 5 }, (_, i) => `<path d="M${(lx + (i + 1) * lw / 6).toFixed(1)} ${y + 4}V${y + 38}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>`).join('') +
    `<path d="M${lx} ${y + 11}h${lw}M${lx} ${y + 31}h${lw}" stroke="#1b1d20" stroke-width="3"/>`;
  return '<g class="chapel-door">' +
    `<ellipse cx="${cx}" cy="${y - 6}" rx="${w / 2}" ry="22" fill="rgba(150,180,230,0.16)" filter="url(#f-soft)"/>` +
    `<rect x="${x + 18}" y="${y - 52}" width="${w - 36}" height="40" rx="2" fill="#3a2a1e" stroke="#1d140d" stroke-width="1.5"/>` +
    `<rect x="${x + 24}" y="${y - 46}" width="${w - 48}" height="28" fill="none" stroke="#6b4a2c" stroke-width="1.4"/>` +
    `<rect x="${x - 6}" y="${y - 12}" width="${w + 12}" height="12" fill="#5d6470" stroke="#9aa6b5" stroke-width="1.4"/>` +
    `<rect x="${x - 14}" y="${y}" width="${w + 28}" height="48" fill="#20262e" stroke="#8a96a5" stroke-width="2"/>` +
    leaf(x + 2) + leaf(cx + 2) +
    `<path d="M${cx} ${y + 3}V${y + 39}" stroke="rgba(170,200,255,0.65)" stroke-width="2"/>` +
    `<circle cx="${cx - 9}" cy="${y + 21}" r="4.5" fill="none" stroke="#b89a5a" stroke-width="1.8"/><circle cx="${cx + 9}" cy="${y + 21}" r="4.5" fill="none" stroke="#b89a5a" stroke-width="1.8"/>` +
    '</g>';
}
function font(b) {
  const cx = (b.col + 0.5) * Q, cy = (b.row + 0.5) * Q;
  return `<g class="font"><circle cx="${cx + 3}" cy="${cy + 6}" r="19" fill="rgba(0,0,0,0.5)"/>` +
    `<polygon points="${octPoints(cx, cy, 19)}" fill="#3b424c" stroke="#9aa6b5" stroke-width="1.6"/>` +
    `<circle cx="${cx}" cy="${cy}" r="13" fill="url(#g-water)" stroke="#c3ccd6" stroke-width="1.4"/>` +
    `<path d="M${cx - 7} ${cy - 6}Q${cx} ${cy - 11} ${cx + 7} ${cy - 6}" stroke="rgba(230,240,255,0.6)" stroke-width="1.4" fill="none"/></g>`;
}

function pillar(b) {
  const cx = (b.col + b.width / 2) * Q, cy = (b.row + b.height / 2) * Q, R1 = Math.min(b.width, b.height) * Q * 0.46;
  const oct = (rad) => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + i * Math.PI / 4; return (cx + Math.cos(a) * rad).toFixed(1) + ',' + (cy + Math.sin(a) * rad).toFixed(1); }).join(' ');
  return '<g class="pillar"><circle cx="' + (cx + 4) + '" cy="' + (cy + 7) + '" r="' + R1 + '" fill="rgba(0,0,0,0.55)"/>' +
    '<polygon points="' + oct(R1) + '" fill="#262c34" stroke="#a9b4c2" stroke-width="2.2"/>' +
    '<polygon points="' + oct(R1 * 0.72) + '" fill="#1d2229" stroke="#66717f" stroke-width="1.4"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R1 * 0.28) + '" fill="none" stroke="#8994a2" stroke-width="1.4"/></g>';
}
// 圣像台：方形石座上的长袍立像（俯视：袍摆、肩、头与金色光环）
function statue(b) {
  const r = rect(b, 4), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  return `<g class="statue"><rect x="${r.x + 3}" y="${r.y + 6}" width="${r.w}" height="${r.h}" fill="rgba(0,0,0,0.55)"/>` +
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#2a3039" stroke="#8b96a4" stroke-width="1.6"/>` +
    `<rect x="${r.x + 4}" y="${r.y + 4}" width="${r.w - 8}" height="${r.h - 8}" fill="#3a414b" stroke="#59636f" stroke-width="1"/>` +
    `<ellipse cx="${cx}" cy="${cy + 5}" rx="13" ry="10" fill="#c9c1b0" stroke="#7f776a" stroke-width="1.2"/>` +
    `<path d="M${cx - 6} ${cy + 1}Q${cx - 4} ${cy + 9} ${cx - 7} ${cy + 13}M${cx + 5} ${cy + 1}Q${cx + 4} ${cy + 9} ${cx + 7} ${cy + 13}" stroke="#8f8676" stroke-width="1" fill="none"/>` +
    `<ellipse cx="${cx}" cy="${cy - 3}" rx="10" ry="5" fill="#d6cebd" stroke="#8f8676" stroke-width="1"/>` +
    `<circle cx="${cx}" cy="${cy - 7}" r="8.5" fill="none" stroke="#d8b45a" stroke-width="1.6" opacity="0.85"/>` +
    `<circle cx="${cx}" cy="${cy - 7}" r="4.6" fill="#e2dac9" stroke="#8f8676" stroke-width="1"/></g>`;
}
function altar(b) {
  const r = rect(b, 3), mx = r.x + r.w / 2;
  const candles = [0.14, 0.86].map(k => { const x = r.x + r.w * k, y = r.y + 7; return '<circle cx="' + x + '" cy="' + y + '" r="11" fill="url(#g-candle)"/><circle cx="' + x + '" cy="' + y + '" r="2.6" fill="#fff4cf"/>'; }).join('');
  return '<g class="altar"><rect x="' + (r.x - 8) + '" y="' + (r.y - 8) + '" width="' + (r.w + 16) + '" height="' + (r.h + 16) + '" rx="6" fill="url(#g-altar-glow)"/>' +
    '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="2" fill="#d8d0c1" stroke="#8c7f69" stroke-width="1.5"/>' +
    '<rect x="' + (r.x + r.w * 0.38) + '" y="' + r.y + '" width="' + (r.w * 0.24) + '" height="' + r.h + '" fill="#8e2229"/>' +
    '<rect x="' + (r.x + 3) + '" y="' + (r.y + r.h - 6) + '" width="' + (r.w - 6) + '" height="3" fill="#b8913f"/>' +
    `<path d="M${mx} ${r.y + 6}V${r.y + r.h - 10}M${mx - 6} ${r.y + 13}H${mx + 6}" stroke="#e2c070" stroke-width="2.4"/>` + candles + '</g>';
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
      '<pattern id="p-marble" width="100" height="100" patternUnits="userSpaceOnUse">' +
        '<rect width="100" height="100" fill="#454b54"/><rect width="50" height="50" fill="#4f5560"/><rect x="50" y="50" width="50" height="50" fill="#4f5560"/>' +
        '<path d="M0 .5H100M0 50.5H100M.5 0V100M50.5 0V100" stroke="#2b3037" stroke-width="1"/>' +
        '<path d="M6 14Q20 22 31 18T48 30M58 64Q70 58 79 70T97 76" stroke="rgba(215,222,232,0.14)" stroke-width="1.2" fill="none"/></pattern>' +
      '<filter id="f-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.55  0 0 0 0 0.6  0 0 0 0.10 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>' +
      '<filter id="f-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<filter id="f-glow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4"/></filter>' +
      '<clipPath id="c-floor">' + floorRects + '</clipPath>' +
      '<linearGradient id="g-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e4932"/><stop offset="1" stop-color="#4a2f20"/></linearGradient>' +
      '<linearGradient id="g-carpet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5b1217"/><stop offset=".5" stop-color="#7d1b22"/><stop offset="1" stop-color="#5b1217"/></linearGradient>' +
      '<radialGradient id="g-lamp"><stop offset="0" stop-color="rgba(255,210,150,0.55)"/><stop offset="1" stop-color="rgba(255,190,120,0)"/></radialGradient>' +
      '<radialGradient id="g-candle"><stop offset="0" stop-color="rgba(255,225,160,0.85)"/><stop offset="1" stop-color="rgba(255,200,120,0)"/></radialGradient>' +
      '<radialGradient id="g-altar-glow"><stop offset="0" stop-color="rgba(255,220,170,0.35)"/><stop offset="1" stop-color="rgba(255,220,170,0)"/></radialGradient>' +
      '<radialGradient id="g-water" cx=".42" cy=".38"><stop offset="0" stop-color="#7fb4e0"/><stop offset="1" stop-color="#22405c"/></radialGradient>' +
      '<linearGradient id="g-glass-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9cbff"/><stop offset="1" stop-color="#2c4fa8"/></linearGradient>' +
      '<linearGradient id="g-glass-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffab9c"/><stop offset="1" stop-color="#8e1f2a"/></linearGradient>' +
      '<linearGradient id="g-glass-y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#b07a20"/></linearGradient>' +
      '<linearGradient id="g-ray-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(110,150,255,0.34)"/><stop offset="1" stop-color="rgba(110,150,255,0)"/></linearGradient>' +
      '<linearGradient id="g-ray-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(235,90,90,0.30)"/><stop offset="1" stop-color="rgba(235,90,90,0)"/></linearGradient>' +
      '<linearGradient id="g-ray-y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,215,140,0.38)"/><stop offset="1" stop-color="rgba(255,215,140,0)"/></linearGradient>' +
    '</defs>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="display:block">' + defs +
    '<rect width="' + W + '" height="' + H + '" fill="url(#p-hatch)"/>' +
    '<g clip-path="url(#c-floor)">' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#p-check)"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="#000" filter="url(#f-grain)" opacity="0.9"/>' +
      by('carpet').map(o => carpet(o.bounds)).join('') +
      by('dais').map(dais).join('') +
      by('apse').map(apseLight).join('') +
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
    by('font').map(o => font(o.bounds)).join('') +
    by('candelabra').map(o => candelabra(o.bounds)).join('') +
    by('lectern').map(o => lectern(o.bounds)).join('') +
    by('pulpit').map(pulpit).join('') +
    by('cabinet').map(cabinet).join('') +
    by('confessional').map(confessional).join('') +
    '<path d="' + wallD + '" stroke="rgba(140,185,235,0.45)" stroke-width="7" fill="none" stroke-linecap="square" filter="url(#f-glow)"/>' +
    '<path d="' + wallD + '" stroke="#d3dde9" stroke-width="2.4" fill="none" stroke-linecap="square"/>' +
    by('apse').map(apseWindows).join('') +
    by('chapelDoor').map(chapelDoor).join('') +
    by('light').map(o => lantern(o.at)).join('') +
    '</svg>';
}
