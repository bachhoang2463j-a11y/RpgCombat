#!/usr/bin/env node
'use strict';
/* ============================================================================
   AUDIT-2026-10-09 修复项正式验收（离线、无网络/无浏览器/无 LLM）
   来源：integration-test/fixtures/audit-probes-20261009.cjs 的真实函数提取与 mocks，
         复用其 functionSource/constantSource/makeSandbox 机制，按 stage 重组为正式验收。
   原则：从真实 HTML 提取真实函数执行，不复制业务实现；每个测试独立 sandbox，
         测试自备数据，避免状态污染；函数 mock 按引用保存/恢复，对象 mock 深合并（数组整体替换）。
   用法：node integration-test/fixtures/verify-audit-fixes.cjs [--stage=lifecycle,parsing,baseline,damage,summon,settings,all]
   退出码：任一断言不符 / 工具错误 / 待对齐 → 1；全绿 → 0。
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../..');
const VERSIONS = [
  { label: 'index.html', file: 'index.html' },
  { label: 'index-公开版.html', file: 'index-公开版.html' },
];
const ALL_STAGES = ['lifecycle', 'parsing', 'baseline', 'damage', 'summon', 'settings'];

/* ---------------- 源码提取（与原探针一致） ---------------- */
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

/* ---------------- 沙箱（每测试独立） ---------------- */
function makeSandbox() {
  const element = {
    style: {}, className: '', value: '', checked: false, innerHTML: '', offsetWidth: 0,
    classList: { add() {}, remove() {}, contains() { return false; } },
    remove() {}, appendChild() {}, setAttribute() {}, querySelector() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; },
  };
  const ctx = vm.createContext({
    console: { log() {}, warn() {}, error() {} }, structuredClone, Map, Set,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
    document: {
      getElementById() { return element; }, querySelectorAll() { return []; }, querySelector() { return null; },
      createElement() { return element; }, body: { appendChild() {}, children: [] },
    },
    Math: Object.assign(Object.create(Math), { random: () => 0.5 }), Date, URL, URLSearchParams,
    performance: { now: () => 0 },
  });
  vm.runInContext([
    'var window = globalThis;',
    'var heroesData=[], enemiesData=[], initialHeroesCache=[], initialEnemiesCache=[], battleHistory=[];',
    'var state={isGameStarted:true,round:1,currentRound:1,queueIndex:0,actionQueue:[],highTierNarrated:new Set(),enemiesSpokenThisRound:new Set(),usedExtraTurnSkillsThisRound:new Set(),isAnimating:false,isTargeting:false,pendingAction:null};',
    'var combatToken={}, _pipelineFrozen=false, _subdueVictory=false, _roundStartGlowPending=false;',
    'var teamBarrier=0, teamBarrierMax=0, barrierArmor=0, barrierSub=null, barrierStandIn=null, teamBarrierName="屏障";',
    'var barrierAoEActive=false, barrierAoELeak=null;',
    'var pendingSummons=[], summonSeq=0, worldbookCache=[{name:"幻影",content:""}], worldbookIndex={}, worldbookSettings={boundName:"测试"};',
    'var DEFAULT_HERO_IMG="";',
    'var _slotTagNamesCache=null, _recentSpeedChanges=new Map(), itemBindingKnowledge=new Map();',
    'var defendSettings={kanpoFilterEnabled:false,persistAtk:false,persistDef:false,persistSpd:false};',
    'var nonLethalSettings={enabled:false};',
    'var _statusBarSnapshot=null, _shopCatalogCache=null, _shopIndexCache=null;',
    'var __vars={}, __roster=null, __end=0, __target=null, __events=[], __started=0, __delays=[], __released=false;',
    'var selfDestructCount=0, selfDestructChain=Promise.resolve();',
    'var _barrierShatterAt=0;',
    'var _historyRawCache="", _lastResultSummaryText="", _combatSyncState={};',
    'var __dom={};',
    'function addHistory(text){battleHistory.push(text)}',
    'function showLog(){} function createFloatingText(){} function playSound(){} function playSVGEffect(){}',
    'function updateHeroUI(){} function updateEnemyUI(){} function getEntitySpriteDom(){return null}',
    'function renderTurnQueue(){} function updateActiveHeroDisplay(){} function renderHeroMenu(){} function playHeroTurnVoice(){}',
    'function triggerHeroChargeReady(){} function resetHeroChargeEffect(){} function triggerAllyDownSpeak(){}',
    'function triggerEnemyAutoSpeak(){} function tryTriggerEnemyLowHpSpeak(){} function tryTriggerEnemyDeathSpeak(){}',
    'function tryTriggerEnemyRage(){} function tryTriggerEnemyLink(){} function tryTriggerEnemyMolt(){} function triggerEnemySelfDestructStub(){}',
    'function showBattleResultStub(){} function flushPendingSummons(){} function reorderRemainingQueue(){} function initUI(){}',
    'function initUIIncrementalSummon(){} function getEnemyTier(){return "fodder"} function assignEnemyRows(){}',
    'function resolveWorldbookEnemy(){return worldbookCache[0]} function isWorldbookEntryEnabled(){return true}',
    'function parseWorldbookEntryEnemy(){return {}} function extractWorldbookDescription(){return ""}',
    'function parseEnemyItem(){return {name:"幻影",isAlive:true,hp:100,maxHp:100,mp:20,maxMp:20,skills:[],buffs:[],actCount:1}}',
    'async function loadWorldbookData(){} async function loadDynamicBestiary(){}',
    'async function sleep(){} async function endTurn(){__end++} async function triggerBurstIfNeeded(){return 1}',
    'async function executeSkillActionStub(caster,target){__target=target&&target.name} async function executeEnemyTurn(){} async function executeSummonTurnStub(){}',
    'function getVariables(){return structuredClone(__vars)} function readRoster(){return __roster}',
    'function insertOrAssignVariables(value){Object.assign(__vars,structuredClone(value))}',
    'function setVariables(value){Object.assign(__vars,structuredClone(value))}',
    'var __ls=new Map(); var localStorage={getItem:function(k){return __ls.has(k)?__ls.get(k):null},setItem:function(k,v){__ls.set(k,String(v))}};',
    'function hasEnoughBindings(){return true} function skillHasBarrierTag(){return false}',
    'function isSummonBlockedByLimitStub(){return false} function shopSuppressPersistedItem(){return false}',
    'function readOpeningSetupClasses(){return new Map()}',
    'function getHeroItemBindings(){return new Map()} function consumeBindingsForSkill(){return null}',
    'function notifyManaSpent(){} function hasAliveFront(){return false} function hasAliveBack(){return false}',
    'function logRowBypass(){} function playAOEEffect(){} var WEBM_FX_REGISTRY={};',
    'function triggerAllyAutoSpeak(){} function triggerHighTierCombinedSpeak(){} function triggerAllyHealSpeak(){}',
    'function playExecutionAnimation(){return Promise.resolve()} function stopStrafeBurst(){} function startStrafeBurst(){}',
    'function updateTeamBarrierUI(){} function cancelTargeting(){} function updateMenu(){}',
    'function syncShopCatalogHeroItems(){return {applied:0,removed:0}}',
    'function readStatusBarSnapshot(){return _statusBarSnapshot}',
    'function preloadBattleAssets(){} function preloadHeroVoices(){} function initChatInputArea(){}',
    'function resolveNonLethalLethal(enemy,dmg){return dmg} function tryReviveEnemy(){return false}',
    'function showEnemyInfo(){} function closeEditor(){} function refreshResultView(){}',
    'function buildBattleDigest(){return ""} function exportCombatResultToStatus(){return {ok:false}} function buildInjuryLines(){return ""} function isWounded(){return false}',
    'function triggerBarrierShatter(){} function triggerBarrierDebuffBlock(){} function checkKanpoInterrupt(){}',
    'var CLASS_PASSIVES={};',
    'var EVENTS={TURN_START:"turn_start",TURN_END:"turn_end",BUFF_EXPIRED:"buff_expired",ON_KILL:"on_kill",AFTER_DAMAGE:"after_damage",BEFORE_SKILL_RESOLVE:"before_skill_resolve"};',
    'var CombatEvents={emit:function(event,ctx){__events.push(event)},emitAsync:async function(){}};',
    'function unit(id,name,more){return Object.assign({id:id,name:name,isAlive:true,hp:100,maxHp:100,mp:20,maxMp:20,tp:0,maxTp:100,atk:20,def:0,spd:50,shield:0,buffs:[],skills:[],items:[],classType:null,actCount:1},more)}',
  ].join('\n'), ctx);
  return ctx;
}

function loadCore(ctx, source) {
  const run = (s) => vm.runInContext(s, ctx);
  // 容错加载：某函数/常量在某版本不存在时只跳过它，由各测试的 needs 判定“待对齐”，
  // 不因单点缺失中止整版加载（两版 summon 内部结构有意不同）。
  const load = (...names) => names.forEach((n) => { try { run(functionSource(source, n)); } catch (e) {} });
  ['SKILL_TYPES', 'SELF_DEBUFF_KEYS', 'ROSTER_GAP_FILL'].forEach((n) => { try { run(constantSource(source, n)); } catch (e) {} });
  try { run(functionSource(source, 'isSelfDebuffTag')); } catch (e) { try { run(constantSource(source, 'isSelfDebuffTag')); } catch (e2) {} }
  load('normalizeColonPowerTags', 'parseSkill', 'parseItem', 'isHeroSideEntity', 'isIgnoredSummonTarget',
    'getEffectiveSpeed', 'getEffectiveStats', 'calculateDamage', 'applyEnemyTypeResist', '_rosterFieldEmpty',
    '_gapFillSkill', 'normalizeRosterSkill', 'syncSkillGroupFromChildren', 'rebuildItemBindingKnowledge',
    'applyPersistedRoster', '_serializeSkillForRoster', 'serializeHeroesForSave', 'getTauntTarget',
    'selectEnemySkillAndTarget', 'isHighYieldSkill');
  ['SUMMON_SIDE_LIMIT', 'SUMMON_CAST_MAX', 'ENEMY_TOTAL_HARD_CAP'].forEach((n) => { try { run(constantSource(source, n)); } catch (e) {} });
  load('parseSummonList', 'parseNameTagAndMultiplier', 'countLimitedSummons', 'isSummonBlockedByLimit', 'createSummonEntity',
    'summonFromWorldbook', 'isSkillActionable', 'itemToPseudoSkill', 'applyBarrierHit', 'applyBarrierResist',
    'applySingleTagEffect', 'executeSkillAction', 'executeSummonTurn', 'runReactionIntercept', 'promptReaction', 'nextTurn',
    'startRound', 'handleTargetClick', 'canBypassRow', 'classifySkill', 'showBattleResult',
    'triggerEnemySelfDestruct', 'doEnemySelfDestruct', 'initLLMPresets', 'persistLLMSettings', 'loadLLMSettings',
    'startGame', 'applyStatusBarRoster', 'runResetPipeline', 'freezeInitialCaches', 'initHeroClassBaseline',
    'computeSegmentRawDamage', 'wouldSegmentClearHp', 'tryAutoSummonGuard', 'getSheshenTarget');
  ['defaultPreset', 'llmState', 'LLM_VAR_KEY'].forEach((n) => { try { run(constantSource(source, n)); } catch (e) {} });
  try {
    const s = source.indexOf('const CLASS_PASSIVES = {}');
    const e = source.indexOf('\nwindow.CLASS_PASSIVES = CLASS_PASSIVES;', s);
    if (s >= 0 && e > s) run(source.slice(s, e).replace('const CLASS_PASSIVES = {}', 'CLASS_PASSIVES = {}'));
  } catch (e) {}
}

/* ---------------- mock：函数按引用保存恢复；对象深合并（数组整体替换） ---------------- */
function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch.slice();
  if (patch && typeof patch === 'object') {
    const out = (base && typeof base === 'object' && !Array.isArray(base)) ? Object.assign({}, base) : {};
    Object.keys(patch).forEach((k) => {
      const pv = patch[k];
      if (Array.isArray(pv)) out[k] = pv.slice();
      else if (pv && typeof pv === 'object') out[k] = deepMerge(out[k], pv);
      else out[k] = pv;
    });
    return out;
  }
  return patch;
}
function getGlobal(ctx, name) {
  return vm.runInContext("typeof " + name + " !== 'undefined' ? " + name + ' : undefined', ctx);
}
function setGlobal(ctx, name, value) { ctx.__mockValue = value; vm.runInContext(name + ' = __mockValue', ctx); }
function saveAndMock(ctx, patch) {
  const saved = {};
  Object.keys(patch).forEach((k) => {
    saved[k] = getGlobal(ctx, k);
    const v = patch[k];
    let next;
    if (typeof v === 'function') next = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) next = deepMerge(saved[k], v);
    else next = v;
    setGlobal(ctx, k, next);
  });
  return () => { Object.keys(saved).forEach((k) => setGlobal(ctx, k, saved[k])); };
}

/* ---------------- 测试定义 ---------------- */
function buildTests(source) {
  const T = [];
  const add = (t) => T.push(t);

  /* ===== lifecycle ===== */
  add({
    stage: 'lifecycle', id: '无buff也派发回合开始事件', needs: ['nextTurn'],
    expected: true,
    expr: `(async()=>{heroesData=[unit('h1','英雄')];enemiesData=[unit('e1','再生怪',{hp:50,tags:['[再生]']})];state.actionQueue=[{type:'enemy',ref:enemiesData[0],isExtraTurn:false}];state.queueIndex=0;state.isGameStarted=true;_pipelineFrozen=false;__events=[];await nextTurn(combatToken);return __events.includes(EVENTS.TURN_START)})()`,
  });
  add({
    stage: 'lifecycle', id: '多动额外行动不再派发TURN_START且不扣buff', needs: ['nextTurn'],
    expected: { events: false, duration: 3 },
    expr: `(async()=>{var e=unit('e1','多动怪',{buffs:[{type:'atk',value:5,duration:3}]});heroesData=[unit('h1','英雄')];enemiesData=[e];state.actionQueue=[{type:'enemy',ref:e,isExtraTurn:true}];state.queueIndex=0;state.isGameStarted=true;_pipelineFrozen=false;__events=[];await nextTurn(combatToken);return {events:__events.includes(EVENTS.TURN_START),duration:e.buffs[0].duration}})()`,
  });
  add({
    stage: 'lifecycle', id: '首次行动派发TURN_START并扣buff', needs: ['nextTurn'],
    expected: { events: true, duration: 2 },
    expr: `(async()=>{var e=unit('e1','怪',{buffs:[{type:'atk',value:5,duration:3}]});heroesData=[unit('h1','英雄')];enemiesData=[e];state.actionQueue=[{type:'enemy',ref:e,isExtraTurn:false}];state.queueIndex=0;state.isGameStarted=true;_pipelineFrozen=false;__events=[];await nextTurn(combatToken);return {events:__events.includes(EVENTS.TURN_START),duration:e.buffs[0].duration}})()`,
  });
  add({
    stage: 'lifecycle', id: '重置后的旧群攻不应结算到新阵容', needs: ['executeSkillAction'],
    expected: false,
    setup: `sleep=function(){if(__once){__once=false;return new Promise(function(r){__resume=r})}return Promise.resolve()};__once=true;__resume=null;__hitFresh=false;applySingleTagEffect=async function(c,t){if(t===__fresh)__hitFresh=true};`,
    expr: `(async()=>{var h=unit('h1','甲'),oldTarget=unit('e1','旧敌');__fresh=unit('e1','新敌');heroesData=[h];enemiesData=[oldTarget];var action=executeSkillAction(h,oldTarget,parseSkill('【群攻】[群攻;power:20][远程]'),1);combatToken={};enemiesData=[__fresh];__resume();await action;return __hitFresh})()`,
  });
  add({
    stage: 'lifecycle', id: '等待期间换代的反应链应终止', needs: ['runReactionIntercept'],
    expected: true,
    setup: `promptReaction=async function(){combatToken={};return null};`,
    expr: `(async()=>{_pipelineFrozen=false;var t=unit('h1','甲',{skills:[parseSkill('【回避】[回避;power:20][反应]')]});var c=unit('e1','敌');var r=await runReactionIntercept(c,t,parseSkill('【攻击】[单体;power:20][近战]'),100,'近战',[],true,false,1);return r===undefined})()`,
  });
  add({
    stage: 'lifecycle', id: '重置后过期自爆任务不应产生负计数', needs: ['triggerEnemySelfDestruct', 'doEnemySelfDestruct'],
    expected: 0,
    setup: `var selfDestructCount=0,selfDestructChain=Promise.resolve();async function doEnemySelfDestruct(){};`,
    expr: `(async()=>{triggerEnemySelfDestruct({id:'e1',explode:{type:'群伤',power:20}});var old=selfDestructChain;combatToken={};selfDestructCount=0;selfDestructChain=Promise.resolve();await old;return selfDestructCount})()`,
  });

  /* ===== parsing ===== */
  add({
    stage: 'parsing', id: 'YAML显式零消耗/命中/暴击不被存档覆盖', needs: ['parseSkill', '_gapFillSkill'],
    expected: { cost: 0, hit: 100, crit: 0 },
    expr: `(()=>{var x=parseSkill('【免费】[单体;power:20][MP:0][Aim:100][暴击:0]');_gapFillSkill(x,{cost:10,hit:180,critRate:30});return {cost:x.cost,hit:x.hit,crit:x.critRate}})()`,
  });
  add({
    stage: 'parsing', id: '相同槽类型缺省回合可补档', needs: ['parseSkill', '_gapFillSkill'],
    expected: { t1: 3, t2: 2 },
    expr: `(()=>{var x=parseSkill('【战意】[单增;power:50][自盲;power:10]');_gapFillSkill(x,{type2:'[自盲]',power2:10,slotTurns:3,slotTurns2:2});return {t1:x.slotTurns,t2:x.slotTurns2}})()`,
  });
  add({
    stage: 'parsing', id: '更换槽类型不混入旧槽威力/回合', needs: ['parseSkill', '_gapFillSkill'],
    expected: { type: '[单防]', power: 0, turns: null },
    expr: `(()=>{var x=parseSkill('【变更】[单体;power:20][单防;power:0]');_gapFillSkill(x,{type2:'[自盲]',power2:40,slotTurns2:2});return {type:x.type2,power:x.power2,turns:x.slotTurns2}})()`,
  });
  add({
    stage: 'parsing', id: '不同组同名技能与顶层技能隔离', needs: ['parseSkill', 'applyPersistedRoster'],
    expected: 2,
    expr: `(()=>{__roster={heroes:[{name:'甲',config:{},skills:[{name:'同名',cost:2},{name:'组',isGroup:true,children:[{name:'同名',cost:9}]}]}]};heroesData=[unit('h1','甲',{skills:[parseSkill('【同名】[单体;power:20]')]})];applyPersistedRoster();return heroesData[0].skills[0].cost})()`,
  });
  add({
    stage: 'parsing', id: '反应类型随反应标记一起补档', needs: ['parseSkill', '_gapFillSkill'],
    expected: { reaction: true, target: '近战' },
    expr: `(()=>{var x=parseSkill('【闪避】[回避;power:20]');_gapFillSkill(x,{isReaction:true,reactionTarget:'近战'});return {reaction:x.isReaction,target:x.reactionTarget}})()`,
  });
  add({
    stage: 'parsing', id: 'YAML显式[反应]仍尊重全能(门槛不改)', needs: ['parseSkill', '_gapFillSkill'],
    expected: 'all',
    expr: `(()=>{var x=parseSkill('【应对】[回避;power:20][反应]');_gapFillSkill(x,{isReaction:true,reactionTarget:'近战'});return x.reactionTarget})()`,
  });
  add({
    stage: 'parsing', id: '职业显式清空(null)应跨场保留', needs: ['applyPersistedRoster'],
    expected: null,
    expr: `(()=>{__roster={heroes:[{name:'甲',config:{classType:null},skills:[]}]};heroesData=[unit('h1','甲',{classType:'狂战士'})];applyPersistedRoster();return heroesData[0].classType})()`,
  });
  add({
    stage: 'parsing', id: '裸标签群眩晕/单增/单盲/群冲/单回蓝', needs: ['parseSkill'],
    expected: ['[群眩晕]', '[单增]', '[单盲]', '[群冲]', '[单回蓝]'],
    expr: `(()=>{return [parseSkill('【震慑】[群眩晕]').type,parseSkill('【强化】[单增]').type,parseSkill('【蒙蔽】[单盲]').type,parseSkill('【冲锋】[群冲]').type,parseSkill('【回蓝】[单回蓝]').type]})()`,
  });
  add({
    stage: 'parsing', id: '物品肃正护甲与驱散简写', needs: ['parseItem'],
    expected: { type: '[肃正:法术]', power: 500, sub: '法术', armor: 40, disp: '[驱散]', group: '[群驱散]' },
    expr: `(()=>{var x=parseItem('【护符】[道具][肃正:法术;power:500;Armor:40]');var a=parseItem('【净符】[消耗品][驱散:2]');var b=parseItem('【群净】[消耗品][群驱散]');return {type:x.type,power:x.power,sub:x.barrierSub==null?null:x.barrierSub,armor:x.barrierArmor==null?null:x.barrierArmor,disp:a.type,group:b.type}})()`,
  });

  add({
    stage: 'parsing', id: '裸穿透散射及混合裸槽不丢失', needs: ['parseSkill', 'parseItem'],
    expected: ['[穿透]', '[群散射(霰弹)]', '[单防]', '[群盲]', '[单防]', '[群盲]'],
    expr: `(()=>{var a=parseSkill('【混合】[单体;power:20][单防][群盲]');var b=parseItem('【混合】[道具][单体;power:20][单防][群盲]');return [parseSkill('【穿】[穿透]').type,parseSkill('【散】[群散射(霰弹)]').type,a.type2,a.type3,b.type2,b.type3]})()`,
  });
  add({
    stage: 'parsing', id: '显式法术反应与零威力保留', needs: ['parseSkill', '_gapFillSkill'],
    expected: { reaction: '法术', power: 0, power2: 0 },
    expr: `(()=>{var x=parseSkill('【应对】[反应:法术][单体;power:0][单防;power:0]');_gapFillSkill(x,{isReaction:true,reactionTarget:'近战',power:99,type2:'[单防]',power2:80});return {reaction:x.reactionTarget,power:x.power,power2:x.power2}})()`,
  });
  add({
    stage: 'parsing', id: '显式单体20不被驱散或肃正挤掉', needs: ['parseSkill','parseItem'],
    expected: ['[单体]', '[驱散]', '[单体]', '[肃正:法术]'],
    expr: `(()=>{var a=parseSkill('【混合】[单体;power:20][驱散:2]');var b=parseItem('【护符】[道具][单体;power:20][肃正:法术]');return [a.type,a.type2,b.type,b.type2]})()`,
  });

  /* ===== baseline (R03) ===== */
  add({
    stage: 'baseline', id: 'startGame权威覆盖后freeze再reset', needs: ['startGame', 'applyStatusBarRoster', 'runResetPipeline'],
    expected: { frozen: 25, afterReset: 25 },
    setup: [
      'function cancelTargeting(){}',
      'document.getElementById=function(id){var el={style:{},classList:{add:function(){},remove:function(){},contains:function(){return false}},value:"",checked:false,innerHTML:"",remove:function(){},appendChild:function(){},setAttribute:function(){},getBoundingClientRect:function(){return {left:0,top:0,width:0,height:0}},offsetWidth:0};if(id==="start-statusbar-import")el.checked=true;return el};',
      'document.querySelectorAll=function(){return []};',
    ].join('\n'),
    expr: `(async()=>{_statusBarSnapshot={heroes:[{name:'甲',hp:25,maxHp:100,mp:8,maxMp:20,items:[]}]};heroesData=[unit('h1','甲')];initialHeroesCache=JSON.parse(JSON.stringify(heroesData));initialEnemiesCache=[];state.isGameStarted=false;startGame();var frozen=initialHeroesCache[0].hp;heroesData[0].hp=10;runResetPipeline();return {frozen:frozen,afterReset:heroesData[0].hp}})()`,
  });

  add({
    stage:'baseline', id:'开战重读一次且重置不重读外部', needs:['startGame','freezeInitialCaches'],
    expected:{reads:1,hp:25,shield:80,resetHp:25},
    setup:`var __reads=0;readStatusBarSnapshot=()=>{__reads++;return {heroes:[{name:'甲',hp:25,maxHp:100,mp:10,maxMp:160,items:[]}]}};document.getElementById=id=>({checked:id==='start-statusbar-import',style:{},classList:{add(){},remove(){}},remove(){}});`,
    expr:`(()=>{_statusBarSnapshot={heroes:[{name:'甲',hp:80,maxHp:100,mp:10,maxMp:50,items:[]}]};heroesData=[unit('h1','甲',{classType:'施法者',maxMp:50})];enemiesData=[];CLASS_PASSIVES['施法者'].onBattleInit(heroesData[0]);startGame();var hp=heroesData[0].hp,shield=heroesData[0].shield;heroesData[0].hp=1;runResetPipeline();return {reads:__reads,hp,shield,resetHp:heroesData[0].hp}})()`,
  });
  add({
    stage:'baseline',id:'反复职业初始化保留场地盾且清除旧职业',needs:['initHeroClassBaseline'],
    expected:{first:80,again:80,cleared:30,field:1,counter:0,stealth:false},
    expr:`(()=>{var h=unit('h1','甲',{classType:'施法者',maxMp:100,shield:30,buffs:[{type:'spd',value:10,fieldBuff:true,duration:3}]});initHeroClassBaseline(h);var first=h.shield;initHeroClassBaseline(h);var again=h.shield;h.classType='防守者';initHeroClassBaseline(h);h.classType='隐匿者';initHeroClassBaseline(h);h.classType=null;initHeroClassBaseline(h);return {first,again,cleared:h.shield,field:h.buffs.filter(b=>b.fieldBuff).length,counter:h.buffs.filter(b=>b.type==='counter').length,stealth:'stealthValue' in h}})()`,
  });

  /* ===== damage ===== */
  add({
    stage: 'damage', id: '穿透忽略护甲', needs: ['calculateDamage'],
    expected: { hpDmg: 40, shieldDmg: 0 },
    expr: `calculateDamage(40,unit('e1','靶',{def:30}),true)`,
  });
  add({
    stage: 'damage', id: '穿透忽略普通护盾', needs: ['calculateDamage'],
    expected: { hpDmg: 40, shieldDmg: 0, shield: 100 },
    expr: `(()=>{var t=unit('e1','靶',{shield:100});var r=calculateDamage(40,t,true);return {hpDmg:r.hpDmg,shieldDmg:r.shieldDmg,shield:t.shield}})()`,
  });
  add({
    stage: 'damage', id: '非穿透伤害仍被普通护盾吸收', needs: ['calculateDamage'],
    expected: { hpDmg: 0, shieldDmg: 40, shield: 60 },
    expr: `(()=>{var t=unit('e1','靶',{shield:100,def:0});var r=calculateDamage(40,t,false);return {hpDmg:r.hpDmg,shieldDmg:r.shieldDmg,shield:t.shield}})()`,
  });
  add({
    stage: 'damage', id: '散射护甲三倍', needs: ['calculateDamage'],
    expected: { hpDmg: 80, shieldDmg: 0 },
    expr: `calculateDamage(200,unit('e1','靶',{def:40}),false,3)`,
  });
  add({
    stage: 'damage', id: '屏障破碎仅把溢出伤害传给角色', needs: ['applyBarrierHit'],
    expected: 50,
    setup: `__overflowPower=null;applySingleTagEffect=async function(c,t,tag,p,hit,m,g,sk,fixed){__overflowPower=fixed};document.getElementById=function(){return null};`,
    expr: `(async()=>{teamBarrier=50;teamBarrierMax=50;barrierArmor=0;barrierSub=null;var h=unit('h1','甲');heroesData=[h];__overflowPower=null;await applyBarrierHit(unit('e1','敌'),{proxyHero:h},'[单体]',100,{hit:100,damageType:'近战'},1,3);return __overflowPower})()`,
  });
  add({
    stage: 'damage', id: '穿透不绕屏障(屏障仍吸收)', needs: ['applyBarrierHit'],
    expected: 0,
    setup: `applySingleTagEffect=async function(){};document.getElementById=function(){return null};`,
    expr: `(async()=>{teamBarrier=50;teamBarrierMax=50;barrierArmor=40;barrierSub=null;var h=unit('h1','甲');heroesData=[h];await applyBarrierHit(unit('e1','敌'),{proxyHero:h},'[穿透]',100,{hit:100,damageType:'近战'},1,3);return teamBarrier})()`,
  });
  add({
    stage: 'damage', id: '未命中不消耗隐匿急袭', needs: ['executeSkillAction', 'parseSkill'],
    expected: true,
    mocks: { applySingleTagEffect: async () => {} },
    expr: `(async()=>{var h=unit('h1','隐匿者',{classType:'隐匿者',buffs:[{type:'atk',value:50,duration:3,isConcealAtk:true}]});var t=unit('e1','敌');heroesData=[h];enemiesData=[t];await executeSkillAction(h,t,parseSkill('【未命中】[单体;power:20]'),1);return h.buffs.some(b=>b.isConcealAtk)})()`,
  });
  add({
    stage: 'damage', id: '散射命中会消耗隐匿急袭', needs: ['executeSkillAction', 'parseSkill'],
    expected: false,
    mocks: { applySingleTagEffect: async (c, t, tag, p, hit, m, d, s) => { if (s && s._bdg) s._bdg.targetHit[t.id] = true; } },
    expr: `(async()=>{var h=unit('h1','隐匿者',{classType:'隐匿者',buffs:[{type:'atk',value:50,duration:3,isConcealAtk:true}]});var t=unit('e1','敌');heroesData=[h];enemiesData=[t];await executeSkillAction(h,t,parseSkill('【霰弹】[散射;power:20]'),1);return h.buffs.some(b=>b.isConcealAtk)})()`,
  });


  const guardSetup = `
    document.getElementById=()=>null;
    runReactionIntercept=async()=>({dodged:false,guardian:null,usedSheshen:false});
    var __rolls=0;Math.random=()=>{__rolls++;return 0.25};
    var __owner=unit('h1','主人',{hp:100,maxHp:1000});
    var __guard=unit('s1','守护',{isSummon:true,side:'hero',summonOwnerId:'h1',hp:500,maxHp:500,skills:[{name:'守护',_ownerOnly:true,sheshenTarget:'all',cost:2,type:'[无]'}]});
    var __caster=unit('e1','敌人');heroesData=[__owner,__guard];enemiesData=[__caster];
    var __skill=parseSkill('【攻击】[单体;power:100][必中]');
  `;
  add({stage:'damage',id:'守护按实际90点而非120上限判定且只掷一次',needs:['applySingleTagEffect'],setup:guardSetup,
    expected:{owner:10,guard:500,mp:20,rolls:1},
    expr:`(async()=>{await applySingleTagEffect(__caster,__owner,'[单体]',100,100,1,null,__skill);return {owner:__owner.hp,guard:__guard.hp,mp:__guard.mp,rolls:__rolls}})()`});
  add({stage:'damage',id:'实际致死先守护不消耗主人保命',needs:['applySingleTagEffect'],setup:guardSetup,
    expected:{owner:80,guard:410,mp:18,fatal:false,rolls:1},
    expr:`(async()=>{__owner.hp=80;__owner.classType='防守者';await applySingleTagEffect(__caster,__owner,'[单体]',100,100,1,null,__skill);return {owner:__owner.hp,guard:__guard.hp,mp:__guard.mp,fatal:!!__owner.hasTriggeredGrit,rolls:__rolls}})()`});
  add({stage:'damage',id:'守护逐段判断第一段不致死第二段才挡',needs:['applySingleTagEffect'],setup:guardSetup,
    expected:{owner:10,guard:410,mp:18,rolls:2},
    expr:`(async()=>{await applySingleTagEffect(__caster,__owner,'[单体]',100,100,1,null,__skill);await applySingleTagEffect(__caster,__owner,'[单体]',100,100,1,null,__skill);return {owner:__owner.hp,guard:__guard.hp,mp:__guard.mp,rolls:__rolls}})()`});
  add({stage:'damage',id:'普通护盾足够时不守护且只实际扣盾一次',needs:['applySingleTagEffect'],setup:guardSetup,
    expected:{owner:20,guard:500,shield:10,mp:20},
    expr:`(async()=>{__owner.hp=20;__owner.shield=100;await applySingleTagEffect(__caster,__owner,'[单体]',100,100,1,null,__skill);return {owner:__owner.hp,guard:__guard.hp,shield:__owner.shield,mp:__guard.mp}})()`});
  add({stage:'damage',id:'屏障溢出守护不重新掷伤害骰或放大溢出',needs:['applySingleTagEffect'],setup:guardSetup,
    expected:{owner:80,guard:420,rolls:1,barrier:0},
    expr:`(async()=>{__owner.hp=80;teamBarrier=100;teamBarrierMax=100;await applyBarrierHit(__caster,{isBarrierTarget:true,proxyHero:__owner},'[单体]',100,__skill,2,null);return {owner:__owner.hp,guard:__guard.hp,rolls:__rolls,barrier:teamBarrier}})()`});
  add({stage:'damage',id:'守护预估不写战报不扣盾',needs:['wouldSegmentClearHp'],setup:guardSetup,
    expected:{lethal:false,shield:30,history:0},
    expr:`(()=>{__owner.resistMap={'近战':0.5};__owner.shield=30;var result=wouldSegmentClearHp(__caster,__owner,'hero',100,'[单体]',__skill,'近战');return {lethal:result,shield:__owner.shield,history:battleHistory.length}})()`});
  add({stage:'damage',id:'纯减益不提供舍身但保留普通反应入口',needs:['applySingleTagEffect'],setup:guardSetup,
    expected:0,
    expr:`(async()=>{var offered=-1;runReactionIntercept=async(c,t,s,h,d,list)=>{offered=list.length;return {dodged:true}};__guard.isSummon=false;__guard.id='h2';delete __guard.skills[0]._ownerOnly;await applySingleTagEffect(__caster,__owner,'[单盲]',30,100,1,null,__skill);return offered})()`});

  /* ===== summon ===== */
  add({
    stage: 'summon', id: '众召实体不占后续普通召唤名额', needs: ['summonFromWorldbook'],
    expected: { flag: true, normalAdded: 1 },
    expr: `(async()=>{state.isGameStarted=false;heroesData=[unit('h1','召唤师')];enemiesData=[];await summonFromWorldbook(heroesData[0],'幻影*4',{noLimit:true});var flag=heroesData.slice(1).every(x=>x.summonNoLimit);var before=heroesData.length;await summonFromWorldbook(heroesData[0],'幻影',{});return {flag:flag,normalAdded:heroesData.length-before}})()`,
  });
  add({
    stage: 'summon', id: '敌方多召总数不超过12', needs: ['summonFromWorldbook'],
    expected: 12,
    expr: `(async()=>{heroesData=[unit('h1','甲')];enemiesData=Array.from({length:11},(_,i)=>unit('e'+i,'敌'+i));await summonFromWorldbook(enemiesData[0],'幻影*4',{});return enemiesData.length})()`,
  });
  add({
    stage: 'summon', id: '名额满的召唤技能不可点击', needs: ['isSkillActionable', 'parseSkill'],
    expected: false,
    expr: `(()=>{heroesData=[unit('h1','甲'),...Array.from({length:4},(_,i)=>unit('s'+i,'召',{isSummon:true,side:'hero'}))];return isSkillActionable(heroesData[0],parseSkill('【召】[召唤:幻影]'))})()`,
  });
  add({
    stage: 'summon', id: '友方召唤物每回合冷却递减', needs: ['startRound'],
    expected: 1,
    setup: `nextTurn=function(){};`,
    expr: `(()=>{heroesData=[unit('s1','友召',{isSummon:true,side:'hero',cooldowns:{大招:2}})];enemiesData=[unit('e1','敌')];startRound();return heroesData[0].cooldowns.大招})()`,
  });
  add({
    stage: 'summon', id: '友方召唤治疗应选择受伤友军', needs: ['executeSummonTurn'],
    expected: '受伤队友',
    setup: `executeSkillAction=async function(c,t){__target=t&&t.name};`,
    expr: `(async()=>{var s=unit('s1','治疗召唤',{isSummon:true,side:'hero',hp:80,skills:[parseSkill('【治疗】[单回;power:20][他人]')]});heroesData=[unit('h1','受伤队友',{hp:20}),s];enemiesData=[unit('e1','受伤敌人',{hp:20})];state.isGameStarted=true;__target=null;await executeSummonTurn(s,combatToken);return __target})()`,
  });
  add({
    stage: 'summon', id: '物品突进执行透传(ignoreRow)', needs: ['itemToPseudoSkill', 'parseItem'],
    expected: true,
    expr: `!!itemToPseudoSkill(parseItem('【投具】[道具][群攻;power:60][近战][突进]')).ignoreRow`,
  });
  add({
    stage: 'summon', id: '带突进的蓄力技能可点击后排', needs: ['handleTargetClick', 'parseSkill'],
    expected: true,
    setup: `function updateMenu(){};async function doReleaseCharge(){__released=true};`,
    expr: `(async()=>{const h=unit('h1','甲',{currentDelay:{skill:parseSkill('【突刺】[单体;power:30][近战][突进]')}});const t=unit('e1','后排',{row:'back'});state.isTargeting=true;state.isAnimating=false;state.pendingAction={type:'release_charge'};state.actionQueue=[{type:'hero',ref:h}];state.queueIndex=0;hasAliveFront=function(){return true};__released=false;await handleTargetClick(t,'enemy');hasAliveFront=function(){return false};return __released})()`,
  });
  add({
    stage: 'summon', id: '友召继承变种按side(isHeroSideEntity真值表)', needs: ['isHeroSideEntity'],
    expected: [true, false, true, false],
    expr: `[isHeroSideEntity({isSummon:true,side:'hero',id:'s_1'}),isHeroSideEntity({isSummon:true,side:'enemy',id:'s_2'}),isHeroSideEntity({id:'h1'}),isHeroSideEntity({id:'e1'})]`,
  });
  add({
    stage: 'summon', id: '友召变种继承按side(ON_KILL门静态)', staticCheck: (src) => {
      const i = src.indexOf('CombatEvents.emit(EVENTS.ON_KILL');
      if (i < 0) return false;
      return src.slice(Math.max(0, i - 500), i).includes('isHeroSideEntity(caster)');
    }, expected: true,
  });

  /* ===== settings ===== */
  add({
    stage: 'settings', id: '摘要开关刷新恢复', needs: ['initLLMPresets', 'persistLLMSettings', 'loadLLMSettings'],
    expected: false,
    expr: `(async()=>{initLLMPresets();llmState.digestBattle=false;llmState.presets[0].digestBattle=false;await persistLLMSettings();llmState.digestBattle=true;llmState.presets=[];await loadLLMSettings();return llmState.digestBattle})()`,
  });
  add({
    stage: 'baseline', id: '职业初始化应使用合并后的MP上限', needs: ['applyPersistedRoster'],
    expected: 50,
    expr: `(()=>{__roster={heroes:[{name:'施法者',config:{classType:'施法者',maxMp:100},skills:[]}]};heroesData=[unit('h1','施法者',{mp:50,maxMp:50,shield:0})];applyPersistedRoster();return heroesData[0].shield})()`,
  });
  add({
    stage: 'damage', id: '钢体应免疫职业暗袭眩晕', needs: ['CLASS_PASSIVES'],
    expected: false,
    setup: `__rng=Math.random;Math.random=function(){return 0};`,
    expr: `(()=>{var t=unit('e1','钢体',{tags:['[钢体]']});var c=unit('h1','隐匿者',{classType:'隐匿者',baseTauntBonus:-50});try{CLASS_PASSIVES['隐匿者'].onAfterDamageDealt(c,t,null,'近战')}finally{Math.random=__rng}return t.buffs.some(b=>b.type==='stun')})()`,
  });
  add({
    stage: 'damage', id: '耐毒应免疫职业淬毒', needs: ['CLASS_PASSIVES'],
    expected: false,
    expr: `(()=>{var t=unit('e1','耐毒',{immunePoison:true,tags:['[耐毒]']});CLASS_PASSIVES['灾厄使'].onAfterDamageDealt(unit('h1','毒师',{atk:20}),t,null);return t.buffs.some(b=>b.type==='poison')})()`,
  });
  add({
    stage: 'damage', id: '自缓代价应能被驱散', needs: ['TAG_HANDLERS'],
    expected: 0,
    hostSetup: (ctx, src) => {
      const s = src.indexOf('const TAG_HANDLERS = {}');
      const e = src.indexOf('function getEffectiveSpeed(', s);
      if (s < 0 || e <= s) throw new Error('TAG_HANDLERS 段未找到');
      vm.runInContext(src.slice(s, e), ctx);
    },
    expr: `(()=>{var t=unit('h1','角色',{buffs:[{type:'spd',value:-20,duration:2}]});TAG_HANDLERS['驱散']({target:t,targetDom:null,actualPower:1});return t.buffs.length})()`,
  });
  add({
    stage: 'settings', id: '败北结算不应要求续写胜利', needs: ['showBattleResult'],
    expected: false,
    setup: `document.getElementById=function(id){return __dom[id]||(__dom[id]={style:{},classList:{add:function(){},remove:function(){}},value:''})};`,
    expr: `(()=>{heroesData=[];enemiesData=[];battleHistory=[];_subdueVictory=false;showBattleResult('lose');return document.getElementById('result-prompt').value.includes('走向胜利')})()`,
  });

  return T;
}

/* ---------------- 执行 ---------------- */
function parseStages() {
  const arg = process.argv.find((a) => a.startsWith('--stage='));
  if (!arg) return ALL_STAGES.slice();
  const raw = arg.slice('--stage='.length).trim();
  if (!raw || raw === 'all') return ALL_STAGES.slice();
  const picked = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const bad = picked.filter((s) => !ALL_STAGES.includes(s));
  if (bad.length) { console.error('未知 stage：' + bad.join(',') + '（可选 ' + ALL_STAGES.join('/') + '/all）'); process.exit(2); }
  return ALL_STAGES.filter((s) => picked.includes(s));
}

(async function main() {
  const stages = parseStages();
  console.log('验收 stage：' + stages.join(', ') + '（版本：' + VERSIONS.map((v) => v.label).join(' / ') + '）');
  const summary = { 符合: 0, 不符: 0, 待对齐: 0, 工具错误: 0 };
  const failures = [];

  for (const v of VERSIONS) {
    const full = path.join(ROOT, v.file);
    if (!fs.existsSync(full)) { console.log('\n[跳过] 不存在：' + full); continue; }
    const source = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
    const tests = buildTests(source).filter((t) => stages.includes(t.stage));
    console.log('\n===== ' + v.label + '（' + tests.length + ' 项） =====');

    for (const stage of stages) {
      const group = tests.filter((t) => t.stage === stage);
      if (!group.length) continue;
      console.log('\n-- ' + stage + ' --');
      for (const t of group) {
        let rec;
        if (t.staticCheck) {
          let ok = false, err = null;
          try { ok = !!t.staticCheck(source); } catch (e) { err = e.message; }
          rec = err ? { status: '工具错误', actual: err } : { status: ok === t.expected ? '符合' : '不符', actual: ok };
        } else {
          const ctx = makeSandbox();
          let restore = null;
          try {
            loadCore(ctx, source);
            if (t.mocks) restore = saveAndMock(ctx, t.mocks);
            if (t.setup) vm.runInContext(t.setup, ctx);
            if (t.hostSetup) t.hostSetup(ctx, source);
            const missing = (t.needs || []).filter((n) => !vm.runInContext("typeof " + n + " !== 'undefined'", ctx));
            if (missing.length) { rec = { status: '待对齐', actual: '缺少接口 ' + missing.join(',') }; }
            else {
              const actual = await vm.runInContext(t.expr, ctx);
              const a = JSON.parse(JSON.stringify(actual));
              rec = { status: JSON.stringify(a) === JSON.stringify(t.expected) ? '符合' : '不符', actual: a };
            }
          } catch (e) {
            const msg = String(e && e.message || e);
            rec = { status: /未找到真实函数|函数未闭合|未找到真实常量|常量未闭合/.test(msg) ? '待对齐' : '工具错误', actual: msg };
          } finally {
            if (restore) restore();
          }
        }
        summary[rec.status]++;
        const tag = rec.status === '符合' ? 'OK ' : 'NG ';
        console.log('   ' + tag + '[' + rec.status + '] ' + t.id + (rec.status === '符合' ? '' : ' → ' + JSON.stringify(rec.actual)));
        if (rec.status !== '符合') failures.push(v.label + ' | ' + stage + ' | ' + t.id + ' | ' + rec.status + ' | ' + JSON.stringify(rec.actual));
      }
    }
  }

  console.log('\n==================== 汇总 ====================');
  console.log('符合 ' + summary.符合 + '   不符 ' + summary.不符 + '   待对齐 ' + summary.待对齐 + '   工具错误 ' + summary.工具错误);
  if (failures.length) {
    console.log('\n未通过明细：');
    failures.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
  }
  const bad = summary.不符 + summary.待对齐 + summary.工具错误;
  console.log(bad === 0 ? '结论：全部通过。' : '结论：' + bad + ' 项未通过（不符=' + summary.不符 + '，待对齐=' + summary.待对齐 + '，工具错误=' + summary.工具错误 + '）。');
  process.exit(bad === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
