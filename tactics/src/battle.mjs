// ==========================================
// MVP 战斗控制器：消费 P03 自然行动，空间查询/扣费/伤害共用一条命令链。
// HP/MP 真值仅在角色 ref；时钟与位置可保存，实时资源和本轮余额不写长期档。
// ==========================================

import { createClock, dispatchClock, advanceToNextAction } from './clock.mjs';
import { emptyBattleState } from './lifecycle.mjs';
import { compileScene } from './scene.mjs';
import { findReachable } from './movement.mjs';
import { queryAttack } from './range.mjs';
import { applyAttackDamage } from './damage.mjs';
import { chooseEnemyAction } from './ai.mjs';

export const BASIC_ATTACK = {
  name: '普通攻击', power: 0, hit: 100, cost: 0,
  range: { type: '单体', castRange: 2 }, actionCost: { main: 1, aux: 0 },
};

export function createBattle({ units, placementsById, scene, battleState, random = Math.random }) {
  const state = battleState || emptyBattleState(scene.sceneId, 'demo');
  const opening = {
    positions: structuredClone(placementsById),
    resources: units.map(u => ({ id: u.id, hp: u.ref.hp, mp: u.ref.mp })),
  };
  const ctx = {
    compiled: compileScene(scene), units, placementsById,
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])),
  };
  let resources = null;
  let log = [];
  const byId = new Map(units.map(u => [u.id, u]));
  const currentId = () => state.combatState.clock?.currentAction?.unitId || null;
  const actor = () => byId.get(currentId());

  function addLog(text) { log.push(text); }
  function initClock() {
    createClock(state, units.map(u => ({ id: u.id, side: u.side, name: u.name, baseSpd: u.ref.spd })), {
      speedOf: id => Math.max(0, byId.get(id).ref.spd),
    });
    units.filter(u => u.ref.hp <= 0).forEach(u => dispatchClock(state, { type: 'exitUnit', unitId: u.id, cause: 'down' }));
  }

  function checkEnd() {
    const heroesAlive = units.some(u => u.side === 'hero' && u.ref.hp > 0);
    const enemiesAlive = units.some(u => u.side === 'enemy' && u.ref.hp > 0);
    const type = !heroesAlive ? 'defeat' : !enemiesAlive ? 'victory' : null;
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
      return snapshot();
    }
    return advance();
  }

  function snapshot() {
    const clock = state.combatState.clock;
    return {
      now: clock?.now || 0, currentId: currentId(), resources: resources ? { moveRemaining: resources.moveRemaining, main: resources.main, aux: resources.aux } : null,
      terminal: clock?.terminal ? { ...clock.terminal } : null,
      units: units.map(u => ({ id: u.id, hp: u.ref.hp, mp: u.ref.mp, status: u.ref.hp > 0 ? 'active' : u.side === 'hero' ? 'down' : 'dead' })),
      positions: structuredClone(placementsById), log: log.slice(),
    };
  }

  function reachable() {
    return actor() && resources ? findReachable(ctx, currentId(), resources.moveRemaining) : { cells: [], byKey: new Map() };
  }
  function previewMove(col, row) {
    return reachable().cells.find(c => c.col === col && c.row === row) || null;
  }
  function move(col, row) {
    if (!resources || state.combatState.clock.terminal) return { ok: false, reason: '当前不能移动' };
    const cell = previewMove(col, row);
    if (!cell || cell.cost === 0) return { ok: false, reason: '落点不可达' };
    const p = placementsById[currentId()];
    const last = cell.path[cell.path.length - 2] || p;
    p.facing = ((Math.atan2(col - last.col, -(row - last.row)) * 180 / Math.PI) + 360) % 360;
    p.col = col; p.row = row;
    resources.moveRemaining = Math.max(0, resources.moveRemaining - cell.cost);
    addLog(actor().name + ' 移动 ' + cell.cost.toFixed(2) + 'm');
    return { ok: true, cell };
  }

  function previewAttack(skill, aim) {
    if (!actor() || !resources || state.combatState.clock.terminal) return { ok: false, reason: '当前不能攻击', cells: [], targetIds: [] };
    if (resources.main < 1) return { ok: false, reason: '主行动已用完', cells: [], targetIds: [] };
    if (actor().ref.mp < (skill.cost || 0)) return { ok: false, reason: 'MP 不足', cells: [], targetIds: [] };
    return queryAttack(ctx, currentId(), skill, aim);
  }
  function attack(skill, aim) {
    const query = previewAttack(skill, aim);
    if (!query.ok) return { ok: false, reason: query.reason, query };
    const u = actor();
    resources.main -= 1;
    u.ref.mp -= skill.cost || 0;
    const p = placementsById[u.id];
    p.facing = ((Math.atan2(aim.x - query.origin.x, -(aim.y - query.origin.y)) * 180 / Math.PI) + 360) % 360;
    const hits = query.targetIds.map(id => {
      const target = byId.get(id);
      const result = applyAttackDamage(u.ref, target.ref, skill, random);
      addLog(u.name + ' · ' + skill.name + ' → ' + target.name + (result.hit ? ' -' + result.hpDmg + ' HP' : ' 闪避'));
      if (target.ref.hp <= 0) {
        dispatchClock(state, { type: 'exitUnit', unitId: id, cause: 'down' });
        addLog(target.name + (target.side === 'hero' ? ' 倒地' : ' 死亡'));
      }
      return { targetId: id, ...result };
    });
    if (!hits.length) addLog(u.name + ' · ' + skill.name + '：未命中敌方（阻挡或空范围）');
    return { ok: true, hits, query, casterId: u.id };
  }

  function endAction() {
    const id = currentId();
    if (!id || state.combatState.clock.terminal) return snapshot();
    dispatchClock(state, { type: 'endAction', unitId: id });
    return advance();
  }

  function enemySkills() {
    return actor().skills.filter(s => s.actionCost?.main === 1 && (s.cost || 0) <= actor().ref.mp && ['单体', '直线', '扇形'].includes(s.range?.type)).concat(BASIC_ATTACK);
  }
  function runEnemyTurn() {
    if (!actor() || actor().side !== 'enemy' || state.combatState.clock.terminal) return snapshot();
    const choice = chooseEnemyAction(ctx, currentId(), resources.moveRemaining, enemySkills());
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
    resources = null; log = [];
    return start();
  }

  return { ctx, battleState: state, start, snapshot, reachable, previewMove, move, previewAttack, attack, endAction, runEnemyTurn, reset };
}
