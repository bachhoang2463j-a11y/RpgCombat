// ==========================================
// 战斗控制器（FX02 规则内核）：消费 P03 自然行动，空间查询/扣费/伤害共用一条命令链。
// HP/MP 真值仅在角色 ref；时钟与位置可保存，实时资源和本轮余额不写长期档。
// 规则来源：原版 index.html（命闪/伤害管线/标签处理器/职业被动/变种/物品/召唤），除明确暂缓的
// 舍身与场地结界（肃正）外全部真实结算；接口契约 v3 见会话记录（beginAttack/beginUseItem generator）。
// ==========================================

import { createClock, dispatchClock, advanceToNextAction } from './clock.mjs';
import { emptyBattleState } from './lifecycle.mjs';
import { compileScene } from './scene.mjs';
import { findReachable, findJumpPath, canPlaceAt, traceDisplacement, cellsAdjacent } from './movement.mjs';
import { unitCenter } from './geometry.mjs';
import { queryAttack, resolveDefaultRange } from './range.mjs';
import { resolveHit, calculateDamage, computeSegmentRawDamage, applyCollisionDamage } from './damage.mjs';
import { chooseEnemyAction } from './ai.mjs';
import { skillSlots, sortSlotsForResolve, normalizeEffectTag, effectDefinition } from './effect-definitions.mjs';
import { applyEffectSlot } from './effect-handlers.mjs';
import { CLASS_PASSIVES, getEffectiveStats } from './class-passives.mjs';
import { applyTypeResist, hasVariantTag, isImmuneToStun, lifestealRatio, hasThorns, thornsRawReflect } from './variant-rules.mjs';
import { statusKeyOf, ROUND_TIME } from './scheduler.mjs';

export const BASIC_ATTACK = {
  name: '普通攻击', type: '[伤害]', power: 0, hit: 100, cost: 0,
  range: { type: '单体', castRange: 2 }, actionCost: { main: 1, aux: 0 },
};

function skillKey(skill) { return (skill.parentName ? skill.parentName + '\u0000' : '') + skill.name; }
function usedCount(state, unitId, key) { return state.perBattleUses?.[unitId]?.[key] || 0; }

// 物品 → 技能形态（规范 range/slots/isItem，供 attackPreview / aim 复用；不回写原物品）
export function itemAsSkill(item) {
  if (!item || !item.isItem) return null;
  if (item.range) return item;
  const range = resolveDefaultRange(item);
  return range ? Object.assign({}, item, { range }) : item;
}

// 技能可用性（结构级）：舍身/看破/肃正（场地结界）暂缓；召唤走运行时 provider 校验；
// 槽位效果由规范标签注册表兜底，不再逐标签拒绝。
export function skillSupport(skill) {
  if (!skill || !skill.range || !['单体', '直线', '扇形', '圆形', '全域', '爆炸', '自身'].includes(skill.range.type)) return { ok: false, reason: '缺少显式范围或范围未迁移' };
  if (skill.isReaction) return { ok: false, reason: '反应技能只能被动触发' };
  if (skill.barrierSub) return { ok: false, reason: '场地结界（肃正）暂缓' };
  if (skill.sheshenTarget) return { ok: false, reason: '舍身暂缓' };
  if (skill.kanpoTarget) return { ok: false, reason: '看破只能由反应链触发' };
  if (skill.isGroup) return { ok: false, reason: '组父节点不可直接施放，请选择子技能' };
  return { ok: true, reason: null };
}

// 召唤清单解析：'[召唤:食尸鬼[复活]*2；化尘者]' → [{name, tags, count}]
function parseSummonSpecs(summonTarget) {
  const specs = [];
  for (const seg of String(summonTarget || '').split(/[;；]/)) {
    const s = seg.trim();
    if (!s) continue;
    const m = s.match(/^(.*?)\s*[*×xX]\s*(\d+)\s*$/);
    const rest = (m ? m[1] : s).trim();
    const name = rest.replace(/\[[^\]]*\]/g, '').trim() || rest;
    const tags = (rest.match(/\[[^\]]*\]/g) || []);
    specs.push({ name, tags, count: m ? Math.max(1, parseInt(m[2])) : 1 });
  }
  return specs;
}

export function createBattle({ units, placementsById, scene, battleState, visibleUnitIds = null, random = Math.random, summonProvider = null }) {
  const state = battleState || emptyBattleState(scene.sceneId, 'demo');
  const opening = {
    positions: structuredClone(placementsById),
    resources: units.map(u => ({ id: u.id, hp: u.ref.hp, mp: u.ref.mp, tp: u.ref.tp || 0, shield: u.ref.shield || 0 })),
    items: units.map(u => ({ id: u.id, items: (u.items || []).map(it => ({ name: it.name, count: it.count, usesRemaining: it.usesRemaining })) })),
    flags: units.map(u => ({ id: u.id, grit: !!u.ref.hasTriggeredGrit, avoidFatal: !!u.ref.hasTriggeredAvoidFatal, reviveUsed: !!u.ref.variantReviveUsed })),
  };
  let resources = null;
  let visibleIds = visibleUnitIds ? visibleUnitIds.slice() : null;
  const ctx = {
    compiled: compileScene(scene), units, placementsById,
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])), carriedUnitIds: new Set(),
    get visibleUnitIds() { return visibleIds; },
  };
  let log = [];
  let actionSerial = 0;
  let summonSerial = 0;
  const byId = new Map(units.map(u => [u.id, u]));
  const currentId = () => state.combatState.clock?.currentAction?.unitId || null;
  const actor = () => byId.get(currentId());

  function dispatchBattleClock(command, rulesContext = {}) {
    const result = dispatchClock(state, command, rulesContext);
    if (command.type === 'grantMainPoint' && result.events?.some(ev => ev.immediate) && currentId() === command.targetId) {
      state.combatState.clock.currentAction.resources.main += 1;
    }
    if (command.type === 'exitUnit' && state.combatState.charges?.[command.unitId]) {
      state.combatState.charges[command.unitId].preparing = null;
    }
    return result;
  }
  function addLog(text) { log.push(text); }
  function notifyManaSpent(unit, spent) {
    if (!spent) return;
    const grant = CLASS_PASSIVES[unit.classType]?.onManaSpent?.(unit, spent, random);
    if (!grant) return;
    chargeState(unit.id).inventory += grant.haste || 0;
    unit.ref.tp = Math.min(unit.ref.maxTp || 100, (unit.ref.tp || 0) + (grant.tp || 0));
    addLog(unit.name + ' 法力回响 · 加速+' + (grant.haste || 0) + ' · TP+' + (grant.tp || 0));
  }
  function passiveSeq() {
    const s = state.combatState;
    s._passiveSeq = (s._passiveSeq || 0) + 1;
    return s._passiveSeq;
  }
  // 职业被动 io 注入（纯规则被动不触时钟/DOM；P03 映射：原 splice 插队 → grantMainPoint；buff 走统一 buffs 状态，不直接改 Act）
  function passiveIo(unit) {
    return {
      random, buffsOf, nextSeq: () => passiveSeq(),
      grantMainPoint: (targetId, sourceKey) => dispatchBattleClock({ type: 'grantMainPoint', targetId, sourceKey }),
      addBuff: (u, buff, effectKey) => registerBuff(u, buff, statusSource(u.id, { casterId: u.id, skillId: 'class:' + (u.classType || '') }, effectKey)),
      clearTempNegativeTaunt: u => buffsOf(u.id).filter(b => b.type === 'taunt' && b.value < 0).forEach(b => removeBuffRecord(u.id, b)),
      log: addLog,
    };
  }
  // 敌方变种阈值收口（原版 tryTriggerEnemyMolt L31033 / tryTriggerEnemyLink L31080）：受击/DoT/入场后调用
  function runEnemyThresholdVariants(u) {
    if (!u || u.side !== 'enemy' || u.ref.hp <= 0) return;
    const buffs = buffsOf(u.id);
    if (!u.ref.molted && hasVariantTag(u, '蜕皮', buffs) && u.ref.maxHp > 0 && u.ref.hp / u.ref.maxHp < 0.5) {
      u.ref.molted = true; // 一次性标记；+50% 攻击由 class-passives moltAtkMultiplier 被动读取（不被驱散、跨复活永久）
      const cleared = dispelNegatives(u, Infinity);
      const before = u.ref.hp;
      u.ref.hp = Math.min(u.ref.maxHp, u.ref.hp + Math.max(1, Math.floor(u.ref.maxHp * 0.3)));
      addLog('💥 [' + u.name + '] 触发【绝境爆发】（蜕皮觉醒）！' + (cleared.length ? '强行排除 ' + cleared.length + ' 个负面状态，' : '') + '回复 ' + (u.ref.hp - before) + ' HP，永久攻击+50%');
    }
    if (!u.ref.linked && hasVariantTag(u, '连动', buffs) && u.ref.maxHp > 0 && u.ref.hp / u.ref.maxHp <= 0.3) {
      u.ref.linked = true; // 一次性标记防【再生】回血震荡反复触发（原版 L31079）
      dispatchBattleClock({ type: 'grantMainPoint', targetId: u.id, sourceKey: '连动:' + u.id });
      addLog('⚡ [' + u.name + '] 濒死求生本能激发（绝境抢攻），获得额外主行动点！');
    }
  }
  // 【自爆】敌方死亡自爆（原版 doEnemySelfDestruct L20911 战棋收口）：[自爆:群伤/群火/群毒/群穿;power:N]（缺省 50）
  // 群伤→[群攻]法术群伤；群火/群毒→[群燃烧/群中毒]纯减益（逐目标闪避，未命中连状态也不中）；群穿→[群穿透]无视护甲。
  // 攻击者已死不可被反击/反应拦截；致死目标走毅力/回避致命保命 → handleDown（复活拦截成功则不自爆）。
  function doEnemySelfDestruct(enemy) {
    const tag = (enemy.attrTags || []).find(t => /^\[自爆:/.test(String(t))) || '';
    const m = tag.match(/^\[自爆:([^\];]+?)(?:;power:(\d+))?\]$/);
    if (!m) return;
    const sub = m[1], power = m[2] ? parseInt(m[2]) : 50;
    addLog('☠️ ' + enemy.name + ' 触发【自爆·' + sub + '】！（威力 ' + power + '）');
    const boomSkill = { name: '自爆·' + sub, hit: 100, cost: 0, damageType: '法术', type: sub === '群火' ? '[群燃烧]' : sub === '群毒' ? '[群中毒]' : sub === '群穿' ? '[群穿透]' : '[群攻]' };
    const eStats = statsOf(enemy);
    for (const hero of units.filter(x => x.side !== enemy.side && x.ref.hp > 0)) {
      const tStats = statsOf(hero);
      const roll = resolveHit({ hitBonus: 0 }, { evasion: hero.ref.evasion || 0, evaBonus: tStats.eva }, boomSkill, random);
      if (!roll.hit) { addLog(hero.name + ' 闪避了自爆'); continue; }
      if (sub === '群火' || sub === '群毒') {
        registerDot(hero, sub === '群火' ? 'burn' : 'poison', { strength: power, turns: 3, casterId: enemy.id, skillKey: '自爆', slotTag: '自爆' });
        addLog(hero.name + ' 被【自爆·' + sub + '】' + (sub === '群火' ? '灼烧' : '毒素侵蚀') + '（' + power + '/回合 ×3）');
      } else {
        const raw0 = computeSegmentRawDamage(eStats, enemy.ref.atk, power, 1, 0.8 + random() * 0.4, {}, { caster: enemy, target: hero, skill: boomSkill });
        const raw = applyTypeResist(raw0, '法术', true, hero, buffsOf(hero.id));
        const calc = calculateDamage(raw, { def: tStats.def, shield: hero.ref.shield || 0, hp: hero.ref.hp }, { isPierce: sub === '群穿', defending: isDefending(hero) });
        let hpDmg = calc.hpDmg, shieldDmg = calc.shieldDmg;
        if (hero.ref.hp - hpDmg <= 0) {
          const fatalCtx = { unit: hero, hpDmg, shieldDmg };
          const tp = CLASS_PASSIVES[hero.classType];
          if (tp && tp.onFatalDamage && tp.onFatalDamage(fatalCtx)) {
            hpDmg = fatalCtx.hpDmg; shieldDmg = fatalCtx.shieldDmg;
            addLog(hero.name + ' 触发职业被动【' + (fatalCtx.hpDmg === 0 ? '回避致命' : '毅力留存') + '】躲过了自爆致命伤！');
          }
        }
        if (shieldDmg > 0) hero.ref.shield = Math.max(0, (hero.ref.shield || 0) - shieldDmg);
        const dealt = Math.min(hero.ref.hp, hpDmg);
        hero.ref.hp = Math.max(0, hero.ref.hp - hpDmg);
        addLog('☠️ 自爆命中 ' + hero.name + ' -' + dealt + ' HP' + (shieldDmg ? '（破盾' + shieldDmg + '）' : ''));
        if (hero.ref.hp <= 0) handleDown(hero, 'selfdestruct');
      }
    }
  }

  // ---------- Buff / 状态模型（有效属性视图，不再直改 ref 数值；毒燃/期限走时钟） ----------
  function buffsState() {
    if (!state.combatState.buffs) state.combatState.buffs = {};
    return state.combatState.buffs;
  }
  function buffsOf(unitId) {
    const b = buffsState();
    return b[unitId] || (b[unitId] = []);
  }
  function statsOf(unit) { return getEffectiveStats(unit, buffsOf(unit.id)); }
  function statusSource(unitId, ids, effectId) {
    return { casterId: ids.casterId, skillId: ids.skillId, effectId: unitId + ':' + effectId };
  }
  function nextStackSeq(unitId) {
    const s = state.combatState._stackSeq || (state.combatState._stackSeq = {});
    s[unitId] = (s[unitId] || 0) + 1;
    return s[unitId];
  }
  function removeBuffRecord(unitId, rec) {
    const list = buffsOf(unitId);
    const i = list.indexOf(rec);
    if (i >= 0) list.splice(i, 1);
    if (rec._source) dispatchClock(state, { type: 'removeStatus', unitId, source: rec._source }, { speedOf });
  }
  // 同源刷新（S06）：同名来源更新强度/期限，不叠层；无限期（免伤/反击架势永久）不进时钟。
  function registerBuff(target, buff, source) {
    const list = buffsOf(target.id);
    const key = statusKeyOf(target.id, source);
    const prev = list.find(b => b._key === key);
    const rec = Object.assign({}, buff, { _key: key, _source: source });
    if (prev) Object.assign(prev, rec); else list.push(rec);
    if (Number.isFinite(buff.duration)) {
      dispatchClock(state, { type: 'applyStatus', unitId: target.id, source,
        kind: buff.type, strength: buff.value, duration: buff.duration * ROUND_TIME }, { speedOf });
    }
    return rec;
  }
  function registerDot(target, kind, { strength, turns, casterId, skillKey: sk, slotTag }) {
    // 中毒叠层：每次施放独立层（唯一 effectId）；燃烧同源刷新保节拍（S06 L120）
    const effectId = kind === 'poison' ? slotTag + '#' + nextStackSeq(target.id) : slotTag + ':0';
    const source = statusSource(target.id, { casterId, skillId: sk }, effectId);
    dispatchClock(state, { type: 'applyStatus', unitId: target.id, source, kind, strength, duration: turns * ROUND_TIME });
  }
  function dispelNegatives(target, count) {
    const isNegative = b => (b.type === 'poison' || b.type === 'burn' || b.type === 'paralyze' || b.type === 'stun'
      || (b.type === 'def' && b.value < 0) || (b.type === 'hit' && b.value < 0)
      || (b.type === 'eva' && b.value < 0) || (b.type === 'atk' && b.value < 0) || (b.type === 'spd' && b.value < 0));
    const removed = [];
    buffsOf(target.id).forEach(b => { if (isNegative(b) && removed.length < count) removed.push(b); });
    removed.forEach(b => removeBuffRecord(target.id, b));
    return removed;
  }
  const rt = {
    now: () => state.combatState.clock?.now || 0,
    addLog, random,
    buffsOf, statsOf, statusSource, nextStackSeq,
    registerBuff, registerDot, dispelNegatives,
    dispatchBattleClock,
    dispatchClock: (cmd, rc) => dispatchClock(state, cmd, rc),
    passiveOf: unit => CLASS_PASSIVES[unit.classType] || null,
  };

  function settleClockEvent(ev) {
    if (ev.type === 'dot-tick' && !ev.suppressed) {
      const target = byId.get(ev.unitId);
      if (target && target.ref.hp > 0) {
        const damage = Math.min(target.ref.hp, Math.max(1, Number(ev.strength) || 1));
        target.ref.hp -= damage;
        addLog(target.name + ' · ' + (ev.kind === 'poison' ? '中毒' : '燃烧') + ' -' + damage + ' HP');
        if (target.ref.hp <= 0) handleDown(target, 'dot');
        else runEnemyThresholdVariants(target);
      }
    } else if (ev.type === 'periodic-tick' && ev.kind === 'periodic' && !ev.suppressed) {
      const target = byId.get(ev.unitId);
      if (target && target.ref.hp > 0) {
        if (ev.source && ev.source.skillId === 'charge-cycle') {
          // 敌方充能库存周期：每 100 时间 +1，封顶充能技能需求（原版 executeEnemyTurn 回合末+1 的时钟映射）
          const charge = chargeState(target.id);
          const next = Math.min(ev.strength || 0, charge.inventory + 1);
          if (next > charge.inventory) { charge.inventory = next; addLog('⏳ ' + target.name + ' 充能库存 +1（' + charge.inventory + '/' + (ev.strength || 0) + '）'); }
        } else {
          target.ref.hp = Math.min(target.ref.maxHp, target.ref.hp + (ev.strength || 0));
        }
      }
    } else if (ev.type === 'stealth-window' && !ev.suppressed) {
      // 隐匿窗口：每 100 时间未受击 +10（P03 映射；受击经 markHit 记录，wasHit=true 本窗口不累积）
      const target = byId.get(ev.unitId);
      if (target && target.ref.hp > 0 && !ev.wasHit) {
        const p = CLASS_PASSIVES['隐匿者'];
        const res = p && p.gainStealth ? p.gainStealth(target, 10, passiveIo(target)) : null;
        if (res && res.extraTurn) addLog('⚡ ' + target.name + ' 隐匿值突破 ' + res.stealthVal + '，触发【再动】！');
        if (res && res.rush) addLog('🎯 ' + target.name + ' 隐匿值突破 100，下一次非反应攻击 +50（隐匿值回归 50）');
      }
    } else if (ev.type === 'status-expired' || ev.type === 'defend-expired' || ev.type === 'spd-expired') {
      // 有效属性视图：到期仅移除 buff 记录；spd 到期由时钟钩子重算计距速度
      const key = statusKeyOf(ev.unitId, ev.source);
      const list = buffsOf(ev.unitId);
      const i = list.findIndex(b => b._key === key);
      if (i >= 0) list.splice(i, 1);
    }
  }
  function speedOf(unitId) {
    const u = byId.get(unitId);
    return u ? Math.max(0, getEffectiveStats(u, buffsOf(unitId)).spd) : 0;
  }
  function initClock() {
    const carrying = state.combatState.carrying || (state.combatState.carrying = {});
    for (const [carrierId, targetId] of Object.entries(carrying)) {
      if (byId.has(carrierId) && byId.has(targetId)) ctx.carriedUnitIds.add(targetId);
    }
    createClock(state, units.map(u => ({ id: u.id, side: u.side, name: u.name, baseSpd: u.ref.spd })), { speedOf });
    // 职业开场被动（防守者永久反击+天生嘲讽、施法者半 MP 盾、隐匿者负嘲讽）
    for (const u of units) {
      const passive = CLASS_PASSIVES[u.classType];
      if (passive && passive.onBattleInit) {
        const granted = passive.onBattleInit(u) || [];
        const source = statusSource(u.id, { casterId: u.id, skillId: 'class:' + (u.classType || '') }, 'init');
        granted.forEach(b => registerBuff(u, b, source));
      }
    }
    // 周期收口注册（P03 映射表）：【再生】每100回血10%、敌方充能库存每100+1、隐匿者窗口每100（未受击+10）
    for (const u of units) {
      if (u.ref.hp <= 0) continue;
      const buffs = buffsOf(u.id);
      if (hasVariantTag(u, '再生', buffs)) {
        dispatchBattleClock({ type: 'applyStatus', unitId: u.id, source: statusSource(u.id, { casterId: u.id, skillId: 'variant:再生' }, 'regen'),
          kind: 'periodic', strength: Math.max(1, Math.floor(u.ref.maxHp * 0.1)), interval: ROUND_TIME });
      }
      if (u.side === 'enemy') {
        const cap = Math.max(0, ...(u.skills || []).filter(s => s && s.charge > 0).map(s => s.charge));
        if (cap > 0) dispatchBattleClock({ type: 'applyStatus', unitId: u.id, source: statusSource(u.id, { casterId: u.id, skillId: 'charge-cycle' }, 'cycle'),
          kind: 'periodic', strength: cap, interval: ROUND_TIME });
      }
      if (u.classType === '隐匿者') {
        dispatchBattleClock({ type: 'applyStatus', unitId: u.id, source: statusSource(u.id, { casterId: u.id, skillId: 'stealth-cycle' }, 'window'),
          kind: 'stealth-window', interval: ROUND_TIME });
      }
      runEnemyThresholdVariants(u); // 入场即低血兜底（原版 TURN_START 首回合）：蜕皮/连动
    }
    units.filter(u => u.ref.hp <= 0).forEach(u => dispatchBattleClock({ type: 'exitUnit', unitId: u.id, cause: 'down' }));
  }

  function handleDown(target, cause) {
    // 复活变种（原版复活流程）：致死时消耗次数复活
    if (canReviveLocal(target)) {
      target.ref.reviveCount -= 1;
      target.ref.hp = Math.max(1, Math.floor(target.ref.maxHp * 0.3)); // 原版 tryReviveEnemy L20844：30% 血复活
      target.ref.shield = 0;
      buffsOf(target.id).splice(0).forEach(b => { if (b._source) dispatchClock(state, { type: 'removeStatus', unitId: target.id, source: b._source }); });
      dispatchBattleClock({ type: 'reenterUnit', unitId: target.id });
      addLog(target.name + ' 触发【复活】！以 30% 生命重新站起（剩余 ' + target.ref.reviveCount + ' 次）');
      return false;
    }
    if (state.combatState.charges?.[target.id]) state.combatState.charges[target.id].preparing = null;
    if (state.combatState.carrying) {
      for (const [carrierId, carriedId] of Object.entries(state.combatState.carrying)) {
        if (carriedId === target.id) { delete state.combatState.carrying[carrierId]; ctx.carriedUnitIds.delete(target.id); }
      }
    }
    dispatchBattleClock({ type: 'exitUnit', unitId: target.id, cause: 'down' });
    addLog(target.name + (target.side === 'hero' ? ' 倒地' : ' 死亡'));
    if (target.side === 'enemy') doEnemySelfDestruct(target); // 【自爆】真正死亡收口（复活拦截成功不会走到这里）
    return true;
  }
  function canReviveLocal(unit) {
    return (unit.ref.reviveCount || 0) > 0 && hasVariantTag(unit, '复活', buffsOf(unit.id));
  }

  function checkEnd() {
    const heroesAlive = units.some(u => u.side === 'hero' && u.ref.hp > 0);
    const hasRescueCandidate = units.some(u => u.side === 'hero' && u.ref.hp <= 0 && state.combatState.clock.rescues[u.id]);
    const enemiesAlive = units.some(u => u.side === 'enemy' && u.ref.hp > 0);
    const type = (!heroesAlive && !hasRescueCandidate) ? 'defeat' : !enemiesAlive ? 'victory' : null;
    if (type && !state.combatState.clock.terminal) {
      state.combatState.clock.terminal = { type, at: state.combatState.clock.now };
      addLog(type === 'victory' ? '胜利：敌方已全灭。' : '失败：我方已全部倒地。');
    }
    return state.combatState.clock.terminal;
  }

  function prepareAtActionStart(u) {
    const prep = state.combatState.charges?.[u.id]?.preparing;
    if (!prep || prep.remaining <= 0) return;
    const charge = state.combatState.charges[u.id];
    const inventory = Math.min(charge.inventory, prep.remaining);
    charge.inventory -= inventory;
    prep.remaining -= inventory;
    prep.invested += inventory;
    prep.ready = prep.remaining <= 0;
    const r = state.combatState.clock.currentAction.resources;
    const amount = Math.min(r.main, prep.remaining);
    if (!amount && !inventory) return;
    r.main -= amount;
    prep.remaining -= amount;
    prep.invested += amount;
    prep.ready = prep.remaining <= 0;
    addLog(u.name + ' 准备 ' + prep.skill.name + ' · 剩余 ' + prep.remaining);
  }
  // 麻痹行动僵直：每次自然行动掷骰 5%×层数（≤20%），命中消耗一层并跳过本次行动（原版麻痹语义）
  function tryParalyzeSkip(u) {
    const layers = buffsOf(u.id).filter(b => b.type === 'paralyze');
    if (!layers.length) return false;
    const chance = Math.min(20, layers.length * 5);
    if (random() * 100 >= chance) return false;
    removeBuffRecord(u.id, layers[0]);
    addLog(u.name + ' 麻痹僵直，跳过本次行动（消耗 1 层）');
    return true;
  }
  function advance() {
    resources = null;
    for (;;) {
      if (checkEnd()) return snapshot();
      const next = advanceToNextAction(state, {
        onEvent: settleClockEvent,
        checkBattleEnd: () => checkEnd(),
        speedOf,
      });
      if (next.status === 'action') {
        const u = byId.get(next.unitId);
        resources = state.combatState.clock.currentAction.resources;
        resources.moveRemaining = u.ref.moveDistance * resources.moveQuota;
        resources.moveMultiplier = 1;
        prepareAtActionStart(u);
        actionSerial++;
        addLog('t=' + next.time.toFixed(2) + ' · ' + u.name + ' 行动');
        if (tryParalyzeSkip(u)) {
          dispatchClock(state, { type: 'endAction', unitId: u.id });
          resources = null;
          continue; // 跳过本次行动，重跑一圈
        }
        return snapshot();
      } else if (next.status === 'terminal') { addLog('僵持：无人可继续行动。'); return snapshot(); }
    }
  }

  function start() {
    if (resources) return snapshot();
    initClock();
    if (currentId()) {
      const u = actor();
      const r = state.combatState.clock.currentAction.resources;
      resources = r;
      if (resources.moveRemaining === undefined) resources.moveRemaining = u.ref.moveDistance * r.moveQuota;
      if (resources.moveMultiplier === undefined) resources.moveMultiplier = 1;
      actionSerial++;
      return snapshot();
    }
    return advance();
  }

  function snapshot() {
    const clock = state.combatState.clock;
    return {
      now: clock?.now || 0, currentId: currentId(), actionSerial, resources: resources ? { moveRemaining: resources.moveRemaining, sprintRemaining: resources.sprintRemaining || 0, main: resources.main, aux: resources.aux, moveMultiplier: resources.moveMultiplier || 1 } : null,
      terminal: clock?.terminal ? { ...clock.terminal } : null,
      preparation: clock?.currentAction ? structuredClone(state.combatState.charges?.[clock.currentAction.unitId]?.preparing || null) : null,
      chargeInventory: clock?.currentAction ? (state.combatState.charges?.[clock.currentAction.unitId]?.inventory || 0) : 0,
      units: units.map(u => {
        const st = statsOf(u);
        return { id: u.id, name: u.name, side: u.side, controller: u.controller || (u.side === 'hero' ? 'player' : 'ai'),
          hp: u.ref.hp, mp: u.ref.mp, tp: u.ref.tp || 0, status: u.ref.hp > 0 ? 'active' : u.side === 'hero' ? 'down' : 'dead',
          atk: st.atk, def: st.def, hit: st.hit, eva: st.eva, taunt: st.taunt, spd: st.spd, shield: u.ref.shield || 0,
          buffs: buffsOf(u.id).map(b => ({ type: b.type, value: b.value, variant: b.variant || null, duration: Number.isFinite(b.duration) ? b.duration : null, isConsumable: !!b.isConsumable })) };
      }),
      carrying: structuredClone(state.combatState.carrying || {}), positions: structuredClone(placementsById), log: log.slice(),
    };
  }

  // 有效属性视图（契约 v3）：UI 显示 Buff 后数值读这里，不要直读 ref
  function getEffectiveUnit(unitId) {
    const u = byId.get(unitId);
    if (!u) return null;
    const st = statsOf(u);
    return { id: u.id, name: u.name, side: u.side, controller: u.controller || (u.side === 'hero' ? 'player' : 'ai'),
      classType: u.classType || null, isSummon: !!u.isSummon, summonOwnerId: u.summonOwnerId || null,
      hp: u.ref.hp, maxHp: u.ref.maxHp, mp: u.ref.mp, maxMp: u.ref.maxMp, tp: u.ref.tp || 0, maxTp: u.ref.maxTp || 0,
      shield: u.ref.shield || 0, atk: st.atk, def: st.def, hit: st.hit, eva: st.eva, taunt: st.taunt, spd: st.spd,
      evasion: u.ref.evasion || 0, buffs: buffsOf(u.id).map(b => ({ type: b.type, value: b.value, variant: b.variant || null, duration: Number.isFinite(b.duration) ? b.duration : null, isConsumable: !!b.isConsumable })) };
  }

  function reachable() {
    const resourcesNow = state.combatState.clock?.currentAction?.resources;
    if (resourcesNow && resourcesNow.moveMultiplier === undefined) resourcesNow.moveMultiplier = 1;
    const carrying = (state.combatState.carrying || {})[currentId()];
    return actor() && resources ? findReachable(ctx, currentId(), resources.moveRemaining * (resources.moveMultiplier || 1), carrying ? 2 : 1) : { cells: [], byKey: new Map() };
  }
  function previewMove(col, row) {
    const cell = reachable().cells.find(c => c.col === col && c.row === row) || null;
    if (!cell) return null;
    const multiplier = resources.moveMultiplier || 1;
    return { ...cell, cost: cell.cost / multiplier, budgetCost: cell.cost };
  }
  function move(col, row) {
    if (!resources || state.combatState.clock.terminal) return { ok: false, reason: '当前不能移动' };
    if (resources.moveMultiplier === undefined) resources.moveMultiplier = 1;
    const cell = previewMove(col, row);
    if (!cell || cell.cost === 0) return { ok: false, reason: '落点不可达' };
    const p = placementsById[currentId()];
    const from = { col: p.col, row: p.row, facing: p.facing };
    const last = cell.path[cell.path.length - 2] || p;
    p.facing = ((Math.atan2(col - last.col, -(row - last.row)) * 180 / Math.PI) + 360) % 360;
    p.col = col; p.row = row;
    const multiplier = resources.moveMultiplier || 1;
    const travel = cell.cost / multiplier;
    const before = resources.moveRemaining;
    resources.moveRemaining = Math.max(0, resources.moveRemaining - travel);
    if (resources.sprintRemaining) resources.sprintRemaining = Math.max(0, resources.sprintRemaining - travel);
    addLog(actor().name + ' 移动 ' + travel.toFixed(2) + 'm');
    return { ok: true, cell: { ...cell, cost: travel, budgetCost: cell.cost }, from, unitId: currentId(), moveBefore: before, moveAfter: resources.moveRemaining };
  }
  function sprint() {
    if (!resources || resources.main < 1) return { ok: false, reason: '主行动已用完' };
    resources.main--;
    resources.moveRemaining += actor().ref.moveDistance;
    resources.moveMultiplier = 1;
    resources.sprintRemaining = (resources.sprintRemaining || 0) + actor().ref.moveDistance;
    addLog(actor().name + ' 冲刺，移动额度 +' + actor().ref.moveDistance + 'm');
    return { ok: true, moveRemaining: resources.moveRemaining, sprintRemaining: resources.sprintRemaining };
  }
  function previewJump(col, row) {
    const u = actor();
    if (!u || !resources || resources.aux < 1) return { ok: false, reason: '辅助行动不足' };
    const maxDistance = (Math.max(0, statsOf(u).spd) + Math.max(0, u.ref.strength || 0)) / 20;
    return findJumpPath(ctx, u.id, col, row, maxDistance);
  }
  function jump(col, row) {
    const q = previewJump(col, row);
    if (!q.ok) return q;
    if (q.distance > resources.moveRemaining + 1e-9) return { ok: false, reason: '移动额度不足', ...q };
    const p = placementsById[currentId()];
    const from = { col: p.col, row: p.row, facing: p.facing };
    const last = q.path[q.path.length - 2] || p;
    p.facing = ((Math.atan2(col - last.col, -(row - last.row)) * 180 / Math.PI) + 360) % 360;
    p.col = col; p.row = row;
    resources.aux--;
    resources.moveRemaining = Math.max(0, resources.moveRemaining - q.distance);
    if (resources.sprintRemaining) resources.sprintRemaining = Math.max(0, resources.sprintRemaining - q.distance);
    addLog(actor().name + ' 跳跃 ' + q.distance.toFixed(2) + 'm');
    return { ...q, from, to: { col, row }, unitId: currentId(), moveRemaining: resources.moveRemaining };
  }
  function adjacent(a, afp, b, bfp) { return cellsAdjacent(a, afp, b, bfp); }
  function push(targetId) {
    const u = actor(), target = byId.get(targetId);
    if (!u || !resources || resources.aux < 1) return { ok: false, reason: '辅助行动不足' };
    if (!target || target.ref.hp <= 0 || target.id === u.id) return { ok: false, reason: '推动目标无效' };
    const up = placementsById[u.id], tp = placementsById[targetId];
    const ufp = ctx.footprintsById[u.id] || { width: 1, height: 1 }, tfp = ctx.footprintsById[targetId] || { width: 1, height: 1 };
    if (!adjacent(up, ufp, tp, tfp)) return { ok: false, reason: '推动目标必须相邻' };
    resources.aux--;
    const strength = Math.max(0, Number(u.ref.strength || 0));
    const weight = Number(target.ref.totalWeight || 0);
    const opposed = target.side !== u.side && target.ref.hp > 0;
    const rollPush = opposed ? Math.floor(random() * strength) + 1 : null;
    const rollResist = opposed ? Math.floor(random() * Math.max(1, Number(target.ref.strength || 0))) + 1 : null;
    if (!(weight < strength * 1.5) || (opposed && rollPush <= rollResist)) {
      addLog(u.name + ' 推动 ' + target.name + ' 失败');
      return { ok: true, success: false, targetId, rollPush, rollResist, moveDistance: 0 };
    }
    const requested = 2 * Math.floor(strength * 1.5 / weight);
    const from = { col: tp.col, row: tp.row, facing: tp.facing };
    const dir = { x: Math.sign(tp.col - up.col), y: Math.sign(tp.row - up.row) };
    const traced = traceDisplacement(ctx, targetId, dir, requested);
    const last = traced.path[traced.path.length - 1];
    tp.col = last.col; tp.row = last.row;
    const remaining = requested - traced.distance;
    let collision = null;
    if (remaining > 1e-9) collision = applyCollisionDamage(remaining * 10, target.ref);
    if (target.ref.hp <= 0) handleDown(target, 'collision');
    addLog(u.name + ' 推动 ' + target.name + ' ' + traced.distance.toFixed(2) + 'm' + (collision ? ' · 撞击 ' + collision.hpDmg + ' HP' : ''));
    return { ok: true, success: true, targetId, from, to: { col: tp.col, row: tp.row }, requestedDistance: requested,
      movedDistance: traced.distance, path: traced.path, blockedBy: traced.blockedBy, collision, hpAfter: target.ref.hp, down: target.ref.hp <= 0, rollPush, rollResist };
  }
  function previewCarry(targetId) {
    const u = actor(), target = byId.get(targetId);
    if (!u || !target || target.id === u.id || target.ref.hp > 0 || target.side !== u.side) return { ok: false, reason: '只能背起倒地友方' };
    if ((state.combatState.carrying || {})[u.id]) return { ok: false, reason: '已经背负角色' };
    const strength = Math.max(0, Number(u.ref.strength || 0));
    const weight = Number(u.ref.totalWeight || 0) + Number(target.ref.totalWeight || 0);
    if (!(weight < strength * 1.5)) return { ok: false, reason: '总重量超过力量上限' };
    const a = placementsById[u.id], b = placementsById[targetId];
    const af = ctx.footprintsById[u.id] || { width: 1, height: 1 }, bf = ctx.footprintsById[targetId] || { width: 1, height: 1 };
    if (!adjacent(a, af, b, bf)) return { ok: false, reason: '背负目标必须相邻' };
    return { ok: true, carrierId: u.id, targetId, totalWeight: weight };
  }
  function carry(targetId) {
    const q = previewCarry(targetId);
    if (!q.ok) return q;
    if (!resources || resources.main < 1) return { ok: false, reason: '主行动不足' };
    resources.main--;
    const carrying = state.combatState.carrying || (state.combatState.carrying = {});
    carrying[q.carrierId] = targetId;
    ctx.carriedUnitIds.add(targetId);
    addLog(actor().name + ' 背起 ' + byId.get(targetId).name);
    return q;
  }
  function drop() {
    const u = actor(), carrying = state.combatState.carrying || {};
    const targetId = u && carrying[u.id];
    if (!targetId) return { ok: false, reason: '当前没有背负角色' };
    const p = placementsById[u.id], fp = ctx.footprintsById[u.id] || { width: 1, height: 1 };
    const directions = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    let place = null;
    for (const [dx, dy] of directions) {
      const col = p.col + dx, row = p.row + dy;
      const q = canPlaceAt(ctx, targetId, col, row, [u.id]);
      if (q.ok) { place = { col, row, facing: p.facing }; break; }
    }
    if (!place) return { ok: false, reason: '附近没有合法放下位置' };
    delete carrying[u.id]; ctx.carriedUnitIds.delete(targetId);
    Object.assign(placementsById[targetId], place);
    dispatchClock(state, { type: 'reenterUnit', unitId: targetId });
    addLog(u.name + ' 放下 ' + byId.get(targetId).name);
    return { ok: true, carrierId: u.id, targetId, placement: place };
  }
  function previewDisplacement(unitId, direction, distance) { return traceDisplacement(ctx, unitId, direction, distance); }

  function currentResources() {
    return resources || state.combatState.clock?.currentAction?.resources || null;
  }
  function chargeState(unitId) {
    const charges = state.combatState.charges || (state.combatState.charges = {});
    return charges[unitId] || (charges[unitId] = { inventory: 0, preparing: null });
  }
  function usesLeft(unitId, skill) {
    if (!(skill.maxUses > 0)) return Infinity;
    return Math.max(0, skill.maxUses - usedCount(state, unitId, skillKey(skill)));
  }
  function itemBindingsFor(unit, skill) {
    const list = [];
    for (const it of (unit.items || [])) {
      for (const b of (it.bindings || [])) if (b.skillName === skill.name) list.push({ item: it, cost: b.cost || 1 });
    }
    return list;
  }
  function bindingStockOk({ item, cost }) {
    return item.category === '道具' ? (item.maxUses <= 0 || (item.usesRemaining ?? 0) >= cost) : (item.count || 0) >= cost;
  }
  function hasEnoughBindings(unit, skill) {
    return itemBindingsFor(unit, skill).every(bindingStockOk);
  }
  // 绑定扣减（原版 consumeBindingsForSkill）：道具扣次数、消耗品/弹药扣数量；返回战报文本。
  function consumeBindings(unit, skill, { excludeAmmo = false } = {}) {
    const parts = [];
    for (const b of itemBindingsFor(unit, skill)) {
      const it = b.item;
      if (excludeAmmo && it.category === '弹药') continue;
      if (it.category === '道具') {
        if (it.maxUses > 0) it.usesRemaining = Math.max(0, (it.usesRemaining ?? it.maxUses) - b.cost);
        parts.push(it.name + '（道具·使用' + b.cost + '次，剩' + (it.maxUses > 0 ? it.usesRemaining : '不限') + '）');
      } else {
        it.count = Math.max(0, (it.count || 0) - b.cost);
        parts.push(it.name + (it.category === '弹药' ? '（弹药·消耗' + b.cost + '发，剩' + it.count + '发）' : '（消耗品·消耗' + b.cost + '个，剩' + it.count + '个）'));
      }
    }
    return parts.length ? parts.join('、') : null;
  }
  function ammoQuotaForShot(cost, totalShots, shotIdx) {
    if (totalShots <= 0) return 0;
    return Math.floor(cost / totalShots) + (shotIdx <= cost % totalShots ? 1 : 0);
  }
  function consumeAmmoForShot(ammoList, shotIdx, totalShots, ammoEvents) {
    ammoList.forEach(b => {
      const quota = ammoQuotaForShot(b.cost, totalShots, shotIdx);
      if (quota <= 0) return;
      b.item.count = Math.max(0, (b.item.count || 0) - quota);
      ammoEvents.push({ item: b.item.name, shot: shotIdx, quota, remaining: b.item.count });
    });
  }

  // 有效技能视图：缺显式范围按 S14 预设补齐（不回写原对象）
  function effectiveSkill(skill) {
    if (skill.range) return skill;
    const range = resolveDefaultRange(skill);
    return range ? Object.assign({}, skill, { range }) : skill;
  }

  function canUseSkill(skill) {
    const u = actor(), r = currentResources();
    if (!u || !r || state.combatState.clock?.terminal) return { ok: false, reason: '当前不能使用技能' };
    const support = skillSupport(skill);
    if (!support.ok) return support;
    if (skill.summonTarget && !summonProvider) return { ok: false, reason: '召唤词条缺失：未接入 summonProvider，无法召唤「' + String(skill.summonTarget) + '」' };
    if (skill.summonTarget && summonProvider) {
      const missing = parseSummonSpecs(skill.summonTarget).filter(spec => !summonProvider(spec.name, spec.tags)).map(spec => spec.name);
      if (missing.length) return { ok: false, reason: '召唤词条缺失：' + missing.join('、') + '（名册/图鉴查无此词条）' };
    }
    const eff = effectiveSkill(skill);
    const key = skillKey(skill), cost = skill.actionCost || { main: 1, aux: 0 };
    const charge = chargeState(u.id), preparing = charge.preparing && charge.preparing.skillKey === key;
    if (usesLeft(u.id, skill) <= 0 && !preparing) return { ok: false, reason: '限次已用完' };
    if (skill.cooldownTurns > 0 && skillCooldownAt(u.id, key) > state.combatState.clock.now + 1e-9 && !preparing) return { ok: false, reason: '技能冷却中' };
    if (skill.isOthers) {
      const targets = units.filter(target => target.id !== u.id && target.ref.hp > 0);
      const valid = targets.some(target => {
        const tc = unitCenter(placementsById[target.id], target.footprint), uc = unitCenter(placementsById[u.id], u.footprint);
        if (Math.hypot(tc.x - uc.x, tc.y - uc.y) > (eff.range.castRange ?? 2)) return false;
        const q = queryAttack(ctx, u.id, { ...eff, isReaction: false, isOthers: false, range: { type: '单体', castRange: eff.range.castRange ?? 2 } }, { ...tc, targetId: target.id });
        return q.ok;
      });
      if (!valid) return { ok: false, reason: '没有距离与视线合法的反应目标' };
    }
    if (!hasEnoughBindings(u, skill)) return { ok: false, reason: '绑定物品存量不足' };
    const ready = preparing && charge.preparing.remaining <= 0;
    if (preparing && !ready) return { ok: false, reason: '准备尚未就绪，请继续准备' };
    if ((skill.charge > 0 || skill.delay > 0) && charge.preparing && !preparing) return { ok: false, reason: '请先释放或取消当前准备' };
    const prepSkill = skill.charge > 0 || skill.delay > 0;
    const mainCost = prepSkill ? (preparing ? (ready ? 0 : 1) : 1) : (cost.main || 0);
    const auxCost = prepSkill ? 0 : (cost.aux || 0);
    if (r.main < mainCost || r.aux < auxCost) return { ok: false, reason: r.main < mainCost ? '主行动已用完' : '辅助行动已用完' };
    if (u.ref.mp < (preparing ? 0 : (skill.cost || 0)) || u.ref.hp <= (preparing ? 0 : (skill.hpCost || 0)) || (u.ref.tp || 0) < (preparing ? 0 : (skill.tpCost || 0))) return { ok: false, reason: '数值资源不足' };
    return { ok: true, preparing: !!preparing, ready, mainCost, auxCost, eff };
  }
  function skillCooldownAt(unitId, key) {
    return state.cooldowns?.[unitId]?.[key] || 0;
  }

  function skillStatus(skill) {
    const status = canUseSkill(skill);
    if (!status.ok) return status;
    if (skill.isReaction) return { ok: false, reason: '反应技能只能被动触发' };
    return status;
  }

  function previewAttack(skill, aim) {
    const valid = canUseSkill(skill);
    if (!valid.ok) return { ok: false, reason: valid.reason, cells: [], targetIds: [], slotTargets: [] };
    const eff = valid.eff || effectiveSkill(skill);
    const query = queryAttack(ctx, currentId(), eff, aim);
    if (!query.ok) return query;
    const caster = actor();
    for (const slot of query.slotTargets || []) {
      const def = effectDefinition(slot.tag);
      if (!def) return { ...query, ok: false, reason: '效果尚未迁移：' + slot.tag };
      if (def.kind === 'barrier') return { ...query, ok: false, reason: '场地结界（肃正）暂缓' };
      const possible = (slot.targetIds || []).some(id => targetSideOk(def, byId.get(id), caster));
      if (!possible) return { ...query, ok: false, reason: '没有该效果的合法目标：' + slot.tag };
    }
    return query;
  }
  function targetSideOk(def, target, caster) {
    if (!target) return false;
    if (def.side === 'self') return target.id === caster.id;
    if (def.side === 'enemy') return target.side !== caster.side;
    return target.side === caster.side; // ally / default
  }

  // ---------- 反应链 ----------
  // incomingType：来袭技能的伤害类型；反应按来袭技能匹配（不按来源单位 damageType）
  function canUseReaction(responder, skill, sourceId, incomingType = null) {
    const source = byId.get(sourceId);
    if (!responder || !source || !skill || responder.ref.hp <= 0 || source.ref.hp <= 0) return { ok: false, reason: '反应技能不可用' };
    if (skill.kanpoTarget) {
      if (skill.kanpoTarget !== 'all' && skill.kanpoTarget !== (incomingType || '近战')) return { ok: false, reason: '看破类型不匹配' };
    } else if (!skill.isReaction) {
      return { ok: false, reason: '反应技能不可用' };
    }
    if (skill.isReaction && skill.reactionTarget && skill.reactionTarget !== 'all' && skill.reactionTarget !== (incomingType || source.ref.damageType)) return { ok: false, reason: '反应类型不匹配' };
    const key = skillKey(skill);
    if (usesLeft(responder.id, skill) <= 0 || skillCooldownAt(responder.id, key) > state.combatState.clock.now + 1e-9) return { ok: false, reason: '反应限次或冷却未就绪' };
    if (responder.ref.mp < (skill.cost || 0) || responder.ref.hp <= (skill.hpCost || 0) || (responder.ref.tp || 0) < (skill.tpCost || 0)) return { ok: false, reason: '反应资源不足' };
    if (!hasEnoughBindings(responder, skill)) return { ok: false, reason: '绑定物品存量不足' };
    const target = source;
    const check = queryAttack(ctx, responder.id, effectiveSkill(skill), { ...unitCenter(placementsById[target.id], target.footprint), targetId: target.id });
    return check.ok ? { ok: true, query: check, responder, source } : { ok: false, reason: check.reason, query: check };
  }
  function collectReactionCandidates(target, incomingSkill, incomingType, sourceId) {
    const out = [];
    for (const s of (target.skills || [])) {
      if (!s.isReaction && !s.kanpoTarget) continue;
      if (s.sheshenTarget) continue; // 舍身暂缓
      // 统一走 canUseReaction：类型匹配/限次/冷却/资源/绑定/射程视线遮挡一次查全
      const check = canUseReaction(target, s, sourceId, incomingType);
      if (check.ok && check.responder === target) out.push(s);
    }
    return out;
  }
  // 回避成功后的真实错位：折影步原值侧闪（先左后右、八方向量化），成功回避才位移
  function evadeShift(responder, source, shift) {
    const fp = responder.footprint || { width: 1, height: 1 };
    const a = unitCenter(placementsById[source.id], source.footprint), b = unitCenter(placementsById[responder.id], fp);
    const base = Math.atan2(b.y - a.y, b.x - a.x);
    const angles = shift.mode === 'back' ? [base] : [base - Math.PI / 2, base + Math.PI / 2];
    const from = { col: placementsById[responder.id].col, row: placementsById[responder.id].row };
    for (const ang of angles) {
      const q = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
      const dir = { x: Math.round(Math.cos(q)), y: Math.round(Math.sin(q)) };
      const traced = traceDisplacement(ctx, responder.id, dir, shift.distance);
      if (traced.distance <= 1e-9) continue;
      const last = traced.path[traced.path.length - 1];
      placementsById[responder.id].col = last.col; placementsById[responder.id].row = last.row;
      return { from, to: { col: last.col, row: last.row }, path: traced.path, distance: traced.distance };
    }
    return null;
  }
  // 执行反应技能：扣费一次、槽位照常结算；看破→整段取消；回避 buff→二次闪避判定（纯看回避值）；
  // 反击槽→立即反击（FX01 口径保留）。
  function executeReaction(responder, rskill, attacker, incomingSkill) {
    const key = skillKey(rskill);
    responder.ref.mp -= rskill.cost || 0;
    responder.ref.hp -= rskill.hpCost || 0;
    responder.ref.tp = (responder.ref.tp || 0) - (rskill.tpCost || 0);
    if (rskill.maxUses > 0) {
      if (!state.perBattleUses) state.perBattleUses = {};
      const uses = state.perBattleUses[responder.id] || (state.perBattleUses[responder.id] = {});
      uses[key] = (uses[key] || 0) + 1;
    }
    consumeBindings(responder, rskill);
    notifyManaSpent(responder, rskill.cost || 0);
    addLog(responder.name + ' 反应 · ' + rskill.name);
    // 看破：整个来袭技能被无效化（先于其它槽位）
    if (rskill.kanpoTarget) {
      addLog('⛔ ' + responder.name + ' 施展【' + rskill.name + '】看穿了敌方气路，【' + incomingSkill.name + '】被彻底无效化！');
      return { ok: true, canceled: true, dodged: false, shift: null };
    }
    const before = buffsOf(responder.id).slice();
    const slots = skillSlots(effectiveSkill(rskill));
    const selfTargets = slots.filter(s => s.target === 'self' || s.definition.side === 'self' || s.definition.side === 'ally' || s.definition.side === 'default')
      .map(s => ({ slot: s, targets: [responder] }));
    for (const { slot, targets } of selfTargets) {
      if (slot.attack) continue; // 反击槽不走 applyEffectSlot
      if (slot.definition.kind === 'counter') continue;
      applyEffectSlot(rt, { caster: responder, slot, targets, skill: rskill, skillKey: key });
    }
    // 二次闪避判定：抛弃基础速度，纯看本次反应新增的回避值（原版 L23281）
    const newEva = buffsOf(responder.id).find(b => b.type === 'eva' && !before.includes(b));
    if (newEva) {
      const pureEva = Math.max(1, newEva.value);
      const cStats = statsOf(attacker);
      const attackCap = Math.max(1, (incomingSkill.hit ?? 100) + cStats.hit);
      const dodged = Math.floor(random() * pureEva) + 1 > Math.floor(random() * attackCap) + 1;
      if (newEva.isConsumable) removeBuffRecord(responder.id, newEva);
      const shift = dodged && rskill.evadeShift ? evadeShift(responder, attacker, rskill.evadeShift) : null;
      if (dodged) addLog(responder.name + ' 反应闪避成功' + (shift ? ' · ' + rskill.name + ' 错位 ' + shift.distance.toFixed(1) + 'm' : ''));
      return { ok: true, canceled: false, dodged, shift };
    }
    // 反击槽反应：立即反击（威力=槽 power 加成）
    const counterSlot = slots.find(s => s.definition.kind === 'counter');
    if (counterSlot) {
      counterStrike(responder, attacker, counterSlot.power);
      return { ok: true, canceled: false, dodged: false, countered: true };
    }
    return { ok: true, canceled: false, dodged: false, shift: null };
  }
  // 反击：无独立命闪（原版口径），近战类型直接走减伤管线
  function counterStrike(defender, attacker, bonusPower) {
    if (attacker.ref.hp <= 0 || defender.ref.hp <= 0) return null;
    const dStats = statsOf(defender);
    const raw0 = bonusPower + dStats.atk;
    const raw = applyTypeResist(raw0, '近战', false, attacker, buffsOf(attacker.id));
    const aStats = statsOf(attacker);
    const { hpDmg, shieldDmg } = calculateDamage(raw, { def: aStats.def, shield: attacker.ref.shield || 0 }, { defending: isDefending(attacker) });
    if (shieldDmg > 0) attacker.ref.shield = Math.max(0, (attacker.ref.shield || 0) - shieldDmg);
    attacker.ref.hp = Math.max(0, attacker.ref.hp - hpDmg);
    addLog('⚔️ ' + defender.name + ' 闪避并趁势反击！' + attacker.name + ' -' + hpDmg + ' HP' + (shieldDmg ? '（破盾' + shieldDmg + '）' : ''));
    if (defender.classType === '防守者' && (hpDmg > 0 || shieldDmg > 0)) {
      defender.ref.baseTauntBonus = (defender.ref.baseTauntBonus || 0) + 20;
      addLog('🛡️ ' + defender.name + ' 的防守反击吸引了更多仇恨（嘲讽值永久+20）');
    }
    if (attacker.ref.hp <= 0) handleDown(attacker, 'counter');
    return { hpDmg, shieldDmg };
  }
  function isDefending(unit) {
    return buffsOf(unit.id).some(b => b.type === 'defend');
  }
  // 防守者强力反击：闪避成功时按概率触发，双倍攻击力（原版 onDodge）
  function tryPowerCounter(defender, attacker) {
    const passive = CLASS_PASSIVES[defender.classType];
    if (!passive || !passive.powerCounterChance) return false;
    const stats = statsOf(defender);
    if (random() * 100 >= passive.powerCounterChance(defender, stats)) return false;
    const raw = applyTypeResist(stats.atk * 2, '近战', false, attacker, buffsOf(attacker.id));
    const aStats = statsOf(attacker);
    const { hpDmg, shieldDmg } = calculateDamage(raw, { def: aStats.def, shield: attacker.ref.shield || 0 }, { defending: isDefending(attacker) });
    if (shieldDmg > 0) attacker.ref.shield = Math.max(0, (attacker.ref.shield || 0) - shieldDmg);
    attacker.ref.hp = Math.max(0, attacker.ref.hp - hpDmg);
    addLog('⚔️ ' + defender.name + ' 发动【强力反击】！' + attacker.name + ' -' + hpDmg + ' HP');
    const granted = passive.onPowerCounter ? passive.onPowerCounter(defender) : null;
    if (granted && granted.resetTaunt) {
      const list = buffsOf(defender.id);
      list.filter(b => b.type === 'taunt').forEach(b => removeBuffRecord(defender.id, b));
      defender.ref.baseTauntBonus = 100;
    }
    if (attacker.ref.hp <= 0) handleDown(attacker, 'counter');
    return true;
  }

  // ---------- 召唤 ----------
  function spawnSummons(skill, caster, result) {
    const specs = parseSummonSpecs(skill.summonTarget);
    const created = [];
    for (const spec of specs) {
      for (let i = 0; i < spec.count; i++) {
        // 数值来源：summonProvider(名册/图鉴)；查无词条明确失败，不造标准人形兜底（用户禁令：禁止推测回落）
        const provided = summonProvider ? summonProvider(spec.name, spec.tags) : null;
        if (!provided) {
          result.summonFailed = '召唤词条缺失：' + spec.name;
          result.summonMissing = result.summonMissing || [];
          result.summonMissing.push(spec.name);
          continue;
        }
        const data = provided;
        const id = 'sum_' + (++summonSerial) + '_' + spec.name;
        const unit = {
          id, name: spec.name + (spec.count > 1 ? '·' + (i + 1) : ''), side: caster.side, controller: 'ai',
          isSummon: true, summonOwnerId: caster.id, classType: data.classType || null, attrTags: spec.tags.slice(),
          footprint: data.footprint || { width: 1, height: 1 },
          ref: Object.assign({ hp: data.maxHp || 100, maxHp: data.maxHp || 100, mp: data.mp ?? data.maxMp ?? 0, maxMp: data.maxMp ?? 0,
            tp: 0, maxTp: data.maxTp ?? 0, atk: data.atk || 10, def: data.def || 0, spd: data.spd || 100,
            evasion: data.evasion != null ? data.evasion : 50, strength: data.strength || 50, totalWeight: data.totalWeight || 70,
            moveDistance: data.moveDistance || 6, perception: data.perception || 50, shield: 0, reviveCount: data.reviveCount || 0,
            resistMap: data.resistMap || null }, data.extraRef || {}),
          skills: data.skills || [], items: [],
        };
        // 先入册再落位（canPlaceAt 需在 units 中找到单位；落位失败则回滚）
        units.push(unit); byId.set(id, unit);
        ctx.footprintsById[id] = unit.footprint;
        const cp = placementsById[caster.id];
        let placed = null;
        outer: for (let ring = 1; ring <= 6 && !placed; ring++) {
          for (let dc = -ring; dc <= ring; dc++) for (let dr = -ring; dr <= ring; dr++) {
            if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
            const q = canPlaceAt(ctx, id, cp.col + dc, cp.row + dr, [caster.id]);
            if (q.ok) { placed = { col: cp.col + dc, row: cp.row + dr, facing: cp.facing }; break outer; }
          }
        }
        if (!placed) {
          byId.delete(id); ctx.footprintsById[id] && delete ctx.footprintsById[id];
          const i = units.indexOf(unit); if (i >= 0) units.splice(i, 1);
          result.summonFailed = '召唤落位失败：' + spec.name; continue;
        }
        placementsById[id] = placed;
        dispatchBattleClock({ type: 'registerUnit', unit: { id, side: unit.side, name: unit.name, baseSpd: unit.ref.spd } });
        addLog(caster.name + ' 召唤了 ' + unit.name);
        created.push(unit);
      }
    }
    return created;
  }

  // ---------- 攻击主链（generator：反应选择通过 yield 与调用方交互） ----------
  function failAttack(reason, extra = {}) {
    return Object.assign({ ok: false, reason, hits: [], effects: [], events: [], ammoEvents: [], logFrom: log.length, logTo: log.length }, extra);
  }

  function* beginAttack(skillInput, aim, options = {}) {
    const skill = skillInput;
    const u = actor();
    const logFrom = log.length;
    const valid = canUseSkill(skill);
    if (!valid.ok) return failAttack(valid.reason);
    const eff = valid.eff || effectiveSkill(skill);
    const query = queryAttack(ctx, u.id, eff, aim);
    if (!query.ok) return failAttack(query.reason, { query });
    // 规范槽视图（skillSlots）合并空间结果（query.slotTargets 提供各槽 targetIds）
    const slots = skillSlots(eff).map(s => Object.assign({}, s, { targetIds: (query.slotTargets || [])[s.index]?.targetIds || [] }));
    const key = skillKey(skill);
    const charge = chargeState(u.id);
    const preparing = charge.preparing && charge.preparing.skillKey === key;
    const prepReady = preparing && charge.preparing.remaining <= 0;
    const prepKind = skill.charge > 0 ? 'charge' : (skill.delay > 0 ? 'delay' : null);
    const chargeInfo = { preparing: !!preparing, ready: prepReady, kind: prepKind };
    const costSummary = { main: 0, aux: 0, mp: 0, hp: 0, tp: 0, uses: 0, bindings: null, ammoShots: 0 };

    // 蓄力/延迟开始：支付基础 1 主行动 + MP/HP/TP/限次/绑定，登记 preparing，不进冷却、不结算槽位
    if (prepKind && !preparing) {
      resources.main -= 1; costSummary.main = 1;
      u.ref.mp -= skill.cost || 0; costSummary.mp = skill.cost || 0;
      u.ref.hp -= skill.hpCost || 0; costSummary.hp = skill.hpCost || 0;
      u.ref.tp = (u.ref.tp || 0) - (skill.tpCost || 0); costSummary.tp = skill.tpCost || 0;
      if (skill.maxUses > 0) {
        if (!state.perBattleUses) state.perBattleUses = {};
        const uses = state.perBattleUses[u.id] || (state.perBattleUses[u.id] = {});
        uses[key] = (uses[key] || 0) + 1; costSummary.uses = 1;
      }
      costSummary.bindings = consumeBindings(u, skill);
      const remaining = Math.max(0, (prepKind === 'charge' ? skill.charge : skill.delay) - charge.inventory);
      const invested = Math.min(skill.charge > 0 ? skill.charge : skill.delay, charge.inventory);
      charge.inventory -= invested;
      charge.preparing = { skillKey: key, skill: structuredClone(skill), remaining, invested, source: prepKind, aim: { ...aim }, ready: remaining === 0 };
      if (charge.preparing.remaining === 0) charge.preparing.ready = true;
      prepareAtActionStart(u);
      notifyManaSpent(u, skill.cost || 0);
      addLog(u.name + ' 开始' + (prepKind === 'charge' ? '蓄力' : '准备') + ' ' + skill.name + ' · 需投入 ' + charge.preparing.remaining);
      return { ok: true, preparing: true, charge: chargeInfo, hits: [], effects: [], events: [], ammoEvents: [], query, casterId: u.id, skill, aim: { ...aim }, costSummary, logFrom, logTo: log.length };
    }

    // 目标与槽位校验（召唤技能允许无目标槽位；纯空目标才拒绝）
    const damageSlots = slots.filter(s => s.attack);
    for (const slot of slots) {
      if (slot.definition.kind === 'barrier') return failAttack('场地结界（肃正）暂缓', { query });
    }
    const allTargets = [...new Set(slots.flatMap(s => s.targetIds || []))];
    if (!allTargets.length && !skill.summonTarget && !slots.some(s => s.target === 'self' || s.definition.side === 'self')) {
      return failAttack('范围内没有合法目标', { query });
    }

    // 费用一次（就绪释放不再支付；普通技能整次一次）
    if (!preparing) {
      resources.main -= valid.mainCost; resources.aux -= valid.auxCost;
      costSummary.main = valid.mainCost; costSummary.aux = valid.auxCost;
      u.ref.mp -= skill.cost || 0; costSummary.mp = skill.cost || 0;
      u.ref.hp -= skill.hpCost || 0; costSummary.hp = skill.hpCost || 0;
      u.ref.tp = (u.ref.tp || 0) - (skill.tpCost || 0); costSummary.tp = skill.tpCost || 0;
      if (skill.maxUses > 0) {
        if (!state.perBattleUses) state.perBattleUses = {};
        const uses = state.perBattleUses[u.id] || (state.perBattleUses[u.id] = {});
        uses[key] = (uses[key] || 0) + 1; costSummary.uses = 1;
      }
      notifyManaSpent(u, skill.cost || 0);
      costSummary.bindings = consumeBindings(u, skill, { excludeAmmo: damageSlots.length > 0 });
      if (costSummary.bindings) addLog('施展材料：' + costSummary.bindings);
    }
    // 冷却（独立字段 [冷却:N]，延迟不再当冷却）
    if (skill.cooldownTurns > 0 && !preparing) dispatchClock(state, { type: 'applyCooldown', unitId: u.id, skillKey: key, duration: skill.cooldownTurns * ROUND_TIME });

    // 召唤（召唤物立即占位、可被选为目标，从零跑完整圈；临时 AI 不进玩家弹窗）
    const summons = skill.summonTarget ? spawnSummons(skill, u, {}) : [];

    // 命中结论账本（原版 _bdg）：减益共享"至少一次命中"
    const bdg = { targetHit: {}, targetResolved: {}, debuffRolled: {} };
    const hits = [];
    const hitMap = new Map();
    const effects = [];
    const ammoEvents = [];
    const ammoBinds = itemBindingsFor(u, skill).filter(b => b.item.category === '弹药');
    const canceled = { value: false };
    const incomingType = eff.damageType || '近战';
    const isAoE = ['直线', '扇形', '圆形', '全域', '爆炸'].includes(eff.range.type);
    let shotIdx = 0;

    for (const slot of sortSlotsForResolve(slots)) {
      if (canceled.value) break;
      const def = slot.definition;
      let targets = [];
      if (slot.target === 'self' || def.side === 'self') targets = u.ref.hp > 0 ? [u] : [];
      else targets = (slot.targetIds || []).map(id => byId.get(id)).filter(t => t && t.ref.hp > 0)
        .filter(t => targetSideOk(def, t, u));
      if (def.kind === 'attack' && targets.length) {
        shotIdx++;
        if (ammoBinds.length) consumeAmmoForShot(ammoBinds, shotIdx, damageSlots.length, ammoEvents);
      }
      for (const target of targets) {
        if (canceled.value) break;
        if (def.kind === 'attack') {
          // 转火：主目标死亡后随机转向其他存活敌方（原版 [转火]）
          let t = target;
          if (t.ref.hp <= 0 && skill.switchTarget) {
            t = units.find(x => x.side !== u.side && x.ref.hp > 0) || null;
            if (!t) continue;
            addLog('🔥 转火：后续攻击转向 ' + t.name);
          }
          const seg = yield* resolveAttackSegment({ caster: u, target: t, slot, skill: eff, baseSkill: skill, slotIndex: slot.index,
            segmentIndex: shotIdx, shotIndex: shotIdx, totalShots: damageSlots.length, bdg, canceled, incomingType, isAoE, options });
          if (!seg) continue;
          const prev = hitMap.get(seg.targetId);
          if (!prev) {
            const rec = { targetId: seg.targetId, side: byId.get(seg.targetId).side, hit: seg.hit, hpDmg: seg.hpDmg, hpBefore: seg.hpBefore, hpAfter: seg.hpAfter, maxHp: byId.get(seg.targetId).ref.maxHp, down: seg.down, logIndex: seg.logIndex, logEnd: seg.logEnd, segments: [seg] };
            if (seg.reaction) rec.reaction = seg.reaction;
            hits.push(rec); hitMap.set(seg.targetId, rec);
          } else {
            prev.hit = prev.hit || seg.hit;
            prev.hpDmg += seg.hpDmg;
            prev.hpAfter = seg.hpAfter;
            prev.down = seg.down;
            prev.logEnd = seg.logEnd;
            prev.segments.push(seg);
          }
        } else {
          // 效果槽：减益需命中门（自X/增益/必中例外）
          let ok = true;
          if (def.debuff && !def.selfCost && !skill.guaranteedHit) {
            if (bdg.targetResolved[target.id]) ok = bdg.targetHit[target.id] === true;
            else {
              // 纯减益技能首个减益槽独立掷骰（原版口径），结果共享给后续减益槽
              const cStats = statsOf(u), tStats = statsOf(target);
              const roll = resolveHit({ hitBonus: cStats.hit }, { evasion: target.ref.evasion || 0, evaBonus: tStats.eva }, skill, random);
              bdg.targetResolved[target.id] = true;
              bdg.targetHit[target.id] = roll.hit;
              ok = roll.hit;
            }
            if (!ok) { addLog('【' + slot.tag.replace(/\[|\]/g, '') + '】妨害随攻击一同落空，未能施加到 ' + target.name); continue; }
          }
          const applied = applyEffectSlot(rt, { caster: u, slot, targets: [target], skill: eff, skillKey: key });
          effects.push(...applied.applied);
        }
      }
    }

    if (preparing) charge.preparing = null;
    if (skill.haste > 0) charge.inventory += skill.haste; // 准备技能释放后同样入账（主代理复审指令：移除 !prepKind）
    // 风行者多重施法：消耗MP释放技能时（非反应技）按耗蓝概率获得额外主行动点（概率原值；P03 grantMainPoint 映射）
    const mc = CLASS_PASSIVES[u.classType]?.onSkillExecuted?.(u, skill, false, passiveIo(u));
    if (mc && mc.multicast) addLog('🌟 ' + u.name + ' 的法力产生共鸣，引发了多重施法（获得额外主行动点）！');
    const p = placementsById[u.id];
    p.facing = ((Math.atan2(aim.x - query.origin.x, -(aim.y - query.origin.y)) * 180 / Math.PI) + 360) % 360;
    // 施法 TP：普通攻击 +20，其余技能 +5（原版口径）
    u.ref.tp = Math.min(u.ref.maxTp || 100, (u.ref.tp || 0) + (skill === BASIC_ATTACK ? 20 : 5));
    return { ok: true, hits, effects, events: [], ammoEvents, summons: summons.map(s => s.id), query, casterId: u.id, skill, aim: { ...aim },
      facing: p.facing, incomingType, canceled: canceled.value, costSummary, charge: chargeInfo, logFrom, logTo: log.length };
  }

  // 单段攻击：命闪 →（将命中才）反应拦截 yield → 伤害管线 → 附带效果
  function* resolveAttackSegment({ caster, target, slot, skill, baseSkill, slotIndex, segmentIndex, shotIndex, totalShots, bdg, canceled, incomingType, isAoE, options }) {
    const cStats = statsOf(caster);
    const tStats = statsOf(target);
    const passive = CLASS_PASSIVES[caster.classType] || null;
    const roll = 0.8 + random() * 0.4;
    const pierce = !!slot.definition.pierce || !!(passive && passive.checkPierce && passive.checkPierce(caster));
    const logStart = log.length;
    const segBase = { index: slotIndex, targetId: target.id, logIndex: logStart };
    // 初次命闪（【必中】跳过被动闪避；仍可被反应化解）；征伐者 modifyDodgeCap：闪避分母按自身−攻击者速度差提升（原版 L21976）
    const dodgeCapBonus = passive && passive.modifyDodgeCap ? Math.max(0, passive.modifyDodgeCap(target, caster, tStats, cStats) || 0) : 0;
    const hitResult = baseSkill.guaranteedHit ? { hit: true, attackRoll: null, dodgeRoll: null }
      : resolveHit({ hitBonus: cStats.hit }, { evasion: target.ref.evasion || 0, evaBonus: tStats.eva + dodgeCapBonus }, baseSkill, random);
    if (!hitResult.hit) {
      addLog(caster.name + ' · ' + skill.name + ' → ' + target.name + ' 闪避');
      // 命中结论账本：已判定即 resolved（miss 不覆写此前 targetHit=true，多段至少一次命中共享）
      if (!bdg.targetResolved[target.id]) { bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false; }
      if (target.side === 'hero') target.ref.tp = Math.min(target.ref.maxTp || 100, (target.ref.tp || 0) + 5);
      if (incomingType === '近战') {
        const hasCounter = buffsOf(target.id).some(b => b.type === 'counter');
        if (hasCounter && !tryPowerCounter(target, caster)) {
          const counterBuff = buffsOf(target.id).find(b => b.type === 'counter');
          counterStrike(target, caster, counterBuff ? counterBuff.value : 0);
        }
      }
      return Object.assign(segBase, { hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: target.ref.hp <= 0, logEnd: log.length });
    }
    // 确认将命中 → 反应拦截（只对该发；选择由调用方 next() 给出或 policy 自动）
    let reaction = null;
    const candidates = collectReactionCandidates(target, skill, incomingType, caster.id);
    if (candidates.length && !options.suppressReactions) {
      const request = { type: 'reaction', responderId: target.id, casterId: caster.id, skill, incomingType,
        candidates: candidates.map(s => ({ skill: s, usesLeft: usesLeft(target.id, s), cost: s.cost || 0 })),
        slotIndex, segmentIndex, targetId: target.id, shotIndex, totalShots };
      let choice = null;
      if (options.autoAnswer) choice = options.autoAnswer(request);
      else choice = yield request;
      if (choice && choice.skill) {
        const rr = executeReaction(target, choice.skill, caster, skill);
        reaction = { responderId: target.id, skillName: choice.skill.name, fxTag: choice.skill.fxTag || null,
          canceled: !!rr.canceled, dodged: !!rr.dodged, shift: rr.shift || null, countered: !!rr.countered };
        if (rr.canceled) { canceled.value = true; if (!bdg.targetResolved[target.id]) { bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false; } return Object.assign(segBase, { hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reaction, logEnd: log.length }); }
        if (rr.dodged) {
          if (!bdg.targetResolved[target.id]) { bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false; }
          return Object.assign(segBase, { hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reaction, logEnd: log.length });
        }
      }
    }
    // 记录命中结论（减益共享）
    bdg.targetResolved[target.id] = true;
    bdg.targetHit[target.id] = true;
    // 隐匿者被敌方命中 → 隐匿窗口受击标记（本窗口不累积“未受击+10”；护盾全挡/-0 同样算受伤，原版 L24070）
    if (target.classType === '隐匿者' && caster.side !== target.side) dispatchBattleClock({ type: 'markHit', unitId: target.id });
    // 伤害管线：变种抗性 → 护甲/免伤/防御姿态 → 护盾 → HP（原版顺序）
    // 暴击（原版 [暴击:N%] + 征伐者 modifyCritRate：正向速度buff +10%）：命中段掷骰翻倍；无暴击来源不耗随机数
    const critRate = Math.max(0, Math.min(100, (baseSkill.critRate || 0) + (passive && passive.modifyCritRate ? passive.modifyCritRate(caster, target, cStats, tStats, buffsOf(caster.id)) : 0)));
    const crit = critRate > 0 && random() * 100 < critRate;
    const raw0 = computeSegmentRawDamage(cStats, caster.ref.atk, slot.power, crit ? 2 : 1, roll, {
      modifyDamageMultiplier: args => (passive && passive.modifyDamageMultiplier ? passive.modifyDamageMultiplier(args.caster, args.target, buffsOf(args.target.id), statsOf(args.caster), statsOf(args.target)) : 0),
      modifyDamageDealt: args => (passive && passive.modifyDamageDealt ? passive.modifyDamageDealt(args.caster, args.skill, statsOf(args.caster)) : 0),
    }, { caster, target, skill });
    if (crit) addLog('💥 ' + caster.name + ' 触发暴击（' + Math.floor(critRate) + '%）！');
    const raw = applyTypeResist(raw0, incomingType, isAoE, target, buffsOf(target.id));
    const guard = buffsOf(target.id).find(b => b.type === 'damageGuard');
    let { hpDmg, shieldDmg } = calculateDamage(raw, { def: tStats.def, shield: target.ref.shield || 0, hp: target.ref.hp },
      { isPierce: pierce, armorMult: slot.definition.scatter ? 3 : 1, hasDamageGuard: !!guard, defending: isDefending(target) });
    if (guard) { addLog('🛡️ ' + target.name + ' 的【免伤】生效并消耗'); removeBuffRecord(target.id, guard); }
    if (passive && passive.modifyTrueDamage) hpDmg += passive.modifyTrueDamage(caster) || 0;
    // 致死保命被动（毅力/回避致命）
    if (target.ref.hp - hpDmg <= 0) {
      const fatalCtx = { unit: target, hpDmg, shieldDmg };
      const tp = CLASS_PASSIVES[target.classType];
      if (tp && tp.onFatalDamage && tp.onFatalDamage(fatalCtx)) {
        hpDmg = fatalCtx.hpDmg; shieldDmg = fatalCtx.shieldDmg;
        addLog(target.name + ' 触发职业被动【' + (fatalCtx.hpDmg === 0 ? '回避致命' : '毅力留存') + '】躲过了死亡！');
      }
    }
    const hpBefore = target.ref.hp;
    if (shieldDmg > 0) target.ref.shield = Math.max(0, (target.ref.shield || 0) - shieldDmg);
    const dealt = Math.min(target.ref.hp, hpDmg);
    target.ref.hp = Math.max(0, target.ref.hp - hpDmg);
    target.ref.tp = Math.min(target.ref.maxTp || 100, (target.ref.tp || 0) + 10);
    addLog(caster.name + ' · ' + skill.name + ' → ' + target.name + ' -' + dealt + ' HP' + (shieldDmg ? '（破盾' + shieldDmg + '）' : ''));
    // 眩晕槽附带（钢体免疫）
    if (slot.definition.stun && target.ref.hp > 0) {
      if (isImmuneToStun(target, buffsOf(target.id))) addLog(target.name + ' 免疫了眩晕（钢体）');
      else { dispatchBattleClock({ type: 'applyStun', unitId: target.id }); addLog(target.name + ' 被击晕，将跳过下一次行动！'); }
    }
    // 职业命中后效果（灾厄使淬毒 / 隐匿者暗袭眩晕）
    const afterHook = passive && passive.onAfterDamageDealt ? passive.onAfterDamageDealt({ caster, target, damageType: incomingType, targetAlive: target.ref.hp > 0, casterStats: cStats, targetBuffs: buffsOf(target.id) }, random) : null;
    if (afterHook && afterHook.poison) {
      registerDot(target, 'poison', { strength: afterHook.poison.power, turns: afterHook.poison.turns, casterId: caster.id, skillKey: skillKey(baseSkill), slotTag: '淬毒' });
      addLog(target.name + ' 被淬毒（职业被动）');
    }
    if (afterHook && afterHook.stun && target.ref.hp > 0 && !isImmuneToStun(target, buffsOf(target.id))) {
      dispatchBattleClock({ type: 'applyStun', unitId: target.id });
      addLog(target.name + ' 被暗袭命中弱点，眩晕了！');
    }
    // 吸血（实际伤害 30% 转回复）
    const ls = lifestealRatio(caster, buffsOf(caster.id));
    if (ls > 0 && dealt > 0 && caster.ref.hp > 0) {
      const heal = Math.max(1, Math.floor(dealt * ls));
      caster.ref.hp = Math.min(caster.ref.maxHp, caster.ref.hp + heal);
      addLog(caster.name + ' 【吸血】回复 ' + heal + ' HP');
    }
    // 荆棘（被近战命中反弹 50% 实际伤害，下限垫高）
    if (hasThorns(target, buffsOf(target.id)) && incomingType === '近战' && caster.ref.hp > 0 && (dealt + shieldDmg) > 0) {
      const reflectRaw = thornsRawReflect(dealt + shieldDmg, aStats0(caster).def);
      const aStats = statsOf(caster);
      const r = calculateDamage(reflectRaw, { def: aStats.def, shield: caster.ref.shield || 0 }, { defending: isDefending(caster) });
      caster.ref.hp = Math.max(0, caster.ref.hp - r.hpDmg);
      addLog('🌵 ' + target.name + ' 的【荆棘】反弹 ' + r.hpDmg + ' HP → ' + caster.name);
      if (caster.ref.hp <= 0) handleDown(caster, 'thorns');
    }
    let down = false;
    if (target.ref.hp <= 0) down = handleDown(target, 'attack');
    else runEnemyThresholdVariants(target); // 蜕皮/连动阈值（原版受击后收口）
    if (down && target.side === 'enemy') {
      const kp = CLASS_PASSIVES[caster.classType];
      const res = kp && kp.onKill ? kp.onKill(caster, passiveIo(caster)) : null;
      if (res && res.extraTurn) addLog('⚡ ' + caster.name + ' 击杀累积隐匿值 ' + res.stealthVal + '，触发【再动】！');
      if (res && res.rush) addLog('🎯 ' + caster.name + ' 隐匿值突破 100，下一次非反应攻击 +50（隐匿值回归 50）');
    }
    return Object.assign(segBase, { hit: true, hpDmg: dealt, hpBefore, hpAfter: target.ref.hp, down, reaction: reaction || undefined, logEnd: log.length });
  }
  function aStats0(u) { return u.ref; }

  // 离线包装：battle.attack 仅用于无玩家选择场景。缺省 policy:'none'（全部响应者跳过，绝不代玩家）；
  // 显式 policy:'auto'（离线测试）才自动选首个可用反应。UI/真实交互一律走 beginAttack。
  function attack(skill, aim, options = {}) {
    const policy = options.policy || 'none';
    const gen = beginAttack(skill, aim, {
      suppressReactions: policy === 'none',
      autoAnswer: policy === 'auto' ? req => (req.candidates[0] ? { responderId: req.responderId, skill: req.candidates[0].skill } : null) : null,
    });
    let step = gen.next();
    while (!step.done) step = gen.next(null);
    return step.value;
  }

  // ---------- 物品（beginUseItem 同链 generator） ----------
  function canUseItem(item) {
    const u = actor(), r = currentResources();
    if (!u || !r || state.combatState.clock?.terminal) return { ok: false, reason: '当前不能使用物品' };
    if (item.category === '道具' && item._sbMissing) return { ok: false, reason: '道具不在场' };
    if (item.maxUses > 0 && (item.usesRemaining ?? 0) <= 0) return { ok: false, reason: '物品次数已用完' };
    if (item.maxUses <= 0 && (item.count || 0) <= 0) return { ok: false, reason: '物品数量不足' };
    const cost = item.actionCost || { main: 1, aux: 0 };
    if (r.main < (cost.main || 0) || r.aux < (cost.aux || 0)) return { ok: false, reason: '行动资源不足' };
    if (u.ref.mp < (item.cost || 0) || u.ref.hp <= (item.hpCost || 0) || (u.ref.tp || 0) < (item.tpCost || 0)) return { ok: false, reason: '数值资源不足' };
    if (item.summonTarget && !summonProvider) return { ok: false, reason: '召唤词条缺失：未接入 summonProvider，无法召唤「' + String(item.summonTarget) + '」' };
    if (item.summonTarget && summonProvider) {
      const missing = parseSummonSpecs(item.summonTarget).filter(spec => !summonProvider(spec.name, spec.tags)).map(spec => spec.name);
      if (missing.length) return { ok: false, reason: '召唤词条缺失：' + missing.join('、') + '（名册/图鉴查无此词条）' };
    }
    return { ok: true };
  }
  function* beginUseItem(item, aim, options = {}) {
    const u = actor();
    const logFrom = log.length;
    const check = canUseItem(item);
    if (!check.ok) return failAttack(check.reason);
    const eff = effectiveSkill(item);
    const query = queryAttack(ctx, u.id, eff, aim);
    if (!query.ok) return failAttack(query.reason, { query });
    const cost = item.actionCost || { main: 1, aux: 0 };
    resources.main -= cost.main || 0; resources.aux -= cost.aux || 0;
    u.ref.mp -= item.cost || 0; u.ref.hp -= item.hpCost || 0; u.ref.tp = (u.ref.tp || 0) - (item.tpCost || 0);
    notifyManaSpent(u, item.cost || 0);
    if (item.maxUses > 0) item.usesRemaining = Math.max(0, (item.usesRemaining ?? item.maxUses) - 1);
    else item.count = Math.max(0, (item.count || 0) - 1);
    const mcItem = CLASS_PASSIVES[u.classType]?.onSkillExecuted?.(u, item, false, passiveIo(u));
    if (mcItem && mcItem.multicast) addLog('🌟 ' + u.name + ' 的法力产生共鸣，引发了多重施法（获得额外主行动点）！');
    addLog(u.name + ' 使用 ' + item.name + (item.maxUses > 0 ? '（剩' + item.usesRemaining + '次）' : '（剩' + item.count + '）'));
    const summons = item.summonTarget ? spawnSummons(item, u, {}) : [];
    const slots = skillSlots(eff).map(s => Object.assign({}, s, { targetIds: (query.slotTargets || [])[s.index]?.targetIds || [] }));
    const canceled = { value: false };
    const bdg = { targetHit: {}, targetResolved: {}, debuffRolled: {} };
    const hits = []; const hitMap = new Map(); const effects = [];
    const incomingType = eff.damageType || '近战';
    const isAoE = ['直线', '扇形', '圆形', '全域', '爆炸'].includes(eff.range.type);
    let shotIdx = 0;
    for (const slot of sortSlotsForResolve(slots)) {
      if (canceled.value) break;
      const def = slot.definition;
      let targets = slot.target === 'self' || def.side === 'self' ? [u]
        : (slot.targetIds || []).map(id => byId.get(id)).filter(t => t && t.ref.hp > 0 && targetSideOk(def, t, u));
      for (const target of targets) {
        if (canceled.value) break;
        if (def.kind === 'attack') {
          shotIdx++;
          const seg = yield* resolveAttackSegment({ caster: u, target, slot, skill: eff, baseSkill: item, slotIndex: slot.index,
            segmentIndex: shotIdx, shotIndex: shotIdx, totalShots: slots.filter(s => s.attack).length, bdg, canceled, incomingType, isAoE, options });
          if (!seg) continue;
          const prev = hitMap.get(seg.targetId);
          if (!prev) { const rec = { targetId: seg.targetId, side: byId.get(seg.targetId).side, hit: seg.hit, hpDmg: seg.hpDmg, hpBefore: seg.hpBefore, hpAfter: seg.hpAfter, maxHp: byId.get(seg.targetId).ref.maxHp, down: seg.down, logIndex: seg.logIndex, logEnd: seg.logEnd, segments: [seg] }; if (seg.reaction) rec.reaction = seg.reaction; hits.push(rec); hitMap.set(seg.targetId, rec); }
          else { prev.hit = prev.hit || seg.hit; prev.hpDmg += seg.hpDmg; prev.hpAfter = seg.hpAfter; prev.down = seg.down; prev.segments.push(seg); }
        } else {
          let ok = true;
          if (def.debuff && !def.selfCost && !item.guaranteedHit) {
            if (bdg.targetResolved[target.id]) ok = bdg.targetHit[target.id] === true;
            else {
              const cStats = statsOf(u), tStats = statsOf(target);
              const roll = resolveHit({ hitBonus: cStats.hit }, { evasion: target.ref.evasion || 0, evaBonus: tStats.eva }, item, random);
              bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = roll.hit; ok = roll.hit;
            }
            if (!ok) { addLog('【' + slot.tag.replace(/\[|\]/g, '') + '】妨害落空'); continue; }
          }
          const applied = applyEffectSlot(rt, { caster: u, slot, targets: [target], skill: eff, skillKey: 'item:' + item.name });
          effects.push(...applied.applied);
        }
      }
    }
    const p = placementsById[u.id];
    p.facing = ((Math.atan2(aim.x - query.origin.x, -(aim.y - query.origin.y)) * 180 / Math.PI) + 360) % 360;
    return { ok: true, isItem: true, hits, effects, events: [], ammoEvents: [], summons: summons.map(s => s.id), query, casterId: u.id, item, aim: { ...aim }, canceled: canceled.value, logFrom, logTo: log.length };
  }
  function useItem(item, aim, options = {}) {
    const policy = options.policy || 'none';
    const gen = beginUseItem(item, aim, {
      suppressReactions: policy === 'none',
      autoAnswer: policy === 'auto' ? req => (req.candidates[0] ? { responderId: req.responderId, skill: req.candidates[0].skill } : null) : null,
    });
    let step = gen.next();
    while (!step.done) step = gen.next(null);
    return step.value;
  }

  // ---------- 预测（零掷骰）：槽目标/费用/弹药计划/效果预览 ----------
  function predictAttack(skill, aim) {
    const valid = canUseSkill(skill);
    if (!valid.ok) return { ok: false, reason: valid.reason };
    const eff = valid.eff || effectiveSkill(skill);
    const query = queryAttack(ctx, currentId(), eff, aim);
    if (!query.ok) return { ok: false, reason: query.reason };
    const u = actor();
    const slots = skillSlots(eff);
    const ammoBinds = itemBindingsFor(u, skill).filter(b => b.item.category === '弹药');
    const damageSlotCount = slots.filter(s => s.attack).length;
    const cost = skill.actionCost || { main: 1, aux: 0 };
    return {
      ok: true,
      slotTargets: query.slotTargets,
      costs: { main: valid.mainCost ?? cost.main, aux: valid.auxCost ?? cost.aux, mp: skill.cost || 0, hp: skill.hpCost || 0, tp: skill.tpCost || 0,
        usesLeft: usesLeft(u.id, skill), bindings: itemBindingsFor(u, skill).map(b => ({ item: b.item.name, cost: b.cost, enough: bindingStockOk(b) })),
        cooldownTurns: skill.cooldownTurns || 0, delay: skill.delay || 0, charge: skill.charge || 0 },
      ammoPlan: ammoBinds.map(b => ({ item: b.item.name, perShot: ammoQuotaForShot(b.cost, Math.max(1, damageSlotCount), 1), totalCost: b.cost, remaining: b.item.count || 0 })),
      effects: slots.map(s => ({ index: s.index, tag: s.tag, power: s.power, turns: s.turns, target: s.target, attack: s.attack, targetIds: (query.slotTargets || [])[s.index]?.targetIds || [] })),
      // 零掷骰伤害预估（roll=1 中值口径；实际结算带 0.8–1.2 随机）：每目标每攻击槽一条。
      // 护盾/免伤按批准口径在预测副本上逐槽累积消耗（多段不重复吃满盾）。
      damagePreview: (() => {
        const isAoE0 = ['直线', '扇形', '圆形', '全域', '爆炸'].includes(eff.range.type);
        const cStats = statsOf(u);
        const passive = CLASS_PASSIVES[u.classType] || null;
        const views = new Map(); // targetId → {def, shield}（逐槽消耗副本）
        const preview = [];
        for (const s of slots.filter(x => x.attack)) {
          for (const targetId of (query.slotTargets || [])[s.index]?.targetIds || []) {
            const target = byId.get(targetId);
            if (!target) continue;
            if (!views.has(targetId)) {
              const guard = buffsOf(targetId).find(b => b.type === 'damageGuard');
              views.set(targetId, { def: statsOf(target).def, shield: target.ref.shield || 0,
                guard: guard ? guard.value : 0, tStatsEva: statsOf(target).eva });
            }
            const view = views.get(targetId);
            const raw = computeSegmentRawDamage(cStats, u.ref.atk, s.power, 1, 1, {
              modifyDamageMultiplier: args => (passive && passive.modifyDamageMultiplier ? passive.modifyDamageMultiplier(args.caster, args.target, buffsOf(args.target.id), statsOf(args.caster), statsOf(args.target)) : 0),
              modifyDamageDealt: args => (passive && passive.modifyDamageDealt ? passive.modifyDamageDealt(args.caster, args.skill, statsOf(args.caster)) : 0),
            }, { caster: u, target, skill: eff });
            const afterResist = applyTypeResist(raw, eff.damageType || '近战', isAoE0, target, buffsOf(target.id));
            const isPierce = !!s.definition.pierce || !!(passive && passive.checkPierce && passive.checkPierce(u));
            const { hpDmg, shieldDmg } = calculateDamage(afterResist, view,
              { isPierce, armorMult: s.definition.scatter ? 3 : 1, hasDamageGuard: view.guard > 0, defending: isDefending(target) });
            if (view.guard > 0) view.guard = 0; // 免伤一次性
            if (shieldDmg > 0) view.shield = Math.max(0, view.shield - shieldDmg); // 预测副本逐槽消耗护盾
            preview.push({ targetId, slotIndex: s.index, raw, estimatedHpDmg: hpDmg,
              attackCap: Math.max(1, (eff.hit ?? 100) + cStats.hit), dodgeCap: Math.max(1, (target.ref.evasion || 0) + views.get(targetId).tStatsEva) });
          }
        }
        return preview;
      })(),
      damageFormula: { roll: '0.8–1.2', pierceSlots: slots.filter(s => s.definition.pierce).map(s => s.index), scatterArmorMult: 3 },
    };
  }

  // ---------- 防御姿态（原版 actionDefend：MP+20%、TP+25%、命中+30、持续100时间） ----------
  function defend() {
    const u = actor(), r = currentResources();
    if (!u || !r || state.combatState.clock?.terminal) return { ok: false, reason: '当前不能防御' };
    if (r.main < 1) return { ok: false, reason: '主行动已用完' };
    r.main -= 1;
    u.ref.mp = Math.min(u.ref.maxMp, u.ref.mp + Math.floor(u.ref.maxMp * 0.2));
    u.ref.tp = Math.min(u.ref.maxTp || 100, (u.ref.tp || 0) + Math.floor((u.ref.maxTp || 100) * 0.25));
    const source = statusSource(u.id, { casterId: u.id, skillId: 'defend' }, 'defend');
    registerBuff(u, { type: 'defend', value: 0, duration: 1, sourceKey: 'defend' }, source);
    registerBuff(u, { type: 'hit', value: 30, duration: 1, sourceKey: 'defend:hit' }, statusSource(u.id, { casterId: u.id, skillId: 'defend' }, 'defend:hit'));
    addLog(u.name + ' 采取防卫姿态，回防聚气！（MP+' + Math.floor(u.ref.maxMp * 0.2) + ' TP+' + Math.floor((u.ref.maxTp || 100) * 0.25) + '）');
    return { ok: true, unitId: u.id };
  }

  function advancePreparation() {
    const u = actor(), charge = u && chargeState(u.id);
    if (!u || !charge.preparing || charge.preparing.remaining <= 0 || !resources) return { ok: false, reason: '当前没有待准备技能' };
    const inventory = Math.min(charge.inventory, charge.preparing.remaining);
    charge.inventory -= inventory;
    charge.preparing.remaining -= inventory;
    charge.preparing.invested += inventory;
    const amount = Math.min(resources.main, charge.preparing.remaining);
    if (!amount && !inventory) return { ok: false, reason: '主行动不足' };
    resources.main -= amount;
    charge.preparing.remaining -= amount;
    charge.preparing.invested += amount;
    charge.preparing.ready = charge.preparing.remaining <= 0;
    addLog(u.name + ' 投入 ' + amount + ' 主行动准备 ' + charge.preparing.skill.name + ' · 剩余 ' + charge.preparing.remaining);
    return { ok: true, invested: amount, remaining: charge.preparing.remaining, ready: charge.preparing.ready };
  }

  function cancelPreparation(unitId = currentId()) {
    const charge = state.combatState.charges?.[unitId];
    if (!charge?.preparing) return { ok: false, reason: '当前没有待取消准备' };
    const name = charge.preparing.skill.name;
    charge.preparing = null;
    addLog(byId.get(unitId).name + ' 取消' + (charge.preparing ? '' : '') + '准备 ' + name + '（已付资源不退）');
    return { ok: true };
  }

  function endAction() {
    const id = currentId();
    if (!id || state.combatState.clock.terminal) return snapshot();
    const charge = state.combatState.charges?.[id];
    if (charge?.preparing?.ready) cancelPreparation(id);
    dispatchClock(state, { type: 'endAction', unitId: id });
    return advance();
  }

  function enemySkills() {
    const u = actor();
    return u.skills.filter(s => skillStatus(s).ok).concat(BASIC_ATTACK);
  }
  function isAiControlled(u) { return !!(u && (u.controller || (u.side === 'enemy' ? 'ai' : 'player')) === 'ai'); }
  function planEnemyAction() {
    if (!actor() || !isAiControlled(actor()) || state.combatState.clock.terminal || !resources) return null;
    return chooseEnemyAction(ctx, currentId(), resources.moveRemaining, enemySkills(), skill => skillStatus(skill));
  }
  function runEnemyTurn() {
    if (!actor() || !isAiControlled(actor()) || state.combatState.clock.terminal) return snapshot();
    const choice = planEnemyAction();
    if (choice.moveTo) move(choice.moveTo.col, choice.moveTo.row);
    if (choice.skill && resources.main > 0) attack(choice.skill, choice.aim);
    return endAction();
  }

  function reset() {
    // 召唤物退场（本战斗基线不含召唤）：单位/占位/足迹/时钟记录一并移除
    for (const u of units.filter(x => x.isSummon)) {
      byId.delete(u.id); delete placementsById[u.id]; delete ctx.footprintsById[u.id];
      ctx.carriedUnitIds.delete(u.id);
    }
    for (let i = units.length - 1; i >= 0; i--) if (units[i].isSummon) units.splice(i, 1);
    // 资源/物品/职业开场派生（盾）回到开场基线
    for (const rec of opening.resources) {
      const u = byId.get(rec.id);
      if (!u) continue;
      u.ref.hp = rec.hp; u.ref.mp = rec.mp; u.ref.tp = rec.tp; u.ref.shield = rec.shield;
      u.ref.hasTriggeredGrit = false; u.ref.hasTriggeredAvoidFatal = false; u.ref.variantReviveUsed = false;
      delete u.ref.molted; delete u.ref.linked; delete u.ref.stealthCycleProcessed; // 敌方变种/隐匿阈值一次性标记随战斗重置（原版 L25206）
    }
    for (const rec of opening.items) {
      const u = byId.get(rec.id);
      if (!u || !u.items) continue;
      for (const snap of rec.items) {
        const it = u.items.find(x => x.name === snap.name);
        if (it) { it.count = snap.count; it.usesRemaining = snap.usesRemaining; }
      }
    }
    for (const id of Object.keys(placementsById)) Object.assign(placementsById[id], opening.positions[id]);
    Object.assign(state, emptyBattleState(state.sceneId, state.battleId));
    resources = null; log = []; actionSerial = 0;
    return start();
  }

  return { ctx, battleState: state, get state() { return state; }, start, snapshot, reachable, previewMove, move, sprint, previewJump, jump, push, previewCarry, carry, drop, previewDisplacement,
    setVisibleUnitIds(ids) { visibleIds = ids ? ids.slice() : null; },
    canUseSkill, skillStatus, canUseReaction, canUseItem, itemSkill: itemAsSkill, advancePreparation, cancelPreparation,
    previewAttack, beginAttack, attack, beginUseItem, useItem, predictAttack, defend,
    getEffectiveUnit, statsOf, buffsOf,
    endAction, planEnemyAction, runEnemyTurn, reset };
}
