// ==========================================
// 战斗控制器（FX02 规则内核）：消费 P03 自然行动，空间查询/扣费/伤害共用一条命令链。
// HP/MP 真值仅在角色 ref；时钟与位置可保存，实时资源和本轮余额不写长期档。
// 规则来源：原版 index.html 与 doc/tactics/TYPICAL-BATTLE-CONTRACT.md。
// beginAttack / beginUseItem / beginEnemyTurn 使用可暂停反应的生成器；UI 不参与规则计算。
// ==========================================

import { createClock, dispatchClock, advanceToNextAction } from './clock.mjs';
import { emptyBattleState } from './lifecycle.mjs';
import { cellAt, compileScene, isLowObstacleKind } from './scene.mjs';
import { findReachable, findRiskAwareReachable, findJumpPath, canPlaceAt, traceDisplacement, cellsAdjacent } from './movement.mjs';
import { unitCenter, occupiedCells, cellKey } from './geometry.mjs';
import { fogAt, fogAffects, createRegion, expireRegions, moveMultiplier } from './regions.mjs';
import { previewBarrier, createBarrier, interception, damageBarrier, expireBarriers, clearBarriers, barrierAt, barrierContact, barrierCrossing } from './barriers.mjs';
import { canSeePoint, canSeeUnit, sightRadius } from './perception.mjs';
import { previewGuard } from './guard.mjs';
import { queryAttack, resolveDefaultRange, spatialAttackModifiers } from './range.mjs';
import { resolveHit, calculateDamage, computeSegmentRawDamage, applyCollisionDamage } from './damage.mjs';
import { chooseEnemyAction, fogRouteFilter, selectChargeAim } from './ai.mjs';
import { skillSlots, sortSlotsForResolve, normalizeEffectTag, effectDefinition } from './effect-definitions.mjs';
import { applyEffectSlot } from './effect-handlers.mjs';
import { CLASS_PASSIVES, getEffectiveStats } from './class-passives.mjs';
import { rageAtkMultiplier, applyTypeResist, hasVariantTag, immunityReason, isImmuneToStun, lifestealRatio, hasThorns, thornsRawReflect } from './variant-rules.mjs';
import { statusKeyOf, ROUND_TIME } from './scheduler.mjs';

export const BASIC_ATTACK = {
  name: '普通攻击', type: '[伤害]', fxTag: '刀砍', power: 0, hit: 100, cost: 0,
  range: { type: '单体', castRange: 2 }, actionCost: { main: 1, aux: 0 },
};

const OPPORTUNITY_ATTACK = { ...BASIC_ATTACK, name: '借机攻击', damageType: '近战', range: { type: '单体', castRange: Infinity } };
const OPPORTUNITY_SLOT = skillSlots(OPPORTUNITY_ATTACK)[0];
const teleportRule = skill => !skill?.isReaction && skill?.displacements?.find(d => d.type === '闪现');
const sideStepFacing = (a, b) => ((Math.atan2(b.col - a.col, -(b.row - a.row)) * 180 / Math.PI) + 360) % 360;

function skillKey(skill) { return (skill.parentItemName || skill.parentName ? (skill.parentItemName || skill.parentName) + '\u0000' : '') + skill.name + (teleportRule(skill) ? '\u0000闪现' : ''); }
function usedCount(state, unitId, key) { return state.perBattleUses?.[unitId]?.[key] || 0; }

const ITEM_ACTION_COST = { main: 0, aux: 1 };

function actionPayment(r, main, aux) {
  if (r.main < main) return { ok: false, reason: '主行动已用完' };
  const auxCost = Math.min(aux, r.aux);
  const mainCost = main + aux - auxCost;
  return r.main < mainCost ? { ok: false, reason: '辅助行动已用完' } : { ok: true, mainCost, auxCost };
}

// 物品 → 技能形态（规范 range/slots/isItem，供 attackPreview / aim 复用；不回写原物品）
export function itemAsSkill(item, child = null) {
  if (!item || !item.isItem) return null;
  const selected = child ? { ...child, isItem: true, category: item.category, parentItemName: item.name } : item;
  const range = selected.range || resolveDefaultRange(selected);
  const view = { ...selected, range, actionCost: ITEM_ACTION_COST };
  Object.defineProperty(view, '_itemSource', { value: item });
  return view;
}

// 技能可用性（结构级）：反应与死亡技能不可主动使用；纯绑定载体道具不可主动施放；召唤词条由运行时 provider 校验。
export function skillSupport(skill) {
  if (skill?.isItem && skill.category === '弹药') return { ok: false, reason: '弹药不能主动使用' };
  if (skill && skill.isItem && !(skill.children && skill.children.length) && skill.bindings && skill.bindings.length
    && (!skill.type || skill.type === '[无]') && !skill.summonTarget && !skill.regionEffect && !skill.barrierSub) {
    return { ok: false, reason: '仅作为绑定技能的次数载体' };
  }
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

let battleInstanceSerial = 0;

export function createBattle({ units, placementsById, scene, battleState, visibleUnitIds = null, random = Math.random, summonProvider = null }) {
  const instanceId = ++battleInstanceSerial;
  let generation = 0;
  let runId = 'battle:' + instanceId + ':' + generation;
  let activeSegment = null;
  const state = battleState || emptyBattleState(scene.sceneId, 'demo');
  const opening = {
    positions: structuredClone(placementsById),
    resources: units.map(u => ({ id: u.id, hp: u.ref.hp, mp: u.ref.mp, tp: u.ref.tp || 0, shield: u.ref.shield || 0 })),
    items: units.map(u => ({ id: u.id, items: (u.items || []).map(it => ({ name: it.name, count: it.count, usesRemaining: it.usesRemaining })) })),
    flags: units.map(u => ({ id: u.id, ref: structuredClone(u.ref) })),
  };
  const hasDoubleJump = u => u.side === 'enemy' && (u.level === '精英' || u.level === '首领') && u.footprint.width === 2 && u.footprint.height === 2;
  const passiveOf = u => CLASS_PASSIVES[u.classType];
  const firstJumpFree = u => !hasDoubleJump(u) && !!passiveOf(u)?.freeJump;
  const jumpLimit = u => hasDoubleJump(u) || firstJumpFree(u) ? 2 : 1;
  let resources = null;
  let visibleIds = visibleUnitIds ? visibleUnitIds.slice() : null;
  const ctx = {
    scene, compiled: compileScene(scene), units, placementsById,
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])), carriedUnitIds: new Set(),
    get visibleUnitIds() { return visibleIds; },
    get carrying() { return state.combatState.carrying || {}; },
    get runId() { return runId; },
    regions: state.combatState.regions || (state.combatState.regions = []),
    barriers: state.combatState.barriers || (state.combatState.barriers = []),
    now: () => state.combatState.clock?.now || 0,
    encounter: scene.encounter === true,
    knownPositions: true,
    enforcePerception: false,
    buffsOf,
    random,
  };
  let log = [];
  let domainEvents = [];
  let fieldBlocks = new Set();
  const rageVisualActive = new Set();
  function syncRageResult(u) {
    const active = u.ref.hp > 0 && rageAtkMultiplier(u, buffsOf(u.id)) > 1;
    if (active === rageVisualActive.has(u.id)) return;
    if (active) { rageVisualActive.add(u.id); u.ref.hasRageNarrated = true; }
    else rageVisualActive.delete(u.id);
    emit('variant-trigger', { attackId: currentAttackId(), unitId: u.id, trigger: active ? 'rage' : 'rageExit' });
  }
  let attackSerial = 0;
  const attackStack = [];
  let actionSerial = 0;
  let summonSerial = 0;
  const byId = new Map(units.map(u => [u.id, u]));
  const currentId = () => state.combatState.clock?.currentAction?.unitId || null;
  const actor = () => byId.get(currentId());

  function activeCombatant(u) {
    return u?.ref.hp > 0 && !u.ref.isSubdued && !u.isSubdued && !ctx.carriedUnitIds.has(u.id)
      && state.combatState.clock?.units[u.id]?.status === 'active' && placementsById[u.id];
  }
  const hpRatio = u => u.ref.hp / u.ref.maxHp;
  const centerOf = u => unitCenter(placementsById[u.id], u.footprint);
  const distanceTo = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function syncFocus(sighting = false) {
    const orders = state.combatState.focusOrders;
    if (!orders) return;
    for (const [id, order] of Object.entries(orders)) {
      const target = byId.get(order.targetId);
      if (state.combatState.clock?.terminal || !activeCombatant(byId.get(id)) || !activeCombatant(byId.get(order.issuerId))
        || !activeCombatant(target) || !(hpRatio(target) < 0.3)) delete orders[id];
      else if (sighting && canSeeUnit(ctx, id, target.id)) order.lastSeen = centerOf(target);
    }
  }
  function issueFocus(u) {
    if (u.side !== 'enemy' || !(u.level === '精英' || u.level === '首领' || u.isWise || u.ref.isWise)) return;
    const from = centerOf(u), radius = sightRadius(ctx, u);
    const candidates = state.combatState.clock.order.map(id => byId.get(id))
      .filter(t => t?.side === 'hero' && activeCombatant(t) && hpRatio(t) < 0.3)
      .map(target => ({ target, to: centerOf(target) })).filter(({ target, to }) => distanceTo(from, to) <= radius + 1e-9 && canSeeUnit(ctx, u.id, target.id));
    candidates.sort((a, b) => hpRatio(a.target) - hpRatio(b.target) || distanceTo(from, a.to) - distanceTo(from, b.to));
    if (!candidates.length) return;
    const { target, to } = candidates[0];
    const orders = state.combatState.focusOrders ||= {};
    const receiverIds = [];
    for (const id of state.combatState.clock.order) {
      const receiver = byId.get(id);
      if (orders[id] || receiver?.side !== 'enemy' || !activeCombatant(receiver) || distanceTo(from, centerOf(receiver)) > 3 * radius + 1e-9) continue;
      orders[id] = { issuerId: u.id, targetId: target.id, lastSeen: to };
      receiverIds.push(id);
    }
    if (!receiverIds.length) return;
    addLog(u.name + ' 传令集火 ' + target.name);
    emit('focus-issued', { issuerId: u.id, targetId: target.id, from, to, receiverIds });
  }

  function dispatchBattleClock(command, rulesContext = {}) {
    const wasCurrent = currentId() === command.unitId;
    const result = dispatchClock(state, command, rulesContext);
    if (command.type === 'exitUnit' && wasCurrent) resources = null;
    if (command.type === 'grantMainPoint' && result.events?.some(ev => ev.immediate) && currentId() === command.targetId) {
      state.combatState.clock.currentAction.resources.main += 1;
      refillBaseMovement(actor());
      emit('main-point-received', { unitId: command.targetId, amount: 1, natural: false });
      if (resources?.preparationContinued) investPreparation(actor());
    }
    if (command.type === 'exitUnit') {
      const charge = state.combatState.charges?.[command.unitId];
      if (charge) { charge.preparing = null; delete charge.intent; }
      syncFocus();
    }
    return result;
  }
  function addLog(text) { log.push(text); }
  function emit(type, fields = {}) {
    const seq = domainEvents.length + 1;
    const event = { seq, eventId: runId + ':event:' + seq, runId, actionId: runId + ':action:' + actionSerial,
      at: ctx.now(), attackId: currentAttackId(), ...activeSegment, type, ...structuredClone(fields) };
    domainEvents.push(event);
    const visionChanged = ['unit-moved', 'unit-jumped', 'unit-charged', 'unit-teleported', 'unit-displaced', 'guard-committed', 'barrier-created', 'barrier-removed', 'region-created', 'region-expired', 'obstacle-destroyed'].includes(type);
    syncFocus(visionChanged);
    if (['unit-moved', 'unit-charged', 'unit-teleported', 'unit-displaced', 'guard-committed', 'barrier-created', 'barrier-removed', 'region-created', 'region-expired'].includes(type)) syncFieldBlocks();
    return event;
  }
  function syncFieldBlocks() {
    const next = new Set();
    const changes = [];
    for (const unit of units) {
      if (unit.ref.hp <= 0) continue;
      for (const blocked of fogAt(ctx, unit.id).blockedRegions || []) {
        const key = unit.id + ':' + blocked.regionId + ':' + blocked.barrierId;
        next.add(key);
        if (!fieldBlocks.has(key)) changes.push({ ...blocked, targetId: unit.id, blockedKind: 'field', blockedTag: 'fog' });
      }
    }
    fieldBlocks = next;
    for (const blocked of changes) emit('barrier-blocked', blocked);
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
  function notifyManaSpent(unit, spent, prep = null) {
    if (!spent) return;
    const grant = CLASS_PASSIVES[unit.classType]?.onManaSpent?.(unit, spent, random);
    if (!grant) return;
    const used = prep ? investDelay(prep, grant.haste) : 0;
    const banked = grant.haste - used;
    chargeState(unit.id).inventory += banked;
    unit.ref.tp = Math.min(unit.ref.maxTp || 100, (unit.ref.tp || 0) + (grant.tp || 0));
    addLog(unit.name + ' 法力回响' + (used ? ' · 本发蓄力−' + used : '') + (banked ? ' · 加速+' + banked : '') + ' · TP+' + grant.tp);
    emit('passive-gain', { unitId: unit.id, passive: '法力回响', kind: 'haste', value: grant.haste, invested: used, banked, tp: grant.tp });
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
      addBuff: (u, buff, effectKey) => {
        if (buff.isConcealAtk) buffsOf(u.id).filter(b => b.isConcealAtk).forEach(b => removeBuffRecord(u.id, b));
        return registerBuff(u, buff, statusSource(u.id, { casterId: u.id, skillId: 'class:' + (u.classType || '') }, effectKey));
      },
      clearTempNegativeTaunt: u => buffsOf(u.id).filter(b => b.type === 'taunt' && b.value < 0).forEach(b => removeBuffRecord(u.id, b)),
      log: addLog,
    };
  }
  // 敌方变种阈值收口（原版 tryTriggerEnemyMolt L31033 / tryTriggerEnemyLink L31080）：受击/DoT/入场后调用
  function runEnemyThresholdVariants(u) {
    if (!u) return;
    syncRageResult(u);
    if (u.side !== 'enemy' || u.ref.hp <= 0) return;
    const buffs = buffsOf(u.id);
    if (!u.ref.molted && hasVariantTag(u, '蜕皮', buffs) && u.ref.maxHp > 0 && u.ref.hp / u.ref.maxHp < 0.5) {
      u.ref.molted = true; // 一次性标记；+50% 攻击由 class-passives moltAtkMultiplier 被动读取（不被驱散、跨复活永久）
      const cleared = dispelNegatives(u, Infinity);
      const before = u.ref.hp;
      u.ref.hp = Math.min(u.ref.maxHp, u.ref.hp + Math.max(1, Math.floor(u.ref.maxHp * 0.3)));
      emit('variant-trigger', { attackId: currentAttackId(), unitId: u.id, trigger: 'molt', healed: u.ref.hp - before });
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
    const affectedTargets = [];
    const deathSegment = passiveSeq();
    const protectedTargets = Object.fromEntries(area.actualTargetIds.map(id => [id, interception(ctx, enemy.id, id)]).filter(([, b]) => b));
    const barrierLedger = { barrierTargets: protectedTargets };
    let barrierRoll;
    for (const hero of units.filter(x => x.side !== enemy.side && x.ref.hp > 0 && area.actualTargetIds.includes(x.id))) {
      const barrier = protectedTargets[hero.id];
      if (barrier) {
        if (sub === '群火' || sub === '群毒') blockEffect(enemy, hero, { index: 'self-destruct', tag: sub, definition: { kind: 'dot' } }, barrier);
        else {
          barrierRoll ??= 0.8 + random() * 0.4;
          resolveBarrierDamage(enemy, barrier, { index: 'self-destruct', power, definition: {} }, deathSegment, barrierRoll, 1, '法术', barrierLedger,
            unitCenter(placementsById[hero.id], hero.footprint));
        }
        continue;
      }
      const tStats = statsOf(hero);
      const roll = resolveHit({ hitBonus: 0 }, { evasion: hero.ref.evasion || 0, evaBonus: tStats.eva }, boomSkill, random);
      if (!roll.hit) { addLog(hero.name + ' 闪避了自爆'); affectedTargets.push({ targetId: hero.id, hit: false, hpDmg: 0 }); continue; }
      if (sub === '群火' || sub === '群毒') {
        registerDot(hero, sub === '群火' ? 'burn' : 'poison', { strength: power, turns: 3, casterId: enemy.id, skillKey: '自爆', slotTag: '自爆' });
        addLog(hero.name + ' 被【自爆·' + sub + '】' + (sub === '群火' ? '灼烧' : '毒素侵蚀') + '（' + power + '/回合 ×3）');
        affectedTargets.push({ targetId: hero.id, hit: true, hpDmg: 0, dot: sub === '群火' ? 'burn' : 'poison', strength: power });
      } else {
        const raw0 = computeSegmentRawDamage(eStats, enemy.ref.atk, power, 1, 0.8 + random() * 0.4, {}, { caster: enemy, target: hero, skill: boomSkill });
        const resistance = {};
        const raw = applyTypeResist(raw0, '法术', true, hero, buffsOf(hero.id), resistance);
        const calc = calculateDamage(raw, { def: tStats.def, shield: hero.ref.shield || 0, hp: hero.ref.hp }, { isPierce: sub === '群穿', defending: isDefending(hero) });
        let hpDmg = calc.hpDmg, shieldDmg = calc.shieldDmg, sdFatalResult = null;
        if (hero.ref.hp - hpDmg <= 0) {
          const fatalCtx = { unit: hero, hpDmg, shieldDmg };
          const tp = CLASS_PASSIVES[hero.classType];
          if (tp && tp.onFatalDamage && tp.onFatalDamage(fatalCtx)) {
            hpDmg = fatalCtx.hpDmg; shieldDmg = fatalCtx.shieldDmg;
            sdFatalResult = { reason: fatalCtx.hpDmg === 0 ? 'avoid-fatal' : 'grit', hpDmgBefore: calc.hpDmg, hpDmgAfter: fatalCtx.hpDmg };
            addLog(hero.name + ' 触发职业被动【' + (fatalCtx.hpDmg === 0 ? '回避致命' : '毅力留存') + '】躲过了自爆致命伤！');
          }
        }
        if (shieldDmg > 0) hero.ref.shield = Math.max(0, (hero.ref.shield || 0) - shieldDmg);
        const dealt = Math.min(hero.ref.hp, hpDmg);
        hero.ref.hp = Math.max(0, hero.ref.hp - hpDmg);
        addLog('☠️ 自爆命中 ' + hero.name + ' -' + dealt + ' HP' + (shieldDmg ? '（破盾' + shieldDmg + '）' : ''));
        affectedTargets.push({ targetId: hero.id, hit: true, hpDmg: dealt, shieldDmg, rawDmg: raw, resistance, fatalResult: sdFatalResult,
          segmentId: runId + ':' + currentAttackId() + ':slot:self-destruct:segment:' + deathSegment,
          hpAfter: hero.ref.hp, down: hero.ref.hp <= 0 });
        if (hero.ref.hp <= 0) handleDown(hero, 'selfdestruct');
      }
    }
    emit('self-destruct', {
      attackId: currentAttackId(), unitId: enemy.id, sub, power, radius,
      center: unitCenter(placementsById[enemy.id], enemy.footprint), targets: affectedTargets,
    });
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
  function statsOf(unit, concealAtk) {
    const stats = getEffectiveStats(unit, buffsOf(unit.id), concealAtk);
    stats.hit -= fogAt(ctx, unit.id).strength;
    return stats;
  }
  function moveDistanceOf(unit) {
    const flying = buffsOf(unit.id).some(b => b.type === 'variant' && b.variant === '飞行') || unit.ref.flying;
    return unit.ref.moveDistance * (flying ? 1.5 : 1);
  }
  function refillBaseMovement(unit) {
    if (currentId() !== unit.id || !resources || !passiveOf(unit)?.refillMovement) return;
    resources.moveRemaining = resources.baseMove + (resources.sprintRemaining || 0);
  }
  function creditEnemyDefeat(target, sourceId) {
    const source = byId.get(sourceId);
    if (!source || target.side !== 'enemy' || source.side === target.side) return;
    refillBaseMovement(source);
    if (source.isSummon || source.ref.isDead || state.combatState.clock.units[source.id]?.status === 'out') return;
    const gain = passiveOf(source)?.prismRelay?.(target.level);
    if (!gain) return;
    const before = source.ref.tp || 0;
    source.ref.tp = Math.min(source.ref.maxTp || 100, before + gain);
    const tp = source.ref.tp - before;
    if (!tp) return;
    addLog(source.name + ' · 【棱镜中继】击杀 ' + target.name + ' · TP+' + tp);
    emit('passive-gain', { unitId: source.id, targetId: target.id, passive: '棱镜中继', kind: 'tp', value: tp });
  }
  function statusSource(unitId, ids, effectId) {
    const source = byId.get(ids.casterId);
    return { casterId: ids.casterId, skillId: ids.skillId, effectId: unitId + ':' + effectId,
      side: source?.side, placement: source && { ...placementsById[source.id] }, footprint: source && { ...source.footprint } };
  }
  function nextStackSeq(unitId) {
    const s = state.combatState._stackSeq || (state.combatState._stackSeq = {});
    s[unitId] = (s[unitId] || 0) + 1;
    return s[unitId];
  }
  function removeBuffRecord(unitId, rec) {
    const list = buffsOf(unitId);
    const i = list.indexOf(rec);
    if (i >= 0) {
      list.splice(i, 1);
      emit('status-removed', { attackId: currentAttackId(), unitId, kind: rec.type });
    }
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
    const immunity = immunityReason(target, kind, buffsOf(target.id));
    if (immunity) {
      const result = { kind: 'dot', targetId: target.id, casterId, tag: slotTag, immune: true, immunity, reason: immunity.reason };
      emit('effect-resolved', result);
      return result;
    }
    // 中毒叠层：每次施放独立层（唯一 effectId）；燃烧同源刷新保节拍（S06 L120）
    const effectId = kind === 'poison' ? slotTag + '#' + nextStackSeq(target.id) : slotTag + ':0';
    const source = statusSource(target.id, { casterId, skillId: sk }, effectId);
    registerBuff(target, { type: kind, value: strength, duration: turns }, source);
  }
  function negativeBuffsOf(unitId) {
    return buffsOf(unitId).filter(b => b.type === 'poison' || b.type === 'burn' || b.type === 'paralyze' || b.type === 'stun'
      || (b.type === 'def' && b.value < 0) || (b.type === 'hit' && b.value < 0)
      || (b.type === 'eva' && b.value < 0) || (b.type === 'atk' && b.value < 0) || (b.type === 'spd' && b.value < 0));
  }
  function dispelNegatives(target, count) {
    const removed = negativeBuffsOf(target.id).slice(0, Math.max(0, Math.ceil(count)));
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
    checkStealthThresholds(unit) {
      const res = CLASS_PASSIVES['隐匿者'].checkStealthThresholds(unit, passiveIo(unit));
      if (res.extraTurn) addLog('⚡ ' + unit.name + ' 隐匿值突破 ' + res.stealthVal + '，触发【再动】！');
      if (res.rush) addLog('🎯 ' + unit.name + ' 隐匿值突破 100，下一次非反应攻击 +50（隐匿值回归 50）');
      return res;
    },
    interceptEffect(caster, target, slot) { return blockEffect(caster, target, slot); },
  };
  function applyBattleEffect(args) {
    const result = applyEffectSlot(rt, args);
    for (const effect of result.applied) emit('effect-resolved', effect);
    return result;
  }
  // 领域标签：失败即挂独立 3 回合 debuff，同源刷新；离场/区域消失保留。
  function applyDomainTag(region, casterUnit, target, tag) {
    const def = effectDefinition(tag.tag);
    if (!def) return;
    const turns = 3;
    const skill = { name: region.sourceKey, isReaction: false };
    if (def.kind === 'dot' || def.kind === 'paralyze') {
      const immunity = immunityReason(target, def.dot || 'paralyze', buffsOf(target.id));
      if (immunity) {
        emit('effect-resolved', { kind: def.kind, targetId: target.id, tag: tag.tag, immune: true, immunity, reason: immunity.reason });
        return;
      }
      const source = statusSource(target.id, { casterId: casterUnit.id, skillId: region.sourceKey }, region.sourceKey + ':' + tag.tag);
      const type = def.kind === 'dot' ? def.dot : 'paralyze';
      const value = Math.max(1, Math.floor(tag.power || 0)) * (def.kind === 'paralyze' ? -1 : 1);
      registerBuff(target, { type, value, duration: turns }, source);
      const effect = { kind: def.kind, targetId: target.id, tag: tag.tag, value, turns, casterId: casterUnit.id };
      emit('effect-resolved', effect);
      addLog(target.name + ' 受领域【' + tag.tag + '】影响 · ' + turns + '回');
      return;
    }
    const slot = { index: tag.index, tag: tag.tag, power: tag.power, turns, target: 'default', definition: def };
    applyBattleEffect({ caster: casterUnit, slot, targets: [target], skill, skillKey: region.sourceKey, multiplier: 1 });
  }
  // 共享闪避对抗：每领域每次只掷一次攻击骰，各目标分别掷闪避骰；进入不额外触发。
  function runRegionContest(region, casterUnit) {
    if (!region || !casterUnit || casterUnit.ref.hp <= 0) return [];
    const targets = units.filter(t => t.ref.hp > 0 && t.side !== region.source.side && fogAffects(ctx, region, t.id)
      && occupiedCells(placementsById[t.id], t.footprint).some(c => region.cells.some(rc => rc.col === c.col && rc.row === c.row)));
    if (!targets.length) return [];
    const cs = statsOf(casterUnit);
    const atkCap = Math.max(1, Math.floor((region.hit ?? 100) + cs.hit));
    const sharedAttack = Math.floor(random() * atkCap) + 1;
    const applied = [];
    for (const target of targets) {
      const ts = statsOf(target);
      const dodgeCap = Math.max(1, Math.floor((target.ref.evasion || 0) + (ts.eva || 0)));
      const dodgeRoll = Math.floor(random() * dodgeCap) + 1;
      let calls = 0;
      const roll = resolveHit({ hitBonus: 0 }, { evasion: target.ref.evasion || 0, evaBonus: ts.eva || 0 }, { hit: atkCap }, () => {
        calls += 1;
        return calls === 1 ? (dodgeRoll - 1) / dodgeCap : (sharedAttack - 1) / atkCap;
      });
      const hit = roll.attackRoll >= roll.dodgeRoll;
      emit('region-contest', { regionId: region.id, regionType: region.type, targetId: target.id,
        hit, attackRoll: sharedAttack, dodgeRoll });
      if (!hit) continue;
      for (const tag of region.tags || []) {
        const def = effectDefinition(tag.tag);
        if (!def?.debuff || def.side === 'self' || region.type === 'fog' && tag.tag === '致盲') continue;
        applyDomainTag(region, casterUnit, target, tag);
      }
      applied.push(target.id);
    }
    return applied;
  }
  function blockEffect(caster, target, slot, barrier = interception(ctx, caster.id, target.id)) {
    if (!barrier) return null;
    return emit('barrier-blocked', { barrierId: barrier.id, barrier: structuredClone(barrier), reason: 'barrier-debuff',
      casterId: caster.id, targetId: target.id, slotIndex: slot.index, blockedTag: slot.tag,
      blockedKind: slot.definition.kind, origin: unitCenter(placementsById[caster.id], caster.footprint) });
  }

  function barrierClockSource(barrier) {
    return { casterId: barrier.casterId, skillId: 'area:barrier', effectId: barrier.id };
  }
  function removeBarrierResult(barrier, reason) {
    dispatchClock(state, { type: 'removeStatus', unitId: barrier.casterId, source: barrierClockSource(barrier) });
    emit('barrier-removed', { barrierId: barrier.id, reason, barrier: structuredClone(barrier) });
  }
  function clearRegions() {
    for (const region of ctx.regions.splice(0)) {
      dispatchClock(state, { type: 'removeStatus', unitId: region.casterId,
        source: { casterId: region.casterId, skillId: 'area:' + region.type, effectId: 'region:' + region.type } });
      emit('region-expired', { regionId: region.id });
    }
  }
  function finishBattle(reason = 'battle-ended') {
    clearRegions();
    clearBarriers(ctx).forEach(barrier => removeBarrierResult(barrier, reason));
    if (state.combatState.clock && !state.combatState.clock.terminal) state.combatState.clock.terminal = { type: 'ended', at: ctx.now() };
    resources = null;
    return snapshot();
  }
  function destroy() {
    clearRegions();
    const removed = clearBarriers(ctx);
    removed.forEach(barrier => removeBarrierResult(barrier, 'destroyed'));
    generation++; runId = 'battle:' + instanceId + ':' + generation;
    activeSegment = null;
    attackStack.length = 0;
    resources = null;
    if (state.combatState.clock) state.combatState.clock.terminal = { type: 'destroyed', at: ctx.now() };
    return { ok: true, removed, events: structuredClone(domainEvents) };
  }
  function settleDotDamage(ev, extra = false) {
    const target = byId.get(ev.unitId);
    if (!target || target.ref.hp <= 0) return;
    const damage = Math.min(target.ref.hp, Math.max(1, Number(ev.strength) || 1));
    target.ref.hp -= damage;
    emit('status-tick', { unitId: target.id, casterId: ev.source?.casterId, kind: ev.kind, damage, hpAfter: target.ref.hp,
      layers: buffsOf(target.id).filter(b => b.type === ev.kind).length, ...(extra ? { extra: '推撞' } : {}) });
    addLog(target.name + ' · ' + (ev.kind === 'poison' ? '中毒' : '燃烧') + ' -' + damage + ' HP' + (extra ? '（推撞触发）' : ''));
    if (target.ref.hp <= 0) handleDown(target, 'dot', ev.source?.casterId);
    else runEnemyThresholdVariants(target);
  }
  function settleClockEvent(ev) {
    if (ev.type === 'status-expired') expireBarriers(ctx, ev.t ?? ctx.now()).forEach(barrier => removeBarrierResult(barrier, 'expired'));
    if (ev.type === 'dot-tick' && !ev.suppressed) {
      settleDotDamage(ev);
    } else if (ev.type === 'periodic-tick' && ev.kind === 'region' && !ev.suppressed) {
      const type = String(ev.source?.skillId || '').replace(/^area:/, '');
      const casterUnit = byId.get(ev.unitId);
      const region = (ctx.regions || []).find(r => r.casterId === ev.unitId && r.type === type && (r.endAt == null || r.endAt > (ev.t ?? ctx.now())));
      if (region && casterUnit) runRegionContest(region, casterUnit);
    } else if (ev.type === 'periodic-tick' && ev.kind === 'periodic' && !ev.suppressed) {
      const target = byId.get(ev.unitId);
      if (target && target.ref.hp > 0) {
        target.ref.hp = Math.min(target.ref.maxHp, target.ref.hp + (ev.strength || 0));
      }
    } else if (ev.type === 'stealth-window' && !ev.suppressed) {
      // 隐匿窗口：每 100 时间未受击 +10（P03 映射；受击经 markHit 记录，wasHit=true 本窗口不累积）
      const target = byId.get(ev.unitId);
      if (target && target.ref.hp > 0 && !ev.wasHit) {
        const p = CLASS_PASSIVES['隐匿者'];
        const res = p && p.gainStealth ? p.gainStealth(target, 10, passiveIo(target)) : null;
        if (res) emit('passive-gain', { unitId: target.id, passive: '潜行', kind: 'stealth', value: 10, stealthVal: res.stealthVal, extraTurn: !!res.extraTurn, rush: !!res.rush });
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
      if (i >= 0) {
        const [removed] = list.splice(i, 1);
        emit('status-removed', { unitId: ev.unitId, kind: removed.type });
      }
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
    // 周期收口注册（P03 映射表）：【再生】每100回血10%、隐匿者窗口每100（未受击+10）；敌方大招充能改由自然行动末结算（gainNaturalCharge）
    for (const u of units) {
      if (u.ref.hp <= 0) continue;
      const buffs = buffsOf(u.id);
      if (hasVariantTag(u, '再生', buffs)) {
        dispatchBattleClock({ type: 'applyStatus', unitId: u.id, source: statusSource(u.id, { casterId: u.id, skillId: 'variant:再生' }, 'regen'),
          kind: 'periodic', strength: Math.max(1, Math.floor(u.ref.maxHp * 0.1)), interval: ROUND_TIME });
      }
      if (u.classType === '隐匿者') {
        dispatchBattleClock({ type: 'applyStatus', unitId: u.id, source: statusSource(u.id, { casterId: u.id, skillId: 'stealth-cycle' }, 'window'),
          kind: 'stealth-window', interval: ROUND_TIME });
      }
      runEnemyThresholdVariants(u); // 入场即低血兜底（原版 TURN_START 首回合）：蜕皮/连动
    }
    units.filter(u => u.ref.hp <= 0).forEach(u => dispatchBattleClock({ type: 'exitUnit', unitId: u.id, cause: 'down' }));
  }

  function handleDown(target, cause, sourceId = null) {
    // 复活变种（原版复活流程）：致死时消耗次数复活
    if (canReviveLocal(target)) {
      target.ref.reviveCount -= 1;
      target.ref.hp = Math.max(1, Math.floor(target.ref.maxHp * 0.3)); // 原版 tryReviveEnemy L20844：30% 血复活
      target.ref.shield = 0;
      buffsOf(target.id).splice(0).forEach(b => { if (b._source) dispatchClock(state, { type: 'removeStatus', unitId: target.id, source: b._source }); });
      dispatchBattleClock({ type: 'reenterUnit', unitId: target.id });
      emit('variant-trigger', { attackId: currentAttackId(), unitId: target.id, trigger: 'revive', cause, hpAfter: target.ref.hp });
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
    emit('unit-down', { unitId: target.id, cause, sourceId, isSummon: !!target.isSummon, summonOwnerId: target.summonOwnerId || null,
      position: { ...placementsById[target.id] }, hpAfter: target.ref.hp });
    addLog(target.name + (target.side === 'hero' ? ' 倒地' : ' 死亡'));
    creditEnemyDefeat(target, sourceId);
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
      clearBarriers(ctx).forEach(barrier => removeBarrierResult(barrier, 'battle-ended'));
      addLog(type === 'victory' ? '胜利：敌方已全灭。' : '失败：我方已全部倒地。');
    }
    return state.combatState.clock.terminal;
  }

  function investDelay(prep, offered) {
    const used = Math.min(prep.remaining, offered);
    prep.remaining -= used;
    prep.invested += used;
    prep.ready = prep.remaining === 0;
    return used;
  }
  function canStationaryPrepare() {
    const u = actor(), r = resources;
    return !!(u && r && !state.combatState.clock.terminal && passiveOf(u)?.stationaryPreparation && !r.stationaryUsed
      && r.baseMove > 0 && r.moveRemaining >= r.baseMove - 1e-9);
  }
  function investStationary(u, prep) {
    const spent = resources.moveRemaining;
    resources.moveRemaining = resources.sprintRemaining = 0;
    resources.stationaryUsed = true;
    investDelay(prep, 1);
    addLog(u.name + ' · 【驻足咏唱】消耗 ' + spent.toFixed(1) + 'm 移动 · 蓄力−1');
    emit('preparation-invested', { unitId: u.id, preparationId: prep.id, source: 'stationary', movement: spent, remaining: prep.remaining });
    return spent;
  }
  function investPreparation(u) {
    const charge = chargeState(u.id), prep = charge.preparing;
    if (!prep || prep.ready) return { inventory: 0, main: 0 };
    const inventory = investDelay(prep, charge.inventory);
    charge.inventory -= inventory;
    const main = investDelay(prep, resources.main);
    resources.main -= main;
    if (inventory || main) addLog(u.name + ' 准备 ' + prep.skill.name + ' · 剩余 ' + prep.remaining);
    return { inventory, main };
  }
  // 麻痹行动僵直：每次自然行动掷骰 5%×层数（≤20%），命中消耗一层并跳过本次行动（原版麻痹语义）
  function tryParalyzeSkip(u) {
    const layers = buffsOf(u.id).filter(b => b.type === 'paralyze');
    if (!layers.length) return false;
    const chance = Math.min(20, layers.length * 5);
    if (random() * 100 >= chance) return false;
    emit('status-proc', { unitId: u.id, kind: 'paralyze', layers: layers.length, triggered: true });
    removeBuffRecord(u.id, layers[0]);
    addLog(u.name + ' 麻痹僵直，跳过本次行动（消耗 1 层）');
    return true;
  }
  // 敌方大招充能（原版 executeEnemyTurn）：只认首个 [Charge:N] 技能；AI 单位每个自然行动末 +1，
  // 本次行动开始时已满（应释放大招）则不增长；再动/额外主点/多段/刷新不经过此处，不会重复充能。
  function chargeSkillOf(u) { return (u && u.skills || []).find(s => s && s.charge > 0) || null; }
  function chargeFull(u) {
    const cs = chargeSkillOf(u);
    return !!cs && (chargeState(u.id).current || 0) >= cs.charge;
  }
  function chargeAim(u, skill) {
    return selectChargeAim(ctx, u, effectiveSkill(skill), units.filter(t => t.side !== u.side && activeCombatant(t)));
  }
  function gainNaturalCharge(u) {
    const cs = chargeSkillOf(u);
    if (!cs || !isAiControlled(u) || u.ref.hp <= 0 || !resources || resources.chargeFullAtStart) return;
    const c = chargeState(u.id);
    const next = Math.min((c.current || 0) + 1, cs.charge);
    if (next === (c.current || 0)) return;
    c.current = next;
    const full = next >= cs.charge;
    if (full && !(cs.delay > 0)) {
      const query = chargeAim(u, cs);
      if (query) {
        const { shape, cells, origin, aim } = query;
        c.intent = structuredClone({ shape, cells, origin, aim });
      }
    }
    emit('charge-gained', { unitId: u.id, skillName: cs.name, current: next, max: cs.charge, full });
    addLog('⏳ ' + u.name + ' 充能 ' + next + '/' + cs.charge + (full ? '（已满，待施放【' + cs.name + '】）' : ''));
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
        resources.baseMove = moveDistanceOf(u) * resources.moveQuota;
        resources.moveRemaining = resources.baseMove;
        resources.freeJumpAvailable = firstJumpFree(u);
        resources.moveMultiplier = 1;
        resources.jumpsRemaining = jumpLimit(u);
        resources.chargeFullAtStart = chargeFull(u);
        actionSerial++;
        addLog('t=' + next.time.toFixed(2) + ' · ' + u.name + ' 行动');
        if (tryParalyzeSkip(u)) {
          gainNaturalCharge(u);
          dispatchClock(state, { type: 'endAction', unitId: u.id });
          resources = null;
          continue; // 跳过本次行动，重跑一圈
        }
        if (state.combatState.opportunityUsed) delete state.combatState.opportunityUsed[u.id];
        emit('main-point-received', { unitId: u.id, amount: resources.main, natural: true });
        const ai = isAiControlled(u);
        syncFocus(true);
        if (ai) issueFocus(u);
        if (ai && chargeState(u.id).preparing) { resources.preparationContinued = true; investPreparation(u); }
        if ((u.side === 'hero' && !ai) || (u.side === 'enemy' && ai)) {
          dispatchClock(state, { type: 'recordPacingAction', unitId: u.id, player: !ai });
        }
        return snapshot();
      } else if (next.status === 'terminal') {
        clearBarriers(ctx).forEach(barrier => removeBarrierResult(barrier, 'battle-ended'));
        addLog('僵持：无人可继续行动。'); return snapshot();
      }
    }
  }

  function start() {
    if (resources) return snapshot();
    initClock();
    if (currentId()) {
      const u = actor();
      const r = state.combatState.clock.currentAction.resources;
      resources = r;
      resources.baseMove ??= moveDistanceOf(u) * r.moveQuota;
      resources.moveRemaining ??= resources.baseMove;
      if (resources.moveMultiplier === undefined) resources.moveMultiplier = 1;
      resources.jumpsRemaining ??= r.jumped ? 0 : jumpLimit(u);
      resources.freeJumpAvailable ??= firstJumpFree(u) && !r.jumped && r.jumpsRemaining > 0;
      actionSerial++;
      return snapshot();
    }
    return advance();
  }

  function snapshot(viewerId = null) {
    units.forEach(syncRageResult);
    syncFocus();
    const clock = state.combatState.clock;
    return {
      runId, now: clock?.now || 0, currentId: currentId(), actionSerial, resources: resources ? { moveRemaining: resources.moveRemaining, sprintRemaining: resources.sprintRemaining || 0, main: resources.main, aux: resources.aux, moveMultiplier: resources.moveMultiplier || 1, jumpsRemaining: resources.jumpsRemaining, freeJumpAvailable: resources.freeJumpAvailable, jumped: resources.jumpsRemaining === 0, jumpDistance: Math.ceil(actor().ref.moveDistance / 3) } : null,
      terminal: clock?.terminal ? { ...clock.terminal } : null,
      preparation: clock?.currentAction ? structuredClone(state.combatState.charges?.[clock.currentAction.unitId]?.preparing || null) : null,
      chargeInventory: clock?.currentAction ? (state.combatState.charges?.[clock.currentAction.unitId]?.inventory || 0) : 0,
      focusOrders: structuredClone(state.combatState.focusOrders || {}),
      units: units.map(u => {
        const st = statsOf(u);
        const cs = chargeSkillOf(u);
        const charge = cs && isAiControlled(u) ? chargeState(u.id) : null;
        return { id: u.id, name: u.name, side: u.side, controller: u.controller || (u.side === 'hero' ? 'player' : 'ai'),
          hp: u.ref.hp, mp: u.ref.mp, tp: u.ref.tp || 0, status: u.ref.hp > 0 ? 'active' : u.side === 'hero' ? 'down' : 'dead',
          atk: st.atk, def: st.def, hit: st.hit, eva: st.eva, taunt: st.taunt, spd: st.spd, shield: u.ref.shield || 0,
          charge: charge ? { current: charge.current || 0, max: cs.charge, skillName: cs.name,
            ...(charge.intent && !clock?.terminal && activeCombatant(u) ? { intent: structuredClone(charge.intent) } : {}) } : null,
          buffs: buffsOf(u.id).map(b => ({ type: b.type, value: b.value, variant: b.variant || null, duration: Number.isFinite(b.duration) ? b.duration : null, isConsumable: !!b.isConsumable })) };
      }),
      carrying: structuredClone(state.combatState.carrying || {}),
      positions: structuredClone(placementsById),
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
      classType: u.classType || null, baseTauntBonus: u.ref.baseTauntBonus || 0, isSummon: !!u.isSummon, summonOwnerId: u.summonOwnerId || null,
      hp: u.ref.hp, maxHp: u.ref.maxHp, mp: u.ref.mp, maxMp: u.ref.maxMp, tp: u.ref.tp || 0, maxTp: u.ref.maxTp || 0,
      moveDistance: u.ref.moveDistance, effectiveMoveDistance: moveDistanceOf(u), jumpDistance: Math.ceil(u.ref.moveDistance / 3),
      perception: u.ref.perception, footprint: { ...u.footprint },
      shield: u.ref.shield || 0, atk: st.atk, def: st.def, hit: st.hit, eva: st.eva, taunt: st.taunt, spd: st.spd,
      evasion: u.ref.evasion || 0, stunned: !!state.combatState.clock?.units?.[u.id]?.stun,
      chargeInventory: state.combatState.charges?.[u.id]?.inventory || 0,
      // remaining：时钟真实到期剩余回合（向上取整）；null = 无时限（消耗型/永久）
      buffs: buffsOf(u.id).map(b => { const st = state.combatState.clock?.statuses?.[b._key];
        return { type: b.type, value: b.value, variant: b.variant || null, duration: Number.isFinite(b.duration) ? b.duration : null, isConsumable: !!b.isConsumable, isConcealAtk: !!b.isConcealAtk,
          remaining: st && st.endAt != null ? Math.max(0, Math.ceil((st.endAt - ctx.now()) / ROUND_TIME - 1e-9)) : null }; }) };
  }

  function opportunityAttackers(moverId, from, to) {
    const mover = byId.get(moverId);
    if (passiveOf(mover)?.evadeOpportunity) return [];
    const fp = ctx.footprintsById[moverId];
    let view;
    return state.combatState.clock.order.filter(id => {
      const u = byId.get(id), p = placementsById[id], footprint = ctx.footprintsById[id];
      if (!u || u.side === mover.side || u.ref.hp <= 0 || !p || (state.combatState.opportunityUsed?.[id] && !passiveOf(u)?.unlimitedOpportunity)
        || ctx.carriedUnitIds.has(id) || u.isSubdued || u.ref.isSubdued || state.combatState.clock.units[id]?.stun) return false;
      if (!cellsAdjacent(from, fp, p, footprint) || cellsAdjacent(to, fp, p, footprint)) return false;
      view ||= { ...ctx, placementsById: { ...placementsById, [moverId]: from } };
      return !interception(view, id, moverId) && queryAttack(view, id, OPPORTUNITY_ATTACK,
        { ...unitCenter(from, fp), targetId: moverId }).ok;
    });
  }
  ctx.opportunityAttackers = opportunityAttackers;

  function reachable(avoidFog = false) {
    const resourcesNow = state.combatState.clock?.currentAction?.resources;
    if (resourcesNow && resourcesNow.moveMultiplier === undefined) resourcesNow.moveMultiplier = 1;
    const u = actor(), carrying = (state.combatState.carrying || {})[currentId()];
    const search = isAiControlled(u) ? findRiskAwareReachable : findReachable;
    return u && resources ? search(ctx, u.id, resources.moveRemaining * (resources.moveMultiplier || 1), carrying ? 2 : 1,
      avoidFog ? fogRouteFilter(ctx, u) : null) : { cells: [], byKey: new Map() };
  }
  function previewMove(col, row, avoidFog = false) {
    const cell = reachable(avoidFog).byKey.get(cellKey(col, row));
    if (!cell) return null;
    const multiplier = resources.moveMultiplier || 1;
    const opportunityIds = [...new Set(cell.path.slice(1).flatMap((to, i) => opportunityAttackers(currentId(), cell.path[i], to)))];
    return { ...cell, cost: cell.cost / multiplier, budgetCost: cell.cost, opportunityIds };
  }
  function* beginMove(col, row, avoidFog = false, options = {}) {
    const u = actor(), r = resources, moveRun = runId;
    if (!u || !r || state.combatState.clock.terminal) return { ok: false, reason: '当前不能移动' };
    const cell = previewMove(col, row, avoidFog);
    if (!cell || cell.cost === 0) return { ok: false, reason: '落点不可达' };
    const p = placementsById[u.id], before = r.moveRemaining, multiplier = r.moveMultiplier || 1;
    const from = { ...p }, path = [cell.path[0]], opportunities = [];
    let legStart = 0, legFrom = from, travel = 0, legCost = 0;
    function closeLeg() {
      const tail = path.slice(legStart);
      if (tail.length <= 1) return null;
      const to = tail.at(-1);
      emit('unit-moved', { unitId: u.id, from: legFrom, to, path: tail, distance: legCost, stoppedOnDiscovery: false, discoveredIds: [] });
      const movement = { ok: true, cell: { ...to, path: tail, cost: legCost }, from: legFrom, unitId: u.id };
      legStart = path.length - 1; legFrom = { ...p }; legCost = 0;
      return movement;
    }
    const unable = () => currentId() !== u.id || u.ref.hp <= 0 || state.combatState.clock.units[u.id]?.stun;
    for (const next of cell.path.slice(1)) {
      if (unable()) break;
      const previous = path.at(-1);
      const attackers = opportunityAttackers(u.id, previous, next);
      if (attackers.length) {
        const movement = closeLeg();
        if (movement && options.presentOpportunity) yield { type: 'move-leg', movement };
        for (const id of attackers) {
          if (moveRun !== runId) return { ok: false, reason: '战斗已取消' };
          if (unable() || p.col !== previous.col || p.row !== previous.row) break;
          if (!opportunityAttackers(u.id, previous, next).includes(id)) continue;
          const attacker = byId.get(id), stopsMove = passiveOf(attacker)?.unlimitedOpportunity;
          if (!stopsMove) (state.combatState.opportunityUsed ||= {})[id] = true;
          const result = yield* resolveOpportunity(attacker, u, options);
          if (moveRun !== runId) return { ok: false, reason: '战斗已取消' };
          if (stopsMove && result.hits.some(hit => hit.targetId === u.id && hit.hit)) {
            r.moveRemaining = r.sprintRemaining = 0;
            addLog(attacker.name + ' · 借机攻击截停 ' + u.name + ' 的步行');
            emit('movement-stopped', { unitId: u.id, attackerId: id, reason: 'opportunity' });
          }
          opportunities.push(result);
          if (options.presentOpportunity) yield { type: 'opportunity-result', result };
        }
        if (moveRun !== runId) return { ok: false, reason: '战斗已取消' };
        if (unable() || p.col !== previous.col || p.row !== previous.row) break;
      }
      if (barrierCrossing(ctx, u.id, previous, next)) break;
      const cost = Math.hypot(next.col - previous.col, next.row - previous.row) * (ctx.carrying[u.id] ? 2 : 1)
        / (moveMultiplier(ctx, u.id, previous) * multiplier);
      if (cost > r.moveRemaining + 1e-9) break;
      if (attackers.length) {
        const landing = canPlaceAt(ctx, u.id, next.col, next.row);
        if (!landing.ok && (landing.blockedBy.side !== u.side || next === cell.path.at(-1))) break;
      }
      p.col = next.col; p.row = next.row; p.facing = sideStepFacing(previous, next);
      syncFocus(true);
      path.push(next);
      travel += cost; legCost += cost;
      r.moveRemaining = Math.max(0, r.moveRemaining - cost);
      if (r.sprintRemaining) r.sprintRemaining = Math.max(0, r.sprintRemaining - cost);
    }
    const stopped = path.length < cell.path.length;
    const displayMove = closeLeg();
    if (travel > 0) addLog(u.name + ' 移动 ' + travel.toFixed(2) + 'm');
    if (stopped && opportunities.length) addLog(u.name + ' · 借机打断原移动');
    return { ok: true, stopped, stoppedOnDiscovery: false, discoveredIds: [], displayMove, opportunities,
      events: opportunities.flatMap(result => result.events),
      cell: { ...path.at(-1), cost: travel, budgetCost: travel * multiplier, path }, from, unitId: u.id,
      moveBefore: before, moveAfter: resources === r ? r.moveRemaining : 0 };
  }
  function move(col, row, avoidFog = false, options = {}) {
    const gen = beginMove(col, row, avoidFog, { suppressReactions: true, ...options });
    let step = gen.next();
    while (!step.done) step = gen.next(null);
    return step.value;
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
    if (!u || !resources) return { ok: false, reason: '辅助行动不足' };
    if (resources.jumpsRemaining === 0) return { ok: false, reason: '本次自然行动跳跃次数已用完' };
    if (!resources.freeJumpAvailable && resources.aux + (hasDoubleJump(u) ? 0 : resources.main) < 1) return { ok: false, reason: '辅助行动不足' };
    return findJumpPath(ctx, u.id, col, row, Math.ceil(u.ref.moveDistance / 3));
  }
  function jump(col, row) {
    const q = previewJump(col, row);
    if (!q.ok) return q;
    const u = actor(), r = resources, p = placementsById[u.id];
    const from = { col: p.col, row: p.row, facing: p.facing };
    const last = q.path[q.path.length - 2] || p;
    p.facing = sideStepFacing(last, { col, row });
    p.col = col; p.row = row;
    const free = r.freeJumpAvailable;
    const elite = hasDoubleJump(u);
    if (!free) {
      const { mainCost, auxCost } = actionPayment(r, 0, 1);
      r.main -= mainCost; r.aux -= auxCost;
    }
    r.jumpsRemaining--;
    r.freeJumpAvailable = elite && r.jumpsRemaining === 1;
    emit('unit-jumped', { unitId: u.id, from, to: { col, row }, distance: q.distance, free });
    addLog(u.name + (free ? ' 免费跳跃 ' : ' 跳跃 ') + q.distance.toFixed(2) + 'm');
    const berserker = passiveOf(u)?.landingPush;
    if (elite) {
      const rim = [];
      for (let y = row - 1; y <= row + u.footprint.height; y++) {
        for (let x = col - 1; x <= col + u.footprint.width; x++) {
          if (x < col || y < row || x >= col + u.footprint.width || y >= row + u.footprint.height) rim.push(cellAt(ctx.compiled, x, y));
        }
      }
      breakLowObstacles(rim);
    }
    const displacements = [];
    if (berserker || elite) {
      for (const id of state.combatState.clock.order) {
        if (u.ref.hp <= 0) break;
        const target = byId.get(id);
        if (!target || target === u || target.ref.hp <= 0 || state.combatState.clock.units[id]?.status === 'out' || ctx.carriedUnitIds.has(id) || (!elite && target.side === u.side)) continue;
        if (!adjacent(p, u.footprint, placementsById[id], target.footprint)) continue;
        const contest = pushContest(u, target, elite);
        if (contest.distance > 0) {
          const result = displacement(u, target, { type: '跳砸', distance: contest.distance });
          if (result.type === 'unit-displaced') displacements.push(result);
        }
      }
    }
    return { ...q, from, to: { col, row }, unitId: u.id, moveRemaining: r.moveRemaining, free, displacements };
  }
  function adjacent(a, afp, b, bfp) { return cellsAdjacent(a, afp, b, bfp); }
  function pushContest(u, target, contestAll = false) {
    const strength = Math.max(0, Number(u.ref.strength || 0));
    const weight = Number(target.ref.totalWeight || 0);
    const opposed = contestAll || target.side !== u.side;
    const rollPush = opposed ? Math.floor(random() * strength) + 1 : null;
    const rollResist = opposed ? Math.floor(random() * Math.max(1, Number(target.ref.strength || 0))) + 1 : null;
    const wins = weight < strength * 1.5 && (!opposed || rollPush > rollResist);
    return { distance: wins ? 2 * Math.floor(strength * 1.5 / weight) : 0, rollPush, rollResist };
  }
  function push(targetId) {
    const u = actor(), target = byId.get(targetId);
    if (!u || !resources || resources.aux + resources.main < 1) return { ok: false, reason: '辅助行动不足' };
    if (!target || target.ref.hp <= 0 || target.id === u.id) return { ok: false, reason: '推动目标无效' };
    const up = placementsById[u.id], tp = placementsById[targetId];
    if (!adjacent(up, u.footprint, tp, target.footprint)) return { ok: false, reason: '推动目标必须相邻' };
    const { mainCost, auxCost } = actionPayment(resources, 0, 1);
    resources.main -= mainCost; resources.aux -= auxCost;
    const { distance, rollPush, rollResist } = pushContest(u, target);
    if (!distance) {
      addLog(u.name + ' 推动 ' + target.name + ' 失败');
      return { ok: true, success: false, targetId, rollPush, rollResist, moveDistance: 0 };
    }
    const result = displacement(u, target, { type: '推动', distance });
    return { ...result, ok: true, success: !result.immune, targetId, requestedDistance: distance, movedDistance: result.distance || 0,
      hpAfter: target.ref.hp, down: target.ref.hp <= 0, rollPush, rollResist };
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
    return charges[unitId] || (charges[unitId] = { inventory: 0, preparing: null, current: 0 });
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
    if (item.category === '道具') {
      if (item.maxUses > 0 && (item.usesRemaining ?? item.maxUses) <= 0) return { ok: false, reason: '物品次数已用完' };
    } else if (!(item.count > 0)) return { ok: false, reason: '物品数量不足' };
    return { ok: true };
  }
  function consumeParentItem(unit, skill, costSummary) {
    const item = parentItemFor(unit, skill);
    if (!item) return;
    if (item.category === '道具') {
      if (!(item.maxUses > 0)) return;
      item.usesRemaining = (item.usesRemaining ?? item.maxUses) - 1;
    } else item.count--;
    costSummary.item = { name: item.name, remaining: item.category === '道具' ? item.usesRemaining : item.count };
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
    const key = skillKey(skill), cost = skill.isItem ? ITEM_ACTION_COST : skill.actionCost || { main: 1, aux: 0 };
    const charge = chargeState(u.id), preparing = charge.preparing && charge.preparing.skillKey === key;
    if (skill.isItem && skill.children?.length) return { ok: false, reason: '请选择道具子用法' };
    // 大招充能门槛（原版 validSkills 排除未满 charge 技能，满时只放首个 charge 技能）；玩家操控单位不走自然充能
    if (skill.charge > 0 && isAiControlled(u)) {
      const cs = chargeSkillOf(u);
      if (!cs || skillKey(cs) !== key) return { ok: false, reason: '非主充能技能' };
      if ((charge.current || 0) < cs.charge) return { ok: false, reason: '充能未满（' + (charge.current || 0) + '/' + cs.charge + '）' };
    }
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
    if (skill.delay > 0 && charge.preparing && !preparing) return { ok: false, reason: '请先释放或取消当前准备' };
    const prepSkill = skill.delay > 0;
    const mainCost = prepSkill ? (preparing || skill.isItem ? 0 : 1) : (cost.main || 0);
    const auxCost = prepSkill && (preparing || !skill.isItem) ? 0 : (cost.aux || 0);
    const payment = actionPayment(r, mainCost, auxCost);
    if (!payment.ok) return payment;
    const mpShort = u.ref.mp < (preparing ? 0 : (skill.cost || 0));
    const hpShort = u.ref.hp <= (preparing ? 0 : (skill.hpCost || 0));
    const tpShort = (u.ref.tp || 0) < (preparing ? 0 : (skill.tpCost || 0));
    if (mpShort || hpShort || tpShort) return { ok: false, reason: skill.isItem ? (mpShort ? 'MP不足' : hpShort ? 'HP不足' : 'TP不足') : '数值资源不足' };
    return { ...payment, eff, preparing: !!preparing, ready };
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

  function previewTeleport(unitId, col, row, radius) {
    const from = placementsById[unitId], to = { col, row };
    const distance = Math.hypot(col - from.col, row - from.row);
    if (!(distance > 0 && distance <= radius + 1e-9)) return { ok: false, reason: '落点不在闪现范围内' };
    const fp = ctx.footprintsById[unitId], origin = unitCenter(from, fp), point = unitCenter(to, fp);
    if (distance > sightRadius(ctx, unitId) + 1e-9 || !canSeePoint(ctx, unitId, point)) return { ok: false, reason: '落点不在本人视野内' };
    if (!canPlaceAt(ctx, unitId, col, row).ok) return { ok: false, reason: '闪现落点不是空地' };
    if (barrierCrossing(ctx, unitId, from, to)) return { ok: false, reason: '闪现不能穿越敌方结界' };
    return { ok: true, from: { ...from }, to, path: [{ col: from.col, row: from.row }, to], distance, origin };
  }
  function teleportCells(unitId = currentId(), radius = 5) {
    const p = placementsById[unitId], cells = [];
    if (!p) return cells;
    for (let row = p.row - Math.ceil(radius); row <= p.row + radius; row++) {
      for (let col = p.col - Math.ceil(radius); col <= p.col + radius; col++) {
        if (previewTeleport(unitId, col, row, radius).ok) cells.push({ col, row });
      }
    }
    return cells;
  }
  function commitTeleport(unit, teleport, skill, reaction = false) {
    Object.assign(placementsById[unit.id], teleport.to);
    emit('unit-teleported', { unitId: unit.id, skillName: skill.name, reaction, ...teleport });
    addLog(unit.name + ' · ' + skill.name + ' 闪现 ' + teleport.distance.toFixed(1) + 'm');
    return teleport;
  }

  function previewAttack(skill, aim) {
    const valid = canUseSkill(skill);
    if (!valid.ok) return { ok: false, reason: valid.reason, cells: [], targetIds: [], slotTargets: [] };
    const eff = valid.eff || effectiveSkill(skill);
    const rule = teleportRule(eff);
    if (rule) {
      const col = Math.floor(aim?.x), row = Math.floor(aim?.y);
      const teleport = previewTeleport(currentId(), col, row, rule.distance);
      return { ok: teleport.ok, reason: teleport.reason, teleport: teleport.ok ? teleport : null, origin: teleport.origin,
        aim: { x: col + 0.5, y: row + 0.5 }, cells: teleport.ok ? [teleport.to] : [], targetIds: [], slotTargets: [] };
    }
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
    if (!eff.summonTarget && !skillSlots(eff).some(s => s.definition.kind === 'barrier') && !eff.regionEffect
      && !query.barrierTargetIds?.length && !query.slotTargets.some(s => s.targetIds.length > 0)) {
      const concealAtk = buffsOf(caster.id).filter(b => b.isConcealAtk).reduce((sum, b) => sum + b.value, 0);
      if (!skillSlots(eff).some(slot => terrainAttackCells(caster, eff, slot, query, concealAtk).length)) {
        return { ...query, ok: false, reason: '范围内没有合法目标' };
      }
    }
    return query;
  }
  function aimFacing(query, fallback) {
    if (query.chargePath) {
      const { x, y } = query.chargePath.direction;
      return ((Math.atan2(x, -y) * 180 / Math.PI) + 360) % 360;
    }
    const { aim, origin } = query;
    if (!aim || Math.hypot(aim.x - origin.x, aim.y - origin.y) <= 1e-9) return fallback;
    return ((Math.atan2(aim.x - origin.x, -(aim.y - origin.y)) * 180 / Math.PI) + 360) % 360;
  }
  function previewRetarget(skill, aim, casterId = currentId(), slotIndex) {
    const eff = effectiveSkill(skill);
    const query = queryAttack(ctx, casterId, eff, aim);
    if (!query.ok) return query;
    const facing = aimFacing(query, placementsById[casterId].facing ?? 0);
    const liveAttackSlots = query.slotTargets.filter(s => s.attack && s.targetIds.some(id => byId.get(id).ref.hp > 0));
    const hasTarget = liveAttackSlots.some(s => slotIndex == null || s.index === slotIndex);
    // 面攻允许打空，但不能借其它槽的目标放行当前槽。
    const canFireEmpty = eff.range.type !== '单体' && (slotIndex == null ||
      (!liveAttackSlots.length && query.slotTargets.some(s => s.attack && s.index === slotIndex)));
    if (!hasTarget && !canFireEmpty) {
      return { ...query, facing, ok: false, reason: '范围内没有合法目标' };
    }
    return { ...query, facing };
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
    if (skill.kanpoTarget && responder.side === 'hero') return { ok: true, responder, source };
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
  function guardAvailability(guardian, target, sourceId, skill) {
    if (!guardian || !target || guardian.ref.hp <= 0 || target.ref.hp <= 0 || !byId.get(sourceId)?.ref.hp) return { ok: false, reason: '守护单位不可用' };
    const key = skillKey(skill);
    if (usesLeft(guardian.id, skill) <= 0 || skillCooldownAt(guardian.id, key) > ctx.now() || !hasEnoughBindings(guardian, skill)) return { ok: false, reason: '守护限次、冷却或材料不可用' };
    if (guardian.ref.mp < (skill.cost || 0) || guardian.ref.hp <= (skill.hpCost || 0) || (guardian.ref.tp || 0) < (skill.tpCost || 0)) return { ok: false, reason: '守护资源不足' };
    return previewGuard(ctx, guardian.id, target.id, sourceId, moveDistanceOf(guardian));
  }
  function previewGuardCandidates(targetId, sourceId, incomingSkill) {
    const target = byId.get(targetId);
    if (!target) return [];
    return collectReactionCandidates(target, incomingSkill, incomingSkill.damageType || '近战', sourceId).filter(c => c.guardian);
  }
  function commitGuard(guardian, target, caster, skill, reason, incomingSkill, extra = {}) {
    const checked = guardAvailability(guardian, target, caster.id, skill);
    if (!checked.ok) return null;
    if (checked.targetShift) Object.assign(placementsById[target.id], checked.targetShift.to);
    Object.assign(placementsById[guardian.id], checked.to);
    const rr = reason === 'summon-lethal-guard'
      ? { reactionUsed: emit('reaction-used', { responderId: guardian.id, skillName: skill.name,
        costs: { mp: 0, hp: 0, tp: 0 }, bindings: null, usesLeft: null, cooldownAt: 0 }) }
      : executeReaction(guardian, skill, caster, incomingSkill);
    const guard = { ...checked, reason, finalTargetId: guardian.id, committed: true,
      reactionUsed: rr.reactionUsed, runId, attackId: currentAttackId(), ...activeSegment, ...extra };
    emit('guard-committed', guard);
    return { responderId: guardian.id, guardianId: guardian.id, skillName: skill.name, fxTag: skill.fxTag || null,
      canceled: false, dodged: false, shift: null, guard, reactionUsed: rr.reactionUsed };
  }
  function collectReactionCandidates(target, incomingSkill, incomingType, sourceId, isAttack = true, allowGuardian = true) {
    const out = [];
    for (const s of (target.skills || [])) {
      if ((!s.isReaction && !s.kanpoTarget) || (s.kanpoTarget && target.side === 'hero') || s.sheshenTarget || !reactionSupportFor(s, incomingType, isAttack)) continue;
      if (canUseReaction(target, s, sourceId, incomingType).ok) out.push({ skill: s, responderId: target.id });
    }
    if (allowGuardian && isAttack && incomingSkill.range.type === '单体' && !target.isSummon) {
      for (const guardian of units.filter(u => u.side === target.side && u.id !== target.id && u.ref.hp > 0 && !u.isSummon)) {
        for (const skill of guardian.skills || []) {
          if (!skill.sheshenTarget || !reactionSupportFor(skill, incomingType, true)) continue;
          const guard = guardAvailability(guardian, target, sourceId, skill);
          if (!guard.ok) continue;
          out.push({ skill, responderId: guardian.id, guardian: true, guard });
        }
      }
    }
    return out;
  }
  function* selectKanpo(caster, skill, target, options) {
    if (caster.side !== 'enemy' || options.suppressReactions || options.isReactionTrigger || target?.isSummon && skill.range.type === '单体') return null;
    const incomingType = skill.damageType || '近战';
    const candidates = units.filter(u => u.side === 'hero' && !isAiControlled(u) && !u.isSummon && !u.isSubdued && !u.ref.isSubdued)
      .flatMap(u => (u.skills || []).filter(s => s.kanpoTarget && canUseReaction(u, s, caster.id, incomingType).ok)
        .map(s => ({ skill: s, responderId: u.id, usesLeft: usesLeft(u.id, s), cost: s.cost || 0,
          bindings: itemBindingsFor(u, s).map(b => ({ item: b.item.name, category: b.item.category, cost: b.cost,
            remaining: b.item.category === '道具' ? (b.item.usesRemaining ?? b.item.maxUses ?? 0) : (b.item.count || 0) })) })));
    if (!candidates.length) return null;
    const request = { type: 'kanpo', runId, attackId: currentAttackId(), responderId: target?.id || null,
      targetId: target?.id || null, casterId: caster.id, skill, incomingType, candidates };
    emit('kanpo-request', { casterId: caster.id, targetId: request.targetId });
    const choice = options.autoAnswer ? options.autoAnswer(request) : yield request;
    if (request.runId !== runId) return null;
    const selected = candidates.find(c => c.skill === choice?.skill && c.responderId === (choice.responderId || target?.id));
    if (!selected) return null;
    const responder = byId.get(selected.responderId);
    if (!canUseReaction(responder, selected.skill, caster.id, incomingType).ok) return null;
    const rr = executeReaction(responder, selected.skill, caster, skill);
    const result = { responderId: responder.id, skillName: selected.skill.name, fxTag: selected.skill.fxTag || null,
      canceled: true, kanpo: true, drained: rr.drained, reactionUsed: rr.reactionUsed };
    emit('kanpo-resolved', { casterId: caster.id, ...result });
    return result;
  }
  function* selectReaction(target, caster, skill, incomingType, options, segment = {}, isAttack = true, allowGuardian = true) {
    const candidates = collectReactionCandidates(target, skill, incomingType, caster.id, isAttack, allowGuardian);
    if (!candidates.length || options.suppressReactions) return null;
    const request = { type: 'reaction', runId, attackId: currentAttackId(), ...activeSegment, responderId: target.id, casterId: caster.id, skill, incomingType,
      candidates: candidates.map(c => ({ ...c, usesLeft: usesLeft(c.responderId, c.skill), cost: c.skill.cost || 0,
        bindings: itemBindingsFor(byId.get(c.responderId), c.skill).map(b => ({ item: b.item.name, category: b.item.category, cost: b.cost,
          remaining: b.item.category === '道具' ? (b.item.usesRemaining ?? b.item.maxUses ?? 0) : (b.item.count || 0) })) })), ...segment };
    emit('reaction-request', { attackId: currentAttackId(), targetId: target.id, slotIndex: segment.slotIndex });
    let choice;
    if (options.autoAnswer) choice = options.autoAnswer(request);
    else if ((target.controller || (target.side === 'hero' ? 'player' : 'ai')) === 'ai') choice = { responderId: candidates[0].responderId, skill: candidates[0].skill };
    else choice = yield request;
    if (request.runId !== runId) return null;
    const selected = candidates.find(c => c.skill === choice?.skill && c.responderId === (choice.responderId || target.id));
    if (!selected) return null;
    const responder = byId.get(selected.responderId);
    if (selected.guardian) return commitGuard(responder, target, caster, selected.skill, 'selected-guard', skill);
    if (!canUseReaction(responder, selected.skill, caster.id, incomingType).ok) return null;
    const rr = executeReaction(responder, selected.skill, caster, skill);
    let shift = null;
    if (rr.dodged && selected.skill.name === '折影步') {
      const cells = teleportCells(responder.id, 2);
      if (cells.length) {
        const request = { type: 'teleport', runId, attackId: currentAttackId(), unitId: responder.id, cells, candidates: [] };
        const choice = options.autoAnswer ? options.autoAnswer(request) : isAiControlled(responder) ? cells[0] : yield request;
        if (request.runId !== runId) return null;
        if (choice && cells.some(c => c.col === choice.col && c.row === choice.row)) {
          const landing = previewTeleport(responder.id, choice.col, choice.row, 2);
          if (landing.ok) shift = commitTeleport(responder, landing, selected.skill, true);
        }
      }
    }
    return { responderId: responder.id, skillName: selected.skill.name, fxTag: selected.skill.fxTag || null,
      canceled: !!rr.canceled, dodged: !!rr.dodged, shift, countered: !!rr.countered, counterDamage: rr.counterDamage || null,
      kanpo: !!selected.skill.kanpoTarget, crit: !!rr.crit, drained: rr.drained || 0,
      reactionUsed: rr.reactionUsed, guardianId: null };
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
    const bindings = consumeBindings(responder, rskill);
    notifyManaSpent(responder, rskill.cost || 0);
    if (rskill.cooldownTurns > 0) dispatchClock(state, { type: 'applyCooldown', unitId: responder.id, skillKey: key, duration: rskill.cooldownTurns * ROUND_TIME });
    const reactionUsed = emit('reaction-used', { attackId: currentAttackId(), responderId: responder.id, skillName: rskill.name,
      costs: { mp: rskill.cost || 0, hp: rskill.hpCost || 0, tp: rskill.tpCost || 0 }, bindings,
      usesLeft: usesLeft(responder.id, rskill), cooldownAt: skillCooldownAt(responder.id, key) });
    addLog(responder.name + ' 反应 · ' + rskill.name);
    const rCrit = rollSkillCrit(responder, rskill);
    // 看破：整个来袭技能被无效化（先于其它槽位）
    if (rskill.kanpoTarget) {
      const drainedEffects = [];
      if (rskill.reactionSource) {
        const sourceSlot = skillSlots(rskill).filter(s => s.definition.kind === 'drainMp');
        for (const slot of sourceSlot) {
          const applied = applyBattleEffect({ caster: responder, slot, targets: [attacker], skill: rskill, skillKey: key, multiplier: rCrit.multiplier });
          drainedEffects.push(...applied.applied);
        }
      }
      addLog('⛔ ' + responder.name + ' 施展【' + rskill.name + '】看穿了敌方气路，【' + incomingSkill.name + '】被彻底无效化！');
      return { ok: true, canceled: true, dodged: false, shift: null, crit: rCrit.crit, reactionUsed, fxTag: rskill.fxTag || null,
        drained: drainedEffects.reduce((n, e) => n + (e.drained || 0), 0), effects: drainedEffects };
    }
    const slots = skillSlots(effectiveSkill(rskill));
    const selfTargets = slots.filter(s => s.target === 'self' || s.definition.side === 'self' || s.definition.side === 'ally' || s.definition.side === 'default')
      .map(s => ({ slot: s, targets: [responder] }));
    for (const { slot, targets } of selfTargets) {
      if (slot.attack) continue; // 反击槽不走 applyEffectSlot
      if (slot.definition.kind === 'counter') continue;
      applyBattleEffect({ caster: responder, slot, targets, skill: rskill, skillKey: key, multiplier: rCrit.multiplier });
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
      if (dodged) addLog(responder.name + ' 反应闪避成功');
      return { ok: true, canceled: false, dodged, crit: rCrit.crit, reactionUsed };
    }
    // 反击槽反应：立即反击（威力=槽 power 加成）
    const counterSlot = slots.find(s => s.definition.kind === 'counter');
    if (counterSlot) {
      const counterDamage = counterStrike(responder, attacker, counterSlot.power, rCrit.multiplier);
      return { ok: true, canceled: false, dodged: false, countered: true, counterDamage, crit: rCrit.crit, reactionUsed };
    }
    return { ok: true, canceled: false, dodged: false, shift: null, crit: rCrit.crit, reactionUsed };
  }
  // 反击：无独立命闪（原版口径），近战类型直接走减伤管线
  function counterStrike(defender, attacker, bonusPower, multiplier = 1) {
    if (attacker.ref.hp <= 0 || defender.ref.hp <= 0) return null;
    const dStats = statsOf(defender);
    const raw0 = (bonusPower + dStats.atk) * multiplier;
    const resistance = {};
    const raw = applyTypeResist(raw0, '近战', false, attacker, buffsOf(attacker.id), resistance);
    const counterReflection = interception(ctx, defender.id, attacker.id);
    if (counterReflection) {
      const hit = resolveBarrierDamage(defender, counterReflection, { index: 'counter', definition: {} }, passiveSeq(), 1, multiplier,
        '近战', { barrierTargets: { [attacker.id]: counterReflection } }, unitCenter(placementsById[attacker.id], attacker.footprint), raw0);
      return { hpDmg: 0, shieldDmg: 0, barrierId: counterReflection.id, barrierHitId: hit.barrierHitId };
    }
    const aStats = statsOf(attacker);
    const hpBefore = attacker.ref.hp, maxHp = attacker.ref.maxHp, shieldBefore = attacker.ref.shield || 0;
    const { hpDmg, shieldDmg } = calculateDamage(raw, { def: aStats.def, shield: shieldBefore }, { defending: isDefending(attacker) });
    if (shieldDmg > 0) attacker.ref.shield = Math.max(0, shieldBefore - shieldDmg);
    const shieldAfter = attacker.ref.shield || 0;
    attacker.ref.hp = Math.max(0, hpBefore - hpDmg);
    const hpAfter = attacker.ref.hp;
    addLog('⚔️ ' + defender.name + ' 闪避并趁势反击！' + attacker.name + ' -' + hpDmg + ' HP' + (shieldDmg ? '（破盾' + shieldDmg + '）' : ''));
    if (defender.classType === '防守者' && (hpDmg > 0 || shieldDmg > 0)) {
      defender.ref.baseTauntBonus = (defender.ref.baseTauntBonus || 0) + 20;
      emit('passive-gain', { unitId: defender.id, passive: '防守反击', kind: 'taunt', value: 20 });
      addLog('🛡️ ' + defender.name + ' 的防守反击吸引了更多仇恨（嘲讽值永久+20）');
    }
    if (attacker.ref.hp <= 0) handleDown(attacker, 'counter', defender.id);
    const result = { targetId: attacker.id, casterId: defender.id, maxHp, hpBefore, hpAfter, shieldBefore, shieldAfter,
      incomingDmg: raw, hpDmg, shieldDmg, rawDmg: raw, resistance, reason: 'counter' };
    emit('reaction-damage', result);
    return result;
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
    const resistance = {};
    const raw = applyTypeResist(stats.atk * 2, '近战', false, attacker, buffsOf(attacker.id), resistance);
    const counterReflection = interception(ctx, defender.id, attacker.id);
    if (counterReflection) {
      const hit = resolveBarrierDamage(defender, counterReflection, { index: 'power-counter', definition: {} }, passiveSeq(), 1, 1,
        '近战', { barrierTargets: { [attacker.id]: counterReflection } }, unitCenter(placementsById[attacker.id], attacker.footprint), stats.atk * 2);
      return { hpDmg: 0, shieldDmg: 0, barrierId: counterReflection.id, barrierHitId: hit.barrierHitId };
    }
    const aStats = statsOf(attacker);
    const hpBefore = attacker.ref.hp, maxHp = attacker.ref.maxHp, shieldBefore = attacker.ref.shield || 0;
    const { hpDmg, shieldDmg } = calculateDamage(raw, { def: aStats.def, shield: shieldBefore }, { defending: isDefending(attacker) });
    if (shieldDmg > 0) attacker.ref.shield = Math.max(0, shieldBefore - shieldDmg);
    const shieldAfter = attacker.ref.shield || 0;
    attacker.ref.hp = Math.max(0, hpBefore - hpDmg);
    const hpAfter = attacker.ref.hp;
    addLog('⚔️ ' + defender.name + ' 发动【强力反击】！' + attacker.name + ' -' + hpDmg + ' HP');
    const granted = passive.onPowerCounter ? passive.onPowerCounter(defender) : null;
    if (granted && granted.resetTaunt) {
      const list = buffsOf(defender.id);
      list.filter(b => b.type === 'taunt').forEach(b => removeBuffRecord(defender.id, b));
      defender.ref.baseTauntBonus = 100;
    }
    if (attacker.ref.hp <= 0) handleDown(attacker, 'counter', defender.id);
    emit('reaction-damage', { targetId: attacker.id, casterId: defender.id, maxHp, hpBefore, hpAfter, shieldBefore, shieldAfter,
      incomingDmg: raw, hpDmg, shieldDmg, rawDmg: raw, resistance, reason: 'power-counter' });
    if (granted?.knockback && hpAfter > 0 && hpAfter < hpBefore) {
      displacement(defender, attacker, { type: '击退', steps: granted.knockback });
    }
    return true;
  }
  function resolveDodgeCounter(defender, attacker, incomingType) {
    if (tryPowerCounter(defender, attacker)) return true;
    if (incomingType !== '近战') return false;
    const counterBuff = buffsOf(defender.id).find(b => b.type === 'counter');
    if (!counterBuff) return false;
    counterStrike(defender, attacker, counterBuff.value);
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
          portraitName: data.portraitName, emoji: data.emoji, img: data.img, avatarUrl: data.avatarUrl,
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

  function stabilizerOf(caster, target, type) {
    if (caster.side === target.side || type === '拉近') return null;
    const center = unitCenter(placementsById[target.id], target.footprint);
    return units.find(u => {
      const radius = passiveOf(u)?.stabilizeRadius;
      if (!radius || u.side !== target.side || u.ref.hp <= 0 || ctx.carriedUnitIds.has(u.id) || state.combatState.clock.units[u.id]?.status === 'out') return false;
      const p = unitCenter(placementsById[u.id], u.footprint);
      return Math.hypot(p.x - center.x, p.y - center.y) <= radius + 1e-9;
    });
  }
  function terrainAttackCells(caster, skill, slot, query, concealAtk = 0) {
    if (!slot.attack || query.chargePath || !(skill.range.type === '爆炸'
      || skill.range.type === '直线' && (skill.isPierce || slot.definition.pierce))) return [];
    const stats = statsOf(caster, concealAtk);
    const raw = computeSegmentRawDamage(stats, caster.ref.atk, slot.power, 1, 1, {
      modifyDamageDealt: () => passiveOf(caster)?.modifyDamageDealt?.(caster, skill, stats) || 0,
    });
    if (raw <= 100) return [];
    // 先锁定本段可破坏的格；击破结界也不能让同一段溢入内部。
    return query.cells.map(({ col, row }) => cellAt(ctx.compiled, col, row)).filter(cell => {
      if (!cell?.lowObstacle || cell.blocksProjectile) return false;
      const barrier = barrierAt(ctx, cell);
      return !barrier || barrier.side === caster.side || occupiedCells(placementsById[caster.id], caster.footprint)
        .every(p => barrierAt(ctx, p) === barrier);
    });
  }
  function breakLowObstacles(cells, sectional = false) {
    const hits = new Map();
    for (const cell of cells) {
      if (!cell?.lowObstacle || cell.blocksProjectile) continue;
      for (const id of cell.objectIds) {
        if (!isLowObstacleKind(ctx.compiled.objectsIndex.get(id)?.kind)) continue;
        if (!hits.has(id)) hits.set(id, new Set());
        hits.get(id).add(cellKey(cell.col, cell.row));
      }
    }
    if (!hits.size) return;
    const objects = ctx.scene.objects.flatMap(obj => {
      const struck = hits.get(obj.id);
      if (!struck) return [obj];
      if (!sectional || (obj.kind !== 'lowCounter' && obj.kind !== 'pew')) return [];
      const rest = (obj.cells || occupiedCells(obj.bounds, obj.bounds)).filter(c => !struck.has(cellKey(c.col, c.row)));
      return rest.length ? [{ ...obj, cells: rest }] : [];
    });
    ctx.scene = { ...ctx.scene, objects };
    ctx.compiled = compileScene(ctx.scene);
    emit('obstacle-destroyed', { objectIds: [...hits.keys()] });
  }
  function displacement(caster, target, rule, query, direction = null, chargeStep) {
    const protector = stabilizerOf(caster, target, rule.type);
    if (protector) {
      addLog(protector.name + ' 的圣职者光环保护 ' + target.name + ' · 免疫' + rule.type);
      return emit('displacement-immune', { unitId: target.id, casterId: caster.id, protectorId: protector.id, mode: rule.type, immune: true });
    }
    const p = placementsById[target.id];
    const from = { col: p.col, row: p.row, facing: p.facing };
    const tc = unitCenter(p, target.footprint);
    const origin = rule.direction === '爆心向外' ? (query.blastCenter || query.origin) : unitCenter(placementsById[caster.id], caster.footprint);
    const vector = direction || { x: tc.x - origin.x, y: tc.y - origin.y };
    const reverse = rule.type === '拉近' ? -1 : 1;
    const angle = Math.round(Math.atan2(vector.y * reverse, vector.x * reverse) / (Math.PI / 4)) * Math.PI / 4;
    const dir = { x: Math.round(Math.cos(angle)), y: Math.round(Math.sin(angle)) };
    const distance = rule.steps ? rule.steps * Math.hypot(dir.x, dir.y) : rule.distance;
    const traced = traceDisplacement(ctx, target.id, dir, distance);
    const to = traced.path[traced.path.length - 1] || from;
    p.col = to.col; p.row = to.row;
    const logIndex = log.length;
    let collision = null;
    const blocked = traced.blockedBy;
    if (blocked && blocked.type !== 'barrier' && distance - traced.distance > 1e-9) {
      const low = blocked.cell?.lowObstacle && !blocked.cell.blocksProjectile;
      if (low) breakLowObstacles([blocked.cell]);
      const view = { ...target.ref, def: statsOf(target).def };
      collision = { ...applyCollisionDamage((distance - traced.distance) * (low ? 5 : 10), view),
        hpBefore: target.ref.hp, maxHp: target.ref.maxHp, shieldBefore: target.ref.shield || 0 };
      target.ref.hp = view.hp; target.ref.shield = view.shield;
      if (target.ref.hp <= 0) handleDown(target, 'collision', caster.id);
      collision.hpAfter = target.ref.hp;
      collision.shieldAfter = target.ref.shield;
    }
    addLog(target.name + ' ' + rule.type + ' ' + traced.distance.toFixed(2) + 'm' + (collision ? ' · 碰撞-' + collision.hpDmg : ''));
    const move = emit('unit-displaced', { attackId: currentAttackId(), casterId: caster.id, unitId: target.id, mode: rule.type,
      from, to: { col: p.col, row: p.row }, requestedDistance: distance, distance: traced.distance, path: traced.path,
      blockedBy: blocked, collision, logIndex, logEnd: log.length, ...(chargeStep == null ? {} : { chargeStep }) });
    if (passiveOf(caster)?.pushTicksDots && caster.side !== target.side && (rule.type === '推动' || rule.type === '击退')) {
      const statuses = state.combatState.clock.statuses;
      for (const [key, status] of Object.entries(statuses)) {
        if (statuses[key] === status && status.unitId === target.id && (status.kind === 'poison' || status.kind === 'burn')) settleDotDamage(status, true);
      }
    }
    return move;
  }
  function applySkillDisplacements(caster, skill, query, hits, direction = null, chargeStep) {
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
      for (const hit of targets) hit.displacement = displacement(caster, byId.get(hit.targetId), rule, query, direction, chargeStep);
    }
  }
  function rollSkillCrit(caster, skill) {
    const passive = CLASS_PASSIVES[caster.classType] || null;
    const cStats = statsOf(caster);
    const critRate = Math.max(0, Math.min(100, (skill.critRate || 0) + (passive && passive.modifyCritRate ? passive.modifyCritRate(caster, null, cStats, null, buffsOf(caster.id)) : 0)));
    const crit = critRate > 0 && random() * 100 < critRate;
    if (crit) addLog('💥 ' + caster.name + ' 触发暴击（' + Math.floor(critRate) + '%）！');
    return { crit, critRate, multiplier: crit ? 2 : 1 };
  }
  function* resolveCharge(caster, skill, query, slots, ledger, canceled, options, skillMultiplier = 1) {
    const rule = skill.displacements.find(d => d.type === '冲锋');
    const pathQuery = query.chargePath;
    const visited = new Set(), hits = [], hitMap = new Map(), effects = [], path = [pathQuery.from];
    const position = placementsById[caster.id];
    const stopped = () => canceled.value || caster.ref.hp <= 0 || state.combatState.clock.units[caster.id]?.stun;
    for (const step of pathQuery.steps) {
      if (stopped()) break;
      const entering = new Set(step.cells.map(c => cellKey(c.col, c.row)));
      const contactTargets = units.filter(u => u.side !== caster.side && u.ref.hp > 0 && !ctx.carriedUnitIds?.has(u.id) &&
        occupiedCells(placementsById[u.id], ctx.footprintsById[u.id]).some(c => entering.has(cellKey(c.col, c.row))));
      const chargeStep = path.length;
      path.push({ col: step.col, row: step.row });
      for (const target of contactTargets) {
        if (visited.has(target.id) || target.ref.hp <= 0) continue;
        visited.add(target.id);
        const contactHits = [];
        for (const slot of sortSlotsForResolve(slots)) {
          if (slot.attack) {
            const seg = yield* resolveAttackSegment({ caster, target, slot, skill, baseSkill: skill, slotIndex: slot.index,
              segmentIndex: visited.size, shotIndex: visited.size, totalShots: slots.filter(s => s.attack).length,
              bdg: ledger, canceled, incomingType: skill.damageType || '近战', isAoE: true,
              options: { ...options, skipSpatialRecheck: true }, skillMultiplier });
            if (seg) contactHits.push({ targetId: seg.targetId, hit: seg.hit, hpDmg: seg.hpDmg, hpBefore: seg.hpBefore, hpAfter: seg.hpAfter, down: seg.down, segments: [{ ...seg, chargeStep }] });
          } else if (!slot.debuff || ledger.targetHit[target.id]) {
            effects.push(...applyBattleEffect({ caster, slot, targets: [target], skill, skillKey: skillKey(skill), multiplier: skillMultiplier }).applied);
          }
          if (canceled.value || caster.ref.hp <= 0) break;
        }
        applySkillDisplacements(caster, skill, query, contactHits, pathQuery.direction, chargeStep);
        for (const hit of contactHits) {
          const prior = hitMap.get(hit.targetId);
          if (!prior) { hitMap.set(hit.targetId, hit); hits.push(hit); continue; }
          prior.hit ||= hit.hit;
          prior.hpDmg += hit.hpDmg;
          prior.hpAfter = hit.hpAfter;
          prior.down = hit.down;
          prior.segments.push(...hit.segments);
        }
        if (stopped()) break;
      }
      if (stopped()) break;
      if (canPlaceAt(ctx, caster.id, step.col, step.row).ok) {
        position.col = step.col; position.row = step.row;
      }
    }
    // 中途允许穿越占格，演出仍扫到最远处，再回到最后可站立的格。
    const end = path[path.length - 1];
    if (end.col !== position.col || end.row !== position.row) path.push({ col: position.col, row: position.row });
    emit('unit-charged', { attackId: currentAttackId(), unitId: caster.id, from: pathQuery.from,
      to: { col: position.col, row: position.row }, path, requestedDistance: rule.distance,
      distance: Math.hypot(position.col - pathQuery.from.col, position.row - pathQuery.from.row) });
    return { hits, effects, path };
  }

  function* resolveOpportunity(attacker, mover, options) {
    const attackRun = runId, skill = OPPORTUNITY_ATTACK;
    const aim = { ...unitCenter(placementsById[mover.id], mover.footprint), targetId: mover.id };
    const query = queryAttack(ctx, attacker.id, skill, aim), logFrom = log.length;
    const attack = openAttack(attacker, skill);
    try {
      emit('opportunity-attack', { attackerId: attacker.id, targetId: mover.id, from: { ...placementsById[mover.id] } });
      addLog(attacker.name + ' 对 ' + mover.name + ' 发动借机攻击');
      const seg = yield* resolveAttackSegment({ caster: attacker, target: mover, slot: OPPORTUNITY_SLOT, skill, baseSkill: skill,
        slotIndex: 0, segmentIndex: 1, shotIndex: 1, totalShots: 1, bdg: { targetHit: {}, targetResolved: {} }, canceled: { value: false },
        incomingType: '近战', isAoE: false, options: { ...options, isReactionTrigger: true } });
      const hits = seg ? [{ ...seg, segments: [seg] }] : [];
      return { ok: true, opportunity: true, runId: attackRun, attackId: attack.id, casterId: attacker.id, skill, query, aim,
        hits, effects: [], ammoEvents: [], logFrom, logTo: log.length, incomingType: '近战',
        events: domainEvents.filter(ev => ev.attackId === attack.id && ev.runId === attackRun) };
    } finally {
      if (attackRun === runId) {
        closeAttack(attack);
        activeSegment = null;
      }
    }
  }

  // ---------- 攻击主链（generator：反应选择通过 yield 与调用方交互） ----------
  function failAttack(reason, extra = {}) {
    return Object.assign({ ok: false, reason, hits: [], effects: [], events: [], ammoEvents: [], logFrom: log.length, logTo: log.length }, extra);
  }

  function startPreparation(skill, { stationary = false } = {}) {
    if (!(skill?.delay > 0)) return failAttack('该技能无需蓄力');
    const valid = canUseSkill(skill);
    if (!valid.ok) return failAttack(valid.reason);
    const u = actor(), charge = chargeState(u.id);
    if (charge.preparing) return failAttack('当前已有蓄力');
    if (stationary && !canStationaryPrepare()) return failAttack('需要满额移动，且本次行动未驻足');
    const r = resources, key = skillKey(skill), logFrom = log.length, eventFrom = domainEvents.length;
    const costSummary = { main: valid.mainCost, aux: valid.auxCost, mp: skill.cost || 0, hp: skill.hpCost || 0,
      tp: skill.tpCost || 0, uses: 0, bindings: null, ammoShots: 0 };
    r.main -= costSummary.main; r.aux -= costSummary.aux;
    u.ref.mp -= costSummary.mp; u.ref.hp -= costSummary.hp;
    u.ref.tp = (u.ref.tp || 0) - costSummary.tp;
    if (skill.maxUses > 0) {
      if (!state.perBattleUses) state.perBattleUses = {};
      const uses = state.perBattleUses[u.id] || (state.perBattleUses[u.id] = {});
      uses[key] = (uses[key] || 0) + 1; costSummary.uses = 1;
    }
    costSummary.bindings = consumeBindings(u, skill);
    consumeParentItem(u, skill, costSummary);
    if (skill.cooldownTurns > 0) dispatchClock(state, { type: 'applyCooldown', unitId: u.id, skillKey: key, duration: skill.cooldownTurns * ROUND_TIME });
    const prep = charge.preparing = { id: 'prepare:' + passiveSeq(), skillKey: key, skill: structuredClone(skill),
      remaining: skill.delay, invested: 0, source: 'delay', ready: false };
    r.preparationContinued = true;
    if (stationary) costSummary.movement = investStationary(u, prep);
    notifyManaSpent(u, costSummary.mp, prep);
    const { main } = investPreparation(u);
    if (main || skill.isItem) costSummary.preparationMain = main;
    addLog(u.name + ' 声明蓄力 ' + skill.name + ' · 剩余 ' + prep.remaining);
    return { ok: true, preparing: true, charge: { preparing: true, ready: prep.ready, kind: 'delay' }, hits: [], effects: [],
      events: domainEvents.slice(eventFrom), ammoEvents: [], casterId: u.id, skill, costSummary, logFrom, logTo: log.length };
  }

  function* beginAttack(skill, aim, options = {}) {
    const u = actor();
    if (!u) return failAttack('当前不能使用技能');
    if (skill?.delay > 0 && !chargeState(u.id).preparing) return startPreparation(skill, options);
    const query = previewAttack(skill, aim);
    if (!query.ok) return failAttack(query.reason, { query });
    const attackRun = runId;
    const attack = openAttack(u, skill);
    try {
      const result = yield* resolveAction(skill, query.aim, options);
      return { ...result, runId: attackRun, attackId: attack.id, events: domainEvents.filter(ev => ev.attackId === attack.id && ev.runId === attackRun) };
    } finally {
      if (attackRun === runId) {
        closeAttack(attack);
        activeSegment = null;
      }
    }
  }
  function* resolveAction(skillInput, aim, options = {}) {
    const actionRun = runId;
    const skill = skillInput;
    const u = actor();
    const logFrom = log.length;
    const valid = canUseSkill(skill);
    if (!valid.ok) return failAttack(valid.reason);
    const eff = valid.eff || effectiveSkill(skill);
    const query = previewAttack(skill, aim);
    if (!query.ok) return failAttack(query.reason, { query });
    // 规范槽视图（skillSlots）合并空间结果（query.slotTargets 提供各槽 targetIds）
    const slots = skillSlots(eff).map(s => Object.assign({}, s, { targetIds: query.slotTargets.find(slot => slot.index === s.index)?.targetIds || [] }));
    const key = skillKey(skill);
    const charge = chargeState(u.id);
    const preparing = charge.preparing && charge.preparing.skillKey === key;
    const prepReady = preparing && charge.preparing.remaining <= 0;
    const prepKind = skill.delay > 0 ? 'delay' : null;
    const chargeInfo = { preparing: !!preparing, ready: prepReady, kind: prepKind };
    const chargeRelease = skill.charge > 0 && isAiControlled(u);
    const costSummary = { main: 0, aux: 0, mp: 0, hp: 0, tp: 0, uses: 0, bindings: null, ammoShots: 0 };

    // 目标与槽位校验（召唤技能允许无目标槽位；纯空目标才拒绝）
    const damageSlots = slots.filter(s => s.attack);
    for (const slot of slots) {
      if (slot.definition.kind === 'barrier') {
        const check = previewBarrier(ctx, u.id, eff, query);
        if (!check.ok) return failAttack(check.reason, { query });
      }
    }
    const allTargets = [...new Set(slots.flatMap(s => s.targetIds || []))];

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
    // 大招释放：预检通过并付费后清空充能；看破取消效果，不返还施法成本。
    if (chargeRelease) {
      charge.current = 0;
      delete charge.intent;
      emit('charge-released', { attackId: currentAttackId(), unitId: u.id, skillName: skill.name, max: skill.charge, aim: query.aim });
      addLog('⚠️ ' + u.name + ' 释放致命一击！【' + skill.name + '】');
    }
    // 冷却（独立字段 [冷却:N]，延迟不再当冷却）
    if (skill.cooldownTurns > 0 && !preparing) dispatchClock(state, { type: 'applyCooldown', unitId: u.id, skillKey: key, duration: skill.cooldownTurns * ROUND_TIME });

    if (query.teleport) {
      const teleport = commitTeleport(u, query.teleport, skill);
      u.ref.tp = Math.min(u.ref.maxTp || 100, (u.ref.tp || 0) + 5);
      return { ok: true, teleport, hits: [], effects: [], events: [], ammoEvents: [], query, casterId: u.id, skill,
        aim: { ...query.aim }, costSummary, logFrom, logTo: log.length };
    }

    const kanpoType = skill.damageType || '近战';
    const kanpoTarget = byId.get(query.aim?.targetId || allTargets[0]);
    const kanpo = yield* selectKanpo(u, eff, kanpoTarget, options);
    if (actionRun !== runId) return failAttack('战斗已经重置');
    if (kanpo) {
      if (preparing) charge.preparing = null;
      return { ok: true, canceled: true, kanpo, hits: [], shots: [], effects: [], ammoEvents: [], summons: [],
        query, casterId: u.id, skill, aim: { ...aim }, incomingType: kanpoType, costSummary, charge: chargeInfo, logFrom, logTo: log.length };
    }

    const isAoE = ['直线', '扇形', '圆形', '全域', '爆炸'].includes(eff.range.type);
    const isCharge = eff.displacements?.some(d => d.type === '冲锋');
    let concealAtk = 0;
    if (!skill.isReaction && !options.isReactionTrigger && damageSlots.length
      && (isAoE || isCharge || query.barrierTargetIds?.length || damageSlots.some(s => s.targetIds.length))) {
      // 释放时锁进本次攻击账本；途中新授急袭不再参与这一击。
      const pending = buffsOf(u.id).filter(b => b.isConcealAtk);
      for (const b of pending) { concealAtk += b.value; removeBuffRecord(u.id, b); }
      if (pending.length) addLog('🎯 ' + u.name + ' 的隐匿急袭已释放，攻击力加成消失。');
    }

    // 召唤（召唤物立即占位、可被选为目标，从零跑完整圈；临时 AI 不进玩家弹窗）
    const summons = skill.summonTarget ? spawnSummons(eff, u, {}, query) : [];
    let createdRegion = null;
    if (skill.regionEffect) {
      const type = skill.regionEffect.type || 'fog';
      const clockSource = { casterId: u.id, skillId: 'area:' + type, effectId: 'region:' + type };
      dispatchClock(state, { type: 'removeStatus', unitId: u.id, source: clockSource });
      createdRegion = createRegion(ctx, { caster: u, skill: eff, query, now: ctx.now(), type });
      dispatchBattleClock({ type: 'applyStatus', unitId: u.id, source: clockSource,
        kind: 'region', duration: (createdRegion.endAt - ctx.now()) });
      emit('region-created', { attackId: currentAttackId(), region: structuredClone(createdRegion) });
      runRegionContest(createdRegion, u);
    }
    if (slots.some(s => s.definition.kind === 'barrier')) {
      const result = createBarrier(ctx, u.id, eff, query);
      for (const replaced of result.replaced || []) removeBarrierResult(replaced, 'replaced');
      const barrier = result.barrier;
      if (barrier.endAt != null) dispatchBattleClock({ type: 'applyStatus', unitId: u.id,
        source: barrierClockSource(barrier), kind: 'barrier', duration: barrier.endAt - ctx.now() });
      emit('barrier-created', { attackId: currentAttackId(), barrierId: barrier.id, reason: 'created', barrier });
    }

    // 命中结论账本（原版 _bdg）：减益共享"至少一次命中"
    const bdg = { targetHit: {}, targetResolved: {}, debuffRolled: {}, concealAtk };
    const eventStart = domainEvents.length;
    const hits = [];
    const hitMap = new Map();
    const effects = [];
    const ammoEvents = [];
    const ammoBinds = itemBindingsFor(u, skill).filter(b => b.item.category === '弹药');
    const canceled = { value: false };
    const incomingType = eff.damageType || '近战';
    let shotIdx = 0;

    const originalTargets = [...new Set(slots.flatMap(s => s.targetIds || []))];
    bdg.barrierTargets = Object.fromEntries(originalTargets.map(id => [id, interception(ctx, u.id, id)]).filter(([, barrier]) => barrier));
    const skillCrit = rollSkillCrit(u, eff);
    for (const id of damageSlots.length ? allTargets : []) for (const guard of buffsOf(id)) {
      if (guard.type === 'damageGuard' && guard.attackId == null) guard.attackId = currentAttackId();
    }
    if (isCharge) {
      const charged = yield* resolveCharge(u, eff, query, slots, bdg, canceled, options, skillCrit.multiplier);
      hits.push(...charged.hits); effects.push(...charged.effects);
    }
    const shots = [];
    let activeAim = query.aim || aim;
    let activeQuery = query;
    for (const slot of isCharge ? [] : sortSlotsForResolve(slots)) {
      if (canceled.value || u.ref.hp <= 0) break;
      const def = slot.definition;
      activeSegment = { slotIndex: slot.index, segmentIndex: shotIdx + (slot.attack ? 1 : 0),
        segmentId: runId + ':' + currentAttackId() + ':slot:' + slot.index + ':segment:' + (shotIdx + (slot.attack ? 1 : 0)) };
      bdg.barrierTargets = Object.fromEntries([...new Set(slot.targetIds || [])].map(id => [id, interception(ctx, u.id, id)]).filter(([, barrier]) => barrier));
      if (def.kind === 'barrier' || createdRegion && (createdRegion.tags || []).some(tg => tg.tag === slot.tag)) continue;
      let targets = [];
      if (slot.target === 'self' || def.side === 'self') targets = u.ref.hp > 0 ? [u] : [];
      else targets = (slot.targetIds || []).map(id => byId.get(id)).filter(t => t && (t.ref.hp > 0 || def.kind === 'heal' && t.side === u.side && !t.isSummon));
      if (def.kind === 'attack') {
        shotIdx++;
        if (skill.switchTarget && shotIdx >= 2) {
          let rq;
          const previousTarget = byId.get(activeAim?.targetId);
          const aimAtPreviousTarget = () => ({ ...unitCenter(placementsById[previousTarget.id], previousTarget.footprint), targetId: previousTarget.id });
          const previousAim = eff.range.type === '单体' && previousTarget ? aimAtPreviousTarget() : activeAim;
          if (options.reuseTarget && (!activeAim?.targetId || previousTarget?.ref.hp > 0)) {
            const keep = previewRetarget(eff, previousAim, u.id, slot.index);
            if (keep.ok && (!previousTarget || keep.slotTargets.find(s => s.index === slot.index)?.targetIds.includes(previousTarget.id))) rq = keep;
          }
          if (!rq?.ok && (options.interactiveRetarget ?? !isAiControlled(u))) {
            const nextAim = yield {
              type: 'retarget-request', casterId: u.id, skill: eff, slotIndex: slot.index, shotIndex: shotIdx, totalShots: damageSlots.length,
              range: eff.range, previousAim: { ...activeAim }, previousTargetId: activeAim?.targetId || targets[0]?.id || null,
              skipPrevious: !!options.reuseTarget,
            };
            if (nextAim) rq = previewRetarget(eff, nextAim, u.id, slot.index);
            // 快捷沿用失效时由玩家决定；放弃该段不自动挑别人。
            if (!rq?.ok && options.reuseTarget) continue;
          }
          if (!rq?.ok) {
            rq = previewRetarget(eff, previousAim, u.id, slot.index);
            targets = [];
          }
          if (!rq.ok && eff.range.type === '单体') {
            for (const candidate of units) {
              if (candidate.side === u.side || candidate.ref.hp <= 0) continue;
              rq = previewRetarget(eff, { ...unitCenter(placementsById[candidate.id], candidate.footprint), targetId: candidate.id }, u.id, slot.index);
              if (rq.ok) {
                addLog('🔥 转火：后续攻击转向 ' + candidate.name);
                break;
              }
            }
          }
          if (rq?.ok) {
            activeAim = rq.aim;
            activeQuery = rq;
            targets = rq.slotTargets.find(s => s.index === slot.index).targetIds.map(id => byId.get(id)).filter(t => t.ref.hp > 0);
            placementsById[u.id].facing = rq.facing;
          }
          bdg.barrierTargets = Object.fromEntries(targets.map(t => [t.id, interception(ctx, u.id, t.id)]).filter(([, barrier]) => barrier));
        }
      }
      const segFacing = aimFacing(activeQuery, placementsById[u.id].facing ?? 0);
      if (def.kind === 'attack' && (targets.length || isAoE || activeQuery.barrierTargetIds?.length)) {
        shots.push({ shotIndex: shotIdx, aim: { ...activeAim }, facing: segFacing, cells: activeQuery.cells });
        if (ammoBinds.length && !preparing) consumeAmmoForShot(ammoBinds, shotIdx, damageSlots.length, ammoEvents);
      }
      const terrainCells = terrainAttackCells(u, eff, slot, activeQuery, bdg.concealAtk);
      if (def.kind === 'attack') {
        for (const barrierId of activeQuery.slotTargets.find(s => s.index === slot.index)?.barrierIds || []) {
          const barrier = ctx.barriers.find(b => b.id === barrierId);
          if (barrier) resolveBarrierDamage(u, barrier, slot, shotIdx, 0.8 + random() * 0.4, skillCrit.multiplier, incomingType, bdg, activeQuery.aim);
        }
      }
      for (const target of targets) {
        if (canceled.value || (!isAoE && u.ref.hp <= 0)) break;
        if (def.kind === 'attack') {
          if (target.ref.hp <= 0) continue;
          const seg = yield* resolveAttackSegment({ caster: u, target, slot, skill: eff, baseSkill: skill, slotIndex: slot.index,
            segmentIndex: shotIdx, shotIndex: shotIdx, totalShots: damageSlots.length, bdg, canceled, incomingType, isAoE, options, skillMultiplier: skillCrit.multiplier });
          if (actionRun !== runId) return failAttack('战斗已取消');
          if (!seg) continue;
          seg.aim = { ...activeAim };
          seg.facing = segFacing;
          if (activeQuery && Array.isArray(activeQuery.cells)) seg.cells = activeQuery.cells;
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
            const barrier = bdg.barrierTargets?.[target.id] || interception(ctx, u.id, target.id);
            if (barrier) {
              effects.push({ kind: 'blocked', ...blockEffect(u, target, slot, barrier) });
              continue;
            }
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
          const applied = applyBattleEffect({ caster: u, slot, targets: [target], skill: eff, skillKey: key, multiplier: skillCrit.multiplier });
          if (def.kind === 'heal' && hpBefore <= 0 && target.ref.hp > 0) dispatchBattleClock({ type: 'reenterUnit', unitId: target.id });
          effects.push(...applied.applied);
        }
      }
      if (!canceled.value && terrainCells.length) breakLowObstacles(terrainCells, true);
    }

    if (preparing) charge.preparing = null;
    if (u.ref.hp > 0 && skill.displacements?.some(d => d.type === '击退' || d.type === '拉近') && !skill.displacements.some(d => d.type === '冲锋')) {
      applySkillDisplacements(u, eff, query, hits);
    }
    if (u.ref.hp > 0 && skill.haste > 0) charge.inventory += skill.haste; // 准备技能释放后同样入账（主代理复审指令：移除 !prepKind）
    // 风行者多重施法：消耗MP释放技能时（非反应技）按耗蓝概率获得额外主行动点（概率原值；P03 grantMainPoint 映射）
    const mc = u.ref.hp > 0 && CLASS_PASSIVES[u.classType]?.onSkillExecuted?.(u, skill, false, passiveIo(u));
    if (mc && mc.multicast) addLog('🌟 ' + u.name + ' 的法力产生共鸣，引发了多重施法（获得额外主行动点）！');
    const p = placementsById[u.id];
    if (damageSlots.length) p.facing = aimFacing(activeQuery, p.facing);
    // 施法 TP：普通攻击 +20，其余技能 +5（原版口径）
    if (u.ref.hp > 0) u.ref.tp = Math.min(u.ref.maxTp || 100, (u.ref.tp || 0) + (skill === BASIC_ATTACK ? 20 : 5));
    return { ok: true, hits, shots, effects, barrierHits: Object.values(bdg.barrierHits || {}), events: domainEvents.slice(eventStart), ammoEvents, summons: summons.map(s => s.id), query, casterId: u.id, skill, aim: { ...aim },
      facing: p.facing, incomingType, canceled: canceled.value, crit: skillCrit.crit, costSummary, charge: chargeInfo, chargeRelease, logFrom, logTo: log.length };
  }

  function resolveBarrierDamage(caster, barrier, slot, segmentIndex, roll, multiplier, incomingType, ledger, aim, rawOverride) {
    const cache = ledger.barrierHits || (ledger.barrierHits = {});
    const segmentId = runId + ':' + currentAttackId() + ':slot:' + slot.index + ':segment:' + segmentIndex;
    const key = barrier.id + ':' + segmentId;
    if (cache[key]) return cache[key];
    const raw = rawOverride ?? computeSegmentRawDamage(statsOf(caster, ledger.concealAtk), caster.ref.atk, slot.power, multiplier, roll);
    const origin = unitCenter(placementsById[caster.id], caster.footprint);
    const protectedTargetIds = Object.entries(ledger.barrierTargets || {}).filter(([, b]) => b.id === barrier.id).map(([id]) => id);
    const result = damageBarrier(ctx, barrier.id, raw, { armorMult: slot.definition.scatter ? 3 : 1, incomingType });
    const event = emit('barrier-damaged', { barrierId: barrier.id, segmentId, slotIndex: slot.index, segmentIndex,
      reason: 'damage', casterId: caster.id, origin, incomingType, contactPoint: barrierContact(ctx, barrier, origin, aim || barrier.center),
      protectedTargetIds, ...result });
    cache[key] = { ...structuredClone(result), barrierHitId: event.eventId, segmentId, protectedTargetIds, contactPoint: event.contactPoint };
    if (result.broken) removeBarrierResult(result.barrier, 'broken');
    return cache[key];
  }
  function tacticalModifiers(caster, target, skill) {
    const { backstab, lowCover } = spatialAttackModifiers(ctx, caster.id, target.id, skill);
    return { backstab, lowCover, evaDelta: backstab ? -20 : 0, damageMultiplier: backstab ? 1.2 : lowCover ? 0.75 : 1 };
  }
  const adjustedRaw = (raw, tactics) => tactics.damageMultiplier === 1 ? raw : Math.floor(raw * tactics.damageMultiplier);

  function segmentDamage(caster, target, slot, skill, incomingType, isAoE, pierce, roll, multiplier, concealAtk, tactics) {
    const passive = CLASS_PASSIVES[caster.classType];
    const cStats = statsOf(caster, concealAtk);
    const raw0 = adjustedRaw(computeSegmentRawDamage(cStats, caster.ref.atk, slot.power, multiplier, roll, {
      modifyDamageMultiplier: args => passive?.modifyDamageMultiplier?.(args.caster, args.target, buffsOf(args.target.id), cStats, statsOf(args.target)) || 0,
      modifyDamageDealt: args => passive?.modifyDamageDealt?.(args.caster, args.skill, cStats) || 0,
    }, { caster, target, skill }), tactics);
    const resistance = {};
    const raw = applyTypeResist(raw0, incomingType, isAoE, target, buffsOf(target.id), resistance);
    const guards = buffsOf(target.id).filter(b => b.type === 'damageGuard' && (b.attackId === currentAttackId() || b.attackId == null));
    const damage = calculateDamage(raw, { def: statsOf(target).def, shield: target.ref.shield || 0, hp: target.ref.hp },
      { isPierce: pierce, armorMult: slot.definition.scatter ? 3 : 1, guardRemaining: guards.reduce((n, b) => n + b.value, 0), defending: isDefending(target) });
    damage.hpDmg += passive?.modifyTrueDamage?.(caster) || 0;
    return { ...damage, raw0, raw, resistance, guards };
  }
  function autoSummonGuard(target, caster, skill, lethalDamage) {
    if (target.isSummon || skill.range.type !== '单体' || lethalDamage.hpDmg < target.ref.hp) return null;
    const guardSkill = { name: '召唤守护', sheshenTarget: 'all', range: { type: '自身' }, type: '[无]', power: 0 };
    const candidates = units.filter(u => u.isSummon && u.summonOwnerId === target.id && u.ref.hp > 0)
      .map(u => ({ unit: u, preview: guardAvailability(u, target, caster.id, guardSkill) })).filter(c => c.preview.ok);
    const order = state.combatState.clock.order;
    candidates.sort((a, b) => a.preview.distance - b.preview.distance || order.indexOf(a.unit.id) - order.indexOf(b.unit.id));
    if (!candidates.length) return null;
    return commitGuard(candidates[0].unit, target, caster, guardSkill, 'summon-lethal-guard', skill,
      { lethalCheck: { targetId: target.id, hpBefore: target.ref.hp, hpDmg: lethalDamage.hpDmg,
        shieldDmg: lethalDamage.shieldDmg, rawDmg: lethalDamage.raw, lethal: true } });
  }

  // 单段攻击：命闪 →（将命中才）反应拦截 yield → 伤害管线 → 附带效果
  // 反应弹窗承伤预览（只读、不掷骰、不改状态）：与本段结算同一条管线（原始伤害→变种抗性→护甲/防御→免伤池→护盾），
  // 随机系数取 0.8 / 1.2 两端；暴击与致死保命被动不计（原版 buildReactionDamagePreview 同口径）
  function segmentPreview(caster, target, slot, skill, incomingType, isAoE, pierce, cStats) {
    const passive = CLASS_PASSIVES[caster.classType] || null;
    const hooks = {
      modifyDamageMultiplier: args => (passive && passive.modifyDamageMultiplier ? passive.modifyDamageMultiplier(args.caster, args.target, buffsOf(args.target.id), statsOf(args.caster), statsOf(args.target)) : 0),
      modifyDamageDealt: args => (passive && passive.modifyDamageDealt ? passive.modifyDamageDealt(args.caster, args.skill, statsOf(args.caster)) : 0),
    };
    const tStats = statsOf(target);
    const tactics = tacticalModifiers(caster, target, skill);
    const guard = buffsOf(target.id).filter(b => b.type === 'damageGuard' && (b.attackId === currentAttackId() || b.attackId == null)).reduce((n, b) => n + b.value, 0);
    const armorMult = slot.definition.scatter ? 3 : 1, defending = isDefending(target), shield = target.ref.shield || 0;
    const at = roll => {
      const raw = adjustedRaw(computeSegmentRawDamage(cStats, caster.ref.atk, slot.power, 1, roll, hooks, { caster, target, skill }), tactics);
      const resisted = applyTypeResist(raw, incomingType, isAoE, target, buffsOf(target.id));
      return { raw, resisted, ...calculateDamage(resisted, { def: tStats.def, shield, hp: target.ref.hp }, { isPierce: pierce, armorMult, guardRemaining: guard, defending }) };
    };
    const lo = at(0.8), hi = at(1.2);
    return { tag: slot.tag, power: slot.power, backstab: tactics.backstab, lowCover: tactics.lowCover, baseAtk: cStats.atk, atkBonus: cStats.atk - (caster.ref.atk || 0),
      rawMin: lo.raw, rawMax: hi.raw, resistMin: lo.resisted, resistMax: hi.resisted, def: tStats.def, armorMult, pierce, defending, shield, guard,
      hpMin: lo.hpDmg, hpMax: hi.hpDmg, shieldMin: lo.shieldDmg, shieldMax: hi.shieldDmg, guardMin: lo.guardDmg, guardMax: hi.guardDmg,
      targetHp: target.ref.hp, fatal: hi.hpDmg >= target.ref.hp };
  }
  function* resolveAttackSegment({ caster, target, slot, skill, baseSkill, slotIndex, segmentIndex, shotIndex, totalShots, bdg, canceled, incomingType, isAoE, options, skillMultiplier = 1 }) {
    const segmentRun = runId;
    activeSegment = { segmentId: runId + ':' + currentAttackId() + ':slot:' + slotIndex + ':segment:' + segmentIndex,
      slotIndex, segmentIndex, shotIndex };
    const cStats = statsOf(caster, bdg.concealAtk);
    let tStats = statsOf(target);
    const passive = CLASS_PASSIVES[caster.classType] || null;
    const roll = 0.8 + random() * 0.4;
    const pierce = !!skill.isPierce || !!slot.definition.pierce || !!(passive && passive.checkPierce && passive.checkPierce(caster));
    const logStart = log.length;
    const segBase = { runId, attackId: currentAttackId(), ...activeSegment, index: slotIndex, shotIndex, segmentIndex,
      origin: unitCenter(placementsById[caster.id], caster.footprint), originalTargetId: target.id,
      contactPoint: unitCenter(placementsById[target.id], target.footprint), targetId: target.id, logIndex: logStart,
      side: target.side, maxHp: target.ref.maxHp, damageType: incomingType, damageCategory: slot.definition.damageCategory || null,
      isCrit: skillMultiplier > 1, isPierce: pierce };
    if (!options.skipSpatialRecheck && skill.range.type === '单体') {
      const aim = { ...unitCenter(placementsById[target.id], target.footprint), targetId: target.id };
      const check = queryAttack(ctx, caster.id, skill, aim);
      if (!check.ok) {
        addLog(skill.name + ' 后续段目标不合法：' + check.reason);
        return { ...segBase, hit: false, outcome: 'prevented', hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reason: check.reason, logEnd: log.length };
      }
    }
    const guard = skill.displacements?.some(d => d.type === '冲锋') ? null : bdg.barrierTargets?.[target.id] || interception(ctx, caster.id, target.id);
    if (guard) {
      const barrierHit = resolveBarrierDamage(caster, guard, slot, segmentIndex, roll, skillMultiplier, incomingType, bdg, segBase.contactPoint);
      segBase.barrierHitId = barrierHit.barrierHitId;
      segBase.contactPoint = barrierHit.contactPoint;
      bdg.targetResolved[target.id] = true;
      if (!bdg.targetHit[target.id]) bdg.targetHit[target.id] = false;
      addLog(target.name + ' 的攻击被场地结界拦截');
      return { ...segBase, hit: false, outcome: 'prevented', hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, barrierId: guard.id, down: false, logEnd: log.length };
    }
    // 初次命闪（【必中】跳过被动闪避；仍可被反应化解）；征伐者 modifyDodgeCap：闪避分母按自身−攻击者速度差提升（原版 L21976）
    const targetPassive = CLASS_PASSIVES[target.classType] || null;
    const dodgeCapBonus = targetPassive && targetPassive.modifyDodgeCap ? Math.max(0, targetPassive.modifyDodgeCap(target, caster, tStats, cStats) || 0) : 0;
    let tactics = tacticalModifiers(caster, target, skill);
    Object.assign(segBase, { backstab: tactics.backstab, lowCover: tactics.lowCover });
    const hitResult = baseSkill.guaranteedHit ? { hit: true, attackRoll: null, dodgeRoll: null }
      : resolveHit({ hitBonus: cStats.hit }, { evasion: target.ref.evasion || 0, evaBonus: tStats.eva + dodgeCapBonus + tactics.evaDelta }, baseSkill, random);
    if (!hitResult.hit) {
      addLog(caster.name + ' · ' + skill.name + ' → ' + target.name + ' 闪避');
      // 命中结论账本：已判定即 resolved（miss 不覆写此前 targetHit=true，多段至少一次命中共享）
      if (!bdg.targetResolved[target.id]) { bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false; }
      if (target.side === 'hero') target.ref.tp = Math.min(target.ref.maxTp || 100, (target.ref.tp || 0) + 5);
      resolveDodgeCounter(target, caster, incomingType);
      return Object.assign(segBase, { hit: false, outcome: 'dodge', hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: target.ref.hp <= 0, logEnd: log.length });
    }
    // 确认将命中 → 反应拦截（只对该发；选择由调用方 next() 给出或 policy 自动）
    const lethalDamage = !isAoE && units.some(u => u.isSummon && u.summonOwnerId === target.id && u.ref.hp > 0)
      ? segmentDamage(caster, target, slot, skill, incomingType, isAoE, pierce, roll, skillMultiplier, bdg.concealAtk, tactics) : null;
    let reaction = lethalDamage ? autoSummonGuard(target, caster, skill, lethalDamage) : null;
    if (!reaction) reaction = yield* selectReaction(target, caster, skill, incomingType, options,
      { slotIndex, segmentIndex, targetId: target.id, shotIndex, totalShots, preview: segmentPreview(caster, target, slot, skill, incomingType, isAoE, pierce, cStats) });
    if (segmentRun !== runId) return null;
    if (reaction?.canceled || (!isAoE && caster.ref.hp <= 0)) {
      canceled.value = true;
      if (!bdg.targetResolved[target.id]) { bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false; }
      return Object.assign(segBase, { hit: false, outcome: 'prevented', hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reaction, logEnd: log.length });
    }
    if (reaction?.dodged) {
      resolveDodgeCounter(target, caster, incomingType);
      if (!bdg.targetResolved[target.id]) { bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false; }
      return Object.assign(segBase, { hit: false, outcome: 'dodge', hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reaction, logEnd: log.length });
    }
    if (reaction?.guardianId) {
      bdg.targetResolved[target.id] = true; bdg.targetHit[target.id] = false;
      target = byId.get(reaction.guardianId);
      segBase.originalTargetId = segBase.targetId; segBase.targetId = target.id;
      segBase.contactPoint = unitCenter(placementsById[target.id], target.footprint);
      segBase.side = target.side; segBase.maxHp = target.ref.maxHp;
      const guardReaction = yield* selectReaction(target, caster, skill, incomingType, options,
        { slotIndex, segmentIndex, targetId: target.id, shotIndex, totalShots, preview: segmentPreview(caster, target, slot, skill, incomingType, isAoE, pierce, cStats) }, true, false);
      if (segmentRun !== runId) return null;
      if (guardReaction?.canceled || (!isAoE && caster.ref.hp <= 0)) canceled.value = true;
      if (canceled.value || guardReaction?.dodged) {
        if (guardReaction?.dodged) resolveDodgeCounter(target, caster, incomingType);
        return Object.assign(segBase, { hit: false, outcome: canceled.value ? 'prevented' : 'dodge', hpDmg: 0, hpBefore: target.ref.hp, hpAfter: target.ref.hp, down: false, reaction, guardianReaction: guardReaction, logEnd: log.length });
      }
      reaction.guardianReaction = guardReaction;
      tactics = tacticalModifiers(caster, target, skill);
      Object.assign(segBase, { backstab: tactics.backstab, lowCover: tactics.lowCover });
    }
    tStats = statsOf(target);
    // 记录命中结论（减益共享）
    bdg.targetResolved[target.id] = true;
    bdg.targetHit[target.id] = true;
    // 隐匿者被敌方命中 → 隐匿窗口受击标记（本窗口不累积“未受击+10”；护盾全挡/-0 同样算受伤，原版 L24070）
    if (target.classType === '隐匿者' && caster.side !== target.side) dispatchBattleClock({ type: 'markHit', unitId: target.id });
    // 伤害管线：变种抗性 → 护甲/免伤/防御姿态 → 护盾 → HP（原版顺序）
    // 暴击（原版 [暴击:N%] + 征伐者 modifyCritRate）：整技在释放前统一掷骰，multiplier 透传至全部生效段
    const crit = skillMultiplier > 1;
    const damage = segmentDamage(caster, target, slot, skill, incomingType, isAoE, pierce, roll, skillMultiplier, bdg.concealAtk, tactics);
    const { raw0, raw, resistance, guards } = damage;
    guards.forEach(b => { b.attackId = currentAttackId(); });
    let { hpDmg, shieldDmg, guardDmg } = damage;
    let remainingGuardCost = guardDmg;
    for (const guard of guards) {
      const used = Math.min(guard.value, remainingGuardCost);
      guard.value -= used; remainingGuardCost -= used;
      if (guard.value <= 0) removeBuffRecord(target.id, guard);
    }
    if (guardDmg > 0) addLog('🛡️ ' + target.name + ' 的【免伤】抵消 ' + guardDmg);
    let fatalResult = null;
    // 致死保命被动（毅力/回避致命）
    if (target.ref.hp - hpDmg <= 0) {
      const fatalCtx = { unit: target, hpDmg, shieldDmg };
      const tp = CLASS_PASSIVES[target.classType];
      if (tp && tp.onFatalDamage && tp.onFatalDamage(fatalCtx)) {
        fatalResult = { reason: fatalCtx.hpDmg === 0 ? 'avoid-fatal' : 'grit', hpDmgBefore: hpDmg, hpDmgAfter: fatalCtx.hpDmg };
        hpDmg = fatalCtx.hpDmg; shieldDmg = fatalCtx.shieldDmg;
        emit('fatal-prevented', { unitId: target.id, ...fatalResult });
        addLog(target.name + ' 触发职业被动【' + (fatalCtx.hpDmg === 0 ? '回避致命' : '毅力留存') + '】躲过了死亡！');
      }
    }
    const hpBefore = target.ref.hp, maxHp = target.ref.maxHp, shieldBefore = target.ref.shield || 0;
    if (shieldDmg > 0) target.ref.shield = Math.max(0, (target.ref.shield || 0) - shieldDmg);
    const shieldAfter = target.ref.shield || 0;
    const dealt = Math.min(target.ref.hp, hpDmg);
    target.ref.hp = Math.max(0, target.ref.hp - hpDmg);
    target.ref.tp = Math.min(target.ref.maxTp || 100, (target.ref.tp || 0) + 10);
    addLog(caster.name + ' · ' + skill.name + ' → ' + target.name + ' -' + dealt + ' HP' + (shieldDmg ? '（破盾' + shieldDmg + '）' : '')
      + (tactics.backstab ? ' · 背袭' : tactics.lowCover ? ' · 低墙掩护' : ''));
    // 眩晕槽附带（钢体免疫）
    if (slot.definition.stun && target.ref.hp > 0) {
      if (isImmuneToStun(target, buffsOf(target.id))) addLog(target.name + ' 免疫了眩晕（钢体）');
      else { dispatchBattleClock({ type: 'applyStun', unitId: target.id }); addLog(target.name + ' 被击晕，将跳过下一次行动！'); }
    }
    // 职业命中后效果（灾厄使淬毒 / 隐匿者暗袭眩晕）
    const afterHook = passive && passive.onAfterDamageDealt ? passive.onAfterDamageDealt({ caster, target, damageType: incomingType, targetAlive: target.ref.hp > 0, casterStats: cStats, targetBuffs: buffsOf(target.id) }, random) : null;
    if (afterHook && afterHook.poison) {
      const poison = registerDot(target, 'poison', { strength: afterHook.poison.power, turns: afterHook.poison.turns, casterId: caster.id, skillKey: skillKey(baseSkill), slotTag: '淬毒' });
      if (!poison?.immune) addLog(target.name + ' 被淬毒（职业被动）');
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
      if (caster.ref.hp <= 0) handleDown(caster, 'thorns', target.id);
    }
    let down = false;
    if (target.ref.hp <= 0) down = handleDown(target, 'attack', caster.id);
    else runEnemyThresholdVariants(target); // 蜕皮/连动阈值（原版受击后收口）
    if (down && target.side === 'enemy') {
      const kp = CLASS_PASSIVES[caster.classType];
      const res = kp && kp.onKill ? kp.onKill(caster, passiveIo(caster)) : null;
      if (res) emit('passive-gain', { unitId: caster.id, passive: '猎杀', kind: 'stealth', value: 30, stealthVal: res.stealthVal, extraTurn: !!res.extraTurn, rush: !!res.rush });
      if (res && res.extraTurn) addLog('⚡ ' + caster.name + ' 击杀累积隐匿值 ' + res.stealthVal + '，触发【再动】！');
      if (res && res.rush) addLog('🎯 ' + caster.name + ' 隐匿值突破 100，下一次非反应攻击 +50（隐匿值回归 50）');
    }
    emit('segment-resolved', { attackId: currentAttackId(), casterId: caster.id, targetId: target.id,
      slotIndex, segmentIndex, originalTargetId: segBase.originalTargetId, contactPoint: segBase.contactPoint,
      maxHp, hpDmg: dealt, shieldDmg, guardDmg, shieldBefore, shieldAfter, rawBeforeResist: raw0, rawDmg: raw, resistance, fatalResult,
      hpBefore, hpAfter: target.ref.hp, isCrit: crit, isPierce: pierce, backstab: tactics.backstab, lowCover: tactics.lowCover,
      damageType: incomingType, down, damageCategory: slot.definition.damageCategory || null });
    return Object.assign(segBase, { hit: true, outcome: 'hit', maxHp, hpDmg: dealt, shieldDmg, guardDmg, shieldBefore, shieldAfter,
      rawBeforeResist: raw0, rawDmg: raw, resistance, fatalResult, finalTargetId: target.id,
      hpBefore, hpAfter: target.ref.hp, down, reaction: reaction || undefined, logEnd: log.length });
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
    if (!item?.isItem) return { ok: false, reason: '物品不可用' };
    if (!child && item.children?.length) {
      const statuses = item.children.map(use => canUseItem(item, use));
      return statuses.some(s => s.ok) ? { ok: true } : { ok: false, reason: statuses[0].reason };
    }
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
    const query = teleportRule(eff) ? previewAttack(skill, aim) : queryAttack(ctx, currentId(), eff, aim);
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
      effects: slots.map(s => ({ index: s.index, tag: s.tag, power: s.power, turns: s.turns, target: s.target, attack: s.attack, targetIds: query.slotTargets.find(slot => slot.index === s.index)?.targetIds || [] })),
      // 零掷骰伤害预估（roll=1 中值口径；实际结算带 0.8–1.2 随机）：每目标每攻击槽一条。
      // 护盾/免伤按批准口径在预测副本上逐槽累积消耗（多段不重复吃满盾）。
      damagePreview: (() => {
        const isAoE0 = !!query.chargePath || ['直线', '扇形', '圆形', '全域', '爆炸'].includes(eff.range.type);
        const cStats = statsOf(u);
        const passive = CLASS_PASSIVES[u.classType] || null;
        const views = new Map(); // targetId → {def, shield}（逐槽消耗副本）
        const preview = [];
        for (const s of slots.filter(x => x.attack)) {
          for (const targetId of query.slotTargets.find(slot => slot.index === s.index)?.targetIds || []) {
            const target = byId.get(targetId);
            if (!target) continue;
            if (!views.has(targetId)) {
              const guards = buffsOf(targetId).filter(b => b.type === 'damageGuard' && (b.attackId == null || b.attackId === currentAttackId()));
              views.set(targetId, { def: statsOf(target).def, shield: target.ref.shield || 0,
                guard: guards.reduce((n, b) => n + b.value, 0), tStatsEva: statsOf(target).eva });
            }
            const view = views.get(targetId);
            const tactics = tacticalModifiers(u, target, eff);
            const raw = adjustedRaw(computeSegmentRawDamage(cStats, u.ref.atk, s.power, 1, 1, {
              modifyDamageMultiplier: args => (passive && passive.modifyDamageMultiplier ? passive.modifyDamageMultiplier(args.caster, args.target, buffsOf(args.target.id), statsOf(args.caster), statsOf(args.target)) : 0),
              modifyDamageDealt: args => (passive && passive.modifyDamageDealt ? passive.modifyDamageDealt(args.caster, args.skill, statsOf(args.caster)) : 0),
            }, { caster: u, target, skill: eff }), tactics);
            const afterResist = applyTypeResist(raw, eff.damageType || '近战', isAoE0, target, buffsOf(target.id));
            const isPierce = !!eff.isPierce || !!s.definition.pierce || !!(passive && passive.checkPierce && passive.checkPierce(u));
            const { hpDmg, shieldDmg, guardDmg } = calculateDamage(afterResist, view,
              { isPierce, armorMult: s.definition.scatter ? 3 : 1, guardRemaining: view.guard, defending: isDefending(target) });
            view.guard -= guardDmg;
            if (shieldDmg > 0) view.shield = Math.max(0, view.shield - shieldDmg); // 预测副本逐槽消耗护盾
            const evadeCap = CLASS_PASSIVES[target.classType]?.modifyDodgeCap?.(target, u, statsOf(target), cStats) || 0;
            preview.push({ targetId, slotIndex: s.index, raw, estimatedHpDmg: hpDmg, backstab: tactics.backstab, lowCover: tactics.lowCover,
              attackCap: Math.max(1, (eff.hit ?? 100) + cStats.hit), dodgeCap: Math.max(1, (target.ref.evasion || 0) + view.tStatsEva + Math.max(0, evadeCap) + tactics.evaDelta) });
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

  function previewReady() {
    const u = actor(), r = currentResources();
    if (!u || !r || state.combatState.clock?.terminal) return { ok: false, reason: '当前不能整备' };
    if (r.main < 1) return { ok: false, reason: '主行动已用完' };
    if (!negativeBuffsOf(u.id).length) return { ok: false, reason: '没有可驱散的负面状态' };
    return { ok: true };
  }
  function ready() {
    const check = previewReady();
    if (!check.ok) return check;
    const u = actor(), candidates = negativeBuffsOf(u.id);
    const removed = candidates[Math.floor(random() * candidates.length)];
    currentResources().main--;
    removeBuffRecord(u.id, removed);
    addLog(u.name + ' 整备，祛除一项负面状态');
    return { ok: true, removed };
  }

  function canAdvancePreparation({ stationary = false } = {}) {
    const u = actor(), charge = u && chargeState(u.id);
    if (!resources || !charge?.preparing || charge.preparing.ready) return { ok: false, reason: '当前没有待准备技能' };
    if (stationary && !canStationaryPrepare()) return { ok: false, reason: '需要满额移动，且本次行动未驻足' };
    if (!stationary && resources.main < 1 && charge.inventory < 1) return { ok: false, reason: '主行动或加速不足' };
    return { ok: true };
  }
  function advancePreparation({ stationary = false } = {}) {
    const valid = canAdvancePreparation({ stationary });
    if (!valid.ok) return valid;
    const u = actor(), prep = chargeState(u.id).preparing;
    resources.preparationContinued = true;
    if (stationary) investStationary(u, prep);
    const { main } = investPreparation(u);
    return { ok: true, invested: main, remaining: prep.remaining, ready: prep.ready };
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
    if (charge?.preparing && (charge.preparing.ready || !resources.preparationContinued)) cancelPreparation(id);
    gainNaturalCharge(byId.get(id));
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
    const preparing = chargeState(u.id).preparing;
    if (resources.main < 1 && resources.aux < 1 && !resources.freeJumpAvailable && resources.moveRemaining <= 1e-9 && !preparing?.ready) return { moveTo: null, skill: null, aim: null, action: 'wait' };
    if (preparing && !preparing.ready && resources.main > 0) return { moveTo: null, skill: null, aim: null, action: 'prepare' };
    const aiRes = { ...resources, preparing, moveDistance: moveDistanceOf(u), jumpFirst: hasDoubleJump(u) };
    const aiBudget = resources.moveRemaining * (resources.moveMultiplier || 1);
    const charged = chargeSkillOf(u);
    if (!preparing && charged && chargeFull(u) && canUseSkill(charged).ok) {
      const query = chargeAim(u, charged);
      if (query) return { moveTo: null, skill: charged, aim: query.aim, action: charged.delay > 0 ? 'prepare' : null };
      // 有可用射击位才为大招移动，抵达后由下一次决策用真实站位重选。
      const plan = chooseEnemyAction(ctx, u.id, aiBudget, [charged], skill => skillStatus(skill), { ...aiRes, jumpFirst: false });
      if (plan.moveTo && plan.skill) return { ...plan, skill: null, aim: null, action: null };
    }
    const skills = preparing ? (preparing.ready ? [preparing.skill] : []) : enemySkills().filter(skill => skill !== charged);
    syncFocus(true);
    const order = state.combatState.focusOrders?.[u.id];
    const focus = order && { ...order, visible: canSeeUnit(ctx, u.id, order.targetId) };
    const plan = chooseEnemyAction(ctx, u.id, aiBudget, skills, skill => skillStatus(skill), { ...aiRes, focus, idleMovement: true });
    if (focus && plan.moveTo && plan.skill) return { ...plan, skill: null, aim: null, action: null };
    return plan;
  }
  function* beginEnemyTurn(options = {}) {
    const id = currentId();
    if (!actor() || !isAiControlled(actor()) || state.combatState.clock.terminal) return snapshot();
    for (;;) {
      const choice = planEnemyAction();
      if (!choice || choice.action === 'wait') break;
      const before = JSON.stringify({ resources, hp: actor().ref.hp, mp: actor().ref.mp, position: placementsById[id], prep: chargeState(id).preparing });
      if (choice.jumpTo) {
        if (!jump(choice.jumpTo.col, choice.jumpTo.row).ok) break;
        continue;
      }
      if (choice.action === 'sprint' && !sprint().ok) break;
      if (choice.moveTo) {
        const moved = yield* beginMove(choice.moveTo.col, choice.moveTo.row, choice.avoidFog, options);
        if (!moved.ok || currentId() !== id || state.combatState.clock.units[id]?.stun) break;
        if (moved.stopped) continue;
      }
      if (choice.action === 'defend') defend();
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
    const resetEvents = clearBarriers(ctx).map(barrier => emit('barrier-removed', { barrierId: barrier.id, reason: 'reset', barrier }));
    generation++; runId = 'battle:' + instanceId + ':' + generation;
    activeSegment = null;
    // 召唤物退场（本战斗基线不含召唤）：单位/占位/足迹/时钟记录一并移除
    for (const u of units.filter(x => x.isSummon && !opening.positions[x.id])) {
      byId.delete(u.id); delete placementsById[u.id]; delete ctx.footprintsById[u.id];
      ctx.carriedUnitIds.delete(u.id);
    }
    for (let i = units.length - 1; i >= 0; i--) if (units[i].isSummon && !opening.positions[units[i].id]) units.splice(i, 1);
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
    rageVisualActive.clear();
    fieldBlocks.clear();
    resources = null; log = []; domainEvents = []; actionSerial = 0; attackSerial = 0; summonSerial = 0;
    attackStack.length = 0;
    ctx.scene = scene;
    ctx.compiled = compileScene(scene);
    ctx.regions = state.combatState.regions = [];
    ctx.barriers = state.combatState.barriers = [];
    if (typeof random.reset === 'function') random.reset();
    return { ...start(), resetEvents };
  }

  return { ctx, battleState: state, get state() { return state; }, start, snapshot, reachable, previewMove, beginMove, move, sprint, previewJump, jump, push, previewCarry, carry, drop, previewDisplacement,
    setVisibleUnitIds(ids) { visibleIds = ids ? ids.slice() : null; },
    canUseSkill, skillStatus, canUseReaction, canUseItem, itemSkill: itemAsSkill, startPreparation, canStationaryPrepare, canAdvancePreparation, advancePreparation, cancelPreparation,
    previewAttack, previewRetarget, teleportCells, beginAttack, attack, beginUseItem, useItem, predictAttack, defend, previewReady, ready,
    getEffectiveUnit, statsOf, buffsOf,
    previewGuardCandidates, queryBarrierTargets(skill) {
      return ctx.barriers.map(barrier => queryAttack(ctx, currentId(), effectiveSkill(skill), { barrierId: barrier.id }))
        .filter(q => q.ok).map(q => ({ ...q.barrierTargets[0], query: q }));
    },
    endAction, planEnemyAction, beginEnemyTurn, runEnemyTurn, finishBattle, destroy, reset };
}
