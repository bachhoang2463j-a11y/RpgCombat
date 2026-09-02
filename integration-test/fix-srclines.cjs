// 修复 srcLine 错位：工作区规则表的 srcLine 值被打乱，但规则本身（re/build）与 HEAD 一致。
// 步骤：① 工作区规则块按出现顺序与 HEAD 规则块按出现顺序逐条对应（表结构未变），
//       用 HEAD 的正确 srcLine 值替换工作区对应位置的值（即恢复 HEAD 基线）；
//       ② HEAD 调用行号 → 工作区调用行号，按各自升序顺序一一对应，重写最终值。
const fs = require('fs');
const { execSync } = require('child_process');
const path = 'D:/Project/RpgCombat/index.html';

const html = fs.readFileSync(path, 'utf8');
const headHtml = execSync('git show HEAD:index.html').toString();

// 工作区与 HEAD 的规则块
const bs = html.indexOf('const DIGEST_RULES = [');
const be = html.indexOf('];', bs);
const block = html.slice(bs, be);
const hbs = headHtml.indexOf('const DIGEST_RULES = [');
const hbe = headHtml.indexOf('];', hbs);
const headBlock = headHtml.slice(hbs, hbe);

// 规则出现次数必须一致（表未增删）
const curMatches = [...block.matchAll(/srcLine: (\d+)/g)];
const headMatches = [...headBlock.matchAll(/srcLine: (\d+)/g)];
if (curMatches.length !== headMatches.length) {
  console.log('规则数不一致：工作区', curMatches.length, 'HEAD', headMatches.length);
  process.exit(1);
}

// ① 恢复 HEAD 基线：按出现位置逐条替换为 HEAD 对应值
let pos = 0;
const out = [];
curMatches.forEach((m, i) => {
  out.push(block.slice(pos, m.index));
  out.push('srcLine: ' + headMatches[i][1]);
  pos = m.index + m[0].length;
});
out.push(block.slice(pos));
let html1 = html.slice(0, bs) + out.join('') + html.slice(be);

// ② 顺序映射：HEAD 规则升序 → 工作区调用升序（按位对应）
// HEAD 基线已在手（headMatches 行号），HEAD 调用行号 = 同文件；工作区调用行号重算
const lines1 = html1.split('\n');
const srcCalls = [];
lines1.forEach((l, idx) => {
  if (!/addHistory\(\s*(['`}]|\s*removed)/.test(l)) return;
  const t = (l.match(/addHistory\(\s*(?:removed\.length\s*\?\s*)?['`](.*)/) || [])[1] || '';
  if (t.startsWith('[对话]')) return;
  srcCalls.push(idx + 1);
});
const headLines = headHtml.split('\n');
const headCalls = [];
headLines.forEach((l, idx) => {
  if (!/addHistory\(\s*(['`}]|\s*removed)/.test(l)) return;
  const t = (l.match(/addHistory\(\s*(?:removed\.length\s*\?\s*)?['`](.*)/) || [])[1] || '';
  if (t.startsWith('[对话]')) return;
  headCalls.push(idx + 1);
});
if (headCalls.length !== srcCalls.length) {
  console.log('调用数不一致：HEAD', headCalls.length, '工作区', srcCalls.length);
  process.exit(1);
}
// HEAD 规则值（按表序）映射到工作区调用行：HEAD 规则值本身是 HEAD 调用行号的一个子集/序列，
// 需要把 HEAD 调用行号序列映射到工作区行号：headCalls[i] → srcCalls[i]（都升序）
const hToW = new Map();
headCalls.forEach((hn, i) => hToW.set(hn, srcCalls[i]));

// ③ 用 hToW 重写规则块
const bs3 = html1.indexOf('const DIGEST_RULES = [');
const be3 = html1.indexOf('];', bs3);
const block3 = html1.slice(bs3, be3);
let pos3 = 0;
const out3 = [];
for (const m of block3.matchAll(/srcLine: (\d+)/g)) {
  out3.push(block3.slice(pos3, m.index));
  const old = parseInt(m[1], 10);
  const neu = hToW.get(old);
  if (neu == null) {
    // 规则指向的 HEAD 行不在调用集合中（应为自身即调用行，正常都能找到）
    console.log('无映射:', old);
    process.exit(1);
  }
  out3.push('srcLine: ' + neu);
  pos3 = m.index + m[0].length;
}
out3.push(block3.slice(pos3));
const html2 = html1.slice(0, bs3) + out3.join('') + html1.slice(be3);
fs.writeFileSync(path, html2);
console.log('已重写', curMatches.length, '条 srcLine（恢复 HEAD 表序 + 顺序映射）');

// ④ 复验
const htmlF = fs.readFileSync(path, 'utf8');
const linesF = htmlF.split('\n');
const srcCallsF = new Set();
linesF.forEach((l, idx) => {
  if (!/addHistory\(\s*(['`}]|\s*removed)/.test(l)) return;
  const t = (l.match(/addHistory\(\s*(?:removed\.length\s*\?\s*)?['`](.*)/) || [])[1] || '';
  if (t.startsWith('[对话]')) return;
  srcCallsF.add(idx + 1);
});
const bsF = htmlF.indexOf('const DIGEST_RULES = [');
const beF = htmlF.indexOf('];', bsF);
const ruleLinesF = new Set();
for (const mm of htmlF.slice(bsF, beF).matchAll(/srcLine: (\d+)/g)) ruleLinesF.add(parseInt(mm[1], 10));
const missRule = [...srcCallsF].filter((x) => !ruleLinesF.has(x));
const missSrc = [...ruleLinesF].filter((x) => !srcCallsF.has(x));
console.log('复验: 调用', srcCallsF.size, '规则', ruleLinesF.size,
  missRule.length + missSrc.length === 0 ? '=== 对齐 ===' : '仍错位 miss=' + (missRule.length + missSrc.length));
