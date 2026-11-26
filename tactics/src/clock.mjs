// ==========================================
// 战棋 P03 跑圈与全局事件时钟（clock）
// 纯规则模块：无 DOM、无 rAF、无现实定时器；虚拟时间只在事件点之间跳转（SPEC S02 L31）。
// 依赖 scheduler.mjs（单向）；契约见 doc/tactics/P03-CLOCK-CONTRACT.md。
// ==========================================

import {
  LAP_DISTANCE, ROUND_TIME, DEFAULT_RESCUE_TIME,
  settlePhase12, collectArrivals, nextEffectEventTime,
  hasActionableUnit, hasFutureSpeedRestore, hasBattleEndingFuture,
  applyStatusRecord, grantNaturalAction, processStunSkip, grantMainPoint,
  clearPendingPointsFor, creditDistance, nextArrivalTimeOf, ensureProgress,
  statusKeyOf, isOpportunityReady,
} from './scheduler.mjs';

function pushLog(clock, t, type, extra = {}) {
  const entry = Object.assign({ seq: ++clock.seq, t, type }, extra);
  clock.log.push(entry);
  return entry;
}

function makeUnitRecord(rec, now, speed) {
  return {
    id: String(rec.id),
    side: rec.side,
    name: rec.name !== undefined ? rec.name : null,
    baseSpd: rec.baseSpd,
    speed,
    status: 'active',
    lastSync: now,
    spawnedAt: now,
    stun: null,
    hitSinceWindow: false,
    extraMain: 0,
    mainPointSources: [],
  };
}

function defaultSpeedOf(units) {
  return (unitId) => {
    const rec = units.find(u => String(u.id) === unitId);
    return rec ? rec.baseSpd : 0;
  };
}

// 统一的速度重读入口：先按旧速度计息，再重新锚定计距基准。
// 零速停跑期 creditDistance 不计息也不动 lastSync，必须在此显式锚定，否则恢复正速会追溯计息（T03-03 不倒退）。
function resyncUnitSpeed(battleState, unitId, rulesContext, t) {
  const clock = battleState.combatState.clock;
  const u = clock.units[unitId];
  if (!u) return;
  creditDistance(battleState, t);
  u.lastSync = t;
  u.speed = rulesContext.speedOf ? rulesContext.speedOf(unitId) : u.baseSpd;
}

// ---------- 创建 / 恢复 ----------

export function createClock(battleState, units, options = {}) {
  if (!battleState.combatState) battleState.combatState = {};
  const speedOf = options.speedOf || defaultSpeedOf(units);
  let clock = battleState.combatState.clock;
  if (clock) {
    // 恢复：忽略 units 数组顺序；新单位追加；缺失单位置 'out'；进度与平局序不重置
    const present = new Set(units.map(u => String(u.id)));
    for (const id in clock.units) {
      if (!present.has(id)) clock.units[id].status = 'out';
    }
    for (const rec of units) {
      const id = String(rec.id);
      if (clock.units[id]) {
        clock.units[id].speed = speedOf(id); // 计距基准 lastSync 不动，不产生追溯计距
      } else {
        clock.units[id] = makeUnitRecord(rec, clock.now, speedOf(id));
        ensureProgress(battleState, id);
        pushLog(clock, clock.now, 'unit-registered', { unitId: id, via: 'resume' });
      }
    }
    const kept = clock.order.filter(id => present.has(id));
    const known = new Set(kept);
    for (const rec of units) {
      const id = String(rec.id);
      if (!known.has(id)) { kept.push(id); known.add(id); }
    }
    clock.order = kept;
    return clock;
  }
  clock = {
    now: 0,
    order: [],
    units: {},
    statuses: {},
    rescues: {},
    opportunityGates: {},
    pendingMainPoints: [],
    currentAction: null,
    terminal: null,
    log: [],
    seq: 0,
  };
  battleState.combatState.clock = clock;
  const ids = units.map(u => String(u.id));
  if (options.stableOrder) {
    const seen = new Set();
    for (const raw of options.stableOrder) {
      const id = String(raw);
      if (ids.includes(id) && !seen.has(id)) { clock.order.push(id); seen.add(id); }
    }
    for (const id of ids) {
      if (!seen.has(id)) { clock.order.push(id); seen.add(id); }
    }
  } else {
    clock.order = ids.slice().sort(); // 稳定 ID 字典序兜底，不受 DOM/读档/枚举顺序影响
  }
  for (const rec of units) {
    const id = String(rec.id);
    clock.units[id] = makeUnitRecord(rec, 0, speedOf(id));
    ensureProgress(battleState, id);
  }
  pushLog(clock, 0, 'clock-created', { order: clock.order.slice() });
  return clock;
}

// ---------- 命令（行动冻结期与事件点均可调用） ----------

export function dispatchClock(battleState, command, rulesContext = {}) {
  const clock = battleState.combatState && battleState.combatState.clock;
  if (!clock) throw new Error('时钟未初始化（先调用 createClock）');
  const t = clock.now;
  switch (command.type) {
    case 'recordPacingAction': {
      // 此时所有单位已计距到行动发放点；只改变后续推进，不挪动已跑距离。
      if (command.player) {
        for (const u of Object.values(clock.units)) if (u.repeatActions) u.repeatActions = 0;
      } else {
        const u = clock.units[command.unitId];
        u.repeatActions = (u.repeatActions || 0) + 1;
      }
      return { ok: true, events: [] };
    }
    case 'speedChange': {
      const u = clock.units[command.unitId];
      if (!u) return { ok: false, events: [] };
      resyncUnitSpeed(battleState, command.unitId, rulesContext, t); // 途中变速保留已完成距离（S02 L32）
      return { ok: true, events: [pushLog(clock, t, 'speed-changed', { unitId: command.unitId, speed: u.speed })] };
    }
    case 'applyStatus': {
      const source = command.source && typeof command.source === 'object'
        ? Object.assign({}, command.source)
        : command.source;
      const events = applyStatusRecord(battleState, Object.assign({}, command, { source }), t);
      if (command.kind === 'spd') resyncUnitSpeed(battleState, command.unitId, rulesContext, t);
      return { ok: true, events };
    }
    case 'removeStatus': {
      const key = statusKeyOf(command.unitId, command.source);
      const s = clock.statuses[key];
      if (!s) return { ok: false, events: [] };
      delete clock.statuses[key];
      const ev = pushLog(clock, t, 'status-removed', { key, unitId: command.unitId, source: command.source, kind: s.kind });
      if (s.kind === 'spd') resyncUnitSpeed(battleState, command.unitId, rulesContext, t);
      return { ok: true, events: [ev] };
    }
    case 'applyCooldown': {
      if (!battleState.cooldowns) battleState.cooldowns = {};
      if (!battleState.cooldowns[command.unitId]) battleState.cooldowns[command.unitId] = {};
      const endAt = t + command.duration;
      battleState.cooldowns[command.unitId][command.skillKey] = endAt;
      return { ok: true, events: [pushLog(clock, t, 'cooldown-applied', { unitId: command.unitId, skillKey: command.skillKey, endAt })] };
    }
    case 'applyStun': {
      const u = clock.units[command.unitId];
      if (!u) return { ok: false, events: [] };
      u.stun = { permanent: !!command.permanent };
      return { ok: true, events: [pushLog(clock, t, 'stun-applied', { unitId: command.unitId, permanent: !!command.permanent })] };
    }
    case 'scheduleRescue': {
      const deadline = command.deadline !== undefined ? command.deadline : t + DEFAULT_RESCUE_TIME;
      clock.rescues[command.unitId] = { deadline };
      return { ok: true, events: [pushLog(clock, t, 'rescue-scheduled', { unitId: command.unitId, deadline })] };
    }
    case 'cancelRescue': {
      if (!clock.rescues[command.unitId]) return { ok: false, events: [] };
      delete clock.rescues[command.unitId];
      return { ok: true, events: [pushLog(clock, t, 'rescue-cancelled', { unitId: command.unitId })] };
    }
    case 'registerUnit': {
      // 新生成单位：立即占位、从零跑完整圈（SPEC S02 L35）；已存在单位拒绝重复注册（接战不是新生成）
      const rec = command.unit;
      const id = String(rec.id);
      if (clock.units[id]) return { ok: false, events: [] };
      const speed = rulesContext.speedOf ? rulesContext.speedOf(id) : rec.baseSpd;
      clock.units[id] = makeUnitRecord(rec, t, speed);
      ensureProgress(battleState, id);
      clock.order.push(id);
      const ev = pushLog(clock, t, 'unit-registered', {
        unitId: id, via: 'spawn',
        firstActionAt: speed > 0 ? t + LAP_DISTANCE / speed : null,
      });
      return { ok: true, events: [ev] };
    }
    case 'exitUnit': {
      const u = clock.units[command.unitId];
      if (!u) return { ok: false, events: [] };
      u.status = command.cause === 'left' ? 'out' : 'down';
      u.stun = null;
      u.extraMain = 0;
      u.mainPointSources = [];
      clearPendingPointsFor(battleState, command.unitId); // 倒地清除待领取额外主行动点（SPEC S10 L172）
      if (clock.currentAction && clock.currentAction.unitId === command.unitId) {
        clock.currentAction = null; // 行动者倒地：终止当前剩余操作并解冻（SPEC S10 L172）
      }
      return { ok: true, events: [pushLog(clock, t, 'unit-exited', { unitId: command.unitId, status: u.status, cause: command.cause !== undefined ? command.cause : 'down' })] };
    }
    case 'reenterUnit': {
      // 复活/救起：从零跑圈；未到期状态按时间继续存在（SPEC S10 L171-172）
      const u = clock.units[command.unitId];
      if (!u) return { ok: false, events: [] };
      u.status = 'active';
      const p = ensureProgress(battleState, command.unitId);
      p.distance = 0;
      u.lastSync = t;
      return { ok: true, events: [pushLog(clock, t, 'unit-reentered', {
        unitId: command.unitId,
        nextActionAt: u.speed > 0 ? t + LAP_DISTANCE / u.speed : null,
      })] };
    }
    case 'markHit': {
      const u = clock.units[command.unitId];
      if (!u) return { ok: false, events: [] };
      u.hitSinceWindow = true;
      return { ok: true, events: [pushLog(clock, t, 'hit-marked', { unitId: command.unitId })] };
    }
    case 'grantMainPoint': {
      const ev = grantMainPoint(battleState, command.targetId, command.sourceKey, t);
      return { ok: !!ev, events: ev ? [ev] : [] };
    }
    case 'setOpportunityGate': {
      const readyAt = t + ROUND_TIME;
      clock.opportunityGates[command.key] = readyAt;
      return { ok: true, events: [pushLog(clock, t, 'opportunity-gate-set', { key: command.key, readyAt })] };
    }
    case 'endAction': {
      const cur = clock.currentAction;
      if (!cur || cur.unitId !== command.unitId) return { ok: false, events: [] };
      const u = clock.units[command.unitId];
      u.extraMain = 0; // 未用行动点在本次行动结束时清除（SPEC S03 L44）
      u.mainPointSources = [];
      clock.currentAction = null;
      return { ok: true, events: [pushLog(clock, t, 'action-ended', { unitId: command.unitId })] };
    }
    default:
      return { ok: false, events: [] };
  }
}

// ---------- 推进 ----------

function emitTerminal(battleState, type, events) {
  const clock = battleState.combatState.clock;
  if (!clock.terminal) {
    clock.terminal = { type, at: clock.now };
    events.push(pushLog(clock, clock.now, type, {}));
  }
  return { status: 'terminal', time: clock.now, terminal: clock.terminal, events };
}

export function advanceToNextAction(battleState, rulesContext = {}) {
  const clock = battleState.combatState && battleState.combatState.clock;
  if (!clock) throw new Error('时钟未初始化（先调用 createClock）');
  if (clock.currentAction) return { status: 'frozen', time: clock.now };
  if (clock.terminal) return { status: 'terminal', time: clock.now, terminal: clock.terminal, events: [] };
  for (;;) {
    // 僵持预检：无人可行动、无速度恢复可能、也无能导向终局的未来事件（S02 L36；周期回血不算）
    if (!hasActionableUnit(battleState) && !hasFutureSpeedRestore(battleState) && !hasBattleEndingFuture(battleState)) {
      return emitTerminal(battleState, 'stalemate', []);
    }
    // 最近事件点 = 效果域事件与各单位自然到轴的最小者
    let next = nextEffectEventTime(battleState);
    for (const id in clock.units) {
      const a = nextArrivalTimeOf(battleState, id);
      if (a < next) next = a;
    }
    if (!isFinite(next)) return emitTerminal(battleState, 'stalemate', []);
    // 跳点 + 计距（行动冻结期在入口已被拦下，时间永不被现实等待推进）
    clock.now = next;
    creditDistance(battleState, next);
    // 同刻阶段①②：周期效果 → 到期/冷却解除/救援截止
    const hooks = {
      onEvent: ev => { if (rulesContext.onEvent) rulesContext.onEvent(ev); },
      resyncSpeed: unitId => resyncUnitSpeed(battleState, unitId, rulesContext, next),
    };
    const events = settlePhase12(battleState, next, hooks);
    // 战斗终局钩子（调用方在 onEvent 内同步改动 HP/生死后判定）
    if (rulesContext.checkBattleEnd) {
      const term = rulesContext.checkBattleEnd(battleState);
      if (term) return emitTerminal(battleState, term.type || 'battle-end', events);
    }
    // 阶段③：到轴者按基础敏捷降序→稳定序升序取得行动权；眩晕者跳过并重跑一圈
    const arrivals = collectArrivals(battleState, next);
    const batchEvents = [];
    for (const u of arrivals) {
      if (u.stun) { batchEvents.push(processStunSkip(battleState, u.id, next)); continue; }
      const g = grantNaturalAction(battleState, u.id, next);
      clock.currentAction = { unitId: u.id, resources: g.resources };
      return {
        status: 'action', time: next, unitId: u.id, resources: g.resources,
        events: events.concat(batchEvents, g.events),
      };
    }
    // 本点全部被眩晕跳过或为纯效果事件 → 继续推进到下一事件
  }
}

// ---------- 查询与投影 ----------

export function getUnitNextActionAt(battleState, unitId) {
  const at = nextArrivalTimeOf(battleState, unitId);
  return isFinite(at) ? at : null;
}

export function getActionState(battleState) {
  const clock = battleState.combatState && battleState.combatState.clock;
  if (!clock || !clock.currentAction) return null;
  const u = clock.units[clock.currentAction.unitId];
  return {
    unitId: clock.currentAction.unitId,
    resources: { moveQuota: 1, main: 1 + (u ? u.extraMain : 0), aux: 1 },
  };
}

export function isOpportunityReadyAt(battleState, key) {
  return isOpportunityReady(battleState, key);
}

// UI 行动轴投影（S02 L37）：友方全显，敌方仅在可见集合内返回；隐藏者零占位、零人数、零身份。
// 倒地/离场/零速无到轴者不进轴；轴序 = 到轴时刻升序，同刻按基础敏捷降序 → 稳定序升序。
export function getVisibleTurnQueue(battleState, viewerSide, visibilityState) {
  const clock = battleState.combatState && battleState.combatState.clock;
  if (!clock) throw new Error('时钟未初始化（先调用 createClock）');
  const visible = new Set(((visibilityState && visibilityState.visibleUnitIds) || []).map(String));
  const rows = [];
  for (const id in clock.units) {
    const u = clock.units[id];
    if (u.status !== 'active') continue;
    const isAlly = u.side === viewerSide;
    if (!isAlly && !visible.has(id)) continue;
    const at = nextArrivalTimeOf(battleState, id);
    if (!isFinite(at)) continue;
    rows.push({ unitId: id, side: u.side, name: u.name, nextActionAt: at });
  }
  const idx = {};
  clock.order.forEach((id, i) => { idx[id] = i; });
  rows.sort((a, b) =>
    (a.nextActionAt - b.nextActionAt) ||
    (clock.units[b.unitId].baseSpd - clock.units[a.unitId].baseSpd) ||
    ((idx[a.unitId] !== undefined ? idx[a.unitId] : 1e15) - (idx[b.unitId] !== undefined ? idx[b.unitId] : 1e15)));
  return rows;
}
