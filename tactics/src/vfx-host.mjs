// ==========================================
// 战棋 P02 特效宿主：世界美术坐标解析 + 世界层挂载 + 代际计时委托
// 解决 index.html:5792 mkAnchor(position:fixed) 与弹道/粒子屏幕像素坐标在相机移动下漂移的问题：
// 战棋侧所有演出坐标（锚点/矩形/弹道 a/ctrl/b/粒子 x/y/hist）统一保存在 world-root 美术坐标
// （固定图 1000×1000，q 美术像素/米），镜头变化只改共同父层变换，不改演出数据。
// 本层不把屏幕像素传回规则层；rectOf 从 placement+footprint 计算演出矩形，不读头像 DOM rect。
// ==========================================

import { unitCenter } from './geometry.mjs';

// layers: { anchorLayer, domLayer, canvasHolder } 均为 world-root 子层（sandbox 提供）
// deps:   { getPlacement(unitId), getFootprint(unitId), getFacing(unitId), scope, metersPerArtPx }
export function createVfxHost({ anchorLayer, domLayer, canvasHolder }, deps) {
  const { getPlacement, getFootprint, scope, metersPerArtPx } = deps;
  const Q = 1 / metersPerArtPx; // 米 → 美术像素

  // 目标解析：unitId → 世界美术坐标；{wx,wy}（米）→ 直接换算
  function pointOf(target) {
    if (typeof target === 'string') {
      const p = getPlacement(target);
      if (!p) throw new Error('特效目标单位不存在: ' + target);
      const fp = getFootprint(target);
      const c = unitCenter(p, fp);
      return { x: c.x * Q, y: c.y * Q };
    }
    if (target && Number.isFinite(target.wx) && Number.isFinite(target.wy)) {
      return { x: target.wx * Q, y: target.wy * Q };
    }
    throw new Error('特效目标不合法');
  }

  // 矩形解析：unitId → 完整占地矩形（美术 px）；{wx,wy} → 2px 锚矩形
  function rectOf(target) {
    if (typeof target === 'string') {
      const p = getPlacement(target);
      if (!p) throw new Error('特效目标单位不存在: ' + target);
      const fp = getFootprint(target);
      const w = (fp.width) * Q, h = (fp.height) * Q;
      const x = p.col * Q, y = p.row * Q;
      return { x: x + w / 2, y: y + h / 2, w, h, left: x, right: x + w, top: y, bottom: y + h };
    }
    const pt = pointOf(target);
    return { x: pt.x, y: pt.y, w: 2, h: 2, left: pt.x - 1, right: pt.x + 1, top: pt.y - 1, bottom: pt.y + 1 };
  }

  // 原位临时锚点（position:absolute，挂世界锚点层；仅删自建锚点）
  function mkAnchor(x, y) {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute; left:' + (x - 1) + 'px; top:' + (y - 1) + 'px; width:2px; height:2px; pointer-events:none;';
    d.setAttribute('data-tactics-fx', 'anchor');
    anchorLayer.appendChild(d);
    scope.addNode(d);
    return d;
  }
  function dropAnchor(d) {
    if (d && d.isConnected) d.remove();
    scope.nodes.delete(d);
  }

  // 世界 DOM/SVG 演出层；ms 给定则定时自收尾，不给由调用方/handle 负责
  function layer(html, ms) {
    const d = document.createElement('div');
    d.setAttribute('data-tactics-fx', 'layer');
    d.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; overflow:visible;';
    d.innerHTML = html;
    domLayer.appendChild(d);
    scope.addNode(d);
    if (ms) {
      scope.after(ms, () => { d.remove(); scope.nodes.delete(d); });
    }
    return d;
  }

  return {
    pointOf, rectOf, mkAnchor, dropAnchor, layer,
    canvasHolder,
    scope,
    after: (ms, fn) => scope.after(ms, fn),
    every: (ms, fn) => scope.every(ms, fn),
    stopEvery: (id) => scope.stopEvery(id),
    frame: (fn) => scope.frame(fn),
    loop: (fn) => scope.loop(fn),
    animate: (a) => scope.animate(a),
    metersPerArtPx: metersPerArtPx,
  };
}
