#!/usr/bin/env node
'use strict';
// 芭斯特的猫眼石 / 奇异海螺 / 砷弹射击 + 灵风真音改版 + 纯近战排位瞄准/顶盾：源码/维护包双验收。
// 用法：node bastet-conch-arsenic-artifact-check.cjs [产物路径] [--source]
//   默认产物：自动探测根目录唯一维护版 regex-前端战斗*.json；--source 时只验源码不读产物。
// 不启动浏览器或访问网络。输出每条断言，最后 SUMMARY；存在失败时退出码 1。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const sourceOnly = process.argv.includes('--source');
const argFile = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
const detectArtifact = () => {
  const files = fs.readdirSync(ROOT).filter(f => /^regex-前端战斗(?!.*-公开版).*\.json$/.test(f));
  if (files.length !== 1) throw new Error('根目录应有且仅有一个维护版 regex-前端战斗*.json，实际：' + files.join(', '));
  return files[0];
};
const file = path.resolve(ROOT, argFile || detectArtifact());
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let pkg = null, fence = null, immune = null, raw = null, pkgLoaded = false, pkgExplicit = !!argFile;
if (!sourceOnly) {
  try {
    pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    pkgLoaded = true;
    fence = pkg.replaceString;
    immune = fence && fence.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '');
    raw = immune && immune.replace(/&amp;/g, '&');
  } catch (e) {
    if (pkgExplicit) { console.log('[FAIL] 产物读取失败 ' + file + ' — ' + e.message); process.exit(1); }
    console.log('[SKIP] 默认产物尚未构建（' + path.basename(file) + ' 不存在），仅验源码。构建后请重跑本脚本。');
  }
}
let passed = 0, failed = 0, skipped = 0;
const count = (s, n) => s.split(n).length - 1;
function check(ok, name) { console.log((ok ? '[PASS] ' : '[FAIL] ') + name); ok ? passed++ : failed++; }
function objectOf(text, name) {
  const found = text.match(new RegExp('\\b' + name + '\\s*=\\s*\\{'));
  if (!found) throw new Error('缺少对象 ' + name);
  const at = found.index + found[0].length - 1;
  let depth = 0, quote = '';
  for (let i = at; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; }
    else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && !--depth) return vm.runInNewContext('(' + text.slice(at, i + 1) + ')', { ASSET_BASE: 'http://192.168.110.83:8766', RLYEH_FOG_CLOUD_URL: 'fog', itemFxAssetUrl: f => 'http://192.168.110.83:8766/' + f.split('/').map(encodeURIComponent).join('/') });
  }
  throw new Error('未闭合对象 ' + name);
}
function syntax(text, label) {
  const scripts = [...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  try { scripts.forEach(m => new vm.Script(m[1])); check(scripts.length === 2, label + '两个内联脚本语法通过'); }
  catch (e) { check(false, label + '语法：' + e.message); }
}

console.log('== v12.15 芭斯特/海螺/砷弹/灵风真音/近战排位 ' + (sourceOnly ? '源码' : '源码+产物') + '专项 ==');
// ---------- 围栏与实体免疫 ----------
check(count(src, '```') === 2, '源码仅头尾围栏');
if (pkgLoaded) {
  const stem = path.basename(file).match(/v(\d+)_(\d+)\.json$/);
  check(!!stem && pkg.scriptName === '前端战斗v' + stem[1] + '.' + stem[2], '文件名与scriptName版本同步（' + pkg.scriptName + '）');
  check(count(fence, '```') === 2 && !immune.includes('```'), '产物围栏加固');
  check(!/&(?!amp;)/.test(immune) && raw.replace(/&/g, '&amp;') === immune, '实体免疫与单遍还原逐字符一致');
  check(!/\$[$&`'\d<]/.test(immune), '$捕获组替换序列免疫');
}
syntax(src, '源码');
if (raw) syntax(raw, '产物');

// ---------- 通用隔离与夹具排除 ----------
for (const [label, text] of [['源码', src], ...(raw ? [['产物', raw]] : [])]) {
  check(count(text, 'monsterAttack') === 3, label + 'monsterAttack恰3处：资产表、红单体前摇、自爆');
  check(text.includes('192.168.110.83:8766') && !text.includes('cdn.tailwindcss.com'), label + '内网资源与静态Tailwind隔离');
  check(!text.includes('runBastetConchArsenicRegression') && !text.includes('bastet-conch-arsenic-regression-stage'), label + '测试夹具不进入维护包');
}

// ---------- 三新标签注册与真音路径 ----------
const tags = ['芭斯特的猫眼石', '奇异海螺', '砷弹射击'];
const delays = { '芭斯特的猫眼石': 0.92, '奇异海螺': 0.50, '砷弹射击': 0.50 };
const categories = { '芭斯特的猫眼石': 'B', '奇异海螺': 'A', '砷弹射击': 'A' };
const videoFiles = {
  '芭斯特的猫眼石': ['vfx_bastet_spiral.webm', 'vfx_bastet_pillar.webm'],
  '奇异海螺': ['vfx_conch_vortex.webm', 'vfx_conch_abyss.webm', 'vfx_conch_ripple.webm'],
  '砷弹射击': []
};
const demoPaths = {
  bastetChime: 'RpgCombat_Sound/vfx_bastet_harp_sweep.mp3',
  bastetCast: 'RpgCombat_Sound/vfx_magic_sparkle_whoosh.mp3',
  bastetHeal: 'RpgCombat_Sound/vfx_bastet_sanctuary_heal.mp3',
  conchCharge: 'RpgCombat_Sound/vfx_bowl_nepal_harmony.mp3',
  conchMist: 'RpgCombat_Sound/vfx_conch_deep_bubbles.mp3',
  windHum: 'vfx_wind_hum_mx1177.mp3',
  crystalChime: 'vfx_crystal_chime_mx2950.mp3',
  dodgeWind: 'dodge_candidates/dodge_t3_c_cinematic_wind.mp3',
  parryShield: 'parry_Shield3.wav'
};
for (const [label, text] of [['源码', src], ...(raw ? [['产物', raw]] : [])]) {
  tags.concat(['灵风术']).forEach(t => check(text.includes(t), label + '标签注册入包 ' + t));
  for (const k of Object.keys(demoPaths)) check(text.includes(demoPaths[k]), label + '真音文件路径 ' + demoPaths[k]);
  for (const t of tags) for (const f of videoFiles[t]) check(text.includes(f), label + 'WebM素材入包 ' + f);
  // 复用键保持根路径
  for (const p of ['vfx_stygian_whoosh_mx2918.mp3', 'aoe_wind_spin_fs772867.mp3', 'gunshot_pierce.mp3', 'defUp.mp3']) check(text.includes(p), label + '复用MP3保持 ' + p);
  // 禁项（字符串常量，terser 后仍成立）
  check(!text.includes('conchHorn'), label + '绝不出现 conchHorn');
  check(!text.includes('conchFog'), label + '不新增 conchFog 键（conchFog 复用 mx_stygian_whoosh）');
  check(!text.includes('arcane-row-front-ranged-haze'), label + '排除远程掩护haze类名');
  check(!text.includes('对比演练'), label + '排除对比UI');
}
// 私有函数/变量名：仅源码可查，产物经 terser mangle 不作断言
check(!src.includes('playRowCoverDeflect') && !src.includes('rowDeflect'), '源码排除远程掩护与rowDeflect旧设计（私有名）');
check(!src.includes('windPresetState') && !src.includes('rowStyle'), '源码排除B/C切换变量（私有名）');

// ---------- 注册表结构 ----------
try {
  const atM = src.match(/ARCANE_TAGS\s*=\s*(\[[\s\S]{0,900}?\])/);
  check(!!atM, 'ARCANE_TAGS 表存在');
  if (atM) {
    const at = vm.runInNewContext('(' + atM[1] + ')');
    tags.concat(['灵风术']).forEach(t => check(Array.isArray(at) && at.indexOf(t) >= 0, 'ARCANE_TAGS 含 ' + t));
  }
} catch (e) { check(false, 'ARCANE_TAGS 解析失败 ' + e.message); }
try {
  const entry = objectOf(src, 'ITEM_SKILL_FX');
  tags.forEach(t => {
    const it = entry[t];
    if (!it) { check(false, 'ITEM_SKILL_FX 注册 ' + t + '（未落地）'); return; }
    check(it.category === categories[t], 'ITEM_SKILL_FX 分类 ' + t + '=' + categories[t] + (it.category === categories[t] ? '' : '（实际 ' + it.category + '）'));
    const d = it.delay !== undefined ? it.delay : (webmEntry(src, t) || {}).delay;
    check(d !== undefined && Math.abs(Number(d) - delays[t]) < 1e-9, '结算延迟 ' + t + '=' + delays[t]);
    const vf = it.videoFiles || (webmEntry(src, t) || {}).videoFiles;
    check(JSON.stringify(vf || null) === JSON.stringify(videoFiles[t]), 'videoFiles ' + t + '=' + JSON.stringify(videoFiles[t]));
  });
  check(entry['灵风术'] && entry['灵风术'].category === 'B' && JSON.stringify(entry['灵风术'].videoFiles || []) === '[]', 'ITEM_SKILL_FX 灵风术 category=B 且 videoFiles=[]');
} catch (e) { check(false, 'ITEM_SKILL_FX 解析失败 ' + e.message); }
function webmEntry(text, tag) {
  try {
    const rg = objectOf(text, 'WEBM_FX_REGISTRY');
    return rg[tag] || null;
  } catch (e) { return null; }
}
try {
  const rg = objectOf(src, 'WEBM_FX_REGISTRY');
  tags.forEach(t => {
    const e = rg[t];
    if (!e) { check(false, 'WEBM_FX_REGISTRY 注册 ' + t + '（未落地）'); return; }
    check(Math.abs(Number(e.delay) - delays[t]) < 1e-9, 'WEBM_FX_REGISTRY 延迟 ' + t + '=' + delays[t]);
  });
  check((rg['灵风术'] || {}).url === '' && (rg['灵风术'] || {}).delay !== undefined, 'WEBM_FX_REGISTRY 灵风术空URL真音演出保持');
} catch (e) { check(false, 'WEBM_FX_REGISTRY 解析失败 ' + e.message); }
try {
  const urls = objectOf(src, 'audioUrls');
  const BASE = 'http://192.168.110.83:8766/';
  for (const k of Object.keys(demoPaths)) check(urls[k] === BASE + demoPaths[k], 'audioUrls注册 ' + k + '=' + demoPaths[k]);
  for (const [k, p] of [['mx_stygian_whoosh', 'vfx_stygian_whoosh_mx2918.mp3'], ['gunshot_pierce', 'gunshot_pierce.mp3'], ['aoe_wind_spin_fs772867', 'aoe_wind_spin_fs772867.mp3'], ['defUp', 'defUp.mp3']])
    check(urls[k] === BASE + p, 'audioUrls复用保持 ' + k + '=' + p);
} catch (e) { check(false, 'audioUrls 解析失败 ' + e.message); }

// ---------- playLingFeng 真音切片 ----------
const lfAt = src.indexOf('function playLingFeng');
if (lfAt < 0) check(false, 'playLingFeng 函数存在（未落地）');
else {
  let next = src.indexOf('\n    function ', lfAt + 10);
  const lf = src.slice(lfAt, next > 0 ? next : lfAt + 9000);
  ['windHum', 'crystalChime', 'aoe_wind_spin_fs772867', 'dodgeWind'].forEach(k => check(lf.includes(k), 'playLingFeng 真音键 ' + k));
  check(!/\bwhoosh\b|\btone\b|\bkick\b|\bcry\b|\bclick\b|createOscillator|OscillatorNode/i.test(lf), 'playLingFeng 无 whoosh/tone/kick/cry/click/振荡器合成音');
  check(!/\bmx_stygian_whoosh\b/.test(lf), 'playLingFeng 不串用 conchFog 的 stygian 音');
}

// ---------- playArsenicShot 完整区间：禁虚线菱形/347/249、无 stroke-dasharray splat、droplet source-over 存在 ----------
(function arsenicScope() {
  const paAt = src.indexOf('function playArsenicShot');
  if (paAt < 0) { check(false, 'playArsenicShot 函数存在（未落地）'); return; }
  let next = src.indexOf('\n    function ', paAt + 10);
  const pa = src.slice(paAt, next > 0 ? next : paAt + 12000);
  check(!/\b347\b|\b249\b|虚线菱形/.test(pa), 'playArsenicShot 区间禁虚线菱形/347/249');
  check(!pa.includes('stroke-dasharray'), 'playArsenicShot splat 无 stroke-dasharray 虚线');
  check(pa.includes('droplet') && pa.includes('source-over'), 'playArsenicShot droplet（source-over 混合）存在');
  ['ar-chg', 'ar-bullet', 'ar-boom', 'ar-splat'].forEach(cn => check(src.includes(cn), '砷弹视觉层类名入包 ' + cn));
})();

// ---------- 纯近战排位接口：源码查实现细节，产物查 window 导出与类名（terser mangle 私有名） ----------
const rowNames = ['setRowTargetingCues', 'clearRowAimCues', 'syncRowTargetingCues', 'playRowBlockImpact'];
rowNames.forEach(n => check(src.includes('function ' + n), '源码近战排位实现入包 ' + n));
check(/if\s*\(\s*mode\s*(?:===|!==)\s*(['"])melee\1/.test(src), '源码仅 melee 模式守卫（=== / !== 等价写法均接受）');
const syncUses = count(src, 'syncRowTargetingCues(');
check(syncUses >= 6, '源码syncRowTargetingCues 接入点≥6（attack/skill/item/grouped_item/release_charge + 清理，实际 ' + syncUses + '）');
check(src.includes('cancelTargeting'), '源码cancelTargeting 清理通道入包');
if (raw) {
  rowNames.forEach(n => check(new RegExp('\\b' + n + '\\s*:').test(raw) || raw.includes('window.' + n), '产物window导出属性 ' + n));
  check(raw.includes('arcane-row-back-locked'), '产物后排锁盾类入包');
  check(raw.includes('row-aim'), '产物row-aim 专用层入包');
}
const prAt = src.indexOf('function playRowBlockImpact');
if (prAt < 0) check(false, 'playRowBlockImpact 函数存在（未落地）');
else {
  const pw = src.slice(prAt, prAt + 3000);
  check(pw.includes('parryShield') && pw.includes('defUp'), '顶盾采样 parryShield/defUp 入包');
  check(pw.includes('560'), '顶盾 560ms 时长入包');
}
const htAt = src.indexOf('async function handleTargetClick');
if (htAt >= 0) {
  const htWin = src.slice(htAt, htAt + 4000);
  check(htWin.includes('playRowBlockImpact') || !htWin.includes('前排'), 'handleTargetClick 拦截分支以动效代替 showLog 前排阻挡文字');
  check(src.includes('hasAliveFront') || src.includes('hasAliveFront('), 'hasAliveFront 前排存活判定入包');
  check(src.includes('canBypassRow'), 'canBypassRow 越位判定保持入包');
}

console.log('SUMMARY ' + JSON.stringify({ sourceOnly, artifact: pkgLoaded ? path.basename(file) : null, passed, failed, skipped }));
process.exitCode = failed ? 1 : 0;
