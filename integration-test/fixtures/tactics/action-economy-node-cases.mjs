import assert from 'node:assert/strict';
import { createBattle, BASIC_ATTACK } from '../../../tactics/src/battle.mjs';
import { skillActionKind } from '../../../tactics/src/actions.mjs';
import { parseSkill } from '../../../tactics/src/parser.mjs';

const scene = { sceneId: 'action-economy', grid: { columns: 16, rows: 8, metersPerCell: 1 }, ground: {}, objects: [], encounter: true };
const at = (col, row = 3) => ({ col, row, facing: 0 });
const aim = (b, id) => {
  const p = b.ctx.placementsById[id], fp = b.ctx.footprintsById[id];
  return { x: p.col + fp.width / 2, y: p.row + fp.height / 2, targetId: id };
};
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 100;
  return { id, name: id, side, level: opts.level, classType: opts.classType,
    controller: opts.controller || (side === 'enemy' ? 'ai' : 'player'), footprint: opts.footprint || { width: 1, height: 1 },
    skills: opts.skills || [], items: opts.items || [], attrTags: [], ref: {
      hp, maxHp: opts.maxHp ?? hp, mp: opts.mp ?? 40, maxMp: opts.maxMp ?? 40,
      tp: opts.tp ?? 0, maxTp: 100, atk: 20, def: 0, spd: opts.spd ?? (side === 'hero' ? 200 : 100), evasion: 0,
      perception: 100, moveDistance: opts.moveDistance ?? 6, strength: 60, totalWeight: 40, ...opts.ref,
    } };
}
function make(units, placements) {
  const b = createBattle({ units, placementsById: structuredClone(placements), scene, random: () => 0.5 });
  b.start(); return b;
}
function casesFor(run) {
  return { run() {
    const cases = [];
    const check = (id, fn) => {
      try { fn(); cases.push({ id, pass: true, detail: '' }); }
      catch (e) { cases.push({ id, pass: false, detail: e.stack || String(e) }); }
    };
    run(check);
    return { cases };
  } };
}
const attack = parseSkill('【直击】[伤害;power:12][必中][范围:单体;射程:12]');
const poison = parseSkill('【持续毒】[中毒;power:8][必中][范围:单体;射程:12]');
const heal = parseSkill('【治疗】[回复:20][范围:单体;射程:12]');
const mixed = { ...heal, name: '攻辅混合', type: '[回复]', type2: '[伤害]', power2: 12, range: attack.range };
const speed = parseSkill('【加速】[增速:20][范围:单体;射程:12]');
const mainAction = { ...attack, name: '基础动作', actionCost: { main: 1, aux: 0 } };
const auxAction = { ...heal, name: '辅助动作', actionCost: { main: 0, aux: 1 } };

export const groups = {
  'ACTION-ECONOMY': casesFor(check => {
    check('直接伤害归主、持续伤害与纯辅助归辅，混合技能按直接伤害归主', () => {
      assert.equal(skillActionKind(attack), 'main');
      assert.equal(skillActionKind(poison), 'aux');
      assert.equal(skillActionKind(heal), 'aux');
      assert.equal(skillActionKind(mixed), 'main');
      const legacyConflict = { ...attack, actionCost: { main: 0, aux: 1 } };
      assert.equal(skillActionKind(legacyConflict), 'main');
      const b = make([unit('h', 'hero', { skills: [legacyConflict] }), unit('e', 'enemy')], { h: at(2), e: at(4) });
      const result = b.attack(legacyConflict, aim(b, 'e'));
      assert.ok(result.ok);
      assert.equal(result.costSummary.main, 1);
      assert.equal(result.costSummary.aux, 0);
    });

    check('物品按即时、延迟释放与所选子用法的实际类别扣费', () => {
      const immediate = { ...heal, name: '即用药', isItem: true, category: '消耗品', count: 2 };
      const delayed = { ...attack, name: '延迟投掷', isItem: true, category: '消耗品', count: 2, delay: 2 };
      const tool = { name: '双用道具', isItem: true, category: '道具', maxUses: 2, usesRemaining: 2, children: [heal, attack] };
      const b = make([unit('h', 'hero', { items: [immediate, delayed, tool] }), unit('e', 'enemy')], { h: at(2), e: at(4) });
      assert.equal(b.canUseItem(tool, heal).auxCost, 1);
      assert.equal(b.canUseItem(tool, attack).mainCost, 1);
      assert.ok(b.useItem(immediate, aim(b, 'h')).ok);
      assert.equal(b.snapshot().resources.aux, 0);
      assert.equal(immediate.count, 1);
      const prep = b.useItem(delayed, aim(b, 'e'));
      assert.ok(prep.ok && prep.preparing);
      assert.deepEqual([prep.costSummary.main, prep.costSummary.aux, delayed.count], [1, 0, 1]);
      assert.equal(b.snapshot().preparation.remaining, 2);
      for (let i = 0; i < 8 && !b.snapshot().preparation?.ready; i++) {
        if (b.endAction().currentId === 'h') assert.ok(b.advancePreparation().ok);
      }
      const ready = b.snapshot();
      assert.equal(ready.preparation?.ready, true);
      assert.ok(b.useItem(delayed, aim(b, 'e')).ok);
      assert.deepEqual([b.snapshot().resources.main, b.snapshot().resources.aux], [ready.resources.main, ready.resources.aux]);
      assert.equal(delayed.count, 1);
    });

    check('主辅点不能互补，指定点先于万能；基础动作可用万能支付', () => {
      const b = make([unit('h', 'hero', { skills: [attack, heal] }), unit('e', 'enemy')], { h: at(2), e: at(4) });
      b.battleState.combatState.clock.currentAction.resources.aux = 0;
      assert.equal(b.canUseSkill(heal).ok, false);
      b.battleState.combatState.clock.currentAction.resources.universal = 1;
      assert.equal(b.canUseSkill(heal).ok, true);
      const paidAux = b.attack(heal, aim(b, 'h'));
      assert.ok(paidAux.ok);
      assert.equal(paidAux.costSummary.universal, 1);
      assert.equal(b.snapshot().resources.universal, 0);
      b.battleState.combatState.clock.currentAction.resources.aux = 1;
      b.battleState.combatState.clock.currentAction.resources.universal = 1;
      const paidMain = b.attack(attack, aim(b, 'e'));
      assert.ok(paidMain.ok);
      assert.equal(paidMain.costSummary.main, 1);
      assert.equal(paidMain.costSummary.universal, 0);

      const basic = make([unit('x', 'hero'), unit('z', 'enemy')], { x: at(2), z: at(4) });
      basic.battleState.combatState.clock.currentAction.resources.main = 0;
      basic.battleState.combatState.clock.currentAction.resources.universal = 1;
      const result = basic.attack(BASIC_ATTACK, aim(basic, 'z'));
      assert.ok(result.ok);
      assert.equal(result.costSummary.universal, 1);
      assert.equal(basic.snapshot().resources.universal, 0);
    });

    check('再动立即增加万能点，不伪造主行动，且万能可支付后续基础攻击', () => {
      const extra = parseSkill('【再动】[再动:1][范围:自身]');
      const b = make([unit('h', 'hero', { skills: [extra] }), unit('e', 'enemy')], { h: at(2), e: at(4) });
      const granted = b.attack(extra);
      assert.ok(granted.ok);
      assert.equal(b.snapshot().resources.universal, 1);
      assert.equal(b.snapshot().resources.main, 1);
      const first = b.attack(BASIC_ATTACK, aim(b, 'e'));
      assert.ok(first.ok);
      assert.equal(first.costSummary.main, 1);
      const second = b.attack(BASIC_ATTACK, aim(b, 'e'));
      assert.ok(second.ok);
      assert.equal(second.costSummary.universal, 1);
      assert.equal(b.snapshot().resources.universal, 0);
    });

    check('辅助蓄力不能以加速替代启动费，准备顺序加速→辅助→万能，释放免费', () => {
      const chargedAux = parseSkill('【辅助蓄力】[回复:5][行动:辅][延迟:3][范围:自身]');
      const noStart = make([unit('h', 'hero', { skills: [chargedAux] }), unit('e', 'enemy')], { h: at(2), e: at(4) });
      noStart.battleState.combatState.clock.currentAction.resources.aux = 0;
      noStart.battleState.combatState.charges ||= {};
      noStart.battleState.combatState.charges.h = { inventory: 3, preparing: null, current: 0 };
      assert.equal(noStart.startPreparation(chargedAux).ok, false);
      assert.equal(noStart.snapshot().preparation, null);

      const b = make([unit('h', 'hero', { skills: [chargedAux] }), unit('e', 'enemy')], { h: at(2), e: at(4) });
      b.battleState.combatState.charges ||= {};
      b.battleState.combatState.charges.h = { inventory: 1, preparing: null, current: 0 };
      const started = b.startPreparation(chargedAux);
      assert.ok(started.ok && started.preparing);
      assert.equal(started.costSummary.aux, 1);
      assert.equal(started.costSummary.universal, 0);
      assert.equal(b.snapshot().preparation.remaining, 2);
      b.battleState.combatState.clock.currentAction.resources.aux = 1;
      b.battleState.combatState.clock.currentAction.resources.universal = 1;
      const aux = b.snapshot().resources.aux;
      const progress = b.advancePreparation();
      assert.ok(progress.ok && progress.ready);
      assert.deepEqual([b.snapshot().preparation.remaining, b.snapshot().resources.aux, b.snapshot().resources.universal], [0, aux - 1, 0]);
      const beforeRelease = b.snapshot().resources;
      const release = b.attack(chargedAux, aim(b, 'h'));
      assert.ok(release.ok);
      assert.equal(release.costSummary.main, 0);
      assert.equal(release.costSummary.aux, 0);
      assert.equal(release.costSummary.universal, 0);
      assert.deepEqual([b.snapshot().resources.main, b.snapshot().resources.aux], [beforeRelease.main, beforeRelease.aux]);
    });

    check('地面起飞恢复实移动额且不借机，重复施加不刷新移动额', () => {
      const flight = parseSkill('【飞行】[赋予:飞行][范围:自身]');
      const b = make([unit('h', 'hero', { skills: [flight] }), unit('e', 'enemy', { spd: 50 })], { h: at(2), e: at(4, 3) });
      assert.ok(b.move(3, 3).ok);
      assert.equal(b.snapshot().resources.moveRemaining, 5);
      assert.deepEqual(b.previewMove(3, 5).opportunityIds, ['e']);
      const takeoff = b.attack(flight);
      assert.ok(takeoff.ok);
      assert.equal(b.snapshot().resources.moveRemaining, 9);
      b.ctx.placementsById.e.col = 10;
      assert.deepEqual(b.previewMove(3, 4).opportunityIds, []);
      assert.ok(b.move(3, 4).ok);
      assert.equal(b.snapshot().resources.moveRemaining, 8);
      b.battleState.combatState.clock.currentAction.resources.aux = 1;
      assert.ok(b.attack(flight).ok);
      assert.equal(b.snapshot().resources.moveRemaining, 8);
    });

    check('敌杂兵有可用援助先施辅助再攻，精英留一个辅点且攻击专用额度不转用途', () => {
      const buff = parseSkill('【援护】[增攻:15][行动:辅][范围:自身]');
      const strike = { ...attack, name: 'AI直击', actionCost: { main: 1, aux: 0 } };
      for (const level of ['杂兵', '精英']) {
        const enemy = unit('e', 'enemy', { level, spd: 200, skills: [buff, strike] });
        const b = make([unit('h', 'hero', { spd: 50 }), enemy], { h: at(4), e: at(3) });
        const initial = b.snapshot();
        assert.equal(initial.currentId, 'e');
        const plan = b.planEnemyAction();
        if (level === '杂兵') assert.equal(plan.skill, buff);
        else {
          assert.equal(initial.resources.skillMain, 1);
          assert.equal(initial.resources.aux, 1);
          assert.equal(plan.skill, buff);
        }
        b.runEnemyTurn();
        const resolved = b.snapshot().events.filter(ev => ev.type === 'segment-resolved' && ev.casterId === 'e')
          .map(ev => ev.skillName || ev.skill?.name);
        const firstAttack = b.snapshot().events.find(ev => ev.type === 'attack-start' && ev.casterId === 'e');
        assert.ok(b.snapshot().events.some(ev => ev.type === 'effect-resolved' && ev.casterId === 'e' && ev.targetId === 'e'));
        assert.ok(resolved.length >= 1);
        assert.ok(firstAttack);
      }
      const elite = unit('elite', 'enemy', { level: '精英', spd: 200, skills: [strike] });
      const h = unit('hero', 'hero', { spd: 50 });
      const e = make([h, elite], { hero: at(4), elite: at(3) });
      const er = e.battleState.combatState.clock.currentAction.resources;
      er.main = 0; er.aux = 0;
      assert.equal(e.snapshot().resources.skillMain, 1);
      assert.equal(e.canUseSkill(BASIC_ATTACK).ok, false);
      assert.equal(e.canUseSkill(strike).ok, true);
      const skillPaid = e.attack(strike, aim(e, 'hero'));
      assert.ok(skillPaid.ok);
      assert.equal(skillPaid.costSummary.main, 1);
      assert.equal(e.snapshot().resources.skillMain, 0);
      assert.equal(e.snapshot().resources.aux, 0);

      const attackOnly = make([unit('boss', 'enemy', { level: '首领', spd: 200, skills: [strike] }), unit('hero', 'hero', { spd: 50 })], { boss: at(3), hero: at(4) });
      const br = attackOnly.battleState.combatState.clock.currentAction.resources;
      br.main = 0; br.aux = 0;
      assert.equal(attackOnly.snapshot().resources.skillMain, 2);
      assert.equal(attackOnly.canUseSkill(BASIC_ATTACK).ok, false);
      assert.equal(attackOnly.canUseSkill(auxAction).ok, false);
      assert.equal(attackOnly.snapshot().resources.aux, 0);
    });
  }),
};
