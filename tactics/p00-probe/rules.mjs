import AStar from 'rot-js/lib/path/astar.js';
import PreciseShadowcasting from 'rot-js/lib/fov/precise-shadowcasting.js';

export const GRID = [
  '##########',
  '#...#....#',
  '#...#....#',
  '#...#....#',
  '#...#....#',
  '#........#',
  '#........#',
  '##########',
];
export const OPEN_GRID = GRID.map((row, y) => y >= 1 && y <= 4 ? `${row.slice(0, 4)}.${row.slice(5)}` : row);
export const START = [2, 3];
export const TARGET = [7, 3];
export const CLEAR = [3, 3];
export const OUTSIDE = [2, 2];
export const RADIUS = 7;

export function isFloor(grid, x, y) {
  return grid[y]?.[x] === '.';
}

// This fixture uses a 90° cone facing east. ROT supplies the wall occlusion.
export function inCone(x, y) {
  const dx = x - START[0];
  const dy = y - START[1];
  return dx > 0 && Math.abs(dy) <= dx && Math.hypot(dx, dy) <= RADIUS;
}

export function queryMap(grid) {
  const passable = (x, y) => isFloor(grid, x, y);
  const path = [];
  new AStar(...TARGET, passable, { topology: 4 }).compute(...START, (x, y) => path.push([x, y]));

  const light = new Map();
  new PreciseShadowcasting(passable, { topology: 8 }).compute(...START, RADIUS, (x, y, _range, visibility) => {
    light.set(`${x},${y}`, visibility);
  });
  const visibility = (x, y) => light.get(`${x},${y}`) ?? 0;
  const visibleInCone = (x, y) => passable(x, y) && inCone(x, y) && visibility(x, y) > 0;
  return { path, visibility, visibleInCone };
}
