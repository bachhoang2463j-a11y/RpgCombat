/* 奇物与技能定稿 v12.11 回归：谐律之庇 / 静默之域 / 碎裂之响 / 塞赫美特之愠 / 逆咒归源镜。
   挂载真实 w 的 index 业务 API（playArcaneSkillFx / isArcaneSkillFx / parseSkill / parseItem /
   CombatAudioMixer(classify/play) / TAG_HANDLERS['吸蓝']/['驱散'] / clearArcaneFx 全走真实实现）。
   仅 stub 底层媒体出口：window.playSound 与 CombatAudioMixer.play 捕获 key/url/vol/rate/opts，
   返回可调用 stop 函数并带 pending 的 ready/started/done（据此真实验证 S.sampleAudios 止音）；
   窗口级视觉 helper 与 createFloatingText/addHistory/updateXxxUI 计数替换。
   虚拟时钟同步替换 setTimeout/setInterval/Date.now/performance.now（按引用恢复），
   每个技能重置 vt/beat 基点，identityRun.finishLater/particle expiresAt 全部一致。
   S.videos 取消探针：真实统计 canvas[data-arcane-fx="webm"] 数量随 handle.cancel/
   owner.cancel/clearArcaneFx 归零。分派传入真实实体对象（id 命中 getEntitySpriteDom）。
   source 静态切片仅作辅助契约；未落地项按 pending 上报，不计为失败。 */
(function () {
  'use strict';
  window.runSkillItemsVfxRegression = async function ({ w, check, eq, mock, source } = {}) {
    const ev = code => w.eval(code);
    const pending = [];
    const note = msg => { if (pending.indexOf(msg) < 0) pending.push(msg); };
    const soft = (cond, name, reason) => {
      if (cond) { check(true, name); return true; }
      note(name + (reason ? ' — ' + reason : ''));
      check(false, name + '（待对齐：' + (reason || '接口/行为未落地') + '）');
      return false;
    };
    if (typeof check !== 'function' || typeof eq !== 'function') throw new Error('runSkillItemsVfxRegression 需要 check/eq 注入');

    /* ---------- 接口与模块对象落地检查 ---------- */
    const realApi = ['isArcaneSkillFx', 'playArcaneSkillFx', 'clearArcaneFx', 'parseSkill', 'parseItem'];
    const missing = realApi.filter(name => typeof w[name] !== 'function');
    eq(missing, [], '奇物回归核心接口存在');
    if (missing.length) return { pending: missing.map(n => '待对齐:' + n), renderSkipped: true };
    const mix = ev('CombatAudioMixer');
    if (!mix || typeof mix.classify !== 'function' || typeof mix.play !== 'function') note('待对齐:CombatAudioMixer(classify/play) — 需经页面词法作用域 ev 获取');
    const itemFxTable = ev('typeof ITEM_SKILL_FX !== "undefined" && ITEM_SKILL_FX') || null;
    const tagHandlers = ev('typeof TAG_HANDLERS !== "undefined" ? TAG_HANDLERS : null');
    if (!tagHandlers) note('待对齐:TAG_HANDLERS 全局表不可读');

    /* ---------- source 静态契约（辅助，不复制业务实现） ---------- */
    const src = typeof source === 'string' ? source : '';
    if (!src) note('静态跳过:主harness未传入source（运行期组照常执行）');
    else {
      if (src.indexOf('===== 奇物与技能定稿 v12.11 BEGIN =====') < 0) note('静态未落地:v12.11 定稿代码段标记');
      if (src.indexOf('playArcaneWebM') < 0) note('静态未落地:专用视频播放器 playArcaneWebM');
      if (src.indexOf('S.videos') < 0) note('静态未落地:S.videos 视频全局管控');
      ['fork432', 'forkHum', 'forkMute', 'bowlBronze', 'bowlClear', 'bellPing', 'crystalSnap', 'mirrorRing', 'mirrorStream']
        .forEach(k => { if (src.indexOf("'" + k + "'") < 0) note('静态未落地:新音键 ' + k); });
      ['谐律之庇', '静默之域', '碎裂之响', '塞赫美特之愠', '逆咒归源镜'].forEach(t => {
        if (src.indexOf(t) < 0) note('静态未落地:分派/注册缺少 ' + t);
      });
      const delayOf = t => { const m = src.match(new RegExp("['\"]" + t + "['\"]\\s*:\\s*\\{[^}]*delay\\s*:\\s*([0-9.]+)")); return m ? parseFloat(m[1]) : null; };
      [['谐律之庇', 0.90], ['静默之域', 0.95], ['碎裂之响', 0.95], ['塞赫美特之愠', 1.45], ['逆咒归源镜', 0.45]].forEach(([t, d]) => {
        const got = delayOf(t);
        if (got === null) note('静态未落地:WEBM_FX_REGISTRY[' + t + '] delay');
        else if (Math.abs(got - d) > 1e-9) note('静态不一致:WEBM_FX_REGISTRY[' + t + '].delay=' + got + ' 期望 ' + d);
      });
    }

    /* ---------- 保存点（字段名与页面实际一致，按引用保存，不 JSON 函数） ---------- */
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;
    const saved = ev('({heroesData, enemiesData, battleHistory, _historyRawCache, token:combatToken, ' +
      'frozen:_pipelineFrozen, nonLethal:nonLethalSettings.enabled, allySpeak:llmState.allyAutoSpeak, ' +
      'enemySpeak:llmState.enemyAutoSpeak, state:{...state}, random:Math.random, particles:fxEngine.particles.slice()})');
    const lsSaved = {};
    try { for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); lsSaved[k] = w.localStorage.getItem(k); } } catch (e) { /* 隔离环境可能禁用 */ }
    const functions = new Map(); // name -> 原实现；CombatEvents -> [emit, emitAsync]
    const replace = (name, fn) => { if (!functions.has(name)) functions.set(name, w[name]); w[name] = fn; };
    const realRandom = w.Math.random;
    const errors = [];

    /* ---------- 虚拟时钟：timeout/interval + Date.now/performance.now 同步虚拟 ---------- */
    let vt = 0, timerSeq = 0, timers = [], ticks = 0, base = 0;
    const TICK_CAP = 4000; // 单次 flush 步数上限，防自续定时器无界循环
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
      w.Date.now = () => base + vt; // Date 构造器本身不动，仅虚拟静态 now
      Object.defineProperty(w.performance, 'now', { configurable:true, value:() => base + vt });
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
    const URL_FRAGMENTS = {
      fork432: 'vfx_fork_432_strike', forkHum: 'vfx_fork_physics_hum', forkMute: 'vfx_fork_muted_stop',
      bowlBronze: 'vfx_bowl_bronze_silence', bowlClear: 'vfx_bowl_crystal_clear', bellPing: 'vfx_bell_dispel_ping',
      crystalSnap: 'vfx_crystal_shatter_snap', mirrorRing: 'vfx_mirror_ring_activate', mirrorStream: 'vfx_mirror_mana_stream',
      sd_ring_blast: 'Ring_Blast', sd_shatter_blast: 'Shatter_shot', mx_giant_roar: 'giant_roar',
      ranshao: 'ranshao', fire01: 'fire01', explosion_aoe_blast: 'explosion_aoe_blast',
      mx_vacuum: 'vacuum_suck', leech_flow: 'leech_flow'
    };
    let soundEvents = [], stopCount = 0, svgCalls = [], floatCalls = [];
    const clearMediaEvents = () => { soundEvents = []; stopCount = 0; svgCalls = []; floatCalls = []; };
    const makeCue = opts => {
      let stopped = false, settle;
      const cue = () => { if (stopped) return; stopped = true; stopCount++; settle(false); if (cue.owner) cue.owner.audioStoppers.delete(cue); };
      cue.ready = Promise.resolve(true); cue.started = Promise.resolve(true);
      cue.done = new Promise(resolve => { settle = resolve; });
      if (opts.owner) mix.bindOwner(opts.owner, cue);
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
    const beatOf = e => {
      if (e.key) return e.key;
      for (const k of Object.keys(URL_FRAGMENTS)) if (e.url.indexOf(URL_FRAGMENTS[k]) >= 0) return k;
      return null;
    };
    const beatsFor = key => soundEvents.filter(e => beatOf(e) === key);

    /* ---------- 舞台：实体 id 命中 getEntitySpriteDom（hero-card-${id} / ${id}-sprite） ---------- */
    const root = w.document.createElement('div');
    root.id = 'skill-items-vfx-regression-stage';
    root.style.cssText = 'position:fixed;left:40px;top:200px;width:640px;height:220px;pointer-events:none;';
    root.innerHTML = '<div id="hero-card-h_sv_c" style="position:absolute;left:10px;top:0;width:160px;height:130px;background:#243047;border:1px solid #7dd3fc">施法者</div>' +
      [0, 1, 2].map(n => '<div id="e_sv_t' + n + '-sprite" style="position:absolute;left:' + (220 + n * 130) + 'px;top:0;width:110px;height:120px;background:#3b1d47;border:1px solid #f0abfc">目标' + n + '</div>').join('');
    w.document.body.appendChild(root);
    const caster = { id: 'h_sv_c', name: '谐律施法者', hp: 500, maxHp: 500, mp: 100, maxMp: 100, tp: 60, maxTp: 100, atk: 10, def: 0, spd: 1, shield: 0, actCount: 1, isAlive: true, buffs: [], skills: [], items: [], isSummon: false, row: 'front', side: 'hero' };
    const mkTarget = n => ({ id: 'e_sv_t' + n, name: '目标' + n, hp: 500, maxHp: 500, mp: 100, maxMp: 100, tp: 60, maxTp: 100, atk: 10, def: 0, spd: 1, shield: 0, actCount: 1, isAlive: true, buffs: [], skills: [], items: [], isSummon: false, row: 'front', side: 'enemy' });
    const targets = [mkTarget(0), mkTarget(1), mkTarget(2)];

    /* ---------- 五项清单与纯文案探针（不加伤害标签掩盖分类） ---------- */
    const TAGS = ['谐律之庇', '静默之域', '碎裂之响', '塞赫美特之愠', '逆咒归源镜'];
    const PROBE_TEXTS = {
      '谐律之庇': '【谐律之庇】[群驱散:2][法术][特效:谐律之庇]',
      '静默之域': '【静默之域】[群滞;power:20][Aim:120][法术][特效:静默之域]',
      '碎裂之响': '【碎裂之响】[群降;power:20][法术][特效:碎裂之响]',
      '塞赫美特之愠': '【塞赫美特之愠】[穿透;power:500][必中][法术][特效:塞赫美特之愠]',
      '逆咒归源镜': '【逆咒归源镜】[吸蓝;power:5][传奇][法术][特效:逆咒归源镜]'
    };
    const EXPECT_CATEGORY = { '谐律之庇': 'B', '静默之域': 'A', '碎裂之响': 'A', '塞赫美特之愠': 'A', '逆咒归源镜': 'A' };
    const EXPECT_DELAY = { '谐律之庇': 0.90, '静默之域': 0.95, '碎裂之响': 0.95, '塞赫美特之愠': 1.45, '逆咒归源镜': 0.45 };
    const BEATS = {
      '谐律之庇': [['forkHum', 80, 0.85, { fade: 0.5 }], ['bowlClear', 820, 0.72, { fade: 0.6 }]],
      '静默之域': [['bowlBronze', 40, 0.82, { rate: 0.88, maxDur: 0.82, fade: 0.12 }], ['forkMute', 840, 0.85, {}], ['sd_ring_blast', 950, 0.82, {}]],
      '碎裂之响': [['fork432', 0, 0.65, { rate: 0.95, maxDur: 0.85, fade: 0.25 }], ['fork432', 270, 0.75, { rate: 1.14 }], ['fork432', 540, 0.85, { rate: 1.33 }], ['sd_shatter_blast', 950, 0.9, {}]],
      '塞赫美特之愠': [['ranshao', 40, 0.72, {}], ['mx_giant_roar', 1240, 0.88, {}], ['crystalSnap', 1260, 0.86, {}], ['fire01', 1460, 0.88, {}], ['explosion_aoe_blast', 1480, 0.82, {}]],
      '逆咒归源镜': [['mirrorRing', 0, null, {}], ['mx_vacuum', 0, null, {}], ['mirrorStream', 420, null, {}], ['leech_flow', 420, null, {}]]
    };

    const webmCanvasCount = () => w.document.querySelectorAll('canvas[data-arcane-fx="webm"]').length;
    const dispatch = tag => w.playArcaneSkillFx(tag, caster, targets, false, null);
    const group = async (name, fn) => { try { await fn(); } catch (e) { check(false, name + '执行异常', String(e && e.stack || e)); } };

    /* ---------- 视觉/宿主 helper stub（窗口级与页面词法函数，按引用恢复） ---------- */
    ['updateHeroUI', 'updateEnemyUI', 'updateTeamBarrierUI', 'renderTurnQueue', 'triggerBarrierShatter',
      'tryTriggerEnemyLowHpSpeak', 'tryTriggerEnemyMolt', 'tryTriggerEnemyRage', 'tryTriggerEnemyLink', 'notifyManaSpent',
      'triggerHighTierCombinedSpeak', 'triggerAllyHealSpeak', 'triggerAllyAutoSpeak', 'spawnFocusOverlay',
      'spawnChargeUpParticles', 'spawnHitFlash', 'triggerScreenShake', 'spawnDodgeSmokeParticles', 'playAOEEffect',
      'playWebMFX', 'playCustomAudio', 'playRandomStandardGunshot', 'playShotgunSound', 'addHistory']
      .forEach(name => { if (typeof w[name] === 'function') replace(name, () => {}); });
    if (typeof w.playSVGEffect === 'function') replace('playSVGEffect', (dom, type) => { svgCalls.push(type); });
    if (typeof w.createFloatingText === 'function') replace('createFloatingText', (dom, text) => { floatCalls.push({ text, t:vt }); });
    if (typeof w.promptReaction === 'function') replace('promptReaction', async () => null);
    if (typeof w.playEnemyFlinchAnim === 'function') replace('playEnemyFlinchAnim', () => {});

    try {
      installClock();
      installSoundCapture();
      ev('combatToken={};_pipelineFrozen=false;nonLethalSettings.enabled=false;llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;state.isGameStarted=false;state.actionQueue=[];state.queueIndex=0;');
      w.Math.random = () => 0.5;
      const ce = ev('CombatEvents');
      if (ce && typeof ce.emit === 'function') { functions.set('CombatEvents', [ce.emit, ce.emitAsync]); ce.emit = () => {}; ce.emitAsync = async () => {}; }

      /* ===== 组1：isArcaneSkillFx 白名单（新5项 + 旧标签不误伤） ===== */
      await group('isArcaneSkillFx', () => {
        TAGS.forEach(tag => eq(w.isArcaneSkillFx(tag), true, 'isArcaneSkillFx 含 ' + tag));
        eq(w.isArcaneSkillFx('灵风术'), true, '旧秘术标签不受影响');
        eq(w.isArcaneSkillFx('纳克提特障壁术'), true, '旧障壁标签不受影响');
        eq(w.isArcaneSkillFx('绝不存在的特效'), false, '未知标签不误判');
      });

      /* ===== 组2：WEBM_FX_REGISTRY delays（0.90/.95/.95/1.45/.45） ===== */
      await group('registry-delay', () => {
        const reg = ev('WEBM_FX_REGISTRY');
        if (!reg) { soft(false, 'WEBM_FX_REGISTRY 可读', '页面词法作用域未暴露注册表'); return; }
        TAGS.forEach(tag => {
          const entry = reg[tag];
          if (!entry) { soft(false, '注册表含 ' + tag, 'WEBM_FX_REGISTRY 缺少该键'); return; }
          if (entry.delay === undefined) { soft(false, '注册表 ' + tag + '.delay 存在', 'delay 字段缺失'); return; }
          soft(Math.abs(entry.delay - EXPECT_DELAY[tag]) < 1e-9, '注册表 ' + tag + '.delay=' + EXPECT_DELAY[tag], '实际 ' + entry.delay);
        });
      });

      /* ===== 组3：五技能 category B/A/A/A/A（ITEM_SKILL_FX + 纯文案 classify） ===== */
      await group('classify-BA', () => {
        if (!mix || typeof mix.classify !== 'function') { soft(false, 'classify 可调用', 'CombatAudioMixer.classify 缺失'); return; }
        if (itemFxTable) TAGS.forEach(tag => soft(!!itemFxTable[tag] && itemFxTable[tag].category === EXPECT_CATEGORY[tag],
          'ITEM_SKILL_FX[' + tag + '].category=' + EXPECT_CATEGORY[tag],
          itemFxTable[tag] ? '实际 ' + itemFxTable[tag].category : '缺键'));
        TAGS.forEach(tag => {
          const skill = w.parseSkill(PROBE_TEXTS[tag]); // 纯群滞/群降/吸蓝/穿透/群驱散文案，不掺伤害标签
          if (!skill || skill.fxTag !== tag) { soft(false, 'parseSkill 显式[特效:' + tag + ']', 'fxTag 解析不符'); return; }
          eq(mix.classify(skill), EXPECT_CATEGORY[tag], 'classify(' + tag + ')=' + EXPECT_CATEGORY[tag]);
        });
        const plain = w.parseSkill('【回归攻击】[单体;power:50][近战]');
        eq(mix.classify(plain), 'D', '无[特效:]普通攻击仍归 D（旧标签不误伤）');
      });

      /* ===== 组4：显式/默认[特效:]解析与数值（parseSkill/parseItem 平面槽位） ===== */
      await group('parse-skill-item', () => {
        const slotOf = (s, word) => {
          const pairs = [[s.type, s.power], [s.type2, s.power2], [s.type3, s.power3]];
          const hit = pairs.find(p => p[0] && String(p[0]).indexOf(word) >= 0);
          return hit || null;
        };
        const mTag = slotOf(w.parseSkill(PROBE_TEXTS['逆咒归源镜']), '吸蓝');
        soft(!!mTag && mTag[1] === 5, '吸蓝 power=5 数值不变', mTag ? '实际 ' + mTag[1] : '缺吸蓝槽');
        const sTag = slotOf(w.parseSkill(PROBE_TEXTS['谐律之庇']), '群驱散');
        soft(!!sTag && sTag[1] === 2, '群驱散 power=2 数值不变', sTag ? '实际 ' + sTag[1] : '缺群驱散槽');
        const norm = s => JSON.stringify(Object.assign({}, s, { fxTag: null }));
        TAGS.forEach(tag => {
          const withFx = w.parseSkill(PROBE_TEXTS[tag]);
          const noFx = w.parseSkill(PROBE_TEXTS[tag].replace(/\[特效:[^\]]+\]/, ''));
          soft(norm(withFx) === norm(noFx) && noFx.fxTag === null && withFx.fxTag === tag,
            '[特效:' + tag + '] 不改变其余槽位且缺省 fxTag=null', '槽位被改动或缺省值非 null');
        });
        const old = w.parseSkill('【灵风术】[单避;power:50][法术][特效:灵风术][限1次]');
        soft(!!old && old.fxTag === '灵风术', '旧[特效:灵风术]解析不误伤', old ? 'fxTag=' + old.fxTag : '解析失败');
        const item = w.parseItem('【逆咒归源镜】[吸蓝;power:5][单体][道具][传奇][特效:逆咒归源镜]');
        const iTag = item && slotOf(item, '吸蓝');
        soft(!!item && item.isItem === true && item.fxTag === '逆咒归源镜' && !!iTag && iTag[1] === 5,
          'parseItem 显式[特效:逆咒归源镜]+吸蓝5', item ? 'fxTag=' + item.fxTag : '解析失败');
      });

      /* ===== 组5：五项分派 + 拍点 + S.videos 登记（真实 playArcaneSkillFx） ===== */
      await group('dispatch-beats', () => {
        TAGS.forEach(tag => {
          w.clearArcaneFx();
          resetClock(); clearMediaEvents();
          const videoBase = webmCanvasCount();
          const handle = dispatch(tag);
          if (!handle || typeof handle.cancel !== 'function') {
            soft(false, '分派 ' + tag + ' 返回 handle', 'playArcaneSkillFx 返回 ' + String(handle));
            return;
          }
          check(true, '分派 ' + tag + ' 返回 handle.cancel');
          soft(typeof handle.doneAt === 'number' && handle.doneAt > 0, tag + ' handle.doneAt 登记', 'doneAt=' + String(handle.doneAt));
          soft(!!handle.owner && typeof handle.owner.cancel === 'function', tag + ' handle.owner 生命周期（cancel 别名可后续并入）', 'owner 缺失或无 cancel');
          const videoMark = tag === '逆咒归源镜' ? 500 : 1800;
          flush(videoMark);
          const registeredVideoCount = webmCanvasCount();
          flush(2200 - videoMark);
          if (errors.length) check(false, tag + ' 调度回调异常', String(errors[errors.length - 1] && errors[errors.length - 1].message));
          if (soundEvents.length === 0) { soft(false, tag + ' 音效拍点捕获', '媒体出口零事件（未走 playSound/Mixer.play）'); w.clearArcaneFx(); flush(300); return; }
          BEATS[tag].forEach(([key, ms, vol, extra]) => {
            const all = beatsFor(key);
            const hits = all.filter(e => Math.abs(e.t - ms) <= 20);
            soft(hits.length > 0, tag + ' 拍点 ' + key + '@' + ms + 'ms', all.length ? '实际时刻[' + all.map(e => e.t).join(',') + ']' : '无该音');
            if (hits.length && vol !== null) {
              const v = hits[0].vol;
              soft(v !== undefined && Math.abs(v - vol) <= 0.02, tag + ' 音量 ' + key + '=' + vol, v === undefined ? 'vol 不可观测' : '实际 ' + v);
            }
            if (hits.length && extra.rate !== undefined) soft(hits[0].rate !== undefined && Math.abs(hits[0].rate - extra.rate) <= 0.01, tag + ' 倍速 ' + key + '=' + extra.rate, '实际 ' + hits[0].rate);
            if (hits.length && extra.maxDur !== undefined) {
              const d = hits[0].opts.maxDurSec;
              soft(d !== undefined && Math.abs(d - extra.maxDur) <= 0.02, tag + ' 时长上限 ' + key + '=' + extra.maxDur, d === undefined ? 'maxDurSec 不可观测' : '实际 ' + d);
            }
            if (hits.length && extra.fade !== undefined) {
              const f = hits[0].opts.fadeOutSec;
              soft(f !== undefined && Math.abs(f - extra.fade) <= 0.02, tag + ' 淡出 ' + key + '=' + extra.fade, f === undefined ? 'fadeOutSec 不可观测' : '实际 ' + f);
            }
          });
          // 每项音频选项契约：owner/audioContext/category 必经此体系
          const withCtx = soundEvents.filter(e => e.opts && e.opts.owner && e.opts.audioContext && e.opts.category);
          soft(withCtx.length >= Math.min(2, soundEvents.length), tag + ' 音效走 owner/audioContext/category 体系', '带完整选项的事件 ' + withCtx.length + '/' + soundEvents.length);
          // S.videos 真实登记探针：canvas[data-arcane-fx=webm] 应出现，clearArcaneFx 后归零
          soft(registeredVideoCount > videoBase, tag + ' WebM 经 S.videos 真实登记', 'canvas 数 ' + registeredVideoCount + '（基线 ' + videoBase + '）');
          w.clearArcaneFx(); flush(300);
          soft(webmCanvasCount() === 0, tag + ' clearArcaneFx 后视频图层归零', '残留 ' + webmCanvasCount());
        });
      });

      /* ===== 组6：谐律之庇 handle.dispel → bellPing（真实驱散回调，vol .72） ===== */
      await group('dispel-gate', () => {
        resetClock(); clearMediaEvents();
        const handle = dispatch('谐律之庇');
        if (!handle) { soft(false, '谐律之庇 handle（驱散门控）', '分派未返回'); return; }
        flush(400);
        soft(beatsFor('bellPing').length === 0, '施法阶段不触发 bellPing（门控）', '提前出现 ' + beatsFor('bellPing').length + ' 次');
        if (typeof handle.dispel !== 'function') { soft(false, 'handle.dispel 存在（真实驱散入口）', 'dispel 缺失'); w.clearArcaneFx(); flush(300); return; }
        handle.dispel(w.document.getElementById('e_sv_t0-sprite'));
        flush(200);
        const pings = beatsFor('bellPing');
        soft(pings.length > 0 && pings[0].t >= 400, '真实 dispel 即时 bellPing', pings.length ? '时刻 ' + pings[0].t : '无 bellPing');
        if (pings.length) soft(Math.abs(pings[0].vol - 0.72) <= 0.02, 'bellPing vol=0.72', '实际 ' + pings[0].vol);
        w.clearArcaneFx(); flush(300);
      });

      /* ===== 组7：cancel 无复活（音效快照 + 视频图层 + 止音计数） ===== */
      await group('cancel-no-revive', () => {
        // 7a. handle.cancel（= owner.cancel 别名基）：静默之域定时器最多
        resetClock(); clearMediaEvents();
        w.clearArcaneFx(); flush(50);
        const h1 = dispatch('静默之域');
        if (h1 && h1.cancel) {
          flush(100);
          const soundSnapshot = soundEvents.length, stopSnapshot = stopCount;
          h1.cancel();
          flush(2600);
          const revived = soundEvents.slice(soundSnapshot);
          soft(revived.length === 0, 'handle.cancel 后无新增音效（无复活）', revived.length ? '仍出现 ' + revived.map(e => beatOf(e) || e.url).join(',') : '');
          soft(stopCount > stopSnapshot, 'handle.cancel 触发 S.sampleAudios 止音', 'stop 计数未增加');
          soft(webmCanvasCount() === 0, 'handle.cancel 后视频图层归零', '残留 ' + webmCanvasCount());
        } else soft(false, '静默之域 cancel 可调用', 'handle/cancel 缺失');
        w.clearArcaneFx(); flush(300);
        // 7b. clearArcaneFx：谐律之庇清场后无任何新事件
        resetClock(); clearMediaEvents();
        const h2 = dispatch('谐律之庇');
        if (h2) {
          flush(100);
          const soundSnapshot = soundEvents.length, stopSnapshot = stopCount;
          w.clearArcaneFx();
          flush(2600);
          soft(soundEvents.slice(soundSnapshot).length === 0, 'clearArcaneFx 后无音效复活', soundEvents.slice(soundSnapshot).length ? '仍出现 ' + soundEvents.slice(soundSnapshot).map(e => beatOf(e) || e.url).join(',') : '');
          soft(stopCount > stopSnapshot, 'clearArcaneFx 止音活动采样', 'stop 计数未增加');
          soft(errors.length === 0, 'clearArcaneFx 清场无异常', errors.length ? String(errors[errors.length - 1] && errors[errors.length - 1].message) : '');
        } else soft(false, '谐律之庇 handle（clearArcaneFx 组）', '分派未返回');
        // 7c. 逆咒归源镜 owner.cancel：双轨音+视频全归 owner
        resetClock(); clearMediaEvents();
        const h3 = dispatch('逆咒归源镜');
        if (h3 && h3.owner && h3.owner.cancel) {
          flush(60);
          const soundSnapshot = soundEvents.length;
          h3.owner.cancel();
          flush(1500);
          soft(soundEvents.slice(soundSnapshot).length === 0, '镜 owner.cancel 后无新音（视频/双轨音均归 owner）', soundEvents.slice(soundSnapshot).length ? '仍出现 ' + soundEvents.slice(soundSnapshot).map(e => beatOf(e) || e.url).join(',') : '');
          soft(webmCanvasCount() === 0, '镜 owner.cancel 后视频图层归零', '残留 ' + webmCanvasCount());
        } else soft(false, '逆咒归源镜 owner.cancel 可调用', 'owner 缺失（镜视频生命周期未接 identityRun owner）');
        w.clearArcaneFx(); flush(300);
        // 7d. combatToken换代：未到拍点的旧音不能起播，视频立即可由全局清场回收。
        resetClock(); clearMediaEvents();
        const h4 = dispatch('逆咒归源镜');
        flush(60);
        const tokenSoundCount = soundEvents.length;
        ev('combatToken={};');
        flush(1500);
        check(soundEvents.length === tokenSoundCount, 'combatToken换代后旧420ms双轨不起音');
        check(webmCanvasCount() === 0, 'combatToken换代后旧视频清理');
        if (h4) h4.cancel();
        w.clearArcaneFx();
      });

      /* ===== 组8：真实 TAG_HANDLERS['吸蓝']/['驱散'] 门控与数值 ===== */
      await group('tag-handlers', () => {
        if (!tagHandlers || !tagHandlers['吸蓝'] || !tagHandlers['驱散']) {
          soft(false, 'TAG_HANDLERS 吸蓝/驱散可调用', '处理器未注册'); return;
        }
        const mkCtx = (skill, tgt, cst, power) => ({ skill, target: tgt, caster: cst, targetDom: w.document.getElementById(tgt.id + '-sprite') || w.document.getElementById('hero-card-' + tgt.id), actualPower: power, effectTurns: 3 });
        const drainSkillFx = w.parseSkill(PROBE_TEXTS['逆咒归源镜']);
        const drainSkillOld = w.parseSkill(PROBE_TEXTS['逆咒归源镜'].replace(/\[特效:[^\]]+\]/, ''));
        // 吸蓝·门控：带 逆咒归源镜 fxTag → 不走默认 mpHeal/SVG；MP 抽取数值不变
        const t1 = mkTarget(0); t1.mp = 30; const c1 = Object.assign({}, caster, { mp: 0, maxMp: 100 });
        clearMediaEvents();
        tagHandlers['吸蓝'](mkCtx(drainSkillFx, t1, c1, 5));
        soft(t1.mp === 25 && c1.mp === 5, '吸蓝 抽5转施法者（30→25 / 0→5）', '实际 target=' + t1.mp + ' caster=' + c1.mp);
        soft(beatsFor('mpHeal').length === 0 && svgCalls.length === 0, '吸蓝[特效:逆咒归源镜] 门控：无默认 mpHeal/SVG', '出现默认音/视觉');
        // 吸蓝·旧标签不误伤：无 fxTag → 默认 mpHeal + debuff SVG 保留
        const t2 = mkTarget(1); t2.mp = 30; const c2 = Object.assign({}, caster, { mp: 0, maxMp: 100 });
        clearMediaEvents();
        tagHandlers['吸蓝'](mkCtx(drainSkillOld, t2, c2, 5));
        soft(t2.mp === 25 && c2.mp === 5, '吸蓝 无fxTag 数值一致', '实际 target=' + t2.mp + ' caster=' + c2.mp);
        soft(beatsFor('mpHeal').length === 1 && svgCalls.indexOf('debuff') >= 0, '吸蓝 无fxTag 默认 mpHeal+debuff 保留', '实际 mpHeal=' + beatsFor('mpHeal').length + ' svg=' + svgCalls.join(','));
        // 吸蓝·上限：目标 MP 不足按当前封顶
        const t3 = mkTarget(2); t3.mp = 3; const c3 = Object.assign({}, caster, { mp: 0, maxMp: 100 });
        tagHandlers['吸蓝'](mkCtx(drainSkillFx, t3, c3, 5));
        soft(t3.mp === 0 && c3.mp === 3, '吸蓝 以目标当前 MP 封顶（3→0 / 0→3）', '实际 target=' + t3.mp + ' caster=' + c3.mp);
        // 驱散·门控与计数：带 谐律之庇 fxTag → 无 defUp；负面清除 count 层；removed>0 触发 _arcaneFx.dispel
        const dispelSkillFx = w.parseSkill(PROBE_TEXTS['谐律之庇']);
        const dispelSkillOld = w.parseSkill(PROBE_TEXTS['谐律之庇'].replace(/\[特效:[^\]]+\]/, ''));
        const debuffed = n => { const t = mkTarget(n); t.buffs = [{ type: 'poison', value: 5, duration: 2 }, { type: 'def', value: -10, duration: 2 }, { type: 'def', value: 10, duration: 2 }]; return t; };
        let dispelCb = [];
        const dFx = Object.assign(dispelSkillFx, { _arcaneFx: { dispel: dom => dispelCb.push(dom) } });
        const t4 = debuffed(0);
        clearMediaEvents();
        tagHandlers['驱散'](mkCtx(dFx, t4, caster, 2));
        soft(t4.buffs.length === 1 && t4.buffs[0].type === 'def' && t4.buffs[0].value === 10, '驱散 count=2 清 2 层负面，增益保留', '剩余 ' + t4.buffs.map(b => b.type + ':' + b.value).join(','));
        soft(beatsFor('defUp').length === 0 && svgCalls.length === 0, '驱散[特效:谐律之庇] 门控：无默认 defUp/SVG', '出现默认音/视觉');
        soft(dispelCb.length === 1 && dispelCb[0] === w.document.getElementById('e_sv_t0-sprite'), '驱散 removed>0 触发 _arcaneFx.dispel(targetDom)', '回调 ' + dispelCb.length + ' 次');
        // 驱散·旧标签不误伤：无 fxTag → defUp 保留；无负面时不触发 dispel 回调
        const t5 = debuffed(1);
        clearMediaEvents();
        tagHandlers['驱散'](mkCtx(dispelSkillOld, t5, caster, 1));
        soft(beatsFor('defUp').length === 1 && svgCalls.indexOf('buff') >= 0, '驱散 无fxTag 默认 defUp+buff 保留', '实际 defUp=' + beatsFor('defUp').length + ' svg=' + svgCalls.join(','));
        const t6 = { id: 'e_sv_t2', name: '无负面', mp: 0, maxMp: 100, isAlive: true, buffs: [{ type: 'def', value: 10, duration: 2 }] };
        dispelCb = [];
        tagHandlers['驱散'](mkCtx(dFx, t6, caster, 2));
        soft(dispelCb.length === 0, '驱散 removed=0 不触发 _arcaneFx.dispel', '误触发 ' + dispelCb.length + ' 次');
      });

      /* ===== 组9：正式反应hit字符串与Demo DOM入口兼容 ===== */
      await group('hit-contract', () => {
        w.clearArcaneFx(); resetClock(); clearMediaEvents();
        const dom = w.document.getElementById('e_sv_t0-sprite');
        for (const tag of ['碎裂之响', '塞赫美特之愠']) {
          const handle = dispatch(tag);
          check(typeof handle.hit === 'function', tag + '保留hit回调');
          handle.hit('slash');
          if (tag === '塞赫美特之愠') check(dom.classList.contains('arcane-flash-lava'), '正式字符串hit落到闭包目标');
          else check(w.document.querySelector('#arcane-fx-canvas') !== null, '正式字符串hit产生冷银粒子');
          handle.hit(dom);
          check(true, tag + 'hit字符串/DOM双入口均无异常');
          handle.cancel();
          check(!dom.classList.contains('arcane-flash-lava'), tag + '取消清除hit闪色');
        }
      });

      /* ===== 组10：真实executeSkillAction等待五个视觉结算拍点 ===== */
      await group('execute-delay', async () => {
        const originalPrepare = mix.prepareSkill;
        const originalFx = w.playArcaneSkillFx;
        mix.prepareSkill = () => Promise.resolve();
        w.__svEntities = { heroes:[caster], enemies:targets };
        ev('heroesData=__svEntities.heroes;enemiesData=__svEntities.enemies;');
        try {
          for (const tag of TAGS) {
            w.clearArcaneFx(); resetClock(); clearMediaEvents();
            caster.buffs = []; caster.mp = 100;
            let fxAt = -1, settled = false, error = null;
            w.playArcaneSkillFx = () => { fxAt = vt; return { doneAt:base + vt, cancel() {} }; };
            const skill = w.parseSkill('【拍点回归】[单防;power:1][特效:' + tag + ']');
            caster.skills = [skill];
            const run = w.executeSkillAction(caster, caster, skill, 1);
            run.then(() => { settled = true; }, e => { error = e; settled = true; });
            for (let step = 0; step < 300 && !settled; step++) {
              await Promise.resolve(); await Promise.resolve();
              if (timers.length) flush(Math.max(0, Math.min(...timers.map(t => t.at)) - vt));
            }
            check(!error && settled, tag + '真实结算链完成', error && error.message);
            check(fxAt >= 0 && floatCalls.length > 0 && floatCalls[0].t - fxAt === Math.round(EXPECT_DELAY[tag] * 1000),
              tag + '效果结算等待视觉拍点' + EXPECT_DELAY[tag] + 's', JSON.stringify({ fxAt, effectAt:floatCalls[0]?.t }));
            eq(caster.buffs.filter(b => b.type === 'def').length, 1, tag + '等待后只结算一次防御标签');
          }
        } finally {
          mix.prepareSkill = originalPrepare; w.playArcaneSkillFx = originalFx;
          delete w.__svEntities;
        }
      });

      /* ===== 收尾 ===== */
              check(mock.genCount() === gen0, '奇物与技能特效回归不调用LLM');
    } finally {
      restoreClock();
      functions.forEach((fn, name) => {
        if (name === 'mix.play') { if (mix) mix.play = fn; }
        else if (name === 'CombatEvents') { const ce = ev('CombatEvents'); if (ce) { ce.emit = fn[0]; ce.emitAsync = fn[1]; } }
        else w[name] = fn;
      });
      w.Math.random = realRandom;
      try {
        w.__svSaved = saved;
        ev('heroesData=__svSaved.heroesData;enemiesData=__svSaved.enemiesData;battleHistory=__svSaved.battleHistory;' +
          '_historyRawCache=__svSaved._historyRawCache;combatToken=__svSaved.token;_pipelineFrozen=__svSaved.frozen;' +
          'nonLethalSettings.enabled=__svSaved.nonLethal;llmState.allyAutoSpeak=__svSaved.allySpeak;llmState.enemyAutoSpeak=__svSaved.enemySpeak;');
        for (const k of Object.keys(saved.state || {})) {
          try { ev('state[' + JSON.stringify(k) + ']=__svSaved.state[' + JSON.stringify(k) + ']'); } catch (e2) { /* 忽略只读字段 */ }
        }
        try {
          const fxArr = ev('fxEngine.particles');
          fxArr.length = 0; (saved.particles || []).forEach(p => fxArr.push(p));
        } catch (e3) { /* 忽略 */ }
        try { w.clearArcaneFx(); } catch (e4) { /* 忽略 */ }
        try {
          w.localStorage.clear();
          Object.keys(lsSaved).forEach(k => w.localStorage.setItem(k, lsSaved[k]));
        } catch (e5) { /* localStorage 可能禁用 */ }
        try { root.remove(); } catch (e6) { /* 忽略 */ }
        w.__svSaved = undefined;
      } catch (e) { /* 恢复失败按报告呈现 */ }
    }

    if (pending.length) check(true, '回归完成，pending ' + pending.length + ' 项待对齐（详见返回值）');
    else check(true, '奇物与技能定稿 v12.11 回归全部通过');
    return { pending, renderSkipped: true };
  };
})();
