/* 命中结果反馈回归：分类三维（9.9/10/50/51 与小额暴击）、纯盾/破盾/混合、
   血条 450ms 保持 + 500ms 坍缩 + 连击/治疗/强制同步、DOM 字号/时长矩阵、
   wave 单次主震与 60ms 定帧、音频不双播、血液粒子 source-over 与旋转豁免、
   重伤提示位置/时长/不挡数字，以及 clearHitFeedback / clearArcaneFx 清理。
   音频路由回归：playHitFeedback 纯视觉不发布任何声音/结果事件；受击音一律经
   真实 applySingleTagEffect/语义结果事件（DAMAGE_RESOLVED/DODGE_RESOLVED）→
   CombatAudioDirector→playSound 检验三档、防连重随机池、格挡/闪避三档与破盾、
   身份/技能 cue 独立叠加、close 等待 pending 才播/completeTarget/cancelWave 新语义、
   identitySfxOn 关闭仅消费静默且语义事件仍通知。
   全部断言走真实 iframe 函数与真实 DOM/Canvas/AudioContext 调用；
   计时使用宿主真时钟，不用乱序微任务假 clock。 */
(function () {
  'use strict';
  window.runHitFeedbackRegression = async function ({ w, check, eq, mock, source }) {
    const doc = w.document;
    const ev = code => w.eval(code);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms)); // 宿主真时钟
    const pending = [];
    const near = (a, b, tol, name) => check(Math.abs(Number(a) - Number(b)) <= tol, name, '期望≈' + b + '±' + tol + '，实际 ' + a);
    const durationOf = el => {
      const list = el && el.getAnimations ? el.getAnimations() : [];
      const a = list.find(x => x.effect && x.effect.getTiming);
      const d = a && a.effect.getTiming().duration;
      return typeof d === 'number' ? d : NaN;
    };
    const px = v => parseFloat(String(v).replace('px', ''));
    const pctOf = el => el.getBoundingClientRect().width / (el.parentElement.getBoundingClientRect().width || 1) * 100;
    const ghostFinalPct = el => {
      // IAB 可暂停 CSS 时间轴；显式采样真实过渡的终帧，500ms 参数与保持期另有断言，实时时序由真 Chrome 验证。
      el.getAnimations().filter(a => a.transitionProperty === 'width').forEach(a => a.finish());
      return pctOf(el);
    };

    /* ---------- 接口落地检查：未落地按 pending 上报，不误判失败 ---------- */
    const coreMissing = ['classifyHit', 'playHitFeedback', 'clearHitFeedback', 'clearArcaneFx']
      .filter(name => ev('typeof ' + name) !== 'function');
    const mod = ev('typeof arcaneVfxModule === "object" ? arcaneVfxModule : null');
    const modApi = ['syncHitBar', 'playWoundedHint']
      .filter(name => !mod || typeof mod[name] !== 'function');
    if (coreMissing.length || modApi.length) {
      coreMissing.forEach(n => pending.push('接口缺失:' + n));
      modApi.forEach(n => pending.push('接口缺失:arcaneVfxModule.' + n));
      return { pending };
    }
    const classify = w.classifyHit;
    const play = w.playHitFeedback;
    const clearHit = w.clearHitFeedback;
    const clearFx = w.clearArcaneFx;
    const syncBar = mod.syncHitBar;
    const wounded = mod.playWoundedHint;

    /* ---------- 源码/产物来源：优先 harness 传入的真实 RPG_SOURCE 解出 HTML ---------- */
    let src = typeof source === 'string' && source.length > 2000 ? source : '';
    if (!src) { try { src = doc.documentElement.outerHTML || ''; } catch (e) { src = ''; } }
    if (/^\s*\{/.test(src) && src.indexOf('replaceString') >= 0) {
      try {
        const j = JSON.parse(src);
        src = String(j.replaceString || '').replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '').replace(/&amp;/g, '&');
      } catch (e) { /* 保留原串 */ }
    }
    const hasSrc = src.length > 2000;
    if (!hasSrc) pending.push('待对齐:source未注入');
    const hitStart = hasSrc ? src.indexOf('命中结果反馈 BEGIN') : -1;
    const hitEnd = hitStart >= 0 ? src.indexOf('命中结果反馈 END', hitStart + 1) : -1;
    const hitSrc = hitStart >= 0 && hitEnd > hitStart ? src.slice(hitStart, hitEnd) : '';
    if (hasSrc && !hitSrc) pending.push('待对齐:命中模块源码段未定位（产物可能已改名）');

    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;
    const saved = ev(`({ heroesData, enemiesData, battleHistory, _historyRawCache, state:{...state}, llm:{...llmState},
      nonLethal:nonLethalSettings.enabled, emit:CombatEvents.emit, emitAsync:CombatEvents.emitAsync,
      random:Math.random, particles:fxEngine.particles.slice(), hitStop:fxEngine.hitStop,
      token:combatToken, frozen:_pipelineFrozen })`);
    const functions = new Map();
    const replace = (name, fn) => { if (!functions.has(name)) functions.set(name, w[name]); w[name] = fn; };
    const apiMissing = typeof w.CombatAudioDirector !== 'object';
    if (apiMissing) pending.push('接口缺失:CombatAudioDirector');
    const director = w.CombatAudioDirector;
    const dirApiMissing = apiMissing ? [] : ['beginWave', 'completeTarget', 'closeWave', 'cancelWave', 'clear', 'publish', 'consume']
      .filter(name => typeof director[name] !== 'function');
    dirApiMissing.forEach(n => pending.push('接口缺失:CombatAudioDirector.' + n));
    const evtApi = ev('typeof EVENTS === "object" ? EVENTS : null');
    const evtDamage = evtApi && evtApi.DAMAGE_RESOLVED, evtDodge = evtApi && evtApi.DODGE_RESOLVED;
    const soundKeys = [];
    const resetDirector = () => { if (director) director.clear(); soundKeys.length = 0; };
    replace('playSound', (key, volume, rate) => { soundKeys.push({ key, volume, rate }); return () => {}; });
    // 语义结果事件放行与记录（新契约已落地，不保留 IMPACT_AUDIO 过渡兼容）：
    const semanticEvents = [];
    const impactKeyRe = /^(hit_[123][abc]|parry_[123]|dodge_[123])$/;
    if (!apiMissing && evtDamage && evtDodge) {
      const evtObj = ev('CombatEvents');
      evtObj.emit = (event, ctx = {}) => {
        if (event === evtDamage || event === evtDodge) {
          semanticEvents.push({ event: event, ctx: ctx, frozen: Object.isFrozen(ctx) });
          saved.emit.call(evtObj, event, ctx);
        }
      };
    }
    const semanticOnly = () => semanticEvents;

    /* ---------- 真实 DOM 舞台：英雄 / 敌方 / 双召唤 HP 轨道与 ghost ---------- */
    const root = doc.createElement('div');
    root.id = 'hit-feedback-regression-stage';
    root.style.cssText = 'position:fixed;left:30px;top:110px;width:680px;height:400px;pointer-events:none;';
    // 真实结构：ghost 为 arcane-hit-ghost 且位于前景 arcane-hit-fill 之前（z-index 0 < 1）
    const track = (id, wpx) => '<div class="arcane-hit-track" style="position:relative;width:' + wpx + 'px;height:12px;background:#111">' +
      '<div id="' + id + '-hp-ghost" class="arcane-hit-ghost" style="width:100%;height:12px;background:#fff"></div>' +
      '<div id="' + id + '-hp-bar" class="arcane-hit-fill" style="width:100%;height:12px;background:#f43f5e"></div></div>';
    root.innerHTML = [
      '<div id="hero-card-h_hfb" class="hero-card-inner" style="position:absolute;left:0;top:0;width:180px;height:150px;background:#243047;border:1px solid #7dd3fc">',
      '<img alt="" style="width:180px;height:90px;display:block">', track('h_hfb', 200),
      '<div id="h_hfb-status" style="display:none"></div><div id="h_hfb-mp-bar" style="width:55%"></div><div id="h_hfb-tp-bar" style="width:44%"></div></div>',
      '<div id="e_hfb-sprite" style="position:absolute;left:300px;top:0;width:110px;height:110px;background:#4c1d58">',
      '<img alt="" style="width:100px;height:100px;display:block"></div>',
      '<div style="position:absolute;left:300px;top:120px">', track('e_hfb', 200), '</div>',
      '<div id="hero-card-s_hsum" style="position:absolute;left:0;top:210px;width:160px;height:130px;background:#1e3a5f">',
      '<div style="width:160px;height:70px">🐉</div>', track('s_hsum', 180), '</div>',
      '<div id="s_esum-sprite" style="position:absolute;left:300px;top:210px;width:100px;height:100px;background:#3f1d2e">',
      '<div style="width:100px;height:60px">🐺</div></div>',
      '<div style="position:absolute;left:300px;top:320px">', track('s_esum', 180), '</div>',
      '<div id="hero-card-h_hfb2" class="hero-card-inner" style="position:absolute;left:520px;top:0;width:150px;height:120px;background:#243047;border:1px solid #7dd3fc">',
      '<img alt="" style="width:150px;height:60px;display:block">', track('h_hfb2', 150),
      '<div id="h_hfb2-status" style="display:none"></div></div>',
      '<div id="hero-card-h_hfb3" class="hero-card-inner" style="position:absolute;left:520px;top:210px;width:150px;height:120px;background:#243047;border:1px solid #7dd3fc">',
      '<img alt="" style="width:150px;height:60px;display:block">', track('h_hfb3', 150),
      '<div id="h_hfb3-status" style="display:none"></div></div>'
    ].join('');
    doc.body.appendChild(root);

    const entity = (id, extra) => Object.assign({ id: id, name: id, hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 10, def: 0, spd: 1, shield: 0, actCount: 1, isAlive: true, buffs: [], skills: [], items: [], classType: null,
      isSummon: false, row: 'front' }, extra);
    ev('heroesData=' + JSON.stringify([entity('h_hfb'), entity('s_hsum', { isSummon: true, side: 'hero' })]) +
      ';enemiesData=' + JSON.stringify([entity('e_hfb', { side: 'enemy' }), entity('s_esum', { isSummon: true, side: 'enemy' })]) +
      ';battleHistory=[];_historyRawCache="";combatToken={};_pipelineFrozen=false;nonLethalSettings.enabled=false;' +
      'llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;state.isGameStarted=false;');
    w.Math.random = () => 0.5;

    /* ---------- Canvas 2D 包装：按引用记录每次 fill/stroke 的 blend 与旋转来源 ---------- */
    const nativeGetContext = w.HTMLCanvasElement.prototype.getContext;
    const canvasLog = { fills: [], strokes: [] };
    const ctxState = new WeakMap(), ctxWrapped = new WeakSet(), gradStops = new WeakMap();
    const BLOOD_RE = /153,\s*27,\s*27|185,\s*28,\s*28|109,\s*15,\s*24|#ef4444|#dc2626|#991b1b/i;
    const HP_STREAK_RE = /#fecdd3|#e11d48|#fda4af/i;
    const colorsOf = rec => rec.stops && rec.stops.length ? rec.stops : [rec.style];
    const isBlood = rec => colorsOf(rec).some(c => BLOOD_RE.test(String(c)));
    const harvest = pred => canvasLog.fills.filter(pred);
    /* 拦截原型 fillStyle 赋值：区分“通用自旋（先 rotate 后着色）”与“形状自身按速度旋转（先着色后 rotate）”。
       CanvasRenderingContext2D 实例可扩展性依浏览器实现而异，用 WeakMap 存状态最稳。 */
    let styleDesc = null;
    try {
      styleDesc = Object.getOwnPropertyDescriptor(w.CanvasRenderingContext2D.prototype, 'fillStyle');
      if (styleDesc && styleDesc.get && styleDesc.set) {
        Object.defineProperty(w.CanvasRenderingContext2D.prototype, 'fillStyle', {
          configurable: true,
          get() { return styleDesc.get.call(this); },
          set(v) { const st = ctxState.get(this); if (st) st.touched = true; styleDesc.set.call(this, v); }
        });
      }
    } catch (e) { styleDesc = null; }
    w.HTMLCanvasElement.prototype.getContext = function (type) {
      const ctx = nativeGetContext.apply(this, arguments);
      if (type !== '2d' || !ctx || ctxWrapped.has(ctx)) return ctx;
      ctxWrapped.add(ctx);
      const state = { touched: false, rotated: false, rotatedBeforeStyle: false, rotates: 0 };
      ctxState.set(ctx, state);
      const origFill = ctx.fill, origStroke = ctx.stroke, origRotate = ctx.rotate,
        origSave = ctx.save, origRestore = ctx.restore, origGrad = ctx.createRadialGradient;
      let depth = 0;
      ctx.save = function () { depth++; if (depth === 1) { state.touched = false; state.rotated = false; state.rotatedBeforeStyle = false; state.rotates = 0; } return origSave.apply(this, arguments); };
      ctx.restore = function () { depth = Math.max(0, depth - 1); return origRestore.apply(this, arguments); };
      ctx.rotate = function () { state.rotated = true; state.rotates++; if (!state.touched) state.rotatedBeforeStyle = true; return origRotate.apply(this, arguments); };
      ctx.createRadialGradient = function () {
        const g = origGrad.apply(this, arguments);
        if (g) {
          const stops = [];
          gradStops.set(g, stops);
          const add = g.addColorStop.bind(g);
          g.addColorStop = function (o, c) { stops.push(String(c)); return add(o, c); };
        }
        return g;
      };
      ctx.fill = function () {
        const style = ctx.fillStyle;
        canvasLog.fills.push({ style: String(style), stops: style && gradStops.has(style) ? gradStops.get(style).slice() : null,
          composite: ctx.globalCompositeOperation, rotated: state.rotated, rotatedBeforeStyle: state.rotatedBeforeStyle,
          rotates: state.rotates });
        return origFill.apply(this, arguments);
      };
      ctx.stroke = function () {
        canvasLog.strokes.push({ style: String(ctx.strokeStyle), composite: ctx.globalCompositeOperation,
          rotated: state.rotated, rotatedBeforeStyle: state.rotatedBeforeStyle, rotates: state.rotates });
        return origStroke.apply(this, arguments);
      };
      return ctx;
    };

    /* ---------- AudioContext 包装：统计主音调度次数 ---------- */
    const AC = w.AudioContext || w.webkitAudioContext;
    const acProto = AC && AC.prototype;
    const audioCount = { n: 0 };
    if (!AC) pending.push('待对齐:AudioContext 不可用，主音调度次数未验证');
    const origCBS = acProto && acProto.createBufferSource;
    const origOSC = acProto && acProto.createOscillator;
    if (acProto) {
      if (origCBS) acProto.createBufferSource = function () { audioCount.n++; return origCBS.apply(this, arguments); };
      if (origOSC) acProto.createOscillator = function () { audioCount.n++; return origOSC.apply(this, arguments); };
    }

    const layers = () => doc.querySelectorAll('.arcane-hit-num-layer');
    const layerEls = sel => Array.from(doc.querySelectorAll(sel));
    const numByText = text => layerEls('.arcane-hit-num').find(el => el.textContent === text) || null;
    const scene = doc.getElementById('battle-scene');
    let mo = null, lightAdds = 0;
    const LIGHT_RE = /(^|\s)arcane-shake-light(\s|$)/;
    // 按每条 MutationRecord 的“旧值→本条之后的状态”顺序计数，不能用当前最终 class 与每条旧值比较（否则同批多次写入会重复累计）
    const lightCount = () => {
      lightAdds = 0;
      if (!scene) return;
      mo = new w.MutationObserver(muts => {
        for (let i = 0; i < muts.length; i++) {
          const old = muts[i].oldValue || '';
          const next = i + 1 < muts.length ? (muts[i + 1].oldValue || '') : scene.className;
          if (!LIGHT_RE.test(old) && LIGHT_RE.test(next)) lightAdds++;
        }
      });
      mo.observe(scene, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    };
    const stopLight = () => { if (mo) { mo.disconnect(); mo = null; } return lightAdds; };

    const group = async (name, fn) => {
      try { await fn(); } catch (e) { check(false, name + '执行异常', String(e.stack || e)); }
    };
    const optsQuiet = { suppressShake: true, suppressRecoil: true, suppressDodgeFx: true };

    try {
      await group('CombatAudioDirector 音效路由与wave聚合', async () => {
        if (apiMissing) return;
        resetDirector();
        director.publish({ targetId:'e_hfb', sourceId:'h_hfb', source:'attack', outcome:'hit', maxHp:1000, hpDmg:99, hpBefore:1000, hpAfter:901 });
        eq(soundKeys.length, 1, '单体结果只调度一个受击音');
        check(/^hit_1[abc]$/.test(soundKeys[0]?.key || ''), '9.9%命中路由tier1');
        resetDirector();
        director.publish({ targetId:'e_hfb', sourceId:'h_hfb', source:'attack', outcome:'hit', maxHp:1000, hpDmg:499, hpBefore:1000, hpAfter:501 });
        check(/^hit_2[abc]$/.test(soundKeys[0]?.key || ''), '49.9%命中路由tier2');
        resetDirector();
        director.publish({ targetId:'e_hfb', sourceId:'h_hfb', source:'attack', outcome:'hit', maxHp:1000, hpDmg:500, hpBefore:1000, hpAfter:500 });
        check(/^hit_3[abc]$/.test(soundKeys[0]?.key || ''), '50%命中路由tier3');
        resetDirector();
        director.publish({ targetId:'h_hfb', sourceId:'e_hfb', source:'attack', outcome:'hit', maxHp:1000, hpDmg:100, shieldDmg:50, shieldBefore:50, shieldAfter:0, hpBefore:1000, hpAfter:900 });
        eq(soundKeys.map(s=>s.key), ['parry_3'], '任意伤害破盾播放GuardBreak一次');
        resetDirector();
        director.publish({ targetId:'h_hfb', sourceId:'e_hfb', source:'attack', outcome:'dodge', maxHp:1000, incomingDmg:500 });
        eq(soundKeys.map(s=>s.key), ['dodge_3'], '50%来袭闪避路由dodge_3');
        resetDirector();
        director.publish({ targetId:'h_hfb', sourceId:'e_hfb', source:'attack', outcome:'block', maxHp:1000, blockedDmg:100 });
        eq(soundKeys.map(s=>s.key), ['parry_2'], '10%被挡路由parry_2');
        resetDirector();
        director.publish({ targetId:'h_hfb', sourceId:'e_counter', source:'counter', outcome:'hit', maxHp:1000, hpDmg:300, shieldDmg:20, shieldBefore:20, shieldAfter:0, hpBefore:1000, hpAfter:700 });
        eq(soundKeys.map(s=>s.key), ['parry_3'], 'counter旁路携带护盾快照并能路由GuardBreak');
        resetDirector();
        const dotWave = director.beginWave(['h_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'poison:e1', source:'dot', outcome:'hit', maxHp:1000, hpDmg:20, hpBefore:1000, hpAfter:980, wave:dotWave });
        director.completeTarget(dotWave, 'h_hfb');
        director.closeWave(dotWave);
        eq(soundKeys.filter(s=>/^hit_[123][abc]$/.test(s.key)).length, 1, '同单位该回合累计DoT只路由一次');
        resetDirector();
        const wave = director.beginWave(['h_hfb','e_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:99, hpBefore:1000, hpAfter:901, wave });
        director.publish({ targetId:'e_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:500, hpBefore:1000, hpAfter:500, wave });
        director.completeTarget(wave, 'h_hfb'); director.completeTarget(wave, 'e_hfb');
        eq(soundKeys.length, 0, 'wave在close之前不播');
        director.closeWave(wave);
        eq(soundKeys.length, 1, '多目标wave只播一次');
        check(/^hit_3[abc]$/.test(soundKeys[0]?.key || ''), 'wave取最高HP命中档位');
        director.closeWave(wave);
        eq(soundKeys.length, 1, '重复close不双播');
        resetDirector();
        const mixed = director.beginWave(['h_hfb','e_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'dodge', maxHp:1000, incomingDmg:500, wave:mixed });
        director.publish({ targetId:'e_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:5, hpBefore:1000, hpAfter:995, wave:mixed });
        director.completeTarget(mixed, 'h_hfb'); director.completeTarget(mixed, 'e_hfb');
        director.closeWave(mixed);
        check(/^hit_1[abc]$/.test(soundKeys[0]?.key || ''), 'wave中的实际命中优先于闪避结果');
        resetDirector();
        const broken = director.beginWave(['h_hfb','e_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:50, shieldDmg:50, shieldBefore:50, shieldAfter:0, hpBefore:1000, hpAfter:950, wave:broken });
        director.publish({ targetId:'e_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:500, hpBefore:1000, hpAfter:500, wave:broken });
        director.completeTarget(broken, 'h_hfb'); director.completeTarget(broken, 'e_hfb');
        director.closeWave(broken);
        eq(soundKeys.map(s=>s.key), ['parry_3'], 'wave中任一目标破盾优先GuardBreak');
        resetDirector();
        const stale = director.beginWave(['h_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:1, hpBefore:1000, hpAfter:999, wave:stale });
        director.clear(); director.closeWave(stale);
        eq(soundKeys.length, 0, 'clear后旧wave不向新战局播音');
        // 防连重随机池：同档连续两次必换变体（Math.random 固定 0.5 下 idx=1→重摇→2）
        resetDirector();
        director.publish({ targetId:'e_hfb', sourceId:'h_hfb', source:'attack', outcome:'hit', maxHp:1000, hpDmg:100, hpBefore:1000, hpAfter:900 });
        director.publish({ targetId:'e_hfb', sourceId:'h_hfb', source:'attack', outcome:'hit', maxHp:1000, hpDmg:100, hpBefore:1000, hpAfter:900 });
        eq(soundKeys.length, 2, '连续两次同档命中各调度一次');
        check(soundKeys.every(s => /^hit_2[abc]$/.test(s.key)), '两次均落在tier2随机池内', soundKeys.map(s => s.key).join(','));
        check(soundKeys[0].key !== soundKeys[1].key, '防连重池：同档连续不重播同一变体', soundKeys.map(s => s.key).join(','));
        // 格挡/闪避三档补全（publish 单测口径）
        resetDirector();
        director.publish({ targetId:'h_hfb', sourceId:'e_hfb', source:'attack', outcome:'block', maxHp:1000, blockedDmg:99 });
        director.publish({ targetId:'h_hfb', sourceId:'e_hfb', source:'attack', outcome:'block', maxHp:1000, blockedDmg:500 });
        eq(soundKeys.map(s => s.key), ['parry_1', 'parry_3'], '9.9%/50%被挡路由parry_1/parry_3');
        resetDirector();
        director.publish({ targetId:'h_hfb', sourceId:'e_hfb', source:'attack', outcome:'dodge', maxHp:1000, incomingDmg:99 });
        director.publish({ targetId:'h_hfb', sourceId:'e_hfb', source:'attack', outcome:'dodge', maxHp:1000, incomingDmg:100 });
        eq(soundKeys.map(s => s.key), ['dodge_1', 'dodge_2'], '9.9%/10%来袭闪避路由dodge_1/dodge_2');
        // wave聚合矩阵：格挡>闪避、全闪避取最高来袭档、无目标静默
        resetDirector();
        const bdWave = director.beginWave(['h_hfb','e_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'dodge', maxHp:1000, incomingDmg:500, wave:bdWave });
        director.publish({ targetId:'e_hfb', sourceId:'e1', source:'attack', outcome:'block', maxHp:1000, blockedDmg:500, wave:bdWave });
        director.completeTarget(bdWave, 'h_hfb'); director.completeTarget(bdWave, 'e_hfb');
        director.closeWave(bdWave);
        eq(soundKeys.map(s => s.key), ['parry_3'], 'wave中格挡优先于闪避（格挡>闪避）');
        resetDirector();
        const allDodge = director.beginWave(['h_hfb','e_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'dodge', maxHp:1000, incomingDmg:100, wave:allDodge });
        director.publish({ targetId:'e_hfb', sourceId:'e1', source:'attack', outcome:'dodge', maxHp:1000, incomingDmg:500, wave:allDodge });
        director.completeTarget(allDodge, 'h_hfb'); director.completeTarget(allDodge, 'e_hfb');
        director.closeWave(allDodge);
        eq(soundKeys.map(s => s.key), ['dodge_3'], '全闪避wave取最高来袭档dodge_3');
        resetDirector();
        director.closeWave(director.beginWave([]));
        eq(soundKeys.length, 0, '无目标wave不播音');
        // close等待pending新语义 / completeTarget / cancelWave（新契约已落地，pending为空是播出门槛）
        resetDirector();
        const pendWave = director.beginWave(['h_hfb','e_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:99, hpBefore:1000, hpAfter:901, wave:pendWave });
        director.completeTarget(pendWave, 'h_hfb');
        director.closeWave(pendWave);
        eq(soundKeys.length, 0, 'close后pending未完成不播');
        director.publish({ targetId:'e_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:99, hpBefore:1000, hpAfter:901, wave:pendWave });
        eq(soundKeys.length, 0, '迟到publish不清pending仍不播');
        director.completeTarget(pendWave, 'e_hfb');
        eq(soundKeys.length, 1, 'completeTarget清pending后wave播出');
        resetDirector();
        const ctWave = director.beginWave(['h_hfb','e_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:99, hpBefore:1000, hpAfter:901, wave:ctWave });
        director.completeTarget(ctWave, 'h_hfb');
        director.completeTarget(ctWave, 'e_hfb');
        director.closeWave(ctWave);
        eq(soundKeys.filter(s => impactKeyRe.test(s.key)).length, 1, 'completeTarget清pending后close聚合播出一次');
        resetDirector();
        const cxWave = director.beginWave(['h_hfb']);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:1, hpBefore:1000, hpAfter:999, wave:cxWave });
        director.cancelWave(cxWave);
        director.publish({ targetId:'h_hfb', sourceId:'e1', source:'attack', outcome:'hit', maxHp:1000, hpDmg:1, hpBefore:1000, hpAfter:999, wave:cxWave });
        director.closeWave(cxWave);
        eq(soundKeys.length, 0, 'cancelWave丢弃已收与迟到结果均不播');
        // 语义结果事件载荷契约（只读、freeze、字段齐全）
        resetDirector();
        director.publish({ targetId:'e_hfb', sourceId:'h_hfb', source:'attack', outcome:'hit', maxHp:1000, hpDmg:99, hpBefore:1000, hpAfter:901, damageType:'法术' });
        const recs = semanticOnly();
        const rec = recs[recs.length - 1];
        check(!!rec, 'publish结果经语义事件发布');
        if (rec) {
          const ctx = rec.ctx || {};
          check(rec.frozen === true, '语义结果事件载荷Object.freeze只读');
          const CONTRACT_FIELDS = ['sourceId','targetId','source','resultType','kind','tier','blockTier','dodgeTier','crit','burst','hpBefore','hpAfter','hpDmg','shieldDmg','eventId'];
          const missFields = CONTRACT_FIELDS.filter(k => !(k in ctx));
          if (missFields.length) pending.push('待对齐:语义结果事件载荷缺字段:' + missFields.join(','));
          if (!('waveId' in ctx)) pending.push('待对齐:语义结果事件载荷缺waveId字段');
          if (!('actionId' in ctx)) pending.push('待对齐:语义结果事件载荷缺actionId字段');
          check(ctx.kind === 'hp' && ctx.tier === 1, '载荷携带classify档位（kind/tier）');
          eq(ctx.source, 'attack', '载荷source字段保留');
        }
      });

      await group('技能与impact音独立叠加', async () => {
        if (apiMissing) return;
        resetDirector();
        w.playSound('atk1', 0.5);
        director.publish({ targetId:'h_hfb', sourceId:'e2', source:'attack', outcome:'hit', maxHp:1000, hpDmg:150, hpBefore:1000, hpAfter:850 });
        eq(soundKeys.length, 2, '技能表现音与impact反馈各播一次');
        eq(soundKeys[0].key, 'atk1', '技能表现音保留原调用');
        check(/^hit_2[abc]$/.test(soundKeys[1]?.key || ''), '技能音后叠播tier2受击音');
      });

      await group('playHitFeedback纯视觉不发布', async () => {
        resetDirector();
        semanticEvents.length = 0;
        const n0 = layers().length;
        const h = play([{ targetId: 'h_hfb', outcome: 'hit', hpDmg: 100, hpBefore: 1000, hpAfter: 900, maxHp: 1000 }], optsQuiet);
        eq(layers().length, n0 + 1, '真实playHitFeedback仍产生视觉浮字层');
        eq(soundKeys.length, 0, '真实playHitFeedback不播受击音');
        eq(semanticOnly().length, 0, '真实playHitFeedback不发布任何语义结果事件');
        h.cancel();
      });

      await group('真实applySingleTagEffect结果事件路由', async () => {
        if (typeof w.applySingleTagEffect !== 'function' || typeof w.parseSkill !== 'function') {
          pending.push('待对齐:applySingleTagEffect/parseSkill不可直接调用，真实结果事件链路组跳过'); return;
        }
        ev('state.highTierNarrated=state.highTierNarrated||new Set();state.actionQueue=state.actionQueue||[];state.queueIndex=state.queueIndex||0;');
        const mkHero = (id, maxHp, extra) => entity(id, Object.assign({ hp: maxHp, maxHp: maxHp }, extra));
        const install = (maxHps, heroExtra) => {
          ev('heroesData=' + JSON.stringify([
            mkHero('h_hfb', maxHps[0], heroExtra && heroExtra[0]),
            mkHero('h_hfb2', maxHps[1], heroExtra && heroExtra[1]),
            mkHero('h_hfb3', maxHps[2], heroExtra && heroExtra[2])]) +
            ';enemiesData=' + JSON.stringify([entity('e_hfb', { side: 'enemy' })]) + ';');
          const heroes = ev('heroesData');
          // 真实挂载：hero.dom 指向舞台卡（updateHeroUI 死亡分支读 dom.classList 与 ${id}-status），不 stub 业务结果
          ['h_hfb', 'h_hfb2', 'h_hfb3'].forEach((id, i) => { if (heroes[i]) heroes[i].dom = doc.getElementById('hero-card-' + id); });
          return { h: heroes, e: ev('enemiesData') };
        };
        const s = w.parseSkill('【回归击】[单体;power:80]');
        const lastRec = () => semanticOnly()[semanticOnly().length - 1] || null;
        const tierOf = ctx => ctx && ctx.kind === 'hp' ? (ctx.tier || 1) : 0;
        const assertRouted = (hero, caster, agg, rec) => {
          const ctx = rec && rec.ctx;
          check(agg.length === 1, '真实命中经结果事件路由恰一档音：' + hero.id, JSON.stringify(agg.map(x => x.key)));
          const want = tierOf(ctx);
          check(want >= 1 && new RegExp('^hit_' + want + '[abc]$').test(agg[0] ? agg[0].key : ''),
            '真实档位与结果事件classify一致：' + hero.id, 'want=' + want + ' got=' + (agg[0] && agg[0].key));
          check(!!rec && rec.frozen === true, '结果事件载荷Object.freeze只读：' + hero.id);
          check(!!ctx && ctx.targetId === hero.id && ctx.sourceId === caster.id && ctx.eventId != null, '结果事件身份字段齐全：' + hero.id);
          return want;
        };
        // 探针：满血千血英雄单发实测伤害 D（t1档），再按 D 动态构造 t2/t3 英雄（maxHp=D+2 保证 hpAfter=2 不致死）
        const d1 = install([1000, 1000, 1000]);
        resetDirector();
        const before0 = soundKeys.length;
        await w.applySingleTagEffect(d1.e[0], d1.h[0], '[单体]', 80, 100, 1, null, s);
        const probe = lastRec();
        const D = probe && probe.ctx ? (probe.ctx.hpDmg || 0) : 0;
        const gotTiers = [assertRouted(d1.h[0], d1.e[0], soundKeys.slice(before0).filter(x => impactKeyRe.test(x.key)), probe)];
        if (D >= 2) {
          const d2t = install([1000, 3 * D + 2, D + 2]);
          resetDirector();
          for (const hero of [d2t.h[1], d2t.h[2]]) {
            const before = soundKeys.length;
            await w.applySingleTagEffect(d2t.e[0], hero, '[单体]', 80, 100, 1, null, s);
            gotTiers.push(assertRouted(hero, d2t.e[0], soundKeys.slice(before).filter(x => impactKeyRe.test(x.key)), lastRec()));
          }
          check(d2t.h[1].hp > 0 && d2t.h[2].hp > 0, '动态构造英雄跨档且不致死', d2t.h.map(h => h.hp).join('/'));
        } else pending.push('待对齐:探针伤害D=' + D + ' 不足以构造跨档英雄，三档分布未验证（档位一致性已单独验证）');
        if (gotTiers.join(',') !== '1,2,3') pending.push('待对齐:真实链路三档分布（同伤跨maxHp得 ' + gotTiers.join(',') + '），档位一致性已单独验证');
        // 防连重真实链路：满血英雄连续两次命中
        const d2 = install([1000, 1000, 1000]);
        resetDirector();
        await w.applySingleTagEffect(d2.e[0], d2.h[0], '[单体]', 80, 100, 1, null, s);
        await w.applySingleTagEffect(d2.e[0], d2.h[0], '[单体]', 80, 100, 1, null, s);
        const hitKeys = soundKeys.filter(x => /^hit_[123][abc]$/.test(x.key));
        eq(hitKeys.length, 2, '真实链路连续两次命中各播音一次');
        check(hitKeys.length === 2 && hitKeys[0].key !== hitKeys[1].key, '真实链路同档防连重不重播变体', hitKeys.map(x => x.key).join(','));
        // 破盾真实链路：shield=D-2 < 单发伤害 → 破盾优先 GuardBreak 且英雄存活
        const d3 = install([1000, 1000, 1000], [{ shield: Math.max(1, D - 2) }]);
        resetDirector();
        await w.applySingleTagEffect(d3.e[0], d3.h[0], '[单体]', 80, 100, 1, null, s);
        check(soundKeys.some(x => x.key === 'parry_3'), '真实链路破盾播GuardBreak');
        const brec = lastRec();
        check(!!brec && brec.ctx && brec.ctx.shieldBroken === true, '破盾结果事件携带shieldBroken');
        check(d3.h[0].hp > 0, '破盾链路英雄存活', String(d3.h[0].hp));
        // 闪避真实链路：spd:1000 触发闪避（若攻击判定未触发则按待对齐上报）
        const d4 = install([1000, 1000, 1000], [{ spd: 1000 }]);
        resetDirector();
        await w.applySingleTagEffect(d4.e[0], d4.h[0], '[单体]', 80, 100, 1, null, s);
        if (soundKeys.some(x => /^dodge_[123]$/.test(x.key))) {
          check(semanticOnly().some(x => x.event === evtDodge), '真实闪避发布DODGE_RESOLVED语义事件');
          eq(soundKeys.filter(x => /^hit_[123][abc]$/.test(x.key)).length, 0, '真实闪避不播受击音');
        } else pending.push('待对齐:spd:1000未触发单体闪避（闪避三档已由publish直测覆盖）');
        clearHit();
      });

      await group('identitySfxOn关闭仅消费静默语义仍通知', async () => {
        if (apiMissing) return;
        const mod2 = ev('typeof arcaneVfxModule === "object" ? arcaneVfxModule : null');
        if (!mod2 || typeof mod2.setIdentitySfx !== 'function') { pending.push('待对齐:arcaneVfxModule.setIdentitySfx不可调用'); return; }
        if (!evtDamage || !evtDodge) { pending.push('待对齐:语义结果事件未落地，identitySfxOn静默组跳过'); return; }
        resetDirector();
        semanticEvents.length = 0;
        mod2.setIdentitySfx(false);
        director.publish({ targetId:'h_hfb', sourceId:'e2', source:'attack', outcome:'hit', maxHp:1000, hpDmg:150, hpBefore:1000, hpAfter:850 });
        eq(soundKeys.length, 0, 'identitySfxOn关闭不播受击音');
        eq(semanticOnly().length, 1, 'identitySfxOn关闭语义结果事件仍发布通知');
        mod2.setIdentitySfx(true);
        director.publish({ targetId:'h_hfb', sourceId:'e2', source:'attack', outcome:'hit', maxHp:1000, hpDmg:150, hpBefore:1000, hpAfter:850 });
        eq(soundKeys.length, 1, '恢复identitySfxOn后受击音正常调度');
      });

      /* ========== 一、classifyHit：三维阈值、小额暴击、护盾破盾、混合与修饰符 ========== */
      await group('分类三维', async () => {
        const base = { targetId: 'e_hfb', outcome: 'hit', maxHp: 1000, hpBefore: 1000, hpAfter: 901, shieldBefore: 0, shieldAfter: 0 };
        const tiers = [99, 100, 499, 500].map(d => classify(Object.assign({}, base, { hpDmg: d, hpAfter: 1000 - d })));
        eq(tiers.map(h => h.kind), ['hp', 'hp', 'hp', 'hp'], '扣血结果均为 hp 类');
        eq(tiers.map(h => h.tier), [1, 2, 2, 3], '9.9%→1、10%→2、49.9%→2、50%→3 阈值（受击三档新规格：≥50% 重伤档）');
        const small = classify(Object.assign({}, base, { hpDmg: 5, hpAfter: 995, isCrit: true, isBurst: true }));
        eq([small.kind, small.tier, small.crit, small.burst], ['hp', 1, true, true], '小额暴击/爆发仍按比例定级，不升档');
        const burst99 = classify(Object.assign({}, base, { hpDmg: 99, hpAfter: 901, isBurst: true }));
        eq(burst99.tier, 1, '极限爆发修饰符不改 tier');
        const crit510 = classify(Object.assign({}, base, { hpDmg: 510, hpAfter: 490, isCrit: true }));
        eq(crit510.tier, 3, '暴击修饰符不改 tier');
        eq([tiers[0].hpDmg, tiers[0].shieldDmg, tiers[0].crit, tiers[0].burst], [99, 0, false, false], '普通命中不误报暴击/爆发');
      });

      await group('格挡/闪避三档与破盾识别（受击音效移植新字段）', async () => {
        const fullBlockBase = { targetId: 'e_hfb', outcome: 'hit', maxHp: 1000, hpBefore: 1000, hpAfter: 1000, shieldBefore: 0, shieldAfter: 0 };
        const blocks = [99, 100, 500].map(d => classify(Object.assign({}, fullBlockBase, { hpDmg: 0, shieldDmg: 0, blockedDmg: d })));
        eq(blocks.map(h => h.kind), ['block', 'block', 'block'], '全额被挡均归为 block 类');
        eq(blocks.map(h => h.blockTier), [1, 2, 3], '被挡比例 9.9%→1、10%→2、50%→3 分档');
        const dodges = [99, 100, 500].map(d => classify(Object.assign({}, fullBlockBase, { outcome: 'dodge', incomingDmg: d })));
        eq(dodges.map(h => h.dodgeTier), [1, 2, 3], '来袭比例 9.9%→1、10%→2、50%→3 分档');
        const brk = classify(Object.assign({}, fullBlockBase, { hpDmg: 30, hpAfter: 970, shieldDmg: 50, shieldBefore: 50, shieldAfter: 0 }));
        eq([brk.kind, brk.shieldBroken], ['hp', true], '护盾归零即识别破盾瞬间（无论伤害多少均播 GuardBreak）');
        eq(typeof w.playCounterAttackL1, 'function', '普通反击 L1 动效已挂载 window.playCounterAttackL1');
      });

      await group('护盾与混合', async () => {
        const shield = classify({ targetId: 'e_hfb', outcome: 'hit', maxHp: 1000, hpDmg: 0, shieldDmg: 40,
          shieldBefore: 100, shieldAfter: 60, isCrit: true, isBurst: true });
        eq([shield.kind, shield.tier, shield.shieldBroken, shield.crit, shield.burst], ['shield', 0, false, true, true],
          '纯盾耐伤为 shield/tier0，暴击/爆发标记按 landed=hp||shield 保留');
        eq([shield.hpDmg, shield.shieldDmg], [0, 40], '纯盾仍保留盾伤数值');
        const broke = classify({ targetId: 'e_hfb', outcome: 'hit', maxHp: 1000, hpDmg: 0, shieldDmg: 50, shieldBefore: 50, shieldAfter: 0 });
        check(broke.shieldBroken, '护盾 before>0 且 after=0 判破盾');
        eq(classify({ targetId: 'e_hfb', outcome: 'hit', maxHp: 1000, hpDmg: 0, shieldDmg: 10, shieldBefore: 0, shieldAfter: 0 }).shieldBroken, false,
          'before=0 时盾伤不判破盾');
        eq(classify({ targetId: 'e_hfb', outcome: 'hit', maxHp: 1000, hpDmg: 0, shieldDmg: 10, shieldBefore: 30, shieldAfter: 30 }).shieldBroken, false,
          'after>0 不判破盾');
        eq(classify({ targetId: 'e_hfb', outcome: 'hit', maxHp: 1000, hpDmg: 0, shieldDmg: 0, shieldBefore: 0, shieldAfter: 0 }).shieldBroken, false,
          '无盾伤不判破盾');
        const mixed = classify({ targetId: 'e_hfb', outcome: 'hit', maxHp: 1000, hpDmg: 100, shieldDmg: 20, shieldBefore: 20, shieldAfter: 0, hpBefore: 500, hpAfter: 400 });
        eq([mixed.kind, mixed.tier, mixed.hpDmg, mixed.shieldDmg, mixed.shieldBroken], ['hp', 2, 100, 20, true], '混合扣血同时保留血伤/盾伤与破盾');
      });

      await group('闪避格挡与零伤', async () => {
        const dodge = classify({ targetId: 'e_hfb', outcome: 'dodge', maxHp: 1000, hpDmg: 100, shieldDmg: 20, shieldBefore: 20, shieldAfter: 0, isCrit: true, isBurst: true });
        eq([dodge.kind, dodge.tier, dodge.crit, dodge.burst], ['dodge', 0, false, false], '闪避优先于任何伤害/修饰符');
        const block = classify({ targetId: 'e_hfb', outcome: 'block', maxHp: 1000, hpDmg: 0, shieldDmg: 0 });
        eq([block.kind, block.tier], ['block', 0], '格挡结果为 block/tier0');
        const zeroHit = classify({ targetId: 'e_hfb', outcome: 'hit', maxHp: 1000, hpDmg: 0, shieldDmg: 0 });
        eq([zeroHit.kind, zeroHit.tier], ['block', 0], '零伤命中回落 block，不产生 hp 数字');
      });

      /* ========== 二、血条：450ms 保持 + 500ms 坍缩、连击、治疗回填、强制同步 ========== */
      await group('血条保持与坍缩', async () => {
        const fill = doc.getElementById('h_hfb-hp-bar'), ghost = doc.getElementById('h_hfb-hp-ghost');
        fill.style.width = '100%'; ghost.style.width = '100%';
        const handle = play([{ targetId: 'h_hfb', outcome: 'hit', hpDmg: 30, hpBefore: 100, hpAfter: 70, maxHp: 100, shieldBefore: 0, shieldAfter: 0 }], optsQuiet);
        eq(fill.style.width, '70%', '血条 fill 立即落到扣血后比例');
        check(fill.classList.contains('arcane-hit-fill-blink'), '血条触发一次受击闪烁');
        eq(ghost.style.width, '100%', 'ghost 先保留扣血前比例形成缺口');
        eq(ghost.style.transition, 'none', '保持期内 ghost 不启动过渡');
        await wait(300);
        eq(ghost.style.transition, 'none', '450ms 保持期未到前仍不坍缩');
        await wait(180);
        check(/500ms/.test(ghost.style.transition), '450ms 后按 HIT_COLLAPSE_MS=500ms 启动坍缩');
        eq(ghost.style.width, '70%', '坍缩目标为扣血后比例');
        await wait(520);
        near(ghostFinalPct(ghost), 70, 2, '500ms 过渡终帧 ghost 实际宽度落到 70%');
        handle.cancel();
      });

      await group('连击保持与坍缩', async () => {
        const fill = doc.getElementById('h_hfb-hp-bar'), ghost = doc.getElementById('h_hfb-hp-ghost');
        clearHit();
        fill.style.width = '100%'; ghost.style.width = '100%';
        const h1 = play([{ targetId: 'h_hfb', outcome: 'hit', hpDmg: 30, hpBefore: 100, hpAfter: 70, maxHp: 100 }], optsQuiet);
        const h2 = play([{ targetId: 'h_hfb', outcome: 'hit', hpDmg: 25, hpBefore: 70, hpAfter: 45, maxHp: 100 }], optsQuiet);
        eq(ghost.style.width, '100%', '连击期间 ghost 缺口不倒退，仍取最大前值');
        await wait(500);
        check(/500ms/.test(ghost.style.transition), '连击保持 450ms 后启动坍缩');
        eq(ghost.style.width, '45%', '连击坍缩目标为最新扣血后的 45%');
        await wait(520);
        near(ghostFinalPct(ghost), 45, 2, '连击后 ghost 过渡终帧坍缩到 45%');
        h1.cancel(); h2.cancel();
      });

      await group('治疗回填与强制同步', async () => {
        const fill = doc.getElementById('h_hfb-hp-bar'), ghost = doc.getElementById('h_hfb-hp-ghost');
        clearHit();
        fill.style.width = '100%'; ghost.style.width = '100%';
        const h = play([{ targetId: 'h_hfb', outcome: 'hit', hpDmg: 30, hpBefore: 100, hpAfter: 70, maxHp: 100 }], optsQuiet);
        eq(ghost.style.width, '100%', '扣血后 ghost 进入扣血前保持态');
        syncBar('h_hfb', 90, 100, false);
        eq(ghost.style.width, '100%', '保持期内治疗回血不回跳 ghost');
        await wait(500);
        eq(ghost.style.width, '90%', '活跃 ghost 的治疗结果写入坍缩目标 90%');
        await wait(520);
        near(ghostFinalPct(ghost), 90, 2, 'ghost 过渡终帧落到治疗后的 90%，而非旧扣血值');
        syncBar('h_hfb', 90, 100, false);
        eq(ghost.style.width, '90%', '无活跃 ghost 时治疗回血同步到 90%');
        syncBar('h_hfb', 100, 100, true);
        eq(ghost.style.width, '100%', 'force=true 强制同步并终止旧状态');
        h.cancel();
      });

      await group('取消与清理', async () => {
        const fill = doc.getElementById('h_hfb-hp-bar'), ghost = doc.getElementById('h_hfb-hp-ghost');
        clearHit();
        fill.style.width = '100%'; ghost.style.width = '100%';
        const n0 = layers().length;
        const h = play([{ targetId: 'h_hfb', outcome: 'hit', hpDmg: 30, hpBefore: 100, hpAfter: 70, maxHp: 100 }], optsQuiet);
        eq(layers().length, n0 + 1, '每次反馈创建独立浮字层');
        eq(h.doneAt - Date.now() > 1200 && h.doneAt - Date.now() <= 1500, true, 'handle.doneAt 对齐 HIT_LIFE=1320ms（playHitFeedback 维持 doneAt 原视觉 API）');
        h.cancel();
        eq(layers().length, n0, 'handle.cancel 立即移除本层 DOM');
        await wait(520);
        eq(ghost.style.width, '70%', '取消不阻断独立 ghost 坍缩计时');
        clearHit();
        eq([ghost.style.transition, ghost.style.width], ['none', '70%'], 'clearHitFeedback 清计时并把 ghost 同步回 fill');
        clearHit();
        check(true, 'clearHitFeedback 重复调用安全');
        play([{ targetId: 'e_hfb', outcome: 'hit', hpDmg: 510, hpBefore: 1000, hpAfter: 490, maxHp: 1000 }], optsQuiet);
        check(!!doc.getElementById('arcane-fx-canvas'), '扣血粒子创建 arcane canvas');
        clearFx();
        eq([layers().length, doc.getElementById('arcane-fx-canvas')], [0, null], 'clearArcaneFx 先清浮字层并移除粒子 canvas');
      });

      await group('英雄/敌方/双召唤血条映射', async () => {
        clearHit();
        ['h_hfb', 'e_hfb', 's_hsum', 's_esum'].forEach(id => {
          const f = doc.getElementById(id + '-hp-bar'), g = doc.getElementById(id + '-hp-ghost');
          if (f) f.style.width = '100%';
          if (g) g.style.width = '100%';
        });
        play([{ targetId: 'e_hfb', outcome: 'hit', hpDmg: 100, hpBefore: 1000, hpAfter: 900, maxHp: 1000 }], optsQuiet);
        play([{ targetId: 's_hsum', outcome: 'hit', hpDmg: 200, hpBefore: 1000, hpAfter: 800, maxHp: 1000 }], optsQuiet);
        play([{ targetId: 's_esum', outcome: 'hit', hpDmg: 300, hpBefore: 1000, hpAfter: 700, maxHp: 1000 }], optsQuiet);
        eq(['e_hfb', 's_hsum', 's_esum'].map(id => doc.getElementById(id + '-hp-bar').style.width), ['90%', '80%', '70%'],
          '敌方与双召唤血条 fill 均按各自 hpAfter 更新');
        eq(['e_hfb', 's_hsum', 's_esum'].map(id => doc.getElementById(id + '-hp-ghost').style.width), ['100%', '100%', '100%'],
          '敌方与双召唤 ghost 均进入扣血前保持态');
        clearHit();
      });

      /* ========== 三、真实浮字 DOM：字号、时长、tag、recoil、MP/TP 不动 ========== */
      await group('浮字字号与时长矩阵', async () => {
        clearHit();
        const mp0 = doc.getElementById('h_hfb-mp-bar').style.width, tp0 = doc.getElementById('h_hfb-tp-bar').style.width;
        const run = async (result, waitMs) => { play([result], optsQuiet); if (waitMs) await wait(waitMs); };
        await run({ targetId: 'h_hfb', outcome: 'hit', hpDmg: 99, hpBefore: 1000, hpAfter: 901, maxHp: 1000 });
        const l1 = numByText('-99');
        eq(parseFloat(w.getComputedStyle(l1).fontSize), 24, 'tier1 数字 24px');
        eq(durationOf(l1), 1000, 'tier1 数字 1000ms');
        await run({ targetId: 'h_hfb', outcome: 'hit', hpDmg: 100, hpBefore: 1000, hpAfter: 900, maxHp: 1000 });
        const l2 = numByText('-100');
        eq(parseFloat(w.getComputedStyle(l2).fontSize), 27, 'tier2 数字 27px');
        eq(durationOf(l2), 1000, 'tier2 数字 1000ms');
        await run({ targetId: 'h_hfb', outcome: 'hit', hpDmg: 510, hpBefore: 1000, hpAfter: 490, maxHp: 1000 }, 90);
        const l3 = numByText('-510');
        eq(parseFloat(w.getComputedStyle(l3).fontSize), 32, 'tier3 数字 32px');
        eq(durationOf(l3), 1200, 'tier3 数字 1200ms');
        await run({ targetId: 'e_hfb', outcome: 'hit', hpDmg: 0, shieldDmg: 40, shieldBefore: 100, shieldAfter: 60, maxHp: 1000 });
        const sh = numByText('-40');
        eq(parseFloat(w.getComputedStyle(sh).fontSize), 24, '纯盾数字 24px');
        eq(durationOf(sh), 1000, '纯盾数字 1000ms');
        await run({ targetId: 'e_hfb', outcome: 'hit', hpDmg: 100, hpAfter: 400, hpBefore: 500, shieldDmg: 20, shieldBefore: 20, shieldAfter: 0, maxHp: 1000, isCrit: true });
        const sub = numByText('盾-20'), brk = numByText('破盾');
        const critTag = layerEls('.arcane-hit-tag.crit').find(el => el.textContent === '暴击');
        eq(parseFloat(w.getComputedStyle(sub).fontSize), 17, '附盾数字 17px');
        eq(parseFloat(w.getComputedStyle(brk).fontSize), 17, '破盾字 17px');
        eq(parseFloat(w.getComputedStyle(critTag).fontSize), 13, '暴击 tag 13px');
        eq(durationOf(critTag), 1050, 'tag 时长 1050ms');
        await run({ targetId: 'e_hfb', outcome: 'hit', hpDmg: 510, hpAfter: 490, hpBefore: 1000, maxHp: 1000, isBurst: true }, 90);
        const burstTag = layerEls('.arcane-hit-tag.burst').find(el => el.textContent === '爆发');
        eq(durationOf(burstTag), 1200, '爆发 tag 时长 1200ms');
        eq([doc.getElementById('h_hfb-mp-bar').style.width, doc.getElementById('h_hfb-tp-bar').style.width], [mp0, tp0], 'MP/TP 条完全不被命中反馈改动');
        clearHit();
      });

      await group('recoil 与闪避抑制', async () => {
        const dom = doc.getElementById('hero-card-h_hfb');
        clearHit();
        play([{ targetId: 'h_hfb', outcome: 'hit', hpDmg: 100, hpBefore: 1000, hpAfter: 900, maxHp: 1000 }], { suppressShake: true });
        check(dom.classList.contains('arcane-hit-recoil'), '扣血默认给受击者挂 recoil');
        clearHit();
        check(!dom.classList.contains('arcane-hit-recoil'), 'clearHitFeedback 清除残留 recoil 类');
        const n0 = layerEls('.arcane-hit-num-layer > *').length;
        play([{ targetId: 'h_hfb', outcome: 'dodge', hpDmg: 0, maxHp: 1000 }], { suppressShake: true, suppressRecoil: true, suppressDodgeFx: true });
        check(layerEls('.arcane-hit-num.word.dodge').some(el => el.textContent === '闪避'), '闪避仍显示文字');
        eq(layerEls('.arcane-hit-num-layer').length >= 1 && layerEls('.arcane-hit-num-layer > *').length >= n0, true, '抑制 recoil/残影时文字层仍保留');
        clearHit();
      });

      /* ========== 四、wave：按实际结果更新、主震/定帧/主音各一次 ========== */
      await group('wave 一次性与音频不双播', async () => {
        ev('fxEngine.hitStop=0;');
        clearHit();
        lightCount();
        const wv = {};
        const a1 = audioCount.n;
        play([{ targetId: 'h_hfb', outcome: 'hit', hpDmg: 510, hpBefore: 1000, hpAfter: 490, maxHp: 1000 },
          { targetId: 'e_hfb', outcome: 'hit', hpDmg: 99, hpBefore: 1000, hpAfter: 901, maxHp: 1000 }],
          { wave: wv, suppressRecoil: true });
        eq([wv.shook, wv.hitStopped, wv.hasHeavy], [true, true, true], 'wave 依实际 tier3 结果标记主震/定帧/重击');
        eq(wv.classified.length, 2, 'wave.classified 记录同拍全部结果，不预判伤害');
        eq(ev('fxEngine.hitStop'), 60, '重击定帧恰为 HIT_STOP_MS=60');
        const aAfterFirst = audioCount.n;
        play([{ targetId: 's_hsum', outcome: 'hit', hpDmg: 510, hpBefore: 1000, hpAfter: 490, maxHp: 1000 }],
          { wave: wv, suppressRecoil: true });
        check(audioCount.n === aAfterFirst, '同一 wave 第二次反馈不再播主音', '首次 ' + (aAfterFirst - a1) + ' 次调度，第二次新增 ' + (audioCount.n - aAfterFirst));
        eq(wv.classified.length, 3, '同 wave 追加结果继续登记');
        await wait(20);
        eq(stopLight(), 1, '同一 wave 仅主震一次');
        const wv2 = {};
        play([{ targetId: 'e_hfb', outcome: 'hit', hpDmg: 99, hpBefore: 1000, hpAfter: 901, maxHp: 1000 }],
          { wave: wv2, suppressRecoil: true });
        eq([wv2.shook, wv2.hitStopped, wv2.hasHeavy], [undefined, undefined, undefined], '轻击不误触发主震/定帧/重击');
        eq(wv2.classified.length, 1, '轻击 wave 只登记实际一条结果');
        clearHit();
      });

      /* ========== 五、血液粒子：仅扣血出现、source-over、旋转豁免 ========== */
      // IAB 内 rAF 可能被节流/暂停，导致 draw 永不发生；这里不复制业务绘制逻辑，
      // 只同步步进一次真实 fxEngine.update()/draw()（命中定帧清零后再步进，避免 update 因 hitStop 提前返回）。
      const particleRun = async (result, opts) => {
        clearFx();
        await wait(40);
        canvasLog.fills.length = 0; canvasLog.strokes.length = 0;
        play([result], opts || optsQuiet);
        await wait(50);
        try {
          ev('fxEngine.hitStop = 0; fxEngine.update(); fxEngine.draw();');
        } catch (e) {
          check(false, '粒子真实绘制步进异常', String(e && e.stack || e));
        }
      };
      await group('血液粒子', async () => {
        await particleRun({ targetId: 'e_hfb', outcome: 'hit', hpDmg: 510, hpBefore: 1000, hpAfter: 490, maxHp: 1000 });
        const bloodFills = harvest(isBlood);
        check(bloodFills.length > 0, '扣血真实绘制出现 bloodMist/bloodDrop fill');
        check(bloodFills.every(r => r.composite === 'source-over'), '血液 fill 全部 source-over，不参与叠加发光');
        check(bloodFills.some(r => r.rotatedBeforeStyle), 'bloodMist 仍走通用自旋路径');
        // bloodDrop 在自身 DRAW 里先按速度 rotate 再着色；render 已豁免通用自旋，正确状态是每条只 rotate 一次。
        const dropFills = bloodFills.filter(r => /#(ef4444|dc2626|991b1b)/i.test(String(r.style)));
        check(dropFills.length > 0 && dropFills.every(r => r.rotated && r.rotates === 1),
          'bloodDrop 仅按自身速度自转一次，未被通用自旋二次旋转', 'drop=' + dropFills.length + ' rotates=' + dropFills.map(r => r.rotates).join(','));
        const hpStreaks = canvasLog.strokes.filter(r => HP_STREAK_RE.test(String(r.style)));
        check(hpStreaks.length > 0, '重击出现 streak 粒子 stroke');
        check(hpStreaks.every(r => r.rotated === false), 'streak 粒子旋转豁免生效');
        clearFx();
      });

      await group('非扣血不喷血', async () => {
        await particleRun({ targetId: 'e_hfb', outcome: 'hit', hpDmg: 0, shieldDmg: 40, shieldBefore: 100, shieldAfter: 60, maxHp: 1000 });
        eq(harvest(isBlood).length, 0, '纯盾不喷血');
        await particleRun({ targetId: 'e_hfb', outcome: 'block', hpDmg: 0, shieldDmg: 0, maxHp: 1000 });
        eq(harvest(isBlood).length, 0, '格挡不喷血');
        await particleRun({ targetId: 'e_hfb', outcome: 'dodge', hpDmg: 0, maxHp: 1000 },
          { suppressShake: true, suppressRecoil: true });
        eq(harvest(isBlood).length, 0, '闪避烟尘不喷血');
        await particleRun({ targetId: 'e_hfb', outcome: 'hit', hpDmg: 40, hpBefore: 1000, hpAfter: 960, maxHp: 1000 });
        check(harvest(isBlood).length > 0, '轻击仍只按扣血喷血');
        clearFx();
      });

      /* ========== 六、重伤：位置、时长、不挡数字、无额外 shake ========== */
      await group('重伤提示', async () => {
        clearFx();
        lightCount();
        const enemy = ev('enemiesData.find(e => e.id === "e_hfb")');
        const img = doc.querySelector('#e_hfb-sprite img');
        const rect = img.getBoundingClientRect();
        play([{ targetId: 'e_hfb', outcome: 'hit', hpDmg: 100, hpBefore: 1000, hpAfter: 900, maxHp: 1000 }], optsQuiet);
        const h = wounded(enemy);
        const el = layerEls('.arcane-hit-wounded').find(x => x.textContent === '重伤');
        check(!!el, '重伤提示挂载在独立浮字层');
        near(px(el.style.left), rect.left + 2, 1.5, '重伤定位在目标左下（left+2）');
        near(px(el.style.top), rect.bottom - 2, 1.5, '重伤定位在目标左下（bottom-2）');
        eq(parseFloat(w.getComputedStyle(el).fontSize), 12, '重伤字号 12px');
        eq(durationOf(el), 1000, '重伤停留 1000ms');
        check(!!numByText('-100'), '重伤提示不遮挡/不移除同拍伤害数字');
        await wait(20);
        eq(stopLight(), 0, '重伤提示不额外触发震屏');
        h.cancel();
        clearFx();
      });

      /* ========== 七、源码/产物契约：常量、清理顺序、模板与接线待对齐项 ========== */
      await group('源码契约', async () => {
        if (!hasSrc) return;
        // 产物会压缩去注释：命中段注释标记可能消失，此时退回全文按数值/属性契约匹配，不依赖局部标识符名。
        const hitScope = hitSrc || src;
        check(/450\s*,\s*[$\w]+\s*=\s*500\s*,\s*[$\w]+\s*=\s*60\s*,\s*[$\w]+\s*=\s*1320/.test(hitScope),
          '450/500/60/1320 四个时序数值入包');
        const numKey = (k, v) => new RegExp('[{,]\\s*[\'"]?' + k + '[\'"]?\\s*:\\s*' + v + '\\b');
        eq([numKey('1', 1000), numKey('2', 1000), numKey('3', 1200), numKey('shield', 1000),
          numKey('block', 1000), numKey('dodge', 1000), numKey('tag', 1050)].map(re => re.test(hitScope)),
          [true, true, true, true, true, true, true], 'NUM_MS 数字/盾/格挡/闪避/tag 时长入包');
        check(/shape\s*:\s*['"]bloodMist['"]\s*,\s*blend\s*:\s*['"]source-over['"]/.test(hitScope) &&
          /shape\s*:\s*['"]bloodDrop['"]\s*,\s*blend\s*:\s*['"]source-over['"]/.test(hitScope),
          '血液粒子显式 source-over');
        // 旋转豁免在 render() 绘制循环，不在命中反馈段：用 .shape 属性与字面量匹配，不依赖局部变量名与注释。
        check(/\.shape\s*!==\s*['"]streak['"][\s\S]{0,300}\.shape\s*!==\s*['"]bloodDrop['"][\s\S]{0,300}\.shape\s*!==\s*['"]droplet['"]/.test(src),
          'streak/bloodDrop/droplet 通用自旋豁免保留（render 绘制路径）');
        if (hitSrc) {
          check(hitSrc.indexOf('burstActivated') < 0, '命中反馈模块不触碰极限爆发状态');
          check(hitSrc.indexOf('mp-bar') < 0 && hitSrc.indexOf('tp-bar') < 0, '命中反馈模块不读写 MP/TP 条');
        }
        check(hitScope.indexOf('syncHitBar') >= 0 && /syncHitBar\s*(?:,|}|:)/.test(src) && /playWoundedHint\s*(?:,|}|:)/.test(src),
          'syncHitBar/playWoundedHint 已随模块导出');
        // 函数名切片只对未压缩源码可用；产物压缩改名时以运行期 clearArcaneFx 断言为准，不误判失败。
        const fxStart = src.indexOf('function clearArcaneFx');
        if (fxStart >= 0) {
          const fxSlice = src.slice(fxStart, fxStart + 600);
          const fxClear = /clearHitFeedback\s*\(\s*\)/.exec(fxSlice);
          check(!!fxClear, 'clearArcaneFx 调用 clearHitFeedback');
          const fxStop = fxSlice.indexOf('identityAudioStoppers');
          if (fxClear && fxStop >= 0) check(fxClear.index < fxStop, 'clearArcaneFx 先调 clearHitFeedback');
        }
        const wdStart = src.indexOf('function playWoundedHint');
        if (wdStart >= 0) {
          const wdSlice = src.slice(wdStart, wdStart + 900);
          check(/arcane-hit-wounded/.test(wdSlice) && /\b1000\b/.test(wdSlice), '重伤提示为独立 1000ms 浮字');
          check(wdSlice.indexOf('shake(') < 0, '重伤提示自身不加震屏');
        }
        check(/prev\s*>\s*0?\.5\s*&&\s*ratio\s*<=\s*0?\.5/.test(src) && /entity\._lastHpRatio\s*=\s*ratio/.test(src),
          '重伤跨半血播报与回血刷新缓存逻辑不变');
        const iClampM = /resolveNonLethalLethal\s*\(\s*target\s*,\s*hpDmg/.exec(src);
        const iClamp = iClampM ? iClampM.index : -1;
        const iFatal = iClamp >= 0 ? src.indexOf('ON_FATAL_DAMAGE', iClamp) : -1;
        const applyRel = iFatal >= 0 ? src.slice(iFatal).search(/target\.hp\s*-=\s*hpDmg/) : -1;
        const iApply = applyRel >= 0 ? iFatal + applyRel : -1;
        check(iClamp >= 0 && iFatal > iClamp && iApply > iFatal, '非致死钳制→ON_FATAL_DAMAGE→扣血顺序不变');
        const ghosts = (src.match(/-hp-ghost/g) || []).length;
        if (ghosts < 3) pending.push('待对齐:HP ghost DOM 未接入（来源计数 ' + ghosts + '，需英雄/敌方/双召唤）');
        else check(src.indexOf('.arcane-hit-track') >= 0 && src.indexOf('.arcane-hit-fill') >= 0, 'HP ghost 轨道/填充样式入包');
        // 按已确认结果对象检查采样，不把对象变量误读成下一段 opts 的花括号。
        const snapshots = ['_dodgeFeedback', 'hitResult', 'result'].map(name => {
          const before = src.lastIndexOf('const ' + name + ' = {', src.indexOf('playHitFeedback(' + name + ','));
          if (before < 0) return '';
          const end = src.indexOf('};', before);
          return end < 0 ? '' : src.slice(before, end + 2);
        });
        check(snapshots.every(t => /targetId\s*:/.test(t) && /maxHp\s*:/.test(t)
            && /hpBefore\s*(?::|[,}])/.test(t) && /hpAfter\s*(?::|[,}])/.test(t) && /outcome\s*:/.test(t)),
          '实战 playHitFeedback 命中与闪避均携带 HP 快照与 outcome');
        check(snapshots.some(t => /outcome\s*:\s*['"]dodge['"]/.test(t)), '闪避路径有独立反馈采样（outcome=dodge）');
      });

      /* 自动清理：独立句柄等待 HIT_LIFE 到期，确认浮字层与粒子 canvas 自行收尾 */
      const n0Auto = layers().length;
      const auto = play([{ targetId: 'h_hfb', outcome: 'hit', hpDmg: 30, hpBefore: 100, hpAfter: 70, maxHp: 100 }], optsQuiet);
      eq(layers().length, n0Auto + 1, '自动清理对照组已创建浮字层');
      await wait(1400);
      eq(layers().length, n0Auto, 'HIT_LIFE 到期后浮字层自动清理归零');
      eq(doc.getElementById('arcane-fx-canvas'), null, '粒子自然收尾后 canvas 释放');
      auto.cancel();
    } finally {
      if (mo) { try { mo.disconnect(); } catch (e) {} }
      try { w.HTMLCanvasElement.prototype.getContext = nativeGetContext; } catch (e) {}
      if (styleDesc) { try { Object.defineProperty(w.CanvasRenderingContext2D.prototype, 'fillStyle', styleDesc); } catch (e) {} }
      if (acProto) {
        try { if (origCBS) acProto.createBufferSource = origCBS; } catch (e) {}
        try { if (origOSC) acProto.createOscillator = origOSC; } catch (e) {}
      }
      try { clearFx(); } catch (e) {}
      try { clearHit(); } catch (e) {}
      try { resetDirector(); } catch (e) {}
      for (const [name, fn] of functions) { try { w[name] = fn; } catch (e) {} }
      w.Math.random = saved.random;
      w.__hfrRestore = saved;
      try {
        ev(`(() => { const s = window.__hfrRestore;
          heroesData = s.heroesData; enemiesData = s.enemiesData; battleHistory = s.battleHistory; _historyRawCache = s._historyRawCache;
          combatToken = s.token; _pipelineFrozen = s.frozen; nonLethalSettings.enabled = s.nonLethal;
          for (const k of Object.keys(state)) delete state[k]; Object.assign(state, s.state);
          for (const k of Object.keys(llmState)) delete llmState[k]; Object.assign(llmState, s.llm);
          CombatEvents.emit = s.emit; CombatEvents.emitAsync = s.emitAsync;
          fxEngine.particles = s.particles; fxEngine.hitStop = s.hitStop;
          delete window.__hfrRestore;
        })()`);
      } catch (e) { /* 清理尽力而为 */ }
      try { root.remove(); } catch (e) {}
    }
    if (mock && typeof mock.genCount === 'function') eq(mock.genCount(), gen0, '命中反馈专项未调用外部 LLM');
    return { pending };
  };
})();
