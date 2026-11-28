import assert from 'node:assert/strict';
import { BGM_TRACKS, BGM_POOLS, COMEBACK_POOL, BGM_THEMES, DEFAULT_BGM_THEME } from '../../../tactics/src/bgm-library.mjs';
import { createBattleMood, createBgmDirector } from '../../../tactics/src/bgm-director.mjs';

const unit = (id, side, hp, extra = {}) => ({ id, side, primary: side === 'hero', hp, maxHp: 100,
  shield: 0, isSummon: false, status: hp > 0 ? 'active' : side === 'hero' ? 'down' : 'dead', ...extra });
const hero = (hp, i) => unit('hero' + i, 'hero', hp);
const enemy = (hp, extra) => unit('enemy', 'enemy', hp, extra);
const frame = (hp, units = [enemy(100)]) => ({ terminal: null, units: [...hp.map(hero), ...units] });
const calm = frame([100, 100, 100, 100]);
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function audioHarness(Director, { ready = true, random = () => 0, initialTheme = null } = {}) {
  const calls = [], decks = [], timers = new Set(), saved = new Map();
  if (initialTheme) saved.set('tactics.bgm.theme', initialTheme);
  const gain = () => ({ connect() {}, disconnect() {}, gain: {
    value: 1,
    cancelScheduledValues() {},
    setValueAtTime(v, t) { calls.push(['gset', v, t]); },
    linearRampToValueAtTime(v, t) { calls.push(['linear', v, t]); },
    exponentialRampToValueAtTime(v, t) { calls.push(['exp', v, t]); },
    setValueCurveAtTime(values, t, duration) { calls.push(['curve', values.slice(), t, duration]); },
  } });
  const ctx = {
    state: 'running', currentTime: 0, sampleRate: 48000, destination: {}, createGain: gain,
    createMediaElementSource() { return { connect() {}, disconnect() {} }; },
    createBiquadFilter() { return {
      type: 'lowpass', Q: { value: 0.7 }, connect() {}, disconnect() {},
      frequency: {
        value: 20000,
        cancelScheduledValues() {},
        setValueAtTime(v, t) { calls.push(['fset', v, t]); },
        exponentialRampToValueAtTime(v, t) { calls.push(['framp', v, t]); },
      },
    }; },
    createOscillator() { return {
      type: 'sine', connect() {}, disconnect() {},
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      start(t) { calls.push(['stinger-osc', t]); },
      stop() {},
    }; },
    createAnalyser() { return {
      fftSize: 128, smoothingTimeConstant: 0.72, frequencyBinCount: 64,
      connect() {}, disconnect() {},
      getByteFrequencyData(buf) { buf.fill(160); },
    }; },
    createBuffer(channels, length) {
      assert.equal(channels, 1);
      return { length, getChannelData: () => new Float32Array(length) };
    },
    createBufferSource() { return {
      buffer: null, connect() {}, disconnect() {},
      start(t) {
        if (this.buffer && this.buffer.length > 1) { calls.push(['stinger-noise', t]); return; }
        this.time = t; timers.add(this);
      },
      stop(t) { if (t == null) timers.delete(this); },
    }; },
  };
  class FakeAudio extends EventTarget {
    src = ''; currentTime = 0; duration = 200; paused = true; ended = false; readyState = 0;
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
    for (;;) {
      const due = [...timers].filter(timer => timer.time <= time).sort((a, b) => a.time - b.time);
      if (!due.length) break;
      const timer = due[0];
      ctx.currentTime = timer.time;
      timers.delete(timer);
      timer.onended?.();
      await flush();
    }
    ctx.currentTime = time;
  }
  return { director, calls, decks, saved, advance, active: () => decks.find(deck => !deck.paused) };
}

export async function runBgmCases({ tracks = BGM_TRACKS, pools = BGM_POOLS, comeback = COMEBACK_POOL,
  themes = BGM_THEMES, Director = createBgmDirector, Mood = createBattleMood } = {}) {
  const cases = [];
  const check = async (id, fn) => {
    try { await fn(); cases.push({ id, pass: true }); }
    catch (error) { cases.push({ id, pass: false, detail: error.stack }); }
  };

  await check('BGM-01 单向烈度棘轮与三类实质升温门槛', () => {
    const mood = Mood();
    const c1 = frame([100, 100, 100, 100], [enemy(90)]);
    const c2 = frame([100, 100, 100, 100], [enemy(80)]);
    const c3 = frame([100, 100, 100, 100], [enemy(70)]);
    const critical = frame([25, 25, 25, 25]);
    mood.reset(calm);
    assert.equal(mood.settle(calm, c1).level, 'low');
    assert.equal(mood.settle(c1, c2).level, 'low');
    assert.equal(mood.settle(c2, c3).level, 'medium');
    assert.equal(mood.settle(c3, c3).level, 'medium');
    assert.equal(mood.settle(c3, calm).level, 'medium');
    assert.equal(mood.settle(calm, critical).level, 'high');
    assert.equal(mood.settle(critical, calm).level, 'high');

    mood.reset(calm);
    assert.equal(mood.settle(calm, frame([100, 100, 100, 75])).level, 'medium');
    mood.reset(calm);
    assert.equal(mood.settle(calm, frame([100, 100, 100, 100], [enemy(0)])).level, 'medium');
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
    assert.equal(mood.settle(before, after).level, 'low');
    assert.equal(mood.settle(before, after).level, 'medium');
  });

  await check('BGM-03 反击可在中/高烈度插入且单局限 1 次，重创和终局优先', () => {
    const mood = Mood(), enemy2 = hp => unit('enemy2', 'enemy', hp);
    const pressure = frame([50, 50, 50, 50], [enemy(100), enemy2(100)]);
    const killOne = frame([50, 50, 50, 50], [enemy(0), enemy2(100)]);
    const killTwo = frame([50, 50, 50, 50], [enemy(0), enemy2(0)]);
    mood.reset(pressure);
    assert.equal(mood.settle(pressure, killOne).comeback, true);
    assert.equal(mood.settle(killOne, killTwo).comeback, false);

    // 高危绝境（均血 20%）下斩杀非召唤敌方依然可触发反击曲
    const highCrisis = frame([20, 20, 20, 20], [enemy(100)]);
    const highKill = frame([20, 20, 20, 20], [enemy(0)]);
    mood.reset(highCrisis);
    const hk = mood.settle(highCrisis, highKill);
    assert.equal(hk.comeback, true);
    assert.equal(hk.level, 'high');

    // 低烈度无伤首杀不播反击（直接升入 medium），随后再杀才算激战斩杀
    mood.reset(calm);
    assert.equal(mood.settle(calm, frame([100, 100, 100, 100], [enemy(0)])).comeback, false);

    // 单拍灭团重创、终局、召唤物击杀不触发反击
    mood.reset(pressure);
    assert.equal(mood.settle(pressure, frame([10, 10, 10, 10], [enemy(0)])).comeback, false);
    mood.reset(pressure);
    assert.equal(mood.settle(pressure, { ...killOne, terminal: { type: 'victory' } }).comeback, false);
    const summoned = frame([50, 50, 50, 50], [enemy(10, { isSummon: true })]);
    mood.reset(summoned);
    assert.equal(mood.settle(summoned, frame([50, 50, 50, 50], [enemy(0, { isSummon: true })])).comeback, false);
  });

  await check('BGM-04 刷新与重复回调不推进两次，纯走位零推进', () => {
    const { director } = audioHarness(Director);
    const c1 = frame([100, 100, 100, 100], [enemy(90)]);
    const c2 = frame([100, 100, 100, 100], [enemy(80)]);
    const c3 = frame([100, 100, 100, 100], [enemy(70)]);
    director.startBattle(calm);
    director.syncBattle(c1, 1, calm);
    director.syncBattle(c1, 1, calm);
    director.syncBattle(c2, 2, c1);
    assert.equal(director.state().level, 'low');
    director.syncBattle(c3, 3, c2);
    assert.equal(director.state().level, 'medium');
    director.destroy();
  });

  await check('BGM-05 默认八方旅人主题从零流式起播，最近两首不重复，手动锁跨局', async () => {
    const { director, calls, active, saved } = audioHarness(Director);
    assert.equal(DEFAULT_BGM_THEME, 'octopath');
    assert.equal(director.state().theme, 'octopath');
    director.startBattle(calm);
    await director.unlock(); await flush();
    const heard = [director.state().track.id];
    for (let i = 0; i < 3; i++) {
      active().end(); await flush(); heard.push(director.state().track.id);
    }
    assert.deepEqual(heard, [...pools.low, pools.low[0]]);
    assert.ok(calls.filter(([type]) => type === 'play').every(([, src, time]) => src.includes('/BGM_OCTOPATH/') && time === 0));
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

  await check('BGM-06 双主题无损切换并持久化，保留原版 33 号混搭', async () => {
    const h = audioHarness(Director);
    const d = h.director;
    d.startBattle(calm);
    await d.unlock(); await flush();
    assert.ok(h.active().src.includes('/BGM_OCTOPATH/'));
    d.setTheme('e33');
    await flush();
    await h.advance(0.6);
    assert.equal(d.state().theme, 'e33');
    assert.ok(themes.e33.pools.low.includes(d.state().track.id));
    assert.ok(d.state().track.path.startsWith('BGM_33/'));
    assert.equal(h.saved.get('tactics.bgm.theme'), 'e33');
    d.destroy();

    const h2 = audioHarness(Director, { initialTheme: 'e33' });
    h2.director.startBattle(calm);
    await h2.director.unlock(); await flush();
    assert.equal(h2.director.state().theme, 'e33');
    assert.ok(h2.active().src.includes('/BGM_33/'));
    h2.director.destroy();
  });

  await check('BGM-07 低通暗化快收 0.95s、cueIn 强拍直入与过渡掩蔽音', async () => {
    const { director, calls, advance } = audioHarness(Director, { random: () => 0.99 });
    director.startBattle(calm);
    await director.unlock(); await flush();
    assert.equal(calls.find(([k]) => k === 'play')[2], 0);
    assert.equal(director.sampleSpectrum(24).length, 24);

    // 戏剧升温：触发 20kHz -> 420Hz 低通暗化 + 过渡重音 + 0.50s 处从 cueIn 强拍起播
    director.syncBattle(frame([100, 100, 100, 70]), 1, calm);
    await flush();
    assert.ok(calls.some(([k, v, t]) => k === 'framp' && v === 420 && Math.abs(t - 0.95) < 1e-6));
    assert.ok(calls.some(([k]) => k === 'stinger-noise'));
    assert.ok(calls.some(([k]) => k === 'stinger-osc'));
    await advance(0.55);
    const medTrack = themes.octopath.tracks.find(t => t.id === pools.medium.at(-1));
    assert.equal(director.state().track.id, medTrack.id);
    assert.ok(Math.abs(calls.filter(([k]) => k === 'play').at(-1)[2] - medTrack.cueIn) < 1e-6);
    await advance(1.1);

    // 手动选曲：保留短滤波过渡但从 0s 起播，不插过渡掩蔽音
    const beforeStinger = calls.filter(([k]) => k === 'stinger-osc').length;
    director.selectTrack(pools.medium[0]);
    await flush();
    await advance(1.7);
    assert.equal(director.state().track.id, pools.medium[0]);
    assert.equal(calls.filter(([k]) => k === 'play').at(-1)[2], 0);
    assert.equal(calls.filter(([k]) => k === 'stinger-osc').length, beforeStinger);
    director.togglePause();
    assert.equal(director.sampleSpectrum(24), null);
    director.destroy();
  });

  await check('BGM-08 暂停、切局和终局取消待就绪切换', async () => {
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

  await check('BGM-09 双主题曲库（八方旅人 11 首 + 33 号 11 首）结构与 cueIn 校验', () => {
    assert.equal(tracks.length, 11);
    for (const [themeId, prefix, dir] of [['octopath', 'BGM_OCTOPATH/', 'BGM_OCTOPATH'], ['e33', 'BGM_33/', 'BGM_33']]) {
      const th = themes[themeId];
      assert.equal(th.tracks.length, 11);
      assert.equal(new Set(th.tracks.map(t => t.path)).size, 11);
      for (const t of th.tracks) {
        assert.ok(t.path.startsWith(prefix), `${dir}: ${t.path}`);
        assert.ok(typeof t.cueIn === 'number' && t.cueIn >= 0);
        assert.ok(['vocal', 'chant', 'instrumental'].includes(t.vocal));
      }
      const allIds = [...th.pools.low, ...th.pools.medium, ...th.pools.high, ...th.comeback];
      assert.equal(th.pools.low.length, 3);
      assert.equal(th.pools.medium.length, 3);
      assert.equal(th.pools.high.length, 3);
      assert.equal(th.comeback.length, 2);
      assert.equal(new Set(allIds).size, 11);
    }
  });

  await check('BGM-10 反击二选一播完回最高烈度，deferMedium 等回合横幅 flushTurnCue 切入', async () => {
    const enemy2 = hp => unit('enemy2', 'enemy', hp);
    for (const random of [0, 0.99]) {
      const h = audioHarness(Director, { random: () => random });
      const d = h.director;
      const pressure = frame([50, 50, 50, 50], [enemy(100), enemy2(100)]);
      const killOne = frame([50, 50, 50, 50], [enemy(0), enemy2(100)]);
      const killTwo = frame([50, 50, 50, 50], [enemy(0), enemy2(0)]);
      d.startBattle(pressure);
      await d.unlock(); await flush();
      d.syncBattle(killOne, 1); await flush(); await h.advance(1.1);
      const special = comeback[random === 0 ? 0 : 1];
      assert.equal(d.state().track.id, special);
      assert.equal(d.state().comeback, true);
      d.syncBattle(killTwo, 2); await flush();
      d.syncBattle(frame([20, 20, 20, 20], [enemy(0), enemy2(0)]), 3); await flush();
      assert.equal(d.state().track.id, special);
      assert.equal(d.state().level, 'high');
      h.active().end(); await flush();
      assert.ok(pools.high.includes(d.state().track.id));
      assert.equal(d.state().comeback, false);
      d.destroy();
    }

    // deferMedium 挂起直到 flushTurnCue 才从 low 切入 medium
    const h3 = audioHarness(Director, { random: () => 0 });
    h3.director.startBattle(calm);
    await h3.director.unlock(); await flush();
    const lowId = h3.director.state().track.id;
    h3.director.syncBattle(frame([100, 100, 100, 70]), 1, calm, { deferMedium: true });
    await flush();
    assert.equal(h3.director.state().level, 'medium');
    assert.equal(h3.director.state().track.id, lowId);
    h3.director.flushTurnCue();
    await flush();
    await h3.advance(0.6);
    assert.ok(pools.medium.includes(h3.director.state().track.id));
    h3.director.destroy();
  });

  return { cases };
}

export const groups = { BGM: { run: () => runBgmCases() } };
