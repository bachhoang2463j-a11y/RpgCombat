// ==========================================
// 战棋 P04/M2 基础移动寻路（八向 Dijkstra，1/√2 成本，两实障夹角禁穿）
// ctx = { compiled, units, placementsById, footprintsById, buffsOf? }；live = ref.hp > 0。
// 敌方站立单位/实墙/关门/低障碍阻挡移动；友方可穿行但不可落其占地；
// 多格 footprint 每步全路径容纳；budget=Infinity 供 AI 全图查询（有限格网必然终止）。
// 飞行（unit.ref.flying 或 buffsOf variant 飞行）：普通移动可跨低障碍，不越实墙/关门。
// 结界：敌方跨边界（普通移动/跳跃/强制位移）阻断，冲锋除外。
// 本模块不改 ctx、不做表现层；移动额度（米）由调用方作为 budget 传入。
// ==========================================

import { cellAt } from './scene.mjs';
import { occupiedCells, cellKey, unitCenter } from './geometry.mjs';
import { barrierCrossing } from './barriers.mjs';
import { moveMultiplier } from './regions.mjs';

const SQRT2 = Math.SQRT2;
const EPS = 1e-9;

function findUnit(ctx, unitId) {
  const u = ctx.units.find(x => x.id === unitId);
  if (!u) throw new Error('单位不存在: ' + unitId);
  return u;
}

// 飞行：ref.flying 或 buffsOf 中出现 variant 飞行
function hasFlying(ctx, unit) {
  if (unit.ref && unit.ref.flying) return true;
  const buffs = typeof ctx.buffsOf === 'function' ? (ctx.buffsOf(unit.id) || []) : [];
  return buffs.some(b => b && (b.type === '飞行' || b.type === 'flying' || b.variant === '飞行'));
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

// 地形是否阻挡：飞行忽略低障碍，但实墙/关门（非 lowObstacle）仍阻挡
function terrainBlocks(cell, flying) {
  if (!cell) return true;
  if (!cell.blocksMovement) return false;
  if (flying && cell.lowObstacle && !cell.blocksProjectile) return false;
  return true;
}

// 单格移动阻挡：界外/地形/敌方站立单位；友方与自身不算
function cellBlocked(ctx, col, row, occ, selfId, selfSide, flying) {
  const cell = cellAt(ctx.compiled, col, row);
  if (terrainBlocks(cell, flying)) return true;
  const o = occ.get(cellKey(col, row));
  return !!(o && o.id !== selfId && o.side !== selfSide);
}

// 新锚点整个 footprint 区域可进入（友方占格允许穿行）
function regionEnterable(ctx, col, row, fp, occ, selfId, selfSide, flying) {
  for (const c of occupiedCells({ col, row }, fp)) {
    if (cellBlocked(ctx, c.col, c.row, occ, selfId, selfSide, flying)) return false;
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

function placementBlocker(ctx, col, row, fp, occ, selfId, flying) {
  for (const c of occupiedCells({ col, row }, fp)) {
    const cell = cellAt(ctx.compiled, c.col, c.row);
    if (terrainBlocks(cell, flying)) return { type: 'terrain', col: c.col, row: c.row, cell };
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

// 落点必须容纳完整占地；飞行允许落在低障碍；忽略单位只供携带放下等已明确持有的实体使用。
export function canPlaceAt(ctx, unitId, col, row, ignoreUnitIds = []) {
  const unit = findUnit(ctx, unitId);
  const fp = ctx.footprintsById[unitId] || unit.footprint || { width: 1, height: 1 };
  const flying = hasFlying(ctx, unit);
  const ignored = new Set([unitId, ...ignoreUnitIds]);
  const occ = buildLiveOcc(ctx);
  for (const [key, o] of occ) if (ignored.has(o.id)) occ.delete(key);
  const blockedBy = placementBlocker(ctx, col, row, fp, occ, unitId, flying);
  return blockedBy ? { ok: false, blockedBy } : { ok: true, blockedBy: null };
}

// 跳跃越过低障碍、缺口与单位；沿八方向直线采样，实墙/关门/结界仍阻断。
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
  // 结界：敌方起落点跨界，或起落都在外但轨迹穿过结界，均阻断
  const crossing = barrierCrossing(ctx, unitId, p, { col, row });
  if (crossing) return fail('跳跃不能跨过结界', { type: 'barrier', barrierId: crossing.id });
  const blockedBy = placementBlocker(ctx, col, row, fp, occ, unitId, false);
  if (blockedBy) return fail('跳跃落点不可站立', blockedBy);
  return { ok: true, reason: null, distance, maxDistance, path, blockedBy: null };
}

// 技能强制位移沿离散八方向推进，单位/地形/结界接触点只报告，不在此处做伤害结算。
// 距离量化剩余不足一步不算撞墙；只有真实阻挡才置 blocked。
export function traceDisplacement(ctx, unitId, direction, distance) {
  const unit = findUnit(ctx, unitId);
  const p = ctx.placementsById[unitId];
  if (!p) throw new Error('单位缺少站位: ' + unitId);
  const dx = Math.sign(direction && direction.x || 0);
  const dy = Math.sign(direction && direction.y || 0);
  if ((!dx && !dy) || !Number.isFinite(distance) || distance < 0) {
    return { ok: false, reason: '位移方向或距离无效', path: [], distance: 0, actual: 0, requested: distance, blocked: false, blockedBy: null };
  }
  const fp = ctx.footprintsById[unitId] || unit.footprint || { width: 1, height: 1 };
  const occ = buildLiveOcc(ctx);
  const stepDistance = dx && dy ? SQRT2 : 1;
  const path = [{ col: p.col, row: p.row }];
  let traveled = 0;
  let blockedBy = null;
  while (traveled + stepDistance <= distance + EPS) {
    const cur = path[path.length - 1];
    const col = cur.col + dx, row = cur.row + dy;
    blockedBy = placementBlocker(ctx, col, row, fp, occ, unitId, false);
    if (!blockedBy) {
      const crossing = barrierCrossing(ctx, unitId, cur, { col, row });
      if (crossing) blockedBy = { type: 'barrier', barrierId: crossing.id, col, row };
    }
    if (blockedBy) break;
    path.push({ col, row });
    traveled += stepDistance;
  }
  return {
    ok: true, reason: null, path, distance: traveled,
    actual: traveled, requested: distance, requestedDistance: distance,
    blocked: !!blockedBy, blockedBy,
  };
}

// 可达合法落点：{ cells: [{col,row,cost,path:[{col,row}]}], byKey: Map<cellKey, cell> }
// cells 只含可站落点（含起点 cost 0）；path 为锚点完整轨迹（友方格可作中途点）。
export function findReachable(ctx, unitId, budget = Infinity, costMultiplier = 1, canStep = null) {
  const unit = findUnit(ctx, unitId);
  const p = ctx.placementsById[unitId];
  if (!p) throw new Error('单位缺少站位: ' + unitId);
  const fp = ctx.footprintsById[unitId] || unit.footprint || { width: 1, height: 1 };
  const flying = hasFlying(ctx, unit);
  const occ = buildLiveOcc(ctx);
  const enterable = (col, row) => regionEnterable(ctx, col, row, fp, occ, unitId, unit.side, flying);

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
        const step = ((dc && dr) ? SQRT2 : 1) * costMultiplier / moveMultiplier(ctx, unitId, cur);
        const nCost = cur.cost + step;
        if (nCost > budget + EPS) continue;
        if (!enterable(nc, nr)) continue;
        if (canStep && !canStep(cur.col, cur.row, nc, nr)) continue;
        if (barrierCrossing(ctx, unitId, { col: cur.col, row: cur.row }, { col: nc, row: nr })) continue;
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

// 冲锋的扫掠只受实墙（含关门、实心外壁）截停；占格接触不阻断路径。
export function chargePath(ctx, unitId, aim, distance) {
  const unit = findUnit(ctx, unitId);
  const p = ctx.placementsById[unitId];
  if (!p) throw new Error('单位缺少站位: ' + unitId);
  const fp = ctx.footprintsById[unitId] || unit.footprint || { width: 1, height: 1 };
  const origin = unitCenter(p, fp);
  const dx = aim.x - origin.x, dy = aim.y - origin.y;
  const from = { col: p.col, row: p.row };
  if (Math.hypot(dx, dy) <= EPS) {
    return { ok: false, reason: '冲锋方向无效', path: [], steps: [], cells: [], from, direction: { x: 0, y: 0 }, distance: 0, stepDistance: 0, blockingEntries: [] };
  }
  const q = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  const dir = { x: Math.round(Math.cos(q)), y: Math.round(Math.sin(q)) };
  const stepDistance = dir.x && dir.y ? SQRT2 : 1;
  const occ = buildLiveOcc(ctx);
  const steps = [], path = [from], cells = new Map(), blockingEntries = [];
  const seen = new Set([unitId]);
  let traveled = 0;
  while (traveled + stepDistance <= distance + EPS) {
    const cur = path[path.length - 1];
    const col = cur.col + dir.x, row = cur.row + dir.y;
    const sweep = occupiedCells({ col, row }, fp);
    const wall = sweep.find(c => {
      const cell = cellAt(ctx.compiled, c.col, c.row);
      return !cell || cell.void || cell.objectIds.some(id => {
        const obj = ctx.compiled.objectsIndex.get(id);
        return obj.kind === 'wall' || obj.kind === 'door' && !obj.open;
      });
    });
    if (wall) { blockingEntries.push({ type: 'terrain', ...wall }); break; }
    for (const c of sweep) {
      const key = cellKey(c.col, c.row), o = occ.get(key);
      cells.set(key, c);
      if (!o || seen.has(o.id)) continue;
      seen.add(o.id);
      blockingEntries.push({ type: 'unit', unitId: o.id, side: o.side, ...c });
    }
    steps.push({ col, row, cells: sweep });
    path.push({ col, row });
    traveled += stepDistance;
  }
  return { ok: true, reason: null, path, steps, cells: [...cells.values()], from, direction: dir, distance: traveled, stepDistance, blockingEntries };
}
