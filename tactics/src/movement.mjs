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
    if (!u.ref || u.ref.hp <= 0) continue;
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

// 可达合法落点：{ cells: [{col,row,cost,path:[{col,row}]}], byKey: Map<cellKey, cell> }
// cells 只含可站落点（含起点 cost 0）；path 为锚点完整轨迹（友方格可作中途点）。
export function findReachable(ctx, unitId, budget = Infinity) {
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
        const step = (dc && dr) ? SQRT2 : 1;
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
