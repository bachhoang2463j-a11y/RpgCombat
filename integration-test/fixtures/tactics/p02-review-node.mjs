import assert from 'node:assert/strict';
import { createViewScope } from '../../../tactics/src/view-scope.mjs';
import { sceneForState, deriveUnitId } from '../../../tactics/src/main.mjs';
import { compileScene } from '../../../tactics/src/scene.mjs';
import { renderSceneArt } from '../../../tactics/src/map-art.mjs';

export function runReviewCases() {
  const cases = [];
  const check = (id, fn) => { fn(); cases.push({ id, pass: true }); };
  let next = 0; const frames = new Map(); const canceled = [];
  const clock = { raf: fn => { const id = ++next; frames.set(id, fn); return id; }, caf: id => { canceled.push(id); frames.delete(id); } };
  const frame = () => { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(16 * id); };
  check('T02-review loop natural stop has zero pending frames', () => {
    const scope = createViewScope(clock); let n = 0; scope.loop(() => ++n < 3);
    frame(); frame(); frame(); assert.equal(n, 3); assert.equal(scope.counts().raf, 0); assert.equal(frames.size, 0); scope.dispose();
  });
  check('T02-review dispose cancels current frame after first tick', () => {
    const scope = createViewScope(clock); scope.loop(() => true); frame();
    const pending = [...frames.keys()][0]; scope.dispose(); assert.ok(canceled.includes(pending)); assert.equal(frames.size, 0);
  });
  check('T02-review natural Promise completion unregisters cancellation', () => {
    const scope = createViewScope(clock); let calls = 0; const unregister = scope.settleOnDispose(() => calls++);
    unregister(); scope.dispose(); assert.equal(calls, 0); assert.equal(scope.counts().cancelCallbacks, 0);
  });
  check('T02-review node removal uses public scope API', () => {
    const scope = createViewScope(clock); let removed = 0; const node = { remove() { removed++; } };
    scope.addNode(node); scope.removeNode(node); assert.equal(scope.counts().nodes, 0); scope.dispose(); assert.equal(removed, 1);
  });
  check('T02-review saved closed door drives rules and art', () => {
    const compiled = compileScene(sceneForState('sc-test-room', { doors: { 'door-main': false } }));
    assert.equal(compiled.cells[9 * 20 + 9].blocksMovement, true); assert.ok(compiled.artJson.features.some(f => f.type === 'doorLeaf'));
  });
  check('T02-review saved object bounds drive both outputs', () => {
    const compiled = compileScene(sceneForState('sc-test-room', { objects: { 'counter-low': { bounds: { col: 5, row: 5, width: 2, height: 1 } } } }));
    assert.equal(compiled.cells[5 * 20 + 5].lowObstacle, true); assert.deepEqual(compiled.artJson.features.find(f => f.type === 'counter').at, [250, 250]);
  });
  check('T02-review art contains no unresolved color placeholders', () => {
    const svg = renderSceneArt(compileScene(sceneForState('sc-test-room')).artJson);
    assert.ok(!svg.includes('%%')); assert.ok(svg.includes('#2c313a')); assert.ok(svg.includes('#b8b2a4'));
  });
  check('T02-review literal colon name cannot collide with duplicate name', () => {
    assert.notEqual(deriveUnitId('hero', '书采:2', 1), deriveUnitId('hero', '书采', 2));
  });
  return cases;
}
