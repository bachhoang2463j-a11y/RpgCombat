// 本轮反馈：伤害分类独立于行动点、友军通行、无差别效果的 AI 阵营收益。
import { readFileSync } from 'node:fs';
import { parseYamlText } from '../../../tactics/src/parser.mjs';
import { createScenarioData } from '../../../tactics/src/scenario-data.mjs';
import { skillSlots } from '../../../tactics/src/effect-definitions.mjs';
import { findReachable } from '../../../tactics/src/movement.mjs';
import { compileScene } from '../../../tactics/src/scene.mjs';
import { chooseEnemyAction } from '../../../tactics/src/ai.mjs';

async function run() {
  const cases = [];
  const check = (id, pass, detail) => cases.push({ id, pass: !!pass, detail: JSON.stringify(detail ?? '') });
  const uiSource = readFileSync(new URL('../../../tactics/src/vendor/rpg-ui/rpg-ui.mjs', import.meta.url), 'utf8');
  const classifier = uiSource.match(/function isAttackSkill\(skill\) \{([\s\S]*?)\n\}/)[1];
  const attack = new Function('skillSlots', 'skill', classifier).bind(null, skillSlots);
  const data = createScenarioData(parseYamlText(readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8')));
  const fogOf = u => u.skills.find(s => s.name === '拉莱耶造雾术');
  const elFog = fogOf(data.units.find(u => u.id === 'h:埃利奥特'));
  check('TFB 埃利奥特造雾半径5射程12', elFog.range.radius === 5 && elFog.range.castRange === 12);
  check('TFB 深潜者造雾数值不变', data.units.filter(u => u.name.startsWith('深潜者')).every(u => fogOf(u).range.radius === 5 && fogOf(u).range.castRange === 15));
  for (const type of ['伤害', '钝击', '切割', '枪击', '霰弹', '火焰', '圣光', '雷电', '水流', '冰霜', '诅咒', '穿透', '散射']) {
    check('TFB 分类伤害 ' + type, attack({ type: '[' + type + ']', actionCost: { main: 0, aux: 1 } }));
  }
  for (const type of ['回复', '致盲', '瞄准', '再动', '眩晕']) {
    check('TFB 分类非伤害 ' + type, !attack({ type: '[' + type + ']', actionCost: { main: 1, aux: 0 } }));
  }
  check('TFB 混合槽按伤害分类', attack({ type: '[回复]', type2: '[火焰]' }));
  const unit = (id, side) => ({ id, side, footprint: { width: 1, height: 1 }, ref: { hp: 100, maxHp: 100, atk: 20, def: 0, perception: 50 } });
  const compiled = compileScene({ sceneId: 'sc-feedback05', grid: { columns: 18, rows: 10, metersPerCell: 1 }, ground: { material: 'brick' }, objects: [] });
  const ctx = (units, placementsById) => ({ compiled, units, placementsById, footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])) });
  const move = ctx([unit('me', 'hero'), unit('ally', 'hero'), unit('enemy', 'enemy')], { me: { col: 1, row: 3 }, ally: { col: 2, row: 3 }, enemy: { col: 6, row: 3 } });
  const reach = findReachable(move, 'me', 8);
  check('TFB 直线可穿友军', reach.byKey.get('3,3')?.path.some(c => c.col === 2 && c.row === 3));
  check('TFB 不能停在友军格', !reach.byKey.has('2,3'));
  check('TFB 不能停在敌军格', !reach.byKey.has('6,3'));
  move.placementsById.ally = { col: 2, row: 4 };
  check('TFB 斜线可穿友军', findReachable(move, 'me', 8).byKey.get('3,5')?.path.some(c => c.col === 2 && c.row === 4));
  const blind = { name: 'fog', type: '[致盲]', power: 40, affectsAll: true, range: { type: '爆炸', castRange: 15, radius: 2 }, actionCost: { main: 0, aux: 1 } };
  const caster = unit('e', 'enemy');
  const alone = ctx([caster, unit('ally', 'enemy')], { e: { col: 1, row: 5 }, ally: { col: 8, row: 5 } });
  check('TFB 不为只有友军受盲的造雾计正收益', !chooseEnemyAction(alone, 'e', 0, [blind]).skill);
  const enemyOnly = ctx([caster, unit('h', 'hero')], { e: { col: 1, row: 5 }, h: { col: 8, row: 5 } });
  check('TFB 敌方受盲仍可施放造雾', !!chooseEnemyAction(enemyOnly, 'e', 0, [blind]).skill);
  const mixed = ctx([caster, unit('h', 'hero'), unit('ally', 'enemy')], { e: { col: 1, row: 5 }, h: { col: 8, row: 5 }, ally: { col: 8, row: 6 } });
  check('TFB 敌友各一受盲净收益零不施放', !chooseEnemyAction(mixed, 'e', 0, [blind]).skill);
  const friendlyFire = { ...blind, name: 'fire', type: '[火焰]', power: 50 };
  check('TFB 不奖励仅伤友军的无差别攻击', !chooseEnemyAction(alone, 'e', 0, [friendlyFire]).skill);
  const healEnemy = { ...blind, name: 'heal', type: '[回复]', power: 40 };
  enemyOnly.units[1].ref.hp = 20;
  check('TFB 不奖励为敌方治疗', !chooseEnemyAction(enemyOnly, 'e', 0, [healEnemy]).skill);
  return { cases };
}
export const groups = { 'TFB-05': { run } };
