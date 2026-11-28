// 视听强化阶段 A：演出倍速 / 分轨音量与声像 / 局部顿帧 / 精简运镜
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SPEED_STEPS, fxNow, setTimeScale, getTimeScale } from '../../../tactics/src/time-scale.mjs';
import { createViewScope } from '../../../tactics/src/view-scope.mjs';
import { createActionDirector } from '../../../tactics/src/action-director.mjs';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../tactics/src');
const read = f => readFileSync(path.join(SRC, f), 'utf8');

function checker(cases) {
  return async (id, fn) => {
    try { await fn(); cases.push({ id, pass: true }); }
    catch (error) { cases.push({ id, pass: false, detail: error.stack }); }
  };
}

async function speed() {
  const cases = [], check = checker(cases);
  await check('AVP-S01 四档倍速 1.0/1.2/1.5/2.0', () => assert.deepEqual(SPEED_STEPS, [1, 1.2, 1.5, 2]));
  await check('AVP-S02 虚拟时钟按倍速积分、换档不回溯', () => {
    const a = fxNow();
    setTimeScale(2);
    const r0 = performance.now(); while (performance.now() - r0 < 30) { /* 忙等 30ms */ }
    const b = fxNow();
    setTimeScale(1);
    const c = fxNow();
    assert.ok(b - a >= 55, '2× 下 30ms 真实时间应推进约 60ms 虚拟时间：' + (b - a));
    assert.ok(c >= b, '换档后单调');
    assert.equal(getTimeScale(), 1);
  });
  await check('AVP-S03 演出作用域计时/间隔/冻结按倍速换成真实毫秒', () => {
    const armed = [];
    const s = createViewScope({ setTimeout: (fn, ms) => { armed.push(['t', ms]); return armed.length; }, clearTimeout() {},
      setInterval: (fn, ms) => { armed.push(['i', ms]); return armed.length; }, clearInterval() {}, time: () => 0, scale: () => 2 });
    s.after(100, () => {});
    s.every(100, () => {});
    s.hold(80);
    assert.deepEqual(armed, [['t', 50], ['i', 50], ['t', 40]]);
  });
  await check('AVP-S04 规则模块不读演出时钟（倍速不改结算）', () => {
    for (const f of ['battle.mjs', 'clock.mjs', 'scheduler.mjs', 'damage.mjs', 'range.mjs', 'ai.mjs', 'movement.mjs', 'parser.mjs'])
      assert.ok(!read(f).includes('time-scale'), f + ' 不应引用 time-scale');
  });
  return { cases };
}

async function vendor() {
  const cases = [], check = checker(cases);
  const av = read('vendor/rpg-av/rpg-av.mjs');
  const mixA = av.indexOf('const _fxAudioCache = new Map();'), mixB = av.indexOf('function applyAudioVolume(');
  const outside = av.slice(0, mixA) + av.slice(mixB);
  await check('AVP-V01 混音器之外的底座计时与时刻全部走宿主虚拟时钟', () => {
    assert.ok(mixA > 0 && mixB > mixA);
    assert.equal((outside.match(/(?<![.\w$])(setTimeout|setInterval)\(|(?<![.\w$])performance\.now\(\)|(?<![.\w$])Date\.now\(\)/g) || []).length, 0);
    assert.ok(/const __fxNow = host\.clock\.now/.test(av));
    assert.ok(av.includes('v.playbackRate = rate * __fxScale();'));
  });
  await check('AVP-V02 混音器主总线 + 五轨，语音独立轨，环境音独立轨', () => {
    const mixer = av.slice(mixA, mixB);
    assert.ok(mixer.includes("__master.connect(ctx.destination)"));
    assert.ok(mixer.includes("['skill', 'result', 'aux', 'voice', 'atmo']"));
    assert.ok(mixer.includes("category === 'N' ? 'voice'"));
    assert.ok(/return \{ setBusVolume, setPanHint, context/.test(mixer));
    assert.ok(av.includes("bus.connect(CombatAudioMixer.output('atmo', 'L'));"));
  });
  await check('AVP-V03 声像提示只作用于战斗音效轨（技能/结果），显式声像优先', () => {
    assert.ok(av.includes("const __p = opts.pan != null ? opts.pan : (cue.track === 'skill' || cue.track === 'result') ? __panHint : null;"));
  });
  return { cases };
}

function directorHarness() {
  const paused = [], played = [], stops = [], recoil = [], pans = [];
  const anim = id => ({ id, playState: 'running', pause() { this.playState = 'paused'; paused.push(id); }, play() { this.playState = 'running'; played.push(id); } });
  const nodes = new Map(['c', 'a'].map(id => [id, { root: { getAnimations: () => [anim(id)] }, sprite: { animate: (frames, opts) => { recoil.push({ id, frames, opts }); return {}; } } }]));
  const scope = { isLive: true, addNode() {}, removeNode() {}, after: (_, fn) => fn(), settleOnDispose: () => () => {}, animate() {} };
  const units = [{ id: 'c', side: 'hero', ref: { atk: 10 } }, { id: 'a', side: 'enemy' }];
  const director = createActionDirector({
    sandbox: { getScope: () => scope, getUnitView: () => ({ setDisplayFacing() {}, updateUnit() {}, nodes }),
      unitWorldCenter: id => ({ x: id === 'c' ? 1 : 4, y: 2 }), worldToScreenClient: x => ({ x: x * 100, y: 0 }), async guideTo() {},
      getDom: () => ({ world: { insertBefore() {}, appendChild() {} }, unitLayer: {}, viewport: { getBoundingClientRect: () => ({ left: 0, width: 500 }) } }) },
    getViewData: () => ({ units, placementsById: { c: {}, a: {} }, footprintsById: {} }),
    avHost: { syncRoster() {}, entity: id => ({ id }), particleStop: ms => stops.push(ms), setPanHint: p => pans.push(p),
      av: { CombatAudioMixer: { classify: () => 'B' },
        CombatAudioDirector: { beginAction: () => 1, beginWave: () => null, publish() {}, completeTarget() {}, closeWave() {} },
        playHitFeedback() {} } },
    registry: { resolve: () => ({ prepareKeys: () => [], async play(ctx) { ctx.revealSegment('a', 0); return true; } }) },
  });
  return { director, paused, played, stops, recoil, pans };
}

async function director() {
  const cases = [], check = checker(cases);
  const src = read('action-director.mjs');
  const fnText = src.slice(src.indexOf('function hitStopMs(r) {'), src.indexOf('  // 只冻结出手者与受击者'));
  const hitStopMs = new Function(fnText + '\nreturn hitStopMs;')();
  await check('AVP-D01 顿帧分档：<10% 不顿 / 10–25% 40 / ≥25% 70 / 暴击或击杀 110 / 闪避与护盾全挡不顿', () => {
    const r = (hpDmg, extra = {}) => ({ outcome: 'hit', hpDmg, maxHp: 100, hpBefore: 100, hpAfter: 100 - hpDmg, ...extra });
    assert.equal(hitStopMs(r(9)), 0);
    assert.equal(hitStopMs(r(10)), 40);
    assert.equal(hitStopMs(r(24)), 40);
    assert.equal(hitStopMs(r(25)), 70);
    assert.equal(hitStopMs(r(60)), 70);
    assert.equal(hitStopMs(r(5, { isCrit: true })), 110);
    assert.equal(hitStopMs(r(5, { hpBefore: 5, hpAfter: 0 })), 110);
    assert.equal(hitStopMs(r(30, { outcome: 'dodge' })), 0);
    assert.equal(hitStopMs(r(0)), 0);
  });
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, insertBefore() {}, remove() {} }) };
  try {
    await check('AVP-D02 局部顿帧只冻结出手者与受击者 + 粒子层，解冻后受击者沿来袭方向回弹', async () => {
      const h = directorHarness();
      const ok = await h.director.playAttack({ ok: true, casterId: 'c', skill: { name: '重击', fxTag: 'x', power: 30 }, effects: [], events: [],
        hits: [{ targetId: 'a', side: 'enemy', maxHp: 100, segments: [{ hit: true, outcome: 'hit', hpBefore: 100, hpAfter: 70, hpDmg: 30, maxHp: 100 }] }] });
      assert.equal(ok, true);
      assert.deepEqual(h.stops, [70]);
      assert.deepEqual(h.paused.sort(), ['a', 'c']);
      assert.deepEqual(h.played.sort(), ['a', 'c']);
      assert.equal(h.recoil.length, 1);
      assert.equal(h.recoil[0].id, 'a');
      assert.equal(h.recoil[0].opts.composite, 'add');
      assert.ok(/translate\(4\.0px,0\.0px\)/.test(h.recoil[0].frames[1].transform), h.recoil[0].frames[1].transform);
    });
    await check('AVP-D03 声像：出手者 → 受击者 → 收尾清空，取视口横向位置压到 ±0.6', async () => {
      const h = directorHarness();
      await h.director.playAttack({ ok: true, casterId: 'c', skill: { name: '重击', fxTag: 'x', power: 30 }, effects: [], events: [],
        hits: [{ targetId: 'a', side: 'enemy', maxHp: 100, segments: [{ hit: true, outcome: 'hit', hpBefore: 100, hpAfter: 95, hpDmg: 5, maxHp: 100 }] }] });
      assert.equal(h.pans.length, 3);
      assert.ok(Math.abs(h.pans[0] - (-0.36)) < 1e-9, String(h.pans[0]));
      assert.ok(Math.abs(h.pans[1] - 0.36) < 1e-9, String(h.pans[1]));
      assert.equal(h.pans[2], null);
      assert.deepEqual(h.stops, []);
    });
  } finally {
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
  await check('AVP-D04 精简运镜：同出手者同技能本场再次施放不建运镜，氛围层保留', () => {
    assert.ok(src.includes("const liteCine = !!deps.liteRepeatCine?.() && cineSeen.keys.has(cineKey);"));
    assert.ok(src.includes('const cine = atmos && entry.cine !== false && !liteCine ? startCine({'));
    assert.ok(read('main.mjs').includes("liteRepeatCine: () => audioPrefs.liteCine !== false"));
  });
  return { cases };
}

export const groups = { 'AVP-SPEED': { run: speed }, 'AVP-VENDOR': { run: vendor }, 'AVP-DIRECTOR': { run: director } };
