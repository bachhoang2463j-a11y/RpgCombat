import assert from 'node:assert/strict';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { parseSkill } from '../../../tactics/src/parser.mjs';

const p = (col, row = 4) => ({ col, row, facing: 0 });
const aim = (col, row = 4) => ({ x: col + 0.5, y: row + 0.5 });
const large = { width: 2, height: 2 };
const obstacle = (id, col, row = 4, kind = 'lowCounter', height = 1) => ({ id, kind, bounds: { col, row, width: 1, height } });
function unit(id, side, { footprint = { width: 1, height: 1 }, level, ...ref } = {}) {
  return { id, name: id, side, level, footprint, controller: side === 'enemy' ? 'ai' : 'player', skills: [], items: [], attrTags: [],
    ref: { hp: 500, maxHp: 500, mp: 30, maxMp: 30, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 100,
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

export function phase3Groups({ createBattle, parseSkill }) {
  function setup(units, placementsById, { sceneId = 'phase3-room', objects = [], random = () => 0.5 } = {}) {
    const scene = { sceneId, grid: { columns: 16, rows: 12, metersPerCell: 1 }, objects };
    const battle = createBattle({ units, placementsById, scene, random });
    battle.start(); return battle;
  }
  const line = (powers, pierce = true) => parseSkill('【破墙试射】' + powers.map(power => `[枪击;power:${power}]`).join('')
    + '[必中][远程]' + (pierce ? '[穿透]' : '') + '[范围:直线;长:12;宽:1]');
  const blast = power => parseSkill(`【破墙爆炸】[火焰;power:${power}][必中][法术][范围:爆炸;射程:12;半径:2]`);
  return {
    'PHASE3-SPACE': group(test => {
      test('非礼拜堂的显式敌方精英／首领首跳付辅、第二跳免费，主行动可穿插，第三跳被拒，下次自然行动刷新', () => {
        for (const level of ['精英', '首领']) {
          const b = setup([unit('boss', 'enemy', { level, footprint: large, spd: 110 }), unit('h', 'hero')], { boss: p(1), h: p(13) });
          assert.equal(b.snapshot().currentId, 'boss');
          const first = b.jump(3, 4);
          assert.ok(first.ok && !first.free);
          assert.equal(b.snapshot().resources.aux, 0);
          assert.ok(b.defend().ok);
          const second = b.jump(5, 4);
          assert.ok(second.ok && second.free);
          assert.equal(b.snapshot().resources.moveRemaining, 6);
          assert.equal(b.jump(7, 4).ok, false);
          assert.equal(b.endAction().currentId, 'h');
          assert.equal(b.endAction().currentId, 'boss');
          assert.ok(b.jump(3, 4).ok);
          assert.equal(b.snapshot().resources.aux, 0);
        }
      });
      test('阵营、显式等级和2×2均是必要条件；外观强度与礼拜堂不放宽', () => {
        for (const [side, level, footprint] of [['hero', '首领', large], ['enemy', '杂兵', large], ['enemy', undefined, large],
          ['enemy', '精英', { width: 2, height: 1 }]]) {
          const b = setup([unit('x', side, { level, footprint, spd: 110, atk: 500 }), unit('peer', side === 'hero' ? 'enemy' : 'hero')],
            { x: p(1), peer: p(13) }, { sceneId: 'sc-chapel' });
          assert.ok(b.jump(3, 4).ok);
          assert.equal(b.jump(5, 4).ok, false);
        }
      });
      test('两次落地震碎相邻低墙；友敌均对抗，超重不动，跳砸撞高墙', () => {
        const objects = [obstacle('first', 2, 3), obstacle('second', 7, 4), obstacle('high', 4, 2, 'wall')];
        const b = setup([unit('boss', 'enemy', { level: '首领', footprint: large, strength: 100, spd: 110 }), unit('h', 'hero'),
          unit('a', 'enemy'), unit('heavy', 'hero', { totalWeight: 150 })],
        { boss: p(1), h: p(4, 3), a: p(3, 6), heavy: p(7, 5) }, { objects });
        const first = b.jump(3, 4);
        assert.ok(first.ok);
        assert.ok(first.breaks.length > 0 && first.breaks.every(c => c.kind && Number.isInteger(c.col) && Number.isInteger(c.row)));
        assert.ok(first.displacements.find(d => d.unitId === 'h').collision);
        assert.ok(first.displacements.some(d => d.unitId === 'a' && d.distance > 0));
        assert.ok(!b.ctx.compiled.objectsIndex.has('first'));
        assert.ok(b.ctx.compiled.objectsIndex.has('second'));
        const second = b.jump(5, 4);
        assert.ok(second.ok && second.free);
        assert.ok(!second.displacements.some(d => d.unitId === 'heavy'));
        assert.equal(b.ctx.scene.objects.length, 1);
        const events = b.snapshot().events;
        assert.ok(events.findIndex(e => e.type === 'obstacle-destroyed') < events.findIndex(e => e.type === 'unit-displaced'));
        assert.equal(events.find(e => e.type === 'obstacle-destroyed').cause, 'landing');
      });
      test('原始伤害固定倍率：100不拆、101拆，与掷骰无关；空地可拆', () => {
        for (const [make, power, destroyed, random] of [[p => line([p]), 100, false, () => 0.99],
          [p => line([p]), 101, true, () => 0], [blast, 100, false, () => 0.99], [blast, 101, true, () => 0]]) {
          const b = setup([unit('h', 'hero', { spd: 110 }), unit('e', 'enemy')], { h: p(2), e: p(13, 10) },
            { objects: [obstacle('low', 5)], random });
          const result = b.attack(make(power), aim(5));
          assert.equal(result.ok, destroyed);
          assert.equal(b.ctx.compiled.objectsIndex.has('low'), !destroyed);
          assert.equal(b.snapshot().resources.main, destroyed ? 0 : 1);
        }
      });
      test('高墙后未覆盖的低墙不拆；爆炸落在高墙前不穿墙', () => {
        for (const skill of [line([200]), blast(200)]) {
          const b = setup([unit('h', 'hero', { spd: 110 }), unit('e', 'enemy')], { h: p(2), e: p(13, 10) },
            { objects: [obstacle('high', 6, 0, 'wall', 12), obstacle('front', 5), obstacle('behind', 7)] });
          assert.ok(b.attack(skill, aim(8)).ok);
          assert.ok(!b.ctx.compiled.objectsIndex.has('front'));
          assert.ok(b.ctx.compiled.objectsIndex.has('behind'));
        }
      });
      test('同一段低墙只拆高墙前的有效格，墙后的同组格保留', () => {
        const b = setup([unit('h', 'hero', { spd: 110 }), unit('e', 'enemy')], { h: p(2), e: p(13, 10) },
          { objects: [obstacle('high', 6, 0, 'wall', 12), { ...obstacle('row', 5), cells: [p(5), p(7)] }] });
        assert.ok(b.attack(line([200]), aim(8)).ok);
        const cells = b.ctx.compiled.objectsIndex.get('row').cells;
        assert.equal(cells.length, 1);
        assert.equal(cells[0].col, 7);
        const ev = b.snapshot().events.find(e => e.type === 'obstacle-destroyed');
        assert.deepEqual([ev.cause, ev.cells.map(c => c.col)], ['attack', [5]]);
      });
      test('同段击破结界不溢入拆墙，下一段才可拆结界内低墙', () => {
        const b = setup([unit('h', 'hero', { spd: 110 }), unit('e', 'enemy')], { h: p(2), e: p(7) },
          { objects: [obstacle('shielded', 6)] });
        b.ctx.barriers.push({ id: 'field', casterId: 'e', side: 'enemy', center: aim(7), radius: 2, armor: 0, integrity: 20,
          cells: [{ col: 6, row: 4 }, { col: 7, row: 4 }] });
        const result = b.attack(line([104, 104]), aim(7));
        assert.ok(result.ok);
        const breaks = result.events.filter(ev => ev.type === 'obstacle-destroyed');
        assert.equal(breaks.length, 1);
        assert.equal(breaks[0].segmentIndex, 2);
        assert.ok(!b.ctx.compiled.objectsIndex.has('shielded'));
      });
      test('同一范围段的每个目标仍享受旧掩护；下一伤害段改读新地形', () => {
        const b = setup([unit('e', 'enemy', { spd: 110 }), unit('a', 'hero'), unit('b', 'hero')],
          { e: p(2), a: p(5), b: p(5, 5) }, { objects: [obstacle('cover', 4, 4, 'lowCounter', 2)] });
        const skill = { ...line([104, 104]), range: { type: '直线', length: 12, width: 4 } };
        const result = b.attack(skill, aim(5));
        assert.ok(result.ok);
        assert.equal(result.hits.length, 2);
        for (const hit of result.hits) {
          assert.equal(hit.segments[0].lowCover, true);
          assert.equal(hit.segments[1].lowCover, false);
          assert.equal(hit.segments[0].hpDmg, 78);
          assert.equal(hit.segments[1].hpDmg, 104);
        }
        const types = Array.from(result.events, e => e.type).filter(t => t === 'obstacle-destroyed' || t === 'segment-resolved');
        assert.deepEqual(types, ['segment-resolved', 'segment-resolved', 'obstacle-destroyed', 'segment-resolved', 'segment-resolved']);
      });
      test('非穿透直线不拆墙，两段60不累加', () => {
        for (const skill of [line([200], false), line([60, 60])]) {
          const b = setup([unit('h', 'hero', { spd: 110 }), unit('e', 'enemy')], { h: p(2), e: p(6) }, { objects: [obstacle('low', 4)] });
          assert.ok(b.attack(skill, aim(6)).ok);
          assert.ok(b.ctx.compiled.objectsIndex.has('low'));
        }
      });
    }),
    'PHASE3-AI': group(test => {
      test('无可达攻击位时正式行动花主点冲刺，留在扩展额度以内', () => {
        const b = setup([unit('h', 'hero'), unit('e', 'enemy', { spd: 110, moveDistance: 1 })], { h: p(10), e: p(2) });
        assert.equal(b.planEnemyAction().action, 'sprint');
        const result = b.runEnemyTurn();
        assert.equal(result.currentId, 'h');
        assert.equal(b.ctx.placementsById.e.col, 4);
        assert.equal(result.log.filter(text => text.includes('冲刺，移动额度')).length, 1);
        assert.equal(result.units.find(u => u.id === 'h').hp, 500);
      });
      test('在正常移动范围内有合法攻击就保留主行动出手', () => {
        const b = setup([unit('h', 'hero'), unit('e', 'enemy', { spd: 110, moveDistance: 2 })], { h: p(6), e: p(2) });
        const plan = b.planEnemyAction();
        assert.notEqual(plan.action, 'sprint');
        assert.ok(plan.moveTo && plan.skill);
        const result = b.runEnemyTurn();
        assert.ok(result.units.find(u => u.id === 'h').hp < 500);
      });
      test('高墙封死且已站到最近可达点，无合法推进不冲刺', () => {
        const b = setup([unit('h', 'hero'), unit('e', 'enemy', { spd: 110, moveDistance: 1 })], { h: p(10), e: p(2) },
          { objects: [obstacle('wall', 3, 0, 'wall', 12)] });
        assert.notEqual(b.planEnemyAction().action, 'sprint');
      });
    }),
  };
}

export const groups = phase3Groups({ createBattle, parseSkill });
