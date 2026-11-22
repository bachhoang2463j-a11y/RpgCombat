// ==========================================
// 战棋 P01 全体/单角色配置包与草稿事务（P01-CONTRACT 第 7 节）
// 白名单生成，严格排除实时资源；导入同名完整替换草稿、新人追加、取消不生效、保存才持久化。
// ==========================================

import {
  CONFIG_PACKAGE_FORMAT, CONFIG_PACKAGE_VERSION, CONFIG_PACKAGE_HERO_KEYS,
  CONFIG_PACKAGE_CONFIG_KEYS, CONFIG_PACKAGE_PERSIST_KEYS,
} from './protocol.mjs';

function hasOwn(obj, key) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

function pickWhitelist(src, keys) {
  const out = {};
  keys.forEach(k => { if (hasOwn(src, k)) out[k] = src[k]; });
  return out;
}

// ---------- 技能/物品白名单序列化（不含运行态；结构键外层附加） ----------

// 技能白名单字段（配置与结构分离；不含 usesRemaining/_inGroup/parentName 引用结构）
const SKILL_PACK_KEYS = [
  'name', 'cost', 'hpCost', 'tpCost', 'charge', 'delay', 'haste', 'maxUses',
  'hit', 'turns', 'slotTurns', 'slotTurns2', 'slotTurns3',
  'type', 'power', 'type2', 'power2', 'type3', 'power3',
  'isReaction', 'reactionTarget', 'kanpoTarget', 'sheshenTarget',
  'damageType', 'isOthers', 'guaranteedHit', 'switchTarget', 'ignoreRow',
  'critRate', 'fxTag', 'barrierSub', 'barrierArmor', 'isHighTier', 'isLegendary',
  'summonTarget', 'summonNoLimit', 'range', 'actionCost',
];

const ITEM_PACK_KEYS = [
  'name', 'category', 'maxUses',
  'bindings',
  'cost', 'hpCost', 'tpCost', 'delay', 'haste',
  'hit', 'turns', 'slotTurns', 'slotTurns2', 'slotTurns3',
  'type', 'power', 'type2', 'power2', 'type3', 'power3',
  'isOthers', 'guaranteedHit', 'switchTarget', 'ignoreRow', 'critRate',
  'isHighTier', 'isLegendary', 'fxTag', 'damageType', 'barrierSub', 'barrierArmor',
  'summonTarget', 'summonNoLimit', 'range', 'actionCost',
  'children',
];

function packSkill(s) {
  const out = pickWhitelist(s, SKILL_PACK_KEYS);
  if (s.isGroup) {
    out.isGroup = true;
    if (s.groupOnly) out.groupOnly = true;
    out.children = (Array.isArray(s.children) ? s.children : []).map(packSkill);
  }
  return out;
}

function packItem(it) {
  const out = pickWhitelist(it, ITEM_PACK_KEYS);
  // bindings 逐条白名单（skillName/cost）
  out.bindings = (Array.isArray(it.bindings) ? it.bindings : []).map(b => ({ skillName: b.skillName, cost: b.cost }));
  // 变体用法 children 与技能同构：逐条走 packSkill 白名单（原版 _serializeSkillForRoster 口径），防运行态键泄漏
  out.children = (Array.isArray(it.children) ? it.children : []).map(packSkill);
  return out;
}

// ---------- 序列化 ----------

// heroEntry：parseHeroEntry 输出（或等价配置形态）。导出全体/单角色统一结构。
// scope: 'all' | 'hero'
export function buildConfigPackage(heroes, scope = 'all') {
  const list = Array.isArray(heroes) ? heroes : [heroes];
  const packed = list.map(h => {
    const entry = { name: h.name };
    if (h.displayName != null) entry.displayName = h.displayName;
    entry.config = pickWhitelist(h.config || h, CONFIG_PACKAGE_CONFIG_KEYS);
    if (h.persist) entry.persist = pickWhitelist(h.persist, CONFIG_PACKAGE_PERSIST_KEYS);
    // 技能：平铺子行（_inGroup）随组父 children 走（原版口径，防组结构丢失）
    entry.skills = (Array.isArray(h.skills) ? h.skills : []).filter(s => !s._inGroup).map(packSkill);
    entry.items = (Array.isArray(h.items) ? h.items : []).map(packItem);
    return pickWhitelist(entry, CONFIG_PACKAGE_HERO_KEYS);
  });
  if (scope === 'hero' && packed.length !== 1) throw new Error('单角色配置包必须恰好一项');
  return { format: CONFIG_PACKAGE_FORMAT, version: CONFIG_PACKAGE_VERSION, scope, heroes: packed };
}

// 导入前校验：结构与白名单（未知键不带回禁项）
export function validateConfigPackage(pkg) {
  if (!pkg || typeof pkg !== 'object') throw new Error('配置包不是对象');
  if (pkg.format !== CONFIG_PACKAGE_FORMAT) throw new Error('format 不符: ' + pkg.format);
  if (pkg.version !== CONFIG_PACKAGE_VERSION) throw new Error('version 不符');
  if (pkg.scope !== 'all' && pkg.scope !== 'hero') throw new Error('scope 不符');
  if (!Array.isArray(pkg.heroes)) throw new Error('heroes 不是数组');
  if (pkg.scope === 'hero' && pkg.heroes.length !== 1) throw new Error('单角色包必须恰好一项');
  pkg.heroes.forEach(h => {
    if (!h || typeof h !== 'object' || !h.name) throw new Error('角色条目缺 name');
    if (hasOwn(h, 'config') && h.config && typeof h.config !== 'object') throw new Error('config 不合法');
  });
  return true;
}

// 导入文件 → 草稿角色形态（白名单投影；不引入未知扩展键）
function unpackHero(h) {
  const entry = { name: h.name };
  if (hasOwn(h, 'displayName')) entry.displayName = h.displayName;
  if (hasOwn(h, 'config')) entry.config = pickWhitelist(h.config || {}, CONFIG_PACKAGE_CONFIG_KEYS);
  if (hasOwn(h, 'persist')) entry.persist = pickWhitelist(h.persist || {}, CONFIG_PACKAGE_PERSIST_KEYS);
  if (hasOwn(h, 'skills')) entry.skills = (Array.isArray(h.skills) ? h.skills : []).map(unpackSkill);
  if (hasOwn(h, 'items')) entry.items = (Array.isArray(h.items) ? h.items : []).map(unpackItem);
  return entry;
}

function unpackSkill(s) {
  const out = pickWhitelist(s, SKILL_PACK_KEYS);
  if (s.isGroup) {
    out.isGroup = true;
    if (s.groupOnly) out.groupOnly = true;
    out.children = (Array.isArray(s.children) ? s.children : []).map(unpackSkill);
  }
  return out;
}

function unpackItem(it) {
  const out = pickWhitelist(it, ITEM_PACK_KEYS);
  out.bindings = (Array.isArray(it.bindings) ? it.bindings : []).map(b => ({ skillName: b.skillName, cost: b.cost }));
  // 变体用法 children 逐条走 unpackSkill 白名单，外部文件不得走私任意键
  out.children = (Array.isArray(it.children) ? it.children : []).map(unpackSkill);
  return out;
}

// ---------- 草稿事务 ----------

// 创建导入草稿：同名完整替换；新角色追加；文件外已有角色保留。
// currentHeroes：当前配置角色列表（{name, config, persist, skills, items} 形态）
// pkg：校验过的配置包
// 返回 { draft, added:[names], replaced:[names], kept:[names] }（纯数据，不写变量）
export function createImportDraft(currentHeroes, pkg) {
  validateConfigPackage(pkg);
  const incoming = pkg.heroes.map(unpackHero);
  const draft = (Array.isArray(currentHeroes) ? currentHeroes : []).map(h => JSON.parse(JSON.stringify(h)));
  const added = [], replaced = [], kept = [];
  const byName = new Map(draft.map((h, i) => [h.name, i]));
  incoming.forEach(imp => {
    if (byName.has(imp.name)) {
      draft[byName.get(imp.name)] = JSON.parse(JSON.stringify(imp)); // 完整替换，不局部深合并
      replaced.push(imp.name);
    } else {
      byName.set(imp.name, draft.length);
      draft.push(JSON.parse(JSON.stringify(imp)));
      added.push(imp.name);
    }
  });
  draft.forEach(h => { if (!added.includes(h.name) && !replaced.includes(h.name)) kept.push(h.name); });
  return { draft, added, replaced, kept };
}

// 保存：仅保存动作才写独立档（storage.mjs 写 rpg_tactics_roster）；取消时草稿直接丢弃、零写入。
// 本函数只做保存前最后校验（不接触变量 API）。
export function finalizeImportDraft(draft) {
  if (!Array.isArray(draft)) throw new Error('草稿不是数组');
  const names = new Set();
  draft.forEach(h => {
    if (!h || !h.name) throw new Error('草稿角色缺 name');
    if (names.has(h.name)) throw new Error('草稿角色重名: ' + h.name);
    names.add(h.name);
  });
  return JSON.parse(JSON.stringify(draft));
}
