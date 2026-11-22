// ==========================================
// 战棋 P09/M4 敌方基础 AI（追打最近可攻击位置，够不到则沿路径前进，再否则接近或等待）
// 与玩家共用 findReachable/queryAttack 同一套合法性查询（预览=执行=AI）。
// 只读：不改 ctx（假设落点经浅复制 placementsById 传入查询）、不掷骰、不调用异步。
// 选位排序：移动成本 → 与目标距离 → 敌人稳定 ID → 技能候选序，全程确定性。
// ==========================================

import { findReachable } from './movement.mjs';
import { queryAttack } from './range.mjs';
import { cellKey, unitCenter } from './geometry.mjs';

const EPS = 1e-9;
const IDLE = { moveTo: null, skill: null, aim: null };

function isLive(u) {
  return !!(u.ref && u.ref.hp > 0);
}

function footprintOf(ctx, u) {
  return ctx.footprintsById[u.id] || u.footprint || { width: 1, height: 1 };
}

// 攻击候选：单体/直线/扇形三种已实现范围（反应技与他人技除外）。
// 瞄准点取目标占格中心：直线/扇形按同一 queryAttack 求交，候选只在真实 targetIds 含该目标时成立。
function attackCandidates(skills) {
  return (skills || []).filter(s =>
    !s.isReaction && !s.isOthers && (s.type === '[单体]' || (s.range && ['单体', '直线', '扇形'].includes(s.range.type))));
}

// 假设单位移动到 (col,row) 后的查询视图：浅复制 placementsById，不改原 ctx
function withPlacement(ctx, unitId, col, row) {
  const placementsById = Object.assign({}, ctx.placementsById);
  placementsById[unitId] = Object.assign({}, placementsById[unitId], { col, row });
  return Object.assign({}, ctx, { placementsById });
}

// 落点 × 存活敌人 × 候选技逐一真实查询，收集可攻击解
function collectHits(ctx, reach, unitId, cands, enemies) {
  const unit = ctx.units.find(u => u.id === unitId);
  const fp = footprintOf(ctx, unit);
  const hits = [];
  for (const cell of reach.cells) {
    const ctx2 = withPlacement(ctx, unitId, cell.col, cell.row);
    const from = unitCenter({ col: cell.col, row: cell.row }, fp);
    for (const e of enemies) {
      const ec = unitCenter(ctx.placementsById[e.id], footprintOf(ctx, e));
      const aim = { x: ec.x, y: ec.y, targetId: e.id };
      for (let si = 0; si < cands.length; si++) {
        const res = queryAttack(ctx2, unitId, cands[si], aim);
        if (res.ok && res.targetIds.includes(e.id)) {
          hits.push({
            cost: cell.cost,
            dist: Math.hypot(ec.x - from.x, ec.y - from.y),
            enemyId: e.id, si, skill: cands[si], aim, cell,
          });
        }
      }
    }
  }
  return hits;
}

function cmpHit(a, b) {
  if (Math.abs(a.cost - b.cost) > EPS) return a.cost - b.cost;
  if (Math.abs(a.dist - b.dist) > EPS) return a.dist - b.dist;
  if (a.enemyId !== b.enemyId) return a.enemyId < b.enemyId ? -1 : 1;
  return a.si - b.si;
}

// chooseEnemyAction(ctx, unitId, moveBudget, skills) -> { moveTo:{col,row}|null, skill|null, aim|null }
export function chooseEnemyAction(ctx, unitId, moveBudget, skills) {
  const unit = ctx.units.find(u => u.id === unitId);
  if (!unit || !isLive(unit)) return IDLE;
  const p = ctx.placementsById[unitId];
  if (!p) return IDLE;
  const enemies = ctx.units.filter(u => isLive(u) && u.side !== unit.side);
  if (!enemies.length) return IDLE;
  const cands = attackCandidates(skills);

  // 一、额度内落点找最近可攻击位置
  const reach = findReachable(ctx, unitId, moveBudget);
  if (cands.length) {
    const hits = collectHits(ctx, reach, unitId, cands, enemies);
    if (hits.length) {
      hits.sort(cmpHit);
      const best = hits[0];
      return {
        moveTo: best.cost > EPS ? { col: best.cell.col, row: best.cell.row } : null,
        skill: best.skill,
        aim: { x: best.aim.x, y: best.aim.y, targetId: best.enemyId },
      };
    }
  }

  // 二、额度内够不到：沿全图最佳可攻击位置的路径在额度内前进
  if (cands.length) {
    const full = findReachable(ctx, unitId, Infinity);
    const fullHits = collectHits(ctx, full, unitId, cands, enemies);
    if (fullHits.length) {
      fullHits.sort(cmpHit);
      let moveTo = null;
      for (const step of fullHits[0].cell.path) {
        const sc = full.byKey.get(cellKey(step.col, step.row));
        if (sc && sc.cost <= moveBudget + EPS) moveTo = { col: step.col, row: step.row };
        else if (sc && sc.cost > moveBudget + EPS) break; // 友方中途格不能站立，继续寻找后续合法落点
      }
      if (moveTo && (moveTo.col !== p.col || moveTo.row !== p.row)) {
        return { moveTo, skill: null, aim: null };
      }
    }
  }

  // 三、无可攻击位置（全图够不到或无候选技）：额度内接近最近敌人方向，无进展则等待
  let best = null;
  for (const cell of reach.cells) {
    const from = unitCenter({ col: cell.col, row: cell.row }, footprintOf(ctx, unit));
    let minDist = Infinity;
    for (const e of enemies) {
      const ec = unitCenter(ctx.placementsById[e.id], footprintOf(ctx, e));
      const d = Math.hypot(ec.x - from.x, ec.y - from.y);
      if (d < minDist) minDist = d;
    }
    const cand = { dist: minDist, cost: cell.cost, key: cellKey(cell.col, cell.row), cell };
    if (!best
      || cand.dist < best.dist - EPS
      || (Math.abs(cand.dist - best.dist) <= EPS && (cand.cost < best.cost - EPS
        || (Math.abs(cand.cost - best.cost) <= EPS && cand.key < best.key)))) {
      best = cand;
    }
  }
  if (best && best.cost > EPS) return { moveTo: { col: best.cell.col, row: best.cell.row }, skill: null, aim: null };
  return IDLE;
}
