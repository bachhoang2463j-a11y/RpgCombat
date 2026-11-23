// ==========================================
// 战棋 P09/M4 敌方基础 AI（追打最近可攻击位置，够不到则沿路径前进，再否则接近或等待）
// 与玩家共用 findReachable/queryAttack 同一套合法性查询（预览=执行=AI）。
// 只读：不改 ctx（落点经浅复制 placementsById 传入查询）、不掷骰、不调用异步、不碰表现层。
// 选位排序：真实收益 → 移动成本 → 目标稳定 ID → 技能候选序，全程确定性。
// 感知：优先用 ctx.canSeeUnit?.() 过滤敌方；无该回调时保持旧行为（全可见），空 regions 兼容老测试。
// 浓雾：无八邻接可见敌人时优先离雾，出口路径跨预算且主行动>0 时请求冲刺；出雾后下一轮再攻击。
// ==========================================

import { findReachable, cellsAdjacent } from './movement.mjs';
import { queryAttack, resolveDefaultRange } from './range.mjs';
import { cellKey, unitCenter, cellCenter, occupiedCells } from './geometry.mjs';
import { skillSlots } from './effect-definitions.mjs';

const EPS = 1e-9;
const IDLE = { moveTo: null, skill: null, aim: null, action: 'wait' };
const SPATIAL_RANGES = ['单体', '直线', '扇形', '圆形', '全域', '爆炸', '自身'];

function isLive(u) {
  return !!(u && u.ref && u.ref.hp > 0);
}

function footprintOf(ctx, u) {
  return (ctx.footprintsById && ctx.footprintsById[u.id]) || u.footprint || { width: 1, height: 1 };
}

function skillKeyOf(skill) {
  const parent = skill && (skill.parentItemName || skill.parentName);
  return parent ? parent + '\u0000' + skill.name : (skill && skill.name);
}

function nowOf(ctx) {
  return typeof ctx.now === 'function' ? ctx.now() : 0;
}

function buffsOf(ctx, id) {
  return typeof ctx.buffsOf === 'function' ? (ctx.buffsOf(id) || []) : [];
}

// ---------- 感知与浓雾 ----------

function visibleEnemies(ctx, unit) {
  return ctx.units.filter(u => isLive(u) && u.side !== unit.side
    && (!ctx.canSeeUnit || ctx.canSeeUnit(unit.id, u.id)));
}

function fogRegions(ctx) {
  if (!Array.isArray(ctx.regions)) return [];
  const now = nowOf(ctx);
  return ctx.regions.filter(r => r && r.type === 'fog' && (r.endAt == null || now < r.endAt));
}

// 区域成员：优先 region.cells（{col,row}/[col,row]/'col,row'），否则退回 center+radius（世界米）
function cellInRegion(region, col, row) {
  const cells = region.cells;
  if ((Array.isArray(cells) || cells instanceof Set) && cells.size !== 0 && cells.length !== 0) {
    for (const c of cells) {
      if (c == null) continue;
      if (typeof c === 'string') { if (c === cellKey(col, row)) return true; }
      else if (Array.isArray(c)) { if (c[0] === col && c[1] === row) return true; }
      else if (typeof c === 'object' && c.col === col && c.row === row) return true;
    }
    return false;
  }
  if (region.center && Number.isFinite(region.radius)) {
    const cc = cellCenter(col, row);
    return Math.hypot(cc.x - region.center.x, cc.y - region.center.y) <= region.radius + EPS;
  }
  return false;
}

function inFogAt(ctx, col, row) {
  return fogRegions(ctx).some(r => cellInRegion(r, col, row));
}

function unitInFog(ctx, unit) {
  const p = ctx.placementsById[unit.id];
  if (!p) return false;
  return occupiedCells(p, footprintOf(ctx, unit)).some(c => inFogAt(ctx, c.col, c.row));
}

function hasAdjacentEnemy(ctx, unit, enemies) {
  const p = ctx.placementsById[unit.id];
  if (!p) return false;
  const fp = footprintOf(ctx, unit);
  return enemies.some(e => {
    const ep = ctx.placementsById[e.id];
    return ep && cellsAdjacent(p, fp, ep, footprintOf(ctx, e));
  });
}

// ---------- 查询视图（浅复制，不改 ctx） ----------

function withPlacement(ctx, unitId, col, row) {
  const placementsById = Object.assign({}, ctx.placementsById);
  placementsById[unitId] = Object.assign({}, placementsById[unitId], { col, row });
  return Object.assign({}, ctx, { placementsById });
}

function aimFor(ctx, target) {
  const tp = ctx.placementsById[target.id];
  const tc = unitCenter(tp, footprintOf(ctx, target));
  return { x: tc.x, y: tc.y, targetId: target.id };
}

// ---------- 收益评估 ----------

function slotBuffType(slot) {
  const d = slot.definition || {};
  if (d.kind === 'buff') return d.field;
  if (d.kind === 'shield') return 'shield';
  if (d.kind === 'stun') return 'stun';
  if (d.kind === 'dot') return d.dot;
  if (d.kind === 'paralyze') return 'paralyze';
  if (d.kind === 'taunt') return 'taunt';
  if (d.kind === 'damageGuard') return 'damageGuard';
  if (d.kind === 'counter') return 'counter';
  if (d.kind === 'variant') return 'variant';
  return null;
}

// 同源已生效：_source.skillId 命中（含父道具前缀）或同类型无来源记录
function sameSourceActive(ctx, targetId, skill, slot) {
  const key = skillKeyOf(skill);
  const bt = slotBuffType(slot);
  return buffsOf(ctx, targetId).some(b => {
    if (bt && b.type !== bt) return false;
    if (bt === 'variant' && b.variant !== slot.definition.variant) return false;
    const src = b._source && b._source.skillId;
    if (src) return src === key || src === skill.name || src.endsWith('\u0000' + skill.name);
    return true;
  });
}

// 增益已满：同字段同变种且强度不低于本次
function buffAtLeast(ctx, targetId, slot) {
  const bt = slotBuffType(slot);
  if (!bt) return false;
  const power = slot.power || 0;
  return buffsOf(ctx, targetId).some(b => b.type === bt
    && (b.variant || null) === (slot.definition.variant || null)
    && (b.value || 0) >= power - EPS);
}

// 任一槽的实际目标（纯减益无 damageTargetIds，必须走 slotTargets）
function evaluateQuery(ctx, unit, skill, query) {
  const slots = skillSlots(skill);
  let score = 0;
  for (const st of (query.slotTargets || [])) {
    const slot = slots[st.index];
    if (!slot) continue;
    const def = slot.definition || {};
    const targets = st.targetIds || [];
    if (def.kind === 'attack') {
      for (const tid of targets) {
        const t = ctx.units.find(u => u.id === tid);
        if (!t || t.side === unit.side) continue;
        score += Math.max(1, (slot.power || unit.ref.atk || 0) - (t.ref.def || 0));
      }
    } else if (def.kind === 'heal') {
      for (const tid of targets) {
        const t = ctx.units.find(u => u.id === tid);
        if (!t || !isLive(t)) continue;
        const miss = Math.max(0, (t.ref.maxHp || t.ref.hp) - (t.ref.hp || 0));
        score += Math.min(miss, slot.power || 0);
      }
    } else if (def.kind === 'healMp' || def.kind === 'healTp') {
      if (targets.length) score += Math.min(slot.power || 0, 10);
    } else if (def.kind === 'buff' || def.kind === 'shield' || def.kind === 'stun'
      || def.kind === 'dot' || def.kind === 'paralyze' || def.kind === 'taunt'
      || def.kind === 'damageGuard' || def.kind === 'counter' || def.kind === 'variant') {
      for (const tid of targets) {
        if (sameSourceActive(ctx, tid, skill, slot)) continue;
        if (def.kind === 'buff' && buffAtLeast(ctx, tid, slot)) continue;
        if (def.kind === 'shield') {
          const t = ctx.units.find(u => u.id === tid);
          if (t && (t.ref.shield || 0) >= (slot.power || 0)) continue;
        }
        score += (def.debuff ? 6 : 5) + (slot.power || 0) * 0.1;
      }
    } else if (def.kind === 'drainMp' || def.kind === 'dispel') {
      if (targets.length) score += 4;
    }
  }
  return score;
}

// ---------- 候选搜索 ----------

function aimPool(eff, enemies, allies, unit) {
  if (eff.range && eff.range.type === '自身') return [unit];
  const slots = skillSlots(eff);
  const wantEnemy = slots.some(s => s.definition.side === 'enemy' || s.attack || s.definition.debuff);
  const wantAlly = slots.some(s => s.definition.side === 'ally' || s.definition.side === 'self' || s.target === 'self');
  const out = [];
  const seen = new Set();
  const push = u => { if (u && !seen.has(u.id)) { seen.add(u.id); out.push(u); } };
  if (wantEnemy) enemies.forEach(push);
  if (wantAlly) allies.forEach(push);
  if (!out.length) { enemies.forEach(push); allies.forEach(push); }
  return out;
}

function cmpCell(a, b) {
  if (Math.abs(a.cost - b.cost) > EPS) return a.cost - b.cost;
  if (a.row !== b.row) return a.row - b.row;
  return a.col - b.col;
}

function cmpBetter(a, b) {
  if (Math.abs(a.score - b.score) > EPS) return b.score - a.score;
  if (Math.abs(a.cost - b.cost) > EPS) return a.cost - b.cost;
  if (a.targetId !== b.targetId) return a.targetId < b.targetId ? -1 : 1;
  return a.si - b.si;
}

function searchBest(ctx, unit, skills, budget, enemies, allies) {
  const reach = findReachable(ctx, unit.id, budget);
  const cells = reach.cells.slice().sort(cmpCell);
  const start = ctx.placementsById[unit.id];
  const startCenter = unitCenter(start, footprintOf(ctx, unit));
  let best = null;

  for (let si = 0; si < skills.length; si++) {
    const raw = skills[si];
    let eff = raw.range ? raw : null;
    if (!eff) {
      const r = resolveDefaultRange(raw);
      if (r) eff = Object.assign({}, raw, { range: r });
    }
    if (!eff || !eff.range) continue;

    // 召唤：无空间查询可用，仅在原地给出低收益候选（合法性由 canUseSkill 前置门禁保证）
    if (!SPATIAL_RANGES.includes(eff.range.type)) {
      if (!eff.summonTarget) continue;
      let legal = null;
      for (const cell of reach.cells) {
        const q = queryAttack(ctx, unit.id, eff, { x: cell.col + 0.5, y: cell.row + 0.5 });
        if (q.ok) { legal = q; break; }
      }
      if (!legal) continue;
      const startCell = reach.byKey.get(cellKey(start.col, start.row));
      if (!startCell) continue;
      const cand = { score: 3, cost: 0, cell: startCell, skill: raw, aim: legal.aim, targetId: unit.id, si };
      if (!best || cmpBetter(cand, best) < 0) best = cand;
      continue;
    }

    const maxReach = eff.range.type === '自身' ? 0
      : (eff.range.castRange != null ? eff.range.castRange
        : (eff.range.length != null ? eff.range.length : Infinity));
    const pool = aimPool(eff, enemies, allies, unit);

    for (const target of pool) {
      const tp = ctx.placementsById[target.id];
      if (!tp) continue;
      const tc = unitCenter(tp, footprintOf(ctx, target));
      if (budget !== Infinity && Number.isFinite(maxReach)) {
        const lower = Math.hypot(tc.x - startCenter.x, tc.y - startCenter.y) - maxReach;
        if (lower > budget + 1 + EPS) continue; // 理论上无法进入射程，跳过
      }
      let found = null;
      for (const cell of cells) {
        const ctx2 = withPlacement(ctx, unit.id, cell.col, cell.row);
        const aim = { x: tc.x, y: tc.y, targetId: target.id };
        const q = queryAttack(ctx2, unit.id, eff, aim);
        if (!q.ok) continue;
        const score = evaluateQuery(ctx2, unit, eff, q);
        if (score <= EPS) continue;
        found = { score, cost: cell.cost, cell, skill: raw, aim, targetId: target.id, si };
        break; // 该 (技能,目标) 取最省移动的合法落点
      }
      if (found && (!best || cmpBetter(found, best) < 0)) best = found;
    }
  }
  return { best, reach };
}

function stepAlong(ctx, reach, unit, path, budget) {
  const p = ctx.placementsById[unit.id];
  let moveTo = null;
  for (const step of path) {
    const sc = reach.byKey.get(cellKey(step.col, step.row));
    if (sc && sc.cost <= budget + EPS) moveTo = { col: step.col, row: step.row };
    else if (sc && sc.cost > budget + EPS) break;
  }
  if (moveTo && (moveTo.col !== p.col || moveTo.row !== p.row)) return moveTo;
  return null;
}

function nearestEnemyCell(ctx, unit, cells, enemies) {
  const fp = footprintOf(ctx, unit);
  let best = null;
  for (const cell of cells) {
    const from = unitCenter({ col: cell.col, row: cell.row }, fp);
    let minDist = Infinity;
    for (const e of enemies) {
      const ep = ctx.placementsById[e.id];
      if (!ep) continue;
      const ec = unitCenter(ep, footprintOf(ctx, e));
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
  return best ? best.cell : null;
}

// ---------- 浓雾离场 ----------

function planFogExit(ctx, unit, moveBudget, res) {
  const p = ctx.placementsById[unit.id];
  const full = findReachable(ctx, unit.id, Infinity);
  let exit = null;
  for (const cell of full.cells) {
    const ctx2 = withPlacement(ctx, unit.id, cell.col, cell.row);
    if (unitInFog(ctx2, unit)) continue;
    if (!exit || cell.cost < exit.cost - EPS
      || (Math.abs(cell.cost - exit.cost) <= EPS && cellKey(cell.col, cell.row) < cellKey(exit.col, exit.row))) {
      exit = cell;
    }
  }
  if (!exit) return null;

  if (exit.cost <= moveBudget + EPS) {
    if (exit.cost <= EPS) return null; // 已在雾外（理论上不会走到这里）
    return { moveTo: { col: exit.col, row: exit.row }, skill: null, aim: null, action: null };
  }
  // 出口路径跨当前移动预算：主行动可用则请求冲刺，由主代理加额度后重算
  if (res && res.main > 0) return { moveTo: null, skill: null, aim: null, action: 'sprint' };
  // 无法冲刺：本轮向出口尽量前进
  const moveTo = stepAlong(ctx, full, unit, exit.path, moveBudget);
  if (moveTo) return { moveTo, skill: null, aim: null, action: null };
  return null;
}

function toResult(hit, res) {
  const preparing = hit.skill && (hit.skill.charge > 0 || hit.skill.delay > 0) && !(res && res.preparing);
  return {
    moveTo: hit.cost > EPS ? { col: hit.cell.col, row: hit.cell.row } : null,
    skill: hit.skill,
    aim: hit.aim,
    action: preparing ? 'prepare' : null,
  };
}

// chooseEnemyAction(ctx, unitId, moveBudget, skills, canUseSkill?, resources?) ->
// { moveTo, skill, aim, action: 'sprint'|'prepare'|'defend'|'wait'|null }
export function chooseEnemyAction(ctx, unitId, moveBudget, skills, canUseSkill = null, resources = null) {
  const unit = ctx.units.find(u => u.id === unitId);
  if (!unit || !isLive(unit)) return Object.assign({}, IDLE);
  const p = ctx.placementsById[unitId];
  if (!p) return Object.assign({}, IDLE);
  const res = resources || { main: 1, aux: 1, preparing: null, moveDistance: (unit.ref && unit.ref.moveDistance) || 0 };

  const enemies = visibleEnemies(ctx, unit);
  const allies = ctx.units.filter(u => isLive(u) && u.side === unit.side);
  const usable = (skills || []).filter(s => s && !s.isReaction && s.trigger !== 'death'
    && (!canUseSkill || canUseSkill(s).ok));

  // 一、浓雾且无八邻接可见敌人：优先离雾（可冲刺，出雾后下一轮再攻击）
  if (unitInFog(ctx, unit) && !hasAdjacentEnemy(ctx, unit, enemies)) {
    const exit = planFogExit(ctx, unit, moveBudget, res);
    if (exit) return exit;
  }

  // 二、额度内最优真实收益（攻击/减益/治疗/增益/准备/召唤）
  const inBudget = searchBest(ctx, unit, usable, moveBudget, enemies, allies);
  if (inBudget.best) return toResult(inBudget.best, res);

  // 三、只有可见敌方及可用技能时才搜索跨本轮预算的攻击位。
  if (enemies.length && usable.length) {
    const fullBest = searchBest(ctx, unit, usable, Infinity, enemies, allies);
    if (fullBest.best) {
      const moveTo = stepAlong(ctx, fullBest.reach, unit, fullBest.best.cell.path, moveBudget);
      if (moveTo) return { moveTo, skill: null, aim: null, action: null };
    }
  }

  // 四、无可执行收益：额度内向最近可见敌人接近
  if (enemies.length) {
    const reach = findReachable(ctx, unit.id, moveBudget);
    const bestCell = nearestEnemyCell(ctx, unit, reach.cells, enemies);
    if (bestCell && bestCell.cost > EPS) {
      return { moveTo: { col: bestCell.col, row: bestCell.row }, skill: null, aim: null, action: null };
    }
  }

  // 五、无进展：贴身则防御，否则守位等待（不追踪不可见目标）
  if (enemies.length && hasAdjacentEnemy(ctx, unit, enemies)) {
    return { moveTo: null, skill: null, aim: null, action: 'defend' };
  }
  return Object.assign({}, IDLE);
}
