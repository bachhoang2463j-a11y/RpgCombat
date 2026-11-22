// ==========================================
// 战棋 P09/M4 敌方基础 AI（追打最近可攻击位置，够不到则沿路径前进，再否则接近或等待）
// 与玩家共用 findReachable/queryAttack 同一套合法性查询（预览=执行=AI）。
// 只读：不改 ctx（假设落点经浅复制 placementsById 传入查询）、不掷骰、不调用异步。
// 选位排序：移动成本 → 与目标距离 → 敌人稳定 ID → 技能候选序，全程确定性。
// ==========================================

import { findReachable } from './movement.mjs';
import { queryAttack } from './range.mjs';
import { cellKey, unitCenter } from './geometry.mjs';
import { skillSlots } from './effect-definitions.mjs';

const EPS = 1e-9;
const IDLE = { moveTo: null, skill: null, aim: null };

function isLive(u) {
  return !!(u.ref && u.ref.hp > 0);
}

function footprintOf(ctx, u) {
  return ctx.footprintsById[u.id] || u.footprint || { width: 1, height: 1 };
}

// 攻击/增益候选：敌我两侧槽位均接（反应技除外）；side 记入候选供目标池选择。
// 瞄准点取目标占格中心：直线/扇形按同一 queryAttack 求交，候选只在真实 targetIds 含该目标时成立。
function attackCandidates(skills) {
  const out = [];
  for (const s of (skills || [])) {
    if (s.isReaction || !s.range
      || !['单体', '直线', '扇形', '圆形', '全域', '爆炸', '自身'].includes(s.range.type)) continue;
    const slots = skillSlots(s);
    const enemySlot = slots.some(slot => slot.definition.side === 'enemy');
    const allySlot = slots.some(slot => slot.definition.side === 'ally' || slot.target === 'self') || !!s.summonTarget;
    if (enemySlot) out.push(Object.assign({}, s, { _aiSide: 'enemy' }));
    else if (allySlot) out.push(Object.assign({}, s, { _aiSide: 'ally' }));
  }
  return out;
}

// 假设单位移动到 (col,row) 后的查询视图：浅复制 placementsById，不改原 ctx
function withPlacement(ctx, unitId, col, row) {
  const placementsById = Object.assign({}, ctx.placementsById);
  placementsById[unitId] = Object.assign({}, placementsById[unitId], { col, row });
  return Object.assign({}, ctx, { placementsById });
}

// 落点 × 目标池（按候选敌我语义）× 候选技逐一真实查询，收集可执行解
function collectHits(ctx, reach, unitId, cands, enemies, allies) {
  const unit = ctx.units.find(u => u.id === unitId);
  const fp = footprintOf(ctx, unit);
  const hits = [];
  for (const cell of reach.cells) {
    const ctx2 = withPlacement(ctx, unitId, cell.col, cell.row);
    const from = unitCenter({ col: cell.col, row: cell.row }, fp);
    for (const cand of cands) {
      const pool = cand._aiSide === 'ally' ? allies : enemies;
      for (const e of pool) {
        const ec = unitCenter(ctx.placementsById[e.id], footprintOf(ctx, e));
        const aim = { x: ec.x, y: ec.y, targetId: e.id };
        const res = queryAttack(ctx2, unitId, cand, aim);
        const okTargets = cand._aiSide === 'ally' ? res.ok && (res.slotTargets || []).some(st => st.targetIds && st.targetIds.includes(e.id)) && !res.slotTargets.every(st => !(st.targetIds || []).length)
          : res.ok && res.damageTargetIds.includes(e.id);
        if (okTargets) {
          hits.push({
            cost: cell.cost,
            dist: Math.hypot(ec.x - from.x, ec.y - from.y),
            enemyId: e.id, si: cands.indexOf(cand), skill: cand, aim, cell,
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
export function chooseEnemyAction(ctx, unitId, moveBudget, skills, canUseSkill = null) {
  const unit = ctx.units.find(u => u.id === unitId);
  if (!unit || !isLive(unit)) return IDLE;
  const p = ctx.placementsById[unitId];
  if (!p) return IDLE;
  const enemies = ctx.units.filter(u => isLive(u) && u.side !== unit.side);
  const allies = ctx.units.filter(u => isLive(u) && u.side === unit.side);
  const cands = attackCandidates(skills).filter(skill => !canUseSkill || canUseSkill(skill).ok);
  const hasEnemyCand = cands.some(c => c._aiSide === 'enemy');
  if (!enemies.length && !cands.some(c => c._aiSide === 'ally')) return IDLE;

  // 一、额度内落点找最近可执行位置（敌侧攻击 / 友侧增益治疗）
  const reach = findReachable(ctx, unitId, moveBudget);
  if (cands.length) {
    const hits = collectHits(ctx, reach, unitId, cands, enemies, allies);
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

  // 二、额度内够不到：沿全图最佳可执行位置的路径在额度内前进（仅敌侧攻击推进）
  if (hasEnemyCand) {
    const full = findReachable(ctx, unitId, Infinity);
    const fullHits = collectHits(ctx, full, unitId, cands.filter(c => c._aiSide === 'enemy'), enemies, allies);
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
