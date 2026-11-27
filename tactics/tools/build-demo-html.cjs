'use strict';
// 战棋视听切片单文件打包：esbuild IIFE 内联 + CSS 内联；仅本地 Demo 分发，不是酒馆正则产物。
// 先校验回合制视听底座生成物未过期（extract-rpg-av --check 同一判定），再打包。
// 媒体（头像/音效/语音）按既有资源基址外链加载，是预期行为；业务 JS/CSS 必须零外部依赖。
// 替换一律用函数式 replacer，防止产物中的 $ 序列被 String.replace 替换语义破坏。
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');

const tacticsDir = path.resolve(__dirname, '..');
const esbuild = createRequire(path.join(tacticsDir, 'p00-probe', 'package.json'))('esbuild');
const { build: buildRpgAv } = require('./extract-rpg-av.cjs');
const { build: buildRpgUi } = require('./extract-rpg-ui.cjs');

// 产物专项断言：本轮新增与核心模块必须真实入包（存在性，不是仅字符串出现）
const REQUIRED_INPUTS = [
  'src/main.mjs', 'src/battle.mjs', 'src/actions.mjs', 'src/guard.mjs', 'src/movement.mjs', 'src/range.mjs',
  'src/damage.mjs', 'src/ai.mjs', 'src/generation.mjs', 'src/demo-fixture.mjs', 'src/clock.mjs',
  'src/scheduler.mjs', 'src/parser.mjs', 'src/vendor/js-yaml-4.1.0.mjs',
  'src/av-host.mjs', 'src/action-director.mjs', 'src/motion.mjs', 'src/range-overlay.mjs',
  'src/vendor/rpg-av/rpg-av.mjs', 'src/chapel-scene.mjs', 'src/chapel-art.mjs', 'src/ui-sfx.mjs',
  'src/vendor/rpg-ui/rpg-ui.mjs', 'src/unit-style.mjs', 'src/editor-panel.mjs',
  'src/fx-registry.mjs', 'src/fx-library.mjs', 'src/vfx-host.mjs',
  'src/effect-definitions.mjs', 'src/effect-handlers.mjs', 'src/class-passives.mjs', 'src/variant-rules.mjs',
  'src/reaction-prompt.mjs', 'src/ui-shell.mjs',
  'src/screen-atmos.mjs', 'src/screen-showpiece.mjs', 'src/guard-barrier-fx.mjs', 'src/status-ui.mjs', 'src/lore.mjs',
  'src/scenario-data.mjs', 'src/regions.mjs', 'src/perception.mjs', 'src/barriers.mjs', 'src/unit-view.mjs',
  '典型对局-战棋版.yaml',
];
// 复用模块关键函数必须进入产物（防止 tree-shaking 或误删导致"复用"名不副实）
const REQUIRED_SYMBOLS = ['playEnemyWindup', 'playAttackIdentityFx', 'playHitFeedback', 'classifyHit', 'playArsenicShot', 'CombatAudioMixer', 'HERO_VOICE_LINES', 'playSingleGunshot', 'playSingleShotgun', 'playSingleThunder', 'playSingleSlash', 'playSingleClaw', 'playSingleArrow', 'enemySpellProjectile',
  'renderTurnQueue', 'updateSkillMenus', 'createSkillCard', 'createSkillGroupCard', 'createItemCard', 'showTagTipFor',
  'buildSkillFormFieldsHtml', 'openSkillTypeCombo', 'createEditorPanel', 'playJump', 'playShove', 'playTransfer', 'drawJump',
  'createFxRegistry', 'registerDefaultFx', 'actionInput', 'reactionInput', 'createVfxHost', 'playReaction', 'revealSegment', 'evadeShift',
  'reactionKanpo', 'playPassiveGain', 'renderAllies',
  'createScenarioData', 'createSeededRandom', 'createRegion', 'runRegionContest', 'effectiveCastRange', 'moveMultiplier', 'canSeeUnit', 'previewBarrier', 'resolveCharge',
  'buildTypicalViewData', 'syncDynamicUnits', 'selectKanpo', 'planPriorityJump', 'playMainPointReceived', 'actionPayment', 'playPrepare', 'syncRegions', 'fogFieldHtml', 'prepareInput', 'revealEffect',
  'playGenericSupportFx', 'spawnHealParticles', 'playSupportEffects', 'supportResourceDelta', 'applyPersistentFxTags',
  'buildHitFeedback', 'avatarScaleForZoom', 'linkSkillGroupRows', 'prepareHitNumbers', 'animateHitNumber',
  'startAtmos', 'atmosStyleOf', 'FX_WEBM_KEY_MAX', 'mountShowpiece', 'SHOWPIECES',
  'previewGuard', 'commitGuard', 'autoSummonGuard', 'segmentDamage', 'resolveBarrierDamage', 'expireBarriers',
  'barrierCrossing', 'barrierContact', 'holdGuards', 'revealGuard', 'immunityReason',
  'playGuardDash', 'playGuardBlock', 'mountBarrierDome', 'playBarrierHit', 'playBarrierBlocked', 'playBarrierShatter', 'playRuleFx',
  'chooseTauntTarget', 'planIdleMove', 'statusBadges', 'compactStatusHtml', 'effectFloat', 'inspectorHtml', 'hitChance', 'predictTargets', 'toggleCostFilter', 'setPredict', 'resolveLore', 'SAMPLE_LORE',
  'playRescueGrit', 'playRescueAvoidFatal', 'playVariantResistFx', 'playCounterAttackL1', 'playPowerCounterEffect', 'spawnPowerBurst', 'spawnChargeUpParticles', 'queueCounters', 'revealCounter', 'playSelfDestructWindup', 'playSelfDestructBurst', 'setIdentitySfx', 'setVariantSfx', 'setStatusSfx', 'setSelfDestructSfx'];

const entry = [
  "import { createApp } from './src/main.mjs';",
  "import { DEMO_YAML, DEMO_PLACEMENTS } from './src/demo-fixture.mjs';",
  "import { generateTacticalScene } from './src/generation.mjs';",
  "import { createBattle } from './src/battle.mjs';",
  "import { parseYamlText } from './src/parser.mjs';",
  "import { createEncounterDemo, createEncounterScenario, createScenarioData, createSeededRandom } from './src/scenario-data.mjs';",
  "import { CHAPEL_SCENE } from './src/chapel-scene.mjs';",
  "import TYPICAL_YAML from '../doc/tactics/典型对局-战棋版.yaml';",
  'window.__TACTICS_BACKEND__ = { parseYamlText, createEncounterScenario, createScenarioData, createSeededRandom, createBattle, scene: CHAPEL_SCENE };',
  // 默认载入典型对局权威样本（打包时内联原文）；?demo=slice 回到旧视听切片，?demo=nave 使用单房间演示数据
  'const slice = /[?&]demo=slice(&|$)/.test(document.location.search);',
  'const singleRoom = /[?&]demo=nave(&|$)/.test(document.location.search);',
  'const app = createApp(document.getElementById("tactics-app"), {',
  '  ...(slice ? { defaultYaml: DEMO_YAML, defaultPlacements: DEMO_PLACEMENTS } : singleRoom ? createEncounterDemo(TYPICAL_YAML) : { defaultYaml: TYPICAL_YAML }), playable: true,',
  '});',
  'app.boot();',
  'window.__TACTICS_APP__ = { app, snapshot: () => app.sandbox.getSnapshot(),',
  '  loadYaml: (t, o) => app.loadYaml(t, o), playProjectile: (a, b, c) => app.playProjectile(a, b, c),',
  '  generateScene: options => generateTacticalScene(options),',
  '  resources: () => app.resources() };',
].join('\n');

(async () => {
  // 视听底座生成物必须与当前根 index.html 一致（过期即失败，不打包旧提取）
  const av = buildRpgAv();
  const avDir = path.join(tacticsDir, 'src', 'vendor', 'rpg-av');
  for (const [name, text] of [['rpg-av.mjs', av.js], ['rpg-av.css', av.css]]) {
    if (readFileSync(path.join(avDir, name), 'utf8').replace(/\r\n/g, '\n') !== text) throw new Error('视听底座生成物过期: ' + name + '（先运行 node tactics/tools/extract-rpg-av.cjs）');
  }
  const ui = buildRpgUi();
  const uiDir = path.join(tacticsDir, 'src', 'vendor', 'rpg-ui');
  for (const [name, text] of [['rpg-ui.mjs', ui.js], ['rpg-ui.css', ui.css]]) {
    if (readFileSync(path.join(uiDir, name), 'utf8').replace(/\r\n/g, '\n') !== text) throw new Error('原版界面生成物过期: ' + name + '（先运行 node tactics/tools/extract-rpg-ui.cjs）');
  }
  const result = await esbuild.build({
    absWorkingDir: tacticsDir,
    stdin: { contents: entry, resolveDir: tacticsDir, sourcefile: 'demo-entry.mjs' },
    loader: { '.yaml': 'text' },
    bundle: true, format: 'iife', platform: 'browser', target: 'es2020',
    minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, legalComments: 'none', metafile: true, write: false,
  });
  const inputs = Object.keys(result.metafile.inputs).map(p => p.replace(/\\/g, '/'));
  const missing = REQUIRED_INPUTS.filter(name => !inputs.some(p => p.endsWith(name)));
  if (missing.length) throw new Error('新代码未入包: ' + missing.join(', '));
  if (Object.values(result.metafile.outputs).some(o => o.imports.length)) throw new Error('产物仍含外部 import');

  // 顺序：原版界面（含 Tailwind 预置）在前，战棋样式同权重时覆盖；回合制特效样式最后
  const css = readFileSync(path.join(uiDir, 'rpg-ui.css'), 'utf8') + '\n' + readFileSync(path.join(tacticsDir, 'tactics.css'), 'utf8').replace(/^\uFEFF/, '') + '\n' + readFileSync(path.join(avDir, 'rpg-av.css'), 'utf8');
  // </script 只可能出现在字符串字面量内；转义斜杠不改变字符串值，防止提前闭合脚本
  const bundle = result.outputFiles[0].text.split('</script').join('<\\/script');
  const lostSymbols = REQUIRED_SYMBOLS.filter(s => !new RegExp('\\b' + s + '\\b').test(bundle));
  if (lostSymbols.length) throw new Error('复用模块关键函数未入包: ' + lostSymbols.join(', '));
  if (/<link[^>]+stylesheet|<script[^>]+src=/i.test(css + bundle)) throw new Error('产物含外部业务 CSS/JS 引用');
  const html = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>战棋战斗 · 三层礼拜堂 Demo（单文件）</title>',
    '<style>', css, '</style>',
    '</head>',
    '<body>',
    '<div id="tactics-app"></div>',
    '<script>', bundle, '</script>',
    '</body>',
    '</html>',
  ].join('\n');
  const closes = html.split('</script').length - 1; // 仅允许模板自身的 1 个闭合标签
  if (closes !== 1) throw new Error('脚本闭合标签数量异常: ' + closes);
  const out = path.join(tacticsDir, 'mvp-standalone.html');
  writeFileSync(out, html);
  console.log(JSON.stringify({
    artifact: 'tactics/mvp-standalone.html',
    bytes: Buffer.byteLength(html),
    sha256: createHash('sha256').update(html).digest('hex'),
    bundled: inputs.length, asserted: REQUIRED_INPUTS.length, symbols: REQUIRED_SYMBOLS.length,
    builtAt: new Date().toISOString(), rpgAvSource: av.report.sourceSha,
  }));
})().catch(e => { console.error('[build-demo-html] FAIL: ' + (e && e.message || e)); process.exit(1); });
