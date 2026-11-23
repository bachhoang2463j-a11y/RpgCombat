// ==========================================
// 战棋 P01 统一优先级合并与独立闪避迁移
// 修复原版 applyPersistedRoster（index.html:29815-29821）/ applyStatusBarRoster（29526-29534）
// 无视 _explicit/statSource 覆盖 YAML 显式字段的旧缺陷。
// 语义以 doc/tactics/P01-CONTRACT.md 第 5 节为唯一来源。
// ==========================================

import { PERSIST_TOGGLE_FIELDS, RUNTIME_RESOURCE_FIELDS, PROTOTYPES } from './protocol.mjs';
import { normalizeEffectTag } from './effect-definitions.mjs';
import { parseHeroEntry, parseSkillList, parseItemList, normalizeHeroName, parseSkill, parseItem } from './parser.mjs';

// ---------- 基础工具 ----------

function hasOwn(obj, key) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

function deepClone(v) {
  return v === undefined ? v : JSON.parse(JSON.stringify(v));
}

// YAML 技能对象是否显式提供字段（解析层 _explicit；无 _explicit 的对象视为全部非显式）
function yamlFieldExplicit(yamlObj, field) {
  return Array.isArray(yamlObj && yamlObj._explicit) && yamlObj._explicit.includes(field);
}

// ---------- persist 开关 ----------

// 字段 → 开关名映射（protocol.PERSIST_TOGGLE_FIELDS 反查）
const FIELD_TOGGLE = {};
Object.keys(PERSIST_TOGGLE_FIELDS).forEach(t => { FIELD_TOGGLE[PERSIST_TOGGLE_FIELDS[t]] = t; });

// 开关默认启用：persisted.persist 键缺失视为 true；任何开关不能反转 YAML 显式优先。
function persistAllows(persisted, field) {
  const toggle = FIELD_TOGGLE[field];
  if (!toggle) return true; // 无开关字段（img/classType/isWise/actCount/prototype/footprint）：存在即用
  const p = persisted && persisted.persist;
  if (!p || !hasOwn(p, toggle)) return true;
  return !!p[toggle];
}

// ---------- 配置字段清单 ----------

// 配置字段：YAML 显式 > persist 开启的独立档 > MMS 相关（仅 def←armor）> YAML 隐含缺省
const CONFIG_FIELDS = ['img', 'classType', 'isWise', 'prototype', 'maxHp', 'maxMp', 'maxTp',
                       'atk', 'def', 'spd', 'actCount', 'footprint',
                       'evasion', 'strength', 'totalWeight', 'moveDistance', 'perception'];

// MMS 对配置字段的贡献映射（原版 applyStatusBarRoster 语义：armor → def）
const MMS_CONFIG_FIELDS = { def: 'armor', maxHp: 'maxHp', maxMp: 'maxMp' };

// ---------- 技能字段级补齐（原版 _gapFillSkill 移植 + range/actionCost） ----------

const GAP_FILL = {
  turns: null, slotTurns: null, slotTurns2: null, slotTurns3: null,
  summonTarget: null, fxTag: null, damageType: null, kanpoTarget: null, sheshenTarget: null,
  type2: '[无]', type3: '[无]', power2: 0, power3: 0,
  barrierArmor: 0, charge: 0, delay: 0, haste: 0, maxUses: 0, critRate: 0, cost: 0, hpCost: 0, tpCost: 0, hit: 100,
  cooldownTurns: 0, slotTargets: null,
  isReaction: false, isOthers: false, guaranteedHit: false, switchTarget: false,
  isHighTier: false, isLegendary: false, summonNoLimit: false, ignoreRow: false,
  range: null, actionCost: null, evadeShift: null,
  isPierce: false, affectsAll: false, displacements: null, regionEffect: null, reactionSource: false, parentItemName: null,
};

function fieldEmpty(v, empty) {
  if (v == null) return true;
  return empty === null ? false : v === empty;
}

export function gapFillSkill(target, saved) {
  if (!target || !saved) return;
  const _slotOf = { slotTurns: 1, type2: 2, power2: 2, slotTurns2: 2, type3: 3, power3: 3, slotTurns3: 3 };
  const _slotTag = (o, n) => { const v = (n === 1 ? o.type : o['type' + n]); return (v && v !== '[无]') ? normalizeEffectTag(v) : ''; };
  const _exp = Array.isArray(target._explicit) ? new Set(target._explicit) : null;
  const hadYamlReaction = target.isReaction === true;
  Object.keys(GAP_FILL).forEach(k => {
    if (_exp && _exp.has(k)) return;
    const sn = _slotOf[k];
    if (sn) { const st = _slotTag(target, sn), ss = _slotTag(saved, sn); if (st && ss && st !== ss) return; }
    const empty = GAP_FILL[k];
    if (fieldEmpty(target[k], empty) && !fieldEmpty(saved[k], empty)) target[k] = deepClone(saved[k]);
  });
  // actionCost：YAML 未显式写 [行动:x] 时视为"未提供"，回落存档（缺省主行动不挡补齐）
  if (_exp && !_exp.has('actionCost') && saved.actionCost) target.actionCost = deepClone(saved.actionCost);
  // isReaction 由存档补回时连带恢复 reactionTarget（原版 P04 口径）
  if (!hadYamlReaction && target.isReaction && saved.reactionTarget) target.reactionTarget = saved.reactionTarget;
}

// 旧档技能归一化（原版 normalizeRosterSkill）：null 槽 → '[无]'、turns 0 → null
export function normalizeRosterSkill(s) {
  ['type', 'type2', 'type3'].forEach(k => { if (s[k] == null) s[k] = '[无]'; });
  if (s.turns == null || s.turns === 0) s.turns = null;
  (s.children || []).forEach(normalizeRosterSkill);
}

// ---------- 独立闪避迁移（P01-CONTRACT 第 2 节） ----------

// 判定：YAML 显式 evasion → 已有独立基准 → 首次初始化。
// 返回 { evasion, source: 'yaml'|'baseline'|'legacy-spd'|'prototype'|'default-humanoid', migrated }
export function ensureEvasionBaseline(hero, { hasProtocolVersion, persistedHero } = {}) {
  // 1. YAML 显式（解析层 _explicit 含 evasion，含显式 0）
  if (yamlFieldExplicit(hero, 'evasion')) return { evasion: hero.evasion, source: 'yaml', migrated: false };
  // 2. 已有独立闪避基准（独立档角色，含此前迁移值）
  if (hasOwn(persistedHero && persistedHero.config || null, 'evasion') && persistedHero.config.evasion != null) {
    hero.evasion = persistedHero.config.evasion;
    hero._fromBaseline = true;
    return { evasion: hero.evasion, source: 'baseline', migrated: false };
  }
  // 3. 首次初始化
  if (hasProtocolVersion === true) {
    // v1 新角色：原型表闪避（解析时原型补齐已给值）；无原型给标准人形缺省
    if (hero.evasion != null) return { evasion: hero.evasion, source: hero._protoEvasion ? 'prototype' : 'yaml', migrated: false };
    hero.evasion = PROTOTYPES['标准人形'].evasion;
    return { evasion: hero.evasion, source: 'default-humanoid', migrated: true };
  }
  // legacy：无协议版本输入（或旧档角色缺基准）→ 用合并后原基础 spd 一次性初始化（spd 无值时按标准人形缺省）
  hero.evasion = hero.spd != null ? hero.spd : PROTOTYPES['标准人形'].evasion;
  return { evasion: hero.evasion, source: 'legacy-spd', migrated: true };
}

// 标记原型补齐产生的闪避（供 ensureEvasionBaseline 区分"缺省补齐"与"YAML 显式"）
export function markPrototypeFilled(hero) {
  if (hero != null) hero._protoEvasion = true;
  return hero;
}

// ---------- 主合并入口 ----------

// resolveHero(yamlHero, { persistedHero, mmsHero, hasProtocolVersion })
//   → { hero, sources: {[field]: 'yaml'|'persisted'|'mms'|'default'|'proto'}, evasion }
// yamlHero 来自 parser.parseHeroEntry（含解析缺省与 _explicit）。
export function resolveHero(yamlHero, opts = {}) {
  const { persistedHero = null, mmsHero = null, hasProtocolVersion = null } = opts;
  const hero = deepClone(yamlHero);
  const sources = {};
  if (persistedHero && persistedHero.displayName) hero.displayName = persistedHero.displayName;

  const cfg = persistedHero && persistedHero.config || null;
  const yamlHeroExplicit = f => yamlFieldExplicit(yamlHero, f);

  // 1. 配置字段：YAML 显式 > persist 开启的独立档 > MMS（仅 def←armor）> 隐含缺省
  CONFIG_FIELDS.forEach(f => {
    if (yamlHeroExplicit(f)) { sources[f] = 'yaml'; return; }
    if (cfg && hasOwn(cfg, f) && cfg[f] !== undefined && persistAllows(persistedHero, f)) {
      hero[f] = deepClone(cfg[f]);
      sources[f] = 'persisted';
      return;
    }
    const mmsKey = MMS_CONFIG_FIELDS[f];
    if (mmsKey && mmsHero && mmsHero[mmsKey] != null) {
      hero[f] = mmsHero[mmsKey];
      sources[f] = 'mms';
      return;
    }
    sources[f] = 'default';
    // 原型补齐标记
    if (f === 'evasion' && hero._protoEvasion) sources[f] = 'proto';
  });
  // 2. 当前资源 hp/mp/tp：YAML 显式 > MMS > 初始化缺省（hp=maxHp、mp=maxMp、tp=0）
  RUNTIME_RESOURCE_FIELDS.forEach(f => {
    const maxKey = 'max' + f.charAt(0).toUpperCase() + f.slice(1);
    if (yamlHeroExplicit(f)) { sources[f] = 'yaml'; return; }
    if (f !== 'tp' && mmsHero && mmsHero[f] != null) {
      hero[f] = mmsHero[f];
      sources[f] = 'mms';
      return;
    }
    hero[f] = f === 'tp' ? 0 : hero[maxKey];
    sources[f] = 'default';
  });

  // 3. 库存 count：YAML 显式 > MMS > YAML 隐含缺省
  if (Array.isArray(hero.items) && mmsHero && Array.isArray(mmsHero.items)) {
    const mmsCount = new Map(mmsHero.items.map(it => [it && it.name, it.count]));
    hero.items.forEach(it => {
      if (!it || !it.name) return;
      if (yamlFieldExplicit(it, 'count')) return;
      const c = mmsCount.get(it.name);
      if (c != null) { it.count = c; sources['items.' + it.name + '.count'] = 'mms'; }
    });
  }

  // 4. 道具在场性（原版 props/_sbMissing 语义，运行态标记不入持久化）
  if (Array.isArray(hero.items) && mmsHero && Array.isArray(mmsHero.props)) {
    const norm = s => normalizeHeroName(s);
    const propNames = new Set(mmsHero.props.map(norm));
    hero.items.forEach(it => {
      if (!it || it.category !== '道具') return;
      it._sbMissing = !propNames.has(norm(it.name));
    });
  }

  // 5. 技能骨架合并（YAML 显式 [] 清空不补回；同名 gapFill；持久化独有追加）
  const savedSkills = persistedHero && Array.isArray(persistedHero.skills) ? persistedHero.skills : [];
  const yamlSkillsExplicitEmpty = hasOwn(yamlHero, 'skills') && Array.isArray(yamlHero.skills) && yamlHero.skills.length === 0;
  if (hasOwn(yamlHero, 'skills') || savedSkills.length) {
    hero.skills = mergeSkillSet(Array.isArray(hero.skills) ? hero.skills : [], yamlSkillsExplicitEmpty ? [] : savedSkills, sources);
  }

  // 6. 物品骨架合并（同构）
  const savedItems = persistedHero && Array.isArray(persistedHero.items) ? persistedHero.items : [];
  const yamlItemsExplicitEmpty = hasOwn(yamlHero, 'items') && Array.isArray(yamlHero.items) && yamlHero.items.length === 0;
  if (hasOwn(yamlHero, 'items') || savedItems.length) {
    hero.items = mergeItemSet(Array.isArray(hero.items) ? hero.items : [], yamlItemsExplicitEmpty ? [] : savedItems, sources);
  }

  // 7. 独立闪避迁移
  const evasion = ensureEvasionBaseline(hero, { hasProtocolVersion, persistedHero });
  sources.evasion = evasion.source === 'baseline' ? 'persisted' : (evasion.source === 'yaml' ? 'yaml' : (evasion.source === 'prototype' ? 'proto' : (evasion.source === 'default-humanoid' ? 'default' : 'migrated')));

  return { hero, sources, evasion };
}

// 技能集合合并（原版 applyPersistedRoster 技能段战棋适配）
function mergeSkillSet(yamlSkills, savedSkills, sources) {
  savedSkills.forEach(normalizeRosterSkill);
  // 顶层=技能名；组内=父名+\u0000+子名（原版 P03 口径）
  const childKey = (parent, name) => parent + '\u0000' + name;
  const savedTop = new Map();
  const savedChild = new Map();
  savedSkills.forEach(sv => {
    if (!sv || !sv.name) return;
    if (sv.parentName) savedChild.set(childKey(sv.parentName, sv.name), sv);
    else savedTop.set(sv.name, sv);
    (Array.isArray(sv.children) ? sv.children : []).forEach(c => { if (c && c.name) savedChild.set(childKey(sv.name, c.name), c); });
  });
  // 字段级补齐（组父与组子各查一次）
  yamlSkills.forEach(s => {
    if (!s || !s.name) return;
    gapFillSkill(s, s._inGroup && s.parentName ? savedChild.get(childKey(s.parentName, s.name)) : savedTop.get(s.name));
    (Array.isArray(s.children) ? s.children : []).forEach(c => { if (c && c.name) gapFillSkill(c, savedChild.get(childKey(s.name, c.name))); });
  });
  const yamlNames = new Set(yamlSkills.map(s => s && s.name).filter(Boolean));
  // 同名组：补持久化独有子技能
  const savedGroups = new Map(savedSkills.filter(sv => sv && sv.isGroup && Array.isArray(sv.children) && sv.children.length).map(g => [g.name, g]));
  yamlSkills.slice().forEach(s => {
    if (!s || s._inGroup || (yamlFieldExplicit(s, 'children') && s.children.length === 0)) return;
    const sv = savedGroups.get(s.name);
    if (!sv) return;
    const yamlChildNames = new Set((Array.isArray(s.children) ? s.children : []).map(c => c && c.name).filter(Boolean));
    const extra = sv.children.filter(c => c && c.name && !yamlChildNames.has(c.name) && !yamlNames.has(c.name))
      .map(c => Object.assign({}, c, { _inGroup: true, parentName: s.name }));
    if (!extra.length) return;
    s.isGroup = true;
    s.children = (Array.isArray(s.children) ? s.children : []).concat(extra);
    extra.forEach(c => yamlNames.add(c.name));
    // 平铺子行按 children 重排（原版 syncSkillGroupFromChildren 纯数据版）
    syncGroupFlatRows(yamlSkills, s);
  });
  // 持久化独有技能/组整条追加
  savedSkills.forEach(sv => {
    if (!sv || !sv.name || yamlNames.has(sv.name)) return;
    if (sv.isGroup && Array.isArray(sv.children) && sv.children.length) {
      const parent = Object.assign({}, sv, { isGroup: true });
      parent.children = sv.children.map(c => Object.assign({}, c, { _inGroup: true, parentName: sv.name }));
      yamlSkills.push(parent);
      parent.children.forEach(c => yamlSkills.push(c));
    } else {
      yamlSkills.push(Object.assign({}, sv));
    }
    yamlNames.add(sv.name);
    sources['skill.' + sv.name] = 'persisted';
  });
  // 限次初始化（新战局从满值重新开始）
  yamlSkills.forEach(sk => { if (sk.maxUses > 0 && sk.usesRemaining == null) sk.usesRemaining = sk.maxUses; });
  return yamlSkills;
}

// 组子平铺重排：平铺行完全按 children 权威源重排（同名 FIFO 消费旧平铺行，缺位用 child 克隆补齐，防同名丢行）
function syncGroupFlatRows(allSkills, parent) {
  const parentIdx = allSkills.indexOf(parent);
  if (parentIdx < 0) return;
  const oldFlat = allSkills.filter(s => s._inGroup && s.parentName === parent.name);
  oldFlat.forEach(s => { const i = allSkills.indexOf(s); if (i >= 0) allSkills.splice(i, 1); });
  const queue = new Map();
  oldFlat.forEach(s => { if (!queue.has(s.name)) queue.set(s.name, []); queue.get(s.name).push(s); });
  const insertAt = allSkills.indexOf(parent) + 1;
  const rows = (parent.children || []).map(c => {
    const q = c && c.name ? queue.get(c.name) : null;
    if (q && q.length) return q.shift();
    return Object.assign({}, c, { _inGroup: true, parentName: parent.name });
  });
  allSkills.splice(insertAt, 0, ...rows);
}

// 物品集合合并（原版物品段战棋适配）
function mergeItemSet(yamlItems, savedItems, sources) {
  savedItems.forEach(normalizeRosterSkill);
  const savedByName = new Map(savedItems.map(it => [it && it.name, it]));
  const merged = yamlItems.map(yItem => {
    const sItem = yItem && yItem.name ? savedByName.get(yItem.name) : null;
    if (!sItem) return yItem;
    const out = Object.assign({}, sItem, yItem, { isItem: true });
    gapFillSkill(out, sItem);
    // 变体用法：同名 YAML 为准，持久化独有并入
    if (Array.isArray(sItem.children) && sItem.children.length && !(yamlFieldExplicit(yItem, 'children') && yItem.children.length === 0)) {
      const yChildren = Array.isArray(yItem.children) ? yItem.children : [];
      const yNames = new Set(yChildren.map(c => c && c.name).filter(Boolean));
      const extra = sItem.children.filter(sc => sc && sc.name && !yNames.has(sc.name)).map(sc => Object.assign({}, sc));
      out.children = yChildren.concat(extra);
      const sChildByName = new Map(sItem.children.filter(sc => sc && sc.name).map(sc => [sc.name, sc]));
      out.children.forEach(c => { if (c && c.name) gapFillSkill(c, sChildByName.get(c.name)); });
    }
    // 绑定：同 skillName YAML 为准，持久化独有并入（按 skillName 去重）
    if (Array.isArray(sItem.bindings) && sItem.bindings.length && !(yamlFieldExplicit(yItem, 'bindings') && yItem.bindings.length === 0)) {
      const yBindings = Array.isArray(yItem.bindings) ? yItem.bindings : [];
      const yBindSkills = new Set(yBindings.map(b => b && b.skillName).filter(Boolean));
      const extra = sItem.bindings.filter(b => b && b.skillName && !yBindSkills.has(b.skillName)).map(b => Object.assign({}, b));
      out.bindings = yBindings.concat(extra);
    }
    return out;
  });
  // 持久化独有物品追加
  const yamlNames = new Set(yamlItems.map(it => it && it.name).filter(Boolean));
  savedItems.forEach(sItem => {
    if (!sItem || !sItem.name || yamlNames.has(sItem.name)) return;
    merged.push(Object.assign({}, sItem));
    yamlNames.add(sItem.name);
    sources['item.' + sItem.name] = 'persisted';
  });
  return merged;
}

// ---------- 独立档载荷组装（读侧） ----------

// persistedHero 旧结构 → 解析可用形态。战棋独立档即 parseHeroEntry 输出的白名单投影（见 config-package.mjs），
// 读侧只需 JSON 校验。
export function readTacticsRosterPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.version !== 1 || !Array.isArray(payload.heroes)) return null;
  return payload;
}
