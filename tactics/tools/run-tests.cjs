#!/usr/bin/env node
// ==========================================
// 战棋独立测试启动器（P01）
// 用法：
//   node tactics/tools/run-tests.cjs --stage=p01            跑 P01 全部注册组
//   node tactics/tools/run-tests.cjs --stage=p01 --group=T01-03  只跑一组
//   node tactics/tools/run-tests.cjs --self-check           门禁负路径自检
//   node tactics/tools/run-tests.cjs --all                  聚合全部已注册阶段
//   node tactics/tools/run-tests.cjs --artifact --stage=... P01 尚无正式产物，明确非零
// 防假绿：不存在 stage/group/导出、空提取、0 用例一律非零退出；每组必须 passed>0。
// ==========================================

'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..');
// P01 用例（ESM，Node 与浏览器共用同一份业务模块）
const P01_CASES = path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'p01-node-cases.mjs');

// 阶段注册表：只登记真实存在的用例文件；--all 只聚合这里的条目，不虚构未来阶段。
const STAGES = {
  p01: {
    file: P01_CASES,
    groups: ['T01-01', 'T01-02', 'T01-03', 'T01-04', 'T01-05', 'T01-06', 'T01-07', 'T01-08'],
    // P01 依赖的业务导出（存在性门禁：缺任何一个直接失败，不许 0 断言报绿）
    requiredExports: [
      ['parser', 'parseSkill'], ['parser', 'parseItem'], ['parser', 'parseSkillList'], ['parser', 'parseItemList'],
      ['parser', 'parseHeroEntry'], ['parser', 'parseYamlCombatBlock'], ['parser', 'parseAttributes'],
      ['protocol', 'PROTOTYPES'], ['protocol', 'RANGE_TYPES'], ['protocol', 'TACTICS_ROSTER_KEY'],
      ['roster', 'resolveHero'], ['roster', 'ensureEvasionBaseline'], ['roster', 'gapFillSkill'],
      ['lifecycle', 'classifyLoad'], ['lifecycle', 'applyLoad'], ['lifecycle', 'reopenLoad'],
      ['configPackage', 'buildConfigPackage'], ['configPackage', 'createImportDraft'], ['configPackage', 'finalizeImportDraft'],
      ['storage', 'loadTacticsRoster'], ['storage', 'saveTacticsKey'], ['storage', 'readTacticsRoster'], ['storage', 'saveTacticsRoster'], ['storage', 'buildTacticsResultPayload'],
    ],
  },
};

function fail(msg) {
  console.error('[run-tests] FAIL: ' + msg);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { stage: null, group: null, all: false, artifact: false, selfCheck: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--artifact') args.artifact = true;
    else if (a === '--self-check') args.selfCheck = true;
    else if (a.startsWith('--stage=')) args.stage = a.slice(8).trim().toLowerCase();
    else if (a.startsWith('--group=')) args.group = a.slice(8).trim().toUpperCase();
    else fail('未知参数: ' + a);
  }
  if (args.stage === '' || args.group === '') throw new Error('stage/group 不允许空值');
  if ((args.selfCheck && (args.stage || args.group || args.all)) || (args.all && (args.stage || args.group))) throw new Error('测试选择参数互斥');
  return args;
}

async function loadModules(stageDef) {
  const modules = {};
  modules.protocol = await import(pathToFileURL(path.join(ROOT, 'tactics', 'src', 'protocol.mjs')).href);
  modules.parser = await import(pathToFileURL(path.join(ROOT, 'tactics', 'src', 'parser.mjs')).href);
  modules.roster = await import(pathToFileURL(path.join(ROOT, 'tactics', 'src', 'roster.mjs')).href);
  modules.lifecycle = await import(pathToFileURL(path.join(ROOT, 'tactics', 'src', 'lifecycle.mjs')).href);
  modules.configPackage = await import(pathToFileURL(path.join(ROOT, 'tactics', 'src', 'config-package.mjs')).href);
  modules.storage = await import(pathToFileURL(path.join(ROOT, 'tactics', 'src', 'storage.mjs')).href);
  assertRequiredExports(modules, stageDef.requiredExports);
  return modules;
}

async function runGroup(casesMod, groupId, deps) {
  const runner = casesMod.groups && casesMod.groups[groupId];
  if (!runner || typeof runner.run !== 'function') throw new Error('测试组不存在或不可运行: ' + groupId);
  const started = Date.now();
  const result = await runner.run(deps);
  if (!result || !Array.isArray(result.cases)) throw new Error('测试组 ' + groupId + ' 未返回用例数组');
  if (!result.cases.length) throw new Error('测试组 ' + groupId + ' 用例数为 0（禁止空组报绿）');
  const passed = result.cases.filter(c => c.pass === true).length;
  const failed = result.cases.filter(c => c.pass === false).length;
  const pending = result.cases.filter(c => c.pass !== true && c.pass !== false).length;
  if (passed === 0) throw new Error('测试组 ' + groupId + ' passed=0');
  if (failed > 0 || pending > 0) {
    result.cases.filter(c => c.pass !== true).forEach(c => console.error('  ✗ ' + c.id + ': ' + (c.detail || '')));
    fail('测试组 ' + groupId + ' failed=' + failed + ' pending=' + pending);
  }
  return { id: groupId, passed, failed, pending, durationMs: Date.now() - started, cases: result.cases };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.artifact) {
    fail('P01 尚无正式打包产物，--artifact 不受支持（禁止偷偷退回源码测试）');
  }

  if (args.selfCheck) {
    // 门禁负路径自检：每一项都必须以非零退出失败；再加一个真实导出成功对照。
    const { spawnSync } = require('child_process');
    const self = process.execPath;
    const run = (a) => spawnSync(self, [path.join(__dirname, 'run-tests.cjs'), ...a], { encoding: 'utf8', timeout: 60000 });
    const negatives = [
      ['不存在 stage', ['--stage=nonexistent']],
      ['不存在 group', ['--stage=p01', '--group=T99-99']],
      ['artifact 拒绝', ['--artifact', '--stage=p01']],
    ];
    for (const [name, a] of negatives) {
      const r = run(a);
      if (r.status === 0) fail('自检负路径未失败: ' + name + '（status=0）');
      console.log('  ✓ 负路径正确失败: ' + name + ' (status=' + r.status + ')');
    }
    // 真实导出成功对照：加载模块并验证一个真实函数可调用（防"加载器永远失败"也通过）
    const modules = await loadModules(STAGES.p01);
    const probe = modules.parser.parseSkill('【测试】[MP:0]');
    if (!probe || probe.name !== '测试' || probe.cost !== 0) fail('真实函数对照失败: parseSkill');
    console.log('  ✓ 真实函数对照通过: parser.parseSkill');
    console.log('[self-check] 全部通过');
    return;
  }

  if (args.all) {
    const names = Object.keys(STAGES);
    if (!names.length) fail('--all 无已注册阶段');
    let totalPassed = 0;
    for (const stageName of names) {
      const r = await runStage(stageName, null);
      totalPassed += r.passed;
    }
    console.log('[--all] 阶段 ' + names.join(',') + ' 合计 passed=' + totalPassed);
    return;
  }

  if (!args.stage) fail('缺少 --stage=<p01>（或 --all / --self-check）');
  await runStage(args.stage, args.group);
}

async function runStage(stageName, onlyGroup) {
  const stageDef = STAGES[stageName];
  if (!stageDef) fail('阶段不存在: ' + stageName + '（已注册: ' + Object.keys(STAGES).join(',') + '）');
  if (onlyGroup && !stageDef.groups.includes(onlyGroup)) {
    fail('测试组不存在: ' + onlyGroup + '（阶段 ' + stageName + ' 已注册: ' + stageDef.groups.join(',') + '）');
  }
  const modules = await loadModules(stageDef);
  const casesMod = await import(pathToFileURL(stageDef.file).href);
  const groups = onlyGroup ? [onlyGroup] : stageDef.groups;
  const results = [];
  for (const g of groups) {
    const r = await runGroup(casesMod, g, { modules, stage: stageName });
    results.push(r);
    console.log('  ✓ ' + r.id + ' passed=' + r.passed + ' (' + r.durationMs + 'ms)');
  }
  const passed = results.reduce((n, r) => n + r.passed, 0);
  console.log('[stage:' + stageName + '] groups=' + results.length + ' passed=' + passed + ' failed=0 pending=0');
  // 输出机器可读结果供报告合并
  if (process.env.RUN_TESTS_JSON) {
    process.stdout.write('\n__RUN_TESTS_JSON__' + JSON.stringify({
      stage: stageName, groups: results.map(r => ({ id: r.id, passed: r.passed, failed: r.failed, pending: r.pending, cases: r.cases })),
    }) + '__END__\n');
  }
}

function assertRequiredExports(modules, required) {
  const constants = new Set(['PROTOTYPES','RANGE_TYPES','TACTICS_ROSTER_KEY']);
  for (const [mod, name] of required) {
    const value = modules[mod]?.[name];
    if (constants.has(name) ? value === undefined : typeof value !== 'function') throw new Error('业务导出缺失或类型错误: ' + mod + '.' + name);
  }
}
module.exports = { assertRequiredExports, runGroup, parseArgs };
if (require.main === module) main().catch(e => { fail(e && e.stack || String(e)); });
