import { skillSlots } from './effect-definitions.mjs';

export const BOOST_TP_COST = [0, 20, 40, 60];

// 通用保底与专属机制并行；混合技能的伤害/治疗/护盾与减益槽分别修正。
export function resolveBoostModifiers(skill, tier) {
  const base = skill.boostBase || skill;
  const slots = skillSlots(base);
  const debuff = slots.some(slot => slot.debuff && !slot.definition.selfCost);
  const delayed = base.delay > 0;
  const general = slots.some(slot => slot.attack || ['heal', 'shield', 'barrier'].includes(slot.definition.kind));
  const specialized = (delayed || debuff) && !general;
  return {
    tier, tpCost: BOOST_TP_COST[tier],
    powerMultiplier: tier === 0 ? 1 : specialized ? 1.1 : [1, 1.1, 1.25, 1.5][tier],
    aimBonus: tier === 0 ? 0 : specialized ? 20 : [0, 20, 40, 70][tier],
    debuffPowerMultiplier: tier === 0 ? 1 : 1.1,
    delayReduction: delayed ? [0, 0, 1, 3][tier] : 0,
    durationBonus: debuff && tier >= 2 ? 1 : 0,
    dispelCount: debuff && tier === 3 ? 1 : 0,
    rangeBonus: tier >= 2 ? 1 : 0,
    radiusBonus: tier === 3 ? 1 : 0,
    splashMultiplier: tier === 3 && base.range?.type === '单体' && skillSlots(base).some(slot => slot.attack) ? 0.5 : 0,
    displacementBonus: [0, 1, 3, 6][tier],
  };
}

export function boostAffordable(skill, tier, tp) {
  return (skill?.boostBase?.tpCost ?? skill?.tpCost ?? 0) + BOOST_TP_COST[tier] <= tp;
}

export function nextBoostTier(skill, tier, tp) {
  const next = (tier + 1) % 4;
  return boostAffordable(skill, next, tp) ? next : 0;
}

// 不改名册技能；快照保留未强化底稿，换档/重复查询不会再次叠倍率。
export function applyBoostSkill(skill, tier) {
  const base = skill.boostBase || skill;
  if (!tier || base.isItem || base.isReaction) return base;
  const mods = resolveBoostModifiers(base, tier);
  const result = { ...base, boostBase: base, boostTier: tier, boostModifiers: mods,
    hit: (base.hit ?? 100) + mods.aimBonus,
    delay: Math.max(0, (base.delay || 0) - mods.delayReduction),
    tpCost: (base.tpCost || 0) + mods.tpCost,
  };
  if (base.range) {
    result.range = { ...base.range };
    if (result.range.castRange != null) result.range.castRange += mods.rangeBonus;
    if (result.range.length != null) result.range.length += mods.rangeBonus;
    if (result.range.radius != null) result.range.radius += mods.radiusBonus;
    if (result.range.type === '直线' && result.range.width != null) result.range.width += mods.radiusBonus * 2;
    if (result.range.type === '扇形' && mods.radiusBonus) {
      if (result.range.length != null) result.range.length += mods.radiusBonus;
      else result.range.castRange += mods.radiusBonus;
    }
  }
  for (const slot of skillSlots(base)) {
    const def = slot.definition, suffix = slot.index === 0 ? '' : slot.index + 1;
    // TP、MP、再动等资源返还和固定自损不随 Boost 放大。
    if (!def.selfCost && (slot.attack || def.kind === 'heal' || def.kind === 'shield' || def.kind === 'barrier' || slot.debuff)) {
      const multiplier = slot.debuff ? mods.debuffPowerMultiplier : mods.powerMultiplier;
      result['power' + suffix] = slot.power === 0 ? 0 : Math.round(slot.power * multiplier * 100) / 100;
    }
    if (slot.debuff && !def.selfCost && mods.durationBonus) result['slotTurns' + suffix] = slot.turns + mods.durationBonus;
  }
  if (base.displacements) result.displacements = base.displacements.map(rule => ({ ...rule,
    ...(rule.distance != null ? { distance: rule.distance + mods.displacementBonus } : {}),
    ...(rule.steps != null ? { steps: rule.steps + mods.displacementBonus } : {}),
  }));
  return result;
}
