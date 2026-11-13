#!/usr/bin/env node
'use strict';
// 读取真实源码与非公开版正则包，独立验证导入管线及敌方群攻入包；不运行战斗或联网。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const artifact = path.resolve(ROOT, process.argv[2] || 'regex-前端战斗v12_05.json');
const pkg = JSON.parse(fs.readFileSync(artifact, 'utf8'));
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const fenced = pkg.replaceString;
const immune = fenced.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '');
const raw = immune.replace(/&amp;/g, '&');
let pass = 0, fail = 0;
const count = (text, word) => text.split(word).length - 1;
function check(ok, label) {
  console.log((ok ? '[PASS] ' : '[FAIL] ') + label);
  ok ? pass++ : fail++;
}
function objectOf(text, name) {
  const match = text.match(new RegExp('\\b' + name + '\\s*=\\s*\\{'));
  if (!match) throw new Error('未找到资源表：' + name);
  const start = match.index + match[0].length - 1;
  let depth = 0, quote = '';
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      return vm.runInNewContext('(' + text.slice(start, i + 1) + ')', { ASSET_BASE: 'http://192.168.110.83:8766', RLYEH_FOG_CLOUD_URL: 'fog_cloud.ogg' });
    }
  }
  throw new Error('资源表未闭合：' + name);
}
function sourceFunction(name) {
  const match = src.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}'));
  if (!match) throw new Error('未找到函数：' + name);
  return match[0];
}
function syntax(text, label) {
  const scripts = [...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].filter(m => m[1].trim());
  try {
    scripts.forEach((m, i) => new vm.Script(m[1], { filename: label + '-' + i }));
    check(scripts.length > 0, label + '内联脚本全部通过语法校验');
  } catch (e) { check(false, label + '脚本语法：' + e.message); }
}

console.log('== 敌方群攻 v12.0 产物专项 ==\n' + path.basename(artifact));
check(pkg.scriptName === '前端战斗v12.05', 'scriptName 为前端战斗v12.05');
check(count(src, '```') === 2 && /^```html\r?\n/.test(src) && /\r?\n```\s*$/.test(src), '源码围栏恰为头尾2处');
check(count(fenced, '```') === 2 && /^```html\r?\n/.test(fenced) && /\r?\n```\s*$/.test(fenced), '产物围栏恰为头尾2处');
check(!immune.includes('```'), '产物内部无裸三反引号');
check(!/&(?!amp;)/.test(immune), '产物全量&实体免疫');
check(raw.replace(/&/g, '&amp;') === immune, '实体单遍还原逐字符一致');
check(!/\$[$&`'\d<]/.test(immune) && !/\$[$&`'\d<]/.test(raw), '捕获组替换免疫');
syntax(src, '源码');
syntax(raw, '产物');
check(raw.includes('192.168.110.83:8766') && !raw.includes('cdn.tailwindcss.com'), '内网资源基址与静态Tailwind隔离保持');
check(count(raw, 'monsterAttack') === 3, 'monsterAttack 恰3处：资源表、红单体前摇、自爆');
check(!/GROUP_(?:MELEE|RANGED|ATK1)_BASE64|GROUP_AUDIO_SRC|groupSfx|sfxBtn|data:audio|;base64/i.test(raw), '无Demo采样Base64、音频开关或第二套资源表');
check(!/\bHERO_DATA\b|\bENEMY_ROWS\b|function playDemoSkill|function resetDemo/.test(raw), '无Demo宿主或演示控制代码');

const sourceUrls = objectOf(src, 'audioUrls'), artifactUrls = objectOf(raw, 'audioUrls');
for (const key of ['enemyMeleeGroupHit', 'enemyRangedGroupHit']) {
  const wanted = 'http://192.168.110.83:8766/' + key + '.mp3';
  check(sourceUrls[key] === wanted && artifactUrls[key] === wanted, key + '按ASSET_BASE注册并入包');
}
for (const key of ['enemySwingGroup', 'enemyRanged', 'enemyRangedGroup', 'enemyMagic', 'enemyMagicGroup', 'enemyBuff', 'enemyDebuff']) {
  check(sourceUrls[key] === artifactUrls[key] && !!artifactUrls[key], '既有前摇音频保留：' + key);
}
check(Object.values(artifactUrls).every(url => url.startsWith('http://192.168.110.83:8766/')), '音频全表保持内网资源链路');
const registry = objectOf(raw, 'WEBM_FX_REGISTRY');
for (const kind of ['melee', 'ranged', 'spell']) {
  const key = 'group:' + kind, entry = registry[key];
  check(!!entry && entry.url === '' && entry.scale === 1 && entry.particles === 'arcane' && entry.delay === .35, key + '注册表与350ms拍点入包');
  check(src.includes("'" + key + "'") && count(raw, key) >= 3, key + '识别、分派与兜底字面量入包');
  check(raw.includes('@keyframes arcane-f-' + kind) && raw.includes('.arcane-flash-' + kind), kind + '受击样式入包');
}
check(raw.includes('.arcane-group-missile') && raw.includes('.arcane-portrait-fragment'), '金晶与头像碎片样式入包');
check(raw.includes('resolveGroupAttackSubtypeFx') && raw.includes('resolveEnemyGroupAttackFx'), '共享三级判定入口入包');
const routeCode = sourceFunction('resolveGroupAttackSubtypeFx') + '\n' + sourceFunction('resolveEnemyGroupAttackFx');
const scope = { isHeroSideEntity: e => e.isSummon ? e.side === 'hero' : e.id.startsWith('h') };
vm.runInNewContext(routeCode, scope);
const enemy = { id: 'e_test' };
check(scope.resolveEnemyGroupAttackFx(enemy, '[群攻]', {}) === 'group:melee', '缺省类型兜底近战');
check(scope.resolveEnemyGroupAttackFx(enemy, '[群攻]', { damageType: '法术' }) === 'group:spell', '无括号法术进入新版');
check(scope.resolveEnemyGroupAttackFx(enemy, '[群攻(爆炸)]', { damageType: '法术' }) === null && scope.resolveGroupAttackSubtypeFx('[群攻(爆炸)]') === 'explosion', '爆炸+法术保留旧explosion');
check(scope.resolveEnemyGroupAttackFx(enemy, '[群攻(雷)]', { fxTag: '火焰01', damageType: '法术' }) === null, '专属标签优先于括号和通用类型');
check(scope.resolveEnemyGroupAttackFx({ id: 'h_test' }, '[群攻]', {}) === null, '我方普通群攻不被接管');
check(scope.resolveEnemyGroupAttackFx({ id: 's_test', isSummon: true, side: 'enemy' }, '[群攻]', { damageType: '远程' }) === 'group:ranged', '敌方召唤物使用远程兜底');

for (const [key, volume] of [['enemyMeleeGroupHit', '.72'], ['enemyRangedGroupHit', '.75'], ['atk1', '.5']]) {
  const call = new RegExp('playSound\\(["\x27]' + key + '["\x27]\\s*,\\s*0?' + volume.replace('.', '\\.') + '\\)');
  check(call.test(src) && call.test(raw), key + '显式命中音量' + volume + '入包');
}
const groupStart = src.indexOf('    function playSpellGroup('), groupEnd = src.indexOf('    // ===== 对外接口 =====', groupStart);
const spell = src.slice(groupStart, groupEnd);
check(spell.includes('function spawnSpellGroupParticles') && spell.includes('i < 90') && spell.includes('owner.hostParticles.add'), '法术三层冲击与90流光为私有、受生命周期管理');
check((src.match(/function spawnDefaultAOEParticles\(/g) || []).length === 1 && count(raw, 'spawnDefaultAOEParticles') === 2, '全局默认AOE仅原定义和原调用，不被法术覆盖');
check(['arcane-flash-melee', 'arcane-flash-ranged', 'arcane-flash-spell'].every(cls => raw.includes(cls)), '三类新增闪色及清理键入包');
check(count(src, 'window.triggerScreenShake =') === 1, '不复制Demo全局震屏覆盖声明');
const chargeClasses = ['arcane-charge-ring', 'arcane-charge-ring2', 'arcane-charge-core', 'arcane-slash-cut', 'arcane-slash-body', 'arcane-slash-core', 'arcane-slash-tip', 'arcane-crystal-flash', 'arcane-crystal-cluster', 'arcane-crystal-ring', 'arcane-crystal-cracks', 'arcane-spell-formation', 'arcane-spell-prism'];
const animationRule = [...raw.matchAll(/([^{}]+)\{will-change:transform,opacity\}/g)].map(m => m[1]);
check(chargeClasses.every(cls => animationRule.some(rule => rule.split(',').includes('.' + cls))), '13个SVG动画定位类will-change规则入包');
check(/\.doneAt-Date\.now\(\)[\s\S]{0,240}&&\w+\.cancel\(\)/.test(raw), '新版群攻doneAt交棒同步cancel入包（不绑定mangle局部名）');
const dodgeGuard = raw.slice(raw.indexOf('function applySingleTagEffect('), raw.indexOf('function triggerBarrierShatter('));
check(/!resolveEnemyGroupAttackFx\([^)]*\)&&\(/.test(dodgeGuard), '新版兜底群攻闪避开火抑制守卫入包');
for (const key of ['CombatAudioDirector', 'waveId', 'actionId', 'completeTarget', 'closeWave', 'cancelWave']) check(raw.includes(key), '真实wave音频生命周期入包：' + key);
check(src.includes('!wave.closed || wave.pending.size'), 'wave收口等待所有目标后续结算完成');
check(!src.includes('audioTargets.map') && !src.includes('release(); impactWaves.delete'), '群攻无未定义目标列表与模块外波次表引用');
const barrierRoute = src.slice(src.indexOf('async function applyBarrierHit('), src.indexOf('// 基于嘲讽值的轮盘赌算法'));
check(!barrierRoute.includes('CombatAudioDirector.publish(') && barrierRoute.includes('audioWave'), '屏障不冒充角色受击，泄漏独立携带audioWave');
check(barrierRoute.includes('CombatAudioDirector.replaceTargets(attackContext && attackContext.audioWave || skill && skill._impactAudioWave, [])'), '屏障无泄漏清空角色音频目标避免挂起波次');
check(!raw.includes('suppressAudio') && raw.includes('DAMAGE_RESOLVED') && raw.includes('DODGE_RESOLVED'), '技能音与真实受击事件独立入包');
console.log('\n统计：通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exitCode = fail ? 1 : 0;
