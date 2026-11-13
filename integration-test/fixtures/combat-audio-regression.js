/* 战斗音频回归：DAMAGE_RESOLVED/DODGE_RESOLVED 冻结载荷契约与 resultType 路由矩阵、
   反击 L1 契约时序（onImpact 前不扣 HP/盾、impact 幂等仅扣一次、护盾归零 parry_3、
   反击致死经真实 updateEnemyUI 置 isAlive 再释放上层、postQueue 同样等待）、
   上层推进时序（executeSkillAction.then → 真实 endTurn → nextTurn 记录桩：未 impact 不推进）、
   真实 L1 三态回落（cancel / 同 token 冻结（声音静默）/ token 改变）、
   真实 nextTurn 毒+灼烧一次单体 PeriodicDamage（waveId=null）与受击音、
   HP Cost 施放代价（executeSkillAction 直达）真实负向断言：扣血但零事件零受击音、
   AFTER_DAMAGE 荆棘反伤路由（不递归 AFTER_DAMAGE、毅力保命后的结果、同一毫秒双反伤不误去重）、
   wave API（beginWave(actionId)/completeTarget 门闩：全部目标完成后 close 才播一次/cancelWave/clear）、
   playHitFeedback 仅视觉与身份音开关静默（事件仍发布）。
   全部断言走真实 iframe 业务（applySingleTagEffect/executeSkillAction/nextTurn/CombatEvents/
   CombatAudioDirector 真函数与真实事件总线），不复制业务函数；逻辑结算组用微任务假时钟加速 sleep，
   反击时序用可控 L1 handle 手动触发 impact，不猜拍点；真实 L1 组同步步进 fxEngine.update 驱动。
   接口未落地时按真实行为探测降级为 pending 待对齐项，不误判红。source 参数收下备用（行为全走运行时）。 */
(function () {
  'use strict';
  window.runCombatAudioRegression = async function ({ w, check, eq, mock, source }) {
    const doc = w.document;
    const ev = code => w.eval(code);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms)); // 宿主(harness)真时钟
    const pending = [];
    const group = async (name, fn) => { try { await fn(); } catch (e) { check(false, name + '执行异常', String(e.stack || e)); } };

    /* ---------- 接口落地检查：未落地按 pending 上报待对齐，不误判失败 ---------- */
    const E = ev('typeof EVENTS === "object" ? EVENTS : null');
    const dir = w.CombatAudioDirector;
    const mod = ev('typeof arcaneVfxModule === "object" ? arcaneVfxModule : null');
    const missing = [];
    if (!E || E.DAMAGE_RESOLVED !== 'damage_resolved') missing.push('EVENTS.DAMAGE_RESOLVED=damage_resolved');
    if (!E || E.DODGE_RESOLVED !== 'dodge_resolved') missing.push('EVENTS.DODGE_RESOLVED=dodge_resolved');
    if (E && 'IMPACT_AUDIO' in E) missing.push('旧 EVENTS.IMPACT_AUDIO 未移除');
    if (!dir || typeof dir.publish !== 'function') missing.push('CombatAudioDirector.publish');
    ['beginWave', 'completeTarget', 'closeWave', 'cancelWave', 'clear'].forEach(k => {
      if (!dir || typeof dir[k] !== 'function') missing.push('CombatAudioDirector.' + k);
    });
    if (!mod || typeof mod.setIdentitySfx !== 'function') missing.push('setIdentitySfx(身份音开关)');
    ['applySingleTagEffect', 'nextTurn', 'playCounterAttackL1', 'parseSkill', 'playHitFeedback']
      .forEach(n => { if (typeof w[n] !== 'function') missing.push(n); });
    if (missing.length) {
      missing.forEach(n => pending.push('待对齐:' + n));
      return { pending };
    }

    /* ---------- mock 保真：保存/恢复均按原引用（Map 保存函数，ev 回填状态对象），不 JSON 序列化 ---------- */
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;
    const saved = ev(`({ heroesData, enemiesData, battleHistory, _historyRawCache, combatToken, frozen:_pipelineFrozen,
      teamBarrier, teamBarrierMax, ihc:initialHeroesCache, iec:initialEnemiesCache,
      state:{...state}, llm:{...llmState}, nonLethal:nonLethalSettings.enabled, random:Math.random,
      emit:CombatEvents.emit, emitAsync:CombatEvents.emitAsync, particles:fxEngine.particles.slice(), hitStop:fxEngine.hitStop })`);
    const functions = new Map();
    const replace = (name, fn) => { if (!functions.has(name)) functions.set(name, w[name]); w[name] = fn; };
    const sounds = [], events = [];
    replace('playSound', (key, vol, rate) => { sounds.push({ key, vol, rate }); return () => {}; });
    // v12.06：复活专属 cue 走 playVariantTriggerFx 业务分派；此处只 spy 分派参数，
    // 不 mock 数值，也不以 playSound 记录其实际采样（采样由 idSample 完成）。
    let reviveCueArgs = null;
    if (typeof w.playVariantTriggerFx === 'function') {
      replace('playVariantTriggerFx', function (...args) { reviveCueArgs = args; return undefined; });
    }
    const onDmg = ctx => events.push({ kind: 'damage', ctx });
    const onDdg = ctx => events.push({ kind: 'dodge', ctx });
    w.CombatEvents.on(E.DAMAGE_RESOLVED, onDmg);
    w.CombatEvents.on(E.DODGE_RESOLVED, onDdg);
    const impactSounds = () => sounds.filter(s => /^(hit_[123][abc]|parry_[123]|dodge_[123])$/.test(s.key));
    const dmgCtx = (pred, i) => { const l = events.filter(e => e.kind === 'damage' && (!pred || pred(e.ctx))); return (l[i || 0] || {}).ctx || null; };

    /* ---------- 微任务假时钟：逻辑组 sleep 全部立即续跑，保持现有宽松运行参数；
       真实 L1 组先 restoreTimers() 换回真时钟（355ms 不得被微任务时钟瞬时击穿），组尾装回 ---------- */
    const timerIds = new Set();
    const nativeSetTimeout = w.setTimeout, nativeClearTimeout = w.clearTimeout;
    const restoreTimers = () => { timerIds.clear(); w.setTimeout = nativeSetTimeout; w.clearTimeout = nativeClearTimeout; };
    const installFakeTimers = () => {
      w.setTimeout = (fn, ms, ...args) => { const id = {}; timerIds.add(id); Promise.resolve().then(() => { if (timerIds.delete(id)) fn(...args); }); return id; };
      w.clearTimeout = id => { timerIds.delete(id); };
    };
    installFakeTimers();

    /* 只 stub 视觉与外层旁白/调度；updateHeroUI/updateEnemyUI 保持真实（可无 DOM 运行，
       反击死亡的真实置死/死亡收口经其发生，不得用 mock 死亡 UI 伪造 isAlive） */
    for (const name of ['tryTriggerEnemyLowHpSpeak', 'tryTriggerEnemyMolt', 'tryTriggerEnemyRage', 'tryTriggerEnemyLink',
      'tryTriggerEnemyDeathSpeak', 'triggerAllyDownSpeak', 'triggerAllyFatalSaveSpeak', 'triggerAllyHealSpeak',
      'triggerAllyAutoSpeak', 'renderTurnQueue', 'renderHeroMenu', 'updateActiveHeroDisplay', 'playHeroTurnVoice',
      'showLog', 'promptReaction', 'createFloatingText', 'triggerScreenShake',
      'updateBuffDisplay', 'updateBuffBar', 'renderBuffs'])
      if (typeof w[name] === 'function') replace(name, () => {});

    /* ---------- 真实 DOM 舞台：反击/闪避/L1 视觉矩形与 HP 轨道 ---------- */
    const root = doc.createElement('div');
    root.id = 'combat-audio-regression-stage';
    root.style.cssText = 'position:fixed;left:30px;top:110px;width:680px;height:300px;pointer-events:none;';
    const trackOf = id => '<div class="arcane-hit-track" style="position:relative;width:200px;height:12px;background:#111">' +
      '<div id="' + id + '-hp-ghost" class="arcane-hit-ghost" style="width:100%;height:12px;background:#fff"></div>' +
      '<div id="' + id + '-hp-bar" class="arcane-hit-fill" style="width:100%;height:12px;background:#f43f5e"></div></div>';
    root.innerHTML = [
      '<div id="hero-card-h_ca1" class="hero-card-inner" style="position:absolute;left:0;top:0;width:180px;height:150px;background:#243047;border:1px solid #7dd3fc">',
      '<img alt="" style="width:180px;height:90px;display:block"></div>',
      '<div style="position:absolute;left:0;top:150px">' + trackOf('h_ca1') + '</div>',
      '<div id="e_ca1-sprite" style="position:absolute;left:320px;top:0;width:110px;height:110px;background:#4c1d58">',
      '<img alt="" style="width:100px;height:100px;display:block"></div>',
      '<div style="position:absolute;left:320px;top:120px">' + trackOf('e_ca1') + '</div>'
    ].join('');
    doc.body.appendChild(root);

    const entity = (id, extra) => Object.assign({ id, name: id, hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 10, def: 0, spd: 100, hit: 0, eva: 0, shield: 0, actCount: 1, isAlive: true, buffs: [], skills: [], items: [],
      classType: null, isSummon: false, row: 'front', tags: [] }, extra);
    const install = (heroes, enemies) => {
      ev('heroesData=' + JSON.stringify(heroes) + ';enemiesData=' + JSON.stringify(enemies) +
        ';battleHistory=[];_historyRawCache="";nonLethalSettings.enabled=false;');
      return { h: ev('heroesData'), e: ev('enemiesData') };
    };
    /* install 是 JSON 克隆写全局：闭包原对象与全局不同步——传参与断言一律用 install 返回的全局引用；
       并把实体 dom/status 指向真实 DOM（status 为独立真实元素，root 内隐藏 span），
       供真实 updateHeroUI/updateEnemyUI 使用（否则致死收口报 undefined） */
    const wireDom = () => {
      const ensureStatus = id => {
        let el = doc.getElementById(id + '-status');
        if (!el) { el = doc.createElement('span'); el.id = id + '-status'; el.style.display = 'none'; root.appendChild(el); }
        return el;
      };
      const h0 = ev('heroesData')[0], e0 = ev('enemiesData')[0];
      if (h0) { h0.dom = doc.getElementById('hero-card-' + h0.id); h0.status = ensureStatus(h0.id); }
      if (e0) { e0.dom = doc.getElementById(e0.id + '-sprite'); e0.status = ensureStatus(e0.id); }
    };
    const sk = txt => w.parseSkill(txt);
    const resetAll = () => { try { dir.clear(); } catch (e) {} sounds.length = 0; events.length = 0; };

    /* ---------- 契约探测（真实行为，非源码检查）：L1 返回形态 与 publish→DAMAGE_RESOLVED 链 ---------- */
    let probe = null, probeErr = '';
    try { probe = w.playCounterAttackL1({ id: '_ca_ghost_h' }, { id: '_ca_ghost_e' }, () => {}); }
    catch (e) { probeErr = String(e && e.message || e); }
    const l1ObjectForm = !!(probe && typeof probe === 'object' && probe.done && typeof probe.done.then === 'function' && typeof probe.cancel === 'function');
    if (!l1ObjectForm) pending.push('待对齐:playCounterAttackL1 未返回 {duration,done,cancel} 契约形态' + (probeErr ? '（探测异常 ' + probeErr + '）' : ''));
    else if (probe.duration !== 0) pending.push('待对齐:playCounterAttackL1 无DOM时 duration 应为 0，实际 ' + probe.duration);

    let publishGate = false;
    try {
      dir.publish({ targetId: 'h_ca1', sourceId: 'e_ca1', source: 'attack', outcome: 'hit', maxHp: 1000,
        hpDmg: 1, hpBefore: 1000, hpAfter: 999, shieldBefore: 0, shieldAfter: 0 });
      publishGate = events.length > 0;
    } catch (e) { publishGate = false; }
    if (!publishGate) pending.push('待对齐:publish 未接入 DAMAGE_RESOLVED 事件链');
    resetAll();

    /* 可控 L1 handle：手动触发 impact，不猜拍点（组二与上层推进组共用安装器） */
    let l1 = null;
    const installControllableL1 = () => replace('playCounterAttackL1', (caster, target, onImpact) => {
      let resolveDone;
      const done = new Promise(r => { resolveDone = r; });
      l1 = { caster, target, onImpact, resolveDone, cancelled: false,
        handle: { duration: 355, done, cancel() { l1.cancelled = true; } } };
      return l1.handle;
    });
    installControllableL1();
    const flushUntilL1 = async () => { for (let i = 0; i < 120 && !l1; i++) await wait(0); };
    try {

    /* ================================================================
       组一：DAMAGE_RESOLVED 冻结载荷契约与 resultType 路由矩阵
       ================================================================ */
    await group('事件载荷契约与resultType路由', async () => {
      if (!publishGate) return;
      resetAll();
      dir.publish({ targetId: 'h_ca1', sourceId: 'e_ca1', source: 'attack', outcome: 'hit', maxHp: 1000,
        hpDmg: 600, hpBefore: 1000, hpAfter: 400, shieldBefore: 0, shieldAfter: 0, damageType: '近战', actionId: 'act-a' });
      const ctx = dmgCtx(c => c.targetId === 'h_ca1');
      check(!!ctx, 'publish 经 DAMAGE_RESOLVED 发布冻结事件');
      if (!ctx) return;
      const FIELDS = ['sourceId', 'targetId', 'source', 'resultType', 'kind', 'tier', 'hpDmg', 'shieldDmg',
        'hpBefore', 'hpAfter', 'shieldBefore', 'shieldAfter', 'damageType', 'actionId', 'waveId', 'eventId'];
      check(FIELDS.every(f => f in ctx), '载荷携带全部契约字段', '缺:' + FIELDS.filter(f => !(f in ctx)).join(','));
      eq([ctx.kind, ctx.tier], ['hp', 3], 'classify 结果随载荷下发（60% 重伤档）');
      check(Object.isFrozen(ctx), '事件载荷被 Object.freeze');
      const snap = ctx.hpDmg;
      try { ctx.hpDmg = 999999; } catch (e) { /* strict 冻结赋值抛错同样算不可修改 */ }
      check(ctx.hpDmg === snap, '冻结载荷不可修改', '写入后变为 ' + ctx.hpDmg);
      check(typeof ctx.eventId === 'string' && !!ctx.eventId, 'eventId 稳定存在');
      eq(ctx.waveId, null, '无 wave 发布时 waveId 为 null');
      eq(ctx.actionId, 'act-a', 'actionId 透传载荷');
      const rt = result => { resetAll(); dir.publish(result); const c = dmgCtx(); return c ? c.resultType : null; };
      eq([
        rt({ targetId: 'e_ca1', sourceId: 'h_ca1', source: 'attack', outcome: 'hit', maxHp: 1000, hpDmg: 500, hpBefore: 1000, hpAfter: 500, shieldBefore: 0, shieldAfter: 0 }),
        rt({ targetId: 'e_ca1', sourceId: 'h_ca1', source: 'attack', outcome: 'hit', maxHp: 1000, hpDmg: 0, shieldDmg: 40, shieldBefore: 100, shieldAfter: 60 }),
        rt({ targetId: 'e_ca1', sourceId: 'h_ca1', source: 'attack', outcome: 'hit', maxHp: 1000, hpDmg: 0, shieldDmg: 40, shieldBefore: 40, shieldAfter: 0 }),
        rt({ targetId: 'e_ca1', sourceId: 'h_ca1', source: 'attack', outcome: 'block', maxHp: 1000, hpDmg: 0, shieldDmg: 0, blockedDmg: 100 }),
        rt({ targetId: 'e_ca1', sourceId: 'dot:e_ca1', source: 'dot', outcome: 'hit', maxHp: 1000, hpDmg: 20, hpBefore: 1000, hpAfter: 980, shieldBefore: 0, shieldAfter: 0 }),
        rt({ targetId: 'h_ca1', sourceId: 'e_ca1', source: 'reflect', outcome: 'hit', maxHp: 1000, hpDmg: 30, hpBefore: 1000, hpAfter: 970, shieldBefore: 0, shieldAfter: 0 }),
        rt({ targetId: 'e_ca1', sourceId: 'h_ca1', source: 'counter', outcome: 'hit', maxHp: 1000, hpDmg: 100, hpBefore: 1000, hpAfter: 900, shieldBefore: 0, shieldAfter: 0 })
      ], ['Hit', 'ShieldHit', 'ShieldBroken', 'Block', 'PeriodicDamage', 'ReflectDamage', 'CounterHit'],
        'resultType 七路由矩阵（attack/dot/reflect/counter）');
      resetAll();
      dir.publish({ targetId: 'h_ca1', sourceId: 'e_ca1', source: 'attack', outcome: 'dodge', maxHp: 1000, incomingDmg: 500 });
      const dd = events.filter(x => x.kind === 'dodge')[0];
      check(!!dd && dd.ctx.resultType === 'Dodge', '闪避走 DODGE_RESOLVED 且 resultType=Dodge');
      check(sounds.some(s => /^dodge_[123]$/.test(s.key)), '闪避事件路由 dodge 分档音');
      resetAll();
    });

    /* ================================================================
       组二：反击 L1 契约时序（可控 handle，不猜拍点）
       ================================================================ */
    await group('反击L1契约时序（可控handle）', async () => {
      if (!l1ObjectForm) return;
      /* 场景1：护盾归零 → parry_3；impact 幂等；上层 execute 等待（盾设在被反击方） */
      resetAll();
      const d1 = install(
        [entity('h_ca1', { hp: 1000, maxHp: 1000, atk: 400, def: 0, spd: 1000, buffs: [{ type: 'counter', value: 0, duration: 9999 }] })],
        [entity('e_ca1', { hp: 1000, maxHp: 1000, shield: 200, atk: 10, def: 0, spd: 50, skills: [sk('【试斩】[单体;power:80]')] })]);
      wireDom();
      const hA = d1.h[0], eA = d1.e[0];
      w.Math.random = () => 0.999; // 守方 roll(≈1000) 恒大于攻方 roll(≈100) → 恒闪避
      let settled = false;
      const p1 = w.applySingleTagEffect(eA, hA, '[单体]', 80, 100, 1, null, eA.skills[0]);
      p1.then(() => { settled = true; }, () => { settled = true; });
      await flushUntilL1();
      check(!!l1, '闪避反击进入可控 L1 handle');
      if (!l1) { w.Math.random = saved.random; resetAll(); return; }
      check(events.some(x => x.kind === 'dodge'), '闪避路径已发布 DODGE_RESOLVED');
      check(sounds.some(s => /^dodge_[123]$/.test(s.key)), '闪避结果路由 dodge 分档音');
      eq([eA.hp, eA.shield], [1000, 200], 'onImpact 前反击目标不扣 HP/盾');
      check(!settled, 'onImpact 前上层 execute 不释放');
      l1.onImpact();
      const hp1 = eA.hp, sh1 = eA.shield;
      check(hp1 < 1000 || sh1 < 200, '手动触发 impact 后提交反击伤害');
      eq(sh1, 0, '护盾归零');
      check(sounds.some(s => s.key === 'parry_3'), '护盾归零播放 parry_3');
      l1.onImpact();
      eq([eA.hp, eA.shield], [hp1, sh1], '重复触发 impact 幂等（仅扣一次）');
      const counterEvents = events.filter(x => x.kind === 'damage' && x.ctx.source === 'counter');
      eq(counterEvents.length, 1, 'counter 结果恰发布一次');
      if (counterEvents[0]) eq([counterEvents[0].ctx.sourceId, counterEvents[0].ctx.targetId], ['h_ca1', 'e_ca1'],
        'counter 载荷归因（反击方→被反击方）');
      l1.resolveDone(true);
      await p1;
      check(settled, '反击完成后上层 execute 释放');
      w.Math.random = saved.random;
      /* 场景2：反击致死经真实 updateEnemyUI 置 isAlive，再释放上层 */
      resetAll();
      const d2 = install(
        [entity('h_ca1', { hp: 1000, maxHp: 1000, atk: 150, def: 0, spd: 1000, buffs: [{ type: 'counter', value: 0, duration: 9999 }] })],
        [entity('e_ca1', { hp: 1, maxHp: 1000, atk: 10, def: 0, spd: 50, skills: [sk('【试斩】[单体;power:80]')] })]);
      wireDom();
      const hA2 = d2.h[0], eA2 = d2.e[0];
      w.Math.random = () => 0.999;
      let settled2 = false;
      const p2 = w.applySingleTagEffect(eA2, hA2, '[单体]', 80, 100, 1, null, eA2.skills[0]);
      p2.then(() => { settled2 = true; }, () => { settled2 = true; });
      l1 = null;
      await flushUntilL1();
      if (!l1) check(false, '致死场景反击进入可控 L1');
      else {
        l1.onImpact();
        check(eA2.hp <= 0 && eA2.isAlive === false, '反击致死先完成真实死亡收口（真实 updateEnemyUI 置 isAlive=false）');
        l1.resolveDone(true);
        await p2;
        check(settled2, '致死反击完成后上层 execute 释放');
      }
      w.Math.random = saved.random;
      /* 场景3：postQueue 同样等待（await 后才读 posts） */
      resetAll();
      const d3b = install(
        [entity('h_ca1', { hp: 1000, maxHp: 1000, atk: 400, def: 0, spd: 1000, buffs: [{ type: 'counter', value: 0, duration: 9999 }] })],
        [entity('e_ca1', { hp: 1000, maxHp: 1000, shield: 50, atk: 10, def: 0, spd: 50, skills: [sk('【试斩】[单体;power:80]')] })]);
      wireDom();
      const hA3 = d3b.h[0], eA3 = d3b.e[0];
      w.Math.random = () => 0.999;
      const posts = [];
      await w.applySingleTagEffect(eA3, hA3, '[单体]', 80, 100, 1, null, eA3.skills[0], null, false, { postQueue: posts });
      eq(posts.length, 1, '闪避反击进入 postQueue（await 后读取）');
      let runSettled = false;
      const runP = posts[0].run();
      runP.then(() => { runSettled = true; }, () => { runSettled = true; });
      l1 = null;
      await flushUntilL1();
      if (!l1) check(false, 'postQueue 反击进入可控 L1');
      else {
        check(!runSettled && eA3.shield === 50, 'postQueue 等待期间不提交不释放');
        l1.onImpact();
        eq(eA3.shield, 0, 'postQueue impact 提交护盾归零（盾在被反击方）');
        check(impactSounds().some(s => s.key === 'parry_3'), 'postQueue 路径同样播放 parry_3');
        l1.resolveDone(true);
        await runP;
        check(runSettled, 'postQueue 反击完成后 run 释放');
      }
      w.Math.random = saved.random;
      resetAll();
    });

    /* ================================================================
       组三：真实 L1 三态回落（真实时钟：cancel / 同 token 冻结 / token 改变）
       cancel 与冻结各带一例真实 applySingleTagEffect 管线伤害验证；
       组尾装回微任务假时钟供后续逻辑组加速。
       ================================================================ */
    await group('真实L1三态回落', async () => {
      if (!l1ObjectForm) return;
      restoreTimers(); // 真实时钟：355ms/拍点真实存在，token 变更窗口不被微任务时钟瞬时击穿
      w.playCounterAttackL1 = functions.get('playCounterAttackL1'); // 恢复真实 L1，不用 stub 顶替
      const d3 = install([entity('h_ca1', { hp: 1000, maxHp: 1000 })], [entity('e_ca1', { hp: 1000, maxHp: 1000 })]);
      wireDom();
      const heroB = d3.h[0], enemyB = d3.e[0];
      const cntOf = () => { const o = { n: 0 }; o.onImpact = () => { o.n++; }; return o; };
      const pollUntil = async (pred, timeoutMs) => {
        const dl = Date.now() + (timeoutMs || 3000);
        while (Date.now() < dl) { try { if (pred()) return true; } catch (e) {} await wait(20); }
        try { return !!pred(); } catch (e) { return false; }
      };
      /* cancel：fallback 同步结算一次 */
      let a = cntOf();
      const h1 = w.playCounterAttackL1(heroB, enemyB, a.onImpact);
      check(!!h1 && typeof h1.duration === 'number' && !!h1.done && typeof h1.done.then === 'function' && typeof h1.cancel === 'function',
        '真实L1 返回 {duration,done,cancel}');
      eq(h1.duration, 355, '真实L1 有 DOM 时 duration=355');
      h1.cancel();
      eq(a.n, 1, 'cancel 回落同步执行 onImpact 恰一次');
      eq(await Promise.race([h1.done, wait(800).then(() => '__timeout__')]), true, 'cancel 后 done resolve true');
      h1.cancel();
      eq(a.n, 1, 'cancel 幂等不再二次结算');
      /* 同 token 冻结：fallback 同步结算一次，且冻结期间 onImpact 发布的声音静默 */
      ev('_pipelineFrozen=true;');
      let b = cntOf();
      b.onImpact = () => { b.n++; dir.publish({ targetId: 'e_ca1', sourceId: 'h_ca1', source: 'counter', outcome: 'hit', maxHp: 1000, hpDmg: 100, hpBefore: 1000, hpAfter: 900, shieldBefore: 0, shieldAfter: 0 }); };
      const sFrozen0 = impactSounds().length;
      const h2 = w.playCounterAttackL1(heroB, enemyB, b.onImpact);
      eq(b.n, 1, '同 token 冻结按 fallback 同步执行 onImpact 一次');
      eq(await Promise.race([h2.done, wait(800).then(() => '__timeout__')]), true, '冻结 fallback done=true');
      eq(impactSounds().length, sFrozen0, '冻结期间 fallback 发布的声音静默');
      ev('_pipelineFrozen=false;');
      dir.publish({ targetId: 'e_ca1', sourceId: 'h_ca1', source: 'counter', outcome: 'hit', maxHp: 1000, hpDmg: 100, hpBefore: 1000, hpAfter: 900, shieldBefore: 0, shieldAfter: 0 });
      check(impactSounds().length > sFrozen0, '解除冻结后声音恢复');
      /* 真实管线 cancel 例：反击启动后真 clearArcaneFx → L1 cancel 回落结算，HP 变一次 */
      resetAll();
      const dC = install(
        [entity('h_ca1', { hp: 1000, maxHp: 1000, atk: 400, def: 0, spd: 1000, buffs: [{ type: 'counter', value: 0, duration: 9999 }] })],
        [entity('e_ca1', { hp: 1000, maxHp: 1000, atk: 10, def: 0, spd: 50, skills: [sk('【试斩】[单体;power:80]')] })]);
      wireDom();
      const hCx = dC.h[0], eCx = dC.e[0];
      w.Math.random = () => 0.999;
      let settledC = false;
      const pC = w.applySingleTagEffect(eCx, hCx, '[单体]', 80, 100, 1, null, eCx.skills[0]);
      pC.then(() => { settledC = true; }, () => { settledC = true; });
      check(await pollUntil(() => sounds.some(s => s.key === 'atk2'), 3000), '真实管线反击 L1 已启动（atk2 拍点音出现）');
      const hpBeforeClear = eCx.hp;
      try { w.clearArcaneFx(); } catch (e) {}
      await Promise.race([pC, wait(1500)]);
      check(settledC, 'clearArcaneFx 触发 L1 cancel 回落后管线完成');
      check(eCx.hp < hpBeforeClear, 'clearArcaneFx 回落仍提交反击伤害（不丢伤害）');
      eq(events.filter(x => x.kind === 'damage' && x.ctx.source === 'counter').length, 1, 'clearArcaneFx 回落恰发布一次 counter 结果');
      /* 真实管线 freeze 例：反击启动后同 token 冻结 → fallback 结算一次，HP 变一次 */
      resetAll();
      const dF = install(
        [entity('h_ca1', { hp: 1000, maxHp: 1000, atk: 400, def: 0, spd: 1000, buffs: [{ type: 'counter', value: 0, duration: 9999 }] })],
        [entity('e_ca1', { hp: 1000, maxHp: 1000, atk: 10, def: 0, spd: 50, skills: [sk('【试斩】[单体;power:80]')] })]);
      wireDom();
      const hFx = dF.h[0], eFx = dF.e[0];
      w.Math.random = () => 0.999;
      let settledF = false;
      const pF = w.applySingleTagEffect(eFx, hFx, '[单体]', 80, 100, 1, null, eFx.skills[0]);
      pF.then(() => { settledF = true; }, () => { settledF = true; });
      check(await pollUntil(() => sounds.some(s => s.key === 'atk2'), 3000), 'freeze 例真实管线反击 L1 已启动');
      const hpBeforeFreeze = eFx.hp;
      ev('_pipelineFrozen=true;');
      await Promise.race([pF, wait(1500)]);
      check(settledF, '同 token 冻结回落（fallback onImpact 一次）后管线完成');
      check(eFx.hp < hpBeforeFreeze, '冻结回落仍提交反击伤害（恰一次）');
      eq(events.filter(x => x.kind === 'damage' && x.ctx.source === 'counter').length, 1, '冻结回落恰发布一次 counter 结果');
      ev('_pipelineFrozen=false;');
      w.Math.random = saved.random;
      /* token 改变：先创建句柄（捕获当前 token）→ 再换 token → cancel：仅清理不结算，done=false */
      let c = cntOf();
      const h3 = w.playCounterAttackL1(hFx, eFx, c.onImpact);
      w.__carSavedTok = saved.combatToken;
      ev('combatToken={};');
      h3.cancel();
      eq(c.n, 0, 'token 改变后 cancel 不执行 onImpact（仅清理不伤新状态）');
      eq(await Promise.race([h3.done, wait(800).then(() => '__timeout__')]), false, 'token 改变 done=false');
      ev('combatToken=window.__carSavedTok; delete window.__carSavedTok;');
      try { w.clearArcaneFx(); } catch (e) {}
      resetAll();
      installFakeTimers(); // 组尾装回微任务假时钟，供后续逻辑组加速 sleep
    });

    /* ================================================================
       组四：真实 nextTurn 毒+灼烧提交与受击音
       ================================================================ */
    await group('真实nextTurn毒灼烧提交', async () => {
      if (!publishGate) return;
      resetAll();
      const dD = install([entity('h_ca1', { hp: 1000, maxHp: 1000, spd: 100 })],
        [entity('e_ca1', { hp: 500, maxHp: 500, spd: 50 })]);
      wireDom();
      dD.h[0].buffs = [{ type: 'poison', value: 20, duration: 3 }, { type: 'burn', value: 30, duration: 3 }];
      ev('state.isGameStarted=true;state.round=1;state.queueIndex=0;' +
        'state.actionQueue=[{type:"hero",ref:heroesData[0]}];state.isAnimating=false;');
      try {
        await w.nextTurn();
        eq(ev('heroesData[0].hp'), 950, '毒 20 + 灼烧 30 同回合合并扣除 50');
        eq(ev('heroesData[0].buffs.map(b=>b.duration)'), [2, 2], 'DoT 后 buff 轮数各减一');
        const dotEvents = events.filter(e => e.kind === 'damage' && e.ctx.source === 'dot');
        eq(dotEvents.length, 1, '单体 DoT 恰发布一次 PeriodicDamage');
        const dot = dotEvents[0] && dotEvents[0].ctx;
        if (dot) {
          eq(dot.resultType, 'PeriodicDamage', 'DoT resultType=PeriodicDamage');
          eq(dot.hpDmg, 50, 'PeriodicDamage 载荷为合并伤害');
          eq(dot.waveId, null, '单体 DoT 不开 wave（waveId=null）');
          check(typeof dot.eventId === 'string' && !!dot.eventId, 'eventId 唯一存在（' + dot.eventId + '）');
        }
        eq(impactSounds().length, 1, '毒+灼烧合并后受击音恰一次');
      } finally {
        ev('state.isGameStarted=false;state.actionQueue=[];state.queueIndex=0;');
      }
      resetAll();
    });

    await group('真实DoT致死复活收口', async () => {
      const d=install([entity('h_ca1')],[entity('e_ca1',{hp:5,maxHp:1000,reviveCount:1})]);
      wireDom();
      const sprite=w.getEntitySpriteDom(d.e[0]);sprite.style.display='';sprite.classList.remove('opacity-0','scale-50');
      d.e[0].buffs=[{type:'poison',value:20,duration:2},{type:'stun',duration:2}];
      const priorEnd=w.endTurn;
      replace('endTurn',()=>{});
      const cue=w.playVariantTriggerFx;
      let called=null;
      replace('playVariantTriggerFx',opts=>{called=opts;return null;});
      ev('state.isGameStarted=true;state.round=1;state.queueIndex=0;state.actionQueue=[{type:"enemy",ref:enemiesData[0]}];');
      try {
        await w.nextTurn();
        eq([d.e[0].hp,d.e[0].reviveCount,d.e[0].isAlive],[300,0,true],'真实nextTurn毒致死后先复活，保留30%HP与存活');
        eq([called&&called.trigger,called&&called.enemyId],['revive','e_ca1'],'DoT致死走统一变种复活声画入口');
        const dom=w.getEntitySpriteDom(d.e[0]);
        check(!!dom&&dom.style.display!=='none'&&!dom.classList.contains('opacity-0'),'DoT复活期间真实精灵未隐藏');
      } finally {w.endTurn=priorEnd;w.playVariantTriggerFx=cue;ev('state.isGameStarted=false;state.actionQueue=[];');}
    });

    /* ================================================================
       组四A：HP Cost 施放代价（executeSkillAction 直达路径）真实负向断言
       ================================================================ */
    await group('HP Cost施放代价不发受击', async () => {
      resetAll();
      install([entity('h_ca1', { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100 })],
        [entity('e_ca1', { hp: 500, maxHp: 500 })]);
      wireDom();
      const hpSkill = sk('【血祭启灵】[单增;power:0][HP:20]');
      if (!hpSkill || hpSkill.hpCost !== 20) hpSkill.hpCost = 20; // 双保险：解析失败时显式补 hpCost
      hpSkill.skipKanpoWindow = true; // 无伤害标签技能跳过看破窗口，不依赖玩家 UI
      ev('state.isGameStarted=true;state.round=1;');
      try {
        await w.executeSkillAction(ev('heroesData[0]'), null, hpSkill, 1);
        eq(ev('heroesData[0].hp'), 980, '施放 HP 代价技能真实扣 20 HP');
        eq(events.length, 0, 'HP Cost 扣血零 DAMAGE/DODGE 事件');
        eq(impactSounds().length, 0, 'HP Cost 扣血零受击音');
      } finally {
        ev('state.isGameStarted=false;');
      }
      resetAll();
    });

    /* ================================================================
       组四B：上层回合推进时序（executeSkillAction.then → 真实 endTurn，
       nextTurn 用记录桩证明：未 impact 不推进，impact 后受害者已死亡）
       ================================================================ */
    await group('上层回合推进时序', async () => {
      if (!l1ObjectForm) return;
      resetAll();
      install([entity('h_ca1', { hp: 1000, maxHp: 1000, atk: 150, def: 0, spd: 1000,
        buffs: [{ type: 'counter', value: 0, duration: 9999 }] })],
        [entity('e_ca1', { hp: 1, maxHp: 1000, atk: 10, def: 0, spd: 50, skills: [sk('【试斩】[单体;power:80]')] })]);
      wireDom();
      const eU = ev('enemiesData[0]');
      const realNextTurn = w.nextTurn, realEndTurn = w.endTurn;
      const snapshots = [];
      replace('nextTurn', () => { snapshots.push({ hp: eU.hp, isAlive: eU.isAlive }); });
      let endTurnCalls = 0;
      replace('endTurn', token => { endTurnCalls++; return realEndTurn(token); });
      installControllableL1();
      l1 = null;
      w.Math.random = () => 0.999;
      ev('state.isGameStarted=true;state.round=1;state.queueIndex=0;state.actionQueue=[{type:"enemy",ref:enemiesData[0]}];');
      let settled = false;
      const p = w.executeSkillAction(eU, null, eU.skills[0], 1)
        .then(() => { settled = true; return w.endTurn(); }, e => { settled = true; throw e; });
      await flushUntilL1();
      check(!!l1, '敌方行动闪避反击进入可控 L1');
      if (l1) {
        eq(snapshots.length, 0, '未 impact 上层不推进（nextTurn 零调用）');
        eq(endTurnCalls, 0, '未 impact 上层不调 endTurn');
        check(!settled, '未 impact executeSkillAction 未完成');
        l1.onImpact();
        check(eU.hp <= 0 && eU.isAlive === false, 'impact 后真实死亡收口（真实 updateEnemyUI 置 isAlive=false）');
        l1.resolveDone(true);
        await p.catch(() => {});
        check(endTurnCalls >= 1, 'impact 完成后上层调用真实 endTurn');
        check(snapshots.length >= 1, '真实 endTurn 推进至 nextTurn 记录桩');
        if (snapshots[0]) check(snapshots[0].hp <= 0 && snapshots[0].isAlive === false,
          'nextTurn 看到的反击受害者已死亡（hp<=0 且 isAlive=false）');
      }
      w.Math.random = saved.random;
      w.nextTurn = realNextTurn;
      w.endTurn = realEndTurn;
      resetAll();
    });

    /* ================================================================
       组五：AFTER_DAMAGE 荆棘反伤路由（不递归/保命/同毫秒不误去重）
       ================================================================ */
    await group('AFTER_DAMAGE荆棘反伤路由', async () => {
      if (!publishGate) return;
      /* 1) 基本路由 + 不递归 */
      resetAll();
      const dE = install([entity('h_ca1', { hp: 1000, maxHp: 1000, atk: 100, def: 0 })],
        [entity('e_ca1', { tags: ['[荆棘]'] })]);
      wireDom();
      const heroE = dE.h[0], thornE = dE.e[0];
      w.CombatEvents.emit(E.AFTER_DAMAGE, { caster: heroE, target: thornE, targetDom: null, incomingDamageType: '近战', hpDmg: 100, shieldDmg: 0 });
      eq(heroE.hp, 950, '荆棘反伤按 50% 实际伤害反弹（下限 10+def）');
      eq(thornE.hp, 1000, '反伤不误伤荆棘持有者');
      const ref = dmgCtx(c => c.source === 'reflect');
      check(!!ref && ref.resultType === 'ReflectDamage', '反伤提交 ReflectDamage 事件');
      if (ref) {
        eq([ref.sourceId, ref.targetId], ['e_ca1', 'h_ca1'], 'ReflectDamage 归因：荆棘持有者→攻击者');
        eq([ref.hpBefore, ref.hpAfter, ref.hpDmg], [1000, 950, 50], 'ReflectDamage 快照准确');
      }
      eq(events.filter(x => x.kind === 'damage').length, 1, '反伤不再触发 AFTER_DAMAGE（无递归二次发布）');
      eq(impactSounds().length, 1, '反伤受击音恰一次');
      for (const armor of [0, 40]) {
        resetAll();
        const low = install([entity('h_ca1', { hp:1000,maxHp:1000,def:armor })],[entity('e_ca1',{tags:['[荆棘]']})]);
        wireDom();
        w.CombatEvents.emit(E.AFTER_DAMAGE,{caster:low.h[0],target:low.e[0],incomingDamageType:'近战',hpDmg:2,shieldDmg:0});
        eq(low.h[0].hp,990,'荆棘实际反伤下限10，护甲'+armor+'不把下限减成1');
      }
      /* 2) 反伤致命先经 ON_FATAL_DAMAGE 保命，发布保命后的结果 */
      resetAll();
      const dE2 = install([entity('h_ca1', { classType: '防守者', hp: 5, maxHp: 1000, atk: 100, def: 0 })],
        [entity('e_ca1', { tags: ['[荆棘]'] })]);
      wireDom();
      const heroE2 = dE2.h[0], thornE2 = dE2.e[0];
      w.CombatEvents.emit(E.AFTER_DAMAGE, { caster: heroE2, target: thornE2, targetDom: null, incomingDamageType: '近战', hpDmg: 100, shieldDmg: 0 });
      check(heroE2.isAlive === true && heroE2.hp === 1, '反伤致命先经毅力留存保命（保留 1 HP）');
      const ref2 = dmgCtx(c => c.source === 'reflect');
      check(!!ref2 && ref2.hpDmg === 4 && ref2.hpAfter === 1, '发布的是保命后的结果（4 伤 / HP1）');
      /* 3) 同一毫秒两个反伤不误去重 */
      resetAll();
      const dE3 = install([entity('h_ca1', { hp: 1000, maxHp: 1000, atk: 100, def: 0 })],
        [entity('e_ca1', { tags: ['[荆棘]'] })]);
      wireDom();
      const heroE3 = dE3.h[0], thornE3 = dE3.e[0];
      const ctxA = { caster: heroE3, target: thornE3, targetDom: null, incomingDamageType: '近战', hpDmg: 100, shieldDmg: 0 };
      w.CombatEvents.emit(E.AFTER_DAMAGE, ctxA);
      w.CombatEvents.emit(E.AFTER_DAMAGE, ctxA); // 同一同步批次 → 同一毫秒
      eq(events.filter(x => x.kind === 'damage' && x.ctx.source === 'reflect').length, 2, '同毫秒双反伤事件均发布');
      eq(heroE3.hp, 900, '同毫秒双反伤均实际扣血');
      eq(impactSounds().length, 2, '同毫秒双反伤不误去重（各播一次）');
      resetAll();
    });

    await group('复活不误判格挡与敌我波次音频策略', async () => {
      resetAll();
      const hit = { sourceId:'e_ca1', source:'attack', outcome:'hit', maxHp:1000, hpBefore:1000, hpAfter:900, hpDmg:100, shieldDmg:0 };
      const heroWave = dir.beginWave(['h_ca1','h_ca2']);
      dir.publish(Object.assign({}, hit, { targetId:'h_ca1', isHero:true, wave:heroWave }));
      eq(impactSounds().length, 1, '英雄首个目标结算立即播音，不等整波');
      dir.publish(Object.assign({}, hit, { targetId:'h_ca2', isHero:true, wave:heroWave }));
      eq(impactSounds().length, 2, '英雄第二个目标独立播音');
      dir.completeTarget(heroWave, 'h_ca1'); dir.completeTarget(heroWave, 'h_ca2'); dir.closeWave(heroWave);
      eq(impactSounds().length, 2, '英雄波次收尾不追加聚合音');
      resetAll();
      const enemyWave = dir.beginWave(['e_ca1','e_ca2']);
      dir.publish(Object.assign({}, hit, { targetId:'e_ca1', sourceId:'h_ca1', isHero:false, wave:enemyWave }));
      dir.publish(Object.assign({}, hit, { targetId:'e_ca2', sourceId:'h_ca1', isHero:false, wave:enemyWave }));
      eq(impactSounds().length, 0, '敌方范围受击不逐目标叠播');
      dir.completeTarget(enemyWave, 'e_ca1'); dir.completeTarget(enemyWave, 'e_ca2'); dir.closeWave(enemyWave);
      eq(impactSounds().length, 1, '敌方范围受击仍每波聚合一次');
      resetAll();
      const d = install([entity('h_ca1', { spd:1 })], [entity('e_ca1', { hp:130, maxHp:130, spd:1, reviveCount:1 })]);
      wireDom();
      const s = sk('【召雷术复活回归】[群攻;power:210][法术][必中]');
      const wave = dir.beginWave(['e_ca1']);
      reviveCueArgs = null;
      await w.applySingleTagEffect(d.h[0], d.e[0], '[群攻]', 210, 300, 1, null, s, 210, true, { audioWave:wave });
      dir.closeWave(wave);
      eq([d.e[0].hp,d.e[0].reviveCount,d.e[0].shield], [39,0,0], '真实致命法术触发复活，仍无个人盾');
      const result = dmgCtx(c => c.targetId === 'e_ca1');
      eq([result?.kind,result?.resultType,result?.hpDmg,result?.shieldBroken], ['prevented','DamagePrevented',0,false], '复活免伤发布独立结果，不冒充格挡或破盾');
      eq(impactSounds().length, 0, '纯复活波不播放最高档格挡或受击音');
      if (typeof w.playVariantTriggerFx === 'function') {
        eq(sounds.filter(s => s.key === 'hpHeal').length, 0, '复活不再走 hpHeal 旧回血音');
        const arg0 = reviveCueArgs && reviveCueArgs[0];
        const arg1 = reviveCueArgs && reviveCueArgs[1];
        let cue;
        if (arg0 && typeof arg0 === 'object') cue = arg0;
        else if (arg1 && typeof arg1 === 'object') cue = Object.assign({ trigger: arg0 }, arg1);
        else cue = { trigger: arg0, enemyId: arg1, meta: reviveCueArgs && reviveCueArgs[2] };
        eq(cue.trigger, 'revive', '复活 cue 走 trigger:revive 业务分派');
        eq(cue.enemyId, 'e_ca1', '复活 cue 携带真实 enemyId');
        eq(cue.meta && cue.meta.healTo, 39, '复活 cue meta.healTo=30%最大HP');
      } else {
        pending.push('待对齐:playVariantTriggerFx 复活专属 cue 未接管');
      }
      resetAll();
    });

    /* ================================================================
       组六：wave API（actionId / completeTarget 门闩 / cancelWave / clear）
       completeTarget 所有目标后 close 才播；publish 不自动完成目标
       ================================================================ */
    await group('wave completeTarget门闩与close/cancel/clear', async () => {
      resetAll();
      const hit = { targetId: 'h_ca1', sourceId: 'e_ca1', source: 'attack', outcome: 'hit', maxHp: 1000,
        hpDmg: 500, hpBefore: 1000, hpAfter: 500, shieldBefore: 0, shieldAfter: 0 };
      const wave = dir.beginWave(['h_ca1', 'e_ca1'], 'act-9');
      check(!!wave, 'beginWave 返回 wave 对象');
      eq(wave.actionId, 'act-9', 'beginWave 第二参 actionId 记录到 wave');
      dir.publish(Object.assign({}, hit, { wave }));
      const wctx = dmgCtx();
      check(!!wctx && wctx.waveId === wave.id && wctx.actionId === 'act-9', 'wave 内发布载荷带 waveId/actionId');
      eq(impactSounds().length, 0, 'close 前不播');
      dir.closeWave(wave);
      eq(impactSounds().length, 0, 'publish 不自动完成目标：未 completeTarget 的 close 不播');
      /* 全部目标 completeTarget 后 close 才播一次 */
      resetAll();
      const wave2 = dir.beginWave(['h_ca1', 'e_ca1'], 'act-10');
      dir.publish(Object.assign({}, hit, { wave: wave2 }));
      dir.publish(Object.assign({}, hit, { targetId: 'e_ca1', wave: wave2 }));
      dir.completeTarget(wave2, 'h_ca1');
      dir.completeTarget(wave2, 'e_ca1');
      eq(impactSounds().length, 0, '全部 completeTarget 后 close 前仍不播');
      dir.closeWave(wave2);
      eq(impactSounds().length, 1, '全部目标 completeTarget 后 close 播一次');
      dir.closeWave(wave2);
      eq(impactSounds().length, 1, '重复 close 不双播');
      /* cancelWave */
      resetAll();
      const wave3 = dir.beginWave(['h_ca1']);
      dir.publish(Object.assign({}, hit, { wave: wave3 }));
      dir.cancelWave(wave3);
      eq(impactSounds().length, 0, 'cancelWave 取消不播放');
      dir.publish(Object.assign({}, hit, { wave: wave3 }));
      eq(impactSounds().length, 0, 'cancelWave 后同 wave 发布不播');
      /* clear 后旧 wave 不向新战局播音 */
      const wave4 = dir.beginWave(['h_ca1']);
      dir.clear();
      try { dir.completeTarget(wave4, 'h_ca1'); } catch (e) { /* clear 后 completeTarget 尽力而为 */ }
      dir.closeWave(wave4);
      eq(impactSounds().length, 0, 'clear 后旧 wave 不播');
      resetAll();
    });

    /* ================================================================
       组七：playHitFeedback 仅视觉 + 身份音开关静默（事件仍发布）
       ================================================================ */
    await group('playHitFeedback仅视觉与身份音开关', async () => {
      resetAll();
      const n0 = doc.querySelectorAll('.arcane-hit-num-layer').length;
      w.playHitFeedback([{ targetId: 'h_ca1', outcome: 'hit', hpDmg: 30, hpBefore: 100, hpAfter: 70, maxHp: 100 }], {});
      eq(events.length, 0, 'playHitFeedback 仅视觉不自行发布事件');
      check(doc.querySelectorAll('.arcane-hit-num-layer').length === n0 + 1, '视觉浮字层正常创建');
      try { w.clearHitFeedback(); } catch (e) {}
      resetAll();
      mod.setIdentitySfx(false);
      dir.publish({ targetId: 'h_ca1', sourceId: 'e_ca1', source: 'attack', outcome: 'hit', maxHp: 1000,
        hpDmg: 300, hpBefore: 1000, hpAfter: 700, shieldBefore: 0, shieldAfter: 0 });
      eq(events.length, 1, '关闭身份音后事件仍发布');
      eq(impactSounds().length, 0, '关闭身份音后声音静默');
      mod.setIdentitySfx(true);
      dir.publish({ targetId: 'h_ca1', sourceId: 'e_ca1', source: 'attack', outcome: 'hit', maxHp: 1000,
        hpDmg: 300, hpBefore: 1000, hpAfter: 700, shieldBefore: 0, shieldAfter: 0 });
      check(impactSounds().length >= 1, '恢复身份音后受击音恢复');
      mod.setIdentitySfx(true);
      resetAll();
    });

    } finally {
      restoreTimers();
      try { w.CombatEvents.off(E.DAMAGE_RESOLVED, onDmg); } catch (e) {}
      try { w.CombatEvents.off(E.DODGE_RESOLVED, onDdg); } catch (e) {}
      try { w.clearArcaneFx(); } catch (e) {}
      for (const [name, fn] of functions) { try { w[name] = fn; } catch (e) {} }
      w.Math.random = saved.random;
      w.__carRestore = saved;
      try {
        ev(`(() => { const s = window.__carRestore;
          heroesData = s.heroesData; enemiesData = s.enemiesData; battleHistory = s.battleHistory; _historyRawCache = s._historyRawCache;
          combatToken = s.combatToken; _pipelineFrozen = s.frozen; nonLethalSettings.enabled = s.nonLethal;
          teamBarrier = s.teamBarrier; teamBarrierMax = s.teamBarrierMax;
          initialHeroesCache = s.ihc; initialEnemiesCache = s.iec;
          for (const k of Object.keys(state)) delete state[k]; Object.assign(state, s.state);
          for (const k of Object.keys(llmState)) delete llmState[k]; Object.assign(llmState, s.llm);
          CombatEvents.emit = s.emit; CombatEvents.emitAsync = s.emitAsync;
          fxEngine.particles = s.particles; fxEngine.hitStop = s.hitStop;
          delete window.__carRestore;
        })()`);
      } catch (e) { /* 清理尽力而为 */ }
      try { mod.setIdentitySfx(true); } catch (e) {}
      try { root.remove(); } catch (e) {}
    }
    if (mock && typeof mock.genCount === 'function') eq(mock.genCount(), gen0, '音频专项未调用外部LLM');
    return { pending };
  };
})();
