'use strict';
// 对当前单文件中的真实规则执行本轮定向验证，不冒充浏览器演出验收。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'tactics/mvp-standalone.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const cases = [];
const examples = {};
function check(id, pass, detail = '') { cases.push({ id, pass: !!pass, detail }); }
check('单脚本与闭合', scripts.length === 1 && (html.match(/<\/script>/g) || []).length === 1);
check('零外部业务JS/CSS/import', !/<script[^>]+src=|<link[^>]+stylesheet/i.test(html) && !/\bimport\s*(?:\(|[{*'"\w])/.test(scripts[0]?.[1] || ''));
check('守护、隔绝、原因与揭示模块真实入包', ['previewGuard', 'autoSummonGuard', 'resolveBarrierDamage', 'expireBarriers', 'immunityReason', 'burn-heal-suppressed', 'holdGuards', 'revealGuard'].every(s => html.includes(s)));
const context = { console, structuredClone, URL, setTimeout, clearTimeout };
context.window = context;
vm.createContext(context);
let startupError;
try { new vm.Script(scripts[0][1]).runInContext(context, { timeout: 10000 }); }
catch (error) { startupError = error.message; }
check('真实后端已加载且仅因无DOM停止页面启动', startupError === 'document is not defined', startupError);
const backend = context.__TACTICS_BACKEND__;
check('真实后端createBattle导出', typeof backend?.createBattle === 'function');
function unit(id, side, spd = 100) {
  return { id, name: id, side, controller: 'player', footprint: { width: 1, height: 1 }, skills: [], items: [],
    ref: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, tp: 0, maxTp: 100, atk: 10, def: 0, spd, evasion: 0, moveDistance: 6, perception: 100 } };
}
function fixture(summon = false) {
  const units = [unit('h', 'hero', summon ? 100 : 300), unit(summon ? 'g' : 'a', 'hero', 70), unit('e', 'enemy', summon ? 300 : 100)];
  const placementsById = { h: { col: 4, row: 4 }, [units[1].id]: { col: summon ? 3 : 5, row: 4 }, e: { col: 10, row: 4 } };
  if (summon) { units[1].isSummon = true; units[1].summonOwnerId = 'h'; units[0].ref.hp = 20; }
  const battle = backend.createBattle({ units, placementsById, random: () => 0.5,
    scene: { sceneId: 'guard-artifact', grid: { columns: 20, rows: 12, metersPerCell: 1 }, objects: [] } });
  battle.start();
  return { battle, units, placementsById };
}
function turn(battle, id) { for (let i = 0; i < 40 && battle.snapshot().currentId !== id; i++) battle.endAction(); }
function test(id, run) { try { check(id, run()); } catch (error) { check(id, false, error.stack); } }
const attack = { name: '来袭', type: '[伤害]', power: 50, guaranteedHit: true, damageType: '法术', range: { type: '单体', castRange: 15 }, actionCost: { main: 1, aux: 0 } };
const barrier = { name: '肃正', type: '[肃正:法术]', power: 60, slotTurns: 2, range: { type: '圆形', radius: 2 }, actionCost: { main: 1, aux: 0 } };
if (backend) {
  test('产物自动致死守护真实留位、同段关联与主人零伤', () => {
    const { battle, units, placementsById } = fixture(true);
    const result = battle.attack(attack, { targetId: 'h', x: 4.5, y: 4.5 });
    const seg = result.hits[0]?.segments[0], event = result.events.find(e => e.type === 'guard-committed');
    examples.summonGuard = { event, segment: seg };
    return result.ok && event?.reason === 'summon-lethal-guard' && event.segmentId === seg.segmentId && seg.targetId === 'g'
      && placementsById.g.col === event.to.col && placementsById.g.row === event.to.row && units[0].ref.hp === 20 && units[1].ref.hp === 50;
  });
  test('产物非致死不自动守护', () => {
    const { battle, units } = fixture(true); units[0].ref.hp = 100;
    const result = battle.attack(attack, { targetId: 'h', x: 4.5, y: 4.5 });
    return result.ok && !result.events.some(e => e.type === 'guard-committed') && units[0].ref.hp === 50;
  });
  test('产物副槽肃正取值与时长、稳定金色', () => {
    const { battle } = fixture();
    const result = battle.attack({ ...barrier, type: '[回复]', power: 4, type2: '[肃正:法术]', power2: 90, slotTurns2: 2 });
    const b = battle.ctx.barriers[0]; examples.created = result.events.find(e => e.type === 'barrier-created');
    return result.ok && b.maxIntegrity === 90 && b.endAt === null && b.visualIdentity === 'gold';
  });
  test('产物群攻两人共享一次整体承伤', () => {
    const { battle, units } = fixture(); battle.attack(barrier); turn(battle, 'e');
    const result = battle.attack({ ...attack, range: { type: '全域' } });
    const hits = result.events.filter(e => e.type === 'barrier-damaged'); examples.groupHit = hits[0];
    return result.ok && hits.length === 1 && hits[0].protectedTargetIds.length === 2 && hits[0].actualLoss === 25
      && units[0].ref.hp === 100 && units[1].ref.hp === 100;
  });
  test('产物空结界可以正式攻击', () => {
    const { battle, placementsById } = fixture(); battle.attack(barrier); const id = battle.ctx.barriers[0].id;
    placementsById.h.col = 1; placementsById.a.col = 2; turn(battle, 'e');
    const target = battle.queryBarrierTargets(attack)[0];
    const result = battle.attack(attack, { barrierId: id });
    examples.directTarget = target;
    return !!target && result.ok && result.events.filter(e => e.type === 'barrier-damaged').length === 1;
  });
  test('产物实际抗性原因与数值对应', () => {
    const { battle, units } = fixture(true); units[1].isSummon = false; units[0].ref.hp = 100; units[0].attrTags = ['[虚形]'];
    const result = battle.attack({ ...attack, damageType: '近战' }, { targetId: 'h', x: 4.5, y: 4.5 });
    const seg = result.hits[0]?.segments[0]; examples.resistance = seg;
    return result.ok && seg.resistance.layers.length === 1 && seg.resistance.before === 50 && seg.resistance.after === 25 && units[0].ref.hp === 75;
  });
  test('产物燃烧减疗原因与实际回血', () => {
    const { battle, units } = fixture(); units[0].ref.hp = 20;
    battle.buffsOf('h').push({ type: 'burn', value: 5, _source: { casterId: 'e', skillId: 'fire', effectId: 'burn:1' } });
    const result = battle.attack({ name: '治疗', type: '[回复]', power: 40, range: { type: '自身' }, actionCost: { main: 1, aux: 0 } });
    const heal = result.effects[0]; examples.healSuppressed = heal;
    return result.ok && heal.reason === 'burn-heal-suppressed' && heal.healBeforeSuppression === 40 && heal.healAfterSuppression === 20 && heal.value === 20 && units[0].ref.hp === 40;
  });
  test('产物永久持续、重开与销毁清理', () => {
    const { battle } = fixture(); battle.attack({ ...barrier, slotTurns: 1 }); const b = battle.ctx.barriers[0];
    for (let i = 0; i < 80; i++) battle.endAction();
    const permanent = b.endAt === null && battle.snapshot().now > b.createdAt + 1000 && battle.ctx.barriers[0]?.id === b.id
      && !battle.snapshot().events.some(e => e.reason === 'expired');
    turn(battle, 'h'); battle.attack(barrier); const id = battle.snapshot().runId;
    const reset = battle.reset(); battle.attack(barrier); const destroyed = battle.destroy();
    return permanent && reset.runId !== id && reset.resetEvents.some(e => e.reason === 'reset') && battle.ctx.barriers.length === 0 && destroyed.events.some(e => e.reason === 'destroyed');
  });
  test('产物屏障内敌人不能离开，击碎后恢复移动', () => {
    const { battle, placementsById } = fixture();
    placementsById.e = { col: 4, row: 5 };
    battle.attack(barrier); turn(battle, 'e');
    const trapped = !battle.move(4, 8).ok && !battle.jump(4, 8).ok;
    const b = battle.ctx.barriers[0];
    const broken = battle.attack({ ...attack, power: 1000 }, { barrierId: b.id });
    return trapped && broken.ok && battle.ctx.barriers.length === 0 && battle.move(4, 8).ok;
  });
}
const report = { kind: 'guard-barrier-artifact-backend', artifact: 'tactics/mvp-standalone.html', bytes: Buffer.byteLength(html),
  sha256: createHash('sha256').update(html).digest('hex'), cases, passed: cases.filter(c => c.pass).length, failed: cases.filter(c => !c.pass).length,
  examples, pageGate: 'not-tested-by-this-script', visuals: 'pending-frontend' };
fs.writeFileSync(path.join(root, 'integration-test/fixtures/tactics/reports/GUARD-BARRIER-artifact.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, sha256: report.sha256, failures: cases.filter(c => !c.pass) }));
if (report.failed) process.exitCode = 1;
