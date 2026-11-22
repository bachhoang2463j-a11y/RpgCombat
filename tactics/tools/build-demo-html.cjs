'use strict';
// MVP 单文件版打包：esbuild IIFE 内联 + CSS 内联；仅本地 Demo 分发，不是酒馆正则产物。
// 替换一律用函数式 replacer，防止产物中的 $ 序列被 String.replace 替换语义破坏。
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');

const tacticsDir = path.resolve(__dirname, '..');
const esbuild = createRequire(path.join(tacticsDir, 'p00-probe', 'package.json'))('esbuild');

// 产物专项断言：本轮新增与核心模块必须真实入包（存在性，不是仅字符串出现）
const REQUIRED_INPUTS = [
  'src/main.mjs', 'src/battle.mjs', 'src/movement.mjs', 'src/range.mjs',
  'src/damage.mjs', 'src/ai.mjs', 'src/demo-fixture.mjs', 'src/clock.mjs',
  'src/scheduler.mjs', 'src/parser.mjs', 'src/vendor/js-yaml-4.1.0.mjs',
];

const entry = [
  "import { createApp } from './src/main.mjs';",
  "import { DEMO_YAML, DEMO_PLACEMENTS } from './src/demo-fixture.mjs';",
  'const app = createApp(document.getElementById("tactics-app"), {',
  '  defaultYaml: DEMO_YAML, defaultPlacements: DEMO_PLACEMENTS, playable: true,',
  '});',
  'app.boot();',
  'window.__TACTICS_APP__ = { app, snapshot: () => app.sandbox.getSnapshot(),',
  '  loadYaml: (t, o) => app.loadYaml(t, o), playProjectile: (a, b, c) => app.playProjectile(a, b, c) };',
].join('\n');

(async () => {
  const result = await esbuild.build({
    absWorkingDir: tacticsDir,
    stdin: { contents: entry, resolveDir: tacticsDir, sourcefile: 'demo-entry.mjs' },
    bundle: true, format: 'iife', platform: 'browser', target: 'es2020',
    minify: true, legalComments: 'none', metafile: true, write: false,
  });
  const inputs = Object.keys(result.metafile.inputs).map(p => p.replace(/\\/g, '/'));
  const missing = REQUIRED_INPUTS.filter(name => !inputs.some(p => p.endsWith(name)));
  if (missing.length) throw new Error('新代码未入包: ' + missing.join(', '));
  if (Object.values(result.metafile.outputs).some(o => o.imports.length)) throw new Error('产物仍含外部 import');

  const css = readFileSync(path.join(tacticsDir, 'tactics.css'), 'utf8');
  // </script 只可能出现在字符串字面量内；转义斜杠不改变字符串值，防止提前闭合脚本
  const bundle = result.outputFiles[0].text.split('</script').join('<\\/script');
  const html = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>战棋战斗 · 最小可玩 Demo（单文件）</title>',
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
    bundled: inputs.length, asserted: REQUIRED_INPUTS.length,
  }));
})().catch(e => { console.error('[build-demo-html] FAIL: ' + (e && e.message || e)); process.exit(1); });
