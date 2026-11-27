import assert from 'node:assert/strict';
import { compileScene } from '../../../tactics/src/scene.mjs';
import { queryAttack, spatialAttackModifiers } from '../../../tactics/src/range.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';

const at = (col, row, facing = 0) => ({ col, row, facing });
const aimAt = (col, row, targetId) => ({ x: col + 0.5, y: row + 0.5, targetId });
const terrain = (kind, col, row) => ({ id: kind + col + row, kind, bounds: { col, row, width: 1, height: 1 } });
function unit(id, side, width = 1) {
  return { id, name: id, side, footprint: { width, height: width }, skills: [], items: [],
    ref: { hp: 100, maxHp: 100, mp: 20, maxMp: 20, atk: 20, def: 0, spd: 100, evasion: 0, perception: 50, moveDistance: 6 } };
}
function scene(objects) { return { sceneId: 'phase2-space', grid: { columns: 14, rows: 12, metersPerCell: 1 }, objects }; }
function ctx(objects, units, placements) {
  return { compiled: compileScene(scene(objects)), units, placementsById: placements,
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])), barriers: [] };
}
const shot = { name: '直射', range: { type: '单体', castRange: 12 }, damageType: '远程', type: '[伤害]', power: 0 };
const line = { ...shot, range: { type: '直线', length: 12, width: 1 } };
const blast = { ...shot, range: { type: '爆炸', castRange: 12, radius: 2 } };

export const groups = { 'PHASE2-SPACE': { run() {
  const cases = [];
  const test = (id, fn) => { try { fn(); cases.push({ id, pass: true, detail: '' }); }
    catch (e) { cases.push({ id, pass: false, detail: e.stack }); } };

  test('双方远程直射略过同伴，前排敌人照挡；爆炸投射仍碰同伴', () => {
    for (const side of ['hero', 'enemy']) {
      const enemy = side === 'hero' ? 'enemy' : 'hero';
      const c = ctx([], [unit('c', side), unit('a', side), unit('t', enemy)], { c: at(1, 3), a: at(3, 3), t: at(6, 3) });
      assert.deepEqual(queryAttack(c, 'c', shot, aimAt(6, 3, 't')).damageTargetIds, ['t']);
      assert.equal(queryAttack(c, 'c', blast, aimAt(6, 3, 't')).contact.unitId, 'a');
      c.units.push(unit('e', enemy)); c.placementsById.e = at(4, 3);
      assert.equal(queryAttack(c, 'c', shot, aimAt(6, 3, 't')).blockedBy.unitId, 'e');
    }
  });

  test('贯穿同时覆盖两名敌人，直到高墙；友军不受伤也不截断弹道', () => {
    const units = [unit('h', 'hero'), unit('a', 'hero'), ...['e1', 'e2', 'e3'].map(id => unit(id, 'enemy'))];
    const c = ctx([terrain('wall', 8, 3)], units, { h: at(1, 3), a: at(2, 3), e1: at(3, 3), e2: at(6, 3), e3: at(9, 3) });
    const q = queryAttack(c, 'h', line, aimAt(9, 3, 'e3'));
    assert.deepEqual(q.damageTargetIds, ['e1', 'e2']);
    assert.equal(q.contact.type, 'wall');
    assert.equal(q.contact.cell.col, 8);
    assert.equal(queryAttack(c, 'h', shot, aimAt(9, 3, 'e3')).blockedBy.type, 'unit');
    c.units.splice(2, 2);
    assert.equal(queryAttack(c, 'h', shot, aimAt(9, 3, 'e3')).blockedBy.type, 'wall');
  });

  test('背袭从正后轴量 ±22.5°，按目标朝向独立判定', () => {
    const c = ctx([], [unit('h', 'hero'), unit('e', 'enemy')], { h: at(2, 5), e: at(8, 5, 67.5) });
    assert.equal(spatialAttackModifiers(c, 'h', 'e', line).backstab, true);
    c.placementsById.e.facing = 67.4;
    assert.equal(spatialAttackModifiers(c, 'h', 'e', shot).backstab, false);
    c.placementsById.e.facing = 90;
    assert.equal(spatialAttackModifiers(c, 'h', 'e', blast).backstab, false);
    assert.equal(spatialAttackModifiers(c, 'e', 'h', shot).backstab, false);
  });

  test('低墙只护贴墙玩家；要求射线经过，不受朝向影响，近战和爆炸不减', () => {
    const c = ctx([terrain('lowCounter', 3, 5)], [unit('h', 'hero'), unit('e', 'enemy')], { h: at(2, 5), e: at(8, 5, 90) });
    assert.equal(spatialAttackModifiers(c, 'e', 'h', shot).lowCover, true);
    assert.equal(spatialAttackModifiers(c, 'e', 'h', { ...line, damageType: '法术' }).lowCover, true);
    assert.equal(spatialAttackModifiers(c, 'e', 'h', { ...shot, damageType: '近战' }).lowCover, false);
    assert.equal(spatialAttackModifiers(c, 'e', 'h', blast).lowCover, false);
    c.placementsById.h.facing = 270;
    assert.equal(spatialAttackModifiers(c, 'e', 'h', shot).lowCover, true);
    c.placementsById.e = at(2, 8, 90);
    assert.equal(spatialAttackModifiers(c, 'e', 'h', shot).lowCover, false);
    c.placementsById = { h: at(1, 5), e: at(8, 5, 90) };
    assert.equal(spatialAttackModifiers(c, 'e', 'h', shot).lowCover, false);
    c.placementsById = { h: at(8, 5), e: at(2, 5, 90) };
    assert.equal(spatialAttackModifiers(c, 'h', 'e', shot).lowCover, false);
  });

  test('贴墙预测和实结算都减伤25%，不改命中或射界', () => {
    const h = unit('h', 'hero'), e = unit('e', 'enemy'); e.ref.spd = 200;
    const b = createBattle({ units: [h, e], placementsById: { h: at(2, 5), e: at(8, 5) },
      scene: scene([terrain('lowCounter', 3, 5)]), random: () => 0.5 });
    b.start();
    const aim = aimAt(2, 5, 'h'), q = b.predictAttack(shot, aim);
    assert.equal(q.damagePreview[0].lowCover, true);
    assert.equal(q.damagePreview[0].estimatedHpDmg, 15);
    assert.equal(b.attack(shot, aim).hits[0].hpDmg, 15);
  });
  return { cases };
} } };
