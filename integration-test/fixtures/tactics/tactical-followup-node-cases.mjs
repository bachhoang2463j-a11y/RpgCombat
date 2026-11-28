// 战棋移动预览及区域退场：源码和单文件可共用这一组规则断言。
import { readFileSync } from 'node:fs';

const SAMPLE = new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url);
const at = (col, row) => ({ col, row });
const aimAt = (col, row, targetId) => ({ x: col + 0.5, y: row + 0.5, targetId });
function unit(id, side, ref = {}, extra = {}) {
  return { id, name: id, side, controller: side === 'hero' ? 'player' : 'ai', footprint: { width: 1, height: 1 }, skills: [], ...extra,
    ref: { hp: 100, maxHp: 100, mp: 30, maxMp: 30, atk: 20, def: 0, spd: 150, evasion: 0, moveDistance: 4, ...ref } };
}
const melee = { name: '近击', type: '[伤害]', power: 12, hit: 100, guaranteedHit: true, damageType: '近战', range: { type: '单体', castRange: 1 } };
const lethal = { ...melee, name: '终击', power: 1000, damageType: '远程', range: { type: '单体', castRange: 20 } };

export function runTacticalFollowupCases(api, yaml = readFileSync(SAMPLE, 'utf8')) {
  const cases = [];
  const check = (id, pass, detail) => cases.push({ id, pass: !!pass, detail: detail == null ? '' : JSON.stringify(detail) });
  const make = (units, placementsById, objects = []) => {
    const scene = { sceneId: 'tactical-followup', grid: { columns: 16, rows: 12, metersPerCell: 1 }, ground: {}, objects };
    const b = api.createBattle({ units, placementsById: structuredClone(placementsById), scene, random: () => 0 });
    b.start(); return b;
  };
  const advanceTo = (b, id) => {
    for (let i = 0; i < 16 && b.snapshot().currentId !== id; i++) b.endAction();
    return b.snapshot().currentId === id;
  };
  const resourcesOf = b => b.battleState.combatState.clock.currentAction.resources;
  const coords = { h: at(1, 3), e: at(5, 3) };
  const combatants = () => [unit('h', 'hero', { spd: 300, moveDistance: 8 }), unit('e', 'enemy')];

  for (const pool of ['main', 'universal', 'none']) {
    const b = make(combatants(), coords);
    const r = resourcesOf(b);
    Object.assign(r, { moveRemaining: 0.5, main: pool === 'main' ? 1 : 0, universal: pool === 'universal' ? 1 : 0, skillMain: 1 });
    const before = b.snapshot().resources;
    const plan = b.sprintReachable();
    const unchanged = JSON.stringify(b.snapshot().resources) === JSON.stringify(before);
    const onlyOrigin = b.reachable().cells.length === 1;
    const paid = b.sprint();
    check('TF-01 冲刺预览与执行一致 · ' + pool, onlyOrigin && unchanged && (pool === 'none' ? plan === null && !paid.ok
      : plan && paid.ok && plan.payment[pool + 'Cost'] === 1 && plan.cells.length > 1
        && JSON.stringify(plan.cells) === JSON.stringify(b.reachable().cells)), [plan?.cells.length, paid.reason]);
  }

  const wall = { id: 'wall', kind: 'wall', bounds: { col: 3, row: 2, width: 1, height: 2 } };
  const target = aimAt(5, 3, 'e');
  let b = make(combatants(), coords, [wall]);
  const start = b.snapshot().resources;
  const plan = b.previewApproach(melee, target);
  const unchanged = JSON.stringify(b.snapshot().resources) === JSON.stringify(start);
  const moved = plan && b.move(plan.cell.col, plan.cell.row);
  const attacked = moved?.ok && b.attack(melee, target);
  check('TF-02 绕墙走到消耗最低的可攻击格，预览与实走扣费一致', plan && unchanged && plan.cell.col === 4 && plan.cell.row === 3
    && Math.abs(plan.cell.cost - (1 + 2 * Math.SQRT2)) < 1e-9 && Math.abs(moved.cell.cost - plan.cell.cost) < 1e-9 && attacked?.ok, [plan?.cell, moved?.cell, attacked?.reason]);
  check('TF-03 已在射程内保持原地攻击', b.previewAttack(melee, target).reason === '主行动已用完' && b.previewApproach(melee, target) === null);
  b = make(combatants(), { h: at(4, 3), e: coords.e });
  check('TF-03 射程内有行动点也不另规划', b.previewAttack(melee, target).ok && b.previewApproach(melee, target) === null);
  b = make(combatants(), coords);
  const ranged = b.previewApproach({ ...melee, damageType: '远程' }, target);
  resourcesOf(b).moveRemaining = 2;
  check('TF-04 非近战或步行额度不足不规划（不会暗扣冲刺）', ranged === null && b.previewApproach(melee, target) === null);
  b = make([...combatants(), unit('guard', 'enemy', {}, { classType: '防守者' })], { ...coords, guard: at(1, 2) });
  const intercepted = b.previewApproach(melee, target);
  const interrupted = intercepted && b.move(intercepted.cell.col, intercepted.cell.row);
  check('TF-04 接敌路线借机预警与截停一致，技能尚未花费', intercepted?.cell.opportunityIds.includes('guard')
    && interrupted?.stopped && b.snapshot().resources.main === 1 && !b.previewAttack(melee, target).ok);

  const fog = api.parseSkillEntry({ 名字: '雾域', 标签: '[致盲;power:15][Turns:5][必中]', 范围: { 类型: '爆炸', 射程: 12, 半径: 1 }, 区域: { 类型: '浓雾' } });
  const ward = api.parseSkillEntry({ 名字: '结界', 标签: '[肃正;power:15]', 范围: { 类型: '爆炸', 射程: 12, 半径: 1 } });
  for (const side of ['enemy', 'hero']) {
    const other = side === 'hero' ? 'enemy' : 'hero';
    b = make([unit('caster', side, { spd: 400 }), unit('peer', side, { spd: 300 }), unit('killer', other, { spd: 200 })],
      { caster: at(3, 2), peer: at(10, 2), killer: at(1, 2) });
    const a = advanceTo(b, 'caster') && b.attack(fog, aimAt(3, 5));
    const c = advanceTo(b, 'peer') && b.attack(fog, aimAt(10, 5));
    b.endAction();
    const w = advanceTo(b, 'caster') && b.attack(ward, aimAt(3, 7));
    const before = b.snapshot();
    const hit = advanceTo(b, 'killer') && b.attack(lethal, aimAt(3, 2, 'caster'));
    const after = b.snapshot();
    const ownFields = [...after.regions, ...after.barriers].filter(r => r.casterId === 'caster');
    const events = after.events.slice(before.events.length);
    check('TF-05 死亡清场仅敌方且不误删同名区域 · ' + side, a?.ok && c?.ok && w?.ok && hit?.ok
      && after.units.find(u => u.id === 'caster').hp === 0 && after.regions.some(r => r.casterId === 'peer')
      && (side === 'hero' ? ownFields.length === 2 && !events.some(ev => ev.type === 'barrier-removed')
        : ownFields.length === 0 && events.some(ev => ev.type === 'region-expired' && ev.regionId === before.regions.find(r => r.casterId === 'caster')?.id)
          && events.some(ev => ev.type === 'barrier-removed' && ev.barrier.casterId === 'caster' && ev.reason === 'caster-down')),
    { a: a?.reason, c: c?.reason, w: w?.reason, hit: hit?.reason, own: ownFields.length });
  }

  const item = api.parseItemEntry({ 名字: '结界瓶', 标签: '[肃正;power:15][消耗品][数量:1]', 范围: { 类型: '爆炸', 射程: 12, 半径: 1 } });
  b = make([unit('h', 'hero', { spd: 300 }, { items: [item] }), unit('e', 'enemy')], coords);
  const castFog = b.attack(fog, aimAt(1, 6));
  b.endAction(); advanceTo(b, 'h');
  const vial = b.ctx.units.find(u => u.id === 'h').items[0];
  const castWard = b.useItem(vial, aimAt(1, 8));
  const itemSkill = b.itemSkill(vial);
  const beforeDismiss = b.snapshot();
  const dismissed = b.hasActiveField(itemSkill) && b.dismissField(itemSkill);
  const wrong = b.dismissField({ name: '其它领域' });
  const retainedFog = b.hasActiveField(fog);
  const dismissedFog = b.dismissField(fog);
  const afterDismiss = b.snapshot();
  check('TF-06 原技能、耗尽的物品都能撤销自己的同名场地且费用不变', castFog.ok && castWard.ok && vial.count === 0
    && dismissed && !wrong && retainedFog && dismissedFog && !afterDismiss.regions.length && !afterDismiss.barriers.length
    && JSON.stringify(beforeDismiss.resources) === JSON.stringify(afterDismiss.resources)
    && beforeDismiss.units.find(u => u.id === 'h').mp === afterDismiss.units.find(u => u.id === 'h').mp,
  [castFog.reason, castWard.reason, vial.count, dismissed, retainedFog, dismissedFog]);

  const block = api.parseYamlText(yaml);
  const enemies = block.enemies.filter(u => /深潜者[AB]/.test(u.name));
  const skillOf = u => u.skills.find(s => s.name === '拉莱耶造雾术');
  const casters = [...enemies, block.heroes.find(u => skillOf(u))];
  const durations = casters.map(u => skillOf(u).turns);
  check('TF-07 权威样本只缩短两名敌方深潜者造雾', durations.join() === '3,3,5', durations);
  b = make([unit('h', 'hero'), unit('e', 'enemy', { spd: 300 })], coords);
  const castAt = b.snapshot().now;
  const enemyFog = b.attack(skillOf(enemies[0]), aimAt(5, 6));
  const region = b.snapshot().regions[0];
  let presentBefore = true;
  for (let i = 0; i < 20 && b.snapshot().now < castAt + 300 - 1e-9; i++) {
    presentBefore &&= b.snapshot().regions.length === 1;
    b.endAction();
  }
  check('TF-08 敌方造雾恰在施放后 300 虚拟时间到期', enemyFog.ok && region?.endAt === castAt + 300 && presentBefore
    && b.snapshot().now >= castAt + 300 - 1e-9 && b.snapshot().regions.length === 0
    && b.snapshot().events.some(ev => ev.type === 'region-expired' && ev.regionId === region.id));
  return { cases };
}

export const groups = {
  'TACTICAL-FOLLOWUP': { run: ({ modules: { battle, parser } }) => runTacticalFollowupCases({ ...battle, ...parser }) },
};
