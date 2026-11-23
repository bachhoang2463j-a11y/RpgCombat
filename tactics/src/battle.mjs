// ==========================================
// 战斗控制器（FX02 规则内核）：消费 P03 自然行动，空间查询/扣费/伤害共用一条命令链。
// HP/MP 真值仅在角色 ref；时钟与位置可保存，实时资源和本轮余额不写长期档。
// 规则来源：原版 index.html 与 doc/tactics/TYPICAL-BATTLE-CONTRACT.md。
// beginAttack / beginUseItem / beginEnemyTurn 使用可暂停反应的生成器；UI 不参与规则计算。
// ==========================================

import { createClock, dispatchClock, advanceToNextAction } from './clock.mjs';
import { emptyBattleState } from './lifecycle.mjs';
import { compileScene } from './scene.mjs';
import { findReachable, findJumpPath, canPlaceAt, traceDisplacement, cellsAdjacent, chargePath } from './movement.mjs';
import { unitCenter, occupiedCells } from './geometry.mjs';
import { fogAt, createFogRegion, expireRegions } from './regions.mjs';
import { canSeeUnit, visibleUnitIds as queryVisibleUnitIds } from './perception.mjs';
import { previewBarrier, createBarrier, interception, damageBarrier } from './barriers.mjs';
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

function skillKey(skill) { return (skill.parentItemName || skill.parentName ? (skill.parentItemName || skill.parentName) + '\u0000' : '') + skill.name; }
function usedCount(state, unitId, key) { return state.perBattleUses?.[unitId]?.[key] || 0; }

// 物品 → 技能形态（规范 range/slots/isItem，供 attackPreview / aim 复用；不回写原物品）
export function itemAsSkill(item, child = null) {
  if (!item || !item.isItem) return null;
  const selected = child ? Object.assign({}, child, { isItem: true, parentItemName: item.name }) : item;
  if (selected.range) return selected;
  const range = resolveDefaultRange(selected);
  if (!range) return selected;
  const view = Object.assign({}, selected, { range });
  Object.defineProperty(view, '_itemSource', { value: item });
  return view;
}

// 技能可用性（结构级）：反应与死亡技能不可主动使用；召唤词条由运行时 provider 校验。
export function skillSupport(skill) {
  if (!skill || !skill.range || !['单体', '直线', '扇形', '圆形', '全域', '爆炸', '自身', '召唤'].includes(skill.range.type)) return { ok: false, reason: '缺少显式范围或范围未迁移' };
  if (skill.isReaction || skill.sheshenTarget || skill.kanpoTarget) return { ok: false, reason: '反应技能只能被动触发' };
  if (skill.isDeathTrigger || skill.trigger === 'death') return { ok: false, reason: '死亡事件技能不可主动施放' };
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
    flags: units.map(u => ({ id: u.id, ref: structuredClone(u.ref) })),
  };
  let resources = null;
  let visibleIds = visibleUnitIds ? visibleUnitIds.slice() : null;
  const ctx = {
    compiled: compileScene(scene), units, placementsById,
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])), carriedUnitIds: new Set(),
    get visibleUnitIds() { return visibleIds; },
    regions: state.combatState.regions || (state.combatState.regions = []),
    barriers: state.combatState.barriers || (state.combatState.barriers = []),
    now: () => state.combatState.clock?.now || 0,
    enforcePerception: units.every(u => Number.isFinite(u.ref.perception)),
    buffsOf,
    canSeeUnit(observerId, targetId) { return canSeeUnit(this, observerId, targetId); },
  };
  let log = [];
  let domainEvents = [];
  let attackSerial = 0;
  const attackStack = [];
  let actionSerial = 0;
  let summonSerial = 0;
  const byId = new Map(units.map(u => [u.id, u]));
  const currentId = () => state.combatState.clock?.currentAction?.unitId || null;
  const actor = () => byId.get(currentId());

  function dispatchBattleClock(command, rulesContext = {}) {
    const wasCurrent = currentId() === command.unitId;
    const result = dispatchClock(state, command, rulesContext);
    if (command.type === 'exitUnit' && wasCurrent) resources = null;
    if (command.type === 'grantMainPoint' && result.events?.some(ev => ev.immediate) && currentId() === command.targetId) {
      state.combatState.clock.currentAction.resources.main += 1;
    }
    if (command.type === 'exitUnit' && state.combatState.charges?.[command.unitId]) {
      state.combatState.charges[command.unitId].preparing = null;
    }
    return result;
  }
  function addLog(text) { log.push(text); }
  function emit(type, fields = {}) {
    const event = { seq: domainEvents.length + 1, at: ctx.now(), type, ...fields };
    domainEvents.push(event);
    return event;
  }
  function currentAttackId() { return attackStack[attackStack.length - 1]?.id || null; }
  function openAttack(caster, skill) {
    const attack = { id: 'attack:' + (++attackSerial), casterId: caster.id, skillKey: skillKey(skill) };
    attackStack.push(attack);
    emit('attack-start', { ...attack, attackId: attack.id });
    return attack;
  }
  function closeAttack(attack) {
    for (const target of units) {
      buffsOf(target.id).filter(b => b.type === 'damageGuard' && b.attackId === attack.id).forEach(b => removeBuffRecord(target.id, b));
    }
    attackStack.splice(attackStack.indexOf(attack), 1);
    emit('attack-end', { ...attack, attackId: attack.id });
  }
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
    const eventSkill = (enemy.skills || []).find(s => s.isDeathTrigger);
    const tag = (enemy.attrTags || []).find(t => /^\[自爆:/.test(String(t))) || eventSkill?.deathTag || '';
    const m = tag.match(/^\[自爆:([^\];]+?)(?:;power:(\d+))?\]$/);
    if (!m) return;
    const sub = m[1], power = m[2] ? parseInt(m[2]) : 50;
    addLog('☠️ ' + enemy.name + ' 触发【自爆·' + sub + '】！（威力 ' + power + '）');
    const boomSkill = { name: '自爆·' + sub, hit: 100, cost: 0, damageType: '法术', type: sub === '群火' ? '[群燃烧]' : sub === '群毒' ? '[群中毒]' : sub === '群穿' ? '[群穿透]' : '[群攻]' };
    const eStats = statsOf(enemy);
    const radius = eventSkill?.range?.radius ?? 3;
    const area = queryAttack({ ...ctx, units: ctx.units.map(u => u.id === enemy.id ? { ...u, ref: { ...u.ref, hp: 1 } } : u) }, enemy.id,
      { type: '[伤害]', power, range: { type: '圆形', radius } });
    for (const hero of units.filter(x => x.side !== enemy.side && x.ref.hp > 0 && area.actualTargetIds.includes(x.id))) {
      if (interception(ctx, enemy.id, hero.id)) continue;
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
  function statsOf(unit) {
    const stats = getEffectiveStats(unit, buffsOf(unit.id));
    stats.hit -= fogAt(ctx, unit.id).strength;
    return stats;
  }
  function moveDistanceOf(unit) {
    const flying = buffsOf(unit.id).some(b => b.type === 'variant' && b.variant === '飞行') || unit.ref.flying;
    return unit.ref.moveDistance * (flying ? 1.5 : 1);
  }
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
    registerBuff(target, { type: kind, value: strength, duration: turns }, source);
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
    addLog, random, currentAttackId, emit,
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
      const removed = expireRegions(ctx, ev.t ?? ctx.now());
      removed.forEach(region => emit('region-expired', { regionId: region.id }));
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
    const enemiesAlive = units.some(u => u.side === 'enemy' && u.ref.hp > 0);
    const type = !heroesAlive ? 'defeat' : !enemiesAlive ? 'victory' : null;
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
        resources.moveRemaining = moveDistanceOf(u) * resources.moveQuota;
        resources.moveMultiplier = 1;
        resources.jumped = false;
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
      if (resources.moveRemaining === undefined) resources.moveRemaining = moveDistanceOf(u) * r.moveQuota;
      if (resources.moveMultiplier === undefined) resources.moveMultiplier = 1;
      actionSerial++;
      return snapshot();
    }
    return advance();
  }

  function snapshot(viewerId = null) {
    const clock = state.combatState.clock;
    const visible = viewerId ? new Set(queryVisibleUnitIds(ctx, viewerId)) : null;
    const viewer = viewerId ? byId.get(viewerId) : null;
    const shownUnits = visible ? units.filter(u => u.side === viewer.side || visible.has(u.id)) : units;
    const showCurrent = !visible || !currentId() || visible.has(currentId()) || byId.get(currentId())?.side === viewer.side;
    return {
      now: clock?.now || 0, currentId: showCurrent ? currentId() : null, actionSerial, resources: resources && showCurrent ? { moveRemaining: resources.moveRemaining, sprintRemaining: resources.sprintRemaining || 0, main: resources.main, aux: resources.aux, moveMultiplier: resources.moveMultiplier || 1, jumped: !!resources.jumped, jumpDistance: Math.ceil(actor().ref.moveDistance / 3) } : null,
      terminal: clock?.terminal ? { ...clock.terminal } : null,
      preparation: showCurrent && clock?.currentAction ? structuredClone(state.combatState.charges?.[clock.currentAction.unitId]?.preparing || null) : null,
      chargeInventory: showCurrent && clock?.currentAction ? (state.combatState.charges?.[clock.currentAction.unitId]?.inventory || 0) : 0,
      units: shownUnits.map(u => {
        const st = statsOf(u);
        return { id: u.id, name: u.name, side: u.side, controller: u.controller || (u.side === 'hero' ? 'player' : 'ai'),
          hp: u.ref.hp, mp: u.ref.mp, tp: u.ref.tp || 0, status: u.ref.hp > 0 ? 'active' : u.side === 'hero' ? 'down' : 'dead',
          atk: st.atk, def: st.def, hit: st.hit, eva: st.eva, taunt: st.taunt, spd: st.spd, shield: u.ref.shield || 0,
          buffs: buffsOf(u.id).map(b => ({ type: b.type, value: b.value, variant: b.variant || null, duration: Number.isFinite(b.duration) ? b.duration : null, isConsumable: !!b.isConsumable })) };
      }),
      carrying: structuredClone(state.combatState.carrying || {}),
      positions: structuredClone(visible ? Object.fromEntries(shownUnits.map(u => [u.id, placementsById[u.id]])) : placementsById),
      regions: structuredClone(ctx.regions), barriers: structuredClone(ctx.barriers),
      events: viewerId ? [] : structuredClone(domainEvents), log: viewerId ? [] : log.slice(),
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
      moveDistance: u.ref.moveDistance, effectiveMoveDistance: moveDistanceOf(u), jumpDistance: Math.ceil(u.ref.moveDistance / 3),
      perception: u.ref.perception, footprint: { ...u.footprint },
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
    let cell = previewMove(col, row);
    if (!cell || cell.cost === 0) return { ok: false, reason: '落点不可达' };
    const p = placementsById[currentId()];
    const from = { col: p.col, row: p.row, facing: p.facing };
    const seen = new Set(queryVisibleUnitIds(ctx, currentId()));
    let stoppedOnDiscovery = false;
    let cost = 0;
    const path = [cell.path[0]];
    for (const next of cell.path.slice(1)) {
      const previous = path[path.length - 1];
      cost += Math.hypot(next.col - previous.col, next.row - previous.row) * ((state.combatState.carrying || {})[currentId()] ? 2 : 1);
      p.col = next.col; p.row = next.row; path.push(next);
      if (ctx.enforcePerception && units.some(u => u.side !== actor().side && u.ref.hp > 0 && !seen.has(u.id) && canSeeUnit(ctx, currentId(), u.id))) {
        if (canPlaceAt(ctx, currentId(), next.col, next.row).ok) { stoppedOnDiscovery = true; break; }
      }
    }
    col = p.col; row = p.row;
    cell = { ...cell, col, row, cost, path };
    const last = path[path.length - 2] || from;
    p.facing = ((Math.atan2(col - last.col, -(row - last.row)) * 180 / Math.PI) + 360) % 360;
    const multiplier = resources.moveMultiplier || 1;
    const travel = cell.cost / multiplier;
    const before = resources.moveRemaining;
    resources.moveRemaining = Math.max(0, resources.moveRemaining - travel);
    if (resources.sprintRemaining) resources.sprintRemaining = Math.max(0, resources.sprintRemaining - travel);
    emit('unit-moved', { unitId: currentId(), from, to: { col, row }, path: cell.path, distance: travel, stoppedOnDiscovery });
    addLog(actor().name + ' 移动 ' + travel.toFixed(2) + 'm');
    return { ok: true, stoppedOnDiscovery, cell: { ...cell, cost: travel, budgetCost: cell.cost }, from, unitId: currentId(), moveBefore: before, moveAfter: resources.moveRemaining };
  }
  function sprint() {
    if (!resources || resources.main < 1) return { ok: false, reason: '主行动已用完' };
    resources.main--;
    resources.moveRemaining += moveDistanceOf(actor());
    resources.moveMultiplier = 1;
    resources.sprintRemaining = (resources.sprintRemaining || 0) + moveDistanceOf(actor());
    addLog(actor().name + ' 冲刺，移动额度 +' + moveDistanceOf(actor()) + 'm');
    return { ok: true, moveRemaining: resources.moveRemaining, sprintRemaining: resources.sprintRemaining };
  }
  function previewJump(col, row) {
    const u = actor();
    if (!u || !resources || resources.aux < 1) return { ok: false, reason: '辅助行动不足' };
    if (resources.jumped) return { ok: false, reason: '本次自然行动已经跳跃' };
    const maxDistance = Math.ceil(u.ref.moveDistance / 3);
    return findJumpPath(ctx, u.id, col, row, maxDistance);
  }
  function jump(col, row) {
    const q = previewJump(col, row);
    if (!q.ok) return q;
    const p = placementsById[currentId()];
    const from = { col: p.col, row: p.row, facing: p.facing };
    const last = q.path[q.path.length - 2] || p;
    p.facing = ((Math.atan2(col - last.col, -(row - last.row)) * 180 / Math.PI) + 360) % 360;
    p.col = col; p.row = row;
    resources.aux--;
    resources.jumped = true;
    emit('unit-jumped', { unitId: currentId(), from, to: { col, row }, distance: q.distance });
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
    if (traced.blockedBy && remaining > 1e-9) {
      const view = { ...target.ref, def: statsOf(target).def };
      collision = applyCollisionDamage(remaining * 10, view);
      target.ref.hp = view.hp; target.ref.shield = view.shield;
    }
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
    let eff = skill.range ? skill : Object.assign({}, skill, { range: resolveDefaultRange(skill) });
    if (skill.summonTarget && summonProvider) {
      const spec = parseSummonSpecs(skill.summonTarget)[0];
      const data = spec && summonProvider(spec.name, spec.tags);
      if (data) eff = Object.assign({}, eff, { summonFootprint: data.footprint });
    }
    if (skill.summonTarget && (skill.range?.type !== '召唤')) eff = Object.assign({}, eff, { range: { type: '召唤', castRange: skill.range?.castRange ?? 8 } });
    return eff;
  }

  function parentItemFor(unit, skill) {
    if (skill.parentItemName) return (unit.items || []).find(it => it.name === skill.parentItemName);
    return skill.isItem ? (unit.items || []).find(it => it.name === skill.name) || skill._itemSource || skill : null;
  }
  function itemStockStatus(unit, skill) {
    const item = parentItemFor(unit, skill);
    if (!item) return skill.parentItemName ? { ok: false, reason: '父道具不在场' } : { ok: true };
    if (item._sbMissing) return { ok: false, reason: '道具不在场' };
    if (item.maxUses > 0 && item.usesRemaining <= 0) return { ok: false, reason: '物品次数已用完' };
    if (!(item.maxUses > 0) && !(item.count > 0)) return { ok: false, reason: '物品数量不足' };
    return { ok: true };
  }
  function consumeParentItem(unit, skill, costSummary) {
    const item = parentItemFor(unit, skill);
    if (!item) return;
    if (item.maxUses > 0) item.usesRemaining--;
    else item.count--;
    costSummary.item = { name: item.name, remaining: item.maxUses > 0 ? item.usesRemaining : item.count };
    emit('item-consumed', { unitId: unit.id, ...costSummary.item });
  }
  function canUseSkill(skill) {
    const u = actor(), r = currentResources();
    if (!u || !r || state.combatState.clock?.terminal) return { ok: false, reason: '当前不能使用技能' };
    const support = skillSupport(effectiveSkill(skill));
    if (!support.ok) return support;
    if (skill.summonTarget && !summonProvider) return { ok: false, reason: '召唤词条缺失：未接入 summonProvider，无法召唤「' + String(skill.summonTarget) + '」' };
    if (skill.summonTarget && summonProvider) {
      const missing = parseSummonSpecs(skill.summonTarget).filter(spec => !summonProvider(spec.name, spec.tags)).map(spec => spec.name);
      if (missing.length) return { ok: false, reason: '召唤词条缺失：' + missing.join('、') + '（名册/图鉴查无此词条）' };
    }
    const eff = effectiveSkill(skill);
    const key = skillKey(skill), cost = skill.actionCost || { main: 1, aux: 0 };
    const charge = chargeState(u.id), preparing = charge.preparing && charge.preparing.skillKey === key;
    if (skill.isItem && skill.children?.length) return { ok: false, reason: '请选择道具子用法' };
    if (!preparing) {
      const stock = itemStockStatus(u, skill);
      if (!stock.ok) return stock;
    }
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
    if (!preparing && !hasEnoughBindings(u, skill)) return { ok: false, reason: '绑定物品存量不足' };
    const ready = preparing && charge.preparing.remaining <= 0;
    if (preparing && !ready) return { ok: false, reason: '准备尚未就绪，请继续准备' };
    if ((skill.charge > 0 || skill.delay > 0) && charge.preparing && !preparing) return { ok: false, reason: '请先释放或取消当前准备' };
    const prepSkill = skill.charge > 0 || skill.delay > 0;
    const mainCost = prepSkill ? (preparing ? (ready ? 0 : 1) : 1) : (cost.main || 0);
    const auxCost = prepSkill ? 0 : (cost.aux || 0);
    if (r.main < mainCost || r.aux < auxCost) return { ok: false, reason: r.main < mainCost ? '主行动已用完' : '辅助行动已用完' };
    if (u.ref.mp < (preparing ? 0 : (skill.cost || 0)) || u.ref.hp <= (preparing ? 0 : (skill.hpCost || 0)) || (u.ref.tp || 0) < (preparing ? 0 : (skill.tpCost || 0))) return { ok: false, reason: '数值资源不足' };
    return { ok: true, eff: effectiveSkill(skill), preparing: !!preparing, ready, mainCost, auxCost };
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
    if (eff.summonTarget) {
      const planned = summonPlacements(eff, currentId(), query);
      if (!planned.ok) return { ...query, ...planned };
      query.summonPlacements = planned.placements;
    }
    const caster = actor();
    for (const slot of query.slotTargets || []) {
      const def = effectDefinition(slot.tag);
      if (!def) return { ...query, ok: false, reason: '效果尚未迁移：' + slot.tag };
      if (def.kind === 'barrier') {
        const check = previewBarrier(ctx, caster.id, eff, query);
        if (!check.ok) return { ...query, ...check };
      }
    }
    if (!eff.summonTarget && !eff.barrierSub && !eff.regionEffect && !query.slotTargets.some(s => s.targetIds.length > 0)) {
      return { ...query, ok: false, reason: '范围内没有合法目标' };
    }
    return query;
  }
  function targetSideOk(def, target, caster, skill = null) {
    if (!target) return false;
    if (def.side === 'self') return target.id === caster.id;
    if (skill?.affectsAll) return true;
    if (def.side === 'enemy') return target.side !== caster.side;
    return target.side === caster.side;
  }

  // ---------- 反应链 ----------
  // incomingType：来袭技能的伤害类型；反应按来袭技能匹配（不按来源单位 damageType）
  function canUseReaction(responder, skill, sourceId, incomingType = null) {
    const source = byId.get(sourceId);
    if (!responder || !source || !skill || responder.ref.hp <= 0 || source.ref.hp <= 0) return { ok: false, reason: '反应技能不可用' };
    if (skill.reactionSource && ctx.enforcePerception && !canSeeUnit(ctx, responder.id, source.id)) return { ok: false, reason: '无法看见攻击来源' };
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
  function reactionSupportFor(skill, incomingType, isAttack) {
    if (skill.kanpoTarget && skill.kanpoTarget !== 'all' && skill.kanpoTarget !== incomingType) return false;
    if (skill.sheshenTarget && (!isAttack || skill.sheshenTarget !== 'all' && skill.sheshenTarget !== incomingType)) return false;
    if (skill.isReaction && skill.reactionTarget && skill.reactionTarget !== 'all' && skill.reactionTarget !== incomingType) return false;
    if (!isAttack && skillSlots(skill).some(s => s.definition.kind === 'damageGuard' || s.definition.kind === 'shield')) return false;
    return true;
  }
  function collectReactionCandidates(target, incomingSkill, incomingType, sourceId, isAttack = true, allowGuardian = true) {
    const out = [];
    for (const s of (target.skills || [])) {
      if ((!s.isReaction && !s.kanpoTarget) || s.sheshenTarget || !reactionSupportFor(s, incomingType, isAttack)) continue;
      if (canUseReaction(target, s, sourceId, incomingType).ok) out.push({ skill: s, responderId: target.id });
    }
    if (allowGuardian && isAttack && incomingSkill.range.type === '单体' && !target.isSummon) {
      for (const guardian of units.filter(u => u.side === target.side && u.id !== target.id && u.ref.hp > 0 && !u.isSummon)) {
        for (const skill of guardian.skills || []) {
          if (!skill.sheshenTarget || !reactionSupportFor(skill, incomingType, true)) continue;
          const key = skillKey(skill);
          if (usesLeft(guardian.id, skill) <= 0 || skillCooldownAt(guardian.id, key) > ctx.now() || !hasEnoughBindings(guardian, skill)) continue;
          if (guardian.ref.mp < (skill.cost || 0) || guardian.ref.hp <= (skill.hpCost || 0) || (guardian.ref.tp || 0) < (skill.tpCost || 0)) continue;
          const g = unitCenter(placementsById[guardian.id], guardian.footprint), t = unitCenter(placementsById[target.id], target.footprint);
          if (Math.hypot(g.x - t.x, g.y - t.y) > (skill.range.castRange ?? 2) || !canSeeUnit(ctx, guardian.id, target.id)) continue;
          out.push({ skill, responderId: guardian.id, guardian: true });
        }
      }
    }
    return out;
  }
  function* selectReaction(target, caster, skill, incomingType, options, segment = {}, isAttack = true, allowGuardian = true) {
    const candidates = collectReactionCandidates(target, skill, incomingType, caster.id, isAttack, allowGuardian);
    if (!candidates.length || options.suppressReactions) return null;
    const request = { type: 'reaction', attackId: currentAttackId(), responderId: target.id, casterId: caster.id, skill, incomingType,
      candidates: candidates.map(c => ({ ...c, usesLeft: usesLeft(c.responderId, c.skill), cost: c.skill.cost || 0 })), ...segment };
    emit('reaction-request', { attackId: currentAttackId(), targetId: target.id, slotIndex: segment.slotIndex });
    let choice;
    if (options.autoAnswer) choice = options.autoAnswer(request);
    else if ((target.controller || (target.side === 'hero' ? 'player' : 'ai')) === 'ai') choice = { responderId: candidates[0].responderId, skill: candidates[0].skill };
    else choice = yield request;
    const selected = candidates.find(c => c.skill === choice?.skill && c.responderId === (choice.responderId || target.id));
    if (!selected) return null;
    const responder = byId.get(selected.responderId);
    const rr = executeReaction(responder, selected.skill, caster, skill);
    return { responderId: responder.id, skillName: selected.skill.name, fxTag: selected.skill.fxTag || null,
      canceled: !!rr.canceled, dodged: !!rr.dodged, shift: rr.shift || null, countered: !!rr.countered,
      guardianId: selected.guardian ? responder.id : null };
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
    if (rskill.cooldownTurns > 0) dispatchClock(state, { type: 'applyCooldown', unitId: responder.id, skillKey: key, duration: rskill.cooldownTurns * ROUND_TIME });
    emit('reaction-used', { attackId: currentAttackId(), responderId: responder.id, skillName: rskill.name,
      costs: { mp: rskill.cost || 0, hp: rskill.hpCost || 0, tp: rskill.tpCost || 0 }, usesLeft: usesLeft(responder.id, rskill) });
    addLog(responder.name + ' 反应 · ' + rskill.name);
    // 看破：整个来袭技能被无效化（先于其它槽位）
    if (rskill.kanpoTarget) {
        if (rskill.reactionSource) {
          const sourceSlot = skillSlots(rskill).filter(s => s.definition.kind === 'drainMp');
          for (const slot of sourceSlot) applyEffectSlot(rt, { caster: responder, slot, targets: [attacker], skill: rskill, skillKey: key });
        }
      addLog('⛔ ' + responder.name + ' 施展【' + rskill.name + '】看穿了敌方气路，【' + incomingSkill.name + '】被彻底无效化！');
      return { ok: true, canceled: true, dodged: false, shift: null };
    }
    const slots = skillSlots(effectiveSkill(rskill));
    const selfTargets = slots.filter(s => s.target === 'self' || s.definition.side === 'self' || s.definition.side === 'ally' || s.definition.side === 'default')
      .map(s => ({ slot: s, targets: [responder] }));
    for (const { slot, targets } of selfTargets) {
      if (slot.attack) continue; // 反击槽不走 applyEffectSlot
      if (slot.definition.kind === 'counter') continue;
      applyEffectSlot(rt, { caster: responder, slot, targets, skill: rskill, skillKey: key });
    }
    // 二次闪避判定：抛弃基础速度，纯看本次反应新增的回避值（原版 L23281）
    const evaSlot = slots.find(s => s.definition.field === 'eva');
    if (evaSlot) {
      const pureEva = Math.max(1, evaSlot.power);
      const cStats = statsOf(attacker);
      const attackCap = Math.max(1, (incomingSkill.hit ?? 100) + cStats.hit);
      const dodged = Math.floor(random() * pureEva) + 1 > Math.floor(random() * attackCap) + 1;
      if (evaSlot.definition.consumable) {
        const rec = buffsOf(responder.id).find(b => b.type === 'eva' && b.isConsumable && b._source?.skillId === key);
        if (rec) removeBuffRecord(responder.id, rec);
      }
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
      const counterReflection = interception(ctx, defender.id, attacker.id);
      if (counterReflection) {
        damageBarrier(ctx, counterReflection.id, raw, { incomingType: '近战' });
        return { hpDmg: 0, shieldDmg: 0, barrierId: counterReflection.id };
      }
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
      const counterReflection = interception(ctx, defender.id, attacker.id);
      if (counterReflection) {
        damageBarrier(ctx, counterReflection.id, raw, { incomingType: '近战' });
        return { hpDmg: 0, shieldDmg: 0, barrierId: counterReflection.id };
      }
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

  function summonPlacements(skill, casterId, query) {
    const desired = query.summonPlacement || query.summon?.anchor || { col: Math.floor(query.aim.x), row: Math.floor(query.aim.y) };
    const probe = { ...ctx, units: ctx.units.slice(), footprintsById: { ...ctx.footprintsById }, placementsById: { ...placementsById } };
    const placements = [];
    for (const spec of parseSummonSpecs(skill.summonTarget)) {
      for (let i = 0; i < spec.count; i++) {
        const data = summonProvider(spec.name, spec.tags);
        const id = 'summon-preview:' + placements.length;
        probe.units.push({ id, side: byId.get(casterId).side, footprint: data.footprint, ref: { hp: data.hp ?? data.maxHp } });
        probe.footprintsById[id] = data.footprint || { width: 1, height: 1 };
        const candidates = [];
        for (let row = 0; row < ctx.compiled.grid.rows; row++) for (let col = 0; col < ctx.compiled.grid.columns; col++) {
          candidates.push({ col, row, distance: Math.hypot(col - desired.col, row - desired.row) });
        }
        candidates.sort((a, b) => a.distance - b.distance || a.row - b.row || a.col - b.col);
        const selected = candidates.find(p => queryAttack(probe, casterId, { ...effectiveSkill(skill), summonFootprint: probe.footprintsById[id] }, { x: p.col + 0.5, y: p.row + 0.5 }).ok);
        if (!selected) return { ok: false, reason: '没有能容纳全部召唤物的合法空位' };
        probe.placementsById[id] = { col: selected.col, row: selected.row };
        placements.push(probe.placementsById[id]);
      }
    }
    return { ok: true, placements };
  }

  // ---------- 召唤：词条与落点在扣费前确定，入场不刷新资源 ----------
  function spawnSummons(skill, caster, result, query) {
    const created = [];
    const specs = parseSummonSpecs(skill.summonTarget);
    for (const spec of specs) {
      for (let i = 0; i < spec.count; i++) {
        const data = summonProvider(spec.name, spec.tags);
        const id = 'sum_' + (++summonSerial) + '_' + spec.name;
        const unit = {
          id, name: data.name || spec.name, side: caster.side, controller: 'ai',
          isSummon: true, summonOwnerId: caster.id, classType: data.classType || null,
          attrTags: [...new Set([...(data.attrTags || []), ...spec.tags])],
          footprint: data.footprint || { width: 1, height: 1 },
          ref: Object.assign({ hp: data.hp ?? data.maxHp, maxHp: data.maxHp, mp: data.mp ?? data.maxMp, maxMp: data.maxMp,
            tp: 0, maxTp: data.maxTp ?? 100, atk: data.atk, def: data.def, spd: data.spd,
            evasion: data.evasion, strength: data.strength, totalWeight: data.totalWeight,
            moveDistance: data.moveDistance, perception: data.perception, shield: 0, reviveCount: data.reviveCount || 0,
            resistMap: data.resistMap || null }, structuredClone(data.extraRef || {})),
          skills: structuredClone(data.skills || []), items: structuredClone(data.items || []),
        };
        if (!Number.isFinite(unit.ref.perception)) unit.ref.perception = 50;
        if (!Number.isFinite(unit.ref.moveDistance)) unit.ref.moveDistance = 6;
        units.push(unit); byId.set(id, unit); ctx.footprintsById[id] = unit.footprint;
        const selected = query.summonPlacements?.[created.length] || query.summonPlacement || query.summon?.anchor || { col: Math.floor(query.aim.x), row: Math.floor(query.aim.y) };
        placementsById[id] = { ...selected, facing: placementsById[caster.id].facing };
        dispatchBattleClock({ type: 'registerUnit', unit: { id, side: unit.side, name: unit.name, baseSpd: unit.ref.spd } });
        emit('unit-summoned', { unitId: id, casterId: caster.id, placement: { ...placementsById[id] } });
        addLog(caster.name + ' 召唤了 ' + unit.name);
        created.push(unit);
      }
    }
    result.summons = created.map(u => u.id);
    return created;
  }

  function displacement(caster, target, rule, query, direction = null) {
    const p = placementsById[target.id];
    const from = { col: p.col, row: p.row, facing: p.facing };
    const tc = unitCenter(p, target.footprint);
    const origin = rule.direction === '爆心向外' ? (query.blastCenter || query.origin) : unitCenter(placementsById[caster.id], caster.footprint);
    const vector = direction || { x: tc.x - origin.x, y: tc.y - origin.y };
    const reverse = rule.type === '拉近' ? -1 : 1;
    const angle = Math.round(Math.atan2(vector.y * reverse, vector.x * reverse) / (Math.PI / 4)) * Math.PI / 4;
    const traced = traceDisplacement(ctx, target.id, { x: Math.round(Math.cos(angle)), y: Math.round(Math.sin(angle)) }, rule.distance);
    const to = traced.path[traced.path.length - 1] || from;
    p.col = to.col; p.row = to.row;
    let collision = null;
    if (traced.blockedBy && traced.requestedDistance - traced.distance > 1e-9) {
      const view = { ...target.ref, def: statsOf(target).def };
      collision = applyCollisionDamage((traced.requestedDistance - traced.distance) * 10, view);
      target.ref.hp = view.hp; target.ref.shield = view.shield;
      if (target.ref.hp <= 0) handleDown(target, 'collision');
    }
    const event = emit('unit-displaced', { attackId: currentAttackId(), casterId: caster.id, unitId: target.id, mode: rule.type,
      from, to: { col: p.col, row: p.row }, requestedDistance: rule.distance, distance: traced.distance, path: traced.path, blockedBy: traced.blockedBy, collision });
    addLog(target.name + ' ' + rule.type + ' ' + traced.distance.toFixed(2) + 'm' + (collision ? ' · 碰撞-' + collision.hpDmg : ''));
    return event;
  }
  function applySkillDisplacements(caster, skill, query, hits, direction = null) {
    for (const rule of skill.displacements || []) {
      if (rule.type !== '击退' && rule.type !== '拉近') continue;
      const origin = rule.direction === '爆心向外' ? query.blastCenter || query.origin : unitCenter(placementsById[caster.id], caster.footprint);
      const targets = hits.filter(h => h.hpDmg > 0 && byId.get(h.targetId)?.ref.hp > 0);
      targets.sort((a, b) => {
        const ac = unitCenter(placementsById[a.targetId], byId.get(a.targetId).footprint), bc = unitCenter(placementsById[b.targetId], byId.get(b.targetId).footprint);
        const diff = Math.hypot(bc.x - origin.x, bc.y - origin.y) - Math.hypot(ac.x - origin.x, ac.y - origin.y);
        const order = String(a.targetId) < String(b.targetId) ? -1 : String(a.targetId) > String(b.targetId) ? 1 : 0;
        return (rule.type === '拉近' ? -diff : diff) || order;
      });
      for (const hit of targets) hit.displacement = displacement(caster, byId.get(hit.targetId), rule, query, direction);
    }
  }
  function* resolveCharge(caster, skill, query, slots, ledger, canceled, options) {
    const rule = skill.displacements.find(d => d.type === '冲锋');
    const pathQuery = chargePath(ctx, caster.id, query.aim, rule.distance);
    const visited = new Set(), hits = [], effects = [], path = [pathQuery.from];
    const position = placementsById[caster.id];
    for (const step of pathQuery.path.slice(1)) {
      const entering = new Set(occupiedCells(step, caster.footprint).map(c => c.col + ',' + c.row));
      const contactTargets = units.filter(u => u.id !== caster.id && u.ref.hp > 0 &&
        occupiedCells(placementsById[u.id], u.footprint).some(c => entering.has(c.col + ',' + c.row)));
      if (contactTargets.some(u => u.side === caster.side)) break;
      for (const target of contactTargets) {
        if (visited.has(target.id)) continue;
        visited.add(target.id);
        const contactHits = [];
        for (const slot of sortSlotsForResolve(slots)) {
          if (slot.attack) {
            const seg = yield* resolveAttackSegment({ caster, target, slot, skill, baseSkill: skill, slotIndex: slot.index,
              segmentIndex: visited.size, shotIndex: visited.size, totalShots: slots.filter(s => s.attack).length,
              bdg: ledger, canceled, incomingType: skill.damageType || '近战', isAoE: true, options: { ...options, skipSpatialRecheck: true } });
            if (seg) contactHits.push({ targetId: seg.targetId, hit: seg.hit, hpDmg: seg.hpDmg, hpBefore: seg.hpBefore, hpAfter: seg.hpAfter, down: seg.down, segments: [seg] });
          } else if (!slot.debuff || ledger.targetHit[target.id]) {
            effects.push(...applyEffectSlot(rt, { caster, slot, targets: [target], skill, skillKey: skillKey(skill) }).applied);
          }
          if (canceled.value) break;
        }
        applySkillDisplacements(caster, skill, query, contactHits, pathQuery.direction);
        hits.push(...contactHits);
        if (caster.ref.hp <= 0 || canceled.value) break;
      }
      if (caster.ref.hp <= 0 || canceled.value || !canPlaceAt(ctx, caster.id, step.col, step.row).ok) break;
      position.col = step.col; position.row = step.row; path.push({ ...step });
    }
    emit('unit-charged', { attackId: currentAttackId(), unitId: caster.id, from: pathQuery.from,
      to: { col: position.col, row: position.row }, path, requestedDistance: rule.distance,
      distance: (path.length - 1) * pathQuery.stepDistance });
    return { hits, effects, path };
  }

  // ---------- 攻击主链（generator：反应选择通过 yield 与调用方交互） ----------
  function failAttack(reason, extra = {}) {
    return Object.assign({ ok: false, reason, hits: [], effects: [], events: [], ammoEvents: [], logFrom: log.length, logTo: log.length }, extra);
  }

  function* beginAttack(skill, aim, options = {}) {
    const u = actor();
    if (!u) return failAttack('当前不能使用技能');
    const query = previewAttack(skill, aim);
    if (!query.ok) return failAttack(query.reason, { query });
    const attack = openAttack(u, skill);
    try {
      const result = yield* resolveAction(skill, query.aim, options);
      return { ...result, attackId: attack.id, events: domainEvents.filter(ev => ev.attackId === attack.id) };
    } finally {
      closeAttack(attack);
    }
  }
  function* resolveAction(skillInput, aim, options = {}) {
    const skill = skillInput;
    const u = actor();
    const logFrom = log.length;
    const valid = canUseSkill(skill);
    if (!valid.ok) return failAttack(valid.reason);
    const eff = valid.eff || effectiveSkill(skill);
    const query = previewAttack(skill, aim);
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
      consumeParentItem(u, skill, costSummary);
      if (skill.cooldownTurns > 0) dispatchClock(state, { type: 'applyCooldown', unitId: u.id, skillKey: key, duration: skill.cooldownTurns * ROUND_TIME });
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
      if (slot.definition.kind === 'barrier') {
        const check = previewBarrier(ctx, u.id, eff, query);
        if (!check.ok) return failAttack(check.reason, { query });
      }
    }
    const allTargets = [...new Set(slots.flatMap(s => s.targetIds || []))];
    if (!allTargets.length && !skill.summonTarget && !skill.regionEffect && !skill.barrierSub && !slots.some(s => s.target === 'self' || s.definition.side === 'self')) {
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
      consumeParentItem(u, skill, costSummary);
      if (costSummary.bindings) addLog('施展材料：' + costSummary.bindings);
    }
    // 冷却（独立字段 [冷却:N]，延迟不再当冷却）
    if (skill.cooldownTurns > 0 && !preparing) dispatchClock(state, { type: 'applyCooldown', unitId: u.id, skillKey: key, duration: skill.cooldownTurns * ROUND_TIME });

    // 召唤（召唤物立即占位、可被选为目标，从零跑完整圈；临时 AI 不进玩家弹窗）
    const summons = skill.summonTarget ? spawnSummons(eff, u, {}, query) : [];
    if (skill.regionEffect?.type === 'fog') {
      const region = createFogRegion(ctx, { caster: u, skill: eff, query, now: ctx.now() });
      dispatchBattleClock({ type: 'applyStatus', unitId: u.id, source: { casterId: u.id, skillId: 'area:fog', effectId: 'region:fog' },
        kind: 'region', duration: (region.endAt - ctx.now()) });
      emit('region-created', { attackId: currentAttackId(), region: structuredClone(region) });
    }
    if (skill.barrierSub) {
      const result = createBarrier(ctx, u.id, eff, query);
      emit('barrier-created', { attackId: currentAttackId(), barrier: structuredClone(result.barrier) });
    }

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

    const originalTargets = [...new Set(slots.flatMap(s => s.targetIds || []))];
    bdg.barrierTargets = Object.fromEntries(originalTargets.map(id => [id, interception(ctx, u.id, id)]).filter(([, barrier]) => barrier));
    const isCharge = eff.displacements?.some(d => d.type === '冲锋');
    for (const id of damageSlots.length ? allTargets : []) for (const guard of buffsOf(id)) {
      if (guard.type === 'damageGuard' && guard.attackId == null) guard.attackId = currentAttackId();
    }
    if (isCharge) {
      const charged = yield* resolveCharge(u, eff, query, slots, bdg, canceled, options);
      hits.push(...charged.hits); effects.push(...charged.effects);
    }
    for (const slot of isCharge ? [] : sortSlotsForResolve(slots)) {
      if (canceled.value) break;
      const def = slot.definition;
      bdg.barrierTargets = Object.fromEntries([...new Set(slot.targetIds || [])].map(id => [id, interception(ctx, u.id, id)]).filter(([, barrier]) => barrier));
      if (def.kind === 'barrier' || skill.regionEffect?.type === 'fog' && slot.tag === '致盲') continue;
      let targets = [];
      if (slot.target === 'self' || def.side === 'self') targets = u.ref.hp > 0 ? [u] : [];
      else targets = (slot.targetIds || []).map(id => byId.get(id)).filter(t => t && (t.ref.hp > 0 || def.kind === 'heal' && t.side === u.side && !t.isSummon));
      if (def.attack && !targets.length && skill.switchTarget && eff.range.type === '单体') {
        const fallback = units.find(t => t.side !== u.side && t.ref.hp > 0 && queryAttack(ctx, u.id, eff, { ...unitCenter(placementsById[t.id], t.footprint), targetId: t.id }).ok);
        if (fallback) targets = [fallback];
      }
      if (def.kind === 'attack' && targets.length) {
        shotIdx++;
        if (ammoBinds.length && !preparing) consumeAmmoForShot(ammoBinds, shotIdx, damageSlots.length, ammoEvents);
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
          if (def.debuff && !def.selfCost) {
            if (bdg.barrierTargets?.[target.id] || interception(ctx, u.id, target.id)) continue;
            if (bdg.targetResolved[target.id]) ok = bdg.targetHit[target.id] === true;
            else {
              const cStats = statsOf(u), tStats = statsOf(target);
              const roll = skill.guaranteedHit ? { hit: true } : resolveHit({ hitBonus: cStats.hit }, { evasion: target.ref.evasion || 0, evaBonus: tStats.eva }, skill, random);
              bdg.targetResolved[target.id] = true;
              bdg.targetHit[target.id] = roll.hit;
              if (roll.hit) {
                const reaction = yield* selectReaction(target, u, eff, incomingType, options, { slotIndex: slot.index, targetId: target.id }, false);
                if (reaction?.canceled) canceled.value = true;
                if (reaction?.canceled || reaction?.dodged) bdg.targetHit[target.id] = false;
              }
              ok = bdg.targetHit[target.id];
            }
            if (!ok) { addLog('【' + slot.tag.replace(/\[|\]/g, '') + '】妨害随攻击一同落空，未能施加到 ' + target.name); continue; }
          }
          const hpBefore = target.ref.hp;
          const applied = applyEffectSlot(rt, { caster: u, slot, targets: [target], skill: eff, skillKey: key });
          if (def.kind === 'heal' && hpBefore <= 0 && target.ref.hp > 0) dispatchBattleClock({ type: 'reenterUnit', unitId: target.id });
          effects.push(...applied.applied);
        }
      }
    }

    if (preparing) charge.preparing = null;
    if (skill.displacements?.some(d => d.type === '击退' || d.type === '拉近') && !skill.displacements.some(d => d.type === '冲锋')) {
      applySkillDisplacements(u, eff, query, hits);
    }
    if (skill.haste > 0) charge.inventory += skill.haste; // 准备技能释放后同样入账（主代理复审指令：移除 !prepKind）
    // 风行者多重施法：消耗MP释放技能时（非反应技）按耗蓝概率获得额外主行动点（概率原值；P03 grantMainPoint 映射）
    const mc = CLASS_PASSIVES[u.classType]?.onSkillExecuted?.(u, skill, false, passiveIo(u));
    if (mc && mc.multicast) addLog('🌟 ' + u.name + ' 的法力产生共鸣，引发了多重施法（获得额外主行动点）！');
    const p = placementsById[u.id];
    let choiceAim = query.aim || { ...query.origin };
    if (Math.hypot(choiceAim.x - query.origin.x, choiceAim.y - query.origin.y) > 1e-9) p.facing = ((Math.atan2(choiceAim.x - query.origin.x, -(choiceAim.y - query.origin.y)) * 180 / Math.PI) + 360) % 360;
    // 施法 TP：普通攻击 +20，其余技能 +5（原版口径）
    u.ref.tp = Math.min(u.ref.maxTp || 100, (u.ref.tp || 0) + (skill === BASIC_ATTACK ? 20 : 5));
    return { ok: true, hits, effects, events: [], ammoEvents, summons: summons.map(s => s.id), query, casterId: u.id, skill, aim: { ...aim },
      facing: p.facing, incomingType, canceled: canceled.value, costSummary, charge: chargeInfo, logFrom, logTo: log.length };
  }

  // 单段攻击：命闪 →（将命中才）反应拦截 yield → 伤害管线 → 附带效果
  function* resolveAttackSegment({ caster, target, slot, skill, baseSkill, slotIndex, segmentIndex, shotIndex, totalShots, bdg, canceled, incomingType, isAoE, options }) {
    const cStats = statsOf(caster);
    let tStats = statsOf(target);
    const passive = CLASS_PASSIVES[caster.classType] || null;
    const roll = 0.8 + random() * 0.4;
    const pierce = !!skill.isPierce || !!slot.definition.pierce || !!(passive && passive.checkPierce && passive.checkPierce(caster));
    const logStart = log.length;
    const segBase = { index: slotIndex, targetId: target.id, logIndex: logStart };
    if (!options.skipSpatialRecheck && skill.range.type === '单体') {
      const aim = { ...unitCenter(placementsById[target.id], target.footprint), targetId: target.id };
      const check = queryAttack(ctx, caster.id, skill, aim);
      if (!check.ok) {
        addLog(skill.name + ' 后续段目标不合法：' + check.reason);
        return { ...segBase, hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reason: check.reason, logEnd: log.length };
      }
    }
    const guard = bdg.barrierTargets?.[target.id] || interception(ctx, caster.id, target.id);
    if (guard) {
      const cache = bdg.barrierHits || (bdg.barrierHits = {});
      const barrierKey = guard.id + ':' + slotIndex;
      if (!cache[barrierKey]) {
        const raw = computeSegmentRawDamage(cStats, caster.ref.atk, slot.power, 1, roll);
        cache[barrierKey] = damageBarrier(ctx, guard.id, raw, { armorMult: slot.definition.scatter ? 3 : 1, incomingType });
        emit('barrier-damaged', { attackId: currentAttackId(), barrierId: guard.id, ...cache[barrierKey] });
      }
      bdg.targetResolved[target.id] = true;
      if (!bdg.targetHit[target.id]) bdg.targetHit[target.id] = false;
      addLog(target.name + ' 的攻击被场地结界拦截');
      return { ...segBase, hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, barrierId: guard.id, down: false, logEnd: log.length };
    }
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
    let reaction = yield* selectReaction(target, caster, skill, incomingType, options,
      { slotIndex, segmentIndex, targetId: target.id, shotIndex, totalShots });
    if (reaction?.canceled) {
      canceled.value = true;
      if (!bdg.targetResolved[target.id]) { bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false; }
      return Object.assign(segBase, { hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reaction, logEnd: log.length });
    }
    if (reaction?.dodged) {
      if (!bdg.targetResolved[target.id]) { bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false; }
      return Object.assign(segBase, { hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reaction, logEnd: log.length });
    }
    if (reaction?.guardianId) {
      bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false;
      target = byId.get(reaction.guardianId);
      segBase.originalTargetId = segBase.targetId; segBase.targetId = target.id;
      const guardReaction = yield* selectReaction(target, caster, skill, incomingType, options,
        { slotIndex, segmentIndex, targetId: target.id, shotIndex, totalShots }, true, false);
      if (guardReaction?.canceled) canceled.value = true;
      if (guardReaction?.canceled || guardReaction?.dodged) return Object.assign(segBase, { hit: false, hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reaction, guardianReaction: guardReaction, logEnd: log.length });
      reaction.guardianReaction = guardReaction;
    }
    tStats = statsOf(target);
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
    const guards = buffsOf(target.id).filter(b => b.type === 'damageGuard' && (b.attackId === currentAttackId() || b.attackId == null));
    guards.forEach(b => { b.attackId = currentAttackId(); });
    let { hpDmg, shieldDmg, guardDmg } = calculateDamage(raw, { def: tStats.def, shield: target.ref.shield || 0, hp: target.ref.hp },
      { isPierce: pierce, armorMult: slot.definition.scatter ? 3 : 1, guardRemaining: guards.reduce((n, b) => n + b.value, 0), defending: isDefending(target) });
    let remainingGuardCost = guardDmg;
    for (const guard of guards) {
      const used = Math.min(guard.value, remainingGuardCost);
      guard.value -= used; remainingGuardCost -= used;
      if (guard.value <= 0) removeBuffRecord(target.id, guard);
    }
    if (guardDmg > 0) addLog('🛡️ ' + target.name + ' 的【免伤】抵消 ' + guardDmg);
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
    emit('segment-resolved', { attackId: currentAttackId(), casterId: caster.id, targetId: target.id,
      slotIndex, hpDmg: dealt, shieldDmg, guardDmg, down, damageCategory: slot.definition.damageCategory || null });
    return Object.assign(segBase, { hit: true, hpDmg: dealt, shieldDmg, guardDmg, hpBefore, hpAfter: target.ref.hp, down, reaction: reaction || undefined, logEnd: log.length });
  }
  function aStats0(u) { return u.ref; }

  // 离线包装：battle.attack 仅用于无玩家选择场景。缺省 policy:'none'（全部响应者跳过，绝不代玩家）；
  // 显式 policy:'auto'（离线测试）才自动选首个可用反应。UI/真实交互一律走 beginAttack。
  function attack(skill, aim, options = {}) {
    const policy = options.policy || 'none';
    const gen = beginAttack(skill, aim, {
      ...options,
      suppressReactions: options.suppressReactions ?? policy === 'none',
      autoAnswer: options.autoAnswer || (policy === 'auto' ? req => (req.candidates[0] ? { responderId: req.candidates[0].responderId, skill: req.candidates[0].skill } : null) : null),
    });
    let step = gen.next();
    while (!step.done) step = gen.next(null);
    return step.value;
  }

  // ---------- 物品：与技能共用确认、准备、反应和资源事务 ----------
  function canUseItem(item, child = null) {
    return canUseSkill(itemAsSkill(item, child));
  }
  function* beginUseItem(item, aim, options = {}) {
    const selected = itemAsSkill(item, options.child || null);
    if (!selected) return failAttack('物品不可用');
    const result = yield* beginAttack(selected, aim, options);
    return { ...result, isItem: true, item };
  }
  function useItem(item, aim, options = {}) {
    const selected = itemAsSkill(item, options.child || null);
    if (!selected) return failAttack('物品不可用');
    const result = attack(selected, aim, options);
    return { ...result, isItem: true, item };
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
              const guards = buffsOf(targetId).filter(b => b.type === 'damageGuard' && (b.attackId == null || b.attackId === currentAttackId()));
              views.set(targetId, { def: statsOf(target).def, shield: target.ref.shield || 0,
                guard: guards.reduce((n, b) => n + b.value, 0), tStatsEva: statsOf(target).eva });
            }
            const view = views.get(targetId);
            const raw = computeSegmentRawDamage(cStats, u.ref.atk, s.power, 1, 1, {
              modifyDamageMultiplier: args => (passive && passive.modifyDamageMultiplier ? passive.modifyDamageMultiplier(args.caster, args.target, buffsOf(args.target.id), statsOf(args.caster), statsOf(args.target)) : 0),
              modifyDamageDealt: args => (passive && passive.modifyDamageDealt ? passive.modifyDamageDealt(args.caster, args.skill, statsOf(args.caster)) : 0),
            }, { caster: u, target, skill: eff });
            const afterResist = applyTypeResist(raw, eff.damageType || '近战', isAoE0, target, buffsOf(target.id));
            const isPierce = !!eff.isPierce || !!s.definition.pierce || !!(passive && passive.checkPierce && passive.checkPierce(u));
            const { hpDmg, shieldDmg, guardDmg } = calculateDamage(afterResist, view,
              { isPierce, armorMult: s.definition.scatter ? 3 : 1, guardRemaining: view.guard, defending: isDefending(target) });
            view.guard -= guardDmg;
            if (shieldDmg > 0) view.shield = Math.max(0, view.shield - shieldDmg); // 预测副本逐槽消耗护盾
            preview.push({ targetId, slotIndex: s.index, raw, estimatedHpDmg: hpDmg,
              attackCap: Math.max(1, (eff.hit ?? 100) + cStats.hit), dodgeCap: Math.max(1, (target.ref.evasion || 0) + views.get(targetId).tStatsEva) });
          }
        }
        return preview;
      })(),
      damageFormula: { roll: '0.8–1.2', pierceSlots: slots.filter(s => eff.isPierce || s.definition.pierce).map(s => s.index), scatterArmorMult: 3 },
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
    if (state.combatState.clock?.terminal) return snapshot();
    if (!id) return state.combatState.clock ? advance() : snapshot();
    const charge = state.combatState.charges?.[id];
    if (charge?.preparing?.ready) cancelPreparation(id);
    dispatchClock(state, { type: 'endAction', unitId: id });
    return advance();
  }

  function enemySkills() {
    const u = actor();
    const items = (u.items || []).filter(it => it.category !== '弹药' && !it.bindings?.length)
      .flatMap(it => it.children?.length ? it.children.map(c => itemAsSkill(it, c)) : [itemAsSkill(it)]);
    return [...(u.skills || []), ...items, BASIC_ATTACK].filter(s => s && canUseSkill(s).ok);
  }
  function isAiControlled(u) { return !!(u && (u.controller || (u.side === 'enemy' ? 'ai' : 'player')) === 'ai'); }
  function planEnemyAction() {
    const u = actor();
    if (!u || !isAiControlled(u) || state.combatState.clock.terminal || !resources) return null;
    if (resources.main < 1 && resources.aux < 1 && resources.moveRemaining <= 1e-9 && !chargeState(u.id).preparing?.ready) return { moveTo: null, skill: null, aim: null, action: 'wait' };
    const preparing = chargeState(u.id).preparing;
    if (preparing && !preparing.ready) return { moveTo: null, skill: null, aim: null, action: resources.main > 0 ? 'prepare' : 'wait' };
    const skills = preparing?.ready ? [preparing.skill] : enemySkills();
    return chooseEnemyAction(ctx, currentId(), resources.moveRemaining, skills, skill => skillStatus(skill),
      { ...resources, preparing, moveDistance: moveDistanceOf(u) });
  }
  function* beginEnemyTurn(options = {}) {
    const id = currentId();
    if (!actor() || !isAiControlled(actor()) || state.combatState.clock.terminal) return snapshot();
    for (;;) {
      const choice = planEnemyAction();
      if (!choice || choice.action === 'wait') break;
      const before = JSON.stringify({ resources, hp: actor().ref.hp, mp: actor().ref.mp, position: placementsById[id], prep: chargeState(id).preparing });
      if (choice.moveTo) {
        const moved = move(choice.moveTo.col, choice.moveTo.row);
        if (!moved.ok) break;
        if (moved.stoppedOnDiscovery) continue;
      }
      if (choice.action === 'sprint') sprint();
      else if (choice.action === 'defend') defend();
      else if (choice.action === 'prepare' && !choice.skill) advancePreparation();
      else if (choice.skill) {
        const result = yield* beginAttack(choice.skill, choice.aim, options);
        if (!result.ok) break;
      }
      if (byId.get(id).ref.hp <= 0 || currentId() !== id || !resources) break;
      const after = JSON.stringify({ resources, hp: actor().ref.hp, mp: actor().ref.mp, position: placementsById[id], prep: chargeState(id).preparing });
      if (after === before) break;
    }
    return endAction();
  }
  function runEnemyTurn(options = {}) {
    const gen = beginEnemyTurn({ suppressReactions: true, ...options });
    let step = gen.next();
    while (!step.done) step = gen.next(null);
    return step.value;
  }

  function reset() {
    // 召唤物退场（本战斗基线不含召唤）：单位/占位/足迹/时钟记录一并移除
    for (const u of units.filter(x => x.isSummon)) {
      byId.delete(u.id); delete placementsById[u.id]; delete ctx.footprintsById[u.id];
      ctx.carriedUnitIds.delete(u.id);
    }
    for (let i = units.length - 1; i >= 0; i--) if (units[i].isSummon) units.splice(i, 1);
    // 资源/物品/职业开场派生（盾）回到开场基线
    for (const rec of opening.flags) {
      const ref = byId.get(rec.id).ref;
      for (const key of Object.keys(ref)) delete ref[key];
      Object.assign(ref, structuredClone(rec.ref));
    }
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
    resources = null; log = []; domainEvents = []; actionSerial = 0; attackSerial = 0; summonSerial = 0;
    attackStack.length = 0;
    ctx.regions = state.combatState.regions = [];
    ctx.barriers = state.combatState.barriers = [];
    if (typeof random.reset === 'function') random.reset();
    return start();
  }

  return { ctx, battleState: state, get state() { return state; }, start, snapshot, reachable, previewMove, move, sprint, previewJump, jump, push, previewCarry, carry, drop, previewDisplacement,
    setVisibleUnitIds(ids) { visibleIds = ids ? ids.slice() : null; },
    canUseSkill, skillStatus, canUseReaction, canUseItem, itemSkill: itemAsSkill, advancePreparation, cancelPreparation,
    previewAttack, beginAttack, attack, beginUseItem, useItem, predictAttack, defend,
    getEffectiveUnit, statsOf, buffsOf,
    endAction, planEnemyAction, beginEnemyTurn, runEnemyTurn, reset };
}
