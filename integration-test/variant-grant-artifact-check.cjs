#!/usr/bin/env node
'use strict';
// 真实维护版产物专项；行为结算另由同一产物的 iframe 回归验证。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const artifact = path.resolve(ROOT, process.argv[2] || 'regex-前端战斗v12_14.json');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(artifact, 'utf8'));
const fenced = pkg.replaceString;
const immune = fenced.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '');
const raw = immune.replace(/&amp;/g, '&');
let passed = 0, failed = 0;
const count = (s, needle) => s.split(needle).length - 1;
function check(ok, label) {
  console.log((ok ? '[PASS] ' : '[FAIL] ') + label);
  ok ? passed++ : failed++;
}
function syntax(text, label) {
  const scripts = [...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  try {
    scripts.forEach(m => new vm.Script(m[1]));
    check(scripts.length === 2, label + '两个内联脚本语法通过');
  } catch (e) { check(false, label + '语法：' + e.message); }
}

console.log('== v12.14 限时赋予产物专项 ==');
check(path.basename(artifact) === 'regex-前端战斗v12_14.json' && pkg.scriptName === '前端战斗v12.14', '版本名与文件名一致');
check(count(src, '```') === 2 && count(fenced, '```') === 2, '源码与产物仅头尾自围栏');
check(!immune.includes('```'), '内联围栏加固');
check(!/&(?!amp;)/.test(immune) && raw.replace(/&/g, '&amp;') === immune, '实体免疫与单遍还原逐字符一致');
check(!/\$[$&`'\d<]/.test(immune), '捕获组替换序列免疫');
syntax(src, '源码'); syntax(raw, '产物');
check(count(raw, 'monsterAttack') === 3, 'monsterAttack恰3处：资产表、红单体前摇、自爆');
check(raw.includes('192.168.110.83:8766') && !raw.includes('cdn.tailwindcss.com'), '内网资源与静态Tailwind隔离');
check(!raw.includes('variant-grant-regression-stage') && !raw.includes('runVariantGrantRegression'), '测试夹具不进入维护包');

const names = ['流体', '虚形', '破法', '要害', '防火', '耐毒', '钢体', '再生', '狂暴', '吸血', '荆棘', '复活'];
const namesMatch = raw.match(/VARIANT_GRANT_NAMES\s*=\s*(\[[^;]+?\])/);
let packedNames = [];
if (namesMatch) packedNames = vm.runInNewContext(namesMatch[1]);
check(JSON.stringify(packedNames) === JSON.stringify(names), '12个赋予名完整入包，无智慧/蜕皮/连动/自爆');
for (const name of ['getGrantedVariantName', 'hasVariantTag', 'canReviveEntity', 'tryReviveEnemy', 'syncGrantSlotPower']) {
  check(count(raw, 'function ' + name + '(') === 1, '共享函数唯一入包：' + name);
}
check(raw.includes('赋予:') && /registerTagHandler\(["']赋予["']/.test(raw), '完整标签语法与赋予处理器入包');
check(raw.includes('variantReviveUsed') && raw.includes('canReviveEntity') && src.includes('grantedReviveAtTick'), '本场复活消费与DoT结算前资格入包');
check(raw.includes('data-variant=') && raw.includes('剩余') && raw.includes('arcane-status-badge-expiring'), '限时变种徽章、剩余回合与临期样式入包');
check(raw.includes('赋予·') && raw.includes('重施不恢复机会'), '赋予可读名与一次性复活说明入包');
check(raw.includes('Math.max') && raw.includes('variant'), '临时Buff及续期通道入包');
check(raw.includes('hasSingleBuff') && /getGrantedVariantName/.test(raw), '玩家目标分类与AI赋予查询入包');
check(raw.includes('VARIANT_GRANT_TIPS') && names.every(n => raw.includes(n)), '12种效果说明入包');

console.log('SUMMARY ' + JSON.stringify({ artifact:path.basename(artifact), passed, failed }));
process.exitCode = failed ? 1 : 0;
