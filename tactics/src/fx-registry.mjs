// ==========================================
// 战棋演出注册表：fxTag / 空间形状 / 效果槽 → 演出条目（通用，可扩展；不为单个角色写特例）
// 分发顺序：① fxTag 精确匹配（条目可再附形状/槽谓词）→ ② 无 fxTag 的谓词条目（按注册序）→ ③ 兜底条目。
// 演出身份输入同时包含空间形状与效果槽标签（P06-FX-HANDOFF 契约 3）；只读 battle.attack() 提交结果，不查命中、不掷骰。
// 分级纪律（.agents/skills/svg-skill-vfx/SKILL.md）：每个条目声明 grade 与 timeline/cues，由 checkBudget 断言量级、时长、音量。
// 本文件无 DOM 依赖，Node 与浏览器共用。
// ==========================================

import { normalizeEffectTag } from './effect-definitions.mjs';

// L1 轻量：目标局部 ≤0.6s；L2 中量：周身+地面 0.8–1.2s；L3 重量：全屏 2–2.5s；L4 史诗：全屏+暗场 3–3.5s。
// 音量：L1 短反馈峰值 0.22–0.38；L2–L4 转折爆发/主攻击峰值 0.50–0.75。'identity' = 沿用回合制已定稿资产，不再分级。
export const GRADE_BUDGETS = {
  L1: { label: '轻量', minMs: 0, maxMs: 600, fullscreen: false, darken: false, peakVol: [0.22, 0.38], minChargeMs: 0 },
  L2: { label: '中量', minMs: 800, maxMs: 1200, fullscreen: false, darken: false, peakVol: [0.50, 0.75], minChargeMs: 0 },
  L3: { label: '重量', minMs: 2000, maxMs: 2500, fullscreen: true, darken: false, peakVol: [0.50, 0.75], minChargeMs: 800 },
  L4: { label: '史诗', minMs: 3000, maxMs: 3500, fullscreen: true, darken: true, peakVol: [0.50, 0.75], minChargeMs: 1200 },
};

const SLOT_RAW = tag => String(tag || '').replace(/[[\]]/g, '');

// 动作演出输入：result = battle.attack() 的 ok 结果
export function actionInput(result) {
  const skill = result.skill || {};
  const slots = (result.query && result.query.slotTargets) || [];
  // 槽标签统一走官方规范名（旧单群输入为别名，normalizeEffectTag 吸收；括号子型保留）
  const tags = [skill.type, skill.type2, skill.type3].filter(t => t && t !== '[无]').map(t => normalizeEffectTag(t) || SLOT_RAW(t));
  const attackSlots = slots.filter(s => s.attack).length;
  const effectSlots = slots.filter(s => !s.attack && s.side !== 'none' && SLOT_RAW(s.tag) !== '无');
  const selfOnly = !attackSlots && effectSlots.length > 0 && effectSlots.every(s => (s.targetIds || []).length === 1 && s.targetIds[0] === result.casterId);
  return {
    kind: 'action',
    fxTag: skill.fxTag || null,
    shape: (result.query && result.query.shape && result.query.shape.type) || (skill.range && skill.range.type) || null,
    slotTags: tags,
    attackSlots,
    selfOnly,
    grantsMainPoint: tags.some(t => t === '再动'),
    haste: skill.haste || 0,
    damageType: skill.damageType || null,
  };
}

// 反应演出输入：hit.reaction = { responderId, skillName, fxTag, canceled, shift }
export function reactionInput(reaction) {
  return { kind: 'reaction', fxTag: reaction.fxTag || null, skillName: reaction.skillName, canceled: !!reaction.canceled, shift: reaction.shift || null };
}

export function createFxRegistry() {
  const entries = [];
  function register(entry) {
    if (!entry || !entry.id || typeof entry.play !== 'function') throw new Error('演出条目缺少 id/play');
    if (entry.grade !== 'identity' && !GRADE_BUDGETS[entry.grade]) throw new Error('未知演出分级: ' + entry.grade + '（' + entry.id + '）');
    if (entries.some(e => e.id === entry.id)) throw new Error('演出条目重复注册: ' + entry.id);
    entries.push({ kind: 'action', ...entry });
    return api;
  }
  function resolve(input) {
    const pool = entries.filter(e => e.kind === input.kind);
    const ok = e => !e.match || e.match(input);
    return pool.find(e => e.fxTags && input.fxTag && e.fxTags.includes(input.fxTag) && ok(e))
      || pool.find(e => !e.fxTags && !e.fallback && e.match && e.match(input))
      || pool.find(e => e.fallback && ok(e))
      || null;
  }
  const api = { register, resolve, list: () => entries.slice() };
  return api;
}

// 分级预算核对：时长落在本级区间、L3/L4 蓄势达标、峰值音量落在本级区间、暗场只给 L4
export function checkBudget(entry) {
  if (entry.grade === 'identity') return { ok: true, reasons: [] };
  const b = GRADE_BUDGETS[entry.grade], t = entry.timeline || {}, reasons = [];
  const total = t.totalMs;
  if (!(total >= b.minMs && total <= b.maxMs)) reasons.push('时长 ' + total + 'ms 超出 ' + entry.grade + ' 区间 ' + b.minMs + '–' + b.maxMs);
  if (b.minChargeMs && !((t.chargeMs || 0) >= b.minChargeMs)) reasons.push('蓄势 ' + (t.chargeMs || 0) + 'ms 不足 ' + b.minChargeMs);
  if (!!t.darken !== b.darken) reasons.push('暗场使用与 ' + entry.grade + ' 不符');
  if (!!t.fullscreen !== b.fullscreen) reasons.push('全屏使用与 ' + entry.grade + ' 不符');
  const vols = (entry.cues || []).map(c => c.vol);
  const peak = vols.length ? Math.max(...vols) : 0;
  // reuseAudio：声音整体复用已定稿的攻击身份采样（如枪械），音量沿用原调校，不在本层重配
  if (!entry.reuseAudio && !(peak >= b.peakVol[0] && peak <= b.peakVol[1])) reasons.push('峰值音量 ' + peak + ' 超出 ' + b.peakVol.join('–'));
  return { ok: !reasons.length, reasons, peak };
}
