// ==========================================
// 战棋 P06/M3 攻击范围查询（本轮实现单体/直线/扇形；预览=执行=AI 共用同一套查询）
// ctx = { compiled, units, placementsById, footprintsById }；live = ref.hp > 0。
// aim 为世界米坐标（点击格中心）；单体锁定 aim.targetId，投射遇第一站立角色停止（友方可挡不伤）；
// 直线/扇形按占格中心与几何求交，不被单位截断；所有范围格从 origin 逐格查实墙遮挡（低障碍不挡弹）。
// 本轮不实现圆形/全域/爆炸与【必中】，命中即返回 ok:false 与中文 reason。
// ==========================================

import { cellAt } from './scene.mjs';
import { occupiedCells, cellKey, unitCenter } from './geometry.mjs';

const EPS = 1e-9;
const SAMPLE_STEP = 0.2; // 弹道采样步长（米），小于 1 格宽保证逐格命中

function unitById(ctx, id) {
  return ctx.units.find(u => u.id === id) || null;
}

function isLive(u) {
  return !!(u.ref && u.ref.hp > 0);
}

function footprintOf(ctx, u) {
  return ctx.footprintsById[u.id] || u.footprint || { width: 1, height: 1 };
}

// live 单位占位索引：cellKey → { id, side }（倒地/死亡不挡弹）
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

// 射线采样：origin → 终点途经任何挡弹格（实墙/关门）返回 true；低障碍 blocksProjectile=false 不挡
function pathHitsWall(ctx, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len / SAMPLE_STEP));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cell = cellAt(ctx.compiled, Math.floor(x0 + dx * t), Math.floor(y0 + dy * t));
    if (cell && cell.blocksProjectile) return true;
  }
  return false;
}

// 射线采样：途经第一个非跳过名单的站立单位（单体投射遇第一站立角色停止）
function firstUnitBlocker(ctx, occ, x0, y0, x1, y1, skipIds) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len / SAMPLE_STEP));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const o = occ.get(cellKey(Math.floor(x0 + dx * t), Math.floor(y0 + dy * t)));
    if (o && !skipIds.has(o.id)) return o;
  }
  return null;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

// 直线/扇形候选格：按格中心与几何求交，再从 origin 逐格查墙（被挡格不收，其后格因穿墙也不收）
function collectAreaCells(ctx, origin, aim, range) {
  const { columns, rows } = ctx.compiled.grid;
  const vx = aim.x - origin.x, vy = aim.y - origin.y;
  const vlen = Math.hypot(vx, vy);
  const ux = vx / vlen, uy = vy / vlen;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const rx = (c + 0.5) - origin.x, ry = (r + 0.5) - origin.y;
      const t = rx * ux + ry * uy; // 沿瞄准方向的投影深度
      let inShape;
      if (range.type === '直线') {
        const lateral = Math.abs(rx * -uy + ry * ux);
        inShape = t >= -EPS && t <= range.length + EPS && lateral <= range.width / 2 + EPS;
      } else { // 扇形：射程 + 半角
        const d = Math.hypot(rx, ry);
        if (d > range.castRange + EPS) continue;
        if (d <= EPS) { inShape = true; } else {
          const halfRad = range.angle * Math.PI / 360;
          const ang = Math.acos(clamp((rx * ux + ry * uy) / d, -1, 1));
          inShape = ang <= halfRad + EPS;
        }
      }
      if (!inShape) continue;
      if (pathHitsWall(ctx, origin.x, origin.y, c + 0.5, r + 0.5)) continue;
      cells.push({ col: c, row: r });
    }
  }
  return cells;
}

// targetIds：作用格内存活敌人的占格中心命中即选中，同单位多格去重
function collectTargetsInCells(ctx, cells, caster) {
  const keys = new Set(cells.map(c => cellKey(c.col, c.row)));
  const targetIds = [];
  for (const u of ctx.units) {
    if (!isLive(u) || u.side === caster.side) continue;
    const p = ctx.placementsById[u.id];
    if (!p) continue;
    for (const c of occupiedCells(p, footprintOf(ctx, u))) {
      if (keys.has(cellKey(c.col, c.row))) { targetIds.push(u.id); break; }
    }
  }
  return targetIds;
}

// 攻击查询：{ ok, reason, origin:{x,y}, aim:{x,y,targetId?}, range, cells:[{col,row}], targetIds, blockedBy? }
export function queryAttack(ctx, casterId, skill, aim) {
  const caster = unitById(ctx, casterId);
  if (!caster) return { ok: false, reason: '施法者不存在', origin: null, aim: null, range: null, cells: [], targetIds: [] };
  if (!isLive(caster)) return { ok: false, reason: '施法者已倒地', origin: null, aim: null, range: null, cells: [], targetIds: [] };
  const cp = ctx.placementsById[casterId];
  if (!cp) return { ok: false, reason: '施法者缺少站位', origin: null, aim: null, range: null, cells: [], targetIds: [] };
  const origin = unitCenter(cp, footprintOf(ctx, caster));
  const normAim = aim ? { x: aim.x, y: aim.y, targetId: aim.targetId } : null;
  const fail = (reason, blockedBy) => {
    const out = { ok: false, reason, origin, aim: normAim, range: null, cells: [], targetIds: [] };
    if (blockedBy) out.blockedBy = blockedBy;
    return out;
  };

  const range = skill && skill.range;
  if (!range) return fail('技能缺少显式范围');
  if (range.type !== '单体' && range.type !== '直线' && range.type !== '扇形') return fail('范围类型暂不支持: ' + range.type);
  if (skill.guaranteedHit) return fail('必中暂不支持');
  if (!normAim || !Number.isFinite(normAim.x) || !Number.isFinite(normAim.y)) return fail('缺少瞄准点');

  if (range.type === '单体') {
    if (!normAim.targetId) return fail('单体技能需锁定目标');
    const target = unitById(ctx, normAim.targetId);
    if (!target) return fail('目标不存在');
    if (!isLive(target)) return fail('目标已倒地');
    if (target.side === caster.side) return fail('目标不是敌人');
    const tp = ctx.placementsById[target.id];
    if (!tp) return fail('目标缺少站位');
    const tfp = footprintOf(ctx, target);
    const tc = unitCenter(tp, tfp);
    const dist = Math.hypot(tc.x - origin.x, tc.y - origin.y);
    if (range.castRange !== undefined && dist > range.castRange + EPS) return fail('目标超出射程');
    if (pathHitsWall(ctx, origin.x, origin.y, tc.x, tc.y)) return fail('视线被墙阻挡', { type: 'wall' });
    const occ = buildLiveOcc(ctx);
    const blocker = firstUnitBlocker(ctx, occ, origin.x, origin.y, tc.x, tc.y, new Set([casterId, target.id]));
    if (blocker) {
      return fail(blocker.side === caster.side ? '友方挡弹' : '被其他敌人阻挡', { type: 'unit', unitId: blocker.id });
    }
    return {
      ok: true, reason: null, origin, aim: normAim,
      range: range.castRange !== undefined ? range.castRange : null,
      cells: occupiedCells(tp, tfp), targetIds: [target.id],
    };
  }

  // 直线/扇形：瞄准方向与射程校验，再按占格中心求交
  const vx = normAim.x - origin.x, vy = normAim.y - origin.y;
  if (Math.hypot(vx, vy) <= EPS) return fail('瞄准方向无效');
  const effRange = range.type === '扇形' ? range.castRange : range.length;
  if (range.type === '扇形' && range.castRange !== undefined && Math.hypot(vx, vy) > range.castRange + EPS) return fail('瞄准点超出射程');
  const cells = collectAreaCells(ctx, origin, normAim, range);
  const targetIds = collectTargetsInCells(ctx, cells, caster);
  return { ok: true, reason: null, origin, aim: normAim, range: effRange, cells, targetIds };
}
