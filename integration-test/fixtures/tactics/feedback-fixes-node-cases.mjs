// 反馈修复契约回归：真实 createBattle；复用 passive-counter-complete 的小型单位/技能夹具形状。
// 用真实规则/视听代码验证行为；夹具或运行异常始终失败。
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createBattle } from '../../../tactics/src/battle.mjs';

const scene = () => ({ sceneId: 'feedback-fixes', grid: { columns: 24, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects: [] });
function unit(id, side, opts = {}) {
  return { id, name: id, side, controller: 'player', classType: opts.classType || null,
    footprint: { width: 1, height: 1 }, attrTags: [], skills: opts.skills || [], items: [],
    ref: { hp: 5000, maxHp: 5000, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 20, def: 0, spd: id === 'h' ? 300 : 50, evasion: 0, perception: 100,
      strength: 50, totalWeight: 40, shield: 0, moveDistance: 16, ...opts.ref } };
}
function make(units, positions, battleState) {
  const b = createBattle({ units, placementsById: positions, scene: scene(), battleState, random: () => 0.5 });
  b.start();
  return b;
}
function duel(opts = {}) {
  return make([unit('h', 'hero', opts.hero), unit('e', 'enemy', opts.enemy), unit('e2', 'enemy')],
    { h: { col: 2, row: 4 }, e: { col: 4, row: 4 }, e2: { col: 5, row: 5 } });
}
const skill = (extra = {}) => ({ name: '契约试攻', type: '[伤害]', power: 0, hit: 100,
  guaranteedHit: true, damageType: '近战', cost: 0, range: { type: '单体', castRange: 10 },
  actionCost: { main: 0, aux: 0 }, ...extra });
const aim = (b, id = 'e') => ({ x: b.ctx.placementsById[id].col + 0.5, y: b.ctx.placementsById[id].row + 0.5, targetId: id });
const segments = r => (r.hits || []).flatMap(h => h.segments || [h]);
function seedRush(b, id = 'h', count = 1) {
  const buffs = b.battleState.combatState.buffs || (b.battleState.combatState.buffs = {});
  const records = Array.from({ length: count }, (_, i) => ({ type: 'atk', value: 50, duration: 3,
    isConcealAtk: true, _key: 'feedback-rush-' + id + '-' + i }));
  (buffs[id] || (buffs[id] = [])).push(...records);
  return records;
}
const rushes = (b, id = 'h') => b.buffsOf(id).filter(x => x.isConcealAtk);
function attackChecked(b, sk = skill(), id = 'e', options = { policy: 'none' }) {
  const r = b.attack(sk, aim(b, id), options);
  if (!r.ok || !segments(r).length) throw new Error('攻击夹具未结算：' + (r.reason || '无命中记录'));
  return r;
}
function movement(opts = {}) {
  const b = make([unit('h', 'hero', { ref: { perception: 10 } }),
    unit('a', 'hero', { ref: { perception: 10, hp: opts.allyHp ?? 5000 } }),
    unit('e', 'enemy', { ref: { perception: 10 } }), unit('e2', 'enemy', { ref: { perception: 10 } })],
    { h: { col: 1, row: 4 }, a: { col: opts.allyCol ?? 18, row: 5 },
      e: { col: 6, row: 4 }, e2: { col: 12, row: 4 } });
  return b;
}
function moveChecked(b, col, row = 4) {
  const r = b.move(col, row);
  if (!r.ok) throw new Error('移动夹具不可达：' + r.reason);
  return r;
}

export function runCases() {
  const cases = [];
  function check(id, family, run) {
    try {
      const { pass, detail = '' } = run();
      cases.push({ id, family, pass: !!pass, detail });
    } catch (e) { cases.push({ id, pass: false, detail: String(e.stack || e) }); }
  }
  check('FB-C01 成功命中消费全部已有急袭，保留普通攻击buff', 'conceal', () => {
    const b = duel(); seedRush(b, 'h', 2);
    const ordinary = { type: 'atk', value: 7, duration: 3 };
    b.battleState.combatState.buffs.h.push(ordinary);
    const r = attackChecked(b);
    return { pass: segments(r).some(s => s.hit) && !rushes(b).length && b.buffsOf('h').includes(ordinary) };
  });
  check('FB-C02 落空也消费本次急袭，紧接着的攻击不加攻', 'conceal', () => {
    const b = duel({ enemy: { ref: { evasion: 10000 } } }); seedRush(b);
    b.battleState.combatState.clock.currentAction.resources.universal = 1;
    const r = attackChecked(b, skill({ guaranteedHit: false, hit: 0 }));
    return { pass: segments(r).every(s => !s.hit) && !rushes(b).length
      && segments(attackChecked(b, skill(), 'e2'))[0].rawDmg === 20 };
  });
  check('FB-C03 真实反应反击既不消费也不借用急袭', 'conceal', () => {
    const counter = { name: '反制', isReaction: true, reactionTarget: 'all', isOthers: true,
      type: '[反击]', power: 0, range: { type: '单体', castRange: 10 }, damageType: '近战' };
    const b = duel({ enemy: { skills: [counter] } }); const [old] = seedRush(b, 'e');
    const hp = b.ctx.units.find(u => u.id === 'h').ref.hp;
    const r = attackChecked(b, skill(), 'e', { policy: 'auto' });
    return { pass: r.hits[0]?.reaction?.counterDamage?.hpDmg === 20
      && b.ctx.units.find(u => u.id === 'h').ref.hp === hp - 20 && rushes(b, 'e').includes(old) };
  });
  for (const withOld of [false, true]) check('FB-C0' + (withOld ? '5' : '4') + ' 同技能新授急袭保留' + (withOld ? '且消费旧记录' : ''), 'conceal', () => {
    const b = duel({ hero: { classType: '隐匿者' }, enemy: { ref: { hp: 10, maxHp: 10 } } });
    const olds = withOld ? seedRush(b) : [];
    b.ctx.units.find(u => u.id === 'h').ref.baseTauntBonus = -80;
    attackChecked(b, skill({ power: 999 }));
    const left = rushes(b);
    return { pass: left.length === 1 && !olds.includes(left[0]) && left[0].value === 50, detail: '剩余急袭=' + left.length };
  });
  for (const grouped of [false, true]) check(grouped ? 'FB-C07 群体多段各目标各段受益后整次消费' : 'FB-C06 双段均受益后整次消费', 'conceal', () => {
    const extra = { type2: '[伤害]', power2: 0 };
    if (grouped) Object.assign(extra, { type: '[群攻]', type2: '[群攻]', range: { type: '爆炸', castRange: 10, radius: 3 } });
    const base = duel(), b = duel(); seedRush(b);
    const plain = segments(attackChecked(base, skill(extra)));
    const boosted = segments(attackChecked(b, skill(extra)));
    const targets = new Set(boosted.map(s => s.targetId));
    return { pass: plain.length === boosted.length && boosted.length >= (grouped ? 4 : 2)
      && (!grouped || targets.has('e') && targets.has('e2'))
      && boosted.every((s, i) => s.hit && s.rawDmg === plain[i].rawDmg + 50) && !rushes(b).length,
      detail: '基础/加成段数=' + plain.length + '/' + boosted.length + '；剩余急袭=' + rushes(b).length };
  });
  check('FB-C08 真实授予急袭仅增伤下一次命中，之后攻击恢复原值', 'conceal', () => {
    const b = duel({ hero: { classType: '隐匿者' }, enemy: { ref: { hp: 10, maxHp: 10 } } });
    b.ctx.units.find(u => u.id === 'h').ref.baseTauntBonus = -80;
    attackChecked(b, skill({ power: 999 }));
    const first = segments(attackChecked(b, skill(), 'e2'))[0];
    const consumed = rushes(b).length === 0;
    b.battleState.combatState.clock.currentAction.resources.universal += 1;
    const second = segments(attackChecked(b, skill(), 'e2'))[0];
    return { pass: consumed && first.rawDmg === second.rawDmg + 50 && !rushes(b).length };
  });
  check('FB-C09 前段命中后段舍身闪避，仍按实际命中消费急袭', 'conceal', () => {
    const b = duel(); seedRush(b);
    const guardian = b.ctx.units.find(u => u.id === 'e2');
    guardian.skills.push({ name: '代挡', type: '[无]', power: 0, sheshenTarget: 'all', cost: 0, range: { type: '自身' } },
      { name: '代挡回避', type: '[回避]', power: 1000, isReaction: true, reactionTarget: 'all', cost: 0, range: { type: '自身' } });
    const r = attackChecked(b, skill({ type2: '[伤害]', power2: 0 }), 'e', { policy: 'auto', autoAnswer(req) {
      if (req.segmentIndex === 1) return null;
      const choice = req.candidates.find(c => req.responderId === 'e2' ? !c.guardian : c.guardian && c.responderId === 'e2');
      return choice && { responderId: choice.responderId, skill: choice.skill };
    } });
    const all = segments(r);
    return { pass: all.length === 2 && all[0].hit && !all[1].hit && all[1].guardianReaction?.dodged && !rushes(b).length,
      detail: JSON.stringify({ segments: all.map(s => ({ targetId: s.targetId, hit: s.hit, guardian: s.reaction?.guardianId, dodge: s.guardianReaction?.dodged })), rush: rushes(b).length }) };
  });
  check('FB-C10 第一段击杀获得急袭，不给同一次攻击的后续段或目标加攻', 'conceal', () => {
    const b = duel({ hero: { classType: '隐匿者' }, enemy: { ref: { hp: 10, maxHp: 10 } } });
    b.ctx.units.find(u => u.id === 'h').ref.baseTauntBonus = -80;
    const all = segments(attackChecked(b, skill({ type: '[群攻]', type2: '[群攻]', power2: 0,
      range: { type: '爆炸', castRange: 10, radius: 3 } })));
    return { pass: all.some(s => s.targetId === 'e' && s.down) && all.filter(s => s.targetId === 'e2').length === 2
      && all.every(s => s.hit && s.rawDmg === 20) && rushes(b).length === 1
      && segments(attackChecked(b, skill(), 'e2'))[0].rawDmg === 70, detail: all.map(s => [s.targetId, s.rawDmg]).join(';') };
  });
  check('FB-C11 预览、纯辅助与开始蓄力均保留待用急袭', 'conceal', () => {
    const b = duel(); const [old] = seedRush(b);
    const delayed = skill({ delay: 1 });
    const preview = b.previewAttack(delayed, aim(b));
    const support = b.attack(skill({ name: '强化', type: '[增攻]', power: 7, range: { type: '自身' } }), aim(b, 'h'));
    const prepared = b.attack(delayed, aim(b));
    return { pass: preview.ok && support.ok && prepared.ok && prepared.preparing && rushes(b)[0] === old
      && b.getEffectiveUnit('h').atk === 27 };
  });
  check('FB-D01 敌方位置已知，移动越过原感知边界不截停', 'discovery', () => {
    const b = movement();
    const r = moveChecked(b, 11, 3);
    return { pass: b.snapshot('h').units.some(u => u.id === 'e2') && r.cell.col === 11
      && !r.stoppedOnDiscovery && r.discoveredIds.length === 0 };
  });
  check('FB-D03 撤离再接近敌人不截停', 'discovery', () => {
    const b = movement(); moveChecked(b, 5, 3); moveChecked(b, 1);
    const r = moveChecked(b, 5, 3);
    return { pass: !r.stoppedOnDiscovery && r.discoveredIds.length === 0 && r.cell.col === 5 };
  });
  check('FB-D07 旧存档发现字段不影响已知位置和移动', 'discovery', () => {
    const b = movement();
    const saved = structuredClone(b.battleState);
    saved.combatState.discoveredBySide = { hero: ['e'], enemy: [] };
    const rebuilt = make(structuredClone(b.ctx.units), structuredClone(b.ctx.placementsById), saved);
    const r = moveChecked(rebuilt, 11, 3);
    return { pass: rebuilt.snapshot('h').units.some(u => u.id === 'e2') && r.cell.col === 11 && !r.stoppedOnDiscovery };
  });
  return { cases };
}

export const groups = { 'FEEDBACK-FIXES': { run: runCases } };
const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const { cases } = runCases();
  for (const c of cases) console.log((c.pending ? 'PENDING' : c.pass ? 'PASS' : 'FAIL') + ' ' + c.id + (c.detail ? ' | ' + c.detail : ''));
  const failed = cases.filter(c => c.pass === false).length;
  const pending = cases.filter(c => c.pending).length;
  console.log('SUMMARY total=' + cases.length + ' passed=' + cases.filter(c => c.pass === true).length + ' pending=' + pending + ' failed=' + failed);
  process.exitCode = failed ? 1 : 0;
}
