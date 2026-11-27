// 真实 createBattle / beginAttack 回归；仅夹具构造及选择冻结期间模拟外部状态变化。
import assert from 'node:assert/strict';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { parseSkill } from '../../../tactics/src/parser.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';

const scene = { sceneId: 'tg-battle', grid: { columns: 18, rows: 12, metersPerCell: 1 }, objects: [] };
function unit(id, side, opts = {}) {
  return { id, name: id, side, controller: 'player', classType: opts.classType || null,
    footprint: { width: 1, height: 1 }, attrTags: opts.attrTags || [], skills: opts.skills || [], items: [],
    isSummon: !!opts.isSummon, summonOwnerId: opts.isSummon ? 't' : null,
    ref: { hp: opts.hp ?? 500, maxHp: opts.hp ?? 500, mp: 50, maxMp: 50, tp: 20, maxTp: 100,
      atk: 10, def: 0, spd: id === 's' ? 300 : 100, evasion: 0, perception: 100,
      strength: 50, totalWeight: 50, shield: opts.shield || 0, moveDistance: opts.moveDistance ?? 6,
      flying: !!opts.flying, reviveCount: opts.reviveCount || 0 } };
}
function guardSkill() {
  return { name: '测试舍身', type: '[无]', power: 0, sheshenTarget: 'all', cost: 3, hpCost: 2, tpCost: 4,
    maxUses: 3, cooldownTurns: 1, range: { type: '自身' } };
}
function incoming(power = 60) {
  return { name: '测试攻击', type: '[伤害]', power, guaranteedHit: true, hit: 100, damageType: '远程',
    cost: 0, range: { type: '单体', castRange: 16 }, actionCost: { main: 1, aux: 0 } };
}
function make(opts = {}) {
  const skill = guardSkill();
  const s = unit('s', 'enemy'), t = unit('t', 'hero', opts.target), g = unit('g', 'hero', { skills: [skill], ...opts.guardian });
  const units = [s, t, g, ...(opts.extra || [])];
  const placementsById = { s: { col: 12, row: 5 }, t: { col: 6, row: 5 }, g: { col: 5, row: 5, facing: 0 }, ...opts.positions };
  const b = createBattle({ units, placementsById, scene, random: opts.random || (() => 0.5) }); b.start();
  return { b, s, t, g, skill, placementsById };
}
function aim(b) { return { ...unitCenter(b.ctx.placementsById.t, b.ctx.footprintsById.t), targetId: 't' }; }
function drive(gen) { let step = gen.next(); for (let i = 0; !step.done && i < 100; i++) step = gen.next(null); assert.equal(step.done, true); return step.value; }
function segments(result) { return (result.hits || []).flatMap(h => h.segments || [h]); }
function costs(b, g) {
  return { mp: g.ref.mp, hp: g.ref.hp, tp: g.ref.tp,
    uses: structuredClone(b.battleState.perBattleUses?.[g.id] || {}),
    cooldown: structuredClone(b.battleState.combatState.clock.cooldowns || {}) };
}
function chosen(req, id = 'g') { const c = req.candidates.find(c => c.responderId === id && c.guardian); return c ? { responderId: id, skill: c.skill } : null; }
function attackSelected(f, skill = incoming(), autoAnswer = req => chosen(req)) {
  return drive(f.b.beginAttack(skill, aim(f.b), { autoAnswer }));
}
function guardMeta(seg, reason, id) {
  const guard = seg.reaction?.guard;
  assert.ok(guard); assert.equal(guard.reason, reason); assert.equal(guard.committed, true);
  assert.equal(guard.finalTargetId, id); assert.equal(seg.targetId, id); assert.equal(seg.originalTargetId, 't');
  for (const key of ['from', 'to', 'path', 'distance', 'pathDistance', 'origin', 'startPosition', 'protectedPosition', 'contactPoint', 'reactionUsed']) assert.ok(key in guard, key);
  for (const key of ['segmentId', 'slotIndex', 'segmentIndex', 'attackId']) assert.ok(key in seg, key);
  assert.equal(guard.segmentId, seg.segmentId); assert.equal(guard.attackId, seg.attackId);
  return guard;
}

export const groups = { 'TG-BATTLE': { run: async () => {
  const cases = [];
  function test(name, fn) {
    try { fn(); cases.push({ id: 'TG-BATTLE ' + name, pass: true, detail: '' }); }
    catch (e) { cases.push({ id: 'TG-BATTLE ' + name, pass: false, detail: e.stack }); }
  }
  test('候选纯查询及完整有效移动（飞行加成）', () => {
    let f = make({ positions: { t: { col: 9, row: 5 }, g: { col: 2, row: 5 } } });
    const before = costs(f.b, f.g), p = structuredClone(f.placementsById);
    assert.equal(f.b.previewGuardCandidates('t', 's', incoming()).length, 0);
    assert.deepEqual(costs(f.b, f.g), before); assert.deepEqual(f.placementsById, p);
    f = make({ guardian: { flying: true }, positions: { t: { col: 9, row: 5 }, g: { col: 2, row: 5 } } });
    const cs = f.b.previewGuardCandidates('t', 's', incoming()); assert.equal(cs.length, 1);
    assert.equal(cs[0].guard.maxDistance, 9);
  });
  test('选择后全部来源侧被占：提交失败零消费零位移', () => {
    const blockers = ['a', 'b', 'c'].map(id => unit(id, 'hero'));
    const f = make({ extra: blockers, positions: { a: { col: 15, row: 1 }, b: { col: 15, row: 2 }, c: { col: 15, row: 3 } } });
    const before = costs(f.b, f.g), original = { ...f.placementsById.g };
    const r = attackSelected(f, incoming(), req => {
      const choice = chosen(req); if (choice) for (const [i, id] of ['a', 'b', 'c'].entries()) Object.assign(f.placementsById[id], { col: 7, row: 4 + i });
      return choice;
    });
    assert.deepEqual(costs(f.b, f.g), before); assert.deepEqual(f.placementsById.g, original);
    assert.ok(!segments(r)[0].reaction?.guard); assert.ok(f.t.ref.hp < 500);
  });
  test('选择后资源不足：提交失败不新增任何消费', () => {
    const f = make(); let afterExternal;
    const r = attackSelected(f, incoming(), req => {
      const choice = chosen(req); if (choice) { f.g.ref.mp = 0; afterExternal = costs(f.b, f.g); } return choice;
    });
    assert.deepEqual(costs(f.b, f.g), afterExternal); assert.deepEqual(f.placementsById.g, { col: 5, row: 5, facing: 0 });
    assert.ok(!segments(r)[0].reaction?.guard);
  });
  test('真实留位、费用一次、标识和当前段重定向', () => {
    const f = make(), before = costs(f.b, f.g), moveBefore = f.b.snapshot().resources.moveRemaining;
    const r = attackSelected(f), seg = segments(r)[0], guard = guardMeta(seg, 'selected-guard', 'g');
    assert.deepEqual(f.placementsById.g, guard.to); assert.deepEqual([guard.to.col, guard.to.row], [7, 5]);
    assert.equal(f.t.ref.hp, 500); assert.equal(f.g.ref.mp, before.mp - 3);
    assert.equal(f.g.ref.hp, before.hp - 2 - seg.hpDmg); assert.equal(f.g.ref.tp, before.tp - 4 + 10);
    assert.equal(Object.values(f.b.battleState.perBattleUses.g).reduce((a, b) => a + b, 0), 1);
    assert.equal(r.events.filter(e => e.type === 'reaction-used' && e.responderId === 'g').length, 1);
    assert.equal(f.b.snapshot().resources.moveRemaining, moveBefore);
  });
  test('已在合法挡位仍真实提交一次费用、零距离不搬位', () => {
    const f = make({ positions: { g: { col: 7, row: 5, facing: 0 } } });
    const r = attackSelected(f), seg = segments(r)[0], guard = guardMeta(seg, 'selected-guard', 'g');
    assert.equal(guard.distance, 0); assert.equal(guard.pathDistance, 0);
    assert.deepEqual(guard.path, [{ col: 7, row: 5 }]); assert.equal(f.g.ref.mp, 47);
    assert.deepEqual(f.placementsById.g, { col: 7, row: 5, facing: 90 });
    assert.equal(r.events.filter(e => e.type === 'reaction-used' && e.responderId === 'g').length, 1);
  });
  test('多段只重定向当前段，后续段恢复原目标', () => {
    const f = make();
    const skill = parseSkill('【双段】[枪击;power:40][枪击;power:40][远程][范围:单体;射程:16]');
    skill.guaranteedHit = true;
    const r = attackSelected(f, skill), segs = segments(r);
    assert.equal(segs.length, 2); guardMeta(segs[0], 'selected-guard', 'g');
    assert.equal(segs[1].targetId, 't'); assert.ok(!segs[1].reaction?.guard);
    assert.notEqual(segs[0].segmentId, segs[1].segmentId); assert.equal(segs[0].attackId, segs[1].attackId);
    assert.ok(f.t.ref.hp < 500); assert.equal(f.g.ref.mp, 47);
  });
  test('守护者自身二次反应、不递归再舍身', () => {
    const shield = parseSkill('【二次盾】[护盾;power:180][MP:4][反应][范围:自身]');
    const h = unit('h', 'hero', { skills: [guardSkill()] });
    const f = make({ extra: [h], positions: { h: { col: 8, row: 6 } } }); f.g.skills.push(shield);
    const requests = [];
    const r = attackSelected(f, incoming(), req => {
      requests.push(req); if (req.targetId === 'g') {
        assert.ok(req.candidates.every(c => !c.guardian));
        const c = req.candidates.find(c => c.skill === shield); return c ? { responderId: 'g', skill: c.skill } : null;
      } return chosen(req);
    });
    const seg = segments(r)[0]; guardMeta(seg, 'selected-guard', 'g');
    assert.equal(requests.length, 2); assert.equal(seg.reaction.guardianReaction.skillName, '二次盾');
    assert.equal(f.g.ref.mp, 43); assert.equal(f.g.ref.hp, 498); assert.equal(f.t.ref.hp, 500);
  });
  test('群攻普通及自动召唤守护均不触发', () => {
    const pet = unit('pet', 'hero', { isSummon: true });
    const f = make({ target: { hp: 30 }, extra: [pet], positions: { pet: { col: 5, row: 6 } } });
    const skill = incoming(100); skill.range = { type: '爆炸', castRange: 16, radius: 2 };
    assert.equal(f.b.previewGuardCandidates('t', 's', skill).length, 0);
    const r = f.b.attack(skill, aim(f.b)); assert.equal(r.ok, true);
    assert.ok(segments(r).every(s => !s.reaction?.guard));
  });
  test('召唤主人非致死不守护', () => {
    const pet = unit('pet', 'hero', { isSummon: true });
    const f = make({ extra: [pet], positions: { pet: { col: 5, row: 6 } } });
    const r = f.b.attack(incoming(), aim(f.b)); assert.ok(f.t.ref.hp < 500); assert.equal(pet.ref.hp, 500);
    assert.ok(!segments(r)[0].reaction?.guard);
  });
  for (const variant of ['plain', 'grit', 'revive']) test('致死自动守护默认none，优先主人保命复活 ' + variant, () => {
    const pet = unit('pet', 'hero', { isSummon: true });
    const target = { hp: 30, ...(variant === 'grit' ? { classType: '防守者' } : {}),
      ...(variant === 'revive' ? { attrTags: ['[复活]'], reviveCount: 1 } : {}) };
    const f = make({ target, extra: [pet], positions: { pet: { col: 5, row: 6 } } });
    const r = f.b.attack(incoming(100), aim(f.b)); guardMeta(segments(r)[0], 'summon-lethal-guard', 'pet');
    assert.equal(f.t.ref.hp, 30); assert.ok(pet.ref.hp < 500); assert.equal(pet.ref.mp, 50);
    if (variant === 'grit') assert.ok(!f.t.ref.hasTriggeredGrit);
    if (variant === 'revive') assert.equal(f.t.ref.reviveCount, 1);
  });
  test('自动致死查询不额外掷骰，重定向与基线同随机伤害', () => {
    let n1 = 0, n2 = 0;
    const pet = unit('pet', 'hero', { isSummon: true });
    const guarded = make({ target: { hp: 30 }, extra: [pet], positions: { pet: { col: 5, row: 6 } }, random: () => { n1++; return 0.5; } });
    const base = make({ random: () => { n2++; return 0.5; } });
    const a = segments(guarded.b.attack(incoming(100), aim(guarded.b)))[0];
    const b = segments(base.b.attack(incoming(100), aim(base.b)))[0];
    assert.equal(n1, n2); assert.equal(a.rawDmg, b.rawDmg); assert.equal(a.hpDmg, b.hpDmg);
  });
  test('召唤盾真实扣盾、死亡退出时钟、主人不受伤', () => {
    const pet = unit('pet', 'hero', { isSummon: true, hp: 20, shield: 15 });
    const f = make({ target: { hp: 30 }, extra: [pet], positions: { pet: { col: 5, row: 6 } } });
    const r = f.b.attack(incoming(100), aim(f.b)), seg = segments(r)[0];
    guardMeta(seg, 'summon-lethal-guard', 'pet'); assert.equal(pet.ref.shield, 0); assert.equal(pet.ref.hp, 0);
    assert.equal(seg.shieldDmg, 15); assert.equal(seg.down, true); assert.equal(f.t.ref.hp, 30);
    assert.ok(r.events.some(e => e.type === 'unit-down' && e.unitId === 'pet' && e.isSummon));
    for (let i = 0; i < 8; i++) { f.b.endAction(); assert.notEqual(f.b.snapshot().currentId, 'pet'); }
  });
  return { cases };
} } };
