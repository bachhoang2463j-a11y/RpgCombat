// ==========================================
// 敌方威胁区（只读查询，无 DOM）：该敌人下一次自然行动「能走到哪」「能打到哪」。
// · 可走：规则寻路 findReachable（基础移动额度）；跳跃只算从当前站位起跳的一次落点（findJumpPath）；
//   冲刺后才能到的格单列 sprint（只画虚线，不作为出手点——冲刺占用主行动）。
// · 可打：出手点 = 可走格 ∪ 跳跃落点 ∪ 原位；技能作用距离取有效射程（含施法者射程加成），
//   墙体遮挡复用结算射线 rayFirst（低墙不挡弹，单位遮挡不计——宁大勿小）。
//   单体/扇形/直线 = 射程，圆形 = 半径，爆炸 = 投射距离 + 爆炸半径（近似），全域 = 全图；自身/召唤不计。
// · 技能清单由 battle.threatSkills 提供（资源/限次/冷却/充能/准备口径与 canUseSkill 一致）。
// ==========================================

import { findReachable, findJumpPath } from './movement.mjs';
import { cellKey, unitCenter, occupiedCells } from './geometry.mjs';
import { cellAt } from './scene.mjs';
import { effectiveCastRange } from './regions.mjs';
import { rayFirst } from './range.mjs';

const EPS = 1e-6;

export function threatReach(range, skill) {
  if (!range) return null;
  const charge = skill?.displacements?.find(d => d.type === '冲锋');
  const base = range.type === '单体' ? (range.castRange ?? Infinity)
    : range.type === '直线' ? range.length
    : range.type === '扇形' ? (range.length ?? range.castRange)
    : range.type === '圆形' ? range.radius
    : range.type === '爆炸' ? (range.castRange ?? 0) + (range.radius ?? 0)
    : range.type === '全域' ? Infinity
    : null;
  if (base == null) return null;
  return charge ? Math.max(base, charge.distance || 0) : base;
}

export function threatOf(ctx, unitId, { moveDistance, jumpDistance = 0, skills = [] }) {
  const p = ctx.placementsById[unitId];
  const fp = ctx.footprintsById[unitId] || { width: 1, height: 1 };
  const move = findReachable(ctx, unitId, moveDistance).cells;
  const reachKeys = new Set(move.map(c => cellKey(c.col, c.row)));
  const jump = [];
  const J = Math.floor(jumpDistance + EPS);
  for (let dy = -J; dy <= J; dy++) for (let dx = -J; dx <= J; dx++) {
    if ((!dx && !dy) || (dx && dy && Math.abs(dx) !== Math.abs(dy))) continue;
    if (Math.hypot(dx, dy) > jumpDistance + EPS) continue;
    const col = p.col + dx, row = p.row + dy, key = cellKey(col, row);
    if (reachKeys.has(key) || !findJumpPath(ctx, unitId, col, row, jumpDistance).ok) continue;
    reachKeys.add(key);
    jump.push({ col, row });
  }
  const sprint = moveDistance > 0 ? findReachable(ctx, unitId, moveDistance * 2).cells.filter(c => !reachKeys.has(cellKey(c.col, c.row))) : [];

  let maxReach = 0, global = false;
  for (const skill of skills) {
    const d = threatReach(effectiveCastRange(ctx, unitId, skill.range, skill), skill);
    if (d == null) continue;
    if (d === Infinity && skill.range.type === '全域') global = true;
    else maxReach = Math.max(maxReach, d);
  }
  // 出手点：原位最先，其余按移动成本从远到近（边缘先测，命中即停）
  const origins = [{ col: p.col, row: p.row }, ...move.filter(c => c.cost > 0).sort((a, b) => b.cost - a.cost), ...jump]
    .map(c => unitCenter(c, fp));
  const own = new Set(occupiedCells(p, fp).map(c => cellKey(c.col, c.row)));
  const attack = [];
  const { columns, rows } = ctx.compiled.grid;
  if (global || maxReach > 0) for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const cell = cellAt(ctx.compiled, col, row);
    if (!cell || cell.blocksMovement || own.has(cellKey(col, row))) continue;
    if (global) { attack.push({ col, row }); continue; }
    const x = col + 0.5, y = row + 0.5;
    for (const o of origins) {
      if (Math.hypot(x - o.x, y - o.y) > maxReach + EPS) continue;
      if (!rayFirst(ctx, o.x, o.y, x, y)) { attack.push({ col, row }); break; }
    }
  }
  return {
    unitId, move: move.filter(c => c.cost > 0), jump, sprint, attack,
    attackKeys: new Set(attack.map(c => cellKey(c.col, c.row))), reach: global ? Infinity : maxReach,
  };
}

// 合集：每格被多少名敌人覆盖
export function threatHeat(threats) {
  const heat = new Map();
  for (const t of threats) for (const c of t.attack) {
    const key = cellKey(c.col, c.row), rec = heat.get(key);
    if (rec) rec.n++; else heat.set(key, { col: c.col, row: c.row, n: 1 });
  }
  return heat;
}
