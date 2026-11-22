// ==========================================
// 战棋 P02 固定测试场景：单一权威描述 → 双输出（规则格表 + R13 美术 JSON）
// 只存世界几何与语义，不存 SVG path、屏幕坐标或第二份地物表。
// 物件尺寸一律用格/米，不用美术像素；美术像素由 compileScene 按米格标尺换算。
// 本模块不调用 DOM；不做 P05 生成器/布阵求解；20×20 是测试输入，不是地图规模上限。
// ==========================================

// ---------- 物件 kind → 规则语义（通行/挡弹/遮视三属性独立，不合并） ----------
const KIND_RULES = {
  wall:       { blocksMovement: true,  blocksProjectile: true,  blocksVision: true,  lowObstacle: false },
  door:       { blocksMovement: true,  blocksProjectile: true,  blocksVision: true,  lowObstacle: false, dynamic: 'door' },
  lowCounter: { blocksMovement: true,  blocksProjectile: false, blocksVision: false, lowObstacle: true },
  carpet:     { blocksMovement: false, blocksProjectile: false, blocksVision: false, lowObstacle: false, material: 'carpet' },
  light:      { blocksMovement: false, blocksProjectile: false, blocksVision: false, lowObstacle: false },
  // 礼拜堂语义物件（规则同已有三类，只多一种画法）
  pillar:     { blocksMovement: true,  blocksProjectile: true,  blocksVision: true,  lowObstacle: false },
  statue:     { blocksMovement: true,  blocksProjectile: true,  blocksVision: true,  lowObstacle: false },
  pew:        { blocksMovement: true,  blocksProjectile: false, blocksVision: false, lowObstacle: true },
  altar:      { blocksMovement: true,  blocksProjectile: false, blocksVision: false, lowObstacle: true },
  tomb:       { blocksMovement: true,  blocksProjectile: false, blocksVision: false, lowObstacle: true },
  // 纯装饰（不进规则）
  banner:     { blocksMovement: false, blocksProjectile: false, blocksVision: false, lowObstacle: false, decor: true },
  rubble:     { blocksMovement: false, blocksProjectile: false, blocksVision: false, lowObstacle: false, decor: true },
  tree:       { blocksMovement: true,  blocksProjectile: true,  blocksVision: true,  lowObstacle: false, artOnly: true },
  boulder:    { blocksMovement: true,  blocksProjectile: true,  blocksVision: true,  lowObstacle: false, artOnly: true },
  crystal:    { blocksMovement: true,  blocksProjectile: true,  blocksVision: true,  lowObstacle: false, artOnly: true },
  campfire:   { blocksMovement: false, blocksProjectile: false, blocksVision: false, lowObstacle: false, artOnly: true },
  table:      { blocksMovement: true,  blocksProjectile: false, blocksVision: false, lowObstacle: true, artOnly: true },
  shelf:      { blocksMovement: true,  blocksProjectile: true,  blocksVision: true,  lowObstacle: false, artOnly: true },
};

// ---------- 固定测试房间（石造大厅：隔墙+门洞+低柜+长红毯+四处暖灯） ----------
export const TEST_ROOM = {
  sceneId: 'sc-test-room',
  grid: { columns: 20, rows: 20, metersPerCell: 1 },
  ground: { material: 'brick' },
  // bounds = { col, row, width, height }（左上格 + 占格数）
  objects: [
    { id: 'wall-n', kind: 'wall', bounds: { col: 0, row: 0, width: 20, height: 1 } },
    { id: 'wall-s', kind: 'wall', bounds: { col: 0, row: 19, width: 20, height: 1 } },
    { id: 'wall-w', kind: 'wall', bounds: { col: 0, row: 1, width: 1, height: 18 } },
    { id: 'wall-e', kind: 'wall', bounds: { col: 19, row: 1, width: 1, height: 18 } },
    { id: 'inner-wall-a', kind: 'wall', bounds: { col: 9, row: 1, width: 1, height: 8 } },
    { id: 'inner-wall-b', kind: 'wall', bounds: { col: 9, row: 11, width: 1, height: 8 } },
    { id: 'door-main', kind: 'door', bounds: { col: 9, row: 9, width: 1, height: 2 }, open: true },
    { id: 'counter-low', kind: 'lowCounter', bounds: { col: 13, row: 6, width: 3, height: 1 } },
    { id: 'carpet-main', kind: 'carpet', bounds: { col: 3, row: 2, width: 3, height: 16 } },
    { id: 'light-a', kind: 'light', at: { col: 2.5, row: 3.5 } },
    { id: 'light-b', kind: 'light', at: { col: 7.5, row: 16.5 } },
    { id: 'light-c', kind: 'light', at: { col: 12.5, row: 16.5 } },
    { id: 'light-d', kind: 'light', at: { col: 17.5, row: 3.5 } },
  ],
};

function boundsCells(b) {
  const cells = [];
  for (let dy = 0; dy < b.height; dy++) {
    for (let dx = 0; dx < b.width; dx++) cells.push({ col: b.col + dx, row: b.row + dy });
  }
  return cells;
}

// 一次遍历权威描述，输出规则格表 + 美术 JSON + 物件索引。
// 返回 { grid, cells, artJson, objectsIndex }
export function compileScene(scene) {
  if (!scene || !scene.grid || !scene.objects) throw new Error('场景描述不合法');
  const { columns, rows, metersPerCell } = scene.grid;
  if (!(columns > 0 && rows > 0) || metersPerCell !== 1) throw new Error('P02 米格标尺固定 1m/格');

  const q = 1000 / columns; // 美术像素/米（渲染比例，不进规则距离）
  const cells = new Array(columns * rows);
  // scene.floor：可行走区域矩形清单；区域外一律为实心外壁（void，挡移动/弹道/视线）
  const hasFloor = Array.isArray(scene.floor);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      cells[r * columns + c] = {
        col: c, row: r,
        blocksMovement: hasFloor, blocksProjectile: hasFloor, blocksVision: hasFloor, lowObstacle: false, void: hasFloor,
        material: scene.ground && scene.ground.material || 'wood',
        objectIds: [],
      };
    }
  }
  if (hasFloor) {
    for (const f of scene.floor) {
      for (const c of boundsCells(f)) {
        if (c.col < 0 || c.col >= columns || c.row < 0 || c.row >= rows) throw new Error('地面越出网格');
        Object.assign(cells[c.row * columns + c.col], { blocksMovement: false, blocksProjectile: false, blocksVision: false, void: false });
      }
    }
  }
  const artJson = { ground: scene.ground && scene.ground.material || 'wood', terrain: [], features: [], labels: [] };
  const objectsIndex = new Map();

  for (const obj of scene.objects) {
    const rule = KIND_RULES[obj.kind];
    if (!rule) throw new Error('未知物件 kind: ' + obj.kind);
    objectsIndex.set(obj.id, { id: obj.id, kind: obj.kind, bounds: obj.bounds ? { ...obj.bounds } : null, at: obj.at ? { ...obj.at } : null, open: obj.open });

    const artKind = obj.artType || obj.kind;
    if (obj.kind === 'light' || ['tree', 'boulder', 'crystal', 'campfire', 'table', 'shelf'].includes(artKind)) {
      const type = obj.kind === 'light' ? 'lantern' : artKind;
      const defaultAt = obj.bounds
        ? (type === 'shelf' ? { col: obj.bounds.col, row: obj.bounds.row } : { col: obj.bounds.col + obj.bounds.width / 2, row: obj.bounds.row + obj.bounds.height / 2 })
        : obj.at;
      const at = obj.at || defaultAt;
      const feature = { type, at: [Math.round(at.col * q), Math.round(at.row * q)] };
      if (obj.bounds && (type === 'table' || type === 'shelf')) feature.size = [obj.bounds.width * q, obj.bounds.height * q];
      artJson.features.push(feature);
      if (rule.artOnly && rule.blocksMovement && obj.bounds) {
        for (const c of boundsCells(obj.bounds)) {
          if (c.col < 0 || c.col >= columns || c.row < 0 || c.row >= rows) throw new Error('物件越出网格: ' + obj.id);
          const cell = cells[c.row * columns + c.col];
          cell.objectIds.push(obj.id);
          cell.blocksMovement = true; cell.blocksProjectile = rule.blocksProjectile; cell.blocksVision = rule.blocksVision;
          if (rule.lowObstacle) cell.lowObstacle = true;
        }
      }
      continue;
    }
    if (rule.decor) continue;   // 装饰物只进 objectsIndex 供画法使用
    if (obj.kind === 'carpet') {
      artJson.terrain.push({ type: 'carpet', at: [obj.bounds.col * q, obj.bounds.row * q], size: [obj.bounds.width * q, obj.bounds.height * q] });
    } else if (obj.kind === 'wall') {
      // wall/counter 图元为左上角锚点
      artJson.features.push({ type: 'wall', at: [obj.bounds.col * q, obj.bounds.row * q], size: [obj.bounds.width * q, obj.bounds.height * q] });
    } else if (obj.kind === 'lowCounter' || obj.kind === 'pew' || obj.kind === 'altar' || obj.kind === 'tomb') {
      artJson.features.push({ type: 'counter', at: [obj.bounds.col * q, obj.bounds.row * q], size: [obj.bounds.width * q, obj.bounds.height * q] });
    } else if (obj.kind === 'pillar' || obj.kind === 'statue') {
      artJson.features.push({ type: 'wall', at: [obj.bounds.col * q, obj.bounds.row * q], size: [obj.bounds.width * q, obj.bounds.height * q] });
    } else if (obj.kind === 'door') {
      // 门叶画法是战棋侧补充：开=MMS door 弧线（枢轴洞底、向东摆开）；关=实心门叶填洞
      const cx = obj.bounds.col * q + q / 2;
      if (obj.open) {
        artJson.features.push({ type: 'door', at: [cx, (obj.bounds.row + obj.bounds.height) * q], size: [obj.bounds.height * q] });
      } else {
        artJson.features.push({ type: 'doorLeaf', at: [cx - 10, obj.bounds.row * q + 6], size: [20, obj.bounds.height * q - 12] });
      }
    }

    // 规则格表：door.open 决定阻挡，其余按 kind 静态规则；lowObstacle 独立于阻挡标记
    const blocked = obj.kind === 'door' ? !obj.open : rule.blocksMovement;
    for (const c of boundsCells(obj.bounds)) {
      if (c.col < 0 || c.col >= columns || c.row < 0 || c.row >= rows) throw new Error('物件越出网格: ' + obj.id);
      const cell = cells[c.row * columns + c.col];
      cell.objectIds.push(obj.id);
      if (rule.lowObstacle) cell.lowObstacle = true; // 低障碍仍阻普通移动，需跳跃/闪现越过
      if (blocked) {
        cell.blocksMovement = true;
        if (obj.kind === 'door' ? !obj.open : rule.blocksProjectile) cell.blocksProjectile = true;
        if (obj.kind === 'door' ? !obj.open : rule.blocksVision) cell.blocksVision = true;
      }
      if (rule.material) cell.material = rule.material;
    }
  }
  return { grid: { columns, rows, metersPerCell }, cells, artJson, objectsIndex, style: scene.style || null, floor: hasFloor ? scene.floor.map(f => ({ ...f })) : null };
}

// 格查询：越界返回 null（不 clamp）
export function cellAt(compiled, col, row) {
  const { columns, rows } = compiled.grid;
  if (col < 0 || col >= columns || row < 0 || row >= rows) return null;
  return compiled.cells[row * columns + col];
}
