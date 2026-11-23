import fs from 'node:fs';
import { parseYamlText } from '../../../tactics/src/parser.mjs';
import { createScenarioData, createSeededRandom } from '../../../tactics/src/scenario-data.mjs';
import { createBattle, itemAsSkill, skillSupport } from '../../../tactics/src/battle.mjs';
import { skillSlots } from '../../../tactics/src/effect-definitions.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';

const text = fs.readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8');
const scene = { sceneId: 'skill-coverage', grid: { columns: 30, rows: 20, metersPerCell: 1 }, objects: [] };
const result = (id, pass, detail) => ({ id, pass: !!pass, detail: detail || '' });
const SEED = 20261123;
const data = createScenarioData(parseYamlText(text));

function drive(gen, choose = () => null) { let s = gen.next(); while (!s.done) s = gen.next(choose(s.value)); return s.value; }
function actUntil(b, id) { for (let i = 0; i < 60 && b.snapshot().currentId !== id; i++) b.endAction(); }
function usesOf(b, id) { return Object.values(b.battleState.perBattleUses?.[id] || {}).reduce((n, v) => n + (v || 0), 0); }
function buffsOf(b, id) { return (b.battleState.combatState.buffs?.[id]) || []; }

// 专用主动技夹具：30x20 测试场 + 克隆施术者 + 木桩目标；非正式主棋盘，原技能成本/属性/次数不变。
function createCase(source, skill) {
  const caster = structuredClone(source);
  caster.id = 'caster'; caster.side = 'hero'; caster.controller = 'player'; caster.classType = null;
  const target = { id: 'target', name: '验证目标', side: 'enemy', controller: 'player', footprint: { width: 1, height: 1 },
    ref: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, tp: 0, maxTp: 100, atk: 20, def: 0, spd: 50, evasion: 0, moveDistance: 6, perception: 50 }, skills: [], items: [] };
  const targetCol = skill.range?.castRange === 1 ? 5 : 6;
  const b = createBattle({ units: [caster, target], placementsById: { caster: { col: 4, row: 4, facing: 90 }, target: { col: targetCol, row: 4 } }, scene,
    random: createSeededRandom(SEED), summonProvider: data.summonProvider });
  b.start(); actUntil(b, 'caster');
  // 专项夹具保留原技能成本与次数；所需TP通过正常防御积累，不直接注入余额。
  for (let i = 0; caster.ref.tp < (skill.tpCost || 0) && i < 6; i++) { b.defend(); b.endAction(); actUntil(b, 'caster'); }
  return { b, caster, target };
}

// 反应专项夹具：攻击者用匹配伤害类型的单体攻击，真实驱动 beginAttack 生成器；固定种子+零闪避保证将命中可重复。
// 普通反应：受击者本人持有反应技；舍身：守护者持有舍身，攻击者打其邻近友军。
function createReactionCase(source, skill) {
  const responder = structuredClone(source);
  responder.id = 'responder'; responder.side = 'hero'; responder.controller = 'player'; responder.classType = null;
  responder.ref.evasion = 0;
  responder.skills = [skill]; // 反应专项：隔离为唯一反应技，避免随绑定/道具子技能不在候选或相互干扰
  const incoming = (skill.sheshenTarget && skill.sheshenTarget !== 'all') ? skill.sheshenTarget
    : (skill.kanpoTarget && skill.kanpoTarget !== 'all') ? skill.kanpoTarget
      : (skill.reactionTarget && skill.reactionTarget !== 'all') ? skill.reactionTarget : '近战';
  const attack = { name: 'reaction-probe', type: '[伤害]', power: 60, hit: 100, cost: 0, damageType: incoming,
    range: { type: '单体', castRange: 10 }, actionCost: { main: 1, aux: 0 } };
  const attacker = { id: 'attacker', name: '攻击者', side: 'enemy', controller: 'player', footprint: { width: 1, height: 1 },
    ref: { hp: 500, maxHp: 500, mp: 100, maxMp: 100, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 300, evasion: 0, moveDistance: 6, perception: 50 }, skills: [], items: [] };
  const sheshen = !!skill.sheshenTarget;
  const units = [attacker, responder];
  const placements = { attacker: { col: 5, row: 5, facing: 90 }, responder: { col: 6, row: sheshen ? 6 : 5 } };
  let targetId = 'responder';
  if (sheshen) {
    const ally = { id: 'ally', name: '被保护友军', side: 'hero', controller: 'player', footprint: { width: 1, height: 1 },
      ref: { hp: 500, maxHp: 500, mp: 100, maxMp: 100, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 50, evasion: 0, moveDistance: 6, perception: 50 }, skills: [], items: [] };
    units.push(ally); placements.ally = { col: 6, row: 5 }; targetId = 'ally';
  }
  const b = createBattle({ units, placementsById: placements, scene, random: createSeededRandom(SEED), summonProvider: data.summonProvider });
  b.start();
  for (let i = 0; responder.ref.tp < (skill.tpCost || 0) && i < 6; i++) {
    actUntil(b, 'responder');
    b.defend();
    b.endAction();
  }
  actUntil(b, 'attacker');
  const target = b.ctx.units.find(u => u.id === targetId);
  const aim = { ...unitCenter(placements[targetId], target.footprint), targetId };
  const hpBefore = responder.ref.hp;
  const mpBefore = responder.ref.mp;
  const attackerHpBefore = attacker.ref.hp;
  const usesBefore = usesOf(b, responder.id);
  let seen = null, selected = null;
  const r = drive(b.beginAttack(attack, aim, {
    autoAnswer: req => {
      seen = req;
      const cand = (req.candidates || []).find(c => c.skill.name === skill.name
        && (!!c.skill.sheshenTarget) === sheshen && (sheshen ? c.responderId === responder.id : true));
      if (!cand) return null;
      selected = cand;
      return { responderId: cand.responderId, skill: cand.skill };
    },
  }));
  const hit = (r.hits || [])[0] || {};
  const reaction = hit.reaction || null;
  const mpDelta = mpBefore - responder.ref.mp;
  const usesAfter = usesOf(b, responder.id);
  const cost = skill.cost || 0;
  const maxUses = skill.maxUses || 0;
  const drained = (reaction && reaction.drained) || 0;
  const expectedMpDelta = Math.max(0, cost - drained);
  const econOk = (cost > 0 ? mpDelta === expectedMpDelta : true) && (maxUses > 0 ? usesAfter === usesBefore + 1 : true);
  const eventOk = (b.snapshot().log || []).some(l => l.includes('反应 · ' + skill.name));
  const slots = skillSlots(skill);
  const kinds = new Set(slots.map(s => s.definition.kind));
  const hasEva = slots.some(s => s.definition.field === 'eva');
  let kind = '其他', outcome = false;
  if (sheshen) { kind = '舍身'; outcome = !!reaction && reaction.guardianId === responder.id && responder.ref.hp < hpBefore; }
  else if (skill.kanpoTarget) { kind = '看破'; outcome = !!reaction && reaction.canceled === true; }
  else if (kinds.has('counter')) { kind = '反击'; outcome = !!reaction && reaction.countered === true && attacker.ref.hp < attackerHpBefore; }
  else if (hasEva) { kind = '回避'; outcome = !!reaction && (reaction.dodged === true || buffsOf(b, responder.id).some(x => x.type === 'eva')); }
  else if (kinds.has('damageGuard') || kinds.has('shield')) { kind = '减伤/护盾'; outcome = !!reaction && (hit.guardDmg > 0 || hit.shieldDmg > 0 || hit.hit !== undefined); }
  else { outcome = !!reaction; }
  const pass = !!seen && !!selected && !!r && r.ok !== false && !!reaction && econOk && eventOk && outcome;
  return result('TT-SKILL[反应专项] ' + skill.name + '·' + kind, pass, JSON.stringify({
    seen: !!seen, selected: selected && selected.skill.name, kind, mpDelta, uses: usesBefore + '->' + usesAfter,
    event: eventOk, outcome, guardianId: reaction && reaction.guardianId, reason: r && r.reason,
  }));
}

function run() {
  const cases = [];
  const templates = ['幻梦行军兽', '化尘者'].map(name => {
    const d = data.summonProvider(name);
    return { id: name, name, ref: { ...d, hp: d.maxHp, mp: d.maxMp, tp: 0 }, footprint: d.footprint, skills: d.skills, items: [], attrTags: d.attrTags };
  });
  for (const source of [...data.units, ...templates]) {
    const entries = [...source.skills, ...source.items.filter(i => i.category !== '弹药' && !i.bindings?.length)
      .flatMap(item => item.children?.length ? item.children.map(child => itemAsSkill(item, child)) : [itemAsSkill(item)])];
    for (const skill of entries) {
      if (skill.isGroup || skill.isDeathTrigger) continue;
      if (skill.isReaction || skill.kanpoTarget || skill.sheshenTarget) {
        cases.push(createReactionCase(source, skill));
        continue;
      }
      const name = source.name + '·' + skill.name;
      const { b, caster, target } = createCase(source, skill);
      const slots = skillSlots(skill);
      const ally = slots.some(s => !s.debuff && !s.attack && s.definition.side === 'ally');
      const aim = skill.range.type === '召唤' ? { x: 8.5, y: 4.5 } : { ...unitCenter(b.ctx.placementsById[ally ? 'caster' : 'target'], ally ? caster.footprint : target.footprint), targetId: ally ? 'caster' : 'target' };
      let r = drive(b.beginAttack(skill, aim));
      for (let i = 0; r.preparing && i < 10; i++) {
        b.endAction(); actUntil(b, 'caster');
        const prep = b.snapshot().preparation;
        if (prep?.ready) r = drive(b.beginAttack(skill, aim));
      }
      const meaningful = r.ok && !r.preparing && (r.hits?.length || r.effects?.length || r.summons?.length || skill.barrierSub || skill.regionEffect);
      cases.push(result('TT-SKILL[专项夹具] 主动执行 ' + name, meaningful,
        meaningful ? '专用30x20测试场，非正式主棋盘；原技能成本/属性/次数未改' : JSON.stringify({ ok: r.ok, reason: r.reason, prep: b.snapshot().preparation })));
    }
  }
  // D1-1 整技暴击倍率（含非伤害槽翻倍 + 自盲固定代价不翻倍）
  {
    const alwaysCritRng = () => 0.01;
    const elliott = data.units.find(u => u.name === '埃利奥特');
    const frank = data.units.find(u => u.name === '弗兰克');
    const fork = elliott.items.find(i => i.name === '安魂曲音叉');
    const shatter = itemAsSkill(fork, fork.children.find(c => c.name === '碎裂之响'));
    const shieldSkill = elliott.skills.find(s => s.name === '巫师护盾');
    const krupp = frank.skills.find(s => s.name === '克虏伯1918型');
    const { b: b1, target: t1 } = createCase(elliott, shatter);
    b1.ctx.random && (b1.ctx.random = alwaysCritRng);
    const b1Crit = createBattle({
      units: structuredClone(b1.ctx.units), placementsById: structuredClone(b1.ctx.placementsById),
      scene, random: alwaysCritRng, summonProvider: data.summonProvider,
    });
    b1Crit.start();
    const r1 = drive(b1Crit.beginAttack(shatter, { ...unitCenter(b1Crit.ctx.placementsById.target, t1.footprint), targetId: 'target' }));
    const defEff = (r1.effects || []).find(e => e.kind === 'buff' && e.field === 'def');
    cases.push(result('TT-SKILL[D1-1] 碎裂之响暴击降防翻倍(-40)', r1.ok && r1.crit === true && defEff?.value === -40, JSON.stringify({ crit: r1.crit, defEff })));

    const b2 = createBattle({
      units: [
        { id: 'atk', name: '敌', side: 'enemy', controller: 'player', footprint: { width: 1, height: 1 }, ref: { hp: 200, maxHp: 200, mp: 50, maxMp: 50, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 300, evasion: 0, moveDistance: 6, perception: 50 }, skills: [], items: [] },
        { id: 'res', name: '埃利奥特', side: 'hero', controller: 'player', footprint: { width: 1, height: 1 }, ref: { hp: 200, maxHp: 200, mp: 50, maxMp: 50, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 50, evasion: 0, moveDistance: 6, perception: 50 }, skills: [shieldSkill], items: [] },
      ],
      placementsById: { atk: { col: 5, row: 5 }, res: { col: 6, row: 5 } },
      scene, random: alwaysCritRng,
    });
    b2.start();
    const probeAtk = { name: 'p', type: '[伤害]', power: 50, hit: 100, cost: 0, damageType: '近战', range: { type: '单体', castRange: 5 }, actionCost: { main: 1, aux: 0 } };
    const r2 = drive(b2.beginAttack(probeAtk, { ...unitCenter({ col: 6, row: 5 }, { width: 1, height: 1 }), targetId: 'res' }, { autoAnswer: () => ({ responderId: 'res', skill: shieldSkill }) }));
    const react2 = r2.hits?.[0]?.reaction;
    const shieldDmg2 = (r2.hits?.[0]?.segments || []).reduce((n, s) => n + (s.shieldDmg || 0), 0);
    cases.push(result('TT-SKILL[D1-1] 巫师护盾暴击护盾翻倍(360)', r2.ok && react2?.crit === true && (b2.ctx.units[1].ref.shield + shieldDmg2) === 360, JSON.stringify({ react2, shieldLeft: b2.ctx.units[1].ref.shield, shieldDmg2 })));

    const { b: b3, target: t3 } = createCase(frank, krupp);
    const b3Crit = createBattle({
      units: structuredClone(b3.ctx.units), placementsById: structuredClone(b3.ctx.placementsById),
      scene, random: alwaysCritRng, summonProvider: data.summonProvider,
    });
    b3Crit.start();
    const aim3 = { ...unitCenter(b3Crit.ctx.placementsById.target, t3.footprint), targetId: 'target' };
    let r3 = drive(b3Crit.beginAttack(krupp, aim3));
    for (let i = 0; r3.preparing && i < 6; i++) {
      b3Crit.endAction(); actUntil(b3Crit, 'caster');
      if (b3Crit.snapshot().preparation?.ready) r3 = drive(b3Crit.beginAttack(krupp, aim3));
    }
    const selfBlind = (r3.effects || []).find(e => e.kind === 'buff' && e.field === 'hit');
    cases.push(result('TT-SKILL[D1-1] 克虏伯暴击但自盲固定代价不翻倍(-120)', r3.ok && r3.crit === true && selfBlind?.value === -120, JSON.stringify({ crit: r3.crit, selfBlind })));
  }

  // D1-2 逆咒归源镜纯载体拦截
  {
    const elliott = data.units.find(u => u.name === '埃利奥特');
    const mirror = elliott.items.find(i => i.name === '逆咒归源镜');
    const sup = skillSupport(itemAsSkill(mirror));
    cases.push(result('TT-SKILL[D1-2] 逆咒归源镜纯载体不可主动施放', sup.ok === false && sup.reason === '仅作为绑定技能的次数载体', JSON.stringify(sup)));
  }

  // D1-3 交互式两段 [转火]（单体切目标 + 扇形重调朝向）
  {
    const frank = data.units.find(u => u.name === '弗兰克');
    const suigu = frank.skills.find(s => s.name === '碎骨连打');
    const ludan = frank.skills.find(s => s.name === '温切斯特M1897-鹿弹二连发');
    const makeEnemy = (id, name) => ({ id, name, side: 'enemy', controller: 'player', footprint: { width: 1, height: 1 }, ref: { hp: 500, maxHp: 500, mp: 50, maxMp: 50, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 50, evasion: 0, moveDistance: 6, perception: 50 }, skills: [], items: [] });
    const hero = { ...structuredClone(frank), id: 'caster', side: 'hero', controller: 'player', ref: { ...frank.ref, hp: 500, maxHp: 500, tp: 100, maxTp: 100 } };
    const bSw = createBattle({
      units: [hero, makeEnemy('e1', '北敌'), makeEnemy('e2', '东敌')],
      placementsById: { caster: { col: 5, row: 5 }, e1: { col: 5, row: 4 }, e2: { col: 6, row: 5 } },
      scene, random: createSeededRandom(SEED),
    });
    bSw.start();
    const gen1 = bSw.beginAttack(suigu, { ...unitCenter({ col: 5, row: 4 }, { width: 1, height: 1 }), targetId: 'e1' });
    let s1 = gen1.next();
    let seenRetarget1 = false;
    while (!s1.done) {
      if (s1.value?.type === 'retarget-request') {
        seenRetarget1 = true;
        s1 = gen1.next({ ...unitCenter({ col: 6, row: 5 }, { width: 1, height: 1 }), targetId: 'e2' });
      } else s1 = gen1.next(null);
    }
    const rSw1 = s1.value;
    const hitE1 = rSw1.hits.some(h => h.targetId === 'e1'), hitE2 = rSw1.hits.some(h => h.targetId === 'e2');
    cases.push(result('TT-SKILL[D1-3] 碎骨连打交互两段转火切换目标', seenRetarget1 && rSw1.ok && hitE1 && hitE2, JSON.stringify({ seenRetarget1, hits: rSw1.hits.map(h => h.targetId) })));

    const bSec = createBattle({
      units: [structuredClone(hero), makeEnemy('n1', '北敌'), makeEnemy('s1', '南敌')],
      placementsById: { caster: { col: 5, row: 5 }, n1: { col: 5, row: 3 }, s1: { col: 5, row: 7 } },
      scene, random: createSeededRandom(SEED),
    });
    bSec.start();
    const gen2 = bSec.beginAttack(ludan, { ...unitCenter({ col: 5, row: 3 }, { width: 1, height: 1 }) });
    let s2 = gen2.next();
    let seenRetarget2 = false;
    while (!s2.done) {
      if (s2.value?.type === 'retarget-request') {
        seenRetarget2 = true;
        s2 = gen2.next({ ...unitCenter({ col: 5, row: 7 }, { width: 1, height: 1 }) });
      } else s2 = gen2.next(null);
    }
    const rSw2 = s2.value;
    cases.push(result('TT-SKILL[D1-3] 鹿弹二连发交互两段扇形转火重调朝向', seenRetarget2 && rSw2.ok && rSw2.hits.some(h => h.targetId === 'n1') && rSw2.hits.some(h => h.targetId === 's1'),
      JSON.stringify({ seenRetarget2, hits: rSw2.hits.map(h => h.targetId) })));
  }

  // D1-4 [智慧] 对象路径回填 isWise
  {
    const deepA = data.units.find(u => u.name === '深潜者A');
    const ith = data.units.find(u => u.name === '伊塔库亚的眷族');
    const yog = data.units.find(u => u.name === '犹格索托斯之子');
    cases.push(result('TT-SKILL[D1-4] [智慧]特性对象路径回填 isWise', deepA?.ref?.isWise === true && ith?.ref?.isWise === true && yog?.ref?.isWise === false,
      JSON.stringify({ deepA: deepA?.ref?.isWise, ith: ith?.ref?.isWise, yog: yog?.ref?.isWise })));
  }

  return { cases };
}

export const groups = { 'TT-SKILLS': { run } };

if (typeof process !== 'undefined' && process.argv && process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('typical-skills-node-cases.mjs')) {
  const { cases } = run();
  for (const c of cases) console.log((c.pass ? 'PASS ' : 'FAIL ') + c.id + (c.pass ? '' : ' :: ' + c.detail));
  const failed = cases.filter(c => c.pass !== true).length;
  console.log('[TT-SKILLS] cases=' + cases.length + ' passed=' + (cases.length - failed) + ' failed=' + failed);
  if (!cases.length || failed > 0) process.exit(1);
}
