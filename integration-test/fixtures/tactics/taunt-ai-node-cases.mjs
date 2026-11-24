import { readFileSync } from 'node:fs';
import { chooseTauntTarget, chooseEnemyAction } from '../../../tactics/src/ai.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { parseSkill } from '../../../tactics/src/parser.mjs';
import { getEffectiveStats } from '../../../tactics/src/class-passives.mjs';
import { passiveTauntBadges, fullStatusHtml, statusBadges } from '../../../tactics/src/status-ui.mjs';

const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail });
const scene = { sceneId: 'taunt-test', grid: { columns: 18, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects: [] };
const strike = parseSkill('【试射】[伤害:30][必中][远程][范围:单体;射程:10]');
function unit(id, side, cls = null, extra = {}) {
  return { id, name: id, side, classType: cls, skills: side === 'enemy' ? [strike] : [], items: [],
    footprint: { width: 1, height: 1 }, ref: { hp: 500, maxHp: 500, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 20, def: 0, spd: side === 'enemy' ? 300 : 50, evasion: 0, moveDistance: 0,
      strength: 50, totalWeight: 40, shield: 0, ...extra } };
}
function battleAt(random = () => 0.7) {
  const units = [unit('d', 'hero', '防守者'), unit('n', 'hero'), unit('s', 'hero', '隐匿者'), unit('e', 'enemy')];
  const b = createBattle({ units, placementsById: { d: { col: 6, row: 4 }, n: { col: 4, row: 6 }, s: { col: 2, row: 4 }, e: { col: 4, row: 4 } }, scene, random });
  b.start();
  return b;
}
function run() {
  const cases = [];
  const b = battleAt();
  const targets = ['d', 'n', 's'].map(id => b.ctx.units.find(u => u.id === id));
  const enemy = b.ctx.units.find(u => u.id === 'e');
  cases.push(ok('TA-01 开场有效嘲讽200/100/50', targets.map(t => b.statsOf(t).taunt).join(',') === '200,100,50'));
  const points = [0, 0.57, 0.58, 0.85, 0.86, 0.999].map(p => chooseTauntTarget(b.ctx, enemy, targets, () => p).id);
  cases.push(ok('TA-02 固定轮盘区间按嘲讽权重分配', points.join(',') === 'd,d,n,n,s,s', points.join(',')));
  const counts = { d: 0, n: 0, s: 0 };
  for (let i = 0; i < 7000; i++) counts[chooseTauntTarget(b.ctx, enemy, targets, () => (i + 0.5) / 7000).id]++;
  cases.push(ok('TA-03 均匀抽样按4:2:1分配', counts.d === 4000 && counts.n === 2000 && counts.s === 1000, JSON.stringify(counts)));
  let rolls = 0;
  b.ctx.random = () => { rolls++; return 0.86; };
  const plan = b.planEnemyAction();
  cases.push(ok('TA-04 真实行动规划按嘲讽抽选而非目标ID平局排序', plan.aim?.targetId === 's' && rolls === 1, JSON.stringify({ plan, rolls })));
  const result = b.attack(plan.skill, plan.aim);
  cases.push(ok('TA-05 真实攻击执行命中选定隐匿者', result.ok && result.hits.some(h => h.targetId === 's' && h.hpDmg > 0), JSON.stringify(result.hits)));

  const negative = battleAt();
  negative.buffsOf('s').push({ type: 'taunt', value: -100 });
  const s = negative.ctx.units.find(u => u.id === 's');
  cases.push(ok('TA-06 临时负嘲讽进入同一属性系统，总值可为负', negative.statsOf(s).taunt === -50));
  const negTargets = negative.ctx.units.filter(u => u.id === 'n' || u.id === 's');
  cases.push(ok('TA-07 负总嘲讽仍保留权重1而非绝对免选', chooseTauntTarget(negative.ctx, enemy, negTargets, () => 0.995).id === 's'));
  negative.buffsOf('s').splice(0);
  s.ref.baseTauntBonus = -100;
  cases.push(ok('TA-08 总嘲讽0也保留权重1', getEffectiveStats(s).taunt === 0 && chooseTauntTarget(negative.ctx, enemy, negTargets, () => 0.995).id === 's'));
  s.ref.baseTauntBonus = -50;
  negative.buffsOf('s').push({ type: 'taunt', value: 1000 });
  cases.push(ok('TA-09 临时正嘲讽立即改变下一次规划', negative.planEnemyAction().aim?.targetId === 's'));
  negative.reset();
  negative.start();
  cases.push(ok('TA-10 重开恢复防守者200与隐匿者50', negative.getEffectiveUnit('d').taunt === 200 && negative.getEffectiveUnit('s').taunt === 50));
  const d = negative.ctx.units.find(u => u.id === 'd');
  d.ref.baseTauntBonus += 20;
  cases.push(ok('TA-11 永久嘲讽+20无需独立仇恨缓存', negative.getEffectiveUnit('d').taunt === 220));
  d.ref.baseTauntBonus = 100;
  cases.push(ok('TA-12 永久嘲讽重置立即恢复200', negative.getEffectiveUnit('d').taunt === 200));

  const wise = battleAt(() => 0);
  wise.ctx.units.find(u => u.id === 'e').ref.isWise = true;
  wise.ctx.units.find(u => u.id === 's').ref.hp = 50;
  wise.ctx.units.find(u => u.id === 'n').ref.hp = 100;
  cases.push(ok('TA-13 智慧标记优先最残血目标，无视高嘲讽', wise.planEnemyAction().aim?.targetId === 's'));
  wise.ctx.units.find(u => u.id === 's').ref.hp = 500;
  wise.ctx.units.find(u => u.id === 'n').ref.hp = 500;
  cases.push(ok('TA-14 智慧无低于30%目标时回到嘲讽', wise.planEnemyAction().aim?.targetId === 'd'));
  wise.ctx.canSeeUnit = (_, id) => id !== 'd';
  cases.push(ok('TA-15 高嘲讽不可见时不进入候选', wise.planEnemyAction().aim?.targetId === 'n'));
  wise.ctx.units.find(u => u.id === 'n').ref.hp = 0;
  cases.push(ok('TA-16 倒地单位不进入候选', wise.planEnemyAction().aim?.targetId === 's'));
  wise.ctx.units.find(u => u.id === 's').ref.isSubdued = true;
  cases.push(ok('TA-17 被制服单位不进入自动选敌', !wise.planEnemyAction().skill));

  const ranged = battleAt(() => 0);
  ranged.ctx.placementsById.d = { col: 17, row: 11 };
  cases.push(ok('TA-18 高嘲讽超出射程不得强行攻击', ranged.planEnemyAction().aim?.targetId === 'n'));
  const support = battleAt(() => { throw new Error('辅助技能不应抽仇恨骰'); });
  const heal = parseSkill('【治疗】[回复:40][范围:单体;射程:10]');
  const mate = unit('ally', 'enemy', null, { hp: 100 });
  support.ctx.units.push(mate);
  support.ctx.placementsById.ally = { col: 4, row: 5 };
  support.ctx.footprintsById.ally = mate.footprint;
  const healing = chooseEnemyAction(support.ctx, 'e', 0, [heal]);
  cases.push(ok('TA-19 治疗维持缺血队友优先，不混入仇恨轮盘', healing.aim?.targetId === 'ally'));

  const area = battleAt(() => 0.999);
  area.ctx.placementsById.d = { col: 6, row: 4 };
  area.ctx.placementsById.n = { col: 6, row: 5 };
  area.ctx.placementsById.s = { col: 1, row: 4 };
  const blast = parseSkill('【圆爆】[伤害:30][范围:爆炸;射程:10;半径:1.5]');
  const aoe = chooseEnemyAction(area.ctx, 'e', 0, [blast]);
  const query = area.previewAttack(blast, aoe.aim);
  cases.push(ok('TA-20 AoE保留多目标覆盖收益，不因抽选退化为单目标', query.damageTargetIds.includes('d') && query.damageTargetIds.includes('n'), JSON.stringify(query.damageTargetIds)));

  const lowerDamage = battleAt(() => 0);
  lowerDamage.ctx.units.find(u => u.id === 'd').ref.def = 29;
  cases.push(ok('TA-21 嘲讽不是收益平局裁决，低伤害目标也参与抽选', lowerDamage.planEnemyAction().aim?.targetId === 'd'));
  const pursuit = createBattle({ units: [unit('d', 'hero', '防守者'), unit('n', 'hero'), unit('s', 'hero', '隐匿者'),
    unit('e', 'enemy', null, { moveDistance: 1 })], placementsById: { d: { col: 13, row: 4 }, n: { col: 9, row: 8 }, s: { col: 5, row: 4 }, e: { col: 9, row: 4 } },
    scene, random: () => 0.99 });
  pursuit.ctx.units.find(u => u.id === 'e').skills = [parseSkill('【追击】[伤害:30][范围:单体;射程:1]')];
  pursuit.start();
  const chase = pursuit.planEnemyAction();
  cases.push(ok('TA-22 当前射程外的追击方案同样按嘲讽选定方向', chase.moveTo?.col < 9 && !chase.skill, JSON.stringify(chase)));
  const aging = createBattle({ units: [unit('d', 'hero', '防守者', { spd: 300 }), unit('e', 'enemy')],
    placementsById: { d: { col: 6, row: 4 }, e: { col: 4, row: 4 } }, scene, random: () => 0.5 });
  aging.ctx.units.find(u => u.id === 'e').ref.spd = 100;
  aging.start();
  const taunted = aging.attack(parseSkill('【挑衅】[嘲讽:100][Turns:1][范围:自身]'), { x: 6.5, y: 4.5, targetId: 'd' });
  const boosted = aging.getEffectiveUnit('d').taunt;
  for (let i = 0; i < 8 && aging.getEffectiveUnit('d').taunt > 200; i++) aging.endAction();
  cases.push(ok('TA-23 真实临时嘲讽到期后有效总值恢复，不缓存旧权重', taunted.ok && boosted === 300 && aging.getEffectiveUnit('d').taunt === 200,
    JSON.stringify({ boosted, expired: aging.getEffectiveUnit('d').taunt, now: aging.snapshot().now })));

  const guardBadge = passiveTauntBadges(b.getEffectiveUnit('d'));
  const stealthBadge = passiveTauntBadges(b.getEffectiveUnit('s'));
  const html = fullStatusHtml([...guardBadge, ...stealthBadge]);
  cases.push(ok('TA-UI1 永久标签正确显示+100/-50且无回合期限', /仇恨\+100/.test(html) && /隐匿-50/.test(html) && !/回|t-st-exp/.test(html), html));
  cases.push(ok('TA-UI2 标签悬停说明当前总嘲讽及最低权重', /总嘲讽 200/.test(html) && /总嘲讽 50/.test(html) && /最低1/.test(html)));
  const changed = b.getEffectiveUnit('d');
  changed.baseTauntBonus = 120; changed.taunt = 220;
  cases.push(ok('TA-UI3 永久值变化同步标签，不叠加进临时buff', passiveTauntBadges(changed)[0].text === '仇恨+120' && !statusBadges(changed).some(x => x.key === 'passive-taunt')));
  const main = readFileSync(new URL('../../../tactics/src/main.mjs', import.meta.url), 'utf8');
  cases.push(ok('TA-UI4 仅底部英雄卡并入永久标签，地图维持原状态列表', /view\.setStatus\(u\.id, compactStatusHtml\(list\)\)/.test(main)
    && /shell\.setHeroStatus\(u\.id, fullStatusHtml\(\[\.\.\.passive, \.\.\.list\]\)\)/.test(main)));
  return { cases };
}
export const groups = { 'TAUNT-AI': { run } };
