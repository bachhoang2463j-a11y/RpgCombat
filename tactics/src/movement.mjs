// ==========================================
// 战棋 P04/M2 基础移动寻路（八向 Dijkstra，1/√2 成本，两实障夹角禁穿）
// ctx = { compiled, units, placementsById, footprintsById }；live = ref.hp > 0。
// 敌方站立单位/实墙/关门/低障碍阻挡移动；友方可穿行但不可落其占地；
// 多格 footprint 每步全路径容纳；budget=Infinity 供 AI 全图查询（有限格网必然终止）。
// 本模块不改 ctx、不做表现层；移动额度（米）由调用方作为 budget 传入。
// ==========================================

import { cellAt } from './scene.mjs';
import { occupiedCells, cellKey } from './geometry.mjs';

const SQRT2 = Math.SQRT2;
const EPS = 1e-9;

function findUnit(ctx, unitId) {
  const u = ctx.units.find(x => x.id === unitId);
  if (!u) throw new Error('单位不存在: ' + unitId);
  return u;
}

// live 单位占位索引：cellKey → { id, side }（倒地/死亡不挡路）
function buildLiveOcc(ctx) {
  const occ = new Map();
  for (const u of ctx.units) {
    if (!u.ref || u.ref.hp <= 0 || (ctx.carriedUnitIds && ctx.carriedUnitIds.has(u.id))) continue;
    const p = ctx.placementsById[u.id];
    if (!p) continue;
    const fp = ctx.footprintsById[u.id] || u.footprint || { width: 1, height: 1 };
    for (const c of occupiedCells(p, fp)) occ.set(cellKey(c.col, c.row), { id: u.id, side: u.side });
  }
  return occ;
}

// 单格移动阻挡：界外/地形（实墙+关门+低障碍）/敌方站立单位；友方与自身不算
function cellBlocked(ctx, col, row, occ, selfId, selfSide) {
  const cell = cellAt(ctx.compiled, col, row);
  if (!cell || cell.blocksMovement) return true;
  const o = occ.get(cellKey(col, row));
  return !!(o && o.id !== selfId && o.side !== selfSide);
}

// 新锚点整个 footprint 区域可进入（友方占格允许穿行）
function regionEnterable(ctx, col, row, fp, occ, selfId, selfSide) {
  for (const c of occupiedCells({ col, row }, fp)) {
    if (cellBlocked(ctx, c.col, c.row, occ, selfId, selfSide)) return false;
  }
  return true;
}

// 新锚点整个 footprint 区域可落脚（不得与任何其他 live 单位重叠，含友方）
function regionStandable(ctx, col, row, fp, occ, selfId) {
  for (const c of occupiedCells({ col, row }, fp)) {
    const o = occ.get(cellKey(c.col, c.row));
    if (o && o.id !== selfId) return false;
  }
  return true;
}

function placementBlocker(ctx, col, row, fp, occ, selfId) {
  for (const c of occupiedCells({ col, row }, fp)) {
    const cell = cellAt(ctx.compiled, c.col, c.row);
    if (!cell || cell.blocksMovement) return { type: 'terrain', col: c.col, row: c.row, cell };
    const o = occ.get(cellKey(c.col, c.row));
    if (o && o.id !== selfId) return { type: 'unit', unitId: o.id, side: o.side, col: c.col, row: c.row };
  }
  return null;
}

export function cellsAdjacent(a, afp, b, bfp) {
  for (let ay = a.row; ay < a.row + afp.height; ay++) for (let ax = a.col; ax < a.col + afp.width; ax++)
    for (let by = b.row; by < b.row + bfp.height; by++) for (let bx = b.col; bx < b.col + bfp.width; bx++)
      if (Math.max(Math.abs(ax - bx), Math.abs(ay - by)) === 1) return true;
  return false;
}

// 落点必须容纳完整占地；忽略单位只供携带放下等已明确持有的实体使用。
export function canPlaceAt(ctx, unitId, col, row, ignoreUnitIds = []) {
  const unit = findUnit(ctx, unitId);
  const fp = ctx.footprintsById[unitId] || unit.footprint || { width: 1, height: 1 };
  const ignored = new Set([unitId, ...ignoreUnitIds]);
  const occ = buildLiveOcc(ctx);
  for (const [key, o] of occ) if (ignored.has(o.id)) occ.delete(key);
  const blockedBy = placementBlocker(ctx, col, row, fp, occ, unitId);
  return blockedBy ? { ok: false, blockedBy } : { ok: true, blockedBy: null };
}

// 跳跃越过低障碍、缺口与单位；沿八方向直线采样，实墙/关门仍阻断。
export function findJumpPath(ctx, unitId, col, row, maxDistance = Infinity) {
  const unit = findUnit(ctx, unitId);
  const p = ctx.placementsById[unitId];
  if (!p) throw new Error('单位缺少站位: ' + unitId);
  const dx = col - p.col, dy = row - p.row;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const distance = Math.hypot(dx, dy);
  const fail = (reason, blockedBy = null) => ({ ok: false, reason, distance, maxDistance, path: [], blockedBy });
  if (!Number.isInteger(col) || !Number.isInteger(row) || (!ax && !ay)) return fail('跳跃落点无效');
  if (ax && ay && ax !== ay) return fail('跳跃必须沿八方向');
  if (distance > maxDistance + EPS) return fail('超过最大跳跃距离');
  const fp = ctx.footprintsById[unitId] || unit.footprint || { width: 1, height: 1 };
  const occ = buildLiveOcc(ctx);
  const steps = Math.max(ax, ay);
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const path = [{ col: p.col, row: p.row }];
  for (let i = 1; i <= steps; i++) path.push({ col: p.col + sx * i, row: p.row + sy * i });

  const samples = Math.max(1, Math.ceil(distance / 0.2));
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = p.col + dx * t, y = p.row + dy * t;
    for (const offset of occupiedCells({ col: 0, row: 0 }, fp)) {
      const c = Math.floor(x + offset.col), r = Math.floor(y + offset.row);
      const cell = cellAt(ctx.compiled, c, r);
      if (!cell) return fail('跳跃路径越出地图', { type: 'terrain', col: c, row: r });
      if (cell.blocksProjectile && !cell.void) return fail('跳跃被实墙或关门阻挡', { type: 'wall', col: c, row: r });
    }
  }
  const blockedBy = placementBlocker(ctx, col, row, fp, occ, unitId);
  if (blockedBy) return fail('跳跃落点不可站立', blockedBy);
  return { ok: true, reason: null, distance, maxDistance, path, blockedBy: null };
}

// 技能强制位移沿离散八方向推进，单位/地形接触点只报告，不在此处做伤害结算。
export function traceDisplacement(ctx, unitId, direction, distance) {
  const unit = findUnit(ctx, unitId);
  const p = ctx.placementsById[unitId];
  if (!p) throw new Error('单位缺少站位: ' + unitId);
  const dx = Math.sign(direction && direction.x || 0);
  const dy = Math.sign(direction && direction.y || 0);
  if ((!dx && !dy) || !Number.isFinite(distance) || distance < 0) {
    return { ok: false, reason: '位移方向或距离无效', path: [], distance: 0, blockedBy: null };
  }
  const fp = ctx.footprintsById[unitId] || unit.footprint || { width: 1, height: 1 };
  const occ = buildLiveOcc(ctx);
  const stepDistance = dx && dy ? SQRT2 : 1;
  const path = [{ col: p.col, row: p.row }];
  let traveled = 0;
  let blockedBy = null;
  while (traveled + stepDistance <= distance + EPS) {
    const next = path[path.length - 1];
    const col = next.col + dx, row = next.row + dy;
    blockedBy = placementBlocker(ctx, col, row, fp, occ, unitId);
    if (blockedBy) break;
    path.push({ col, row });
    traveled += stepDistance;
  }
  return { ok: true, reason: null, path, distance: traveled, requestedDistance: distance, blockedBy };
}

// 可达合法落点：{ cells: [{col,row,cost,path:[{col,row}]}], byKey: Map<cellKey, cell> }
// cells 只含可站落点（含起点 cost 0）；path 为锚点完整轨迹（友方格可作中途点）。
export function findReachable(ctx, unitId, budget = Infinity, costMultiplier = 1) {
  const unit = findUnit(ctx, unitId);
  const p = ctx.placementsById[unitId];
  if (!p) throw new Error('单位缺少站位: ' + unitId);
  const fp = ctx.footprintsById[unitId] || unit.footprint || { width: 1, height: 1 };
  const occ = buildLiveOcc(ctx);
  const enterable = (col, row) => regionEnterable(ctx, col, row, fp, occ, unitId, unit.side);

  const dist = new Map();
  const prev = new Map();
  dist.set(cellKey(p.col, p.row), 0);
  const open = [{ col: p.col, row: p.row, cost: 0 }];

  while (open.length) {
    // 取当前最小成本节点（格网有限，线性扫描足够）
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].cost < open[bi].cost) bi = i;
    }
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    const ck = cellKey(cur.col, cur.row);
    if (cur.cost > dist.get(ck) + EPS) continue; // 已被更优路径松弛的过期条目

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue;
        const nc = cur.col + dc, nr = cur.row + dr;
        if (!cellAt(ctx.compiled, nc, nr)) continue; // 界外不可走
        // 两实障夹角禁穿：斜步的两个正交邻格均被移动阻挡（地形或敌方）时禁止斜穿
        if (dc && dr && !enterable(cur.col + dc, cur.row) && !enterable(cur.col, cur.row + dr)) continue;
        const step = ((dc && dr) ? SQRT2 : 1) * costMultiplier;
        const nCost = cur.cost + step;
        if (nCost > budget + EPS) continue;
        if (!enterable(nc, nr)) continue;
        const nk = cellKey(nc, nr);
        const old = dist.get(nk);
        if (old !== undefined && old <= nCost + EPS) continue;
        dist.set(nk, nCost);
        prev.set(nk, { col: cur.col, row: cur.row });
        open.push({ col: nc, row: nr, cost: nCost });
      }
    }
  }

  const cells = [];
  const byKey = new Map();
  for (const [key, cost] of dist) {
    const parts = key.split(',');
    const col = parseInt(parts[0], 10), row = parseInt(parts[1], 10);
    if (!regionStandable(ctx, col, row, fp, occ, unitId)) continue;
    const path = [];
    let cur = { col, row };
    for (;;) {
      path.unshift({ col: cur.col, row: cur.row });
      const pv = prev.get(cellKey(cur.col, cur.row));
      if (!pv) break;
      cur = pv;
    }
    const cell = { col, row, cost, path };
    cells.push(cell);
    byKey.set(key, cell);
  }
  cells.sort((a, b) => a.row - b.row || a.col - b.col);
  return { cells, byKey };
}
