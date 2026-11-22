// ==========================================
// P05 确定性场景生成与语义布阵（scene 是规则与美术的唯一事实源）
// ==========================================

import { compileScene } from './scene.mjs';
import { occupiedCells, cellKey, unitCenter } from './geometry.mjs';

const THEMES = {
  stone: {
    ground: ['brick', 'tile', 'marble'], floor: 'stone',
    structures: [
      { rooms: [{ col: 2, row: 2, width: 10, height: 10 }, { col: 14, row: 2, width: 10, height: 10 }, { col: 8, row: 12, width: 10, height: 10 }], links: [[11, 6, 3, 1], [13, 10, 1, 3], [12, 11, 2, 1]] },
      { rooms: [{ col: 1, row: 3, width: 8, height: 14 }, { col: 11, row: 1, width: 12, height: 8 }, { col: 11, row: 11, width: 12, height: 8 }], links: [[8, 7, 3, 1], [15, 8, 2, 3]] },
      { rooms: [{ col: 2, row: 1, width: 20, height: 7 }, { col: 2, row: 10, width: 9, height: 11 }, { col: 13, row: 10, width: 9, height: 11 }], links: [[10, 4, 3, 2], [10, 14, 3, 2]] },
    ],
    objects(seed, rooms, links) { return [
      ...(links[0] ? [{ id: 'door-n', kind: 'door', bounds: { col: links[0][0], row: links[0][1], width: links[0][2], height: links[0][3] }, open: true }] : []),
      { id: 'altar', kind: 'altar', bounds: { col: rooms[rooms.length - 1].col + 3, row: rooms[rooms.length - 1].row + 3, width: 2, height: 1 } },
      { id: 'pillar-a', kind: 'pillar', bounds: { col: rooms[0].col + 2 + seed % 2, row: rooms[0].row + 2, width: 1, height: 1 } },
      { id: 'light-a', kind: 'light', at: { col: rooms[0].col + rooms[0].width / 2, row: rooms[0].row + rooms[0].height / 2 } },
    ]; },
  },
  wild: {
    ground: ['grass', 'rock', 'sand'], floor: 'wild',
    structures: [
      { rooms: [{ col: 1, row: 1, width: 22, height: 20 }], links: [] },
      { rooms: [{ col: 1, row: 1, width: 10, height: 20 }, { col: 13, row: 1, width: 10, height: 20 }], links: [[10, 9, 4, 3]] },
      { rooms: [{ col: 2, row: 1, width: 20, height: 8 }, { col: 2, row: 12, width: 20, height: 9 }], links: [[10, 8, 3, 4]] },
    ],
    objects(seed, rooms) { return [
      { id: 'tree-a', kind: 'tree', artType: 'tree', bounds: { col: rooms[0].col + 3 + seed % 3, row: rooms[0].row + 4, width: 2, height: 2 } },
      { id: 'boulder-a', kind: 'boulder', artType: 'boulder', bounds: { col: rooms[rooms.length - 1].col + 4, row: rooms[rooms.length - 1].row + 4 + seed % 2, width: 2, height: 1 } },
      { id: 'crystal-a', kind: 'crystal', artType: 'crystal', bounds: { col: 11, row: 10, width: 1, height: 1 } },
      { id: 'campfire-a', kind: 'campfire', artType: 'campfire', at: { col: 6, row: 15 } },
    ]; },
  },
  courtyard: {
    ground: ['street', 'tile', 'grass'], floor: 'courtyard',
    structures: [
      { rooms: [{ col: 1, row: 1, width: 22, height: 7 }, { col: 1, row: 11, width: 8, height: 10 }, { col: 15, row: 11, width: 8, height: 10 }], links: [[10, 4, 4, 2], [7, 7, 3, 5], [14, 7, 3, 5]] },
      { rooms: [{ col: 2, row: 2, width: 8, height: 8 }, { col: 14, row: 2, width: 8, height: 8 }, { col: 8, row: 13, width: 8, height: 8 }], links: [[9, 5, 6, 2], [11, 9, 2, 5]] },
      { rooms: [{ col: 1, row: 2, width: 8, height: 17 }, { col: 11, row: 2, width: 12, height: 7 }, { col: 11, row: 12, width: 12, height: 7 }], links: [[8, 8, 3, 2], [15, 8, 2, 4]] },
    ],
    objects(seed, rooms, links) { return [
      ...(links[0] ? [{ id: 'door-a', kind: 'door', bounds: { col: links[0][0], row: links[0][1], width: links[0][2], height: links[0][3] }, open: seed % 2 === 0 }] : []),
      { id: 'table-a', kind: 'table', artType: 'counter', bounds: { col: rooms[rooms.length - 1].col + 3, row: rooms[rooms.length - 1].row + 4, width: 2, height: 2 } },
      { id: 'lantern-a', kind: 'light', at: { col: 5, row: 5 } },
      { id: 'shelf-a', kind: 'lowCounter', artType: 'counter', bounds: { col: 18, row: 3, width: 2, height: 1 } },
    ]; },
  },
};

function perimeterWalls(width, height) {
  return [
    { id: 'wall-n', kind: 'wall', bounds: { col: 0, row: 0, width, height: 1 } },
    { id: 'wall-s', kind: 'wall', bounds: { col: 0, row: height - 1, width, height: 1 } },
    { id: 'wall-w', kind: 'wall', bounds: { col: 0, row: 1, width: 1, height: height - 2 } },
    { id: 'wall-e', kind: 'wall', bounds: { col: width - 1, row: 1, width: 1, height: height - 2 } },
  ];
}

function makeRng(seed) {
  let s = (Number(seed) >>> 0) || 0x6d2b79f5;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function rectCells(bounds) {
  const cells = [];
  for (let row = bounds.row; row < bounds.row + bounds.height; row++)
    for (let col = bounds.col; col < bounds.col + bounds.width; col++) cells.push({ col, row });
  return cells;
}

export function generateScene({ theme, seed, sceneId = 'generated-scene' }) {
  const cfg = THEMES[theme];
  if (!cfg) throw new Error('未知地图主题: ' + theme);
  const rng = makeRng(seed);
  const structureIndex = Math.floor(rng() * cfg.structures.length);
  const structure = cfg.structures[structureIndex];
  const ground = cfg.ground[Math.floor(rng() * cfg.ground.length)];
  const floor = structure.rooms.map(r => ({ ...r }));
  for (const [col, row, width, height] of structure.links) floor.push({ col, row, width, height });
  const objects = [...perimeterWalls(24, 22), ...cfg.objects(Number(seed) >>> 0, structure.rooms, structure.links)];
  const scene = {
    sceneId, style: 'mini', theme, seed: Number(seed) >>> 0,
    grid: { columns: 24, rows: 22, metersPerCell: 1 },
    ground: { material: ground }, floor, objects,
    regions: structure.rooms.map((bounds, i) => ({ id: 'region-' + i, bounds: { ...bounds } })),
    landmarks: objects.filter(o => o.bounds || o.at).map(o => ({ id: o.id, regionId: 'region-' + (objects.indexOf(o) % structure.rooms.length), objectId: o.id })),
  };
  const compiled = compileScene(scene);
  return { scene, compiled, report: { status: 'generated', theme, seed: scene.seed, structureIndex, roomCount: floor.length } };
}

function unitIdOf(unit) { return String(unit.id); }
function footprintOf(unit) { return unit.footprint || { width: 1, height: 1 }; }
function placementCells(p, fp) { return occupiedCells(p, fp); }
function boundsContains(bounds, cells) { return cells.every(c => c.col >= bounds.col && c.row >= bounds.row && c.col < bounds.col + bounds.width && c.row < bounds.row + bounds.height); }
function regionOf(scene, id) { return (scene.regions || []).find(r => r.id === id) || null; }
function center(p, fp) { return unitCenter(p, fp); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function cellsAdjacent(a, af, b, bf) {
  for (const ac of placementCells(a, af)) for (const bc of placementCells(b, bf))
    if (Math.max(Math.abs(ac.col - bc.col), Math.abs(ac.row - bc.row)) === 1) return true;
  return false;
}
function relationEntities(ref, units, placements, scene) {
  if (ref && typeof ref === 'object' && ref.regionId) return { type: 'region', value: regionOf(scene, ref.regionId) };
  if (ref && typeof ref === 'object' && Array.isArray(ref.unitIds)) {
    const values = ref.unitIds.map(id => units.find(u => unitIdOf(u) === id)).filter(Boolean);
    return values.length === ref.unitIds.length ? { type: 'units', value: values, placements } : null;
  }
  if (typeof ref === 'string') {
    const u = units.find(x => unitIdOf(x) === ref);
    if (u) return { type: 'unit', value: u, placement: placements[ref] };
    const region = regionOf(scene, ref);
    if (region) return { type: 'region', value: region };
    const landmark = (scene.landmarks || []).find(x => x.id === ref);
    if (landmark) return { type: 'landmark', value: landmark };
  }
  return null;
}
function landmarkPlacement(landmark, scene) {
  const obj = (scene.objects || []).find(x => x.id === landmark.objectId);
  if (!obj) return null;
  if (obj.at) return { col: Math.floor(obj.at.col), row: Math.floor(obj.at.row), width: 1, height: 1 };
  return obj.bounds || null;
}
function getEntityCells(entity) {
  if (entity.type === 'region') return rectCells(entity.value.bounds);
  if (entity.type === 'unit') return placementCells(entity.placement, footprintOf(entity.value));
  if (entity.type === 'units') return entity.value.flatMap(u => placementCells(entity.placements[unitIdOf(u)], footprintOf(u)));
  if (entity.type === 'landmark') return rectCells(entity.value.bounds || entity.value);
  return [];
}
function canPlace(scene, compiled, units, placements, unit, placement) {
  const fp = footprintOf(unit), cells = placementCells(placement, fp);
  if (cells.some(c => !compiled.cells[c.row * compiled.grid.columns + c.col])) return { ok: false, reason: 'out-of-bounds' };
  if (cells.some(c => compiled.cells[c.row * compiled.grid.columns + c.col].blocksMovement)) return { ok: false, reason: 'blocked-terrain' };
  for (const other of units) {
    const id = unitIdOf(other), existing = placements[id];
    if (!existing || id === unitIdOf(unit)) continue;
    if (cells.some(a => placementCells(existing, footprintOf(other)).some(b => a.col === b.col && a.row === b.row))) return { ok: false, reason: 'occupied', unitId: id };
  }
  return { ok: true };
}
function candidatePlacements(bounds, fp) {
  const out = [];
  const maxCol = bounds.col + bounds.width - fp.width;
  const maxRow = bounds.row + bounds.height - fp.height;
  for (let row = bounds.row; row <= maxRow; row++) for (let col = bounds.col; col <= maxCol; col++) out.push({ col, row });
  return out;
}
function stableRank(seed, id, placement) {
  const text = seed + ':' + id + ':' + placement.col + ':' + placement.row;
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function resolveAnchor(scene, group) {
  const placement = group.placement || {};
  if (placement.regionId) {
    const region = regionOf(scene, placement.regionId);
    return region && region.bounds;
  }
  if (placement.landmarkId) {
    const landmark = (scene.landmarks || []).find(x => x.id === placement.landmarkId);
    if (!landmark) return null;
    return landmarkPlacement(landmark, scene);
  }
  if (placement.bounds) return placement.bounds;
  if (placement.col !== undefined && placement.row !== undefined) return { col: placement.col, row: placement.row, width: placement.width || 1, height: placement.height || 1 };
  return null;
}
function relationSatisfied(relation, units, placements, scene) {
  const subject = relationEntities(relation.subject, units, placements, scene);
  const object = relationEntities(relation.object, units, placements, scene);
  if (!subject || !subject.value || (subject.type === 'unit' && !subject.placement) || !object || !object.value || (object.type === 'unit' && !object.placement)) {
    return { ok: false, reason: 'missing-reference' };
  }
  const sc = getEntityCells(subject), oc = getEntityCells(object);
  if (relation.relation === 'in-region') {
    if (object.type !== 'region') return { ok: false, reason: 'object-not-region' };
    return { ok: boundsContains(object.value.bounds, sc), reason: 'outside-region' };
  }
  if (relation.relation === 'near') {
    const d = relation.params && relation.params.distance;
    if (!Number.isFinite(d) || d < 0) return { ok: false, reason: 'invalid-distance' };
    const a = subject.type === 'unit' ? center(subject.placement, footprintOf(subject.value)) : center({ col: subject.value.bounds.col, row: subject.value.bounds.row }, { width: subject.value.bounds.width, height: subject.value.bounds.height });
    const b = object.type === 'unit' ? center(object.placement, footprintOf(object.value)) : center({ col: object.value.bounds.col, row: object.value.bounds.row }, { width: object.value.bounds.width, height: object.value.bounds.height });
    return { ok: distance(a, b) <= d, reason: 'too-far', actualDistance: distance(a, b) };
  }
  if (relation.relation === 'adjacent') {
    return { ok: sc.some(a => oc.some(b => Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row)) === 1)), reason: 'not-adjacent' };
  }
  if (relation.relation === 'surround') {
    if (subject.type !== 'unit') return { ok: false, reason: 'subject-not-unit' };
    const p = subject.placement, fp = footprintOf(subject.value);
    const edges = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const occupied = new Set(oc.map(c => cellKey(c.col, c.row)));
    const covered = edges.map(([dx, dy]) => {
      const cells = dx ? Array.from({ length: fp.height }, (_, i) => ({ col: p.col + (dx < 0 ? -1 : fp.width), row: p.row + i }))
        : Array.from({ length: fp.width }, (_, i) => ({ col: p.col + i, row: p.row + (dy < 0 ? -1 : fp.height) }));
      return cells.every(c => occupied.has(cellKey(c.col, c.row)));
    });
    return { ok: covered.every(Boolean), reason: 'not-surrounded', covered };
  }
  if (relation.relation === 'trapped-in') {
    if (subject.type !== 'unit' || object.type !== 'region') return { ok: false, reason: 'invalid-trapped-in-entities' };
    const inside = boundsContains(object.value.bounds, sc);
    const bounds = object.value.bounds;
    const edges = [
      ...Array.from({ length: bounds.width }, (_, i) => [cellKey(bounds.col + i, bounds.row - 1), cellKey(bounds.col + i, bounds.row + bounds.height)]).flat(),
      ...Array.from({ length: bounds.height }, (_, i) => [cellKey(bounds.col - 1, bounds.row + i), cellKey(bounds.col + bounds.width, bounds.row + i)]).flat(),
    ];
    const wallCells = new Set((scene.objects || []).filter(o => ['wall', 'door'].includes(o.kind) && (o.kind !== 'door' || !o.open)).flatMap(o => rectCells(o.bounds)).map(c => cellKey(c.col, c.row)));
    const exits = (relation.params && relation.params.exits) || [];
    const exitDoors = exits.map(id => (scene.objects || []).find(o => o.id === id && o.kind === 'door' && !o.open)).filter(Boolean);
    const exitKeys = new Set(exitDoors.flatMap(o => rectCells(o.bounds)).map(c => cellKey(c.col, c.row)));
    const hasExit = exitDoors.length > 0 && edges.some(k => exitKeys.has(k));
    const enclosed = edges.every(k => wallCells.has(k));
    return { ok: inside && enclosed && hasExit, reason: !inside ? 'outside-region' : !hasExit ? 'missing-closed-hard-exit' : 'region-not-enclosed' };
  }
  return { ok: false, reason: 'unknown-relation' };
}

function candidateFitsHardRelations(scene, units, placements, relations) {
  for (const relation of relations) {
    if (relation.strength === 'soft') continue;
    const subjectRef = relation.subject;
    const objectRef = relation.object;
    const subjectUnit = units.find(u => unitIdOf(u) === subjectRef);
    const objectUnit = units.find(u => unitIdOf(u) === objectRef);
    if ((subjectUnit && !placements[subjectRef]) || (objectUnit && !placements[objectRef])) continue;
    if (relation.relation === 'trapped-in') continue;
    if (relation.relation === 'surround' && objectRef && Array.isArray(objectRef.unitIds) && objectRef.unitIds.some(id => !placements[id])) continue;
    const result = relationSatisfied(relation, units, placements, scene);
    if (!result.ok && result.reason !== 'missing-reference') return false;
  }
  return true;
}

export function solveFormation(scene, units, formationSpec, { seed = scene.seed || 0 } = {}) {
  const spec = formationSpec || { regions: [], landmarks: [], relations: [], groups: [], overrides: [] };
  const report = { status: 'ok', seed: Number(seed) >>> 0, placed: [], relaxed: [], conflicts: [] };
  const compiled = compileScene(scene);
  const unitMap = new Map(units.map(u => [unitIdOf(u), u]));
  const fail = (status, id, reason, extra = {}) => ({ ok: false, placementsById: {}, report: { ...report, status, conflicts: [...report.conflicts, { id, reason, ...extra }] } });
  const validRef = ref => {
    if (typeof ref === 'string') return unitMap.has(ref) || !!regionOf(scene, ref) || (scene.landmarks || []).some(l => l.id === ref);
    if (ref && typeof ref === 'object' && ref.regionId) return !!regionOf(scene, ref.regionId);
    if (ref && typeof ref === 'object' && Array.isArray(ref.unitIds)) return ref.unitIds.length > 0 && ref.unitIds.every(id => unitMap.has(id));
    return false;
  };
  for (const relation of spec.relations || []) {
    if (!['in-region', 'near', 'adjacent', 'surround', 'trapped-in'].includes(relation.relation)) return fail('invalid-spec', relation.id, 'unknown-relation', { relation: relation.relation });
    if (!validRef(relation.subject) || !validRef(relation.object)) return fail('invalid-spec', relation.id, 'missing-reference', { subject: relation.subject, object: relation.object });
    if ((relation.strength === 'hard' || !relation.strength) && relation.relation === 'near' && (!Number.isFinite(relation.params && relation.params.distance) || relation.params.distance < 0)) return fail('invalid-spec', relation.id, 'near-requires-distance');
    if (relation.relation === 'trapped-in' && (!relation.params || !Array.isArray(relation.params.exits) || !relation.params.exits.length)) return fail('invalid-spec', relation.id, 'trapped-in-requires-exits');
  }
  const placements = {};
  const overrideMap = new Map((spec.overrides || []).map(o => [o.unitId, o.placement]));
  const grouped = new Set();
  for (const group of spec.groups || []) {
    const anchor = resolveAnchor(scene, group);
    if (!anchor) return fail('invalid-spec', group.id, 'invalid-group-placement');
    for (const id of group.unitIds || []) {
      const unit = unitMap.get(id);
      if (!unit) return fail('invalid-spec', group.id, 'missing-unit', { unitId: id });
      if (overrideMap.has(id)) continue;
      const fp = footprintOf(unit);
      const candidates = candidatePlacements(anchor, fp).filter(p => {
        if (!canPlace(scene, compiled, units, placements, unit, p).ok) return false;
        placements[id] = p;
        const fits = candidateFitsHardRelations(scene, units, placements, spec.relations || []);
        delete placements[id];
        return fits;
      }).sort((a, b) => stableRank(seed, id, a) - stableRank(seed, id, b) || a.row - b.row || a.col - b.col);
      if (!candidates.length) return fail('hard-conflict', group.id, 'no-legal-placement', { unitId: id, anchor });
      placements[id] = { ...candidates[0], facing: group.placement.facing || 0 };
      grouped.add(id);
    }
  }
  for (const [id, placement] of overrideMap) {
    const unit = unitMap.get(id);
    if (!unit) return fail('invalid-spec', id, 'missing-override-unit');
    const check = canPlace(scene, compiled, units, placements, unit, placement);
    if (!check.ok) return fail('hard-conflict', 'override:' + id, check.reason, { unitId: id, placement, conflict: check.unitId || null });
    placements[id] = { ...placement };
    grouped.add(id);
  }
  const defaultBounds = scene.regions && scene.regions[0] && scene.regions[0].bounds || { col: 0, row: 0, width: scene.grid.columns, height: scene.grid.rows };
  for (const unit of units) {
    const id = unitIdOf(unit);
    if (placements[id]) continue;
    const candidates = candidatePlacements(defaultBounds, footprintOf(unit)).filter(p => canPlace(scene, compiled, units, placements, unit, p).ok)
      .sort((a, b) => stableRank(seed, id, a) - stableRank(seed, id, b) || a.row - b.row || a.col - b.col);
    if (!candidates.length) return fail('hard-conflict', 'placement:' + id, 'no-legal-placement', { unitId: id });
    placements[id] = candidates[0];
  }
  for (const relation of spec.relations || []) {
    const result = relationSatisfied(relation, units, placements, scene);
    if (result.ok) continue;
    const entry = { id: relation.id, relation: relation.relation, reason: result.reason, subject: relation.subject, object: relation.object, actualDistance: result.actualDistance };
    if (relation.strength === 'soft') report.relaxed.push(entry);
    else return { ok: false, placementsById: {}, report: { ...report, status: 'hard-conflict', conflicts: [...report.conflicts, entry] } };
  }
  report.placed = Object.keys(placements).sort();
  report.status = report.relaxed.length ? 'ok-with-relaxed-soft-constraints' : 'ok';
  return { ok: true, placementsById: placements, report };
}

export function generateTacticalScene(options) {
  const generated = generateScene(options);
  const formation = solveFormation(generated.scene, options.units || [], options.formationSpec, { seed: options.seed });
  if (!formation.ok) return { ...formation, scene: generated.scene, compiled: generated.compiled, report: { ...generated.report, ...formation.report } };
  return { ok: true, scene: generated.scene, compiled: generated.compiled, placementsById: formation.placementsById,
    report: { ...generated.report, ...formation.report } };
}
