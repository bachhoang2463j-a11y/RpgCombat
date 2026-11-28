// ==========================================
// 战棋 P02 视图代际作用域：监听/计时/rAF/动画/节点/Promise 的统一注销
// 与 P01 lifecycle.mjs（scene/battle 状态机）职责分离；本模块只管视图资源生命周期。
// combatToken 语义沿用"对象快照相等"，由宿主（main）唯一换代；scope 自己只管 active。
// 时钟函数可注入，供 Node 侧可控时钟测试；默认用全局。
// 幂等：dispose 可重复调用，清理计数不为负，回调不二次执行。
// ==========================================

import { fxNow, getTimeScale } from './time-scale.mjs';

export function createViewScope(clock = {}) {
  const t = {
    setTimeout: clock.setTimeout || ((fn, ms) => setTimeout(fn, ms)),
    clearTimeout: clock.clearTimeout || ((id) => clearTimeout(id)),
    setInterval: clock.setInterval || ((fn, ms) => setInterval(fn, ms)),
    clearInterval: clock.clearInterval || ((id) => clearInterval(id)),
    raf: clock.raf || ((fn) => requestAnimationFrame(fn)),
    caf: clock.caf || ((id) => cancelAnimationFrame(id)),
    now: clock.time || fxNow,
    scale: clock.scale || getTimeScale,
  };

  let active = true;
  const timers = new Map();   // 句柄 → { fn, due, cur（真实计时器，暂停中为 null）, left, sys }
  let timerSeq = 0, holdDepth = 0, holdStart = 0, heldTotal = 0;
  function arm(key, rec, ms) {
    rec.due = t.now() + ms;
    rec.cur = t.setTimeout(() => { timers.delete(key); if (active) rec.fn(); }, ms / t.scale());
  }
  const intervals = new Set();
  const rafIds = new Set();
  const loopRafIds = new Set();
  const listeners = [];
  const observers = new Set();
  const animations = new Set();
  const nodes = new Set();
  const disposers = new Set();
  const cancelCallbacks = new Set(); // dispose 时按序调用的取消回调（Promise 结算等）

  const scope = {
    get isLive() { return active; },

    // ---- 计时 ----
    // 演出时钟：hold 期间 after 计时（含期间新建的）整体顺延 ms，结束后按剩余时长续跑；heldMs 为累计暂停时长（补间扣除用）
    after(ms, fn) {
      if (!active) return null;
      const key = ++timerSeq, rec = { fn, due: 0, cur: null, left: ms, sys: false };
      timers.set(key, rec);
      if (!holdDepth) arm(key, rec, ms);
      return key;
    },
    cancelAfter(id) { const rec = timers.get(id); if (rec) t.clearTimeout(rec.cur); timers.delete(id); },
    hold(ms, onResume) {
      if (!active) return;
      const now = t.now();
      if (holdDepth++ === 0) {
        holdStart = now;
        timers.forEach(rec => { if (!rec.sys && rec.cur != null) { t.clearTimeout(rec.cur); rec.cur = null; rec.left = Math.max(0, rec.due - now); } });
      }
      const key = ++timerSeq, rec = { due: 0, cur: null, left: ms, sys: true, fn: () => {
        if (--holdDepth === 0) {
          heldTotal += t.now() - holdStart;
          timers.forEach((r, k) => { if (r.cur == null) arm(k, r, r.left); });
        }
        if (onResume) onResume();
      } };
      timers.set(key, rec);
      arm(key, rec, ms);
    },
    heldMs() { return heldTotal + (holdDepth ? t.now() - holdStart : 0); },
    every(ms, fn) {
      if (!active) return null;
      const id = t.setInterval(() => { if (!active) { t.clearInterval(id); intervals.delete(id); return; } fn(); }, ms / t.scale());
      intervals.add(id);
      return id;
    },
    stopEvery(id) {
      if (id == null) return;
      t.clearInterval(id);
      intervals.delete(id);
    },

    // ---- rAF：一次性 + 循环帧任务 ----
    frame(fn) {
      if (!active) return null;
      const id = t.raf(() => { rafIds.delete(id); if (active) fn(); });
      rafIds.add(id);
      return id;
    },
    // 循环帧：fn(now) 返回 false 或 scope 失活时停止；返回停止函数
    loop(fn) {
      if (!active) return () => {};
      let stopped = false;
      const tick = (now) => {
        loopRafIds.delete(rafId);
        if (stopped || !active) return;
        if (fn(now) === false) { stopped = true; loopRafIds.delete(rafId); return; }
        if (stopped || !active) return;
        rafId = t.raf(tick);
        loopRafIds.add(rafId);
      };
      let rafId = t.raf(tick);
      loopRafIds.add(rafId);
      const stop = () => { stopped = true; t.caf(rafId); loopRafIds.delete(rafId); };
      return stop;
    },

    // ---- 监听 / 观察 / 动画 ----
    listen(el, type, fn, opts) {
      if (!el || !active) return () => {};
      el.addEventListener(type, fn, opts);
      const rec = { el, type, fn, opts };
      listeners.push(rec);
      return () => {
        const i = listeners.indexOf(rec);
        if (i >= 0) { listeners.splice(i, 1); el.removeEventListener(type, fn, opts); }
      };
    },
    observe(observer) {
      if (!active) return observer;
      observers.add(observer);
      return observer;
    },
    animate(animation) {
      if (!animation) return;
      animations.add(animation);
    },

    // ---- 节点与自定义清理 ----
    addNode(el) {
      if (el) nodes.add(el);
      return el;
    },
    removeNode(el) { nodes.delete(el); if (el) el.remove(); },
    onDispose(fn) {
      if (!active) { return () => {}; }
      disposers.add(fn);
      return () => disposers.delete(fn);
    },

    // ---- Promise：dispose 时结算一次 false，不沿用永久挂起策略 ----
    settleOnDispose(settle) {
      if (!active) return;
      let done = false;
      const once = () => { if (!done) { done = true; settle(false); } };
      cancelCallbacks.add(once);
      return () => { done = true; cancelCallbacks.delete(once); };
    },

    // ---- 收据（测试断言用）：全部归零才算清理干净 ----
    counts() {
      return {
        timers: timers.size, intervals: intervals.size,
        raf: rafIds.size + loopRafIds.size,
        listeners: listeners.length, observers: observers.size,
        animations: animations.size, nodes: nodes.size,
        disposers: disposers.size, cancelCallbacks: cancelCallbacks.size,
        active,
      };
    },

    // ---- 统一注销：幂等，先失活再清理 ----
    dispose() {
      if (!active) return scope.counts();
      active = false;
      timers.forEach(rec => t.clearTimeout(rec.cur)); timers.clear();
      intervals.forEach(id => t.clearInterval(id)); intervals.clear();
      rafIds.forEach(id => t.caf(id)); rafIds.clear();
      loopRafIds.forEach(id => t.caf(id)); loopRafIds.clear();
      listeners.forEach(r => { try { r.el.removeEventListener(r.type, r.fn, r.opts); } catch (e) { /* 元素已卸载不阻断清理 */ } });
      listeners.length = 0;
      observers.forEach(o => { try { o.disconnect(); } catch (e) { /* 同上 */ } });
      observers.clear();
      animations.forEach(a => { try { a.cancel(); } catch (e) { /* 已结束的动画 cancel 幂等 */ } });
      animations.clear();
      nodes.forEach(el => { try { el.remove(); } catch (e) { /* 同上 */ } });
      nodes.clear();
      cancelCallbacks.forEach(fn => { try { fn(); } catch (e) { /* 结算回调异常不阻断 */ } });
      cancelCallbacks.clear();
      disposers.forEach(fn => { try { fn(); } catch (e) { /* 清理钩子异常不阻断 */ } });
      disposers.clear();
      return scope.counts();
    },
  };
  return scope;
}
