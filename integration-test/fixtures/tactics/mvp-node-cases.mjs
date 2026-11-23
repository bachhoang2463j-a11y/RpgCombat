// ==========================================
// MVP Node 侧用例（TM-01～TM-06）：余额/移动/墙体/范围/命闪/AI/胜负/重开
// 全部通过 deps.modules 真实导入 tactics/src 真模块（scene/geometry/movement/range/damage/ai/battle/parser），
// 不复制业务实现、不 mock 引擎、不依赖浏览器；场景为指定墙的构造小图，不设游戏上限。
// 随机一律注入固定种子 LCG（确定性输入，不做长时间掷骰循环）。
// 每组 run(deps) → { cases: [{id, pass, detail}] }。
// 契约依据：doc/tactics/MVP-PLAN.md（M1—M4）与主代理 MVP 接口约定，并已对照
// tactics/src/{battle,movement,range,damage,ai}.mjs 真实实现核对：
//   side 取 'hero'/'enemy'（battle.checkEnd 口径）；aim 为格中心世界坐标（col+0.5,row+0.5）；
//   findReachable cells 含起点 cost 0；battle.start 幂等（同一当前行动不重发余额）。
// ==========================================

function ok(id, pass, detail) {
  return { id, pass: !!pass, detail: detail || '' };
}

function near(a, b, eps) {
  return Math.abs(a - b) <= (eps === undefined ? 1e-6 : eps);
}

function j(x) {
  return JSON.stringify(x);
}

// 固定种子线性同余随机（确定性，可注入 battle/damage）
function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 构造场景（米格标尺固定 1，不设游戏上限）
function sceneWith(objects, cols, rows) {
  return {
    sceneId: 'sc-mvp',
    grid: { columns: cols, rows: rows, metersPerCell: 1 },
    ground: { material: 'brick' },
    objects: objects,
  };
}

// 指定墙的构造场景
function sceneOf(walls, cols, rows) {
  return sceneWith((walls || []).map((c, i) => ({
    id: 'w' + i, kind: 'wall', bounds: { col: c[0], row: c[1], width: 1, height: 1 },
  })), cols, rows);
}

// MVP 单位（ref 口径：hp/maxHp/mp/maxMp/atk/def/spd/evasion/moveDistance；side 取 hero/enemy）
function mkUnit(id, side, o) {
  o = o || {};
  const ref = {
    hp: o.hp !== undefined ? o.hp : 20, maxHp: o.hp !== undefined ? o.hp : 20,
    mp: o.mp !== undefined ? o.mp : 10, maxMp: o.mp !== undefined ? o.mp : 10,
    atk: o.atk !== undefined ? o.atk : 10, def: o.def || 0,
    spd: o.spd !== undefined ? o.spd : 100, evasion: o.evasion || 0,
    moveDistance: o.moveDistance !== undefined ? o.moveDistance : 3,
  };
  if (o.hitBonus) ref.hitBonus = o.hitBonus;
  return { id: id, name: o.name || id, side: side, footprint: o.fp || { width: 1, height: 1 }, ref: ref, skills: o.skills || [] };
}

// 组装 ctx：compiled + units + placementsById + footprintsById
function makeCtx(mods, sceneInput, units, placements) {
  const footprintsById = {};
  for (const u of units) footprintsById[u.id] = u.footprint;
  return {
    compiled: mods.scene.compileScene(sceneInput),
    units: units,
    placementsById: placements,
    footprintsById: footprintsById,
  };
}

// 格中心世界坐标（range.queryAttack 的 aim 口径）
function aimAt(col, row, targetId) {
  const aim = { x: col + 0.5, y: row + 0.5 };
  if (targetId) aim.targetId = targetId;
  return aim;
}

function hpOf(snap, id) {
  const u = (snap.units || []).filter(x => x.id === id)[0];
  return u ? u.hp : undefined;
}

function mpOf(snap, id) {
  const u = (snap.units || []).filter(x => x.id === id)[0];
  return u ? u.mp : undefined;
}

function posOf(snap, id) {
  return snap.positions ? snap.positions[id] : null;
}

function hasCell(cells, col, row) {
  return Array.isArray(cells) && cells.some(c => c.col === col && c.row === row);
}

// 组级门禁：缺模块→"待对齐"失败用例；执行异常→转换为可诊断失败用例
async function runGroup(id, deps, needed, fn) {
  const mods = (deps && deps.modules) || {};
  const miss = needed.filter(k => !mods[k]);
  if (miss.length) {
    return { cases: [ok(id + ' 模块就位', false,
      '待对齐：' + miss.join('、') + ' 未按约定落地（并行开发中），本组暂缓执行')] };
  }
  try {
    const r = await fn(mods);
    return r && Array.isArray(r.cases) ? r : { cases: [ok(id + ' 返回结构', false, 'run 未返回 {cases:[...]}')] };
  } catch (e) {
    return { cases: [ok(id + ' 可执行', false, '执行异常：' + ((e && e.message) || String(e)))] };
  }
}

// ---------- TM-01 移动：八向成本/预算/墙体/友穿敌挡/2×2/战斗移动余额 ----------

async function tm01(m) {
  const { movement, battle, scene, geometry } = m;
  const cases = [];

  // A. 开阔地：八向对角成本 √2、预算裁剪
  const open = sceneOf([], 12, 12);
  const unitsA = [
    mkUnit('h1', 'hero', { spd: 200, moveDistance: 3 }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 30 }),
  ];
  const ctxA = makeCtx(m, open, unitsA, { h1: { col: 2, row: 2, facing: 0 }, e1: { col: 10, row: 8, facing: 180 } });
  const all = movement.findReachable(ctxA, 'h1', Infinity);
  const diag = all && all.byKey instanceof Map ? all.byKey.get(geometry.cellKey(3, 3)) : null;
  cases.push(ok('TM-01 八向对角成本√2且返回cells/byKey',
    !!all && Array.isArray(all.cells) && all.cells.length > 0 && all.byKey instanceof Map &&
    !!diag && near(diag.cost, Math.SQRT2),
    'diag=' + j(diag) + ' cells=' + (all ? all.cells.length : 'null')));
  const one = movement.findReachable(ctxA, 'h1', 1);
  const costOne = one && Array.isArray(one.cells) ? one.cells.filter(c => near(c.cost, 1)).length : -1;
  const startCell = one && one.byKey ? one.byKey.get(geometry.cellKey(2, 2)) : null;
  cases.push(ok('TM-01 预算1含起点(cost0)与4个正交邻格且排除对角',
    !!one && one.cells.length === 5 && costOne === 4 &&
    !!startCell && startCell.cost === 0 &&
    !!one.byKey.get(geometry.cellKey(1, 2)) && near(one.byKey.get(geometry.cellKey(1, 2)).cost, 1) &&
    !one.byKey.get(geometry.cellKey(3, 3)),
    'cells=' + (one ? j(one.cells.map(c => [c.col, c.row, c.cost])) : 'null')));

  // B. 墙体阻挡与绕行（col=5、row0-7 一段墙）
  const wallsB = [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7]];
  const sceneB = sceneOf(wallsB, 12, 12);
  const unitsB = [
    mkUnit('h1', 'hero', { spd: 200, moveDistance: 20 }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 30 }),
  ];
  const ctxB = makeCtx(m, sceneB, unitsB, { h1: { col: 3, row: 4, facing: 0 }, e1: { col: 10, row: 10, facing: 180 } });
  const reachB = movement.findReachable(ctxB, 'h1', Infinity);
  const farB = reachB && reachB.byKey ? reachB.byKey.get(geometry.cellKey(7, 4)) : null;
  cases.push(ok('TM-01 墙格不可达且墙后经绕行可达（成本>直穿）',
    !!reachB && !reachB.byKey.get(geometry.cellKey(5, 4)) &&
    !!farB && farB.cost > 9,
    'far=' + j(farB) + ' wallInCells=' + !!reachB.byKey.get(geometry.cellKey(5, 4))));
  const smallB = movement.findReachable(ctxB, 'h1', 6);
  cases.push(ok('TM-01 预算6内墙另侧不可达而近侧可达',
    !!smallB && !!smallB.byKey.get(geometry.cellKey(4, 4)) &&
    !smallB.byKey.get(geometry.cellKey(6, 4)) && !smallB.byKey.get(geometry.cellKey(5, 4)),
    'cells=' + (smallB ? smallB.cells.length : 'null')));

  // B2. 两实障夹角禁穿：对角直达被禁，落点只能绕行（成本显著高于直穿√2）
  const sceneB2 = sceneOf([[4, 3], [3, 4]], 8, 8);
  const unitsB2 = [
    mkUnit('h1', 'hero', { spd: 200, moveDistance: 20 }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 30 }),
  ];
  const ctxB2 = makeCtx(m, sceneB2, unitsB2, { h1: { col: 3, row: 3, facing: 0 }, e1: { col: 6, row: 6, facing: 180 } });
  const reachB2 = movement.findReachable(ctxB2, 'h1', Infinity);
  const cornerB2 = reachB2 && reachB2.byKey ? reachB2.byKey.get(geometry.cellKey(4, 4)) : null;
  cases.push(ok('TM-01 两实障夹角禁穿（对角落点仅可绕行，成本>3）',
    !!reachB2 && !reachB2.byKey.get(geometry.cellKey(4, 3)) && !reachB2.byKey.get(geometry.cellKey(3, 4)) &&
    !!cornerB2 && cornerB2.cost > 3 && cornerB2.cost < 5,
    'corner=' + j(cornerB2)));

  const giantScene = sceneOf([[4, 2], [2, 4]], 7, 7);
  const giant = mkUnit('g', 'hero', { fp: { width: 2, height: 2 } });
  const giantCtx = makeCtx(m, giantScene, [giant], { g: { col: 2, row: 2, facing: 0 } });
  const giantReach = movement.findReachable(giantCtx, 'g', Math.SQRT2);
  cases.push(ok('TM-01 2×2完整占地不能从两墙夹角斜穿',
    !giantReach.byKey.has(geometry.cellKey(3, 3)), '预算√2无对角落点'));

  // C. 友方可穿不可落位、敌方阻挡
  const unitsC = [
    mkUnit('h1', 'hero', { spd: 200, moveDistance: 9 }),
    mkUnit('a1', 'hero', { spd: 100 }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 30 }),
  ];
  const ctxC = makeCtx(m, open, unitsC, {
    h1: { col: 2, row: 2, facing: 0 }, a1: { col: 4, row: 2, facing: 0 }, e1: { col: 6, row: 2, facing: 180 },
  });
  const infC = movement.findReachable(ctxC, 'h1', Infinity);
  const midC = infC && infC.byKey ? infC.byKey.get(geometry.cellKey(5, 2)) : null;
  cases.push(ok('TM-01 友方格不可落位但可穿过（穿后格成本3）',
    !!infC && !infC.byKey.get(geometry.cellKey(4, 2)) && !!midC && near(midC.cost, 3),
    'mid=' + j(midC) + ' allyCellIn=' + !!infC.byKey.get(geometry.cellKey(4, 2))));
  cases.push(ok('TM-01 敌方格阻挡且敌后绕行超预算不可达、无限预算可达',
    !!infC && !infC.byKey.get(geometry.cellKey(6, 2)) &&
    !!infC.byKey.get(geometry.cellKey(7, 2)) && infC.byKey.get(geometry.cellKey(7, 2)).cost > 5 &&
    !movement.findReachable(ctxC, 'h1', 5).byKey.get(geometry.cellKey(7, 2)),
    'behindInf=' + j(infC.byKey.get(geometry.cellKey(7, 2)))));

  // D. 2×2 footprint 全路径容纳：落位不压墙/不压单位
  const unitsD = [
    mkUnit('g1', 'hero', { spd: 200, moveDistance: 4, fp: { width: 2, height: 2 } }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 30 }),
  ];
  const ctxD = makeCtx(m, open, unitsD, { g1: { col: 2, row: 2, facing: 0 }, e1: { col: 9, row: 9, facing: 180 } });
  const reachD = movement.findReachable(ctxD, 'g1', Infinity);
  const cellsD = reachD && Array.isArray(reachD.cells) ? reachD.cells : [];
  let fitAll = cellsD.length > 0;
  let hitEnemy = false;
  for (const c of cellsD) {
    for (const occ of geometry.occupiedCells(c, { width: 2, height: 2 })) {
      const cell = scene.cellAt(ctxD.compiled, occ.col, occ.row);
      if (!cell || cell.blocksMovement) fitAll = false;
      if (occ.col === 9 && occ.row === 9) hitEnemy = true;
    }
  }
  cases.push(ok('TM-01 2×2可达落位全部容纳且不压墙不压敌方',
    fitAll && !hitEnemy && hasCell(cellsD, 4, 2),
    'cells=' + cellsD.length + ' fitAll=' + fitAll + ' hitEnemy=' + hitEnemy));

  // E. battle 移动：预览/扣余额/余量移动/耗尽拒绝
  const unitsE = [
    mkUnit('h1', 'hero', { spd: 200, moveDistance: 3, mp: 10 }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 30 }),
  ];
  const b = battle.createBattle({ units: unitsE, placementsById: { h1: { col: 2, row: 2, facing: 0 }, e1: { col: 10, row: 8, facing: 180 } }, scene: open, random: rng(7) });
  const s0 = b.start();
  cases.push(ok('TM-01 首行动领取移动余额=moveDistance与1主1辅',
    s0.currentId === 'h1' && !!s0.resources && s0.resources.moveRemaining === 3 &&
    s0.resources.main === 1 && s0.resources.aux === 1 && near(s0.now, 50),
    'now=' + s0.now + ' res=' + j(s0.resources)));
  const pv = b.previewMove(3, 2);
  cases.push(ok('TM-01 previewMove可达返回格、超预算返回null',
    !!pv && pv.col === 3 && pv.row === 2 && near(pv.cost, 1) && b.previewMove(9, 9) === null,
    'pv=' + j(pv)));
  const mv = b.move(3, 2);
  const s1 = b.snapshot();
  cases.push(ok('TM-01 move成功扣余额1且落位',
    !!mv && mv.ok !== false && s1.resources.moveRemaining === 2 &&
    posOf(s1, 'h1') && posOf(s1, 'h1').col === 3 && posOf(s1, 'h1').row === 2,
    'mv=' + j({ ok: mv && mv.ok, reason: mv && mv.reason }) + ' res=' + j(s1.resources)));
  const pv5 = b.previewMove(5, 2); // 移动前：余量2内可达（成本2）
  const pv6 = b.previewMove(6, 2); // 移动前：成本3超出余量2
  const mv2 = b.move(5, 2);
  const s2 = b.snapshot();
  cases.push(ok('TM-01 余量移动扣减至0（预算累计口径）',
    !!pv5 && near(pv5.cost, 2) && pv6 === null &&
    !!mv2 && mv2.ok !== false && s2.resources.moveRemaining === 0 && posOf(s2, 'h1').col === 5,
    'pv5=' + j(pv5 && { col: pv5.col, cost: pv5.cost }) + ' pv6=' + j(pv6) +
    ' mv2=' + j({ ok: mv2 && mv2.ok }) + ' res=' + j(s2.resources)));
  const bad = b.move(6, 2);
  cases.push(ok('TM-01 余额耗尽后移动被拒并给reason',
    !!bad && bad.ok === false && !!bad.reason,
    'bad=' + j({ ok: bad && bad.ok, reason: bad && bad.reason })));

  return { cases };
}

// ---------- TM-02 范围：单体/直线/扇形/射程/墙挡传播/友方挡弹/预览=执行 ----------

async function tm02(m) {
  const { range, battle, scene, parser } = m;
  const cases = [];
  const fire = parser.parseSkill('【火舌】[MP:3][单体;power:12][范围:单体;射程:15]');
  const short = parser.parseSkill('【短刺】[MP:1][单体;power:5][范围:单体;射程:3]');
  const line = parser.parseSkill('【横扫】[MP:2][单体;power:10][范围:直线;长:5;宽:3]');
  const cone = parser.parseSkill('【扇击】[MP:2][单体;power:8][范围:扇形;射程:4;角度:90]');

  // A. 单体：射程内命中敌方、不含友方；射程外拒绝
  const open = sceneOf([], 14, 14);
  const unitsA = [
    mkUnit('m1', 'hero', { spd: 200 }),
    mkUnit('a1', 'hero', { spd: 100 }),
    mkUnit('e1', 'enemy', { hp: 30, def: 5 }),
    mkUnit('e2', 'enemy', { hp: 30 }),
  ];
  const ctxA = makeCtx(m, open, unitsA, {
    m1: { col: 3, row: 3, facing: 0 }, a1: { col: 3, row: 6, facing: 0 },
    e1: { col: 8, row: 3, facing: 180 }, e2: { col: 3, row: 10, facing: 180 },
  });
  const r1 = range.queryAttack(ctxA, 'm1', fire, aimAt(8, 3, 'e1'));
  cases.push(ok('TM-02 单体射程内命中敌且不含友方',
    !!r1 && r1.ok === true && (r1.targetIds || []).indexOf('e1') >= 0 &&
    (r1.targetIds || []).indexOf('a1') < 0 && Array.isArray(r1.cells) && r1.cells.length > 0,
    j({ ok: r1 && r1.ok, targets: r1 && r1.targetIds })));
  const r2 = range.queryAttack(ctxA, 'm1', short, aimAt(8, 3, 'e1'));
  cases.push(ok('TM-02 射程外拒绝且给reason',
    !!r2 && r2.ok === false && !!r2.reason,
    j({ ok: r2 && r2.ok, reason: r2 && r2.reason })));

  // B. 直线 长5宽3：远端含敌、近端含友格但友方不入目标、宽外/超长不含
  const unitsB = [
    mkUnit('m1', 'hero', { spd: 200 }),
    mkUnit('a1', 'hero', { spd: 100 }),
    mkUnit('e1', 'enemy', { hp: 30 }),
    mkUnit('e2', 'enemy', { hp: 30 }),
  ];
  const ctxB = makeCtx(m, open, unitsB, {
    m1: { col: 3, row: 3, facing: 0 }, a1: { col: 5, row: 3, facing: 0 },
    e1: { col: 8, row: 3, facing: 180 }, e2: { col: 8, row: 6, facing: 180 },
  });
  const r3 = range.queryAttack(ctxB, 'm1', line, aimAt(8, 3, 'e1'));
  cases.push(ok('TM-02 直线命中线上敌方、友方不受伤、宽外不含',
    !!r3 && r3.ok === true && (r3.targetIds || []).indexOf('e1') >= 0 &&
    (r3.targetIds || []).indexOf('a1') < 0 && (r3.targetIds || []).indexOf('e2') < 0,
    j({ ok: r3 && r3.ok, targets: r3 && r3.targetIds })));
  cases.push(ok('TM-02 直线cells含远端/线上/宽内、不含超长与宽外',
    !!r3 && hasCell(r3.cells, 8, 3) && hasCell(r3.cells, 5, 3) && hasCell(r3.cells, 8, 2) &&
    !hasCell(r3.cells, 9, 3) && !hasCell(r3.cells, 8, 6),
    'cells=' + (r3 ? r3.cells.length : 'null')));

  // C. 扇形 射程4角度90：锥内命中、侧后/身后不含
  const unitsC = [
    mkUnit('m1', 'hero', { spd: 200 }),
    mkUnit('e1', 'enemy', { hp: 30 }),
    mkUnit('e2', 'enemy', { hp: 30 }),
    mkUnit('e3', 'enemy', { hp: 30 }),
  ];
  const ctxC = makeCtx(m, open, unitsC, {
    m1: { col: 3, row: 3, facing: 0 },
    e1: { col: 6, row: 3, facing: 180 }, e2: { col: 3, row: 7, facing: 180 }, e3: { col: 1, row: 3, facing: 180 },
  });
  const r4 = range.queryAttack(ctxC, 'm1', cone, aimAt(6, 3, 'e1'));
  cases.push(ok('TM-02 扇形锥内命中敌、侧向与身后不含',
    !!r4 && r4.ok === true && (r4.targetIds || []).indexOf('e1') >= 0 &&
    (r4.targetIds || []).indexOf('e2') < 0 && (r4.targetIds || []).indexOf('e3') < 0 &&
    Array.isArray(r4.cells) && r4.cells.length > 0,
    j({ ok: r4 && r4.ok, targets: r4 && r4.targetIds })));

  // D. 实墙挡传播：墙在施法者与目标之间
  const sceneD = sceneOf([[6, 3]], 14, 14);
  const unitsD = [mkUnit('m1', 'hero', { spd: 200 }), mkUnit('e1', 'enemy', { hp: 30 })];
  const ctxD = makeCtx(m, sceneD, unitsD, { m1: { col: 3, row: 3, facing: 0 }, e1: { col: 8, row: 3, facing: 180 } });
  const r5 = range.queryAttack(ctxD, 'm1', fire, aimAt(8, 3, 'e1'));
  cases.push(ok('TM-02 实墙挡传播（目标不可选中）',
    !!r5 && r5.ok === false && !!r5.reason && (r5.targetIds || []).indexOf('e1') < 0,
    j({ ok: r5 && r5.ok, reason: r5 && r5.reason, blockedBy: r5 && r5.blockedBy })));

  // D2. 低障碍不挡直线传播（lowCounter blocksProjectile=false）
  const sceneL = sceneWith([{ id: 'lc1', kind: 'lowCounter', bounds: { col: 6, row: 3, width: 1, height: 1 } }], 14, 14);
  const unitsL = [mkUnit('m1', 'hero', { spd: 200 }), mkUnit('e1', 'enemy', { hp: 30 })];
  const ctxL = makeCtx(m, sceneL, unitsL, { m1: { col: 3, row: 3, facing: 0 }, e1: { col: 8, row: 3, facing: 180 } });
  const rL = range.queryAttack(ctxL, 'm1', line, aimAt(8, 3, 'e1'));
  cases.push(ok('TM-02 低障碍不挡直线（目标可选中且低障碍格在cells）',
    !!rL && rL.ok === true && (rL.targetIds || []).indexOf('e1') >= 0 &&
    hasCell(rL.cells, 6, 3) && hasCell(rL.cells, 8, 3),
    j({ ok: rL && rL.ok, targets: rL && rL.targetIds })));

  // D3. 低障碍不挡扇形传播
  const sceneL2 = sceneWith([{ id: 'lc2', kind: 'lowCounter', bounds: { col: 4, row: 3, width: 1, height: 1 } }], 14, 14);
  const unitsL2 = [mkUnit('m1', 'hero', { spd: 200 }), mkUnit('e1', 'enemy', { hp: 30 })];
  const ctxL2 = makeCtx(m, sceneL2, unitsL2, { m1: { col: 3, row: 3, facing: 0 }, e1: { col: 6, row: 3, facing: 180 } });
  const rL2 = range.queryAttack(ctxL2, 'm1', cone, aimAt(6, 3, 'e1'));
  cases.push(ok('TM-02 低障碍不挡扇形（锥内目标可选中）',
    !!rL2 && rL2.ok === true && (rL2.targetIds || []).indexOf('e1') >= 0 && hasCell(rL2.cells, 4, 3),
    j({ ok: rL2 && rL2.ok, targets: rL2 && rL2.targetIds })));

  // E. 单体站立角色挡弹：友方在弹道上截断且友方不受伤
  const unitsE = [
    mkUnit('m1', 'hero', { spd: 200 }),
    mkUnit('a1', 'hero', { spd: 100 }),
    mkUnit('e1', 'enemy', { hp: 30 }),
  ];
  const ctxE = makeCtx(m, open, unitsE, {
    m1: { col: 3, row: 3, facing: 0 }, a1: { col: 5, row: 3, facing: 0 }, e1: { col: 8, row: 3, facing: 180 },
  });
  const r6 = range.queryAttack(ctxE, 'm1', fire, aimAt(8, 3, 'e1'));
  cases.push(ok('TM-02 友方挡弹截断目标且友方不入目标',
    !!r6 && r6.ok === false && (r6.targetIds || []).indexOf('e1') < 0 &&
    (r6.targetIds || []).indexOf('a1') < 0,
    j({ ok: r6 && r6.ok, reason: r6 && r6.reason, blockedBy: r6 && r6.blockedBy })));

  // F. 预览=执行：previewAttack 与 attack.query 一致且伤害按护甲落地
  const unitsF = [
    mkUnit('h1', 'hero', { spd: 200, mp: 10 }),
    mkUnit('e1', 'enemy', { hp: 30, def: 5, spd: 100 }),
  ];
  const b = battle.createBattle({ units: unitsF, placementsById: { h1: { col: 3, row: 3, facing: 0 }, e1: { col: 8, row: 3, facing: 180 } }, scene: open, random: () => 0.5 });
  b.start();
  const aim = aimAt(8, 3, 'e1');
  const pq = b.previewAttack(fire, aim);
  const ar = b.attack(fire, aim);
  const q = ar && ar.query ? ar.query : null;
  cases.push(ok('TM-02 预览与执行查询一致且伤害按护甲落地',
    !!pq && !!ar && ar.ok !== false && !!q &&
    pq.ok === q.ok &&
    (pq.targetIds || []).slice().sort().join() === (q.targetIds || []).slice().sort().join() &&
    (pq.cells || []).length === (q.cells || []).length &&
    hpOf(b.snapshot(), 'e1') === 23,
    'pq=' + j({ ok: pq && pq.ok, t: pq && pq.targetIds }) + ' ar=' + j({ ok: ar && ar.ok, hits: ar && (ar.hits || []).length })));

  return { cases };
}

// ---------- TM-03 伤害：双骰命闪/平骰命中/护甲/atk兜底/溢出截断 ----------

async function tm03(m) {
  const { damage, parser } = m;
  const cases = [];
  const fire = parser.parseSkill('【火舌】[MP:3][单体;power:12][范围:单体;射程:15]');
  const basic = parser.parseSkill('[单体;power:0]');
  const ref = o => Object.assign(
    { hp: 50, maxHp: 50, mp: 10, maxMp: 10, atk: 10, def: 0, spd: 100, evasion: 0, moveDistance: 3 }, o || {});

  const hitFlat = damage.resolveHit(ref({}), ref({ evasion: 50 }), fire, () => 0);
  cases.push(ok('TM-03 平骰命中（attackRoll=dodgeRoll=1）',
    !!hitFlat && hitFlat.hit === true && hitFlat.attackRoll === 1 && hitFlat.dodgeRoll === 1,
    j(hitFlat)));

  const dodged = damage.resolveHit(ref({}), ref({ evasion: 300 }), fire, () => 0.999);
  cases.push(ok('TM-03 高闪避使攻击骰落败（闪避独立读evasion）',
    !!dodged && dodged.hit === false && dodged.attackRoll === 100 && dodged.dodgeRoll === 300,
    j(dodged)));

  const withBonus = damage.resolveHit(ref({ hitBonus: 100 }), ref({ evasion: 150 }), fire, () => 0.999);
  const noBonus = damage.resolveHit(ref({}), ref({ evasion: 150 }), fire, () => 0.999);
  cases.push(ok('TM-03 hitBonus扩命中上限救回高闪目标',
    !!withBonus && withBonus.hit === true && !!noBonus && noBonus.hit === false,
    'bonus=' + j(withBonus) + ' none=' + j(noBonus)));

  const d1 = damage.calculateDamage(12, ref({ def: 5 }));
  const d2 = damage.calculateDamage(12, ref({ def: 20 }));
  const d3 = damage.calculateDamage(0, ref({ def: 0 }));
  const hpKeep = ref({ def: 5 });
  damage.calculateDamage(12, hpKeep);
  cases.push(ok('TM-03 护甲减伤下限1、零伤为0、不改hp且shieldDmg=0',
    d1.hpDmg === 7 && d2.hpDmg === 1 && d3.hpDmg === 0 &&
    d1.shieldDmg === 0 && hpKeep.hp === 50,
    j({ d1: d1, d2: d2, d3: d3 })));

  const targetHit = ref({ def: 5 });
  const applied = damage.applyAttackDamage(ref({}), targetHit, fire, () => 0);
  cases.push(ok('TM-03 命中扣血=power-护甲（12-5=7）',
    !!applied && applied.hit === true && applied.hpDmg === 7 && targetHit.hp === 43,
    j(applied)));

  const targetAtk = ref({ def: 5, hp: 100, maxHp: 100 });
  const viaAtk = damage.applyAttackDamage(ref({ atk: 30, hp: 100, maxHp: 100 }), targetAtk, basic, () => 0);
  cases.push(ok('TM-03 power=0走caster.atk（30-5=25）',
    !!viaAtk && viaAtk.hit === true && viaAtk.hpDmg === 25 && targetAtk.hp === 75,
    j(viaAtk)));

  const targetMiss = ref({ evasion: 300 });
  const missed = damage.applyAttackDamage(ref({}), targetMiss, fire, () => 0.999);
  cases.push(ok('TM-03 未命中不扣血',
    !!missed && missed.hit === false && missed.hpDmg === 0 && targetMiss.hp === 50,
    j(missed)));

  const targetLow = ref({ hp: 5, def: 0 });
  const overkill = damage.applyAttackDamage(ref({}), targetLow, fire, () => 0);
  cases.push(ok('TM-03 溢出伤害按剩余HP截断（hp归零）',
    !!overkill && overkill.hpDmg === 5 && targetLow.hp === 0,
    j(overkill)));

  return { cases };
}

// ---------- TM-04 余额与时钟：领取/扣减/start幂等/推进一位/不自动跑AI/MP不足 ----------

async function tm04(m) {
  const { battle, scene, parser } = m;
  const cases = [];
  const fire = parser.parseSkill('【火舌】[MP:3][单体;power:12][范围:单体;射程:15]');
  const open = sceneOf([], 12, 12);

  const units = [
    mkUnit('h1', 'hero', { spd: 200, mp: 10, moveDistance: 3 }),
    mkUnit('e1', 'enemy', { spd: 150, hp: 30, def: 5, moveDistance: 3 }),
  ];
  const placements = { h1: { col: 2, row: 2, facing: 0 }, e1: { col: 7, row: 2, facing: 180 } };
  const b = battle.createBattle({ units: units, placementsById: placements, scene: open, random: () => 0.5 });
  const aim = aimAt(7, 2, 'e1');

  const s0 = b.start();
  cases.push(ok('TM-04 首行动领取余额（移动3/主1/辅1）且速度200首行动t=50',
    s0.currentId === 'h1' && !!s0.resources && s0.resources.moveRemaining === 3 &&
    s0.resources.main === 1 && s0.resources.aux === 1 && near(s0.now, 50),
    'now=' + s0.now + ' res=' + j(s0.resources)));

  const mv = b.move(3, 2);
  const s1 = b.snapshot();
  cases.push(ok('TM-04 移动只扣移动余额不扣主辅',
    !!mv && mv.ok !== false && s1.resources.moveRemaining === 2 &&
    s1.resources.main === 1 && s1.resources.aux === 1 && posOf(s1, 'h1').col === 3,
    'res=' + j(s1.resources)));

  const at = b.attack(fire, aim);
  const s2 = b.snapshot();
  cases.push(ok('TM-04 攻击付1主与MP3且敌方按护甲扣血',
    !!at && at.ok !== false && s2.resources.main === 0 && s2.resources.aux === 1 &&
    s2.resources.moveRemaining === 2 && mpOf(s2, 'h1') === 7 && hpOf(s2, 'e1') === 23,
    'at=' + j({ ok: at && at.ok, reason: at && at.reason }) + ' res=' + j(s2.resources)));

  const sAgain = b.start();
  cases.push(ok('TM-04 同一行动内重复start幂等（余额不重发）',
    sAgain.currentId === 'h1' && !!sAgain.resources && sAgain.resources.main === 0 &&
    sAgain.resources.moveRemaining === 2 && mpOf(sAgain, 'h1') === 7 && near(sAgain.now, s2.now),
    'res=' + j(sAgain.resources) + ' now=' + sAgain.now));

  // 恢复：battleState 克隆重建 controller（同 units/positions），余额保留已扣减值（HP真值在ref不随档）
  const unitsR = [
    mkUnit('h1', 'hero', { spd: 200, mp: 10, moveDistance: 3 }),
    mkUnit('e1', 'enemy', { spd: 150, hp: 30, def: 5, moveDistance: 3 }),
  ];
  const bR = battle.createBattle({
    units: unitsR,
    placementsById: { h1: { col: 3, row: 2, facing: 0 }, e1: { col: 7, row: 2, facing: 180 } },
    scene: open,
    battleState: structuredClone(b.battleState),
    random: rng(23),
  });
  const sR = bR.start();
  cases.push(ok('TM-04 battleState克隆恢复保留已扣余额（main=0且移动余额不变）',
    sR.currentId === 'h1' && !!sR.resources && sR.resources.main === 0 &&
    sR.resources.moveRemaining === 2 && sR.resources.aux === 1 && near(sR.now, s2.now),
    'res=' + j(sR.resources) + ' now=' + sR.now + ' cur=' + sR.currentId));

  const at2 = b.attack(fire, aim);
  const s3 = b.snapshot();
  cases.push(ok('TM-04 主行动已用再攻击被拒且不重复扣费',
    !!at2 && at2.ok === false && !!at2.reason &&
    hpOf(s3, 'e1') === 23 && mpOf(s3, 'h1') === 7,
    'at2=' + j({ ok: at2 && at2.ok, reason: at2 && at2.reason })));

  const mv2 = b.move(4, 2);
  const s4 = b.snapshot();
  cases.push(ok('TM-04 可移动—攻击—余量移动组合',
    !!mv2 && mv2.ok !== false && s4.resources.moveRemaining === 1 && posOf(s4, 'h1').col === 4,
    'res=' + j(s4.resources)));

  const end = b.endAction();
  cases.push(ok('TM-04 endAction仅推进一位且不自动跑AI（敌方余额全新、未行动）',
    !!end && end.currentId === 'e1' && near(end.now, 10000 / 150) &&
    hpOf(end, 'e1') === 23 && posOf(end, 'e1').col === 7 &&
    !!end.resources && end.resources.main === 1 && end.resources.moveRemaining === 3,
    'now=' + (end && end.now) + ' cur=' + (end && end.currentId) + ' res=' + j(end && end.resources)));

  const end2 = b.endAction();
  cases.push(ok('TM-04 再推进回到我方且时钟继续计息（t=100）',
    !!end2 && end2.currentId === 'h1' && near(end2.now, 100),
    'now=' + (end2 && end2.now) + ' cur=' + (end2 && end2.currentId)));

  // MP不足：拒绝且不扣费
  const units2 = [
    mkUnit('h1', 'hero', { spd: 200, mp: 2 }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 30, def: 5 }),
  ];
  const b2 = battle.createBattle({ units: units2, placementsById: placements, scene: open, random: rng(29) });
  b2.start();
  const atMp = b2.attack(fire, aim);
  const sMp = b2.snapshot();
  cases.push(ok('TM-04 MP不足拒绝声明且不扣MP不扣敌血',
    !!atMp && atMp.ok === false && !!atMp.reason && mpOf(sMp, 'h1') === 2 && hpOf(sMp, 'e1') === 30,
    'at=' + j({ ok: atMp && atMp.ok, reason: atMp && atMp.reason })));

  return { cases };
}

// ---------- TM-05 AI：近战接近攻击/够不到只接近/远程原地/封死无法行动 ----------

async function tm05(m) {
  const { ai, range, battle, scene, parser } = m;
  const cases = [];
  const claw = parser.parseSkill('【爪击】[单体;power:8][范围:单体;射程:1]');
  const fire = parser.parseSkill('【火舌】[MP:3][单体;power:12][范围:单体;射程:15]');
  const open = sceneOf([], 14, 14);
  const heroPos = { col: 3, row: 3, facing: 0 };

  // A. 近战够得着：接近到攻击位后攻击（直连查询 + 战斗全链路）
  const unitsA = [
    mkUnit('h1', 'hero', { spd: 50, hp: 20, def: 2, evasion: 0, moveDistance: 3 }),
    mkUnit('e1', 'enemy', { spd: 60, hp: 20, moveDistance: 6, skills: [claw] }),
  ];
  const placeA = { h1: heroPos, e1: { col: 10, row: 3, facing: 180 } };
  const plan = ai.chooseEnemyAction(makeCtx(m, open, unitsA, placeA), 'e1', 6, [claw]);
  cases.push(ok('TM-05 近战AI moveTo攻击位（距英雄1格）并声明爪击',
    !!plan && !!plan.moveTo && plan.moveTo.col === 4 && plan.moveTo.row === 3 &&
    !!plan.skill && !!plan.aim &&
    (plan.aim.targetId === 'h1' || (plan.aim.x === 3.5 && plan.aim.y === 3.5)),
    j(plan)));
  const movedCtx = makeCtx(m, open, unitsA, Object.assign({}, placeA, { e1: { col: 4, row: 3, facing: 180 } }));
  const combo = range.queryAttack(movedCtx, 'e1', claw, aimAt(3, 3, 'h1'));
  cases.push(ok('TM-05 AI落位与真实查询可组合（攻击位命中合法）',
    !!combo && combo.ok === true && (combo.targetIds || []).indexOf('h1') >= 0,
    j({ ok: combo && combo.ok, targets: combo && combo.targetIds })));
  const b = battle.createBattle({ units: unitsA, placementsById: placeA, scene: open, random: () => 0.5 });
  b.start();
  const es = b.runEnemyTurn();
  cases.push(ok('TM-05 runEnemyTurn按实际伤害选择普攻并用余量接近',
    !!es && hpOf(es, 'h1') === 12 && es.currentId === 'h1' && near(es.now, 200) &&
    posOf(es, 'e1') && posOf(es, 'e1').col === 4 && posOf(es, 'e1').row === 3,
    'hp=' + hpOf(es, 'h1') + ' cur=' + (es && es.currentId) + ' now=' + (es && es.now) +
    ' pos=' + j(posOf(es, 'e1'))));

  // B. 近战够不着：沿路径在额度内接近、不攻击、我方不受伤
  const unitsB = [
    mkUnit('h1', 'hero', { spd: 50, hp: 20, def: 2, evasion: 0 }),
    mkUnit('e1', 'enemy', { spd: 60, hp: 20, moveDistance: 2, skills: [claw] }),
  ];
  const placeB = { h1: heroPos, e1: { col: 10, row: 3, facing: 180 } };
  const planB = ai.chooseEnemyAction(makeCtx(m, open, unitsB, placeB), 'e1', 2, [claw]);
  cases.push(ok('TM-05 预算不够接近到射程时只前进不攻击（skill空）',
    !!planB && !planB.skill && !!planB.moveTo &&
    planB.moveTo.col === 8 && planB.moveTo.row === 3,
    j(planB)));
  const b2 = battle.createBattle({ units: unitsB, placementsById: placeB, scene: open, random: rng(37) });
  b2.start();
  const es2 = b2.runEnemyTurn();
  cases.push(ok('TM-05 够不着时runEnemyTurn不造成伤害且照常推进',
    !!es2 && hpOf(es2, 'h1') === 20 && es2.currentId === 'h1' && near(es2.now, 200),
    'hp=' + hpOf(es2, 'h1') + ' pos=' + j(posOf(es2, 'e1'))));

  // C. 远程已在射程：原地攻击不移动
  const unitsC = [
    mkUnit('h1', 'hero', { spd: 50, hp: 20, def: 2, evasion: 0 }),
    mkUnit('e2', 'enemy', { spd: 60, hp: 20, moveDistance: 4, mp: 10, skills: [fire] }),
  ];
  const placeC = { h1: heroPos, e2: { col: 10, row: 3, facing: 180 } };
  const planC = ai.chooseEnemyAction(makeCtx(m, open, unitsC, placeC), 'e2', 4, [fire]);
  cases.push(ok('TM-05 远程在射程内原地攻击（moveTo空、瞄准英雄）',
    !!planC && !planC.moveTo && !!planC.skill &&
    !!planC.aim && (planC.aim.targetId === 'h1' || (planC.aim.x === 3.5 && planC.aim.y === 3.5)),
    j(planC)));
  const b3 = battle.createBattle({ units: unitsC, placementsById: placeC, scene: open, random: () => 0.5 });
  b3.start();
  const es3 = b3.runEnemyTurn();
  cases.push(ok('TM-05 远程攻击后可用余量接近且仅扣一次技能费用',
    !!es3 && hpOf(es3, 'h1') === 10 && posOf(es3, 'e2') &&
    posOf(es3, 'e2').col === 6 && posOf(es3, 'e2').row === 3 &&
    es3.currentId === 'h1' && near(es3.now, 200),
    'hp=' + hpOf(es3, 'h1') + ' pos=' + j(posOf(es3, 'e2'))));

  // D. 封死无法行动：不移动不攻击、照常结束推进
  const sealed = sceneOf([[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3], [3, 3]], 8, 8);
  const unitsD = [
    mkUnit('h1', 'hero', { spd: 50, hp: 20, def: 2, evasion: 0 }),
    mkUnit('e1', 'enemy', { spd: 60, hp: 20, moveDistance: 6, skills: [claw] }),
  ];
  const placeD = { h1: { col: 6, row: 2, facing: 180 }, e1: { col: 2, row: 2, facing: 180 } };
  const planD = ai.chooseEnemyAction(makeCtx(m, sealed, unitsD, placeD), 'e1', 6, [claw]);
  cases.push(ok('TM-05 封死敌人无法行动（moveTo与skill皆空）',
    !!planD && !planD.moveTo && !planD.skill,
    j(planD)));
  const b4 = battle.createBattle({ units: unitsD, placementsById: placeD, scene: sealed, random: rng(43) });
  b4.start();
  const es4 = b4.runEnemyTurn();
  cases.push(ok('TM-05 无法行动时runEnemyTurn结束行动且不产生伤害',
    !!es4 && es4.currentId === 'h1' && near(es4.now, 200) &&
    hpOf(es4, 'h1') === 20 && posOf(es4, 'e1') &&
    posOf(es4, 'e1').col === 2 && posOf(es4, 'e1').row === 2,
    'cur=' + (es4 && es4.currentId) + ' hp=' + hpOf(es4, 'h1')));

  return { cases };
}

// ---------- TM-06 胜负与重开：击杀判胜/我全倒判败/终局停止推进/重置还原 ----------

async function tm06(m) {
  const { battle, scene, parser } = m;
  const cases = [];
  const fire = parser.parseSkill('【火舌】[MP:3][单体;power:12][范围:单体;射程:15]');
  const poke = parser.parseSkill('【戳刺】[MP:1][单体;power:2][范围:单体;射程:15]');
  const claw = parser.parseSkill('【爪击】[单体;power:8][范围:单体;射程:1]');
  const open = sceneOf([], 12, 12);
  const aim = aimAt(7, 3, 'e1');

  // A. 击杀敌方最后一人 → 胜利终局并停止推进
  const unitsA = [
    mkUnit('h1', 'hero', { spd: 200, mp: 10, skills: [fire] }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 5, def: 0 }),
  ];
  const placeA = { h1: { col: 3, row: 3, facing: 0 }, e1: { col: 7, row: 3, facing: 180 } };
  const b = battle.createBattle({ units: unitsA, placementsById: placeA, scene: open, random: rng(47) });
  b.start();
  const atk = b.attack(fire, aim);
  const sv1 = b.snapshot();
  let sv2 = null;
  let err2 = null;
  if (sv1 && sv1.terminal) {
    sv2 = sv1;
  } else {
    try { sv2 = b.endAction(); } catch (e) { err2 = e; }
  }
  cases.push(ok('TM-06 敌全灭后出现胜利终局（victory）',
    !!atk && atk.ok !== false && hpOf(sv1, 'e1') === 0 &&
    !!sv2 && !!sv2.terminal && sv2.terminal.type === 'victory',
    'e1hp=' + hpOf(sv1, 'e1') + ' terminal=' + j(sv2 && sv2.terminal) + ' err=' + (err2 ? String(err2.message || err2) : '')));
  let again = null;
  let errA = null;
  try { again = b.endAction(); } catch (e) { errA = e; }
  cases.push(ok('TM-06 终局后停止推进（时间与行动权冻结）',
    !!sv2 && !!sv2.terminal && !!again && !!again.terminal &&
    near(again.now, sv2.now) && again.currentId === sv2.currentId,
    'againNow=' + (again && again.now) + ' err=' + (errA ? String(errA.message || errA) : '')));

  // B. 我方全倒 → 失败终局
  const unitsB = [
    mkUnit('h1', 'hero', { spd: 200, hp: 5, def: 0, evasion: 0, mp: 10, skills: [poke] }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 30, moveDistance: 6, skills: [claw] }),
  ];
  const b2 = battle.createBattle({ units: unitsB, placementsById: placeA, scene: open, random: rng(53) });
  b2.start();
  b2.attack(poke, aim);
  b2.endAction(); // t=100同刻：h1(200速)第二圈先于e1(100速)首圈取得行动
  b2.endAction(); // h1行动结束后e1取得t=100行动权
  const esB = b2.runEnemyTurn();
  let svB = esB;
  let errB = null;
  if (!esB || !esB.terminal) {
    try { svB = b2.endAction(); } catch (e) { errB = e; }
  }
  cases.push(ok('TM-06 我方全倒出现失败终局（defeat、无救援复活）',
    !!esB && hpOf(esB, 'h1') === 0 && !!svB && !!svB.terminal && svB.terminal.type === 'defeat',
    'h1hp=' + hpOf(esB, 'h1') + ' terminal=' + j(svB && svB.terminal) + ' err=' + (errB ? String(errB.message || errB) : '')));

  // C. 重开：恢复开场位置/HP/MP/时钟/余额/日志，并可重新行动
  const unitsC = [
    mkUnit('h1', 'hero', { spd: 200, mp: 10, moveDistance: 3, skills: [fire] }),
    mkUnit('e1', 'enemy', { spd: 100, hp: 5, def: 0 }),
  ];
  const placeC = { h1: { col: 3, row: 3, facing: 0 }, e1: { col: 7, row: 3, facing: 180 } }; // 独立占位：battle 会原地改写 placementsById，不与A/B共用
  const b3 = battle.createBattle({ units: unitsC, placementsById: placeC, scene: open, random: rng(59) });
  const sA0 = b3.start();
  b3.move(3, 2);
  b3.attack(fire, aim);
  const svPre = b3.snapshot();
  const rs = b3.reset();
  cases.push(ok('TM-06 重置恢复位置/HP/MP/余额/时钟/日志并清除终局',
    !!rs && !rs.terminal && rs.currentId === 'h1' &&
    posOf(rs, 'h1') && posOf(rs, 'h1').col === 3 && posOf(rs, 'h1').row === 3 &&
    posOf(rs, 'e1') && posOf(rs, 'e1').col === 7 && posOf(rs, 'e1').row === 3 &&
    hpOf(rs, 'h1') === 20 && mpOf(rs, 'h1') === 10 && hpOf(rs, 'e1') === 5 &&
    !!rs.resources && rs.resources.moveRemaining === 3 && rs.resources.main === 1 && rs.resources.aux === 1 &&
    Array.isArray(rs.log) && rs.log.length === sA0.log.length && near(rs.now, sA0.now),
    'pre=' + j({ pos: posOf(svPre, 'h1'), e1hp: hpOf(svPre, 'e1') }) +
    ' rs=' + j({ cur: rs && rs.currentId, now: rs && rs.now, res: rs && rs.resources, log: rs && rs.log && rs.log.length })));
  const mvR = b3.move(3, 2);
  const sR = b3.snapshot();
  cases.push(ok('TM-06 重开后可重新行动（移动扣余额且落位）',
    !!mvR && mvR.ok !== false && sR.resources.moveRemaining === 2 &&
    posOf(sR, 'h1') && posOf(sR, 'h1').col === 3 && posOf(sR, 'h1').row === 2,
    'mv=' + j({ ok: mvR && mvR.ok }) + ' res=' + j(sR.resources)));

  return { cases };
}

export const groups = {
  'TM-01': { run: deps => runGroup('TM-01', deps, ['movement', 'battle', 'scene', 'geometry'], tm01) },
  'TM-02': { run: deps => runGroup('TM-02', deps, ['range', 'battle', 'scene', 'parser'], tm02) },
  'TM-03': { run: deps => runGroup('TM-03', deps, ['damage', 'parser'], tm03) },
  'TM-04': { run: deps => runGroup('TM-04', deps, ['battle', 'scene', 'parser'], tm04) },
  'TM-05': { run: deps => runGroup('TM-05', deps, ['ai', 'range', 'battle', 'scene', 'parser'], tm05) },
  'TM-06': { run: deps => runGroup('TM-06', deps, ['battle', 'scene', 'parser'], tm06) },
};
