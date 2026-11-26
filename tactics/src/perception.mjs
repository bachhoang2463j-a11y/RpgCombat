// ==========================================
// 战棋 P06 感知 / 视线（SPEC S08 + 浓雾）
// 纯规则模块：无 DOM。全向视野，半径＝感知÷5 米（缺字段按 50→10m）。
// 实墙/关门/遮视物件沿 0.2 采样遮挡；角色与低掩体不遮视（用 blocksVision）。
// 雾内：只能看到自己与完整占格边缘八邻的单位（即使雾格不阻内部邻线，墙仍挡）。
// 雾外：视距不减，但视线穿过雾区不能看雾内或另一侧。
// 共享友方视野由前端组合；本模块只回答“本人”能否看见，不把联合 ID 当本人锁定资格。
// ==========================================

import { occupiedCells, cellKey, unitCenter } from './geometry.mjs';
import { cellAt } from './scene.mjs';
import { cellsAdjacent } from './movement.mjs';
import { fogAt, fogAffects } from './regions.mjs';

const EPS = 1e-9;
const SAMPLE_STEP = 0.2;

function unitById(ctx, id) { return ctx.units.find(u => u.id === id) || null; }
function fpOf(ctx, u) { return ctx.footprintsById[u.id] || u.footprint || { width: 1, height: 1 }; }
function isLive(u) { return !!(u && u.ref && u.ref.hp > 0); }
function centerOf(ctx, u) {
  const p = ctx.placementsById[u.id];
  return p ? unitCenter(p, fpOf(ctx, u)) : null;
}

// 视野半径（米）：感知÷5；感知缺字段按 50（→10m）
export function sightRadius(ctx, observerOrId) {
  const u = typeof observerOrId === 'string' ? unitById(ctx, observerOrId) : observerOrId;
  const raw = u && u.ref && u.ref.perception;
  const perception = Number.isFinite(raw) ? raw : 50;
  return perception / 5;
}

// 视线遮挡：沿 0.2 采样，跳过两端所在格，实墙/关门/遮视物件阻断
function wallBlocked(ctx, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len / SAMPLE_STEP));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cell = cellAt(ctx.compiled, Math.floor(a.x + dx * t), Math.floor(a.y + dy * t));
    if (!cell || cell.blocksVision) return true;
  }
  return false;
}

// 视线是否触碰任一雾区格（含目标所在格）：用于“穿雾不能看雾内/另一侧”
function segmentTouchesFog(ctx, a, b) {
  const regions = (ctx.regions || []).filter(r => r && r.type === 'fog' && (r.endAt == null || r.endAt > (ctx.now?.() || 0)));
  if (!regions.length) return false;
  const sets = regions.map(r => {
    const s = new Set();
    for (const c of r.cells || []) s.add(cellKey(c.col, c.row));
    return s;
  });
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len / SAMPLE_STEP));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const key = cellKey(Math.floor(a.x + dx * t), Math.floor(a.y + dy * t));
    if (sets.some((s, index) => s.has(key) && fogAffects(ctx, regions[index], { x: a.x + dx * t, y: a.y + dy * t }))) return true;
  }
  return false;
}

function footprintsEdgeAdjacent(ctx, a, b) {
  const pa = ctx.placementsById[a.id], pb = ctx.placementsById[b.id];
  if (!pa || !pb) return false;
  return cellsAdjacent(pa, fpOf(ctx, a), pb, fpOf(ctx, b));
}

export function canSeeUnit(ctx, observerId, targetId, lockAttack = false) {
  if (observerId === targetId) return true;
  const observer = unitById(ctx, observerId);
  const target = unitById(ctx, targetId);
  if (!observer || !target || !isLive(observer)) return false;
  const oc = centerOf(ctx, observer), tc = centerOf(ctx, target);
  if (!oc || !tc) return false;
  if (wallBlocked(ctx, oc, tc)) return false;
  const observerInFog = fogAt(ctx, observerId).regionIds.length > 0;
  if (observerInFog) {
    // 雾内：只保留八邻边缘相邻 + 自己
    return footprintsEdgeAdjacent(ctx, observer, target);
  }
  // 雾外：视距不减；但不能看雾内或穿透雾看另一侧
  if (Math.hypot(oc.x - tc.x, oc.y - tc.y) > sightRadius(ctx, observer) + EPS) return false;
  // 单体攻击可从雾外锁定雾内目标；不等于发现，也不放开穿雾看另一侧。
  if (fogAt(ctx, targetId).strength > 0) return lockAttack;
  if (segmentTouchesFog(ctx, oc, tc)) return false;
  return true;
}

export function canSeePoint(ctx, observerId, point) {
  const observer = unitById(ctx, observerId);
  if (!observer || !isLive(observer) || !point) return false;
  const origin = centerOf(ctx, observer);
  if (!origin || wallBlocked(ctx, origin, point)) return false;
  if (fogAt(ctx, observerId).regionIds.length) {
    return occupiedCells(ctx.placementsById[observerId], fpOf(ctx, observer)).some(c =>
      Math.max(Math.abs(c.col - Math.floor(point.x)), Math.abs(c.row - Math.floor(point.y))) <= 1);
  }
  return Math.hypot(point.x - origin.x, point.y - origin.y) <= sightRadius(ctx, observer) + EPS
    && !segmentTouchesFog(ctx, origin, point);
}

export function visibleCells(ctx, observerId) {
  const cells = [];
  for (let row = 0; row < ctx.compiled.grid.rows; row++) for (let col = 0; col < ctx.compiled.grid.columns; col++) {
    if (canSeePoint(ctx, observerId, { x: col + 0.5, y: row + 0.5 })) cells.push({ col, row });
  }
  return cells;
}

export function visibleUnitIds(ctx, observerId) {
  return ctx.units.filter(u => isLive(u) && canSeeUnit(ctx, observerId, u.id)).map(u => u.id);
}

// 快照：只暴露 visible；lastKnown 留空（不泄漏隐藏单位位置/HP）
export function perceptionSnapshot(ctx, observerId) {
  return { observerId, visibleUnits: visibleUnitIds(ctx, observerId), lastKnown: {} };
}
