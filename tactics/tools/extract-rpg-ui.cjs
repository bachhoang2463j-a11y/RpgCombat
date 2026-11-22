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
];
// 宿主注入（战棋规则/状态；不从原版带入）
const HOST = [
  'state', 'isSkillActionable', 'prepareSkillTarget', 'teamBarrier', 'skillHasBarrierTag', 'hasEnoughBindings',
  'isSummonBlockedByLimit', 'getHeroItemBindings', 'itemBindingKnowledge', 'isItemUsable', 'prepareItemTarget',
  'handleBasicAttack', 'handleBasicDefend', 'handleBasicRetreat', 'cancelTargeting', 'getSkillGroupChildren',
  'prepareGroupedItemSkill',
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
  const html = fs.readFileSync(SRC, 'utf8');
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

  // CSS 词元：入选 JS + HTML 的全部空白/引号分隔词元（含 Tailwind 任意值类）
  const used = new Set();
  const tokText = js + '\n' + railHtml + '\n' + menuHtml + '\n' + tipHtml;
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
export const RPG_UI_RAIL_HTML = ${JSON.stringify(railHtml)};
export const RPG_UI_MENU_HTML = ${JSON.stringify(menuHtml)};
export const RPG_UI_TIP_HTML = ${JSON.stringify(tipHtml)};

export function createRpgUi(host) {
  // ---- 宿主注入（战棋规则判定、瞄准入口、伪 state） ----
  const { state, isSkillActionable, prepareSkillTarget, skillHasBarrierTag, hasEnoughBindings, isSummonBlockedByLimit,
    getHeroItemBindings, itemBindingKnowledge, isItemUsable, prepareItemTarget, handleBasicAttack, handleBasicDefend,
    handleBasicRetreat, cancelTargeting, getSkillGroupChildren, prepareGroupedItemSkill } = host;
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
  return { bind, ${names.filter(n => /^[a-zA-Z]/.test(n) && /^(renderTurnQueue|updateSkillMenus|updateItemMenu|closeAllSubMenus|openBasicMenu|closeBasicMenu|openAttackSkillMenu|openSupportSkillMenu|openItemMenu|hideTagTip|formatTagPill|tagTipAttrs|tagDisplayLabel|escapeHistoryHtml)$/.test(n)).join(', ')},
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
