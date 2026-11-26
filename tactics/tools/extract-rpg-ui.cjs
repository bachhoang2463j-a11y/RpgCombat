#!/usr/bin/env node
// ==========================================
// 原版界面提取：从根 index.html（只读）按名字切出【左侧行动条】【右下技能栏（父子技能组卡/物品卡/子菜单）】
// 【标签悬浮提示】的原版代码、HTML 与其用到的 CSS（含 Tailwind 工具类），生成 tactics/src/vendor/rpg-ui/。
// 原则：代码原样；只做宿主适配（内联 onclick → 委托；规则判定/瞄准入口/状态由战棋宿主注入）。
// 用法：node tactics/tools/extract-rpg-ui.cjs [--check]
// ==========================================
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { splitCss } = require('./extract-rpg-av.cjs');

const ROOT = process.env.RPG_UI_ROOT || path.resolve(__dirname, '..', '..');
const SRC = process.env.RPG_UI_SRC || path.join(ROOT, 'index.html');
const OUT = process.env.RPG_UI_OUT || path.join(ROOT, 'tactics', 'src', 'vendor', 'rpg-ui');

// 入口（引用闭包从这里出发）
const ENTRIES = [
  'renderTurnQueue', 'updateSkillMenus', 'updateItemMenu', 'showTagTipFor', 'hideTagTip',
  'closeAllSubMenus', 'openBasicMenu', 'closeBasicMenu', 'openAttackSkillMenu', 'closeAttackSkillMenu',
  'openSupportSkillMenu', 'closeSupportSkillMenu', 'openItemMenu', 'closeItemMenu', 'closeSkillMenu',
  '_rcTipTimer',
  // 设置编辑器：原版技能表单模板（模块 A-E）、标签预览、可搜索标签下拉、药丸开关（多层手风琴外壳由宿主按原版结构拼装）
  'buildSkillFormFieldsHtml', 'buildEditorSkillTagPreview', 'openSkillTypeCombo', 'filterSkillTypeCombo',
  'applySkillTypeCombo', 'closeSkillTypeCombo', 'syncGrantSlotPower', 'togglePillClass',
];
// 宿主注入（战棋规则/状态；不从原版带入）
const HOST = [
  'state', 'isSkillActionable', 'prepareSkillTarget', 'teamBarrier', 'skillHasBarrierTag', 'hasEnoughBindings',
  'isSummonBlockedByLimit', 'getHeroItemBindings', 'itemBindingKnowledge', 'itemStatus', 'prepareItemTarget',
  'handleBasicAttack', 'handleBasicDefend', 'handleBasicRetreat', 'cancelTargeting', 'getSkillGroupChildren',
  'prepareGroupedItemSkill', 'normalizeEffectTag',
];
// 内联 onclick 中出现、需要委托到工厂内函数/宿主的名字
const ACTS = ['openBasicMenu', 'closeBasicMenu', 'openAttackSkillMenu', 'closeAttackSkillMenu', 'openSupportSkillMenu',
  'closeSupportSkillMenu', 'openItemMenu', 'closeItemMenu', 'closeSkillMenu', 'handleBasicAttack', 'handleBasicDefend',
  'handleBasicRetreat', 'cancelTargeting'];

function fail(msg) { throw new Error('[extract-rpg-ui] ' + msg); }
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const PATCH_LOG = [];
function patch(text, find, repl, expect, what) {
  const re = find instanceof RegExp ? new RegExp(find.source, find.flags.includes('g') ? find.flags : find.flags + 'g') : null;
  const n = re ? (text.match(re) || []).length : text.split(find).length - 1;
  if (n !== expect) fail('补丁命中数不符 [' + what + ']: ' + n + ' vs ' + expect);
  const out = re ? text.replace(re, typeof repl === 'function' ? repl : () => repl) : text.split(find).join(repl);
  PATCH_LOG.push({ what, hits: n });
  return out;
}

// ---------- JS：列 0 顶层声明索引 + 名字闭包 ----------
function scriptRange(L) {
  let a = -1, b = -1;
  for (let i = 0; i < L.length; i++) if (/^\s*<script>\s*$/.test(L[i]) || /^\s*<script>/.test(L[i]) && !/src=/.test(L[i])) { if (i > 2600) { a = i + 1; break; } }
  if (a < 0) fail('主脚本起点未找到');
  for (let i = a; i < L.length; i++) if (/<\/script>/.test(L[i])) { b = i; break; }
  return [a, b];
}
function declIndex(L, a, b) {
  const decl = new Map();
  for (let i = a; i < b; i++) {
    const m = L[i].match(/^(?:async\s+)?function\s*\*?\s*([\w$]+)\s*\(/) || L[i].match(/^class\s+([\w$]+)/) || L[i].match(/^(?:const|let|var)\s+([\w$]+)\b/);
    if (m && !decl.has(m[1])) decl.set(m[1], i);
  }
  return decl;
}
function blockAt(L, i, b) {
  // 去掉字符串与行尾注释后再判断（单行声明常带行尾注释）
  const one = L[i].replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''").replace(/\/\/.*$/, '');
  if (/;\s*$/.test(one) && !/[{(\[]\s*$/.test(one)) return [i, i];
  // 单行函数：同一行花括号已配平
  const open = (one.match(/\{/g) || []).length;
  if (open > 0 && open === (one.match(/\}/g) || []).length) return [i, i];
  for (let j = i + 1; j < b; j++) if (/^[}\]][)\];]*\s*$|^\}\)\(\);/.test(L[j])) return [i, j];
  fail('块终点未找到: 行 ' + (i + 1));
}
function closure(L, decl, b) {
  const host = new Set(HOST), inc = new Map(), q = [...ENTRIES];
  while (q.length) {
    const n = q.pop();
    if (host.has(n) || inc.has(n)) continue;
    if (!decl.has(n)) fail('入口/依赖不存在: ' + n);
    const [s, e] = blockAt(L, decl.get(n), b);
    inc.set(n, [s, e]);
    const t = L.slice(s, e + 1).join('\n').replace(/\/\/[^\n]*/g, '');
    for (const m of t.matchAll(/(?<![.\w$\-])([A-Za-z_$][\w$]*)/g)) if (decl.has(m[1]) && m[1] !== n) q.push(m[1]);
  }
  // 一个块可能声明了多个名字（同行 let a, b）；按起点去重排序
  const seen = new Set(), ranges = [];
  for (const [n, r] of [...inc.entries()].sort((x, y) => x[1][0] - y[1][0])) { if (seen.has(r[0])) continue; seen.add(r[0]); ranges.push({ name: n, r }); }
  return ranges;
}

// ---------- HTML：按 id 切出容器 ----------
function sliceById(L, id, what) {
  const a = L.findIndex(l => l.includes('id="' + id + '"'));
  if (a < 0) fail('HTML 未找到 #' + id);
  const ind = L[a].match(/^\s*/)[0].length;
  const tag = L[a].trim().match(/^<(\w+)/)[1];
  if (L[a].includes('</' + tag + '>')) return [a, a];
  let depth = 0;
  for (let j = a; j < L.length; j++) {
    depth += (L[j].match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length - (L[j].match(new RegExp('</' + tag + '>', 'g')) || []).length;
    if (depth === 0) return [a, j];
  }
  fail('HTML 未闭合 #' + id + ' ' + what + ind);
}

// ---------- CSS：按词元闭包（Tailwind 转义安全） ----------
function unescapeCss(s) { return s.replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, '$1'); }
function extractCss(html, used) {
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  const rules = splitCss(styles);
  const SCOPE = '[data-rpg-ui-scope]';
  const partsOf = s => [...s.matchAll(/[.#]((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w-])+)/g)].map(m => unescapeCss(m[1]));
  const splitSel = prelude => { const out = []; let d = 0, cur = ''; for (const ch of prelude) { if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()).filter(Boolean); };
  const universal = s => /^(\*|::?(?:after|before|backdrop))$/.test(s);
  const oneSel = s => { const p = partsOf(s); return p.length > 0 && p.every(x => used.has(x)); };
  const scopeSel = s => universal(s) ? (s === '*' ? SCOPE + ', ' + SCOPE + ' *' : SCOPE + ' ' + s + ', ' + SCOPE + ' *' + s) : SCOPE + ' ' + s;
  const anims = new Set(), keep = [];
  const collect = block => { for (const m of block.matchAll(/animation(?:-name)?\s*:\s*([^;]+)/g)) for (const t of m[1].split(/[\s,]+/)) if (/^[a-zA-Z_][\w-]*$/.test(t)) anims.add(t); };
  const filterRule = r => { const sels = splitSel(r.prelude); const ok = sels.every(universal) ? sels : sels.filter(oneSel); return ok.length ? ok.map(scopeSel).join(', ') + '{' + r.block + '}' : null; };
  const hit = r => { const sels = splitSel(r.prelude); return sels.every(universal) || sels.some(oneSel); };
  for (const r of rules) {
    if (/^@keyframes/.test(r.prelude) || /^@(font-face|import|charset)/.test(r.prelude)) continue;
    if (/^@media|^@supports/.test(r.prelude)) {
      const inner = splitCss(r.block).filter(x => !x.prelude.startsWith('@') && hit(x));
      if (inner.length) { keep.push(r.prelude + '{' + inner.map(filterRule).join('') + '}'); inner.forEach(x => collect(x.block)); }
      continue;
    }
    if (r.prelude.startsWith('@')) continue;
    if (hit(r)) { const t = filterRule(r); if (t) { keep.push(t); collect(r.block); } }
  }
  const kfs = rules.filter(r => /^@keyframes\s+/.test(r.prelude));
  for (const t of used) if (kfs.some(k => k.prelude.replace(/^@keyframes\s+/, '').trim() === t)) anims.add(t);
  const kfKeep = new Map(); let added = true;
  while (added) { added = false; for (const k of kfs) { const name = k.prelude.replace(/^@keyframes\s+/, '').trim(); if (anims.has(name) && !kfKeep.has(name)) { kfKeep.set(name, k.text); collect(k.block); added = true; } } }
  return { css: keep.join('\n') + '\n' + [...kfKeep.values()].join('\n'), rules: keep.length, keyframes: kfKeep.size };
}

function build() {
  PATCH_LOG.length = 0;
  // 统一按 LF 解析（同 extract-rpg-av：工作区 CRLF 检出不影响生成物与指纹）
  const html = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
  const L = html.split('\n');
  const [a, b] = scriptRange(L);
  const decl = declIndex(L, a, b);
  const ranges = closure(L, decl, b);
  let js = ranges.map(x => L.slice(x.r[0], x.r[1] + 1).join('\n')).join('\n\n');
  // 标签悬浮提示的全局事件委托（无名 IIFE，按哨兵带入）
  const tipA = L.findIndex(l => l.startsWith('(function initTagTipEvents() {'));
  if (tipA < 0) fail('initTagTipEvents 未找到');
  const tipB = L.findIndex((l, i) => i > tipA && /^\}\)\(\);\s*$/.test(l));
  const tipInit = L.slice(tipA, tipB + 1).join('\n');

  // 宿主适配补丁（固定命中数）
  js = patch(js, 'if (isEnough) btn.onclick = () => prepareSkillTarget(idx);', 'btn.dataset.skillIdx = idx; if (isEnough) btn.onclick = () => prepareSkillTarget(idx);', 1, '技能卡挂全局索引（宿主补射程胶囊）');
  js = patch(js, /function createItemCard\(hero, item, idx\) \{[\s\S]*?(?=    let cardStateClass)/,
    `function createItemCard(hero, entry, idx, childIdx = null) {
    const children = childIdx == null && entry.children?.length ? entry.children : null;
    const child = childIdx == null ? null : entry.children[childIdx];
    const item = child ? { ...entry, ...child, category: entry.category, bindings: entry.bindings,
        count: entry.count, maxUses: entry.maxUses, usesRemaining: entry.usesRemaining } : entry;
    const meta = ITEM_CATEGORY_META[item.category] || ITEM_CATEGORY_META['道具'];
    const isAmmo = item.category === '弹药';
    const status = itemStatus(entry, child);
    const isBlocked = !status.ok;
    const isExhausted = isBlocked && !isAmmo && (item.category === '道具'
        ? item.maxUses > 0 && (item.usesRemaining ?? item.maxUses) <= 0 : !(item.count > 0));
    const isMpShort = status.reason === 'MP不足';
`, 1, '物品父子卡共用物品判定与库存视图');
  js = patch(js, '    if (isBlocked) btn.disabled = true;', `    if (isBlocked && !children) btn.setAttribute('aria-disabled', 'true');
    btn.title = status.reason || (children ? '展开道具子用法' : item.category + (status.auxCost ? ' · 消耗1辅助行动' : ' · 已就绪'));
    if (!isBlocked && !children) {
        btn.dataset.costMain = status.mainCost;
        btn.dataset.costAux = status.auxCost;
    }`, 1, '物品按实际费用悬停、灰态原因可读');
  js = patch(js, /    let noticeHtml = '';\n    if \(isAmmo\)[\s\S]*?(?=    let row3Html)/,
    `    const noticeHtml = status.reason ? '<span class="text-[8px] text-rose-400 font-bold leading-none">' + escapeHistoryHtml(status.reason) + '</span>' : '';
`, 1, '物品显示真实不可用原因');
  js = patch(js, /    \/\/ 普通道具：点击进目标选择\/使用[\s\S]*?(?=        let _arrow)/, `    if (!isBlocked && !children) btn.onclick = () => child
        ? prepareGroupedItemSkill(idx, childIdx) : prepareItemTarget(idx);
    if (children) {
`, 1, '物品子项不进普通技能索引');
  js = patch(js, "'⇅ 变体×' + _children.length", "'⇅ 变体×' + children.length", 1, '物品变体数');
  js = patch(js, /        _children\.forEach\(\(c, cIdx\) => \{[\s\S]*?\n        \}\);/,
    '        children.forEach((c, cIdx) => wrap.appendChild(createItemCard(hero, entry, idx, cIdx)));', 1, '子用法复用物品卡而非技能卡');
  js = patch(js, '        if (!isExhausted) btn.onclick = _toggle;', '        btn.onclick = _toggle;', 1, '库存耗尽仍可展开查看子项');

  // —— FX02 规范标签（编辑器下拉去单群）：单/群前缀标签映射为规范标签（单群由空间范围决定，不再进标签）——
  // 官方规范名以 src/effect-definitions.mjs EFFECT_DEFINITIONS / LEGACY_TAG_ALIASES 为唯一权威（v3）：
  //   单体/群攻→伤害，单回/群回→治疗，单回蓝/群回蓝→回蓝，单冲/群冲→充能，单增/群增→加攻，单防/群防→加防，
  //   单盾/群盾→加盾，单瞄/群瞄→加瞄，单降/群降→降防，单盲/群盲→致盲，单滞/群滞→迟滞，单弱/群弱→虚弱，
  //   单缓/群缓→减速，单速/群速→加速，单避/群避→闪避（持续；[回避] 一次性独立保留），穿透/群穿透→穿透，
  //   眩晕/群眩晕→眩晕，散射/群散射→散射，中毒/群中毒→中毒，燃烧/群燃烧→燃烧，麻痹/群麻痹→麻痹，
  //   反击/群反击→反击，驱散/群驱散→驱散；括号子型保留（[单体(枪击)]→[伤害(枪击)]）。
  const TAG_NORM = [
    [/^(单体|群攻)$/, '伤害'], [/^单体(?=[（(])/, '伤害'], [/^群攻(?=[（(])/, '伤害'],
    [/^(单回蓝|群回蓝)$/, '回蓝'], [/^(单回|群回)$/, '治疗'], [/^(单增|群增)$/, '加攻'], [/^(单冲|群冲)$/, '充能'],
    [/^(单防|群防)$/, '加防'], [/^(单盾|群盾)$/, '加盾'], [/^(单瞄|群瞄)$/, '加瞄'], [/^(单降|群降)$/, '降防'],
    [/^(单盲|群盲)$/, '致盲'], [/^(单滞|群滞)$/, '迟滞'], [/^(单弱|群弱)$/, '虚弱'], [/^(单速|群速)$/, '加速'],
    [/^(单缓|群缓)$/, '减速'], [/^(单避|群避)$/, '闪避'], [/^(穿透|群穿透)$/, '穿透'], [/^(眩晕|群眩晕)$/, '眩晕'],
    [/^(散射|群散射)$/, '散射'], [/^(中毒|群中毒)$/, '中毒'], [/^(燃烧|群燃烧)$/, '燃烧'], [/^(麻痹|群麻痹)$/, '麻痹'],
    [/^(反击|群反击)$/, '反击'], [/^(驱散|群驱散)$/, '驱散'],
  ];
  function normTag(raw) {
    const m = raw.match(/^[^（(]*/);
    const base = m ? m[0] : raw;
    const sub = (raw.match(/[（(]([^）)]*)[）)]$/) || [])[1];
    for (const [re, name] of TAG_NORM) if (re.test(base)) return name + (sub ? '(' + sub + ')' : '');
    return null;
  }
  const mSk = js.match(/const SKILL_TYPES = \[([\s\S]*?)\];/);
  if (!mSk) fail('SKILL_TYPES 未找到');
  {
    const seen = new Set(); const normed = [];
    for (let item of mSk[1].split(',')) {
      const t = item.trim();
      if (!t) continue;
      const mm = t.match(/^'\[([^\]]+)\]'$/);
      let keep = t;
      if (mm) { const nn = normTag(mm[1]); if (nn) keep = "'[" + nn + "]'"; }
      if (!seen.has(keep)) { seen.add(keep); normed.push(keep); }
    }
    js = js.replace(mSk[0], 'const SKILL_TYPES = [' + normed.join(', ') + '];');
    PATCH_LOG.push({ what: 'SKILL_TYPES 去单群规范化', hits: 1 });
  }
  // 规范标签显示名（只补未有条目；值 = 官方名本身，不另套输出）
  js = patch(js, "'单体': '单体伤害', '群攻': '群体伤害',",
    "'伤害': '伤害', '治疗': '治疗', '回蓝': '回蓝', '充能': '充能', '加攻': '加攻', '加防': '加防', '加盾': '加盾', '加瞄': '加瞄', '致盲': '致盲', '迟滞': '迟滞', '虚弱': '虚弱', '加速': '加速', '减速': '减速', '闪避': '闪避', '单体': '单体伤害', '群攻': '群体伤害',", 1, 'TAG_EXPAND_MAP 加规范标签显示名');
  // 下拉渲染：旧标签当前值经宿主注入的 normalizeEffectTag 规范化后显示/回填（不保留旧群形态）
  js = patch(js, "function renderSkillTypeOptions(curVal) {\n  const _nonSlot = new Set(['[必中]', '[转火]', '[突进]', '[众召]', '[高阶]', '[传奇]', '[神术]', '[近战]', '[远程]', '[法术]']);",
    "function renderSkillTypeOptions(curVal) {\n  const _nonSlot = new Set(['[必中]', '[转火]', '[突进]', '[众召]', '[高阶]', '[传奇]', '[神术]', '[近战]', '[远程]', '[法术]']);\n  curVal = (curVal && normalizeEffectTag) ? ('[' + normalizeEffectTag(curVal) + ']') : curVal;", 1, '下拉当前值经 normalizeEffectTag 规范化');
  // 规范伤害标签参与攻击技能判定（菜单攻击/辅助分组）与卡面胶囊配色、悬浮说明
  js = patch(js, "function isAttackSkill(skill) {\n  const slots = [skill.type, skill.type2, skill.type3];\n  return MENU_DAMAGE_TAGS.some(t => slots.some(s => s && s.includes(t)));\n}",
    "function isAttackSkill(skill) {\n  if (skill.isGroup) return (skill.children || []).some(isAttackSkill);\n  return skillSlots(skill).some(slot => slot.attack);\n}", 1, '攻击技能判定复用规则伤害槽');
  js = patch(js, "const MENU_DAMAGE_TAGS = ['单体','群攻','穿透','群穿透','眩晕','群眩晕'];", '', 1, '移除不再使用的旧分类标签表');
  js = patch(js, "else if (cleanTag.includes('攻') || cleanTag.includes('单体') || cleanTag.includes('穿透'))",
    "else if (cleanTag.includes('伤害') || cleanTag.includes('攻') || cleanTag.includes('单体') || cleanTag.includes('穿透'))", 1, '胶囊配色识别规范伤害标签');
  js = patch(js, "'单体': '对单一目标造成 {N} 点伤害，受目标护甲减免。',",
    "'伤害': '按空间范围命中目标，造成 {N} 点伤害，受护甲减免。', '单体': '对单一目标造成 {N} 点伤害，受目标护甲减免。',", 1, '伤害标签悬浮说明');

  // HTML：行动条导轨 + 菜单 + 悬浮提示容器
  const railA = L.findIndex(l => l.includes('<!-- 左侧：行动顺序队列与能量导轨 -->'));
  if (railA < 0) fail('行动条注释哨兵未找到');
  const [rs, re] = sliceById(L, 'turn-order-container', 'rail');
  let railHtml = L.slice(railA + 1, re + 3).join('\n');
  if (!/^\s*<\/div>\s*$/.test(L[re + 1]) || !/^\s*<\/div>\s*$/.test(L[re + 2])) fail('行动条外层结构变化');
  railHtml = patch(railHtml, /^(\s*)<div class="absolute left-1/m, (m, ind) => ind + '<div id="turn-order-rail" class="absolute left-1', 1, '行动条外层加 id（宿主安全区）');
  void rs;
  const [ms, me] = sliceById(L, 'menu-container', 'menu');
  let menuHtml = L.slice(ms, me + 1).join('\n');
  // 技能栏左侧的【非致命】开关属回合制全局设定，不在技能栏内，不带入
  menuHtml = patch(menuHtml, /onclick="(\w+)\(([^)]*)\)"/g, (m, fn, arg) => {
    if (!ACTS.includes(fn)) fail('未登记的内联 onclick: ' + fn);
    return 'data-rpg-ui-act="' + fn + '"';
  }, 13, '内联 onclick → 委托');
  // 基础行动：防御/撤退保留原样但战棋未迁移（禁用+注明）；【结束回合】由宿主放在菜单标题栏右侧（高频操作不进二级菜单）
  menuHtml = patch(menuHtml, /<button data-rpg-ui-act="handleBasic(Defend|Retreat)"([^>]*)>([\s\S]*?)<\/button>/g,
    (m, k, attrs, inner) => '<button data-rpg-ui-act="handleBasic' + k + '"' + attrs + ' disabled title="战棋未迁移">' + inner + ' <span class="ml-auto text-[9px] text-slate-500 font-normal">战棋未迁移</span></button>', 2, '防御/撤退禁用注明');
  const tipStart = L.findIndex(l => l.startsWith('<div id="rc-tag-tooltip"'));
  const [ts, te] = sliceById(L, 'rc-tag-tooltip', 'tip');
  if (ts !== tipStart) fail('悬浮提示容器位置变化');
  const tipHtml = L.slice(ts, te + 1).join('\n');
  // 编辑器模态容器（原版 #editor-modal 原样）；手风琴外壳样式词元取自原版 openEditor 与折叠函数（只扫词元，不带入代码）
  const [es, ee] = sliceById(L, 'editor-modal', 'editor');
  const editorHtml = L.slice(es, ee + 1).join('\n').trim();
  const edA = decl.get('openEditor'), edB = decl.get('toggleItemFold');
  if (edA == null || edB == null) fail('openEditor / toggleItemFold 未找到');
  // 蓄力专用菜单（原版 updateChargeMenu）由宿主按原版标记重绘 #charge-menu，同样只取词元
  const chA = decl.get('updateChargeMenu');
  if (chA == null) fail('updateChargeMenu 未找到');
  const editorShellText = L.slice(edA, blockAt(L, edB, b)[1] + 1).join('\n') + '\n' + L.slice(chA, blockAt(L, chA, b)[1] + 1).join('\n');
  // 可搜索下拉浮层挂到界面作用域内（生成 CSS 带 [data-rpg-ui-scope] 前缀，挂 body 会失去样式）
  js = patch(js, 'document.body.appendChild(pop);', "(document.querySelector('[data-rpg-ui-scope]') || document.body).appendChild(pop);", 1, '标签下拉浮层挂作用域');

  // CSS 词元：入选 JS + HTML 的全部空白/引号分隔词元（含 Tailwind 任意值类）
  const used = new Set();
  const tokText = js + '\n' + railHtml + '\n' + menuHtml + '\n' + tipHtml + '\n' + editorHtml + '\n' + editorShellText;
  for (const t of tokText.split(/[\s"'`<>=]+/)) if (t) { used.add(t); used.add(t.replace(/[;,)]+$/, '')); }
  for (const m of tokText.matchAll(/[A-Za-z_][\w-]*/g)) used.add(m[0]);
  const css = extractCss(html, used);

  const names = ranges.map(x => x.name);
  const header = [
    '// ==========================================',
    '// 由 tactics/tools/extract-rpg-ui.cjs 自动生成，请勿手改。',
    '// 源: index.html  sha256=' + sha(html),
    '// 入选声明 ' + ranges.length + ' 段: ' + ranges.map(x => x.name + '@' + (x.r[0] + 1)).join(', '),
    '// 宿主注入: ' + HOST.join(', '),
    '// 宿主适配补丁: ' + PATCH_LOG.map(p => p.what + '×' + p.hits).join('; '),
    '// ==========================================',
  ].join('\n');
  const out = header + `
/* eslint-disable */
import { skillSlots } from '../../effect-definitions.mjs';
export const RPG_UI_RAIL_HTML = ${JSON.stringify(railHtml)};
export const RPG_UI_MENU_HTML = ${JSON.stringify(menuHtml)};
export const RPG_UI_TIP_HTML = ${JSON.stringify(tipHtml)};
export const RPG_UI_EDITOR_HTML = ${JSON.stringify(editorHtml)};

export function createRpgUi(host) {
  // ---- 宿主注入（战棋规则判定、瞄准入口、伪 state） ----
  const { state, isSkillActionable, prepareSkillTarget, skillHasBarrierTag, hasEnoughBindings, isSummonBlockedByLimit,
    getHeroItemBindings, itemBindingKnowledge, itemStatus, prepareItemTarget, handleBasicAttack, handleBasicDefend,
    handleBasicRetreat, cancelTargeting, getSkillGroupChildren, prepareGroupedItemSkill, normalizeEffectTag } = host;
  const teamBarrier = 0;

  // ---- 原版代码（原样） ----
${js}

${tipInit}

  const __acts = { ${ACTS.map(n => n + ': () => ' + n + '()').join(', ')} };
  function bind(root) {
    root.addEventListener('click', e => {
      const el = e.target.closest('[data-rpg-ui-act]');
      if (!el || el.disabled) return;
      const fn = __acts[el.getAttribute('data-rpg-ui-act')];
      if (fn) { e.stopPropagation(); fn(); }
    });
  }
  return { bind, ${names.filter(n => /^[a-zA-Z]/.test(n) && /^(renderTurnQueue|updateSkillMenus|updateItemMenu|closeAllSubMenus|openBasicMenu|closeBasicMenu|openAttackSkillMenu|openSupportSkillMenu|openItemMenu|hideTagTip|formatTagPill|tagTipAttrs|tagDisplayLabel|escapeHistoryHtml|buildSkillFormFieldsHtml|buildEditorSkillTagPreview|renderSkillTypeOptions|WEBM_FX_REGISTRY|openSkillTypeCombo|filterSkillTypeCombo|applySkillTypeCombo|closeSkillTypeCombo|syncGrantSlotPower|togglePillClass)$/.test(n)).join(', ')},
    markRoundStart() { _roundStartGlowPending = true; },
    resetQueue() { _prevQueueCurrentUid = null; } };
}
`;
  return { js: out, css: '/* 由 extract-rpg-ui.cjs 自动生成，请勿手改。源 sha256=' + sha(html) + ' */\n' + css.css,
    report: { source: SRC, sourceSha: sha(html), decls: ranges.length, jsBytes: Buffer.byteLength(out), cssRules: css.rules, cssKeyframes: css.keyframes, patches: PATCH_LOG.length } };
}

if (require.main === module) {
  const out = build();
  const check = process.argv.includes('--check');
  const files = { 'rpg-ui.mjs': out.js, 'rpg-ui.css': out.css };
  if (check) {
    const stale = Object.entries(files).filter(([n, t]) => !fs.existsSync(path.join(OUT, n)) || fs.readFileSync(path.join(OUT, n), 'utf8') !== t).map(([n]) => n);
    if (stale.length) { console.error('[extract-rpg-ui] 产物过期: ' + stale.join(', ')); process.exit(1); }
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    for (const [n, t] of Object.entries(files)) fs.writeFileSync(path.join(OUT, n), t);
  }
  console.log(JSON.stringify(Object.assign({ check }, out.report)));
}
module.exports = { build };
