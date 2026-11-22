// ==========================================
// MVP 基础命闪与伤害：旧双骰/护甲口径，防御侧独立闪避，不迁移职业与反应链。
// 计算与扣血分开；随机入口可注入，纯规则测试与真实战斗用同一实现。
// ==========================================

export function resolveHit(caster, target, skill, random = Math.random) {
  const attackCap = Math.max(1, (skill.hit ?? 100) + (caster.hitBonus || 0));
  const dodgeCap = Math.max(1, target.evasion + (target.evaBonus || 0));
  const dodgeRoll = Math.floor(random() * dodgeCap) + 1;
  const attackRoll = Math.floor(random() * attackCap) + 1;
  return { hit: attackRoll >= dodgeRoll, attackRoll, dodgeRoll };
}

export function calculateDamage(rawDmg, target) {
  return { hpDmg: rawDmg <= 0 ? 0 : Math.max(1, rawDmg - Math.floor(target.def || 0)), shieldDmg: 0 };
}

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
  const mitigated = calculateDamage(rawDmg, target).hpDmg;
  const shieldDmg = Math.min(Math.max(0, target.shield || 0), mitigated);
  target.shield = Math.max(0, (target.shield || 0) - shieldDmg);
  const hpDmg = Math.min(target.hp, mitigated - shieldDmg);
  target.hp -= hpDmg;
  return { rawDmg, mitigated, shieldDmg, hpDmg };
}
