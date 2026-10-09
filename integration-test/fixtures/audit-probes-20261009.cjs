#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const ROOT = path.resolve(__dirname, '../..');

function functionSource(source, name) {
  const match = new RegExp('^(?:async )?function ' + name + '\\(', 'm').exec(source);
  if (!match) throw new Error('未找到真实函数 ' + name);
  const endLine = source.indexOf('\n', match.index);
  const firstLine = source.slice(match.index, endLine);
  if (/}\s*;?\s*$/.test(firstLine)) return firstLine;
  const close = /^}/m.exec(source.slice(endLine));
  if (!close) throw new Error('函数未闭合 ' + name);
  return source.slice(match.index, endLine + close.index + 1);
}
function constantSource(source, name) {
  const match = new RegExp('^(?:const|let|var) ' + name + ' = ', 'm').exec(source);
  if (!match) throw new Error('未找到真实常量 ' + name);
  const lineEnd = source.indexOf('\n', match.index);
  const line = source.slice(match.index, lineEnd);
  if (/;\s*(?:\/\/.*)?$/.test(line)) return line;
  const close = /^[}\]];/m.exec(source.slice(lineEnd));
  if (!close) throw new Error('常量未闭合 ' + name);
  return source.slice(match.index, lineEnd + close.index + 2);
}
function makeSandbox(source) {
  const element = { style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, remove() {} };
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} }, structuredClone, Map, Set,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
    document: { getElementById() { return element; }, querySelectorAll() { return []; }, querySelector() { return null; } },
    Math: Object.assign(Object.create(Math), { random: () => 0.5 }), Date, URL, URLSearchParams });
  vm.runInContext(`
    var window = globalThis;
    var heroesData=[], enemiesData=[], initialHeroesCache=[], initialEnemiesCache=[], battleHistory=[];
    var state={isGameStarted:true,round:1,currentRound:1,queueIndex:0,actionQueue:[],highTierNarrated:new Set(),enemiesSpokenThisRound:new Set()};
    var combatToken={}, _pipelineFrozen=false, _subdueVictory=false, _roundStartGlowPending=false;
    var teamBarrier=0, teamBarrierMax=0, barrierArmor=0, barrierSub=null, barrierStandIn=null, teamBarrierName='屏障';
    var pendingSummons=[], summonSeq=0, worldbookCache=[{name:'幻影',content:''}], worldbookIndex={}, worldbookSettings={boundName:'测试'};
    var DEFAULT_HERO_IMG='';
    var _slotTagNamesCache=null, _recentSpeedChanges=new Map(), itemBindingKnowledge=new Map();
    var defendSettings={kanpoFilterEnabled:false,persistAtk:false,persistDef:false,persistSpd:false};
    var nonLethalSettings={enabled:false};
    var _statusBarSnapshot=null, _shopCatalogCache=null, _shopIndexCache=null;
    var __vars={}, __roster=null, __end=0, __target=null, __events=[], __started=0, __delays=[];
    function addHistory(text){battleHistory.push(text)}
    function showLog(){} function createFloatingText(){} function playSound(){} function playSVGEffect(){}
    function updateHeroUI(){} function updateEnemyUI(){} function getEntitySpriteDom(){return null}
    function renderTurnQueue(){} function updateActiveHeroDisplay(){} function renderHeroMenu(){} function playHeroTurnVoice(){}
    function triggerHeroChargeReady(){} function resetHeroChargeEffect(){} function triggerAllyDownSpeak(){}
    function triggerEnemyAutoSpeak(){} function tryTriggerEnemyLowHpSpeak(){} function tryTriggerEnemyDeathSpeak(){}
    function tryTriggerEnemyRage(){} function tryTriggerEnemyLink(){} function triggerEnemySelfDestruct(){}
    function showBattleResult(){} function flushPendingSummons(){} function reorderRemainingQueue(){} function initUI(){}
    function initUIIncrementalSummon(){} function getEnemyTier(){return 'fodder'} function assignEnemyRows(){}
    function resolveWorldbookEnemy(){return worldbookCache[0]} function isWorldbookEntryEnabled(){return true}
    function parseWorldbookEntryEnemy(){return {}} function extractWorldbookDescription(){return ''}
    function parseEnemyItem(){return {name:'幻影',isAlive:true,hp:100,maxHp:100,mp:20,maxMp:20,skills:[],buffs:[],actCount:1}}
    async function loadWorldbookData(){} async function loadDynamicBestiary(){}
    async function sleep(){} async function endTurn(){__end++} async function triggerBurstIfNeeded(){return 1}
    async function executeSkillAction(caster,target){__target=target&&target.name}
    async function executeEnemyTurn(){} async function executeSummonTurn(){}
    function getVariables(){return structuredClone(__vars)} function readRoster(){return __roster}
    function insertOrAssignVariables(value){Object.assign(__vars,structuredClone(value))}
    function setVariables(value){Object.assign(__vars,structuredClone(value))}
    var __ls=new Map(); var localStorage={getItem:k=>__ls.has(k)?__ls.get(k):null,setItem:(k,v)=>__ls.set(k,String(v))};
    function hasEnoughBindings(){return true} function skillHasBarrierTag(){return false}
    function isSummonBlockedByLimit(){return false} function shopSuppressPersistedItem(){return false}
    function readOpeningSetupClasses(){return new Map()}
    var CLASS_PASSIVES={};
    var EVENTS={TURN_START:'turn_start',TURN_END:'turn_end',BUFF_EXPIRED:'buff_expired'};
    var CombatEvents={emit(event,ctx){__events.push(event)},async emitAsync(){}};
  `, ctx);
  return ctx;
}
const rows=[];
function test(ctx, version, id, expected, expression) {
  return Promise.resolve().then(() => vm.runInContext(expression, ctx)).then(actual => {
    const a=JSON.parse(JSON.stringify(actual));
    rows.push({version,id,expected,actual:a,status:JSON.stringify(a)===JSON.stringify(expected)?'符合':'已复现不符'});
  }).catch(e => { rows.push({version,id,status:'探针错误',error:e.stack}); });
}
async function audit(file) {
  const source=fs.readFileSync(path.join(ROOT,file),'utf8').replace(/\r\n/g,'\n');
  const ctx=makeSandbox(source);
  const run=s=>vm.runInContext(s,ctx);
  const load=(...names)=>names.forEach(n=>run(functionSource(source,n)));
  run(constantSource(source,'SKILL_TYPES'));
  run(constantSource(source,'SELF_DEBUFF_KEYS'));
  run(constantSource(source,'isSelfDebuffTag'));
  load('normalizeColonPowerTags','parseSkill','parseItem','isHeroSideEntity','isIgnoredSummonTarget','getEffectiveSpeed',
    'getEffectiveStats','calculateDamage','applyEnemyTypeResist','_rosterFieldEmpty','_gapFillSkill','normalizeRosterSkill',
    'syncSkillGroupFromChildren','rebuildItemBindingKnowledge','applyPersistedRoster','_serializeSkillForRoster','serializeHeroesForSave',
    'getTauntTarget','selectEnemySkillAndTarget','isHighYieldSkill');
  run(constantSource(source,'ROSTER_GAP_FILL'));
  run(`function unit(id,name,more){return Object.assign({id,name,isAlive:true,hp:100,maxHp:100,mp:20,maxMp:20,tp:0,maxTp:100,atk:20,def:0,spd:50,shield:0,buffs:[],skills:[],items:[],classType:null,actCount:1},more)}`);

  await test(ctx,file,'穿透应仍由普通护盾吸收',{hpDmg:0,shieldDmg:40,shield:60},`(()=>{var t=unit('e1','靶',{shield:100,def:30});var r=calculateDamage(40,t,true);return {...r,shield:t.shield}})()`);
  await test(ctx,file,'散射护甲三倍',{hpDmg:80,shieldDmg:0},`calculateDamage(200,unit('e1','靶',{def:40}),false,3)`);
  await test(ctx,file,'物品肃正护甲解析',{type:'[肃正:法术]',power:500,sub:'法术',armor:40},`(()=>{var x=parseItem('【护符】[道具][肃正:法术;power:500;Armor:40]');return {type:x.type,power:x.power,sub:x.barrierSub??null,armor:x.barrierArmor??null}})()`);
  await test(ctx,file,'物品驱散简写','[驱散]',`parseItem('【净符】[消耗品][驱散:2]').type`);
  await test(ctx,file,'裸群眩晕标签','[群眩晕]',`parseSkill('【震慑】[群眩晕]').type`);
  await test(ctx,file,'YAML显式零消耗',{cost:0,hit:100},`(()=>{var x=parseSkill('【免费】[单体;power:20][MP:0][Aim:100]');_gapFillSkill(x,{cost:10,hit:180});return {cost:x.cost,hit:x.hit}})()`);
  await test(ctx,file,'反应子类型补档',{reaction:true,target:'近战'},`(()=>{var x=parseSkill('【反应】[回避;power:20]');_gapFillSkill(x,{isReaction:true,reactionTarget:'近战'});return {reaction:x.isReaction,target:x.reactionTarget}})()`);
  await test(ctx,file,'更换槽类型不混入旧威力',{type:'[单防]',power:0,turns:null},`(()=>{var x=parseSkill('【变更】[单体;power:20][单防;power:0]');_gapFillSkill(x,{type2:'[自盲]',power2:40,slotTurns2:2});return {type:x.type2,power:x.power2,turns:x.slotTurns2}})()`);
  await test(ctx,file,'同名组子技能与顶层技能隔离',2,`(()=>{__roster={heroes:[{name:'甲',config:{},skills:[{name:'同名',cost:2},{name:'组',isGroup:true,children:[{name:'同名',cost:9}]}]}]};heroesData=[unit('h1','甲',{skills:[parseSkill('【同名】[单体;power:20]')]})];applyPersistedRoster();return heroesData[0].skills[0].cost})()`);

  load('itemToPseudoSkill');
  await test(ctx,file,'物品突进执行透传',true,`!!itemToPseudoSkill(parseItem('【投具】[道具][群攻;power:60][近战][突进]')).ignoreRow`);
  load('startRound');
  await test(ctx,file,'友方召唤物每回合冷却递减',1,`(()=>{heroesData=[unit('s1','友召',{isSummon:true,side:'hero',cooldowns:{大招:2}})];enemiesData=[unit('e1','敌')];nextTurn=()=>{};startRound();return heroesData[0].cooldowns.大招})()`);

  run(constantSource(source,'defaultPreset'));run(constantSource(source,'llmState'));run(constantSource(source,'LLM_VAR_KEY'));
  load('initLLMPresets','persistLLMSettings','loadLLMSettings');
  await test(ctx,file,'摘要开关刷新恢复',false,`(async()=>{initLLMPresets();llmState.digestBattle=false;llmState.presets[0].digestBattle=false;await persistLLMSettings();llmState.digestBattle=true;llmState.presets=[];await loadLLMSettings();return llmState.digestBattle})()`);

  load('nextTurn');
  await test(ctx,file,'无buff也派发回合开始事件',true,`(async()=>{heroesData=[unit('h1','英雄')];enemiesData=[unit('e1','再生怪',{hp:50,tags:['[再生]']})];state.actionQueue=[{type:'enemy',ref:enemiesData[0],isExtraTurn:false}];state.queueIndex=0;state.isGameStarted=true;_pipelineFrozen=false;__events=[];await nextTurn(combatToken);return __events.includes(EVENTS.TURN_START)})()`);

  // 职业被动只装载真实注册表；画面演出仍由无副作用桩承接。
  const passiveStart=source.indexOf('const CLASS_PASSIVES = {}');
  const passiveEnd=source.indexOf('window.CLASS_PASSIVES',passiveStart);
  assert(passiveStart>=0&&passiveEnd>passiveStart);
  run(source.slice(passiveStart,passiveEnd).replace('const CLASS_PASSIVES = {}','CLASS_PASSIVES = {}'));
  await test(ctx,file,'职业初始化应使用合并后的MP上限',50,`(()=>{__roster={heroes:[{name:'施法者',config:{classType:'施法者',maxMp:100},skills:[]}]};heroesData=[unit('h1','施法者',{mp:50,maxMp:50,shield:0})];applyPersistedRoster();return heroesData[0].shield})()`);
  await test(ctx,file,'取消职业应跨场保留',null,`(()=>{__roster={heroes:[{name:'甲',config:{classType:null},skills:[]}]};heroesData=[unit('h1','甲',{classType:'狂战士'})];applyPersistedRoster();return heroesData[0].classType})()`);

  await test(ctx,file,'钢体应免疫职业暗袭眩晕',false,`(()=>{var t=unit('e1','钢体',{tags:['[钢体]']});var c=unit('h1','隐匿者',{classType:'隐匿者',baseTauntBonus:-50});var rng=Math.random;Math.random=()=>0;try{CLASS_PASSIVES['隐匿者'].onAfterDamageDealt(c,t,null,'近战')}finally{Math.random=rng}return t.buffs.some(b=>b.type==='stun')})()`);
  await test(ctx,file,'耐毒应免疫职业淬毒',false,`(()=>{var t=unit('e1','耐毒',{immunePoison:true,tags:['[耐毒]']});CLASS_PASSIVES['灾厄使'].onAfterDamageDealt(unit('h1','毒师',{atk:20}),t,null);return t.buffs.some(b=>b.type==='poison')})()`);
  const handlersStart=source.indexOf('const TAG_HANDLERS = {}');
  const handlersEnd=source.indexOf('function getEffectiveSpeed(',handlersStart);
  run(source.slice(handlersStart,handlersEnd));
  await test(ctx,file,'自缓代价应能被驱散',0,`(()=>{var t=unit('h1','角色',{buffs:[{type:'spd',value:-20,duration:2}]});TAG_HANDLERS['驱散']({target:t,targetDom:null,actualPower:1});return t.buffs.length})()`);
  load('applyStatusBarRoster','runResetPipeline');
  run('function updateTeamBarrierUI(){};function cancelTargeting(){}');
  await test(ctx,file,'开局状态栏真值应进入重置基线',25,`(()=>{var h=unit('h1','甲');heroesData=[h];initialHeroesCache=structuredClone(heroesData);initialEnemiesCache=[];applyStatusBarRoster({heroes:[{name:'甲',hp:25,maxHp:100,mp:8,maxMp:20,items:[]}]});runResetPipeline();return heroesData[0].hp})()`);

  // 施放路由与召唤构建直接提取原函数；世界书只用固定本地词条。
  load('parseNameTagAndMultiplier');
  if(source.includes('function parseSummonList(')){
    ['SUMMON_SIDE_LIMIT','SUMMON_CAST_MAX','ENEMY_TOTAL_HARD_CAP'].forEach(n=>run(constantSource(source,n)));
    load('parseSummonList','countLimitedSummons','isSummonBlockedByLimit','createSummonEntity');
  }
  load('summonFromWorldbook','isSkillActionable');
  await test(ctx,file,'众召实体不占后续普通召唤名额',{flag:true,normalAdded:1},`(async()=>{state.isGameStarted=false;heroesData=[unit('h1','召唤师')];enemiesData=[];await summonFromWorldbook(heroesData[0],'幻影*4',{noLimit:true});var flag=heroesData.slice(1).every(x=>x.summonNoLimit);var before=heroesData.length;await summonFromWorldbook(heroesData[0],'幻影',{});return {flag,normalAdded:heroesData.length-before}})()`);
  await test(ctx,file,'敌方多召总数不超过12',12,`(async()=>{heroesData=[unit('h1','甲')];enemiesData=Array.from({length:11},(_,i)=>unit('e'+i,'敌'+i));await summonFromWorldbook(enemiesData[0],'幻影*4',{});return enemiesData.length})()`);
  await test(ctx,file,'名额满的召唤技能不可点击',false,`(()=>{heroesData=[unit('h1','甲'),...Array.from({length:4},(_,i)=>unit('s'+i,'召',{isSummon:true,side:'hero'}))];return isSkillActionable(heroesData[0],parseSkill('【召】[召唤:幻影]'))})()`);

  load('executeSummonTurn');
  await test(ctx,file,'友方召唤治疗应选择受伤友军','受伤队友',`(async()=>{var s=unit('s1','治疗召唤',{isSummon:true,side:'hero',hp:80,skills:[parseSkill('【治疗】[单回;power:20][他人]')]});heroesData=[unit('h1','受伤队友',{hp:20}),s];enemiesData=[unit('e1','受伤敌人',{hp:20})];state.isGameStarted=true;__target=null;await executeSummonTurn(s,combatToken);return __target})()`);

  load('triggerEnemySelfDestruct');
  run('var selfDestructCount=0,selfDestructChain=Promise.resolve();async function doEnemySelfDestruct(){}');
  await test(ctx,file,'重置后过期自爆任务不应产生负计数',0,`(async()=>{triggerEnemySelfDestruct({id:'e1',explode:{type:'群伤',power:20}});var old=selfDestructChain;combatToken={};selfDestructCount=0;selfDestructChain=Promise.resolve();await old;return selfDestructCount})()`);

  // 回合中显示层/等待由桩隔离；生产路由与所有资源、状态/被动逻辑保持原函数。
  load('executeSkillAction');
  run(`var barrierAoEActive=false,barrierAoELeak=null;
    function getHeroItemBindings(){return new Map()} function consumeBindingsForSkill(){return null}
    function notifyManaSpent(){} function hasAliveFront(){return false} function hasAliveBack(){return false}
    function canBypassRow(){return false} function logRowBypass(){} function playAOEEffect(){}
    async function applySingleTagEffect(){} var WEBM_FX_REGISTRY={}; function triggerAllyAutoSpeak(){}
    function triggerHighTierCombinedSpeak(){} function triggerAllyHealSpeak(){}
  `);
  await test(ctx,file,'未命中不消耗隐匿急袭',true,`(async()=>{var h=unit('h1','隐匿者',{classType:'隐匿者',buffs:[{type:'atk',value:50,duration:3,isConcealAtk:true}]});var t=unit('e1','敌');heroesData=[h];enemiesData=[t];var skill=parseSkill('【未命中】[单体;power:20]');await executeSkillAction(h,t,skill,1);return h.buffs.some(b=>b.isConcealAtk)})()`);
  await test(ctx,file,'散射命中会消耗隐匿急袭',false,`(async()=>{var h=unit('h1','隐匿者',{classType:'隐匿者',buffs:[{type:'atk',value:50,duration:3,isConcealAtk:true}]});var t=unit('e1','敌');heroesData=[h];enemiesData=[t];applySingleTagEffect=async(c,t,tag,p,hit,m,d,s)=>{s._bdg.targetHit[t.id]=true};await executeSkillAction(h,t,parseSkill('【霰弹】[散射;power:20]'),1);return h.buffs.some(b=>b.isConcealAtk)})()`);

  load('handleTargetClick','canBypassRow','classifySkill');
  run('function updateMenu(){};async function doReleaseCharge(){__released=true};var __released=false;');
  await test(ctx,file,'带突进的蓄力技能可点击后排',true,`(async()=>{const h=unit('h1','甲',{currentDelay:{skill:parseSkill('【突刺】[单体;power:30][近战][突进]')}});const t=unit('e1','后排',{row:'back'});state.isTargeting=true;state.isAnimating=false;state.pendingAction={type:'release_charge'};state.actionQueue=[{type:'hero',ref:h}];state.queueIndex=0;hasAliveFront=()=>true;__released=false;await handleTargetClick(t,'enemy');hasAliveFront=()=>false;return __released})()`);

  load('applyBarrierHit','applyBarrierResist');
  run('var __overflowPower=null;function triggerBarrierShatter(){};document.getElementById=()=>null;applySingleTagEffect=async(c,t,tag,p,hit,m)=>{__overflowPower=p*m};');
  await test(ctx,file,'屏障破碎应仅把溢出伤害传给角色',50,`(async()=>{teamBarrier=50;teamBarrierMax=50;barrierArmor=0;barrierSub=null;const h=unit('h1','甲');heroesData=[h];__overflowPower=null;await applyBarrierHit(unit('e1','敌'),{proxyHero:h},'[单体]',100,{hit:100,damageType:'近战'},1,3);return __overflowPower})()`);

  await test(ctx,file,'重置后的旧群攻不应结算到新阵容',false,`(async()=>{var h=unit('h1','甲'),oldTarget=unit('e1','旧敌'),fresh=unit('e1','新敌');heroesData=[h];enemiesData=[oldTarget];var resume,once=true,hitFresh=false;sleep=()=>{if(once){once=false;return new Promise(r=>resume=r)}return Promise.resolve()};applySingleTagEffect=async(c,t)=>{if(t===fresh)hitFresh=true};var action=executeSkillAction(h,oldTarget,parseSkill('【群攻】[群攻;power:20][远程]'),1);combatToken={};enemiesData=[fresh];resume();await action;sleep=async()=>{};return hitFresh})()`);

  // 结算文案也是运行逻辑输出，不通过网络生成。
  load('showBattleResult');
  run(`var __dom={};document.getElementById=id=>__dom[id]||(__dom[id]={style:{},classList:{add(){},remove(){}},value:''});
    function buildBattleDigest(){return ''}function exportCombatResultToStatus(){return {ok:false}}function buildInjuryLines(){return ''}function refreshResultView(){}
    var _historyRawCache='',_lastResultSummaryText='',_combatSyncState={};`);
  await test(ctx,file,'败北结算不应要求续写胜利',false,`(()=>{heroesData=[];enemiesData=[];battleHistory=[];_subdueVictory=false;showBattleResult('lose');return document.getElementById('result-prompt').value.includes('走向胜利')})()`);

  // 保存各大函数跨版差异，避免用一版替另一版背书。
  return {source,functions:['applySingleTagEffect','applyBarrierHit','executeSkillAction','runReactionIntercept','checkKanpoInterrupt','nextTurn','startRound'].map(name=>({name,source:functionSource(source,name)}))};
}
(async()=>{
  const a=await audit('index.html');const b=await audit('index-公开版.html');
  const equality=a.functions.map((x,i)=>({function:x.name,identical:x.source===b.functions[i].source}));
  const output={kind:'审查证据，不是修复验收；已复现不符为待处理问题',results:rows,functionComparison:equality};
  fs.writeFileSync(path.join(__dirname,'audit-probes-20261009.json'),JSON.stringify(output,null,2)+'\n');
  rows.forEach(r=>console.log(r.version+' | '+r.status+' | '+r.id+' | '+JSON.stringify(r.actual??r.error)));
  console.log('审查探针 '+rows.length+' 项，工具错误 '+rows.filter(r=>r.status==='探针错误').length+' 项。');
  if(rows.some(r=>r.status==='探针错误'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
