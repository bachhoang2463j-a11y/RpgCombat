// ==========================================
// 战棋 P06/P08 显式区域（浓雾 / 火焰 / 中毒领域）
// 纯规则模块：无 DOM；只按显式区域配置建模，不按技能名/特效名判断。
// 区域结构：{ id, type:'fog'|'fire'|'poison', casterId, sourceKey, center:{x,y}, radius, strength,
//            endAt, cells:[{col,row}], tags:[{tag,power,turns,index}] }
// 覆盖判定：单位完整占格任一落在区域 cells 内即视为在区域中。
// 同源（施术者+类型）重施替换旧区域；endAt 供 perception 过滤与 scheduler 派发到期。
// 火焰内移动减半、中毒内施放距离减半由本模块提供统一查询；雾致盲沿用 fogAt。
// ==========================================

import { occupiedCells, cellKey } from './geometry.mjs';
import { skillSlots } from './effect-definitions.mjs';
import { ROUND_TIME } from './scheduler.mjs';
import { barrierAt, interception } from './barriers.mjs';

const EPS = 1e-9;
const REGION_TYPES = ['fog', 'fire', 'poison'];

function unitById(ctx, id) { return ctx.units.find(u => u.id === id) || null; }
function fpOf(ctx, u) { return ctx.footprintsById[u.id] || u.footprint || { width: 1, height: 1 }; }
function cellsOfUnit(ctx, u) {
  const p = ctx.placementsById[u.id];
  return p ? occupiedCells(p, fpOf(ctx, u)) : [];
}
function keySet(cells) {
  const s = new Set();
  for (const c of cells) s.add(cellKey(c.col, c.row));
  return s;
}
function isActive(region, now) {
  return !!region && (region.endAt == null || region.endAt > now);
}
function nowOf(ctx) {
  return typeof ctx.now === 'function' ? ctx.now() : 0;
}

function blindSlot(skill) {
  return skillSlots(skill).find(s => {
    const tag = String(s.tag || '').replace(/[(（].*$/, '');
    return tag === '致盲' || tag.startsWith('致盲');
  }) || null;
}

// 区域标签：施放时随技能槽存入领域，普通流程不再重复施加
function regionTags(skill) {
  return skillSlots(skill)
    .filter(s => s.definition && s.definition.kind !== 'attack' && s.definition.kind !== 'barrier')
    .map(s => ({ tag: s.tag, power: s.power, turns: s.turns, index: s.index }));
}

// 场地按受影响目标局部隔绝，不裁剪原区域；来源快照优先于施术者当前状态。
export function regionAffects(ctx, region, unitOrPoint) {
  if (typeof unitOrPoint === 'string') return !interception(ctx, region.casterId, unitOrPoint, region.source);
  const placement = { col: Math.floor(unitOrPoint.x), row: Math.floor(unitOrPoint.y) };
  const barrier = barrierAt(ctx, placement);
  if (!barrier) return true;
  const caster = unitById(ctx, region.casterId);
  const source = region.source || { side: caster?.side, placement: ctx.placementsById[region.casterId], footprint: caster && fpOf(ctx, caster) };
  if (source.side === barrier.side) return true;
  if (!source.placement) return false;
  const keys = keySet(barrier.cells);
  return occupiedCells(source.placement, source.footprint || { width: 1, height: 1 }).every(c => keys.has(cellKey(c.col, c.row)));
}

export function fogAffects(ctx, region, unitOrPoint) {
  return regionAffects(ctx, region, unitOrPoint);
}

// 单位所处全部区域（按类型分组）；strength 取覆盖其占格的最高值
export function regionsAt(ctx, unitId) {
  const unit = unitById(ctx, unitId);
  const empty = { strength: 0, regionIds: [], blockedRegions: [], byType: { fog: [], fire: [], poison: [] } };
  if (!unit) return empty;
  const cells = cellsOfUnit(ctx, unit);
  if (!cells.length) return empty;
  const now = nowOf(ctx);
  let strength = 0;
  const regionIds = [];
  const blockedRegions = [];
  const byType = { fog: [], fire: [], poison: [] };
  for (const r of ctx.regions || []) {
    if (!r || !REGION_TYPES.includes(r.type) || !isActive(r, now)) continue;
    const s = keySet(r.cells || []);
    if (!cells.some(c => s.has(cellKey(c.col, c.row)))) continue;
    const barrier = interception(ctx, r.casterId, unitId, r.source);
    if (barrier) {
      blockedRegions.push({ regionId: r.id, barrierId: barrier.id, reason: 'barrier-field', source: r.source });
      continue;
    }
    regionIds.push(r.id);
    if (byType[r.type]) byType[r.type].push(r.id);
    if (Number(r.strength) > strength) strength = Number(r.strength);
  }
  return { strength, regionIds, blockedRegions, byType };
}

// 指定类型区域（同类型不叠加，取最高 strength）
export function regionAt(ctx, unitId, type) {
  const all = regionsAt(ctx, unitId);
  const ids = all.byType[type] || [];
  let strength = 0;
  for (const r of ctx.regions || []) {
    if (r && r.type === type && ids.includes(r.id) && Number(r.strength) > strength) strength = Number(r.strength);
  }
  return { strength, regionIds: ids, blockedRegions: all.blockedRegions };
}

export function unitInRegionType(ctx, unitId, type) {
  return regionAt(ctx, unitId, type).regionIds.length > 0;
}

// 单位所处雾况：取覆盖其完整占格（任一格）的雾区最高 strength
export function fogAt(ctx, unitId) {
  return regionAt(ctx, unitId, 'fog');
}

// 创建区域：cells 取 range 实际爆心落格（query.cells），strength 取标签最高 power，
// 时长取技能 Turns（浓雾沿用致盲槽 Turns，缺省 3 回合）；同源同类型替换 ctx.regions（显式允许）。
export function createRegion(ctx, { caster, skill, query, now, type } = {}) {
  const casterUnit = typeof caster === 'string' ? unitById(ctx, caster) : caster;
  if (!casterUnit) throw new Error('区域缺少施术者');
  const regionType = type || (skill && skill.regionEffect && skill.regionEffect.type) || 'fog';
  const t = now != null ? now : nowOf(ctx);
  const center = (query && (query.blastCenter || query.aim)) || null;
  if (!center) throw new Error('区域缺少爆心');
  const radius = Number(skill && skill.range && (skill.range.radius != null ? skill.range.radius : skill.range.castRange)) || 0;
  const cells = query && Array.isArray(query.cells) && query.cells.length
    ? query.cells.map(c => ({ col: c.col, row: c.row }))
    : [];
  const tags = regionTags(skill);
  const blind = blindSlot(skill);
  let strength = 0;
  for (const tg of tags) if (Number(tg.power) > strength) strength = Number(tg.power);
  if (blind) strength = Number(blind.power) || 0;
  let turns = skill && skill.turns != null ? skill.turns : null;
  if (regionType === 'fog' && blind && blind.turns != null) turns = blind.turns;
  if (turns == null) turns = tags.reduce((m, tg) => (tg.turns != null && tg.turns > m ? tg.turns : m), 3);
  const endAt = t + turns * ROUND_TIME;
  const sourceKey = regionType + ':' + casterUnit.id + ':' + String((skill && (skill.name || skill.id)) || '');
  const region = {
    id: sourceKey,
    type: regionType,
    casterId: casterUnit.id,
    source: { casterId: casterUnit.id, side: casterUnit.side,
      placement: { ...ctx.placementsById[casterUnit.id] }, footprint: { ...fpOf(ctx, casterUnit) } },
    sourceKey,
    center: { x: center.x, y: center.y },
    radius,
    strength,
    endAt,
    cells,
    tags,
    hit: skill.hit ?? 100,
  };
  if (!ctx.regions) ctx.regions = [];
  for (let i = ctx.regions.length - 1; i >= 0; i--) {
    if (ctx.regions[i].type === regionType && ctx.regions[i].casterId === casterUnit.id) ctx.regions.splice(i, 1);
  }
  ctx.regions.push(region);
  return region;
}

// 兼容旧入口：浓雾
export function createFogRegion(ctx, args = {}) {
  return createRegion(ctx, { ...args, type: 'fog' });
}

// 射程修正：中毒内施放距离减半，仅改 castRange，不改 AoE 覆盖；近战最少 1 格，全域无 castRange 不受影响
export function effectiveCastRange(ctx, unitId, range, skill) {
  if (!range || range.castRange == null) return range;
  const unit = unitById(ctx, unitId);
  const affected = regionAt(ctx, unitId, 'poison').regionIds;
  if (!(ctx.regions || []).some(r => affected.includes(r.id) && r.source.side !== unit.side)) return range;
  const halved = range.castRange * 0.5;
  const melee = (skill && skill.damageType || '近战') === '近战';
  return { ...range, castRange: melee ? Math.max(1, halved) : halved };
}

// 移动修正：火焰内移动减半（同类型不重复折半）
export function moveMultiplier(ctx, unitId, placement = ctx.placementsById[unitId]) {
  const unit = unitById(ctx, unitId);
  if (!unit || !placement) return 1;
  const cells = occupiedCells(placement, fpOf(ctx, unit));
  return (ctx.regions || []).some(r => r.type === 'fire' && r.source.side !== unit.side && isActive(r, nowOf(ctx))
    && cells.some(c => (r.cells || []).some(rc => rc.col === c.col && rc.row === c.row))
    && regionAffects(ctx, r, unitId)) ? 0.5 : 1;
}

// 到期移除：移除 endAt <= now 的区域并返回 removed
export function expireRegions(ctx, now) {
  const regions = ctx.regions || [];
  const removed = [];
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (r && r.endAt != null && r.endAt <= now + EPS) {
      removed.push(r);
      regions.splice(i, 1);
    }
  }
  return removed;
}
