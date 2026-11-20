// ==========================================
// 战棋 P02 沙盘编排：地图视口 + 唯一 world-root + 相机手势 + 单位层 + 特效层 + 生命周期
// 分层（world-root 内自底向上）：R13 底图 SVG → 几何叠加 Canvas → 单位层 → 特效锚点层
//   → 特效 DOM 层 → 特效粒子 Canvas。全部继承同一相机变换；原 UI 悬浮层在相机树之外。
// 生命周期：mount/reset/destroy + view-scope 代际；reset 失效旧代际→清演出→重建；
//   同 scene+同 battle 增量走 update（不重建地图、不重置相机、不重绑监听）。
// 本模块只消费审定数据，不另建资源真值；不读头像 DOM rect 决定世界位置。
// ==========================================

import { compileScene, cellAt } from './scene.mjs';
import { renderSceneArt } from './map-art.mjs';
import { screenToWorld, screenToGrid, zoomAtPose, focusPose, fitPose, createPose, createGesture } from './camera.mjs';
import { buildOccupancyIndex, unitAt, occupiedCells } from './geometry.mjs';
import { createUnitView } from './unit-view.mjs';
import { createVfxHost } from './vfx-host.mjs';
import { createArcaneVfxModule } from './arcane-vfx.mjs';
import { createViewScope } from './view-scope.mjs';

const FOCUS_MS = 180;        // 聚焦缓动时长（交互参数，非玩法预算）
const WHEEL_FACTOR = 1.15;   // 每档滚轮倍率

export function createSandbox(rootEl, deps = {}) {
  const getSafeRect = deps.getSafeRect || (() => ({ left: 0, top: 0, width: rootEl.clientWidth, height: rootEl.clientHeight }));

  let scope = null;
  let token = null;          // combatToken 对象快照（宿主唯一换代）
  let compiled = null;       // compileScene 产物
  let viewData = null;       // 当前 { scene, units, placementsById, footprintsById, battleId, sceneId }
  let pose = createPose();
  let origin = { left: 0, top: 0 };
  let gesture = null;
  let occupancy = null;
  let selectedId = null;
  let unitView = null;
  let vfx = null;
  let vfxHost = null;
  let focusStop = null;
  let dom = null;            // { viewport, world, art, overlay, unitLayer, anchorLayer, fxLayer, fxCanvasHolder }
  let onSelectCb = null;

  // ---------- DOM 构建 ----------
  function buildDom() {
    const viewport = document.createElement('div');
    viewport.id = 'tactics-map-viewport';
    viewport.style.cssText = 'position:absolute; inset:0; overflow:hidden; touch-action:none; cursor:grab;';
    const world = document.createElement('div');
    world.id = 'tactics-world-root';
    world.style.cssText = 'position:absolute; left:0; top:0; width:1000px; height:1000px; transform-origin:0 0; will-change:transform;';

    const art = document.createElement('div');
    art.setAttribute('data-tactics-layer', 'art');
    art.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%;';

    const overlay = document.createElement('canvas');
    overlay.setAttribute('data-tactics-layer', 'overlay');
    overlay.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none;';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    overlay.width = 1000 * dpr; overlay.height = 1000 * dpr;

    const unitLayer = document.createElement('div');
    unitLayer.setAttribute('data-tactics-layer', 'units');
    unitLayer.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none;';

    const anchorLayer = document.createElement('div');
    anchorLayer.setAttribute('data-tactics-layer', 'fx-anchors');
    anchorLayer.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none;';

    const fxLayer = document.createElement('div');
    fxLayer.setAttribute('data-tactics-layer', 'fx-dom');
    fxLayer.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none;';

    const fxCanvasHolder = document.createElement('div');
    fxCanvasHolder.setAttribute('data-tactics-layer', 'fx-canvas-holder');
    fxCanvasHolder.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none;';

    world.appendChild(art);
    world.appendChild(overlay);
    world.appendChild(unitLayer);
    world.appendChild(anchorLayer);
    world.appendChild(fxLayer);
    world.appendChild(fxCanvasHolder);
    viewport.appendChild(world);
    rootEl.appendChild(viewport);
    dom = { viewport, world, art, overlay, unitLayer, anchorLayer, fxLayer, fxCanvasHolder, dpr };
  }

  // ---------- 相机 ----------
  function applyCamera() {
    dom.world.style.transform = 'translate(' + pose.tx + 'px,' + pose.ty + 'px) scale(' + pose.scale + ')';
    if (unitView) unitView.onCameraChange(pose);
  }

  function updateOrigin() {
    const r = dom.viewport.getBoundingClientRect();
    origin = { left: r.left, top: r.top };
  }

  function safeRectClient() {
    const s = getSafeRect();
    return { left: s.left, top: s.top, width: s.width, height: s.height };
  }

  // ---------- 选中框绘制（世界美术坐标；规则数据不从 DOM 反算） ----------
  function drawSelection() {
    const g = dom.overlay.getContext('2d');
    g.setTransform(dom.dpr, 0, 0, dom.dpr, 0, 0);
    g.clearRect(0, 0, 1000, 1000);
    if (!selectedId || !viewData) return;
    const p = viewData.placementsById[selectedId];
    const fp = viewData.footprintsById[selectedId];
    if (!p || !fp) return;
    for (const c of occupiedCells(p, fp)) {
      g.strokeStyle = 'rgba(56,189,248,0.9)';
      g.lineWidth = 2;
      g.strokeRect(c.col * 50 + 1, c.row * 50 + 1, 48, 48);
      g.fillStyle = 'rgba(56,189,248,0.10)';
      g.fillRect(c.col * 50 + 1, c.row * 50 + 1, 48, 48);
    }
  }

  // ---------- 手势绑定（只绑一次 per mount；update 不重绑） ----------
  function bindInput() {
    gesture = createGesture({ threshold: 6 });
    scope.listen(dom.viewport, 'pointerdown', (e) => {
      if (e.button !== 0) return;
      stopFocusAnim();
      gesture.down(e, pose);
      try { dom.viewport.setPointerCapture(e.pointerId); } catch (err) { /* 已释放时忽略 */ }
    });
    scope.listen(dom.viewport, 'pointermove', (e) => {
      const r = gesture.move(e);
      if (r && r.state === 'dragging') {
        pose = r.pose;
        applyCamera();
      }
    });
    scope.listen(dom.viewport, 'pointerup', (e) => {
      const r = gesture.up(e);
      if (!r) return;
      if (r.type === 'click') handleSelect(r.x, r.y);
    });
    scope.listen(dom.viewport, 'pointercancel', (e) => gesture.cancel(e));
    scope.listen(dom.viewport, 'lostpointercapture', (e) => gesture.cancel(e));
    scope.listen(dom.viewport, 'wheel', (e) => {
      e.preventDefault();
      stopFocusAnim();
      const factor = e.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;
      const px = e.clientX - origin.left, py = e.clientY - origin.top;
      pose = zoomAtPose(pose, px, py, factor);
      applyCamera();
    }, { passive: false });
  }

  function handleSelect(sx, sy) {
    const gridHit = screenToGrid(pose, origin, 50, compiled.grid, sx, sy);
    let unitId = null;
    if (gridHit && occupancy) unitId = unitAt(occupancy, gridHit.col, gridHit.row) || null;
    selectedId = unitId;
    drawSelection();
    if (onSelectCb) onSelectCb(unitId ? viewData.units.find(u => u.id === unitId) : null);
  }

  // ---------- 聚焦缓动（每帧只调 setCamera；用户手势/滚轮可中断；不被特效禁用） ----------
  function stopFocusAnim() {
    if (focusStop) { focusStop(); focusStop = null; }
  }

  function focusWorld(wx, wy) {
    const safe = safeRectClient();
    const target = focusPose(wx, wy, pose.scale, origin, 50, {
      x: origin.left + safe.left + safe.width / 2,
      y: origin.top + safe.top + safe.height / 2,
    });
    stopFocusAnim();
    const from = { ...pose };
    const t0 = performance.now();
    focusStop = scope.loop((now) => {
      const k = Math.min(1, (now - t0) / FOCUS_MS);
      const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      pose = {
        tx: from.tx + (target.tx - from.tx) * e,
        ty: from.ty + (target.ty - from.ty) * e,
        scale: from.scale + (target.scale - from.scale) * e,
      };
      applyCamera();
      if (k >= 1) { focusStop = null; return false; }
    });
  }

  // ---------- 组装一次实例（mount 与 reset 共用） ----------
  function buildInstance(vd) {
    scope = createViewScope();
    token = vd.combatToken;
    viewData = vd;
    compiled = compileScene(vd.scene);
    buildDom();
    updateOrigin();
    dom.art.innerHTML = renderSceneArt(compiled.artJson);
    occupancy = buildOccupancyIndex(
      vd.units.map(u => ({ unitId: u.id, col: vd.placementsById[u.id].col, row: vd.placementsById[u.id].row })),
      vd.footprintsById,
    );
    unitView = createUnitView(dom.unitLayer, { scope, metersPerArtPx: 1 / 50 });
    unitView.setUnits(vd.units, vd.placementsById);
    vfxHost = createVfxHost(
      { anchorLayer: dom.anchorLayer, domLayer: dom.fxLayer, canvasHolder: dom.fxCanvasHolder },
      {
        getPlacement: (id) => viewData.placementsById[id] || null,
        getFootprint: (id) => viewData.footprintsById[id] || { width: 1, height: 1 },
        getFacing: (id) => viewData.placementsById[id] ? viewData.placementsById[id].facing || 0 : 0,
        scope,
        metersPerArtPx: 1 / 50,
      },
    );
    const instanceScope = scope;
    vfx = createArcaneVfxModule(vfxHost, () => (instanceScope.isLive ? token : null));
    bindInput();
    // ResizeObserver：只更新 origin（不重置相机 pose）
    const ro = new ResizeObserver(() => updateOrigin());
    ro.observe(dom.viewport);
    scope.observe(ro);
    // 初次 fit：按本尺寸 UI 边界计算，不沿用另一尺寸
    const safe = safeRectClient();
    pose = fitPose(compiled.grid, 50, origin, {
      left: safe.left, top: safe.top, width: Math.max(120, safe.width), height: Math.max(120, safe.height),
    });
    applyCamera();
    drawSelection();
  }

  // ---------- 生命周期入口 ----------
  function mount(vd) {
    if (scope) destroy();
    buildInstance(vd);
  }

  // 同 scene+同 battle 增量：更新单位视图，不重建地图/不重置相机/不重绑监听
  function update(vd) {
    if (!scope || !scope.isLive) { mount(vd); return; }
    const changed = JSON.stringify([viewData.scene, viewData.units, viewData.placementsById]) !== JSON.stringify([vd.scene, vd.units, vd.placementsById]);
    if (changed) vfx.clearFx();
    token = vd.combatToken;
    const sceneChanged = JSON.stringify(viewData.scene) !== JSON.stringify(vd.scene);
    viewData = vd;
    if (sceneChanged) { compiled = compileScene(vd.scene); dom.art.innerHTML = renderSceneArt(compiled.artJson); }
    occupancy = buildOccupancyIndex(
      vd.units.map(u => ({ unitId: u.id, col: vd.placementsById[u.id].col, row: vd.placementsById[u.id].row })),
      vd.footprintsById,
    );
    unitView.syncUnits(vd.units, vd.placementsById);
    if (selectedId && !vd.units.some(u => u.id === selectedId)) selectedId = null;
    drawSelection();
  }

  // reset：失效旧代际→清演出→重建（新 battle 用保留位置；新 scene 重建场景）
  function reset(vd) {
    stopFocusAnim();
    if (vfx) vfx.clearFx();
    if (scope) scope.dispose();
    teardownDom();
    buildInstance(vd);
  }

  function teardownDom() {
    if (dom) {
      dom.viewport.remove();
      dom = null;
    }
    unitView = null; vfx = null; vfxHost = null; occupancy = null; selectedId = null;
  }

  function destroy() {
    stopFocusAnim();
    if (vfx) vfx.clearFx();
    if (scope) scope.dispose();
    scope = null; token = null; viewData = null; compiled = null;
    teardownDom();
    gesture = null;
    pose = createPose();
  }

  // ---------- 对外读取（测试/宿主；只回 JSON 数据） ----------
  function getSnapshot() {
    return {
      mounted: !!(scope && scope.isLive),
      sceneId: viewData ? viewData.sceneId : null,
      battleId: viewData ? viewData.battleId : null,
      pose: { ...pose },
      origin: { ...origin },
      selection: selectedId,
      scopeCounts: scope ? scope.counts() : null,
      grid: compiled ? compiled.grid : null,
    };
  }

  return {
    mount, update, reset, destroy,
    focusWorld,
    setCamera: (p) => { pose = { ...p }; applyCamera(); },
    applyCamera,
    getPose: () => ({ ...pose }),
    getOrigin: () => ({ ...origin }),
    worldToScreenClient: (wx, wy) => ({
      x: origin.left + pose.tx + pose.scale * 50 * wx,
      y: origin.top + pose.ty + pose.scale * 50 * wy,
    }),
    screenToWorldClient: (sx, sy) => screenToWorld(pose, origin, 50, sx, sy),
    screenToGridClient: (sx, sy) => screenToGrid(pose, origin, 50, compiled.grid, sx, sy),
    selectAt: (sx, sy) => { handleSelect(sx, sy); return selectedId; },
    getSelectedId: () => selectedId,
    getCompiled: () => compiled,
    getUnitView: () => unitView,
    getVfx: () => vfx,
    onSelect: (cb) => { onSelectCb = cb; },
    getSnapshot,
    getScope: () => scope,
  };
}
