import { BGM_POOLS, BGM_TRACKS, COMEBACK_POOL } from './bgm-library.mjs';

const TRACK_BY_ID = new Map(BGM_TRACKS.map(track => [track.id, track]));
const isComeback = track => COMEBACK_POOL.includes(track?.id);
const LEVELS = ['low', 'medium', 'high'];
const VOLUME_KEY = 'tactics.bgm.volume';
const FADE_IN = Float32Array.from({ length: 129 }, (_, i) => Math.sin(i * Math.PI / 256));
const FADE_OUT = FADE_IN.slice().reverse();
const hpRatio = unit => unit.status === 'active' ? unit.hp / unit.maxHp : 0;

function partyState(frame) {
  const heroes = frame.units.filter(u => u.primary && !u.isSummon);
  const down = heroes.filter(u => u.status !== 'active').length;
  const average = heroes.length ? heroes.reduce((sum, u) => sum + hpRatio(u), 0) / heroes.length : 1;
  return { heroes, down, average, halfDown: down > 0 && down * 2 >= heroes.length };
}

function sustainedPressure(party, previous) {
  if (party.average <= 0.25 || party.halfDown || (previous === 2 && party.average <= 0.35)) return 2;
  if (party.average <= 0.55 || party.down || (previous >= 1 && party.average <= 0.65)) return 1;
  return 0;
}

export function createBattleMood() {
  let level, pressure, candidate, contact, serial, defeatAt, reliefAt;

  function reset(frame) {
    pressure = sustainedPressure(partyState(frame), 0);
    level = LEVELS[pressure];
    candidate = null;
    contact = false;
    serial = 0;
    defeatAt = reliefAt = -Infinity;
  }

  function settle(before, after) {
    if (after.terminal) return { level, comeback: false };
    serial++;
    const previous = pressure;
    const party = partyState(after);
    pressure = sustainedPressure(party, previous);
    const prior = new Map(before.units.map(unit => [unit.id, unit]));
    const damage = after.units.some(u => {
      const old = prior.get(u.id);
      return old && !u.isSummon && (u.primary || u.side === 'enemy') && (old.hp > u.hp || old.shield > u.shield);
    });
    const defeated = after.units.some(u => u.side === 'enemy' && !u.isSummon &&
      u.status !== 'active' && prior.get(u.id)?.status === 'active');
    const heavyHit = partyState(before).average - party.average >= 0.30 - 1e-9 || party.heroes.some(u => {
      const old = prior.get(u.id);
      return old && hpRatio(u) <= 0.15 && hpRatio(old) - hpRatio(u) >= 0.35 - 1e-9;
    });
    const trading = contact && (damage || defeated);
    contact = damage || defeated;
    if (defeated) defeatAt = serial;
    if (pressure < previous) reliefAt = serial;
    if (pressure > previous || heavyHit) reliefAt = -Infinity;
    const comeback = pressure < 2 && !heavyHit && serial - defeatAt <= 1 && serial - reliefAt <= 1;
    if (comeback) defeatAt = reliefAt = -Infinity;

    const next = heavyHit || pressure === 2 ? 'high' : pressure === 1 || trading || contact ? 'medium' : 'low';
    if (next === level) candidate = null;
    else if (heavyHit || pressure === 2 || candidate === next || (level === 'low' && trading)) {
      level = next;
      candidate = null;
    } else candidate = next;
    return { level, comeback, crisis: heavyHit || pressure === 2 };
  }

  return { reset, settle, level: () => level };
}

function localStorageForBgm() {
  try { return globalThis.localStorage; } catch (_) { return null; }
}

export function createBgmDirector({ assetBase, context, createAudio = () => new Audio(), random = Math.random,
  storage = localStorageForBgm() } = {}) {
  const mood = createBattleMood();
  const listeners = new Set();
  const recent = [];
  let volume = 0.30;
  try {
    const saved = storage?.getItem(VOLUME_KEY);
    if (saved != null) volume = Math.max(0, Math.min(1, Number(saved)));
  } catch (_) { /* sandbox without storage */ }
  let ctx, master, decks = [], current = null;
  let battle = null, terminal = false, lastSettlement = null, settledFrame = null;
  let mode = 'auto', paused = false, error = null;
  let unlocked = false, destroyed = false, job = null, queued = null;

  function state() {
    return { level: mood.level() || 'low', mode, track: current?.track || null, paused,
      playing: Boolean(current && !current.audio.paused && !current.audio.ended), loading: !current && Boolean(job || queued),
      volume, comeback: isComeback(current?.track), error };
  }

  function notify() {
    const actual = state();
    for (const fn of listeners) fn(actual);
  }

  function draw(level) {
    const ids = BGM_POOLS[level].filter(id => !recent.includes(id));
    return TRACK_BY_ID.get(ids[Math.floor(random() * ids.length)]);
  }

  function gain(deck, value, at = ctx.currentTime) {
    deck.gain.gain.cancelScheduledValues(deck.curveFrom ?? at);
    deck.curveFrom = null;
    deck.gain.gain.setValueAtTime(value, at);
  }

  function clear(deck) {
    deck.audio.pause();
    if (deck.track) {
      deck.track = null;
      deck.audio.removeAttribute('src');
      deck.audio.load();
    }
    gain(deck, 0);
  }

  function load(deck, track) {
    if (deck.track === track) return;
    clear(deck);
    deck.track = track;
    deck.audio.src = assetBase.replace(/\/$/, '') + '/' + track.path.split('/').map(encodeURIComponent).join('/');
    deck.audio.load();
  }

  function warmNext() {
    if (mode !== 'auto' || paused || terminal || !battle || !current || current.audio.ended) return;
    const standby = decks.find(deck => deck !== current);
    const level = mood.level();
    if (!BGM_POOLS[level].includes(standby.track?.id) || recent.includes(standby.track?.id)) load(standby, draw(level));
  }

  function cancelJob() {
    if (!job) return;
    const oldJob = job;
    job = null;
    oldJob.cancelWait?.();
    if (oldJob.incoming !== current) clear(oldJob.incoming);
    for (const deck of decks) if (deck !== current && deck.track) clear(deck);
    if (current) gain(current, 1);
  }

  function ready(op) {
    const audio = op.incoming.audio;
    if (audio.error) throw new Error('media');
    if (audio.readyState >= 3) return true;
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('canplay', success);
        audio.removeEventListener('error', failure);
        op.cancelWait = null;
      };
      const success = () => { cleanup(); resolve(true); };
      const failure = () => { cleanup(); reject(new Error('media')); };
      audio.addEventListener('canplay', success);
      audio.addEventListener('error', failure);
      op.cancelWait = () => { cleanup(); resolve(false); };
    });
  }

  function audioTime(op, time) {
    return new Promise(resolve => {
      // 单样点静音源只用来收到音频时钟回调，旋律仍由流式媒体元素播放。
      const timer = ctx.createBufferSource();
      timer.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      timer.connect(master);
      timer.onended = () => { timer.disconnect(); op.cancelWait = null; resolve(true); };
      timer.start(time);
      op.cancelWait = () => {
        timer.onended = null;
        timer.stop();
        timer.disconnect();
        op.cancelWait = null;
        resolve(false);
      };
    });
  }

  function markStarted(deck) {
    current = deck;
    recent.unshift(deck.track.id);
    if (recent.length > 2) recent.pop();
    error = null;
    notify();
  }

  async function switchTrack(op) {
    const { incoming, outgoing, track } = op;
    try {
      if (!await ready(op) || job !== op) return;
      const overlap = outgoing && !outgoing.audio.paused && !outgoing.audio.ended && outgoing !== incoming;
      const vocalPair = overlap && outgoing.track.vocal === 'vocal' && track.vocal === 'vocal';
      if (vocalPair) {
        op.fading = true;
        const t = ctx.currentTime;
        gain(outgoing, 1, t);
        outgoing.gain.gain.linearRampToValueAtTime(0, t + 2.2);
        if (!await audioTime(op, t + 2.2) || job !== op) return;
      }
      incoming.audio.currentTime = 0;
      await incoming.audio.play();
      if (job !== op) return;
      const t = ctx.currentTime;
      if (vocalPair) {
        clear(outgoing);
        gain(incoming, 0, t);
        incoming.gain.gain.linearRampToValueAtTime(1, t + 1.8);
        markStarted(incoming);
        if (!await audioTime(op, t + 1.8) || job !== op) return;
      } else if (overlap && !outgoing.audio.ended) {
        op.fading = true;
        outgoing.gain.gain.cancelScheduledValues(t);
        incoming.gain.gain.cancelScheduledValues(t);
        outgoing.gain.gain.setValueCurveAtTime(FADE_OUT, t, 4);
        outgoing.curveFrom = t;
        incoming.gain.gain.setValueCurveAtTime(FADE_IN, t, 4);
        incoming.curveFrom = t;
        markStarted(incoming);
        if (!await audioTime(op, t + 4) || job !== op) return;
        clear(outgoing);
      } else {
        if (outgoing && outgoing !== incoming) clear(outgoing);
        gain(incoming, 1, t);
        markStarted(incoming);
      }
    } catch (_) {
      if (job !== op) return;
      cancelJob();
      error = '无法播放：' + track.title;
      notify();
      if (queued) pump();
      return;
    }
    if (job !== op) return;
    job = null;
    if (queued) pump();
    else if (current.audio.ended && mode === 'auto') enqueue({ level: mood.level() });
    else warmNext();
  }

  function pump() {
    if (!unlocked || paused || terminal || !battle || !queued || job) return;
    const intent = queued;
    queued = null;
    const standby = decks.find(deck => deck !== current);
    const canReuse = intent.reuse && BGM_POOLS[intent.level].includes(standby.track?.id) && !recent.includes(standby.track?.id);
    const track = intent.comeback ? TRACK_BY_ID.get(COMEBACK_POOL[Math.floor(random() * COMEBACK_POOL.length)])
      : intent.id ? TRACK_BY_ID.get(intent.id) : canReuse ? standby.track : draw(intent.level);
    if (current?.track === track && !current.audio.ended && !current.audio.paused) return;
    load(standby, track);
    job = { incoming: standby, outgoing: current, track, fading: false, cancelWait: null };
    void switchTrack(job);
  }

  function enqueue(intent) {
    if (!battle || terminal) return;
    queued = intent;
    if (job && !job.fading) cancelJob();
    pump();
  }

  function ended(deck) {
    if (deck !== current) return;
    if (mode === 'manual' && !job) paused = true;
    notify();
    if (!job && mode === 'auto' && !paused) enqueue({ level: mood.level(), reuse: true });
  }

  async function unlock() {
    if (destroyed || unlocked) return;
    ctx ||= context();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) { return; }
    }
    if (destroyed || unlocked) return;
    unlocked = true;
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    decks = [0, 1].map(() => {
      const audio = createAudio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      const node = ctx.createGain();
      const source = ctx.createMediaElementSource(audio);
      source.connect(node);
      node.connect(master);
      const deck = { audio, gain: node, source, track: null, onEnded: () => ended(deck) };
      audio.addEventListener('ended', deck.onEnded);
      gain(deck, 0);
      return deck;
    });
    pump();
  }

  function stopBattle() {
    battle = settledFrame = current = queued = null;
    terminal = false;
    lastSettlement = null;
    error = null;
    cancelJob();
    for (const deck of decks) clear(deck);
    paused = mode === 'manual';
    notify();
  }

  function startBattle(frame) {
    stopBattle();
    battle = settledFrame = frame;
    terminal = Boolean(frame.terminal);
    mood.reset(frame);
    if (mode === 'auto') enqueue({ level: mood.level() });
    notify();
  }

  function syncBattle(frame, settlementId = null, beforeFrame) {
    if (!battle || terminal) return;
    battle = frame;
    if (frame.terminal) {
      terminal = true;
      queued = null;
      if (job && !job.fading) cancelJob();
      if (!job) for (const deck of decks) if (deck !== current) clear(deck);
      notify();
      return;
    }
    if (settlementId == null || (lastSettlement != null && settlementId <= lastSettlement)) return;
    lastSettlement = settlementId;
    const oldLevel = mood.level();
    const result = mood.settle(beforeFrame || settledFrame, frame);
    settledFrame = frame;
    if (mode === 'auto' && !paused) {
      const special = isComeback(current?.track) || isComeback(job?.track) || queued?.comeback;
      if (result.comeback && !special) enqueue({ comeback: true });
      else if (result.level !== oldLevel && !special) enqueue({ level: result.level });
    }
    notify();
  }

  function selectTrack(id) {
    if (!TRACK_BY_ID.has(id)) return;
    mode = 'manual';
    paused = false;
    error = null;
    enqueue({ id });
    notify();
  }

  function nextTrack() {
    mode = 'manual';
    paused = false;
    enqueue({ level: mood.level() || 'low' });
    notify();
  }

  function togglePause() {
    mode = 'manual';
    paused = !paused;
    if (paused) {
      queued = null;
      for (const deck of decks) deck.audio.pause();
      cancelJob();
      for (const deck of decks) if (deck !== current) clear(deck);
    } else if (current && !current.audio.ended) {
      const deck = current;
      deck.audio.play().then(() => { if (current === deck) notify(); }, () => {
        if (current !== deck || paused) return;
        error = '无法播放：' + deck.track.title;
        notify();
      });
    } else if (current) enqueue({ id: current.track.id });
    else enqueue({ level: mood.level() || 'low' });
    notify();
  }

  function resumeAuto() {
    mode = 'auto';
    paused = false;
    error = null;
    if (battle && !terminal) {
      if (!current || current.audio.paused || current.audio.ended || !BGM_POOLS[mood.level()].includes(current.track.id) || job) {
        enqueue({ level: mood.level() });
      } else warmNext();
    }
    notify();
  }

  function setVolume(value) {
    volume = Math.max(0, Math.min(1, value));
    if (master) master.gain.value = volume;
    try { storage?.setItem(VOLUME_KEY, String(volume)); } catch (_) { /* sandbox without storage */ }
    notify();
  }

  function destroy() {
    destroyed = true;
    listeners.clear();
    stopBattle();
    for (const deck of decks) {
      deck.audio.removeEventListener('ended', deck.onEnded);
      deck.source.disconnect();
      deck.gain.disconnect();
    }
    master?.disconnect();
    decks = [];
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(state());
    return () => listeners.delete(fn);
  }

  return { startBattle, syncBattle, stopBattle, unlock, state, subscribe, selectTrack, nextTrack, togglePause, setVolume, resumeAuto, destroy };
}
