// ==========================================
// 战棋 FX02 职业被动注册表（原版 CLASS_PASSIVES L21593-21984 迁移的战棋口径）
// 纯规则：被动函数只读输入/返回数据或修改传入 ctx/io；时钟（grantMainPoint/applyStatus）、
// 日志、随机消费由 battle 层注入（io），被动本身不触 DOM/时钟/Act 资源真值。
// 原版对照（S15#3 逐项，均按原值迁移）：防守者毅力/强力反击、狂战士浴血/死斗、风行者多重施法
// （概率 min(0.3, cost/100*2)）/TP 闪避/规避致命、隐匿者负嘲讽/远程隐袭加成/暗袭眩晕/击杀+30/
// 窗口未受击+10/阈值再动(≥80)/急袭(≥100 下次非反应攻击+50 后回归50)、施法者半MP盾/法力回响、
// 圣职者·支援者溢出转盾、灾厄使·施毒者增伤+淬毒、征伐者动能冲踏(速度差≥10 每10点+5%)/
// 正向速度buff暴击+10%/先手首回合spd+20/被攻闪避分母速度差(modifyDodgeCap，明确职业钩子：
// SPEC S05 禁的是通用敏捷耦合入命闪公式，不禁职业级显式钩子)。
// 战棋明确替换（非裁剪）：前后排/破阵贯穿 ignoreRow（战棋无前后排空间，SPEC S05）；
// 舍身救援/肃正场地结界按既定节奏暂缓（P03 rescue 域/结界域另行承接）。
// 原版 onDodge 完整结算收口在 battle 层（powerCounterChance/onPowerCounter 数据化）。
// ==========================================

import { hasVariantTag, rageAtkMultiplier } from './variant-rules.mjs';

export const CLASS_PASSIVES = {};
export const BASE_TAUNT = 100;

// 【蜕皮】敌方专属攻击加成（原版 getEffectiveStats L22986-22988 口径）：ref.molted 觉醒标记
// 由 battle 受击/DoT/入场收口置位；标记+被动读取（非 buff），不随回合过期、不被驱散、跨【复活】永久。
export function moltAtkMultiplier(unit, buffs = []) {
  if (!unit || unit.side === 'hero') return 1;
  const ref = unit.ref;
  if (!ref || !ref.molted || !hasVariantTag(unit, '蜕皮', buffs)) return 1;
  return 1.5;
}

// ---------- 有效属性视图 ----------
// 有效属性 = ref 基值 + 活跃 buff 求和 + 职业被动修正（原版 getEffectiveStats L22959 口径）。
// 命闪防御侧只读闪避（eva 基值 + eva buff + 职业钩子 modifyDodgeCap 由 battle 注入），不读通用敏捷（S05）。
export function getEffectiveStats(unit, buffs = [], concealAtk = 0) {
  const ref = (unit && unit.ref) || {};
  let atk = (ref.atk || 0) + concealAtk;
  let def = ref.def || 0;
  let hit = ref.hitBonus || 0;
  let eva = ref.evaBonus || 0;
  let taunt = BASE_TAUNT + (ref.baseTauntBonus || 0);
  let spd = ref.spd || 0;
  for (const b of buffs) {
    if (!b || !Number.isFinite(b.value)) continue;
    if (b.type === 'atk' && !b.isConcealAtk) atk += b.value;
    else if (b.type === 'def') def += b.value;
    else if (b.type === 'hit') hit += b.value;
    else if (b.type === 'eva' || b.type === 'paralyze') eva += b.value;
    else if (b.type === 'taunt') taunt += b.value;
    else if (b.type === 'spd') spd += b.value;
  }
  const stats = { atk, def, hit, eva, taunt, spd };
  const passive = CLASS_PASSIVES[unit && unit.classType];
  if (passive && passive.modifyStats) passive.modifyStats(unit, stats, buffs);
  stats.atk = Math.floor(stats.atk * rageAtkMultiplier(unit, buffs));
  stats.atk = Math.floor(stats.atk * moltAtkMultiplier(unit, buffs));
  if (!passive || passive.name !== '隐匿者') stats.taunt = Math.max(1, Math.floor(stats.taunt));
  else stats.taunt = Math.floor(stats.taunt); // 隐匿者允许负嘲讽（绝对隐匿）
  return stats;
}

// ---------- 1. 防守者 ----------
CLASS_PASSIVES['防守者'] = {
  name: '防守者',
  onBattleInit(unit) {
    const ref = unit.ref;
    ref.baseTauntBonus = 100;
    return [{ type: 'counter', value: 0, duration: Infinity, permanent: true }]; // 永久反击架势（威力=加成值0，反击走本体攻击）
  },
  modifyStats(unit, stats) {
    stats.hit += Math.floor(Math.max(0, stats.taunt - BASE_TAUNT) / 10);
  },
  onFatalDamage(ctx) {
    if (!ctx.unit.ref.hasTriggeredGrit) {
      ctx.unit.ref.hasTriggeredGrit = true;
      ctx.hpDmg = Math.max(0, ctx.unit.ref.hp - 1);
      ctx.prevented = true;
      return true;
    }
    return false;
  },
  // 强力反击：闪避成功时按概率触发，双倍攻击力反击（原版 onDodge L21647）
  powerCounterChance(unit, stats) {
    return 10 + Math.max(0, (stats.taunt || 0) - 200) * 0.2;
  },
  onPowerCounter() {
    return { resetTaunt: true }; // 触发后清除临时嘲讽 buff、回归天生重装
  },
};

// ---------- 2. 狂战士 ----------
CLASS_PASSIVES['狂战士'] = {
  name: '狂战士',
  modifyStats(unit, stats) {
    const ref = unit.ref;
    if (ref.maxHp > 0 && ref.hp >= 0) {
      const lostRatio = (ref.maxHp - Math.min(ref.hp, ref.maxHp)) / ref.maxHp;
      stats.atk = Math.floor(stats.atk * (1 + lostRatio));
    }
  },
  checkPierce(unit) {
    return unit.ref.hp < unit.ref.maxHp * 0.3;
  },
  modifyTrueDamage(unit) {
    return unit.ref.hp < unit.ref.maxHp * 0.3 ? Math.floor((unit.ref.maxHp - unit.ref.hp) * 0.1) : 0;
  },
  onFatalDamage(ctx) {
    if (!ctx.unit.ref.hasTriggeredGrit) {
      ctx.unit.ref.hasTriggeredGrit = true;
      ctx.hpDmg = Math.max(0, ctx.unit.ref.hp - 1);
      ctx.prevented = true;
      return true;
    }
    return false;
  },
};

// ---------- 3. 风行者 ----------
CLASS_PASSIVES['风行者'] = {
  name: '风行者',
  modifyStats(unit, stats) {
    stats.eva += unit.ref.tp || 0;
  },
  // 【多重施法】消耗MP释放技能时（非反应技）按耗蓝概率引发法力共鸣，立即获得一个额外行动回合
  // （原版 onSkillExecuted L21736-21747，概率原值 min(0.3, cost/100*2)；P03 映射：插队 splice → io.grantMainPoint）
  onSkillExecuted(unit, skill, isReactionTrigger, io = {}) {
    if (!skill || !(skill.cost > 0) || isReactionTrigger) return null;
    const multiCastChance = Math.min(0.3, (skill.cost / 100) * 2);
    if ((io.random || Math.random)() >= multiCastChance) return null;
    if (io.grantMainPoint) io.grantMainPoint(unit.id, '风行者-多重施法#' + (io.nextSeq ? io.nextSeq() : 0));
    return { multicast: true };
  },
  onFatalDamage(ctx) {
    if (!ctx.unit.ref.hasTriggeredAvoidFatal) {
      ctx.unit.ref.hasTriggeredAvoidFatal = true;
      ctx.hpDmg = 0;
      ctx.shieldDmg = 0;
      ctx.prevented = true;
      return true;
    }
    return false;
  },
};

// ---------- 4. 隐匿者（负嘲讽/远程隐袭加成/暗袭眩晕/击杀与未受击窗口累积/阈值再动与急袭） ----------
CLASS_PASSIVES['隐匿者'] = {
  name: '隐匿者',
  onBattleInit(unit) {
    unit.ref.baseTauntBonus = -50;
    unit.ref.stealthCycleProcessed = false; // 再动锁定标记：触发后置true，隐匿值跌回80以下解锁（原版 L21772）
    return [];
  },
  // 当前隐匿值 = 100 - 有效嘲讽（baseTauntBonus 永久深度 + 临时[嘲]buff，原版 computeStealthValue L21777）
  computeStealthValue(unit, buffs = []) {
    return Math.max(0, 100 - getEffectiveStats(unit, buffs).taunt);
  },
  // 阈值判定统一入口（击杀/未受击窗口/临时负[嘲]涨落均汇入；原版 checkStealthThresholds L21782-21810）：
  // ≥80 且本循环未触发 → 再动（io.grantMainPoint）；≥100 → 下次非反应攻击 +50（单次消耗），随后隐匿值回归 50 开新循环。
  checkStealthThresholds(unit, io = {}) {
    const buffs = io.buffsOf ? io.buffsOf(unit.id) : [];
    const stealthVal = this.computeStealthValue(unit, buffs);
    if (stealthVal < 80) {
      unit.ref.stealthCycleProcessed = false;
      return { stealthVal, unlocked: true };
    }
    const result = { stealthVal };
    if (!unit.ref.stealthCycleProcessed) {
      unit.ref.stealthCycleProcessed = true;
      if (io.grantMainPoint) io.grantMainPoint(unit.id, '隐匿者-再动#' + (io.nextSeq ? io.nextSeq() : 0));
      result.extraTurn = true;
    }
    if (stealthVal >= 100) {
      if (io.addBuff) io.addBuff(unit, { type: 'atk', value: 50, duration: 3, isConcealAtk: true }, '急袭');
      if (io.clearTempNegativeTaunt) io.clearTempNegativeTaunt(unit); // 消耗助其破百的临时负[嘲]，隐匿值真正回归 50
      unit.ref.baseTauntBonus = -50;
      unit.ref.stealthCycleProcessed = false;
      result.rush = true;
    }
    return result;
  },
  // 击杀/未受击累积：amount 固化进永久隐匿深度 baseTauntBonus；临时负[嘲]buff 保持临时（原版 gainStealth L21813）
  gainStealth(unit, amount, io = {}) {
    const permanentStealth = Math.max(0, -(unit.ref.baseTauntBonus || 0));
    unit.ref.baseTauntBonus = -(permanentStealth + amount);
    return this.checkStealthThresholds(unit, io);
  },
  onKill(caster, io) {
    if (!caster || caster.classType !== '隐匿者') return null;
    return this.gainStealth(caster, 30, io); // 击杀 +30（原版 onKill L21818）
  },
  modifyDamageDealt(unit, skill, stats) {
    if (skill && (skill.damageType === '远程' || /远程|弓|枪/.test(String(skill.damageType || '')))) {
      return Math.floor(Math.max(0, 100 - stats.taunt) / 10);
    }
    return 0;
  },
  onAfterDamageDealt(ctx, random) {
    if (ctx.damageType !== '近战' || !ctx.targetAlive) return null;
    const stealth = Math.max(0, 100 - ctx.casterStats.taunt);
    const chance = stealth / 10;
    if (random() * 100 < chance) return { stun: true, note: '暗袭眩晕' };
    return null;
  },
  onFatalDamage(ctx) {
    if (!ctx.unit.ref.hasTriggeredAvoidFatal) {
      ctx.unit.ref.hasTriggeredAvoidFatal = true;
      ctx.hpDmg = 0;
      ctx.shieldDmg = 0;
      ctx.prevented = true;
      return true;
    }
    return false;
  },
};

// ---------- 5. 施法者 ----------
CLASS_PASSIVES['施法者'] = {
  name: '施法者',
  onBattleInit(unit) {
    const shield = Math.floor((unit.ref.maxMp || 0) * 0.5);
    unit.ref.shield = (unit.ref.shield || 0) + shield;
    return [];
  },
  onManaSpent(unit, mpSpent, random) {
    const chance = Math.min(100, mpSpent * 2);
    if (random() * 100 >= chance) return null;
    return { haste: 1, tp: 15 }; // 法力回响：1 点加速库存 + 15 TP
  },
};

// ---------- 6. 圣职者 / 支援者（溢出治疗转盾） ----------
const clericPassive = {
  name: '圣职者',
  onOverheal(ctx) {
    const overflow = Math.max(0, Math.floor((ctx.oldHp + ctx.healAmount) - ctx.target.ref.maxHp));
    return overflow > 0 ? { shield: overflow } : null;
  },
};
CLASS_PASSIVES['圣职者'] = clericPassive;
CLASS_PASSIVES['支援者'] = Object.assign({}, clericPassive, { name: '支援者' });

// ---------- 7. 灾厄使 / 施毒者 ----------
const corruptorPassive = {
  name: '灾厄使',
  modifyDamageMultiplier(caster, target, targetBuffs) {
    const count = (targetBuffs || []).filter(b => b && (b.type === 'poison' || b.type === 'burn'
      || (b.type === 'def' && b.value < 0) || (b.type === 'hit' && b.value < 0)
      || b.type === 'paralyze' || (b.type === 'eva' && b.value < 0) || (b.type === 'atk' && b.value < 0))).length;
    return count * 0.15;
  },
  onAfterDamageDealt(ctx, random) {
    if (!ctx.targetAlive) return null;
    if (hasVariantTag(ctx.target, '耐毒', ctx.targetBuffs)) return { immunePoison: true };
    return { poison: { power: Math.max(1, Math.floor(ctx.casterStats.atk * 0.3)), turns: 3 } };
  },
};
CLASS_PASSIVES['灾厄使'] = corruptorPassive;
CLASS_PASSIVES['施毒者'] = Object.assign({}, corruptorPassive, { name: '施毒者' });

// ---------- 8. 征伐者（动能冲踏/速度暴击/先手首击/闪避分母；破阵贯穿 ignoreRow 因战棋无前后排明确替换） ----------
CLASS_PASSIVES['征伐者'] = {
  name: '征伐者',
  // 【先手优势②】开战首回合自身行动速度临时 +20（复用 [单速] 的 spd buff 机制，原版 onBattleInit L21960-21965）
  onBattleInit(unit) {
    return [{ type: 'spd', value: 20, duration: 1, _vanguardFirstStrike: true }];
  },
  // 【动能冲踏①】速度压制：有效速度每超出目标 10 点伤害 +5%（屏障伪目标不参与，原版 L21967-21971）
  modifyDamageMultiplier(caster, target, targetBuffs, casterStats, targetStats) {
    if (!target || target.isBarrierTarget) return 0;
    const diff = (casterStats.spd || 0) - (targetStats.spd || 0);
    return diff >= 10 ? Math.floor(diff / 10) * 0.05 : 0;
  },
  // 【动能冲踏①】自身带正向速度 buff（任意来源）时攻击附加 10% 暴击率（原版 L21973-21975；battle 注入 buffs 第5参）
  modifyCritRate(caster, target, casterStats, targetStats, casterBuffs = []) {
    return (casterBuffs || []).some(b => b && b.type === 'spd' && b.value > 0) ? 10 : 0;
  },
  // 【先手优势③】被攻击时闪避分母按“自身有效速度 − 攻击者有效速度”额外提升（原版 L21976-21981，1:1 无封顶）
  modifyDodgeCap(target, caster, targetStats, casterStats) {
    if (!caster) return 0;
    const diff = (targetStats.spd || 0) - (casterStats.spd || 0);
    return diff > 0 ? diff : 0;
  },
};
