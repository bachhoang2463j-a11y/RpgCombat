#!/usr/bin/env node
'use strict';
// 召唤三瞬（Enter/Exit/Guard）+ 真实接线：源码/维护包双验收，不启动浏览器或访问网络。
// 用法：node summon-moments-artifact-check.cjs [--source] [regex-前端战斗v12_12.json]
//   --source           仅验收 index.html 源码（跳过产物包检查）
//   位置参数           维护包 JSON 路径，缺省自动探测根目录唯一维护版 regex-前端战斗*.json
// 只核对召唤三瞬相关接口与通用项（围栏/&实体/$捕获组/内网静态Tailwind/monsterAttack恰3处/
// 不带SUMMON_SAMPLE_B64）；不依赖 v12.11 相关注释或标记，版本仅按文件名与 scriptName 对齐。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sourceOnly = process.argv.includes('--source');
const fileArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const detectArtifact = () => {
  const files = fs.readdirSync(ROOT).filter(f => /^regex-前端战斗(?!.*-公开版).*\.json$/.test(f));
  if (files.length !== 1) throw new Error('根目录应有且仅有一个维护版 regex-前端战斗*.json，实际：' + files.join(', '));
  return files[0];
};
const file = path.resolve(ROOT, fileArg || detectArtifact());
const pkg = sourceOnly ? null : JSON.parse(fs.readFileSync(file, 'utf8'));
const fence = pkg && pkg.replaceString;
const immune = fence && fence.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '');
const raw = immune && immune.replace(/&amp;/g, '&');
let passed = 0, failed = 0;
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
        else if (c === '}' && !--depth) return vm.runInNewContext('(' + text.slice(at, i + 1) + ')', { ASSET_BASE: 'http://192.168.110.83:8766', RLYEH_FOG_CLOUD_URL: 'fog', itemFxAssetUrl: (f) => 'http://192.168.110.83:8766/' + f.split('/').map(encodeURIComponent).join('/') });
    }
    throw new Error('未闭合对象 ' + name);
}
// 按花括号配对抽取函数体（静态接线断言，不做邻近距离猜测）
function fnBody(text, name) {
    const m = text.match(new RegExp('function ' + name + '\\s*\\('));
    if (!m) return null;
    const start = text.indexOf('{', m.index);
    if (start < 0) return null;
    let depth = 0, quote = '';
    for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; }
        else if (c === '"' || c === "'" || c === '`') quote = c;
        else if (c === '{') depth++;
        else if (c === '}' && !--depth) return text.slice(start, i + 1);
    }
    return null;
}
// 版本名严格随文件名走（regex-前端战斗vN_M.json ↔ 前端战斗vN.M），不硬编码 v12.11/v12.12 注释
const stem = path.basename(file).match(/^regex-前端战斗v(\d+)_(\d+)\.json$/);
const scriptName = stem ? '前端战斗v' + stem[1] + '.' + stem[2] : null;
const INTERFACES = ['isSummonDedicatedFx', 'playSummonEnter', 'playSummonExit', 'playSummonGuard', 'clearSummonState',
    'summonGuardHandle', 'defaultEnter', 'summonEnterPending', 'SUMMON_ACTIVE', 'playSampleClip'];
const WIRING = ['initUIIncrementalSummon', 'classifyEnemyWindup', 'playEnemyWindup', 'tryAutoSummonGuard', 'prepareSingleAttackHit', 'flushPendingSummons', 'arcane-enemy-summon-visual', 'arcane-summon-pending'];
// audioUrls 既有音源 key（三瞬音频必须映射到这些既有注册，不得新增 Base64 文件）
const AUDIO_KEYS = ['light_charge', 'light_impact', 'link_chime', 'resist_phantom', 'rage_exit',
    'sheshen_armor_step', 'parry_perfect', 'avoid_dash_perfect', 'hide'];
// 仅内部别名（summonRun.owner.sound 映射表），不允许出现在 audioUrls 注册表
const ALIAS_FORBIDDEN = ['armor_step_1', 'armor_step_2'];
console.log('== 召唤三瞬 ' + (scriptName || path.basename(file)) + ' ' + (sourceOnly ? '源码' : '产物') + '专项 ==');
check(count(source, '```') === 2, '源码仅头尾围栏');
if (pkg) {
    check(!!scriptName && pkg.scriptName === scriptName, '版本名与scriptName随文件名同步（' + (scriptName || '?') + '）');
    check(count(fence, '```') === 2 && !immune.includes('```'), '产物围栏加固');
    check(!/&(?!amp;)/.test(immune) && raw.replace(/&/g, '&amp;') === immune, '全量&amp;免疫及单遍还原');
    check(!/\$[$&`'\d<]/.test(raw), '$捕获组替换免疫');
}
for (const [label, text] of [['源码', source], ...(raw ? [['产物', raw]] : [])]) {
    try { [...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].forEach((m) => new vm.Script(m[1])); check(true, label + '脚本语法'); }
    catch (error) { check(false, label + '语法 ' + error.message); }
    check(count(text, 'monsterAttack') === 3, label + 'monsterAttack恰好三处');
    check(text.includes('192.168.110.83:8766') && !text.includes('cdn.tailwindcss.com'), label + '内网资源和静态Tailwind隔离');
    for (const n of INTERFACES.filter(n => label === '源码' || !['SUMMON_ACTIVE', 'playSampleClip'].includes(n))) check(text.includes(n), label + '召唤三瞬接口入包 ' + n);
    for (const n of WIRING) check(text.includes(n), label + '真实接线保留 ' + n);
    check(!text.includes('SUMMON_SAMPLE_B64') && !/data:audio/.test(text), label + '不带演示Base64采样');
    const urls = objectOf(text, 'audioUrls');
    for (const k of AUDIO_KEYS) check(typeof urls[k] === 'string' && urls[k].length > 0, label + 'audioUrls既有音源注册 ' + k);
    for (const k of ALIAS_FORBIDDEN) check(!(k in urls), label + '内部别名不入audioUrls注册 ' + k);
    const rg = objectOf(text, 'WEBM_FX_REGISTRY');
    check(DEDICATED_ALL_IN(rg), label + '专属fxTag集合仍在WEBM_FX_REGISTRY（skipped同步前提）');
    if (label === '源码') {
        const sumRunBody = fnBody(text, 'summonRun'), pscBody = fnBody(text, 'playSampleClip');
        check(!!(sumRunBody && sumRunBody.includes('playSampleClip') && sumRunBody.includes('sheshen_armor_step')), label + 'summonRun音频别名经playSampleClip');
        check(!!(pscBody && pscBody.includes('audioUrls') && pscBody.includes('playCustomAudio')), label + 'playSampleClip引用audioUrls/playCustomAudio');
    } else {
        check(['armor_step_1', 'armor_step_2', 'sheshen_armor_step', 'parry_perfect', 'avoid_dash_perfect'].every(n => text.includes(n)), '产物保留三瞬真音映射（私有符号由压缩器改名）');
    }
}
function DEDICATED_ALL_IN(rg) {
    return ['高阶召唤术', '蝎眼钥匙', '圣域帷幕', '塞赫美特之愠', '逆咒归源镜', '谐律之庇', '静默之域', '碎裂之响']
        .every((t) => Object.prototype.hasOwnProperty.call(rg, t));
}
console.log('SUMMARY ' + JSON.stringify({ passed, failed }));
if (failed) process.exitCode = 1;
