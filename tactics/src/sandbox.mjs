// ==========================================
// 战棋沙盘编排：地图视口 + 唯一 world-root + 相机手势 + 单位层 + 范围叠加层 + 视听舞台 + 生命周期
// 分层（viewport 内自外向内）：viewport[data-rpg-av-scope] → shake（只承担震屏，独立 transform）
//   → world-root（只承担相机 translate/scale）→ 底图 SVG / 叠加 Canvas / 单位层 / 视听舞台（rpg-av stage）。
// 全部世界内容继承同一相机变换：演出中平移缩放，特效与单位同步，不靠禁用镜头省掉验收。
// 生命周期：mount/reset/destroy + view-scope 代际；reset 失效旧代际 → 清演出 → 重建。
// 本模块只消费审定数据，不另建资源真值；规则位置不从 DOM 反算。
// ==========================================

import { compileScene } from './scene.mjs';
import { renderSceneArt } from './map-art.mjs';
import { screenToWorld, screenToGrid, zoomAtPose, focusPose, fitPose, createPose, createGesture } from './camera.mjs';
import { buildOccupancyIndex, unitAt, unitCenter } from './geometry.mjs';
import { createUnitView } from './unit-view.mjs';
import { createViewScope } from './view-scope.mjs';
import { drawOverlay } from './range-overlay.mjs';

const FOCUS_MS = 320;        // 镜头引导缓动时长（表现参数，非玩法预算）
const WHEEL_FACTOR = 1.15;
const MIN_SCALE = 0.2, MAX_SCALE = 3.2;

export function createSandbox(rootEl, deps = {}) {
  const getSafeRect = deps.getSafeRect || (() => ({ left: 0, top: 0, width: rootEl.clientWidth, height: rootEl.clientHeight }));

  let scope = null;
  let token = null;
  let compiled = null;
  let viewData = null;
  let pose = createPose();
  let origin = { left: 0, top: 0 };
  let gesture = null;
  let occupancy = null;
  let selectedId = null;
  let unitView = null;
  let focusStop = null;
  let dom = null;
  let onSelectCb = null;
  let onMapClickCb = null;
  let onHoverCb = null;
  let preview = null;
  let hoverKey = null;
  let userCamTouched = false;     // 本次动作内玩家是否拖拽/缩放过（中断自动跟随）
  let worldW = 1000, worldH = 1000;
  let onCancelCb = null, onContextCb = null;
  const cameraListeners = new Set();

  // ---------- DOM 构建 ----------
  function buildDom() {
    const viewport = document.createElement('div');
    viewport.id = 'tactics-map-viewport';
    viewport.setAttribute('data-rpg-av-scope', '');
    viewport.style.cssText = 'position:absolute; inset:0; overflow:hidden; touch-action:none; cursor:grab;';
    const shake = document.createElement('div');
    shake.className = 't-map-shake';
    shake.style.cssText = 'position:absolute; inset:0;';
    const world = document.createElement('div');
    world.id = 'tactics-world-root';
    world.style.cssText = 'position:absolute; left:0; top:0; width:' + worldW + 'px; height:' + worldH + 'px; transform-origin:0 0; will-change:transform;';

    const art = document.createElement('div');
    art.setAttribute('data-tactics-layer', 'art');
    art.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%;';
    const light = document.createElement('div');
    light.setAttribute('data-tactics-layer', 'light');
    light.className = 't-map-light';
    const overlay = document.createElement('canvas');
    overlay.setAttribute('data-tactics-layer', 'overlay');
    overlay.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none;';
    const dpr = worldW * worldH > 1.5e6 ? 1.5 : 2;
    overlay.width = Math.round(worldW * dpr); overlay.height = Math.round(worldH * dpr);
    const unitLayer = document.createElement('div');
    unitLayer.setAttribute('data-tactics-layer', 'units');
    unitLayer.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; z-index:2; pointer-events:none;';
    const avStage = document.createElement('div');
    avStage.setAttribute('data-tactics-layer', 'rpg-av-stage');

    world.append(art, light, overlay, unitLayer, avStage);
    shake.appendChild(world);
    const hint = document.createElement('div');
    hint.className = 't-map-hint';
    viewport.append(shake, hint);
    rootEl.appendChild(viewport);
    dom = { viewport, shake, world, art, light, overlay, unitLayer, avStage, hint, dpr };
  }

  // ---------- 相机 ----------
  function applyCamera() {
    dom.world.style.transform = 'translate(' + pose.tx + 'px,' + pose.ty + 'px) scale(' + pose.scale + ')';
    if (unitView) unitView.onCameraChange(pose);
    cameraListeners.forEach(fn => { try { fn(pose); } catch (e) { /* 监听方异常不阻断相机 */ } });
  }
  function updateOrigin() {
    const r = dom.viewport.getBoundingClientRect();
    origin = { left: r.left, top: r.top };
  }
  function safeRectClient() {
    const s = getSafeRect();
    return { left: s.left, top: s.top, width: s.width, height: s.height };
  }
  function clampScale(s) { return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s)); }

  function redrawOverlay() {
    if (!dom) return;
    const g = dom.overlay.getContext('2d');
    g.setTransform(dom.dpr, 0, 0, dom.dpr, 0, 0);
    g.clearRect(0, 0, worldW, worldH);
    drawOverlay(g, preview, viewData, selectedId);
  }

  // ---------- 手势（每 mount 绑定一次） ----------
  function bindInput() {
    gesture = createGesture({ threshold: 6 });
    let clickPoint = null;
    scope.listen(dom.viewport, 'pointerdown', (e) => {
      if (e.button !== 0) return;
      clickPoint = null;
      gesture.down(e, pose);
      try { dom.viewport.setPointerCapture(e.pointerId); } catch (err) { /* 已释放时忽略 */ }
    });
    scope.listen(dom.viewport, 'pointermove', (e) => {
      const r = gesture.move(e);
      if (r && r.state === 'dragging') {
        stopFocusAnim(); userCamTouched = true;
        pose = r.pose;
        applyCamera();
        dom.viewport.style.cursor = 'grabbing';
        return;
      }
      if (gesture.state === 'idle') handleHover(e.clientX, e.clientY);
    });
    scope.listen(dom.viewport, 'pointerup', (e) => {
      dom.viewport.style.cursor = 'grab';
      const r = gesture.up(e);
      if (r?.type !== 'click') return;
      // 保留手势判定，等浏览器 click 提供原生连击计数再提交选择。
      clickPoint = r;
    });
    scope.listen(dom.viewport, 'click', (e) => {
      const point = clickPoint;
      clickPoint = null;
      if (point) handleSelect(point.x, point.y, e.detail);
    });
    scope.listen(dom.viewport, 'pointerleave', () => { if (gesture.state === 'idle') setHover(null); });
    // 右键：宿主可消费（跳跃模式）；未消费则视为取消
    scope.listen(dom.viewport, 'contextmenu', (e) => {
      e.preventDefault();
      if (onContextCb && compiled && onContextCb(hitAt(e.clientX, e.clientY))) return;
      if (onCancelCb) onCancelCb();
    });
    scope.listen(dom.viewport, 'pointercancel', (e) => gesture.cancel(e));
    scope.listen(dom.viewport, 'lostpointercapture', (e) => gesture.cancel(e));
    scope.listen(dom.viewport, 'wheel', (e) => {
      e.preventDefault();
      stopFocusAnim(); userCamTouched = true;
      const factor = e.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;
      const px = e.clientX - origin.left, py = e.clientY - origin.top;
      const next = zoomAtPose(pose, px, py, factor);
      if (next.scale !== clampScale(next.scale)) return;
      pose = next;
      applyCamera();
    }, { passive: false });
  }

  function hitAt(sx, sy) {
    const gridHit = screenToGrid(pose, origin, 50, compiled.grid, sx, sy);
    if (!gridHit) return null;
    const unitId = occupancy ? unitAt(occupancy, gridHit.col, gridHit.row) || null : null;
    return { ...gridHit, x: gridHit.col + .5, y: gridHit.row + .5, targetId: unitId, client: { x: sx, y: sy } };
  }
  function setHover(hit) {
    const key = hit ? hit.col + ',' + hit.row + ',' + (hit.targetId || '') : null;
    if (key === hoverKey) return;
    hoverKey = key;
    if (unitView) {
      unitView.clearFlag('t-unit-hover');
      if (hit && hit.targetId) unitView.setFlag(hit.targetId, 't-unit-hover', true);
    }
    if (onHoverCb) onHoverCb(hit);
  }
  function handleHover(sx, sy) { if (compiled) setHover(hitAt(sx, sy)); }

  function handleSelect(sx, sy, clickCount) {
    const hit = hitAt(sx, sy);
    if (onMapClickCb && hit && onMapClickCb(hit, clickCount)) return;
    selectedId = hit ? hit.targetId : null;
    redrawOverlay();
    if (onSelectCb) onSelectCb(selectedId ? viewData.units.find(u => u.id === selectedId) : null);
  }

  // ---------- 镜头：引导聚焦与自动跟随（保留玩家缩放；玩家拖拽即中断本次跟随） ----------
  function stopFocusAnim() { if (focusStop) { focusStop(); focusStop = null; } }
  function animateTo(target, ms) {
    stopFocusAnim();
    const from = { ...pose };
    const t0 = performance.now();
    return new Promise(resolve => {
      const cancelSettle = scope.settleOnDispose(resolve);
      const stop = scope.loop((now) => {
        const k = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        pose = { tx: from.tx + (target.tx - from.tx) * e, ty: from.ty + (target.ty - from.ty) * e, scale: from.scale + (target.scale - from.scale) * e };
        applyCamera();
        if (k >= 1) { focusStop = null; if (cancelSettle) cancelSettle(); resolve(true); return false; }
      });
      focusStop = () => { stop(); if (cancelSettle) cancelSettle(); resolve(false); };
    });
  }
  function centerPoseFor(wx, wy) {
    const safe = safeRectClient();
    return focusPose(wx, wy, pose.scale, origin, 50, { x: origin.left + safe.left + safe.width / 2, y: origin.top + safe.top + safe.height / 2 });
  }
  function isComfortablyVisible(points, inset = 0.18) {
    const safe = safeRectClient();
    const l = safe.left + safe.width * inset, r = safe.left + safe.width * (1 - inset);
    const t = safe.top + safe.height * inset, b = safe.top + safe.height * (1 - inset);
    return points.every(p => {
      const sx = pose.tx + pose.scale * 50 * p.x, sy = pose.ty + pose.scale * 50 * p.y;
      return sx >= l && sx <= r && sy >= t && sy <= b;
    });
  }
  // 引导：点集（行动者+目标）已舒适可见则不动；否则平移到其中心。玩家本次已手动操作则尊重玩家。
  function guideTo(points, { force = false, ms = FOCUS_MS } = {}) {
    if (!scope || !points.length) return Promise.resolve(false);
    if (!force && (userCamTouched || isComfortablyVisible(points))) return Promise.resolve(false);
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    return animateTo(centerPoseFor(cx, cy), ms);
  }
  function followWorld(wx, wy) {
    if (!scope || userCamTouched || focusStop) return;
    if (isComfortablyVisible([{ x: wx, y: wy }], 0.2)) return;
    const target = centerPoseFor(wx, wy);
    pose = { tx: pose.tx + (target.tx - pose.tx) * 0.12, ty: pose.ty + (target.ty - pose.ty) * 0.12, scale: pose.scale };
    applyCamera();
  }
  function focusWorld(wx, wy) { userCamTouched = false; return animateTo(centerPoseFor(wx, wy), 180); }
  // 运镜构图（高阶技能演出用）：定点定缩放 / 框住点集（pad 米留白，tight>1 更紧）；玩家本次动作已接管镜头则演出不再抢镜
  function poseAt(wx, wy, scale) {
    const safe = safeRectClient();
    return focusPose(wx, wy, clampScale(scale), origin, 50, { x: origin.left + safe.left + safe.width / 2, y: origin.top + safe.top + safe.height / 2 });
  }
  function poseFrame(points, { pad = 2.5, tight = 1 } = {}) {
    const safe = safeRectClient(), xs = points.map(p => p.x), ys = points.map(p => p.y);
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    const scale = Math.min(safe.width / ((maxX - minX) * 50), safe.height / ((maxY - minY) * 50)) * tight;
    return poseAt((minX + maxX) / 2, (minY + maxY) / 2, scale);
  }

  // 开场构图：框住我方所在区域（含留白），战场成为主视觉；不改网格与几何
  function openingPose(vd) {
    const safe = safeRectClient();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const heroes = vd.units.filter(u => u.side === 'hero');
    for (const u of (heroes.length ? heroes : vd.units)) {
      const p = vd.placementsById[u.id]; if (!p) continue;
      const fp = vd.footprintsById[u.id] || { width: 1, height: 1 };
      minX = Math.min(minX, p.col); minY = Math.min(minY, p.row);
      maxX = Math.max(maxX, p.col + fp.width); maxY = Math.max(maxY, p.row + fp.height);
    }
    if (!Number.isFinite(minX)) return fitPose(compiled.grid, 50, origin, safe);
    const pad = 3.2;
    const { columns, rows } = compiled.grid;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(columns, maxX + pad); maxY = Math.min(rows, maxY + pad);
    const w = maxX - minX, h = maxY - minY;
    const scale = clampScale(Math.min((safe.width - 24) / (w * 50), (safe.height - 24) / (h * 50)));
    return focusPose((minX + maxX) / 2, (minY + maxY) / 2, scale, origin, 50, { x: origin.left + safe.left + safe.width / 2, y: origin.top + safe.top + safe.height / 2 });
  }

  function rebuildOccupancy(vd) {
    occupancy = buildOccupancyIndex(
      vd.units.filter(u => u.bars.hp > 0).map(u => ({ unitId: u.id, col: vd.placementsById[u.id].col, row: vd.placementsById[u.id].row })),
      vd.footprintsById,
    );
  }

  // ---------- 组装实例 ----------
  function buildInstance(vd) {
    scope = createViewScope();
    token = vd.combatToken;
    viewData = vd;
    preview = null; hoverKey = null; userCamTouched = false;
    compiled = compileScene(vd.scene);
    worldW = compiled.grid.columns * 50; worldH = compiled.grid.rows * 50;
    buildDom();
    updateOrigin();
    setArt();
    dom.light.innerHTML = lightMarkup(compiled);
    rebuildOccupancy(vd);
    unitView = createUnitView(dom.unitLayer, { scope, metersPerArtPx: 1 / 50, onAvatarStatus: deps.onAvatarStatus });
    unitView.setUnits(vd.units, vd.placementsById);
    if (deps.onStage) deps.onStage({ stage: dom.avStage, shake: dom.shake, viewport: dom.viewport, scope, worldW, worldH });
    bindInput();
    const ro = new ResizeObserver(() => updateOrigin());
    ro.observe(dom.viewport);
    scope.observe(ro);
    pose = openingPose(vd);
    applyCamera();
    redrawOverlay();
  }
  // 底图：礼拜堂画法以 <img> 承载 SVG（一次栅格化，平移缩放只走合成，不重跑滤镜）
  function setArt() {
    const svg = renderSceneArt(compiled.artJson, compiled);
    if (compiled.style === 'chapel') {
      dom.art.innerHTML = '<img alt="" draggable="false" style="display:block;width:' + worldW + 'px;height:' + worldH + 'px;pointer-events:none;user-select:none" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '">';
    } else dom.art.innerHTML = svg;
  }
  // 开场镜头：全图俯瞰 → 缓推到我方所在房间（只是相机动画，不推进规则）
  function introSweep(ms = 1500) {
    if (!scope || !compiled) return Promise.resolve(false);
    const target = { ...pose };
    const safe = safeRectClient();
    pose = fitPose(compiled.grid, 50, origin, safe, 10);
    applyCamera();
    return animateTo(target, ms);
  }

  // 局部暖光：灯具格周围的柔光圈（纯美术，不参与规则）
  function lightMarkup(cmp) {
    const out = [];
    for (const obj of cmp.objectsIndex.values()) {
      if (obj.kind !== 'light' || !obj.at) continue;
      out.push('<i class="t-light-pool" style="left:' + (obj.at.col * 50) + 'px; top:' + (obj.at.row * 50) + 'px;"></i>');
    }
    return out.join('');
  }

  function mount(vd) { if (scope) destroy(); buildInstance(vd); }

  function update(vd) {
    if (!scope || !scope.isLive) { mount(vd); return; }
    token = vd.combatToken;
    const sceneChanged = JSON.stringify(viewData.scene) !== JSON.stringify(vd.scene);
    viewData = vd;
    if (sceneChanged) { compiled = compileScene(vd.scene); setArt(); dom.light.innerHTML = lightMarkup(compiled); }
    rebuildOccupancy(vd);
    unitView.syncUnits(vd.units, vd.placementsById);
    if (selectedId && !vd.units.some(u => u.id === selectedId)) selectedId = null;
    redrawOverlay();
  }

  function reset(vd) {
    stopFocusAnim();
    if (deps.onTeardown) deps.onTeardown();
    if (scope) scope.dispose();
    teardownDom();
    buildInstance(vd);
  }

  function teardownDom() {
    if (dom) { dom.viewport.remove(); dom = null; }
    unitView = null; occupancy = null; selectedId = null;
  }

  function destroy() {
    stopFocusAnim();
    if (deps.onTeardown) deps.onTeardown();
    if (scope) scope.dispose();
    scope = null; token = null; viewData = null; compiled = null;
    teardownDom();
    gesture = null;
    pose = createPose();
  }

  function getSnapshot() {
    return {
      mounted: !!(scope && scope.isLive),
      sceneId: viewData ? viewData.sceneId : null,
      battleId: viewData ? viewData.battleId : null,
      pose: { ...pose }, origin: { ...origin },
      selection: selectedId,
      scopeCounts: scope ? scope.counts() : null,
      grid: compiled ? compiled.grid : null,
      userCamTouched,
    };
  }

  // 地图提示（屏幕空间，跟随世界锚点）：费用/剩余额度/失败原因就地显示
  let hintAnchor = null;
  function placeHint() {
    if (!dom || !hintAnchor) return;
    const sx = pose.tx + pose.scale * 50 * hintAnchor.x, sy = pose.ty + pose.scale * 50 * hintAnchor.y;
    dom.hint.style.transform = 'translate(' + Math.round(sx) + 'px,' + Math.round(sy) + 'px)';
  }
  cameraListeners.add(placeHint);
  function setHint(anchor, html, tone) {
    if (!dom) return;
    hintAnchor = anchor;
    if (!anchor || !html) { dom.hint.className = 't-map-hint'; dom.hint.innerHTML = ''; return; }
    dom.hint.innerHTML = html;
    dom.hint.className = 't-map-hint t-visible' + (tone ? ' t-hint-' + tone : '');
    placeHint();
  }

  return {
    mount, update, reset, destroy,
    focusWorld, guideTo, followWorld,
    poseAt, poseFrame,
    cameraTo: (p, ms) => (userCamTouched ? Promise.resolve(false) : animateTo(p, ms)),
    cameraTouched: () => userCamTouched,
    introSweep,
    onCancel: (cb) => { onCancelCb = cb; },
    onContext: (cb) => { onContextCb = cb; },
    getWorldSize: () => ({ w: worldW, h: worldH }),
    beginAction: () => { userCamTouched = false; },
    setCamera: (p) => { pose = { ...p }; applyCamera(); },
    applyCamera,
    getPose: () => ({ ...pose }),
    getOrigin: () => ({ ...origin }),
    worldToScreenClient: (wx, wy) => ({ x: origin.left + pose.tx + pose.scale * 50 * wx, y: origin.top + pose.ty + pose.scale * 50 * wy }),
    screenToWorldClient: (sx, sy) => screenToWorld(pose, origin, 50, sx, sy),
    screenToGridClient: (sx, sy) => screenToGrid(pose, origin, 50, compiled.grid, sx, sy),
    selectAt: (sx, sy) => { handleSelect(sx, sy); return selectedId; },
    hoverAt: (sx, sy) => handleHover(sx, sy),
    getSelectedId: () => selectedId,
    getCompiled: () => compiled,
    getUnitView: () => unitView,
    getViewData: () => viewData,
    unitWorldCenter: (id) => {
      const p = viewData && viewData.placementsById[id];
      return p ? unitCenter(p, viewData.footprintsById[id] || { width: 1, height: 1 }) : null;
    },
    onSelect: (cb) => { onSelectCb = cb; },
    onMapClick: (cb) => { onMapClickCb = cb; },
    onHover: (cb) => { onHoverCb = cb; },
    onCamera: (fn) => { cameraListeners.add(fn); return () => cameraListeners.delete(fn); },
    setPreview: (data) => { preview = data; redrawOverlay(); },
    getPreview: () => preview,
    setHint,
    refreshHover: () => { hoverKey = null; },
    getSnapshot,
    getScope: () => scope,
    getDom: () => dom,
  };
}
