// ==========================================
// 战棋 P01 scene/battle 生命周期（纯状态转移，P01-CONTRACT 第 6 节）
// 三分支：同 scene+同 battle 续接 / 同 scene 新 battle 清进度留物件 / 新 scene 重建。
// 不实现跑圈引擎、地图生成、伤害或调度器；资源（HP/MP/库存）不进战术档。
// ==========================================

import { TACTICS_STATE_KEY } from './protocol.mjs';

export const LOAD_BRANCH_RESUME = 'resume';        // 同 scene+同 battle：续接
export const LOAD_BRANCH_NEW_BATTLE = 'new-battle'; // 同 scene+新 battle：清进度留物件
export const LOAD_BRANCH_NEW_SCENE = 'new-scene';   // 新 scene：重建

// battle 按 scene 作用域寻址
export function battleKey(sceneId, battleId) {
  return String(sceneId) + '\u0000' + String(battleId);
}

// 空战术档
export function emptyTacticsState() {
  return { version: 1, current: null, scenes: {}, battles: {} };
}

// 载入分支判定（纯函数）
export function classifyLoad(current, incoming) {
  const cur = current || { sceneId: null, battleId: null };
  const scene = incoming && incoming.sceneId || null;
  const battle = incoming && incoming.battleId || null;
  if (!scene) throw new Error('载入缺少 sceneId');
  if (!battle) throw new Error('载入缺少 battleId');
  if (cur.sceneId == null) return { branch: LOAD_BRANCH_NEW_SCENE, sceneId: scene, battleId: battle };
  if (cur.sceneId !== scene) return { branch: LOAD_BRANCH_NEW_SCENE, sceneId: scene, battleId: battle };
  if (cur.battleId == null || cur.battleId !== battle) return { branch: LOAD_BRANCH_NEW_BATTLE, sceneId: scene, battleId: battle };
  return { branch: LOAD_BRANCH_RESUME, sceneId: scene, battleId: battle };
}

// 空场景态（物件变化、门、实际位置；不含 HP/MP/库存等资源真值）
export function emptySceneState(sceneId) {
  return { sceneId, objects: {}, doors: {}, positions: {}, layout: null };
}

// 空战斗态（行动进度、每场限次用量、冷却等战斗态；同样不含资源真值）
export function emptyBattleState(sceneId, battleId) {
  return { sceneId, battleId, progress: {}, perBattleUses: {}, cooldowns: {}, combatState: {} };
}

// 显式增量应用：显式键覆盖，未提供键不动；返回是否发生变化（幂等判定用）
function applyExplicitMap(target, patch) {
  if (!patch || typeof patch !== 'object') return false;
  let changed = false;
  Object.keys(patch).forEach(k => {
    const nv = JSON.stringify(patch[k]);
    const ov = JSON.stringify(target[k]);
    if (nv !== ov) { target[k] = patch[k]; changed = true; }
  });
  return changed;
}

// 载入应用（纯函数）：
//   state          现有战术档（可 null）
//   incoming       { sceneId, battleId }
//   explicitOverrides YAML 显式增量 { objects?, doors?, positions?, layout? }（仅显式字段）
//   deps           { initScene(sceneId)→sceneSeed, initBattle(sceneId,battleId)→battleSeed } 注入计数
// 返回 { state, branch, sceneState, battleState, initSceneCalls, initBattleCalls, explicitApplied }
export function applyLoad(state, incoming, explicitOverrides = null, deps = {}) {
  const cur = state && state.current ? state.current : null;
  let classification = classifyLoad(cur, incoming);
  const savedScene = state && state.scenes && state.scenes[incoming.sceneId];
  const savedBattle = state && state.battles && state.battles[battleKey(incoming.sceneId, incoming.battleId)];
  if (savedScene && savedBattle) classification = { branch: LOAD_BRANCH_RESUME, sceneId: incoming.sceneId, battleId: incoming.battleId };
  else if (savedScene) classification = { branch: LOAD_BRANCH_NEW_BATTLE, sceneId: incoming.sceneId, battleId: incoming.battleId };
  const next = state ? JSON.parse(JSON.stringify(state)) : emptyTacticsState();
  if (!next.scenes || !next.battles) throw new Error('战术档结构不合法（缺 scenes/battles）');
  const { sceneId, battleId } = classification;
  const key = battleKey(sceneId, battleId);
  next.current = { sceneId, battleId };

  const initSceneCalls = { n: 0 };
  const initBattleCalls = { n: 0 };
  let explicitApplied = false;

  if (classification.branch === LOAD_BRANCH_RESUME) {
    // 续接：全部保留；仅应用 YAML 显式增量；重复输入无副作用
    const sceneState = next.scenes[sceneId];
    const battleState = next.battles[key];
    if (!sceneState || !battleState) throw new Error('续接分支缺少已保存的场景/战斗态');
    explicitApplied = applyExplicitMap(sceneState.objects, explicitOverrides && explicitOverrides.objects)
      | applyExplicitMap(sceneState.doors, explicitOverrides && explicitOverrides.doors)
      | applyExplicitMap(sceneState.positions, explicitOverrides && explicitOverrides.positions);
    if (explicitOverrides && explicitOverrides.layout !== undefined && JSON.stringify(sceneState.layout) !== JSON.stringify(explicitOverrides.layout)) {
      sceneState.layout = explicitOverrides.layout; explicitApplied = true;
    }
    return { state: next, branch: classification.branch, sceneState, battleState, initSceneCalls: initSceneCalls.n, initBattleCalls: initBattleCalls.n, explicitApplied: !!explicitApplied };
  }

  if (classification.branch === LOAD_BRANCH_NEW_BATTLE) {
    // 同 scene 新 battle：场景态保留（实际位置/门/物件），战斗态全新（零进度、每场额度重置）
    const sceneState = next.scenes[sceneId];
    if (!sceneState) throw new Error('同场景分支缺少已保存场景态');
    explicitApplied = applyExplicitMap(sceneState.objects, explicitOverrides && explicitOverrides.objects)
      | applyExplicitMap(sceneState.doors, explicitOverrides && explicitOverrides.doors)
      | applyExplicitMap(sceneState.positions, explicitOverrides && explicitOverrides.positions);
    const battleState = emptyBattleState(sceneId, battleId);
    if (deps.initBattle) { battleState.seed = deps.initBattle(sceneId, battleId) || null; initBattleCalls.n++; }
    next.battles[key] = battleState;
    return { state: next, branch: classification.branch, sceneState, battleState, initSceneCalls: initSceneCalls.n, initBattleCalls: initBattleCalls.n, explicitApplied: !!explicitApplied };
  }

  // 新 scene：重建场景与战斗；独立角色配置（roster）不受影响
  const sceneState = emptySceneState(sceneId);
  if (deps.initScene) { sceneState.seed = deps.initScene(sceneId) || null; initSceneCalls.n++; }
  // 显式物件/站位优先于种子；显式增量是否实际改变状态
  let sceneChanged = applyExplicitMap(sceneState.objects, explicitOverrides && explicitOverrides.objects);
  sceneChanged = applyExplicitMap(sceneState.doors, explicitOverrides && explicitOverrides.doors) || sceneChanged;
  sceneChanged = applyExplicitMap(sceneState.positions, explicitOverrides && explicitOverrides.positions) || sceneChanged;
  if (explicitOverrides && explicitOverrides.layout !== undefined) { sceneState.layout = explicitOverrides.layout; sceneChanged = true; }
  const battleState = emptyBattleState(sceneId, battleId);
  if (deps.initBattle) { battleState.seed = deps.initBattle(sceneId, battleId) || null; initBattleCalls.n++; }
  next.scenes[sceneId] = sceneState;
  next.battles[key] = battleState;
  return { state: next, branch: classification.branch, sceneState, battleState, initSceneCalls: initSceneCalls.n, initBattleCalls: initBattleCalls.n, explicitApplied: sceneChanged };
}

// 重开（关闭后重开同 scene/battle）：战术字段恢复，资源不恢复（调用方重新走 resolveHero 读 YAML/MMS）。
// 返回现有场景态/战斗态引用结构（若档里没有则等同新 scene 分支）。
export function reopenLoad(state, incoming, deps = {}) {
  const key = battleKey(incoming.sceneId, incoming.battleId);
  const hasScene = !!(state && state.scenes && state.scenes[incoming.sceneId]);
  const hasBattle = !!(state && state.battles && state.battles[key]);
  if (hasScene && hasBattle) {
    const next = JSON.parse(JSON.stringify(state));
    next.current = { sceneId: incoming.sceneId, battleId: incoming.battleId };
    return { state: next, branch: 'reopen-existing', sceneState: next.scenes[incoming.sceneId], battleState: next.battles[key], initSceneCalls: 0, initBattleCalls: 0 };
  }
  return applyLoad(state, incoming, null, deps);
}
