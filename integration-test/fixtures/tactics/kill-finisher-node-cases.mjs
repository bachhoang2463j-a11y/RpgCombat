// 直接消费真实击杀规划与自爆规则；不模拟 HP、盾或状态写入。
import { createBattle } from '../../../tactics/src/battle.mjs';
import { parseSkill } from '../../../tactics/src/parser.mjs';
import { KILL_TIMING, killTimingFor, planKillBeat, planHitStopWaves } from '../../../tactics/src/cinematic.mjs';

const scene = { sceneId: 'kill-finisher-test', grid: { columns: 20, rows: 12, metersPerCell: 1 }, objects: [] };
function unit(id, side, { hp = 100, shield = 0, attrTags = [] } = {}) {
  return { id, name: id, side, controller: 'player', footprint: { width: 1, height: 1 }, skills: [], attrTags, items: [],
    ref: { hp, maxHp: 100, mp: 100, maxMp: 100, tp: 0, maxTp: 100, atk: 20, def: 0,
      spd: side === 'hero' ? 120 : 90, evasion: 0, strength: 50, totalWeight: 70, perception: 100, moveDistance: 6, shield } };
}
function encounter(form) {
  const hero = unit('hero', 'hero', { shield: 12 });
  const foe = unit('foe', 'enemy', { hp: 20, attrTags: ['[自爆:' + form + ';power:50]'] });
  const b = createBattle({ units: [hero, foe], placementsById: { hero: { col: 2, row: 4 }, foe: { col: 4, row: 4 } }, scene, random: () => 0.5 });
  b.start();
  return { b, hero, foe, aim: { x: 4.5, y: 4.5, targetId: 'foe' } };
}
function drive(gen) { let s = gen.next(); while (!s.done) s = gen.next(null); return s.value; }

export const groups = {
  'KILL-FINISHER-01': { run() {
    const cases = [];
    const check = (id, pass, detail = '') => cases.push({ id, pass: !!pass, detail: JSON.stringify(detail) });
    const caster = unit('c', 'hero'), normal = { ...unit('t', 'enemy'), level: '杂兵' }, elite = { ...unit('u', 'enemy'), level: '精英' };
    const { B, C } = KILL_TIMING;
    const times = t => [t.rush, t.cast, t.pull, t.hit, t.stop, t.tail];
    check('B/C 运镜、时停与尾拍数值和等级', JSON.stringify([times(B), times(C)]) === '[[90,380,340,120,460,820],[72,450,380,170,560,980]]'
      && killTimingFor(normal) === B && killTimingFor(elite) === C && killTimingFor({ level: '首领' }) === C);
    const hit = (hpDmg, shotIndex = 1) => ({ hit: true, outcome: 'hit', shotIndex, maxHp: 100, hpBefore: 100, hpAfter: 100 - hpDmg, hpDmg });
    const r = segments => ({ hits: [{ targetId: 't', segments }] });
    const w = segments => planHitStopWaves(r(segments), [normal], new Set());
    check('49% 加破盾也不算、50% 实扣才停，不能跨段累计', !w([{ ...hit(49), shieldDmg: 60 }, hit(49, 2)]).size && w([hit(50)]).get(1)?.ms === 120);
    const kill = i => ({ ...hit(100, i), down: true });
    const [a, b, c] = [kill(1), kill(1), kill(2)];
    const result = { skill: { range: { type: '圆形' } }, hits: [{ targetId: 't', segments: [a] }, { targetId: 'u', segments: [b, c] }] };
    const plan = planKillBeat(result, caster, [normal, elite]);
    const waves = planHitStopWaves(result, [normal, elite], plan.lethal);
    check('同波 B/C 多杀共用一次 C 时停，但保留每个死亡对象', waves.size === 2 && waves.get(1)?.ms === 560 && waves.get(1)?.anchorId === 'u'
      && waves.get(1)?.lethal.map(x => x.targetId).join(',') === 't,u' && waves.get(2)?.lethal[0]?.segment === c && !plan.focus);
    const before = hit(49, 1), last = kill(2);
    const multi = { skill: { range: { type: '单体' } }, ...r([before, last]) };
    const multiPlan = planKillBeat(multi, caster, [normal]);
    const multiWaves = planHitStopWaves(multi, [normal], multiPlan.lethal);
    check('多发只有致死段触发击杀，不补出手镜头', !multiPlan.focus && multiWaves.size === 1 && multiWaves.get(2)?.lethal[0]?.segment === last);
    const quietElite = { ...result, hits: [result.hits[0], { targetId: 'u', segments: [hit(49)] }] };
    check('同波不满足门槛的精英不能抬高杂兵击杀时停', planHitStopWaves(quietElite, [normal, elite], new Set([a])).get(1)?.ms === 460);

    const attack = parseSkill('【击杀】[伤害;power:200][必中][法术][范围:单体;射程:10]');
    for (const form of ['群伤', '群火', '群毒']) {
      const { b: battle, hero, foe, aim } = encounter(form);
      const start = [hero.ref.hp, hero.ref.shield];
      const result = drive(battle.beginAttack(attack, aim, { deferKillSelfDestruct: true }));
      const pending = result.events?.find(e => e.type === 'self-destruct-pending');
      check(form + '：真击杀已发生，但爆点之前 HP、盾、减益均未写入', result.ok && foe.ref.hp === 0 && pending?.segmentId === result.hits[0]?.segments[0]?.segmentId
        && !result.events?.some(e => e.type === 'self-destruct') && hero.ref.hp === start[0] && hero.ref.shield === start[1] && !battle.buffsOf(hero.id).length, result.reason || pending?.segmentId);
      const boom = pending && battle.resolveSelfDestruct(pending);
      const after = [hero.ref.hp, hero.ref.shield, battle.buffsOf(hero.id).length];
      const changed = form === '群伤' ? after[0] < start[0] && after[1] === 0
        : after[0] === start[0] && after[1] === start[1] && battle.buffsOf(hero.id).some(x => x.type === (form === '群火' ? 'burn' : 'poison'));
      check(form + '：按原规则到爆点结算一次，仍归原攻击', boom?.type === 'self-destruct' && boom.attackId === result.attackId && changed
        && battle.resolveSelfDestruct(pending) === null && after.join(',') === [hero.ref.hp, hero.ref.shield, battle.buffsOf(hero.id).length].join(','), after);
    }
    const sync = encounter('群伤');
    const resolved = sync.b.attack(attack, sync.aim);
    check('离线同步攻击仍在原调用内结算自爆', resolved.events?.some(e => e.type === 'self-destruct') && !resolved.events.some(e => e.type === 'self-destruct-pending') && sync.hero.ref.hp < 100);
    const stale = encounter('群伤');
    const pending = drive(stale.b.beginAttack(attack, stale.aim, { deferKillSelfDestruct: true })).events?.find(e => e.type === 'self-destruct-pending');
    stale.b.reset();
    check('重置丢弃上一代未到爆点的自爆', !!pending && stale.b.resolveSelfDestruct(pending) === null && stale.hero.ref.hp === 100);
    return { cases };
  } },
};
