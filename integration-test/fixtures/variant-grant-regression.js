/* 赋予（12 变种授予）回归：在真实 iframe 内调用 index.html 生产函数，不复制实现。
   契约覆盖：VARIANT_GRANT_NAMES / getGrantedVariantName / hasVariantTag / canReviveEntity、
   registerTagHandler('赋予') 写 type:variant buff（同名时长max、不同并存、原生同名不叠、已耗复活不授）、
   parseSkill/parseItem 三槽识别（power=0、槽位;turns 优先、全角冒号、纯赋予不兜底20威力普攻）、
   classifySkill 把赋予作单体增益、executeSkillAction 自施/带他人（含召唤）/混合攻击、
   selectEnemySkillAndTarget 纯赋予、applyEnemyTypeResist 临时流体/虚形/破法/要害、
   中毒/燃烧/眩晕（applySingleTagEffect 及职业暗袭/淬毒）认识临时钢体/防火/耐毒且不清已有状态、
   getEffectiveStats 临时狂暴、TURN_START 临时再生、AFTER_DAMAGE 临时吸血/荆棘、12 项敌我及双侧召唤等价、
   tryReviveEnemy 临时复活（双方/原生+临时共用一次/快照 grantedReviveAtTick/重施治疗不复位）、
   真实 executeSkillAction 致命 / nextTurn DoT 最后tick / ON_FATAL_DAMAGE / resolveSummonDeath 四条复活路径、
   runResetPipeline 基线回滚、编辑器 openEditor/syncEditorDataToMemory 三槽往返与威力输入禁用、
   SKILL_TYPES / SKILL_TYPE_EDIT_OPTIONS / expandTagLabel / tagTip / updateBuffUI。
   接口未落地时登记 pending（待对齐），不判实现缺陷。
   注意：harness.html 需追加 <script src="fixtures/variant-grant-regression.js"> 与 runVariantGrantRegression 调用行。 */
(function () {
  'use strict';
  window.runVariantGrantRegression = async function ({ w, check, eq, mock, source }) {
    const ev = code => w.eval(code);
    const doc = w.document;
    const nativeSetTimeout = w.setTimeout;
    const sleep = ms => new Promise(resolve => nativeSetTimeout.call(w, resolve, ms));
    const gen0 = mock && typeof mock.genCount === 'function' ? mock.genCount() : 0;
    const pending = [];
    const group = async (name, fn) => {
      try { await fn(); }
      catch (e) { check(false, name + '执行异常', String((e && e.stack) || e)); }
    };
    const GRANTS = ['流体', '虚形', '破法', '要害', '防火', '耐毒', '钢体', '再生', '狂暴', '吸血', '荆棘', '复活'];
    const bodyAfter = start => {
      const open = source.indexOf('{', start);
      if (open < 0) return '';
      let depth = 0;
      for (let i = open; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') { depth--; if (!depth) return source.slice(start, i + 1); }
      }
      return '';
    };

    /* ========== 一、静态：源码接线（赋予模块落地后才逐项核对） ========== */
    const hasSrc = typeof source === 'string' && source.length > 2000;
    if (!hasSrc) pending.push('待对齐:source未注入');
    const landed = hasSrc && source.indexOf('VARIANT_GRANT_NAMES') >= 0;
    if (hasSrc && !landed) pending.push('待对齐:赋予模块（VARIANT_GRANT_NAMES）未落地');
    if (landed) {
      const gnAt = source.indexOf('VARIANT_GRANT_NAMES');
      const seg = source.slice(gnAt, gnAt + 500);
      eq(GRANTS.filter(n => seg.indexOf("'" + n + "'") < 0 && seg.indexOf('"' + n + '"') < 0), [],
        'VARIANT_GRANT_NAMES 覆盖12个赋予名');
      const handlerAt = source.search(/registerTagHandler\(\s*['"]赋予/);
      if (handlerAt < 0) pending.push("待对齐:registerTagHandler('赋予') 未注册");
      else {
        const hSrc = bodyAfter(handlerAt);
        check(/variant/.test(hSrc) && /duration/.test(hSrc), '赋予 handler 写 type:variant + duration buff');
        check(/Math\.max/.test(hSrc), '同名赋予时长取 max');
        check(/variantReviveUsed/.test(hSrc) || source.indexOf('canReviveEntity') >= 0, '赋予 handler 考虑已耗复活不授新机会');
      }
      const crevAt = source.indexOf('function canReviveEntity');
      if (crevAt < 0) pending.push('待对齐:canReviveEntity 未定义');
      else {
        const cSrc = bodyAfter(crevAt);
        check(/reviveCount/.test(cSrc), 'canReviveEntity 检查原生 reviveCount');
        check(/variantReviveUsed/.test(cSrc), 'canReviveEntity 检查 variantReviveUsed');
      }
      const aetrAt = source.indexOf('function applyEnemyTypeResist');
      if (aetrAt >= 0) check(/getGrantedVariantName|hasVariantTag/.test(bodyAfter(aetrAt)) && /流体|虚形|破法|要害/.test(bodyAfter(aetrAt)),
        'applyEnemyTypeResist 认识临时流体/虚形/破法/要害');
      const gesAt = source.indexOf('function getEffectiveStats');
      if (gesAt >= 0) check(/getGrantedVariantName|hasVariantTag/.test(bodyAfter(gesAt)),
        'getEffectiveStats 狂暴认识临时赋予（敌我等价）');
      const ateAt = source.indexOf('function applySingleTagEffect');
      if (ateAt >= 0) check(/getGrantedVariantName|hasVariantTag/.test(bodyAfter(ateAt)),
        'applySingleTagEffect（含职业暗袭/淬毒路径）认识临时钢体/防火/耐毒');
      const clsAt = source.indexOf('function classifySkill');
      if (clsAt >= 0) check(/getGrantedVariantName|赋予/.test(bodyAfter(clsAt)),
        'classifySkill 复用 getGrantedVariantName（或字面）识别赋予为单体增益');
      const selAt = source.indexOf('function selectEnemySkillAndTarget');
      if (selAt < 0) pending.push('待对齐:selectEnemySkillAndTarget 未定位');
      else check(/getGrantedVariantName|赋予/.test(bodyAfter(selAt)) && /isOthers/.test(bodyAfter(selAt)),
        '敌方 AI selectEnemySkillAndTarget 支持纯赋予并按 isOthers 同阵营选目标');
      const trvAt = source.indexOf('function tryReviveEnemy');
      if (trvAt < 0) pending.push('待对齐:tryReviveEnemy 未定位');
      else {
        const tSrc = bodyAfter(trvAt);
        check(/canReviveEntity|variantReviveUsed/.test(tSrc), 'tryReviveEnemy 接入临时复活判定');
        check(/variantReviveUsed\s*=\s*true/.test(tSrc), '临时复活后置 variantReviveUsed（原生+临时共用本场一次）');
        check(!/reviveCount\s*\+\+/.test(tSrc), '临时复活不回填原生 reviveCount');
      }
      const udbAt = source.indexOf('function updateBuffUI');
      if (udbAt >= 0) check(/variant/.test(bodyAfter(udbAt)) && /回/.test(bodyAfter(udbAt)),
        'updateBuffUI 输出 虚形·N回 徽章（含临期样式）');
      const oedAt = source.indexOf('function openEditor');
      if (oedAt >= 0) {
        const oSrc = bodyAfter(oedAt);
        const powerAt = source.indexOf('function syncGrantSlotPower');
        check(/syncGrantSlotPower/.test(oSrc) && powerAt >= 0 && /disabled/.test(bodyAfter(powerAt)),
          '编辑器通过共享函数禁用赋予槽现有威力控件');
      }
    }

    /* ========== 二、接口落地检查（缺任一即整体待对齐，不跑运行时组） ========== */
    const api = ['getGrantedVariantName', 'hasVariantTag', 'canReviveEntity'];
    const missing = api.filter(name => ev('typeof ' + name) !== 'function');
    if (missing.length) pending.push('接口缺失:' + missing.join('、'));
    const grantHandler = ev('typeof TAG_HANDLERS !== "undefined" ? (TAG_HANDLERS["赋予"] || null) : null');
    if (!grantHandler) pending.push('接口缺失:TAG_HANDLERS["赋予"]');
    const skTypes = ev('Array.isArray(SKILL_TYPES) ? SKILL_TYPES.slice() : []') || [];
    const grantLabels = GRANTS.map(n => '[赋予:' + n + ']');
    const missingTypes = grantLabels.filter(t => skTypes.indexOf(t) < 0);
    if (missingTypes.length) pending.push('接口缺失:SKILL_TYPES 缺 ' + missingTypes.length + ' 个赋予标签');
    if (missing.length || !grantHandler || missingTypes.length) {
      console.log('[PENDING] 赋予接口未落地：' +
        [missing.join('、'), !grantHandler ? 'TAG_HANDLERS[赋予]' : '',
          missingTypes.length ? 'SKILL_TYPES×' + missingTypes.length : ''].filter(Boolean).join('、'));
      return { pending };
    }

    /* ========== 三、夹具：独立数据 / 最小 DOM / 确定性随机 ========== */
    const saved = ev(`({ heroesData, enemiesData, battleHistory, _historyRawCache,
      stateQueue: state.actionQueue.slice(), stateIndex: state.queueIndex,
      nonLethal: nonLethalSettings.enabled, random: Math.random,
      started: state.isGameStarted, token: combatToken, frozen: _pipelineFrozen,
      pendingSummons: pendingSummons.slice(),
      llmAlly: llmState.allyAutoSpeak, llmEnemy: llmState.enemyAutoSpeak,
      ihc: initialHeroesCache, iec: initialEnemiesCache,
      stateValues: { ...state }, editorHeroes: editorLiveHeroes, editorEnemies: editorLiveEnemies })`);
    const originals = new Map();
    const replace = (name, fn) => { if (!originals.has(name)) originals.set(name, w[name]); w[name] = fn; };
    const realBuffUI = w.updateBuffUI;
    const calls = { floats: [], hist: [], sounds: [] };
    replace('createFloatingText', (dom, text) => calls.floats.push(String(text)));
    replace('addHistory', msg => calls.hist.push(String(msg)));
    replace('updateBuffUI', () => {});
    replace('updateHeroUI', () => {});
    replace('updateEnemyUI', () => {});
    replace('renderTurnQueue', () => {});
    replace('checkWoundedNarration', () => {});
    replace('triggerEnemySelfDestruct', () => {});
    replace('tryTriggerEnemyDeathSpeak', () => {});
    replace('playSound', key => calls.sounds.push(key));
    replace('spawnHitFlash', () => {});
    replace('triggerScreenShake', () => {});

    const entity = (id, extra) => Object.assign({
      id, name: '赋予' + id, hp: 1000, maxHp: 1000, mp: 50, maxMp: 50, tp: 0, maxTp: 100,
      atk: 100, def: 0, spd: 50, hit: 100, eva: 0, taunt: 1, shield: 0, actCount: 1,
      isAlive: true, buffs: [], skills: [], items: [], tags: [], classType: null,
      isSummon: false, side: null, row: 'front', currentCharge: 0, hitBonus: 0, evaBonus: 0
    }, extra);
    const hero = (id, extra) => entity('h_' + id, Object.assign({ side: 'hero' }, extra));
    const install = (heroes, enemies) => {
      ev('heroesData=' + JSON.stringify(heroes) + ';enemiesData=' + JSON.stringify(enemies) +
        ';battleHistory=[];_historyRawCache="";');
      return { h: ev('heroesData'), e: ev('enemiesData') };
    };
    const root = doc.createElement('div');
    root.id = 'variant-grant-regression-stage';
    root.style.cssText = 'position:fixed;left:30px;top:520px;width:780px;height:200px;pointer-events:none;';
    root.innerHTML =
      ['h_gv0', 'h_gv1', 'h_gvs'].map((id, i) =>
        '<div id="hero-card-' + id + '" style="position:absolute;left:' + (10 + i * 170) + 'px;top:0;width:150px;height:120px;background:#1e293b;border:1px solid #38bdf8">' +
          '<div class="portrait">' + id + '</div>' +
          '<div id="' + id + '-buffs" class="hero-buffs"></div>' +
          '<div id="' + id + '-hp-bar" class="hp-bar" style="height:6px;width:100%"></div>' +
        '</div>').join('') +
      ['e_gva', 'e_gvb', 'e_gvc', 'e_gvd', 'e_gvs'].map((id, i) =>
        '<div id="' + id + '-sprite" class="enemy-sprite" style="position:absolute;left:' + (530 + i * 50) + 'px;top:0;width:44px;height:44px;background:#3b0764;border:1px solid #a855f7">' + id +
          '<div id="' + id + '-buffs" class="enemy-buffs"></div>' +
        '</div>' +
        '<div id="' + id + '-hp-bar" style="position:absolute;left:' + (530 + i * 50) + 'px;top:50px;width:44px;height:6px;background:#22c55e"></div>').join('');
    doc.body.appendChild(root);
    const domOf = id => doc.getElementById(id + '-sprite') || doc.getElementById('hero-card-' + id);
    const variantBuffs = e => (e.buffs || []).filter(b => b.type === 'variant');
    const grant = (e, name, duration) => { e.buffs.push({ type: 'variant', variant: name, value: 1, duration: duration || 5 }); return e; };
    const installSide = kind => {
      const h0 = hero('gv0', kind === 'hsum' ? { isSummon: true } : {});
      const es0 = entity('e_gva', kind === 'esum' ? { isSummon: true } : {});
      const d = install([h0, hero('gv1')], [es0, entity('e_gvb')]);
      const isHeroSide = kind === 'hero' || kind === 'hsum';
      return { d, t: isHeroSide ? d.h[0] : d.e[0], acc: isHeroSide ? 'heroesData[0]' : 'enemiesData[0]' };
    };

    try {
      ev('nonLethalSettings.enabled=false;llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;' +
        'state.isGameStarted=false;_pipelineFrozen=false;pendingSummons=[];');
      w.Math.random = () => 0.5;

      /* ========== 四、接口语义 ========== */
      await group('getGrantedVariantName / hasVariantTag / canReviveEntity 语义', async () => {
        eq(w.getGrantedVariantName('[赋予:虚形]'), '虚形', 'getGrantedVariantName 取 [赋予:虚形] -> 虚形');
        eq(w.getGrantedVariantName('[赋予：虚形]'), '虚形', 'getGrantedVariantName 全角冒号兼容');
        eq(w.getGrantedVariantName('[虚形]'), null, '原生标签不是赋予');
        eq(w.getGrantedVariantName('[单体;power:50]'), null, '非赋予标签返回 null');
        eq(w.getGrantedVariantName(''), null, '空串返回 null');
        const native = entity('e_gva', { tags: ['[虚形]'] });
        eq(w.hasVariantTag(native, '虚形'), true, 'hasVariantTag 认原生 tags');
        eq(w.hasVariantTag(entity('e_gvb', { tags: ['[钢体]'] }), '虚形'), false, '原生标签名不匹配 false');
        const buffed = entity('e_gvc');
        buffed.buffs.push({ type: 'variant', variant: '虚形', value: 1, duration: 3 });
        eq(w.hasVariantTag(buffed, '虚形'), true, 'hasVariantTag 认有效 variant buff');
        buffed.buffs.push({ type: 'variant', variant: '钢体', value: 1, duration: 2 });
        eq(w.hasVariantTag(buffed, '钢体'), true, '原生与 buff 合并判定（buff 路径）');
        const bad = entity('e_gvd');
        bad.buffs.push({ type: 'variant', variant: '虚形', value: 1, duration: 0 });
        eq(w.hasVariantTag(bad, '虚形'), false, 'duration:0 的 buff 无效');
        const rev = entity('h_gvs', { side: 'hero' });
        eq(w.canReviveEntity(rev), false, '无原生无临时 → 不可复活');
        rev.reviveCount = 1;
        eq(w.canReviveEntity(rev), true, '原生 reviveCount>0 → 可复活');
        const tmp = grant(entity('e_gva'), '复活', 4);
        eq(w.canReviveEntity(tmp), true, '临时复活 buff → 可复活');
        tmp.variantReviveUsed = true;
        eq(w.canReviveEntity(tmp), false, 'variantReviveUsed → 不可复活');
      });

      /* ========== 五、解析：三槽 / power=0 / turns / 全角 / 不兜底 ========== */
      await group('parseSkill/parseItem 三槽识别', async () => {
        const ex = w.parseSkill('【灵风术】[单避;power:50][单速;power:30][赋予:虚形][Turns:10][MP:10][法术][特效:灵风术][限1次]');
        eq(ex.type3, '[赋予:虚形]', '技能槽3识别赋予');
        eq(ex.power3, 0, '赋予槽 power=0');
        eq([ex.type, ex.power, ex.type2, ex.power2], ['[单避]', 50, '[单速]', 30], '其余槽位照常');
        eq(ex.turns, 10, '技能级 Turns 供赋予时长');
        const st = w.parseSkill('【槽时】[赋予:虚形;turns:5][Turns:10]');
        eq(st.slotTurns, 5, '槽位 ;turns 优先于技能级 Turns');
        const pw = w.parseSkill('【写力】[赋予:虚形;power:50]');
        eq(pw.type, '[赋予:虚形]', '带写入 power 的赋予仍入槽');
        const pg = w.parseSkill('【纯赋予】[赋予:狂暴]');
        eq([pg.type, pg.power], ['[赋予:狂暴]', 0], '纯赋予不兜底 20 威力普攻');
        const fq = w.parseSkill('【全角】[赋予：虚形]');
        check(String(fq.type).indexOf('赋予') >= 0 && String(fq.type).indexOf('虚形') >= 0 && fq.power === 0,
          '全角冒号 [赋予：虚形] 可入槽且 power=0', '实际 ' + JSON.stringify([fq.type, fq.power]));
        const orders = [
          '【甲】[赋予:虚形][单避;power:50][单速;power:30]',
          '【乙】[单避;power:50][赋予:虚形][单速;power:30]',
          '【丙】[单避;power:50][单速;power:30][赋予:虚形]'
        ];
        orders.forEach((txt, i) => {
          const s = w.parseSkill(txt);
          const slots = [[s.type, s.power], [s.type2, s.power2], [s.type3, s.power3]];
          const gi = slots.findIndex(p => String(p[0]).indexOf('赋予') >= 0);
          check(gi >= 0 && slots[gi][1] === 0 && slots.map(p => p[1]).filter(v => v > 0).sort().join(',') === '30,50',
            '第' + (i + 1) + '个槽序：赋予槽 power=0 且其余槽 50/30', '实际 ' + JSON.stringify(slots));
        });
        const it = w.parseItem('【灵风卷轴】[消耗品][单避;power:50][赋予:虚形][Turns:8][数量:2]');
        eq(it.type2, '[赋予:虚形]', '物品槽2识别赋予');
        eq(it.power2, 0, '物品赋予槽 power=0');
        eq(it.turns, 8, '物品级 Turns 供赋予时长');
      });

      /* ========== 六、classifySkill / 敌方AI选目标 ========== */
      await group('classifySkill 单体增益', async () => {
        const c = w.classifySkill(w.parseSkill('【赋予】[赋予:虚形]'));
        eq([c.hasEnemyTargetTag, c.hasSingleBuff, c.hasSummon], [false, true, false], '纯赋予 = 单体增益，不进敌方选目标');
        const o = w.classifySkill(w.parseSkill('【友赋】[赋予:狂暴][他人]'));
        check(o.hasOthers === true && o.hasSingleBuff === true, '[他人]+纯赋予 → 我方选目标');
        const m = w.classifySkill(w.parseSkill('【混】[单体;power:80][赋予:虚形]'));
        check(m.hasEnemyTargetTag === true, '混合攻击仍进敌方选目标');
        const ai = w.selectEnemySkillAndTarget(entity('e_gva'), [w.parseSkill('【AI赋】[赋予:钢体]')], [entity('e_gvb')], [hero('gv0')]);
        check(!!ai && !!ai.selectedSkill, 'selectEnemySkillAndTarget 支持纯赋予技能（不剪枝）');
        eq(ai && ai.specificTarget && ai.specificTarget.isAlive !== undefined && String(ai.specificTarget.id || '').indexOf('e_gv') >= 0,
          true, '纯赋予按同阵营（isOthers 语义）选盟友目标');
      });

      /* ========== 七、executeSkillAction 赋予行为 ========== */
      await group('executeSkillAction 自施 / 混合 / 带他人', async () => {
        const d = install([hero('gv0')], [entity('e_gva'), entity('e_gvb')]);
        const sk = w.parseSkill('【G赋】[赋予:钢体]');
        await w.executeSkillAction(d.h[0], null, sk, 1, false, true);
        let vb = variantBuffs(d.h[0]);
        eq(vb.length, 1, '不带他人：自施写 variant buff');
        eq(vb[0] && [vb[0].variant, vb[0].value], ['钢体', 1], 'buff 形态 {type:variant, variant, value:1}');
        eq(vb[0] && vb[0].duration, 3, '缺省时长 3');
        eq(variantBuffs(d.e[0]).length, 0, '不带他人不赋对手');
        const skT = w.parseSkill('【T赋】[赋予:钢体][Turns:6]');
        d.h[0].buffs = [];
        await w.executeSkillAction(d.h[0], null, skT, 1, false, true);
        eq(variantBuffs(d.h[0])[0] && variantBuffs(d.h[0])[0].duration, 6, '时长取技能级 Turns');
        d.h[0].buffs = [];
        const skM = w.parseSkill('【混赋】[单体;power:300][赋予:虚形]');
        d.h[0].skills = [skM];
        const hp0 = d.e[0].hp;
        await w.executeSkillAction(d.h[0], d.e[0], skM, 1, false, true);
        check(variantBuffs(d.h[0]).some(b => b.variant === '虚形'), '混合攻击：赋予自身');
        eq(variantBuffs(d.e[0]).length, 0, '混合攻击：不赋对手');
        check(d.e[0].hp < hp0, '混合攻击：攻击段照常结算');
        d.h[0].buffs = [];
        const skP = w.parseSkill('【写力赋】[赋予:虚形;power:50][暴击:100%][Turns:4]');
        await w.executeSkillAction(d.h[0], null, skP, 1, false, true);
        eq(variantBuffs(d.h[0]).map(b => [b.variant, b.value, b.duration]), [['虚形', 1, 4]],
          'power=0：不受写入 power / 暴击影响');
      });

      await group('executeSkillAction 带他人 / 同名max / 并存 / 原生不叠', async () => {
        const d = install([hero('gv0'), hero('gv1')], [entity('e_gva'), entity('e_gvb')]);
        const skO = w.parseSkill('【援赋】[赋予:狂暴][他人]');
        await w.executeSkillAction(d.h[0], d.h[1], skO, 1, false, true);
        check(variantBuffs(d.h[1]).some(b => b.variant === '狂暴'), '带他人：可指定盟友');
        eq(variantBuffs(d.h[0]).length, 0, '带他人：施法者自己不获');
        const dS = install([hero('gv0')], [entity('e_gva')]);
        const sum = entity('h_gvs', { isSummon: true, side: 'hero' });
        dS.h.push(sum);   // dS.h 即 heroesData 活引用，直接入队
        const skSummon = w.parseSkill('【召赋】[赋予:防火][他人]');
        await w.executeSkillAction(dS.h[0], sum, skSummon, 1, false, true);
        check(variantBuffs(sum).some(b => b.variant === '防火'), '带他人：可指定我方召唤物');
        const dE = install([hero('gv0')], [entity('e_gva'), entity('e_gvb')]);
        const skE = w.parseSkill('【援赋敌】[赋予:再生][他人]');
        await w.executeSkillAction(dE.e[0], dE.e[1], skE, 1, false, true);
        check(variantBuffs(dE.e[1]).some(b => b.variant === '再生'), '带他人：敌方施法者可赋盟友');
        const dMax = install([hero('gv0')], [entity('e_gva')]);
        await w.executeSkillAction(dMax.h[0], null, w.parseSkill('【长赋】[赋予:钢体][Turns:5]'), 1, false, true);
        await w.executeSkillAction(dMax.h[0], null, w.parseSkill('【短赋】[赋予:钢体][Turns:2]'), 1, false, true);
        const vbMax = variantBuffs(dMax.h[0]).filter(b => b.variant === '钢体');
        eq(vbMax.length, 1, '同名赋予只留一条');
        eq(vbMax[0] && vbMax[0].duration, 5, '同名时长取 max');
        await w.executeSkillAction(dMax.h[0], null, w.parseSkill('【异赋】[赋予:防火][Turns:2]'), 1, false, true);
        eq(variantBuffs(dMax.h[0]).map(b => b.variant).sort().join(','), '钢体,防火', '不同赋予并存');
        const dN = install([hero('gv0')], [entity('e_gva', { tags: ['[钢体]'] })]);
        await w.executeSkillAction(dN.e[0], null, w.parseSkill('【原赋】[赋予:钢体][Turns:5]'), 1, false, true);
        eq(variantBuffs(dN.e[0]).filter(b => b.variant === '钢体').length, 1,
          '原生同名不叠：至多一条赋予记录（效果唯一性由抗性/免疫组复核）');
      });

      /* ========== 八、applyEnemyTypeResist 临时抗性 ========== */
      await group('applyEnemyTypeResist 临时抗性', async () => {
        const d = install([hero('gv0')],
          [entity('e_gva'), entity('e_gvb'),
            entity('e_gvc', { tags: ['[虚形]'], resistMap: { '近战': 0.5 } }), entity('e_gvd')]);
        const eF = grant(d.e[0], '流体');
        eq(w.applyEnemyTypeResist(100, '远程', eF, null, false, true), 50, '临时流体：远程 0.5');
        eq(w.applyEnemyTypeResist(100, '近战', eF, null, false, true), 100, '临时流体：近战不减免');
        const eV = grant(d.e[1], '要害');
        eq(w.applyEnemyTypeResist(100, '法术', eV, null, true, true), 50, '临时要害：AoE 0.5');
        eq(w.applyEnemyTypeResist(100, '法术', eV, null, false, true), 100, '临时要害：单体不减免');
        grant(d.e[2], '虚形');
        eq(w.applyEnemyTypeResist(100, '近战', d.e[2], null, false, true), 50, '原生+临时同名：只减半一次不叠 25');
        eq(d.e[2].resistMap['近战'], 0.5, '原生 resistMap 原值不被改写');
        eq(Object.keys(d.e[2].resistMap).length, 1, '临时赋予不增删原生 resistMap 键');
        grant(d.e[3], '破法');
        eq(w.applyEnemyTypeResist(100, '法术', d.e[3], null, false, true), 50, '临时破法：法术 0.5');
        const heroF = grant(d.h[0], '流体');
        eq(w.applyEnemyTypeResist(100, '远程', heroF, null, false, true), 50,
          '我方英雄临时流体同样生效（穿透位于护甲前的属性减伤，穿透仍受抗性）');
      });

      /* ========== 九、免疫认识临时钢体/防火/耐毒（不清已有状态） ========== */
      await group('临时免疫与已有状态', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        const e = grant(d.e[0], '耐毒');
        e.buffs.push({ type: 'poison', value: 30, duration: 3 });
        const skP = w.parseSkill('【毒】[中毒;power:30]');
        await w.applySingleTagEffect(d.h[0], e, '[中毒]', 30, 100, 1, 3, skP);
        const ps = e.buffs.filter(b => b.type === 'poison');
        eq(ps.length, 1, '临时耐毒：挡新施加中毒');
        eq(ps[0] && ps[0].value, 30, '已有中毒不被清除');
        const eF = grant(entity('e_gvb'), '防火');
        eF.buffs.push({ type: 'burn', value: 20, duration: 3 });
        const skB = w.parseSkill('【燃】[燃烧;power:20]');
        await w.applySingleTagEffect(d.h[0], eF, '[燃烧]', 20, 100, 1, 3, skB);
        const bs = eF.buffs.filter(b => b.type === 'burn');
        eq(bs.length, 1, '临时防火：挡新施加燃烧');
        eq(bs[0] && bs[0].value, 20, '已有燃烧不被清除');
        const eS = grant(entity('e_gvc'), '钢体');
        const skS = w.parseSkill('【晕】[眩晕;power:50]');
        await w.applySingleTagEffect(d.h[0], eS, '[眩晕]', 50, 100, 1, 3, skS);
        eq(eS.buffs.filter(b => b.type === 'paralyze' || b.type === 'stun').length, 0, '临时钢体：挡眩晕控制');
        const nativeE = entity('e_gvd', { tags: ['[耐毒]'] });
        await w.applySingleTagEffect(d.h[0], nativeE, '[中毒]', 30, 100, 1, 3, skP);
        eq(nativeE.buffs.filter(b => b.type === 'poison').length, 0, '原生耐毒对照：同样挡新中毒');
      });

      /* ========== 十、数值与触发：狂暴 / 再生 / 吸血 / 荆棘 ========== */
      await group('临时狂暴 / 再生 / 吸血 / 荆棘', async () => {
        const d = install([hero('gv0'), hero('gv1')], [entity('e_gva'), entity('e_gvb')]);
        const eR = grant(d.e[0], '狂暴');
        eR.hp = 200;
        eq(w.getEffectiveStats(eR).atk, 150, '临时狂暴：HP<=30% 攻×1.5');
        const hR = grant(d.h[0], '狂暴');
        hR.hp = 200;
        eq(w.getEffectiveStats(hR).atk, 150, '临时狂暴：我方同样生效');
        hR.hp = 500;
        eq(w.getEffectiveStats(hR).atk, 100, 'HP>30% 不触发');
        const eG = grant(entity('e_gvc'), '再生', 4);
        d.e.push(eG);   // enemiesData[2] === eG（活引用）
        eG.hp = 500;
        ev('CombatEvents.emit(EVENTS.TURN_START, { entity: enemiesData[2] })');
        eq(eG.hp, 600, 'TURN_START 临时再生：+10%maxHp');
        const hL = grant(entity('h_gvs', { isSummon: true, side: 'hero' }), '再生', 4);
        d.h.push(hL);   // heroesData[2] === hL
        hL.hp = 500;
        ev('CombatEvents.emit(EVENTS.TURN_START, { entity: heroesData[2] })');
        eq(hL.hp, 600, 'TURN_START 临时再生：我方召唤等价');
        const hLeech = grant(d.h[1], '吸血', 4);
        hLeech.hp = 400;
        ev('CombatEvents.emit(EVENTS.AFTER_DAMAGE, { caster: heroesData[1], target: enemiesData[0], targetDom: null, incomingDamageType: "近战", hpDmg: 100, shieldDmg: 0, actionId: "gvg" })');
        eq(hLeech.hp, 430, 'AFTER_DAMAGE 临时吸血：30%hpDmg');
        const eThorn = grant(entity('e_gvd'), '荆棘', 4);
        d.e[1] = eThorn;   // enemiesData[1] 换装为荆棘夹具
        const atkHp0 = d.e[0].hp;
        ev('CombatEvents.emit(EVENTS.AFTER_DAMAGE, { caster: enemiesData[0], target: enemiesData[1], targetDom: null, incomingDamageType: "近战", hpDmg: 100, shieldDmg: 0, actionId: "gvg" })');
        eq(atkHp0 - d.e[0].hp, 50, 'AFTER_DAMAGE 临时荆棘：反弹 50% 实际伤害');
        const atkHp1 = d.e[0].hp;
        ev('CombatEvents.emit(EVENTS.AFTER_DAMAGE, { caster: enemiesData[0], target: enemiesData[1], targetDom: null, incomingDamageType: "近战", hpDmg: 4, shieldDmg: 0, actionId: "gvg" })');
        eq(atkHp1 - d.e[0].hp, 10, '临时荆棘：护甲后保底 10');
      });

      /* ========== 十一、12 项敌我及双侧召唤等价 ========== */
      await group('敌我/双侧召唤等价抽检', async () => {
        const cases = [
          ['hsum', '虚形', t => eq(w.applyEnemyTypeResist(100, '近战', t, null, false, true), 50, '临时虚形×我方召唤')],
          ['esum', '破法', t => eq(w.applyEnemyTypeResist(100, '法术', t, null, false, true), 50, '临时破法×敌方召唤')],
          ['enemy', '流体', t => eq(w.applyEnemyTypeResist(100, '远程', t, null, false, true), 50, '临时流体×敌方')],
          ['esum', '要害', t => eq(w.applyEnemyTypeResist(100, '近战', t, null, true, true), 50, '临时要害×敌方召唤(AoE)')],
          ['esum', '狂暴', t => { t.hp = 200; eq(w.getEffectiveStats(t).atk, 150, '临时狂暴×敌方召唤'); }],
          ['hero', '钢体', async t => {
            const sk = w.parseSkill('【晕】[眩晕;power:50]');
            await w.applySingleTagEffect(ev('enemiesData[0]'), t, '[眩晕]', 50, 100, 1, 3, sk);
            eq(t.buffs.filter(b => b.type === 'paralyze' || b.type === 'stun').length, 0, '临时钢体×我方英雄：挡眩晕');
          }],
          ['esum', '防火', async t => {
            const sk = w.parseSkill('【燃】[燃烧;power:20]');
            await w.applySingleTagEffect(ev('heroesData[0]'), t, '[燃烧]', 20, 100, 1, 3, sk);
            eq(t.buffs.filter(b => b.type === 'burn').length, 0, '临时防火×敌方召唤：挡燃烧');
          }],
          ['enemy', '耐毒', async t => {
            const sk = w.parseSkill('【毒】[中毒;power:30]');
            await w.applySingleTagEffect(ev('heroesData[0]'), t, '[中毒]', 30, 100, 1, 3, sk);
            eq(t.buffs.filter(b => b.type === 'poison').length, 0, '临时耐毒×敌方：挡中毒');
          }],
          ['hsum', '狂暴', t => { t.hp = 200; eq(w.getEffectiveStats(t).atk, 150, '临时狂暴×我方召唤'); }],
          ['enemy', '吸血', (t, acc) => {
            t.hp = 400;
            ev(`CombatEvents.emit(EVENTS.AFTER_DAMAGE, { caster: ${acc}, target: enemiesData[1], targetDom: null, incomingDamageType: "近战", hpDmg: 100, shieldDmg: 0, actionId: "gvg" })`);
            eq(t.hp, 430, '临时吸血×敌方');
          }],
          ['hsum', '荆棘', (t, acc) => {
            ev(`CombatEvents.emit(EVENTS.AFTER_DAMAGE, { caster: enemiesData[0], target: ${acc}, targetDom: null, incomingDamageType: "近战", hpDmg: 100, shieldDmg: 0, actionId: "gvg" })`);
            eq(ev('enemiesData[0].hp'), 950, '临时荆棘×我方召唤：反弹 50');
          }],
          ['hero', '复活', (t, acc) => {
            eq(w.canReviveEntity(t), true, '临时复活×我方英雄可判定');
            eq(w.tryReviveEnemy(t, domOf('h_gv0')), true, '临时复活×我方英雄真实站起');
            eq([t.hp, t.variantReviveUsed], [300, true], '我方临时复活 30%maxHp + 置位');
          }]
        ];
        for (const [kind, name, fn] of cases) {
          const { t, acc } = installSide(kind);
          grant(t, name, 4);
          await fn(t, acc);
        }
      });

      /* ========== 十二、复活路径 ========== */
      await group('tryReviveEnemy 临时复活语义', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        const e = grant(d.e[0], '复活', 5);
        eq(w.tryReviveEnemy(e, domOf('e_gva')), true, '临时复活：敌方站起');
        eq([e.hp, e.buffs.length, e.shield, e.variantReviveUsed], [300, 0, 0, true],
          '复活 30%maxHp、清空 buff/盾、置 variantReviveUsed');
        eq(e.reviveCount || 0, 0, '原生 reviveCount 不增加');
        eq(w.canReviveEntity(e), false, '复活后本场不可再复活');
        e.buffs.push({ type: 'variant', variant: '复活', value: 1, duration: 5 });
        e.hp = 1000;
        eq(w.canReviveEntity(e), false, '重施赋予不复位复活机会');
        const fresh = grant(entity('e_gvd'), '复活', 1);
        d.e.push(fresh);
        const snap = ev('JSON.parse(JSON.stringify(enemiesData[1]))');
        eq(w.canReviveEntity(snap, true), true, '结算前快照 + grantedReviveAtTick：最后 tick 仍可复活');
        eq(w.canReviveEntity(snap), true, '未耗快照（duration>0）不带 grantedReviveAtTick 亦可复活');
        const usedSnap = ev('JSON.parse(JSON.stringify(enemiesData[0]))');
        eq(w.canReviveEntity(usedSnap, true), false, '已耗复活对象传快照也不可复活');
        const timer = grant(entity('e_gvb'), '复活', 3);
        timer.buffs.push({ type: 'spd', value: 10, duration: 2 });
        const durBefore = timer.buffs.map(b => b.duration);
        w.canReviveEntity(timer);
        eq(timer.buffs.map(b => b.duration), durBefore, 'canReviveEntity 不改变其他 buff 计时');
        const both = entity('e_gvc', { reviveCount: 1 });
        grant(both, '复活', 5);
        eq(w.tryReviveEnemy(both, domOf('e_gvb')), true, '原生+临时共存：第一次致死仍复活');
        const consumedOnce = both.variantReviveUsed === true || (both.reviveCount || 0) === 0;
        check(consumedOnce, '原生+临时共用本场一次（消耗其一）');
        eq(w.tryReviveEnemy(both, domOf('e_gvb')), false, '第二次致死不再复活');
      });

      await group('真实 executeSkillAction 致命 → 临时复活', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        const e = grant(d.e[0], '复活', 8);
        const sk = w.parseSkill('【斩】[单体;power:5000][必中]');
        await w.executeSkillAction(d.h[0], e, sk, 1, false, true);
        eq([e.isAlive !== false, e.hp], [true, 300], '致命一击经 ON_FATAL_DAMAGE 临时复活 30% 站起');
        eq(e.variantReviveUsed, true, '复活消耗置位');
      });

      await group('nextTurn DoT 最后tick → 临时复活', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        const e = grant(d.e[0], '复活', 1);   // duration 1：本 tick 扣减后恰好耗尽（结算前快照路径）
        e.buffs.push({ type: 'poison', value: 5000, duration: 1 });
        ev('state.isGameStarted = true;');
        ev('state.actionQueue = [{ ref: enemiesData[0], type: "enemy", isExtraTurn: false }]; state.queueIndex = 0;');
        replace('executeHeroTurn', () => {});
        replace('executeSummonTurn', () => {});
        replace('executeEnemyTurn', () => {});
        replace('updateActiveHeroDisplay', () => {});
        replace('endTurn', () => {});
        await w.nextTurn(ev('combatToken'));
        eq([e.isAlive !== false, e.hp, e.variantReviveUsed === true], [true, 300, true],
          'DoT 最后tick致死经临时复活 30% 站起（duration 双 1 为真最后tick）');
      });

      await group('ON_FATAL_DAMAGE 路径', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        const e = grant(d.e[0], '复活', 8);
        const prevented = ev(`(function () {
          const ctx = { target: enemiesData[0], targetDom: document.getElementById('e_gva-sprite') };
          CombatEvents.emit(EVENTS.ON_FATAL_DAMAGE, ctx);
          return !!ctx.prevented;
        })()`);
        eq(prevented, true, 'ON_FATAL_DAMAGE：临时复活拦截致命并置 prevented');
        eq([e.hp, e.variantReviveUsed], [300, true], 'ON_FATAL_DAMAGE 路径复活 30% + 置位');
      });

      await group('resolveSummonDeath 路径', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        const sum = grant(entity('h_gvs', { isSummon: true, side: 'hero' }), '复活', 5);
        d.h.push(sum);
        eq(w.resolveSummonDeath(sum, domOf('h_gvs'), false), true, '召唤致死经临时复活返回 true');
        eq([sum.hp, sum.variantReviveUsed, d.h.indexOf(sum) >= 0], [300, true, true], '召唤复活 30%、置位、仍在阵营');
        eq(w.resolveSummonDeath(sum, domOf('h_gvs'), false), true, '第二次致死：复活已耗 → 走消散分支');
        eq(d.h.indexOf(sum) < 0, true, '消散后移出阵营');
      });

      /* ========== 十三、runResetPipeline 基线回滚 ========== */
      await group('runResetPipeline 基线回滚临时状态', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        // 构建基线（无临时状态）→ 授予 → 重置管线按基线回滚
        ev('initialHeroesCache = JSON.parse(JSON.stringify(heroesData));' +
          'initialEnemiesCache = JSON.parse(JSON.stringify(enemiesData));');
        grant(d.h[0], '钢体', 4);
        grant(d.h[0], '虚形', 3);
        d.h[0].variantReviveUsed = true;
        grant(d.e[0], '流体', 4);
        let threw = null;
        try { ev('runResetPipeline()'); } catch (err) { threw = err; }
        const h0 = ev('heroesData[0]') || {};
        const e0 = ev('enemiesData[0]') || {};
        eq(variantBuffs(h0).length, 0, 'runResetPipeline 按基线回滚清除我方临时赋予');
        eq(variantBuffs(e0).length, 0, 'runResetPipeline 按基线回滚清除敌方临时赋予');
        eq(h0.variantReviveUsed, undefined, 'runResetPipeline 删除 variantReviveUsed');
        eq(ev('state.actionQueue.length'), 0, 'runResetPipeline 清空行动队列');
        eq(ev('_pipelineFrozen'), true, 'runResetPipeline 冻结推进（finally 统一恢复）');
        check(!threw, 'runResetPipeline 全程无异常', threw ? String(threw) : '');
      });

      /* ========== 十四、编辑器保存/重开：三槽往返与威力禁用 ========== */
      await group('编辑器 openEditor/syncEditorDataToMemory 三槽往返', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        ev('state.isGameStarted=false;_pipelineFrozen=false;editorLiveHeroes=null;editorLiveEnemies=null;');
        d.h[0].skills = [w.parseSkill('【灵风术】[单避;power:50][单速;power:30][赋予:虚形][Turns:10][MP:10][限1次]')];
        ev('openEditor()');
        const t3 = doc.getElementById('edit-h-0-s-0-type3');
        const p3 = doc.getElementById('edit-h-0-s-0-power3');
        const st3 = doc.getElementById('edit-h-0-s-0-slot-turns3');
        check(!!t3 && !!p3, 'openEditor 真实渲染技能行三槽表单');
        eq(t3 && t3.value, '[赋予:虚形]', '重开显示赋予槽');
        eq(p3 && p3.disabled, true, '赋予槽威力输入禁用（复用现有控件，非新增UI）');
        if (t3) t3.value = '[赋予:狂暴]';
        if (st3) st3.value = '7';
        w.syncEditorDataToMemory();
        const s0 = d.h[0].skills[0];
        eq(s0.type3, '[赋予:狂暴]', 'syncEditorDataToMemory 保存赋予槽改动');
        eq(s0.slotTurns3, 7, '槽位轮数写回');
        ev('openEditor()');   // 重开
        const t3b = doc.getElementById('edit-h-0-s-0-type3');
        const p3b = doc.getElementById('edit-h-0-s-0-power3');
        eq(t3b && t3b.value, '[赋予:狂暴]', '重开后赋予槽往返一致');
        eq(p3b && p3b.disabled, true, '重开后威力输入仍禁用');
        w.syncEditorDataToMemory();
        eq(d.h[0].skills[0].type3, '[赋予:狂暴]', '二次保存往返一致');
        const modal = doc.getElementById('editor-modal');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
      });

      /* ========== 十五、UI 契约 ========== */
      await group('SKILL_TYPES / expandTagLabel / tagTip / updateBuffUI', async () => {
        eq(grantLabels.filter(t => skTypes.indexOf(t) < 0), [], 'SKILL_TYPES 含12个完整赋予标签');
        const editOpts = ev('SKILL_TYPE_EDIT_OPTIONS.slice()');
        eq(grantLabels.filter(t => editOpts.indexOf(t) < 0), [], 'SKILL_TYPE_EDIT_OPTIONS 含12个完整赋予标签');
        for (let i = 0; i < GRANTS.length; i++) {
          eq(w.expandTagLabel('[赋予:' + GRANTS[i] + ']'), '赋予·' + GRANTS[i], 'expandTagLabel 赋予:' + GRANTS[i]);
        }
        const tips = GRANTS.map(n => ev('getTagTip("赋予:' + n + '", 0)'));
        check(tips.every(t => t && t.length > 0), 'getTagTip 12个赋予标签均有效果文案',
          '缺:' + GRANTS.filter((n, i) => !tips[i]).join('、'));
        check(String(ev('tagTipAttrs("赋予:虚形", 0, "[赋予:虚形]")')).indexOf('data-tagtip-title="【赋予·虚形】"') >= 0,
          'tagTipAttrs 输出赋予悬浮窗标题');
        const d = install([hero('gv0')], [entity('e_gva')]);
        const h = grant(d.h[0], '虚形', 4);
        const boxEl = doc.getElementById('h_gv0-buffs');
        w.updateBuffUI = realBuffUI;
        w.updateBuffUI(h);
        check(boxEl.textContent.indexOf('虚形·4回') >= 0, 'updateBuffUI 显示 虚形·4回',
          '实际 ' + JSON.stringify(boxEl.textContent));
        h.buffs[0].duration = 1;
        w.updateBuffUI(h);
        check(boxEl.innerHTML.indexOf('arcane-status-badge-expiring') >= 0, '临期（duration<=1）加 arcane-status-badge-expiring');
        h.buffs[0].duration = 0;
        w.updateBuffUI(h);
        check(boxEl.textContent.indexOf('虚形') < 0, '到期（duration 0）徽章移除');
        w.updateBuffUI = () => {};
      });

      await group('真实回合计时与原生隔离', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        GRANTS.forEach(name => grant(d.e[0], name, 2));
        ev('state.isGameStarted=true;_pipelineFrozen=false;state.actionQueue=[{ref:enemiesData[0],type:"enemy",isExtraTurn:false}];state.queueIndex=0;');
        replace('executeEnemyTurn', () => {});
        replace('updateActiveHeroDisplay', () => {});
        await w.nextTurn(ev('combatToken'));
        eq(variantBuffs(d.e[0]).map(b => b.duration), GRANTS.map(() => 1), '12种赋予首次行动各扣一回');
        ev('state.actionQueue[0].isExtraTurn=true;');
        await w.nextTurn(ev('combatToken'));
        eq(variantBuffs(d.e[0]).map(b => b.duration), GRANTS.map(() => 1), '额外行动不重复扣赋予时长');
        ev('state.actionQueue[0].isExtraTurn=false;');
        await w.nextTurn(ev('combatToken'));
        eq(variantBuffs(d.e[0]).length, 0, '下一次首次行动到期清除12种临时赋予');
        eq(GRANTS.filter(name => w.hasVariantTag(d.e[0], name)), [], '到期查询不保留临时特性');
        eq(w.applyEnemyTypeResist(100, '近战', d.e[0], null, true, true), 100, '虚形与要害到期后不再减伤');
        eq(w.canReviveEntity(d.e[0]), false, '未触发复活到期后失去资格');
        d.e[0].tags = ['[虚形]']; d.e[0].resistMap = { '近战': 0.5 };
        grant(d.e[0], '虚形', 1);
        await w.nextTurn(ev('combatToken'));
        eq(variantBuffs(d.e[0]).length, 0, '同名原生特性上的赋予按时到期');
        eq(d.e[0].tags, ['[虚形]'], '到期不删除原生标签');
        eq(d.e[0].resistMap, { '近战': 0.5 }, '到期不修改原生抗性');
        eq(w.applyEnemyTypeResist(100, '近战', d.e[0], null, false, true), 50, '原生虚形在临时赋予到期后继续生效');
        ev('state.isGameStarted=false;');
      });

      await group('灵风术三槽整体执行与资源', async () => {
        const d = install([hero('gv0')], [entity('e_gva')]);
        const s = w.parseSkill('【灵风术】[单避;power:50][单速;power:30][赋予:虚形][Turns:10][MP:10][法术][特效:灵风术][限1次]');
        eq([s.fxTag, s.damageType, s.cost, s.maxUses], ['灵风术', '法术', 10, 1], '原例附加字段完整保留');
        d.h[0].skills = [s];
        await w.executeSkillAction(d.h[0], d.h[0], { ...s, fxTag:null }, 1);
        eq(d.h[0].mp, 40, '灵风术仅扣10MP');
        eq(s.usesRemaining, 0, '限1次沿既有技能通道消费一次');
        eq(d.h[0].buffs.filter(b => ['eva', 'spd', 'variant'].includes(b.type)).map(b => [b.type, b.value, b.duration]),
          [['eva', 50, 10], ['spd', 30, 10], ['variant', 1, 10]], '闪避、速度与虚形三个槽均持续10回合');
        eq(variantBuffs(d.h[0])[0].variant, '虚形', '原例赋予虚形而非其他特性');
        eq(d.e[0].hp, 1000, '纯辅助例子不误造成普攻伤害');
      });

      await group('荆棘致命反伤与复活消费', async () => {
        const d = install([hero('gv0', { hp:20 })], [entity('e_gva')]);
        grant(d.h[0], '复活', 3); grant(d.e[0], '荆棘', 3);
        ev('CombatEvents.emit(EVENTS.AFTER_DAMAGE,{caster:heroesData[0],target:enemiesData[0],targetDom:null,incomingDamageType:"近战",hpDmg:100,shieldDmg:0})');
        eq([d.h[0].hp, d.h[0].variantReviveUsed, d.h[0].buffs.length], [300, true, 0], '荆棘致命反伤经真实事件消费临时复活');
        await w.executeSkillAction(d.h[0], d.h[0], w.parseSkill('【重授复活】[赋予:复活][Turns:5]'), 1, false, true);
        eq(variantBuffs(d.h[0]).length, 0, '复活已耗尽后处理器不再授予机会');
        check(calls.hist.some(s => s.includes('复活】机会已耗尽')), '重授已耗尽复活写明确战报');
        const baseline = source.slice(source.indexOf('// 初始化避死被动触发状态'), source.indexOf('// 【非致命】重置全员制服胜利标志'));
        check(/heroesData\.concat\(enemiesData\)/.test(baseline) && /delete e\.hasRageNarrated/.test(baseline), '新战局同时清理英雄与敌方狂暴演出标记');
      });

      check(!mock || typeof mock.genCount !== 'function' || mock.genCount() === gen0, '赋予专项未调用外部 LLM');
      return { pending };
    } finally {
      for (const [name, fn] of originals) { try { w[name] = fn; } catch (e) { /* 恢复不掩盖断言 */ } }
      try { w.clearArcaneFx(); } catch (e) { /* 同上 */ }
      try { w.clearVariantState(); } catch (e) { /* 同上 */ }
      w.Math.random = saved.random;
      w.__gvgRestore = saved;
      ev(`(() => {
        const s = window.__gvgRestore;
        heroesData = s.heroesData; enemiesData = s.enemiesData;
        battleHistory = s.battleHistory; _historyRawCache = s._historyRawCache;
        initialHeroesCache = s.ihc; initialEnemiesCache = s.iec;
        Object.assign(state, s.stateValues);
        state.actionQueue = s.stateQueue; state.queueIndex = s.stateIndex;
        editorLiveHeroes = s.editorHeroes; editorLiveEnemies = s.editorEnemies;
        nonLethalSettings.enabled = s.nonLethal; state.isGameStarted = s.started;
        combatToken = s.token; _pipelineFrozen = s.frozen;
        pendingSummons = s.pendingSummons;
        llmState.allyAutoSpeak = s.llmAlly; llmState.enemyAutoSpeak = s.llmEnemy;
        delete window.__gvgRestore;
      })()`);
      root.remove();
    }
  };
})();
