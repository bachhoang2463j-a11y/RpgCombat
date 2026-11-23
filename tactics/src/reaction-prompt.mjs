// ==========================================
// 战棋反应弹窗：移植原版 promptReaction / promptKanpo / buildSkillDetailHTML / buildReactionDamagePreview / shelvePrompt（index.html）。
// 独立全屏 overlay（非编辑器 modal）：头部（受击者头像·即将遭受攻击·面临 X 的【技能】·收起）→ 来袭技能详情行 →
//   本段承伤预览三胶囊（原伤 → 减甲 → 最终 HP，护盾/免伤吸收与致命/穿透/安全警示）→ 舍身可用提示 →
//   候选列表（反应紫 / 舍身钢蓝 / 看破琥珀，限次与绑定徽章，费用胶囊）→ 跳过 / 承受攻击 / 放弃看破。
// 调用约定（规则代理 contract v2）：req = { type:'reaction', responderId, casterId, skill, incomingType,
//   candidates:[{ skill, responderId, guardian?, usesLeft, bindings[] }], slotIndex, segmentIndex, targetId, shotIndex, totalShots,
//   preview }，preview 为规则层只读承伤预估（battle.segmentPreview，与本段结算同管线，不掷骰）；
// 宿主（main）负责补充显示字段：responderName/Emoji/AvatarUrl、casterName、candidates[i].faceName/faceEmoji/faceAvatarUrl。
// resolve 值 = null 或 { responderId, skill }（v2：选择带回受击者或舍身者与所投技能），直接喂回攻击 generator.next(choice)。
// 本层只显示规则给出的数值，不计算伤害、不判断可用性。
// 重置/换场时宿主调 cancel()：活动弹窗立即以 null 结算并移除收起胶囊，旧攻击链由 flow 代际作废；
// 弹窗等待期间不推进任何虚拟时间（battle 时钟只由规则命令推进，演出定时器此刻尚未启动）。
// ==========================================

const ESC = (s) => String(s == null ? '' : s).replace(/[&<>\"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// 纯函数（Node 定向测试用）：候选原样列表（{skill, usesLeft,...}），丢弃空项
export function reactionChoices(req) {
  return (req && Array.isArray(req.candidates) ? req.candidates : [])
    .filter(c => c && c.skill);
}
// 纯函数：AI 单位的自动选择策略（不弹窗）：返回 null 或 { responderId, skill }（v2 选择形状；承受攻击则为 null）
export function autoPickChoice(req) {
  const first = reactionChoices(req)[0];
  return first ? { responderId: first.responderId || req.responderId, skill: first.skill } : null;
}
// 候选种类：舍身（他人挺身）/ 看破（无效化）/ 普通反应
export function candidateKind(cand) {
  if (cand.guardian || (cand.skill && cand.skill.sheshenTarget)) return 'sheshen';
  if (cand.skill && cand.skill.kanpoTarget) return 'kanpo';
  return 'reaction';
}

const range = (a, b) => (a === b ? String(a) : a + '~' + b);

export function createReactionPrompt({ root, onUiSound } = {}) {
  let active = null;   // { overlay, reopen, resolve, done }

  function faceHtml(face, cls) {
    if (face && face.emoji) return '<span class="' + cls + ' t-face-emoji">' + ESC(face.emoji) + '</span>';
    if (face && face.avatarUrl) return '<span class="' + cls + '"><img src="' + ESC(face.avatarUrl) + '" alt="" draggable="false" referrerpolicy="no-referrer"></span>';
    return '<span class="' + cls + ' t-avatar-missing"><b class="t-avatar-missing-mark">头像缺失</b></span>';
  }
  function costOf(skill) {
    let html = '';
    if ((skill.cost || 0) > 0 || (!skill.hpCost && !skill.tpCost)) html += '<span class="t-rx-mp">-' + (skill.cost || 0) + 'MP</span>';
    if ((skill.hpCost || 0) > 0) html += '<span class="t-rx-hp">-' + skill.hpCost + 'HP</span>';
    if ((skill.tpCost || 0) > 0) html += '<span class="t-rx-tp">-' + skill.tpCost + 'TP</span>';
    return html;
  }
  function limitOf(skill, usesLeft) {
    return (skill.maxUses || 0) > 0 ? '<span class="t-rx-limit">[限' + (usesLeft != null ? usesLeft : skill.usesRemaining != null ? skill.usesRemaining : skill.maxUses) + '次]</span>' : '';
  }
  // 绑定需求徽章（原版 bindingsBadgeHTML）：候选已由规则按存量预筛，只展示需求与剩余量
  function bindOf(cand) {
    return (cand.bindings || []).map(b => {
      const icon = b.category === '弹药' ? '🔹' : b.category === '消耗品' ? '🧪' : '🎒';
      const remain = b.category === '道具' ? (b.remaining || 0) + '次' : String(b.remaining || 0);
      return '<span class="t-rx-bind">' + icon + ' ' + ESC(b.item) + '×' + b.cost + '（剩' + remain + '）</span>';
    }).join('');
  }
  const kanpoLabel = skill => (!skill.kanpoTarget || skill.kanpoTarget === 'all') ? '全能看破' : skill.kanpoTarget + '看破';

  // 来袭技能详情行（原版 buildSkillDetailHTML）：伤害属性 / 单体·群攻 / 威力 / 命中 / 暴击 / 段数
  function detailHtml(req, skill) {
    if (!skill) return '';
    const dmgType = req.incomingType || skill.damageType || '近战';
    const dmgIcon = dmgType === '远程' ? '🎯 远程' : dmgType === '法术' ? '🔮 法术' : '🗡️ 近战';
    const area = !!(skill.range && skill.range.type !== '单体' && skill.range.type !== '自身');
    const power = req.preview ? req.preview.power : skill.power;
    const seg = (req.totalShots || 0) > 1 ? '<span class="t-rx-seg">第 ' + ((req.shotIndex || 0) + 1) + '/' + req.totalShots + ' 段</span>' : '';
    return '<div class="t-rx-detail">' +
      '<div class="t-rx-row"><span class="t-rx-chip t-rx-chip-type">' + dmgIcon + '</span><span class="t-rx-chip">' + (area ? '群攻' : '单体') + '</span>' + seg + '</div>' +
      '<div class="t-rx-row t-rx-gap">' +
        '<span class="t-rx-dim">威力 <strong class="t-rx-cyan">' + ((power || 0) > 0 ? power : '普攻') + '</strong></span>' +
        '<span class="t-rx-dim">命中 <strong class="t-rx-indigo">' + (skill.guaranteedHit ? '必中' : (skill.hit ?? 100)) + '</strong></span>' +
        ((skill.critRate || 0) > 0 ? '<span class="t-rx-crit">💥' + skill.critRate + '%</span>' : '') +
      '</div></div>';
  }
  // 本段承伤预览（原版 buildReactionDamagePreview 三胶囊；数值全部来自规则层 req.preview）
  function damageHtml(req) {
    const p = req.preview;
    if (!p) return '';
    const buffLabel = p.atkBonus ? '<span class="t-rx-buff">(' + (p.atkBonus > 0 ? '+' : '') + p.atkBonus + ')</span>' : '';
    const powerLabel = (p.power || 0) === 0 ? '普攻' + p.baseAtk : '原伤';
    const armorLabel = p.pierce ? '⚡无视护甲' : '🛡️防' + p.def + (p.armorMult > 1 ? '×' + p.armorMult : '') + (p.defending ? '·减半' : '');
    const absorbed = (p.shieldMax || 0) > 0 || (p.guardMax || 0) > 0;
    const afterArmor = absorbed ? range(p.hpMin + p.shieldMin + p.guardMin, p.hpMax + p.shieldMax + p.guardMax) : range(p.hpMin, p.hpMax);
    const resist = p.resistMax < p.rawMax ? '<span class="t-rx-resist">抗性 → ' + range(p.resistMin, p.resistMax) + '</span>' : '';
    const finalCls = p.fatal ? 't-rx-cap t-rx-final t-rx-fatal tag-fx-fatal' : p.pierce ? 't-rx-cap t-rx-final t-rx-pierce tag-fx-molt' : 't-rx-cap t-rx-final';
    const alert = p.fatal ? '<span class="t-rx-alert-fatal">💀 致命风险 (MAX ' + p.hpMax + ' ≥ HP ' + p.targetHp + ')</span>'
      : p.pierce ? '<span class="t-rx-alert-pierce">⚡ 穿透攻击</span>' : '<span class="t-rx-alert-safe">● 安全承伤区间</span>';
    const notes = [];
    if ((p.guardMax || 0) > 0) notes.push('<span class="t-rx-guard">🪷 免伤池抵消: <strong>' + range(p.guardMin, p.guardMax) + '</strong></span>');
    if ((p.shieldMax || 0) > 0) notes.push('<span class="t-rx-shield">🛡️ 护盾吸收: <strong>' + range(p.shieldMin, p.shieldMax) + '</strong></span>');
    return '<div class="t-rx-dmg font-mono-num">' +
      '<div class="t-rx-caps">' +
        '<div class="t-rx-cap"><span class="t-rx-cap-lab">⚔️ ' + powerLabel + '</span><span class="t-rx-white">' + range(p.rawMin, p.rawMax) + '</span>' + buffLabel + '</div>' +
        '<div class="t-rx-cap"><span class="' + (p.pierce ? 't-rx-amber-lab' : 't-rx-cyan-lab') + '">' + armorLabel + '</span><span class="' + (p.pierce ? 't-rx-amber' : 't-rx-cyan') + '">' + afterArmor + '</span></div>' +
        '<div class="' + finalCls + '"><span class="t-rx-cap-lab">🩸 HP</span><b>' + range(p.hpMin, p.hpMax) + '</b></div>' +
      '</div>' +
      '<div class="t-rx-notes"><div class="t-rx-row t-rx-gap">' + (notes.length ? notes.join('') : '<span class="t-rx-faint">无护盾吸收</span>') + resist + '</div><div>' + alert + '</div></div>' +
    '</div>';
  }
  // 看破专属预览（原版 promptKanpo）：敌方输出 / 指定目标 / 拦截·全盘无效化
  function kanpoHtml(req, targetName) {
    const p = req.preview;
    return '<div class="t-rx-dmg t-rx-dmg-amber font-mono-num"><div class="t-rx-caps">' +
      (p ? '<div class="t-rx-cap t-rx-cap-amber"><span class="t-rx-amber-lab">⚔️ 敌方输出</span><span class="t-rx-white">' + range(p.rawMin, p.rawMax) + '</span></div>' : '') +
      '<div class="t-rx-cap t-rx-cap-amber"><span class="t-rx-amber-lab">🎯 指定目标</span><b class="t-rx-amber">' + ESC(targetName) + '</b></div>' +
      '<div class="t-rx-cap t-rx-cap-amber tag-fx-amber"><span class="t-rx-cap-lab">🛡️ 拦截</span><b>全盘无效化</b></div>' +
    '</div></div>';
  }
  function candidateHtml(cand, i) {
    const skill = cand.skill, kind = candidateKind(cand);
    const face = { emoji: cand.faceEmoji, avatarUrl: cand.faceAvatarUrl };
    if (kind === 'sheshen') {
      return '<button class="t-rx-cand t-rx-cand-sheshen group" data-ri="' + i + '"><span class="t-rx-cand-main">' + faceHtml(face, 't-rx-mini t-rx-mini-sky') +
        '<span class="t-rx-cand-text"><span class="t-rx-sky-name">' + ESC(cand.faceName || '') + '</span><span class="t-rx-white">🛡️ ' + ESC(skill.name) + '</span>' +
        '<span class="t-rx-badge t-rx-badge-sky">舍身</span>' + limitOf(skill, cand.usesLeft) + bindOf(cand) + '</span></span>' +
        '<span class="t-rx-cost t-rx-cost-sky">' + costOf(skill) + '</span></button>';
    }
    if (kind === 'kanpo') {
      return '<button class="t-rx-cand t-rx-cand-kanpo group" data-ri="' + i + '"><span class="t-rx-cand-main">' + faceHtml(face, 't-rx-mini t-rx-mini-amber') +
        '<span class="t-rx-cand-text"><span class="t-rx-amber-name">' + ESC(cand.faceName || '') + '</span><span class="t-rx-white">⚡ ' + ESC(skill.name) + '</span>' +
        '<span class="t-rx-badge t-rx-badge-amber">' + kanpoLabel(skill) + '</span>' + limitOf(skill, cand.usesLeft) + bindOf(cand) + '</span></span>' +
        '<span class="t-rx-cost t-rx-cost-amber">' + costOf(skill) + '</span></button>';
    }
    return '<button class="t-rx-cand group" data-ri="' + i + '"><span class="t-rx-cand-main"><span class="t-rx-bolt">⚡</span>' +
      '<span class="t-rx-cand-text"><b class="t-rx-white t-rx-black">' + ESC(skill.name) + '</b>' + limitOf(skill, cand.usesLeft) + bindOf(cand) + '</span></span>' +
      '<span class="t-rx-cost">' + costOf(skill) + '</span></button>';
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
    }, 200);
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
    btn.textContent = active.reopenLabel;
  }

  function prompt(req) {
    cancel();
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 't-reaction-overlay';
      const candidates = reactionChoices(req);
      const kinds = candidates.map(candidateKind);
      const hasSheshen = kinds.includes('sheshen'), hasReaction = kinds.some(k => k !== 'sheshen');
      const onlySheshen = hasSheshen && !hasReaction, onlyKanpo = kinds.length > 0 && kinds.every(k => k === 'kanpo');
      const tone = onlyKanpo ? 'amber' : onlySheshen ? 'sky' : 'indigo';
      const incoming = (req && req.skill) || null;
      const responder = { name: req && req.responderName, emoji: req && req.responderEmoji, avatarUrl: req && req.responderAvatarUrl };
      const casterName = (req && req.casterName) || '敌人';

      const skipText = onlyKanpo ? '放弃看破 (承受效果)' : onlySheshen ? '承受攻击' : '跳过 (不反应)';
      const listHtml = candidates.map(candidateHtml).join('') + '<button class="t-reaction-skip" data-ri="-1">' + skipText + '</button>';
      const head = onlyKanpo
        ? '<span class="t-rx-eye tag-fx-amber">👁️</span><div class="min-w-0"><div class="t-rx-row"><h3 class="t-rx-title t-rx-title-amber">看破契机！</h3><span class="t-rx-tag t-rx-tag-amber">INTERRUPT</span></div>'
        : faceHtml(responder, 't-reaction-face t-reaction-face-' + tone) + '<div class="min-w-0"><div class="t-rx-row"><h3 class="t-rx-title t-rx-title-' + tone + '">即将遭受攻击</h3><span class="t-rx-tag">REACTION</span></div>';

      overlay.innerHTML =
        '<div class="t-reaction-box t-reaction-box-' + tone + '">' +
          '<div class="t-reaction-beam t-reaction-beam-' + tone + '"></div>' +
          '<div class="t-rx-head">' +
            '<div class="t-rx-head-main">' + head +
                '<div class="t-rx-sub"><span class="t-rx-dim t-rx-trunc">面临 ' + ESC(casterName) + ' 的</span>' +
                  '<span class="' + (onlyKanpo ? 't-rx-rose' : 't-rx-gold') + '">【' + ESC(incoming ? incoming.name : '攻击') + '】</span></div>' +
              '</div></div>' +
            '<button class="t-reaction-shelve t-reaction-shelve-' + tone + '">收起</button>' +
          '</div>' +
          detailHtml(req, incoming) +
          (onlyKanpo ? kanpoHtml(req, req.responderName || '我方角色') : damageHtml(req)) +
          (hasSheshen && hasReaction ? '<div class="t-rx-sheshen-hint"><span>🛡️</span><span class="t-rx-trunc"><strong>舍身拦截可用</strong>：可指派队友挺身而出，替你全盘接下本次攻击。</span></div>' : '') +
          '<div class="t-rx-list custom-scrollbar">' + listHtml + '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      active = { overlay, reopen: null, resolve, done: false, reopenLabel: onlyKanpo ? '继续看破' : '继续反应' };
      overlay.addEventListener('click', e => {
        const b = e.target.closest('[data-ri]');
        if (!b) return;
        if (typeof onUiSound === 'function') onUiSound('select');
        const idx = Number(b.getAttribute('data-ri'));
        // v2 选择形状：{ responderId, skill }（舍身者为候选自身 responderId；跳过为 null）
        finish(idx === -1 ? null : { responderId: candidates[idx].responderId || req.responderId, skill: candidates[idx].skill });
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
