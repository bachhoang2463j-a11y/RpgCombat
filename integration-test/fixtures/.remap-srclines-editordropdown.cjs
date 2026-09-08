// srcLine 重映射（本次技能编辑器改动）：HEAD 调用行（升序）一一映射到工作区调用行（升序），
// 重写 DIGEST_RULES 表并复验。口径与 harness「行号集合完全对齐」断言完全一致。
const fs = require('fs');
const { execSync } = require('child_process');
const path = 'D:/Project/RpgCombat/index.html';

const callsOf = (src) => {
  const out = [];
  src.split('\n').forEach((l, idx) => {
    if (!/addHistory\(\s*(['`]|\s*removed)/.test(l)) return;
    const t = (l.match(/addHistory\(\s*(?:removed\.length\s*\?\s*)?['`](.*)/) || [])[1] || '';
    if (t.startsWith('[对话]')) return;
    out.push(idx + 1);
  });
  return out;
};

const html = fs.readFileSync(path, 'utf8');
const headHtml = execSync('git -C D:/Project/RpgCombat show HEAD:index.html', { maxBuffer: 32 * 1024 * 1024 }).toString();
const headCalls = callsOf(headHtml).sort((a, b) => a - b);
const srcCalls = callsOf(html).sort((a, b) => a - b);
if (headCalls.length !== srcCalls.length) throw new Error('调用数不一致：HEAD ' + headCalls.length + ' vs 工作区 ' + srcCalls.length);
const map = new Map();
headCalls.forEach((h, i) => map.set(h, srcCalls[i]));

const bs = html.indexOf('const DIGEST_RULES = ['), be = html.indexOf('];', bs);
const seg = html.slice(bs, be);
let n = 0;
const newSeg = seg.replace(/srcLine: (\d+)/g, (m, d) => {
  const nv = map.get(parseInt(d, 10));
  if (nv === undefined) throw new Error('表值 ' + d + ' 不在 HEAD 调用集合中');
  n++;
  return 'srcLine: ' + nv;
});
if (n !== headCalls.length) console.log('注：表条目 ' + n + ' != 调用数 ' + headCalls.length + '（表含重复值，集合口径仍校验）');
fs.writeFileSync(path, html.slice(0, bs) + newSeg + html.slice(be));

// 复验：表集合 == 工作区调用集合
const v = fs.readFileSync(path, 'utf8');
const bs2 = v.indexOf('const DIGEST_RULES = ['), be2 = v.indexOf('];', bs2);
const ruleSet = new Set();
for (const m of v.slice(bs2, be2).matchAll(/srcLine: (\d+)/g)) ruleSet.add(parseInt(m[1], 10));
const callSet = new Set(callsOf(v));
const miss1 = [...callSet].filter((x) => !ruleSet.has(x));
const miss2 = [...ruleSet].filter((x) => !callSet.has(x));
console.log('复验: 调用 ' + callSet.size + ' 规则 ' + ruleSet.size + (miss1.length + miss2.length === 0 ? ' === 对齐 ===' : ' 仍错位 miss=' + (miss1.length + miss2.length)));
