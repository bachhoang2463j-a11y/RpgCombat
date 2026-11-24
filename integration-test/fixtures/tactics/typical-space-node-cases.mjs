// ==========================================
// TT-SPACE：浓雾 / 感知 / 结界 / 飞行 / 冲锋 空间节点用例
// 真实 import 业务模块，不复制规则实现。
// ==========================================

import { compileScene } from '../../../tactics/src/scene.mjs';
import * as movement from '../../../tactics/src/movement.mjs';
import * as range from '../../../tactics/src/range.mjs';
import * as regions from '../../../tactics/src/regions.mjs';
import * as perception from '../../../tactics/src/perception.mjs';
import * as barriers from '../../../tactics/src/barriers.mjs';

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
function room(objects = [], columns = 22, rows = 18) {
  return { sceneId: 'tt-space', grid: { columns, rows, metersPerCell: 1 }, ground: { material: 'brick' }, objects };
}
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 100;
  return {
    id, name: id, side, footprint: opts.footprint || { width: 1, height: 1 },
    ref: {
      hp, maxHp: hp, mp: 10, maxMp: 10, atk: 10, def: 0, shield: 0, spd: 100, evasion: 0,
      strength: 50, totalWeight: 50, moveDistance: 6, perception: opts.perception ?? 50,
      flying: !!opts.flying,
    },
  };
}
function makeCtx(units, placements, map, buffs = {}) {
  const compiled = compileScene(map);
  const footprintsById = Object.fromEntries(units.map(u => [u.id, u.footprint]));
  let t = 0;
  return {
    compiled, units, placementsById: placements, footprintsById, carriedUnitIds: new Set(),
    regions: [], barriers: [],
    now: () => t,
    setNow: v => { t = v; },
    buffsOf: id => buffs[id] || [],
  };
}
function circleCells(ctx, center, radius) {
  const { columns, rows } = ctx.compiled.grid;
  const cells = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    if (Math.hypot(col + 0.5 - center.x, row + 0.5 - center.y) <= radius + 1e-9) cells.push({ col, row });
  }
  return cells;
}
function pushFog(ctx, id, casterId, center, radius, strength, endAt) {
  const region = { id, type: 'fog', casterId, sourceKey: id, center, radius, strength, endAt, cells: circleCells(ctx, center, radius) };
  ctx.regions.push(region);
  return region;
}

function runAll() {
  const cases = [];

  // ---------- 浓雾区域 ----------
  {
    const map = room();
    const caster = unit('caster', 'hero', { perception: 50 });
    const ctx = makeCtx([caster], { caster: { col: 4, row: 4 } }, map);
    const skill = { name: '拉莱耶造雾术', type: '[致盲]', power: 25, slotTurns: 5, range: { type: '爆炸', castRange: 15, radius: 5 } };
    const query = range.queryAttack(ctx, 'caster', skill, { x: 10.5, y: 4.5 });
    const region = regions.createFogRegion(ctx, { caster, skill, query, now: 0 });
    cases.push(ok('TT-SPACE fog 创建：strength=致盲power、endAt=Turns*100、cells 取实际爆心',
      query.ok && region.strength === 25 && region.endAt === 500 && region.type === 'fog' &&
      region.cells.length > 0 && ctx.regions.length === 1,
      JSON.stringify({ strength: region.strength, endAt: region.endAt, cells: region.cells.length })));
    regions.createFogRegion(ctx, { caster, skill, query, now: 100 });
    cases.push(ok('TT-SPACE fog 同源重施替换：仅保留一座并刷新到期',
      ctx.regions.length === 1 && ctx.regions[0].endAt === 600,
      JSON.stringify(ctx.regions.map(r => r.endAt))));
    const removed = regions.expireRegions(ctx, 600);
    cases.push(ok('TT-SPACE fog 到期移除并返回 removed',
      removed.length === 1 && ctx.regions.length === 0,
      JSON.stringify(removed.map(r => r.id))));
  }
  {
    const map = room();
    const big = unit('big', 'enemy', { footprint: { width: 2, height: 2 } });
    const ctx = makeCtx([big], { big: { col: 6, row: 5 } }, map);
    pushFog(ctx, 'f1', 'hero', { x: 5.5, y: 5.5 }, 2, 30, 500);
    cases.push(ok('TT-SPACE fogAt：大型单位任一占格入雾即取最高雾贡献',
      regions.fogAt(ctx, 'big').strength === 30 && regions.fogAt(ctx, 'big').regionIds.includes('f1'),
      JSON.stringify(regions.fogAt(ctx, 'big'))));
    const outside = unit('out', 'enemy');
    ctx.units.push(outside);
    ctx.placementsById.out = { col: 18, row: 15 };
    ctx.footprintsById.out = outside.footprint;
    cases.push(ok('TT-SPACE fogAt：雾外单位 strength=0',
      regions.fogAt(ctx, 'out').strength === 0, JSON.stringify(regions.fogAt(ctx, 'out'))));
  }

  // ---------- 感知 ----------
  {
    const map = room();
    const obs = unit('obs', 'hero', { perception: 50 });
    const near = unit('near', 'enemy');
    const far = unit('far', 'enemy');
    const ctx = makeCtx([obs, near, far], { obs: { col: 2, row: 2 }, near: { col: 5, row: 2 }, far: { col: 15, row: 2 } }, map);
    cases.push(ok('TT-SPACE perception 视距=感知/5：近可见、远不可见',
      perception.canSeeUnit(ctx, 'obs', 'near') && !perception.canSeeUnit(ctx, 'obs', 'far'),
      JSON.stringify({ near: perception.canSeeUnit(ctx, 'obs', 'near'), far: perception.canSeeUnit(ctx, 'obs', 'far') })));
    const snap = perception.perceptionSnapshot(ctx, 'obs');
    cases.push(ok('TT-SPACE perceptionSnapshot 不泄漏：visible 仅可见，lastKnown 为空',
      snap.visibleUnits.includes('near') && !snap.visibleUnits.includes('far') && Object.keys(snap.lastKnown).length === 0,
      JSON.stringify(snap)));
  }
  {
    const map = room([{ id: 'w', kind: 'wall', bounds: { col: 4, row: 2, width: 1, height: 1 } }]);
    const obs = unit('obs', 'hero', { perception: 50 });
    const target = unit('t', 'enemy');
    const ctx = makeCtx([obs, target], { obs: { col: 2, row: 2 }, t: { col: 6, row: 2 } }, map);
    cases.push(ok('TT-SPACE perception 实墙 blocksVision 遮挡视线',
      !perception.canSeeUnit(ctx, 'obs', 't'), 'wall between'));
  }
  {
    const map = room();
    const obs = unit('obs', 'hero', { perception: 50 });
    const adj = unit('adj', 'enemy');
    const far = unit('far', 'enemy');
    const ctx = makeCtx([obs, adj, far], { obs: { col: 2, row: 2 }, adj: { col: 3, row: 2 }, far: { col: 6, row: 2 } }, map);
    pushFog(ctx, 'f', 'hero', { x: 2.5, y: 2.5 }, 3, 20, 500);
    cases.push(ok('TT-SPACE perception 雾内：仅八邻边缘相邻+自己可见',
      perception.canSeeUnit(ctx, 'obs', 'obs') && perception.canSeeUnit(ctx, 'obs', 'adj') && !perception.canSeeUnit(ctx, 'obs', 'far'),
      JSON.stringify({ adj: perception.canSeeUnit(ctx, 'obs', 'adj'), far: perception.canSeeUnit(ctx, 'obs', 'far') })));
  }
  {
    const map = room();
    const obs = unit('obs', 'hero', { perception: 50 });
    const inFog = unit('inFog', 'enemy');
    const across = unit('across', 'enemy');
    const ctx = makeCtx([obs, inFog, across], { obs: { col: 1, row: 1 }, inFog: { col: 6, row: 2 }, across: { col: 10, row: 2 } }, map);
    pushFog(ctx, 'f', 'hero', { x: 6.5, y: 2.5 }, 2, 20, 500);
    cases.push(ok('TT-SPACE perception 雾外：不能看雾内、不能穿雾看另一侧',
      !perception.canSeeUnit(ctx, 'obs', 'inFog') && !perception.canSeeUnit(ctx, 'obs', 'across'),
      JSON.stringify({ inFog: perception.canSeeUnit(ctx, 'obs', 'inFog'), across: perception.canSeeUnit(ctx, 'obs', 'across') })));
  }

  // ---------- 结界 ----------
  {
    const map = room();
    const caster = unit('caster', 'hero');
    const ctx = makeCtx([caster], { caster: { col: 5, row: 5 } }, map);
    const skill = { name: '纳克提特障壁术', power: 200, barrierArmor: 40, barrierSub: '近战', range: { type: '圆形', radius: 3 } };
    const preview = barriers.previewBarrier(ctx, 'caster', skill, null);
    cases.push(ok('TT-SPACE barrier 预检：integrity/armor/protectType/cells 就绪',
      preview.ok && preview.barrier.integrity === 200 && preview.barrier.armor === 40 &&
      preview.barrier.protectType === '近战' && preview.barrier.cells.length > 0,
      JSON.stringify({ integrity: preview.barrier && preview.barrier.integrity, armor: preview.barrier && preview.barrier.armor })));
    const created = barriers.createBarrier(ctx, 'caster', skill, null);
    const again = barriers.createBarrier(ctx, 'caster', skill, null);
    cases.push(ok('TT-SPACE barrier 每施术者一座：成功创建并替换旧座',
      created.ok && again.ok && ctx.barriers.length === 1,
      JSON.stringify({ len: ctx.barriers.length })));
  }
  {
    const map = room();
    const c1 = unit('c1', 'hero');
    const c2 = unit('c2', 'hero');
    const ctx = makeCtx([c1, c2], { c1: { col: 5, row: 5 }, c2: { col: 6, row: 5 } }, map);
    const skill = { power: 100, range: { type: '圆形', radius: 3 } };
    barriers.createBarrier(ctx, 'c1', skill, null);
    const preview2 = barriers.previewBarrier(ctx, 'c2', skill, null);
    cases.push(ok('TT-SPACE barrier 不同施术者不得重叠',
      !preview2.ok && /重叠/.test(preview2.reason), JSON.stringify(preview2)));
  }
  {
    const map = room();
    const caster = unit('caster', 'hero');
    const big = unit('big', 'enemy', { footprint: { width: 2, height: 2 } });
    const ctx = makeCtx([caster, big], { caster: { col: 5, row: 5 }, big: { col: 8, row: 5 } }, map);
    const skill = { power: 100, range: { type: '圆形', radius: 3 } };
    const preview = barriers.previewBarrier(ctx, 'caster', skill, null);
    cases.push(ok('TT-SPACE barrier 不得切过大型单位占地（部分重叠拒绝）',
      !preview.ok && /大型单位/.test(preview.reason), JSON.stringify(preview)));
  }
  {
    const map = room();
    const caster = unit('caster', 'hero');
    const ally = unit('ally', 'hero');
    const foe = unit('foe', 'enemy');
    const ctx = makeCtx([caster, ally, foe], { caster: { col: 5, row: 5 }, ally: { col: 6, row: 5 }, foe: { col: 2, row: 2 } }, map);
    barriers.createBarrier(ctx, 'caster', { power: 100, barrierArmor: 40, range: { type: '圆形', radius: 3 } }, null);
    cases.push(ok('TT-SPACE barrierAt：按单位完整占格定位结界',
      barriers.barrierAt(ctx, 'ally') && barriers.barrierAt(ctx, 'foe') === null,
      JSON.stringify({ ally: !!barriers.barrierAt(ctx, 'ally'), foe: !!barriers.barrierAt(ctx, 'foe') })));
    cases.push(ok('TT-SPACE barrierBlocksMove：敌跨界阻断、内部/友方放行',
      barriers.barrierBlocksMove(ctx, 'foe', { col: 2, row: 2 }, { col: 5, row: 5 }) &&
      !barriers.barrierBlocksMove(ctx, 'foe', { col: 5, row: 5 }, { col: 6, row: 5 }) &&
      !barriers.barrierBlocksMove(ctx, 'ally', { col: 6, row: 5 }, { col: 10, row: 10 }),
      'cross/internal/ally'));
    cases.push(ok('TT-SPACE interception：外敌攻击被拦、内部与友方不拦', (() => {
      const outside = !!barriers.interception(ctx, 'foe', 'ally');
      const from = ctx.placementsById.foe;
      ctx.placementsById.foe = { col: 5, row: 6 };
      const inside = barriers.interception(ctx, 'foe', 'caster') === null;
      ctx.placementsById.foe = from;
      return outside && inside && barriers.interception(ctx, 'caster', 'ally') === null;
    })(), 'external/internal/ally'));
    const barrierId = barriers.barrierAt(ctx, 'ally').id;
    const first = barriers.damageBarrier(ctx, barrierId, 100);
    const second = barriers.damageBarrier(ctx, barrierId, 1000);
    cases.push(ok('TT-SPACE damageBarrier：护甲先减、不盾、击破无溢出并移除',
      first.damage === 60 && first.integrityAfter === 40 && !first.broken &&
      second.integrityAfter === 0 && second.broken && ctx.barriers.length === 0,
      JSON.stringify({ first, second: { damage: second.damage, after: second.integrityAfter, broken: second.broken } })));
  }

  // ---------- 飞行 / 跳跃 / 位移 ----------
  {
    const map = room([{ id: 'low', kind: 'lowCounter', bounds: { col: 4, row: 2, width: 1, height: 1 } }]);
    const flyer = unit('flyer', 'hero');
    const walker = unit('walker', 'hero');
    const ctx = makeCtx([flyer, walker], { flyer: { col: 2, row: 2 }, walker: { col: 2, row: 8 } }, map,
      { flyer: [{ type: 'buff', variant: '飞行' }] });
    const flyReach = movement.findReachable(ctx, 'flyer', Infinity);
    const walkReach = movement.findReachable(ctx, 'walker', Infinity);
    cases.push(ok('TT-SPACE flying：跨低障碍，普通单位不可入低障碍格',
      flyReach.byKey.has('4,2') && !walkReach.byKey.has('4,2'),
      JSON.stringify({ fly: flyReach.byKey.has('4,2'), walk: walkReach.byKey.has('4,2') })));
    cases.push(ok('TT-SPACE flying canPlaceAt：可落在低障碍上',
      movement.canPlaceAt(ctx, 'flyer', 4, 2).ok && !movement.canPlaceAt(ctx, 'walker', 4, 2).ok,
      JSON.stringify({ fly: movement.canPlaceAt(ctx, 'flyer', 4, 2), walk: movement.canPlaceAt(ctx, 'walker', 4, 2) })));
  }
  {
    const map = room();
    const jumper = unit('jumper', 'enemy');
    const ctx = makeCtx([jumper], { jumper: { col: 2, row: 2 } }, map);
    ctx.barriers.push({ id: 'b', casterId: 'hero', side: 'hero', cells: [{ col: 3, row: 2 }], integrity: 100, maxIntegrity: 100, armor: 0, protectType: 'all', endAt: null });
    const jump = movement.findJumpPath(ctx, 'jumper', 4, 2, 4);
    cases.push(ok('TT-SPACE findJumpPath：敌方跨越结界轨迹被阻断',
      !jump.ok && /结界/.test(jump.reason), JSON.stringify(jump)));
  }
  {
    const map = room([{ id: 'w', kind: 'wall', bounds: { col: 4, row: 2, width: 1, height: 1 } }]);
    const mover = unit('m', 'hero');
    const ctx = makeCtx([mover], { m: { col: 2, row: 2 } }, map);
    const quant = movement.traceDisplacement(ctx, 'm', { x: 1, y: 0 }, 1.5);
    const blocked = movement.traceDisplacement(ctx, 'm', { x: 1, y: 0 }, 5);
    cases.push(ok('TT-SPACE traceDisplacement：距离量化剩余不算撞墙，真实阻挡才 blocked',
      quant.actual === 1 && quant.blocked === false && quant.requested === 1.5 &&
      blocked.blocked === true && blocked.actual === 1,
      JSON.stringify({ quant: { actual: quant.actual, blocked: quant.blocked }, blocked: { actual: blocked.actual, blocked: blocked.blocked } })));
  }
  {
    const map = room([{ id: 'w', kind: 'wall', bounds: { col: 6, row: 2, width: 1, height: 1 } }]);
    const charger = unit('charger', 'hero', { footprint: { width: 2, height: 2 } });
    const foe = unit('foe', 'enemy');
    const ctx = makeCtx([charger, foe], { charger: { col: 2, row: 2 }, foe: { col: 4, row: 2 } }, map);
    const charge = movement.chargePath(ctx, 'charger', { x: 10, y: 2.5 }, 6);
    const enemyEntry = charge.blockingEntries.find(e => e.type === 'unit' && e.unitId === 'foe');
    const wallEntry = charge.blockingEntries.find(e => e.type === 'terrain' && e.col === 6);
    cases.push(ok('TT-SPACE chargePath：八向量化、记录敌方结算点、实墙前停止',
      charge.ok && charge.direction.x === 1 && charge.direction.y === 0 &&
      !!enemyEntry && !!wallEntry && charge.path[charge.path.length - 1].col === 4,
      JSON.stringify({ direction: charge.direction, path: charge.path, entries: charge.blockingEntries })));
  }

  // ---------- 范围 ----------
  {
    const map = room();
    const caster = unit('caster', 'hero');
    const ally = unit('ally', 'hero');
    const ctx = makeCtx([caster, ally], { caster: { col: 2, row: 2 }, ally: { col: 3, row: 2 } }, map);
    const heal = { type: '[回复]', power: 30, range: { type: '圆形', radius: 3 } };
    const q = range.queryAttack(ctx, 'caster', heal, null);
    const healSlots = q.ok ? q.slotTargets[0].targetIds : [];
    cases.push(ok('TT-SPACE range 圆形自身为圆心无需瞄准，治疗含施法者本人',
      q.ok && q.shape.center.x === q.origin.x && healSlots.includes('caster') && healSlots.includes('ally'),
      JSON.stringify({ ok: q.ok, center: q.shape && q.shape.center, healSlots })));
    const all = range.queryAttack(ctx, 'caster', { type: '[伤害]', power: 10, range: { type: '全域' } }, null);
    cases.push(ok('TT-SPACE range 全域无需瞄准且覆盖全图',
      all.ok && all.cells.length === ctx.compiled.grid.columns * ctx.compiled.grid.rows,
      JSON.stringify({ ok: all.ok, cells: all.cells.length })));
  }
  {
    const map = room();
    const caster = unit('caster', 'hero');
    const big = unit('big', 'enemy', { footprint: { width: 2, height: 2 } });
    const ctx = makeCtx([caster, big], { caster: { col: 2, row: 2 }, big: { col: 3, row: 2 } }, map);
    const q = range.queryAttack(ctx, 'caster', { type: '[伤害]', power: 10, range: { type: '圆形', radius: 1 } }, null);
    cases.push(ok('TT-SPACE range 区域目标按任意占格命中（大型中心不在范围仍选中）',
      q.ok && q.targetIds.includes('big'), JSON.stringify({ targetIds: q.targetIds })));
  }
  {
    const map = room();
    const caster = unit('caster', 'hero');
    const ally = unit('ally', 'hero');
    const foe = unit('foe', 'enemy');
    const ctx = makeCtx([caster, ally, foe], { caster: { col: 2, row: 2 }, ally: { col: 3, row: 2 }, foe: { col: 4, row: 2 } }, map);
    const q = range.queryAttack(ctx, 'caster', { type: '[致盲]', power: 10, affectsAll: true, range: { type: '圆形', radius: 3 } }, null);
    const ids = q.ok ? q.slotTargets[0].targetIds : [];
    cases.push(ok('TT-SPACE range affectsAll 不分敌友：含施法者/友方/敌方',
      q.ok && ids.includes('caster') && ids.includes('ally') && ids.includes('foe'), JSON.stringify(ids)));
    const qEnemy = range.queryAttack(ctx, 'caster', { type: '[回复]', power: 10, slotTargets: ['enemy'], range: { type: '圆形', radius: 3 } }, null);
    const qAlly = range.queryAttack(ctx, 'caster', { type: '[伤害]', power: 10, slotTargets: ['ally'], range: { type: '圆形', radius: 3 } }, null);
    cases.push(ok('TT-SPACE range slotTargets override enemy/ally 覆盖默认敌我',
      qEnemy.ok && qEnemy.slotTargets[0].targetIds.join(',') === 'foe' &&
      qAlly.ok && qAlly.slotTargets[0].targetIds.includes('ally') && !qAlly.slotTargets[0].targetIds.includes('foe'),
      JSON.stringify({ enemy: qEnemy.slotTargets[0].targetIds, ally: qAlly.slotTargets[0].targetIds })));
  }
  {
    const map = room();
    const caster = unit('caster', 'hero', { perception: 50 });
    const ctx = makeCtx([caster], { caster: { col: 2, row: 2 } }, map);
    const summon = { type: '[召唤]', summonFootprint: { width: 2, height: 2 }, range: { type: '召唤', castRange: 20 } };
    const good = range.queryAttack(ctx, 'caster', summon, { x: 6.5, y: 2.5 });
    cases.push(ok('TT-SPACE range 召唤：射程内个人视野 + 完整模板 footprint 落点合法',
      good.ok && good.summon.anchor.col === 6 && good.summon.footprint.width === 2,
      JSON.stringify({ ok: good.ok, summon: good.summon })));
    const blocker = unit('blocker', 'enemy');
    ctx.units.push(blocker);
    ctx.placementsById.blocker = { col: 6, row: 2 };
    ctx.footprintsById.blocker = blocker.footprint;
    const occupied = range.queryAttack(ctx, 'caster', summon, { x: 6.5, y: 2.5 });
    const outVision = range.queryAttack(ctx, 'caster', summon, { x: 16.5, y: 2.5 });
    cases.push(ok('TT-SPACE range 召唤：占用/超出个人视野拒绝',
      !occupied.ok && !outVision.ok && /占用/.test(occupied.reason) && /视野/.test(outVision.reason),
      JSON.stringify({ occupied: occupied.reason, outVision: outVision.reason })));
  }

  return { cases };
}

export const groups = {
  'TT-SPACE': { run: () => runAll() },
};
