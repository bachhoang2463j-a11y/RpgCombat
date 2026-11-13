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
    // v12.06 新增两项：注册/分派未落地时只登记待对齐，不误伤原五技能用例。
    const pending = [];
    const soft = (cond, name, reason) => {
      if (cond) { check(true, name); return; }
      pending.push(name + (reason ? ' — ' + reason : ''));
      check(false, name + '（待对齐：' + (reason || '接口/行为未落地') + '）');
    };
    const NEW_TAGS = ['飞沙化甲', '蝎眼钥匙'];
    const fsText = '【飞沙化甲】[单防;power:50][单瞄;power:30][再动;power:1][MP:10][法术][特效:飞沙化甲]';
    const xyText = '【蝎眼钥匙】[召唤:幻梦行军兽][单防;power:10][MP:10][法术][特效:蝎眼钥匙]';
    const xyPureText = '【蝎眼钥匙】[召唤:幻梦行军兽][无;power:0][MP:10][法术][特效:蝎眼钥匙]';
    const newDelays = NEW_TAGS.map(n => { try { return ev('WEBM_FX_REGISTRY[' + JSON.stringify(n) + '] && WEBM_FX_REGISTRY[' + JSON.stringify(n) + '].delay'); } catch (e) { return undefined; } });
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
    const installFakeTimers = () => {
      w.setTimeout = (fn, ms, ...args) => {
        const id = {};
        timerIds.add(id);
        Promise.resolve().then(() => { if (timerIds.delete(id)) fn(...args); });
        return id;
      };
      w.clearTimeout = id => { timerIds.delete(id); };
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

      await group('新技能注册与解析', async () => {
        let regs = null, tagged = false;
        try {
          regs = ev(`({ a:WEBM_FX_REGISTRY['飞沙化甲'], b:WEBM_FX_REGISTRY['蝎眼钥匙'], tags:${JSON.stringify(names.concat(NEW_TAGS))}.filter(n=>isArcaneSkillFx(n)) })`);
          tagged = ev(`isArcaneSkillFx('飞沙化甲') === true && isArcaneSkillFx('蝎眼钥匙') === true`);
        } catch (e) { regs = null; }
        soft(tagged, '飞沙化甲/蝎眼钥匙被 isArcaneSkillFx 精确识别', '新标签未注册');
        const ra = regs && regs.a, rb = regs && regs.b;
        soft(!!ra && ra.url === '' && ra.particles === 'arcane' && Number(ra.delay) === 0.28,
          '飞沙化甲注册表：本地程序生成/delay 0.28', ra ? '实际 ' + JSON.stringify(ra) : '缺注册表');
        soft(!!rb && rb.url === '' && rb.particles === 'arcane' && Number(rb.delay) === 1.15,
          '蝎眼钥匙注册表：本地程序生成/delay 1.15', rb ? '实际 ' + JSON.stringify(rb) : '缺注册表');
        soft(!!regs && ['灵风术', '纳克提特障壁术', '伊西丝之拥', '折影步', '巫师护盾'].every(n => regs.tags.includes(n)),
          '旧五项标签仍在数组中，未被新技能替换', '旧标签丢失');
        const protoFs = w.parseSkill('【飞沙化甲】[单防;power:50][单瞄:30][再动;power:1][MP:8][Turns:5][法术][他人][特效:飞沙化甲]');
        const protoItem = w.parseItem('【蝎眼钥匙】[召唤:幻梦行军兽][单防;power:10][MP:20][高阶][延迟:0][道具][次数:1][特效:蝎眼钥匙]');
        eq([protoFs.type,protoFs.power,protoFs.type2,protoFs.power2,protoFs.type3,protoFs.power3,protoFs.cost,protoFs.turns,protoFs.isOthers,protoFs.fxTag],
          ['[单防]',50,'[单瞄]',30,'[再动]',1,8,5,true,'飞沙化甲'],'定稿飞沙化甲真实原型：瞄冒号、MP8、五回合与他人解析');
        eq([protoItem.summonTarget,protoItem.type,protoItem.power,protoItem.cost,protoItem.isHighTier,protoItem.delay,protoItem.category,protoItem.maxUses,protoItem.fxTag],
          ['幻梦行军兽','[单防]',10,20,true,0,'道具',1,'蝎眼钥匙'],'定稿蝎眼钥匙真实道具原型：零延迟、次数1与召唤+单防解析');
        const s = w.itemToPseudoSkill(protoItem);
        eq([s.isItem,s.summonTarget,s.fxTag,s.delay,s.cost,s.itemRef], [true,'幻梦行军兽','蝎眼钥匙',0,20,protoItem],'蝎眼钥匙正式物品伪技能透传');
        const fs = w.parseSkill(fsText), xy = w.parseSkill(xyText), pure = w.parseSkill(xyPureText);
        soft([fs.fxTag, fs.type, fs.power, fs.type2, fs.power2, fs.type3, fs.power3, fs.cost].join('|') ===
          '飞沙化甲|[单防]|50|[单瞄]|30|[再动]|1|10', '飞沙化甲三槽（防50/瞄30/再动1）与MP解析',
          [fs.fxTag, fs.type, fs.power, fs.type2, fs.power2, fs.type3, fs.power3, fs.cost].join('|'));
        soft([xy.summonTarget, xy.fxTag, xy.type, xy.power].join('|') === '幻梦行军兽|蝎眼钥匙|[单防]|10',
          '蝎眼召唤+单防附签分别解析', [xy.summonTarget, xy.fxTag, xy.type, xy.power].join('|'));
        soft([pure.summonTarget, pure.type, pure.cost].join('|') === '幻梦行军兽|[无]|10',
          '蝎眼纯召唤（[无]）解析', [pure.summonTarget, pure.type, pure.cost].join('|'));
      });

      await group('新技能防瞄再动声画去重', async () => {
        const d = installData([entity('h_arcane0', { skills: [w.parseSkill(fsText)] })], [entity('e_arcane')]);
        ev('battleHistory=[];state.actionQueue=[{type:"hero",ref:heroesData[0]}];state.queueIndex=0;state.isGameStarted=false;');
        clearCalls();
        await w.executeSkillAction(d.h[0], d.h[0], d.h[0].skills[0], 1);
        soft(calls.skills.filter(c => c.tag === '飞沙化甲').length === 1, '飞沙化甲专属演出只起播一次（防/瞄/再动三槽合计）',
          '实际 ' + calls.skills.map(c => c.tag).join(','));
        soft(d.h[0].buffs.some(b => b.type === 'def' && b.value === 50) && d.h[0].buffs.some(b => b.type === 'hit' && b.value === 30),
          '防御+50、命中+30 数值原样落 buff', JSON.stringify(d.h[0].buffs));
        soft(d.h[0].mp === 90, 'MP 按原逻辑扣 10', 'MP=' + d.h[0].mp);
        soft(!calls.sounds.some(k => k === 'defUp' || k === 'hitUp' || k === 'atkUp'),
          '新技能 defUp/hitUp/atkUp 默认音全部抑制', calls.sounds.join(','));
        soft(calls.svg.length === 0, '新技能不再叠默认盾/增益 SVG', calls.svg.map(c => c.type).join(','));
        soft(calls.floats.some(t => t.includes('防+50')) && calls.floats.some(t => t.includes('准+30')) && calls.floats.some(t => t.includes('再动+1')),
          '防御/命中/再动浮字保留', calls.floats.join('|'));
        soft(ev('state.actionQueue.filter(q=>q.isExtraTurn).length') >= 1, '再动仍插入额外行动');
        soft((ev('battleHistory').filter(l => l.includes('发动了【飞沙化甲】')).length) === 1,
          '飞沙一次释放只写一条行动战报', '实际 ' + ev('battleHistory').filter(l => l.includes('飞沙化甲')).join(' / '));
        // 普通技能对照：未挂新特效时仍走原声画。
        const plainDef = w.parseSkill('【普通防】[单防;power:12]');
        clearCalls();
        await w.executeSkillAction(d.h[0], d.h[0], plainDef, 1);
        soft(calls.sounds.includes('defUp') && calls.svg.some(c => c.type === 'shield'), '普通[单防]仍播 defUp+盾牌 SVG',
          'sounds=' + calls.sounds.join(',') + ' svg=' + calls.svg.map(c => c.type).join(','));
        const plainAim = w.parseSkill('【普通瞄】[单瞄;power:12]');
        clearCalls();
        await w.executeSkillAction(d.h[0], d.h[0], plainAim, 1);
        soft(calls.sounds.includes('hitUp') && calls.svg.some(c => c.type === 'buff'), '普通[单瞄]仍播 hitUp+增益 SVG',
          'sounds=' + calls.sounds.join(',') + ' svg=' + calls.svg.map(c => c.type).join(','));
        const plainRe = w.parseSkill('【普通再动】[再动;power:1]');
        clearCalls();
        await w.executeSkillAction(d.h[0], d.h[0], plainRe, 1);
        soft(calls.sounds.includes('atkUp') && calls.svg.some(c => c.type === 'buff'), '普通[再动]仍播 atkUp+增益 SVG',
          'sounds=' + calls.sounds.join(',') + ' svg=' + calls.svg.map(c => c.type).join(','));
        // 旧五技能辅助音对照（灵风术 defUp+atkUp 保留）。
        const old = installData([entity('h_arcane0', { skills: [skill(0)] })], [entity('e_arcane')]);
        clearCalls();
        await w.executeSkillAction(old.h[0], old.h[0], old.h[0].skills[0], 1);
        soft(calls.sounds.includes('defUp') && calls.sounds.includes('atkUp'), '旧五灵风术辅助音未被新抑制规则波及',
          calls.sounds.join(','));
      });

      await group('蝎眼召唤契约', async () => {
        const xyFx = [], summonRec = [], wardSeen = [];
        let summonMode = { result: true, delay: 0 };
        let lastRealHandle = null;
        const xyStub = (tag, caster, targets, reaction) => {
          if (tag !== '蝎眼钥匙') return realSkill(tag, caster, targets, reaction);
          let release = null;
          const burstReady = new Promise(resolve => { release = resolve; });
          const rec = { caster, targets: (targets || []).slice(), wardCalls: [], handle: null };
          const handle = {
            doneAt: Date.now() + (summonMode.doneIn || 60),
            burstReady,
            cancel() { if (release) { release(false); release = null; } },
            setWardTargets(list) { rec.wardCalls.push((list || []).slice()); }
          };
          rec.handle = handle;
          xyFx.push(rec);
          if (summonMode.delay > 0) wait(summonMode.delay).then(() => { if (release) { release(true); release = null; } });
          else if (!summonMode.defer && release) { release(true); release = null; }
          return handle;
        };
        replace('playArcaneSkillFx', xyStub);
        replace('summonFromWorldbook', async (caster, text, opts = {}) => {
          const rec = { caster, text, opts, startedAt: Date.now(), before: null, completedAt: null, result: summonMode.result };
          summonRec.push(rec);
          if (opts && opts.beforeEnter && typeof opts.beforeEnter.then === 'function') rec.before = await opts.beforeEnter;
          rec.completedAt = Date.now();
          // beforeEnter=false（提前取消/换 token）时不创建实体，也不向调用方报成功。
          return rec.result && rec.before !== false;
        });
        const xy = w.parseSkill(xyText), pure = w.parseSkill(xyPureText);
        const setup = (skill) => {
          const d = installData([entity('h_arcane0', { skills: [skill] })], [entity('e_arcane')]);
          ev('battleHistory=[];state.actionQueue=[{type:"hero",ref:heroesData[0]}];state.queueIndex=0;state.isGameStarted=false;');
          return d;
        };

        // 1) 召唤 + 单防：同一 handle、实际防回流目标、费用战报与 MP。
        summonMode = { result: true, delay: 0 };
        let d = setup(xy); clearCalls(); xyFx.length = 0; summonRec.length = 0; wardSeen.length = 0;
        await w.executeSkillAction(d.h[0], d.h[0], d.h[0].skills[0], 1);
        soft(xyFx.length === 1 && summonRec.length === 1, '蝎眼召唤只起播一次演出并只调用一次召唤',
          'fx=' + xyFx.length + ' summon=' + summonRec.length);
        if (summonRec[0]) {
          soft(summonRec[0].text === '幻梦行军兽' && summonRec[0].opts && typeof summonRec[0].opts.beforeEnter?.then === 'function',
            'summonFromWorldbook 收到词条名与 beforeEnter Promise', JSON.stringify({ text: summonRec[0].text, opts: !!summonRec[0].opts }));
          soft(summonRec[0].opts.beforeEnter === (xyFx[0] && xyFx[0].handle.burstReady), 'beforeEnter 就是本 handle.burstReady');
          soft(summonRec[0].before === true, 'beforeEnter 解析为 true 后才继续入场', String(summonRec[0].before));
        }
        const ward = xyFx[0] && xyFx[0].wardCalls.filter(l => l.length);
        soft(!!ward && ward.length > 0 && ward.some(l => l.includes(d.h[0])), 'setWardTargets 收到实际[防]回流目标（不是伪造对象）',
          JSON.stringify(xyFx[0] && xyFx[0].wardCalls));
        soft(d.h[0].buffs.some(b => b.type === 'def' && b.value === 10) && d.h[0].mp === 90,
          '召唤后附签单防+10 与 MP-10 仍按原结算', 'buffs=' + JSON.stringify(d.h[0].buffs) + ' mp=' + d.h[0].mp);
        soft(ev('battleHistory').filter(l => l.includes('发动了【蝎眼钥匙】')).length === 1,
          '召唤+附签一次释放只写一条行动战报', ev('battleHistory').filter(l => l.includes('蝎眼钥匙')).join(' / '));

        // 2) 纯召唤：空 targets 不伪造防回流，起播等 doneAt 后交棒并复位 fx 标记。
        summonMode = { result: true, delay: 0 };
        d = setup(pure); clearCalls(); xyFx.length = 0; summonRec.length = 0;
        await w.executeSkillAction(d.h[0], d.h[0], d.h[0].skills[0], 1);
        soft(xyFx.length === 1 && summonRec.length === 1, '纯召唤只起播一次并召唤一次');
        soft(!xyFx[0] || xyFx[0].wardCalls.every(l => !l.length), '纯召唤空 targets 不伪造防回流',
          JSON.stringify(xyFx[0] && xyFx[0].wardCalls));
        soft(ev('battleHistory').filter(l => l.includes('发动了【蝎眼钥匙】')).length === 1, '纯召唤只写一条行动战报');
        soft(ev('heroesData[0].skills[0]._fxPlayed') === undefined && ev('heroesData[0].skills[0]._arcaneFx') === undefined,
          '纯召唤交棒后复位 _fxPlayed/_arcaneFx，供再次释放');

        // 2b) 纯召唤确实等到 doneAt 才交棒（真实时钟，避免假时钟瞬时击穿）。
        restoreTimers();
        summonMode = { result: true, delay: 0, doneIn: 300 };
        d = setup(pure); clearCalls(); xyFx.length = 0; summonRec.length = 0;
        const pureT0 = Date.now();
        await w.executeSkillAction(d.h[0], d.h[0], d.h[0].skills[0], 1);
        const pureElapsed = Date.now() - pureT0;
        soft(pureElapsed >= 260, '纯召唤在 doneAt 之后才交棒', '实测 ' + pureElapsed + 'ms');
        soft(ev('heroesData[0].skills[0]._fxPlayed') === undefined && ev('heroesData[0].skills[0]._arcaneFx') === undefined,
          '真实时钟下纯召唤交棒后仍复位 fx 标记');
        installFakeTimers();
        summonMode = { result: true, delay: 0 };

        // 3) 召唤失败：附签按原路继续，不中断。
        summonMode = { result: false, delay: 0 };
        d = setup(xy); clearCalls(); xyFx.length = 0; summonRec.length = 0;
        await w.executeSkillAction(d.h[0], d.h[0], d.h[0].skills[0], 1);
        soft(d.h[0].buffs.some(b => b.type === 'def' && b.value === 10), '召唤失败后附签[单防]仍按原路结算',
          JSON.stringify(d.h[0].buffs));

        // 4) 提前 cancel：burstReady=false，上层不伪造成功入场。
        summonMode = { result: true, defer: true, delay: 0 };
        d = setup(xy); clearCalls(); xyFx.length = 0; summonRec.length = 0;
        const p = w.executeSkillAction(d.h[0], d.h[0], d.h[0].skills[0], 1);
        await wait(0);
        if (xyFx[0]) xyFx[0].handle.cancel();
        await Promise.race([p, wait(1200)]);
        soft(!!summonRec[0] && summonRec[0].before === false, '提前 cancel 时 beforeEnter=false，不新建过期召唤',
          String(summonRec[0] && summonRec[0].before));
        w.clearArcaneFx();

        // 5) 重复释放：每次重新起播，不残留标记。
        summonMode = { result: true, delay: 0 };
        d = setup(xy); clearCalls(); xyFx.length = 0; summonRec.length = 0;
        await w.executeSkillAction(d.h[0], d.h[0], d.h[0].skills[0], 1);
        await w.executeSkillAction(d.h[0], d.h[0], d.h[0].skills[0], 1);
        soft(xyFx.length === 2 && summonRec.length === 2, '同一技能重复释放各起播/召唤一次', 'fx=' + xyFx.length + ' summon=' + summonRec.length);
        soft(ev('heroesData[0].skills[0]._fxPlayed') === undefined, '第二次释放后仍清除 _fxPlayed');
        soft(d.h[0].mp === 80, '两次释放各扣 10 MP', 'MP=' + d.h[0].mp);

        // 6) 静态：入场等待发生在资料读取后、实体入队前。
        const createSrc = String(w.createSummonEntity || '');
        const execSrc = String(w.executeSkillAction || '');
        soft(/beforeEnter/.test(createSrc), 'createSummonEntity 接入 beforeEnter 门槛', '未找到 beforeEnter');
        if (/beforeEnter/.test(createSrc)) {
          const gateAt = createSrc.indexOf('beforeEnter');
          const pushAt = createSrc.search(/(?:heroesData|enemiesData)\.push\s*\(/);
          const segment = pushAt > gateAt ? createSrc.slice(gateAt, pushAt) : '';
          soft(pushAt > gateAt && /combatToken/.test(segment), 'createSummonEntity 在 await beforeEnter 后复查 token 再入队',
            'pushAt=' + pushAt + ' gateAt=' + gateAt);
        }
        soft(/summonFromWorldbook\([^;]{0,400}beforeEnter/.test(execSrc), 'executeSkillAction 向 summonFromWorldbook 传 beforeEnter',
          '未在调用点找到 beforeEnter');

        // 7) 真实 1150ms 入场时序：不能叠 400/390/1.15 第二等待。
        restoreTimers();
        w.playArcaneSkillFx = (tag, caster, targets, reaction) => {
          const h = realSkill(tag, caster, targets, reaction);
          if (tag === '蝎眼钥匙' && h) {
            lastRealHandle = h;
            const orig = h.setWardTargets;
            h.setWardTargets = list => { wardSeen.push((list || []).slice()); return typeof orig === 'function' ? orig.call(h, list) : undefined; };
          }
          return h;
        };
        summonMode = { result: true, delay: 0 };
        d = setup(xy); clearCalls(); summonRec.length = 0; wardSeen.length = 0;
        const t0 = Date.now();
        const runP = w.executeSkillAction(d.h[0], d.h[0], d.h[0].skills[0], 1);
        for (let i = 0; i < 200 && !(summonRec[0] && summonRec[0].completedAt); i++) await wait(20);
        const elapsed = summonRec[0] && summonRec[0].completedAt ? summonRec[0].completedAt - t0 : -1;
        soft(elapsed >= 1100 && elapsed < 1530, '真实入场 ≥1150ms 且无额外 400/390ms 二次等待',
          '实测 ' + elapsed + 'ms');
        soft(!!wardSeen.filter(l => l.length).length, '真实 handle 的 setWardTargets 接到实际[防]目标', JSON.stringify(wardSeen));
        if (lastRealHandle) lastRealHandle.doneAt = Date.now();
        await Promise.race([runP, wait(3000)]);
        w.playArcaneSkillFx = xyStub;
        w.clearArcaneFx();
        installFakeTimers();
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
      await group('真实世界书召唤爆发门闩', async () => {
        restoreTimers();
        const wbSaved = ev('({worldbookCache,worldbookIndex,worldbookSettings,pendingSummons,summonSeq})');
        const entries = [{uid:991,name:'幻梦行军兽',keys:['幻梦行军兽'],content:'描述: 召唤回归测试\n<Combat_block>\n名字: 幻梦行军兽\n属性: "[HP:200][MP:20][Atk:10][Armor:3][Speed:10]"\n技能: []\n</Combat_block>'}];
        const summon = functions.get('summonFromWorldbook') || w.summonFromWorldbook;
        w.summonFromWorldbook = summon;
        w.playArcaneSkillFx = realSkill;
        ev('worldbookCache='+JSON.stringify(entries)+';worldbookIndex={};worldbookSettings={boundName:"回归图鉴",entries:{}};pendingSummons=[];');
        try {
          let d = installData([entity('h_arcane0'),entity('h_arcane1')],[entity('e_arcane')]);
          ev('state.isGameStarted=true;state.round=1;state.actionQueue=[{type:"hero",ref:heroesData[0]}];state.queueIndex=0;');
          const item = w.parseItem('【蝎眼钥匙】[召唤:幻梦行军兽][单防;power:10][MP:20][高阶][延迟:0][道具][次数:1][特效:蝎眼钥匙]');
          d.h[0].items=[item];
          const pseudo=w.itemToPseudoSkill(item), t0=Date.now();
          const p=w.executeSkillAction(d.h[0],d.h[0],pseudo,1);
          await wait(450);
          eq(ev('heroesData.filter(e=>e.isSummon).length'),0,'真实世界书已解析但裂隙未开时不入队');
          await wait(800);
          const summoned=ev('heroesData.find(e=>e.isSummon)');
          check(!!summoned,'1150ms爆发后真实世界书召唤实体入队');
          check(!!summoned && !!w.getEntitySpriteDom(summoned),'真实召唤卡增量挂载而非等待桩');
          check(ev('state.actionQueue.some(q=>q.ref.isSummon)'),'真实召唤物即时加入行动队列');
          eq([d.h[0].mp,item.usesRemaining,d.h[0].buffs.some(b=>b.type==='def'&&b.value===10)], [80,0,true],'定稿道具只扣MP20及一次次数，单防仍落施法者');
          check(!summoned || !summoned.buffs.some(b=>b.type==='def'),'新召唤物不被擅自加单防');
          await p;
          check(Date.now()-t0>=3300,'真实召唤+单防等待3350ms余韵后交棒');
          w.clearArcaneFx();
          d=installData([entity('h_arcane0')],[entity('e_arcane')]);
          ev('state.actionQueue=[{type:"hero",ref:heroesData[0]}];state.queueIndex=0;');
          const token=w.eval('combatToken');
          let release;const gate=new Promise(resolve=>{release=resolve;});
          const create=w.createSummonEntity(d.h[0],{name:'幻梦行军兽'},'hero',{beforeEnter:gate});
          ev('combatToken={};');release(true);
          await create;
          eq(ev('heroesData.filter(e=>e.isSummon).length'),0,'真实createSummonEntity门闩醒来后复查token，不入过期战局');
          w.__arcaneGateToken=token;ev('combatToken=window.__arcaneGateToken;delete window.__arcaneGateToken;');
          const cancelled=w.playArcaneSkillFx('蝎眼钥匙',d.h[0],[],false);
          const cancelledCreate=w.createSummonEntity(d.h[0],{name:'幻梦行军兽'},'hero',{beforeEnter:cancelled.burstReady});
          cancelled.cancel();await cancelledCreate;
          eq(ev('heroesData.filter(e=>e.isSummon).length'),0,'真实cancel解除burst门闩，尚未入场的召唤不生成');
        } finally {
          w.clearArcaneFx();
          w.__arcaneWb=wbSaved;
          ev('({worldbookCache,worldbookIndex,worldbookSettings,pendingSummons,summonSeq}=window.__arcaneWb);delete window.__arcaneWb;state.isGameStarted=false;');
          w.playArcaneSkillFx=realSkill;
          w.document.querySelectorAll('#heroes-summon-row, [id^="hero-wrap-s_"], [id^="hero-card-s_"]').forEach(node=>node.remove());
        }
      });
      await group('新技能真实绘制与自然清理', async () => {
        restoreTimers();
        const d = installData([entity('h_arcane0')], [entity('e_arcane')]);
        w.clearArcaneFx();
        const fsStart = Date.now();
        const fsHandle = realSkill('飞沙化甲', d.h[0], [d.h[0]], false);
        const fsDoneAt = fsHandle && fsHandle.doneAt;
        soft(!!fsHandle && typeof fsHandle.doneAt === 'number' && typeof fsHandle.cancel === 'function',
          '飞沙化甲真实绘制返回可清理实例');
        soft(!!fsHandle && Math.abs(fsHandle.doneAt - fsStart - 1320) < 40,
          '飞沙化甲 doneAt 精确锁定 1320ms', fsHandle ? String(fsHandle.doneAt - fsStart) : '无 handle');
        soft(w.document.querySelectorAll('[data-arcane-fx]').length > 0, '飞沙化甲真实挂载演出层');
        await wait(340);
        eq(fsHandle.doneAt, fsDoneAt, '飞沙280ms盾框挂载后不因回收定时延长 LIFE');
        w.clearArcaneFx();
        soft(w.document.querySelectorAll('[data-arcane-fx]').length === 0, '飞沙化甲同步清理无残留');
        const xyHandle = realSkill('蝎眼钥匙', d.h[0], [], false);
        soft(!!xyHandle && !!xyHandle.burstReady && typeof xyHandle.burstReady.then === 'function',
          '蝎眼真实绘制返回 burstReady Promise');
        soft(!!xyHandle && typeof xyHandle.setWardTargets === 'function', '蝎眼 handle 提供 setWardTargets');
        soft(!!xyHandle && Math.abs(xyHandle.doneAt - Date.now() - 3350) < 420,
          '蝎眼 doneAt ≈ 3350ms', xyHandle ? String(xyHandle.doneAt - Date.now()) : '无 handle');
        const t0 = Date.now();
        const burst = xyHandle ? await Promise.race([xyHandle.burstReady, wait(2600).then(() => '__timeout__')]) : '__nohandle__';
        soft(burst === true && Date.now() - t0 >= 1080, '蝎眼 burstReady 在 ≥1150ms 裂隙挂载后 true',
          'burst=' + burst + ' elapsed=' + (Date.now() - t0));
        soft(w.document.querySelector('[data-arcane-fx]') !== null, '蝎眼裂隙挂载后存在演出层');
        if (xyHandle) {
          try { xyHandle.setWardTargets([d.h[0]]); check(true, 'setWardTargets 接受实际防回流对象'); }
          catch (e) { check(false, 'setWardTargets 接受实际防回流对象', String(e)); }
        }
        const early = realSkill('蝎眼钥匙', d.h[0], [], false);
        const earlyP = early && early.burstReady;
        if (early) early.cancel();
        const earlyResult = earlyP ? await Promise.race([earlyP, wait(700).then(() => '__timeout__')]) : '__nohandle__';
        soft(earlyResult === false, '提前 cancel 时 burstReady=false 且不复活演出', String(earlyResult));
        w.clearArcaneFx();
        soft(w.document.querySelectorAll('[data-arcane-fx]').length === 0, '蝎眼 cancel 后清理无残留');
        realSkill('飞沙化甲', d.h[0], [d.h[0]], false);
        realSkill('蝎眼钥匙', d.h[0], [], false);
        await wait(3800);
        soft(w.document.querySelectorAll('[data-arcane-fx]').length === 0, '两新技能自然收尾无残留，不依赖强制清理');
        soft(!w.document.getElementById('battle-scene').className.includes('arcane-shake'), '新技能自然收尾后蓄势震动停止');
        w.clearArcaneFx();
      });
    } finally {
      restoreTimers();
      w.clearArcaneFx();
      names.forEach((name,i) => { reg[name].delay = delays[i]; });
      NEW_TAGS.forEach((name, i) => {
        try {
          const entry = ev('WEBM_FX_REGISTRY[' + JSON.stringify(name) + ']');
          if (entry && newDelays[i] !== undefined) entry.delay = newDelays[i];
        } catch (e) { /* 未运行时无注册表，忽略 */ }
      });
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
    return { pending };
  };
})();
