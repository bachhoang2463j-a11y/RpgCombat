// ==========================================
// 战棋新特效研发空白母版 · 纯净宿主（不含 50+ 既有 fxTag 条目）
// 场地：上层立柱大厅单房间（20m × 13m，闭合四面墙）；
// 站位：上半场 6 敌靶子（含 2 个 2×2 大体型精英）+ 下半场 4 我方角色；
// 面板：默认空白演练槽（CARDS = []），支持工作台条目契约预检与中文报错提示。
// ==========================================

import { parseYamlText } from './parser.mjs';
import { createScenarioData } from './scenario-data.mjs';
import { createSandbox } from './sandbox.mjs';
import { buildShell } from './ui-shell.mjs';
import { createAvHost, heroAvatarUrl } from './av-host.mjs';
import { createActionDirector } from './action-director.mjs';
import { createFxRegistry, checkBudget, GRADE_BUDGETS } from './fx-registry.mjs';
import { createUiSfx } from './ui-sfx.mjs';
import { resolveUnitStyles } from './unit-style.mjs';
import { splitEmojiName, resolveAvatarUrl } from './unit-view.mjs';
import { unitCenter } from './geometry.mjs';
import { queryAttack } from './range.mjs';
import { compileScene } from './scene.mjs';
import * as primitives from './vfx-primitives.mjs';

const R = (col, row, width, height) => ({ col, row, width, height });

// 上层立柱大厅单房间场景（24×15 网格，可行走区 20m×13m，四面墙自动闭合）
export const VFX_CHAPEL_HALL = {
  sceneId: 'sc-chapel-hall-vfx',
  style: 'chapel',
  grid: { columns: 24, rows: 15, metersPerCell: 1 },
  ground: { material: 'stone' },
  floor: [R(2, 1, 20, 13)],
  objects: [
    { id: 'carpet-axis', kind: 'carpet', bounds: R(11, 1, 2, 13) },
    { id: 'pillar-nw', kind: 'pillar', bounds: R(4, 3, 2, 2) },
    { id: 'pillar-ne', kind: 'pillar', bounds: R(18, 3, 2, 2) },
    { id: 'pillar-sw', kind: 'pillar', bounds: R(4, 9, 2, 2) },
    { id: 'pillar-se', kind: 'pillar', bounds: R(18, 9, 2, 2) },
    ...[3, 5, 7, 9, 11].flatMap((row, i) => [
      { id: 'pew-c-l' + i, kind: 'pew', bounds: R(7, row, 3, 1) },
      { id: 'pew-c-r' + i, kind: 'pew', bounds: R(14, row, 3, 1) },
    ]),
    ...[[3.5, 2], [20.5, 2], [3.5, 12.5], [20.5, 12.5], [8.5, 6], [15.5, 6]]
      .map(([col, row], i) => ({ id: 'light-' + i, kind: 'light', at: { col, row } })),
  ],
};

// 靶场默认站位：上半场 6 敌（含 2 个 2×2 精英），下半场 4 我方英雄
export const VFX_STAGE_PLACEMENTS = {
  'e:伊塔库亚的眷族': { col: 2, row: 3, facing: 180 },
  'e:犹格索托斯之子': { col: 20, row: 3, facing: 180 },
  'e:深潜者A': { col: 11, row: 2, facing: 180 },
  'e:深潜者B': { col: 13, row: 2, facing: 180 },
  'e:食尸鬼A': { col: 10, row: 5, facing: 180 },
  'e:食尸鬼B': { col: 13, row: 5, facing: 180 },
  'h:索恩': { col: 10, row: 10, facing: 0 },
  'h:弗兰克': { col: 13, row: 10, facing: 0 },
  'h:埃利奥特': { col: 11, row: 12, facing: 0 },
  'h:玛德琳': { col: 13, row: 12, facing: 0 },
};

// 兜底条目：仅透传揭晓，不混入任何 50+ 既有技能特效实现
const NEUTRAL_FALLBACK = {
  id: 'neutral-impact', grade: 'identity', fallback: true,
  async play(ctx) {
    for (const h of ctx.hits) ctx.reveal(h.targetId);
    return true;
  },
};

// 从典型对局 YAML 构造靶场单位视图（无召唤物、全员满状态、固定大厅站位）
function buildStageData(yamlText) {
  const parsed = parseYamlText(yamlText);
  const scenario = createScenarioData(parsed);
  const units = [];
  const placementsById = {};
  const footprintsById = {};
  const srcs = [...(parsed.heroes || []), ...(parsed.enemies || [])];
  const styles = resolveUnitStyles(scenario.units);
  for (let i = 0; i < scenario.units.length; i++) {
    const u = scenario.units[i];
    const p = VFX_STAGE_PLACEMENTS[u.id];
    if (!p) continue;
    const src = srcs[i] || {};
    const emoji = splitEmojiName(src.name || u.name).emoji || null;
    const clone = JSON.parse(JSON.stringify(u));
    clone.emoji = emoji;
    clone.img = src.img || null;
    clone.avatarUrl = emoji ? null : resolveAvatarUrl({ img: src.img, name: u.name }, heroAvatarUrl);
    clone.style = styles[u.id] || {};
    clone.bars = { hp: clone.ref.hp, maxHp: clone.ref.maxHp, mp: clone.ref.mp, maxMp: clone.ref.maxMp, tp: clone.ref.tp || 0, maxTp: clone.ref.maxTp || 100, shield: 0 };
    units.push(clone);
    placementsById[clone.id] = { ...p };
    footprintsById[clone.id] = { ...(clone.footprint || { width: 1, height: 1 }) };
  }
  return { units, placementsById, footprintsById, compiled: compileScene(VFX_CHAPEL_HALL) };
}

// 工作台契约预检：中文精准指出字段/预算错误，避免进底座抛晦涩异常
function validateWorkbench(customEntries, cards, unitIds) {
  const errors = [];
  const seenIds = new Set();
  for (let i = 0; i < (customEntries || []).length; i++) {
    const e = customEntries[i];
    if (!e || !e.id) { errors.push(`自定义条目[${i}] 缺少 id`); continue; }
    if (seenIds.has(e.id)) errors.push(`自定义条目 id 重复: ${e.id}`);
    seenIds.add(e.id);
    if (typeof e.play !== 'function') errors.push(`条目 ${e.id} 缺少 async play(ctx) 函数`);
    const g = e.grade;
    if (g !== 'identity' && !GRADE_BUDGETS[g]) errors.push(`条目 ${e.id} 的 grade 无效: ${g}`);
    else if (g !== 'identity') {
      const b = checkBudget(e);
      if (!b.ok) errors.push(`条目 ${e.id} (${g}) 预算不合: ${b.reasons.join('；')}`);
    }
  }
  for (let i = 0; i < (cards || []).length; i++) {
    const c = cards[i];
    if (!c || !c.name) errors.push(`CARDS[${i}] 缺少 name`);
    if (c && c.casterId && !unitIds.has(c.casterId)) errors.push(`卡片「${c.name || i}」施术者不存在: ${c.casterId}`);
    for (const tid of (c?.targetIds || [])) {
      if (!unitIds.has(tid)) errors.push(`卡片「${c.name || i}」目标不存在: ${tid}`);
    }
  }
  return errors;
}

// 合成与真实 battle.attack() 同构的演出 result payload（不碰规则掷骰，纯供特效消费）
function buildMockResult(stageData, card) {
  const { units, placementsById, footprintsById, compiled } = stageData;
  const casterId = card.casterId || 'h:埃利奥特';
  const caster = units.find(u => u.id === casterId) || units[0];
  const targetIds = (card.targetIds && card.targetIds.length) ? card.targetIds : ['e:深潜者A'];
  const firstTarget = units.find(u => u.id === targetIds[0]);
  const fp0 = footprintsById[firstTarget.id] || { width: 1, height: 1 };
  const aim = card.aim || { ...unitCenter(placementsById[firstTarget.id], fp0), targetId: firstTarget.id };
  const range = card.range || { type: targetIds.length > 1 ? '爆炸' : '单体', castRange: 18, radius: 4 };
  const skill = {
    name: card.name || '演练技能',
    fxTag: card.fxTag || null,
    damageType: card.damageType || '法术',
    power: card.dmg ?? 120,
    range,
  };
  const query = queryAttack({ compiled, units, placementsById, footprintsById, visibleUnitIds: units.map(u => u.id) }, casterId, skill, aim);
  const segCount = Math.max(1, card.segments || 1);
  const hits = targetIds.map((tid) => {
    const u = units.find(x => x.id === tid);
    const maxHp = u ? u.ref.maxHp : 100;
    const isHit = card.hit !== false;
    const perDmg = isHit ? Math.round((card.dmg ?? 120) / segCount) : 0;
    const segments = Array.from({ length: segCount }, (_, i) => {
      const hpBefore = Math.max(1, maxHp - i * perDmg);
      const hpAfter = (card.fatal && i === segCount - 1) ? 0 : Math.max(1, hpBefore - perDmg);
      return {
        shotIndex: i, hit: isHit, outcome: isHit ? (card.crit ? 'crit' : 'hit') : 'dodge',
        side: u?.side || 'enemy', maxHp, hpBefore, hpAfter, hpDmg: perDmg, rawDmg: perDmg,
        isCrit: !!card.crit, damageType: skill.damageType, heal: !!card.heal,
      };
    });
    const last = segments[segments.length - 1];
    return { targetId: tid, side: u?.side || 'enemy', hit: isHit, maxHp, hpBefore: maxHp, hpAfter: last.hpAfter, hpDmg: last.hpBefore - last.hpAfter, segments };
  });
  return {
    ok: true, casterId, skill, aim, query: query.ok ? query : { ok: true, aim, shape: { type: range.type, center: aim, radius: range.radius || 0 }, cells: [] },
    hits, effects: card.extraEffects || [], events: [], shots: hits[0]?.segments.map((_, i) => ({ shotIndex: i, aim })),
    crit: !!card.crit, incomingType: skill.damageType,
  };
}

// 安装全局战棋特效演练舞台（暴露给底部明文工作台调用）
export function installVfxTemplateStage(rootEl, { yamlText }) {
  const stageData = buildStageData(yamlText);
  const shell = buildShell(rootEl);

  const registry = createFxRegistry().register(NEUTRAL_FALLBACK);
  let avHost = null;
  let combatToken = 1;
  let playing = false;

  const sandbox = createSandbox(shell.els.mapSlot, {
    getSafeRect: () => shell.getSafeRect(),
    onAvatarStatus: (unit, url) => {
      if (!avHost) return;
      if (url) avHost.trackImage(url, 'avatar', unit.name);
      else avHost.host.report('avatar-missing', unit.name);
    },
    onStage: info => avHost && avHost.attachStage(info),
    onTeardown: () => { if (avHost) avHost.clear({ resetVoices: true }); },
  });

  const viewData = () => ({
    sceneId: VFX_CHAPEL_HALL.sceneId,
    battleId: 'vfx-template',
    combatToken,
    scene: VFX_CHAPEL_HALL,
    units: stageData.units,
    placementsById: stageData.placementsById,
    footprintsById: stageData.footprintsById,
  });

  avHost = createAvHost({
    getUnitView: () => sandbox.getUnitView(),
    getUnits: () => stageData.units,
  });
  const uiSfx = createUiSfx(avHost.av.CombatAudioMixer);
  shell.onUiSound = kind => uiSfx(kind);

  const director = createActionDirector({
    sandbox, avHost, registry,
    getViewData: viewData,
    onReveal: (seg) => {
      const u = stageData.units.find(x => x.id === seg.targetId);
      if (!u) return;
      u.bars.hp = Math.max(0, seg.hpAfter ?? u.bars.hp);
      sandbox.getUnitView()?.updateUnit(u.id, { bars: { ...u.bars } });
    },
  });

  // 接管右下角技能面板为主演练槽
  if (shell.els.strip) shell.els.strip.hidden = true;
  if (shell.els.activeHeroName) shell.els.activeHeroName.textContent = '技能演练 · 空白模板';
  const menuBox = shell.els.menuBox;
  const subLabel = menuBox.querySelector('#menu-container > div:first-child > span:last-child');
  if (subLabel) subLabel.textContent = '尚未配置';
  const listWrap = document.createElement('div');
  listWrap.id = 'vfx-demo-card-list';
  listWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:4px;padding:6px;overflow-y:auto;';
  shell.els.menuMain.replaceWith(listWrap);

  function fitHall() {
    const safe = shell.getSafeRect();
    const { w, h } = sandbox.getWorldSize();
    const scale = Math.max(0.25, Math.min(1.4, Math.min((safe.width - 24) / w, (safe.height - 24) / h)));
    const tx = safe.left + (safe.width - w * scale) / 2;
    const ty = safe.top + (safe.height - h * scale) / 2;
    sandbox.setCamera({ tx, ty, scale });
  }

  function restoreTargets() {
    const view = sandbox.getUnitView();
    for (const u of stageData.units) {
      u.bars.hp = u.ref.maxHp;
      u.bars.shield = 0;
      if (view) {
        const c = unitCenter(stageData.placementsById[u.id], stageData.footprintsById[u.id]);
        view.setDisplayPos(u.id, c.x, c.y);
        view.updateUnit(u.id, { bars: { ...u.bars }, placement: stageData.placementsById[u.id] });
      }
    }
  }

  let onResetHook = null;
  function resetStage(cards = []) {
    combatToken++;
    playing = false;
    avHost.clear({ resetVoices: true });
    restoreTargets();
    sandbox.reset(viewData());
    fitHall();
    shell.renderHeroes(stageData.units);
    shell.renderTurnOrder(stageData.units);
    shell.showLog('靶场已就绪（立柱大厅 20m×13m · 6 敌 4 友）');
    if (onResetHook) onResetHook();
    else renderCards(cards);
  }

  function setCardsDisabled(disabled) {
    listWrap.querySelectorAll('button').forEach(b => { b.disabled = disabled; });
  }

  async function playCard(card) {
    if (playing) return;
    playing = true;
    setCardsDisabled(true);
    restoreTargets();
    avHost.unlockAudio();
    shell.showLog(`▶ 演练：${card.name} [${card.fxTag || '无fxTag'}]`);
    try {
      if (card.kind === 'prepare') {
        await director.playPrepare({
          ok: true, preparing: true, casterId: card.casterId || 'h:埃利奥特',
          skill: { name: card.name || '蓄力起手', fxTag: card.fxTag || null, damageType: card.damageType || '法术' },
        });
      } else {
        const res = buildMockResult(stageData, card);
        if (card.kind === 'reaction') {
          const h0 = res.hits[0];
          const p0 = stageData.placementsById[h0.targetId];
          h0.reaction = {
            fxTag: card.fxTag, type: card.fxTag || '回避错位', success: true,
            shift: card.shift || (p0 ? { col: Math.max(2, p0.col - 1), row: p0.row } : null),
          };
        }
        await director.playAttack(res);
        if (card.fatal && String(res.casterId).startsWith('h:')) await director.playExecution(res);
      }
      shell.showLog(`✔ 完成：${card.name}`);
    } catch (err) {
      shell.showLog(`❌ 演出异常：${err?.message || err}`);
      console.error('[vfx-template] play error:', err);
    } finally {
      playing = false;
      setCardsDisabled(false);
    }
  }

  function renderCards(cards) {
    listWrap.replaceChildren();
    if (subLabel) subLabel.textContent = cards.length ? `已配置 ${cards.length} 项` : '尚未配置';
    if (!cards.length) {
      listWrap.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:12px;color:#64748b;">暂无技能</div>';
      return;
    }
    for (const card of cards) {
      const btn = document.createElement('button');
      btn.className = 'vfx-demo-card';
      btn.style.cssText = 'width:100%;padding:6px 8px;background:rgba(15,23,42,0.85);border:1px solid rgba(51,65,85,0.8);border-radius:8px;text-align:left;color:#f1f5f9;cursor:pointer;transition:border-color .15s;';
      btn.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;"><span style="font-size:12px;font-weight:700;"></span><span style="font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid rgba(34,211,238,0.5);color:#67e8f9;"></span></div><div style="font-size:10px;color:#94a3b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>';
      const spans = btn.querySelectorAll('span');
      spans[0].textContent = card.name;
      spans[1].textContent = card.level || 'L1';
      btn.lastElementChild.textContent = card.description || card.fxTag || '';
      btn.addEventListener('click', () => playCard(card));
      listWrap.appendChild(btn);
    }
  }

  function boot({ customEntries = [], cards = [], registerExtra = null, onReady = null } = {}) {
    const unitIds = new Set(stageData.units.map(u => u.id));
    const errs = validateWorkbench(customEntries, cards, unitIds);
    for (const entry of customEntries) {
      if (entry && entry.id && typeof entry.play === 'function') {
        try { registry.register(entry); } catch (e) { errs.push(e.message); }
      }
    }
    if (typeof registerExtra === 'function') registerExtra(registry);
    sandbox.mount(viewData());
    fitHall();
    shell.renderHeroes(stageData.units);
    shell.renderTurnOrder(stageData.units);
    shell.onReset = () => resetStage(cards);
    renderCards(cards);
    if (typeof onReady === 'function') onReady(stageApi);
    if (errs.length) shell.showLog('⚠️ 工作台预检：' + errs[0]);
    else shell.showLog('战棋特效空白母版就绪（立柱大厅 · 上 6 敌 / 下 4 友）');
  }

  const stageApi = {
    ...primitives, checkBudget, GRADE_BUDGETS, boot, reset: resetStage, playCard, renderCards, fitHall,
    setResetHook: fn => { onResetHook = fn; },
    getRegistry: () => registry,
    getUnits: () => stageData.units,
    els: { menuBox, listWrap, subLabel, activeHeroName: shell.els.activeHeroName },
    shell, director,
  };
  window.__TACTICS_VFX_STAGE__ = stageApi;
  return stageApi;
}

