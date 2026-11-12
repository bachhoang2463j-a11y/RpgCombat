#!/usr/bin/env node
'use strict';
// 独立检查真实正则产物：只读、离线，不运行战斗或访问资源服务。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const artifact = path.resolve(ROOT, process.argv[2] || 'regex-前端战斗v12_0.json');
const pkg = JSON.parse(fs.readFileSync(artifact, 'utf8'));
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const fenced = pkg.replaceString;
const immune = fenced.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '');
const raw = immune.replace(/&amp;/g, '&');
let pass = 0, fail = 0;
const count = (text, needle) => text.split(needle).length - 1;
function check(ok, label) { console.log((ok ? '[PASS] ' : '[FAIL] ') + label); ok ? pass++ : fail++; }
function objectOf(text, name) {
  const match = text.match(new RegExp('\\b' + name + '\\s*=\\s*\\{'));
  if (!match) throw new Error('未找到对象：' + name);
  const start = match.index + match[0].length - 1;
  let depth = 0, quote = '';
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; }
    else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return vm.runInNewContext('(' + text.slice(start, i + 1) + ')', { ASSET_BASE:'http://192.168.110.83:8766' });
  }
  throw new Error('对象未闭合：' + name);
}
function syntax(text, label) {
  const scripts = [...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  try { scripts.forEach(m => new vm.Script(m[1])); check(scripts.length === 2, label + '两个内联脚本语法通过'); }
  catch (e) { check(false, label + '语法：' + e.message); }
}
console.log('== 攻击身份与命中分层 v12.0 产物专项 ==');
check(path.basename(artifact) === 'regex-前端战斗v12_0.json' && pkg.scriptName === '前端战斗v12.0', '文件名与scriptName均为v12.0');
check(count(src,'```') === 2 && count(fenced,'```') === 2, '源码与产物均只有头尾自围栏');
check(!immune.includes('```') && !/&(?!amp;)/.test(immune), '内部围栏加固及全量实体免疫');
check(raw.replace(/&/g,'&amp;') === immune, '单遍实体还原逐字符一致');
check(!/\$[$&`'\d<]/.test(immune) && !/\$[$&`'\d<]/.test(raw), '捕获组替换序列免疫');
syntax(src,'源码'); syntax(raw,'产物');
check(count(raw,'monsterAttack') === 3, 'monsterAttack恰3处：资产表、红单体前摇、自爆');
check(raw.includes('192.168.110.83:8766') && !raw.includes('cdn.tailwindcss.com'), '内网资源与静态Tailwind隔离');
check(!/IDENTITY_SAMPLE_B64|HERO_DATA|ENEMY_ROWS|DEMO_GROUPS|playHostSample|ensureHostGunSamples|playDemoSkill|playLegacyBaselineFx|resetDemo|data:audio/i.test(raw), '无Demo宿主、演示采样或内嵌音频');
const suffixes = { wolfman:'wav', creature_slime_01:'ogg', swish_3:'wav' };
const keys = ['light_charge','light_impact','thunder_charge','thunder_single_hit','thunder_aoe_hit','bomb_throw','explosion_single','explosion_aoe_charge','explosion_aoe_blast','slash_whoosh_hit_fs434873','claw_bloody_blade_fs323526','wolfman','creature_slime_01','swish_3','frost_crystal_impact_fs550267','aoe_gun_burst_fs482122','aoe_poison_spell_fs219566','aoe_wind_spin_fs772867','fire01','freeze01'];
const urls = objectOf(raw,'audioUrls');
for (const key of keys) check(urls[key] === 'http://192.168.110.83:8766/' + key + '.' + (suffixes[key] || 'mp3'), '统一资产注册：' + key);
check(count(raw,'/light_impact.mp3') === 1, 'light_impact只注册一份，三路径共用');
for (const name of ['entityVisualRect','computeLineGeom','IDENTITY_TIMINGS','normalizeOutcomes','identityRun','playAttackIdentityFx']) {
  const pattern = name === 'IDENTITY_TIMINGS' ? /const IDENTITY_TIMINGS\s*=/g : new RegExp('function ' + name + '\\(','g');
  check((src.match(pattern) || []).length === 1, '共享件仅一份：' + name);
}
const singles = objectOf(raw,'SINGLE_IDENTITY_TYPES'), groups = objectOf(raw,'AOE_IDENTITY_TYPES');
check(Object.values(singles).length === 12 && new Set(Object.values(singles)).size === 12, '单体12类唯一分派入包');
check(Object.values(groups).length === 8 && new Set(Object.values(groups)).size === 8, '群体8类唯一分派入包');
for (const name of ['playAttackIdentityFx','playHitFeedback','classifyHit','clearHitFeedback']) check(new RegExp('window\\.' + name + '\\s*=').test(raw), '公开接线接口入包：' + name);
check(!/\[单(?:体|攻)[(（]箭矢/.test(raw), '不新增箭矢括号标签');
const singleRoute = raw.slice(raw.indexOf('function resolveSingleAttackFx('), raw.indexOf('function playSingleAttackFx('));
check(singleRoute.includes('"arrow"') || singleRoute.includes("'arrow'"), '远程默认箭矢分派入包');
for (const shape of ['bloodMist','bloodDrop','droplet','frostShard','shell','dust']) check(raw.includes(shape), '新粒子入包：' + shape);
for (const cls of ['arcane-hit-track','arcane-hit-ghost','arcane-hit-fill','arcane-hit-wounded','arcane-identity-ghost']) check(raw.includes('.'+cls), '统一样式入包：' + cls);
const kfs = [...raw.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)].map(m => m[1]);
check(kfs.length === new Set(kfs).size, '产物关键帧无重复定义');
check(count(raw,'@keyframes arcane-hit-flash{') === 1, '旧arcane-hit-flash未被新命中层覆盖');
check(raw.includes('offsetSec') && raw.includes('maxDurSec') && raw.includes('fadeOutSec') && raw.includes('decodeAudioData'), '裁窗与本地解码参数完整入包');
check(raw.includes('audioStoppers') && raw.includes('onFinish') && raw.includes('postQueue'), '采样取消、接触完成与后续队列入包');
check(raw.includes('prepareSingleAttackHit') && raw.includes('playIdentityAttackWave'), '真实反应准备与整波接触接线入包');
const sourceSpell = src.slice(src.indexOf('    function fireProjectile('), src.indexOf('    // ===== ③ 折影步'));
check(!/\b(?:whoosh|boom|click|kick|crunch|tone)\(/.test(sourceSpell), '原单体法术攻击合成音零调用');
check((sourceSpell.match(/idSample\(null, 'light_impact', 0\.92\)/g)||[]).length === 2, '火焰与紫弹各仅一个light_impact主音入口');
const stQuote = /<style>[\s\S]*?<\/style>|```[\s\S]*?```|~~~[\s\S]*?~~~|``[\s\S]*?``|`[\s\S]*?`|(".*?")/gim;
const sample = '```html\n<script>const x = "后续组件";</script>\n```';
const converted = (fenced + '\n' + sample).replace(stQuote,(m,q)=>q?'<q>'+q+'</q>':m);
check(!converted.slice(converted.indexOf('后续组件')-60).includes('<q>'), '同楼层后续组件不受引号美化污染');
console.log('\n统计：通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exitCode = fail ? 1 : 0;
