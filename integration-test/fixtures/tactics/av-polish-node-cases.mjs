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

export const groups = { 'AVP-SPEED': { run: speed }, 'AVP-VENDOR': { run: vendor }, 'AVP-DIRECTOR': { run: director },
  'AVP-THREAT': { run: threat }, 'AVP-LOWHP': { run: lowHpWarn } };
