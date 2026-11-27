// ==========================================
// 8 职业被动 + 反击 战斗级补全用例（真实 createBattle / attack / endAction 链路）
// 覆盖：防守者(嘲讽/强力2atk/致命)、狂战士(失血/贯穿真伤/致命)、风行者(闪避/多重/致命)、
//   隐匿者(阈值/再动/急袭/击杀/未受击/暗袭)、施法者(盾/法力回响)、圣职者·支援者(溢出转盾)、
//   灾厄使·施毒者(异常增伤/附毒免疫)、征伐者(速度/暴击/闪避)；
//   反击(解析期限/触发互斥/减伤盾/致死中断/资源冷却次数/不递归)。
// 只用真实战斗接口，不直调被动纯函数；不依赖 UI/网络/打包。
// ==========================================

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { parseYamlText, parseSkill } from '../../../tactics/src/parser.mjs';
import { createScenarioData } from '../../../tactics/src/scenario-data.mjs';
import { dispatchClock } from '../../../tactics/src/clock.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
function mulberry(seed) { let a = seed; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function scene() { return { sceneId: 'passive-counter', grid: { columns: 18, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects: [] }; }

function unit(id, side, cls, opts = {}) {
  const hp = opts.hp ?? 100;
  return {
    id, name: id, side, controller: opts.controller || (side === 'hero' ? 'player' : 'ai'), classType: cls || null,
    footprint: { width: 1, height: 1 }, attrTags: opts.attrTags || [], skills: opts.skills || [], items: [],
    ref: Object.assign({
      hp, maxHp: opts.maxHp ?? hp, mp: opts.mp ?? 100, maxMp: opts.maxMp ?? 100, tp: opts.tp ?? 0, maxTp: 100,
      atk: opts.atk ?? 20, def: opts.def ?? 0, spd: opts.spd ?? 100, evasion: opts.evasion ?? 0,
      perception: 100, strength: 50, totalWeight: 40, shield: opts.shield ?? 0, moveDistance: opts.moveDistance ?? 6,
    }, opts.refExtra || {}),
  };
}
function make(units, positions, random = mulberry(1)) {
  const b = createBattle({ units, placementsById: positions, scene: scene(), random });
  b.start();
  return b;
}
function aimOf(b, id) {
  const u = b.ctx.units.find(x => x.id === id);
  return { ...unitCenter(b.ctx.placementsById[id], u.footprint), targetId: id };
}
function atkSkill(opts = {}) {
  return { name: opts.name || '试攻', type: '[伤害]', power: opts.power ?? 0, hit: opts.hit ?? 100,
    damageType: opts.damageType || '近战', cost: opts.cost ?? 0, range: { type: '单体', castRange: opts.range ?? 10 },
    actionCost: opts.actionCost || { main: 1, aux: 0 }, guaranteedHit: !!opts.guaranteedHit };
}
function segs(result) { return (result.hits || []).flatMap(h => h.segments || [h]); }
function evs(result, type) { return (result.events || []).filter(e => e.type === type); }
function counterBuffs(b, id) { return b.buffsOf(id).filter(x => x.type === 'counter'); }
function stunOf(b, id) { return b.battleState.combatState.clock?.units?.[id]?.stun || null; }

// ================= 防守者 =================
function defenderCases() {
  const out = [];
  {
    const h = unit('h', 'hero', null, { spd: 300, atk: 10 });
    const d = unit('d', 'enemy', '防守者', { spd: 50, atk: 20 });
    const b = make([h, d], { h: { col: 2, row: 3 }, d: { col: 4, row: 3 } });
    out.push(ok('PC-D1 开局天生嘲讽：命中+10、有效嘲讽200、永久反击架势入列',
      b.statsOf(d).taunt === 200 && b.statsOf(d).hit === 10 && d.ref.baseTauntBonus === 100 && counterBuffs(b, d.id).length === 1));
    d.ref.evasion = 10000;
    d.ref.hp = 100; h.ref.hp = 100;
    const powerless = make([unit('h2', 'hero', null, { spd: 300, atk: 10 }),
      unit('d2', 'enemy', '防守者', { spd: 50, atk: 20, evasion: 10000 })],
      { h2: { col: 2, row: 3 }, d2: { col: 4, row: 3 } }, () => 0.05);
    const rp = powerless.attack(atkSkill(), aimOf(powerless, 'd2'));
    const pev = evs(rp, 'reaction-damage');
    out.push(ok('PC-D2 强力反击：闪避成功按概率双倍攻击力反击（且不再触发普通反击）',
      rp.ok && rp.hits[0].hit === false && pev.length === 1 && pev[0].reason === 'power-counter'
      && powerless.ctx.units.find(u => u.id === 'h2').ref.hp === 60,
      JSON.stringify({ hit: rp.hits[0] && rp.hits[0].hit, reactions: pev.map(e => e.reason), hpHp: powerless.ctx.units.find(u => u.id === 'h2').ref.hp })));
    const normal = make([unit('h3', 'hero', null, { spd: 300, atk: 10 }),
      unit('d3', 'enemy', '防守者', { spd: 50, atk: 20, evasion: 10000 })],
      { h3: { col: 2, row: 3 }, d3: { col: 4, row: 3 } }, () => 0.5);
    const rn = normal.attack(atkSkill(), aimOf(normal, 'd3'));
    const nev = evs(rn, 'reaction-damage');
    const nd = normal.ctx.units.find(u => u.id === 'd3');
    out.push(ok('PC-D3 普通反击：未触发强力反击时返还本体攻击，并永久嘲讽+20',
      rn.ok && rn.hits[0].hit === false && nev.length === 1 && nev[0].reason === 'counter'
      && normal.ctx.units.find(u => u.id === 'h3').ref.hp === 80 && nd.ref.baseTauntBonus === 120,
      JSON.stringify({ reactions: nev.map(e => e.reason), taunt: nd.ref.baseTauntBonus })));
    const tauntGain = normal.snapshot().events.filter(e => e.type === 'passive-gain');
    out.push(ok('PC-D3 嘲讽到账事件：防守反击发出一条 taunt+20（前端图标/音效据此播放）',
      tauntGain.length === 1 && tauntGain[0].unitId === 'd3' && tauntGain[0].kind === 'taunt' && tauntGain[0].value === 20, JSON.stringify(tauntGain)));
    const fatal = make([unit('h4', 'hero', null, { spd: 300, atk: 999 }),
      unit('d4', 'enemy', '防守者', { spd: 50, hp: 100 })],
      { h4: { col: 2, row: 3 }, d4: { col: 4, row: 3 } }, () => 0.5);
    const rf = fatal.attack(atkSkill({ guaranteedHit: true, power: 999 }), aimOf(fatal, 'd4'));
    const d4 = fatal.ctx.units.find(u => u.id === 'd4');
    out.push(ok('PC-D4 致命：毅力首次留 1 HP 不倒地且只生效一次',
      rf.ok && d4.ref.hp === 1 && d4.ref.hasTriggeredGrit === true && segs(rf)[0].fatalResult && segs(rf)[0].fatalResult.reason === 'grit',
      JSON.stringify({ hp: d4.ref.hp, grit: d4.ref.hasTriggeredGrit })));
  }
  return out;
}

// ================= 狂战士 =================
function berserkerCases() {
  const out = [];
  {
    const h = unit('z', 'hero', '狂战士', { spd: 300, hp: 50, maxHp: 100, atk: 20 });
    const e = unit('e', 'enemy', null, { spd: 50, hp: 500, def: 0 });
    const b = make([h, e], { z: { col: 2, row: 4 }, e: { col: 4, row: 4 } }, () => 0.5);
    out.push(ok('PC-Z1 失血增攻：50/100 血时攻击 20→30（有效属性视图）', b.statsOf(h).atk === 30, 'atk=' + b.statsOf(h).atk));
    h.ref.hp = 20; // <30%：贯穿 + 真伤
    const before = e.ref.hp;
    const r = make([unit('z2', 'hero', '狂战士', { spd: 300, hp: 20, maxHp: 100, atk: 20 }),
      unit('e2', 'enemy', null, { spd: 50, hp: 100, def: 50 })],
      { z2: { col: 2, row: 4 }, e2: { col: 4, row: 4 } }, () => 0.5);
    const rr = r.attack(atkSkill({ guaranteedHit: true }), aimOf(r, 'e2'));
    const sg = segs(rr)[0];
    out.push(ok('PC-Z2 贯穿真伤：低血<30% 无视护甲且附加 floor((maxHp-hp)*0.1) 真伤',
      rr.ok && sg.isPierce === true && sg.hpDmg === sg.rawDmg + 8 && r.ctx.units.find(u => u.id === 'e2').ref.hp < 100,
      JSON.stringify({ isPierce: sg.isPierce, hpDmg: sg.hpDmg, raw: sg.rawDmg })));
    const f = make([unit('z3', 'hero', '狂战士', { spd: 50, hp: 100, maxHp: 100 }),
      unit('e3', 'enemy', null, { spd: 300, hp: 500 })],
      { z3: { col: 2, row: 4 }, e3: { col: 4, row: 4 } }, () => 0.5);
    const z3 = f.ctx.units.find(u => u.id === 'z3');
    const rf = f.attack(atkSkill({ guaranteedHit: true, power: 999 }), aimOf(f, 'z3'));
    out.push(ok('PC-Z3 致命：狂战士同样毅力留 1 HP', rf.ok && z3.ref.hp === 1 && z3.ref.hasTriggeredGrit === true, 'hp=' + z3.ref.hp));
  }
  return out;
}

// ================= 风行者 =================
function windCases() {
  const out = [];
  {
    const h = unit('w', 'hero', '风行者', { spd: 300, tp: 30 });
    const e = unit('e', 'enemy', null, { spd: 50, hp: 500 });
    const b = make([h, e], { w: { col: 2, row: 5 }, e: { col: 4, row: 5 } });
    out.push(ok('PC-W1 闪避：TP 直接并入有效闪避（30）', b.statsOf(h).eva === 30, 'eva=' + b.statsOf(h).eva));
    const mc = make([unit('w2', 'hero', '风行者', { spd: 300, atk: 5 }),
      unit('e2', 'enemy', null, { spd: 50, hp: 500 })],
      { w2: { col: 2, row: 5 }, e2: { col: 4, row: 5 } }, () => 0.01);
    const r = mc.attack(atkSkill({ cost: 50 }), aimOf(mc, 'e2'));
    out.push(ok('PC-W2 多重施法：耗蓝50 掷中概率后获得额外行动（日志可见）',
      r.ok && mc.snapshot().log.some(s => s.includes('多重施法')),
      JSON.stringify(mc.snapshot().log.slice(-3))));
    const fatal = make([unit('wa', 'hero', '风行者', { spd: 100, hp: 50 }),
      unit('ea', 'enemy', null, { spd: 300, atk: 999 })],
      { wa: { col: 4, row: 5 }, ea: { col: 2, row: 5 } }, () => 0.5);
    const wa = fatal.ctx.units.find(u => u.id === 'wa');
    const rf = fatal.attack(atkSkill({ guaranteedHit: true, power: 999 }), aimOf(fatal, 'wa'));
    const sg = segs(rf)[0];
    out.push(ok('PC-W3 致命：风行者首次回避致命（0 伤害，仅一次）',
      rf.ok && wa.ref.hp === 50 && wa.ref.hasTriggeredAvoidFatal === true && sg.fatalResult && sg.fatalResult.reason === 'avoid-fatal',
      JSON.stringify({ hp: wa.ref.hp, fatal: sg.fatalResult })));
  }
  return out;
}

// ================= 隐匿者 =================
function stealthCases() {
  const out = [];
  {
    const h = unit('s', 'hero', '隐匿者', { spd: 300, atk: 5 });
    const e = unit('e', 'enemy', null, { spd: 50, hp: 10 });
    const b = make([h, e], { s: { col: 2, row: 6 }, e: { col: 4, row: 6 } }, () => 0.5);
    const r = b.attack(atkSkill({ guaranteedHit: true, power: 999 }), aimOf(b, 'e'));
    out.push(ok('PC-S1 击杀累积：+30 使隐匿 50→80 并触发再动',
      r.ok && h.ref.baseTauntBonus === -80 && b.snapshot().log.some(s => s.includes('再动')),
      JSON.stringify({ base: h.ref.baseTauntBonus, log: b.snapshot().log.filter(s => s.includes('隐匿') || s.includes('再动')) })));
    const killGain = b.snapshot().events.filter(e => e.type === 'passive-gain');
    out.push(ok('PC-S1 隐匿到账事件：击杀发出 stealth+30 且标记再动',
      killGain.length === 1 && killGain[0].unitId === 's' && killGain[0].kind === 'stealth' && killGain[0].value === 30 && killGain[0].extraTurn === true, JSON.stringify(killGain)));
    const rush = make([unit('s2', 'hero', '隐匿者', { spd: 300, atk: 5 }),
      unit('e2', 'enemy', null, { spd: 50, hp: 10 })],
      { s2: { col: 2, row: 6 }, e2: { col: 4, row: 6 } }, () => 0.5);
    const s2 = rush.ctx.units.find(u => u.id === 's2');
    s2.ref.baseTauntBonus = -80; // 隐匿值 80，击杀后越过 100
    const rr = rush.attack(atkSkill({ guaranteedHit: true, power: 999 }), aimOf(rush, 'e2'));
    const rushBuff = rush.buffsOf('s2').find(x => x.type === 'atk' && x.isConcealAtk);
    out.push(ok('PC-S2 急袭：破 100 → 攻+50 一次性 buff，隐匿回归 50 解锁新循环',
      rr.ok && !!rushBuff && rushBuff.value === 50 && s2.ref.baseTauntBonus === -50 && s2.ref.stealthCycleProcessed === false,
      JSON.stringify({ buff: rushBuff, base: s2.ref.baseTauntBonus })));
    const win = make([unit('s3', 'hero', '隐匿者', { spd: 100 }),
      unit('e3', 'enemy', null, { spd: 100, hp: 500, moveDistance: 0 })],
      { s3: { col: 1, row: 6 }, e3: { col: 17, row: 6 } }, () => 0.5);
    const s3 = win.ctx.units.find(u => u.id === 's3');
    for (let i = 0; i < 10 && win.snapshot().now < 310; i++) win.endAction();
    out.push(ok('PC-S3 未受击窗口：每 100 时间 +10（<310 内累计至少 +30）',
      s3.ref.baseTauntBonus <= -80 && win.snapshot().now >= 100,
      JSON.stringify({ base: s3.ref.baseTauntBonus, now: win.snapshot().now })));
    const winGain = win.snapshot().events.filter(e => e.type === 'passive-gain' && e.unitId === 's3');
    out.push(ok('PC-S3 隐匿到账事件：未受击窗口每次 +10 各发一条（无攻击归属）',
      winGain.length >= 3 && winGain.every(e => e.kind === 'stealth' && e.value === 10 && !e.attackId), JSON.stringify(winGain.map(e => [e.value, e.attackId]))));
    const strike = make([unit('s4', 'hero', '隐匿者', { spd: 300, atk: 5 }),
      unit('e4', 'enemy', null, { spd: 50, hp: 200 })],
      { s4: { col: 2, row: 6 }, e4: { col: 4, row: 6 } }, () => 0.01);
    const rs = strike.attack(atkSkill({ guaranteedHit: true }), aimOf(strike, 'e4'));
    out.push(ok('PC-S4 暗袭：近战命中后按隐匿值/10 概率眩晕（低隐蔽时 5%）',
      rs.ok && !!stunOf(strike, 'e4'), JSON.stringify({ stun: !!stunOf(strike, 'e4'), hit: segs(rs)[0] && segs(rs)[0].hit })));
  }
  return out;
}

// ================= 施法者 =================
function casterCases() {
  const out = [];
  {
    const h = unit('c', 'hero', '施法者', { spd: 300, mp: 100, maxMp: 100 });
    const e = unit('e', 'enemy', null, { spd: 50, hp: 500 });
    const b = make([h, e], { c: { col: 2, row: 7 }, e: { col: 4, row: 7 } }, () => 0.5);
    out.push(ok('PC-C1 半 MP 盾：开局护盾=floor(maxMp*0.5)=50', h.ref.shield === 50, 'shield=' + h.ref.shield));
    const echo = make([unit('c2', 'hero', '施法者', { spd: 300, mp: 100, maxMp: 100 }),
      unit('e2', 'enemy', null, { spd: 50, hp: 500 })],
      { c2: { col: 2, row: 7 }, e2: { col: 4, row: 7 } }, () => 0.01);
    const c2 = echo.ctx.units.find(u => u.id === 'c2');
    const r = echo.attack(atkSkill({ cost: 20 }), aimOf(echo, 'e2'));
    const inv = echo.battleState.combatState.charges?.['c2']?.inventory || 0;
    out.push(ok('PC-C2 法力回响：耗蓝20 触发加速+1、TP+15（另加普攻TP+5）',
      r.ok && inv === 1 && c2.ref.tp === 20 && echo.snapshot().log.some(s => s.includes('法力回响')),
      JSON.stringify({ inventory: inv, tp: c2.ref.tp, cost: r.costSummary && r.costSummary.mp })));
    const hasteGain = echo.snapshot().events.filter(e => e.type === 'passive-gain');
    out.push(ok('PC-C2 加速到账事件：法力回响发出 haste+1、TP+15',
      hasteGain.length === 1 && hasteGain[0].unitId === 'c2' && hasteGain[0].kind === 'haste' && hasteGain[0].value === 1 && hasteGain[0].tp === 15, JSON.stringify(hasteGain)));
  }
  return out;
}

// ================= 圣职者 / 支援者 =================
function clericCases() {
  const out = [];
  for (const cls of ['圣职者', '支援者']) {
    const h = unit('p', 'hero', cls, { spd: 300 });
    const ally = unit('a', 'hero', null, { spd: 50, hp: 90, maxHp: 100 });
    const e = unit('e', 'enemy', null, { spd: 10, hp: 500 });
    const b = make([h, ally, e], { p: { col: 2, row: 8 }, a: { col: 3, row: 8 }, e: { col: 12, row: 8 } }, () => 0.5);
    const heal = parseSkill('【治疗】[单回;power:30][范围:单体;射程:10]');
    const r = b.attack(heal, aimOf(b, 'a'));
    out.push(ok('PC-H ' + cls + ' 溢出转盾：+10 有效治疗、20 溢出转护盾',
      r.ok && ally.ref.hp === 100 && ally.ref.shield === 20 && b.snapshot().log.some(s => s.includes('溢出转盾')),
      JSON.stringify({ hp: ally.ref.hp, shield: ally.ref.shield, hits: r.hits && r.hits.length })));
  }
  return out;
}

// ================= 灾厄使 / 施毒者 =================
function corruptorCases() {
  const out = [];
  {
    const h = unit('k', 'hero', '施毒者', { spd: 300, atk: 20 });
    const e = unit('e', 'enemy', null, { spd: 50, hp: 500 });
    const b = make([h, e], { k: { col: 2, row: 9 }, e: { col: 4, row: 9 } }, () => 0.01);
    b.battleState.combatState.clock.currentAction.resources.universal = 1;
    const sk = atkSkill();
    const r1 = b.attack(sk, aimOf(b, 'e'));
    const poisonAfter1 = b.buffsOf('e').filter(x => x.type === 'poison').length;
    const r2 = b.attack(sk, aimOf(b, 'e'));
    const s1 = segs(r1)[0], s2 = segs(r2)[0];
    out.push(ok('PC-K1 施毒者异常增伤：命中附毒后同回合第二次攻击 raw 提升 15%',
      r1.ok && r2.ok && poisonAfter1 >= 1 && s2.rawDmg === Math.floor(s1.rawDmg * 1.15),
      JSON.stringify({ poison: poisonAfter1, raw1: s1 && s1.rawDmg, raw2: s2 && s2.rawDmg })));
    const imm = make([unit('k2', 'hero', '灾厄使', { spd: 300, atk: 20 }),
      unit('e2', 'enemy', null, { spd: 50, hp: 500, attrTags: ['[耐毒]'] })],
      { k2: { col: 2, row: 9 }, e2: { col: 4, row: 9 } }, () => 0.01);
    const ri = imm.attack(atkSkill({ guaranteedHit: true }), aimOf(imm, 'e2'));
    out.push(ok('PC-K2 附毒免疫：目标带[耐毒]时被动淬毒不落地',
      ri.ok && imm.buffsOf('e2').every(x => x.type !== 'poison'),
      JSON.stringify({ buffs: imm.buffsOf('e2').map(x => x.type) })));
  }
  return out;
}

// ================= 征伐者 =================
function vanguardCases() {
  const out = [];
  {
    const h = unit('v', 'hero', '征伐者', { spd: 100, atk: 20 });
    const e = unit('e', 'enemy', null, { spd: 50, hp: 500 });
    const b = make([h, e], { v: { col: 2, row: 10 }, e: { col: 4, row: 10 } }, () => 0.05);
    out.push(ok('PC-V1 先手增速：开局速度 100→120（1 回合 spd buff）', b.statsOf(h).spd === 120, 'spd=' + b.statsOf(h).spd));
    const r = b.attack(atkSkill({ guaranteedHit: true }), aimOf(b, 'e'));
    out.push(ok('PC-V2 速度暴击：持正向 spd buff 时 +10% 暴击率（掷中即暴击）',
      r.ok && r.crit === true && segs(r)[0].isCrit === true, JSON.stringify({ crit: r.crit, seg: segs(r)[0] && segs(r)[0].isCrit })));
    // 防御侧：征伐者被速度更慢的攻击者攻击时应获得速度差闪避分母加成
    const dodge = make([unit('a', 'hero', null, { spd: 300, atk: 5, evasion: 0 }),
      unit('dv', 'enemy', '征伐者', { spd: 200, evasion: 0 })],
      { a: { col: 2, row: 10 }, dv: { col: 4, row: 10 } }, () => 0.99);
    dodge.ctx.units.find(u => u.id === 'a').ref.spd = 50;
    const rd = dodge.attack(atkSkill({ hit: 50 }), aimOf(dodge, 'dv'));
    out.push(ok('PC-V3 防御闪避：被慢速攻击者攻击时按速度差提升闪避分母（应闪避）',
      rd.ok && rd.hits[0].hit === false,
      JSON.stringify({ hit: rd.hits[0] && rd.hits[0].hit, outcome: rd.hits[0] && rd.hits[0].outcome })));
  }
  return out;
}

// ================= 反击通用 =================
function counterCases() {
  const out = [];
  {
    // 解析期限：自施反击架势 1 回合，超时后 buff 到期移除
    const h = unit('t', 'hero', null, { spd: 100 });
    const e = unit('te', 'enemy', null, { spd: 100, hp: 500, moveDistance: 0 });
    const b = make([h, e], { t: { col: 1, row: 2 }, te: { col: 17, row: 2 } }, () => 0.5);
    const stance = { name: '架势', type: '[反击]', power: 0, slotTurns: 1, turns: 1, range: { type: '自身' }, damageType: '近战', actionCost: { main: 1, aux: 0 } };
    b.attack(stance, aimOf(b, 't'));
    const present = counterBuffs(b, 't').length === 1;
    for (let i = 0; i < 10 && b.snapshot().now < 220; i++) b.endAction();
    out.push(ok('PC-R1 解析期限：反击架势按回合落地，超时后从 buff 列移除',
      present && counterBuffs(b, 't').length === 0 && b.snapshot().now >= 100,
      JSON.stringify({ present, remain: counterBuffs(b, 't').length, now: b.snapshot().now })));
  }
  {
    // 减伤盾：攻击者带护盾，反击先破盾不动 HP
    const b = make([unit('sh', 'hero', null, { spd: 300, atk: 10, shield: 100 }),
      unit('sd', 'enemy', '防守者', { spd: 50, atk: 20, evasion: 10000 })],
      { sh: { col: 2, row: 3 }, sd: { col: 4, row: 3 } }, () => 0.5);
    const sh = b.ctx.units.find(u => u.id === 'sh');
    const r = b.attack(atkSkill(), aimOf(b, 'sd'));
    const ev = evs(r, 'reaction-damage')[0];
    out.push(ok('PC-R2 减伤盾：反击伤害先由护盾吸收，HP 不变',
      r.ok && r.hits[0].hit === false && sh.ref.hp === 100 && sh.ref.shield === 80 && ev && ev.shieldDmg === 20,
      JSON.stringify({ hp: sh.ref.hp, shield: sh.ref.shield, ev })));
  }
  {
    const counter = { name: '紧急闪避', isReaction: true, reactionTarget: 'all', isOthers: true,
      type: '[单避]', power: 10000, range: { type: '自身' }, damageType: '近战' };
    const b = make([unit('rh2', 'hero', null, { spd: 300, atk: 10 }),
      unit('rd2', 'enemy', '防守者', { spd: 50, atk: 20, skills: [counter] })],
      { rh2: { col: 2, row: 3 }, rd2: { col: 4, row: 3 } }, () => 0.99);
    const attacker = b.ctx.units.find(u => u.id === 'rh2');
    const r = b.attack(atkSkill(), aimOf(b, 'rd2'), { policy: 'auto' });
    const events = evs(r, 'reaction-damage');
    out.push(ok('PC-R6 本人反应闪避：成功后一次普通反击并保留伤害快照',
      r.ok && r.hits[0].reaction?.dodged && events.length === 1 && events[0].reason === 'counter'
      && events[0].casterId === 'rd2' && events[0].targetId === 'rh2'
      && events[0].maxHp === 100 && events[0].hpBefore === 100 && events[0].hpAfter === attacker.ref.hp
      && events[0].shieldBefore === 0 && events[0].shieldAfter === 0 && events[0].incomingDmg === events[0].rawDmg,
      JSON.stringify({ reactions: events.map(e => e.reason), event: events[0] })));
  }
  {
    const b = make([unit('ch', 'hero', null, { spd: 300, atk: 10 }),
      unit('gh', 'enemy', '防守者', { spd: 50, atk: 20, evasion: 10000 })],
      { ch: { col: 2, row: 3 }, gh: { col: 4, row: 3 } }, () => 0.5);
    b.battleState.combatState.clock.currentAction.resources.universal = 1;
    const skill = atkSkill();
    const first = b.attack(skill, aimOf(b, 'gh'));
    const second = b.attack(skill, aimOf(b, 'gh'));
    const events = [...evs(first, 'reaction-damage'), ...evs(second, 'reaction-damage')];
    out.push(ok('PC-R7 连续两次闪避：每次各反击一次且两次独立结算',
      first.ok && second.ok && events.length === 2 && events.every(e => e.reason === 'counter')
      && b.ctx.units.find(u => u.id === 'ch').ref.hp === 60,
      JSON.stringify({ reactions: events.map(e => e.reason), attackerHp: b.ctx.units.find(u => u.id === 'ch').ref.hp })));
  }
  {
    // 致死中断：双段技能第一段被反击致死，第二段不再结算
    const two = { name: '双击', type: '[伤害]', type2: '[伤害]', power: 0, power2: 0, hit: 100, damageType: '近战',
      cost: 0, range: { type: '单体', castRange: 10 }, actionCost: { main: 1, aux: 0 } };
    const b = make([unit('lh', 'hero', null, { spd: 300, atk: 10, hp: 10, maxHp: 10 }),
      unit('ld', 'enemy', '防守者', { spd: 50, atk: 50, evasion: 10000 })],
      { lh: { col: 2, row: 3 }, ld: { col: 4, row: 3 } }, () => 0.5);
    const lh = b.ctx.units.find(u => u.id === 'lh');
    const r = b.attack(two, aimOf(b, 'ld'));
    out.push(ok('PC-R3 致死中断：反击令攻击者倒地后，后续段中断不再结算',
      r.ok && lh.ref.hp === 0 && r.hits.length === 1 && evs(r, 'unit-down').some(e => e.unitId === 'lh' && e.cause === 'counter'),
      JSON.stringify({ hp: lh.ref.hp, hits: r.hits.length, downs: evs(r, 'unit-down').map(e => e.cause) })));
  }
  {
    // 不递归：双方都持反击架势，只有防守方反击一次，攻击方不反打
    const b = make([unit('ah', 'hero', '防守者', { spd: 300, atk: 10 }),
      unit('ed', 'enemy', '防守者', { spd: 50, atk: 20, evasion: 10000 })],
      { ah: { col: 2, row: 3 }, ed: { col: 4, row: 3 } }, () => 0.5);
    const ah = b.ctx.units.find(u => u.id === 'ah');
    const ed = b.ctx.units.find(u => u.id === 'ed');
    const r = b.attack(atkSkill(), aimOf(b, 'ed'));
    out.push(ok('PC-R4 不递归：反击不会再次引发对方反击（仅一次结算）',
      r.ok && evs(r, 'reaction-damage').length === 1 && ah.ref.hp === 80 && ed.ref.hp === 100,
      JSON.stringify({ reactions: evs(r, 'reaction-damage').map(e => e.reason), ahHp: ah.ref.hp, edHp: ed.ref.hp })));
  }
  {
    // 资源冷却次数：反应反击扣 MP/HP/TP、计次、入冷却
    const counterSkill = { name: '反制', isReaction: true, reactionTarget: 'all', isOthers: true, cost: 5, hpCost: 2, tpCost: 3,
      maxUses: 2, cooldownTurns: 1, power: 0, type: '[反击]', range: { type: '单体', castRange: 10 }, damageType: '近战' };
    const hero = unit('rh', 'hero', null, { spd: 100, hp: 100, mp: 20, tp: 20, atk: 20, skills: [counterSkill] });
    const enemy = unit('re', 'enemy', null, { spd: 300, hp: 200, atk: 10 });
    const b = make([hero, enemy], { rh: { col: 4, row: 3 }, re: { col: 2, row: 3 } }, () => 0.5);
    const r = b.attack(atkSkill({ guaranteedHit: true }), aimOf(b, 'rh'), { policy: 'auto' });
    const react = r.hits[0] && r.hits[0].reaction;
    const used = react && react.reactionUsed;
    const now = b.snapshot().now;
    out.push(ok('PC-R5 资源冷却次数：反应反击扣费一次、限次-1、进入冷却',
      r.ok && react && react.counterDamage && hero.ref.mp === 15 && hero.ref.hp === 88 && hero.ref.tp === 27
      && used && used.usesLeft === 1 && used.cooldownAt > now && enemy.ref.hp < 200,
      JSON.stringify({ mp: hero.ref.mp, hp: hero.ref.hp, tp: hero.ref.tp, used, enemyHp: enemy.ref.hp })));
  }
  return out;
}

function stormAndReactionCases() {
  const out = [];
  const data = createScenarioData(parseYamlText(fs.readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8')));
  const wind = data.units.find(u => u.name === '索恩');
  const caster = data.units.find(u => u.name.includes('伊塔库亚的眷族'));
  const storm = caster.skills.find(s => s.name === '极地暴风雪');
  const target = structuredClone(wind);
  const enemy = structuredClone(caster);
  target.id = 'wind'; target.controller = 'player'; target.ref.hp = target.ref.maxHp;
  enemy.id = 'storm'; enemy.controller = 'player';
  const b = createBattle({ units: [target, enemy], placementsById: {
    wind: { col: 6, row: 6 }, storm: { col: 8, row: 6, facing: 180 },
  }, scene: scene(), random: () => 0.99 });
  b.start();
  const charges = b.battleState.combatState.charges;
  charges.storm = { inventory: 0, preparing: null, current: 4 };
  dispatchClock(b.battleState, { type: 'grantMainPoint', targetId: 'storm', sourceKey: 'passive-counter-test-charge' });
  b.battleState.combatState.clock.currentAction.resources.main = 1;
  const r = b.attack(storm, { x: 7.5, y: 7.5 }, { policy: 'none' });
  const fatal = (r.hits || []).flatMap(h => h.segments || [h]).find(s => s.targetId === 'wind')?.fatalResult || null;
  const flagsAfterAttack = { grit: target.ref.hasTriggeredGrit, avoidFatal: target.ref.hasTriggeredAvoidFatal };
  const afterAttack = { hp: target.ref.hp, classType: target.classType, fatalResult: fatal, ...flagsAfterAttack };
  const eventStart = b.snapshot().events.length, logStart = b.snapshot().log.length;
  b.endAction();
  const afterEnd = { hp: target.ref.hp, classType: target.classType,
    events: b.snapshot().events.slice(eventStart), log: b.snapshot().log.slice(logStart).slice(-8),
    grit: target.ref.hasTriggeredGrit, avoidFatal: target.ref.hasTriggeredAvoidFatal };
  out.push(ok('PC-R8 真实样本暴风雪扣139：剩1血不触发保命，干净回合末不倒地',
    r.ok && afterAttack.hp === 1 && afterEnd.hp === 1 && afterAttack.classType === '风行者' && !afterAttack.avoidFatal
      && !afterEnd.events.some(e => e.type === 'unit-down'),
    JSON.stringify({ storm: { name: storm.name, charge: storm.charge, damageType: storm.damageType,
      range: storm.range, casterClass: caster.classType }, afterAttack, afterEnd })));
  {
    const windTarget = structuredClone(wind), stormCaster = structuredClone(caster);
    windTarget.id = 'lethal-wind'; windTarget.controller = 'player';
    stormCaster.id = 'lethal-storm'; stormCaster.controller = 'player';
    const lethal = make([windTarget, stormCaster], { 'lethal-wind': { col: 6, row: 6 }, 'lethal-storm': { col: 8, row: 6 } }, () => 0.99);
    lethal.battleState.combatState.charges['lethal-storm'] = { inventory: 0, preparing: null, current: 4 };
    const result = lethal.attack({ ...storm, power: 1000 }, { x: 7.5, y: 7.5 }, { policy: 'none' });
    const segment = segs(result).find(s => s.targetId === windTarget.id);
    lethal.endAction();
    out.push(ok('PC-R10 暴风雪提高至致死威力：风行者完整回避必中爆炸段且保留满血',
      result.ok && segment?.hpDmg === 0 && segment.fatalResult?.reason === 'avoid-fatal'
      && windTarget.ref.hasTriggeredAvoidFatal && windTarget.ref.hp === 140,
      JSON.stringify({ hp: windTarget.ref.hp, fatal: segment?.fatalResult })));
  }
  const types = ['近战', '远程', '法术'];
  for (const type of types) {
    const counter = { name: type + '紧急闪避', isReaction: true, reactionTarget: type, isOthers: true,
      type: '[单避]', power: 10000, range: { type: '自身' }, damageType: type };
    const defender = unit('pc-' + type, 'enemy', '防守者', { spd: 50, atk: 20, skills: [counter] });
    const attacker = unit('at-' + type, 'hero', null, { spd: 300, atk: 10 });
    const battle = make([attacker, defender], { [attacker.id]: { col: 6, row: 3 }, [defender.id]: { col: 8, row: 3 } }, () => 0.99);
    battle.battleState.combatState.clock.currentAction.resources.universal = 1;
    const skill = atkSkill({ damageType: type });
    // 每次明确把概率升至100%以上；强力反击会真实重置嘲讽，不依赖随机消费顺序。
    defender.ref.baseTauntBonus = 600;
    const first = battle.attack(skill, aimOf(battle, defender.id), { policy: 'auto' });
    const firstReset = defender.ref.baseTauntBonus === 100;
    defender.ref.baseTauntBonus = 600;
    const second = battle.attack(skill, aimOf(battle, defender.id), { policy: 'auto' });
    const events = [...evs(first, 'reaction-damage'), ...evs(second, 'reaction-damage')];
    out.push(ok('PC-R9 ' + type + '连续反应闪避：强力反击各结算一次',
      first.ok && second.ok && first.hits[0].reaction?.dodged && second.hits[0].reaction?.dodged
      && events.length === 2 && events.every(e => e.reason === 'power-counter')
      && firstReset && defender.ref.baseTauntBonus === 100
      && battle.ctx.units.find(u => u.id === attacker.id).ref.hp === 20,
      JSON.stringify({ reactions: events.map(e => e.reason), attackerHp: battle.ctx.units.find(u => u.id === attacker.id).ref.hp })));
  }
  return out;
}

function allCases() {
  return [...defenderCases(), ...berserkerCases(), ...windCases(), ...stealthCases(), ...casterCases(),
    ...clericCases(), ...corruptorCases(), ...vanguardCases(), ...counterCases(), ...stormAndReactionCases()];
}

export const groups = { 'PASSIVE-COUNTER-COMPLETE': { run() { return { cases: allCases() }; } } };

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const all = allCases();
  for (const c of all) console.log((c.pass ? 'PASS' : 'FAIL') + ' ' + c.id + (c.detail ? ' | ' + c.detail : ''));
  const fails = all.filter(c => !c.pass).length;
  console.log('SUMMARY ' + (all.length - fails) + '/' + all.length + (fails ? ' (FAILED)' : ' (ALL GREEN)'));
  process.exitCode = fails ? 1 : 0;
}
