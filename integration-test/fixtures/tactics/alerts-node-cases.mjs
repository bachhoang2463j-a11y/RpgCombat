// TT-ALERTS：对真正的战斗控制器断言，不读内部警报账本。
function unit(id, side, perception, spd, extra = {}) {
  return { id, name: id, side, controller: side === 'hero' ? 'player' : 'ai',
    footprint: { width: 1, height: 1 }, skills: [], ...extra,
    ref: { hp: 100, maxHp: 100, mp: 30, maxMp: 30, atk: 10, def: 0, spd, evasion: 100,
      moveDistance: 6, perception, ...extra.ref } };
}
function aim(col, row, targetId) { return { x: col + 0.5, y: row + 0.5, targetId }; }
const shot = { name: '远击', type: '[伤害]', power: 10, hit: 1,
  range: { type: '单体', castRange: 18 }, actionCost: { main: 1, aux: 0 } };
const summon = { name: '召唤', type: '[无]', summonTarget: '行军兽',
  range: { type: '召唤', castRange: 6 }, actionCost: { main: 1, aux: 0 } };
const wall = { id: 'wall', kind: 'wall', bounds: { col: 4, row: 2, width: 1, height: 1 } };

export function runAlertsCases(api) {
  const cases = [];
  const check = (id, pass, details) => cases.push({ id, pass: !!pass, detail: details == null ? '' : JSON.stringify(details) });
  const make = (units, coords, { objects = [], rows = 16, random = () => 0.5, summonProvider } = {}) => {
    const scene = { sceneId: 'tt-alerts', grid: { columns: 24, rows, metersPerCell: 1 }, ground: {}, objects };
    const placementsById = Object.fromEntries(units.map((u, i) => [u.id, { col: coords[i][0], row: coords[i][1] }]));
    const battle = api.createBattle({ units, placementsById, scene, random, summonProvider });
    battle.start(); return battle;
  };
  const state = (battle, id) => battle.getEffectiveUnit(id).alertState;
  const advanceTo = (b, id) => {
    for (let i = 0; i < 16 && b.snapshot().currentId !== id; i++) b.endAction();
    return b.snapshot().currentId === id;
  };
  {
    const b = make([unit('h', 'hero', 0, 200), unit('e', 'enemy', 10, 100)], [[2, 2], [6, 2]]);
    const target = aim(6, 2, 'e');
    check('TT-ALERTS 开战即知全部位置，不受感知值限制', b.snapshot('h').units.some(u => u.id === 'e')
      && b.ctx.knownPositions === true);
    const blocked = make([unit('h', 'hero', 0, 200), unit('e', 'enemy', 10, 100)], [[2, 2], [6, 2]], { objects: [wall] });
    check('TT-ALERTS 已知位置仍受墙阻挡攻击射线', blocked.snapshot('h').units.some(u => u.id === 'e')
      && blocked.previewAttack(shot, target).blockedBy?.type === 'wall');
  }
  {
    const b = make([unit('h', 'hero', 100, 200), unit('e', 'enemy', 10, 100)], [[2, 2], [6, 2]]);
    b.ctx.regions.push({ id: 'fog', type: 'fog', casterId: 'e', strength: 20, endAt: 500, cells: [{ col: 6, row: 2 }] });
    const target = aim(6, 2, 'e');
    const preview = b.previewAttack(shot, target);
    check('TT-ALERTS 雾内目标位置已知但预览锁定被拒', b.snapshot('h').units.some(u => u.id === 'e')
      && !preview.ok && /无法瞄准/.test(preview.reason), preview.reason);
    const blocked = make([unit('h', 'hero', 100, 200), unit('e', 'enemy', 10, 100)], [[2, 2], [6, 2]], { objects: [wall] });
    const friend = make([unit('h', 'hero', 100, 200), unit('e', 'enemy', 10, 100), unit('friend', 'hero', 10, 100)], [[2, 2], [6, 2], [4, 2]]);
    check('TT-ALERTS 单锁仍受墙、友方挡弹及射程限制', blocked.previewAttack(shot, target).blockedBy?.type === 'wall'
      && friend.previewAttack(shot, target).reason === '友方挡弹'
      && !friend.previewAttack({ ...shot, range: { type: '单体', castRange: 3 } }, target).ok);
  }
  {
    const { summonProvider } = api.createScenarioData({ heroes: [], enemies: [], summonTemplates: [
      { name: '🦏◈行军兽◈', img: 'portrait.png', hp: 100, maxHp: 100, mp: 10, maxMp: 10,
        atk: 10, def: 0, spd: 160, moveDistance: 4, perception: 5 },
    ] });
    const b = make([unit('h', 'hero', 15, 200), unit('known', 'enemy', 0, 100), unit('hidden', 'enemy', 0, 100)],
      [[2, 2], [5, 2], [1, 8]], { summonProvider });
    const cast = b.attack(summon, aim(1, 4));
    const spawned = b.ctx.units.find(u => u.isSummon);
    check('TT-ALERTS 召唤正常入场并保留模板的头像源与纯名', cast.ok && spawned?.name === '行军兽'
      && spawned.portraitName === '🦏◈行军兽◈' && spawned.img === 'portrait.png', [cast.reason, spawned?.name, spawned?.portraitName]);
    const moved = b.move(0, 2);
    const reached = spawned && advanceTo(b, spawned.id);
    const plan = reached && b.planEnemyAction();
    check('TT-ALERTS 无原地攻击时召唤物跟随主人，仍公开双方位置', moved.ok && reached
      && b.snapshot('h').units.some(u => u.id === 'known') && plan?.moveTo?.row < 4 && !plan?.skill, plan);
    const isolated = unit('sum', 'hero', 0, 200, { isSummon: true, controller: 'ai' });
    const blind = make([isolated, unit('unseen', 'enemy', 0, 100)], [[1, 4], [3, 4]]);
    check('TT-ALERTS 召唤物原地攻击不受个人感知半径限制', blind.planEnemyAction()?.aim?.targetId === 'unseen');
  }
  {
    const quiet = make([unit('h', 'hero', 0, 200), unit('e', 'enemy', 0, 100, { ref: { moveDistance: 0.5 } })], [[2, 2], [18, 2]]);
    advanceTo(quiet, 'e');
    const plan = quiet.planEnemyAction();
    const result = quiet.runEnemyTurn();
    check('TT-ALERTS 基础额度不足一步但冲刺可推进一格', plan?.action === 'sprint'
      && result.events.some(event => event.type === 'unit-moved' && event.unitId === 'e' && event.distance === 1)
      && quiet.getEffectiveUnit('e').atk === 10, [plan, result.events]);
  }
  {
    const b = make([unit('h', 'hero', 0, 200), unit('e', 'enemy', 10, 100)], [[2, 0], [8, 0]],
      { rows: 1, random: () => 0 });
    advanceTo(b, 'e');
    const plan = b.planEnemyAction();
    const result = b.runEnemyTurn();
    check('TT-ALERTS 探索移动可继续经过已知单位，不触发发现截停', plan?.moveTo?.col === 4
      && result.events.some(event => event.type === 'unit-moved' && event.unitId === 'e' && !event.stoppedOnDiscovery), [plan, result.events]);
  }
  {
    const owner = unit('owner', 'hero', 0, 200, { footprint: { width: 2, height: 1 } });
    const companion = unit('companion', 'hero', 0, 100, { isSummon: true, summonOwnerId: 'owner', controller: 'ai' });
    const b = make([owner, companion, unit('enemy', 'enemy', 0, 80)], [[3, 3], [12, 3], [20, 12]]);
    advanceTo(b, 'companion');
    const first = b.planEnemyAction();
    b.runEnemyTurn();
    const firstCol = b.ctx.placementsById.companion.col;
    advanceTo(b, 'companion');
    const second = b.planEnemyAction();
    b.runEnemyTurn();
    advanceTo(b, 'companion');
    const idle = b.planEnemyAction();
    const position = b.ctx.placementsById.companion;
    check('TT-ALERTS 空闲召唤物跨轮走到多格主人八邻接并停下', first?.moveTo && firstCol === 6 && second?.moveTo
      && position.col === 5 && Math.abs(position.row - 3) <= 1 && idle?.action === 'wait' && !idle.moveTo && !idle.skill,
      [first, firstCol, second, position, idle]);
  }
  return { cases };
}

export const groups = { 'TT-ALERTS': { run: ({ modules: { battle, scenarioData } }) => runAlertsCases({ ...battle, ...scenarioData }) } };
