// 暴露与敌方行动：真实 createBattle 回归。
import { createBattle, BASIC_ATTACK } from '../../../tactics/src/battle.mjs';
import { dispatchClock } from '../../../tactics/src/clock.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';

const scene = { sceneId: 'exposure-cases', grid: { columns: 18, rows: 12, metersPerCell: 1 }, ground: {}, objects: [] };
const strike = { ...BASIC_ATTACK, name: '试击', power: 4, guaranteedHit: true, range: { type: '单体', castRange: 8 } };
const kanpo = { name: '看破', isReaction: true, kanpoTarget: 'all', cost: 1, type: '[无]', range: { type: '自身' } };
function unit(id, side, opts = {}) {
  return { id, name: id, side, level: opts.level, controller: opts.controller, footprint: { width: 1, height: 1 }, skills: opts.skills || [], ref: {
    hp: 100, maxHp: 100, mp: opts.mp ?? 30, maxMp: opts.maxMp ?? 30, tp: 0, maxTp: 100,
    atk: 6, def: 0, spd: opts.spd ?? 100, evasion: 20, strength: 50, moveDistance: 4, totalWeight: 40, shield: opts.shield ?? 0,
  } };
}
function make(h, e, pos = { h: { col: 2, row: 4 }, e: { col: 3, row: 4 } }) {
  const b = createBattle({ units: [h, e], placementsById: pos, scene, random: () => 0 });
  b.start(); return b;
}
function until(b, id) { for (let i = 0; i < 12 && b.snapshot().currentId !== id; i++) b.endAction(); }
function aim(b, id) { return { ...unitCenter(b.ctx.placementsById[id], b.ctx.footprintsById[id]), targetId: id }; }
function drive(gen, choose = () => null) { let s = gen.next(); while (!s.done) s = gen.next(choose(s.value)); return s.value; }
const mark = b => b.snapshot().units.find(u => u.id === 'e').exposure;

export function runExposureEnemyCases() {
  const cases = [];
  const check = (id, pass, detail) => cases.push({ id, pass: !!pass, detail: JSON.stringify(detail) });
  {
    const h = unit('h', 'hero', { spd: 300 }); const e = unit('e', 'enemy', { shield: 40 });
    const b = make(h, e);
    const before = b.predictAttack(strike, aim(b, 'e')).damagePreview[0].dodgeCap;
    const first = b.attack(strike, aim(b, 'e'));
    const firstMark = mark(b);
    let refreshed;
    for (let i = 0; i < 4; i++) {
      b.endAction(); until(b, 'h'); b.attack(strike, aim(b, 'e')); refreshed = mark(b);
    }
    b.endAction(); until(b, 'h');
    const after = b.predictAttack(strike, aim(b, 'e')).damagePreview[0].dodgeCap;
    check('EXPOSURE-01 护盾命中加层、四层封顶并续期、预测同步减闪', first.ok && e.ref.shield < 40 && e.ref.hp === 100
      && firstMark?.stacks === 1 && refreshed?.stacks === 4 && refreshed.remaining === 3 && before - after === 19,
    { firstMark, refreshed, before, after, shield: e.ref.shield });
    dispatchClock(b.state, { type: 'applyStun', unitId: 'e' });
    until(b, 'e');
    const afterSkip = mark(b)?.remaining;
    b.endAction(); until(b, 'e'); b.endAction();
    check('EXPOSURE-02 受控跳过也计自身回合，并在第三次结束清除', afterSkip === 2 && !mark(b), { afterSkip, mark: mark(b) });
  }
  for (const threshold of [1, 3]) {
    const incoming = { ...strike, name: '来袭', damageType: '远程', ...(threshold === 3 ? { charge: 2 } : {}) };
    for (const enough of [false, true]) {
      const h = unit('h', 'hero', { skills: [kanpo] });
      const e = unit('e', 'enemy', { spd: 200, controller: 'player' });
      const b = make(h, e);
      const stacks = enough ? threshold + 1 : threshold - 1;
      if (stacks) b.state.combatState.exposure = { e: { stacks, remaining: 3 } };
      let requests = 0;
      const result = drive(b.beginAttack(incoming, aim(b, 'h')), request => {
        if (request.type !== 'kanpo') return null;
        requests++; return { skill: request.candidates[0].skill, responderId: 'h' };
      });
      check(`EXPOSURE-03 看破门槛 ${threshold} 层：${enough ? '足够后支付' : '不足时不弹'}`, result.ok && (enough
        ? requests === 1 && result.canceled && mark(b)?.stacks === 1 && h.ref.mp === 29
        : requests === 0 && !result.canceled && (mark(b)?.stacks || 0) === stacks && h.ref.mp === 30), { requests, mark: mark(b), result: result.reason });
    }
  }
  for (const [level, expected] of [['首领', 3], ['精英', 2], ['杂兵', 1]]) {
    const h = unit('h', 'hero'); const e = unit('e', 'enemy', { level, spd: 200, skills: [strike] });
    const b = make(h, e), id = b.snapshot().currentId;
    b.runEnemyTurn();
    const count = b.snapshot().events.filter(ev => ev.type === 'segment-resolved' && ev.casterId === id).length;
    check(`EXPOSURE-04 ${level}同回合恰好 ${expected} 招`, count === expected, { count });
  }
  {
    const expensive = { ...strike, name: '高耗攻击', power: 25, cost: 40 };
    const h = unit('h', 'hero'); const e = unit('e', 'enemy', { level: '精英', spd: 200, mp: 0, maxMp: 100, skills: [expensive] });
    const b = make(h, e), choice = b.planEnemyAction();
    const defend = b.defend(), gain = b.recoverEnemyMp(), next = b.planEnemyAction();
    const paid = b.snapshot().resources;
    const result = next.skill && b.attack(next.skill, next.aim);
    check('EXPOSURE-05 回蓝点独立于额外技能点，不附带防御或 TP', choice.action === 'recoverMp' && !defend.ok && gain.amount === 50
      && paid.main === 0 && paid.skillMain === 1 && result?.ok && next.skill === expensive && e.ref.mp === 10
      && !b.buffsOf('e').some(buff => buff.type === 'defend'), { choice: choice.action, gain, paid, mp: e.ref.mp, reason: result?.reason });
  }
  return { cases };
}

export const groups = { 'EXPOSURE-ENEMY': { run: runExposureEnemyCases } };
