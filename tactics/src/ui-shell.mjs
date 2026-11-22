// ==========================================
// 战棋界面壳（视听切片翻新版）
// 槽位沿用原 RPG 组织：左侧行动轴 / 右上入口 / 底部我方卡片 / 右下指令面板（原菜单槽）/ 战报条 / 面板 / 底栏旁白。
// 指令面板改为现代技能栏：当前行动者 + 资源读数 + 技能格（数字键）+ 结束回合（空格）；地面直接点击移动由 main 负责。
// 本层只做展示与输入转发，不做规则判断（可用/禁用原因由 main 传入）。
// ==========================================

const ESC = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// 技能图标（线稿，currentColor）
const ICONS = {
  '枪击': '<path d="M4 15h11l2-3h3v-3H6L4 11z"/><path d="M8 15l-1 4h3l1-4"/><path d="M17 9V7"/>',
  '霰弹': '<path d="M2 14h12l1-2h7v-2H4L2 12z"/><path d="M6 14l-1 4h3l1-4"/><path d="M15 10V8M18 10V8"/>',
  '雷': '<path d="M13 2L5 13h6l-2 9 9-12h-6z"/>',
  '砷弹': '<path d="M5 12h9a4 4 0 010 0l3-2v4l-3-2"/><path d="M3 12h2"/><path d="M19 17c0 1.7-1.3 3-2.5 3S14 18.7 14 17c0-1.5 2.5-4 2.5-4s2.5 2.5 2.5 4z"/>',
  '刀砍': '<path d="M5 19L18 6l1-3-3 1L3 17z"/><path d="M7 15l2 2M3 21l2-2"/>',
  '爪击': '<path d="M6 4c1 5 1 9-1 15M11 3c1 6 1 11-1 17M16 4c1 5 1 9-1 15"/>',
  '箭矢': '<path d="M4 20L20 4M20 4h-6M20 4v6M4 20l3-1M4 20l1-3"/>',
  'enemy_spell': '<circle cx="12" cy="12" r="5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  'fire': '<path d="M12 3c3 4 5 6 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  end: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/>',
};
export function skillIcon(subtype) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[subtype] || ICONS['刀砍']) + '</svg>';
}

export function buildShell(root) {
  root.innerHTML = [
    '<div id="battle-scene"><div id="tactics-map-slot"></div></div>',
    '<div id="battle-log-wrap"><div id="battle-log">整装待发...</div></div>',
    '<div id="turn-banner" aria-hidden="true"><div class="tb-inner"><div class="tb-face"></div><div class="tb-text"><b class="tb-name"></b><i class="tb-sub"></i></div></div></div>',
    '<div id="turn-order-rail"><div class="t-rail-head">行动序</div><div id="turn-order-container"></div></div>',
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
      '<div id="menu-outer"><div id="menu-container">' +
        '<div id="active-hero-name"></div>' +
        '<div id="main-menu"></div>' +
        '<div id="menu-foot"></div>' +
        '<div id="menu-busy" aria-hidden="true"><span>行动中</span></div>' +
      '</div></div>' +
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
  ].join('');

  const $ = (id) => root.querySelector('#' + id);
  const els = {
    mapSlot: $('tactics-map-slot'), battleLog: $('battle-log'), turnOrder: $('turn-order-container'),
    heroes: $('heroes-container'), menuBox: $('menu-container'), menuMain: $('main-menu'), menuFoot: $('menu-foot'),
    activeHeroName: $('active-hero-name'), chatInput: $('chat-text-input'), banner: $('turn-banner'),
    overlay: $('panel-overlay'), panelBox: $('panel-box'), panelTitle: $('panel-title'), panelBody: $('panel-body'),
  };
  const state = { units: [], selectedId: null, allySpeak: true, enemySpeak: true, onUnitClick: null, onReset: null, history: [],
    settings: null, onUiSound: null, busy: false, currentId: null, cmd: null };
  const uiSound = (kind) => { if (state.onUiSound) state.onUiSound(kind); };
  const pct = (v, max) => (max ? Math.max(0, Math.min(100, v / max * 100)) : 100).toFixed(1);

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

  // ---------- 行动轴 ----------
  function renderQueue(queue, currentId) {
    const prev = els.turnOrder.dataset.key || '';
    const key = queue.map(r => r.unitId).join('|');
    if (prev === key && els.turnOrder.dataset.cur === currentId) return;
    els.turnOrder.innerHTML = queue.map((row, i) => {
      const u = state.units.find(x => x.id === row.unitId);
      if (!u) return '';
      return '<div class="t-queue-item ' + (u.side === 'hero' ? 't-q-hero' : 't-q-enemy') + (row.unitId === currentId ? ' t-queue-current' : '') +
        '" data-unit-id="' + ESC(u.id) + '" title="' + ESC(u.name) + ' · t=' + row.nextActionAt.toFixed(1) + '" style="--i:' + i + '">' +
        faceHtml(u, 't-q-face') + (row.unitId === currentId ? '' : '<em>' + row.nextActionAt.toFixed(0) + '</em>') + '</div>';
    }).join('');
    if (prev && prev !== key) { els.turnOrder.classList.remove('t-queue-shift'); void els.turnOrder.offsetWidth; els.turnOrder.classList.add('t-queue-shift'); }
    els.turnOrder.dataset.key = key; els.turnOrder.dataset.cur = currentId || '';
    els.turnOrder.querySelectorAll('.t-queue-item').forEach(q => q.addEventListener('click', () => { uiSound('select'); if (state.onUnitClick) state.onUnitClick(q.dataset.unitId); }));
  }
  function renderTurnOrder(units) { renderQueue(units.map(u => ({ unitId: u.id, nextActionAt: 0 })), units[0] && units[0].id); }

  // ---------- 指令面板：资源 + 技能格 + 结束回合 ----------
  // cmd = { unit, playable, terminal, resources:{moveRemaining,moveMax,main,mp,maxMp}, actions:[{key,label,subtype,sub,cost,hotkey,disabled,reason,active}], endArmed }
  function renderCommand(cmd) {
    state.cmd = cmd;
    const u = cmd && cmd.unit;
    if (!u) { els.activeHeroName.innerHTML = '<span class="t-cmd-idle">等待指令</span>'; els.menuMain.innerHTML = ''; els.menuFoot.innerHTML = ''; return; }
    const r = cmd.resources;
    els.menuBox.classList.toggle('t-menu-enemy', u.side !== 'hero');
    els.menuBox.classList.toggle('t-menu-terminal', !!cmd.terminal);
    const moveFrac = r && r.moveMax ? Math.max(0, r.moveRemaining / r.moveMax) : 0;
    els.activeHeroName.innerHTML = faceHtml(u, 't-cmd-face') +
      '<span class="t-cmd-id"><b>' + ESC(u.name) + '</b><i>' + (cmd.terminal ? '战斗结束' : u.side === 'hero' ? '我方行动' : '敌方行动') + '</i></span>' +
      (u.side === 'hero' && r && !cmd.terminal ? '<span class="t-cmd-res">' +
        '<span class="t-res-move" title="移动额度"><i style="width:' + (moveFrac * 100).toFixed(1) + '%"></i><em>' + r.moveRemaining.toFixed(1) + 'm</em></span>' +
        '<span class="t-res-pips" title="主行动">' + '<i class="' + (r.main > 0 ? 'on' : '') + '"></i>'.repeat(1) + '</span>' +
        '<span class="t-res-mp" title="MP">MP <b>' + r.mp + '</b></span>' +
      '</span>' : '');
    if (!cmd.playable) {
      els.menuMain.innerHTML = cmd.terminal ? '' : '<div class="t-cmd-wait">' + (u.side === 'hero' ? '' : '敌方正在行动…') + '</div>';
      els.menuFoot.innerHTML = '';
      return;
    }
    els.menuMain.innerHTML = cmd.actions.map(a =>
      '<button class="t-skill' + (a.active ? ' t-active' : '') + (a.disabled ? ' t-off' : '') + '" data-skill="' + ESC(a.key) + '" title="' + ESC(a.label + (a.disabled ? ' · ' + a.reason : '')) + '">' +
        '<span class="t-skill-key">' + a.hotkey + '</span>' +
        '<span class="t-skill-icon">' + skillIcon(a.subtype) + '</span>' +
        '<span class="t-skill-name">' + ESC(a.label) + '</span>' +
        '<span class="t-skill-sub">' + ESC(a.disabled ? a.reason : a.sub) + '</span>' +
        (a.cost ? '<span class="t-skill-cost">' + a.cost + '</span>' : '') +
      '</button>').join('');
    els.menuFoot.innerHTML =
      '<span class="t-cmd-tip">' + ESC(cmd.tip || '') + '</span>' +
      '<button class="t-end' + (cmd.endArmed ? ' t-armed' : '') + '" data-skill="end">' + skillIcon('end') + '<b>' + (cmd.endArmed ? '再按确认结束' : '结束回合') + '</b><span class="t-skill-key">Space</span></button>';
  }
  els.menuBox.addEventListener('click', e => {
    const b = e.target.closest('button[data-skill]');
    if (!b || !state.cmd || !state.cmd.onCommand) return;
    state.cmd.onCommand(b.dataset.skill, b.classList.contains('t-off'));
  });
  els.menuBox.addEventListener('pointerover', e => {
    const b = e.target.closest('button[data-skill]');
    if (b && b !== state.hoverBtn) { state.hoverBtn = b; uiSound('hover'); }
  });

  function setBusy(on) { state.busy = !!on; els.menuBox.classList.toggle('t-busy', state.busy); }
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
    state.history = []; state.currentId = null; state.cmd = null;
    els.heroes.dataset.key = ''; els.turnOrder.dataset.key = '';
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

  return {
    destroy: () => { clearTimeout(showLog._t); clearTimeout(showBanner._t); state.onReset = null; state.onUnitClick = null; root.replaceChildren(); },
    els, renderHeroes, renderTurnOrder, renderQueue, bindMenus, setSelected, setHeroBars, setBusy, setCurrent, renderCommand, showBanner, setHistory,
    getSafeRect, showLog, openPanel, closePanel, openResult, clearBattle, closeSubmenu: () => {},
    set onUnitClick(fn) { state.onUnitClick = fn; },
    set onReset(fn) { state.onReset = fn; },
    set onUiSound(fn) { state.onUiSound = fn; },
    set settings(provider) { state.settings = provider; },
    get state() { return state; },
  };
}
