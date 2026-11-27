import assert from 'node:assert/strict';
import { createActionDirector } from '../../../tactics/src/action-director.mjs';

function setup() {
  const calls = [];
  const scope = { isLive: true, after() {}, settleOnDispose() {}, addNode() {}, removeNode() {} };
  const makeNode = () => ({ style: {}, setAttribute() {}, appendChild() {}, insertBefore() {}, remove() {} });
  const world = makeNode(), unitLayer = makeNode();
  const av = {
    playSound(key, volume, rate, options) { calls.push(['sound', key, options?.category]); },
    CombatAudioMixer: { classify: () => 'K' },
  };
  const director = createActionDirector({
    sandbox: { getScope: () => scope, unitWorldCenter: () => null, getUnitView: () => ({ nodes: new Map() }),
      getDom: () => ({ world, unitLayer }), getPose: () => ({ scale: 1 }) },
    avHost: { av, entity: () => null, syncRoster() {} },
    getViewData: () => ({ units: [], placementsById: {}, footprintsById: {} }),
    registry: { resolve: input => input.kind === 'reaction' && input.fxTag === '看破'
      ? { play: async ctx => { calls.push(['fx', ctx.reaction.kanpo, ctx.attackerId]); return true; } } : null },
    promptReaction: async req => {
      calls.push(['prompt', req.type]);
      return { responderId: 'h', skill: req.candidates[0].skill };
    },
  });
  return { calls, director };
}

async function run() {
  const cases = [];
  const check = async (id, fn) => {
    try { await fn(); cases.push({ id, pass: true }); }
    catch (error) { cases.push({ id, pass: false, detail: error.stack }); }
  };
  await check('MPAV-01 kanpo请求委托给现有反应选择器并保留选择', async () => {
    const { calls, director } = setup();
    const skill = { name: '看破', kanpoTarget: 'all' };
    const gen = (function* () {
      const choice = yield { type: 'kanpo', responderId: null, targetId: null, casterId: 'e', candidates: [{ responderId: 'h', skill }] };
      return { choice };
    })();
    const result = await director.driveAttack(gen);
    assert.deepEqual(calls, [['prompt', 'kanpo']]);
    assert.equal(result.choice.responderId, 'h');
    assert.equal(result.choice.skill, skill);
  });
  await check('MPAV-02 看破结果委托既有看破FX且同一事件不重复播放', async () => {
    const { calls, director } = setup();
    const result = { ok: true, casterId: 'e', skill: { name: '攻击' }, kanpo: { responderId: 'h', skillName: '看破', fxTag: null },
      canceled: true, hits: [], shots: [], effects: [], events: [{ type: 'kanpo-resolved', eventId: 'ev-kanpo-1', responderId: 'h', skillName: '看破' }] };
    const previousDocument = globalThis.document;
    globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, insertBefore() {}, remove() {} }) };
    try {
      assert.equal(await director.playAttack(result), true);
      assert.equal(await director.playAttack(result), true);
      assert.deepEqual(calls, [['fx', true, 'e']]);
    } finally {
      if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    }
  });
  return { cases };
}

export const groups = { 'MPAV': { run } };
