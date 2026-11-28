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
import { actionBalance } from './actions.mjs';
import { getVisibleTurnQueue } from './clock.mjs';
import { findReachable } from './movement.mjs';
import { createAvHost, heroAvatarUrl } from './av-host.mjs';
import { createActionDirector } from './action-director.mjs';
import { createUiSfx } from './ui-sfx.mjs';
import { CHAPEL_SCENE } from './chapel-scene.mjs';
import { resolveUnitStyles, isUnitFlying, resolveFlightStyle, JUMP_LAND_HEAVY_POOL } from './unit-style.mjs';
import { createEditorPanel } from './editor-panel.mjs';
import { autoPickChoice } from './reaction-prompt.mjs';
import { unitCenter, occupiedCells, cellKey } from './geometry.mjs';
import { threatOf, threatHeat } from './threat.mjs';
import { canSeeUnit } from './perception.mjs';
import { createEncounterScenario, createScenarioData, createSeededRandom } from './scenario-data.mjs';
import { statusBadges, compactStatusHtml, iconStatusHtml, inspectorHtml, auraList } from './status-ui.mjs';
import { passiveGainLabel, getFxTagOptions } from './fx-library.mjs';
import { applyFxInference, unitElement, ELEMENT_COLORS } from './fx-infer.mjs';
import { resolveLore } from './lore.mjs';
import { getEffectiveStats } from './class-passives.mjs';
import { hitChance } from './damage.mjs';
import { skillSlots } from './effect-definitions.mjs';
import { createBgmDirector } from './bgm-director.mjs';
import { SPEED_STEPS, setTimeScale, getTimeScale } from './time-scale.mjs';
import { BGM_TRACKS } from './bgm-library.mjs';
// C1 特效推断：LLM 漏写/写错 [特效:名] 时按白名单补全（只改 fxTag，标记 fxTagInferred）；显式合法与「无」不动。
export function inferUnitFx(units, legal = new Set(getFxTagOptions().map(o => o.name))) {
  let n = 0;
  for (const u of units || []) {
    const opts = { legal, boss: u.level === '首领' };
    n += applyFxInference(u.skills, opts) + applyFxInference(u.items, opts);
  }
  return n;
}

// 同名 YAML 技能仍保留规则字段，本场编辑仅覆写显式演出标签。
export function applyEditorFxTags(rows, editedRows) {
  const byName = new Map((editedRows || []).map(row => [row.name, row]));
  for (const row of rows || []) {
    const edited = byName.get(row.name);
    if (!edited) continue;
    row.fxTag = edited.fxTag || null;
    delete row.fxTagInferred;
    if (row.children) applyEditorFxTags(row.children, edited.children);
  }
}

export function linkSkillGroupRows(skills) {
  for (const parent of skills) if (parent.isGroup) {
    const children = skills.filter(s => s._inGroup && s.parentName === parent.name);
    if (children.length) parent.children = children;
  }
  return skills;
}

export function applyPersistentFxTags(units, roster) {
  const byName = new Map((roster?.heroes || []).map(hero => [hero.name, hero]));
  for (const unit of units) {
    if (unit.side !== 'hero') continue;
    const saved = byName.get(unit.ref.name || unit.name);
    if (!saved) continue;
    applyEditorFxTags(unit.skills, saved.skills);
    applyEditorFxTags(unit.items, saved.items);
  }
}

// 仅映射规则已结算的资源增量，暴击、封顶与溢出护盾均由后端提供。
export function supportResourceDelta(effect) {
  if (effect.kind === 'heal') return { hp: effect.value, ...(effect.overheal ? { shield: effect.overheal } : {}) };
  if (effect.kind === 'healMp') return { mp: effect.value };
  if (effect.kind === 'healTp') return { tp: effect.value };
  if (effect.kind === 'shield') return { shield: effect.value };
  return {};
}

// ---------- P02 固定图库（同一张权威几何，两个 sceneId 身份；不做生成器） ----------
const SCENE_LIBRARY = {
  'sc-test-room': TEST_ROOM,
  'sc-second-room': { ...TEST_ROOM, sceneId: 'sc-second-room' },
  'sc-chapel': CHAPEL_SCENE,
};
export function sceneForState(sceneId, sceneState = {}) {
  const s = SCENE_LIBRARY[sceneId];
  if (!sceneState.layout && !s) throw new Error('无此场景: ' + sceneId);
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
  '          - "【火舌】【远程】[MP:6] [power:18] [单体] [射程:15] [特效:火焰]"',
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
        skills: linkSkillGroupRows(Array.isArray(src.skills) ? src.skills : []),
        items: Array.isArray(src.items) ? src.items : [],
        ref: src, classType: src.classType, ...(src.level == null ? {} : { level: src.level }),
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

// ---------- 典型对局权威样本（中文对象格式：meta/站位/召唤物）→ 视图数据 ----------
// 单位、ID、站位、种子与召唤模板一律来自契约入口 createScenarioData；本层只补头像/emoji/显示条。
export function isTypicalBlock(block) { return !!(block && block.placements && Object.keys(block.placements).length); }
export function buildTypicalViewData(block, scenario, scene, positions, combatToken) {
  const srcs = [...(block.heroes || []), ...(block.enemies || [])];
  const footprintsById = {}, placementsById = {};
  const units = scenario.units.map((u, i) => {
    const src = srcs[i] || {};
    const emoji = splitEmojiName(src.name || u.name).emoji || null;
    footprintsById[u.id] = { ...u.footprint };
    const p = positions[u.id] || scenario.placementsById[u.id];
    placementsById[u.id] = { col: p.col, row: p.row, facing: p.facing || 0 };
    return Object.assign(u, {
      emoji, img: src.img || null,
      avatarUrl: emoji ? null : resolveAvatarUrl({ img: src.img, name: u.name }, heroAvatarUrl),
      bars: { hp: u.ref.hp, maxHp: u.ref.maxHp || 0, mp: u.ref.mp, maxMp: u.ref.maxMp || 0, tp: u.ref.tp || 0 },
    });
  });
  return { sceneId: scene.sceneId, battleId: block.battleId, scene, units, footprintsById, placementsById, combatToken };
}

// ---------- App ----------
export function createApp(rootEl, opts = {}) {
  ensureMemoryVarHost();
  const shell = buildShell(rootEl);
  let currentYamlText = null;
  let currentViewData = null;
  const avHost = createAvHost({ getUnitView: () => sandbox.getUnitView(), getUnits: () => (currentViewData ? currentViewData.units : []),
    getEffectiveUnit: id => battle?.getEffectiveUnit(id), onStatusTick: (ev, index) => playDotTick(ev, index),
    onStatusExpired: (ev, index) => playExpiredStatus(ev, index), onVariantTrigger: (ev, beat) => playVariantFeedback(ev, beat) });
  const ui = createUiSfx(avHost.av.CombatAudioMixer);
  let settlementSeq = 0;
  const bgm = createBgmDirector({ assetBase: avHost.resourceReport().assetBase, context: () => avHost.av.CombatAudioMixer.context(),
    output: () => avHost.av.CombatAudioMixer.output('master') });
  const unlockBgm = () => { void bgm.unlock(); };
  rootEl.ownerDocument?.addEventListener('pointerdown', unlockBgm, { capture: true });
  rootEl.ownerDocument?.addEventListener('keydown', unlockBgm, { capture: true });

  function bgmFrame(snap = battle.snapshot()) {
    return { terminal: snap.terminal, units: snap.units.map(u => {
      const { maxHp, isSummon } = battle.getEffectiveUnit(u.id);
      return { id: u.id, side: u.side, primary: currentViewData.heroCardIds.has(u.id), isSummon,
        hp: u.hp, maxHp, shield: u.shield, status: u.status };
    }) };
  }
  function settleBgm(before, snap = battle.snapshot()) {
    bgm.syncBattle(bgmFrame(snap), ++settlementSeq, before);
  }
  function endActionWithBgm() {
    const before = bgmFrame();
    battle.endAction();
    const after = battle.snapshot();
    const prior = new Map(before.units.map(u => [u.id, u]));
    if (after.units.some(u => prior.has(u.id) && (prior.get(u.id).hp !== u.hp || prior.get(u.id).shield !== u.shield))) settleBgm(before, after);
  }

  let musicPanel;
  const unsubscribeBgm = bgm.subscribe(state => {
    if (musicPanel?.isConnected) updateMusicPanel(state);
  });
  function updateMusicPanel(state) {
    const level = { low: '低烈度', medium: '中烈度', high: '高烈度' }[state.level];
    musicPanel.querySelector('[data-music-status]').textContent = (state.comeback ? '反击 · ' : '') + level + ' · ' + (state.mode === 'auto' ? '自动' : '手动');
    musicPanel.querySelector('[data-music-title]').textContent = state.error || state.track?.title || '暂无曲目';
    musicPanel.querySelector('[data-music-toggle]').textContent = state.playing || state.loading ? '暂停' : '播放';
    musicPanel.querySelector('[data-music-auto]').disabled = state.mode === 'auto';
    musicPanel.querySelector('output').textContent = Math.round(state.volume * 100) + '%';
  }
  shell.onMusic = () => {
    shell.openPanel('🎵 音乐', '<div class="t-music-panel"><strong data-music-title></strong><span data-music-status></span>' +
      '<label>选曲 <select><option value="">选择曲目</option></select></label>' +
      '<label>音乐音量 <input type="range" min="0" max="100"><output></output></label>' +
      '<div><button type="button" data-music-toggle></button><button type="button" data-music-next>下一首</button>' +
      '<button type="button" data-music-auto>恢复自动</button></div></div>');
    musicPanel = shell.els.panelBody.querySelector('.t-music-panel');
    const select = musicPanel.querySelector('select');
    for (const track of BGM_TRACKS) {
      const option = rootEl.ownerDocument.createElement('option');
      option.value = track.id; option.textContent = track.title;
      select.append(option);
    }
    select.onchange = () => { if (select.value) bgm.selectTrack(select.value); select.value = ''; };
    const slider = musicPanel.querySelector('input');
    slider.value = Math.round(bgm.state().volume * 100);
    slider.oninput = () => bgm.setVolume(Number(slider.value) / 100);
    musicPanel.querySelector('[data-music-toggle]').onclick = () => bgm.togglePause();
    musicPanel.querySelector('[data-music-next]').onclick = () => bgm.nextTrack();
    musicPanel.querySelector('[data-music-auto]').onclick = () => bgm.resumeAuto();
    updateMusicPanel(bgm.state());
  };
  // 演出倍速：顶栏按钮在 1.0/1.2/1.5/2.0 间循环，全局作用于我方与敌方演出（规则时钟不受影响）
  const SPEED_KEY = 'tactics.speed.v1';
  function applySpeed(v) { setTimeScale(v); shell.setSpeedLabel(v); }
  try { const saved = Number(localStorage.getItem(SPEED_KEY)); if (SPEED_STEPS.includes(saved)) applySpeed(saved); } catch (_) {}
  shell.onSpeed = () => {
    const next = SPEED_STEPS[(SPEED_STEPS.indexOf(getTimeScale()) + 1) % SPEED_STEPS.length];
    applySpeed(next);
    try { localStorage.setItem(SPEED_KEY, String(next)); } catch (_) {}
  };
  const sandbox = createSandbox(shell.els.mapSlot, {
    getSafeRect: () => shell.getSafeRect(),
    onStage: (els) => avHost.attachStage(els),
    onAvatarStatus: (unit, url) => { if (url) avHost.trackImage(url, 'avatar', unit.name); else avHost.host.report('avatar-missing', unit.name); },
  });
  const director = createActionDirector({
    sandbox, avHost, getViewData: () => currentViewData,
    onReveal: (hit, meta) => revealHit(hit, meta),
    onEffectReveal: (e) => revealEffect(e),
    onMoveFeedback: (id, kind, p) => moveFeedback(id, kind, p),
    onRuleReveal: (value, { kind }) => { if (kind === 'reaction-damage') revealCounter(value); },
    onSelfDestruct: () => { syncShown(); refreshBattle(); },
    onObstacleBreak: () => releaseScene(),
    onPassiveGain: (ev) => { if (unitById(ev.unitId)?.side === 'hero') shell.flashHeroPassive(ev.unitId, passiveGainLabel(ev), PASSIVE_CARD_COLOR[ev.kind]); },
    promptRetarget: (req) => {
      const caster = unitById(req.casterId);
      return isPlayerUnit(caster) ? beginRetargetPrompt(req) : Promise.resolve(null);
    },
    promptTeleport: (req) => beginTeleportPrompt(req),
    onMovementRequest: (req) => presentMovementRequest(req),
    getUnitStyle: (id) => effectiveUnitStyle(id),
    liteRepeatCine: () => audioPrefs.liteCine !== false,
    // FX02 反应接线（contract v2/v3）：玩家控制的单位（controller 优先，缺省按 side）受击弹全屏反应弹窗；
    // AI 控制的（敌方/召唤物/AI 侧 hero）不弹窗，自动选首个可用候选（原版敌方口径）
    promptReaction: (req) => {
      if (req?.type === 'kanpo') {
        const candidates = (req.candidates || []).map(c => unitById(c.responderId)).filter(Boolean);
        if (!candidates.some(isPlayerUnit)) return Promise.resolve(autoPickChoice(req));
        return shell.promptReaction(enrichReactionReq(req));
      }
      const responder = unitById(req && req.responderId);
      if (!responder) return Promise.resolve(autoPickChoice(req));
      const controller = responder.controller || (responder.side === 'hero' ? 'player' : 'ai');
      if (controller !== 'player') return Promise.resolve(autoPickChoice(req));
      return shell.promptReaction(enrichReactionReq(req));
    },
    battle: () => battle,
  });
  function enrichReactionReq(req) {
    if (!req) return req;
    const responder = unitById(req.responderId), caster = unitById(req.casterId);
    return Object.assign({}, req, {
      responderName: responder ? responder.name : req.type === 'kanpo' ? '我方队伍' : req.responderId,
      responderEmoji: responder ? responder.emoji : null,
      responderAvatarUrl: responder ? responder.avatarUrl : null,
      casterName: caster ? caster.name : (req.casterId || '敌人'),
      casterEmoji: caster ? caster.emoji : null,
      // 候选归属者（舍身者/看破者可能不是受击者本人）的显示身份
      candidates: (req.candidates || []).map(c => {
        const owner = unitById(c.responderId || req.responderId);
        return Object.assign({}, c, { faceName: owner ? owner.name : '', faceEmoji: owner ? owner.emoji : null, faceAvatarUrl: owner ? owner.avatarUrl : null });
      }),
    });
  }
  let combatToken = {};
  let battle = null;
  let aim = null;            // 瞄准模式 { key, skill }；null = 自由模式（点地面移动、点敌人攻击）
  let fieldAction = null;    // P04：跳跃/推动/背负/放下目标选择
  let pending = null;        // 已锁定的攻击 { key, aim }
  let offeredPreparation = null;
  let fullReach = null;      // 本次行动无额度可达表（区分"超出额度"与"不可达"）
  let currentState = null;
  let lastResult = null;
  let busy = false;
  let flow = 0;              // 演出流程代际：重置/换场 +1，旧 await 链作废
  let endArmedUntil = 0;
  let booted = false;
  const shown = new Map();   // 显示态资源（接触拍点前保持旧值）
  const shownEff = new Map(); // 显示态状态（有效属性视图快照；效果揭示拍点才更新该单位）
  let sprintArm = null;      // 冲刺移动待确认格 'col,row'
  let jumpArm = null;        // 右键跳跃待确认格 'col,row'
  let inspectHover = null;
  let inspectPin = null;     // 右侧收纳签固定查看的友方支援单位（悬停他人时临时让位）
  let unitStyles = {};       // 单位表现风格：我方职业 / 敌方分级（只影响画面与声音）
  const lastAttackByUnit = new Map(); // unitId → { key, name }（记住最近一次非蓄力攻击技能）
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
    renderInspector();
  };
  shell.onAllyPin = (unitId) => { inspectPin = unitId; renderInspector(); };
  shell.onReset = () => restart();
  const editor = createEditorPanel({
    rpgUi: shell.rpgUi, shell, globalHtml: () => soundSettingsHtml(), validate: validateEditorDraft,
    onSave: (d) => { editorDraft = d; persistEditorDraft(); editorDraft = null; restart(); },
    onCancel: () => { editorDraft = null; },
  });
  shell.settings = { open: () => { if (!currentViewData) return false; editorDraft = makeEditorDraft(); editor.open(editorDraft); return true; } };
  sandbox.onSelect((unit) => { shell.setSelected(unit ? unit.id : null); renderInspector(); });
  sandbox.onCancel(() => cancelStep());
  sandbox.onContext(hit => {
    if (!battle || !isHeroTurn() || retargetPrompt || !hit) return false;
    if (busy) { ui('deny'); return true; }
    if (aim || pending || sprintArm || (fieldAction && fieldAction !== 'jump')) return false;
    const key = hit.col + ',' + hit.row;
    if (fieldAction === 'jump' && jumpArm === key) { jumpArm = null; runFieldTarget('jump', hit); return true; }
    const r = battle.snapshot().resources, reach = jumpReach(currentUnit(), r);
    if (!r || !r.freeJumpAvailable && actionBalance(r, 'aux') < 1 || r.jumpsRemaining < 1 || reach < 1) {
      ui('deny'); shell.showLog(r && !r.freeJumpAvailable && actionBalance(r, 'aux') < 1 ? '行动点不足，无法跳跃' : r && r.jumpsRemaining < 1 ? '本次自然行动已经跳跃' : '无法起跳', 'warn');
      return true;
    }
    if (fieldAction !== 'jump') handleFieldAction('jump');
    const q = battle.previewJump(hit.col, hit.row);
    jumpArm = q.ok ? key : null;
    ui(q.ok ? 'lock' : 'deny');
    sandbox.refreshHover();
    return true;
  });

  const openingStates = new Map();

  function loadYaml(text, { forceReset = false, positions = {}, sceneOverrides = {} } = {}) {
    if (opts.playable && !forceReset && battle && text === currentYamlText && !Object.keys(positions).length && !Object.keys(sceneOverrides).length) {
      return { branch: 'resume', viewData: currentViewData };
    }
    const block = parseYamlText(text);
    const encounter = createEncounterScenario(block, opts.encounter, positions);
    if (encounter) block.sceneId = encounter.scene.sceneId;
    const scenario = encounter || (isTypicalBlock(block) ? createScenarioData(block) : null);
    const state = readTacticsState();
    const incoming = { sceneId: block.sceneId, battleId: block.battleId };
    const knownScene = state?.scenes?.[block.sceneId];
    const defaults = scenario ? scenario.placementsById : (opts.defaultPlacements || DEFAULT_PLACEMENTS);
    const explicit = { ...sceneOverrides, positions: { ...positions } };
    if (encounter && !knownScene?.layout && !explicit.layout) explicit.layout = encounter.scene;
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
    let roster = null, nextView;
    if (scenario) {
      nextView = buildTypicalViewData(block, scenario, scene, result.sceneState.positions, nextToken);
      applyPersistentFxTags(nextView.units, readTacticsRoster());
    } else {
      buildViewData(block, block.heroes, scene, result.sceneState.positions, nextToken);
      roster = loadTacticsRoster(block, []);
      nextView = buildViewData(block, roster.heroes, scene, result.sceneState.positions, nextToken);
    }
    inferUnitFx(nextView.units);
    const overrideKey = block.sceneId + '\u0000' + block.battleId;
    const localOverrides = editorOverrides.get(overrideKey);
    if (localOverrides) {
      for (const u of nextView.units) {
        const patch = localOverrides[u.id];
        if (!patch) continue;
        if (u.side === 'hero' && patch.ref) {
          applyEditorFxTags(u.skills, patch.ref.skills);
          applyEditorFxTags(u.items, patch.ref.items);
        }
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
    if (!unchanged) {
      flow++;
      bgm.stopBattle();
      cancelRetargetPrompt();
      director.cancelAttack();          // 旧攻击 generator 作废（generator.return）
      battle?.destroy();
      shell.cancelReactionPrompt();     // 旧反应弹窗/收起胶囊立即关闭并以 null 结算
      avHost.clear({ resetVoices: true });
    }
    combatToken = unchanged ? combatToken : nextToken;
    avHost.setToken(combatToken);
    nextView.combatToken = combatToken;
    nextView.heroCardIds = new Set(nextView.units.filter(u => u.side === 'hero' && !u.isSummon).slice(0, 4).map(u => u.id));
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
      const isFreshBattle = !unchanged || forceReset || !battle;
      if (isFreshBattle) {
        lastAttackByUnit.clear();
        shell.clearBattle();
        settlementSeq = 0;
        currentState = result.state;
        lastResult = null;
        battle = createBattle({ units: currentViewData.units, placementsById: currentViewData.placementsById, scene, battleState: result.battleState,
          random: scenario ? createSeededRandom(scenario.seed) : opts.random, summonProvider: scenario ? scenario.summonProvider : opts.summonProvider });
        battle.start();
        unitStyles = resolveUnitStyles(currentViewData.units);
      }
      syncShown();
      refreshBattle({ deferPassive: true });
      if (isFreshBattle) bgm.startBattle(bgmFrame());
      beginTurn({ intro: !booted || forceReset });
      booted = true;
      return { block, roster, result, branch, viewData: currentViewData };
    }
    shell.renderHeroes(currentViewData.units, currentViewData.heroCardIds);
    shell.renderTurnOrder(currentViewData.units);
    shell.bindMenus(currentViewData.units);
    shell.showLog('已载入 ' + block.sceneId + ' / ' + block.battleId + '（分支 ' + branch + '）');
    return { block, roster, result, branch, viewData: currentViewData };
  }

  function restart() { loadYaml(currentYamlText || opts.defaultYaml || DEFAULT_YAML_A, { forceReset: true }); }

  // ---------- 显示态（规则真值在 ref；画面只在接触拍点推进） ----------
  function syncShown() {
    if (!currentViewData) return;
    for (const u of currentViewData.units) {
      shown.set(u.id, { hp: u.ref.hp, mp: u.ref.mp, tp: u.ref.tp || 0, shield: u.ref.shield || 0 });
      if (battle) shownEff.set(u.id, battle.getEffectiveUnit(u.id));
    }
  }
  // ---------- 状态徽章 / 检视卡（只读显示态快照与规则视图） ----------
  function badgesOf(u) {
    const eff = shownEff.get(u.id) || u.effective;
    const prep = battle.battleState.combatState.charges?.[u.id]?.preparing;
    return statusBadges(eff && { ...eff, shield: shownOf(u).shield }, { preparing: prep ? { name: prep.skill?.name || '蓄力', remaining: prep.remaining } : null });
  }
  function renderStatus(only) {
    const view = sandbox.getUnitView();
    if (!view || !battle) return;
    for (const u of currentViewData.units) {
      if (only && u.id !== only) continue;
      const list = shownOf(u).hp > 0 ? badgesOf(u) : [];
      view.setStatus(u.id, compactStatusHtml(list));
      view.setAuras(u.id, auraList(list));
      if (u.side === 'hero') {
        if (currentViewData.heroCardIds.has(u.id)) {
          shell.setHeroStatus(u.id, iconStatusHtml(list.filter(b => b.key !== 'shield')));  // 护盾已写进卡片血条
          shell.setHeroStats(u.id, shownEff.get(u.id) || battle.getEffectiveUnit(u.id), getEffectiveStats(u, []));
        }
      }
    }
    renderInspector();
  }
  function renderInspector() {
    const id = inspectHover || inspectPin;
    const u = id && battle && unitById(id);
    if (!u) { shell.showInspector(null); return; }
    const eff = battle.getEffectiveUnit(u.id);
    const snapU = battle.snapshot().units.find(x => x.id === u.id);
    const prep = battle.battleState.combatState.charges?.[u.id]?.preparing;
    shell.showInspector(inspectorHtml({ unit: u, eff: { ...eff, shield: shownOf(u).shield }, base: getEffectiveStats(u, []), badges: badgesOf(u), shown: shownOf(u), lore: resolveLore(u), pinned: !inspectHover && id === inspectPin,
      charge: snapU?.charge, preparing: prep ? { name: prep.skill?.name || '蓄力', remaining: prep.remaining } : null }));
  }
  function shownOf(u) { return shown.get(u.id) || { hp: u.ref.hp, mp: u.ref.mp, tp: u.ref.tp || 0, shield: u.ref.shield || 0 }; }
  function visibleLog() { return battle.snapshot().log.filter((_, i) => !hiddenLog.has(i)); }
  function unitById(id) { return currentViewData.units.find(u => u.id === id) || null; }
  function currentUnit() { return battle && currentViewData ? unitById(battle.snapshot().currentId) : null; }
  function isPlayerUnit(u) { return !!(u && (u.controller || (u.side === 'hero' ? 'player' : 'ai')) === 'player'); }
  function isHeroTurn() { return isPlayerUnit(currentUnit()) && !battle.snapshot().terminal; }
  function skillUsable(skill) {
    if (skill.isGroup) return (skill.children || []).some(skillUsable);
    return !!(battle && battle.skillStatus(skill).ok);
  }
  function skillReason(skill) {
    if (!battle) return '当前不能使用技能';
    // 变体组父项无自身行动语义：有可用子项即不标原因，否则报首个子项的真实原因
    if (skill.isGroup) {
      const kids = (currentUnit()?.skills || []).filter(s => s._inGroup && s.parentName === skill.name);
      if (kids.some(skillUsable)) return '';
      return kids.length ? '变体均不可用：' + (battle.skillStatus(kids[0]).reason || '') : '无变体';
    }
    return battle.skillStatus(skill).reason || '';
  }
  function isSelfCast(skill) {
    const range = skill.range;
    if (range?.type === '自身') return true;
    if (range?.type !== '单体') return false;
    const slots = skillSlots(skill);
    return slots.length > 0 && (slots.every(s => s.target === 'self') ||
      (range.castRange === 0 && slots.every(s => s.target === 'self' || !s.attack && !s.debuff && s.target !== 'enemy')));
  }
  function skillOfKey(key) {
    if (key === 'attack') return BASIC_ATTACK;
    const m = /^sk:(\d+)$/.exec(key || '');
    return m ? (currentUnit()?.skills || [])[Number(m[1])] || null : null;
  }
  // 点敌人直接攻击：若该单位已有记忆的非蓄力攻击技能，优先沿用（不静默切换，不满足条件返回真实原因）；
  // 否则按技能栏顺序取首个可达的非蓄力攻击技能，再回退普攻；蓄力技能不走此快捷交互。
  function resolveEnemyQuickAction(hit) {
    const u = currentUnit();
    if (!u) return null;
    const skills = u.skills || [];
    const mem = lastAttackByUnit.get(u.id);
    if (mem) {
      const memSkill = mem.key === 'attack' ? BASIC_ATTACK : skills.find(s => !s.isGroup && s.name === mem.name);
      const memIdx = memSkill && memSkill !== BASIC_ATTACK ? skills.indexOf(memSkill) : -1;
      const memKey = memSkill === BASIC_ATTACK ? 'attack' : (memIdx >= 0 ? 'sk:' + memIdx : null);
      if (memSkill && memKey && !(memSkill.charge > 0)) {
        if (!skillUsable(memSkill)) return { ok: false, remembered: true, key: memKey, skill: memSkill, reason: skillReason(memSkill) || '条件不满足' };
        if (hit) {
          const p = aimFor(memSkill, hit);
          const q = p ? battle.previewAttack(memSkill, p) : null;
          if (!p || !q || !q.ok) return { ok: false, remembered: true, key: memKey, skill: memSkill, reason: (q && q.reason) || '无法以该敌人为目标' };
        }
        return { ok: true, remembered: true, key: memKey, skill: memSkill };
      }
    }
    const usable = skills.map((s, i) => ({ key: 'sk:' + i, skill: s }))
      .filter(a => !a.skill._inGroup && !a.skill.isGroup && !(a.skill.charge > 0 || a.skill.delay > 0) && !isSelfCast(a.skill) && skillUsable(a.skill) && skillSlots(a.skill).some(x => x.attack));
    if (skillUsable(BASIC_ATTACK)) usable.push({ key: 'attack', skill: BASIC_ATTACK });
    if (!usable.length) return { ok: false, remembered: false, reason: skillReason(BASIC_ATTACK) || '主行动已用完' };
    if (hit) {
      const reach = usable.find(a => { const p = aimFor(a.skill, hit); return p && battle.previewAttack(a.skill, p).ok; });
      if (reach) return { ok: true, ...reach };
    }
    const best = usable.slice().sort((a, b) => (b.skill.range?.castRange || 0) - (a.skill.range?.castRange || 0))[0];
    return best ? { ok: true, ...best } : null;
  }
  function queueRows(snap) {
    const ids = currentViewData.units.filter(u => shownOf(u).hp > 0 || u.id === snap.currentId).map(u => u.id);
    const queue = getVisibleTurnQueue(battle.battleState, 'hero', { visibleUnitIds: ids }).filter(r => r.unitId !== snap.currentId);
    if (ids.includes(snap.currentId)) queue.unshift({ unitId: snap.currentId, nextActionAt: snap.now });
    return queue;
  }
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function renderCommand() {
    const snap = battle.snapshot();
    const u = currentUnit();
    if (!u) { shell.renderCommand(null); return; }
    const r = snap.resources;
    const hero = isPlayerUnit(u) && !snap.terminal;
    const carrying = snap.carrying[u.id] || null;
    const basic = hero && r ? basicActions(u, r, carrying) : [];
    const prep = hero && !busy && snap.preparation ? battle.canAdvancePreparation() : null;
    const stationary = hero && !busy ? battle.stationaryStatus() : null;
    if (stationary?.ok && snap.preparation) stationary.payment = battle.canAdvancePreparation({ stationary: true }).payment;
    const fieldHint = {
      jump: '【跳跃】在地图上选择落点<br><small>八方向直线 · 最远 ' + jumpReach(u, r) + 'm · 越过低矮障碍与单位 · 不扣移动额度</small>',
      push: '【推动】选择相邻单位<br><small>力量对抗 · 撞墙按剩余距离受伤</small>',
      carry: '【背起】选择相邻的倒地友方<br><small>背负中移动消耗加倍</small>',
    };
    shell.renderCommand({
      unit: u, terminal: !!snap.terminal, playable: hero, serial: snap.actionSerial,
      resources: r ? { ...r, moveMax: r.baseMove, mp: u.ref.mp } : null,
      carrying, preparation: snap.preparation, chargeInventory: snap.chargeInventory, endArmed: performance.now() < endArmedUntil, basic,
      aimHint: !hero ? null : fieldAction ? fieldHint[fieldAction] : !aim ? null : pending
        ? '【' + esc(aim.skill.name) + '】已锁定<br>再次点击目标或 Enter 发动'
        : '【' + esc(aim.skill.name) + '】请在地图上选择目标',
      canUse: s => battle.hasActiveField(s) || skillUsable(s),
      canDismissSkill: battle.hasActiveField,
      canStationary: hero && !busy && battle.canStationaryPrepare(),
      stationary, startPayment: battle.previewStationaryStart,
      preparePayment: prep?.payment || null, continueReason: prep?.reason,
      onStationary: (idx) => handleCommand('sk:' + idx, true),
      skillReason,
      itemStatus: (it, child) => {
        const skill = battle.itemSkill(it, child);
        if (battle.hasActiveField(skill)) return { ok: true, mainCost: 0, auxCost: 0, reason: '已生效 · 点击撤销' };
        if (!child && it.children?.some(c => battle.hasActiveField(battle.itemSkill(it, c)))) return { ok: true };
        return battle.canUseItem(it, child);
      },
      onItem: (idx, childIdx) => handleItemEntry(idx, childIdx),
      onSkill: (idx) => handleCommand('sk:' + idx),
      onAttack: () => handleCommand('attack'),
      onEnd: () => handleCommand('end'),
      onAction: handleFieldAction,
      onCancel: () => { if (pending) cancelStep(); cancelStep(); },
    });
    updateThreat();
  }
  // 跳距由规则给出（契约：ceil(基础移动÷3)，不扣移动额度、每次自然行动一次）
  function jumpReach(u, r) { return r ? r.jumpDistance : 0; }
  // 基础行动格数据：资格只读规则已有的资源与状态；最终判定仍以 battle.* 返回为准
  function basicActions(u, r, carrying) {
    const atkReason = skillReason(BASIC_ATTACK);
    const reach = jumpReach(u, r), canPayAux = actionBalance(r, 'aux') >= 1, canJump = r.freeJumpAvailable || canPayAux;
    const canPayMain = actionBalance(r, 'main') >= 1;
    const downAlly = currentViewData.units.some(x => x.side === 'hero' && x.id !== u.id && x.ref.hp <= 0 && !Object.values(battle.snapshot().carrying).includes(x.id));
    const carried = carrying ? unitById(carrying) : null;
    const ready = battle.previewReady();
    return [
      { key: 'attack', icon: '⚔️', name: '普通攻击', cost: { main: 1 }, mode: 'target', tone: 'rose', ok: !atkReason, reason: atkReason, short: atkReason && shortLabel(atkReason) },
      { key: 'defend', icon: '🛡️', name: '防御姿态', cost: { main: 1 }, mode: 'instant', tone: 'emerald',
        ok: typeof battle.defend === 'function' && canPayMain,
        reason: typeof battle.defend !== 'function' ? '防御姿态：规则接口待对齐' : '主行动已用完',
        short: typeof battle.defend !== 'function' ? '⏳ 待规则接入' : '◆ 主行动已用完', desc: '恢复 MP／TP 并进入防御姿态，持续 100 虚拟时间' },
      { key: 'sprint', icon: '💨', name: '冲刺', cost: { main: 1 }, mode: 'instant', tone: 'sky', note: '+' + battle.getEffectiveUnit(u.id).effectiveMoveDistance + 'm', ok: canPayMain, reason: '主行动已用完', short: '◆ 主行动已用完', desc: '消耗主行动，立即追加一份移动额度' },
      { key: 'jump', icon: '🦘', name: '跳跃', cost: r.freeJumpAvailable ? null : { aux: 1 }, mode: 'target', tone: 'violet', note: (r.freeJumpAvailable ? '免费 · ' : '') + '≤' + reach + 'm', ok: canJump && r.jumpsRemaining > 0 && reach >= 1,
        reason: !canJump ? '行动点不足' : r.jumpsRemaining < 1 ? '本次自然行动已经跳跃' : '无法起跳', short: !canJump ? '◇ 行动点已用完' : r.jumpsRemaining < 1 ? '🦘 本次已跳跃' : '无法起跳', desc: '沿八方向直线跳跃，越过低矮障碍；不扣移动额度；风行者首跳免费，可再付费跳一次' },
      { key: 'push', icon: '✋', name: '推动', cost: { aux: 1 }, mode: 'target', tone: 'amber', ok: canPayAux, reason: '行动点不足', short: '◇ 行动点已用完', desc: '与相邻单位力量对抗，推开数米；撞墙造成伤害' },
      carried
        ? { key: 'drop', icon: '⬇️', name: '放下', cost: null, mode: 'instant', tone: 'emerald', note: carried.name, ok: true, desc: '把背负的友方放到身边空格' }
        : { key: 'carry', icon: '⛑️', name: '背起', cost: { main: 1 }, mode: 'target', tone: 'emerald', ok: canPayMain && downAlly,
          reason: !canPayMain ? '主行动不足' : '没有可背起的倒地友方', short: !canPayMain ? '◆ 主行动已用完' : '无倒地友方', desc: '背起相邻倒地友方，背负中移动消耗加倍' },
      { key: 'ready', icon: '🧹', name: '整备', cost: { main: 1 }, mode: 'instant', tone: 'emerald',
        ok: ready.ok, reason: ready.reason, short: shortLabel(ready.reason), desc: '随机祛除自身一项可驱散的负面状态' },
    ];
  }
  function shortLabel(reason) { return /主行动/.test(reason) ? '◆ 主行动已用完' : reason; }
  function syncDynamicUnits(snap) {
    if (!currentViewData || !snap || !Array.isArray(snap.units)) return;
    const existing = new Map(currentViewData.units.map(u => [u.id, u]));
    for (const su of snap.units) {
      if (unitStyles[su.id]) continue;
      const full = battle.ctx.units.find(x => x.id === su.id);
      if (!full) continue;
      const styled = resolveUnitStyles([full])[full.id];
      unitStyles[full.id] = styled;
      const avatarUrl = full.avatarUrl || resolveAvatarUrl(full, heroAvatarUrl);
      const emoji = full.emoji || splitEmojiName(full.portraitName || full.name).emoji || (full.isSummon && !avatarUrl ? '🔮' : null);
      const present = existing.get(full.id);
      const viewUnit = Object.assign(present || {}, full, {
        avatarUrl, emoji, color: styled.color,
        bars: { hp: full.ref.hp, maxHp: full.ref.maxHp, mp: full.ref.mp, maxMp: full.ref.maxMp },
        effective: battle.getEffectiveUnit(full.id),
      });
      if (!present) currentViewData.units.push(viewUnit);
      currentViewData.footprintsById[full.id] = full.footprint || { width: 1, height: 1 };
      const pos = snap.positions?.[full.id] || battle.ctx.placementsById[full.id];
      if (pos) currentViewData.placementsById[full.id] = { col: pos.col, row: pos.row, facing: pos.facing || 0 };
      shown.set(full.id, { hp: full.ref.hp, mp: full.ref.mp, tp: full.ref.tp || 0, shield: full.ref.shield || 0 });
    }
  }
  const PASSIVE_CARD_COLOR = { taunt: '#f87171', stealth: '#a5b4fc', haste: '#22d3ee' };
  const naturalTurnAudio = new Set();
  let focusFxRun = null, lastFocusFxSeq = 0;
  let intentSeen = new Set();
  function syncTacticalWarnings(snap) {
    if (focusFxRun !== snap.runId) { focusFxRun = snap.runId; lastFocusFxSeq = 0; intentSeen = new Set(); }
    // 敌方充能已满：先在本体播蓄力前摇（红光震颤 + 聚气 + 低鸣），危险区随后由叠加层淡入，不凭空出现
    const intents = snap.units.flatMap(u => u.charge?.intent ? [{ ...u.charge.intent, unitId: u.id }] : []);
    for (const it of intents) if (!intentSeen.has(it.unitId)) playChargeWindup(it.unitId);
    intentSeen = new Set(intents.map(it => it.unitId));
    sandbox.setPersistentIntents(intents);
    for (const ev of snap.events) {
      if (ev.type !== 'focus-issued' || ev.seq <= lastFocusFxSeq) continue;
      lastFocusFxSeq = ev.seq;
      if (snap.terminal || !ev.receiverIds.some(id => snap.focusOrders[id]?.issuerId === ev.issuerId && snap.focusOrders[id]?.targetId === ev.targetId)) continue;
      const dx = ev.to.x - ev.from.x, dy = ev.to.y - ev.from.y;
      fxNode('t-focus-order-line', ev.from.x, ev.from.y, 900, {
        width: (Math.hypot(dx, dy) * 50) + 'px', transform: 'rotate(' + Math.atan2(dy, dx) + 'rad)',
      });
    }
  }
  // 地形破坏：本次动作改动了底图时先保留旧底图，导演在碎裂拍点（或动作收尾）才换上新底图
  let sceneHeld = false;
  function holdScene() { sceneHeld = currentViewData.scene !== battle.ctx.scene; }
  function releaseScene() {
    if (!sceneHeld) return;
    sceneHeld = false;
    syncScene();
    sandbox.update(currentViewData);
  }
  function syncScene() {
    if (currentViewData.scene !== battle.ctx.scene) {
      const nextScene = battle.ctx.scene;
      const remaining = new Map(nextScene.objects.map(obj => [obj.id, obj]));
      const savedObjects = currentState.scenes[currentViewData.sceneId].objects;
      for (const obj of currentViewData.scene.objects) {
        const next = remaining.get(obj.id);
        if (!next) savedObjects[obj.id] = null;
        else if (next.cells !== obj.cells) savedObjects[obj.id] = { ...savedObjects[obj.id], cells: next.cells };
      }
      currentViewData = { ...currentViewData, scene: nextScene };
    }
  }
  function refreshBattle({ deferPassive = false } = {}) {
    const snap = battle.snapshot();
    syncDynamicUnits(snap);
    for (const u of currentViewData.units) {
      const s = shownOf(u);
      u.effective = battle.getEffectiveUnit(u.id);
      u.bars = { ...u.bars, hp: s.hp, mp: s.mp, tp: s.tp, shield: s.shield };
    }
    if (!sceneHeld) syncScene();
    sandbox.update(currentViewData);
    threatCache.clear();
    director.ageMarks(snap.now);
    const view = sandbox.getUnitView();
    const targets = new Set(Object.values(snap.focusOrders).map(order => order.targetId));
    for (const u of currentViewData.units) {
      view.setFlag(u.id, 't-unit-focus-target', targets.has(u.id));
      view.setFlag(u.id, 't-unit-alert-pending', !!snap.focusOrders[u.id]);
      view.setFlag(u.id, 't-unit-down', shownOf(u).hp <= 0);
      view.setFlag(u.id, 't-unit-lowhp', u.side === 'hero' && lowHp(u));
      if (u.side !== 'hero') view.setBadge(u.id, enemyBadge(u));
      view.setFlag(u.id, 't-unit-current', u.id === snap.currentId && !snap.terminal);
      view.setFlag(u.id, 't-unit-channel', !!battle.battleState.combatState.charges?.[u.id]?.preparing);
      const ch = snap.units.find(x => x.id === u.id)?.charge;
      view.setCharge(u.id, shownOf(u).hp > 0 ? ch : null);
      view.setFlag(u.id, 't-unit-charge-full', !!(ch && ch.current >= ch.max && shownOf(u).hp > 0));
      // 灵风术等赋予的飞行状态：头像两侧常驻白色羽翼，飞行到期即收起（天生飞行不显示）
      view.setFlag(u.id, 't-unit-winged', shownOf(u).hp > 0 && (u.effective?.buffs || []).some(b => b.variant === '飞行' || b.type === '飞行' || b.type === 'flying'));
      if (unitStyles[u.id]) view.setFlag(u.id, unitStyles[u.id].cls, true);
    }
    for (const ev of snap.events) if (ev.type === 'main-point-received') {
      const playback = avHost.playMainPointReceived(ev, snap.actionSerial);
      if (playback && ev.natural) naturalTurnAudio.add(ev.unitId);
      if (playback === 'enemy') ui('enemyTurn');
    }
    syncTacticalWarnings(snap);
    if (snap.terminal) bgm.syncBattle({ terminal: snap.terminal });
    avHost.consumeVisualEvents(snap.events.filter(ev => !ev.attackId));
    avHost.syncVisualState();
    director.syncRegions(snap.regions || []);
    director.syncBarriers(snap.barriers || []);
    director.syncPreparations(battle.battleState.combatState.charges || {});
    syncCarried(snap);
    shell.renderHeroes(currentViewData.units, currentViewData.heroCardIds);
    director.playFieldFeedback(snap.events.filter(ev => !ev.attackId && (!deferPassive || ev.type !== 'passive-gain')));
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
    renderStatus();
    currentState.scenes[currentViewData.sceneId].positions = structuredClone(currentViewData.placementsById);
    saveTacticsState(currentState);
  }

  // ---------- 预览：自由模式显示可达范围；悬停路径/攻击 ----------
  function movementOverlay(hover = null, invalid = null, sprintReach = undefined) {
    const unitId = currentUnit().id, walk = battle.reachable().cells;
    if (walk.length > 1) return { kind: 'move', unitId, cells: walk, hover, invalid };
    const cells = (sprintReach === undefined ? battle.sprintReachable() : sprintReach)?.cells;
    return cells?.length > 1 ? { kind: 'move', unitId, cells, hover, invalid, sprint: true } : null;
  }
  function idleOverlay() {
    if (!isHeroTurn() || busy) { sandbox.setPreview(null); return; }
    if (aim) { sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill: aim.skill, query: null }); return; }
    sandbox.setPreview(movementOverlay());
  }
  // ---------- 敌方威胁区：悬停敌人 = 单个；T 键 = 全体合集；只画我方看得见的敌人；状态变化后重算 ----------
  const threatCache = new Map();
  let threatAll = false, threatHoverId = null;
  function threatFor(id) {
    let t = threatCache.get(id);
    if (!t) {
      const eff = battle.getEffectiveUnit(id);
      t = threatOf(battle.ctx, id, { moveDistance: eff.effectiveMoveDistance, jumpDistance: eff.jumpDistance || 0, skills: battle.threatSkills(id) });
      threatCache.set(id, t);
    }
    return t;
  }
  function threatEnemies() {
    const units = battle.ctx.units, heroes = units.filter(u => u.side === 'hero' && u.ref.hp > 0);
    return units.filter(u => u.side !== 'hero' && u.ref.hp > 0 && battle.ctx.placementsById[u.id] && heroes.some(h => canSeeUnit(battle.ctx, h.id, u.id)));
  }
  function updateThreat() {
    if (!battle || !currentViewData || busy || !isHeroTurn()) { sandbox.setThreat(null); return; }
    const visible = threatEnemies();
    if (threatAll) { sandbox.setThreat({ heat: threatHeat(visible.map(u => threatFor(u.id))) }); return; }
    const suppressHover = !!(aim || pending || fieldAction || retargetPrompt || teleportPrompt);
    const u = !suppressHover && threatHoverId && visible.find(v => v.id === threatHoverId);
    sandbox.setThreat(u ? threatFor(u.id) : null);
  }
  function threatCount(cell) {
    const id = battle.snapshot().currentId, fp = battle.ctx.footprintsById[id] || { width: 1, height: 1 };
    const keys = occupiedCells(cell, fp).map(c => cellKey(c.col, c.row));
    return threatEnemies().filter(u => { const t = threatFor(u.id); return keys.some(k => t.attackKeys.has(k)); }).length;
  }
  // ---------- 残血预警（HP≤30%）：地图外环慢闪；本人行动开始或被敌方锁定时心跳 + 边缘泛红（每次行动一次） ----------
  const lowHpAlarms = new Set();
  function lowHp(u) { const s = shownOf(u), max = u.ref.maxHp || 0; return s.hp > 0 && max > 0 && s.hp / max <= 0.3; }
  function lowHpAlarm(key) {
    if (lowHpAlarms.has(key)) return;
    lowHpAlarms.add(key);
    ui('heartbeat');
    const dom = sandbox.getDom(), s = sandbox.getScope();
    if (!dom || !s || !s.isLive) return;
    const d = document.createElement('div');
    d.className = 't-lowhp-vignette';
    dom.viewport.appendChild(d); s.addNode(d);
    s.animate(d.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0.7, offset: 0.45 }, { opacity: 0.95, offset: 0.6 }, { opacity: 0 }], { duration: 1200, easing: 'ease-out' }));
    s.after(1200, () => s.removeNode(d));
  }
  // ---------- 敌方徽章（C2）：分级外框 / 主元素底色（特性只在检视面板列出，不压在奖章上） ----------
  function enemyBadge(u) {
    const tier = u.level === '首领' ? 'boss' : u.level === '精英' ? 'elite' : u.level === '杂兵' ? 'fodder'
      : ({ legend: 'boss', elite: 'elite' }[unitStyles[u.id]?.tier] || 'fodder');
    const el = unitElement(u);
    return { tier, color: el ? ELEMENT_COLORS[el] : null };
  }
  function moveEval(hit) {
    const id = battle.snapshot().currentId;
    const r = battle.snapshot().resources;
    const cell = battle.previewMove(hit.col, hit.row);
    if (cell && cell.cost > 0) {
      const n = threatCount(cell);
      return { ok: true, cell, html: '移动 <b>' + cell.cost.toFixed(1) + 'm</b> · 余 ' + (r.moveRemaining - cell.cost).toFixed(1) + 'm' + (cell.opportunityIds?.length ? '<br><b class="t-kill">⚠ 将触发 ' + cell.opportunityIds.length + ' 次借机攻击</b>' : '')
        + (n ? '<br><b class="t-kill">⚠ 进入 ' + n + ' 名敌人射程</b>' : '') };
    }
    const p = currentViewData.placementsById[id];
    if (p.col === hit.col && p.row === hit.row) return { ok: false, quiet: true };
    const full = fullReach && fullReach.byKey.get(hit.col + ',' + hit.row);
    if (full) {
      // 冲刺后可达：再点同格 = 消耗主行动冲刺并移动。
      const sprintReach = battle.sprintReachable();
      const key = hit.col + ',' + hit.row, cell = sprintReach?.byKey.get(key);
      if (cell) {
        const armed = sprintArm === key;
        return { ok: false, sprint: true, key, armed, cell, sprintReach,
          html: '💨 冲刺后可达（需 ' + cell.cost.toFixed(1) + 'm · 余 ' + r.moveRemaining.toFixed(1) + 'm +冲刺 ' + sprintReach.added + 'm）<br>' + (armed ? '<b>再点一次</b>：消耗 ' + (sprintReach.payment.mainCost ? '◆主行动' : '✦万能行动') + ' 冲刺并移动' : '点击：准备冲刺移动') };
      }
      const need = full.cost * (battle.ctx.carrying[id] ? 2 : 1) / r.moveMultiplier;
      if (r.moveRemaining < 1) return { ok: false, sprintReach, reason: '移动额度已用完' + (!sprintReach ? '（没有可用行动点冲刺）' : '（冲刺后仍不可达）') };
      return { ok: false, sprintReach, reason: '超出移动额度（需 ' + need.toFixed(1) + 'm，余 ' + r.moveRemaining.toFixed(1) + 'm）' };
    }
    if (r.moveRemaining <= 0.999) return { ok: false, reason: '移动额度已用完' };
    if (hit.targetId) return { ok: false, quiet: true };
    return { ok: false, reason: '无法到达' };
  }
  function aimFor(skill, hit) {
    if (skill.range.type === '单体' || skill.range.type === '自身') {
      if (!hit.targetId) return null;
      const c = sandbox.unitWorldCenter(hit.targetId);
      return { x: c.x, y: c.y, targetId: hit.targetId };
    }
    return { x: hit.x, y: hit.y, targetId: hit.targetId };
  }
  function attackPreview(action, hit, locked, allowApproach = false) {
    shell.previewMoveCost(null); shell.previewPips(0, 0);
    const { currentId: id, resources } = battle.snapshot();
    const skill = action.skill;
    const a = aimFor(skill, hit);
    if (!a) {
      sandbox.setPreview({ kind: 'attack', casterId: id, skill, query: null });
      sandbox.setHint({ x: hit.x, y: hit.y }, '指向敌人', 'bad');
      return { ok: false, reason: '指向敌人' };
    }
    const q = battle.previewAttack(skill, a);
    const approach = allowApproach && !action.item && a.targetId
      && !q.slotTargets?.some(slot => q.ok && slot.attack && slot.targetIds.includes(a.targetId))
      ? battle.previewApproach(skill, a) : null;
    if (approach) {
      const { cost, opportunityIds } = approach.cell;
      sandbox.setPreview({ kind: 'attack', casterId: id, skill, query: approach.query, approach });
      sandbox.setHint({ x: a.x, y: a.y }, '<b>' + esc(skill.name) + '</b> · 移动 <b>' + cost.toFixed(1) + 'm</b> · 余 '
        + Math.max(0, resources.moveRemaining - cost).toFixed(1) + 'm<br><b>点击走过去攻击</b>'
        + (opportunityIds.length ? ' · <b class="t-kill">⚠ 可能触发借机攻击</b>' : ''));
      return { ok: false, aim: a, approach };
    }
    sandbox.setPreview({ kind: 'attack', casterId: id, skill, query: q, locked });
    let html;
    const segs = q.ok ? (q.slotTargets || []).filter(s => s.attack).length : 0;
    const prediction = q.ok ? battle.predictAttack(skill, a) : null;
    const ammo = (prediction?.ammoPlan || []).map(p => ' · <small>' + esc(p.item) + ' 消耗 ' + p.totalCost + '</small>').join('');
    if (q.ok && !segs && isSelfCast(skill)) {
      html = '<b>' + skill.name + '</b> · 作用于自身' + (locked ? ' · <b>再点发动</b>' : '');
    } else if (q.ok && q.disclosureTargetIds.length) {
      const pred = prediction;
      const per = predictTargets(skill, pred, q.disclosureTargetIds);
      const t0 = per[0];
      const fx = (pred?.effects || []).filter(e => !e.attack).map(e => esc(e.tag.replace(/\[|\]/g, '')) + (e.power ? ' ' + e.power : '')).join(' / ');
      const summary = t0 && t0.dmg > 0
        ? '命中 <b>' + Math.round(t0.p * 100) + '%</b> · 预计 <b>-' + t0.dmg + '</b>' + (t0.kill ? ' · <b class="t-kill">☠ 可击杀</b>' : '') + (fx ? ' · ' + fx : '')
        : fx;
      const mechanics = (t0?.backstab ? ' · <b>背袭</b>' : '') + (t0?.lowCover ? ' · <b>低墙掩护</b>' : '');
      html = '<b>' + skill.name + '</b> · ' + (q.disclosureTargetIds.length > 1 ? q.disclosureTargetIds.length + ' 名目标 · ' : '') + summary + mechanics + (segs > 1 ? ' · ' + segs + ' 段' : '') + ammo + (locked ? ' · <b>再点发动</b>' : '');
    } else html = q.ok ? '<b>' + skill.name + '</b> · 范围内无敌人' + (locked ? ' · <b>再点发动</b>' : '') : q.reason;
    sandbox.setHint({ x: a.x, y: a.y }, html, q.ok ? (locked ? 'lock' : null) : 'bad');
    return { ok: q.ok, aim: a, query: q, reason: q.reason };
  }
  // 每个目标：攻击槽预计伤害合计（规则零掷骰中值）、首槽命中概率（必中=100%）、显示态 HP 是否会被打空
  function predictTargets(skill, pred, ids) {
    const view = sandbox.getUnitView(), rows = pred?.damagePreview || [];
    return ids.map(id => {
      const u = unitById(id), mine = rows.filter(r => r.targetId === id);
      if (!u || !mine.length) return null;
      const dmg = mine.reduce((n, r) => n + r.estimatedHpDmg, 0), hp = shownOf(u).hp, max = u.ref.maxHp || 1;
      const p = skill.guaranteedHit ? 1 : hitChance(mine[0].attackCap, mine[0].dodgeCap), kill = dmg >= hp && hp > 0;
      const backstab = mine.some(r => r.backstab);
      if (view) view.setPredict(id, { from: hp / max, to: Math.max(0, hp - dmg) / max, kill, backstab, tag: (kill ? '☠ ' : '') + (backstab ? '🗡背袭 ' : '') + Math.round(p * 100) + '%' + (mine.length > 1 ? ' ×' + mine.length : '') });
      return { id, dmg, p, kill, backstab, lowCover: mine.some(r => r.lowCover) };
    }).filter(Boolean);
  }
  function hitKey(skill, hit) { return (skill.range.type === '单体' || skill.range.type === '自身') ? (hit.targetId ? 'u:' + hit.targetId : null) : hit.col + ',' + hit.row; }
  const isEnemyHit = hit => hit && hit.targetId && unitById(hit.targetId) && unitById(hit.targetId).side !== 'hero';

  let retargetPrompt = null;
  let teleportPrompt = null;
  function cancelRetargetPrompt() {
    if (retargetPrompt) retargetPrompt.finish(null);
    if (teleportPrompt) teleportPrompt.finish(null);
  }
  function beginTeleportPrompt(req) {
    if (teleportPrompt) teleportPrompt.finish(null);
    return new Promise(resolve => {
      const cells = req.cells || [];
      const finish = choice => {
        if (!teleportPrompt) return;
        teleportPrompt = null;
        sandbox.setPreview(null); sandbox.setHint(null);
        updateThreat();
        resolve(choice);
      };
      teleportPrompt = { req, cells, finish };
      updateThreat();
      // 折影步反应：闪现可达范围（半径圈 + 可落格）常驻到落点确认
      sandbox.setPreview({ kind: 'blink', unitId: req.unitId, cells, radius: req.distance || 2 });
      sandbox.refreshHover();
    });
  }
  function beginRetargetPrompt(req) {
    if (retargetPrompt) retargetPrompt.finish(null);
    return new Promise(resolve => {
      const bar = rootEl.ownerDocument.createElement('div');
      bar.style.cssText = 'position:fixed;left:50%;bottom:112px;transform:translateX(-50%);z-index:960;display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:10px;background:rgba(15,23,42,0.92);border:1px solid rgba(251,146,60,0.75);color:#fef3c7;font:600 12px/1.4 system-ui;box-shadow:0 8px 24px rgba(0,0,0,0.45);';
      bar.innerHTML = '<span>🔥 <b>' + esc(req.skill.name) + '</b> 第 ' + req.shotIndex + ' 段转火：请在地图选择新目标/方向</span>' +
        '<button type="button" style="padding:4px 10px;border-radius:6px;background:#ea580c;color:#fff;border:0;cursor:pointer;font-weight:700;">' + (req.skipPrevious ? '跳过本段' : '沿用首段') + ' (Enter)</button>';
      const finish = (choice) => {
        if (!retargetPrompt) return;
        retargetPrompt = null;
        bar.remove();
        sandbox.setPreview(null); sandbox.setHint(null);
        updateThreat();
        resolve(choice);
      };
      bar.querySelector('button').addEventListener('click', () => finish(null));
      rootEl.ownerDocument.body.appendChild(bar);
      retargetPrompt = { req, finish };
      updateThreat();
      sandbox.setPreview({ kind: 'attack', casterId: req.casterId, skill: req.skill, query: null });
    });
  }
  sandbox.onHover(hit => {
    const hov = hit && hit.targetId || null;
    if (hov !== inspectHover) { inspectHover = hov; renderInspector(); }
    const threatId = hov && unitById(hov)?.side !== 'hero' ? hov : null;
    if (threatId !== threatHoverId) { threatHoverId = threatId; updateThreat(); }
    if (!pending) sandbox.getUnitView()?.clearPredict();
    if (retargetPrompt) {
      if (!hit) { sandbox.setHint(null); return; }
      const r = retargetPrompt.req;
      const a = aimFor(r.skill, hit);
      if (a) {
        const q = battle.previewRetarget(r.skill, a, r.casterId, r.slotIndex);
        sandbox.setPreview({ kind: 'attack', casterId: r.casterId, skill: r.skill, query: q, locked: false });
        sandbox.setHint({ x: a.x, y: a.y }, q.ok ? '第 ' + r.shotIndex + ' 段转火 · 点击确认' : q.reason, q.ok ? null : 'bad');
      } else {
        sandbox.setHint({ x: hit.x, y: hit.y }, '指向新目标', 'bad');
      }
      return;
    }
    if (teleportPrompt) {
      if (!hit) { sandbox.setHint(null); return; }
      const pos = teleportPrompt.req.unitId && currentViewData.placementsById[teleportPrompt.req.unitId];
      const staying = pos && pos.col === hit.col && pos.row === hit.row;
      const cell = teleportPrompt.cells.find(c => c.col === hit.col && c.row === hit.row);
      sandbox.setPreview({ kind: 'blink', unitId: teleportPrompt.req.unitId, cells: teleportPrompt.cells, radius: teleportPrompt.req.distance || 2,
        hover: cell || null, invalid: cell || staying ? null : { col: hit.col, row: hit.row } });
      sandbox.setHint({ x: hit.col + 0.5, y: hit.row + 0.5 }, staying ? '点此留在原地 · 按取消也可留原地' : cell ? '折影步 · 点击确认' : '不可闪现至此格 · 按取消留在原地', staying || cell ? null : 'bad');
      return;
    }
    if (!battle || busy || !isHeroTurn()) { sandbox.setHint(null); shell.previewMoveCost(null); return; }
    if (pending) return;
    if (!hit) { sandbox.setHint(null); shell.previewMoveCost(null); if (fieldAction === 'jump') sandbox.setPreview({ kind: 'jump', unitId: battle.snapshot().currentId, cells: jumpCells() }); else idleOverlay(); return; }
    if (fieldAction === 'jump') {
      const q = battle.previewJump(hit.col, hit.row);
      const ok = q.ok;
      const armed = jumpArm === hit.col + ',' + hit.row;
      const hint = ok ? '🦘 跳跃 <b>' + q.distance.toFixed(1) + 'm</b> · 不扣移动额度 · ' + (armed ? '<b>再右键 / 左键起跳</b>' : '左键或右键两次起跳') : q.reason;
      sandbox.setPreview({ kind: 'jump', unitId: battle.snapshot().currentId, cells: jumpCells(), hover: ok ? { col: hit.col, row: hit.row, cost: q.distance } : null, invalid: ok ? null : { col: hit.col, row: hit.row } });
      sandbox.setHint({ x: hit.x, y: hit.y }, hint, ok ? (armed ? 'lock' : null) : 'bad');
      shell.previewMoveCost(null);
      return;
    }
    if (fieldAction === 'push' || fieldAction === 'carry') {
      const target = hit.targetId ? unitById(hit.targetId) : null;
      const res = battle.snapshot().resources;
      const valid = !!target && (fieldAction === 'push' ? target.ref.hp > 0 && target.id !== battle.snapshot().currentId : target.ref.hp <= 0 && target.side === 'hero');
      sandbox.setHint({ x: hit.x, y: hit.y }, valid ? (fieldAction === 'push' ? '推动 ' : '背起 ') + escapeText(target.name) + ' · 点选确认' : (fieldAction === 'push' ? '选择相邻单位' : '选择倒地友方'), valid ? null : 'bad');
      return;
    }
    if (aim && !aim.item && !aim.skill.isReaction && aim.skill.displacements?.some(d => d.type === '闪现')) {
      const q = battle.previewAttack(aim.skill, { x: hit.col + 0.5, y: hit.row + 0.5 });
      const cells = battle.teleportCells();
      const legal = cells.some(c => c.col === hit.col && c.row === hit.row) && q.ok && q.teleport;
      sandbox.setPreview({ kind: 'blink', unitId: battle.snapshot().currentId, cells, radius: blinkRadius(aim.skill),
        hover: legal ? { col: hit.col, row: hit.row } : null,
        invalid: legal ? null : { col: hit.col, row: hit.row } });
      sandbox.setHint({ x: hit.col + 0.5, y: hit.row + 0.5 }, legal ? '折影步 · ' + q.teleport.distance.toFixed(1) + 'm · 点击确认' : q.reason || '不可闪现至此格', legal ? null : 'bad');
      return;
    }
    if (aim) { attackPreview(aim, hit, false, true); return; }
    if (isEnemyHit(hit)) {
      const act = resolveEnemyQuickAction(hit);
      if (act && act.ok) { attackPreview(act, hit, false); return; }
      const msg = act && act.skill ? '【' + esc(act.skill.name) + '】' + esc(act.reason) : esc((act && act.reason) || '主行动已用完');
      sandbox.setPreview(null);
      sandbox.setHint({ x: hit.x, y: hit.y }, msg, 'bad'); return;
    }
    const ev = moveEval(hit);
    if (ev.sprint) {
      sandbox.setPreview(movementOverlay(ev.cell, null, ev.sprintReach));
      sandbox.setHint({ x: hit.col + 0.5, y: hit.row + 0.5 }, ev.html, ev.armed ? 'lock' : null);
      const { mainCost, universalCost } = ev.sprintReach.payment;
      shell.previewMoveCost(null); shell.previewPips(mainCost, 0, universalCost);
      return;
    }
    shell.previewPips(0, 0);
    sandbox.setPreview(movementOverlay(ev.ok ? ev.cell : null, ev.ok || ev.quiet ? null : { col: hit.col, row: hit.row }, ev.sprintReach));
    sandbox.setHint(ev.ok || !ev.quiet ? { x: hit.col + 0.5, y: hit.row + 0.5 } : null, ev.ok ? ev.html : ev.reason, ev.ok ? null : 'bad');
    shell.previewMoveCost(ev.ok ? ev.cell.cost : null);
  });

  sandbox.onMapClick((hit, clickCount) => {
    if (teleportPrompt) {
      const cell = hit && teleportPrompt.cells.find(c => c.col === hit.col && c.row === hit.row);
      const pos = teleportPrompt.req.unitId && currentViewData.placementsById[teleportPrompt.req.unitId];
      if (pos && hit && pos.col === hit.col && pos.row === hit.row) { teleportPrompt.finish(null); return true; }
      if (!cell) { ui('deny'); return true; }
      teleportPrompt.finish({ col: cell.col, row: cell.row });
      return true;
    }
    if (retargetPrompt) {
      const r = retargetPrompt.req;
      const a = aimFor(r.skill, hit);
      if (!a) { ui('deny'); return true; }
      const q = battle.previewRetarget(r.skill, a, r.casterId, r.slotIndex);
      if (!q.ok) { ui('deny'); shell.showLog(q.reason, 'warn'); return true; }
      ui('lock');
      retargetPrompt.finish(a);
      return true;
    }
    if (!battle || !isHeroTurn()) return false;
    if (busy) { ui('deny'); return true; }
    if (fieldAction) return handleFieldTarget(hit);
    if (aim && !aim.item && !aim.skill.isReaction && aim.skill.displacements?.some(d => d.type === '闪现')) {
      const cells = battle.teleportCells();
      if (!cells.some(c => c.col === hit.col && c.row === hit.row)) { ui('deny'); return true; }
      const q = battle.previewAttack(aim.skill, { x: hit.col + 0.5, y: hit.row + 0.5 });
      if (!q.ok || !q.teleport) { ui('deny'); shell.showLog(q.reason || '该格不可闪现', 'warn'); return true; }
      const key = hit.col + ',' + hit.row;
      if (pending?.key === key) { firePending(); return true; }
      pending = { key, aim: { x: hit.col + 0.5, y: hit.row + 0.5 } };
      ui('lock'); renderCommand();
      return true;
    }
    if (aim) {
      const key = hitKey(aim.skill, hit);
      const sameTarget = pending?.aim.targetId && pending.aim.targetId === hit.targetId;
      const reuseTarget = !!(aim.skill.switchTarget && clickCount === 2 && (pending?.key === key || sameTarget));
      if (pending && key && (pending.key === key || reuseTarget)) {
        firePending({ reuseTarget }); return true;
      }
      const ev = attackPreview(aim, hit, true, true);
      if (ev.approach) {
        const action = aim, { col, row } = ev.approach.cell;
        aim = null; pending = null;
        doMove(col, row, false, { action, aim: ev.aim });
        return true;
      }
      if (!ev.ok || !key) { pending = null; ui('deny'); renderCommand(); return true; }
      pending = { key, aim: ev.aim };
      ui('lock'); renderCommand();
      return true;
    }
    if (isEnemyHit(hit)) {
      const act = resolveEnemyQuickAction(hit);
      if (!act || !act.ok) {
        ui('deny');
        const msg = act && act.skill ? '【' + act.skill.name + '】无法释放：' + act.reason : ((act && act.reason) || '主行动已用完');
        shell.showLog(msg, 'warn');
        return true;
      }
      aim = { key: act.key, skill: act.skill };
      const ev = attackPreview(aim, hit, true);
      const key = hitKey(aim.skill, hit);
      if (ev.ok && key) { pending = { key, aim: ev.aim }; ui('lock'); } else { pending = null; ui('deny'); }
      renderCommand();
      return true;
    }
    const ev = moveEval(hit);
    if (ev.ok) { sprintArm = null; doMove(hit.col, hit.row); return true; }
    if (ev.sprint) {
      if (!ev.armed) { sprintArm = ev.key; ui('lock'); sandbox.refreshHover(); return true; }
      sprintArm = null;
      const sp = battle.sprint();
      if (!sp.ok) { ui('deny'); shell.showLog(sp.reason, 'warn'); return true; }
      ui('sprint'); fxAtUnit(battle.snapshot().currentId, 't-sprint-burst', 760);
      shell.showLog('冲刺 · 移动额度 +' + battle.getEffectiveUnit(battle.snapshot().currentId).effectiveMoveDistance + 'm', 'act');
      refreshBattle();
      if (!battle.previewMove(hit.col, hit.row)) { ui('deny'); shell.showLog('冲刺后仍无法到达该格', 'warn'); fullReach = findReachable(battle.ctx, battle.snapshot().currentId, Infinity); idleOverlay(); return true; }
      doMove(hit.col, hit.row); return true;
    }
    sprintArm = null;
    if (!ev.quiet) { ui('deny'); shell.showLog(ev.reason, 'warn'); }
    return ev.quiet ? false : true;
  });

  function cancelStep() {
    if (teleportPrompt) { teleportPrompt.finish(null); ui('cancel'); return; }
    if (!battle || !isHeroTurn()) return;
    sandbox.getUnitView()?.clearPredict(); jumpArm = null;
    if (sprintArm) { sprintArm = null; ui('cancel'); sandbox.refreshHover(); return; }
    if (pending) { pending = null; fieldAction = null; ui('cancel'); sandbox.setHint(null); sandbox.refreshHover(); if (aim) sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill: aim.skill, query: null }); renderCommand(); return; }
    if (fieldAction) { fieldAction = null; ui('cancel'); sandbox.setPreview(null); sandbox.setHint(null); shell.previewMoveCost(null); idleOverlay(); renderCommand(); return; }
    if (aim) { aim = null; ui('cancel'); sandbox.setHint(null); sandbox.refreshHover(); idleOverlay(); renderCommand(); }
  }

  function handleFieldAction(kind) {
    if (!battle || !isHeroTurn() || busy) return;
    if (kind === 'release') { offerPreparedRelease(true); return; }
    if (kind === 'prepare' || kind === 'stationary-prepare' || kind === 'cancel-charge') {
      const canceled = kind === 'cancel-charge';
      const result = canceled ? battle.cancelPreparation() : battle.advancePreparation({ stationary: kind === 'stationary-prepare' });
      if (!result.ok) { ui('deny'); shell.showLog(result.reason, 'warn'); return; }
      ui(canceled ? 'cancel' : 'charge');
      if (!canceled) avHost.sfx(result.ready ? 'herochargedone' : 'herocharge', 0.65, { category: 'K' });
      shell.showLog(battle.snapshot().log.at(-1), 'act');
      if (!canceled) fxAtUnit(battle.snapshot().currentId, 't-charge-pulse', 900);
      afterHeroAction(); return;
    }
    if (kind === 'sprint') {
      const result = battle.sprint();
      if (!result.ok) { ui('deny'); shell.showLog(result.reason, 'warn'); return; }
      ui('sprint'); fxAtUnit(battle.snapshot().currentId, 't-sprint-burst', 760);
      shell.showLog('冲刺 · 移动额度 +' + currentUnit().ref.moveDistance + 'm', 'act');
      refreshBattle(); fullReach = findReachable(battle.ctx, battle.snapshot().currentId, Infinity); idleOverlay(); return;
    }
    if (kind === 'defend') {
      const result = battle.defend();
      if (!result.ok) { ui('deny'); shell.showLog(result.reason, 'warn'); return; }
      avHost.sfx('defUp', 0.62, { category: 'K' }); fxAtUnit(battle.snapshot().currentId, 't-heal-pulse', 700);
      const log = battle.snapshot().log;
      shell.showLog(log[log.length - 1] || '进入防御姿态', 'act');
      refreshBattle(); afterHeroAction(); return;
    }
    if (kind === 'ready') { runReady(); return; }
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
  function dismissOwnField(skill) {
    if (!battle.dismissField(skill)) return false;
    aim = null; pending = null; fieldAction = null;
    shell.closeMenus(); sandbox.setHint(null);
    ui('cancel'); shell.showLog('已撤销【' + skill.name + '】', 'act');
    afterHeroAction();
    return true;
  }
  // 物品入口：菜单卡转发到此；contract v3：battle.beginUseItem(item, aim, options) generator（支持父子道具子技能）
  function handleItemEntry(idx, childIdx = null) {
    if (!battle || !isHeroTurn() || busy) return;
    const u = currentUnit();
    const it = u && (u.items || [])[idx];
    if (!it) return;
    const child = childIdx != null && Array.isArray(it.children) ? it.children[childIdx] : null;
    const skill = battle.itemSkill(it, child);
    if (dismissOwnField(skill)) return;
    const valid = battle.canUseItem(it, child);
    if (!valid.ok) { ui('deny'); shell.showLog(valid.reason, 'warn'); return; }
    if (skill.delay > 0) {
      if (battle.snapshot().preparation?.ready) offerPreparedRelease(true);
      else declarePreparation(skill);
      return;
    }
    pending = null; fieldAction = null;
    aim = { key: 'item:' + idx + (child ? ':' + childIdx : ''), skill, item: it, child };
    sandbox.setHint(null); sandbox.refreshHover();
    sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill, query: null });
    if (isSelfCast(skill)) { fireSelf(); return; }
    ui('select'); renderCommand();
  }
  // 跳跃落点集：八方向逐格询问规则（previewJump 为唯一判定，含跳距上限）
  function jumpCells() {
    const id = battle.snapshot().currentId, p = currentViewData.placementsById[id], r = battle.snapshot().resources;
    const reach = jumpReach(unitById(id), r), out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let k = 1; k * Math.hypot(dx, dy) <= reach + 1e-9; k++) {
        const q = battle.previewJump(p.col + dx * k, p.row + dy * k);
        if (q.ok) out.push({ col: p.col + dx * k, row: p.row + dy * k, cost: q.distance });
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
  function stageJumpTargets(result) {
    const view = sandbox.getUnitView();
    for (const move of result.displacements || []) {
      const from = unitCenter(move.from, currentViewData.footprintsById[move.unitId]);
      view.lockMotion(move.unitId, true);
      view.setDisplayPos(move.unitId, from.x, from.y);
    }
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
    const beforeBgm = bgmFrame();
    const result = kind === 'jump' ? battle.jump(hit.col, hit.row) : kind === 'push' ? battle.push(hit.targetId) : battle.carry(hit.targetId);
    if (!result.ok) { view.lockMotion(lockId, false); view.lockMotion(me, false); ui('deny'); shell.showLog(result.reason, 'warn'); return; }
    fieldAction = null; jumpArm = null;
    sandbox.setPreview(null); sandbox.setHint(null); shell.previewMoveCost(null);
    setBusy(true);
    sandbox.beginAction();
    ui('confirm');
    if (kind === 'jump') stageJumpTargets(result);
    holdScene();
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
    releaseScene();
    settleBgm(beforeBgm);
    afterHeroAction();
  }
  // 整备：规则先祛除负面，演出在该单位处播放（期间锁定输入），结束后交还
  async function runReady() {
    const myFlow = flow;
    const me = battle.snapshot().currentId;
    const result = battle.ready();
    if (!result.ok) { ui('deny'); shell.showLog(result.reason, 'warn'); return; }
    setBusy(true);
    sandbox.beginAction();
    ui('confirm');
    const log = battle.snapshot().log;
    shell.showLog(log[log.length - 1], 'act');
    refreshBattle();
    await director.playReady(me);
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

  function handleCommand(key, stationary = false) {
    if (!battle || !isHeroTurn()) return;
    if (busy) { ui('deny'); return; }
    if (key === 'end') { requestEnd(); return; }
    fieldAction = null;
    const skill = skillOfKey(key);
    if (!skill || skill.isGroup) return;
    if (dismissOwnField(skill)) return;
    if (!skillUsable(skill)) { ui('deny'); shell.showLog(skillReason(skill), 'warn'); return; }
    if (skill.delay > 0) {
      if (battle.snapshot().preparation?.ready) offerPreparedRelease(true);
      else declarePreparation(skill, stationary);
      return;
    }
    pending = null;
    aim = { key, skill };
    sandbox.setHint(null); sandbox.refreshHover();
    if (!skill.isReaction && skill.displacements?.some(d => d.type === '闪现')) {
      sandbox.setPreview({ kind: 'blink', unitId: battle.snapshot().currentId, cells: battle.teleportCells(), radius: blinkRadius(skill) });
      renderCommand(); return;
    }
    sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill: aim.skill, query: null });
    if (isSelfCast(skill)) { fireSelf(); return; }
    renderCommand();
  }
  function requestEnd() {
    const r = battle.snapshot().resources;
    const left = r && (r.main > 0 || r.aux > 0 || r.universal > 0 || r.moveRemaining > 0.999);
    if (left && performance.now() > endArmedUntil) {
      endArmedUntil = performance.now() + 2200;
      const unused = [r.main > 0 && '主行动', r.aux > 0 && '辅助行动', r.universal > 0 && '万能行动', r.moveRemaining > 0.999 && '移动额度'].filter(Boolean);
      ui('select'); shell.showLog('还有' + unused.join('、') + '未用 · 再按一次结束回合', 'warn');
      renderCommand();
      setTimeout(() => { if (performance.now() >= endArmedUntil && battle && isHeroTurn()) renderCommand(); }, 2300);
      return;
    }
    endArmedUntil = 0; aim = null; pending = null; sprintArm = null; jumpArm = null;
    sandbox.getUnitView()?.clearPredict();
    ui('endTurn');
    sandbox.setPreview(null); sandbox.setHint(null);
    setBusy(true);
    endActionWithBgm(); syncShown(); refreshBattle({ deferPassive: true }); beginTurn();
  }

  async function presentMovementRequest(req) {
    if (req.type === 'move-leg') {
      const movement = req.movement;
      const view = sandbox.getUnitView();
      view.lockMotion(movement.unitId, true);
      const first = movement.cell.path[0], fp = currentViewData.footprintsById[movement.unitId];
      const from = unitCenter(first, fp);
      view.setDisplayPos(movement.unitId, from.x, from.y);
      refreshBattle();
      await director.playMove(movement);
      view.lockMotion(movement.unitId, false);
      view.updateUnit(movement.unitId, { placement: currentViewData.placementsById[movement.unitId] });
      return;
    }
    if (req.type === 'opportunity-result') await playAttackResult(req.result);
  }

  async function doMove(col, row, avoidFog = false, followUp = null) {
    const myFlow = flow;
    setBusy(true);
    sandbox.setPreview(null); sandbox.setHint(null);
    sandbox.beginAction();
    const mover = battle.snapshot().currentId;
    sandbox.getUnitView().lockMotion(mover, true);
    const beforeBgm = bgmFrame();
    const gen = battle.beginMove(col, row, avoidFog, { presentOpportunity: true });
    const res = await director.driveAttack(gen);
    if (myFlow !== flow) return;
    if (!res || !res.ok) { sandbox.getUnitView().lockMotion(mover, false); setBusy(false); if (res?.reason) shell.showLog(res.reason, 'warn'); return; }
    if (res.displayMove) await director.playMove(res.displayMove);
    sandbox.getUnitView().lockMotion(mover, false);
    sandbox.getUnitView().updateUnit(mover, { placement: currentViewData.placementsById[mover] });
    if (myFlow !== flow) return;
    settleBgm(beforeBgm);
    if (!battle.snapshot().currentId || battle.snapshot().terminal) {
      if (!battle.snapshot().terminal) endActionWithBgm();
      syncShown(); setBusy(false); refreshBattle({ deferPassive: true }); beginTurn(); return;
    }
    if (battle.snapshot().currentId !== mover) {
      syncShown(); setBusy(false); refreshBattle({ deferPassive: true }); beginTurn(); return;
    }
    if (followUp && !res.stopped) {
      const q = battle.previewAttack(followUp.action.skill, followUp.aim);
      if (q.ok && q.slotTargets.some(slot => slot.attack && slot.targetIds.includes(followUp.aim.targetId))) {
        aim = followUp.action; pending = { aim: followUp.aim };
        return firePending();
      }
      shell.showLog(q.reason || '目标已无法攻击', 'warn');
    }
    afterHeroAction();
  }
  async function declarePreparation(skill, stationary = false) {
    const myFlow = flow;
    const beforeBgm = bgmFrame();
    const result = battle.startPreparation(skill, { stationary });
    if (!result.ok) { ui('deny'); shell.showLog(result.reason, 'warn'); return; }
    aim = null; pending = null; fieldAction = null;
    shell.closeMenus(); sandbox.setPreview(null); sandbox.setHint(null);
    setBusy(true); sandbox.beginAction();
    syncShown(); refreshBattle();
    shell.showLog(battle.snapshot().log.at(-1), 'act');
    if (!result.charge.ready) await director.playPrepare(result);
    if (myFlow === flow) { settleBgm(beforeBgm); afterHeroAction(); }
  }
  function offerPreparedRelease(manual = false) {
    if (!isHeroTurn() || busy) return false;
    const snap = battle.snapshot(), prep = snap.preparation;
    if (!prep?.ready) { offeredPreparation = null; return false; }
    const token = snap.runId + ':' + (prep.id || prep.skillKey);
    if (!manual && offeredPreparation === token) return false;
    offeredPreparation = token;
    fieldAction = null; pending = null;
    aim = { key: 'release', skill: prep.skill };
    shell.closeMenus(); sandbox.setHint(null);
    if (isSelfCast(prep.skill) || ['圆形', '全域'].includes(prep.skill.range.type)) fireSelf();
    else {
      sandbox.setPreview({ kind: 'attack', casterId: snap.currentId, skill: prep.skill, query: null });
      sandbox.refreshHover(); renderCommand();
    }
    return true;
  }
  function fireSelf() {
    const me = battle.snapshot().currentId;
    pending = { aim: { ...sandbox.unitWorldCenter(me), targetId: me } };
    firePending();
  }
  async function firePending({ reuseTarget = false } = {}) {
    const myFlow = flow;
    const casterId = battle.snapshot().currentId;
    const p = pending, act = aim;
    sandbox.getUnitView()?.clearPredict();
    pending = null; aim = null;
    shell.closeMenus();
    sandbox.setPreview(null); sandbox.setHint(null);
    setBusy(true);
    sandbox.beginAction();
    ui('confirm');
    // 玩家攻击统一走 battle.beginAttack generator（反应弹窗在导演驱动内弹出）；同步 attack 不再用于真实 UI
    const beforeBgm = bgmFrame();
    const res = act.item
      ? await director.driveAttack(battle.beginUseItem(act.item, p.aim, { child: act.child, reuseTarget }))
      : await director.runAttackLive(act.skill, p.aim, { reuseTarget });
    if (myFlow !== flow) return;
    if (!res) { setBusy(false); return; }
    if (!res.ok) { setBusy(false); ui('deny'); shell.showLog(res.reason, 'warn'); refreshBattle(); return; }
    if (res.preparing) {
      if (myFlow !== flow) return;
      syncShown();   // 起手已付 HP/MP/TP（规则真值），显示条同步
      refreshBattle();
      await director.playPrepare(res);
      if (myFlow !== flow) return;
      settleBgm(beforeBgm);
      setBusy(false);
      refreshBattle();
      shell.showLog(res.logTo > res.logFrom ? battle.snapshot().log[res.logTo - 1] : act.skill.name + ' 正在准备', 'act');
      sandbox.setPreview({ kind: 'attack', casterId: battle.snapshot().currentId, skill: act.skill, query: null });
      return;
    }
    if (!act.item && act.skill && !(act.skill.charge > 0 || act.skill.delay > 0) && (act.key === 'attack' || skillSlots(act.skill).some(x => x.attack))) {
      lastAttackByUnit.set(casterId, { key: act.key, name: act.skill.name });
    }
    await playAttackResult(res, beforeBgm);
    if (myFlow !== flow) return;
    afterHeroAction();
  }
  function afterHeroAction() {
    sprintArm = null; jumpArm = null;
    syncShown();
    setBusy(false);
    const snap = battle.snapshot();
    if (!snap.currentId || snap.terminal) {
      if (!snap.terminal) endActionWithBgm();
      refreshBattle({ deferPassive: true }); beginTurn(); return;
    }
    refreshBattle();
    fullReach = findReachable(battle.ctx, snap.currentId, Infinity);
    if (offerPreparedRelease()) return;
    sandbox.refreshHover();
    idleOverlay();
    if (!currentViewData.units.some(u => u.side !== 'hero' && u.ref.hp > 0)) shell.showLog('敌方已全灭 · 结束回合以结算', 'win');
  }

  // ---------- 轮次：取得行动 → 横幅/音 → 镜头 → 玩家操作或敌方演出 ----------
  const stunSeen = new Set();
  async function presentStunSkips(myFlow, snap) {
    const skips = (snap?.events || []).filter(ev => ev.type === 'stun-skipped' && !stunSeen.has(ev.eventId));
    for (const ev of skips) {
      stunSeen.add(ev.eventId);
      const u = unitById(ev.unitId), c = u && sandbox.unitWorldCenter(u.id);
      if (!u || !c) continue;
      await sandbox.guideTo([c], { ms: 220 });
      if (myFlow !== flow) return false;
      ui('stunSkip');
      shell.showLog('💫 ' + u.name + ' 处于【眩晕】，跳过本次行动', 'warn', 1400);
      const view = sandbox.getUnitView();
      view?.setFlag(u.id, 't-unit-stun-skip', true);
      director.playStunSkip(u.id);
      if (u.side === 'hero') shell.flashHeroPassive(u.id, '💫 眩晕跳过', '#facc15');
      const ok = await director.wait(500);
      view?.setFlag(u.id, 't-unit-stun-skip', false);
      if (!ok || myFlow !== flow) return false;
    }
    return true;
  }
  async function beginTurn({ intro = false } = {}) {
    const myFlow = flow;
    const snap = battle.snapshot();
    const playTurnGains = () => director.playFieldFeedback(snap.events.filter(ev => !ev.attackId && ev.type === 'passive-gain'));
    const hasStunSkip = (snap.events || []).some(ev => ev.type === 'stun-skipped' && !stunSeen.has(ev.eventId));
    if (intro || hasStunSkip) { setBusy(true); sandbox.beginAction(); }
    if (intro) { await sandbox.introSweep(1600); if (myFlow !== flow) return; }
    if (hasStunSkip && !(await presentStunSkips(myFlow, snap))) { if (myFlow === flow) setBusy(false); return; }
    if (snap.terminal) { playTurnGains(); finishBattle(snap.terminal); return; }
    const u = currentUnit();
    if (!u) { playTurnGains(); if (intro || hasStunSkip) setBusy(false); return; }
    const hasNaturalTurnAudio = naturalTurnAudio.delete(u.id);
    aim = null; pending = null; endArmedUntil = 0;
    setBusy(true);
    sandbox.beginAction();
    const c = sandbox.unitWorldCenter(u.id);
    shell.showBanner(u, u.side === 'hero' ? '我方行动' : '敌方行动');
    if (u.side === 'hero') {
      if (!hasNaturalTurnAudio) avHost.sfx('heroTurn', 1, { category: 'M' });
    } else if (!hasNaturalTurnAudio) ui('enemyTurn');
    if (c) await sandbox.guideTo([c], { ms: 420 });
    if (myFlow !== flow) return;
    // 时钟到账等镜头就位，地图短动效和底栏反馈同时起播。
    playTurnGains();
    if (isPlayerUnit(u)) {
      if (!hasNaturalTurnAudio) avHost.playTurnVoice(u, snap.actionSerial);
      fullReach = findReachable(battle.ctx, u.id, Infinity);
      setBusy(false);
      if (lowHp(u)) lowHpAlarm('turn:' + snap.actionSerial + ':' + u.id);
      renderCommand();
      if (!offerPreparedRelease()) idleOverlay();
      return;
    }
    renderCommand();
    await runEnemyTurn(myFlow);
  }

  async function runEnemyTurn(myFlow) {
    const alive = () => myFlow === flow;
    if (!(await director.wait(380)) || !alive()) return;
    const actorId = battle.snapshot().currentId;
    const progress = () => {
      const snap = battle.snapshot();
      const u = snap.units.find(u => u.id === actorId);
      return JSON.stringify([snap.resources, snap.preparation, u.hp, u.mp, battle.ctx.placementsById[actorId]]);
    };
    for (;;) {
      const plan = battle.planEnemyAction();
      if (!plan || plan.action === 'wait') break;
      if (plan.action === 'sprint') {
        const sp = battle.sprint();
        if (!sp.ok) break;
        ui('sprint'); fxAtUnit(actorId, 't-sprint-burst', 760); refreshBattle();
      }
      if (plan.jumpTo || plan.moveTo) {
        const beforeBgm = bgmFrame();
        sandbox.getUnitView().lockMotion(actorId, true);
        const result = plan.jumpTo ? battle.jump(plan.jumpTo.col, plan.jumpTo.row)
          : await director.driveAttack(battle.beginMove(plan.moveTo.col, plan.moveTo.row, plan.avoidFog, { presentOpportunity: true }));
        if (!result?.ok) { sandbox.getUnitView().lockMotion(actorId, false); break; }
        if (plan.jumpTo) stageJumpTargets(result);
        holdScene();
        refreshBattle();
        if (plan.jumpTo) await director.playJump(result);
        else if (result.displayMove) await director.playMove(result.displayMove);
        releaseScene();
        sandbox.getUnitView().lockMotion(actorId, false);
        sandbox.getUnitView().updateUnit(actorId, { placement: currentViewData.placementsById[actorId] });
        if (!alive()) return;
        settleBgm(beforeBgm);
        if (battle.snapshot().currentId !== actorId || battle.snapshot().terminal) break;
        if (plan.jumpTo || result.stopped || !plan.skill) continue;
      }
      if (plan.action === 'recoverMp') {
        if (!battle.recoverEnemyMp().ok) break;
        syncShown(); refreshBattle();
      } else if (plan.action === 'defend') {
        if (!battle.defend().ok) break;
        avHost.sfx('defUp', 0.55, { category: 'K' }); fxAtUnit(actorId, 't-heal-pulse', 700); refreshBattle();
      } else if (plan.action === 'prepare' && !plan.skill) {
        const pr = battle.advancePreparation();
        if (!pr.ok) break;
        avHost.sfx(pr.ready ? 'herochargedone' : 'herocharge', 0.58, { category: 'K' }); fxAtUnit(actorId, 't-charge-pulse', 900); refreshBattle();
      } else if (plan.skill) {
        if (plan.skill.delay > 0 && !battle.snapshot().preparation) {
          const beforeBgm = bgmFrame();
          const prep = battle.startPreparation(plan.skill);
          if (!prep.ok) break;
          syncShown(); refreshBattle(); await director.playPrepare(prep);
          if (!alive()) return;
          settleBgm(beforeBgm);
          continue;
        }
        const q = battle.previewAttack(plan.skill, plan.aim);
        if (!q.ok) break;
        const lowTarget = (q.damageTargetIds || q.targetIds || []).map(unitById).find(t => t && t.side === 'hero' && lowHp(t));
        if (lowTarget) lowHpAlarm('aim:' + battle.snapshot().actionSerial + ':' + actorId + ':' + lowTarget.id);
        const before = progress();
        sandbox.setPreview({ kind: 'attack', casterId: actorId, skill: plan.skill, query: q, locked: true });
        // 满充能大招：Cut-in → 原技能前摇/演出 → 命中与结果（未满不站桩；普通攻击与[延迟]准备照旧）
        const cur = battle.snapshot().units.find(u => u.id === actorId);
        if (plan.skill.charge > 0 && cur && cur.charge && cur.charge.current >= cur.charge.max) {
          await director.playChargeCutin(cur.id, plan.skill);
          if (!alive()) return;
        }
        await director.playWindup(actorId, plan.skill);
        if (!alive()) return;
        sandbox.setPreview(null);
        // 敌方攻击同走 beginAttack generator：我方受击时反应弹窗在驱动内弹出，选择/放弃都会继续结算
        const beforeBgm = bgmFrame();
        const res = await director.runAttackLive(plan.skill, plan.aim);
        if (!alive()) return;
        if (!res?.ok) break;
        if (res.preparing) { refreshBattle(); await director.playPrepare(res); if (alive()) settleBgm(beforeBgm); }
        else await playAttackResult(res, beforeBgm);
        if (!alive()) return;
        const snap = battle.snapshot();
        if (snap.currentId !== actorId || snap.terminal || progress() === before) break;
      } else break;
    }
    if (!(await director.wait(420)) || !alive()) return;
    endActionWithBgm();
    syncShown();
    refreshBattle({ deferPassive: true });
    beginTurn();
  }

  async function playAttackResult(res, beforeBgm) {
    const myFlow = flow;
    for (let i = res.logFrom; i < res.logTo; i++) hiddenLog.add(i);
    director.holdRegions(res);
    director.holdGuards(res);
    shell.showLog(unitName(res.casterId) + ' · ' + (res.skill || res.item).name, 'act');
    const caster = unitById(res.casterId);
    if (caster) {
      const s = shownOf(caster), gains = { mp: 0, tp: 0 };
      for (const e of res.effects || []) if (e.targetId === caster.id) {
        const delta = supportResourceDelta(e);
        gains.mp += delta.mp || 0; gains.tp += delta.tp || 0;
      }
      shown.set(caster.id, { ...s, mp: caster.ref.mp - gains.mp, tp: (caster.ref.tp || 0) - gains.tp });
    }
    // 反应错位（折影步等）与冲锋/击退位移：规则站位已更新，显示位置锁在原位，等导演在接触拍点演出位移后再放开
    const view = sandbox.getUnitView(), motionIds = new Set();
    function holdMotion(id, from) {
      if (!from || motionIds.has(id)) return;
      motionIds.add(id);
      const c = unitCenter(from, currentViewData.footprintsById[id]);
      view.lockMotion(id, true); view.setDisplayPos(id, c.x, c.y);
    }
    for (const h of res.hits) for (const segment of h.segments || [h]) {
      const reaction = segment.reaction;
      holdMotion(reaction?.responderId || h.targetId, reaction?.shift?.from);
      const guardian = segment.guardianReaction || reaction?.guardianReaction;
      holdMotion(guardian?.responderId || h.targetId, guardian?.shift?.from);
    }
    for (const ev of (res.events || [])) {
      if (ev.type === 'unit-charged' || ev.type === 'unit-displaced') holdMotion(ev.unitId, ev.from);
    }
    if (res.teleport) holdMotion(res.casterId, res.teleport.from);
    holdScene();
    refreshBattle();
    try {
      await director.playAttack(res);
    } finally {
      releaseScene();
      if (myFlow === flow) for (const id of motionIds) {
        view.lockMotion(id, false);
        view.updateUnit(id, { placement: currentViewData.placementsById[id] });
      }
    }
    if (myFlow !== flow) return;
    await director.playExecution(res);   // 技能演出、反应与自爆全部完成后统一收尾一次；胜利弹窗在其后
    if (myFlow !== flow) return;
    if (beforeBgm) settleBgm(beforeBgm);
    for (let i = res.logFrom; i < res.logTo; i++) hiddenLog.delete(i);
    if (!res.hits.length) shell.showLog(battle.snapshot().log[res.logTo - 1] || '', 'miss');
  }
  function unitName(id) { const u = unitById(id); return u ? (u.emoji ? u.emoji + ' ' : '') + u.name : id; }

  // ---------- 非伤害效果揭示：每拍仅推进该条后端增量，不抢后续效果的最终值 ----------
  function revealEffect(e) {
    if (!e) return null;
    const u = unitById(e.targetId);
    if (!u) return null;
    shownEff.set(u.id, battle.getEffectiveUnit(u.id));
    renderStatus(u.id);
    const delta = supportResourceDelta(e);
    if (!Object.keys(delta).length) return null;
    const next = { ...shownOf(u) };
    for (const [key, value] of Object.entries(delta)) next[key] = (next[key] || 0) + value;
    shown.set(u.id, next);
    u.bars = { ...u.bars, ...next };
    sandbox.getUnitView().updateUnit(u.id, { bars: u.bars, syncGhost: true });
    if (u.side === 'hero') shell.setHeroBars(u.id, u.bars, { heal: true });
    return e.value;
  }

  // 反击只揭示当前命中快照，不提前同步后续段的最终资源值。
  function revealCounter(value) {
    const u = unitById(value.targetId);
    const next = { ...shownOf(u), hp: value.hpAfter, shield: value.shieldAfter };
    shown.set(u.id, next);
    u.bars = { ...u.bars, ...next };
    sandbox.getUnitView().updateUnit(u.id, { bars: u.bars, syncGhost: true });
    if (u.side === 'hero') shell.setHeroBars(u.id, u.bars, { hit: true });
    const source = unitById(value.casterId);
    shownEff.set(source.id, battle.getEffectiveUnit(source.id));
    renderStatus(source.id);
    if (value.hpAfter <= 0) playDown(u);
  }

  // ---------- 接触拍点揭示 ----------
  function revealHit(hit, meta) {
    const u = unitById(hit.targetId);
    if (!u) return;
    const prev = shownOf(u);
    const next = { ...prev, hp: hit.hpAfter, mp: hit.heal ? Math.min(u.ref.maxMp || 0, prev.mp + (hit.mpDmg > 0 ? hit.mpDmg : 0)) : prev.mp };
    if (hit.shieldAfter !== undefined) next.shield = hit.shieldAfter;
    shown.set(u.id, next);
    u.bars = { ...u.bars, hp: hit.hpAfter, shield: next.shield };
    const rec = sandbox.getUnitView() && sandbox.getUnitView().nodes.get(u.id);
    if (rec) { rec.bars = u.bars; sandbox.getUnitView().setShield(u.id, next.shield || 0); }
    if (rec) sandbox.getUnitView().setFlag(u.id, 't-unit-lowhp', u.side === 'hero' && lowHp(u));
    if (u.side === 'hero') shell.setHeroBars(u.id, u.bars, hit.heal ? { heal: true } : { hit: hit.hit });
    for (let i = hit.logIndex; i < hit.logEnd; i++) hiddenLog.delete(i);
    shell.setHistory(visibleLog());
    shell.showLog(battle.snapshot().log[hit.logIndex], hit.hit ? 'hit' : hit.heal ? 'heal' : 'dodge');
    // 结算覆盖确认：每个被判定的目标闪一次结果环（命中红 / 击倒白红 / 闪避白虚线）；我方闪避在角色栏再弹一次
    if (!hit.heal) {
      sandbox.getUnitView()?.pulseOutcome(u.id, hit.hit ? (hit.down ? 'kill' : 'hit') : 'dodge');
      if (!hit.hit && u.side === 'hero') shell.flashHeroPassive(u.id, '💨 闪避', '#e2e8f0');
    }
    if (hit.down) {
      const res = meta && meta.result, killer = res && unitById(res.casterId);
      downTag(u.id, killer && killer.id !== u.id ? '☠ ' + killer.name + (res.skill?.name ? '【' + res.skill.name + '】' : '') + ' 击倒' : '☠ 倒下');
    }
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
  // 步伐：6 档真实采样（相邻去重 + 立体声 pan + 音高抖动）、落地尘土、移动拖尾；BOSS 每步轻震镜头
  const trailAt = new Map();
  const lastMoveClip = new Map();
  const activeGlides = new Map();
  let moveSfxOn = true;
  function effectiveUnitStyle(id) {
    const base = unitStyles[id] || null;
    if (!base) return null;
    return resolveFlightStyle(base, isUnitFlying(unitById(id), battle?.getEffectiveUnit(id)));
  }
  function stopActiveGlide(id) {
    const h = activeGlides.get(id);
    if (h) { try { h.stop?.(); } catch (_) {} activeGlides.delete(id); }
  }
  function pickClip(slotKey, pool) {
    if (!pool || !pool.length) return null;
    const prev = lastMoveClip.get(slotKey);
    const avail = pool.length > 1 ? pool.filter(k => k !== prev) : pool;
    const chosen = avail[Math.floor(Math.random() * avail.length)];
    lastMoveClip.set(slotKey, chosen);
    return chosen;
  }
  function randRate(range) {
    if (!Array.isArray(range) || range.length < 2) return 1;
    return range[0] + Math.random() * (range[1] - range[0]);
  }
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
  // 倒地原因牌：倒下单位头顶停留 1.8s（谁用什么打倒 / 持续伤害致死）
  function downTag(id, text) {
    const c = sandbox.unitWorldCenter(id);
    const el = c && fxNode('t-down-tag', c.x, c.y, 1800);
    if (el) el.textContent = text;
  }
  function playExpiredStatus(ev, index) {
    director.playStatusExpired(ev, index);
    const u = unitById(ev.unitId);
    if (u && battle) { shownEff.set(u.id, battle.getEffectiveUnit(u.id)); renderStatus(u.id); }
  }
  function pushDisplayedBars(u, patch, opts = {}) {
    const next = { ...shownOf(u), ...patch };
    shown.set(u.id, next);
    u.bars = { ...u.bars, ...next };
    const view = sandbox.getUnitView();
    view?.updateUnit(u.id, { bars: u.bars, syncGhost: true });
    view?.setFlag(u.id, 't-unit-lowhp', u.side === 'hero' && lowHp(u));
    if (u.side === 'hero') shell.setHeroBars(u.id, u.bars, opts);
  }
  function playVariantFeedback(ev) {
    director.playVariantFloat(ev);
    const view = sandbox.getUnitView();
    if (ev.trigger === 'revive' || ev.trigger === 'molt' || ev.trigger === 'regen') {
      const u = unitById(ev.unitId);
      if (!u) return;
      if (ev.trigger === 'revive') { view?.setFlag(u.id, 't-unit-falling', false); view?.setFlag(u.id, 't-unit-down', false); }
      pushDisplayedBars(u, { hp: ev.hpAfter, ...(ev.trigger === 'revive' ? { shield: 0 } : {}) }, { heal: true });
      if (battle) { shownEff.set(u.id, battle.getEffectiveUnit(u.id)); renderStatus(u.id); }
      if (ev.trigger === 'regen' && u.side === 'hero') shell.flashHeroPassive(u.id, '🌿 +' + (ev.healed || 0), '#6ee7b7');
      return;
    }
    if (ev.trigger === 'leech') {
      const u = unitById(ev.unitId);
      if (!u) return;
      const prev = shownOf(u), nextHp = Math.min(u.ref.maxHp || prev.hp, prev.hp + (ev.healed || 0));
      pushDisplayedBars(u, { hp: nextHp }, { heal: true });
      if (u.side === 'hero') shell.flashHeroPassive(u.id, '🧛 +' + (ev.healed || 0), '#fda4af');
      return;
    }
    if (ev.trigger === 'thorn') {
      const attacker = unitById(ev.targetId);
      if (!attacker) return;
      pushDisplayedBars(attacker, { hp: ev.hpAfter, shield: ev.shieldAfter ?? shownOf(attacker).shield }, { hit: true });
      avHost.av.playHitFeedback({ targetId: attacker.id, sourceId: ev.sourceId, source: 'reflect', damageType: '近战', outcome: 'hit',
        maxHp: ev.maxHp, hpBefore: ev.hpBefore, hpAfter: ev.hpAfter, hpDmg: ev.hpDmg,
        shieldBefore: ev.shieldBefore || 0, shieldAfter: ev.shieldAfter || 0, shieldDmg: ev.shieldDmg || 0,
        isHero: attacker.side === 'hero' }, { suppressShake: true, suppressRecoil: true });
      if (ev.hpAfter <= 0 && attacker.ref.hp <= 0) { playDown(attacker); downTag(attacker.id, '🌵 荆棘反伤致死'); }
      return;
    }
    const u = unitById(ev.unitId);
    if (!u) return;
    if (ev.trigger === 'link' && u.side === 'hero') shell.flashHeroPassive(u.id, '⚡ 连动 +1', '#f0abfc');
    if (battle) { shownEff.set(u.id, battle.getEffectiveUnit(u.id)); renderStatus(u.id); }
  }
  // 持续伤害跳伤：放大飘字 + 结果环 + 状态图标闪 + 角色栏弹字 + 合成音；致死时挂原因牌
  function playDotTick(ev, index) {
    director.playStatusTick(ev, index);
    const poison = ev.kind === 'poison', u = unitById(ev.unitId);
    ui(poison ? 'poisonTick' : 'burnTick');
    const view = sandbox.getUnitView();
    view?.pulseOutcome(ev.unitId, poison ? 'poison' : 'burn');
    view?.nodes.get(ev.unitId)?.status.querySelector('[data-k="' + ev.kind + '"]')?.animate(
      [{ transform: 'scale(1.6)', filter: 'brightness(2.2)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 520, easing: 'ease-out' });
    if (u && u.side === 'hero') shell.flashHeroPassive(u.id, (poison ? '☠️ ' : '🔥 ') + '-' + ev.damage, poison ? '#bef264' : '#fb923c');
    if (ev.hpAfter <= 0) { ui('lethal'); downTag(ev.unitId, '☠ ' + (poison ? '中毒' : '燃烧') + '致死'); }
  }
  // 敌方充能已满的前摇：本体红光震颤先起（t-unit-charge-full 常驻）+ 一次红色聚气 + 低鸣
  function playChargeWindup(id) {
    const view = sandbox.getUnitView(), c = sandbox.unitWorldCenter(id);
    if (!view || !c) return;
    view.setFlag(id, 't-unit-charge-windup', true);
    sandbox.getScope().after(900, () => view.setFlag(id, 't-unit-charge-windup', false));
    fxNode('t-danger-gather', c.x, c.y, 1000);
    ui('enemyCharge');
  }
  function blinkRadius(skill) { return skill.displacements.find(d => d.type === '闪现').distance; }
  function moveFeedback(id, kind, p) {
    const st = effectiveUnitStyle(id) || {};
    const u = unitById(id);
    if (kind === 'start') {
      stopActiveGlide(id);
      if (moveSfxOn && st.glideSfx) {
        let stopped = false, cue = null, stopTimer = null;
        const play = () => {
          const sfxOpts = { rate: randRate(st.glideSfx.rate), track: 'skill', category: 'C' };
          if (st.glideSfx.offsetSec) sfxOpts.offsetSec = st.glideSfx.offsetSec;
          cue = avHost.sfx(st.glideSfx.key, st.glideSfx.vol, sfxOpts);
          cue?.done.then(natural => { if (natural && !stopped && st.glideSfx.loop) play(); });
        };
        activeGlides.set(id, {
          stop() { if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; } stopped = true; cue?.(); },
          fadeStop() { stopped = true; if (!stopTimer) stopTimer = setTimeout(() => stopActiveGlide(id), 90); },
        });
        play();
      } else if (st.glide) ui(st.glide);
      return;
    }
    if (kind === 'stop') {
      const h = activeGlides.get(id);
      if (h && typeof h.fadeStop === 'function') h.fadeStop(); else stopActiveGlide(id);
      if (st.glide) ui('glideStop');
      return;
    }
    if (!p) return;
    const s = sandbox.worldToScreenClient(p.x, p.y);
    const pan = Math.max(-0.6, Math.min(0.6, (s.x / window.innerWidth - 0.5) * 1.2));
    const playJumpPool = (phase, pool, vol, rateRange, fallbackUi) => {
      if (moveSfxOn && pool && pool.length) {
        const clip = pickClip(id + ':' + phase, pool);
        if (clip && avHost.sfx(clip, vol, { rate: randRate(rateRange), pan, track: 'skill', category: 'C' })) return true;
      }
      ui(fallbackUi);
      return false;
    };
    const stomp = () => { const d = sandbox.getDom(); if (d && d.shake) { d.shake.classList.remove('t-stomp'); void d.shake.offsetWidth; d.shake.classList.add('t-stomp'); } };
    const bigUnit = u && (u.footprint.width > 1 || u.footprint.height > 1);
    const js = st.jumpSfx || {};
    if (kind === 'jump-crouch') { playJumpPool('jc', js.crouchPool, js.crouchVol ?? 0.6, js.rate, 'jumpCrouch'); return; }
    if (kind === 'jump-takeoff') {
      playJumpPool('jt', js.takeoffPool, js.takeoffVol ?? 0.8, js.rate, 'jumpTakeoff');
      fxNode('t-jump-gust', p.x, p.y + 0.2, 480); return;   // 扬尘由导演 playJumpDust 绘制
    }
    if (kind === 'jump-land') {
      const heavyLand = bigUnit || st.shake;
      playJumpPool('jl', heavyLand ? JUMP_LAND_HEAVY_POOL : js.landPool, heavyLand ? Math.max(0.92, js.landVol ?? 0.88) : (js.landVol ?? 0.82), heavyLand ? [0.85, 0.94] : js.rate, heavyLand ? 'bossStomp' : 'jumpLand');
      fxNode('t-land-ring', p.x, p.y + 0.22, 640);
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
    if (moveSfxOn) {
      if (st.stepSfx && st.stepSfx.pool && !(st.gait && st.gait.float > 0)) {
        const clip = pickClip(id + ':step', st.stepSfx.pool);
        if (clip) avHost.sfx(clip, st.stepSfx.vol, { rate: randRate(st.stepSfx.rate), pan, track: 'skill', category: 'C' });
      } else if (st.step) ui(st.step, { pan });
    }
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
    bgm.syncBattle({ terminal });
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

  function setBusy(on) { busy = !!on; shell.setBusy(busy); updateThreat(); }

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
      delete row.usesRemaining; delete row._explicit; delete row._sbMissing;
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
          id: u.id, side: u.side, name: u.ref.name || u.name, displayName: u.ref.displayName || u.name, emoji: u.emoji, avatarUrl: u.avatarUrl,
          badge: u.side === 'hero' ? (u.ref.classType || '无职业') : tier[0], tierClass: tier[1],
          config: editorConfig(u), persist: structuredClone(persistByName.get(u.ref.name || u.name) || u.ref.persist || {}),
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

  const AUDIO_PREF_KEY = 'tactics.audioPrefs.v1';
  const audioPrefs = (() => {
    const def = { move: true, identity: true, variant: true, status: true, selfDestruct: true, atmoSound: false, atmoTheme: 'rain',
      volMaster: 1, volSfx: 1, volUi: 1, volVoice: 1, volAtmo: 1, muted: false, liteCine: true };
    try { return Object.assign(def, JSON.parse(localStorage.getItem(AUDIO_PREF_KEY) || '{}')); } catch (_) { return def; }
  })();
  // 分轨：主音量（含配乐）/ 战斗音效（技能+结果轨）/ 界面·提示·脚步（aux）/ 角色语音 / 环境音
  function applyVolumes() {
    avHost.setBusVolume('master', audioPrefs.muted ? 0 : audioPrefs.volMaster);
    avHost.setBusVolume('skill', audioPrefs.volSfx); avHost.setBusVolume('result', audioPrefs.volSfx);
    avHost.setBusVolume('aux', audioPrefs.volUi); avHost.setBusVolume('voice', audioPrefs.volVoice); avHost.setBusVolume('atmo', audioPrefs.volAtmo);
  }
  function applyAudioPrefs() {
    moveSfxOn = !!audioPrefs.move;
    if (!moveSfxOn) activeGlides.forEach((_h, uid) => stopActiveGlide(uid));
    avHost.av.setIdentitySfx?.(!!audioPrefs.identity);
    avHost.av.setVariantSfx?.(!!audioPrefs.variant);
    avHost.av.setStatusSfx?.(!!audioPrefs.status);
    avHost.av.setSelfDestructSfx?.(!!audioPrefs.selfDestruct);
    avHost.setAtmoTheme(audioPrefs.atmoTheme);
    avHost.setAtmoSound(!!audioPrefs.atmoSound);
    applyVolumes();
  }
  applyAudioPrefs();
  function saveAudioPrefs() { try { localStorage.setItem(AUDIO_PREF_KEY, JSON.stringify(audioPrefs)); } catch (_) {} }
  const onAudioPrefChange = (e) => {
    const t = e.target;
    const key = t && t.dataset && t.dataset.audioPref;
    if (!key) return;
    if (t.type === 'range') {
      audioPrefs[key] = Number(t.value) / 100;
      const out = t.parentElement && t.parentElement.querySelector('output');
      if (out) out.textContent = t.value + '%';
      applyVolumes();
      if (e.type === 'change') saveAudioPrefs();
      return;
    }
    if (e.type !== 'change') return;
    audioPrefs[key] = t.type === 'checkbox' ? !!t.checked : String(t.value || 'baseline');
    saveAudioPrefs();
    applyAudioPrefs();
  };
  shell.els.editorModal?.addEventListener('change', onAudioPrefChange);
  shell.els.editorModal?.addEventListener('input', onAudioPrefChange);
  function toggleMute() {
    audioPrefs.muted = !audioPrefs.muted;
    saveAudioPrefs(); applyVolumes();
    const box = shell.els.editorModal?.querySelector('[data-audio-pref="muted"]');
    if (box) box.checked = audioPrefs.muted;
    shell.showLog(audioPrefs.muted ? '🔇 已静音（按 M 恢复）' : '🔊 声音已恢复', 'act', 1600);
  }

  function soundSettingsHtml() {
    const rep = avHost.resourceReport();
    const count = (list, st) => list.filter(r => r.status === st).length;
    const bad = rep.audio.filter(r => r.status === 'error').concat(rep.images.filter(r => r.status === 'error'));
    const chk = (k, label) => '<label class="flex items-center justify-between gap-2 text-[11px] text-slate-200 cursor-pointer py-0.5"><span>' + label + '</span><input type="checkbox" data-audio-pref="' + k + '"' + (audioPrefs[k] ? ' checked' : '') + '></label>';
    const vol = (k, label) => '<label class="flex items-center justify-between gap-2 text-[11px] text-slate-200 py-0.5"><span class="whitespace-nowrap">' + label + '</span>' +
      '<input type="range" min="0" max="100" step="5" class="flex-1" data-audio-pref="' + k + '" value="' + Math.round(audioPrefs[k] * 100) + '">' +
      '<output class="w-9 text-right text-slate-400">' + Math.round(audioPrefs[k] * 100) + '%</output></label>';
    const themes = [['baseline', '默认静音'], ['rain', '夜雨'], ['mist', '冷雾'], ['ruins', '废墟尘埃'], ['eldritch', '异界低光']];
    return '<h4 class="t-panel-h">声音与资源</h4>' +
      '<div class="t-res-report"><div>资源基址：<code>' + escapeText(rep.assetBase) + '</code></div>' +
      '<div>音频上下文：' + (rep.unlocked ? '已解锁（' + rep.audioState + '）' : '未解锁（首次点击/按键后解锁）') + '</div>' +
      '<div>采样/语音：成功 ' + count(rep.audio, 'ok') + ' · 加载中 ' + count(rep.audio, 'loading') + ' · 失败 ' + count(rep.audio, 'error') + '</div>' +
      '<div>头像：成功 ' + count(rep.images, 'ok') + ' · 失败 ' + count(rep.images, 'error') + '</div>' +
      (bad.length ? '<div class="t-res-bad">加载失败：<br>' + bad.map(r => escapeText(r.url)).join('<br>') + '</div>' : '') +
      (rep.missing.length ? '<div class="t-res-bad">缺失：' + rep.missing.map(m => escapeText(m.kind + ':' + m.detail)).join('，') + '</div>' : '') +
      '<div class="mt-2 pt-2 border-t border-slate-700/60">' +
      vol('volMaster', '主音量（含配乐）') + vol('volSfx', '战斗音效') + vol('volUi', '界面·提示·脚步') + vol('volVoice', '角色语音') + vol('volAtmo', '环境音') +
      chk('muted', '静音（快捷键 M）') +
      chk('liteCine', '重复技能精简运镜') +
      '</div><div class="mt-2 pt-2 border-t border-slate-700/60">' +
      chk('move', '步态移动音效（6 档真实采样）') +
      chk('identity', '攻击身份音效') +
      chk('variant', '怪物变体与抗性音效') +
      chk('status', '异常状态发作音效') +
      chk('selfDestruct', '死亡自爆音效') +
      chk('atmoSound', '战场环境氛围音') +
      '<label class="flex items-center justify-between gap-2 text-[11px] text-slate-200 mt-1"><span>环境音主题</span>' +
      '<select data-audio-pref="atmoTheme" class="edit-input-game text-[11px] px-1.5 py-0.5">' +
      themes.map(([v, n]) => '<option value="' + v + '"' + (audioPrefs.atmoTheme === v ? ' selected' : '') + '>' + n + '</option>').join('') +
      '</select></label></div></div>';
  }
  function escapeText(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

  // ---------- 键盘：数字键选技能 / Space 结束回合 / Enter 发动 / Esc 返回 ----------
  const onKey = e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'Escape') { if (retargetPrompt) { retargetPrompt.finish(null); return; } cancelStep(); return; }
    if (e.key === 'Enter' && retargetPrompt) { e.preventDefault(); retargetPrompt.finish(null); return; }
    if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) { toggleMute(); return; }
    if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      threatAll = !threatAll; updateThreat();
      shell.showLog(threatAll ? '⚠ 敌方威胁区：全体（颜色越深，覆盖的敌人越多 · 再按 T 关闭）' : '敌方威胁区已关闭', 'act', 1800);
      return;
    }
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
    activeGlides.forEach((_h, uid) => stopActiveGlide(uid));
    shell.els.editorModal?.removeEventListener('change', onAudioPrefChange);
    rootEl.ownerDocument?.removeEventListener('pointerdown', unlockBgm, { capture: true });
    rootEl.ownerDocument?.removeEventListener('keydown', unlockBgm, { capture: true });
    unsubscribeBgm();
    bgm.destroy();
    cancelRetargetPrompt();
    director.cancelAttack();
    shell.cancelReactionPrompt();
    rootEl.ownerDocument.removeEventListener('keydown', onKey);
    combatToken = {};
    avHost.destroy();
    sandbox.destroy();
    shell.destroy();
  }

  return {
    loadYaml, boot, destroy, playProjectile, restart,
    sandbox, shell, avHost, director, bgm,
    getToken: () => combatToken,
    getViewData: () => currentViewData,
    getBattle: () => battle,
    isBusy: () => busy,
    resources: () => avHost.resourceReport(),
    command: (key) => handleCommand(key),
    endTurn: () => {
      if (!battle || busy || !isHeroTurn()) return false;
      endArmedUntil = performance.now() + 5000;
      requestEnd();
      return true;
    },
  };
}


