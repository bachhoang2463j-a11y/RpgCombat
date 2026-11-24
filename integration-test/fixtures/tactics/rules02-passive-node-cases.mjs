// ==========================================
// RULES02 职业被动/变种周期补全用例（独立可 node 直跑；也可由 runner 以 groups 消费）
// 断言对象（真实函数）：
//   纯规则层 class-passives.mjs：征伐者 modifyCritRate/modifyDodgeCap/动能冲踏/onBattleInit spd+20、
//     风行者 onSkillExecuted 多重施法（概率原值 min(0.3,cost/100*2)）、隐匿者 computeStealthValue/
//     gainStealth/checkStealthThresholds（80 再动 / 100 急袭回归50）/onKill+30、moltAtkMultiplier、
//     getEffectiveStats 合成蜕皮攻击加成。
//   battle 层 battle.mjs：再生每100回血、敌方充能库存每100+1（cap）、隐匿窗口每100未受击+10、
//     敌方死亡自爆收口、复活 30% 血、蜕皮/连动阈值收口、准备技能释放后 haste 入库存、
//     召唤无 provider / 查无词条提前拒绝不扣费。
// 随机全部用可复现 PRNG；时钟推进用 endAction 循环，不涉 UI/网络/打包。
// ==========================================

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { CLASS_PASSIVES, getEffectiveStats, moltAtkMultiplier } from '../../../tactics/src/class-passives.mjs';
import { dispatchClock } from '../../../tactics/src/clock.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
function mulberry(seed) { let a = seed; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mkUnit(id, side, cls, opts = {}) {
  const hp = opts.hp ?? 100;
  return { id, name: id, side, footprint: { width: 1, height: 1 }, classType: cls || null,
    attrTags: opts.attrTags || [], skills: opts.skills || [],
    ref: Object.assign({ hp, maxHp: opts.maxHp ?? 100, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: opts.atk ?? 20, def: 0, spd: opts.spd ?? 100, evasion: 0, strength: 50, moveDistance: 6, totalWeight: 40 }, opts.refExtra || {}) };
}
function mkScene() { return { sceneId: 'rules02', grid: { columns: 18, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects: [] }; }
function mk(cls, extra = {}) {
  return { id: 'x', name: 'x', side: 'hero', classType: cls, attrTags: [], skills: [],
    ref: Object.assign({ hp: 100, maxHp: 100, mp: 100, maxMp: 100, tp: 0, maxTp: 100, atk: 20, def: 5, spd: 100, evasion: 0 }, extra) };
}

// ---------- 纯规则层 ----------
function pureCases() {
  const out = [];
  const zheng = CLASS_PASSIVES['征伐者'];
  out.push(ok('R02-P1 征伐者 modifyCritRate：正向速度buff→+10%，无→0',
    zheng.modifyCritRate(mk('征伐者'), null, null, null, [{ type: 'spd', value: 30, duration: 2 }]) === 10
    && zheng.modifyCritRate(mk('征伐者'), null, null, null, []) === 0));
  out.push(ok('R02-P2 征伐者 modifyDodgeCap：闪避分母=自身−攻击者速度差（反向/无攻击者为0）',
    zheng.modifyDodgeCap({}, {}, { spd: 120 }, { spd: 100 }) === 20 && zheng.modifyDodgeCap({}, {}, { spd: 90 }, { spd: 100 }) === 0
    && zheng.modifyDodgeCap({}, null, { spd: 120 }, { spd: 100 }) === 0));
  out.push(ok('R02-P3 征伐者 动能冲踏：速度差≥10每10点+5%，<10为0（原版门槛）',
    zheng.modifyDamageMultiplier(mk('征伐者'), {}, [], { spd: 120 }, { spd: 100 }) === 0.1
    && zheng.modifyDamageMultiplier(mk('征伐者'), {}, [], { spd: 109 }, { spd: 100 }) === 0
    && zheng.modifyDamageMultiplier(mk('征伐者'), { isBarrierTarget: true }, [], { spd: 200 }, { spd: 0 }) === 0));
  out.push(ok('R02-P4 征伐者 开场 spd+20（复用[单速]机制 duration1）', (() => {
    const g = zheng.onBattleInit(mk('征伐者'));
    return g.length === 1 && g[0].type === 'spd' && g[0].value === 20 && g[0].duration === 1;
  })()));
  const feng = CLASS_PASSIVES['风行者'];
  out.push(ok('R02-P5 风行者多重施法：cost50→概率min(0.3,1.0)，掷中 grantMainPoint', (() => {
    const io = { random: () => 0.01, nextSeq: () => 1, granted: null, grantMainPoint: (id, key) => { io.granted = key; } };
    const r = feng.onSkillExecuted(mk('风行者'), { cost: 50 }, false, io);
    return !!r && r.multicast === true && String(io.granted).indexOf('风行者-多重施法#') === 0;
  })()));
  out.push(ok('R02-P6 风行者多重施法：概率上限0.3、反应技不触发、零耗不触发', (() => {
    const a = feng.onSkillExecuted(mk('风行者'), { cost: 100 }, false, { random: () => 0.31, nextSeq: () => 1 });
    const c = feng.onSkillExecuted(mk('风行者'), { cost: 50 }, true, { random: () => 0.01, nextSeq: () => 1 });
    const d = feng.onSkillExecuted(mk('风行者'), { cost: 0 }, false, { random: () => 0.01, nextSeq: () => 1 });
    return a === null && c === null && d === null;
  })()));
  const yin = CLASS_PASSIVES['隐匿者'];
  out.push(ok('R02-P7 隐匿者隐匿值=100−有效嘲讽（初始−50→50）', (() => {
    const u = mk('隐匿者', { baseTauntBonus: -50 });
    yin.onBattleInit(u);
    return yin.computeStealthValue(u, []) === 50 && u.ref.stealthCycleProcessed === false;
  })()));
  out.push(ok('R02-P8 隐匿者累积30→80 触发再动（grantMainPoint）并锁循环', (() => {
    const u = mk('隐匿者', { baseTauntBonus: -50 });
    const io = { buffsOf: () => [], nextSeq: () => 1, mains: [], grantMainPoint: (id, key) => io.mains.push(key) };
    const r = yin.gainStealth(u, 30, io);
    return r.stealthVal === 80 && r.extraTurn === true && io.mains.length === 1 && u.ref.stealthCycleProcessed === true;
  })()));
  out.push(ok('R02-P9 隐匿者破百急袭：攻+50一次性buff、隐匿值回归50、解锁新循环', (() => {
    const u = mk('隐匿者', { baseTauntBonus: -80 });
    const io = { buffsOf: () => [], nextSeq: () => 1, buffs: [], grantMainPoint: () => {}, addBuff: (uu, b) => io.buffs.push(b), clearTempNegativeTaunt: () => {} };
    const r = yin.gainStealth(u, 20, io);
    return r.rush === true && u.ref.baseTauntBonus === -50 && u.ref.stealthCycleProcessed === false
      && io.buffs.some(b => b.type === 'atk' && b.value === 50 && b.isConcealAtk);
  })()));
  out.push(ok('R02-P10 隐匿者跌回80以下解锁再动锁', (() => {
    const u = mk('隐匿者', { baseTauntBonus: -60 }); // 隐匿值 60 < 80
    u.ref.stealthCycleProcessed = true;
    const r = yin.checkStealthThresholds(u, { buffsOf: () => [] });
    return r.unlocked === true && u.ref.stealthCycleProcessed === false;
  })()));
  out.push(ok('R02-P11 隐匿者击杀+30累积（baseTauntBonus −50→−80）', (() => {
    const u = mk('隐匿者', { baseTauntBonus: -50 });
    const r = yin.onKill(u, { buffsOf: () => [], nextSeq: () => 1, grantMainPoint: () => {} });
    return r.stealthVal === 80 && u.ref.baseTauntBonus === -80;
  })()));
  const moltEnemy = { id: 'e', name: 'e', side: 'enemy', attrTags: ['[蜕皮]'], ref: { atk: 20, molted: true } };
  out.push(ok('R02-P12 moltAtkMultiplier：敌方觉醒×1.5；我方/未觉醒×1', (() => {
    const heroCopy = Object.assign({}, moltEnemy, { side: 'hero' });
    const unmolted = Object.assign({}, moltEnemy, { ref: { atk: 20 } });
    return moltAtkMultiplier(moltEnemy, []) === 1.5 && moltAtkMultiplier(heroCopy, []) === 1 && moltAtkMultiplier(unmolted, []) === 1;
  })()));
  out.push(ok('R02-P13 getEffectiveStats 合成蜕皮攻击加成（20→30）', getEffectiveStats(moltEnemy, []).atk === 30));
  return out;
}

// ---------- battle 层（时钟驱动，不依赖 attack 目标解析的自爆/毒杀路径） ----------
function runTo(b, targetT, maxSteps = 400) {
  let n = 0;
  while (b.snapshot().now < targetT && n++ < maxSteps && !b.snapshot().terminal) b.endAction();
}
function poison(st, unitId, key, strength, duration) {
  dispatchClock(st, { type: 'applyStatus', unitId, source: { casterId: 'h1', skillId: 'test', effectId: unitId + ':' + key }, kind: 'poison', strength, duration });
}
function battleClockCases() {
  const out = [];
  const units = [
    mkUnit('h1', 'hero', null, { hp: 50, attrTags: ['[再生]'], spd: 120 }),
    mkUnit('h2', 'hero', '隐匿者', { spd: 110 }),
    mkUnit('h3', 'hero', null, { attrTags: ['[复活]'], spd: 100, refExtra: { reviveCount: 1 } }),
    mkUnit('e1', 'enemy', null, { attrTags: ['[自爆:群伤;power:20]'], spd: 90 }),
    mkUnit('e3', 'enemy', null, { attrTags: ['[蜕皮]', '[连动]'], spd: 80, skills: [{ name: '蓄能炮', charge: 5 }] }),
  ];
  const placements = { h1: { col: 2, row: 2 }, h2: { col: 2, row: 3 }, h3: { col: 3, row: 2 }, e1: { col: 4, row: 2 }, e3: { col: 6, row: 3 } };
  const b = createBattle({ units, placementsById: placements, scene: mkScene(), random: mulberry(20261123) });
  b.start();
  const st = b.battleState;
  const u = id => units.find(x => x.id === id);
  poison(st, 'e1', 'a', 999, 300);  // 注入于首个行动冻结点(≈83s) → 首跳 ≈183s 毒杀 e1 → 触发死亡自爆
  poison(st, 'e3', 'a', 55, 100);   // 单跳：跌破50% → 蜕皮（回血30%→75）
  poison(st, 'e3', 'b', 30, 200);   // 两跳：75→45→15（≤30% → 连动），endAt 后不再跳
  runTo(b, 200);
  const bLog = () => JSON.stringify(b.snapshot().log);
  out.push(ok('R02-B1 自爆收口：e1毒杀后仅半径3内我方受伤', (() => {
    return u('e1').ref.hp <= 0 && u('h2').ref.hp < 100 && u('h2').ref.hp > 0 && u('h1').ref.hp < 60 && bLog().indexOf('自爆·群伤') >= 0;
  })()));
  const h1AfterBoom = u('h1').ref.hp;
  out.push(ok('R02-B2 蜕皮：e3 跌破50%觉醒（molted标记+永久攻×1.5）', u('e3').ref.molted === true && b.statsOf(u('e3')).atk === Math.floor(20 * 1.5)));
  out.push(ok('R02-B3 敌方大招充能：自然行动末+1，不再占用加速库存', (st.combatState.charges['e3']?.current || 0) >= 1 && (st.combatState.charges['e3']?.inventory || 0) === 0));
  poison(st, 'h3', 'a', 999, 300);  // h3 致死 → 复活 30%
  runTo(b, 550);
  out.push(ok('R02-B4 复活：致死消耗次数以30%血站起（原版 tryReviveEnemy 口径）',
    (u('h3').ref.reviveCount || 0) === 0 && bLog().indexOf('30% 生命重新站起') >= 0));
  out.push(ok('R02-B5 再生每100：自爆后 HP 随周期回升', u('h1').ref.hp > h1AfterBoom));
  out.push(ok('R02-B6 隐匿窗口：未受击+10累积→80再动→100急袭后回归50',
    u('h2').ref.baseTauntBonus === -50 && b.buffsOf('h2').some(bb => bb.type === 'atk' && bb.value === 50 && bb.isConcealAtk)
    && JSON.stringify(st.combatState.clock.log).indexOf('隐匿者-再动') >= 0));
  out.push(ok('R02-B7 连动：HP≤30%一次性额外行动点（grantMainPoint）',
    u('e3').ref.linked === true && JSON.stringify(st.combatState.clock.log).indexOf('连动:e3') >= 0));
  runTo(b, 700); // spd80 自然行动约每125时间一次：到 t≈625 第5次行动末封顶
  out.push(ok('R02-B8 敌方大招充能：自然行动累积封顶 cap=5（e3 存活不中断）',
    u('e3').ref.hp > 0 && (st.combatState.charges['e3']?.current || 0) === 5));
  return out;
}

// ---------- 准备技能 haste 释放后入账 + 召唤 provider 拒绝 ----------
function prepAndSummonCases() {
  const out = [];
  const chant = { name: '咏唱', cost: 0, hpCost: 0, tpCost: 0, charge: 0, delay: 1, haste: 3, maxUses: 0, cooldownTurns: 0,
    hit: 100, turns: 1, type: '[再动]', power: 1, type2: '[无]', power2: 0, type3: '[无]', power3: 0,
    isReaction: false, damageType: '近战', range: { type: '单体', castRange: 0 }, actionCost: { main: 0, aux: 0 } };
  const units = [mkUnit('hp1', 'hero', null, { spd: 200, skills: [chant] }), mkUnit('ed1', 'enemy', null, { spd: 50, hp: 500 })];
  const b = createBattle({ units, placementsById: { hp1: { col: 3, row: 3 }, ed1: { col: 4, row: 3 } }, scene: mkScene(), random: mulberry(7) });
  b.start();
  const st = b.battleState;
  st.combatState.clock.currentAction.resources.main += 2; // 预备技能开始固定耗1主行动（canUseSkill 口径），补足投点所需
  const aimSelf = { x: 3.5, y: 3.5, targetId: 'hp1' }; // 单体技能需锁定目标（aim.targetId）
  const r1 = b.attack(chant, aimSelf);            // 开始准备（早 return，不入库存）
  const invBegin = st.combatState.charges['hp1']?.inventory || 0;
  const r2 = b.attack(chant, aimSelf);            // 释放（prepareAtActionStart 自动投主行动）→ haste 3 入库存
  const invAfter = st.combatState.charges['hp1']?.inventory || 0;
  out.push(ok('R02-B9 准备带[加速:3]技能：开始不入账，释放后入库存3',
    r1.preparing === true && invBegin === 0 && r2.ok === true && invAfter === 3
    && st.combatState.charges['hp1'].preparing === null,
    'begin=' + invBegin + ' after=' + invAfter + ' r1preparing=' + r1.preparing
    + ' r2ok=' + r2.ok + ' r2reason=' + (r2.reason || '')
    + ' preparingNull=' + (st.combatState.charges['hp1'].preparing === null)
    + (r2.ok ? '' : ' log=' + JSON.stringify(b.snapshot().log.slice(-3)))));
  const summonSkill = { name: '召唤', cost: 0, hpCost: 0, tpCost: 0, charge: 0, delay: 0, haste: 0, maxUses: 0, cooldownTurns: 0,
    hit: 100, turns: 1, type: '[无]', power: 0, type2: '[无]', power2: 0, type3: '[无]', power3: 0,
    isReaction: false, damageType: '近战', range: { type: '单体', castRange: 2 }, actionCost: { main: 1, aux: 0 }, summonTarget: '史莱姆' };
  const rNoProvider = b.canUseSkill(summonSkill);
  out.push(ok('R02-B10 召唤无 provider：canUseSkill 提前拒绝（不扣费）',
    rNoProvider.ok === false && String(rNoProvider.reason).indexOf('召唤词条缺失') >= 0, rNoProvider.reason || ''));
  const b2 = createBattle({ units: [mkUnit('hp2', 'hero', null, { spd: 200, skills: [summonSkill] }), mkUnit('ed2', 'enemy', null, { spd: 50 })],
    placementsById: { hp2: { col: 3, row: 3 }, ed2: { col: 6, row: 3 } }, scene: mkScene(), random: mulberry(7), summonProvider: () => null });
  b2.start();
  const rMissing = b2.canUseSkill(summonSkill);
  out.push(ok('R02-B11 召唤 provider 查无词条：明确拒绝不造标准人形',
    rMissing.ok === false && String(rMissing.reason).indexOf('召唤词条缺失') >= 0, rMissing.reason || ''));
  return out;
}

function allCases() { return [...pureCases(), ...battleClockCases(), ...prepAndSummonCases()]; }

export const groups = { 'RULES02-PASSIVE': { run() { return { cases: allCases() }; } } };

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const all = allCases();
  for (const c of all) console.log((c.pass ? 'PASS' : 'FAIL') + ' ' + c.id + (c.detail ? ' | ' + c.detail : ''));
  const fails = all.filter(c => !c.pass).length;
  console.log('SUMMARY ' + (all.length - fails) + '/' + all.length + (fails ? ' (FAILED)' : ' (ALL GREEN)'));
  process.exitCode = fails ? 1 : 0;
}
