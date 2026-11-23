// ==========================================
// 战棋 P01 解析与规范化（生产解析资产移植自 index.html，扩展六范围/行动成本/新属性/显式追踪）
// 语义以 doc/tactics/P01-CONTRACT.md 为唯一来源。
// 纯数据模块：无 DOM、无职业初始化、无全局缓存、无 LLM。
// ==========================================

import { PROTOCOL_VERSION, PROTOTYPES, PROTOTYPE_NAMES, TACTICS_TAG_FIELDS,
         RANGE_TYPES, RANGE_PARAM_FIELDS, ACTION_COST_MAIN, ACTION_COST_AUX, ACTION_COST_DEFAULT } from './protocol.mjs';
import { slotTagOf, normalizeEffectTag, isLegacySlotTag, LEGACY_SELF_MIGRATE_TAGS, EFFECT_DEFINITIONS } from './effect-definitions.mjs';
import { jsyaml } from './vendor/js-yaml-4.1.0.mjs';

const ACTION_COST_NONE = { main: 0, aux: 0 };

// ---------- 原版解析资产（index.html L3103-3136 / L18609-18641 移植） ----------

const VARIANT_GRANT_NAMES = ['流体', '虚形', '破法', '要害', '防火', '耐毒', '钢体', '再生', '狂暴', '吸血', '荆棘', '复活'];

export function getGrantedVariantName(tag) {
  const m = String(tag || '').match(/^\[赋予[:：]([^\[\];]+)\]$/);
  return m && VARIANT_GRANT_NAMES.includes(m[1].trim()) ? m[1].trim() : null;
}

// 白名单取自 SKILL_TYPES（旧别名）＋ 规范标签基础名；[驱散]/[群驱散]/[肃正] 自带冒号语义须排除（原版口径）。
let _slotTagNamesCache = null;
export function normalizeColonPowerTags(str) {
  if (!_slotTagNamesCache) {
    const EXCLUDE = new Set(['驱散', '群驱散', '肃正']);
    const CANONICAL_BASES = ['伤害', '穿透', '眩晕', '散射', '治疗', '回蓝', '充能', '加攻', '加防', '加盾', '加瞄',
      '降防', '致盲', '迟滞', '虚弱', '减速', '中毒', '燃烧', '麻痹', '吸蓝', '嘲讽', '再动', '回避', '闪避', '免伤', '反击'];
    _slotTagNamesCache = new Set([
      ...SKILL_TYPES.map(t => t.replace(/[\[\]]/g, '')).filter(n => !EXCLUDE.has(n)),
      ...CANONICAL_BASES, ...Object.keys(EFFECT_DEFINITIONS),
    ]);
  }
  return String(str || '').replace(/\[赋予[:：]\s*([^\[\];]+?)\s*(?=;|\])/g, (m, name) => `[赋予:${name.trim()}`)
    .replace(/\[([^\[\]:;]+)[:：](-?\d+)\]/g,
    (m, tag, n) => _slotTagNamesCache.has(tag.trim()) ? `[${tag.trim()};power:${n}]` : m);
}

export const SKILL_TYPES = [
  '[无]', '[群攻]', '[群攻(爆炸)]', '[群攻(雷)]', '[群攻(火焰)]', '[群攻(枪击)]', '[群攻(毒雾)]', '[群攻(冰霜)]', '[群攻(风)]', '[群攻(光)]',
  '[单体]', '[单体(枪击)]', '[单体(火焰)]', '[单体(光)]', '[单体(雷)]', '[单体(爆炸)]', '[单体(刀砍)]', '[单体(拳击)]', '[单体(爪击)]', '[单体(撕咬)]', '[单体(毒液)]', '[单体(冰霜)]', '[群回]', '[单回]', '[群增]',
  '[单增]', '[群防]', '[单防]', '[群盾]', '[单盾]',
  '[群回蓝]', '[单回蓝]', '[吸蓝]', '[群冲]', '[单冲]', '[群瞄]', '[单瞄]', '[群降]', '[单降]', '[群盲]', '[单盲]', '[群滞]', '[单滞]', '[群弱]', '[单弱]', '[嘲讽]', '[反击]', '[群反击]', '[再动]', '[回避]', '[群避]', '[单避]',
  '[眩晕]', '[群眩晕]', '[穿透]', '[群穿透]', '[散射]', '[散射(霰弹)]', '[群散射]', '[群散射(霰弹)]', '[免伤]',
  '[中毒]', '[群中毒]', '[燃烧]', '[群燃烧]', '[麻痹]', '[群麻痹]',
  '[单速]', '[群速]', '[单缓]', '[群缓]',
  '[自盲]', '[自降]', '[自弱]', '[自滞]', '[自缓]',
  '[驱散]', '[群驱散]',
  '[肃正]', '[肃正:近战]', '[肃正:远程]', '[肃正:法术]',
  ...VARIANT_GRANT_NAMES.map(name => `[赋予:${name}]`),
  '[必中]', '[转火]', '[突进]', '[众召]',
  '[高阶]', '[传奇]', '[神术]',
  '[近战]', '[远程]', '[法术]'
];

// ---------- 新扩展标签提取（六范围 / 行动成本 / 新属性 / 位移，先于主槽解析摘除，不占三效果槽） ----------

const RANGE_TAG_RE = /\[\s*范围\s*[:：]\s*([^\[\]]+)\]/i;
const ACTION_TAG_RE = /\[\s*行动\s*[:：]\s*(主|辅)\s*\]/i;
// [位移:侧闪|击退|拉近|冲锋|后撤;距离:N(;方向:…)]：战棋位移真值（可多个，不占效果槽）
const SHIFT_TAG_RE = /\[\s*位移\s*[:：]\s*([^\[\]]+)\]/g;
const SHIFT_TYPES = ['侧闪', '击退', '拉近', '冲锋', '后撤'];

// [范围:直线;长:10;宽:1] → { type:'直线', length:10, width:1, _explicit:['type','length','width'] }
function parseRangeTag(body) {
  const segs = body.split(/[;；]/).map(s => s.trim()).filter(Boolean);
  if (!segs.length) return null;
  const type = segs[0];
  if (!RANGE_TYPES.includes(type)) return null;
  const range = { type };
  const explicit = ['type'];
  for (let i = 1; i < segs.length; i++) {
    const m = segs[i].match(/^([^:：]+)[:：]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!m) continue;
    const field = RANGE_PARAM_FIELDS[m[1].trim()];
    if (!field || range[field] !== undefined) continue;
    range[field] = parseFloat(m[2]);
    explicit.push(field);
  }
  if (range.type === '圆形' && range.castRange !== undefined) range.type = '爆炸';
  return { range, explicit };
}

function extractExtendedTags(str) {
  // 返回 { text(摘除后), range, rangeExplicit, actionCost, actionExplicit, shift, displacements }
  let text = String(str || '');
  let range = null, rangeExplicit = null, actionCost = null, actionExplicit = null, shift = null;
  const displacements = [];
  const rangeMatch = text.match(RANGE_TAG_RE);
  if (rangeMatch) {
      const parsed = parseRangeTag(rangeMatch[1]);
    if (parsed) {
      range = parsed.range; rangeExplicit = parsed.explicit;
      text = text.replace(rangeMatch[0], '');
    }
  }
  const actionMatch = text.match(ACTION_TAG_RE);
  if (actionMatch) {
    actionCost = actionMatch[1] === '辅' ? ACTION_COST_AUX : ACTION_COST_MAIN;
    actionExplicit = ['main', 'aux'];
    text = text.replace(actionMatch[0], '');
  }
  text = text.replace(SHIFT_TAG_RE, (whole, body) => {
    const segs = String(body).split(/[;；]/).map(s => s.trim()).filter(Boolean);
    const type = segs[0];
    if (!SHIFT_TYPES.includes(type)) return whole;
    let distance = null, direction = null;
    segs.slice(1).forEach(seg => {
      const m = seg.match(/^([^:：]+)[:：]\s*(.+)$/);
      if (!m) return;
      const k = m[1].trim(), v = m[2].trim();
      if (k === '距离') { const n = Number(v); if (Number.isFinite(n)) distance = n; }
      else if (k === '方向') direction = v;
    });
    const normalizedType = type === '后撤' ? '侧闪' : type;
    const d = { type: normalizedType, distance: distance == null ? null : distance };
    if (direction) d.direction = direction;
    displacements.push(d);
    return '';
  });
  const side = displacements.find(d => d.type === '侧闪');
  if (side) shift = { mode: 'side', distance: side.distance == null ? 2 : side.distance };
  return { text, range, rangeExplicit, actionCost, actionExplicit, shift, displacements };
}

// ---------- 属性解析（原版 L18609 扩展：规范对象形态 + 中文属性 + 新属性标签 + 显式追踪） ----------

// 中文属性字段 → 规范字段（HP/MP 同时写当前与最大）
const CN_ATTR_FIELDS = {
  'HP': ['hp', 'maxHp'], 'MP': ['mp', 'maxMp'],
  'Atk': ['atk'], 'Armor': ['def'],
  '敏捷': ['spd'], '闪避': ['evasion'], '力量': ['strength'],
  '总重量kg': ['totalWeight'], '总重量': ['totalWeight'],
  '移动': ['moveDistance'], '感知': ['perception'],
  '占格': ['footprint'], '职业': ['classType'],
};

// 特性：数组/分隔串 → 标准方括号标签（[钢体]/[流体]…）
function normalizeTraitTags(v) {
  const arr = Array.isArray(v) ? v : String(v == null ? '' : v).split(/[,，、;；\s]+/);
  return arr.map(x => String(x == null ? '' : x).trim()).filter(Boolean)
    .map(t => /^\[.*\]$/.test(t) ? t : '[' + t.replace(/^\[|\]$/g, '') + ']');
}

// 属性串旧标签 + 新属性标签；返回字段级显式列表。
export function parseAttributes(attrInput) {
  const explicit = [];
  const r = { hp: null, maxHp: null, mp: null, maxMp: null, tp: null, maxTp: null,
              atk: null, def: null, spd: null, actCount: null, classType: null, isWise: false,
              attrTags: [], evasion: null, strength: null, totalWeight: null,
              moveDistance: null, perception: null, footprint: null };

  if (attrInput && typeof attrInput === 'object' && !Array.isArray(attrInput)) {
    // 规范对象形态：中文键先映射为规范键；own-property 判定显式；undefined 才填缺省；null 合法保留。
    const src = {};
    Object.keys(attrInput).forEach(k => { src[k] = attrInput[k]; });
    Object.keys(CN_ATTR_FIELDS).forEach(cn => {
      if (!Object.prototype.hasOwnProperty.call(attrInput, cn)) return;
      const v = attrInput[cn];
      CN_ATTR_FIELDS[cn].forEach(field => { src[field] = v; });
    });
    if (Object.prototype.hasOwnProperty.call(attrInput, '特性')) src.attrTags = normalizeTraitTags(attrInput['特性']);

    const num = (k, dflt) => {
      if (Object.prototype.hasOwnProperty.call(src, k)) {
        const v = src[k];
        explicit.push(k);
        r[k] = v === null ? null : (Number.isFinite(+v) ? +v : null);
      } else r[k] = dflt;
    };
    num('hp', 100); num('maxHp', 100); num('mp', 50); num('maxMp', 50);
    num('atk', 10); num('def', 5); num('spd', 100);
    num('tp', 0); num('maxTp', 0); num('actCount', 1);
    num('evasion', null); num('strength', null); num('totalWeight', null);
    num('moveDistance', null); num('perception', null);
    if (Object.prototype.hasOwnProperty.call(src, 'classType')) {
      explicit.push('classType');
      r.classType = src.classType === null ? null : (src.classType == null ? null : String(src.classType).trim() || null);
    }
    if (Object.prototype.hasOwnProperty.call(src, 'isWise')) {
      explicit.push('isWise');
      r.isWise = !!src.isWise;
    }
    if (Object.prototype.hasOwnProperty.call(src, 'footprint')) {
      explicit.push('footprint');
      r.footprint = normalizeFootprint(src.footprint);
    }
    if (Array.isArray(src.attrTags)) {
      explicit.push('attrTags');
      r.attrTags = src.attrTags.map(t => String(t));
    }
    r._explicit = explicit;
    return r;
  }

  const attrStr = String(attrInput || '');
  const hp = attrStr.match(/\[HP:(\d+)\/(\d+)\]/i);
  const mp = attrStr.match(/\[MP:(\d+)\/(\d+)\]/i);
  const atk = attrStr.match(/\[Atk:(\d+)\]/i);
  const armor = attrStr.match(/\[Armor:(\d+)\]/i);
  const speed = attrStr.match(/\[Speed:(\d+)\]/i);
  const act = attrStr.match(/\[(?:行动|行动次数|Act)[:：](\d+)\]/i);
  const classMatch = attrStr.match(/\[(?:职业|职阶|Class|Role)[:：]([^\]]+)\]/i);
  const wiseMatch = attrStr.match(/\[智慧\]/i);
  const eva = attrStr.match(/\[闪避[:：](\d+)\]/i);
  const str_ = attrStr.match(/\[力量[:：](\d+)\]/i);
  const weight = attrStr.match(/\[总重[:：](\d+)\]/i);
  const move = attrStr.match(/\[移动[:：](\d+)\]/i);
  const perc = attrStr.match(/\[感知[:：](\d+)\]/i);
  const foot = attrStr.match(/\[体型[:：](\d+)\s*[x×]\s*(\d+)\]/i);

  r.hp = hp ? parseInt(hp[1]) : 100; r.maxHp = hp ? parseInt(hp[2]) : 100;
  if (hp) explicit.push('hp', 'maxHp');
  r.mp = mp ? parseInt(mp[1]) : 50; r.maxMp = mp ? parseInt(mp[2]) : 50;
  if (mp) explicit.push('mp', 'maxMp');
  r.atk = atk ? parseInt(atk[1]) : 10;
  if (atk) explicit.push('atk');
  r.def = armor ? parseInt(armor[1]) : 5;
  if (armor) explicit.push('def');
  r.spd = speed ? parseInt(speed[1]) : 100;
  if (speed) explicit.push('spd');
  r.actCount = act ? parseInt(act[1]) : 1;
  if (act) explicit.push('actCount');
  r.classType = classMatch ? classMatch[1].trim() : null;
  if (classMatch) explicit.push('classType');
  r.isWise = !!wiseMatch;
  if (wiseMatch) explicit.push('isWise');
  r.evasion = eva ? parseInt(eva[1]) : null;
  if (eva) explicit.push('evasion');
  r.strength = str_ ? parseInt(str_[1]) : null;
  if (str_) explicit.push('strength');
  r.totalWeight = weight ? parseInt(weight[1]) : null;
  if (weight) explicit.push('totalWeight');
  r.moveDistance = move ? parseInt(move[1]) : null;
  if (move) explicit.push('moveDistance');
  r.perception = perc ? parseInt(perc[1]) : null;
  if (perc) explicit.push('perception');
  r.footprint = foot ? { width: parseInt(foot[1]), height: parseInt(foot[2]) } : null;
  if (foot) explicit.push('footprint');

  // 通用变种标签收集（原版口径）：剔除已解析带值字段后剩余裸 [xxx]
  const ignored = /\[(?:HP|MP|Atk|Armor|Speed|行动|行动次数|Act|职业|职阶|Class|Role|闪避|力量|总重|移动|感知|体型)[:：][^\]]*\]/gi;
  const without = attrStr.replace(ignored, '');
  const pure = without.match(/\[[^\]\[:：]*\]/g);
  if (pure) r.attrTags = pure;
  r._explicit = explicit;
  return r;
}

function normalizeFootprint(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const w = +v.width, h = +v.height;
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
    return null;
  }
  const m = String(v == null ? '' : v).trim().match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  return m ? { width: parseInt(m[1]), height: parseInt(m[2]) } : null;
}

// ---------- 技能解析（原版 L18643-18809 移植 + range/actionCost/位移扩展） ----------

export function parseSkill(skillStr) {
  // 扩展标签先摘除，再走原版归一化
  const ext = extractExtendedTags(skillStr);
  skillStr = normalizeColonPowerTags(ext.text);
  let nameMatch = skillStr.match(/【(.*?)】/); let name = nameMatch ? nameMatch[1] : "普通攻击";

  let mpMatch = skillStr.match(/\[MP:(\d+)\]/i); let cost = mpMatch ? parseInt(mpMatch[1]) : 0;
  let hpMatch = skillStr.match(/\[HP:(\d+)\]/i); let hpCost = hpMatch ? parseInt(hpMatch[1]) : 0;
  let tpMatch = skillStr.match(/\[TP:(\d+)\]/i); let tpCost = tpMatch ? parseInt(tpMatch[1]) : 0;

  let chargeMatch = skillStr.match(/\[(?:Charge|充能|蓄力):(\d+)\]/i);
  let charge = chargeMatch ? parseInt(chargeMatch[1]) : 0;

  let delayMatch = skillStr.match(/\[延迟:(\d+)\]/i);
  let delay = delayMatch ? parseInt(delayMatch[1]) : 0;
  let hasteMatch = skillStr.match(/\[加速:(\d+)\]/i);
  let haste = hasteMatch ? parseInt(hasteMatch[1]) : 0;

  let limitMatch = skillStr.match(/\[限(\d+)次?\]/i);
  let maxUses = limitMatch ? parseInt(limitMatch[1]) : 0;

  // [冷却:N]：独立冷却字段（提交施放后 N×100 绝对到期；与 [延迟:N] 准备式延迟无关）
  let cooldownMatch = skillStr.match(/\[(?:冷却|CD)[:：](\d+)\]/i);
  let cooldownTurns = cooldownMatch ? parseInt(cooldownMatch[1]) : 0;

  let dispelMatch = skillStr.match(/\[(群驱散|驱散)(?::(\d+))?\]/i);
  let dispelRaw = dispelMatch ? dispelMatch[1] : null;
  let dispelCount = dispelRaw ? (dispelMatch[2] ? parseInt(dispelMatch[2]) : 1) : 0;
  skillStr = skillStr.replace(/\[(群驱散|驱散):(-?\d+)\]/g, '[$1;power:$2]');

  let barrierArmor = 0;
  let barrierArmorMatch = skillStr.match(/;Armor:(\d+)/i);
  if (barrierArmorMatch) barrierArmor = parseInt(barrierArmorMatch[1]);
  skillStr = skillStr.replace(/;Armor:\d+/gi, '');
  let barrierSub = null;
  let barrierMatch = skillStr.match(/\[肃正(?::([^;\]\[]+))?(?:;power:(-?\d+))?\]/i);
  if (barrierMatch && barrierMatch[1] && ['近战', '远程', '法术'].includes(barrierMatch[1].trim())) {
    barrierSub = barrierMatch[1].trim();
  }

  let dmgTypeMatch = skillStr.match(/\[(近战|远程|法术)\]/);
  let damageType = dmgTypeMatch ? dmgTypeMatch[1] : null;

  let isReaction = false;
  let reactionTarget = 'all';
  let reactionMatch = skillStr.match(/\[反应(?::(近战|远程|法术))?\]/i);
  if (reactionMatch) {
    isReaction = true;
    if (reactionMatch[1]) reactionTarget = reactionMatch[1];
  }

  let kanpoTarget = null;
  let kanpoMatch = skillStr.match(/\[看破(?::([^\]]+))?\]/i);
  if (kanpoMatch) kanpoTarget = kanpoMatch[1] ? kanpoMatch[1].trim() : 'all';

  let sheshenTarget = null;
  let sheshenMatch = skillStr.match(/\[舍身(?::([^\]]+))?\]/i);
  if (sheshenMatch) sheshenTarget = sheshenMatch[1] ? sheshenMatch[1].trim() : 'all';

  let summonTarget = null;
  const _summonMatches = [...skillStr.matchAll(/\[\s*召唤\s*[:：]\s*((?:[^\[\]]|\[[^\[\]]*\])+)\]/gi)];
  if (_summonMatches.length) {
    summonTarget = _summonMatches.map(m => m[1].trim()).filter(Boolean).join('；') || null;
    _summonMatches.forEach(m => { skillStr = skillStr.replace(m[0], ''); });
  }
  let summonNoLimit = /\[众召\]/i.test(skillStr);

  let isOthers = /\[他人\]/i.test(skillStr);
  let guaranteedHit = /\[必中\]/i.test(skillStr);
  let switchTarget = /\[转火\]/i.test(skillStr);
  let ignoreRow = /\[(突进|无视站位)\]/i.test(skillStr);
  let critMatch = skillStr.match(/\[暴击[:：]\s*(\d+)\s*%?\]/i);
  let critRate = critMatch ? Math.max(0, Math.min(100, parseInt(critMatch[1]))) : 0;
  let _isLegendary = /\[传奇\]|\[神术\]/i.test(skillStr);
  let _isHighTier = !_isLegendary && /\[高阶\]/i.test(skillStr);

  let hitMatch = skillStr.match(/\[(?:Hit|Aim):(\d+)\]/i);
  let hit = hitMatch ? parseInt(hitMatch[1]) : 100;

  let turnsMatch = skillStr.match(/\[(?:Turns|Turn|回|持续):(\d+)\]/i);
  let turns = turnsMatch ? parseInt(turnsMatch[1]) : null;

  let isPierce = false;
  const nonSlots = new Set(['[无]', '[必中]', '[转火]', '[突进]', '[众召]', '[高阶]', '[传奇]', '[神术]', '[近战]', '[远程]', '[法术]', '[自盲]', '[自降]', '[自弱]', '[自滞]', '[自缓]']);
  const rawMatches = [...skillStr.matchAll(/\[([^\[\];]+?)(?:;power:(-?\d+))?(?:;turns:(\d+))?\]/gi)].filter(m => {
    if (m[2] !== undefined) return true;
    return !nonSlots.has('[' + m[1] + ']') && !!slotTagOf(m[1]);
  });
  // 裸 [穿透] = 整技穿透 bool（不占槽）；[穿透;power:N] 旧伤害槽保真。
  // 眩晕：无 power = 纯减益槽（power 0）；旧带 power 拆为伤害槽 + 眩晕槽（最多 3 槽）。
  const typeMatches = [];
  for (const m of rawMatches) {
    const norm = normalizeEffectTag(m[1]);
    if (norm === '穿透' && m[2] === undefined) { isPierce = true; continue; }
    if (norm === '眩晕') {
      if (m[2] === undefined) { typeMatches.push([m[0], '眩晕', '0', m[3]]); continue; }
      typeMatches.push([m[0], '伤害', m[2], m[3]]);
      typeMatches.push([m[0], '眩晕', '0', m[3]]);
      continue;
    }
    typeMatches.push([m[0], m[1], m[2], m[3]]);
  }
  if (typeMatches.length > 3) typeMatches.length = 3;
  // 槽位输出规范标签（旧单群写法只作别名读入，本函数输出不再保留）；子型括号保留
  let types = ['[无]', '[无]', '[无]']; let powers = [0, 0, 0]; let slotTurnsArr = [null, null, null];
  for (let i = 0; i < Math.min(typeMatches.length, 3); i++) {
    types[i] = '[' + normalizeEffectTag(typeMatches[i][1]) + ']';
    const normTag = normalizeEffectTag(typeMatches[i][1]);
    powers[i] = getGrantedVariantName(types[i]) ? 0 : (typeMatches[i][2] !== undefined ? parseInt(typeMatches[i][2]) : (/^(?:再动|驱散)$/.test(normTag) ? 1 : normTag === '伤害' ? 20 : 50));
    if (typeMatches[i][3] !== undefined) slotTurnsArr[i] = parseInt(typeMatches[i][3]);
  }
  if (!typeMatches.length) {
    const noDamageIntent = !!(summonTarget || barrierMatch || kanpoTarget || sheshenTarget || /\[自爆[:：]/.test(skillStr));
    if (!noDamageIntent) { types[0] = '[伤害]'; powers[0] = 20; }
  }

  if (dispelRaw && !types.some(t => t.includes('驱散'))) {
    const dispelTag = '[驱散]';
    if (!typeMatches.length && !summonTarget) {
      types[0] = dispelTag; powers[0] = dispelCount;
    } else {
      for (let i = 1; i < 3; i++) {
        if (types[i] === '[无]') { types[i] = dispelTag; powers[i] = dispelCount; break; }
      }
    }
  }

  if (barrierMatch && !types.some(t => t.includes('肃正'))) {
    const szTag = barrierSub ? `[肃正:${barrierSub}]` : '[肃正]';
    if (!typeMatches.length) {
      types[0] = szTag; powers[0] = 50;
    } else {
      for (let i = 1; i < 3; i++) {
        if (types[i] === '[无]') { types[i] = szTag; powers[i] = 50; break; }
      }
    }
  }

  let fxTagMatch = skillStr.match(/\[特效:([^\]]+)\]/i);
  let fxTag = fxTagMatch ? fxTagMatch[1].trim() : null;

  const _explicit = [];
  if (mpMatch) _explicit.push('cost');
  if (hpMatch) _explicit.push('hpCost');
  if (tpMatch) _explicit.push('tpCost');
  if (chargeMatch) _explicit.push('charge');
  if (delayMatch) _explicit.push('delay');
  if (hasteMatch) _explicit.push('haste');
  if (limitMatch) _explicit.push('maxUses');
  if (cooldownMatch) _explicit.push('cooldownTurns');
  if (critMatch) _explicit.push('critRate');
  if (hitMatch) _explicit.push('hit');
  if (barrierArmorMatch) _explicit.push('barrierArmor');
  typeMatches.slice(0, 3).forEach((m, i) => {
    const suffix = i === 0 ? '' : String(i + 1);
    _explicit.push('type' + suffix);
    if (m[2] !== undefined) _explicit.push('power' + suffix);
    if (m[3] !== undefined) _explicit.push('slotTurns' + suffix);
  });
  if (turnsMatch) _explicit.push('turns');
  if (fxTagMatch) _explicit.push('fxTag');
  if (isPierce) _explicit.push('isPierce');
  // 扩展字段显式追踪
  if (ext.range) { _explicit.push('range'); ext.rangeExplicit.forEach(f => _explicit.push('range.' + f)); }
  if (/\[不分敌友\]/.test(skillStr)) _explicit.push('affectsAll');
  if (ext.shift) _explicit.push('evadeShift');
  if (ext.displacements.length) _explicit.push('displacements');
  if (ext.actionExplicit) _explicit.push('actionCost');

  // 显式范围缺尺寸按 S14 补齐（补齐值不标记 explicit）；补齐后 range 是唯一空间信息来源
  const affectsAll = /\[不分敌友\]/.test(ext.text);
  const range = ext.range ? fillRangeDefaults(ext.range) : null;

  // 旧协议来源识别（contract v3）：无显式 [范围] 输入视为旧写法——[再动]/[赋予:X] 槽迁移期自动标 self；
  // 新规范输入＋显式范围一律按范围友敌方，不锁 self。自X 代价槽恒 self（定义表 side:'self'）。
  let slotTargets = null;
  if (!ext.range) {
    const marks = [];
    let marked = false;
    for (let i = 0; i < 3; i++) {
      const normTag = types[i] === '[无]' ? null : normalizeEffectTag(types[i]);
      if (normTag && LEGACY_SELF_MIGRATE_TAGS.some(t => normTag === t || normTag.indexOf(t + ':') === 0)) { marks[i] = 'self'; marked = true; }
    }
    if (marked) slotTargets = [marks[0] || null, marks[1] || null, marks[2] || null];
  }

  return { name: name, cost: cost, hpCost: hpCost, tpCost: tpCost, charge: charge, delay: delay, haste: haste, maxUses: maxUses, usesRemaining: maxUses, cooldownTurns: cooldownTurns, slotTargets: slotTargets, hit: hit, turns: turns, slotTurns: slotTurnsArr[0], slotTurns2: slotTurnsArr[1], slotTurns3: slotTurnsArr[2], type: types[0], power: powers[0], type2: types[1], power2: powers[1], type3: types[2], power3: powers[2], isReaction: isReaction, reactionTarget: reactionTarget, kanpoTarget: kanpoTarget, sheshenTarget: sheshenTarget, damageType: damageType, isOthers: isOthers, guaranteedHit: guaranteedHit, switchTarget: switchTarget, ignoreRow: ignoreRow, critRate: critRate, fxTag: fxTag, barrierSub: barrierSub || (barrierMatch && damageType && ['近战', '远程', '法术'].includes(damageType) ? damageType : null), barrierArmor: barrierArmor, isHighTier: _isHighTier, isLegendary: _isLegendary, isPierce: isPierce, summonTarget: summonTarget, summonNoLimit: summonNoLimit, range, actionCost: ext.actionCost || ACTION_COST_DEFAULT, evadeShift: ext.shift, displacements: ext.displacements, regionEffect: null, affectsAll, reactionSource: false, deathTag: null, _explicit: _explicit };
}

// S14 缺尺寸预设：显式直线缺长/宽 → 10/1；显式爆炸缺射程/半径 → 15/3。仅补缺失键。
function fillRangeDefaults(range) {
  const r = Object.assign({}, range);
  if (r.type === '直线') {
    if (r.length === undefined) r.length = 10;
    if (r.width === undefined) r.width = 1;
  } else if (r.type === '爆炸') {
    if (r.castRange === undefined) r.castRange = 15;
    if (r.radius === undefined) r.radius = 3;
  }
  return r;
}

// ---------- 物品解析（原版 L18818-18939 移植 + range/actionCost/位移扩展） ----------

export function parseItem(itemStr) {
  const ext = extractExtendedTags(itemStr);
  let raw = normalizeColonPowerTags(ext.text);
  let nameMatch = raw.match(/【(.*?)】/); let name = nameMatch ? nameMatch[1] : "未知物品";

  let category = '道具';
  if (/\[消耗品\]/i.test(raw)) category = '消耗品';
  else if (/\[弹药\]/i.test(raw)) category = '弹药';

  let countMatch = raw.match(/\[数量[:：](\d+)\]/i);
  let count = countMatch ? parseInt(countMatch[1]) : 1;
  let usesMatch = raw.match(/\[次数[:：](\d+)\]/i);
  let maxUses = usesMatch ? parseInt(usesMatch[1]) : 0;

  let bindings = [];
  let bindMatch = raw.match(/\[绑定[:：]([^\]]+)\]/i);
  if (bindMatch) {
    bindMatch[1].split(/[;；]/).forEach(seg => {
      const segTrim = seg.trim(); if (!segTrim) return;
      const b = segTrim.match(/^(.*?)\s*[*×xX]\s*(\d+)$/);
      if (b) bindings.push({ skillName: b[1].trim(), cost: parseInt(b[2]) });
      else bindings.push({ skillName: segTrim, cost: 1 });
    });
  }

  let barrierArmor = 0;
  let barrierArmorMatch = raw.match(/;Armor:(\d+)/i);
  if (barrierArmorMatch) barrierArmor = parseInt(barrierArmorMatch[1]);
  raw = raw.replace(/;Armor:\d+/gi, '');
  let barrierSub = null;
  let barrierMatch = raw.match(/\[肃正(?::([^;\]\[]+))?(?:;power:(-?\d+))?\]/i);
  if (barrierMatch && barrierMatch[1] && ['近战', '远程', '法术'].includes(barrierMatch[1].trim())) barrierSub = barrierMatch[1].trim();
  let dispelMatch = raw.match(/\[(群驱散|驱散)(?::(\d+))?\]/i);
  let dispelRaw = dispelMatch ? dispelMatch[1] : null;
  let dispelCount = dispelRaw ? (dispelMatch[2] ? parseInt(dispelMatch[2]) : 1) : 0;
  raw = raw.replace(/\[(群驱散|驱散):(-?\d+)\]/g, '[$1;power:$2]');
  let isPierce = false;
  const nonSlots = new Set(['[无]', '[必中]', '[转火]', '[突进]', '[众召]', '[高阶]', '[传奇]', '[神术]', '[近战]', '[远程]', '[法术]', '[自盲]', '[自降]', '[自弱]', '[自滞]', '[自缓]']);
  const rawMatches = [...raw.matchAll(/\[([^\[\];]+?)(?:;power:(-?\d+))?(?:;turns:(\d+))?\]/gi)].filter(m => {
    if (m[2] !== undefined) return true;
    return !nonSlots.has('[' + m[1] + ']') && !!slotTagOf(m[1]);
  });
  const typeMatches = [];
  for (const m of rawMatches) {
    const norm = normalizeEffectTag(m[1]);
    if (norm === '穿透' && m[2] === undefined) { isPierce = true; continue; }
    if (norm === '眩晕') {
      if (m[2] === undefined) { typeMatches.push([m[0], '眩晕', '0', m[3]]); continue; }
      typeMatches.push([m[0], '伤害', m[2], m[3]]);
      typeMatches.push([m[0], '眩晕', '0', m[3]]);
      continue;
    }
    typeMatches.push([m[0], m[1], m[2], m[3]]);
  }
  if (typeMatches.length > 3) typeMatches.length = 3;
  let types = ['[无]', '[无]', '[无]']; let powers = [0, 0, 0]; let slotTurnsArr = [null, null, null];
  for (let i = 0; i < Math.min(typeMatches.length, 3); i++) {
    types[i] = '[' + normalizeEffectTag(typeMatches[i][1]) + ']';
    const normTag = normalizeEffectTag(typeMatches[i][1]);
    powers[i] = getGrantedVariantName(types[i]) ? 0 : (typeMatches[i][2] !== undefined ? parseInt(typeMatches[i][2]) : (/^(?:再动|驱散)$/.test(normTag) ? 1 : normTag === '伤害' ? 20 : 50));
    if (typeMatches[i][3] !== undefined) slotTurnsArr[i] = parseInt(typeMatches[i][3]);
  }

  if (dispelRaw && !types.some(t => t.includes('驱散'))) {
    const dispelTag = '[驱散]';
    if ((types[0] === '[无]' && powers[0] === 0) || (!typeMatches.length)) { types[0] = dispelTag; powers[0] = dispelCount; }
    else { for (let i = 1; i < 3; i++) { if (types[i] === '[无]') { types[i] = dispelTag; powers[i] = dispelCount; break; } } }
  }
  if (barrierMatch && !types.some(t => t.includes('肃正'))) {
    const szTag = barrierSub ? `[肃正:${barrierSub}]` : '[肃正]';
    if ((types[0] === '[无]' && powers[0] === 0) || (!typeMatches.length)) { types[0] = szTag; powers[0] = 50; }
    else { for (let i = 1; i < 3; i++) { if (types[i] === '[无]') { types[i] = szTag; powers[i] = 50; break; } } }
  }
  let isOthers = /\[他人\]/i.test(raw);
  let guaranteedHit = /\[必中\]/i.test(raw);
  let switchTarget = /\[转火\]/i.test(raw);
  let ignoreRow = /\[(突进|无视站位)\]/i.test(raw);
  let critMatch = raw.match(/\[暴击[:：]\s*(\d+)\s*%?\]/i);
  let critRate = critMatch ? Math.max(0, Math.min(100, parseInt(critMatch[1]))) : 0;
  let _isLegendary = /\[传奇\]|\[神术\]/i.test(raw);
  let _isHighTier = !_isLegendary && /\[高阶\]/i.test(raw);
  let hitMatch = raw.match(/\[(?:Hit|Aim):(\d+)\]/i);
  let hit = hitMatch ? parseInt(hitMatch[1]) : 100;
  let turnsMatch = raw.match(/\[(?:Turns|Turn|持续):(\d+)\]/i);
  let turns = turnsMatch ? parseInt(turnsMatch[1]) : null;
  let dmgTypeMatch = raw.match(/\[(近战|远程|法术)\]/);
  let damageType = dmgTypeMatch ? dmgTypeMatch[1] : null;
  let fxTagMatch = raw.match(/\[特效:([^\]]+)\]/i);
  let fxTag = fxTagMatch ? fxTagMatch[1].trim() : null;

  let mpMatch = raw.match(/\[MP:(\d+)\]/i); let cost = mpMatch ? parseInt(mpMatch[1]) : 0;
  let hpMatch = raw.match(/\[HP:(\d+)\]/i); let hpCost = hpMatch ? parseInt(hpMatch[1]) : 0;
  let tpMatch = raw.match(/\[TP:(\d+)\]/i); let tpCost = tpMatch ? parseInt(tpMatch[1]) : 0;
  let delayMatch = raw.match(/\[延迟:(\d+)\]/i); let delay = delayMatch ? parseInt(delayMatch[1]) : 0;
  let hasteMatch = raw.match(/\[加速:(\d+)\]/i); let haste = hasteMatch ? parseInt(hasteMatch[1]) : 0;
  const _summonMatches = [...raw.matchAll(/\[\s*召唤\s*[:：]\s*((?:[^\[\]]|\[[^\[\]]*\])+)\]/gi)];
  let summonTarget = _summonMatches.length ? (_summonMatches.map(m => m[1].trim()).filter(Boolean).join('；') || null) : null;
  let summonNoLimit = /\[众召\]/i.test(raw);

  if (category === '弹药') { types = ['[无]', '[无]', '[无]']; powers = [0, 0, 0]; barrierSub = null; barrierArmor = 0; isPierce = false; }

  const _explicit = [];
  if (mpMatch) _explicit.push('cost');
  if (hpMatch) _explicit.push('hpCost');
  if (tpMatch) _explicit.push('tpCost');
  if (delayMatch) _explicit.push('delay');
  if (hasteMatch) _explicit.push('haste');
  if (usesMatch) _explicit.push('maxUses');
  if (countMatch) _explicit.push('count');
  if (critMatch) _explicit.push('critRate');
  if (hitMatch) _explicit.push('hit');
  if (barrierArmorMatch) _explicit.push('barrierArmor');
  typeMatches.slice(0, 3).forEach((m, i) => {
    const suffix = i === 0 ? '' : String(i + 1);
    _explicit.push('type' + suffix);
    if (m[2] !== undefined) _explicit.push('power' + suffix);
    if (m[3] !== undefined) _explicit.push('slotTurns' + suffix);
  });
  if (turnsMatch) _explicit.push('turns');
  if (fxTagMatch) _explicit.push('fxTag');
  if (bindMatch) _explicit.push('bindings');
  if (isPierce) _explicit.push('isPierce');
  if (ext.range) { _explicit.push('range'); ext.rangeExplicit.forEach(f => _explicit.push('range.' + f)); }
  if (ext.displacements.length) _explicit.push('displacements');
  if (ext.actionExplicit) _explicit.push('actionCost');

  const affectsAll = /\[不分敌友\]/.test(ext.text);
  const range = ext.range ? fillRangeDefaults(ext.range) : null;

  // 物品槽位迁移期 self 标记（口径同 parseSkill）
  let slotTargets = null;
  if (!ext.range) {
    const marks = [];
    let marked = false;
    for (let i = 0; i < 3; i++) {
      const normTag = types[i] === '[无]' ? null : normalizeEffectTag(types[i]);
      if (normTag && LEGACY_SELF_MIGRATE_TAGS.some(t => normTag === t || normTag.indexOf(t + ':') === 0)) { marks[i] = 'self'; marked = true; }
    }
    if (marked) slotTargets = [marks[0] || null, marks[1] || null, marks[2] || null];
  }

  return { isItem: true, name: name, category: category, count: count, maxUses: maxUses, usesRemaining: maxUses, bindings: bindings, cost: cost, hpCost: hpCost, tpCost: tpCost, delay: delay, haste: haste, summonTarget: summonTarget, summonNoLimit: summonNoLimit, slotTargets: slotTargets, hit: hit, turns: turns, slotTurns: slotTurnsArr[0], slotTurns2: slotTurnsArr[1], slotTurns3: slotTurnsArr[2], type: types[0], power: powers[0], type2: types[1], power2: powers[1], type3: types[2], power3: powers[2], damageType: damageType, isOthers: isOthers, guaranteedHit: guaranteedHit, switchTarget: switchTarget, ignoreRow: ignoreRow, critRate: critRate, fxTag: fxTag, isHighTier: _isHighTier, isLegendary: _isLegendary, isPierce: isPierce, barrierSub: barrierSub || (barrierMatch && damageType && ['近战', '远程', '法术'].includes(damageType) ? damageType : null), barrierArmor: barrierArmor, range, actionCost: ext.actionCost || ACTION_COST_DEFAULT, evadeShift: ext.shift, displacements: ext.displacements, regionEffect: null, affectsAll, reactionSource: false, deathTag: null, _explicit: _explicit };
}

// ---------- 组解析（原版 L18952-19061 移植） ----------

export function isNestedGroup(el) {
  if (typeof el !== 'object' || el === null || Array.isArray(el)) return false;
  const keys = Object.keys(el);
  if (keys.length !== 1) return false;
  const val = el[keys[0]];
  return Array.isArray(val) && val.length > 0 && val.every(x => typeof x === 'string');
}

export function isFlatGroupHead(el) {
  return typeof el === 'string' && /^【[^【】]+】$/.test(el.trim());
}

export function parseSkillList(arr) {
  const out = [];
  arr.forEach(el => {
    if (isNestedGroup(el)) {
      const key = Object.keys(el)[0];
      const parent = parseSkill(key);
      parent.isGroup = true;
      if (!/\[[^\]]+\]/.test(key)) { parent.groupOnly = true; parent.type = '[无]'; parent.power = 0; }
      parent.children = el[key].map(childStr => {
        const c = parseSkill(childStr);
        c._inGroup = true; c.parentName = parent.name;
        return c;
      });
      out.push(parent);
      parent.children.forEach(c => out.push(c));
    } else if (isFlatGroupHead(el)) {
      out.push(el);
    } else {
      out.push(parseSkillEntry(el));
    }
  });
  const paired = [];
  for (let k = 0; k < out.length; k++) {
    const cur = out[k];
    if (isFlatGroupHead(cur) && k + 1 < out.length && typeof out[k + 1] === 'string' && !isFlatGroupHead(out[k + 1])) {
      const parent = parseSkill(cur);
      parent.isGroup = true; parent.groupOnly = true; parent.type = '[无]'; parent.power = 0;
      let j = k + 1;
      const childStrs = [];
      while (j < out.length && typeof out[j] === 'string' && !isFlatGroupHead(out[j])) { childStrs.push(out[j]); j++; }
      parent.children = childStrs.map(childStr => {
        const c = parseSkill(childStr);
        c._inGroup = true; c.parentName = parent.name;
        return c;
      });
      paired.push(parent);
      parent.children.forEach(c => paired.push(c));
      k = j - 1;
    } else {
      paired.push(cur);
    }
  }
  return paired;
}

export function parseItemList(arr) {
  const isItemGroupHead = (el) => typeof el === 'string' && /^【[^【】]+】\s*\[(道具|消耗品|弹药)([^\]]*)\]\s*(\[次数[^\]]*\])?\s*$/.test(el.trim()) && !/\[(群攻|单体|群回|单回|单瞄|群防|单防|群盾|单盾|嘲讽|群降|群滞|中毒|燃烧|麻痹|再动|回避|免伤|反击|肃正|吸蓝|驱散|群驱散)/.test(el);
  const out = arr.map(el => {
    if (isNestedGroup(el)) {
      const key = Object.keys(el)[0];
      const item = parseItem(key);
      item.children = el[key].map(childStr => {
        const c = parseSkill(childStr);
        if (!c.isHighTier) c.isHighTier = item.isHighTier;
        if (!c.isLegendary) c.isLegendary = item.isLegendary;
        return c;
      });
      return item;
    }
    return el;
  });
  const isItemLine = (s) => typeof s === 'string' && /\[(?:道具|消耗品|弹药|数量\s*[:：]|次数\s*[:：]|绑定\s*[:：]|[高阶]|[传奇]|[神术])/.test(s);
  const paired = [];
  for (let k = 0; k < out.length; k++) {
    const cur = out[k];
    if (typeof cur === 'string' && (isItemGroupHead(cur) || isFlatGroupHead(cur)) && k + 1 < out.length && typeof out[k + 1] === 'string' && !(isItemGroupHead(out[k + 1]) || isFlatGroupHead(out[k + 1]) || isItemLine(out[k + 1]))) {
      const item = parseItem(cur);
      if (!item.category) item.category = '道具';
      let j = k + 1;
      const childStrs = [];
      while (j < out.length && typeof out[j] === 'string' && !(isItemGroupHead(out[j]) || isFlatGroupHead(out[j]) || isItemLine(out[j]))) { childStrs.push(out[j]); j++; }
      item.children = childStrs.map(childStr => {
        const c = parseSkill(childStr);
        if (!c.isHighTier) c.isHighTier = item.isHighTier;
        if (!c.isLegendary) c.isLegendary = item.isLegendary;
        return c;
      });
      paired.push(item);
      k = j - 1;
    } else {
      paired.push(typeof cur === 'string' ? parseItem(cur) : (cur && typeof cur === 'object' && !Array.isArray(cur) && cur.isItem ? cur : parseItemEntry(cur)));
    }
  }
  return paired;
}

// ---------- 规范对象形态（技能/物品）：own-property 显式 + 缺省填充，不含运行态 ----------

const _hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function parseSkillObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('技能对象形态不合法');
  const base = parseSkill(''); // 缺省骨架（兜底 [单体]20 与字符串无标签口径一致）
  const out = {};
  Object.keys(base).forEach(k => { if (k !== '_explicit' && k !== 'usesRemaining') out[k] = base[k]; });
  const explicit = [];
  const STRUCT_KEYS = ['isGroup', 'groupOnly'];
  Object.keys(obj).forEach(k => {
    if (k === '_explicit' || k === 'usesRemaining') return; // 运行态不从配置读
    if (k === 'children') {
      out.children = (Array.isArray(obj.children) ? obj.children : []).map(parseSkillEntry);
      explicit.push('children');
      return;
    }
    if (STRUCT_KEYS.includes(k)) { out[k] = !!obj[k]; return; } // 结构键不标 explicit
    if (!_hasOwn(out, k)) return; // 未知键不带入（own-property，防原型链/扩展键带禁项）
    explicit.push(k);
    out[k] = typeof obj[k] === 'object' && obj[k] !== null ? JSON.parse(JSON.stringify(obj[k])) : obj[k];
  });
  // usesRemaining 为运行态初始值 = 满额度；必须在 obj 合并后取 maxUses（对象形态显式 maxUses>0 不锁死）
  out.usesRemaining = out.maxUses;
  out._explicit = explicit;
  return out;
}

function parseItemObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('物品对象形态不合法');
  const base = parseItem('');
  const out = {};
  Object.keys(base).forEach(k => { if (k !== '_explicit' && k !== 'usesRemaining' && k !== 'children') out[k] = base[k]; });
  const explicit = [];
  Object.keys(obj).forEach(k => {
    if (k === '_explicit' || k === 'usesRemaining') return;
    if (k === 'children') {
      // 变体用法与字符串组形态同构：子行走 parseSkillEntry（字符串或对象均可）
      out.children = (Array.isArray(obj.children) ? obj.children : []).map(parseSkillEntry);
      explicit.push('children');
      return;
    }
    if (!_hasOwn(out, k)) return;
    explicit.push(k);
    out[k] = typeof obj[k] === 'object' && obj[k] !== null ? JSON.parse(JSON.stringify(obj[k])) : obj[k];
  });
  out.usesRemaining = out.maxUses;
  out._explicit = explicit;
  return out;
}

// ---------- 中文配置对象形态（典型对局样本）：名字/动作/标签/范围/区域/子技能 ----------

const CN_RANGE_PARAM = { '射程': 'castRange', '半径': 'radius', '长度': 'length', '长': 'length', '宽度': 'width', '宽': 'width', '角度': 'angle' };
const CN_REGION_TYPE = { '浓雾': 'fog' };

function isChineseSkillObject(el) {
  return !!el && typeof el === 'object' && !Array.isArray(el) &&
    (Object.prototype.hasOwnProperty.call(el, '标签') || Object.prototype.hasOwnProperty.call(el, '范围') || Object.prototype.hasOwnProperty.call(el, '动作'));
}

function isChineseItemObject(el) {
  return !!el && typeof el === 'object' && !Array.isArray(el) &&
    (Object.prototype.hasOwnProperty.call(el, '子技能') || Object.prototype.hasOwnProperty.call(el, '标签') || Object.prototype.hasOwnProperty.call(el, '动作'));
}

// 动作字段：主/辅 → 行动成本；反应[:近战|远程|法术][看破|舍身] → 反应字段；死亡触发 → isDeathTrigger。
// 看破/舍身目标仍由标签 [看破:…]/[舍身:…] 提供（不按技能名猜）。
function applyActionField(target, action) {
  if (action == null) return;
  const a = String(action).trim();
  if (!a) return;
  const exp = Array.isArray(target._explicit) ? target._explicit : (target._explicit = []);
  if (a === '主') target.actionCost = Object.assign({}, ACTION_COST_MAIN);
  else if (a === '辅') target.actionCost = Object.assign({}, ACTION_COST_AUX);
  else target.actionCost = Object.assign({}, ACTION_COST_NONE);
  if (!exp.includes('actionCost')) exp.push('actionCost');
  if (/反应/.test(a) && !/随绑定/.test(a)) {
    target.isReaction = true;
    const m = a.match(/(近战|远程|法术)/);
    target.reactionTarget = m ? m[1] : 'all';
    if (!exp.includes('isReaction')) exp.push('isReaction');
    if (!exp.includes('reactionTarget')) exp.push('reactionTarget');
  }
  if (/死亡触发/.test(a)) target.isDeathTrigger = true;
}

// 范围对象：{类型, 射程, 半径, 长度, 宽度, 角度} → range；圆形只留 radius，旧带射程迁爆炸；召唤独立支持。
// 「攻击来源」是看破/舍身的事件来源，不是第 9 种范围：编译为 range:{type:'自身'} + reactionSource:true。
function parseRangeObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const typeRaw = obj['类型'];
  if (typeRaw == null) return null;
  let type = String(typeRaw).trim();
  if (!type) return null;
  let reactionSource = false;
  if (type === '攻击来源') { type = '自身'; reactionSource = true; }
  if (!RANGE_TYPES.includes(type) && type !== '召唤') return null;
  const range = { type };
  Object.keys(obj).forEach(k => {
    const field = CN_RANGE_PARAM[k];
    if (!field) return;
    const n = Number(obj[k]);
    if (Number.isFinite(n)) range[field] = n;
  });
  if (type === '圆形') {
    if (range.castRange !== undefined) range.type = '爆炸';
    else delete range.castRange;
  }
  if (type === '扇形' && range.length !== undefined && range.castRange === undefined) range.castRange = range.length;
  return { range, reactionSource };
}

function parseRegionObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const t = obj['类型'];
  if (t == null) return null;
  const s = String(t).trim();
  if (!s) return null;
  return { type: CN_REGION_TYPE[s] || s };
}

// 槽目标字段：显式数组/对象/单值 → slotTargets（self/default），不按技能名猜。
function parseSlotTargetsField(v) {
  const norm = x => {
    const s = String(x == null ? '' : x).trim();
    if (s === 'self' || s === '自身' || s === '自己') return 'self';
    if (s === 'ally' || s === '友军' || s === '友方') return 'ally';
    if (s === 'enemy' || s === '敌人' || s === '敌方') return 'enemy';
    return 'default';
  };
  if (Array.isArray(v)) {
    const arr = [null, null, null];
    for (let i = 0; i < 3 && i < v.length; i++) if (v[i] != null && v[i] !== '') arr[i] = norm(v[i]);
    return arr;
  }
  if (v && typeof v === 'object') {
    const arr = [null, null, null];
    Object.keys(v).forEach(k => { const i = Number(k); if (Number.isInteger(i) && i >= 0 && i < 3) arr[i] = norm(v[k]); });
    return arr;
  }
  if (typeof v === 'string' && v.trim()) return [norm(v), null, null];
  return null;
}

function applyRangeField(target, obj) {
  const parsed = parseRangeObject(obj);
  if (!parsed) return;
  const { range, reactionSource } = parsed;
  target.range = fillRangeDefaults(range);
  if (!target._explicit.includes('range')) target._explicit.push('range');
  Object.keys(range).forEach(k => {
    if (k === 'type') return;
    const key = 'range.' + k;
    if (!target._explicit.includes(key)) target._explicit.push(key);
  });
  if (reactionSource) {
    target.reactionSource = true;
    if (!target._explicit.includes('reactionSource')) target._explicit.push('reactionSource');
  }
}

function parseSkillConfigObject(obj) {
  const name = String(obj['名字'] != null ? obj['名字'] : '').trim();
  const tags = obj['标签'] != null ? String(obj['标签']) : '';
  const skill = parseSkill('【' + name + '】' + tags);
  applyActionField(skill, obj['动作']);
  if (skill.isDeathTrigger) skill.deathTag = tags.match(/\[自爆[:：][^\]]+\]/)?.[0] || null;
  applyRangeField(skill, obj['范围']);
  const region = parseRegionObject(obj['区域']);
  if (region) { skill.regionEffect = region; if (!skill._explicit.includes('regionEffect')) skill._explicit.push('regionEffect'); }
  if (Object.prototype.hasOwnProperty.call(obj, '槽目标')) {
    const st = parseSlotTargetsField(obj['槽目标']);
    if (st) { skill.slotTargets = st; if (!skill._explicit.includes('slotTargets')) skill._explicit.push('slotTargets'); }
  }
  if (/\[不分敌友\]/.test(tags)) { skill.affectsAll = true; skill._explicit.push('affectsAll'); }
  if (obj['说明'] != null) skill.note = String(obj['说明']);
  return skill;
}

function parseItemConfigObject(obj) {
  const name = String(obj['名字'] != null ? obj['名字'] : '').trim();
  const tags = obj['标签'] != null ? String(obj['标签']) : '';
  const item = parseItem('【' + name + '】' + tags);
  if (/\[不分敌友\]/.test(tags)) { item.affectsAll = true; item._explicit.push('affectsAll'); }
  applyActionField(item, obj['动作']);
  applyRangeField(item, obj['范围']);
  const region = parseRegionObject(obj['区域']);
  if (region) { item.regionEffect = region; if (!item._explicit.includes('regionEffect')) item._explicit.push('regionEffect'); }
  if (Array.isArray(obj['子技能'])) {
    item.children = obj['子技能'].map(child => {
      const c = parseSkillEntry(child);
      c.parentItemName = item.name; // 稳定父名，不建 parentItem 循环引用
      return c;
    });
    if (!item._explicit.includes('children')) item._explicit.push('children');
  }
  return item;
}

// 技能行解析统一入口：字符串 → parseSkill；中文配置对象 → parseSkillConfigObject；规范对象 → parseSkillObject
export function parseSkillEntry(el) {
  if (typeof el === 'string') return parseSkill(el);
  if (isChineseSkillObject(el)) return parseSkillConfigObject(el);
  if (el && typeof el === 'object' && !Array.isArray(el)) return parseSkillObject(el);
  throw new Error('技能行类型不合法: ' + typeof el);
}

// 物品行解析统一入口：字符串 → parseItem；中文配置对象 → parseItemConfigObject；规范对象 → parseItemObject
export function parseItemEntry(el) {
  if (typeof el === 'string') return parseItem(el);
  if (isChineseItemObject(el)) return parseItemConfigObject(el);
  if (el && typeof el === 'object' && !Array.isArray(el)) return parseItemObject(el);
  throw new Error('物品行类型不合法: ' + typeof el);
}

// ---------- 角色与 YAML 块解析（原版 buildCombatDataFromYAML 的纯数据部分） ----------

// 名字匹配规范化（仅用于配置同名匹配，不作身份生成）：剥前缀 emoji/空白 + 小写
export function normalizeHeroName(s) {
  return String(s || '').trim()
    .replace(/^[\u200D\uFE0F\u2640\u2642\u26A7\p{Extended_Pictographic}]+\s*/u, '')
    .replace(/\s/g, '').toLowerCase();
}

// 角色节点解析：{ 名字, 原型, 职业?, 属性, 技能, 物品, 持久化, 头像? }
// 原型只补缺失字段（T01-02），补齐值不标 _explicit（属缺省层级，非 YAML 显式）。
export function parseHeroEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const explicitTop = [];
  const name = String(entry['名字'] != null ? entry['名字'] : '').trim();
  const attrs = parseAttributes(entry['属性']);
  const hero = {
    name,
    maxHp: attrs.maxHp, maxMp: attrs.maxMp, maxTp: attrs.maxTp,
    hp: attrs.hp, mp: attrs.mp, tp: attrs.tp,
    atk: attrs.atk, def: attrs.def, spd: attrs.spd,
    actCount: attrs.actCount, classType: attrs.classType, isWise: attrs.isWise,
    attrTags: attrs.attrTags,
    evasion: attrs.evasion, strength: attrs.strength, totalWeight: attrs.totalWeight,
    moveDistance: attrs.moveDistance, perception: attrs.perception, footprint: attrs.footprint,
  };
  const explicit = attrs._explicit || [];

  // 顶层职业（典型对局样本放在 属性 外）：显式写入并纳入显式集合
  if (Object.prototype.hasOwnProperty.call(entry, '职业')) {
    explicitTop.push('classType');
    hero.classType = entry['职业'] == null ? null : (String(entry['职业']).trim() || null);
    if (!explicit.includes('classType')) explicit.push('classType');
  }

  if (Object.prototype.hasOwnProperty.call(entry, '原型')) {
    explicitTop.push('prototype');
    const proto = String(entry['原型'] || '').trim();
    if (PROTOTYPE_NAMES.includes(proto)) {
      hero.prototype = proto;
      const p = PROTOTYPES[proto];
      // 只补缺失；显式值（含显式 0）不动
      if (hero.evasion == null) { hero.evasion = p.evasion; hero._protoEvasion = true; }
      if (hero.strength == null) hero.strength = p.strength;
      if (hero.totalWeight == null) hero.totalWeight = p.totalWeight;
      if (hero.moveDistance == null) hero.moveDistance = p.moveDistance;
      if (hero.perception == null) hero.perception = p.perception;
      if (!hero.footprint) hero.footprint = Object.assign({}, p.footprint);
    }
  }
  if (Object.prototype.hasOwnProperty.call(entry, '头像')) {
    explicitTop.push('img');
    hero.img = entry['头像'] == null ? null : String(entry['头像']).trim() || null;
  }
  // 集合：own-property 判定显式；显式 [] 保留空，不补回
  if (Object.prototype.hasOwnProperty.call(entry, '技能')) {
    explicitTop.push('skills');
    const arr = entry['技能'];
    hero.skills = Array.isArray(arr) ? parseSkillList(arr) : [];
  }
  if (Object.prototype.hasOwnProperty.call(entry, '物品')) {
    explicitTop.push('items');
    const arr = entry['物品'];
    hero.items = Array.isArray(arr) ? parseItemList(arr) : [];
  }
  if (Object.prototype.hasOwnProperty.call(entry, '持久化')) {
    explicitTop.push('persist');
    const p = entry['持久化'];
    const persist = {};
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      for (const k of Object.keys(p)) persist[k] = p[k];
    }
    hero.persist = persist;
  }
  hero._explicit = explicit;
  hero._explicitTop = explicitTop;
  return hero;
}

// 敌方轻量解析：名字（含 *N/×N 乘数展开）/ 属性 / 技能；不做变种执行、不做前后排
export function parseEnemyEntry(entry, index) {
  if (!entry || typeof entry !== 'object') return null;
  const rawName = String(entry['名字'] != null ? entry['名字'] : `怪物${index}`);
  const attrs = parseAttributes(entry['属性']);
  const skills = Array.isArray(entry['技能']) ? parseSkillList(entry['技能']).filter(s => !s.groupOnly) : [];
  const m = rawName.trim().match(/^(.*?)\s*[*×xX]\s*(\d+)\s*$/);
  const name = m ? m[1].trim() : rawName.trim();
  const count = m ? Math.max(1, parseInt(m[2])) : 1;
  const out = [];
  for (let i = 0; i < count; i++) {
    const u = {
      name: name + (count > 1 ? `·${i + 1}` : ''),
      maxHp: attrs.maxHp, hp: attrs.hp, maxMp: attrs.maxMp, mp: attrs.mp, maxTp: attrs.maxTp, tp: attrs.tp,
      atk: attrs.atk, def: attrs.def, spd: attrs.spd, actCount: attrs.actCount,
      classType: attrs.classType, isWise: attrs.isWise, attrTags: attrs.attrTags.slice(),
      evasion: attrs.evasion, strength: attrs.strength, totalWeight: attrs.totalWeight,
      moveDistance: attrs.moveDistance, perception: attrs.perception, footprint: attrs.footprint,
      skills,
    };
    // 原型只补缺失（P01-CONTRACT 第 1 节；口径同 parseHeroEntry，补齐值不标 _explicit）
    if (Object.prototype.hasOwnProperty.call(entry, '原型')) {
      const proto = String(entry['原型'] || '').trim();
      if (PROTOTYPE_NAMES.includes(proto)) {
        u.prototype = proto;
        const p = PROTOTYPES[proto];
        if (u.evasion == null) { u.evasion = p.evasion; u._protoEvasion = true; }
        if (u.strength == null) u.strength = p.strength;
        if (u.totalWeight == null) u.totalWeight = p.totalWeight;
        if (u.moveDistance == null) u.moveDistance = p.moveDistance;
        if (u.perception == null) u.perception = p.perception;
        if (!u.footprint) u.footprint = Object.assign({}, p.footprint);
      }
    }
    out.push(u);
  }
  return out;
}

// 召唤模板解析：与角色同构 + 等级/入场说明（不占开场布阵，供 summonProvider 实例化）
export function parseSummonEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const summon = parseHeroEntry(entry);
  if (!summon) return null;
  if (entry['等级'] != null) summon.level = String(entry['等级']).trim();
  if (entry['入场'] != null) summon.entry = String(entry['入场']).trim();
  return summon;
}

// YAML 文本 → 规范块（纯数据入口）
export function parseYamlText(text) {
  const parsed = jsyaml.load(String(text || ''));
  return parseYamlCombatBlock(parsed);
}

// YAML 对象 → 规范块。兼容旧「战斗数据栏」与新「meta / 我方 / 敌方 / 召唤物」两种顶层结构。
export function parseYamlCombatBlock(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('YAML 根节点不是对象');
  const block = parsed['战斗数据栏'];
  if (block && typeof block === 'object') return parseLegacyBlock(block);
  return parseTypicalBlock(parsed);
}

function parseLegacyBlock(block) {
  const hasVersion = Object.prototype.hasOwnProperty.call(block, '协议版本');
  const protocolVersion = hasVersion ? +block['协议版本'] : null;

  const result = {
    protocolVersion: Number.isFinite(protocolVersion) ? protocolVersion : null,
    sceneId: block['场景ID'] != null ? String(block['场景ID']).trim() || null : null,
    battleId: block['战斗ID'] != null ? String(block['战斗ID']).trim() || null : null,
    field: null,
    heroes: [],
    enemies: [],
    summonTemplates: [],
    meta: null,
    placements: {},
  };

  const heroKey = Object.keys(block).find(k => String(k).startsWith('我方列表'));
  if (heroKey) {
    const m = heroKey.match(/场地[:：]([^)\]]+)/);
    if (m) result.field = m[1].trim();
    const list = block[heroKey];
    if (Array.isArray(list)) {
      result.heroes = list.map(item => parseHeroEntry(item && item['角色'] ? item['角色'] : item)).filter(Boolean);
    }
  }
  const enemyKey = Object.keys(block).find(k => String(k).startsWith('敌方列表'));
  if (enemyKey) {
    const list = block[enemyKey];
    if (Array.isArray(list)) {
      let idx = 0;
      list.forEach(item => {
        const e = item && (item['角色'] || item);
        const parsedEnemies = parseEnemyEntry(e, idx++);
        if (parsedEnemies) result.enemies.push(...parsedEnemies);
      });
    }
  }
  return result;
}

function parseTypicalBlock(root) {
  const meta = root['meta'] && typeof root['meta'] === 'object' && !Array.isArray(root['meta']) ? root['meta'] : null;
  const result = {
    protocolVersion: meta && meta['协议版本'] != null && Number.isFinite(+meta['协议版本']) ? +meta['协议版本'] : null,
    sceneId: meta && meta['场景'] != null ? String(meta['场景']).trim() || null : null,
    battleId: root['战斗ID'] != null ? String(root['战斗ID']).trim() || null : meta?.['战斗ID'] != null ? String(meta['战斗ID']).trim() || null : null,
    field: null,
    heroes: [],
    enemies: [],
    summonTemplates: [],
    meta,
    placements: {},
  };

  const heroesArr = Array.isArray(root['我方']) ? root['我方'] : [];
  result.heroes = heroesArr.map(e => parseHeroEntry(e)).filter(Boolean);

  const enemiesArr = Array.isArray(root['敌方']) ? root['敌方'] : [];
  let idx = 0;
  enemiesArr.forEach(e => {
    const list = parseEnemyEntry(e, idx++);
    if (list) result.enemies.push(...list);
  });

  const summonsArr = Array.isArray(root['召唤物']) ? root['召唤物'] : [];
  result.summonTemplates = summonsArr.map(e => parseSummonEntry(e)).filter(Boolean);

  const stance = meta && meta['站位'];
  if (stance && typeof stance === 'object' && !Array.isArray(stance)) {
    ['我方', '敌方'].forEach(sideKey => {
      const grp = stance[sideKey];
      if (!grp || typeof grp !== 'object' || Array.isArray(grp)) return;
      Object.keys(grp).forEach(name => {
        const p = grp[name];
        if (!p || typeof p !== 'object') return;
        result.placements[name] = {
          col: Number(p['col']),
          row: Number(p['row']),
          facing: p['facing'] == null ? 0 : Number(p['facing']),
        };
      });
    });
  }
  return result;
}
