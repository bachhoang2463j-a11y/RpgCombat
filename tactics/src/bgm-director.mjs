import { ALL_BGM_TRACKS, BGM_THEMES, DEFAULT_BGM_THEME } from './bgm-library.mjs';

const TRACK_BY_ID = new Map(ALL_BGM_TRACKS.map(track => [track.id, track]));
const COMEBACK_IDS = new Set(Object.values(BGM_THEMES).flatMap(t => t.comeback));
const isComeback = track => Boolean(track && COMEBACK_IDS.has(track.id));
const LEVELS = ['low', 'medium', 'high'];
const RANK = { low: 0, medium: 1, high: 2 };
const VOLUME_KEY = 'tactics.bgm.volume';
const THEME_KEY = 'tactics.bgm.theme';
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
  let level, pressure, contacts, blooded, comebackUsed;

  function reset(frame) {
    pressure = sustainedPressure(partyState(frame), 0);
    level = LEVELS[pressure];
    contacts = 0;
    blooded = pressure > 0;
    comebackUsed = false;
  }

  function settle(before, after) {
    if (after.terminal) return { level, upgraded: false, urgent: false, comeback: false, crisis: false };
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
    const hurtHero = party.down > 0 || party.heroes.some(u => hpRatio(u) <= 0.75 + 1e-9);

    if (damage) contacts++;
    if (pressure >= 1 || hurtHero || heavyHit) blooded = true;

    const canComeback = !comebackUsed && !heavyHit && defeated && (level !== 'low' || blooded);
    if (canComeback) {
      comebackUsed = true;
      blooded = true;
    }

    const raw = (heavyHit || pressure === 2) ? 'high'
      : (pressure === 1 || hurtHero || defeated || contacts >= 3 || canComeback) ? 'medium' : 'low';
    const prevLevel = level;
    if (RANK[raw] > RANK[level]) level = raw;
    const upgraded = level !== prevLevel;
    const urgent = canComeback || (upgraded && level === 'high');
    return { level, upgraded, urgent, comeback: canComeback, crisis: heavyHit || pressure === 2 };
  }

  return { reset, settle, level: () => level };
}

function localStorageForBgm() {
  try { return globalThis.localStorage; } catch (_) { return null; }
}

export function createBgmDirector({ assetBase, context, output = null, createAudio = () => new Audio(), random = Math.random,
  storage = localStorageForBgm() } = {}) {
  const mood = createBattleMood();
  const listeners = new Set();
  const recent = [];
  let volume = 0.30;
  let theme = DEFAULT_BGM_THEME;
  try {
    const saved = storage?.getItem(VOLUME_KEY);
    if (saved != null) volume = Math.max(0, Math.min(1, Number(saved)));
    const savedTheme = storage?.getItem(THEME_KEY);
    if (savedTheme && BGM_THEMES[savedTheme]) theme = savedTheme;
  } catch (_) { /* sandbox without storage */ }
  let ctx, master, analyser = null, freqBuf = null, decks = [], current = null;
  let battle = null, terminal = false, lastSettlement = null, settledFrame = null;
  let mode = 'auto', paused = false, error = null;
  let unlocked = false, destroyed = false, job = null, queued = null, pendingTurnCue = null;

  const activeTheme = () => BGM_THEMES[theme] || BGM_THEMES[DEFAULT_BGM_THEME];
  const themeSummary = () => Object.values(BGM_THEMES).map(t => ({ id: t.id, label: t.label, tracks: t.tracks }));

  function state() {
    return { level: mood.level() || 'low', mode, theme, themes: themeSummary(), track: current?.track || null, paused,
      playing: Boolean(current && !current.audio.paused && !current.audio.ended), loading: !current && Boolean(job || queued),
      volume, comeback: isComeback(current?.track), error };
  }

  function notify() {
    const actual = state();
    for (const fn of listeners) fn(actual);
  }

  function draw(level) {
    const pool = activeTheme().pools[level] || [];
    const avail = pool.filter(id => !recent.includes(id));
    const list = avail.length ? avail : pool;
    return TRACK_BY_ID.get(list[Math.floor(random() * list.length)]);
  }

  function gain(deck, value, at = ctx.currentTime) {
    deck.gain.gain.cancelScheduledValues(deck.curveFrom ?? at);
    deck.curveFrom = null;
    deck.gain.gain.setValueAtTime(value, at);
  }

  function resetFilter(deck, at = ctx?.currentTime || 0) {
    if (!deck?.filter?.frequency) return;
    deck.filter.frequency.cancelScheduledValues?.(at);
    deck.filter.frequency.setValueAtTime?.(20000, at);
  }

  function clear(deck) {
    deck.audio.pause();
    if (deck.track) {
      deck.track = null;
      deck.audio.removeAttribute('src');
      deck.audio.load();
    }
    resetFilter(deck);
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
    const pool = activeTheme().pools[level] || [];
    if (!pool.includes(standby.track?.id) || recent.includes(standby.track?.id)) load(standby, draw(level));
  }

  function cancelJob() {
    stopStingers();
    if (!job) return;
    const oldJob = job;
    job = null;
    oldJob.cancelWait?.();
    if (oldJob.incoming !== current) clear(oldJob.incoming);
    for (const deck of decks) if (deck !== current && deck.track) clear(deck);
    if (current) {
      resetFilter(current);
      gain(current, 1);
    }
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

  let stingerNoise = null;
  const stingerNodes = new Set();
  function stopStingers() {
    for (const item of [...stingerNodes]) {
      stingerNodes.delete(item);
      try { item.src.onended = null; item.src.stop?.(); } catch (_) {}
      for (const n of item.nodes) try { n.disconnect?.(); } catch (_) {}
    }
  }
  function playTransitionStinger(at) {
    if (typeof ctx?.createOscillator !== 'function' || typeof ctx?.createBiquadFilter !== 'function') return;
    try {
      stopStingers();
      const rate = ctx.sampleRate || 48000;
      const len = Math.max(1, Math.floor(rate * 0.55));
      if (!stingerNoise || stingerNoise.length !== len) {
        stingerNoise = ctx.createBuffer(1, len, rate);
        const ch = stingerNoise.getChannelData?.(0);
        if (ch) for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = stingerNoise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.6;
      bp.frequency.setValueAtTime(600, at);
      bp.frequency.exponentialRampToValueAtTime(3200, at + 0.52);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.001, at);
      ng.gain.exponentialRampToValueAtTime(0.11, at + 0.46);
      ng.gain.exponentialRampToValueAtTime(0.001, at + 0.55);
      noise.connect(bp); bp.connect(ng); ng.connect(master);
      const nEntry = { src: noise, nodes: [noise, bp, ng] };
      stingerNodes.add(nEntry);
      noise.onended = () => { stingerNodes.delete(nEntry); for (const n of nEntry.nodes) n.disconnect?.(); };
      noise.start(at);
      noise.stop(at + 0.55);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(108, at + 0.48);
      osc.frequency.exponentialRampToValueAtTime(44, at + 0.90);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.001, at + 0.48);
      og.gain.linearRampToValueAtTime(0.20, at + 0.51);
      og.gain.exponentialRampToValueAtTime(0.001, at + 0.92);
      osc.connect(og); og.connect(master);
      const oEntry = { src: osc, nodes: [osc, og] };
      stingerNodes.add(oEntry);
      osc.onended = () => { stingerNodes.delete(oEntry); for (const n of oEntry.nodes) n.disconnect?.(); };
      osc.start(at + 0.48);
      osc.stop(at + 0.92);
    } catch (_) { /* 过渡音合成失败不阻塞切歌 */ }
  }

  function startOffset(audio, track, dramatic) {
    if (!dramatic) return 0;
    const cue = Number(track?.cueIn) || 0;
    if (Number.isFinite(audio.duration) && audio.duration > 6) return Math.min(cue, audio.duration - 5);
    return cue;
  }

  async function switchTrack(op) {
    const { incoming, outgoing, track, dramatic } = op;
    try {
      if (!await ready(op) || job !== op) return;
      const overlap = outgoing && !outgoing.audio.paused && !outgoing.audio.ended && outgoing !== incoming;
      if (overlap) {
        op.fading = true;
        const t0 = ctx.currentTime;
        if (dramatic) playTransitionStinger(t0);
        if (outgoing.filter?.frequency) {
          outgoing.filter.frequency.cancelScheduledValues?.(t0);
          outgoing.filter.frequency.setValueAtTime?.(20000, t0);
          outgoing.filter.frequency.exponentialRampToValueAtTime?.(420, t0 + 0.95);
        }
        gain(outgoing, 1, t0);
        outgoing.gain.gain.linearRampToValueAtTime(0, t0 + 0.95);
        if (!await audioTime(op, t0 + 0.50) || job !== op) return;
        resetFilter(incoming, ctx.currentTime);
        incoming.audio.currentTime = startOffset(incoming.audio, track, dramatic);
        gain(incoming, 0, ctx.currentTime);
        await incoming.audio.play();
        if (job !== op) return;
        const t1 = ctx.currentTime;
        gain(incoming, 0, t1);
        incoming.gain.gain.linearRampToValueAtTime(1, t1 + 0.32);
        markStarted(incoming);
        if (!await audioTime(op, Math.max(t1 + 0.32, t0 + 0.95)) || job !== op) return;
        clear(outgoing);
      } else {
        if (outgoing && outgoing !== incoming) clear(outgoing);
        resetFilter(incoming, ctx.currentTime);
        incoming.audio.currentTime = startOffset(incoming.audio, track, dramatic);
        await incoming.audio.play();
        if (job !== op) return;
        gain(incoming, 1, ctx.currentTime);
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
    const active = activeTheme();
    const pool = active.pools[intent.level] || [];
    const canReuse = intent.reuse && pool.includes(standby.track?.id) && !recent.includes(standby.track?.id);
    const track = intent.comeback ? TRACK_BY_ID.get(active.comeback[Math.floor(random() * active.comeback.length)])
      : intent.id ? TRACK_BY_ID.get(intent.id) : canReuse ? standby.track : draw(intent.level);
    if (!track || (current?.track === track && !current.audio.ended && !current.audio.paused)) return;
    load(standby, track);
    job = { incoming: standby, outgoing: current, track, dramatic: Boolean(intent.dramatic), fading: false, cancelWait: null };
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
    const dest = output ? output() : ctx.destination;   // 宿主主总线：主音量与静音同样作用于配乐
    if (typeof ctx.createAnalyser === 'function') {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      freqBuf = new Uint8Array(analyser.frequencyBinCount);
      master.connect(analyser);
      analyser.connect(dest);
    } else {
      master.connect(dest);
    }
    decks = [0, 1].map(() => {
      const audio = createAudio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      const node = ctx.createGain();
      const source = ctx.createMediaElementSource(audio);
      let filter = null;
      if (typeof ctx.createBiquadFilter === 'function') {
        filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 20000;
        filter.Q.value = 0.7;
        source.connect(filter);
        filter.connect(node);
      } else {
        source.connect(node);
      }
      node.connect(master);
      const deck = { audio, gain: node, filter, source, track: null, onEnded: () => ended(deck) };
      audio.addEventListener('ended', deck.onEnded);
      gain(deck, 0);
      return deck;
    });
    pump();
  }

  function stopBattle() {
    battle = settledFrame = current = queued = pendingTurnCue = null;
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

  function syncBattle(frame, settlementId = null, beforeFrame, { deferMedium = false } = {}) {
    if (!battle || terminal) return;
    battle = frame;
    if (frame.terminal) {
      terminal = true;
      queued = null;
      pendingTurnCue = null;
      if (job && !job.fading) cancelJob();
      if (!job) for (const deck of decks) if (deck !== current) clear(deck);
      notify();
      return;
    }
    if (settlementId == null || (lastSettlement != null && settlementId <= lastSettlement)) return;
    lastSettlement = settlementId;
    const result = mood.settle(beforeFrame || settledFrame, frame);
    settledFrame = frame;
    if (mode === 'auto' && !paused) {
      const special = isComeback(current?.track) || isComeback(job?.track) || queued?.comeback;
      if (result.urgent) {
        pendingTurnCue = null;
        if (!special) enqueue(result.comeback ? { comeback: true, dramatic: true } : { level: result.level, dramatic: true });
      } else if (result.upgraded && !special) {
        if (deferMedium) pendingTurnCue = { level: result.level, dramatic: true };
        else enqueue({ level: result.level, dramatic: true });
      }
    }
    notify();
  }

  function flushTurnCue() {
    if (!pendingTurnCue || mode !== 'auto' || paused || !battle || terminal) return;
    pendingTurnCue = null;
    const special = isComeback(current?.track) || isComeback(job?.track) || queued?.comeback;
    if (special) return;
    const lv = mood.level();
    const pool = activeTheme().pools[lv] || [];
    if (!current || !pool.includes(current.track?.id)) enqueue({ level: lv, dramatic: true });
  }

  function selectTrack(id) {
    if (!TRACK_BY_ID.has(id)) return;
    mode = 'manual';
    paused = false;
    pendingTurnCue = null;
    error = null;
    enqueue({ id });
    notify();
  }

  function nextTrack() {
    mode = 'manual';
    paused = false;
    pendingTurnCue = null;
    error = null;
    enqueue({ level: mood.level() || 'low', dramatic: Boolean(current && !current.audio.paused) });
    notify();
  }

  function togglePause() {
    mode = 'manual';
    paused = !paused;
    if (paused) {
      queued = pendingTurnCue = null;
      for (const deck of decks) deck.audio.pause();
      cancelJob();
      for (const deck of decks) if (deck !== current) clear(deck);
    } else if (current && !current.audio.ended) {
      error = null;
      const deck = current;
      deck.audio.play().then(() => { if (current === deck) notify(); }, () => {
        if (current !== deck || paused) return;
        error = '无法播放：' + deck.track.title;
        notify();
      });
    } else if (current) { error = null; enqueue({ id: current.track.id }); }
    else { error = null; enqueue({ level: mood.level() || 'low' }); }
    notify();
  }

  function resumeAuto() {
    mode = 'auto';
    paused = false;
    pendingTurnCue = null;
    error = null;
    if (battle && !terminal) {
      const pool = activeTheme().pools[mood.level()] || [];
      if (!current || current.audio.paused || current.audio.ended || !pool.includes(current.track?.id) || job) {
        enqueue({ level: mood.level() });
      } else warmNext();
    }
    notify();
  }

  function setTheme(nextTheme) {
    if (!BGM_THEMES[nextTheme] || nextTheme === theme) return;
    theme = nextTheme;
    recent.length = 0;
    pendingTurnCue = null;
    error = null;
    try { storage?.setItem(THEME_KEY, theme); } catch (_) { /* sandbox without storage */ }
    if (paused && current && !activeTheme().tracks.some(t => t.id === current.track?.id)) {
      clear(current);
      current = null;
    }
    if (battle && !terminal && !paused) {
      mode = 'auto';
      enqueue({ level: mood.level() || 'low', dramatic: Boolean(current && !current.audio.paused) });
    }
    notify();
  }

  function setVolume(value) {
    volume = Math.max(0, Math.min(1, value));
    if (master) master.gain.value = volume;
    try { storage?.setItem(VOLUME_KEY, String(volume)); } catch (_) { /* sandbox without storage */ }
    notify();
  }

  function sampleSpectrum(bars = 24) {
    if (!analyser || !freqBuf || !current || current.audio.paused || current.audio.ended || volume <= 0) return null;
    analyser.getByteFrequencyData(freqBuf);
    let maxVal = 0;
    for (let i = 0; i < freqBuf.length; i++) if (freqBuf[i] > maxVal) maxVal = freqBuf[i];
    if (maxVal === 0) return null;
    const out = new Array(bars);
    const maxBin = freqBuf.length - 1;
    for (let i = 0; i < bars; i++) {
      const idx = Math.min(maxBin, 1 + Math.round(Math.pow(i / Math.max(1, bars - 1), 1.5) * (maxBin - 1)));
      const tilt = 0.60 + 0.60 * (i / Math.max(1, bars - 1));
      out[i] = Math.min(1, (freqBuf[idx] / 255) * tilt);
    }
    return out;
  }

  function destroy() {
    destroyed = true;
    listeners.clear();
    stopBattle();
    for (const deck of decks) {
      deck.audio.removeEventListener('ended', deck.onEnded);
      deck.source.disconnect();
      deck.filter?.disconnect();
      deck.gain.disconnect();
    }
    master?.disconnect();
    analyser?.disconnect();
    decks = [];
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(state());
    return () => listeners.delete(fn);
  }

  return {
    startBattle, syncBattle, flushTurnCue, stopBattle, unlock, state, subscribe,
    selectTrack, nextTrack, togglePause, setVolume, setTheme, resumeAuto, sampleSpectrum, destroy,
  };
}
