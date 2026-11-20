// ==========================================
// 战棋 P02 统一格网几何（米格标尺唯一权威，供相机投影与占格选取共用）
// 约定：左上为原点，X 向右、Y 向下；世界坐标单位为米；1 格 = metersPerCell 米。
// placement.col/row 是完整 footprint 的左上格，不是头像中心。
// 本模块不做寻路、射线、命中或视野查询（P04/P06 再扩展）；表现层不得另建第二套几何。
// ==========================================

// 规范化朝向：0°向上、90°向右、180°向下、270°向左；360° 与 0° 等价。
export function normalizeFacing(deg) {
  const n = Math.round(Number(deg) || 0);
  return ((n % 360) + 360) % 360;
}

// 朝向 → 单位方向向量 (sinθ, -cosθ)：0°=(0,-1) 上，90°=(1,0) 右。
// 90° 倍数走查表（三角函数浮点残差会破坏精确方向断言）；其余角度用三角函数。
const CARDINAL_DIRS = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
export function directionVector(facingDeg) {
  const n = normalizeFacing(facingDeg);
  if (n % 90 === 0) return { ...CARDINAL_DIRS[Math.round(n / 90) % 4] };
  const rad = n * Math.PI / 180;
  return { dx: Math.sin(rad), dy: -Math.cos(rad) };
}

// 格子中心（世界米坐标）
export function cellCenter(col, row) {
  return { x: col + 0.5, y: row + 0.5 };
}

// 单位中心（世界米坐标）：完整占地的几何中心
export function unitCenter(placement, footprint) {
  const w = footprint && footprint.width || 1;
  const h = footprint && footprint.height || 1;
  return { x: (placement.col + w / 2), y: (placement.row + h / 2) };
}

// 唯一占格枚举：footprint 全部真实占格（2×2 枚举四格，不是只算中心所在格）
export function occupiedCells(placement, footprint) {
  const w = footprint && footprint.width || 1;
  const h = footprint && footprint.height || 1;
  const cells = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) cells.push({ col: placement.col + dx, row: placement.row + dy });
  }
  return cells;
}

// 格键（占位索引与格表共用）
export function cellKey(col, row) {
  return col + ',' + row;
}

// 占位索引：每个真实占格 → 同一单位 ID（2×2 的四格都映射到同一 ID）
export function buildOccupancyIndex(placements, footprintsById) {
  const index = new Map();
  for (const p of placements) {
    const fp = footprintsById[p.unitId] || { width: 1, height: 1 };
    for (const c of occupiedCells(p, fp)) index.set(cellKey(c.col, c.row), p.unitId);
  }
  return index;
}

// 点选：逻辑占位索引查询，边界外/未占返回 null（不 clamp 成边缘格）
export function unitAt(index, col, row) {
  return index.get(cellKey(col, row)) || null;
}
