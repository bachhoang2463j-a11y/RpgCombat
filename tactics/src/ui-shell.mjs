// ==========================================
// 战棋界面壳（视听切片翻新版）
// 槽位沿用原 RPG 组织：左侧行动轴 / 右上入口 / 底部我方卡片 / 右下指令面板（原菜单槽）/ 战报条 / 面板 / 底栏旁白。
// 左侧行动条与右下技能栏（子菜单/父子技能组卡/物品卡/标签悬浮提示）直接复用原版 index（vendor/rpg-ui 生成文件），
// 本层只做宿主适配：伪 state、规则判定与瞄准入口转交 main；地面直接点击移动由 main 负责。
// 本层只做展示与输入转发，不做规则判断（可用/禁用原因由 main 传入）。
// ==========================================

import { createRpgUi, RPG_UI_RAIL_HTML, RPG_UI_MENU_HTML, RPG_UI_TIP_HTML, RPG_UI_EDITOR_HTML } from './vendor/rpg-ui/rpg-ui.mjs';
import { createReactionPrompt } from './reaction-prompt.mjs';
import { normalizeEffectTag } from './effect-definitions.mjs';
import { skillActionKind, actionPayment } from './actions.mjs';
import { CLASS_STYLE } from './unit-style.mjs';
import { createHeroFlameFx } from './hero-flame-fx.mjs';

const ESC = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
// 禁用原因短标签（卡面一行可读；完整原因仍写入 title/aria 与点击后的战报）
export function shortReason(reason) {
  const r = String(reason || '');
  if (!r) return '';
  if (/未迁移/.test(r)) return '🚧 战棋未迁移';
  if (/冷却/.test(r)) return '⏳ 冷却中';
  if (/限次/.test(r)) return '🚫 限次已用完';
  if (/蓄力|准备/.test(r)) return '⌛ ' + r;
  if (/数值资源|MP|HP|TP/.test(r)) return '💧 资源不足';
  if (/主行动/.test(r)) return '◆ 主行动已用完';
  if (/辅助行动/.test(r)) return '◇ 辅助行动已用完';
  if (/反应/.test(r)) return '🛡 反应技能·被动触发';
  return '⛔ ' + r;
}

export function buildShell(root) {
  root.setAttribute('data-rpg-ui-scope', '');
  root.innerHTML = [
    '<div id="battle-scene"><div id="tactics-map-slot"></div></div>',
    '<div id="battle-log-wrap"><div id="battle-log">整装待发...</div></div>',
    '<div id="turn-banner" aria-hidden="true"><div class="tb-inner"><div class="tb-face"></div><div class="tb-text"><b class="tb-name"></b><i class="tb-sub"></i></div></div></div>',
    RPG_UI_RAIL_HTML,
    '<div id="tactics-topbar">' +
      '<div id="field-badge" class="t-topbtn" style="display:none">🏟️ <span id="field-badge-name">场地</span></div>' +
      '<button id="btn-worldbook" class="t-topbtn" title="世界书">📚<span class="t-toplabel">世界书</span></button>' +
      '<button id="btn-history" class="t-topbtn" title="记录">📜<span class="t-toplabel">记录</span></button>' +
      '<button id="btn-fullscreen" class="t-topbtn" title="全屏">🔲<span class="t-toplabel">全屏</span></button>' +
      '<button id="btn-dialogue" class="t-topbtn" title="对话">💬<span class="t-toplabel">对话</span></button>' +
      '<button id="btn-editor" class="t-topbtn" title="设置">⚙️<span class="t-toplabel">设置</span></button>' +
      '<button id="btn-music" class="t-topbtn" type="button" title="音乐" aria-label="音乐">🎵<span class="t-toplabel">音乐</span></button>' +
      '<button id="btn-reset" class="t-topbtn" title="重置">🔄<span class="t-toplabel">重置</span></button>' +
    '</div>',
    '<div id="tactics-allies" role="group" aria-label="召唤物与临时盟友" hidden></div>',
    '<div id="tactics-float-ui">' +
      '<div id="heroes-container"></div>' +
      '<div id="menu-outer" class="relative self-end"><div id="t-res-strip" class="t-res" hidden></div>' + RPG_UI_MENU_HTML + '</div>' +
    '</div>',
    '<div id="chat-input-area"><div id="chat-input-bar">' +
      '<input type="text" id="chat-text-input" placeholder="说点什么... (Enter发送)" maxlength="200">' +
      '<button id="chat-ally-toggle" class="t-toggle-on">友方旁白</button>' +
      '<button id="chat-enemy-toggle" class="t-toggle-on">敌方旁白</button>' +
      '<button id="chat-send-btn">发送</button>' +
    '</div></div>',
    '<div id="panel-overlay" style="display:none">' +
      '<div id="panel-box">' +
        '<div id="panel-head"><span id="panel-title">面板</span><button id="panel-close">✕ 关闭</button></div>' +
        '<div id="panel-body"></div>' +
      '</div>' +
    '</div>',
    RPG_UI_TIP_HTML,
    RPG_UI_EDITOR_HTML,
  ].join('');

  const $ = (id) => root.querySelector('#' + id);
  const els = {
    mapSlot: $('tactics-map-slot'), battleLog: $('battle-log'), turnOrder: $('turn-order-container'),
    heroes: $('heroes-container'), allies: $('tactics-allies'), menuBox: $('menu-container'), menuMain: $('main-menu'),
    activeHeroName: $('active-hero-name'), chatInput: $('chat-text-input'), banner: $('turn-banner'),
    overlay: $('panel-overlay'), panelBox: $('panel-box'), panelTitle: $('panel-title'), panelBody: $('panel-body'),
    targetMenu: $('target-menu'), targetHint: $('target-hint'), enemyOverlay: $('enemy-turn-overlay'),
    strip: $('t-res-strip'), chargeMenu: $('charge-menu'), basicList: root.querySelector('#basic-menu > div:last-child'),
    editorModal: $('editor-modal'),
  };
  const state = { units: [], selectedId: null, allySpeak: true, enemySpeak: true, onUnitClick: null, onReset: null, history: [],
    settings: null, onUiSound: null, busy: false, currentId: null, cmd: null, menuKey: '',
    pipKey: '', pipMax: { main: 0, aux: 0 }, pipPrev: null, moveCap: 0, basicKey: '', chargeKey: '', chargeAside: false, moveCost: null };
  const uiSound = (kind) => { if (state.onUiSound) state.onUiSound(kind); };
  // 头像火焰层：全宽透明画布，避让指令面板与资源条
  const flames = createHeroFlameFx(root, () => els.heroes, () => [els.menuBox, els.strip].map(el => el.getBoundingClientRect()).filter(r => r.width));
  const pct = (v, max) => (max ? Math.max(0, Math.min(100, v / max * 100)) : 100).toFixed(1);

  // ---------- 原版界面宿主（伪 state + 规则/瞄准回调转交 main） ----------
  const rpgState = { actionQueue: [], queueIndex: 0, isGameStarted: true, isAnimating: false, usedExtraTurnSkillsThisRound: new Set() };
  const cmdHero = () => state.cmd && state.cmd.unit;
  const callCmd = (k, ...a) => (state.cmd && state.cmd[k] ? state.cmd[k](...a) : undefined);
  const getHeroItemBindings = (hero) => {
    const map = new Map();
    for (const it of (hero && hero.items) || []) {
      for (const b of (it && it.bindings) || []) {
        if (!b || !b.skillName) continue;
        if (!map.has(b.skillName)) map.set(b.skillName, []);
        map.get(b.skillName).push({ item: it, cost: b.cost || 1 });
      }
    }
    return map;
  };
  const rpgUi = createRpgUi({
    state: rpgState,
    normalizeEffectTag,
    isSkillActionable: (hero, skill) => !!callCmd('canUse', skill),
    skillDisabledReason: (skill) => callCmd('skillReason', skill) || '不可用',
    prepareSkillTarget: (idx) => { uiSound('select'); callCmd('onSkill', idx); },
    skillHasBarrierTag: (skill) => !!(skill && skill.barrierSub),
    hasEnoughBindings: (hero, skill) => {
      const binds = getHeroItemBindings(hero).get(skill && skill.name);
      if (!binds) return true;
      return binds.every(({ item, cost }) => item.category === '道具' ? (item.maxUses <= 0 || (item.usesRemaining ?? 0) >= cost) : (item.count || 0) >= cost);
    },
    isSummonBlockedByLimit: () => false,
    getHeroItemBindings,
    itemBindingKnowledge: new Map(),
    itemStatus: (item, child) => callCmd('itemStatus', item, child),
    prepareItemTarget: (idx) => { uiSound('select'); callCmd('onItem', idx); },
    prepareGroupedItemSkill: (idx, childIdx) => { uiSound('select'); callCmd('onItem', idx, childIdx); },
    handleBasicAttack: () => { rpgUi.closeBasicMenu(); uiSound('select'); callCmd('onAttack'); },
    handleBasicDefend: () => {},
    handleBasicRetreat: () => {},
    cancelTargeting: () => callCmd('onCancel'),
    // 原版 getSkillGroupChildren 同口径：按 parentName 从平铺数组现查
    getSkillGroupChildren: (hero, parent) => (!hero || !Array.isArray(hero.skills) || !parent || !parent.isGroup) ? [] : hero.skills.filter(s => s && s._inGroup && s.parentName === parent.name),
  });
  rpgUi.bind(root);
  // 编辑器模板（原版提取）内联处理器按原版口径调用全局函数；下拉浮层外按下即收起、标签槽联动威力禁用（原版顶层监听同口径）
  for (const n of ['openSkillTypeCombo', 'filterSkillTypeCombo', 'applySkillTypeCombo', 'closeSkillTypeCombo', 'togglePillClass']) window[n] = rpgUi[n];
  const onComboDown = e => {
    const pop = document.getElementById('skill-type-combo-popup');
    if (!pop || pop.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.skill-type-combo') === pop.__comboBtn) return;
    rpgUi.closeSkillTypeCombo();
  };
  document.addEventListener('mousedown', onComboDown);
  root.addEventListener('change', e => { const s = e.target; if (s.tagName === 'SELECT' && /^edit-.*-type\d?$/.test(s.id)) rpgUi.syncGrantSlotPower(s); });
  // 物品与技能各走宿主的状态和瞄准入口。

  function faceHtml(u, cls) {
    if (u.emoji) return '<span class="' + cls + ' t-face-emoji">' + ESC(u.emoji) + '</span>';
    if (u.avatarUrl) return '<span class="' + cls + '"><img src="' + ESC(u.avatarUrl) + '" alt="" draggable="false" referrerpolicy="no-referrer"></span>';
    return '<span class="' + cls + ' t-avatar-missing"><b class="t-avatar-missing-mark">头像缺失</b></span>';
  }

  // ---------- 我方卡片 ----------
  // 布局（33号远征队式）：半身肖像出框 + 斜切铭牌（名字/职业 · HP 条内数值与护盾 · 分段 MP · TP 细线）；五项有效属性收进悬停浮层（相对基础值着色）
  const STAT_KEYS = [['atk', '攻', '攻击'], ['def', '防', '防御'], ['hit', '命', '命中'], ['eva', '避', '回避'], ['spd', '速', '速度']];
  function cardHtml(u) {
    const res = (cls, label) => '<span class="t-hero-res ' + cls + '"><span class="t-hero-res-h"><em>' + label + '</em><b></b></span><i class="t-bar"><i class="t-bar-fill"></i></i></span>';
    const key = (CLASS_STYLE[(u.classType || '').trim()] || { key: 'default' }).key;
    return '<button class="t-hero-card t-hc-' + key + '" data-unit-id="' + ESC(u.id) + '">' +
      faceHtml(u, 't-hero-avatar') +
      '<span class="t-hero-info"><span class="t-hero-row"><b title="' + ESC(u.name) + '">' + ESC(u.name) + '</b>' + (u.classType ? '<em class="t-hero-cls">' + ESC(u.classType) + '</em>' : '') + '</span>' +
        '<i class="t-bar t-bar-hp"><i class="t-bar-ghost"></i><i class="t-bar-fill"></i><i class="t-bar-shield"></i><span class="t-hero-hpnum"></span></i>' +
        '<span class="t-hero-res2">' + res('t-res-mp', 'MP') + res('t-res-tp', 'TP') + '</span>' +
      '</span>' +
      '<span class="t-hero-stats">' + STAT_KEYS.map(([k, n]) => '<span class="t-hs" data-k="' + k + '"><em>' + n + '</em><b>-</b></span>').join('') + '</span>' +
      '<span class="t-hero-status"></span></button>';
  }
  // 英雄卡状态徽章（卡片上沿外侧一行，完整文案）
  function setHeroStatus(id, html) {
    const el = cardOf(id)?.querySelector('.t-hero-status');
    if (el && el.innerHTML !== html) el.innerHTML = html;
  }
  // 单位检视卡（右上浮层；html 为空即隐藏）
  const inspector = document.createElement('div');
  inspector.className = 't-inspector';
  inspector.hidden = true;
  root.appendChild(inspector);
  function showInspector(html) {
    if (!html) { inspector.hidden = true; return; }
    if (inspector.innerHTML !== html) inspector.innerHTML = html;
    inspector.hidden = false;
  }
  // 友方支援单位不占底栏：贴屏幕右缘的竖排收纳签（单个目标一签，只放 emoji；低血红边 / 倒下灰显 / 当前行动金光）；
  // 点签 = 把右上检视卡（与敌方同一张图鉴卡）固定到该单位，再点收起；固定期间悬停别的单位仍临时切换查看。
  const allyOf = id => els.allies.querySelector('[data-unit-id="' + CSS.escape(id) + '"]');
  function renderAllies(allies) {
    const key = allies.map(u => u.id).join('|');
    if (els.allies.dataset.key !== key) {
      if (state.allyPinned && !allies.some(u => u.id === state.allyPinned)) { state.allyPinned = null; if (state.onAllyPin) state.onAllyPin(null); }
      els.allies.innerHTML = allies.map(u => {
        const name = ESC(u.name);
        return '<div class="t-ally-row ' + (u.isSummon ? 't-ally-summon' : 't-ally-temp') + '" data-unit-id="' + ESC(u.id) + '">' +
          '<button type="button" class="t-ally-tab" aria-label="' + name + '" title="' + name + (u.isSummon ? ' · 召唤物' : ' · 临时友军') + ' · 点击查看图鉴" aria-pressed="' + (state.allyPinned === u.id) + '">' +
            faceHtml(u, 't-ally-face') + '</button></div>';
      }).join('');
      els.allies.dataset.key = key;
    }
    els.allies.hidden = !allies.length;
    for (const u of allies) setAllyBars(u.id, u.bars);
    markCards();
  }
  els.allies.addEventListener('click', e => {
    const btn = e.target.closest('.t-ally-tab');
    if (!btn) return;
    const id = btn.parentElement.dataset.unitId;
    state.allyPinned = state.allyPinned === id ? null : id;
    els.allies.querySelectorAll('.t-ally-tab').forEach(b => b.setAttribute('aria-pressed', String(b.parentElement.dataset.unitId === state.allyPinned)));
    uiSound('select');
    if (state.onAllyPin) state.onAllyPin(state.allyPinned);
  });
  // 收纳签只表达存亡与危机：低血红边 / 倒下灰显（数值看展开的图鉴卡）
  function setAllyBars(id, bars) {
    const row = allyOf(id);
    if (!row) return;
    row.classList.toggle('t-down', bars.hp <= 0);
    row.classList.toggle('t-low', bars.hp > 0 && bars.hp / (bars.maxHp || 1) < 0.3);
  }
  function renderHeroes(units, heroCardIds) {
    state.units = units;
    const friendlies = units.filter(u => u.side === 'hero');
    const heroes = friendlies.filter(u => !u.isSummon && (!heroCardIds || heroCardIds.has(u.id))).slice(0, 4);
    const heroIds = new Set(heroes.map(u => u.id));
    renderAllies(friendlies.filter(u => !heroIds.has(u.id)));
    const keyNow = heroes.map(u => u.id).join('|');
    if (els.heroes.dataset.key !== keyNow) {
      els.heroes.innerHTML = heroes.map(cardHtml).join('');
      els.heroes.dataset.key = keyNow;
      els.heroes.querySelectorAll('.t-hero-card').forEach(card => {
        card.addEventListener('click', () => { uiSound('select'); if (state.onUnitClick) state.onUnitClick(card.getAttribute('data-unit-id')); });
        const img = card.querySelector('img');
        if (img) img.addEventListener('error', () => card.querySelector('.t-hero-avatar').classList.add('t-avatar-missing'), { once: true });
      });
    }
    for (const u of heroes) setHeroBars(u.id, u.bars, { instant: true });
    markCards();
  }
  function cardOf(id) { return els.heroes.querySelector('.t-hero-card[data-unit-id="' + CSS.escape(id) + '"]'); }
  function setHeroBars(id, bars, { instant = false, hit = false, heal = false } = {}) {
    const card = cardOf(id);
    if (!card) { setAllyBars(id, bars); return; }
    const fill = card.querySelector('.t-bar-hp .t-bar-fill'), ghost = card.querySelector('.t-bar-hp .t-bar-ghost');
    // 护盾叠在 HP 末端；HP+盾超过上限时整条按 (HP+盾) 等比压缩
    const shield = Math.max(0, bars.shield || 0), scale = Math.max(bars.maxHp, Math.max(0, bars.hp) + shield);
    const w = pct(bars.hp, scale) + '%';
    fill.style.width = w;
    const sh = card.querySelector('.t-bar-shield'), shW = pct(shield, scale) + '%';
    if (shield < (card._shield || 0)) { sh.classList.remove('t-bar-shield-hit'); void sh.offsetWidth; sh.classList.add('t-bar-shield-hit'); }
    card._shield = shield;
    sh.style.left = w; sh.style.width = shW;
    // MP / TP：数值随条显示（TP 上限缺省 100）
    const ref = (state.units || []).find(u => u.id === id)?.ref || {};
    const setRes = (cls, v, max) => {
      const box = card.querySelector('.' + cls);
      box.querySelector('.t-bar-fill').style.width = pct(v, max) + '%';
      flashNum(box.querySelector('b'), Math.max(0, Math.round(v)), '<small>/' + max + '</small>');
    };
    setRes('t-res-mp', bars.mp ?? ref.mp ?? 0, bars.maxMp || 0);
    const tp = bars.tp ?? ref.tp ?? 0, maxTp = ref.maxTp || 100;
    setRes('t-res-tp', tp, maxTp);
    // TP 能量态（驱动头像火焰档位）：50<TP<100 中等偏亮，满值大型火焰；从未满跨入满值时爆发一次（火星喷射 + 扩散方环 + 音）
    const full = tp >= maxTp;
    card.classList.toggle('t-tp-half', tp > 50 && !full);
    card.classList.toggle('t-tp-full', full);
    if (full && card._tpFull === false && bars.hp > 0) {
      card.classList.remove('t-tp-burst'); void card.offsetWidth; card.classList.add('t-tp-burst');
      clearTimeout(card._burstT); card._burstT = setTimeout(() => card.classList.remove('t-tp-burst'), 1300);
      uiSound('tpFull');
    }
    card._tpFull = full;
    card.querySelector('.t-hero-hpnum').innerHTML = '<b>' + Math.max(0, Math.round(bars.hp)) + '</b><small>/' + bars.maxHp + '</small>' + (shield > 0 ? '<em class="t-hero-shnum">+' + Math.round(shield) + '</em>' : '');
    card.classList.toggle('t-shielded', shield > 0);
    card.classList.toggle('t-low', bars.hp > 0 && bars.hp / bars.maxHp < 0.3);
    clearTimeout(ghost._t);
    if (instant) { ghost.style.transition = 'none'; ghost.style.width = w; }
    else { ghost._t = setTimeout(() => { ghost.style.transition = 'width 500ms cubic-bezier(0.3,0,0.2,1)'; ghost.style.width = w; }, 450); }
    if (hit) { card.classList.remove('t-card-hit'); void card.offsetWidth; card.classList.add('t-card-hit'); }
    if (heal) { card.classList.remove('t-card-heal'); void card.offsetWidth; card.classList.add('t-card-heal'); }
    card.classList.toggle('t-down', bars.hp <= 0);
  }
  // 数值变化时闪一下（升绿降紫）；首次写入不闪
  function flashNum(el, value, tail = '') {
    const prev = el._v;
    el._v = value;
    el.innerHTML = value + tail;
    if (prev == null || prev === value) return;
    el.classList.remove('t-num-up', 't-num-down'); void el.offsetWidth;
    el.classList.add(value > prev ? 't-num-up' : 't-num-down');
  }
  // 卡片属性行：有效值相对基础值着色；悬停显示 基础 ± 加成
  function setHeroStats(id, eff, base) {
    const card = cardOf(id);
    if (!card || !eff) return;
    for (const [k, , title] of STAT_KEYS) {
      const now = k === 'eva' ? (eff.evasion || 0) + eff.eva : eff[k];
      const b0 = k === 'eva' ? (eff.evasion || 0) + (base?.eva || 0) : base?.[k];
      const chip = card.querySelector('.t-hs[data-k="' + k + '"]'), d = b0 == null ? 0 : now - b0;
      flashNum(chip.querySelector('b'), now);
      chip.classList.toggle('t-up', d > 0); chip.classList.toggle('t-down', d < 0);
      chip.title = title + ' ' + now + (d ? '（基础 ' + b0 + ' ' + (d > 0 ? '+' : '') + d + '）' : '');
    }
  }
  function markCards() {
    let current = false;
    els.heroes.querySelectorAll('.t-hero-card').forEach(c => {
      const id = c.getAttribute('data-unit-id');
      c.classList.toggle('t-selected', id === state.selectedId);
      c.classList.toggle('t-current', id === state.currentId);
      current = current || id === state.currentId;
    });
    els.heroes.classList.toggle('t-has-current', current);   // 有我方行动者时其余卡压暗
    els.allies.querySelectorAll('.t-ally-row').forEach(r => r.classList.toggle('t-current', r.dataset.unitId === state.currentId));
  }
  // 职业被动资源到账：卡片描边闪职业色 + 卡片上方弹出图标数值
  function flashHeroPassive(id, text, color) {
    const card = cardOf(id);
    if (!card) return;
    card.style.setProperty('--pc', color);
    card.classList.remove('t-card-passive'); void card.offsetWidth; card.classList.add('t-card-passive');
    const pop = document.createElement('span');
    pop.className = 't-card-pop';
    pop.textContent = text;
    card.appendChild(pop);
    setTimeout(() => pop.remove(), 1200);
  }

  // ---------- 行动条：原版 renderTurnQueue（伪 state.actionQueue；uid = 单位 ID，FLIP/聚焦冲击按单位稳定） ----------
  // 队列项 ref 按单位持久：原版子菜单（openAttackSkillMenu 等）从 state.actionQueue[queueIndex].ref 取当前角色的技能/资源
  const refs = new Map();
  function refOf(u) {
    let r = refs.get(u.id);
    if (!r) { r = { id: u.id, isSummon: false }; refs.set(u.id, r); }
    return Object.assign(r, { name: u.name, img: u.avatarUrl || null, emoji: u.emoji || null, isAlive: true });
  }
  function renderQueue(queue, currentId) {
    const key = queue.map(r => r.unitId).join('|');
    if (els.turnOrder.dataset.key === key && els.turnOrder.dataset.cur === (currentId || '')) return false;
    const prevKey = els.turnOrder.dataset.key || '';
    rpgState.actionQueue = queue.map(row => {
      const u = state.units.find(x => x.id === row.unitId);
      if (!u) return null;
      return { uid: u.id, type: u.side === 'hero' ? 'hero' : 'enemy', ref: refOf(u) };
    }).filter(Boolean);
    rpgState.queueIndex = 0;
    rpgState.isGameStarted = !!currentId;
    rpgUi.renderTurnQueue();
    els.turnOrder.querySelectorAll('.turn-queue-item').forEach(q => q.setAttribute('data-unit-id', q.getAttribute('data-item-uid')));
    els.turnOrder.dataset.key = key; els.turnOrder.dataset.cur = currentId || '';
    return prevKey && prevKey !== key ? { prev: prevKey.split('|'), next: key.split('|') } : false;
  }
  els.turnOrder.addEventListener('click', e => {
    const q = e.target.closest('.turn-queue-item');
    if (q && state.onUnitClick) { uiSound('select'); state.onUnitClick(q.getAttribute('data-item-uid')); }
  });
  function renderTurnOrder(units) { renderQueue(units.map(u => ({ unitId: u.id, nextActionAt: 0 })), units[0] && units[0].id); }

  // ---------- 技能栏：原版菜单（四主项/子菜单/技能卡/父子组卡/物品卡/目标面板/非玩家回合遮罩） ----------
  // cmd = { unit, playable, terminal, resources, canUse(skill), onSkill(idx), onAttack(), onEnd(), onCancel(), aimHint, endArmed }
  function renderCommand(cmd) {
    state.cmd = cmd;
    const u = cmd && cmd.unit;
    const enemyTurn = !!(u && u.side !== 'hero' && !cmd.terminal);
    els.enemyOverlay.classList.toggle('opacity-0', !enemyTurn);
    els.enemyOverlay.classList.toggle('pointer-events-none', !enemyTurn);
    if (!u) { els.activeHeroName.textContent = '等待指令'; state.menuKey = ''; rpgUi.closeAllSubMenus(); showTarget(null); renderStrip(null); renderCharge(null); return; }
    const r = cmd.resources;
    // 标题栏保留原版尺寸：只放回合名与结束回合；资源条贴在菜单卡外沿上方，动作并入「基础行动」二级菜单，菜单内零挤压
    els.activeHeroName.innerHTML = '<span class="t-turn-title">' + rpgUi.escapeHistoryHtml(u.name) + (cmd.terminal ? ' · 战斗结束' : ' 的回合') + '</span>' +
      (cmd.playable ? '<button class="t-end-btn' + (cmd.endArmed ? ' t-armed' : '') + '" data-tactics-end title="结束回合（Space）">' +
        (cmd.endArmed ? '⚠️ 确认结束' : '⏳ 结束回合') + '<kbd>Space</kbd></button>' : '');
    renderStrip(cmd);
    if (!cmd.playable) { state.menuKey = ''; rpgUi.closeAllSubMenus(); showTarget(null); renderCharge(null); return; }
    // 技能卡按资源变化重建（原版 updateSkillMenus：每次渲染折叠变体组）；同一资源态不重建，保留展开与滚动
    const prep = cmd.preparation;
    const menuKey = u.id + '|' + u.ref.mp + '|' + (r ? r.main + ':' + r.aux + ':' + (r.universal || 0) : '') + '|' + (cmd.serial || 0) + '|' + (prep ? prep.remaining + ':' + prep.invested : '') + '|' + u.skills.map(s => s.usesRemaining + ':' + s.maxUses).join(',');
    const hero = Object.assign(refOf(u), { skills: u.skills, items: u.items || [], mp: u.ref.mp, hp: u.ref.hp, tp: u.ref.tp || 0, burstActivated: false });
    if (menuKey !== state.menuKey) {
      if (state.menuKey.split('|')[0] !== u.id) { rpgUi.closeAllSubMenus(); state.chargeAside = false; state.costFilter = null; }
      state.menuKey = menuKey;
      rpgUi.updateSkillMenus(hero);
      decorateSkillCards(u);
    } else {
      decorateSkillCards(u);
    }
    renderBasic(cmd);
    renderCharge(cmd);
    showTarget(cmd.aimHint || null);
  }
  // ---------- 资源条：移动额度（冲刺追加段异色）+ 主/辅点数格 + 蓄力入口；悬停技能/动作/落点时预告花费 ----------
  function renderStrip(cmd) {
    const u = cmd && cmd.unit, r = cmd && cmd.resources;
    if (!u || u.side !== 'hero' || !r || cmd.terminal) { els.strip.hidden = true; state.pipKey = ''; return; }
    els.strip.hidden = false;
    const key = u.id + '|' + (cmd.serial || 0);
    if (state.pipKey !== key) {
      state.pipKey = key; state.pipPrev = null;
      state.pipMax = { main: Math.max(1, r.main), aux: Math.max(1, r.aux) };
      state.moveCap = Math.max(r.moveMax || 0, r.moveRemaining);
    }
    state.pipMax.main = Math.max(state.pipMax.main, r.main);
    state.pipMax.aux = Math.max(state.pipMax.aux, r.aux);
    state.moveCap = Math.max(state.moveCap, r.moveRemaining);
    const prev = state.pipPrev || { main: r.main, aux: r.aux };
    const pips = (kind, max, now, was) => {
      let h = '';
      for (let i = 0; i < max; i++) h += '<i class="t-pip t-pip-' + kind + (i < now ? ' t-on' : '') + (i >= now && i < was ? ' t-pip-break' : '') + '"></i>';
      return h;
    };
    state.pipPrev = { main: r.main, aux: r.aux };
    const cap = state.moveCap || 1, sprint = Math.min(r.sprintRemaining || 0, r.moveRemaining), base = r.moveRemaining - sprint;
    const prep = cmd.preparation;
    const charge = prep ? '<button class="t-res-charge' + (prep.ready ? ' t-ready' : '') + '" data-tactics-charge title="蓄力面板"><span class="t-charge-name">' +
      (prep.ready ? '⚡ ' : '⏳ ') + ESC(prep.skill && prep.skill.name) + '</span><b class="t-charge-progress">' + (prep.ready ? '就绪' : prep.invested + '/' + (prep.invested + prep.remaining)) + '</b></button>' : '';
    // 点数只靠点的个数表达；万能点为临时获得，0 点时整组隐藏
    const uni = r.universal || 0;
    const uniGroup = uni > 0 ? '<span class="t-res-action-group t-uni-group"><span class="t-res-lab t-universal" title="万能行动点：剩余 ' + uni + ' 点 · 可支付主行动或辅助行动">万能</span>' +
      Array.from({ length: uni }, () => '<i class="t-pip t-pip-universal t-on"></i>').join('') + '</span>' : '';
    els.strip.innerHTML =
      '<div class="t-res-move" title="剩余移动额度' + (sprint > 0 ? '（含冲刺 ' + sprint.toFixed(1) + 'm）' : '') + '">' +
        '<span class="t-res-ico">🦶</span><span class="t-res-track"><i class="t-res-base" style="width:' + (base / cap * 100).toFixed(1) + '%"></i>' +
        '<i class="t-res-sprint" style="width:' + (sprint / cap * 100).toFixed(1) + '%"></i><i class="t-res-cost"></i></span>' +
        '<b class="t-res-num">' + r.moveRemaining.toFixed(1) + '<small>/' + (+cap.toFixed(1)) + 'm</small></b></div>' +
      '<div class="t-res-pips"><span class="t-res-action-group"><button class="t-res-lab' + (state.costFilter === 'main' ? ' t-filter-on' : '') + '" data-cost-filter="main" title="主行动：剩余 ' + r.main + ' 点 · 攻击技能、冲刺、背起 · 点击只看消耗主行动的技能">主</button>' + pips('main', state.pipMax.main, r.main, prev.main) + '</span>' +
        '<span class="t-res-action-group"><button class="t-res-lab t-aux' + (state.costFilter === 'aux' ? ' t-filter-on' : '') + '" data-cost-filter="aux" title="辅助行动：剩余 ' + r.aux + ' 点 · 跳跃、推动、辅助技能 · 点击只看消耗辅助行动的技能">辅</button>' + pips('aux', state.pipMax.aux, r.aux, prev.aux) + '</span>' +
        uniGroup + charge + '</div>';
    if (state.moveCost != null) previewMoveCost(state.moveCost);
  }
  function previewMoveCost(cost) {
    state.moveCost = cost;
    const r = state.cmd && state.cmd.resources, el = els.strip.querySelector('.t-res-cost');
    if (!el || !r) return;
    if (cost == null || !(cost > 0)) { el.style.width = '0'; els.strip.classList.remove('t-previewing'); return; }
    const cap = state.moveCap || 1, c = Math.min(cost, r.moveRemaining);
    el.style.left = ((r.moveRemaining - c) / cap * 100).toFixed(1) + '%';
    el.style.width = (c / cap * 100).toFixed(1) + '%';
    els.strip.classList.add('t-previewing');
  }
  function previewPips(main, aux, universal = 0) {
    els.strip.querySelectorAll('.t-pip-will').forEach(p => p.classList.remove('t-pip-will'));
    const mark = (kind, n) => { const on = [...els.strip.querySelectorAll('.t-pip-' + kind + '.t-on')]; on.slice(Math.max(0, on.length - n)).forEach(p => p.classList.add('t-pip-will')); };
    if (main > 0) mark('main', main);
    if (aux > 0) mark('aux', aux);
    if (universal > 0) mark('universal', universal);
  }
  // ---------- 基础行动：原版二级菜单内改两列格子（普攻 + 战棋动作 + 未迁移的防御/撤离）；每格写明花费与「立即/选目标」 ----------
  function renderBasic(cmd) {
    const list = cmd.basic || [];
    const key = JSON.stringify([list, cmd.resources && [cmd.resources.main, cmd.resources.aux, cmd.resources.universal]]);
    if (key === state.basicKey) return;
    state.basicKey = key;
    const costText = c => !c ? '免费' : [c.main ? '主' + c.main : '', c.aux ? '辅' + c.aux : ''].filter(Boolean).join('+');
    const tile = a => {
      const off = !a.ok;
      const actionKind = a.cost && a.cost.main ? 'main' : a.cost && a.cost.aux ? 'aux' : null;
      const pay = actionKind ? actionPayment(cmd.resources || {}, actionKind, (a.cost.main || 0) + (a.cost.aux || 0)) : null;
      const attr = a.key === 'attack' ? 'data-rpg-ui-act="handleBasicAttack"' : a.key === 'unmigrated' ? 'data-tactics-unmigrated="' + ESC(a.name) + '"' : 'data-tactics-action="' + ESC(a.key) + '"';
      const sub = off ? ESC(a.short || a.reason || '不可用')
        : (a.mode === 'instant' ? '⚡立即 ' : '🎯选目标 ') + costText(a.cost) + (a.note ? '·' + ESC(a.note) : '');
      return '<button class="t-bact t-bact-' + ESC(a.tone || 'cyan') + (off ? ' t-bact-off' : '') + '" ' + attr +
        (off ? ' aria-disabled="true"' : '') + ' title="' + ESC(off ? a.reason || '' : a.desc || a.name) + '"' +
        ' data-cost-main="' + ((pay && pay.mainCost) || 0) + '" data-cost-aux="' + ((pay && pay.auxCost) || 0) + '" data-cost-universal="' + ((pay && pay.universalCost) || 0) + '">' +
        '<span class="t-bact-ico">' + a.icon + '</span><span class="t-bact-body"><b>' + ESC(a.name) + '</b><i>' + sub + '</i></span></button>';
    };
    const fixed = [
      // 防御姿态已进 main 的 basicActions（走 onAction('defend') 规则通道）；撤离仍未迁移
      { key: 'unmigrated', icon: '🏃', name: '尝试撤离', ok: false, reason: '尝试撤离：战棋未迁移（见 P07-MIGRATION）', short: '🚧 战棋未迁移', tone: 'purple' },
    ];
    els.basicList.className = 't-bact-grid';
    els.basicList.innerHTML = list.concat(fixed).map(tile).join('');
  }
  // ---------- 蓄力：复用原版 #charge-menu 槽（准备中替换四个主项）；可暂离去做移动/其他动作，资源条蓄力徽章随时回来 ----------
  function planText(plan, from) {
    if (!plan) return '';
    const parts = [];
    if (plan.inventory) parts.push('加速×' + plan.inventory);
    if (plan.skillMain) parts.push('技能主×' + plan.skillMain);
    if (plan.main) parts.push('◆主×' + plan.main);
    if (plan.aux) parts.push('◇辅×' + plan.aux);
    if (plan.universal) parts.push('万能×' + plan.universal);
    return (parts.length ? '<small>' + (plan.stationary ? '另耗 ' : '消耗 ') + parts.join(' + ') + '</small>' : '') +
      '<b class="t-prep-delta">准备 ' + from + '→' + plan.after + (plan.after === 0 ? ' · 就绪' : '') + '</b>';
  }
  // 蓄力卡紧凑一行：消耗 + 结果（完整「消耗 / 准备 N→M」进悬停提示）
  function planShort(plan) {
    const parts = [];
    if (plan.inventory) parts.push('加速' + plan.inventory);
    if (plan.skillMain) parts.push('技主' + plan.skillMain);
    if (plan.main) parts.push('◆' + plan.main);
    if (plan.aux) parts.push('◇' + plan.aux);
    if (plan.universal) parts.push('✦' + plan.universal);
    return (parts.length ? parts.join(' ') + ' → ' : '') + (plan.after === 0 ? '就绪' : '剩 ' + plan.after);
  }
  const plainText = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  function prepPips(invested, remaining, plan) {
    const total = invested + remaining, gain = plan ? remaining - plan.after : 0;
    return '<span class="t-prep-pips" aria-hidden="true">' + Array.from({ length: total }, (_, i) =>
      '<i class="' + (i < invested ? 'on' : i < invested + gain ? 'next' : '') + '"></i>').join('') + '</span>';
  }
  function renderCharge(cmd) {
    const prep = cmd && cmd.playable ? cmd.preparation : null;
    const sta = (cmd && cmd.stationary) || { available: false };
    const key = prep ? [cmd.unit.id, cmd.serial, prep.skill && prep.skill.name, prep.remaining, prep.ready, cmd.resources.main, cmd.resources.aux, cmd.resources.universal, cmd.chargeInventory, cmd.preparePayment && JSON.stringify(cmd.preparePayment), cmd.continueReason, sta.ok, sta.reason, sta.movement, sta.payment && JSON.stringify(sta.payment)].join('|') : '';
    if (!prep) state.chargeAside = false;
    const show = !!prep && !state.chargeAside;
    els.menuBox.classList.toggle('t-charge-open', show);
    els.menuMain.style.display = show ? 'none' : '';
    els.chargeMenu.style.display = show ? 'flex' : 'none';
    if (!show || key === state.chargeKey) { if (!show) state.chargeKey = ''; return; }
    state.chargeKey = key;
    const name = ESC(prep.skill && prep.skill.name);
    const canContinue = !!cmd.preparePayment;
    const canStationary = !!sta.payment;
    const go = cmd.preparePayment, still = sta.payment;
    const invested = prep.invested || 0, total = invested + prep.remaining;
    // 三行：标题（名字 + 进度格 + 计数）/ 两个并排动作（不可用原因进悬停）/ 两个文字链接
    const head = '<div class="t-prep-head"><span class="t-prep-title">' + (prep.ready ? '⚡ ' : '⏳ ') + name + '</span>' + prepPips(invested, prep.remaining, null) +
      '<b class="t-prep-count">' + (prep.ready ? '就绪' : invested + '/' + total) + '</b></div>';
    const goReason = cmd.continueReason || '主行动、辅助行动或万能行动点不足';
    const goBtn = '<button data-tactics-action="prepare" class="t-prep-btn t-prep-go"' + (canContinue ? ' title="' + ESC(plainText(planText(go, prep.remaining))) + '"' : ' aria-disabled="true" title="' + ESC(goReason) + '"') + '>' +
      '<b>继续准备</b><small>' + (canContinue ? ESC(planShort(go)) : '资源不足') + '</small></button>';
    const stillBtn = !sta.available ? '' : '<button data-tactics-action="stationary-prepare" class="t-prep-btn t-prep-still"' +
      (canStationary ? ' title="' + ESC('驻足：移动 ' + sta.movement.toFixed(1) + 'm→0 抵 1 点 · ' + plainText(planText(still, prep.remaining))) + '"' : ' aria-disabled="true" title="' + ESC(sta.reason) + '"') + '>' +
      '<b>驻足继续</b><small>' + (canStationary ? ESC(planShort(still)) : /驻足需满额移动/.test(sta.reason) ? '需满额移动' : ESC(sta.reason)) + '</small></button>';
    const links = '<div class="t-prep-links"><button data-tactics-action="cancel-charge" class="t-prep-link t-prep-cancel" title="已付资源不退">终止蓄力</button>' +
      '<button data-tactics-charge-aside class="t-prep-link t-charge-aside" title="暂离蓄力面板去移动/跳跃，资源条的蓄力徽章可随时回来">先做其他行动 ↩</button></div>';
    els.chargeMenu.innerHTML = prep.ready
      ? head + '<button data-tactics-action="release" class="t-prep-release"><b>释放【' + name + '】</b><small>进入目标选择</small></button>' + links
      : head + '<div class="t-prep-row">' + goBtn + stillBtn + '</div>' + links;
  }
  // 战棋专有信息：技能卡第二行末尾追加空间范围胶囊——沿用原版修饰胶囊样式（同 🎯命中值胶囊：灰底细边 + 等宽数值）
  // 与原版标签悬浮提示引擎（data-tagtip-*）；原版打开子菜单会重建列表，按列表变化补挂
  const ATTR = t => rpgUi.escapeHistoryHtml(t);
  function rangePill(r, blink) {
    let label, num, title, body;
    if (blink) { label = '闪现'; num = blink.distance + 'm'; title = '【位移·闪现】'; body = '选择 ' + blink.distance + ' 米内本人可见的空地；不扣步行额度，不能跨越敌方结界。'; }
    else if (r.type === '自身') { label = '自身'; num = '自身'; title = '【范围·自身】'; body = '只作用于施法者自身；不选择目标，不受射程与视线限制（效果槽可另配「自身覆盖」指向其它对象）。'; }
    else if (r.type === '单体') { label = '射程'; num = (r.castRange || 0) + 'm'; title = '【范围·单体】'; body = '选择 ' + (r.castRange || 0) + ' 米内、视线无遮挡的一名敌人；墙体与高障碍会阻挡视线，低矮掩体不阻挡。'; }
    else if (r.type === '直线') { label = '直线'; num = r.length + '×' + (r.width || 1) + 'm'; title = '【范围·直线】'; body = '自施法者向瞄准方向延伸 ' + r.length + ' 米、宽 ' + (r.width || 1) + ' 米，命中路径上所有敌人；遇墙截断。'; }
    else if (r.type === '扇形') { label = '扇形'; num = r.castRange + 'm·' + r.angle + '°'; title = '【范围·扇形】'; body = '以施法者为圆心、半径 ' + r.castRange + ' 米、张角 ' + r.angle + '° 的扇形，命中其中所有敌人；遇墙截断。'; }
    else if (r.type === '圆形') { label = '圆形'; num = (r.castRange ?? 0) + 'm·r' + r.radius; title = '【范围·圆形】'; body = '在 ' + (r.castRange ?? 0) + ' 米内选择落点，命中半径 ' + r.radius + ' 米圆内所有敌人；墙后格不受影响。'; }
    else if (r.type === '全域') { label = '全域'; num = '全图'; title = '【范围·全域】'; body = '覆盖整张地图，命中所有敌人；不受射程与视线限制。'; }
    else if (r.type === '爆炸') { label = '爆炸'; num = r.castRange + 'm·r' + r.radius; title = '【范围·爆炸】'; body = '向 ' + r.castRange + ' 米内瞄准点发射，途中撞到墙或单位即提前引爆；以引爆点为圆心、半径 ' + r.radius + ' 米范围内的敌人受击。'; }
    else if (r.type === '召唤') { label = '召唤'; num = (r.castRange ?? 8) + 'm'; title = '【范围·召唤】'; body = '在 ' + (r.castRange ?? 8) + ' 米内选择空闲合法空地召唤单位入场（需容纳召唤物体型）。'; }
    else return '';
    return '<span class="t-range-pill text-[8px] px-1 py-0.2 rounded border bg-slate-900 text-slate-400 border-slate-700 shrink-0 flex items-center leading-none"' +
      ' data-tagtip-title="' + ATTR(title) + '" data-tagtip-body="' + ATTR(body) + '" data-tagtip-raw="' + ATTR(blink ? '[位移:闪现]' : '[范围:' + r.type + ']') + '">' +
      label + '<span class="opacity-90 font-mono-num ml-0.5">' + num + '</span></span>';
  }
  function decorateSkillCards(u) {
    if (!u) return;
    const resources = state.cmd?.resources || {};
    const costOf = s => {
      const kind = skillActionKind(s), pay = actionPayment(resources, kind, 1, true);
      return { main: pay.mainCost || 0, aux: pay.auxCost || 0, universal: pay.universalCost || 0, skillMain: pay.skillMainCost || 0, kind };
    };
    const kidsOf = s => s.isGroup ? u.skills.filter(c => c._inGroup && c.parentName === s.name) : [];
    const matches = s => { const k = kidsOf(s); if (k.length) return k.some(matches); return !state.costFilter || skillActionKind(s) === state.costFilter; };
    root.querySelectorAll('#attack-skill-list [data-skill-idx], #support-skill-list [data-skill-idx]').forEach(btn => {
      const s = u.skills[Number(btn.dataset.skillIdx)];
      const row = btn.children[1];
      if (!s || !row) return;
      const cost = costOf(s);
      btn.dataset.costMain = cost.main || 0; btn.dataset.costAux = cost.aux || 0; btn.dataset.costUniversal = cost.universal || 0;
      // 主/辅过滤由技能行动类型决定；普通技能卡不再重复显示行动成本。
      const costRow = btn.children[2] && btn.children[2].firstElementChild;
      costRow?.querySelectorAll('.t-act-cost').forEach(el => el.remove());
      // 主/辅过滤：不匹配的卡（组父按子项）隐藏；组内子卡单独判定
      const hide = !!state.costFilter && !matches(s);
      (s.isGroup ? btn.parentElement : btn).style.display = hide ? 'none' : '';
      // 驻足起咏（施法者）：同卡消耗行末尾一枚小签「⛩驻足 N→M」，点签＝驻足起咏、点卡身＝普通声明；详情与不可用原因放悬停提示
      const costLine = btn.children[2] && btn.children[2].firstElementChild;
      const start = costLine && costLine.querySelector('.t-card-still');
      const sta = state.cmd?.stationary || { available: false };
      const showStart = !!costLine && !hide && s.delay > 0 && !s.isGroup && sta.available && !state.cmd.preparation && state.cmd.canUse(s);
      const plan = showStart && sta.ok ? state.cmd.startPayment(s) : null;
      const startKey = showStart ? [sta.reason, sta.movement, s.delay, JSON.stringify(plan)].join('|') : '';
      const fresh = !!start && start.dataset.key === startKey;
      if (start && !fresh) start.remove();
      if (startKey && !fresh) {
        const tip = plan ? '驻足起咏：移动 ' + sta.movement.toFixed(1) + 'm→0 抵 1 点 · ' + planText(plan, s.delay).replace(/<[^>]+>/g, ' ').trim() : sta.reason;
        costLine.insertAdjacentHTML('beforeend', '<span class="t-card-still' + (plan ? '' : ' t-off') + '" role="button" data-key="' + ESC(startKey) + '" data-tactics-action="stationary-start:' + btn.dataset.skillIdx + '"' +
          (plan ? '' : ' aria-disabled="true"') + ' title="' + ESC(tip) + '">⛩驻足 ' + (plan ? s.delay + '→' + plan.after : '✕') + '</span>');
      }
      if (state.cmd && state.cmd.skillReason) {
        const reason = state.cmd.skillReason(s);
        btn.title = reason || '';
        if (reason) btn.setAttribute('aria-description', reason);
        else btn.removeAttribute('aria-description');
        // 原因常驻卡底一行（不悬停也可读；不覆盖名字/数值/范围行）
        btn.querySelector('.t-skill-reason')?.remove();
        if (reason) btn.insertAdjacentHTML('beforeend', '<div class="t-skill-reason">' + ESC(shortReason(reason)) + (shortReason(reason).includes(reason) ? '' : '<small>' + ESC(reason) + '</small>') + '</div>');
      }
      if (!s.range || row.querySelector('.t-range-pill')) return;
      const pill = rangePill(s.range, !s.isReaction && s.displacements?.find(d => d.type === '闪现'));
      if (!pill) return;
      const empty = row.querySelector('span.text-slate-500:only-child');
      if (empty) empty.remove();
      row.insertAdjacentHTML('beforeend', pill);
    });
    // 空列表提示：只在需要变化时增删（列表有 childList 监听，避免自触发循环）
    root.querySelectorAll('#attack-skill-list, #support-skill-list').forEach(list => {
      const tip = list.querySelector('.t-filter-empty'), want = state.costFilter && !listHas(list.id)
        ? '没有消耗' + (state.costFilter === 'main' ? '◆主行动' : '◇辅助行动') + '的技能 · 再点「' + (state.costFilter === 'main' ? '主' : '辅') + '」取消过滤' : '';
      if (tip && tip.textContent === want) return;
      if (tip) tip.remove();
      if (want) list.insertAdjacentHTML('beforeend', '<div class="t-filter-empty">' + want + '</div>');
    });
  }
  function decorateItemCards(u) {
    if (!u || !state.cmd?.itemStatus) return;
    const list = $('item-list');
    [...list.children].forEach((wrap, idx) => {
      const entry = u.items[idx];
      if (!entry) return;
      const parent = wrap.matches('button') ? wrap : wrap.firstElementChild;
      const decorate = (btn, item, child) => {
        if (!btn) return;
        const kinds = child ? [skillActionKind(child)] : item.children?.length ? [...new Set(item.children.map(skillActionKind))] : [skillActionKind(item)];
        const pay = actionPayment(state.cmd.resources || {}, kinds[0], 1);
        if (child || !item.children?.length) {
          btn.dataset.costMain = pay.mainCost || 0;
          btn.dataset.costAux = pay.auxCost || 0;
          btn.dataset.costUniversal = pay.universalCost || 0;
        } else {
          delete btn.dataset.costMain; delete btn.dataset.costAux; delete btn.dataset.costUniversal;
        }
        const row = btn.children[2]?.firstElementChild;
        if (!row) return;
        row.querySelectorAll('.t-act-cost').forEach(el => el.remove());
        row.insertAdjacentHTML('afterbegin', kinds.map(kind => kind === 'main'
          ? '<span class="t-act-cost t-main">主×1</span>' : '<span class="t-act-cost t-aux">辅×1</span>').join(''));
      };
      decorate(parent, entry, null);
      const childWrap = wrap.matches('button') ? null : wrap.children[1];
      if (childWrap) [...childWrap.children].forEach((btn, childIdx) => decorate(btn, entry, entry.children?.[childIdx]));
    });
  }
  const itemListObserver = new MutationObserver(() => { const u = cmdHero(); if (u) decorateItemCards(u); });
  itemListObserver.observe($('item-list'), { childList: true });

  const cardVisible = b => b.style.display !== 'none' && !(b.parentElement && b.parentElement.style.display === 'none');
  const listHas = id => [...root.querySelectorAll('#' + id + ' [data-skill-idx]')].some(cardVisible);
  // 点击资源条「主」「辅」：切换过滤并打开有匹配技能的技能栏
  function toggleCostFilter(kind) {
    state.costFilter = state.costFilter === kind ? null : kind;
    uiSound(state.costFilter ? 'select' : 'cancel');
    els.strip.querySelectorAll('[data-cost-filter]').forEach(b => b.classList.toggle('t-filter-on', b.dataset.costFilter === state.costFilter));
    const u = cmdHero();
    if (!u) return;
    decorateSkillCards(u);
    if (!state.costFilter) return;
    const has = listHas;
    const open = id => !$(id).classList.contains('translate-x-full');
    if ((open('attack-skill-menu') && has('attack-skill-list')) || (open('support-skill-menu') && has('support-skill-list'))) return;
    const target = has('attack-skill-list') ? 'openAttackSkillMenu' : has('support-skill-list') ? 'openSupportSkillMenu' : null;
    if (!target) { showLog('没有消耗' + (state.costFilter === 'main' ? '◆主行动' : '◇辅助行动') + '的可见技能', 'warn'); return; }
    rpgUi.closeAllSubMenus();
    els.menuBox.querySelector('[data-rpg-ui-act="' + target + '"]')?.click();
  }
  const listObserver = new MutationObserver(() => { const u = cmdHero(); if (u) decorateSkillCards(u); });
  ['attack-skill-list', 'support-skill-list'].forEach(id => listObserver.observe($(id), { childList: true }));
  // 原版目标面板：瞄准中显示提示 + 取消（地图上点选目标）
  function showTarget(hint) {
    els.targetMenu.classList.toggle('translate-y-full', !hint);
    if (hint) els.targetHint.innerHTML = hint;
  }
  els.menuBox.addEventListener('pointerover', e => {
    const b = e.target.closest('button');
    if (b && b !== state.hoverBtn && !b.disabled) { state.hoverBtn = b; uiSound('hover'); }
    const c = e.target.closest('[data-cost-main]');
    if (c && c.getAttribute('aria-disabled') !== 'true' && !c.classList.contains('disabled-card')) previewPips(+c.dataset.costMain, +c.dataset.costAux, +c.dataset.costUniversal);
    else previewPips(0, 0, 0);
  });
  els.menuBox.addEventListener('pointerleave', () => previewPips(0, 0));
  els.strip.addEventListener('click', e => {
    const f = e.target.closest('[data-cost-filter]');
    if (f) { toggleCostFilter(f.dataset.costFilter); return; }
    if (!e.target.closest('[data-tactics-charge]')) return;
    state.chargeAside = false; state.chargeKey = ''; uiSound('select'); rpgUi.closeAllSubMenus();
    if (state.cmd) renderCharge(state.cmd);
  });
  els.menuBox.addEventListener('click', e => {
    if (e.target.closest('[data-tactics-end]')) { e.stopPropagation(); callCmd('onEnd'); return; }
    if (e.target.closest('[data-tactics-charge-aside]')) { e.stopPropagation(); state.chargeAside = true; uiSound('cancel'); renderCharge(state.cmd); return; }
    // 不可用入口（未迁移/资源不足）：点击或触屏同样给出完整原因，战报条持久显示
    const off = e.target.closest('[aria-disabled="true"]');
    if (off) { e.stopPropagation(); uiSound('deny'); showLog(off.dataset.tacticsUnmigrated ? off.title : (off.title || '当前不可用'), 'warn', 5200); return; }
    const card = e.target.closest('[data-skill-idx]');
    if (card && card.classList.contains('disabled-card') || card && card.classList.contains('exhausted-card')) {
      const s = cmdHero() && cmdHero().skills[Number(card.dataset.skillIdx)];
      uiSound('deny'); showLog((s ? '【' + s.name + '】' : '') + (s && callCmd('skillReason', s) || '当前不可用'), 'warn', 5200); return;
    }
    const action = e.target.closest('[data-tactics-action]');
    if (action) {
      e.stopPropagation();
      const key = action.dataset.tacticsAction;
      if (key.startsWith('stationary-start:')) callCmd('onStationary', Number(key.split(':')[1]));
      else callCmd('onAction', key);
      return;
    }
    const b = e.target.closest('button[data-rpg-ui-act]');
    if (!b) return;
    const act = b.getAttribute('data-rpg-ui-act');
    if (b.disabled) { uiSound('deny'); return; }
    if (/^open/.test(act)) uiSound(rpgState.isAnimating ? 'deny' : 'select');
    else if (/^close/.test(act)) uiSound('cancel');
  }, true);

  function setBusy(on) { state.busy = !!on; rpgState.isAnimating = state.busy; els.menuBox.classList.toggle('t-busy', state.busy); }
  function closeMenus() { rpgUi.closeAllSubMenus(); showTarget(null); }
  function setCurrent(id) { state.currentId = id; markCards(); }

  // ---------- 轮次横幅 ----------
  function showBanner(u, sub) {
    const b = els.banner;
    b.querySelector('.tb-face').innerHTML = faceHtml(u, 'tb-face-in');
    b.querySelector('.tb-name').textContent = u.name;
    b.querySelector('.tb-sub').textContent = sub;
    b.className = u.side === 'hero' ? 't-hero' : 't-enemy';
    void b.offsetWidth;
    b.classList.add('t-show');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => b.classList.remove('t-show'), 1150);
  }

  function clearBattle() {
    state.history = []; state.currentId = null; state.cmd = null; state.menuKey = '';
    els.heroes.dataset.key = ''; els.turnOrder.dataset.key = '';
    els.allies.replaceChildren(); els.allies.dataset.key = ''; els.allies.hidden = true;
    refs.clear(); rpgUi.resetQueue(); rpgUi.markRoundStart(); closeMenus();
    closePanel(); setBusy(false);
  }

  // ---------- 面板 ----------
  function openPanel(title, html, cls) {
    els.panelTitle.textContent = title;
    els.panelBody.innerHTML = html;
    els.panelBox.className = cls || '';
    els.overlay.style.display = 'flex';
    els.overlay.classList.remove('t-panel-in'); void els.overlay.offsetWidth; els.overlay.classList.add('t-panel-in');
  }
  function closePanel() { els.overlay.style.display = 'none'; }
  function setHistory(lines) { state.history = lines.slice(); }
  function showHistory() {
    openPanel('📜 记录', state.history.length ? state.history.map(h => '<div class="t-history-row">' + ESC(h) + '</div>').join('') : '<div class="t-submenu-empty">当前无记录。</div>');
  }
  function showEditor() {
    const rows = state.units.map(u => '<tr><td>' + ESC((u.emoji ? u.emoji + ' ' : '') + u.name) + '</td><td>' + ESC(u.side === 'hero' ? '我方' : '敌方') + '</td><td>' +
      (u.footprint ? u.footprint.width + '×' + u.footprint.height : '1×1') + '</td><td>' + (u.bars.hp == null ? '-' : Math.max(0, u.bars.hp) + '/' + u.bars.maxHp) + '</td></tr>').join('');
    const extra = state.settings && state.settings.html ? state.settings.html() : '';
    openPanel('⚙️ 设置', extra + '<h4 class="t-panel-h">角色概览</h4><table class="t-roster-table"><tr><th>名字</th><th>阵营</th><th>体型</th><th>HP</th></tr>' + rows + '</table>');
    if (state.settings && state.settings.bind) state.settings.bind(els.panelBody);
  }
  function showDialogue() { openPanel('💬 对话', '<div class="t-submenu-empty">LLM 对话设置属后续阶段接线；本轮不调用任何生成接口。</div>'); }
  function showWorldbook() { openPanel('📚 世界书', '<div class="t-submenu-empty">世界书管理属后续阶段接线。</div>'); }
  function toggleFullScreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); }

  function openResult(type, summary, onRestart) {
    const title = type === 'victory' ? '战斗胜利' : type === 'defeat' ? '全军覆没' : '僵持';
    const sub = type === 'victory' ? '敌方已全灭' : type === 'defeat' ? '我方已全部倒地' : '无人可继续行动';
    const rows = (summary || []).map(s => '<div class="t-result-row' + (s.down ? ' t-result-down' : '') + '"><span>' + ESC(s.label) + '</span><b>' + ESC(s.value) + '</b></div>').join('');
    openPanel(title, '<div class="t-result t-result-' + type + '"><div class="t-result-title">' + title + '</div><div class="t-result-sub">' + sub + '</div>' +
      '<div class="t-result-rows">' + rows + '</div><button class="t-result-restart" id="t-result-restart">🔄 重新开始</button>' +
      '<div class="t-submenu-empty">本 Demo 不同步 MMS；也可用右上「重置」。</div></div>', 't-panel-result');
    const btn = root.querySelector('#t-result-restart');
    if (btn) btn.onclick = () => { closePanel(); if (onRestart) onRestart(); };
  }

  function toggleSpeak(kind) {
    if (kind === 'ally') state.allySpeak = !state.allySpeak; else state.enemySpeak = !state.enemySpeak;
    $('chat-ally-toggle').classList.toggle('t-toggle-on', state.allySpeak);
    $('chat-enemy-toggle').classList.toggle('t-toggle-on', state.enemySpeak);
  }
  function sendChat() {
    const text = els.chatInput.value.trim();
    if (!text) return;
    state.history.push('玩家：' + text);
    els.chatInput.value = '';
    showLog('已记录发言（旁白与 LLM 在后续阶段接线）');
  }
  function showLog(msg, tone, ms) {
    if (!msg) return;
    els.battleLog.textContent = msg;
    els.battleLog.className = 't-visible' + (tone ? ' t-log-' + tone : '');
    clearTimeout(showLog._t);
    showLog._t = setTimeout(() => els.battleLog.classList.remove('t-visible'), ms || 2600);
  }
  // ---------- 设置编辑器：原版 #editor-modal 容器（多层手风琴由 main 的编辑器模块拼装） ----------
  function openModal(html) {
    els.editorModal.innerHTML = html;
    els.editorModal.classList.remove('hidden'); els.editorModal.classList.add('flex');
  }
  function closeModal() {
    rpgUi.closeSkillTypeCombo(); rpgUi.hideTagTip();
    els.editorModal.classList.add('hidden'); els.editorModal.classList.remove('flex');
    els.editorModal.innerHTML = '';
  }

  $('btn-history').addEventListener('click', showHistory);
  $('btn-editor').addEventListener('click', () => { uiSound('select'); if (!(state.settings && state.settings.open && state.settings.open())) showEditor(); });
  $('btn-dialogue').addEventListener('click', showDialogue);
  $('btn-worldbook').addEventListener('click', showWorldbook);
  $('btn-fullscreen').addEventListener('click', toggleFullScreen);
  $('btn-music').addEventListener('click', () => { uiSound('select'); state.onMusic?.(); });
  $('btn-reset').addEventListener('click', () => { uiSound('select'); if (state.onReset) state.onReset(); });
  $('panel-close').addEventListener('click', closePanel);
  els.overlay.addEventListener('click', (e) => { if (e.target === els.overlay) closePanel(); });
  $('chat-ally-toggle').addEventListener('click', () => toggleSpeak('ally'));
  $('chat-enemy-toggle').addEventListener('click', () => toggleSpeak('enemy'));
  $('chat-send-btn').addEventListener('click', sendChat);
  els.chatInput.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') sendChat(); });

  // ---------- 反应弹窗（FX02）：独立全屏 overlay，宿主 main 经 shell.promptReaction 供攻击驱动 await ----------
  const reactionPrompt = createReactionPrompt({ root, onUiSound: (k) => uiSound(k) });

  function getSafeRect() {
    const rail = $('turn-order-rail').getBoundingClientRect();
    const topbar = $('tactics-topbar').getBoundingClientRect();
    const heroes = $('heroes-container').getBoundingClientRect();
    const menu = $('menu-container').getBoundingClientRect();
    const chat = $('chat-input-area').getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const left = Math.max(rail.right - rootRect.left, 0) + 6;
    const top = Math.max(topbar.bottom - rootRect.top, 0);
    const bottom = Math.min((heroes.height ? heroes.top : chat.top) - rootRect.top, chat.top - rootRect.top) - 6;
    const right = (menu.width ? menu.left - rootRect.left : rootRect.width) - 8;
    return { left, top, width: Math.max(120, right - left), height: Math.max(120, bottom - top) };
  }

  function setSelected(unitId) { state.selectedId = unitId; markCards(); }
  // 非可玩模式（P02 展示）兼容：静态菜单
  function bindMenus() { renderCommand(null); }
  function markRoundStart() { rpgUi.markRoundStart(); }

  return {
    destroy: () => { flames.destroy(); clearTimeout(showLog._t); clearTimeout(showBanner._t); rpgUi.hideTagTip(); document.removeEventListener('mousedown', onComboDown); reactionPrompt.cancel(); state.onReset = null; state.onUnitClick = null; state.onAllyPin = null; root.replaceChildren(); },
    els, renderHeroes, renderTurnOrder, renderQueue, bindMenus, setSelected, setHeroBars, setHeroStatus, setHeroStats, flashHeroPassive, showInspector, setBusy, setCurrent, renderCommand, showBanner, setHistory, closeMenus, markRoundStart, rpgUi,
    previewMoveCost, previewPips, openModal, closeModal,
    promptReaction: (req) => reactionPrompt.prompt(req), cancelReactionPrompt: () => reactionPrompt.cancel(),
    getSafeRect, showLog, openPanel, closePanel, openResult, clearBattle, closeSubmenu: () => {},
    set onUnitClick(fn) { state.onUnitClick = fn; },
    set onAllyPin(fn) { state.onAllyPin = fn; },
    set onReset(fn) { state.onReset = fn; },
    set onMusic(fn) { state.onMusic = fn; },
    set onUiSound(fn) { state.onUiSound = fn; },
    set settings(provider) { state.settings = provider; },
    get state() { return state; },
  };
}

