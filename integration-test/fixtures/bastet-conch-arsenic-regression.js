/* 芭斯特的猫眼石 / 奇异海螺 / 砷弹射击 + 灵风术真音改版 + 纯近战排位瞄准/顶盾 回归。
   挂载真实 w 的 index 业务 API（isArcaneSkillFx / playArcaneSkillFx / clearArcaneFx /
   setRowTargetingCues / clearRowAimCues / syncRowTargetingCues / playRowBlockImpact /
   handleTargetClick / entityVisualRect / getEntitySpriteDom 全走真实实现）。
   仅 stub 底层媒体出口：window.playSound 与 CombatAudioMixer.play 捕获 key/vol/rate/opts
   （rate 在第 3 参 e.rate，durCap 映射 opts.maxDurSec），返回可调用 stop 函数并带 pending 的
   ready/started/done（据此真实验证 owner 止音与 S.sampleAudios 全局清理）。
   Element.animate 原型捕获记录关键帧/时长/取消次数（按引用恢复）；document.createElement('video')
   捕获 v.src 与 setAttribute('src') 并模拟媒体底层 loadedmetadata/onPlay（按引用恢复）。
   虚拟时钟同步替换 setTimeout/setInterval/Date.now/performance.now（按引用恢复），
   TICK_CAP 单次 flush 步数熔断。各组前后真实 clearArcaneFx + await 微任务 + resetClock +
   clearMediaEvents，保证 S.sampleAudios 隔离，cancel 断言不因前组尾音残留虚高。
   临时舞台用真实 getEntitySpriteDom 可命中 id（hero-card-${id} / ${id}-sprite），
   头像 DOM 用 entityVisualRect 验证可视矩形不含血条。ARCANE_TAGS 与 identitySfxOn 均为
   IIFE 词法变量，不 ev 读写变量名（ARCANE_TAGS 仅求匹配的数组 RHS；采样走 playItemSample，
   不受 identitySfxOn 门控）。临时改写 heroesData/enemiesData/state/llmState/CombatEvents/
   localStorage/classType 等在 finally 全部恢复（含 fxEngine.hitStop/lastDt/particles）。
   source 静态切片仅作辅助契约；未落地项按 pending 上报，不计为夹具崩溃。 */
(function () {
  'use strict';
  window.runBastetConchArsenicRegression = async function ({ w, check, eq, mock, source } = {}) {
    const ev = code => w.eval(code);
    const pending = [];
    const note = msg => { if (pending.indexOf(msg) < 0) pending.push(msg); };
    const soft = (cond, name, reason) => {
      if (cond) { check(true, name); return true; }
      note(name + (reason ? ' — ' + reason : ''));
      check(false, name + '（待对齐：' + (reason || '接口/行为未落地') + '）');
      return false;
    };
    if (typeof check !== 'function' || typeof eq !== 'function') throw new Error('runBastetConchArsenicRegression 需要 check/eq 注入');

    /* ---------- 接口与模块对象落地检查 ---------- */
    const coreApi = ['isArcaneSkillFx', 'playArcaneSkillFx', 'clearArcaneFx'];
    const missingCore = coreApi.filter(name => typeof w[name] !== 'function');
    eq(missingCore, [], '芭斯特/海螺/砷弹回归核心接口存在');
    if (missingCore.length) return { pending: missingCore.map(n => '待对齐:' + n), renderSkipped: true };
    const mix = ev('CombatAudioMixer');
    if (!mix || typeof mix.classify !== 'function' || typeof mix.play !== 'function') note('待对齐:CombatAudioMixer(classify/play) — 需经页面词法作用域 ev 获取');
    const itemFxTable = ev('typeof ITEM_SKILL_FX !== "undefined" && ITEM_SKILL_FX') || null;
    const webmTable = ev('typeof WEBM_FX_REGISTRY !== "undefined" && WEBM_FX_REGISTRY') || null;
    if (!itemFxTable) note('待对齐:ITEM_SKILL_FX 全局表不可读');
    const rowApi = ['setRowTargetingCues', 'clearRowAimCues', 'syncRowTargetingCues', 'playRowBlockImpact'];
    const missingRow = rowApi.filter(name => typeof w[name] !== 'function');
    const hasRow = missingRow.length === 0;
    soft(hasRow, '纯近战排位接口存在', missingRow.join('/') + ' 未落地');

    /* ---------- source 静态契约（辅助，不复制业务实现） ---------- */
    const src = typeof source === 'string' ? source : '';
    if (!src) note('静态跳过:主harness未传入source（运行期组照常执行）');
    else {
      const tags = ['芭斯特的猫眼石', '奇异海螺', '砷弹射击'];
      tags.forEach(t => { if (src.indexOf(t) < 0) note('静态未落地:分派/注册缺少 ' + t); });
      const atMatch = src.match(/ARCANE_TAGS\s*=\s*(\[[\s\S]{0,900}?\])/);
      if (!atMatch) note('静态未落地:ARCANE_TAGS 数组字面量不可读');
      else {
        let at = null;
        try { at = w.eval('(' + atMatch[1] + ')'); } catch (e) { /* 仅数组 RHS 求值，不引用词法变量名 */ }
        if (!at) note('静态未落地:ARCANE_TAGS 数组求值失败');
        else tags.concat(['灵风术']).forEach(t => { if (at.indexOf(t) < 0) note('静态未落地:ARCANE_TAGS 缺少 ' + t); });
      }
      ['bastetChime', 'bastetCast', 'bastetHeal', 'conchCharge', 'conchMist', 'windHum', 'crystalChime', 'dodgeWind', 'parryShield']
        .forEach(k => { if (src.indexOf("'" + k + "'") < 0 && src.indexOf('"' + k + '"') < 0) note('静态未落地:音键 ' + k); });
      if (src.indexOf("'mx_stygian_whoosh'") < 0) note('静态未落地:conchFog 复用键 mx_stygian_whoosh');
      if (src.indexOf('conchFog') >= 0) note('静态不一致:不应新增 conchFog 键（复用 mx_stygian_whoosh）');
      if (src.indexOf('conchHorn') >= 0) note('静态不一致:禁止 conchHorn');
      ['vfx_bastet_spiral.webm', 'vfx_bastet_pillar.webm', 'vfx_conch_vortex.webm', 'vfx_conch_abyss.webm', 'vfx_conch_ripple.webm']
        .forEach(f => { if (src.indexOf(f) < 0) note('静态未落地:WebM 素材 ' + f); });
      ['RpgCombat_Sound/vfx_bastet_harp_sweep.mp3', 'RpgCombat_Sound/vfx_magic_sparkle_whoosh.mp3', 'RpgCombat_Sound/vfx_bastet_sanctuary_heal.mp3',
        'RpgCombat_Sound/vfx_bowl_nepal_harmony.mp3', 'RpgCombat_Sound/vfx_conch_deep_bubbles.mp3',
        'vfx_wind_hum_mx1177.mp3', 'vfx_crystal_chime_mx2950.mp3', 'dodge_candidates/dodge_t3_c_cinematic_wind.mp3', 'parry_Shield3.wav']
        .forEach(p => { if (src.indexOf(p) < 0) note('静态未落地:真音路径 ' + p); });
      // 灵风 playLingFeng 切片：新真音入内、无合成音
      const lfAt = src.indexOf('function playLingFeng');
      if (lfAt < 0) note('静态未落地:playLingFeng');
      else {
        const nextFn = src.indexOf('\n    function ', lfAt + 10);
        const lf = src.slice(lfAt, nextFn > 0 ? nextFn : lfAt + 9000);
        ['windHum', 'crystalChime', 'aoe_wind_spin_fs772867', 'dodgeWind'].forEach(k => { if (lf.indexOf(k) < 0) note('静态未落地:playLingFeng 真音 ' + k); });
        if (/\bwhoosh\b|\btone\b|\bkick\b|\bcry\b|\bclick\b|createOscillator|OscillatorNode/i.test(lf)) note('静态不一致:playLingFeng 含 whoosh/tone/kick/cry/click/振荡器合成音');
      }
      // playArsenicShot 完整区间：禁虚线菱形/347/249、无 stroke-dasharray splat、droplet（source-over）存在
      const paAt = src.indexOf('function playArsenicShot');
      if (paAt < 0) note('静态未落地:playArsenicShot');
      else {
        const paNext = src.indexOf('\n    function ', paAt + 10);
        const pa = src.slice(paAt, paNext > 0 ? paNext : paAt + 12000);
        if (/\b347\b|\b249\b|虚线菱形/.test(pa)) note('静态不一致:playArsenicShot 区间含虚线菱形/347/249');
        if (pa.indexOf('stroke-dasharray') >= 0) note('静态不一致:playArsenicShot splat 含 stroke-dasharray 虚线');
        if (pa.indexOf('droplet') < 0 || pa.indexOf('source-over') < 0) note('静态未落地:playArsenicShot droplet（source-over 混合）');
      }
      ['ar-chg', 'ar-bullet', 'ar-boom', 'ar-splat'].forEach(cn => { if (src.indexOf(cn) < 0) note('静态未落地:砷弹视觉层 ' + cn); });
      // 海螺：420ms hitStop 与 580ms 眼部贴 portrait 静态辅助
      const conchAt = src.indexOf('function playStrangeConch');
      const conchNext = src.indexOf('\n    function ', conchAt + 10);
      const conchWin = conchAt >= 0 ? src.slice(conchAt, conchNext > 0 ? conchNext : conchAt + 10000) : '';
      if (!/after\(420,[\s\S]{0,100}?hitStop\s*=\s*80/.test(conchWin)) note('静态未落地:海螺 420ms hitStop=80');
      if (!conchWin.includes('entityVisualRect(tDom)') || !conchWin.includes('r.top + r.h * 0.36')) note('静态未落地:海螺 580ms 眼部贴 portrait');
      // 两条 SVG Q 与 Canvas 飞行分别引用同一 ctrlHeal / ctrlMana。
      const basAt = src.indexOf('function playBastetOpal');
      const basNext = src.indexOf('\n    function ', basAt + 10);
      const basWin = basAt >= 0 ? src.slice(basAt, basNext > 0 ? basNext : basAt + 12000) : '';
      if (!basWin.includes('Q${ctrlHeal.x},${ctrlHeal.y}') || !basWin.includes('Q${ctrlMana.x},${ctrlMana.y}') || !basWin.includes('ctrl: ctrlHeal') || !basWin.includes('ctrl: ctrlMana') || !basWin.includes('flyBezier(cp, tr.ctrl, tp, 470')) note('静态未落地:芭斯特双轨共享控制点');
      // 排项：远程掩护/对比UI/B-C切换
      ['arcane-row-front-ranged-haze', 'playRowCoverDeflect', 'rowDeflect', '对比演练', 'windPresetState', 'rowStyle']
        .forEach(s => { if (src.indexOf(s) >= 0) note('静态不一致:不应出现 ' + s); });
      // 近战排位：仅 melee 守卫（=== / !== 等价写法均接受）、prepare 覆盖、清理接线
      const syncUses = (src.match(/syncRowTargetingCues\(/g) || []).length;
      if (syncUses < 6) note('静态未落地:syncRowTargetingCues 接入点不足（' + syncUses + ' 处，需覆盖 attack/skill/item/grouped_item/release_charge + cancelTargeting/clearArcaneFx 清理）');
      const stAt = src.indexOf('function setRowTargetingCues');
      const stWin = stAt >= 0 ? src.slice(stAt, stAt + 400) : '';
      if (stWin && !/if\s*\(\s*mode\s*(?:===|!==)\s*(['"])melee\1/.test(stWin)) note('静态未落地:setRowTargetingCues 仅 melee 模式守卫');
      if (src.indexOf('arcane-row-back-locked') < 0) note('静态未落地:后排锁盾类 arcane-row-back-locked');
      if (src.indexOf('row-aim') < 0) note('静态未落地:row-aim 专用层');
      const htAt = src.indexOf('async function handleTargetClick');
      const htWin = htAt >= 0 ? src.slice(htAt, htAt + 4000) : '';
      if (htWin && htWin.indexOf('playRowBlockImpact') < 0 && htWin.indexOf('showLog') >= 0) note('静态未落地:handleTargetClick 拦截分支未接顶盾动效（仍走 showLog 文字）');
      const prAt = src.indexOf('function playRowBlockImpact');
      if (prAt < 0) note('静态未落地:playRowBlockImpact');
      else {
        const pw = src.slice(prAt, prAt + 3000);
        if (pw.indexOf('parryShield') < 0 || pw.indexOf('defUp') < 0) note('静态未落地:playRowBlockImpact 采样 parryShield/defUp');
        if (pw.indexOf('560') < 0) note('静态不一致:playRowBlockImpact 560ms 时长');
      }
    }

    /* ---------- 保存点（字段名与页面实际一致，按引用保存，不 JSON 函数） ---------- */
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;
    const saved = ev('({heroesData, enemiesData, battleHistory, _historyRawCache, token:combatToken, ' +
      'frozen:_pipelineFrozen, nonLethal:nonLethalSettings.enabled, allySpeak:llmState.allyAutoSpeak, ' +
      'enemySpeak:llmState.enemyAutoSpeak, state:{...state}, random:Math.random, particles:fxEngine.particles.slice(), ' +
      'hitStop:fxEngine.hitStop, lastDt:fxEngine.lastDt})');
    const lsSaved = {};
    try { for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); lsSaved[k] = w.localStorage.getItem(k); } } catch (e) { /* 隔离环境可能禁用 */ }
    const functions = new Map(); // name -> 原实现；'mix.play'、CombatEvents 特殊处理
    const replace = (name, fn) => { if (!functions.has(name)) functions.set(name, w[name]); w[name] = fn; };
    const errors = [];

    /* ---------- 虚拟时钟：timeout/interval + Date.now/performance.now 同步虚拟 ---------- */
    let vt = 0, timerSeq = 0, timers = [], ticks = 0, base = 0;
    const TICK_CAP = 6000; // 单次 flush 步数上限，防自续定时器无界循环
    const realDateNow = w.Date.now;
    const perfDescriptor = Object.getOwnPropertyDescriptor(w.performance, 'now');
    const fakeSetTimeout = (fn, ms) => { const id = { s: timerSeq++ }; timers.push({ id, at: vt + (ms || 0), fn, interval: 0 }); return id; };
    const fakeSetInterval = (fn, ms) => { const id = { s: timerSeq++ }; timers.push({ id, at: vt + Math.max(1, ms || 0), fn, interval: Math.max(1, ms || 0), n: 0 }); return id; };
    const fakeClear = id => { timers = timers.filter(t => t.id !== id); };
    const flush = ms => {
      const end = vt + ms;
      for (;;) {
        if (++ticks > TICK_CAP) { errors.push(new Error('虚拟时钟步数熔断 @' + vt + 'ms')); timers.length = 0; vt = end; break; }
        timers.sort((a, b) => a.at - b.at);
        const next = timers[0];
        if (!next || next.at > end) { vt = end; break; }
        vt = next.at;
        timers.shift();
        if (next.interval) { if (next.n++ < 120) timers.push({ id: next.id, at: vt + next.interval, fn: next.fn, interval: next.interval, n: next.n }); }
        try { next.fn(); } catch (e) { errors.push(e); }
      }
    };
    const nativeSetTimeout = w.setTimeout, nativeClearTimeout = w.clearTimeout;
    const nativeSetInterval = w.setInterval, nativeClearInterval = w.clearInterval;
    const resetClock = () => { timers = []; vt = 0; ticks = 0; base = realDateNow(); };
    const installClock = () => {
      resetClock();
      w.setTimeout = fakeSetTimeout; w.clearTimeout = fakeClear;
      w.setInterval = fakeSetInterval; w.clearInterval = fakeClear;
      w.Date.now = () => base + vt;
      Object.defineProperty(w.performance, 'now', { configurable: true, value: () => base + vt });
    };
    const restoreClock = () => {
      w.setTimeout = nativeSetTimeout; w.clearTimeout = nativeClearTimeout;
      w.setInterval = nativeSetInterval; w.clearInterval = nativeClearInterval;
      w.Date.now = realDateNow;
      if (perfDescriptor) Object.defineProperty(w.performance, 'now', perfDescriptor);
      else delete w.performance.now;
      timers = []; vt = 0;
    };

    /* ---------- 媒体出口捕获：cue = 可调用 stop 函数 + pending ready/started/done ---------- */
    let soundEvents = [], stopCount = 0, logCalls = [];
    const clearMediaEvents = () => { soundEvents = []; stopCount = 0; logCalls = []; videoSrcs.length = 0; animRecords.length = 0; animCancels.n = 0; };
    const makeCue = opts => {
      let stopped = false, settle;
      const cue = () => { if (stopped) return; stopped = true; stopCount++; settle(false); if (cue.owner && cue.owner.audioStoppers) cue.owner.audioStoppers.delete(cue); };
      cue.ready = Promise.resolve(true); cue.started = Promise.resolve(true);
      cue.done = new Promise(resolve => { settle = resolve; });
      if (opts && opts.owner && mix && typeof mix.bindOwner === 'function') mix.bindOwner(opts.owner, cue);
      return cue;
    };
    const installSoundCapture = () => {
      replace('playSound', (key, volume = 1, rate = 1, opts = {}) => {
        soundEvents.push({ key, url: '', t: vt, vol: volume, rate, opts: opts || {} });
        return makeCue(opts);
      });
      if (mix && typeof mix.play === 'function') {
        if (!functions.has('mix.play')) functions.set('mix.play', mix.play);
        mix.play = (url, opts = {}) => {
          soundEvents.push({ key: null, url: String(url), t: vt, vol: opts && opts.vol !== undefined ? opts.vol : undefined, rate: opts && opts.rate, opts: opts || {} });
          return makeCue(opts);
        };
      }
    };
    const beatsOf = key => soundEvents.filter(e => e.key === key);

    /* ---------- Element.animate 捕获（原型级，按引用恢复） ---------- */
    const animRecords = [], animCancels = { n: 0 };
    const realAnimate = w.Element && w.Element.prototype.animate;
    const installAnimateCapture = () => {
      if (!realAnimate) { note('环境缺 Element.prototype.animate，动画断言跳过'); return; }
      w.Element.prototype.animate = function (keyframes, options) {
        const anim = realAnimate.call(this, keyframes, options);
        animRecords.push({ target: this, keyframes, options, anim });
        const realCancel = anim.cancel.bind(anim);
        anim.cancel = () => { animCancels.n++; return realCancel(); };
        return anim;
      };
    };
    const restoreAnimate = () => { if (realAnimate) w.Element.prototype.animate = realAnimate; };

    /* ---------- video 元素捕获：v.src / setAttribute('src') 记录文件并模拟媒体底层 ---------- */
    const videoSrcs = [];
    const realCreate = w.document.createElement.bind(w.document);
    const installVideoCapture = () => {
      w.document.createElement = function (tag, opts) {
        const el = realCreate(tag, opts);
        if (String(tag).toLowerCase() === 'video') {
          let cur = '';
          const simulate = () => Promise.resolve().then(() => {
            try {
              if (typeof el.onloadedmetadata === 'function') el.onloadedmetadata();
              if (typeof el.onplay === 'function') el.onplay();
              el.dispatchEvent(new w.Event('loadedmetadata'));
              el.dispatchEvent(new w.Event('play'));
            } catch (e) { /* 底层事件缺失不阻断 */ }
          });
          try {
            Object.defineProperty(el, 'src', { configurable: true, get: () => cur, set: v => { cur = String(v); videoSrcs.push(cur); simulate(); } });
          } catch (e) { /* 已有不可配置 getter 时降级仅 setAttribute 钩子 */ }
          const realSetAttr = el.setAttribute.bind(el);
          el.setAttribute = (name, value) => { if (String(name).toLowerCase() === 'src') { videoSrcs.push(String(value)); simulate(); } return realSetAttr(name, value); };
        }
        return el;
      };
    };
    const restoreVideo = () => { w.document.createElement = realCreate; };

    /* ---------- 舞台：实体 id 命中 getEntitySpriteDom（hero-card-${id} / ${id}-sprite） ---------- */
    const root = w.document.createElement('div');
    root.id = 'bastet-conch-arsenic-regression-stage';
    root.style.cssText = 'position:fixed;left:40px;top:200px;width:720px;height:260px;pointer-events:none;';
    // 敌人框：血条在前、.portrait 在后 → entityVisualRect 顶部取 max(r.top, 血条bottom)，可视矩形不含血条
    const enemyBox = (id, x, row) =>
      '<div id="' + id + '-sprite" data-bca-row="' + row + '" style="position:absolute;left:' + x + 'px;top:40px;width:120px;height:130px;background:#1d2740;border:1px solid #f0abfc">' +
      '<div class="bca-hpbar" style="position:absolute;left:0;top:0;width:120px;height:16px;background:#7f1d1d">血条</div>' +
      '<div class="portrait" style="position:absolute;left:0;top:20px;width:120px;height:110px;background:#312e81"></div></div>';
    root.innerHTML =
      '<div id="hero-card-h_bca_c" style="position:absolute;left:10px;top:40px;width:160px;height:130px;background:#243047;border:1px solid #7dd3fc">' +
      '<div class="bca-hpbar" style="position:absolute;left:0;top:0;width:160px;height:16px;background:#7f1d1d">血条</div>' +
      '<div class="portrait" style="position:absolute;left:0;top:20px;width:160px;height:110px;background:#164e63"></div></div>' +
      enemyBox('e_bca_f0', 220, 'front') + enemyBox('e_bca_f1', 360, 'front') +
      enemyBox('e_bca_b0', 500, 'back') + enemyBox('e_bca_b1', 600, 'back');
    w.document.body.appendChild(root);
    const mk = (id, name, row, side) => ({ id, name, hp: 500, maxHp: 500, mp: 100, maxMp: 100, tp: 60, maxTp: 100, atk: 10, def: 0, spd: 1, shield: 0, actCount: 1, isAlive: true, isSubdued: false, buffs: [], skills: [], items: [], isSummon: false, row, side });
    const caster = mk('h_bca_c', '芭斯特施法者', 'front', 'hero');
    const frontGuards = [mk('e_bca_f0', '前排护卫甲', 'front', 'enemy'), mk('e_bca_f1', '前排护卫乙', 'front', 'enemy')];
    const backEnemies = [mk('e_bca_b0', '后排弩手', 'back', 'enemy'), mk('e_bca_b1', '后排法师', 'back', 'enemy')];
    const backTarget = backEnemies[0];
    // 页面侧真实引用（sync/playRowBlockImpact 需要实体对象引用，禁止 JSON 复制；try 内注入后赋值）
    let actorRef = null, backRef = null;

    /* ---------- 宿主 helper stub（窗口级与页面词法函数，按引用恢复；仅计数不触发 LLM） ---------- */
    ['updateHeroUI', 'updateEnemyUI', 'updateTeamBarrierUI', 'renderTurnQueue', 'triggerBarrierShatter',
      'tryTriggerEnemyLowHpSpeak', 'tryTriggerEnemyMolt', 'tryTriggerEnemyRage', 'tryTriggerEnemyLink',
      'triggerHighTierCombinedSpeak', 'triggerAllyHealSpeak', 'triggerAllyAutoSpeak', 'triggerEnemyAutoSpeak',
      'notifyManaSpent', 'spawnFocusOverlay', 'spawnChargeUpParticles', 'spawnHitFlash', 'triggerScreenShake',
      'spawnDodgeSmokeParticles', 'playAOEEffect', 'playCustomAudio', 'playRandomStandardGunshot',
      'playShotgunSound', 'addHistory', 'showLog', 'updateMenu', 'promptReaction', 'playEnemyFlinchAnim',
      'dealDamage', 'applyDamage', 'performAttack', 'resolveHit', 'executeAction']
      .forEach(name => { if (typeof w[name] === 'function') replace(name, function () { if (name === 'showLog') logCalls.push([].slice.call(arguments).join(' ')); }); });
    if (typeof w.playSVGEffect === 'function') replace('playSVGEffect', (dom, type) => { /* 仅计数通道，业务 SVG 保持真实 */ });

    const webmCanvasCount = () => w.document.querySelectorAll('canvas[data-arcane-fx="webm"]').length;
    const arcaneLayers = () => w.document.querySelectorAll('[data-arcane-fx]');
    const rowAimLayers = () => Array.from(w.document.querySelectorAll('[data-arcane-fx="row-aim"]'));
    const dispatch = tag => w.playArcaneSkillFx(tag, actorRef, [backRef], false, null);
    const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
    // 各组前后：真实 clearArcaneFx + await 微任务 + resetClock + clearMediaEvents（S.sampleAudios 隔离）
    let particleBaseline = [];
    const preGroup = async () => {
      w.clearArcaneFx();
      await settle();
      particleBaseline = ev('fxEngine.particles.slice()');
      resetClock();
      clearMediaEvents();
    };
    const runGroup = async (name, fn) => {
      await preGroup();
      try { await fn(); } catch (e) { check(false, name + '执行异常', String(e && e.stack || e)); }
      await preGroup();
    };

    /* ---------- 拍点断言（rate 在 playSound 第 3 参 e.rate） ---------- */
    const close = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.021 : tol);
    function assertBeat(name, key, at, spec) {
      const hits = beatsOf(key).filter(e => Math.abs(e.t - at) <= 6);
      if (!hits.length) { soft(false, name + ' @' + at + 'ms ' + key, '未捕获到该拍点（预解码/实现未落地）'); return; }
      const e = hits[0];
      check(close(e.vol, spec.vol), name + ' ' + key + '@' + at + 'ms vol=' + spec.vol + (close(e.vol, spec.vol) ? '' : '（实际 ' + e.vol + '）'));
      const o = e.opts || {};
      if (spec.rate !== undefined) check(close(Number(e.rate), spec.rate), name + ' ' + key + ' rate=' + spec.rate);
      if (spec.maxDurSec != null) check(close(Number(o.maxDurSec), spec.maxDurSec, 1e-6), name + ' ' + key + ' maxDurSec=' + spec.maxDurSec);
      if (spec.maxDurSec === null) check(!o.maxDurSec, name + ' ' + key + ' 无 maxDurSec 截断');
      if (spec.fadeOutSec !== undefined) check(close(Number(o.fadeOutSec), spec.fadeOutSec, 1e-6), name + ' ' + key + ' fadeOutSec=' + spec.fadeOutSec);
      if (spec.offsetSec !== undefined) check(close(Number(o.offsetSec), spec.offsetSec, 1e-6), name + ' ' + key + ' offsetSec=' + spec.offsetSec);
      if (spec.fadeInSec !== undefined) check(close(Number(o.fadeInSec), spec.fadeInSec, 1e-6), name + ' ' + key + ' fadeInSec=' + spec.fadeInSec);
      if (spec.pan !== undefined) check(close(Number(o.pan), spec.pan, 1e-6), name + ' ' + key + ' pan=' + spec.pan);
    }
    function noBeat(name, key) {
      const hits = beatsOf(key);
      check(hits.length === 0, name + ' 不触发 ' + key + (hits.length ? '（实际 ' + hits.length + ' 次）' : ''));
    }
    // cancel/clear 后无 DOM/动画/延时/粒子残留（hitStop 由 finally 统一还原，此处仅 soft 提示）
    function assertNoResidue(name, particles0 = particleBaseline.length) {
      eq(arcaneLayers().length, 0, name + ' 后 data-arcane-fx 层零残留');
      eq(timers.length, 0, name + ' 后延时队列零残留');
      const remaining = ev('fxEngine.particles.slice()');
      eq(remaining.length, particles0, name + ' 后粒子回到基线');
      check(particleBaseline.every(p => remaining.includes(p)), name + ' 不误删其他模块的既有粒子');
    }

    try {
      installClock();
      installSoundCapture();
      installAnimateCapture();
      installVideoCapture();
      ev('combatToken={};_pipelineFrozen=false;nonLethalSettings.enabled=false;llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;state.isGameStarted=false;state.actionQueue=[];state.queueIndex=0;');
      // 临时舞台实体入表（finally 恢复原引用），随后取页面侧真实对象引用
      ev('heroesData=[' + JSON.stringify(caster) + ']');
      ev('enemiesData=[' + frontGuards.concat(backEnemies).map(e => JSON.stringify(e)).join(',') + ']');
      actorRef = ev('heroesData[0]');
      backRef = ev('enemiesData[2]');
      const ce = ev('CombatEvents');
      if (ce && typeof ce.emit === 'function') { functions.set('CombatEvents', [ce.emit, ce.emitAsync]); ce.emit = () => {}; ce.emitAsync = async () => {}; }
      w.Math.random = () => 0.5;

      /* ============ 组1：路由与注册表 ============ */
      await runGroup('路由与注册表', async () => {
        check(w.isArcaneSkillFx('芭斯特的猫眼石') === true, 'isArcaneSkillFx 芭斯特的猫眼石 精确路由');
        check(w.isArcaneSkillFx('奇异海螺') === true, 'isArcaneSkillFx 奇异海螺 精确路由');
        check(w.isArcaneSkillFx('砷弹射击') === true, 'isArcaneSkillFx 砷弹射击 精确路由');
        check(w.isArcaneSkillFx('灵风术') === true, 'isArcaneSkillFx 灵风术 保持路由');
        check(w.isArcaneSkillFx('普通攻击') === false, 'isArcaneSkillFx 普通攻击不误路由');
        if (itemFxTable) {
          eq(itemFxTable['芭斯特的猫眼石'] && itemFxTable['芭斯特的猫眼石'].category, 'B', 'ITEM_SKILL_FX 芭斯特 category=B');
          eq(itemFxTable['奇异海螺'] && itemFxTable['奇异海螺'].category, 'A', 'ITEM_SKILL_FX 海螺 category=A');
          eq(itemFxTable['砷弹射击'] && itemFxTable['砷弹射击'].category, 'A', 'ITEM_SKILL_FX 砷弹 category=A');
          eq(itemFxTable['灵风术'] && itemFxTable['灵风术'].category, 'B', 'ITEM_SKILL_FX 灵风 category=B');
        }
        const delayOf = t => {
          const it = itemFxTable && itemFxTable[t];
          if (it && it.delay !== undefined) return it.delay;
          const rg = webmTable && webmTable[t];
          return rg ? rg.delay : undefined;
        };
        [['芭斯特的猫眼石', 0.92], ['奇异海螺', 0.50], ['砷弹射击', 0.50]].forEach(([t, d]) => {
          const got = delayOf(t);
          check(got !== undefined && Math.abs(Number(got) - d) < 1e-9, '视觉结算延迟 ' + t + '=' + d + (got === undefined ? '（未落地）' : got !== undefined && Math.abs(Number(got) - d) >= 1e-9 ? '（实际 ' + got + '）' : ''));
          if (got === undefined) note('待对齐:结算延迟 ' + t);
        });
        const vfOf = t => {
          const it = itemFxTable && itemFxTable[t];
          if (it && it.videoFiles) return it.videoFiles;
          const rg = webmTable && webmTable[t];
          return rg ? rg.videoFiles : undefined;
        };
        eq(vfOf('芭斯特的猫眼石') || null, ['vfx_bastet_spiral.webm', 'vfx_bastet_pillar.webm'], '芭斯特 videoFiles=spiral/pillar');
        eq(vfOf('奇异海螺') || null, ['vfx_conch_vortex.webm', 'vfx_conch_abyss.webm', 'vfx_conch_ripple.webm'], '海螺 videoFiles=vortex/abyss/ripple');
        eq(vfOf('砷弹射击') || null, [], '砷弹 videoFiles=[]');
        eq(vfOf('灵风术') || null, [], '灵风 videoFiles=[]');
      });

      /* ============ 组2：芭斯特的猫眼石 ============ */
      await runGroup('芭斯特的猫眼石', async () => {
        const handle = dispatch('芭斯特的猫眼石');
        check(handle && typeof handle.cancel === 'function', '芭斯特返回 owner 管理的 handle（带 cancel）');
        flush(30); assertBeat('芭斯特', 'bastetChime', 20, { vol: 0.68, maxDurSec: 1, fadeOutSec: 0.35 });
        flush(380); assertBeat('芭斯特', 'bastetCast', 380, { vol: 0.76, maxDurSec: 1.15, fadeOutSec: 0.32 });
        flush(880); assertBeat('芭斯特', 'bastetHeal', 880, { vol: 0.74, maxDurSec: 1.05, fadeOutSec: 0.38 });
        noBeat('芭斯特', 'conchHorn'); noBeat('芭斯特', 'conchCharge');
        // WebM：按拍点查创建（video src 捕获 + 早期层），自然收尾后不再断言层数
        soft(videoSrcs.some(s => s.indexOf('vfx_bastet_spiral.webm') >= 0), '芭斯特 spiral WebM 经真实 video.src 入队');
        soft(videoSrcs.some(s => s.indexOf('vfx_bastet_pillar.webm') >= 0), '芭斯特 pillar WebM 经真实 video.src 入队');
        // 两条 SVG 光轨使用相同的 480ms 扫描节拍，不以时间曲线冒充空间控制点断言。
        const trails = animRecords.filter(r => r.target.tagName.toLowerCase() === 'path' && r.options.duration === 480);
        eq(trails.length, 2, '芭斯特双轨 SVG 光流动画');
        eq(trails.map(r => r.options.delay), [0, 24], '芭斯特双轨错拍 24ms');
        // 正常完成：完整 flush 后真音不被截断
        flush(2600);
        eq(stopCount, 0, '芭斯特正常完成不截断真音自然尾部（stop=0）');
        // 取消：同步清层/粒子/WebM/延时采样（450ms 起 WebM 才创建，460ms 处取消验证）
        await preGroup();
        const h2 = dispatch('芭斯特的猫眼石');
        flush(460);
        eq(soundEvents.length, 2, '芭斯特 cancel 前 460ms 恰 2 条新音（chime/cast）');
        const c0 = webmCanvasCount();
        soft(c0 >= 1, '芭斯特 WebM 层在 460ms 已创建', 'canvas=' + c0);
        h2.cancel();
        check(stopCount >= 1, '芭斯特 cancel 同步止音（实际 stop=' + stopCount + '）');
        eq(webmCanvasCount(), 0, '芭斯特 cancel 同步清 WebM 层');
        const sBefore = soundEvents.length;
        flush(2600);
        eq(soundEvents.length, sBefore, '芭斯特 cancel 后延时采样不再触发');
        assertNoResidue('芭斯特 cancel');
      });

      /* ============ 组3：奇异海螺 ============ */
      await runGroup('奇异海螺', async () => {
        const handle = dispatch('奇异海螺');
        check(handle && typeof handle.cancel === 'function', '海螺返回 owner 管理的 handle（带 cancel）');
        flush(30); assertBeat('海螺', 'conchCharge', 20, { vol: 0.62, maxDurSec: null, fadeOutSec: 0.25 });
        flush(850); assertBeat('海螺', 'conchMist', 850, { vol: 0.62, maxDurSec: 0.85, fadeOutSec: 0.32 });
        flush(880); assertBeat('海螺', 'mx_stygian_whoosh', 880, { vol: 0.50, offsetSec: 0.1, maxDurSec: 0.8, fadeOutSec: 0.32 });
        noBeat('海螺', 'conchHorn');
        eq(beatsOf('conchFog').length, 0, '海螺不新增 conchFog 键（走 mx_stygian_whoosh）');
        // 420ms hitStop 80
        check(Number(ev('fxEngine.hitStop')) === 80, '海螺 420ms hitStop=80（实际 ' + ev('fxEngine.hitStop') + '）');
        soft(videoSrcs.some(s => s.indexOf('vfx_conch_vortex.webm') >= 0) && videoSrcs.some(s => s.indexOf('vfx_conch_abyss.webm') >= 0) && videoSrcs.some(s => s.indexOf('vfx_conch_ripple.webm') >= 0), '海螺 vortex/abyss/ripple WebM 经真实 video.src 入队', 'srcs=' + videoSrcs.join(','));
        flush(2400);
        eq(stopCount, 0, '海螺正常完成不截断真音自然尾部（stop=0）');
        assertNoResidue('海螺自然收尾');
        // clearArcaneFx 统一止音
        await preGroup();
        dispatch('奇异海螺');
        flush(120);
        w.clearArcaneFx();
        await settle();
        eq(webmCanvasCount(), 0, 'clearArcaneFx 清空海螺 WebM 层');
        check(stopCount >= 1, 'clearArcaneFx 统一止音海螺采样（实际 stop=' + stopCount + '）');
        const sBefore = soundEvents.length;
        flush(2400);
        eq(soundEvents.length, sBefore, 'clearArcaneFx 后海螺无余音');
        assertNoResidue('海螺 clearArcaneFx');
      });

      /* ============ 组4：砷弹射击 ============ */
      await runGroup('砷弹射击', async () => {
        const handle = dispatch('砷弹射击');
        check(handle && typeof handle.cancel === 'function', '砷弹返回 owner 管理的 handle（带 cancel）');
        flush(400);
        eq(soundEvents.length, 1, '砷弹唯一音（实际 ' + soundEvents.length + ' 个采样）');
        assertBeat('砷弹', 'gunshot_pierce', 260, { vol: 0.86, maxDurSec: null });
        eq(beatsOf('aoe_poison_spell_fs219566').length, 0, '砷弹不夹带旧毒音');
        eq(webmCanvasCount(), 0, '砷弹无 WebM 层');
        flush(1200);
        eq(soundEvents.length, 1, '砷弹完成后仍唯一音');
        eq(stopCount, 0, '砷弹 gunshot_pierce 260ms 无截断自然走完（stop=0）');
        assertNoResidue('砷弹自然收尾');
      });

      /* ============ 组5：灵风术真音 ============ */
      await runGroup('灵风术真音', async () => {
        const handle = dispatch('灵风术');
        check(handle && typeof handle.cancel === 'function', '灵风返回 owner 管理的 handle（带 cancel）');
        flush(30); assertBeat('灵风', 'windHum', 20, { vol: 0.62, offsetSec: 0.15, maxDurSec: 0.94, fadeInSec: 0.18, fadeOutSec: 0.14, pan: -0.3 });
        flush(120); assertBeat('灵风', 'crystalChime', 120, { vol: 0.36, rate: 1.25, maxDurSec: 0.85, fadeOutSec: 0.3, pan: 0.25 });
        flush(1000 - 150); assertBeat('灵风', 'aoe_wind_spin_fs772867', 1000, { vol: 0.78, maxDurSec: 1, fadeOutSec: 0.28, pan: -0.2 });
        flush(1040 - 1000); assertBeat('灵风', 'dodgeWind', 1040, { vol: 0.62, maxDurSec: 1.15, fadeOutSec: 0.35, pan: 0.25 });
        flush(1340 - 1040); assertBeat('灵风', 'crystalChime', 1340, { vol: 0.58, maxDurSec: 1.5, fadeOutSec: 0.5 });
        eq(beatsOf('windHum').length, 1, '灵风 windHum 仅一拍');
        eq(beatsOf('crystalChime').length, 2, '灵风 crystalChime 恰两拍');
        flush(3400);
        eq(stopCount, 0, '灵风正常完成不截断真音自然尾部（stop=0）');
        // cancel：150ms 时仅 windHum/crystalChime 两拍已发
        await preGroup();
        const h2 = dispatch('灵风术');
        flush(150);
        const sBefore = soundEvents.length;
        h2.cancel();
        check(stopCount >= 1, '灵风 cancel 同步止音（实际 stop=' + stopCount + '）');
        flush(3400);
        eq(soundEvents.length, sBefore, '灵风 cancel 后无余音');
        assertNoResidue('灵风 cancel');
      });

      /* ============ 组6：排位瞄准 cue（sync 按落地实现驱动 actionQueue ref） ============ */
      if (hasRow) await runGroup('排位瞄准 cue', async () => {
        // syncRowTargetingCues 读 state.isTargeting / pendingAction / actionQueue[queueIndex].ref
        const arm = action => ev('(function(a){ state.isTargeting=true; state.pendingAction=a; ' +
          'state.actionQueue=[{ref:heroesData[0]}]; state.queueIndex=0; })(' + JSON.stringify(action) + ')');
        const disarm = () => { w.clearRowAimCues(); ev('state.isTargeting=false;state.pendingAction=null;'); };
        // ① attack：近战选敌 → 画
        arm({ type: 'attack' });
        w.syncRowTargetingCues();
        eq(rowAimLayers().length, 1, 'sync attack 近战选敌画 cue');
        const layer = rowAimLayers()[0];
        eq(w.document.querySelectorAll('.arcane-row-back-locked').length, backEnemies.length, '存活后排全部挂 arcane-row-back-locked');
        soft(layer.querySelectorAll('svg').length >= frontGuards.length + backEnemies.length, '前排护卫弧+后排锁盾 SVG 均入层', 'svg=' + layer.querySelectorAll('svg').length);
        const texts = Array.from(layer.querySelectorAll('svg text')).filter(t => (t.textContent || '').trim());
        eq(texts.length, 0, '排位 SVG 零文本');
        // ② skill：近战技能（真实三槽 type:'[单体]'/type2:'[无]'/type3:'[无]'）→ 画
        disarm();
        ev('heroesData[0].skills=[{name:"测试斩", type:"[单体]", type2:"[无]", type3:"[无]", damageType:"近战", power:10}]');
        arm({ type: 'skill', skillIndex: 0 });
        w.syncRowTargetingCues();
        soft(rowAimLayers().length === 1, 'sync skill 近战选敌画 cue', 'layers=' + rowAimLayers().length);
        // ③ item：近战物品（真实三槽）→ 画
        disarm();
        ev('heroesData[0].items=[{name:"投掷匕首", type:"[单体]", type2:"[无]", type3:"[无]", damageType:"近战", power:8}]');
        arm({ type: 'item', itemIndex: 0 });
        w.syncRowTargetingCues();
        soft(rowAimLayers().length === 1, 'sync item 近战选敌画 cue', 'layers=' + rowAimLayers().length);
        // ④ grouped_item：组物品子项（真实三槽）→ 画
        disarm();
        ev('heroesData[0].items=[{name:"组包", children:[{name:"子镖", type:"[单体]", type2:"[无]", type3:"[无]", damageType:"近战", power:6}]}]');
        arm({ type: 'grouped_item', itemIndex: 0, childIndex: 0 });
        w.syncRowTargetingCues();
        soft(rowAimLayers().length === 1, 'sync grouped_item 近战选敌画 cue', 'layers=' + rowAimLayers().length);
        // ⑤ release_charge：蓄力释放（真实三槽）→ 画
        disarm();
        ev('heroesData[0].currentDelay={skill:{name:"蓄势斩", type:"[单体]", type2:"[无]", type3:"[无]", damageType:"近战", power:30}}');
        arm({ type: 'release_charge' });
        w.syncRowTargetingCues();
        soft(rowAimLayers().length === 1, 'sync release_charge 近战选敌画 cue', 'layers=' + rowAimLayers().length);
        // 反例：ignoreRow 突进放行（字段级 ignoreRow:true）
        disarm();
        ev('heroesData[0].skills=[{name:"测试斩", type:"[单体]", type2:"[无]", type3:"[无]", damageType:"近战", power:10, ignoreRow:true}]');
        arm({ type: 'skill', skillIndex: 0 });
        w.syncRowTargetingCues();
        eq(rowAimLayers().length, 0, 'ignoreRow 突进放行不画 cue');
        // 反例：征伐者职业被动放行
        disarm();
        ev('heroesData[0].classType="征伐者"');
        arm({ type: 'attack' });
        w.syncRowTargetingCues();
        eq(rowAimLayers().length, 0, '征伐者被动 ignoreRow 放行不画 cue');
        ev('heroesData[0].classType=undefined');
        // 反例：远程选敌
        disarm();
        ev('heroesData[0].skills=[{name:"射击", type:"[单体]", type2:"[无]", type3:"[无]", damageType:"远程", power:10}]');
        arm({ type: 'skill', skillIndex: 0 });
        w.syncRowTargetingCues();
        eq(rowAimLayers().length, 0, '远程选敌不画近战 cue');
        // 反例：前排全灭
        disarm();
        arm({ type: 'attack' });
        frontGuards.forEach(g => { g.isAlive = false; });
        ev('enemiesData[0].isAlive=false;enemiesData[1].isAlive=false;');
        w.syncRowTargetingCues();
        eq(rowAimLayers().length, 0, '前排无存活不画护卫弧');
        frontGuards.forEach(g => { g.isAlive = true; });
        ev('enemiesData[0].isAlive=true;enemiesData[1].isAlive=true;');
        // 反例：前排全部制服
        frontGuards.forEach(g => { g.isSubdued = true; });
        ev('enemiesData[0].isSubdued=true;enemiesData[1].isSubdued=true;');
        w.syncRowTargetingCues();
        eq(rowAimLayers().length, 0, '前排全部制服不画 cue');
        frontGuards.forEach(g => { g.isSubdued = false; });
        ev('enemiesData[0].isSubdued=false;enemiesData[1].isSubdued=false;');
        disarm();
        // 恢复 actor 注入字段
        ev('delete heroesData[0].currentDelay; heroesData[0].skills=[]; heroesData[0].items=[]; heroesData[0].classType=undefined;');
      });

      /* ============ 组7：playRowBlockImpact 顶盾动效 ============ */
      if (hasRow && typeof w.playRowBlockImpact === 'function') await runGroup('顶盾动效', async () => {
        const particles0 = ev('fxEngine.particles.length');
        const handle = w.playRowBlockImpact(backRef);
        soft(handle && typeof handle.cancel === 'function', 'playRowBlockImpact 返回 owner 管理的 handle', '返回 ' + (handle === undefined ? 'undefined' : typeof handle));
        assertBeat('顶盾', 'parryShield', 0, { vol: 0.72, maxDurSec: 0.72, fadeOutSec: 0.2 });
        flush(80); assertBeat('顶盾', 'defUp', 60, { vol: 0.42, maxDurSec: 0.55 });
        const raise = animRecords.filter(r => r.target && r.target.closest && r.target.closest('[data-bca-row="front"]'));
        const bounce = animRecords.filter(r => r.target && r.target.closest && r.target.closest('[data-bca-row="back"]'));
        soft(raise.length >= frontGuards.length, '前排集体顶盾动画', '实际 ' + raise.length);
        soft(bounce.length >= 1, '后排弹回动画', '实际 ' + bounce.length);
        soft(animRecords.some(r => r.options && [560, 520].indexOf(Number(r.options.duration)) >= 0), '盾墙波纹 560/520ms 动画');
        const wallRec = animRecords.find(r => r.options && [560, 520].indexOf(Number(r.options.duration)) >= 0);
        soft(wallRec && wallRec.keyframes.every(k => !k.textContent), '波纹 SVG 无文字关键帧');
        soft(ev('fxEngine.particles.length') > particles0, '顶盾粒子入 fxEngine 队列');
        // 沿 fxEngine 真实驱动 update/draw：粒子衰减/移除即驱动生效
        if (typeof ev('fxEngine.update') === 'function') {
          const pb = ev('fxEngine.particles.length');
          ev('fxEngine.update(16)'); ev('fxEngine.update(200)');
          soft(ev('fxEngine.particles.length') <= pb, 'fxEngine.update/draw 驱动粒子衰减', 'before=' + pb + ' after=' + ev('fxEngine.particles.length'));
        }
        flush(700);
        if (handle && typeof handle.cancel === 'function') {
          await preGroup();
          const p1 = ev('fxEngine.particles.length');
          const h2 = w.playRowBlockImpact(backRef);
          flush(60);
          h2.cancel();
          await settle();
          check(stopCount >= 1, '顶盾 handle.cancel 同步止音（实际 stop=' + stopCount + '）');
          check(animCancels.n >= 1, '顶盾 handle.cancel 同步取消动画');
          flush(700);
          assertNoResidue('顶盾 cancel', p1);
        }
      });

      /* ============ 组8：handleTargetClick 拦截分支 ============ */
      if (hasRow && typeof w.handleTargetClick === 'function') await runGroup('目标点击拦截', async () => {
        ev('state.isTargeting=true;state.pendingAction={type:"attack"};state.actionQueue=[{ref:heroesData[0]}];state.queueIndex=0;');
        const p0 = ev('({a:state.actionQueue.length,q:state.queueIndex})');
        try { await w.handleTargetClick(backRef, 'enemy'); } catch (e) { note('handleTargetClick 执行受限：' + (e && e.message)); }
        await settle();
        flush(80);
        const blockText = logCalls.find(t => /前排|阻挡|掩护/.test(t));
        soft(!blockText, '拦截分支不再 showLog 前排阻挡文字', blockText ? '出现：' + blockText.slice(0, 40) : '');
        soft(animRecords.length > 0, '拦截分支以顶盾动效代替文字');
        eq(beatsOf('parryShield').length, 1, '拦截播放 parryShield');
        soft(typeof w.cancelTargeting === 'function', 'cancelTargeting 真实通道保留');
        soft(typeof w.updateMenu === 'function', 'updateMenu 通道保留');
        const p1 = ev('({a:state.actionQueue.length,q:state.queueIndex})');
        eq(p1.a - p0.a, 0, '拦截不消耗行动队列');
        eq(p1.q - p0.q, 0, '拦截不推进回合指针');
        ev('state.isTargeting=false;state.pendingAction=null;');
      });

      /* ============ 组9：全局清理复核 ============ */
      await runGroup('全局清理复核', async () => {
        dispatch('芭斯特的猫眼石');
        flush(100);
        w.clearArcaneFx();
        await settle();
        eq(w.document.querySelectorAll('canvas[data-arcane-fx="webm"]').length, 0, 'clearArcaneFx 后舞台无 WebM 残留');
        eq(rowAimLayers().length, 0, 'clearArcaneFx 后无 row-aim 残留');
        eq(w.document.querySelectorAll('.arcane-row-back-locked').length, 0, 'clearArcaneFx 后无锁盾类残留');
        assertNoResidue('全局 clearArcaneFx');
      });
    } finally {
      // 恢复顺序：虚拟时钟仍在时先真实 clearFx，再还原时钟/原型/函数/状态（全部按引用，不吞异常）
      w.clearArcaneFx();
      restoreClock();
      restoreAnimate();
      restoreVideo();
      functions.forEach((fn, name) => {
        if (name === 'mix.play') { if (mix) mix.play = fn; }
        else if (name === 'CombatEvents') { const ce = ev('CombatEvents'); if (ce) { ce.emit = fn[0]; ce.emitAsync = fn[1]; } }
        else w[name] = fn;
      });
      // localStorage：删除夹具新增键，再回填旧键
      try {
        const seen = {};
        for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); seen[k] = 1; }
        Object.keys(seen).forEach(k => { if (!(k in lsSaved)) { try { w.localStorage.removeItem(k); } catch (e2) { /* 禁用环境忽略 */ } } });
        for (const k of Object.keys(lsSaved)) { try { w.localStorage.setItem(k, lsSaved[k]); } catch (e2) { /* 禁用环境忽略 */ } }
      } catch (e) { /* 隔离环境可能整体禁用 localStorage */ }
      // 状态按引用还原（含 fxEngine.hitStop/lastDt/particles）
      w.__bcaSaved = saved;
      ev('(function(s){ if(!s) return; heroesData=s.heroesData; enemiesData=s.enemiesData; combatToken=s.token; _pipelineFrozen=s.frozen; ' +
        'nonLethalSettings.enabled=s.nonLethal; if(s.allySpeak!==undefined) llmState.allyAutoSpeak=s.allySpeak; ' +
        'if(s.enemySpeak!==undefined) llmState.enemyAutoSpeak=s.enemySpeak; ' +
        'Object.keys(s.state).forEach(function(k){ state[k]=s.state[k]; }); ' +
        'Math.random=s.random; fxEngine.hitStop=s.hitStop||0; fxEngine.lastDt=s.lastDt||16.7; ' +
        'fxEngine.particles.length=0; Array.prototype.push.apply(fxEngine.particles, s.particles); })(window.__bcaSaved)');
      delete w.__bcaSaved;
      if (root && root.parentNode) root.parentNode.removeChild(root);
      if (errors.length) check(false, '夹具运行期错误 ' + errors.length + ' 条', String(errors[0] && errors[0].stack || errors[0]));
      check((mock && typeof mock.genCount === 'function' ? mock.genCount() : gen0) === gen0, 'mock 计数严格回到基线（==gen0）');
    }

    return { pending };
  };
})();
