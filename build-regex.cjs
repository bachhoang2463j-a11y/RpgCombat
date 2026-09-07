#!/usr/bin/env node
/** 正则产物构建（含产物压缩）——从 index.html 生成/更新酒馆正则 JSON 的 replaceString。
 *  用法：node build-regex.cjs
 *  流程：① 自动先跑 build-tailwind.cjs（类名产物保持最新，幂等）
 *        ② 产物压缩（源码 index.html 保持可读，只压嵌入正则的副本）：
 *           - 每个内联 <script> 过 terser（--mangle；evaluate=false 防常量折叠；
 *             --comments 保留 @license）
 *           - 围栏加固：源码特意用 \u0060 转义的反引号会被 terser 反转义回字面反引号，
 *             3+ 连破坏围栏配对；改回转义形式（字符串/正则语义等价）
 *           - html-minifier-terser 压 HTML 空白/注释与 CSS（不碰脚本内容）
 *           - 全量 & 实体免疫：产物内所有 & 改写为 &amp;，酒馆管线的实体解码
 *             （含 &&notify 的无分号 &not→¬ 实测雷）还原后逐字节一致
 *        ③ 更新 regex-前端战斗*.json 的 replaceString（其余字段 id/findRegex 等原样保留）
 *  依赖：npx（首次运行下载 terser@5 / html-minifier-terser@7）。
 *  注意：改 index.html 后重跑本脚本即可；改了 Tailwind 类名也无需单独跑 build-tailwind（本脚本会先跑）。 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const HTML = path.join(ROOT, 'index.html');
const TMP = path.join(ROOT, '.tmp-minify');

function fail(msg) { console.error('[build-regex] 失败：' + msg); process.exit(1); }

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

    // 2) 逐块 terser + 围栏加固（详见文件头注释）
    for (let i = 0; i < slots.length; i++) {
      const inFile = path.join(TMP, 'in-' + i + '.js');
      const outFile = path.join(TMP, 'out-' + i + '.js');
      fs.writeFileSync(inFile, slots[i]);
      execSync(
        'npx -y terser@5 "' + inFile + '" --compress evaluate=false --mangle --comments "/@license/" -o "' + outFile + '"',
        { cwd: ROOT, stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 }
      );
      const min = fs.readFileSync(outFile, 'utf8');
      // 围栏加固：源码里特意用 \u0060 转义的反引号（提示词文本的 ```yaml 代码块示例等）
      // 会被 terser 反转义回字面反引号，3+ 连反引号会破坏组件围栏配对（harness test19）；
      // 改回转义形式（字符串/正则字面量里语义完全等价）
      const fencedIn = min.replace(/`{3,}/g, (m) => '\\u0060'.repeat(m.length));
      if (/`{3,}/.test(fencedIn)) fail('脚本块 #' + i + ' 围栏加固后仍残留 3+ 连反引号');
      new Function(fencedIn); // 语法级断言
      if (fencedIn.includes('</scr' + 'ipt')) fail('脚本块 #' + i + ' 含 </script，会截断内联脚本');
      out = out.replace('<!--__MINIFY_SLOT_' + i + '__-->', () => '<script>' + fencedIn.trim() + '</script>');
    }

    // 3) HTML 空白/注释 + CSS 压缩（不碰脚本内容）
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

    // 5) 全量 & 实体免疫：酒馆管线对代码块内容做 HTML 实体解码，且包含无分号旧式
    //    实体（实测 &&notify 的 &not → ¬ 炸语法）——代码位置的 & 无法用 JS 转义规避。
    //    统一把产物中所有 & 改写为 &amp;：管线单遍解码后逐字符还原（代码/字符串/
    //    HTML 文本/属性/CSS 皆然），解码结果与改写前逐字节一致（下方断言），
    //    从根上免疫管线的任何实体解码行为（含分号/无分号/数字形式）。
    const immune = minified.replace(/&/g, '&amp;');
    if (/&(?!amp;)/.test(immune)) fail('全量 & 转义后仍存在非 &amp; 形式的 & 序列');
    if (immune.replace(/&amp;/g, '&') !== minified) fail('&amp; 还原一致性校验失败');
    return immune;
  } finally {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
}

// ---------- 主流程 ----------
// ① Tailwind 产物保持最新（幂等；类名没变时产物不变）
console.log('[build-regex] 前置：node build-tailwind.cjs');
try {
  execSync('node build-tailwind.cjs', { cwd: ROOT, stdio: 'inherit' });
} catch (e) { fail('build-tailwind.cjs 失败，中止'); }

// ② 读源码、剥围栏、压缩
let html = fs.readFileSync(HTML, 'utf8');
html = html.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '');
if (!/<\/html>/i.test(html)) fail('index.html 内容异常：未找到 </html>');
const srcLen = html.length;
const minified = buildMinifiedHtml(html);
console.log('[build-regex] 产物压缩：' + srcLen + ' -> ' + minified.length + ' 字符（-' +
  Math.round((1 - minified.length / srcLen) * 100) + '%）');

// ③ 更新正则 JSON（只替换 replaceString，其余字段原样保留）
const files = fs.readdirSync(ROOT).filter((f) => /^regex-前端战斗.*\.json$/.test(f));
if (files.length !== 1) fail('根目录应有且仅有一个 regex-前端战斗*.json，实际：' + files.join(', '));
const jsonPath = path.join(ROOT, files[0]);
const script = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
script.replaceString = '```html\n' + minified + '\n```';
fs.writeFileSync(jsonPath, JSON.stringify(script, null, 4));
console.log('[build-regex] 已更新 ' + files[0] + '（replaceString ' + script.replaceString.length +
  ' 字符；id ' + script.id + '）');
