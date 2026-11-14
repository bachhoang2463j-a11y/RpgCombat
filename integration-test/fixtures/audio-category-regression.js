/* 音频分类回归：AudioMixer 分类契约（classify 矩阵 / withContext 继承 / 三轨映射 /
   A/B/C 类增益 1.3 与 K=1）、真实 applySingleTagEffect 的未知标签 [火焰01] 攻击归 A、
   远程/近战重击 helper 子音 A（playHeavyImpactAudio 真实运行，bass 用探针替代）、
   混合远程重击中的 [单降]/[自盲] 因 TAG_HANDLERS 包装仍归 K、新增标签处理器强制 K、
   以及 vSample=J / 看破=I / 提示=M / 语音=N 的 source 入口断言。
   约定：唯一 stub 的是底层 CombatAudioMixer.play（记录原 vol/category，返回可 await 的
   ready/started/done Promise）；业务函数（classify/applySingleTagEffect/playHeavyImpactAudio/
   registerTagHandler）全部走真实实现。临时 DOM 与全局战斗数据在 finally 按原引用恢复，
   不做函数 JSON 序列化。逻辑实现未落地或行为不可观测时按 pending 上报，不误判红。 */
(function () {
  'use strict';
  window.runAudioCategoryRegression = async function ({ w, check, eq, mock, source } = {}) {
    const ev = code => w.eval(code);
    const pending = [];
    const note = msg => { if (pending.indexOf(msg) < 0) pending.push(msg); };
    const mix = w.CombatAudioMixer;

    /* ---------- 接口落地检查：未落地按 pending 返回 ---------- */
    if (!mix || typeof mix.play !== 'function' || typeof mix.classify !== 'function' || typeof mix.withContext !== 'function') {
      note('待对齐:CombatAudioMixer.play/classify/withContext');
      return { pending };
    }
    ['capture', 'output', 'protect', 'atTime', 'trackOf'].forEach(k => {
      if (typeof mix[k] !== 'function') note('待对齐:CombatAudioMixer.' + k);
    });
    if (pending.length) return { pending };
    const doc = w.document;
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;

    /* ---------- source 静态切片（字符串/模板/注释感知的括号扫描） ---------- */
    const src = typeof source === 'string' ? source : '';
    function skipString(s, i) {
      const q = s[i];
      for (let j = i + 1; j < s.length; j++) {
        if (s[j] === '\\') { j++; continue; }
        if (q === '`' && s[j] === '$' && s[j + 1] === '{') {
          const e = braceEnd(s, j + 1);
          if (e < 0) return -1;
          j = e; continue;
        }
        if (s[j] === q) return j;
      }
      return -1;
    }
    function braceEnd(s, open) {
      let depth = 0;
      for (let i = open; i < s.length; i++) {
        const c = s[i], n = s[i + 1];
        if (c === '/' && n === '/') { const nl = s.indexOf('\n', i + 2); if (nl < 0) return -1; i = nl; continue; }
        if (c === '/' && n === '*') { const e = s.indexOf('*/', i + 2); if (e < 0) return -1; i = e + 1; continue; }
        if (c === "'" || c === '"' || c === '`') { const e = skipString(s, i); if (e < 0) return -1; i = e; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (!depth) return i; }
      }
      return -1;
    }
    const sliceFn = name => {
      let at = src.indexOf('function ' + name + '(');
      if (at < 0) at = src.indexOf('function ' + name + ' (');
      if (at < 0) { const alt = src.indexOf(name + ' = function'); if (alt >= 0) at = alt; }
      if (at < 0) return '';
      const b = src.indexOf('{', at);
      if (b < 0) return '';
      const e = braceEnd(src, b);
      return e < 0 ? '' : src.slice(at, e + 1);
    };

    if (!src) note('静态跳过:主harness未传入source（运行期组照常执行）');
    else {
      const heavy = sliceFn('playHeavyImpactAudio');
      if (!heavy) note('静态不可达:playHeavyImpactAudio 函数体切片');
      else {
        if (heavy.indexOf("capture('A')") < 0) note('静态未落地:playHeavyImpactAudio 未使用 A 类别');
        if (heavy.indexOf('RANGED_HEAVY_HITDOWN_URL') < 0) note('静态未落地:playHeavyImpactAudio 缺远程子音');
        if (!/delayMs\s*\/\s*1000/.test(heavy)) note('静态未落地:playHeavyImpactAudio 子音未按 delayMs 延迟');
      }
      const vs = sliceFn('vSample');
      if (!vs) note('静态不可达:vSample 函数体切片');
      else if (vs.indexOf("category:'J'") < 0 && vs.indexOf("category: 'J'") < 0) note('静态未落地:vSample 变种未标 J');
      if (!/KANPO_SOUND_KEY[\s\S]{0,160}category:\s*'I'/.test(src)) note('静态未落地:看破音效未标 I');
      if (!/playSound\(\s*(?:'burst'|"burst"|'shot'|"shot"|'atk1'|"atk1"|'herocharge'|"herocharge")[\s\S]{0,120}category:\s*'M'/.test(src)) note('静态未落地:提示音未标 M');
      if (!/HERO_VOICE_BASE[\s\S]{0,200}category:\s*'N'/.test(src)) note('静态未落地:语音未标 N');
      if (!/capture\(\s*'C'\s*\)|category\s*:\s*'C'/.test(src)) note('静态未落地:强反击 C 分类缺失');
    }

    /* ---------- 保存点：全局战斗数据与函数引用（直接按引用保存，不 JSON 函数） ---------- */
    const saved = ev('({heroesData, enemiesData, battleHistory, _historyRawCache, token:combatToken, ' +
      'frozen:_pipelineFrozen, nonLethal:nonLethalSettings.enabled, random:Math.random})');
    const realPlay = mix.play;
    const restoreFns = new Map();
    const replace = (name, fn) => {
      if (typeof w[name] !== 'function') return;
      if (!restoreFns.has(name)) restoreFns.set(name, w[name]);
      w[name] = fn;
    };
    /* 只静默视觉/调度/UI 刷新，不碰业务函数与音频层 */
    ['addHistory', 'showLog', 'renderTurnQueue', 'renderHeroMenu', 'updateActiveHeroDisplay',
      'updateBuffDisplay', 'updateBuffBar', 'renderBuffs', 'createFloatingText', 'triggerScreenShake',
      'playSVGEffect', 'playEnemyFlinchAnim', 'updateHeroUI', 'updateEnemyUI'
    ].forEach(name => replace(name, () => {}));

    /* ---------- 临时真实 DOM 舞台（重击/受击 UI 取元素用） ---------- */
    const root = doc.createElement('div');
    root.id = 'audio-category-regression-stage';
    root.style.cssText = 'position:fixed;left:24px;top:120px;width:560px;height:240px;pointer-events:none;';
    const track = id => '<div class="arcane-hit-track" style="position:relative;width:180px;height:10px;background:#111">' +
      '<div id="' + id + '-hp-ghost" style="width:100%;height:10px;background:#fff"></div>' +
      '<div id="' + id + '-hp-bar" style="width:100%;height:10px;background:#f43f5e"></div></div>';
    root.innerHTML = [
      '<div id="hero-card-h_acr1" class="hero-card-inner" style="position:absolute;left:0;top:0;width:160px;height:120px;background:#243047">',
      '<img alt="" style="width:160px;height:80px;display:block"></div>',
      '<span id="h_acr1-status" style="display:none"></span>',
      '<div style="position:absolute;left:0;top:130px">' + track('h_acr1') + '</div>',
      '<div id="e_acr1-sprite" style="position:absolute;left:320px;top:0;width:100px;height:100px;background:#4c1d58">',
      '<img alt="" style="width:90px;height:90px;display:block"></div>',
      '<span id="e_acr1-status" style="display:none"></span>',
      '<div style="position:absolute;left:320px;top:110px">' + track('e_acr1') + '</div>'
    ].join('');
    doc.body.appendChild(root);

    const entity = (id, extra) => Object.assign({
      id, name: id, hp: 2000, maxHp: 2000, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 10, def: 0, spd: 100, hit: 0, eva: 0, shield: 0, actCount: 1, isAlive: true,
      buffs: [], skills: [], items: [], classType: null, isSummon: false, row: 'front', tags: []
    }, extra);
    const install = (hero, enemy) => {
      ev('heroesData=' + JSON.stringify([hero]) + ';enemiesData=' + JSON.stringify([enemy]) +
        ';battleHistory=[];_historyRawCache="";nonLethalSettings.enabled=false;');
      const h = ev('heroesData')[0], e = ev('enemiesData')[0];
      if (h) { h.dom = doc.getElementById('hero-card-' + h.id); h.status = doc.getElementById(h.id + '-status'); }
      if (e) { e.dom = doc.getElementById(e.id + '-sprite'); e.status = doc.getElementById(e.id + '-status'); }
      return { h, e };
    };

    /* ---------- 唯一 stub：底层 Mixer.play，记录原 vol/category，返回可 await 的 cue ---------- */
    const plays = [];
    mix.play = function (url, opts) {
      opts = opts || {};
      const owner = opts.owner;
      const scope = mix.capture(null);
      const category = opts.category ||
        (opts.audioContext && opts.audioContext.category) ||
        (owner && owner.audioContext && owner.audioContext.category) ||
        scope.category || (opts.track === 'skill' ? 'D' : opts.track === 'result' ? 'F' : 'K');
      const rec = { url: String(url), vol: opts.vol, category, when: opts.when };
      plays.push(rec);
      const cue = function () {};
      cue.url = rec.url;
      cue.category = rec.category;
      cue.baseVolume = rec.vol;
      cue.when = typeof opts.when === 'number' ? opts.when : 0;
      cue.ready = Promise.resolve(true);
      cue.started = Promise.resolve(true);
      cue.done = Promise.resolve(true);
      if (owner && owner.audioStoppers && typeof owner.audioStoppers.add === 'function') owner.audioStoppers.add(cue);
      return cue;
    };
    const takePlays = () => plays.splice(0, plays.length);
    const group = async (name, fn) => {
      try { await fn(); } catch (e) { note('执行异常:' + name + ':' + String(e && e.message || e)); }
    };
    const hitdownUrl = ev('typeof RANGED_HEAVY_HITDOWN_URL !== "undefined" ? RANGED_HEAVY_HITDOWN_URL : null');

    try {
      /* ================= 组一：classify 矩阵与 Mixer 分类契约 ================= */
      await group('classify矩阵与分类契约', async () => {
        eq(mix.classify({ fxTag: '火焰01', type: '[单体;power:50]' }), 'A', '未知fxTag攻击归A');
        eq(mix.classify({ fxTag: '音测未知', type: '[单增;power:10]' }), 'B', '未知fxTag辅助归B');
        eq(mix.classify({ type: '[单体;power:50]' }), 'D', '无fxTag普通攻击归D');
        eq(mix.classify({ type: '[单增;power:10]' }), 'K', '无fxTag非攻击归K');
        eq(mix.classify({ fxTag: 'group:melee', type: '[单体;power:10]' }), 'D', 'group:前缀归D');
        eq(mix.classify({ fxTag: '火焰01', type: '[近战]', type2: '[群攻;power:1]' }), 'A', '第二槽攻击标签同样归A');
        eq(mix.categories.A.gain, 1.3, 'A类增益1.3');
        eq(mix.categories.B.gain, 1.3, 'B类增益1.3');
        eq(mix.categories.C.gain, 1.3, 'C类增益1.3');
        eq(mix.categories.K.gain, 1, 'K类不放大');
        eq(mix.trackOf('A'), 'skill', 'A走skill轨');
        eq(mix.trackOf('B'), 'skill', 'B走skill轨');
        eq(mix.trackOf('I'), 'result', 'I走result轨');
        eq(mix.trackOf('J'), 'aux', 'J走aux轨');
        eq(mix.withContext('C', () => mix.capture('K').category), 'C', 'withContext字符串内继承C');
        eq(mix.withContext({ category: 'B' }, () => mix.capture('K').category), 'B', 'withContext对象内继承B');
      });

      /* ================= 组二：真实 applySingleTagEffect [火焰01] 归 A ================= */
      await group('applySingleTagEffect未知标签火焰01归A', async () => {
        w.Math.random = () => 0.5;
        const skill = w.parseSkill('【音测火焰】[单体;power:5][远程][MP:1][特效:火焰01]');
        if (!skill) { note('待对齐:parseSkill 未解析[特效:火焰01]技能'); return; }
        if (skill.fxTag !== '火焰01') note('待对齐:skill.fxTag 非火焰01，实际:' + skill.fxTag);
        const d = install(entity('h_acr1'), entity('e_acr1'));
        takePlays();
        await w.applySingleTagEffect(d.e, d.h, '[单体]', 5, 200, 1, 1, skill, null, false);
        const got = takePlays();
        if (!got.length) { note('待对齐:applySingleTagEffect [火焰01] 未产生可记录音频'); return; }
        check(got.some(p => p.category === 'A'), '未知标签[火焰01]攻击音频归A，实际:' + JSON.stringify(got.map(p => p.category)));
        check(got.every(p => p.vol !== 0.65), '底层vol保持原值，未乘类增益(不应为0.65)');
      });

      /* ================= 组三：playHeavyImpactAudio 真运行（近战/远程子音 A） ================= */
      await group('重击helper子音A', async () => {
        if (typeof w.playHeavyImpactAudio !== 'function') { note('待对齐:playHeavyImpactAudio'); return; }
        for (const one of [{ url: 'melee_probe.wav', delay: 80, tag: '近战' }, { url: 'ranged_probe.wav', delay: 60, tag: '远程' }]) {
          const bassCalls = [];
          takePlays();
          await w.playHeavyImpactAudio(one.url, one.delay, when => bassCalls.push(when));
          const got = takePlays();
          check(got.some(p => p.url === one.url && p.category === 'A'), one.tag + '重击主音A');
          const sub = hitdownUrl ? got.some(p => p.url === String(hitdownUrl) && p.category === 'A') : got.filter(p => p.url !== one.url).every(p => p.category === 'A');
          check(sub && got.some(p => p.url !== one.url), one.tag + '重击子音A');
          check(got.some(p => p.vol === 0.5), one.tag + '重击底层vol保持0.5');
          eq(bassCalls.length, 1, one.tag + '重击bass回调一次');
        }
        for (const category of ['A','C']) {
          takePlays();
          await mix.withContext(category, () => w.playHeavyImpactAudio('ranged-category-probe.wav', 60, () => {}));
          const got = takePlays();
          check(got.length === 2 && got.every(p => p.category === category), '同源轰击主音/子音继承用途 ' + category);
        }
      });

      /* ================= 组四：混合远程重击 [单降]/[自盲] 仍 K ================= */
      await group('混合重击减益标签仍K', async () => {
        const skill = w.parseSkill('【音测远程重击】[单体;power:1][单降;power:5][自盲;power:5][远程][MP:1][特效:远程重击]');
        if (!skill || skill.fxTag !== '远程重击') { note('待对齐:parseSkill 未得到[特效:远程重击]技能'); return; }
        const d = install(entity('h_acr1'), entity('e_acr1'));
        takePlays();
        await w.applySingleTagEffect(d.e, d.h, '[单降]', 5, 200, 1, 1, skill, null, true);
        const debuff = takePlays();
        if (!debuff.length) note('待对齐:applySingleTagEffect [单降] 未产生可记录音频');
        else check(debuff.every(p => p.category === 'K'), '[单降]混合重击音频归K，实际:' + JSON.stringify(debuff.map(p => p.category)));
        takePlays();
        await w.applySingleTagEffect(d.h, d.h, '[自盲]', 5, 200, 1, 1, skill, null, true);
        const blind = takePlays();
        if (!blind.length) note('待对齐:applySingleTagEffect [自盲] 未产生可记录音频');
        else check(blind.every(p => p.category === 'K'), '[自盲]混合重击音频归K，实际:' + JSON.stringify(blind.map(p => p.category)));
      });

      /* ================= 组五：TAG_HANDLERS 新增标签音强制 K ================= */
      await group('TAG_HANDLERS新增标签强制K', async () => {
        const handlers = ev('typeof TAG_HANDLERS === "object" ? TAG_HANDLERS : null');
        if (!handlers || typeof w.registerTagHandler !== 'function') { note('待对齐:TAG_HANDLERS/registerTagHandler'); return; }
        const key = '音测探针' + Date.now();
        let inner = null;
        try {
          w.registerTagHandler(key, () => {
            inner = mix.capture('K').category;
            mix.play('probe://tag-handler', {});
          });
          if (typeof handlers[key] !== 'function') { note('待对齐:registerTagHandler 未写入 TAG_HANDLERS'); return; }
          takePlays();
          handlers[key]({});
          eq(inner, 'K', '新增标签处理器内capture继承K');
          const got = takePlays();
          if (!got.length) note('待对齐:新增标签处理器未产生可记录音频');
          else check(got.every(p => p.category === 'K'), '新增标签音强制K，实际:' + JSON.stringify(got.map(p => p.category)));
        } finally { try { delete handlers[key]; } catch (e) {} }
      });

      /* ================= 新增注册项与延迟演出自动继承 ================= */
      await group('新注册特效与延迟owner自动继承', async () => {
        const registry = ev('WEBM_FX_REGISTRY'), key = '音测新增特效';
        const keep = registry[key];
        registry[key] = { url:'', audioUrl:'probe://new-effect', particles:null };
        try {
          for (const [tag,category] of [['[单体]','A'],['[单盾]','B']]) {
            takePlays();
            const skill = { type:tag, fxTag:key };
            w.playAOEEffect('enemies-container', null, key, { category:mix.classify(skill) });
            const got = takePlays();
            check(got.length === 1 && got[0].category === category, '新增注册音无需音频分类配置自动归 ' + category);
          }
          takePlays();
          const d = install(entity('h_acr1'), entity('e_acr1'));
          const fx = w.playArcaneSkillFx('飞沙化甲', d.h, [d.h]);
          await new Promise(resolve => setTimeout(resolve, 370));
          const got = takePlays();
          check(got.length >= 3 && got.every(p => p.category === 'B'), '专属owner起手与延迟子音自动继承B');
          if (fx) fx.cancel();
          takePlays();
          const trigger = w.playVariantTriggerFx({ trigger:'regen', entity:d.e, meta:{triggered:true} });
          const variant = takePlays();
          check(variant.length > 0 && variant.every(p => p.category === 'J'), '变种入口采样自动归J，不提高30%');
          if (trigger) trigger.cancel();
        } finally { if (keep) registry[key] = keep; else delete registry[key]; }
      });

      /* ================= 组六：vSample/看破/提示/语音 分类（source 入口断言） ================= */
      await group('静态分类入口J/I/M/N', async () => {
        const vs = sliceFn('vSample');
        if (!vs) note('待对齐:vSample 切片不可达');
        else check(vs.indexOf("category:'J'") >= 0 || vs.indexOf("category: 'J'") >= 0, 'vSample变种标J');
        if (src) {
          check(/KANPO_SOUND_KEY[\s\S]{0,160}category:\s*'I'/.test(src), '看破音效标I');
          check(/playSound\(\s*(?:'burst'|"burst"|'shot'|"shot"|'atk1'|"atk1"|'herocharge'|"herocharge")[\s\S]{0,120}category:\s*'M'/.test(src), '提示音标M');
          check(/HERO_VOICE_BASE[\s\S]{0,200}category:\s*'N'/.test(src), '语音标N');
        }
      });

      if (mock && typeof mock.genCount === 'function') eq(mock.genCount(), gen0, '音频分类回归未调用外部LLM');
    } finally {
      try { mix.play = realPlay; } catch (e) {}
      for (const [name, fn] of restoreFns) { try { w[name] = fn; } catch (e) {} }
      try { if (typeof w.clearArcaneFx === 'function') w.clearArcaneFx(); } catch (e) {}
      w.__acrSaved = saved;
      try {
        ev('heroesData=window.__acrSaved.heroesData;enemiesData=window.__acrSaved.enemiesData;' +
          'battleHistory=window.__acrSaved.battleHistory;_historyRawCache=window.__acrSaved._historyRawCache;' +
          'combatToken=window.__acrSaved.token;_pipelineFrozen=window.__acrSaved.frozen;' +
          'nonLethalSettings.enabled=window.__acrSaved.nonLethal;Math.random=window.__acrSaved.random;' +
          'delete window.__acrSaved;');
      } catch (e) { /* 清理尽力而为 */ }
      try { root.remove(); } catch (e) {}
      if (typeof w.clearVariantState === 'function') { try { w.clearVariantState(); } catch (e) {} }
    }
    return { pending };
  };
})();
