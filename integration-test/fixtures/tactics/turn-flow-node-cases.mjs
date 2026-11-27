// TURN-FLOW：真实战斗的施技中断、行动点到账与移动顺序。
import { parseSkill } from '../../../tactics/src/parser.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';

const unit = (id, side, { hp = 100, spd = 100, skills = [] } = {}) => ({
  id, name: id, side, footprint: { width: 1, height: 1 }, attrTags: [], skills, items: [],
  ref: { hp, maxHp: hp, mp: 100, maxMp: 100, tp: 100, maxTp: 100, atk: 10, def: 5, spd,
    evasion: 0, strength: 50, totalWeight: 70, perception: 1, moveDistance: 6, shield: 0 },
});
const field = (objects = []) => ({ sceneId: 'sc-chapel', grid: { columns: 16, rows: 9, metersPerCell: 1 },
  floor: [{ col: 0, row: 0, width: 16, height: 9 }], objects });
const p = (col, row = 4) => ({ col, row, facing: 0 });
function make(units, placementsById, scene = field()) {
  const b = createBattle({ units, placementsById, scene, random: () => 0.5 });
  b.start();
  return b;
}
function aim(b, id) {
  const at = b.ctx.placementsById[id];
  return { x: at.col + 0.5, y: at.row + 0.5, targetId: id };
}
function drive(gen, answer = () => null) {
  let step = gen.next();
  while (!step.done) step = gen.next(answer(step.value));
  return step.value;
}

function run() {
  const cases = [];
  const check = (id, pass, detail) => cases.push({ id, pass: !!pass, detail });
  const kanpo = parseSkill('【净蚀反冲】[看破:法术][MP:10][限3次][范围:单体;射程:1]');
  const reaction = parseSkill('【格挡】[反应:法术][免伤;power:15][范围:单体;射程:3]');
  const spell = parseSkill('【火球】[伤害;power:50][法术][必中][MP:7][范围:圆形;射程:10;半径:2]');
  for (const interrupt of [true, false]) {
    const victim = unit('victim', 'hero', { skills: [reaction] });
    const buddy = unit('buddy', 'hero');
    const watcher = unit('watcher', 'hero', { skills: [kanpo] });
    const caster = unit('caster', 'enemy', { spd: 200 });
    const scene = field([{ id: 'wall', kind: 'wall', bounds: { col: 8, row: 0, width: 1, height: 9 } }]);
    const b = make([victim, buddy, watcher, caster], { victim: p(4), buddy: p(4, 5), watcher: p(15), caster: p(2) }, scene);
    const requests = [];
    const result = drive(b.beginAttack(spell, aim(b, 'victim')), req => {
      requests.push(req.type);
      if (req.type === 'kanpo' && interrupt) return { responderId: 'watcher', skill: kanpo };
      return null;
    });
    check(interrupt ? '远处隔墙队友一次看破整次群攻' : '跳过看破才开始逐目标反应与伤害', interrupt
      ? requests.join() === 'kanpo' && result.kanpo?.responderId === 'watcher' && result.canceled && result.hits.length === 0 && watcher.ref.mp === 90 && caster.ref.mp === 93
      : requests.join() === 'kanpo,reaction' && !result.canceled && victim.ref.hp < 100 && buddy.ref.hp < 100 && watcher.ref.mp === 100,
    { requests, reason: result.reason, hp: [victim.ref.hp, buddy.ref.hp] });
  }

  {
    const h = unit('h', 'hero', { spd: 200 }), e = unit('e', 'enemy');
    const b = make([h, e], { h: p(2), e: p(5) });
    const aux = parseSkill('【辅技】[伤害;power:10][行动:辅][范围:单体;射程:8]');
    const first = b.attack(aux, aim(b, 'e'));
    const second = b.attack(aux, aim(b, 'e'));
    const third = b.attack(aux, aim(b, 'e'));
    check('辅助优先扣辅，耗尽后扣一主', first.ok && first.costSummary.aux === 1 && first.costSummary.main === 0
      && second.ok && second.costSummary.aux === 0 && second.costSummary.main === 1 && !third.ok,
    [first.costSummary, second.costSummary, third.reason]);
  }

  for (const obstructed of [false, true]) {
    const hero = unit('hero', 'hero', { spd: 10 });
    const elite = { ...unit('elite', 'enemy', { hp: 180, spd: 200 }), level: '精英', footprint: { width: 2, height: 2 } };
    elite.ref.moveDistance = 9;
    const scene = field(obstructed ? [{ id: 'bench', kind: 'pew', bounds: { col: 6, row: 0, width: 1, height: 9 } }] : []);
    const b = make([hero, elite], { hero: p(14), elite: p(2) }, scene);
    const first = b.planEnemyAction();
    if (first.moveTo) b.move(first.moveTo.col, first.moveTo.row);
    const jump1 = b.planEnemyAction().jumpTo;
    if (jump1) b.jump(jump1.col, jump1.row);
    const after = b.snapshot().resources;
    const jump2 = b.planEnemyAction().jumpTo;
    if (jump2) b.jump(jump2.col, jump2.row);
    const final = b.snapshot().resources;
    check(obstructed ? '先走到起跳点，保留跳跃跨越障碍' : '空旷路线两跳早于步行',
      (obstructed ? first.moveTo?.col === 4 && !first.jumpTo && jump1?.col === 7 : !!first.jumpTo)
      && after.jumpsRemaining === 1 && after.aux === 0 && after.main === 1 && final.jumpsRemaining === 0 && final.main === 1,
    JSON.stringify({ first, jump1, jump2, after, final }));
  }

  {
    const protector = unit('frank', 'hero', { skills: [parseSkill('【舍身】[舍身:近战][免伤;power:15]')] });
    const victim = unit('victim', 'hero');
    const enemy = unit('enemy', 'enemy', { spd: 200 });
    const b = make([protector, victim, enemy], { frank: p(2), victim: p(6), enemy: p(8) });
    const melee = parseSkill('【斩击】[伤害;power:20][近战][必中][范围:单体;射程:2]');
    const guard = b.previewGuardCandidates('victim', 'enemy', melee).find(c => c.responderId === 'frank')?.guard;
    check('舍身能越过原半程，但不越过完整移动上限', guard?.maxDistance === 6 && guard.distance > 3 && guard.distance <= 6, guard);
  }

  {
    const hero = unit('hero', 'hero', { spd: 10 });
    const elite = { ...unit('elite', 'enemy', { hp: 180, spd: 200 }), level: '精英', footprint: { width: 2, height: 2 } };
    const b = make([hero, elite], { hero: p(14), elite: p(10) }, field([
      { id: 'wall', kind: 'wall', bounds: { col: 12, row: 0, width: 1, height: 9 } },
    ]));
    const plan = b.planEnemyAction();
    check('高墙截断且无有效推进时不向无关空格起跳', !plan.jumpTo && plan.action !== 'sprint', JSON.stringify(plan));
  }

  {
    const h = unit('h', 'hero', { spd: 200 }), e = unit('e', 'enemy');
    const b = make([h, e], { h: p(2), e: p(10) });
    const extra = parseSkill('【再出手】[再动;power:1][范围:自身]');
    const result = b.attack(extra, aim(b, 'h'));
    const grants = b.snapshot().events.filter(ev => ev.type === 'main-point-received');
    check('自然到账与即时再动有各自的到账事件', result.ok && grants.length === 2
      && grants[0].natural && !grants[1].natural && grants.every(ev => ev.unitId === 'h' && ev.amount === 1)
      && grants[0].eventId !== grants[1].eventId && b.snapshot().resources.main === 1, { grants, reason: result.reason });
  }
  return { cases };
}
export const groups = { 'TURN-FLOW': { run } };
