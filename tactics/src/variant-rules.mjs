// ==========================================
// 战棋 FX02 变种规则（原版 index.html 变种体系迁移：流体/虚形/破法/要害/防火/耐毒/钢体/狂暴/吸血/荆棘/复活）
// 来源：原生 attrTags（属性栏/名字收集的裸 [xxx]）＋ 限时赋予（buffs 中 type:'variant'）。
// 纯规则函数：不读 DOM，不掷骰；由调用方传入单位视图与活跃 buff 列表。
// ==========================================

// 活跃变种名集合 = 原生 attrTags（[xxx] 形态）＋ 限时赋予 buff
export function activeVariantNames(unit, buffs = []) {
  const names = new Set();
  for (const t of (unit && unit.attrTags) || []) {
    const m = String(t).match(/^\[([^\[\]:]+)\]$/);
    if (m) names.add(m[1].trim());
  }
  for (const b of buffs) if (b && b.type === 'variant' && b.variant) names.add(b.variant);
  return names;
}

export function hasVariantTag(unit, name, buffs = []) {
  return activeVariantNames(unit, buffs).has(name);
}

// 原生/限时变种类型减伤（原版 applyEnemyTypeResist L23062）：
// 【虚形】近战-50% / 【流体】远程-50% / 【破法】法术-50%（可被 resistMap 覆盖）
// 【要害】群攻(AoE)-50%；类型与 AoE 独立判定、顺序相乘（可叠加至25%）；下限 1。
// 【穿透】无视的是护甲，仍吃属性减伤（调用顺序在护甲之前）。
export function applyTypeResist(rawDmg, damageType, isAoE, unit, buffs = []) {
  if (!unit || !(rawDmg > 0)) return rawDmg;
  let dmg = rawDmg;
  const map = (unit.ref && unit.ref.resistMap) || {};
  const typeName = damageType === '近战' ? '虚形' : damageType === '远程' ? '流体' : damageType === '法术' ? '破法' : null;
  const typeResist = map[damageType] || (typeName && hasVariantTag(unit, typeName, buffs) ? 0.5 : null);
  const aoeResist = map['AoE'] || (hasVariantTag(unit, '要害', buffs) ? 0.5 : null);
  if (typeResist) dmg = Math.max(1, Math.floor(dmg * typeResist));
  if (isAoE && aoeResist) dmg = Math.max(1, Math.floor(dmg * aoeResist));
  return dmg;
}

// DoT / 眩晕免疫（原版中毒/燃烧/眩晕 handler 口径）
export function isImmuneToPoison(unit, buffs = []) {
  return !!(unit && unit.ref && unit.ref.immunePoison) || hasVariantTag(unit, '耐毒', buffs);
}
export function isImmuneToBurn(unit, buffs = []) {
  return !!(unit && unit.ref && unit.ref.immuneBurn) || hasVariantTag(unit, '防火', buffs);
}
export function isImmuneToStun(unit, buffs = []) {
  return hasVariantTag(unit, '钢体', buffs);
}

// 【狂暴】HP≤30% 时攻击 +50%（原版 L22980，getEffectiveStats 内消费）
export function rageAtkMultiplier(unit, buffs = []) {
  const ref = unit && unit.ref;
  if (ref && ref.maxHp > 0 && ref.hp / ref.maxHp <= 0.3 && hasVariantTag(unit, '狂暴', buffs)) return 1.5;
  return 1;
}

// 【吸血】：造成实际伤害时吸取其 30% 转为自身回复（原版 L22183）
export function lifestealRatio(unit, buffs = []) {
  return hasVariantTag(unit, '吸血', buffs) ? 0.3 : 0;
}

// 【荆棘】：被近战命中反弹 50% 实际伤害；实际值（破盾+扣血合计）不足 10 时垫高原始反伤（10+攻击者防御）
export function thornsRawReflect(actualDamage, attackerDef) {
  const half = Math.floor(actualDamage * 0.5);
  return actualDamage > 0 && actualDamage < 10 ? 10 + Math.max(0, Math.floor(attackerDef || 0)) : half;
}
export function hasThorns(unit, buffs = []) {
  return hasVariantTag(unit, '荆棘', buffs);
}

// 【复活】：致死时消耗次数复活（P10 救援域消费的判定入口；次数存 ref.reviveCount）
export function canRevive(unit) {
  return hasVariantTag(unit, '复活') && ((unit.ref && unit.ref.reviveCount) || 0) > 0;
}
