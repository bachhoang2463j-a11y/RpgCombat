// ==========================================
// 战棋 P01 存取层：三键独立存档 + 整档替换语义 + 最小 MMS 桥契约（P01-CONTRACT 第 3 节）
// 适配酒馆助手变量 API；P01 仅在 mock 中验证，不连接真实酒馆/MMS。
// ==========================================

import {
  TACTICS_ROSTER_KEY, TACTICS_STATE_KEY, TACTICS_BRIDGE_KEY,
  COMBAT_RESULT_VAR_KEY, COMBAT_RESULT_EVENT, COMBAT_APPLIED_EVENT,
  COMBAT_BRIDGE_CHANNEL, TACTICS_RESULT_ID_PREFIX,
} from './protocol.mjs';

export {
  TACTICS_ROSTER_KEY, TACTICS_STATE_KEY, TACTICS_BRIDGE_KEY,
  COMBAT_RESULT_VAR_KEY, COMBAT_RESULT_EVENT, COMBAT_APPLIED_EVENT,
  COMBAT_BRIDGE_CHANNEL, TACTICS_RESULT_ID_PREFIX,
};

// ---------- 变量 API 适配（缺失即抛错，不做静默降级） ----------

function api() {
  const f = typeof getVariables === 'function' ? getVariables : null;
  if (!f) throw new Error('酒馆变量 API 不可用');
  return f;
}

// ---------- 读 ----------

// 读整作用域变量表（副本）
export function readScope(type = 'chat') {
  const vars = api()({ type }) || {};
  return JSON.parse(JSON.stringify(vars));
}

export function readTacticsRoster(type = 'chat') {
  const payload = readScope(type)[TACTICS_ROSTER_KEY];
  if (!payload || typeof payload !== 'object') return null;
  if (payload.version !== 1 || !Array.isArray(payload.heroes)) return null;
  return JSON.parse(JSON.stringify(payload));
}

export function readTacticsState(type = 'chat') {
  const payload = readScope(type)[TACTICS_STATE_KEY];
  if (!payload || typeof payload !== 'object') return null;
  return JSON.parse(JSON.stringify(payload));
}

export function readTacticsBridge(type = 'chat') {
  const payload = readScope(type)[TACTICS_BRIDGE_KEY];
  if (!payload || typeof payload !== 'object') return null;
  return JSON.parse(JSON.stringify(payload));
}

// ---------- 写：整档替换（防深合并残留） ----------

// 保存战棋键：读当前作用域表 → 只替换本方键 → replaceVariables 整表写回（保留其他应用键）。
// 必须用整档替换而不是 insertOrAssign：删除的技能/子技能/字段不能在档里残留。
export function saveTacticsKey(key, payload, type = 'chat') {
  const vars = readScope(type);
  vars[key] = JSON.parse(JSON.stringify(payload));
  if (typeof replaceVariables !== 'function') throw new Error('replaceVariables 不可用');
  replaceVariables(vars, { type });
  return vars;
}

export function saveTacticsRoster(payload, type = 'chat') {
  if (!payload || payload.version !== 1 || !Array.isArray(payload.heroes)) throw new Error('roster 载荷不合法');
  return saveTacticsKey(TACTICS_ROSTER_KEY, payload, type);
}

export function saveTacticsState(payload, type = 'chat') {
  if (!payload || payload.version !== 1 || !payload.scenes || !payload.battles) throw new Error('state 载荷不合法');
  return saveTacticsKey(TACTICS_STATE_KEY, payload, type);
}

export function saveTacticsBridge(payload, type = 'chat') {
  if (!payload || payload.version !== 1) throw new Error('bridge 载荷不合法');
  return saveTacticsKey(TACTICS_BRIDGE_KEY, payload, type);
}

// ---------- MMS 兼容桥（最小契约；P01 仅结构定义与 mock 验证） ----------

// 战棋结果 ID：rt- 前缀（MMS 只认 id+heroes，不检查来源）
export function makeTacticsResultId(now = Date.now()) {
  return TACTICS_RESULT_ID_PREFIX + now + '-' + Math.random().toString(36).slice(2, 8);
}

// 战后结果载荷（结构同原版 {v,id,ts,outcome,round,heroes}；heroes 条目白名单）
export function buildTacticsResultPayload(outcome, round, heroes, now = Date.now()) {
  const list = (Array.isArray(heroes) ? heroes : []).map(h => ({
    name: h.name,
    alive: !!h.alive,
    hp: Math.floor(Math.max(0, h.hp)), maxHp: h.maxHp,
    mp: Math.floor(Math.max(0, h.mp)), maxMp: h.maxMp,
    atk: h.atk, armor: h.def, speed: h.spd,
    items: (Array.isArray(h.items) ? h.items : []).filter(it => it && it.category !== '道具').map(it => ({
      name: it.name, count: it.count || 0, category: it.category,
    })),
  }));
  return { v: 1, id: makeTacticsResultId(now), ts: now, outcome, round, heroes: list };
}

// 本端回执匹配：只认 pendingId（桥台账 pendingId/lastAckId）
export function ackTacticsBridge(pendingId, ackPayload) {
  const bridge = readTacticsBridge() || { version: 1, pendingId: null, lastAckId: null };
  if (bridge.pendingId && ackPayload && ackPayload.id === bridge.pendingId) {
    bridge.lastAckId = ackPayload.id;
    bridge.pendingId = null;
    saveTacticsBridge(bridge);
    return { matched: true, bridge };
  }
  return { matched: false, bridge };
}
