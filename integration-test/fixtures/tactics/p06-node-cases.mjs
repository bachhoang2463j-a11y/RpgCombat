// ==========================================
// P06 T06-01—08 六范围与目标解析验收
// ==========================================

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
function scene(objects = [], columns = 16, rows = 12) {
  return { sceneId: 'p06', grid: { columns, rows, metersPerCell: 1 }, ground: { material: 'brick' }, objects };
}
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 30;
  return { id, name: id, side, footprint: opts.footprint || { width: 1, height: 1 }, skills: opts.skills || [], ref: {
    hp, maxHp: hp, mp: opts.mp ?? 10, maxMp: opts.mp ?? 10, atk: 10, def: opts.def || 0,
    spd: opts.spd ?? 100, evasion: opts.evasion || 0, moveDistance: 4,
  } };
}
function ctx(m, map, units, positions, visibleUnitIds) {
  return { compiled: m.scene.compileScene(map), units, placementsById: positions,
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])), visibleUnitIds };
}
function aim(col, row, targetId) {
  return { x: col + 0.5, y: row + 0.5, ...(targetId ? { targetId } : {}) };
}
function has(ids, id) { return ids.includes(id); }
function j(value) { return JSON.stringify(value); }
function skill(m, text) { return m.parser.parseSkill(text); }

async function p06(m) {
  const { range, battle, scene: sceneModule, parser, ai } = m;
  const cases = [];
  const open = scene();
  const caster = unit('h', 'hero', { spd: 200, mp: 10 });
  const enemy1 = unit('e1', 'enemy');
  const enemy2 = unit('e2', 'enemy');
  const enemy3 = unit('e3', 'enemy');
  const friend = unit('a', 'hero');

  const explicitLine = skill(m, '【横扫】[单体;power:5][范围:直线;长:10;宽:1]');
  const lineCtx = ctx(m, open, [caster, enemy1, enemy2, enemy3, friend], {
    h: { col: 1, row: 4 }, e1: { col: 5, row: 4 }, e2: { col: 7, row: 4 }, e3: { col: 9, row: 4 }, a: { col: 3, row: 4 },
  });
  const lineQuery = range.queryAttack(lineCtx, 'h', explicitLine, aim(10, 4));
  cases.push(ok('T06-01 显式直线按范围选中三名敌人且友方不挡不受伤',
    lineQuery.ok && j(lineQuery.damageTargetIds) === j(['e1', 'e2', 'e3']) && !has(lineQuery.damageTargetIds, 'a'),
    j({ targets: lineQuery.damageTargetIds, actual: lineQuery.actualTargetIds, slot: lineQuery.slotTargets, cells: lineQuery.cells.filter(c => c.row === 4), contact: lineQuery.contact })));

  const blocker = unit('blocker', 'hero');
  const lockedEnemy = unit('locked', 'enemy');
  const lockedAlly = unit('healed', 'hero');
  const blockedPositions = { h: { col: 1, row: 4 }, blocker: { col: 4, row: 4 }, locked: { col: 8, row: 4 }, healed: { col: 8, row: 7 } };
  const blockedCtx = ctx(m, open, [caster, blocker, lockedEnemy, lockedAlly], blockedPositions);
  const attack = skill(m, '【点射】[单体;power:5][范围:单体;射程:12]');
  const heal = { ...skill(m, '【治疗】[单回;power:5][范围:单体;射程:12]'), isOthers: true };
  const blockedAttack = range.queryAttack(blockedCtx, 'h', attack, aim(8, 4, 'locked'));
  const healCtx = ctx(m, open, [caster, blocker, lockedAlly], blockedPositions);
  const throughAllyHeal = range.queryAttack(healCtx, 'h', heal, aim(8, 7, 'healed'));
  cases.push(ok('T06-02 单体攻击被前方友方阻挡，单体治疗不被角色截走',
    !blockedAttack.ok && blockedAttack.blockedBy?.unitId === 'blocker' && throughAllyHeal.ok && j(throughAllyHeal.slotTargets[0].targetIds) === j(['healed']),
    j({ attack: blockedAttack.blockedBy, heal: throughAllyHeal.slotTargets })));

  const low = scene([{ id: 'low', kind: 'lowCounter', bounds: { col: 5, row: 4, width: 1, height: 1 } }]);
  const wall = scene([{ id: 'wall', kind: 'wall', bounds: { col: 5, row: 4, width: 1, height: 1 } }]);
  const rangedUnits = [caster, enemy1];
  const rangedPositions = { h: { col: 1, row: 4 }, e1: { col: 9, row: 4 } };
  const lowQuery = range.queryAttack(ctx(m, low, rangedUnits, rangedPositions), 'h', attack, aim(9, 4, 'e1'));
  const wallQuery = range.queryAttack(ctx(m, wall, rangedUnits, rangedPositions), 'h', attack, aim(9, 4, 'e1'));
  const penetrateDebuff = skill(m, '【破甲】[穿透;power:5][范围:单体;射程:12]');
  const penetrateOnWall = range.queryAttack(ctx(m, wall, rangedUnits, rangedPositions), 'h', penetrateDebuff, aim(9, 4, 'e1'));
  const guaranteed = skill(m, '【必中】[必中][单体;power:5][范围:单体;射程:12]');
  cases.push(ok('T06-03 低障碍不挡远程、穿透不穿墙且必中不绕墙',
    lowQuery.ok && !wallQuery.ok && wallQuery.blockedBy?.type === 'wall' && !penetrateOnWall.ok && !range.queryAttack(ctx(m, wall, rangedUnits, rangedPositions), 'h', guaranteed, aim(9, 4, 'e1')).ok,
    j({ low: lowQuery.ok, wall: wallQuery.blockedBy, penetrate: penetrateOnWall.blockedBy })));

  const blast = skill(m, '【爆裂】[群攻;power:5][范围:爆炸;半径:2;射程:12]');
  const blastFriend = unit('blastFriend', 'hero');
  const blastEnemy = unit('blastEnemy', 'enemy');
  const blastMap = ctx(m, open, [caster, blastFriend, blastEnemy], {
    h: { col: 1, row: 4 }, blastFriend: { col: 4, row: 4 }, blastEnemy: { col: 5, row: 4 },
  });
  const blastQuery = range.queryAttack(blastMap, 'h', blast, aim(10, 4));
  // 敌方直接被撞：接触单位计入伤害名单恰好一次（旧实现剔除其中心格，1×1 被撞者反而不受伤）
  const hitMap = ctx(m, open, [caster, blastEnemy], { h: { col: 1, row: 4 }, blastEnemy: { col: 5, row: 4 } });
  const hitQuery = range.queryAttack(hitMap, 'h', blast, aim(10, 4));
  const hitCount = hitQuery.damageTargetIds.filter(id => id === 'blastEnemy').length;
  const wallBlast = range.queryAttack(ctx(m, wall, [caster, blastEnemy], { h: { col: 1, row: 4 }, blastEnemy: { col: 9, row: 4 } }), 'h', blast, aim(10, 4));
  const freeBlast = range.queryAttack(ctx(m, open, [caster, blastEnemy], { h: { col: 1, row: 4 }, blastEnemy: { col: 9, row: 8 } }), 'h', blast, aim(10, 4));
  cases.push(ok('T06-04 爆炸按首次接触或瞄准点起爆，被撞敌人计入伤害恰好一次，被撞友方只起爆不受伤',
    hitQuery.contact?.type === 'unit' && hitQuery.contact.unitId === 'blastEnemy' && hitCount === 1 &&
    blastQuery.contact?.type === 'unit' && blastQuery.contact.unitId === 'blastFriend' &&
    !has(blastQuery.damageTargetIds, 'blastFriend') && has(blastQuery.damageTargetIds, 'blastEnemy') && !has(blastQuery.damageTargetIds, 'h') &&
    wallBlast.contact?.type === 'wall' && freeBlast.contact === null && freeBlast.shape.center.x === 10.5,
    j({ enemyHit: { contact: hitQuery.contact, damage: hitQuery.damageTargetIds }, friend: { contact: blastQuery.contact, damage: blastQuery.damageTargetIds }, wall: wallBlast.contact, free: freeBlast.shape.center })));

  const giant = unit('giant', 'enemy', { footprint: { width: 2, height: 2 } });
  const byCenter = skill(m, '【中心爆】[群攻;power:5][范围:圆形;半径:0.8;射程:12]');
  const giantQuery = range.queryAttack(ctx(m, open, [caster, giant], { h: { col: 1, row: 4 }, giant: { col: 6, row: 3 } }), 'h', byCenter, { x: 7, y: 4 });
  cases.push(ok('T06-05 2×2单位按中心纳入范围并作为单一目标',
    j(giantQuery.damageTargetIds) === j(['giant']) && giantQuery.targets.find(t => t.unitId === 'giant').cells.length === 4,
    j({ targets: giantQuery.damageTargetIds, occupied: giantQuery.targets.find(t => t.unitId === 'giant')?.cells })));

  const dodger = unit('dodger', 'enemy', { hp: 30, evasion: 1000 });
  const rear = unit('rear', 'enemy', { hp: 30 });
  let dice = 0;
  const dodgeBattle = battle.createBattle({ units: [caster, dodger, rear],
    placementsById: { h: { col: 1, row: 4 }, dodger: { col: 5, row: 4 }, rear: { col: 8, row: 4 } }, scene: open,
    random: () => { dice++; return 0.99; } });
  dodgeBattle.start();
  const dodgeResult = dodgeBattle.attack(attack, aim(5, 4, 'dodger'));
  cases.push(ok('T06-06 锁定目标闪避后不转火后方单位',
    dodgeResult.ok && dodgeResult.hits.length === 1 && dodgeResult.hits[0].targetId === 'dodger' && !dodgeResult.hits[0].hit && rear.ref.hp === 30 && dice === 2,
    j({ hits: dodgeResult.hits.map(h => ({ id: h.targetId, hit: h.hit })), rearHp: rear.ref.hp, dice })));

  const circle = skill(m, '【爆轰】[群攻;power:5][范围:圆形;半径:5;射程:12]');
  const wallCircleCtx = ctx(m, wall, [caster, enemy1], { h: { col: 1, row: 4 }, e1: { col: 8, row: 4 } });
  const blockedArea = range.queryAttack(wallCircleCtx, 'h', circle, aim(8, 4));
  const global = skill(m, '【全域】[群攻;power:5][范围:全域]');
  const globalArea = range.queryAttack(wallCircleCtx, 'h', global, aim(8, 4));
  cases.push(ok('T06-07 圆形受墙体遮挡，全域忽略普通墙与视距',
    !has(blockedArea.actualTargetIds, 'e1') && has(globalArea.actualTargetIds, 'e1'),
    j({ area: blockedArea.actualTargetIds, global: globalArea.actualTargetIds })));

  const hybrid = skill(m, '【复合】[单体;power:5][群回;power:4][群降;power:2][范围:圆形;半径:4;射程:8]');
  const hybridQuery = range.queryAttack(ctx(m, open, [caster, enemy1, friend], {
    h: { col: 2, row: 4 }, e1: { col: 5, row: 4 }, a: { col: 4, row: 6 },
  }), 'h', hybrid, aim(5, 4, 'e1'));
  cases.push(ok('T06 槽级空间上下文区分单体敌方、群体友方治疗和群体敌方减益',
    hybridQuery.slotTargets[0].scope === 'area' && j(hybridQuery.slotTargets[0].targetIds) === j(['e1']) &&
    hybridQuery.slotTargets[1].side === 'ally' && has(hybridQuery.slotTargets[1].targetIds, 'a') &&
    hybridQuery.slotTargets[2].side === 'enemy' && has(hybridQuery.slotTargets[2].targetIds, 'e1'), j(hybridQuery.slotTargets)));

  let attackRolls = 0;
  const hidden = unit('hidden', 'enemy', { hp: 40 });
  const visible = unit('visible', 'enemy', { hp: 40 });
  const blindCtx = ctx(m, open, [caster, visible, hidden], {
    h: { col: 1, row: 4 }, visible: { col: 5, row: 4 }, hidden: { col: 7, row: 4 },
  }, ['visible']);
  const blindBattle = battle.createBattle({ units: blindCtx.units, placementsById: blindCtx.placementsById,
    scene: open, visibleUnitIds: ['visible'], random: () => { attackRolls++; return 0; } });
  blindBattle.start();
  const preview = blindBattle.previewAttack(global, aim(9, 4));
  const before = blindBattle.snapshot();
  const actual = blindBattle.attack(global, aim(9, 4));
  const after = blindBattle.snapshot();
  const aiSkill = skill(m, '【火线】[群攻;power:5][范围:直线;长:8;宽:2]');
  const aiPlan = ai.chooseEnemyAction(ctx(m, open, [unit('hero', 'hero'), unit('mob', 'enemy')],
    { hero: { col: 8, row: 4 }, mob: { col: 2, row: 4 } }), 'mob', 0, [aiSkill]);
  cases.push(ok('T06-08 预览不扣费不泄露隐藏目标，真实结算同查询且AI可消费六范围',
    preview.ok && has(preview.actualTargetIds, 'hidden') && !has(preview.disclosureTargetIds, 'hidden') &&
    before.resources.main === after.resources.main + 1 && before.units.find(u => u.id === 'hidden').hp === 40 &&
    actual.ok && has(actual.hits.map(h => h.targetId), 'hidden') && attackRolls === 4 && aiPlan.skill === aiSkill,
    j({ disclosed: preview.disclosureTargetIds, actual: actual.hits.map(h => h.targetId), rolls: attackRolls, ai: aiPlan.skill?.name })));

  return { cases };
}
export const groups = { 'T06-01': { run: deps => p06(deps.modules) } };
