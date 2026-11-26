// 直接执行真实预览绘图函数，验证落点圆心与自身范围互不混用。
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = readFileSync(path.join(__dirname, '../../../tactics/src/range-overlay.mjs'), 'utf8');
const start = source.indexOf('function shapePath(');
const end = source.indexOf('\nfunction unitMarker(', start);
assert.ok(start >= 0 && end > start);
const shapePath = runInNewContext(source.slice(start, end) + '\nshapePath', { Q: 32 });
const from = { x: 2.5, y: 3.5 }, center = { x: 10.5, y: 8.5 };
for (const name of ['拉莱耶造雾术', '召雷术', '纳克提特障壁术', '圣域帷幕', '伊西斯之拥', '压缩爆燃']) {
  let arc;
  shapePath({ beginPath() {}, arc(...args) { arc = args; } }, { type: '爆炸', from, center, radius: 3 });
  assert.deepEqual(arc.slice(0, 3), [center.x * 32, center.y * 32, 96], name);
}
let arc;
shapePath({ beginPath() {}, arc(...args) { arc = args; } }, { type: '圆形', from, center, radius: 5 });
assert.deepEqual(arc.slice(0, 3), [from.x * 32, from.y * 32, 160]);
let move;
shapePath({ beginPath() {}, moveTo(...args) { move = args; }, arc() {}, closePath() {} },
  { type: '扇形', from, center, radius: 5, angle: 90, dir: 0 });
assert.deepEqual(move, [from.x * 32, from.y * 32]);
console.log('范围预览圆心回归：8/8 通过');
