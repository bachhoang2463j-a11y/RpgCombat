import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GRID, OPEN_GRID, START, TARGET, CLEAR, OUTSIDE, isFloor, inCone, queryMap } from './rules.mjs';

const walled = queryMap(GRID);
const open = queryMap(OPEN_GRID);

test('T00-04 A* crosses x=4 through the gap at y=5 and never enters a wall', () => {
  const { path } = walled;
  assert.deepEqual(path[0], START);
  assert.deepEqual(path.at(-1), TARGET);
  assert.equal(path.length - 1, 9);
  assert.deepEqual(path.filter(([x]) => x === 4), [[4, 5]]);
  for (const [i, [x, y]] of path.entries()) {
    assert.ok(isFloor(GRID, x, y));
    if (i) assert.equal(Math.abs(x - path[i - 1][0]) + Math.abs(y - path[i - 1][1]), 1);
  }
});

test('T00-04 removing the wall yields a five-step route', () => {
  assert.deepEqual(open.path, [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3]]);
});

test('T00-04 shadowcasting blocks an in-cone target, and removing the wall reveals it', () => {
  assert.equal(inCone(...TARGET), true);
  assert.equal(walled.visibility(...TARGET), 0);
  assert.equal(walled.visibleInCone(...TARGET), false);
  assert.equal(open.visibility(...TARGET), 1);
  assert.equal(open.visibleInCone(...TARGET), true);
});

test('T00-04 cone accepts a clear east neighbor and rejects a visible north neighbor', () => {
  assert.equal(walled.visibility(...CLEAR), 1);
  assert.equal(walled.visibleInCone(...CLEAR), true);
  assert.equal(walled.visibility(...OUTSIDE), 1);
  assert.equal(walled.visibleInCone(...OUTSIDE), false);
});
