// ==========================================
// 战棋 P03 效果与行动资格域（scheduler）
// 纯规则模块：无 DOM、无 rAF、无现实定时器（SPEC S02 L31）。
// 不 import clock.mjs（clock 单向依赖本模块）；契约见 doc/tactics/P03-CLOCK-CONTRACT.md。
// 同刻三阶段（SPEC S02 L33）：①周期效果最后结算 → ②状态到期/冷却解除/救援截止 → ③到轴角色取得行动权。
// 首参统一为 battleState（progress/cooldowns 是其兄弟字段，clock = battleState.combatState.clock）。
// ==========================================

export const LAP_DISTANCE = 10000;        // 一圈行动距离（SPEC S02 L27）
export const ROUND_TIME = 100;            // 100 虚拟时间 = 1 回合（SPEC S06 L119）
export const DEFAULT_RESCUE_TIME = 300;   // 临时盟友缺省救援窗口（SPEC S10 L170 / S14）

const EPS = 1e-9;

function clockOf(battleState) {
  return battleState.combatState.clock;
}

export function statusKeyOf(unitId, source) {
  if (source && typeof source === 'object') {
    const casterId = source.casterId ?? source.caster ?? '';
    const skillId = source.skillId ?? source.skill ?? '';
    const effectId = source.effectId ?? source.effect ?? '';
    return [unitId, casterId, skillId, effectId].map(String).join('\u0000');
  }
  return String(unitId) + '\u0000' + String(source);
}

// 事件流水：所有结算痕迹按序记录，供重放校验
function pushLog(clock, t, type, extra = {}) {
  const entry = Object.assign({ seq: ++clock.seq, t, type }, extra);
  clock.log.push(entry);
  return entry;
}

// ---------- 距离与到轴时刻（clock 与 scheduler 共用的跑圈数学） ----------

export function ensureProgress(battleState, unitId) {
  if (!battleState.progress) battleState.progress = {};
  if (!battleState.progress[unitId]) battleState.progress[unitId] = { distance: 0, lap: 0 };
  return battleState.progress[unitId];
}

export function distanceOf(battleState, unitId) {
  const p = battleState.progress && battleState.progress[unitId];
  return p ? p.distance : 0;
}

function lapSpeed(u) {
  return u.speed / (1 + (u.repeatActions || 0));
}

// 把全部参跑单位按排轴速度结算到 now；到轴者封顶本圈，等待行动资格
export function creditDistance(battleState, now) {
  const clock = clockOf(battleState);
  for (const id in clock.units) {
    const u = clock.units[id];
    if (u.status !== 'active' || !(u.speed > 0)) continue;
    if (now <= u.lastSync + EPS) continue;
    const p = ensureProgress(battleState, id);
    p.distance += (now - u.lastSync) * lapSpeed(u);
    u.lastSync = now;
    if (p.distance > LAP_DISTANCE) p.distance = LAP_DISTANCE; // 只会在到达事件点时触顶
  }
}

// 下次自然到轴时刻（active 且正速才有；否则 Infinity）
export function nextArrivalTimeOf(battleState, unitId) {
  const clock = clockOf(battleState);
  const u = clock.units[unitId];
  if (!u || u.status !== 'active' || !(u.speed > 0)) return Infinity;
  const d = distanceOf(battleState, unitId);
  return u.lastSync + (LAP_DISTANCE - d) / lapSpeed(u);
}

// ---------- 资格与终局预检 ----------

// 是否存在可取得自然行动的单位（永久眩晕者永不行动，不算可参与）
export function hasActionableUnit(battleState) {
  const clock = clockOf(battleState);
  for (const id in clock.units) {
    const u = clock.units[id];
    if (u.status === 'active' && u.speed > 0 && !(u.stun && u.stun.permanent)) return true;
  }
  return false;
}

// 是否存在未到期的 'spd' 效果（到期会恢复速度 → 不算僵持）
export function hasFutureSpeedRestore(battleState) {
  const clock = clockOf(battleState);
  for (const key in clock.statuses) {
    const s = clock.statuses[key];
    if (s.kind === 'spd' && s.endAt != null && s.endAt >= clock.now - EPS) return true;
  }
  return false;
}

// 是否存在可导向终局/行动恢复的未来事件（毒燃未跳完、救援截止；周期回血不算——无法改变行动资格）
export function hasBattleEndingFuture(battleState) {
  const clock = clockOf(battleState);
  for (const key in clock.statuses) {
    const s = clock.statuses[key];
    if ((s.kind === 'poison' || s.kind === 'burn') && s.nextTickAt !== undefined && s.endAt != null) return true;
  }
  for (const id in clock.rescues) return true;
  return false;
}

// 效果域最近事件时刻（状态节拍/期限、冷却到期、救援截止；无则 Infinity）
export function nextEffectEventTime(battleState) {
  const clock = clockOf(battleState);
  let min = Infinity;
  for (const key in clock.statuses) {
    const s = clock.statuses[key];
    if (s.nextTickAt !== undefined && s.nextTickAt < min) min = s.nextTickAt;
    if (s.endAt != null && s.endAt < min) min = s.endAt;
  }
  const cds = battleState.cooldowns || {};
  for (const uid in cds) {
    for (const k in cds[uid]) if (cds[uid][k] < min) min = cds[uid][k];
  }
  for (const uid in clock.rescues) {
    if (clock.rescues[uid].deadline < min) min = clock.rescues[uid].deadline;
  }
  return min;
}

// ---------- 同刻阶段①②：周期效果与到期/解除/截止 ----------

export function settlePhase12(battleState, t, hooks = {}) {
  const clock = clockOf(battleState);
  const events = [];
  // 阶段①：排在 t 的周期效果（含末跳——与到期同刻时先跳后移）
  for (const key of Object.keys(clock.statuses)) {
    const s = clock.statuses[key];
    // 上一个周期回调可能通过复活／驱散移除后续状态。
    if (!s || s.nextTickAt === undefined || Math.abs(s.nextTickAt - t) >= EPS) continue;
    let ev;
    if (s.kind === 'stealth-window') {
      const u = clock.units[s.unitId];
      ev = pushLog(clock, t, 'stealth-window', { key, unitId: s.unitId, source: s.source, wasHit: !!(u && u.hitSinceWindow) });
      if (u) u.hitSinceWindow = false;
    } else {
      const type = (s.kind === 'poison' || s.kind === 'burn') ? 'dot-tick' : 'periodic-tick';
      const target = clock.units[s.unitId];
      ev = pushLog(clock, t, type, {
        key, unitId: s.unitId, source: s.source, kind: s.kind, strength: s.strength,
        suppressed: !!(target && target.status !== 'active'),
      });
    }
    events.push(ev);
    hooks.onEvent && hooks.onEvent(ev);
    if (clock.statuses[key] !== s) continue;
    s.nextTickAt += s.interval;
    if (s.endAt != null && s.nextTickAt > s.endAt + EPS) delete s.nextTickAt; // 节拍被期限截断
  }
  // 阶段②：状态到期（'spd' 到期触发重算）→ 冷却解除 → 救援截止
  for (const key of Object.keys(clock.statuses)) {
    const s = clock.statuses[key];
    if (!s || s.endAt == null || s.endAt > t + EPS) continue;
    const type = s.kind === 'spd' ? 'spd-expired' : (s.kind === 'defend' ? 'defend-expired' : 'status-expired');
    const ev = pushLog(clock, t, type, { key, unitId: s.unitId, source: s.source, kind: s.kind, strength: s.strength });
    delete clock.statuses[key];
    events.push(ev);
    hooks.onEvent && hooks.onEvent(ev);
    if (s.kind === 'spd' && hooks.resyncSpeed) hooks.resyncSpeed(s.unitId);
  }
  const cds = battleState.cooldowns || {};
  for (const uid of Object.keys(cds)) {
    for (const k of Object.keys(cds[uid])) {
      if (cds[uid][k] <= t + EPS) {
        const ev = pushLog(clock, t, 'cooldown-ready', { unitId: uid, skillKey: k });
        delete cds[uid][k];
        events.push(ev);
        hooks.onEvent && hooks.onEvent(ev);
      }
    }
  }
  for (const uid of Object.keys(clock.rescues)) {
    if (clock.rescues[uid].deadline <= t + EPS) {
      const ev = pushLog(clock, t, 'rescue-deadline', { unitId: uid });
      delete clock.rescues[uid];
      events.push(ev);
      hooks.onEvent && hooks.onEvent(ev);
    }
  }
  return events;
}

// ---------- 阶段③：到轴候选与行动资格 ----------

// t 时刻已跑满一圈的候选，按基础敏捷降序 → 稳定序升序（SPEC S02 L34，不受 DOM/枚举顺序影响）
export function collectArrivals(battleState, t) {
  const clock = clockOf(battleState);
  const list = [];
  for (const id in clock.units) {
    const u = clock.units[id];
    if (u.status !== 'active' || !(u.speed > 0)) continue;
    if (distanceOf(battleState, id) >= LAP_DISTANCE - EPS) list.push(u);
  }
  const idx = {};
  clock.order.forEach((id, i) => { idx[id] = i; });
  list.sort((a, b) => (b.baseSpd - a.baseSpd) || ((idx[a.id] !== undefined ? idx[a.id] : 1e15) - (idx[b.id] !== undefined ? idx[b.id] : 1e15)));
  return list;
}

// 自然行动发放：本圈完成清零计距；待领取万能点随本次自然行动交付（不同来源可叠加）
export function grantNaturalAction(battleState, unitId, now) {
  const clock = clockOf(battleState);
  const u = clock.units[unitId];
  const p = ensureProgress(battleState, unitId);
  p.lap += 1;
  p.distance = 0;
  u.lastSync = now;
  const delivered = [];
  clock.pendingMainPoints = clock.pendingMainPoints.filter(pt => {
    if (pt.targetId === unitId) { delivered.push(pt.sourceKey); return false; }
    return true;
  });
  u.mainPointSources = [];
  u.extraMain += delivered.length;
  const resources = { moveQuota: 1, main: 1, aux: 1, universal: delivered.length, deliveredMainSources: delivered };
  const ev = pushLog(clock, now, 'action-granted', { unitId, main: resources.main, aux: resources.aux, universal: resources.universal, lap: p.lap });
  return { resources, events: [ev] };
}

// 眩晕跳过：消耗下一次自然行动全部资源（不发移动/主/辅），随后重跑一圈（SPEC S06 L121）
// 待领取额外主行动点保留到下一次真实取得的自然行动
export function processStunSkip(battleState, unitId, now) {
  const clock = clockOf(battleState);
  const u = clock.units[unitId];
  if (u.stun && !u.stun.permanent) u.stun = null;
  const p = ensureProgress(battleState, unitId);
  p.distance = 0;
  u.lastSync = now;
  return pushLog(clock, now, 'stun-skip', { unitId });
}

// 再动 → 万能行动点：当前行动的目标立即加点；其他目标待领取（每来源每目标最多 1）。
// 保留存档里的 extraMain 与来源字段名。
export function grantMainPoint(battleState, targetId, sourceKey, now) {
  const clock = clockOf(battleState);
  const target = clock.units[targetId];
  if (!target || target.status !== 'active') return null;
  const cur = clock.currentAction;
  if (cur && cur.unitId === targetId) {
    if (target.mainPointSources.includes(sourceKey)) return null; // 同一再动技能本次自然行动只提供一次
    target.mainPointSources.push(sourceKey);
    target.extraMain += 1;
    cur.resources.universal = (cur.resources.universal || 0) + 1;
    return pushLog(clock, now, 'main-point-granted', { targetId, sourceKey, immediate: true });
  }
  if (clock.pendingMainPoints.some(pt => pt.targetId === targetId && pt.sourceKey === sourceKey)) return null;
  clock.pendingMainPoints.push({ targetId, sourceKey });
  return pushLog(clock, now, 'main-point-granted', { targetId, sourceKey, immediate: false });
}

export function clearPendingPointsFor(battleState, unitId) {
  const clock = clockOf(battleState);
  clock.pendingMainPoints = clock.pendingMainPoints.filter(pt => pt.targetId !== unitId);
}

// ---------- 状态登记（同源刷新保节拍，SPEC S06 L119-120） ----------

export function applyStatusRecord(battleState, cmd, now) {
  const clock = clockOf(battleState);
  if ((cmd.kind === 'poison' || cmd.kind === 'burn')
      && (!cmd.source || typeof cmd.source !== 'object'
        || cmd.source.casterId == null || cmd.source.skillId == null || cmd.source.effectId == null)) {
    throw new Error('毒/燃状态必须提供 casterId、skillId、effectId 来源身份');
  }
  const key = statusKeyOf(cmd.unitId, cmd.source);
  const prev = clock.statuses[key];
  if (prev) {
    // 同源（目标+施术者+技能+效果身份）重施：保留原跳伤节拍，仅更新强度与到期
    if (cmd.strength !== undefined) prev.strength = cmd.strength;
    if (cmd.duration !== undefined) prev.endAt = now + cmd.duration;
    if (prev.endAt != null && prev.nextTickAt !== undefined && prev.nextTickAt > prev.endAt + EPS) {
      delete prev.nextTickAt;
    }
    const ev = pushLog(clock, now, 'status-refreshed', {
      key, unitId: cmd.unitId, source: cmd.source, kind: cmd.kind,
      strength: prev.strength, endAt: prev.endAt, nextTickAt: prev.nextTickAt !== undefined ? prev.nextTickAt : null,
    });
    return [ev];
  }
  const interval = cmd.interval !== undefined && cmd.interval > 0 ? cmd.interval : ROUND_TIME;
  const rec = {
    key, unitId: cmd.unitId, source: cmd.source, kind: cmd.kind,
    strength: cmd.strength, interval,
    appliedAt: now,
    endAt: cmd.duration !== undefined ? now + cmd.duration : null,
  };
  if (cmd.kind === 'poison' || cmd.kind === 'burn' || cmd.kind === 'periodic' || cmd.kind === 'stealth-window' || cmd.kind === 'region') {
    rec.nextTickAt = now + interval; // 首跳 = 施加时刻 + 100（SPEC S06 L120）
  }
  clock.statuses[key] = rec;
  const ev = pushLog(clock, now, 'status-applied', {
    key, unitId: cmd.unitId, source: cmd.source, kind: cmd.kind,
    strength: rec.strength, endAt: rec.endAt, nextTickAt: rec.nextTickAt !== undefined ? rec.nextTickAt : null,
  });
  return [ev];
}

// ---------- 机会门槛（SPEC S03 L52：触发后100时间才能再次取得） ----------

export function isOpportunityReady(battleState, key) {
  const clock = clockOf(battleState);
  const readyAt = clock.opportunityGates[key];
  return readyAt === undefined || readyAt === null || clock.now >= readyAt - EPS;
}
