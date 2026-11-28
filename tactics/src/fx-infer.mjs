// ==========================================
// 特效标签推断（C1，白名单见 doc/tactics/FX-INFER-WHITELIST.md，2026-11-28 定稿）
// 只改 fxTag 与 fxTagInferred，不改任何规则字段。顺序：
//   显式「无」保持 → 显式合法保持 → 显式非法先别名后就近纠正（只在可推断集合内）
//   → 未写按技能名 + 状态标签元素关键词（元素优先于枪械）→ 范围 × 伤害类型兜底 → 不给（通用兜底条目）。
// 同时提供元素判定 skillElement（徽章底色 / 地面痕迹 / 法术光照共用）。纯函数，无 DOM。
// ==========================================

import { skillSlots } from './effect-definitions.mjs';

// 可推断的通用条目（专属演出只能显式写，永不推断）
export const INFERABLE_FX = [
  '枪击', '霰弹', '箭矢', '刀砍', '拳击', '爪击', '撕咬', '毒液', '火焰', '冰霜', '雷击', '光', '爆炸', '毒雾', '风',
  '水流', '诅咒', '独头弹', '枪击穿透', '远程重击', '近战重击', '冲锋', '咆哮', '单体回复', '群体回复', '群体增益', '群体减益', '再动加速',
  '火焰01', '冰霜爆炸', '雷击01', '虚空震荡', '直线裂隙', '连续扫射',
  'group:melee', 'group:ranged', 'group:spell',
];
const INFERABLE = new Set(INFERABLE_FX);

export const FX_ALIASES = {
  '火': '火焰', '火球': '火焰', '火焰弹': '火焰', '火焰爆炸': '火焰',
  '冰': '冰霜', '冰锥': '冰霜', '冰霜弹': '冰霜',
  '雷': '雷击', '雷电': '雷击', '闪电': '雷击',
  '圣光': '光', '神圣': '光', '光束': '光',
  '毒': '毒液', '毒弹': '毒液', '毒液弹': '毒液',
  '斩击': '刀砍', '劈砍': '刀砍', '剑击': '刀砍',
  '射击': '枪击', '开枪': '枪击', '枪': '枪击',
  '弓箭': '箭矢', '射箭': '箭矢',
  '治疗': '单体回复', '回复': '单体回复',
};

const AREA = new Set(['直线', '扇形', '圆形', '全域', '爆炸']);
const has = (s, words) => words.some(w => s.includes(w));

function slotInfo(skill) {
  const slots = skillSlots(skill);
  const tags = slots.map(s => s.tag);
  const attacks = slots.filter(s => s.attack);
  return { slots, tags, attacks, maxPower: Math.max(0, ...slots.map(s => Number(s.power) || 0)) };
}

// 元素关键词（技能名 + 状态标签），先到先得；返回 [基础档, 升档]
function keywordFx(skill, info, area, multi) {
  const n = String(skill.name || ''), t = info.tags.join('|');
  const range = skill.range?.type;
  if (has(n, ['火', '焰', '炎', '燃', '焚']) || t.includes('燃烧')) return ['火焰', '火焰01'];
  if (has(n, ['冰', '霜', '雪', '寒', '冻'])) return ['冰霜', '冰霜爆炸'];
  if (has(n, ['雷', '电', '霆']) || t.includes('麻痹')) return ['雷击', '雷击01'];
  if (has(n, ['毒', '腐', '蚀', '瘴']) || t.includes('中毒')) return [area ? '毒雾' : '毒液', null];
  if (has(n, ['圣', '光', '辉'])) return ['光', null];
  if (has(n, ['水', '潮', '浪', '涌'])) return ['水流', null];
  if (has(n, ['虚空', '裂隙', '维度', '时空'])) { const f = range === '直线' ? '直线裂隙' : '虚空震荡'; return [f, f]; }
  if (has(n, ['咒', '诅', '厄', '怨'])) return ['诅咒', null];
  if (has(n, ['风', '旋', '飓']) && area) return ['风', null];
  if (has(n, ['爆', '炸', '榴']) || range === '爆炸') return ['爆炸', null];
  if (has(n, ['霰', '散弹', '鹿弹'])) return ['霰弹', null];
  if ((has(n, ['狙', '穿甲', '贯穿']) && has(n, ['枪', '弹'])) || (skill.isPierce && skill.damageType === '远程')) return ['枪击穿透', null];
  if (has(n, ['枪', '弹', '射击', '扫射', '手枪', '步枪']) || t.includes('枪击')) return ['枪击', multi >= 3 ? '连续扫射' : null];
  if (has(n, ['弓', '箭', '弩'])) return ['箭矢', null];
  if (has(n, ['爪', '抓', '挠'])) return ['爪击', null];
  if (has(n, ['咬', '噬', '啃'])) return ['撕咬', null];
  if (has(n, ['拳', '掌', '踢', '肘', '膝'])) return ['拳击', null];
  if (has(n, ['刀', '剑', '斩', '砍', '劈', '割', '刺'])) return ['刀砍', null];
  if (skill.displacements?.some(d => d.type === '冲锋')) return ['冲锋', null];
  if (has(n, ['吼', '咆', '嚎']) && !info.attacks.length) return ['咆哮', null];
  return null;
}

function supportFx(skill, info, area) {
  if (info.attacks.length) return null;
  const kinds = info.slots.map(s => s.definition.kind);
  if (kinds.includes('heal')) return area ? '群体回复' : '单体回复';
  if (skill.range?.type === '自身' && (info.tags.includes('再动') || kinds.includes('mainPoint') || skill.haste > 0)) return '再动加速';
  if (area && info.slots.some(s => !s.debuff && ['buff', 'shield'].includes(s.definition.kind))) return '群体增益';
  if (area && info.slots.some(s => s.debuff)) return '群体减益';
  return null;
}

function fallbackFx(skill, info) {
  if (!info.attacks.length) return null;
  const dt = skill.damageType || '近战', range = skill.range?.type || '单体';
  const table = {
    '单体': { '近战': info.maxPower >= 100 ? '近战重击' : '刀砍', '远程': '枪击', '法术': '光' },
    '直线': { '近战': '刀砍', '远程': '枪击', '法术': '直线裂隙' },
    '扇形': { '近战': '爪击', '远程': '霰弹', '法术': '风' },
    '圆形': { '近战': 'group:melee', '远程': 'group:ranged', '法术': 'group:spell' },
    '全域': { '近战': 'group:melee', '远程': 'group:ranged', '法术': 'group:spell' },
    '爆炸': { '近战': '爆炸', '远程': '爆炸', '法术': '火焰' },
  };
  return table[range]?.[dt] || null;
}

function correct(name) {
  if (FX_ALIASES[name]) return FX_ALIASES[name];
  let best = null;
  for (const legal of INFERABLE_FX) {
    if (legal.startsWith('group:')) continue;
    if (name.includes(legal) || legal.includes(name)) if (!best || legal.length > best.length) best = legal;
  }
  return best;
}

// legal：当前演出库全部合法名（Set）；boss：施放者是否显式首领
export function inferFxTag(skill, { legal, boss = false } = {}) {
  if (!skill) return null;
  const tag = skill.fxTag == null ? '' : String(skill.fxTag).trim();
  if (tag === '无') return null;
  if (tag && legal.has(tag)) return null;
  const info = slotInfo(skill);
  if (!info.slots.length || skill.category === '弹药') return null;   // 弹药与纯绑定载体不可施放，不给演出
  if (tag) {
    const fixed = correct(tag);
    if (fixed && legal.has(fixed)) return { fxTag: fixed, reason: 'corrected', from: tag };
  }
  const area = AREA.has(skill.range?.type);
  const upgrade = (skill.charge > 0) || boss || info.maxPower >= 140;
  const kw = keywordFx(skill, info, area, info.attacks.length);
  let pick = kw ? (upgrade && kw[1] ? kw[1] : kw[0]) : supportFx(skill, info, area) || fallbackFx(skill, info);
  if (pick && !legal.has(pick)) pick = kw && legal.has(kw[0]) ? kw[0] : null;
  return pick ? { fxTag: pick, reason: kw ? 'keyword' : 'fallback', from: tag || null } : null;
}

// 对一组技能/道具（含子用法）就地补全；返回推断条数
export function applyFxInference(rows, opts) {
  let n = 0;
  for (const row of rows || []) {
    if (!row || row.isGroup) continue;   // 技能组父项无演出，子项各自推断
    if (row.children?.length) { n += applyFxInference(row.children, opts); continue; }
    const r = inferFxTag(row, opts);
    if (r) { row.fxTag = r.fxTag; row.fxTagInferred = true; n++; }
  }
  return n;
}

// ---------- 元素判定（徽章 / 留痕 / 光照共用） ----------
export const ELEMENT_COLORS = {
  fire: '#fb923c', frost: '#7dd3fc', thunder: '#c4b5fd', poison: '#a3e635', holy: '#fde68a', water: '#38bdf8',
  void: '#c084fc', curse: '#a78bfa', wind: '#99f6e4', blast: '#f97316', gun: '#fde68a', arcane: '#a5b4fc', physical: '#cbd5e1',
};
const FX_ELEMENT = [
  [/火焰|燃烧|焚|炎/, 'fire'], [/冰|霜|雪/, 'frost'], [/雷/, 'thunder'], [/毒|坏死|腐/, 'poison'], [/光|圣/, 'holy'],
  [/水流|海螺|潮/, 'water'], [/虚空|裂隙|维度|时空/, 'void'], [/诅咒|造雾|浓雾/, 'curse'], [/风/, 'wind'], [/爆炸|燃烧弹/, 'blast'],
  [/枪|霰弹|独头|狙|砷弹|扫射|箭/, 'gun'],
];
const CATEGORY_ELEMENT = { '火焰': 'fire', '冰霜': 'frost', '雷电': 'thunder', '圣光': 'holy', '水流': 'water', '诅咒': 'curse',
  '枪击': 'gun', '霰弹': 'gun', '钝击': 'physical', '切割': 'physical', '中毒': 'poison', '燃烧': 'fire', '麻痹': 'thunder' };

export function skillElement(skill) {
  if (!skill) return null;
  const tag = String(skill.fxTag || '');
  if (tag.startsWith('group:')) return tag === 'group:spell' ? 'arcane' : 'physical';
  for (const [re, el] of FX_ELEMENT) if (re.test(tag)) return el;
  for (const s of skillSlots(skill)) { const el = CATEGORY_ELEMENT[s.tag]; if (el) return el; }
  if (!skillSlots(skill).some(s => s.attack)) return null;
  return skill.damageType === '法术' ? 'arcane' : 'physical';
}

// 单位主元素：威力最高的攻击技能
export function unitElement(unit) {
  let best = null, bp = -1;
  for (const s of unit?.skills || []) {
    const slots = skillSlots(s), atk = slots.filter(x => x.attack);
    if (!atk.length) continue;
    const p = Math.max(...atk.map(x => Number(x.power) || 0));
    if (p > bp) { bp = p; best = s; }
  }
  return best ? skillElement(best) : null;
}
