// 真实视听代码的小宿主回归：辅助提速、隐匿音色、浮空采样续播与停止。
import { readFileSync } from 'node:fs';
import { CLASS_STYLE } from '../../../tactics/src/unit-style.mjs';

const read = name => readFileSync(new URL('../../../tactics/src/' + name, import.meta.url), 'utf8');
const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail });

export function runCases() {
  const cases = [];
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

  const activeGlides = new Map(), cues = [];
  let stopped = 0;
  const stopCode = main.slice(main.indexOf('  function stopActiveGlide('), main.indexOf('  function pickStepClip('));
  const moveCode = main.slice(main.indexOf('  function moveFeedback('), main.indexOf('  // ---------- 胜负收束'));
  const moveFeedback = new Function('unitStyles', 'unitById', 'moveSfxOn', 'avHost', 'activeGlides', 'randRate', 'ui',
    stopCode + moveCode + '\nreturn moveFeedback;')({ h: CLASS_STYLE['施法者'] }, () => ({}), true,
    { sfx(key, vol) { const cue = () => { stopped++; }; cue.done = { then(fn) { cue.finish = fn; } }; cues.push({ cue, key, vol }); return cue; } },
    activeGlides, () => 1, () => {});
  moveFeedback('h', 'start');
  cues[0].cue.finish(true);
  const repeated = cues.length === 2;
  moveFeedback('h', 'stop');
  cues[1].cue.finish(true);
  cases.push(ok('FB-AV04 施法者浮空有可闻采样，自然结束续播，停止调用真实句柄且不再续播',
    CLASS_STYLE['施法者'].gait.float > 0 && cues[0].vol === 0.72 && repeated
    && stopped === 1 && activeGlides.size === 0 && cues.length === 2));
  moveFeedback('h', 'start');
  moveFeedback('h', 'start');
  cues[2].cue.finish(true);
  cases.push(ok('FB-AV05 重复起步先停止旧滑行，不产生重复续播', stopped === 2 && cues.length === 4));
  moveFeedback('h', 'stop');
  return { cases };
}

export const groups = { 'FEEDBACK-AV': { run: runCases } };
