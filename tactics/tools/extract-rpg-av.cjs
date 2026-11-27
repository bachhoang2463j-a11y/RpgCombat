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
  'clearArcaneFx', 'syncStatusLayers', 'clearStatusLayers', 'playStatusTickFx',
  'syncVariantState', 'clearVariantState', 'playVariantTriggerFx', 'isEntityVariantLocked',
  'playSummonEnter', 'playSummonExit', 'playSummonGuard', 'clearSummonState',
  'playLingFeng',
  'playIsis', 'playFeiShaHuaJia', 'playXieYanKey', 'playHarmonyShelter', 'playSilenceDomain', 'playShatterResonance',
  'playZheYingBu', 'playStrangeConch',
  'playMeleeGroup', 'playRangedGroup', 'playSpellGroup',
  'playRescueGrit', 'playRescueAvoidFatal', 'clearRescueState',
  'playVariantResistFx', 'playCounterAttackL1',
  'playSelfDestructWindup', 'playSelfDestructBurst', 'playSelfDestructInterrupt', 'clearSelfDestructState', 'syncSelfDestructWarning',
  'setIdentitySfx', 'setVariantSfx', 'setStatusSfx', 'setSelfDestructSfx',
];
// 敌方兜底群攻 playMeleeGroup/RangedGroup/SpellGroup：战棋只传真实受击目标，portraitFrame 按各目标棋子取帧（不走全队/结界分支）。
// 所有状态与救援段均已进入真实提取闭包，不再使用空存根
const STUBS = [];
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
    sg.decl = !sg.head ? [] : declNames(sg.head);
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
  for (const m of jsText.matchAll(/(?:[a-z]+:)*-?[A-Za-z_][\w-]*-\[[^\]\s"'`]+\](?:\/\d+)?/g)) used.add(m[0]); // tailwind 任意值类：z-[200]、sm:text-[8rem]
  for (const m of jsText.matchAll(/(?<![\w-])-[a-z][\w-]*\d/g)) used.add(m[0]); // tailwind 负值类：-mt-3
  for (const c of ['red', 'amber', 'violet']) for (const w of ['single', 'wide']) used.add('omen-' + c + '-' + w);
  used.add('omen-rose-self'); used.add('omen-gloom-foe');
  const rules = splitCss(styles);
  const keep = []; const anims = new Set(); const vars = new Set();
  // 单个选择器：至少含一个类/ID，且其中所有类/ID 都在词元集合中（避免把旧卡片 DOM 限定规则带入）
  const unesc = p => p.replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, '$1');
  const oneSel = s => { const parts = [...s.matchAll(/[.#]((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w-])+)/g)].map(m => unesc(m[1])); return parts.length > 0 && parts.every(p => used.has(p)); };
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
  // 模板字符串内联 style 的 animation 简写（击杀特写等）：每个逗号分段的首词为动画名
  for (const m of jsText.matchAll(/animation\s*:\s*([^;"`]+)/g)) for (const part of m[1].split(',')) { const t = part.trim().split(/\s+/)[0]; if (/^[a-zA-Z_][\w-]*$/.test(t)) anims.add(t); }
  const kfs = rules.filter(r => /^@keyframes\s+/.test(r.prelude));
  let added = true; const kfKeep = new Map();
  while (added) { added = false; for (const k of kfs) { const name = k.prelude.replace(/^@keyframes\s+/, '').trim(); if (anims.has(name) && !kfKeep.has(name)) { kfKeep.set(name, k.text); collect(k.block); added = true; } } }
  let css = keep.join('\n');
  // 宿主适配：全屏层改为战棋特效舞台内绝对定位（舞台在 world-root 内随相机变换）；
  // 关键帧不改写：击杀特写/Cut-in 位于 iframe 屏幕宿主，其 translate(±100vw) 等以视口为基准属原版语义
  css = patch(css, /position\s*:\s*fixed/g, 'position:absolute', 13, 'CSS position:fixed → absolute');
  css = patch(css, /\b100vw\b/g, '100%', 1, 'CSS 100vw → 舞台宽');
  css = patch(css, /\b100d?vh\b/g, '100%', 1, 'CSS 100vh/dvh → 舞台高');
  css += '\n' + [...kfKeep.values()].join('\n');
  const leftVp = (css.match(/\d+(?:\.\d+)?d?v[wh]\b/g) || []);
  if (leftVp.length) PATCH_LOG.push({ what: 'CSS 残留视口单位(按舞台尺度保留)', hits: leftVp.length });
  return { css, rules: keep.length, keyframes: kfKeep.size, classes: used.size };
}

function build() {
  PATCH_LOG.length = 0;
  // 统一按 LF 解析：core.autocrlf 检出的工作区为 CRLF，仓库对象为 LF；生成物与源指纹不随检出方式变化
  const html = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
  const L = html.split('\n');
  // 强力反击专属动效及其两个显式粒子依赖；不扩展到相邻普通重击段。
  const powerBurst = topBlock(L, l => l.startsWith('function spawnPowerBurst('), 'spawnPowerBurst');
  const chargeParticles = topBlock(L, l => l.startsWith('window.spawnChargeUpParticles = function('), 'spawnChargeUpParticles', /^};\s*$/);
  const powerCounter = topBlock(L, l => l.startsWith('async function playPowerCounterEffect('), 'playPowerCounterEffect');
  const powerSoundLine = L.filter(l => l.startsWith('const POWER_COUNTER_SOUND_URL = '));
  if (powerSoundLine.length !== 1) fail('POWER_COUNTER_SOUND_URL 定义数 ' + powerSoundLine.length);
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
  const gunText = patch(gun.text,
    "const chosen = candidates[Math.floor(Math.random() * candidates.length)];",
    "const previous = playRandomStandardGunshot.last;\n    const available = candidates.filter(key => key !== previous);\n    const chosen = available[Math.floor(Math.random() * available.length)];\n    playRandomStandardGunshot.last = chosen;", 1, '枪击采样相邻去重') + '\nplayRandomStandardGunshot.last = null;';
  const shotgun = topBlock(L, l => l.startsWith('function playShotgunSound('), 'playShotgunSound');
  // 2b) 英雄击杀特写 / 敌方满充能大招 Cut-in（回合制顶层原版函数，原样；只改挂载到 iframe 内屏幕宿主与可清理计时）
  const execAnim = topBlock(L, l => l.startsWith('async function playExecutionAnimation('), 'playExecutionAnimation');
  const cutin = topBlock(L, l => l.startsWith('async function playEnemyUltimateCutin('), 'playEnemyUltimateCutin');
  // 召唤三瞬引用的回合制顶层集合（arcane 模块外，原样带入）
  const summonPending = topBlock(L, l => l.startsWith('const summonEnterPending = new Set();'), 'summonEnterPending');
  // 2b') 造雾术 / 高阶召唤术全屏 SVG 构件（回合制顶层原版函数，原样；挂载与对侧缠绕由战棋演出条目按视口层承担）
  const oneLine = (start, what) => {
    const hit = L.filter(l => l.startsWith(start));
    if (hit.length !== 1) fail(what + ' 定义数 ' + hit.length);
    return hit[0];
  };
  const screenSvg = [
    oneLine('const RLYEH_FOG_CLOUD_URL = ', 'RLYEH_FOG_CLOUD_URL'),
    oneLine('function getEldritchAudioContext() {', 'getEldritchAudioContext'),
    topBlock(L, l => l.startsWith('function playEldritchWhisper('), 'playEldritchWhisper').text,
    topBlock(L, l => l.startsWith('function buildRlyehSedimentFxHtml('), 'buildRlyehSedimentFxHtml').text,
    topBlock(L, l => l.startsWith('function buildTitanGazeFxHtml('), 'buildTitanGazeFxHtml').text,
  ].join('\n');
  // 原版 _spawnFullscreenSvgFx 的震屏类与对侧缠绕动画名（条目侧施加，CSS 需随包提取）
  const screenSvgCssRefs = "fog-shake-std san-shake-dread; animation: target-fog-shroud; animation: target-enshrouded-wobble;";
  let moments = [execAnim.text, cutin.text].join('\n\n');
  moments = patch(moments, '                        <div class="absolute top-1 left-2 text-[9px] font-bold text-amber-400 tracking-wider">档案: ${hero.name}</div>\n', '', 1, '远程击杀隐藏我方名称');
  moments = patch(moments, 'document.body.appendChild(overlay);', '__SCREEN().appendChild(overlay); __MOMENTS.add(overlay);', 2, '特写挂屏幕宿主');
  moments = patch(moments, 'overlay.remove();', 'overlay.remove(); __MOMENTS.delete(overlay);', 2, '特写收尾登记');
  moments = patch(moments, "document.getElementById('battle-scene')", '__STAGE.shakeEl()', 1, '特写震屏走舞台震动层');
  moments = patch(moments, /\bsetTimeout\(/g, '__momentTimeout(', 6, '特写计时可随重开清理');
  // 2c) 战场环境氛围音（仅提取原版粉红噪/LFO 合成引擎，不依赖 #battle-scene DOM）
  const atmoPink = topBlock(L, l => l.startsWith('    function getPinkNoise(ctx)'), 'getPinkNoise', /^    \}\s*$/);
  const atmoStop = topBlock(L, l => l.startsWith('    function stopAmbientAudio('), 'stopAmbientAudio', /^    \}\s*$/);
  let atmoSync = topBlock(L, l => l.startsWith('    function syncAmbientAudio('), 'syncAmbientAudio', /^    \}\s*$/);
  const atmoSyncText = patch(atmoSync.text, "if (!state.ambientSound || state.theme === 'baseline' || !state.rootEl?.isConnected)", "if (!state.ambientSound || state.theme === 'baseline')", 1, '环境音脱离#battle-scene DOM');
  const atmoAudioCode = `  const atmoState = { theme: 'baseline', ambientSound: false, pinkNoiseBuf: null, audioSession: null };
  const atmoAudio = (function () {
    const state = atmoState;
${atmoPink.text}
${atmoStop.text}
${atmoSyncText}
    return {
      setTheme(theme) { state.theme = ['baseline', 'rain', 'mist', 'ruins', 'eldritch'].includes(theme) ? theme : 'baseline'; syncAmbientAudio(); return state.theme; },
      getTheme() { return state.theme; },
      setAmbientSound(on) { state.ambientSound = !!on; syncAmbientAudio(); return state.ambientSound; },
      getAmbientSound() { return state.ambientSound; },
      stop(immediate = false) { stopAmbientAudio(immediate); },
    };
  })();`;
  // 3) 粒子引擎与事件总线
  const fxClass = topBlock(L, l => l.startsWith('class CanvasFxEngine {'), 'CanvasFxEngine');
  const supportSvg = topBlock(L, l => l.startsWith('function playSVGEffect('), 'playSVGEffect');
  const supportBranches = supportSvg.text.split('\n').filter(l => /^    else if \(type === '(heal|buff|debuff|shield|mpHeal|taunt)'\)/.test(l));
  if (supportBranches.length !== 6) fail('通用辅助 SVG 分支数变化');
  const supportParticles = topBlock(L, l => l.startsWith('function spawnHealParticles('), 'spawnHealParticles');
  const support = `
${patch(supportParticles.text, 'function spawnHealParticles(x, y, colorTheme', 'function spawnHealParticles(addParticle, x, y, colorTheme', 1, '辅助粒子注入所属句柄').replace('fxEngine.addParticle({', 'addParticle({')}
  const supportHandles = new Set();
  function playGenericSupportFx(entity, type, { soundKey = null, volume = 0.5, onImpact } = {}) {
    const theme = { heal:'green', buff:'gold', shield:'shield', mpHeal:'blue' }[type];
    const dom = getEntitySpriteDom(entity);
    if (!dom) { onImpact?.(); return null; }
    const rect = dom[__GBCR]();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const svgWrapper = document.createElement('div');
    svgWrapper.style.cssText = 'position:absolute;pointer-events:none;z-index:95;left:' + x + 'px;top:' + y + 'px;';
    let innerHTML, duration;
${supportBranches.join('\n').replace('else if', 'if')}
    duration /= 1.5;
    svgWrapper.style.animationDuration = duration + 'ms';
    svgWrapper.innerHTML = innerHTML;
    svgWrapper.firstElementChild.style.position = 'absolute';
    __STAGE.el.appendChild(svgWrapper);
    const particles = new Set();
    if (theme) spawnHealParticles(p => { p.life /= 1.5; p.vx *= 1.5; p.vy *= 1.5; particles.add(p); fxEngine.addParticle(p); }, x, y, theme);
    const cue = soundKey ? playSound(soundKey, volume) : null;
    const onFinish = new Set();
    const finish = ok => {
      supportHandles.delete(handle);
      onFinish.forEach(fn => fn(ok));
      onFinish.clear();
    };
    const totalMs = 1100 / 1.5;
    const handle = { doneAt: Date.now() + totalMs, onFinish, cancel() {
      clearTimeout(svgTimer);
      clearTimeout(endTimer);
      svgWrapper.remove();
      fxEngine.particles = fxEngine.particles.filter(p => !particles.has(p));
      cue?.stop?.();
      finish(false);
    } };
    const svgTimer = setTimeout(() => svgWrapper.remove(), duration);
    const endTimer = setTimeout(() => finish(true), totalMs);
    supportHandles.add(handle);
    onImpact?.();
    return handle;
  }
`;
  const events = topBlock(L, l => l.startsWith('const EVENTS = {'), 'EVENTS', /^\};\s*$/);
  const bus = topBlock(L, l => l.startsWith('const CombatEvents = {'), 'CombatEvents', /^\};\s*$/);
  const busOn = L.filter(l => /^CombatEvents\.on\(EVENTS\.(DAMAGE|DODGE)_RESOLVED, CombatAudioDirector\.consume\);/.test(l));
  if (busOn.length !== 2) fail('CombatAudioDirector 事件订阅行数 ' + busOn.length);
  // 4) arcaneVfxModule 闭包
  const arc = sliceArcane(L);

  let soundText = [applyVol.text, playCustom.text, audioUrls.text,
    playSound.replace('window.playSound = (key', 'const playSound = (key'), gunText, shotgun.text].join('\n\n');

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
  mod = patch(mod, 'return { dx: [0, 8, -10, 12, -6][k % 5], dy: -Math.min(k, 4) * 24 };',
    'return { dx: [0, 12, 24, 36, 48][k % 5], dy: [0, -44, 44, -88, 88][k % 5] };', 1, '连续数字上下错位保留可读');
  const hitAnchorStart = mod.indexOf('    function hitAnchor(dom, slot) {');
  const hitAnchorEnd = mod.indexOf('    function hitNumEl(', hitAnchorStart);
  if (hitAnchorStart < 0 || hitAnchorEnd < 0) fail('受击数字锚点结构变化');
  mod = patch(mod, mod.slice(hitAnchorStart, hitAnchorEnd), `    const HIT_NUMBER_THEMES = {
        '钝击': ['钝击', '#fbbf24'], '切割': ['切割', '#fb7185'], '枪击': ['枪击', '#f8fafc'], '霰弹': ['霰弹', '#fed7aa'],
        '火焰': ['火焰', '#fb923c'], '圣光': ['圣光', '#fef08a'], '雷电': ['雷电', '#c4b5fd'], '水流': ['水流', '#67e8f9'],
        '冰霜': ['冰霜', '#bae6fd'], '诅咒': ['诅咒', '#d8b4fe'], '近战': ['近战', '#fda4af'], '远程': ['远程', '#f8fafc'], '法术': ['法术', '#a5b4fc']
    };
    function hitNumberScale(dom) { return host.hitNumberScale ? host.hitNumberScale(dom) : 1; }
    function prepareHitNumbers(layer, result, dom) {
        const theme = HIT_NUMBER_THEMES[result.damageCategory] || HIT_NUMBER_THEMES[result.damageType] || ['伤害', '#f8fafc'];
        const scale = hitNumberScale(dom);
        layer.setAttribute('data-hit-type', theme[0] + (result.isPierce ? '·穿透' : ''));
        layer.style.setProperty('--hit-scale', scale);
        layer.style.setProperty('--hit-color', theme[1]);
        return scale;
    }
    function animateHitNumber(el, frames, options, scale) {
        return el.animate(frames.map(f => ({ ...f, transform: f.transform.replace(/(-?\\d+(?:\\.\\d+)?)px/g, (_, n) => (Number(n) * scale) + 'px') })), options);
    }
    function hitAnchor(dom, slot) {
        const r = entityVisualRect(dom) || ctr(dom), c = ctr(dom), scale = hitNumberScale(dom);
        return { x: r.right + (8 + slot.dx) * scale, y: r.top + (-4 + slot.dy) * scale, c };
    }
`, 1, '受击数字世界锚点与类型格式');
  mod = patch(mod, 'el.className = cls; el.textContent = text;', "el.className = cls; el.textContent = text;\n        el.setAttribute('data-hit-type', layer.getAttribute('data-hit-type') || '');", 2, '受击数字类型标记');
  mod = patch(mod, "TN = 'translate(-100%,-18%) ', TT = 'translate(-100%,-50%) '", "TN = 'translate(0,-18%) ', TT = 'translate(0,-50%) '", 1, '受击数字贴身右侧对齐');
  mod = patch(mod, "g.innerHTML = dom.innerHTML.replace(/ id=\"[^\"]*\"/g, '');", "g.innerHTML = dom.innerHTML.replace(/ id=\"[^\"]*\"/g, '');\n        g.style.setProperty('--d', r.width + 'px');", 1, '闪避残影保留主体尺度');
  const visualStart = mod.indexOf('    function hitVisual(layer, r, h, anims, timers) {');
  const visualEnd = mod.indexOf('    // ===== 受击三档', visualStart);
  if (visualStart < 0 || visualEnd < 0) fail('受击视觉结构变化');
  const originalVisual = mod.slice(visualStart, visualEnd);
  let visual = patch(originalVisual, 'const dom = domOf(r.targetId); if (!dom) return;', 'const dom = domOf(r.targetId); if (!dom) return;\n        const scale = prepareHitNumbers(layer, r, dom);', 1, '受击数字宿主缩放');
  visual = patch(visual, /anims\.push\((el|b|t|s)\.animate\(([^\n]+)\)\);/g, (_, el, args) => 'anims.push(animateHitNumber(' + el + ', ' + args + ', scale));', 8, '受击数字保持原版时序与远景可读');
  visual = patch(visual, 'const fs = [0, 24, 27, 32][h.tier];', 'const fs = [0, 24, 27, 32][h.tier] * scale;', 1, '受击数字分层间距');
  visual = patch(visual, 'p.y - 22)', 'p.y - 22 * scale)', 1, '破盾词牌间距');
  visual = patch(visual, 'p.y - fs * 0.25 - 12)', 'p.y - fs * 0.25 - 12 * scale)', 1, '暴击词牌间距');
  visual = patch(visual, 'p.y + fs * 0.92 + 5;', 'p.y + fs * 1.15 + 14 * scale;', 1, '护盾副数字间距');
  visual = patch(visual, 'sy + 20)', 'sy + 28 * scale)', 1, '混合破盾词牌间距');
  mod = patch(mod, originalVisual, visual, 1, '受击视觉数字适配');
  // 战棋提供规则区域与纯发射锚点，保留原版目标接触回调。
  mod = patch(mod, "function playSingleShotgun(caster, target, outcome = 'hit', onImpact)",
    "function playSingleShotgun(caster, target, outcome = 'hit', onImpact, suppressImpact)", 1, '战棋攻击身份适配');
  mod = patch(mod, "            if (onImpact) onImpact(target, { subtype: '霰弹', scope: 'single', outcome, point: baseCenter, beatMs: T.impactMs });",
    "            if (onImpact) onImpact(target, { subtype: '霰弹', scope: 'single', outcome, point: baseCenter, beatMs: T.impactMs });\n            if (suppressImpact) return;", 1, '战棋攻击身份适配');
  mod = patch(mod, "outcomes = null, onImpact = null, audioContext = null } = {})",
    "outcomes = null, onImpact = null, audioContext = null, areaBounds = null, suppressImpact = false } = {})", 1, '战棋攻击身份适配');
  mod = patch(mod, "return playSingleShotgun(caster, first, outcome, onImpact);",
    "return playSingleShotgun(caster, first, outcome, onImpact, suppressImpact);", 1, '战棋攻击身份适配');
  mod = patch(mod, "function playAoeExplosion(caster, targets, outcomes, onImpact)",
    "function playAoeExplosion(caster, targets, outcomes, onImpact, areaBounds)", 1, '战棋攻击身份适配');
  mod = patch(mod, "return playAoeExplosion(caster, list, outcomes, onImpact);",
    "return playAoeExplosion(caster, list, outcomes, onImpact, areaBounds);", 1, '战棋攻击身份适配');
  mod = patch(mod, "function playAoeFire(caster, targets, outcomes, onImpact)",
    "function playAoeFire(caster, targets, outcomes, onImpact, areaBounds)", 1, '战棋攻击身份适配');
  mod = patch(mod, "return playAoeFire(caster, list, outcomes, onImpact);",
    "return playAoeFire(caster, list, outcomes, onImpact, areaBounds);", 1, '战棋攻击身份适配');
  mod = patch(mod, "function playAoeFire(caster, targets, outcomes, onImpact, areaBounds) {\n        const ctx = prepareAoeEntries(caster, targets, outcomes);",
    "function playAoeFire(caster, targets, outcomes, onImpact, areaBounds) {\n        const ctx = prepareAoeEntries(caster, targets, outcomes, areaBounds);", 1, '战棋攻击身份适配');
  mod = patch(mod, "function playAoeFrost(caster, targets, outcomes, onImpact)",
    "function playAoeFrost(caster, targets, outcomes, onImpact, areaBounds)", 1, '战棋攻击身份适配');
  mod = patch(mod, "return playAoeFrost(caster, list, outcomes, onImpact);",
    "return playAoeFrost(caster, list, outcomes, onImpact, areaBounds);", 1, '战棋攻击身份适配');
  mod = patch(mod, "function playAoeFrost(caster, targets, outcomes, onImpact, areaBounds) {\n        const ctx = prepareAoeEntries(caster, targets, outcomes);",
    "function playAoeFrost(caster, targets, outcomes, onImpact, areaBounds) {\n        const ctx = prepareAoeEntries(caster, targets, outcomes, areaBounds);", 1, '战棋攻击身份适配');
  mod = patch(mod, "function playAoeThunder(caster, targets, outcomes, onImpact)",
    "function playAoeThunder(caster, targets, outcomes, onImpact, areaBounds)", 1, '战棋攻击身份适配');
  mod = patch(mod, "return playAoeThunder(caster, list, outcomes, onImpact);",
    "return playAoeThunder(caster, list, outcomes, onImpact, areaBounds);", 1, '战棋攻击身份适配');
  mod = patch(mod, "if (!fromRect || !entries.length) return null;\n\n        const T = IDENTITY_TIMINGS.aoeExplosion;",
    "if (!fromRect || (!entries.length && !areaBounds)) return null;\n\n        const T = IDENTITY_TIMINGS.aoeExplosion;", 1, '战棋攻击身份适配');
  mod = patch(mod, "if (!fromRect || !entries.length) return null;\n\n        const T = IDENTITY_TIMINGS.aoeThunder;",
    "if (!fromRect || (!entries.length && !areaBounds)) return null;\n\n        const T = IDENTITY_TIMINGS.aoeThunder;", 1, '战棋攻击身份适配');
  mod = patch(mod, "const uid = ++S.uid;\n        const area = unionRect(entries.map(e => e.rect.dom)) || {",
    "const uid = ++S.uid;\n        const area = areaBounds || unionRect(entries.map(e => e.rect.dom)) || {", 1, '战棋攻击身份适配');
  mod = patch(mod, "const owner = identityRun(T.totalMs, 1);\n        const area = unionRect(entries.map(e => e.rect.dom)) || {",
    "const owner = identityRun(T.totalMs, 1);\n        const area = areaBounds || unionRect(entries.map(e => e.rect.dom)) || {", 1, '战棋攻击身份适配');
  mod = patch(mod, "const stageW = Math.max(area.w * 1.42, 320), stageH = Math.max(area.h * 1.9, 220);",
    "const stageW = areaBounds ? area.w : Math.max(area.w * 1.42, 320), stageH = areaBounds ? area.h : Math.max(area.h * 1.9, 220);", 1, '战棋攻击身份适配');
  mod = patch(mod, "const hub = {\n            x: area.x",
    "const hub = areaBounds || {\n            x: area.x", 1, '战棋攻击身份适配');
  mod = patch(mod, "const p0 = { x: n.dest.x + rnd(-24, 24), y: n.dest.y + rnd(-20, 20) };",
    "const dest = n ? n.dest : hub;\n                        const p0 = { x: dest.x + rnd(-24, 24), y: dest.y + rnd(-20, 20) };", 1, '战棋攻击身份适配');
  mod = patch(mod, "function prepareAoeEntries(caster, targets, outcomes)",
    "function prepareAoeEntries(caster, targets, outcomes, areaBounds)", 1, '战棋攻击身份适配');
  mod = patch(mod, "if (!fromRect || !raw.length) return null;\n        const area = unionRect(raw.map(e => e.rect.dom))",
    "if (!fromRect || (!raw.length && !areaBounds)) return null;\n        const area = areaBounds || unionRect(raw.map(e => e.rect.dom))", 1, '战棋攻击身份适配');
  mod = patch(mod, "stageW: Math.max(area.w * 1.36, 280), stageH: Math.max(area.h * 1.48, 168)",
    "stageW: areaBounds ? area.w : Math.max(area.w * 1.36, 280), stageH: areaBounds ? area.h : Math.max(area.h * 1.48, 168)", 1, '战棋攻击身份适配');
  mod = patch(mod, "const waveW = Math.max(stageW * 1.15, 360), waveH = Math.max(stageH * 0.92, 136);",
    "const waveW = areaBounds ? stageW : Math.max(stageW * 1.15, 360), waveH = areaBounds ? stageH : Math.max(stageH * 0.92, 136);", 1, '战棋攻击身份适配');
  mod = patch(mod, "${Math.max(88, stageH * 0.68)}px;transform:translate(-50%,-50%);",
    "${areaBounds ? stageH : Math.max(88, stageH * 0.68)}px;transform:translate(-50%,-50%);", 1, '战棋攻击身份适配');
  // 战棋顿帧恒为 0：重击（三档）数字不再等原版 60ms 定帧，与条目命中拍点同帧弹出
  mod = patch(mod, 'const stopMs = h.tier === 3 ? HIT_STOP_MS : 0;', 'const stopMs = 0;', 1, '重击数字不等定帧');
  // 蝎眼钥匙：原版裂隙钉在屏幕中心；战棋舞台=整张地图，改为钉在召唤落点（at，舞台坐标），粒子半径沿用原版基准视口
  mod = patch(mod, 'function playXieYanKey(caster, targets, isReaction = false) {', 'function playXieYanKey(caster, targets, isReaction = false, at = null) {', 1, '蝎眼钥匙落点参数');
  mod = patch(mod, 'const vw = window.innerWidth, vh = window.innerHeight;\n        const cX = vw * 0.5, cY = vh * 0.46;',
    'const vw = 1280, vh = 720;\n        const cX = at ? at.x : __STAGE.w * 0.5, cY = at ? at.y : __STAGE.h * 0.46;', 1, '蝎眼钥匙裂隙钉召唤落点');
  mod = patch(mod, '<div class="arcane-marcher-rift-stage is-vertical">', '<div class="arcane-marcher-rift-stage is-vertical" style="left:${cX}px; top:${cY}px;">', 1, '蝎眼钥匙裂隙舞台定位');
  // 折影步：战棋有真实落点，去掉原版卡片横移 -90px 再回位（由战棋滑步演出真实位移）；涟漪落在 dodge(true, land) 给的落点，残影保留圆形棋子尺度
  mod = patch(mod, /anim = el\.animate\(\[\s*\{ transform: 'translateX\(0px\) skewX\(0deg\)'[\s\S]*?\], \{ duration: 1750 \}\);/, '/* 战棋：真实位移由宿主滑步演出 */', 1, '折影步去卡片横移');
  mod = patch(mod, 'handle.dodge = (success) => {', 'handle.dodge = (success, land = null) => {', 1, '折影步落点参数');
  mod = patch(mod, 'left:${r.left + r.width / 2 - 90}px; top:${r.bottom - 8}px;', 'left:${land ? land.x : r.left + r.width / 2 - 90}px; top:${land ? land.y : r.bottom - 8}px;', 1, '折影步落点涟漪');
  mod = patch(mod, 'opacity:${0.75 - i * 0.18}; filter: grayscale(1)', '--d:${r.width}px; border-radius:50%; opacity:${0.75 - i * 0.18}; filter: grayscale(1)', 1, '折影步残影保留圆形尺度');
  // 奇异海螺：战棋顿帧恒为 0
  mod = patch(mod, 'after(420, () => { if (token === combatToken) fxEngine.hitStop = 80; });', '', 1, '奇异海螺去顿帧');
  // 谐律之庇：原版音叉悬在屏幕上方正中；战棋改悬在受益者包围盒上方（原版约 0.38 屏高 ≈ 260px）
  mod = patch(mod, 'const forkPos = { x: window.innerWidth * 0.5, y: Math.max(150, window.innerHeight * 0.34) };',
    'const forkPos = { x: box.x, y: box.y - 260 };', 1, '谐律之庇音叉悬于受益者上方');
  mod = patch(mod, /\.getBoundingClientRect\(\)/g, '[__GBCR]()', 14, '屏幕矩形 → 特效舞台坐标');
  mod = patch(mod, /\b(?:window\.)?innerWidth\b/g, '__STAGE.w', 22, 'innerWidth → 舞台宽');
  mod = patch(mod, /\b(?:window\.)?innerHeight\b/g, '__STAGE.h', 15, 'innerHeight → 舞台高');
  mod = patch(mod, 'document.body.appendChild(', '__STAGE.el.appendChild(', 6, 'body 挂载 → 特效舞台');
  mod = patch(mod, /position\s*:\s*fixed/g, 'position:absolute', 2, 'JS position:fixed → absolute');
  mod = patch(mod, "window.addEventListener('resize', resizeCanvas);", '__STAGE.onResize(resizeCanvas);', 1, 'arcane canvas resize 走舞台');
  mod = patch(mod, "document.getElementById('battle-scene')", '__STAGE.shakeEl()', 3, '舞台震动独立层');
  mod = patch(mod, /window\.(playSound|playRandomStandardGunshot|playShotgunSound|AudioContext|webkitAudioContext)\b/g,
    (m, n) => (n.endsWith('AudioContext') ? m : n), 14, 'window.* 声音函数改为工厂内本地');
  mod = patch(mod, 'arcaneAtmoModule.stopAmbientAudio(true);', 'atmoAudio.stop(true);', 1, '环境氛围音随清场停止');
  mod = patch(mod, 'window.playVariantResistFx = playVariantResistFx;', '', 1, '去抗性全局挂载');
  mod = patch(mod, "return dom.querySelector('.portrait')", "return dom.querySelector('.t-unit-avatar') || dom.querySelector('.t-unit-medal') || dom.querySelector('.portrait')", 1, '毅力血幕挂圆形棋子内框');
  mod = patch(mod, 'ghost.innerHTML = cloneVisualOnly(dom);', "ghost.innerHTML = cloneVisualOnly(dom);\n        ghost.style.setProperty('--d', rect.w + 'px'); ghost.style.borderRadius = '50%';", 1, '致命回避残影保留圆形尺度');
  mod = patch(mod, 'g.innerHTML = fromDom.innerHTML.replace(/ id="[^"]*"/g, \'\');', "g.innerHTML = fromDom.innerHTML.replace(/ id=\"[^\"]*\"/g, '');\n                    g.style.setProperty('--d', fromRect.w + 'px'); g.style.borderRadius = '50%';", 1, '反击残影保留圆形尺度');
  // 灵风术：原版法阵按整屏 vmax 取尺寸、透视原点在容器中心；战棋舞台=整张地图且随镜头缩放，
  // 改为以施术者头像为尺度（法阵≈4.2 倍头像、羽毛环绕≈3.5/2.1 倍），透视原点钉在法阵自身，收尾羽翼同尺度
  mod = patch(mod, 'const c = ctr(el), vmax = Math.max(__STAGE.w, __STAGE.h), SZ = vmax * 0.55;',
    'const c = ctr(el), vmax = c.h * 7, SZ = c.h * 4.2;', 1, '灵风术法阵按头像尺度');
  mod = patch(mod, 'const rose = fsLayer(`<div style="position:absolute; inset:0; perspective:900px;">',
    'const rose = fsLayer(`<div style="position:absolute; inset:0; perspective:${SZ * 3}px; perspective-origin:${c.x}px ${c.bottom - 6}px;">', 1, '灵风术法阵透视原点钉在阵心');
  mod = patch(mod, 'top:${c.y - 6}px; width:330px; height:200px; animation: arcane-wing-glyph',
    'top:${c.y - 6}px; width:${c.h * 3.3}px; height:${c.h * 2}px; animation: arcane-wing-glyph', 1, '灵风术收尾羽翼按头像尺度');

  const stubText = STUBS.map(n => 'function ' + n + '() { /* 未迁移段：本 Demo 不产生该状态 */ }').join('\n');
  // 2d) 强力反击专属音效 URL 与精确演出源段（不连带近/远程重击函数）

  const shakeSource = topBlock(L, l => l.startsWith('window.triggerScreenShake = function('), 'triggerScreenShake');
  let powerShake = patch(shakeSource.text, 'window.triggerScreenShake = function(intensity = 6, duration = 300)', 'function playPowerCounterShake(run, intensity = 6, duration = 300)', 1, '强力反击原版震屏函数');
  powerShake = patch(powerShake, "document.getElementById('battle-scene')", '__STAGE.shakeEl()', 1, '强力反击震屏宿主');
  powerShake = patch(powerShake, '    const startTime = Date.now();', '    run.shakeScene = scene;\n    const startTime = Date.now();', 1, '强力反击震屏清理登记');
  powerShake = patch(powerShake, '        const elapsed = Date.now() - startTime;', "        if (!run.active) { scene.style.transform = ''; return; }\n        const elapsed = Date.now() - startTime;", 1, '强力反击震屏代际');
  powerShake = patch(powerShake, 'requestAnimationFrame(shakeLoop)', 'powerFrame(run, shakeLoop)', 2, '强力反击震屏帧登记');
  const powerUrl = powerSoundLine[0].trim();
  if (!/^const POWER_COUNTER_SOUND_URL = `\$\{ASSET_BASE\}\/shot01\.mp3`;$/.test(powerUrl)) fail('POWER_COUNTER_SOUND_URL 源定义变化');
  let powerParticles = patch(powerBurst.text, 'function spawnPowerBurst(x, y, dirAngle = 0)', 'function spawnPowerBurst(addParticle, x, y, dirAngle = 0)', 1, '强力反击爆发粒子注入');
  powerParticles = powerParticles.replaceAll('fxEngine.addParticle({', 'addParticle({');
  let chargeFx = patch(chargeParticles.text, 'window.spawnChargeUpParticles = function(cx, cy, color = \'#a78bfa\', duration = 320)', 'function spawnChargeUpParticles(addParticle, schedule, cx, cy, color = \'#a78bfa\', duration = 320)', 1, '强力反击蓄力粒子注入');
  chargeFx = chargeFx.replaceAll('setTimeout(() => {', 'schedule(() => {').replaceAll('fxEngine.addParticle({', 'addParticle({');
  let powerEffect = powerCounter.text;
  powerEffect = patch(powerEffect, 'async function playPowerCounterEffect(counter, victim, counterDom)', 'async function playPowerCounterEffect(counter, victim, counterDom, onImpact)', 1, '强力反击回调契约');
  powerEffect = patch(powerEffect, '    const _actionToken = combatToken;', '    const _actionToken = combatToken;\n    const run = powerCounterRun();\n    const alive = () => run.active && _actionToken === combatToken && !_pipelineFrozen;', 1, '强力反击代际句柄');
  powerEffect = patch(powerEffect, '    if (_pipelineFrozen) return;', '    if (!alive()) return false;', 1, '强力反击取消结果');
  powerEffect = patch(powerEffect, 'await sleep(500); if (_actionToken !== combatToken || _pipelineFrozen) return;', 'await powerWait(run, 500); if (!alive()) return false;', 1, '强力反击闪避缓冲可取消');
  powerEffect = patch(powerEffect, 'await sleep(350); if (_actionToken !== combatToken || _pipelineFrozen) return;', 'await powerWait(run, 350); if (!alive()) return false;', 1, '强力反击蓄力可取消');
  powerEffect = patch(powerEffect, 'await shotReady; if (_actionToken !== combatToken || _pipelineFrozen) return;', 'await powerAwait(run, shotReady); if (!alive()) return false;', 1, '强力反击预载取消');
  powerEffect = patch(powerEffect, 'if (cue && cue.started) await cue.started;', 'if (cue && cue.started) await powerAwait(run, cue.started);', 1, '强力反击起播等待可取消');
  powerEffect = patch(powerEffect, 'if (heroCard) {\n        heroCard.classList.remove', 'if (heroCard) {\n        run.glow = heroCard;\n        heroCard.classList.remove', 1, '强力反击登记蓄力光');
  powerEffect = patch(powerEffect, 'const cue = playCustomAudio(POWER_COUNTER_SOUND_URL, undefined, 1, { track:', 'const cue = run.cue = playCustomAudio(POWER_COUNTER_SOUND_URL, undefined, 1, { track:', 1, '强力反击音效取消登记');
  powerEffect = patch(powerEffect, '    if (_actionToken !== combatToken || _pipelineFrozen) return;', '    if (!alive()) return false;', 1, '强力反击阶段取消结果');
  powerEffect = patch(powerEffect, 'const victimCenter = getDomCenter(victimDom);', 'const victimCenter = powerCenter(victimDom);', 1, '强力反击舞台坐标');
  powerEffect = patch(powerEffect, 'const heroCard = counterDom.closest ? counterDom.closest(\'.hero-card-inner\') : null;', 'const heroCard = counterDom;', 1, '强力反击实体DOM蓄力光');
  powerEffect = patch(powerEffect, 'const counterDomEl2 = getEntitySpriteDom(counter) || (counter.id.startsWith(\'h\') ? document.getElementById(`hero-card-${counter.id}`) : document.getElementById(`${counter.id}-sprite`));', 'const counterDomEl2 = counterDom || getEntitySpriteDom(counter);', 1, '强力反击实体DOM');
  powerEffect = patch(powerEffect, 'window.spawnChargeUpParticles(cc.x, cc.y, \'#ff4040\', 210);', 'spawnChargeUpParticles(p => powerParticle(run, p), (fn, ms) => powerSchedule(run, fn, ms), cc.x, cc.y, \'#ff4040\', 210);', 1, '强力反击蓄力粒子');
  powerEffect = patch(powerEffect, 'counterDomEl2 && window.spawnChargeUpParticles', 'counterDomEl2', 1, '强力反击聚气使用本地函数');
  powerEffect = patch(powerEffect, 'getDomCenter(counterDomEl2)', 'powerCenter(counterDomEl2)', 1, '强力反击蓄力坐标');
  powerEffect = patch(powerEffect, 'getDomCenter(counterDomEl)', 'powerCenter(counterDomEl)', 1, '强力反击方向坐标');
  powerEffect = patch(powerEffect, 'isEntityVariantLocked(victimDom)', 'arcane.isEntityVariantLocked(victimDom)', 1, '强力反击锁定读取本地模块');
  powerEffect = patch(powerEffect, 'document.body.appendChild(flash);', '__STAGE.el.appendChild(flash); run.nodes.add(flash);', 1, '强力反击白闪舞台挂载');
  powerEffect = patch(powerEffect, 'setTimeout(() => flash.remove(), 240);', 'powerSchedule(run, () => { flash.remove(); run.nodes.delete(flash); }, 240);', 1, '强力反击白闪计时');
  powerEffect = patch(powerEffect, 'const rect = victimDom ? victimDom.getBoundingClientRect() : { left: victimCenter.x, top: victimCenter.y, width: 0, height: 0 };', 'const rect = victimDom ? victimDom[__GBCR]() : { left: victimCenter.x, top: victimCenter.y, width: 0, height: 0 };', 1, '强力反击准星舞台坐标');
  powerEffect = patch(powerEffect, 'document.body.appendChild(ch);', '__STAGE.el.appendChild(ch); run.nodes.add(ch);', 1, '强力反击准星舞台挂载');
  powerEffect = patch(powerEffect, 'setTimeout(() => ch.remove(), 340);', 'powerSchedule(run, () => { ch.remove(); run.nodes.delete(ch); }, 340);', 1, '强力反击准星计时');
  powerEffect = patch(powerEffect, 'spawnPowerBurst(victimCenter.x, victimCenter.y, dirAngle);', 'spawnPowerBurst(p => powerParticle(run, p), victimCenter.x, victimCenter.y, dirAngle); onImpact?.();', 1, '强力反击爆发与命中回调');
  powerEffect = patch(powerEffect, 'const counterDomEl = getEntitySpriteDom(counter) || (counter.id.startsWith(\'h\') ? document.getElementById(`hero-card-${counter.id}`) : document.getElementById(`${counter.id}-sprite`));', 'const counterDomEl = counterDom || getEntitySpriteDom(counter);', 1, '强力反击攻击方向实体');
  powerEffect = patch(powerEffect, 'if (victimDom && !arcane.isEntityVariantLocked(victimDom)) { victimDom.classList.add(\'shake\'); setTimeout(() => { if (_actionToken !== combatToken) return;  if (victimDom) victimDom.classList.remove(\'shake\'); }, 300); }', 'if (victimDom && !arcane.isEntityVariantLocked(victimDom)) { run.shaking = victimDom; victimDom.classList.add(\'shake\'); powerSchedule(run, () => { victimDom.classList.remove(\'shake\'); run.shaking = null; }, 300); }', 1, '强力反击目标震动清理');
  powerEffect = patch(powerEffect, 'if (window.triggerScreenShake) window.triggerScreenShake(20, 180);', 'playPowerCounterShake(run, 20, 180);', 1, '强力反击原版震屏调用');
  powerEffect = patch(powerEffect, 'await sleep(220); if (_actionToken !== combatToken || _pipelineFrozen) return;', 'await powerWait(run, 220); if (!alive()) return false;', 1, '强力反击余波等待可取消');
  powerEffect = patch(powerEffect, 'if (heroCard) heroCard.classList.remove(\'power-glow\');', 'if (heroCard) heroCard.classList.remove(\'power-glow\');\n    powerSchedule(run, () => powerFinish(run, false), 900);\n    return true;', 1, '强力反击保留余波并返回成功');
  const powerCode = `
  ${powerUrl}
  const powerRuns = new Set();
  function powerCounterRun() {
    const run = { active: true, timers: new Set(), frames: new Set(), nodes: new Set(), waits: new Set(), particles: new Set(), cue: null, glow: null, shaking: null, shakeScene: null };
    powerRuns.add(run);
    return run;
  }
  function powerSchedule(run, fn, ms) {
    const id = setTimeout(() => { run.timers.delete(id); if (run.active) fn(); }, ms);
    run.timers.add(id);
    return id;
  }
  function powerWait(run, ms) {
    return new Promise(resolve => {
      run.waits.add(resolve);
      powerSchedule(run, () => { run.waits.delete(resolve); resolve(true); }, ms);
    });
  }
  function powerFrame(run, fn) {
    const id = requestAnimationFrame(() => { run.frames.delete(id); if (run.active) fn(); });
    run.frames.add(id);
  }
  function powerAwait(run, promise) {
    return new Promise((resolve, reject) => {
      run.waits.add(resolve);
      Promise.resolve(promise).then(value => { run.waits.delete(resolve); resolve(value); }, error => { run.waits.delete(resolve); reject(error); });
    });
  }
  function powerParticle(run, particle) { run.particles.add(particle); fxEngine.addParticle(particle); }
  function powerCenter(dom) {
    const r = dom ? dom[__GBCR]() : { left: __STAGE.w / 2, top: __STAGE.h / 2, width: 0, height: 0 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function powerFinish(run, cancelled = true) {
    run.active = false;
    run.timers.forEach(clearTimeout); run.timers.clear();
    run.frames.forEach(cancelAnimationFrame); run.frames.clear();
    if (run.shakeScene) run.shakeScene.style.transform = '';
    run.waits.forEach(resolve => resolve(false)); run.waits.clear();
    run.nodes.forEach(n => n.remove()); run.nodes.clear();
    run.glow?.classList.remove('power-glow');
    run.shaking?.classList.remove('shake');
    if (cancelled) {
      run.cue?.stop?.();
      fxEngine.particles = fxEngine.particles.filter(p => !run.particles.has(p));
    }
    run.particles.clear();
    powerRuns.delete(run);
  }
  function clearPowerCounterEffects() { for (const run of [...powerRuns]) powerFinish(run); }
${powerShake}
${powerParticles}
${chargeFx}
${powerEffect}
`.replace(/[ \t]+$/gm, '');
  const css = extractCss(html, mod + '\n' + soundText + support + '\n' + moments + '\n' + powerParticles + '\n' + chargeFx + '\n' + powerEffect + '\n' + screenSvg + '\n' + screenSvgCssRefs);
  const hitCss = `
/* 战棋数字：原版分档时间轴，数值主导、实际伤害性质点缀。 */
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num,.arcane-hit-num-layer[data-hit-type] .arcane-hit-tag { font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; font-variant-numeric:tabular-nums lining-nums; font-style:normal; }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num { font-size:calc(24px * var(--hit-scale,1)); font-weight:850; line-height:1.05; letter-spacing:-.025em; color:var(--hit-color,#f8fafc); -webkit-text-stroke:.65px rgba(9,12,18,.9); paint-order:stroke fill; text-shadow:0 2px 3px #020617,0 0 7px rgba(2,6,23,.8); transform:translate(0,-18%); }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num.l2 { font-size:calc(27px * var(--hit-scale,1)); }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num.l3 { font-size:calc(32px * var(--hit-scale,1)); }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num.word { font-size:calc(16px * var(--hit-scale,1)); font-weight:750; color:#e2e8f0; }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num.shield { font-size:calc(22px * var(--hit-scale,1)); color:#7dd3fc; }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num.shield.sub { font-size:calc(16px * var(--hit-scale,1)); }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num.crit { color:#fde68a; }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num.burst { color:#fffbeb; }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-tag { font-size:calc(12px * var(--hit-scale,1)); font-weight:800; }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num::before { display:block; font-size:calc(9px * var(--hit-scale,1)); font-weight:650; line-height:1.1; letter-spacing:.08em; opacity:.9; }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num:not(.word):not(.shield)::before { content:attr(data-hit-type); }
.arcane-hit-num-layer[data-hit-type] .arcane-hit-num.shield:not(.sub)::before { content:"护盾"; }
[data-rpg-av-scope] .t-unit-medal .arcane-rescue-blood-wrap, [data-rpg-av-scope] .t-unit-avatar .arcane-rescue-blood-wrap { border-radius: 50%; overflow: hidden; }
`;
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
  const hasVariantTag = (e, name) => host.hasVariantTag(e, name);
  ${summonPending.text}

  // ---- 击杀特写 / 大招 Cut-in（原版顶层函数；屏幕宿主由战棋提供，重开/清场统一取消计时与遮罩） ----
  const __MOMENTS = new Set(), __momentTimers = new Set();
  const __SCREEN = () => (host.screen ? host.screen() : __STAGE.el);
  function __momentTimeout(fn, ms) { const id = setTimeout(() => { __momentTimers.delete(id); fn(); }, ms); __momentTimers.add(id); return id; }
  function clearMoments() { __momentTimers.forEach(clearTimeout); __momentTimers.clear(); __MOMENTS.forEach(o => o.remove()); __MOMENTS.clear(); }
${moments}

  // ---- 人物与语音表（原样） ----
  ${heroVoice.text}
  ${pickVoice.text}
  const AVATAR_MAP = {
    ${avatarLines.join('\n    ')}
  };

  // ---- CombatAudioMixer 及采样工具（原样） ----
${mixer}

${soundText}

${powerCode}
  // ---- 造雾术 / 高阶召唤术全屏 SVG 构件（原样） ----
${screenSvg}
  // ---- 粒子引擎（原样，仅换挂载层） ----
${fx}
  const fxEngine = new CanvasFxEngine();
${atmoAudioCode}
${support}

  // ---- 事件总线（原样） ----
${events.text}
${busText}

  // ---- arcaneVfxModule 入选段（原样 + 坐标/挂载补丁） ----
  const arcane = (function () {
${stubText}
${mod}
    return { playEnemyWindup, playAttackIdentityFx, playArcaneProjectile, playHitFeedback, classifyHit, syncHitBar,
      CombatAudioDirector, clearHitFeedback, warmIdentitySample, playArsenicShot, clearArcaneFx,
      syncStatusLayers, clearStatusLayers, playStatusTickFx, syncVariantState, clearVariantState, playVariantTriggerFx, isEntityVariantLocked,
      playSummonEnter, playSummonExit, playSummonGuard,
      playRescueGrit, playRescueAvoidFatal, clearRescueState,
      playVariantResistFx, playCounterAttackL1,
      playSelfDestructWindup, playSelfDestructBurst, playSelfDestructInterrupt, clearSelfDestructState, syncSelfDestructWarning,
      setIdentitySfx, setVariantSfx, setStatusSfx, setSelfDestructSfx, clearSummonState, playLingFeng,
      playIsis, playFeiShaHuaJia, playXieYanKey, playHarmonyShelter, playSilenceDomain, playShatterResonance,
      playZheYingBu, playStrangeConch,
      playMeleeGroup, playRangedGroup, playSpellGroup };
  })();
${busOn.map(l => l.replace('CombatAudioDirector.consume', 'arcane.CombatAudioDirector.consume')).join('\n')}

  return Object.assign({}, arcane, {
    CombatAudioMixer, audioUrls, playSound, playCustomAudio, HERO_VOICE_LINES, pickHeroVoice, AVATAR_MAP, fxEngine, atmoAudio,
    ASSET_BASE, HERO_VOICE_BASE, itemFxAssetUrl,
    playGenericSupportFx, playExecutionAnimation, playEnemyUltimateCutin, clearMoments, playPowerCounterEffect,
    RLYEH_FOG_CLOUD_URL, playEldritchWhisper, buildRlyehSedimentFxHtml, buildTitanGazeFxHtml,
    clearArcaneFx() { clearPowerCounterEffects(); supportHandles.forEach(handle => handle.cancel()); clearMoments(); arcane.clearArcaneFx(); playRandomStandardGunshot.last = null; },
    setToken(t) { if (t !== combatToken) { clearPowerCounterEffects(); supportHandles.forEach(handle => handle.cancel()); clearMoments(); playRandomStandardGunshot.last = null; } combatToken = t; },
    getToken() { return combatToken; },
    setRoster(h, e) { heroesData = h; enemiesData = e; },
  });
}
`;
  return { js, css: '/* 由 extract-rpg-av.cjs 自动生成，请勿手改。源 sha256=' + sha(html) + ' */\n' + css.css + hitCss, report: {
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
