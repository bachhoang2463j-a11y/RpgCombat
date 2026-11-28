// 视听强化：阶段 A 演出倍速 / 分轨音量与声像 / 局部顿帧 / 精简运镜；阶段 B 敌方威胁区 / 残血预警
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SPEED_STEPS, fxNow, setTimeScale, getTimeScale } from '../../../tactics/src/time-scale.mjs';
import { createViewScope } from '../../../tactics/src/view-scope.mjs';
import { createActionDirector } from '../../../tactics/src/action-director.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { threatOf, threatHeat, threatReach } from '../../../tactics/src/threat.mjs';
import { cellKey } from '../../../tactics/src/geometry.mjs';
import { inferFxTag, applyFxInference, skillElement, unitElement, INFERABLE_FX } from '../../../tactics/src/fx-infer.mjs';
import { getFxTagOptions } from '../../../tactics/src/fx-library.mjs';
import { lightTier, seedOf } from '../../../tactics/src/battle-marks.mjs';
import { parseYamlText, parseSkill } from '../../../tactics/src/parser.mjs';
import { inspectorHtml, variantFloat, expireFloat } from '../../../tactics/src/status-ui.mjs';
import { DEMO_AUDIO_KEYS, createAvHost } from '../../../tactics/src/av-host.mjs';

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
      getDom: () => ({ world: { insertBefore() {}, appendChild() {} }, art: {}, unitLayer: {}, viewport: { getBoundingClientRect: () => ({ left: 0, width: 500 }) } }) },
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

function tUnit(id, side, opts = {}) {
  return { id, name: id, side, controller: side === 'hero' ? 'player' : 'ai', footprint: { width: 1, height: 1 }, skills: opts.skills || [], items: [],
    ref: { hp: opts.hp ?? 100, maxHp: 100, mp: opts.mp ?? 20, maxMp: 20, tp: 0, maxTp: 100, atk: 20, def: 0, spd: opts.spd ?? 50, evasion: 0,
      strength: 50, totalWeight: 50, perception: 100, moveDistance: opts.moveDistance ?? 3 } };
}
function tBattle(units, placements, { columns = 16, rows = 12, objects = [] } = {}) {
  const b = createBattle({ units, placementsById: placements, scene: { sceneId: 'threat', grid: { columns, rows, metersPerCell: 1 }, ground: {}, objects, encounter: true }, random: () => 0.5 });
  b.start();
  return b;
}
const tWall = (col, row, height = 1) => ({ id: 'w' + col + '-' + row, kind: 'wall', bounds: { col, row, width: 1, height } });
const rifle = { name: '步枪', type: '[伤害]', power: 30, cost: 2, damageType: '远程', actionCost: { main: 1, aux: 0 }, range: { type: '单体', castRange: 8 } };
const profile = (b, id) => { const e = b.getEffectiveUnit(id); return { moveDistance: e.effectiveMoveDistance, jumpDistance: e.jumpDistance, skills: b.threatSkills(id) }; };

async function threat() {
  const cases = [], check = checker(cases);
  await check('AVP-T01 近战威胁：可走 = 基础移动寻路，可打 = 出手点 + 普攻 2m 射程', () => {
    const b = tBattle([tUnit('e', 'enemy', { moveDistance: 3 }), tUnit('h', 'hero')], { e: { col: 2, row: 5, facing: 180 }, h: { col: 14, row: 5, facing: 0 } });
    const t = threatOf(b.ctx, 'e', profile(b, 'e'));
    const keys = new Set(t.move.map(c => cellKey(c.col, c.row)));
    assert.ok(keys.has(cellKey(5, 5)) && !keys.has(cellKey(6, 5)), '3m 直走到 (5,5) 为止');
    assert.ok(t.attackKeys.has(cellKey(7, 5)) && !t.attackKeys.has(cellKey(8, 5)), '5 格处可打，6 格处打不到');
    assert.ok(t.sprint.length > 0 && t.jump.length === 0, '冲刺可达列出；1m 跳跃落点都已能走到，不重复');
    assert.ok(!t.attackKeys.has(cellKey(2, 5)), '自身占格不计');
  });
  await check('AVP-T01b 被低墙围住：走不出去，只从原位起跳一次的落点算作出手点', () => {
    const ring = [];
    for (let row = 4; row <= 6; row++) for (let col = 4; col <= 6; col++) if (col !== 5 || row !== 5) ring.push({ id: 'l' + col + row, kind: 'lowCounter', bounds: { col, row, width: 1, height: 1 } });
    const b = tBattle([tUnit('e', 'enemy', { moveDistance: 6 }), tUnit('h', 'hero')], { e: { col: 5, row: 5 }, h: { col: 14, row: 10 } }, { objects: ring });
    const t = threatOf(b.ctx, 'e', profile(b, 'e'));
    const jumps = new Set(t.jump.map(c => cellKey(c.col, c.row)));
    assert.equal(t.move.length, 0);
    assert.ok(jumps.has(cellKey(7, 5)) && jumps.has(cellKey(3, 5)) && !jumps.has(cellKey(3, 3)), '斜向 2.83m 超出 2m 跳距：' + [...jumps].join(' '));
    assert.ok(t.attackKeys.has(cellKey(9, 5)) && !t.attackKeys.has(cellKey(10, 5)), '跳到 (7,5) 后普攻 2m');
  });
  await check('AVP-T02 远程威胁：墙后阴影格不在可打范围，墙前同距离格在', () => {
    const b = tBattle([tUnit('e', 'enemy', { moveDistance: 0, skills: [rifle] }), tUnit('h', 'hero')],
      { e: { col: 2, row: 5, facing: 90 }, h: { col: 15, row: 0, facing: 0 } }, { objects: [tWall(5, 4, 3)] });
    const t = threatOf(b.ctx, 'e', profile(b, 'e'));
    assert.equal(t.reach, 8);
    assert.ok(!t.attackKeys.has(cellKey(7, 5)), '正对墙的阴影格被挡');
    assert.ok(t.attackKeys.has(cellKey(2, 10)), '同距离的空旷格可打');
    assert.ok(!t.attackKeys.has(cellKey(5, 5)), '墙格本身不画');
  });
  await check('AVP-T03 可用技能口径：MP 不足、限次用尽、延迟准备、反应技能都排除，普攻保留', () => {
    const broke = { ...rifle, name: '贵枪', cost: 99 };
    const used = { ...rifle, name: '限次枪', maxUses: 1 };
    const slow = { ...rifle, name: '蓄力炮', delay: 2 };
    const react = { ...rifle, name: '反击', isReaction: true };
    const b = tBattle([tUnit('e', 'enemy', { skills: [rifle, broke, used, slow, react] }), tUnit('h', 'hero')], { e: { col: 2, row: 5 }, h: { col: 14, row: 5 } });
    const names = b.threatSkills('e').map(s => s.name);
    assert.ok(names.includes('步枪') && names.includes('限次枪') && names.includes('普通攻击'), names.join(','));
    assert.ok(!names.includes('贵枪') && !names.includes('蓄力炮') && !names.includes('反击'), names.join(','));
  });
  await check('AVP-T04 射程口径：爆炸 = 投射 + 半径，圆形 = 半径，自身/召唤不计，冲锋取较远', () => {
    assert.equal(threatReach({ type: '爆炸', castRange: 10, radius: 2.5 }), 12.5);
    assert.equal(threatReach({ type: '圆形', radius: 4 }), 4);
    assert.equal(threatReach({ type: '自身' }), null);
    assert.equal(threatReach({ type: '召唤' }), null);
    assert.equal(threatReach({ type: '直线', length: 3, width: 1 }, { displacements: [{ type: '冲锋', distance: 6 }] }), 6);
    assert.equal(threatReach({ type: '单体' }), Infinity);
  });
  await check('AVP-T05 合集热度：同格被两名敌人覆盖计 2', () => {
    const heat = threatHeat([{ attack: [{ col: 1, row: 1 }, { col: 2, row: 1 }] }, { attack: [{ col: 2, row: 1 }] }]);
    assert.equal(heat.get(cellKey(2, 1)).n, 2);
    assert.equal(heat.get(cellKey(1, 1)).n, 1);
  });
  await check('AVP-T06 全尺寸地图（32×26、带立柱）单个远程敌人威胁计算 < 250ms', () => {
    const objects = [];
    for (const col of [6, 12, 19, 25]) for (const row of [5, 12, 19]) objects.push({ id: 'p' + col + row, kind: 'pillar', bounds: { col, row, width: 1, height: 1 } });
    const far = { ...rifle, name: '狙击', range: { type: '单体', castRange: 25 } };
    const b = tBattle([tUnit('e', 'enemy', { moveDistance: 6, skills: [far] }), tUnit('h', 'hero')], { e: { col: 15, row: 3 }, h: { col: 15, row: 23 } },
      { columns: 32, rows: 26, objects });
    const t0 = performance.now();
    const t = threatOf(b.ctx, 'e', profile(b, 'e'));
    const ms = performance.now() - t0;
    assert.ok(ms < 250, ms.toFixed(1) + 'ms');
    assert.ok(t.attack.length > 400, String(t.attack.length));
  });
  await check('AVP-T07 主流程接线：悬停单个、T 键合集、移动提示人数、只画看得见的敌人、状态变化清缓存', () => {
    const main = read('main.mjs');
    assert.ok(main.includes("if (threatId !== threatHoverId) { threatHoverId = threatId; updateThreat(); }"));
    assert.ok(main.includes("(e.key === 't' || e.key === 'T')"));
    assert.ok(main.includes("'<br><b class=\"t-kill\">⚠ 进入 ' + n + ' 名敌人射程</b>'"));
    assert.ok(main.includes('heroes.some(h => canSeeUnit(battle.ctx, h.id, u.id))'));
    assert.ok(main.includes('threatCache.clear();'));
    assert.ok(main.includes('if (!battle || !currentViewData || busy || !isHeroTurn()) { sandbox.setThreat(null); return; }'));
  });
  await check('AVP-T08 威胁区偏淡 50% 且显式选招/锁定隐藏悬停威胁区', () => {
    const ro = read('range-overlay.mjs'), main = read('main.mjs');
    assert.ok(ro.includes("move: 'rgba(239,68,68,0.07)'") && ro.includes("atk: 'rgba(220,38,38,0.035)'") && ro.includes("atkEdge: 'rgba(252,165,165,0.425)'"));
    assert.ok(ro.includes('Math.min(0.21, 0.03 + 0.04 * c.n)'));
    assert.ok(main.includes('const suppressHover = !!(aim || pending || fieldAction || retargetPrompt || teleportPrompt);'));
    assert.ok(main.includes('!suppressHover && threatHoverId'));
  });
  return { cases };
}

async function lowHpWarn() {
  const cases = [], check = checker(cases);
  const main = read('main.mjs'), css = readFileSync(path.join(SRC, '..', 'tactics.css'), 'utf8'), sfx = read('ui-sfx.mjs');
  await check('AVP-L01 残血阈值 30%：外环慢闪只给存活英雄', () => {
    assert.ok(main.includes('return s.hp > 0 && max > 0 && s.hp / max <= 0.3;'));
    assert.ok(main.includes("view.setFlag(u.id, 't-unit-lowhp', u.side === 'hero' && lowHp(u));"));
    assert.ok(css.includes('.t-side-hero.t-unit-lowhp:not(.t-unit-down) .t-unit-medal::after'));
  });
  await check('AVP-L02 本人行动开始 / 被敌方前摇锁定时心跳 + 边缘泛红，每次行动一次', () => {
    assert.ok(main.includes("if (lowHp(u)) lowHpAlarm('turn:' + snap.actionSerial + ':' + u.id);"));
    assert.ok(main.includes("if (lowTarget) lowHpAlarm('aim:' + battle.snapshot().actionSerial + ':' + actorId + ':' + lowTarget.id);"));
    assert.ok(main.includes('if (lowHpAlarms.has(key)) return;'));
    assert.ok(/heartbeat\(c, t\) \{/.test(sfx));
    assert.ok(css.includes('.t-lowhp-vignette'));
  });
  return { cases };
}

async function infer() {
  const cases = [], check = checker(cases);
  const legal = new Set(getFxTagOptions().map(o => o.name));
  const sk = (name, type, extra = {}) => ({ name, type, power: 60, damageType: '近战', range: { type: '单体', castRange: 2 }, ...extra });
  await check('AVP-C01 推断白名单内的名字全部是演出库合法名；专属演出不在可推断集合', () => {
    for (const n of INFERABLE_FX) assert.ok(legal.has(n), n);
    for (const n of ['克虏伯重狙', '极地暴风雪', '维度撕裂', '时空扭曲震荡', '圣光01', '净蚀反冲', '火焰领域']) assert.ok(!INFERABLE_FX.includes(n), n);
  });
  await check('AVP-C02 顺序：显式「无」与合法名不动；非法名别名/就近纠正；未写按关键词', () => {
    assert.equal(inferFxTag(sk('砍', '[伤害]', { fxTag: '无' }), { legal }), null);
    assert.equal(inferFxTag(sk('砍', '[伤害]', { fxTag: '克虏伯重狙' }), { legal }), null);
    assert.equal(inferFxTag(sk('x', '[伤害]', { fxTag: '火球' }), { legal }).fxTag, '火焰');
    assert.equal(inferFxTag(sk('x', '[伤害]', { fxTag: '冰霜弹' }), { legal }).fxTag, '冰霜');
    assert.equal(inferFxTag(sk('x', '[伤害]', { fxTag: '爪击·重' }), { legal }).fxTag, '爪击');
    const r = inferFxTag(sk('撕裂利爪', '[伤害]'), { legal });
    assert.deepEqual([r.fxTag, r.reason], ['爪击', 'keyword']);
  });
  await check('AVP-C03 元素优先于枪械：火焰弹→火焰、冰霜子弹→冰霜、鹿弹齐射→霰弹', () => {
    assert.equal(inferFxTag(sk('火焰弹', '[伤害]', { damageType: '远程' }), { legal }).fxTag, '火焰');
    assert.equal(inferFxTag(sk('冰霜子弹', '[伤害]', { damageType: '远程' }), { legal }).fxTag, '冰霜');
    assert.equal(inferFxTag(sk('鹿弹齐射', '[伤害]', { damageType: '远程' }), { legal }).fxTag, '霰弹');
    assert.equal(inferFxTag(sk('毒雾吐息', '[伤害]', { range: { type: '扇形', length: 4, angle: 60 } }), { legal }).fxTag, '毒雾');
  });
  await check('AVP-C04 升档：Charge / 首领 / 单段 power≥140 任一满足才升档', () => {
    const fire = sk('烈焰冲击', '[伤害]', { damageType: '法术' });
    assert.equal(inferFxTag(fire, { legal }).fxTag, '火焰');
    assert.equal(inferFxTag({ ...fire, charge: 2 }, { legal }).fxTag, '火焰01');
    assert.equal(inferFxTag(fire, { legal, boss: true }).fxTag, '火焰01');
    assert.equal(inferFxTag({ ...fire, power: 140 }, { legal }).fxTag, '火焰01');
    assert.equal(inferFxTag({ ...fire, power: 139 }, { legal }).fxTag, '火焰');
  });
  await check('AVP-C05 兜底：范围 × 伤害类型；辅助技能按回复/增益/减益/再动', () => {
    assert.equal(inferFxTag(sk('重拳', '[伤害]', { name: '无名一击', power: 120 }), { legal }).fxTag, '近战重击');
    assert.equal(inferFxTag(sk('无名一击', '[伤害]', { damageType: '远程', range: { type: '单体', castRange: 10 } }), { legal }).fxTag, '枪击');
    assert.equal(inferFxTag(sk('无名一击', '[伤害]', { damageType: '法术', range: { type: '圆形', radius: 3 } }), { legal }).fxTag, 'group:spell');
    assert.equal(inferFxTag(sk('祷言', '[回复]', { range: { type: '单体', castRange: 4 } }), { legal }).fxTag, '单体回复');
    assert.equal(inferFxTag(sk('战歌', '[增攻]', { range: { type: '圆形', radius: 4 } }), { legal }).fxTag, '群体增益');
    assert.equal(inferFxTag(sk('疾行', '[再动]', { range: { type: '自身' } }), { legal }).fxTag, '再动加速');
  });
  await check('AVP-C06 典型对局：显式标签全部保留；去掉全部标签后 6 名敌人至少 4 种首技能演出', () => {
    const block = parseYamlText(readFileSync(path.join(SRC, '..', '..', 'doc', 'tactics', '典型对局-战棋版.yaml'), 'utf8'));
    const units = [...block.heroes, ...block.enemies];
    const before = JSON.stringify(units.map(u => (u.skills || []).map(s => s.fxTag)));
    const n = units.reduce((k, u) => k + applyFxInference(u.skills, { legal, boss: u.level === '首领' }) + applyFxInference(u.items, { legal, boss: u.level === '首领' }), 0);
    assert.equal(n, 0, '显式合法标签不应被改');
    assert.equal(JSON.stringify(units.map(u => (u.skills || []).map(s => s.fxTag))), before);
    const first = new Set(block.enemies.map(u => { const s = (u.skills || []).find(x => !x.isGroup); const r = s && inferFxTag({ ...s, fxTag: null }, { legal }); return r ? r.fxTag : null; }));
    assert.ok(first.size >= 4, [...first].join(','));
  });
  await check('AVP-C07 元素判定：特效标签优先，再看伤害类别槽，最后按伤害类型', () => {
    assert.equal(skillElement({ fxTag: '火焰01', type: '[伤害]' }), 'fire');
    assert.equal(skillElement({ fxTag: '枪击', type: '[伤害]' }), 'gun');
    assert.equal(skillElement({ type: '[冰霜]' }), 'frost');
    assert.equal(skillElement({ type: '[伤害]', damageType: '法术' }), 'arcane');
    assert.equal(skillElement({ type: '[回复]' }), null);
    assert.equal(unitElement({ skills: [{ type: '[伤害]', power: 20, fxTag: '爪击' }, { type: '[伤害]', power: 90, fxTag: '雷击' }] }), 'thunder');
  });
  await check('AVP-C08 编辑器显示「（推断）」，显式选「无」存为「无」不再被补回；编辑覆写清推断标记', () => {
    const ep = read('editor-panel.mjs'), main = read('main.mjs');
    assert.ok(ep.includes("label + '（推断）'"));
    assert.ok(ep.includes("s.fxTag = val(id('fxTag')) || '无';"));
    assert.ok(main.includes('delete row.fxTagInferred;'));
    assert.ok(main.includes('inferUnitFx(nextView.units);'));
  });
  return { cases };
}

async function looks() {
  const cases = [], check = checker(cases);
  const main = read('main.mjs'), uv = read('unit-view.mjs'), css = readFileSync(path.join(SRC, '..', 'tactics.css'), 'utf8'), marks = read('battle-marks.mjs'), ad = read('action-director.mjs');
  await check('AVP-E01 敌人徽章：显式等级优先于强度分级；奖章上不叠特性角标', () => {
    assert.ok(main.includes("const tier = u.level === '首领' ? 'boss' : u.level === '精英' ? 'elite' : u.level === '杂兵' ? 'fodder'"));
    assert.ok(uv.includes("'<i class=\"t-unit-tierframe\" aria-hidden=\"true\"></i>'") && !uv.includes('t-unit-traits'));
    for (const k of ['.t-badge-elite .t-unit-tierframe', '.t-badge-boss .t-unit-tierframe']) assert.ok(css.includes(k), k);
    assert.ok(!css.includes('.t-trait'));
  });
  await check('AVP-E02 留痕：上限 40、3 回合淡出、种子决定形态（同键同种子）', () => {
    assert.ok(marks.includes('MAX_MARKS = 40') && marks.includes('LIFE = ROUND_TIME * 3'));
    assert.equal(seedOf('seg-1:0'), seedOf('seg-1:0'));
    assert.notEqual(seedOf('seg-1:0'), seedOf('seg-1:1'));
    assert.ok(ad.includes('if (c && seg.hit && seg.hpDmg > 0) addMark('));
    assert.ok(main.includes('director.ageMarks(snap.now);'));
  });
  await check('AVP-E03 光照分级：L3/L4 8m 600ms，L2 4m 450ms，其余 2m 300ms；枪口闪光', () => {
    assert.deepEqual(lightTier('L4'), { radius: 8, ms: 600 });
    assert.deepEqual(lightTier('L3'), { radius: 8, ms: 600 });
    assert.deepEqual(lightTier('L2'), { radius: 4, ms: 450 });
    assert.deepEqual(lightTier('identity'), { radius: 2, ms: 300 });
    assert.ok(ad.includes("if (element === 'gun') flash(centerOf(result.casterId), 'gun', { radius: 1, ms: 160 }, 0.7);"));
  });
  await check('AVP-E04 检视面板补全死亡触发自爆（食尸鬼 💥 自爆·群火）并去重', () => {
    const block = parseYamlText(readFileSync(path.join(SRC, '..', '..', 'doc', 'tactics', '典型对局-战棋版.yaml'), 'utf8'));
    const ghoul = block.enemies.find(e => e.name.includes('食尸鬼'));
    const html = inspectorHtml({ unit: ghoul, eff: { hp: ghoul.hp, maxHp: ghoul.maxHp, mp: 0, maxMp: 0, tp: 0, maxTp: 100, shield: 0, atk: ghoul.atk, def: ghoul.def, spd: ghoul.spd, hit: ghoul.hit, eva: 0, effectiveMoveDistance: 3, moveDistance: 3, buffs: [] }, base: { atk: ghoul.atk, def: ghoul.def, spd: ghoul.spd, hit: ghoul.hit, eva: 0 }, badges: [] });
    assert.ok(html.includes('💥') && html.includes('自爆·群火'), html);
    assert.ok(html.includes('复活') && html.includes('流体'));
    const dup = inspectorHtml({ unit: { ...ghoul, attrTags: [...(ghoul.attrTags || []), '[自爆:群火]'] }, eff: { hp: ghoul.hp, maxHp: ghoul.maxHp, mp: 0, maxMp: 0, tp: 0, maxTp: 100, shield: 0, atk: ghoul.atk, def: ghoul.def, spd: ghoul.spd, hit: ghoul.hit, eva: 0, effectiveMoveDistance: 3, moveDistance: 3, buffs: [] }, base: { atk: ghoul.atk, def: ghoul.def, spd: ghoul.spd, hit: ghoul.hit, eva: 0 }, badges: [] });
    assert.equal(dup.match(/自爆·群火/g)?.length, 2, 'title 与正文中各自爆·群火只应出现一次（不重复标签）');
  });
  return { cases };
}

async function stageD() {
  const cases = [], check = checker(cases);
  const mk = (id, side, opts = {}) => ({ id, name: id, side, footprint: { width: 1, height: 1 }, skills: opts.skills || [], items: [], attrTags: opts.attrTags || [],
    ref: { hp: opts.hp ?? 100, maxHp: opts.maxHp ?? 100, mp: 100, maxMp: 100, shield: opts.shield ?? 0, atk: opts.atk ?? 20, def: 0, spd: opts.spd ?? (side === 'hero' ? 100 : 10), evasion: 0, moveDistance: 6, reviveCount: 1 } });

  await check('AVP-SD01 变体音频键全部纳入 DEMO_AUDIO_KEYS 预载', () => {
    for (const k of ['revive_gather', 'revive_bloom', 'molt_crack', 'molt_snap', 'molt_empower', 'rage_exit', 'leech_flow', 'regen_hum', 'thorn_parry'])
      assert.ok(DEMO_AUDIO_KEYS.includes(k), k);
  });
  await check('AVP-SD02 连动/蜕皮清除列表/吸血/荆棘真实事件发射', () => {
    const b1 = createBattle({ units: [mk('h', 'hero'), mk('e', 'enemy', { attrTags: ['[连动]', '[蜕皮]'] })],
      placementsById: { h: { col: 1, row: 1 }, e: { col: 3, row: 1 } }, scene: { sceneId: 'sd1', grid: { columns: 8, rows: 6, metersPerCell: 1 }, objects: [] }, random: () => 0.5 });
    b1.start();
    b1.attack(parseSkill('【烧】造成[燃烧;power:5;turns:2]伤害[必中][远程][范围:单体;射程:10]'), { x: 3.5, y: 1.5, targetId: 'e' });
    const res1 = b1.attack(parseSkill('【重击】造成[伤害;power:75]伤害[必中][远程][范围:单体;射程:10]'), { x: 3.5, y: 1.5, targetId: 'e' });
    const molt = res1.events.find(e => e.type === 'variant-trigger' && e.trigger === 'molt');
    assert.ok(molt && molt.clearedDebuffs?.includes('burn') && molt.hpBefore < molt.hpAfter, JSON.stringify(molt));
    // 蜕皮回血到 50 HP；再一击压到 ≤30% 触发连动
    b1.endAction();
    const res1b = b1.attack(parseSkill('【补刀】造成[伤害;power:30]伤害[必中][远程][范围:单体;射程:10]'), { x: 3.5, y: 1.5, targetId: 'e' });
    const link = res1b.events.find(e => e.type === 'variant-trigger' && e.trigger === 'link');
    assert.ok(link && link.unitId === 'e', JSON.stringify(link));

    const b2 = createBattle({ units: [mk('h', 'hero', { attrTags: ['[吸血]'], hp: 60, spd: 20 }), mk('e', 'enemy', { attrTags: ['[荆棘]', '[再生]'], hp: 80, spd: 10 })],
      placementsById: { h: { col: 1, row: 1 }, e: { col: 2, row: 1 } }, scene: { sceneId: 'sd2', grid: { columns: 8, rows: 6, metersPerCell: 1 }, objects: [] }, random: () => 0.5 });
    b2.start();
    const res2 = b2.attack(parseSkill('【斩】造成[伤害;power:30]伤害[必中][近战][范围:单体;射程:2]'), { x: 2.5, y: 1.5, targetId: 'e' });
    const leech = res2.events.find(e => e.type === 'variant-trigger' && e.trigger === 'leech');
    const thorn = res2.events.find(e => e.type === 'variant-trigger' && e.trigger === 'thorn');
    assert.ok(leech && leech.unitId === 'h' && leech.sourceId === 'e' && leech.healed > 0 && leech.segmentId, JSON.stringify(leech));
    assert.ok(thorn && thorn.sourceId === 'e' && thorn.targetId === 'h' && thorn.isMelee && thorn.reflected && thorn.hpDmg > 0, JSON.stringify(thorn));

  });
  await check('AVP-SD06 再生按100时间周期结算，事件与实际HP一致且满血截断', () => {
    const b = createBattle({ units: [mk('h', 'hero', { spd: 200 }), mk('e', 'enemy', { attrTags: ['[再生]'], hp: 75, spd: 100 })],
      placementsById: { h: { col: 1, row: 1 }, e: { col: 2, row: 1 } }, scene: { sceneId: 'sd6', grid: { columns: 8, rows: 6, metersPerCell: 1 }, objects: [] }, random: () => 0.5 });
    const expected = [
      { at: 100, hpBefore: 75, hpAfter: 85, healed: 10 },
      { at: 200, hpBefore: 85, hpAfter: 95, healed: 10 },
      { at: 300, hpBefore: 95, hpAfter: 100, healed: 5 },
    ];
    let snap = b.start();
    assert.equal(snap.now, 50);
    for (let i = 0; i < 13; i++) {
      const due = expected.filter(ev => ev.at <= snap.now);
      const events = snap.events.filter(ev => ev.type === 'variant-trigger' && ev.trigger === 'regen' && ev.unitId === 'e');
      assert.deepEqual(events.map(({ at, hpBefore, hpAfter, healed }) => ({ at, hpBefore, hpAfter, healed })), due, '周期事件不能提前、遗漏或重复');
      assert.equal(snap.units.find(u => u.id === 'e').hp, due.at(-1)?.hpAfter ?? 75, '快照HP应与周期事件一致');
      assert.equal(snap.terminal, null);
      if (snap.now >= 400) break;
      snap = b.endAction();
    }
    assert.ok(snap.now >= 400, '应覆盖满血后的下一周期');
    assert.equal(snap.events.filter(ev => ev.type === 'variant-trigger' && ev.trigger === 'regen').length, 3, '满血不能发射虚假回血事件');
  });
  await check('AVP-SD03 眩晕跳过发 stun-skipped，增减益区分自然到期与驱散', () => {
    const b = createBattle({ units: [mk('h', 'hero', { spd: 2 }), mk('e', 'enemy', { spd: 1 })],
      placementsById: { h: { col: 1, row: 1 }, e: { col: 3, row: 1 } }, scene: { sceneId: 'sd3', grid: { columns: 8, rows: 6, metersPerCell: 1 }, objects: [] }, random: () => 0.5 });
    b.start();
    const debuffRes = b.attack(parseSkill('【弱】[弱攻;power:10;turns:1][必中][远程][范围:单体;射程:10]'), { x: 3.5, y: 1.5, targetId: 'e' });
    assert.ok(debuffRes.ok && debuffRes.effects.length > 0, debuffRes.reason);
    b.endAction();
    const stunRes = b.attack(parseSkill('【震】[眩晕][必中][远程][范围:单体;射程:10]'), { x: 3.5, y: 1.5, targetId: 'e' });
    assert.ok(stunRes.ok, stunRes.reason);
    let evs = [];
    for (let i = 0; i < 10; i++) {
      evs = b.endAction().events;
      if (evs.some(e => e.type === 'stun-skipped') && evs.some(e => e.type === 'status-removed' && e.kind === 'atk' && e.reason === 'expired')) break;
    }
    assert.ok(evs.some(e => e.type === 'stun-skipped' && e.unitId === 'e'), '眩晕跳过应发射 stun-skipped');
    assert.ok(evs.some(e => e.type === 'status-removed' && e.unitId === 'e' && e.kind === 'atk' && e.reason === 'expired'), '自然到期应标明 reason=expired');

    const bClean = createBattle({ units: [mk('h', 'hero', { spd: 200 }), mk('e', 'enemy', { spd: 10, attrTags: ['[蜕皮]'] })],
      placementsById: { h: { col: 1, row: 1 }, e: { col: 3, row: 1 } }, scene: { sceneId: 'sd3b', grid: { columns: 8, rows: 6, metersPerCell: 1 }, objects: [] }, random: () => 0.5 });
    bClean.start();
    bClean.attack(parseSkill('【弱】[弱攻;power:10;turns:3][必中][远程][范围:单体;射程:10]'), { x: 3.5, y: 1.5, targetId: 'e' });
    const moltRes = bClean.attack(parseSkill('【砸】[伤害;power:60][必中][远程][范围:单体;射程:10]'), { x: 3.5, y: 1.5, targetId: 'e' });
    assert.ok(moltRes.events.some(e => e.type === 'status-removed' && e.kind === 'atk' && e.reason === 'dispelled'), '蜕皮驱散不应标为 expired');
  });
  await check('AVP-SD04 死亡自爆记录护盾破碎前后快照；飘字与到期映射覆盖完整', () => {
    const b = createBattle({ units: [mk('h', 'hero', { shield: 15, hp: 100 }), mk('e', 'enemy', { hp: 20, attrTags: ['[自爆:群伤;power:80]'] })],
      placementsById: { h: { col: 1, row: 1 }, e: { col: 2, row: 1 } }, scene: { sceneId: 'sd4', grid: { columns: 8, rows: 6, metersPerCell: 1 }, objects: [] }, random: () => 0.5 });
    b.start();
    const res = b.attack(parseSkill('【斩】[伤害;power:50][必中][近战][范围:单体;射程:2]'), { x: 2.5, y: 1.5, targetId: 'e' });
    const sd = res.events.find(e => e.type === 'self-destruct');
    assert.ok(sd && sd.targets[0].shieldBefore === 15 && sd.targets[0].shieldAfter === 0 && sd.targets[0].shieldDmg === 15, JSON.stringify(sd));
    assert.ok(variantFloat({ trigger: 'link' })?.text.includes('连动'));
    assert.ok(variantFloat({ trigger: 'thorn', hpDmg: 12 })?.text.includes('12'));
    assert.ok(expireFloat({ kind: 'atk', value: 20 })?.text.includes('攻+20 到期'));
    assert.ok(expireFloat({ kind: 'exposure' })?.text.includes('暴露消退'));
    assert.ok(read('ui-sfx.mjs').includes('stunSkip(c, t)'));
    assert.ok(read('unit-view.mjs').includes('t-unit-shield-breaking'));
  });
  await check('AVP-SD05 avHost 仅在 reason=expired 播到期，并消费复活/自爆/到期回调', () => {
    const prevDoc = globalThis.document, prevEl = globalThis.Element, prevWin = globalThis.window;
    const mkEl = () => ({ style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      setAttribute() {}, getAttribute: () => null, appendChild() {}, insertBefore() {}, remove() {}, querySelector: () => null, querySelectorAll: () => [],
      getContext: () => ({ clearRect() {}, save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) }),
      animate: () => ({ onfinish: null, cancel() {} }) });
    globalThis.Element = function ElementStub() {};
    globalThis.document = { addEventListener() {}, removeEventListener() {}, createElement: mkEl, createElementNS: mkEl, getElementById: () => null, querySelectorAll: () => [], body: mkEl() };
    globalThis.window = globalThis;
    try {
      const expiredCalls = [], variantCalls = [];
      const u = mk('e', 'enemy');
      const host = createAvHost({ getUnitView: () => ({ nodes: new Map() }), getUnits: () => [u], getEffectiveUnit: () => ({ buffs: [] }),
        onStatusExpired: (ev, i) => expiredCalls.push([ev.kind, i]), onVariantTrigger: ev => variantCalls.push(ev.trigger) });
      host.consumeVisualEvents([
        { seq: 1, type: 'status-removed', unitId: 'e', kind: 'atk', reason: 'dispelled', value: -10 },
        { seq: 2, type: 'status-removed', unitId: 'e', kind: 'atk', reason: 'expired', value: 20 },
        { seq: 3, type: 'status-removed', unitId: 'e', kind: 'exposure', reason: 'expired' },
        { seq: 4, type: 'variant-trigger', unitId: 'e', trigger: 'regen', healed: 10, hpAfter: 100 },
      ]);
      assert.deepEqual(expiredCalls, [['atk', 0], ['exposure', 1]]);
      assert.deepEqual(variantCalls, ['regen']);
      host.destroy();
    } finally {
      if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
      if (prevEl === undefined) delete globalThis.Element; else globalThis.Element = prevEl;
      if (prevWin === undefined) delete globalThis.window; else globalThis.window = prevWin;
    }
  });
  return { cases };
}

export const groups = { 'AVP-SPEED': { run: speed }, 'AVP-VENDOR': { run: vendor }, 'AVP-DIRECTOR': { run: director },
  'AVP-THREAT': { run: threat }, 'AVP-LOWHP': { run: lowHpWarn }, 'AVP-INFER': { run: infer }, 'AVP-LOOKS': { run: looks }, 'AVP-STAGE-D': { run: stageD } };
