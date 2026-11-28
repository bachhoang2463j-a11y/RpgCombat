// ==========================================
// 战棋 P07 场地结界（SPEC S07 空间形态）
// 纯规则模块：固定位置、固定大小，不跟随施术者；友方可进出，敌方不可跨界。
// 数据：{ id, casterId, side, center, radius, cells, integrity, maxIntegrity, armor, protectType, endAt }
// 每施术者同时一座，成功创建替换旧座；不同施术者不得重叠、不得切过大型单位占地。
// 本模块不改 HP/资源、不做表现层；伤害与费用由 battle 结算。
// ==========================================

import { occupiedCells, cellKey, unitCenter } from './geometry.mjs';
import { skillSlots } from './effect-definitions.mjs';

const EPS = 1e-9;

function unitById(ctx, id) { return ctx.units.find(u => u.id === id) || null; }
function fpOf(ctx, u) { return ctx.footprintsById[u.id] || u.footprint || { width: 1, height: 1 }; }
function isLive(u) { return !!(u && u.ref && u.ref.hp > 0); }
function cellsOfUnit(ctx, u) {
  const p = ctx.placementsById[u.id];
  return p ? occupiedCells(p, fpOf(ctx, u)) : [];
}
function cellSet(cells) {
  const s = new Set();
  for (const c of cells) s.add(cellKey(c.col, c.row));
  return s;
}
function anyInside(barrier, cells) {
  const s = cellSet(barrier.cells);
  return cells.some(c => s.has(cellKey(c.col, c.row)));
}
function allInside(barrier, cells) {
  const s = cellSet(barrier.cells);
  return cells.length > 0 && cells.every(c => s.has(cellKey(c.col, c.row)));
}

// 圆形区域格：以格中心落在半径内为准（与 range 的圆形判定一致）
function barrierCells(ctx, center, radius) {
  const { columns, rows } = ctx.compiled.grid;
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if (Math.hypot(col + 0.5 - center.x, row + 0.5 - center.y) <= radius + EPS) cells.push({ col, row });
    }
  }
  return cells;
}

// 结界创建预检（提交扣费前调用）。返回 { ok, reason, barrier }
export function previewBarrier(ctx, casterId, skill, query) {
  const caster = unitById(ctx, casterId);
  if (!caster) return { ok: false, reason: '施术者不存在', barrier: null };
  const p = ctx.placementsById[casterId];
  if (!p) return { ok: false, reason: '施术者缺少站位', barrier: null };
  const origin = unitCenter(p, fpOf(ctx, caster));
  const center = (query && query.blastCenter) || (query && query.aim) || origin;
  const radius = Number(skill && skill.range && (skill.range.radius != null ? skill.range.radius : skill.range.castRange)) || 0;
  if (!(radius > 0)) return { ok: false, reason: '结界缺少半径', barrier: null };
  const cells = barrierCells(ctx, center, radius);
  if (!cells.length) return { ok: false, reason: '结界范围为空', barrier: null };

  const barriers = ctx.barriers || [];
  // 不同施术者不得重叠（同施术者旧座会被替换，故跳过）
  for (const b of barriers) {
    if (b.casterId === casterId) continue;
    const s = cellSet(b.cells);
    if (cells.some(c => s.has(cellKey(c.col, c.row)))) return { ok: false, reason: '结界与既有结界重叠', barrier: null };
  }
  const slot = skillSlots(skill).find(s => s.definition.kind === 'barrier');
  const rawIntegrity = slot ? slot.power : skill?.barrierIntegrity ?? skill?.power;
  const integrity = Math.max(0, Number(rawIntegrity) || 0);
  const armor = Math.max(0, Number(skill && skill.barrierArmor) || 0);
  const protectType = slot?.definition.damageCategory || slot?.tag.match(/肃正[:：](近战|远程|法术)/)?.[1] || skill?.barrierSub || 'all';
  const visualIdentity = protectType === '法术' ? 'gold' : protectType === '远程' ? 'blue' : 'white';
  const createdAt = typeof ctx.now === 'function' ? ctx.now() : 0;
  const endAt = null; // 屏障永久持续，不受技能或槽位回合数影响。
  const barrier = {
    id: (ctx.runId ? ctx.runId + ':' : '') + 'barrier:' + casterId + ':' + ((ctx._barrierSerial || 0) + 1),
    casterId,
    skillName: skill.name,
    side: caster.side,
    center: { x: center.x, y: center.y },
    radius,
    cells,
    integrity,
    maxIntegrity: integrity,
    armor,
    protectType,
    visualIdentity,
    createdAt,
    endAt,
    shape: { type: '圆形', center: { x: center.x, y: center.y }, radius },
    boundary: { type: 'circle', center: { x: center.x, y: center.y }, radius },
  };
  return { ok: true, reason: null, barrier };
}

// 成功创建：调用前须已 preview；同施术者替换旧座；显式修改 ctx.barriers
export function createBarrier(ctx, casterId, skill, query) {
  const preview = previewBarrier(ctx, casterId, skill, query);
  if (!preview.ok) return { ok: false, reason: preview.reason, barrier: null };
  if (!ctx.barriers) ctx.barriers = [];
  ctx._barrierSerial = (ctx._barrierSerial || 0) + 1;
  const barriers = ctx.barriers;
  const replaced = [];
  for (let i = barriers.length - 1; i >= 0; i--) {
    if (barriers[i].casterId === casterId) replaced.unshift(structuredClone(barriers.splice(i, 1)[0]));
  }
  barriers.push(preview.barrier);
  return { ok: true, reason: null, barrier: preview.barrier, replaced };
}

export function expireBarriers(ctx, now) {
  const removed = [];
  const barriers = ctx.barriers || [];
  for (let i = barriers.length - 1; i >= 0; i--) {
    if (barriers[i].endAt != null && barriers[i].endAt <= now + EPS) removed.unshift(structuredClone(barriers.splice(i, 1)[0]));
  }
  return removed;
}

export function clearBarriers(ctx, casterId = null, skillName = null) {
  const removed = [];
  const barriers = ctx.barriers || [];
  for (let i = barriers.length - 1; i >= 0; i--) {
    const b = barriers[i];
    if ((casterId == null || b.casterId === casterId) && (skillName == null || b.skillName === skillName)) {
      removed.unshift(structuredClone(barriers.splice(i, 1)[0]));
    }
  }
  return removed;
}

// 查询某单位/站位所在的结界：
//   barrierAt(ctx, unitId)                      → 按单位完整占格判定
//   barrierAt(ctx, { col, row }, footprint?)    → 按显式站位与占地判定
export function barrierAt(ctx, unitOrPlacement, footprint) {
  const barriers = ctx.barriers || [];
  let cells;
  if (typeof unitOrPlacement === 'string') {
    const u = unitById(ctx, unitOrPlacement);
    if (!u) return null;
    cells = cellsOfUnit(ctx, u);
  } else if (unitOrPlacement && Number.isFinite(unitOrPlacement.col) && Number.isFinite(unitOrPlacement.row)) {
    cells = occupiedCells(unitOrPlacement, footprint || { width: 1, height: 1 });
  } else {
    return null;
  }
  for (const b of barriers) if (anyInside(b, cells)) return b;
  return null;
}

// 敌方跨过结界边界时返回该结界（任方向：进入或离开）；友方与内部移动返回 null
export function barrierCrossing(ctx, unitId, from, to) {
  const unit = unitById(ctx, unitId);
  if (!unit) return null;
  const fp = fpOf(ctx, unit);
  const fromCells = occupiedCells(from, fp);
  const toCells = occupiedCells(to, fp);
  for (const b of ctx.barriers || []) {
    if (unit.side === b.side) continue; // 友方可进出
    const fromIn = anyInside(b, fromCells);
    const toIn = anyInside(b, toCells);
    if (fromIn !== toIn || fromIn && (!allInside(b, fromCells) || !allInside(b, toCells))) return b;
    // 每个占格中心的连续轨迹按网格交点切分，避免斜线/长距离跳过薄边界。
    for (const offset of occupiedCells({ col: 0, row: 0 }, fp)) {
      const x = from.col + offset.col + 0.5, y = from.row + offset.row + 0.5;
      const dx = to.col - from.col, dy = to.row - from.row;
      const cuts = [0, 1];
      for (const [a, d] of [[x, dx], [y, dy]]) {
        if (!d) continue;
        for (let k = Math.ceil(Math.min(a, a + d)); k <= Math.floor(Math.max(a, a + d)); k++) {
          const t = (k - a) / d;
          if (t > 0 && t < 1) cuts.push(t);
        }
      }
      cuts.sort((a, c) => a - c);
      const s = cellSet(b.cells);
      for (let i = 1; i < cuts.length; i++) {
        const t = (cuts[i - 1] + cuts[i]) / 2;
        const inside = s.has(cellKey(Math.floor(x + dx * t), Math.floor(y + dy * t)));
        if (inside !== fromIn) return b;
      }
    }
  }
  return null;
}

// 敌方普通移动/跳跃/侧闪/冲锋是否跨界（含进入与离开）
export function barrierBlocksMove(ctx, unitId, from, to) {
  return !!barrierCrossing(ctx, unitId, from, to);
}

// 外部敌方对内部目标的攻击拦截：返回被拦结界，否则 null。
// 默认所有外敌攻击/减益均被拦（不按 protectType 过滤，S07 口径由上层确认）；
// 不处理穿透/必中（二者同样被结界拦截，由调用方另行标注）。
export function interception(ctx, casterId, targetId, origin) {
  const attacker = unitById(ctx, casterId);
  const target = unitById(ctx, targetId);
  if (!target) return null;
  const b = barrierAt(ctx, targetId);
  if (!b) return null;
  const attackerSide = origin?.side ?? (attacker ? attacker.side : null);
  if (attackerSide === b.side) return null; // 结界友方攻击不被拦
  let attackerCells = [];
  if (origin?.placement) {
    attackerCells = occupiedCells(origin.placement, origin.footprint || { width: 1, height: 1 });
  } else if (origin && Number.isFinite(origin.col) && Number.isFinite(origin.row)) {
    attackerCells = occupiedCells(origin, { width: 1, height: 1 });
  } else if (attacker) {
    const p = ctx.placementsById[attacker.id];
    if (p) attackerCells = occupiedCells(p, fpOf(ctx, attacker));
  }
  if (attackerCells.length && allInside(b, attackerCells)) return null; // 内部对内部不拦
  return b;
}

// 射线与圆形边界的首次接触；内部来源取离开边界，外部来源取进入边界。
export function barrierContact(ctx, barrier, origin, aim) {
  const from = origin?.placement ? unitCenter(origin.placement, origin.footprint || { width: 1, height: 1 }) : origin;
  if (!from || !barrier?.center) return null;
  const to = Number.isFinite(aim?.x) && Number.isFinite(aim?.y) ? aim : barrier.center;
  let dx = to.x - from.x, dy = to.y - from.y;
  if (Math.hypot(dx, dy) <= EPS) { dx = 1; dy = 0; }
  const len = Math.hypot(dx, dy); dx /= len; dy /= len;
  const x = from.x - barrier.center.x, y = from.y - barrier.center.y;
  const projection = x * dx + y * dy;
  const disc = projection * projection - (x * x + y * y - barrier.radius * barrier.radius);
  if (disc < -EPS) return null;
  const root = Math.sqrt(Math.max(0, disc));
  const hits = [-projection - root, -projection + root].filter(t => t >= -EPS);
  if (!hits.length) return null;
  const t = Math.max(0, hits[0]);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

// 结界承伤：护甲先减（armorMult 可放大/缩小护甲），不消耗个人护盾，击破当次无溢出。
export function damageBarrier(ctx, id, rawDamage, opts = {}) {
  const armorMult = opts.armorMult == null ? 1 : opts.armorMult;
  const barriers = ctx.barriers || [];
  const idx = barriers.findIndex(b => b.id === id);
  if (idx < 0) return { integrityBefore: 0, integrityAfter: 0, damage: 0, broken: false, barrier: null };
  const b = barriers[idx];
  const barrierBefore = structuredClone(b);
  const before = b.integrity;
  const raw = Math.max(0, rawDamage);
  const resistedDamage = b.protectType === opts.incomingType ? Math.floor(raw * 0.5) : raw;
  const armorDamage = Math.min(resistedDamage, Math.max(0, b.armor * armorMult));
  const damage = resistedDamage - armorDamage;
  const after = Math.max(0, before - damage);
  b.integrity = after;
  const broken = after <= 0;
  if (broken) barriers.splice(idx, 1);
  const barrierAfter = structuredClone(b);
  return { integrityBefore: before, integrityAfter: after, damage, rawDamage: raw, resistedDamage,
    armorDamage, actualLoss: before - after, noOverflow: true, broken,
    barrier: barrierAfter, barrierBefore, barrierAfter };
}
