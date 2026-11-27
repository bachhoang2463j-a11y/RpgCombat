import assert from 'node:assert/strict';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { parseSkill } from '../../../tactics/src/parser.mjs';

const p = (col, row = 4) => ({ col, row, facing: 0 });
const aim = (col, row, id) => ({ x: col + 0.5, y: row + 0.5, targetId: id });
const wall = (col, row = 0, height = 12) => ({ id: 'wall', kind: 'wall', bounds: { col, row, width: 1, height } });
function unit(id, side, { level, isWise, skills = [], footprint = { width: 1, height: 1 }, ...ref } = {}) {
  return { id, name: id, side, level, isWise, footprint, controller: side === 'enemy' ? 'ai' : 'player', skills, items: [], attrTags: [],
    ref: { hp: 100, maxHp: 100, mp: 30, maxMp: 30, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 100,
      evasion: 0, perception: 50, moveDistance: 6, strength: 10, totalWeight: 40, ...ref } };
}
function group(fn) {
  return { run() {
    const cases = [];
    fn((id, test) => { try { test(); cases.push({ id, pass: true, detail: '' }); }
      catch (e) { cases.push({ id, pass: false, detail: e.stack }); } });
    return { cases };
  } };
}

export function phase4Groups({ createBattle, parseSkill }) {
  function setup(units, placementsById, objects = []) {
    const scene = { sceneId: 'phase4-room', grid: { columns: 22, rows: 12, metersPerCell: 1 }, objects };
    const b = createBattle({ units, placementsById, scene, random: () => 0.5 });
    b.start(); return b;
  }
  const shot = parseSkill('【试枪】[枪击;power:10][必中][远程][范围:单体;射程:16]');
  const kill = parseSkill('【收尾】[枪击;power:200][必中][远程][范围:单体;射程:16]');
  const heal = parseSkill('【抬血】[回复;power:1][范围:自身]');
  const blast = parseSkill('【爆发】[火焰;power:30][MP:2][必中][法术][Charge:1][范围:爆炸;射程:12;半径:2]');
  const beam = parseSkill('【直线】[切割;power:30][必中][法术][Charge:1][范围:直线;长:12;宽:1]');
  const charge = b => b.snapshot().units.find(u => u.id === 'e').charge;
  const order = (b, id = 'e') => b.snapshot().focusOrders[id];
  const advanceTo = (b, id) => {
    for (let i = 0; i < b.ctx.units.length * 2 && b.snapshot().currentId !== id; i++) b.endAction();
    assert.equal(b.snapshot().currentId, id);
  };
  return {
    'PHASE4-FOCUS': group(test => {
      test('仅显式精英/首领或智慧发号，严格低于30%，高墙挡观察', () => {
        for (const [hp, level, isWise, objects, marked] of [[29, '精英', false, [], true], [30, '首领', false, [], false],
          [29, '杂兵', true, [], true], [29, undefined, false, [], false], [29, '首领', false, [wall(4)], false]]) {
          const b = setup([unit('e', 'enemy', { level, isWise, spd: 120 }), unit('h', 'hero', { hp })], { e: p(2), h: p(6) }, objects);
          assert.equal(!!order(b), marked);
        }
      });
      test('感知半径边界、目标按血量/距离/稳定序，三倍传令穿墙但不越半径', () => {
        const b = setup([unit('e', 'enemy', { level: '首领', spd: 120, perception: 10 }), unit('r', 'enemy'), unit('far', 'enemy'),
          unit('near', 'hero', { hp: 29 }), unit('stable', 'hero', { hp: 29 }), unit('outside', 'hero', { hp: 3 })],
        { e: p(2), r: p(8), far: p(9), near: p(4), stable: p(2, 6), outside: p(2, 7) }, [wall(5, 4, 1)]);
        assert.equal(order(b, 'r').targetId, 'near');
        assert.equal(order(b, 'far'), undefined);
        const ev = b.snapshot().events.find(x => x.type === 'focus-issued');
        assert.equal(ev.issuerId, 'e');
        assert.equal(ev.targetId, 'near');
        assert.equal(ev.to.x, 4.5);
        assert.deepEqual(Array.from(ev.receiverIds), ['e', 'r']);
      });
      test('后来的发令不能覆盖既有收报者，只为尚未收令者建立命令', () => {
        const b = setup([unit('e', 'enemy', { level: '精英', spd: 125, perception: 20 }), unit('next', 'enemy', { level: '首领', spd: 115, perception: 20 }),
          unit('r', 'enemy'), unit('far', 'enemy'), unit('h', 'hero', { hp: 23 }), unit('low', 'hero', { hp: 15 })],
        { e: p(2), next: p(10), r: p(7), far: p(18), h: p(4), low: p(12) });
        advanceTo(b, 'next');
        assert.equal(order(b, 'r').targetId, 'h');
        assert.equal(order(b, 'far').targetId, 'low');
        assert.equal(b.snapshot().events.filter(x => x.type === 'focus-issued').length, 2);
      });
      test('有正嘲讽仍优先攻击标记者；抬到30%后解除并回到原选敌', () => {
        const h = unit('h', 'hero', { hp: 29 });
        const b = setup([unit('e', 'enemy', { level: '精英', spd: 120, skills: [shot] }), h, unit('taunt', 'hero', { baseTauntBonus: 200 })],
          { e: p(2), h: p(7), taunt: p(5) });
        assert.equal(b.planEnemyAction().aim.targetId, 'h');
        advanceTo(b, 'h');
        assert.ok(b.attack(heal).ok);
        assert.equal(h.ref.hp, 30);
        assert.equal(order(b), undefined);
        advanceTo(b, 'e');
        assert.equal(b.planEnemyAction().aim.targetId, 'taunt');
      });
      test('步行进入浓雾只记最后可见格；雾中移动不泄露到追击目标', () => {
        const b = setup([unit('e', 'enemy', { level: '精英', spd: 120, perception: 100, skills: [shot] }), unit('h', 'hero', { hp: 28 })],
          { e: p(2), h: p(6) });
        advanceTo(b, 'h');
        b.ctx.regions.push({ id: 'fog', type: 'fog', casterId: 'h', strength: 100, endAt: 1000,
          cells: [{ col: 8, row: 4 }, { col: 9, row: 4 }, { col: 10, row: 4 }] });
        assert.ok(b.move(10, 4).ok);
        assert.equal(order(b).lastSeen.x, 7.5);
        advanceTo(b, 'e');
        const plan = b.planEnemyAction();
        assert.equal(plan.moveTo.col, 7);
        assert.equal(plan.skill, null);
        assert.ok(b.move(7, 4).ok);
        assert.notEqual(b.planEnemyAction().aim?.targetId, 'h');
        b.ctx.regions.splice(0);
        assert.equal(b.planEnemyAction().aim.targetId, 'h');
        assert.equal(order(b).lastSeen.x, 10.5);
      });
      test('同场战斗状态恢复时保留集火，不重复发令；重新开战后检查当下HP', () => {
        const e = unit('e', 'enemy', { level: '精英', spd: 120 }), h = unit('h', 'hero', { hp: 29 });
        const b = setup([e, h], { e: p(2), h: p(6) });
        const resumed = createBattle({ scene: b.ctx.scene, units: b.ctx.units, placementsById: b.ctx.placementsById,
          battleState: structuredClone(b.battleState), random: () => 0.5 });
        resumed.start();
        assert.equal(order(resumed).targetId, 'h');
        assert.ok(!resumed.snapshot().events.some(ev => ev.type === 'focus-issued'));
        h.ref.hp = 30;
        assert.equal(order(resumed), undefined);
      });
      test('目标离场或倒地及发号者死亡清掉收报者命令', () => {
        for (const reason of ['out', 'down', 'issuer']) {
          const h = unit('h', 'hero', { hp: 28 });
          const e = unit('e', 'enemy', { level: '精英', spd: 120, skills: [kill] });
          const b = setup([e, h, unit('r', 'enemy'), unit('other', 'hero')], { e: p(2), h: p(6), r: p(1), other: p(14) });
          assert.ok(order(b, 'r'));
          if (reason === 'out') b.battleState.combatState.clock.units.h.status = 'out';
          if (reason === 'down') assert.ok(b.attack(kill, aim(6, 4, 'h')).ok && h.ref.hp === 0);
          if (reason === 'issuer') {
            advanceTo(b, 'h');
            assert.ok(b.attack(kill, aim(2, 4, 'e')).ok && e.ref.hp === 0);
          }
          assert.equal(order(b, 'r'), undefined);
        }
      });
    }),
    'PHASE4-CHARGE': group(test => {
      test('自然行末充满；爆炸选空地同时覆盖两人，不把单个2×2当成四人', () => {
        const e = unit('e', 'enemy', { spd: 120, skills: [blast] });
        const units = [e, unit('a', 'hero'), unit('b', 'hero'), unit('big', 'hero', { footprint: { width: 2, height: 2 } })];
        const b = setup(units, { e: p(2, 7), a: p(8, 4), b: p(8, 8), big: p(3, 1) });
        assert.equal(charge(b).current, 0);
        b.endAction();
        const state = charge(b);
        assert.equal(state.current, 1);
        assert.equal(state.intent.shape.type, '爆炸');
        assert.equal(state.intent.shape.center.x, 8.5);
        assert.equal(state.intent.shape.center.y, 6.5);
        advanceTo(b, 'e');
        assert.equal(b.planEnemyAction().skill.name, blast.name);
        const result = b.runEnemyTurn();
        const hits = Array.from(result.events.filter(ev => ev.type === 'segment-resolved' && ev.casterId === 'e'), ev => ev.targetId);
        assert.deepEqual(hits.sort(), ['a', 'b']);
        assert.equal(e.ref.mp, 28);
        assert.equal(charge(b).current, 0);
        assert.equal(charge(b).intent, undefined);
      });
      test('警示固定，玩家离开后实际选点改变并消耗充能', () => {
        const e = unit('e', 'enemy', { spd: 120, skills: [blast] });
        const b = setup([e, unit('h', 'hero')], { e: p(2), h: p(6) });
        advanceTo(b, 'h');
        const before = JSON.stringify(charge(b).intent);
        const original = charge(b).intent.aim;
        assert.ok(b.move(10, 6).ok);
        assert.equal(JSON.stringify(charge(b).intent), before);
        advanceTo(b, 'e');
        const plan = b.planEnemyAction();
        assert.equal(plan.skill.name, blast.name);
        assert.ok(Math.hypot(plan.aim.x - original.x, plan.aim.y - original.y) > 2);
        const release = b.runEnemyTurn().events.find(ev => ev.type === 'charge-released');
        assert.equal(release.aim.x, plan.aim.x);
        assert.equal(release.aim.y, plan.aim.y);
        assert.equal(charge(b).intent, undefined);
      });
      test('直线意向按真实长度和宽度；新位置无合法命中时保留满充不空放', () => {
        const b = setup([unit('e', 'enemy', { spd: 120, skills: [beam], moveDistance: 0 }), unit('h', 'hero', { moveDistance: 16 })],
          { e: p(2), h: p(6) });
        advanceTo(b, 'h');
        const { shape } = charge(b).intent;
        assert.equal(shape.type, '直线');
        assert.equal(shape.length, 12);
        assert.equal(shape.width, 1);
        assert.ok(b.move(20, 4).ok);
        advanceTo(b, 'e');
        assert.ok(!b.runEnemyTurn().events.some(ev => ev.type === 'charge-released'));
        assert.equal(charge(b).current, 1);
        assert.ok(charge(b).intent);
      });
      test('无合法命中点不画；满充但缺MP时仍按普通行动，不转为delay', () => {
        const b = setup([unit('e', 'enemy', { spd: 120, skills: [blast, shot], mp: 0, moveDistance: 0 }), unit('h', 'hero')], { e: p(2), h: p(8) });
        advanceTo(b, 'h');
        assert.ok(charge(b).intent);
        advanceTo(b, 'e');
        assert.equal(b.planEnemyAction().skill.name, shot.name);
        assert.ok(!b.runEnemyTurn().events.some(ev => ev.type === 'charge-released'));
        assert.equal(charge(b).current, 1);
        const c = setup([unit('e', 'enemy', { spd: 120, skills: [blast] }), unit('h', 'hero')], { e: p(2), h: p(8) }, [wall(5)]);
        advanceTo(c, 'h');
        assert.equal(charge(c).current, 1);
        assert.equal(charge(c).intent, undefined);
        const delayed = parseSkill('【准备】[火焰;power:12][延迟:1][范围:单体;射程:10]');
        assert.ok(c.startPreparation(delayed).preparing);
        assert.equal(charge(c).current, 1);
      });
    }),
  };
}

export const groups = phase4Groups({ createBattle, parseSkill });
