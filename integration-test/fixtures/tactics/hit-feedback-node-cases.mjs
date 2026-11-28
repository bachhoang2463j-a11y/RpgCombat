// 真实结算描述、原版受击函数和地图展示的定向回归；不复制受击分类或数字算法。
import { readFileSync } from 'node:fs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { parseSkill, parseSkillList } from '../../../tactics/src/parser.mjs';
import { buildHitFeedback, resolveWindupKind, createActionDirector } from '../../../tactics/src/action-director.mjs';
import { avatarScaleForZoom } from '../../../tactics/src/unit-view.mjs';
import { linkSkillGroupRows } from '../../../tactics/src/main.mjs';
import { skillSlots } from '../../../tactics/src/effect-definitions.mjs';
import { planKillBeat, startKillCamera, killPortraitSweep, KILL_TIMING } from '../../../tactics/src/cinematic.mjs';

const source = readFileSync(new URL('../../../tactics/src/vendor/rpg-av/rpg-av.mjs', import.meta.url), 'utf8');
const start = source.indexOf('    const HIT_HOLD_MS =');
const end = source.indexOf('    function playAttackIdentityFx(', start);
const hitSource = source.slice(start, end);
const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail });
const json = JSON.stringify;
function node(tag = 'div') {
  const attrs = {}, children = [], classes = new Set();
  return { tag, children, innerHTML: '', textContent: '', offsetWidth: 42, animations: [],
    style: { setProperty(k, v) { this[k] = String(v); } },
    classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
    setAttribute(k, v) { attrs[k] = String(v); if (k === 'class') this.className = String(v); },
    getAttribute: k => attrs[k] || null,
    appendChild(el) { children.push(el); el.parentElement = this; return el; },
    remove() { this.removed = true; },
    animate(frames, options) { const a = { frames, options, cancel() { this.cancelled = true; } }; this.animations.push(a); return a; },
  };
}
function originalHitHarness(scale = 1, locked = false) {
  const layers = node(), dom = node(), rect = { x: 300, y: 250, w: 60, h: 60, left: 270, top: 220, right: 330, bottom: 280, width: 60, height: 60 };
  const rectKey = Symbol('rect'); dom[rectKey] = () => rect;
  const particles = [], timers = new Map(), shakes = [];
  const S = { uid: 0, layers: new Set(), handles: new Set(), timers: new Set() };
  let timerId = 0, stopCount = 0, hitStop = 0;
  const engine = { get hitStop() { return hitStop; }, set hitStop(v) { hitStop = v; stopCount++; } };
  const after = (ms, fn) => { const id = ++timerId; timers.set(id, { ms, fn }); S.timers.add(id); return id; };
  const names = ['document', 'host', 'domOf', 'entityVisualRect', 'ctr', 'S', '__STAGE', '__GBCR', 'heroesData', 'enemiesData', 'isEntityVariantLocked', 'burst', 'rnd', 'pick', 'getComputedStyle', 'after', 'clearTimeout', 'shake', 'fxEngine', 'releaseIdleCanvas',
    '__fxNow', '__fxDateNow', '__fxTimeout'];
  const api = new Function(...names, hitSource + '\nreturn { classifyHit, playHitFeedback, hitVisual, emitBloodMist };')(
    { createElement: () => node(), createElementNS: (_, tag) => node(tag), getElementById: () => null, querySelectorAll: () => [] },
    { hitNumberScale: () => scale }, () => dom, () => rect, () => rect, S, { el: layers }, rectKey, [], [], () => locked,
    (count, factory) => { for (let i = 0; i < count; i++) particles.push(factory()); }, (a, b) => (a + b) / 2, list => list[0],
    () => ({ fontSize: '42px' }), after, id => timers.delete(id), kind => shakes.push(kind), engine, () => {},
    () => performance.now(), () => Date.now(), setTimeout);
  return { ...api, layers, dom, particles, timers, shakes, engine, stopCount: () => stopCount,
    beat(ms) { for (const [id, t] of [...timers]) if (t.ms === ms) { timers.delete(id); t.fn(); } } };
}
const result = (damage, extras = {}) => ({ targetId: 't', sourceId: 'c', outcome: 'hit', maxHp: 100, hpBefore: 100,
  hpAfter: 100 - damage, hpDmg: damage, shieldDmg: 0, isHero: false, damageType: '远程', damageCategory: '枪击', ...extras });
function unit(id, side, hp = 100, shield = 0) {
  return { id, name: id, side, footprint: { width: 1, height: 1 }, skills: [], ref: { hp, maxHp: hp, shield, mp: 100, maxMp: 100,
    tp: 0, maxTp: 100, atk: 10, def: 0, spd: side === 'hero' ? 300 : 1, evasion: 0, moveDistance: 6 } };
}
function resolved(tags, shield = 20, guard = 0, armor = 0) {
  const caster = unit('c', 'hero'), target = unit('t', 'enemy', 100, shield);
  target.ref.def = armor;
  if (guard) target.skills.push(parseSkill('【测试免伤】[免伤;power:' + guard + '][反应:远程][法术][范围:自身]'));
  const battle = createBattle({ units: [caster, target], placementsById: { c: { col: 2, row: 2 }, t: { col: 4, row: 2 } },
    scene: { sceneId: 'hit-test', grid: { columns: 10, rows: 10, metersPerCell: 1 }, objects: [] }, random: () => 0.5 });
  battle.start();
  const skill = parseSkill('【受击回归】' + tags + '[必中][远程][特效:枪击][范围:单体;射程:10]');
  const action = battle.attack(skill, { x: 4.5, y: 2.5, targetId: 't' }, { policy: guard ? 'auto' : 'none' });
  return { action, target, segment: action.hits[0].segments[0] };
}

export const groups = {
  'THIT-05': { async run() {
    const cases = [], played = [];
    const { createRpgAv } = await import('../../../tactics/src/vendor/rpg-av/rpg-av.mjs');
    const gain = () => ({ value: 1, values: [], cancelScheduledValues() { this.values = []; },
      setValueAtTime(v) { this.values.push(v); }, linearRampToValueAtTime(v) { this.values.push(v); } });
    const soundNode = () => ({ gain: gain(), connect(next) { this.next = next; }, disconnect() {} });
    class FakeContext {
      state = 'running'; currentTime = 0; destination = soundNode();
      createGain() { return soundNode(); }
      createMediaElementSource(audio) { return audio.output = soundNode(); }
      removeEventListener() {} close() {}
    }
    const previous = { window: globalThis.window, document: globalThis.document, Audio: globalThis.Audio };
    let av;
    try {
      globalThis.window = { __RPG_ASSET_BASE__: 'https://audio.invalid', AudioContext: FakeContext };
      globalThis.document = { createElement: () => ({ ...node(), getContext: () => ({}) }) };
      globalThis.Audio = class {
        duration = 1;
        play() { played.push(this); this.onplaying?.(); return Promise.resolve(); }
        pause() {} removeAttribute() {} load() {}
      };
      av = createRpgAv({ stage: { el: node(), w: 480, h: 320, onResize() {} }, rectSymbol: Symbol('rect'), initialToken: 1,
        clock: { now: performance.now.bind(performance), dateNow: Date.now, timeout: setTimeout, interval: setInterval, scale: () => 1 } });
      const director = av.CombatAudioDirector, mixer = av.CombatAudioMixer;
      const clips = () => played.map(a => a.src.split('/').at(-1));
      const starts = (key, category, track, combat) => av.playSound(key, 0.8, 1, { category, track, combat });
      starts('atk1', 'A', 'skill', true);
      starts('monsterAttack', 'L', 'skill', true);
      starts('atkUp', 'K', 'aux', false);
      const wave = director.beginWave(['h', 't', 'u', 'v', 'dup']);
      director.publish(result(0, { wave, targetId: 'h', isHero: true, guardBroken: true }));
      director.publish(result(20, { wave, guardBroken: true, shieldDmg: 10, shieldBefore: 10, shieldAfter: 0 }));
      director.publish(result(0, { wave, targetId: 'u', outcome: 'dodge', incomingDmg: 55 }));
      director.publish(result(0, { wave, targetId: 'v', incomingDmg: 5 }));
      const first = clips().slice(3);
      cases.push(ok('THIT 双方破防、掉血、闪避、格挡在接触拍点独立播，双层同破只响一次', first.length === 5 &&
        first[0] === 'parry_Weapon_GuardBreak.wav' && first[1] === first[0] && /^hit_2[abc]\.wav$/.test(first[2]) &&
        first[3] === 'dodge_3.mp3' && first[4] === 'parry_Weapon_1.wav', json(first)));
      director.publish(result(25, { wave, targetId: 'dup' }));
      for (const target of ['h', 't', 'u', 'v', 'dup']) director.completeTarget(wave, target);
      director.closeWave(wave);
      cases.push(ok('THIT 同波同一受击音档不重复，收口不补播', clips().length === 8, json(clips())));
      const finishWave = director.beginWave(['a', 'b']);
      director.publish(result(7, { wave: finishWave, targetId: 'a', finisher: true, finisherSound: 'hitDown' }));
      director.publish(result(7, { wave: finishWave, targetId: 'b', finisher: true, finisherSound: 'hitDown' }));
      director.publish(result(7, { finisher: true, finisherSound: null }));
      director.completeTarget(finishWave, 'a'); director.completeTarget(finishWave, 'b'); director.closeWave(finishWave);
      cases.push(ok('THIT 致死替换普通受击音、同波一次、专属重击不叠受击音', json(clips().slice(8)) === '["hitDown.mp3"]', json(clips())));
      const low = (track, cat, combat) => Math.min(...mixer.output(track, cat, combat).gain.values);
      cases.push(ok('THIT 出招和闪避／受伤／防御不相互压音，UI 优先级仍生效',
        low('skill', 'L', true) === 1 && ['F', 'G', 'H'].every(c => low('result', c, true) === 1) && low('aux', 'K', false) === 0.4));
    } finally {
      av?.CombatAudioMixer.clear();
      Object.assign(globalThis, previous);
    }
    return { cases };
  } },
  'THIT-01': { run() {
    const cases = [], h = originalHitHarness();
    const locked = originalHitHarness(1, true);
    locked.playHitFeedback(result(20, { shieldDmg: 10, shieldBefore: 10, shieldAfter: 0 }));
    cases.push(ok('THIT 变种锁仍保留真实血盾数字', locked.layers.children.some(layer => layer.children.some(n => n.textContent === '-20'))));
    cases.push(ok('THIT 变种锁不施加实体后坐', locked.dom.animations.length === 0));
    for (const [damage, tier] of [[9, 1], [10, 2], [49, 2], [50, 3], [100, 3]])
      cases.push(ok('THIT 三档真实比例边界 ' + damage, h.classifyHit(result(damage)).tier === tier));
    const crit = resolved('[枪击;power:40][暴击:100%]');
    const mapped = buildHitFeedback(crit.action, crit.action.hits[0], crit.segment);
    cases.push(ok('THIT 真实结算暴击、原伤及护盾前后透传', crit.action.ok && crit.segment.rawDmg === 80 && mapped.hpDmg === 60 &&
      mapped.shieldBefore === 20 && mapped.shieldAfter === 0 && mapped.shieldDmg === 20 && mapped.isCrit && mapped.damageCategory === '枪击', json(mapped)));
    cases.push(ok('THIT 原版分类得到重创暴击破盾', h.classifyHit(mapped).tier === 3 && h.classifyHit(mapped).crit && h.classifyHit(mapped).shieldBroken));
    const pierce = resolved('[穿透;power:40]', 100);
    const pierced = buildHitFeedback(pierce.action, pierce.action.hits[0], pierce.segment);
    cases.push(ok('THIT 穿透数据不重算、不消耗盾', pierced.isPierce && pierced.hpDmg === 40 && pierced.shieldDmg === 0 && pierced.shieldBefore === 100 && pierced.shieldAfter === 100));
    const dodge = buildHitFeedback({ casterId: 'c', skill: {} }, { targetId: 't' }, { hit: false, outcome: 'dodge', maxHp: 100, hpDmg: 0, rawDmg: 70, guardDmg: 0 });
    cases.push(ok('THIT 零免伤量不盖掉原伤闪避分档', h.classifyHit(dodge).dodgeTier === 3));
    cases.push(ok('THIT 真实拦截不冒充闪避', h.classifyHit(result(0, { outcome: 'prevented' })).kind === 'prevented'));
    cases.push(ok('THIT 纯护盾与免伤分类', h.classifyHit(result(0, { shieldDmg: 20, shieldBefore: 20, shieldAfter: 0 })).kind === 'shield' &&
      h.classifyHit(result(0, { guardDmg: 60, blockedDmg: 60 })).blockTier === 3));
    for (const [guard, broken] of [[10, false], [5, true]]) {
      const { action, segment } = resolved('[枪击;power:20]', 0, guard, 15);
      const feedback = buildHitFeedback(action, action.hits[0], segment);
      cases.push(ok('THIT 全挡按原伤分档，免伤只有被实际打空才破防 ' + guard,
        segment.guardDmg === 5 && segment.hpDmg === 0 && feedback.guardBroken === broken && h.classifyHit(feedback).blockTier === 2, json(segment)));
    }
    const through = resolved('[穿透;power:40]', 100, 8).segment;
    cases.push(ok('THIT 穿透绕过个人护盾但可击破免伤', through.guardBroken && through.guardDmg === 8 &&
      through.shieldAfter === 100 && through.hpDmg === 32, json(through)));
    return { cases };
  } },
  'THIT-06': { run() {
    const cases = [];
    const caster = { id: 'c', side: 'hero', isSummon: false };
    const enemy = { id: 'e', side: 'enemy', level: '精英' };
    const lethal = { shotIndex: 0, hit: true, down: true, outcome: 'hit', hpBefore: 10, hpAfter: 0, hpDmg: 10 };
    const result = { casterId: 'c', skill: { range: { type: '单体' } }, hits: [{ targetId: 'e', segments: [lethal] }] };
    const planned = planKillBeat(result, caster, [enemy]);
    cases.push(ok('THIT 单体单发致死段形成 focus 且精英显式 level 触发 cutin', planned.lethal instanceof Set && planned.lethal.has(lethal) &&
      planned.focus?.targetId === 'e' && planned.focus.cutin === true, json({ lethal: [...planned.lethal || []], focus: planned.focus })));
    const normal = planKillBeat(result, caster, [{ ...enemy, level: '杂兵' }]);
    const boss = planKillBeat(result, caster, [{ ...enemy, level: '首领' }]);
    cases.push(ok('THIT 普通敌人不横切、首领横切', normal.focus?.cutin === false && boss.focus?.cutin === true));
    const summon = planKillBeat(result, { ...caster, isSummon: true }, [enemy]);
    cases.push(ok('THIT 召唤者不安排击杀节拍', summon.lethal.size === 0 && summon.focus === null));
    const nonlethal = { ...lethal, hpBefore: 20, hpAfter: 10, down: false };
    const multi = planKillBeat({ ...result, hits: [{ targetId: 'e', segments: [nonlethal, lethal] }] }, caster, [enemy]);
    const area = planKillBeat({ ...result, skill: { range: { type: '圆形' } } }, caster, [enemy]);
    cases.push(ok('THIT 群攻和多段不切镜，只保留致死段', multi.focus === null && area.focus === null && multi.lethal.has(lethal) && !multi.lethal.has(nonlethal) && area.lethal.has(lethal)));
    for (const [label, change] of [['复活', { hpAfter: 10, down: false }], ['保命', { fatalResult: { reason: 'grit' } }], ['制服', { hpAfter: 1 }], ['结界', { barrierHitId: 'barrier' }]]) {
      const p = planKillBeat({ ...result, hits: [{ targetId: 'e', segments: [{ ...lethal, ...change }] }] }, caster, [enemy]);
      cases.push(ok('THIT ' + label + '不冒充真实击杀', !p.lethal.size && p.focus === null));
    }
    const moves = [];
    const from = { x: 2, y: 3 }, to = { x: 7, y: 3 };
    const pull = startKillCamera({ getPose: () => ({ scale: 1 }), poseAt: (x, y, scale) => ({ x, y, scale }),
      poseFrame: () => ({ x: 4.5, y: 3, scale: 0.8 }), cameraTo: (pose, ms) => moves.push({ pose, ms }) }, from, to);
    cases.push(ok('THIT 前推独立占 345ms，直到出手才启动 435ms 拉远', moves.length === 1 && moves[0].pose.x === from.x && moves[0].ms === 345));
    pull();
    cases.push(ok('THIT 拉远直接构图至双方，不跳回全图', moves.length === 2 && moves[1].pose.x === 4.5 && moves[1].ms === 435, json(moves)));
    let bandMs, visibleMs;
    const band = { firstChild: {}, animate: (_, options) => { bandMs = options.duration; } };
    killPortraitSweep({ screen: (_, ms) => { visibleMs = ms; return { firstChild: band, dataset: {}, style: {} }; } }, 'portrait.png', KILL_TIMING.cutin, 1);
    cases.push(ok('THIT 头像横切显示 570ms、致死局部停 210ms，特写在顿帧后接管',
      bandMs === 570 && visibleMs === 570 && KILL_TIMING.stop === 210 && KILL_TIMING.tail > KILL_TIMING.stop));
    return { cases };
  } },
  'THIT-02': { run() {
    const cases = [];
    for (const [damage, mist, drops] of [[9, 2, 4], [20, 6, 10], [60, 11, 18]]) {
      const h = originalHitHarness(2), handle = h.playHitFeedback(result(damage));
      if (damage >= 50) {
        cases.push(ok('THIT 重创数字随命中即刻出现（战棋顿帧恒为 0，不等原版60ms卡肉）', h.layers.children[0].children.some(n => n.className?.includes('arcane-hit-num'))));
        h.beat(60);
      }
      const numbers = h.layers.children[0].children.filter(n => n.className?.includes('arcane-hit-num'));
      cases.push(ok('THIT 原版飘血粒子分档 ' + damage, h.particles.filter(p => p.shape === 'bloodMist').length === mist && h.particles.filter(p => p.shape === 'bloodDrop').length === drops));
      cases.push(ok('THIT 类型数字、原值和宿主缩放 ' + damage, numbers.some(n => n.textContent === '-' + damage && n.getAttribute('data-hit-type') === '枪击') &&
        h.layers.children[0].style['--hit-scale'] === '2' && numbers[0].animations[0].frames.some(f => f.transform.includes('px'))));
      handle.cancel();
      cases.push(ok('THIT 受击取消清理图层及动画 ' + damage, h.layers.children[0].removed && numbers.every(n => n.animations.every(a => a.cancelled))));
    }
    const continuous = originalHitHarness(1);
    for (let i = 0; i < 3; i++) continuous.playHitFeedback(result(20));
    const continuousNumbers = continuous.layers.children.map(layer => layer.children.find(n => n.textContent === '-20'));
    const ys = continuousNumbers.map(n => Number.parseFloat(n.style.top));
    cases.push(ok('THIT 连续数字上下错位不盖住前次值', ys[0] - ys[1] >= 44 && ys[2] - ys[0] >= 44 && Number.parseFloat(continuousNumbers[1].style.left) > Number.parseFloat(continuousNumbers[0].style.left), json(ys)));
    const mixed = originalHitHarness(2);
    mixed.playHitFeedback(result(20, { shieldDmg: 10, shieldBefore: 10, shieldAfter: 0, isCrit: true }));
    const mixedNumbers = mixed.layers.children[0].children.filter(n => n.className?.includes('arcane-hit-num'));
    const hpNumber = mixedNumbers.find(n => n.textContent === '-20'), shieldNumber = mixedNumbers.find(n => n.textContent === '盾-10');
    cases.push(ok('THIT 混合HP与盾数字留出类型标记高度不重叠', hpNumber && shieldNumber && Number.parseFloat(shieldNumber.style.top) - Number.parseFloat(hpNumber.style.top) > 80));
    const pierced = originalHitHarness();
    pierced.playHitFeedback(result(9, { isPierce: true, damageCategory: '火焰' }));
    cases.push(ok('THIT 穿透类型只读真实字段且保持性质颜色', pierced.layers.children[0].getAttribute('data-hit-type') === '火焰·穿透' && pierced.layers.children[0].style['--hit-color'] === '#fb923c'));
    const finisher = originalHitHarness();
    finisher.playHitFeedback(result(20, { finisher: true }));
    const finisherNum = finisher.layers.children[0].children.find(n => n.textContent === '-20');
    cases.push(ok('THIT 致死 HP 数字只挂 finisher class 与局部 1.3 缩放，原值不变', finisherNum?.className?.includes('finisher') &&
      finisherNum.style['--hit-scale'] === '1.3' && finisher.layers.children[0].style['--hit-scale'] === '1'));
    const mixedFinisher = originalHitHarness();
    mixedFinisher.playHitFeedback(result(20, { shieldDmg: 5, shieldBefore: 5, shieldAfter: 0, finisher: true }));
    const mixedFinisherNums = mixedFinisher.layers.children[0].children;
    cases.push(ok('THIT 致死不放大盾数字', mixedFinisherNums.find(n => n.textContent === '-20')?.className?.includes('finisher') &&
      mixedFinisherNums.find(n => n.textContent === '盾-5')?.style['--hit-scale'] === undefined));
    const h = originalHitHarness(), wave = { shook: false, hitStopped: false, classified: [] };
    h.playHitFeedback(result(60), { wave }); h.playHitFeedback(result(70, { targetId: 'u' }), { wave });
    cases.push(ok('THIT 群体同波只震动/卡肉一次', h.shakes.length === 1 && h.stopCount() === 1 && wave.classified.length === 2));
    return { cases };
  } },
  'THIT-04': { async run() {
    const cases = [], waves = [], feedback = [], completed = [], closed = [], previousDocument = globalThis.document;
    const scope = { isLive: true, addNode() {}, removeNode() {}, after: (_, fn) => fn(), settleOnDispose: () => () => {} };
    const units = [{ id: 'c', side: 'hero', ref: { atk: 10 } }, { id: 'a', side: 'enemy' }, { id: 'b', side: 'enemy' }];
    const view = { setDisplayFacing() {}, updateUnit() {}, nodes: new Map() };
    globalThis.document = { createElement: () => node() };
    try {
      const director = createActionDirector({
        sandbox: { getScope: () => scope, getUnitView: () => view, unitWorldCenter: id => ({ x: units.findIndex(u => u.id === id) + 1, y: 2 }),
          async guideTo() {}, getDom: () => ({ world: { insertBefore() {}, appendChild() {} }, art: {}, unitLayer: {} }) },
        getViewData: () => ({ units, placementsById: { c: {}, a: {}, b: {} }, footprintsById: {} }),
        avHost: { syncRoster() {}, entity: id => ({ id }), av: { CombatAudioMixer: { classify: () => 'B' },
          CombatAudioDirector: { beginAction: () => 77, beginWave: targets => { const w = { id: 'w' + (waves.length + 1), targets }; waves.push(w); return w; },
            publish() {}, completeTarget: (w, id) => completed.push([w.id, id]), closeWave: w => closed.push(w.id) },
          playHitFeedback: (r, options) => feedback.push({ r, visualWave: options.wave }) } },
        registry: { resolve: () => ({ prepareKeys: () => [], async play(ctx) { ctx.revealSegment('a', 0); ctx.revealSegment('a', 1); ctx.revealSegment('b', 0); return true; } }) },
      });
      const seg = shotIndex => ({ shotIndex, hit: true, outcome: 'hit', hpBefore: 100, hpAfter: 90, hpDmg: 10 });
      const played = await director.playAttack({ ok: true, casterId: 'c', skill: { name: '分段', fxTag: 'x', power: 10 }, effects: [],
        hits: [{ targetId: 'a', maxHp: 100, side: 'enemy', segments: [seg(1), seg(2)] }, { targetId: 'b', maxHp: 100, side: 'enemy', segments: [seg(2)] }] });
      cases.push(ok('THIT 受击声音按真实发次归波而非整技混合', played && waves.length === 1 && feedback[0].r.waveId === null && feedback[1].r.waveId === 'w1' && feedback[2].r.waveId === 'w1'));
      cases.push(ok('THIT 每发目标及时完成且视觉卡肉共享对应发', completed.length === 2 && closed.length === 1 && feedback[0].visualWave !== feedback[1].visualWave && feedback[1].visualWave === feedback[2].visualWave));
    } finally { globalThis.document = previousDocument; }
    return { cases };
  } },
  'THIT-03': { run() {
    const cases = [];
    for (const [kind, dt, range] of [['red-single', '近战', '单体'], ['red-wide', '近战', '圆形'], ['amber-single', '远程', '单体'], ['amber-wide', '远程', '圆形'], ['violet-single', '法术', '单体'], ['violet-wide', '法术', '圆形']]) {
      const skill = parseSkill('【前摇】[伤害;power:20][' + dt + '][范围:' + range + ';射程:5;半径:2]');
      cases.push(ok('THIT 前摇 ' + kind, resolveWindupKind(skill) === kind));
    }
    cases.push(ok('THIT 粉色增益、黑色妨害及自代价无前摇', resolveWindupKind(parseSkill('【增益】[增攻;power:10]')) === 'rose-self' &&
      resolveWindupKind(parseSkill('【减益】[致盲;power:10]')) === 'gloom-foe' && resolveWindupKind(parseSkill('【代价】[自盲;power:10]')) === null));
    for (const scale of [0.25, 0.5, 1, 2]) cases.push(ok('THIT 头像近远缩放 ' + scale, 42 * scale * avatarScaleForZoom(scale) === (scale < 1 ? 42 : 42 * scale)));
    const skills = parseSkillList([{ 名字: '火舞术', 子技能: [{ 名字: '火舞术-精准流火', 标签: '[火焰;power:30][MP:2]', 范围: { 类型: '直线', 长: 10, 宽: 1 } }, { 名字: '火舞术-压缩爆燃', 标签: '[火焰;power:70][MP:5]' }] }]);
    const parent = skills.find(s => s.isGroup);
    cases.push(ok('THIT 显式父子保持完整名称、费用和同一引用', parent && parent.children[0].name === '火舞术-精准流火' && parent.children[0].cost === 2 && skills.includes(parent.children[0]) && parent.children[1].power === 70));
    const cloned = linkSkillGroupRows(JSON.parse(JSON.stringify(skills)));
    const clonedParent = cloned.find(s => s.isGroup);
    cases.push(ok('THIT JSON存档合并后组子重连到实际平铺对象', clonedParent.children.every(c => cloned.includes(c))));
    const legacy = parseSkillList([{ '【旧组】': ['【旧子】[火焰;power:12][MP:4]'] }]);
    cases.push(ok('THIT 旧嵌套组保持同引用和费用', legacy.length === 2 && legacy[0].children[0] === legacy[1] && legacy[1].cost === 4));
    const independent = parseSkillList([{ 名字: '独立-技能', 标签: '[伤害;power:9]' }]);
    cases.push(ok('THIT 不凭连字符猜父子', independent.length === 1 && independent[0].name === '独立-技能' && !independent[0].isGroup));
    const ui = readFileSync(new URL('../../../tactics/src/vendor/rpg-ui/rpg-ui.mjs', import.meta.url), 'utf8');
    const a = ui.indexOf('function isAttackSkill(skill) {'), b = ui.indexOf('function formatTagPill(', a);
    const isAttack = new Function('skillSlots', ui.slice(a, b) + '\nreturn isAttackSkill;')(skillSlots);
    cases.push(ok('THIT 原版组卡按子技能分类', isAttack(parent) && !isAttack(parseSkill('【增益】[增攻;power:9]'))));
    return { cases };
  } },
};
