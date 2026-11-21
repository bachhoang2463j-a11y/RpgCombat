// ==========================================
// 战棋 P02 主入口：P01 薄适配 + 生命周期路由 + 视图 combatToken 唯一代际
// 职责：YAML 文本 → parseYamlText → loadTacticsRoster（真实 P01 装配入口）→
//   lifecycle.applyLoad 三分支 → sandbox.mount/update/reset 路由。
// 对齐确认 ①：P01 无战场单位身份生成器（契约"同名配置匹配与战场单位身份分离"），
//   本入口按 (side, name, 出现序号) 确定性派生 scene 内稳定 ID——同一输入重放 ID 不变，
//   不用时间戳/随机数/DOM 顺序；这是视图身份适配，不是第二套身份系统。
// 对齐确认 ③：P01 无视图 combatToken，换代集中在本入口；sandbox/子模块只做快照相等判断。
// 独立页模式：酒馆变量 API 缺失时装内存宿主（真实 storage 路径不变）；酒馆 iframe 用真实实现。
// ==========================================

import { parseYamlText } from './parser.mjs';
import { loadTacticsRoster, readTacticsState, saveTacticsState } from './storage.mjs';
import { applyLoad } from './lifecycle.mjs';
import { createSandbox } from './sandbox.mjs';
import { buildShell } from './ui-shell.mjs';
import { resolveAvatarUrl } from './unit-view.mjs';
import { TEST_ROOM } from './scene.mjs';
import { createBattle, BASIC_ATTACK } from './battle.mjs';
import { getVisibleTurnQueue } from './clock.mjs';
import { emptyBattleState } from './lifecycle.mjs';

// ---------- P02 固定图库（同一张权威几何，两个 sceneId 身份；不做生成器） ----------
const SCENE_LIBRARY = {
  'sc-test-room': TEST_ROOM,
  'sc-second-room': { ...TEST_ROOM, sceneId: 'sc-second-room' },
};
export function sceneForState(sceneId, sceneState = {}) {
  const s = SCENE_LIBRARY[sceneId];
  if (!s) throw new Error('P02 固定图库无此场景: ' + sceneId);
  const scene = JSON.parse(JSON.stringify(sceneState.layout || s));
  scene.sceneId = sceneId;
  scene.objects = scene.objects.filter(obj => sceneState.objects?.[obj.id] !== null).map(obj => {
    const next = { ...obj, ...(sceneState.objects?.[obj.id] || {}) };
    if (obj.kind === 'door' && Object.hasOwn(sceneState.doors || {}, obj.id)) next.open = sceneState.doors[obj.id];
    return next;
  });
  return scene;
}

// ---------- 默认夹具输入（与 integration-test/fixtures/tactics/p02-fixture.mjs 同源） ----------
// 我方：书采×2（同名不同 ID）+ 小黑（轻型）；敌方：堕天使（大型 2×2）+ 杂兵×2（乘数展开）
export const DEFAULT_YAML_A = [
  '战斗数据栏:',
  '  协议版本: 1',
  '  场景ID: sc-test-room',
  '  战斗ID: bt-01',
  '  我方列表:',
  '    - 角色:',
  '        名字: 书采',
  '        原型: 标准人形',
  '        属性: "[HP:30] [MP:20] [Atk:12] [Speed:100]"',
  '        技能:',
  '          - "【火舌】【远程】[MP:6] [power:18] [单体] [射程:15]"',
  '        物品: []',
  '    - 角色:',
  '        名字: 书采',
  '        原型: 标准人形',
  '        属性: "[HP:28] [MP:16] [Atk:10] [Speed:90]"',
  '        技能: []',
  '        物品: []',
  '    - 角色:',
  '        名字: 小黑',
  '        原型: 轻型生物',
  '        属性: "[HP:22] [MP:10] [Atk:9] [Speed:120]"',
  '        技能: []',
  '        物品: []',
  '  敌方列表:',
  '    - 角色:',
  '        名字: 堕天使',
  '        原型: 大型生物',
  '        属性: "[HP:60] [MP:20] [Atk:16] [Speed:80]"',
  '        技能: []',
  '    - 角色:',
  '        名字: 杂兵*2',
  '        原型: 轻型生物',
  '        属性: "[HP:14] [Atk:6] [Speed:70]"',
  '        技能: []',
].join('\n');

export const DEFAULT_YAML_B = DEFAULT_YAML_A
  .replace('战斗ID: bt-01', '战斗ID: bt-02'); // 同场景新战斗：保留位置/物件，清进度

export const DEFAULT_YAML_C = DEFAULT_YAML_A
  .replace('场景ID: sc-test-room', '场景ID: sc-second-room'); // 新场景：重建

// 夹具站位（键 = 派生单位 ID；见 deriveUnitId）
export const DEFAULT_PLACEMENTS = {
  'h:书采':   { col: 3,  row: 4,  facing: 90 },
  'h:书采:2': { col: 5,  row: 4,  facing: 90 },
  'h:小黑':   { col: 4,  row: 6,  facing: 0 },
  'e:堕天使': { col: 14, row: 10, facing: 180 },
  'e:杂兵·1': { col: 16, row: 14, facing: 270 },
  'e:杂兵·2': { col: 16, row: 16, facing: 270 },
};

// ---------- 派生单位 ID（确定性；同 scene 稳定；前缀 h:/e: 与夹具站位键对齐） ----------
export function deriveUnitId(side, name, occurrence) {
  const prefix = side === 'hero' ? 'h' : 'e';
  return prefix + ':' + name.replace(/%/g, '%25').replace(/:/g, '%3A') + (occurrence > 1 ? ':' + occurrence : '');
}

// ---------- 独立页内存变量宿主（真实 storage 路径不变；酒馆 iframe 不进此分支） ----------
function ensureMemoryVarHost() {
  if (typeof window.getVariables === 'function') return;
  const store = { global: {}, chat: {}, message: {} };
  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const bucket = (opt) => {
    const o = opt || {};
    if (o.type === 'message') {
      const id = o.message_id == null ? 0 : o.message_id;
      if (!store.message[id]) store.message[id] = {};
      return store.message[id];
    }
    if (o.type === 'chat') return store.chat;
    return store.global;
  };
  window.getVariables = (opt) => clone(bucket(opt));
  window.replaceVariables = (vars, opt) => {
    const b = bucket(opt);
    for (const k of Object.keys(b)) delete b[k];
    Object.assign(b, clone(vars));
    return clone(bucket(opt));
  };
  window.insertOrAssignVariables = (vars, opt) => {
    const b = bucket(opt);
    for (const k of Object.keys(vars || {})) {
      b[k] = clone(vars[k]); // P02 只整键读写，深合并在 P01 测试中验证
    }
    return clone(bucket(opt));
  };
}

// ---------- P01 输出 → 视图数据（薄适配） ----------
export function buildViewData(block, resolvedHeroes, scene, positions, combatToken) {
  const units = [];
  const footprintsById = {};
  const occ = new Map();
  const addUnit = (src, side) => {
    const key = side + ':' + src.name;
    const n = (occ.get(key) || 0) + 1;
    occ.set(key, n);
    const id = deriveUnitId(side, src.name, n);
    const fpIn = src.footprint;
    const fp = fpIn && fpIn.width > 0 && fpIn.height > 0
      ? { width: Math.round(fpIn.width), height: Math.round(fpIn.height) }
      : { width: 1, height: 1 };
    footprintsById[id] = fp;
    units.push({
      id, side, name: src.name, footprint: fp, img: src.img || null,
      avatarUrl: resolveAvatarUrl({ img: src.img, name: src.name }),
      bars: { hp: src.hp == null ? src.maxHp : src.hp, maxHp: src.maxHp || 0, mp: src.mp == null ? src.maxMp : src.mp, maxMp: src.maxMp || 0 },
      skills: Array.isArray(src.skills) ? src.skills : [],
      items: Array.isArray(src.items) ? src.items : [],
      ref: src, // 资源真值引用（不复制 HP/MP）
    });
  };
  (resolvedHeroes || []).forEach(h => addUnit(h, 'hero'));
  (block.enemies || []).forEach(e => addUnit(e, 'enemy'));

  const placementsById = {};
  for (const u of units) {
    const p = positions[u.id];
    if (!p) throw new Error('单位缺少站位: ' + u.id);
    placementsById[u.id] = { col: p.col, row: p.row, facing: p.facing || 0 };
  }
  return { sceneId: scene.sceneId, battleId: block.battleId, scene, units, footprintsById, placementsById, combatToken };
}

// ---------- App ----------
export function createApp(rootEl, opts = {}) {
  ensureMemoryVarHost();
  const shell = buildShell(rootEl);
  const sandbox = createSandbox(shell.els.mapSlot, { getSafeRect: () => shell.getSafeRect() });
  let combatToken = {}; // main 唯一换代；对象快照相等语义
  let battle = null;
  let inputMode = null;
  let pendingAim = null;
  let enemyTimer = null;
  let currentState = null;
  let lastResult = null;

  shell.onUnitClick = (unitId) => {
    const snap = sandbox.getUnitView();
    if (!snap || !unitId) return;
    // 聚焦单位世界中心（读 placement，不读头像 DOM rect）
    const appData = currentViewData;
    const p = appData && appData.placementsById[unitId];
    if (!p) return;
    const fp = appData.footprintsById[unitId] || { width: 1, height: 1 };
    sandbox.focusWorld(p.col + fp.width / 2, p.row + fp.height / 2);
    shell.setSelected(unitId);
  };
  shell.onReset = () => loadYaml(currentYamlText || opts.defaultYaml || DEFAULT_YAML_A, { forceReset: true });

  sandbox.onSelect((unit) => {
    shell.setSelected(unit ? unit.id : null);
  });

  let currentYamlText = null;
  let currentViewData = null;
  const openingStates = new Map();

  function loadYaml(text, { forceReset = false, positions = {}, sceneOverrides = {} } = {}) {
    if (opts.playable && !forceReset && battle && text === currentYamlText && !Object.keys(positions).length && !Object.keys(sceneOverrides).length) {
      return { branch: 'resume', viewData: currentViewData };
    }
    const block = parseYamlText(text);
    const state = readTacticsState();
    const incoming = { sceneId: block.sceneId, battleId: block.battleId };
    const knownScene = state?.scenes?.[block.sceneId];
    const defaults = opts.defaultPlacements || DEFAULT_PLACEMENTS;
    const explicit = { ...sceneOverrides, positions: { ...positions } };
    // 仅为尚无位置的固定夹具单位补初始站位，不覆盖已保存站位。新增单位由调用方显式给站位。
    for (const [id, p] of Object.entries(defaults)) {
      if (!Object.hasOwn(knownScene?.positions || {}, id) && !Object.hasOwn(positions, id)) explicit.positions[id] = p;
    }
    const base = state;
    if (forceReset && openingStates.has(block.sceneId)) {
      base.scenes[block.sceneId] = structuredClone(openingStates.get(block.sceneId));
    }
    const result = applyLoad(base, incoming, explicit, {});
    if (forceReset) {
      result.battleState = emptyBattleState(block.sceneId, block.battleId);
      result.state.battles[block.sceneId + '\u0000' + block.battleId] = result.battleState;
    }
    const scene = sceneForState(block.sceneId, result.sceneState);
    // 先校验新视图可装配，再写入战术档；资源合并仍只走 P01。
    const nextToken = {};
    buildViewData(block, block.heroes, scene, result.sceneState.positions, nextToken);
    const roster = loadTacticsRoster(block, []);
    const nextView = buildViewData(block, roster.heroes, scene, result.sceneState.positions, nextToken);
    saveTacticsState(result.state);
    if (!openingStates.has(block.sceneId)) openingStates.set(block.sceneId, structuredClone(result.sceneState));
    currentYamlText = text;
    const unchanged = !forceReset && currentViewData && result.branch === "resume" && currentViewData.sceneId === nextView.sceneId && currentViewData.battleId === nextView.battleId && JSON.stringify([currentViewData.scene, currentViewData.units, currentViewData.placementsById]) === JSON.stringify([nextView.scene, nextView.units, nextView.placementsById]);
    combatToken = unchanged ? combatToken : nextToken;
    nextView.combatToken = combatToken;
    currentViewData = nextView;

    const branch = result.branch;
    const snap = sandbox.getSnapshot();
    if (forceReset) {
      sandbox.reset(currentViewData);
    } else if (branch === 'resume' || branch === 'reopen-existing') {
      if (snap.mounted && snap.sceneId === block.sceneId) sandbox.update(currentViewData);
      else sandbox.mount(currentViewData);
    } else {
      sandbox.reset(currentViewData); // new-battle：sceneState.positions 保留传入；new-scene：重建
    }

    if (opts.playable) {
      clearTimeout(enemyTimer);
      inputMode = null; pendingAim = null;
      if (!unchanged || forceReset || !battle) {
        shell.clearBattle();
        currentState = result.state;
        lastResult = null;
        battle = createBattle({ units: currentViewData.units, placementsById: currentViewData.placementsById, scene, battleState: result.battleState, random: opts.random });
        battle.start();
      }
      refreshBattle();
      scheduleEnemy();
      return { block, roster, result, branch, viewData: currentViewData };
    }
    shell.renderHeroes(currentViewData.units);
    shell.renderTurnOrder(currentViewData.units);
    shell.bindMenus(currentViewData.units);
    shell.showLog('已载入 ' + block.sceneId + ' / ' + block.battleId + '（分支 ' + branch + '）');
    return { block, roster, result, branch, viewData: currentViewData };
  }

  // ---------- MVP 命令接线：查看与行动分离，预览不付费 ----------
  function currentUnit() {
    return currentViewData.units.find(u => u.id === battle.snapshot().currentId);
  }
  function availableSkills() {
    return (currentUnit()?.skills || []).filter(s => s.actionCost.main === 1 && ['单体', '直线', '扇形'].includes(s.range?.type));
  }
  function refreshBattle() {
    const snap = battle.snapshot();
    for (const u of currentViewData.units) {
      u.bars = { ...u.bars, hp: u.ref.hp, mp: u.ref.mp };
    }
    sandbox.update(currentViewData);
    for (const u of currentViewData.units) {
      const rec = sandbox.getUnitView().nodes.get(u.id);
      rec.root.classList.toggle('t-unit-down', u.ref.hp <= 0);
    }
    shell.renderHeroes(currentViewData.units);
    const visibleUnitIds = currentViewData.units.map(u => u.id);
    const queue = getVisibleTurnQueue(battle.battleState, 'hero', { visibleUnitIds }).filter(r => r.unitId !== snap.currentId);
    if (snap.currentId) queue.unshift({ unitId: snap.currentId, nextActionAt: snap.now });
    shell.renderBattle(snap, availableSkills(), handleCommand, queue);
    shell.showLog(snap.log[snap.log.length - 1] || '选择基础行动移动，或攻击技能瞄准；再次点击确认。');
    currentState.scenes[currentViewData.sceneId].positions = structuredClone(currentViewData.placementsById);
    saveTacticsState(currentState);
    if (snap.terminal && lastResult !== snap.terminal.type) {
      lastResult = snap.terminal.type;
      shell.openPanel(snap.terminal.type === 'victory' ? '胜利' : snap.terminal.type === 'defeat' ? '失败' : '僵持',
        '<p>' + (snap.terminal.type === 'victory' ? '敌方已全灭。' : snap.terminal.type === 'defeat' ? '我方已全部倒地。' : '无人可继续行动。') +
        '</p><p>点击右上「重置」重新开始；本 Demo 不同步 MMS。</p>');
    }
  }
  function cancelInput() {
    inputMode = null; pendingAim = null;
    sandbox.setPreview(null);
  }
  function handleCommand(key) {
    if (key === 'cancel') { cancelInput(); return; }
    if (!battle || currentUnit()?.side !== 'hero' || battle.snapshot().terminal) return;
    cancelInput();
    if (key === 'end') {
      battle.endAction(); refreshBattle(); scheduleEnemy(); return;
    }
    if (key === 'move') {
      inputMode = { kind: 'move' };
      sandbox.setPreview({ kind: 'move', cells: battle.reachable().cells });
      shell.showLog('点击绿格预览路径，再点同一格确认；返回或 Esc 取消。');
      return;
    }
    const skill = key === 'attack' ? BASIC_ATTACK : availableSkills()[Number(key.slice(6))];
    if (skill) {
      inputMode = { kind: 'attack', skill };
      shell.showLog('点击敌人或方向预览 ' + skill.range.type + '，再点确认；返回或 Esc 取消。');
    }
  }
  sandbox.onMapClick(aim => {
    if (!inputMode || currentUnit()?.side !== 'hero') return false;
    if (pendingAim && pendingAim.col === aim.col && pendingAim.row === aim.row) {
      const result = inputMode.kind === 'move' ? battle.move(aim.col, aim.row) : battle.attack(inputMode.skill, aim);
      if (!result.ok) { shell.showLog(result.reason); return true; }
      cancelInput(); refreshBattle();
      if (result.hits?.length) {
        for (const hit of result.hits) {
          const rec = sandbox.getUnitView().nodes.get(hit.targetId);
          rec.root.classList.add('t-unit-hit');
          sandbox.getScope().after(240, () => rec.root.classList.remove('t-unit-hit'));
        }
        playProjectile('fire', result.casterId, result.hits[0].targetId);
      }
      return true;
    }
    if (inputMode.kind === 'move') {
      const cell = battle.previewMove(aim.col, aim.row);
      if (!cell || !cell.cost) { pendingAim = null; shell.showLog('落点不可达'); return true; }
      pendingAim = aim;
      sandbox.setPreview({ kind: 'move', cells: battle.reachable().cells, path: cell.path });
      shell.showLog('移动 ' + cell.cost.toFixed(2) + 'm · 再点同一格确认');
    } else {
      const query = battle.previewAttack(inputMode.skill, aim);
      pendingAim = query.ok ? aim : null;
      sandbox.setPreview({ kind: 'attack', cells: query.cells, targetIds: query.targetIds });
      shell.showLog(query.ok ? '预计命中 ' + query.targetIds.length + ' 名敌人 · 再点确认' : query.reason);
    }
    return true;
  });
  const escapeInput = e => { if (e.key === 'Escape') { cancelInput(); shell.closeSubmenu(); } };
  rootEl.ownerDocument.addEventListener('keydown', escapeInput);

  function scheduleEnemy() {
    clearTimeout(enemyTimer);
    if (!battle || battle.snapshot().terminal || currentUnit()?.side !== 'enemy') return;
    const token = combatToken;
    // 仅表现间隔；规则推进仍由 P03 跳点，不以墙钟计算跑圈。
    enemyTimer = setTimeout(() => {
      if (token !== combatToken) return;
      battle.runEnemyTurn(); refreshBattle(); scheduleEnemy();
    }, 420);
  }

  // 验证用旧弹道演出（真实火焰弹/敌方法术弹；坐标验证样本无声）
  function playProjectile(type, fromId, toId) {
    const v = sandbox.getVfx();
    if (!v) return Promise.resolve(false);
    return v.playArcaneProjectile(type, fromId, toId, false);
  }

  function boot() {
    const text = opts.defaultYaml || DEFAULT_YAML_A;
    loadYaml(text);
  }

  function destroy() {
    clearTimeout(enemyTimer);
    rootEl.ownerDocument.removeEventListener('keydown', escapeInput);
    combatToken = {};
    sandbox.destroy();
    shell.destroy();
  }

  return {
    loadYaml, boot, destroy, playProjectile,
    sandbox, shell,
    getToken: () => combatToken,
    getViewData: () => currentViewData,
    getBattle: () => battle,
  };
}
