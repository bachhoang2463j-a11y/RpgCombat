// ==========================================
// 战棋 P06 显式区域（浓雾）
// 纯规则模块：无 DOM；只按显式雾区配置建模，不按技能名/特效名判断。
// 区域结构：{ id, type:'fog', casterId, sourceKey, center:{x,y}, radius, strength, endAt, cells:[{col,row}] }
// 覆盖判定：单位完整占格任一落在区域 cells 内即视为在雾中。
// 同源（施术者+技能）重施替换旧区域；endAt 供 perception 过滤与 scheduler 派发到期。
// ==========================================

import { occupiedCells, cellKey } from './geometry.mjs';
import { skillSlots } from './effect-definitions.mjs';
import { ROUND_TIME } from './scheduler.mjs';

const EPS = 1e-9;

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

function blindSlot(skill) {
  return skillSlots(skill).find(s => {
    const tag = String(s.tag || '').replace(/[(（].*$/, '');
    return tag === '致盲' || tag.startsWith('致盲');
  }) || null;
}

// 单位所处雾况：取覆盖其完整占格（任一格）的雾区最高 strength
export function fogAt(ctx, unitId) {
  const unit = unitById(ctx, unitId);
  if (!unit) return { strength: 0, regionIds: [] };
  const cells = cellsOfUnit(ctx, unit);
  if (!cells.length) return { strength: 0, regionIds: [] };
  let strength = 0;
  const regionIds = [];
  for (const r of ctx.regions || []) {
    if (!r || r.type !== 'fog' || r.endAt != null && r.endAt <= (ctx.now?.() || 0)) continue;
    const s = keySet(r.cells || []);
    if (cells.some(c => s.has(cellKey(c.col, c.row)))) {
      regionIds.push(r.id);
      if (Number(r.strength) > strength) strength = Number(r.strength);
    }
  }
  return { strength, regionIds };
}

// 创建浓雾：cells 取 range 实际爆心落格（query.cells），strength 取致盲槽 power，
// 时长取致盲槽 Turns（缺省 3 回合）；同源替换 ctx.regions（显式允许）。
export function createFogRegion(ctx, { caster, skill, query, now } = {}) {
  const casterUnit = typeof caster === 'string' ? unitById(ctx, caster) : caster;
  if (!casterUnit) throw new Error('浓雾缺少施术者');
  const t = now != null ? now : (typeof ctx.now === 'function' ? ctx.now() : 0);
  const center = (query && (query.blastCenter || query.aim)) || null;
  if (!center) throw new Error('浓雾缺少爆心');
  const radius = Number(skill && skill.range && (skill.range.radius != null ? skill.range.radius : skill.range.castRange)) || 0;
  const cells = query && Array.isArray(query.cells) && query.cells.length
    ? query.cells.map(c => ({ col: c.col, row: c.row }))
    : [];
  const slot = blindSlot(skill);
  const strength = slot ? Number(slot.power) || 0 : 0;
  const turns = slot && slot.turns != null ? slot.turns : 3;
  const endAt = t + turns * ROUND_TIME;
  const sourceKey = 'fog:' + casterUnit.id + ':' + String((skill && (skill.name || skill.id)) || '');
  const region = {
    id: sourceKey,
    type: 'fog',
    casterId: casterUnit.id,
    sourceKey,
    center: { x: center.x, y: center.y },
    radius,
    strength,
    endAt,
    cells,
  };
  if (!ctx.regions) ctx.regions = [];
  for (let i = ctx.regions.length - 1; i >= 0; i--) {
    if (ctx.regions[i].type === 'fog' && ctx.regions[i].casterId === casterUnit.id) ctx.regions.splice(i, 1);
  }
  ctx.regions.push(region);
  return region;
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
