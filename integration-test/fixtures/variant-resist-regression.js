/* 抗性 / 免疫演出回归（v12.10）：在真实 iframe 内挂载 index.html。
   静态组校验移植片段的接口、采样键、无 demo 宿主 / 合成音 / Base64、最多两层与 gradRing 小半径；
   真实绘制组只调用公开接口 playVariantResistFx / clearArcaneFx / clearVariantState，
   覆盖七种演出、两层错峰、ghost 去 buff/HP、hitRecoil 不被锁、cancel 与全局清理。
   业务接线（applyEnemyTypeResist 与五免疫分支）由主代理接；未落地时登记 pending，不判实现缺陷。 */
(function () {
  'use strict';
  window.runVariantResistRegression = async function ({ w, check, eq, mock, source }) {
    const doc = w.document;
    const ev = code => w.eval(code);
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;
    const pending = [];
    const group = async (name, fn) => {
      try { await fn(); }
      catch (e) { check(false, name + '执行异常', String((e && e.stack) || e)); }
    };
    const isHandle = h => !!h && typeof h.doneAt === 'number' && h.doneAt >= Date.now() - 1000 &&
      typeof h.cancel === 'function' && h.onFinish && typeof h.onFinish.add === 'function';

    /* ========== 一、静态：源码片段契约 ========== */
    const hasSrc = typeof source === 'string' && source.length > 2000;
    if (!hasSrc) pending.push('待对齐:source未注入');
    let body = '';
    if (hasSrc) {
      const begin = source.indexOf('抗性与免疫演出 BEGIN');
      const end = begin >= 0 ? source.indexOf('抗性与免疫演出 END', begin + 1) : -1;
      if (begin >= 0 && end > begin) body = source.slice(begin, end);
      else pending.push('待对齐:抗性模块源码段未定位（BEGIN/END 标记缺失）');
    }
    if (body) {
      eq(body.split('function playVariantResistFx').length - 1, 1, 'playVariantResistFx 全段仅定义一次');
      eq(body.split('window.playVariantResistFx').length - 1, 1, 'playVariantResistFx 全段仅导出一次');
      check(/function resistRect/.test(body), '提供 resistRect 轻适配（cx/cy/width/height）');
      check(/function resistLayer/.test(body) && /function resistTween/.test(body), '封装 resistLayer / resistTween');
      check(/function resistRadGrad/.test(body), 'demo 径向梯度改名为 resistRadGrad');
      check(!/function svgGlowDef/.test(body), '不覆盖正式 svgGlowDef（filter）');
      check(/layers\.slice\(0, 2\)/.test(body), '最多取两层');
      check(/owner\.at\(120/.test(body), '第二层 120ms 顺序错峰');
      check(/Math\.max\(980/.test(body), 'owner 生命周期至少 980ms');
      check(!/__playResistSample/.test(body), '不依赖 demo 宿主 __playResistSample');
      check(!/\b(whoosh|tone|click|crystal|chime|choir|drone)\s*\(/.test(body), '抗性片段无合成音兜底');
      check(!/base64|atob\s*\(/i.test(body), '抗性片段无 Base64');
      check(!/if\s*\([^)]*stateResult/.test(body) && !/stateResult\s*(===|!==)\s*['"]/.test(body), '不按 stateResult 条件拦/默认播放其他抵抗');
      const samples = ['resist_fluid', 'resist_phantom', 'resist_antimagic', 'resist_vital', 'resist_fireproof', 'resist_poisonproof', 'resist_ironbody'];
      const missingKeys = samples.filter(k => body.indexOf(k) < 0);
      eq(missingKeys, [], '七个 resist_* 真实采样键全部使用');
      const gradSizes = (body.match(/shape:\s*'gradRing'[^}]*size:\s*([0-9.]+)/g) || [])
        .map(s => parseFloat(s.match(/size:\s*([0-9.]+)/)[1]));
      check(gradSizes.length >= 3 && gradSizes.every(n => n >= 1 && n <= 1.5),
        'gradRing 使用 1~1.5 小半径（fluid/poisonproof/ironBody）', '实际 ' + JSON.stringify(gradSizes));
      check(/cloneVisualOnly\(r\.dom\)/.test(body) && /innerHTML = html/.test(body) && /firstElementChild/.test(body),
        'cloneVisualOnly 返回字符串后按 outerHTML 包裹首元素');
    }

    if (hasSrc) {
      check(/const out = 10 \+ p\.size \* \(1 - p\.life\) \* 44/.test(source), '正式 gradRing 半径实现未被改动');
      const bodyAfter = (start) => {
        const open = source.indexOf('{', start);
        if (open < 0) return '';
        let depth = 0;
        for (let i = open; i < source.length; i++) {
          if (source[i] === '{') depth++;
          else if (source[i] === '}') { depth--; if (!depth) return source.slice(start, i + 1); }
        }
        return '';
      };
      const arStart = source.indexOf('function applyEnemyTypeResist');
      const arSrc = arStart >= 0 ? bodyAfter(arStart) : '';
      if (!arSrc) pending.push('待对齐:applyEnemyTypeResist 源码段未定位');
      else {
        const floatGuard = /if\s*\(\s*dom\s*&&\s*!silent\s*\)/.test(arSrc) ||
          (/if\s*\(\s*!silent\s*\)/.test(arSrc) && /if\s*\(\s*dom\s*\)/.test(arSrc));
        check(floatGuard, '抗性飘字/演出受 !silent（及 dom）保护，兼容合并或嵌套写法');
        check(/hits\.length\s*&&\s*dmg\s*<\s*rawDmg/.test(arSrc), '仅在真实减伤（hits.length && dmg < rawDmg）时记抗性');
        const callAt = arSrc.indexOf('playVariantResistFx');
        if (callAt >= 0) {
          const outerAt = arSrc.search(/if\s*\(\s*hits\.length\s*&&\s*dmg\s*<\s*rawDmg\s*\)/);
          const pre = arSrc.slice(Math.max(0, callAt - 600), callAt);
          check(outerAt >= 0 && outerAt < callAt, '演出调用位于 hits.length && dmg < rawDmg 外层分支内');
          check(/!silent/.test(pre) && /\bdom\b/.test(pre), '演出调用受 !silent 与 dom 嵌套保护（兼容 !silent/dom 分写或合并）');
        } else {
          pending.push('待对齐:applyEnemyTypeResist 未接 playVariantResistFx');
        }
      }
      // 五免疫分支可以直调，也可以经 playVariantImmunity 帮助函数委托；帮助函数本体必须唯一真实调用。
      let helperAt = source.indexOf('function playVariantImmunity');
      const helperIsFn = helperAt >= 0;
      if (!helperIsFn) helperAt = source.indexOf('playVariantImmunity =');
      let helperBody = '';
      if (helperAt >= 0) {
        let nextDef = source.indexOf('\n    function ', helperAt + 10);
        if (nextDef < 0) nextDef = source.indexOf('\nfunction ', helperAt + 10);
        helperBody = (helperIsFn && bodyAfter(helperAt)) || (nextDef > helperAt ? source.slice(helperAt, nextDef) : source.slice(helperAt, helperAt + 1600));
        eq((helperBody.match(/playVariantResistFx\s*\(/g) || []).length, 1, 'playVariantImmunity 本体仅一处真实调用 playVariantResistFx');
        check(/arcaneVfxModule\s*\.\s*playVariantResistFx/.test(helperBody) || /playVariantResistFx\s*\(/.test(helperBody),
          'playVariantImmunity 委托 arcaneVfxModule.playVariantResistFx');
      }
      const nearCall = (needle) => {
        let count = 0, at = 0;
        while ((at = source.indexOf(needle, at)) >= 0) {
          const chunk = source.slice(at, at + 700);
          if (chunk.includes('playVariantImmunity') || chunk.includes('playVariantResistFx')) count++;
          at += needle.length;
        }
        return count;
      };
      const wired = nearCall('ctx.target.immunePoison') + nearCall('ctx.target.immuneBurn') +
        nearCall('target.immunePoison || (target.tags') + nearCall("target.tags.includes('[钢体]')");
      if (wired < 5) pending.push('待对齐:五免疫分支演出接线（已见 ' + wired + '/5 处免疫判定附近调用' + (helperAt >= 0 ? '，helper 已存在' : '，helper 未落地') + '）');
    }

    /* ========== 二、接口落地检查 ========== */
    const api = ['playVariantResistFx', 'clearArcaneFx', 'clearVariantState', 'isEntityVariantLocked', 'setVariantSfx'];
    const missing = api.filter(name => ev('typeof ' + name) !== 'function');
    if (missing.length) {
      console.log('[PENDING] 抗性演出接口未落地：' + missing.join('、'));
      missing.forEach(n => pending.push('接口缺失:' + n));
      return { pending };
    }
    const play = opts => w.playVariantResistFx(opts);
    const fxNodes = () => Array.from(doc.querySelectorAll('[data-resist-fx]'));
    const fxKinds = () => Array.from(new Set(fxNodes().map(n => n.dataset.resistKind)));
    const clearAll = () => { try { w.clearArcaneFx(); } catch (e) { /* 清理不掩盖断言 */ } try { w.clearVariantState(); } catch (e) { /* 同上 */ } };

    /* ========== 三、真实 DOM / 数据夹具 ========== */
    const saved = ev(`({ heroesData, enemiesData, random: Math.random })`);
    const restoreRandom = w.Math.random;
    const entity = (id, extra) => Object.assign({
      id, name: '抗性' + id, hp: 1000, maxHp: 1000, mp: 10, maxMp: 10, tp: 0, maxTp: 100,
      atk: 100, def: 0, spd: 50, hit: 100, eva: 0, taunt: 1, shield: 0, actCount: 1,
      isAlive: true, buffs: [], skills: [], items: [], tags: [], classType: null,
      isSummon: false, row: 'front', currentCharge: 0
    }, extra);
    ev('heroesData=' + JSON.stringify([entity('rh0')]) + ';enemiesData=' +
      JSON.stringify([entity('re_a'), entity('re_b'), entity('re_hidden')]) + ';');
    const root = doc.createElement('div');
    root.id = 'variant-resist-regression-stage';
    root.style.cssText = 'position:fixed;left:30px;top:300px;width:680px;height:250px;pointer-events:none;';
    root.innerHTML =
      '<div id="hero-card-rh0" class="hero-card-inner" style="position:absolute;left:0;top:0;width:160px;height:130px;background:#243047;border:1px solid #7dd3fc">' +
        '<div class="bg-gray-900" style="width:160px;height:92px;font-size:40px;line-height:92px;text-align:center"><span style="display:inline-block;transform:scale(1.2)">🧙</span>' +
          '<div class="hero-buffs" style="font-size:8px">HEROBUFF</div>' +
          '<div id="rh0-hp-bar" class="hp-bar-wrap" style="height:6px;width:100%;background:#22c55e">HEROHP</div>' +
        '</div>' +
      '</div>' +
      ['re_a', 're_b', 're_hidden'].map((id, i) =>
        '<div id="' + id + '-sprite" class="enemy-sprite breathe" style="position:absolute;left:' + (210 + i * 150) + 'px;top:0;width:110px;height:110px;background:#3b0764;border:1px solid #a855f7;font-size:44px;text-align:center">' +
          '<span class="text-5xl" style="display:inline-block;transform:scale(1.25)">👹</span>' +
          '<div class="enemy-buffs" style="font-size:8px">BUFFTAG</div>' +
          '<div id="' + id + '-hp-bar" class="hp-bar-wrap" style="height:6px;width:100%;background:#22c55e">HPBAR</div>' +
        '</div>').join('');
    doc.body.appendChild(root);
    doc.getElementById('re_hidden-sprite').style.display = 'none';

    let replaced = new Map();
    const replace = (name, fn) => { if (!replaced.has(name)) replaced.set(name, w[name]); w[name] = fn; };
    const keys = ['resist_fluid', 'resist_phantom', 'resist_antimagic', 'resist_vital', 'resist_fireproof', 'resist_poisonproof', 'resist_ironbody'];

    try {
      w.Math.random = () => 0.5;
      w.setVariantSfx(false);
      clearAll();

      await group('接口边界', async () => {
        eq(play({}), null, '缺实体返回 null');
        eq(play({ entity: ev('enemiesData[0]'), outcome: 'dodge', layers: ['fluid'] }), null, '闪避不播放抗性演出');
        eq(play({ entity: ev('enemiesData[0]'), layers: ['not-a-layer'] }), null, '未知层返回 null');
        eq(play({ entity: ev('enemiesData[2]'), layers: ['fluid'] }), null, '不可见实体（0 尺寸）返回 null');
        eq(fxNodes().length, 0, '边界分支不残留演出层');
      });

      await group('七种演出', async () => {
        const kinds = ['fluid', 'phantom', 'antiMagic', 'vital', 'fireproof', 'poisonproof', 'ironBody'];
        for (let i = 0; i < kinds.length; i++) {
          clearAll();
          const e = ev('enemiesData[' + (i % 2) + ']');
          const h = play({ entity: e, layers: [kinds[i]], outcome: 'hit', incomingType: '远程', from: ev('heroesData[0]') });
          check(isHandle(h), kinds[i] + ' 返回 {doneAt, cancel, onFinish:Set} 句柄');
          check(fxKinds().indexOf(kinds[i]) >= 0, kinds[i] + ' 真实挂载 data-resist-kind 图层/粒子');
          check(!w.isEntityVariantLocked(e), kinds[i] + ' 不加变种锁，hitRecoil 可正常反馈');
          check(!!h && h.doneAt - Date.now() >= 900, kinds[i] + ' 生命周期至少约 980ms');
          if (h) h.cancel();
          eq(fxNodes().length, 0, kinds[i] + ' 取消后演出层清零');
        }
      });

      await group('两层错峰与上限', async () => {
        clearAll();
        const e = ev('enemiesData[0]');
        const h = play({ entity: e, layers: ['fluid', 'phantom', 'vital'], outcome: 'hit', from: ev('heroesData[0]') });
        check(isHandle(h), '多层返回句柄');
        check(!!h && h.doneAt - Date.now() >= 900, '两层总寿命不少于 980ms 基准');
        await sleep(200);
        const kinds = fxKinds();
        eq(kinds.length, 2, '最多只播放两层');
        check(kinds.indexOf('fluid') >= 0 && kinds.indexOf('phantom') >= 0, '按顺序播放前两层');
        check(kinds.indexOf('vital') < 0, '第三层被丢弃');
        if (h) h.cancel();
        eq(fxNodes().length, 0, '两层取消后清理');
      });

      await group('中文抗性层名', async () => {
        clearAll();
        const e = ev('enemiesData[0]');
        const h = play({ entity: e, layers: ['远程', '要害'], outcome: 'hit', from: ev('heroesData[0]') });
        check(isHandle(h), 'applyEnemyTypeResist 的 hits（远程/要害）可直接作为 layers');
        await sleep(170);
        const kinds = fxKinds();
        check(kinds.indexOf('fluid') >= 0 && kinds.indexOf('vital') >= 0, '中文层名映射到 fluid / vital');
        if (h) h.cancel();
        eq(fxNodes().length, 0, '中文层名用例清理');
      });

      await group('免疫层由调用方指定', async () => {
        clearAll();
        const e = ev('enemiesData[0]');
        const h = play({ entity: e, layers: ['ironBody'], outcome: 'hit', stateResult: 'immunePoison' });
        check(isHandle(h), '播放哪一免疫层只看 layers，不被 stateResult 反推');
        check(fxKinds().indexOf('ironBody') >= 0, 'stateResult 与 layers 不一致时仍按 layers 播放');
        if (h) h.cancel();
        eq(fxNodes().length, 0, '免疫层取消后清理');
      });

      await group('ghost 去 buff / HP', async () => {
        clearAll();
        const h = play({ entity: ev('enemiesData[0]'), layers: ['phantom'], outcome: 'hit' });
        const ghost = doc.querySelector('[data-resist-kind="phantom"] .arcane-resist-ghost');
        check(!!ghost, 'phantom 生成 ghost 残影');
        if (ghost) {
          const html = ghost.innerHTML;
          check(!/BUFFTAG|enemy-buffs|HEROBUFF/.test(html), 'ghost 不包含 buff 占位');
          check(!/HPBAR|HEROHP|hp-bar/.test(html), 'ghost 不包含 HP 占位');
          check(/👹/.test(html), 'ghost 保留真实可见缩放 emoji');
        }
        if (h) h.cancel();
        clearAll();
        const hh = play({ entity: ev('heroesData[0]'), layers: ['fluid'], outcome: 'hit' });
        const gw = doc.querySelector('[data-resist-kind="fluid"] .arcane-resist-ghost');
        check(!!gw && !!gw.firstElementChild, 'hero-card-inner 无 portrait 时仍按 bg-gray-900 克隆');
        if (gw) check(!/HEROBUFF|HEROHP|hero-buffs|hp-bar/.test(gw.innerHTML), 'hero ghost 也不含 buff/HP 占位');
        if (hh) hh.cancel();
        eq(fxNodes().length, 0, 'ghost 用例清理干净');
      });

      await group('hitRecoil 不被锁', async () => {
        clearAll();
        const e = ev('enemiesData[0]');
        const dom = doc.getElementById('re_a-sprite');
        dom.classList.remove('arcane-hit-recoil');
        const h = play({ entity: e, layers: ['fluid'], outcome: 'hit' });
        w.playHitFeedback({ targetId: e.id, outcome: 'hit', hpDmg: 100, maxHp: 1000, hpBefore: 1000, hpAfter: 900, shieldDmg: 0, isHero: false }, { suppressShake: true });
        await sleep(90);
        check(dom.classList.contains('arcane-hit-recoil'), '抗性演出期间真实受击仍触发 recoil');
        if (h) h.cancel();
        dom.classList.remove('arcane-hit-recoil');
        clearAll();
      });

      await group('cancel 与全局重置', async () => {
        clearAll();
        const e = ev('enemiesData[1]');
        const h = play({ entity: e, layers: ['fluid'], outcome: 'hit' });
        await sleep(60);
        check(fxNodes().length > 0, '演出层已挂载');
        if (h) h.cancel();
        eq(fxNodes().length, 0, 'handle.cancel 立即清除全部抗性层');
        check(!w.isEntityVariantLocked(e), 'cancel 后实体无锁残留');
        const h2 = play({ entity: e, layers: ['poisonproof'], outcome: 'hit' });
        await sleep(80);
        w.clearArcaneFx();
        eq(fxNodes().length, 0, 'clearArcaneFx 清空抗性演出');
        if (h2) h2.cancel();
      });

      await group('applyEnemyTypeResist 接线行为', async () => {
        clearAll();
        if (typeof w.applyEnemyTypeResist !== 'function') { pending.push('接口缺失:applyEnemyTypeResist'); return; }
        const hist = [];
        replace('addHistory', msg => hist.push(String(msg)));
        replace('createFloatingText', () => {});
        ev('enemiesData[1].resistMap={"远程":0.5,"AoE":0.5}');
        const e = ev('enemiesData[1]');
        const dom = doc.getElementById('re_b-sprite');
        const dmg = w.applyEnemyTypeResist(100, '远程', e, dom, true, false);
        eq(dmg, 25, '双抗性顺序折算 100→50→25');
        await sleep(200);
        const kinds = fxKinds();
        check(kinds.indexOf('fluid') >= 0 && kinds.indexOf('vital') >= 0, '真实减伤把 hits（远程/要害）传给演出');
        check(hist.some(t => t.indexOf('【远程】【要害】') >= 0), '真实战报记录两个命中抗性');
        clearAll(); hist.length = 0;
        const dSilent = w.applyEnemyTypeResist(100, '远程', e, dom, true, true);
        eq([dSilent, fxNodes().length, hist.length], [25, 0, 0], 'silent 仍折算但不放演出/不写战报');
        clearAll();
        const dZero = w.applyEnemyTypeResist(1, '远程', e, dom, false, false);
        eq([dZero, fxNodes().length, hist.length], [1, 0, 0], '有抗性但实际减伤为 0 时不放演出');
        clearAll();
        const dMiss = w.applyEnemyTypeResist(100, '近战', e, dom, false, false);
        eq([dMiss, fxNodes().length, hist.length], [100, 0, 0], '未命中类型且无减伤不放演出');
        clearAll();
      });

      await group('音频 7 键真实采样', async () => {
        clearAll();
        if (typeof w.playCustomAudio !== 'function') { pending.push('待对齐:playCustomAudio 非全局，音频计数跳过'); return; }
        const calls = [];
        replace('playCustomAudio', (url, vol, rate, opts) => { calls.push({ url: url, vol: vol, rate: rate, opts: opts }); return () => {}; });
        w.setVariantSfx(true);
        ev('arcaneVfxModule.setIdentitySfx(true)');
        for (let i = 0; i < keys.length; i++) {
          const h = play({ entity: ev('enemiesData[' + (i % 2) + ']'), layers: [['fluid', 'phantom', 'antiMagic', 'vital', 'fireproof', 'poisonproof', 'ironBody'][i]], outcome: 'hit' });
          await sleep(12);
          if (h) h.cancel();
          clearAll();
        }
        eq(calls.length, 7, '七个抗性演出各触发一次真实 playCustomAudio');
        check(calls.every(c => c.opts && c.opts.variant === true && c.opts.sampled === true), '采样调用带 variant/sampled 标记，无合成兜底');
        w.setVariantSfx(false);
      });

      check(!mock || typeof mock.genCount !== 'function' || mock.genCount() === gen0, '抗性专项未调用外部 LLM');
      return { pending };
    } finally {
      clearAll();
      for (const [name, fn] of replaced) w[name] = fn;
      try { w.setVariantSfx(true); } catch (e) { /* 同上 */ }
      w.Math.random = restoreRandom;
      w.__vrrRestore = saved;
      ev(`(() => { const s = window.__vrrRestore; heroesData = s.heroesData; enemiesData = s.enemiesData; delete window.__vrrRestore; })()`);
      root.remove();
    }
  };
})();
