import assert from 'node:assert/strict';
import { BASIC_ATTACK, createBattle } from '../../../tactics/src/battle.mjs';
import { parseSkill } from '../../../tactics/src/parser.mjs';
import { dispatchClock } from '../../../tactics/src/clock.mjs';
import { cellAt } from '../../../tactics/src/scene.mjs';

const p = (col, row = 4) => ({ col, row, facing: 0 });
const at = (col, row, targetId) => ({ x: col + 0.5, y: row + 0.5, targetId });
function unit(id, side, { classType, level, footprint = { width: 1, height: 1 }, ...ref } = {}) {
  return { id, name: id, side, classType, level, controller: 'player', footprint, skills: [], items: [], attrTags: [],
    ref: { hp: 100, maxHp: 100, mp: 40, maxMp: 40, tp: 0, maxTp: 100, atk: 20, def: 0, spd: 50,
      evasion: 0, perception: 50, moveDistance: 6, strength: 60, totalWeight: 40, ...ref } };
}
function setup(units, placementsById, { objects = [], random = () => 0.5 } = {}) {
  const scene = { sceneId: 'class-batch', grid: { columns: 14, rows: 10, metersPerCell: 1 }, objects };
  const b = createBattle({ scene, units, placementsById, random });
  b.start(); return b;
}
function group(fn) {
  return { run() {
    const cases = [];
    fn((id, test) => { try { test(); cases.push({ id, pass: true, detail: '' }); }
      catch (e) { cases.push({ id, pass: false, detail: e.stack }); } });
    return { cases };
  } };
}
const shot = parseSkill('【试射】[伤害;power:40][必中][远程][行动:辅][范围:单体;射程:12]');
const gather = parseSkill('【回点】[再动;power:1][行动:辅][范围:自身]');
const delay = (n = 2) => parseSkill('【雷鸣】[雷电;power:30][MP:10][TP:10][必中][法术][延迟:' + n + '][范围:单体;射程:8]');

export const groups = {
  'CLASS-SPACE': group(test => {
    test('防守者不限次借机截在原格，保留主辅并可冲刺补步数', () => {
      const h = unit('h', 'hero', { classType: '防守者' }), e = unit('e', 'enemy', { spd: 200, shield: 100 });
      const b = setup([h, e], { h: p(4), e: p(5) });
      const first = b.move(6, 4);
      assert.equal(first.opportunities.length, 1);
      assert.equal(first.stopped, true);
      assert.equal(b.ctx.placementsById.e.col, 5);
      assert.deepEqual([b.snapshot().resources.moveRemaining, b.snapshot().resources.main, b.snapshot().resources.aux], [0, 1, 1]);
      assert.equal(e.ref.hp, 100);
      assert.ok(b.sprint().ok);
      assert.equal(b.move(6, 4).opportunities.length, 1);
      assert.equal(b.snapshot().resources.moveRemaining, 0);
      assert.ok(b.jump(6, 4).ok);
    });
    test('强力反击只有损失HP才击退两格，护盾全挡不退', () => {
      for (const shield of [0, 100]) {
        const h = unit('h', 'hero', { classType: '防守者', evasion: 1000 });
        const e = unit('e', 'enemy', { spd: 200, shield });
        const rolls = [0.5, 0.9, 0, 0];
        const b = setup([h, e], { h: p(5), e: p(4) }, { random: () => rolls.shift() ?? 0.5 });
        const res = b.attack(BASIC_ATTACK, at(5, 4, 'h'));
        assert.ok(res.events.some(x => x.reason === 'power-counter' && x.type === 'reaction-damage'));
        assert.equal(b.ctx.placementsById.e.col, shield ? 4 : 2);
      }
    });
    test('风行者免费首跳不扣辅点，第二跳照常收费', () => {
      const b = setup([unit('h', 'hero', { classType: '风行者', spd: 200 }), unit('e', 'enemy')], { h: p(2), e: p(12) });
      assert.ok(b.jump(4, 4).free);
      assert.equal(b.snapshot().resources.aux, 1);
      assert.equal(b.jump(6, 4).free, false);
      assert.equal(b.snapshot().resources.aux, 0);
      assert.equal(b.jump(8, 4).ok, false);
      const b2 = setup([unit('h', 'hero', { classType: '风行者', spd: 200 }), unit('e', 'enemy')], { h: p(2), e: p(12) });
      b2.defend(); b2.attack(shot, at(12, 4, 'e'));
      assert.deepEqual([b2.snapshot().resources.aux, b2.snapshot().resources.main], [0, 0]);
      assert.ok(b2.jump(4, 4).free);
    });
    test('隐匿免借机，击杀补基础且保留冲刺，主点到账后再次补足', () => {
      const h = unit('h', 'hero', { classType: '隐匿者', spd: 200 });
      const b = setup([h, unit('e', 'enemy', { hp: 1 }), unit('z', 'enemy')], { h: p(5), e: p(6), z: p(12, 7) });
      assert.deepEqual(b.move(3, 4).opportunities, []);
      assert.ok(b.sprint().ok);
      assert.equal(b.snapshot().resources.moveRemaining, 10);
      assert.ok(b.attack(shot, at(6, 4, 'e')).ok);
      assert.deepEqual([b.snapshot().resources.moveRemaining, b.snapshot().resources.sprintRemaining], [12, 6]);
      b.move(2, 4);
      assert.ok(b.attack({ ...gather, actionCost: { main: 1, aux: 0 } }).ok);
      assert.equal(b.snapshot().resources.moveRemaining, 11);
    });
    test('狂战士只推落点八邻域敌人，重量不合格和友军不推', () => {
      const units = [unit('h', 'hero', { classType: '狂战士', spd: 200 }), unit('a', 'hero'),
        unit('e', 'enemy', { strength: 10 }), unit('heavy', 'enemy', { strength: 10, totalWeight: 100 })];
      const b = setup(units, { h: p(2), a: p(4, 5), e: p(5), heavy: p(4, 3) });
      const res = b.jump(4, 4);
      assert.deepEqual(res.displacements.map(x => x.unitId), ['e']);
      assert.equal(b.ctx.placementsById.e.col, 9);
      assert.equal(b.ctx.placementsById.a.row, 5);
      assert.equal(b.ctx.placementsById.heavy.row, 3);
    });
    test('圣职者三格边界护队友，免敌方跳砸及击退但不免伤', () => {
      const units = [unit('c', 'hero', { classType: '圣职者' }), unit('h', 'hero', { strength: 10 }),
        unit('e', 'enemy', { spd: 200, level: '精英', footprint: { width: 2, height: 2 } })];
      const b = setup(units, { c: p(5, 7), h: p(5), e: p(1) });
      assert.equal(b.jump(3, 4).displacements.length, 0);
      assert.ok(b.snapshot().events.some(x => x.type === 'displacement-immune' && x.protectorId === 'c' && x.mode === '跳砸'));
      const skill = parseSkill('【击退】[伤害;power:25][必中][位移:击退;距离:2][范围:单体;射程:4]');
      const res = b.attack(skill, at(5, 4, 'h'));
      assert.ok(res.hits[0].hpDmg > 0);
      assert.equal(res.hits[0].displacement.immune, true);
      assert.equal(b.ctx.placementsById.h.col, 5);
    });
    test('碰低障碍按半伤停在墙前且场景、占格同步去墙', () => {
      const objects = [{ id: 'low', kind: 'lowCounter', bounds: { col: 5, row: 4, width: 1, height: 1 } }];
      const h = unit('h', 'hero', { spd: 200 }), e = unit('e', 'enemy', { strength: 10, totalWeight: 70 });
      const b = setup([h, e], { h: p(3), e: p(4) }, { objects });
      const res = b.push('e');
      assert.deepEqual([res.success, res.movedDistance, res.collision.hpDmg, e.ref.hp], [true, 0, 10, 90]);
      assert.deepEqual(res.collision.broken, [{ col: 5, row: 4, kind: 'lowCounter' }]);
      assert.equal(cellAt(b.ctx.compiled, 5, 4).blocksMovement, false);
      assert.deepEqual(b.ctx.scene.objects, []);
    });
    test('灾厄使推中后额外结算毒火但不修改其时钟', () => {
      const h = unit('h', 'hero', { classType: '灾厄使', spd: 200 }), e = unit('e', 'enemy', { strength: 10 });
      const b = setup([h, e], { h: p(3), e: p(4) });
      const dots = parseSkill('【淬火】[中毒;power:7][燃烧;power:11][Turns:3][必中][范围:单体;射程:4]');
      assert.ok(b.attack(dots, at(4, 4, 'e')).ok);
      const clock = b.battleState.combatState.clock;
      const before = structuredClone(clock.statuses);
      assert.ok(b.push('e').success);
      assert.equal(e.ref.hp, 82);
      assert.deepEqual(clock.statuses, before);
      assert.equal(b.snapshot().events.filter(x => x.type === 'status-tick' && x.extra === '推撞').length, 2);
    });
    test('棱镜中继按显式等级和真实最后一击发放 TP', () => {
      const h = unit('h', 'hero', { classType: '施法者', spd: 200 });
      const b = setup([h, ...[undefined, '精英', '首领'].map((level, i) => unit('e' + i, 'enemy', { hp: 1, level }))],
        { h: p(2), e0: p(4), e1: p(5), e2: p(6) });
      const result = b.attack({ ...shot, range: { type: '直线', length: 8, width: 1 } }, at(7, 4));
      assert.deepEqual(result.events.filter(x => x.passive === '棱镜中继').map(x => x.value), [5, 10, 20]);
      assert.equal(h.ref.tp, 40);
    });
    test('棱镜中继不奖励被复活的致死段，最终击杀才给一次TP', () => {
      const h = unit('h', 'hero', { classType: '施法者', spd: 200 });
      const e = unit('e', 'enemy', { hp: 1, level: '精英', reviveCount: 1 }); e.attrTags.push('[复活]');
      const b = setup([h, e], { h: p(2), e: p(4) });
      const first = b.attack(shot, at(4, 4, 'e'));
      assert.ok(first.events.some(x => x.trigger === 'revive'));
      assert.ok(!first.events.some(x => x.passive === '棱镜中继'));
      const second = b.attack({ ...shot, actionCost: { main: 1, aux: 0 } }, at(4, 4, 'e'));
      assert.equal(second.events.filter(x => x.passive === '棱镜中继').reduce((n, x) => n + x.value, 0), 10);
    });
    test('倒地施法者的在场毒伤仍保留击杀归属', () => {
      const h = unit('h', 'hero', { classType: '施法者', spd: 200 });
      const e = unit('e', 'enemy', { hp: 5, level: '首领' });
      const b = setup([h, e, unit('a', 'hero')], { h: p(2), e: p(4), a: p(2, 6) });
      const poison = parseSkill('【落毒】[中毒;power:7][Turns:3][必中][范围:单体;射程:4]');
      assert.ok(b.attack(poison, at(4, 4, 'e')).ok);
      h.ref.hp = 0;
      dispatchClock(b.battleState, { type: 'exitUnit', unitId: 'h', cause: 'down' });
      for (let i = 0; i < 10 && e.ref.hp > 0; i++) b.endAction();
      assert.equal(e.ref.hp, 0);
      assert.equal(h.ref.tp, 25);
      assert.ok(b.snapshot().events.some(x => x.passive === '棱镜中继' && x.unitId === 'h' && x.value === 20));
    });
  }),
  'CLASS-CHARGE': group(test => {
    for (const n of [1, 2]) test('驻足优先：delay=' + n + ' 触发回响且同回合可选点', () => {
      const h = unit('h', 'hero', { classType: '施法者', spd: 200, tp: 10 });
      const e = unit('e', 'enemy'), b = setup([h, e], { h: p(2), e: p(6) }, { random: () => 0 });
      const skill = delay(n), declared = b.startPreparation(skill, { stationary: true });
      assert.ok(declared.charge.ready);
      assert.equal(b.snapshot().preparation.aim, undefined);
      assert.deepEqual([declared.costSummary.main, declared.costSummary.mp, declared.costSummary.tp, declared.costSummary.movement], [1, 10, 10, 6]);
      assert.equal(e.ref.hp, 100);
      assert.equal(b.snapshot().chargeInventory, n === 1 ? 1 : 0);
      assert.ok(b.canUseSkill(skill).ok);
      const release = b.attack(skill, at(6, 4, 'e'));
      assert.ok(release.ok && release.hits[0].hpDmg > 0);
      assert.equal(release.costSummary.mp, 0);
      assert.equal(h.ref.mp, 30);
      assert.equal(h.ref.tp, 20);
    });
    test('移动不足拒绝驻足且不收费，冲刺补足可用，声明不用合法瞄准', () => {
      const b = setup([unit('h', 'hero', { classType: '施法者', spd: 200, tp: 10 }), unit('e', 'enemy')], { h: p(3), e: p(12) });
      b.move(2, 4);
      const skill = delay();
      const st = b.stationaryStatus();
      assert.ok(st.available && !st.ok && /驻足需满额移动/.test(st.reason));
      assert.equal(b.startPreparation(skill, { stationary: true }).ok, false);
      assert.equal(b.snapshot().units[0].mp, 40);
      assert.equal(b.snapshot().resources.main, 1);
      b.attack(gather); b.sprint();
      assert.ok(b.canStationaryPrepare());
      assert.ok(b.stationaryStatus().ok);
      const declared = b.attack(skill, at(99, 99), { stationary: true });
      assert.ok(declared.preparing && !declared.charge.ready);
      assert.equal(declared.costSummary.movement, 11);
      assert.equal(b.snapshot().resources.moveRemaining, 0);
    });
    test('玩家跨回合主动继续才扣资源，随后获得主点自动准备', () => {
      const h = unit('h', 'hero', { classType: '施法者', spd: 300, tp: 10 });
      const b = setup([h, unit('e', 'enemy', { spd: 1 })], { h: p(2), e: p(6) });
      b.startPreparation(delay(3));
      b.endAction();
      assert.deepEqual([b.snapshot().preparation.remaining, b.snapshot().resources.main], [3, 1]);
      assert.equal(b.advancePreparation({ stationary: true }).remaining, 1);
      b.attack(gather);
      assert.ok(b.snapshot().preparation.ready);
      assert.equal(b.snapshot().resources.main, 0);
    });
    test('未选择继续而结束自然行动，弃掉准备但不退费用', () => {
      const h = unit('h', 'hero', { spd: 300, tp: 10 });
      const b = setup([h, unit('e', 'enemy', { spd: 1 })], { h: p(2), e: p(6) });
      b.startPreparation(delay()); b.endAction();
      assert.ok(b.snapshot().preparation);
      b.endAction();
      assert.equal(b.snapshot().preparation, null);
      assert.equal(h.ref.mp, 30);
    });
  }),
};
