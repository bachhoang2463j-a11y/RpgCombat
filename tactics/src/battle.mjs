// ==========================================
// MVP 战斗控制器：消费 P03 自然行动，空间查询/扣费/伤害共用一条命令链。
// HP/MP 真值仅在角色 ref；时钟与位置可保存，实时资源和本轮余额不写长期档。
// ==========================================

import { createClock, dispatchClock, advanceToNextAction } from './clock.mjs';
import { emptyBattleState } from './lifecycle.mjs';
import { compileScene } from './scene.mjs';
import { findReachable, findJumpPath, canPlaceAt, traceDisplacement, cellsAdjacent } from './movement.mjs';
import { queryAttack } from './range.mjs';
import { applyAttackDamage, applyCollisionDamage } from './damage.mjs';
import { chooseEnemyAction } from './ai.mjs';

export const BASIC_ATTACK = {
  name: '普通攻击', type: '[单体]', power: 0, hit: 100, cost: 0,
  range: { type: '单体', castRange: 2 }, actionCost: { main: 1, aux: 0 },
};

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

  function addLog(text) { log.push(text); }
  function initClock() {
    const carrying = state.combatState.carrying || (state.combatState.carrying = {});
    for (const [carrierId, targetId] of Object.entries(carrying)) {
      if (byId.has(carrierId) && byId.has(targetId)) ctx.carriedUnitIds.add(targetId);
    }
    createClock(state, units.map(u => ({ id: u.id, side: u.side, name: u.name, baseSpd: u.ref.spd })), {
      speedOf: id => Math.max(0, byId.get(id).ref.spd),
    });
    units.filter(u => u.ref.hp <= 0).forEach(u => dispatchClock(state, { type: 'exitUnit', unitId: u.id, cause: 'down' }));
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

  function advance() {
    resources = null;
    if (checkEnd()) return snapshot();
    const next = advanceToNextAction(state);
    if (next.status === 'action') {
      const u = byId.get(next.unitId);
      resources = state.combatState.clock.currentAction.resources;
      resources.moveRemaining = u.ref.moveDistance * resources.moveQuota;
      resources.moveMultiplier = 1;
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
      units: units.map(u => ({ id: u.id, hp: u.ref.hp, mp: u.ref.mp, status: u.ref.hp > 0 ? 'active' : u.side === 'hero' ? 'down' : 'dead' })),
      carrying: structuredClone(state.combatState.carrying || {}), positions: structuredClone(placementsById), log: log.slice(),
    };
  }

  function reachable() {
    const resourcesNow = state.combatState.clock?.currentAction?.resources;
    if (resourcesNow && resourcesNow.moveMultiplier === undefined) resourcesNow.moveMultiplier = 1;
    return actor() && resources ? findReachable(ctx, currentId(), resources.moveRemaining * (resources.moveMultiplier || 1)) : { cells: [], byKey: new Map() };
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
      if (state.combatState.carrying) {
        for (const [carrierId, carriedId] of Object.entries(state.combatState.carrying)) {
          if (carriedId === targetId) { delete state.combatState.carrying[carrierId]; ctx.carriedUnitIds.delete(targetId); }
        }
      }
      dispatchClock(state, { type: 'exitUnit', unitId: targetId, cause: 'down' });
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

  function previewAttack(skill, aim) {
    if (!actor() || !resources || state.combatState.clock.terminal) return { ok: false, reason: '当前不能攻击', cells: [], targetIds: [], slotTargets: [] };
    const cost = skill.actionCost || { main: 1, aux: 0 };
    if (resources.main < (cost.main || 0)) return { ok: false, reason: '主行动已用完', cells: [], targetIds: [], slotTargets: [] };
    if (resources.aux < (cost.aux || 0)) return { ok: false, reason: '辅助行动已用完', cells: [], targetIds: [], slotTargets: [] };
    if (actor().ref.mp < (skill.cost || 0)) return { ok: false, reason: 'MP 不足', cells: [], targetIds: [], slotTargets: [] };
    return queryAttack(ctx, currentId(), skill, aim);
  }
  function attack(skill, aim) {
    const query = previewAttack(skill, aim);
    if (!query.ok) return { ok: false, reason: query.reason, query };
    const damageTargets = query.damageTargetIds || [];
    if (!damageTargets.length) return { ok: false, reason: '范围内没有合法伤害目标', query };
    const u = actor();
    const actionCost = skill.actionCost || { main: 1, aux: 0 };
    resources.main -= actionCost.main || 0;
    resources.aux -= actionCost.aux || 0;
    u.ref.mp -= skill.cost || 0;
    const p = placementsById[u.id];
    p.facing = ((Math.atan2(aim.x - query.origin.x, -(aim.y - query.origin.y)) * 180 / Math.PI) + 360) % 360;
    const logFrom = log.length;
    const hits = damageTargets.map(id => {
      const target = byId.get(id);
      const hpBefore = target.ref.hp;
      const result = applyAttackDamage(u.ref, target.ref, skill, random);
      const logIndex = log.length;
      addLog(u.name + ' · ' + skill.name + ' → ' + target.name + (result.hit ? ' -' + result.hpDmg + ' HP' : ' 闪避'));
      const down = target.ref.hp <= 0;
      if (down) {
        dispatchClock(state, { type: 'exitUnit', unitId: id, cause: 'down' });
        addLog(target.name + (target.side === 'hero' ? ' 倒地' : ' 死亡'));
      }
      return { targetId: id, ...result, hpBefore, hpAfter: target.ref.hp, maxHp: target.ref.maxHp, down, side: target.side, logIndex, logEnd: log.length };
    });
    if (!hits.length) addLog(u.name + ' · ' + skill.name + '：未命中敌方（阻挡或空范围）');
    return { ok: true, hits, query, casterId: u.id, skill, aim: { ...aim }, facing: p.facing, mpCost: skill.cost || 0, actionCost, logFrom, logTo: log.length };
  }

  function endAction() {
    const id = currentId();
    if (!id || state.combatState.clock.terminal) return snapshot();
    dispatchClock(state, { type: 'endAction', unitId: id });
    return advance();
  }

  function enemySkills() {
    return actor().skills.filter(s => s.actionCost && s.actionCost.main === 1 && (s.cost || 0) <= actor().ref.mp && ['单体', '直线', '扇形', '圆形', '全域', '爆炸'].includes(s.range?.type)).concat(BASIC_ATTACK);
  }
  // 敌方决策（只读）：与 runEnemyTurn 同一 AI 与同一合法性查询；执行仍走 move/attack/endAction 同一命令
  function planEnemyAction() {
    if (!actor() || actor().side !== 'enemy' || state.combatState.clock.terminal || !resources) return null;
    return chooseEnemyAction(ctx, currentId(), resources.moveRemaining, enemySkills());
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
    previewAttack, attack, endAction, planEnemyAction, runEnemyTurn, reset };
}
