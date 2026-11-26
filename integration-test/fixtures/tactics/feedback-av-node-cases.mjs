// 真实视听代码的小宿主回归：辅助提速、隐匿音色、浮空采样续播与停止。
import { readFileSync } from 'node:fs';
import { createFxRegistry, reactionInput } from '../../../tactics/src/fx-registry.mjs';
import { registerDefaultFx, playPassiveGain, PASSIVE_AUDIO } from '../../../tactics/src/fx-library.mjs';
import { CLASS_STYLE, resolveFlightStyle } from '../../../tactics/src/unit-style.mjs';

const read = name => readFileSync(new URL('../../../tactics/src/' + name, import.meta.url), 'utf8');
const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail });

export function runCases() {
  const cases = [];
  const registry = registerDefaultFx(createFxRegistry());
  cases.push(ok('FB-AV08 registry看破优先 reaction-kanpo，非看破逆咒标签仍选 mirror-counter',
    registry.resolve(reactionInput({ kanpo: true, fxTag: '逆咒归源镜' }))?.id === 'reaction-kanpo'
    && registry.resolve(reactionInput({ kanpo: false, fxTag: '逆咒归源镜' }))?.id === 'mirror-counter'));

  const passiveLayers = [], passiveSounds = [], spriteAnimations = [];
  const makeElement = () => ({ animate(frames, opts) { this.frames = frames; this.opts = opts; }, style: {} });
  const makeLayer = html => {
    const count = [...html.matchAll(/<(?:i|b|svg)(?:\s|>)/g)].length;
    const children = Array.from({ length: Math.max(1, count) }, makeElement);
    const layer = { html, children, firstChild: children[0], appendChild() {}, querySelector: makeElement };
    passiveLayers.push(layer);
    return layer;
  };
  const host = {
    sfx(key, volume) { passiveSounds.push({ key, volume }); },
    uid() { return 'passive'; }, top(html) { return makeLayer(html); }, ground(html) { return makeLayer(html); },
  };
  for (const kind of ['taunt', 'stealth', 'haste']) {
    playPassiveGain(host, { kind, value: 2 }, { x: 3, y: 4 }, { animate(frames, opts) { spriteAnimations.push({ kind, frames, opts }); } });
  }
  const texts = passiveLayers.map(layer => layer.html).filter(html => /<b\s/.test(html));
  const byKind = {
    taunt: passiveLayers.find(layer => layer.html.includes('rgba(254,202,202')),
    stealth: passiveLayers.find(layer => layer.html.includes('rgba(199,210,254,0.5)')),
    haste: passiveLayers.find(layer => layer.html.includes('data-fx="rune"')),
  };
  cases.push(ok('FB-AV09 真实被动到账三类型分别有头顶文本、差异动效与采样',
    texts.some(html => html.includes('嘲讽 +2')) && texts.some(html => html.includes('隐匿 +2')) && texts.some(html => html.includes('加速 +2'))
    && passiveSounds.map(s => s.key).join(',') === 'taunt,hide,link_chime'
    && PASSIVE_AUDIO.includes('taunt') && PASSIVE_AUDIO.includes('hide') && PASSIVE_AUDIO.includes('link_chime')
    && spriteAnimations.length === 2
    && byKind.taunt?.children.some(el => el.opts?.duration === 520)
    && byKind.stealth?.children.length >= 14
    && byKind.haste?.children.some(el => el.opts?.duration === 600)
    && new Set(Object.values(byKind)).size === 3));
  const beforeMissing = passiveLayers.length + passiveSounds.length;
  playPassiveGain(host, { kind: 'taunt', value: 1 }, null, null);
  cases.push(ok('FB-AV10 被动到账缺坐标仍播放对应采样且不创建地图演出',
    passiveSounds.length === 4 && passiveSounds[3].key === 'taunt' && passiveLayers.length + passiveSounds.length === beforeMissing + 1));
  const av = read('vendor/rpg-av/rpg-av.mjs');
  const fx = read('fx-library.mjs');
  const main = read('main.mjs');
  const feedback = new Function(fx.slice(fx.indexOf('const SUPPORT_BUFF ='), fx.indexOf('async function playSupportEffects')) + '\nreturn supportFeedbackOf;')();
  cases.push(ok('FB-AV01 真实负嘲讽用hide，正嘲讽用taunt，增攻仍用atkUp',
    feedback({ kind: 'taunt', value: -30 })[1] === 'hide'
    && feedback({ kind: 'taunt', value: 30 })[1] === 'taunt'
    && feedback({ kind: 'buff', field: 'atk', value: 30 })[1] === 'atkUp'));

  const timers = [], particles = [], wrappers = [];
  const engine = { particles, addParticle: p => particles.push(p) };
  let stoppedAudio = 0, impacted = 0;
  const source = av.slice(av.indexOf('const supportHandles = new Set();'), av.indexOf('// ---- 事件总线'));
  const support = new Function('document', 'getEntitySpriteDom', '__GBCR', '__STAGE', 'spawnHealParticles', 'fxEngine', 'playSound', 'Date', 'setTimeout', 'clearTimeout',
    source + '\nreturn playGenericSupportFx;')(
    { createElement() { const node = { style: {}, firstElementChild: { style: {} }, remove() { this.removed = true; } }; wrappers.push(node); return node; } },
    () => ({ rect() { return { left: 0, top: 0, width: 100, height: 100 }; } }), 'rect', { el: { appendChild() {} } },
    add => add({ life: 900, vx: 2, vy: -2 }), engine,
    () => ({ stop() { stoppedAudio++; } }), { now: () => 100 },
    (fn, ms) => { const rec = { fn, ms, cleared: false }; timers.push(rec); return rec; }, rec => { rec.cleared = true; });
  const handle = support('h', 'buff', { soundKey: 'atkUp', onImpact() { impacted++; } });
  cases.push(ok('FB-AV02 辅助SVG/粒子/句柄同步1.5倍速且拍点一次', wrappers[0].style.animationDuration === '400ms'
    && particles[0].life === 600 && particles[0].vx === 3 && particles[0].vy === -3
    && timers[0].ms === 400 && timers[1].ms === 1100 / 1.5 && handle.doneAt === 100 + 1100 / 1.5 && impacted === 1));
  let finished = null;
  handle.onFinish.add(value => { finished = value; });
  handle.cancel();
  cases.push(ok('FB-AV03 取消辅助同时清SVG/粒子/定时器/声音并通知取消', wrappers[0].removed
    && engine.particles.length === 0 && timers.every(t => t.cleared) && stoppedAudio === 1 && finished === false));

  const activeGlides = new Map(), lastMoveClip = new Map(), cues = [];
  let stopped = 0;
  const effCode = main.slice(main.indexOf('  function effectiveUnitStyle('), main.indexOf('  function stopActiveGlide('));
  const stopCode = main.slice(main.indexOf('  function stopActiveGlide('), main.indexOf('  function pickClip('));
  const clipCode = main.slice(main.indexOf('  function pickClip('), main.indexOf('  function randRate('));
  const moveCode = main.slice(main.indexOf('  function moveFeedback('), main.indexOf('  // ---------- 胜负收束'));
  let flying = false;
  const moveFeedback = new Function('unitStyles', 'unitById', 'battle', 'isUnitFlying', 'resolveFlightStyle', 'sandbox', 'window', 'moveSfxOn', 'avHost', 'activeGlides', 'lastMoveClip', 'randRate', 'ui', 'fxNode',
    effCode + stopCode + clipCode + moveCode + '\nreturn moveFeedback;')(
    { h: CLASS_STYLE['施法者'] }, () => ({ footprint: { width: 1, height: 1 } }),
    { getEffectiveUnit: () => ({ buffs: flying ? [{ type: 'variant', variant: '飞行' }] : [] }) },
    (_u, eff) => !!(eff?.buffs?.some(b => b.variant === '飞行')),
    resolveFlightStyle,
    { worldToScreenClient: () => ({ x: 400, y: 300 }), getDom: () => null },
    { innerWidth: 1000 },
    true,
    { sfx(key, vol, opts) { const cue = () => { stopped++; }; cue.done = { then(fn) { cue.finish = fn; } }; cues.push({ cue, key, vol, opts }); return cue; } },
    activeGlides, lastMoveClip, () => 1, () => {}, () => {});

  // 施法者常态步行：step 走轻敏池且无滑行
  moveFeedback('h', 'start');
  moveFeedback('h', 'step', { x: 1, y: 1 });
  cases.push(ok('FB-AV04 施法者常态轻敏步态出步音、不触发飞行滑行',
    cues.length === 1 && cues[0].key.startsWith('move_hero_light_') && activeGlides.size === 0));

  // 获得飞行效果后动态切换飞行音效与续播
  flying = true;
  moveFeedback('h', 'start');
  cues[1].cue.finish(true);
  const repeated = cues.length === 3;
  moveFeedback('h', 'start');
  moveFeedback('h', 'stop');
  cases.push(ok('FB-AV05 获得飞行效果切换显性飞行音、自然结束续播且重复起步先停旧滑行',
    cues[1].key === 'move_flight_wind' && cues[1].vol >= 0.85 && repeated && stopped >= 1 && cues.length === 4));

  // 跳跃三段多变体与相邻去重
  const jumpBefore = cues.length;
  for (let i = 0; i < 3; i++) {
    moveFeedback('h', 'jump-crouch', { x: 2, y: 2 });
    moveFeedback('h', 'jump-takeoff', { x: 2, y: 2 });
    moveFeedback('h', 'jump-land', { x: 3, y: 3 });
  }
  const jCues = cues.slice(jumpBefore);
  const crouchKeys = jCues.filter((_, i) => i % 3 === 0).map(c => c.key);
  const takeoffKeys = jCues.filter((_, i) => i % 3 === 1).map(c => c.key);
  const landKeys = jCues.filter((_, i) => i % 3 === 2).map(c => c.key);
  cases.push(ok('FB-AV06 跳跃三段均播放独立 MP3 池且连续跳跃相邻去重',
    jCues.length === 9
    && crouchKeys.every(k => k.startsWith('jump_crouch_')) && crouchKeys[0] !== crouchKeys[1] && crouchKeys[1] !== crouchKeys[2]
    && takeoffKeys.every(k => k.startsWith('jump_takeoff_light_')) && takeoffKeys[0] !== takeoffKeys[1]
    && landKeys.every(k => k.startsWith('jump_land_light_')) && landKeys[0] !== landKeys[1]));

  // 记住上一次攻击技能：不静默切招、不满足条件明确提醒、蓄力排除
  const qaCode = main.slice(main.indexOf('  function resolveEnemyQuickAction('), main.indexOf('  function queueRows('));
  const lastAttackByUnit = new Map([['m1', { key: 'sk:1', name: '柯尔特三连发' }]]);
  const s1 = { name: '从西班牙射击', range: { type: '单体', castRange: 25 }, actionCost: { main: 1, aux: 0 }, effects: [{ attack: true }] };
  const s2 = { name: '柯尔特三连发', range: { type: '单体', castRange: 20 }, actionCost: { main: 1, aux: 0 }, effects: [{ attack: true }] };
  const sCharge = { name: '蓄力炮', charge: 1, range: { type: '单体', castRange: 20 }, actionCost: { main: 1, aux: 0 }, effects: [{ attack: true }] };
  let s2Ok = true, s2Reason = '', s2HitOk = true;
  const resolveQuick = new Function(
    'currentUnit', 'lastAttackByUnit', 'BASIC_ATTACK', 'skillUsable', 'skillReason', 'aimFor', 'battle', 'isSelfCast', 'skillSlots',
    qaCode + '\nreturn resolveEnemyQuickAction;'
  )(
    () => ({ id: 'm1', skills: [s1, s2, sCharge] }),
    lastAttackByUnit,
    { name: '普通攻击', range: { type: '单体', castRange: 1 } },
    sk => sk === s2 ? s2Ok : true,
    sk => sk === s2 ? s2Reason : '',
    (sk, hit) => ({ x: hit.x, y: hit.y, targetId: 'e1' }),
    { previewAttack: () => ({ ok: s2HitOk, reason: s2HitOk ? '' : '超出射程' }) },
    () => false,
    sk => sk.effects || []
  );
  const q1 = resolveQuick({ x: 5, y: 5, targetId: 'e1' });
  s2Ok = false; s2Reason = '弹药不足';
  const q2 = resolveQuick({ x: 5, y: 5, targetId: 'e1' });
  s2Ok = true; s2HitOk = false;
  const q3 = resolveQuick({ x: 5, y: 5, targetId: 'e1' });
  lastAttackByUnit.set('m1', { key: 'sk:2', name: '蓄力炮' });
  s2HitOk = true;
  const q4 = resolveQuick({ x: 5, y: 5, targetId: 'e1' });
  cases.push(ok('FB-AV07 记住上次攻击技能：优先保留三连发，不满足条件不切招并报原因，蓄力技能不走快捷交互',
    q1.ok && q1.skill === s2 && !q2.ok && q2.skill === s2 && q2.reason === '弹药不足'
    && !q3.ok && q3.skill === s2 && q3.reason === '超出射程'
    && q4.ok && q4.skill === s1));
  return { cases };
}

export const groups = { 'FEEDBACK-AV': { run: runCases } };
