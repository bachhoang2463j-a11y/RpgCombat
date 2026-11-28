'use strict';
// 直接检查重建单文件中的真实后端；不把离线规则验证冒充页面交互门禁。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..', '..');
const artifact = path.join(root, 'tactics', 'mvp-standalone.html');
const html = fs.readFileSync(artifact, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const cases = [];
function check(id, pass, detail = '') { cases.push({ id, pass: !!pass, detail }); }
check('单个脚本及闭合标签', scripts.length === 1 && (html.match(/<\/script>/g) || []).length === 1);
check('零外部业务脚本或样式', !/<script[^>]+src=|<link[^>]+stylesheet/i.test(html));
check('零外部import', !/\bimport\s*(?:\(|[{*'"\w])/.test(scripts[0][1]));
check('伤害槽与父子菜单分类及阵营收益修复入包', html.includes('some(isAttackSkill)') && html.includes('skillSlots(skill).some') && /\bbeneficial\s*=\s*def\.debuff/.test(html));
check('唯一显式特效协议与中性反馈入包', /id:\s*["']neutral-impact["']/.test(html) && /pool\.find\(e\s*=>\s*e\.fxTags\?\.includes\(input\.fxTag\)\)/.test(html) && !html.includes('SUBTYPE_RE'));
check('原版逐发记录与转火专用预览入包', html.includes('result.shots') && /previewRetarget\(r\.skill,\s*a,\s*r\.casterId,\s*r\.slotIndex\)/.test(html) && html.includes('segment.shotIndex'));
check('编辑器特效清单来自注册表', html.includes('function getFxTagOptions()') && html.includes('[...getFxTagOptions()]') && html.includes('fxOptions(s.fxTag,s.fxTagInferred)'));
check('空霰弹与群体规则区域适配入包', html.includes('suppressImpact') && html.includes('areaBounds'));
check('原版辅助SVG及四类动画入包', ['playGenericSupportFx', 'spawnHealParticles', 'anim-heal', 'anim-buff', 'anim-shield', 'anim-mp', '35,15 L65,15', '50,5 85,25'].every(s => html.includes(s)));
check('辅助真实结果与持久标签回读入包', ['playSupportEffects', 'supportResourceDelta', 'applyPersistentFxTags', 'SUPPORT_BUFF', 'SUPPORT_EFFECT'].every(s => html.includes(s)));
check('辅助取消通知与动作代际隔离入包', html.includes('supportHandles') && html.includes('actionScope') && html.includes('isCurrent()'));
check('击杀自爆medium震动档位入包', html.includes('medium:[250,5]'));
check('原版特效与角色独立堆叠层入包', html.includes('z-index:2;') && html.includes('z-index:3;'));
check('全局已知位置及枪声去重入包', html.includes('knownPositions:') && html.includes('playRandomStandardGunshot.last'));
check('辅助1.5倍速、隐匿音色及滑行续播入包', ['duration/=1.5', 'totalMs=1100/1.5', 'p.life/=1.5', 'effect.kind==="taunt"?effect.value<0?["buff","hide"]', 'glideSfx.loop', 'cue?.()'].every(s => html.includes(s)));
check('巡走跟随、整技锁定急袭与合并状态入包', ['planIdleMove', 'summonOwnerId', 'idleMovement', 'bdg.concealAtk', 't-st-taunt'].every(s => html.includes(s)) && !html.includes('t-st-passive-taunt'));
check('即时隐匿阈值、急袭次数徽章及错峰并行收尾入包', ['checkStealthThresholds(target)', 'isConcealAtk:', 'conceal-atk', '200/1.5', 'Promise.all(pending)'].every(s => html.includes(s)));
check('跳跃多变体池、飞行动态音效及技能记忆快捷连放入包', ['jump_takeoff_light_1', 'move_flight_wind', 'resolveFlightStyle', 'resolveEnemyQuickAction', 'lastAttackByUnit'].every(s => html.includes(s)));
check('原版受击数字及真实结果接线入包', ['buildHitFeedback', 'prepareHitNumbers', 'animateHitNumber', 'HIT_NUMBER_THEMES', 'data-hit-type', '--hit-scale'].every(s => html.includes(s)));
check('头像远景底线及父子引用修复入包', html.includes('avatarScaleForZoom') && html.includes('linkSkillGroupRows'));
check('原版状态变种真实入口与常量入包', ['syncStatusLayers', 'clearStatusLayers', 'playStatusTickFx', 'syncVariantState', 'clearVariantState', 'playVariantTriggerFx', 'isEntityVariantLocked', 'STATUS_COLORS', 'arcane-status-flame-chip', 'arcane-variant-molted-fx'].every(s => html.includes(s)));
check('实际结果事件和视觉消费入包', ['variant-trigger', 'status-tick', 'status-proc', 'status-removed', 'consumeVisualEvents', 'syncVisualState'].every(s => html.includes(s)));
check('冲锋扫掠、逐段闪避和周期扣血飘字入包', ['chargePath', 'queueReaction', 'awaitShotFeedback', 'suppressDodgeFx', 'onStatusTick', 'playStatusTick'].every(s => html.includes(s)));
check('路径接触揭示、双击转火、自身直放和加速/燃烧展示入包', ['chargeStep', 'playCharge', 'reuseTarget', 'fireSelf', 'chargeInventory', '.t-unit-sprite .arcane-status-persist-burn'].every(s => html.includes(s)));
check('自动跳跃、必中避雾、自动攻辅扣费和整备入包', ['planJump', 'fogRouteFilter', 'skillActionKind', 'universalCost', 'planPreparation', 'previewReady', 'battle.ready()', 'tauntDelta'].every(s => html.includes(s)));
check('物品父子状态与敌方递减入包', /itemStatus\(entry,\s*child\)/.test(html) && /createItemCard\(hero,\s*entry,\s*idx,\s*cIdx\)/.test(html)
  && ['repeatActions', 'recordPacingAction'].every(s => html.includes(s)));
const context = { console, structuredClone, URL, setTimeout, clearTimeout };
context.window = context;
vm.createContext(context);
let hostError = null;
try { new vm.Script(scripts[0][1]).runInContext(context, { timeout: 5000 }); }
catch (error) { hostError = error.message; }
check('无DOM离线宿主停在应用启动而非后端加载', hostError === 'document is not defined', hostError);
const backend = context.__TACTICS_BACKEND__;
check('真实产物导出纯后端接口', backend && ['parseYamlText', 'createScenarioData', 'createSeededRandom', 'createBattle'].every(k => typeof backend[k] === 'function'));
if (backend) {
  const yaml = fs.readFileSync(path.join(root, 'doc', 'tactics', '典型对局-战棋版.yaml'), 'utf8');
  const block = backend.parseYamlText(yaml);
  const data = backend.createScenarioData(block);
  const arena = backend.createEncounterScenario(block, { theme: 'chapel' });
  const arenaBattle = backend.createBattle({ ...arena, random: backend.createSeededRandom(arena.seed) });
  const arenaOpening = arenaBattle.start();
  const arenaTurn = arenaBattle.runEnemyTurn();
  check('单文件默认三层，显式 demo=nave 才选单间', html.includes('demo=nave(&|$)')
    && /singleRoom\s*\?\s*createEncounterDemo\([^)]*\)\s*:\s*\{\s*defaultYaml:/.test(html));
  const chapel = backend.scene;
  const kinds = k => chapel.objects.filter(o => o.kind === k).length;
  check('产物三层棋盘保持三厅两廊与固定陈设', chapel.sceneId === 'sc-chapel' && chapel.floor.length === 5
    && chapel.floor.some(f => f.width === 20 && f.height === 13) && chapel.floor.some(f => f.width === 18 && f.height === 13)
    && chapel.floor.some(f => f.width === 12 && f.height === 10) && kinds('pillar') === 4 && kinds('altar') === 1 && kinds('pew') >= 12);
  check('可选单房间仍可接战并重置', arena.scene.sceneId === 'sc-chapel-nave' && arenaTurn.events.some(e => e.type === 'attack-start' || e.type === 'unit-moved')
    && JSON.stringify(arenaBattle.reset().positions) === JSON.stringify(arenaOpening.positions));
  check('权威样本四英雄六敌两召唤词条入产物', block.heroes.length === 4 && block.enemies.length === 6 && block.summonTemplates.length === 2);
  check('中文原值与独立属性保真', data.units[0].ref.hp === 100 && data.units[0].ref.mp === 110 && data.units[0].ref.perception === 50);
  const fog = block.heroes[0].skills.find(s => s.name === '拉莱耶造雾术');
  check('埃利奥特造雾半径5射程12且深潜者不变', fog.range.radius === 5 && fog.range.castRange === 12
    && block.enemies.filter(e => e.name.startsWith('深潜者')).every(e => e.skills.find(s => s.name === '拉莱耶造雾术').range.castRange === 15));
  check('浓雾、冲锋与反应字段实际入包', block.heroes[0].skills.find(s => s.name === '拉莱耶造雾术').regionEffect.type === 'fog'
    && data.summonProvider('幻梦行军兽').skills.find(s => s.name === '冲撞').displacements.some(d => d.type === '冲锋')
    && block.heroes[0].skills.find(s => s.name === '巫师护盾').isReaction);
  const beast = data.summonProvider('幻梦行军兽');
  const charge = beast.skills.find(s => s.name === '冲撞');
  const unit = (id, side, spd, footprint = { width: 1, height: 1 }) => ({ id, side, name: id, footprint, skills: [], items: [],
    ref: { hp: 500, maxHp: 500, mp: 50, maxMp: 50, atk: 20, def: 0, spd, evasion: 0, moveDistance: 6 } });
  const chargeBattle = backend.createBattle({ units: [unit('beast', 'hero', 200, beast.footprint), unit('ally', 'hero', 50), unit('foe', 'enemy', 50)],
    placementsById: { beast: { col: 2, row: 3 }, ally: { col: 4, row: 3 }, foe: { col: 7, row: 4 } },
    scene: { sceneId: 'charge-artifact', grid: { columns: 16, rows: 10, metersPerCell: 1 }, objects: [] }, random: () => 0.5 });
  chargeBattle.start();
  const chargeAim = { x: 7.5, y: 4.5, targetId: 'foe' };
  const chargeQuery = chargeBattle.previewAttack(charge, chargeAim), chargeResult = chargeBattle.attack(charge, chargeAim);
  const chargePath = chargeResult.events.find(e => e.type === 'unit-charged')?.path;
  const contactStep = chargeResult.hits[0]?.segments[0]?.chargeStep;
  check('产物冲锋穿过友军，2×2 扫掠预览与实际命中同一敌人', chargeQuery.damageTargetIds?.join(',') === 'foe'
    && chargeResult.hits[0]?.hit && chargeResult.hits[0].targetId === 'foe' && chargePath?.some(p => p.col === 8));
  check('产物伤害与击退共用冲锋接触步', chargePath?.[contactStep]?.col === 6
    && chargeResult.events.find(e => e.type === 'unit-displaced')?.chargeStep === contactStep);

  const battle = backend.createBattle({ ...data, scene: backend.scene, random: backend.createSeededRandom(data.seed) });
  const opening = battle.start();
  check('正式战斗开局公开位置并发出主点到账事件', battle.ctx.knownPositions && !battle.ctx.enforcePerception
    && battle.snapshot('h:弗兰克').units.length === 10 && opening.events.some(e => e.type === 'main-point-received' && e.unitId === opening.currentId && e.natural));
  check('产物创建真实对局并发放自然行动', opening.units.length === 10 && opening.currentId === 'e:伊塔库亚的眷族' && opening.resources.main === 1 && opening.resources.aux === 1);
  const caster = data.units.find(u => u.id === opening.currentId);
  const rage = caster.skills.find(s => s.name === '风雪狂暴');
  const action = battle.attack(rage);
  check('产物辅助技能只扣辅点，保留首领攻击专用点', action.ok && caster.ref.mp === 13 && battle.getEffectiveUnit(caster.id).atk === 150
    && opening.resources.skillMain === 2 && battle.snapshot().resources.main === 1 && battle.snapshot().resources.aux === 0 && battle.snapshot().resources.skillMain === 2);
  const ruleState = snap => {
    const { runId, resetEvents, events, ...state } = snap;
    return JSON.stringify({ ...state, events: events.map(({ runId, eventId, actionId, ...event }) => event) });
  };
  const reset = battle.reset();
  check('产物完整重试还原随机种子和资源并切换事件代际', ruleState(reset) === ruleState(opening) && reset.runId !== opening.runId);
  const before = JSON.stringify(battle.snapshot());
  battle.previewAttack(rage);
  check('产物预览不扣HP/MP/主辅资源', JSON.stringify(battle.snapshot()) === before);
  check('精英越障、全图看破及主辅支付关键函数入包', ['planPriorityJump', 'selectKanpo', 'playMainPointReceived', 'actionPayment', 'jumpsRemaining'].every(k => html.includes(k)));
  const stepData = backend.createScenarioData(block);
  const monsterId = 'e:伊塔库亚的眷族';
  const jumper = stepData.units.find(u => u.id === monsterId);
  jumper.skills = jumper.skills.filter(skill => skill.name !== '风雪狂暴');
  Object.assign(stepData.placementsById[monsterId], { col: 11, row: 15 });
  Object.assign(stepData.placementsById['h:埃利奥特'], { col: 11, row: 22 });
  const stepBattle = backend.createBattle({ ...stepData, scene: backend.scene, random: backend.createSeededRandom(stepData.seed) });
  stepBattle.start();
  const stepTurn = stepBattle.runEnemyTurn();
  const jump = stepTurn.events.find(e => e.type === 'unit-jumped' && e.unitId === monsterId);
  check('产物AI真实走到北面台阶并完成大体型跳跃', jump?.from.row === 16 && jump?.to.row === 19 && stepData.placementsById[monsterId].row >= 19);
  check('产物三层战斗已知位置，保留真实北段越障', jump?.unitId === monsterId
    && stepBattle.ctx.knownPositions === true && backend.scene.sceneId === 'sc-chapel');
  const moveData = backend.createScenarioData(backend.parseYamlText(yaml));
  const moveBattle = backend.createBattle({ ...moveData, scene: backend.scene, random: backend.createSeededRandom(moveData.seed) });
  moveBattle.start();
  const openingIds = [];
  for (let i = 0; i < 6; i++) {
    const id = moveBattle.snapshot().currentId;
    if (!id || id.startsWith('h:')) break;
    openingIds.push(id);
    moveBattle.endAction();
  }
  check('产物眷族敏捷100、优格80，开场分别拿到一次自然行动', openingIds.join(',') === monsterId + ',e:犹格索托斯之子'
    && moveData.units.find(u => u.id === monsterId).ref.spd === 100 && moveData.units.find(u => u.id === openingIds[1]).ref.spd === 80
    && moveBattle.snapshot().currentId === 'h:玛德琳', openingIds);
  const gear = { name: '无限补给', isItem: true, category: '道具', type: '[回蓝]', power: 5, count: 0,
    actionCost: { main: 1, aux: 0 }, range: { type: '自身' } };
  const hero = unit('h', 'hero', 200), enemy = unit('e', 'enemy', 10);
  hero.items.push(gear);
  const itemBattle = backend.createBattle({ units: [hero, enemy], placementsById: { h: { col: 2, row: 3 }, e: { col: 7, row: 3 } },
    scene: { sceneId: 'item-artifact', grid: { columns: 16, rows: 10, metersPerCell: 1 }, objects: [] } });
  itemBattle.start();
  itemBattle.defend();
  const firstUse = itemBattle.useItem(gear);
  const lackAux = itemBattle.canUseItem(gear).reason;
  itemBattle.endAction();
  check('产物不限次物品无需主行动、只耗辅助行动且跨行动可复用', firstUse.ok && firstUse.costSummary.aux === 1
    && firstUse.costSummary.main === 0 && lackAux === '辅助行动不足' && itemBattle.useItem(gear).ok && gear.count === 0);
  const replacementBattle = backend.createBattle({ units: [unit('active', 'hero', 200), unit('reserve', 'hero', 50), unit('opponent', 'enemy', 10)],
    placementsById: { active: { col: 2, row: 3 }, reserve: { col: 4, row: 3 }, opponent: { col: 8, row: 3 } },
    scene: { sceneId: 'replacement-artifact', grid: { columns: 16, rows: 10, metersPerCell: 1 }, objects: [] } });
  replacementBattle.start();
  check('产物辅助效果替补接线及实际资源到账路径入包', html.includes('supportResourceDelta') && html.includes('applyPersistentFxTags')
    && html.includes('supportHandles') && html.includes('actionScope') && html.includes('playSupportEffects'));
  const supportCaster = unit('support', 'hero', 200);
  supportCaster.skills = [{ name: '产物辅助', type: '[治疗]', power: 20, range: { type: '单体', castRange: 10 }, actionCost: { main: 0, aux: 1 } }];
  const supportTarget = unit('wounded', 'hero', 50);
  supportTarget.ref.hp = 400;
  const supportBattle = backend.createBattle({ units: [supportCaster, supportTarget, unit('support-foe', 'enemy', 10)],
    placementsById: { support: { col: 2, row: 3 }, wounded: { col: 4, row: 3 }, 'support-foe': { col: 8, row: 3 } },
    scene: { sceneId: 'support-artifact', grid: { columns: 16, rows: 10, metersPerCell: 1 }, objects: [] } });
  supportBattle.start();
  const supportResult = supportBattle.attack(supportCaster.skills[0], { x: 4.5, y: 3.5, targetId: 'wounded' });
  check('产物辅助技能实际治疗到账并正确扣辅助行动', supportResult.ok && supportTarget.ref.hp > 400
    && supportResult.costSummary.aux === 1 && supportResult.costSummary.main === 0
    && supportBattle.snapshot().resources.aux === 0);
  for (let i = 0; i < 12 && moveBattle.snapshot().currentId !== 'h:玛德琳'; i++) moveBattle.endAction();
  const move = moveBattle.move(11, 34);
  check('产物实际移动遇到队友已发现食尸鬼不重复截停', move.ok && !move.stoppedOnDiscovery && move.cell.col === 11 && move.cell.row === 34 &&
    move.discoveredIds.length === 0 && moveBattle.snapshot('h:玛德琳').units.some(u => u.id === 'e:食尸鬼A') && !moveBattle.snapshot().log.at(-1).includes('暂停移动'));
  const el = block.heroes.find(h => h.name === '埃利奥特'), fireGroup = el.skills.find(s => s.name === '火舞术' && s.isGroup);
  check('产物显式技能组保留原名及全局子引用', fireGroup && fireGroup.children.length === 2 && el.skills.includes(fireGroup.children[0]) && fireGroup.children[0].name === '火舞术-精准流火' && block.heroes.every(h => {
    const parent = h.skills.find(s => s.name === '早有准备' && s.isGroup);
    return parent && parent.children.length > 0 && parent.children.every(c => h.skills.includes(c) && c.parentName === parent.name);
  }));
  const shooter = moveData.units.find(u => u.id === 'h:玛德琳'), ghoul = moveData.units.find(u => u.id === 'e:食尸鬼A');
  const shotResult = moveBattle.attack(shooter.skills.find(s => s.name === '柯尔特三连发'), { x: moveData.placementsById[ghoul.id].col + 0.5, y: moveData.placementsById[ghoul.id].row + 0.5, targetId: ghoul.id });
  const landed = (shotResult.hits || []).flatMap(h => h.segments || [h]).filter(s => s.hit);
  check('产物实际受击段保留原伤盾值暴击和性质', shotResult.ok && landed.length > 0 && landed.every(s => Number.isFinite(s.rawDmg) && Number.isFinite(s.shieldBefore) && Number.isFinite(s.shieldAfter) && typeof s.isCrit === 'boolean' && s.damageCategory === '枪击' && s.outcome === 'hit'));
}
async function reportResult() {
  check('火焰/中毒领域常驻层与施放演出、护盾罩/护盾段、区域争夺与被动到账反馈入包',
    ['fire-domain', 'poison-domain', 'regionTypes', 'data-flicker', 'data-bubble', 'region-contest', 't-unit-shield', 't-unit-shielded', 't-bar-shield',
      'passive-gain', 't-card-passive', 't-card-pop', 'bowlBronze', 'bellPing', 'incendiary-bottle', 'throwVial', 'audio:2.5', 'ranshao.webm'].every(s => html.includes(s)));
  if (backend) {
    const fixture = path.join(root, 'integration-test', 'fixtures', 'tactics', 'alerts-node-cases.mjs');
    const { runAlertsCases } = await import(pathToFileURL(fixture).href);
    cases.push(...runAlertsCases(backend).cases);
  }
  const report = {
    artifact: 'tactics/mvp-standalone.html', sha256: createHash('sha256').update(html).digest('hex'), bytes: Buffer.byteLength(html),
    kind: 'artifact-backend-only', pageGate: 'pending-frontend', cases,
    passed: cases.filter(c => c.pass).length, failed: cases.filter(c => !c.pass).length,
  };
  const out = path.join(root, 'integration-test', 'fixtures', 'tactics', 'reports', 'TYPICAL-BATTLE-artifact.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (report.failed) process.exitCode = 1;
}
reportResult().catch(error => { console.error(error); process.exitCode = 1; });
