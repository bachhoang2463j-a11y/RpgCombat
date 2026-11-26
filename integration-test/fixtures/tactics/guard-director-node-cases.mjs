import assert from 'node:assert/strict';
import { createActionDirector, buildHitFeedback } from '../../../tactics/src/action-director.mjs';
import { createAvHost } from '../../../tactics/src/av-host.mjs';

function node() { return { style: {}, setAttribute() {}, appendChild() {}, insertBefore() {}, remove() {} }; }
function setup(cancel = false, action, onHit) {
  const calls = [];
  const scope = { isLive: true, addNode() {}, removeNode() {}, after(ms, fn) { fn(); }, settleOnDispose() {}, heldMs: () => 0,
    loop(fn) { const t = performance.now(); fn(t); queueMicrotask(() => fn(t + 1000)); } };
  const positions = { e: { col: 9, row: 4 }, g: { col: 5, row: 4 }, h: { col: 7, row: 4 } };
  const units = Object.keys(positions).map(id => ({ id, ref: { hp: 100, atk: 10 } }));
  const view = { nodes: new Map(), lockMotion(id, locked) { calls.push(['lock', id, locked]); }, setDisplayPos(id, x, y) { calls.push(['pos', id, x, y]); }, setDisplayFacing() {}, updateUnit() {} };
  const sandbox = { getScope: () => scope, getUnitView: () => view, getDom: () => ({ world: node(), unitLayer: node() }),
    unitWorldCenter: id => ({ x: positions[id].col + 0.5, y: positions[id].row + 0.5 }), guideTo: async () => {}, getPose: () => ({ scale: 1 }) };
  const av = { CombatAudioMixer: { classify: () => 'B' }, CombatAudioDirector: {
    beginAction: () => 1, publish() {}, closeWave() {}, completeTarget() {},
  }, playSound(key) { calls.push(['sfx', key]); },
  playHitFeedback(value, options = {}) { calls.push(['hit', value.outcome, options.suppressDodgeFx]); onHit?.(value); } };
  const host = { av, syncRoster() {}, entity: id => ({ id }), consumeVisualEvents() {}, syncVisualState() {} };
  const guard = { segmentId: 'segment:1', guardianId: 'g', originalTargetId: 'h', from: { col: 3, row: 4 }, to: positions.g,
    startPosition: { x: 3.5, y: 4.5 }, contactPoint: { x: 5.5, y: 4.5 }, path: [{ col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 }] };
  const result = { ok: true, casterId: 'e', skill: { name: 'test', power: 50 },
    hits: [{ targetId: 'g', side: 'hero', hit: true, hpDmg: 25, segments: [{ targetId: 'g', segmentId: 'segment:1', hit: true,
      hpBefore: 100, hpAfter: 75, hpDmg: 25, reaction: { guardianId: 'g', guard },
      resistance: { before: 50, after: 25, layers: [{ reason: 'phantom' }] } }] }],
    effects: [], events: [{ type: 'guard-committed', ...guard }] };
  const registry = { resolve: input => input.kind === 'reaction' ? null : { id: 'test', grade: 'L1',
    play: action || (async ctx => { ctx.revealSegment('g', 0); ctx.revealSegment('g', 0); return true; }) } };
  const director = createActionDirector({ sandbox, avHost: host, registry,
    getViewData: () => ({ units, placementsById: positions, footprintsById: Object.fromEntries(units.map(u => [u.id, { width: 1, height: 1 }])) }),
    async presentGuard(value) { calls.push(['dash', value.segmentId]); await Promise.resolve(); calls.push(['block']); if (cancel) scope.isLive = false; },
    onRuleReveal(value, meta) { calls.push(['rule', meta.kind]); }, onReveal() { calls.push(['hp']); } });
  return { calls, positions, director, result };
}
function evadeSegment(from, to) {
  const shift = { from: { col: from, row: 4 }, to: { col: to, row: 4 } };
  shift.path = [shift.from, shift.to];
  return { outcome: 'dodge', hit: false, hpBefore: 100, hpAfter: 100, hpDmg: 0,
    reaction: { responderId: 'g', dodged: true, shift } };
}
async function run() {
  const cases = [];
  const original = globalThis.document;
  globalThis.document = { createElement: node };
  const test = async (id, fn) => { try { await fn(); cases.push({ id, pass: true }); } catch (e) { cases.push({ id, pass: false, detail: e.stack }); } };
  try {
    await test('TG-DIRECTOR-01 冲刺格挡完成后才揭示受击且重复接触只消费一次', async () => {
      const { director, result, calls } = setup();
      assert.equal(await director.playAttack(result), true);
      assert.equal(calls.filter(c => c[0] === 'dash').length, 1);
      assert.equal(calls.filter(c => c[0] === 'hit').length, 1);
      assert.equal(calls.filter(c => c[0] === 'hp').length, 1);
      assert.ok(calls.findIndex(c => c[0] === 'block') < calls.findIndex(c => c[0] === 'hit'));
      assert.ok(calls.some(c => c[0] === 'rule' && c[1] === 'resistance'));
    });
    await test('TG-DIRECTOR-02 提交后刷新前持有出发显示位置，不回写权威站位', () => {
      const { director, result, calls, positions } = setup(); const before = structuredClone(positions);
      director.holdGuards({ ...result, events: result.events.concat(result.events) });
      assert.equal(calls.filter(c => c[0] === 'pos').length, 1);
      assert.deepEqual(calls.find(c => c[0] === 'pos'), ['pos', 'g', 3.5, 4.5]);
      assert.deepEqual(positions, before);
    });
    await test('TG-DIRECTOR-03 场景失活取消后不揭示旧伤害', async () => {
      const { director, result, calls } = setup(true);
      assert.equal(await director.playAttack(result), false);
      assert.equal(calls.filter(c => c[0] === 'hit' || c[0] === 'hp').length, 0);
    });
    await test('TG-DIRECTOR-04 通用受击接口透传段身份和抗性，不重算', () => {
      const { result } = setup(); const segment = result.hits[0].segments[0];
      const value = buildHitFeedback(result, result.hits[0], segment);
      assert.equal(value.segmentId, segment.segmentId); assert.equal(value.resistance, segment.resistance);
      assert.equal(value.hpDmg, 25);
    });
    await test('TG-DIRECTOR-05 连续反应侧闪只取各段，按真实起终点逐次接力', async () => {
      const fromLaterShot = evadeSegment(3, 4), next = evadeSegment(4, 5);
      const { director, result, calls } = setup(false, async ctx => {
        ctx.revealSegment('g', 0);
        assert.equal(await ctx.awaitShotFeedback(), true);
        assert.ok(!calls.some(c => c[0] === 'pos'));
        ctx.revealSegment('g', 1);
        ctx.revealSegment('g', 1);
        ctx.revealSegment('g', 2);
        return ctx.awaitShotFeedback();
      });
      result.events = [];
      result.hits[0].reaction = fromLaterShot.reaction;
      result.hits[0].segments = [{ outcome: 'prevented' }, fromLaterShot, next];
      assert.equal(await director.playAttack(result), true);
      assert.deepEqual(calls.filter(c => c[0] === 'pos').map(([kind, id, x, y]) => [kind, id, Number(x.toFixed(2)), y]), [
        ['pos', 'g', 3.5, 4.5], ['pos', 'g', 4.5, 4.5], ['pos', 'g', 4.5, 4.5], ['pos', 'g', 5.5, 4.5],
      ]);
      assert.deepEqual(calls.filter(c => c[0] === 'hit'), [['hit', 'prevented', false], ['hit', 'dodge', true], ['hit', 'dodge', true]]);
    });
    await test('TG-DIRECTOR-06 敌我各次真实燃烧和中毒伤害仅飘一次', () => {
      const original = { Element: globalThis.Element, window: globalThis.window, document: globalThis.document };
      const labels = [], makeNode = () => ({ ...node(), getContext: () => ({}), firstChild: { animate() {} },
        set innerHTML(html) { if (html.includes(' -')) labels.push(html.match(/>([^<>]+)<\/b>/)[1]); } });
      Object.assign(globalThis, { Element: class {}, window: {}, document: { createElement: makeNode, addEventListener() {} } });
      try {
        const { director } = setup();
        const units = [{ id: 'e', side: 'enemy', ref: { hp: 0 } }, { id: 'g', side: 'hero', ref: { hp: 10 } }];
        const host = createAvHost({ getUnitView: () => ({ nodes: new Map() }), getUnits: () => units, onStatusTick: director.playStatusTick });
        host.av.playStatusTickFx = () => {};
        const events = [
          { seq: 1, type: 'status-tick', unitId: 'e', kind: 'burn', damage: 7 },
          { seq: 2, type: 'status-tick', unitId: 'g', kind: 'poison', damage: 13 },
          { seq: 3, type: 'status-tick', unitId: 'g', kind: 'poison', damage: 4 },
        ];
        host.consumeVisualEvents(events);
        host.consumeVisualEvents(events);
        assert.deepEqual(labels, ['燃烧 -7', '中毒 -13', '中毒 -4']);
      } finally {
        for (const [key, value] of Object.entries(original)) {
          if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
        }
      }
    });
    await test('TG-DIRECTOR-07 冲锋伤害跟随实际接触步，击退撞墙在终点才额外扣血', async () => {
      const point = col => ({ col, row: 4 });
      const impacts = [];
      const { director, result, calls } = setup(false, async ctx => {
        ctx.reveal('g');
        assert.equal(impacts.length, 0);
        return ctx.playCharge(() => calls.push(['contact']));
      }, hit => impacts.push([hit.targetId, hit.hpDmg, ...calls.filter(c => c[0] === 'pos').at(-1).slice(1, 3)]));
      result.hits = ['g', 'h'].map((id, i) => ({ targetId: id, segments: [
        { chargeStep: i + 1, shotIndex: i + 1, hit: true, hpDmg: 25, hpBefore: 100, hpAfter: 75 },
      ] }));
      result.events = [
        { type: 'unit-displaced', unitId: 'g', chargeStep: 1, from: point(4), to: point(5), path: [point(4), point(5)],
          collision: { hpDmg: 10, hpBefore: 75, hpAfter: 65, maxHp: 100 } },
        { type: 'unit-charged', unitId: 'e', from: point(1), to: point(3), path: [point(1), point(2), point(3)] },
      ];
      assert.equal(await director.playAttack(result), true);
      assert.deepEqual(impacts, [['g', 25, 'e', 2.5], ['h', 25, 'e', 3.5], ['g', 10, 'g', 5.5]]);
      assert.equal(calls.filter(c => c[0] === 'contact').length, 2);
      assert.ok(calls.findIndex(c => c[0] === 'pos' && c[1] === 'g') < calls.findLastIndex(c => c[0] === 'contact'));
      assert.equal(calls.filter(c => c[0] === 'pos' && c[1] === 'g' && c[2] === 5.5).length, 1);
    });
  } finally { if (original === undefined) delete globalThis.document; else globalThis.document = original; }
  return { cases };
}
export const groups = { 'TG-DIRECTOR': { run } };
