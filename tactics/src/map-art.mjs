// ==========================================
// 战棋 P02 美术适配层：权威场景 → R13 mini 底图 SVG
// 战棋配色（原型参考：深灰石砖 + 暗红长毯 + 局部暖光）注入 vendor 渲染函数族。
// 本层不从 SVG 反读逻辑；美术 JSON 由 scene.compileScene 从同一权威场景数据派生。
// ==========================================

import { MINI_PATTERN_DEFS, renderMiniMapArt } from './vendor/mms-map-art.mjs';

// 占位符注入：只覆盖配色，不改画法
function tintDefs({ brickBase, brickLine, carpetBase, carpetAlt, carpetLine, vigEdge, wallEdge, doorInk }) {
  return MINI_PATTERN_DEFS
    .split('%%BRICK_BASE%%').join(brickBase)
    .split('%%BRICK_LINE%%').join(brickLine)
    .split('%%CARPET_BASE%%').join(carpetBase)
    .split('%%CARPET_ALT%%').join(carpetAlt)
    .split('%%CARPET_LINE%%').join(carpetLine)
    .split('%%VIG_EDGE%%').join(vigEdge)
    .split('%%WALL_EDGE%%').join(wallEdge)
    .split('%%DOOR_INK%%').join(doorInk);
}

// 战棋 flat 调色板（vendor renderMiniMapArt 消费；键名与 MMS_MAPART_STYLES 消费习惯对齐）
export const TACTICS_PALETTE = {
  fam: 'wood',
  wallEdge: '#2c313a',
  doorInk: '#b8b2a4',
  font: "'Noto Sans SC','Microsoft YaHei',sans-serif",
  patternDefs: tintDefs({
    brickBase: '#41474f', brickLine: '#31363d',        // 深灰石砖
    carpetBase: '#8e3b3b', carpetAlt: '#7c3131', carpetLine: '#5f2224', // 暗红毯
    vigEdge: 'rgba(8,10,14,0.35)',
    wallEdge: '#2c313a',
    doorInk: '#b8b2a4',
  }),
  groundTypes: ['wood', 'brick', 'tile', 'street', 'marble', 'rubber', 'grass', 'snow', 'sand', 'rock'],
  grass: '#4f7a52',
  waterEdge: '#54718a',
  terrainEdge: 'rgba(16,20,26,0.45)',
  label: '#c9cdd4',
};

// 渲染场景美术 JSON（scene.compileScene 产物）→ 底图 SVG 字符串
export function renderSceneArt(artJson) {
  return renderMiniMapArt(artJson, TACTICS_PALETTE);
}
