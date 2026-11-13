/* 共享音频混音器回归（CombatAudioMixer 契约）：同一 URL 预解码任务合并、热/冷主音与
   started 门闩、三轨输出与保护系数、short/special 重叠保护不提前恢复、自然尾音 >460ms
   不被清理、取消/clear/冻结/换代不晚播、默认 0.5 与显式 volume/rate 兼容、短 stop 可调用。
   约定：
   1) 全部断言走 iframe 内真实 CombatAudioMixer / playSound / playCustomAudio，不复制业务实现；
   2) 假 AudioContext / Audio / fetch 按引用安装到目标 window，结束按描述符与 Map 快照恢复，
      不做 JSON 序列化；假源如实记录 start/stop/onended 与 Gain 自动化时间；
   3) 未落地接口一律并入 pending，不误判失败；枪声采样起点元数据仅作备注，不依赖随机未定。 */
(function () {
  'use strict';
  window.runAudioMixerRegression = async function ({ w, check, eq, mock, source } = {}) {
    const ev = code => w.eval(code);
    const pending = [];
    const note = m => { if (pending.indexOf(m) < 0) pending.push(m); };
    const isFn = f => typeof f === 'function';
    const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.02;
    const isMap = x => !!x && typeof x.get === 'function' && typeof x.set === 'function' &&
      Object.prototype.toString.call(x) === '[object Map]';
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const TIMEOUT = { __timeout: true };
    const withTimeout = (p, ms) => Promise.race([Promise.resolve(p), wait(ms).then(() => TIMEOUT)]);
    // started/done 是 Promise：用 then 追踪兑现状态，禁止把 pending Promise 与 true/false 比较
    const watch = promise => {
      const st = { status: 'pending', value: undefined };
      Promise.resolve(promise).then(
        v => { st.status = 'fulfilled'; st.value = v; },
        e => { st.status = 'rejected'; st.value = e; });
      return st;
    };
    const startedNow = st => st.status === 'fulfilled' && st.value === true;
    const notStartedTrue = st => !startedNow(st);

    const mixer = w.CombatAudioMixer;
    if (!mixer) { note('待对齐:window.CombatAudioMixer 未落地'); return { pending }; }
    const NEED = ['context', 'output', 'prepare', 'play', 'protect', 'clear'];
    const missing = NEED.filter(k => !isFn(mixer[k]));
    if (missing.length) {
      missing.forEach(k => note('待对齐:CombatAudioMixer.' + k));
      return { pending };
    }
    if (!isFn(w.playSound)) note('待对齐:window.playSound');
    if (!isFn(w.playCustomAudio)) note('待对齐:window.playCustomAudio');

    /* ---------- 假音频环境：全局描述符按引用保存，结束原样恢复 ---------- */
    const GLOBALS = ['AudioContext', 'webkitAudioContext', 'Audio', 'fetch'];
    const savedDescriptors = new Map();
    for (const k of GLOBALS) savedDescriptors.set(k, Object.getOwnPropertyDescriptor(w, k));
    const restoreGlobal = (k, d) => {
      try { if (d) Object.defineProperty(w, k, d); else delete w[k]; }
      catch (e) { w[k] = d ? d.value : undefined; }
    };
    const urlObj = w.URL;
    const urlSaved = new Map();
    if (urlObj) ['createObjectURL', 'revokeObjectURL'].forEach(k => urlSaved.set(k, Object.getOwnPropertyDescriptor(urlObj, k)));

    const clock = { now: 0 };
    let paramSeq = 0;
    const allSources = [];
    const mediaCreated = [];
    const mediaNodes = [];
    const fetchCalls = [];
    const decodeCalls = [];
    const durations = new Map();
    const blobUrlToOriginal = new Map();
    const revokedBlobUrls = [];
    let blobSeq = 0;
    let autoFetch = true;
    const manualGates = new Map();
    const manualReleased = new Set();
    const realUrlOf = url => (blobUrlToOriginal.get(url) || url);

    function param(initial) {
      let value = initial;
      const p = { _calls: [] };
      Object.defineProperty(p, 'value', {
        get() { return value; },
        set(n) { value = n; p._calls.push({ seq: ++paramSeq, type: 'value', v: n, t: null }); }
      });
      const timed = (type, v, t, extra) => {
        const call = { seq: ++paramSeq, type, v, t };
        if (extra != null) call.extra = extra;
        p._calls.push(call);
        if (type === 'set') value = v;
        return p;
      };
      p.setValueAtTime = (v, t) => timed('set', v, t);
      p.linearRampToValueAtTime = (v, t) => timed('lin', v, t);
      p.exponentialRampToValueAtTime = (v, t) => timed('exp', v, t);
      p.setTargetAtTime = (v, t, c) => timed('target', v, t, c);
      p.cancelScheduledValues = t => { p._calls.push({ seq: ++paramSeq, type: 'cancel', t }); return p; };
      p.cancelAndHoldAtTime = t => { p._calls.push({ seq: ++paramSeq, type: 'cancel', t }); return p; };
      return p;
    }

    function fireDue() {
      for (const s of allSources) {
        if (s._ended || s.startedAt == null) continue;
        const rate = (s.playbackRate && s.playbackRate.value) || 1;
        const bufDur = s.buffer && typeof s.buffer.duration === 'number' ? s.buffer.duration : 0;
        const off = (s.startArgs && s.startArgs.offset) || 0;
        let endAt = s.startArgs && s.startArgs.dur != null
          ? s.startedAt + s.startArgs.dur / rate
          : s.startedAt + Math.max(0, (bufDur - off) / rate);
        if (s.stopAt != null) endAt = Math.min(endAt, s.stopAt);
        s.endAt = endAt;
        if (clock.now >= endAt) {
          s._ended = true;
          if (typeof s.onended === 'function') { try { s.onended(); } catch (e) {} }
        }
      }
    }
    const advance = sec => { clock.now = Math.round((clock.now + sec) * 1e6) / 1e6; fireDue(); };
    // 一次 flush = 前半微任务 → 一次真实 0ms timer → 后半微任务；不串 n 个真实 timer（IAB 后台 0ms 可能变 1s）
    const flush = async (n = 6) => {
      for (let i = 0; i < n; i++) await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 0));
      for (let i = 0; i < n; i++) await Promise.resolve();
    };

    class FakeGain {
      constructor() { this.gain = param(1); this.connections = []; this._disconnected = false; }
      connect(n) { this.connections.push(n); return n; }
      disconnect() { this._disconnected = true; }
    }
    class FakeSource {
      constructor() {
        this.buffer = null; this.playbackRate = param(1);
        this.connections = []; this.startedAt = null; this.startArgs = null;
        this.stopAt = null; this.onended = null; this._ended = false;
        this._disconnected = false;
      }
      connect(n) { this.connections.push(n); return n; }
      disconnect() { this._disconnected = true; }
      start(when, offset, dur) {
        if (this.startedAt != null || this._ended) return;
        this.startedAt = typeof when === 'number' ? when : clock.now;
        this.startArgs = { when: this.startedAt, offset: offset || 0, dur: dur == null ? null : dur };
        fireDue();
      }
      stop(when) { this.stopAt = typeof when === 'number' ? when : clock.now; fireDue(); }
    }
    const makeBuffer = url => ({ duration: durations.get(url) || 0.9, sampleRate: 44100, __url: url });
    // 响应体携带原 URL：blob URL 只作传输外壳，解码出的 AudioBuffer 仍归属原 URL
    const fakeResponse = url => ({ ok: true, status: 200, __url: url,
      arrayBuffer: () => Promise.resolve({ __url: url }),
      blob: () => Promise.resolve({ __url: url }) });
    function fakeFetch(url) {
      const real = realUrlOf(url);
      fetchCalls.push(url);
      if (autoFetch || manualReleased.has(real)) return Promise.resolve(fakeResponse(real));
      return new Promise(resolve => {
        const arr = manualGates.get(real) || [];
        arr.push(resolve);
        manualGates.set(real, arr);
      }).then(() => fakeResponse(real));
    }
    const releaseFetch = url => {
      manualReleased.add(url);
      const arr = manualGates.get(url) || [];
      manualGates.delete(url);
      arr.forEach(r => r());
    };

    class FakeContext {
      constructor() {
        this._clock = clock; this.state = 'suspended';
        this.destination = { kind: 'destination', connections: [] };
        this._gains = []; this._sources = []; this._closes = 0; this._resumes = 0;
        this._listeners = new Map();
        this.onstatechange = null;
        this.resumeGate = null; this.decodeGate = null;
      }
      get currentTime() { return this._clock.now; }
      addEventListener(type, fn) {
        const arr = this._listeners.get(type) || [];
        arr.push(fn); this._listeners.set(type, arr);
      }
      removeEventListener(type, fn) {
        const arr = this._listeners.get(type) || [];
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      }
      _emit(type) {
        const evt = { type, target: this };
        if (typeof this.onstatechange === 'function' && type === 'statechange') this.onstatechange(evt);
        (this._listeners.get(type) || []).slice().forEach(fn => { try { fn(evt); } catch (e) {} });
      }
      _setState(next) {
        this.state = next;
        this._emit('statechange');
      }
      createGain() { const g = new FakeGain(); this._gains.push(g); return g; }
      createBufferSource() {
        const s = new FakeSource();
        this._sources.push(s); allSources.push(s); return s;
      }
      createStereoPanner() {
        return { pan: param(0), connections: [],
          connect(n) { this.connections.push(n); return n; }, disconnect() { this._disconnected = true; } };
      }
      createMediaElementSource(media) {
        const node = { _media: media, connections: [],
          connect(n) { this.connections.push(n); return n; }, disconnect() { this._disconnected = true; } };
        mediaNodes.push(node);
        return node;
      }
      decodeAudioData(data) {
        const url = data && data.__url;
        decodeCalls.push(url);
        const buffer = makeBuffer(url);
        if (this.decodeGate) return this.decodeGate.promise.then(() => buffer);
        return Promise.resolve(buffer);
      }
      resume() {
        this._resumes++;
        if (this.resumeGate) return this.resumeGate.promise.then(() => { this._setState('running'); return undefined; });
        this._setState('running');
        return Promise.resolve();
      }
      suspend() { this._setState('suspended'); return Promise.resolve(); }
      close() { this._setState('closed'); this._closes++; return Promise.resolve(); }
    }
    class FakeAudio {
      constructor(src) {
        this.src = src || ''; this.volume = 1; this.playbackRate = 1;
        this.currentTime = 0; this.paused = true; this.ended = false; this.preload = '';
        this.played = 0; this.readyState = 0;
        this.duration = durations.get(realUrlOf(this.src)) || 0.5;
        this.onplaying = this.onended = this.onerror = this.onloadedmetadata = null;
        this.oncanplay = this.ondurationchange = null;
        this._listeners = new Map();
        this._metaTimer = null; this._endTimer = null;
        mediaCreated.push(this);
      }
      addEventListener(type, fn) {
        const arr = this._listeners.get(type) || [];
        arr.push(fn); this._listeners.set(type, arr);
      }
      removeEventListener(type, fn) {
        const arr = this._listeners.get(type) || [];
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      }
      _emit(type) {
        const evt = { type, target: this };
        const handler = this['on' + type];
        if (typeof handler === 'function') { try { handler.call(this, evt); } catch (e) {} }
        (this._listeners.get(type) || []).slice().forEach(fn => { try { fn.call(this, evt); } catch (e) {} });
      }
      play() {
        this.played++; this.paused = false; this.ended = false;
        if (this._metaTimer != null) clearTimeout(this._metaTimer);
        if (this._endTimer != null) clearTimeout(this._endTimer);
        this._metaTimer = setTimeout(() => {
          if (this.paused) return;
          this.duration = durations.get(realUrlOf(this.src)) || 0.5;
          this.readyState = 4;
          if (typeof this.onloadedmetadata === 'function' || this._listeners.has('loadedmetadata')) this._emit('loadedmetadata');
          this._emit('durationchange');
          if (this.paused) return;
          this._emit('playing');
          this._emit('canplay');
          this._endTimer = setTimeout(() => {
            if (this.paused || this.ended) return;
            this.ended = true; this.paused = true; this.currentTime = this.duration;
            this._emit('ended');
          }, Math.max(0, (this.duration || 0.5) * 1000));
        }, 0);
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
        if (this._endTimer != null) { clearTimeout(this._endTimer); this._endTimer = null; }
      }
      cloneNode() {
        const c = new FakeAudio(this.src);
        c.volume = this.volume; c.playbackRate = this.playbackRate;
        return c;
      }
      load() {
        if (this._metaTimer != null) clearTimeout(this._metaTimer);
        if (this._endTimer != null) clearTimeout(this._endTimer);
        this.paused = true; this.ended = false; this.currentTime = 0; this.readyState = 0;
      }
      removeAttribute(name) {
        if (name === 'src') { this.src = ''; this.readyState = 0; }
      }
      setAttribute(name, value) { if (name === 'src') this.src = value; }
    }

    const stateSaved = {
      frozen: ev('typeof _pipelineFrozen !== "undefined" ? _pipelineFrozen : undefined'),
      token: ev('typeof combatToken !== "undefined" ? combatToken : undefined')
    };
    const mapsSaved = [];
    if (isMap(mixer.buffers)) mapsSaved.push([mixer.buffers, new Map(mixer.buffers)]);
    if (isMap(mixer.decodes)) mapsSaved.push([mixer.decodes, new Map(mixer.decodes)]);
    let fxBlobCache = null;
    try { fxBlobCache = ev('typeof _fxAudioBlobCache === "object" ? _fxAudioBlobCache : null'); } catch (e) { fxBlobCache = null; }
    if (isMap(fxBlobCache)) mapsSaved.push([fxBlobCache, new Map(fxBlobCache)]);

    const fakeCreateObjectURL = blob => {
      const real = blob && blob.__url ? blob.__url : '';
      const fakeUrl = 'blob:amx-mixer-' + (++blobSeq);
      blobUrlToOriginal.set(fakeUrl, real);
      return fakeUrl;
    };
    const fakeRevokeObjectURL = url => { revokedBlobUrls.push(url); };

    w.AudioContext = FakeContext;
    w.webkitAudioContext = FakeContext;
    w.Audio = FakeAudio;
    w.fetch = fakeFetch;
    if (urlObj) {
      urlObj.createObjectURL = fakeCreateObjectURL;
      urlObj.revokeObjectURL = fakeRevokeObjectURL;
    }
    try { mixer.clear(); } catch (e) {}
    await flush(4);

    /* 注入探针：context() 必须从 window.AudioContext 懒创建，否则全部断言无意义 */
    let probeCtx = null;
    try { probeCtx = mixer.context(); } catch (e) { probeCtx = null; }
    const injected = !!(probeCtx && probeCtx._clock === clock);
    if (!injected) note('待对齐:CombatAudioMixer.context 未按 window.AudioContext 懒创建，测试环境无法注入');

    /* ---------- 证据工具 ---------- */
    const outs = () => ({ skill: mixer.output('skill'), result: mixer.output('result'), aux: mixer.output('aux') });
    const reaches = (from, target) => {
      const seen = new Set(), queue = [from];
      while (queue.length) {
        const n = queue.shift();
        if (!n || seen.has(n)) continue;
        seen.add(n);
        if (n === target) return true;
        (n.connections || []).forEach(x => queue.push(x));
      }
      return false;
    };
    const sourceFor = url => allSources.filter(s => s.startedAt != null && s.buffer && s.buffer.__url === url).pop() || null;
    const chainGains = node => {
      const seen = new Set(), gains = [], queue = [node];
      while (queue.length) {
        const n = queue.shift();
        if (!n || seen.has(n)) continue;
        seen.add(n);
        if (n.gain && n.gain._calls) gains.push(n);
        (n.connections || []).forEach(x => queue.push(x));
      }
      return gains;
    };
    const callsFrom = (node, seq0) => {
      const out = [];
      chainGains(node).forEach(g => g.gain._calls.forEach(c => { if (c.seq > seq0) out.push(c); }));
      return out;
    };
    const trackCalls = (gain, seq0) => (gain && gain.gain ? gain.gain._calls.filter(c => c.seq > seq0) : []);
    const hasVal = (calls, v) => calls.some(c => near(c.v, v));
    const mediaNodeFor = media => mediaNodes.filter(n => n._media === media).pop() || null;
    const mediaGainCalls = (media, seq0) => {
      const node = mediaNodeFor(media);
      return node ? callsFrom(node, seq0) : [];
    };
    // 预置解码缓存，让 playSound/playCustomAudio 走热缓冲器路径，直接查 Gain 音量
    const prefill = async url => {
      durations.set(url, 0.5);
      if (isMap(mixer.buffers)) { mixer.buffers.set(url, makeBuffer(url)); return; }
      try { if (isMap(fxBlobCache)) fxBlobCache.delete(url); } catch (e) {}
      await mixer.prepare(url);
    };

    const stops = [];
    const group = async (name, fn) => {
      try { await fn(); } catch (e) { check(false, name + '执行异常', String(e && e.stack || e)); }
    };

    try {
      if (injected) {
      /* ========== 组一：context 懒创建 / 三轨输出 ========== */
      await group('context 与三轨输出', async () => {
        const ctx = mixer.context();
        check(!!ctx && typeof ctx.createGain === 'function', 'context() 返回 AudioContext 实例');
        check(mixer.context() === ctx, 'context() 复用共享实例');
        const o = outs();
        check(!!o.skill && !!o.result && !!o.aux, 'output 返回 skill/result/aux 三轨 GainNode');
        check(o.skill !== o.result && o.result !== o.aux && o.skill !== o.aux, '三轨 GainNode 互不相同');
        check(mixer.output('skill') === o.skill && mixer.output('result') === o.result, '同轨重复取用返回同一 GainNode');
      });

      /* ========== 组二：prepare 同 URL 任务合并 ========== */
      await group('prepare 解码合并与缓存', async () => {
        autoFetch = false;
        const u = 'amx-test/dedupe-1.mp3';
        durations.set(u, 0.8);
        const p1 = mixer.prepare(u), p2 = mixer.prepare(u);
        await flush(8);
        eq(fetchCalls.filter(x => x === u).length, 1, '原 URL 并发 prepare 只下载一次');
        releaseFetch(u);
        const pair = await Promise.all([p1, p2]);
        autoFetch = true;
        const b1 = pair[0], b2 = pair[1];
        const blobUrls = () => [...blobUrlToOriginal.entries()].filter(e => e[1] === u).map(e => e[0]);
        eq(blobUrls().length, 1, '复用 Blob 下载：同一 URL 只创建一次 Blob URL');
        eq(fetchCalls.filter(x => blobUrls().indexOf(x) >= 0).length, 1, 'Blob URL 只 fetch 一次');
        check(!!b1 && b1 === b2, '并发 prepare 共享同一 AudioBuffer 引用');
        check(!!b1 && b1.__url === u, 'Blob 传输后 AudioBuffer 仍归属原 URL');
        eq(decodeCalls.filter(x => x === u).length, 1, '同一 URL 只解码一次');
        const b3 = await mixer.prepare(u);
        check(b3 === b1, '缓存命中复用已解码 AudioBuffer');
        eq(fetchCalls.filter(x => x === u).length, 1, '缓存命中不再下载原 URL');
        eq(blobUrls().length, 1, '缓存命中不再新建 Blob URL');
        if (isMap(mixer.buffers) && isMap(mixer.decodes)) {
          check([...mixer.buffers.values()].some(v => v === b1), 'buffers Map 以 URL 缓存解码结果（可按引用保存恢复）');
          check(!mixer.decodes.has(u), '解码完成后 decodes 任务表清理');
        } else {
          note('待对齐:CombatAudioMixer.buffers/decodes 未暴露（保存恢复需要 Map）');
        }
      });

      /* ========== 组三：热/冷主音、started 门闩、轨道接入 ========== */
      await group('热/冷主音与起音门闩', async () => {
        const uHot = 'amx-test/hot.mp3';
        durations.set(uHot, 1.2);
        await mixer.prepare(uHot);
        const cue = mixer.play(uHot, { track: 'skill', sync: true, vol: 0.5, rate: 1 });
        stops.push(cue);
        check(isFn(cue), 'play 返回可调用停止函数 cue');
        check('ready' in cue && 'started' in cue && 'done' in cue, 'cue 暴露 ready/started/done');
        const cueStarted = watch(cue.started);
        await flush(6);
        const src = sourceFor(uHot);
        check(!!src, '热主音解码就绪后创建并启动 BufferSource');
        check(startedNow(cueStarted), '热主音起音后 started 兑现 true', cueStarted.status + ':' + cueStarted.value);
        eq(cue.track, 'skill', 'cue.track 透出轨道');
        check(typeof cue.when === 'number' && cue.when >= 0, 'cue.when 为 AudioContext 起音秒数');
        check(!!src && reaches(src, outs().skill), '主音源接入 skill 轨道输出 GainNode');
        try { cue(); } catch (e) { check(false, 'cue 停止函数调用不抛错', String(e)); }
        check(!!src && src.stopAt != null, '停止函数真实停止热主音');

        // 冷主音：decode 受门闩控制，就绪前不得起音
        const uCold = 'amx-test/cold.mp3';
        durations.set(uCold, 0.6);
        const ctx = mixer.context();
        let releaseDecode;
        ctx.decodeGate = { promise: new Promise(r => { releaseDecode = r; }) };
        const cue2 = mixer.play(uCold, { track: 'result', sync: true, vol: 0.4 });
        stops.push(cue2);
        const coldStarted = watch(cue2.started);
        await flush(8);
        check(coldStarted.status === 'pending', '冷主音解码未就绪时 started 保持 pending', coldStarted.status);
        check(!sourceFor(uCold), '同步主音解码就绪前不 source.start');
        releaseDecode();
        await flush(10);
        ctx.decodeGate = null;
        check(startedNow(coldStarted), '冷主音解码就绪后 started 兑现 true', coldStarted.status + ':' + coldStarted.value);
        const coldSrc = sourceFor(uCold);
        check(!!coldSrc && reaches(coldSrc, outs().result), '冷主音接入 result 轨道');
        if (coldSrc) { try { coldSrc.stop(clock.now); } catch (e) {} }

        // context resume 属于起音等待
        const ctxR = mixer.context();
        ctxR.state = 'suspended';
        let releaseResume;
        ctxR.resumeGate = { promise: new Promise(r => { releaseResume = r; }) };
        const resumes0 = ctxR._resumes;
        const cue3 = mixer.play(uHot, { track: 'aux', sync: true });
        stops.push(cue3);
        const resumeStarted = watch(cue3.started);
        await flush(8);
        check(ctxR._resumes > resumes0, '起音前等待 context.resume');
        check(resumeStarted.status === 'pending', 'resume 未完成前 started 保持 pending', resumeStarted.status);
        releaseResume();
        await flush(10);
        ctxR.resumeGate = null;
        check(startedNow(resumeStarted), 'resume 完成后 started 兑现 true', resumeStarted.status + ':' + resumeStarted.value);
      });

      /* ========== 组四：未来拍点 started 不提前 ========== */
      await group('未来 when 拍点门闩', async () => {
        const ctx = mixer.context();
        const target = ctx.currentTime + 0.1;
        const cue = mixer.play('amx-test/hot.mp3', { track: 'aux', sync: true, when: target });
        stops.push(cue);
        const whenStarted = watch(cue.started);
        await flush(8);
        check(whenStarted.status === 'pending', 'when 为未来拍点时起音前 started 保持 pending', whenStarted.status);
        // currentTime 不随真实时间推进：先推进假时钟，再给真实 0ms/短定时器补一次机会
        advance(0.25);
        await flush(10);
        if (!startedNow(whenStarted)) { await wait(150); await flush(6); }
        check(startedNow(whenStarted), '到达 when 拍点后 started 兑现 true', whenStarted.status + ':' + whenStarted.value);
        check(typeof cue.when === 'number' && cue.when >= target - 0.001, 'cue.when 记录实际起音拍点');
      });

      /* ========== 组五：保护系数与重叠不提前恢复 ========== */
      await group('保护系数与重叠保护', async () => {
        const o = outs();
        const t0 = clock.now;
        let seq0 = paramSeq;
        mixer.protect('short', t0);
        const shortRes = trackCalls(o.result, seq0);
        const shortAux = trackCalls(o.aux, seq0);
        const shortSkill = trackCalls(o.skill, seq0);
        check(hasVal(shortRes, 0.40), 'short 保护将 result 压到 0.40');
        check(hasVal(shortAux, 0.30), 'short 保护将 aux 压到 0.30');
        check(shortSkill.length === 0, 'short 保护不触碰 skill 轨');
        // 只认朝 1 的恢复自动调度（lin/exp/target）；初始 set(1,t0) 不是恢复
        const isRecovery = c => (c.type === 'lin' || c.type === 'exp' || c.type === 'target') && near(c.v, 1) && c.t != null;
        const shortRec = shortRes.filter(isRecovery);
        if (shortRec.length) check(Math.min(...shortRec.map(c => c.t)) >= t0 + 0.18 - 1e-6, 'short 保护恢复不早于 180ms hold',
          '恢复于 ' + Math.min(...shortRec.map(c => c.t)));
        else note('待对齐:short 保护未用 Gain 自动调度恢复（缺少可记录时间）');

        advance(0.6);
        o.result.gain.value = 1; o.aux.gain.value = 1; o.skill.gain.value = 1;
        const t1 = clock.now;
        seq0 = paramSeq;
        mixer.protect('special', t1);
        const spRes = trackCalls(o.result, seq0);
        const spAux = trackCalls(o.aux, seq0);
        check(hasVal(spRes, 0.25), 'special 保护将 result 压到 0.25');
        check(hasVal(spAux, 0.20), 'special 保护将 aux 压到 0.20');
        const spRec = spRes.filter(isRecovery);
        if (spRec.length) check(Math.min(...spRec.map(c => c.t)) >= t1 + 0.45 - 1e-6, 'special 保护恢复不早于 450ms hold',
          '恢复于 ' + Math.min(...spRec.map(c => c.t)));
        else note('待对齐:special 保护未用 Gain 自动调度恢复（缺少可记录时间）');

        // 后来的短保护不得抢先在强保护结束前恢复
        seq0 = paramSeq;
        mixer.protect('short', t1 + 0.05);
        const overlapRec = trackCalls(o.result, seq0).filter(isRecovery);
        const early = overlapRec.filter(c => c.t < t1 + 0.45 - 1e-6);
        check(early.length === 0, '后来的 short 保护未提前取消仍在的 special 保护',
          early.length ? '提前恢复于 ' + early[0].t : '');
      });

      /* ========== 组六：自然尾音 >460ms 不被清理 ========== */
      await group('自然尾音不被截断', async () => {
        const u = 'amx-test/tail.mp3';
        durations.set(u, 0.9);
        await mixer.prepare(u);
        const cue = mixer.play(u, { track: 'skill', vol: 0.5 });
        stops.push(cue);
        await flush(6);
        const src = sourceFor(u);
        check(!!src, '长尾采样创建 BufferSource');
        advance(0.5);
        await flush(2);
        check(!!src && !src._ended, '0.5s 时自然尾音仍未被 ended');
        check(!!src && (src.stopAt == null || src.stopAt >= 0.9), '尾音停止计划不早于自然时长 0.9s',
          src && src.stopAt != null ? String(src.stopAt) : '无显式 stop');
        advance(0.5);
        await flush(4);
        check(!!src && src._ended, '自然时长到达后由 onended 收口');
        eq(await withTimeout(cue.done, 400), true, '自然结束 done=true');
      });

      /* ========== 组七：取消 / clear / 冻结 / 换代不晚播 ========== */
      await group('取消与生命周期', async () => {
        const u = 'amx-test/cancel.mp3';
        durations.set(u, 0.7);
        const ctx = mixer.context();
        let release;
        ctx.decodeGate = { promise: new Promise(r => { release = r; }) };
        const cue = mixer.play(u, { track: 'result', sync: true });
        stops.push(cue);
        const cancelStarted = watch(cue.started);
        await flush(6);
        cue();
        release();
        await flush(10);
        ctx.decodeGate = null;
        check(!sourceFor(u), '停止 cue 后解码完成不晚播');
        check(notStartedTrue(cancelStarted), '取消后 started 未兑现 true', cancelStarted.status + ':' + cancelStarted.value);
        eq(await withTimeout(cue.done, 300), false, '取消后 done=false');

        // clear：停止活动声音、关闭 context
        const u2 = 'amx-test/clear.mp3';
        durations.set(u2, 1.0);
        await mixer.prepare(u2);
        const cue2 = mixer.play(u2, { track: 'skill', sync: true });
        stops.push(cue2);
        await flush(6);
        const ctxBefore = mixer.context();
        const active = sourceFor(u2);
        mixer.clear();
        await flush(6);
        check(ctxBefore._closes > 0 || ctxBefore.state === 'closed', 'clear 关闭共享 AudioContext');
        check(!!active && (active._ended || active.stopAt != null), 'clear 停止活动声音');

        // 冻结：不起播
        const u3 = 'amx-test/frozen.mp3';
        durations.set(u3, 0.5);
        await mixer.prepare(u3);
        ev('_pipelineFrozen = true');
        const cue3 = mixer.play(u3, { track: 'skill', sync: true });
        stops.push(cue3);
        await flush(8);
        check(!sourceFor(u3), '_pipelineFrozen 时不起播');
        ev('_pipelineFrozen = false');

        // 换代：combatToken 是对象；保存原引用，切到新对象后待起播任务不得晚播
        const u4 = 'amx-test/token.mp3';
        durations.set(u4, 0.5);
        const ctxT = mixer.context();
        let releaseT;
        ctxT.decodeGate = { promise: new Promise(r => { releaseT = r; }) };
        w.__amxSavedToken = stateSaved.token;
        try {
          const cue4 = mixer.play(u4, { track: 'skill', sync: true });
          stops.push(cue4);
          const tokenStarted = watch(cue4.started);
          await flush(6);
          ev('combatToken = {}');
          releaseT();
          await flush(10);
          check(!sourceFor(u4), 'combatToken 换代后待起播任务不晚播');
          check(notStartedTrue(tokenStarted), '换代后 started 未兑现 true', tokenStarted.status + ':' + tokenStarted.value);
        } finally {
          try { releaseT(); } catch (e) {}
          ctxT.decodeGate = null;
          ev('combatToken = window.__amxSavedToken');
        }
      });

      /* ========== 组八：owner 生命周期（finished 不自然停、cancel 才停） ========== */
      await group('owner 生命周期', async () => {
        const url = 'amx-test/owner-900.mp3';
        durations.set(url, 0.9);
        await prefill(url);
        durations.set(url, 0.9); mixer.buffers.set(url, makeBuffer(url));
        const cleans = [];
        const owner = {
          cancelled: false, finished: false, audioStoppers: new Set(),
          handle: { cancel() { owner.cancelled = true; cleans.slice().forEach(fn => fn()); } },
          onClean(fn) { cleans.push(fn); return fn; },
          retain() {}
        };
        const cue = mixer.play(url, { track: 'skill', sync: true, owner });
        stops.push(cue);
        const ownerStarted = watch(cue.started);
        await flush(10);
        const src = sourceFor(url);
        check(startedNow(ownerStarted) && !!src, 'owner 主音真实起音', ownerStarted.status + ':' + ownerStarted.value);
        check(cleans.length > 0, 'owner.onClean 已注册清理回调', String(cleans.length));
        // 自然结束路径：finished=true 后执行 onClean，不得停止仍在播放的自然尾音
        owner.finished = true;
        cleans.slice().forEach(fn => fn());
        await flush(6);
        advance(0.5);
        await flush(4);
        check(!!src && !src._ended, 'owner.finished 自然收尾后 500ms 仍有声');
        check(!!src && (src.stopAt == null || src.stopAt >= src.startedAt + 0.85), 'owner.finished 未安排提前停尾音',
          src && src.stopAt != null ? String(src.stopAt) : '无显式 stop');
        // cancel 才停止
        let cueErr = null;
        try { cue(); } catch (e) { cueErr = e; }
        await flush(6);
        check(!cueErr, 'cancel 调用不抛错', String(cueErr || ''));
        check(!!src && (src._ended || src.stopAt != null), 'cancel 后才停止 owner 余音');
      });

      /* ========== 组九：主轨多声部独立 + 远程重击 helper 的 0.06s 拍点 ========== */
      await group('主轨多声部与远程重击拍点', async () => {
        const urls = ev('typeof audioUrls === "object" ? audioUrls : null');
        const keys = ['gunshot1', 'gunshot2', 'gunshot3'];
        if (!urls || keys.some(k => !urls[k])) { note('待对齐:audioUrls 缺少 gunshot1~3'); return; }
        for (const k of keys) await prefill(urls[k]);
        const cues = keys.map(k => {
          const c = mixer.play(urls[k], { track: 'skill', sync: true });
          stops.push(c);
          return c;
        });
        await flush(10);
        const shots = keys.map(k => sourceFor(urls[k]));
        check(shots.every(Boolean), '三条枪声各自创建独立 BufferSource');
        check(new Set(shots.filter(Boolean)).size === 3, '三条枪声 source 互不相同');
        check(shots.every(s => s && !s._ended), '三条枪声可同时存活');
        const stopBefore = shots.map(s => (s ? s.stopAt : null));
        // result 轨道播放不得停掉主轨枪声
        const uRes = 'amx-test/result-track.mp3';
        durations.set(uRes, 0.5);
        await prefill(uRes);
        const resCue = mixer.play(uRes, { track: 'result', sync: true });
        stops.push(resCue);
        await flush(8);
        check(shots.every((s, i) => s && !s._ended && s.stopAt === stopBefore[i]), 'result 播放不停止主轨枪声');

        // 远程重击 helper：真实函数调用，hitDown 相对主音晚 0.06s 起音
        const helper = w.playHeavyImpactAudio;
        if (!isFn(helper)) { note('待对齐:playHeavyImpactAudio 未暴露，无法验证 0.06 拍点'); return; }
        const shotUrl = ev('typeof POWER_COUNTER_SOUND_URL === "string" ? POWER_COUNTER_SOUND_URL : null');
        const hitUrl = ev('typeof RANGED_HEAVY_HITDOWN_URL === "string" ? RANGED_HEAVY_HITDOWN_URL : null');
        if (!shotUrl || !hitUrl) { note('待对齐:远程重击音频 URL 常量不可访问'); return; }
        await prefill(shotUrl);
        await prefill(hitUrl);
        let bassWhen = null;
        const ran = await withTimeout(helper(shotUrl, 60, when => { bassWhen = when; }), 900);
        check(ran !== TIMEOUT, '真实 playHeavyImpactAudio 正常完成');
        const shotSrc = sourceFor(shotUrl), hitSrc = sourceFor(hitUrl);
        check(!!shotSrc && !!hitSrc, '远程重击主音与 hitDown 均起音');
        if (shotSrc && hitSrc) {
          const gap = hitSrc.startArgs.when - shotSrc.startArgs.when;
          check(near(gap, 0.06), 'hitDown source.when 相对主音晚 0.06s', '实际 ' + gap);
          check(bassWhen == null || near(bassWhen, shotSrc.startArgs.when), 'subBass 回调使用主音 when');
        }
        if (cues.length !== 3) check(false, '主轨枪声 cue 数量异常');
      });

      /* ========== 组十：playSound / playCustomAudio 默认音量与 rate 兼容 ========== */
      await group('playSound/playCustomAudio 兼容', async () => {
        const urls = ev('typeof audioUrls === "object" ? audioUrls : null');
        const key = 'gunshot1';
        const url = urls && urls[key];
        if (!url) { note('待对齐:audioUrls.gunshot1 不存在，无法验证默认音量'); return; }
        await prefill(url);

        const probe = call => {
          const seq0 = paramSeq, m0 = mediaCreated.length;
          let stop = null;
          try { stop = call(); } catch (e) { check(false, '播放调用不抛错', String(e)); }
          if (isFn(stop)) stops.push(stop);
          return { seq0, m0, stop };
        };
        const volOk = (seq0, src, media, expected) => {
          const calls = src ? callsFrom(src, seq0) : media ? mediaGainCalls(media, seq0) : [];
          if (calls.length) return hasVal(calls, expected);
          if (media) return near(media.volume, expected);
          return null;
        };

        // 冷非 sync：应走 HTMLAudio 快速回退，且仍可停止、音量有效
        const uCold = 'amx-test/media-fallback.mp3';
        durations.set(uCold, 0.2);
        const m0 = mediaCreated.length, c0 = paramSeq;
        const cueCold = mixer.play(uCold, { track: 'result', sync: false, vol: 0.5 });
        stops.push(cueCold);
        await flush(8);
        const coldMedia = mediaCreated.slice(m0).pop() || null;
        if (coldMedia) {
          check(coldMedia.played > 0, '冷非 sync 播放走 HTMLAudio 回退并真正 play');
          check(volOk(c0, sourceFor(uCold), coldMedia, 0.5) === true, '冷回退有效音量 0.5');
          check(cueCold.track === 'result', '冷回退 cue.track 透出轨道');
        } else if (sourceFor(uCold)) {
          check(true, '冷非 sync 由播放器预热缓冲后起音');
        } else {
          note('待对齐:冷非 sync 既无 HTMLAudio 回退也无缓冲起音');
        }

        let p = probe(() => w.playSound(key));
        await flush(8);
        let src = sourceFor(url);
        let media = mediaCreated.slice(p.m0).pop();
        const okDefault = volOk(p.seq0, src, media, 0.5);
        if (okDefault === null) note('待对齐:playSound 未进入共享混音器或 HTMLAudio 回退，无法验证默认 0.5');
        else check(okDefault, 'playSound 默认有效音量 0.5');
        check(isFn(p.stop), 'playSound 返回可调用停止函数');

        p = probe(() => w.playSound(key, 0.8));
        await flush(8);
        src = sourceFor(url);
        media = mediaCreated.slice(p.m0).pop();
        const okExplicit = volOk(p.seq0, src, media, 0.8);
        if (okExplicit === null) note('待对齐:playSound 显式 volume 未产生可验证播放证据');
        else check(okExplicit, 'playSound 显式 volume 保留 0.8');

        p = probe(() => w.playSound(key, 0.8, 1.5));
        await flush(8);
        src = sourceFor(url);
        media = mediaCreated.slice(p.m0).pop();
        if (src) check(near(src.playbackRate.value, 1.5), 'playSound rate=1.5 传入音源');
        else if (media) check(near(media.playbackRate, 1.5), 'playSound rate=1.5 传入媒体元素', String(media.playbackRate));
        else note('待对齐:playSound rate 未产生可验证播放证据');

        const u2 = 'amx-test/custom.mp3';
        await prefill(u2);
        p = probe(() => w.playCustomAudio(u2));
        await flush(8);
        src = sourceFor(u2);
        media = mediaCreated.slice(p.m0).pop();
        const okCustom = volOk(p.seq0, src, media, 0.5);
        if (okCustom === null) note('待对齐:playCustomAudio 默认音量无可验证播放证据');
        else check(okCustom, 'playCustomAudio 默认有效音量 0.5');

        p = probe(() => w.playCustomAudio(u2, 0.7, 1.25));
        await flush(8);
        src = sourceFor(u2);
        media = mediaCreated.slice(p.m0).pop();
        const okCustomExplicit = volOk(p.seq0, src, media, 0.7);
        if (okCustomExplicit === null) note('待对齐:playCustomAudio 显式 volume/rate 无可验证播放证据');
        else check(okCustomExplicit, 'playCustomAudio 显式 volume 保留 0.7');
        if (src) check(near(src.playbackRate.value, 1.25), 'playCustomAudio rate=1.25 传入音源');
        else if (media) check(near(media.playbackRate, 1.25), 'playCustomAudio rate=1.25 传入媒体元素', String(media.playbackRate));
        else note('待对齐:playCustomAudio rate 未产生可验证播放证据');
      });
      }
    } finally {
      for (const stop of stops) { try { if (isFn(stop)) stop(); } catch (e) {} }
      try { mixer.clear(); } catch (e) {}
      for (const pair of mapsSaved) {
        const map = pair[0], snap = pair[1];
        try { map.clear(); snap.forEach((v, k) => map.set(k, v)); } catch (e) {}
      }
      GLOBALS.forEach(k => restoreGlobal(k, savedDescriptors.get(k)));
      if (w.URL) urlSaved.forEach((d, k) => {
        try { if (d) Object.defineProperty(w.URL, k, d); else delete w.URL[k]; }
        catch (e) { w.URL[k] = d ? d.value : undefined; }
      });
      try {
        if (stateSaved.frozen !== undefined) ev('_pipelineFrozen = ' + JSON.stringify(!!stateSaved.frozen));
        if (stateSaved.token !== undefined) {
          w.__amxSavedToken = stateSaved.token;
          ev('combatToken = window.__amxSavedToken');
        }
      } catch (e) {}
    }
    return { pending };
  };
})();
