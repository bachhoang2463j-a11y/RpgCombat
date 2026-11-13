/* 敌方群体攻击演出回归：三级优先级（专属fxTag > 旧括号子类型 > 新group兜底）、防atk1双播、
   动态目标与屏障伪实体、350ms爆发拍点与取消清理。
   现状对齐：显式群攻(爆炸/雷/火焰/枪击/毒雾/冰霜/风/光)走 playAttackIdentityFx 群体专属采样，
   旧群霰弹仍保留扇形+逐目标击发；命中/闪避统一交 playHitFeedback，不再逐目标 playSound/atk1。
   逻辑组用微任务假时钟加速结算，并对 identity/feedback 只做真实签名包装计数；
   真实绘制组恢复真实 identity/feedback 模块、真实时钟与真实fxEngine帧。
   全部断言走运行时/宽容格式匹配，不依赖内部局部变量名与源码行号，兼容压缩产物。 */
(function () {
  'use strict';
  window.runEnemyGroupAttackRegression = async function ({ w, check, eq, mock }) {
    const ev = code => w.eval(code);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms)); // 宿主(harness)真时钟，供真实绘制组采样
    const DURATIONS = { melee: 1220, ranged: 1340, spell: 1280 };
    const BURSTS = { melee: ['enemyMeleeGroupHit', 0.72], ranged: ['enemyRangedGroupHit', 0.75], spell: ['atk1', 0.5] };

    /* ---------- 接口落地检查：未落地以 pending 上报待对齐项，不误判失败 ---------- */
    const pending = [];
    const api = ['resolveGroupAttackSubtypeFx', 'resolveEnemyGroupAttackFx', 'isArcaneSkillFx', 'playArcaneSkillFx',
      'playArcaneProjectile', 'clearArcaneFx', 'playEnemyWindup', 'getEntitySpriteDom', 'parseSkill',
      'executeSkillAction', 'applySingleTagEffect', 'applyBarrierHit', 'resolveSingleAttackFx', 'triggerBarrierShatter',
      'playSound', 'playCustomAudio', 'playSVGEffect', 'createFloatingText', 'promptReaction', 'addHistory',
      'updateHeroUI', 'updateEnemyUI', 'updateTeamBarrierUI', 'spawnFocusOverlay', 'spawnChargeUpParticles',
      'spawnDefaultAOEParticles', 'spawnExplosionParticles', 'spawnThunderAOEParticles', 'spawnFireAOEParticles',
      'spawnHitFlash', 'triggerScreenShake', 'playEnemyFlinchAnim', 'spawnDodgeSmokeParticles', 'playWebMFX', 'playAOEEffect',
      'playAttackIdentityFx', 'playSingleAttackFx', 'playHitFeedback'];
    api.forEach(name => { if (ev('typeof ' + name) !== 'function') pending.push('接口缺失:' + name); });
    const urls = ev('typeof audioUrls !== "undefined" ? audioUrls : null');
    ['enemyMeleeGroupHit', 'enemyRangedGroupHit'].forEach(key => {
      if (!urls || !urls[key]) pending.push('audioUrls缺键:' + key);
      else if (ev('ASSET_BASE') && urls[key] !== ev('ASSET_BASE') + '/' + key + '.mp3') pending.push('audioUrls键路径不符:' + key);
    });
    const reg = ev('WEBM_FX_REGISTRY') || {};
    const trio = ['group:melee', 'group:ranged', 'group:spell'];
    trio.forEach(key => {
      const entry = reg[key];
      if (!entry || entry.url !== '' || entry.scale !== 1 || entry.particles !== 'arcane' || entry.delay !== 0.35 || !w.isArcaneSkillFx(key)) pending.push('群攻注册未落地:' + key);
    });
    if (pending.length) return { pending };

    const gen0 = mock.genCount();
    const saved = ev(`({ heroesData, enemiesData, initialHeroesCache, initialEnemiesCache, battleHistory, _historyRawCache,
      teamBarrier, teamBarrierMax, teamBarrierName, barrierArmor, barrierSub, barrierStandIn, barrierAoEActive, barrierAoELeak,
      combatToken, frozen:_pipelineFrozen, shatter:_barrierShatterAt, shattering:_barrierShattering, state:{...state}, llm:{...llmState}, nonLethal:nonLethalSettings.enabled,
      speeds:new Map(_recentSpeedChanges), emit:CombatEvents.emit, emitAsync:CombatEvents.emitAsync, random:Math.random,
      impactAudio:window.CombatAudioDirector ? { beginWave:window.CombatAudioDirector.beginWave, closeWave:window.CombatAudioDirector.closeWave, publish:window.CombatAudioDirector.publish, clear:window.CombatAudioDirector.clear } : null,
      particles:fxEngine.particles.slice() })`);
    const functions = new Map();
    const replace = (name, fn) => {
      if (!functions.has(name)) functions.set(name, w[name]);
      w[name] = fn;
    };
    const calls = { skills: [], projectiles: [], svg: [], sounds: [], floats: [], focus: [], charge: [],
      defaultAoe: [], explosion: [], thunderAoe: [], fireAoe: [], webm: [], customAudio: [], reactionPrompts: [],
      identity: [], feedback: [], shatter: 0, shake: 0, cancelled: [] };
    const clearCalls = () => { Object.keys(calls).forEach(k => { if (Array.isArray(calls[k])) calls[k].length = 0; else calls[k] = 0; }); if (audioDirector) audioDirector.clear(); };
    const realSkill = w.playArcaneSkillFx;
    const realShatter = w.triggerBarrierShatter;
    const realFloat = w.createFloatingText;
    const realPlaySound = w.playSound;
    const audioDirector = w.CombatAudioDirector;
    const nativeEmit = saved.emit;
    const timerIds = new Set();
    const nativeSetTimeout = w.setTimeout, nativeClearTimeout = w.clearTimeout;
    const restoreTimers = () => { timerIds.clear(); w.setTimeout = nativeSetTimeout; w.clearTimeout = nativeClearTimeout; };

    /* ---------- 测试舞台：真实img/姓名结构的头像卡 + 召唤物emoji + 敌方图面 ---------- */
    const root = w.document.createElement('div');
    root.id = 'enemy-group-regression-stage';
    root.style.cssText = 'position:fixed;left:20px;top:200px;width:900px;height:260px;pointer-events:none;';
    let stageHtml = '';
    for (let i = 0; i < 15; i++) {
      stageHtml += '<div id="hero-card-h_grp' + i + '" class="hero-card-inner" style="position:absolute;left:' + (i % 8) * 110 + 'px;top:' + Math.floor(i / 8) * 130 + 'px;width:100px;height:120px;background:#243047;border:1px solid #7dd3fc">' +
        '<div style="position:relative;width:100px;height:80px"><div class="entity-name" style="position:absolute;top:0;left:0;height:16px">群攻目标' + i + '</div><img alt="" style="width:100%;height:100%;display:block"></div><div style="height:40px">HP / MP / TP</div></div>';
    }
    stageHtml += '<div id="hero-card-s_grp0" class="enemy-sprite" style="position:absolute;left:880px;top:0;width:100px;height:100px;background:#1e3a5f"><div style="width:100px;height:100px">🐉</div></div>' +
      '<div id="e_grp-sprite" style="position:absolute;left:400px;top:-150px;width:100px;height:100px;background:#4c1d58">' +
      '<img alt="" style="width:100px;height:100px;display:block"></div>';
    root.innerHTML = stageHtml;
    if (!w.document.getElementById('team-barrier-wrapper')) root.insertAdjacentHTML('beforeend', '<div id="team-barrier-wrapper" style="position:absolute;left:0;top:0;width:300px;height:160px"><div id="team-barrier-dome" style="position:absolute;inset:0"></div></div>');
    w.document.body.appendChild(root);

    const entity = (id, extra) => Object.assign({ id, name: id, hp: 3000, maxHp: 3000, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 10, def: 0, spd: 1, shield: 0, hit: 0, actCount: 1, isAlive: true, buffs: [], skills: [], items: [],
      classType: null, isSummon: false, row: 'front' }, extra);
    const installData = (heroes, enemies) => {
      ev('heroesData=' + JSON.stringify(heroes) + ';enemiesData=' + JSON.stringify(enemies) +
        ';teamBarrier=0;teamBarrierMax=0;barrierArmor=0;barrierSub=null;barrierAoELeak=null;barrierAoEActive=false;_barrierShatterAt=0;');
      return { h: ev('heroesData'), e: ev('enemiesData') };
    };
    const skill = s => w.parseSkill(s);
    const attack = (type, tag, power, fxTag) => w.parseSkill('【回归攻击】[' + (tag || '单体') + ';power:' + (power || 80) + ']' +
      (fxTag ? '[特效:' + fxTag + ']' : '') + (type ? '[' + type + ']' : ''));
    const group = async (name, fn) => {
      try { await fn(); }
      catch (e) { check(false, name + '执行异常', String(e.stack || e)); }
    };
    const atkCount = key => calls.sounds.filter(s => s.key === key).length;
    const keyByGroup = { melee: 'group:melee', ranged: 'group:ranged', spell: 'group:spell' };
    const outcomeOf = (outcomes, t) => {
      if (typeof outcomes === 'function') return outcomes(t);
      if (outcomes && typeof outcomes.get === 'function') return outcomes.get(t && t.id);
      if (outcomes && typeof outcomes === 'object') return outcomes[t && t.id];
      return 'hit';
    };
    let restoreAudio = null, errQueue = [], onErr = null, onRej = null;

    try {
      /* ---------- 逻辑组：微任务假时钟 ---------- */
      w.setTimeout = (fn, ms, ...args) => {
        const id = {};
        timerIds.add(id);
        Promise.resolve().then(() => { if (timerIds.delete(id)) fn(...args); });
        return id;
      };
      w.clearTimeout = id => { timerIds.delete(id); };
      ev('combatToken={};_pipelineFrozen=false;nonLethalSettings.enabled=false;llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;state.isGameStarted=false;state.highTierNarrated=new Set();state.actionQueue=[];state.queueIndex=0;');
      w.Math.random = () => 0.5;
      // 只放行新只读结果事件（新契约已落地，不保留 IMPACT_AUDIO 过渡兼容），记录后转发真总线走真 Director→playSound
      const audioPass = [w.EVENTS && w.EVENTS.DAMAGE_RESOLVED, w.EVENTS && w.EVENTS.DODGE_RESOLVED].filter(Boolean);
      if (!calls.resultEvents) calls.resultEvents = [];
      ev('CombatEvents').emit = (event, ctx = {}) => {
        if (audioPass.indexOf(event) >= 0) { calls.resultEvents.push({ event, ctx }); nativeEmit.call(ev('CombatEvents'), event, ctx); }
      };
      ev('CombatEvents').emitAsync = async () => {};
      for (const name of ['updateHeroUI', 'updateEnemyUI', 'updateTeamBarrierUI', 'renderTurnQueue',
        'tryTriggerEnemyLowHpSpeak', 'tryTriggerEnemyMolt', 'tryTriggerEnemyRage', 'tryTriggerEnemyLink', 'notifyManaSpent',
        'triggerHighTierCombinedSpeak', 'triggerAllyHealSpeak', 'triggerAllyAutoSpeak', 'spawnHitFlash', 'triggerScreenShake',
        'spawnDodgeSmokeParticles', 'playEnemyFlinchAnim', 'spawnFocusOverlay', 'spawnChargeUpParticles',
        'spawnDefaultAOEParticles', 'spawnExplosionParticles', 'spawnThunderAOEParticles', 'spawnFireAOEParticles',
        'playWebMFX', 'playDragonBreathFireSFX', 'spawnCanvasParticles']) replace(name, () => {});
      replace('triggerScreenShake', () => { calls.shake++; });
      replace('spawnFocusOverlay', () => { calls.focus.push(1); });
      replace('spawnChargeUpParticles', () => { calls.charge.push(1); });
      replace('spawnDefaultAOEParticles', () => { calls.defaultAoe.push(1); });
      replace('spawnExplosionParticles', () => { calls.explosion.push(1); });
      replace('spawnThunderAOEParticles', () => { calls.thunderAoe.push(1); });
      replace('spawnFireAOEParticles', () => { calls.fireAoe.push(1); });
      replace('playWebMFX', (x, y, tag) => { calls.webm.push(tag); });
      replace('playCustomAudio', url => { calls.customAudio.push(String(url)); });
      replace('playSound', (key, vol, rate) => { calls.sounds.push({ key, vol, rate, t:Date.now() }); return () => {}; });
      replace('playSVGEffect', (dom, type) => { calls.svg.push(type); });
      replace('createFloatingText', (dom, text, color, burst) => { calls.floats.push(text); realFloat(dom, text, color, burst); });
      replace('promptReaction', (target, skills) => {
        calls.reactionPrompts.push(target && target.id);
        return skills && skills.length ? { type: 'reaction', hero: target, skill: skills[0] } : null;
      });
      replace('playArcaneProjectile', async (type) => { calls.projectiles.push(type); });
      replace('playArcaneSkillFx', (tag, caster, targets, reaction) => {
        const handle = { doneAt: Date.now(), cancel() { calls.cancelled.push(tag); } };
        calls.skills.push({ tag, caster, targets, reaction, handle });
        return handle;
      });
      // 真实签名包装：记录身份演出并按目标同步触发 onImpact 元信息，不复制/乱序动画。
      replace('playAttackIdentityFx', ({ scope = 'single', subtype, targets = [], outcomes = null, onImpact = null } = {}) => {
        const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
        calls.identity.push({ scope, subtype, targets: list, outcomes });
        const handle = { doneAt: Date.now(), cancel() {}, onFinish: new Set() };
        list.forEach(t => { if (onImpact) onImpact(t, { scope, subtype, outcome: outcomeOf(outcomes, t), beatMs: 0, point: { x: 0, y: 0 } }); });
        return handle;
      });
      // 逻辑组只计数九合成结果与入口参数；真实行为由 hit-feedback-regression.js 专测。
      replace('playHitFeedback', (results, opts = {}) => {
        (Array.isArray(results) ? results : [results]).filter(Boolean)
          .forEach(r => calls.feedback.push({ targetId: r.targetId, outcome: r.outcome, hpDmg: r.hpDmg, suppressDodgeFx: r.suppressDodgeFx, opts }));
        return { doneAt: Date.now(), duration: 1320, done: Promise.resolve(), cancel() {} };
      });
      replace('triggerBarrierShatter', () => { calls.shatter++; });

      /* ========== 一、子类型与兜底判定（纯函数矩阵：三级优先级） ========== */
      await group('子类型与兜底判定', async () => {
        eq(['[散射(霰弹)]', '[群攻(爆炸)]', '[眩晕(雷)]', '[群攻]', '[群回]', '[单体(火焰)]'].map(t => w.resolveGroupAttackSubtypeFx(t)),
          [null, 'explosion', null, null, null, null], '仅群攻标签的旧括号子类型被识别，单体/眩晕/散射不再误匹配');
        eq(['[群散射(霰弹)]', '[群攻(爆炸)]', '[群攻(雷)]', '[群攻(火焰)]', '[群攻(毒雾)]', '[群攻(冰霜)]', '[群攻(风)]', '[群攻(光)]'].map(t => w.resolveGroupAttackSubtypeFx(t)),
          ['shotgun', 'explosion', 'thunder', 'fire', 'poison', 'frost', 'wind', 'light'], '群攻八个子类型仍精确识别');
        const enemy = entity('e_grp');
        const esum = entity('s_eg', { isSummon: true, side: 'enemy' });
        const hsum = entity('s_hg', { isSummon: true, side: 'hero' });
        const g = (caster, tag, s) => w.resolveEnemyGroupAttackFx(caster, tag, s) || null;
        const cases = [
          [enemy, '[群攻]', {}, 'group:melee'],
          [enemy, '[群攻]', { damageType: '远程' }, 'group:ranged'],
          [enemy, '[群攻]', { damageType: '法术' }, 'group:spell'],
          [enemy, '[群穿透]', { damageType: '法术' }, 'group:spell'],
          [enemy, '[群眩晕]', {}, 'group:melee'], [enemy, '[群散射]', {}, 'group:melee'],
          [enemy, '[单体]', { damageType: '法术' }, null],
          [enemy, '[穿透]', {}, null], [enemy, '[散射]', {}, null],
          [esum, '[群攻]', { damageType: '法术' }, 'group:spell'],
          [enemy, '[群攻]', { fxTag: '燃烧弹' }, null],
          [enemy, '[群攻]', { fxTag: '圣域帷幕' }, null],
          [enemy, '[群攻]', { fxTag: '火焰01' }, null],
          [enemy, '[群攻]', { fxTag: '伊西丝之拥' }, null],
          [enemy, '[群攻(爆炸)]', { damageType: '法术' }, null],
          [enemy, '[群散射(霰弹)]', { damageType: '法术' }, null],
          [enemy, '[单体(雷)]', {}, null],
          [entity('h_grp0'), '[群攻]', { damageType: '法术' }, null],
          [hsum, '[群攻]', {}, null],
          [enemy, '[群回]', {}, null], [enemy, '[群驱散]', {}, null],
          [enemy, '[单体]', { fxTag: '燃烧弹' }, null]
        ];
        cases.forEach(([c, t, s, exp], i) => eq(g(c, t, s), exp, '群攻兜底矩阵 ' + (i + 1) + '：' + t + (s.fxTag ? '/专属' : (s.damageType ? '/' + s.damageType : ''))));
      });

      /* ========== 二、execute新兜底：群体只演一次、屏蔽通用叠层、动态目标含召唤物 ========== */
      await group('execute新兜底屏蔽', async () => {
        const d = installData(
          [entity('h_grp0'), entity('h_grp1'), entity('s_grp0', { isSummon: true, side: 'hero' })],
          [entity('e_grp', { skills: [skill('【敌群扫击】[群攻;power:80][MP:10]')] })]);
        clearCalls();
        const lf = await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
        eq(calls.skills.length, 1, '多目标群体只启动一次group演出');
        const rec = calls.skills[0];
        check(Array.isArray(rec.targets) && rec.targets.length === 3 && rec.targets.some(t => t.isSummon),
          'group目标数组为存活英雄排且含召唤物');
        check(typeof rec.tag === 'string' && rec.tag, 'group演出标签来自注册表三键');
        check(lf === rec.handle, 'execute返回本次group演出实例');
        eq(calls.focus.length, 0, '新兜底不触通用聚焦暗化');
        eq(calls.charge.length, 0, '新兜底不触通用蓄力粒子');
        eq(calls.defaultAoe.length + calls.explosion.length + calls.thunderAoe.length, 0, '新兜底不触旧默认AOE粒子（不含spawnDefaultAOEParticles）');
        eq(atkCount('atk1') + atkCount('atk2') + atkCount('burst'), 0, '新兜底群攻不叠加通用atk1/atk2/爆发声');
        // group演出内cue（enemyMeleeGroupHit/atk1等350ms拍点采样）由真实execute三类型拍点组与聚合矩阵组覆盖：
        // 逻辑组 playArcaneSkillFx 为计数桩，演出内播音不触发，此处不断言cue次数
        eq(calls.sounds.filter(s => /^hit_[123][abc]$/.test(s.key)).length, 3, '三名英雄group:melee各自即时播放受击音');
        const d0 = 3000 - d.h[0].hp, d1 = 3000 - d.h[1].hp, ds = 3000 - d.h[2].hp;
        check(d0 > 0 && d1 > 0 && ds > 0, '普通英雄与召唤物均实际受伤', d0 + '/' + d1 + '/' + ds);
        check(d0 === d1 && d1 === ds, '同防目标等额结算', d0 + '/' + d1 + '/' + ds);

        const d2 = installData(
          [entity('h_grp0', { skills: [skill('【影避】[回避;power:900][MP:4][反应:法术]')] }), entity('h_grp1')],
          [entity('e_grp', { skills: [skill('【敌群魔弹】[群攻;power:80][法术][MP:10]')] })]);
        clearCalls();
        await w.executeSkillAction(d2.e[0], null, d2.e[0].skills[0], 1);
        eq(calls.skills.length, 1, '含反应目标时group演出仍只一次');
        eq(d2.h[0].hp, 3000, '逐目标反应窗口仍开启：反应成功者免伤');
        check(calls.reactionPrompts.indexOf('h_grp0') !== -1, '反应弹窗仍按目标逐个询问');
        check(!calls.floats.some(t => String(t).indexOf('闪避') !== -1), '反应闪避不再走旧createFloatingText浮字');
        check(calls.feedback.some(f => f.targetId === 'h_grp0' && f.outcome === 'dodge'), '群攻闪避改由playHitFeedback统一记录');
        // 英雄混合wave：闪避与HP命中分别反馈，不互相覆盖。
        check(calls.resultEvents.some(x => x.event === (w.EVENTS && w.EVENTS.DODGE_RESOLVED)), 'group:spell混合波闪避走DODGE_RESOLVED语义事件');
        eq(calls.sounds.filter(s => /^hit_[123][abc]$/.test(s.key)).length, 1, 'group:spell混合波命中英雄独立播放受击档音');
        eq(calls.sounds.filter(s => /^dodge_[123]$/.test(s.key)).length, 1, 'group:spell混合波闪避英雄独立播放闪避音');
        eq(atkCount('miss'), 0, '群攻闪避不再走旧playSound miss');
        check(d2.h[1].hp < 3000, '无反应技能者正常受伤');

        const d3 = installData([entity('h_grp0')], [entity('s_eg', { isSummon: true, side: 'enemy', skills: [skill('【群魔弹】[群攻;power:80][法术][MP:10]')] })]);
        clearCalls();
        await w.executeSkillAction(d3.e[0], null, d3.e[0].skills[0], 1);
        eq(calls.skills.length, 1, '敌方召唤物施放群攻同样走新兜底');
        check(d3.h[0].hp < 3000, '敌方召唤物群攻实际结算');
        const dg = installData([entity('h_grp0', { spd: 1000 })], [entity('e_grp', { skills: [skill('【群枪】[群攻(枪击);power:80][远程][MP:10]')] })]);
        clearCalls();
        await w.executeSkillAction(dg.e[0], null, dg.e[0].skills[0], 1);
        eq(calls.identity.map(c => [c.scope, c.subtype]), [['aoe', '枪击']], '显式群枪击改身份群体演出');
        eq(atkCount('gunshot1') + atkCount('gunshot2') + atkCount('gunshot3') + atkCount('atk1'), 0, '群枪击不再逐目标叠加旧枪声');
        check(calls.feedback.some(f => f.targetId === 'h_grp0' && f.outcome === 'dodge'), '群枪击闪避统一由playHitFeedback记录');
        check(calls.sounds.some(s => /^dodge_[123]$/.test(s.key)), 'group:gunshot全闪避播dodge主音');
        eq(calls.sounds.filter(s => /^(hit_[123][abc]|parry_[123]|dodge_[123])$/.test(s.key)).length, 1, 'group:gunshot只聚合一次ImpactAudio（全闪避为dodge档）');
      });

      /* ========== 三、多标签一次 / 旧括号与专属优先 / 英雄与英雄召唤旧路径保持 ========== */
      await group('优先级与旧路径保持', async () => {
        let d = installData([entity('h_grp0')], [entity('e_grp', { skills: [skill('【双段群击】[群攻;power:60][群穿透;power:20][MP:10]')] })]);
        clearCalls();
        await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
        eq(calls.skills.length, 1, '多标签同技能group演出仅一次');
        check(d.h[0].hp < 3000, '多标签两段伤害均结算');

        for (const subtype of ['爆炸', '雷', '霰弹']) {
          for (const type of ['近战', '远程', '法术']) {
            d = installData([entity('h_grp0'), entity('h_grp1')], [entity('e_grp', { skills: [skill('【旧括号群攻】[群攻(' + subtype + ');power:120][' + type + '][MP:10]')] })]);
            clearCalls();
            await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
            eq(calls.skills.length, 0, '括号优先，不启动group兜底演出：' + subtype + '/' + type);
            if (subtype === '霰弹') {
              check(calls.svg.includes('shotgun') && calls.sounds.some(s => s.key === 'xiandan'), '霰弹+类型保留扇面和逐目标击发：' + type);
            } else {
              eq(calls.identity.map(c => [c.scope, c.subtype]), [['aoe', subtype]], '显式群' + subtype + '改身份群体演出：' + type);
              eq(calls.explosion.length + calls.thunderAoe.length, 0, '不再走旧playAOEEffect粒子：' + subtype + '/' + type);
              eq(atkCount('atk1') + atkCount('atk2'), 0, '身份专属采样不叠通用atk1：' + subtype + '/' + type);
              eq(calls.sounds.filter(s => /^hit_[123][abc]$/.test(s.key)).length, 2, 'identity群' + subtype + '两名英雄分别播放受击音：' + type);
              check(d.h.every(x => x.hp < 3000), '身份群体伤害实际结算：' + subtype + '/' + type);
            }
          }
        }

        d = installData([entity('h_grp0')], [entity('e_grp', { skills: [skill('【燃烧群弹】[群攻(爆炸);power:120][特效:燃烧弹][MP:10]')] })]);
        clearCalls();
        await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
        eq(calls.skills.length, 0, '专属fxTag最高优先：不启动group兜底演出');
        check(calls.webm.indexOf('燃烧弹') !== -1, '燃烧弹WebM专属演出保留');
        check(calls.customAudio.some(u => u.indexOf('ranshao') !== -1), '燃烧弹专属独立音效保留');
        check(calls.fireAoe.length >= 1, '燃烧弹火焰粒子保留');

        d = installData([entity('h_grp0', { skills: [skill('【横扫】[群攻;power:120][MP:10]')] })], [entity('e_grp'), entity('e_grp2')]);
        clearCalls();
        await w.executeSkillAction(d.h[0], null, d.h[0].skills[0], 1);
        check(calls.defaultAoe.length >= 1, '英雄无标签群攻保留spawnDefaultAOEParticles旧路径');
        check(atkCount('atk1') >= 1, '英雄群攻逐目标atk1保留（不受敌方抑制影响）');

        d = installData([], [entity('e_grp')]);
        ev('heroesData=' + JSON.stringify([entity('s_hg', { isSummon: true, side: 'hero', skills: [skill('【横扫】[群攻;power:120][MP:10]')] })]));
        clearCalls();
        await w.executeSkillAction(ev('heroesData')[0], null, ev('heroesData')[0].skills[0], 1);
        check(calls.defaultAoe.length >= 1 && atkCount('atk1') >= 1, '英雄召唤物群攻仍走旧AOE路径');
      });

      /* ========== 四、命中/屏障抑制矩阵与真实破碎独立atk1 ========== */
      await group('命中与屏障抑制', async () => {
        let d = installData([entity('h_grp0')], [entity('e_grp')]);
        clearCalls();
        await w.applySingleTagEffect(d.e[0], d.h[0], '[单体]', 80, 100, 1, null, attack('法术'));
        eq([calls.sounds.filter(s => ['atk1','atk2','burst','gunshot1','gunshot2','gunshot3'].indexOf(s.key) >= 0).length, calls.svg.length], [0, 0], '敌方单点无括号不叠通用音画');
        eq(calls.sounds.filter(s => /^(hit_[123][abc]|parry_[123]|dodge_[123])$/.test(s.key)).length, 1, '敌方单点结果经语义事件聚合恰一档音');
        eq(calls.projectiles, ['enemy_spell'], '敌方单点保留原版紫色弹道（非群标签不接管）');
        eq(calls.feedback.map(f => f.outcome), ['hit'], '敌方法术命中记录统一反馈');
        clearCalls();
        await w.applySingleTagEffect(d.e[0], d.h[0], '[群攻]', 80, 100, 1, null, attack('法术'));
        eq(atkCount('atk1') + atkCount('atk2'), 0, '新兜底群攻tag命中不叠通用atk1/atk2');
        check(calls.resultEvents.some(f => f.ctx.targetId === 'h_grp0' && f.event === w.EVENTS.DAMAGE_RESOLVED && f.ctx.waveId === null),
          '单独调用单目标群标签按单体结果即时路由，不把视觉参数当音频权限');
        clearCalls();
        await w.applySingleTagEffect(d.h[0], d.e[0], '[单体]', 80, 100, 1, null, attack());
        eq(calls.sounds.filter(s => ['atk1','atk2','burst','gunshot1','gunshot2','gunshot3'].indexOf(s.key) >= 0).map(s => s.key), ['atk2'], '英雄单体原音保留');
        eq(calls.sounds.filter(s => /^(hit_[123][abc]|parry_[123]|dodge_[123])$/.test(s.key)).length, 1, '英雄单体命中聚合恰一档音');
        eq(calls.svg, ['slash'], '英雄单体原刀光保留');
        eq(calls.feedback.map(f => f.outcome), ['hit'], '英雄单体命中记录统一反馈');
        clearCalls();
        await w.applySingleTagEffect(d.e[0], d.h[0], '[单体(爆炸)]', 80, 100, 1, null, attack('法术', '单体(爆炸)'));
        eq(calls.sounds.filter(s => ['atk1','atk2','burst','gunshot1','gunshot2','gunshot3'].indexOf(s.key) >= 0).length, 0, '旧括号单爆不再播旧atk2受击音');
        eq(calls.sounds.filter(s => /^(hit_[123][abc]|parry_[123]|dodge_[123])$/.test(s.key)).length, 1, '单爆命中聚合恰一档音');
        eq(calls.svg, [], '旧括号单爆不再走旧SVG');
        eq(calls.identity.map(c => [c.scope, c.subtype]), [['single', '爆炸']], '显式单体爆炸改身份演出');
        eq(calls.feedback.map(f => f.outcome), ['hit'], '单爆命中记录统一反馈');
        clearCalls();
        clearCalls();
        await w.applySingleTagEffect(d.e[0], d.h[0], '[单体]', 80, 100, 1, null, attack('法术', '单体', 80, '火焰01'));
        check(calls.customAudio.some(u => u.indexOf('fire01') !== -1), '火焰01专属独立音保留');
        eq([calls.svg.length, calls.projectiles.length, atkCount('atk1') + atkCount('atk2')], [0, 0, 0], '火焰01专属不叠默认svg/弹道/atk音');

        d = installData([entity('h_grp0')], [entity('e_grp')]);
        const b = { id: 'barrier2', isAlive: true, isBarrierTarget: true, name: '圣域帷幕', spd: 0, buffs: [], skills: [], proxyHero: d.h[0] };
        ev('teamBarrier=99999;teamBarrierMax=99999;');
        clearCalls();
        await w.applySingleTagEffect(d.e[0], b, '[群攻]', 80, 100, 1, null, attack('法术'));
        eq(atkCount('atk1') + atkCount('atk2'), 0, '屏障群攻命中静默通用音');
        check(ev('teamBarrier') < 99999, '屏障正常吸收伤害');
        check(d.h[0].hp === 3000, '屏障全挡时代理英雄免伤');
        eq(calls.sounds.filter(s => /^hit_[123][abc]$/.test(s.key) || /^parry_[123]$/.test(s.key) || /^dodge_[123]$/.test(s.key)).length, 0, '纯屏障吸收不发布角色ImpactAudio');
        ev('teamBarrier=99999;teamBarrierMax=99999;barrierArmor=500;');
        clearCalls();
        await w.applySingleTagEffect(d.e[0], b, '[群攻]', 80, 100, 1, null, attack('法术'));
        eq(ev('teamBarrier'), 99999, '护甲全挡屏障耐久不掉');
        check(d.h[0].hp === 3000, '护甲全挡英雄免伤');
        eq(calls.sounds.filter(s => /^(hit_[123][abc]|parry_[123]|dodge_[123])$/.test(s.key)).length, 0, '护甲全挡不发布角色聚合音');
        ev('teamBarrier=99999;teamBarrierMax=99999;barrierArmor=0;');
        clearCalls();
        await w.applySingleTagEffect(d.e[0], b, '[单体(爆炸)]', 80, 100, 1, null, attack('法术', '单体(爆炸)'));
        eq(calls.sounds, [], '单爆屏障命中不再旧atk2');
        eq(calls.identity.map(c => [c.scope, c.subtype]), [['single', '爆炸']], '屏障受单爆走身份演出');

        ev('teamBarrier=10;teamBarrierMax=10;');
        clearCalls();
        await w.applySingleTagEffect(d.e[0], b, '[群攻]', 80, 100, 1, null, attack('法术'));
        eq(calls.shatter, 1, '屏障破碎恰触发一次');
        eq(atkCount('atk1'), 0, '破碎后群攻泄漏不重复播atk1');
        check(d.h[0].hp < 3000, '群攻溢出按群体语义打代理全员');

        ev('teamBarrier=10;teamBarrierMax=10;_barrierShattering=false;');
        clearCalls();
        w.triggerBarrierShatter = realShatter;
        try { w.triggerBarrierShatter(); }
        finally { w.triggerBarrierShatter = functions.get('triggerBarrierShatter'); }
        eq(atkCount('atk1'), 1, '真实盾破碎保留独立atk1，不被群攻抑制误伤');
      });

      await group('屏障execute与取消代际', async () => {
        const trigger = w.triggerBarrierShatter;
        w.triggerBarrierShatter = () => { calls.shatter++; };
        try { for (const barrier of [99999, 10]) {
          const d = installData([entity('h_grp0'), entity('h_grp1'), entity('s_grp0', { isSummon: true, side: 'hero' })], [entity('e_grp', { skills: [skill('【群爆验收】[群攻;power:80][法术][MP:10]')] })]);
          ev('teamBarrier=' + barrier + ';teamBarrierMax=' + barrier + ';');
          clearCalls();
          const hits = w.applySingleTagEffect, seen = [];
          w.applySingleTagEffect = async (...args) => { seen.push(args[1]); return hits(...args); };
          try { await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1); }
          finally { w.applySingleTagEffect = hits; }
          eq(calls.skills.length, 1, '屏障' + barrier + '群攻演出只一次');
          const fxTarget = calls.skills[0].targets;
          check(fxTarget.length === 1 && fxTarget[0].isBarrierTarget, '屏障' + barrier + '只传单个伪实体');
          check(seen[0] === fxTarget[0] && fxTarget[0].proxyHero && !fxTarget[0].proxyHero.isSummon, '屏障' + barrier + '演出与结算共用真实普通英雄proxy');
          eq(atkCount('atk1'), 0, '屏障' + barrier + '逻辑结算不重复atk1');
            eq(calls.sounds.filter(s => /^hit_[123][abc]$/.test(s.key)).length, barrier > 80 ? 0 : 3,
              '屏障' + barrier + '吸收不伪造角色Impact，泄漏后英雄逐目标反馈');
          if (barrier > 80) check(d.h.every(h => h.hp === 3000), '屏障全挡全员HP不变');
          else check(d.h.every(h => h.hp < 3000), '破盾泄漏依原规则伤及全员');
        } } finally { w.triggerBarrierShatter = trigger; }
      });

      /* ========== 五、真实绘制：三键时长/拍点/取消/清场/14晶/坐标/反馈 ========== */
      restoreTimers();
      w.clearArcaneFx();
      ev('_barrierShattering=false;');
      w.playArcaneSkillFx = realSkill;
      // 真实绘制组恢复真实身份与命中反馈模块，不用逻辑组计数桩掩盖真实残留。
      w.playAttackIdentityFx = functions.get('playAttackIdentityFx');
      w.playHitFeedback = functions.get('playHitFeedback');
      const makeParam = v => ({ value: v, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
        setTargetAtTime() {}, cancelScheduledValues() {}, setValueCurveAtTime() {} });
      const makeNode = () => {
        const n = { connect() { return n; }, disconnect() {}, start() {}, stop() {}, onended: null, type: '', curve: null, buffer: null };
        ['gain', 'frequency', 'pan', 'Q', 'playbackRate', 'detune', 'threshold', 'knee', 'ratio', 'attack', 'release'].forEach(p => { n[p] = makeParam(1); });
        return n;
      };
      const audioCounts = {};
      class FakeAudioContext {
        constructor() { this.destination = makeNode(); this.sampleRate = 48000; this.state = 'running'; this.currentTime = 0; }
        resume() { return Promise.resolve(); }
        close() { return Promise.resolve(); }
      }
      ['createGain', 'createDynamicsCompressor', 'createConvolver', 'createBiquadFilter', 'createStereoPanner',
        'createWaveShaper', 'createOscillator', 'createBufferSource'].forEach(m => {
        FakeAudioContext.prototype[m] = function () { audioCounts[m] = (audioCounts[m] || 0) + 1; return makeNode(); };
      });
      FakeAudioContext.prototype.createBuffer = function (ch, len) {
        audioCounts.createBuffer = (audioCounts.createBuffer || 0) + 1;
        return { getChannelData: () => new Float32Array(len || 1), duration: (len || 1) / 48000, sampleRate: 48000 };
      };
      const origAC = w.AudioContext, origWAC = w.webkitAudioContext;
      w.AudioContext = FakeAudioContext; w.webkitAudioContext = FakeAudioContext;
      restoreAudio = () => { w.AudioContext = origAC; w.webkitAudioContext = origWAC; };
      errQueue = [];
      onErr = e => errQueue.push('error:' + String((e && e.message) || e));
      onRej = e => errQueue.push('rejection:' + String((e && e.reason && e.reason.message) || e.reason));
      w.addEventListener('error', onErr);
      w.addEventListener('unhandledrejection', onRej);

      await group('真实绘制三键与取消', async () => {
        const d = installData([entity('h_grp0'), entity('h_grp1')], [entity('e_grp')]);
        clearCalls();
        for (const key of trio) {
          const t0 = Date.now();
          const h = w.playArcaneSkillFx(key, d.e[0], [d.h[0]]);
          if (!h || typeof h.doneAt !== 'number' || typeof h.cancel !== 'function') { check(false, 'group键返回可清理句柄：' + key); continue; }
          const dur = h.doneAt - t0;
          const grp = key.slice('group:'.length);
          check(dur >= DURATIONS[grp] && dur <= DURATIONS[grp] + 60, 'group键总时长保持：' + key, String(dur));
          eq(keyByGroup[grp], key, 'group键精确对应：' + grp);
          h.cancel();
          eq(w.document.querySelectorAll('[data-arcane-fx]').length, 0, '爆发前cancel立即清场：' + key);
          eq(calls.sounds.length, 0, '爆发前cancel无burst音：' + key);
          w.clearArcaneFx();
        }
        check(!!(keyByGroup.melee && keyByGroup.ranged && keyByGroup.spell), '三键与近战/远程/法术一一对应');
        check(Object.keys(audioCounts).length > 0, '真实group演出创建音频合成节点', JSON.stringify(audioCounts));

        if (keyByGroup.spell) {
          clearCalls();
          const t0 = Date.now();
          const h = w.playArcaneSkillFx(keyByGroup.spell, d.e[0], [d.h[0], d.h[1]]);
          check(!!h, '真实group演出返回句柄');
          await wait(220);
          eq(atkCount('atk1'), 0, '350ms拍点前无爆发音采样');
          await wait(380);
          const burst = calls.sounds.find(s => s.key === 'atk1');
          check(!!burst && burst.t - t0 >= 350, '爆发音在350ms拍点后出现');
          eq(burst ? burst.vol : null, 0.5, '法术群爆发音量0.5');
          h.cancel();
          eq(w.document.querySelectorAll('[data-arcane-fx]').length, 0, '爆发后cancel清场');
          await wait(400);
          eq(w.document.querySelectorAll('[data-arcane-fx]').length, 0, '爆发后cancel无延迟复活');
          eq(calls.shake, 0, 'groupShake不调用全局triggerScreenShake');

          const h2 = w.playArcaneSkillFx(keyByGroup.spell, d.e[0], [d.h[0]]);
          await wait(Math.max(0, h2.doneAt - Date.now()) + 350);
          eq(w.document.querySelectorAll('[data-arcane-fx]').length, 0, 'group演出自然收尾无残留');
          const bs = w.document.getElementById('battle-scene');
          check(!bs || !bs.className.includes('arcane-shake'), 'group震动随演出结束清除');

          const h3 = w.playArcaneSkillFx(keyByGroup.melee, d.e[0], [d.h[0]]);
          h3.cancel(); h3.cancel();
          w.clearArcaneFx(); w.clearArcaneFx();
          eq(w.document.querySelectorAll('[data-arcane-fx]').length, 0, '重复cancel/clear幂等无残留');
          eq(w.playArcaneSkillFx(keyByGroup.spell, d.e[0], []), null, '无targets返回null');
          eq(w.playArcaneSkillFx(keyByGroup.spell, entity('e_ghost'), [d.h[0]]), null, '施法者无DOM返回null');
        }
      });

      await group('14金晶与动态目标反馈', async () => {
        const all = Array.from({ length: 15 }, (_, i) => entity('h_grp' + i));
        all.push(entity('s_grp0', { isSummon: true, side: 'hero' }));
        const d = installData(all, [entity('e_grp')]);
        for (const n of [1, 2, 4, 6, 15]) {
          clearCalls();
          const targets = d.h.slice(0, n), counts = new Map(), tracked = new Set(targets.map(t => w.getEntitySpriteDom(t)));
          const animate = w.Element.prototype.animate;
          w.Element.prototype.animate = function (frames, options) {
            if (tracked.has(this)) counts.set(this, (counts.get(this) || 0) + 1);
            return animate.call(this, frames, options);
          };
          let h;
          try {
            h = w.playArcaneSkillFx('group:ranged', d.e[0], targets);
            check(!!h, n + '目标金晶起播返回句柄');
            eq(w.document.querySelectorAll('.arcane-group-missile').length, 14, n + '目标金晶总数恒为14');
            const styles = Array.from(w.document.querySelectorAll('[data-arcane-fx] [style]')).map(el => el.getAttribute('style'));
            check(!styles.some(s => /NaN|Infinity/.test(s)), n + '目标舞台与弹道坐标有效');
            await wait(1100);
            eq(Array.from(tracked).filter(dom => counts.has(dom)).length, n, n + '目标全部获得主晶硬直反馈');
            eq(atkCount('enemyRangedGroupHit'), 1, n + '目标远程采样恰一次');
            h.cancel();
            eq(w.document.querySelectorAll('[data-arcane-fx]').length, 0, n + '目标金晶取消无残留');
          } finally {
            w.Element.prototype.animate = animate;
            if (h) h.cancel();
            w.clearArcaneFx();
          }
        }
        for (const kind of ['melee', 'ranged', 'spell']) {
          const t0 = Date.now();
          const h = w.playArcaneSkillFx('group:' + kind, d.e[0], [d.h[0], d.h[1], d.h[d.h.length - 1]]);
          check(!!h, kind + '含召唤物动态目标可起播');
          await wait(Math.max(0, h.doneAt - Date.now()) + 80);
          eq(w.document.querySelectorAll('[data-arcane-fx]').length, 0, kind + '自然收尾无残留');
          check(Date.now() - t0 >= DURATIONS[kind], kind + '总时长保持Demo契约');
        }
        ev('teamBarrier=99999;teamBarrierMax=99999;');
        const proxy = d.h[0], b = { id: 'barrier2', isAlive: true, isBarrierTarget: true, proxyHero: proxy };
        const card = w.getEntitySpriteDom(proxy), image = card.querySelector('img'), transform = image.style.transform, opacity = image.style.opacity;
        const snapshot = new Set(ev('fxEngine.particles'));
        const h = w.playArcaneSkillFx('group:ranged', d.e[0], [b]);
        eq(w.document.querySelectorAll('.arcane-group-missile').length, 14, '单屏障伪目标仍有14枚金晶');
        await wait(940);
        eq(w.document.querySelectorAll('.arcane-portrait-fragments').length, 0, '屏障全挡时不伪造英雄头像崩碎');
        h.cancel();
        eq([image.style.transform, image.style.opacity], [transform, opacity], '屏障演出不修改代理英雄原inline样式');
        eq(ev('fxEngine.particles').filter(p => !snapshot.has(p)).length, 0, '取消移除本组宿主粒子');
        const flinchTarget = w.getEntitySpriteDom(d.h[0]), flinchImg = flinchTarget.querySelector('img');
        const oldTransform = flinchImg.style.transform, oldOpacity = flinchImg.style.opacity;
        const cleanupHandle = w.playArcaneSkillFx('group:spell', d.e[0], [d.h[0]]);
        await wait(390);
        check(flinchTarget.classList.contains('arcane-flash-spell'), '爆发中真实目标带法术闪色');
        w.clearArcaneFx();
        check(!flinchTarget.classList.contains('arcane-flash-spell'), 'clear中途中断移除新增法术闪色');
        eq([flinchImg.style.transform, flinchImg.style.opacity], [oldTransform, oldOpacity], 'clear恢复原图面inline样式');
        cleanupHandle.cancel();
        const token = ev('combatToken');
        clearCalls();
        const interrupted = w.playArcaneSkillFx('group:spell', d.e[0], [proxy]);
        ev('combatToken={};');
        w.clearArcaneFx();
        await wait(520);
        eq(atkCount('atk1'), 0, '战局token重置且清理后无延迟采样复活');
        eq(w.document.querySelectorAll('[data-arcane-fx]').length, 0, '战局重置清理后临时层归零');
        interrupted.cancel();
        w.__egarToken = token; ev('combatToken=window.__egarToken;delete window.__egarToken;');
      });

      /* ========== 六、真实execute：三类型爆发音量、350ms拍点与防双播 ========== */
      await group('真实execute三类型拍点', async () => {
        const texts = { melee: '【敌群扫击】[群攻;power:80][MP:10]', ranged: '【敌群狙击】[群攻;power:80][远程][MP:10]', spell: '【敌群魔弹】[群攻;power:80][法术][MP:10]' };
        const hitLayers = () => w.document.querySelectorAll('[data-arcane-fx="hit-num"]').length;
        const groupLayers = () => w.document.querySelectorAll('[data-arcane-fx]:not([data-arcane-fx="hit-num"])').length;
        const settle = async label => {
          for (let i = 0; i < 30 && hitLayers(); i++) await wait(80);
          eq(groupLayers(), 0, label + 'execute自然收尾无演出残留');
          eq(hitLayers(), 0, label + '命中反馈层按寿命自然清理');
        };
        for (const grp of ['melee', 'ranged', 'spell']) {
          const key = keyByGroup[grp];
          if (!key) { check(false, grp + '群键缺失，跳过真实execute拍点'); continue; }
          const d = installData([entity('h_grp0')], [entity('e_grp', { skills: [skill(texts[grp])] })]);
          clearCalls();
          const t0 = Date.now();
          const p = w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
          await wait(220);
          eq(atkCount(BURSTS[grp][0]), 0, grp + '群攻350ms拍点前无爆发音');
          eq(d.h[0].hp, 3000, grp + '群攻350ms拍点前未结算伤害');
          await p;
          const burst = calls.sounds.filter(s => s.key === BURSTS[grp][0]);
          check(burst.length >= 1, grp + '群攻爆发音落地：' + BURSTS[grp][0]);
          eq(burst[0] ? burst[0].vol : null, BURSTS[grp][1], grp + '群攻爆发音量正确');
          check(burst[0] && burst[0].t - t0 >= 350, grp + '爆发音不早于350ms拍点');
          check(d.h[0].hp < 3000, grp + '群攻结算伤害落地');
          if (grp === 'spell') eq(atkCount('atk1'), 1, '法术群atk1恰一次（无逐目标双播）');
          else eq(atkCount('atk1'), 0, grp + '群攻无通用atk1双播');
          await settle(grp);
        }
      });

      /* ========== 七、真实execute音频聚合矩阵：每wave一次、cue保留、混合最高档、破盾、全闪避、无目标、armor全挡 ========== */
      await group('真实execute音频聚合矩阵', async () => {
        // 独立构造技能文本（真实绘制组的 texts 为该组局部变量，不在本作用域）
        const texts = { melee: '【敌群扫击】[群攻;power:80][MP:10]', ranged: '【敌群狙击】[群攻;power:80][远程][MP:10]', spell: '【敌群魔弹】[群攻;power:80][法术][MP:10]' };
        const impactKeyRe = /^(hit_[123][abc]|parry_[123]|dodge_[123])$/;
        const aggSounds = () => calls.sounds.filter(s => impactKeyRe.test(s.key));
        // 三类型各一 wave：结果聚合音每 wave 恰一次，技能 cue 采样保留
        for (const grp of ['melee', 'ranged', 'spell']) {
          const d = installData([entity('h_grp0')], [entity('e_grp', { skills: [skill(texts[grp])] })]);
          clearCalls();
          await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
          eq(aggSounds().length, 1, grp + '真实execute结果聚合音每wave恰一次', JSON.stringify(calls.sounds.map(s => s.key)));
          check(calls.sounds.some(s => s.key === BURSTS[grp][0]), grp + '技能cue采样保留');
        }
        // 混合maxHp：同伤跨档取实际最高档
        {
          const d = installData([entity('h_grp0'), entity('h_grp1', { maxHp: 40, hp: 40 })], [entity('e_grp', { skills: [skill(texts.spell)] })]);
          clearCalls();
          await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
          const agg = aggSounds();
          eq(agg.length, 2, '混合maxHp两名英雄各自播放一次');
          const d0 = 3000 - d.h[0].hp, d1 = Math.min(40, 40 - d.h[1].hp);
          const tier = r => r < 0.10 ? 1 : r < 0.50 ? 2 : 3;
          check(agg.every((sound, i) => new RegExp('^hit_' + tier(i === 0 ? d0 / 3000 : d1 / 40) + '[abc]$').test(sound.key)),
            '英雄各按自身真实损血档位播音，不被另一名目标覆盖');
        }
        // 破盾最高：任一目标破盾优先 GuardBreak
        {
          const d = installData([entity('h_grp0', { shield: 5 })], [entity('e_grp', { skills: [skill(texts.spell)] })]);
          clearCalls();
          await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
          check(calls.sounds.some(s => s.key === 'parry_3'), '真实execute任一目标破盾优先GuardBreak');
          eq(aggSounds().length, 1, '破盾波聚合仍恰一次');
        }
        // 全闪避：双反应回避目标全免伤，wave 播 dodge 档音
        {
          const d = installData(
            [entity('h_grp0', { skills: [skill('【影避】[回避;power:900][MP:4][反应:法术]')] }),
             entity('h_grp1', { skills: [skill('【影避2】[回避;power:900][MP:4][反应:法术]')] })],
            [entity('e_grp', { skills: [skill(texts.spell)] })]);
          clearCalls();
          await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
          const agg = aggSounds();
          eq(agg.length, 2, '全闪避两名英雄分别反馈一次');
          check(agg.every(s => /^dodge_[123]$/.test(s.key)), '全闪避逐目标播dodge档音', JSON.stringify(calls.sounds.map(s => s.key)));
          eq(calls.sounds.filter(s => /^hit_[123][abc]$/.test(s.key)).length, 0, '全闪避波不播受击音');
        }
        // 无存活目标：不发布聚合音
        {
          const d = installData([], [entity('e_grp', { skills: [skill(texts.spell)] })]);
          clearCalls();
          await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
          eq(aggSounds().length, 0, '无存活目标不发布聚合音');
        }
        // armor 全挡：execute 级屏障耐久不掉且不发布角色音
        {
          const d = installData([entity('h_grp0')], [entity('e_grp', { skills: [skill(texts.spell)] })]);
          ev('teamBarrier=99999;teamBarrierMax=99999;barrierArmor=500;');
          clearCalls();
          await w.executeSkillAction(d.e[0], null, d.e[0].skills[0], 1);
          eq(ev('teamBarrier'), 99999, 'execute级armor全挡屏障耐久不掉');
          check(d.h[0].hp === 3000, 'execute级armor全挡英雄免伤');
          eq(aggSounds().length, 0, 'execute级armor全挡不发布角色聚合音');
          ev('teamBarrier=0;teamBarrierMax=0;barrierArmor=0;');
        }
      });
      eq(errQueue, [], '真实绘制与fxEngine循环帧期间无未捕获异常（render兼容/坐标，error与rejection）');
    } finally {
      restoreTimers();
      try { w.clearArcaneFx(); } catch (e) {}
      if (onErr) w.removeEventListener('error', onErr);
      if (onRej) w.removeEventListener('unhandledrejection', onRej);
      if (restoreAudio) restoreAudio();
      for (const [name, fn] of functions) { try { w[name] = fn; } catch (e) {} }
      w.Math.random = saved.random;
      w.__egarRestore = saved;
      ev(`(() => { const s = window.__egarRestore;
        heroesData=s.heroesData;enemiesData=s.enemiesData;initialHeroesCache=s.initialHeroesCache;initialEnemiesCache=s.initialEnemiesCache;
        battleHistory=s.battleHistory;_historyRawCache=s._historyRawCache;teamBarrier=s.teamBarrier;teamBarrierMax=s.teamBarrierMax;
        teamBarrierName=s.teamBarrierName;barrierArmor=s.barrierArmor;barrierSub=s.barrierSub;barrierStandIn=s.barrierStandIn;
        barrierAoEActive=s.barrierAoEActive;barrierAoELeak=s.barrierAoELeak;combatToken=s.combatToken;_pipelineFrozen=s.frozen;_barrierShatterAt=s.shatter;_barrierShattering=s.shattering;
        for(const k of Object.keys(state)) delete state[k]; Object.assign(state,s.state);
        for(const k of Object.keys(llmState)) delete llmState[k]; Object.assign(llmState,s.llm);
        nonLethalSettings.enabled=s.nonLethal;_recentSpeedChanges.clear();s.speeds.forEach((v,k)=>_recentSpeedChanges.set(k,v));
        CombatEvents.emit=s.emit;CombatEvents.emitAsync=s.emitAsync;fxEngine.particles=s.particles;
        delete window.__egarRestore;
      })()`);
      root.remove();
    }
    eq(mock.genCount(), gen0, '敌群攻专项未调用外部LLM');
    return { pending: [] };
  };
})();
