// ==========================================
// 战棋主入口：P01 薄适配 + 生命周期路由 + 视图 combatToken 唯一代际 + 可玩切片的轮次/动作协调
// 职责：YAML → parseYamlText → loadTacticsRoster → lifecycle.applyLoad → sandbox.mount/update/reset；
//   可玩模式下：规则命令一次结算（battle.*）→ 动作协调层按拍点揭示结果 → 交还控制或换人。
// 视听：回合制成熟模块经 av-host 宿主适配（vendor/rpg-av 为生成文件）；本入口只编排，不做特效、不扣血。
// 独立页模式：酒馆变量 API 缺失时装内存宿主（真实 storage 路径不变）。
// ==========================================

import { parseYamlText, parseSkillEntry, parseItemEntry } from './parser.mjs';
import { loadTacticsRoster, readTacticsRoster, readTacticsState, saveTacticsRoster, saveTacticsState } from './storage.mjs';
import { buildConfigPackage, finalizeImportDraft } from './config-package.mjs';
import { CONFIG_PACKAGE_CONFIG_KEYS, CONFIG_PACKAGE_PERSIST_KEYS } from './protocol.mjs';
import { applyLoad, emptyBattleState } from './lifecycle.mjs';
import { createSandbox } from './sandbox.mjs';
import { buildShell } from './ui-shell.mjs';
import { resolveAvatarUrl, splitEmojiName } from './unit-view.mjs';
import { TEST_ROOM } from './scene.mjs';
import { createBattle, BASIC_ATTACK } from './battle.mjs';
import { getVisibleTurnQueue } from './clock.mjs';
import { findReachable } from './movement.mjs';
import { createAvHost, heroAvatarUrl } from './av-host.mjs';
import { createActionDirector } from './action-director.mjs';
import { createUiSfx } from './ui-sfx.mjs';
import { CHAPEL_SCENE } from './chapel-scene.mjs';
import { resolveUnitStyles } from './unit-style.mjs';
import { createEditorPanel } from './editor-panel.mjs';
import { unitCenter } from './geometry.mjs';
// ---------- P02 固定图库（同一张权威几何，两个 sceneId 身份；不做生成器） ----------
const SCENE_LIBRARY = {
  'sc-test-room': TEST_ROOM,
  'sc-second-room': { ...TEST_ROOM, sceneId: 'sc-second-room' },
  'sc-chapel': CHAPEL_SCENE,
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
// 名字前缀 emoji 拆出（沿用回合制敌方表达）；单位 ID 由去 emoji 的名字派生，站位键与夹具对齐。
export function buildViewData(block, resolvedHeroes, scene, positions, combatToken) {
  const units = [];
  const footprintsById = {};
  const occ = new Map();
    const addUnit = (src, side) => {
      const identity = splitEmojiName(src.name);
      const display = splitEmojiName(src.displayName || identity.name);
      const key = side + ':' + identity.name;
      const n = (occ.get(key) || 0) + 1;
      occ.set(key, n);
      const id = deriveUnitId(side, identity.name, n);
      const fpIn = src.footprint;
      const fp = fpIn && fpIn.width > 0 && fpIn.height > 0
        ? { width: Math.round(fpIn.width), height: Math.round(fpIn.height) }
        : { width: 1, height: 1 };
      footprintsById[id] = fp;
      units.push({
        id, side, name: display.name || identity.name, emoji: display.emoji || identity.emoji, footprint: fp, img: src.img || null,
        avatarUrl: display.emoji ? null : (src.avatarUrl || resolveAvatarUrl({ img: src.img, name: identity.name }, heroAvatarUrl)),
        bars: { hp: src.hp == null ? src.maxHp : src.hp, maxHp: src.maxHp || 0, mp: src.mp == null ? src.maxMp : src.mp, maxMp: src.maxMp || 0 },
        skills: Array.isArray(src.skills) ? src.skills : [],
        items: Array.isArray(src.items) ? src.items : [],
        ref: src,
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
// 命中概率（与 damage.resolveHit 同一口径：攻击骰 1..A ≥ 闪避骰 1..D）
function hitChance(caster, target, skill) {
  const A = Math.max(1, (skill.hit ?? 100) + (caster.hitBonus || 0));
  const D = Math.max(1, (target.evasion || 0) + (target.evaBonus || 0));
  let s = 0;
  for (let x = 1; x <= A; x++) s += Math.min(x, D);
  return s / (A * D);
}
function expectedDamage(caster, target, skill) {
  const raw = skill.power === 0 ? caster.atk : skill.power;
  return raw <= 0 ? 0 : Math.max(1, raw - Math.floor(target.def || 0));
}
export function createApp(rootEl, opts = {}) {
  ensureMemoryVarHost();
  const shell = buildShell(rootEl);
  let currentYamlText = null;
  let currentViewData = null;
  const avHost = createAvHost({ getUnitView: () => sandbox.getUnitView(), getUnits: () => (currentViewData ? currentViewData.units : []) });
  const ui = createUiSfx(avHost.av.CombatAudioMixer);
  const sandbox = createSandbox(shell.els.mapSlot, {
    getSafeRect: () => shell.getSafeRect(),
    onStage: (els) => avHost.attachStage(els),
    onAvatarStatus: (unit, url) => { if (url) avHost.trackImage(url, 'avatar', unit.name); else avHost.host.report('avatar-missing', unit.name); },
  });
  const director = createActionDirector({
    sandbox, avHost, getViewData: () => currentViewData,
    onReveal: (hit, meta) => revealHit(hit, meta),
    onMoveFeedback: (id, kind, p) => moveFeedback(id, kind, p),
    getUnitStyle: (id) => unitStyles[id] || null,
  });
  let combatToken = {};
  let battle = null;
  let aim = null;            // 瞄准模式 { key, skill }；null = 自由模式（点地面移动、点敌人攻击）
  let fieldAction = null;    // P04：跳跃/推动/背负/放下目标选择
  let pending = null;        // 已锁定的攻击 { key, aim }
  let fullReach = null;      // 本次行动无额度可达表（区分"超出额度"与"不可达"）
  let currentState = null;
  let lastResult = null;
  let busy = false;
  let flow = 0;              // 演出流程代际：重置/换场 +1，旧 await 链作废
  let endArmedUntil = 0;
  let booted = false;
  const shown = new Map();   // 显示态资源（接触拍点前保持旧值）
  let unitStyles = {};       // 单位表现风格：我方职业 / 敌方分级（只影响画面与声音）
  const hiddenLog = new Set();
  let editorDraft = null;
  let editorOverrides = new Map();
  const carriedShown = new Set(); // 正在被背负、显示位置跟随背负者的单位

  shell.onUiSound = (kind) => ui(kind);
  shell.onUnitClick = (unitId) => {
    if (!currentViewData) return;
    const c = sandbox.unitWorldCenter(unitId);
    if (c) sandbox.focusWorld(c.x, c.y);
    shell.setSelected(unitId);
  };
  shell.onReset = () => restart();
  const editor = createEditorPanel({
    rpgUi: shell.rpgUi, shell, globalHtml: () => soundSettingsHtml(), validate: validateEditorDraft,
    onSave: (d) => { editorDraft = d; persistEditorDraft(); editorDraft = null; restart(); },
    onCancel: () => { editorDraft = null; },
  });
  shell.settings = { open: () => { if (!currentViewData) return false; editorDraft = makeEditorDraft(); editor.open(editorDraft); return true; } };
  sandbox.onSelect((unit) => { shell.setSelected(unit ? unit.id : null); });
  sandbox.onCancel(() => cancelStep());

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
    for (const [id, p] of Object.entries(defaults)) {
      if (!Object.hasOwn(knownScene?.positions || {}, id) && !Object.hasOwn(positions, id)) explicit.positions[id] = p;
    }
    const base = state;
    if (forceReset && openingStates.has(block.sceneId)) base.scenes[block.sceneId] = structuredClone(openingStates.get(block.sceneId));
    const result = applyLoad(base, incoming, explicit, {});
    if (forceReset) {
      result.battleState = emptyBattleState(block.sceneId, block.battleId);
      result.state.battles[block.sceneId + '\u0000' + block.battleId] = result.battleState;
    }
    const scene = sceneForState(block.sceneId, result.sceneState);
    const nextToken = {};
    buildViewData(block, block.heroes, scene, result.sceneState.positions, nextToken);
    const roster = loadTacticsRoster(block, []);
    let nextView = buildViewData(block, roster.heroes, scene, result.sceneState.positions, nextToken);
    const overrideKey = block.sceneId + '\u0000' + block.battleId;
    const localOverrides = editorOverrides.get(overrideKey);
    if (localOverrides) {
      for (const u of nextView.units) {
        const patch = localOverrides[u.id];
        if (!patch) continue;
        if (u.side === 'enemy' && patch.ref) {
          Object.assign(u.ref, structuredClone(patch.ref));
          // 显示名只改称呼：身份 emoji（名字前缀）保留，除非新显示名自带 emoji；纯技能编辑不改变敌方显示身份
          const display = splitEmojiName(patch.displayName || u.name);
          u.name = display.name || u.name;
          u.emoji = display.emoji || u.emoji;
          u.avatarUrl = u.emoji ? null : resolveAvatarUrl({ img: u.ref.img, name: u.name }, heroAvatarUrl);
          u.skills = u.ref.skills || [];
          u.items = u.ref.items || [];
          u.footprint = u.ref.footprint || u.footprint;
          nextView.footprintsById[u.id] = u.footprint;
        }
        if (patch.resources) {
          u.ref.hp = patch.resources.hp;
          u.ref.mp = patch.resources.mp;
          u.ref.tp = patch.resources.tp;
          u.bars = { hp: patch.resources.hp, maxHp: u.ref.maxHp || 0, mp: patch.resources.mp, maxMp: u.ref.maxMp || 0 };
        }
        (u.skills || []).forEach(sk => { if (sk.maxUses > 0) sk.usesRemaining = sk.maxUses; });
        (u.items || []).forEach(it => { if (it.maxUses > 0) it.usesRemaining = it.maxUses; });
      }
    }
    saveTacticsState(result.state);
    if (!openingStates.has(block.sceneId)) openingStates.set(block.sceneId, structuredClone(result.sceneState));
    currentYamlText = text;
    const unchanged = !forceReset && currentViewData && result.branch === 'resume' && currentViewData.sceneId === nextView.sceneId && currentViewData.battleId === nextView.battleId && JSON.stringify([currentViewData.scene, currentViewData.units, currentViewData.placementsById]) === JSON.stringify([nextView.scene, nextView.units, nextView.placementsById]);
    if (!unchanged) { flow++; avHost.clear({ resetVoices: true }); }
    combatToken = unchanged ? combatToken : nextToken;
    avHost.setToken(combatToken);
    nextView.combatToken = combatToken;
    currentViewData = nextView;

    const branch = result.branch;
    const snap = sandbox.getSnapshot();
    if (forceReset) sandbox.reset(currentViewData);
    else if (branch === 'resume' || branch === 'reopen-existing') {
      if (snap.mounted && snap.sceneId === block.sceneId) sandbox.update(currentViewData);
      else sandbox.mount(currentViewData);
    } else sandbox.reset(currentViewData);

    if (opts.playable) {
      aim = null; pending = null; fieldAction = null; busy = false; endArmedUntil = 0; shown.clear(); hiddenLog.clear();
      shell.setBusy(false);
      if (!unchanged || forceReset || !battle) {
        shell.clearBattle();
        currentState = result.state;
        lastResult = null;
        battle = createBattle({ units: currentViewData.units, placementsById: currentViewData.placementsById, scene, battleState: result.battleState, random: opts.random });
        battle.start();
        unitStyles = resolveUnitStyles(currentViewData.units);
      }
      syncShown();
      refreshBattle();
      beginTurn({ intro: !booted || forceReset });
      booted = true;
      return { block, roster, result, branch, viewData: currentViewData };
    }
    shell.renderHeroes(currentViewData.units);
    shell.renderTurnOrder(currentViewData.units);
    shell.bindMenus(currentViewData.units);
    shell.showLog('已载入 ' + block.sceneId + ' / ' + block.battleId + '（分支 ' + branch + '）');
    return { block, roster, result, branch, viewData: currentViewData };
  }

  function restart() { loadYaml(currentYamlText || opts.defaultYaml || DEFAULT_YAML_A, { forceReset: true }); }

  // ---------- 显示态（规则真值在 ref；画面只在接触拍点推进） ----------
  function syncShown() { if (currentViewData) for (const u of currentViewData.units) shown.set(u.id, { hp: u.ref.hp, mp: u.ref.mp }); }
  function shownOf(u) { return shown.get(u.id) || { hp: u.ref.hp, mp: u.ref.mp }; }
  function visibleLog() { return battle.snapshot().log.filter((_, i) => !hiddenLog.has(i)); }
  function unitById(id) { return currentViewData.units.find(u => u.id === id) || null; }
  function currentUnit() { return battle && currentViewData ? unitById(battle.snapshot().currentId) : null; }
  function isHeroTurn() { const u = currentUnit(); return !!(u && u.side === 'hero' && !battle.snapshot().terminal); }
  function skillUsable(skill) { return !!(battle && battle.skillStatus(skill).ok); }
  function skillReason(skill) { return battle ? battle.skillStatus(skill).reason || '' : '当前不能使用技能'; }
  function skillOfKey(key) {
    if (key === 'attack') return BASIC_ATTACK;
    const m = /^sk:(\d+)$/.exec(key || '');
    return m ? (currentUnit()?.skills || [])[Number(m[1])] || null : null;
  }
  // 点敌人直接攻击：首个可用技能（原版技能栏的排序口径：可用者在前），否则普攻
  function defaultAction() {
    const skills = currentUnit()?.skills || [];
    const i = skills.findIndex(s => !s._inGroup && skillUsable(s));
    if (i >= 0) return { key: 'sk:' + i, skill: skills[i] };
    return skillUsable(BASIC_ATTACK) ? { key: 'attack', skill: BASIC_ATTACK } : null;
  }
  function queueRows(snap) {
    const visibleUnitIds = currentViewData.units.filter(u => shownOf(u).hp > 0 || u.id === snap.currentId).map(u => u.id);
    const queue = getVisibleTurnQueue(battle.battleState, 'hero', { visibleUnitIds }).filter(r => r.unitId !== snap.currentId);
    if (snap.currentId) queue.unshift({ unitId: snap.currentId, nextActionAt: snap.now });
    return queue;
  }
  function renderCommand() {
    const snap = battle.snapshot();
    const u = currentUnit();
    if (!u) { shell.renderCommand(null); return; }
    const r = snap.resources;
    const hero = u.side === 'hero' && !snap.terminal;
    const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const carrying = snap.carrying[u.id] || null;
    const basic = hero && r ? basicActions(u, r, carrying) : [];
    const fieldHint = {
      jump: '【跳跃】在地图上选择落点<br><small>八方向直线 · 最远 ' + jumpReach(u, r).toFixed(1) + 'm · 越过低矮障碍与单位</small>',
      push: '【推动】选择相邻单位<br><small>力量对抗 · 撞墙按剩余距离受伤</small>',
      carry: '【背起】选择相邻的倒地友方<br><small>背负中移动消耗加倍</small>',
    };
    shell.renderCommand({
      unit: u, terminal: !!snap.terminal, playable: hero, serial: snap.actionSerial,
      resources: r ? { moveRemaining: r.moveRemaining, moveMax: u.ref.moveDistance, sprintRemaining: r.sprintRemaining || 0, main: r.main, aux: r.aux, mp: u.ref.mp } : null,
      carrying, preparation: snap.preparation, chargeInventory: snap.chargeInventory, endArmed: performance.now() < endArmedUntil, basic,
      aimHint: !hero ? null : fieldAction ? fieldHint[fieldAction] : !aim ? null : pending
        ? '【' + esc(aim.skill.name) + '】已锁定<br>再次点击目标或 Enter 发动'
        : '【' + esc(aim.skill.name) + '】请在地图上选择目标',
      canUse: skillUsable,
      skillReason,
      onSkill: (idx) => handleCommand('sk:' + idx),
      onAttack: () => handleCommand('attack'),
      onEnd: () => handleCommand('end'),
      onAction: handleFieldAction,
      onCancel: () => { if (pending) cancelStep(); cancelStep(); },
    });
  }
  function jumpReach(u, r) { return r ? Math.min((Math.max(0, u.ref.spd) + Math.max(0, u.ref.strength || 0)) / 20, r.moveRemaining) : 0; }
  // 基础行动格数据：资格只读规则已有的资源与状态；最终判定仍以 battle.* 返回为准
  function basicActions(u, r, carrying) {
    const atkReason = skillReason(BASIC_ATTACK);
    const reach = jumpReach(u, r);
    const downAlly = currentViewData.units.some(x => x.side === 'hero' && x.id !== u.id && x.ref.hp <= 0 && !Object.values(battle.snapshot().carrying).includes(x.id));
    const carried = carrying ? unitById(carrying) : null;
    return [
      { key: 'attack', icon: '⚔️', name: '普通攻击', cost: { main: 1 }, mode: 'target', tone: 'rose', ok: !atkReason, reason: atkReason, short: atkReason && shortLabel(atkReason) },
      { key: 'sprint', icon: '💨', name: '冲刺', cost: { main: 1 }, mode: 'instant', tone: 'sky', note: '+' + u.ref.moveDistance + 'm', ok: r.main >= 1, reason: '主行动已用完', short: '◆ 主行动已用完', desc: '消耗主行动，立即追加一份移动额度' },
      { key: 'jump', icon: '🦘', name: '跳跃', cost: { aux: 1 }, mode: 'target', tone: 'violet', note: '≤' + (+reach.toFixed(1)) + 'm', ok: r.aux >= 1 && reach >= 1,
        reason: r.aux < 1 ? '辅助行动不足' : '移动额度不足以起跳（至少 1m）', short: r.aux < 1 ? '◇ 辅助行动已用完' : '🦶 移动额度不足', desc: '沿八方向直线跳跃，越过低矮障碍；距离计入移动额度' },
      { key: 'push', icon: '✋', name: '推动', cost: { aux: 1 }, mode: 'target', tone: 'amber', ok: r.aux >= 1, reason: '辅助行动不足', short: '◇ 辅助行动已用完', desc: '与相邻单位力量对抗，推开数米；撞墙造成伤害' },
      carried
        ? { key: 'drop', icon: '⬇️', name: '放下', cost: null, mode: 'instant', tone: 'emerald', note: carried.name, ok: true, desc: '把背负的友方放到身边空格' }
        : { key: 'carry', icon: '⛑️', name: '背起', cost: { main: 1 }, mode: 'target', tone: 'emerald', ok: r.main >= 1 && downAlly,
          reason: r.main < 1 ? '主行动不足' : '没有可背起的倒地友方', short: r.main < 1 ? '◆ 主行动已用完' : '无倒地友方', desc: '背起相邻倒地友方，背负中移动消耗加倍' },
    ];
  }
  function shortLabel(reason) { return /主行动/.test(reason) ? '◆ 主行动已用完' : reason; }
  function refreshBattle() {
    const snap = battle.snapshot();
    for (const u of currentViewData.units) { const s = shownOf(u); u.bars = { ...u.bars, hp: s.hp, mp: s.mp }; }
    sandbox.update(currentViewData);
    const view = sandbox.getUnitView();
    for (const u of currentViewData.units) {
      view.setFlag(u.id, 't-unit-down', shownOf(u).hp <= 0);
      view.setFlag(u.id, 't-unit-current', u.id === snap.currentId && !snap.terminal);
      if (unitStyles[u.id]) view.setFlag(u.id, unitStyles[u.id].cls, true);
    }
    syncCarried(snap);
    shell.renderHeroes(currentViewData.units);
    shell.setCurrent(snap.terminal ? null : snap.currentId);
    const qc = shell.renderQueue(queueRows(snap), snap.currentId);
    // 插队：除换人外，其余单位相对次序改变（加速/再动等）→ 插入音
    if (qc) {
      const keep = id => id !== qc.prev[0] && qc.next.includes(id);
      const a = qc.prev.filter(keep), b = qc.next.filter(id => a.includes(id));
      if (a.join('|') !== b.join('|')) ui('queueInsert');
    }
    shell.setHistory(visibleLog());
    renderCommand();
    currentState.scenes[currentViewData.sceneId].positions = structuredClone(currentViewData.placementsById);
    saveTacticsState(currentState);
  }

  // ---------- 预览：自由模式显示可达范围；悬停路径/攻击 ----------
  function idleOverlay() {
    if (!isHeroTurn() || busy) { sandbox.setPreview(null); return; }
    if (aim) { sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill: aim.skill, query: null }); return; }
    const r = battle.snapshot().resources;
    sandbox.setPreview(r && r.moveRemaining > 0.999 ? { kind: 'move', unitId: battle.snapshot().currentId, cells: battle.reachable().cells } : null);
  }
  function moveEval(hit) {
    const id = battle.snapshot().currentId;
    const r = battle.snapshot().resources;
    const cell = battle.previewMove(hit.col, hit.row);
    if (cell && cell.cost > 0) return { ok: true, cell, html: '移动 <b>' + cell.cost.toFixed(1) + 'm</b> · 余 ' + (r.moveRemaining - cell.cost).toFixed(1) + 'm' };
    const p = currentViewData.placementsById[id];
    if (p.col === hit.col && p.row === hit.row) return { ok: false, quiet: true };
    if (r.moveRemaining <= 0.999) return { ok: false, reason: '移动额度已用完' };
    const full = fullReach && fullReach.byKey.get(hit.col + ',' + hit.row);
    if (full) return { ok: false, reason: '超出移动额度（需 ' + full.cost.toFixed(1) + 'm，余 ' + r.moveRemaining.toFixed(1) + 'm）' };
    if (hit.targetId) return { ok: false, quiet: true };
    return { ok: false, reason: '无法到达' };
  }
  function aimFor(skill, hit) {
    if (skill.range.type === '单体') {
      if (!hit.targetId) return null;
      const c = sandbox.unitWorldCenter(hit.targetId);
      return { x: c.x, y: c.y, targetId: hit.targetId };
    }
    return { x: hit.x, y: hit.y, targetId: hit.targetId };
  }
  function attackPreview(action, hit, locked) {
    const id = battle.snapshot().currentId;
    const skill = action.skill;
    const a = aimFor(skill, hit);
    if (!a) {
      sandbox.setPreview({ kind: 'attack', casterId: id, skill, query: null });
      sandbox.setHint({ x: hit.x, y: hit.y }, '指向敌人', 'bad');
      return { ok: false, reason: '指向敌人' };
    }
    const q = battle.previewAttack(skill, a);
    sandbox.setPreview({ kind: 'attack', casterId: id, skill, query: q, locked });
    let html;
    if (q.ok && q.disclosureTargetIds.length) {
      const me = currentUnit();
      const t0 = unitById(q.disclosureTargetIds[0]);
      const pc = Math.round(hitChance(me.ref, t0.ref, skill) * 100);
      html = '<b>' + skill.name + '</b> · ' + (q.disclosureTargetIds.length > 1 ? q.disclosureTargetIds.length + ' 名目标 · ' : '') + '命中 <b>' + pc + '%</b> · 伤害 ' + expectedDamage(me.ref, t0.ref, skill) + (locked ? ' · <b>再点发动</b>' : '');
    } else html = q.ok ? '<b>' + skill.name + '</b> · 范围内无敌人' + (locked ? ' · <b>再点发动</b>' : '') : q.reason;
    sandbox.setHint({ x: a.x, y: a.y }, html, q.ok ? (locked ? 'lock' : null) : 'bad');
    return { ok: q.ok, aim: a, query: q, reason: q.reason };
  }
  function hitKey(skill, hit) { return skill.range.type === '单体' ? (hit.targetId ? 'u:' + hit.targetId : null) : hit.col + ',' + hit.row; }
  const isEnemyHit = hit => hit && hit.targetId && unitById(hit.targetId) && unitById(hit.targetId).side !== 'hero';

  sandbox.onHover(hit => {
    if (!battle || busy || !isHeroTurn()) { sandbox.setHint(null); shell.previewMoveCost(null); return; }
    if (pending) return;
    if (!hit) { sandbox.setHint(null); shell.previewMoveCost(null); if (fieldAction === 'jump') sandbox.setPreview({ kind: 'jump', unitId: battle.snapshot().currentId, cells: jumpCells() }); else idleOverlay(); return; }
    if (fieldAction === 'jump') {
      const q = battle.previewJump(hit.col, hit.row);
      const r = battle.snapshot().resources;
      const ok = q.ok && q.distance <= r.moveRemaining + 1e-9;
      const hint = ok ? '🦘 跳跃 <b>' + q.distance.toFixed(1) + 'm</b> · 余 ' + (r.moveRemaining - q.distance).toFixed(1) + 'm · 点击起跳' : (q.ok ? '移动额度不足（需 ' + q.distance.toFixed(1) + 'm）' : q.reason);
      sandbox.setPreview({ kind: 'jump', unitId: battle.snapshot().currentId, cells: jumpCells(), hover: ok ? { col: hit.col, row: hit.row, cost: q.distance } : null, invalid: ok ? null : { col: hit.col, row: hit.row } });
      sandbox.setHint({ x: hit.x, y: hit.y }, hint, ok ? null : 'bad');
      shell.previewMoveCost(ok ? q.distance : null);
      return;
    }
    if (fieldAction === 'push' || fieldAction === 'carry') {
      const target = hit.targetId ? unitById(hit.targetId) : null;
      const res = battle.snapshot().resources;
      const valid = !!target && (fieldAction === 'push' ? target.ref.hp > 0 && target.id !== battle.snapshot().currentId : target.ref.hp <= 0 && target.side === 'hero');
      sandbox.setHint({ x: hit.x, y: hit.y }, valid ? (fieldAction === 'push' ? '推动 ' : '背起 ') + escapeText(target.name) + ' · 点选确认' : (fieldAction === 'push' ? '选择相邻单位' : '选择倒地友方'), valid ? null : 'bad');
      return;
    }
    if (aim) { attackPreview(aim, hit, false); return; }
    if (isEnemyHit(hit)) {
      const act = defaultAction();
      if (act) { attackPreview(act, hit, false); return; }
      sandbox.setHint({ x: hit.x, y: hit.y }, '主行动已用完', 'bad'); return;
    }
    const ev = moveEval(hit);
    const r = battle.snapshot().resources;
    sandbox.setPreview(r.moveRemaining > 0.999 ? { kind: 'move', unitId: battle.snapshot().currentId, cells: battle.reachable().cells, hover: ev.ok ? ev.cell : null, invalid: ev.ok || ev.quiet ? null : { col: hit.col, row: hit.row } } : null);
    sandbox.setHint(ev.ok || !ev.quiet ? { x: hit.col + 0.5, y: hit.row + 0.5 } : null, ev.ok ? ev.html : ev.reason, ev.ok ? null : 'bad');
    shell.previewMoveCost(ev.ok ? ev.cell.cost : null);
  });

  sandbox.onMapClick(hit => {
    if (!battle || !isHeroTurn()) return false;
    if (busy) { ui('deny'); return true; }
    if (fieldAction) return handleFieldTarget(hit);
    if (aim) {
      const key = hitKey(aim.skill, hit);
      if (pending && key && pending.key === key) { firePending(); return true; }
      const ev = attackPreview(aim, hit, true);
      if (!ev.ok || !key) { pending = null; ui('deny'); renderCommand(); return true; }
      pending = { key, aim: ev.aim };
      ui('lock'); renderCommand();
      return true;
    }
    if (isEnemyHit(hit)) {
      const act = defaultAction();
      if (!act) { ui('deny'); shell.showLog('主行动已用完', 'warn'); return true; }
      aim = { key: act.key, skill: act.skill };
      const ev = attackPreview(aim, hit, true);
      const key = hitKey(aim.skill, hit);
      if (ev.ok && key) { pending = { key, aim: ev.aim }; ui('lock'); } else { pending = null; ui('deny'); }
      renderCommand();
      return true;
    }
    const ev = moveEval(hit);
    if (ev.ok) { doMove(hit.col, hit.row); return true; }
    if (!ev.quiet) { ui('deny'); shell.showLog(ev.reason, 'warn'); }
    return ev.quiet ? false : true;
  });

  function cancelStep() {
    if (!battle || !isHeroTurn()) return;
    if (pending) { pending = null; fieldAction = null; ui('cancel'); sandbox.setHint(null); sandbox.refreshHover(); if (aim) sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill: aim.skill, query: null }); renderCommand(); return; }
    if (fieldAction) { fieldAction = null; ui('cancel'); sandbox.setPreview(null); sandbox.setHint(null); shell.previewMoveCost(null); idleOverlay(); renderCommand(); return; }
    if (aim) { aim = null; ui('cancel'); sandbox.setHint(null); sandbox.refreshHover(); idleOverlay(); renderCommand(); }
  }

  function handleFieldAction(kind) {
    if (!battle || !isHeroTurn() || busy) return;
    if (kind === 'release') {
      const prep = battle.snapshot().preparation;
      const idx = prep ? (currentUnit()?.skills || []).findIndex(s => s.name === prep.skill.name) : -1;
      if (idx < 0) { ui('deny'); shell.showLog('找不到待释放的蓄力技能', 'warn'); return; }
      handleCommand('sk:' + idx); return;
    }
    if (kind === 'prepare' || kind === 'cancel-charge') {
      const result = kind === 'prepare' ? battle.advancePreparation() : battle.cancelPreparation();
      if (!result.ok) { ui('deny'); shell.showLog(result.reason, 'warn'); return; }
      ui(kind === 'prepare' ? 'charge' : 'cancel');
      const log = battle.snapshot().log;
      shell.showLog(log[log.length - 1], 'act');
      if (kind === 'prepare') fxAtUnit(battle.snapshot().currentId, 't-charge-pulse', 900);
      refreshBattle(); idleOverlay(); return;
    }
    if (kind === 'sprint') {
      const result = battle.sprint();
      if (!result.ok) { ui('deny'); shell.showLog(result.reason, 'warn'); return; }
      ui('sprint'); fxAtUnit(battle.snapshot().currentId, 't-sprint-burst', 760);
      shell.showLog('冲刺 · 移动额度 +' + currentUnit().ref.moveDistance + 'm', 'act');
      refreshBattle(); fullReach = findReachable(battle.ctx, battle.snapshot().currentId, Infinity); idleOverlay(); return;
    }
    if (kind === 'drop') { runDrop(); return; }
    if (!kind || !['jump', 'push', 'carry'].includes(kind)) return;
    rpgCloseMenus();
    fieldAction = kind;
    aim = null; pending = null;
    sandbox.setHint(null);
    sandbox.setPreview(kind === 'jump' ? { kind: 'jump', unitId: battle.snapshot().currentId, cells: jumpCells() } : null);
    ui('select');
    renderCommand();
  }
  function rpgCloseMenus() { shell.rpgUi.closeAllSubMenus(); }
  // 跳跃落点集：八方向逐格询问规则（previewJump 为唯一判定），并受剩余移动额度约束
  function jumpCells() {
    const id = battle.snapshot().currentId, p = currentViewData.placementsById[id], r = battle.snapshot().resources;
    const reach = jumpReach(unitById(id), r), out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let k = 1; k * Math.hypot(dx, dy) <= reach + 1e-9; k++) {
        const q = battle.previewJump(p.col + dx * k, p.row + dy * k);
        if (q.ok && q.distance <= r.moveRemaining + 1e-9) out.push({ col: p.col + dx * k, row: p.row + dy * k, cost: q.distance });
      }
    }
    return out;
  }
  function fxAtUnit(id, cls, ms) { const c = sandbox.unitWorldCenter(id); if (c) fxNode(cls, c.x, c.y, ms); }

  function handleFieldTarget(hit) {
    if (!fieldAction) return false;
    runFieldTarget(fieldAction, hit);
    return true;
  }
  // 场地动作：规则命令一次结算 → 演出层按结果播放（跳跃抛物线 / 推动冲撞滑移 / 背起抬升）→ 交还控制
  async function runFieldTarget(kind, hit) {
    const myFlow = flow;
    const view = sandbox.getUnitView();
    const me = battle.snapshot().currentId;
    if ((kind === 'push' || kind === 'carry') && !hit.targetId) { ui('deny'); shell.showLog(kind === 'push' ? '请选择相邻单位' : '请选择相邻的倒地友方', 'warn'); return; }
    const lockId = kind === 'jump' ? me : hit.targetId;
    view.lockMotion(lockId, true);
    if (kind === 'push') view.lockMotion(me, true);
    const result = kind === 'jump' ? battle.jump(hit.col, hit.row) : kind === 'push' ? battle.push(hit.targetId) : battle.carry(hit.targetId);
    if (!result.ok) { view.lockMotion(lockId, false); view.lockMotion(me, false); ui('deny'); shell.showLog(result.reason, 'warn'); return; }
    fieldAction = null;
    sandbox.setPreview(null); sandbox.setHint(null); shell.previewMoveCost(null);
    setBusy(true);
    sandbox.beginAction();
    ui('confirm');
    refreshBattle();
    if (kind === 'jump') await director.playJump(result);
    else if (kind === 'push') {
      await director.playShove(me, result);
      if (myFlow !== flow) return;
      const log = battle.snapshot().log;
      shell.showLog(log[log.length - 1], result.success ? (result.collision ? 'hit' : 'act') : 'dodge');
      if (result.collision) { const t = unitById(result.targetId); if (t && t.side === 'hero') shell.setHeroBars(t.id, { ...t.bars, hp: result.hpAfter }, { hit: true }); }
      if (result.down) playDown(unitById(result.targetId));
    } else {
      await director.playTransfer(result.targetId, sandbox.unitWorldCenter(result.targetId), carryAnchor(me), { lift: true });
      if (myFlow !== flow) return;
      shell.showLog(unitName(me) + ' 背起 ' + unitName(result.targetId), 'act');
    }
    if (myFlow !== flow) return;
    afterHeroAction();
  }
  async function runDrop() {
    const myFlow = flow;
    const me = battle.snapshot().currentId;
    const from = carryAnchor(me);
    const res = battle.drop();
    if (!res.ok) { ui('deny'); shell.showLog(res.reason, 'warn'); return; }
    setBusy(true);
    ui('drop');
    const fp = currentViewData.footprintsById[res.targetId] || { width: 1, height: 1 };
    await director.playTransfer(res.targetId, from, unitCenter(res.placement, fp), { lift: false });
    if (myFlow !== flow) return;
    shell.showLog(unitName(me) + ' 放下 ' + unitName(res.targetId), 'act');
    afterHeroAction();
  }
  function carryAnchor(carrierId) { const c = sandbox.unitWorldCenter(carrierId); return c ? { x: c.x, y: c.y - 0.32 } : null; }
  // 背负：被背者显示位置跟随背负者（规则站位不变）；放下后交还权威站位
  const carryOf = new Map();
  function syncCarried(snap) {
    const view = sandbox.getUnitView();
    const now = snap.carrying || {};
    const held = new Set(Object.values(now));
    for (const id of [...carriedShown]) if (!held.has(id)) {
      carriedShown.delete(id); view.setFlag(id, 't-unit-carried', false); view.lockMotion(id, false);
      view.updateUnit(id, { placement: currentViewData.placementsById[id] });
    }
    carryOf.clear();
    for (const [carrier, id] of Object.entries(now)) {
      carryOf.set(carrier, id); carriedShown.add(id);
      view.setFlag(id, 't-unit-carried', true); view.lockMotion(id, true);
      const rec = view.nodes.get(carrier), a = carryAnchor(carrier);
      if (a && rec && !rec.motionLock) view.setDisplayPos(id, a.x, a.y);
    }
  }

  function handleCommand(key) {
    if (!battle || !isHeroTurn()) return;
    if (busy) { ui('deny'); return; }
    if (key === 'end') { requestEnd(); return; }
    fieldAction = null;
    const skill = skillOfKey(key);
    if (!skill) return;
    if (!skillUsable(skill)) { ui('deny'); shell.showLog(skillReason(skill), 'warn'); return; }
    pending = null;
    aim = { key, skill };
    sandbox.setHint(null); sandbox.refreshHover();
    sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill: aim.skill, query: null });
    renderCommand();
  }
  function requestEnd() {
    const r = battle.snapshot().resources;
    const left = r && (r.main > 0 || r.aux > 0 || r.moveRemaining > 0.999);
    if (left && performance.now() > endArmedUntil) {
      endArmedUntil = performance.now() + 2200;
      const unused = [r.main > 0 && '主行动', r.aux > 0 && '辅助行动', r.moveRemaining > 0.999 && '移动额度'].filter(Boolean);
      ui('select'); shell.showLog('还有' + unused.join('、') + '未用 · 再按一次结束回合', 'warn');
      renderCommand();
      setTimeout(() => { if (performance.now() >= endArmedUntil && battle && isHeroTurn()) renderCommand(); }, 2300);
      return;
    }
    endArmedUntil = 0; aim = null; pending = null;
    ui('endTurn');
    sandbox.setPreview(null); sandbox.setHint(null);
    setBusy(true);
    battle.endAction(); syncShown(); refreshBattle(); beginTurn();
  }

  async function doMove(col, row) {
    const myFlow = flow;
    setBusy(true);
    sandbox.setPreview(null); sandbox.setHint(null);
    sandbox.beginAction();
    ui('confirm');
    const mover = battle.snapshot().currentId;
    sandbox.getUnitView().lockMotion(mover, true);   // 显示位置留在起点，直到路径演出接管（否则刷新会先闪到终点）
    const res = battle.move(col, row);
    if (!res.ok) { sandbox.getUnitView().lockMotion(mover, false); setBusy(false); ui('deny'); shell.showLog(res.reason, 'warn'); return; }
    refreshBattle();
    await director.playMove(res);
    if (myFlow !== flow) return;
    afterHeroAction();
  }
  async function firePending() {
    const myFlow = flow;
    const p = pending, act = aim;
    pending = null; aim = null;
    shell.closeMenus();
    sandbox.setPreview(null); sandbox.setHint(null);
    setBusy(true);
    sandbox.beginAction();
    ui('confirm');
    const res = battle.attack(act.skill, p.aim);
    if (!res.ok) { setBusy(false); ui('deny'); shell.showLog(res.reason, 'warn'); refreshBattle(); return; }
    if (res.preparing) {
      if (myFlow !== flow) return;
      setBusy(false);
      refreshBattle();
      shell.showLog(res.logTo > res.logFrom ? battle.snapshot().log[res.logTo - 1] : act.skill.name + ' 正在准备', 'act');
      sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill: act.skill, query: null });
      return;
    }
    await playAttackResult(res);
    if (myFlow !== flow) return;
    afterHeroAction();
  }
  function afterHeroAction() {
    syncShown();
    setBusy(false);
    refreshBattle();
    fullReach = findReachable(battle.ctx, battle.snapshot().currentId, Infinity);
    sandbox.refreshHover();
    idleOverlay();
    if (!currentViewData.units.some(u => u.side !== 'hero' && u.ref.hp > 0)) shell.showLog('敌方已全灭 · 结束回合以结算', 'win');
  }

  // ---------- 轮次：取得行动 → 横幅/音 → 镜头 → 玩家操作或敌方演出 ----------
  async function beginTurn({ intro = false } = {}) {
    const myFlow = flow;
    const snap = battle.snapshot();
    if (snap.terminal) { finishBattle(snap.terminal); return; }
    const u = currentUnit();
    if (!u) return;
    aim = null; pending = null; endArmedUntil = 0;
    setBusy(true);
    sandbox.beginAction();
    if (intro) { await sandbox.introSweep(1600); if (myFlow !== flow) return; }
    const c = sandbox.unitWorldCenter(u.id);
    shell.showBanner(u, u.side === 'hero' ? '我方行动' : '敌方行动');
    if (u.side === 'hero') avHost.sfx('heroTurn', 1, { category: 'M' }); else ui('enemyTurn');
    if (c) await sandbox.guideTo([c], { ms: 420 });
    if (myFlow !== flow) return;
    if (u.side === 'hero') {
      avHost.playTurnVoice(u, snap.actionSerial);
      fullReach = findReachable(battle.ctx, u.id, Infinity);
      setBusy(false);
      renderCommand();
      idleOverlay();
      return;
    }
    await runEnemyTurn(myFlow);
  }

  async function runEnemyTurn(myFlow) {
    const alive = () => myFlow === flow;
    if (!(await director.wait(380)) || !alive()) return;
    const plan = battle.planEnemyAction();
    if (plan && plan.moveTo) {
      const mover = battle.snapshot().currentId;
      sandbox.getUnitView().lockMotion(mover, true);
      const mv = battle.move(plan.moveTo.col, plan.moveTo.row);
      if (!mv.ok) sandbox.getUnitView().lockMotion(mover, false);
      refreshBattle();
      if (mv.ok) await director.playMove(mv);
      if (!alive()) return;
    }
    if (plan && plan.skill && battle.snapshot().resources.main > 0) {
      const q = battle.previewAttack(plan.skill, plan.aim);
      if (q.ok) {
        sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill: plan.skill, query: q, locked: true });
        await director.playWindup(battle.snapshot().currentId, plan.skill);
        if (!alive()) return;
        sandbox.setPreview(null);
        const res = battle.attack(plan.skill, plan.aim);
        if (res.ok) await playAttackResult(res);
        if (!alive()) return;
      }
    }
    if (!(await director.wait(420)) || !alive()) return;
    battle.endAction();
    syncShown();
    refreshBattle();
    beginTurn();
  }

  async function playAttackResult(res) {
    for (let i = res.logFrom; i < res.logTo; i++) hiddenLog.add(i);
    shell.showLog(unitName(res.casterId) + ' · ' + res.skill.name, 'act');
    const caster = currentUnit();
    if (caster) { const s = shownOf(caster); shown.set(caster.id, { hp: s.hp, mp: caster.ref.mp }); }
    refreshBattle();
    await director.playAttack(res);
    for (let i = res.logFrom; i < res.logTo; i++) hiddenLog.delete(i);
    if (!res.hits.length) shell.showLog(battle.snapshot().log[res.logTo - 1] || '', 'miss');
  }
  function unitName(id) { const u = unitById(id); return u ? (u.emoji ? u.emoji + ' ' : '') + u.name : id; }

  // ---------- 接触拍点揭示 ----------
  function revealHit(hit) {
    const u = unitById(hit.targetId);
    if (!u) return;
    const prev = shownOf(u);
    shown.set(u.id, { hp: hit.hpAfter, mp: prev.mp });
    u.bars = { ...u.bars, hp: hit.hpAfter };
    const rec = sandbox.getUnitView() && sandbox.getUnitView().nodes.get(u.id);
    if (rec) rec.bars = u.bars;
    if (u.side === 'hero') shell.setHeroBars(u.id, u.bars, { hit: hit.hit });
    for (let i = hit.logIndex; i < hit.logEnd; i++) hiddenLog.delete(i);
    shell.setHistory(visibleLog());
    shell.showLog(battle.snapshot().log[hit.logIndex], hit.hit ? 'hit' : 'dodge');
    if (hit.down) playDown(u);
  }
  function playDown(u) {
    const view = sandbox.getUnitView(), scope = sandbox.getScope();
    scope.after(220, () => {
      view.setFlag(u.id, 't-unit-falling', true);
      avHost.sfx(u.side === 'hero' ? 'hitDown' : 'kill', u.side === 'hero' ? 1 : 1.4, { category: 'M' });
      scope.after(620, () => { view.setFlag(u.id, 't-unit-falling', false); view.setFlag(u.id, 't-unit-down', true); });
    });
  }
  // 步伐：按职业/分级的步伐音、落地尘土、移动拖尾；BOSS 每步轻震镜头
  const trailAt = new Map();
  function fxNode(cls, x, y, ms, style) {
    const d = sandbox.getDom();
    if (!d) return null;
    const el = document.createElement('i');
    el.className = cls;
    el.style.left = (x * 50) + 'px'; el.style.top = (y * 50) + 'px';
    if (style) Object.assign(el.style, style);
    d.unitLayer.appendChild(el);
    sandbox.getScope().addNode(el);
    sandbox.getScope().after(ms, () => sandbox.getScope().removeNode(el));
    return el;
  }
  function moveFeedback(id, kind, p) {
    const st = unitStyles[id] || {};
    const u = unitById(id);
    if (kind === 'start') { if (st.glide) ui(st.glide); return; }
    if (kind === 'stop') { if (st.glide) ui('glideStop'); return; }
    if (!p) return;
    const stomp = () => { const d = sandbox.getDom(); if (d && d.shake) { d.shake.classList.remove('t-stomp'); void d.shake.offsetWidth; d.shake.classList.add('t-stomp'); } };
    const bigUnit = u && (u.footprint.width > 1 || u.footprint.height > 1);
    if (kind === 'jump-crouch') { ui('jumpCrouch'); return; }
    if (kind === 'jump-takeoff') { ui('jumpTakeoff'); fxNode('t-dust t-dust-light', p.x, p.y + 0.28, 520); fxNode('t-jump-gust', p.x, p.y + 0.2, 480); return; }
    if (kind === 'jump-land') {
      ui(bigUnit || st.shake ? 'bossStomp' : 'jumpLand');
      fxNode('t-land-ring', p.x, p.y + 0.22, 640);
      fxNode('t-dust t-dust-big', p.x, p.y + (bigUnit ? 0.6 : 0.3), 620);
      stomp(); return;
    }
    if (kind === 'shove') { ui('shove'); fxNode('t-shove-burst', p.x, p.y, 460); return; }
    if (kind === 'impact') { ui('impact'); fxNode('t-impact', p.x, p.y, 620); stomp(); return; }
    if (kind === 'lift') { ui('lift'); return; }
    if (kind === 'set-down') { ui('drop'); return; }
    if (kind === 'frame') {
      const held = carryOf.get(id);
      if (held) sandbox.getUnitView().setDisplayPos(held, p.x, p.y - 0.32);
      if (!st.trail) return;
      const now = performance.now();
      if (now - (trailAt.get(id) || 0) < (st.trail === 'ghost' ? 70 : 55)) return;
      trailAt.set(id, now);
      if (st.trail === 'ghost') {
        // 风行者残影：复制徽章（含反缩放 billboard），原地淡出
        const rec = sandbox.getUnitView().nodes.get(id);
        const bb = rec && rec.root.querySelector('.t-unit-billboard');
        const g = fxNode('t-ghost', p.x, p.y, 360);
        if (g && bb) { const c = bb.cloneNode(true); c.querySelectorAll('.t-unit-name,.t-unit-bars,.t-unit-direction').forEach(n => n.remove()); g.appendChild(c); }
        return;
      }
      const jitter = () => (Math.random() - 0.5) * 0.5;
      fxNode('t-trail t-trail-' + st.trail, p.x + jitter(), p.y + jitter() + 0.15, 900);
      return;
    }
    if (kind !== 'step') return;
    const s = sandbox.worldToScreenClient(p.x, p.y);
    const pan = Math.max(-0.6, Math.min(0.6, (s.x / window.innerWidth - 0.5) * 1.2));
    if (st.step) ui(st.step, { pan }); else if (st.glide) ui('sparkle', { pan });
    const big = u && (u.footprint.width > 1 || u.footprint.height > 1);
    if (st.dust) fxNode('t-dust' + (st.dust === 'heavy' || big ? ' t-dust-big' : st.dust === 'light' ? ' t-dust-light' : ''), p.x, p.y + (big ? 0.6 : 0.28), 520);
    if (st.shake) {
      const d = sandbox.getDom();
      if (d && d.shake) { d.shake.classList.remove('t-stomp'); void d.shake.offsetWidth; d.shake.classList.add('t-stomp'); }
    }
  }

  // ---------- 胜负收束 ----------
  function finishBattle(terminal) {
    setBusy(false);
    sandbox.setPreview(null);
    if (lastResult === terminal.type) return;
    lastResult = terminal.type;
    const view = sandbox.getUnitView();
    for (const u of currentViewData.units) view.setFlag(u.id, 't-unit-current', false);
    renderCommand();
    shell.showLog(terminal.type === 'victory' ? '胜利：敌方已全灭' : terminal.type === 'defeat' ? '失败：我方已全部倒地' : '僵持', terminal.type === 'victory' ? 'win' : 'lose');
    const myFlow = flow;
    director.wait(700).then(ok => {
      if (!ok || myFlow !== flow) return;
      avHost.sfx(terminal.type === 'victory' ? 'herochargedone' : 'defDown', 1.2, { category: 'M' });
      const summary = currentViewData.units.filter(u => u.side === 'hero').map(u => ({ label: u.name, value: u.ref.hp > 0 ? u.ref.hp + '/' + u.ref.maxHp : '倒地', down: u.ref.hp <= 0 }));
      const foes = currentViewData.units.filter(u => u.side !== 'hero');
      summary.push({ label: '击倒敌人', value: foes.filter(u => u.ref.hp <= 0).length + '/' + foes.length });
      summary.push({ label: '战斗时间', value: battle.snapshot().now.toFixed(1) });
      shell.openResult(terminal.type, summary, () => restart());
    });
  }

  function setBusy(on) { busy = !!on; shell.setBusy(busy); }

  function editorSkillRows(skills) {
    return (skills || []).filter(s => s && !s._inGroup).map(s => {
      const row = structuredClone(s);
      delete row.usesRemaining; delete row._explicit; delete row._inGroup; delete row.parentName;
      const clean = child => {
        delete child.usesRemaining; delete child._explicit; delete child._inGroup; delete child.parentName;
        (child.children || []).forEach(clean);
      };
      (row.children || []).forEach(clean);
      return row;
    });
  }
  function editorItemRows(items) {
    return (items || []).map(it => {
      const row = structuredClone(it);
      delete row.count; delete row.usesRemaining; delete row._explicit; delete row._sbMissing;
      (row.children || []).forEach(child => { delete child.usesRemaining; delete child._explicit; delete child._inGroup; delete child.parentName; });
      return row;
    });
  }
  function editorConfig(unit) {
    const cfg = {};
    CONFIG_PACKAGE_CONFIG_KEYS.filter(k => k !== 'actCount').forEach(k => {
      if (Object.prototype.hasOwnProperty.call(unit.ref, k)) cfg[k] = structuredClone(unit.ref[k]);
    });
    return cfg;
  }
  function makeEditorDraft() {
    const saved = readTacticsRoster();
    const persistByName = new Map((saved?.heroes || []).map(h => [h.name, h.persist || {}]));
    const TIER = { legend: ['首领', 'bg-amber-950 text-amber-300 border-amber-700/60'], elite: ['精英', 'bg-violet-950 text-violet-300 border-violet-700/60'], fodder: ['杂兵', 'bg-slate-800 text-slate-300 border-slate-600/60'] };
    return {
      tab: 'hero', open: new Set(),
      units: currentViewData.units.map(u => {
        const explicit = Array.isArray(u.ref._explicit) ? u.ref._explicit.filter(k => CONFIG_PACKAGE_CONFIG_KEYS.includes(k)) : [];
        const tier = TIER[(unitStyles[u.id] || {}).tier] || TIER.fodder;
        return {
          id: u.id, side: u.side, name: u.ref.name, displayName: u.ref.displayName || u.name, emoji: u.emoji, avatarUrl: u.avatarUrl,
          badge: u.side === 'hero' ? (u.ref.classType || '无职业') : tier[0], tierClass: tier[1],
          config: editorConfig(u), persist: structuredClone(persistByName.get(u.ref.name) || u.ref.persist || {}),
          skills: editorSkillRows(u.skills), items: editorItemRows(u.items),
          resources: { hp: u.ref.hp, mp: u.ref.mp, tp: u.ref.tp },
          sourceText: u.side === 'hero'
            ? (explicit.length ? 'YAML 显式字段：' + explicit.join('、') + '（以 YAML 为准；在此修改只写入持久档，YAML 未写的字段才采用持久档）' : '配置来源：持久档 / 缺省值')
            : '敌方配置只在本场内存生效，保存后立即重置本场',
        };
      }),
      existingHeroes: (saved?.heroes || []).map(h => structuredClone(h)),
    };
  }
  // 保存前校验：数值与每条技能/物品逐条走解析器，错误定位到「角色 · 技能 #n」
  function validateEditorDraft(d) {
    for (const row of d.units) {
      const who = (row.side === 'hero' ? '我方 ' : '敌方 ') + row.displayName;
      if (!Number.isFinite(row.resources.hp) || row.resources.hp < 0 || !Number.isFinite(row.resources.mp) || row.resources.mp < 0) throw new Error(who + ' · 本场 HP/MP 必须为非负数');
      for (const [k, v] of Object.entries(row.config)) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(who + ' · 属性 ' + k + ' 不是有效数字');
      const fp = row.config.footprint;
      if (fp && !(fp.width >= 1 && fp.height >= 1)) throw new Error(who + ' · 占格宽高至少为 1');
      row.skills.forEach((s, i) => { try { parseSkillEntry(s); } catch (err) { throw new Error(who + ' · 技能 #' + (i + 1) + '「' + (s && s.name) + '」：' + err.message); } });
      row.items.forEach((it, i) => { try { parseItemEntry(it); } catch (err) { throw new Error(who + ' · 物品 #' + (i + 1) + '「' + (it && it.name) + '」：' + err.message); } });
    }
  }
  // 组父 children → 平铺子技能行（与 parseSkillList 同构：_inGroup + parentName 紧随组父），菜单组卡据此展开
  function flattenSkills(list) {
    const out = [];
    for (const s of list) {
      out.push(s);
      if (s.isGroup && Array.isArray(s.children)) s.children.forEach(c => { c._inGroup = true; c.parentName = s.name; out.push(c); });
    }
    return out;
  }
  function persistEditorDraft() {
    const selected = editorDraft.units;
    const skills = row => row.skills.map(parseSkillEntry);
    const items = row => row.items.map(parseItemEntry);
    const saved = editorDraft.existingHeroes.slice();
    const byName = new Map(saved.map((h, i) => [h.name, i]));
    const persistent = [];
    for (const row of selected.filter(u => u.side === 'hero')) {
      const cfg = {};
      CONFIG_PACKAGE_CONFIG_KEYS.filter(k => k !== 'actCount').forEach(k => {
        if (Object.prototype.hasOwnProperty.call(row.config, k)) cfg[k] = row.config[k];
      });
      persistent.push({ name: row.name, displayName: row.displayName, config: cfg,
        persist: row.persist, skills: skills(row), items: items(row) });
    }
    const packageData = buildConfigPackage(persistent, 'all');
    const clean = finalizeImportDraft(packageData.heroes);
    clean.forEach(h => {
      if (byName.has(h.name)) saved[byName.get(h.name)] = h;
      else { byName.set(h.name, saved.length); saved.push(h); }
    });
    saveTacticsRoster({ version: 1, heroes: saved });
    const overrides = {};
    for (const row of selected) {
      const live = currentViewData.units.find(u => u.id === row.id);
      const ref = structuredClone(live.ref);
      ref.displayName = row.displayName;
      if (row.side === 'hero') Object.assign(ref, structuredClone(row.config), { persist: structuredClone(row.persist) });
      else Object.assign(ref, structuredClone(row.config));
      const parsedSkills = flattenSkills(skills(row));
      const parsedItems = items(row);
      const counts = new Map((live.items || []).map(it => [it.name, it.count]));
      parsedItems.forEach(it => { if (counts.has(it.name)) it.count = counts.get(it.name); });
      ref.skills = parsedSkills; ref.items = parsedItems;
      overrides[row.id] = { ref, displayName: row.displayName, resources: structuredClone(row.resources) };
    }
    editorOverrides.set(currentViewData.sceneId + '\u0000' + currentViewData.battleId, overrides);
  }

  function soundSettingsHtml() {
    const rep = avHost.resourceReport();
    const count = (list, st) => list.filter(r => r.status === st).length;
    const bad = rep.audio.filter(r => r.status === 'error').concat(rep.images.filter(r => r.status === 'error'));
    return '<h4 class="t-panel-h">声音与资源</h4>' +
      '<div class="t-res-report"><div>资源基址：<code>' + escapeText(rep.assetBase) + '</code></div>' +
      '<div>音频上下文：' + (rep.unlocked ? '已解锁（' + rep.audioState + '）' : '未解锁（首次点击/按键后解锁）') + '</div>' +
      '<div>采样/语音：成功 ' + count(rep.audio, 'ok') + ' · 加载中 ' + count(rep.audio, 'loading') + ' · 失败 ' + count(rep.audio, 'error') + '</div>' +
      '<div>头像：成功 ' + count(rep.images, 'ok') + ' · 失败 ' + count(rep.images, 'error') + '</div>' +
      (bad.length ? '<div class="t-res-bad">加载失败：<br>' + bad.map(r => escapeText(r.url)).join('<br>') + '</div>' : '') +
      (rep.missing.length ? '<div class="t-res-bad">缺失：' + rep.missing.map(m => escapeText(m.kind + ':' + m.detail)).join('，') + '</div>' : '') +
      '<div class="t-submenu-empty">背景环境声：尚未选定素材，本轮不播放。</div></div>';
  }
  function escapeText(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

  // ---------- 键盘：数字键选技能 / Space 结束回合 / Enter 发动 / Esc 返回 ----------
  const onKey = e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'Escape') { cancelStep(); return; }
    if (!battle || !isHeroTurn()) return;
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (busy) { ui('deny'); return; } requestEnd(); return; }
    if (e.key === 'Enter' && pending) { e.preventDefault(); if (!busy) firePending(); return; }
  };
  rootEl.ownerDocument.addEventListener('keydown', onKey);

  function playProjectile(type, fromId, toId) {
    avHost.syncRoster();
    return avHost.av.playArcaneProjectile(type === 'fire' ? 'fire' : 'enemy_spell', avHost.host.spriteOf(fromId), avHost.host.spriteOf(toId), false);
  }

  function boot() { loadYaml(opts.defaultYaml || DEFAULT_YAML_A); }

  function destroy() {
    flow++;
    rootEl.ownerDocument.removeEventListener('keydown', onKey);
    combatToken = {};
    avHost.destroy();
    sandbox.destroy();
    shell.destroy();
  }

  return {
    loadYaml, boot, destroy, playProjectile, restart,
    sandbox, shell, avHost, director,
    getToken: () => combatToken,
    getViewData: () => currentViewData,
    getBattle: () => battle,
    isBusy: () => busy,
    resources: () => avHost.resourceReport(),
    command: (key) => handleCommand(key),
    endTurn: () => requestEnd(),
  };
}


