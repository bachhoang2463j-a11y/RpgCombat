// ==========================================
// 高阶技能运镜（L3/L4）：遮幅 + 推近出手者 → 爆发拍时停定格 → 按类型构图 → 首次命中顿帧 → 回位。
// 类型按真实结算判定（不按角色/条目硬编码）：创建区域 = 领域；有伤害段 = 单体/范围；其余 = 守护/召唤/增益。
// 条目声明 cine:false 则自行编排（如连续扫射）。时停/顿帧由导演 hold（暂停演出时钟 + 冻结视口动画）承担。
// 镜头被玩家本次动作接管（拖拽/缩放）即让出，仅保留画面层。
// ==========================================

const TAU = Math.PI * 2, PX = 50;
const rnd = (a, b) => a + Math.random() * (b - a);

// 世界米坐标 → 视口内像素
export function viewPt(sandbox, m) {
  const r = sandbox.getDom().viewport.getBoundingClientRect(), s = sandbox.worldToScreenClient(m.x, m.y);
  return { x: s.x - r.left, y: s.y - r.top, w: r.width, h: r.height };
}
// 电影遮幅：上下黑边滑入 → 保持 → 滑出（视口层）
export function letterbox(fx, ms, { h = 9, inMs = 280, outMs = 340 } = {}) {
  const bar = (edge, dir) => '<i style="position:absolute;left:0;right:0;' + edge + ':0;height:' + h + '%;background:linear-gradient(' + dir + ',#000 0%,#000 72%,rgba(0,0,0,.55) 100%);"></i>';
  const root = fx.screen(bar('top', '180deg') + bar('bottom', '0deg'), ms);
  [...root.children].forEach((el, i) => {
    const off = i ? 'translateY(100%)' : 'translateY(-100%)';
    el.animate([{ transform: off }, { transform: 'translateY(0)', offset: inMs / ms }, { transform: 'translateY(0)', offset: 1 - outMs / ms }, { transform: off }], { duration: ms, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' });
  });
}
// 时停定格画面（与 hold 同拍）：去色高对比（filter 可换暖调）+ 焦点放射速度线 + 焦点白闪，解冻后 200ms 褪去
export function timeStop(sandbox, fx, ms, m, { tint = 'rgba(254,243,199,.95)', lines = 30, filter = 'grayscale(1) contrast(1.45) brightness(1.06)' } = {}) {
  const p = viewPt(sandbox, m), R = Math.hypot(p.w, p.h), total = ms + 200;
  const ls = Array.from({ length: lines }, (_, i) => {
    const a = i / lines * TAU + rnd(-0.08, 0.08), r0 = R * rnd(0.14, 0.28);
    return '<line x1="' + (p.x + Math.cos(a) * r0).toFixed(1) + '" y1="' + (p.y + Math.sin(a) * r0).toFixed(1) + '" x2="' + (p.x + Math.cos(a) * R).toFixed(1) + '" y2="' + (p.y + Math.sin(a) * R).toFixed(1) +
      '" stroke="' + tint + '" stroke-width="' + rnd(1.2, 4.5).toFixed(1) + '" stroke-linecap="round"/>';
  }).join('');
  const root = fx.screen('<i style="position:absolute;inset:0;backdrop-filter:' + filter + ';-webkit-backdrop-filter:' + filter + ';"></i>' +
    '<svg width="100%" height="100%" style="position:absolute;inset:0;overflow:visible;transform-origin:' + p.x.toFixed(0) + 'px ' + p.y.toFixed(0) + 'px;mix-blend-mode:screen;">' + ls + '</svg>' +
    '<i style="position:absolute;inset:0;background:radial-gradient(circle at ' + p.x.toFixed(0) + 'px ' + p.y.toFixed(0) + 'px,rgba(255,255,255,.9) 0%,rgba(255,251,235,.35) 9%,rgba(255,255,255,0) 24%);mix-blend-mode:screen;"></i>', total);
  const [gray, svg, flash] = root.children, k = ms / total;
  gray.animate([{ opacity: 1 }, { opacity: 1, offset: k }, { opacity: 0 }], { duration: total, fill: 'forwards' });
  svg.animate([{ opacity: 0, transform: 'scale(1.18)' }, { opacity: 1, transform: 'scale(1)', offset: 0.22 }, { opacity: 0.85, offset: k }, { opacity: 0, transform: 'scale(.94)' }], { duration: total, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
  flash.animate([{ opacity: 1 }, { opacity: 0.4, offset: k }, { opacity: 0 }], { duration: total, fill: 'forwards' });
}
// 末击白闪（顿帧画面）：世界层锚定目标的白芯红晕光团，随镜头不漂移
export function hitFlash(fx, m, { ms = 260, color = 'rgba(254,202,202,.55)' } = {}) {
  const x = m.x * PX, y = m.y * PX, d = 4.2 * PX;
  fx.top('<i style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + d + 'px;height:' + d + 'px;margin:' + (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px;border-radius:50%;' +
    'background:radial-gradient(circle,rgba(255,255,255,.98) 0%,' + color + ' 38%,transparent 72%);mix-blend-mode:screen;"></i>', ms).firstChild
    .animate([{ transform: 'scale(.55)', opacity: 1 }, { transform: 'scale(1)', opacity: 0.8, offset: 0.4 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: ms, fill: 'forwards' });
}

// 类型模板：push=蓄势推近倍数，cap=构图缩放上限（相对出手前），frameMs=爆发后构图时长，hitStop=首次命中顿帧
const KINDS = {
  single:  { push: 1.6, cap: 1.7, tight: 1.1, pad: 2.2, frameMs: 220, bias: 0.25, hitStop: true,  stop: { tint: 'rgba(254,243,199,.95)' } },
  area:    { push: 1.5, cap: 1.5, tight: 1.05, pad: 2.4, frameMs: 300, bias: 0, hitStop: true,  stop: { tint: 'rgba(254,243,199,.95)' } },
  domain:  { push: 1.45, cap: 1.3, tight: 0.95, pad: 3, frameMs: 900, bias: 0, hitStop: false, stop: { tint: 'rgba(209,250,229,.9)', lines: 22 } },
  support: { push: 1.5, cap: 1.5, tight: 1.05, pad: 2.6, frameMs: 380, bias: 0, hitStop: false, stop: { tint: 'rgba(253,230,138,.95)', lines: 24, filter: 'sepia(.55) saturate(1.35) contrast(1.15) brightness(1.08)' } },
};

export function cineKind(result, hits, regions) {
  if (regions.length) return 'domain';
  const dmg = hits.filter(h => (h.segments || [h]).some(s => !s.heal));
  if (!dmg.length) return 'support';
  return dmg.length === 1 && (result.skill?.range?.type || '单体') === '单体' ? 'single' : 'area';
}

// env: { sandbox, fx, hold, grade, totalMs, chargeMs, result, hits, regions, shape, centerOf }
export function startCine(env) {
  const { sandbox: sb, fx, hold, grade, result, hits, centerOf } = env;
  const kind = cineKind(result, hits, env.regions), K = KINDS[kind], epic = grade === 'L4';
  const home = sb.getPose();
  const cm = centerOf(result.casterId);
  const tgtIds = [...new Set([...hits.map(h => h.targetId), ...(result.effects || []).map(e => e.targetId)])].filter(id => id !== result.casterId);
  const tpts = tgtIds.map(centerOf).filter(Boolean);
  const focus = tpts[0] || result.aim || cm;
  const box = env.shape ? [{ x: env.shape.center.x - env.shape.radius, y: env.shape.center.y - env.shape.radius }, { x: env.shape.center.x + env.shape.radius, y: env.shape.center.y + env.shape.radius }] : [];
  const stopMs = epic ? 180 : 120, hitMs = epic ? 130 : 90;
  let bursted = false, hitDone = false, framed = null;

  // ① 蓄势：遮幅入场 + 推近出手者（略偏向目标方向）
  letterbox(fx, env.totalMs + stopMs + hitMs + 700, { h: epic ? 11 : 8 });
  const dx = focus.x - cm.x, dy = focus.y - cm.y, L = Math.hypot(dx, dy) || 1, b = Math.min(1.2, L * 0.3);
  sb.cameraTo(sb.poseAt(cm.x + dx / L * b, cm.y + dy / L * b, home.scale * K.push * (epic ? 1.12 : 1)), Math.min(700, env.chargeMs * 0.8));

  return {
    kind,
    // ② 爆发拍：时停定格 → 解冻后按类型构图
    burst() {
      if (bursted) return; bursted = true;
      hold(stopMs, () => timeStop(sb, fx, stopMs, cm, K.stop)).then(ok => {
        if (!ok) return;
        const pts = [cm, ...(kind === 'domain' ? [] : tpts), ...box];
        if (!tpts.length && !box.length && result.aim) pts.push(result.aim);
        const fr = sb.poseFrame(pts, { pad: K.pad, tight: K.tight });
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const C = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
        framed = { x: C.x + (focus.x - C.x) * K.bias, y: C.y + (focus.y - C.y) * K.bias, scale: Math.min(fr.scale, home.scale * K.cap) };
        sb.cameraTo(sb.poseAt(framed.x, framed.y, framed.scale), K.frameMs);
      });
    },
    // ③ 首次命中：顿帧 + 镜头向命中点急推 + 白闪（仅攻击类）
    firstHit(targetId) {
      if (!K.hitStop || !bursted || hitDone || !framed) return;
      hitDone = true;
      const m = centerOf(targetId) || focus;
      hold(hitMs, () => {
        hitFlash(fx, m);
        sb.cameraTo(sb.poseAt(framed.x + (m.x - framed.x) * 0.3, framed.y + (m.y - framed.y) * 0.3, framed.scale * 1.08), 50);
      });
    },
    // ④ 回位：镜头缓回出手前构图
    end() { return sb.cameraTo(home, 380); },
  };
}
