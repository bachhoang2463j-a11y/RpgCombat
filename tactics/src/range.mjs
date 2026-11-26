// ==========================================
// 战棋 P06 六范围统一查询：预览、执行与 AI 使用同一套空间结果。
// ctx = { compiled, units, placementsById, footprintsById, visibleUnitIds? }；距离为世界米。
// 圆形：仅有半径、以自身为圆心，无需瞄准点；全域：无需瞄准点；
// 召唤：射程内空闲合法格 + 个人视野 + 完整模板 footprint（skill.summonFootprint，battle 先解析模板）。
// 区域目标按任意占格命中，且不剔除施法者（治疗/不分敌友需包含本人）。
// ==========================================

import { cellAt } from './scene.mjs';
import { occupiedCells, cellKey, unitCenter } from './geometry.mjs';
import { skillSlots } from './effect-definitions.mjs';
import { barrierContact } from './barriers.mjs';
import { canSeeUnit, canSeePoint, sightRadius } from './perception.mjs';
import { effectiveCastRange } from './regions.mjs';

const EPS = 1e-9;
const SAMPLE_STEP = 0.2;
const ALLY_TAGS = ['回', '回蓝', '冲', '增', '防', '盾', '瞄', '嘲讽', '再动', '避', '免伤', '反击', '驱散', '肃正', '速'];
const ENEMY_TAGS = ['降', '盲', '滞', '弱', '缓', '麻痹', '眩晕', '中毒', '燃烧', '穿透'];
const DAMAGE_TAGS = ['群攻', '单体', '群散射', '散射'];
const RANGE_TYPES = ['单体', '直线', '扇形', '圆形', '全域', '爆炸', '自身', '召唤'];

function unitById(ctx, id) { return ctx.units.find(u => u.id === id) || null; }
function isLive(u) { return !!(u && u.ref && u.ref.hp > 0); }
// 倒地：HP<=0；正式我方英雄可被治疗救起，召唤物/敌方归零不救
function isDowned(u) { return !!(u && u.ref && u.ref.hp <= 0); }
function isSummon(u) {
  if (!u) return false;
  if (u.summon === true || u.isSummon === true || u.kind === 'summon') return true;
  if (u.ref && (u.ref.summon === true || u.ref.isSummon === true)) return true;
  return Array.isArray(u.attrTags) && u.attrTags.includes('召唤物');
}
function isRevivable(u) {
  return isDowned(u) && (u.side === 'hero' || u.side === 'ally') && !isSummon(u)
    && !(u.ref && (u.ref.dead === true || u.ref.permanentlyDead === true));
}
// 含治疗/复活语义的槽：允许把可救起倒地英雄纳入候选
function skillHasHeal(skill) {
  return skillSlots(skill).some(s => {
    const tag = String(s.tag || '').replace(/[(（].*$/, '');
    return tag.startsWith('回复') || tag.startsWith('复活') || tag.startsWith('治疗');
  });
}
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

// 区域目标：任意真实占格落在区域内即命中（大型单位不再只看中心格）
function cellsToTargets(ctx, cells, { side = null, includeDowned = false } = {}) {
  const keys = new Set(cells.map(c => cellKey(c.col, c.row)));
  const result = [];
  for (const u of ctx.units) {
    const selectable = isLive(u) || (includeDowned && isRevivable(u));
    if (!selectable || (side && u.side !== side)) continue;
    const p = ctx.placementsById[u.id];
    if (!p) continue;
    const occ = occupiedCells(p, footprintOf(ctx, u));
    if (occ.some(c => keys.has(cellKey(c.col, c.row)))) result.push({ unitId: u.id, side: u.side, cells: occ });
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
    const length = range.length ?? range.castRange;
    if (d > length + EPS) return false;
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

// 单体重查：调用方传入新 unitCenter 作为 aim；skipSpatialRecheck 供冲锋接触复用，
// 只验目标身份/可选性，不再按技能射程与线遮挡重查（避免 6m 冲锋接触被射程/墙体误判）。
function collectSingle(ctx, caster, origin, aim, range, guaranteedHit, includeDowned, skipSpatialRecheck, attack) {
  if (!aim.targetId) return { ok: false, reason: '单体技能需锁定目标', cells: [], targetIds: [], blockedBy: null };
  const target = unitById(ctx, aim.targetId);
  if (!target) return { ok: false, reason: '目标不存在', cells: [], targetIds: [], blockedBy: null };
  const selectable = isLive(target) || (includeDowned && isRevivable(target) && target.side === caster.side);
  if (!selectable) return { ok: false, reason: '目标已倒地', cells: [], targetIds: [], blockedBy: null };
  const tp = ctx.placementsById[target.id], fp = footprintOf(ctx, target), tc = unitCenter(tp, fp);
  if (skipSpatialRecheck) {
    return { ok: true, cells: occupiedCells(tp, fp), targetIds: [target.id], shape: { type: '单体', from: origin, to: tc, castRange: range.castRange }, collisionPoint: tc };
  }
  const dist = centerDistance(origin, tc);
  if (range.castRange !== undefined && dist > range.castRange + EPS) return { ok: false, reason: '目标超出射程', cells: [], targetIds: [], blockedBy: { type: 'range', point: tc } };
  const wall = rayFirst(ctx, origin.x, origin.y, tc.x, tc.y, {
    skipUnitIds: [caster.id, target.id], blockUnits: target.side !== caster.side,
  });
  if (wall && wall.type === 'wall') return { ok: false, reason: '视线被墙阻挡', cells: [], targetIds: [], blockedBy: wall };
  if (wall && wall.type === 'boundary') return { ok: false, reason: '目标路径越出地图', cells: [], targetIds: [], blockedBy: wall };
  const visible = !ctx.enforcePerception || canSeeUnit(ctx, caster.id, target.id);
  const fogLock = !visible && attack && target.side !== caster.side && canSeeUnit(ctx, caster.id, target.id, true);
  if (!visible && !fogLock) return { ok: false, reason: '目标不在本人视野内', cells: [], targetIds: [], blockedBy: { type: 'vision' } };
  if (wall && wall.type === 'unit' && !guaranteedHit) return { ok: false, reason: wall.side === caster.side ? '友方挡弹' : '被其他敌人阻挡', cells: [], targetIds: [], blockedBy: wall };
  return { ok: true, cells: occupiedCells(tp, fp), targetIds: [target.id], shape: { type: '单体', from: origin, to: tc, castRange: range.castRange }, collisionPoint: tc, fogLock };
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
  // 旧口径仅保留给 classifySlotSide 的 p06 兼容断言；resolveSlotTargets 已不消费本函数
  const raw = String(tag || '').replace(/[\[\]]/g, '');
  if (!raw || raw === '无' || raw.startsWith('赋予')) return 'none';
  if (raw.startsWith('自')) return 'self';
  if (/^群/.test(raw)) return 'area';
  if (classifySlotSide(tag) !== 'none') return 'single';
  return 'none';
}

// 旧 isAttackSlot 已随规范单群合并移除；目标判定统一走 skillSlots（effect-definitions）

// 槽目标判定（规范单群合并）：目标数量一律由范围类型决定——
// 自身 → 全槽落施法者（敌方侧槽无目标）；单体 → 单点；其余 → 面积内按槽敌我语义取全部。
// skill.slotTargets override 支持 'self' | 'enemy' | 'ally'；skill.affectsAll（不分敌友）
// 覆盖默认敌我，对范围内所有单位（含施法者）同等生效。
export function resolveSlotTargets(ctx, casterId, skill, areaTargetIds, aimTargetId = null) {
  const caster = unitById(ctx, casterId);
  const all = (areaTargetIds || []).map(id => unitById(ctx, id)).filter(u => isLive(u) || isRevivable(u));
  const rangeType = skill && skill.range && skill.range.type;
  const scope = rangeType === '自身' ? 'self' : (rangeType === '单体' ? 'single' : 'area');
  const aimUnit = all.find(u => u.id === aimTargetId) || null;
  const affectsAll = !!skill?.affectsAll;
  const overrides = skill && Array.isArray(skill.slotTargets) ? skill.slotTargets : [];
  return skillSlots(skill).map(slot => {
    const override = overrides[slot.index] || null;
    const side = override === 'enemy' ? 'enemy' : override === 'ally' ? 'ally' : (slot.definition.side === 'enemy' ? 'enemy' : 'ally');
    let targetIds = [];
    if (override === 'self' || slot.target === 'self' || slot.definition.side === 'self') {
      targetIds = isLive(caster) ? [casterId] : [];
    } else if (affectsAll) {
      if (scope === 'single') targetIds = aimUnit ? [aimUnit.id] : [];
      else if (scope === 'self') targetIds = isLive(caster) ? [casterId] : [];
      else targetIds = all.map(u => u.id);
    } else if (scope === 'self') {
      targetIds = side === 'ally' && isLive(caster) ? [casterId] : [];
    } else if (scope === 'single') {
      if (side === 'enemy') targetIds = aimUnit && aimUnit.side !== (caster && caster.side) ? [aimUnit.id] : [];
      else targetIds = aimUnit && aimUnit.side === (caster && caster.side) ? [aimUnit.id] : (isLive(caster) ? [casterId] : []);
    } else {
      targetIds = all.filter(u => side === 'ally' ? u.side === (caster && caster.side) : u.side !== (caster && caster.side)).map(u => u.id);
    }
    return { index: slot.index, tag: slot.tag, side, scope, attack: slot.attack, targetIds };
  });
}

// S14 缺省范围预设（缺显式 [范围] 时按槽位与伤害类型推导，不按技能名字猜）：
// 攻击槽：旧单群写法带 群 前缀 → 群体预设（近战扇形3m/90°、远程法术圆形15m/半径3m）；
// 其余攻击槽单体预设（近战2m、远程/法术15m）；纯效果槽无攻击段 → 不补（需显式范围，可用第七种「自身」）。
export function resolveDefaultRange(skill) {
  if (!skill) return null;
  const dt = skill.damageType || '近战';
  const isGroup = [skill.type, skill.type2, skill.type3]
    .some(t => t && /^\[群(?:攻|穿透|眩晕|散射|中毒|燃烧|麻痹|降|盲|滞|弱|缓)/.test(String(t)));
  const hasAttack = skillSlots(skill).some(s => s.attack);
  if (isGroup) {
    return dt === '近战' ? { type: '扇形', castRange: 3, angle: 90 } : { type: '爆炸', castRange: 15, radius: 3 };
  }
  // 纯效果槽（治疗/增益/减益物品等）缺省同样落单体预设（S14 缺省单体技能；自身用 [范围:自身] 显式声明）
  if (!hasAttack) return dt === '近战' ? { type: '单体', castRange: 2 } : { type: '单体', castRange: 15 };
  return dt === '近战' ? { type: '单体', castRange: 2 } : { type: '单体', castRange: 15 };
}

function empty(reason, origin = null, aim = null) {
  return { ok: false, reason, origin, aim, range: null, cells: [], targetIds: [], actualTargetIds: [], slotTargets: [], disclosureTargetIds: [], collisionPoint: null, blockedBy: null, shape: null };
}

function querySummon(ctx, caster, origin, aim, range, skill, fail) {
  const dist = centerDistance(origin, aim);
  if (range.castRange !== undefined && dist > range.castRange + EPS) return fail('召唤落点超出射程');
  if (dist > sightRadius(ctx, caster) + EPS || !canSeePoint(ctx, caster.id, aim)) return fail('召唤落点超出个人视野');
  const fp = (skill && skill.summonFootprint) || { width: 1, height: 1 };
  const anchor = { col: Math.floor(aim.x), row: Math.floor(aim.y) };
  const occ = buildLiveOcc(ctx);
  for (const c of occupiedCells(anchor, fp)) {
    const cell = cellAt(ctx.compiled, c.col, c.row);
    if (!cell || cell.blocksMovement) return fail('召唤落点不可站立');
    if (occ.get(cellKey(c.col, c.row))) return fail('召唤落点已被占用');
  }
  const summonCells = occupiedCells(anchor, fp);
  return {
    ok: true, reason: null, origin, aim: { x: aim.x, y: aim.y, targetId: aim.targetId }, range: range.castRange ?? null,
    cells: summonCells, targetIds: [], damageTargetIds: [], actualTargetIds: [], targets: [],
    slotTargets: resolveSlotTargets(ctx, caster.id, skill, [], null), disclosureTargetIds: [],
    collisionPoint: null, contact: null, blockedBy: null, shape: { type: '召唤', anchor, footprint: fp }, blastCenter: null,
    summon: { anchor, footprint: fp },
  };
}

export function queryAttack(ctx, casterId, skill, aim, options = {}) {
  const caster = unitById(ctx, casterId);
  if (!caster) return empty('施法者不存在');
  if (!isLive(caster)) return empty('施法者已倒地');
  const cp = ctx.placementsById[casterId];
  if (!cp) return empty('施法者缺少站位');
  const origin = unitCenter(cp, footprintOf(ctx, caster));
  const normAim = aim && Number.isFinite(aim.x) && Number.isFinite(aim.y) ? { x: aim.x, y: aim.y, targetId: aim.targetId } : null;
  const fail = (reason, blockedBy = null) => Object.assign(empty(reason, origin, normAim), blockedBy ? { blockedBy } : {});
  const range = skill && skill.range ? effectiveCastRange(ctx, casterId, skill.range, skill) : null;
  if (!range) return fail('技能缺少显式范围');
  if (!RANGE_TYPES.includes(range.type)) return fail('范围类型不支持: ' + range.type);
  if (aim?.barrierId) {
    const barrier = (ctx.barriers || []).find(b => b.id === aim.barrierId);
    if (!barrier) return fail('结界不存在');
    if (barrier.side === caster.side) return fail('不能攻击友方结界');
    if (!skillSlots(skill).some(s => s.attack)) return fail('技能没有攻击槽');
    if (range.type === '自身' || range.type === '召唤') return fail('范围不能直接攻击结界');
    const point = barrierContact(ctx, barrier, origin, aim);
    if (!point) return fail('瞄准射线未接触结界');
    const limit = range.type === '圆形' ? range.radius : range.castRange ?? range.length;
    if (limit != null && centerDistance(origin, point) > limit + EPS) return fail('结界超出射程');
    const blocked = rayFirst(ctx, origin.x, origin.y, point.x, point.y, { skipUnitIds: [casterId], blockUnits: true });
    if (blocked && (blocked.type !== 'unit' || !skill.guaranteedHit)) return fail('结界攻击路径被阻挡', blocked);
    if (ctx.enforcePerception && !canSeePoint(ctx, casterId, point)) return fail('结界不在本人视野内');
    const slotTargets = resolveSlotTargets(ctx, casterId, skill, [], null).map(slot => ({ ...slot, barrierIds: slot.attack ? [barrier.id] : [] }));
    return { ok: true, reason: null, origin, aim: { barrierId: barrier.id, ...point }, range: limit ?? null,
      cells: [], targetIds: [], damageTargetIds: [], actualTargetIds: [], targets: [], slotTargets,
      barrierTargetIds: [barrier.id], barrierTargets: [{ barrierId: barrier.id, point }],
      disclosureTargetIds: [], collisionPoint: point, contact: { type: 'barrier', barrierId: barrier.id, point },
      blockedBy: null, shape: { type: range.type, from: origin, to: point }, blastCenter: range.type === '爆炸' ? point : null };
  }
  const includeDowned = skillHasHeal(skill);
  const skipSpatialRecheck = !!(options.skipSpatialRecheck || (aim && aim.skipSpatialRecheck));
  // 第七种范围「自身」：只作用于施法者自身占格，无需瞄准点
  if (range.type === '自身') {
    const selfCells = occupiedCells(cp, footprintOf(ctx, caster));
    const selfSlots = resolveSlotTargets(ctx, casterId, skill, [casterId], null);
    const damageSelf = selfSlots.find(slot => slot.attack)?.targetIds || [];
    return { ok: true, reason: null, origin, aim: { x: origin.x, y: origin.y, targetId: casterId }, range: null,
      cells: selfCells, targetIds: [casterId], damageTargetIds: damageSelf, actualTargetIds: [casterId],
      targets: [{ unitId: casterId, side: caster.side, cells: selfCells }], slotTargets: selfSlots,
      disclosureTargetIds: [casterId], collisionPoint: null, contact: null, blockedBy: null,
      shape: { type: '自身' }, blastCenter: null };
  }
  if (range.type === '召唤') {
    if (!normAim) return fail('召唤需选择落点');
    return querySummon(ctx, caster, origin, normAim, range, skill, fail);
  }
  // 圆形：仅有半径、以自身为圆心，无需瞄准点
  if (range.type === '圆形') {
    if (!(Number(range.radius) > 0)) return fail('圆形缺少半径');
    const center = { x: origin.x, y: origin.y, targetId: null };
    const cells = collectArea(ctx, '圆形', origin, center, range, caster.side);
    const targetIds = cellsToTargets(ctx, cells).filter(t => t.side !== caster.side).map(t => t.unitId);
    const actualTargets = cellsToTargets(ctx, cells, { includeDowned });
    return finishQuery(ctx, caster, skill, origin, center, cells, targetIds, actualTargets,
      { type: '圆形', center: { x: origin.x, y: origin.y }, radius: range.radius }, null, null, range, null, null);
  }
  // 全域：无需瞄准点
  if (range.type === '全域') {
    const cells = [];
    const { columns, rows } = ctx.compiled.grid;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) cells.push({ col, row });
    const targetIds = cellsToTargets(ctx, cells).filter(t => t.side !== caster.side).map(t => t.unitId);
    const actualTargets = cellsToTargets(ctx, cells, { includeDowned });
    return finishQuery(ctx, caster, skill, origin, normAim, cells, targetIds, actualTargets, { type: '全域' }, null, null, range, null, null);
  }
  if (!normAim) return fail('缺少瞄准点');

  let cells = [], targetIds = [], shape = null, collisionPoint = null, contact = null, blockedBy = null, blastCenter = null, fogLock = false;
  if (range.type === '单体') {
    const single = collectSingle(ctx, caster, origin, normAim, range, !!skill.guaranteedHit, includeDowned, skipSpatialRecheck, skillSlots(skill).some(s => s.attack));
    if (!single.ok) return Object.assign(fail(single.reason, single.blockedBy), { range });
    cells = single.cells; targetIds = single.targetIds; shape = single.shape; collisionPoint = single.collisionPoint; fogLock = single.fogLock;
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
  } else if (range.type === '爆炸') {
    const dist = centerDistance(origin, normAim);
    if (range.castRange !== undefined && dist > range.castRange + EPS) return Object.assign(fail('瞄准点超出射程'), { range });
    contact = skillSlots(skill).some(s => s.definition.kind === 'barrier') ? null
      : rayFirst(ctx, origin.x, origin.y, normAim.x, normAim.y, { skipUnitIds: [casterId], blockUnits: true });
    blockedBy = contact && contact.type === 'wall' ? contact : null;
    blastCenter = contact ? contact.point : normAim;
    const blastAim = { x: blastCenter.x, y: blastCenter.y };
    cells = collectArea(ctx, '圆形', blastAim, blastAim, { radius: range.radius }, caster.side, blastAim);
    shape = { type: '爆炸', from: origin, center: blastCenter, radius: range.radius, contact: contact || null };
    collisionPoint = blastCenter;
    // 接触单位（被投射物撞上的那一个）按爆心距离天然计入一次；不再剔除其中心格，也不额外加一次接触命中
    targetIds = cellsToTargets(ctx, cells).filter(t => t.side !== caster.side).map(t => t.unitId);
    if (contact && contact.type === 'unit' && contact.side !== caster.side && !targetIds.includes(contact.unitId)) targetIds.push(contact.unitId);
  }

  const actualTargets = cellsToTargets(ctx, cells, { includeDowned });
  const blastContact = range.type === '爆炸' && shape && shape.contact && shape.contact.type === 'unit' ? shape.contact : null;
  if (blastContact && !actualTargets.some(t => t.unitId === blastContact.unitId)) {
    const cu = unitById(ctx, blastContact.unitId);
    actualTargets.push({ unitId: cu.id, side: cu.side, cells: occupiedCells(ctx.placementsById[cu.id], footprintOf(ctx, cu)) });
  }
  return finishQuery(ctx, caster, skill, origin, normAim, cells, targetIds, actualTargets, shape, collisionPoint, contact, range, blockedBy, blastCenter, fogLock);
}

// 统一收尾：普通预览只揭示可见敌人，雾外单体锁定仅揭示指定的雾内目标。
function finishQuery(ctx, caster, skill, origin, aim, cells, targetIds, actualTargets, shape, collisionPoint, contact, range, blockedBy, blastCenter, fogLock = false) {
  let visible = ctx.visibleUnitIds ? new Set(ctx.visibleUnitIds) : null;
  if (!visible) {
    visible = new Set();
    for (const u of ctx.units) if (isLive(u) && canSeeUnit(ctx, caster.id, u.id)) visible.add(u.id);
  }
  const aimTargetId = aim && aim.targetId != null ? aim.targetId : null;
  const disclosureTargetIds = actualTargets.filter(t => t.side === caster.side || visible.has(t.unitId) || (fogLock && t.unitId === aimTargetId)).map(t => t.unitId);
  const slotTargets = resolveSlotTargets(ctx, caster.id, skill, actualTargets.map(t => t.unitId), aimTargetId);
  const damageSlotTargets = slotTargets.find(slot => slot.attack)?.targetIds || [];
  return {
    ok: true, reason: null, origin, aim, range: range.castRange ?? range.length ?? null,
    cells, targetIds, damageTargetIds: damageSlotTargets, actualTargetIds: actualTargets.map(t => t.unitId), targets: actualTargets, slotTargets,
    disclosureTargetIds, collisionPoint, contact: contact || (shape && shape.contact) || null, blockedBy, shape, blastCenter,
  };
}
