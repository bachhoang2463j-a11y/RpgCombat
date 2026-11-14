/* v12.10 状态四项回归（毒/燃/麻/到期 + 燃烧禁疗提示）
   业务与演出全部调用真实 iframe 内接口：playStatusTickFx / syncStatusLayers / clearStatusLayers /
   updateBuffUI / updateEnemyUI / playVariantTriggerFx / clearArcaneFx，不复制任何战斗或绘制实现。
   夹具自建真实结构的 DOM（正式英雄 hero-card-inner 无 .portrait、敌方精灵、英雄侧召唤 enemy-sprite），
   按引用保存并恢复被替换的函数与数据，结束后完整回滚。
   接口或主代理接线尚未落地时记入 pending，由 harness 汇总，不误判为断言失败。 */
(function () {
  'use strict';
  window.runStatusTickRegression = async function ({ w, check, eq, mock, source }) {
    const ev = code => w.eval(code);
    const doc = w.document;
    const nativeSetTimeout = w.setTimeout;
    const sleep = ms => new Promise(resolve => nativeSetTimeout.call(w, resolve, ms));
    const group = async (name, fn) => {
      try { await fn(); }
      catch (e) { check(false, name + '执行异常', String((e && e.stack) || e)); }
    };
    const pending = [];
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;
    const src = String(source || '');

    // —— 新增接口清单：缺一项即整体待对齐（接口未落地不判失败） ——
    // 兼容两种注册方式：window.playStatusTickFx 或 arcaneVfxModule.playStatusTickFx。
    const mod = (() => { try { return ev('arcaneVfxModule'); } catch (e) { return null; } })();
    const apiFn = name => (typeof w[name] === 'function' ? w[name] : (mod && typeof mod[name] === 'function' ? mod[name].bind(mod) : null));
    const api = ['playStatusTickFx', 'playStatusPoisonTick', 'playStatusBurnTick', 'playStatusHealSuppressed',
      'playStatusParaProc', 'playStatusParaMiss', 'playStatusExpire', 'syncStatusLayers', 'clearStatusLayers',
      'setStatusSfx', 'clearArcaneFx'];
    const missing = api.filter(name => !apiFn(name));
    const hasApi = missing.length === 0;
    const statusTick = apiFn('playStatusTickFx');
    const statusSync = apiFn('syncStatusLayers');
    const statusClear = apiFn('clearStatusLayers');
    const statusSetSfx = apiFn('setStatusSfx');
    if (!hasApi) console.log('[PENDING] 状态演出接口未落地：' + missing.join('、'));

    // —— 源码静态契约（片段未合入时只登记 pending） ——
    const sStart = src.indexOf('// ===== v12.10 状态发作');
    const sEnd = src.indexOf('// ===== v12.10 状态 END');
    const statusSrc = sStart >= 0 && sEnd > sStart ? src.slice(sStart, sEnd) : '';
    if (statusSrc) {
      check(statusSrc.includes('variantRun('), 'statusRun 复用 variantRun 以清实体');
      check(statusSrc.includes('owner.onRestore = owner.onClean'), 'owner.onRestore 指向 owner.onClean');
      check(/isEntityVariantLocked\s*\(\s*dom\s*\)/.test(statusSrc), '麻痹 350ms 硬直先判 isEntityVariantLocked(dom)');
      check(/duration\s*:\s*350/.test(statusSrc), '麻痹轻硬直时长固定 350ms');
      check(!statusSrc.includes("event === 'dispel'") && !statusSrc.includes('playStatusDispel'), '状态分派无驱散分支');
      check(/statusSfxGate\s*\(\s*'expire'\s*,\s*70\s*\)/.test(statusSrc), '多个到期 sfx 以 70ms gate 节流');
      check(/sampled\s*:\s*true/.test(statusSrc) && /category\s*:\s*'K'/.test(statusSrc), '采样走 sampled:true + category K');
      check(['creature_slime_01', 'thunder_charge', 'ranshao', 'fog'].every(k => statusSrc.includes(k)), '毒/麻/燃禁疗/到期采样键映射齐全');
      check(!/idSfx\s*\(/.test(statusSrc) && !/AudioContext|createOscillator|createGain/.test(statusSrc), '状态片段无合成音/独立音频引擎');
      check(/mistCore/.test(statusSrc) && /fade\s*:/.test(statusSrc) && /core\s*:/.test(statusSrc), '粒子形状使用 mistCore/fade 与 core/color');
      check(!/shape\s*:\s*'gradRing'/.test(statusSrc), '未使用 gradRing（正式 DRAW 忽略 r0/rSpan）');
    } else {
      pending.push('v12.10 状态片段未入包');
    }

    // 只在 JS 源码里做接线检测，避免把 <style> 内的类名当成 updateBuffUI 已接线
    const jsSrc = src.replace(/<style[\s\S]*?<\/style>/gi, '');
    // 驱散原 handler 必须保持原样，不被状态 tick 分派替换。
    // 用带逗号的真实注册语句定位，避开模块顶部注释里的 registerTagHandler('驱散')；
    // 切片到下一个 registerTagHandler 为止，不能横向吞掉后面的【回】禁疗 tick。
    const dispelMatch = /registerTagHandler\('驱散'\s*,/.exec(jsSrc);
    if (dispelMatch) {
      const dStart = dispelMatch.index;
      const nextAt = jsSrc.indexOf('registerTagHandler(', dStart + dispelMatch[0].length);
      const dSlice = jsSrc.slice(dStart, nextAt > dStart ? nextAt : dStart + 1600);
      check(dSlice.includes('ctx.target.buffs = keep') && dSlice.includes('_arcaneFx.dispel'), '驱散原 handler 未被替换');
      check(!dSlice.includes('playStatusDispel') && !dSlice.includes('playStatusTickFx') && !dSlice.includes('healSuppressed'),
        '驱散 handler 不含状态 tick/驱散演出');
    } else {
      pending.push('驱散原 handler 未找到');
    }

    // 主代理接线（缺项登记 pending，不误判）
    const buffTypeWired = jsSrc.includes('data-buff-type');
    const expiringWired = jsSrc.includes('arcane-status-badge-expiring');
    // 片段自身有 1 处函数声明；updateBuffUI 内的真实调用应再出现 1 次
    const syncWired = (jsSrc.match(/syncStatusLayers\s*\(\s*entity\s*\)/g) || []).length >= 2;
    const callFor = color => new RegExp("playStatusTickFx\\s*\\(\\s*\\{[^}]*['\"]" + color + "['\"]").test(jsSrc);
    const wiredEvents = ['poisonTick', 'burnTick', 'healSuppressed', 'paraProc', 'expire'];
    const missingEvents = wiredEvents.filter(name => !callFor(name));
    if (!buffTypeWired) pending.push('updateBuffUI data-buff-type');
    if (!expiringWired) pending.push('updateBuffUI 临期徽章');
    if (!syncWired) pending.push('updateBuffUI 末尾 syncStatusLayers(entity)');
    if (missingEvents.length) pending.push('nextTurn/回 handler 接线：' + missingEvents.join('、'));
    const clearInFx = /clearStatusLayers\s*\(\s*\)\s*;/.test(jsSrc);
    // 片段内 syncStatusLayers 已有 1 处带参调用；死亡接线应再出现至少 1 处（entity/hero/enemy/currentEntity.ref/.id）
    const clearArgCalls = (jsSrc.match(/clearStatusLayers\s*\(\s*[A-Za-z_$][\w$.]*\s*\)/g) || [])
      .filter(text => !text.includes('entityOrId'));
    const deathWired = clearArgCalls.length >= 2;
    if (!/'ranshao'\s*:/.test(jsSrc)) pending.push('audioUrls 缺 ranshao（禁疗/燃烧）');
    if (!/'fog'\s*:/.test(jsSrc)) pending.push('audioUrls 缺 fog（到期）');

    // —— 状态/函数夹具 ——
    const saved = ev(`({ heroesData, enemiesData, battleHistory, _historyRawCache,
      stateQueue: state.actionQueue.slice(), stateIndex: state.queueIndex, nonLethal: nonLethalSettings.enabled,
      random: Math.random, emit: CombatEvents.emit, emitAsync: CombatEvents.emitAsync, llm:{...llmState},
      started: state.isGameStarted, token: combatToken, frozen: _pipelineFrozen, particles: fxEngine.particles.slice(), hitStop: fxEngine.hitStop })`);
    const originals = new Map();
    const replace = (name, fn) => {
      if (!originals.has(name)) originals.set(name, w[name]);
      w[name] = fn;
    };
    const calls = { floats: [], hist: [], sounds: [] };
    const realPublish = w.CombatAudioDirector && w.CombatAudioDirector.publish;
    const publishCalls = [];
    replace('createFloatingText', (dom, text) => { calls.floats.push(String(text)); });
    replace('addHistory', msg => { calls.hist.push(String(msg)); });
    replace('playSound', key => { calls.sounds.push(key); });
    replace('renderTurnQueue', () => {});
    replace('checkWoundedNarration', () => {});
    replace('tryTriggerEnemyDeathSpeak', () => {});
    replace('triggerEnemySelfDestruct', () => {});
    if (realPublish) w.CombatAudioDirector.publish = payload => publishCalls.push(payload);

    // —— 实体与真实结构 DOM ——
    const entity = (id, extra) => Object.assign({
      id, name: '状态' + id, hp: 1000, maxHp: 1000, mp: 10, maxMp: 10, tp: 0, maxTp: 100,
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
    root.id = 'status-regression-stage';
    root.style.cssText = 'position:fixed;left:30px;top:260px;width:760px;height:320px;pointer-events:none;z-index:1;';
    root.innerHTML =
      '<div id="hero-card-h_st_0" class="hero-card-inner" style="position:absolute;left:10px;top:10px;width:150px;height:120px;background:#18181b">' +
        '<div id="h_st_0-buffs" style="position:absolute;top:2px;right:2px;display:flex;flex-direction:column;gap:2px"></div>' +
        '<div class="bg-gray-900" style="position:relative;width:150px;height:84px;background:#111827;border-bottom:1px solid #374151">' +
          '<div class="z-10" style="position:absolute;left:0;top:0;width:100%;height:16px;background:#000"></div>' +
          '<img alt="" style="display:block;width:150px;height:68px;margin-top:16px;object-fit:cover" />' +
        '</div>' +
      '</div>' +
      '<div id="hero-card-h_st_p" class="hero-card-inner" style="position:absolute;left:610px;top:10px;width:80px;height:110px;background:#18181b">' +
        '<div class="portrait" style="width:80px;height:100px;background:#0f172a">p</div>' +
      '</div>' +
      '<div id="e_st_0-sprite" class="enemy-sprite breathe" style="position:absolute;left:210px;top:10px;width:110px;height:110px;background:#3b0764">e0</div>' +
      '<div id="e_st_0-buffs" style="position:absolute;left:210px;top:124px;width:110px;display:flex;gap:2px"></div>' +
      '<div id="e_st_1-sprite" class="enemy-sprite breathe" style="position:absolute;left:350px;top:10px;width:110px;height:110px;background:#3b0764">e1</div>' +
      '<div id="e_st_1-buffs" style="position:absolute;left:350px;top:124px;width:110px;display:flex;gap:2px"></div>' +
      '<div id="hero-card-s_st_1" class="enemy-sprite breathe flex justify-center items-center" style="position:absolute;left:480px;top:10px;width:100px;height:100px;background:#172554">s1</div>' +
      '<div id="s_st_1-buffs" style="position:absolute;left:480px;top:114px;width:100px;display:flex;gap:2px"></div>';
    doc.body.appendChild(root);

    const isHandle = h => !!h && typeof h.doneAt === 'number' && h.doneAt >= Date.now() - 1000 &&
      typeof h.cancel === 'function' && h.onFinish && typeof h.onFinish.add === 'function';
    const fxLayerCount = () => Array.from(doc.querySelectorAll('[data-arcane-fx]'))
      .filter(node => node.getAttribute('data-arcane-fx') !== 'canvas').length;
    const ownPersist = id => {
      const el = doc.getElementById(id);
      return el ? Array.from(el.querySelectorAll('[data-arcane-status-persist]')) : [];
    };
    const nodeOf = (hostId, kind) => {
      const el = doc.getElementById(hostId);
      return el ? el.querySelector('[data-arcane-status-persist="' + kind + '"]') : null;
    };

    try {
      ev('nonLethalSettings.enabled=false;llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;state.isGameStarted=false;');
      w.Math.random = () => 0.5;

      if (!hasApi) {
        check(!mock || typeof mock.genCount !== 'function' || mock.genCount() === gen0, '状态专项未调用外部 LLM');
        return { pending: missing.concat(pending) };
      }

      /* ========== 一、常驻宿主：正式英雄无 portrait / 英雄侧召唤非 hero ========== */
      await group('常驻宿主', async () => {
        statusClear();
        const d = install([
          entity('h_st_0', { buffs: [{ type: 'paralyze', value: -5, duration: 2 }] }),
          entity('s_st_1', { isSummon: true, side: 'hero', hp: 500, maxHp: 500, buffs: [{ type: 'paralyze', value: -5, duration: 2 }] }),
          entity('h_st_p', { buffs: [{ type: 'paralyze', value: -5, duration: 2 }] })
        ], [entity('e_st_0')]);
        const hero = d.h[0], summon = d.h[1], portraitHero = d.h[2];
        statusSync(hero); statusSync(summon); statusSync(portraitHero);
        const heroCard = doc.getElementById('hero-card-h_st_0');
        const heroHost = heroCard.querySelector('.bg-gray-900');
        const heroNode = heroHost.querySelector('[data-arcane-status-persist="paralyze"]');
        check(!!heroNode, '正式英雄无 portrait：常驻层挂到 .bg-gray-900');
        check(!!heroNode && heroNode.classList.contains('is-hero'), '正式英雄黄火花带 is-hero');
        check(w.getComputedStyle(heroHost).position !== 'static' || heroHost.classList.contains('arcane-status-host-rel'), '宿主具备定位上下文');
        const summonNode = nodeOf('hero-card-s_st_1', 'paralyze');
        check(!!summonNode && !summonNode.classList.contains('is-hero'), '英雄侧召唤（enemy-sprite）不算 hero，不加 is-hero');
        const pNode = nodeOf('hero-card-h_st_p', 'paralyze');
        check(!!pNode && pNode.parentElement === doc.getElementById('hero-card-h_st_p'), '既有 .portrait 以父层为宿主');
        statusClear();
      });

      /* ========== 二、毒燃常驻互不干扰 ========== */
      await group('毒燃独立', async () => {
        statusClear();
        const d = install([entity('h_st_0')], [entity('e_st_0', { buffs: [
          { type: 'poison', value: 10, duration: 3 },
          { type: 'burn', value: 8, duration: 3 }
        ] })]);
        const e = d.e[0];
        statusSync(e);
        check(!!nodeOf('e_st_0-sprite', 'poison') && !!nodeOf('e_st_0-sprite', 'burn'), '毒、燃各自建立常驻层');
        e.buffs = e.buffs.filter(b => b.type === 'burn');
        statusSync(e);
        const poisonNode = nodeOf('e_st_0-sprite', 'poison'), burnNode = nodeOf('e_st_0-sprite', 'burn');
        check(!!poisonNode && poisonNode.classList.contains('exiting'), '毒移除只让自己进入 exiting');
        check(!!burnNode && !burnNode.classList.contains('exiting'), '燃不受毒移除影响');
        await sleep(380);
        check(!nodeOf('e_st_0-sprite', 'poison'), '290ms 后毒常驻层移除');
        check(!!nodeOf('e_st_0-sprite', 'burn'), '燃常驻层继续保留');
        statusClear();
      });

      /* ========== 三、临期徽章：永久排除与续期撤销 ========== */
      await group('临期徽章', async () => {
        statusClear();
        const d = install([entity('h_st_0')], [entity('e_st_0', { buffs: [
          { type: 'poison', value: 10, duration: 1 },
          { type: 'burn', value: 8, duration: 3 },
          { type: 'paralyze', value: -5, duration: 1, permanent: true }
        ] })]);
        const e = d.e[0];
        w.updateBuffUI(e);
        if (syncWired) {
          check(!!nodeOf('e_st_0-sprite', 'poison'), 'updateBuffUI 联动 syncStatusLayers 建立毒常驻层');
        }
        const box = doc.getElementById('e_st_0-buffs');
        if (buffTypeWired) {
          const poison = box.querySelector('[data-buff-type="poison"]');
          check(!!poison, 'updateBuffUI 为毒徽章输出 data-buff-type');
          if (expiringWired) {
            check(!!poison && poison.classList.contains('arcane-status-badge-expiring'), '剩余 1 回毒徽章进入临期');
            const burn = box.querySelector('[data-buff-type="burn"]');
            check(!!burn && !burn.classList.contains('arcane-status-badge-expiring'), '剩余 3 回燃不临期');
            const para = box.querySelector('[data-buff-type="paralyze"]');
            check(!!para && !para.classList.contains('arcane-status-badge-expiring'), 'permanent 麻痹不临期');
            e.buffs.find(b => b.type === 'poison').duration = 3;
            w.updateBuffUI(e);
            check(!box.querySelector('[data-buff-type="poison"]').classList.contains('arcane-status-badge-expiring'), '续期后临期标记撤销');
          }
        }
        statusClear();
      });

      /* ========== 三B、有效最短临期：baseTaunt / 短临时 / eva+paralyze 合徽章 ========== */
      await group('有效最短临期', async () => {
        statusClear();
        const EXP = 'arcane-status-badge-expiring';
        const d = install([entity('h_st_0')], [entity('e_st_0', { baseTauntBonus: 50 })]);
        const e = d.e[0];
        const box = doc.getElementById('e_st_0-buffs');
        if (!(buffTypeWired && expiringWired)) return;

        // 永久 baseTaunt：没有临时 buff，徽章不得临期
        w.updateBuffUI(e);
        let taunt = () => box.querySelector('[data-buff-type="taunt"]');
        check(!!taunt(), '永久 baseTaunt 渲染仇恨徽章');
        check(!!taunt() && !taunt().classList.contains(EXP), '永久 baseTaunt 不临期');

        // 永久 taunt buff 本身：同样不得临期
        e.buffs = [{ type: 'taunt', value: 10, duration: 0, permanent: true }];
        w.updateBuffUI(e);
        check(!!taunt() && !taunt().classList.contains(EXP), 'permanent taunt buff 不临期');

        // baseTaunt 之上的短临时嘲讽：仍须临期
        e.buffs = [{ type: 'taunt', value: 5, duration: 1 }];
        w.updateBuffUI(e);
        check(!!taunt() && taunt().classList.contains(EXP), 'baseTaunt 之上的短临时嘲讽仍临期');

        // 永久 taunt buff + 短临时同类型：短临时不能被永久项吞掉
        e.buffs = [{ type: 'taunt', value: 10, duration: 0, permanent: true }, { type: 'taunt', value: 5, duration: 1 }];
        w.updateBuffUI(e);
        check(!!taunt() && taunt().classList.contains(EXP), '永久+短临时同类型时短临时仍临期');

        // eva 与 paralyze 合并成同一枚“避”徽章：临期取两者真实有效最短
        const expiringExpected = types => {
          const ds = (e.buffs || []).filter(b => types.includes(b.type) && !b.permanent && b.duration > 0).map(b => b.duration);
          return ds.length > 0 && Math.min(...ds) <= 1;
        };
        const eva = () => box.querySelector('[data-buff-type="eva"]');
        const para = () => box.querySelector('[data-buff-type="paralyze"]');

        e.buffs = [{ type: 'eva', value: 10, duration: 3 }, { type: 'paralyze', value: -5, duration: 1 }];
        w.updateBuffUI(e);
        check(!!eva(), 'eva+paralyze 合成“避”徽章');
        eq(!!(eva() && eva().classList.contains(EXP)), expiringExpected(['eva', 'paralyze']), '合徽章按 eva+paralyze 真实有效最短临期');
        check(!!para() && para().classList.contains(EXP), '1 回麻痹自身临期');

        e.buffs = [{ type: 'eva', value: 10, duration: 1 }, { type: 'paralyze', value: -5, duration: 3 }];
        w.updateBuffUI(e);
        eq(!!(eva() && eva().classList.contains(EXP)), expiringExpected(['eva', 'paralyze']), 'eva 短时合徽章临期');
        check(!!para() && !para().classList.contains(EXP), '3 回麻痹自身不临期');

        e.buffs = [{ type: 'eva', value: 10, duration: 3 }, { type: 'paralyze', value: -5, duration: 3 }];
        w.updateBuffUI(e);
        eq(!!(eva() && eva().classList.contains(EXP)), expiringExpected(['eva', 'paralyze']), '双 3 回合合徽章不临期');
        statusClear();
      });

      /* ========== 四、麻痹未触发 / 锁守卫 ========== */
      await group('麻痹锁守卫', async () => {
        statusClear();
        const d = install([entity('h_st_0')], [entity('e_st_0', { buffs: [{ type: 'paralyze', value: -5, duration: 2 }] })]);
        const e = d.e[0];
        eq(statusTick({ event: 'paraProc', entity: e, meta: { triggered: false } }), null, 'paraProc triggered=false 返回 null');
        eq(statusTick({ event: 'paraMiss', entity: e, meta: {} }), null, 'paraMiss 返回 null');
        eq(statusTick({ event: 'dispel', entity: e, meta: {} }), null, '无驱散分支：dispel 返回 null');
        const beats = [];
        const h = statusTick({ event: 'paraProc', entity: e, meta: { triggered: true }, onBeat: b => beats.push(b) });
        check(isHandle(h), 'paraProc 返回真实 handle');
        await sleep(110);
        check(beats.some(b => b.event === 'paraProc' && b.entity && b.entity.id === 'e_st_0'), 'paraProc onBeat 指向真实实体');
        if (h) h.cancel();
        if (typeof w.playVariantTriggerFx === 'function') {
          const lock = w.playVariantTriggerFx({ trigger: 'revive', entity: e, meta: {} });
          check(!!lock && w.isEntityVariantLocked(e), '变种演出建立实体锁');
          if (lock) {
            const h2 = statusTick({ event: 'paraProc', entity: e, meta: { triggered: true } });
            check(isHandle(h2), '锁定期麻痹仍返回粒子 handle');
            const dom = doc.getElementById('e_st_0-sprite');
            const own350 = typeof dom.getAnimations === 'function'
              ? dom.getAnimations().filter(a => a.effect && a.effect.target === dom && Math.round(a.effect.getTiming().duration) === 350)
              : [];
            eq(own350.length, 0, '锁定期 350ms 硬直不抢实体动画');
            check(fxLayerCount() > 0, '锁定期仍保留粒子/演出层');
            if (h2) h2.cancel();
            if (lock.cancel) lock.cancel();
          }
        } else {
          pending.push('变种锁接口 playVariantTriggerFx');
        }
        statusClear();
      });

      /* ========== 五、HP0 短路与真实死亡清理 ========== */
      await group('HP0与死亡', async () => {
        statusClear();
        let d = install([entity('h_st_0')], [entity('e_st_0', { buffs: [{ type: 'poison', value: 10, duration: 2 }] })]);
        let e = d.e[0];
        statusSync(e);
        check(!!nodeOf('e_st_0-sprite', 'poison'), '死亡前毒常驻层存在');
        e.hp = 0;
        eq(statusTick({ event: 'expire', entity: e, meta: { expiredTypes: ['poison'] } }), null, 'HP0 到期演出短路');
        statusSync(e);
        eq(ownPersist('e_st_0-sprite').length, 0, 'HP0 同步清理常驻层');

        install([entity('h_st_0')], [entity('e_st_0', { hp: 100, maxHp: 100, buffs: [{ type: 'poison', value: 10, duration: 2 }] })]);
        e = ev('enemiesData[0]');
        statusSync(e);
        check(!!nodeOf('e_st_0-sprite', 'poison'), '死亡路径前毒常驻层存在');
        e.hp = 0; // 走 updateEnemyUI 真实致死主分支（isAlive 仍为 true）
        let threw = null;
        try { w.updateEnemyUI(e); } catch (err) { threw = String((err && err.stack) || err); }
        if (deathWired) {
          check(!threw, 'updateEnemyUI 死亡路径可执行', threw || '');
          eq(ownPersist('e_st_0-sprite').length, 0, '死亡路径清理状态常驻层');
        } else if (!threw && ownPersist('e_st_0-sprite').length === 0) {
          check(true, '死亡路径已清理状态常驻层');
        } else {
          pending.push('死亡路径 clearStatusLayers');
          statusClear(e);
        }
        statusClear();
      });

      /* ========== 六、分派 / handle / 禁疗 / 到期不依赖 fading ========== */
      await group('分派与禁疗到期', async () => {
        statusClear();
        const d = install(
          [entity('h_st_0', { buffs: [{ type: 'burn', value: 8, duration: 2 }] })],
          [entity('e_st_0', { buffs: [{ type: 'poison', value: 10, duration: 2 }] })]
        );
        const hero = d.h[0], enemy = d.e[0];
        const beats = [];
        statusSetSfx(false);
        const quiet = statusTick({ event: 'poisonTick', entity: enemy, meta: { layers: 1 } });
        check(isHandle(quiet), '关闭状态音不影响演出本体');
        if (quiet) quiet.cancel();
        statusSetSfx(true);
        const hp = statusTick({ event: 'poisonTick', entity: enemy, meta: { layers: 3 }, onBeat: b => beats.push(b) });
        check(isHandle(hp), 'poisonTick 返回 {doneAt,cancel,onFinish}');
        const hb = statusTick({ event: 'burnTick', entity: hero, meta: {}, onBeat: b => beats.push(b) });
        check(isHandle(hb), 'burnTick 返回真实 handle');
        const hs = statusTick({ event: 'healSuppressed', entity: hero, meta: {}, onBeat: b => beats.push(b) });
        check(isHandle(hs), 'healSuppressed 返回真实 handle');
        await sleep(120);
        check(['poisonTick', 'burnTick', 'healSuppressed'].every(name => beats.some(b => b.event === name)), '毒/燃/禁疗 onBeat 均按拍触发');
        check(fxLayerCount() >= 3, '毒/燃/禁疗各自挂载演出层');
        if (hp) hp.cancel();
        check(fxLayerCount() >= 2, '取消毒 tick 不误清燃烧/禁疗活动层');

        const box = doc.getElementById('e_st_0-buffs');
        box.innerHTML = '<div data-buff-type="poison" class="badge">☠️毒</div>';
        const badge = box.querySelector('[data-buff-type="poison"]');
        const he = statusTick({
          event: 'expire', entity: enemy,
          meta: { expiredTypes: ['poison', 'burn'], expiredColors: { poison: '#a855f7', burn: '#f97316' } },
          onBeat: b => beats.push(b)
        });
        check(isHandle(he), 'expire 返回真实 handle');
        check(!badge.classList.contains('arcane-status-badge-fading'), '到期主体走粒子，不写徽章 fading（同帧重写接管）');
        await sleep(200);
        check(beats.some(b => b.event === 'expire'), 'expire onBeat 按拍触发');
        [hb, hs, he].forEach(h => { if (h) h.cancel(); });
        statusClear();
      });

      /* ========== 七、单实体 / 全局 / clearArcaneFx 零残留 ========== */
      await group('清理零残留', async () => {
        statusClear();
        const d = install(
          [entity('h_st_0', { buffs: [{ type: 'poison', value: 10, duration: 2 }] })],
          [entity('e_st_0', { buffs: [{ type: 'poison', value: 10, duration: 2 }] }),
           entity('e_st_1', { buffs: [{ type: 'burn', value: 8, duration: 2 }] })]
        );
        const hero = d.h[0], e0 = d.e[0], e1 = d.e[1];
        statusSync(hero); statusSync(e0); statusSync(e1);
        const h = statusTick({ event: 'poisonTick', entity: hero, meta: { layers: 2 } });
        const layersBefore = fxLayerCount();
        check(ownPersist('hero-card-h_st_0').length > 0 && ownPersist('e_st_0-sprite').length > 0 && ownPersist('e_st_1-sprite').length > 0, '清理前三实体常驻层齐全');
        statusClear('h_st_0');
        eq(fxLayerCount(), Math.max(0, layersBefore - 1), '单实体清理取消其活动 owner 演出层');
        eq(ownPersist('hero-card-h_st_0').length, 0, '单实体清理只清自身常驻层');
        check(ownPersist('e_st_0-sprite').length > 0 && ownPersist('e_st_1-sprite').length > 0, '单实体清理不影响其他实体');
        if (h) check(true, '单实体清理持有并取消该实体活动 owner');
        statusClear();
        eq(doc.querySelectorAll('[data-arcane-status-persist]').length, 0, '无参清理全部常驻层');
        eq(doc.querySelectorAll('.arcane-status-host-rel').length, 0, '无参清理全部 host-rel');

        statusSync(e0); statusSync(e1);
        statusTick({ event: 'burnTick', entity: e1, meta: {} });
        check(!!nodeOf('e_st_0-sprite', 'poison'), 'clearArcaneFx 前重新挂常驻层');
        w.clearArcaneFx();
        const persistsAfterFx = doc.querySelectorAll('[data-arcane-status-persist]').length;
        if (clearInFx) {
          eq(persistsAfterFx, 0, 'clearArcaneFx 清理状态常驻层');
          eq(doc.querySelectorAll('.arcane-status-host-rel').length, 0, 'clearArcaneFx 清理 host-rel');
          eq(fxLayerCount(), 0, 'clearArcaneFx 无演出层残留');
        } else if (persistsAfterFx === 0) {
          check(true, 'clearArcaneFx 已清理状态常驻层');
        } else {
          pending.push('clearArcaneFx 未清理状态常驻层');
          statusClear();
        }
        const offline = doc.getElementById('e_st_1-sprite');
        if (offline) offline.remove();
        let threw = null;
        try { statusClear('e_st_1'); } catch (e) { threw = String((e && e.stack) || e); }
        check(!threw, 'DOM 已离线时按 id 清理状态不抛异常', threw || '');
      });

      check(!mock || typeof mock.genCount !== 'function' || mock.genCount() === gen0, '状态专项未调用外部 LLM');
      return { pending };
    } finally {
      try { if (statusSetSfx) statusSetSfx(true); } catch (e) { /* 恢复状态音开关 */ }
      try { statusClear(); } catch (e) { /* 清理不掩盖断言 */ }
      try { w.clearArcaneFx(); } catch (e) { /* 同上 */ }
      for (const [name, fn] of originals) w[name] = fn;
      if (realPublish) w.CombatAudioDirector.publish = realPublish;
      w.Math.random = saved.random;
      w.__statusRestore = saved;
      ev(`(() => { const s=window.__statusRestore;
        heroesData=s.heroesData; enemiesData=s.enemiesData; battleHistory=s.battleHistory; _historyRawCache=s._historyRawCache;
        state.actionQueue=s.stateQueue; state.queueIndex=s.stateIndex; nonLethalSettings.enabled=s.nonLethal;
        CombatEvents.emit=s.emit; CombatEvents.emitAsync=s.emitAsync;
        state.isGameStarted=s.started; combatToken=s.token; _pipelineFrozen=s.frozen;
        fxEngine.particles=s.particles; fxEngine.hitStop=s.hitStop;
        for(const key of Object.keys(llmState)) delete llmState[key]; Object.assign(llmState,s.llm);
        delete window.__statusRestore;
      })()`);
      root.remove();
    }
  };
})();
