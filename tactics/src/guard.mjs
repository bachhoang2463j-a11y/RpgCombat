// 舍身空间预检：只查询真实移动落点，不扣费、不修改站位或战斗状态。
import { occupiedCells, unitCenter, cellKey, normalizeFacing } from './geometry.mjs';
import { cellsAdjacent, canPlaceAt, findReachable } from './movement.mjs';

const EPS = 1e-9;

export function previewGuard(ctx, guardianId, targetId, sourceId, maxDistance) {
  const fail = reason => ({ ok: false, reason });
  const guardian = ctx.units.find(u => u.id === guardianId);
  const target = ctx.units.find(u => u.id === targetId);
  const source = ctx.units.find(u => u.id === sourceId);
  if (!guardian || !target || !source) return fail('舍身单位不存在');
  if (guardianId === targetId || guardianId === sourceId) return fail('舍身对象无效');
  if (guardian.ref.hp <= 0 || target.ref.hp <= 0) return fail('舍身单位已倒地');
  if (guardian.side !== target.side) return fail('舍身只能保护友方');
  if (ctx.carriedUnitIds?.has(guardianId) || ctx.carriedUnitIds?.has(targetId)) return fail('被背负单位不能参与舍身');
  const from = ctx.placementsById[guardianId];
  const targetAt = ctx.placementsById[targetId];
  const sourceAt = ctx.placementsById[sourceId];
  if (!from || !targetAt || !sourceAt) return fail('舍身单位缺少站位');
  const fpOf = u => ctx.footprintsById[u.id] || u.footprint || { width: 1, height: 1 };
  const guardianFp = fpOf(guardian), targetFp = fpOf(target);
  const origin = unitCenter(from, guardianFp);
  const protectedPosition = unitCenter(targetAt, targetFp);
  if (Math.hypot(origin.x - protectedPosition.x, origin.y - protectedPosition.y) > maxDistance + EPS) return fail('超过舍身保护距离');
  const sourcePosition = unitCenter(sourceAt, fpOf(source));
  const dx = sourcePosition.x - protectedPosition.x, dy = sourcePosition.y - protectedPosition.y;
  const sourceDistance = Math.hypot(dx, dy);
  if (sourceDistance <= EPS) return fail('攻击来源方向无效');
  const targetCells = new Set(occupiedCells(targetAt, targetFp).map(c => cellKey(c.col, c.row)));
  // carriedUnitIds 是乘客集合；携带者倍率复用 battle 的 carrying 映射。
  const costMultiplier = ctx.carrying?.[guardianId] ? 2 : 1;
  const reachable = findReachable(ctx, guardianId, maxDistance, costMultiplier);
  const candidates = [];
  for (const cell of reachable.cells) {
    if (!cellsAdjacent(cell, guardianFp, targetAt, targetFp)) continue;
    if (occupiedCells(cell, guardianFp).some(c => targetCells.has(cellKey(c.col, c.row)))) continue;
    if (!canPlaceAt(ctx, guardianId, cell.col, cell.row).ok) continue;
    const contactPoint = unitCenter(cell, guardianFp);
    const gx = contactPoint.x - protectedPosition.x, gy = contactPoint.y - protectedPosition.y;
    const projection = (gx * dx + gy * dy) / sourceDistance;
    if (projection <= EPS) continue;
    const between = projection < sourceDistance - EPS;
    const alignment = projection / Math.hypot(gx, gy);
    candidates.push({ cell, contactPoint, between, alignment });
  }
  candidates.sort((a, b) => Number(b.between) - Number(a.between)
    || b.alignment - a.alignment || a.cell.cost - b.cell.cost
    || a.cell.row - b.cell.row || a.cell.col - b.cell.col);
  if (!candidates.length) return fail('攻击来源侧没有可达舍身落点');
  const { cell, contactPoint } = candidates[0];
  const facing = normalizeFacing(Math.atan2(sourcePosition.x - contactPoint.x, -(sourcePosition.y - contactPoint.y)) * 180 / Math.PI);
  return {
    ok: true, guardianId, originalTargetId: targetId, casterId: sourceId,
    from: { ...from }, to: { col: cell.col, row: cell.row, facing },
    path: cell.path.map(c => ({ col: c.col, row: c.row })), distance: cell.cost, maxDistance,
    origin: sourcePosition, startPosition: origin, protectedPosition, contactPoint,
    pathDistance: cell.path.slice(1).reduce((sum, c, i) => sum + Math.hypot(c.col - cell.path[i].col, c.row - cell.path[i].row), 0),
  };
}
