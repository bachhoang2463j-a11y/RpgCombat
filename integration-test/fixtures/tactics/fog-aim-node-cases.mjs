// ==========================================
// FOG-AIM：浓雾瞄准与真实战斗/AI 查询回归
// 直接调用 battle / range / ai 规则接口，不在夹具中复制规则。
// groups['FOG-AIM'].run() -> { cases:[{id,pass,detail}] }
// ==========================================

import { BASIC_ATTACK, createBattle } from '../../../tactics/src/battle.mjs';
import { queryAttack } from '../../../tactics/src/range.mjs';
import { chooseEnemyAction } from '../../../tactics/src/ai.mjs';

const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const scene = { sceneId: 'fog-aim', grid: { columns: 24, rows: 12, metersPerCell: 1 }, ground: {}, objects: [], encounter: true };
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 100;
  return { id, name: id, side, controller: opts.controller || 'player', footprint: opts.footprint || { width: 1, height: 1 }, skills: opts.skills || [], ref: {
    hp, maxHp: opts.maxHp ?? hp, mp: opts.mp ?? 20, maxMp: opts.mp ?? 20, tp: 0, maxTp: 100,
    atk: 20, def: 0, spd: opts.spd ?? 100, evasion: 0, strength: 50, totalWeight: 50,
    perception: opts.perception ?? 100, moveDistance: opts.moveDistance ?? 6,
  } };
}
const aim = (b, id) => {
  const p = b.ctx.placementsById[id], fp = b.ctx.footprintsById[id];
  return { x: p.col + fp.width / 2, y: p.row + fp.height / 2, targetId: id };
};
function make(units, placements, regions = []) {
  const b = createBattle({ units, placementsById: placements, scene, random: () => 0.5 });
  b.start();
  b.ctx.regions.push(...regions);
  return b;
}
const fog = (col, row, id = 'fog', casterId = 'fog-owner') => ({
  id, type: 'fog', casterId, sourceKey: id, center: { x: col + 0.5, y: row + 0.5 }, radius: 0.7,
  strength: 40, endAt: null, cells: [{ col, row }],
});
const single = { name: '远程单锁', type: '[伤害]', power: 10, cost: 1, actionCost: { main: 1, aux: 0 }, range: { type: '单体', castRange: 12 } };
const blast = { name: '范围攻击', type: '[伤害]', power: 10, cost: 1, actionCost: { main: 1, aux: 0 },  range: { type: '爆炸', castRange: 12, radius: 2.5 } };

function run() {
  const cases = [];
  // 雾外攻击者不能越过雾锁定雾内单体；拒绝时资源不变。交换阵营重复同一契约。
  for (const [prefix, attackerSide, targetSide] of [['A', 'hero', 'enemy'], ['B', 'enemy', 'hero']]) {
    const attacker = unit(prefix + '-caster', attackerSide, { spd: attackerSide === 'hero' ? 200 : 50, skills: [single] });
    const target = unit(prefix + '-target', targetSide);
    const b = make([attacker, target], { [attacker.id]: { col: 2, row: 4 }, [target.id]: { col: 9, row: 4 } }, [fog(9, 4, prefix + '-enemy-fog', target.id)]);
    const before = { mp: attacker.ref.mp, tp: attacker.ref.tp, hp: attacker.ref.hp };
    const q = queryAttack(b.ctx, attacker.id, single, aim(b, target.id));
    const r = b.attack(single, aim(b, target.id));
    const after = { mp: attacker.ref.mp, tp: attacker.ref.tp, hp: attacker.ref.hp };
    cases.push(ok(`FOG-AIM-${prefix} 雾外远距单锁敌方雾内目标被拒且不扣资源`, !q.ok && /无法瞄准/.test(q.reason || r.reason || '')
      && !r.ok && JSON.stringify(before) === JSON.stringify(after), { q: { ok: q.ok, reason: q.reason }, result: { ok: r.ok, reason: r.reason }, before, after }));
  }
  // 雾外攻击者对己方雾及无雾目标仍可远距瞄准。
  for (const [id, regions, expected] of [
    ['FOG-AIM-03 无雾远距单锁可用', [], true],
    ['FOG-AIM-04 己方雾不阻挡远距单锁', [fog(9, 4, 'ally-fog', 'caster')], true],
  ]) {
    const c = unit('caster', 'hero', { spd: 200 }), e = unit('target', 'enemy');
    const b = make([c, e], { caster: { col: 2, row: 4 }, target: { col: 9, row: 4 } }, regions);
    const q = queryAttack(b.ctx, 'caster', single, aim(b, 'target'));
    cases.push(ok(id, q.ok === expected && q.damageTargetIds.includes('target'), { ok: q.ok, reason: q.reason, damageTargetIds: q.damageTargetIds }));
  }
  // 雾内攻击者对雾外目标仅允许 footprint 边缘八邻；双方角色互换。
  for (const [prefix, attackerSide, targetSide] of [['C', 'hero', 'enemy'], ['D', 'enemy', 'hero']]) {
    const c = unit(prefix + '-caster', attackerSide, { spd: attackerSide === 'hero' ? 200 : 50 });
    const e = unit(prefix + '-target', targetSide);
    const b = make([c, e], { [c.id]: { col: 4, row: 4 }, [e.id]: { col: 5, row: 5 } }, [fog(4, 4, prefix + '-attacker-fog', c.id)]);
    const q = queryAttack(b.ctx, c.id, single, aim(b, e.id));
    cases.push(ok(`FOG-AIM-${prefix} 雾内单位可锁定边缘八邻敌人`, q.ok && q.damageTargetIds.includes(e.id), { ok: q.ok, reason: q.reason, damageTargetIds: q.damageTargetIds }));
  }
  // 敌方雾只限制瞄准点；近点合法施放后仍结算完整爆炸范围。
  {
    const c = unit('hero', 'hero', { spd: 200 }), e = unit('foe', 'enemy');
    const b = make([c, e], { hero: { col: 2, row: 4 }, foe: { col: 5, row: 4 } }, [fog(2, 4, 'foe-fog', 'foe')]);
    const point = { x: 5.5, y: 4.5 };
    const before = b.snapshot().resources;
    const q = b.previewAttack(blast, point);
    const r = b.attack(blast, point);
    cases.push(ok('FOG-AIM-07 敌雾中远瞄模板点被拒且不扣主行动', !q.ok && /无法瞄准/.test(q.reason) && !r.ok
      && b.snapshot().resources.main === before.main && c.ref.mp === 20, { preview: q.reason, attack: r.reason }));
    const legal = b.attack({ ...blast, guaranteedHit: true }, { x: 3.5, y: 4.5 });
    cases.push(ok('FOG-AIM-07b 近点合法施放照常伤害一格外敌人', legal.ok && e.ref.hp < 100, { reason: legal.reason, hp: e.ref.hp }));
  }
  // 近点范围攻击可覆盖一格外雾内敌人；攻击点位于雾外时，范围可覆盖雾中单位。
  {
    const c = unit('hero', 'hero', { spd: 200 }), near = unit('near', 'enemy'), hidden = unit('hidden', 'enemy');
    const b = make([c, near, hidden], { hero: { col: 2, row: 4 }, near: { col: 4, row: 4 }, hidden: { col: 6, row: 4 } }, [fog(6, 4, 'inner-fog', 'hidden')]);
    const q = queryAttack(b.ctx, 'hero', blast, { x: 4.5, y: 4.5 });
    cases.push(ok('FOG-AIM-08 近点爆炸仍命中一格外雾内敌人', q.ok && q.damageTargetIds.includes('hidden'), { ok: q.ok, damageTargetIds: q.damageTargetIds }));
    const out = unit('out', 'enemy'), inFog = unit('inFog', 'enemy');
    const b2 = make([c, out, inFog], { hero: { col: 2, row: 8 }, out: { col: 6, row: 8 }, inFog: { col: 8, row: 8 } }, [fog(8, 8, 'covered-fog', 'inFog')]);
    const q2 = queryAttack(b2.ctx, 'hero', blast, { x: 6.5, y: 8.5 });
    cases.push(ok('FOG-AIM-09 雾外范围爆心可覆盖雾内敌人', q2.ok && q2.damageTargetIds.includes('inFog'), { ok: q2.ok, damageTargetIds: q2.damageTargetIds }));
  }
  // AI 禁止把雾外敌人作为单体远瞄目标；范围技仍应尝试命中雾内目标，不能因雾而放弃走位。
  {
    const h = unit('hero', 'hero'), e = unit('enemy', 'enemy', { spd: 50, controller: 'ai', skills: [single] });
    const b = make([h, e], { hero: { col: 2, row: 4 }, enemy: { col: 10, row: 4 } }, [fog(2, 4, 'hero-fog', 'hero')]);
    const action = chooseEnemyAction(b.ctx, 'enemy', 2, [single]);
    const q = action.skill ? queryAttack({ ...b.ctx, placementsById: { ...b.ctx.placementsById, enemy: action.moveTo || b.ctx.placementsById.enemy } }, 'enemy', action.skill, action.aim) : null;
    cases.push(ok('FOG-AIM-10 AI 不远距单锁雾外敌人并保留合法走位', !action.skill || (q && q.ok && q.damageTargetIds.includes('hero')),
      { action: { moveTo: action.moveTo, skill: action.skill?.name, aim: action.aim, action: action.action }, query: q && { ok: q.ok, reason: q.reason } }));
  }
  {
    const h = unit('hero', 'hero'), e = unit('enemy', 'enemy', { spd: 50, controller: 'ai', skills: [blast] });
    const b = make([h, e], { hero: { col: 7, row: 4 }, enemy: { col: 10, row: 4 } }, [fog(7, 4, 'hero-fog', 'hero')]);
    const action = chooseEnemyAction(b.ctx, 'enemy', 0, [blast]);
    const q = action.skill ? queryAttack(b.ctx, 'enemy', action.skill, action.aim) : null;
    cases.push(ok('FOG-AIM-11 AI 可用范围技能攻击雾内敌人', !!action.skill && action.skill.name === blast.name && q?.ok && q.damageTargetIds.includes('hero'),
      { action: { skill: action.skill?.name, aim: action.aim, moveTo: action.moveTo }, query: q && { ok: q.ok, damageTargetIds: q.damageTargetIds } }));
  }
  {
    const c = unit('hero', 'hero', { spd: 200, footprint: { width: 2, height: 2 } });
    const close = unit('close', 'enemy', { footprint: { width: 2, height: 2 } }), far = unit('far', 'enemy');
    const b = make([c, close, far], { hero: { col: 2, row: 4 }, close: { col: 4, row: 4 }, far: { col: 2, row: 3 } },
      [fog(2, 4, 'foe-fog', 'far'), fog(4, 4, 'target-fog', 'close')]);
    const q = b.previewAttack(single, aim(b, 'close'));
    const basic = b.previewAttack(BASIC_ATTACK, aim(b, 'far'));
    cases.push(ok('FOG-AIM-12 大型单位按占格外沿贴脸，普通攻击也可瞄八邻', q.ok && basic.ok, [q.reason, basic.reason]));
    const other = unit('hero', 'hero', { spd: 200 });
    const c2 = make([other, unit('foe', 'enemy')], { hero: { col: 2, row: 4 }, foe: { col: 4, row: 4 } }, [fog(2, 4, 'foe-fog', 'foe')]);
    const blocked = c2.previewAttack(BASIC_ATTACK, aim(c2, 'foe'));
    const retarget = c2.previewRetarget(blast, { x: 4.5, y: 4.5 });
    cases.push(ok('FOG-AIM-13 普攻及范围转火也拒绝敌雾中一格外瞄准', !blocked.ok && !retarget.ok
      && /无法瞄准/.test(blocked.reason) && /无法瞄准/.test(retarget.reason), [blocked.reason, retarget.reason]));
    const charge = { ...blast, displacements: [{ type: '冲锋', distance: 4 }] };
    const rifle = c2.previewAttack({ ...charge, damageType: '远程' }, { x: 4.5, y: 4.5 });
    const melee = c2.previewAttack({ ...charge, damageType: '近战' }, { x: 4.5, y: 4.5 });
    cases.push(ok('FOG-AIM-14 带射击的冲锋不能远瞄，近战冲锋仍可移动接触', !rifle.ok && /无法瞄准/.test(rifle.reason) && melee.ok,
      [rifle.reason, melee.reason]));
  }
  return { cases };
}

export const groups = { 'FOG-AIM': { run: deps => run(deps) } };

if (typeof process !== 'undefined' && process.argv?.[1]?.replace(/\\/g, '/').endsWith('fog-aim-node-cases.mjs')) {
  const { cases } = run({});
  for (const c of cases) console.log((c.pass ? 'PASS ' : 'FAIL ') + c.id + (c.pass ? '' : ' :: ' + c.detail));
  const failed = cases.filter(c => c.pass !== true).length;
  console.log('[FOG-AIM] cases=' + cases.length + ' passed=' + (cases.length - failed) + ' failed=' + failed);
  if (!cases.length || failed) process.exit(1);
}
