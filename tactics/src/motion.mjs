// ==========================================
// 战棋连续移动表现：消费规则寻路给出的真实 cell.path，沿全部路径段连续插值
// · 只改显示位置（unitView.setDisplayPos），不回写 placement；结束时由宿主把显示位置交还权威落点。
// · 按段长匀速（斜段 √2 米耗时更长），首段缓起、末段缓停；转向时朝向箭头独立旋转（头像始终正立）。
// · 起步/转向/停步各发一次轻反馈（类名脉冲，由 CSS 呈现），不推进游戏虚拟时间。
// · 动画时长只影响画面；scope 失活（重置/换场）时立即结束并回报 false。
// ==========================================

import { unitCenter } from './geometry.mjs';

export const MOVE_SPEED = 4.6;      // 米/秒（表现参数）
const HOP_PX = 7;                   // 每步起落高度（屏幕像素，billboard 内）
const EASE_MS = 140;                // 首末段缓起缓停额外时长

export function pathSegments(path, footprint) {
  const fp = footprint || { width: 1, height: 1 };
  const pts = path.map(c => unitCenter({ col: c.col, row: c.row }, fp));
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-9) continue;
    segs.push({ a, b, len, facing: ((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI) + 360) % 360 });
  }
  return segs;
}

// 总时长（毫秒）：段长/速度 + 首末缓动；供导演层与测试读取
export function pathDuration(segs, speed = MOVE_SPEED) {
  if (!segs.length) return 0;
  const total = segs.reduce((s, g) => s + g.len, 0);
  return total / speed * 1000 + EASE_MS;
}

// 梯形速度曲线：首末各 a 比例时间匀加/匀减速，中段匀速；返回已走路程比例 [0,1]
export function travelFraction(t, a) {
  const vm = 1 / (1 - a);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t < a) return 0.5 * vm * t * t / a;
  if (t <= 1 - a) return 0.5 * vm * a + vm * (t - a);
  return 1 - 0.5 * vm * (1 - t) * (1 - t) / a;
}
function distanceAt(t, segs, totalMs) {
  const total = segs.reduce((s, g) => s + g.len, 0);
  const a = Math.min(0.35, EASE_MS / totalMs);
  return total * travelFraction(t, a);
}

export function pointAtDistance(segs, dist) {
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const g = segs[i];
    if (dist <= acc + g.len || i === segs.length - 1) {
      const k = Math.max(0, Math.min(1, (dist - acc) / g.len));
      return { x: g.a.x + (g.b.x - g.a.x) * k, y: g.a.y + (g.b.y - g.a.y) * k, seg: i, facing: g.facing };
    }
    acc += g.len;
  }
  const last = segs[segs.length - 1];
  return { x: last.b.x, y: last.b.y, seg: segs.length - 1, facing: last.facing };
}

// play(unitView, scope, { unitId, path, footprint, onFrame(x,y), onFeedback(kind,seg) }) → Promise<boolean>
export function playPathMotion(unitView, scope, opts) {
  const { unitId, path, footprint, onFrame, onFeedback, speed = MOVE_SPEED } = opts;
  const segs = pathSegments(path || [], footprint);
  if (!segs.length || !scope || !scope.isLive) return Promise.resolve(true);
  const totalMs = pathDuration(segs, speed);
  unitView.lockMotion(unitId, true);
  unitView.setFlag(unitId, 't-unit-moving', true);
  if (onFeedback) onFeedback('start', 0);
  return new Promise(resolve => {
    let done = false, lastSeg = -1;
    const t0 = performance.now();
    const finish = ok => {
      if (done) return; done = true;
      unitView.setFlag(unitId, 't-unit-moving', false);
      unitView.lockMotion(unitId, false);
      if (ok && onFeedback) onFeedback('stop', segs.length - 1);
      resolve(ok);
    };
    const stopCancel = scope.settleOnDispose(() => finish(false));
    scope.loop(now => {
      const t = Math.min(1, (now - t0) / totalMs);
      const p = pointAtDistance(segs, distanceAt(t, segs, totalMs));
      unitView.setDisplayPos(unitId, p.x, p.y);
      // 步态：每段一次起落（落地瞬间轻微压扁），落地拍点发 step 反馈（脚步声/尘土）
      const segStart = segs.slice(0, p.seg).reduce((s, g) => s + g.len, 0);
      const k = Math.max(0, Math.min(1, (distanceAt(t, segs, totalMs) - segStart) / segs[p.seg].len));
      const hop = Math.sin(Math.PI * k);
      unitView.setHop(unitId, hop * HOP_PX, 1 - (1 - hop) * 0.06);
      if (p.seg !== lastSeg) {
        if (onFeedback) onFeedback('step', p.seg, p);
        if (lastSeg >= 0 && Math.abs(((segs[p.seg].facing - segs[lastSeg].facing + 540) % 360) - 180) > 1 && onFeedback) onFeedback('turn', p.seg);
        lastSeg = p.seg;
        unitView.setDisplayFacing(unitId, p.facing);
      }
      if (onFrame) onFrame(p.x, p.y);
      if (t >= 1) { unitView.setHop(unitId, 0, 1); if (onFeedback) onFeedback('step', segs.length, p); if (stopCancel) stopCancel(); finish(true); return false; }
    });
  });
}
