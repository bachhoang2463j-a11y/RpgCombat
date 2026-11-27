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
  for (const symbol of ['issueFocus', 'selectChargeAim', 'drawChargeIntent', 'syncTacticalWarnings', 'setPersistentIntents', 't-unit-focus-target', 'charge-pip']) {
    assert.ok(html.includes(symbol), symbol + ' 未入包');
  }
  const host = { console, structuredClone, URL, setTimeout, clearTimeout };
  host.window = host;
  vm.createContext(host);
  assert.throws(() => new vm.Script(scripts[0][1]).runInContext(host), /document is not defined/);
  const { phase4Groups } = await import('../../integration-test/fixtures/tactics/phase4-node-cases.mjs');
  const { createBattle, parseYamlText } = host.__TACTICS_BACKEND__;
  const parseSkill = text => {
    const end = text.indexOf('】');
    return parseYamlText(JSON.stringify({ 我方: [{ 名称: '试验', 技能: [{ 名称: text.slice(1, end), 标签: text.slice(end + 1) }] }] })).heroes[0].skills[0];
  };
  const cases = Object.values(phase4Groups({ createBattle, parseSkill })).flatMap(group => group.run().cases);
  for (const c of cases) assert.ok(c.pass, c.id + '\n' + c.detail);
  console.log(`[phase4 artifact] 单脚本、零外部 import、阶段 4 展示与规则入包，行为 ${cases.length}/${cases.length} 通过`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
