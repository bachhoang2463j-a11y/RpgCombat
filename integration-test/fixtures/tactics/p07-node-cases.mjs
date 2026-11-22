// ==========================================
// P07 技能提交与效果迁移用例（真实 battle/clock/scheduler 规则模块）
// ==========================================

import { emptyBattleState, applyLoad } from '../../../tactics/src/lifecycle.mjs';

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
function rng(values = []) { let i = 0; return () => values[i++] ?? 0; }
function scene() { return { sceneId: 'p07', grid: { columns: 18, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects: [] }; }
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 100, mp = opts.mp ?? 30;
  return { id, name: id, side, footprint: opts.footprint || { width: 1, height: 1 }, skills: opts.skills || [], ref: {
    hp, maxHp: opts.maxHp ?? hp, mp, maxMp: opts.maxMp ?? mp, tp: opts.tp ?? 0, maxTp: opts.maxTp ?? 100,
    atk: opts.atk ?? 10, def: opts.def ?? 0, spd: opts.spd ?? 100, evasion: opts.evasion ?? 0,
    strength: opts.strength ?? 50, moveDistance: opts.moveDistance ?? 4, totalWeight: opts.totalWeight ?? 40,
  } };
}
function makeBattle(m, heroes, enemies, placements, random = () => 0) {
  return m.battle.createBattle({ units: [...heroes, ...enemies], placementsById: placements, scene: scene(), random });
}
function attackAt(b, skill, id, p) { return b.attack(skill, { x: p.col + 0.5, y: p.row + 0.5, targetId: id }); }

async function p07(m) {
  const cases = [];
  const hero = unit('h', 'hero', { mp: 30, skills: [] });
  const enemy = unit('e', 'enemy', { hp: 100, spd: 50 });
  const b = makeBattle(m, [hero], [enemy], { h: { col: 2, row: 4 }, e: { col: 6, row: 4 } }, rng([0, 0]));
  b.start();
  const shot = { name: 'shot', cost: 4, hit: 100, power: 12, type: '[单体]', type2: '[无]', type3: '[无]', range: { type: '单体', castRange: 10 }, actionCost: { main: 1, aux: 0 } };
  const preview = b.previewAttack(shot, { x: 6.5, y: 4.5, targetId: 'e' });
  const before = b.snapshot();
  const canceled = b.snapshot();
  const fired = attackAt(b, shot, 'e', { col: 6, row: 4 });
  cases.push(ok('T07-01 预览不扣费，合法确认一次扣主点与MP',
    preview.ok && canceled.resources.main === before.resources.main && canceled.units.find(u => u.id === 'h').mp === 30 &&
    fired.ok && b.snapshot().resources.main === 0 && hero.ref.mp === 26 && enemy.ref.hp < 100,
    JSON.stringify({ preview: preview.ok, fired: fired.ok, resources: b.snapshot().resources, mp: hero.ref.mp, hp: enemy.ref.hp })));

  const limitHero = unit('lh', 'hero', { mp: 30, spd: 200 });
  const limitEnemy = unit('le', 'enemy', { hp: 100, spd: 50 });
  const limitBattle = makeBattle(m, [limitHero], [limitEnemy], { lh: { col: 2, row: 4 }, le: { col: 6, row: 4 } }, rng([0, 0]));
  limitBattle.start();
  const limited = { ...shot, name: 'limited', cost: 1, maxUses: 1, delay: 100 };
  const first = attackAt(limitBattle, limited, 'le', { col: 6, row: 4 });
  const second = limitBattle.previewAttack(limited, { x: 6.5, y: 4.5, targetId: 'le' });
  cases.push(ok('T07-09 限次与绝对CD由战斗态阻止重复施放', first.ok && !second.ok && /限次|冷却/.test(second.reason || ''), JSON.stringify({ first: first.ok, second: second.reason, battleState: limitBattle.battleState })));
  const poisonHero = unit('ph', 'hero', { mp: 30, spd: 200 });
  const poisonEnemy = unit('pe', 'enemy', { hp: 100, spd: 50 });
  const poisonBattle = makeBattle(m, [poisonHero], [poisonEnemy], { ph: { col: 2, row: 4 }, pe: { col: 6, row: 4 } }, rng([0, 0]));
  poisonBattle.start();
  const poison = { ...shot, name: 'poison', cost: 0, turns: 2, type: '[单体]', type2: '[中毒]', type3: '[无]', power: 0, power2: 4 };
  const hpBeforePoison = poisonEnemy.ref.hp;
  const poisonResult = attackAt(poisonBattle, poison, 'pe', { col: 6, row: 4 });
  const statusRows = Object.values(poisonBattle.battleState.combatState.clock.statuses);
  cases.push(ok('T07-07/09 命中后毒槽登记唯一来源与期限', poisonResult.ok && statusRows.some(s => s.kind === 'poison' && s.endAt != null), JSON.stringify({ ok: poisonResult.ok, statusRows })));
  if (poisonResult.ok) {
    poisonBattle.endAction();
    const next = poisonBattle.snapshot();
    cases.push(ok('T07-07 毒燃等待下一全局周期，不在提交时提前跳伤', poisonEnemy.ref.hp <= hpBeforePoison && next.now > 0, JSON.stringify({ hpBeforePoison, hp: poisonEnemy.ref.hp, now: next.now })));
  }

  const multi = { ...shot, name: 'multi', cost: 0, type: '[单体]', type2: '[无]', type3: '[无]', range: { type: '直线', length: 10, width: 2 }, actionCost: { main: 1, aux: 0 } };
  const downer = unit('caster', 'hero', { hp: 6, atk: 20, spd: 100 });
  const retaliator = unit('r', 'enemy', { hp: 200, spd: 40, skills: [{ name: 'thorns', isReaction: true, reactionTarget: 'all', isOthers: true, cost: 0, type: '[反击]', type2: '[无]', type3: '[无]', range: { type: '单体', castRange: 5 }, actionCost: { main: 0, aux: 0 } }] });
  const rear = unit('rear', 'enemy', { hp: 200, spd: 30 });
  const b2 = makeBattle(m, [downer], [retaliator, rear], {
    caster: { col: 2, row: 4 }, r: { col: 5, row: 4 }, rear: { col: 7, row: 4 },
  }, rng([0, 0, 0, 0]));
  b2.start();
  const grouped = { ...multi, power: 20 };
  const submitted = b2.attack(grouped, { x: 8.5, y: 4.5 });
  cases.push(ok('T07-07 反应导致施术者倒地后仍完成已提交群体名单', submitted.ok && submitted.hits.some(h => h.targetId === 'rear') && b2.battleState.combatState.clock.units.caster.status === 'down', JSON.stringify({ hits: submitted.hits.map(h => h.targetId), caster: b2.battleState.combatState.clock.units.caster } )));

  const chargeHero = unit('ch', 'hero', { mp: 12, spd: 200 });
  const chargeEnemy = unit('ce', 'enemy', { hp: 100, spd: 20 });
  const b3 = makeBattle(m, [chargeHero], [chargeEnemy], { ch: { col: 2, row: 4 }, ce: { col: 7, row: 4 } });
  b3.start();
  const charged = { ...shot, name: 'charge1', cost: 5, charge: 1, delay: 300, maxUses: 1, power: 20 };
  const chargeStart = attackAt(b3, charged, 'ce', { col: 7, row: 4 });
  const afterStart = { mp: chargeHero.ref.mp, uses: b3.battleState.perBattleUses.ch?.charge1 || 0, resources: b3.snapshot().resources };
  const cancelResult = b3.cancelPreparation();
  const canceledPrep = b3.battleState.combatState.charges.ch.preparing;
  cases.push(ok('T07-05 主动取消蓄力不退资源或限次', chargeStart.ok && cancelResult.ok && canceledPrep === null && chargeHero.ref.mp === 7 && b3.battleState.perBattleUses.ch.charge1 === 1,
    JSON.stringify({ cancel: cancelResult, mp: chargeHero.ref.mp, uses: b3.battleState.perBattleUses.ch.charge1 })));

  const chargeHero2 = unit('ch2', 'hero', { mp: 12, spd: 200 });
  const chargeEnemy2 = unit('ce2', 'enemy', { hp: 100, spd: 20 });
  const b3b = makeBattle(m, [chargeHero2], [chargeEnemy2], { ch2: { col: 2, row: 4 }, ce2: { col: 7, row: 4 } });
  b3b.start();
  const repeatStart = attackAt(b3b, charged, 'ce2', { col: 7, row: 4 });
  const startedState = { mp: chargeHero2.ref.mp, uses: b3b.battleState.perBattleUses.ch2?.charge1 || 0 };
  b3b.endAction();
  const afterNextNatural = b3b.snapshot();
  const prep = afterNextNatural.currentId === 'ch2' ? b3b.battleState.combatState.charges.ch2.preparing : null;
  const beforeRelease = { mp: chargeHero2.ref.mp, uses: b3b.battleState.perBattleUses.ch2?.charge1 || 0, resources: afterNextNatural.resources };
  const release = prep?.ready ? attackAt(b3b, charged, 'ce2', { col: 7, row: 4 }) : { ok: false, reason: '准备未完成' };
  cases.push(ok('T07-02/03/04 蓄力开始付费一次，后续自然行动投入准备点，释放不重复扣费',
    repeatStart.ok && startedState.mp === 7 && startedState.uses === 1 && afterNextNatural.currentId === 'ch2' && prep?.ready && beforeRelease.mp === 7 && beforeRelease.uses === 1 && release.ok && !release.preparing && chargeHero2.ref.mp === 7,
    JSON.stringify({ start: repeatStart.ok, startedState, next: afterNextNatural.currentId, prep, beforeRelease, release: release.ok, mp: chargeHero2.ref.mp })));

  const readyStartSkill = { ...shot, name: 'readyCharge', cost: 1, charge: 1, delay: 1 };
  const readyBattle = makeBattle(m, [unit('rh', 'hero', { spd: 200 })], [unit('re', 'enemy', { hp: 100, spd: 20 })], { rh: { col: 2, row: 4 }, re: { col: 7, row: 4 } });
  readyBattle.start();
  const readyStart = attackAt(readyBattle, readyStartSkill, 're', { col: 7, row: 4 });
  readyBattle.endAction();
  const readyAction = readyBattle.snapshot();
  const endedReady = readyAction.currentId === 'rh' && readyAction.preparation?.ready;
  readyBattle.endAction();
  cases.push(ok('T07-05 就绪蓄力结束行动时强制取消且不退款', readyStart.ok && endedReady && readyBattle.battleState.combatState.charges.rh.preparing === null,
    JSON.stringify({ ready: endedReady, prepAfterEnd: readyBattle.battleState.combatState.charges.rh.preparing })));

  const downHero = unit('ah', 'hero', { hp: 2, spd: 2000 });
  const downEnemy = unit('de', 'enemy', { hp: 100, atk: 10, spd: 1000, skills: [{ name: 'counter', isReaction: true, reactionTarget: 'all', isOthers: true, type: '[反击]', type2: '[无]', type3: '[无]', range: { type: '单体', castRange: 5 }, actionCost: { main: 0, aux: 0 } }] });
  const downBattle = makeBattle(m, [downHero], [downEnemy], { ah: { col: 2, row: 4 }, de: { col: 5, row: 4 } }, rng([0, 0]));
  downBattle.start();
  const downCharge = { ...shot, name: 'downCharge', charge: 1, cost: 0, delay: 0 };
  downBattle.attack(downCharge, { x: 5.5, y: 4.5, targetId: 'de' });
  downBattle.endAction();
  downBattle.attack(downCharge, { x: 5.5, y: 4.5, targetId: 'de' });
  cases.push(ok('T07-05 施术者倒地清除蓄力准备态', downBattle.battleState.combatState.clock.units.ah.status === 'down' && downBattle.battleState.combatState.charges.ah.preparing === null,
    JSON.stringify({ status: downBattle.battleState.combatState.clock.units.ah.status, charge: downBattle.battleState.combatState.charges.ah })));

  const directCharge = { ...shot, name: 'directCharge', cost: 0, charge: 1, type: '[单体]', type2: '[无]', type3: '[无]' };
  const reactionSkill = { name: 'reach', isReaction: true, isOthers: true, type: '[回避]', type2: '[无]', type3: '[无]', range: { type: '单体', castRange: 2 }, actionCost: { main: 0, aux: 0 } };
  const reactionFar = makeBattle(m, [unit('rf', 'hero', { spd: 200 })], [unit('sf', 'enemy', { spd: 20 })], { rf: { col: 2, row: 4 }, sf: { col: 7, row: 4 } });
  reactionFar.start();
  const farReaction = reactionFar.canUseReaction(reactionFar.ctx.units[0], reactionSkill, 'sf');
  const wallMap = { ...scene(), objects: [{ id: 'wall', kind: 'wall', bounds: { col: 4, row: 3, width: 1, height: 3 } }] };
  const reactionBlocked = m.battle.createBattle({ units: [unit('rb', 'hero', { spd: 200 }), unit('sb', 'enemy', { spd: 20 })],
    placementsById: { rb: { col: 2, row: 4 }, sb: { col: 5, row: 4 } }, scene: wallMap });
  reactionBlocked.start();
  const blockedReaction = reactionBlocked.canUseReaction(reactionBlocked.ctx.units[0], reactionSkill, 'sb');
  const reactionNear = makeBattle(m, [unit('rn', 'hero', { spd: 200 })], [unit('sn', 'enemy', { spd: 20 })], { rn: { col: 2, row: 4 }, sn: { col: 3, row: 4 } });
  reactionNear.start();
  const nearReaction = reactionNear.canUseReaction(reactionNear.ctx.units[0], reactionSkill, 'sn');
  cases.push(ok('T07-08 反应射程外拒绝、墙后拒绝、有效距离与视线通过', !farReaction.ok && !blockedReaction.ok && nearReaction.ok,
    JSON.stringify({ far: farReaction.reason, blocked: blockedReaction.reason, near: nearReaction.ok })));

  const extraHero = unit('extra', 'hero', { spd: 200, skills: [] });
  const extraMate = unit('mate', 'hero', { spd: 100 });
  const extraEnemy = unit('target', 'enemy', { hp: 100, spd: 20 });
  const extraBattle = makeBattle(m, [extraHero, extraMate], [extraEnemy], {
    extra: { col: 2, row: 4 }, mate: { col: 3, row: 6 }, target: { col: 6, row: 4 },
  }, rng([0, 0]));
  extraBattle.start();
  const extraSkill = { ...shot, name: 'extraPoint', cost: 0, type: '[再动]', type2: '[无]', type3: '[无]', power: 1, power2: 0, range: { type: '单体', castRange: 10 }, actionCost: { main: 1, aux: 0 } };
  const extraCurrent = attackAt(extraBattle, extraSkill, 'extra', { col: 2, row: 4 });
  const afterImmediate = extraBattle.snapshot().resources.main;
  const repeatedCurrent = attackAt(extraBattle, extraSkill, 'extra', { col: 2, row: 4 });
  const afterRepeated = extraBattle.snapshot().resources.main;
  const extraAllySkill = { ...extraSkill, name: 'grantAlly', isOthers: true };
  const extraAlly = extraBattle.attack(extraAllySkill, { x: 3.5, y: 6.5, targetId: 'mate' });
  const pendingAfter = extraBattle.battleState.combatState.clock.pendingMainPoints.slice();
  cases.push(ok('T07-06 当前再动点可继续消费且同源不重发，队友再动转待领取',
    extraCurrent.ok && afterImmediate === 1 && repeatedCurrent.ok && afterRepeated === 0 && !extraAlly.ok && pendingAfter.length === 0,
    JSON.stringify({ current: extraCurrent.ok, afterImmediate, repeated: repeatedCurrent.ok, afterRepeated, ally: extraAlly.reason, pendingAfter })));

  const speedHero = unit('speed-caster', 'hero', { spd: 1000 });
  const speedAlly = unit('speed-ally', 'hero', { spd: 100, evasion: 100 });
  const slowBoss = unit('slow-boss', 'enemy', { hp: 100, spd: 100, evasion: 100 });
  const fastBoss = unit('fast-boss', 'enemy', { hp: 100, spd: 300, evasion: 100 });
  const speedBattle = makeBattle(m, [speedHero, speedAlly], [slowBoss, fastBoss], {
    'speed-caster': { col: 2, row: 4 }, 'speed-ally': { col: 2, row: 7 }, 'slow-boss': { col: 6, row: 4 }, 'fast-boss': { col: 8, row: 4 },
  }, rng([0, 0]));
  speedBattle.start();
  const speedSkill = { ...shot, name: 'speedBuff', cost: 0, isOthers: true, type: '[单速]', type2: '[无]', type3: '[无]', power: 50, range: { type: '单体', castRange: 10 }, turns: 2 };
  const spdBefore = speedAlly.ref.spd;
  const evasionBefore = speedAlly.ref.evasion;
  const speedApplied = speedBattle.attack(speedSkill, { x: 2.5, y: 7.5, targetId: 'speed-ally' });
  const speedAfter = speedAlly.ref.spd;
  const clockSpeedAfter = speedBattle.battleState.combatState.clock.units['speed-ally'].speed;
  const evasionAfter = speedAlly.ref.evasion;

  let rolls100 = 0;
  const dodgeBattle100 = makeBattle(m, [unit('dodge-caster-100', 'hero', { spd: 1000, evasion: 0 })], [
    unit('boss100', 'enemy', { hp: 100, spd: 100, evasion: 100 }),
  ], { 'dodge-caster-100': { col: 2, row: 4 }, boss100: { col: 6, row: 4 } }, () => ([0, 0][rolls100++ % 2]));
  dodgeBattle100.start();
  const fixedSkill = { ...shot, name: 'fixedDodge', cost: 0, power: 10, hit: 100, range: { type: '单体', castRange: 10 } };
  const bossHit100 = attackAt(dodgeBattle100, fixedSkill, 'boss100', { col: 6, row: 4 });
  let rolls300 = 0;
  const dodgeBattle300 = makeBattle(m, [unit('dodge-caster-300', 'hero', { spd: 1000, evasion: 0 })], [
    unit('boss300', 'enemy', { hp: 100, spd: 300, evasion: 100 }),
  ], { 'dodge-caster-300': { col: 2, row: 4 }, boss300: { col: 6, row: 4 } }, () => ([0, 0][rolls300++ % 2]));
  dodgeBattle300.start();
  const bossHit300 = attackAt(dodgeBattle300, fixedSkill, 'boss300', { col: 6, row: 4 });
  cases.push(ok('T07-10 速度状态只改跑圈速度不改闪避，固定命闪不因敏捷不同改变',
    speedApplied.ok && speedAfter === spdBefore + 50 && clockSpeedAfter === speedAfter && evasionAfter === evasionBefore &&
    bossHit100.ok && bossHit300.ok && bossHit100.hits[0].hit === bossHit300.hits[0].hit,
    JSON.stringify({ speedApplied: speedApplied.ok, slots: speedApplied.query?.slotTargets, hits: speedApplied.hits?.map(h => ({ hit: h.hit, targetId: h.targetId })), spdBefore, speedAfter, clockSpeedAfter, evasionBefore, evasionAfter, statuses: speedBattle.battleState.combatState.clock.statuses, hit100: bossHit100.hits?.[0]?.hit, hit300: bossHit300.hits?.[0]?.hit })));

  const reloadState = emptyBattleState('reload-scene', 'same-battle');
  reloadState.perBattleUses = { caster: { limited: 1 } };
  reloadState.cooldowns = { caster: { limited: 500 } };
  const stateSeed = { current: { sceneId: 'reload-scene', battleId: 'same-battle' }, scenes: { 'reload-scene': {} }, battles: { 'reload-scene\u0000same-battle': reloadState } };
  const resumed = applyLoad(stateSeed, { sceneId: 'reload-scene', battleId: 'same-battle' });
  const fresh = applyLoad(stateSeed, { sceneId: 'reload-scene', battleId: 'new-battle' });
  cases.push(ok('T07-09 续载同battle保留限次与冷却，同scene新battle清空',
    resumed.battleState.perBattleUses.caster.limited === 1 && resumed.battleState.cooldowns.caster.limited === 500 &&
    Object.keys(fresh.battleState.perBattleUses).length === 0 && Object.keys(fresh.battleState.cooldowns).length === 0,
    JSON.stringify({ resume: resumed.battleState, fresh: fresh.battleState })));

  const unsupported = { ...shot, name: 'heal', type: '[单回]', type2: '[无]', type3: '[无]' };
  cases.push(ok('P07+ 治疗槽不会静默部分结算', !m.battle.skillSupport(unsupported).ok, JSON.stringify(m.battle.skillSupport(unsupported))));

  return { cases };
}

export const groups = { 'T07-01': { run: deps => p07(deps.modules) } };
