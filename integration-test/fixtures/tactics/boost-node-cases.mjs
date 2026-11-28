import assert from 'node:assert/strict';
import { createBattle, BASIC_ATTACK } from '../../../tactics/src/battle.mjs';
import { parseSkill, parseItem } from '../../../tactics/src/parser.mjs';
import { resolveBoostModifiers, boostAffordable, nextBoostTier, applyBoostSkill } from '../../../tactics/src/boost.mjs';
import { createHeroFlameFx } from '../../../tactics/src/hero-flame-fx.mjs';
import { createUiSfx } from '../../../tactics/src/ui-sfx.mjs';

const scene = { sceneId: 'boost-node', grid: { columns: 20, rows: 12, metersPerCell: 1 }, ground: {}, objects: [], encounter: true };
const at = (col, row = 4) => ({ col, row, facing: 0 });
const aim = (b, id) => {
  const p = b.ctx.placementsById[id], fp = b.ctx.footprintsById[id];
  return { x: p.col + fp.width / 2, y: p.row + fp.height / 2, targetId: id };
};
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 100;
  return { id, name: id, side, level: opts.level, classType: opts.classType,
    controller: opts.controller || (side === 'enemy' ? 'ai' : 'player'), footprint: opts.footprint || { width: 1, height: 1 },
    skills: opts.skills || [], items: [], attrTags: [], ref: {
      hp, maxHp: opts.maxHp ?? hp, mp: opts.mp ?? 40, maxMp: opts.maxMp ?? 40,
      tp: opts.tp ?? 100, maxTp: opts.maxTp ?? 100, atk: opts.atk ?? 20, def: 0,
      spd: opts.spd ?? (side === 'hero' ? 300 : 100), evasion: 0, perception: 100,
      moveDistance: opts.moveDistance ?? 6, strength: 60, totalWeight: 40, ...opts.ref,
    } };
}
function make(units, placements) {
  const b = createBattle({ units, placementsById: structuredClone(placements), scene, random: () => 0.5 });
  b.start(); return b;
}
const attack = parseSkill('【Boost直击】[伤害;power:12][必中][TP:5][范围:单体;射程:12]');
const delayed = parseSkill('【Boost延迟】[火焰;power:10][必中][延迟:3][范围:单体;射程:12]');
const debuff = parseSkill('【Boost减益】[中毒;power:8][必中][Turns:2][范围:单体;射程:12]');
const cross = parseSkill('【Boost十字】[枪击;power:20][必中][范围:单体;射程:12]');
const multi = { ...cross, name: 'Boost多段', type2: cross.type, power2: 20, type3: cross.type, power3: 20 };
const extra = parseSkill('【Boost再动】[再动:1][范围:自身]');
const prep = parseSkill('【Boost准备】[火焰;power:10][必中][延迟:1][范围:单体;射程:12]');

export const groups = {
  BOOST: { async run() {
    const cases = [];
    const check = (id, pass, detail = '') => cases.push({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    const test = (id, fn) => {
      try { fn(); check(id, true); }
      catch (e) { check(id, false, e.stack || String(e)); }
    };
    test('BOOST-01 升档TP按基础技能TP逐档递增；不足时下一个档位回归0', () => {
      assert.deepEqual([0, 1, 2, 3].map(t => resolveBoostModifiers(attack, t).tpCost), [0, 20, 40, 60]);
      assert.equal(boostAffordable({ ...attack, tpCost: 10 }, 3, 70), true);
      assert.equal(boostAffordable({ ...attack, tpCost: 11 }, 3, 70), false);
      assert.equal(nextBoostTier(attack, 2, 59), 0);
      assert.equal(nextBoostTier(attack, 1, 100), 2);
    });

    test('BOOST-02 通用威力与Aim按0~3档累计，延迟伤害保底并行、纯减益按控制行', () => {
      assert.deepEqual([0, 1, 2, 3].map(t => resolveBoostModifiers(attack, t).powerMultiplier), [1, 1.1, 1.25, 1.5]);
      assert.deepEqual([0, 1, 2, 3].map(t => resolveBoostModifiers(attack, t).aimBonus), [0, 20, 40, 70]);
      assert.deepEqual([1, 2, 3].map(t => resolveBoostModifiers(delayed, t).powerMultiplier), [1.1, 1.25, 1.5]);
      assert.deepEqual([1, 2, 3].map(t => resolveBoostModifiers(delayed, t).aimBonus), [20, 40, 70]);
      assert.deepEqual([1, 2, 3].map(t => resolveBoostModifiers(debuff, t).powerMultiplier), [1.1, 1.1, 1.1]);
      assert.deepEqual([1, 2, 3].map(t => resolveBoostModifiers(debuff, t).aimBonus), [20, 20, 20]);
    });

    test('BOOST-03 延迟减回合分档、减益延时与驱散、范围和位移加成符合契约', () => {
      assert.deepEqual([0, 1, 2, 3].map(t => resolveBoostModifiers(delayed, t).delayReduction), [0, 0, 1, 3]);
      assert.deepEqual([0, 1, 2, 3].map(t => resolveBoostModifiers(debuff, t).durationBonus), [0, 0, 1, 1]);
      assert.equal(resolveBoostModifiers(debuff, 3).dispelCount, 1);
      assert.deepEqual([0, 1, 2, 3].map(t => resolveBoostModifiers(attack, t).displacementBonus), [0, 1, 3, 6]);
      assert.equal(resolveBoostModifiers(attack, 2).rangeBonus, 1);
      assert.equal(resolveBoostModifiers(attack, 3).radiusBonus, 1);
      assert.equal(resolveBoostModifiers(cross, 3).splashMultiplier, 0.5);
    });

    test('BOOST-04 applyBoostSkill不改原技能、重复应用不叠加且power0仍保留', () => {
      const zero = { ...attack, name: '零威力', power: 0 };
      const original = structuredClone(attack);
      const tier3 = applyBoostSkill(attack, 3);
      const again = applyBoostSkill(tier3, 3);
      assert.deepEqual(attack, original);
      assert.equal(tier3.power, attack.power * 1.5);
      assert.equal(again.power, tier3.power);
      assert.equal(applyBoostSkill(zero, 3).power, 0);
      assert.equal(applyBoostSkill(attack, 0), attack);
    });

    test('BOOST-05 档位仅预览不扣TP，实际施放扣基础TP加20乘档位', () => {
      const paidSkill = { ...attack, tpCost: 5 };
      const b = make([unit('h', 'hero', { skills: [paidSkill], tp: 100 }), unit('e', 'enemy')], { h: at(2), e: at(5) });
      assert.equal(typeof b.boostState, 'function');
      assert.equal(typeof b.setBoostTier, 'function');
      assert.equal(typeof b.effectiveSkill, 'function');
      assert.ok(b.setBoostTier(2, paidSkill).ok);
      const before = b.snapshot();
      const preview = b.previewAttack(paidSkill, aim(b, 'e'));
      assert.ok(preview.ok);
      assert.equal(b.ctx.units.find(u => u.id === 'h').ref.tp, 100);
      assert.equal(before.boostTier, 2);
      assert.equal(before.boostCanChange, true);
      const result = b.attack(paidSkill, aim(b, 'e'));
      assert.ok(result.ok);
      assert.equal(result.costSummary.tp, 45);
      assert.equal(b.ctx.units.find(u => u.id === 'h').ref.tp, 60);
    });

    test('BOOST-06 startPreparation扣TP一次，减到0仍保留ready快照并经attack释放', () => {
      const zeroDelay = { ...prep, delay: 1 };
      const b = make([unit('h', 'hero', { skills: [zeroDelay], tp: 100 }), unit('e', 'enemy')], { h: at(2), e: at(5) });
      assert.ok(b.setBoostTier(2, zeroDelay).ok);
      assert.equal(b.effectiveSkill(zeroDelay).delay, 0);
      const started = b.startPreparation(zeroDelay);
      assert.ok(started.ok && started.preparing);
      assert.equal(b.ctx.units.find(u => u.id === 'h').ref.tp, 60);
      assert.equal(started.costSummary.tp, 40);
      const ready = b.snapshot().preparation;
      assert.ok(ready && ready.ready);
      const released = b.attack(zeroDelay, aim(b, 'e'));
      assert.ok(released.ok);
      assert.equal(b.ctx.units.find(u => u.id === 'h').ref.tp, 65);
    });

    test('BOOST-07 单体十字50%溅射可击中相邻十字目标且预览目标集一致', () => {
      const b = make([unit('h', 'hero', { skills: [cross], atk: 0 }), unit('e', 'enemy', { hp: 500 }), unit('n', 'enemy', { hp: 500 })],
        { h: at(2, 4), e: at(6, 4), n: at(6, 5) });
      assert.ok(b.setBoostTier(3, cross).ok);
      const query = b.previewAttack(cross, aim(b, 'e'));
      const result = b.attack(cross, aim(b, 'e'));
      assert.ok(query.ok && result.ok);
      assert.ok(query.targetIds.includes('n'));
      assert.ok(result.hits.some(hit => hit.targetId === 'n'));
      assert.ok(result.hits.find(hit => hit.targetId === 'n').hpDmg < result.hits.find(hit => hit.targetId === 'e').hpDmg);
    });

    test('BOOST-08 大单位多个占格不造成重复溅射命中', () => {
      const big = unit('big', 'enemy', { footprint: { width: 2, height: 2 }, hp: 500 });
      const b = make([unit('h', 'hero', { skills: [cross] }), unit('e', 'enemy', { hp: 500 }), big],
        { h: at(2, 4), e: at(7, 4), big: at(7, 5) });
      assert.ok(b.setBoostTier(3, cross).ok);
      const result = b.attack(cross, aim(b, 'e'));
      assert.ok(result.ok);
      assert.equal(result.hits.filter(hit => hit.targetId === 'big').length, 1);
    });

    test('BOOST-09 多段与多杀时MAX每次技能仅返还1万能行动点', () => {
      const b = make([unit('h', 'hero', { skills: [multi], atk: 500 }), unit('e', 'enemy', { hp: 20 }), unit('e2', 'enemy', { hp: 20 })],
        { h: at(2, 4), e: at(5, 4), e2: at(5, 5) });
      assert.ok(b.setBoostTier(3, multi).ok);
      const before = b.snapshot().resources.universal;
      const result = b.attack(multi, aim(b, 'e'));
      assert.ok(result.ok);
      assert.equal(result.hits.filter(hit => hit.down).length, 2);
      assert.equal(result.hits.find(hit => hit.targetId === 'e2').segments.length, 2);
      assert.equal(b.snapshot().resources.universal - before, 1);
    });

    test('BOOST-10 普通技能与Boost施放后均可重新投入，连续两招独立快照与扣费', () => {
      const b = make([unit('h', 'hero', { skills: [extra, attack] }), unit('e', 'enemy')], { h: at(2), e: at(5) });
      assert.ok(b.attack(extra).ok);
      assert.equal(b.boostState().canChange, true);
      assert.ok(b.setBoostTier(1, attack).ok);
      const first = b.attack(attack, aim(b, 'e'));
      assert.ok(first.ok);
      assert.equal(first.skill.boostTier, 1);
      assert.equal(first.costSummary.tp, 25);
      assert.equal(b.ctx.units[0].ref.tp, 80);
      assert.deepEqual(b.boostState(), { tier: 0, canChange: true });
      assert.ok(b.cycleBoost(attack).ok);
      assert.equal(b.setBoostTier(2, attack).tier, 2);
      const second = b.attack(attack, aim(b, 'e'));
      assert.ok(second.ok);
      assert.equal(second.skill.boostTier, 2);
      assert.equal(second.costSummary.tp, 45);
      assert.equal(b.ctx.units[0].ref.tp, 40);
      assert.equal(first.skill.boostTier, 1);
      assert.deepEqual(b.boostState(), { tier: 0, canChange: true });
    });

    test('BOOST-10b 移动后仍可投入，准备中冻结且释放后重新开放', () => {
      const b = make([unit('h', 'hero', { skills: [delayed] }), unit('e', 'enemy')], { h: at(2), e: at(5) });
      assert.ok(b.move(3, 4).ok);
      assert.equal(b.boostState().canChange, true);
      assert.equal(b.setBoostTier(3, delayed).tier, 3);
      assert.ok(b.startPreparation(delayed).ok);
      assert.equal(b.boostState().canChange, false);
      assert.equal(b.cycleBoost(delayed).ok, false);
      const released = b.attack(delayed, aim(b, 'e'));
      assert.ok(released.ok);
      assert.equal(released.costSummary.tp, 0);
      assert.deepEqual(b.boostState(), { tier: 0, canChange: true });
      assert.equal(b.setBoostTier(1, delayed).tier, 1);
      assert.equal(b.setBoostTier(3, delayed).tier, 0);
    });

    test('BOOST-10c 物品使用后保持头像可投入且不吞掉预选档位', () => {
      const item = parseItem('【测试药剂】[回复:5][道具][次数:2][范围:自身]');
      const b = make([unit('h', 'hero', { skills: [attack] }), unit('e', 'enemy')], { h: at(2), e: at(5) });
      assert.equal(b.setBoostTier(1, attack).tier, 1);
      assert.ok(b.useItem(item).ok);
      assert.deepEqual(b.boostState(), { tier: 1, canChange: true });
      assert.equal(b.setBoostTier(2, attack).tier, 2);
    });

    test('BOOST-11 换人或自然行动重置档位与可变更状态', () => {
      const b = make([unit('h', 'hero', { skills: [attack], spd: 400 }), unit('peer', 'hero', { spd: 300 }), unit('e', 'enemy', { spd: 100 })],
        { h: at(2), peer: at(3), e: at(7) });
      assert.ok(b.setBoostTier(2, attack).ok);
      assert.ok(b.attack(attack, aim(b, 'e')).ok);
      b.endAction();
      const reset = b.snapshot();
      assert.equal(reset.boostTier, 0);
      assert.equal(reset.boostCanChange, true);
      assert.equal(reset.currentId, 'peer');
      b.endAction();
      assert.equal(b.snapshot().boostTier, 0);
    });

    test('BOOST-12 普攻TP+20、其他施法TP+5且Boost不放大资源返还', () => {
      const b = make([unit('h', 'hero', { skills: [extra], tp: 80 }), unit('e', 'enemy')], { h: at(2), e: at(3) });
      assert.ok(b.setBoostTier(1, BASIC_ATTACK).ok);
      const basic = b.attack(BASIC_ATTACK, aim(b, 'e'));
      assert.ok(basic.ok);
      assert.equal(b.ctx.units.find(u => u.id === 'h').ref.tp, 80);
      assert.equal(basic.costSummary.tp, 20);
      b.endAction();
      for (let i = 0; i < 8 && b.snapshot().currentId !== 'h'; i++) b.endAction();
      assert.ok(b.setBoostTier(3, extra).ok);
      const granted = b.attack(extra);
      assert.ok(granted.ok);
      assert.equal(b.ctx.units.find(u => u.id === 'h').ref.tp, 25);
      assert.equal(granted.costSummary.tp, 60);
      assert.equal(b.snapshot().resources.universal, 1);
    });

    test('BOOST-13 非Boost技能仍按原攻击预览和费用结算', () => {
      const plain = parseSkill('【普通测试】[伤害;power:10][必中][范围:单体;射程:12]');
      const b = make([unit('h', 'hero', { skills: [plain], tp: 100 }), unit('e', 'enemy')], { h: at(2), e: at(5) });
      const beforeTp = b.ctx.units.find(u => u.id === 'h').ref.tp;
      const preview = b.previewAttack(plain, aim(b, 'e'));
      assert.ok(preview.ok);
      const result = b.attack(plain, aim(b, 'e'));
      assert.ok(result.ok);
      assert.equal(b.ctx.units.find(u => u.id === 'h').ref.tp, beforeTp);
      assert.equal(b.boostState().tier, 0);
    });

    test('BOOST-14 预测伤害与真实攻击原始hpDmg在固定中值随机下逐目标一致', () => {
      const b = make([unit('h', 'hero', { skills: [attack], atk: 20 }), unit('e', 'enemy', { hp: 500, def: 0 })],
        { h: at(2), e: at(5) });
      assert.ok(b.setBoostTier(3, attack).ok);
      const point = aim(b, 'e');
      const predicted = b.predictAttack(attack, point);
      assert.ok(predicted.ok);
      const previewHit = predicted.damagePreview.find(hit => hit.targetId === 'e');
      assert.ok(previewHit && Number.isFinite(previewHit.raw));
      const actual = b.attack(attack, point);
      assert.ok(actual.ok);
      const actualHit = actual.hits.find(hit => hit.targetId === 'e');
      assert.equal(actualHit.segments[0].rawDmg, previewHit.raw);
      assert.equal(actualHit.hpDmg, previewHit.estimatedHpDmg);
    });

    test('BOOST-15 位移增益落实距离且AOE实际命中集等于预测命中集', () => {
      const push = parseSkill('【强化击退】[伤害;power:8][必中][位移:击退;距离:1][范围:单体;射程:12]');
      const blast = parseSkill('【强化爆炸】[火焰;power:8][必中][范围:爆炸;射程:12;半径:1]');
      const b = make([unit('h', 'hero', { skills: [push, blast], strength: 100 }), unit('e', 'enemy', { hp: 500 }),
        unit('near', 'enemy', { hp: 500 }), unit('far', 'enemy', { hp: 500 })],
      { h: at(2, 4), e: at(5, 4), near: at(8, 4), far: at(9, 4) });
      assert.ok(b.setBoostTier(1, push).ok);
      const pushResult = b.attack(push, aim(b, 'e'));
      assert.ok(pushResult.ok);
      const moved = pushResult.hits.find(hit => hit.targetId === 'e').displacement;
      assert.ok(moved && moved.distance >= 2);
      b.endAction();
      for (let i = 0; i < 8 && b.snapshot().currentId !== 'h'; i++) b.endAction();
      assert.ok(b.setBoostTier(3, blast).ok);
      const center = { x: 7.5, y: 4.5 };
      const preview = b.previewAttack(blast, center);
      assert.ok(preview.ok);
      assert.equal(preview.shape.radius, 2);
      const result = b.attack(blast, center);
      assert.ok(result.ok);
      assert.deepEqual(result.hits.map(hit => hit.targetId).sort(), preview.targetIds.slice().sort());
    });

    test('BOOST-16 MAX再动返还后可重新投入，但不足支付MAX仍回归0档', () => {
      const b = make([unit('h', 'hero', { skills: [extra], tp: 100 }), unit('e', 'enemy')], { h: at(2), e: at(5) });
      assert.ok(b.setBoostTier(3, extra).ok);
      const grant = b.attack(extra);
      assert.ok(grant.ok);
      assert.equal(b.snapshot().resources.universal, 1);
      assert.equal(b.boostState().canChange, true);
      const tp = b.ctx.units[0].ref.tp;
      assert.equal(b.cycleBoost(extra).tier, 1);
      assert.equal(b.setBoostTier(3, extra).tier, 0);
      assert.equal(b.ctx.units[0].ref.tp, tp);
    });

    test('BOOST-17 蓄力期间冻结Boost档位并跨回合保持技能快照', () => {
      const longPrep = parseSkill('【跨回合准备】[火焰;power:10][必中][延迟:8][范围:单体;射程:12]');
      const b = make([unit('h', 'hero', { skills: [longPrep], tp: 100, spd: 400 }), unit('peer', 'hero', { spd: 300 }),
        unit('e', 'enemy', { spd: 100 })], { h: at(2), peer: at(3), e: at(7) });
      assert.ok(b.setBoostTier(3, longPrep).ok);
      const started = b.startPreparation(longPrep);
      assert.ok(started.ok && started.preparing);
      const frozen = b.snapshot().preparation.skill;
      assert.equal(frozen.boostTier, 3);
      assert.equal(b.boostState().canChange, false);
      b.endAction();
      for (let i = 0; i < 8 && b.snapshot().currentId !== 'h'; i++) b.endAction();
      assert.equal(b.snapshot().currentId, 'h');
      assert.equal(b.snapshot().preparation.skill.boostTier, 3);
      assert.equal(b.setBoostTier(1, longPrep).ok, false);
    });

    test('BOOST-18 行动轮换后档位重置并允许重新选档', () => {
      const b = make([unit('h', 'hero', { skills: [attack], spd: 400 }), unit('peer', 'hero', { spd: 300 }),
        unit('e', 'enemy', { spd: 100 })], { h: at(2), peer: at(3), e: at(7) });
      assert.ok(b.setBoostTier(2, attack).ok);
      assert.ok(b.attack(attack, aim(b, 'e')).ok);
      assert.equal(b.boostState().canChange, true);
      assert.equal(b.setBoostTier(1, attack).tier, 1);
      b.endAction();
      assert.equal(b.snapshot().boostTier, 0);
      assert.equal(b.boostState().canChange, true);
      assert.ok(b.setBoostTier(1, attack).ok);
    });

    test('BOOST-19 MAX减益延长持续并只驱散一个正面增益', () => {
      const b = make([unit('h', 'hero', { skills: [debuff] }), unit('e', 'enemy', { hp: 500 })], { h: at(2), e: at(5) });
      b.buffsOf('e').push({ type: 'def', value: 10, duration: 3 }, { type: 'atk', value: 5, duration: 3 }, { type: 'eva', value: -5, duration: 3 });
      b.setBoostTier(3, debuff);
      const result = b.attack(debuff, aim(b, 'e'));
      assert.equal(result.effects.find(e => e.kind === 'dot').turns, debuff.turns + 1);
      assert.equal(result.effects.filter(e => e.boost).length, 1);
      assert.equal(b.buffsOf('e').some(b => b.type === 'def'), false);
      assert.equal(b.buffsOf('e').some(b => b.type === 'atk' && b.value === 5), true);
      assert.equal(b.buffsOf('e').some(b => b.type === 'eva' && b.value === -5), true);
    });
    test('BOOST-20 威力同步放大治疗与护盾，充能与行动点不放大', () => {
      for (const [tag, kind, resource] of [['回复', 'heal', 'hp'], ['护盾', 'shield', 'shield']]) {
        const skill = { ...cross, name: tag, type: '[' + tag + ']', power: 20, range: { type: '自身' } };
        const h = unit('h', 'hero', { hp: 50, maxHp: 500, skills: [skill] });
        const b = make([h, unit('e', 'enemy')], { h: at(2), e: at(5) });
        b.setBoostTier(3, skill);
        const result = b.attack(skill);
        assert.equal(result.effects.find(e => e.kind === kind).value, 30);
        assert.equal(h.ref[resource], resource === 'hp' ? 80 : 30);
      }
      const skill = { ...cross, name: '资源充能', type: '[充能]', power: 20, range: { type: '自身' } };
      const b = make([unit('h', 'hero', { skills: [skill] }), unit('e', 'enemy')], { h: at(2), e: at(5) });
      b.setBoostTier(3, skill);
      const result = b.attack(skill);
      assert.equal(result.effects.find(e => e.kind === 'healTp').value, 20);
      assert.equal(b.ctx.units[0].ref.tp, 65);
    });
    test('BOOST-21 眩晕强化延长一次跳过，0档菜单校验不改变所选档位', () => {
      const stun = { ...cross, name: '眩晕', type: '[眩晕]', power: 0 };
      const b = make([unit('h', 'hero', { skills: [stun], tp: 70 }), unit('e', 'enemy')], { h: at(2), e: at(5) });
      b.setBoostTier(3, stun);
      assert.equal(b.skillStatus({ ...stun, tpCost: 15 }).ok, false);
      assert.equal(b.skillStatus({ ...stun, tpCost: 15 }, undefined, 0).ok, true);
      assert.equal(b.boostState().tier, 3);
      assert.equal(b.attack(stun, aim(b, 'e')).ok, true);
      assert.equal(b.battleState.combatState.clock.units.e.stun.remaining, 2);
    });
    test('BOOST-22 真实火焰模块逐帧执行：文字抠除、升档与圆形释放无作用域错误', () => {
      const saved = Object.fromEntries(['document', 'window', 'requestAnimationFrame', 'cancelAnimationFrame'].map(k => [k, globalThis[k]]));
      let nextFrame, arcs = 0, masks = 0, removed = false;
      const gradient = { addColorStop() {} };
      const ctx = new Proxy({ createRadialGradient: () => gradient, createLinearGradient: () => { masks++; return gradient; }, arc: () => arcs++ }, {
        get: (o, k) => k in o ? o[k] : () => {},
      });
      const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
      const avatar = { getBoundingClientRect: () => rect(20, 380, 64, 64) };
      const card = { dataset: { boostTier: '3', boostPulse: '0', boostCast: '0', boostCastTier: '3' }, offsetWidth: 240,
        classList: { contains: k => k === 't-current' }, matches: () => false,
        querySelector: k => k === '.t-hero-avatar' ? avatar : null, getBoundingClientRect: () => rect(20, 400, 240, 80) };
      const root = { clientWidth: 400, clientHeight: 500, appendChild() {}, getBoundingClientRect: () => rect(0, 0, 400, 500) };
      let fx;
      try {
        globalThis.document = { createElement: () => ({ getContext: () => ctx, setAttribute() {}, remove() { removed = true; } }) };
        globalThis.window = { devicePixelRatio: 1 };
        globalThis.requestAnimationFrame = fn => { nextFrame = fn; return 1; };
        globalThis.cancelAnimationFrame = () => {};
        fx = createHeroFlameFx(root, () => ({ querySelectorAll: () => [card] }), () => []);
        nextFrame(1000);
        card.dataset.boostPulse = '1'; nextFrame(1050);
        card.dataset.boostCast = '1'; nextFrame(1100);
        assert.ok(masks >= 6, '各帧均执行上下文字保护渐变');
        assert.ok(arcs > 0, '释放波纹必须走圆弧绘制');
        fx.destroy(); assert.equal(removed, true); fx = null;
      } finally {
        fx?.destroy();
        for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
      }
    });
    test('BOOST-24 混合技能按槽并行叠加：伤害保底50%，减益10%并延时驱散', () => {
      const mixed = { ...cross, name: '混合强化', power: 50, type2: '[降防]', power2: 20, slotTurns2: 3 };
      const b = make([unit('h', 'hero', { skills: [mixed] }), unit('e', 'enemy', { hp: 500 })], { h: at(2), e: at(5) });
      b.setBoostTier(3, mixed);
      const eff = b.effectiveSkill(mixed);
      assert.equal(eff.power, 75);
      assert.equal(eff.power2, 22);
      assert.equal(eff.hit, 170);
      assert.equal(eff.slotTurns2, 4);
      const predicted = b.predictAttack(mixed, aim(b, 'e'));
      const result = b.attack(mixed, aim(b, 'e'));
      assert.equal(result.hits[0].hpDmg, 75);
      assert.equal(predicted.damagePreview[0].estimatedHpDmg, result.hits[0].hpDmg);
      assert.equal(result.effects.find(e => e.kind === 'buff' && e.field === 'def').value, -22);
    });
    try {
      const sources = [], played = [], volumes = [], loopVolumes = [];
      const context = { state: 'running', currentTime: 0,
        createBufferSource() { const source = { loop: false, stopped: 0, disconnected: 0, connect() {}, start() {}, stop() { this.stopped++; }, disconnect() { this.disconnected++; } }; sources.push(source); return source; },
        createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime(v) { loopVolumes.push(v); } }, connect() {}, disconnect() {} }),
      };
      const mixer = { context: () => context, output: () => ({}), prepare: async () => ({ duration: 14 }),
        play: (url, opts) => { played.push(url); volumes.push(opts.vol); return () => {}; } };
      const urls = Object.fromEntries(['lv1', 'lv2', 'lv3', 'lv1s', 'lv2s', 'lv3s', 'cancel', 'cast'].map(k => ['boost_' + k, k]));
      const ui = createUiSfx(mixer, urls);
      ui.setBoost('h', 1); ui.setBoost('h', 2); ui.setBoost('h', 0);
      await Promise.resolve();
      assert.equal(sources.length, 0, '快速取消后旧解码不得重启气场');
      assert.deepEqual(played, ['lv1', 'lv2', 'cancel']);
      ui.setBoost('h', 3); await Promise.resolve();
      assert.equal(sources.length, 1); assert.equal(sources[0].loop, true);
      ui.castBoost('h', 3);
      assert.equal(sources[0].stopped, 1); assert.equal(sources[0].disconnected, 1);
      assert.equal(played.at(-1), 'cast');
      assert.ok(volumes.every(v => v === 0.84), 'Boost 一次性音效翻倍');
      assert.deepEqual(loopVolumes, [0.44], 'Boost 循环音效翻倍');
      ui.setBoost('h', 1); ui.clearBoost(); await Promise.resolve();
      assert.equal(sources.length, 1, '清场后不得异步回放待机音');
      check('BOOST-23 原版音效升档、无缝循环、取消/释放/清场与异步竞态', true);
    } catch (e) { check('BOOST-23 原版音效升档、无缝循环、取消/释放/清场与异步竞态', false, e.stack || String(e)); }
    return { cases };
  } },

};
