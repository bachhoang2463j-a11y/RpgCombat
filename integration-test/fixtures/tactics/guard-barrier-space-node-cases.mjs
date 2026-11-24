import assert from 'node:assert/strict';
import { compileScene } from '../../../tactics/src/scene.mjs';
import { previewBarrier, createBarrier, expireBarriers, clearBarriers, damageBarrier, interception, barrierCrossing, barrierContact } from '../../../tactics/src/barriers.mjs';
import { createFogRegion, fogAt } from '../../../tactics/src/regions.mjs';
import { canSeePoint } from '../../../tactics/src/perception.mjs';
import { queryAttack } from '../../../tactics/src/range.mjs';
import { chooseEnemyAction } from '../../../tactics/src/ai.mjs';
import { findJumpPath } from '../../../tactics/src/movement.mjs';

function ctxOf() {
  const units = [ ['h', 'hero', 5, 5], ['e', 'enemy', 0, 5], ['a', 'hero', 6, 5] ].map(([id, side]) => ({ id, side, footprint: { width: 1, height: 1 }, ref: { hp: 100, maxHp: 100, atk: 30, def: 0, perception: 100, moveDistance: 0 } }));
  return { compiled: compileScene({ sceneId: 'guard-space', grid: { columns: 16, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects: [] }), units,
    placementsById: { h: { col: 5, row: 5 }, e: { col: 0, row: 5 }, a: { col: 6, row: 5 } },
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])), barriers: [], regions: [], now: () => 200, buffsOf: () => [], carriedUnitIds: new Set() };
}
const ward = { name: '副槽肃正', type: '[伤害]', power: 999, type2: '[肃正:法术]', power2: 120, slotTurns2: 5, barrierArmor: 10, range: { type: '圆形', radius: 2 } };
const attack = { name: '攻击', type: '[伤害]', power: 80, damageType: '远程', range: { type: '单体', castRange: 12 } };
function run() {
  const cases = [];
  function test(id, fn) { try { fn(); cases.push({ id, pass: true, detail: '' }); } catch (e) { cases.push({ id, pass: false, detail: e.stack }); } }
  test('GB-SPACE actual slot / stable identity / lifetime', () => {
    const ctx = ctxOf(); const p = previewBarrier(ctx, 'h', ward); assert.equal(ctx._barrierSerial, undefined);
    assert.equal(p.barrier.integrity, 120); assert.equal(p.barrier.protectType, '法术'); assert.equal(p.barrier.visualIdentity, 'gold');
    assert.equal(p.barrier.createdAt, 200); assert.equal(p.barrier.endAt, 700); assert.equal(p.barrier.boundary.radius, 2);
    const first = createBarrier(ctx, 'h', ward); const second = createBarrier(ctx, 'h', ward);
    assert.notEqual(first.barrier.id, second.barrier.id); assert.equal(second.replaced[0].id, first.barrier.id);
    second.replaced[0].integrity = 1; assert.equal(first.barrier.integrity, 120);
    assert.equal(expireBarriers(ctx, 699).length, 0); assert.equal(expireBarriers(ctx, 700).length, 1);
    const forever = createBarrier(ctx, 'h', { ...ward, slotTurns2: Infinity }); assert.equal(forever.barrier.endAt, null);
    assert.equal(expireBarriers(ctx, Infinity).length, 0); assert.equal(clearBarriers(ctx).length, 1);
    for (const [kind, color] of [['近战', 'white'], ['远程', 'blue']]) assert.equal(previewBarrier(ctx, 'h', { ...ward, type2: `[肃正:${kind}]` }).barrier.visualIdentity, color);
  });
  test('GB-SPACE durable result / no overflow / complete snapshots', () => {
    const ctx = ctxOf(); const b = createBarrier(ctx, 'h', ward).barrier;
    const hit = damageBarrier(ctx, b.id, 80, { incomingType: '法术' });
    assert.equal(hit.rawDamage, 80); assert.equal(hit.resistedDamage, 40); assert.equal(hit.armorDamage, 10); assert.equal(hit.actualLoss, 30);
    assert.equal(hit.barrierBefore.integrity, 120); assert.equal(hit.barrierAfter.integrity, 90); assert.equal(hit.noOverflow, true);
    const broken = damageBarrier(ctx, b.id, 1000); assert.equal(broken.actualLoss, 90); assert.equal(broken.broken, true); assert.equal(ctx.barriers.length, 0);
    assert.equal(hit.barrierAfter.integrity, 90);
  });
  test('GB-SPACE source snapshot and enemy whole trajectory', () => {
    const ctx = ctxOf(); const b = createBarrier(ctx, 'h', ward).barrier;
    const source = { side: 'enemy', placement: { col: 0, row: 5 }, footprint: { width: 1, height: 1 } };
    ctx.placementsById.e = { col: 5, row: 5 }; assert.equal(interception(ctx, 'e', 'a', source).id, b.id); assert.equal(interception(ctx, 'e', 'a'), null);
    assert.equal(interception(ctx, 'e', 'a', { ...source, side: 'hero' }), null);
    assert.equal(barrierCrossing(ctx, 'e', { col: 0, row: 5 }, { col: 10, row: 5 }).id, b.id);
    assert.equal(barrierCrossing(ctx, 'h', { col: 0, row: 5 }, { col: 10, row: 5 }), null);
    assert.equal(barrierCrossing(ctx, 'e', { col: 5, row: 5 }, { col: 6, row: 5 }), null);
    ctx.footprintsById.e = { width: 2, height: 2 };
    assert.equal(barrierCrossing(ctx, 'e', { col: 0, row: 3 }, { col: 10, row: 3 }).id, b.id);
    ctx.placementsById.e = { col: 0, row: 3 }; assert.equal(findJumpPath(ctx, 'e', 10, 3).blockedBy.barrierId, b.id);
  });
  test('GB-SPACE direct empty barrier / normal query / AI', () => {
    const ctx = ctxOf(); const b = createBarrier(ctx, 'h', ward).barrier;
    ctx.placementsById.h = { col: 12, row: 9 }; ctx.placementsById.a = { col: 12, row: 10 };
    const q = queryAttack(ctx, 'e', attack, { barrierId: b.id }); assert.equal(q.ok, true);
    assert.deepEqual(q.actualTargetIds, []); assert.deepEqual(q.barrierTargetIds, [b.id]); assert.deepEqual(q.slotTargets[0].barrierIds, [b.id]);
    assert.deepEqual(q.barrierTargets[0].point, barrierContact(ctx, b, q.origin)); assert.equal(q.collisionPoint.x, 3.5);
    assert.equal(queryAttack(ctx, 'e', { ...attack, range: { type: '单体', castRange: 2 } }, { barrierId: b.id }).ok, false);
    assert.equal(queryAttack(ctx, 'h', attack, { barrierId: b.id }).ok, false);
    const choice = chooseEnemyAction(ctx, 'e', 0, [attack]); assert.equal(choice.aim.barrierId, b.id);
    const normal = queryAttack(ctx, 'e', { ...attack, range: { type: '单体', castRange: 20 } }, { x: 12.5, y: 9.5, targetId: 'h' }); assert.equal(normal.ok, true); assert.deepEqual(normal.actualTargetIds, ['h']);
  });
  test('GB-SPACE fog local isolation / immutable source / shared vision', () => {
    const ctx = ctxOf(); const fog = createFogRegion(ctx, { caster: 'e', skill: { type: '[致盲]', power: 25, slotTurns: 5, range: { type: '爆炸', radius: 8 } }, query: { blastCenter: { x: 5.5, y: 5.5 }, cells: [{ col: 5, row: 5 }, { col: 6, row: 5 }, { col: 0, row: 5 }] } });
    const b = createBarrier(ctx, 'h', ward).barrier; ctx.placementsById.e = { col: 5, row: 5 };
    assert.equal(fog.source.placement.col, 0); assert.equal(fogAt(ctx, 'h').strength, 0); assert.equal(fogAt(ctx, 'a').blockedRegions[0].barrierId, b.id);
    assert.equal(fog.cells.length, 3); assert.equal(canSeePoint(ctx, 'h', { x: 6.5, y: 5.5 }), true);
    fog.source.side = 'hero'; assert.equal(fogAt(ctx, 'h').strength, 25);
    fog.source.side = 'enemy'; fog.source.placement = { col: 5, row: 5 }; assert.equal(fogAt(ctx, 'h').strength, 25);
  });
  return { cases };
}
export const groups = { 'TG-SPACE': { run } };
