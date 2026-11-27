// ==========================================
// 战棋 P09/M4 敌方基础 AI（追打最近可攻击位置，够不到则沿路径前进，再否则接近或等待）
// 与玩家共用 findReachable/queryAttack 同一套合法性查询（预览=执行=AI）。
// 不改 ctx（落点经浅复制 placementsById 传入查询）、不调用异步、不碰表现层。
// 选位排序：真实收益 → 移动成本 → 目标稳定 ID → 技能候选序；攻击目标按有效嘲讽抽选一次。
// 感知：优先用 ctx.canSeeUnit?.() 过滤敌方；无该回调时保持旧行为（全可见），空 regions 兼容老测试。
// 浓雾：无八邻接可见敌人时优先离雾，出口路径跨预算且主行动>0 时请求冲刺；出雾后下一轮再攻击。
// ==========================================

import { findRiskAwareReachable, findJumpPath, canPlaceAt, cellsAdjacent } from './movement.mjs';
import { queryAttack, resolveDefaultRange } from './range.mjs';
import { cellKey, unitCenter, cellCenter, occupiedCells } from './geometry.mjs';
import { skillSlots } from './effect-definitions.mjs';
import { interception } from './barriers.mjs';
import { fogAffects } from './regions.mjs';
import { getEffectiveStats } from './class-passives.mjs';
import { actionBalance } from './actions.mjs';

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

export function visibleEnemies(ctx, unit) {
  return ctx.units.filter(u => isLive(u) && u.side !== unit.side && !u.isSubdued && !u.ref.isSubdued
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

function fogChecker(ctx, unit) {
  const regions = fogRegions(ctx);
  if (!regions.length) return null;
  const fp = footprintOf(ctx, unit), cache = new Map();
  return (col, row) => {
    const key = cellKey(col, row);
    if (!cache.has(key)) {
      const cells = occupiedCells({ col, row }, fp);
      cache.set(key, regions.some(r => cells.some(c => cellInRegion(r, c.col, c.row))
        && fogAffects(withPlacement(ctx, unit.id, col, row), r, unit.id)));
    }
    return cache.get(key);
  };
}

// 只供 AI 选路：允许沿雾内走到出口，出雾后不再进雾；不改每步的实扣成本。
export function fogRouteFilter(ctx, unit, inFog = fogChecker(ctx, unit)) {
  return inFog && ((col, row, nextCol, nextRow) => !inFog(nextCol, nextRow) || inFog(col, row));
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
function evaluateQuery(ctx, unit, skill, query, disclosed) {
  const slots = skillSlots(skill);
  let score = 0;
  for (const st of (query.slotTargets || [])) {
    const slot = slots.find(s => s.index === st.index);
    if (!slot) continue;
    const def = slot.definition || {};
    const targets = disclosed ? (st.targetIds || []).filter(id => disclosed.has(id)) : (st.targetIds || []);
    if (def.kind === 'attack') {
      const barrierIds = new Set(st.barrierIds || []);
      for (const tid of targets) {
        const guard = query.chargePath ? null : interception(ctx, unit.id, tid);
        if (guard) { barrierIds.add(guard.id); continue; }
        const t = ctx.units.find(u => u.id === tid);
        if (!t) continue;
        score += (t.side === unit.side ? -1 : 1) * Math.max(1, (slot.power || unit.ref.atk || 0) - (t.ref.def || 0));
      }
      for (const id of barrierIds) {
        const barrier = (ctx.barriers || []).find(b => b.id === id);
        if (barrier) score += barrierBenefit(unit, slot, skill, barrier);
      }
    } else if (def.kind === 'heal') {
      for (const tid of targets) {
        const t = ctx.units.find(u => u.id === tid);
        if (!t || !isLive(t)) continue;
        const miss = Math.max(0, (t.ref.maxHp || t.ref.hp) - (t.ref.hp || 0));
        score += (t.side === unit.side ? 1 : -1) * Math.min(miss, slot.power || 0);
      }
    } else if (def.kind === 'healMp' || def.kind === 'healTp') {
      const key = def.kind === 'healMp' ? 'mp' : 'tp', maxKey = def.kind === 'healMp' ? 'maxMp' : 'maxTp';
      for (const tid of targets) {
        const ref = ctx.units.find(u => u.id === tid)?.ref;
        if (ref) score += Math.min(slot.power || 0, Math.max(0, (ref[maxKey] ?? 100) - (ref[key] || 0)), 10);
      }
    } else if (def.kind === 'buff' || def.kind === 'shield' || def.kind === 'stun'
      || def.kind === 'dot' || def.kind === 'paralyze' || def.kind === 'taunt'
      || def.kind === 'damageGuard' || def.kind === 'counter' || def.kind === 'variant') {
      for (const tid of targets) {
        if (slot.debuff && interception(ctx, unit.id, tid)) continue;
        if (sameSourceActive(ctx, tid, skill, slot)) continue;
        if (def.kind === 'buff' && buffAtLeast(ctx, tid, slot)) continue;
        if (def.kind === 'shield') {
          const t = ctx.units.find(u => u.id === tid);
          if (t && (t.ref.shield || 0) >= (slot.power || 0)) continue;
        }
        const target = ctx.units.find(u => u.id === tid);
        if (!target) continue;
        const beneficial = def.debuff ? target.side !== unit.side : target.side === unit.side;
        score += (beneficial ? 1 : -1) * ((def.debuff ? 6 : 5) + (slot.power || 0) * 0.1);
      }
    } else if (def.kind === 'drainMp' || def.kind === 'dispel') {
      if (targets.length) score += 4;
    }
  }
  return score;
}

// 不变更结界的纯收益估值；执行伤害仍由 battle 共用结算。
export function barrierBenefit(unit, slot, skill, barrier) {
  if (barrier.side === unit.side) return 0;
  const raw = slot.power || unit.ref.atk || 0;
  const incomingType = slot.definition.damageCategory || skill.damageType;
  const resisted = incomingType === barrier.protectType ? Math.floor(raw * 0.5) : raw;
  return Math.min(barrier.integrity, Math.max(0, resisted - barrier.armor * (slot.definition.scatter ? 3 : 1)));
}

// 满充在一个固定站位求解：瞄准格与方向都走正常空间查询；不沿用普通 AI 的选人抽签。
export function selectChargeAim(ctx, unit, skill, enemies) {
  const range = skill.range || resolveDefaultRange(skill);
  const origin = unitCenter(ctx.placementsById[unit.id], footprintOf(ctx, unit));
  const targetIds = new Set(enemies.filter(e => !interception(ctx, unit.id, e.id)).map(e => e.id));
  if (!targetIds.size) return null;
  const targets = enemies.filter(e => targetIds.has(e.id));
  const centers = targets.map(e => ({ ...unitCenter(ctx.placementsById[e.id], footprintOf(ctx, e)), targetId: e.id }));
  const targetCells = targets.flatMap(e => occupiedCells(ctx.placementsById[e.id], footprintOf(ctx, e)));
  const fixed = ['自身', '圆形', '全域'].includes(range.type);
  const aimPoints = fixed ? [null] : centers.slice();
  if (!fixed && range.type !== '单体') {
    const { columns, rows } = ctx.compiled.grid;
    const reach = range.castRange ?? Infinity;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const x = col + 0.5, y = row + 0.5;
      if (Math.hypot(x - origin.x, y - origin.y) <= reach + EPS) aimPoints.push({ x, y });
    }
  }
  let best = null;
  const seen = new Set();
  const p = ctx.placementsById[unit.id];
  const inFog = fogChecker(ctx, unit)?.(p.col, p.row);
  for (const aim of aimPoints) {
    if (aim && range.type === '直线' && !skill.displacements?.some(d => d.type === '冲锋')) {
      const dx = aim.x - origin.x, dy = aim.y - origin.y, length = Math.hypot(dx, dy);
      if (length <= EPS) continue;
      const ux = dx / length, uy = dy / length;
      const key = Math.atan2(dy, dx).toFixed(12);
      // 雾中的方向必须先通过瞄准点限制，不能因更远的同方向格而丢掉近处合法点。
      if (!inFog) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      if (!targetCells.some(({ col, row }) => {
        const rx = col + 0.5 - origin.x, ry = row + 0.5 - origin.y;
        const along = rx * ux + ry * uy;
        return along >= -EPS && along <= range.length + EPS && Math.abs(rx * uy - ry * ux) <= range.width / 2 + EPS;
      })) continue;
    }
    const query = queryAttack(ctx, unit.id, skill, aim);
    if (!query.ok) continue;
    const count = new Set(query.slotTargets.flatMap(slot => slot.attack ? slot.targetIds.filter(id => targetIds.has(id)) : [])).size;
    if (!count || best && count < best.count) continue;
    const score = evaluateQuery(ctx, unit, skill, query, null);
    if (!best || count > best.count || score > best.score + EPS) best = { query, count, score };
  }
  return best?.query || null;
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
  const delta = a.cost - b.cost + ((a.opportunityRisk || 0) - (b.opportunityRisk || 0)) * Math.SQRT2;
  if (Math.abs(delta) > EPS) return delta;
  if (a.row !== b.row) return a.row - b.row;
  return a.col - b.col;
}

function cmpBetter(a, b) {
  if (Math.abs(a.score - b.score) > EPS) return b.score - a.score;
  if (Math.abs(a.cost - b.cost) > EPS) return a.cost - b.cost;
  if (a.targetId !== b.targetId) return a.targetId < b.targetId ? -1 : 1;
  return a.si - b.si;
}

export function chooseTauntTarget(ctx, unit, targets, random = ctx.random || Math.random) {
  if (!targets.length) return null;
  if (unit.isWise || unit.ref.isWise) {
    const low = targets.filter(t => t.ref.maxHp > 0 && t.ref.hp / t.ref.maxHp <= 0.3)
      .sort((a, b) => a.ref.hp / a.ref.maxHp - b.ref.hp / b.ref.maxHp || a.id.localeCompare(b.id));
    if (low.length) return low[0];
  }
  if (targets.length === 1) return targets[0];
  const weights = targets.map(t => Math.max(1, getEffectiveStats(t, buffsOf(ctx, t.id)).taunt));
  let point = random() * weights.reduce((n, w) => n + w, 0);
  for (let i = 0; i < targets.length; i++) {
    point -= weights[i];
    if (point < 0) return targets[i];
  }
  return targets[targets.length - 1];
}

function moveReach(ctx, unit, budget, canStep = null) {
  return findRiskAwareReachable(ctx, unit.id, budget, ctx.carrying?.[unit.id] ? 2 : 1, canStep);
}

function searchBest(ctx, unit, skills, budget, enemies, allies, tracking, reach = moveReach(ctx, unit, budget), selection = {}) {
  const cells = reach.cells.slice().sort(cmpCell);
  const start = ctx.placementsById[unit.id];
  const startCenter = unitCenter(start, footprintOf(ctx, unit));
  let best = null;
  const attacksByTarget = new Map();

  for (let si = 0; si < skills.length; si++) {
    const raw = skills[si];
    let eff = raw.range ? raw : null;
    if (!eff) {
      const r = resolveDefaultRange(raw);
      if (r) eff = Object.assign({}, raw, { range: r });
    }
    if (!eff || !eff.range || eff.displacements?.some(d => d.type === '闪现')) continue;
    const offensiveSlots = selection.focusTargetId ? new Set(skillSlots(eff).filter(s => s.attack || s.definition.debuff).map(s => s.index)) : null;
    if (offensiveSlots && !offensiveSlots.size) continue;

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

    const charge = eff.displacements?.find(d => d.type === '冲锋');
    const maxReach = charge ? charge.distance + Math.hypot(footprintOf(ctx, unit).width, footprintOf(ctx, unit).height) / 2
      : eff.range.type === '自身' ? 0 : eff.range.castRange ?? eff.range.length ?? Infinity;
    const pool = aimPool(eff, enemies, allies, unit);
    if (!charge && skillSlots(eff).some(s => s.attack)) for (const b of ctx.barriers || []) {
      if (b.side !== unit.side && b.center) pool.push({ id: b.id, barrier: b });
    }

    for (const target of pool) {
      const tp = ctx.placementsById[target.id];
      if (!tp && !target.barrier) continue;
      const tc = target.barrier ? target.barrier.center : unitCenter(tp, footprintOf(ctx, target));
      if (budget !== Infinity && Number.isFinite(maxReach)) {
        const lower = Math.hypot(tc.x - startCenter.x, tc.y - startCenter.y) - maxReach - (target.barrier?.radius || 0);
        if (lower > budget + 1 + EPS) continue; // 理论上无法进入射程，跳过
      }
      let found = null;
      for (const cell of cells) {
        const ctx2 = withPlacement(ctx, unit.id, cell.col, cell.row);
        const aim = target.barrier ? { barrierId: target.id } : { x: tc.x, y: tc.y, targetId: target.id };
        const q = queryAttack(ctx2, unit.id, eff, aim);
        if (!q.ok || (offensiveSlots && !q.slotTargets.some(slot => offensiveSlots.has(slot.index) && slot.targetIds.includes(selection.focusTargetId)))) continue;
        // 警报与最后见处只用于接近，不能直接给不可追踪的目标计收益。
        const disclosed = tracking || selection.hiddenFocusId ? new Set(tracking ? q.disclosureTargetIds : q.actualTargetIds) : null;
        if (selection.hiddenFocusId) disclosed.delete(selection.hiddenFocusId);
        if (disclosed && !target.barrier && target.side !== unit.side && !disclosed.has(target.id)) continue;
        const score = evaluateQuery(ctx2, unit, eff, q, disclosed) / (1 + (cell.opportunityRisk || 0) * 0.1);
        if (score <= EPS) continue;
        found = { score, cost: cell.cost, cell, skill: raw, aim, targetId: target.id, si,
          attackTarget: (q.damageTargetIds || []).includes(target.id) };
        break; // 该 (技能,目标) 取最省移动的合法落点
      }
      if (found && (!best || cmpBetter(found, best) < 0)) best = found;
      if (found && found.attackTarget && !target.barrier && target.side !== unit.side) {
        const previous = attacksByTarget.get(target.id);
        if (!previous || cmpBetter(found, previous) < 0) attacksByTarget.set(target.id, found);
      }
    }
  }
  if (best && attacksByTarget.get(best.targetId) === best) {
    const area = (best.skill.range || resolveDefaultRange(best.skill)).type !== '单体';
    const targets = enemies.filter(t => attacksByTarget.has(t.id)
      && (!area || attacksByTarget.get(t.id).score >= best.score - EPS)).sort((a, b) => a.id.localeCompare(b.id));
    const chosen = chooseTauntTarget(ctx, unit, targets);
    best = chosen ? attacksByTarget.get(chosen.id) : null;
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

function distanceToPoints(ctx, unit, points) {
  const fp = footprintOf(ctx, unit);
  return cell => {
    const from = unitCenter(cell, fp);
    return Math.min(...points.map(p => Math.hypot(p.x - from.x, p.y - from.y)));
  };
}

function nearestPointCell(cells, distanceTo) {
  let best = null;
  for (const cell of cells) {
    const cand = { dist: distanceTo(cell), cell };
    if (!best
      || cand.dist < best.dist - EPS
      || (Math.abs(cand.dist - best.dist) <= EPS && cmpCell(cand.cell, best.cell) < 0)) {
      best = cand;
    }
  }
  return best ? best.cell : null;
}

function movePlan(moveTo, avoidFog = false) {
  return { ...IDLE, moveTo, action: null, ...(avoidFog ? { avoidFog: true } : {}) };
}

function landingAllyCost(ctx, unit, land) {
  return ctx.units.filter(ally => ally !== unit && ally.side === unit.side && isLive(ally) && ctx.placementsById[ally.id]
    && !ctx.carriedUnitIds?.has(ally.id) && ally.ref.totalWeight < unit.ref.strength * 1.5
    && cellsAdjacent(land, footprintOf(ctx, unit), ctx.placementsById[ally.id], footprintOf(ctx, ally))).length;
}

// 寻找要留给越障的跳跃；步行可达时，只考虑实际跨过障碍的捷径。
function planJump(ctx, unit, res, budget, reach, walk, distanceTo, walkDistance, canStep, reserve = false) {
  if (!canJump(res)) return null;
  const distance = Math.ceil(unit.ref.moveDistance / 3);
  const origin = ctx.placementsById[unit.id];
  let best = null;
  for (const start of reach.cells) {
    const approach = start.cost > EPS ? stepAlong(ctx, reach, unit, start.path, budget) : null;
    if (start.cost > EPS && !approach) continue;
    const view = withPlacement(ctx, unit.id, start.col, start.row);
    for (const { col, row, length } of jumpLandings(start, distance)) {
      if (canStep && !canStep(start.col, start.row, col, row)) continue;
      const land = { col, row }, dist = distanceTo(land), cost = start.cost + length;
      const walking = walk.byKey.get(cellKey(col, row));
      if (walking) {
        if (!reserve || walking.cost <= cost + EPS || dist >= distanceTo(start) - EPS || dist >= distanceTo(origin) - EPS) continue;
      } else if (dist >= walkDistance - EPS) continue;
      const score = (reserve ? cost + dist : dist) + (res.jumpFirst ? landingAllyCost(ctx, unit, land) : 0);
      if (best && (score > best.score + EPS || (Math.abs(score - best.score) <= EPS && cost >= best.cost - EPS))) continue;
      const query = findJumpPath(view, unit.id, col, row, distance);
      if (!query.ok || (walking && !query.path.slice(1, -1).some(c => !canPlaceAt(view, unit.id, c.col, c.row).ok))) continue;
      best = { approach, land, score, cost };
    }
  }
  if (!best) return null;
  return best.approach ? movePlan(best.approach, !!canStep) : { ...IDLE, jumpTo: best.land, action: null };
}

function canJump(res) {
  return (res.freeJumpAvailable || actionBalance(res, 'aux') >= 1) && (res.jumpsRemaining ?? Number(!res.jumped)) > 0;
}

function* jumpLandings(start, distance) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const step = Math.hypot(dx, dy);
    for (let n = 1; n * step <= distance + EPS; n++) {
      yield { col: start.col + dx * n, row: start.row + dy * n, length: n * step };
    }
  }
}

function planPriorityJump(ctx, unit, res, budget, points, avoid) {
  if (!canJump(res)) return null;
  const p = ctx.placementsById[unit.id];
  const distanceTo = points.length ? distanceToPoints(ctx, unit, points) : () => 0;
  if (points.length) {
    const walk = moveReach(ctx, unit, Infinity);
    const dry = avoid ? moveReach(ctx, unit, Infinity, avoid) : walk;
    const baseline = distanceTo(nearestPointCell(walk.cells, distanceTo));
    const obstacle = planJump(ctx, unit, res, budget, dry, walk, distanceTo, baseline, avoid, true)
      || (avoid && planJump(ctx, unit, res, budget, walk, walk, distanceTo, baseline, null, true));
    if (obstacle) return obstacle;
  }
  if (!points.length) return null;
  const distance = Math.ceil(unit.ref.moveDistance / 3);
  const land = [...jumpLandings(p, distance)]
    .filter(c => distanceTo(c) < distanceTo(p) - EPS)
    .map(c => ({ ...c, score: distanceTo(c) + landingAllyCost(ctx, unit, c) }))
    .sort((a, b) => Number(avoid && !avoid(p.col, p.row, a.col, a.row)) - Number(avoid && !avoid(p.col, p.row, b.col, b.row))
      || a.score - b.score || b.length - a.length)
    .find(c => findJumpPath(ctx, unit.id, c.col, c.row, distance).ok);
  return land ? { ...IDLE, jumpTo: { col: land.col, row: land.row }, action: null } : null;
}

// 无战斗动作时：召唤物按占地贴近主人，其它敌人在合法落点中巡走。
function planIdleMove(ctx, unit, res, budget, inBudget, fog) {
  if (!unit.isSummon) {
    if (unit.side !== 'enemy' || budget <= EPS) return null;
    const cells = inBudget.cells.filter(c => c.cost > EPS && (!fog || !fog(c.col, c.row)));
    const cell = cells.length && cells[Math.floor(ctx.random() * cells.length)];
    return cell ? movePlan({ col: cell.col, row: cell.row }, !!fog) : null;
  }
  const owner = ctx.units.find(u => u.id === unit.summonOwnerId && isLive(u));
  if (!owner || ctx.carriedUnitIds.has(owner.id)) return null;
  const ownerPos = ctx.placementsById[owner.id];
  const fp = footprintOf(ctx, unit), ownerFp = footprintOf(ctx, owner);
  const adjacent = p => cellsAdjacent(p, fp, ownerPos, ownerFp);
  if (adjacent(ctx.placementsById[unit.id])) return null;
  const reach = moveReach(ctx, unit, Infinity);
  const goal = reach.cells.filter(adjacent).sort(cmpCell)[0];
  if (goal) {
    const moveTo = stepAlong(ctx, reach, unit, goal.path, budget);
    return moveTo ? movePlan(moveTo) : null;
  }
  const distance = distanceToPoints(ctx, unit, [unitCenter(ownerPos, ownerFp)]);
  const followDistance = p => adjacent(p) ? 0 : distance(p);
  const near = nearestPointCell(reach.cells, followDistance);
  const leap = planJump(ctx, unit, res, budget, reach, reach, followDistance, followDistance(near));
  const moveTo = stepAlong(ctx, reach, unit, near.path, budget);
  return leap || (moveTo ? movePlan(moveTo) : null);
}

// ---------- 浓雾离场 ----------

function planFogExit(ctx, unit, moveBudget, res, inFog) {
  const full = moveReach(ctx, unit, Infinity);
  let exit = null;
  for (const cell of full.cells) {
    if (inFog(cell.col, cell.row)) continue;
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
  if (res && actionBalance(res, 'main') > 0) return { moveTo: null, skill: null, aim: null, action: 'sprint' };
  // 无法冲刺：本轮向出口尽量前进
  const moveTo = stepAlong(ctx, full, unit, exit.path, moveBudget);
  if (moveTo) return { moveTo, skill: null, aim: null, action: null };
  return null;
}

function toResult(hit, res) {
  const preparing = hit.skill && hit.skill.delay > 0 && !(res && res.preparing);
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
  let res = resources || { main: 1, aux: 1, preparing: null, moveDistance: (unit.ref && unit.ref.moveDistance) || 0 };
  if (res.focus) {
    const { targetId, lastSeen, visible } = res.focus;
    const target = visible && ctx.units.find(u => u.id === targetId);
    const intent = chooseEnemyAction(ctx, unitId, moveBudget, target ? skills : [], canUseSkill, {
      ...res, focus: null, focusOnly: true, focusTargetId: target ? targetId : null,
      seen: target ? [target] : [], pursuitPoints: [lastSeen], idleMovement: false, recoverSkills: target ? res.recoverSkills : [],
    });
    if (intent.skill || intent.moveTo || intent.jumpTo || intent.action === 'sprint' || intent.action === 'recoverMp') return intent;
    res = { ...res, hiddenFocusId: visible ? null : targetId };
  }

  const seen = (res.seen || visibleEnemies(ctx, unit)).filter(e => e.id !== res.hiddenFocusId);
  const seenIds = !ctx.encounter && res.trackedTargetIds && new Set(seen.map(u => u.id));
  const enemies = !res.focusOnly && (ctx.encounter || seenIds) ? ctx.units.filter(u => isLive(u) && u.side !== unit.side && !u.isSubdued && !u.ref.isSubdued
    && u.id !== res.hiddenFocusId && (ctx.encounter || seenIds.has(u.id) || res.trackedTargetIds.has(u.id))) : seen;
  const allies = ctx.units.filter(u => isLive(u) && u.side === unit.side);
  const usable = (skills || []).filter(s => s && !s.isReaction && s.trigger !== 'death'
    && (!canUseSkill || canUseSkill(s).ok));

  const points = enemies.filter(e => ctx.placementsById[e.id]).map(e => unitCenter(ctx.placementsById[e.id], footprintOf(ctx, e)));
  points.push(...(res.pursuitPoints || []));
  const fog = fogChecker(ctx, unit);
  const avoid = unit.side === 'enemy' ? fogRouteFilter(ctx, unit, fog) : null;
  const needsExit = fog && fog(p.col, p.row) && !hasAdjacentEnemy(ctx, unit, seen);
  if (!res.supportOnly && needsExit && (!avoid || !points.length)) {
    const exit = planFogExit(ctx, unit, moveBudget, res, fog);
    if (exit) return exit;
  }

  const tracking = !!(seenIds || res.pursuitPoints?.length);
  const preferred = moveReach(ctx, unit, moveBudget, avoid);
  let inBudget = searchBest(ctx, unit, usable, moveBudget, enemies, allies, tracking, preferred, res);
  if (res.supportOnly) {
    if (!inBudget.best) return { ...IDLE };
    const plan = toResult(inBudget.best, res);
    return plan.moveTo && avoid ? { ...plan, avoidFog: true } : plan;
  }
  if (res.recoverSkills?.length && (!inBudget.best || inBudget.best.skill === res.basicAttack)) {
    const available = usable.filter(skill => skill !== res.basicAttack);
    const alternative = available.length && searchBest(ctx, unit, available, moveBudget, enemies, allies, tracking, preferred, res);
    if (alternative?.best) inBudget = alternative;
    else if (searchBest(ctx, unit, res.recoverSkills, moveBudget, enemies, allies, tracking, preferred, res).best) {
      return { ...IDLE, action: 'recoverMp' };
    }
  }
  const markRoute = plan => plan.moveTo && avoid ? { ...plan, avoidFog: true } : plan;
  if (res.jumpFirst && (!inBudget.best?.attackTarget || inBudget.best.cost > EPS)) {
    const attackPlace = inBudget.best?.attackTarget && inBudget.best.cell;
    const jump = planPriorityJump(ctx, unit, res, moveBudget,
      attackPlace ? [unitCenter(attackPlace, footprintOf(ctx, unit))] : points, avoid);
    if (jump) return jump;
  }
  const following = ctx.knownPositions && unit.isSummon && unit.side === 'hero' && res.idleMovement;
  if (following && (!inBudget.best?.attackTarget || inBudget.best.cost > EPS)) {
    return planIdleMove(ctx, unit, res, moveBudget, preferred, avoid ? fog : null) || { ...IDLE };
  }
  if (inBudget.best) {
    const plan = markRoute(toResult(inBudget.best, res));
    return needsExit && plan.moveTo ? movePlan(plan.moveTo, !!avoid) : plan;
  }

  const sprintBudget = resources && unit.side === 'enemy' && actionBalance(res, 'main') > 0 && !res.preparing
    ? moveBudget / (res.moveMultiplier || 1) + res.moveDistance : moveBudget;
  const followPath = (reach, path, avoidFog) => {
    const moveTo = stepAlong(ctx, reach, unit, path, moveBudget);
    if (sprintBudget > moveBudget + EPS) {
      const farther = stepAlong(ctx, reach, unit, path, sprintBudget);
      if (farther && (!moveTo || farther.col !== moveTo.col || farther.row !== moveTo.row)) {
        return { ...movePlan(farther, avoidFog), action: 'sprint' };
      }
    }
    return moveTo && movePlan(moveTo, avoidFog);
  };
  let fullReach;
  if (enemies.length && usable.length && (moveBudget > EPS || sprintBudget > EPS)) {
    fullReach = moveReach(ctx, unit, Infinity, avoid);
    const fullBest = searchBest(ctx, unit, usable, Infinity, enemies, allies, tracking, fullReach, res);
    if (fullBest.best) {
      const plan = followPath(fullReach, fullBest.best.cell.path, !!avoid);
      if (plan) return plan;
    }
  }

  if (points.length) {
    const reach = fullReach || moveReach(ctx, unit, Infinity, avoid);
    const walk = avoid ? moveReach(ctx, unit, Infinity) : reach;
    const distance = distanceToPoints(ctx, unit, points);
    const near = nearestPointCell(walk.cells, distance);
    const nearDry = avoid ? nearestPointCell(reach.cells, distance) : near;
    const jump = planJump(ctx, unit, res, moveBudget, reach, walk, distance, distance(near), avoid);
    if (jump) return jump;
    // 同样能接近目标时用避雾路径；否则准许朝目标穿雾，而不是离雾后向原出口折返。
    const useDry = avoid && distance(nearDry) <= distance(near) + EPS;
    if (avoid && !useDry) {
      const closer = searchBest(ctx, unit, usable, moveBudget, enemies, allies, tracking, moveReach(ctx, unit, moveBudget), res);
      if (closer.best) return toResult(closer.best, res);
      const leap = planJump(ctx, unit, res, moveBudget, walk, walk, distance, distance(near));
      if (leap) return leap;
    }
    const plan = followPath(useDry ? reach : walk, (useDry ? nearDry : near).path, useDry);
    if (plan) return plan;
  }

  if (needsExit && avoid && points.length) {
    const exit = planFogExit(ctx, unit, moveBudget, res, fog);
    if (exit) return exit;
  }
  if (hasAdjacentEnemy(ctx, unit, seen)) {
    return unit.side !== 'enemy' && actionBalance(res, 'main') > 0 ? { ...IDLE, action: 'defend' } : { ...IDLE };
  }
  if (res.idleMovement && (!points.length || unit.isSummon)) {
    const idle = planIdleMove(ctx, unit, res, moveBudget, preferred, avoid ? fog : null);
    if (idle) return idle;
  }
  return Object.assign({}, IDLE);
}
