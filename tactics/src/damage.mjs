// ==========================================
// 战棋 FX02 伤害管线（原版 index.html calculateDamage L22998 / computeSegmentRawDamage L23018 迁移）
// 计算与扣血分开；随机入口可注入；独立闪避（防御侧只读 evasion，不读敏捷，S05）。
// 管线顺序（原版 L23031 口径）：〔全队屏障——场地结界暂缓〕→ 变种类型抗性（调用方）→ 护甲/免伤/防御姿态 → 护盾 → HP。
// ==========================================

// 命闪判定：攻击方掷 1..(skill.hit + hitBonus)，防御侧掷 1..(evasion + evaBonus)，攻击 ≥ 防御即命中。
// caster/target 传入有效属性视图（{hitBonus} / {evasion, evaBonus}）；【必中】由调用方跳过本函数。
export function resolveHit(caster, target, skill, random = Math.random) {
  const attackCap = Math.max(1, (skill.hit ?? 100) + (caster.hitBonus || 0));
  const dodgeCap = Math.max(1, target.evasion + (target.evaBonus || 0));
  const dodgeRoll = Math.floor(random() * dodgeCap) + 1;
  const attackRoll = Math.floor(random() * attackCap) + 1;
  return { hit: attackRoll >= dodgeRoll, attackRoll, dodgeRoll };
}

// 单段原始伤害（护甲/抗性之前）：含 0.8–1.2 随机值与职业倍率，与主管线同式（原版 L23018）。
// casterStats = getEffectiveStats 视图；baseAtk = ref.atk（算 buffAtkBonus）。
// hooks = { modifyDamageDealt(caster, skill)?, modifyDamageMultiplier(...)? } 返回值直接累加。
export function computeSegmentRawDamage(casterStats, baseAtk, tagPower, multiplier, roll, hooks = {}, hookArgs = {}) {
  const buffAtkBonus = casterStats.atk - (baseAtk || 0);
  const baseDmg = tagPower === 0 ? (casterStats.atk * multiplier) : ((tagPower * multiplier) + (buffAtkBonus * multiplier));
  let rawDamage = Math.max(1, Math.floor(baseDmg * roll));
  let dmgMultiplier = 1;
  if (hooks.modifyDamageMultiplier) dmgMultiplier += hooks.modifyDamageMultiplier(hookArgs) || 0;
  if (hooks.modifyDamageDealt) rawDamage += hooks.modifyDamageDealt(hookArgs) || 0;
  return Math.floor(rawDamage * dmgMultiplier);
}

// 护甲→免伤→防御姿态→护盾→HP（原版 calculateDamage L22998）。
// target 视图 {def, shield, hp}；opts = { isPierce, armorMult=1, hasDamageGuard=false, defending=false }。
// 【免伤】允许防御值把本次伤害降为 0；普通防御仍保留至少 1 点；穿透无视护甲与护盾。
export function calculateDamage(rawDmg, target, opts = {}) {
  if (rawDmg <= 0) return { hpDmg: 0, shieldDmg: 0 };
  const isPierce = !!opts.isPierce;
  const armorMult = opts.armorMult === undefined ? 1 : opts.armorMult;
  const hasDamageGuard = !!opts.hasDamageGuard;
  let dmg = Math.max(hasDamageGuard ? 0 : 1, rawDmg - (isPierce ? 0 : Math.floor((target.def || 0) * armorMult)));
  if (opts.defending) dmg = Math.ceil(dmg / 2);
  let shieldDmg = 0;
  if ((target.shield || 0) > 0 && !isPierce) {
    if (target.shield >= dmg) { shieldDmg = dmg; dmg = 0; }
    else { shieldDmg = target.shield; dmg -= target.shield; }
  }
  return { hpDmg: dmg, shieldDmg };
}

// ---------- 兼容旧测试的直扣入口（battle 主链不再使用） ----------

export function applyAttackDamage(caster, target, skill, random = Math.random) {
  const result = resolveHit(caster, target, skill, random);
  const rawDmg = skill.power === 0 ? caster.atk : skill.power;
  const damage = result.hit ? calculateDamage(rawDmg, target).hpDmg : 0;
  const hpDmg = Math.min(target.hp, damage);
  target.hp -= hpDmg;
  return { ...result, hpDmg };
}

// 碰撞不掷命闪：先结算护甲折算，再由护盾吸收，余量扣 HP。
export function applyCollisionDamage(rawDmg, target) {
  const mitigated = calculateDamage(rawDmg, { ...target, shield: 0 }).hpDmg;
  const shieldDmg = Math.min(Math.max(0, target.shield || 0), mitigated);
  target.shield = Math.max(0, (target.shield || 0) - shieldDmg);
  const hpDmg = Math.min(target.hp, mitigated - shieldDmg);
  target.hp -= hpDmg;
  return { rawDmg, mitigated, shieldDmg, hpDmg };
}
