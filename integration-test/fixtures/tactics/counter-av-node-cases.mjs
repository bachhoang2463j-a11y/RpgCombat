// 两种反击原版视听移植的导演行为回归；真实 createActionDirector，视听宿主仅桩隔离。
import { pathToFileURL } from 'node:url';
import { createActionDirector } from '../../../tactics/src/action-director.mjs';

const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail });

function makeCase({ live = true } = {}) {
  const log = [];
  let current = live;
  const disposals = new Set();
  const scope = {
    get isLive() { return current; },
    addNode() {},
    removeNode() {},
    after(ms, fn) { log.push(['timer', ms]); queueMicrotask(fn); return 1; },
    settleOnDispose(fn) { disposals.add(fn); return () => disposals.delete(fn); },
    loop(fn) { fn(performance.now() + 1000); },
  };
  const entity = id => ({ id, side: id === 'attacker' ? 'hero' : 'enemy' });
  const av = {
    CombatAudioMixer: { classify: () => 'B', prepare: async () => true, context: () => null },
    CombatAudioDirector: {
      beginAction() { log.push(['beginAction']); return 'counter-action'; },
      beginWave() { return null; }, publish(r) { log.push(['publish', r]); }, completeTarget() {},
    },
    playHitFeedback(r) { log.push(['hitFeedback', r]); },
    playCounterAttackL1(from, to, onImpact) {
      log.push(['counterL1', from.id, to.id]); onImpact(); return { done: Promise.resolve(true) };
    },
    playPowerCounterEffect(from, to, dom, onImpact) {
      log.push(['powerCounter', from.id, to.id, dom]); onImpact(); return Promise.resolve(true);
    },
  };
  const sandbox = {
    getScope: () => scope,
    addNode() {},
    getUnitView: () => ({ setDisplayFacing() {}, updateUnit() {}, nodes: new Map([['defender', { sprite: { id: 'counter-dom' } }]]) }),
    unitWorldCenter: () => ({ x: 2, y: 2 }), getDom: () => ({ world: { insertBefore() {}, appendChild() {} }, unitLayer: {} }),
    async guideTo() {},
  };
  const director = createActionDirector({
    sandbox, avHost: { av, entity, syncRoster() {}, consumeVisualEvents(events) { for (const ev of events) if (ev.type === 'variant-trigger') log.push(['variant', ev.trigger, ev.segmentId]); }, syncVisualState() {} },
    getViewData: () => ({ units: [{ id: 'attacker', side: 'hero', ref: { atk: 10 } }, { id: 'defender', side: 'enemy', ref: { atk: 10 } }],
      placementsById: { attacker: { col: 2, row: 2 }, defender: { col: 3, row: 2 } },
      footprintsById: { attacker: { width: 1, height: 1 }, defender: { width: 1, height: 1 } } }),
    registry: { resolve: () => ({ id: 'counter-test', grade: 'identity', timeline: {}, async play(ctx) {
      log.push(['entry']);
      for (let i = 0; i < ctx.hits[0].segments.length; i++) {
        log.push(['segment', i]);
        ctx.revealSegment('defender', i);
        if (!(await ctx.awaitCounters())) return false;
      }
      return true;
    } }) },
    onRuleReveal(ev, meta) { log.push(['ruleReveal', ev.eventId, meta.kind]); },
  });
  function result(reason) {
    const ev = { type: 'reaction-damage', reason, casterId: 'defender', targetId: 'attacker', eventId: 'event-' + reason,
      segmentId: 'seg-1', hpBefore: 100, hpAfter: 80, shieldBefore: 0, shieldAfter: 0, maxHp: 100,
      hpDmg: 20, shieldDmg: 0, incomingDmg: 20 };
    return { ok: true, casterId: 'attacker', skill: { name: '普通攻击', fxTag: '刀砍', damageType: '近战' }, aim: { x: 3.5, y: 2.5 },
      hits: [{ targetId: 'defender', hit: false, segments: [{ targetId: 'defender', hit: false, outcome: 'dodge', hpBefore: 100, hpAfter: 100,
        maxHp: 100, hpDmg: 0, shieldBefore: 0, shieldAfter: 0, shieldDmg: 0, rawDmg: 20, segmentId: 'seg-1' }] }], events: [ev] };
  }
  return { log, av, scope, setLive(v) { current = v; }, dispose() { current = false; for (const fn of [...disposals]) fn(false); }, director, result };
}

async function run() {
  const cases = [];
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {}, remove() {}, firstChild: { animate() {} } }) };
  try {
  for (const [reason, expected, group] of [['counter', 'counterL1', '普通反击'], ['power-counter', 'powerCounter', '强力反击']]) {
    const f = makeCase();
    await f.director.playAttack(f.result(reason));
    const hit = f.log.find(x => x[0] === 'hitFeedback' && x[1].source === 'counter');
    const playIndex = f.log.findIndex(x => x[0] === expected);
    const ruleIndex = f.log.findIndex(x => x[0] === 'ruleReveal');
    cases.push(ok(`反击视听 ${group} 原版接口按 reason 分流`, playIndex >= 0 && !f.log.some(x => x[0] === (expected === 'counterL1' ? 'powerCounter' : 'counterL1')), f.log.map(x => x[0])));
    cases.push(ok(`反击视听 ${group} 先逐段揭示受击，再播放反击`, f.log.findIndex(x => x[0] === 'hitFeedback') < playIndex, f.log.map(x => x[0])));
    cases.push(ok(`反击视听 ${group} 命中拍点反馈、音频发布及规则揭示各一次`, hit && hit[1].source === 'counter' && hit[1].damageType === '近战' && hit[1].actionId === 'counter-action' &&
      f.log.filter(x => x[0] === 'publish' && x[1].source === 'counter').length === 1 && f.log.filter(x => x[0] === 'ruleReveal').length === 1 && ruleIndex > playIndex,
      f.log.map(x => x[0] === 'hitFeedback' || x[0] === 'publish' ? [x[0], x[1].source, x[1].actionId] : x[0])));
  }
  {
    const f = makeCase();
    f.setLive(false);
    await f.director.playAttack(f.result('power-counter'));
    cases.push(ok('scope 取消后不再揭示反击规则', f.log.filter(x => x[0] === 'ruleReveal').length === 0, f.log.map(x => x[0])));
  }
  {
    const f = makeCase(), res = f.result('counter');
    res.hits[0].segments.push({ ...res.hits[0].segments[0], segmentId: 'seg-2' });
    res.events.push({ ...res.events[0], reason: 'power-counter', eventId: 'event-second', segmentId: 'seg-2', hpBefore: 80, hpAfter: 40, hpDmg: 40 });
    await f.director.playAttack(res);
    const firstReveal = f.log.findIndex(x => x[0] === 'ruleReveal');
    const secondSegment = f.log.findIndex(x => x[0] === 'segment' && x[1] === 1);
    const values = f.log.filter(x => x[0] === 'publish' && x[1].source === 'counter').map(x => x[1].hpAfter);
    cases.push(ok('连续段等待第一反击完成，再播放下一段及强力反击快照', firstReveal < secondSegment && values.join(',') === '80,40', values));
  }
  {
    const f = makeCase();
    f.av.playPowerCounterEffect = () => { f.log.push(['powerStarted']); queueMicrotask(() => f.dispose()); return new Promise(() => {}); };
    const done = await f.director.playAttack(f.result('power-counter'));
    cases.push(ok('强力反击进行中销毁scope：等待结束且不再揭示伤害', done === false && f.log.some(x => x[0] === 'powerStarted')
      && !f.log.some(x => x[0] === 'ruleReveal'), f.log.map(x => x[0])));
  }
  for (const [trigger, segmentIndex] of [['revive', 2], ['molt', 1]]) {
    const f = makeCase(), res = f.result('counter');
    res.hits[0].segments = [0, 1, 2].map(i => ({ ...res.hits[0].segments[0], segmentId: 'seg-' + (i + 1), shotIndex: i }));
    res.events = [{ type: 'variant-trigger', unitId: 'defender', trigger, segmentId: 'seg-' + (segmentIndex + 1) }];
    await f.director.playAttack(res);
    const variant = f.log.findIndex(x => x[0] === 'variant');
    const impact = f.log.findIndex(x => x[0] === 'segment' && x[1] === segmentIndex);
    const next = f.log.findIndex(x => x[0] === 'segment' && x[1] === segmentIndex + 1);
    cases.push(ok('连发变种 ' + trigger + ' 只在实际触发段播放', variant > impact && (next < 0 || variant < next), f.log.map(x => x.slice(0, 3))));
  }
  {
    const f = makeCase(), res = f.result('counter');
    res.events = [{ type: 'variant-trigger', unitId: 'defender', trigger: 'rage' }];
    await f.director.playAttack(res);
    const variant = f.log.findIndex(x => x[0] === 'variant');
    const hit = f.log.findIndex(x => x[0] === 'hitFeedback');
    cases.push(ok('无伤害段编号的变种事件留到攻击收尾消费', variant > hit, f.log.map(x => x[0])));
  }
  return { cases };
  } finally { globalThis.document = previousDocument; }
}

export const groups = { 'COUNTER-AV': { run } };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { cases } = await run();
  for (const c of cases) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.id}${c.detail ? ` — ${JSON.stringify(c.detail)}` : ''}`);
  const failed = cases.filter(c => !c.pass).length;
  console.log(`cases=${cases.length} failed=${failed}`);
  if (failed) process.exitCode = 1;
}
