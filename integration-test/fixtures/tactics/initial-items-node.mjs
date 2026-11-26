// 典型对局原库存与父子物品入口回归：真实解析、战斗与菜单可用回调。
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { parseYamlText } from '../../../tactics/src/parser.mjs';
import { createScenarioData } from '../../../tactics/src/scenario-data.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';
const yaml = readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8');
const data = createScenarioData(parseYamlText(yaml));
const elliott = data.units.find(u => u.name === '埃利奥特');
assert.equal(elliott.ref.tp, 0, '不修改初始TP');
const inventory = new Map(elliott.items.map(it => [it.name, it]));
for (const [name, field, value] of [['精华秘酿', 'count', 6], ['化尘者之瓶', 'usesRemaining', 1],
  ['逆咒归源镜', 'usesRemaining', 3], ['安魂曲音叉', 'usesRemaining', 3],
  ['蝎眼钥匙', 'usesRemaining', 1], ['塞赫美特之愠', 'count', 1], ['.32子弹', 'count', 45]]) {
  assert.equal(inventory.get(name)?.[field], value, name);
}
const b = createBattle({ ...data, scene: { sceneId: 'items', grid: { columns: 24, rows: 24, metersPerCell: 1 }, objects: [] },
  units: [elliott, { ...structuredClone(elliott), id: 'ally', name: '队友', items: [], skills: [] },
    { ...structuredClone(elliott), id: 'enemy', name: '敌人', side: 'enemy', items: [], skills: [] }],
  placementsById: { [elliott.id]: { col: 4, row: 4 }, ally: { col: 5, row: 4 }, enemy: { col: 18, row: 18 } }, random: () => 0.5 });
b.start();
for (let i = 0; i < 5 && b.snapshot().currentId !== elliott.id; i++) b.endAction();
assert.equal(b.snapshot().currentId, elliott.id);
const main = readFileSync(new URL('../../../tactics/src/main.mjs', import.meta.url), 'utf8');
const callback = main.match(/canUseItem: (.*),\r?\n\s+onItem:/)[1];
const usable = runInNewContext(callback, { battle: b });
for (const name of ['精华秘酿', '化尘者之瓶', '安魂曲音叉', '蝎眼钥匙', '塞赫美特之愠']) {
  assert.equal(usable(inventory.get(name)), true, name + ' 初始库存可用');
}
assert.match(main, /const valid = battle\.canUseItem\(it, child\);/);
const fork = inventory.get('安魂曲音叉');
assert.equal(b.canUseItem(fork, fork.children[0]).ok, true);
const used = b.useItem(fork, { x: 4.5, y: 4.5 }, { child: fork.children[0], policy: 'none' });
assert.equal(used.ok, true);
assert.equal(fork.usesRemaining, 2);
console.log('初始库存7项、主动物品5项、子用法实际结算与扣次数、TP保持0：通过');
