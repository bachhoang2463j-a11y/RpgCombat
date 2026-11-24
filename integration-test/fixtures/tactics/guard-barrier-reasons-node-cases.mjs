// 直接导入真实规则、效果槽和职业模块；导入不执行测试。
import assert from 'node:assert/strict';
import { applyTypeResist, immunityReason, isImmuneToPoison, isImmuneToBurn, isImmuneToStun } from '../../../tactics/src/variant-rules.mjs';
import { applyEffectSlot } from '../../../tactics/src/effect-handlers.mjs';
import { CLASS_PASSIVES } from '../../../tactics/src/class-passives.mjs';

function unit(tags = [], extra = {}) {
  return { id: 'target', name: '目标', attrTags: tags, ref: { hp: 90, maxHp: 100, mp: 0, maxMp: 100, tp: 0, maxTp: 100, shield: 3, ...extra } };
}
function runtime(buffs = [], passive = null) {
  const writes = [];
  return { writes, buffsOf: () => buffs, passiveOf: () => passive, currentAttackId: () => 'attack:1',
    statusSource: (id, ids, key) => ({ ...ids, effectId: id + ':' + key }),
    addLog() {}, registerBuff: (...args) => writes.push(['buff', ...args]),
    registerDot: (...args) => writes.push(['dot', ...args]), dispatchBattleClock: (...args) => writes.push(['clock', ...args]),
    nextStackSeq: () => 1, dispelNegatives: () => [],
  };
}
function effect(rt, target, definition, power = 21, options = {}) {
  const caster = { id: 'caster', name: '施法者', ref: { mp: 0, maxMp: 100 } };
  const slot = { definition, power, turns: 2, index: 3, tag: 'test', target: 'enemy', ...options.slot };
  const result = applyEffectSlot(rt, { caster, targets: [target], slot, skill: {}, skillKey: 'skill', multiplier: options.multiplier ?? 1 });
  for (const r of result.applied) {
    assert.equal(r.casterId, 'caster'); assert.equal(r.slotIndex, 3);
    assert.equal(r.attackId, 'attack:1'); assert.equal(r.effectId, 'target:test:3');
  }
  return result.applied[0];
}

export const groups = { 'TG-REASONS': { async run({ modules } = {}) {
  const cases = [];
  function check(id, fn) {
    try { fn(); cases.push({ id, pass: true, detail: '' }); }
    catch (e) { cases.push({ id, pass: false, detail: e.stack }); }
  }
  check('TGR-01 类型与群攻逐层乘法取整及下限', () => {
    for (const [type, tag, reason] of [['近战', '虚形', 'phantom'], ['远程', '流体', 'fluid'], ['法术', '破法', 'anti-magic']]) {
      const details = {};
      assert.equal(applyTypeResist(7, type, true, unit(['[' + tag + ']', '[要害]']), [], details), 1);
      assert.deepEqual(details, { before: 7, after: 1, layers: [
        { reason, sourceKind: 'native-variant', damageType: type, multiplier: 0.5, before: 7, after: 3 },
        { reason: 'vital', sourceKind: 'native-variant', damageType: 'AoE', multiplier: 0.5, before: 3, after: 1 },
      ] });
    }
  });
  check('TGR-02 赋予来源与原生优先不重复叠乘', () => {
    const buffs = [{ type: 'variant', variant: '流体', _source: { effectId: 'grant:fluid' } }, { type: 'variant', variant: '要害', sourceKey: 'grant:vital' }];
    const details = {};
    assert.equal(applyTypeResist(100, '远程', true, unit(), buffs, details), 25);
    assert.deepEqual(details.layers.map(l => [l.sourceKind, l.sourceId]), [['granted-variant', 'grant:fluid'], ['granted-variant', 'grant:vital']]);
    applyTypeResist(100, '远程', false, unit(['[流体]']), buffs, details);
    assert.equal(details.layers.length, 1); assert.equal(details.layers[0].sourceKind, 'native-variant');
  });
  check('TGR-03 显式resistMap覆盖及原真值语义', () => {
    const details = {};
    const u = unit(['[虚形]', '[要害]'], { resistMap: { '近战': 0.8, AoE: 0.3 } });
    assert.equal(applyTypeResist(19, '近战', true, u, [], details), 4);
    assert.ok(details.layers.every(l => l.reason === 'resist-map' && l.sourceKind === 'resist-map'));
    u.ref.resistMap = { '近战': 0, AoE: 0 };
    assert.equal(applyTypeResist(19, '近战', true, u, [], details), 4);
    assert.equal(details.layers[0].reason, 'phantom');
    u.ref.resistMap = { '近战': -2, AoE: 2 };
    assert.equal(applyTypeResist(19, '近战', true, u, [], details), 2);
  });
  check('TGR-04 旧签名和无抗性早退详情重置', () => {
    const d = { layers: ['old'] };
    assert.equal(applyTypeResist(5, '近战', false, unit()), 5);
    for (const raw of [0, -4, 5]) {
      assert.equal(applyTypeResist(raw, '近战', true, null, [], d), raw);
      assert.deepEqual(d, { before: raw, after: raw, layers: [] });
    }
    assert.equal(applyTypeResist(0.1, '近战', false, unit(['[虚形]']), [], d), 1);
  });
  check('TGR-05 现有免疫原生赋予显式字段保持一致', () => {
    for (const [kind, tag, reason, fn, field] of [['poison', '耐毒', 'poison-proof', isImmuneToPoison, 'immunePoison'], ['burn', '防火', 'fire-proof', isImmuneToBurn, 'immuneBurn'], ['stun', '钢体', 'steel-body', isImmuneToStun, null]]) {
      assert.equal(fn(unit()), false);
      assert.deepEqual(immunityReason(unit(['[' + tag + ']']), kind), { reason, sourceKind: 'native-variant' });
      const buffs = [{ type: 'variant', variant: tag, _source: { effectId: 'grant' } }];
      assert.equal(fn(unit(), buffs), true);
      assert.deepEqual(immunityReason(unit(), kind, buffs), { reason, sourceKind: 'granted-variant', sourceId: 'grant' });
      if (field) assert.deepEqual(immunityReason(unit([], { [field]: 'truthy' }), kind), { reason: field, sourceKind: 'explicit-immune' });
    }
    assert.equal(immunityReason(unit([], { immuneStun: true }), 'stun'), null);
    assert.equal(immunityReason(unit(), 'paralyze'), null);
  });
  check('TGR-06 燃烧减疗截断溢出盾独立账目及来源快照', () => {
    const source = { effectId: 'burn:1', casterId: 'enemy' };
    const rt = runtime([{ type: 'burn', _source: source }], CLASS_PASSIVES['圣职者']);
    const target = unit([], { hp: 95 });
    const r = effect(rt, target, { kind: 'heal' });
    assert.deepEqual([r.healBeforeSuppression, r.healAfterSuppression, r.healSuppressed, r.value, r.hpCapped, r.overheal], [21, 10, 11, 5, 5, 5]);
    assert.deepEqual([r.hpBefore, r.hpAfter, r.shieldBefore, r.shieldAfter], [95, 100, 3, 8]);
    assert.equal(r.reason, 'burn-heal-suppressed'); assert.equal(r.burning, true);
    assert.deepEqual(r.suppressionSources, [source]); assert.notEqual(r.suppressionSources[0], source);
    source.effectId = 'changed'; assert.equal(r.suppressionSources[0].effectId, 'burn:1');
  });
  check('TGR-07 无燃烧满血只截断，燃烧多来源只减半一次', () => {
    const r = effect(runtime([], CLASS_PASSIVES['支援者']), unit([], { hp: 100 }), { kind: 'heal' });
    assert.deepEqual([r.value, r.hpCapped, r.healSuppressed, r.overheal, r.reason], [0, 21, 0, 21, null]);
    assert.deepEqual(r.suppressionSources, []);
    const q = effect(runtime([{ type: 'burn', _source: { effectId: 'a' } }, { type: 'burn', _source: { effectId: 'b' } }]), unit([], { hp: 10 }), { kind: 'heal' }, 21, { multiplier: 2 });
    assert.equal(q.healAfterSuppression, 21); assert.equal(q.value, 21); assert.equal(q.hpCapped, 0);
    assert.equal(q.suppressionSources.length, 2); assert.equal(q.overheal, null);
  });
  check('TGR-08 燃烧不影响MP/TP及原onOverheal入参', () => {
    const rt = runtime([{ type: 'burn' }], { onOverheal(ctx) { assert.equal(ctx.oldHp, 90); assert.equal(ctx.healAmount, 10); return null; } });
    effect(rt, unit(), { kind: 'heal' });
    for (const kind of ['healMp', 'healTp']) assert.equal(effect(rt, unit(), { kind }).value, 21);
  });
  check('TGR-09 真实免疫结果携带详情且无状态写入', () => {
    for (const [kind, dot, tag] of [['dot', 'poison', '耐毒'], ['dot', 'burn', '防火'], ['stun', null, '钢体']]) {
      const rt = runtime(); const r = effect(rt, unit(['[' + tag + ']']), { kind, dot, debuff: true });
      assert.equal(r.immune, true); assert.equal(r.reason, r.immunity.reason); assert.equal(rt.writes.length, 0);
    }
    const rt = runtime(); assert.equal(effect(rt, unit(), { kind: 'stun', debuff: true }).immune, false);
    assert.equal(rt.writes.length, 1);
  });
  check('TGR-10 屏障统一阻断所有负面槽不改既挂状态', () => {
    for (const kind of ['buff', 'dot', 'stun', 'paralyze', 'drainMp', 'taunt']) {
      const existing = { type: 'poison', value: 9 };
      const rt = runtime([existing]); let calls = 0;
      rt.interceptEffect = (caster, target, slot) => { calls++; assert.equal(slot.definition.kind, kind); return { barrierId: 'barrier:1', blockedTag: 'test', eventId: 'event:1' }; };
      const target = unit(); const before = structuredClone(target.ref);
      const r = effect(rt, target, { kind, debuff: true, dot: 'poison', field: 'atk' });
      assert.equal(r.kind, 'blocked'); assert.equal(r.reason, 'barrier-debuff'); assert.equal(r.barrierId, 'barrier:1'); assert.equal(r.blockedTag, 'test');
      assert.equal(calls, 1); assert.equal(rt.writes.length, 0); assert.deepEqual(target.ref, before); assert.deepEqual(rt.buffsOf(), [existing]);
    }
  });
  check('TGR-11 正面与自代价绕过屏障，null回调原效果落地', () => {
    const rt = runtime(); rt.interceptEffect = () => { throw new Error('不应拦截'); };
    assert.equal(effect(rt, unit(), { kind: 'buff', field: 'atk' }).value, 21);
    assert.equal(effect(rt, unit(), { kind: 'buff', field: 'atk', debuff: true, selfCost: true }, 21, { slot: { target: 'self' }, multiplier: 2 }).value, -21);
    rt.interceptEffect = () => null;
    assert.equal(effect(rt, unit(), { kind: 'dot', dot: 'poison', debuff: true }).kind, 'dot');
  });
  check('TGR-12 所有效果结果统一来源包括零值和耗尽', () => {
    for (const definition of [{ kind: 'shield' }, { kind: 'drainMp' }, { kind: 'taunt' }, { kind: 'mainPoint' }, { kind: 'damageGuard' }, { kind: 'counter' }, { kind: 'dispel' }, { kind: 'paralyze' }, { kind: 'variant', variant: '复活' }, { kind: 'variant', variant: '流体' }]) {
      assert.ok(effect(runtime(), unit(), definition));
    }
  });
  return { cases };
} } };
