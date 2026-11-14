/* 共享音频混音器回归（CombatAudioMixer 契约）：同一 URL 预解码任务合并、热/冷主音与
   started 门闩、三轨输出与类别增益（A/B/C ×1.3 仅一次）、用途自动分类、withContext/
   capture 延迟继承、protect 按 rank duck 类别 Gain（同级/低 rank 不压、取最严格不连乘）、
   short/special 类别 hold 不被后来者提前恢复、雷击/扫射重复与自然尾音不裁、取消/clear/
   冻结/换代不晚播、默认 0.5 与显式 volume/rate 兼容、短 stop 可调用。
   约定：
   1) 全部断言走 iframe 内真实 CombatAudioMixer / playSound / playCustomAudio / classify /
      withContext / capture / protect / output / media，不复制业务算法；expected 一律用批准常量；
   2) 假 AudioContext / Audio / fetch 按引用安装到目标 window，结束按描述符与 Map 快照恢复，
      不做 JSON 序列化；假源如实记录 start/stop/onended 与 Gain 自动化时间；
   3) 未落地接口一律并入 pending，不误判失败；started/done 用 then 追踪，禁止 Promise 直比布尔。 */
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

    /* ---------- 类别契约证据工具（只读真实 output/类别 Gain，不复制业务算法） ---------- */
    const CATS = ['A','B','C','M','D','E','N','F','G','H','I','K','J','L'];
    const catBase = cat => (cat === 'A' || cat === 'B' || cat === 'C') ? 1.3 : 1;
    const categoryNode = (track, cat) => {
      try { return mixer.output(track, cat); } catch (e) { return null; }
    };
    const categoryNodes = cat => [...new Set(['skill', 'result', 'aux']
      .map(track => categoryNode(track, cat)).filter(Boolean))];
    const categoryOutputOk = (() => {
      try {
        const a = categoryNode('skill', 'A');
        return !!a && a !== mixer.output('skill') && near(a.gain && a.gain.value, 1.3);
      } catch (e) { return false; }
    })();
    const catNodesReady = () => { if (categoryOutputOk) CATS.forEach(categoryNodes); };
    const catCalls = (cat, seq0) => {
      const out = [];
      categoryNodes(cat).forEach(n => {
        if (n.gain && n.gain._calls) n.gain._calls.forEach(c => { if (c.seq > seq0) out.push(c); });
      });
      return out;
    };
    const isDuck = (cat, c) => typeof c.v === 'number' && c.v < catBase(cat) - 1e-6;
    const recoveredTo = (cat, c) => (c.type === 'lin' || c.type === 'exp' || c.type === 'target') &&
      near(c.v, catBase(cat)) && c.t != null;
    const duckedTo = (cat, calls, v) => calls.some(c => isDuck(cat, c) && near(c.v, v));
    const resetCategoryGains = () => {
      if (!categoryOutputOk) return;
      catNodesReady();
      CATS.forEach(cat => categoryNodes(cat).forEach(n => {
        try { if (n.gain.cancelScheduledValues) n.gain.cancelScheduledValues(clock.now); } catch (e) {}
        try { n.gain.value = catBase(cat); } catch (e) {}
      }));
    };
    const cancelProtect = p => { if (isFn(p)) { try { p(); } catch (e) {} } };

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
        check(near(o.skill.gain.value, 1) && near(o.result.gain.value, 1) && near(o.aux.gain.value, 1),
          '无 category 时原三轨保持基础增益 1');
        check(near(mixer.output('result', 'F').gain.value, 1),
          "output('result','F') 类别基准增益为 1");
        const spec = { A:[8,1.3], C:[8,1.3], M:[7,1], B:[6,1.3], D:[5,1], E:[4,1], N:[3,1],
          F:[2,1], G:[2,1], H:[1,1], I:[1,1], K:[0,1], J:[0,1], L:[0,1] };
        const info = mixer.categories;
        if (!info || typeof info !== 'object') note('待对齐:CombatAudioMixer.categories 未落地');
        else {
          const bad = Object.keys(spec).filter(c => !info[c] ||
            info[c].priority !== spec[c][0] || !near(info[c].gain, spec[c][1]));
          eq(bad, [], 'categories 优先级/增益为 A=C>M>B>D>E>N>F=G>H=I>K=J=L');
        }
      });

      /* ========== 组二：用途自动分类与未知新 fxTag 继承 ========== */
      await group('用途分类与未知特效继承', async () => {
        if (!isFn(mixer.classify)) { note('待对齐:CombatAudioMixer.classify 未落地'); return; }
        eq(mixer.classify({ fxTag:'全新雷击特效', type:'[单体]', type2:'[雷]' }), 'A',
          '未知攻击型 fxTag（单体）自动归 A');
        eq(mixer.classify({ fxTag:'群体鼓舞', type:'[群体增益]' }), 'B',
          '未知辅助型 fxTag 自动归 B');
        eq(mixer.classify({ fxTag:'扫射新特效', type:'[散射]' }), 'A',
          '散射伤害标签自动归 A');
        eq(mixer.classify({ fxTag:'group:enemyBuff', type:'[单体]' }), 'D',
          'group:* 恒归 D');
        eq(mixer.classify({ type:'[单体]', type2:'[枪击]' }), 'D',
          '无 fxTag 的伤害技能归 D');
        eq(mixer.classify({ type:'[回复]' }), 'K',
          '无 fxTag 的辅助技能归 K');
      });

      /* ========== 组三：withContext / capture 继承、嵌套与 finally 恢复 ========== */
      await group('withContext/capture 继承与恢复', async () => {
        if (!isFn(mixer.withContext) || !isFn(mixer.capture)) {
          note('待对齐:CombatAudioMixer.withContext/capture 未落地');
          return;
        }
        const cap = fallback => {
          const c = fallback == null ? mixer.capture() : mixer.capture(fallback);
          return c && c.category;
        };
        eq(cap(), 'K', '无上下文时 capture 默认 K');
        eq(cap('M'), 'M', 'capture 显式 fallback 生效');
        check(Object.isFrozen(mixer.capture('F')), 'capture 返回冻结上下文');
        mixer.withContext('A', () => {
          eq(cap(), 'A', 'withContext 字符串临时进入');
          mixer.withContext({ category:'M' }, () => eq(cap(), 'M', 'withContext 对象参数可嵌套'));
          eq(cap(), 'A', '嵌套退出恢复外层 A');
        });
        eq(cap(), 'K', '退出 withContext 恢复默认 fallback');
        let threw = false;
        try { mixer.withContext('B', () => { throw new Error('ctx'); }); } catch (e) { threw = true; }
        check(threw, 'withContext 不吞业务异常');
        eq(cap(), 'K', 'withContext 异常后 finally 仍恢复');
      });

      /* ========== 组四：play 类别解析优先级与延迟继承 ========== */
      await group('play 类别解析与延迟继承', async () => {
        if (!categoryOutputOk) { note('待对齐:output(track,category) 类别 Gain 未落地'); return; }
        const urls = ['amx-test/cat-fallback-skill.mp3', 'amx-test/cat-fallback-result.mp3',
          'amx-test/cat-fallback-aux.mp3'];
        urls.forEach(u => durations.set(u, 0.4));
        for (const u of urls) await prefill(u);
        const cueS = mixer.play(urls[0], { track:'skill', sync:true, vol:0.5 }); stops.push(cueS);
        if (cueS.category == null) { note('待对齐:play 未解析/透出 cue.category'); return; }
        eq(cueS.category, 'D', '无上下文 skill 轨 fallback 为 D');
        const cueR = mixer.play(urls[1], { track:'result', sync:true, vol:0.5 }); stops.push(cueR);
        eq(cueR.category, 'F', '无上下文 result 轨 fallback 为 F');
        const cueA = mixer.play(urls[2], { track:'aux', sync:true, vol:0.5 }); stops.push(cueA);
        eq(cueA.category, 'K', '无上下文 aux 轨 fallback 为 K');
        let scoped = null, explicit = null, ctxArg = null;
        if (isFn(mixer.withContext)) {
          mixer.withContext('A', () => {
            scoped = mixer.play(urls[0], { track:'result', sync:true }); stops.push(scoped);
            explicit = mixer.play(urls[0], { track:'skill', sync:true, category:'M' }); stops.push(explicit);
            ctxArg = mixer.play(urls[0], { track:'skill', sync:true,
              audioContext:Object.freeze({ category:'C' }) }); stops.push(ctxArg);
          });
          eq(scoped.category, 'A', '作用域类别覆盖 result 轨 fallback');
          eq(explicit.category, 'M', '显式 category 优先于作用域');
          eq(ctxArg.category, 'C', 'audioContext 优先于作用域');
        } else note('待对齐:withContext 未落地，跳过作用域优先级');
        const owner = { cancelled:false, finished:false, audioStoppers:new Set(),
          audioContext:Object.freeze({ category:'B' }), handle:{ cancel() {} },
          onClean() { return () => {}; }, retain() {} };
        const ownerCue = mixer.play(urls[0], { track:'skill', sync:true, owner }); stops.push(ownerCue);
        eq(ownerCue.category, 'B', 'owner.audioContext 供延迟播放继承');
        const ownerExplicit = mixer.play(urls[1], { track:'skill', sync:true, owner, category:'N' });
        stops.push(ownerExplicit);
        eq(ownerExplicit.category, 'N', '显式 category 优先于 owner.audioContext');

        // 延迟解码：类别必须在 play 调用时捕获，而不是 source 起音时才读作用域
        const uDelay = 'amx-test/cat-delayed.mp3';
        durations.set(uDelay, 0.4);
        const ctx = mixer.context();
        let release;
        ctx.decodeGate = { promise: new Promise(r => { release = r; }) };
        let delayed = null;
        try {
          if (isFn(mixer.withContext)) {
            mixer.withContext('A', () => {
              delayed = mixer.play(uDelay, { track:'skill', sync:true, vol:0.5 });
            });
            stops.push(delayed);
            eq(delayed.category, 'A', '未解码的 cue 已捕获调用时类别 A');
            await flush(6);
            check(!sourceFor(uDelay), '解码未就绪前不起音');
            release();
            await flush(10);
          } else {
            release();
            note('待对齐:withContext 未落地，无法验证延迟继承');
          }
        } finally {
          try { release(); } catch (e) {}
          ctx.decodeGate = null;
        }
        if (delayed) {
          const dsrc = sourceFor(uDelay);
          check(!!dsrc && categoryNodes('A').some(n => reaches(dsrc, n)),
            '异步起音后仍路由到 A 类别总线');
          check(near(delayed.baseVolume, 0.5), '延迟起音 cue.baseVolume 保留 0.5');
        }
        await flush(8);
      });


      /* ========== 组五：prepare 同 URL 任务合并 ========== */
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

      /* ========== 组五：类别增益只在统一 output 层乘一次 ========== */
      await group('类别增益一次与不叠乘', async () => {
        if (!categoryOutputOk) { note('待对齐:output(track,category) 类别 Gain 未落地'); return; }
        advance(1); resetCategoryGains();
        eq(['A','B','C'].filter(c => !near(categoryNode('skill', c).gain.value, 1.3)), [],
          'A/B/C 类别基准增益均为 1.3');
        eq(CATS.filter(c => catBase(c) === 1 && !near(categoryNode('skill', c).gain.value, 1)), [],
          '其它类别基准增益保持 1');
        check(mixer.output('skill', 'A') !== mixer.output('skill', 'M'), '不同类别 Gain 相互独立');

        resetCategoryGains();
        const u = 'amx-test/cat-gain-once.mp3';
        durations.set(u, 0.45);
        await prefill(u);
        const seq0 = paramSeq;
        const cue = mixer.play(u, { track:'skill', sync:true, vol:0.5, category:'A' });
        stops.push(cue);
        await flush(8);
        const src = sourceFor(u);
        check(!!src, '类别 A 主音真实起音');
        if (cue.category == null || cue.baseVolume == null) {
          note('待对齐:play 未透出 category/baseVolume');
          return;
        }
        eq(cue.category, 'A', 'cue.category 透出 A');
        check(near(cue.baseVolume, 0.5), 'cue.baseVolume 保留原始 vol 0.5', String(cue.baseVolume));
        const vals = src ? chainGains(src).map(g => g.gain.value) : [];
        eq(vals.filter(v => near(v, 1.3)).length, 1, '×1.3 只在统一输出层出现一次');
        check(!vals.some(v => near(v, 0.65)), '链路中不存在 0.5×1.3 的二次乘积');
        const local = src && (src.connections || []).find(n => n && n.gain && n.gain._calls);
        check(!!local && hasVal(trackCalls(local, seq0), 0.5), '源级本地 Gain 仍为 volume 0.5');
        check(!local || !hasVal(trackCalls(local, seq0), 0.65), '源级本地 Gain 未乘类别增益');
        check(categoryNodes('A').some(n => reaches(src, n)), 'A 主音接入 A 类别 Gain');

        const uM = 'amx-test/cat-gain-base.mp3';
        durations.set(uM, 0.45);
        await prefill(uM);
        const seqM = paramSeq;
        const cueM = mixer.play(uM, { track:'skill', sync:true, vol:0.5, category:'M' });
        stops.push(cueM);
        await flush(8);
        const srcM = sourceFor(uM);
        const valsM = srcM ? chainGains(srcM).map(g => g.gain.value) : [];
        check(!valsM.some(v => near(v, 1.3)), 'M 类别不继承 ×1.3');
        const localM = srcM && (srcM.connections || []).find(n => n && n.gain && n.gain._calls);
        check(!!localM && hasVal(trackCalls(localM, seqM), 0.5), 'M 类别本地 Gain 仍为 0.5');

        if (isFn(mixer.media)) {
          const el = new FakeAudio('amx-test/media-category.mp3');
          const mseq = paramSeq;
          let stopMedia = null, mediaErr = null;
          try { stopMedia = mixer.media(el, 0.6, 'skill', { category:'A' }); }
          catch (e) { mediaErr = e; }
          if (mediaErr) note('待对齐:CombatAudioMixer.media 尚不支持 category 参数');
          else {
            if (isFn(stopMedia)) stops.push(stopMedia);
            const node = mediaNodeFor(el);
            const mvals = node ? chainGains(node).map(g => g.gain.value) : [];
            if (mvals.some(v => near(v, 1.3))) {
              check(hasVal(callsFrom(node, mseq), 0.6), 'media 本地 Gain 仍为 volume 0.6');
              eq(mvals.filter(v => near(v, 1.3)).length, 1, 'media 类别增益只在统一输出层一次');
              check(!mvals.some(v => near(v, 0.78)), 'media 不重复乘 1.3');
            } else note('待对齐:CombatAudioMixer.media 未支持 category');
          }
        } else note('待对齐:CombatAudioMixer.media 未落地');

        if (isFn(mixer.classify) && isFn(mixer.withContext)) {
          const uNew = 'amx-test/new-fx-inherit.mp3';
          durations.set(uNew, 0.45);
          await prefill(uNew);
          let ncue = null;
          mixer.withContext(mixer.classify({ fxTag:'全新未知攻击', type:'[单体]' }), () => {
            ncue = mixer.play(uNew, { track:'skill', sync:true, vol:0.5 });
          });
          stops.push(ncue);
          await flush(8);
          eq(ncue.category, 'A', '未知新 fxTag 攻击按用途继承 A');
          const nsrc = sourceFor(uNew);
          const nvals = nsrc ? chainGains(nsrc).map(g => g.gain.value) : [];
          eq(nvals.filter(v => near(v, 1.3)).length, 1, '未知新特效无需白名单即获一次 ×1.3');
        }
      });

      /* ========== 组六：protect 按 rank duck 类别 Gain 与重叠不提前恢复 ========== */
      await group('类别保护与重叠保护', async () => {
        if (!categoryOutputOk) { note('待对齐:protect 类别 Gain 未落地，旧 result/aux 压轨断言改测类别'); return; }
        // 先越过前面播放遗留的 short/special 保护窗口，并借一次 rank0 保护触发清理
        advance(1.0);
        catNodesReady();
        resetCategoryGains();
        const pPurge = mixer.protect('short', clock.now, null, 'J');
        cancelProtect(pPurge);
        resetCategoryGains();
        const o = outs();

        // short 默认 D：压低 rank，不压更高 rank；不再整体压 result/aux 原轨
        const t0 = clock.now;
        resetCategoryGains();
        let seq0 = paramSeq;
        const pShort = mixer.protect('short', t0);
        const f1 = catCalls('F', seq0), m1 = catCalls('M', seq0), b1 = catCalls('B', seq0);
        if (!f1.some(c => isDuck('F', c))) {
          cancelProtect(pShort);
          note('待对齐:protect(short) 未按 rank duck 类别 Gain');
          return;
        }
        check(duckedTo('F', f1, 0.65), 'short 默认 D 将低 3 级 F 压到 0.65');
        check(!m1.some(c => isDuck('M', c)), 'D 不压更高 rank 的 M');
        check(!b1.some(c => isDuck('B', c)), 'D 不压更高 rank 的 B');
        check(!hasVal(trackCalls(o.result, seq0), 0.40) && !hasVal(trackCalls(o.aux, seq0), 0.30),
          'protect 不再整体压 result/aux 原轨');
        const f1rec = f1.filter(c => recoveredTo('F', c));
        if (f1rec.length) check(Math.min(...f1rec.map(c => c.t)) >= t0 + 0.18 - 1e-6,
          'D 类短保护恢复不早于 180ms hold', '恢复于 ' + Math.min(...f1rec.map(c => c.t)));
        else note('待对齐:类别保护未用 Gain 自动调度恢复（缺少可记录时间）');
        cancelProtect(pShort);
        advance(0.6); resetCategoryGains();

        // A 类：short profile 也按 special 450ms；A→M .85 / A→B .65 / A→F .4；同级 C 不互压
        const t1 = clock.now;
        resetCategoryGains();
        seq0 = paramSeq;
        const pA = mixer.protect('short', t1, null, 'A');
        const aM = catCalls('M', seq0), aB = catCalls('B', seq0);
        const aF = catCalls('F', seq0), aC = catCalls('C', seq0);
        check(duckedTo('M', aM, 0.85), 'A→M 差 1 级压到 0.85');
        check(duckedTo('B', aB, 1.3 * 0.65), 'A→B 差 2 级为类别基准1.3×0.65');
        check(duckedTo('F', aF, 0.40), 'A→F 差 6 级压到 0.40');
        check(!aC.some(c => isDuck('C', c)), '同级 A 保护不压 C');
        const aFrec = aF.filter(c => recoveredTo('F', c));
        if (aFrec.length) check(Math.min(...aFrec.map(c => c.t)) >= t1 + 0.45 - 1e-6,
          'A/B/C 类实际按 special 450ms 恢复', '恢复于 ' + Math.min(...aFrec.map(c => c.t)));
        else note('待对齐:A 类保护缺少可记录恢复时间');
        cancelProtect(pA);
        advance(0.7); resetCategoryGains();

        // 旧调用 protect('special') 默认类别 A，仍应压 M 到 0.85
        const tDef = clock.now;
        resetCategoryGains();
        seq0 = paramSeq;
        const pDef = mixer.protect('special', tDef);
        const defM = catCalls('M', seq0);
        check(duckedTo('M', defM, 0.85), 'special 默认类别 A 将 M 压到 0.85');
        cancelProtect(pDef);
        advance(0.7); resetCategoryGains();

        // J（rank 0）不 duck 任何类别
        const t2 = clock.now;
        resetCategoryGains();
        seq0 = paramSeq;
        const pJ = mixer.protect('special', t2, null, 'J');
        const jF = catCalls('F', seq0), jM = catCalls('M', seq0);
        check(!jF.some(c => isDuck('F', c)) && !jM.some(c => isDuck('M', c)),
          'J rank0 不压任何类别');
        cancelProtect(pJ);
        advance(0.5); resetCategoryGains();

        // A + C 同级多保护取最严格不连乘；后来的 D 短保护不得提前恢复 A 的 450ms hold
        const t3 = clock.now;
        resetCategoryGains();
        seq0 = paramSeq;
        const pA2 = mixer.protect('special', t3, null, 'A');
        const pC2 = mixer.protect('special', t3 + 0.05, null, 'C');
        const pD2 = mixer.protect('short', t3 + 0.10);
        const multiM = catCalls('M', seq0), multiF = catCalls('F', seq0);
        const minM = Math.min(...multiM.filter(c => isDuck('M', c)).map(c => c.v));
        const minF = Math.min(...multiF.filter(c => isDuck('F', c)).map(c => c.v));
        check(near(minM, 0.85) && !hasVal(multiM, 0.7225),
          'A+C 对 M 取 0.85 最严格，不连乘', '最低 ' + minM);
        check(near(minF, 0.40) && !hasVal(multiF, 0.26) && !hasVal(multiF, 0.16) &&
          !hasVal(multiF, 0.104), 'A+C+D 对 F 取 0.40 最严格，不连乘', '最低 ' + minF);
        const multiRec = multiF.filter(c => recoveredTo('F', c));
        const early = multiRec.filter(c => c.t < t3 + 0.45 - 1e-6);
        check(early.length === 0, '后来的 D 短保护未提前恢复 A 的 450ms hold',
          early.length ? '提前恢复于 ' + early[0].t : '');
        cancelProtect(pA2); cancelProtect(pC2); cancelProtect(pD2);
        advance(0.8); resetCategoryGains();
      });

      /* ========== 组七：雷击/连续扫射重复不互相停、自然尾音不裁 ========== */
      await group('雷击与连续扫射重复尾音', async () => {
        const urls = ev('typeof audioUrls === "object" ? audioUrls : null');
        const thunder = urls && urls.thunder_single_hit;
        const sweep = urls && urls.gunshot1;
        if (!thunder) { note('待对齐:audioUrls.thunder_single_hit 不存在'); return; }
        durations.set(thunder, 0.92);
        await prefill(thunder);
        durations.set(thunder, 0.92); mixer.buffers.set(thunder, makeBuffer(thunder));
        const cues = [0, 1, 2].map(() => {
          const c = mixer.play(thunder, { track:'skill', sync:true, vol:0.5 });
          stops.push(c); return c;
        });
        await flush(10);
        const srcs = allSources.filter(s => s.startedAt != null && s.buffer && s.buffer.__url === thunder);
        eq(srcs.length, 3, '雷击重复三声全部起音');
        check(new Set(srcs).size === 3, '雷击重复声源互不覆盖');
        check(srcs.every(s => !s._ended), '雷击三声并发均存活');
        check(srcs.every(s => s.stopAt == null || s.stopAt >= s.startedAt + 0.9),
          '雷击尾音未被裁短或加上限');
        check(srcs.every(s => !s.startArgs || s.startArgs.dur == null || s.startArgs.dur >= 0.9),
          '雷击起音窗口未按上限裁剪');
        if (sweep) {
          durations.set(sweep, 0.5);
          await prefill(sweep);
          for (let i = 0; i < 4; i++) {
            const c = mixer.play(sweep, { track:'skill', sync:true, vol:0.5 });
            stops.push(c);
          }
          await flush(10);
          const scanSrcs = allSources.filter(s => s.startedAt != null && s.buffer &&
            s.buffer.__url === sweep).slice(-4);
          eq(scanSrcs.length, 4, '连续扫射四次重复全部起音');
          check(scanSrcs.every(s => !s._ended), '连续扫射重复声源可同时存活');
          check(scanSrcs.every(s => s.stopAt == null || s.stopAt >= s.startedAt + 0.49),
            '连续扫射重复未被裁尾');
          check(scanSrcs.every(s => !s.startArgs || s.startArgs.dur == null || s.startArgs.dur >= 0.49),
            '连续扫射起音窗口未按上限裁剪');
        } else note('待对齐:audioUrls.gunshot1 不存在');
        advance(0.95);
        await flush(4);
        check(srcs.every(s => s._ended), '雷击尾音按自然时长自然收口');
        if (cues.length !== 3) check(false, '雷击 cue 数量异常');
      });

      /* ========== 组八：自然尾音 >460ms 不被清理 ========== */
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
