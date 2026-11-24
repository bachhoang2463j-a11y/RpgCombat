'use strict';
// 直接检查重建单文件中的真实后端；不把离线规则验证冒充页面交互门禁。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
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
check('编辑器特效清单来自注册表', html.includes('function getFxTagOptions()') && html.includes('[...getFxTagOptions()]') && html.includes('fxOptions(s.fxTag)'));
check('空霰弹与群体规则区域适配入包', html.includes('suppressImpact') && html.includes('areaBounds'));
check('原版辅助SVG及四类动画入包', ['playGenericSupportFx', 'spawnHealParticles', 'anim-heal', 'anim-buff', 'anim-shield', 'anim-mp', '35,15 L65,15', '50,5 85,25'].every(s => html.includes(s)));
check('辅助真实结果与持久标签回读入包', ['playSupportEffects', 'supportResourceDelta', 'applyPersistentFxTags', 'SUPPORT_BUFF', 'SUPPORT_EFFECT'].every(s => html.includes(s)));
check('辅助取消通知与动作代际隔离入包', html.includes('supportHandles') && html.includes('actionScope') && html.includes('isCurrent()'));
check('击杀自爆medium震动档位入包', html.includes('medium:[250,5]'));
check('原版特效与角色独立堆叠层入包', html.includes('z-index:2;') && html.includes('z-index:3;'));
check('发现敌人记录字段及枪声去重入包', html.includes('discoveredIds') && html.includes('playRandomStandardGunshot.last'));
check('原版受击数字及真实结果接线入包', ['buildHitFeedback', 'prepareHitNumbers', 'animateHitNumber', 'HIT_NUMBER_THEMES', 'data-hit-type', '--hit-scale'].every(s => html.includes(s)));
check('头像远景底线及父子引用修复入包', html.includes('avatarScaleForZoom') && html.includes('linkSkillGroupRows'));
check('原版状态变种真实入口与常量入包', ['syncStatusLayers', 'clearStatusLayers', 'playStatusTickFx', 'syncVariantState', 'clearVariantState', 'playVariantTriggerFx', 'isEntityVariantLocked', 'STATUS_COLORS', 'arcane-status-flame-chip', 'arcane-variant-molted-fx'].every(s => html.includes(s)));
check('实际结果事件和视觉消费入包', ['variant-trigger', 'status-tick', 'status-proc', 'status-removed', 'consumeVisualEvents', 'syncVisualState'].every(s => html.includes(s)));
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
  check('权威样本四英雄六敌两召唤词条入产物', block.heroes.length === 4 && block.enemies.length === 6 && block.summonTemplates.length === 2);
  check('中文原值与独立属性保真', data.units[0].ref.hp === 100 && data.units[0].ref.mp === 110 && data.units[0].ref.perception === 50);
  const fog = block.heroes[0].skills.find(s => s.name === '拉莱耶造雾术');
  check('埃利奥特造雾半径5射程12且深潜者不变', fog.range.radius === 5 && fog.range.castRange === 12
    && block.enemies.filter(e => e.name.startsWith('深潜者')).every(e => e.skills.find(s => s.name === '拉莱耶造雾术').range.castRange === 15));
  check('浓雾、冲锋与反应字段实际入包', block.heroes[0].skills.find(s => s.name === '拉莱耶造雾术').regionEffect.type === 'fog'
    && data.summonProvider('幻梦行军兽').skills.find(s => s.name === '冲撞').displacements.some(d => d.type === '冲锋')
    && block.heroes[0].skills.find(s => s.name === '巫师护盾').isReaction);
  const battle = backend.createBattle({ ...data, scene: backend.scene, random: backend.createSeededRandom(data.seed) });
  const opening = battle.start();
  check('产物创建真实对局并发放自然行动', opening.units.length === 10 && opening.currentId === 'e:伊塔库亚的眷族' && opening.resources.main === 1 && opening.resources.aux === 1);
  const caster = data.units.find(u => u.id === opening.currentId);
  const rage = caster.skills.find(s => s.name === '风雪狂暴');
  const action = battle.attack(rage);
  check('产物真实技能结算扣费与增攻', action.ok && caster.ref.mp === 13 && battle.getEffectiveUnit(caster.id).atk === 150 && battle.snapshot().resources.main === 0);
  const ruleState = snap => {
    const { runId, resetEvents, events, ...state } = snap;
    return JSON.stringify({ ...state, events: events.map(({ runId, eventId, actionId, ...event }) => event) });
  };
  const reset = battle.reset();
  check('产物完整重试还原随机种子和资源并切换事件代际', ruleState(reset) === ruleState(opening) && reset.runId !== opening.runId);
  const before = JSON.stringify(battle.snapshot());
  battle.previewAttack(rage);
  check('产物预览不扣HP/MP/主辅资源', JSON.stringify(battle.snapshot()) === before);
  const moveData = backend.createScenarioData(backend.parseYamlText(yaml));
  const moveBattle = backend.createBattle({ ...moveData, scene: backend.scene, random: backend.createSeededRandom(moveData.seed) });
  moveBattle.start();
  for (let i = 0; i < 12 && moveBattle.snapshot().currentId !== 'h:玛德琳'; i++) moveBattle.endAction();
  const move = moveBattle.move(11, 34);
  check('产物实际移动发现食尸鬼并显示暂停原因', move.ok && move.stoppedOnDiscovery && move.cell.col === 13 && move.cell.row === 36 &&
    move.discoveredIds.includes('e:食尸鬼A') && moveBattle.snapshot().log.at(-1).includes('暂停移动'));
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
const report = {
  artifact: 'tactics/mvp-standalone.html', sha256: createHash('sha256').update(html).digest('hex'), bytes: Buffer.byteLength(html),
  kind: 'artifact-backend-only', pageGate: 'pending-frontend', cases,
  passed: cases.filter(c => c.pass).length, failed: cases.filter(c => !c.pass).length,
};
const out = path.join(root, 'integration-test', 'fixtures', 'tactics', 'reports', 'TYPICAL-BATTLE-artifact.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (report.failed) process.exitCode = 1;
