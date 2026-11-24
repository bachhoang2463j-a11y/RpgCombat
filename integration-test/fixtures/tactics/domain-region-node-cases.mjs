// ==========================================
// 领域区域（浓雾/火焰/中毒）节点用例
// 覆盖：解析映射、三型并存/同源替换、火焰移动减半、中毒施放距离减半、
//       施放即时共享闪避对抗与 3 回合 debuff、真实周期派发、结界去大型敌人限制。
// ==========================================

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
function j(v) { return JSON.stringify(v); }
function scene(objects = [], columns = 16, rows = 12) {
  return { sceneId: 'domain', grid: { columns, rows, metersPerCell: 1 }, ground: { material: 'brick' }, objects };
}
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 30;
  return { id, name: id, side, footprint: opts.footprint || { width: 1, height: 1 }, skills: opts.skills || [], ref: {
    hp, maxHp: hp, mp: opts.mp ?? 10, maxMp: opts.mp ?? 10, atk: opts.atk ?? 10, def: opts.def || 0,
    spd: opts.spd ?? 100, evasion: opts.evasion || 0, moveDistance: opts.moveDistance ?? 4,
  } };
}
function ctxOf(m, map, units, positions) {
  return { compiled: m.scene.compileScene(map), units, placementsById: positions,
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])) };
}

async function domain(m) {
  const { parser, regions, range, battle, scheduler, barriers, scene: sceneModule } = m;
  const cases = [];
  const open = scene();

  // 1. 解析映射：三类区域 + 坏死雾归毒
  const parseOf = t => parser.parseSkillEntry({ 名字: '区域' + t, 标签: '[弱攻;power:10]', 范围: { 类型: '爆炸', 射程: 10, 半径: 2 }, 区域: { 类型: t } }).regionEffect?.type;
  cases.push(ok('DR-01 区域类型映射 浓雾/火焰/中毒/坏死雾',
    parseOf('浓雾') === 'fog' && parseOf('火焰') === 'fire' && parseOf('中毒') === 'poison' && parseOf('坏死雾') === 'poison',
    j({ fog: parseOf('浓雾'), fire: parseOf('火焰'), poison: parseOf('中毒'), necro: parseOf('坏死雾') })));

  // 2. 三型并存、同源同类型替换、雾致盲沿用
  const caster = unit('h', 'hero', { spd: 200 });
  const enemy = unit('e', 'enemy');
  const regionCtx = ctxOf(m, open, [caster, enemy], { h: { col: 2, row: 2 }, e: { col: 3, row: 2 } });
  regionCtx.regions = [];
  const fogSkill = parser.parseSkillEntry({ 名字: '雾', 标签: '[致盲;power:25][Turns:2]', 范围: { 类型: '爆炸', 射程: 10, 半径: 2 }, 区域: { 类型: '浓雾' } });
  const fireSkill = parser.parseSkillEntry({ 名字: '火', 标签: '[燃烧;power:20][Turns:2]', 范围: { 类型: '爆炸', 射程: 10, 半径: 2 }, 区域: { 类型: '火焰' } });
  const poisonSkill = parser.parseSkillEntry({ 名字: '毒', 标签: '[中毒;power:20][Turns:2]', 范围: { 类型: '爆炸', 射程: 10, 半径: 2 }, 区域: { 类型: '中毒' } });
  const q = { aim: { x: 3.5, y: 2.5 }, cells: [{ col: 3, row: 2 }, { col: 2, row: 2 }] };
  regions.createRegion(regionCtx, { caster, skill: fogSkill, query: q, now: 0 });
  regions.createRegion(regionCtx, { caster, skill: fireSkill, query: q, now: 0 });
  regions.createRegion(regionCtx, { caster, skill: poisonSkill, query: q, now: 0 });
  const beforeReplace = regionCtx.regions.length;
  regions.createRegion(regionCtx, { caster, skill: fogSkill, query: q, now: 10 });
  const fogAt = regions.fogAt(regionCtx, 'e');
  cases.push(ok('DR-02 三型并存、同源同类型替换、雾致盲取最高',
    beforeReplace === 3 && regionCtx.regions.length === 3 && fogAt.strength === 25 && fogAt.regionIds.length === 1 &&
    regions.unitInRegionType(regionCtx, 'e', 'fire') && regions.unitInRegionType(regionCtx, 'e', 'poison'),
    j({ regions: regionCtx.regions.map(r => r.type), fogAt })));

  // 3. 火焰移动减半（同类型不重复折半）
  const fireCtx = ctxOf(m, open, [unit('h', 'hero', { spd: 300 }), unit('e', 'enemy')], { h: { col: 2, row: 2 }, e: { col: 6, row: 2 } });
  fireCtx.regions = [];
  regions.createRegion(fireCtx, { caster: fireCtx.units[1], skill: fireSkill, query: q, now: 0 });
  regions.createRegion(fireCtx, { caster: fireCtx.units[1], skill: fireSkill, query: q, now: 0 });
  const fireMove = regions.moveMultiplier(fireCtx, 'h');
  const plainMove = regions.moveMultiplier(ctxOf(m, open, [unit('h', 'hero'), unit('e', 'enemy')], { h: { col: 2, row: 2 }, e: { col: 6, row: 2 } }), 'h');
  const fireBattle = battle.createBattle({ units: fireCtx.units, placementsById: fireCtx.placementsById, scene: open, random: () => 0 });
  fireBattle.ctx.regions = fireCtx.regions;
  fireBattle.start();
  const moved = fireBattle.move(3, 2);
  const plainBattle = battle.createBattle({ units: [unit('h', 'hero', { spd: 300 }), unit('e', 'enemy')], placementsById: { h: { col: 2, row: 2 }, e: { col: 6, row: 2 } }, scene: open, random: () => 0 });
  plainBattle.start();
  const plainMoved = plainBattle.move(3, 2);
  cases.push(ok('DR-03 火焰内移动减半、同类型不重复折半且实际执行翻倍',
    fireMove === 0.5 && plainMove === 1 && moved.ok && plainMoved.ok &&
    Math.abs(moved.cell.cost - plainMoved.cell.cost * 2) < 1e-9,
    j({ fireMove, plainMove, moved: moved.cell && moved.cell.cost, plainMoved: plainMoved.cell && plainMoved.cell.cost })));

  // 4. 中毒施放距离减半（仅 castRange，不改 AoE；近战最少 1；全域不变）
  const poisonCtx = ctxOf(m, open, [unit('h', 'hero'), unit('e', 'enemy')], { h: { col: 2, row: 2 }, e: { col: 10, row: 2 } });
  poisonCtx.regions = [];
  regions.createRegion(poisonCtx, { caster: poisonCtx.units[1], skill: poisonSkill, query: { aim: { x: 2.5, y: 2.5 }, cells: [{ col: 2, row: 2 }] }, now: 0 });
  const ranged = parser.parseSkillEntry({ 名字: '射击', 标签: '[单体;power:5][远程]', 范围: { 类型: '单体', 射程: 10 } });
  const tooFar = range.queryAttack(poisonCtx, 'h', ranged, { x: 10.5, y: 2.5, targetId: 'e' });
  const halvedRange = regions.effectiveCastRange(poisonCtx, 'h', ranged.range, ranged);
  const meleeRange = regions.effectiveCastRange(poisonCtx, 'h', { type: '单体', castRange: 2 }, { damageType: '近战' });
  const globalRange = regions.effectiveCastRange(poisonCtx, 'h', { type: '全域' }, { damageType: '远程' });
  const aoe = regions.effectiveCastRange(poisonCtx, 'h', { type: '爆炸', castRange: 10, radius: 3 }, { damageType: '远程' });
  cases.push(ok('DR-04 中毒内施放距离减半、近战最少1、AoE半径与全域不变',
    !tooFar.ok && halvedRange.castRange === 5 && meleeRange.castRange === 1 && globalRange.type === '全域' && aoe.radius === 3 && aoe.castRange === 5,
    j({ tooFar: tooFar.reason, halvedRange, meleeRange, globalRange, aoe })));

  // 5. 施放即时共享闪避对抗：命中即挂独立 3 回合 debuff，标签不再普通流程重复施加
  const bUnits = [unit('h', 'hero', { spd: 200, atk: 10 }), unit('e', 'enemy', { evasion: 0 })];
  const b = battle.createBattle({ units: bUnits, placementsById: { h: { col: 2, row: 2 }, e: { col: 5, row: 2 } },
    scene: open, random: () => 0 });
  b.start();
  const domainSkill = parser.parseSkillEntry({ 名字: '毒域', 标签: '[弱攻;power:20][Turns:2]', 范围: { 类型: '爆炸', 射程: 15, 半径: 3 }, 区域: { 类型: '中毒' } });
  const atk = b.attack(domainSkill, { x: 5.5, y: 2.5 });
  const eBuff = b.buffsOf('e').find(x => x.type === 'atk');
  const region = (b.ctx.regions || []).find(r => r.type === 'poison');
  cases.push(ok('DR-05 施放即时对抗命中挂 3 回合 debuff，区域标签不入普通流程',
    atk.ok && region && region.tags.length === 1 && eBuff && eBuff.value === -20 && eBuff.duration === 3,
    j({ ok: atk.ok, reason: atk.reason, tags: region && region.tags, buffs: b.buffsOf('e') })));

  // 6. 真实周期：region 状态按 ROUND_TIME 派发 periodic-tick
  const battleState = { combatState: { clock: { seq: 0, now: 0, log: [], statuses: {}, units: {}, rescues: {} } }, cooldowns: {} };
  scheduler.applyStatusRecord(battleState, { unitId: 'h', kind: 'region', source: { casterId: 'h', skillId: 'area:fire', effectId: 'region:fire' }, strength: 10, duration: 200 }, 0);
  const tickEvents = scheduler.settlePhase12(battleState, 100);
  const tick = tickEvents.find(ev => ev.type === 'periodic-tick' && ev.kind === 'region');
  const noEarly = scheduler.settlePhase12(battleState, 50).filter(ev => ev.type === 'periodic-tick' && ev.kind === 'region');
  cases.push(ok('DR-06 领域按 ROUND_TIME 真实周期派发且不提前',
    !!tick && tick.source.skillId === 'area:fire' && noEarly.length === 0,
    j({ tick: tick && tick.source, noEarly: noEarly.length })));

  // 7. 结界去大型敌人限制：2x2 敌被圆界切割不再拒绝
  const barrierSkill = parser.parseSkillEntry({ 名字: '结界', 标签: '[肃正;power:10]', 范围: { 类型: '圆形', 半径: 1 } });
  const big = unit('big', 'enemy', { footprint: { width: 2, height: 2 } });
  const barrierCtx = ctxOf(m, open, [unit('h', 'hero'), big], { h: { col: 0, row: 4 }, big: { col: 0, row: 0 } });
  barrierCtx.barriers = [];
  const previewBarrier = barriers.previewBarrier(barrierCtx, 'h', barrierSkill, { aim: { x: 0.5, y: 0.5 } });
  cases.push(ok('DR-07 结界创建不再受大型敌人占地切割限制',
    previewBarrier.ok && previewBarrier.barrier && previewBarrier.barrier.cells.length > 0,
    j({ ok: previewBarrier.ok, reason: previewBarrier.reason, cells: previewBarrier.barrier && previewBarrier.barrier.cells.length })));

  const tagged = parser.parseSkill('【毒域】[区域:中毒][中毒:10][Turns:5][范围:爆炸;射程:10;半径:2]');
  cases.push(ok('DR-08 字符串领域标签与技能持续时间解析', tagged.regionEffect?.type === 'poison' && tagged.turns === 5, j(tagged.regionEffect)));
  const pathCtx = ctxOf(m, open, [unit('walker', 'hero'), unit('source', 'enemy')], { walker: { col: 1, row: 6 }, source: { col: 10, row: 6 } });
  pathCtx.regions = [{ id: 'fire-path', type: 'fire', casterId: 'source', source: { side: 'enemy' }, cells: Array.from({ length: 12 }, (_, row) => ({ col: 2, row })), endAt: 300 }];
  const pathReach = m.movement.findReachable(pathCtx, 'walker', 3);
  const cross = pathReach.byKey.get('3,6');
  cases.push(ok('DR-09 跨火焰路径按所在格分段计价，离场恢复', cross && cross.cost === 3 && regions.moveMultiplier(pathCtx, 'walker', { col: 3, row: 6 }) === 1, j(cross)));
  const barrierShot = parser.parseSkill('【远界】[肃正:20][范围:爆炸;射程:10;半径:2]');
  const blockedCtx = ctxOf(m, open, [unit('c', 'hero'), unit('blocker', 'enemy')], { c: { col: 1, row: 8 }, blocker: { col: 3, row: 8 } });
  const aimed = range.queryAttack(blockedCtx, 'c', barrierShot, { x: 7.5, y: 8.5 });
  const far = range.queryAttack(blockedCtx, 'c', barrierShot, { x: 15.5, y: 8.5 });
  cases.push(ok('DR-10 结界落点不受敌人截弹且仍限制射程', aimed.ok && aimed.blastCenter.x === 7.5 && !far.ok, j({ aimed: aimed.blastCenter, far: far.reason })));
  return { cases };
}

export const groups = { 'DR-DOMAIN': { run: deps => domain(deps.modules) } };
