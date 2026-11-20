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
import { applyLoad, reopenLoad, classifyLoad } from './lifecycle.mjs';
import { createSandbox } from './sandbox.mjs';
import { buildShell } from './ui-shell.mjs';
import { resolveAvatarUrl } from './unit-view.mjs';
import { TEST_ROOM } from './scene.mjs';

// ---------- P02 固定图库（同一张权威几何，两个 sceneId 身份；不做生成器） ----------
const SCENE_LIBRARY = {
  'sc-test-room': TEST_ROOM,
  'sc-second-room': { ...TEST_ROOM, sceneId: 'sc-second-room' },
};
function sceneForId(sceneId) {
  const s = SCENE_LIBRARY[sceneId];
  if (!s) throw new Error('P02 固定图库无此场景: ' + sceneId);
  return JSON.parse(JSON.stringify(s));
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
  return prefix + ':' + name + (occurrence > 1 ? ':' + occurrence : '');
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
  let currentSceneId = null;

  function placementsFor(result, sceneId) {
    // 新 scene：夹具默认站位经 explicitOverrides 落档；同 scene：读取档内保留位置
    const saved = result.sceneState && result.sceneState.positions && Object.keys(result.sceneState.positions).length
      ? result.sceneState.positions : null;
    return saved || opts.defaultPlacements || DEFAULT_PLACEMENTS;
  }

  function loadYaml(text, { forceReset = false } = {}) {
    const block = parseYamlText(text);
    const roster = loadTacticsRoster(block, []); // P01 真实装配入口（resolveHero 合并 + 闪避迁移）
    const state = readTacticsState();
    const incoming = { sceneId: block.sceneId, battleId: block.battleId };
    const cls = classifyLoad(state && state.current, incoming);
    // 新 scene：夹具默认站位作为显式增量落档（P05 布阵求解前的固定站位入口）；
    // resume/new-battle：不传覆盖，读档内保留位置。重置按钮：强制恢复夹具开场站位。
    const explicit = (cls.branch === 'new-scene' || forceReset)
      ? { positions: opts.defaultPlacements || DEFAULT_PLACEMENTS } : null;
    const result = applyLoad(state, incoming, explicit, {});
    saveTacticsState(result.state);
    currentYamlText = text;
    currentSceneId = block.sceneId;

    const scene = sceneForId(block.sceneId);
    combatToken = {}; // 换代：每次载入/重置新代
    currentViewData = buildViewData(block, roster.heroes, scene, placementsFor(result, block.sceneId), combatToken);

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

    shell.renderHeroes(currentViewData.units);
    shell.renderTurnOrder(currentViewData.units);
    shell.bindMenus(currentViewData.units);
    shell.showLog('已载入 ' + block.sceneId + ' / ' + block.battleId + '（分支 ' + branch + '）');
    return { block, roster, result, branch, viewData: currentViewData };
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
    sandbox.destroy();
  }

  return {
    loadYaml, boot, destroy, playProjectile,
    sandbox, shell,
    getToken: () => combatToken,
    getViewData: () => currentViewData,
  };
}
