// ==========================================
// 战棋界面壳（视听切片翻新版）
// 槽位沿用原 RPG 组织：左侧行动轴 / 右上入口 / 底部我方卡片 / 右下指令面板（原菜单槽）/ 战报条 / 面板 / 底栏旁白。
// 左侧行动条与右下技能栏（子菜单/父子技能组卡/物品卡/标签悬浮提示）直接复用原版 index（vendor/rpg-ui 生成文件），
// 本层只做宿主适配：伪 state、规则判定与瞄准入口转交 main；地面直接点击移动由 main 负责。
// 本层只做展示与输入转发，不做规则判断（可用/禁用原因由 main 传入）。
// ==========================================

import { createRpgUi, RPG_UI_RAIL_HTML, RPG_UI_MENU_HTML, RPG_UI_TIP_HTML } from './vendor/rpg-ui/rpg-ui.mjs';

const ESC = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

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
      '<button id="btn-reset" class="t-topbtn" title="重置">🔄<span class="t-toplabel">重置</span></button>' +
    '</div>',
    '<div id="tactics-float-ui">' +
      '<div id="heroes-container"></div>' +
      '<div id="menu-outer" class="relative self-end">' + RPG_UI_MENU_HTML + '</div>' +
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
  ].join('');

  const $ = (id) => root.querySelector('#' + id);
  const els = {
    mapSlot: $('tactics-map-slot'), battleLog: $('battle-log'), turnOrder: $('turn-order-container'),
    heroes: $('heroes-container'), menuBox: $('menu-container'), menuMain: $('main-menu'),
    activeHeroName: $('active-hero-name'), chatInput: $('chat-text-input'), banner: $('turn-banner'),
    overlay: $('panel-overlay'), panelBox: $('panel-box'), panelTitle: $('panel-title'), panelBody: $('panel-body'),
    targetMenu: $('target-menu'), targetHint: $('target-hint'), enemyOverlay: $('enemy-turn-overlay'),
  };
  const state = { units: [], selectedId: null, allySpeak: true, enemySpeak: true, onUnitClick: null, onReset: null, history: [],
    settings: null, onUiSound: null, busy: false, currentId: null, cmd: null, menuKey: '' };
  const uiSound = (kind) => { if (state.onUiSound) state.onUiSound(kind); };
  const pct = (v, max) => (max ? Math.max(0, Math.min(100, v / max * 100)) : 100).toFixed(1);

  // ---------- 原版界面宿主（伪 state + 规则/瞄准回调转交 main） ----------
  const rpgState = { actionQueue: [], queueIndex: 0, isGameStarted: true, isAnimating: false, usedExtraTurnSkillsThisRound: new Set() };
  const cmdHero = () => state.cmd && state.cmd.unit;
  const callCmd = (k, ...a) => (state.cmd && state.cmd[k] ? state.cmd[k](...a) : undefined);
  const rpgUi = createRpgUi({
    state: rpgState,
    isSkillActionable: (hero, skill) => !!callCmd('canUse', skill),
    prepareSkillTarget: (idx) => { uiSound('select'); callCmd('onSkill', idx); },
    skillHasBarrierTag: () => false,
    hasEnoughBindings: () => true,
    isSummonBlockedByLimit: () => false,
    getHeroItemBindings: () => new Map(),
    itemBindingKnowledge: new Map(),
    isItemUsable: () => false,
    prepareItemTarget: () => showLog('物品使用战棋未迁移', 'warn'),
    prepareGroupedItemSkill: () => showLog('物品使用战棋未迁移', 'warn'),
    handleBasicAttack: () => { rpgUi.closeBasicMenu(); uiSound('select'); callCmd('onAttack'); },
    handleBasicDefend: () => {},
    handleBasicRetreat: () => {},
    cancelTargeting: () => callCmd('onCancel'),
    // 原版 getSkillGroupChildren 同口径：按 parentName 从平铺数组现查
    getSkillGroupChildren: (hero, parent) => (!hero || !Array.isArray(hero.skills) || !parent || !parent.isGroup) ? [] : hero.skills.filter(s => s && s._inGroup && s.parentName === parent.name),
  });
  rpgUi.bind(root);

  function faceHtml(u, cls) {
    if (u.emoji) return '<span class="' + cls + ' t-face-emoji">' + ESC(u.emoji) + '</span>';
    if (u.avatarUrl) return '<span class="' + cls + '"><img src="' + ESC(u.avatarUrl) + '" alt="" draggable="false" referrerpolicy="no-referrer"></span>';
    return '<span class="' + cls + ' t-avatar-missing"><b class="t-avatar-missing-mark">头像缺失</b></span>';
  }

  // ---------- 我方卡片 ----------
  function cardHtml(u) {
    return '<button class="t-hero-card" data-unit-id="' + ESC(u.id) + '">' + faceHtml(u, 't-hero-avatar') +
      '<span class="t-hero-info"><span class="t-hero-row"><b>' + ESC(u.name) + '</b><em class="t-hero-hpnum"></em></span>' +
        '<i class="t-bar t-bar-hp"><i class="t-bar-ghost"></i><i class="t-bar-fill"></i></i>' +
        '<i class="t-bar t-bar-mp"><i class="t-bar-fill"></i></i>' +
      '</span><span class="t-card-turn">行动中</span></button>';
  }
  function renderHeroes(units) {
    state.units = units;
    const heroes = units.filter(u => u.side === 'hero');
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
  function setHeroBars(id, bars, { instant = false, hit = false } = {}) {
    const card = cardOf(id);
    if (!card) return;
    const fill = card.querySelector('.t-bar-hp .t-bar-fill'), ghost = card.querySelector('.t-bar-hp .t-bar-ghost');
    const w = pct(bars.hp, bars.maxHp) + '%';
    fill.style.width = w;
    card.querySelector('.t-bar-mp .t-bar-fill').style.width = pct(bars.mp, bars.maxMp) + '%';
    card.querySelector('.t-hero-hpnum').innerHTML = Math.max(0, Math.round(bars.hp)) + '<small>/' + bars.maxHp + '</small>';
    card.classList.toggle('t-low', bars.hp > 0 && bars.hp / bars.maxHp <= 0.3);
    clearTimeout(ghost._t);
    if (instant) { ghost.style.transition = 'none'; ghost.style.width = w; }
    else { ghost._t = setTimeout(() => { ghost.style.transition = 'width 500ms cubic-bezier(0.3,0,0.2,1)'; ghost.style.width = w; }, 450); }
    if (hit) { card.classList.remove('t-card-hit'); void card.offsetWidth; card.classList.add('t-card-hit'); }
    card.classList.toggle('t-down', bars.hp <= 0);
  }
  function markCards() {
    els.heroes.querySelectorAll('.t-hero-card').forEach(c => {
      const id = c.getAttribute('data-unit-id');
      c.classList.toggle('t-selected', id === state.selectedId);
      c.classList.toggle('t-current', id === state.currentId);
    });
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
    if (!u) { els.activeHeroName.textContent = '等待指令'; state.menuKey = ''; rpgUi.closeAllSubMenus(); showTarget(null); return; }
    const r = cmd.resources;
    // 标题栏：原版"XX 的回合" + 剩余移动；右侧为高频【结束回合】（原【可行动/已行动】位置）
    els.activeHeroName.innerHTML = '<span class="t-turn-title">' + rpgUi.escapeHistoryHtml(u.name) + (cmd.terminal ? ' · 战斗结束' : ' 的回合') +
      (u.side === 'hero' && r && !cmd.terminal ? ' <span class="text-cyan-300">🦶 ' + r.moveRemaining.toFixed(1) + '米</span>' : '') + '</span>' +
      (cmd.playable ? '<button class="t-end-btn' + (cmd.endArmed ? ' t-armed' : '') + '" data-tactics-end title="结束回合（Space）">' +
        (cmd.endArmed ? '⚠️ 确认结束' : '⏳ 结束回合') + '<kbd>Space</kbd></button>' : '');
    if (!cmd.playable) { state.menuKey = ''; rpgUi.closeAllSubMenus(); showTarget(null); return; }
    // 技能卡按资源变化重建（原版 updateSkillMenus：每次渲染折叠变体组）；同一资源态不重建，保留展开与滚动
    const menuKey = u.id + '|' + u.ref.mp + '|' + (r ? r.main : '') + '|' + (cmd.serial || 0);
    const hero = Object.assign(refOf(u), { skills: u.skills, items: u.items || [], mp: u.ref.mp, hp: u.ref.hp, tp: 0, burstActivated: false });
    if (menuKey !== state.menuKey) {
      if (state.menuKey.split('|')[0] !== u.id) rpgUi.closeAllSubMenus();
      state.menuKey = menuKey;
      rpgUi.updateSkillMenus(hero);
      decorateSkillCards(u);
    }
    showTarget(cmd.aimHint || null);
  }
  // 战棋专有信息：技能卡第二行末尾追加空间范围胶囊——沿用原版修饰胶囊样式（同 🎯命中值胶囊：灰底细边 + 等宽数值）
  // 与原版标签悬浮提示引擎（data-tagtip-*）；原版打开子菜单会重建列表，按列表变化补挂
  const ATTR = t => rpgUi.escapeHistoryHtml(t);
  function rangePill(r) {
    let label, num, title, body;
    if (r.type === '单体') { label = '射程'; num = (r.castRange || 0) + 'm'; title = '【范围·单体】'; body = '选择 ' + (r.castRange || 0) + ' 米内、视线无遮挡的一名敌人；墙体与高障碍会阻挡视线，低矮掩体不阻挡。'; }
    else if (r.type === '直线') { label = '直线'; num = r.length + '×' + (r.width || 1) + 'm'; title = '【范围·直线】'; body = '自施法者向瞄准方向延伸 ' + r.length + ' 米、宽 ' + (r.width || 1) + ' 米，命中路径上所有敌人；遇墙截断。'; }
    else if (r.type === '扇形') { label = '扇形'; num = r.castRange + 'm·' + r.angle + '°'; title = '【范围·扇形】'; body = '以施法者为圆心、半径 ' + r.castRange + ' 米、张角 ' + r.angle + '° 的扇形，命中其中所有敌人；遇墙截断。'; }
    else return '';
    return '<span class="t-range-pill text-[8px] px-1 py-0.2 rounded border bg-slate-900 text-slate-400 border-slate-700 shrink-0 flex items-center leading-none"' +
      ' data-tagtip-title="' + ATTR(title) + '" data-tagtip-body="' + ATTR(body) + '" data-tagtip-raw="' + ATTR('[范围:' + r.type + ']') + '">' +
      label + '<span class="opacity-90 font-mono-num ml-0.5">' + num + '</span></span>';
  }
  function decorateSkillCards(u) {
    if (!u) return;
    root.querySelectorAll('#attack-skill-list [data-skill-idx], #support-skill-list [data-skill-idx]').forEach(btn => {
      const s = u.skills[Number(btn.dataset.skillIdx)];
      const row = btn.children[1];
      if (!s || !s.range || !row || row.querySelector('.t-range-pill')) return;
      const pill = rangePill(s.range);
      if (!pill) return;
      const empty = row.querySelector('span.text-slate-500:only-child');   // 原版"无附加效果"占位
      if (empty) empty.remove();
      row.insertAdjacentHTML('beforeend', pill);
    });
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
  });
  els.menuBox.addEventListener('click', e => {
    if (e.target.closest('[data-tactics-end]')) { e.stopPropagation(); callCmd('onEnd'); return; }
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
    const extra = state.settings ? state.settings.html() : '';
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
  function showLog(msg, tone) {
    if (!msg) return;
    els.battleLog.textContent = msg;
    els.battleLog.className = 't-visible' + (tone ? ' t-log-' + tone : '');
    clearTimeout(showLog._t);
    showLog._t = setTimeout(() => els.battleLog.classList.remove('t-visible'), 2600);
  }

  $('btn-history').addEventListener('click', showHistory);
  $('btn-editor').addEventListener('click', showEditor);
  $('btn-dialogue').addEventListener('click', showDialogue);
  $('btn-worldbook').addEventListener('click', showWorldbook);
  $('btn-fullscreen').addEventListener('click', toggleFullScreen);
  $('btn-reset').addEventListener('click', () => { uiSound('select'); if (state.onReset) state.onReset(); });
  $('panel-close').addEventListener('click', closePanel);
  els.overlay.addEventListener('click', (e) => { if (e.target === els.overlay) closePanel(); });
  $('chat-ally-toggle').addEventListener('click', () => toggleSpeak('ally'));
  $('chat-enemy-toggle').addEventListener('click', () => toggleSpeak('enemy'));
  $('chat-send-btn').addEventListener('click', sendChat);
  els.chatInput.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') sendChat(); });

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
    destroy: () => { clearTimeout(showLog._t); clearTimeout(showBanner._t); rpgUi.hideTagTip(); state.onReset = null; state.onUnitClick = null; root.replaceChildren(); },
    els, renderHeroes, renderTurnOrder, renderQueue, bindMenus, setSelected, setHeroBars, setBusy, setCurrent, renderCommand, showBanner, setHistory, closeMenus, markRoundStart, rpgUi,
    getSafeRect, showLog, openPanel, closePanel, openResult, clearBattle, closeSubmenu: () => {},
    set onUnitClick(fn) { state.onUnitClick = fn; },
    set onReset(fn) { state.onReset = fn; },
    set onUiSound(fn) { state.onUiSound = fn; },
    set settings(provider) { state.settings = provider; },
    get state() { return state; },
  };
}
