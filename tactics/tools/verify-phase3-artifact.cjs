'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main() {
  const html = readFileSync(path.join(__dirname, '..', 'mvp-standalone.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.equal((html.match(/<\/script>/gi) || []).length, 1);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet/i);
  assert.doesNotMatch(scripts[0][1], /\bimport\s*(?:\(|[{*'"\w])/);
  for (const symbol of ['terrainAttackCells', 'hasDoubleJump', 'landingAllyCost', 'sprintBudget']) {
    assert.ok(scripts[0][1].includes(symbol), symbol + ' 未入包');
  }
  const host = { console, structuredClone, URL, setTimeout, clearTimeout };
  host.window = host;
  vm.createContext(host);
  assert.throws(() => new vm.Script(scripts[0][1]).runInContext(host), /document is not defined/);
  const { phase3Groups } = await import('../../integration-test/fixtures/tactics/phase3-node-cases.mjs');
  const { createBattle, parseYamlText } = host.__TACTICS_BACKEND__;
  const parseSkill = text => parseYamlText(JSON.stringify({ 我方: [{ 名称: '试验', 技能: [{ 名称: '试射', 标签: text.slice(text.indexOf('】') + 1) }] }] })).heroes[0].skills[0];
  const cases = Object.values(phase3Groups({ createBattle, parseSkill })).flatMap(group => group.run().cases);
  for (const c of cases) assert.ok(c.pass, c.id + '\n' + c.detail);
  console.log(`[phase3 artifact] 单脚本、零外部 import、4 个阶段 3 入口入包，阶段 3 行为 ${cases.length}/${cases.length} 通过`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
