'use strict';
// 将同一套反馈规则用例接到单文件真实后端，不重新跑源码全量。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..', '..');
(async () => {
  const html = fs.readFileSync(path.join(root, 'tactics', 'mvp-standalone.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1) throw new Error('单文件脚本数量异常');
  const context = { console, structuredClone, URL, setTimeout, clearTimeout };
  context.window = context;
  vm.createContext(context);
  try { new vm.Script(scripts[0][1]).runInContext(context, { timeout: 5000 }); }
  catch (error) { if (error.message !== 'document is not defined') throw error; }
  const backend = context.__TACTICS_BACKEND__;
  if (!backend || typeof backend.createBattle !== 'function') throw new Error('真实产物后端未导出');
  const source = fs.readFileSync(path.join(root, 'integration-test', 'fixtures', 'tactics', 'feedback-fixes-node-cases.mjs'), 'utf8');
  const code = source.slice(source.indexOf('const scene ='), source.indexOf('export const groups')).replace('export function runCases()', 'function runCases()');
  const { canSeeUnit } = await import(pathToFileURL(path.join(root, 'tactics', 'src', 'perception.mjs')).href);
  const run = new Function('createBattle', 'canSeeUnit', code + '\nreturn runCases;')(backend.createBattle, canSeeUnit);
  const { cases } = run();
  const thresholdSource = fs.readFileSync(path.join(root, 'integration-test', 'fixtures', 'tactics', 'stealth-threshold-node-cases.mjs'), 'utf8');
  const thresholdCode = thresholdSource.slice(thresholdSource.indexOf('function unit('), thresholdSource.indexOf('export const groups'))
    .replace('export function runCases()', 'function runCases()')
    .replace("new URL('../../../tactics/src/ui-shell.mjs', import.meta.url)", 'uiShellPath');
  const assert = require('node:assert/strict');
  const { statusBadges, passiveTauntBadges } = await import(pathToFileURL(path.join(root, 'tactics', 'src', 'status-ui.mjs')).href);
  const thresholdRun = new Function('assert', 'readFileSync', 'createBattle', 'statusBadges', 'passiveTauntBadges', 'uiShellPath', thresholdCode + '\nreturn runCases;')(
    assert, fs.readFileSync, backend.createBattle, statusBadges, passiveTauntBadges, path.join(root, 'tactics', 'src', 'ui-shell.mjs'));
  // UI模板另在源码回归及IAB实测，这里只计真实产物后端的阈值/行动/消费用例。
  cases.push(...thresholdRun().cases.filter(c => !/statusBadges|急袭独立atk|renderStrip/.test(c.id)));
  if (!cases.length) throw new Error('反馈用例提取为空');
  const failed = cases.filter(c => c.pass !== true);
  console.log(JSON.stringify({ kind: 'artifact-feedback-rules', passed: cases.length - failed.length, failed: failed.length,
    sha256: createHash('sha256').update(html).digest('hex'), failures: failed }));
  if (failed.length) process.exitCode = 1;
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
