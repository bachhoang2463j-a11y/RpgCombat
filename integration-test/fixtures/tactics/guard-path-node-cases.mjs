import assert from 'node:assert/strict';
import { previewGuard } from '../../../tactics/src/guard.mjs';
import { compileScene } from '../../../tactics/src/scene.mjs';
import { canPlaceAt, cellsAdjacent, findReachable } from '../../../tactics/src/movement.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';

function makeCtx(positions = { g: [3, 4], t: [4, 4], s: [9, 4] }, footprints = {}) {
  const units = Object.keys(positions).map(id => ({ id, side: id === 's' ? 'enemy' : 'hero',
    ref: { hp: 100, mp: 20 }, footprint: footprints[id] || { width: 1, height: 1 } }));
  return {
    compiled: compileScene({ sceneId: 'guard-test', grid: { columns: 12, rows: 10, metersPerCell: 1 }, objects: [] }),
    units, placementsById: Object.fromEntries(Object.entries(positions).map(([id, [col, row]]) => [id, { col, row, facing: 0 }])),
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])), carriedUnitIds: new Set(), carrying: {}, barriers: [],
  };
}
function block(ctx, col, row) {
  Object.assign(ctx.compiled.cells[row * ctx.compiled.grid.columns + col], { blocksMovement: true, blocksProjectile: true });
}
export const groups = { 'TG-PATH': { run } };
function run() {
const cases = [];
function test(name, check) {
  try { check(); cases.push({ id: 'TG-PATH ' + name, pass: true, detail: '' }); }
  catch (e) { cases.push({ id: 'TG-PATH ' + name, pass: false, detail: e.stack }); }
}
function query(ctx, budget = 6) { return previewGuard(ctx, 'g', 't', 's', budget); }
function checkPath(ctx, q) {
  assert.equal(q.ok, true);
  const cell = findReachable(ctx, 'g', q.maxDistance, ctx.carrying.g ? 2 : 1).byKey.get(q.to.col + ',' + q.to.row);
  assert.deepEqual(q.path, cell.path);
  assert.equal(q.distance, cell.cost);
  assert.ok(q.distance <= q.maxDistance + 1e-9);
  assert.equal(canPlaceAt(ctx, 'g', q.to.col, q.to.row).ok, true);
  assert.equal(cellsAdjacent(q.to, ctx.footprintsById.g, ctx.placementsById.t, ctx.footprintsById.t), true);
}

test('来源侧对齐优先、真实路径、几何字段、查询不修改状态', () => {
  const ctx = makeCtx(), before = structuredClone(ctx);
  const q = query(ctx); checkPath(ctx, q);
  assert.deepEqual(q.to, { col: 5, row: 4, facing: 90 });
  assert.deepEqual(q.origin, { x: 9.5, y: 4.5 });
  assert.deepEqual(q.startPosition, { x: 3.5, y: 4.5 });
  assert.deepEqual(q.contactPoint, { x: 5.5, y: 4.5 });
  assert.deepEqual(ctx, before);
});
test('无来源侧可达点失败，不退化反侧', () => {
  const ctx = makeCtx(); for (const row of [3, 4, 5]) block(ctx, 5, row);
  assert.deepEqual(query(ctx), { ok: false, reason: '攻击来源侧没有可达舍身落点' });
});
test('实体墙隔断路径，即使几何够近也不穿墙', () => {
  const ctx = makeCtx(); for (let row = 0; row < 10; row++) block(ctx, 5, row);
  assert.equal(query(ctx).ok, false);
});
test('两实障夹角不可斜穿', () => {
  const ctx = makeCtx({ g: [3, 3], t: [4, 4], s: [9, 4] });
  for (const [c, r] of [[2, 2], [3, 2], [4, 2], [2, 3], [4, 3], [2, 4], [3, 4]]) block(ctx, c, r);
  assert.equal(query(ctx).ok, false);
});
test('敌方结界阻断来源侧落点、友方结界允许', () => {
  const ctx = makeCtx();
  ctx.barriers.push({ id: 'b', side: 'enemy', cells: [{ col: 5, row: 3 }, { col: 5, row: 4 }, { col: 5, row: 5 }] });
  assert.equal(query(ctx).ok, false);
  ctx.barriers[0].side = 'hero'; checkPath(ctx, query(ctx));
});
test('友方格可经过但不得落点重叠', () => {
  const ctx = makeCtx({ g: [3, 4], t: [4, 4], s: [9, 4], ally: [5, 4] });
  const q = query(ctx); checkPath(ctx, q);
  assert.deepEqual([q.to.col, q.to.row], [5, 3]);
});
test('路径成本并列时row/col稳定排序', () => {
  const ctx = makeCtx(); block(ctx, 5, 4);
  assert.deepEqual([query(ctx).to.col, query(ctx).to.row], [5, 3]);
});
test('原地合法挡位零距离保持站位并更新朝向', () => {
  const ctx = makeCtx({ g: [5, 4], t: [4, 4], s: [9, 4] });
  const q = query(ctx, 1); checkPath(ctx, q);
  assert.equal(q.distance, 0); assert.equal(q.pathDistance, 0);
  assert.deepEqual(q.path, [{ col: 5, row: 4 }]); assert.equal(q.to.facing, 90);
});
test('保护距离取真实footprint世界中心', () => {
  const ctx = makeCtx({ g: [2, 4], t: [4, 4], s: [9, 4] }, { t: { width: 4, height: 2 } });
  assert.equal(query(ctx, 3).reason, '超过舍身保护距离');
  assert.deepEqual(unitCenter(ctx.placementsById.t, ctx.footprintsById.t), { x: 6, y: 5 });
});
test('大型守护者完整footprint合法且不覆盖目标', () => {
  const ctx = makeCtx({ g: [2, 3], t: [5, 4], s: [10, 4] }, { g: { width: 2, height: 2 }, t: { width: 2, height: 2 } });
  const q = query(ctx); checkPath(ctx, q);
  assert.deepEqual([q.to.col, q.to.row], [7, 4]);
  block(ctx, 8, 4);
  const next = query(ctx); if (next.ok) { checkPath(ctx, next); assert.notEqual(next.to.row, 4); }
});
test('真实绕行成本超过预算不能冲刺', () => {
  const ctx = makeCtx(); for (const row of [3, 4, 5]) block(ctx, 4, row);
  assert.equal(query(ctx, 3).ok, false);
  checkPath(ctx, query(ctx, 6));
});
test('背负费用倍率2，distance预算成本与pathDistance几何分离', () => {
  const ctx = makeCtx(); ctx.carrying.g = 'passenger';
  assert.equal(query(ctx, 3).ok, false);
  const q = query(ctx, 4); checkPath(ctx, q);
  assert.equal(q.distance, 4); assert.equal(q.pathDistance, 2);
});
test('被背负守护者明确失败', () => {
  const ctx = makeCtx(); ctx.carriedUnitIds.add('g');
  assert.equal(query(ctx).reason, '被背负单位不能参与舍身');
});
test('缺少来源、站位、倒地、敌方保护、同中心来源明确失败', () => {
  let ctx = makeCtx(); assert.equal(previewGuard(ctx, 'g', 't', 'missing', 6).reason, '舍身单位不存在');
  ctx = makeCtx(); delete ctx.placementsById.s; assert.equal(query(ctx).reason, '舍身单位缺少站位');
  ctx = makeCtx(); ctx.units[0].ref.hp = 0; assert.equal(query(ctx).reason, '舍身单位已倒地');
  ctx = makeCtx(); ctx.units[0].side = 'enemy'; assert.equal(query(ctx).reason, '舍身只能保护友方');
  ctx = makeCtx(); ctx.placementsById.s = { ...ctx.placementsById.t }; assert.equal(query(ctx).reason, '攻击来源方向无效');
});
return { cases };
}
