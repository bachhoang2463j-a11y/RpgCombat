// ==========================================
// 战棋 FX02 效果槽结算器（原版 index.html registerTagHandler L21117-21470 的战棋迁移）
// 输入 rt = battle 注入的运行时（buffs/时钟/日志/随机），输出结算描述数组；不读 DOM。
// 数值沿原版：即时恢复、属性点数增减、毒燃与麻痹叠层。
// 单避只化解本段；免伤由攻击实例持有整技累计池；护盾累加至耗尽。
// ==========================================

import { immunityReason } from './variant-rules.mjs';

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// 单槽结算入口。slot 来自 skillSlots（规范视图）；targets 为本槽目标单位数组。
// 返回 { applied: [描述...] }；描述含 kind/targetId/tag/value/turns 与日志索引区间。
export function applyEffectSlot(rt, { caster, slot, targets, skill, skillKey, multiplier = 1 }) {
  const applied = [];
  const def = slot.definition;
  const power = slot.power;
  const turns = slot.turns;
  const mult = multiplier > 1 ? multiplier : 1;
  for (const target of targets) {
    const source = rt.statusSource(target.id, { casterId: caster.id, skillId: skillKey }, slot.tag + ':' + slot.index);
    const barrier = def.debuff && !def.selfCost ? rt.interceptEffect?.(caster, target, slot) : null;
    const r = barrier
      ? { kind: 'blocked', targetId: target.id, tag: slot.tag, reason: 'barrier-debuff', barrierId: barrier.barrierId, blockedTag: barrier.blockedTag ?? slot.tag }
      : applyToTarget(rt, { caster, target, slot, def, power, turns, skill, skillKey, source, multiplier: mult });
    if (r) applied.push({ ...r, casterId: caster.id, slotIndex: slot.index, attackId: rt.currentAttackId(), effectId: source.effectId });
  }
  return { applied };
}

function applyToTarget(rt, { caster, target, slot, def, power, turns, skill, skillKey, source, multiplier = 1 }) {
  const ref = target.ref;
  const effPower = (slot.target === 'self' && def.selfCost) ? power : power * (multiplier > 1 ? multiplier : 1);
  switch (def.kind) {
    case 'heal': {
      const burns = rt.buffsOf(target.id).filter(b => b.type === 'burn');
      const burning = burns.length > 0;
      const amount = burning ? Math.floor(effPower / 2) : effPower;
      const oldHp = ref.hp;
      const shieldBefore = ref.shield || 0;
      ref.hp = clamp(ref.hp + amount, 0, ref.maxHp);
      let overheal = null;
      const passive = rt.passiveOf(caster);
      if (passive && passive.onOverheal) {
        const o = passive.onOverheal({ caster, target, oldHp, healAmount: amount });
        if (o && o.shield > 0) { ref.shield = (ref.shield || 0) + o.shield; overheal = o.shield; }
      }
      rt.addLog(caster.name + ' 治疗 ' + target.name + ' +' + (ref.hp - oldHp) + ' HP' + (burning ? '（燃烧下治疗减半）' : '') + (overheal ? ' · 溢出转盾+' + overheal : ''));
      return { kind: 'heal', targetId: target.id, tag: slot.tag, value: ref.hp - oldHp, burning, overheal, crit: multiplier > 1,
        healBeforeSuppression: effPower, healAfterSuppression: amount, healSuppressed: effPower - amount,
        hpBefore: oldHp, hpAfter: ref.hp, hpCapped: Math.max(0, oldHp + amount - ref.maxHp),
        shieldBefore, shieldAfter: ref.shield || 0, reason: burning ? 'burn-heal-suppressed' : null,
        suppressionSources: burns.map(b => structuredClone(b._source)),
      };
    }
    case 'healMp': {
      const before = ref.mp;
      ref.mp = clamp(ref.mp + effPower, 0, ref.maxMp);
      rt.addLog(caster.name + ' 为 ' + target.name + ' 恢复 ' + (ref.mp - before) + ' MP');
      return { kind: 'healMp', targetId: target.id, tag: slot.tag, value: ref.mp - before, crit: multiplier > 1 };
    }
    case 'healTp': {
      const before = ref.tp || 0;
      ref.tp = clamp((ref.tp || 0) + effPower, 0, ref.maxTp || 100);
      rt.addLog(caster.name + ' 为 ' + target.name + ' 恢复 ' + ((ref.tp || 0) - before) + ' TP');
      return { kind: 'healTp', targetId: target.id, tag: slot.tag, value: (ref.tp || 0) - before, crit: multiplier > 1 };
    }
    case 'buff': {
      // 减益为负值；自X 固定代价不做倍率放大（power 原值）、始终落地（上游已保证）
      const negative = !!def.debuff || slot.target === 'self' && def.selfCost;
      const value = negative ? -Math.abs(effPower) : Math.abs(effPower);
      const buff = { type: def.field, value, duration: def.consumable ? Infinity : turns, isConsumable: !!def.consumable, sourceKey: source.effectId };
      rt.registerBuff(target, buff, source);
      rt.addLog(target.name + ' ' + (negative ? '' : '') + slot.tag.replace(/\[|\]/g, '') + ' ' + (negative ? '-' : '+') + Math.abs(effPower) + ' · ' + turns + '回');
      return { kind: 'buff', targetId: target.id, tag: slot.tag, field: def.field, value, turns, crit: multiplier > 1 && !(slot.target === 'self' && def.selfCost) };
    }
    case 'shield': {
      ref.shield = (ref.shield || 0) + effPower;
      rt.addLog('为 ' + target.name + ' 附加 ' + effPower + ' 点护盾');
      return { kind: 'shield', targetId: target.id, tag: slot.tag, value: effPower, crit: multiplier > 1 };
    }
    case 'dot': {
      const immunity = immunityReason(target, def.dot === 'poison' ? 'poison' : 'burn', rt.buffsOf(target.id));
      if (immunity) { rt.addLog(target.name + ' 免疫了' + (def.dot === 'poison' ? '中毒' : '灼烧')); return { kind: 'dot', targetId: target.id, tag: slot.tag, immune: true, immunity, reason: immunity.reason }; }
      const strength = Math.max(1, Math.floor(effPower));
      rt.registerDot(target, def.dot, { strength, turns, casterId: caster.id, skillKey, slotTag: slot.tag });
      rt.addLog(target.name + (def.dot === 'poison' ? ' 中毒(可叠加) ' : ' 燃烧 ') + strength + ' · ' + turns + '回');
      return { kind: 'dot', targetId: target.id, tag: slot.tag, dot: def.dot, strength, turns, crit: multiplier > 1 };
    }
    case 'paralyze': {
      // 麻痹：每层闪避 -power 独立叠层倒计时；行动僵直概率 5%×层（≤20%）在行动开始判定
      const evaDown = Math.max(1, Math.floor(effPower));
      const source2 = rt.statusSource(target.id, { casterId: caster.id, skillId: skillKey }, slot.tag + ':' + slot.index + '#' + rt.nextStackSeq(target.id));
      rt.registerBuff(target, { type: 'paralyze', value: -evaDown, duration: turns, sourceKey: source2.effectId }, source2);
      const layers = rt.buffsOf(target.id).filter(b => b.type === 'paralyze').length;
      rt.addLog(target.name + ' 麻痹第' + layers + '层 · 避-' + evaDown + ' · ' + turns + '回 · 僵直概率' + Math.min(20, layers * 5) + '%');
      return { kind: 'paralyze', targetId: target.id, tag: slot.tag, layers, evaDown, turns, crit: multiplier > 1 };
    }
    case 'drainMp': {
      const drained = Math.max(0, Math.min(ref.mp || 0, effPower));
      if (drained <= 0) { rt.addLog(target.name + ' 已无法力可供抽取'); return { kind: 'drainMp', targetId: target.id, tag: slot.tag, drained: 0 }; }
      ref.mp = Math.max(0, (ref.mp || 0) - drained);
      caster.ref.mp = Math.min(caster.ref.maxMp, (caster.ref.mp || 0) + drained);
      rt.addLog(caster.name + ' 从 ' + target.name + ' 抽取 ' + drained + ' MP');
      return { kind: 'drainMp', targetId: target.id, tag: slot.tag, drained, crit: multiplier > 1 };
    }
    case 'taunt': {
      rt.registerBuff(target, { type: 'taunt', value: effPower, duration: turns, sourceKey: source.effectId }, source);
      rt.addLog(target.name + (effPower >= 0 ? ' 仇恨+' + effPower : ' 隐匿' + effPower) + ' · ' + turns + '回');
      return { kind: 'taunt', targetId: target.id, tag: slot.tag, value: effPower, turns, crit: multiplier > 1 };
    }
    case 'mainPoint': {
      const n = Math.max(1, Math.floor(power || 1));
      for (let i = 0; i < n; i++) rt.dispatchBattleClock({ type: 'grantMainPoint', targetId: target.id, sourceKey: caster.id + ':' + skillKey + ':mp' + i });
      rt.addLog(target.name + ' 再动 +' + n + ' 主行动点');
      return { kind: 'mainPoint', targetId: target.id, tag: slot.tag, points: n };
    }
    case 'damageGuard': {
      const attackId = skill.isReaction ? rt.currentAttackId() : null;
      const guardSource = { ...source, effectId: source.effectId + ':' + (attackId || 'pending') };
      rt.registerBuff(target, { type: 'damageGuard', value: power, duration: Infinity, attackId, sourceKey: source.effectId }, guardSource);
      rt.addLog(target.name + ' 免伤：当前整技累计额度 ' + power);
      return { kind: 'damageGuard', targetId: target.id, tag: slot.tag, value: power, attackId };
    }
    case 'stun': {
      const immunity = immunityReason(target, 'stun', rt.buffsOf(target.id));
      const immune = !!immunity;
      if (!immune) rt.dispatchBattleClock({ type: 'applyStun', unitId: target.id });
      rt.addLog(target.name + (immune ? ' 免疫眩晕（钢体）' : ' 被击晕，将跳过下一次自然行动'));
      return { kind: 'stun', targetId: target.id, tag: slot.tag, immune, immunity, reason: immunity?.reason ?? null };
    }
    case 'counter': {
      rt.registerBuff(target, { type: 'counter', value: power, duration: turns, sourceKey: source.effectId }, source);
      rt.addLog(target.name + ' 反击架势 · 附加威力+' + power + ' · ' + turns + '回');
      return { kind: 'counter', targetId: target.id, tag: slot.tag, value: power, turns };
    }
    case 'dispel': {
      const count = Math.max(1, Math.floor(power || 1));
      const removed = rt.dispelNegatives(target, count);
      rt.addLog(target.name + (removed.length ? ' 净化 ' + removed.length + ' 个负面状态' : ' 没有负面状态可驱散'));
      return { kind: 'dispel', targetId: target.id, tag: slot.tag, removed: removed.map(b => b.type) };
    }
    case 'variant': {
      if (def.variant === '复活' && (ref.variantReviveUsed || (ref.reviveCount || 0) <= 0)) {
        rt.addLog(target.name + ' 本场的【复活】机会已耗尽，重施不恢复次数');
        return { kind: 'variant', targetId: target.id, tag: slot.tag, exhausted: true };
      }
      rt.registerBuff(target, { type: 'variant', variant: def.variant, value: 1, duration: turns, sourceKey: source.effectId }, source);
      rt.addLog(target.name + ' 获得【' + def.variant + '】特性 · ' + turns + '回');
      return { kind: 'variant', targetId: target.id, tag: slot.tag, variant: def.variant, turns };
    }
    default:
      return null;
  }
}
