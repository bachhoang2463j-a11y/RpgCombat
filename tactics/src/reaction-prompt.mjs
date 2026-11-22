// ==========================================
// 战棋反应弹窗：移植原版 promptReaction / shelvePrompt（index.html 同风格）。
// 独立全屏 overlay（非编辑器 modal）：候选技能选择 / 跳过（不反应）/ 收起（底部悬浮胶囊恢复）。
// 调用约定（规则代理 contract v2）：req = { type:'reaction', responderId, casterId, skill, incomingType,
//   candidates:[{ skill, usesLeft, ... }], slotIndex, segmentIndex, targetId, shotIndex, totalShots }，
// 宿主（main）负责补充 responderName/responderEmoji/casterName 等显示字段；
// resolve 值 = null 或 { responderId, skill }（v2：选择带回受击者与所投技能），直接喂回攻击 generator.next(choice)。
// 重置/换场时宿主调 cancel()：活动弹窗立即以 null 结算并移除收起胶囊，旧攻击链由 flow 代际作废；
// 弹窗等待期间不推进任何虚拟时间（battle 时钟只由规则命令推进，演出定时器此刻尚未启动）。
// ==========================================

const ESC = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// 纯函数（Node 定向测试用）：候选原样列表（{skill, usesLeft,...}），丢弃空项
export function reactionChoices(req) {
  return (req && Array.isArray(req.candidates) ? req.candidates : [])
    .filter(c => c && c.skill);
}
// 纯函数：AI 单位的自动选择策略（不弹窗）：返回 null 或 { responderId, skill }（v2 选择形状；承受攻击则为 null）
export function autoPickChoice(req) {
  const first = reactionChoices(req)[0];
  return first ? { responderId: req.responderId, skill: first.skill } : null;
}

export function createReactionPrompt({ root, onUiSound } = {}) {
  let active = null;   // { overlay, reopen, resolve, done }

  function faceHtml(face, cls) {
    if (face && face.emoji) return '<span class="' + cls + ' t-face-emoji">' + ESC(face.emoji) + '</span>';
    if (face && face.avatarUrl) return '<span class="' + cls + '"><img src="' + ESC(face.avatarUrl) + '" alt="" draggable="false" referrerpolicy="no-referrer"></span>';
    return '<span class="' + cls + ' t-avatar-missing"><b class="t-avatar-missing-mark">头像缺失</b></span>';
  }
  function costOf(skill) {
    let html = '';
    if ((skill.cost || 0) > 0 || (!skill.hpCost && !skill.tpCost)) html += '<span class="text-indigo-200 px-0.5">-' + (skill.cost || 0) + 'MP</span>';
    if ((skill.hpCost || 0) > 0) html += '<span class="text-red-300 px-0.5">-' + skill.hpCost + 'HP</span>';
    if ((skill.tpCost || 0) > 0) html += '<span class="text-green-300 px-0.5">-' + skill.tpCost + 'TP</span>';
    return html;
  }
  function limitOf(skill, usesLeft) {
    return (skill.maxUses || 0) > 0 ? '<span class="text-rose-300 px-0.5">[限' + (usesLeft != null ? usesLeft : skill.usesRemaining != null ? skill.usesRemaining : skill.maxUses) + '次]</span>' : '';
  }
  // 来袭技能详情（原版 buildSkillDetailHTML 的战棋精简版：标签行 + 威力/命中/类型）
  function detailHtml(skill) {
    if (!skill) return '';
    const tags = [skill.type, skill.type2, skill.type3].filter(t => t && t !== '[无]')
      .map(t => '<span class="px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-600/60 text-[9px]">' + ESC(t) + '</span>').join('');
    const bits = [];
    if ((skill.power || 0) > 0) bits.push('威力 ' + skill.power);
    if (skill.hit != null) bits.push('命中 ' + skill.hit);
    if (skill.damageType) bits.push(skill.damageType);
    return '<div class="mb-2 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60 text-[10px] text-slate-300">' +
      '<div class="flex items-center gap-1 flex-wrap mb-0.5">' + tags + '</div>' +
      '<div class="font-mono-num text-slate-400">' + ESC(bits.join(' · ')) + '</div></div>';
  }

  function cleanup() {
    if (!active) return;
    const a = active;
    active = null;
    if (a.reopen && a.reopen.parentNode) a.reopen.remove();
    if (a.overlay && a.overlay.parentNode) a.overlay.remove();
  }
  function finish(value) {
    if (!active || active.done) return;
    const a = active;
    a.done = true;
    a.overlay.style.opacity = '0';
    // 淡出计时器只清本发节点（捕获 a）：期间新弹窗可能已 prompt() 接管 active，不得误删
    setTimeout(() => {
      if (a.reopen && a.reopen.parentNode) a.reopen.remove();
      if (a.overlay && a.overlay.parentNode) a.overlay.remove();
      if (active === a) active = null;
    }, 180);
    a.resolve(value);
  }
  // 收起（原版 shelvePrompt 同口径）：隐藏弹窗，底部悬浮胶囊恢复；cancel() 时胶囊一并移除
  function shelve() {
    if (!active) return;
    if (typeof onUiSound === 'function') onUiSound('cancel');
    active.overlay.style.display = 'none';
    let btn = active.reopen;
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 't-reaction-reopen';
      btn.addEventListener('click', () => {
        if (!active) return;
        if (typeof onUiSound === 'function') onUiSound('select');
        btn.remove();
        active.reopen = null;
        active.overlay.style.display = 'flex';
        active.overlay.style.opacity = '1';
      });
      document.body.appendChild(btn);
      active.reopen = btn;
    }
    btn.textContent = '继续反应';
  }

  function prompt(req) {
    cancel();
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 't-reaction-overlay';
      const candidates = reactionChoices(req);
      const incoming = (req && req.skill) || null;
      const responder = { name: req && req.responderName, emoji: req && req.responderEmoji, avatarUrl: req && req.responderAvatarUrl };
      const casterName = (req && req.casterName) || '敌人';

      let listHtml = '';
      candidates.forEach((cand, i) => {
        const skill = cand.skill;
        listHtml += '<button class="t-reaction-candidate group" data-ri="' + i + '">' +
          '<span class="text-indigo-400 group-hover:text-white text-sm shrink-0">⚡</span>' +
          '<span class="text-left min-w-0 truncate"><b class="text-white font-black">' + ESC(skill.name) + '</b>' + limitOf(skill, cand.usesLeft) + '</span>' +
          '<span class="font-mono text-[11px] font-bold text-indigo-300 bg-black/40 px-2 py-0.5 rounded border border-indigo-500/30 group-hover:bg-indigo-900/60 shrink-0">' + costOf(skill) + '</span></button>';
      });
      listHtml += '<button class="t-reaction-skip" data-ri="-1">跳过 (不反应)</button>';

      overlay.innerHTML =
        '<div class="t-reaction-box">' +
          '<div class="t-reaction-beam"></div>' +
          '<div class="flex items-center justify-between gap-2.5 pb-2.5 mb-2 border-b border-white/10 relative">' +
            '<div class="flex items-center gap-2.5 min-w-0">' + faceHtml(responder, 't-reaction-face') +
              '<div class="min-w-0"><div class="flex items-center gap-1.5">' +
                '<h3 class="text-indigo-300 font-bold text-xs sm:text-sm tracking-wider">即将遭受攻击</h3>' +
                '<span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">REACTION</span></div>' +
                '<div class="text-[10px] text-slate-300 truncate flex items-center gap-1 mt-0.5">' +
                  '<span class="text-slate-400 truncate">面临 ' + ESC(casterName) + ' 的</span>' +
                  '<span class="text-amber-300 font-bold shrink-0">【' + ESC(incoming ? incoming.name : '攻击') + '】</span></div>' +
              '</div></div>' +
            '<button class="t-reaction-shelve">收起</button>' +
          '</div>' +
          detailHtml(incoming) +
          '<div class="space-y-1 max-h-[230px] overflow-y-auto custom-scrollbar pr-0.5">' + listHtml + '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      active = { overlay, reopen: null, resolve, done: false };
      overlay.addEventListener('click', e => {
        const b = e.target.closest('[data-ri]');
        if (!b) return;
        if (typeof onUiSound === 'function') onUiSound('select');
        const idx = Number(b.getAttribute('data-ri'));
        // v2 选择形状：{ responderId, skill }（跳过为 null）
        finish(idx === -1 ? null : { responderId: req.responderId, skill: candidates[idx].skill });
      });
      overlay.querySelector('.t-reaction-shelve').addEventListener('click', shelve);
    });
  }

  // 重置/换场：立即结算 null 并清理（迟到的点击不再有 active，静默丢弃）
  function cancel() {
    if (!active) return;
    const a = active;
    active = null;
    a.done = true;
    if (a.reopen && a.reopen.parentNode) a.reopen.remove();
    if (a.overlay && a.overlay.parentNode) a.overlay.remove();
    a.resolve(null);
  }

  return { prompt, cancel, isOpen: () => !!active };
}
