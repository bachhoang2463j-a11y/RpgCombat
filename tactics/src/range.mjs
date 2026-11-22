// ==========================================
// 战棋 P06 六范围统一查询：预览、执行与 AI 使用同一套空间结果。
// ctx = { compiled, units, placementsById, footprintsById, visibleUnitIds? }；距离为世界米。
// ==========================================

import { cellAt } from './scene.mjs';
import { occupiedCells, cellKey, unitCenter } from './geometry.mjs';

const EPS = 1e-9;
const SAMPLE_STEP = 0.2;
const ALLY_TAGS = ['回', '回蓝', '冲', '增', '防', '盾', '瞄', '嘲讽', '再动', '避', '免伤', '反击', '驱散', '肃正', '速'];
const ENEMY_TAGS = ['降', '盲', '滞', '弱', '缓', '麻痹', '眩晕', '中毒', '燃烧', '穿透'];
const DAMAGE_TAGS = ['群攻', '单体', '群散射', '散射'];

function unitById(ctx, id) { return ctx.units.find(u => u.id === id) || null; }
function isLive(u) { return !!(u && u.ref && u.ref.hp > 0); }
function footprintOf(ctx, u) { return ctx.footprintsById[u.id] || u.footprint || { width: 1, height: 1 }; }
function inBounds(ctx, c, r) { return c >= 0 && r >= 0 && c < ctx.compiled.grid.columns && r < ctx.compiled.grid.rows; }

function buildLiveOcc(ctx) {
  const occ = new Map();
  for (const u of ctx.units) {
    if (!isLive(u)) continue;
    const p = ctx.placementsById[u.id];
    if (!p) continue;
    for (const c of occupiedCells(p, footprintOf(ctx, u))) occ.set(cellKey(c.col, c.row), { id: u.id, side: u.side });
  }
  return occ;
}

function rayFirst(ctx, x0, y0, x1, y1, { skipUnitIds = [], blockUnits = false, passSide = null } = {}) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len / SAMPLE_STEP));
  const skip = new Set(skipUnitIds);
  const occ = blockUnits ? buildLiveOcc(ctx) : null;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, x = x0 + dx * t, y = y0 + dy * t;
    const col = Math.floor(x), row = Math.floor(y), cell = cellAt(ctx.compiled, col, row);
    if (!cell) return { type: 'boundary', point: { x, y }, cell: { col, row } };
    if (cell.blocksProjectile) return { type: 'wall', point: { x, y }, cell: { col, row }, objectIds: cell.objectIds };
    const o = occ && occ.get(cellKey(col, row));
    if (o && !skip.has(o.id) && (!passSide || o.side !== passSide)) return { type: 'unit', unitId: o.id, side: o.side, point: { x, y }, cell: { col, row } };
  }
  return null;
}

function segmentCells(ctx, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len / SAMPLE_STEP));
  const cells = [], seen = new Set();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, col = Math.floor(x0 + dx * t), row = Math.floor(y0 + dy * t), key = cellKey(col, row);
    if (!inBounds(ctx, col, row) || seen.has(key)) continue;
    seen.add(key); cells.push({ col, row });
  }
  return cells;
}

function cellsToTargets(ctx, cells, { side = null } = {}) {
  const keys = new Set(cells.map(c => cellKey(c.col, c.row)));
  const result = [];
  for (const u of ctx.units) {
    if (!isLive(u) || (side && u.side !== side)) continue;
    const p = ctx.placementsById[u.id];
    if (!p) continue;
    const center = unitCenter(p, footprintOf(ctx, u));
    const centerCell = { col: Math.floor(center.x), row: Math.floor(center.y) };
    if (keys.has(cellKey(centerCell.col, centerCell.row))) result.push({ unitId: u.id, side: u.side, cells: occupiedCells(p, footprintOf(ctx, u)) });
  }
  return result;
}

function centerDistance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function inAreaCell(type, c, r, origin, aim, range) {
  const x = c + 0.5, y = r + 0.5, rx = x - origin.x, ry = y - origin.y;
  if (type === '全域') return true;
  if (type === '圆形') return Math.hypot(x - aim.x, y - aim.y) <= range.radius + EPS;
  const vx = aim.x - origin.x, vy = aim.y - origin.y, vlen = Math.hypot(vx, vy);
  if (vlen <= EPS) return false;
  const ux = vx / vlen, uy = vy / vlen;
  const t = rx * ux + ry * uy;
  if (type === '直线') {
    const lateral = Math.abs(rx * -uy + ry * ux);
    return t >= -EPS && t <= range.length + EPS && lateral <= range.width / 2 + EPS;
  }
  const d = Math.hypot(rx, ry);
  if (d > range.castRange + EPS) return false;
  if (d <= EPS) return true;
  const halfRad = range.angle * Math.PI / 360;
  return Math.acos(clamp((rx * ux + ry * uy) / d, -1, 1)) <= halfRad + EPS;
}

function collectArea(ctx, type, origin, aim, range, casterSide, rayOrigin = origin) {
  const { columns, rows } = ctx.compiled.grid, cells = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    if (!inAreaCell(type, col, row, origin, aim, range)) continue;
    if (type !== '全域' && rayFirst(ctx, rayOrigin.x, rayOrigin.y, col + 0.5, row + 0.5, { passSide: casterSide })) continue;
    cells.push({ col, row });
  }
  return cells;
}

function collectLine(ctx, casterId, origin, aim, range) {
  const dx = aim.x - origin.x, dy = aim.y - origin.y, len = Math.hypot(dx, dy);
  if (len <= EPS) return { ok: false, reason: '瞄准方向无效', cells: [], shape: null, collisionPoint: null, contact: null };
  const dir = { x: dx / len, y: dy / len };
  const to = { x: origin.x + dir.x * range.length, y: origin.y + dir.y * range.length };
  const cells = [], seen = new Set();
  const maxLateral = range.width / 2 + EPS;
  const { columns, rows } = ctx.compiled.grid;
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const rx = col + 0.5 - origin.x, ry = row + 0.5 - origin.y;
    const t = rx * dir.x + ry * dir.y, lateral = Math.abs(rx * -dir.y + ry * dir.x);
    if (t < -EPS || t > range.length + EPS || lateral > maxLateral) continue;
    const wall = rayFirst(ctx, origin.x, origin.y, col + 0.5, row + 0.5, { skipUnitIds: [casterId], passSide: unitById(ctx, casterId)?.side });
    if (wall && wall.type !== 'unit') continue;
    const k = cellKey(col, row); if (!seen.has(k)) { seen.add(k); cells.push({ col, row }); }
  }
  const collision = rayFirst(ctx, origin.x, origin.y, to.x, to.y, { skipUnitIds: [casterId], blockUnits: true, passSide: unitById(ctx, casterId)?.side });
  return { ok: true, cells, shape: { type: '直线', from: origin, dir: Math.atan2(dir.y, dir.x), length: range.length, width: range.width }, collisionPoint: collision && collision.point, contact: collision };
}

function collectSingle(ctx, caster, origin, aim, range, guaranteedHit) {
  if (!aim.targetId) return { ok: false, reason: '单体技能需锁定目标', cells: [], targetIds: [], blockedBy: null };
  const target = unitById(ctx, aim.targetId);
  if (!target) return { ok: false, reason: '目标不存在', cells: [], targetIds: [], blockedBy: null };
  if (!isLive(target)) return { ok: false, reason: '目标已倒地', cells: [], targetIds: [], blockedBy: null };
  const tp = ctx.placementsById[target.id], fp = footprintOf(ctx, target), tc = unitCenter(tp, fp);
  const dist = centerDistance(origin, tc);
  if (range.castRange !== undefined && dist > range.castRange + EPS) return { ok: false, reason: '目标超出射程', cells: [], targetIds: [], blockedBy: { type: 'range', point: tc } };
  const wall = rayFirst(ctx, origin.x, origin.y, tc.x, tc.y, {
    skipUnitIds: [caster.id, target.id], blockUnits: target.side !== caster.side,
  });
  if (wall && wall.type === 'wall') return { ok: false, reason: '视线被墙阻挡', cells: [], targetIds: [], blockedBy: wall };
  if (wall && wall.type === 'boundary') return { ok: false, reason: '目标路径越出地图', cells: [], targetIds: [], blockedBy: wall };
  if (wall && wall.type === 'unit' && !guaranteedHit) return { ok: false, reason: wall.side === caster.side ? '友方挡弹' : '被其他敌人阻挡', cells: [], targetIds: [], blockedBy: wall };
  return { ok: true, cells: occupiedCells(tp, fp), targetIds: [target.id], shape: { type: '单体', from: origin, to: tc, castRange: range.castRange }, collisionPoint: tc };
}

export function classifySlotSide(tag) {
  const raw = String(tag || '').replace(/[\[\]]/g, '');
  if (raw.startsWith('自')) return 'self';
  if (/^群/.test(raw) && ENEMY_TAGS.some(part => raw.slice(1).includes(part))) return 'enemy';
  if (ALLY_TAGS.some(part => raw.includes(part))) return 'ally';
  if (ENEMY_TAGS.some(part => raw.includes(part)) || DAMAGE_TAGS.some(part => raw.includes(part))) return 'enemy';
  return 'none';
}

function slotScope(tag) {
  const raw = String(tag || '').replace(/[\[\]]/g, '');
  if (!raw || raw === '无' || raw.startsWith('赋予')) return 'none';
  if (raw.startsWith('自')) return 'self';
  if (/^群/.test(raw)) return 'area';
  if (classifySlotSide(tag) !== 'none') return 'single';
  return 'none';
}

function isAttackSlot(tag) {
  const raw = String(tag || '').replace(/[\[\]]/g, '');
  return DAMAGE_TAGS.some(part => raw.startsWith(part));
}

export function resolveSlotTargets(ctx, casterId, skill, areaTargetIds, aimTargetId = null) {
  const caster = unitById(ctx, casterId);
  const all = (areaTargetIds || []).map(id => unitById(ctx, id)).filter(isLive);
  const slots = [skill && skill.type, skill && skill.type2, skill && skill.type3];
  return slots.map((tag, index) => {
    const side = classifySlotSide(tag);
    const rangeType = skill && skill.range && skill.range.type;
    const scope = isAttackSlot(tag) && rangeType && rangeType !== '单体' ? 'area' : slotScope(tag);
    const targetIds = scope === 'self' ? (isLive(caster) ? [casterId] : [])
      : scope === 'single' ? all.filter(u => u.id === aimTargetId).map(u => u.id)
      : scope === 'area' ? all.filter(u => side === 'ally' ? u.side === caster?.side : side === 'enemy' ? u.side !== caster?.side : false).map(u => u.id)
      : [];
    return { index, tag: tag || '[无]', side, scope, attack: isAttackSlot(tag), targetIds };
  });
}

function empty(reason, origin = null, aim = null) {
  return { ok: false, reason, origin, aim, range: null, cells: [], targetIds: [], actualTargetIds: [], slotTargets: [], disclosureTargetIds: [], collisionPoint: null, blockedBy: null, shape: null };
}

export function queryAttack(ctx, casterId, skill, aim) {
  const caster = unitById(ctx, casterId);
  if (!caster) return empty('施法者不存在');
  if (!isLive(caster)) return empty('施法者已倒地');
  const cp = ctx.placementsById[casterId];
  if (!cp) return empty('施法者缺少站位');
  const origin = unitCenter(cp, footprintOf(ctx, caster));
  const normAim = aim && Number.isFinite(aim.x) && Number.isFinite(aim.y) ? { x: aim.x, y: aim.y, targetId: aim.targetId } : null;
  const fail = (reason, blockedBy = null) => Object.assign(empty(reason, origin, normAim), blockedBy ? { blockedBy } : {});
  const range = skill && skill.range;
  if (!range) return fail('技能缺少显式范围');
  if (!['单体', '直线', '扇形', '圆形', '全域', '爆炸'].includes(range.type)) return fail('范围类型不支持: ' + range.type);
  if (!normAim) return fail('缺少瞄准点');

  let cells = [], targetIds = [], shape = null, collisionPoint = null, contact = null, blockedBy = null, blastCenter = null;
  if (range.type === '单体') {
    const single = collectSingle(ctx, caster, origin, normAim, range, !!skill.guaranteedHit);
    if (!single.ok) return Object.assign(fail(single.reason, single.blockedBy), { range });
    cells = single.cells; targetIds = single.targetIds; shape = single.shape; collisionPoint = single.collisionPoint;
  } else if (range.type === '直线') {
    const line = collectLine(ctx, casterId, origin, normAim, range);
    if (!line.ok) return Object.assign(fail(line.reason), { range });
    cells = line.cells; shape = line.shape; collisionPoint = line.collisionPoint; contact = line.contact; blockedBy = line.contact;
    targetIds = cellsToTargets(ctx, cells).filter(t => t.unitId !== casterId && t.side !== caster.side).map(t => t.unitId);
  } else if (range.type === '扇形') {
    const d = centerDistance(origin, normAim);
    if (range.castRange !== undefined && d > range.castRange + EPS) return Object.assign(fail('瞄准点超出射程'), { range });
    if (d <= EPS) return Object.assign(fail('瞄准方向无效'), { range });
    cells = collectArea(ctx, '扇形', origin, normAim, range, caster.side);
    shape = { type: '扇形', from: origin, dir: Math.atan2(normAim.y - origin.y, normAim.x - origin.x), radius: range.castRange, angle: range.angle };
    targetIds = cellsToTargets(ctx, cells).filter(t => t.side !== caster.side).map(t => t.unitId);
  } else if (range.type === '圆形') {
    if (centerDistance(origin, normAim) > (range.castRange ?? Infinity) + EPS) return Object.assign(fail('瞄准点超出射程'), { range });
    cells = collectArea(ctx, '圆形', origin, normAim, range, caster.side);
    shape = { type: '圆形', center: normAim, radius: range.radius };
    targetIds = cellsToTargets(ctx, cells).filter(t => t.side !== caster.side).map(t => t.unitId);
  } else if (range.type === '全域') {
    cells = [];
    const { columns, rows } = ctx.compiled.grid;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) cells.push({ col, row });
    shape = { type: '全域' };
    targetIds = cellsToTargets(ctx, cells).filter(t => t.side !== caster.side).map(t => t.unitId);
  } else if (range.type === '爆炸') {
    const dist = centerDistance(origin, normAim);
    if (range.castRange !== undefined && dist > range.castRange + EPS) return Object.assign(fail('瞄准点超出射程'), { range });
  const contact = rayFirst(ctx, origin.x, origin.y, normAim.x, normAim.y, { skipUnitIds: [casterId], blockUnits: true });
    blockedBy = contact && contact.type === 'wall' ? contact : null;
    blastCenter = contact ? contact.point : normAim;
    const blastAim = { x: blastCenter.x, y: blastCenter.y };
    cells = collectArea(ctx, '圆形', blastAim, blastAim, { radius: range.radius }, caster.side, blastAim);
    shape = { type: '爆炸', from: origin, center: blastCenter, radius: range.radius, contact: contact || null };
    collisionPoint = blastCenter;
    if (contact && contact.type === 'unit') cells = cells.filter(c => cellKey(c.col, c.row) !== cellKey(contact.cell.col, contact.cell.row));
    targetIds = cellsToTargets(ctx, cells).filter(t => t.side !== caster.side).map(t => t.unitId);
  }

  const actualTargets = cellsToTargets(ctx, cells).filter(t => t.unitId !== casterId);
  const visible = ctx.visibleUnitIds ? new Set(ctx.visibleUnitIds) : null;
  const disclosureTargetIds = actualTargets.filter(t => t.side === caster.side || !visible || visible.has(t.unitId)).map(t => t.unitId);
  const slotTargets = resolveSlotTargets(ctx, casterId, skill, actualTargets.map(t => t.unitId), normAim.targetId);
  const damageSlotTargets = slotTargets.find(slot => slot.attack)?.targetIds || [];
  return { ok: true, reason: null, origin, aim: normAim, range: range.castRange ?? range.length ?? null,
    cells, targetIds, damageTargetIds: damageSlotTargets, actualTargetIds: actualTargets.map(t => t.unitId), targets: actualTargets, slotTargets,
    disclosureTargetIds, collisionPoint, contact: contact || (shape && shape.contact) || null, blockedBy, shape, blastCenter };
}
