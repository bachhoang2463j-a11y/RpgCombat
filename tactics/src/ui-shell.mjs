// ==========================================
// 战棋 P02 原槽位 UI 壳：行动轴 / 我方四列 / 行动·技能菜单(260×172) / 顶部入口 / 底栏旁白
// 槽位沿用原 RPG 组织（S01）：不新增顶栏页签/地图工具栏，不移动信息层级。
// P02 接线范围：菜单导航、列表滚动、面板开合、P01 数据展示、选中聚焦、旁白开关本地状态。
// 行动/技能按钮只做展示与导航；真正结算属后续阶段——未接业务不冒充可用业务能力。
// ==========================================

const ESC = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function buildShell(root) {
  root.innerHTML = [
    // ---- 战场背景与地图槽（原 #enemies-container 区域，由 sandbox 填充） ----
    '<div id="battle-scene"><div id="tactics-map-slot"></div></div>',
    // ---- 战报条 ----
    '<div id="battle-log-wrap"><div id="battle-log">整装待发...</div></div>',
    // ---- 左侧行动轴槽位（原 #turn-order-container） ----
    '<div id="turn-order-rail"><div id="turn-order-container"></div></div>',
    // ---- 顶部工具栏（顺序沿用：场地徽章/世界书/记录/全屏/对话/设置/重置） ----
    '<div id="tactics-topbar">' +
      '<div id="field-badge" class="t-topbtn" style="display:none">🏟️ <span id="field-badge-name">场地</span></div>' +
      '<button id="btn-worldbook" class="t-topbtn">📚<span class="t-toplabel">世界书</span></button>' +
      '<button id="btn-history" class="t-topbtn">📜<span class="t-toplabel">记录</span></button>' +
      '<button id="btn-fullscreen" class="t-topbtn">🔲<span class="t-toplabel">全屏</span></button>' +
      '<button id="btn-dialogue" class="t-topbtn">💬<span class="t-toplabel">对话</span></button>' +
      '<button id="btn-editor" class="t-topbtn">⚙️<span class="t-toplabel">设置</span></button>' +
      '<button id="btn-reset" class="t-topbtn">🔄<span class="t-toplabel">重置</span></button>' +
    '</div>',
    // ---- 悬浮 UI 层：我方四列 + 行动菜单（260×172） ----
    '<div id="tactics-float-ui">' +
      '<div id="heroes-container"></div>' +
      '<div id="menu-outer"><div id="menu-container">' +
        '<div id="active-hero-name">等待指令</div>' +
        '<div id="main-menu">' +
          '<button id="menu-basic">📦 基础行动</button>' +
          '<button id="menu-attack">🗡️ 攻击技能</button>' +
          '<button id="menu-support">✨ 辅助技能</button>' +
          '<button id="menu-item">🎒 物品道具</button>' +
        '</div>' +
        '<div id="submenu" style="display:none">' +
          '<div id="submenu-head"><span id="submenu-title">列表</span><button id="submenu-back">↩ 返回</button></div>' +
          '<div id="submenu-list"></div>' +
        '</div>' +
      '</div></div>' +
    '</div>',
    // ---- 底部聊天输入区（原 #chat-input-area/#chat-input-bar 槽位；旁白开关默认开启） ----
    '<div id="chat-input-area"><div id="chat-input-bar">' +
      '<input type="text" id="chat-text-input" placeholder="说点什么... (Enter发送)" maxlength="200">' +
      '<button id="chat-ally-toggle" class="t-toggle-on">友方旁白</button>' +
      '<button id="chat-enemy-toggle" class="t-toggle-on">敌方旁白</button>' +
      '<button id="chat-send-btn">发送</button>' +
    '</div></div>',
    // ---- 面板壳（记录/设置→编辑/对话/世界书；打开时覆盖地图，z 在地图之上） ----
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
    heroes: $('heroes-container'), menuBox: $('menu-container'), menuMain: $('main-menu'),
    submenu: $('submenu'), submenuTitle: $('submenu-title'), submenuList: $('submenu-list'),
    activeHeroName: $('active-hero-name'),
    chatInput: $('chat-text-input'),
    overlay: $('panel-overlay'), panelTitle: $('panel-title'), panelBody: $('panel-body'),
  };

  const state = { units: [], selectedId: null, allySpeak: true, enemySpeak: true, onUnitClick: null, onReset: null, history: [] };

  // ---------- 我方卡片（四列 grid 槽位；P01 数据展示） ----------
  function renderHeroes(units) {
    state.units = units;
    const heroes = units.filter(u => u.side === 'hero');
    els.heroes.innerHTML = heroes.map(u =>
      '<button class="t-hero-card" data-unit-id="' + ESC(u.id) + '">' +
        '<span class="t-hero-avatar"><img src="' + ESC(u.avatarUrl || '') + '" alt="" onerror="this.style.visibility=\'hidden\'"></span>' +
        '<span class="t-hero-info"><b>' + ESC(u.name) + '</b>' +
          '<i class="t-bar t-bar-hp"><i style="width:' + pct(u.bars.hp, u.bars.maxHp) + '%"></i></i>' +
          '<i class="t-bar t-bar-mp"><i style="width:' + pct(u.bars.mp, u.bars.maxMp) + '%"></i></i>' +
        '</span></button>').join('');
    els.heroes.querySelectorAll('.t-hero-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-unit-id');
        if (state.onUnitClick) state.onUnitClick(id);
      });
    });
  }
  const pct = (v, max) => (max ? Math.max(0, Math.min(100, v / max * 100)) : 100).toFixed(0);

  // ---------- 行动轴槽位（P02 静态展示：输入顺序队列；P03 才有真调度） ----------
  function renderTurnOrder(units) {
    els.turnOrder.innerHTML = units.map((u, i) =>
      '<div class="t-queue-item' + (i === 0 ? ' t-queue-current' : '') + '" data-unit-id="' + ESC(u.id) + '" title="' + ESC(u.name) + '">' +
        '<img src="' + ESC(u.avatarUrl || '') + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
      '</div>').join('');
  }

  // ---------- 菜单导航（260×172 面板内切换；返回按钮固定面板内） ----------
  function openSubmenu(title, rows) {
    els.submenuTitle.textContent = title;
    els.submenuList.innerHTML = rows.length
      ? rows.map(r => '<button class="t-submenu-item" data-skill="' + ESC(r.key || '') + '"' + (r.disabled ? ' disabled' : '') + '>' + r.html + '</button>').join('')
      : '<div class="t-submenu-empty">（无可选项）</div>';
    els.menuMain.style.display = 'none';
    els.submenu.style.display = 'flex';
  }
  function closeSubmenu() {
    els.submenu.style.display = 'none';
    els.menuMain.style.display = 'flex';
  }
  function bindMenus(units) {
    if (state.battleView) { bindBattleMenus(); return; }
    const hero = units.find(u => u.side === 'hero' && (!state.selectedId || u.id === state.selectedId)) || null;
    const label = hero ? hero.name : '等待指令';
    els.activeHeroName.textContent = label;
    $('menu-basic').onclick = () => openSubmenu('基础行动', [
      { key: 'attack', html: '<span>⚔️</span> 普攻攻击' },
      { key: 'defend', html: '<span>🛡️</span> 防御姿态' },
      { key: 'retreat', html: '<span>💨</span> 尝试撤离' },
    ]);
    const skillRows = (hero && hero.skills || []).map((s, i) => ({
      key: 'skill-' + i,
      html: '<b>' + ESC(s.name) + '</b>' + (s.cost ? '<i>MP:' + s.cost + '</i>' : '') +
        (s.range ? '<i>' + ESC(s.range.type) + (s.range.castRange ? ' 射程' + s.range.castRange + 'm' : '') + '</i>' : ''),
    }));
    $('menu-attack').onclick = () => openSubmenu('攻击技能 · ' + label, skillRows);
    $('menu-support').onclick = () => openSubmenu('辅助技能 · ' + label, skillRows);
    const itemRows = (hero && hero.items || []).map(it => ({ key: 'item', html: '<b>' + ESC(it.name) + '</b><i>×' + (it.count == null ? '-' : it.count) + '</i>' }));
    $('menu-item').onclick = () => openSubmenu('物品道具 · ' + label, itemRows);
    $('submenu-back').onclick = closeSubmenu;
  }

  // ---------- MVP：只操作到轴者，不随查看角色切换行动权 ----------
  function bindBattleMenus() {
    const { snapshot, skills, onCommand } = state.battleView;
    const unit = state.units.find(u => u.id === snapshot.currentId);
    const r = snapshot.resources;
    const playable = unit?.side === 'hero' && r && !snapshot.terminal;
    els.activeHeroName.textContent = snapshot.terminal ? '战斗结束' : unit
      ? unit.name + ' · ' + (r ? r.moveRemaining.toFixed(1) + 'm / 主' + r.main : '行动中')
      : '等待指令';
    ['menu-basic', 'menu-attack'].forEach(id => { $(id).disabled = !playable; });
    ['menu-support', 'menu-item'].forEach(id => { $(id).disabled = true; $(id).title = 'MVP 暂未开放'; });
    $('menu-basic').onclick = () => {
      openSubmenu('基础行动', [
        { key: 'move', html: '移动 · 预览后再点确认', disabled: r.moveRemaining <= 0 },
        { key: 'attack', html: '普通攻击 · 主行动', disabled: r.main <= 0 },
        { key: 'end', html: '结束行动' },
      ]);
    };
    $('menu-attack').onclick = () => openSubmenu('攻击技能', skills.map((s, i) => ({
      key: 'skill-' + i,
      html: '<b>' + ESC(s.name) + '</b><i>' + ESC(s.range.type) + ' · MP ' + s.cost + '</i>',
      disabled: r.main <= 0 || unit.ref.mp < s.cost,
    })));
    els.submenuList.onclick = e => {
      const button = e.target.closest('button[data-skill]');
      if (button && !button.disabled) onCommand(button.dataset.skill);
    };
    $('submenu-back').onclick = () => { onCommand('cancel'); closeSubmenu(); };
  }
  function renderBattle(snapshot, skills, onCommand, queue) {
    state.battleView = { snapshot, skills, onCommand };
    state.history = snapshot.log.slice();
    closeSubmenu();
    bindBattleMenus();
    els.turnOrder.innerHTML = queue.map(row => {
      const u = state.units.find(u => u.id === row.unitId);
      return '<div class="t-queue-item' + (row.unitId === snapshot.currentId ? ' t-queue-current' : '') +
        '" data-unit-id="' + ESC(u.id) + '" title="' + ESC(u.name) + ' · t=' + row.nextActionAt.toFixed(2) +
        '"><img src="' + ESC(u.avatarUrl) + '" alt=""></div>';
    }).join('');
  }
  function clearBattle() {
    state.battleView = null;
    state.history = [];
    els.submenuList.onclick = null;
    ['menu-basic', 'menu-attack', 'menu-support', 'menu-item'].forEach(id => { $(id).disabled = false; });
    closePanel(); closeSubmenu();
  }

  // ---------- 面板壳 ----------
  function openPanel(title, html) {
    els.panelTitle.textContent = title;
    els.panelBody.innerHTML = html;
    els.overlay.style.display = 'flex';
  }
  function closePanel() { els.overlay.style.display = 'none'; }
  function showHistory() {
    openPanel('📜 记录', state.history.length
      ? state.history.map(h => '<div class="t-history-row">' + ESC(h) + '</div>').join('')
      : '<div class="t-submenu-empty">战斗记录在行动结算阶段（P03+）接入；当前无记录。</div>');
  }
  function showEditor() {
    const rows = state.units.map(u => '<tr><td>' + ESC(u.name) + '</td><td>' + ESC(u.side === 'hero' ? '我方' : '敌方') + '</td><td>' +
      (u.footprint ? u.footprint.width + '×' + u.footprint.height : '1×1') + '</td><td>' + (u.bars.hp == null ? '-' : u.bars.hp + '/' + u.bars.maxHp) + '</td></tr>').join('');
    openPanel('⚙️ 设置 · 角色概览（编辑器在 P11 接入）',
      '<table class="t-roster-table"><tr><th>名字</th><th>阵营</th><th>体型</th><th>HP</th></tr>' + rows + '</table>' +
      '<div class="t-submenu-empty">配置编辑/导入导出属后续阶段；本面板仅为 P01 数据只读展示。</div>');
  }
  function showDialogue() {
    openPanel('💬 对话', '<div class="t-submenu-empty">LLM 对话设置属后续阶段接线；本轮不调用任何生成接口。</div>');
  }
  function showWorldbook() {
    openPanel('📚 世界书', '<div class="t-submenu-empty">世界书管理属后续阶段接线。</div>');
  }
  function toggleFullScreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  // ---------- 底栏旁白开关（本地状态，不调 LLM） ----------
  function toggleSpeak(kind) {
    if (kind === 'ally') state.allySpeak = !state.allySpeak;
    else state.enemySpeak = !state.enemySpeak;
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
  function showLog(msg) {
    els.battleLog.textContent = msg;
    els.battleLog.classList.add('t-visible');
    clearTimeout(showLog._t);
    showLog._t = setTimeout(() => els.battleLog.classList.remove('t-visible'), 2500);
  }

  // ---------- 顶栏/底栏绑定 ----------
  $('btn-history').addEventListener('click', showHistory);
  $('btn-editor').addEventListener('click', showEditor);
  $('btn-dialogue').addEventListener('click', showDialogue);
  $('btn-worldbook').addEventListener('click', showWorldbook);
  $('btn-fullscreen').addEventListener('click', toggleFullScreen);
  $('btn-reset').addEventListener('click', () => { if (state.onReset) state.onReset(); });
  $('panel-close').addEventListener('click', closePanel);
  els.overlay.addEventListener('click', (e) => { if (e.target === els.overlay) closePanel(); });
  $('chat-ally-toggle').addEventListener('click', () => toggleSpeak('ally'));
  $('chat-enemy-toggle').addEventListener('click', () => toggleSpeak('enemy'));
  $('chat-send-btn').addEventListener('click', sendChat);
  els.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

  // ---------- safeRect：由实际 UI 边界汇总（本尺寸实算，不沿用另一尺寸） ----------
  function getSafeRect() {
    const rail = $('turn-order-rail').getBoundingClientRect();
    const topbar = $('tactics-topbar').getBoundingClientRect();
    const floatUi = $('tactics-float-ui').getBoundingClientRect();
    const chat = $('chat-input-area').getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const left = Math.max(rail.right - rootRect.left, 0);
    const top = Math.max(topbar.bottom - rootRect.top, 0);
    const bottom = Math.min(floatUi.top - rootRect.top, chat.top - rootRect.top);
    const right = rootRect.width;
    return { left, top, width: Math.max(120, right - left), height: Math.max(120, bottom - top) };
  }

  // 选中联动：高亮我方卡片
  function setSelected(unitId) {
    state.selectedId = unitId;
    els.heroes.querySelectorAll('.t-hero-card').forEach(c => {
      c.classList.toggle('t-selected', c.getAttribute('data-unit-id') === unitId);
    });
    const sel = state.units.find(u => u.id === unitId);
    if (!state.battleView) els.activeHeroName.textContent = sel ? sel.name : '等待指令';
    bindMenus(state.units);
  }

  return {
    destroy: () => { clearTimeout(showLog._t); state.onReset = null; state.onUnitClick = null; root.replaceChildren(); },
    els, renderHeroes, renderTurnOrder, bindMenus, closeSubmenu, setSelected,
    getSafeRect, showLog, openPanel, closePanel, renderBattle, clearBattle,
    set onUnitClick(fn) { state.onUnitClick = fn; },
    set onReset(fn) { state.onReset = fn; },
    get state() { return state; },
  };
}
