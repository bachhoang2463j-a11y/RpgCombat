// ==========================================
// 战棋 P02 相机：唯一 { tx, ty, scale } 矩阵 + 世界↔屏幕双向投影 + 鼠标手势状态机
// 移植 demo-bigmap（D:/Project/MiniMapStatus）的 transform 模型：
//   world-root: transform-origin 0 0; translate(tx,ty) scale(scale)（先 scale 后 translate，tx/ty 为屏幕像素平移量）
// 公式（视口在 iframe client 坐标原点 (L,T)，q=美术像素/米）：
//   screen = L + tx + scale*q*world ; world = (screen - L - tx)/(scale*q)
// 本模块只管相机，不保存规则位置；scale 下限 1e-6 仅为除零数学完备性，不是玩法上限。
// ==========================================

// ---------- 纯投影（Node 可测） ----------

export function createPose(tx = 0, ty = 0, scale = 1) {
  return { tx, ty, scale };
}

// origin = { left, top }：地图视口在 iframe client 坐标中的原点
export function worldToScreen(pose, origin, q, wx, wy) {
  return {
    x: origin.left + pose.tx + pose.scale * q * wx,
    y: origin.top + pose.ty + pose.scale * q * wy,
  };
}

export function screenToWorld(pose, origin, q, sx, sy) {
  return {
    x: (sx - origin.left - pose.tx) / (pose.scale * q),
    y: (sy - origin.top - pose.ty) / (pose.scale * q),
  };
}

// 逻辑格逆投影：世界范围外返回 null（floor，不 clamp 成边缘格）
export function screenToGrid(pose, origin, q, grid, sx, sy) {
  const w = screenToWorld(pose, origin, q, sx, sy);
  const col = Math.floor(w.x);
  const row = Math.floor(w.y);
  if (col < 0 || col >= grid.columns || row < 0 || row >= grid.rows) return null;
  return { col, row, world: w };
}

// 光标锚定缩放（demo-bigmap zoomAt 同式）：保持光标下世界点不动
export function zoomAtPose(pose, px, py, factor) {
  const ns = Math.max(1e-6, pose.scale * factor);
  return {
    tx: px - ((px - pose.tx) * ns) / pose.scale,
    ty: py - ((py - pose.ty) * ns) / pose.scale,
    scale: ns,
  };
}

// 聚焦：把世界点 (wx,wy) 投到 safeRect 中心（safeCenter 为 client 坐标）
export function focusPose(wx, wy, scale, origin, q, safeCenter) {
  return {
    tx: safeCenter.x - origin.left - scale * q * wx,
    ty: safeCenter.y - origin.top - scale * q * wy,
    scale,
  };
}

// 初次 fit：让整张图适配可用矩形（含留白边距），取可容纳的最大整倍缩放
export function fitPose(grid, q, origin, safeRect, margin = 24) {
  const worldW = grid.columns, worldH = grid.rows;
  const availW = Math.max(1, safeRect.width - margin * 2);
  const availH = Math.max(1, safeRect.height - margin * 2);
  const scale = Math.min(availW / (worldW * q), availH / (worldH * q));
  const cx = origin.left + safeRect.left + safeRect.width / 2;
  const cy = origin.top + safeRect.top + safeRect.height / 2;
  return {
    tx: cx - origin.left - scale * q * worldW / 2,
    ty: cy - origin.top - scale * q * worldH / 2,
    scale,
  };
}

// ---------- 手势状态机（纯逻辑；DOM 事件绑定在 sandbox） ----------
// pending（未越阈值，不平移不选取）→ dragging（永久，起始 pose + 总位移）；
// pointerup：pending 才产生 click；dragging 只结束拖拽（拖远再拖回原点也不是点击）。

export function createGesture({ threshold = 6 } = {}) {
  let st = 'idle';
  let pointerId = null;
  let startX = 0, startY = 0;
  let startPose = null;
  let maxDist = 0;

  return {
    get state() { return st; },
    // e: { pointerId, clientX, clientY }；pose 为按下时相机快照
    down(e, pose) {
      if (st !== 'idle') return null;
      pointerId = e.pointerId;
      startX = e.clientX; startY = e.clientY;
      startPose = { ...pose };
      maxDist = 0;
      st = 'pending';
      return { state: st };
    },
    move(e) {
      if (st === 'idle' || e.pointerId !== pointerId) return null;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      maxDist = Math.max(maxDist, Math.hypot(dx, dy));
      if (st === 'pending') {
        if (maxDist < threshold) return null;
        st = 'dragging'; // 永久转换，不回退
      }
      if (st === 'dragging') {
        return {
          state: st,
          pose: { tx: startPose.tx + dx, ty: startPose.ty + dy, scale: startPose.scale },
        };
      }
      return null;
    },
    // 返回 { type:'click', x, y } | { type:'drag-end' } | null
    up(e) {
      if (st === 'idle' || e.pointerId !== pointerId) return null;
      const wasPending = st === 'pending';
      st = 'idle'; pointerId = null; startPose = null;
      return wasPending ? { type: 'click', x: e.clientX, y: e.clientY } : { type: 'drag-end' };
    },
    // pointercancel / lostpointercapture：只结束状态，不选取
    cancel(e) {
      if (st === 'idle' || (e && e.pointerId !== undefined && e.pointerId !== pointerId)) return null;
      st = 'idle'; pointerId = null; startPose = null;
      return { type: 'cancel' };
    },
  };
}
