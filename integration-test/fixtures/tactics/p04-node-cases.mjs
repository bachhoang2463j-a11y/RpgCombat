// ==========================================
// P04 位移/推动/背负用例（真实规则模块，固定骰序）
// ==========================================

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
function rng(values) { let i = 0; return () => values[i++] ?? 0; }
function room(objects = [], columns = 14, rows = 12) {
  return { sceneId: 'p04', grid: { columns, rows, metersPerCell: 1 }, ground: { material: 'brick' }, objects };
}
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 30;
  return { id, name: id, side, footprint: opts.footprint || { width: 1, height: 1 }, skills: [], ref: {
    hp, maxHp: hp, mp: 10, maxMp: 10, atk: 10, def: opts.def || 0, shield: opts.shield || 0,
    spd: opts.spd ?? 100, evasion: 0, strength: opts.strength ?? 50,
    totalWeight: opts.totalWeight ?? 40, moveDistance: opts.moveDistance ?? 6,
  } };
}
function createBattle(m, units, placements, map, random) {
  return m.battle.createBattle({ units, placementsById: placements, scene: map, random: random || (() => 0) });
}

async function p04(m) {
  const { battle } = m;
  const cases = [];
  const low = { id: 'low', kind: 'lowCounter', bounds: { col: 3, row: 2, width: 1, height: 1 } };
  const wall = { id: 'wall', kind: 'wall', bounds: { col: 5, row: 2, width: 1, height: 1 } };
  const map = room([low]);
  const h = unit('h', 'hero', { spd: 200, strength: 40, moveDistance: 6 });
  const e = unit('e', 'enemy', { hp: 100, spd: 100, strength: 20, totalWeight: 30 });
  const b = createBattle(m, [h, e], { h: { col: 2, row: 2 }, e: { col: 7, row: 2 } }, map);
  b.start();
  const lowJump = b.previewJump(4, 2);
  const hw = unit('hw', 'hero', { spd: 200, strength: 40, moveDistance: 6 });
  const ew = unit('ew', 'enemy', { hp: 100, spd: 100, strength: 20, totalWeight: 30 });
  const bw = createBattle(m, [hw, ew], { hw: { col: 3, row: 2 }, ew: { col: 7, row: 2 } }, room([wall]));
  bw.start();
  const wallJump = bw.previewJump(5, 2);
  cases.push(ok('T04-01 跳距=ceil(基础移动/3)=2m，可越低障不可越实墙',
    lowJump.ok && lowJump.distance === 2 && !wallJump.ok && wallJump.reason.includes('实墙'),
    JSON.stringify({ lowJump, wallJump })));
  const beforeSprint = b.snapshot().resources;
  const sprint = b.sprint();
  const afterSprint = b.snapshot().resources;
  cases.push(ok('T04-02 冲刺消耗1主行动并追加1份基础移动额度',
    sprint.ok && afterSprint.main === beforeSprint.main - 1 && afterSprint.sprintRemaining === 6 && afterSprint.moveRemaining === 12,
    JSON.stringify({ beforeSprint, afterSprint })));

  const pushMap = room([{ id: 'block', kind: 'wall', bounds: { col: 6, row: 2, width: 1, height: 1 } }]);
  const pusher = unit('p', 'hero', { strength: 40, totalWeight: 40 });
  const pushed = unit('q', 'enemy', { hp: 100, strength: 1, totalWeight: 50, def: 20, shield: 10 });
  const bp = createBattle(m, [pusher, pushed], { p: { col: 3, row: 2 }, q: { col: 4, row: 2 } }, pushMap, rng([0.99, 0]));
  bp.start();
  const pushedResult = bp.push('q');
  const pSnap = bp.snapshot();
  cases.push(ok('T04-03 力量40推动重量50距离2m，实墙阻挡并按剩余距离结算碰撞',
    pushedResult.ok && pushedResult.success && pushedResult.requestedDistance === 2 && pushedResult.movedDistance === 1 &&
    pushedResult.collision.rawDmg === 10 && pushedResult.collision.mitigated === 1 && pushed.ref.hp === 100 && pushed.ref.shield === 9 &&
    pSnap.resources.aux === 0 && pSnap.positions.q.col === 5,
    JSON.stringify({ pushedResult, resources: pSnap.resources, hp: pushed.ref.hp, shield: pushed.ref.shield })));

  const collisionTarget = unit('collision', 'enemy', { hp: 10, def: 5, shield: 3 });
  collisionTarget.ref.shield = 3;
  const collision = m.damage.applyCollisionDamage(10, collisionTarget.ref);
  cases.push(ok('T04-06 碰撞伤害按护甲、护盾、HP顺序结算且不掷命闪',
    collision.rawDmg === 10 && collision.mitigated === 5 && collision.shieldDmg === 3 &&
    collision.hpDmg === 2 && collisionTarget.ref.hp === 8 && collisionTarget.ref.shield === 0,
    JSON.stringify({ collision, hp: collisionTarget.ref.hp, shield: collisionTarget.ref.shield })));

  const failTarget = unit('f', 'enemy', { hp: 30, strength: 40, totalWeight: 60 });
  const bf = createBattle(m, [unit('p', 'hero', { hp: 30, spd: 200, strength: 40 }), failTarget, unit('e2', 'enemy', { hp: 30, spd: 50 })], { p: { col: 2, row: 2 }, f: { col: 3, row: 2 }, e2: { col: 10, row: 8 } }, room());
  bf.start();
  const failedPush = bf.push('f');
  cases.push(ok('T04-04 推动重量等于力量×1.5失败但消耗辅助行动',
    failedPush.ok && !failedPush.success && bf.snapshot().resources.aux === 0 && bf.snapshot().positions.f.col === 3,
    JSON.stringify(failedPush)));

  const carrier = unit('c', 'hero', { hp: 30, strength: 50, totalWeight: 40 });
  const down = unit('d', 'hero', { hp: 0, strength: 20, totalWeight: 20 });
  const bc = createBattle(m, [carrier, down, unit('e', 'enemy', { hp: 30 })], { c: { col: 3, row: 3 }, d: { col: 4, row: 3 }, e: { col: 10, row: 8 } }, room());
  bc.start();
  const carried = bc.carry('d');
  const carriedSnap = bc.snapshot();
  const canPlaceThroughCarried = m.movement.canPlaceAt(bc.ctx, 'c', 4, 3).ok;
  const dropped = bc.drop();
  const droppedSnap = bc.snapshot();
  cases.push(ok('T04-05 背起消耗主行动、清占位；合法放下免费并从零恢复行动资格',
    carried.ok && carriedSnap.resources.main === 0 && canPlaceThroughCarried && dropped.ok &&
    droppedSnap.resources.aux === 1 && bc.battleState.combatState.clock.units.d.status === 'active' &&
    droppedSnap.positions.d.col === 3 && droppedSnap.positions.d.row === 4,
    JSON.stringify({ carried, carrying: carriedSnap.carrying, dropped, pos: droppedSnap.positions.d, status: bc.battleState.combatState.clock.units.d.status, resources: droppedSnap.resources, canPlaceThroughCarried })));

  const mover = unit('m', 'hero', { hp: 30, moveDistance: 6, strength: 100, totalWeight: 20 });
  const downAlly = unit('fallen', 'hero', { hp: 0, totalWeight: 20 });
  const bm = createBattle(m, [mover, downAlly, unit('foe', 'enemy', { hp: 30, spd: 50 })],
    { m: { col: 2, row: 2 }, fallen: { col: 3, row: 2 }, foe: { col: 10, row: 8 } }, room());
  bm.start();
  const beforeCarryMove = bm.snapshot().resources.moveRemaining;
  const carryMove = bm.carry('fallen');
  const reachableWhileCarrying = bm.reachable().byKey.get('4,2');
  const movedWhileCarrying = bm.move(4, 2);
  cases.push(ok('T04-07 背负移动每米消耗2米额度且可达域按同倍率收缩',
    carryMove.ok && reachableWhileCarrying?.cost === 4 && movedWhileCarrying.ok &&
    movedWhileCarrying.cell.cost === 4 && bm.snapshot().resources.moveRemaining === beforeCarryMove - 4,
    JSON.stringify({ reachable: reachableWhileCarrying, move: movedWhileCarrying, resources: bm.snapshot().resources })));

  const invalidJump = bm.previewJump(20, 20);
  cases.push(ok('T04-08 越界落点拒绝且不消耗行动与移动额度',
    !invalidJump.ok && bm.snapshot().resources.main === 0 && bm.snapshot().resources.aux === 1 &&
    bm.snapshot().resources.moveRemaining === beforeCarryMove - 4,
    JSON.stringify({ invalidJump, resources: bm.snapshot().resources })));

  return { cases };
}

export const groups = { 'T04-01': { run: deps => p04(deps.modules) } };
