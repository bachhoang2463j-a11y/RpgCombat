// ==========================================
// MVP 战斗控制器：消费 P03 自然行动，空间查询/扣费/伤害共用一条命令链。
// HP/MP 真值仅在角色 ref；时钟与位置可保存，实时资源和本轮余额不写长期档。
// ==========================================

import { createClock, dispatchClock, advanceToNextAction } from './clock.mjs';
import { emptyBattleState } from './lifecycle.mjs';
import { compileScene } from './scene.mjs';
import { findReachable, findJumpPath, canPlaceAt, traceDisplacement, cellsAdjacent } from './movement.mjs';
import { unitCenter } from './geometry.mjs';
import { queryAttack } from './range.mjs';
import { applyAttackDamage, applyCollisionDamage, calculateDamage, resolveHit } from './damage.mjs';
import { chooseEnemyAction } from './ai.mjs';

export const BASIC_ATTACK = {
  name: '普通攻击', type: '[单体]', power: 0, hit: 100, cost: 0,
  range: { type: '单体', castRange: 2 }, actionCost: { main: 1, aux: 0 },
};

const ATTACK_TAGS = ['群攻', '单体', '群散射', '散射'];
const EFFECT_TAGS = new Map([
  ['再动', 'main-point'], ['眩晕', 'stun'], ['群眩晕', 'stun'],
  ['中毒', 'poison'], ['群中毒', 'poison'], ['燃烧', 'burn'], ['群燃烧', 'burn'],
  ['单速', 'spd'], ['群速', 'spd'], ['单缓', 'spd-down'], ['群缓', 'spd-down'],
  ['单降', 'def'], ['群降', 'def'], ['单防', 'def-up'], ['群防', 'def-up'],
  ['回避', 'evasion'], ['单避', 'evasion'], ['群避', 'evasion'],
]);

function skillTagKind(tag) {
  const raw = String(tag || '').replace(/[\[\]]/g, '');
  if (!raw || raw === '无') return 'none';
  if (ATTACK_TAGS.some(prefix => raw.startsWith(prefix))) return 'attack';
  return EFFECT_TAGS.get(raw) || 'unsupported';
}
function skillKey(skill) { return (skill.parentName ? skill.parentName + '\u0000' : '') + skill.name; }
function skillCooldown(state, unitId, key) { return state.cooldowns?.[unitId]?.[key] || 0; }
function usedCount(state, unitId, key) { return state.perBattleUses?.[unitId]?.[key] || 0; }
export function skillSupport(skill) {
  if (!skill || !skill.range || !['单体', '直线', '扇形', '圆形', '全域', '爆炸'].includes(skill.range.type)) return { ok: false, reason: '范围未迁移' };
  if (skill.isGroup || skill.isReaction || skill.summonTarget || skill.barrierSub) return { ok: false, reason: skill.isReaction ? '反应技能只能被动触发' : '技能机制尚未迁移' };
  if ([skill.slotTurns, skill.slotTurns2, skill.slotTurns3].some(turns => turns != null)) return { ok: false, reason: '槽位独立持续时间尚未迁移' };
  const tags = [skill.type, skill.type2, skill.type3].filter(Boolean);
  const unsupported = tags.find(tag => skillTagKind(tag) === 'unsupported');
  if (unsupported) return { ok: false, reason: '效果尚未迁移：' + unsupported };
  if (skill.kanpoTarget || skill.sheshenTarget) return { ok: false, reason: '看破／舍身尚未迁移' };
  if (!tags.some(tag => skillTagKind(tag) === 'attack') && tags.some(tag => ['stun', 'poison', 'burn', 'spd-down', 'def'].includes(skillTagKind(tag)))) return { ok: false, reason: '纯控制／减益技能尚未迁移' };
  return { ok: true, reason: null };
}

export function createBattle({ units, placementsById, scene, battleState, visibleUnitIds = null, random = Math.random }) {
  const state = battleState || emptyBattleState(scene.sceneId, 'demo');
  const opening = {
    positions: structuredClone(placementsById),
    resources: units.map(u => ({ id: u.id, hp: u.ref.hp, mp: u.ref.mp })),
  };
  let resources = null;
  let visibleIds = visibleUnitIds ? visibleUnitIds.slice() : null;
  const ctx = {
    compiled: compileScene(scene), units, placementsById,
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])), carriedUnitIds: new Set(),
    get visibleUnitIds() { return visibleIds; },
  };
  let log = [];
  let actionSerial = 0;            // 每次取得自然行动 +1（额外主行动点不计；供语音与表现去重）
  const byId = new Map(units.map(u => [u.id, u]));
  const currentId = () => state.combatState.clock?.currentAction?.unitId || null;
  const actor = () => byId.get(currentId());

  function dispatchBattleClock(command, rulesContext = {}) {
    const result = dispatchClock(state, command, rulesContext);
    if (command.type === 'grantMainPoint' && result.events?.some(ev => ev.immediate) && currentId() === command.targetId) {
      state.combatState.clock.currentAction.resources.main += 1;
    }
    if (command.type === 'exitUnit' && state.combatState.charges?.[command.unitId]) {
      state.combatState.charges[command.unitId].preparing = null;
    }
    return result;
  }
  function addLog(text) { log.push(text); }
  function statusSource(unitId, source, effectId) {
    return { casterId: source.casterId, skillId: source.skillId, effectId: unitId + ':' + effectId };
  }
  function statusOf(unitId, source) {
    return state.combatState.clock?.statuses?.[unitId + '\u0000' + source.casterId + '\u0000' + source.skillId + '\u0000' + source.effectId] || null;
  }
  function activeStrength(unitId, kind) {
    const clock = state.combatState.clock;
    if (!clock) return 0;
    return Object.values(clock.statuses).filter(s => s.unitId === unitId && s.kind === kind).reduce((n, s) => n + (s.strength || 0), 0);
  }
  function settleClockEvent(ev) {
    if (ev.type === 'dot-tick' && !ev.suppressed) {
      const target = byId.get(ev.unitId);
      if (target && target.ref.hp > 0) {
        const damage = Math.min(target.ref.hp, Math.max(1, Number(ev.strength) || 1));
        target.ref.hp -= damage;
        addLog(target.name + ' · ' + (ev.kind === 'poison' ? '中毒' : '燃烧') + ' -' + damage + ' HP');
        if (target.ref.hp <= 0) dispatchBattleClock({ type: 'exitUnit', unitId: target.id, cause: 'down' });
      }
    } else if (ev.type === 'periodic-tick' && ev.kind === 'periodic' && !ev.suppressed) {
      const target = byId.get(ev.unitId);
      if (target && target.ref.hp > 0) target.ref.hp = Math.min(target.ref.maxHp, target.ref.hp + (ev.strength || 0));
    } else if (ev.type === 'status-expired' || ev.type === 'defend-expired' || ev.type === 'spd-expired') {
      const target = byId.get(ev.unitId);
      if (!target) return;
      const delta = Number(ev.strength) || 0;
      if (ev.kind === 'spd') target.ref.spd -= delta;
      else if (ev.kind === 'def' || ev.kind === 'defend') target.ref.def -= delta;
      else if (ev.kind === 'atk') target.ref.atk -= delta;
      else if (ev.kind === 'evasion') target.ref.evaBonus = (target.ref.evaBonus || 0) - delta;
      else if (ev.kind === 'barrier') target.ref.shield = Math.max(0, (target.ref.shield || 0) - delta);
    }
  }
  function initClock() {
    const carrying = state.combatState.carrying || (state.combatState.carrying = {});
    for (const [carrierId, targetId] of Object.entries(carrying)) {
      if (byId.has(carrierId) && byId.has(targetId)) ctx.carriedUnitIds.add(targetId);
    }
    createClock(state, units.map(u => ({ id: u.id, side: u.side, name: u.name, baseSpd: u.ref.spd })), {
      speedOf: id => Math.max(0, byId.get(id).ref.spd),
    });
    units.filter(u => u.ref.hp <= 0).forEach(u => dispatchBattleClock({ type: 'exitUnit', unitId: u.id, cause: 'down' }));
  }

  function checkEnd() {
    const heroesAlive = units.some(u => u.side === 'hero' && u.ref.hp > 0);
    const hasRescueCandidate = units.some(u => u.side === 'hero' && u.ref.hp <= 0 && state.combatState.clock.rescues[u.id]);
    const enemiesAlive = units.some(u => u.side === 'enemy' && u.ref.hp > 0);
    const type = (!heroesAlive && !hasRescueCandidate) ? 'defeat' : !enemiesAlive ? 'victory' : null;
    if (type && !state.combatState.clock.terminal) {
      state.combatState.clock.terminal = { type, at: state.combatState.clock.now };
      addLog(type === 'victory' ? '胜利：敌方已全灭。' : '失败：我方已全部倒地。');
    }
    return state.combatState.clock.terminal;
  }

  function prepareAtActionStart(u) {
    const prep = state.combatState.charges?.[u.id]?.preparing;
    if (!prep || prep.remaining <= 0) return;
    const charge = state.combatState.charges[u.id];
    const inventory = Math.min(charge.inventory, prep.remaining);
    charge.inventory -= inventory;
    prep.remaining -= inventory;
    prep.invested += inventory;
    prep.ready = prep.remaining <= 0;
    const r = state.combatState.clock.currentAction.resources;
    const amount = Math.min(r.main, prep.remaining);
    if (!amount && !inventory) return;
    r.main -= amount;
    prep.remaining -= amount;
    prep.invested += amount;
    prep.ready = prep.remaining <= 0;
    addLog(u.name + ' 准备 ' + prep.skill.name + ' · 剩余 ' + prep.remaining);
  }
  function advance() {
    resources = null;
    if (checkEnd()) return snapshot();
    const next = advanceToNextAction(state, {
      onEvent: settleClockEvent,
      checkBattleEnd: () => checkEnd(),
      speedOf: id => Math.max(0, byId.get(id)?.ref.spd || 0),
    });
    if (next.status === 'action') {
      const u = byId.get(next.unitId);
      resources = state.combatState.clock.currentAction.resources;
      resources.moveRemaining = u.ref.moveDistance * resources.moveQuota;
      resources.moveMultiplier = 1;
      prepareAtActionStart(u);
      actionSerial++;
      addLog('t=' + next.time.toFixed(2) + ' · ' + u.name + ' 行动');
    } else if (next.status === 'terminal') addLog('僵持：无人可继续行动。');
    return snapshot();
  }

  function start() {
    if (resources) return snapshot();
    initClock();
    if (currentId()) {
      const u = actor();
      const r = state.combatState.clock.currentAction.resources;
      resources = r;
      if (resources.moveRemaining === undefined) resources.moveRemaining = u.ref.moveDistance * r.moveQuota;
      if (resources.moveMultiplier === undefined) resources.moveMultiplier = 1;
      actionSerial++;
      return snapshot();
    }
    return advance();
  }

  function snapshot() {
    const clock = state.combatState.clock;
    return {
      now: clock?.now || 0, currentId: currentId(), actionSerial, resources: resources ? { moveRemaining: resources.moveRemaining, sprintRemaining: resources.sprintRemaining || 0, main: resources.main, aux: resources.aux, moveMultiplier: resources.moveMultiplier || 1 } : null,
      terminal: clock?.terminal ? { ...clock.terminal } : null,
      preparation: clock?.currentAction ? structuredClone(state.combatState.charges?.[clock.currentAction.unitId]?.preparing || null) : null,
      chargeInventory: clock?.currentAction ? (state.combatState.charges?.[clock.currentAction.unitId]?.inventory || 0) : 0,
      units: units.map(u => ({ id: u.id, hp: u.ref.hp, mp: u.ref.mp, status: u.ref.hp > 0 ? 'active' : u.side === 'hero' ? 'down' : 'dead' })),
      carrying: structuredClone(state.combatState.carrying || {}), positions: structuredClone(placementsById), log: log.slice(),
    };
  }

  function reachable() {
    const resourcesNow = state.combatState.clock?.currentAction?.resources;
    if (resourcesNow && resourcesNow.moveMultiplier === undefined) resourcesNow.moveMultiplier = 1;
    const carrying = (state.combatState.carrying || {})[currentId()];
    return actor() && resources ? findReachable(ctx, currentId(), resources.moveRemaining * (resources.moveMultiplier || 1), carrying ? 2 : 1) : { cells: [], byKey: new Map() };
  }
  function previewMove(col, row) {
    const cell = reachable().cells.find(c => c.col === col && c.row === row) || null;
    if (!cell) return null;
    const multiplier = resources.moveMultiplier || 1;
    return { ...cell, cost: cell.cost / multiplier, budgetCost: cell.cost };
  }
  function move(col, row) {
    if (!resources || state.combatState.clock.terminal) return { ok: false, reason: '当前不能移动' };
    if (resources.moveMultiplier === undefined) resources.moveMultiplier = 1;
    const cell = previewMove(col, row);
    if (!cell || cell.cost === 0) return { ok: false, reason: '落点不可达' };
    const p = placementsById[currentId()];
    const from = { col: p.col, row: p.row, facing: p.facing };
    const last = cell.path[cell.path.length - 2] || p;
    p.facing = ((Math.atan2(col - last.col, -(row - last.row)) * 180 / Math.PI) + 360) % 360;
    p.col = col; p.row = row;
    const multiplier = resources.moveMultiplier || 1;
    const travel = cell.cost / multiplier;
    const before = resources.moveRemaining;
    resources.moveRemaining = Math.max(0, resources.moveRemaining - travel);
    if (resources.sprintRemaining) resources.sprintRemaining = Math.max(0, resources.sprintRemaining - travel);
    addLog(actor().name + ' 移动 ' + travel.toFixed(2) + 'm');
    return { ok: true, cell: { ...cell, cost: travel, budgetCost: cell.cost }, from, unitId: currentId(), moveBefore: before, moveAfter: resources.moveRemaining };
  }
  function sprint() {
    if (!resources || resources.main < 1) return { ok: false, reason: '主行动已用完' };
    resources.main--;
    resources.moveRemaining += actor().ref.moveDistance;
    resources.moveMultiplier = 1;
    resources.sprintRemaining = (resources.sprintRemaining || 0) + actor().ref.moveDistance;
    addLog(actor().name + ' 冲刺，移动额度 +' + actor().ref.moveDistance + 'm');
    return { ok: true, moveRemaining: resources.moveRemaining, sprintRemaining: resources.sprintRemaining };
  }
  function previewJump(col, row) {
    const u = actor();
    if (!u || !resources || resources.aux < 1) return { ok: false, reason: '辅助行动不足' };
    const maxDistance = (Math.max(0, u.ref.spd) + Math.max(0, u.ref.strength || 0)) / 20;
    return findJumpPath(ctx, u.id, col, row, maxDistance);
  }
  function jump(col, row) {
    const q = previewJump(col, row);
    if (!q.ok) return q;
    if (q.distance > resources.moveRemaining + 1e-9) return { ok: false, reason: '移动额度不足', ...q };
    const p = placementsById[currentId()];
    const from = { col: p.col, row: p.row, facing: p.facing };
    const last = q.path[q.path.length - 2] || p;
    p.facing = ((Math.atan2(col - last.col, -(row - last.row)) * 180 / Math.PI) + 360) % 360;
    p.col = col; p.row = row;
    resources.aux--;
    resources.moveRemaining = Math.max(0, resources.moveRemaining - q.distance);
    if (resources.sprintRemaining) resources.sprintRemaining = Math.max(0, resources.sprintRemaining - q.distance);
    addLog(actor().name + ' 跳跃 ' + q.distance.toFixed(2) + 'm');
    return { ...q, from, to: { col, row }, unitId: currentId(), moveRemaining: resources.moveRemaining };
  }
  function adjacent(a, afp, b, bfp) { return cellsAdjacent(a, afp, b, bfp); }
  function push(targetId) {
    const u = actor(), target = byId.get(targetId);
    if (!u || !resources || resources.aux < 1) return { ok: false, reason: '辅助行动不足' };
    if (!target || target.ref.hp <= 0 || target.id === u.id) return { ok: false, reason: '推动目标无效' };
    const up = placementsById[u.id], tp = placementsById[targetId];
    const ufp = ctx.footprintsById[u.id] || { width: 1, height: 1 }, tfp = ctx.footprintsById[targetId] || { width: 1, height: 1 };
    if (!adjacent(up, ufp, tp, tfp)) return { ok: false, reason: '推动目标必须相邻' };
    resources.aux--;
    const strength = Math.max(0, Number(u.ref.strength || 0));
    const weight = Number(target.ref.totalWeight || 0);
    const opposed = target.side !== u.side && target.ref.hp > 0;
    const rollPush = opposed ? Math.floor(random() * strength) + 1 : null;
    const rollResist = opposed ? Math.floor(random() * Math.max(1, Number(target.ref.strength || 0))) + 1 : null;
    if (!(weight < strength * 1.5) || (opposed && rollPush <= rollResist)) {
      addLog(u.name + ' 推动 ' + target.name + ' 失败');
      return { ok: true, success: false, targetId, rollPush, rollResist, moveDistance: 0 };
    }
    const requested = 2 * Math.floor(strength * 1.5 / weight);
    const from = { col: tp.col, row: tp.row, facing: tp.facing };
    const dir = { x: Math.sign(tp.col - up.col), y: Math.sign(tp.row - up.row) };
    const traced = traceDisplacement(ctx, targetId, dir, requested);
    const last = traced.path[traced.path.length - 1];
    tp.col = last.col; tp.row = last.row;
    const remaining = requested - traced.distance;
    let collision = null;
    if (remaining > 1e-9) collision = applyCollisionDamage(remaining * 10, target.ref);
    if (target.ref.hp <= 0) {
      if (state.combatState.charges?.[targetId]) state.combatState.charges[targetId].preparing = null;
      if (state.combatState.carrying) {
        for (const [carrierId, carriedId] of Object.entries(state.combatState.carrying)) {
          if (carriedId === targetId) { delete state.combatState.carrying[carrierId]; ctx.carriedUnitIds.delete(targetId); }
        }
      }
      dispatchBattleClock({ type: 'exitUnit', unitId: targetId, cause: 'down' });
    }

    addLog(u.name + ' 推动 ' + target.name + ' ' + traced.distance.toFixed(2) + 'm' + (collision ? ' · 撞击 ' + collision.hpDmg + ' HP' : ''));
    return { ok: true, success: true, targetId, from, to: { col: tp.col, row: tp.row }, requestedDistance: requested,
      movedDistance: traced.distance, path: traced.path, blockedBy: traced.blockedBy, collision, hpAfter: target.ref.hp, down: target.ref.hp <= 0, rollPush, rollResist };
  }
  function previewCarry(targetId) {
    const u = actor(), target = byId.get(targetId);
    if (!u || !target || target.id === u.id || target.ref.hp > 0 || target.side !== u.side) return { ok: false, reason: '只能背起倒地友方' };
    if ((state.combatState.carrying || {})[u.id]) return { ok: false, reason: '已经背负角色' };
    const strength = Math.max(0, Number(u.ref.strength || 0));
    const weight = Number(u.ref.totalWeight || 0) + Number(target.ref.totalWeight || 0);
    if (!(weight < strength * 1.5)) return { ok: false, reason: '总重量超过力量上限' };
    const a = placementsById[u.id], b = placementsById[targetId];
    const af = ctx.footprintsById[u.id] || { width: 1, height: 1 }, bf = ctx.footprintsById[targetId] || { width: 1, height: 1 };
    if (!adjacent(a, af, b, bf)) return { ok: false, reason: '背负目标必须相邻' };
    return { ok: true, carrierId: u.id, targetId, totalWeight: weight };
  }
  function carry(targetId) {
    const q = previewCarry(targetId);
    if (!q.ok) return q;
    if (!resources || resources.main < 1) return { ok: false, reason: '主行动不足' };
    resources.main--;
    const carrying = state.combatState.carrying || (state.combatState.carrying = {});
    carrying[q.carrierId] = targetId;
    ctx.carriedUnitIds.add(targetId);
    addLog(actor().name + ' 背起 ' + byId.get(targetId).name);
    return q;
  }
  function drop() {
    const u = actor(), carrying = state.combatState.carrying || {};
    const targetId = u && carrying[u.id];
    if (!targetId) return { ok: false, reason: '当前没有背负角色' };
    const p = placementsById[u.id], fp = ctx.footprintsById[u.id] || { width: 1, height: 1 };
    const directions = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    let place = null;
    for (const [dx, dy] of directions) {
      const col = p.col + dx, row = p.row + dy;
      const q = canPlaceAt(ctx, targetId, col, row, [u.id]);
      if (q.ok) { place = { col, row, facing: p.facing }; break; }
    }
    if (!place) return { ok: false, reason: '附近没有合法放下位置' };
    delete carrying[u.id]; ctx.carriedUnitIds.delete(targetId);
    Object.assign(placementsById[targetId], place);
    dispatchClock(state, { type: 'reenterUnit', unitId: targetId });
    addLog(u.name + ' 放下 ' + byId.get(targetId).name);
    return { ok: true, carrierId: u.id, targetId, placement: place };
  }
  function previewDisplacement(unitId, direction, distance) { return traceDisplacement(ctx, unitId, direction, distance); }

  function currentResources() {
    return resources || state.combatState.clock?.currentAction?.resources || null;
  }
  function chargeState(unitId) {
    const charges = state.combatState.charges || (state.combatState.charges = {});
    return charges[unitId] || (charges[unitId] = { inventory: 0, preparing: null });
  }
  function usesLeft(unitId, skill) {
    if (!(skill.maxUses > 0)) return Infinity;
    const key = skillKey(skill);
    return Math.max(0, skill.maxUses - usedCount(state, unitId, key));
  }
  function canUseSkill(skill) {
    const u = actor(), r = currentResources();
    if (!u || !r || state.combatState.clock?.terminal) return { ok: false, reason: '当前不能使用技能' };
    const support = skillSupport(skill);
    if (!support.ok) return support;
    const key = skillKey(skill), cost = skill.actionCost || { main: 1, aux: 0 };
    const charge = chargeState(u.id), preparing = charge.preparing && charge.preparing.skillKey === key;
    if (usesLeft(u.id, skill) <= 0 && !preparing) return { ok: false, reason: '限次已用完' };
    if (skillCooldown(state, u.id, key) > state.combatState.clock.now + 1e-9 && !preparing) return { ok: false, reason: '技能冷却中' };
    if (skill.isOthers) {
      const targets = units.filter(target => target.id !== u.id && target.ref.hp > 0);
      const valid = targets.some(target => {
        const tc = unitCenter(placementsById[target.id], target.footprint), uc = unitCenter(placementsById[u.id], u.footprint);
        if (Math.hypot(tc.x - uc.x, tc.y - uc.y) > (skill.range.castRange ?? 2)) return false;
        const q = queryAttack(ctx, u.id, { ...skill, isReaction: false, isOthers: false, range: { type: '单体', castRange: skill.range.castRange ?? 2 } }, { ...tc, targetId: target.id });
        return q.ok;
      });
      if (!valid) return { ok: false, reason: '没有距离与视线合法的反应目标' };
    }
    const ready = preparing && charge.preparing.remaining <= 0;
    if (preparing && !ready) return { ok: false, reason: '蓄力尚未就绪，请继续准备' };
    if (skill.charge > 0 && charge.preparing && !preparing) return { ok: false, reason: '请先释放或取消当前蓄力' };
    const mainCost = skill.charge > 0 ? (preparing ? (ready ? 0 : 1) : 1) : (cost.main || 0);
    const auxCost = skill.charge > 0 ? 0 : (cost.aux || 0);
    if (r.main < mainCost || r.aux < auxCost) return { ok: false, reason: r.main < mainCost ? '主行动已用完' : '辅助行动已用完' };
    if (u.ref.mp < (preparing ? 0 : (skill.cost || 0)) || u.ref.hp <= (preparing ? 0 : (skill.hpCost || 0)) || (u.ref.tp || 0) < (preparing ? 0 : (skill.tpCost || 0))) return { ok: false, reason: '数值资源不足' };
    return { ok: true, preparing: !!preparing, ready, mainCost, auxCost };
  }

  function skillStatus(skill) {
    const status = canUseSkill(skill);
    if (!status.ok) return status;
    if (skill.isReaction) return { ok: false, reason: '反应技能只能被动触发' };
    return status;
  }

  function effectKindForTarget(kind, target, caster) {
    if ((kind === 'poison' || kind === 'burn' || kind === 'stun') && target.side === caster.side) return false;
    return kind !== 'none';
  }
  function previewAttack(skill, aim) {
    const valid = canUseSkill(skill);
    if (!valid.ok) return { ok: false, reason: valid.reason, cells: [], targetIds: [], slotTargets: [] };
    const query = queryAttack(ctx, currentId(), skill, aim);
    if (!query.ok) return query;
    const caster = actor();
    for (const slot of query.slotTargets || []) {
      const kind = skillTagKind(slot.tag);
      if (kind === 'unsupported') return { ...query, ok: false, reason: '效果尚未迁移：' + slot.tag };
      if (kind === 'none' || kind === 'attack') continue;
      const possible = (slot.targetIds || []).some(id => effectKindForTarget(kind, byId.get(id), caster));
      if (!possible) return { ...query, ok: false, reason: '没有该效果的合法目标：' + slot.tag };
    }
    return query;
  }
  // incomingType：来袭技能的伤害类型（近战/远程/法术）；反应类型按来袭技能匹配，不按来源单位
  function canUseReaction(responder, skill, sourceId, incomingType = null) {
    const source = byId.get(sourceId);
    if (skill && (skill.kanpoTarget || skill.sheshenTarget || [skill.type, skill.type2, skill.type3].some(tag => tag && !/^\[(?:无|回避|单避|群避|反击)\]$/.test(tag)))) return { ok: false, reason: '反应效果尚未迁移' };
    if (!responder || !source || !skill.isReaction || responder.ref.hp <= 0 || source.ref.hp <= 0) return { ok: false, reason: '反应技能不可用' };
    if (skill.reactionTarget && skill.reactionTarget !== 'all' && skill.reactionTarget !== (incomingType || source.ref.damageType)) return { ok: false, reason: '反应类型不匹配' };
    const key = skillKey(skill);
    if (usesLeft(responder.id, skill) <= 0 || skillCooldown(state, responder.id, key) > state.combatState.clock.now + 1e-9) return { ok: false, reason: '反应限次或冷却未就绪' };
    if (responder.ref.mp < (skill.cost || 0) || responder.ref.hp <= (skill.hpCost || 0) || (responder.ref.tp || 0) < (skill.tpCost || 0)) return { ok: false, reason: '反应资源不足' };
    if (skill.isOthers) {
      const a = unitCenter(placementsById[responder.id], responder.footprint), b = unitCenter(placementsById[source.id], source.footprint);
      if (Math.hypot(a.x - b.x, a.y - b.y) > (skill.range.castRange ?? 2) + 1e-9) return { ok: false, reason: '反应目标超出技能距离' };
    }
    const target = source;
    const check = queryAttack(ctx, responder.id, skill, { ...unitCenter(placementsById[target.id], target.footprint), targetId: target.id });
    return check.ok ? { ok: true, query: check, responder, source } : { ok: false, reason: check.reason, query: check };
  }
  // 回避成功后的真实错位：侧闪沿攻击线垂直方向（先左后右，八方向量化），后撤沿来源→自身方向；
  // 复用推动同一位移追踪（墙/单位阻挡即停），不消耗移动额度，不触发新的反应链。
  function evadeShift(responder, source, shift) {
    const fp = responder.footprint || { width: 1, height: 1 };
    const a = unitCenter(placementsById[source.id], source.footprint), b = unitCenter(placementsById[responder.id], fp);
    const base = Math.atan2(b.y - a.y, b.x - a.x);
    const angles = shift.mode === 'back' ? [base] : [base - Math.PI / 2, base + Math.PI / 2];
    const from = { col: placementsById[responder.id].col, row: placementsById[responder.id].row };
    for (const ang of angles) {
      const q = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
      const dir = { x: Math.round(Math.cos(q)), y: Math.round(Math.sin(q)) };
      const traced = traceDisplacement(ctx, responder.id, dir, shift.distance);
      if (traced.distance <= 1e-9) continue;
      const last = traced.path[traced.path.length - 1];
      placementsById[responder.id].col = last.col; placementsById[responder.id].row = last.row;
      return { from, to: { col: last.col, row: last.row }, path: traced.path, distance: traced.distance };
    }
    return null;
  }
  function applyReaction(responder, skill, sourceId, incomingType = null) {
    const check = canUseReaction(responder, skill, sourceId, incomingType);
    if (!check.ok) return { ok: false, reason: check.reason };
    const source = check.source, key = skillKey(skill);
    responder.ref.mp -= skill.cost || 0; responder.ref.hp -= skill.hpCost || 0; responder.ref.tp = (responder.ref.tp || 0) - (skill.tpCost || 0);
    if (skill.maxUses > 0) {
      if (!state.perBattleUses) state.perBattleUses = {};
      const uses = state.perBattleUses[responder.id] || (state.perBattleUses[responder.id] = {});
      uses[key] = (uses[key] || 0) + 1;
    }
    if (skill.delay > 0) dispatchClock(state, { type: 'applyCooldown', unitId: responder.id, skillKey: key, duration: skill.delay });
    const evade = [skill.type, skill.type2, skill.type3].some(tag => /避|看破/.test(tag || ''));
    if (evade) {
      const result = resolveHit(source.ref, responder.ref, { hit: 100 }, random);
      if (result.hit) {
        const shift = skill.evadeShift ? evadeShift(responder, source, skill.evadeShift) : null;
        addLog(responder.name + ' 反应闪避 ' + source.name + ' 的攻击' + (shift ? ' · ' + skill.name + ' 错位 ' + shift.distance.toFixed(1) + 'm' : ''));
        return { ok: true, canceled: true, result, shift };
      }
    }
    const counter = [skill.type, skill.type2, skill.type3].some(tag => /反击/.test(tag || ''));
    if (counter) {
      const counterSkill = { ...skill, power: skill.power == null || skill.power === 0 ? responder.ref.atk : skill.power };
      const result = applyAttackDamage(responder.ref, source.ref, counterSkill, random);
      addLog(responder.name + ' 反击 ' + source.name + (result.hit ? ' -' + result.hpDmg + ' HP' : ' 闪避'));
      if (source.ref.hp <= 0) dispatchBattleClock({ type: 'exitUnit', unitId: source.id, cause: 'down' });
      return { ok: true, canceled: false, result };
    }
    return { ok: true, canceled: false };
  }

  function advancePreparation() {
    const u = actor(), charge = u && chargeState(u.id);
    if (!u || !charge.preparing || charge.preparing.remaining <= 0 || !resources) return { ok: false, reason: '当前没有待准备技能' };
    const inventory = Math.min(charge.inventory, charge.preparing.remaining);
    charge.inventory -= inventory;
    charge.preparing.remaining -= inventory;
    charge.preparing.invested += inventory;
    const amount = Math.min(resources.main, charge.preparing.remaining);
    if (!amount && !inventory) return { ok: false, reason: '主行动不足' };
    resources.main -= amount;
    charge.preparing.remaining -= amount;
    charge.preparing.invested += amount;
    charge.preparing.ready = charge.preparing.remaining <= 0;
    addLog(u.name + ' 投入 ' + amount + ' 主行动准备 ' + charge.preparing.skill.name + ' · 剩余 ' + charge.preparing.remaining);
    return { ok: true, invested: amount, remaining: charge.preparing.remaining, ready: charge.preparing.ready };
  }

  function cancelPreparation(unitId = currentId()) {
    const charge = state.combatState.charges?.[unitId];
    if (!charge?.preparing) return { ok: false, reason: '当前没有待取消蓄力' };
    const name = charge.preparing.skill.name;
    charge.preparing = null;
    addLog(byId.get(unitId).name + ' 取消蓄力 ' + name + '（已付资源不退）');
    return { ok: true };
  }

  function attack(skill, aim) {
    const valid = canUseSkill(skill);
    const query = valid.ok ? queryAttack(ctx, currentId(), skill, aim) : { ok: false, reason: valid.reason };
    if (!query.ok) return { ok: false, reason: query.reason, query };
    const slots = query.slotTargets || [];
    const damageSlots = slots.filter(s => s.attack);
    const unsupportedSlot = slots.find(s => s.side !== 'none' && skillTagKind(s.tag) === 'unsupported');
    if (unsupportedSlot) return { ok: false, reason: '效果尚未迁移：' + unsupportedSlot.tag, query };
    const hasEffect = slots.some(s => skillTagKind(s.tag) !== 'none' && skillTagKind(s.tag) !== 'attack');
    if (!damageSlots.length && !hasEffect) return { ok: false, reason: '缺少可执行效果槽', query };
    const allTargets = [...new Set(slots.flatMap(s => s.targetIds || []))];
    if (!allTargets.length) return { ok: false, reason: '范围内没有合法目标', query };
    const damageTargets = [...new Set(damageSlots.flatMap(s => s.targetIds || []))];
    const u = actor();
    const actionCost = skill.actionCost || { main: 1, aux: 0 };
    const charge = chargeState(u.id);
    const key = skillKey(skill);
    const preparing = charge.preparing && charge.preparing.skillKey === key;
    if (skill.charge > 0 && !preparing) {
      resources.main -= 1;
      u.ref.mp -= skill.cost || 0; u.ref.hp -= skill.hpCost || 0; u.ref.tp = (u.ref.tp || 0) - (skill.tpCost || 0);
      if (skill.maxUses > 0) {
        if (!state.perBattleUses) state.perBattleUses = {};
        const uses = state.perBattleUses[u.id] || (state.perBattleUses[u.id] = {});
        uses[key] = (uses[key] || 0) + 1;
      }
      charge.preparing = { skillKey: key, skill: structuredClone(skill), remaining: Math.max(0, skill.charge - charge.inventory), invested: Math.min(skill.charge, charge.inventory) };
      charge.inventory -= charge.preparing.invested;
      if (skill.delay > 0) dispatchClock(state, { type: 'applyCooldown', unitId: u.id, skillKey: key, duration: skill.delay });
      if (charge.preparing.remaining === 0) charge.preparing.ready = true;
      prepareAtActionStart(u);
      addLog(u.name + ' 开始蓄力 ' + skill.name + ' · 需投入 ' + charge.preparing.remaining + ' 主行动');
      return { ok: true, preparing: true, hits: [], query, casterId: u.id, skill, aim: { ...aim }, mpCost: skill.cost || 0, actionCost: { main: 1, aux: 0 }, logFrom: log.length - 1, logTo: log.length };
    }
    const chargeReady = preparing && charge.preparing.remaining <= 0;
    if (!chargeReady) { resources.main -= valid.mainCost; resources.aux -= valid.auxCost; }
    if (!preparing) { u.ref.mp -= skill.cost || 0; u.ref.hp -= skill.hpCost || 0; u.ref.tp = (u.ref.tp || 0) - (skill.tpCost || 0); }
    if (skill.maxUses > 0 && !preparing) {
      if (!state.perBattleUses) state.perBattleUses = {};
      const uses = state.perBattleUses[u.id] || (state.perBattleUses[u.id] = {});
      uses[key] = (uses[key] || 0) + 1;
    }
    const logFrom = log.length;
    const resolvedHits = new Map();
    const sourceKey = u.id + ':' + key;
    const slotHitById = new Map();
    let segNo = 0;
    for (const slot of slots) {
      const kind = skillTagKind(slot.tag);
      if (kind === 'attack') segNo++;
      for (const id of slot.targetIds || []) {
        const target = byId.get(id);
        if (!target || target.ref.hp <= 0) continue;
        if (kind === 'attack') {
          // 多段攻击槽逐段独立命闪与扣血（各段威力取本槽 power）；同一目标的反应只在首段前执行一次，回避成功则整次攻击落空
          const prev = resolvedHits.get(id);
          if (prev && prev.reaction) continue;
          if (!prev) {
            const reactLog = log.length;
            const reactions = target.skills.filter(s => s.isReaction && (!s.reactionTarget || s.reactionTarget === 'all' || s.reactionTarget === skill.damageType));
            let reaction = null;
            for (const rs of reactions) {
              const rr = applyReaction(target, rs, u.id, skill.damageType);
              if (rr.canceled) { reaction = { responderId: id, skillName: rs.name, fxTag: rs.fxTag || null, canceled: true, shift: rr.shift || null }; break; }
            }
            if (reaction) {
              const seg = { index: slot.index, hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, logIndex: reactLog, logEnd: log.length };
              resolvedHits.set(id, { targetId: id, hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, maxHp: target.ref.maxHp, down: false, side: target.side, logIndex: reactLog, logEnd: log.length, segments: [seg], reaction });
              continue;
            }
          }
          const slotSkill = slot.index === 0 ? skill : { ...skill, power: skill['power' + (slot.index + 1)] || 0 };
          const before = target.ref.hp;
          const result = applyAttackDamage(u.ref, target.ref, slotSkill, random);
          const logIndex = log.length;
          addLog(u.name + ' · ' + skill.name + (damageSlots.length > 1 ? ' 第' + segNo + '段' : '') + ' → ' + target.name + (result.hit ? ' -' + result.hpDmg + ' HP' : ' 闪避'));
          const down = target.ref.hp <= 0;
          if (down) { dispatchBattleClock({ type: 'exitUnit', unitId: id, cause: 'down' }); addLog(target.name + (target.side === 'hero' ? ' 倒地' : ' 死亡')); }
          const seg = { index: slot.index, ...result, hpBefore: before, hpAfter: target.ref.hp, down, logIndex, logEnd: log.length };
          if (!prev) resolvedHits.set(id, { targetId: id, ...result, hpBefore: before, hpAfter: target.ref.hp, maxHp: target.ref.maxHp, down, side: target.side, logIndex, logEnd: log.length, segments: [seg] });
          else Object.assign(prev, { hit: prev.hit || result.hit, hpDmg: prev.hpDmg + result.hpDmg, hpAfter: target.ref.hp, down, logEnd: log.length, segments: [...prev.segments, seg] });
          slotHitById.set(id, slotHitById.get(id) === true || !!result.hit);
          continue;
        }
        const beneficial = kind === 'main-point' || kind === 'spd' || kind === 'def-up' || kind === 'evasion';
        if (slotHitById.get(id) !== true && !(beneficial && !damageSlots.length)) continue;
        if (kind === 'none') continue;
        if (kind === 'main-point') dispatchBattleClock({ type: 'grantMainPoint', targetId: id, sourceKey: u.id + ':' + key });
        else if (kind === 'stun') dispatchClock(state, { type: 'applyStun', unitId: id });
        else if (kind === 'poison' || kind === 'burn') dispatchClock(state, { type: 'applyStatus', unitId: id, source: statusSource(id, { casterId: u.id, skillId: key }, slot.index), kind, strength: slot.index === 0 ? skill.power : (skill['power' + (slot.index + 1)] || 0), duration: ((slot.index === 0 ? skill.slotTurns : skill['slotTurns' + (slot.index + 1)]) || skill.turns || 1) * 100 });
        else if (kind === 'spd' || kind === 'spd-down' || kind === 'def' || kind === 'def-up' || kind === 'evasion') {
          const field = kind.startsWith('spd') ? 'spd' : kind.startsWith('def') ? 'def' : 'evaBonus';
          const delta = (kind.endsWith('down') ? -1 : 1) * Math.abs(slot.index === 0 ? skill.power : (skill['power' + (slot.index + 1)] || 0));
          const source = statusSource(id, { casterId: u.id, skillId: key }, slot.index);
          const previous = statusOf(id, source);
          target.ref[field] = (target.ref[field] || 0) + delta - (previous?.strength || 0);
          const statusKind = field === 'spd' ? 'spd' : field === 'def' ? 'def' : 'evasion';
          dispatchClock(state, { type: 'applyStatus', unitId: id, source, kind: statusKind, strength: delta, duration: ((slot.index === 0 ? skill.slotTurns : skill['slotTurns' + (slot.index + 1)]) || skill.turns || 1) * 100 }, { speedOf: uid => Math.max(0, byId.get(uid).ref.spd) });
        }
      }
    }
    if (skill.haste > 0) charge.inventory += skill.haste;
    if (skill.delay > 0 && !state.cooldowns?.[u.id]?.[key]) dispatchClock(state, { type: 'applyCooldown', unitId: u.id, skillKey: key, duration: skill.delay });
    if (preparing) charge.preparing = null;
    const p = placementsById[u.id];
    p.facing = ((Math.atan2(aim.x - query.origin.x, -(aim.y - query.origin.y)) * 180 / Math.PI) + 360) % 360;
    const hits = [...resolvedHits.values()];
    return { ok: true, hits, query, casterId: u.id, skill, aim: { ...aim }, facing: p.facing, mpCost: preparing ? 0 : (skill.cost || 0), actionCost, logFrom, logTo: log.length };
  }

  function endAction() {
    const id = currentId();
    if (!id || state.combatState.clock.terminal) return snapshot();
    const charge = state.combatState.charges?.[id];
    if (charge?.preparing?.ready) cancelPreparation(id);
    dispatchClock(state, { type: 'endAction', unitId: id });
    return advance();
  }

  function enemySkills() {
    const u = actor();
    return u.skills.filter(s => skillStatus(s).ok).concat(BASIC_ATTACK);
  }
  // 敌方决策（只读）：与 runEnemyTurn 同一 AI 与同一合法性查询；执行仍走 move/attack/endAction 同一命令
  function planEnemyAction() {
    if (!actor() || actor().side !== 'enemy' || state.combatState.clock.terminal || !resources) return null;
    return chooseEnemyAction(ctx, currentId(), resources.moveRemaining, enemySkills(), skill => skillStatus(skill));
  }
  function runEnemyTurn() {
    if (!actor() || actor().side !== 'enemy' || state.combatState.clock.terminal) return snapshot();
    const choice = planEnemyAction();
    if (choice.moveTo) move(choice.moveTo.col, choice.moveTo.row);
    if (choice.skill && resources.main > 0) attack(choice.skill, choice.aim);
    return endAction();
  }

  function reset() {
    for (const rec of opening.resources) {
      const u = byId.get(rec.id);
      u.ref.hp = rec.hp; u.ref.mp = rec.mp;
    }
    for (const id of Object.keys(placementsById)) Object.assign(placementsById[id], opening.positions[id]);
    Object.assign(state, emptyBattleState(state.sceneId, state.battleId));
    resources = null; log = []; actionSerial = 0;
    return start();
  }

  return { ctx, battleState: state, start, snapshot, reachable, previewMove, move, sprint, previewJump, jump, push, previewCarry, carry, drop, previewDisplacement,
    setVisibleUnitIds(ids) { visibleIds = ids ? ids.slice() : null; },
    canUseSkill, skillStatus, canUseReaction, advancePreparation, cancelPreparation,
    previewAttack, attack, endAction, planEnemyAction, runEnemyTurn, reset };
}
