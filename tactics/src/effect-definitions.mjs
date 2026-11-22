// ==========================================
// 战棋 FX02 规范效果标签注册表（原版 index.html TAG_HANDLERS / SKILL_TYPES 迁移的规范形态）
// 单群前缀取消：目标数量一律由 [范围:…] 决定；本表只描述效果本体与敌我语义。
// 契约见会话 contract v2：normalizeEffectTag / effectDefinition / skillSlots 为 battle 与 UI 的唯一槽视图。
// ==========================================

// ---------- 旧别名 → 规范标签（旧输入只作别名读入，导出不再保留单群写法） ----------

export const LEGACY_TAG_ALIASES = {
  '单体': '伤害', '群攻': '伤害',
  '穿透': '穿透', '群穿透': '穿透',
  '眩晕': '眩晕', '群眩晕': '眩晕',
  '散射': '散射', '群散射': '散射',
  '单回': '治疗', '群回': '治疗',
  '单回蓝': '回蓝', '群回蓝': '回蓝',
  '单冲': '充能', '群冲': '充能',
  '单增': '加攻', '群增': '加攻',
  '单防': '加防', '群防': '加防',
  '单盾': '加盾', '群盾': '加盾',
  '单瞄': '加瞄', '群瞄': '加瞄',
  '单降': '降防', '群降': '降防',
  '单盲': '致盲', '群盲': '致盲',
  '单滞': '迟滞', '群滞': '迟滞',
  '单弱': '虚弱', '群弱': '虚弱',
  '单缓': '减速', '群缓': '减速',
  '单速': '加速', '群速': '加速',
  '群中毒': '中毒', '群燃烧': '燃烧', '群麻痹': '麻痹',
  '群反击': '反击', '群驱散': '驱散',
  '单避': '闪避', '群避': '闪避',
};

// 同义输入别名（接受但不输出）：normalize 层吸收
const INPUT_ALIASES = { '回复': '治疗', '增攻': '加攻' };

// 旧输入迁移期自动标 slotTargets:'self' 的效果（原版 L24751：再动/肃正/自X/赋予恒打自身；
// v2 决议：仅再动/赋予迁移标 self，新规范输入默认按范围友方，可对队友施放）
export const LEGACY_SELF_MIGRATE_TAGS = ['再动', '赋予'];

// ---------- 规范效果定义表 ----------

// kind: attack(伤害段,含眩晕/穿透/散射子语义) | heal | healMp | healTp | buff(field) | shield
//       | dot(poison/burn) | paralyze | drainMp | taunt | mainPoint | damageGuard | counter
//       | dispel | variant(赋予:X) | barrier(暂缓)
// side: enemy | ally | self | default（default=按范围友敌方判定，可被 slotTargets:'self' 覆盖）
export const EFFECT_DEFINITIONS = {
  '伤害': { kind: 'attack', side: 'enemy', attack: true, defaultPower: 20, defaultTurns: 3 },
  '穿透': { kind: 'attack', side: 'enemy', attack: true, pierce: true, defaultPower: 50, defaultTurns: 3 },
  '眩晕': { kind: 'attack', side: 'enemy', attack: true, stun: true, defaultPower: 50, defaultTurns: 3 },
  '散射': { kind: 'attack', side: 'enemy', attack: true, scatter: true, defaultPower: 50, defaultTurns: 3 },
  '治疗': { kind: 'heal', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '回蓝': { kind: 'healMp', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '充能': { kind: 'healTp', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '加攻': { kind: 'buff', field: 'atk', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '加防': { kind: 'buff', field: 'def', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '加盾': { kind: 'shield', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '加瞄': { kind: 'buff', field: 'hit', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '加速': { kind: 'buff', field: 'spd', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '降防': { kind: 'buff', field: 'def', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '致盲': { kind: 'buff', field: 'hit', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '迟滞': { kind: 'buff', field: 'eva', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '虚弱': { kind: 'buff', field: 'atk', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '减速': { kind: 'buff', field: 'spd', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '中毒': { kind: 'dot', dot: 'poison', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '燃烧': { kind: 'dot', dot: 'burn', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '麻痹': { kind: 'paralyze', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '吸蓝': { kind: 'drainMp', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '嘲讽': { kind: 'taunt', side: 'default', defaultPower: 50, defaultTurns: 3 },
  '再动': { kind: 'mainPoint', side: 'default', defaultPower: 1, defaultTurns: 3 },
  '回避': { kind: 'buff', field: 'eva', side: 'default', consumable: true, defaultPower: 50, defaultTurns: 3 },
  '闪避': { kind: 'buff', field: 'eva', side: 'default', consumable: false, defaultPower: 50, defaultTurns: 3 },
  '免伤': { kind: 'damageGuard', side: 'default', defaultPower: 50, defaultTurns: 3 },
  '反击': { kind: 'counter', side: 'default', defaultPower: 50, defaultTurns: 3 },
  '驱散': { kind: 'dispel', side: 'default', defaultPower: 1, defaultTurns: 3 },
  '自盲': { kind: 'buff', field: 'hit', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '自降': { kind: 'buff', field: 'def', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '自弱': { kind: 'buff', field: 'atk', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '自滞': { kind: 'buff', field: 'eva', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '自缓': { kind: 'buff', field: 'spd', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '肃正': { kind: 'barrier', side: 'default', deferred: true, defaultPower: 50, defaultTurns: 3 },
};

// ---------- 归一化与查询 ----------

// '[群攻(火焰)]' → '伤害(火焰)'；'[单体]' → '伤害'；已规范的输入原样（去外层[]）。
// 括号子型（火焰/雷/霰弹/刀砍…）原样保留，只作演出与抗性哨兵，不影响效果语义。
export function normalizeEffectTag(tag) {
  let raw = String(tag || '').trim().replace(/^\[|\]$/g, '').trim();
  if (!raw || raw === '无') return null;
  const m = raw.match(/^([^(（]+)(?:[(（]([^)）]+)[)）])?$/);
  if (!m) return raw;
  const base = LEGACY_TAG_ALIASES[m[1].trim()] || INPUT_ALIASES[m[1].trim()] || m[1].trim();
  const sub = m[2] ? m[2].trim() : null;
  return sub ? base + '(' + sub + ')' : base;
}

// 授予型变种标签：'[赋予:流体]' → '赋予:流体'
export function normalizeGrantTag(tag) {
  const m = String(tag || '').trim().replace(/^\[|\]$/g, '').match(/^赋予\s*[:：]\s*(.+)$/);
  return m ? '赋予:' + m[1].trim() : null;
}

// effectDefinition('[伤害(火焰)]') → 定义；精确匹配 → 剥括号子型回退基础键；未注册返回 null。
export function effectDefinition(tag) {
  const norm = normalizeEffectTag(tag);
  if (!norm) return null;
  const grant = normalizeGrantTag(norm);
  if (grant) return { kind: 'variant', variant: grant.slice(3), side: 'default', defaultPower: 0, defaultTurns: 3 };
  if (EFFECT_DEFINITIONS[norm]) return EFFECT_DEFINITIONS[norm];
  const base = norm.replace(/[(（][^)）]+[)）]\s*$/, '');
  return EFFECT_DEFINITIONS[base] || null;
}

// 判定括号内容是否为效果槽标签（供 parser 槽位收集）：返回规范标签或 null。
// 非槽令牌（必中/转火/突进/众召/高阶/传奇/神术/近战/远程/法术/赋予…）返回 null。
const NON_SLOT_TOKENS = new Set(['必中', '转火', '突进', '众召', '高阶', '传奇', '神术', '近战', '远程', '法术']);
export function slotTagOf(content) {
  const raw = String(content || '').trim().replace(/^\[|\]$/g, '').trim();
  if (!raw || raw === '无') return null;
  const base = raw.replace(/[(（].*$/, '').trim();
  if (NON_SLOT_TOKENS.has(base)) return null;
  if (base === '肃正') return null; // 肃正（场地结界）暂缓，不作槽
  const norm = normalizeEffectTag(raw);
  return norm && effectDefinition(norm) ? norm : null;
}

// 是否旧写法槽标签（单群前缀或旧别名键），供迁移期判定与配置导出提醒
export function isLegacySlotTag(content) {
  const raw = String(content || '').trim().replace(/^\[|\]$/g, '').trim();
  if (!raw) return false;
  const base = raw.replace(/[(（].*$/, '').trim();
  return Object.prototype.hasOwnProperty.call(LEGACY_TAG_ALIASES, base);
}

// ---------- 技能槽规范视图 ----------

// skillSlots(skill) → [{index, tag, power, turns, target, attack, debuff, definition}]
// - tag: 规范标签（子型保留）；power/turns 沿 parser 已算值，缺省回落定义表（turns 缺省 3 回）
// - target: 'self'（skill.slotTargets[index]==='self' 或 自X 恒 self）| 'default'（按范围友敌方）
// - attack/debuff: 原版 isDmgTag / requiresHit 减益判定（原版 L24734-24735 口径迁移到规范名）
const ATTACK_TAG_NAMES = new Set(['伤害', '穿透', '眩晕', '散射']);
const DEBUFF_TAG_NAMES = new Set(['降防', '致盲', '迟滞', '虚弱', '减速', '中毒', '燃烧', '麻痹', '吸蓝']);

export function skillSlots(skill) {
  const slots = [];
  for (let i = 0; i < 3; i++) {
    const rawTag = i === 0 ? (skill && skill.type) : (skill && skill['type' + (i + 1)]);
    if (!rawTag || rawTag === '[无]') continue;
    const tag = normalizeEffectTag(rawTag);
    const def = effectDefinition(tag);
    if (!def) continue;
    const rawPower = i === 0 ? (skill && skill.power) : (skill && skill['power' + (i + 1)]);
    const rawTurns = i === 0 ? (skill && skill.slotTurns) : (skill && skill['slotTurns' + (i + 1)]);
    const override = Array.isArray(skill && skill.slotTargets) ? skill.slotTargets[i] : null;
    const power = rawPower != null ? rawPower : (def.defaultPower || 0);
    const turns = rawTurns != null ? rawTurns : (skill && skill.turns != null ? skill.turns : (def.defaultTurns || 3));
    slots.push({
      index: i,
      tag,
      power,
      turns,
      target: (override === 'self' || def.side === 'self') ? 'self' : 'default',
      attack: !!def.attack,
      debuff: !!def.debuff,
      definition: def,
    });
  }
  return slots;
}

// 槽结算顺序（原版 L24733-24736）：攻击/控制槽优先于减益槽，同组内保持原相对顺序（稳定排序），
// 保证每个目标先完成攻击命中判定，后续减益共享"至少一次命中"的结论。
export function sortSlotsForResolve(slots) {
  const isDmg = s => s.attack;
  const isDebuff = s => DEBUFF_TAG_NAMES.has(s.tag.replace(/[(（].*$/, ''));
  return slots.slice().sort((a, b) => ((isDmg(b) ? 1 : 0) - (isDmg(a) ? 1 : 0)) || ((isDebuff(b) ? 1 : 0) - (isDebuff(a) ? 1 : 0)));
}

export function isDebuffSlot(slot) {
  return DEBUFF_TAG_NAMES.has(String(slot.tag || '').replace(/[(（].*$/, ''));
}
