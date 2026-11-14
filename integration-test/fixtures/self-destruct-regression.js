/* 自爆回归（四 Demo 合入契约）：在真实 iframe 内挂载 index.html。
   业务组直接调用真实 triggerEnemySelfDestruct / doEnemySelfDestruct / executeSkillAction /
   applyBarrierHit / resolveNonLethalLethal / runResetPipeline，不复制战斗实现；
   演出组只调用约定公开接口 setSelfDestructWarning / clearSelfDestructWarning /
   clearSelfDestructState / setSelfDestructSfx / playSelfDestructWindup /
   playSelfDestructBurst / playSelfDestructInterrupt / playSelfDestructAttackWave。
   接口尚未合入时返回 { pending }，由 harness 汇总为待对齐，不计为断言失败。
   业务组压缩旧 sleep；真实演出组恢复原生 timer 并关闭自爆音效。 */
(function () {
  'use strict';
  window.runSelfDestructRegression = async function ({ w, check, eq, mock, source }) {
    const ev = code => w.eval(code);
    const doc = w.document;
    const nativeSetTimeout = w.setTimeout;
    const nativeClearTimeout = w.clearTimeout;
    const sleepReal = ms => new Promise(resolve => nativeSetTimeout.call(w, resolve, ms));
    const group = async (name, fn) => {
      try { await fn(); }
      catch (e) { check(false, name + '执行异常', String((e && e.stack) || e)); }
    };
    const pending = [];
    const api = ['setSelfDestructWarning', 'clearSelfDestructWarning', 'clearSelfDestructState', 'setSelfDestructSfx',
      'playSelfDestructWindup', 'playSelfDestructBurst', 'playSelfDestructInterrupt'];
    const missing = api.filter(name => ev('typeof ' + name) !== 'function');
    const hasFx = missing.length === 0;
    if (!hasFx) pending.push(...missing.map(name => name + '（接口未落地）'));
    const hasWave = ev('typeof playSelfDestructAttackWave') === 'function';
    if (!hasWave) pending.push('playSelfDestructAttackWave（prepareOnly/真实 prepared 动态验证待接口合入）');

    // —— 状态快照：全部按引用/值在 finally 原样恢复 ——
    const saved = ev(`({ heroesData, enemiesData, initialHeroesCache, initialEnemiesCache, battleHistory, _historyRawCache,
      stateQueue: state.actionQueue.slice(), stateIndex: state.queueIndex, nonLethal: nonLethalSettings.enabled,
      random: Math.random, emit: CombatEvents.emit, emitAsync: CombatEvents.emitAsync, llm: {...llmState},
      started: state.isGameStarted, token: combatToken, frozen: _pipelineFrozen,
      particles: fxEngine.particles.slice(), hitStop: fxEngine.hitStop,
      chain: selfDestructChain, count: selfDestructCount,
      barrier: teamBarrier, barrierMax: teamBarrierMax, barrierName: teamBarrierName,
      barrierArmor, barrierSub, barrierStandIn, barrierAoEActive, barrierAoELeak,
      kanpoFilter: defendSettings.kanpoFilterEnabled, kanpoThreshold: defendSettings.kanpoFilterThreshold,
      resolveKanpo: window.resolveKanpo, resolveReaction: window.resolveReaction,
      stateRound: state.round, stateCurrentRound: state.currentRound, stateAnimating: state.isAnimating,
      stateTargeting: state.isTargeting, statePending: state.pendingAction,
      highTier: state.highTierNarrated ? [...state.highTierNarrated] : null,
      pendingSummons, subdueVictory: _subdueVictory, isSaving: window._isSaving })`);
    const CE = ev('CombatEvents');
    const originals = new Map();
    const replace = (name, fn) => {
      if (!originals.has(name)) originals.set(name, w[name]);
      w[name] = fn;
    };
    const calls = { sounds: [], hist: [], floats: [], flash: [], shake: [], hitFeedback: [] };
    const clearCalls = () => Object.keys(calls).forEach(key => { calls[key].length = 0; });
    replace('addHistory', msg => calls.hist.push(String(msg)));
    replace('showLog', () => {});
    replace('createFloatingText', (dom, text, color, burst) => calls.floats.push(String(text)));
    replace('updateBuffUI', () => {});
    replace('updateHeroUI', hero => {});
    replace('renderTurnQueue', () => {});
    replace('checkWoundedNarration', () => {});
    replace('triggerEnemyDeathSpeak', () => {});
    replace('tryTriggerEnemyLowHpSpeak', () => {});
    replace('tryTriggerEnemyMolt', () => {});
    replace('tryTriggerEnemyRage', () => {});
    replace('tryTriggerEnemyLink', () => {});
    replace('playSound', (key, ...rest) => calls.sounds.push({ key, opts: rest[2] || null }));
    replace('playSVGEffect', () => {});
    replace('playArcaneSkillFx', () => {
      const onFinish = new Set();
      const handle = { doneAt: Date.now() + 10, cancel() {}, onFinish, done: new Promise(resolve => onFinish.add(resolve)) };
      Promise.resolve().then(() => onFinish.forEach(fn => fn(true)));
      return handle;
    });
    replace('playEnemyFlinchAnim', () => {});
    replace('playHitFeedback', result => calls.hitFeedback.push(result));
    replace('spawnExplosionParticles', () => {});
    replace('spawnHitFlash', (dom, intensity) => calls.flash.push({ id: dom && dom.id, intensity }));
    replace('triggerScreenShake', (intensity, duration) => calls.shake.push({ intensity, duration }));
    replace('updateTeamBarrierUI', () => {});
    replace('playKanpoEffect', async () => {});
    replace('triggerKanpoNarration', async () => {});
    replace('promptReaction', async () => null);
    CE.emit = () => {};
    CE.emitAsync = async () => {};
    w.Math.random = () => 0.5;
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;

    // —— 独立 DOM：hero-card-inner 无 portrait；enemy-sprite 带缩放 ——
    const root = doc.createElement('div');
    root.id = 'selfdestruct-regression-stage';
    root.style.cssText = 'position:fixed;left:24px;top:200px;width:760px;height:420px;pointer-events:none;';
    const heroCard = (id, left, top) => `<div id="hero-card-${id}" class="hero-card-inner" style="position:absolute;left:${left}px;top:${top}px;width:120px;height:88px;background:#1e293b;border:1px solid #38bdf8;">${id}</div>`;
    const enemySprite = (id, left, top) => `<div id="enemy-box-${id}" style="position:absolute;left:${left}px;top:${top}px;width:104px;height:120px;">`
      + `<div id="${id}-sprite" class="enemy-sprite breathe" style="position:absolute;left:0;top:0;width:104px;height:104px;background:#3b0764;border:1px solid #a855f7;transform:scale(0.72);transform-origin:center;">${id}</div>`
      + `<div id="${id}-hp-bar" style="position:absolute;left:0;top:108px;width:104px;height:6px;background:#22c55e;"></div></div>`;
    // 优先复用真实页面已有的 battle-scene / 屏障节点；仅在缺失时建同名兜底，避免 shadow 重复 id。
    const existingScene = doc.getElementById('battle-scene');
    const existingBarrier = doc.getElementById('team-barrier-dome') || doc.getElementById('team-barrier-wrapper');
    const createdScene = !existingScene, createdBarrier = !existingBarrier;
    if (createdScene) root.insertAdjacentHTML('beforeend', '<div id="battle-scene" style="position:absolute;inset:0;"></div>');
    if (createdBarrier) root.insertAdjacentHTML('beforeend', '<div id="team-barrier-dome" style="position:absolute;left:20px;top:20px;width:700px;height:380px;border-radius:50%;background:rgba(34,211,238,0.08);"></div>');
    doc.body.appendChild(root);
    const sceneDom = doc.getElementById('battle-scene');
    const barrierDom = doc.getElementById('team-barrier-dome') || doc.getElementById('team-barrier-wrapper');
    const savedDom = {
      sceneClass: sceneDom ? sceneDom.getAttribute('class') : null,
      barrierClass: barrierDom ? barrierDom.getAttribute('class') : null,
      barrierStyle: barrierDom ? barrierDom.getAttribute('style') : null
    };
    const spriteOf = id => doc.getElementById(id + '-sprite');
    const warnSelector = '.arcane-selfdestruct-warn,[data-arcane-selfdestruct-warning],[data-selfdestruct-warning]';
    const stageSelector = '.arcane-selfdestruct-stage,[data-selfdestruct-stage]';
    const warnCount = () => doc.querySelectorAll(warnSelector).length;
    const warnIn = id => {
      const dom = spriteOf(id);
      if (!dom) return 0;
      const own = dom.querySelectorAll(warnSelector).length;
      if (own) return own;
      return dom.parentElement ? dom.parentElement.querySelectorAll(warnSelector).length : 0;
    };
    const stageCount = () => doc.querySelectorAll(stageSelector).length;
    const ensureDom = (heroes, enemies) => {
      doc.querySelectorAll(warnSelector + ',' + stageSelector).forEach(node => node.remove());
      heroes.forEach((h, i) => {
        if (String(h.id).includes('nodom')) return;
        let card = doc.getElementById('hero-card-' + h.id);
        if (!card) {
          root.insertAdjacentHTML('beforeend', heroCard(h.id, 8, 8 + (i % 6) * 64));
        } else {
          card.style.visibility = ''; card.style.display = '';
        }
      });
      enemies.forEach((e, i) => {
        let sprite = doc.getElementById(e.id + '-sprite');
        if (!sprite) {
          root.insertAdjacentHTML('beforeend', enemySprite(e.id, 300 + (i % 3) * 130, 8 + Math.floor(i / 3) * 124));
          sprite = doc.getElementById(e.id + '-sprite');
        }
        if (sprite) {
          sprite.style.visibility = ''; sprite.style.display = '';
          sprite.classList.remove('opacity-0', 'scale-50', 'enemy-omen', 'arcane-selfdestruct-sprite-subdued');
          sprite.classList.add('breathe');
        }
        const box = doc.getElementById('enemy-box-' + e.id);
        if (box) {
          box.classList.remove('arcane-selfdestruct-host-corpse');
          box.style.visibility = ''; box.style.display = '';
        }
        const bar = doc.getElementById(e.id + '-hp-bar');
        if (bar) bar.style.display = '';
      });
    };
    const hero = (id, extra) => Object.assign({
      id, name: id, hp: 600, maxHp: 600, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 50, def: 0, spd: 1, hit: 0, eva: 0, taunt: 1, shield: 0, actCount: 1,
      isAlive: true, buffs: [], skills: [], items: [], tags: [], classType: null,
      isSummon: false, row: 'front'
    }, extra);
    const enemy = (id, extra) => Object.assign({
      id, name: '自爆' + id, hp: 1000, maxHp: 1000, mp: 10, maxMp: 10, tp: 0, maxTp: 100,
      atk: 100, def: 0, spd: 50, hit: 0, eva: 0, taunt: 1, shield: 0, actCount: 1,
      isAlive: true, buffs: [], skills: [], items: [], tags: [], classType: null,
      isSummon: false, row: 'front', currentCharge: 0
    }, extra);
    const deadBomber = (id, form, power) => enemy(id, {
      hp: 0, isAlive: false, explode: { type: form, power },
      tags: ['[自爆:' + form + ';power:' + power + ']']
    });
    const install = (heroes, enemies) => {
      ensureDom(heroes, enemies);
      ev('heroesData=' + JSON.stringify(heroes) + ';enemiesData=' + JSON.stringify(enemies)
        + ';battleHistory=[];_historyRawCache="";teamBarrier=0;teamBarrierMax=0;barrierArmor=0;barrierSub=null;'
        + 'barrierStandIn=null;barrierAoEActive=false;barrierAoELeak=null;state.actionQueue=[];state.queueIndex=0;');
      return { h: ev('heroesData'), e: ev('enemiesData') };
    };

    // —— 业务组：压缩旧 sleep ——
    const timerIds = new Set();
    const installFakeTimers = () => {
      w.setTimeout = (fn, ms, ...args) => {
        const id = {};
        timerIds.add(id);
        Promise.resolve().then(() => { if (timerIds.delete(id)) fn(...args); });
        return id;
      };
      w.clearTimeout = id => { timerIds.delete(id); };
    };
    const restoreTimers = () => {
      timerIds.clear();
      w.setTimeout = nativeSetTimeout;
      w.clearTimeout = nativeClearTimeout;
    };
    const waitHandle = (handle, ms) => handle && handle.done
      ? Promise.race([handle.done, sleepReal(ms)])
      : sleepReal(ms);
    const boomSkills = {};
    const captureBoomSkill = async (form, power) => {
      let captured = null;
      const real = w.executeSkillAction;
      w.executeSkillAction = async (caster, target, skill) => { captured = skill; };
      try {
        const d = install([hero('h_sd0')], [deadBomber('sd_cap', form, power)]);
        w.triggerEnemySelfDestruct(d.e[0]);
        await ev('selfDestructChain');
      } finally { w.executeSkillAction = real; }
      return captured ? freshSkill(captured) : null;
    };
    const freshSkill = skill => {
      const copy = Object.assign({}, skill);
      // 清除仅属于原动作的临时句柄/上下文：尤其 _selfDestructWindup 已被原 do 的 finally 取消，
      // 若随动作复制，wave 会读到已取消的 burstReady=null 并提前 return，造成“结算为0”的夹具污染。
      delete copy._bdg; delete copy._hitWave; delete copy._identityHandles;
      delete copy._impactAudioWave; delete copy._audioActionId; delete copy._fxPlayed;
      delete copy._selfDestructWindup; delete copy._arcaneFx; delete copy._strafeBurstStart;
      delete copy._frontOnlyLogged; delete copy._rowPenaltyLogged; delete copy._reactionHandles;
      return copy;
    };

    try {
      ev('combatToken={};_pipelineFrozen=false;nonLethalSettings.enabled=false;defendSettings.kanpoFilterEnabled=true;defendSettings.kanpoFilterThreshold=100;llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;state.isGameStarted=false;');
      if (hasFx) {
        try { w.clearSelfDestructState(); } catch (e) { /* 初始清理不掩盖断言 */ }
        try { w.setSelfDestructSfx(false); } catch (e) { /* 同上 */ }
      }
      installFakeTimers();

      /* ========== 一、真实主链：预警一次 / 看破过滤 / boom 技能 / 反击禁用 ========== */
      await group('主链契约', async () => {
        const kanpoSkill = w.parseSkill('【回归看破】[看破:法术][MP:0][法术]');
        const realExec = w.executeSkillAction;
        const realPrompt = w.promptKanpo;
        try {
          let captured = null, execCalls = 0, promptCalls = 0;
          w.executeSkillAction = async (caster, target, skill) => { captured = skill; execCalls++; };
          w.promptKanpo = async () => { promptCalls++; return null; };
          const d = install([hero('h_sd0', { spd: 1, skills: [kanpoSkill] })], [deadBomber('sd_e0', '群伤', 70)]);
          clearCalls();
          w.triggerEnemySelfDestruct(d.e[0]);
          await ev('selfDestructChain');
          eq(execCalls, 1, '真实 doEnemySelfDestruct 调用一次 executeSkillAction');
          eq(promptCalls, 0, '威力 ≤ 看破阈值时过滤看破，不弹窗');
          const preSounds = calls.sounds.filter(s => s.key === 'monsterAttack');
          eq(preSounds.length, 1, '真实主链只播一次 monsterAttack 预警音');
          eq(preSounds[0] && preSounds[0].opts && preSounds[0].opts.category, 'L', 'monsterAttack 保持 skill/L 分类');
          check(!!captured, '捕获真实自爆技能对象');
          if (captured) {
            eq([captured.isSelfDestruct, captured.skipKanpoWindow, captured.hit, captured.cost, captured.hpCost, captured.tpCost, captured.turns],
              [true, true, 100, 0, 0, 0, 3], '自爆技能保持零消耗/必中/3回合');
            eq([captured.name, captured.type, captured.power], ['自爆·群伤', '[群攻]', 70], '自爆技能名/类型/威力来自 explode');
          }
          check(calls.hist.some(t => t.includes('绝命反扑前兆')), '真实战报保留绝命反扑前兆');
          check(calls.hist.some(t => t.includes('剧烈冲击波')), '群伤按形态输出真实战报');
          check(!d.e[0].isSubdued, '存活对手未被误制服');

          // 高于阈值 + 选中看破：完全无效化，不进入爆炸
          promptCalls = 0; execCalls = 0; captured = null;
          const d2 = install([hero('h_sd0', { spd: 1, skills: [kanpoSkill] })], [deadBomber('sd_e1', '群伤', 150)]);
          w.promptKanpo = async candidates => { promptCalls++; return { hero: candidates[0].hero, skill: candidates[0].skill }; };
          clearCalls();
          w.triggerEnemySelfDestruct(d2.e[0]);
          await ev('selfDestructChain');
          eq(promptCalls, 1, '威力高于阈值时进入真实看破弹窗候选');
          eq(execCalls, 0, '看破成功时不进入爆炸结算');
          check(calls.hist.some(t => t.includes('被看破破局')), '看破成功写入完全无效化战报');
          check(!calls.hist.some(t => t.includes('剧烈冲击波')), '看破成功无爆炸战报');

          // 高于阈值但放弃看破：照常爆炸
          promptCalls = 0; execCalls = 0;
          w.promptKanpo = async () => { promptCalls++; return null; };
          const d3 = install([hero('h_sd0', { spd: 1, skills: [kanpoSkill] })], [deadBomber('sd_e2', '群伤', 150)]);
          w.triggerEnemySelfDestruct(d3.e[0]);
          await ev('selfDestructChain');
          eq([promptCalls, execCalls], [1, 1], '放弃看破后仍按原管线爆炸');
        } finally {
          w.executeSkillAction = realExec;
          w.promptKanpo = realPrompt;
        }

        // 被制服单位不排队
        const d4 = install([hero('h_sd0')], [deadBomber('sd_e3', '群伤', 70)]);
        d4.e[0].isSubdued = true;
        const count0 = ev('selfDestructCount');
        w.triggerEnemySelfDestruct(d4.e[0]);
        eq(ev('selfDestructCount'), count0, '被制服单位不排队自爆');

        if (source) {
          check((source.match(/isSelfDestruct/g) || []).length >= 2, '源码保留自爆不可反击守卫');
          const waitAt = source.indexOf('while (selfDestructCount > 0)');
          const cutAt = source.indexOf('await playExecutionAnimation(caster, _pendingKills');
          check(waitAt > 0 && cutAt > waitAt, '击杀特写排在自爆链汇合点之后');
        }
      });

      /* ========== 二、敏捷对抗：成功制服 / 失败放行 / 复活优先 / 非自爆 ========== */
      await group('敏捷对抗与制服', async () => {
        ev('nonLethalSettings.enabled=true;');
        const interceptor = hero('h_sd0', { spd: 100, name: '拦截者' });
        let d = install([interceptor], [enemy('sd_e0', { hp: 100, maxHp: 100, spd: 1, explode: { type: '群伤', power: 60 } })]);
        let t = d.e[0], i = d.h[0];
        clearCalls();
        let out = w.resolveNonLethalLethal(t, 999, i);
        eq([out, t.hp, !!t.isSubdued, !!t._sdContestFailed], [99, 100, true, false], '敏捷对抗成功：钳制 1HP 并制服');
        check(calls.hist.some(x => x.includes('按住')), '成功阻止写入真实战报');

        d = install([hero('h_sd0', { spd: 1 })], [enemy('sd_e0', { hp: 100, maxHp: 100, spd: 200, explode: { type: '群伤', power: 60 } })]);
        t = d.e[0]; i = d.h[0];
        clearCalls();
        out = w.resolveNonLethalLethal(t, 999, i);
        eq([out, t.hp, !!t.isSubdued, t._sdContestFailed], [999, 100, false, true], '敏捷对抗失败：不钳制并标记放行真实死亡');
        check(calls.hist.some(x => x.includes('未能')), '失败写入未能阻止战报');

        d = install([hero('h_sd0', { spd: 1 })], [enemy('sd_e0', { hp: 100, maxHp: 100, spd: 200, reviveCount: 1, explode: { type: '群伤', power: 60 } })]);
        t = d.e[0]; i = d.h[0];
        eq(w.resolveNonLethalLethal(t, 999, i), 999, '带复活次数时不钳制，优先走复活');
        check(!t.isSubdued && !t._sdContestFailed, '复活优先路径不制服也不置对抗失败标记');

        d = install([hero('h_sd0', { spd: 1 })], [enemy('sd_e0', { hp: 100, maxHp: 100, spd: 200 })]);
        t = d.e[0]; i = d.h[0];
        eq([w.resolveNonLethalLethal(t, 999, i), !!t.isSubdued], [99, true], '非自爆敌人维持无条件制服');

        ev('nonLethalSettings.enabled=false;');
        eq(w.resolveNonLethalLethal(t, 999, i), 999, '非致命关闭时不钳制任何伤害');
      });

      /* ========== 三、纯状态：免疫与闪避真实生效，群火/群毒零直伤 ========== */
      await group('纯状态免疫与闪避', async () => {
        ev('nonLethalSettings.enabled=false;');
        const fireSkill = await captureBoomSkill('群火', 60);
        boomSkills.fire = fireSkill;
        check(!!fireSkill && fireSkill.type === '[群燃烧]', '捕获真实群火自爆技能（[群燃烧]）');
        let d = install([
          hero('h_sd0', { spd: 1 }),
          hero('h_sd1', { spd: 200 }),
          hero('h_sd2', { spd: 1, immuneBurn: true }),
          hero('h_sd_nodom', { spd: 1 })
        ], [deadBomber('sd_fire', '群火', 60)]);
        if (fireSkill) {
          await w.executeSkillAction(d.e[0], null, fireSkill, 1);
          eq(d.h.map(h => h.hp), [600, 600, 600, 600], '群火纯状态不造成直接伤害');
          check(d.h[0].buffs.some(b => b.type === 'burn'), '群火命中者真实获得燃烧');
          check(!d.h[1].buffs.some(b => b.type === 'burn'), '群火被闪避者连状态也不中');
          check(!d.h[2].buffs.some(b => b.type === 'burn'), '防火者免疫燃烧');
          check(d.h[3].buffs.some(b => b.type === 'burn'), '无 DOM 目标数值仍按原管线施加燃烧');
        }

        const poisonSkill = await captureBoomSkill('群毒', 60);
        boomSkills.poison = poisonSkill;
        check(!!poisonSkill && poisonSkill.type === '[群中毒]', '捕获真实群毒自爆技能（[群中毒]）');
        d = install([
          hero('h_sd0', { spd: 1 }),
          hero('h_sd1', { spd: 200 }),
          hero('h_sd2', { spd: 1, immunePoison: true })
        ], [deadBomber('sd_poison', '群毒', 60)]);
        if (poisonSkill) {
          await w.executeSkillAction(d.e[0], null, poisonSkill, 1);
          eq(d.h.map(h => h.hp), [600, 600, 600], '群毒纯状态不造成直接伤害');
          check(d.h[0].buffs.some(b => b.type === 'poison'), '群毒命中者真实获得中毒');
          check(!d.h[1].buffs.some(b => b.type === 'poison'), '群毒被闪避者连状态也不中');
          check(!d.h[2].buffs.some(b => b.type === 'poison'), '耐毒者免疫中毒');
        }

        const slashSkill = await captureBoomSkill('群伤', 70);
        boomSkills.slash = slashSkill;
        d = install([hero('h_sd0', { spd: 1 }), hero('h_sd1', { spd: 200 })], [deadBomber('sd_slash', '群伤', 70)]);
        if (slashSkill) {
          await w.executeSkillAction(d.e[0], null, slashSkill, 1);
          check(d.h[0].hp < 600, '群伤命中者真实掉血');
          eq(d.h[1].hp, 600, '群伤闪避者不掉血');
        }
      });

      /* ========== 四、屏障：伤害归集屏障，护甲全挡不耗耐久 ========== */
      await group('屏障吸收', async () => {
        const slashSkill = await captureBoomSkill('群伤', 70);
        if (!slashSkill) { check(false, '未能捕获群伤自爆技能'); return; }
        let d = install([hero('h_sd0', { spd: 1 }), hero('h_sd1', { spd: 1 })], [deadBomber('sd_bar', '群伤', 70)]);
        ev('teamBarrier=99999;teamBarrierMax=99999;barrierArmor=0;barrierSub=null;');
        const before = ev('teamBarrier');
        await w.executeSkillAction(d.e[0], null, freshSkill(slashSkill), 1);
        check(ev('teamBarrier') < before, '自爆群伤被屏障吸收，耐久真实下降');
        eq(d.h.map(h => h.hp), [600, 600], '屏障全挡时我方不掉血');

        d = install([hero('h_sd0', { spd: 1 }), hero('h_sd1', { spd: 1 })], [deadBomber('sd_bar2', '群伤', 70)]);
        ev('teamBarrier=99999;teamBarrierMax=99999;barrierArmor=500;barrierSub=null;');
        await w.executeSkillAction(d.e[0], null, freshSkill(slashSkill), 1);
        eq(ev('teamBarrier'), 99999, '屏障护甲全挡时耐久不掉');
        check(d.h.every(h => h.hp === 600), '护甲全挡时我方不掉血');
      });

      /* ========== 五、双尸串行：同一时刻仅一个任务，计数到尾才归零 ========== */
      await group('双尸串行', async () => {
        const realDo = w.doEnemySelfDestruct;
        let active = 0, maxActive = 0;
        const order = [];
        w.doEnemySelfDestruct = async entity => {
          active++; maxActive = Math.max(maxActive, active); order.push('start:' + entity.id);
          try { return await realDo(entity); }
          finally { active--; order.push('end:' + entity.id); }
        };
        try {
          const d = install([hero('h_sd0')], [deadBomber('sd_e0', '群伤', 50), deadBomber('sd_e1', '群伤', 50)]);
          w.triggerEnemySelfDestruct(d.e[0]);
          w.triggerEnemySelfDestruct(d.e[1]);
          eq(ev('selfDestructCount'), 2, '两具尸体同时排队时任务计数为 2');
          await ev('selfDestructChain');
          eq(order, ['start:sd_e0', 'end:sd_e0', 'start:sd_e1', 'end:sd_e1'], '多具尸体严格串行，不并发交错');
          eq(maxActive, 1, '同一时刻最多一个自爆任务');
          eq(ev('selfDestructCount'), 0, '链尾全部完成后计数归零');
        } finally { w.doEnemySelfDestruct = realDo; }
      });

      /* ========== 六、重置：清计数/换代/清对抗标记，过期任务不再扣数 ========== */
      await group('重置', async () => {
        check(typeof w.runResetPipeline === 'function', '真实重置管线存在');
        if (typeof w.runResetPipeline !== 'function') return;
        const savedInitUI = w.initUI, savedBarrierUI = w.updateTeamBarrierUI;
        w.initUI = () => {};
        w.updateTeamBarrierUI = () => {};
        const realDo = w.doEnemySelfDestruct;
        let release = null;
        const gate = new Promise(resolve => { release = resolve; });
        w.doEnemySelfDestruct = () => gate;
        try {
          ev('initialHeroesCache=' + JSON.stringify([hero('h_sd0')])
            + ';initialEnemiesCache=' + JSON.stringify([enemy('sd_e0', { _sdContestFailed: true })]) + ';');
          const d = install([hero('h_sd0')], [deadBomber('sd_reset', '群伤', 50)]);
          w.triggerEnemySelfDestruct(d.e[0]);
          await Promise.resolve(); await Promise.resolve();
          eq(ev('selfDestructCount'), 1, '重置前存在在途自爆任务');
          const oldToken = ev('combatToken');
          w.runResetPipeline();
          eq([ev('selfDestructCount'), ev('_pipelineFrozen')], [0, true], '重置立即清空自爆计数并冻结管线');
          check(ev('combatToken') !== oldToken, '重置更换代际令牌');
          eq(ev('enemiesData.length'), 1, '重置从开场缓存还原敌人');
          check(ev('!("_sdContestFailed" in enemiesData[0])'), '重置清除自爆敏捷对抗标记');
          check(ev('enemiesData[0].currentDelay === null && enemiesData[0].currentCharge === 0'), '重置清零蓄力字段');
          await Promise.race([ev('selfDestructChain'), sleepReal(50)]);
          release();
          await sleepReal(30);
          eq(ev('selfDestructCount'), 0, '过期自爆任务苏醒后不再扣减/复活计数');
        } finally {
          w.doEnemySelfDestruct = realDo;
          w.initUI = savedInitUI;
          w.updateTeamBarrierUI = savedBarrierUI;
          ev('_pipelineFrozen=false;');
        }
      });

      restoreTimers();

      /* ========== 七、存活预警（接口未合入时整体待对齐） ========== */
      if (hasFx) {
        /* ========== 七B、真实主链数值（非 mock，真实 timer）：do→execute→wave→numeric ========== */
        await group('真实主链数值', async () => {
          const d = install([hero('h_sd0', { spd: 1 })], [deadBomber('sd_real', '群火', 60)]);
          const realPrepare = w.prepareSingleAttackHit, realApply = w.applySingleTagEffect;
          let prepareCalls = 0, prepareOnly = 0, reused = 0;
          const preparedById = new Map();
          w.prepareSingleAttackHit = async function (...args) {
            prepareCalls++;
            return realPrepare.apply(this, args);
          };
          w.applySingleTagEffect = async function (...args) {
            const target = args[1], ctx = args[10];
            if (ctx && ctx.prepareOnly) {
              prepareOnly++;
              const out = await realApply.apply(this, args);
              if (target) preparedById.set(target.id, out);
              return out;
            }
            if (ctx && ctx.prepared && target && preparedById.get(target.id) === ctx.prepared) reused++;
            return realApply.apply(this, args);
          };
          try {
            w.setSelfDestructSfx(false);
            clearCalls();
            w.triggerEnemySelfDestruct(d.e[0]);
            await ev('selfDestructChain');
          } finally {
            w.prepareSingleAttackHit = realPrepare;
            w.applySingleTagEffect = realApply;
            w.clearSelfDestructState();
          }
          eq([prepareCalls, prepareOnly, reused], [1, 1, 1], '真实 do→execute 仅一次 prepare，并复用真实 prepared');
          eq(d.h[0].hp, 600, '真实主链群火仍为纯状态，不造成直接伤害（非早返）');
          check(d.h[0].buffs.some(b => b.type === 'burn'), '真实主链数值生效：命中者获得燃烧');
          check(calls.hist.some(t => t.includes('灼烧')), '真实主链写入群火爆炸战报');
        });

        await group('存活预警', async () => {
          w.clearArcaneFx();
          w.setSelfDestructSfx(false);
          const d = install([hero('h_sd0')], [
            enemy('sd_w0', { explode: { type: '群伤', power: 60 } }),
            enemy('sd_w1', { explode: { type: '群火', power: 60 } })
          ]);
          const [a, b] = d.e;
          const rec = w.setSelfDestructWarning(a, '群伤');
          check(!!rec, '存活自爆单位挂载预警');
          eq(warnIn('sd_w0'), 1, '预警层挂在真实 sprite 宿主上');
          w.setSelfDestructWarning(a, '群伤');
          eq(warnIn('sd_w0'), 1, '重复挂载不叠加预警层');
          w.setSelfDestructWarning(b, '群火');
          eq(warnCount(), 2, '多单位各自持有预警');
          w.clearSelfDestructWarning(a);
          eq([warnIn('sd_w0'), warnIn('sd_w1')], [0, 1], '单实体预警清理不影响其他单位');
          w.clearSelfDestructState(b.id);
          eq(warnCount(), 0, 'clearSelfDestructState 按实体清理预警');
          eq(w.setSelfDestructWarning({ id: 'sd_missing' }, '群伤'), null, '无 DOM 实体返回 null 不抛错');
          const sfxOff = w.setSelfDestructSfx(false);
          check(sfxOff !== true, '关闭自爆音效调用不反弹为开启');
          const sfxOn = w.setSelfDestructSfx(true);
          check(sfxOn !== false, '开启自爆音效调用不反弹为关闭');
          w.setSelfDestructSfx(false);

          const sprite = spriteOf('sd_w0');
          sprite.classList.add('arcane-selfdestruct-sprite-subdued');
          w.setSelfDestructWarning(a, '群伤');
          w.clearSelfDestructState();
          check(!sprite.classList.contains('arcane-selfdestruct-sprite-subdued') && warnCount() === 0,
            '全局清理移除压制类与全部预警');
        });

        /* ========== 八、三幕与等待看破 ========== */
        await group('三幕与等待看破', async () => {
          w.clearArcaneFx();
          w.setSelfDestructSfx(false);
          const windupMs = { unstable: 30, gather: 140, critical: 60 };
          let d = install([hero('h_sd0'), hero('h_sd1')], [enemy('sd_wind', { explode: { type: '群伤', power: 60 } })]);
          const e = d.e[0];
          w.setSelfDestructWarning(e, '群伤');
          const beats = [];
          const h = w.playSelfDestructWindup(e, { form: '群伤', windupMs }, (event, meta) => beats.push({ event, meta }));
          check(!!h, '三幕前摇返回真实句柄');
          if (!h) return;
          eq([typeof h.doneAt, typeof h.cancel, !!(h.onFinish && typeof h.onFinish.add === 'function'),
            !!(h.done && typeof h.done.then === 'function')],
            ['number', 'function', true, true], 'handle 暴露 doneAt/cancel/onFinish Set/done Promise');
          eq(warnCount(), 0, '前摇开始即清除存活预警');
          const ready = await Promise.race([h.ready, sleepReal(1500).then(() => 'timeout')]);
          eq(ready, true, '聚能窗 ready resolve true');
          check(beats.some(b => b.event === 'unstable_start') && beats.some(b => b.event === 'gather_start')
            && beats.some(b => b.event === 'gather_window'), 'onBeat 依次播报失稳/聚能/聚能窗口');
          let burstSettled = false;
          h.burstReady.then(() => { burstSettled = true; });
          await sleepReal(320);
          check(!beats.some(b => b.event === 'critical_start'), 'held 状态不自动进入临界');
          check(!burstSettled, 'held 状态 burstReady 不提前 resolve');
          h.release();
          const ctx = await Promise.race([h.burstReady, sleepReal(2500).then(() => null)]);
          check(!!ctx && !!ctx.r && ctx.r.w > 0 && ctx.r.h > 0, 'release 后 burstReady 交出真实 stageCtx');
          check(beats.some(b => b.event === 'critical_start') && beats.some(b => b.event === 'critical_snap')
            && beats.some(b => b.event === 'windup_ready'), 'release 播报临界/收束/就绪');

          const burstBeats = [];
          const bh = w.playSelfDestructBurst(e, [d.h[0], d.h[1]],
            { form: '群伤', outcomes: { h_sd0: 'hit', h_sd1: 'dodge' } },
            (event, meta) => burstBeats.push({ event, meta }), ctx);
          check(!!bh, 'burst 接受 stageCtx 继续演出');
          if (h.finish) h.finish();
          const finished = await Promise.race([h.done, sleepReal(1200).then(() => 'timeout')]);
          eq(finished, true, 'finish 交棒后 handle.done resolve true');
          if (bh) await waitHandle(bh, 2500);
          check(burstBeats.some(b => b.event === 'burst_start') && burstBeats.some(b => b.event === 'burst_end'),
            'burst 完整播报起止');
          eq(warnCount(), 0, '交棒后无存活预警残留');

          // 看破压灭
          d = install([hero('h_sd0')], [enemy('sd_kanpo', { explode: { type: '群伤' } })]);
          const kanpoBeats = [];
          const h2 = w.playSelfDestructWindup(d.e[0], { form: '群伤', windupMs }, (event, meta) => kanpoBeats.push({ event, meta }));
          if (h2) {
            await Promise.race([h2.ready, sleepReal(1500)]);
            eq(h2.interrupt('kanpo'), true, '看破打断返回 true');
            const done2 = await Promise.race([h2.done, sleepReal(1600).then(() => 'timeout')]);
            eq(done2, true, '看破压灭结束后 done resolve true');
            check(kanpoBeats.some(b => b.event === 'kanpo_suppressed'), '看破压灭播报 kanpo_suppressed');
            eq(h2.interrupt('kanpo'), false, '已结束句柄不可再次打断');
            const br = await Promise.race([h2.burstReady, sleepReal(200).then(() => 'pending')]);
            check(br !== 'pending' && !(br && br.r), '打断后不交出 stageCtx');
          }

          // 直接调用 playSelfDestructInterrupt（独立入口，不经 windup 句柄）
          d = install([hero('h_sd0')], [enemy('sd_direct', { explode: { type: '群伤' } })]);
          const directBeats = [];
          const hi = w.playSelfDestructInterrupt(d.e[0], 'kanpo', { form: '群伤' }, (event, meta) => directBeats.push({ event, meta }));
          check(!!hi && typeof hi.doneAt === 'number', 'playSelfDestructInterrupt 返回带 doneAt 的句柄');
          await waitHandle(hi, 1400);
          check(directBeats.some(b => b.event === 'kanpo_suppressed'), '直接看破压灭播报 kanpo_suppressed');

          // 制服按住
          d = install([hero('h_sd0')], [enemy('sd_subdue', { explode: { type: '群穿' } })]);
          const subduedBeats = [];
          const h3 = w.playSelfDestructWindup(d.e[0], { form: '群穿', windupMs }, (event, meta) => subduedBeats.push({ event, meta }));
          if (h3) {
            await Promise.race([h3.ready, sleepReal(1500)]);
            eq(h3.interrupt('subdued'), true, '制服按住返回 true');
            const done3 = await Promise.race([h3.done, sleepReal(1600).then(() => 'timeout')]);
            eq(done3, true, '制服按住结束后 done resolve true');
            check(subduedBeats.some(b => b.event === 'subdued_locked'), '制服按住播报 subdued_locked');
          }

          // cancel 与无 DOM 跳过
          d = install([hero('h_sd0')], [enemy('sd_cancel', { explode: { type: '群火' } })]);
          const h4 = w.playSelfDestructWindup(d.e[0], { form: '群火', windupMs }, () => {});
          if (h4) {
            await Promise.race([h4.ready, sleepReal(1500)]);
            h4.cancel();
            const done4 = await Promise.race([h4.done, sleepReal(1000).then(() => 'timeout')]);
            eq(done4, false, 'cancel 使 done resolve false');
            await sleepReal(80);
            eq(stageCount(), 0, 'cancel 清理尸体舞台');
          }
          eq(w.playSelfDestructWindup({ id: 'sd_nodom' }, { form: '群伤' }), null, '无 DOM 前摇返回 null');
          eq(w.playSelfDestructBurst({ id: 'sd_nodom' }, [], { form: '群伤' }), null, '无 DOM 爆炸返回 null');
        });

        /* ========== 九、四形态真实 outcomes ========== */
        await group('四形态真实outcomes', async () => {
          w.clearArcaneFx();
          w.setSelfDestructSfx(false);
          for (const [form, key] of [['群伤', 'aoe'], ['群穿', 'pierce']]) {
            w.clearArcaneFx();
            const d = install([hero('h_sd0', { spd: 1 }), hero('h_sd1', { spd: 200 })],
              [deadBomber('sd_' + key, form, 60)]);
            const beats = [];
            clearCalls();
            const h = w.playSelfDestructBurst(d.e[0], [d.h[0], d.h[1]],
              { form, outcomes: { h_sd0: 'hit', h_sd1: 'dodge' } },
              (event, meta) => beats.push({ event, meta }));
            check(!!h, form + '爆炸返回真实句柄');
            await waitHandle(h, 2500);
            check(beats.some(b => b.event === 'target_hit' && b.meta.target && b.meta.target.id === 'h_sd0'),
              form + '命中拍点指向真实命中者');
            check(beats.some(b => b.event === 'target_dodge' && b.meta.target && b.meta.target.id === 'h_sd1'),
              form + '闪避拍点指向真实闪避者');
            check(!beats.some(b => b.event === 'target_hit' && b.meta.target && b.meta.target.id === 'h_sd1'),
              form + '闪避者不产生命中拍点');
          }
          for (const [form, key, attach, immuneKey, decorSelector] of [
            ['群火', 'fire', '燃烧', 'immuneBurn', '.sd-bt-tongues'],
            ['群毒', 'poison', '中毒', 'immunePoison', '[style*="arcane-sd-venom-pulse"]']
          ]) {
            w.clearArcaneFx();
            const d = install([hero('h_sd0', { spd: 1 }), hero('h_sd1', { spd: 1, [immuneKey]: true })],
              [deadBomber('sd_' + key, form, 60)]);
            const beats = [];
            clearCalls();
            const h = w.playSelfDestructBurst(d.e[0], [d.h[0], d.h[1]],
              { form, outcomes: { h_sd0: 'hit', h_sd1: 'hit' } },
              (event, meta) => beats.push({ event, meta }));
            await sleepReal(560);
            eq(doc.querySelectorAll(decorSelector).length, 1, form + '仅命中者生成一次附着装饰，免疫者无装饰');
            await waitHandle(h, 2500);
            const attachBeats = beats.filter(b => b.event === 'target_attach');
            check(attachBeats.some(b => b.meta.target && b.meta.target.id === 'h_sd0' && b.meta.stateAttach === attach),
              form + '命中者播报状态附着');
            check(attachBeats.some(b => b.meta.target && b.meta.target.id === 'h_sd1' && b.meta.immune === true),
              form + '免疫者以 immune 标记跳过附着');
            check(!beats.some(b => b.event === 'target_hit'), form + '纯状态不产生直接命中');
            eq(calls.flash.length, 0, form + '不触发白闪');
            check(!calls.shake.some(s => s.intensity >= 6 || s.duration >= 400), form + '不触发重震屏');
          }
        });

        /* ========== 十、新 wave：prepareOnly / 真实 prepared 不二次随机 ========== */
        if (hasWave) {
          await group('新wave prepareOnly', async () => {
            const skill = boomSkills.fire ? freshSkill(boomSkills.fire) : null;
            if (!skill) { pending.push('群火 boom 技能未捕获，跳过 wave prepareOnly 验证'); return; }
            const d = install([hero('h_sd0', { spd: 1 }), hero('h_sd1', { spd: 1 })],
              [deadBomber('sd_wave', '群火', 60)]);
            const realPrepare = w.prepareSingleAttackHit, realApply = w.applySingleTagEffect;
            let prepareCalls = 0, reused = 0;
            const preparedById = new Map();
            w.prepareSingleAttackHit = async function (...args) {
              prepareCalls++;
              const out = await realPrepare.apply(this, args);
              const target = args[1];
              if (target) preparedById.set(target.id, out);
              return out;
            };
            w.applySingleTagEffect = async function (...args) {
              const target = args[1], ctx = args[10];
              if (ctx && ctx.prepareOnly) {
                const out = await realApply.apply(this, args);
                if (target) preparedById.set(target.id, out);
                return out;
              }
              if (ctx && ctx.prepared && target && preparedById.get(target.id) === ctx.prepared) reused++;
              return realApply.apply(this, args);
            };
            try {
              await w.playSelfDestructAttackWave(d.e[0], [d.h[0], d.h[1]], '[群燃烧]', 60, 100, 1, 3, skill);
              eq(prepareCalls, 2, '每目标只掷一次骰（prepareOnly），结算不二次随机');
              eq(reused, 2, '结算复用真实 prepared 对象');
              check(d.h.every(h => h.buffs.some(b => b.type === 'burn')), 'wave 仍经真实 applySingleTagEffect 施加状态');
            } finally {
              w.prepareSingleAttackHit = realPrepare;
              w.applySingleTagEffect = realApply;
            }
          });
        } else {
          // 无 wave 接口时由文件头 pending 统一登记
        }

        if (source && hasWave) {
          const defAt = source.indexOf('function playSelfDestructAttackWave');
          const body = defAt >= 0 ? source.slice(defAt, defAt + 10000) : '';
          check(defAt >= 0, '源码存在 playSelfDestructAttackWave');
          check(/prepareOnly/.test(body) && /prepared/.test(body), '新 wave 以 prepareOnly/真实 prepared 结算');
          check(/_selfDestructWindup/.test(source), 'wave 把 windup 句柄挂到 skill._selfDestructWindup');
        }
      }

      check(!mock || typeof mock.genCount !== 'function' || mock.genCount() === gen0, '自爆专项未调用外部 LLM');
      return { pending };
    } finally {
      try { restoreTimers(); } catch (e) { /* 恢复时钟不掩盖断言 */ }
      try { if (typeof w.clearSelfDestructState === 'function') w.clearSelfDestructState(); } catch (e) { /* 同上 */ }
      try { if (typeof w.clearArcaneFx === 'function') w.clearArcaneFx(); } catch (e) { /* 同上 */ }
      try { if (typeof w.setSelfDestructSfx === 'function') w.setSelfDestructSfx(true); } catch (e) { /* 同上 */ }
      for (const [name, fn] of originals) { try { w[name] = fn; } catch (e) { /* 同上 */ } }
      CE.emit = saved.emit; CE.emitAsync = saved.emitAsync;
      w.Math.random = saved.random;
      w.__sdRestore = saved;
      try {
        ev(`(() => { const s = window.__sdRestore;
          heroesData = s.heroesData; enemiesData = s.enemiesData;
          initialHeroesCache = s.initialHeroesCache; initialEnemiesCache = s.initialEnemiesCache;
          battleHistory = s.battleHistory; _historyRawCache = s._historyRawCache;
          state.actionQueue = s.stateQueue; state.queueIndex = s.stateIndex;
          nonLethalSettings.enabled = s.nonLethal; state.isGameStarted = s.started;
          combatToken = s.token; _pipelineFrozen = s.frozen;
          fxEngine.particles = s.particles; fxEngine.hitStop = s.hitStop;
          selfDestructChain = s.chain; selfDestructCount = s.count;
          teamBarrier = s.barrier; teamBarrierMax = s.barrierMax; teamBarrierName = s.barrierName;
          barrierArmor = s.barrierArmor; barrierSub = s.barrierSub; barrierStandIn = s.barrierStandIn;
          barrierAoEActive = s.barrierAoEActive; barrierAoELeak = s.barrierAoELeak;
          defendSettings.kanpoFilterEnabled = s.kanpoFilter; defendSettings.kanpoFilterThreshold = s.kanpoThreshold;
          window.resolveKanpo = s.resolveKanpo; window.resolveReaction = s.resolveReaction;
          state.round = s.stateRound; state.currentRound = s.stateCurrentRound;
          state.isAnimating = s.stateAnimating; state.isTargeting = s.stateTargeting; state.pendingAction = s.statePending;
          if (state.highTierNarrated && s.highTier) {
            state.highTierNarrated.clear();
            s.highTier.forEach(value => state.highTierNarrated.add(value));
          }
          pendingSummons = s.pendingSummons; _subdueVictory = s.subdueVictory; window._isSaving = s.isSaving;
          for (const key of Object.keys(llmState)) delete llmState[key];
          Object.assign(llmState, s.llm);
          delete window.__sdRestore;
        })()`);
      } catch (e) { /* 同上 */ }
      try {
        if (!createdScene && sceneDom && sceneDom.isConnected) {
          if (savedDom.sceneClass === null) sceneDom.removeAttribute('class'); else sceneDom.setAttribute('class', savedDom.sceneClass);
        }
        if (!createdBarrier && barrierDom && barrierDom.isConnected) {
          if (savedDom.barrierClass === null) barrierDom.removeAttribute('class'); else barrierDom.setAttribute('class', savedDom.barrierClass);
          if (savedDom.barrierStyle === null) barrierDom.removeAttribute('style'); else barrierDom.setAttribute('style', savedDom.barrierStyle);
          barrierDom.querySelectorAll('.barrier-hit-ripple,.barrier-hex-spotlight').forEach(node => node.remove());
        }
      } catch (e) { /* 同上 */ }
      root.remove();
    }
  };
})();
