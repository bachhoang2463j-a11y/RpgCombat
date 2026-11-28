// ==========================================
// 演出倍速：表现层唯一虚拟时钟（规则时钟 clock.mjs 不读本模块）
// · fxNow()：倍速积分的单调毫秒；setTimeScale 时重定基点，已流逝的部分不回溯。
// · fxDateNow()：与 Date.now() 同纪元的虚拟毫秒，供 doneAt 句柄与等待换算。
// · fxTimeout / fxInterval：把虚拟毫秒换成真实计时器（已挂起的计时器不随后续换档重排）。
// · 动画速率同步：每帧把演出作用域（[data-rpg-av-scope]）内的有限次 Web Animation / CSS 动画改为当前倍速；
//   无限循环的待机/呼吸动效不加速。界面层（底栏、弹窗）不在作用域内，保持 1×。
// · 音频采样保持原速与音高，只是触发时刻随计时器提前。
// ==========================================

export const SPEED_STEPS = [1, 1.2, 1.5, 2];

const realNow = () => performance.now();
let k = 1, realBase = null, virtBase = 0, dateOffset = null;   // 首次读数时定基点（模块加载不触碰计时 API）
const listeners = new Set();

export function getTimeScale() { return k; }
export function fxNow() {
  if (realBase === null) virtBase = realBase = realNow();
  return virtBase + (realNow() - realBase) * k;
}
export function fxDateNow() {
  if (dateOffset === null) dateOffset = Date.now() - fxNow();
  return dateOffset + fxNow();
}
export function fxTimeout(fn, ms, ...args) { return setTimeout(fn, (ms || 0) / k, ...args); }
export function fxInterval(fn, ms, ...args) { return setInterval(fn, (ms || 0) / k, ...args); }

export function setTimeScale(value) {
  if (value === k) return k;
  virtBase = fxNow(); realBase = realNow(); k = value;
  listeners.forEach(fn => fn(k));
  startSweep();
  return k;
}
export function onTimeScale(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ---------- 动画速率同步 ----------
const applied = new WeakMap();   // Animation → 已施加倍速
let sweeping = false, resetPass = false;
function sweepOnce() {
  const roots = document.querySelectorAll('[data-rpg-av-scope]');
  for (const root of roots) {
    for (const a of root.getAnimations({ subtree: true })) {
      if (applied.get(a) === k) continue;
      applied.set(a, k);
      const timing = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
      if (timing && timing.iterations === Infinity) continue;
      a.updatePlaybackRate((a.playbackRate < 0 ? -1 : 1) * k);
    }
  }
}
function startSweep() {
  if (typeof document === 'undefined') return;
  resetPass = k === 1;
  if (sweeping) return;
  sweeping = true;
  const tick = () => {
    sweepOnce();
    if (k === 1 && resetPass) { resetPass = false; sweeping = false; return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
