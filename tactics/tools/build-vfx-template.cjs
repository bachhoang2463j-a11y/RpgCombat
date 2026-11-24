// 打包战棋新特效研发空白母版（独立单文件 HTML）
// 特点：上半段 IIFE 底座保留完整换行与原函数名（不压成单行天书，报错行号清晰）；
//       下半段保留明文未压缩 <style id="vfx-custom-css"> 与 <script id="vfx-workbench">，复制即可手改预览。
const path = require('path');
const { readFileSync, writeFileSync } = require('fs');
const { createHash } = require('crypto');

const tacticsDir = path.resolve(__dirname, '..');
const repoDir = path.resolve(tacticsDir, '..');
const esbuild = require(path.join(tacticsDir, 'p00-probe', 'node_modules', 'esbuild'));

const entry = [
  "import { installVfxTemplateStage } from './src/vfx-template-host.mjs';",
  "import TYPICAL_YAML from '../doc/tactics/典型对局-战棋版.yaml';",
  "installVfxTemplateStage(document.getElementById('tactics-app'), { yamlText: TYPICAL_YAML });",
].join('\n');

const workbenchJs = [
  '// ===== 1. 解构战棋原生画法工具箱（与 tactics/src/fx-library.mjs 完全同名同参） =====',
  'const {',
  '  PX, worldPx, bez, orbHtml, particles, glowDefs, runeHtml, ringHtml,',
  '  flyOrb, trail, floatText, tint, worldDarken, playWebmFx: webm, spin, grow,',
  '  checkBudget, GRADE_BUDGETS,',
  '} = window.__TACTICS_VFX_STAGE__;',
  '',
  '// ===== 2. 新特效编写区 BEGIN（定稿后直接原样拷入 tactics/src/fx-library.mjs 的 DEFAULT_FX_ENTRIES） =====',
  'const CUSTOM_FX_ENTRIES = [',
  '  // 示例（默认留空）：',
  '  // {',
  "  //   id: 'my-skill-fx', grade: 'L3', fxTags: ['新技能标签'],",
  '  //   timeline: { chargeMs: 900, totalMs: 2200, fullscreen: true, darken: false },',
  "  //   cues: [{ key: 'explosion_aoe_blast', vol: 0.65 }],",
  "  //   prepareKeys() { return ['explosion_aoe_blast']; },",
  '  //   async play(ctx) { ... }',
  '  // }',
  '];',
  '// ===== 新特效编写区 END =====',
  '',
  '// ===== 3. 演示按钮 CARDS 区 BEGIN（仅驱动演练面板，不参与移植） =====',
  "// casterId: 'h:埃利奥特' | 'h:弗兰克' | 'h:玛德琳' | 'h:索恩'",
  "// targetIds: ['e:深潜者A', 'e:深潜者B', 'e:食尸鬼A', 'e:食尸鬼B', 'e:伊塔库亚的眷族', 'e:犹格索托斯之子']",
  'const CARDS = [];',
  '// ===== 演示按钮 CARDS 区 END =====',
  '',
  'window.__TACTICS_VFX_STAGE__.boot({ customEntries: CUSTOM_FX_ENTRIES, cards: CARDS });',
].join('\n');

// 纯净母版构建插件：拦截 action-director 对 fx-library.mjs 的静态引入，剥离 50+ 既有条目库，零改正式源码
const stripFxLibraryPlugin = {
  name: 'strip-fx-library',
  setup(build) {
    build.onResolve({ filter: /fx-library\.mjs$/ }, args => ({ path: args.path, namespace: 'fx-library-stub' }));
    build.onLoad({ filter: /.*/, namespace: 'fx-library-stub' }, () => ({
      contents: [
        "export const EXTRA_AUDIO = { light01: 'light01.mp3', thunder01: 'thunder01.mp3', weimu: 'weimu.wav', sheshen_armor_step: 'sheshen_armor_step.mp3', parry_heavy: 'parry_Weapon_GuardBreak.wav' };",
        'export function registerDefaultFx(reg) { return reg; }',
        'export function fogFieldHtml() { return ""; }',
        'export function animateFogField() {}',
      ].join('\n'),
      loader: 'js',
    }));
  },
};

(async () => {
  const result = await esbuild.build({
    absWorkingDir: tacticsDir,
    stdin: { contents: entry, resolveDir: tacticsDir, sourcefile: 'vfx-template-entry.mjs' },
    loader: { '.yaml': 'text' },
    plugins: [stripFxLibraryPlugin],
    bundle: true, format: 'iife', platform: 'browser', target: 'es2020',
    minifyWhitespace: false, minifySyntax: false, minifyIdentifiers: false,
    legalComments: 'inline', metafile: true, write: false,
  });

  const inputs = Object.keys(result.metafile.inputs).map(p => p.replace(/\\/g, '/'));
  if (inputs.some(p => p.endsWith('src/fx-library.mjs'))) {
    throw new Error('纯净母版不应打包 50+ 既有条目库 src/fx-library.mjs');
  }
  if (Object.values(result.metafile.outputs).some(o => o.imports.length)) {
    throw new Error('产物仍含外部 import');
  }

  const uiDir = path.join(tacticsDir, 'src', 'vendor', 'rpg-ui');
  const avDir = path.join(tacticsDir, 'src', 'vendor', 'rpg-av');
  const css = [
    readFileSync(path.join(uiDir, 'rpg-ui.css'), 'utf8'),
    readFileSync(path.join(tacticsDir, 'tactics.css'), 'utf8').replace(/^\uFEFF/, ''),
    readFileSync(path.join(avDir, 'rpg-av.css'), 'utf8'),
  ].join('\n');

  const bundle = result.outputFiles[0].text.split('</script').join('<\\/script');
  if (/<link[^>]+stylesheet|<script[^>]+src=/i.test(css + bundle)) {
    throw new Error('产物含外部业务 CSS/JS 引用');
  }

  const html = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>战棋技能演练 · 空白模板（单文件）</title>',
    '<style>', css, '</style>',
    '<style id="vfx-custom-css">',
    '/* ===== 新特效 CSS 编写区 BEGIN（移植时同步合并到 tactics/tactics.css） ===== */',
    '/* ===== 新特效 CSS 编写区 END ===== */',
    '</style>',
    '</head>',
    '<body>',
    '<div id="tactics-app"></div>',
    '<script id="vfx-runtime-base">', bundle, '</script>',
    '<script id="vfx-workbench">', workbenchJs, '</script>',
    '</body>',
    '</html>',
  ].join('\n');

  const closes = html.split('</script').length - 1;
  if (closes !== 2) throw new Error('脚本闭合标签数量异常: ' + closes);

  const out = path.join(tacticsDir, 'demo-skill-vfx-template.html');
  writeFileSync(out, html);
  console.log(JSON.stringify({
    artifact: path.relative(repoDir, out).replace(/\\/g, '/'),
    bytes: Buffer.byteLength(html),
    sha256: createHash('sha256').update(html).digest('hex'),
    bundled: inputs.length,
    fxLibraryIncluded: false,
  }));
})().catch(e => { console.error('[build-vfx-template] FAIL: ' + (e && e.message || e)); process.exit(1); });
