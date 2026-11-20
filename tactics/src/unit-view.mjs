// ==========================================
// 战棋 P02 单位视图：圆形头像（正立）+ 阵营色外环 + 独立朝向箭头 + 名字/资源条
// 视觉结构：世界锚点（left/top = 世界中心美术 px，随相机）→ billboard 视觉子包
// （逆缩放 1/scale，屏幕显示尺度恒定：正常圆标 32px / 大型 40px / 资源条 64px）。
// 只有 direction 子层随 facing 旋转；头像/名字/状态条不转。
// 本层不读头像 DOM rect 求占位；资源条只读 P01 合并后的资源对象显示值。
// 头像链：P01 已明确给定 img 优先 → window.MMSImages?.resolveAvatar(name) → 内嵌首字 SVG。
// ==========================================

import { unitCenter } from './geometry.mjs';

// 首字占位头像（本地 SVG data URI，无外链）
function fallbackAvatar(name) {
  const ch = String(name || '?').trim().charAt(0) || '?';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" rx="16" fill="#334155"/>' +
    '<text x="16" y="21" text-anchor="middle" font-size="14" fill="#cbd5e1" font-family="sans-serif">' + ch + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// 头像 URL 解析（计划 2.5 顺序）
export function resolveAvatarUrl(unit) {
  if (unit.img) return unit.img; // P01 已明确给定（含 YAML 显式/合并结果）
  const mms = (typeof window !== 'undefined') ? window.MMSImages : null;
  if (mms && typeof mms.resolveAvatar === 'function') {
    const url = mms.resolveAvatar(unit.name);
    if (url) return url;
  }
  return fallbackAvatar(unit.name);
}

export function createUnitView(parent, deps) {
  const { scope, metersPerArtPx } = deps;
  const Q = 1 / metersPerArtPx;
  const nodes = new Map(); // unitId → { root, billboard, direction, barsHp, barsMp, unit, placement }
  let cameraScale = 1;

  const SIDE_CLASS = { hero: 't-side-hero', enemy: 't-side-enemy' };

  function buildNode(unit, placement) {
    const fp = unit.footprint || { width: 1, height: 1 };
    const c = unitCenter(placement, fp);
    const big = fp.width > 1 || fp.height > 1;
    const diameter = big ? 40 : 32;

    const root = document.createElement('div');
    root.className = 't-unit';
    root.setAttribute('data-unit-id', unit.id);
    root.style.cssText = 'position:absolute; left:' + (c.x * Q) + 'px; top:' + (c.y * Q) + 'px; width:0; height:0;';

    // 2×2 等多格单位：真实占地边界框（世界尺寸，不逆缩放；仅视觉提示，命中仍走逻辑占格索引）
    if (big) {
      const box = document.createElement('div');
      box.className = 't-unit-footprint';
      box.style.cssText = 'position:absolute; left:' + (fp.width * Q / -2) + 'px; top:' + (fp.height * Q / -2) + 'px; width:' + (fp.width * Q) + 'px; height:' + (fp.height * Q) + 'px;';
      root.appendChild(box);
    }

    const billboard = document.createElement('div');
    billboard.className = 't-unit-billboard';
    billboard.style.cssText = 'position:absolute; left:0; top:0; transform: translate(-50%,-50%) scale(' + (1 / cameraScale) + '); width:0; height:0;';
    billboard.innerHTML =
      '<div class="t-unit-name">' + escapeHtml(unit.name) + '</div>' +
      '<div class="t-unit-medal ' + (SIDE_CLASS[unit.side] || 't-side-hero') + '" style="--d:' + diameter + 'px;">' +
        '<div class="t-unit-avatar"><img alt="" draggable="false"></div>' +
        '<svg class="t-unit-direction" viewBox="-22 -22 44 44"><polygon points="0,-19 5,-9 0,-12 -5,-9" fill="#facc15" stroke="#78350f" stroke-width="1"/></svg>' +
      '</div>' +
      '<div class="t-unit-bars">' +
        '<div class="t-bar t-bar-hp"><i></i></div>' +
        '<div class="t-bar t-bar-mp"><i></i></div>' +
      '</div>';

    const img = billboard.querySelector('img');
    img.src = resolveAvatarUrl(unit);
    img.onerror = () => { img.onerror = null; if (scope.isLive) img.src = fallbackAvatar(unit.name); };

    root.appendChild(billboard);
    parent.appendChild(root);
    scope.addNode(root);

    const rec = {
      root, billboard,
      direction: billboard.querySelector('.t-unit-direction'),
      hpBar: billboard.querySelector('.t-bar-hp i'),
      mpBar: billboard.querySelector('.t-bar-mp i'),
      unit, placement, bars: unit.bars || null,
    };
    nodes.set(unit.id, rec);
    applyFacing(rec);
    applyBars(rec);
    return rec;
  }

  function applyFacing(rec) {
    rec.direction.style.transform = 'rotate(' + (rec.placement.facing || 0) + 'deg)';
  }

  // 资源条只显示宿主传入的 bars 快照；资源真值始终在 P01 合并后的资源对象，不在视图层复制
  function applyBars(rec) {
    const b = rec.bars || {};
    const hp = b.maxHp ? Math.max(0, Math.min(1, (b.hp || 0) / b.maxHp)) : 1;
    const mp = b.maxMp ? Math.max(0, Math.min(1, (b.mp || 0) / b.maxMp)) : 1;
    rec.hpBar.style.width = (hp * 100).toFixed(1) + '%';
    rec.mpBar.style.width = (mp * 100).toFixed(1) + '%';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  // 全量建层（覆盖式；供 mount/reset 重建）
  function setUnits(units, placementsById) {
    for (const rec of nodes.values()) scope.removeNode(rec.root);
    nodes.clear();
    for (const unit of units) {
      const placement = placementsById[unit.id];
      if (!placement) continue;
      buildNode(unit, placement);
    }
  }

  function syncUnits(units, placementsById) {
    const ids = new Set(units.map(u => u.id));
    for (const [id, rec] of nodes) {
      if (!ids.has(id)) { scope.removeNode(rec.root); nodes.delete(id); }
    }
    for (const unit of units) {
      const rec = nodes.get(unit.id);
      if (rec && JSON.stringify(rec.unit.footprint) !== JSON.stringify(unit.footprint)) {
        scope.removeNode(rec.root); nodes.delete(unit.id);
      }
      if (!nodes.has(unit.id)) buildNode(unit, placementsById[unit.id]);
      else updateUnit(unit.id, { unit, placement: placementsById[unit.id] });
    }
  }

  function updateUnit(id, patch) {
    const rec = nodes.get(id);
    if (!rec) return;
    if (patch.unit) {
      rec.unit = patch.unit;
      rec.bars = patch.unit.bars;
      applyBars(rec);
      if (patch.unit.img !== undefined) {
        const img = rec.billboard.querySelector('img');
        img.src = resolveAvatarUrl(patch.unit);
      }
    }
    if (patch.bars) { rec.bars = patch.bars; applyBars(rec); }
    if (patch.placement) {
      rec.placement = patch.placement;
      const c = unitCenter(rec.placement, rec.unit.footprint || { width: 1, height: 1 });
      rec.root.style.left = (c.x * Q) + 'px';
      rec.root.style.top = (c.y * Q) + 'px';
      applyFacing(rec);
    }
  }

  function setFacing(id, deg) {
    const rec = nodes.get(id);
    if (!rec) return;
    rec.placement = { ...rec.placement, facing: ((Math.round(Number(deg) || 0) % 360) + 360) % 360 };
    applyFacing(rec);
  }

  // 相机变化：billboard 逆缩放保持屏幕显示尺度（父锚点仍完整跟随世界相机）
  function onCameraChange(pose) {
    cameraScale = pose.scale;
    const inv = 1 / cameraScale;
    for (const rec of nodes.values()) {
      rec.billboard.style.transform = 'translate(-50%,-50%) scale(' + inv + ')';
    }
  }

  // 战棋宿主实体 DOM 解析：按稳定 ID 查地图圆标（不沿用生产"先找底部 hero-card"顺序）
  function getEntitySpriteDom(entityOrId) {
    const id = entityOrId && typeof entityOrId === 'object' ? entityOrId.id : String(entityOrId || '');
    const rec = nodes.get(id);
    return rec ? rec.root : null;
  }

  return { setUnits, syncUnits, updateUnit, setFacing, onCameraChange, getEntitySpriteDom, nodes };
}
