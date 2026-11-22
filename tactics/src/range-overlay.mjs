// ==========================================
// 战棋地图叠加层：移动/单体/直线/扇形的现代战术范围表现（画在 world-root 内 overlay canvas，随相机）
// 唯一数据来源：findReachable 与 queryAttack 的返回（cells/targetIds/blockedBy/shape），不另立判定。
// 画法基线（原型）：细边界 + 克制半透明面 + 方向感；射界面只画在真实作用格内（墙后被裁掉），不画穿墙假射界。
// 多格单位只画一个目标标记。所有坐标为世界美术像素（Q=50/米）。
// ==========================================

import { occupiedCells, unitCenter, cellKey } from './geometry.mjs';

const Q = 50;
const C = {
  move: { fill: 'rgba(125,211,252,0.10)', edge: 'rgba(147,197,253,0.55)', path: '#e0f2fe', glow: 'rgba(56,189,248,0.45)' },
  atk: { fill: 'rgba(251,146,60,0.16)', edge: 'rgba(253,186,116,0.85)', guide: 'rgba(254,215,170,0.55)' },
  lock: '#fde68a', bad: '#f87171', ally: 'rgba(125,211,252,0.9)',
};

// 格集合外轮廓：只描内外交界的格边（不画内部网格）
function strokeCellOutline(g, cells, color, width) {
  const set = new Set(cells.map(c => cellKey(c.col, c.row)));
  g.beginPath();
  for (const c of cells) {
    const x = c.col * Q, y = c.row * Q;
    if (!set.has(cellKey(c.col, c.row - 1))) { g.moveTo(x, y); g.lineTo(x + Q, y); }
    if (!set.has(cellKey(c.col, c.row + 1))) { g.moveTo(x, y + Q); g.lineTo(x + Q, y + Q); }
    if (!set.has(cellKey(c.col - 1, c.row))) { g.moveTo(x, y); g.lineTo(x, y + Q); }
    if (!set.has(cellKey(c.col + 1, c.row))) { g.moveTo(x + Q, y); g.lineTo(x + Q, y + Q); }
  }
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.stroke();
}
function clipCells(g, cells) {
  g.beginPath();
  for (const c of cells) g.rect(c.col * Q, c.row * Q, Q, Q);
  g.clip();
}

function shapePath(g, shape) {
  const ox = shape.from.x * Q, oy = shape.from.y * Q;
  g.beginPath();
  if (shape.type === '直线') {
    const ux = Math.cos(shape.dir), uy = Math.sin(shape.dir), nx = -uy, ny = ux;
    const L = shape.length * Q, W = shape.width * Q / 2;
    g.moveTo(ox + nx * W, oy + ny * W);
    g.lineTo(ox + ux * L + nx * W, oy + uy * L + ny * W);
    g.lineTo(ox + ux * L - nx * W, oy + uy * L - ny * W);
    g.lineTo(ox - nx * W, oy - ny * W);
    g.closePath();
  } else if (shape.type === '扇形') {
    const half = shape.angle * Math.PI / 360, R = shape.radius * Q;
    g.moveTo(ox, oy);
    g.arc(ox, oy, R, shape.dir - half, shape.dir + half);
    g.closePath();
  }
}

function unitMarker(g, viewData, id, color, kind) {
  const p = viewData.placementsById[id], fp = viewData.footprintsById[id] || { width: 1, height: 1 };
  if (!p) return;
  const c = unitCenter(p, fp);
  const r = Math.max(fp.width, fp.height) * Q * 0.56;
  const x = c.x * Q, y = c.y * Q;
  g.save();
  g.strokeStyle = color; g.lineWidth = kind === 'lock' ? 2.6 : 2;
  g.shadowColor = color; g.shadowBlur = kind === 'lock' ? 10 : 6;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  // 四角刻度：锁定感
  g.shadowBlur = 0; g.lineWidth = 2.4;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    g.beginPath(); g.moveTo(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3)); g.lineTo(x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)); g.stroke();
  }
  g.restore();
}

function drawBlock(g, pt, label) {
  const x = pt.x * Q, y = pt.y * Q;
  g.save();
  g.strokeStyle = C.bad; g.lineWidth = 3; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 4;
  g.beginPath(); g.moveTo(x - 7, y - 7); g.lineTo(x + 7, y + 7); g.moveTo(x + 7, y - 7); g.lineTo(x - 7, y + 7); g.stroke();
  g.restore();
  void label;
}

function drawMove(g, pv, viewData) {
  const cells = (pv.cells || []).filter(c => c.cost > 0 || pv.showOrigin);
  if (cells.length) {
    g.fillStyle = C.move.fill;
    for (const c of cells) g.fillRect(c.col * Q + 1, c.row * Q + 1, Q - 2, Q - 2);
    strokeCellOutline(g, pv.cells, C.move.edge, 1.6);
  }
  const h = pv.hover;
  if (h && h.path && h.path.length > 1) {
    const fp = viewData.footprintsById[pv.unitId] || { width: 1, height: 1 };
    const pts = h.path.map(c => unitCenter(c, fp));
    g.save();
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = C.move.glow; g.lineWidth = 9; g.globalAlpha = 0.5;
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x * Q, p.y * Q) : g.moveTo(p.x * Q, p.y * Q))); g.stroke();
    g.globalAlpha = 1; g.strokeStyle = C.move.path; g.lineWidth = 2.6;
    if (!pv.locked) g.setLineDash([8, 6]);
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x * Q, p.y * Q) : g.moveTo(p.x * Q, p.y * Q))); g.stroke();
    g.setLineDash([]);
    // 转角节点
    g.fillStyle = C.move.path;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      if (Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) > 1e-6) { g.beginPath(); g.arc(b.x * Q, b.y * Q, 3, 0, Math.PI * 2); g.fill(); }
    }
    // 落点：占地方框 + 中心环
    const end = h.path[h.path.length - 1];
    g.strokeStyle = pv.locked ? C.lock : C.move.path; g.lineWidth = pv.locked ? 2.6 : 2;
    for (const c of occupiedCells(end, fp)) g.strokeRect(c.col * Q + 3, c.row * Q + 3, Q - 6, Q - 6);
    const ep = pts[pts.length - 1];
    g.beginPath(); g.arc(ep.x * Q, ep.y * Q, 7, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  if (pv.invalid) {
    g.save();
    g.strokeStyle = C.bad; g.lineWidth = 2; g.setLineDash([5, 4]);
    g.strokeRect(pv.invalid.col * Q + 4, pv.invalid.row * Q + 4, Q - 8, Q - 8);
    g.restore();
    drawBlock(g, { x: pv.invalid.col + 0.5, y: pv.invalid.row + 0.5 });
  }
}

function drawAttack(g, pv, viewData) {
  const q = pv.query;
  const caster = viewData.placementsById[pv.casterId];
  const cfp = viewData.footprintsById[pv.casterId] || { width: 1, height: 1 };
  if (!caster) return;
  const o = unitCenter(caster, cfp);
  const skillRange = pv.skill && pv.skill.range;
  // 射程参考圈（单体/扇形）：细虚线，只表达距离，不是作用区
  if (skillRange && skillRange.castRange) {
    g.save(); g.strokeStyle = 'rgba(254,215,170,0.22)'; g.lineWidth = 1.2; g.setLineDash([3, 7]);
    g.beginPath(); g.arc(o.x * Q, o.y * Q, skillRange.castRange * Q, 0, Math.PI * 2); g.stroke(); g.restore();
  }
  if (!q) return;
  const shape = q.shape;
  if (q.ok && shape && shape.type !== '单体') {
    // 面：只在真实作用格内填充与描边（墙后格不在 cells，自然被裁掉）
    if (q.cells.length) {
      g.save(); clipCells(g, q.cells);
      shapePath(g, shape); g.fillStyle = C.atk.fill; g.fill();
      shapePath(g, shape); g.strokeStyle = C.atk.edge; g.lineWidth = 1.8; g.stroke();
      g.restore();
      strokeCellOutline(g, q.cells, 'rgba(253,186,116,0.28)', 1);
    }
    // 方向感：中轴细线 + 末端标记（直线显示宽度端、扇形显示弧端）
    g.save();
    const ux = Math.cos(shape.dir), uy = Math.sin(shape.dir);
    const L = (shape.type === '直线' ? shape.length : shape.radius) * Q;
    g.strokeStyle = C.atk.guide; g.lineWidth = 1.4; g.setLineDash([6, 6]);
    g.beginPath(); g.moveTo(o.x * Q, o.y * Q); g.lineTo(o.x * Q + ux * L, o.y * Q + uy * L); g.stroke();
    g.setLineDash([]);
    const ex = o.x * Q + ux * L, ey = o.y * Q + uy * L;
    g.fillStyle = C.atk.edge;
    g.beginPath(); g.moveTo(ex + ux * 8, ey + uy * 8); g.lineTo(ex - uy * 6, ey + ux * 6); g.lineTo(ex + uy * 6, ey - ux * 6); g.closePath(); g.fill();
    g.restore();
  }
  if (shape && shape.type === '单体' && q.ok) {
    const t = shape.to;
    g.save();
    g.strokeStyle = pv.locked ? C.lock : C.atk.edge; g.lineWidth = pv.locked ? 2.4 : 1.8;
    g.shadowColor = 'rgba(251,146,60,0.6)'; g.shadowBlur = 6;
    g.beginPath(); g.moveTo(o.x * Q, o.y * Q); g.lineTo(t.x * Q, t.y * Q); g.stroke();
    g.restore();
  }
  if (!q.ok && q.blockedBy && q.blockedBy.point) {
    const bp = q.blockedBy.point;
    g.save();
    g.strokeStyle = 'rgba(254,215,170,0.6)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(o.x * Q, o.y * Q); g.lineTo(bp.x * Q, bp.y * Q); g.stroke();
    if (q.aim && q.blockedBy.type !== 'range') {
      g.strokeStyle = 'rgba(248,113,113,0.45)'; g.setLineDash([4, 5]);
      const tc = q.aim.targetId && viewData.placementsById[q.aim.targetId] ? unitCenter(viewData.placementsById[q.aim.targetId], viewData.footprintsById[q.aim.targetId]) : q.aim;
      g.beginPath(); g.moveTo(bp.x * Q, bp.y * Q); g.lineTo(tc.x * Q, tc.y * Q); g.stroke();
    }
    g.restore();
    drawBlock(g, bp);
  }
  for (const id of q.targetIds || []) unitMarker(g, viewData, id, pv.locked ? C.lock : C.atk.edge, pv.locked ? 'lock' : 'hover');
}

// 绘制入口：pv = { kind:'move'|'attack', ... }；actorId 为当前行动者（地面描边由 CSS 负责）
export function drawOverlay(g, pv, viewData, selectedId) {
  if (pv && viewData) {
    if (pv.kind === 'move') drawMove(g, pv, viewData);
    else if (pv.kind === 'attack') drawAttack(g, pv, viewData);
  }
  if (selectedId && viewData && viewData.placementsById[selectedId]) {
    const p = viewData.placementsById[selectedId], fp = viewData.footprintsById[selectedId];
    g.save(); g.strokeStyle = C.ally; g.lineWidth = 1.6; g.setLineDash([4, 4]);
    for (const c of occupiedCells(p, fp)) g.strokeRect(c.col * Q + 2, c.row * Q + 2, Q - 4, Q - 4);
    g.restore();
  }
}
