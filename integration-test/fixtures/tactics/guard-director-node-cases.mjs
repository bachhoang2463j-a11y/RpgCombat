import assert from 'node:assert/strict';
import { createActionDirector, buildHitFeedback } from '../../../tactics/src/action-director.mjs';

function node() { return { style: {}, setAttribute() {}, appendChild() {}, insertBefore() {}, remove() {} }; }
function setup(cancel = false) {
  const calls = [];
  const scope = { isLive: true, addNode() {}, removeNode() {}, after(ms, fn) { fn(); }, settleOnDispose() {} };
  const positions = { e: { col: 9, row: 4 }, g: { col: 5, row: 4 } };
  const units = ['e', 'g'].map(id => ({ id, ref: { hp: 100, atk: 10 } }));
  const view = { lockMotion(id, locked) { calls.push(['lock', id, locked]); }, setDisplayPos(id, x, y) { calls.push(['pos', id, x, y]); }, setDisplayFacing() {}, updateUnit() {} };
  const sandbox = { getScope: () => scope, getUnitView: () => view, getDom: () => ({ world: node(), unitLayer: node() }),
    unitWorldCenter: id => ({ x: positions[id].col + 0.5, y: positions[id].row + 0.5 }), guideTo: async () => {}, getPose: () => ({ scale: 1 }) };
  const av = { CombatAudioMixer: { classify: () => 'B' }, CombatAudioDirector: {
    beginAction: () => 1, publish() {}, closeWave() {}, completeTarget() {},
  }, playHitFeedback() { calls.push(['hit']); } };
  const host = { av, syncRoster() {}, entity: id => ({ id }), consumeVisualEvents() {}, syncVisualState() {} };
  const guard = { segmentId: 'segment:1', guardianId: 'g', originalTargetId: 'h', from: { col: 3, row: 4 }, to: positions.g,
    startPosition: { x: 3.5, y: 4.5 }, contactPoint: { x: 5.5, y: 4.5 }, path: [{ col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 }] };
  const result = { ok: true, casterId: 'e', skill: { name: 'test', power: 50 },
    hits: [{ targetId: 'g', side: 'hero', hit: true, hpDmg: 25, segments: [{ targetId: 'g', segmentId: 'segment:1', hit: true,
      hpBefore: 100, hpAfter: 75, hpDmg: 25, reaction: { guardianId: 'g', guard },
      resistance: { before: 50, after: 25, layers: [{ reason: 'phantom' }] } }] }],
    effects: [], events: [{ type: 'guard-committed', ...guard }] };
  const registry = { resolve: input => input.kind === 'reaction' ? null : { id: 'test', grade: 'L1',
    async play(ctx) { ctx.revealSegment('g', 0); ctx.revealSegment('g', 0); return true; } } };
  const director = createActionDirector({ sandbox, avHost: host, registry,
    getViewData: () => ({ units, placementsById: positions, footprintsById: { e: { width: 1, height: 1 }, g: { width: 1, height: 1 } } }),
    async presentGuard(value) { calls.push(['dash', value.segmentId]); await Promise.resolve(); calls.push(['block']); if (cancel) scope.isLive = false; },
    onRuleReveal(value, meta) { calls.push(['rule', meta.kind]); }, onReveal() { calls.push(['hp']); } });
  return { calls, positions, director, result };
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
  } finally { if (original === undefined) delete globalThis.document; else globalThis.document = original; }
  return { cases };
}
export const groups = { 'TG-DIRECTOR': { run } };
