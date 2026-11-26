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
    const b = make([unit('h', 'hero', 0, 200), unit('e', 'enemy', 10, 100)], [[5, 2], [6, 5]]);
    const before = state(b, 'e');
    const move = b.move(5, 7);
    check('TT-ALERTS 移动只在途中经过敌人感知也会预警', before === 'idle' && move.ok && move.cell.row === 7 && state(b, 'e') === 'pending', [before, move.cell, state(b, 'e')]);
    const blocked = make([unit('h', 'hero', 50, 200), unit('e', 'enemy', 50, 100)], [[2, 2], [6, 2]], { objects: [wall] });
    check('TT-ALERTS 墙遮住感知时不预警', state(blocked, 'e') === 'idle');
  }
  {
    const b = make([unit('h', 'hero', 100, 200), unit('e', 'enemy', 10, 100)], [[1, 2], [15, 2]]);
    const target = aim(15, 2, 'e');
    const preview = b.previewAttack(shot, target);
    const before = state(b, 'e');
    const attack = b.attack(shot, target);
    check('TT-ALERTS 预览不触发；超出敌人感知的攻击即使闪避也预警', preview.ok && before === 'idle' && attack.ok && attack.hits[0]?.segments[0]?.outcome === 'dodge' && state(b, 'e') === 'pending', [before, attack.hits, state(b, 'e')]);
    b.reset();
    check('TT-ALERTS 重置清掉由攻击引发的预警', state(b, 'e') === 'idle');
  }
  {
    const area = { ...shot, range: { type: '圆形', radius: 10 } };
    const b = make([unit('h', 'hero', 0, 200), unit('sender', 'enemy', 10, 160),
      unit('receiver', 'enemy', 5, 120, { skills: [area] }), unit('outside', 'enemy', 0, 100)], [[5, 5], [7, 5], [13, 5], [13, 6]]);
    check('TT-ALERTS 看见我方立即预警但不提前通知邻居', state(b, 'sender') === 'pending' && state(b, 'receiver') === 'idle');
    check('TT-ALERTS 预警者自然行动时广播到欧氏半径边界，不插队', advanceTo(b, 'sender') && state(b, 'sender') === 'engaged' && state(b, 'receiver') === 'engaged' && state(b, 'outside') === 'idle', [state(b, 'sender'), state(b, 'receiver'), state(b, 'outside')]);
    const receiverTurn = advanceTo(b, 'receiver');
    const plan = b.planEnemyAction();
    check('TT-ALERTS 收报敌人按自身回合追击，不用范围技盲打也不自动接力', receiverTurn && plan?.moveTo?.col < 13 && !plan.skill && state(b, 'outside') === 'idle', plan);
  }
  {
    const b = make([unit('h', 'hero', 100, 200), unit('e', 'enemy', 10, 100)], [[2, 2], [6, 2]]);
    b.ctx.regions.push({ id: 'fog', type: 'fog', casterId: 'h', strength: 20, endAt: 500, cells: [{ col: 6, row: 2 }] });
    const target = aim(6, 2, 'e');
    const preview = b.previewAttack(shot, target);
    const hidden = !b.ctx.canSeeUnit('h', 'e');
    const attack = b.attack({ ...shot, guaranteedHit: true }, target);
    check('TT-ALERTS 雾外预览和实战都可锁定雾内，普通视野不变', hidden && preview.ok && preview.disclosureTargetIds.includes('e') && attack.ok && attack.hits[0]?.segments[0]?.hit, [hidden, preview.reason, attack.hits]);
    const blocked = make([unit('h', 'hero', 100, 200), unit('e', 'enemy', 10, 100)], [[2, 2], [6, 2]], { objects: [wall] });
    blocked.ctx.regions.push(...b.ctx.regions);
    const friend = make([unit('h', 'hero', 100, 200), unit('e', 'enemy', 10, 100), unit('friend', 'hero', 10, 100)], [[2, 2], [6, 2], [4, 2]]);
    friend.ctx.regions.push(...b.ctx.regions);
    check('TT-ALERTS 雾外锁定仍挡墙、友方挡弹及射程', blocked.previewAttack(shot, target).blockedBy?.type === 'wall'
      && friend.previewAttack(shot, target).reason === '友方挡弹'
      && !b.previewAttack({ ...shot, range: { type: '单体', castRange: 3 } }, target).ok);
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
    check('TT-ALERTS 我方召唤物追全队失视的已知敌人而非未发现敌人', moved.ok && reached && !b.ctx.canSeeUnit('h', 'known')
      && !b.ctx.canSeeUnit(spawned.id, 'known') && plan?.moveTo?.col > 1 && plan?.aim?.targetId !== 'hidden', plan);
    const isolated = unit('sum', 'hero', 5, 200, { isSummon: true, controller: 'ai' });
    const blind = make([isolated, unit('unseen', 'enemy', 0, 100)], [[1, 4], [4, 4]]);
    check('TT-ALERTS 没有我方发现记录的敌人不作为追踪目标', blind.planEnemyAction()?.action === 'wait');
  }
  {
    const quiet = make([unit('h', 'hero', 0, 200), unit('e', 'enemy', 0, 100, { ref: { moveDistance: 0.5 } })], [[2, 2], [18, 2]]);
    advanceTo(quiet, 'e');
    const plan = quiet.planEnemyAction();
    const result = quiet.runEnemyTurn();
    check('TT-ALERTS 无警报敌人没有一步额度时不冲刺也不移动', plan?.action === 'wait' && !plan.moveTo && !plan.skill
      && result.currentId !== 'e' && !result.events.some(event => event.type === 'unit-moved' && event.unitId === 'e'), plan);
  }
  {
    const buff = { name: '自我强化', type: '[增攻]', power: 10, range: { type: '自身' }, actionCost: { main: 1, aux: 0 } };
    const b = make([unit('h', 'hero', 0, 200), unit('e', 'enemy', 0, 100, { skills: [buff] })], [[2, 2], [18, 2]]);
    advanceTo(b, 'e');
    const before = b.snapshot().resources.moveRemaining;
    const buffUsable = b.skillStatus(buff).ok;
    const plan = b.planEnemyAction();
    const result = b.runEnemyTurn();
    const travelled = result.events.filter(event => event.type === 'unit-moved' && event.unitId === 'e').reduce((sum, event) => sum + event.distance, 0);
    check('TT-ALERTS 无敌时随机走完正常移动额度，不自施可用增攻', buffUsable && plan?.moveTo && !plan.skill
      && travelled <= before + 1e-9 && before - travelled < 1 && !result.events.some(event => event.casterId === 'e')
      && b.getEffectiveUnit('e').atk === 10 && state(b, 'e') === 'idle', [plan, before, travelled]);
  }
  {
    const b = make([unit('h', 'hero', 0, 200), unit('e', 'enemy', 10, 100)], [[2, 0], [8, 0]],
      { rows: 1, random: () => 0, objects: [{ ...wall, bounds: { ...wall.bounds, col: 9, row: 0 } }] });
    advanceTo(b, 'e');
    const plan = b.planEnemyAction();
    const result = b.runEnemyTurn();
    const discovery = result.events.find(event => event.type === 'unit-moved' && event.unitId === 'e' && event.stoppedOnDiscovery);
    check('TT-ALERTS 巡走途中发现敌人即暂停并预警', plan?.moveTo?.col < 8 && !plan.skill && result.currentId !== 'e'
      && discovery?.discoveredIds.includes('h') && state(b, 'e') === 'pending', [plan, discovery, state(b, 'e')]);
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
