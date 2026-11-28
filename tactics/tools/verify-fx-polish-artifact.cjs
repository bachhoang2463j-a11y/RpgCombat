'use strict';
// 本轮产物专项：折影步/奇异海螺原版入包、地形破坏碎裂、幻梦行军兽专属 L3、背袭示意、驻足蓄力面板
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const html = readFileSync(path.join(__dirname, '..', 'mvp-standalone.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
assert.equal((html.match(/<\/script>/gi) || []).length, 1);
assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet/i);
assert.doesNotMatch(scripts[0][1], /\bimport\s*(?:\(|[{*'"\w])/);
const symbols = [
  'function playZheYingBu(', 'function playStrangeConch(', 'land ? land.x', 'arcane-ghost-shatter',
  'obstacle-destroyed', 'playObstacleBreak', 'onObstacleBreak', 'molt_crack', 'mx_golem_stomp',
  'marcher-charge', 'marcher-roar', '行军兽冲撞', '行军兽咆哮',
  'playBackstabMark', 'drawBackstabSector', 't-unit-backstab', '🗡背袭',
  'enemy-mp-recovered', 'finishExposureTurn', 'skillMain', '暴露',
  'stationaryStatus', 't-prep-pips', 't-prep-still', '驻足起咏', '驻足继续',
  'reaction-sonic-jam', '声波干扰雷', '净蚀反冲', 'seerEyeHtml', 'slamSeal', 't-card-still', 't-ally-tab', 'onAllyPin', 'inspectPin', 'creature_slime_01',
  'guardBroken', 'GuardBroken', 'parry_Weapon_GuardBreak.wav', 'combatOf', 'queueNaturalNext', 'waitForTurnCue', 'seeked',
];
// 产物经压缩：去空白、非 ASCII 字符转 \uXXXX
const esc = s => [...s].map(c => c.codePointAt(0) > 0xffff ? '\\u{' + c.codePointAt(0).toString(16).toUpperCase() + '}' : c.charCodeAt(0) > 127 ? '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') : c).join('');
const has = s => [s, s.replace(/ /g, ''), esc(s)].some(x => html.includes(x));
for (const s of symbols) assert.ok(has(s), s + ' 未入包');
assert.doesNotMatch(html, /translateX\(-90px\)\s*skewX/);
assert.ok(!html.includes('t-stationary-start'), '旧的独立驻足卡仍在包内');
const conch = scripts[0][1].indexOf('function playStrangeConch(');
assert.doesNotMatch(scripts[0][1].slice(conch, conch + 6000), /hitStop = 80/);
console.log('[fx-polish artifact] 单脚本、零外部 import，' + symbols.length + ' 项新代码入包，折影步无卡片横移、海螺无顿帧');
