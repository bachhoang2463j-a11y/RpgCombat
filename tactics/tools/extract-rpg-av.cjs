'use strict';
// ==========================================
// 战棋视听底座提取器：只读根 index.html，按名称/哨兵切片回合制成熟视听模块，生成
//   tactics/src/vendor/rpg-av/rpg-av.mjs（工厂 createRpgAv(host)）与 rpg-av.css。
// 原则：不手抄、不改根回合制；每条宿主适配补丁断言命中次数，哨兵缺失/命中不符/空片段即失败。
// 运行：node tactics/tools/extract-rpg-av.cjs [--check]   （--check 只校验不写盘，比较现有产物）
// ==========================================
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = process.env.RPG_AV_ROOT || path.resolve(__dirname, '..', '..');
const SRC = process.env.RPG_AV_SRC || path.join(ROOT, 'index.html');
const OUT = process.env.RPG_AV_OUT || path.join(ROOT, 'tactics', 'src', 'vendor', 'rpg-av');

// 本 Demo 使用的入口（其余段落经引用闭包自动排除）
const ENTRIES = [
  'playEnemyWindup', 'playAttackIdentityFx', 'playArcaneProjectile', 'playHitFeedback', 'classifyHit',
  'syncHitBar', 'CombatAudioDirector', 'clearHitFeedback', 'warmIdentitySample', 'playArsenicShot',
  'clearArcaneFx',
];
// 不入口：敌方兜底群攻 playMeleeGroup/RangedGroup/SpellGroup 按全队卡片头像取帧（portraitFrame），
// 与空间范围"只作用真实受影响目标"冲突；战棋敌方范围攻击改走攻击身份 aoe（逐目标 onImpact）。
// 闭包内被 clearArcaneFx 等引用、但属于本 Demo 不产生状态的未迁移段：生成显式空实现
const STUBS = ['clearSummonState', 'clearStatusLayers', 'clearSelfDestructState', 'clearRescueState', 'clearVariantState'];
// 需要原样带入的段（未入闭包也带入）：语法上属于前一语句的续行
const MESSY_SECTIONS = ['抗性与免疫演出 BEGIN', 'v12.10 状态发作', 'v12.10 状态 END', '救援时刻 v12.10 BEGIN', '召唤三瞬默认演出 v12.12 BEGIN'];

function fail(msg) { throw new Error('[extract-rpg-av] ' + msg); }
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

function lineIndex(L, pred, from = 0, what = '') {
  for (let i = from; i < L.length; i++) if (pred(L[i])) return i;
  fail('哨兵未找到: ' + what);
}
// 顶层声明块：从首行起到第一个列 0 的 `}` / `};` / `})();` 行（含）
function topBlock(L, startPred, what, endRe = /^\}[;)]*\s*$|^\}\)\(\);\s*$/) {
  const a = lineIndex(L, startPred, 0, what);
  if (/[;]\s*$/.test(L[a]) && !/[{(\[]\s*$/.test(L[a])) return { a, b: a, text: L[a] };
  const b = lineIndex(L, l => endRe.test(l), a + 1, what + ' 结束');
  const text = L.slice(a, b + 1).join('\n');
  if (!text.trim()) fail('空片段: ' + what);
  return { a, b, text };
}
function patch(text, find, repl, expect, what) {
  const re = find instanceof RegExp ? new RegExp(find.source, find.flags.includes('g') ? find.flags : find.flags + 'g') : null;
  const n = re ? (text.match(re) || []).length : text.split(find).length - 1;
  if (expect !== '*' && (typeof expect === 'number' ? n !== expect : n < expect.min)) fail('补丁命中数不符 [' + what + ']: ' + n + ' vs ' + JSON.stringify(expect));
  const out = re ? text.replace(re, typeof repl === 'function' ? repl : () => repl) : text.split(find).join(repl);
  PATCH_LOG.push({ what, hits: n });
  return out;
}
const PATCH_LOG = [];

// ---------- arcaneVfxModule：顶层语句切分 + 引用闭包 ----------
function sliceArcane(L) {
  const a = lineIndex(L, l => l.startsWith('const arcaneVfxModule = (function () {'), 0, 'arcaneVfxModule 起点');
  const b = lineIndex(L, l => l.startsWith('})();'), a + 1, 'arcaneVfxModule 终点');
  const segs = []; let cur = null;
  let inBlock = false;
  for (let i = a + 1; i < b; i++) {
    const l = L[i];
    if (inBlock) { // 块注释内部：一律作为注释并入当前段，保持"待接下一语句"
      if (cur) cur.lines.push(i);
      if (l.includes('*/')) inBlock = false;
      continue;
    }
    // 顶层 = 4 空格缩进的非闭合行；救援段等以列 0 书写的合并块，其声明/注释行同样视为顶层
    const top = (/^    \S/.test(l) && !/^    [}\])]/.test(l)) ||
      /^(function |async function |const |let |var |\/\*|\/\/)/.test(l);
    if (top) {
      if (!cur || !cur.pending) { cur = { lines: [], head: null, pending: false }; segs.push(cur); }
      cur.lines.push(i);
      if (/^\s*\/\*/.test(l) && !l.includes('*/')) { inBlock = true; cur.pending = true; }
      else if (/^\s*(\/\/|\/\*|\*)/.test(l)) cur.pending = true; else { cur.pending = false; if (cur.head == null) cur.head = l.trim(); }
    } else if (cur) cur.lines.push(i);
  }
  // 非声明开头的续行并入前一语句
  const stmtRe = /^(function|async function|const|let|var|'use strict'|if|for|window\.|Object\.assign|DRAW\.\w+\s*=|return|try)/;
  // 平衡修复：缩进不规整的函数体会被误切成多段；按剥离字符串/注释/模板后的花括号差，把未闭合段与后续段合并
  const stripForBalance = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/`(?:\\[\s\S]|\$\{(?:[^{}]|\{[^{}]*\})*\}|[^`\\])*`/g, '``')
    .replace(/\/\/[^\n]*/g, '').replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, "''");
  const balance = sg => { const t = stripForBalance(sg.lines.map(i => L[i]).join('\n')); return (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length; };
  const fixed = [];
  for (let k = 0; k < segs.length; k++) {
    const sg = { lines: [...segs[k].lines], head: segs[k].head };
    let bal = balance(sg), guard = 0;
    while (bal > 0 && k + 1 < segs.length) {
      k++; sg.lines.push(...segs[k].lines); if (sg.head == null) sg.head = segs[k].head; bal = balance(sg);
      if (++guard > 40) fail('平衡修复超过 40 段，疑似剥离失误，起于源行 ' + (sg.lines[0] + 1));
    }
    if (bal !== 0) fail('顶层语句花括号不平衡(' + bal + ')，源行 ' + (sg.lines[0] + 1));
    fixed.push(sg);
  }
  const merged = [];
  for (const sg of fixed) {
    if (!sg.head || stmtRe.test(sg.head) || !merged.length) merged.push({ lines: [...sg.lines], head: sg.head });
    else merged[merged.length - 1].lines.push(...sg.lines);
  }
  // 段标记（BEGIN/END 注释）决定"缩进不规整段"：其中只信任 function 声明
  let messy = false;
  for (const sg of merged) {
    const raw = sg.lines.map(i => L[i]).join('\n');
    for (const line of sg.lines) {
      const t = L[line];
      if (MESSY_SECTIONS.some(m => t.includes(m))) messy = !/END/.test(t) || /BEGIN/.test(t);
      if (/召唤三瞬默认演出 v12\.12 END/.test(t)) messy = false;
    }
    sg.messy = messy; sg.text = raw;
  }
  const declNames = head => {
    let m = head.match(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/); if (m) return [m[1]];
    m = head.match(/^(?:const|let|var)\s+(.*)$/); if (!m) return [];
    const rest = m[1], names = []; let d = 0, expect = true;
    for (let i = 0; i < rest.length; i++) {
      const c = rest[i];
      if (c === "'" || c === '"' || c === '`') { const q = c; i++; while (i < rest.length && rest[i] !== q) { if (rest[i] === '\\') i++; i++; } continue; }
      if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
      if (d === 0 && expect && /[A-Za-z_$]/.test(c)) { let j = i; while (/[\w$]/.test(rest[j] || '')) j++; names.push(rest.slice(i, j)); expect = false; i = j - 1; continue; }
      if (d === 0 && c === ',') expect = true;
    }
    return names;
  };
  const byName = new Map();
  merged.forEach((sg, idx) => {
    sg.decl = !sg.head ? [] : sg.messy ? (/^(async\s+)?function/.test(sg.head) ? declNames(sg.head) : []) : declNames(sg.head);
    sg.decl.forEach(n => byName.set(n, idx));
  });
  const strip = t => t.replace(/\/\/[^\n]*/g, '').replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, "''");
  merged.forEach(sg => {
    const refs = new Set();
    for (const m of strip(sg.text).matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)/g)) if (byName.has(m[1])) refs.add(m[1]);
    sg.decl.forEach(n => refs.delete(n));
    sg.refs = refs;
  });
  const stubs = new Set(STUBS);
  const inc = new Set(), q = [...ENTRIES];
  for (const e of ENTRIES) if (!byName.has(e)) fail('入口不存在: ' + e);
  for (const s of STUBS) if (!byName.has(s)) fail('存根目标不存在（源已变化？）: ' + s);
  while (q.length) {
    const n = q.pop(); if (stubs.has(n)) continue;
    const idx = byName.get(n); if (idx == null || inc.has(idx)) continue;
    inc.add(idx); for (const r of merged[idx].refs) q.push(r);
  }
  const ordered0 = [...inc];
  const keepBare = merged.map((sg, i) => i).filter(i => !merged[i].decl.length && !merged[i].messy && merged[i].head &&
    (/^'use strict'/.test(merged[i].head) || /^DRAW\.\w+\s*=/.test(merged[i].head) || /^window\.addEventListener\('resize'/.test(merged[i].head) ||
     (/^if\b/.test(merged[i].head) && i > 0 && /^DRAW\.\w+\s*=/.test(merged[i - 1].head || ''))));
  // 无名语句（画法注册等）所引用的声明同样进入闭包
  for (const i of keepBare) for (const r of merged[i].refs) q.push(r);
  while (q.length) {
    const n = q.pop(); if (stubs.has(n)) continue;
    const idx = byName.get(n); if (idx == null || inc.has(idx)) continue;
    inc.add(idx); for (const r of merged[idx].refs) q.push(r);
  }
  const all = [...new Set([...inc, ...keepBare])].sort((x, y) => x - y);
  const ranges = [];
  for (const i of all) { const sg = merged[i]; const r = [sg.lines[0] + 1, sg.lines[sg.lines.length - 1] + 1]; const last = ranges[ranges.length - 1]; if (last && last[1] + 1 >= r[0]) last[1] = r[1]; else ranges.push(r); }
  const body = all.map(i => merged[i].text).join('\n');
  return { body, ranges, count: all.length, lines: all.reduce((s, i) => s + merged[i].lines.length, 0), span: [a + 1, b + 1] };
}

// ---------- CSS：按 JS 中出现的类名/动画名闭包提取 ----------
function splitCss(css) {
  const out = []; let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;
    if (css.startsWith('/*', i)) { const e = css.indexOf('*/', i + 2); i = e < 0 ? css.length : e + 2; continue; }
    const open = css.indexOf('{', i); if (open < 0) break;
    const prelude = css.slice(i, open).trim();
    let d = 1, j = open + 1;
    while (j < css.length && d > 0) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; }
    out.push({ prelude, block: css.slice(open + 1, j - 1), text: css.slice(i, j) });
    i = j;
  }
  return out;
}
function extractCss(html, jsText) {
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  if (!styles) fail('未找到 <style>');
  // 词元集合：入选 JS 中出现的全部标识/类名词元（含 tailwind 工具类、#id），外加运行时拼接的类名
  const used = new Set();
  for (const m of jsText.matchAll(/[A-Za-z_][\w-]*/g)) used.add(m[0]);
  for (const m of jsText.matchAll(/[A-Za-z_][\w-]*(?:[./:][\w-]+)+/g)) used.add(m[0]); // tailwind 小数/分数类：w-1.5、left-1/2
  for (const c of ['red', 'amber', 'violet']) for (const w of ['single', 'wide']) used.add('omen-' + c + '-' + w);
  used.add('omen-rose-self'); used.add('omen-gloom-foe');
  const rules = splitCss(styles);
  const keep = []; const anims = new Set(); const vars = new Set();
  // 单个选择器：至少含一个类/ID，且其中所有类/ID 都在词元集合中（避免把旧卡片 DOM 限定规则带入）
  const oneSel = s => { const parts = [...s.matchAll(/[.#]((?:\\.|[\w-])+)/g)].map(m => m[1].replace(/\\(.)/g, '$1')); return parts.length > 0 && parts.every(p => used.has(p)); };
  const splitSel = prelude => { const out = []; let d = 0, cur = ''; for (const ch of prelude) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()).filter(Boolean); };
  // 作用域：所有规则限定在战棋地图视口 [data-rpg-av-scope] 内，旧页面的通用工具类（.hidden/.flex 等）不外溢到战棋 UI
  const SCOPE = '[data-rpg-av-scope]';
  const filterRule = r => { const sels = splitSel(r.prelude).filter(oneSel).map(s => SCOPE + ' ' + s); return sels.length ? sels.join(', ') + ' {' + r.block + '}' : null; };
  const selHit = prelude => splitSel(prelude).some(oneSel);
  const walk = (list, wrapPre) => {
    for (const r of list) {
      if (/^@keyframes/.test(r.prelude)) continue;
      if (/^@media|^@supports/.test(r.prelude)) { const inner = splitCss(r.block).filter(x => selHit(x.prelude)); if (inner.length) { keep.push(r.prelude + ' {\n' + inner.map(filterRule).join('\n') + '\n}'); inner.forEach(x => collect(x.block)); } continue; }
      if (r.prelude.startsWith('@')) continue;
      if (selHit(r.prelude)) { keep.push(filterRule(r)); collect(r.block); }
    }
  };
  const collect = block => {
    for (const m of block.matchAll(/animation(?:-name)?\s*:\s*([^;]+)/g)) for (const t of m[1].split(/[\s,]+/)) if (/^[a-zA-Z_][\w-]*$/.test(t)) anims.add(t);
    for (const m of block.matchAll(/var\((--[\w-]+)/g)) vars.add(m[1]);
  };
  walk(rules);
  for (const m of jsText.matchAll(/animation(?:Name)?\s*[:=]\s*['"`]([^'"`]+)/g)) for (const t of m[1].split(/[\s,]+/)) if (/^[a-zA-Z_][\w-]*$/.test(t)) anims.add(t);
  const kfs = rules.filter(r => /^@keyframes\s+/.test(r.prelude));
  let added = true; const kfKeep = new Map();
  while (added) { added = false; for (const k of kfs) { const name = k.prelude.replace(/^@keyframes\s+/, '').trim(); if (anims.has(name) && !kfKeep.has(name)) { kfKeep.set(name, k.text); collect(k.block); added = true; } } }
  let css = keep.join('\n') + '\n' + [...kfKeep.values()].join('\n');
  // 宿主适配：全屏层改为战棋特效舞台内绝对定位（舞台在 world-root 内随相机变换）
  css = patch(css, /position\s*:\s*fixed/g, 'position:absolute', 6, 'CSS position:fixed → absolute');
  css = patch(css, /\b100vw\b/g, '100%', 1, 'CSS 100vw → 舞台宽');
  css = patch(css, /\b100d?vh\b/g, '100%', 1, 'CSS 100vh/dvh → 舞台高');
  const leftVp = (css.match(/\d+(?:\.\d+)?d?v[wh]\b/g) || []);
  if (leftVp.length) PATCH_LOG.push({ what: 'CSS 残留视口单位(按舞台尺度保留)', hits: leftVp.length });
  return { css, rules: keep.length, keyframes: kfKeep.size, classes: used.size };
}

function build() {
  PATCH_LOG.length = 0;
  // 统一按 LF 解析：core.autocrlf 检出的工作区为 CRLF，仓库对象为 LF；生成物与源指纹不随检出方式变化
  const html = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
  const L = html.split('\n');
  // 0) 资源基址配置（原样沿用 window.__RPG_ASSET_BASE__ 覆盖方式）
  const originIdx = lineIndex(L, l => l.startsWith('const ASSET_ORIGIN = '), 0, 'ASSET_ORIGIN');
  const originLine = L[originIdx].trim();
  if (!/window\.__RPG_ASSET_BASE__/.test(originLine)) fail('ASSET_ORIGIN 不再读取 window.__RPG_ASSET_BASE__');
  // 1) 资源与人物表（原样）
  const heroVoice = topBlock(L, l => l.startsWith('const HERO_VOICE_LINES = {'), 'HERO_VOICE_LINES');
  const pickVoice = topBlock(L, l => l.startsWith('function pickHeroVoice('), 'pickHeroVoice');
  const avatarMap = topBlock(L, l => l.startsWith('const AVATAR_MAP = {'), 'AVATAR_MAP');
  const avatarLines = ['索恩', '埃利奥特', '玛德琳', '弗兰克'].map(n => {
    const hit = avatarMap.text.split('\n').filter(l => l.includes('"' + n + '"'));
    if (hit.length !== 1) fail('AVATAR_MAP 中 ' + n + ' 条目数 ' + hit.length);
    return hit[0].trim().replace(/,?\s*$/, ',');
  });
  // 2) 混音器（含缓存、起音偏移、奇物表、资源 URL 工具）
  const mixA = lineIndex(L, l => l.startsWith('const _fxAudioCache = new Map();'), 0, '混音器缓存起点');
  const mixB = lineIndex(L, l => l.startsWith('window.CombatAudioMixer = CombatAudioMixer;'), mixA, '混音器终点');
  let mixer = L.slice(mixA, mixB).join('\n');
  const applyVol = topBlock(L, l => l.startsWith('function applyAudioVolume('), 'applyAudioVolume');
  const playCustom = topBlock(L, l => l.startsWith('function playCustomAudio('), 'playCustomAudio');
  const audioUrls = topBlock(L, l => l.startsWith('const audioUrls = {'), 'audioUrls', /^\};\s*$/);
  const playSoundA = lineIndex(L, l => l.startsWith('window.playSound = (key'), 0, 'window.playSound');
  const playSound = L.slice(playSoundA, playSoundA + 4).join('\n');
  if (!/^\};$/.test(L[playSoundA + 3])) fail('window.playSound 结构变化');
  const gun = topBlock(L, l => l.startsWith('function playRandomStandardGunshot('), 'playRandomStandardGunshot');
  const shotgun = topBlock(L, l => l.startsWith('function playShotgunSound('), 'playShotgunSound');
  // 3) 粒子引擎与事件总线
  const fxClass = topBlock(L, l => l.startsWith('class CanvasFxEngine {'), 'CanvasFxEngine');
  const events = topBlock(L, l => l.startsWith('const EVENTS = {'), 'EVENTS', /^\};\s*$/);
  const bus = topBlock(L, l => l.startsWith('const CombatEvents = {'), 'CombatEvents', /^\};\s*$/);
  const busOn = L.filter(l => /^CombatEvents\.on\(EVENTS\.(DAMAGE|DODGE)_RESOLVED, CombatAudioDirector\.consume\);/.test(l));
  if (busOn.length !== 2) fail('CombatAudioDirector 事件订阅行数 ' + busOn.length);
  // 4) arcaneVfxModule 闭包
  const arc = sliceArcane(L);

  let soundText = [applyVol.text, playCustom.text, audioUrls.text,
    playSound.replace('window.playSound = (key', 'const playSound = (key'), gun.text, shotgun.text].join('\n\n');

  let fx = fxClass.text;
  fx = patch(fx, "this.canvas = document.getElementById('fx-canvas');", 'this.canvas = null;', 1, 'fxEngine 不复用页面全局 canvas');
  fx = patch(fx, "this.canvas.className = 'fixed inset-0 pointer-events-none z-[99]';", "this.canvas.style.cssText = 'position:absolute; left:0; top:0; pointer-events:none; z-index:99;'; this.canvas.setAttribute('data-tactics-fx', 'engine');", 1, 'fxEngine canvas 舞台内绝对定位');
  fx = patch(fx, 'document.body.appendChild(this.canvas);', '__STAGE.el.appendChild(this.canvas);', 1, 'fxEngine canvas 挂特效舞台');
  fx = patch(fx, "window.addEventListener('resize', () => this.resize());", '__STAGE.onResize(() => this.resize());', 1, 'fxEngine resize 走舞台');
  fx = patch(fx, /window\.innerWidth/g, '__STAGE.w', 1, 'fxEngine 宽'); fx = patch(fx, /window\.innerHeight/g, '__STAGE.h', 1, 'fxEngine 高');
  fx = patch(fx, "if (typeof drawHeroChargeLightningOverlay === 'function') {", 'if (false) { // 蓄力雷电 overlay 未迁移', 1, 'fxEngine 去蓄力 overlay');
  fx = patch(fx, "(typeof hasActiveHeroChargeEffects === 'function' && hasActiveHeroChargeEffects())", 'false', 1, 'fxEngine 去蓄力循环保持');

  let busText = patch(bus.text, 'const _actionToken = combatToken;', 'const _actionToken = combatToken;', 1, '事件总线读宿主 combatToken');

  let mod = arc.body;
  mod = patch(mod, /\.getBoundingClientRect\(\)/g, '[__GBCR]()', 11, '屏幕矩形 → 特效舞台坐标');
  mod = patch(mod, /\b(?:window\.)?innerWidth\b/g, '__STAGE.w', 7, 'innerWidth → 舞台宽');
  mod = patch(mod, /\b(?:window\.)?innerHeight\b/g, '__STAGE.h', 3, 'innerHeight → 舞台高');
  mod = patch(mod, 'document.body.appendChild(', '__STAGE.el.appendChild(', 5, 'body 挂载 → 特效舞台');
  mod = patch(mod, /position\s*:\s*fixed/g, 'position:absolute', 0, 'JS position:fixed → absolute');
  mod = patch(mod, "window.addEventListener('resize', resizeCanvas);", '__STAGE.onResize(resizeCanvas);', 1, 'arcane canvas resize 走舞台');
  mod = patch(mod, "document.getElementById('battle-scene')", '__STAGE.shakeEl()', 2, '舞台震动独立层');
  mod = patch(mod, /window\.(playSound|playRandomStandardGunshot|playShotgunSound|AudioContext|webkitAudioContext)\b/g,
    (m, n) => (n.endsWith('AudioContext') ? m : n), 14, 'window.* 声音函数改为工厂内本地');
  mod = patch(mod, 'arcaneAtmoModule.stopAmbientAudio(true);', '/* 环境氛围模块未迁移（战棋背景声由宿主 ambient 管理） */', 1, '去环境氛围清理');

  const stubText = STUBS.map(n => 'function ' + n + '() { /* 未迁移段：本 Demo 不产生该状态 */ }').join('\n');
  const css = extractCss(html, mod + '\n' + soundText);
  // 入选代码真实引用到的 audioUrls 键（显式预载清单来源；不预载整个素材库）
  const urlKeys = [...audioUrls.text.matchAll(/^\s*'([^']+)'\s*:/gm)].map(m => m[1]);
  if (urlKeys.length < 40) fail('audioUrls 键数异常: ' + urlKeys.length);
  const refText = mod + '\n' + gun.text + '\n' + shotgun.text + '\n' + mixer;
  const usedKeys = urlKeys.filter(k => refText.includes("'" + k + "'") || refText.includes('"' + k + '"') || refText.includes('audioUrls.' + k));

  const header = [
    '// ==========================================',
    '// 由 tactics/tools/extract-rpg-av.cjs 自动生成，请勿手改。',
    '// 源: index.html  sha256=' + sha(html),
    '// arcaneVfxModule 行区间(源 ' + arc.span.join('–') + '): ' + arc.ranges.map(r => r.join('–')).join(', '),
    '// 入选语句 ' + arc.count + ' 段 / ' + arc.lines + ' 行；入口: ' + ENTRIES.join(', '),
    '// 显式存根: ' + STUBS.join(', '),
    '// 宿主适配补丁: ' + PATCH_LOG.map(p => p.what + '×' + p.hits).join('; '),
    '// ==========================================',
  ].join('\n');

  const js = header + `
/* eslint-disable */
// ---- 纯数据导出（原样，供宿主在工厂创建前解析人物头像/语音与预载清单） ----
export const RPG_AVATAR_MAP = {
  ${avatarLines.join('\n  ')}
};
export ${heroVoice.text.replace('const HERO_VOICE_LINES', 'const RPG_HERO_VOICE_LINES')}
export const RPG_USED_AUDIO_KEYS = ${JSON.stringify(usedKeys)};

export function createRpgAv(host) {
  // ---- 宿主注入（战棋舞台、单位视图、代际令牌） ----
  const __STAGE = host.stage;              // { el, w, h, onResize(fn), shakeEl() }
  const __GBCR = host.rectSymbol;          // Element.prototype[__GBCR]() → 舞台坐标矩形
  ${originLine}
  const ASSET_BASE = ASSET_ORIGIN;
  const HERO_VOICE_BASE = ASSET_BASE;
  let combatToken = host.initialToken;
  let _pipelineFrozen = false;
  let heroesData = [], enemiesData = [];
  const WEBM_FX_REGISTRY = {};             // WebM 特效登记未迁移：本 Demo 技能均无 fxTag 视频
  const _fxVideoBlobCache = new Map();
  function playWebMFX(file) { host.report('missing-webm', String(file)); return Promise.resolve(false); }
  const getEntitySpriteDom = e => host.spriteOf(e);
  const isHeroSideEntity = e => host.isHero(e);
  const isCombatActive = e => host.isActive(e);

  // ---- 人物与语音表（原样） ----
  ${heroVoice.text}
  ${pickVoice.text}
  const AVATAR_MAP = {
    ${avatarLines.join('\n    ')}
  };

  // ---- CombatAudioMixer 及采样工具（原样） ----
${mixer}

${soundText}

  // ---- 粒子引擎（原样，仅换挂载层） ----
${fx}
  const fxEngine = new CanvasFxEngine();

  // ---- 事件总线（原样） ----
${events.text}
${busText}

  // ---- arcaneVfxModule 入选段（原样 + 坐标/挂载补丁） ----
  const arcane = (function () {
${stubText}
${mod}
    return { playEnemyWindup, playAttackIdentityFx, playArcaneProjectile, playHitFeedback, classifyHit, syncHitBar,
      CombatAudioDirector, clearHitFeedback, warmIdentitySample, playArsenicShot, clearArcaneFx };
  })();
${busOn.map(l => l.replace('CombatAudioDirector.consume', 'arcane.CombatAudioDirector.consume')).join('\n')}

  return Object.assign({}, arcane, {
    CombatAudioMixer, audioUrls, playSound, playCustomAudio, HERO_VOICE_LINES, pickHeroVoice, AVATAR_MAP, fxEngine,
    ASSET_BASE, HERO_VOICE_BASE, itemFxAssetUrl,
    setToken(t) { combatToken = t; },
    getToken() { return combatToken; },
    setRoster(h, e) { heroesData = h; enemiesData = e; },
  });
}
`;
  return { js, css: '/* 由 extract-rpg-av.cjs 自动生成，请勿手改。源 sha256=' + sha(html) + ' */\n' + css.css, report: {
    source: SRC, sourceSha: sha(html), arcaneRanges: arc.ranges, arcaneSegments: arc.count, arcaneLines: arc.lines,
    cssRules: css.rules, cssKeyframes: css.keyframes, patches: PATCH_LOG.slice(), jsBytes: Buffer.byteLength(js),
    usedAudioKeys: usedKeys.length,
  } };
}

if (require.main === module) {
  const out = build();
  const check = process.argv.includes('--check');
  const files = { 'rpg-av.mjs': out.js, 'rpg-av.css': out.css };
  if (check) {
    const stale = Object.entries(files).filter(([n, t]) => !fs.existsSync(path.join(OUT, n)) || fs.readFileSync(path.join(OUT, n), 'utf8') !== t).map(([n]) => n);
    if (stale.length) { console.error('[extract-rpg-av] 产物过期: ' + stale.join(', ')); process.exit(1); }
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    for (const [n, t] of Object.entries(files)) fs.writeFileSync(path.join(OUT, n), t);
  }
  console.log(JSON.stringify(Object.assign({ check }, out.report, { patches: out.report.patches.length })));
}
module.exports = { build, splitCss };
