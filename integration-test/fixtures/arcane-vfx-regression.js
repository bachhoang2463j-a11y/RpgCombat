/* 秘术动效回归：挂载真实引擎，逻辑计数与真实绘制分别验证，不复制战斗实现。
   命中出口已统一：单点远程/召唤为 arrow 身份演出，伤害与闪避文字/音改走 playHitFeedback；
   本文件对 playAttackIdentityFx 只做真实接口包装计数，playHitFeedback 只逻辑计数，
   其真实 DOM/音频行为由 hit-feedback-regression.js 专项验证。 */
(function () {
  'use strict';
  window.runArcaneVfxRegression = async function ({ w, check, eq, mock }) {
    const ev = code => w.eval(code);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const names = ['灵风术', '纳克提特障壁术', '伊西丝之拥', '折影步', '巫师护盾'];
    const texts = [
      '【灵风术】[单避;power:50][单速;power:30][Turns:10][MP:10][法术][特效:灵风术][限1次]',
      '【纳克提特障壁术】[肃正:近战;power:200;Armor:40][MP:10][TP:15][法术][特效:纳克提特障壁术][高阶]',
      '【伊西斯之拥】[群回;power:100][群驱散:1][特效:伊西丝之拥][MP:10][法术]',
      '【折影步】[回避;power:900][MP:4][反应:近战][特效:折影步][法术]',
      '【巫师护盾】[单盾;power:180][MP:4][暴击:5%][反应][特效:巫师护盾][法术]'
    ];
    const api = ['resolveSingleAttackFx', 'playSingleAttackFx', 'isArcaneSkillFx', 'playArcaneSkillFx', 'playArcaneProjectile',
      'clearArcaneFx', 'playAttackIdentityFx', 'playHitFeedback'];
    const missing = api.filter(name => ev('typeof ' + name) !== 'function');
    eq(missing, [], '秘术与命中出口接口全部存在');
    if (missing.length) return { pending: missing };
    const gen0 = mock.genCount();
    const saved = ev(`({ heroesData, enemiesData, initialHeroesCache, initialEnemiesCache, battleHistory, _historyRawCache,
      teamBarrier, teamBarrierMax, teamBarrierName, barrierArmor, barrierSub, barrierStandIn, barrierAoEActive, barrierAoELeak,
      combatToken, frozen:_pipelineFrozen, shatter:_barrierShatterAt, state:{...state}, llm:{...llmState}, nonLethal:nonLethalSettings.enabled,
      speeds:new Map(_recentSpeedChanges), emit:CombatEvents.emit, emitAsync:CombatEvents.emitAsync, random:Math.random,
      particles:fxEngine.particles.slice() })`);
    const functions = new Map();
    const replace = (name, fn) => {
      if (!functions.has(name)) functions.set(name, w[name]);
      w[name] = fn;
    };
    const calls = { skills:[], projectiles:[], svg:[], sounds:[], floats:[], dodge:[], hit:[], dispel:[], identity:[], feedback:[], flinch:[] };
    const clearCalls = () => Object.values(calls).forEach(list => { list.length = 0; });
    const realSkill = w.playArcaneSkillFx, realProjectile = w.playArcaneProjectile;
    const timerIds = new Set();
    const nativeSetTimeout = w.setTimeout, nativeClearTimeout = w.clearTimeout;
    // 逻辑组缩短引擎演出等待；真实绘制组恢复浏览器时钟，不用加速计时验证动画。
    const restoreTimers = () => {
      timerIds.clear();
      w.setTimeout = nativeSetTimeout; w.clearTimeout = nativeClearTimeout;
    };
    const reg = ev('WEBM_FX_REGISTRY');
    const delays = names.map(name => reg[name].delay);
    const root = w.document.createElement('div');
    root.id = 'arcane-regression-targets';
    root.style.cssText = 'position:fixed;left:40px;top:200px;width:580px;height:190px;pointer-events:none;';
    root.innerHTML = [0, 1, 2].map((n) => '<div id="hero-card-h_arcane' + n + '" style="position:absolute;left:' + (n * 180) + 'px;top:0;width:160px;height:130px;background:#243047;border:1px solid #7dd3fc">秘术测试目标</div>').join('') + '<div id="e_arcane-sprite" style="position:absolute;left:370px;top:-160px;width:100px;height:100px;background:#4c1d58">法术来源</div>';
    w.document.body.appendChild(root);
    const hDom = w.document.getElementById('hero-card-h_arcane0');
    const eDom = w.document.getElementById('e_arcane-sprite');
    const entity = (id, extra) => Object.assign({ id, name:id, hp:500, maxHp:500, mp:100, maxMp:100, tp:60, maxTp:100,
      atk:10, def:0, spd:1, shield:0, actCount:1, isAlive:true, buffs:[], skills:[], items:[], classType:null,
      isSummon:false, row:'front' }, extra);
    const installData = (heroes, enemies) => {
      ev('heroesData=' + JSON.stringify(heroes) + ';enemiesData=' + JSON.stringify(enemies) + ';teamBarrier=0;teamBarrierMax=0;barrierArmor=0;barrierSub=null;barrierAoELeak=null;barrierAoEActive=false;_barrierShatterAt=0;');
      return { h:ev('heroesData'), e:ev('enemiesData') };
    };
    const skill = i => w.parseSkill(texts[i]);
    const attack = (type='法术', tag='单体', power=50) => w.parseSkill('【回归攻击】[' + tag + ';power:' + power + '][' + type + ']');
    const group = async (name, fn) => {
      try { await fn(); }
      catch (e) { check(false, name + '执行异常', String(e.stack || e)); }
    };
    const outcomeOf = (outcomes, t) => {
      if (typeof outcomes === 'function') return outcomes(t);
      if (outcomes && typeof outcomes.get === 'function') return outcomes.get(t && t.id);
      if (outcomes && typeof outcomes === 'object') return outcomes[t && t.id];
      return 'hit';
    };
    try {
      w.setTimeout = (fn, ms, ...args) => {
        const id = {};
        timerIds.add(id);
        Promise.resolve().then(() => { if (timerIds.delete(id)) fn(...args); });
        return id;
      };
      w.clearTimeout = id => { timerIds.delete(id); };
      ev('combatToken={};_pipelineFrozen=false;nonLethalSettings.enabled=false;llmState.allyAutoSpeak=false;llmState.enemyAutoSpeak=false;state.isGameStarted=false;state.highTierNarrated=new Set();state.actionQueue=[];state.queueIndex=0;');
      w.Math.random = () => 0.5;
      ev('CombatEvents').emit = () => {};
      ev('CombatEvents').emitAsync = async () => {};
      for (const name of ['updateHeroUI','updateEnemyUI','updateTeamBarrierUI','renderTurnQueue','triggerBarrierShatter',
        'tryTriggerEnemyLowHpSpeak','tryTriggerEnemyMolt','tryTriggerEnemyRage','tryTriggerEnemyLink','notifyManaSpent',
        'triggerHighTierCombinedSpeak','triggerAllyHealSpeak','triggerAllyAutoSpeak','spawnFocusOverlay','spawnChargeUpParticles',
        'spawnHitFlash','triggerScreenShake','spawnDodgeSmokeParticles','playAOEEffect','playWebMFX','playCustomAudio']) replace(name, () => {});
      replace('playEnemyFlinchAnim', dom => calls.flinch.push(dom && dom.id));
      replace('playSound', key => calls.sounds.push(key));
      replace('playRandomStandardGunshot', () => calls.sounds.push('gunshot'));
      replace('playShotgunSound', () => calls.sounds.push('shotgun'));
      replace('playSVGEffect', (dom, type) => calls.svg.push({dom,type}));
      const floatText = w.createFloatingText;
      replace('createFloatingText', (dom, text, color, burst) => { calls.floats.push(text); floatText(dom,text,color,burst); });
      replace('promptReaction', async (target, skills) => skills.length ? {type:'reaction',hero:target,skill:skills[0]} : null);
      replace('playArcaneSkillFx', (tag, caster, targets, reaction) => {
        const handle = { doneAt:Date.now(), cancel() {}, dispel(dom) { calls.dispel.push(dom); } };
        if (tag === '折影步') handle.dodge = success => calls.dodge.push(success);
        if (tag === '巫师护盾') handle.hit = type => calls.hit.push(type);
        calls.skills.push({tag,caster,targets,reaction,handle});
        return handle;
      });
      replace('playArcaneProjectile', async (type,from,to,dodged) => { calls.projectiles.push({type,from,to,dodged}); });
      // 真实签名包装：只记录身份演出与逐目标 onImpact 元信息，不生成/复制动画。
      replace('playAttackIdentityFx', ({ scope = 'single', subtype, targets = [], outcomes = null, onImpact = null } = {}) => {
        const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
        calls.identity.push({ scope, subtype, targets:list, outcomes });
        const handle = { doneAt:Date.now(), cancel() {}, onFinish:new Set() };
        list.forEach(t => { if (onImpact) onImpact(t, { scope, subtype, outcome:outcomeOf(outcomes, t), beatMs:0, point:{x:0,y:0} }); });
        return handle;
      });
      // 命中反馈真实行为由专用 fixture 覆盖，此处只按引用记录九合成结果与入口参数。
      replace('playHitFeedback', (results, opts = {}) => {
        (Array.isArray(results) ? results : [results]).filter(Boolean)
          .forEach(r => calls.feedback.push({ targetId:r.targetId, outcome:r.outcome, hpDmg:r.hpDmg, suppressDodgeFx:r.suppressDodgeFx, opts }));
        return { doneAt:Date.now(), cancel() {} };
      });

      await group('标签解析', async () => {
        const s = texts.map(t => w.parseSkill(t));
        eq([s[0].type,s[0].power,s[0].type2,s[0].power2,s[0].turns,s[0].maxUses], ['[单避]',50,'[单速]',30,10,1], '灵风术双槽、持续与限次解析不变');
        eq([s[1].type,s[1].power,s[1].barrierArmor,s[1].barrierSub,s[1].cost,s[1].tpCost], ['[肃正:近战]',200,40,'近战',10,15], '肃正子类型、耐久、护甲与耗费解析不变');
        eq([s[2].name,s[2].fxTag,s[2].type2,s[2].power2], ['伊西斯之拥','伊西丝之拥','[群驱散]',1], '伊西斯技能名与伊西丝特效名分别精确解析');
        eq([s[3].isReaction,s[3].reactionTarget,s[3].power], [true,'近战',900], '折影步仍为近战反应');
        eq([s[4].isReaction,s[4].reactionTarget,s[4].critRate,s[4].power], [true,'all',5,180], '巫师护盾反应范围及暴击率不变');
        eq(names.map(n => w.isArcaneSkillFx(n)), [true,true,true,true,true], '五个新标签精确识别');
        eq(['障壁术','伊西斯之拥','火焰01',null].map(n => w.isArcaneSkillFx(n)), [false,false,false,false], '不覆盖旧标签、不添加同音别名');
        eq(delays, [1,1.2,1.1,0,0], '蓄势拍点保持 demo 时序');
        check(names.every(n => reg[n].url === '' && !reg[n].audioUrl && reg[n].particles === 'arcane'), '新特效为本地程序生成、无新外部资源');
        eq([reg['障壁术'].particles,reg['障壁术'].delay], ['nak_aegis',0.8], '旧障壁术注册保持不变');
      });
      names.forEach(n => { reg[n].delay = 0; });

      await group('攻击分流', async () => {
        const h = entity('h_arcane0'), e = entity('e_arcane');
        const cases = [
          [e,'[单体]',{damageType:'远程'},'arrow'],[e,'[单体]',{damageType:'法术'},'enemy_spell'],
          [e,'[单体]',{},'slash'],[h,'[单体]',{damageType:'法术'},'slash'],
          [h,'[单体]',{damageType:'远程'},'arrow'],
          [e,'[穿透(火焰)]',{damageType:'法术'},'fire'],[e,'[单体(枪击)]',{damageType:'法术'},'gunshot'],
          [e,'[散射(霰弹)]',{damageType:'法术'},'shotgun'],[e,'[单体(光)]',{},'light'],
          [e,'[单体(爆炸)]',{},'explosion_single'],[e,'[单体(雷)]',{},'thunder_single'],
          [e,'[单体(火焰)]',{fxTag:'火焰01'},null],[e,'[群攻]',{damageType:'法术'},null],
          [e,'[群攻(火焰)]',{damageType:'法术'},null],[e,'[单回]',{damageType:'法术'},null],
          [e,'[单避]',{damageType:'远程'},null],
          [entity('s_arcane',{isSummon:true,side:'enemy'}),'[单体]',{damageType:'远程'},'arrow'],
          [entity('s_arcane',{isSummon:true,side:'enemy'}),'[单体]',{damageType:'法术'},'enemy_spell'],
          [entity('s_arcane',{isSummon:true,side:'hero'}),'[单体]',{damageType:'远程'},'arrow'],
          [entity('s_arcane',{isSummon:true,side:'hero'}),'[单体]',{damageType:'法术'},'slash']
        ];
        cases.forEach(([caster,tag,s,expected],i) => eq(w.resolveSingleAttackFx(caster,tag,s),expected,'分流矩阵 ' + (i+1) + '：' + tag + ' / ' + (s.fxTag || s.damageType || '默认')));
        const d = installData([h],[e]);
        clearCalls();
        await w.applySingleTagEffect(d.e[0],d.h[0],'[单体]',50,100,1,null,attack('远程'));
        eq(calls.identity.map(c => [c.scope,c.subtype]),[['single','箭矢']],'远程无括号双方统一走箭矢身份演出');
        eq(calls.svg.length,0,'箭矢身份不再播放旧枪击SVG');
        eq(calls.sounds, [], '箭矢身份不再走旧gunshot/miss音');
        eq(calls.feedback.map(f => [f.targetId,f.outcome]),[['h_arcane0','hit']],'命中结果统一交由playHitFeedback');
        eq(calls.feedback[0].opts.audioWave, undefined, '视觉反馈不承担音频wave权限，单体结算事件独立路由');
        clearCalls();
        await w.applySingleTagEffect(d.e[0],d.h[0],'[单体]',50,100,1,null,attack());
        eq(calls.projectiles.map(c => c.type),['enemy_spell'],'敌方法术实际播放紫色弹道');
        eq(calls.svg.length,0,'法术不叠默认刀光');
        eq(calls.identity.length,0,'法术弹道不属于身份演出');
        eq(calls.feedback.map(f => f.outcome),['hit'],'法术命中仍记录统一反馈');
        clearCalls();
        await w.applySingleTagEffect(d.h[0],d.e[0],'[穿透(火焰)]',50,100,1,null,attack('法术','穿透(火焰)'));
        eq(calls.projectiles.map(c => c.type),['fire'],'我方单点火焰实际进入新版弹道');
        eq(calls.feedback.map(f => f.outcome),['hit'],'火焰弹道命中记录统一反馈');
        check(!d.e[0].buffs.some(b => b.type === 'burn'),'火焰视觉不自动附加燃烧');
        clearCalls();
        await w.applySingleTagEffect(d.e[0],d.h[0],'[单体(枪击)]',50,100,1,null,attack('法术','单体(枪击)'));
        eq(calls.identity.map(c => c.subtype),['枪击'],'显式枪击改身份演出');
        eq(calls.flinch.length,0,'枪击受击不再调用旧flinch函数');
        eq(calls.svg.length,0,'身份枪击不叠旧gunshot SVG');
        eq(calls.feedback.map(f => f.outcome),['hit'],'枪击命中由统一反馈承接');
      });

      await group('增益与主演出去重', async () => {
        const d = installData([entity('h_arcane0',{skills:[skill(0),skill(1),skill(2),skill(4)]}),entity('h_arcane1',{hp:280,buffs:[{type:'atk',value:-5,duration:3}]}),entity('h_arcane2',{hp:320})],[entity('e_arcane')]);
        clearCalls();
        const lf = await w.executeSkillAction(d.h[0],d.h[0],d.h[0].skills[0],1);
        eq(calls.skills.map(c => c.tag),['灵风术'],'灵风术双槽只启动一次专属演出');
        check(lf === calls.skills[0].handle,'execute 返回本次演出实例');
        eq(d.h[0].buffs.map(b => [b.type,b.value,b.duration]),[['eva',50,10],['spd',30,10]],'原增益数值与回合数不变');
        eq([d.h[0].mp,d.h[0].skills[0].usesRemaining],[90,0],'MP与限次仍按原逻辑消耗');
        check(calls.sounds.includes('defUp') && calls.sounds.includes('atkUp'),'灵风术原两种增益音效均保留');
        check(calls.floats.some(t => t.includes('避+50')) && calls.floats.some(t => t.includes('速+30')),'灵风术保留原分槽数字');
        await w.executeSkillAction(d.h[0],d.h[0],d.h[0].skills[1],1);
        eq(ev('[teamBarrier,barrierArmor,barrierSub]'),[200,40,'近战'],'屏障机制与护甲未被演出替换');
        await w.executeSkillAction(d.h[0],null,d.h[0].skills[2],1);
        eq(calls.skills.filter(c => c.tag === '伊西丝之拥').length,1,'群回与群驱散、多个目标合计只播一次金翼');
        eq([d.h[1].hp,d.h[2].hp],[380,420],'治疗按真实受益目标结算');
        eq(d.h[1].buffs,[],'真实驱散移除负面状态');
        eq(calls.dispel.length,1,'净化碎片只对应实际驱散成功的目标');
        await w.executeSkillAction(d.h[0],d.h[0],d.h[0].skills[3],1,true);
        eq(d.h[0].shield,180,'巫师护盾未暴击时仍为180');
        eq(calls.svg.length,0,'专属标签只替换默认增益光效');
        check(calls.sounds.includes('shieldUp') && calls.sounds.includes('hpHeal'),'原护盾与治疗音效仍播放');
        check(calls.floats.includes('护盾+180') && calls.floats.includes('+100HP'),'原护盾与治疗浮字仍播放');
        clearCalls();
        const plain = w.parseSkill('【普通护盾】[单盾;power:12]');
        await w.executeSkillAction(d.h[0],d.h[0],plain,1);
        eq(calls.svg.map(c => c.type),['shield'],'未配置新特效的技能保留默认盾牌');
      });

      await group('刀光与命中反馈出口', async () => {
        const cases = [
          ['近战',1000,[],['slash'],'dodge'],
          ['近战',1,['atk2'],['slash'],'hit'],
          ['远程',1000,[],[],'dodge'],
          ['远程',1,[],[],'hit']
        ];
        for (const [type, speed, expectedSounds, expectedSvg, expectedOutcome] of cases) {
          const d = installData([entity('h_arcane0',{spd:speed})],[entity('e_arcane')]);
          const label = type + '／' + (speed > 1 ? '闪避' : '命中');
          clearCalls();
          await w.applySingleTagEffect(d.e[0],d.h[0],'[单体]',50,100,1,null,attack(type));
          eq(calls.sounds, expectedSounds, '攻击旧音效：' + label);
          eq(calls.svg.map(c => c.type), expectedSvg, '攻击旧视觉：' + label);
          eq(calls.feedback.map(f => f.outcome), [expectedOutcome], '命中结果统一由playHitFeedback承接：' + label);
          if (type === '远程') eq(calls.identity.map(c => c.subtype), ['箭矢'], '远程无括号统一箭矢身份：' + label);
          else eq(calls.identity.length, 0, '近战保留旧slash，不走身份演出：' + label);
        }
      });

      await group('真实反应', async () => {
        let d = installData([entity('h_arcane0',{skills:[skill(3)]})],[entity('e_arcane')]);
        clearCalls();
        await w.applySingleTagEffect(d.e[0],d.h[0],'[单体]',50,100,1,null,attack('近战'));
        eq(calls.dodge,[true],'真实反应判定成功后才调用错身回调');
        eq(d.h[0].hp,500,'折影步成功保持HP不变');
        eq(calls.svg.map(c => c.type),['slash'],'近战闪避保留挥空刀光');
        check(!calls.sounds.includes('atk2'),'折影步成功不叠加刀光受击音');
        eq(calls.feedback.map(f => [f.targetId,f.outcome]),[['h_arcane0','dodge']],'闪避文字与音改由playHitFeedback统一');
        check(!calls.floats.includes('闪避') && !calls.sounds.includes('miss'),'不再走旧createFloatingText闪避字与miss音');
        check(calls.feedback[0] && calls.feedback[0].suppressDodgeFx === true,'反应闪避不重复烟尘演出');
        check(calls.skills[0].reaction === true,'反应技沿共用专属入口启动');
        d = installData([entity('h_arcane0',{skills:[skill(3)]})],[entity('e_arcane')]);
        w.Math.random = () => 0;
        clearCalls();
        await w.applySingleTagEffect(d.e[0],d.h[0],'[单体]',50,100,1,null,attack('近战'));
        eq(calls.dodge,[false],'二次判定失败不伪造成功闪避');
        check(d.h[0].hp < 500 && !calls.feedback.some(f => f.outcome === 'dodge'),'失败仍按原规则受伤且不产生闪避反馈');
        eq(calls.feedback.map(f => f.outcome),['hit'],'失败命中记录统一反馈');
        w.Math.random = () => 0.5;
        for (const [tag,expectedHit,expectedShield] of [['单体',1,130],['穿透',0,180]]) {
          d = installData([entity('h_arcane0',{skills:[skill(4)]})],[entity('e_arcane')]);
          clearCalls();
          await w.applySingleTagEffect(d.e[0],d.h[0],'['+tag+']',50,100,1,null,attack('法术',tag));
          eq(calls.projectiles.map(c => c.type),['enemy_spell'],'真实护盾反应后仅一发法术来袭：'+tag);
          eq(calls.hit.length,expectedHit,'盾面命中回调只在实际扣盾时触发：'+tag);
          eq(d.h[0].shield,expectedShield,'个人盾扣除遵循原穿透规则：'+tag);
        }
      });

      await group('共享屏障与溢出', async () => {
        const d = installData([entity('h_arcane0')],[entity('e_arcane')]);
        const b = {id:'barrier_arcane',isAlive:true,isBarrierTarget:true,proxyHero:d.h[0]};
        for (const [barrier,armor,hp] of [[200,0,500],[20,0,470],[200,80,470]]) {
          ev('teamBarrier='+barrier+';teamBarrierMax='+barrier+';barrierArmor='+armor+';barrierSub=null;');
          clearCalls();
          await w.applySingleTagEffect(d.e[0],b,'[单体]',50,100,1,null,attack());
          eq(calls.projectiles.length,1,'屏障来袭只一发：耐久'+barrier+'／护甲'+armor);
          eq(d.h[0].hp,hp,'屏障全挡／破盾溢出／护甲全挡结算保持原样');
        }
        ev('teamBarrier=0;teamBarrierMax=0;barrierArmor=0;');
        clearCalls();
        await w.applySingleTagEffect(d.e[0],d.h[0],'[单体]',50,100,1,null,attack(),50,true);
        eq(calls.projectiles.length,0,'显式标记已播的溢出不重复弹道');
      });

      await group('真实绘制与清理', async () => {
        restoreTimers();
        const d = installData([entity('h_arcane0'),entity('h_arcane1'),entity('h_arcane2')],[entity('e_arcane')]);
        const styleBefore = hDom.style.cssText;
        for (const name of names) {
          const handle = realSkill(name,d.h[0],name === '伊西丝之拥' ? d.h : [d.h[0]],true);
          check(!!handle && typeof handle.doneAt === 'number' && typeof handle.cancel === 'function','真实绘制返回可清理实例：'+name);
          check(w.document.querySelectorAll('[data-arcane-fx]').length > 0,'真实绘制挂载演出层：'+name);
          if (handle.dodge) handle.dodge(true);
          if (handle.hit) handle.hit('enemy_spell');
          w.clearArcaneFx();
          eq(w.document.querySelectorAll('[data-arcane-fx]').length,0,'同步清理本批临时层：'+name);
          eq(hDom.style.cssText,styleBefore,'清理恢复角色原样式：'+name);
        }
        eq(realSkill('障壁术',d.h[0],[d.h[0]],false),null,'新绘制模块不接管旧障壁术');
        let expireShield, expireId;
        w.setTimeout = (fn, ms, ...args) => {
          const id = nativeSetTimeout.call(w,fn,ms,...args);
          if (ms === 2700) { expireShield = fn; expireId = id; }
          return id;
        };
        try { realSkill('巫师护盾',d.h[0],[d.h[0]],true); }
        finally { w.setTimeout = nativeSetTimeout; }
        const shieldLayer = w.document.querySelector('[data-arcane-part="shield"]').closest('[data-arcane-fx="layer"]');
        eq(w.getComputedStyle(shieldLayer).opacity,'1','护盾外层退场前完整可见');
        nativeClearTimeout.call(w,expireId);
        expireShield();
        const fadeStyle = w.getComputedStyle(shieldLayer);
        check(shieldLayer.isConnected && shieldLayer.style.opacity === '0','护盾先渐隐，退场开始时不直接删除');
        eq([fadeStyle.transitionProperty,fadeStyle.transitionDuration],['opacity','0.6s'],'护盾在独立外层执行600ms渐隐');
        const fade = shieldLayer.getAnimations().find(a => a.transitionProperty === 'opacity');
        check(!!fade,'护盾渐隐过渡真实启动，不受入场动画终态覆盖');
        if (fade) {
          fade.pause(); fade.currentTime = 300;
          const midOpacity = Number(w.getComputedStyle(shieldLayer).opacity);
          check(midOpacity > 0 && midOpacity < 1,'护盾渐隐中段透明度连续下降');
        }
        w.clearArcaneFx();
        for (const [type,ms] of [['fire',580],['enemy_spell',480]]) {
          const t = Date.now();
          const p = realProjectile(type,eDom,hDom,false);
          check(!!p && typeof p.then === 'function','真实弹道返回Promise：'+type);
          await p;
          check(Date.now()-t >= ms-30,'真实弹道按命中拍点完成：'+type);
          w.clearArcaneFx();
          eq(w.document.querySelectorAll('[data-arcane-fx]').length,0,'弹道清理无残留：'+type);
        }
        const natural = names.map(name => realSkill(name,d.h[0],name === '伊西丝之拥' ? d.h : [d.h[0]],false));
        natural[names.indexOf('巫师护盾')].hit('gunshot');
        await wait(5200);
        eq(w.document.querySelectorAll('[data-arcane-fx]').length,0,'五种演出自然收尾无残留，不依赖强制清理');
        check(!w.document.getElementById('battle-scene').className.includes('arcane-shake'),'蓄势震动在释放后停止');
        const p = realProjectile('enemy_spell',eDom,hDom,true);
        w.clearArcaneFx();
        await p;
        await wait(650);
        eq(w.document.querySelectorAll('[data-arcane-fx]').length,0,'中途清理settle待完成弹道且无延迟复活');
        w.clearArcaneFx();
      });
    } finally {
      restoreTimers();
      w.clearArcaneFx();
      names.forEach((name,i) => { reg[name].delay = delays[i]; });
      for (const [name,fn] of functions) w[name] = fn;
      w.Math.random = saved.random;
      w.__arcaneRestore = saved;
      ev(`(() => { const s=window.__arcaneRestore;
        heroesData=s.heroesData;enemiesData=s.enemiesData;initialHeroesCache=s.initialHeroesCache;initialEnemiesCache=s.initialEnemiesCache;
        battleHistory=s.battleHistory;_historyRawCache=s._historyRawCache;teamBarrier=s.teamBarrier;teamBarrierMax=s.teamBarrierMax;
        teamBarrierName=s.teamBarrierName;barrierArmor=s.barrierArmor;barrierSub=s.barrierSub;barrierStandIn=s.barrierStandIn;
        barrierAoEActive=s.barrierAoEActive;barrierAoELeak=s.barrierAoELeak;combatToken=s.combatToken;_pipelineFrozen=s.frozen;_barrierShatterAt=s.shatter;
        for(const k of Object.keys(state)) delete state[k]; Object.assign(state,s.state);
        for(const k of Object.keys(llmState)) delete llmState[k]; Object.assign(llmState,s.llm);
        nonLethalSettings.enabled=s.nonLethal;_recentSpeedChanges.clear();s.speeds.forEach((v,k)=>_recentSpeedChanges.set(k,v));
        CombatEvents.emit=s.emit;CombatEvents.emitAsync=s.emitAsync;fxEngine.particles=s.particles;
        delete window.__arcaneRestore;
      })()`);
      root.remove();
    }
    eq(mock.genCount(),gen0,'秘术专项未调用外部LLM');
    return { pending:[] };
  };
})();
