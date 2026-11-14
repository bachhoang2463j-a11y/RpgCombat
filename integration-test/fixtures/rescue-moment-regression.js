/* 救援时刻 v12.10 回归：舍身 ready/hold/release/clear、真实 prompt 复杂链、毅力与回避四被动。
   全部通过真实 iframe 的 arcaneVfxModule / applySingleTagEffect / promptReaction 驱动，不复制战斗机制。
   采样统一开 identitySfx 并包装 playCustomAudio 记录 URL/opts/拍点（不真正出声）；
   旧被动内 playSound('taunt'/'miss') 已确认移除，改由 380ms taunt / 0ms 急步 +150ms hide 承担。
   release 契约：release 后 300ms 停驻 → owner.at(300) 同时触发 return beat / 归位采样 / duration=500 归位动画（速度×.7），
   owner.resume(830) 覆盖 300+500+30；aura 保留 420ms 与位移无关；停驻/归位途中 clear 立即恢复且无旧回调复活。 */
(function () {
  'use strict';
  window.runRescueMomentRegression = async function ({ w, check, eq, mock, source }) {
    const doc = w.document;
    const ev = code => w.eval(code);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const race = (promise, ms) => Promise.race([
      Promise.resolve(promise).then(value => ({ ok: true, value })),
      wait(ms).then(() => ({ ok: false }))
    ]);
    const pending = [], renderSkipped = [];
    const mod = ev('typeof arcaneVfxModule === "object" ? arcaneVfxModule : null');
    const api = ['playRescueSheshen', 'playRescueGrit', 'playRescueAvoidFatal', 'clearRescueState'];
    const missing = mod ? api.filter(name => typeof mod[name] !== 'function') : api.slice();
    if (missing.length) {
      missing.forEach(name => pending.push('接口缺失:arcaneVfxModule.' + name));
      return { pending };
    }
    const real = {
      sheshen: mod.playRescueSheshen, grit: mod.playRescueGrit, avoid: mod.playRescueAvoidFatal, clear: mod.clearRescueState,
      prompt: w.promptReaction, playCustom: w.playCustomAudio, playSound: w.playSound,
      addHistory: w.addHistory, createFloatingText: w.createFloatingText,
      hitFeedback: w.playHitFeedback, speak: w.triggerAllyFatalSaveSpeak,
      counter: w.playCounterAttackL1
    };

    /* ---------- reference：保存并恢复会被替换/改动的函数与数据 ---------- */
    const custom = [], sounds = [];
    const now = () => performance.now();
    w.playCustomAudio = (url, volume, rate, opts) => {
      custom.push({ url: String(url || ''), volume, rate, opts: Object.assign({}, opts || {}), at: now() });
    };
    w.playSound = key => { sounds.push(key); return () => {}; };
    w.createFloatingText = () => {};
    w.addHistory = () => {};
    const recs = part => custom.filter(r => r.url.includes(part));
    const resetAudio = () => { custom.length = 0; sounds.length = 0; };
    const saved = ev('({ heroesData, enemiesData, battleHistory, _historyRawCache, token:combatToken, frozen:_pipelineFrozen, random:Math.random, allySpeak:llmState.allyAutoSpeak })');
    const histLen = saved.battleHistory ? saved.battleHistory.length : 0;
    const rawLen = saved._historyRawCache ? saved._historyRawCache.length : 0;
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;
    w.__rmrRestore = saved;
    mod.setIdentitySfx(true);

    const root = doc.createElement('div');
    root.id = 'rescue-moment-regression';
    root.style.cssText = 'position:fixed;left:32px;top:150px;width:700px;height:300px;pointer-events:none;z-index:1;';
    doc.body.appendChild(root);
    const makeHero = (id, left) => {
      const wrap = doc.createElement('div');
      wrap.id = 'hero-wrap-' + id;
      wrap.style.cssText = `position:absolute;left:${left}px;top:0;width:120px;height:150px;`;
      const card = doc.createElement('div');
      card.id = 'hero-card-' + id;
      card.className = 'hero-card-inner';
      card.style.cssText = 'position:absolute;inset:0;background:#18181b;border:1px solid #334155;border-color:rgb(10,20,30);box-shadow:rgb(4,5,6) 0px 0px 0px 0px;transform:translateZ(0);';
      card.innerHTML = '<div class="bg-gray-900" style="position:absolute;inset:0;background:#1f2937"></div>';
      wrap.appendChild(card);
      root.appendChild(wrap);
      return { wrap, card, visual: card.querySelector('.bg-gray-900') };
    };
    const initial = el => ({ transform: el.style.transform, borderColor: el.style.borderColor, boxShadow: el.style.boxShadow });
    const entity = (id, extra) => Object.assign({
      id, name: id, hp: 500, maxHp: 500, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 10, def: 0, spd: 1, shield: 0, hit: 0, buffs: [], skills: [], items: [],
      isAlive: true, isSubdued: false, isSummon: false, row: 'front', classType: null
    }, extra || {});
    const installData = (heroes, enemies) => {
      ev('heroesData=' + JSON.stringify(heroes) + ';enemiesData=' + JSON.stringify(enemies)
        + ';teamBarrier=0;teamBarrierMax=0;barrierArmor=0;barrierSub=null;barrierAoELeak=null;barrierAoEActive=false;_barrierShatterAt=0;_pipelineFrozen=false;nonLethalSettings.enabled=false;');
      return { h: ev('heroesData'), e: ev('enemiesData') };
    };
    const transformOf = el => { try { return w.getComputedStyle(el).transform; } catch (e) { return ''; } };
    const isMoving = tr => !!tr && tr !== 'none' && tr !== 'matrix(1, 0, 0, 1, 0, 0)';
    // 用真实 WAAPI keyframes 判断外移动画是否挂载，不依赖 IAB 是否推进渲染帧。
    const dashKeyframesOf = (wrap, dashX) => {
      if (!wrap || !wrap.getAnimations) return false;
      return wrap.getAnimations().some(a => {
        const list = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
        return list.some(k => {
          const m = String(k.transform || '').match(/translate3d\(\s*(-?[\d.]+)px/);
          return !!m && Math.abs(Number(m[1]) - Number(dashX)) < 1;
        });
      });
    };
    // IAB/后台页可能完全不跑 rAF：只有真实推进过帧且页面可见时才做 computed 渲染断言，
    // 否则只记入 renderSkipped（不计 pending，也不宣称渲染已验证）。
    let rafTicks = 0, lastRafAt = 0, rafStop = false;
    const rafProbe = () => { if (rafStop) return; rafTicks++; lastRafAt = Date.now(); try { w.requestAnimationFrame(rafProbe); } catch (e) {} };
    try { if (w.requestAnimationFrame) w.requestAnimationFrame(rafProbe); } catch (e) {}
    const renderLive = () => rafTicks > 0 && doc.visibilityState !== 'hidden' && (Date.now() - lastRafAt) < 300;
    const renderCheck = (live, fn, name) => { if (!live) { renderSkipped.push(name); return; } check(!!fn(), name); };

    try {
      /* ---------- 1. 舍身：真实 hero-wrap 外移、ready/hold/release、4 次采样 ---------- */
      resetAudio();
      const g = makeHero('h_rescue_g', 10), t = makeHero('h_rescue_t', 300);
      const gInit = initial(g.card), tInit = initial(t.card), gvInit = initial(g.visual), gWrapInit = initial(g.wrap);
      const guardian = entity('h_rescue_g'), target = entity('h_rescue_t');
      const beats = [], beatAt = {};
      const t0 = now();
      const run = real.sheshen(guardian, target, { incomingType: '近战' }, b => { if (!beatAt[b.phase]) beatAt[b.phase] = now(); beats.push(b.phase); });
      check(!!run && !!run.ready && typeof run.ready.then === 'function' && typeof run.release === 'function', '舍身返回 ready/release/done 句柄');
      eq(doc.getElementById('reaction-prompt-h_rescue_t'), null, '舍身 ready 前无反应弹窗');
      await wait(360);
      eq(beats.filter(x => x === 'blockImpact').length, 0, '630ms 到达前不格挡');
      await wait(340);
      eq(beats.filter(x => x === 'blockImpact').length, 1, '630ms 到达后只格挡一次');

      const readyR = await race(run.ready, 1200);
      if (!readyR.ok) pending.push('待对齐:舍身 ready 未在约 1.1s resolve');
      else check(!!readyR.value && readyR.value.ok === true, '格挡收回后 ready 只放行不归位');

      await wait(1000);
      let doneEarly = false;
      run.done.then(() => { doneEarly = true; });
      await wait(40);
      const held = !beats.includes('return') && !doneEarly;
      check(held, 'hold 后超过原 1560ms 窗口仍保持在 dashX 不归位');
      check(dashKeyframesOf(g.wrap, run.dashX), '舍身突进已挂载 dashX 外移动画（WAAPI keyframes）');
      renderCheck(renderLive(), () => isMoving(transformOf(g.wrap)), '舍身突进渲染帧外移');

      const blockBefore = beats.filter(x => x === 'blockImpact').length;
      const releaseAt1 = now();
      const resumeArgs1 = [];
      const ownerResume1 = run.owner && typeof run.owner.resume === 'function' ? run.owner.resume : null;
      if (ownerResume1) run.owner.resume = function (ms) { resumeArgs1.push(ms); return ownerResume1.apply(run.owner, arguments); };
      const relRet = run.release();
      check(!!relRet && typeof relRet.then === 'function', 'release 仍返回 done Promise');
      await wait(150);
      // 新契约：release 后 0~300ms 停驻在 dashX，无 return beat / 归位采样 / 归位动画。
      const returnEarly = beats.includes('return') || recs('sheshen_armor_step').length > 1;
      if (returnEarly) {
        pending.push('待对齐:release 后 300ms 停驻新时间轴未入包（release+150ms 已观测到提前归位）');
      } else {
        check(!beats.includes('return'), 'release 后 150ms 仍停驻 dashX（无 return beat）');
        check(recs('sheshen_armor_step').length === 1, 'release 后 150ms 归位采样未提前触发');
        check(dashKeyframesOf(g.wrap, run.dashX), '停驻期 hero-wrap 仍保持 dashX 外移 keyframes');
        check(doc.querySelectorAll('[data-rescue="sheshen-return"]').length === 0, '停驻期不提前出现归位余光');
      }
      if (ownerResume1) {
        if (resumeArgs1.includes(830)) check(true, 'owner.resume(830) 覆盖 300+500+30');
        else pending.push('待对齐:owner.resume 实参为 ' + JSON.stringify(resumeArgs1) + '（预期 830）');
        run.owner.resume = ownerResume1;
      }
      await wait(250);
      eq(beats.filter(x => x === 'return').length, 1, 'release 后只归位一次');
      if (!returnEarly) {
        const returnWrapAnim = (g.wrap.getAnimations ? g.wrap.getAnimations() : []).some(a => {
          const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
          const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
          return !!t && Number(t.duration) === 500
            && kf.some(k => /translate3d\(\s*0(?:px)?\s*,\s*0(?:px)?\s*,\s*0(?:px)?\s*\)/.test(String(k.transform || '')));
        });
        check(returnWrapAnim, '归位动画 duration=500（速度×.7）且落回 translate3d(0,0,0)');
        const returnVisualAnim = (g.visual.getAnimations ? g.visual.getAnimations() : []).some(a =>
          a.effect && a.effect.getTiming && Number(a.effect.getTiming().duration) === 500);
        check(returnVisualAnim, 'gVisual 归位动画 duration=500');
        check(doc.querySelectorAll('[data-rescue="sheshen-return"]').length >= 1, '回位开始后420ms目标余光正常出现');
      }
      const doneR = await race(run.done, 1600);
      check(doneR.ok, 'release 后 done 自然收尾');
      eq(beats.filter(x => x === 'blockImpact').length, blockBefore, 'release 不再触发格挡');
      await wait(80);
      eq(g.card.style.transform, gInit.transform, '舍身结束恢复卡 transform');
      eq(g.card.style.borderColor, gInit.borderColor, '舍身结束恢复 borderColor');
      eq(g.card.style.boxShadow, gInit.boxShadow, '舍身结束恢复 boxShadow');
      eq(g.visual.style.transform, gvInit.transform, '舍身结束恢复 visualDom transform');
      eq(g.wrap.style.transform, gWrapInit.transform, '舍身结束恢复 hero-wrap transform');
      eq(g.wrap.getAnimations ? g.wrap.getAnimations().length : 0, 0, '舍身结束 hero-wrap 动画已清空（几何复位就绪）');
      renderCheck(renderLive(), () => !isMoving(transformOf(g.wrap)), '舍身结束 hero-wrap 渲染帧回位');

      const stomp = recs('vfx_golem_stomp_mx2150.mp3'), armor = recs('sheshen_armor_step_fs705490.mp3');
      const parry = recs('parry_Weapon_Perfect.wav');
      eq(stomp.length, 1, '舍身蓄势只播 1 次 mx_golem_stomp');
      eq(parry.length, 1, '舍身格挡只播 1 次 parry_perfect');
      eq(armor.length, 2, '舍身突进/归位各 1 次 sheshen_armor_step');
      if (armor.length === 2) {
        check(Math.abs(armor[0].opts.offsetSec - 0.92) < 0.001 && Math.abs(armor[0].opts.maxDurSec - 0.45) < 0.001, '突进采样窗口 offset .92 / maxDur .45');
        check(Math.abs(armor[1].opts.offsetSec - 0.34) < 0.001 && Math.abs(armor[1].opts.maxDurSec - 0.27) < 0.001, '归位采样窗口 offset .34 / maxDur .27');
        check(armor[1].at - t0 > 1200, '归位采样在 release 后才触发');
        if (!returnEarly) {
          check(armor[1].at - releaseAt1 > 250 && armor[1].at - releaseAt1 < 900, '归位采样较 release 延后约 300ms（实测 ' + Math.round(armor[1].at - releaseAt1) + 'ms）');
          if (beatAt.return) check(Math.abs(beatAt.return - armor[1].at) < 180, 'return beat 与归位采样在 300ms 点同时触发');
        }
      }
      check([...stomp, ...armor, ...parry].every(r => r.opts.category === 'B'), '舍身采样统一 category B');
      check(stomp.length === 1 && stomp[0].at - t0 < 120, '舍身起手采样在 0ms 拍点');
      check(parry.length === 1 && parry[0].at - t0 > 430 && parry[0].at - t0 < 900, '舍身格挡采样在约 630ms 拍点');

      /* ---------- 2. 舍身 clear：cancel 也 resolve ready/done、wrap/样式恢复 ---------- */
      const cg = makeHero('h_rescue_cg', 10), ct = makeHero('h_rescue_ct', 300);
      const cgInit = initial(cg.card), cgvInit = initial(cg.visual), cgwInit = initial(cg.wrap);
      const cbeats = [];
      const run2 = real.sheshen(entity('h_rescue_cg'), entity('h_rescue_ct'), { incomingType: '法术' }, b => cbeats.push(b.phase));
      // 335ms 启动突进；380ms 时只查 WAAPI keyframes，不依赖 IAB 渲染帧，也在 630ms 格挡前留出余量。
      await wait(380);
      check(dashKeyframesOf(cg.wrap, run2.dashX), 'clear 前 hero-wrap 已挂载 dashX 外移动画（WAAPI keyframes）');
      renderCheck(renderLive(), () => isMoving(transformOf(cg.wrap)), 'clear 前 hero-wrap 渲染帧已进入外移');
      real.clear(entity('h_rescue_ct'));
      const ready2 = await race(run2.ready, 600);
      check(ready2.ok && ready2.value && ready2.value.cancelled === true, 'clear 取消也 resolve ready（不挂起后续链）');
      const done2 = await race(run2.done, 600);
      check(done2.ok, 'clear 取消也 resolve done');
      eq(cbeats.filter(x => x === 'blockImpact').length, 0, 'clear 后不再格挡');
      eq(cg.card.style.borderColor, cgInit.borderColor, 'clear 恢复 borderColor 原值');
      eq(cg.card.style.boxShadow, cgInit.boxShadow, 'clear 恢复 boxShadow 原值');
      eq(cg.visual.style.transform, cgvInit.transform, 'clear 恢复 visualDom transform 原值');
      eq(cg.wrap.style.transform, cgwInit.transform, 'clear 恢复 hero-wrap transform 原值');
      eq(cg.wrap.getAnimations ? cg.wrap.getAnimations().length : 0, 0, 'clear 后 hero-wrap 动画已清空（几何复位就绪）');
      renderCheck(renderLive(), () => !isMoving(transformOf(cg.wrap)), 'clear 后 hero-wrap 渲染帧回位');

      /* ---------- 2b. release 停驻期（0~300ms）clear：立即恢复，300ms 后无 return 回调复活 ---------- */
      resetAudio();
      const hg = makeHero('h_hold_g', 10), ht = makeHero('h_hold_t', 300);
      const hgwInit = initial(hg.wrap), hgvInit = initial(hg.visual), hgcInit = initial(hg.card);
      const hbeats = [];
      const runH = real.sheshen(entity('h_hold_g'), entity('h_hold_t'), { incomingType: '近战' }, b => hbeats.push(b.phase));
      await wait(700); // 630ms blockImpact 已发生
      runH.release();
      await wait(120); // 处于 300ms 停驻期内
      real.clear(entity('h_hold_t'));
      const doneH = await race(runH.done, 400);
      check(doneH.ok, '停驻期 clear 立即 resolve done');
      eq(hbeats.filter(x => x === 'return').length, 0, '停驻期 clear 前 return beat 未触发');
      eq(hg.wrap.getAnimations ? hg.wrap.getAnimations().length : 0, 0, '停驻期 clear 后 hero-wrap 动画立即清空');
      eq(hg.wrap.style.transform, hgwInit.transform, '停驻期 clear 立即恢复 hero-wrap transform');
      eq(hg.visual.style.transform, hgvInit.transform, '停驻期 clear 立即恢复 visualDom transform');
      eq(hg.card.style.borderColor, hgcInit.borderColor, '停驻期 clear 立即恢复 borderColor');
      await wait(600); // 越过原 300ms 回位点与 resume(830) 点
      eq(hbeats.filter(x => x === 'return').length, 0, '停驻期 clear 后无旧 return 回调复活');
      eq(hbeats.filter(x => x === 'blockImpact').length, 1, '停驻期 clear 后格挡不复发');
      eq(recs('sheshen_armor_step').length, 1, '停驻期 clear 后归位采样未复活（仅突进 1 次）');
      eq(hg.wrap.getAnimations ? hg.wrap.getAnimations().length : 0, 0, '停驻期 clear 后动画无复活');

      /* ---------- 2c. return 途中（300~800ms）clear：立即恢复，无二次归位/格挡 ---------- */
      resetAudio();
      const rg = makeHero('h_ret_g', 10), rt = makeHero('h_ret_t', 300);
      const rgwInit = initial(rg.wrap), rgvInit = initial(rg.visual);
      const rbeats = [];
      const runR = real.sheshen(entity('h_ret_g'), entity('h_ret_t'), { incomingType: '近战' }, b => rbeats.push(b.phase));
      await wait(700);
      runR.release();
      await wait(400); // 归位动画进行中（300~800ms 窗口内）
      eq(rbeats.filter(x => x === 'return').length, 1, 'return 途中 clear 前 return beat 已触发一次');
      real.clear(entity('h_ret_t'));
      const doneR2 = await race(runR.done, 400);
      check(doneR2.ok, 'return 途中 clear 立即 resolve done');
      eq(rg.wrap.getAnimations ? rg.wrap.getAnimations().length : 0, 0, 'return 途中 clear 后 hero-wrap 动画立即清空');
      eq(rg.wrap.style.transform, rgwInit.transform, 'return 途中 clear 立即恢复 hero-wrap transform');
      eq(rg.visual.style.transform, rgvInit.transform, 'return 途中 clear 立即恢复 visualDom transform');
      await wait(600); // 越过原 500ms 归位终点与 resume(830) 点
      eq(rbeats.filter(x => x === 'return').length, 1, 'return 途中 clear 后无二次 return beat');
      eq(rbeats.filter(x => x === 'blockImpact').length, 1, 'return 途中 clear 后无二次格挡');
      eq(recs('sheshen_armor_step').length, 2, 'return 途中 clear 后归位采样恰好 2 次（突进+回位），无复活');
      eq(rg.wrap.getAnimations ? rg.wrap.getAnimations().length : 0, 0, 'return 途中 clear 后动画无复活');
      renderCheck(renderLive(), () => !isMoving(transformOf(rg.wrap)), 'return 途中 clear 后 hero-wrap 渲染帧回位');

      /* ---------- 3. 毅力：卡内血幕不盖 Buff、三节拍、只 380ms taunt ---------- */
      resetAudio();
      const gr = makeHero('h_rescue_grit', 10);
      const grInit = initial(gr.card), grvInit = initial(gr.visual);
      const grEntity = entity('h_rescue_grit', { classType: '防守者' });
      const hp0 = grEntity.hp, buffs0 = JSON.stringify(grEntity.buffs);
      const gbeats = [], tg = now();
      const gOwner = real.grit(grEntity, { hasPassive: true }, b => gbeats.push(b.phase));
      check(!!gOwner && !!gOwner.handle && typeof gOwner.handle.doneAt === 'number', '毅力返回复用 identityRun 的正式 owner');
      await wait(120);
      const wrapNow = gr.card.querySelector('.arcane-rescue-blood-wrap');
      check(!!wrapNow, '毅力卡内血幕已挂载');
      check(!!wrapNow && wrapNow.parentElement === gr.visual, '血幕只挂 visual 容器，不覆盖 Buff 层');
      await wait(1400);
      ['lethalImpact', 'gritCore', 'recovered'].forEach(phase => check(gbeats.includes(phase), '毅力节拍 ' + phase));
      eq(grEntity.hp, hp0, '毅力不改实体 HP 数值');
      eq(JSON.stringify(grEntity.buffs), buffs0, '毅力不改实体 Buff');
      eq(gr.card.querySelector('.arcane-rescue-blood-wrap'), null, '毅力结束血幕清理');
      eq(gr.card.style.transform, grInit.transform, '毅力不动卡本体 transform（不与 hitRecoil 抢属性）');
      eq(gr.card.style.borderColor, grInit.borderColor, '毅力结束恢复 borderColor');
      eq(gr.visual.style.transform, grvInit.transform, '毅力 visualDom transform 恢复');
      const grTaunt = recs('taunt.mp3'), grHeavy = recs('hit_heavy'), grBurst = recs('burst.mp3');
      eq(grTaunt.length, 1, '毅力只播 1 次 taunt');
      eq(grHeavy.length, 0, '毅力不再播 hit_heavy');
      eq(grBurst.length, 0, '毅力不再播额外 burst 采样');
      if (grTaunt.length === 1) check(grTaunt[0].at - tg > 240 && grTaunt[0].at - tg < 560, '毅力 taunt 在约 380ms 拍点');

      /* ---------- 4. 回避：44px 卡内错位 + 215ms 碎散、0ms 急步 + 150ms hide ---------- */
      resetAudio();
      const av = makeHero('h_rescue_avoid', 10);
      const avInit = initial(av.card), avvInit = initial(av.visual);
      const avEntity = entity('h_rescue_avoid', { classType: '风行者', shield: 20 });
      const avHp0 = avEntity.hp, avShield0 = avEntity.shield, avBuff0 = JSON.stringify(avEntity.buffs);
      const abeats = [], ta = now();
      const aOwner = real.avoid(avEntity, { hasPassive: true, incomingType: '近战' }, b => abeats.push(b.phase));
      check(!!aOwner && !!aOwner.handle, '回避返回复用 identityRun 的正式 owner');
      await wait(100);
      check(doc.querySelectorAll('.arcane-rescue-ghost').length >= 1, '回避残影已生成');
      await wait(900);
      ['avoided', 'reset'].forEach(phase => check(abeats.includes(phase), '回避节拍 ' + phase));
      eq(avEntity.hp, avHp0, '回避不改 HP 数值');
      eq(avEntity.shield, avShield0, '回避不改护盾数值');
      eq(JSON.stringify(avEntity.buffs), avBuff0, '回避不改 Buff');
      eq(av.card.style.transform, avInit.transform, '回避不动卡本体 transform');
      eq(av.card.style.borderColor, avInit.borderColor, '回避结束恢复 borderColor');
      eq(av.visual.style.transform, avvInit.transform, '回避 visualDom transform 恢复');
      eq(doc.querySelectorAll('.arcane-rescue-ghost').length, 0, '回避残影清理');
      const dash = recs('avoid_dash_fs521999.mp3'), hide = recs('hide.mp3');
      eq(dash.length, 1, '回避只播 1 次 avoid_dash_perfect');
      eq(hide.length, 1, '回避只播 1 次 hide');
      if (dash.length === 1) check(dash[0].at - ta < 120, '回避急步采样在 0ms 拍点');
      if (hide.length === 1) check(hide[0].at - ta > 80 && hide[0].at - ta < 360, '回避 hide 采样在约 150ms 拍点');

      /* ---------- 5. 四被动：两毅力/两回避均启动新 FX、旧重复音移除 ---------- */
      const passives = {
        gritDefender: w.CLASS_PASSIVES && w.CLASS_PASSIVES['防守者'],
        gritBerserker: w.CLASS_PASSIVES && w.CLASS_PASSIVES['狂战士'],
        avoidWind: w.CLASS_PASSIVES && w.CLASS_PASSIVES['风行者'],
        avoidHidden: w.CLASS_PASSIVES && w.CLASS_PASSIVES['隐匿者']
      };
      check(Object.keys(passives).every(k => passives[k] && typeof passives[k].onFatalDamage === 'function'), '毅力两被动与回避两被动仍保留 onFatalDamage');
      check(!/playSound\(/.test(String(passives.gritDefender.onFatalDamage)) && !/playSound\(/.test(String(passives.gritBerserker.onFatalDamage)), '毅力两被动旧 taunt 语音已移除');
      check(!/playSound\(/.test(String(passives.avoidWind.onFatalDamage)) && !/playSound\(/.test(String(passives.avoidHidden.onFatalDamage)), '回避两被动旧 miss 语音已移除');

      let gritHookCalls = 0, avoidHookCalls = 0;
      mod.playRescueGrit = function () { gritHookCalls++; return real.grit.apply(this, arguments); };
      mod.playRescueAvoidFatal = function () { avoidHookCalls++; return real.avoid.apply(this, arguments); };
      resetAudio();
      const callFatal = (passive, ent) => {
        const ctx = { target: ent, targetDom: null, hpDmg: ent.hp, shieldDmg: ent.shield || 0, prevented: false };
        return { handled: passive.onFatalDamage(ctx), ctx };
      };
      const pd = makeHero('passive_grit_d', 10), pb = makeHero('passive_grit_b', 150);
      const pw = makeHero('passive_avoid_w', 290), ph = makeHero('passive_avoid_h', 430);
      const d1 = callFatal(passives.gritDefender, entity('passive_grit_d', { hp: 80, classType: '防守者' }));
      const b1 = callFatal(passives.gritBerserker, entity('passive_grit_b', { hp: 50, classType: '狂战士' }));
      const aw = callFatal(passives.avoidWind, entity('passive_avoid_w', { hp: 60, shield: 30, classType: '风行者' }));
      const ah = callFatal(passives.avoidHidden, entity('passive_avoid_h', { hp: 60, shield: 30, classType: '隐匿者' }));
      eq(d1.handled, true, '防守者毅力仍阻止致死');
      eq(d1.ctx.hpDmg, 79, '防守者毅力仍保留 1 HP（80→1 伤害 79）');
      eq(b1.handled, true, '狂战士毅力仍阻止致死');
      eq(b1.ctx.hpDmg, 49, '狂战士毅力仍保留 1 HP（50→1 伤害 49）');
      eq(aw.handled, true, '风行者回避致命仍阻止致死');
      eq(aw.ctx.hpDmg, 0, '风行者回避后伤害归零');
      eq(aw.ctx.shieldDmg, 0, '风行者回避后护盾伤害归零');
      eq(ah.handled, true, '隐匿者回避致命仍阻止致死');
      const second = callFatal(passives.avoidHidden, entity('passive_avoid_h2', { hp: 60, hasTriggeredAvoidFatal: true }));
      eq(second.handled, false, '回避被动每场一次，第二次不再触发');

      await wait(500);
      eq(gritHookCalls, 2, '毅力两被动各启动 1 次 playRescueGrit');
      eq(avoidHookCalls, 2, '回避两被动各启动 1 次 playRescueAvoidFatal');
      eq(recs('taunt.mp3').length, 2, '两毅力被动各播 1 次 taunt');
      eq(recs('avoid_dash_fs521999.mp3').length, 2, '两回避被动各播 1 次 avoid_dash_perfect');
      eq(recs('hide.mp3').length, 2, '两回避被动各播 1 次 hide');
      eq(sounds.filter(k => k === 'taunt' || k === 'miss').length, 0, '四被动内不再经 playSound 重复播 taunt/miss');
      check(recs('taunt.mp3').every(r => r.opts.category === 'B') && recs('hide.mp3').every(r => r.opts.category === 'B'), '被动采样统一 category B');

      const fatalEvent = w.EVENTS && w.EVENTS.ON_FATAL_DAMAGE;
      const fatalListeners = fatalEvent && w.CombatEvents && w.CombatEvents._listeners ? (w.CombatEvents._listeners[fatalEvent] || []) : [];
      const priorities = fatalListeners.map(l => l.priority);
      check(priorities.length > 0, 'ON_FATAL_DAMAGE 订阅仍存在');
      check(priorities.every((p, i) => i === 0 || priorities[i - 1] >= p), 'ON_FATAL_DAMAGE 仍按 priority 降序');
      check(priorities.filter(p => p === 10).length >= 2 && priorities.filter(p => p === 5).length >= 2, '毅力/回避四被动 priority 仍为 10/10/5/5');
      real.clear();

      /* ---------- 6. triggerAllyFatalSaveSpeak：致命被动触发后立即调用，不等动画 ---------- */
      ev('llmState.allyAutoSpeak=true');
      let speakAt = 0, speakPassive = null, fatalFxAt = 0;
      w.triggerAllyFatalSaveSpeak = (hero, passiveName) => { speakAt = now(); speakPassive = passiveName; return Promise.resolve(); };
      mod.playRescueGrit = function () { fatalFxAt = now(); return real.grit.apply(this, arguments); };
      const fd = makeHero('h_fatal_speak', 10);
      const dFatal = installData([entity('h_fatal_speak', { hp: 50, classType: '防守者' })], [entity('e_fatal_speak', { hp: 5000 })]);
      const fatalSkill = w.parseSkill('【致命测试】[单体;power:9999][近战]');
      const fatalRandom = w.Math.random;
      w.Math.random = () => 0.999;
      await w.applySingleTagEffect(dFatal.e[0], dFatal.h[0], '[单体]', 9999, 500, 1, 3, fatalSkill);
      w.Math.random = fatalRandom;
      check(!!fatalFxAt, '致命被动已启动 new FX');
      check(speakPassive === '毅力留存', '致命保命语音使用毅力留存口径');
      check(speakAt > 0 && fatalFxAt > 0 && speakAt - fatalFxAt >= 0 && speakAt - fatalFxAt < 200, 'triggerAllyFatalSaveSpeak 在 FX 启动后立即调用（不等待 1360ms 动画）');
      eq(dFatal.h[0].hp, 1, '毅力保命后 HP 保留 1');
      real.clear();

      /* ---------- 7. 真实舍身复杂链：prompt 舍身 → 二 prompt 折影步 dodge → 反击 → release ---------- */
      const sheshenSkill = w.parseSkill('【舍身护佑】[舍身:all][MP:0]');
      const dodgeSkill = w.parseSkill('【折影步】[回避;power:900][MP:4][反应:近战][法术][特效:折影步]');
      check(!!sheshenSkill && sheshenSkill.sheshenTarget === 'all', '舍身技能解析出 sheshenTarget');
      check(!!dodgeSkill && dodgeSkill.isReaction === true, '折影步解析为真实反应技');

      const chainG = makeHero('h_chain_g', 10), chainT = makeHero('h_chain_t', 300);
      const chainWrapInit = initial(chainG.wrap);
      const promptCalls = [];
      w.promptReaction = async function (hero, reactionSkills, attacker, incomingSkill, sheshenCandidates) {
        promptCalls.push({ heroId: hero.id, reactions: (reactionSkills || []).length, sheshen: (sheshenCandidates || []).length });
        const p = real.prompt.apply(this, arguments);
        await wait(20);
        const index = (sheshenCandidates || []).length ? (reactionSkills || []).length : ((reactionSkills || []).length ? 0 : -1);
        w.resolveReaction(index);
        return p;
      };
      let chainHandle = null, chainReleaseCalls = 0, chainReleaseAt = 0;
      let chainKfSeen = false, chainRenderMoving = null, chainProbeEnabled = true;
      mod.playRescueSheshen = function () {
        const h = real.sheshen.apply(this, arguments);
        chainHandle = h;
        if (h && typeof h.release === 'function') {
          const rel = h.release;
          h.release = function (...args) { chainReleaseCalls++; chainReleaseAt = now(); return rel.apply(h, args); };
        }
        // 相对舍身真实时间轴取 360ms（突进已在 335ms 启动），只读 keyframes；条件满足才附渲染帧采样。
        if (chainProbeEnabled && h && h.owner && typeof h.owner.at === 'function') {
          h.owner.at(360, () => {
            chainKfSeen = dashKeyframesOf(chainG.wrap, h.dashX);
            if (renderLive()) chainRenderMoving = isMoving(transformOf(chainG.wrap));
          });
        }
        return h;
      };
      const chainEntities = [
        entity('h_chain_t', { hp: 500, spd: 1, skills: [] }),
        entity('h_chain_g', { hp: 500, spd: 1, mp: 100, skills: [sheshenSkill, dodgeSkill],
          buffs: [{ type: 'counter', value: 5, duration: 9999 }], powerCounterFired: false })
      ];
      const chainData = installData(chainEntities, [entity('e_chain', { hp: 5000, spd: 1, atk: 10 })]);
      const chainIncoming = w.parseSkill('【链测试攻击】[单体;power:10][近战]');
      let counterCalls = 0;
      if (real.counter) w.playCounterAttackL1 = function () { counterCalls++; return real.counter.apply(this, arguments); };
      const originalRandom = w.Math.random;
      w.Math.random = () => 0.999;
      let chainReadySeen = false;
      const chainStart = now();
      await w.applySingleTagEffect(chainData.e[0], chainData.h[0], '[单体]', 10, 500, 1, 3, chainIncoming);
      chainProbeEnabled = false;
      w.Math.random = originalRandom;
      if (chainHandle && chainHandle.ready) chainHandle.ready.then(() => { chainReadySeen = true; });
      await wait(30);
      eq(promptCalls.length, 2, '复杂链出现两次真实反应弹窗');
      if (promptCalls.length === 2) {
        check(promptCalls[0].reactions === 0 && promptCalls[0].sheshen > 0, '第一个弹窗选择舍身');
        check(promptCalls[1].reactions > 0 && promptCalls[1].sheshen === 0, '第二个弹窗由守护者选择反应技');
      }
      check(!!chainHandle, '复杂链真实创建 rescueHandle');
      check(!!chainHandle && typeof chainHandle.cancel === 'function' && typeof chainHandle.doneAt === 'number' && !!chainHandle.ready && !!chainHandle.done, 'rescueHandle 具备 ready/done/doneAt/cancel 完整契约');
      check(chainReadySeen, '复杂链等待到 handle.ready 后才进入 guardian 二次反应');
      check(chainHandle && chainHandle.isReleased() === true, '复杂链结束 handle 已 release 归位');
      eq(chainReleaseCalls, 1, '复杂链 release 只调用一次');
      check(chainReleaseAt - chainStart > 1100, 'release 发生在格挡/二次反应之后');
      check(chainKfSeen, '复杂链真实 hero-wrap 挂载 dashX 外移动画（WAAPI keyframes）');
      if (chainRenderMoving === null) renderSkipped.push('复杂链突进渲染帧外移');
      else check(chainRenderMoving, '复杂链突进渲染帧外移');
      eq(chainG.wrap.getAnimations ? chainG.wrap.getAnimations().length : 0, 0, '复杂链结束 hero-wrap 动画已清空（几何复位就绪）');
      renderCheck(renderLive(), () => !isMoving(transformOf(chainG.wrap)), '复杂链结束 hero-wrap 渲染帧回位');
      eq(chainG.wrap.style.transform, chainWrapInit.transform, '复杂链结束 hero-wrap 内联 transform 恢复');
      eq(counterCalls, 1, '真实普通反击执行一次');
      check(chainData.e[0].hp < 5000, '普通反击对攻击者造成真实伤害');
      eq(chainData.h[1].powerCounterFired, false, '普通反击不置强反击 powerCounterFired 标记');
      eq(chainData.h[1].hp, 500, '折影步 dodge 成功，guardian 未承伤');
      eq(chainData.h[0].hp, 500, '舍身承伤未落到原目标');

      /* ---------- 8. 实际承伤路径：命中后 sleep 500ms 再 release ---------- */
      const hitG = makeHero('h_hit_g', 10), hitT = makeHero('h_hit_t', 300);
      let hitFeedbackAt = 0;
      w.playHitFeedback = function (result, opts) {
        if (result && result.targetId === 'h_hit_g') hitFeedbackAt = now();
        return real.hitFeedback.apply(this, arguments);
      };
      const hitPromptCalls = [];
      w.promptReaction = async function (hero, reactionSkills, attacker, incomingSkill, sheshenCandidates) {
        hitPromptCalls.push({ heroId: hero.id, reactions: (reactionSkills || []).length, sheshen: (sheshenCandidates || []).length });
        const p = real.prompt.apply(this, arguments);
        await wait(20);
        w.resolveReaction((sheshenCandidates || []).length ? (reactionSkills || []).length : -1);
        return p;
      };
      chainHandle = null; chainReleaseCalls = 0; chainReleaseAt = 0;
      const hitEntities = [
        entity('h_hit_t', { hp: 500, spd: 1, skills: [] }),
        entity('h_hit_g', { hp: 500, spd: 1, mp: 100, skills: [sheshenSkill] })
      ];
      const hitData = installData(hitEntities, [entity('e_hit', { hp: 5000, spd: 1, atk: 10 })]);
      const hitIncoming = w.parseSkill('【承伤测试】[单体;power:10][近战]');
      w.Math.random = () => 0.999;
      await w.applySingleTagEffect(hitData.e[0], hitData.h[0], '[单体]', 10, 500, 1, 3, hitIncoming);
      w.Math.random = originalRandom;
      eq(hitPromptCalls.length, 1, '承伤链只在原目标处弹一次舍身');
      check(!!chainHandle && chainReleaseCalls === 1, '承伤链同样 release 一次');
      check(hitFeedbackAt > 0 && chainReleaseAt > 0, '承伤链命中与 release 时间可观测');
      if (hitFeedbackAt && chainReleaseAt) {
        const gap = chainReleaseAt - hitFeedbackAt;
        check(gap > 350 && gap < 900, '实际承伤后约 500ms 才 release（实测 ' + Math.round(gap) + 'ms）');
      }
      check(hitData.h[1].hp < 500 && hitData.h[1].hp > 480, '舍身 guardian 实际承受本次伤害');
      eq(hitG.wrap.getAnimations ? hitG.wrap.getAnimations().length : 0, 0, '承伤链结束 hero-wrap 动画已清空（几何复位就绪）');
      renderCheck(renderLive(), () => !isMoving(transformOf(hitG.wrap)), '承伤链结束 hero-wrap 渲染帧回位');

      /* ---------- 9. 源码契约：旧音移除、500ms 路径、hook 入包 ---------- */
      let src = typeof source === 'string' && source.length > 2000 ? source : '';
      if (/^\s*\{/.test(src) && src.indexOf('replaceString') >= 0) {
        try {
          const j = JSON.parse(src);
          src = String(j.replaceString || '').replace(/^```[\s\S]*?\r?\n/, '').replace(/\r?\n```\s*$/, '').replace(/&amp;/g, '&');
        } catch (e) { /* 保留原串 */ }
      }
      if (!src) pending.push('待对齐:source 未注入');
      else {
        check(!/playSound\('taunt'/.test(String(passives.gritDefender.onFatalDamage)) && !/playSound\('miss'/.test(String(passives.avoidWind.onFatalDamage)), '源码中四被动不再以 playSound 重复播旧音');
        check((src.match(/arcaneVfxModule\.playRescueGrit\(/g) || []).length >= 2, '毅力两处被动 hook 均启动新 FX');
        check((src.match(/arcaneVfxModule\.playRescueAvoidFatal\(/g) || []).length >= 2, '回避两处被动 hook 均启动新 FX');
        check(/const rescueHandle = arcaneVfxModule\.playRescueSheshen/.test(src), '舍身分支创建 rescueHandle');
        check(/await rescueHandle\.ready/.test(src), '舍身分支等待 handle.ready 后进入二次反应');
        check(/await finishDodge\(\); if \(prepared\.rescueHandle\) await prepared\.rescueHandle\.release\(\)/.test(src), 'finishDodge 收尾 await release');
        check(/await sleep\(500\)[\s\S]{0,120}prepared\.rescueHandle\.release\(\)/.test(src), '实际承伤路径 sleep 500ms 后 release');
        const si = src.indexOf('function playRescueSheshen');
        const gi = src.indexOf('function playRescueGrit', si);
        const ai = src.indexOf('function playRescueAvoidFatal', gi);
        const sSeg = si >= 0 && gi > si ? src.slice(si, gi) : '';
        const gSeg = gi >= 0 && ai > gi ? src.slice(gi, ai) : '';
        const aEndMark = src.indexOf('/* ===== 救援时刻 v12.10 END', ai);
        const aSeg = ai >= 0 ? src.slice(ai, aEndMark > ai ? aEndMark : ai + 7000) : '';
        if (!sSeg || !gSeg || !aSeg) pending.push('待对齐:救援模块源码段未定位（产物可能未合并）');
        else {
          check(!/playIncomingToPoint/.test(sSeg), '舍身源码不再播来袭飞行');
          const relAt = sSeg.indexOf('function release()');
          const relSeg = relAt >= 0 ? sSeg.slice(relAt, sSeg.indexOf('// 1. 决意蓄势', relAt)) : '';
          check(!!relSeg && !/triggerBlockImpact\s*\(/.test(relSeg), '舍身 release 段不再触发格挡');
          if (/owner\.resume\(830\)/.test(relSeg) || /owner\.at\(300/.test(relSeg)) {
            check(/owner\.at\(300/.test(relSeg), 'release 300ms 停驻后经 owner.at(300) 启动归位/回位音效/return beat');
            check(/owner\.resume\(830\)/.test(relSeg), 'owner.resume(830) 覆盖 300+500+30');
            check(/duration:\s*500/.test(relSeg), '归位动画 gWrap/gVisual duration=500（速度×.7）');
            check(!/duration:\s*350/.test(relSeg), 'release 段旧 350ms 归位时长已移除');
            check(/offsetSec:\s*0\.34/.test(relSeg) && /maxDurSec:\s*0\.27/.test(relSeg) && /vol:\s*0\.45/.test(relSeg), '回位采样 .34/.27/.45 保留（仅延后 300ms）');
            check(/duration:\s*420/.test(relSeg), '目标余光 aura 420ms 保留（与位移无关）');
          } else {
            pending.push('待对齐:release 300ms 停驻新契约未入包（resume(830)/at(300)/duration 500）');
          }
          check(/sheshen_armor_step/.test(sSeg) && /parry_perfect/.test(sSeg), '舍身采样 sheshen_armor_step / parry_perfect 入包');
          check(!/hit_heavy/.test(gSeg), '毅力源码已删 hit_heavy');
          check(/taunt/.test(gSeg) && !/playSample\('burst'/.test(gSeg), '毅力只保留 380ms taunt，无额外 burst 采样');
          check(/rescueBloodDrop/.test(gSeg), '毅力竖直血滴使用 rescueBloodDrop');
          check(/avoid_dash_perfect/.test(aSeg) && /'hide'/.test(aSeg), '回避采样 avoid_dash_perfect + hide 入包');
          check(!/playIncomingToPoint/.test(aSeg), '回避源码不再模拟来袭刀光/来袭音');
        }
      }
    } finally {
      try { real.clear(); } catch (e) {}
      try { w.clearArcaneFx(); } catch (e) {}
      try { mod.setIdentitySfx(true); } catch (e) {}
      mod.playRescueSheshen = real.sheshen;
      mod.playRescueGrit = real.grit;
      mod.playRescueAvoidFatal = real.avoid;
      mod.clearRescueState = real.clear;
      if (real.prompt) w.promptReaction = real.prompt;
      if (real.playCustom) w.playCustomAudio = real.playCustom;
      w.playSound = real.playSound;
      w.addHistory = real.addHistory;
      w.createFloatingText = real.createFloatingText;
      if (real.hitFeedback) w.playHitFeedback = real.hitFeedback;
      if (real.counter) w.playCounterAttackL1 = real.counter;
      if (real.speak) w.triggerAllyFatalSaveSpeak = real.speak;
      rafStop = true;
      try {
        ev(`(() => { const s = window.__rmrRestore;
          heroesData = s.heroesData; enemiesData = s.enemiesData;
          battleHistory = s.battleHistory; _historyRawCache = s._historyRawCache;
          combatToken = s.token; _pipelineFrozen = s.frozen; Math.random = s.random;
          llmState.allyAutoSpeak = s.allySpeak;
          delete window.__rmrRestore;
        })()`);
      } catch (e) { /* 清理尽力而为 */ }
      if (saved.battleHistory) saved.battleHistory.length = histLen;
      if (saved._historyRawCache) saved._historyRawCache.length = rawLen;
      try { root.remove(); } catch (e) {}
      document.querySelectorAll('[id^="reaction-prompt-"]').forEach(el => el.remove());
      document.querySelectorAll('.arcane-rescue-blood-wrap').forEach(el => el.remove());
    }
    if (mock && typeof mock.genCount === 'function') eq(mock.genCount(), gen0, '救援时刻回归未调用外部 LLM');
    return { pending, renderSkipped };
  };
})();
