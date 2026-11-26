// ==========================================
// 战棋状态可读性：状态徽章（地图紧凑 / 英雄卡与检视卡完整）、效果飘字文案、单位检视卡。
// 只读后端有效属性视图（battle.getEffectiveUnit：buffs[].remaining 为时钟真实剩余回合）与 result.effects；不重算任何规则。
// 文案与配色沿用原版 index.html updateBuffUI（L20390）与 registerTagHandler 飘字。
// ==========================================

import { BASE_TAUNT } from './class-passives.mjs';

const ESC = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const NEG = '#c084fc';
const STAT = {
  atk: { icon: '⚔️', name: '攻', color: '#fb923c', title: '攻击' },
  def: { icon: '🛡️', name: '防', color: '#60a5fa', title: '防御' },
  hit: { icon: '🎯', name: '命', color: '#fde047', title: '命中' },
  eva: { icon: '💨', name: '避', color: '#5eead4', title: '回避' },
  spd: { icon: '⚡', name: '速', color: '#67e8f9', title: '速度' },
};
const sign = v => (v >= 0 ? '+' : '') + v;
const turnsText = (rem, consumable) => rem != null ? rem + '回' : consumable ? '1次' : '';

// 有效属性视图 → 徽章列表（按重要度：控制 > 持续伤害 > 减益 > 增益 > 其它）
export function statusBadges(eff, extra = {}) {
  if (!eff) return [];
  const buffs = eff.buffs || [];
  const out = [];
  const push = (b, rank) => out.push({ ...b, rank });
  const group = type => buffs.filter(b => b.type === type);
  const maxRem = list => list.reduce((m, b) => b.remaining == null ? m : Math.max(m ?? 0, b.remaining), null);
  const expiring = list => list.some(b => b.remaining != null && b.remaining <= 1);

  if (eff.stunned) push({ key: 'stun', icon: '💫', text: '眩晕', short: '眩晕', color: '#facc15', neg: true, title: '【眩晕】跳过下一次自然行动' }, 0);
  if (group('defend').length) push({ key: 'defend', icon: '🛡️', text: '防卫', short: '防卫', color: '#6ee7b7', title: '【防卫姿态】受到伤害降低，命中+30', expiring: expiring(group('defend')) }, 1);
  for (const [type, icon, name, color] of [['poison', '☠️', '毒', '#c084fc'], ['burn', '🔥', '燃', '#fb923c']]) {
    const g = group(type);
    if (!g.length) continue;
    const v = type === 'burn' ? Math.max(...g.map(b => b.value)) : g.reduce((n, b) => n + b.value, 0), rem = maxRem(g);
    push({ key: type, icon, text: name + v + (rem != null ? '·' + rem + '回' : ''), short: name + v, color, neg: true, expiring: expiring(g),
      title: type === 'poison' ? '【中毒】每回合损失 ' + v + ' HP，可叠层（' + g.length + ' 层）' : '【燃烧】每回合损失 ' + v + ' HP，治疗减半' }, 2);
  }
  const para = group('paralyze');
  if (para.length) push({ key: 'paralyze', icon: '⚡', text: '麻' + para.length + '层·' + Math.min(20, para.length * 5) + '%' + (maxRem(para) != null ? '·' + maxRem(para) + '回' : ''), short: '麻' + para.length,
    color: '#fde047', neg: true, expiring: expiring(para), title: '【麻痹】回避 ' + para.reduce((n, b) => n + b.value, 0) + '，行动僵直概率 ' + Math.min(20, para.length * 5) + '%' }, 2);
  const rush = group('atk').filter(b => b.isConcealAtk);
  if (rush.length) {
    const value = rush.reduce((n, b) => n + b.value, 0);
    push({ key: 'conceal-atk', icon: '🎯', text: '急袭+' + value + '·1次', short: '急袭+' + value + '·1次', color: '#fbbf24',
      title: '【隐匿急袭】下一次非反应攻击 +' + value + '，出手后消耗；未使用时按原期限过期' }, 4);
  }
  for (const [field, s] of Object.entries(STAT)) {
    const g = group(field).filter(b => !b.isConcealAtk);
    if (!g.length) continue;
    const v = g.reduce((n, b) => n + b.value, 0);
    if (!v) continue;
    const rem = maxRem(g), consumable = g.every(b => b.isConsumable), t = turnsText(rem, consumable);
    push({ key: field, icon: v < 0 && field === 'spd' ? '🐌' : s.icon, text: s.name + sign(v) + (t ? '·' + t : ''), short: s.name + sign(v), color: v < 0 ? NEG : s.color, neg: v < 0,
      expiring: expiring(g), title: '【' + s.title + (v < 0 ? '下降' : '提升') + '】' + sign(v) + (t ? '，剩余 ' + t : '') }, v < 0 ? 3 : 4);
  }
  const tauntDelta = eff.taunt - BASE_TAUNT;
  if (tauntDelta) {
    const hidden = tauntDelta < 0;
    const value = hidden ? -tauntDelta : sign(tauntDelta);
    const name = hidden ? '隐匿' : '嘲讽';
    push({ key: 'taunt', icon: hidden ? '🌫️' : '💢', text: name + ' ' + value, short: (hidden ? '匿' : '嘲') + value,
      color: hidden ? '#94a3b8' : '#fca5a5', title: hidden ? '当前隐匿值 ' + value : '当前嘲讽 ' + value }, 5);
  }
  const counter = group('counter');
  if (counter.length) { const v = counter.reduce((n, b) => n + b.value, 0);
    push({ key: 'counter', icon: '⚔️', text: v ? '反击+' + v : '反击架势', short: '反击', color: '#fcd34d', expiring: expiring(counter), title: '【反击架势】受到攻击时反击' + (v ? '，附加威力 +' + v : '') }, 5); }
  const guard = group('damageGuard');
  if (guard.length) push({ key: 'damageGuard', icon: '🛡️', text: '免伤+' + guard.reduce((n, b) => n + b.value, 0), short: '免伤', color: '#7dd3fc', title: '【免伤】本次整技累计可抵消的伤害额度' }, 5);
  for (const b of group('variant')) push({ key: 'variant:' + b.variant, icon: '🧬', text: b.variant + (b.remaining != null ? '·' + b.remaining + '回' : ''), short: b.variant, color: '#67e8f9',
    expiring: b.remaining != null && b.remaining <= 1, title: '【' + b.variant + '】获得特性' + (b.remaining != null ? '，剩余 ' + b.remaining + ' 回合' : '') }, 6);
  if (eff.chargeInventory > 0) push({ key: 'haste', icon: '⚡', text: '加速 ' + eff.chargeInventory,
    short: '加速 ' + eff.chargeInventory, color: '#67e8f9', title: '【加速】剩余 ' + eff.chargeInventory + ' 点，用于开始或继续蓄力' }, 1);
  if (eff.shield > 0) push({ key: 'shield', icon: '🔰', text: '护盾' + eff.shield, short: '盾' + eff.shield, color: '#e2e8f0', title: '【护盾】先于 HP 承受伤害' }, 6);
  if (extra.preparing) push({ key: 'prep', icon: '⏳', text: '蓄力·' + extra.preparing.name + (extra.preparing.remaining > 0 ? ' 还需' + extra.preparing.remaining : ' 就绪'), short: '蓄力',
    color: '#fde68a', title: '【蓄力】' + extra.preparing.name }, 1);
  return out.sort((a, b) => a.rank - b.rank);
}

const badgeHtml = (b, full) => '<span class="t-st' + (b.key === 'taunt' ? ' t-st-taunt' : '') + (b.neg ? ' t-st-neg' : '') + (b.expiring ? ' t-st-exp' : '') + '" style="--c:' + b.color + '" title="' + ESC(b.title || b.text) + '">' +
  '<i>' + b.icon + '</i>' + ESC(full ? b.text : b.short) + '</span>';
// 地图单位：最多 max 个紧凑徽章，其余折叠为 +N
export function compactStatusHtml(list, max = 4) {
  if (!list.length) return '';
  return list.slice(0, max).map(b => badgeHtml(b, false)).join('') + (list.length > max ? '<span class="t-st t-st-more" title="' + ESC(list.slice(max).map(b => b.text).join(' / ')) + '">+' + (list.length - max) + '</span>' : '');
}
export function fullStatusHtml(list) { return list.map(b => badgeHtml(b, true)).join(''); }
// 徽章 → 头像持续弧光种类（同种只一层，按徽章重要度由内向外，最多 max 层）；持续伤害/麻痹/护盾已有独立状态层，不重复
export function auraList(list, max = 4) {
  const out = [], seen = new Set();
  const add = (kind, b) => { if (!seen.has(kind)) { seen.add(kind); out.push({ kind, exp: !!b.expiring }); } };
  for (const b of list) {
    if (STAT[b.key]) add(b.neg ? 'down' : b.key, b);
    else if (b.key === 'conceal-atk') add('atk', b);
    else if (b.key === 'damageGuard') add('def', b);
    else if (b.key === 'defend' || b.key === 'counter') add(b.key, b);
    else if (b.key === 'taunt') add(b.text.startsWith('隐匿') ? 'hide' : 'taunt', b);
  }
  return out.slice(0, max);
}

// 单个效果结果 → 飘字（原版 registerTagHandler 文案：攻+50 3回 / 速-20 3回 / +35HP …）；blocked 由结界演出负责
export function effectFloat(e) {
  if (!e || e.kind === 'blocked') return null;
  const crit = e.crit ? '暴击 ' : '';
  const tw = Number.isFinite(e.turns) ? ' ' + e.turns + '回' : '';
  switch (e.kind) {
    case 'heal': return { text: crit + '+' + e.value + ' HP' + (e.burning ? ' 🔥减疗' : ''), color: e.burning ? '#fdba74' : '#dcfce7', glow: '#16a34a' };
    case 'healMp': return { text: crit + '+' + e.value + ' MP', color: '#e0f2fe', glow: '#0369a1' };
    case 'healTp': return { text: crit + '+' + e.value + ' TP', color: '#d1fae5', glow: '#047857' };
    case 'shield': return { text: crit + '+' + e.value + ' 护盾', color: '#e2e8f0', glow: '#475569' };
    case 'buff': {
      const s = STAT[e.field] || { name: e.field, color: '#e2e8f0' };
      const once = /单避/.test(e.tag || '');
      return { text: crit + s.name + sign(e.value) + (once ? ' 1次' : tw), color: e.value < 0 ? '#e9d5ff' : s.color, glow: e.value < 0 ? '#6b21a8' : '#1e293b' };
    }
    case 'taunt': return { text: (e.value >= 0 ? '仇恨+' + e.value : '隐匿' + e.value) + tw, color: e.value >= 0 ? '#fca5a5' : '#cbd5e1', glow: '#7f1d1d' };
    case 'dot':
      if (e.immune) return { text: '免疫' + (e.dot === 'burn' || /燃|灼/.test(e.tag || '') ? '燃烧' : '中毒'), color: '#e2e8f0', glow: '#334155' };
      return e.dot === 'poison' ? { text: '☠️ 毒' + e.strength + tw, color: '#e9d5ff', glow: '#6b21a8' } : { text: '🔥 燃' + e.strength + tw, color: '#fed7aa', glow: '#9a3412' };
    case 'paralyze': return { text: '⚡ 麻痹 第' + e.layers + '层' + tw, color: '#fef08a', glow: '#854d0e' };
    case 'drainMp': return e.drained > 0 ? { text: '-' + e.drained + ' MP', color: '#e9d5ff', glow: '#6b21a8' } : { text: '无法力可抽', color: '#cbd5e1', glow: '#334155' };
    case 'mainPoint': return { text: '再动 +' + e.points, color: '#f5d0fe', glow: '#a21caf' };
    case 'damageGuard': return { text: '免伤 +' + e.value, color: '#bae6fd', glow: '#0369a1' };
    case 'stun': return e.immune ? { text: '免疫眩晕', color: '#e2e8f0', glow: '#334155' } : { text: '💫 眩晕', color: '#fef08a', glow: '#854d0e' };
    case 'counter': return { text: '反击架势' + tw, color: '#fde68a', glow: '#92400e' };
    case 'dispel': return { text: e.removed && e.removed.length ? '驱散 ' + e.removed.length + ' 负面' : '无负面', color: '#a7f3d0', glow: '#065f46' };
    case 'variant': return e.exhausted ? { text: e.variant + ' 已耗尽', color: '#cbd5e1', glow: '#334155' } : { text: '🧬 ' + e.variant + tw, color: '#a5f3fc', glow: '#0e7490' };
    default: return null;
  }
}

// 原版 showEnemyInfo VARIANT_TAG_CONFIG（index.html L26424）：名称 / 说明 / 图标 / 主色
const VARIANT_TAGS = {
  复活: ['✨', '死后以 30% 生命值复活一次', '#6ee7b7'], 智慧: ['🧠', '三档智慧旁白（回合开始/低血/死亡）', '#fda4af'],
  蜕皮: ['🐍', '首次跌破50%：清除全部debuff + 回血30% + 永久攻击+50%', '#fcd34d'], 荆棘: ['🌵', '被近战命中反弹 50% 实际伤害（护甲减免后保底10）', '#86efac'],
  连动: ['⚡', 'HP≤30% 时立刻额外行动一次（一次性）', '#f0abfc'], 狂暴: ['🩸', 'HP≤30% 时攻击力 +50%', '#fca5a5'],
  吸血: ['🧛', '造成实际伤害时吸取 30% 转化为自身生命', '#fda4af'], 再生: ['🌿', '每回合开始回复 10% 最大生命值', '#6ee7b7'],
  流体: ['💧', '受到的远程伤害 -50%', '#7dd3fc'], 虚形: ['👻', '受到的近战伤害 -50%', '#a5b4fc'], 破法: ['🔮', '受到的法术伤害 -50%', '#d8b4fe'],
  要害: ['💠', '受到的群攻伤害 -50%', '#5eead4'], 防火: ['🔥', '免疫点燃（燃烧）状态施加', '#fdba74'], 耐毒: ['🧪', '免疫中毒状态施加', '#d8b4fe'],
  钢体: ['⛓️', '免疫眩晕控制状态', '#cbd5e1'], 飞行: ['🕊️', '基础移动额度 +50%，普通移动可跨低障碍', '#a7f3d0'],
};
function tagChip(raw) {
  const name = String(raw).replace(/^\[|\]$/g, ''), ex = /^自爆[:：](.+)$/.exec(name);
  const [icon, tip, color] = ex ? ['💥', '死亡自爆（' + ex[1] + '）：对周围我方造成伤害或状态', '#fca5a5'] : (VARIANT_TAGS[name] || ['🔹', name, '#cbd5e1']);
  return '<span class="t-insp-tag" style="--c:' + color + '" data-tagtip-title="【' + ESC(ex ? '自爆·' + ex[1] : name) + '】" data-tagtip-body="' + ESC(tip) + '"><i>' + icon + '</i>' + ESC(ex ? '自爆·' + ex[1] : name) + '</span>';
}

// 单位检视卡（原版 showEnemyInfo「20% 超透光战术目镜」样式）：base = 无增益基础属性（getEffectiveStats(unit, [])），eff = 有效属性视图，lore = resolveLore(unit)
export function inspectorHtml({ unit, eff, base, badges, charge, preparing, shown, lore }) {
  if (!unit || !eff) return '';
  const hp = shown ? shown.hp : eff.hp, mp = shown ? shown.mp : eff.mp, tp = shown ? shown.tp : eff.tp;
  const gauge = (cls, icon, label, v, max) => max > 0 ? '<div class="t-insp-gauge ' + cls + '"><div class="t-insp-gauge-row"><span>' + icon + ' ' + label + '</span><b>' + Math.max(0, Math.floor(v)) + ' / ' + max + '</b></div>' +
    '<div class="t-insp-gauge-track"><i style="width:' + Math.max(0, Math.min(100, v / max * 100)).toFixed(1) + '%"></i></div></div>' : '';
  const chip = (cls, icon, label, now, b) => {
    const d = b == null ? 0 : now - b;
    return '<span class="t-insp-chip ' + cls + '"><i>' + icon + '</i>' + label + ':<b>' + now + '</b>' + (d ? '<em class="' + (d > 0 ? 't-up' : 't-down') + '">' + sign(d) + '</em>' : '') + '</span>';
  };
  const ally = unit.side === 'hero';
  const sideBadge = unit.isSummon ? '<span class="t-insp-badge t-summon">召唤物</span>' : '<span class="t-insp-badge ' + (ally ? 't-ally' : 't-foe') + '">' + (ally ? '我方' : '敌方') + '</span>';
  const tags = (unit.attrTags || []).filter(Boolean);
  const moveD = +(eff.effectiveMoveDistance - eff.moveDistance).toFixed(1);
  return '<div class="t-insp-glass">' +
    '<div class="t-insp-head"><span class="t-insp-emoji">' + ESC(unit.emoji || (ally ? '🛡️' : '☠️')) + '</span><div class="t-insp-title"><b>' + ESC(unit.name) + '</b>' +
      '<div class="t-insp-badges-row">' + sideBadge + (unit.classType ? '<span class="t-insp-badge">' + ESC(unit.classType) + '</span>' : '') +
      (unit.isWise || unit.ref?.isWise ? '<span class="t-insp-badge t-wise">🧠 智慧单位</span>' : '') + '<span class="t-insp-badge t-mono">TARGET INSPECT</span></div></div></div>' +
    '<div class="t-insp-panel">' + gauge('t-hp', '❤️', '生命 HP', hp, eff.maxHp) + (eff.shield > 0 ? '<div class="t-insp-shield">🔰 护盾 ' + eff.shield + '</div>' : '') +
      gauge('t-mp', '💧', '法力 MP', mp, eff.maxMp) + gauge('t-tp', '🔥', '战意 TP', tp, eff.maxTp) + '</div>' +
    '<div class="t-insp-chips">' + chip('t-atk', '⚔️', 'ATK', eff.atk, base.atk) + chip('t-def', '🛡️', 'DEF', eff.def, base.def) + chip('t-spd', '⚡', 'SPD', eff.spd, base.spd) +
      chip('t-hit', '🎯', '命中', eff.hit, base.hit) + chip('t-eva', '💨', '回避', (eff.evasion || 0) + eff.eva, (eff.evasion || 0) + base.eva) +
      '<span class="t-insp-chip t-mov"><i>🦶</i>移动:<b>' + (+eff.effectiveMoveDistance.toFixed(1)) + 'm</b>' + (moveD ? '<em class="t-up">' + sign(moveD) + '</em>' : '') + '</span></div>' +
    (charge && charge.max ? '<div class="t-insp-row">⚡ 充能 ' + charge.current + '/' + charge.max + (charge.current >= charge.max ? ' · <b class="t-warn">大招就绪</b>' : '') + '</div>' : '') +
    (preparing ? '<div class="t-insp-row">⏳ 蓄力【' + ESC(preparing.name) + '】' + (preparing.remaining > 0 ? '还需 ' + preparing.remaining + ' 主行动' : '已就绪') + '</div>' : '') +
    (tags.length ? '<div class="t-insp-sec"><div class="t-insp-sec-h"><span>🧬 变种特质与被动</span></div><div class="t-insp-tags">' + tags.map(tagChip).join('') + '</div></div>' : '') +
    '<div class="t-insp-sec"><div class="t-insp-sec-h"><span>✨ 当前状态</span></div><div class="t-insp-badges">' + (badges.length ? fullStatusHtml(badges) : '<span class="t-insp-none">无增益 / 减益</span>') + '</div></div>' +
    (lore ? '<div class="t-insp-lore"><div class="t-insp-lore-h"><span>📚 世界书图鉴档案</span><em>' + (lore.sample ? 'SAMPLE' : 'LORE ENTRY') + '</em></div>' +
      '<p>' + ESC(lore.desc || '词条无描述文字') + '</p><div class="t-insp-lore-src">' + ESC(lore.wbName || '') + (lore.entryName ? ' · ' + ESC(lore.entryName) : '') + '</div></div>' : '') +
    '<div class="t-insp-foot"><span>悬停查看</span><span class="t-mono">20% 超透光战术目镜</span></div></div>';
}
