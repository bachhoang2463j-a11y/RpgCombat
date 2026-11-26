// P07 原版还原轮：敌方自然 charge / 温切斯特父子 / 演出调度（真实 createBattle 与真实导演，不复制结算公式）。
import fs from 'node:fs';
import { parseYamlText, parseSkill } from '../../../tactics/src/parser.mjs';
import { createScenarioData } from '../../../tactics/src/scenario-data.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';
import { dispatchClock } from '../../../tactics/src/clock.mjs';

const map = () => ({ sceneId: 'p07av', grid: { columns: 30, rows: 18, metersPerCell: 1 }, ground: {}, objects: [] });
function unit(id, side, opts = {}) {
  return { id, name: id, side, controller: opts.controller || (side === 'hero' ? 'player' : 'ai'), classType: null,
    footprint: { width: 1, height: 1 }, attrTags: [], skills: opts.skills || [], items: [],
    ref: { hp: opts.hp ?? 5000, maxHp: opts.hp ?? 5000, mp: 100, maxMp: 100, tp: 0, maxTp: 100, atk: 20, def: 0, spd: opts.spd ?? 100,
      evasion: 0, strength: 50, totalWeight: 70, perception: 100, moveDistance: opts.moveDistance ?? 6, shield: 0 } };
}
function make(units, placements) {
  const b = createBattle({ units, placementsById: placements, scene: map(), random: () => 0.5 });
  b.start(); return b;
}
function nextActor(b, id) { for (let i = 0; i < 40 && b.snapshot().currentId !== id; i++) b.endAction(); }
const evs = (b, type) => b.snapshot().events.filter(ev => ev.type === type);

function chargeCases() {
  const cases = [];
  const check = (id, pass, detail = '') => cases.push({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  const claw = () => parseSkill('【爪击】[钝击;power:10][近战][范围:单体;射程:2]');
  const ult = () => parseSkill('【灭世】[钝击;power:30][近战][Charge:2][范围:单体;射程:2]');
  {
    const e = unit('e', 'enemy', { skills: [claw(), ult()] }), h = unit('h', 'hero');
    const b = make([h, e], { h: { col: 4, row: 4 }, e: { col: 5, row: 4 } });
    const turns = [];
    for (let i = 0; i < 4; i++) {
      nextActor(b, 'e');
      const before = b.battleState.combatState.charges?.e?.current || 0;
      const relBefore = evs(b, 'charge-released').length;
      b.runEnemyTurn();
      const c = b.battleState.combatState.charges.e;
      turns.push({ before, after: c.current, released: evs(b, 'charge-released').length - relBefore, inventory: c.inventory, preparing: c.preparing });
    }
    check('TP7AV-A 未满正常行动且行动末+1，刚满不插入大招', turns[0].before === 0 && turns[0].after === 1 && turns[0].released === 0
      && turns[1].after === 2 && turns[1].released === 0, turns);
    check('TP7AV-A 满后下次正常行动直接释放大招并清空，当次不再增长', turns[2].before === 2 && turns[2].released === 1 && turns[2].after === 0
      && turns[3].after === 1 && turns[3].released === 0, turns);
    check('TP7AV-A 充能不占加速库存、不进入 preparing', turns.every(t => t.inventory === 0 && t.preparing === null), turns);
    check('TP7AV-A 每个自然行动只增长一次（charge-gained=非满起手的自然行动数）', evs(b, 'charge-gained').length === 3, evs(b, 'charge-gained'));
    const rel = evs(b, 'charge-released')[0];
    check('TP7AV-A 大招释放事件挂在真实攻击上供 Cut-in 使用', rel && rel.attackId && rel.skillName === '灭世' && rel.unitId === 'e', rel);
  }
  {
    // 再动/额外主点：同一自然行动内多次出手不重复充能
    const e = unit('e', 'enemy', { skills: [claw(), ult()] }), h = unit('h', 'hero');
    const b = make([h, e], { h: { col: 4, row: 4 }, e: { col: 5, row: 4 } });
    nextActor(b, 'e');
    dispatchClock(b.battleState, { type: 'grantMainPoint', targetId: 'e', sourceKey: 'p07av-extra' });
    b.battleState.combatState.clock.currentAction.resources.main = 2;
    b.runEnemyTurn();
    const attacks = b.snapshot().log.filter(s => /爪击/.test(s)).length;
    check('TP7AV-A 再动两次出手仍只 +1', b.battleState.combatState.charges.e.current === 1 && evs(b, 'charge-gained').length === 1, { current: b.battleState.combatState.charges.e.current, attacks });
  }
  {
    // 满充能但无合法目标：不白白消耗
    const e = unit('e', 'enemy', { skills: [claw(), ult()], moveDistance: 1 }), h = unit('h', 'hero');
    const b = make([h, e], { h: { col: 2, row: 4 }, e: { col: 20, row: 4 } });
    nextActor(b, 'e');
    b.battleState.combatState.charges = { e: { inventory: 0, preparing: null, current: 2 } };
    b.runEnemyTurn();
    check('TP7AV-A 满充能无合法目标时保留充能', b.battleState.combatState.charges.e.current === 2 && evs(b, 'charge-released').length === 0, b.battleState.combatState.charges.e);
  }
  {
    // 玩家/未满门槛：未满的 charge 技能对 AI 不可用；普通 delay 准备不变
    const e = unit('e', 'enemy', { skills: [ult()] }), h = unit('h', 'hero');
    const b = make([h, e], { h: { col: 4, row: 4 }, e: { col: 5, row: 4 } });
    nextActor(b, 'e');
    const st = b.skillStatus(e.skills[0]);
    check('TP7AV-A 未满 charge 技能 AI 不可用（不进入主动准备）', !st.ok && /充能未满/.test(st.reason), st);
    nextActor(b, 'h');
    const chant = parseSkill('【咏唱】[钝击;power:10][近战][延迟:2][范围:单体;射程:2]');
    const r = b.attack(chant, { ...unitCenter(b.ctx.placementsById.e, b.ctx.footprintsById.e), targetId: 'e' });
    check('TP7AV-A 普通[延迟]仍走主动准备', r.ok && r.preparing && b.snapshot().preparation?.source === 'delay', r.reason || b.snapshot().preparation);
  }
  return { cases };
}

function winchesterCases() {
  const cases = [];
  const check = (id, pass, detail = '') => cases.push({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  const d = createScenarioData(parseYamlText(fs.readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8')));
  const frank = d.units.find(u => u.name === '弗兰克');
  const group = frank.skills.find(s => s.name === '温切斯特');
  const deer = frank.skills.find(s => s.name === '鹿弹二连发'), slug = frank.skills.find(s => s.name === '独头二连发');
  check('TP7AV-W 温切斯特父组两子技能', group && group.isGroup && group.children.length === 2 && group.children.includes(deer) && group.children.includes(slug), group && group.children.map(c => c.name));
  const target = d.units.find(u => u.side === 'enemy');
  const b = createBattle({ units: [{ ...structuredClone(frank), id: 'f', controller: 'player', ref: { ...frank.ref, tp: 100 } }, { ...structuredClone(target), id: 't', controller: 'player' }],
    placementsById: { f: { col: 5, row: 5 }, t: { col: 9, row: 5 } }, scene: map(), random: () => 0.5 });
  b.start();
  const fu = b.ctx.units.find(u => u.id === 'f');
  const fGroup = fu.skills.find(s => s.name === '温切斯特');
  check('TP7AV-W 父组不可直接施放、不作为兜底攻击', !b.skillStatus(fGroup).ok, b.skillStatus(fGroup));
  const fSlug = fu.skills.find(s => s.name === '独头二连发');
  const ammo = fu.items.find(it => it.name === '12号独头弹');
  const before = ammo.count;
  const r = b.attack(fSlug, { ...unitCenter(b.ctx.placementsById.t, b.ctx.footprintsById.t), targetId: 't' });
  check('TP7AV-W 独头二连发真实执行两段并按子技能名消耗弹药', r.ok && r.shots && r.shots.length === 2 && ammo.count === before - 2, { ok: r.ok, reason: r.reason, shots: r.shots && r.shots.length, before, after: ammo.count });
  const fDeer = fu.skills.find(s => s.name === '鹿弹二连发');
  check('TP7AV-W 鹿弹二连发保留转火与特效身份', fDeer && fDeer.switchTarget === true && fDeer.fxTag === '霰弹' && slug.fxTag === '独头弹' && fDeer.range.type === '扇形', fDeer && { fx: fDeer.fxTag, switchTarget: fDeer.switchTarget, slug: slug.fxTag });
  return { cases };
}

export const groups = { 'TP7AV-A': { run: chargeCases }, 'TP7AV-W': { run: winchesterCases } };
