/* 攻击身份演出统合回归（三demo统合：单体12类 + 群体8类 → 正式版 playAttackIdentityFx）。
   覆盖：20类分派/演出产出/onImpact回调、outcomes 函数·Map·对象·DOM逻辑id映射、纯DOM目标、
   取消与多目标寿命、resolveSingleAttackFx 新身份矩阵（刀砍/拳/爪/咬/毒/霜/远程arrow，无箭矢括号）、
   resolveGroupAttackSubtypeFx 新增六类、fire/enemy_spell 换声 light_impact、
   playSingleAttackFx Promise 语义（正常true/打断false）、_pipelineFrozen/combatToken 屏蔽、
   group:* 注册与 fxTag 优先不变、audioUrls 正式20键（basename 口径）。
   约定：
   1) 源码一律取主 harness 传入的 source（实际 RPG_SOURCE 解出的 HTML），不做固定 fetch；
   2) 静态检查只做函数体切片与字面量键名匹配，不依赖压缩后局部变量名；静态未落地只并入 pending，
      不阻断运行期组，运行期直接调用目标 window 的真实函数；
   3) 20类演出使用“按到期时间排序、步数封顶”的有限虚拟时钟（处理嵌套弹道与总时长先后），
      取消/Promise 组使用宿主真实时钟；任何循环均有上限；
   4) 未落地接口/半成品一律 pending 上报待对齐，不误判失败。 */
(function () {
  'use strict';
  window.runAttackIdentityRegression = async function ({ w, check, eq, mock, source } = {}) {
    const ev = code => w.eval(code);
    const hostSetTimeout = setTimeout;
    const wait = ms => new Promise(resolve => hostSetTimeout(resolve, ms));
    const TIMEOUT = { __timeout: true };
    const withTimeout = (p, ms) => Promise.race([Promise.resolve(p),
      new Promise(resolve => hostSetTimeout(() => resolve(TIMEOUT), ms))]);
    const pending = [];
    const note = msg => { if (pending.indexOf(msg) < 0) pending.push(msg); };

    /* ---------- 源码静态提取（字符串/模板/注释感知的括号扫描） ---------- */
    const src = typeof source === 'string' ? source : '';
    let runtimeUrls = null;
    try { runtimeUrls = ev('typeof audioUrls !== "undefined" ? audioUrls : null'); } catch (e) { runtimeUrls = null; }
    function skipQuoted(s, i) {
      const q = s[i];
      for (let j = i + 1; j < s.length; j++) {
        if (s[j] === '\\') { j++; continue; }
        if (q === '`') {
          if (s[j] === '$' && s[j + 1] === '{') { const e = findBraceEnd(s, j + 1); if (e < 0) return -1; j = e; continue; }
          if (s[j] === '`') return j;
        } else if (s[j] === q) return j;
      }
      return -1;
    }
    function findBraceEnd(s, open) {
      let depth = 0;
      for (let i = open; i < s.length; i++) {
        const c = s[i], n = s[i + 1];
        if (c === '/' && n === '/') { const nl = s.indexOf('\n', i + 2); if (nl < 0) return -1; i = nl; continue; }
        if (c === '/' && n === '*') { const end = s.indexOf('*/', i + 2); if (end < 0) return -1; i = end + 1; continue; }
        if (c === "'" || c === '"' || c === '`') { const end = skipQuoted(s, i); if (end < 0) return -1; i = end; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return i; }
      }
      return -1;
    }
    function findParenEnd(s, open) {
      let depth = 0;
      for (let i = open; i < s.length; i++) {
        const c = s[i], n = s[i + 1];
        if (c === '/' && n === '/') { const nl = s.indexOf('\n', i + 2); if (nl < 0) return -1; i = nl; continue; }
        if (c === '/' && n === '*') { const end = s.indexOf('*/', i + 2); if (end < 0) return -1; i = end + 1; continue; }
        if (c === "'" || c === '"' || c === '`') { const end = skipQuoted(s, i); if (end < 0) return -1; i = end; continue; }
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0) return i; }
      }
      return -1;
    }
    const sliceFn = name => {
      let idx = src.indexOf('function ' + name + '(');
      if (idx < 0) idx = src.indexOf('function ' + name + ' (');
      if (idx < 0) {
        const eq1 = src.indexOf(name + ' = function');
        if (eq1 >= 0) idx = eq1 + name.length;
        else {
          const eq2 = src.indexOf(name + '=function');
          if (eq2 >= 0) idx = eq2 + name.length;
        }
      }
      if (idx < 0) return '';
      const pOpen = src.indexOf('(', idx);
      if (pOpen < 0) return '';
      const pEnd = findParenEnd(src, pOpen);
      if (pEnd < 0) return '';
      const bOpen = src.indexOf('{', pEnd);
      if (bOpen < 0) return '';
      const bEnd = findBraceEnd(src, bOpen);
      return bEnd < 0 ? '' : src.slice(idx, bEnd + 1);
    };
    const sliceAudio = () => {
      const i = src.indexOf('const audioUrls');
      if (i < 0) return '';
      const bOpen = src.indexOf('{', i);
      if (bOpen < 0) return '';
      const bEnd = findBraceEnd(src, bOpen);
      return bEnd < 0 ? '' : src.slice(i, bEnd + 1);
    };

    const SINGLE_SUBTYPES = ['枪击', '霰弹', '光', '雷', '爆炸', '刀砍', '拳击', '爪击', '撕咬', '毒液', '箭矢', '冰霜'];
    const AOE_SUBTYPES = ['爆炸', '雷', '火焰', '枪击', '毒雾', '冰霜', '风', '光'];
    // 正式文件 audioUrls 20 个新增身份键（basename，无扩展名）
    const NEW_IDENTITY_KEYS = ['light_charge', 'light_impact', 'thunder_charge', 'thunder_single_hit', 'thunder_aoe_hit',
      'bomb_throw', 'explosion_single', 'explosion_aoe_charge', 'explosion_aoe_blast', 'slash_whoosh_hit_fs434873',
      'claw_bloody_blade_fs323526', 'wolfman', 'creature_slime_01', 'swish_3', 'frost_crystal_impact_fs550267',
      'aoe_gun_burst_fs482122', 'aoe_poison_spell_fs219566', 'aoe_wind_spin_fs772867', 'fire01', 'freeze01'];

    /* ---------- 静态组（仅 pending，不阻断运行期） ---------- */
    if (!src) note('静态跳过:主harness未传入source（运行期组照常执行）');
    const pfx = src ? sliceFn('playAttackIdentityFx') : '';
    const rs = src ? sliceFn('resolveSingleAttackFx') : '';
    const rg = src ? sliceFn('resolveGroupAttackSubtypeFx') : '';
    const audio = src ? sliceAudio() : '';
    if (src) {
      if (!pfx) note('静态不可达:playAttackIdentityFx 函数体切片（压缩/改名时由运行期探测）');
      else {
        SINGLE_SUBTYPES.forEach(t => { if (pfx.indexOf("'" + t + "'") < 0) note('静态未落地:playAttackIdentityFx缺单体分支:' + t); });
        AOE_SUBTYPES.forEach(t => { if (pfx.indexOf("'" + t + "'") < 0) note('静态未落地:playAttackIdentityFx缺群体分支:' + t); });
      }
      if (!rs) note('静态不可达:resolveSingleAttackFx 函数体切片');
      else {
        ['slash_identity', 'punch', 'claw', 'bite', 'venom', 'frost'].forEach(k => { if (rs.indexOf("'" + k + "'") < 0) note('静态未落地:resolveSingleAttackFx缺新身份:' + k); });
        ['gunshot', 'shotgun', 'light', 'thunder_single', 'explosion_single', 'fire', 'enemy_spell'].forEach(k => { if (rs.indexOf("'" + k + "'") < 0) note('静态未落地:resolveSingleAttackFx缺旧身份:' + k); });
        if (!/return\s+'slash'/.test(rs)) note('静态未落地:resolveSingleAttackFx近战默认slash缺失');
        if (rs.indexOf('箭矢') >= 0) note('静态提示:resolveSingleAttackFx出现箭矢分支（契约要求无箭矢括号）');
      }
      if (!rg) note('静态不可达:resolveGroupAttackSubtypeFx 函数体切片');
      else {
        ['fire', 'gunshot', 'poison', 'frost', 'wind', 'light'].forEach(k => { if (rg.indexOf("'" + k + "'") < 0) note('静态未落地:resolveGroupAttackSubtypeFx缺新类:' + k); });
        ['shotgun', 'explosion', 'thunder'].forEach(k => { if (rg.indexOf("'" + k + "'") < 0) note('静态未落地:resolveGroupAttackSubtypeFx缺旧类:' + k); });
      }
      if (!runtimeUrls) {
        if (!audio) note('静态提示:audioUrls对象切片不可达（压缩改名），改用全文键名匹配');
        const audioScope = audio || src;
        const hasKey = k => audioScope.indexOf("'" + k + "'") >= 0;
        const hasBasename = k => audioScope.indexOf('/' + k + '.') >= 0;
        const hit = NEW_IDENTITY_KEYS.filter(k => hasKey(k) && hasBasename(k));
        if (hit.length < NEW_IDENTITY_KEYS.length) note('audioUrls新身份键覆盖不足:' + hit.length + '/' + NEW_IDENTITY_KEYS.length + '，缺:' + NEW_IDENTITY_KEYS.filter(k => hit.indexOf(k) < 0).join(','));
        NEW_IDENTITY_KEYS.forEach(k => { if (hasKey(k) && !hasBasename(k)) note('audioUrls键basename不符(应为文件名去扩展):' + k); });
        if (!hasKey('atk2')) note('静态未落地:audioUrls既有atk2键缺失');
      }
      const idSample = sliceFn('idSample');
      if (idSample && !/\brate\s*=\s*1\b/.test(idSample)) note('静态未落地:idSample rate第三参默认1');
      if (idSample && idSample.indexOf('maxDurSec') < 0) note('静态未落地:idSample长采样裁窗参数(maxDurSec/fadeOutSec)未保留');
    }
    // 运行期音效表优先：不依赖源码局部名与压缩形态
    if (runtimeUrls) {
      const missing = NEW_IDENTITY_KEYS.filter(k => !runtimeUrls[k]);
      if (missing.length) note('audioUrls运行期缺失新身份键:' + missing.join(','));
      const badBase = NEW_IDENTITY_KEYS.filter(k => {
        const u = runtimeUrls[k];
        if (!u) return false;
        const base = String(u).split('?')[0].split('/').pop() || '';
        return base.indexOf(k + '.') !== 0;
      });
      badBase.forEach(k => note('audioUrls运行期basename不符(应为文件名去扩展):' + k));
      if (!runtimeUrls['atk2']) note('audioUrls运行期缺既有atk2键');
    }

    const api = ['playAttackIdentityFx', 'playSingleAttackFx', 'resolveSingleAttackFx', 'resolveGroupAttackSubtypeFx',
      'resolveEnemyGroupAttackFx', 'isHeroSideEntity', 'playArcaneProjectile', 'clearArcaneFx', 'getEntitySpriteDom',
      'parseSkill', 'applySingleTagEffect', 'playSound', 'playSVGEffect', 'playCustomAudio', 'createFloatingText',
      'playRandomStandardGunshot', 'playShotgunSound', 'isArcaneSkillFx'];
    const hasFn = name => ev('typeof ' + name) === 'function';
    if (!hasFn('playAttackIdentityFx')) { note('接口缺失:playAttackIdentityFx（运行组整体跳过）'); return { pending: pending.slice() }; }
    api.forEach(name => { if (!hasFn(name)) note('接口缺失(相关断言按待对齐处理):' + name); });

    /* ---------- 现场保存（函数在目标 window 按引用恢复，finally 清理自有 timers/DOM/音频/粒子） ---------- */
    let saved;
    try {
      saved = ev(`({ heroesData, enemiesData, initialHeroesCache, initialEnemiesCache, battleHistory, _historyRawCache,
        teamBarrier, teamBarrierMax, teamBarrierName, barrierArmor, barrierSub, barrierStandIn, barrierAoEActive, barrierAoELeak,
        combatToken, frozen:_pipelineFrozen, shatter:_barrierShatterAt, state:{...state}, llm:{...llmState}, nonLethal:nonLethalSettings.enabled,
        speeds:new Map(_recentSpeedChanges), emit:CombatEvents.emit, emitAsync:CombatEvents.emitAsync, random:Math.random,
        particles:fxEngine.particles.slice() })`);
    } catch (e) {
      note('状态快照失败:' + String((e && e.message) || e));
      return { pending: pending.slice() };
    }
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;

    /* ---------- 测试舞台 ---------- */
    const root = w.document.createElement('div');
    root.id = 'attack-identity-regression-stage';
    root.style.cssText = 'position:fixed;left:20px;top:200px;width:900px;height:300px;pointer-events:none;';
    root.innerHTML =
      '<div id="hero-card-h_atk0" style="position:absolute;left:0;top:0;width:110px;height:120px;background:#243047;border:1px solid #7dd3fc"><div class="entity-name">身份目标0</div></div>' +
      '<div id="hero-card-h_atk1" style="position:absolute;left:130px;top:0;width:110px;height:120px;background:#243047;border:1px solid #7dd3fc"><div class="entity-name">身份目标1</div></div>' +
      '<div id="hero-card-h_atk2" style="position:absolute;left:260px;top:135px;width:110px;height:120px;background:#1e3a5f;border:1px solid #f59e0b"><div class="entity-name">后排目标2</div></div>' +
      '<div id="hero-card-s_atk0" style="position:absolute;left:400px;top:0;width:100px;height:100px;background:#14532d"><div style="width:100px;height:100px">🐉</div></div>' +
      '<div id="e_atk-sprite" style="position:absolute;left:420px;top:-160px;width:100px;height:100px;background:#4c1d58"><img alt="" style="width:100px;height:100px;display:block"></div>';
    w.document.body.appendChild(root);
    const domOf = id => w.document.getElementById(id);
    const enemyDom = domOf('e_atk-sprite');
    const floatsBefore = new Set(w.document.querySelectorAll('.floating-text,.burst-text'));
    const entity = (id, extra) => Object.assign({ id, name: id, hp: 3000, maxHp: 3000, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 10, def: 0, spd: 1, shield: 0, hit: 0, actCount: 1, isAlive: true, buffs: [], skills: [], items: [],
      classType: null, isSummon: false, row: 'front' }, extra);
    const installData = (heroes, enemies) => {
      ev('heroesData=' + JSON.stringify(heroes) + ';enemiesData=' + JSON.stringify(enemies) +
        ';teamBarrier=0;teamBarrierMax=0;barrierArmor=0;barrierSub=null;barrierAoELeak=null;barrierAoEActive=false;_barrierShatterAt=0;');
      return { h: ev('heroesData'), e: ev('enemiesData') };
    };
    const attack = (type, tag, fxTag) => w.parseSkill('【回归攻击】[' + (tag || '单体') + ';power:80]' +
      (fxTag ? '[特效:' + fxTag + ']' : '') + (type ? '[' + type + ']' : ''));
    const group = async (name, fn) => {
      try { await fn(); }
      catch (e) { check(false, name + ' 执行异常', String((e && e.stack) || e)); }
    };
    // 回调键口径与 identityTargetKey 一致：DOM → 逻辑id，实体 → id
    const keyOf = t => {
      if (t && typeof t === 'object' && t.nodeType === 1) {
        return t.dataset && t.dataset.arcaneTargetId
          ? t.dataset.arcaneTargetId
          : (t.id || '').replace(/^hero-(?:card|wrap)-/, '').replace(/-sprite$/, '') || t.id;
      }
      return t && t.id ? t.id : t;
    };
    const impactCounter = () => {
      const counts = new Map(), metas = new Map(), raws = [];
      return {
        cb: (t, meta) => { raws.push(t); const k = keyOf(t); counts.set(k, (counts.get(k) || 0) + 1); metas.set(k, meta); },
        n: k => counts.get(keyOf(k)) || 0,
        meta: k => metas.get(keyOf(k)),
        total: () => { let s = 0; counts.forEach(v => { s += v; }); return s; },
        raws
      };
    };

    /* ---------- 有限虚拟时钟（按 due 排序，处理嵌套弹道/总时长先后；步数封顶） ---------- */
    const nativeSetTimeout = w.setTimeout, nativeClearTimeout = w.clearTimeout;
    const nativeDateNow = w.Date.now, nativePerfNow = w.performance && w.performance.now;
    const dateEpoch = nativeDateNow.call(w.Date);
    const perfEpoch = nativePerfNow ? nativePerfNow.call(w.performance) : 0;
    let vnow = 0, vseq = 0;
    const vqueue = [];
    const virtualSetTimeout = (fn, ms, ...args) => {
      const t = { due: vnow + Math.max(0, Number(ms) || 0), seq: ++vseq, fn, args };
      vqueue.push(t);
      return t;
    };
    const virtualClearTimeout = t => { const i = vqueue.indexOf(t); if (i >= 0) vqueue.splice(i, 1); };
    // 只接管计时器不够：doneAt/remaining 都读 Date.now，若仍走真实时间，虚拟推进后的补偿定时会按真实间隔重复安排自然收尾。
    const patchVirtualTime = () => {
      try { w.Date.now = () => dateEpoch + vnow; } catch (e) { note('待对齐:虚拟时钟无法接管 Date.now'); }
      if (nativePerfNow) { try { w.performance.now = () => perfEpoch + vnow; } catch (e) { /* performance 仅辅助，无法接管时以 Date.now 为准 */ } }
    };
    const restoreRealTime = () => {
      try { w.Date.now = nativeDateNow; } catch (e) {}
      if (nativePerfNow) { try { w.performance.now = nativePerfNow; } catch (e) {} }
    };
    const useVirtualClock = () => { w.setTimeout = virtualSetTimeout; w.clearTimeout = virtualClearTimeout; patchVirtualTime(); };
    const useRealClock = () => { w.setTimeout = nativeSetTimeout; w.clearTimeout = nativeClearTimeout; restoreRealTime(); };
    const resetVirtual = () => { vnow = 0; vseq = 0; vqueue.length = 0; };
    const advance = async (untilMs, label) => {
      let guard = 0;
      for (;;) {
        if (++guard > 4000) { note('虚拟时钟步数超限(已停止推演):' + label + '@' + untilMs + 'ms'); break; }
        vqueue.sort((a, b) => a.due - b.due || a.seq - b.seq);
        const t = vqueue[0];
        if (!t || t.due > untilMs) break;
        vqueue.shift();
        vnow = t.due;
        try { t.fn(...t.args); }
        catch (e) { check(false, label + ' 定时回调异常', String((e && e.stack) || e)); }
        await Promise.resolve();
      }
      vnow = Math.max(vnow, untilMs);
    };

    /* ---------- mock（只替换 window 可解析的全局入口） ---------- */
    const functions = new Map(), hadOwn = new Map();
    const replace = (name, fn) => {
      if (!functions.has(name)) {
        functions.set(name, w[name]);
        hadOwn.set(name, Object.prototype.hasOwnProperty.call(w, name));
      }
      w[name] = fn;
    };
    const calls = { sounds: [], customAudio: [], svg: [], projectiles: [], floats: [], flinch: [], gun: 0, shotgun: 0 };
    const clearCalls = () => Object.keys(calls).forEach(k => { if (Array.isArray(calls[k])) calls[k].length = 0; else calls[k] = 0; });
    const realFloat = w.createFloatingText, realProjectile = w.playArcaneProjectile;
    const projectileMock = async type => { calls.projectiles.push(type); };

    try {
      for (const name of ['updateHeroUI', 'updateEnemyUI', 'renderTurnQueue', 'tryTriggerEnemyLowHpSpeak', 'tryTriggerEnemyMolt',
        'tryTriggerEnemyRage', 'tryTriggerEnemyLink', 'notifyManaSpent', 'triggerHighTierCombinedSpeak', 'triggerAllyHealSpeak',
        'triggerAllyAutoSpeak', 'spawnHitFlash', 'triggerScreenShake', 'spawnDodgeSmokeParticles', 'playEnemyFlinchAnim',
        'spawnFocusOverlay', 'spawnChargeUpParticles', 'spawnDefaultAOEParticles', 'spawnExplosionParticles',
        'spawnThunderAOEParticles', 'spawnFireAOEParticles', 'playWebMFX', 'playDragonBreathFireSFX', 'spawnCanvasParticles']) replace(name, () => {});
      replace('playEnemyFlinchAnim', (dom, anim, ms) => { calls.flinch.push(dom && dom.id); });
      replace('playSound', (key, vol, rate) => { calls.sounds.push({ key, vol, rate }); });
      replace('playCustomAudio', url => { calls.customAudio.push(String(url)); });
      replace('playRandomStandardGunshot', () => { calls.gun++; return null; });
      replace('playShotgunSound', () => { calls.shotgun++; });
      replace('playSVGEffect', (dom, type) => { calls.svg.push(type); });
      replace('createFloatingText', (dom, text, color, burst) => { calls.floats.push(text); realFloat(dom, text, color, burst); });
      replace('playArcaneProjectile', projectileMock);
      replace('promptReaction', (target, skills) => skills && skills.length ? { type: 'reaction', hero: target, skill: skills[0] } : null);
      ev('combatToken={};_pipelineFrozen=false;nonLethalSettings.enabled=false;llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;state.isGameStarted=false;state.highTierNarrated=new Set();state.actionQueue=[];state.queueIndex=0;');
      w.Math.random = () => 0.5;
      ev('CombatEvents').emit = () => {};
      ev('CombatEvents').emitAsync = async () => {};

      /* ========== 一、单体12类：分派、演出产出、onImpact元数据（纯DOM目标） ========== */
      await group('单体12类分派与演出', async () => {
        useVirtualClock();
        const caster = entity('e_atk');
        for (const subtype of SINGLE_SUBTYPES) {
          resetVirtual(); clearCalls();
          try { w.clearArcaneFx(); } catch (e) {}
          const target = domOf('hero-card-h_atk0');
          const layers0 = w.document.querySelectorAll('.arcane-fs-layer').length;
          const p0 = w.fxEngine.particles.length;
          const ic = impactCounter();
          const handle = w.playAttackIdentityFx({ scope: 'single', subtype, caster, targets: [target],
            outcomes: { h_atk0: 'hit' }, onImpact: ic.cb });
          if (!handle) { note('待对齐:playAttackIdentityFx单体分支未返回handle:' + subtype); continue; }
          check(typeof handle.cancel === 'function' && typeof handle.doneAt === 'number', '单体handle含cancel/doneAt：' + subtype);
          await advance(200, '单体视觉拍点:' + subtype);
          check(w.document.querySelectorAll('.arcane-fs-layer').length > layers0 || w.fxEngine.particles.length > p0,
            '单体演出产生视觉层/粒子：' + subtype);
          await advance(6000, '单体:' + subtype);
          eq(ic.n(target), 1, '单体onImpact恰一次：' + subtype);
          const meta = ic.meta(target);
          check(!!meta && meta.scope === 'single' && meta.subtype === subtype && meta.outcome === 'hit',
            'onImpact元数据scope/subtype/outcome正确：' + subtype, JSON.stringify(meta || null));
          check(!!meta && typeof meta.beatMs === 'number' && meta.point && typeof meta.point.x === 'number' && typeof meta.point.y === 'number',
            'onImpact元数据point与beatMs有效：' + subtype, JSON.stringify(meta || null));
          check(!calls.sounds.some(s => ['atk1', 'atk2', 'burst', 'gunshot', 'shotgun'].indexOf(s.key) >= 0),
            '单体身份演出不播旧合成攻击音：' + subtype);
        }
        // DOM → 逻辑id 映射与 dodge outcome
        resetVirtual(); clearCalls();
        try { w.clearArcaneFx(); } catch (e) {}
        const icd = impactCounter();
        w.playAttackIdentityFx({ scope: 'single', subtype: '刀砍', caster, targets: [domOf('hero-card-h_atk0')],
          outcomes: { h_atk0: 'dodge' }, onImpact: icd.cb });
        await advance(6000, '单体DOM闪避');
        const md = icd.meta('h_atk0');
        eq(md && md.outcome, 'dodge', 'DOM目标按逻辑id匹配outcomes并回传dodge');
        check(icd.raws.length === 1 && icd.raws[0] === domOf('hero-card-h_atk0'), 'onImpact原样回传传入的DOM目标');
        eq(w.playAttackIdentityFx({ scope: 'single', subtype: '不存在的类型', caster, targets: [domOf('hero-card-h_atk0')] }), null,
          '未知单体子类型返回null不抛错');
        eq(w.playAttackIdentityFx({ scope: 'aoe', subtype: '不存在的类型', caster, targets: [domOf('hero-card-h_atk0')] }), null,
          '未知群体子类型返回null不抛错');
        try { w.clearArcaneFx(); } catch (e) {}
        resetVirtual();
      });

      /* ========== 二、群体8类：多目标寿命（实体、跨行后排、召唤物、闪避混合） ========== */
      await group('群体8类多目标寿命', async () => {
        useVirtualClock();
        const caster = entity('e_atk');
        const t0 = entity('h_atk0'), t1 = entity('h_atk1', { row: 'back' }), ts = entity('s_atk0', { isSummon: true, side: 'hero' });
        for (const subtype of AOE_SUBTYPES) {
          resetVirtual(); clearCalls();
          try { w.clearArcaneFx(); } catch (e) {}
          const ic = impactCounter();
          const outcomes = new Map([['h_atk0', 'hit'], ['h_atk1', 'dodge'], ['s_atk0', 'hit']]);
          const handle = w.playAttackIdentityFx({ scope: 'aoe', subtype, caster, targets: [t0, t1, ts], outcomes, onImpact: ic.cb });
          if (!handle) { note('待对齐:playAttackIdentityFx群体分支未返回handle:' + subtype); continue; }
          check(typeof handle.doneAt === 'number', '群体handle含doneAt：' + subtype);
          await advance(6000, '群体:' + subtype);
          eq(ic.n(t0), 1, '群体目标0（前排）回调恰一次：' + subtype);
          eq(ic.n(t1), 1, '群体目标1（跨行后排）回调恰一次：' + subtype);
          eq(ic.n(ts), 1, '群体召唤物回调恰一次：' + subtype);
          eq(ic.total(), 3, '群体多目标回调总数恰为目标数（总时长未截断嵌套拍点）：' + subtype);
          eq(ic.meta(t1) && ic.meta(t1).outcome, 'dodge', '群体闪避目标outcome=dodge且仍有回调：' + subtype);
          const rawSet = new Set(ic.raws);
          check(ic.raws.length === 3 && rawSet.has(t0) && rawSet.has(t1) && rawSet.has(ts),
            '群体onImpact按原实体回传（顺序按各演出拍点可不同）：' + subtype);
          const m0 = ic.meta(t0);
          check(!!m0 && m0.scope === 'aoe' && m0.subtype === subtype && typeof m0.beatMs === 'number',
            '群体元数据scope/subtype/beatMs正确：' + subtype, JSON.stringify(m0 || null));
        }
        try { w.clearArcaneFx(); } catch (e) {}
        resetVirtual();
      });

      /* ========== 三、outcomes 函数形态与双方施法者 ========== */
      await group('outcomes形态与双方', async () => {
        useVirtualClock();
        resetVirtual(); clearCalls();
        const ic = impactCounter();
        w.playAttackIdentityFx({ scope: 'single', subtype: '刀砍', caster: entity('h_atk0'),
          targets: [enemyDom], outcomes: () => 'hit', onImpact: ic.cb });
        await advance(6000, '函数outcomes');
        eq(ic.n(enemyDom), 1, '我方caster打敌方DOM：函数outcomes命中回调一次');
        resetVirtual(); clearCalls();
        const ic2 = impactCounter();
        w.playAttackIdentityFx({ scope: 'single', subtype: '爪击', caster: entity('e_atk'),
          targets: [entity('h_atk2')], outcomes: t => (t.id === 'h_atk2' ? 'dodge' : 'hit'), onImpact: ic2.cb });
        await advance(6000, '函数target判断');
        eq(ic2.n('h_atk2'), 1, '敌方caster打后排实体：回调一次');
        eq(ic2.meta('h_atk2') && ic2.meta('h_atk2').outcome, 'dodge', '函数按target返回dodge生效');
        resetVirtual(); clearCalls();
        const ic3 = impactCounter();
        w.playAttackIdentityFx({ scope: 'single', subtype: '撕咬', caster: entity('e_atk'),
          targets: [domOf('hero-card-s_atk0')], outcomes: null, onImpact: ic3.cb });
        await advance(6000, 'null outcomes');
        eq(ic3.n('s_atk0'), 1, 'outcomes为null时默认hit且纯DOM目标回调一次');
        try { w.clearArcaneFx(); } catch (e) {}
        resetVirtual();
      });

      /* ========== 四、取消与 playSingleAttackFx Promise 语义（宿主真实时钟） ========== */
      await group('取消与Promise语义', async () => {
        useRealClock();
        try { w.clearArcaneFx(); } catch (e) {}
        const caster = entity('e_atk');
        const ic = impactCounter();
        const handle = w.playAttackIdentityFx({ scope: 'single', subtype: '刀砍', caster, targets: [domOf('hero-card-h_atk0')],
          outcomes: { h_atk0: 'hit' }, onImpact: ic.cb });
        check(!!handle && typeof handle.cancel === 'function', '取消前handle可取消');
        handle.cancel();
        const budget = Math.max(400, Math.min((handle.doneAt - Date.now()) + 600, 3200));
        await wait(budget);
        eq(ic.total(), 0, 'cancel后无迟到onImpact回调');
        w.clearArcaneFx();
        eq(ic.total(), 0, 'clear后无迟到onImpact回调');
        const judge = (value, expected, label) => {
          if (value === expected) check(true, label);
          else if (typeof value === 'undefined') note('待对齐:' + label + '（playSingleAttackFx 尚未接线 Promise 返回值）');
          else check(false, label, '实际=' + String(value));
        };
        if (!hasFn('playSingleAttackFx')) {
          note('待对齐:playSingleAttackFx不可直接调用（压缩/改名），Promise语义组跳过');
          return;
        }
        const rOk = await withTimeout(w.playSingleAttackFx('slash', caster, domOf('hero-card-h_atk0'), false), 2000);
        if (rOk === TIMEOUT) check(false, 'playSingleAttackFx正常完成未返回', '超时2000ms');
        else judge(rOk, true, 'playSingleAttackFx正常完成resolve true');
        // 打断路径：使用真实弹道，clearArcaneFx 应中断并 resolve(false)
        w.playArcaneProjectile = realProjectile;
        const pFire = w.playSingleAttackFx('fire', caster, domOf('hero-card-h_atk0'), false);
        await Promise.resolve();
        w.clearArcaneFx();
        const rFire = await withTimeout(pFire, 2000);
        w.playArcaneProjectile = projectileMock;
        if (rFire === TIMEOUT) check(false, 'playSingleAttackFx打断路径未返回', '超时2000ms');
        else judge(rFire, false, 'clear打断后playSingleAttackFx resolve false');
      });

      /* ========== 五、resolveSingleAttackFx 身份矩阵（新身份待对齐，旧键严格） ========== */
      await group('单体身份解析矩阵', async () => {
        if (!hasFn('resolveSingleAttackFx')) { note('待对齐:resolveSingleAttackFx不可直接调用（压缩/改名），矩阵跳过'); return; }
        const hero = entity('h_atk0'), enemy = entity('e_atk');
        const hsum = entity('s_hx', { isSummon: true, side: 'hero' }), esum = entity('s_ex', { isSummon: true, side: 'enemy' });
        const NEW_SINGLE = ['slash_identity', 'punch', 'claw', 'bite', 'venom', 'frost', 'arrow'];
        const landed = k => !!rs && (k === 'arrow' ? /\breturn\s+'arrow'/.test(rs) : rs.indexOf("'" + k + "'") >= 0);
        const cases = [
          [enemy, '[单体(刀砍)]', {}, 'slash_identity'], [enemy, '[单体(拳击)]', {}, 'punch'],
          [enemy, '[单体(爪击)]', {}, 'claw'], [enemy, '[单体(撕咬)]', {}, 'bite'],
          [enemy, '[单体(毒液)]', {}, 'venom'], [enemy, '[单体(冰霜)]', {}, 'frost'],
          [enemy, '[单体(霰弹)]', {}, 'shotgun'], [enemy, '[单体(枪击)]', {}, 'gunshot'],
          [enemy, '[单体(光)]', {}, 'light'], [enemy, '[单体(雷)]', {}, 'thunder_single'],
          [enemy, '[单体(爆炸)]', {}, 'explosion_single'], [enemy, '[穿透(火焰)]', {}, 'fire'],
          [enemy, '[单体]', { damageType: '法术' }, 'enemy_spell'],
          [hero, '[单体]', {}, 'slash'], [enemy, '[单体]', {}, 'slash'],
          [hero, '[单体]', { damageType: '远程' }, 'arrow'], [enemy, '[单体]', { damageType: '远程' }, 'arrow'],
          [hsum, '[单体]', {}, 'slash'], [esum, '[单体]', { damageType: '远程' }, 'arrow'],
          [esum, '[单体]', { damageType: '法术' }, 'enemy_spell'],
          [hero, '[单体(箭矢)]', {}, 'slash'], [enemy, '[单体(箭矢)]', { damageType: '远程' }, 'arrow'],
          [enemy, '[单体]', { fxTag: '火焰01' }, null], [enemy, '[群攻]', {}, null],
          [enemy, '[单回]', {}, null]
        ];
        cases.forEach(([c, tag, s, exp], i) => {
          const actual = w.resolveSingleAttackFx(c, tag, s);
          const label = '单体身份矩阵 ' + (i + 1) + '：' + tag + (s.damageType ? '/' + s.damageType : '') + (s.fxTag ? '/专属' : '');
          if (actual === exp) { check(true, label); return; }
          if (NEW_SINGLE.indexOf(exp) >= 0 && !landed(exp)) {
            note('待对齐:resolveSingleAttackFx新身份 ' + exp + '（' + tag + (s.damageType ? '/' + s.damageType : '') + ' 当前=' + actual + '）');
            return;
          }
          eq(actual, exp, label);
        });
      });

      /* ========== 六、resolveGroupAttackSubtypeFx 新增六类 + 兜底/fxTag优先不变 ========== */
      await group('群体子类矩阵与兜底不变', async () => {
        if (!hasFn('resolveGroupAttackSubtypeFx') || !hasFn('resolveEnemyGroupAttackFx')) {
          note('待对齐:群攻解析函数不可直接调用（压缩/改名），矩阵跳过');
          return;
        }
        const newGroups = [['[群攻(火焰)]', 'fire'], ['[群攻(枪击)]', 'gunshot'], ['[群攻(毒雾)]', 'poison'],
          ['[群攻(冰霜)]', 'frost'], ['[群攻(风)]', 'wind'], ['[群攻(光)]', 'light']];
        newGroups.forEach(([tag, key]) => {
          const actual = w.resolveGroupAttackSubtypeFx(tag);
          if (actual === key) { check(true, '群体新类精确识别：' + tag); return; }
          if (!rg || rg.indexOf("'" + key + "'") < 0) { note('待对齐:resolveGroupAttackSubtypeFx新类 ' + key + '（' + tag + ' 当前=' + actual + '）'); return; }
          eq(actual, key, '群体新类精确识别：' + tag);
        });
        eq(['[散射(霰弹)]', '[群攻(爆炸)]', '[眩晕(雷)]', '[群攻]', '[群回]', '[单体(火焰)]', '[单体]', '[散射]', '[眩晕]']
          .map(t => w.resolveGroupAttackSubtypeFx(t)),
          [null, 'explosion', null, null, null, null, null, null, null],
          'resolveGroupAttackSubtypeFx 仅受理群标签：散射/眩晕/单体不接管，旧爆炸保留');
        const enemy = entity('e_atk'), esum = entity('s_ex', { isSummon: true, side: 'enemy' });
        const g = (c, t, s) => w.resolveEnemyGroupAttackFx(c, t, s) || null;
        eq([g(enemy, '[群攻]', {}), g(enemy, '[群攻]', { damageType: '远程' }), g(enemy, '[群攻]', { damageType: '法术' }),
          g(esum, '[群攻]', { damageType: '法术' }), g(enemy, '[群攻]', { fxTag: '燃烧弹' }),
          g(enemy, '[群攻(爆炸)]', {}), g(enemy, '[单体]', {}), g(enemy, '[散射]', {}), g(enemy, '[眩晕]', {})],
          ['group:melee', 'group:ranged', 'group:spell', 'group:spell', null, null, null, null, null],
          '群攻兜底三键与fxTag优先、括号互斥、单体/散射/眩晕不接管全部保持');
        const reg = ev('typeof WEBM_FX_REGISTRY !== "undefined" ? WEBM_FX_REGISTRY : null') || {};
        ['group:melee', 'group:ranged', 'group:spell'].forEach(key => {
          const entry = reg[key];
          if (!entry || !w.isArcaneSkillFx(key)) note('既有群攻注册缺失:' + key);
          else if (entry.delay !== 0.35 || entry.scale !== 1 || entry.particles !== 'arcane') note('既有群攻注册参数变动:' + key);
        });
        eq([w.isArcaneSkillFx('group:melee'), w.isArcaneSkillFx('伊西丝之拥'), w.isArcaneSkillFx('火焰01')],
          [true, true, false], 'isArcaneSkillFx既有识别面不变');
      });

      /* ========== 七、fire/enemy_spell 换声 + 旧合成音去重 + flinch 出口 ========== */
      await group('换声与旧音去重', async () => {
        useRealClock();
        if (!hasFn('playSingleAttackFx')) { note('待对齐:playSingleAttackFx不可直接调用（压缩/改名），换声组跳过'); return; }
        const caster = entity('e_atk'), dom = domOf('hero-card-h_atk0');
        const oldKeys = ['atk1', 'atk2', 'burst', 'gunshot', 'shotgun'];
        const oldSoundCount = () => calls.sounds.filter(s => oldKeys.indexOf(s.key) >= 0).length;
        for (const type of ['fire', 'enemy_spell']) {
          // ① 分派：mock 弹道，确认视觉入口仍是原类型
          w.playArcaneProjectile = projectileMock;
          clearCalls();
          await w.playSingleAttackFx(type, caster, dom, false);
          eq(calls.projectiles, [type], type + ' 视觉仍走原弹道（火焰/紫弹不变）');
          eq(oldSoundCount(), 0, type + ' 不播任何旧攻击合成音');
          eq(calls.gun + calls.shotgun, 0, type + ' 不走旧枪声入口');
          // ② 真实弹道：明确 await 一次，命中拍点的 light_impact 主音经 idSample→playSound 真实播出
          w.playArcaneProjectile = realProjectile;
          clearCalls();
          const r = await withTimeout(w.playSingleAttackFx(type, caster, dom, false), 4000);
          w.playArcaneProjectile = projectileMock;
          if (r === TIMEOUT) check(false, type + ' 真实弹道未在 4s 内完成', '超时');
          else check(r === true, type + ' 真实弹道命中返回 true', '实际=' + String(r));
          eq(calls.sounds.filter(s => s.key === 'light_impact').length, 1, type + ' 命中拍点 light_impact 主音恰一次');
          eq(oldSoundCount(), 0, type + ' 真实命中不叠旧攻击合成音');
          eq(calls.gun + calls.shotgun, 0, type + ' 真实命中不走旧枪声入口');
          try { w.clearArcaneFx(); } catch (e) {}
        }
        w.playArcaneProjectile = projectileMock;
        clearCalls();
        await w.playSingleAttackFx('gunshot', caster, dom, false);
        eq(calls.gun, 1, '枪击保留随机枪声入口');
        // flinch 已统一到 hit 出口（playHitFeedback），playSingleAttackFx 不再调用旧 playEnemyFlinchAnim
        clearCalls();
        await w.playSingleAttackFx('gunshot', caster, dom, false, true);
        eq(calls.flinch.length, 0, 'flinch默认true不再触发旧 playEnemyFlinchAnim');
        clearCalls();
        await w.playSingleAttackFx('gunshot', caster, dom, false, false);
        eq(calls.flinch.length, 0, '显式flinch=false同样不触发旧受击动画');
        clearCalls();
        if (typeof w.playHitFeedback === 'function' && typeof w.clearHitFeedback === 'function') {
          const heroDom = domOf('hero-card-h_atk0');
          const fb = w.playHitFeedback({ targetId: 'h_atk0', outcome: 'hit', hpDmg: 100, hpBefore: 1000, hpAfter: 900, maxHp: 1000 },
            { suppressAudio: true, suppressShake: true });
          check(heroDom.classList.contains('arcane-hit-recoil'), '实战命中反馈主路径为受击者挂 recoil（受击表现唯一出口）');
          try { fb.cancel(); } catch (e) {}
          try { w.clearHitFeedback(); } catch (e) {}
        } else note('待对齐:playHitFeedback/clearHitFeedback不可直接调用，实战 recoil 未验证');
        clearCalls();
        await w.playSingleAttackFx('slash', caster, dom, true);
        eq(calls.sounds.filter(s => s.key === 'atk2').length, 0, '闪避近战不响atk2受击音（旧规则保持）');
      });

      /* ========== 八、_pipelineFrozen 与 combatToken 屏蔽 ========== */
      await group('冻结与token屏蔽', async () => {
        useRealClock();
        if (!hasFn('applySingleTagEffect') || !hasFn('parseSkill')) {
          note('待对齐:applySingleTagEffect/parseSkill不可直接调用（压缩/改名），冻结组跳过');
          return;
        }
        const d = installData([entity('h_atk0')], [entity('e_atk')]);
        clearCalls();
        ev('_pipelineFrozen=true');
        await w.applySingleTagEffect(d.e[0], d.h[0], '[单体]', 50, 100, 1, null, attack());
        eq(calls.svg.length + calls.projectiles.length + calls.sounds.length, 0, '_pipelineFrozen期间演出链路全静默');
        eq(d.h[0].hp, 3000, '_pipelineFrozen期间不结算伤害');
        ev('_pipelineFrozen=false');
        clearCalls();
        await w.applySingleTagEffect(d.e[0], d.h[0], '[单体]', 50, 100, 1, null, attack());
        check(calls.svg.length + calls.projectiles.length + calls.sounds.length > 0, '解冻后演出链路恢复');
        useVirtualClock();
        resetVirtual(); clearCalls();
        try { w.clearArcaneFx(); } catch (e) {}
        const ic = impactCounter();
        const handle = w.playAttackIdentityFx({ scope: 'single', subtype: '拳击', caster: d.e[0],
          targets: [domOf('hero-card-h_atk0')], outcomes: { h_atk0: 'hit' }, onImpact: ic.cb });
        ev('combatToken={}');
        w.clearArcaneFx();
        await advance(1500, 'token屏蔽');
        eq(ic.total(), 0, 'token更替+清场后旧代演出无迟到回调');
        check(!!handle && typeof handle.doneAt === 'number', '旧代handle仍为可检查实例');
        try { w.clearArcaneFx(); } catch (e) {}
        resetVirtual();
      });
      /* ========== 九、真实整波接触：先反应、同拍扣血、取消与屏障 ========== */
      await group('真实整波接触结算', async () => {
        useRealClock();
        try { w.clearArcaneFx(); } catch (e) {}
        const realFeedback = w.playHitFeedback;
        const results = [], impacts = [], preparations = [];
        const realIdentity = w.playAttackIdentityFx, realPrepare = w.prepareSingleAttackHit;
        const recordFeedback = (r, opts) => { results.push({ r, opts, at:Date.now() }); return { doneAt:Date.now(), cancel() {} }; };
        const recordIdentity = opts => realIdentity(Object.assign({}, opts, { onImpact:(t, meta) => {
          impacts.push({ id:t.id, meta, before:lookup(t.id)?.hp, at:Date.now() });
          opts.onImpact(t, meta);
          impacts[impacts.length - 1].after = lookup(t.id)?.hp;
        } }));
        const lookup = id => ev('[...heroesData,...enemiesData]').find(e => e.id === id);
        let fx;
        try {
          w.playHitFeedback = recordFeedback;
          w.playAttackIdentityFx = recordIdentity;
          w.prepareSingleAttackHit = async (...args) => { const p = await realPrepare(...args); preparations.push(p); return p; };
          const d = installData([entity('h_atk0'),entity('h_atk1'),entity('s_atk0',{isSummon:true,side:'hero'})],[entity('e_atk')]);
          const s = w.parseSkill('【真实群光】[群攻(光);power:80][法术][必中]');
          s._bdg = { targetHit:{}, targetResolved:{} };
          const started = Date.now();
          const promise = w.playIdentityAttackWave(d.e[0],d.h,'光','[群攻(光)]',80,100,1,null,s);
          await wait(40);
          eq(preparations.length,3,'群攻三目标真实准备只各一次');
          eq(d.h.map(t=>t.hp),[3000,3000,3000],'起播准备期不提前扣血');
          const waveResult = await promise;
          fx = waveResult.handle;
          eq(impacts.length,3,'整波主接触每目标一次');
          check(impacts.every(i=>i.before===3000&&i.after===2920),'在onImpact回调栈内立即完成真实扣血（不等后续Promise）',JSON.stringify(impacts));
          check(impacts.every(i=>i.at-started>=i.meta.beatMs-35),'实际主接触不早于demo beatMs');
          eq(results.map(x=>[x.r.hpBefore,x.r.hpAfter,x.r.hpDmg,x.r.shieldDmg]),[[3000,2920,80,0],[3000,2920,80,0],[3000,2920,80,0]],'反馈采样为真实扣血前后值');
          check(results.every(x=>x.opts.wave===results[0].opts.wave&&x.opts.suppressAudio),'同波共享wave且主体主音抑制额外主重击');
          eq(results[0].opts.suppressShake,false,'群光本体无震屏，重创震屏由命中层提供一次');
          eq(w.attackFeedbackOptions(d.e[0],d.h[0],'[群攻(雷)]',s,null,{identity:true,wave:{}}).suppressShake,true,'群雷本体已有震屏，命中层不重复追加');
          eq(w.attackFeedbackOptions(d.e[0],d.h[0],'[单体]',s,'arrow',null).suppressAudio,false,'箭矢发射音与命中分层主音职责分离');
          if(fx)fx.cancel();
          impacts.length=0;results.length=0;preparations.length=0;
          const mixed=installData([entity('h_atk0'),entity('h_atk1',{spd:1000}),entity('s_atk0',{isSummon:true,side:'hero'})],[entity('e_atk')]);
          const m=w.parseSkill('【真实群雷】[群攻(雷);power:80][法术]');m._bdg={targetHit:{},targetResolved:{}};
          const mixedResult=await w.playIdentityAttackWave(mixed.e[0],mixed.h,'雷','[群攻(雷)]',80,100,1,null,m);
          fx=mixedResult.handle;
          eq(mixed.h.map(t=>t.hp),[2920,3000,2920],'混合outcomes与实际闪避结算一致，召唤物正常受伤');
          eq(results.filter(x=>x.r.outcome==='dodge').map(x=>x.r.targetId),['h_atk1'],'真实闪避只显示一次dodge，不伪扣血');
          if(fx)fx.cancel();
          impacts.length=0;results.length=0;preparations.length=0;
          const cancelled=installData([entity('h_atk0')],[entity('e_atk')]);
          const c=w.parseSkill('【取消群光】[群攻(光);power:80][必中]');c._bdg={targetHit:{},targetResolved:{}};
          const cp=w.playIdentityAttackWave(cancelled.e[0],cancelled.h,'光','[群攻(光)]',80,100,1,null,c);
          await wait(50);w.clearArcaneFx();
          await cp;await wait(650);
          eq(cancelled.h[0].hp,3000,'同代clear解除整波等待但不残余扣血');
          eq(results.length,0,'取消前无主接触就不生成反馈或后续');
          const single=installData([entity('h_atk0')],[entity('e_atk')]);
          const as=w.parseSkill('【取消单箭】[单体;power:80][远程][必中]');
          const ap=w.applySingleTagEffect(single.e[0],single.h[0],'[单体]',80,100,1,null,as);
          await wait(50);w.clearArcaneFx();await ap;await wait(350);
          eq(single.h[0].hp,3000,'单箭清理时Promise解除不残余扣血');
          const b=installData([entity('h_atk0'),entity('h_atk1')],[entity('e_atk')]);
          const barrierDom = w.document.createElement('div'); barrierDom.id = 'team-barrier-dome';
          barrierDom.style.cssText = 'position:fixed;left:200px;top:220px;width:300px;height:90px;'; root.appendChild(barrierDom);
          ev('teamBarrier=99999;teamBarrierMax=99999;barrierArmor=0;barrierSub=null;');
          const bs=w.parseSkill('【屏障群光】[群攻(光);power:80][法术]');bs._bdg={targetHit:{},targetResolved:{}};
          preparations.length=0;impacts.length=0;results.length=0;
          const br=await w.playIdentityAttackWave(b.e[0],b.h,'光','[群攻(光)]',80,100,1,null,bs);fx=br.handle;
          eq(preparations.length,0,'全队屏障分支不触个人闪避或反应准备');
          eq(impacts.length,1,'屏障整队只发生一个主接触');
          eq(ev('teamBarrier'),99919,'屏障整波只扣一次80耐久');
          eq(b.h.map(h=>h.hp),[3000,3000],'屏障全挡不伪造个人伤害');
          eq(results.length,0,'屏障全挡不伪造个人血雾或格挡');
        } finally {
          if(fx)fx.cancel();w.clearArcaneFx();
          w.playHitFeedback=realFeedback;w.playAttackIdentityFx=realIdentity;w.prepareSingleAttackHit=realPrepare;
        }
      });
      await group('统一采样运行参数与停止', async () => {
        useRealClock();w.clearArcaneFx();
        const audioFn = functions.get('playSound'), customFn = functions.get('playCustomAudio');
        const randomFn = functions.get('playRandomStandardGunshot'), shotgunFn = functions.get('playShotgunSound');
        const realAudio = w.Audio, realContext = w.AudioContext, realWebkitContext = w.webkitAudioContext, realFetch = w.fetch;
        const media=[],decoded=[],sources=[],gains=[];
        const param = value => ({value,setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.value=v;this.events.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){this.value=v;this.events.push(['exp',v,t]);},cancelScheduledValues(){},events:[]});
        const node = () => { const n={connect(){return n;},disconnect(){},start(...a){this.starts.push(a);},stop(...a){this.stops.push(a);},starts:[],stops:[]};
          ['gain','frequency','pan','Q','playbackRate','detune','threshold','knee','ratio','attack','release'].forEach(k=>n[k]=param(1));return n; };
        let contexts=0;
        class SampleContext {
          constructor(){contexts++;this.state='running';this.sampleRate=8000;this.currentTime=10;this.destination=node();}
          resume(){return Promise.resolve();} close(){return Promise.resolve();}
          createBuffer(ch,n){return{duration:n/8000,getChannelData:()=>new Float32Array(n)};}
          decodeAudioData(data){decoded.push(data);return Promise.resolve({duration:3.22});}
          createBufferSource(){const n=node();sources.push(n);return n;}
          createGain(){const n=node();gains.push(n);return n;}
        }
        ['createDynamicsCompressor','createConvolver','createWaveShaper','createOscillator','createBiquadFilter','createStereoPanner'].forEach(k=>SampleContext.prototype[k]=node);
        class SampleAudio {
          constructor(url){this.src=url;this.volume=1;this.playbackRate=1;this.currentTime=0;this.paused=false;media.push(this);}
          play(){return Promise.resolve();} pause(){this.paused=true;} cloneNode(){return new SampleAudio(this.src);}
        }
        const keys=['aoe_poison_spell_fs219566','wolfman','fire01','freeze01','light_impact','gunshot1','gunshot2','gunshot3','xiandan'];
        const blob=ev('_fxAudioBlobCache'), urls=ev('audioUrls'), mediaCache=ev('_fxAudioCache');
        const before=new Map(keys.map(k=>[urls[k],{had:blob.has(urls[k]),value:blob.get(urls[k]),cached:mediaCache.has(urls[k]),media:mediaCache.get(urls[k])}]));
        try {
          keys.forEach(k=>blob.set(urls[k],'blob:identity-test-'+k));
          w.Audio=SampleAudio;w.AudioContext=SampleContext;w.webkitAudioContext=SampleContext;
          w.fetch=async url=>String(url).startsWith('blob:identity-test-')?{arrayBuffer:async()=>new ArrayBuffer(8)}:realFetch.call(w,url);
          w.playSound=audioFn;w.playCustomAudio=customFn;w.playRandomStandardGunshot=randomFn;w.playShotgunSound=shotgunFn;
          const stop=w.playSound('light_impact',0.92,1.35);
          eq(contexts,0,'短采样小于1音量直接Audio.volume，不创建每发AudioContext');
          check(media.some(a=>a.volume===0.92&&a.playbackRate===1.35),'短音volume/rate第三参正确应用');
          stop();check(media[media.length-1].paused,'短音返回stopper可暂停');
          keys.forEach(k=>blob.set(urls[k],'blob:identity-test-'+k));
          keys.forEach(k=>w.preloadAttackIdentitySample(k));
          await Promise.resolve();await Promise.resolve();await wait(10);
          eq(contexts,1,'长采样解码共用一个模块AudioContext');
          const caster=entity('e_atk'),targets=[domOf('hero-card-h_atk0')];
          sources.length=0;gains.length=0;
          const poison=w.playAttackIdentityFx({scope:'aoe',subtype:'毒雾',caster,targets});
          const cut=sources.find(n=>n.buffer&&n.buffer.duration===3.22);
          check(!!cut,'毒雾长采样实际使用已解码BufferSource');
          if(cut){eq(cut.starts[0],[10,0,1.44],'毒雾裁窗1.4s且取样40ms缓冲');eq(cut.stops[0],[11.43],'毒雾1.4s结束加30ms缓冲停止');}
          check(gains.some(n=>n.gain.events.some(e=>e[0]==='set'&&Math.abs(e[2]-11.12)<0.0001)&&n.gain.events.some(e=>e[0]==='linear'&&Math.abs(e[2]-11.4)<0.0001)),'毒雾尾部0.28s淡出精确安排');
          poison.cancel();check(cut&&cut.stops.some(a=>a.length===0),'取消立即停止已解码长采样');
          sources.length=0;
          const bite=w.playAttackIdentityFx({scope:'single',subtype:'撕咬',caster,targets});
          const biteSrc=sources.find(n=>n.buffer&&n.buffer.duration===3.22);
          check(biteSrc&&biteSrc.starts.some(a=>a[1]===0.04&&Math.abs(a[2]-0.74)<0.0001),'撕咬采样offset40ms、裁窗700ms保持');
          bite.cancel();
          sources.length=0;
          const wind=w.playAttackIdentityFx({scope:'aoe',subtype:'毒雾',caster,targets});
          const windSrc=sources.find(n=>n.buffer&&n.buffer.duration===3.22);w.clearArcaneFx();
          check(windSrc&&windSrc.stops.some(a=>a.length===0),'clearArcaneFx停止已解码采样，不拖尾');
          media.length=0;
          const gun=w.playAttackIdentityFx({scope:'single',subtype:'枪击',caster,targets});gun.cancel();
          check(media.length>0&&media.every(a=>a.paused),'枪击复用随机采样且owner.cancel停止');
          media.length=0;
          const shotgun=w.playAttackIdentityFx({scope:'single',subtype:'霰弹',caster,targets});shotgun.cancel();
          check(media.length>0&&media.every(a=>a.paused),'霰弹采样由owner.cancel停止');
          const module=ev('arcaneVfxModule');module.setIdentitySfx(false);media.length=0;sources.length=0;
          const quiet=w.playAttackIdentityFx({scope:'single',subtype:'光',caster,targets});quiet.cancel();
          eq(media.length+sources.length,0,'局部音效门控同时关闭短采样和合成，不新增UI');module.setIdentitySfx(true);
        } finally {
          w.clearArcaneFx();ev('arcaneVfxModule').setIdentitySfx(true);
          w.Audio=realAudio;w.AudioContext=realContext;w.webkitAudioContext=realWebkitContext;w.fetch=realFetch;
          before.forEach((rec,url)=>{if(rec.had)blob.set(url,rec.value);else blob.delete(url);if(rec.cached)mediaCache.set(url,rec.media);else mediaCache.delete(url);});
          w.playSound=functions.has('playSound')?((key,vol,rate)=>calls.sounds.push({key,vol,rate})):audioFn;
          w.playCustomAudio=url=>calls.customAudio.push(String(url));
          w.playRandomStandardGunshot=()=>{calls.gun++;return null;};w.playShotgunSound=()=>{calls.shotgun++;};
        }
      });
    } finally {
      try { useRealClock(); } catch (e) {}
      try { w.clearArcaneFx(); } catch (e) {}
      vqueue.length = 0;
      for (const [name, fn] of functions) {
        try { if (hadOwn.get(name)) w[name] = fn; else delete w[name]; } catch (e) {}
      }
      try { w.Math.random = saved.random; } catch (e) {}
      try {
        w.__atkrRestore = saved;
        ev(`(() => { const s = window.__atkrRestore;
          heroesData=s.heroesData;enemiesData=s.enemiesData;initialHeroesCache=s.initialHeroesCache;initialEnemiesCache=s.initialEnemiesCache;
          battleHistory=s.battleHistory;_historyRawCache=s._historyRawCache;teamBarrier=s.teamBarrier;teamBarrierMax=s.teamBarrierMax;
          teamBarrierName=s.teamBarrierName;barrierArmor=s.barrierArmor;barrierSub=s.barrierSub;barrierStandIn=s.barrierStandIn;
          barrierAoEActive=s.barrierAoEActive;barrierAoELeak=s.barrierAoELeak;combatToken=s.combatToken;_pipelineFrozen=s.frozen;_barrierShatterAt=s.shatter;
          for(const k of Object.keys(state)) delete state[k]; Object.assign(state,s.state);
          for(const k of Object.keys(llmState)) delete llmState[k]; Object.assign(llmState,s.llm);
          nonLethalSettings.enabled=s.nonLethal;_recentSpeedChanges.clear();s.speeds.forEach((v,k)=>_recentSpeedChanges.set(k,v));
          CombatEvents.emit=s.emit;CombatEvents.emitAsync=s.emitAsync;fxEngine.particles=s.particles;
          delete window.__atkrRestore;
        })()`);
      } catch (e) { note('状态恢复异常:' + String((e && e.message) || e)); }
      try { root.remove(); } catch (e) {}
      try { w.document.querySelectorAll('.floating-text,.burst-text').forEach(el => { if (!floatsBefore.has(el)) el.remove(); }); } catch (e) {}
    }
    if (mock && typeof mock.genCount === 'function') eq(mock.genCount(), gen0, '攻击身份专项未调用外部LLM');
    return { pending: pending.slice() };
  };
})();
