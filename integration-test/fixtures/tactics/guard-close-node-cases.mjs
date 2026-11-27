import assert from 'node:assert/strict';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';

const scene = { sceneId: 'tg-close', grid: { columns: 12, rows: 10, metersPerCell: 1 }, objects: [] };
function unit(id, side, opts = {}) {
  return { id, name: id, side, controller: 'player', footprint: { width: 1, height: 1 }, attrTags: [],
    skills: opts.skills || [], items: [], ref: { hp: 500, maxHp: 500, mp: 50, maxMp: 50, tp: 20, maxTp: 100,
      atk: 10, def: 0, spd: id === 's' ? 300 : 100, evasion: 0, perception: 100, strength: 50,
      totalWeight: 50, shield: 0, moveDistance: 6, flying: false, reviveCount: 0 } };
}
function guardSkill() { return { name: '测试舍身', type: '[无]', power: 0, sheshenTarget: 'all', cost: 3, hpCost: 2,
  tpCost: 4, maxUses: 3, cooldownTurns: 1, range: { type: '自身' } }; }
function incoming() { return { name: '测试攻击', type: '[伤害]', power: 60, guaranteedHit: true, hit: 100,
  damageType: '近战', cost: 0, range: { type: '单体', castRange: 10 }, actionCost: { main: 1, aux: 0 } }; }
function make(opts = {}) {
  const s = unit('s', 'enemy'), t = unit('t', 'hero'), g = unit('g', 'hero', { skills: [guardSkill()] });
  const extra = opts.extra || [];
  const placementsById = { s: { col: 6, row: 4 }, t: { col: 5, row: 4 }, g: { col: 3, row: 4, facing: 0 }, ...opts.positions };
  const objects = opts.objects || [];
  const b = createBattle({ units: [s, t, g, ...extra], placementsById,
    scene: { ...scene, grid: opts.grid || scene.grid, objects }, random: () => 0.5 });
  b.start(); return { b, s, t, g, placementsById };
}
function aim(b) { return { ...unitCenter(b.ctx.placementsById.t, b.ctx.footprintsById.t), targetId: 't' }; }
function drive(gen) { let r = gen.next(); for (let i = 0; !r.done && i < 100; i++) r = gen.next(null); assert.equal(r.done, true); return r.value; }
function segments(r) { return (r.hits || []).flatMap(h => h.segments || [h]); }
function choice(req) { const c = req.candidates.find(x => x.responderId === 'g' && x.guardian); return c ? { responderId: 'g', skill: c.skill } : null; }
function attack(f, answer = choice) { return drive(f.b.beginAttack(incoming(), aim(f.b), { autoAnswer: answer })); }
function costs(f) { return { hp: f.g.ref.hp, mp: f.g.ref.mp, tp: f.g.ref.tp,
  uses: structuredClone(f.b.battleState.perBattleUses?.g || {}), cooldowns: structuredClone(f.b.battleState.combatState.clock.cooldowns || {}) }; }
function committed(result) { return result.events.find(e => e.type === 'guard-committed'); }

async function run() {
  const cases = [];
  function test(name, fn) { try { fn(); cases.push({ id: 'TG-CLOSE ' + name, pass: true, detail: '' }); }
    catch (e) { cases.push({ id: 'TG-CLOSE ' + name, pass: false, detail: e.stack }); } }
  test('相贴无空隙仍挡并使队友退一格', () => {
    const f = make(), from = { ...f.placementsById.g }, r = attack(f), e = committed(r);
    assert.ok(e); assert.equal(f.placementsById.g.col, from.col + 2); assert.equal(f.placementsById.g.row, from.row);
    assert.equal(f.t.ref.hp, 500); assert.ok(f.g.ref.hp < 500); assert.equal(f.g.ref.mp, 47);
    assert.deepEqual([e.targetShift?.unitId, e.targetShift?.to.col, e.targetShift?.to.row], ['t', 4, 4]);
  });
  test('正后方堵塞时队友侧后让一格', () => {
    const blocker = unit('block', 'hero');
    const f = make({ extra: [blocker], positions: { block: { col: 4, row: 4 } } });
    const r = attack(f), e = committed(r);
    assert.ok(e); assert.deepEqual([f.placementsById.g.col, f.placementsById.g.row], [5, 4]);
    assert.equal(e.targetShift?.to.col, 4); assert.equal(Math.abs(e.targetShift?.to.row - 4), 1);
    assert.equal(f.t.ref.hp, 500); assert.ok(f.g.ref.hp < 500);
  });
  test('四壁满格无位移仍挡', () => {
    const f = make({ positions: { g: { col: 4, row: 4, facing: 0 } }, objects: [3, 5].map(row =>
      ({ id: 'wall-' + row, kind: 'wall', bounds: { col: 4, row, width: 3, height: 1 } })) });
    const before = { ...f.placementsById.g }, candidates = f.b.previewGuardCandidates('t', 's', incoming());
    assert.equal(candidates.length, 1); assert.equal(candidates[0].guard.ok, true);
    assert.equal(candidates[0].guard.to.col, before.col); assert.equal(candidates[0].guard.to.row, before.row);
    const r = attack(f), e = committed(r);
    assert.ok(e); assert.equal(f.placementsById.g.col, before.col); assert.equal(f.placementsById.g.row, before.row);
    assert.equal(e.targetShift, undefined); assert.equal(f.placementsById.t.col, 5);
    assert.equal(f.t.ref.hp, 500); assert.ok(f.g.ref.hp < 500);
  });
  test('高墙隔开时普通攻击不能触发舍身', () => {
    const f = make({ objects: [{ id: 'wall', kind: 'wall', bounds: { col: 4, row: 0, width: 1, height: 10 } }] });
    const r = attack(f);
    assert.ok(r.ok); assert.equal(committed(r), undefined); assert.equal(f.g.ref.mp, 50); assert.ok(f.t.ref.hp < 500);
  });
  test('关门隔开时普通攻击不能触发舍身', () => {
    const f = make({ objects: [{ id: 'door', kind: 'door', bounds: { col: 4, row: 0, width: 1, height: 10 }, open: false }] });
    const r = attack(f);
    assert.ok(r.ok); assert.equal(committed(r), undefined); assert.equal(f.g.ref.mp, 50); assert.ok(f.t.ref.hp < 500);
  });
  test('低障碍不取消舍身资格', () => {
    const f = make({ objects: [{ id: 'low', kind: 'lowCounter', bounds: { col: 4, row: 4, width: 1, height: 1 } }] });
    const r = attack(f); assert.ok(committed(r)); assert.equal(f.t.ref.hp, 500);
  });
  test('中间单位不取消舍身资格', () => {
    const mid = unit('mid', 'hero');
    const f = make({ extra: [mid], positions: { mid: { col: 4, row: 4 } } });
    const r = attack(f); assert.ok(committed(r)); assert.equal(f.t.ref.hp, 500);
  });
  test('放弃守护零收费零位移', () => {
    const f = make(), beforeCost = costs(f), beforePlace = structuredClone(f.placementsById.g);
    const r = attack(f, () => null);
    assert.equal(committed(r), undefined); assert.deepEqual(costs(f), beforeCost);
    assert.deepEqual(f.placementsById.g, beforePlace); assert.ok(f.t.ref.hp < 500);
  });
  test('多段攻击复用事件只挡当前伤害段', () => {
    const f = make({ positions: { g: { col: 4, row: 4 } }, objects: [3, 5].map(row =>
      ({ id: 'wall-' + row, kind: 'wall', bounds: { col: 4, row, width: 3, height: 1 } })) });
    let used = false;
    const r = drive(f.b.beginAttack({ ...incoming(), type2: '[伤害]', power2: 30 }, aim(f.b), { autoAnswer: req => {
      if (used) return null;
      const selected = choice(req); used = !!selected; return selected;
    } }));
    const guarded = segments(r).filter(s => s.reaction?.guard);
    assert.equal(guarded.length, 1); assert.ok(committed(r));
    assert.equal(f.g.ref.mp, 47); assert.equal(f.t.ref.hp < 500, true);
  });
  return { cases };
}
export const groups = { 'TG-CLOSE': { run } };
