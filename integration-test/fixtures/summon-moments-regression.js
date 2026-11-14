/* ============================================================================
   召唤三瞬回归（Enter 默认三幕 / Exit 散逸 / Guard 扑挡）+ 真实接线
   调用：window.runSummonMomentsRegression({ w, check, eq, mock, source })
   - w     ：真实引擎 iframe 的 window（含已装载的真实函数）
   - check ：harness 的 (cond, name, extra)；eq：harness 的 (actual, expect, name)
   - mock  ：harness 的 MOCK（仅用 genCount 验证全程未经 LLM）
   - source：readRpgSource() 可读源码，用于静态接线断言；缺省则跳过静态项
   覆盖：接口导出 / skippedByFxTag / Enter 三幕与 beforeEnter 汇合上限 / Exit 四拍
   与 bypass 与幂等 / Guard deferred+impact+release 与 guardianDown 链与 clear /
   音频通道（playCustomAudio spy 记录、mixer.prepare stub 免网络预热）/
   summonFromWorldbook 批量单次 Enter 与 fxTag 透传 / initUIIncrementalSummon /
   renderEnemyFormation({summoning:true}) / 真实自动护主 E2E（真实 applySingleTagEffect，
   存活承伤、被击穿、二次反应、复活与自爆排除）。
   约束：真实 iframe 引擎运行、不复制业务实现；计时断言只依赖 setTimeout 拍点，
   不依赖 rAF 是否推进；临时替换按引用保存并在 finally 恢复（同一 realm，
   禁 JSON 序列化函数）；数据（combatToken/_pipelineFrozen/heroesData/enemiesData/
   state.actionQueue/pendingSummons/battleHistory）按引用存入 iframe 临时对象，
   finally 全量恢复，不污染后续全量。
   ========================================================================== */
(function () {
  'use strict';
  window.runSummonMomentsRegression = async function (opts) {
    const w = opts && opts.w;
    const check = opts && opts.check;
    const eq = opts && opts.eq;
    const mock = opts && opts.mock;
    const source = (opts && opts.source) || '';
    if (!w || typeof check !== 'function') {
      if (typeof check === 'function') check(false, '召唤三瞬回归：缺少 w（引擎 iframe window）');
      return { skipped: true };
    }
    const eqFn = typeof eq === 'function' ? eq : function (a, b, n) { check(JSON.stringify(a) === JSON.stringify(b), n); };
    const pending = [];
    const soft = (cond, name, reason) => {
      if (cond) { check(true, name); return; }
      pending.push(name + ' — ' + (reason || '接口/行为未落地'));
      check(false, name + '（待对齐：' + (reason || '接口/行为未落地') + '）');
    };
    const has = (n) => typeof w[n] === 'function';
    const srcOf = (n) => { try { return has(n) ? String(w[n]) : ''; } catch (e) { return ''; } };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = (fn, timeout, step) => new Promise((res) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        let v = false; try { v = !!fn(); } catch (e) { /* ignore */ }
        if (v || Date.now() - t0 > (timeout || 3000)) { clearInterval(iv); res(v); }
      }, step || 12);
    });
    const doneOf = (h, timeout) => {
      if (!h || !h.done || typeof h.done.then !== 'function') return Promise.resolve('no-done');
      return Promise.race([
        Promise.resolve(h.done).then((v) => (v === true ? 'ok' : 'false')).catch(() => 'err'),
        sleep(timeout || 4000).then(() => 'timeout')
      ]);
    };
    const heldOf = (h, ms) => new Promise((res) => {
      if (!h || !h.done || typeof h.done.then !== 'function') { res(false); return; }
      let settled = false;
      h.done.then(() => { settled = true; }, () => { settled = true; });
      sleep(ms || 400).then(() => res(!settled));
    });
    const num = (v) => typeof v === 'number' && isFinite(v);
    // 按花括号配对抽取函数体（用于静态接线断言，不做邻近距离猜测）
    const fnBody = (src, name) => {
      const m = src.match(new RegExp('function ' + name + '\\s*\\('));
      if (!m) return null;
      const start = src.indexOf('{', m.index);
      if (start < 0) return null;
      let depth = 0, quote = '';
      for (let i = start; i < src.length; i++) {
        const c = src[i];
        if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; }
        else if (c === '"' || c === "'" || c === '`') quote = c;
        else if (c === '{') depth++;
        else if (c === '}' && !--depth) return src.slice(start, i + 1);
      }
      return null;
    };

    /* ---------- 临时替换管理（同 realm 按引用保存 / finally 恢复） ---------- */
    const stubs = [];
    const stub = (key, val) => {
      stubs.push({ key, had: Object.prototype.hasOwnProperty.call(w, key), old: w[key] });
      try { w[key] = val; } catch (e) { /* 只读属性：忽略 */ }
    };
    const restoreAll = () => {
      while (stubs.length) {
        const s = stubs.pop();
        try { if (s.had) w[s.key] = s.old; else delete w[s.key]; } catch (e) { /* ignore */ }
      }
    };

    const mod = w.eval('arcaneVfxModule');
    const doc = w.document;
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : -1;
    const mixer = w.eval('CombatAudioMixer');
    const mixerStubs = [];
    const stubAudio = () => {
      stub('playCustomAudio', (url, vol, rate, cueOpts) => {
        audioRec.push({ url: String(url || ''), vol, rate, opts: Object.assign({}, cueOpts) });
        const cue = () => {};
        cue.done = Promise.resolve(true);
        return cue;
      });
      stub('playSound', () => {});
    };

    /* ---------- 舞台与数据（按引用存 iframe 临时对象，finally 全量恢复） ---------- */
    const root = doc.createElement('div');
    root.id = 'summon-moments-stage';
    root.style.cssText = 'position:fixed;left:20px;top:260px;width:900px;height:430px;pointer-events:none';
    doc.body.appendChild(root);
    const audioRec = [];
    const GUARD_SKILL = { name: '舍身守护', type: '[单体]', type2: '[无]', type3: '[无]', power: 0, hit: 100, cost: 0,
      damageType: '近战', isReaction: false, reactionTarget: 'all', kanpoTarget: null, sheshenTarget: 'all', _ownerOnly: true };
    const ATK_SKILL = { name: '猛击', type: '[单体]', type2: '[无]', type3: '[无]', power: 50, hit: 100, cost: 0, damageType: '近战', fxTag: null };
    const mkE = (id, name, extra) => Object.assign({
      id: id, name: name, isAlive: true, hp: 60, maxHp: 60, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 8, def: 0, spd: 50, shield: 0, buffs: [], skills: [], items: [], classType: null,
      isSummon: true, side: 'hero'
    }, extra);
    const mkHero = (id, name) => mkE(id, name, { isSummon: false });
    // 守护者：内建全能舍身（仅替 owner 挡单体致死），同 summonFromWorldbook 注入的 guardSkill 同构
    const mkGuardian = (id, name, extra) => mkE(id, name, Object.assign({ summonOwnerId: 'h_sm_o', skills: [Object.assign({}, GUARD_SKILL)] }, extra));
    // 舞台 wrap：hero 侧 card id=hero-card-<id>，enemy 侧 sprite id=<id>-sprite（与 getEntitySpriteDom 一致）
    const mkWrap = (id, emoji, isEnemy, left, top) => {
      const old = doc.getElementById((isEnemy ? 'enemy-box-' : 'hero-wrap-') + id);
      if (old) old.remove();
      const wrap = doc.createElement('div');
      wrap.id = (isEnemy ? 'enemy-box-' : 'hero-wrap-') + id;
      wrap.style.cssText = 'position:absolute;left:' + (left || 0) + 'px;top:' + (top || 0) + 'px;width:140px;height:170px;transform:scale(0.72)';
      const innerId = isEnemy ? (id + '-sprite') : ('hero-card-' + id);
      wrap.innerHTML = '<div id="' + innerId + '" class="enemy-sprite" style="position:relative;width:120px;height:120px;font-size:64px">' + emoji + '</div>';
      root.appendChild(wrap);
      return wrap;
    };
    const heroIds = ['h_sm_c', 'h_sm_o',
      's_sm_sk', 's_sm_1', 's_sm_1b', 's_sm_1c', 's_sm_m1', 's_sm_m2', 's_sm_m3', 's_sm_m4', 's_sm_m5', 's_sm_m6', 's_sm_m7', 's_sm_m8',
      's_sm_ex1', 's_sm_ex2', 's_sm_d1',
      's_sm_g1', 's_sm_g2', 's_sm_g3', 's_sm_g4', 's_sm_g5', 's_sm_gA', 's_sm_gD'];
    const enemyIds = ['e_sm_c', 'e_sm_r', 'e_sm_s'];
    const heroEntities = heroIds.map((id, i) => {
      if (id === 'h_sm_c') return mkHero(id, '施法者');
      if (id === 'h_sm_o') return mkHero(id, '护主目标');
      if (/^s_sm_g/.test(id)) return mkGuardian(id, '守护者' + i);
      return mkE(id, '召唤体' + i);
    });
    const enemyEntities = [
      mkE('e_sm_c', '进攻敌人', { side: 'enemy', emoji: '👹', atk: 40, hp: 100, maxHp: 100 }),
      mkE('e_sm_r', '旧敌人', { side: 'enemy', emoji: '👾', hp: 100, maxHp: 100 }),
      mkE('e_sm_s', '敌方召唤', { side: 'enemy', emoji: '🧟', hp: 100, maxHp: 100 })
    ];
    enemyEntities.forEach((e) => { e.isSummon = e.id === 'e_sm_s'; e.row = 'front'; });

    try {
      // 数据快照（按引用）：combatToken/_pipelineFrozen/heroesData/enemiesData/state/pendingSummons/battleHistory
      mod.clearArcaneFx();
      w.eval('window.__smrSaved = { heroesData, enemiesData, state: Object.assign({}, state), pendingSummons, frozen: _pipelineFrozen, token: combatToken, history: battleHistory, rawHistory: _historyRawCache, barrier: teamBarrier, barrierMax: teamBarrierMax, nonLethal: nonLethalSettings.enabled, allySpeak: llmState.allyAutoSpeak };');
      w.eval('heroesData=' + JSON.stringify(heroEntities) + ';enemiesData=' + JSON.stringify(enemyEntities) + ';pendingSummons=[];battleHistory=[];_historyRawCache="";_pipelineFrozen=false;state.actionQueue=[];state.queueIndex=0;teamBarrier=0;teamBarrierMax=0;nonLethalSettings.enabled=false;llmState.allyAutoSpeak=false;');
      const R = (expr) => w.eval(expr);
      const ref = (id) => R('(heroesData.concat(enemiesData).find(function(x){return x.id===' + JSON.stringify(id) + ';}))');
      // 音频：identity 保持开启，stub playCustomAudio 记录 url/opts 并返回带 done 的真实函数 cue；
      // mixer 对象方法 prepare 置为 resolved，避免真实网络预热（不改词法绑定）
      mod.setIdentitySfx(true);
      stubAudio();
      const stubMixer = (key, val) => {
        mixerStubs.push({ key, had: Object.prototype.hasOwnProperty.call(mixer, key), old: mixer[key] });
        try { mixer[key] = val; } catch (e) { /* ignore */ }
      };
      stubMixer('prepare', async () => undefined);

      /* ============ S1 接口导出 ============ */
      const hasEnter = !!(mod && typeof mod.playSummonEnter === 'function');
      const hasExit = !!(mod && typeof mod.playSummonExit === 'function');
      const hasGuard = !!(mod && typeof mod.playSummonGuard === 'function');
      const clearSummon = (mod && typeof mod.clearSummonState === 'function') ? mod.clearSummonState
        : (typeof w.clearSummonState === 'function' ? w.clearSummonState : null);
      check(hasEnter, 'arcaneVfxModule.playSummonEnter 导出');
      check(hasExit, 'arcaneVfxModule.playSummonExit 导出');
      check(hasGuard, 'arcaneVfxModule.playSummonGuard 导出');
      check(!!clearSummon, 'clearSummonState(entityOrId?) 导出');
      check(typeof w.isSummonDedicatedFx === 'function', 'window.isSummonDedicatedFx 导出');
      check(typeof w.playSummonEnter === 'function' && typeof w.playSummonExit === 'function' && typeof w.playSummonGuard === 'function',
        'window 同时导出三瞬入口');

      /* ============ S2 isSummonDedicatedFx 真值表（真实执行） ============ */
      const isDed = (mod && typeof mod.isSummonDedicatedFx === 'function') ? mod.isSummonDedicatedFx
        : (typeof w.isSummonDedicatedFx === 'function' ? w.isSummonDedicatedFx : null);
      const DED_TAGS = ['高阶召唤术', '蝎眼钥匙', '圣域帷幕', '塞赫美特之愠', '逆咒归源镜', '谐律之庇', '静默之域', '碎裂之响'];
      if (isDed) {
        DED_TAGS.forEach((t) => eqFn(isDed(t), true, '真实：专属 fxTag 命中固定集合 → ' + t));
        eqFn(isDed(''), false, '真实：空串不命中专属集合');
        eqFn(isDed(null), false, '真实：null 不命中专属集合');
        eqFn(isDed('火球术'), false, '真实：非专属 fxTag 不命中');
      } else {
        soft(false, 'isSummonDedicatedFx 专属集合真值表', '接口未落地');
      }

      /* ============ S3 Enter 专属 fxTag 同步跳过（真实执行） ============ */
      if (hasEnter && isDed) {
        try {
          const skBeats = [];
          mkWrap('s_sm_sk', '🐍', false, 0, 0);
          const t0 = Date.now();
          const h = mod.playSummonEnter(ref('h_sm_c'), [ref('s_sm_sk')], { side: 'hero', fxTag: '圣域帷幕' },
            (ev) => skBeats.push(Object.assign({ at: Date.now() - t0 }, ev)));
          check(skBeats.length === 1 && skBeats[0].phase === 'skippedByFxTag', '真实：专属 fxTag 同步 skippedByFxTag（唯一拍点）');
          check(!!h && h.skipped === true, '真实：skipped 句柄 skipped:true');
          const r = await doneOf(h, 1200);
          eqFn(r, 'ok', '真实：skipped 句柄 done 已 resolve true');
          check(h && num(h.doneAt) && h.doneAt <= Date.now(), '真实：skipped doneAt 已到期（同步完成）');
          eqFn(skBeats.filter((b) => b.phase === 'circle').length, 0, '真实：专属跳过不播默认阵成');
          const before = audioRec.length;
          await sleep(120);
          eqFn(audioRec.length, before, '真实：专属跳过无默认阵音');
        } catch (e) {
          check(false, '真实：Enter 专属跳过场景异常', String((e && e.message) || e));
        }
      } else {
        soft(false, 'Enter 专属 fxTag 同步 skippedByFxTag（真实执行）', 'playSummonEnter/isSummonDedicatedFx 未落地');
      }

      /* ============ S4 Enter 默认三幕（真实执行，宽松计时） ============ */
      if (hasEnter) {
        try {
          const beats = [];
          mkWrap('s_sm_1', '🦎', false, 150, 0);
          const t0 = Date.now();
          const h = mod.playSummonEnter(ref('h_sm_c'), [ref('s_sm_1')], { side: 'hero' },
            (ev) => beats.push(Object.assign({ at: Date.now() - t0 }, ev)));
          const phase = (n) => beats.filter((b) => b.phase === n);
          check(beats.length >= 1 && beats[0].phase === 'circle', '真实：无专属时同步 circle（阵成）');
          const gotRift = await until(() => phase('riftOpen').length > 0, 2400);
          const riftAt = phase('riftOpen')[0] ? phase('riftOpen')[0].at : -1;
          check(gotRift && riftAt >= 330 && riftAt <= 1800, '真实：riftOpen 在 400ms 级触发（实际 ' + riftAt + 'ms）');
          await until(() => phase('manifest').length > 0, 1500);
          check(phase('manifest').length === 1 && phase('manifest')[0].index === 0 && !phase('manifest')[0].fast,
            '真实：单只 manifest index=0 完整凝形（非快闪）');
          await until(() => phase('settled').length > 0, 1600);
          check(phase('settled').length === 1, '真实：Enter settled 落定拍点');
          const r = await doneOf(h, 3200);
          eqFn(r, 'ok', '真实：Enter handle.done resolve true');
          check(h && num(h.doneAt) && h.doneAt >= t0 && h.doneAt <= t0 + 3000, '真实：doneAt 为完成时间戳');
          check(h && typeof h.cancel === 'function', '真实：Enter 句柄带 cancel');
        } catch (e) {
          check(false, '真实：Enter 单只三幕场景异常', String((e && e.message) || e));
        }
        try {
          const beats2 = [];
          const units = ['s_sm_m1', 's_sm_m2', 's_sm_m3', 's_sm_m4', 's_sm_m5', 's_sm_m6', 's_sm_m7', 's_sm_m8']
            .map((id, i) => { mkWrap(id, '🐤', false, 150 + (i % 4) * 150, Math.floor(i / 4) * 180); return ref(id); });
          const t1 = Date.now();
          const h2 = mod.playSummonEnter(ref('h_sm_c'), units, { side: 'hero' },
            (ev) => beats2.push(Object.assign({ at: Date.now() - t1 }, ev)));
          const ph2 = (n) => beats2.filter((b) => b.phase === n);
          const gotRift2 = await until(() => ph2('riftOpen').length > 0, 2400);
          check(gotRift2, '真实：8 只批次 riftOpen 触发');
          await until(() => ph2('manifest').length >= 8, 2400);
          eqFn(ph2('manifest').length, 8, '真实：8 只逐只 manifest 拍点');
          const m3 = ph2('manifest').find((b) => b.index === 3), m4 = ph2('manifest').find((b) => b.index === 4);
          check(m3 && m4 && !m3.fast && m4.fast === true, '真实：index>=4 进入快闪（m3 完整 / m4 快闪）');
          await until(() => ph2('settled').length > 0, 2000);
          const sAt = ph2('settled')[0] ? ph2('settled')[0].at : -1;
          const rAt = ph2('riftOpen')[0] ? ph2('riftOpen')[0].at : 0;
          check(sAt >= 0 && sAt - rAt <= 1800, '真实：凝形总时长 <=1800ms（实际 ' + (sAt - rAt) + 'ms）');
          const r2 = await doneOf(h2, 3500);
          eqFn(r2, 'ok', '真实：8 只批次 done resolve true');
        } catch (e) {
          check(false, '真实：Enter 8 只批次场景异常', String((e && e.message) || e));
        }
        try {
          // beforeEnter 汇合：资料慢于 400ms → 拍点延后至资料就绪（400ms 只是最短拍）
          const beats3 = [];
          mkWrap('s_sm_1b', '🦎', false, 150, 0);
          const t2 = Date.now();
          const beforeEnter = new Promise((res) => setTimeout(res, 650));
          const h3 = mod.playSummonEnter(ref('h_sm_c'), [ref('s_sm_1b')], { side: 'hero', beforeEnter },
            (ev) => beats3.push(Object.assign({ at: Date.now() - t2 }, ev)));
          await sleep(450);
          check(!beats3.some((b) => b.phase === 'riftOpen'), '真实：资料未就绪时不提前 riftOpen');
          const gotRift3 = await until(() => beats3.some((b) => b.phase === 'riftOpen'), 2000);
          const riftAt3 = (beats3.find((b) => b.phase === 'riftOpen') || {}).at;
          check(gotRift3 && riftAt3 >= 600 && riftAt3 <= 1800, '真实：riftOpen 与 beforeEnter 汇合（实际 ' + riftAt3 + 'ms）');
        } catch (e) {
          check(false, '真实：beforeEnter 汇合场景异常', String((e && e.message) || e));
        } finally {
          try { clearSummon && clearSummon(); } catch (e) { /* ignore */ }
        }
        try {
          // beforeEnter 悬置 → 汇合上限（至多 1800ms 放行视觉，不无限等待、不取消资料读取）
          const beats4 = [];
          mkWrap('s_sm_1c', '🦎', false, 150, 0);
          const t3 = Date.now();
          const never = new Promise(() => {});
          const h4 = mod.playSummonEnter(ref('h_sm_c'), [ref('s_sm_1c')], { side: 'hero', beforeEnter: never },
            (ev) => beats4.push(Object.assign({ at: Date.now() - t3 }, ev)));
          const gotRift4 = await until(() => beats4.some((b) => b.phase === 'riftOpen'), 2400);
          const riftAt4 = (beats4.find((b) => b.phase === 'riftOpen') || {}).at;
          check(gotRift4 && riftAt4 >= 900 && riftAt4 <= 1950, '真实：beforeEnter 悬置时按上限放行（实际 ' + riftAt4 + 'ms）');
        } catch (e) {
          check(false, '真实：beforeEnter 上限场景异常', String((e && e.message) || e));
        } finally {
          try { clearSummon && clearSummon(); } catch (e) { /* ignore */ }
        }
      } else {
        soft(false, 'Enter 默认三幕（circle/riftOpen/manifest/settled 真实执行）', 'playSummonEnter 未落地');
      }

      /* ============ S5 Exit 散逸（真实执行） ============ */
      if (hasExit) {
        try {
          const beats = [];
          const wrap = mkWrap('s_sm_ex1', '🪼', false, 150, 0);
          const t0 = Date.now();
          const h = mod.playSummonExit(ref('s_sm_ex1'), { side: 'hero' }, (ev) => beats.push(Object.assign({ at: Date.now() - t0 }, ev)));
          const ph = (n) => beats.filter((b) => b.phase === n);
          check(!!h, '真实：Exit 返回句柄');
          check(beats.length >= 1 && beats[0].phase === 'destabilize', '真实：Exit 同步 destabilize（失稳泛光）');
          await until(() => ph('unravel').length > 0, 1200);
          const unrAt = ph('unravel')[0] ? ph('unravel')[0].at : -1;
          check(unrAt >= 120 && unrAt <= 450, '真实：unravel ~160ms（实际 ' + unrAt + 'ms）');
          await until(() => ph('extinguish').length > 0, 1400);
          const extAt = ph('extinguish')[0] ? ph('extinguish')[0].at : -1;
          check(extAt >= 480 && extAt <= 860, '真实：extinguish ~560ms（实际 ' + extAt + 'ms）');
          await until(() => ph('vacated').length > 0, 1600);
          const vacAt = ph('vacated')[0] ? ph('vacated')[0].at : -1;
          check(vacAt >= 650 && vacAt <= 1100, '真实：vacated ~750ms（实际 ' + vacAt + 'ms）');
          const r = await doneOf(h, 2200);
          eqFn(r, 'ok', '真实：Exit done resolve true（840ms 全程）');
          eqFn(wrap.style.transform, 'scale(0.72)', '真实：Exit 后 wrap 原 scale 保留');
          eqFn(doc.querySelectorAll('[data-summon-tag]').length, 0, '真实：Exit 清场零残留');
        } catch (e) {
          check(false, '真实：Exit 默认四拍场景异常', String((e && e.message) || e));
        }
        try {
          const exBeats = [];
          mkWrap('s_sm_ex2', '💣', false, 300, 0);
          const ex2 = ref('s_sm_ex2'); ex2.explode = { type: '群火', power: 50 };
          const h2 = mod.playSummonExit(ex2, { side: 'hero' }, (ev) => exBeats.push(ev));
          check(h2 === null, '真实：entity.explode 直接 bypass 返回 null');
          check(exBeats.length === 1 && exBeats[0].phase === 'exitBypassed', '真实：bypass 通知 exitBypassed');
          const h3 = mod.playSummonExit(ref('s_sm_d1'), { side: 'hero', exitCause: 'reviveIntercept' }, (ev) => exBeats.push(ev));
          check(h3 === null, '真实：exitCause=reviveIntercept 直接 bypass 返回 null');
        } catch (e) {
          check(false, '真实：Exit bypass 场景异常', String((e && e.message) || e));
        }
        try {
          // 同实体幂等：第二次 Exit 返回同一句柄，全程仅一次 vacated
          const beats5 = [];
          mkWrap('s_sm_d1', '🪼', false, 300, 0);
          const hA = mod.playSummonExit(ref('s_sm_d1'), { side: 'hero' }, (ev) => beats5.push(ev));
          const hB = mod.playSummonExit(ref('s_sm_d1'), { side: 'hero' }, (ev) => beats5.push(ev));
          check(!!hA && hB === hA, '真实：同实体重复 Exit 返回同一句柄（幂等）');
          const rA = await doneOf(hA, 2200);
          eqFn(rA, 'ok', '真实：幂等句柄 done resolve true');
          eqFn(beats5.filter((b) => b.phase === 'vacated').length, 1, '真实：同实体仅一次 vacated');
        } catch (e) {
          check(false, '真实：Exit 同实体幂等场景异常', String((e && e.message) || e));
        }
      } else {
        soft(false, 'Exit 四拍/bypass/幂等（真实执行）', 'playSummonExit 未落地');
      }

      /* ============ S6 Guard 扑挡（真实执行） ============ */
      if (hasGuard) {
        try {
          // A. survived：ready → impact('hit') 只命中视觉不归位不resolve → release 收尾回位
          const gb = [];
          mkWrap('s_sm_g1', '🛡️', false, 150, 0);
          mkWrap('h_sm_o', '🧝', false, 300, 0);
          const g1 = mod.playSummonGuard(ref('s_sm_g1'), ref('h_sm_o'), { deferredRelease: true }, (ev) => gb.push(ev));
          check(!!g1 && typeof g1.ready.then === 'function', '真实：Guard 返回 handle.ready');
          const ready = await Promise.race([g1.ready, sleep(1600).then(() => null)]);
          check(!!ready && ready.ok === true && !!ready.blockPt && num(ready.blockPt.x) && num(ready.blockPt.y),
            '真实：180ms 扑挡后 ready resolve {ok,blockPt}');
          check(num(g1.dashX) && num(g1.dashY), '真实：handle 透出 dashX/dashY/blockPt');
          check(gb.length >= 1 && gb[0].phase === 'dash', '真实：Guard 先扑挡（dash 拍点）');
          const ph = (n) => gb.filter((b) => b.phase === n);
          if (typeof g1.impact === 'function') g1.impact('hit');
          eqFn(ph('blockImpact').length, 1, '真实：impact 命中钢蓝盾（blockImpact 一次）');
          check(await heldOf(g1, 350), '真实：impact 仅命中视觉，done 不提前 resolve（保持身前）');
          const r = await (typeof g1.release === 'function'
            ? Promise.race([Promise.resolve(g1.release()).then(() => 'ok'), sleep(2600).then(() => 'timeout')])
            : 'no-release');
          eqFn(r, 'ok', '真实：release() 收尾并 resolve done true');
          await until(() => ph('return').length > 0, 1500);
          check(ph('return').length === 1, '真实：格挡+360ms 停驻后回位（return 拍点一次）');
          check(typeof g1.isReleased === 'function' && g1.isReleased() === true, '真实：isReleased() 为 true');
          if (typeof g1.release === 'function') { g1.release(); await sleep(180); }
          eqFn(ph('blockImpact').length + ph('return').length, 2, '真实：重复 release 无重复盾/音/位移');
          clearSummon && clearSummon();
        } catch (e) {
          check(false, '真实：Guard survived 场景异常', String((e && e.message) || e));
        }
        try {
          // B. impact('hit') 后仍 held；secondDodge 只一次默认闪避；guardianDown 由 release 驱动直接 Exit
          const gb2 = [];
          mkWrap('s_sm_g2', '🛡️', false, 150, 0);
          const g2 = mod.playSummonGuard(ref('s_sm_g2'), ref('h_sm_o'), { deferredRelease: true }, (ev) => gb2.push(ev));
          const ready2 = await Promise.race([g2.ready, sleep(1600).then(() => null)]);
          check(!!ready2 && ready2.ok === true, '真实：deferredRelease ready 照常 resolve');
          check(await heldOf(g2, 500), '真实：deferredRelease 保持身前待业务结果（done 未提前 resolve）');
          const ph2 = (n) => gb2.filter((b) => b.phase === n);
          if (typeof g2.impact === 'function') g2.impact('secondDodge');
          eqFn(ph2('secondDodge').length, 1, '真实：secondDodge 只一次默认闪避');
          check(await heldOf(g2, 350), '真实：secondDodge impact 后仍保持身前（不归位）');
          const r2 = await (typeof g2.release === 'function'
            ? Promise.race([Promise.resolve(g2.release()).then(() => 'ok'), sleep(2600).then(() => 'timeout')])
            : 'no-release');
          eqFn(r2, 'ok', '真实：release 收尾 secondDodge 路径 done true');
          eqFn(ph2('secondDodge').length, 1, '真实：release 不重复 secondDodge 视觉');
          clearSummon && clearSummon();
        } catch (e) {
          check(false, '真实：Guard deferredRelease/secondDodge 场景异常', String((e && e.message) || e));
        }
        try {
          // C. guardianDown：release 驱动 → 身前 +210ms 直接 Exit（exitChain:vacated，没有先回位）
          const gb3 = [];
          mkWrap('s_sm_g4', '🛡️', false, 150, 0);
          const wrap3 = doc.getElementById('hero-wrap-s_sm_g4');
          const g3 = mod.playSummonGuard(ref('s_sm_g4'), ref('h_sm_o'), { deferredRelease: true }, (ev) => gb3.push(ev));
          await Promise.race([g3.ready, sleep(1600)]);
          const r3 = await (typeof g3.release === 'function'
            ? Promise.race([Promise.resolve(g3.release('guardianDown')).then(() => 'ok'), sleep(3400).then(() => 'timeout')])
            : 'no-release');
          eqFn(r3, 'ok', '真实：release(guardianDown) 直接 Exit 完成');
          const ph3 = (n) => gb3.filter((b) => b.phase === n);
          check(ph3('return').length === 0, '真实：guardianDown 没有先回位');
          check(gb3.some((b) => b.phase === 'exitChain:vacated'), '真实：exitChain 链到 vacated（业务移除前不打断）');
          eqFn(wrap3.style.transform, 'scale(0.72)', '真实：guardianDown Exit 后 wrap 原位恢复');
          clearSummon && clearSummon();
        } catch (e) {
          check(false, '真实：Guard guardianDown 场景异常', String((e && e.message) || e));
        }
        try {
          // D. clearSummonState：解除所有 Promise 等待并恢复调用前初值
          const wrap4 = mkWrap('s_sm_g5', '🛡️', false, 150, 0);
          const spr4 = doc.getElementById('hero-card-s_sm_g5');
          const z0 = wrap4.style.zIndex, t0v = wrap4.style.transform, f0 = spr4.style.filter;
          const gb4 = [];
          const g4 = mod.playSummonGuard(ref('s_sm_g5'), ref('h_sm_o'), { deferredRelease: true }, (ev) => gb4.push(ev));
          await Promise.race([g4.ready, sleep(1600)]);
          clearSummon(ref('s_sm_g5').id);
          const r4 = await doneOf(g4, 1400);
          eqFn(r4, 'false', '真实：clear 解除所有 Promise 等待（done resolve false）');
          eqFn(wrap4.style.zIndex, z0, '真实：clear 恢复 wrap zIndex 调用前初值');
          eqFn(wrap4.style.transform, t0v, '真实：clear 恢复初始 transform');
          eqFn(spr4.style.filter, f0, '真实：clear 恢复 filter 调用前初值');
          clearSummon();
          check(true, '真实：clearSummonState() 全清不抛错');
        } catch (e) {
          check(false, '真实：clearSummonState 场景异常', String((e && e.message) || e));
        }
      } else {
        soft(false, 'Guard 扑挡/deferred/impact/guardianDown/clear（真实执行）', 'playSummonGuard 未落地');
      }

      /* ============ S7 音频接线（真实出音 + 结构断言） ============ */
      {
        const urls = w.eval('audioUrls') || {};
        ['light_charge', 'light_impact', 'link_chime', 'resist_phantom', 'rage_exit', 'sheshen_armor_step', 'parry_perfect', 'avoid_dash_perfect', 'hide']
          .forEach((k) => check(!!urls[k], 'audioUrls 既有音源注册 ' + k));
        check(!('armor_step_1' in urls) && !('armor_step_2' in urls), 'armor_step_1/2 仅内部别名不新增 audioUrls 注册');
        check(audioRec.length > 0, '真实：三瞬经 playCustomAudio 真实出音（identity 开，共 ' + audioRec.length + ' 次）');
        check(!audioRec.some((r) => r.url.indexOf('data:') === 0), '真实：三瞬不使用 Base64 音频');
        const urlVals = Object.keys(urls).map((k) => urls[k]);
        const badUrls = audioRec.filter((r) => r.url && urlVals.indexOf(r.url) === -1).map((r) => r.url);
        eqFn(badUrls.length, 0, '真实：三瞬音频全部来自既有 audioUrls（含别名映射）');
        soft(audioRec.some((r) => r.opts && r.opts.owner), '三瞬音频挂接 owner 清理', '未挂 owner');
        soft(audioRec.some((r) => r.opts && r.opts.category === 'B'), '三瞬音频走 B 轨类别', '类别未对齐');
        if (source) {
          const sumRunBody = fnBody(source, 'summonRun');
          const pscBody = fnBody(source, 'playSampleClip');
          soft(!!(sumRunBody && sumRunBody.includes('playSampleClip')), '静态：summonRun.owner.sound 经 playSampleClip 出音', '接线未对齐');
          soft(!!(pscBody && pscBody.includes('audioUrls') && pscBody.includes('playCustomAudio')), '静态：playSampleClip 引用 audioUrls/playCustomAudio', '接线未对齐');
          soft(sumRunBody && sumRunBody.includes('sheshen_armor_step') && sumRunBody.includes('parry_perfect'),
            '静态：armor_step/parry/avoid_dash2 内部别名映射', '别名映射未对齐');
          check(!source.includes('SUMMON_SAMPLE_B64') && !/data:audio/.test(source), '静态：源码不携带演示 Base64 采样');
        }
      }

      /* ============ S8 真实接线：分类/静态接线/summonFromWorldbook 批量 ============ */
      {
        if (has('classifyEnemyWindup')) {
          eqFn(w.classifyEnemyWindup(null), 'red-single', '真实：classifyEnemyWindup(null) 兜底 red-single（保留）');
          eqFn(w.classifyEnemyWindup({ type: '[单体]' }), 'red-single', '真实：近战单体分类保留 red-single');
          eqFn(w.classifyEnemyWindup({ type: '[群攻]' }), 'red-wide', '真实：近战群攻分类保留 red-wide');
        } else {
          soft(false, 'classifyEnemyWindup 分类（真实执行）', '函数未落地');
        }
        const pwSrc = srcOf('playEnemyWindup');
        if (pwSrc) check(pwSrc.includes('red-single') && pwSrc.includes('enemy-omen'), '静态：playEnemyWindup 支持 red-single 与 enemy-omen（红单前摇保留）');
        else soft(false, 'playEnemyWindup 分类支持（静态源码）', '函数未落地');
        const estSrc = srcOf('executeSummonTurn');
        soft(estSrc && estSrc.includes('classifyEnemyWindup'), '静态：executeSummonTurn 复用 classifyEnemyWindup 分类前摇', '未复用分类');
        const psaSrc = srcOf('prepareSingleAttackHit');
        soft(psaSrc && psaSrc.includes('summonGuardHandle'), '静态：prepareSingleAttackHit 透传 summonGuardHandle', '透传未落地');
        const effectSrc = source || srcOf('applySingleTagEffect');
        soft(effectSrc && effectSrc.includes("impact('secondDodge'") && effectSrc.includes("release('secondDodge'"),
          '静态：applySingleTagEffect 二次闪避接线 impact/release(secondDodge)', '二次闪避接线未落地');
        const tasSrc = srcOf('tryAutoSummonGuard');
        if (tasSrc) {
          check(!/segRoll|Math\.random/.test(tasSrc), '静态：tryAutoSummonGuard 不触碰随机 segRoll/伤害公式');
          check(tasSrc.includes('summonOwnerId'), '静态：tryAutoSummonGuard 仍只认我方 owner 致死候选');
        } else {
          soft(false, 'tryAutoSummonGuard 边界保持（静态源码）', '函数未落地');
        }
        // summonFromWorldbook：opts.fxTag 直传，整批挂载后仅 1 次 Enter，spawnBurstAura 不叠播
        try {
          const caster = ref('h_sm_c');
          w.__smrHeroesRef = R('heroesData');
          w.eval('heroesData=' + JSON.stringify([heroEntities[0]]) + ';');
          w.eval('state.isGameStarted=true');
          const enterCalls = []; const uiCalls = []; const seq = []; const auraCalls = [];
          let wn = 0;
          const fakeEnter = function (casterArg, targets, meta) {
            enterCalls.push({ caster: casterArg, targets: targets || [], meta: meta || {} });
            seq.push('enter');
            return { done: Promise.resolve(true), skipped: false, cancel: function () {}, doneAt: Date.now() };
          };
          stub('parseSummonList', () => [{ name: '测试召唤物', count: 2 }]);
          stub('createSummonEntity', async () => mkE('s_sm_w' + (++wn), '测试召唤物'));
          stub('initUIIncrementalSummon', (ent) => { uiCalls.push(ent && ent.id); seq.push('ui'); });
          stub('renderTurnQueue', () => {});
          stub('reorderRemainingQueue', () => {});
          stub('spawnBurstAura', (d) => { auraCalls.push(d); });
          stub('playSummonEnter', fakeEnter);
          const okGo = await w.summonFromWorldbook(caster, '测试召唤物×2', { fxTag: '寒冰箭' });
          eqFn(okGo, true, '真实：summonFromWorldbook 批量召唤成功');
          eqFn(uiCalls.length, 2, '真实：整批逐只增量挂载（initUIIncrementalSummon ×2，唯一 id 不重复）');
          eqFn(uiCalls.filter((x) => x === uiCalls[0]).length, 1, '真实：fake create 唯一 id 无重复');
          eqFn(enterCalls.length, 1, '真实：created 整批挂载后仅 1 次 Enter');
          if (enterCalls.length === 1) {
            eqFn(enterCalls[0].targets.length, 2, '真实：单次 Enter 覆盖整批 targets');
            eqFn(enterCalls[0].meta.fxTag, '寒冰箭', '真实：opts.fxTag 直传 Enter meta.fxTag');
            eqFn(enterCalls[0].meta.side, 'hero', '真实：Enter meta.side 为召唤侧');
          }
          eqFn(auraCalls.length, 0, '真实：defaultEnter 批次旧每只 spawnBurstAura 不叠播');
          soft(seq.indexOf('enter') > seq.lastIndexOf('ui'), 'Enter 在整批挂载之后发出', '顺序未对齐');
        } catch (e) {
          check(false, '真实：summonFromWorldbook 批量接线场景异常', String((e && e.message) || e));
        } finally {
          restoreAll(); stubAudio(); // 还原业务入口，音频仍隔离，不对真实网络发请求。
          try { w.eval('if (window.__smrHeroesRef) { heroesData=window.__smrHeroesRef; delete window.__smrHeroesRef; }'); } catch (e) { /* ignore */ }
          try { w.eval('summonEnterPending.clear()'); } catch (e) { /* ignore */ }
          try { w.eval('document.querySelectorAll(".arcane-summon-pending").forEach(function(el){el.classList.remove("arcane-summon-pending");});'); } catch (e) { /* ignore */ }
        }
        // flushPendingSummons 保留机制
        try {
          w.eval('pendingSummons.push({side:"hero",entity:' + JSON.stringify(mkE('s_sm_p', '挂起召唤物')) + '});');
          if (typeof w.flushPendingSummons === 'function') w.flushPendingSummons();
          mod.clearSummonState();
          const got = R('heroesData.some(function(x){return x.id==="s_sm_p";})');
          eqFn(got, true, '真实：flushPendingSummons 保留机制仍生效');
          w.eval('heroesData=heroesData.filter(function(x){return x.id!=="s_sm_p";});');
        } catch (e) {
          check(false, '真实：flushPendingSummons 场景异常', String((e && e.message) || e));
        }
      }

      /* ============ S9 UI 接线（真实函数） ============ */
      {
        try {
          // A. 我方召唤增量挂载：大 emoji 无外框/无常驻名字，幂等
          const hc = doc.getElementById('heroes-container');
          doc.querySelectorAll('[id="hero-wrap-s_sm_sk"]').forEach(el => el.remove()); // 同时清理舞台与 flush 重建的同名夹具。
          if (!hc || !has('initUIIncrementalSummon')) {
            soft(false, 'initUIIncrementalSummon 真实挂载', '缺少 heroes-container 或函数未落地');
          } else {
            const rowExisted = !!doc.getElementById('ally-summon-row');
            const entRef = ref('s_sm_sk');
            w.initUIIncrementalSummon(entRef);
            const wrap = doc.getElementById('hero-wrap-s_sm_sk');
            check(!!wrap, '真实：增量挂载生成 hero-wrap 召唤行条目');
            const card = doc.getElementById('hero-card-s_sm_sk');
            check(!!card && card.classList.contains('enemy-sprite') && !card.classList.contains('hero-card-inner'),
              '真实：召唤物为极简大 emoji 图标（无外框）');
            const named = wrap && wrap.querySelector('.group > .opacity-0');
            check(!!named && named.textContent === entRef.name && named.classList.contains('group-hover:opacity-100'),
              '真实：无常驻名字（名字仅 hover 提示）', wrap && wrap.innerHTML.slice(0, 500));
            w.initUIIncrementalSummon(entRef);
            eqFn(doc.querySelectorAll('#hero-wrap-s_sm_sk').length, 1, '真实：重复挂载幂等不重复');
            if (wrap) wrap.remove();
            const row = doc.getElementById('ally-summon-row');
            if (row && !rowExisted) row.remove();
          }
        } catch (e) {
          check(false, '真实：initUIIncrementalSummon 场景异常', String((e && e.message) || e));
        }
        try {
          // B. renderEnemyFormation({summoning:true})：不对旧敌人重播 anim-enter-enemy；敌方召唤排尾 arcane-enemy-summon-visual
          const ec = doc.getElementById('enemies-container');
          if (!ec || typeof w.renderEnemyFormation !== 'function') {
            soft(false, 'renderEnemyFormation({summoning:true}) 真实刷新', '缺少 enemies-container 或函数未落地');
          } else {
            w.eval('state.isGameStarted=true;enemiesData=' + JSON.stringify([enemyEntities[1]]) + ';');
            w.renderEnemyFormation();
            const box0 = doc.getElementById('enemy-box-e_sm_r');
            check(!!box0, '真实：敌方阵容渲染生成 enemy-box');
            check(box0.classList.contains('anim-enter-enemy'), '真实：常规刷新保留入场动画基线');
            await sleep(950);
            w.renderEnemyFormation({ summoning: true });
            const box1 = doc.getElementById('enemy-box-e_sm_r');
            check(!!box1 && !box1.classList.contains('anim-enter-enemy'),
              '真实：summoning 刷新不对旧敌人重播 anim-enter-enemy');
            w.eval('enemiesData=' + JSON.stringify([enemyEntities[1], enemyEntities[2]]) + ';');
            w.renderEnemyFormation({ summoning: true });
            const sBox = doc.getElementById('enemy-box-e_sm_s');
            check(!!sBox, '真实：敌方召唤条目入阵');
            check(!!(sBox && (sBox.querySelector('.arcane-enemy-summon-visual') || sBox.classList.contains('arcane-enemy-summon-visual'))),
              '真实：敌方召唤排尾独立图标 class arcane-enemy-summon-visual（48px/56px）');
            if (source) check(source.includes('.arcane-enemy-summon-visual'), '静态：arcane-enemy-summon-visual 尺寸 CSS 入包');
            eqFn(sBox && sBox.dataset.row, 'front', '真实：row 归属逻辑不变（默认前排）');
            w.eval('enemiesData=[];');
            w.renderEnemyFormation({ summoning: true });
          }
        } catch (e) {
          check(false, '真实：renderEnemyFormation({summoning:true}) 场景异常', String((e && e.message) || e));
        }
      }

      // 护主已 release 的归位窗口再次死亡，不能把 vacated 委托给已关闭的 release。
      mod.clearArcaneFx();
      const lateGuard = mkGuardian('s_sm_late', '归位中守护者');
      const lateOwner = mkHero('h_sm_late', '主人');
      w.eval('heroesData=' + JSON.stringify([lateOwner, lateGuard]) + ';enemiesData=[];');
      const lateG = w.eval('heroesData[1]'), lateO = w.eval('heroesData[0]');
      lateG.dom = mkWrap(lateG.id, '🛡️', false, 150, 0);
      lateO.dom = mkWrap(lateO.id, '🧝', false, 300, 0);
      const late = mod.playSummonGuard(lateG, lateO, { deferredRelease: true });
      await late.ready; late.impact('hit'); late.release('survived');
      let lateVacated = 0;
      const lateExit = mod.playSummonExit(lateG, {}, ev => { if (ev.phase === 'vacated') lateVacated++; });
      eqFn(await doneOf(lateExit), 'ok', '归位窗口死亡创建独立散逸句柄');
      eqFn(lateVacated, 1, '归位窗口死亡仍触发一次 vacated');
      mod.clearArcaneFx();
      stub('initUI', () => {});
      w.eval('state.isGameStarted=true;pendingSummons=[{side:"hero",entity:{id:"s_sm_no_dom",isSummon:true,side:"hero",isAlive:true}}];');
      w.flushPendingSummons();
      check(!w.eval('summonEnterPending.has("s_sm_no_dom")'), '遗留未挂载批次不残留永久隐藏标记');
      restoreAll(); stubAudio();

      /* ============ S10 真实承伤 / 二次反应 / 复活 / 自爆排除 ============ */
      const originalRandom = w.Math.random;
      const originalGuard = w.playSummonGuard;
      const originalPrompt = w.promptReaction;
      try {
        const cases = [
          { name: '存活承伤', hp: 500, expected: 'survived' },
          { name: '被击穿', hp: 20, expected: 'guardianDown' },
          { name: '二次闪避', hp: 500, expected: 'secondDodge', reaction: true },
          { name: '复活拦截', hp: 20, expected: 'survived', revive: 1 }
        ];
        for (const item of cases) {
          mod.clearArcaneFx();
          const owner = mkHero('h_sm_o', '护主目标'); owner.hp = owner.maxHp = 10; owner.spd = 1;
          const guardian = mkGuardian('s_sm_actual', '守护者', { hp: item.hp, maxHp: item.hp, spd: 1, reviveCount: item.revive || 0 });
          const attacker = mkE('e_sm_actual', '进攻敌人', { isSummon: false, side: 'enemy', atk: 10, hp: 1000, maxHp: 1000, spd: 1, row: 'front' });
          if (item.reaction) guardian.skills.push(w.parseSkill('【折影步】[回避;power:900][MP:4][反应:近战][法术][特效:折影步]'));
          w.eval('heroesData=' + JSON.stringify([owner, guardian]) + ';enemiesData=' + JSON.stringify([attacker]) + ';state.isGameStarted=true;_pipelineFrozen=false;teamBarrier=0;teamBarrierMax=0;nonLethalSettings.enabled=false;');
          const target = w.eval('heroesData[0]'), guard = w.eval('heroesData[1]'), foe = w.eval('enemiesData[0]');
          target.dom = mkWrap(target.id, '🧝', false, 300, 0);
          guard.dom = mkWrap(guard.id, '🛡️', false, 150, 0);
          foe.dom = mkWrap(foe.id, '👹', true, 470, 0);
          let prompts = 0, created = 0, handle = null;
          const beats = [], releases = [], impacts = [];
          w.promptReaction = () => { prompts++; return Promise.resolve(null); };
          w.playSummonGuard = (g, o, meta) => {
            created++;
            handle = originalGuard(g, o, meta, ev => beats.push(ev));
            const impact = handle.impact, release = handle.release;
            handle.impact = (outcome, opts) => { impacts.push(outcome); return impact(outcome, opts); };
            handle.release = outcome => { releases.push(outcome); return release(outcome); };
            return handle;
          };
          w.Math.random = () => 0.999;
          const skill = Object.assign({}, ATK_SKILL, { guaranteedHit: true });
          await w.applySingleTagEffect(foe, target, '[单体]', 50, 100, 1, 3, skill, 100, true);
          eqFn(created, 1, item.name + '：只触发一次自动护主');
          eqFn(prompts, 0, item.name + '：不弹窗、不进入英雄舍身');
          eqFn(target.hp, 10, item.name + '：owner 未承伤');
          check(releases.includes(item.expected) || item.expected === 'guardianDown' && handle.isReleased(), item.name + '：真实结果驱动 ' + item.expected);
          if (item.reaction) {
            eqFn(guard.hp, item.hp, '二次反应成功：召唤物未承伤');
            eqFn(guard.mp, 96, '二次反应只扣一次 MP4');
            eqFn(impacts.filter(x => x === 'secondDodge').length, 1, '真实二次闪避反馈一次');
            eqFn(beats.filter(x => x.phase === 'secondDodge').length, 1, '真实二次闪避拍点一次');
            eqFn(beats.filter(x => x.phase === 'blockImpact').length, 0, '二次闪避不叠钢蓝格挡');
          } else if (item.expected === 'guardianDown') {
            check(!guard.isAlive && guard.hp <= 0, '真实伤害击穿召唤物');
            check(!w.eval('heroesData.some(x=>x.id==="s_sm_actual")'), '真正死亡按原管线移出阵营');
            check(beats.some(x => x.phase === 'exitChain:vacated'), '被击穿在身前衔接散逸空位拍点');
            eqFn(beats.filter(x => x.phase === 'return').length, 0, '被击穿不先回位');
            check(!doc.getElementById('hero-wrap-s_sm_actual'), 'vacated 已移除实体 DOM');
          } else {
            check(guard.isAlive && guard.hp > 0, item.name + '：守护者仍存活');
            check(beats.some(x => x.phase === 'return'), item.name + '：真实收尾归位');
            check(!beats.some(x => x.phase.startsWith('exitChain:')), item.name + '：不误播散逸');
            if (item.revive) { eqFn(guard.reviveCount, 0, '复活先于散逸且只消费一次'); eqFn(guard.hp, 6, '复活仍按最大 HP30%'); }
            else check(guard.hp < item.hp, '存活路径对守护者结算真实伤害');
          }
        }
        mod.clearArcaneFx();
        let explodeCalls = 0;
        stub('triggerEnemySelfDestruct', () => { explodeCalls++; });
        const explosive = mkGuardian('s_sm_explode_actual', '自爆召唤', { hp: 0, maxHp: 20, explode: { type: '群火', power: 50 } });
        w.eval('heroesData=' + JSON.stringify([explosive]) + ';enemiesData=[];');
        const explosiveRef = w.eval('heroesData[0]');
        explosiveRef.dom = mkWrap(explosiveRef.id, '💣', false, 150, 0);
        const corpse = w.getEntitySpriteDom(explosiveRef);
        w.resolveSummonDeath(explosiveRef, corpse);
        eqFn(explodeCalls, 1, '自爆仍调用原自爆队列一次');
        eqFn(explosiveRef.selfDestructDom, corpse, '自爆保留真实尸体锚点');
        check(corpse.isConnected, '自爆尸体不被默认散逸移除');
        eqFn(doc.querySelectorAll('[data-summon-tag]').length, 0, '自爆分支不启动造物散逸');
      } finally {
        w.Math.random = originalRandom;
        w.playSummonGuard = originalGuard;
        w.promptReaction = originalPrompt;
      }

    } finally {
      // 清场在先（此时 token/frozen 尚未恢复），再恢复数据，避免污染后续全量
      try { if (mod && typeof mod.clearArcaneFx === 'function') mod.clearArcaneFx(); } catch (e) { /* ignore */ }
      try {
        const cs = (mod && typeof mod.clearSummonState === 'function' && mod.clearSummonState) || w.clearSummonState;
        if (typeof cs === 'function') cs();
      } catch (e) { /* ignore */ }
      mod.setIdentitySfx(true);
      while (mixerStubs.length) {
        const s = mixerStubs.pop();
        try { if (s.had) mixer[s.key] = s.old; else delete mixer[s.key]; } catch (e) { /* ignore */ }
      }
      restoreAll();
      w.eval('heroesData=window.__smrSaved.heroesData;enemiesData=window.__smrSaved.enemiesData;Object.assign(state,window.__smrSaved.state);pendingSummons=window.__smrSaved.pendingSummons;_pipelineFrozen=window.__smrSaved.frozen;combatToken=window.__smrSaved.token;battleHistory=window.__smrSaved.history;_historyRawCache=window.__smrSaved.rawHistory;teamBarrier=window.__smrSaved.barrier;teamBarrierMax=window.__smrSaved.barrierMax;nonLethalSettings.enabled=window.__smrSaved.nonLethal;llmState.allyAutoSpeak=window.__smrSaved.allySpeak;delete window.__smrSaved;');
      try { root.remove(); } catch (e) { /* ignore */ }
    }
    if (gen0 >= 0 && mock && typeof mock.genCount === 'function') {
      eqFn(mock.genCount(), gen0, '召唤三瞬回归全程未经 LLM');
    }
    check(pending.length === 0, '待对齐项为 0（当前 ' + pending.length + ' 项）' + (pending.length ? '：' + pending.join('；') : ''));
    return { pending: pending };
  };
})();
