#!/usr/bin/env node
'use strict';
// 氛围维护包专项：离线检查围栏、实体免疫、隔离与公开入口入包。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const file = path.resolve(root, process.argv[2] || 'regex-前端战斗v12_13.json');
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const fenced = pkg.replaceString, immune = fenced.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, ''), raw = immune.replace(/&amp;/g, '&');
let passed = 0, failed = 0;
const count = (text, key) => text.split(key).length - 1;
function check(ok, name) { console.log((ok ? '[PASS] ' : '[FAIL] ') + name); ok ? passed++ : failed++; }
const stem = path.basename(file).match(/^regex-前端战斗v(\d+)_(\d+)\.json$/);
check(stem && pkg.scriptName === '前端战斗v' + stem[1] + '.' + stem[2], '文件名与scriptName同步');
check(count(source, '```') === 2 && count(fenced, '```') === 2 && !immune.includes('```'), '源码/产物仅头尾围栏');
check(!/&(?!amp;)/.test(immune) && raw.replace(/&/g, '&amp;') === immune, '全量实体免疫且单遍还原一致');
check(!/\$[$&`'\d<]/.test(raw), '正则捕获组替换免疫');
for (const [label, text] of [['源码', source], ['产物', raw]]) {
  try {
    const scripts = [...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    scripts.forEach(m => new vm.Script(m[1])); check(scripts.length === 2, label + '两内联脚本语法通过');
  } catch (error) { check(false, label + '语法：' + error.message); }
  check(count(text, 'monsterAttack') === 3, label + 'monsterAttack恰三处');
  check(text.includes('192.168.110.83:8766') && !text.includes('cdn.tailwindcss.com'), label + '内网与静态Tailwind隔离');
  for (const key of ['arcane-atmo-root','arcane-atmo-canvas','arcane-atmo-rain-fall','arcane-atmo-mist-drift','arcane-atmo-beam-breathe','arcane-atmo-aurora-sway-a',
    'arcaneAtmoModule','setBattleAtmosphereData','startBattleAtmosphere','stopBattleAtmosphere','refreshBattleAtmosphere',
    'setBattleAtmosphereSelection','setBattleAtmosphereSound','buildBattleAtmosphereSettingsHtml','syncBattleAtmosphereControls',
    'edit-battle-atmosphere','edit-atmosphere-sound','战场氛围','跟随 YAML','即时生效','atmosphereSound','ResizeObserver','fullscreenchange','pagehide']) {
    check(text.includes(key), label + '公开接线/样式入包：' + key);
  }
  check(['默认背景','夜雨','冷雾','废墟尘埃','异界低光'].every(label => text.includes(label)), label + '五主题齐备');
  check(!/arcane-atmo-mobile-preview|__arcaneSharedAudioCtx|DEMO_GROUPS|THEME_LABEL/.test(text), label + '不带Demo预览与替身上下文');
  const start = text.indexOf('function buildTitanGazeFxHtml('), end = text.indexOf('function _spawnFullscreenSvgFx(', start);
  const builder = text.slice(start, end);
  check(start >= 0 && !/-translate-x-1\/2|-translate-y-1\/2/.test(builder), label + '泰坦光环不含双重位移');
}
check(raw.includes('-4.2s') && raw.includes('arcane-atmo-beam-2'), '废墟负延迟修复入包');
check(/output\(['"]aux['"],\s*['"]L['"]\)/.test(raw), '环境音接aux最低优先级L');
check(/stopAmbientAudio\(!0\)|stopAmbientAudio\(true\)/.test(raw), '关闭共享上下文前同步停环境源');
check(source.includes("setBattleAtmosphereData(block['战场氛围'])") && source.includes('refreshBattleAtmosphere();\n}'), '源码新战局/重置切换策略保留');
console.log('SUMMARY ' + JSON.stringify({ passed, failed }));
if (failed) process.exitCode = 1;
