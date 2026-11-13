/* 变种触发特效回归（v12.06）：在真实 iframe 内挂载 index.html。
   业务组直接调用真实函数（tryTriggerEnemyMolt / Rage / Link、tryReviveEnemy、
   resolveSummonDeath、CombatEvents、getEffectiveStats），不复制战斗实现；
   演出组只调用新增公开接口 playVariantTriggerFx / isEntityVariantLocked /
   clearVariantState / setVariantSfx，不重写任何 FX 绘制。
   新增接口尚未落地时返回 { pending }，由 harness 汇总为待对齐，不计为断言失败。 */
(function () {
  'use strict';
  window.runVariantTriggerRegression = async function ({ w, check, eq, mock, source }) {
    const ev = code => w.eval(code);
    const doc = w.document;
    const nativeSetTimeout = w.setTimeout;
    const sleep = ms => new Promise(resolve => nativeSetTimeout.call(w, resolve, ms));
    const group = async (name, fn) => {
      try { await fn(); }
      catch (e) { check(false, name + '执行异常', String((e && e.stack) || e)); }
    };
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;

    // —— 新增接口清单：缺一项即整体待对齐（接口未落地不判失败） ——
    const api = ['playVariantTriggerFx', 'isEntityVariantLocked', 'clearVariantState', 'setVariantSfx', 'clearArcaneFx'];
    const missing = api.filter(name => ev('typeof ' + name) !== 'function');
    const hasFx = missing.length === 0;
    if (!hasFx) console.log('[PENDING] 变种触发接口未落地：' + missing.join('、'));

    // —— 业务函数/数据夹具 ——
    const saved = ev(`({ heroesData, enemiesData, battleHistory, _historyRawCache,
      stateQueue: state.actionQueue.slice(), stateIndex: state.queueIndex, nonLethal: nonLethalSettings.enabled,
      random: Math.random, emit: CombatEvents.emit, emitAsync: CombatEvents.emitAsync, llm:{...llmState},
      started:state.isGameStarted, token:combatToken, frozen:_pipelineFrozen, particles:fxEngine.particles.slice(), hitStop:fxEngine.hitStop })`);
    const originals = new Map();
    const replace = (name, fn) => {
      if (!originals.has(name)) originals.set(name, w[name]);
      w[name] = fn;
    };
    const calls = { floats: [], hist: [], sounds: [], flash: [], shake: [], publish: [], uiHero: [] };
    const clearCalls = () => Object.keys(calls).forEach(k => { calls[k].length = 0; });
    const realFloat = w.createFloatingText;
    replace('createFloatingText', (dom, text, color, burst) => {
      calls.floats.push(text);
      try { realFloat(dom, text, color, burst); } catch (e) { /* 夹具文本只做记录 */ }
    });
    replace('addHistory', msg => calls.hist.push(String(msg)));
    replace('updateBuffUI', () => {});
    replace('renderTurnQueue', () => {});
    replace('checkWoundedNarration', () => {});
    replace('triggerEnemySelfDestruct', () => {});
    replace('tryTriggerEnemyDeathSpeak', () => {});
    replace('playSound', key => calls.sounds.push(key));
    replace('updateHeroUI', hero => calls.uiHero.push(hero && hero.id));
    replace('spawnHitFlash', (dom, intensity) => calls.flash.push({ id: dom && dom.id, intensity }));
    replace('triggerScreenShake', (intensity, duration) => calls.shake.push({ intensity, duration }));
    const realPublish = w.CombatAudioDirector && w.CombatAudioDirector.publish;
    if (realPublish) w.CombatAudioDirector.publish = payload => calls.publish.push(payload);

    // —— 实体与 DOM 夹具 ——
    const entity = (id, extra) => Object.assign({
      id, name: '变种' + id, hp: 1000, maxHp: 1000, mp: 10, maxMp: 10, tp: 0, maxTp: 100,
      atk: 100, def: 0, spd: 50, hit: 100, eva: 0, taunt: 1, shield: 0, actCount: 1,
      isAlive: true, buffs: [], skills: [], items: [], tags: [], classType: null,
      isSummon: false, row: 'front', currentCharge: 0
    }, extra);
    const install = (heroes, enemies) => {
      ev('heroesData=' + JSON.stringify(heroes) + ';enemiesData=' + JSON.stringify(enemies) +
        ';battleHistory=[];_historyRawCache="";');
      return { h: ev('heroesData'), e: ev('enemiesData') };
    };
    const root = doc.createElement('div');
    root.id = 'variant-regression-stage';
    root.style.cssText = 'position:fixed;left:30px;top:220px;width:640px;height:260px;pointer-events:none;';
    const box = (id, isHero, label) => isHero
      ? '<div id="hero-card-' + id + '" style="position:absolute;left:10px;top:' + (label ? 0 : 60) + 'px;width:150px;height:120px;background:#1e293b;border:1px solid #38bdf8"><div class="portrait" style="height:80px">' + id + '</div><div class="hp-bar" style="height:6px;width:100%"></div></div>'
      : '<div id="' + id + '-sprite" class="enemy-sprite breathe" style="position:absolute;left:200px;top:' + (label ? 0 : 60) + 'px;width:110px;height:110px;background:#3b0764;border:1px solid #a855f7">' + id + '</div>' +
        '<div id="' + id + '-hp-bar" style="position:absolute;left:200px;top:' + (label ? 110 : 170) + 'px;width:110px;height:6px;background:#22c55e"></div>';
    root.innerHTML = box('vrg_a', false, true) + box('vrg_b', false, false) + box('vrg_c', false, true) +
      box('vrg_d', false, false) + box('vrg_e', false, true) + box('vrg_f', false, false) +
      box('vrg_g', false, true) + box('vrg_h', false, false) + box('h_vrg0', true, true);
    doc.body.appendChild(root);
    const domOf = id => doc.getElementById(id + '-sprite') || doc.getElementById('hero-card-' + id);
    const persistNodes = kind => Array.from(doc.querySelectorAll('[data-arcane-variant-persist="' + kind + '"]'));
    // 只统计临时演出层/锚点/暗幕；常驻 canvas 不算"残留"（由 clearArcaneFx 统一收尾）
    const fxLayerCount = () => Array.from(doc.querySelectorAll('[data-arcane-fx]'))
      .filter(node => node.getAttribute('data-arcane-fx') !== 'canvas').length;
    const isHandle = h => !!h && typeof h.doneAt === 'number' && h.doneAt >= Date.now() - 1000 &&
      typeof h.cancel === 'function' && h.onFinish && typeof h.onFinish.add === 'function';
    const play = (trigger, target, meta, onBeat) => w.playVariantTriggerFx({
      trigger, entity: target,
      sourceEntity: meta && meta.sourceEntity, targetEntity: meta && meta.targetEntity,
      meta: meta || {}, onBeat: onBeat || null
    });
    const visible = dom => !!dom && dom.isConnected && dom.style.display !== 'none' &&
      !dom.classList.contains('opacity-0') && !dom.classList.contains('scale-50');

    try {
      ev('nonLethalSettings.enabled=false;llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;state.isGameStarted=false;');
      w.Math.random = () => 0.5;

      /* ========== 一、蜕皮：真实清 debuff、回血与永久攻击 —— */
      await group('蜕皮业务', async () => {
        const d = install([entity('h_vrg0')], [entity('vrg_molt', {
          hp: 400, maxHp: 1000, atk: 100, tags: ['[蜕皮]'], buffs: [
            { type: 'poison', value: 30, duration: 3 },
            { type: 'burn', value: 20, duration: 2 },
            { type: 'def', value: -10, duration: 2 },
            { type: 'atk', value: 10, duration: 3 }
          ]
        })]);
        const e = d.e[0];
        w.tryTriggerEnemyMolt(e);
        eq([e.molted, e.hp, e.buffs.map(b => b.type)], [true, 700, ['atk']], '蜕皮：清空全部负面状态并回复 30% 生命');
        eq(w.getEffectiveStats(e).atk, 165, '蜕皮后攻击力永久 +50%（含保留的正面 buff）');
        w.tryTriggerEnemyMolt(e);
        eq(e.hp, 700, '蜕皮只结算一次，不重复回血');
        check(calls.hist.some(t => t.includes('绝境爆发')), '蜕皮仍写真实战报');
      });

      /* ========== 二、狂暴：阈值数值、常驻文案只一次 —— */
      await group('狂暴业务', async () => {
        const d = install([entity('h_vrg0')], [entity('vrg_rage', { hp: 250, maxHp: 1000, atk: 100, tags: ['[狂暴]'] })]);
        const e = d.e[0];
        eq(w.getEffectiveStats(e).atk, 150, 'HP≤30% 时狂暴攻击 +50% 实际生效');
        clearCalls();
        w.tryTriggerEnemyRage(e);
        const first = calls.hist.filter(t => t.includes('狂怒')).length;
        eq([e.hasRageNarrated, first], [true, 1], '首次跌线记录一次狂暴文案');
        w.tryTriggerEnemyRage(e);
        eq([e.hasRageNarrated, calls.hist.filter(t => t.includes('狂怒')).length], [true, 1], '再次跌线不重复文案');
        e.hp = 400;
        eq(w.getEffectiveStats(e).atk, 100, 'HP 回到 30% 以上时狂暴数值退出');
      });

      /* ========== 三、连动：真实插队且不被演出锁吞 —— */
      await group('连动业务', async () => {
        const d = install([entity('h_vrg0')], [entity('vrg_link', { hp: 250, maxHp: 1000, tags: ['[连动]'] })]);
        const e = d.e[0];
        ev('state.actionQueue=[{type:"hero",ref:heroesData[0]},{type:"enemy",ref:enemiesData[0]}];state.queueIndex=0;');
        w.tryTriggerEnemyLink(e);
        eq(ev('state.actionQueue.map(x=>({type:x.type,id:x.ref&&x.ref.id,extra:!!x.isExtraTurn}))'),
          [{ type: 'hero', id: 'h_vrg0', extra: false }, { type: 'enemy', id: 'vrg_link', extra: true }, { type: 'enemy', id: 'vrg_link', extra: false }],
          '连动在 queueIndex+1 插入真实额外行动');
        w.tryTriggerEnemyLink(e);
        eq(ev('state.actionQueue.length'), 3, 'linked 一次性标记防重复插队');
      });

      /* ========== 四、再生：眩晕中仍刷新 HP —— */
      await group('再生业务', async () => {
        const d = install([entity('h_vrg0')], [entity('vrg_f', {
          hp: 500, maxHp: 1000, tags: ['[再生]'], buffs: [{ type: 'stun', duration: 1, permanent: false }]
        })]);
        const e = d.e[0];
        clearCalls();
        ev('CombatEvents.emit("turn_start",{entity:enemiesData[0]})');
        eq(e.hp, 600, '眩晕状态下 TURN_START 仍回复 10% 最大生命');
        check(e.buffs.some(b => b.type === 'stun'), '再生不消耗眩晕状态');
        check(calls.floats.some(t => t.includes('调息')), '再生仍播真实调息浮字');
        const eDom = domOf('vrg_f');
        eq(parseFloat(doc.getElementById('vrg_f-hp-bar').style.width), 60, '眩晕再生即时刷新真实血条');
        e.tags.push('[狂暴]');e.hasRageNarrated = true;e.hp = 250;
        w.playVariantTriggerFx({ trigger:'rage', entity:e, meta:{instant:true} });
        check(!!eDom.querySelector('[data-arcane-variant-persist="rage"]'), '回血前低血狂暴外观常驻');
        ev('CombatEvents.emit("turn_start",{entity:enemiesData[0]})');
        await sleep(700);
        eq([e.hp,!!eDom.querySelector('[data-arcane-variant-persist="rage"]')], [350,false], '再生跨30%血线触发rageExit并自然移除红光');
        e.hp=250;w.updateEnemyUI(e);
        check(!!eDom.querySelector('[data-arcane-variant-persist="rage"]'), '再次跌回30%重挂低强度红光，无第二次狂暴文案');
        w.subdueEnemy(e,eDom);
        eq(eDom.querySelectorAll('[data-arcane-variant-persist]').length,0,'制服立即清理变种常驻层');
        w.clearVariantState();
      });

      /* ========== 五、吸血 / 荆棘：真实方向与阈值 —— */
      await group('吸血与荆棘业务', async () => {
        let d = install([entity('h_vrg0', { hp: 500, maxHp: 1000, tags: ['[吸血]'] })],
          [entity('vrg_prey', { hp: 900, maxHp: 1000 })]);
        ev('CombatEvents.emit("after_damage",{caster:heroesData[0],target:enemiesData[0],targetDom:document.getElementById("vrg_prey-sprite"),hpDmg:200,incomingDamageType:"近战"})');
        eq(d.h[0].hp, 560, '吸血按实际伤害 30% 回复（200→60）');

        d = install([entity('h_vrg0', { def: 0 })], [entity('vrg_thorn', { tags: ['[荆棘]'], isAlive: true, hp: 800, maxHp: 1000 })]);
        clearCalls();
        ev('CombatEvents.emit("after_damage",{caster:heroesData[0],target:enemiesData[0],targetDom:document.getElementById("vrg_thorn-sprite"),hpDmg:100,incomingDamageType:"近战"})');
        eq(d.h[0].hp, 950, '荆棘只对近战反弹 50% 实际伤害（下限 10）');
        eq(calls.floats.filter(t => t.includes('反震')).length, 1, '近战命中触发一次反震浮字');
        clearCalls();
        for (const type of ['远程', '法术']) {
          const before = d.h[0].hp;
          ev('CombatEvents.emit("after_damage",{caster:heroesData[0],target:enemiesData[0],targetDom:document.getElementById("vrg_thorn-sprite"),hpDmg:100,incomingDamageType:"' + type + '"})');
          eq(d.h[0].hp, before, '荆棘对 ' + type + ' 伤害不反弹');
        }
        eq([calls.floats.length, calls.publish.filter(p => p.source === 'reflect').length], [0, 0], '非近战方向不产生反震演出或音频结果');
      });

      /* ========== 六、复活：四处死亡口都不误隐藏 —— */
      await group('复活四处死亡口', async () => {
        // 口1：updateEnemyUI 死亡分支（真实函数）
        let d = install([entity('h_vrg0')], [entity('vrg_a', { hp: 0, maxHp: 1000, reviveCount: 1, tags: ['[复活]'] })]);
        const a = d.e[0];
        const aDom = doc.getElementById('vrg_a-sprite');
        clearCalls();
        w.updateEnemyUI(a);
        eq([a.hp, a.reviveCount, a.isAlive], [300, 0, true], 'updateEnemyUI 死亡口：30% 血量原地复活');
        check(visible(aDom), 'updateEnemyUI 复活不把本体隐藏');
        check(calls.floats.some(t => t.includes('死里逃生')), '复活仍播死里逃生浮字');

        // 口2：ON_FATAL_DAMAGE（真实伤害管线）
        d = install([entity('h_vrg0')], [entity('vrg_b', { hp: 20, maxHp: 1000, reviveCount: 1, tags: ['[复活]'] })]);
        const b = d.e[0], bDom = doc.getElementById('vrg_b-sprite');
        ev('window.__vrgFatal={target:enemiesData[0],targetDom:document.getElementById("vrg_b-sprite"),hpDmg:999,shieldDmg:0,prevented:false,cancelled:false};CombatEvents.emit("on_fatal_damage",window.__vrgFatal)');
        const fatal = ev('({prevented:window.__vrgFatal.prevented,hpDmg:window.__vrgFatal.hpDmg})');
        ev('delete window.__vrgFatal');
        eq([fatal.prevented, fatal.hpDmg, b.hp, b.reviveCount], [true, 0, 300, 0], 'ON_FATAL_DAMAGE：复活拦截本次致死');
        check(visible(bDom), '致命口复活不把本体隐藏');

        // 口3：DoT 回合起始致死（静态顺序：先复活再置死）
        if (source) {
          const dotStart = source.indexOf('const revived = tryReviveEnemy(');
          const deadAt = source.indexOf('currentEntity.ref.isAlive = false;', dotStart);
          check(dotStart > 0 && deadAt > dotStart, 'DoT 致死口先尝试复活，再进入置死分支');
        }

        // 口4：召唤物死亡收口（真实函数）
        d = install([entity('h_vrg0')], [entity('vrg_c', { hp: 0, maxHp: 1000, isSummon: true, side: 'enemy', reviveCount: 1, tags: ['[复活]'] })]);
        const c = d.e[0], cDom = doc.getElementById('vrg_c-sprite');
        const handled = w.resolveSummonDeath(c, cDom);
        eq([handled, c.hp, c.reviveCount, ev('enemiesData.some(x=>x.id==="vrg_c")')], [true, 300, 0, true], '召唤物死亡口：复活优先于消散');
        check(visible(cDom), '召唤物复活不把本体隐藏');
      });

      /* ========== 七、接口未落地的待对齐返回 ========== */
      if (!hasFx) {
        check(!mock || typeof mock.genCount !== 'function' || mock.genCount() === gen0, '变种专项未调用外部 LLM');
        return { pending: missing };
      }

      /* ========== 八、分发与 handle 契约 —— */
      await group('分发与handle', async () => {
        const cases = ['revive', 'molt', 'rage', 'rageExit', 'link', 'leech', 'regen', 'thorn'];
        for (const trigger of cases) {
          w.clearVariantState();
          const id = 'vrg_a';
          const e = entity(id, { tags: [] });
          const other = entity('vrg_b');
          install([entity('h_vrg0')], [e, other]);
          const meta = trigger === 'leech'
            ? { sourceEntity: e, targetEntity: other }
            : trigger === 'thorn'
              ? { isMelee: true, reflected: true, sourceEntity: e, targetEntity: other }
              : {};
          const handle = play(trigger, e, meta, () => {});
          check(isHandle(handle), trigger + ' 返回 {doneAt, cancel, onFinish:Set} 句柄');
          check(fxLayerCount() > 0 || (trigger === 'rageExit' && !!doc.getElementById('arcane-fx-canvas')), trigger + ' 真实挂载演出层／粒子画布');
          if (handle) handle.cancel();
          w.clearVariantState();
          eq(fxLayerCount(), 0, trigger + ' 取消后本组演出层清零');
        }
        w.clearVariantState();
        for (const trigger of cases) {
          eq(play(trigger, entity('vrg_a'), { triggered: false }), null, trigger + ' 在 meta.triggered=false 时返回 null');
        }
        eq(play('unknownTrigger', entity('vrg_a'), {}), null, '未知触发返回 null');
        eq(w.playVariantTriggerFx({}), null, '缺 trigger 返回 null');
      });

      /* ========== 九、meta 方向与常驻层 —— */
      await group('meta与常驻', async () => {
        install([entity('h_vrg0')], [entity('vrg_a'), entity('vrg_b')]);
        const e = entity('vrg_a'), other = entity('vrg_b');
        let handle = play('rage', e, {});
        await sleep(700);
        check(persistNodes('rage').length === 1, '狂暴演出挂常驻 [data-arcane-variant-persist=rage]');
        play('rageExit', e, {});
        await sleep(900);
        eq(persistNodes('rage').filter(n => n.isConnected && !n.classList.contains('exiting')).length, 0,
          'rageExit 使狂暴常驻层退出');
        w.clearVariantState();

        eq(play('rage', e, { instant: true }), null, 'instant 狂暴不返回句柄');
        eq(persistNodes('rage').length, 1, 'instant 狂暴直接建立常驻层');
        w.clearVariantState();

        handle = play('molt', e, {});
        await sleep(1400);
        eq(persistNodes('molt').length, 1, '蜕皮演出挂常驻 [data-arcane-variant-persist=molt]');
        w.clearVariantState();
        play('molt', e, { permanentBuff: false });
        await sleep(1400);
        eq(persistNodes('molt').length, 0, 'permanentBuff=false 时不建立常驻层');
        w.clearVariantState();

        eq(play('thorn', e, { isMelee: true, reflected: false, sourceEntity: e, targetEntity: other }), null,
          '荆棘缺少 reflected 不演出');
        eq(play('thorn', e, { isMelee: false, reflected: true, sourceEntity: e, targetEntity: other }), null,
          '荆棘非近战方向不演出');
        const beats = [];
        handle = play('thorn', e, { isMelee: true, reflected: true, sourceEntity: e, targetEntity: other }, b => beats.push(b));
        await sleep(900);
        check(isHandle(handle), '荆棘满足近战+反弹时真实演出');
        check(beats.some(b => b.phase === 'thorn' && b.entity && b.entity.id === 'vrg_b'),
          '荆棘 onBeat 指向真实攻击者（方向 source→target）');
        if (handle) handle.cancel();
        w.clearVariantState();
      });

      /* ========== 十、计数锁与业务隔离 —— */
      await group('计数锁', async () => {
        install([entity('h_vrg0')], [entity('vrg_a'), entity('vrg_b')]);
        const a = entity('vrg_a'), b = entity('vrg_b');
        const h1 = play('revive', a, {});
        const h2 = play('rage', a, {});
        check(w.isEntityVariantLocked('vrg_a'), '高档变种对实体加锁（id）');
        check(w.isEntityVariantLocked(a), 'isEntityVariantLocked 接受实体对象');
        check(w.isEntityVariantLocked(doc.getElementById('vrg_a-sprite')), 'isEntityVariantLocked 接受 DOM');
        check(!w.isEntityVariantLocked('vrg_b'), '未演出实体不受锁影响');
        if (h1) h1.cancel();
        check(w.isEntityVariantLocked('vrg_a'), '计数锁：还剩一个演出仍保持锁定');
        if (h2) h2.cancel();
        check(!w.isEntityVariantLocked('vrg_a'), '计数锁：全部取消后释放');

        const l = entity('vrg_b', { tags: ['[连动]'], hp: 250, maxHp: 1000 });
        install([entity('h_vrg0')], [l]);
        ev('state.actionQueue=[{type:"enemy",ref:enemiesData[0]}];state.queueIndex=0;');
        const locked = play('rage', l, {});
        check(w.isEntityVariantLocked('vrg_b'), '连动前实体处于演出锁中');
        w.tryTriggerEnemyLink(l);
        eq(ev('state.actionQueue.map(x=>({extra:!!x.isExtraTurn}))').filter(x => x.extra).length, 1,
          '演出锁不阻断同拍连动插队');
        if (locked) locked.cancel();
        w.clearVariantState();

        const regen = entity('vrg_a', { tags: ['[再生]'] });
        install([entity('h_vrg0')], [regen]);
        const hr = play('regen', regen, {});
        check(!w.isEntityVariantLocked('vrg_a'), 'L1 变种（再生）不占高档锁');
        if (hr) hr.cancel();
        w.clearVariantState();
      });

      /* ========== 十一、清理：单实体 / 全局 / 取消 / 自然 —— */
      await group('清理', async () => {
        install([entity('h_vrg0')], [entity('vrg_a'), entity('vrg_b'), entity('vrg_c'), entity('vrg_d'), entity('vrg_e'), entity('vrg_f'), entity('vrg_g'), entity('vrg_h')]);
        let ha = play('revive', entity('vrg_a'), {});
        let hb = play('rage', entity('vrg_b'), {});
        await sleep(700);
        w.clearVariantState('vrg_a');
        check(!w.isEntityVariantLocked('vrg_a') && w.isEntityVariantLocked('vrg_b'), '单实体清理只释放自身锁');
        eq(doc.querySelectorAll('#vrg_a-sprite [data-arcane-variant-persist]').length, 0, '单实体清理移除其常驻层');
        if (ha) ha.cancel();
        w.clearVariantState('vrg_b');
        if (hb) hb.cancel();

        const hc = play('molt', entity('vrg_c'), {});
        await sleep(180);
        check(w.isEntityVariantLocked('vrg_c'), '删DOM前蜕皮尚在播放且锁已持有');
        const cDom = doc.getElementById('vrg_c-sprite');
        cDom.remove();
        let threw = null;
        try { w.clearVariantState('vrg_c'); } catch (e) { threw = e; }
        check(!threw, 'DOM 已移除时按 id 清理不抛异常');
        check(!w.isEntityVariantLocked('vrg_c'), 'DOM 已移除仍能释放计数锁');
        if (hc) hc.cancel();

        play('rage', entity('vrg_d'), {});
        play('molt', entity('vrg_e'), {});
        await sleep(1400);
        w.clearVariantState();
        check(!w.isEntityVariantLocked('vrg_d') && !w.isEntityVariantLocked('vrg_e'), '无参全局清理释放全部锁');
        eq(doc.querySelectorAll('[data-arcane-variant-persist]').length, 0, '无参全局清理移除全部常驻层');

        const hf = play('revive', entity('vrg_f'), {});
        await sleep(150);
        if (hf) hf.cancel();
        check(!w.isEntityVariantLocked('vrg_f'), 'handle.cancel 立即释放计数锁');
        eq(doc.querySelectorAll('#vrg_f-sprite [data-arcane-variant-persist]').length, 0, 'handle.cancel 清除常驻层');

        play('rage', entity('vrg_g'), {});
        await sleep(700);
        ev('clearArcaneFx()');
        check(!w.isEntityVariantLocked('vrg_g'), 'clearArcaneFx 联动释放变种锁');
        eq(doc.querySelectorAll('[data-arcane-variant-persist]').length, 0, 'clearArcaneFx 联动清除常驻层');

        play('rageExit', entity('vrg_h'), {});
        await sleep(1500);
        check(!w.isEntityVariantLocked('vrg_h'), '自然收尾释放计数锁（不依赖强制清理）');
        eq(doc.querySelectorAll('#vrg_h-sprite [data-arcane-variant-persist]').length, 0, '自然收尾无常驻层残留');
      });

      /* ========== 十二、命中反馈互斥 —— */
      await group('命中反馈互斥', async () => {
        install([entity('h_vrg0')], [entity('vrg_a'), entity('vrg_b')]);
        for (const trigger of ['revive', 'molt', 'rage', 'link']) {
          w.clearVariantState();
          const target = entity('vrg_a');
          install([entity('h_vrg0')], [target]);
          const dom = doc.getElementById('vrg_a-sprite');
          dom.classList.remove('arcane-hit-recoil', 'arcane-shake-light', 'arcane-shake-heavy', 'arcane-shake-quake');
          clearCalls();
          const h = play(trigger, target, {});
          const realFlash = originals.get('spawnHitFlash');
          if (realFlash) realFlash(dom, 0.6);
          w.playHitFeedback({ targetId:target.id,outcome:'hit',hpDmg:100,maxHp:1000,hpBefore:1000,hpAfter:900,shieldDmg:0,isHero:false }, {suppressShake:true});
          await sleep(80);
          check(!dom.classList.contains('arcane-hit-recoil') && dom.style.filter !== 'brightness(2.4) saturate(0)', trigger + ' 锁期间真实受击不叠闪白与recoil');
          check(doc.querySelectorAll('[data-arcane-fx]').length > 0, trigger + ' 锁期间伤害数字与演出层仍存在');
          await sleep(620);
          const recoil = dom.classList.contains('arcane-hit-recoil');
          const mechanisms = calls.flash.length + calls.shake.length + (recoil ? 1 : 0);
          check(mechanisms <= 1, trigger + ' 同拍只启用一种命中反馈（flash/recoil/shake 互斥）');
          if (h) h.cancel();
          w.clearVariantState();
          eq(dom.classList.contains('arcane-hit-recoil'), false, trigger + ' 清理后无 recoil 残留');
        }
        clearCalls();
      });

      /* ========== 十三、音效开关与冷解码契约 —— */
      await group('变种音效', async () => {
        install([entity('h_vrg0')], [entity('vrg_a')]);
        w.setVariantSfx(false);
        const h = play('rage', entity('vrg_a'), {});
        await sleep(100);
        check(isHandle(h), '关闭变种音效不影响演出本体');
        if (h) h.cancel();
        w.clearVariantState();
        w.setVariantSfx(true);
        if (source) {
          check(/sampled\s*:\s*true/.test(source), 'vSample 以 sampled:true 走真实采样');
          check(!/\)\s*\|\|\s*v(?:Tone|Crunch|Whoosh|Drone|Chime|Crystal)\s*\(/.test(source), '变种音效无合成 fallback');
          check(/maxDurSec/.test(source) && /fadeOutSec/.test(source), '冷解码回退使用真音裁窗参数');
          check(/variantSfxOn/.test(source), '变种音效独立开关与总开关分离');
        }
        const proto = w.AudioContext.prototype, createBuffer = proto.createBufferSource, decodeAudio = proto.decodeAudioData;
        const mediaProto = w.HTMLMediaElement.prototype, mediaPlay = mediaProto.play, mediaPause = mediaProto.pause;
        const played = [], stopped = [], buffers = [];
        proto.decodeAudioData = function () { return new Promise(() => {}); }; // 定住解码，检验本次真音回退而非解码完成补播。
        proto.createBufferSource = function (...args) {
          const node = createBuffer.apply(this, args), start = node.start.bind(node);
          node.start = (...values) => { buffers.push(values); return start(...values); };
          return node;
        };
        mediaProto.play = function (...args) { played.push(this); return mediaPlay.apply(this, args); };
        mediaProto.pause = function (...args) { stopped.push(this); return mediaPause.apply(this, args); };
        try {
          w.clearArcaneFx();
          const regen = play('regen', entity('vrg_a'), {});
          eq(played.length, 1, '冷解码再生仅起播一次真实 HTMLAudio 采样');
          w.setVariantSfx(false);
          check(stopped.includes(played[0]), 'setVariantSfx(false) 即停已在播的回退采样');
          const count = played.length;
          play('regen', entity('vrg_a'), {});
          eq(played.length, count, '变种音效关闭后不创建新采样');
          w.setVariantSfx(true);
          const rage = play('rage', entity('vrg_a'), {});
          await sleep(180);
          check(played.length === count + 1, '狂暴起手只有一条真实 taunt 采样，无合成回退');
          w.clearArcaneFx();
          const afterClear = played.length;
          await sleep(650);
          eq(played.length, afterClear, '全场清理后迟到阶段不补播音频');
          check(played.every(node => stopped.includes(node)), '全部在播回退节点纳入清理止音');
          eq(buffers.length, 0, '解码未完成时不重复启动 BufferSource');
          const mod = ev('arcaneVfxModule');
          mod.setIdentitySfx(false);
          play('regen', entity('vrg_a'), {});
          eq(played.length, afterClear, '身份音总开关同样抑制变种采样');
          mod.setIdentitySfx(true);
          w.clearArcaneFx();
        } finally {
          proto.createBufferSource = createBuffer; proto.decodeAudioData = decodeAudio;
          mediaProto.play = mediaPlay; mediaProto.pause = mediaPause;
          w.setVariantSfx(true); ev('arcaneVfxModule.setIdentitySfx(true)'); w.clearArcaneFx();
        }
      });

      check(!mock || typeof mock.genCount !== 'function' || mock.genCount() === gen0, '变种专项未调用外部 LLM');
      return { pending: [] };
    } finally {
      try { w.clearArcaneFx(); } catch (e) { /* 清理不掩盖断言 */ }
      try { w.clearVariantState(); } catch (e) { /* 同上 */ }
      for (const [name, fn] of originals) w[name] = fn;
      if (realPublish) w.CombatAudioDirector.publish = realPublish;
      w.Math.random = saved.random;
      w.__vrgRestore = saved;
      ev(`(() => { const s=window.__vrgRestore;
        heroesData=s.heroesData; enemiesData=s.enemiesData; battleHistory=s.battleHistory; _historyRawCache=s._historyRawCache;
        state.actionQueue=s.stateQueue; state.queueIndex=s.stateIndex; nonLethalSettings.enabled=s.nonLethal;
        CombatEvents.emit=s.emit; CombatEvents.emitAsync=s.emitAsync;
        state.isGameStarted=s.started;combatToken=s.token;_pipelineFrozen=s.frozen;fxEngine.particles=s.particles;fxEngine.hitStop=s.hitStop;
        for(const key of Object.keys(llmState)) delete llmState[key];Object.assign(llmState,s.llm);
        delete window.__vrgRestore;
      })()`);
      root.remove();
    }
  };
})();
