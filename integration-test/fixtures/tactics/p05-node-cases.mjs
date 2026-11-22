// ==========================================
// P05 确定性地图与语义布阵测试（真实 scene / generation 模块）
// ==========================================

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
function unit(id, side, footprint = { width: 1, height: 1 }) {
  return { id, side, footprint, ref: { hp: 10, maxHp: 10 }, skills: [], items: [] };
}
function wallEnclosedRoom(sceneId = 'trap') {
  const objects = [];
  for (let col = 2; col <= 8; col++) {
    objects.push({ id: 'n' + col, kind: 'wall', bounds: { col, row: 2, width: 1, height: 1 } });
    objects.push({ id: 's' + col, kind: 'wall', bounds: { col, row: 8, width: 1, height: 1 } });
  }
  for (let row = 3; row <= 7; row++) {
    objects.push({ id: 'w' + row, kind: 'wall', bounds: { col: 2, row, width: 1, height: 1 } });
    objects.push({ id: 'e' + row, kind: 'wall', bounds: { col: 8, row, width: 1, height: 1 } });
  }
  objects.push({ id: 'exit-door', kind: 'door', bounds: { col: 5, row: 2, width: 1, height: 1 }, open: false });
  const scene = { sceneId, grid: { columns: 12, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects,
    regions: [{ id: 'cell', bounds: { col: 3, row: 3, width: 5, height: 5 } }], landmarks: [] };
  return scene;
}

async function p05(m) {
  const { generation, scene: sceneModule, lifecycle } = m;
  const cases = [];
  const themes = ['stone', 'wild', 'courtyard'];
  const generated = {};
  for (const theme of themes) {
    const a = generation.generateScene({ theme, seed: 1024, sceneId: 'gen-' + theme });
    const b = generation.generateScene({ theme, seed: 1024, sceneId: 'gen-' + theme });
    const c = generation.generateScene({ theme, seed: 1025, sceneId: 'gen-' + theme });
    const structureCount = new Set([1024, 1025, 1026].map(seed => generation.generateScene({ theme, seed, sceneId: 'shape-test' }).report.structureIndex)).size;
    const compiled = sceneModule.compileScene(a.scene);
    const objectBoundsOnFloor = a.scene.objects.filter(o => o.bounds && !['wall', 'door'].includes(o.kind)).every(o =>
      [...Array(o.bounds.height).keys()].every(dy => [...Array(o.bounds.width).keys()].every(dx => !compiled.cells[(o.bounds.row + dy) * compiled.grid.columns + o.bounds.col + dx].void)));
    const doorsTouchFloor = a.scene.objects.filter(o => o.kind === 'door').every(o =>
      [...Array(o.bounds.height).keys()].some(dy => [...Array(o.bounds.width).keys()].some(dx => !compiled.cells[(o.bounds.row + dy) * compiled.grid.columns + o.bounds.col + dx].void)));
    cases.push(ok('T05-' + theme + ' 同seed完全复现、三种结构可选、双输出由同场景派生',
      JSON.stringify(a.scene) === JSON.stringify(b.scene) && JSON.stringify(a.compiled.artJson) === JSON.stringify(compiled.artJson) &&
      (JSON.stringify(a.scene) !== JSON.stringify(c.scene) || a.report.structureIndex !== c.report.structureIndex) && structureCount >= 2 &&
      a.compiled.cells.length === a.scene.grid.columns * a.scene.grid.rows && objectBoundsOnFloor && doorsTouchFloor,
      JSON.stringify({ theme, structure: a.report.structureIndex, structureCount, art: a.compiled.artJson.features.length, cells: a.compiled.cells.length, objectBoundsOnFloor, doorsTouchFloor })));
    generated[theme] = a;
  }
  const wildArt = generated.wild.compiled.artJson.features.map(f => f.type);
  cases.push(ok('T05 野外主题图元来自现有R13近景类型且逻辑障碍同源',
    ['tree', 'boulder', 'crystal', 'campfire'].every(k => wildArt.includes(k)) &&
    generated.wild.compiled.cells.some(c => c.objectIds.includes('tree-a') && c.blocksMovement), JSON.stringify(wildArt)));

  const scene = generation.generateScene({ theme: 'stone', seed: 71, sceneId: 'formation' }).scene;
  const units = [unit('h1', 'hero'), unit('h2', 'hero', { width: 2, height: 2 }), unit('e1', 'enemy'), unit('e2', 'enemy')];
  const spec = {
    regions: [], landmarks: [],
    groups: [
      { id: 'heroes', unitIds: ['h1', 'h2'], placement: { regionId: 'region-0' } },
      { id: 'enemies', unitIds: ['e1', 'e2'], placement: { regionId: 'region-2' } },
    ],
    overrides: [{ unitId: 'h1', placement: { col: 4, row: 4, facing: 90 } }],
    relations: [
      { id: 'r1', subject: 'h1', relation: 'in-region', object: 'region-0', strength: 'hard' },
      { id: 'r2', subject: 'h1', relation: 'near', object: 'h2', strength: 'soft', params: { distance: 12 } },
      { id: 'r3', subject: 'h1', relation: 'adjacent', object: 'h2', strength: 'soft' },
      { id: 'r4', subject: 'h1', relation: 'surround', object: 'e1', strength: 'soft' },
    ],
  };
  const solved = generation.solveFormation(scene, units, spec, { seed: 99 });
  const solvedAgain = generation.solveFormation(scene, units, spec, { seed: 99 });
  cases.push(ok('T05 语义组布阵支持大型footprint/个体覆盖/硬区域与软约束松弛报告',
    solved.ok && solved.placementsById.h1.col === 4 && solved.placementsById.h2 && solved.placementsById.e1 &&
    JSON.stringify(solved.placementsById) === JSON.stringify(solvedAgain.placementsById) && solved.report.relaxed.length === 2,
    JSON.stringify({ ok: solved.ok, placements: solved.placementsById, report: solved.report })));

  const conflictScene = { sceneId: 'narrow', grid: { columns: 9, rows: 7, metersPerCell: 1 }, ground: { material: 'brick' },
    objects: [{ id: 'left', kind: 'wall', bounds: { col: 4, row: 0, width: 1, height: 3 } }, { id: 'right', kind: 'wall', bounds: { col: 4, row: 4, width: 1, height: 3 } }],
    regions: [{ id: 'narrow', bounds: { col: 3, row: 3, width: 3, height: 1 } }], landmarks: [] };
  const tooLarge = generation.solveFormation(conflictScene, [unit('giant', 'enemy', { width: 2, height: 2 })], {
    regions: [], landmarks: [], groups: [{ id: 'locked', unitIds: ['giant'], placement: { regionId: 'narrow' } }], overrides: [], relations: [],
  }, { seed: 1 });
  cases.push(ok('T05 2×2无法进入窄区时返回可诊断硬冲突且不删单位',
    !tooLarge.ok && tooLarge.report.status === 'hard-conflict' && tooLarge.report.conflicts[0].unitId === 'giant' &&
    !Object.keys(tooLarge.placementsById).length, JSON.stringify(tooLarge)));

  const trappedScene = wallEnclosedRoom();
  const trapped = generation.solveFormation(trappedScene, [unit('prisoner', 'enemy')], {
    regions: [], landmarks: [], groups: [], overrides: [{ unitId: 'prisoner', placement: { col: 4, row: 4 } }],
    relations: [{ id: 'trapped', subject: 'prisoner', relation: 'trapped-in', object: 'cell', strength: 'hard', params: { exits: ['exit-door'] } }],
  }, { seed: 7 });
  const missingNear = generation.solveFormation(scene, [unit('x', 'hero')], { regions: [], landmarks: [], groups: [], overrides: [],
    relations: [{ id: 'near-required', subject: 'x', relation: 'near', object: 'region-0', strength: 'hard' }] }, { seed: 3 });
  cases.push(ok('T05 trapped-in 检查封闭边界和显式硬出口；near 缺距离拒绝',
    trapped.ok && !missingNear.ok && missingNear.report.status === 'invalid-spec' &&
    missingNear.report.conflicts[0].reason === 'near-requires-distance', JSON.stringify({ trapped, missingNear })));

  const empty = lifecycle.emptyTacticsState();
  const loaded = lifecycle.applyLoad(empty, { sceneId: scene.sceneId, battleId: 'b1' }, { layout: scene, positions: solved.placementsById });
  const changedDoorState = { doors: { 'door-n': false } };
  const newBattle = lifecycle.applyLoad(loaded.state, { sceneId: scene.sceneId, battleId: 'b2' }, changedDoorState);
  const resume = lifecycle.applyLoad(newBattle.state, { sceneId: scene.sceneId, battleId: 'b2' }, null);
  cases.push(ok('T05 生成layout/positions存入scene状态，新battle与续载保留地图和物件变化',
    loaded.sceneState.layout.seed === scene.seed && newBattle.sceneState.layout.seed === scene.seed &&
    newBattle.sceneState.doors['door-n'] === false && resume.branch === 'resume' &&
    resume.sceneState.layout.seed === scene.seed && resume.sceneState.doors['door-n'] === false,
    JSON.stringify({ first: loaded.branch, second: newBattle.branch, resume: resume.branch, seed: resume.sceneState.layout.seed, doors: resume.sceneState.doors })));

  const openPlacement = { h1: { col: 3, row: 3, facing: 90 } };
  const edited = generation.solveFormation(scene, units, {
    regions: [], landmarks: [], groups: [{ id: 'all', unitIds: ['h1', 'h2', 'e1', 'e2'], placement: { regionId: 'region-0' } }],
    overrides: [{ unitId: 'h1', placement: openPlacement.h1 }], relations: [],
  }, { seed: 402 });
  const illegal = generation.solveFormation(scene, units, {
    regions: [], landmarks: [], groups: [],
    overrides: [{ unitId: 'h1', placement: { col: 0, row: 0 } }], relations: [],
  }, { seed: 402 });
  cases.push(ok('T05-06 开场个体覆盖可落合法格，非法覆盖被拒并返回冲突',
    edited.ok && edited.placementsById.h1.col === 3 && edited.placementsById.h1.row === 3 &&
    !illegal.ok && illegal.report.status === 'hard-conflict' && illegal.report.conflicts[0].reason === 'blocked-terrain',
    JSON.stringify({ edited: edited.placementsById.h1, illegal: illegal.report })));

  const compactSpec = { regions: [], landmarks: [], relations: [],
    groups: [{ id: 'hero-group', unitIds: ['h1', 'h2'], placement: { regionId: 'region-0' } },
      { id: 'enemy-group', unitIds: ['e1', 'e2'], placement: { regionId: 'region-2' } }],
    overrides: [{ unitId: 'h1', placement: { col: 4, row: 4, facing: 90 } }] };
  const compact = generation.solveFormation(scene, units, compactSpec, { seed: 99 });
  const coordinateSpec = { regions: [], landmarks: [], relations: [], groups: [],
    overrides: units.map(u => ({ unitId: u.id, placement: compact.placementsById[u.id] })) };
  const cellByCell = generation.solveFormation(scene, units, coordinateSpec, { seed: 99 });
  const compactTokens = JSON.stringify(compactSpec).length;
  const cellTokens = JSON.stringify(coordinateSpec).length;
  cases.push(ok('T05-07 语义布阵与逐人坐标均可解并记录输入长度',
    compact.ok && cellByCell.ok && compactTokens > 0 && cellTokens > 0 &&
    units.every(u => JSON.stringify(compact.placementsById[u.id]) === JSON.stringify(cellByCell.placementsById[u.id])),
    JSON.stringify({ compactTokens, cellTokens, compact: compact.placementsById, cellByCell: cellByCell.placementsById })));

  return { cases };
}

export const groups = { 'T05-01': { run: deps => p05(deps.modules) } };
