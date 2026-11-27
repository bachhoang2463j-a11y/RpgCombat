import { readFileSync } from 'node:fs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { chooseEnemyAction } from '../../../tactics/src/ai.mjs';
import { CHAPEL_SCENE } from '../../../tactics/src/chapel-scene.mjs';
import { parseSkill, parseYamlText } from '../../../tactics/src/parser.mjs';
import { createScenarioData } from '../../../tactics/src/scenario-data.mjs';

const sample = () => createScenarioData(parseYamlText(readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8')));
const scene = (rows = 5, objects = []) => ({ sceneId: 'action-routes', grid: { columns: 12, rows, metersPerCell: 1 }, objects });
const at = (col, row) => ({ col, row });
const unit = (id, side, spd, options = {}) => ({ id, name: id, side, controller: side === 'hero' ? 'player' : 'ai',
  footprint: { width: 1, height: 1 }, skills: [], items: [], ...options,
  ref: { hp: 100, maxHp: 100, mp: 20, maxMp: 20, atk: 10, def: 0, spd, evasion: 0, moveDistance: 6, perception: 80, ...options.ref } });
const make = (units, placementsById, map = scene(), random = () => 0.5) => {
  const b = createBattle({ units, placementsById: structuredClone(placementsById), scene: map, random });
  b.start(); return b;
};
const casesFor = run => ({ run() {
  const cases = [];
  run((id, pass, detail = '') => cases.push({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) }));
  return { cases };
} });

const routes = casesFor(check => {
  {
    const { units } = sample();
    const monster = units.find(u => u.name === '伊塔库亚的眷族');
    const hero = unit('h', 'hero', 10);
    const b = make([monster, hero], { [monster.id]: at(11, 15), h: at(11, 22) }, CHAPEL_SCENE);
    const done = b.runEnemyTurn();
    const jumps = done.events.filter(e => e.type === 'unit-jumped' && e.unitId === monster.id);
    const launch = done.events.find(e => e.type === 'unit-moved' && e.unitId === monster.id && e.to.row === 16);
    check('北房2×2怪物先到起跳点、越过路口台阶后向目标推进', launch && jumps.length === 1 && launch.seq < jumps[0].seq
      && jumps[0].from.row === 16 && jumps[0].to.row === 19 && b.ctx.placementsById[monster.id].row > 19, { launch, jumps, enemy: b.ctx.placementsById[monster.id] });
  }
  {
    const wall = { id: 'step', kind: 'lowCounter', bounds: { col: 3, row: 0, width: 1, height: 1 } };
    const summon = () => unit('s', 'hero', 200, { controller: 'ai', isSummon: true, summonOwnerId: 'h', ref: { moveDistance: 6, perception: 0 } });
    const placements = { s: at(2, 0), h: at(6, 0), e: at(11, 0) };
    const units = () => [summon(), unit('h', 'hero', 30, { ref: { perception: 0 } }), unit('e', 'enemy', 20)];
    const b = make(units(), placements, scene(1, [wall]));
    check('召唤物跳过低障碍跟随，辅助点只扣一次', b.planEnemyAction().jumpTo?.col === 4
      && b.runEnemyTurn().events.filter(e => e.type === 'unit-jumped').length === 1 && b.ctx.placementsById.s.col === 5);
    const solid = make(units(), placements, scene(1, [{ ...wall, kind: 'wall' }]));
    check('实墙不能跳，普通通路只步行', !solid.planEnemyAction().jumpTo && make(units(), placements, scene(1)).planEnemyAction().moveTo?.col === 5);
    const spent = make(units(), placements, scene(1, [wall]));
    spent.battleState.combatState.clock.currentAction.resources.aux = 0;
    const fromMain = spent.planEnemyAction();
    spent.battleState.combatState.clock.currentAction.resources.main = 0;
    check('无辅助点可用主点自动跳，二者均用完则不能跳', fromMain.jumpTo?.col === 4 && spent.planEnemyAction().action === 'wait');
  }
  for (const rows of [1, 5]) {
    const mob = unit('e', 'enemy', 200, { ref: { moveDistance: 3 } });
    const row = rows === 1 ? 0 : 2;
    const b = make([mob, unit('h', 'hero', 50)], { e: at(1, row), h: at(10, row) }, scene(rows));
    b.ctx.regions.push({ id: 'fog', type: 'fog', casterId: 'h', strength: 20, endAt: null,
      cells: [3, 4, 5].flatMap(col => Array.from({ length: rows === 1 ? 1 : 3 }, (_, r) => at(col, rows === 1 ? 0 : r + 1))) });
    const point = { x: 10.5, y: row + 0.5 };
    const plan = () => chooseEnemyAction(b.ctx, 'e', 3, [], null, { main: 0, aux: 0, seen: [], pursuitPoints: [point] });
    const chosen = plan();
    const travelled = b.move(chosen.moveTo.col, chosen.moveTo.row, chosen.avoidFog);
    const next = plan();
    const inside = p => b.ctx.regions[0].cells.some(c => c.col === p.col && c.row === p.row);
    const length = travelled.cell.path.slice(1).reduce((sum, to, i) => sum + Math.hypot(to.col - travelled.cell.path[i].col, to.row - travelled.cell.path[i].row), 0);
    check(rows === 1 ? '只能穿雾时沿目标方向前进，不退回入口' : '可绕行时实际路径不踏入浓雾', travelled.ok && (rows === 1
      ? travelled.cell.path.some(inside) && next.moveTo?.col > travelled.cell.col
      : chosen.avoidFog && travelled.cell.path.every(p => !inside(p))) && Math.abs(travelled.cell.cost - length) < 1e-9, { chosen, travelled, next });
  }
});

const items = casesFor(check => {
  const heal = { ...parseSkill('【口粮】[回复:5][范围:自身]'), isItem: true, category: '消耗品', count: 2 };
  const placements = { h: at(1, 2), e: at(10, 2) };
  const battle = item => make([unit('h', 'hero', 200, { items: [item], ref: { hp: 60 } }), unit('e', 'enemy', 10)], placements);
  for (const [main, aux] of [[0, 0], [1, 0], [1, 1]]) {
    const item = { ...heal, actionCost: { main, aux } };
    const b = battle(item);
    b.defend();
    const pred = b.predictAttack(b.itemSkill(item));
    const used = b.useItem(item);
    const blocked = b.useItem(item);
    check(`物品覆盖旧成本 ${main}/${aux}，只耗一次辅助点`, pred.costs?.main === 0 && pred.costs.aux === 1 && used.ok
      && used.costSummary.aux === 1 && used.costSummary.main === 0 && item.count === 1 && !blocked.ok && !b.previewJump(2, 2).ok);
  }
  {
    const child = { ...heal, name: '子用法', actionCost: { main: 3, aux: 0 } };
    const item = { ...heal, category: '道具', maxUses: 1, usesRemaining: 1, children: [child] };
    const b = battle(item);
    b.defend();
    const status = b.canUseItem(item, child);
    const used = b.useItem(item, null, { child });
    check('主行动已用完仍可用子用法，只扣辅助点与父道具次数', status.ok && status.mainCost === 0 && status.auxCost === 1 && used.ok
      && item.usesRemaining === 0 && item.count === 2 && b.snapshot().resources.main === 0 && b.snapshot().resources.aux === 0
      && b.canUseItem(item).reason === '物品次数已用完');
  }
  {
    const item = { ...heal, category: '道具', count: 0, maxUses: 0 };
    const b = battle(item);
    const first = b.useItem(item);
    const fromMain = b.useItem(item);
    const noPoints = b.canUseItem(item).reason;
    b.endAction();
    const nextTurn = b.useItem(item);
    check('不限次数道具可用主点补扣，行动点不足与库存分开', first.ok && first.costSummary.aux === 1
      && fromMain.ok && fromMain.costSummary.main === 1 && noPoints === '辅助行动已用完' && nextTurn.ok && item.count === 0);
  }
  {
    const mp = { ...heal, cost: 21 };
    const ammo = { ...heal, category: '弹药' };
    const carrier = { ...heal, category: '道具', type: '[无]', bindings: [{ skillName: '用镜', cost: 1 }] };
    check('物品独立报告 MP、弹药、纯绑定材料和耗尽', battle(mp).canUseItem(mp).reason === 'MP不足'
      && battle(ammo).canUseItem(ammo).reason === '弹药不能主动使用'
      && /绑定技能/.test(battle(carrier).canUseItem(carrier).reason)
      && battle({ ...heal, count: 0 }).canUseItem({ ...heal, count: 0 }).reason === '物品数量不足');
  }
  {
    const item = { ...heal, delay: 3 };
    const b = battle(item);
    const used = b.useItem(item);
    const opening = b.snapshot();
    for (let i = 0; i < 6 && !b.snapshot().preparation?.ready; i++) b.endAction();
    const before = b.snapshot();
    const release = b.useItem(item);
    check('延迟物品先付一辅，再投入现有主行动，释放不再扣点或扣库存', used.preparing && used.costSummary.main === 0
      && used.costSummary.aux === 1 && used.costSummary.preparationMain === 1 && opening.preparation.remaining === 2
      && opening.resources.main === 0 && before.preparation?.ready && release.ok && release.costSummary.aux === 0 && item.count === 1, { used: used.costSummary, opening: opening.preparation, ready: before.preparation, release: release.reason });
  }
  {
    const b = battle({ ...heal });
    const empty = b.ready();
    const r = b.snapshot().resources;
    const poison = { type: 'poison', value: 5 }, burn = { type: 'burn', value: 10 }, atk = { type: 'atk', value: 10 };
    b.buffsOf('h').push(poison, burn, atk);
    const used = b.ready();
    check('整备花一个主行动随机去一条自身负面，不去增益或误扣辅助点', !empty.ok && r.main === 1 && used.ok && used.removed === burn
      && b.buffsOf('h').includes(poison) && b.buffsOf('h').includes(atk) && !b.buffsOf('h').includes(burn) && !b.ready().ok
      && b.snapshot().resources.main === 0 && b.snapshot().resources.aux === 1);
  }
});

export const groups = { 'ACTION-ROUTES': routes, 'ITEM-READY': items };
