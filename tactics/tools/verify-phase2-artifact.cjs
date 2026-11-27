'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = readFileSync(path.join(__dirname, '..', 'mvp-standalone.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
assert.equal((html.match(/<\/script>/gi) || []).length, 1);
assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet/i);
assert.doesNotMatch(scripts[0][1], /\bimport\s*(?:\(|[{*'"\w])/);
for (const entry of ['spatialAttackModifiers', 'findRiskAwareReachable', 'beginMove', 'beginTeleportPrompt', 'opportunity-result']) {
  assert.ok(scripts[0][1].includes(entry), entry + ' 未入包');
}

const host = { console, structuredClone, URL, setTimeout, clearTimeout };
host.window = host;
vm.createContext(host);
assert.throws(() => new vm.Script(scripts[0][1]).runInContext(host), /document is not defined/);
const { createBattle, parseYamlText } = host.__TACTICS_BACKEND__;
const yaml = readFileSync(path.join(__dirname, '..', '..', 'doc', 'tactics', '典型对局-战棋版.yaml'), 'utf8');
const block = parseYamlText(yaml);
const heroSkill = (name, key) => block.heroes.find(u => u.name === name).skills.find(s => s.name === key);
assert.equal(heroSkill('弗兰克', '屏息瞄准').power, 20);
for (const [name, key, length] of [['索恩', '砷弹射击', 20], ['玛德琳', '从西班牙射击', 25]]) {
  const range = heroSkill(name, key).range;
  assert.equal(`${range.type}/${range.length}/${range.width}`, `直线/${length}/1`);
}
const fog = block.enemies.flatMap(u => u.skills).filter(s => s.name === '拉莱耶造雾术');
assert.equal(fog.length, 2);
assert.ok(fog.every(s => s.range.radius === 3));
assert.equal(heroSkill('埃利奥特', '拉莱耶造雾术').range.radius, 5);
const shadows = block.heroes.find(u => u.name === '埃利奥特').skills.filter(s => s.name === '折影步');
assert.equal(shadows.length, 2);

const unit = (id, side, spd, skills = []) => ({ id, side, name: id, skills, items: [], footprint: { width: 1, height: 1 },
  ref: { hp: 100, maxHp: 100, mp: 20, maxMp: 20, atk: 20, def: 0, spd, evasion: 0, perception: 50, moveDistance: 6 } });
const h = unit('h', 'hero', 200, shadows), e = unit('e', 'enemy', 100);
const placementsById = { h: { col: 3, row: 3, facing: 0 }, e: { col: 4, row: 3, facing: 270 } };
const scene = { sceneId: 'phase2-artifact', grid: { columns: 10, rows: 8, metersPerCell: 1 }, objects: [] };
const battle = createBattle({ units: [h, e], placementsById, scene, random: () => 0.5 });
battle.start();
const move = battle.beginMove(1, 3);
const prompt = move.next().value;
assert.equal(prompt.type, 'reaction');
const landing = move.next(prompt.candidates[0]).value;
assert.equal(landing.type, 'teleport');
assert.ok(landing.cells.some(c => c.col === 3 && c.row === 5));
const result = move.next({ col: 3, row: 5 }).value;
assert.ok(result.stopped);
assert.equal(result.cell.cost, 0);
assert.equal(h.ref.mp, 16);
assert.equal(h.ref.hp, 100);
assert.ok(result.events.some(ev => ev.type === 'opportunity-attack' && ev.attackerId === 'e'));
const activeShadow = shadows.find(s => !s.isReaction);
assert.equal(activeShadow.type, '[无]');
assert.equal(activeShadow.displacements[0].distance, 5);
const blink = battle.attack(activeShadow, { x: 5.5, y: 5.5 });
assert.ok(blink.ok && blink.teleport);
assert.equal(placementsById.h.col, 5);
assert.equal(h.ref.mp, 12);
assert.equal(battle.snapshot().resources.aux, 0);
assert.equal(battle.snapshot().resources.moveRemaining, 6);
console.log('[phase2 artifact] 单脚本/零外部 import/关键模块、技能数据、借机反应选格与主动闪现全部通过');
