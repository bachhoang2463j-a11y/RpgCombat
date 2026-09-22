#!/usr/bin/env node
/**
 * 独立校验（不依赖酒馆 / 浏览器）：$shop_catalog 受管「奇物」→ 战斗物品注入 与 防复活
 * 做法：从 index.html 抽取真函数源码，拼进 new Function 沙箱跑真代码（不复制实现）。
 * 覆盖：
 *   A 受管物品注入（新物品：battle.line 效果 + battle.children 对象形式解析 + 数量取 stat_data）
 *   B 已有同名项：效果以存档为准覆盖、数量取 stat_data
 *   C 售出（真实售出流：catalogUnlink 清 holds + catalogMarkSold 立墓碑）→ 不注入且从 hero.items 移除；
 *     同名副本的持有者不被牵连（判据已收紧为「墓碑命中该英雄且该英雄未持有」）；买回/在持不受旧墓碑压制
 *   D 回归：未受管物品的 applyPersistedRoster 合并语义不变（同名合并 + 持久化独有追加）
 *   E 受管未持有物品的持久化豁免（跳过 YAML 优先合并 / 独有项追加）
 *   F 静默降级（目录读不到 / getVariables 抛错 → 零动作、不抛错）
 *   G 持有量 0 或查不到名字 → 视为没有
 *   H ownerKey 口径（emoji/符号/空格前缀、售出墓碑 owner 归一）
 *   I 载具持有的受管物品不参与战斗注入
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const LINES = SRC.split('\n');

// 抽取顶层函数：起于行首 "function NAME("，止于下一行恰好为 "}" 的行
// （顶层声明一律 0 缩进收尾，比括号匹配稳——不会被正则/字符串里的花括号带偏）
function extractFn(name) {
  const start = LINES.findIndex(l => l.startsWith('function ' + name + '('));
  if (start < 0) throw new Error('未找到函数: ' + name);
  for (let i = start + 1; i < LINES.length; i++) if (LINES[i] === '}') return LINES.slice(start, i + 1).join('\n');
  throw new Error('函数未闭合: ' + name);
}
// 抽取顶层 const 数组：起于 "const NAME = ["，止于行首 "];"
function extractArr(name) {
  const start = LINES.findIndex(l => l.startsWith('const ' + name + ' = ['));
  if (start < 0) throw new Error('未找到常量: ' + name);
  for (let i = start + 1; i < LINES.length; i++) if (LINES[i] === '];') return LINES.slice(start, i + 1).join('\n');
  throw new Error('常量未闭合: ' + name);
}

const FNS = [
  'normalizeColonPowerTags', 'parseSkill', 'parseItem', 'isNestedGroup', 'isFlatGroupHead', 'parseItemList',
  'rebuildItemBindingKnowledge',
  '_sbAttrKey', '_sbParseAttrs', '_sbParseItems', '_sbParseItemNames', 'readStatusBarSnapshot',
  'shopNameKey', 'shopItemKey', 'readShopCatalog', 'buildShopIndex', 'shopItemSoldForHero',
  'parseShopBattleItem', 'shopHeldCount', 'syncShopCatalogHeroItems', 'shopSuppressPersistedItem',
  'applyPersistedRoster',
];
const fnSources = FNS.map(extractFn);
const skillTypesSrc = extractArr('SKILL_TYPES');
// 顶层字面量常量（readShopCatalog 依赖 $shop_catalog 键名常量）
const constLine = (name) => {
  const l = LINES.find(x => x.startsWith('const ' + name + ' = '));
  if (!l) throw new Error('未找到常量: ' + name);
  return l;
};

const sandboxSrc = [
  'const window = { CLASS_PASSIVES: {} };',
  'const console = { warn() {}, log() {} };',
  'let heroesData = [];',
  'let enemiesData = [];',
  'let initialHeroesCache = [];',
  'let initialEnemiesCache = [];',
  'let itemBindingKnowledge = new Map();',
  'let _statusBarSnapshot = null;',
  'let _shopCatalogCache = null;',
  'let _shopIndexCache = null;',
  'let _slotTagNamesCache = null;',                // normalizeColonPowerTags 的懒加载缓存
  'const defendSettings = {};',
  'const CLASS_PASSIVES = window.CLASS_PASSIVES;',
  'let shopVar = null;',
  'let rosterPayload = null;',
  'let msgVars = {};',                             // { [message_id]: { stat_data: ... } }
  'let lastMsgId = -1;',
  'let getVarMode = "ok";',                        // ok | empty | throw
  'function getVariables(opt) {',
  '  if (getVarMode === "throw") throw new Error("tavern api missing");',
  '  if (getVarMode === "empty") return null;',
  '  const o = opt || {};',
  '  if (o.type === "message") return msgVars[o.message_id] || {};',
  '  return { "$shop_catalog": shopVar };',
  '}',
  'function getLastMessageId() { return lastMsgId; }',
  'function getCurrentMessageId() { return lastMsgId; }',
  'function readRoster() { return rosterPayload; }',
  'function syncSkillGroupFromChildren() {}',
  constLine('SHOP_CATALOG_VAR_KEY'),
  skillTypesSrc,
  fnSources.join('\n\n'),
  'return {',
  '  setHeroes(h) { heroesData = h; },',
  '  heroes() { return heroesData; },',
  '  setSnapshot(s) { _statusBarSnapshot = s; },',
  '  setMessages(id, vars) { lastMsgId = id; msgVars = {}; msgVars[id] = vars; },',
  '  readSnapshot: readStatusBarSnapshot,',
  '  setShop(c) { shopVar = c; _shopCatalogCache = null; _shopIndexCache = null; getVarMode = "ok"; },',
  '  setGetVarMode(m) { getVarMode = m; _shopCatalogCache = null; _shopIndexCache = null; },',
  '  setRoster(p) { rosterPayload = p; },',
  '  sync: syncShopCatalogHeroItems,',
  '  suppress: shopSuppressPersistedItem,',
  '  applyPersisted: applyPersistedRoster,',
  '  nameKey: shopNameKey,',
  '  hasCatalog() { return !!readShopCatalog(); },',
  '};',
].join('\n');

const api = new Function(sandboxSrc)();

let pass = 0, fail = 0;
function check(title, cond, extra) {
  if (cond) { pass++; console.log('\x1b[32m[PASS ' + pass + ']\x1b[0m ' + title); }
  else { fail++; console.log('\x1b[31m[FAIL]\x1b[0m ' + title + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

const TOOL_ITEM = {
  id: 'r1', name: '安魂曲音叉', kind: 'relic', tier: 'high', form: 'reusable', uses: 2,
  battle: {
    line: '【安魂曲音叉】[单回;power:40][道具][次数:2][他人]', category: '道具',
    slots: ['单回;power:40'], count: 1, children: ['【安魂曲·共鸣】[群驱散:2][法术]'],
  },
  val: {}, status: 'owned',
};
const AMMO_ITEM = {
  id: 'a1', name: '枪骑兵弹匣', kind: 'relic', tier: 'common', form: 'consumable', uses: 0,
  battle: { line: '【枪骑兵弹匣】[弹药][数量:8][绑定:突击×2]', category: '弹药', slots: ['绑定:突击×2'], count: 8, children: [] },
  val: {}, status: 'owned',
};
const HOLD = (id, name, owner, ownerKind, field) => ({
  itemId: id, owner: owner, ownerKind: ownerKind || 'char', field: field || '道具', name: name,
});

// ---------------- A 受管物品注入 ----------------
api.setShop({ v: 1, ts: 1, items: { r1: TOOL_ITEM }, holds: { 'madeline|r1': HOLD('r1', '安魂曲音叉', '玛德琳') }, sold: {} });
api.setHeroes([{ id: 'h1', name: '🔮 玛德琳', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '玛德琳', items: [{ name: '安魂曲音叉', count: 3 }] }] });
let r = api.sync();
check('A1 购买后注入（applied=1）', r.applied === 1 && r.removed === 0, r);
let it = api.heroes()[0].items[0];
check('A2 效果来自 battle.line（类别/次数/效果槽）', !!it && it.category === '道具' && it.maxUses === 2 && it.usesRemaining === 2 && it.type === '[单回]' && it.power === 40 && it.isOthers === true, it);
check('A3 数量取 stat_data 现值（3，非声明包量 count=1）', it && it.count === 3, it && it.count);
check('A4 battle.children 走对象形式解析进 item.children', !!it && Array.isArray(it.children) && it.children.length === 1 && it.children[0].name === '安魂曲·共鸣', it && it.children);
check('A5 幂等（二次同步不重复入队）', (function () { const r2 = api.sync(); return api.heroes()[0].items.length === 1; })());

// ---------------- B 已有同名项：效果以存档为准 ----------------
api.setHeroes([{ id: 'h2', name: '玛德琳', skills: [], items: [
  { isItem: true, name: '安魂曲音叉', category: '道具', maxUses: 1, usesRemaining: 1, count: 1, type: '[群攻]', power: 999, bindings: [] },
] }]);
api.setSnapshot({ heroes: [{ name: '玛德琳', items: [{ name: '安魂曲音叉', count: 2 }] }] });
r = api.sync();
it = api.heroes()[0].items[0];
check('B1 同名项效果被存档覆盖（旧 YAML 漂移防护）', r.applied === 1 && api.heroes()[0].items.length === 1 && it.type === '[单回]' && it.power === 40 && it.maxUses === 2, it);
check('B2 同名项数量取 stat_data（2）', it.count === 2, it.count);

// ---------------- C 售出：不注入 + 移除同名项（真实售出流：catalogUnlink 已清 holds + catalogMarkSold 立墓碑） ----------------
api.setShop({
  v: 1, ts: 1,
  items: {
    r2: { id: 'r2', name: '亡者之匣', kind: 'relic', tier: 'legendary', form: 'reusable', uses: 1,
      battle: { line: '【亡者之匣】[群攻;power:60][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] },
      val: {}, status: 'sold' },
  },
  holds: {},                                   // 售出者本人：holds 已被 catalogUnlink 清掉
  sold: { r2: { owner: '🔮玛德琳', ownerKind: 'char', ts: 2 } },
});
api.setHeroes([{ id: 'h3', name: '玛德琳', skills: [], items: [
  { isItem: true, name: '亡者之匣', category: '道具', maxUses: 1, usesRemaining: 1, count: 1 },
] }]);
api.setSnapshot({ heroes: [{ name: '玛德琳', items: [{ name: '亡者之匣', count: 1 }] }] });
r = api.sync();
check('C1 已售出：不注入（applied=0）', r.applied === 0, r);
check('C2 已售出：旧 YAML 同名项被移除（removed=1）', r.removed === 1 && api.heroes()[0].items.length === 0, { removed: r.removed, items: api.heroes()[0].items });

// C3 墓碑 owner 指向别的角色 + status=owned → 不算该英雄售出（该英雄持有则照常注入）
api.setShop({
  v: 1, ts: 1,
  items: { r3: { id: 'r3', name: '灵视面具', kind: 'relic', tier: 'common', form: 'reusable', uses: 1,
    battle: { line: '【灵视面具】[单回;power:30][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'owned' } },
  holds: { 'madeline|r3': HOLD('r3', '灵视面具', '玛德琳') },
  sold: { r3: { owner: '索恩', ownerKind: 'char', ts: 3 } },
});
api.setHeroes([{ id: 'h4', name: '玛德琳', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '玛德琳', items: [{ name: '灵视面具', count: 1 }] }] });
r = api.sync();
check('C3 墓碑 owner 非本英雄 → 仍注入', r.applied === 1 && api.heroes()[0].items.length === 1, r);

// C4 收紧回归：A 卖出唯一副本，B（不在 holds、持有同名副本）的既有条目不受伤
api.setShop({
  v: 1, ts: 1,
  items: { r7: { id: 'r7', name: '亡者之匣', kind: 'relic', tier: 'legendary', form: 'reusable', uses: 1,
    battle: { line: '【亡者之匣】[群攻;power:60][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'sold' } },
  holds: {},                                   // A 卖掉了，holds 已清；B 从未在 holds 里
  sold: { r7: { owner: '玛德琳', ownerKind: 'char', ts: 5 } },   // 墓碑只命中玛德琳
});
api.setHeroes([{ id: 'h13', name: '索恩', skills: [], items: [
  { isItem: true, name: '亡者之匣', category: '道具', maxUses: 1, usesRemaining: 1, count: 1 },
] }]);
api.setSnapshot({ heroes: [{ name: '索恩', items: [{ name: '亡者之匣', count: 1 }] }] });
r = api.sync();
check('C4 同名副本未持有者不被牵连：不剔除（removed=0）', r.removed === 0 && api.heroes()[0].items.length === 1, { removed: r.removed, n: api.heroes()[0].items.length });
check('C5 同名副本未持有者不被牵连：不压制旧档合并（suppress=false）', api.suppress({ name: '索恩' }, '亡者之匣') === false);

// C6 收紧后的买回保护：B 已在 holds 里持有，即使墓碑/status 仍是 sold（catalogRevive 未清）也不压制 → 正常注入
api.setShop({
  v: 1, ts: 1,
  items: { r8: { id: 'r8', name: '亡者之匣', kind: 'relic', tier: 'legendary', form: 'reusable', uses: 1,
    battle: { line: '【亡者之匣】[群攻;power:60][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'sold' } },
  holds: { 'thorn|r8': HOLD('r8', '亡者之匣', '索恩') },
  sold: { r8: { owner: '玛德琳', ownerKind: 'char', ts: 5 } },
});
api.setHeroes([{ id: 'h14', name: '索恩', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '索恩', items: [{ name: '亡者之匣', count: 1 }] }] });
r = api.sync();
check('C6 已在 holds 持有 → 不受旧墓碑压制，照常注入', r.applied === 1 && api.heroes()[0].items.length === 1, r);

// ---------------- D 回归：未受管物品的持久化合并语义不变 ----------------
api.setShop(null);
api.setHeroes([{ id: 'h5', name: '索恩', skills: [], items: [
  { isItem: true, name: '老旧的左轮', category: '弹药', count: 5, maxUses: 0, usesRemaining: 0, bindings: [{ skillName: '速射', cost: 1 }] },
] }]);
api.setRoster({ heroes: [{ name: '索恩', config: {}, skills: [], items: [
  { isItem: true, name: '老旧的左轮', category: '弹药', count: 99, maxUses: 0, usesRemaining: 0,
    bindings: [{ skillName: '速射', cost: 9 }, { skillName: '装填', cost: 2 }], children: [{ name: '旧用法', power: 10 }] },
  { isItem: true, name: '编辑器新增物', category: '道具', maxUses: 3, count: 1, type: '[单回]', power: 20 },
] }] });
api.applyPersisted();
let items = api.heroes()[0].items;
let gun = items.find(x => x.name === '老旧的左轮');
check('D1 回归：同名未受管物品 count 仍以 YAML 为准', !!gun && gun.count === 5, gun && gun.count);
check('D2 回归：bindings = YAML + 持久化独有', !!gun && gun.bindings.length === 2 && gun.bindings[0].skillName === '速射' && gun.bindings[0].cost === 1 && gun.bindings[1].skillName === '装填', gun && gun.bindings);
check('D3 回归：children 持久化独有用法并入', !!gun && Array.isArray(gun.children) && gun.children.length === 1 && gun.children[0].name === '旧用法', gun && gun.children);
check('D4 回归：持久化独有未受管物品整条追加', !!items.find(x => x.name === '编辑器新增物'), items.map(x => x.name));

// ---------------- E 受管未持有物品的持久化豁免 ----------------
api.setShop({
  v: 1, ts: 1,
  items: {
    r4: { id: 'r4', name: '亡者之匣', kind: 'relic', tier: 'legendary', form: 'reusable', uses: 1,
      battle: { line: '【亡者之匣】[群攻;power:60][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'sold' },
    r5: { id: 'r5', name: '灵视面具', kind: 'relic', tier: 'common', form: 'reusable', uses: 1,
      battle: { line: '【灵视面具】[单回;power:30][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'owned' },
  },
  holds: {},                                    // 该英雄 holds 里都没有
  sold: { r4: { owner: '索恩', ownerKind: 'char', ts: 4 } },
});
api.setHeroes([{ id: 'h6', name: '索恩', skills: [], items: [
  { isItem: true, name: '亡者之匣', category: '道具', maxUses: 1, usesRemaining: 1, count: 1 },
] }]);
api.setRoster({ heroes: [{ name: '索恩', config: {}, skills: [], items: [
  { isItem: true, name: '亡者之匣', category: '道具', maxUses: 1, usesRemaining: 0, count: 99, children: [{ name: '旧档用法', power: 1 }], bindings: [{ skillName: '旧档绑定', cost: 1 }] },
  { isItem: true, name: '灵视面具', category: '道具', maxUses: 1, usesRemaining: 0, count: 1 },
] }] });
api.applyPersisted();
items = api.heroes()[0].items;
let box = items.find(x => x.name === '亡者之匣');
check('E1 已售出受管物品：跳过 YAML 优先合并（旧档独有 children 未并入）', !!box && !Array.isArray(box.children), box && box.children);
check('E2 已售出受管物品：跳过 YAML 优先合并（旧档独有 bindings 未并入）', !!box && !Array.isArray(box.bindings), box && box.bindings);
check('E3 受管但未售出、未持有 → 不再压制（旧档独有项照常追加，回归旧语义）', !!items.find(x => x.name === '灵视面具'), items.map(x => x.name));
check('E4 YAML 自身的受管物品仍在（豁免只拦持久化字段，不删 YAML 行）', !!box, items.map(x => x.name));

// E5 持有中的受管物品照常合并（regression：豁免不得越界到在持物品）
api.setShop({
  v: 1, ts: 1,
  items: { r6: { id: 'r6', name: '亡者之匣', kind: 'relic', tier: 'legendary', form: 'reusable', uses: 1,
    battle: { line: '【亡者之匣】[群攻;power:60][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'owned' } },
  holds: { 'thorn|r6': HOLD('r6', '亡者之匣', '索恩') },
  sold: {},
});
api.setHeroes([{ id: 'h7', name: '索恩', skills: [], items: [
  { isItem: true, name: '亡者之匣', category: '道具', maxUses: 1, usesRemaining: 1, count: 1 },
] }]);
api.setRoster({ heroes: [{ name: '索恩', config: {}, skills: [], items: [
  { isItem: true, name: '亡者之匣', category: '道具', maxUses: 1, usesRemaining: 0, count: 99, children: [{ name: '旧档用法', power: 1 }], bindings: [{ skillName: '旧档绑定', cost: 1 }] },
] }] });
api.applyPersisted();
box = api.heroes()[0].items.find(x => x.name === '亡者之匣');
check('E5 持有中的受管物品照常合并（旧档独有 children + bindings 并入）', !!box && Array.isArray(box.children) && box.children[0].name === '旧档用法' && Array.isArray(box.bindings) && box.bindings[0].skillName === '旧档绑定', box);

// ---------------- F 静默降级 ----------------
api.setHeroes([{ id: 'h8', name: '玛德琳', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '玛德琳', items: [{ name: '安魂曲音叉', count: 1 }] }] });
api.setGetVarMode('throw');
let ok = true, fr = null;
try { fr = api.sync(); } catch (e) { ok = false; }
check('F1 getVariables 抛错：不抛错且零动作', ok && fr && fr.applied === 0 && fr.removed === 0, fr);
api.setGetVarMode('empty');
ok = true;
try { fr = api.sync(); } catch (e) { ok = false; }
check('F2 取不到目录：不抛错且零动作', ok && fr && fr.applied === 0 && fr.removed === 0, fr);
api.setShop(null);
check('F3 无目录：持久化豁免恒 false（未受管语义不变）', api.suppress({ name: '任何物品' }, '任何物品') === false);

// ---------------- G 持有量 0 / 名字查不到 ----------------
api.setShop({ v: 1, ts: 1, items: { r1: TOOL_ITEM }, holds: { 'madeline|r1': HOLD('r1', '安魂曲音叉', '玛德琳') }, sold: {} });
api.setHeroes([{ id: 'h9', name: '玛德琳', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '玛德琳', items: [{ name: '安魂曲音叉', count: 0 }] }] });
check('G1 持有量 0 → 不注入', api.sync().applied === 0);
api.setSnapshot({ heroes: [{ name: '玛德琳', items: [{ name: '别的物品', count: 2 }] }] });
check('G2 状态栏查不到该名字 → 不注入', api.sync().applied === 0);
api.setSnapshot(null);
check('G3 无状态栏快照 → 不注入（数量真值不可得，视为没有）', api.sync().applied === 0);

// ---------------- H ownerKey 口径 ----------------
check('H1 emoji/空格前缀归一相等', api.nameKey('🔮 玛德琳') === api.nameKey('玛德琳'));
check('H2 符号包裹 + 大小写归一', api.nameKey('『Thorn』') === api.nameKey('thorn'));
check('H3 间隔号不剥（与 ShopBlock speakerKey 同口径）', api.nameKey('玛德琳·雷') !== api.nameKey('玛德琳'));
api.setShop(null);
api.setShop({
  v: 1, ts: 1,
  items: { r1: TOOL_ITEM },
  holds: { 'madeline|r1': HOLD('r1', '安魂曲音叉', '🔮玛德琳') },
  sold: {},
});
api.setHeroes([{ id: 'h10', name: '玛德琳', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '🔮 玛德琳', items: [{ name: '安魂曲音叉', count: 2 }] }] });
check('H4 带 emoji 的 hold.owner 与干净英雄名互相命中', api.sync().applied === 1, api.sync());

// ---------------- I 载具持有不注入 ----------------
api.setShop({
  v: 1, ts: 1,
  items: { r1: TOOL_ITEM },
  holds: { 'truck|r1': HOLD('r1', '安魂曲音叉', '卡车', 'vehicle') },
  sold: {},
});
api.setHeroes([{ id: 'h11', name: '卡车', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '卡车', items: [{ name: '安魂曲音叉', count: 2 }] }] });
check('I1 载具库存只作储存：不注入', api.sync().applied === 0);

// ---------------- J 弹药类：数量跨场扣减语义（count 走 stat_data） ----------------
api.setShop({ v: 1, ts: 1, items: { a1: AMMO_ITEM }, holds: { 'madeline|a1': HOLD('a1', '枪骑兵弹匣', '玛德琳', 'char', '弹药') }, sold: {} });
api.setHeroes([{ id: 'h12', name: '玛德琳', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '玛德琳', items: [{ name: '枪骑兵弹匣', count: 6 }] }] });
r = api.sync();
it = api.heroes()[0].items[0];
check('J1 弹药注入：count 取 stat_data 现值（6）', r.applied === 1 && it.category === '弹药' && it.count === 6, it);
check('J2 弹药绑定按 battle.line 解析（[绑定:突击×2]）', Array.isArray(it.bindings) && it.bindings.length === 1 && it.bindings[0].skillName === '突击' && it.bindings[0].cost === 2, it.bindings);

// ---------------- K ShopBlock 新结算链路：catalogLink(角色 field='物品') + catalogRevive 清墓碑 ----------------
// K1 角色结算：hold.field='物品'，数量由状态栏物品行写回（[名xN]）→ 注入可用
const CHAR_ITEM = {
  id: 'r9', name: '铜舌怀表', kind: 'relic', tier: 'common', form: 'reusable', uses: 1,
  battle: { line: '【铜舌怀表】[再动][道具][次数:1]', category: '道具', slots: ['再动'], count: 1, children: [] },
  val: {}, status: 'owned',
};
api.setShop({ v: 1, ts: 1, items: { r9: CHAR_ITEM }, holds: { 'madeline|r9': HOLD('r9', '铜舌怀表', '玛德琳', 'char', '物品') }, sold: {} });
api.setHeroes([{ id: 'h15', name: '玛德琳', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '玛德琳', items: [{ name: '铜舌怀表', count: 1 }] }] });
r = api.sync();
it = api.heroes()[0].items[0];
check('K1 角色结算(field=物品)：购买后注入且道具次数为每场重置值', r.applied === 1 && !!it && it.category === '道具' && it.maxUses === 1 && it.usesRemaining === 1 && it.count === 1, it);

// K2 买回：catalogRevive 清墓碑（status=owned、sold 键删除）+ catalogLink 重新登记 → 正常注入
api.setShop({
  v: 1, ts: 1,
  items: { r10: { id: 'r10', name: '亡者之匣', kind: 'relic', tier: 'legendary', form: 'reusable', uses: 1,
    battle: { line: '【亡者之匣】[群攻;power:60][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'owned' } },
  holds: { 'thorn|r10': HOLD('r10', '亡者之匣', '索恩') },
  sold: {},
});
api.setHeroes([{ id: 'h16', name: '索恩', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '索恩', items: [{ name: '亡者之匣', count: 1 }] }] });
r = api.sync();
it = api.heroes()[0].items[0];
check('K2 买回（revive 清墓碑 + link 登记）：正常注入', r.applied === 1 && !!it && it.name === '亡者之匣' && it.power === 60, r);

// K3 载具结算：ownerKind='vehicle' 不参与战斗注入（售出墓碑同理不认在英雄头上）
api.setShop({
  v: 1, ts: 1,
  items: { r11: { id: 'r11', name: '车用备件', kind: 'relic', tier: 'common', form: 'reusable', uses: 1,
    battle: { line: '【车用备件】[单回;power:10][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'owned' } },
  holds: { 'truck|r11': HOLD('r11', '车用备件', '卡车', 'vehicle', '杂物') },
  sold: {},
});
api.setHeroes([{ id: 'h17', name: '卡车', skills: [], items: [] }]);
api.setSnapshot({ heroes: [{ name: '卡车', items: [{ name: '车用备件', count: 1 }] }] });
check('K3 载具结算（field=杂物）：只作储存，不注入', api.sync().applied === 0);

// ---------------- L 裸名容错（走真 readStatusBarSnapshot：原始 stat_data → 快照 → 持有量） ----------------
// 受管物品在真实状态栏串里的三种形态：裸名 [名]（按 1 件）、[名xN]（取 N）、[名x0]（0 件，不翻成 1）
api.setShop({
  v: 1, ts: 1,
  items: {
    r12: { id: 'r12', name: '芭斯特的猫眼石', kind: 'relic', tier: 'high', form: 'reusable', uses: 1,
      battle: { line: '【芭斯特的猫眼石】[单回;power:45][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'owned' },
    r13: { id: 'r13', name: '安魂曲音叉', kind: 'relic', tier: 'high', form: 'reusable', uses: 2,
      battle: { line: '【安魂曲音叉】[单回;power:40][道具][次数:2]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'owned' },
    r14: { id: 'r14', name: '亡者之匣', kind: 'relic', tier: 'legendary', form: 'reusable', uses: 1,
      battle: { line: '【亡者之匣】[群攻;power:60][道具][次数:1]', category: '道具', slots: [], count: 1, children: [] }, val: {}, status: 'owned' },
  },
  holds: {
    'madeline|r12': HOLD('r12', '芭斯特的猫眼石', '玛德琳', 'char', '物品'),   // 计数形态 x1
    'madeline|r13': HOLD('r13', '安魂曲音叉', '玛德琳', 'char', '道具'),       // 裸名形态
    'madeline|r14': HOLD('r14', '亡者之匣', '玛德琳', 'char', '消耗品'),       // x0 明确归零
  },
  sold: {},
});
api.setMessages(0, { stat_data: { '状态栏': { '角色列表': [ { '角色': {
  '名字': '玛德琳',
  '属性': '[❤️HP:50/60][💠MP:10/20][🛡️Armor:3]',
  '物品': '[芭斯特的猫眼石x1][旧地图]',
  '道具': '[安魂曲音叉]',
  '消耗品': '[亡者之匣x0]',
} } ] } } });
api.setSnapshot(api.readSnapshot());
api.setHeroes([{ id: 'h18', name: '玛德琳', skills: [], items: [] }]);
r = api.sync();
items = api.heroes()[0].items;
const eye = items.find(x => x.name === '芭斯特的猫眼石');
const fork = items.find(x => x.name === '安魂曲音叉');
check('L1 受管裸名 [安魂曲音叉] → 按 1 件注入（count=1）', !!fork && fork.count === 1 && r.applied >= 1, { fork: fork, applied: r.applied });
check('L2 受管 [亡者之匣x0] → 仍按 0 件（不注入，未翻成 1 件）', !items.find(x => x.name === '亡者之匣'), items.map(x => x.name));
check('L3 受管 [芭斯特的猫眼石x1] → 计数形态照常注入', !!eye && eye.count === 1 && eye.power === 45, eye);
check('L4 快照 itemNames 收齐裸名与计数名（供容错判据）', (function () {
  const names = api.readSnapshot().heroes[0].itemNames || [];
  return names.indexOf('安魂曲音叉') >= 0 && names.indexOf('旧地图') >= 0;
})());

console.log('\n----------------------------------------');
console.log(fail === 0 ? '\x1b[32m全部 ' + pass + ' 项断言通过\x1b[0m' : '\x1b[31m失败 ' + fail + ' 项 / 通过 ' + pass + ' 项\x1b[0m');
process.exit(fail === 0 ? 0 : 1);
