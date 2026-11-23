// ==========================================
// 战棋规范效果标签注册表：效果与伤害类别独立于人数、范围及攻击方式。
// 旧写法仅作输入别名；规范槽视图供解析、结算、预览与 AI 共用。
// ==========================================

export const LEGACY_TAG_ALIASES = {
  '单体': '伤害', '群攻': '伤害',
  '群穿透': '穿透', '群眩晕': '眩晕', '群散射': '散射',
  '单回': '回复', '群回': '回复', '治疗': '回复',
  '单回蓝': '回蓝', '群回蓝': '回蓝',
  '单冲': '充能', '群冲': '充能',
  '单增': '增攻', '群增': '增攻', '加攻': '增攻', '增伤': '增攻',
  '单防': '增防', '群防': '增防', '加防': '增防',
  '单盾': '护盾', '群盾': '护盾', '加盾': '护盾',
  '单瞄': '瞄准', '群瞄': '瞄准', '加瞄': '瞄准', '增瞄': '瞄准',
  '单降': '降防', '群降': '降防',
  '单盲': '致盲', '群盲': '致盲',
  '单滞': '停滞', '群滞': '停滞', '迟滞': '停滞',
  '单弱': '弱攻', '群弱': '弱攻', '虚弱': '弱攻',
  '单缓': '缓速', '群缓': '缓速', '减速': '缓速',
  '单速': '增速', '群速': '增速', '加速': '增速',
  '群中毒': '中毒', '群燃烧': '燃烧', '群麻痹': '麻痹',
  '群反击': '反击', '群驱散': '驱散',
  '群避': '回避', '闪避': '回避',
};

export const LEGACY_SELF_MIGRATE_TAGS = ['再动', '赋予'];
export const DAMAGE_CATEGORIES = ['钝击', '切割', '枪击', '霰弹', '火焰', '圣光', '雷电', '水流', '冰霜', '诅咒'];

// side 是效果默认取向，slotTargets 可以明确覆盖；回复等为即时事件，不因 turns 转成周期效果。
export const EFFECT_DEFINITIONS = {
  '伤害': { kind: 'attack', side: 'enemy', attack: true, defaultPower: 20, defaultTurns: 3 },
  '穿透': { kind: 'attack', side: 'enemy', attack: true, pierce: true, defaultPower: 50, defaultTurns: 3 },
  '散射': { kind: 'attack', side: 'enemy', attack: true, scatter: true, defaultPower: 50, defaultTurns: 3 },
  '眩晕': { kind: 'stun', side: 'enemy', debuff: true, defaultPower: 0, defaultTurns: 3 },
  '回复': { kind: 'heal', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '回蓝': { kind: 'healMp', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '充能': { kind: 'healTp', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '增攻': { kind: 'buff', field: 'atk', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '增防': { kind: 'buff', field: 'def', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '护盾': { kind: 'shield', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '瞄准': { kind: 'buff', field: 'hit', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '增速': { kind: 'buff', field: 'spd', side: 'ally', defaultPower: 50, defaultTurns: 3 },
  '降防': { kind: 'buff', field: 'def', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '致盲': { kind: 'buff', field: 'hit', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '停滞': { kind: 'buff', field: 'eva', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '弱攻': { kind: 'buff', field: 'atk', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '缓速': { kind: 'buff', field: 'spd', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '中毒': { kind: 'dot', dot: 'poison', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '燃烧': { kind: 'dot', dot: 'burn', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '麻痹': { kind: 'paralyze', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '吸蓝': { kind: 'drainMp', side: 'enemy', debuff: true, defaultPower: 50, defaultTurns: 3 },
  '嘲讽': { kind: 'taunt', side: 'default', defaultPower: 50, defaultTurns: 3 },
  '再动': { kind: 'mainPoint', side: 'default', defaultPower: 1, defaultTurns: 3 },
  '单避': { kind: 'buff', field: 'eva', side: 'default', consumable: true, defaultPower: 50, defaultTurns: 3 },
  '回避': { kind: 'buff', field: 'eva', side: 'default', consumable: false, defaultPower: 50, defaultTurns: 3 },
  '免伤': { kind: 'damageGuard', side: 'default', defaultPower: 50, defaultTurns: 3 },
  '反击': { kind: 'counter', side: 'default', defaultPower: 50, defaultTurns: 3 },
  '驱散': { kind: 'dispel', side: 'ally', defaultPower: 1, defaultTurns: 3 },
  '自盲': { kind: 'buff', field: 'hit', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '自降': { kind: 'buff', field: 'def', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '自弱': { kind: 'buff', field: 'atk', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '自滞': { kind: 'buff', field: 'eva', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '自缓': { kind: 'buff', field: 'spd', side: 'self', selfCost: true, debuff: true, defaultPower: 50, defaultTurns: 3 },
  '肃正': { kind: 'barrier', side: 'default', defaultPower: 50, defaultTurns: 3 },
};
for (const category of DAMAGE_CATEGORIES) {
  EFFECT_DEFINITIONS[category] = { kind: 'attack', side: 'enemy', attack: true, damageCategory: category,
    scatter: category === '霰弹', defaultPower: 50, defaultTurns: 3 };
}

export function normalizeEffectTag(tag) {
  const raw = String(tag || '').trim().replace(/^\[|\]$/g, '').trim();
  if (!raw || raw === '无') return null;
  const m = raw.match(/^([^(（]+)(?:[(（]([^)）]+)[)）])?$/);
  if (!m) return raw;
  const base = LEGACY_TAG_ALIASES[m[1].trim()] || m[1].trim();
  const sub = m[2] ? m[2].trim() : null;
  // 旧括号子型保留演出身份，不恢复单／群人数语义；新输入直接使用伤害类别标签。
  return sub ? base + '(' + sub + ')' : base;
}

export function normalizeGrantTag(tag) {
  const m = String(tag || '').trim().replace(/^\[|\]$/g, '').match(/^赋予\s*[:：]\s*(.+)$/);
  return m ? '赋予:' + m[1].trim() : null;
}

export function effectDefinition(tag) {
  const norm = normalizeEffectTag(tag);
  if (!norm) return null;
  const grant = normalizeGrantTag(norm);
  if (grant) return { kind: 'variant', variant: grant.slice(3), side: 'default', defaultPower: 0, defaultTurns: 3 };
  if (/^肃正[:：]/.test(norm)) return EFFECT_DEFINITIONS['肃正'];
  if (EFFECT_DEFINITIONS[norm]) return EFFECT_DEFINITIONS[norm];
  const base = norm.replace(/[(（][^)）]+[)）]\s*$/, '');
  const def = EFFECT_DEFINITIONS[base];
  const sub = norm.match(/[(（]([^)）]+)[)）]$/)?.[1];
  return def && sub ? { ...def, damageCategory: DAMAGE_CATEGORIES.includes(sub) ? sub : null } : def || null;
}

const NON_SLOT_TOKENS = new Set(['必中', '转火', '突进', '众召', '高阶', '传奇', '神术', '近战', '远程', '法术', '不分敌友']);
export function slotTagOf(content) {
  const raw = String(content || '').trim().replace(/^\[|\]$/g, '').trim();
  const base = raw.replace(/[(（].*$/, '').trim();
  if (!raw || raw === '无' || NON_SLOT_TOKENS.has(base) || base === '肃正') return null;
  const norm = normalizeEffectTag(raw);
  return norm && effectDefinition(norm) ? norm : null;
}

export function isLegacySlotTag(content) {
  const raw = String(content || '').trim().replace(/^\[|\]$/g, '').replace(/[(（].*$/, '').trim();
  return Object.prototype.hasOwnProperty.call(LEGACY_TAG_ALIASES, raw);
}

export function skillSlots(skill) {
  const slots = [];
  for (let i = 0; i < 3; i++) {
    const rawTag = i === 0 ? skill?.type : skill?.['type' + (i + 1)];
    if (!rawTag || rawTag === '[无]') continue;
    const tag = normalizeEffectTag(rawTag), def = effectDefinition(tag);
    if (!def) continue;
    const rawPower = i === 0 ? skill?.power : skill?.['power' + (i + 1)];
    const rawTurns = i === 0 ? skill?.slotTurns : skill?.['slotTurns' + (i + 1)];
    const override = skill?.slotTargets?.[i];
    slots.push({ index: i, tag, power: rawPower ?? def.defaultPower ?? 0,
      turns: rawTurns ?? skill?.turns ?? def.defaultTurns ?? 3,
      target: def.side === 'self' ? 'self' : (override || 'default'),
      attack: !!def.attack, debuff: !!def.debuff, definition: def });
  }
  return slots;
}

export function sortSlotsForResolve(slots) {
  return slots.slice().sort((a, b) => Number(b.attack) - Number(a.attack) || Number(b.debuff) - Number(a.debuff));
}

export function isDebuffSlot(slot) { return !!slot.definition?.debuff; }
