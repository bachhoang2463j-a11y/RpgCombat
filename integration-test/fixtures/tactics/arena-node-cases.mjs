// ==========================================
// 战棋 P05 Arena Node 定向用例（真实 generation / scene / scenario-data / battle）
// 不复制生产业务逻辑；供测试底座通过 groups.TARENA.run({ modules }) 调用。
// ==========================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const srcDir = path.join(root, 'tactics', 'src');
const yamlPath = path.join(root, 'doc', 'tactics', '典型对局-战棋版.yaml');
const MODULE_FILES = {
  generation: 'generation.mjs', scene: 'scene.mjs', scenarioData: 'scenario-data.mjs',
  battle: 'battle.mjs', perception: 'perception.mjs', movement: 'movement.mjs', parser: 'parser.mjs', range: 'range.mjs',
};

async function loadModules(provided = {}) {
  const out = { ...provided };
  for (const [key, file] of Object.entries(MODULE_FILES)) {
    if (!out[key]) out[key] = await import(pathToFileURL(path.join(srcDir, file)).href);
  }
  return out;
}

async function runArena(deps = {}) {
  const m = await loadModules(deps.modules);
  const cases = [];
  const check = (id, pass, detail = '') => cases.push({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  const unit = (id, footprint = { width: 1, height: 1 }, attrTags = []) => ({
    id, name: id, side: id.startsWith('h') ? 'hero' : 'enemy', controller: id.startsWith('h') ? 'player' : 'ai',
    footprint, attrTags, skills: [], items: [], ref: { hp: 100, maxHp: 100, mp: 20, maxMp: 20, tp: 0, maxTp: 100,
      atk: 20, def: 10, spd: 50, evasion: 0, strength: 35, totalWeight: 50, moveDistance: 6, perception: 50 },
  });
  const units = [unit('h-small'), unit('h-medium', { width: 1, height: 1 }), unit('e-large', { width: 2, height: 2 }, ['[钢体]'])];
  const themes = ['stone', 'wild', 'courtyard'];
  const generated = themes.map(theme => m.generation.generateEncounter({ theme, size: 'small', seed: 20261123, sceneId: 'arena-' + theme, units: [] }));
  const specs = [['small', 16, 14, 2], ['medium', 24, 20, 3], ['large', 32, 26, 5]];
  for (const [size, width, height, high] of specs) {
    const r = m.generation.generateEncounter({ theme: 'stone', size, seed: 20261123, units });
    const { col, row, width: w, height: h } = r.scene.floor[0];
    const obstacles = prefix => r.scene.objects.filter(o => o.id.startsWith(prefix));
    const getCells = objects => objects.flatMap(o => o.cells.map(c => m.scene.cellAt(r.compiled, c.col, c.row)));
    const highs = obstacles('high-'), lows = obstacles('low-');
    const highCells = getCells(highs), lowCells = getCells(lows);
    check('TARENA ' + size + ' 尺寸、高低墙数量与实际阻挡', r.ok && r.scene.floor.length === 1 && col === 1 && row === 1 && w === width && h === height
      && r.scene.grid.columns === width + 2 && r.scene.grid.rows === height + 2 && highs.length === high && lows.length === high * 4
      && highs.some(o => o.cells.length > 1) && lows.some(o => o.cells.length >= 3)
      && highCells.every(c => c.blocksMovement && c.blocksProjectile && c.blocksVision && !c.lowObstacle)
      && lowCells.every(c => c.blocksMovement && !c.blocksProjectile && !c.blocksVision && c.lowObstacle));
  }
  check('TARENA 三种主题保留并可编译', generated.every((r, i) => r.ok && r.scene.theme === themes[i] && r.compiled.artJson.features.length > 0));

  const decorated = m.generation.generateEncounter({ theme: 'chapel', size: 'small', seed: 20261123 });
  const dc = decorated.compiled, kinds = k => decorated.scene.objects.filter(o => o.kind === k);
  const cellsOf = o => Array.from({ length: o.bounds.width * o.bounds.height }, (_, i) => m.scene.cellAt(dc, o.bounds.col + i % o.bounds.width, o.bounds.row + Math.floor(i / o.bounds.width)));
  const highs = ['pillar', 'confessional', 'cabinet', 'statue'].flatMap(kinds);
  const lows = ['pew', 'altar', 'pulpit', 'lectern', 'candelabra', 'font', 'tomb'].flatMap(kinds);
  const decor = ['dais', 'apse', 'chapelDoor'].flatMap(kinds);
  const aisle = dc.grid.columns / 2 - 1;
  check('TARENA 礼拜堂固定大档：圣坛/中殿/侧廊/入口陈设与规则一致', decorated.ok && decorated.scene.size === 'large'
    && decorated.scene.floor[0].width === 32 && decorated.scene.floor[0].height === 26
    && kinds('pillar').length === 6 && kinds('altar').length === 1 && kinds('pulpit').length === 1 && kinds('lectern').length === 1
    && kinds('candelabra').length === 2 && kinds('font').length === 2 && decor.length === 3 && kinds('pew').length >= 12
    && highs.every(o => cellsOf(o).every(c => c.blocksMovement && c.blocksProjectile && c.blocksVision && !c.lowObstacle))
    && lows.every(o => cellsOf(o).every(c => c.blocksMovement && !c.blocksProjectile && !c.blocksVision && c.lowObstacle))
    && decor.every(o => !dc.cells.some(c => c.objectIds.includes(o.id)))
    && Array.from({ length: 25 }, (_, i) => i + 2).every(row => [aisle, aisle + 1].every(col => !m.scene.cellAt(dc, col, row).blocksMovement)));
  const chapelA = m.generation.generateEncounter({ theme: 'chapel', seed: 7 });
  const chapelB = m.generation.generateEncounter({ theme: 'chapel', seed: 7 });
  const chapelC = m.generation.generateEncounter({ theme: 'chapel', seed: 8 });
  check('TARENA 礼拜堂同种子复现、异种子改变长椅与侧廊陈设', JSON.stringify(chapelA.scene) === JSON.stringify(chapelB.scene)
    && JSON.stringify(chapelA.scene.objects) !== JSON.stringify(chapelC.scene.objects));
  const directions = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const r = m.generation.generateEncounter({ theme: 'stone', size: 'small', seed });
    for (const o of r.scene.objects.filter(o => o.cells)) {
      directions.add(o.facing);
      check('TARENA 障碍组相邻连接 ' + seed + '/' + o.id, o.cells.every((c, i) => !i || Math.abs(c.col - o.cells[i - 1].col) + Math.abs(c.row - o.cells[i - 1].row) === 1));
    }
  }
  check('TARENA 种子覆盖八个障碍组朝向', directions.size === 8, [...directions]);

  const smallA = m.generation.generateEncounter({ theme: 'stone', size: 'small', seed: 17, sceneId: 'repeat', units: [] });
  const smallB = m.generation.generateEncounter({ theme: 'stone', size: 'small', seed: 17, sceneId: 'repeat', units: [] });
  const smallC = m.generation.generateEncounter({ theme: 'stone', size: 'small', seed: 18, sceneId: 'repeat', units: [] });
  check('TARENA 同种子完全复现且异种子改变生成', JSON.stringify(smallA.scene) === JSON.stringify(smallB.scene)
    && JSON.stringify(smallA.scene) !== JSON.stringify(smallC.scene), { same: smallA.scene.seed, other: smallC.scene.seed });

  const defaults = [unit('h-a'), unit('e-b')];
  const positioned = m.generation.generateEncounter({ theme: 'wild', size: 'small', seed: 41, sceneId: 'placed', units: defaults,
    positions: { 'h-a': { col: 4, row: 4, facing: 90 }, 'e-b': { col: 8, row: 8, facing: 180 } } });
  check('TARENA 显式站位按 unit.id 保留朝向', positioned.ok && positioned.placementsById['h-a']?.col === 4
    && positioned.placementsById['h-a']?.row === 4 && positioned.placementsById['h-a']?.facing === 90
    && positioned.placementsById['e-b']?.facing === 180, positioned.placementsById);

  const large = unit('e-2x2', { width: 2, height: 2 });
  const sized = m.generation.generateEncounter({ theme: 'stone', size: 'medium', seed: 77, sceneId: 'footprint', units: [large] });
  const p = sized.placementsById && sized.placementsById['e-2x2'];
  const floor = sized.scene && sized.scene.floor && sized.scene.floor[0];
  const reach = m.movement.findReachable({ compiled: sized.compiled, units: [large], placementsById: sized.placementsById,
    footprintsById: { [large.id]: large.footprint } }, large.id);
  check('TARENA 大型单位可跨战场到达对侧', sized.ok && p.row < floor.height / 2
    && reach.cells.some(c => c.row >= Math.floor(floor.height / 2) + 3), p);
  const wide = m.generation.generateEncounter({ seed: 4, units: Array.from({ length: 6 }, (_, i) => unit('e-' + i, { width: 2, height: 2 })) });
  check('TARENA 小档放不下时按完整占格升为中档', wide.ok && wide.scene.size === 'medium', wide.report);
  const collision = m.generation.generateEncounter({ theme: 'stone', size: 'small', seed: 4, sceneId: 'collision', units: [unit('h-one'), unit('e-two')],
    positions: { 'h-one': { col: 4, row: 4 }, 'e-two': { col: 4, row: 4 } } });
  check('TARENA 重叠站位返回显式冲突', collision.ok === false && Array.isArray(collision.report.conflicts) && collision.report.conflicts.length > 0, collision.report);

  const yaml = fs.readFileSync(yamlPath, 'utf8');
  const parsed = m.parser.parseYamlText(yaml);
  const demo = m.scenarioData.createEncounterDemo(yaml);
  const baseline = m.scenarioData.createEncounterScenario(parsed, demo.encounter);
  check('TARENA 默认样本隔离旧坐标，保留阵容和召唤词条', baseline.scene.sceneId !== parsed.sceneId && baseline.scene.size === 'large'
    && baseline.units.length === 10 && parsed.summonTemplates.length === 2 && !!baseline.summonProvider('幻梦行军兽')
    && Object.keys(baseline.placementsById).length === baseline.units.length && baseline.seed === 20261123);
  const larger = m.scenarioData.createEncounterScenario({ ...parsed, sceneId: 'explicit-arena', meta: { ...parsed.meta, 房间大小: '大', 地图主题: 'wild' }, placements: {} });
  check('TARENA 剧情可以显式指定档位和主题，不需提供固定站位', larger.scene.size === 'large' && larger.scene.theme === 'wild'
    && larger.scene.sceneId === 'explicit-arena' && Object.keys(larger.placementsById).length === 10);
  const baselineBattle = m.battle.createBattle({ ...baseline, random: m.scenarioData.createSeededRandom(baseline.seed) });
  const started = baselineBattle.start();
  const action = baselineBattle.runEnemyTurn();
  const reset = baselineBattle.reset();
  check('TARENA 旧 AI 在新地形实际行动且没有旧报警', action.events.some(e => e.type === 'attack-start' || e.type === 'unit-moved')
    && !action.events.some(e => e.type === 'enemy-alarm'));
  check('TARENA 真实行动后重置恢复开局站位和资源', JSON.stringify(reset.positions) === JSON.stringify(started.positions)
    && reset.units.length === 10 && started.units.every(u => reset.units.find(r => r.id === u.id).hp === u.hp)
    && reset.runId !== started.runId);

  const h = unit('h'), e = unit('e'); h.ref.spd = 100;
  const wall = { id: 'wall', kind: 'wall', bounds: { col: 5, row: 4, width: 1, height: 1 } };
  const fight = m.battle.createBattle({ units: [h, e], placementsById: { h: { col: 3, row: 4 }, e: { col: 7, row: 4 } },
    scene: { sceneId: 'arena-wall', encounter: true, grid: { columns: 18, rows: 12, metersPerCell: 1 }, objects: [wall] } });
  fight.start();
  const gun = { name: '直射', type: '[枪击]', damageType: '远程', power: 25, range: { type: '单体', castRange: 15 } };
  const shot = () => m.range.queryAttack(fight.ctx, 'h', gun, { targetId: 'e', x: 7.5, y: 4.5 });
  check('TARENA 墙后单位位置已知但射线被高墙挡住', fight.snapshot('h').units.some(u => u.id === 'e') && shot().blockedBy?.type === 'wall');
  const move = fight.move(7, 2);
  check('TARENA 绕墙移动不中途触发发现截停', move.ok && move.cell.col === 7 && !move.stoppedOnDiscovery && shot().ok);
  fight.ctx.regions.push({ id: 'fog', type: 'fog', cells: [{ col: 7, row: 2 }], strength: 25, endAt: fight.ctx.now() + 100 });
  check('TARENA 技能雾仍限制视野和锁定', !fight.snapshot('h').units.some(u => u.id === 'e') && !shot().ok);
  fight.ctx.regions.length = 0;
  check('TARENA 雾解除后恢复位置与合法弹道', fight.snapshot('h').units.some(u => u.id === 'e') && shot().ok);

  return { cases };
}

export const groups = { TARENA: { run: runArena } };
