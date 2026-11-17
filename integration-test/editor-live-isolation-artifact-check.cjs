#!/usr/bin/env node
'use strict';
// 编辑器数据隔离维护包专项：离线检查围栏/实体/捕获组免疫、旧交换清零与草稿管线入包。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const detectArtifact = () => {
  const files = fs.readdirSync(root).filter(f => /^regex-前端战斗(?!.*-公开版).*\.json$/.test(f));
  if (files.length !== 1) throw new Error('根目录应有且仅有一个维护版 regex-前端战斗*.json，实际：' + files.join(', '));
  return files[0];
};
const file = path.resolve(root, process.argv[2] || detectArtifact());
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
  // 旧全局交换设计清零（本次修复根因）：任何残留都会让回合管线再度拿到无 dom 的副本
  check(!text.includes('editorLiveHeroes') && !text.includes('editorLiveEnemies'), label + '旧editorLive*交换变量清零');
  check(!text.includes('heroesData = editorLive') && !text.includes('= editorLiveHeroes'), label + '无实时数组恢复赋值残留');
  // 草稿管线入包：声明/访问器/共享克隆/关闭清层（产物压缩无空白，断言一律空白无关）
  check(/let\s+editorDraftHeroes\s*=\s*null/.test(text) && /editorDraftEnemies\s*=\s*null/.test(text), label + '草稿变量声明入包');
  check((text.match(/editorDraftHeroes\s*\|\|\s*heroesData/g) || []).length >= 2 && (text.match(/editorDraftEnemies\s*\|\|\s*enemiesData/g) || []).length >= 2, label + '数据源访问器入包（访问器+保存捕获）');
  check(count(text, '_cloneRosterArray(') >= 4, label + '共享剥dom克隆入包（草稿×2+基线×2）');
  check(/state\.isGameStarted\s*\?\s*initialHeroesCache\s*:\s*heroesData/.test(text), label + '战斗中草稿取本场基线');
  check(/editorDraftHeroes\s*=\s*_cloneRosterArray\(/.test(text) && /editorDraftEnemies\s*=\s*_cloneRosterArray\(/.test(text), label + 'openEditor建草稿入包');
  // closeEditor：只关面板+清浮层+丢草稿，无恢复赋值（起点后取窗口断言，兼容产物单行压缩）
  const closeStart = text.indexOf('function closeEditor()');
  const closeBody = closeStart >= 0 ? text.slice(closeStart, closeStart + 600) : '';
  check(closeBody.includes('closeSkillTypeCombo()') && /editorDraftHeroes\s*=\s*null/.test(closeBody) && /editorDraftEnemies\s*=\s*null/.test(closeBody), label + 'closeEditor清浮层并丢草稿');
  check(!/closeBody && 0/.test('') && !closeBody.slice(0, 600).match(/heroesData\s*=\s*\w+/), label + 'closeEditor不再恢复实时数组');
  // 保存交接：显式草稿持久化 + 草稿归一化 + 新基线固化
  check(/persistHeroesRoster\(\w+\)/.test(text), label + 'saveEditor显式持久化草稿');
  check(count(text, 'freezeInitialCaches(') === 4, label + 'freezeInitialCaches四处调用（定义+开场+保存+载入合并）');
  check(/freezeInitialCaches\(\w+\s*,\s*\w+\)/.test(text), label + '保存以草稿固化新基线');
  check(/function serializeHeroesForSave\(\s*\w+\s*=\s*\w+\s*\)/.test(text), label + '序列化函数带参入包');
  check(/function persistHeroesRoster\(\s*\w+\s*=\s*\w+\s*\)/.test(text), label + '持久化函数带参入包');
  // 草稿失效边界：startGame / 新YAML成功 / 重置管线
  check(/function startGame\(\)\s*\{\s*closeEditor\(\)/.test(text), label + 'startGame开战前丢弃草稿');
  check(/setBattleAtmosphereData\(\w+\[["']战场氛围["']\]\)\s*[;,]\s*closeEditor\(\)/.test(text), label + '新YAML成功后丢弃草稿');
  const resetStart = text.indexOf('function runResetPipeline()');
  const resetBody = resetStart >= 0 ? text.slice(resetStart, resetStart + 220) : '';
  check(resetBody.includes('closeEditor()'), label + '重置管线丢弃草稿');
  // 编辑器入口不再直接改实时数组：增删/折叠/摘要全走访问器
  // 防假绿：起点/终点必须都定位成功且片段非空（产物压缩无空格，起点用无空格前缀匹配），
  // 否则空片段会让下方否定断言恒真——曾出现产物侧 indexOf 为 -1 导致 50/0 假绿，此哨兵即回归锁
  const edStart = text.indexOf('const edHeroes');
  const edEnd = text.indexOf('function buildCombatResultPayload');
  check(edStart >= 0 && edEnd > edStart && (edEnd - edStart) > 10000, label + '编辑器区间片段有效（起点/终点定位+长度哨兵）');
  const editorRange = (edStart >= 0 && edEnd > edStart) ? text.slice(edStart, edEnd) : '\0INVALID-RANGE\0';
  check(!/heroesData\[(hi|ei|entityIdx)\]/.test(editorRange) && !/enemiesData\[(hi|ei|entityIdx)\]/.test(editorRange), label + '编辑器区间无实时数组直读');
  check(!editorRange.includes('heroesData.push(') && !editorRange.includes('enemiesData.push(') && !editorRange.includes('heroesData.splice(') && !editorRange.includes('enemiesData.splice('), label + '编辑器区间无实时数组直改');
  check(count(text, 'edHeroes().forEach') >= 2 && count(text, 'edEnemies().forEach') >= 2, label + '表单渲染/同步走草稿');
}
console.log('SUMMARY ' + JSON.stringify({ passed, failed }));
if (failed) process.exitCode = 1;
