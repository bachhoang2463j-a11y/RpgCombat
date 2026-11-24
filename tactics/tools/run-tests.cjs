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
// P02 用例（场景双输出 / 相机手势 / 占格选取 / 生命周期）
const P02_CASES = path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'p02-node-cases.mjs');
// P03 用例（跑圈 / 全局事件时钟 / 同刻三阶段 / 隐藏轴过滤）
const P03_CASES = path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'p03-node-cases.mjs');
const P04_CASES = path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'p04-node-cases.mjs');
const P05_CASES = path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'p05-node-cases.mjs');
const P06_CASES = path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'p06-node-cases.mjs');
const P07_CASES = path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'p07-node-cases.mjs');
// FX01 角色技能移植（埃利奥特首位）：演出注册表 + 规则接线
const FX01_CASES = path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'fx01-node-cases.mjs');

// 阶段注册表：只登记真实存在的用例文件；--all 只聚合这里的条目，不虚构未来阶段。
const STAGES = {
  'enemy-turn-completion': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'enemy-turn-completion-node-cases.mjs'),
    groups: ['ENEMY-TURN-COMPLETION'], modules: [], requiredExports: [],
  },
  'domain-region': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'domain-region-node-cases.mjs'),
    groups: ['DR-DOMAIN'], modules: ['parser', 'regions', 'range', 'battle', 'scheduler', 'barriers', 'scene', 'movement'], requiredExports: [],
  },
  'passive-counter-complete': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'passive-counter-complete-node-cases.mjs'),
    groups: ['PASSIVE-COUNTER-COMPLETE'], modules: [], requiredExports: [],
  },
  'ui-readability': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'ui-readability-node-cases.mjs'),
    groups: ['UIR-S', 'UIR-F', 'UIR-P', 'UIR-W'], modules: [], requiredExports: [],
  },
  'guard-barrier-fx': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'guard-barrier-fx-node-cases.mjs'),
    groups: ['TGB-G', 'TGB-B', 'TGB-W'], modules: [], requiredExports: [],
  },
  'guard-director': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'guard-director-node-cases.mjs'),
    groups: ['TG-DIRECTOR'], modules: [], requiredExports: [],
  },
  'guard-path': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'guard-path-node-cases.mjs'),
    groups: ['TG-PATH'], modules: [], requiredExports: [],
  },
  'guard-battle': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'guard-battle-node-cases.mjs'),
    groups: ['TG-BATTLE'], modules: [], requiredExports: [],
  },
  'guard-reasons': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'guard-barrier-reasons-node-cases.mjs'),
    groups: ['TG-REASONS'], modules: [], requiredExports: [],
  },
  'guard-barrier-flow': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'guard-barrier-flow-node-cases.mjs'),
    groups: ['TG-FLOW'], modules: [], requiredExports: [],
  },
  'guard-barrier-space': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'guard-barrier-space-node-cases.mjs'),
    groups: ['TG-SPACE'], modules: [], requiredExports: [],
  },
  'p07-av': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'p07av-node-cases.mjs'),
    groups: ['TP7AV-A', 'TP7AV-W'], modules: [], requiredExports: [],
  },
  'p07-av-fx': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'p07av-fx-node-cases.mjs'),
    groups: ['TP7AV-B', 'TP7AV-L', 'TP7AV-S', 'TP7AV-K'], modules: [], requiredExports: [],
  },
  'status-variant': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'status-variant-node-cases.mjs'),
    groups: ['TSV-01', 'TSV-02'], modules: [], requiredExports: [],
  },
  'hit-feedback': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'hit-feedback-node-cases.mjs'),
    groups: ['THIT-01', 'THIT-02', 'THIT-03', 'THIT-04'], modules: [], requiredExports: [],
  },
  feedback05: {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'feedback05-node-cases.mjs'),
    groups: ['TFB-05'], modules: ['ai', 'movement', 'scene', 'effectDefinitions'],
    requiredExports: [['ai', 'chooseEnemyAction'], ['effectDefinitions', 'skillSlots']],
  },
  'typical-skills': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'typical-skills-node-cases.mjs'),
    groups: ['TT-SKILLS'], modules: ['battle', 'parser', 'scenarioData'],
    requiredExports: [['battle', 'createBattle']],
  },
  'typical-battle': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'typical-battle-node-cases.mjs'),
    groups: ['TT-BATTLE'], modules: ['battle', 'parser', 'scenarioData'],
    requiredExports: [['battle', 'createBattle']],
  },
  'typical-data': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'typical-data-node-cases.mjs'),
    groups: ['TT-DATA'], modules: ['parser', 'protocol', 'roster', 'configPackage', 'scenarioData'],
    requiredExports: [['scenarioData', 'createScenarioData'], ['scenarioData', 'createSeededRandom']],
  },
  'typical-space': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'typical-space-node-cases.mjs'),
    groups: ['TT-SPACE'], modules: ['scene', 'geometry', 'movement', 'range', 'regions', 'perception', 'barriers'],
    requiredExports: [['perception', 'canSeeUnit'], ['regions', 'fogAt'], ['barriers', 'previewBarrier']],
  },
  'typical-ai': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'typical-ai-node-cases.mjs'),
    groups: ['TT-AI'], modules: ['ai', 'range', 'movement', 'geometry', 'scene'],
    requiredExports: [['ai', 'chooseEnemyAction']],
  },
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
    modules: ['protocol', 'parser', 'roster', 'lifecycle', 'configPackage', 'storage'],
  },
  p02: {
    file: P02_CASES,
    groups: ['T02-01', 'T02-02', 'T02-03', 'T02-04'],
    requiredExports: [
      ['scene', 'compileScene'], ['scene', 'TEST_ROOM'],
      ['geometry', 'occupiedCells'], ['geometry', 'buildOccupancyIndex'], ['geometry', 'unitAt'], ['geometry', 'unitCenter'], ['geometry', 'directionVector'],
      ['mapArt', 'renderSceneArt'],
      ['camera', 'createPose'], ['camera', 'worldToScreen'], ['camera', 'screenToWorld'], ['camera', 'screenToGrid'],
      ['camera', 'zoomAtPose'], ['camera', 'focusPose'], ['camera', 'fitPose'], ['camera', 'createGesture'],
      ['viewScope', 'createViewScope'],
      ['arcaneVfx', 'bezierPoint'],
      ['main', 'buildViewData'], ['main', 'deriveUnitId'], ['main', 'DEFAULT_YAML_A'], ['main', 'DEFAULT_PLACEMENTS'],
    ],
    modules: ['scene', 'geometry', 'mapArt', 'camera', 'viewScope', 'arcaneVfx', 'parser', 'storage', 'lifecycle', 'main'],
  },
  mvp: {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'mvp-node-cases.mjs'),
    groups: ['TM-01', 'TM-02', 'TM-03', 'TM-04', 'TM-05', 'TM-06'],
    requiredExports: [
      ['movement', 'findReachable'], ['range', 'queryAttack'], ['damage', 'resolveHit'],
      ['damage', 'calculateDamage'], ['damage', 'applyAttackDamage'],
      ['ai', 'chooseEnemyAction'], ['battle', 'createBattle'],
    ],
    modules: ['scene', 'geometry', 'movement', 'range', 'damage', 'ai', 'battle', 'parser', 'clock'],
  },
  av: {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'av-node-cases.mjs'),
    groups: ['TAV-01', 'TAV-02', 'TAV-03', 'TAV-04', 'TAV-05', 'TAV-06', 'TAV-07'],
    requiredExports: [
      ['director', 'resolveAttackIdentity'], ['director', 'resolveWindupKind'], ['director', 'createActionDirector'],
      ['motion', 'pathSegments'], ['motion', 'pathDuration'], ['motion', 'travelFraction'], ['motion', 'pointAtDistance'], ['motion', 'playPathMotion'],
      ['avHost', 'createAvHost'], ['vendor', 'createRpgAv'], ['battle', 'createBattle'], ['range', 'queryAttack'], ['main', 'buildViewData'],
    ],
    modules: ['parser', 'scene', 'geometry', 'movement', 'range', 'damage', 'ai', 'battle', 'clock', 'main', 'fixture', 'director', 'motion', 'avHost', 'vendor'],
  },
  p03: {
    file: P03_CASES,
    groups: ['T03-01', 'T03-02', 'T03-03', 'T03-04', 'T03-05', 'T03-06', 'T03-07', 'T03-08'],
    // P03 依赖的业务导出（存在性门禁：缺任何一个直接失败，不许 0 断言报绿）
    requiredExports: [
      ['clock', 'createClock'], ['clock', 'dispatchClock'], ['clock', 'advanceToNextAction'],
      ['clock', 'getVisibleTurnQueue'], ['clock', 'getUnitNextActionAt'], ['clock', 'getActionState'],
      ['clock', 'isOpportunityReadyAt'],
      ['scheduler', 'settlePhase12'], ['scheduler', 'collectArrivals'], ['scheduler', 'nextEffectEventTime'],
      ['scheduler', 'hasActionableUnit'], ['scheduler', 'applyStatusRecord'], ['scheduler', 'grantNaturalAction'],
      ['scheduler', 'processStunSkip'], ['scheduler', 'grantMainPoint'], ['scheduler', 'isOpportunityReady'],
    ],
    modules: ['clock', 'scheduler', 'lifecycle'],
  },
  p04: {
    file: P04_CASES,
    groups: ['T04-01'],
    requiredExports: [
      ['movement', 'findReachable'], ['movement', 'findJumpPath'], ['movement', 'canPlaceAt'],
      ['movement', 'traceDisplacement'], ['movement', 'cellsAdjacent'],
      ['damage', 'applyCollisionDamage'], ['battle', 'createBattle'],
    ],
    modules: ['scene', 'geometry', 'movement', 'damage', 'battle'],
  },
  p05: {
    file: P05_CASES,
    groups: ['T05-01'],
    requiredExports: [
      ['generation', 'generateScene'], ['generation', 'solveFormation'], ['generation', 'generateTacticalScene'],
      ['scene', 'compileScene'], ['geometry', 'occupiedCells'], ['geometry', 'unitCenter'],
    ],
    modules: ['generation', 'scene', 'geometry', 'lifecycle'],
  },
  p06: {
    file: P06_CASES,
    groups: ['T06-01'],
    requiredExports: [
      ['range', 'queryAttack'], ['range', 'resolveSlotTargets'], ['range', 'classifySlotSide'],
      ['battle', 'createBattle'], ['ai', 'chooseEnemyAction'], ['scene', 'compileScene'], ['parser', 'parseSkill'],
    ],
    modules: ['range', 'battle', 'ai', 'scene', 'geometry', 'movement', 'damage', 'clock', 'lifecycle', 'parser'],
  },
  p07: {
    file: P07_CASES,
    groups: ['T07-01'],
    requiredExports: [
      ['battle', 'createBattle'], ['battle', 'skillSupport'],
      ['clock', 'dispatchClock'], ['range', 'queryAttack'], ['scene', 'compileScene'],
    ],
    modules: ['battle', 'clock', 'scheduler', 'lifecycle', 'range', 'scene', 'geometry', 'movement', 'damage', 'ai', 'parser'],
  },
  fx01: {
    file: FX01_CASES,
    groups: ['TFX-01', 'TFX-02', 'TFX-03'],
    requiredExports: [
      ['fxRegistry', 'createFxRegistry'], ['fxRegistry', 'actionInput'], ['fxRegistry', 'reactionInput'], ['fxRegistry', 'checkBudget'],
      ['fxLibrary', 'registerDefaultFx'], ['battle', 'createBattle'], ['battle', 'skillSupport'], ['parser', 'parseYamlText'], ['parser', 'parseSkill'],
      ['fxRegistry', 'prepareInput'], ['scenarioData', 'createScenarioData'], ['main', 'isTypicalBlock'], ['reactionPrompt', 'candidateKind'],
    ],
    modules: ['parser', 'battle', 'fixture', 'fxRegistry', 'fxLibrary', 'scenarioData', 'chapelScene', 'main', 'reactionPrompt'],
  },
  rules02: {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'rules02-node-cases.mjs'),
    groups: ['TR2-A', 'TR2-B', 'TR2-C', 'TR2-D'],
    requiredExports: [
      ['effectDefinitions', 'EFFECT_DEFINITIONS'], ['effectDefinitions', 'normalizeEffectTag'],
      ['effectDefinitions', 'effectDefinition'], ['effectDefinitions', 'skillSlots'],
      ['effectHandlers', 'applyEffectSlot'], ['classPassives', 'CLASS_PASSIVES'], ['classPassives', 'getEffectiveStats'],
      ['variantRules', 'applyTypeResist'], ['battle', 'createBattle'], ['battle', 'skillSupport'], ['battle', 'itemAsSkill'],
    ],
    modules: ['protocol', 'parser', 'battle', 'damage', 'range', 'clock', 'scheduler', 'lifecycle', 'scene', 'geometry', 'movement', 'ai',
      'effectDefinitions', 'effectHandlers', 'classPassives', 'variantRules'],
  },
  'rules02-passive': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'rules02-passive-node-cases.mjs'),
    groups: ['RULES02-PASSIVE'],
    requiredExports: [['battle', 'createBattle'], ['classPassives', 'getEffectiveStats']],
    modules: ['battle', 'classPassives', 'variantRules', 'parser', 'clock'],
  },
  'rules02-independent': {
    file: path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'rules02-independent-node-cases.mjs'),
    groups: ['TR2-01', 'TR2-02', 'TR2-03', 'TR2-04'],
    requiredExports: [
      ['effectDefinitions', 'EFFECT_DEFINITIONS'], ['effectDefinitions', 'normalizeEffectTag'],
      ['effectDefinitions', 'effectDefinition'], ['effectDefinitions', 'skillSlots'],
      ['battle', 'createBattle'], ['parser', 'parseSkill'],
    ],
    modules: ['protocol', 'parser', 'battle', 'damage', 'range', 'clock', 'scheduler', 'lifecycle', 'scene', 'geometry', 'movement', 'ai',
      'effectDefinitions', 'effectHandlers', 'classPassives', 'variantRules'],
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

// 模块文件名 → 加载键（stageDef.modules 列出该阶段真正需要的模块）
const MODULE_FILES = {
  scenarioData: 'scenario-data.mjs',
  regions: 'regions.mjs',
  perception: 'perception.mjs',
  barriers: 'barriers.mjs',
  protocol: 'protocol.mjs',
  parser: 'parser.mjs',
  roster: 'roster.mjs',
  lifecycle: 'lifecycle.mjs',
  configPackage: 'config-package.mjs',
  storage: 'storage.mjs',
  scene: 'scene.mjs',
  generation: 'generation.mjs',
  geometry: 'geometry.mjs',
  mapArt: 'map-art.mjs',
  camera: 'camera.mjs',
  viewScope: 'view-scope.mjs',
  vfxHost: 'vfx-host.mjs',
  arcaneVfx: 'arcane-vfx.mjs',
  unitView: 'unit-view.mjs',
  main: 'main.mjs',
  clock: 'clock.mjs',
  scheduler: 'scheduler.mjs',
  movement: 'movement.mjs',
  range: 'range.mjs',
  damage: 'damage.mjs',
  ai: 'ai.mjs',
  battle: 'battle.mjs',
  fixture: 'demo-fixture.mjs',
  chapelScene: 'chapel-scene.mjs',
  reactionPrompt: 'reaction-prompt.mjs',
  director: 'action-director.mjs',
  fxRegistry: 'fx-registry.mjs',
  fxLibrary: 'fx-library.mjs',
  motion: 'motion.mjs',
  avHost: 'av-host.mjs',
  vendor: 'vendor/rpg-av/rpg-av.mjs',
  effectDefinitions: 'effect-definitions.mjs',
  effectHandlers: 'effect-handlers.mjs',
  classPassives: 'class-passives.mjs',
  variantRules: 'variant-rules.mjs',
};

async function loadModules(stageDef) {
  const modules = {};
  const list = stageDef.modules || ['protocol', 'parser', 'roster', 'lifecycle', 'configPackage', 'storage'];
  for (const key of list) {
    const file = MODULE_FILES[key];
    if (!file) throw new Error('未知模块键: ' + key);
    modules[key] = await import(pathToFileURL(path.join(ROOT, 'tactics', 'src', file)).href);
  }
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
  return { stage: stageName, passed, results };
}

function assertRequiredExports(modules, required) {
  // 数据常量白名单之外一律要求函数类型（T01-06 依赖该门禁：传不存在函数必须失败）
  const constants = new Set([
    'PROTOTYPES', 'RANGE_TYPES', 'TACTICS_ROSTER_KEY',
    'EFFECT_DEFINITIONS', 'CLASS_PASSIVES',
    'TEST_ROOM', 'DEFAULT_YAML_A', 'DEFAULT_YAML_B', 'DEFAULT_YAML_C', 'DEFAULT_PLACEMENTS',
  ]);
  for (const [mod, name] of required) {
    const value = modules[mod]?.[name];
    if (constants.has(name) ? value === undefined : typeof value !== 'function') {
      throw new Error('业务导出缺失或类型错误: ' + mod + '.' + name);
    }
  }
}
module.exports = { assertRequiredExports, runGroup, parseArgs };
if (require.main === module) main().catch(e => { fail(e && e.stack || String(e)); });
