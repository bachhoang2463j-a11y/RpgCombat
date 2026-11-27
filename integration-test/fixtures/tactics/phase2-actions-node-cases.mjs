import assert from 'node:assert/strict';
import { createBattle, BASIC_ATTACK } from '../../../tactics/src/battle.mjs';
import { parseSkill } from '../../../tactics/src/parser.mjs';
import { findRiskAwareReachable } from '../../../tactics/src/movement.mjs';

const scene = { sceneId: 'phase2-actions', grid: { columns: 12, rows: 8, metersPerCell: 1 }, objects: [] };
const at = (col, row, facing = 0) => ({ col, row, facing });
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 100;
  return { id, name: id, side, controller: opts.controller || 'player', footprint: opts.footprint || { width: 1, height: 1 },
    skills: opts.skills || [], items: [], attrTags: [], ref: { hp, maxHp: hp, mp: 20, maxMp: 20,
      tp: 0, maxTp: 100, atk: 20, def: 0, spd: opts.spd ?? 100, evasion: 0, perception: opts.perception ?? 100,
      strength: 50, totalWeight: 40, shield: 0, moveDistance: 6, flying: false } };
}
function make(positions, units = [unit('h', 'hero', { spd: 200 }), unit('e', 'enemy')], objects = []) {
  const b = createBattle({ units, placementsById: positions, scene: { ...scene, objects }, random: () => 0.5 });
  b.start(); return b;
}
const chance = result => result.events.filter(e => e.type === 'opportunity-attack').map(e => e.attackerId);
const dodge = name => parseSkill('【' + name + '】[单避;power:900][MP:4][反应:近战][位移:侧闪;距离:3][范围:自身]');
const blink = parseSkill('【折影步】[无][MP:4][法术][行动:辅][位移:闪现;距离:5][范围:自身]');
const point = (col, row) => ({ x: col + 0.5, y: row + 0.5 });
const wall = (col, row) => ({ id: 'wall', kind: 'wall', bounds: { col, row, width: 1, height: 1 } });

export const groups = { 'PHASE2-ACTIONS': { run() {
  const cases = [];
  const test = (id, fn) => { try { fn(); cases.push({ id, pass: true, detail: '' }); }
    catch (e) { cases.push({ id, pass: false, detail: e.stack }); } };

  test('原格按稳定顺序各打一次，回到近处再走不刷新，自然行动才刷新', () => {
    const h = unit('h', 'hero', { spd: 140 }), a = unit('a', 'enemy'), z = unit('z', 'enemy');
    const b = make({ h: at(3, 3), a: at(4, 2), z: at(4, 4) }, [h, z, a]);
    assert.deepEqual(b.previewMove(2, 3).opportunityIds, ['a', 'z']);
    const move = b.move(2, 3);
    assert.deepEqual(chance(move), ['a', 'z']);
    assert.deepEqual(move.opportunities.map(hit => hit.aim.x), [3.5, 3.5]);
    assert.equal(move.moveBefore - move.moveAfter, 1);
    assert.equal(h.ref.hp, 60);
    assert.equal(a.ref.mp, 20);
    b.move(3, 3);
    assert.deepEqual(chance(b.move(2, 3)), []);
    assert.equal(b.endAction().currentId, 'a');
    assert.equal(b.endAction().currentId, 'z');
    assert.equal(b.endAction().currentId, 'h');
    b.move(3, 3);
    assert.deepEqual(chance(b.move(2, 3)), ['a', 'z']);
  });

  test('对 2×2 完整占格边沿检查；贴身绕行与跳出不借机', () => {
    const e = unit('e', 'enemy', { spd: 200 }), h = unit('h', 'hero', { footprint: { width: 2, height: 2 } });
    const b = make({ e: at(3, 3), h: at(4, 2) }, [h, e]);
    assert.deepEqual(chance(b.move(3, 4)), []);
    assert.deepEqual(b.previewMove(2, 4).opportunityIds, ['h']);
    assert.ok(b.jump(1, 4).ok);
    assert.equal(b.snapshot().events.filter(ev => ev.type === 'opportunity-attack').length, 0);
  });

  test('截步倒地不提交离开的一格，只计已走距离', () => {
    const h = unit('h', 'hero', { spd: 200, hp: 10 });
    const b = make({ h: at(3, 3), e: at(5, 4) }, [h, unit('e', 'enemy')]);
    const r = b.move(8, 3);
    assert.equal(r.stopped, true);
    assert.equal(r.cell.cost, 3);
    assert.equal(b.ctx.placementsById.h.col, 6);
    assert.equal(h.ref.hp, 0);
  });

  test('借机中的折影步实际换格会取消旧路线；留原地则继续', () => {
    for (const choice of [null, { col: 3, row: 5 }, { col: 3, row: 6 }]) {
      const h = unit('h', 'hero', { spd: 200, skills: [dodge('折影步')] });
      const b = make({ h: at(3, 3), e: at(4, 3) }, [h, unit('e', 'enemy')]);
      const g = b.beginMove(1, 3);
      const { value: req } = g.next();
      assert.equal(req.type, 'reaction');
      assert.equal(req.responderId, 'h');
      const next = g.next(req.candidates[0]);
      assert.equal(next.value.type, 'teleport');
      assert.ok(next.value.cells.some(c => c.col === 3 && c.row === 5));
      assert.ok(!next.value.cells.some(c => c.row === 6));
      const last = g.next(choice);
      assert.equal(last.done, true);
      const teleported = choice?.row === 5;
      assert.equal(last.value.stopped, teleported);
      assert.equal(last.value.cell.cost, teleported ? 0 : 2);
      assert.equal(b.ctx.placementsById.h.col, teleported ? 3 : 1);
      assert.equal(h.ref.hp, 100);
      assert.equal(h.ref.mp, 16);
      assert.deepEqual(chance(last.value), ['e']);
    }
  });

  test('其他反应单避保留效果和费用，旧侧闪标签不再移动棋子', () => {
    const h = unit('h', 'hero', { spd: 200, skills: [dodge('旧式侧闪')] });
    const b = make({ h: at(3, 3), e: at(4, 3) }, [h, unit('e', 'enemy')]);
    const g = b.beginMove(2, 3);
    const req = g.next().value;
    const end = g.next(req.candidates[0]);
    assert.equal(end.done, true);
    assert.equal(end.value.opportunities[0].hits[0].reaction.shift, null);
    assert.equal(h.ref.hp, 100);
    assert.equal(h.ref.mp, 16);
  });

  test('主动折影步仅走合法可见空地，不扣步数，缺辅点时可用万能代付', () => {
    const h = unit('h', 'hero', { spd: 200, skills: [blink] });
    const b = make({ h: at(1, 3), e: at(1, 4) }, [h, unit('e', 'enemy')], [wall(3, 3)]);
    for (const invalid of [point(1, 4), point(4, 3), point(7, 3)]) assert.equal(b.attack(blink, invalid).ok, false);
    b.ctx.barriers.push({ id: 'border', side: 'enemy', cells: [{ col: 2, row: 2 }] });
    assert.equal(b.attack(blink, point(3, 1)).ok, false);
    assert.equal(h.ref.mp, 20);
    const before = b.snapshot().resources.moveRemaining;
    const first = b.attack(blink, point(1, 1));
    assert.deepEqual(first.teleport.to, { col: 1, row: 1 });
    assert.deepEqual([first.costSummary.aux, first.costSummary.main, first.costSummary.mp], [1, 0, 4]);
    assert.equal(b.attack(blink, point(1, 2)).ok, false);
    b.battleState.combatState.clock.currentAction.resources.universal = 1;
    const second = b.attack(blink, point(1, 2));
    assert.deepEqual([second.costSummary.aux, second.costSummary.main, second.costSummary.universal, second.costSummary.mp], [0, 0, 1, 4]);
    assert.equal(h.ref.mp, 12);
    assert.equal(b.snapshot().resources.moveRemaining, before);
    assert.equal(b.snapshot().events.filter(ev => ev.type === 'opportunity-attack').length, 0);
    const shortSight = make({ h: at(1, 3), e: at(10, 6) }, [unit('h', 'hero', { spd: 200, perception: 10 }), unit('e', 'enemy')]);
    assert.equal(shortSight.previewAttack(blink, point(4, 3)).ok, false);
  });

  test('AI 同一落点可绕开危险，也会保留无路可绕的动作候选', () => {
    const b = make({ h: at(3, 3), e: at(6, 4) }, [unit('h', 'hero'), unit('e', 'enemy', { spd: 200, controller: 'ai' })]);
    const testReach = findRiskAwareReachable(b.ctx, 'e', 6, 1);
    const safe = testReach.byKey.get('1,4');
    assert.ok(safe && !safe.opportunityRisk && safe.cost > 5);
    assert.deepEqual(chance(b.move(1, 4)), []);
    const trapped = make({ h: at(3, 3), e: at(4, 3) }, [unit('h', 'hero'), unit('e', 'enemy', { spd: 200, controller: 'ai' })]);
    const next = trapped.previewMove(6, 3);
    assert.deepEqual(next.opportunityIds, ['h']);
    assert.deepEqual(chance(trapped.move(6, 3)), ['h']);
  });

  test('背袭预测和伤害同口径，普通攻击朝瞄准方向', () => {
    const b = make({ h: at(3, 3, 180), e: at(4, 3, 90) });
    b.ctx.units[1].ref.evasion = 30;
    const aim = { ...point(4, 3), targetId: 'e' };
    const pred = b.predictAttack(BASIC_ATTACK, aim).damagePreview[0];
    assert.equal(pred.backstab, true);
    assert.equal(pred.dodgeCap, 10);
    assert.equal(pred.estimatedHpDmg, 24);
    const hit = b.attack(BASIC_ATTACK, aim).hits[0].segments[0];
    assert.deepEqual([hit.backstab, hit.hpDmg, b.ctx.placementsById.h.facing], [true, 24, 90]);
  });

  return { cases };
} } };
