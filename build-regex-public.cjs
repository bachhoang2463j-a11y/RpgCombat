#!/usr/bin/env node
/** 公开版正则产物构建（含产物压缩）——从 index-公开版.html 生成酒馆正则 JSON 的 replaceString。
 *  用法：node build-regex-public.cjs
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = __dirname;
const HTML = path.join(ROOT, 'index-公开版.html');
const TMP = path.join(ROOT, '.tmp-minify-public');
const TEMPLATE_JSON = path.join(ROOT, 'regex-前端战斗v11_2.json');
const OUTPUT_JSON = path.join(ROOT, 'regex-前端战斗v11_2-公开版.json');

function fail(msg) { console.error('[build-regex-public] 失败：' + msg); process.exit(1); }

// ---------- 产物压缩 ----------
function buildMinifiedHtml(html) {
  fs.mkdirSync(TMP, { recursive: true });
  try {
    // 1) 抽出有内容的内联 <script>（跳过外链与空块），占位待回填
    const slots = [];
    let out = html.replace(
      /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi,
      (m, code) => {
        if (!code.trim()) return m;
        slots.push(code);
        return '<!--__MINIFY_SLOT_' + (slots.length - 1) + '__-->';
      }
    );

    // 2) 逐块 terser + 围栏加固
    for (let i = 0; i < slots.length; i++) {
      const inFile = path.join(TMP, 'in-' + i + '.js');
      const outFile = path.join(TMP, 'out-' + i + '.js');
      fs.writeFileSync(inFile, slots[i]);
      execSync(
        'npx -y terser@5 "' + inFile + '" --compress evaluate=false --mangle reserved=[\'$\'] --comments "/@license/" -o "' + outFile + '"',
        { cwd: ROOT, stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 }
      );
      const min = fs.readFileSync(outFile, 'utf8');
      const fencedIn = min.replace(/`{3,}/g, (m) => '\\u0060'.repeat(m.length));
      if (/`{3,}/.test(fencedIn)) fail('脚本块 #' + i + ' 围栏加固后仍残留 3+ 连反引号');
      new Function(fencedIn); // 语法级断言
      if (fencedIn.includes('</scr' + 'ipt')) fail('脚本块 #' + i + ' 含 </script，会截断内联脚本');
      out = out.replace('<!--__MINIFY_SLOT_' + i + '__-->', () => '<script>' + fencedIn.trim() + '</script>');
    }

    // 3) HTML 空白/注释 + CSS 压缩
    const inHtml = path.join(TMP, 'in.html');
    fs.writeFileSync(inHtml, out);
    const minified = execSync(
      'npx -y html-minifier-terser@7 "' + inHtml + '" --collapse-whitespace --remove-comments --minify-css',
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }
    ).toString('utf8');

    // 4) 产物断言
    if (!/<\/html>/i.test(minified)) fail('压缩产物缺少 </html>');
    if (minified.includes('```')) fail('压缩产物含裸三反引号，违反围栏纪律');
    for (const sentinel of ['id="battle-result-modal"', '<canvas']) {
      if (!minified.includes(sentinel)) fail('压缩产物缺少结构哨兵 ' + sentinel);
    }

    // 5) 全量 & 实体免疫
    const immune = minified.replace(/&/g, '&amp;');
    if (/&(?!amp;)/.test(immune)) fail('全量 & 转义后仍存在非 &amp; 形式的 & 序列');
    if (immune.replace(/&amp;/g, '&') !== minified) fail('&amp; 还原一致性校验失败');

    // 6) 正则捕获组替换免疫
    const dollarHit = immune.match(/\$[$&`'\d<]/);
    if (dollarHit) fail('产物含 $ 捕获组替换序列 ' + JSON.stringify(dollarHit[0]) +
      '（酒馆正则会顶替为捕获组内容）：' + immune.slice(Math.max(0, dollarHit.index - 60), dollarHit.index + 20));
    return immune;
  } finally {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
}

// ---------- 主流程 ----------
// ① 读 index-公开版.html
if (!fs.existsSync(HTML)) fail('未找到 index-公开版.html');
let html = fs.readFileSync(HTML, 'utf8');
html = html.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '');
if (!/<\/html>/i.test(html)) fail('index-公开版.html 内容异常：未找到 </html>');
const srcLen = html.length;

// ② 压缩产物
console.log('[build-regex-public] 开始压缩 index-公开版.html...');
const minified = buildMinifiedHtml(html);
console.log('[build-regex-public] 产物压缩：' + srcLen + ' -> ' + minified.length + ' 字符（-' +
  Math.round((1 - minified.length / srcLen) * 100) + '%）');

// ③ 生成正则 JSON
if (!fs.existsSync(TEMPLATE_JSON)) fail('未找到模板 JSON: ' + TEMPLATE_JSON);
const script = JSON.parse(fs.readFileSync(TEMPLATE_JSON, 'utf8'));
// 生成唯一新 UUID，避免与原版冲突
script.id = crypto.randomUUID();
script.scriptName = '前端战斗v11.2（公开版）';
script.replaceString = '```html\n' + minified + '\n```';

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(script, null, 4), 'utf8');
console.log('[build-regex-public] 成功生成 ' + path.basename(OUTPUT_JSON) +
  '（replaceString ' + script.replaceString.length + ' 字符；id ' + script.id + '）');
