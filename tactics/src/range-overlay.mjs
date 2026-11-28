// ==========================================
// 战棋地图叠加层：绘制查询权威返回的完整作用区与可披露目标。
// 唯一数据来源：findReachable 与 queryAttack 的返回（cells/targetIds/blockedBy/shape），不另立判定。
// 画法基线（原型）：细边界 + 克制半透明面 + 方向感；射界面只画在真实作用格内（墙后被裁掉），不画穿墙假射界。
// 多格单位只画一个目标标记。所有坐标为世界美术像素（Q=50/米）。
// ==========================================

import { occupiedCells, unitCenter, cellKey, directionVector } from './geometry.mjs';
import { BACKSTAB_HALF_ANGLE } from './range.mjs';

const Q = 50;
const C = {
  move: { fill: 'rgba(125,211,252,0.10)', edge: 'rgba(147,197,253,0.55)', path: '#e0f2fe', glow: 'rgba(56,189,248,0.45)' },
  sprint: { fill: 'rgba(250,204,21,0.21)', edge: 'rgba(253,224,71,0.84)', path: '#fef08a', glow: 'rgba(234,179,8,0.5)' },
  atk: { fill: 'rgba(251,146,60,0.16)', edge: 'rgba(253,186,116,0.85)', guide: 'rgba(254,215,170,0.55)', cell: 'rgba(251,146,60,0.08)' },
  blink: { fill: 'rgba(129,140,248,0.16)', edge: 'rgba(165,180,252,0.85)', dot: 'rgba(224,231,255,0.8)', path: '#e0e7ff', glow: 'rgba(99,102,241,0.5)' },
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
// 直线范围按真实几何画平滑旋转带（斜向不再沿格阶梯描边）：长度截到最远作用格（遇墙截断），作用格只叠一层极淡底色
function truncatedLine(shape, cells) {
  const ux = Math.cos(shape.dir), uy = Math.sin(shape.dir), from = shape.from || shape.center;
  let far = 0;
  for (const c of cells) far = Math.max(far, (c.col + 0.5 - from.x) * ux + (c.row + 0.5 - from.y) * uy);
  return { ...shape, length: Math.min(shape.length, far + 0.5) };
}
function fillCells(g, cells, color) {
  g.fillStyle = color;
  for (const c of cells) g.fillRect(c.col * Q + 1, c.row * Q + 1, Q - 2, Q - 2);
}

function shapePath(g, shape) {
  const from = shape.type === '爆炸' ? shape.center : shape.from || shape.center;
  g.beginPath();
  if (!from) return;   // 「自身」/「全域」无空间轮廓：只画目标标记
  const ox = from.x * Q, oy = from.y * Q;
  if (shape.type === '直线') {
    const ux = Math.cos(shape.dir), uy = Math.sin(shape.dir), nx = -uy, ny = ux;
    const L = shape.length * Q, W = shape.width * Q / 2;
    g.moveTo(ox + nx * W, oy + ny * W);
    g.lineTo(ox + ux * L + nx * W, oy + uy * L + ny * W);
    g.lineTo(ox + ux * L - nx * W, oy + uy * L - ny * W);
    g.lineTo(ox - nx * W, oy - ny * W);
    g.closePath();
  } else if (shape.type === '扇形' || shape.type === '圆形' || shape.type === '爆炸') {
    const R = (shape.radius || 0) * Q;
    if (shape.type === '扇形') {
      const half = shape.angle * Math.PI / 360;
      g.moveTo(ox, oy);
      g.arc(ox, oy, R, shape.dir - half, shape.dir + half);
      g.closePath();
    } else {
      g.arc(ox, oy, R, 0, Math.PI * 2);
    }
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
  const color = pv.sprint ? C.sprint : C.move;
  const cells = (pv.cells || []).filter(c => c.cost > 0 || pv.showOrigin);
  if (cells.length) {
    fillCells(g, cells, color.fill);
    strokeCellOutline(g, pv.cells, color.edge, 1.6);
  }
  const h = pv.hover;
  if (h && h.path && h.path.length > 1) {
    const fp = viewData.footprintsById[pv.unitId] || { width: 1, height: 1 };
    const pts = h.path.map(c => unitCenter(c, fp));
    g.save();
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = color.glow; g.lineWidth = 9; g.globalAlpha = 0.5;
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x * Q, p.y * Q) : g.moveTo(p.x * Q, p.y * Q))); g.stroke();
    g.globalAlpha = 1; g.strokeStyle = color.path; g.lineWidth = 2.6;
    if (!pv.locked) g.setLineDash([8, 6]);
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x * Q, p.y * Q) : g.moveTo(p.x * Q, p.y * Q))); g.stroke();
    g.setLineDash([]);
    // 转角节点
    g.fillStyle = color.path;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      if (Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) > 1e-6) { g.beginPath(); g.arc(b.x * Q, b.y * Q, 3, 0, Math.PI * 2); g.fill(); }
    }
    // 落点：占地方框 + 中心环
    const end = h.path[h.path.length - 1];
    g.strokeStyle = pv.locked ? C.lock : color.path; g.lineWidth = pv.locked ? 2.6 : 2;
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
  if (pv.approach) drawMove(g, { unitId: pv.casterId, hover: pv.approach.cell }, viewData);
  const o = pv.approach ? q.origin : unitCenter(caster, cfp);
  const skillRange = pv.skill && pv.skill.range;
  // 射程参考圈（单体/扇形）：细虚线，只表达距离，不是作用区
  if (skillRange && skillRange.castRange) {
    g.save(); g.strokeStyle = 'rgba(254,215,170,0.22)'; g.lineWidth = 1.2; g.setLineDash([3, 7]);
    g.beginPath(); g.arc(o.x * Q, o.y * Q, skillRange.castRange * Q, 0, Math.PI * 2); g.stroke(); g.restore();
  }
  if (!q) return;
  if (skillRange && skillRange.type === '召唤') {
    const sfp = pv.skill.summonFootprint || { width: 1, height: 1 };
    const pt = q.aim;
    if (pt) {
      const col = Math.floor(pt.x - (sfp.width - 1) / 2), row = Math.floor(pt.y - (sfp.height - 1) / 2);
      g.save();
      g.fillStyle = q.ok ? (pv.locked ? C.lock : 'rgba(52,211,153,0.22)') : 'rgba(248,113,113,0.22)';
      g.strokeStyle = q.ok ? (pv.locked ? C.lock : '#34d399') : C.bad;
      g.lineWidth = pv.locked ? 2.4 : 1.8;
      g.fillRect(col * Q + 2, row * Q + 2, sfp.width * Q - 4, sfp.height * Q - 4);
      g.strokeRect(col * Q + 2, row * Q + 2, sfp.width * Q - 4, sfp.height * Q - 4);
      g.restore();
    }
    return;
  }
  const shape = q.shape;
  const line = q.ok && shape && shape.type === '直线' && !q.chargePath && q.cells.length ? truncatedLine(shape, q.cells) : null;
  if (q.ok && shape && shape.type !== '单体') {
    // 面：只在真实作用格内填充与描边（墙后格不在 cells，自然被裁掉）
    if (line) {
      fillCells(g, q.cells, C.atk.cell);
      g.save();
      shapePath(g, line); g.fillStyle = C.atk.fill; g.fill();
      g.strokeStyle = C.atk.edge; g.lineWidth = 1.8; g.lineJoin = 'round'; g.stroke();
      g.restore();
    } else if (q.cells.length) {
      g.save(); clipCells(g, q.cells);
      if (shape.type === '全域' || q.chargePath) { g.fillStyle = C.atk.fill; g.fillRect(0, 0, 1e5, 1e5); }
      else {
        shapePath(g, shape); g.fillStyle = C.atk.fill; g.fill();
        shapePath(g, shape); g.strokeStyle = C.atk.edge; g.lineWidth = 1.8; g.stroke();
      }
      g.restore();
      strokeCellOutline(g, q.cells, 'rgba(253,186,116,0.28)', 1);
    }
    // 方向指引仅适用于具有方向轴的范围；圆形/全域由真实作用区表达。
    if (shape.type === '直线' || shape.type === '扇形') {
      g.save();
      const ux = Math.cos(shape.dir), uy = Math.sin(shape.dir);
      const L = (line ? line.length : shape.type === '直线' ? shape.length : shape.radius) * Q;
      g.strokeStyle = C.atk.guide; g.lineWidth = 1.4; g.setLineDash([6, 6]);
      g.beginPath(); g.moveTo(o.x * Q, o.y * Q); g.lineTo(o.x * Q + ux * L, o.y * Q + uy * L); g.stroke();
      g.setLineDash([]);
      const ex = o.x * Q + ux * L, ey = o.y * Q + uy * L;
      g.fillStyle = C.atk.edge;
      g.beginPath(); g.moveTo(ex + ux * 8, ey + uy * 8); g.lineTo(ex - uy * 6, ey + ux * 6); g.lineTo(ex + uy * 6, ey - ux * 6); g.closePath(); g.fill();
      g.restore();
    }
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
  for (const id of q.disclosureTargetIds || []) unitMarker(g, viewData, id, pv.locked ? C.lock : C.atk.edge, pv.locked ? 'lock' : 'hover');
}

// 跳跃：可落点（紫）+ 悬停落点的抛物线预告（虚线弧 + 地面投影 + 落点环）
function drawJump(g, pv, viewData) {
  const fp = viewData.footprintsById[pv.unitId] || { width: 1, height: 1 };
  const p = viewData.placementsById[pv.unitId];
  const cells = pv.cells || [];
  if (cells.length) {
    g.fillStyle = 'rgba(196,181,253,0.13)';
    for (const c of cells) for (const o of occupiedCells(c, fp)) g.fillRect(o.col * Q + 3, o.row * Q + 3, Q - 6, Q - 6);
    g.save(); g.fillStyle = 'rgba(221,214,254,0.55)';
    for (const c of cells) { const m = unitCenter(c, fp); g.beginPath(); g.arc(m.x * Q, m.y * Q, 2.4, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  const h = pv.hover;
  if (h && p) {
    const a = unitCenter(p, fp), b = unitCenter(h, fp);
    const ax = a.x * Q, ay = a.y * Q, bx = b.x * Q, by = b.y * Q;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const lift = Math.min(2.2, 0.55 + dist * 0.22) * Q;
    const mx = (ax + bx) / 2, my = (ay + by) / 2 - lift * 2;
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(167,139,250,0.35)'; g.lineWidth = 1.4; g.setLineDash([3, 6]);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = 'rgba(139,92,246,0.45)'; g.lineWidth = 9;
    g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, bx, by); g.stroke();
    g.strokeStyle = '#ede9fe'; g.lineWidth = 2.4; g.setLineDash([9, 6]);
    g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, bx, by); g.stroke();
    g.setLineDash([]);
    // 弧顶方向小箭头（指向落点）
    const k = 0.85, tx = 2 * (1 - k) * (mx - ax) + 2 * k * (bx - mx), ty = 2 * (1 - k) * (my - ay) + 2 * k * (by - my);
    const px = (1 - k) * (1 - k) * ax + 2 * (1 - k) * k * mx + k * k * bx, py = (1 - k) * (1 - k) * ay + 2 * (1 - k) * k * my + k * k * by;
    const ang = Math.atan2(ty, tx);
    g.fillStyle = '#ede9fe';
    g.beginPath(); g.moveTo(px + Math.cos(ang) * 8, py + Math.sin(ang) * 8); g.lineTo(px + Math.cos(ang + 2.5) * 7, py + Math.sin(ang + 2.5) * 7); g.lineTo(px + Math.cos(ang - 2.5) * 7, py + Math.sin(ang - 2.5) * 7); g.closePath(); g.fill();
    g.strokeStyle = '#c4b5fd'; g.lineWidth = 2.2;
    for (const c of occupiedCells(h, fp)) g.strokeRect(c.col * Q + 3, c.row * Q + 3, Q - 6, Q - 6);
    g.beginPath(); g.arc(bx, by, 9, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  if (pv.invalid) {
    g.save(); g.strokeStyle = C.bad; g.lineWidth = 2; g.setLineDash([5, 4]);
    g.strokeRect(pv.invalid.col * Q + 4, pv.invalid.row * Q + 4, Q - 8, Q - 8); g.restore();
    drawBlock(g, { x: pv.invalid.col + 0.5, y: pv.invalid.row + 0.5 });
  }
}

// 闪现（折影步主动/反应）：半径圈 + 可落格菱点；悬停落点画虚线位移与落点环
function drawBlink(g, pv, viewData) {
  const p = viewData.placementsById[pv.unitId];
  if (!p) return;
  const fp = viewData.footprintsById[pv.unitId] || { width: 1, height: 1 };
  const o = unitCenter(p, fp), ox = o.x * Q, oy = o.y * Q, R = pv.radius * Q;
  g.save();
  const grad = g.createRadialGradient(ox, oy, R * 0.25, ox, oy, R);
  grad.addColorStop(0, 'rgba(129,140,248,0.02)'); grad.addColorStop(1, C.blink.fill);
  g.fillStyle = grad;
  g.beginPath(); g.arc(ox, oy, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = C.blink.edge; g.lineWidth = 1.8; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
  for (const c of pv.cells || []) {
    const m = unitCenter(c, fp);
    g.fillStyle = 'rgba(165,180,252,0.10)'; g.fillRect(c.col * Q + 4, c.row * Q + 4, Q - 8, Q - 8);
    g.fillStyle = C.blink.dot;
    g.beginPath(); g.moveTo(m.x * Q, m.y * Q - 3.4); g.lineTo(m.x * Q + 3.4, m.y * Q); g.lineTo(m.x * Q, m.y * Q + 3.4); g.lineTo(m.x * Q - 3.4, m.y * Q); g.closePath(); g.fill();
  }
  const h = pv.hover;
  if (h) {
    const b = unitCenter(h, fp), bx = b.x * Q, by = b.y * Q;
    g.lineCap = 'round';
    g.strokeStyle = C.blink.glow; g.lineWidth = 8;
    g.beginPath(); g.moveTo(ox, oy); g.lineTo(bx, by); g.stroke();
    g.strokeStyle = C.blink.path; g.lineWidth = 2.2; g.setLineDash([6, 6]);
    g.beginPath(); g.moveTo(ox, oy); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
    g.strokeStyle = C.blink.path; g.lineWidth = 2.4; g.shadowColor = C.blink.glow; g.shadowBlur = 10;
    for (const c of occupiedCells(h, fp)) g.strokeRect(c.col * Q + 3, c.row * Q + 3, Q - 6, Q - 6);
    g.beginPath(); g.arc(bx, by, 9, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
  if (pv.invalid) drawBlock(g, { x: pv.invalid.col + 0.5, y: pv.invalid.row + 0.5 });
}

function drawChargeIntent(g, intent) {
  const { shape, cells } = intent;
  if (!cells.length || !(intent.alpha > 0)) return;
  const curved = shape.type === '爆炸' || shape.type === '圆形' || shape.type === '扇形';
  const hasShape = curved || shape.type === '直线' && shape.width > 0;
  g.save();
  g.globalAlpha = intent.alpha;
  g.fillStyle = 'rgba(248,113,113,0.17)';
  if (shape.type === '直线' && shape.width > 0) {
    fillCells(g, cells, 'rgba(248,113,113,0.07)');
    shapePath(g, truncatedLine(shape, cells)); g.fillStyle = 'rgba(248,113,113,0.17)'; g.fill();
    g.strokeStyle = 'rgba(248,113,113,0.9)'; g.lineWidth = 2; g.lineJoin = 'round'; g.setLineDash([7, 5]); g.stroke();
    g.restore();
    return;
  }
  if (hasShape) {
    clipCells(g, cells); shapePath(g, shape); g.fill();
    g.strokeStyle = 'rgba(248,113,113,0.9)'; g.lineWidth = 2; g.setLineDash([7, 5]); g.stroke();
  } else for (const c of cells) g.fillRect(c.col * Q, c.row * Q, Q, Q);
  g.restore();
  g.save(); g.globalAlpha = intent.alpha;
  strokeCellOutline(g, cells, 'rgba(248,113,113,0.58)', 1.5);
  g.restore();
}

// 绘制入口：固定意向先画，独立于玩家悬停和当次施放预览。
function drawBackstabSector(g, viewData, unitId) {
  const unit = viewData?.units.find(u => u.id === unitId);
  const at = unit && viewData.placementsById[unitId];
  if (unit?.side !== 'enemy' || at?.facing == null) return;
  const center = unitCenter(at, viewData.footprintsById[unitId]);
  const facing = directionVector(at.facing), dir = Math.atan2(-facing.dy, -facing.dx);
  const scale = g.getTransform().a;
  const width = g.canvas.width / scale, height = g.canvas.height / scale;
  g.save();
  g.beginPath(); g.rect(0, 0, width, height); g.clip();
  shapePath(g, { type: '扇形', center, dir, angle: BACKSTAB_HALF_ANGLE * 360 / Math.PI, radius: Math.hypot(width, height) / Q });
  g.fillStyle = 'rgba(244,114,182,.13)'; g.fill();
  g.strokeStyle = 'rgba(251,146,180,.62)'; g.lineWidth = 1.8; g.stroke();
  g.restore();
}

export function drawOverlay(g, pv, viewData, selectedId, intents = [], backstabHoverId = null) {
  if (backstabHoverId) drawBackstabSector(g, viewData, backstabHoverId);
  for (const intent of intents) drawChargeIntent(g, intent);
  if (pv && viewData) {
    if (pv.kind === 'move') drawMove(g, pv, viewData);
    else if (pv.kind === 'attack') drawAttack(g, pv, viewData);
    else if (pv.kind === 'jump') drawJump(g, pv, viewData);
    else if (pv.kind === 'blink') drawBlink(g, pv, viewData);
  }
  if (selectedId && viewData && viewData.placementsById[selectedId]) {
    const p = viewData.placementsById[selectedId], fp = viewData.footprintsById[selectedId];
    g.save(); g.strokeStyle = C.ally; g.lineWidth = 1.6; g.setLineDash([4, 4]);
    for (const c of occupiedCells(p, fp)) g.strokeRect(c.col * Q + 2, c.row * Q + 2, Q - 4, Q - 4);
    g.restore();
  }
}
