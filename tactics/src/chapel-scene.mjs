// ==========================================
// 战棋视听切片场景：三层礼拜堂（对齐原型缩略图：入口厅 → 中殿长椅 → 上层立柱大厅，窄廊相连）
// 单一权威描述：floor 为可行走区域，区域外为实心外壁；物件只存格/米尺寸与语义，画法由 chapel-art 派生。
// 坐标：左上原点、Y 向下；1 格 = 1 米。上层大厅在上（北），入口厅在下（南），我方由南向北推进。
// ==========================================

const R = (col, row, width, height) => ({ col, row, width, height });

export const CHAPEL_SCENE = {
  sceneId: 'sc-chapel',
  style: 'chapel',
  grid: { columns: 24, rows: 44, metersPerCell: 1 },
  ground: { material: 'stone' },
  // 三层房间 + 两段窄廊
  floor: [
    R(2, 1, 20, 13),    // 上层：立柱大厅
    R(10, 14, 4, 3),    // 窄廊（上）
    R(3, 17, 18, 13),   // 中层：中殿（长椅、祭坛）
    R(10, 30, 4, 3),    // 窄廊（下）
    R(6, 33, 12, 10),   // 下层：入口厅（墓碑）
  ],
  objects: [
    // 中轴红毯贯穿三层
    { id: 'carpet-axis', kind: 'carpet', bounds: R(11, 1, 2, 42) },
    // ---- 上层：四根立柱 + 五排长椅 ----
    { id: 'pillar-nw', kind: 'pillar', bounds: R(4, 3, 2, 2) },
    { id: 'pillar-ne', kind: 'pillar', bounds: R(18, 3, 2, 2) },
    { id: 'pillar-sw', kind: 'pillar', bounds: R(4, 9, 2, 2) },
    { id: 'pillar-se', kind: 'pillar', bounds: R(18, 9, 2, 2) },
    ...[3, 5, 7, 9, 11].flatMap((row, i) => [
      { id: 'pew-c-l' + i, kind: 'pew', bounds: R(7, row, 3, 1) },
      { id: 'pew-c-r' + i, kind: 'pew', bounds: R(14, row, 3, 1) },
    ]),
    // ---- 上窄廊：两侧雕像龛 ----
    { id: 'statue-cb-w', kind: 'statue', bounds: R(10, 15, 1, 1) },
    { id: 'statue-cb-e', kind: 'statue', bounds: R(13, 15, 1, 1) },
    // ---- 中殿：祭坛 + 三排长椅（右中排已损毁成碎石） + 墙侧挂毯 ----
    { id: 'altar', kind: 'altar', bounds: R(11, 18, 2, 1) },
    { id: 'pew-b-l0', kind: 'pew', bounds: R(5, 21, 4, 1) },
    { id: 'pew-b-r0', kind: 'pew', bounds: R(15, 21, 4, 1) },
    { id: 'pew-b-l1', kind: 'pew', bounds: R(5, 24, 4, 1) },
    { id: 'rubble-b-r1', kind: 'rubble', bounds: R(15, 24, 4, 1) },
    { id: 'pew-b-l2', kind: 'pew', bounds: R(5, 27, 4, 1) },
    { id: 'pew-b-r2', kind: 'pew', bounds: R(15, 27, 4, 1) },
    { id: 'banner-b-w0', kind: 'banner', bounds: R(3, 19, 1, 2), side: 'w' },
    { id: 'banner-b-w1', kind: 'banner', bounds: R(3, 25, 1, 2), side: 'w' },
    { id: 'banner-b-e0', kind: 'banner', bounds: R(20, 19, 1, 2), side: 'e' },
    { id: 'banner-b-e1', kind: 'banner', bounds: R(20, 25, 1, 2), side: 'e' },
    { id: 'rubble-b-a', kind: 'rubble', bounds: R(8, 19, 1, 1) },
    // ---- 下窄廊：雕像龛收窄成两格咽喉 ----
    { id: 'statue-ba-w', kind: 'statue', bounds: R(10, 31, 1, 1) },
    { id: 'statue-ba-e', kind: 'statue', bounds: R(13, 31, 1, 1) },
    // ---- 入口厅：两侧墓碑 ----
    { id: 'tomb-w', kind: 'tomb', bounds: R(7, 37, 1, 2) },
    { id: 'tomb-e', kind: 'tomb', bounds: R(16, 37, 1, 2) },
    // ---- 暖光 ----
    ...[[3.5, 2], [20.5, 2], [3.5, 12.5], [20.5, 12.5], [8.5, 6], [15.5, 6],
      [4.5, 18.5], [19.5, 18.5], [4.5, 28.5], [19.5, 28.5], [9.6, 18.4], [14.4, 18.4],
      [7.5, 34.5], [16.5, 34.5], [7.5, 41.5], [16.5, 41.5]].map(([col, row], i) => ({ id: 'light-' + i, kind: 'light', at: { col, row } })),
  ],
};
