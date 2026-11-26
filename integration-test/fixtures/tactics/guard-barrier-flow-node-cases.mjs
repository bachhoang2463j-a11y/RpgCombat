import assert from 'node:assert/strict';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { queryAttack } from '../../../tactics/src/range.mjs';
import { fogAt } from '../../../tactics/src/regions.mjs';

export const examples = {};
function fixture() {
  const units = [['h', 'hero', 200], ['a', 'hero', 70], ['e', 'enemy', 100]].map(([id, side, spd]) => ({
    id, name: id, side, controller: 'player', footprint: { width: 1, height: 1 }, skills: [], items: [],
    ref: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, tp: 0, maxTp: 100, atk: 10, def: 0, spd, evasion: 0, moveDistance: 6, perception: 100 },
  }));
  const positions = { h: { col: 5, row: 5 }, a: { col: 6, row: 5 }, e: { col: 10, row: 5 } };
  const scene = { sceneId: 'guard-barrier-flow', grid: { columns: 20, rows: 12, metersPerCell: 1 }, objects: [] };
  const battle = createBattle({ units, placementsById: positions, scene, random: () => 0.5 });
  battle.start();
  return { battle, units, positions };
}
const barrierSkill = { name: '屏障', type: '[肃正:法术]', power: 100, slotTurns: 3, cost: 3,
  range: { type: '圆形', radius: 2 }, actionCost: { main: 1, aux: 0 } };
const attack = { name: '来袭', type: '[伤害]', power: 20, guaranteedHit: true, damageType: '法术',
  range: { type: '全域' }, actionCost: { main: 1, aux: 0 } };
function turn(battle, id) {
  for (let i = 0; i < 40 && battle.snapshot().currentId !== id; i++) battle.endAction();
  assert.equal(battle.snapshot().currentId, id);
}
function run() {
  const cases = [];
  function test(id, body) {
    try { body(); cases.push({ id, pass: true }); }
    catch (error) { cases.push({ id, pass: false, detail: error.stack }); }
  }
  test('TG-FLOW-01 副槽取值、创建费用及稳定法术金色', () => {
    const { battle, units } = fixture();
    const skill = { ...barrierSkill, type: '[回复]', power: 5, type2: '[肃正:法术]', power2: 90, slotTurns2: 2 };
    const result = battle.attack(skill);
    assert.equal(result.ok, true);
    const barrier = battle.ctx.barriers[0];
    assert.equal(barrier.maxIntegrity, 90);
    assert.equal(barrier.endAt, null);
    assert.equal(barrier.visualIdentity, 'gold');
    assert.equal(units[0].ref.mp, 97);
    assert.equal(result.events.filter(e => e.type === 'barrier-created').length, 1);
    examples.created = result.events.find(e => e.type === 'barrier-created');
  });
  test('TG-FLOW-02 群攻保护两人仅一次整体承伤', () => {
    const { battle, units } = fixture(); battle.attack(barrierSkill); turn(battle, 'e');
    const result = battle.attack(attack);
    const hits = result.events.filter(e => e.type === 'barrier-damaged');
    assert.equal(hits.length, 1);
    assert.deepEqual(hits[0].protectedTargetIds.slice().sort(), ['a', 'h']);
    assert.equal(hits[0].integrityBefore - hits[0].integrityAfter, 10);
    assert.equal(units[0].ref.hp, 100); assert.equal(units[1].ref.hp, 100);
    assert.equal(new Set(result.hits.map(h => h.segments[0].barrierHitId)).size, 1);
    examples.groupHit = hits[0];
  });
  test('TG-FLOW-03 独立两段各扣一次耐久', () => {
    const { battle } = fixture(); battle.attack(barrierSkill); turn(battle, 'e');
    const result = battle.attack({ ...attack, type2: '[伤害]', power2: 20 });
    const events = result.events.filter(e => e.type === 'barrier-damaged');
    assert.equal(events.length, 2);
    assert.notEqual(events[0].segmentId, events[1].segmentId);
    assert.equal(battle.ctx.barriers[0].integrity, 80);
  });
  test('TG-FLOW-04 击破同段无溢出，下一独立段可以命中', () => {
    const { battle, units } = fixture(); battle.attack({ ...barrierSkill, power: 5 }); turn(battle, 'e');
    const result = battle.attack({ ...attack, type2: '[伤害]', power2: 20 });
    assert.equal(result.events.filter(e => e.type === 'barrier-damaged').length, 1);
    for (const unit of units.slice(0, 2)) assert.equal(unit.ref.hp, 80);
    const event = result.events.find(e => e.type === 'barrier-damaged');
    assert.equal(event.broken, true); assert.equal(event.noOverflow, true);
    assert.equal(result.events.find(e => e.type === 'barrier-removed').reason, 'broken');
    examples.broken = event;
  });
  test('TG-FLOW-05 空结界通过正式查询与攻击接口承伤', () => {
    const { battle, positions } = fixture(); battle.attack(barrierSkill); const barrier = battle.ctx.barriers[0];
    positions.h.col = 1; positions.a.col = 2; turn(battle, 'e');
    const skill = { ...attack, range: { type: '单体', castRange: 15 } };
    const query = queryAttack(battle.ctx, 'e', skill, { barrierId: barrier.id });
    assert.equal(query.ok, true); assert.deepEqual(query.actualTargetIds, []);
    assert.equal(battle.queryBarrierTargets(skill).length, 1);
    const result = battle.attack(skill, { barrierId: barrier.id });
    assert.equal(result.ok, true);
    assert.equal(result.events.filter(e => e.type === 'barrier-damaged').length, 1);
    assert.equal(barrier.integrity, 90);
    examples.directTarget = query;
  });
  test('TG-FLOW-06 槽减益被阻挡并提供明确原因', () => {
    const { battle } = fixture(); battle.attack(barrierSkill); turn(battle, 'e');
    const result = battle.attack({ ...attack, type: '[弱攻]', type2: '[降防]', power2: 10 });
    assert.equal(battle.buffsOf('h').some(b => ['atk', 'def'].includes(b.type)), false);
    const events = result.events.filter(e => e.type === 'barrier-blocked');
    assert.equal(events.length, 4);
    assert.ok(events.every(e => e.reason === 'barrier-debuff'));
    examples.debuffBlocked = events[0];
  });
  test('TG-FLOW-07 敌对场地局部隔绝，外围正常，源在内部不阻挡', () => {
    const { battle, positions } = fixture(); battle.attack(barrierSkill); turn(battle, 'e');
    const fog = { ...attack, name: '雾', type: '[致盲]', power: 40, slotTurns: 5, affectsAll: true,
      range: { type: '爆炸', radius: 5, castRange: 15 }, regionEffect: { type: 'fog' } };
    const result = battle.attack(fog, { x: 6.5, y: 5.5 });
    assert.equal(result.ok, true); assert.equal(battle.ctx.regions.length, 1);
    assert.equal(fogAt(battle.ctx, 'h').strength, 0); assert.equal(fogAt(battle.ctx, 'e').strength, 40);
    assert.ok(result.events.some(e => e.type === 'barrier-blocked' && e.reason === 'barrier-field'));
    positions.h.col = 9;
    assert.equal(fogAt(battle.ctx, 'h').strength, 40);
    battle.ctx.regions[0].source.placement = { col: 6, row: 5 };
    positions.h.col = 5;
    assert.equal(fogAt(battle.ctx, 'h').strength, 40);
  });
  test('TG-FLOW-08 显式一回合屏障推进时钟后仍永久存在', () => {
    const { battle } = fixture(); const result = battle.attack({ ...barrierSkill, slotTurns: 1 });
    const barrier = battle.ctx.barriers[0];
    for (let i = 0; i < 40; i++) battle.endAction();
    assert.ok(battle.snapshot().now > barrier.createdAt + 1000);
    assert.equal(barrier.endAt, null);
    assert.equal(battle.ctx.barriers[0].id, barrier.id);
    assert.equal(battle.snapshot().events.some(e => e.type === 'barrier-removed' && e.reason === 'expired'), false);
    assert.equal(result.events.find(e => e.type === 'barrier-created').barrier.integrity, 100);
  });
  test('TG-FLOW-09 同施术者替换身份与旧快照保真', () => {
    const { battle } = fixture(); const first = battle.attack(barrierSkill); battle.endAction(); turn(battle, 'h');
    const second = battle.attack({ ...barrierSkill, power: 80 });
    assert.equal(battle.ctx.barriers.length, 1);
    assert.notEqual(first.events.find(e => e.type === 'barrier-created').barrierId, battle.ctx.barriers[0].id);
    assert.equal(second.events.find(e => e.type === 'barrier-removed').reason, 'replaced');
    assert.equal(first.events.find(e => e.type === 'barrier-created').barrier.integrity, 100);
  });
  test('TG-FLOW-10 正式结束、重开与销毁清理保留原因', () => {
    const { battle } = fixture(); battle.attack(barrierSkill);
    const finished = battle.finishBattle(); assert.equal(battle.ctx.barriers.length, 0);
    assert.ok(finished.events.some(e => e.reason === 'battle-ended'));
    const oldRun = battle.snapshot().runId; battle.reset(); assert.notEqual(battle.snapshot().runId, oldRun);
    battle.attack(barrierSkill);
    const reset = battle.reset(); assert.ok(reset.resetEvents.some(e => e.reason === 'reset'));
    battle.attack(barrierSkill);
    assert.ok(battle.destroy().events.some(e => e.reason === 'destroyed'));
    assert.equal(battle.ctx.barriers.length, 0);
  });
  return { cases };
}
export const groups = { 'TG-FLOW': { run } };
