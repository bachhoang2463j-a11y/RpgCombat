// ==========================================
// 战棋动态配乐导演（《光与影：33号远征队》情绪状态机 + AiRadio 跨窗联动/内置双轨 Crossfade 兜底）
// 职责：
//   1. 纯函数 evaluateBattleMood 根据战棋快照与累计战况追踪器评估 7 态战况情绪；
//   2. 升档即时响应、降档 25s + 连续 2 次防抖迟滞，避免血线震荡导致频繁切歌；
//   3. 优先通过 postMessage 桥接酒馆顶层 AiRadio；独立运行或未装电台时启用内置双 <audio> Crossfade；
//   4. L3/L4 大招与角色语音触发时提供 Sidechain Ducking 闪避包络，确保语音和打击感突出。
// ==========================================

export const BGM_MOOD_TIERS = [
  {
    moodId: 'VICTORY',
    priority: 100,
    label: '终局·凯旋',
    badge: '✦ 凯旋余韵',
    color: '#34d399',
    tracks: [
      { id: '2692439152', title: "Monoco's Station - Grandis Refuge", artist: 'Lorien Testard' },
      { id: '2692439120', title: 'Lumière - Lumière à l’Aube', artist: 'Lorien Testard' },
    ],
  },
  {
    moodId: 'DEFEAT',
    priority: 100,
    label: '终局·陨落',
    badge: '🕯 远征挽歌',
    color: '#94a3b8',
    tracks: [
      { id: '2692443194', title: 'Alicia (Music Box)', artist: 'Lorien Testard' },
      { id: '2692443192', title: 'Lumière (Music Box)', artist: 'Lorien Testard' },
    ],
  },
  {
    moodId: 'CRISIS',
    priority: 80,
    label: '绝境求生',
    badge: '🔥 绝境求生',
    color: '#f43f5e',
    tracks: [
      { id: '2692439142', title: "Une vie à t'aimer", artist: 'Lorien Testard / Alice Duport-Percier / Victor Borba' },
      { id: '2672964793', title: 'Alicia (Orchestral)', artist: 'Lorien Testard / Alice Duport-Percier' },
    ],
  },
  {
    moodId: 'CLIMAX_BOSS',
    priority: 75,
    label: '首领狂暴',
    badge: '⚔️ 首领二阶段',
    color: '#fb7185',
    tracks: [
      { id: '2692443200', title: 'Une vie à peindre', artist: 'Lorien Testard / Alice Duport-Percier / Victor Borba' },
      { id: '2692441575', title: 'Alicia', artist: 'Lorien Testard / Alice Duport-Percier' },
    ],
  },
  {
    moodId: 'BOSS_PHASE1',
    priority: 60,
    label: '强敌压境',
    badge: '👑 强敌压境',
    color: '#e5a93c',
    tracks: [
      { id: '2692441589', title: 'World Map - Taking Down the Paintress', artist: 'Lorien Testard / Alice Duport-Percier' },
      { id: '2692439129', title: 'Flying Waters - Goblu', artist: 'Lorien Testard / Alice Duport-Percier' },
    ],
  },
  {
    moodId: 'SKIRMISH',
    priority: 40,
    label: '常规交锋',
    badge: '⚡ 常规交锋',
    color: '#f59e0b',
    tracks: [
      { id: '2692441576', title: 'Lumière', artist: 'Lorien Testard / Alice Duport-Percier' },
      { id: '2692441594', title: 'Flying Waters - Rain from the Ground', artist: 'Lorien Testard' },
    ],
  },
  {
    moodId: 'TACTICAL_CALM',
    priority: 20,
    label: '战前序幕',
    badge: '🎼 幽光序幕',
    color: '#38bdf8',
    tracks: [
      { id: '2692441618', title: "Monoco's Station - Tics Tacs", artist: 'Lorien Testard / Alice Duport-Percier' },
      { id: '2692441616', title: "Monoco's Station - Maelle’s First Snow", artist: 'Lorien Testard' },
    ],
  },
];

export const BGM_TIER_MAP = Object.fromEntries(BGM_MOOD_TIERS.map(t => [t.moodId, t]));

export const EXPEDITION33_TRACK_DB = Object.fromEntries(
  BGM_MOOD_TIERS.flatMap(t => t.tracks.map(tr => [tr.title, tr.id]))
);

const DEFAULT_HYSTERESIS_MS = 25000;

function unitHpRatio(u) {
  const hp = Number(u?.hp ?? u?.ref?.hp ?? 0);
  const maxHp = Number(u?.maxHp ?? u?.ref?.maxHp ?? 0);
  if (maxHp <= 0) return 1;
  return Math.max(0, Math.min(1, hp / maxHp));
}

function isUnitAlive(u) {
  if (!u) return false;
  if (u.down || u.dead || u.removed) return false;
  return Number(u.hp ?? u.ref?.hp ?? 0) > 0;
}

/**
 * 纯函数：根据战棋快照与累计战况追踪器评估当前 7 态战况情绪。
 * @param {object} snapshot battle.snapshot()
 * @param {object} tracker { combatStarted?: boolean, bossEnraged?: boolean, hasRescuingHero?: boolean }
 */
export function evaluateBattleMood(snapshot, tracker = {}) {
  const termType = snapshot?.terminal?.type;
  if (termType === 'victory') return BGM_TIER_MAP.VICTORY;
  if (termType === 'defeat') return BGM_TIER_MAP.DEFEAT;

  const units = Array.isArray(snapshot?.units) ? snapshot.units : [];
  const heroes = units.filter(u => u.side === 'hero' && !u.isSummon);
  const aliveHeroes = heroes.filter(isUnitAlive);
  const enemies = units.filter(u => u.side === 'enemy');
  const aliveEnemies = enemies.filter(isUnitAlive);

  // T1 绝境求生：我方存活率 <= 50%（多人战有减员），或任一存活英雄 <30% HP 集火线，或处于倒地救援中
  const hasLowHero = aliveHeroes.some(h => unitHpRatio(h) < 0.3);
  const hasHeavyCasualty = heroes.length >= 2 && (aliveHeroes.length / heroes.length) <= 0.5;
  const hasDownHero = heroes.some(h => !isUnitAlive(h) && (h.rescueRemaining > 0 || h.down));
  if (hasLowHero || hasHeavyCasualty || hasDownHero || tracker.hasRescuingHero) {
    return BGM_TIER_MAP.CRISIS;
  }

  // T2 首领狂暴 / 二阶段
  const aliveBosses = aliveEnemies.filter(e => e.level === '首领');
  const bossHalfHp = aliveBosses.some(b => unitHpRatio(b) <= 0.5);
  const bossFlag = tracker.bossEnraged === true || (Array.isArray(tracker.enragedBossIds) && aliveBosses.some(b => tracker.enragedBossIds.includes(b.id)));
  if (aliveBosses.length > 0 && (bossFlag || bossHalfHp)) {
    return BGM_TIER_MAP.CLIMAX_BOSS;
  }

  // T3 强敌压境：存在存活首领，或存活精英 >= 2
  const aliveElites = aliveEnemies.filter(e => e.level === '精英');
  if (aliveBosses.length > 0 || aliveElites.length >= 2) {
    return BGM_TIER_MAP.BOSS_PHASE1;
  }

  // T4 常规交锋：已进入实质交火
  const anyDamaged = units.some(u => unitHpRatio(u) < 1);
  if (tracker.combatStarted || anyDamaged) {
    return BGM_TIER_MAP.SKIRMISH;
  }

  // T5 战前序幕
  return BGM_TIER_MAP.TACTICAL_CALM;
}

/**
 * 多源直链解析器（复用 AiRadio 三级容错链路：gdstudio -> corsproxy -> open.motues）
 * 带内存 URL 缓存与并发请求去重，支持预热下一档位曲目。
 */
export function createTrackUrlResolver({ fetchImpl, customUrls = {} } = {}) {
  const urlCache = new Map();
  const inflight = new Map();
  const doFetch = (...args) => {
    const fn = fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!fn) return Promise.reject(new Error('fetch unavailable'));
    return fn(...args);
  };

  async function tryParseUrl(res) {
    if (!res || !res.ok) return null;
    const data = await res.json();
    if (!data || !data.url) return null;
    if (data.size && data.br) {
      const estDur = data.size / ((data.br * 1000) / 8);
      if (estDur < 45 || estDur > 1500) return null;
    }
    return data.url;
  }

  async function resolveTrackUrl(track) {
    if (!track) return null;
    if (track.url) return track.url;
    if (customUrls[track.title]) return customUrls[track.title];
    const id = String(track.id || EXPEDITION33_TRACK_DB[track.title] || '');
    if (!id) return null;
    if (urlCache.has(id)) return urlCache.get(id);
    if (inflight.has(id)) return inflight.get(id);

    const job = (async () => {
      const rawUrl = `https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${encodeURIComponent(id)}&br=320`;
      const attempts = [
        () => doFetch(rawUrl),
        () => doFetch(`https://corsproxy.io/?${encodeURIComponent(rawUrl)}`),
        () => doFetch(`https://open.motues.top/music?server=netease&type=url&id=${encodeURIComponent(id)}&br=320`),
      ];
      for (const req of attempts) {
        try {
          const url = await tryParseUrl(await req());
          if (url) { urlCache.set(id, url); return url; }
        } catch (_) {}
      }
      return null;
    })().finally(() => inflight.delete(id));

    inflight.set(id, job);
    return job;
  }

  function prewarmTier(moodId) {
    const tier = BGM_TIER_MAP[moodId];
    if (!tier || !tier.tracks[0]) return;
    resolveTrackUrl(tier.tracks[0]).catch(() => {});
  }

  return { resolveTrackUrl, prewarmTier, urlCache };
}

/**
 * 创建战棋动态配乐导演实例：
 * - 双模输出：检测到顶层 AiRadio（TACTICS_BGM_PONG）时通过 postMessage 遥控；否则使用内置双 <audio> Crossfade。
 * - 防抖迟滞：升档/终局 0 延迟切歌，降档需满足 holdMs (默认 25s) 且连续 2 次评估确认。
 */
export function createBgmDirector(options = {}) {
  const nowFn = options.now || (() => Date.now());
  const holdMs = Number.isFinite(options.holdMs) ? options.holdMs : DEFAULT_HYSTERESIS_MS;
  const crossfadeMs = Number.isFinite(options.crossfadeMs) ? options.crossfadeMs : 1800;
  const resolver = options.resolver || createTrackUrlResolver({ fetchImpl: options.fetchImpl });
  const win = options.window || (typeof window !== 'undefined' ? window : null);

  let mode = 'auto'; // 'auto' | 'manual'
  let enabled = options.enabled !== false;
  let muted = false;
  let volume = Number.isFinite(options.volume) ? options.volume : 0.48;
  let duckFactor = 1;
  let bridgeConnected = false;
  let unlocked = false;
  let currentMood = BGM_TIER_MAP.TACTICAL_CALM;
  let recommendedMood = BGM_TIER_MAP.TACTICAL_CALM;
  let currentTrack = currentMood.tracks[0];
  let trackCursor = new Map();
  let lastSwitchAt = nowFn();
  let lastDowngradeCheckAt = 0;
  let lastDowngradeSerial = null;
  let downgradeStreak = 0;
  let duckUntil = 0;
  let playing = false;
  let loading = false;
  let lastError = '';
  let pendingPlay = false;
  let duckTimer = null;
  let fadeRaf = null;
  let activeDeckIdx = 0;
  const listeners = new Set();

  const decks = typeof Audio === 'function' ? [new Audio(), new Audio()] : [null, null];
  for (const d of decks) if (d) { d.loop = true; d.preload = 'auto'; d.crossOrigin = 'anonymous'; d.volume = 0; }
  const deckTargets = [0, 0];

  const notify = () => {
    const st = getState();
    for (const fn of listeners) try { fn(st); } catch (_) {}
  };
  const effectiveVolume = () => (enabled && !muted ? Math.max(0, Math.min(1, volume * duckFactor)) : 0);

  function applyDeckVolumes() {
    const cap = effectiveVolume();
    if (bridgeConnected) {
      for (const d of decks) if (d) { d.volume = 0; try { d.pause(); } catch (_) {} }
      postBridge({ action: 'volume', volume: cap, duckFactor, muted: muted || !enabled });
      return;
    }
    for (let i = 0; i < 2; i++) {
      if (decks[i]) decks[i].volume = Math.max(0, Math.min(1, deckTargets[i] * cap));
    }
  }

  function postBridge(cmd) {
    if (!win || !win.parent || win.parent === win) return false;
    try { win.parent.postMessage({ type: 'TACTICS_BGM_CMD', ...cmd }, '*'); return true; } catch (_) { return false; }
  }

  function detectBridge() {
    if (!win || !win.parent || win.parent === win) return;
    try { win.parent.postMessage({ type: 'TACTICS_BGM_PING', source: 'rpg-tactics' }, '*'); } catch (_) {}
  }

  const onWindowMsg = (ev) => {
    const data = ev && ev.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'TACTICS_BGM_PONG') {
      const wasConnected = bridgeConnected;
      bridgeConnected = true;
      if (!wasConnected) {
        applyDeckVolumes();
        if (unlocked && currentTrack && enabled && !muted) playTrack(currentTrack);
        notify();
      }
    }
  };
  if (win && typeof win.addEventListener === 'function') {
    win.addEventListener('message', onWindowMsg);
    detectBridge();
  }
    function runCrossfade(toIdx) {
    if (fadeRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(fadeRaf);
    const fromIdx = 1 - toIdx;
    const startFrom = deckTargets[fromIdx];
    const startTo = deckTargets[toIdx];
    if (crossfadeMs <= 0 || typeof requestAnimationFrame !== 'function') {
      deckTargets[fromIdx] = 0; deckTargets[toIdx] = 1;
      applyDeckVolumes();
      if (decks[fromIdx]) try { decks[fromIdx].pause(); } catch (_) {}
      return;
    }
    const t0 = nowFn();
    const step = () => {
      const p = Math.min(1, Math.max(0, (nowFn() - t0) / crossfadeMs));
      const gainIn = Math.sin((p * Math.PI) / 2);
      const gainOut = Math.cos((p * Math.PI) / 2);
      deckTargets[toIdx] = startTo + (1 - startTo) * gainIn;
      deckTargets[fromIdx] = startFrom * gainOut;
      applyDeckVolumes();
      if (p < 1) { fadeRaf = requestAnimationFrame(step); }
      else {
        fadeRaf = null;
        deckTargets[fromIdx] = 0; deckTargets[toIdx] = 1;
        applyDeckVolumes();
        if (decks[fromIdx]) try { decks[fromIdx].pause(); } catch (_) {}
      }
    };
    fadeRaf = requestAnimationFrame(step);
  }

  function prewarmNeighbors(moodId) {
    if (moodId === 'TACTICAL_CALM') { resolver.prewarmTier('SKIRMISH'); resolver.prewarmTier('BOSS_PHASE1'); }
    else if (moodId === 'SKIRMISH') { resolver.prewarmTier('BOSS_PHASE1'); resolver.prewarmTier('CRISIS'); }
    else if (moodId === 'BOSS_PHASE1') { resolver.prewarmTier('CLIMAX_BOSS'); resolver.prewarmTier('CRISIS'); }
    else if (moodId === 'CLIMAX_BOSS') { resolver.prewarmTier('CRISIS'); resolver.prewarmTier('VICTORY'); }
  }

  let playSeq = 0;
  async function playTrack(track) {
    if (!track) return false;
    currentTrack = track;
    const seq = ++playSeq;
    lastError = '';
    if (!enabled || muted) { playing = false; loading = false; notify(); return false; }

    if (bridgeConnected) {
      loading = false; playing = true;
      postBridge({ action: 'play', title: track.title, artist: track.artist, id: track.id, moodId: currentMood.moodId });
      prewarmNeighbors(currentMood.moodId);
      notify();
      return true;
    }

    if (!unlocked) { pendingPlay = true; playing = false; notify(); return false; }
    loading = true; notify();
    const url = await resolver.resolveTrackUrl(track);
    if (seq !== playSeq || !enabled || muted) { loading = false; return false; }
    loading = false;
    if (!url) { lastError = '音源解析失败'; playing = false; notify(); return false; }

    const nextIdx = decks[activeDeckIdx]?.src === url ? activeDeckIdx : 1 - activeDeckIdx;
    const nextDeck = decks[nextIdx];
    if (!nextDeck) return false;
    if (nextIdx !== activeDeckIdx) {
      deckTargets[nextIdx] = 0;
      applyDeckVolumes();
    }
    if (nextDeck.src !== url) nextDeck.src = url;
    try {
      await nextDeck.play();
      if (seq !== playSeq || !enabled || muted) { try { nextDeck.pause(); } catch (_) {} return false; }
      activeDeckIdx = nextIdx;
      playing = true; pendingPlay = false;
      runCrossfade(nextIdx);
      prewarmNeighbors(currentMood.moodId);
      notify();
      return true;
    } catch (_) {
      pendingPlay = true; playing = false;
      notify();
      return false;
    }
  }

  function pickTrackForTier(tier, advance = false) {
    const idx = trackCursor.get(tier.moodId) || 0;
    const nextIdx = advance ? (idx + 1) % tier.tracks.length : idx % tier.tracks.length;
    trackCursor.set(tier.moodId, nextIdx);
    return tier.tracks[nextIdx];
  }

  function syncBattle(snapshot, tracker = {}, { force = false } = {}) {
    const nextTier = evaluateBattleMood(snapshot, tracker);
    recommendedMood = nextTier;
    if (mode !== 'auto' && !force) {
      notify();
      return { switched: false, moodId: currentMood.moodId, recommendedMoodId: nextTier.moodId, pendingMoodId: null };
    }

    const now = nowFn();
    const isTerminal = nextTier.moodId === 'VICTORY' || nextTier.moodId === 'DEFEAT';
    if (nextTier.moodId === currentMood.moodId && !force) {
      downgradeStreak = 0;
      lastDowngradeCheckAt = 0;
      return { switched: false, moodId: currentMood.moodId, recommendedMoodId: nextTier.moodId, pendingMoodId: null };
    }

    if (force || isTerminal || nextTier.priority > currentMood.priority) {
      downgradeStreak = 0;
      lastDowngradeCheckAt = 0;
      currentMood = nextTier;
      lastSwitchAt = now;
      playTrack(pickTrackForTier(nextTier, false));
      return { switched: true, moodId: nextTier.moodId, recommendedMoodId: nextTier.moodId, pendingMoodId: null };
    }
    // 降档迟滞锁：需驻留满 holdMs 且处于不同动作轮次或至少间隔 1500ms 的连续 2 次评估才允许平稳降档
    const serial = snapshot?.actionSerial ?? null;
    const distinctSample = (serial != null && serial !== lastDowngradeSerial) || (now - lastDowngradeCheckAt >= 1500) || downgradeStreak === 0;
    if (distinctSample) {
      downgradeStreak += 1;
      lastDowngradeCheckAt = now;
      lastDowngradeSerial = serial;
    }
    if ((now - lastSwitchAt) >= holdMs && downgradeStreak >= 2) {
      downgradeStreak = 0;
      lastDowngradeCheckAt = 0;
      currentMood = nextTier;
      lastSwitchAt = now;
      playTrack(pickTrackForTier(nextTier, false));
      return { switched: true, moodId: nextTier.moodId, recommendedMoodId: nextTier.moodId, pendingMoodId: null };
    }
    notify();
    return { switched: false, moodId: currentMood.moodId, recommendedMoodId: nextTier.moodId, pendingMoodId: nextTier.moodId };
  }

  function duck(ratio = 0.35, durationMs = 1800) {
    const safeRatio = Math.max(0.1, Math.min(1, Number(ratio) || 0.35));
    const dur = Math.max(200, Number(durationMs) || 1800);
    duckFactor = Math.min(duckFactor, safeRatio);
    duckUntil = Math.max(duckUntil, nowFn() + dur);
    applyDeckVolumes();
    if (bridgeConnected) postBridge({ action: 'duck', ratio: safeRatio, durationMs: dur });
    if (duckTimer) clearTimeout(duckTimer);
    const remain = Math.max(200, duckUntil - nowFn());
    duckTimer = setTimeout(() => {
      duckTimer = null;
      duckUntil = 0;
      duckFactor = 1;
      applyDeckVolumes();
      notify();
    }, remain);
    notify();
  }

  function unlock() {
    const wasUnlocked = unlocked;
    unlocked = true;
    if (enabled && !muted && currentTrack && ((pendingPlay && !playing) || (!wasUnlocked && !playing))) {
      playTrack(currentTrack);
      return true;
    }
    if (!wasUnlocked) notify();
    return true;
  }

  function setMode(nextMode, snapshot, tracker) {
    mode = nextMode === 'manual' ? 'manual' : 'auto';
    if (mode === 'auto' && snapshot) syncBattle(snapshot, tracker, { force: true });
    else if (mode === 'auto') syncBattle({ units: [] }, {}, { force: true });
    else notify();
  }

  function selectTrack(moodId, trackIndex = 0) {
    const tier = BGM_TIER_MAP[moodId] || currentMood;
    const track = tier.tracks[trackIndex % tier.tracks.length] || tier.tracks[0];
    mode = 'manual';
    unlocked = true;
    muted = false;
    enabled = true;
    currentMood = tier;
    trackCursor.set(tier.moodId, trackIndex % tier.tracks.length);
    lastSwitchAt = nowFn();
    playTrack(track);
  }

  function nextTrack() {
    unlocked = true;
    muted = false;
    enabled = true;
    const track = pickTrackForTier(currentMood, true);
    playTrack(track);
  }

  function toggleMute() {
    unlocked = true;
    muted = !muted;
    playSeq += 1;
    loading = false;
    if (muted) {
      pendingPlay = false;
      applyDeckVolumes();
      if (!bridgeConnected) for (const d of decks) if (d) try { d.pause(); } catch (_) {}
      playing = false;
    } else if (currentTrack) {
      playTrack(currentTrack);
    }
    notify();
  }

  function setVolume(nextVol) {
    volume = Math.max(0, Math.min(1, Number(nextVol) || 0));
    if (volume > 0 && muted) muted = false;
    if (bridgeConnected) postBridge({ action: 'volume', baseVolume: volume, muted: muted || !enabled });
    applyDeckVolumes();
    notify();
  }

  function getState() {
    return {
      mode, enabled, muted, volume, duckFactor, bridgeConnected, unlocked, playing, loading, lastError,
      moodId: currentMood.moodId, moodLabel: currentMood.label, moodBadge: currentMood.badge, moodColor: currentMood.color,
      recommendedMoodId: recommendedMood.moodId, recommendedLabel: recommendedMood.label,
      track: currentTrack ? { ...currentTrack } : null,
      effectiveVolume: effectiveVolume(),
    };
  }

  function subscribe(fn) { listeners.add(fn); fn(getState()); return () => listeners.delete(fn); }
  function destroy() {
    playSeq += 1;
    if (duckTimer) clearTimeout(duckTimer);
    if (fadeRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(fadeRaf);
    if (win && typeof win.removeEventListener === 'function') win.removeEventListener('message', onWindowMsg);
    for (const d of decks) if (d) { try { d.pause(); d.src = ''; } catch (_) {} }
    listeners.clear();
  }

  return {
    syncBattle, duck, unlock, setMode, selectTrack, nextTrack, toggleMute, setVolume, getState, subscribe, destroy,
    playTrack, resolveTrackUrl: resolver.resolveTrackUrl,
  };
}

const ESC_HTML = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/**
 * 在战棋界面角落挂载《33号远征队》旋转黑胶唱片微件：
 * - 折叠态：黑胶碟片 + 战况情绪色环 + 滚动曲名 + 静音/下一首按钮
 * - 展开抽屉：切换"战况自动导演 / 手动锁频"、音量推子、6 大战况频段曲目选择
 */
export function mountBgmWidget(root, director, getBattleContext) {
  if (!root || typeof document === 'undefined' || !director) return null;
  const old = root.querySelector('#tactics-bgm-widget');
  if (old) old.remove();

  const wrap = document.createElement('div');
  wrap.id = 'tactics-bgm-widget';
  wrap.innerHTML = [
    '<div class="bgm-pill">',
      '<button type="button" class="bgm-disc-btn" title="展开/收起远征队动态配乐盘" aria-label="展开配乐盘">',
        '<span class="bgm-disc"><span class="bgm-disc-core"></span></span>',
      '</button>',
      '<div class="bgm-meta">',
        '<div class="bgm-mood-row"><span class="bgm-mood-tag"></span><span class="bgm-bridge-dot" title="播放引擎"></span></div>',
        '<div class="bgm-title-wrap"><span class="bgm-title"></span></div>',
      '</div>',
      '<div class="bgm-actions">',
        '<button type="button" class="bgm-btn" data-act="next" title="换一首同频曲目">⏭</button>',
        '<button type="button" class="bgm-btn" data-act="mute" title="静音/发声">🔊</button>',
      '</div>',
    '</div>',
    '<div class="bgm-drawer" hidden>',
      '<div class="bgm-drawer-head">',
        '<span class="bgm-drawer-brand">🎼 远征33 · 战况配乐导演</span>',
        '<button type="button" class="bgm-mode-btn" data-act="toggle-mode"></button>',
      '</div>',
      '<label class="bgm-vol-row"><span>音量</span><input type="range" class="bgm-vol-slider" min="0" max="100" step="2" /> <span class="bgm-vol-val"></span></label>',
      '<div class="bgm-tiers"></div>',
    '</div>',
  ].join('');
  root.appendChild(wrap);

  const $ = (sel) => wrap.querySelector(sel);
  const discBtn = $('.bgm-disc-btn');
  const drawer = $('.bgm-drawer');
  const tiersEl = $('.bgm-tiers');
  const volSlider = $('.bgm-vol-slider');

  const renderTiers = (st) => {
    tiersEl.innerHTML = BGM_MOOD_TIERS.map(tier => {
      const isActive = st.moodId === tier.moodId;
      const isRec = st.recommendedMoodId === tier.moodId && st.mode === 'manual';
      return '<div class="bgm-tier' + (isActive ? ' is-active' : '') + '">' +
        '<div class="bgm-tier-head"><span class="bgm-tier-dot" style="background:' + tier.color + '"></span>' +
        '<span>' + ESC_HTML(tier.label) + '</span>' +
        (isRec ? '<em class="bgm-rec-tag">当前战况推荐</em>' : '') + '</div>' +
        '<div class="bgm-tier-tracks">' + tier.tracks.map((tr, i) => {
          const on = st.track && st.track.id === tr.id;
          return '<button type="button" class="bgm-track-btn' + (on ? ' is-on' : '') + '" data-mood="' + tier.moodId + '" data-idx="' + i + '">' +
            (on ? '▶ ' : '♪ ') + ESC_HTML(tr.title) + '</button>';
        }).join('') + '</div></div>';
    }).join('');
  };

  let lastTierRenderKey = '';
  const unsub = director.subscribe((st) => {
    wrap.style.setProperty('--bgm-accent', st.moodColor || '#e5a93c');
    wrap.classList.toggle('is-playing', !!st.playing && !st.muted);
    wrap.classList.toggle('is-muted', !!st.muted);
    wrap.classList.toggle('is-ducked', st.duckFactor < 0.99);
    $('.bgm-mood-tag').textContent = (st.mode === 'manual' ? '🔒 ' : '') + st.moodBadge;
    const dot = $('.bgm-bridge-dot');
    dot.textContent = st.bridgeConnected ? '📡联动' : (st.loading ? '⏳' : '🎧内置');
    dot.title = st.bridgeConnected ? '已联动顶层 AiRadio 电台' : '内置双轨 Crossfade 引擎';
    const titleEl = $('.bgm-title');
    const titleText = st.track ? st.track.title : '点击播放 · Expedition 33';
    if (titleEl.textContent !== titleText) titleEl.textContent = titleText;
    $('[data-act="mute"]').textContent = st.muted ? '🔇' : '🔊';
    const modeBtn = $('[data-act="toggle-mode"]');
    modeBtn.textContent = st.mode === 'auto' ? '🎬 战况自动导演中' : '🔒 手动锁频 (点此恢复自动)';
    modeBtn.classList.toggle('is-auto', st.mode === 'auto');
    volSlider.value = String(Math.round((st.volume || 0) * 100));
    $('.bgm-vol-val').textContent = Math.round((st.volume || 0) * 100) + '%';
    const tierKey = [st.moodId, st.recommendedMoodId, st.mode, st.track?.id].join('|');
    if (tierKey !== lastTierRenderKey) { lastTierRenderKey = tierKey; renderTiers(st); }
  });

  discBtn.addEventListener('click', () => {
    director.unlock();
    const open = drawer.hidden;
    drawer.hidden = !open;
    wrap.classList.toggle('is-open', open);
  });
  wrap.addEventListener('click', (e) => {
    const actBtn = e.target.closest('[data-act]');
    if (actBtn) {
      const act = actBtn.dataset.act;
      if (act === 'next') director.nextTrack();
      else if (act === 'mute') director.toggleMute();
      else if (act === 'toggle-mode') {
        const ctx = typeof getBattleContext === 'function' ? getBattleContext() : {};
        director.setMode(director.getState().mode === 'auto' ? 'manual' : 'auto', ctx.snapshot, ctx.tracker);
      }
      return;
    }
    const trackBtn = e.target.closest('.bgm-track-btn');
    if (trackBtn) director.selectTrack(trackBtn.dataset.mood, Number(trackBtn.dataset.idx) || 0);
  });
  volSlider.addEventListener('input', () => director.setVolume(Number(volSlider.value) / 100));

  return { el: wrap, destroy: () => { unsub(); wrap.remove(); } };
}
