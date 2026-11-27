// 舍身空间预检：先判能否替挡，再决定站位；不扣费、不修改战斗状态。
import { occupiedCells, unitCenter, cellKey, normalizeFacing } from './geometry.mjs';
import { cellsAdjacent, canPlaceAt, findReachable } from './movement.mjs';
import { cellAt } from './scene.mjs';
import { barrierCrossing } from './barriers.mjs';

const EPS = 1e-9;

function clearGuardLine(ctx, a, b) {
  const solid = (col, row) => cellAt(ctx.compiled, col, row)?.blocksProjectile !== false;
  const dx = b.x - a.x, dy = b.y - a.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.2));
  let col = Math.floor(a.x), row = Math.floor(a.y);
  for (let i = 1; i <= steps; i++) {
    const nextCol = Math.floor(a.x + dx * i / steps), nextRow = Math.floor(a.y + dy * i / steps);
    if (solid(nextCol, nextRow) || (nextCol !== col && nextRow !== row && solid(nextCol, row) && solid(col, nextRow))) return false;
    col = nextCol; row = nextRow;
  }
  return true;
}

function clearGuardStep(ctx, from, to, fp) {
  return occupiedCells({ col: 0, row: 0 }, fp).every(c => clearGuardLine(ctx,
    { x: from.col + c.col + 0.5, y: from.row + c.row + 0.5 },
    { x: to.col + c.col + 0.5, y: to.row + c.row + 0.5 }));
}

function stepAside(ctx, guardian, target, from, targetAt, guardianFp, targetFp, dx, dy) {
  const to = { col: targetAt.col, row: targetAt.row };
  if (!canPlaceAt(ctx, guardian.id, to.col, to.row, [target.id]).ok
    || !clearGuardStep(ctx, from, to, guardianFp) || barrierCrossing(ctx, guardian.id, from, to)) return null;
  const occupied = new Set(occupiedCells(to, guardianFp).map(c => cellKey(c.col, c.row)));
  const choices = [];
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
    if (!x && !y) continue;
    const away = -(x * dx + y * dy) / Math.hypot(x, y);
    if (away >= -EPS) choices.push({ col: to.col + x, row: to.row + y, away });
  }
  choices.sort((a, b) => b.away - a.away || a.row - b.row || a.col - b.col);
  for (const spot of choices) {
    if (occupiedCells(spot, targetFp).some(c => occupied.has(cellKey(c.col, c.row)))) continue;
    if (!canPlaceAt(ctx, target.id, spot.col, spot.row).ok
      || !clearGuardStep(ctx, targetAt, spot, targetFp) || barrierCrossing(ctx, target.id, targetAt, spot)) continue;
    const landing = { col: spot.col, row: spot.row, facing: targetAt.facing };
    return { unitId: target.id, from: { ...targetAt }, to: landing, path: [{ ...targetAt }, landing] };
  }
  return null;
}

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
  function result(cell, targetShift = null) {
    const contactPoint = unitCenter(cell, guardianFp);
    const facing = normalizeFacing(Math.atan2(sourcePosition.x - contactPoint.x, -(sourcePosition.y - contactPoint.y)) * 180 / Math.PI);
    return {
      ok: true, guardianId, originalTargetId: targetId, casterId: sourceId,
      from: { ...from }, to: { col: cell.col, row: cell.row, facing },
      path: cell.path.map(c => ({ col: c.col, row: c.row })), distance: cell.cost, maxDistance,
      origin: sourcePosition, startPosition: origin, protectedPosition, contactPoint,
      pathDistance: cell.path.slice(1).reduce((sum, c, i) => sum + Math.hypot(c.col - cell.path[i].col, c.row - cell.path[i].row), 0),
      ...(targetShift && { targetShift }),
    };
  }
  const stay = () => result({ ...from, path: [from], cost: 0 });
  if (!guardian.isSummon) {
    if (!clearGuardLine(ctx, origin, protectedPosition)) return fail('高障碍隔断舍身');
    if (cellsAdjacent(targetAt, targetFp, sourceAt, fpOf(source))) {
      const targetShift = stepAside(ctx, guardian, target, from, targetAt, guardianFp, targetFp, dx, dy);
      if (!targetShift) return stay();
      const cost = Math.hypot(targetAt.col - from.col, targetAt.row - from.row);
      return result({ ...targetAt, cost, path: [from, targetAt] }, targetShift);
    }
  }
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
  if (!guardian.isSummon) {
    const intercept = candidates.find(c => c.between);
    return intercept ? result(intercept.cell) : stay();
  }
  return candidates.length ? result(candidates[0].cell) : fail('攻击来源侧没有可达舍身落点');
}
