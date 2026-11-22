// ==========================================
// 战棋 FX02 效果槽结算器（原版 index.html registerTagHandler L21117-21470 的战棋迁移）
// 输入 rt = battle 注入的运行时（buffs/时钟/日志/随机），输出结算描述数组；不读 DOM。
// 数值口径：治疗/增益/减益 power 默认 50、毒燃 max(1,floor(power))、燃烧减半治疗、
// 免伤一次性消耗、回避一次性消耗、闪避持续、吸蓝以目标当前 MP 为上限——全部原值迁移。
// ==========================================

import { isImmuneToPoison, isImmuneToBurn } from './variant-rules.mjs';
import { hasVariantTag } from './variant-rules.mjs';

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// 单槽结算入口。slot 来自 skillSlots（规范视图）；targets 为本槽目标单位数组。
// 返回 { applied: [描述...] }；描述含 kind/targetId/tag/value/turns 与日志索引区间。
export function applyEffectSlot(rt, { caster, slot, targets, skill, skillKey }) {
  const applied = [];
  const def = slot.definition;
  const power = slot.power;
  const turns = slot.turns;
  for (const target of targets) {
    const r = applyToTarget(rt, { caster, target, slot, def, power, turns, skill, skillKey });
    if (r) applied.push(r);
  }
  return { applied };
}

function applyToTarget(rt, { caster, target, slot, def, power, turns, skill, skillKey }) {
  const ref = target.ref;
  const source = rt.statusSource(target.id, { casterId: caster.id, skillId: skillKey }, slot.tag + ':' + slot.index);
  switch (def.kind) {
    case 'heal': {
      const burning = rt.buffsOf(target.id).some(b => b.type === 'burn');
      const amount = burning ? Math.floor(power / 2) : power;
      const oldHp = ref.hp;
      ref.hp = clamp(ref.hp + amount, 0, ref.maxHp);
      let overheal = null;
      const passive = rt.passiveOf(caster);
      if (passive && passive.onOverheal) {
        const o = passive.onOverheal({ caster, target, oldHp, healAmount: amount });
        if (o && o.shield > 0) { ref.shield = (ref.shield || 0) + o.shield; overheal = o.shield; }
      }
      rt.addLog(caster.name + ' 治疗 ' + target.name + ' +' + (ref.hp - oldHp) + ' HP' + (burning ? '（燃烧下治疗减半）' : '') + (overheal ? ' · 溢出转盾+' + overheal : ''));
      return { kind: 'heal', targetId: target.id, tag: slot.tag, value: ref.hp - oldHp, burning, overheal };
    }
    case 'healMp': {
      const before = ref.mp;
      ref.mp = clamp(ref.mp + power, 0, ref.maxMp);
      rt.addLog(caster.name + ' 为 ' + target.name + ' 恢复 ' + (ref.mp - before) + ' MP');
      return { kind: 'healMp', targetId: target.id, tag: slot.tag, value: ref.mp - before };
    }
    case 'healTp': {
      const before = ref.tp || 0;
      ref.tp = clamp((ref.tp || 0) + power, 0, ref.maxTp || 100);
      rt.addLog(caster.name + ' 为 ' + target.name + ' 恢复 ' + ((ref.tp || 0) - before) + ' TP');
      return { kind: 'healTp', targetId: target.id, tag: slot.tag, value: (ref.tp || 0) - before };
    }
    case 'buff': {
      // 减益为负值；自X 固定代价不做倍率放大（power 原值）、始终落地（上游已保证）
      const negative = !!def.debuff || slot.target === 'self' && def.selfCost;
      const value = negative ? -Math.abs(power) : Math.abs(power);
      const buff = { type: def.field, value, duration: turns, sourceKey: source.effectId };
      rt.registerBuff(target, buff, source);
      rt.addLog(target.name + ' ' + (negative ? '' : '') + slot.tag.replace(/\[|\]/g, '') + ' ' + (negative ? '-' : '+') + Math.abs(power) + ' · ' + turns + '回');
      return { kind: 'buff', targetId: target.id, tag: slot.tag, field: def.field, value, turns };
    }
    case 'shield': {
      ref.shield = (ref.shield || 0) + power;
      rt.addLog('为 ' + target.name + ' 附加 ' + power + ' 点护盾');
      return { kind: 'shield', targetId: target.id, tag: slot.tag, value: power };
    }
    case 'dot': {
      const immune = def.dot === 'poison' ? isImmuneToPoison(target, rt.buffsOf(target.id)) : isImmuneToBurn(target, rt.buffsOf(target.id));
      if (immune) { rt.addLog(target.name + ' 免疫了' + (def.dot === 'poison' ? '中毒' : '灼烧')); return { kind: 'dot', targetId: target.id, tag: slot.tag, immune: true }; }
      const strength = Math.max(1, Math.floor(power));
      rt.registerDot(target, def.dot, { strength, turns, casterId: caster.id, skillKey, slotTag: slot.tag });
      rt.addLog(target.name + (def.dot === 'poison' ? ' 中毒(可叠加) ' : ' 燃烧 ') + strength + ' · ' + turns + '回');
      return { kind: 'dot', targetId: target.id, tag: slot.tag, dot: def.dot, strength, turns };
    }
    case 'paralyze': {
      // 麻痹：每层闪避 -power 独立叠层倒计时；行动僵直概率 5%×层（≤20%）在行动开始判定
      const evaDown = Math.max(1, Math.floor(power));
      const source2 = rt.statusSource(target.id, { casterId: caster.id, skillId: skillKey }, slot.tag + ':' + slot.index + '#' + rt.nextStackSeq(target.id));
      rt.registerBuff(target, { type: 'paralyze', value: -evaDown, duration: turns, sourceKey: source2.effectId }, source2);
      const layers = rt.buffsOf(target.id).filter(b => b.type === 'paralyze').length;
      rt.addLog(target.name + ' 麻痹第' + layers + '层 · 避-' + evaDown + ' · ' + turns + '回 · 僵直概率' + Math.min(20, layers * 5) + '%');
      return { kind: 'paralyze', targetId: target.id, tag: slot.tag, layers, evaDown, turns };
    }
    case 'drainMp': {
      const drained = Math.max(0, Math.min(ref.mp || 0, power));
      if (drained <= 0) { rt.addLog(target.name + ' 已无法力可供抽取'); return { kind: 'drainMp', targetId: target.id, tag: slot.tag, drained: 0 }; }
      ref.mp = Math.max(0, (ref.mp || 0) - drained);
      caster.ref.mp = Math.min(caster.ref.maxMp, (caster.ref.mp || 0) + drained);
      rt.addLog(caster.name + ' 从 ' + target.name + ' 抽取 ' + drained + ' MP');
      return { kind: 'drainMp', targetId: target.id, tag: slot.tag, drained };
    }
    case 'taunt': {
      rt.registerBuff(target, { type: 'taunt', value: power, duration: turns, sourceKey: source.effectId }, source);
      rt.addLog(target.name + (power >= 0 ? ' 仇恨+' + power : ' 隐匿' + power) + ' · ' + turns + '回');
      return { kind: 'taunt', targetId: target.id, tag: slot.tag, value: power, turns };
    }
    case 'mainPoint': {
      const n = Math.max(1, Math.floor(power || 1));
      for (let i = 0; i < n; i++) rt.dispatchBattleClock({ type: 'grantMainPoint', targetId: target.id, sourceKey: caster.id + ':' + skillKey + ':mp' + i });
      rt.addLog(target.name + ' 再动 +' + n + ' 主行动点');
      return { kind: 'mainPoint', targetId: target.id, tag: slot.tag, points: n };
    }
    case 'damageGuard': {
      rt.registerBuff(target, { type: 'damageGuard', value: power, duration: Infinity, isConsumable: true, sourceKey: source.effectId }, source);
      rt.addLog(target.name + ' 免伤：下一次受击防御+' + power + '（一次性）');
      return { kind: 'damageGuard', targetId: target.id, tag: slot.tag, value: power };
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
