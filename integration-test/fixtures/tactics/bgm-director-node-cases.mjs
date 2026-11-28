import assert from 'node:assert/strict';
import { BGM_TRACKS, BGM_POOLS, COMEBACK_POOL } from '../../../tactics/src/bgm-library.mjs';
import { createBattleMood, createBgmDirector } from '../../../tactics/src/bgm-director.mjs';

const unit = (id, side, hp, extra = {}) => ({ id, side, primary: side === 'hero', hp, maxHp: 100,
  shield: 0, isSummon: false, status: hp > 0 ? 'active' : side === 'hero' ? 'down' : 'dead', ...extra });
const hero = (hp, i) => unit('hero' + i, 'hero', hp);
const enemy = (hp, extra) => unit('enemy', 'enemy', hp, extra);
const frame = (hp, units = [enemy(100)]) => ({ terminal: null, units: [...hp.map(hero), ...units] });
const calm = frame([100, 100, 100, 100]);
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function audioHarness(Director, { ready = true, random = () => 0 } = {}) {
  const calls = [], decks = [], timers = new Set(), saved = new Map();
  const gain = () => ({ connect() {}, disconnect() {}, gain: {
    value: 1,
    cancelScheduledValues() {},
    setValueAtTime() {},
    linearRampToValueAtTime(v, t) { calls.push(['linear', v, t]); },
    setValueCurveAtTime(values, t, duration) { calls.push(['curve', values.slice(), t, duration]); },
  } });
  const ctx = {
    state: 'running', currentTime: 0, sampleRate: 48000, destination: {}, createGain: gain,
    createMediaElementSource() { return { connect() {}, disconnect() {} }; },
    createBuffer(channels, length) { assert.equal(channels, 1); assert.equal(length, 1); return {}; },
    createBufferSource() { return {
      connect() {}, disconnect() {}, start(t) { this.time = t; timers.add(this); }, stop() { timers.delete(this); },
    }; },
  };
  class FakeAudio extends EventTarget {
    src = ''; currentTime = 0; paused = true; ended = false; readyState = 0;
    load() { this.readyState = this.src && ready ? 3 : 0; this.ended = false; this.currentTime = 0; }
    play() { assert.ok(this.readyState >= 3); calls.push(['play', this.src, this.currentTime]); this.paused = this.ended = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    end() { this.ended = this.paused = true; this.dispatchEvent(new Event('ended')); }
  }
  const director = Director({ assetBase: 'https://assets.invalid/', context: () => ctx, random,
    createAudio: () => { const deck = new FakeAudio(); decks.push(deck); return deck; },
    storage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) } });
  async function advance(time) {
    for (const timer of timers) if (timer.time <= time) {
      ctx.currentTime = timer.time;
      timers.delete(timer);
      timer.onended();
      await flush();
    }
    ctx.currentTime = time;
  }
  return { director, calls, decks, saved, advance, active: () => decks.find(deck => !deck.paused) };
}

export async function runBgmCases({ tracks = BGM_TRACKS, pools = BGM_POOLS, comeback = COMEBACK_POOL,
  Director = createBgmDirector, Mood = createBattleMood } = {}) {
  const cases = [];
  const check = async (id, fn) => {
    try { await fn(); cases.push({ id, pass: true }); }
    catch (error) { cases.push({ id, pass: false, detail: error.stack }); }
  };

  await check('BGM-01 真实交战和两条血线回升门槛', () => {
    const mood = Mood();
    const hit = frame([100, 100, 100, 100], [enemy(85)]);
    const second = frame([100, 100, 100, 100], [enemy(80)]);
    const critical = frame([25, 25, 25, 25]);
    const recover = frame([35, 35, 35, 35]);
    const safer = frame([36, 36, 36, 36]);
    const pressureExit = frame([65, 65, 65, 65]);
    const stable = frame([66, 66, 66, 66]);
    mood.reset(calm);
    assert.equal(mood.settle(calm, hit).level, 'low');
    assert.equal(mood.settle(hit, second).level, 'medium');
    assert.equal(mood.settle(second, critical).level, 'high');
    assert.equal(mood.settle(critical, recover).level, 'high');
    assert.equal(mood.settle(recover, safer).level, 'high');
    assert.equal(mood.settle(safer, safer).level, 'medium');
    assert.equal(mood.settle(safer, pressureExit).level, 'medium');
    assert.equal(mood.settle(pressureExit, stable).level, 'medium');
    assert.equal(mood.settle(stable, stable).level, 'low');
  });

  await check('BGM-02 单人和团队重创立即升高，召唤和护盾不冒充重创', () => {
    const mood = Mood();
    for (const hp of [[100, 100, 100, 10], [70, 70, 70, 70], [100, 100, 0, 0]]) {
      mood.reset(calm);
      const r = mood.settle(calm, frame(hp));
      assert.equal(r.level, 'high');
      assert.equal(r.comeback, false);
    }
    const summons = [unit('summon', 'hero', 1, { isSummon: true })];
    mood.reset(calm);
    const after = frame([100, 100, 100, 100], [enemy(100, { shield: 0 }), ...summons]);
    const before = frame([100, 100, 100, 100], [enemy(100, { shield: 80 }), ...summons]);
    assert.equal(mood.settle(before, after).level, 'low');
    assert.equal(mood.settle(before, after).level, 'medium');
  });

  await check('BGM-03 击杀证据仅消费一次，危机和终局优先', () => {
    const mood = Mood(), pressure = frame([50, 50, 50, 50]);
    const wonGround = frame([70, 70, 70, 70], [enemy(0)]);
    mood.reset(pressure);
    assert.equal(mood.settle(pressure, wonGround).comeback, true);
    assert.equal(mood.settle(wonGround, wonGround).comeback, false);
    mood.reset(calm);
    assert.equal(mood.settle(calm, wonGround).comeback, false);
    mood.reset(pressure);
    const lostGround = frame([25, 25, 25, 25], [enemy(0)]);
    assert.equal(mood.settle(pressure, lostGround).comeback, false);
    mood.reset(pressure);
    assert.equal(mood.settle(pressure, { ...wonGround, terminal: { type: 'victory' } }).comeback, false);
    const summoned = frame([50, 50, 50, 50], [enemy(10, { isSummon: true })]);
    mood.reset(summoned);
    assert.equal(mood.settle(summoned, frame([70, 70, 70, 70], [enemy(0, { isSummon: true })])).comeback, false);
    mood.reset(pressure);
    assert.equal(mood.settle(pressure, calm).comeback, false);
    assert.equal(mood.settle(calm, frame([100, 100, 100, 100], [enemy(0)])).comeback, true);
  });

  await check('BGM-04 刷新与重复回调不推进两次确认', () => {
    const { director } = audioHarness(Director);
    const first = frame([100, 100, 100, 100], [enemy(80)]);
    const next = frame([100, 100, 100, 100], [enemy(70)]);
    director.startBattle(calm);
    director.syncBattle(first, 1, calm);
    director.syncBattle(first, 1, calm);
    director.syncBattle(next);
    assert.equal(director.state().level, 'low');
    director.syncBattle(next, 2, first);
    assert.equal(director.state().level, 'medium');
    director.destroy();
  });

  await check('BGM-05 从零流式起播，最近两首不重复，手动锁跨局', async () => {
    const { director, calls, active, saved } = audioHarness(Director);
    director.startBattle(calm);
    await director.unlock(); await flush();
    const heard = [director.state().track.id];
    for (let i = 0; i < 3; i++) {
      active().end(); await flush(); heard.push(director.state().track.id);
    }
    assert.deepEqual(heard, [...pools.low, pools.low[0]]);
    assert.ok(calls.filter(([type]) => type === 'play').every(([, src, time]) => src.includes('/BGM_33/') && time === 0));
    director.togglePause();
    director.setVolume(0.42);
    assert.equal(director.state().playing, false);
    assert.deepEqual([...saved.values()], ['0.42']);
    director.startBattle(calm);
    await director.unlock(); await flush();
    assert.equal(director.state().mode, 'manual');
    assert.equal(director.state().playing, false);
    director.resumeAuto(); await flush();
    assert.equal(director.state().playing, true);
    director.destroy();
  });

  await check('BGM-06 等功率 4 秒与双 vocal 先淡出再淡入', async () => {
    const { director, calls, advance } = audioHarness(Director);
    director.startBattle(calm);
    await director.unlock(); await flush();
    director.selectTrack(pools.medium[0]); await flush();
    const curves = calls.filter(([kind]) => kind === 'curve');
    assert.equal(curves.length, 2);
    assert.deepEqual(curves.map(([, points, time, duration]) => [points[0], points.at(-1), time, duration]), [[1, 0, 0, 4], [0, 1, 0, 4]]);
    assert.ok(Math.abs(curves[0][1][64] ** 2 + curves[1][1][64] ** 2 - 1) < 1e-6);
    await advance(4);
    director.selectTrack(pools.medium[1]); await flush();
    assert.equal(director.state().track.id, pools.medium[0]);
    assert.deepEqual(calls.filter(([kind]) => kind === 'linear'), [['linear', 0, 6.2]]);
    await advance(6.2);
    assert.equal(director.state().track.id, pools.medium[1]);
    assert.deepEqual(calls.filter(([kind]) => kind === 'linear'), [['linear', 0, 6.2], ['linear', 1, 8]]);
    director.destroy();
  });

  await check('BGM-07 暂停、切局和终局取消待就绪切换', async () => {
    for (const interrupt of [d => d.togglePause(), d => d.stopBattle(), d => d.syncBattle({ ...calm, terminal: { type: 'victory' } })]) {
      const { director, calls, decks } = audioHarness(Director, { ready: false });
      director.startBattle(calm);
      await director.unlock(); await flush();
      assert.ok(decks.some(deck => deck.src));
      interrupt(director);
      for (const deck of decks) { deck.readyState = 3; deck.dispatchEvent(new Event('canplay')); }
      await flush();
      assert.equal(director.state().playing, false);
      assert.equal(calls.some(([kind]) => kind === 'play'), false);
      director.destroy();
    }
  });

  await check('BGM-08 换档从新池抽歌，结算不续播', async () => {
    const { director, calls, decks, advance } = audioHarness(Director, { random: () => 0.99 });
    director.startBattle(calm);
    await director.unlock(); await flush();
    assert.equal(director.state().track.id, pools.low[2]);
    const first = frame([100, 100, 100, 100], [enemy(80)]);
    director.syncBattle(first, 1);
    director.syncBattle(frame([100, 100, 100, 100], [enemy(50)]), 2);
    await flush();
    assert.equal(director.state().track.id, pools.medium[2]);
    director.syncBattle({ ...calm, terminal: { type: 'victory' } });
    await advance(4);
    assert.equal(director.state().playing, true);
    decks.find(deck => !deck.paused).end(); await flush();
    assert.equal(calls.filter(([kind]) => kind === 'play').length, 2);
    director.destroy();
  });

  await check('BGM-09 改名曲库按前缀精确分池', () => {
    assert.equal(tracks.length, 11);
    assert.equal(new Set(tracks.map(track => track.path)).size, 11);
    for (const track of tracks) {
      assert.match(track.path, /^BGM_33\/[^/]+\.mp3$/);
      assert.ok(['vocal', 'chant', 'instrumental'].includes(track.vocal));
    }
    for (const [ids, prefix, count] of [[pools.low, '低烈度', 3], [pools.medium, '中烈度', 3], [pools.high, '高烈度', 3], [comeback, '反击', 2]]) {
      assert.equal(new Set(ids).size, count);
      for (const id of ids) assert.ok(tracks.find(t => t.id === id)?.path.startsWith('BGM_33/' + prefix + ' - '));
    }
    assert.equal(new Set([...Object.values(pools).flat(), ...comeback]).size, 11);
  });

  await check('BGM-10 反击随机二选一，再触发不切也不排队，播完按最新烈度续播', async () => {
    const enemy2 = hp => unit('enemy2', 'enemy', hp);
    for (const random of [0, 0.99]) {
      const h = audioHarness(Director, { random: () => random });
      const d = h.director;
      const pressure = frame([50, 50, 50, 50], [enemy(100), enemy2(100)]);
      const relief = frame([75, 75, 75, 75], [enemy(0), enemy2(100)]);
      const again = frame([50, 50, 50, 50], [enemy(0), enemy2(100)]);
      const secondRelief = frame([75, 75, 75, 75], [enemy(0), enemy2(0)]);
      d.startBattle(pressure);
      await d.unlock(); await flush();
      d.syncBattle(relief, 1); await flush(); await h.advance(4);
      const special = comeback[random === 0 ? 0 : 1];
      assert.equal(d.state().track.id, special);
      assert.equal(d.state().comeback, true);
      d.syncBattle(again, 2);
      d.syncBattle(secondRelief, 3); await flush();
      d.syncBattle(frame([20, 20, 20, 20], [enemy(0), enemy2(0)]), 4); await flush();
      assert.equal(d.state().track.id, special);
      assert.equal(d.state().level, 'high');
      assert.equal(h.calls.filter(([type]) => type === 'play').length, 2);
      h.active().end(); await flush();
      assert.ok(pools.high.includes(d.state().track.id));
      assert.equal(d.state().comeback, false);
      assert.equal(h.calls.filter(([type]) => type === 'play').length, 3);
      d.destroy();
    }
  });

  return { cases };
}

export const groups = { BGM: { run: () => runBgmCases() } };
