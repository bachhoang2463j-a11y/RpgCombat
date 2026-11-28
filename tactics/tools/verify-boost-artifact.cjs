'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = readFileSync(path.join(__dirname, '..', 'mvp-standalone.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
assert.equal((html.match(/<\/script>/gi) || []).length, 1);
assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet/i);
assert.doesNotMatch(scripts[0][1], /\bimport\s*(?:\(|[{*'"\w])/);
for (const symbol of ['resolveBoostModifiers', 'applyBoostSkill', 'cycleBoost', 'consumeBoost', 'awardBoostKill', 'spreadNow', 'splashTargetIds', 't-boost-badge', 'boostCastTier']) {
  assert.ok(html.includes(symbol), symbol + ' 未入包');
}
for (const name of ['lv1', 'lv2', 'lv3', 'lv1s', 'lv2s', 'lv3s', 'cancel', 'cast']) {
  const data = readFileSync(path.join(__dirname, '..', 'assets', 'boost', 'boost_' + name + '.ogg'));
  assert.equal(data.subarray(0, 4).toString(), 'OggS');
  assert.ok(html.includes('data:audio/ogg;base64,' + data.toString('base64')), '原版 Boost ' + name + ' 音效未入包');
}
const host = { console, structuredClone, URL, setTimeout, clearTimeout };
host.window = host;
vm.createContext(host);
assert.throws(() => new vm.Script(scripts[0][1]).runInContext(host), /document is not defined/);
const { createBattle, resolveBoostModifiers } = host.__TACTICS_BACKEND__;
assert.equal(typeof createBattle, 'function');
const skill = { name: '产物Boost直击', type: '[伤害]', power: 20, hit: 100, cost: 0, tpCost: 10,
  guaranteedHit: true, damageType: '远程', range: { type: '单体', castRange: 3 } };
const scene = { sceneId: 'boost-artifact', grid: { columns: 16, rows: 10, metersPerCell: 1 }, ground: {}, objects: [], encounter: true };
function unit(id, side, hp = 200) {
  return { id, name: id, side, controller: side === 'hero' ? 'player' : 'ai', footprint: { width: 1, height: 1 }, skills: [skill], items: [], attrTags: [],
    ref: { hp, maxHp: hp, mp: 100, maxMp: 100, tp: 100, maxTp: 100, atk: 20, def: 0, spd: side === 'hero' ? 200 : 100,
      evasion: 0, perception: 100, moveDistance: 6, strength: 60, totalWeight: 40 } };
}
function make(hp = 200) {
  const units = [unit('h', 'hero'), unit('e', 'enemy', hp), unit('n', 'enemy', hp)];
  const b = createBattle({ units, scene, placementsById: { h: { col: 2, row: 4, facing: 0 }, e: { col: 6, row: 4, facing: 0 }, n: { col: 6, row: 5, facing: 0 } }, random: () => 0.5 });
  b.start();
  return b;
}
const aim = { x: 6.5, y: 4.5, targetId: 'e' };
const b = make();
assert.equal(b.previewAttack(skill, aim).ok, false, '0档应超出射程');
assert.equal(b.setBoostTier(3, skill).tier, 3);
assert.equal(b.ctx.units[0].ref.tp, 100, '选档不得扣费');
const preview = b.predictAttack(skill, aim);
assert.equal(preview.costs.tp, 70);
assert.equal(preview.ok, true);
assert.equal(preview.damagePreview.length, 2);
const result = b.attack(skill, aim);
assert.equal(result.costSummary.tp, 70);
assert.equal(b.ctx.units[0].ref.tp, 35);
assert.equal(result.skill.boostTier, 3);
assert.equal(result.hits.find(h => h.targetId === 'e').hpDmg, 30);
assert.equal(result.hits.find(h => h.targetId === 'n').hpDmg, 15);
for (const row of preview.damagePreview) assert.equal(row.estimatedHpDmg, result.hits.find(h => h.targetId === row.targetId).hpDmg);
assert.equal(b.setBoostTier(1).ok, false, '技能执行后不得再次投入Boost');
const kill = make(10);
kill.setBoostTier(3, skill);
assert.equal(kill.attack(skill, aim).hits.filter(h => h.down).length, 2);
assert.equal(kill.snapshot().resources.universal, 1, '多杀只返1万能行动点');
const delayed = { ...skill, name: '产物延迟', delay: 3, range: { type: '单体', castRange: 10 } };
const charge = make();
charge.setBoostTier(3, delayed);
assert.equal(resolveBoostModifiers(delayed, 3).delayReduction, 3);
assert.equal(charge.startPreparation(delayed).costSummary.tp, 70);
assert.equal(charge.snapshot().preparation.ready, true);
assert.equal(charge.snapshot().preparation.boostTier, 3);
const released = charge.attack(delayed, aim);
assert.equal(released.costSummary.tp, 0, '读条释放不得重复扣费');
assert.equal(released.skill.hit, 170, '延迟伤害仍获得通用 Aim 保底');
assert.equal(released.hits.find(h => h.targetId === 'e').hpDmg, 30, '延迟伤害仍获得通用 50% 威力保底');
assert.equal(charge.ctx.units[0].ref.tp, 35);
const mixed = { ...skill, name: '产物混合强化', type2: '[降防]', power2: 20, slotTurns2: 3 };
const mixedBattle = make();
mixedBattle.setBoostTier(3, mixed);
const mixedResult = mixedBattle.attack(mixed, aim);
assert.equal(mixedResult.skill.power, 30);
assert.equal(mixedResult.skill.power2, 22);
assert.equal(mixedResult.skill.slotTurns2, 4);
assert.equal(mixedResult.effects.find(e => e.kind === 'buff' && e.field === 'def').value, -22);
console.log('[boost artifact] 关键模块、8个内嵌原版音效、单脚本与零外部import通过；产物真实规则的射程、扣费、预览/溅射、锁档、多杀返还与延迟冻结通过');
