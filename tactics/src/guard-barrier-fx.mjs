// ==========================================
// 舍身格挡 / 召唤守护 / 【肃正】结界 世界层演出（只消费后端权威结果，不重算落点/耐久/致死）
// 舍身：原版 playRescueSheshen（index.html:13523，demo-rescue-moments 同款）决意 0–340ms → 突进 335–630ms → 到位待格挡；
//       格挡在受击揭示拍点（parry_perfect + heavy 震屏 + 蓝色盾弧），不归位（跳过 doReturn/release）。
// 召唤守护：原版 playSummonGuard（index.html:14082）180ms 冲刺 → 格挡（parry）。
// 结界：原版 .team-barrier-wrapper 三主题（gold 法术 / blue 远程 / white 其余）矩形穹顶改为按 barrier.center/radius 的圆形穹顶；
//       受击 applyBarrierHit（涟漪 + 蜂窝聚光 + 穹顶压缩）、减益阻挡 triggerBarrierDebuffBlock（atk2）、击碎 triggerBarrierShatter（色差闪断 + 80 片六边晶片，atk1）。
// ==========================================
import { PX, worldPx, floatText } from './vfx-primitives.mjs';
import { unitCenter } from './geometry.mjs';

export const GUARD_AUDIO_KEYS = ['sheshen_armor_step', 'parry_perfect'];
export const BARRIER_AUDIO_KEYS = ['atk1', 'atk2', 'shieldUp'];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------- 舍身 / 召唤守护 ----------
function guardPolyline(guard, fp) {
  const pts = [guard.startPosition];
  for (const p of (guard.path || []).slice(1)) pts.push(unitCenter(p, fp));
  const last = pts[pts.length - 1];
  if (Math.hypot(last.x - guard.contactPoint.x, last.y - guard.contactPoint.y) > 1e-6) pts.push(guard.contactPoint);
  return pts;
}
function pointOnPolyline(pts, k) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(d); total += d; }
  if (total <= 0) return pts[pts.length - 1];
  let left = k * total;
  for (let i = 0; i < segs.length; i++) {
    if (left <= segs[i] || i === segs.length - 1) {
      const t = segs[i] ? Math.min(1, left / segs[i]) : 1;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t };
    }
    left -= segs[i];
  }
  return pts[pts.length - 1];
}
const facingToward = (from, to) => Math.atan2(to.x - from.x, -(to.y - from.y)) * 180 / Math.PI;

// 出发点残影：克隆单位视觉（去掉身份属性，避免被视听底座按 id 选中）
function ghostOf(env, id) {
  const rec = env.view.nodes && env.view.nodes.get(id);
  if (!rec || !rec.root) return null;
  const g = rec.root.cloneNode(true);
  for (const el of [g, ...g.querySelectorAll('*')]) {
    el.removeAttribute('id');
    for (const a of [...el.attributes]) if (a.name.startsWith('data-')) el.removeAttribute(a.name);
  }
  g.style.pointerEvents = 'none';
  g.style.filter = 'hue-rotate(10deg) saturate(1.4) brightness(1.1) drop-shadow(0 0 10px rgba(56,189,248,0.75))';
  return g;
}

const readyRings = new Map();   // guardKey → 待格挡虚线环层
const guardKey = g => g.segmentId + ':' + g.guardianId;

// 冲刺阶段：守护者从 startPosition 沿 path 到 contactPoint（显示位置插值，不回写规则站位）
export async function playGuardDash(env, guard) {
  const { fx, view, tween, wait } = env;
  const id = guard.guardianId, fp = env.footprint || { width: 1, height: 1 };
  const summon = guard.reason === 'summon-lethal-guard';
  const pts = guardPolyline(guard, fp);
  const s = worldPx(guard.startPosition), c = worldPx(guard.contactPoint);
  view.setDisplayFacing(id, facingToward(guard.contactPoint, guard.origin));
  if (!summon) {
    // 1. 决意蓄势（0–340ms）：蓝色决意光环 + 16 颗光点向身收拢
    const ring = fx.top('<i style="position:absolute;left:' + s.x + 'px;top:' + s.y + 'px;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;border:2px solid rgba(56,189,248,0.85);box-shadow:0 0 20px rgba(56,189,248,0.6),inset 0 0 16px rgba(56,189,248,0.35);"></i>', 420);
    ring.firstChild.animate([{ transform: 'scale(0.7)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 0.95, offset: 0.5 }, { transform: 'scale(0.92)', opacity: 0 }], { duration: 400, easing: 'cubic-bezier(0.28,0.82,0.34,1)', fill: 'forwards' });
    let orbs = '';
    for (let i = 0; i < 16; i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(34, 58);
      orbs += '<i style="position:absolute;left:' + s.x + 'px;top:' + s.y + 'px;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:radial-gradient(circle,#e0f2fe 0%,#38bdf8 55%,transparent 80%);mix-blend-mode:screen;" data-dx="' + (Math.cos(a) * d).toFixed(1) + '" data-dy="' + (Math.sin(a) * d).toFixed(1) + '"></i>';
    }
    const orbLayer = fx.top(orbs, 380);
    [...orbLayer.children].forEach(el => el.animate([{ transform: 'translate(' + el.dataset.dx + 'px,' + el.dataset.dy + 'px) scale(1)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translate(0,0) scale(0.4)', opacity: 0 }], { duration: 340, easing: 'cubic-bezier(0.4,0,0.6,1)', fill: 'forwards' }));
    if (!(await wait(335))) return false;
  }
  // 2. 重甲突进（335–630ms；召唤 180ms）：出发点残影 + 沿路径光点拖尾
  const ghost = ghostOf(env, id);
  if (ghost) {
    const gl = fx.top('', 460);
    gl.appendChild(ghost);
    ghost.animate([{ transform: 'scale(1)', opacity: 0.68 }, { transform: 'scale(0.95)', opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
  }
  if (summon) fx.sfx('sheshen_armor_step', 0.68);
  let trail = '';
  for (let i = 0; i < 10; i++) {
    const p = worldPx(pointOnPolyline(pts, i / 10));
    trail += '<i style="position:absolute;left:' + p.x.toFixed(1) + 'px;top:' + (p.y + rnd(-8, 8)).toFixed(1) + 'px;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:radial-gradient(circle,#f0f9ff 0%,#38bdf8 50%,transparent 78%);mix-blend-mode:screen;opacity:0;"></i>';
  }
  const dashMs = summon ? 180 : 290;
  const tl = fx.top(trail, dashMs + 420);
  [...tl.children].forEach((el, i) => el.animate([{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 0.95, transform: 'scale(1)', offset: 0.2 }, { opacity: 0, transform: 'scale(0.3)' }], { duration: 380, delay: i / 10 * dashMs, fill: 'both' }));
  if (!(await tween(dashMs, t => { const p = pointOnPolyline(pts, 1 - Math.pow(1 - t, 3)); view.setDisplayPos(id, p.x, p.y); }))) return false;
  view.setDisplayPos(id, guard.contactPoint.x, guard.contactPoint.y);
  // 3. 到位：身前虚线守护环定格，等受击揭示拍点格挡
  readyRings.set(guardKey(guard), fx.top('<i style="position:absolute;left:' + c.x + 'px;top:' + c.y + 'px;width:' + (summon ? 92 : 116) + 'px;height:' + (summon ? 92 : 116) + 'px;margin:-' + (summon ? 46 : 58) + 'px 0 0 -' + (summon ? 46 : 58) + 'px;border-radius:50%;border:2px dashed rgba(125,211,252,0.75);box-shadow:inset 0 0 22px rgba(56,189,248,0.28),0 0 22px rgba(56,189,248,0.45);"></i>', 6000));
  readyRings.get(guardKey(guard)).firstChild.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 4000, iterations: Infinity });
  return true;
}

// 格挡冲击（受击揭示拍点）：盾弧朝攻击来源 + 辉光 + 火花锥 + 双冲击环 + parry + 后坐
export function playGuardBlock(env, guard) {
  const { fx, view, tween } = env;
  const summon = guard.reason === 'summon-lethal-guard';
  const ready = readyRings.get(guardKey(guard));
  if (ready) { ready.remove(); readyRings.delete(guardKey(guard)); }
  const cp = guard.contactPoint, o = guard.origin || cp;
  const ang = Math.atan2(o.y - cp.y, o.x - cp.x);
  const bp = worldPx({ x: cp.x + Math.cos(ang) * 0.32, y: cp.y + Math.sin(ang) * 0.32 });
  const size = summon ? 100 : 124, uid = fx.uid();
  const shield = fx.top('<div style="position:absolute;left:' + bp.x + 'px;top:' + bp.y + 'px;width:' + size + 'px;height:' + size + 'px;transform:translate(-50%,-50%) rotate(' + (ang * 180 / Math.PI + 90).toFixed(1) + 'deg);">' +
    '<svg viewBox="0 0 120 120" width="100%" height="100%" style="overflow:visible;"><defs>' +
    '<linearGradient id="gb-shd-' + uid + '" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#0284c7" stop-opacity="0.12"/><stop offset="50%" stop-color="#bae6fd" stop-opacity="0.98"/><stop offset="100%" stop-color="#0284c7" stop-opacity="0.12"/></linearGradient>' +
    '<radialGradient id="gb-core-' + uid + '" cx="50%" cy="48%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="38%" stop-color="#38bdf8" stop-opacity="0.55"/><stop offset="100%" stop-color="#0369a1" stop-opacity="0"/></radialGradient>' +
    '<filter id="gb-glow-' + uid + '" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
    '<circle cx="60" cy="56" r="48" fill="url(#gb-core-' + uid + ')" data-gb="bloom" style="transform-origin:60px 56px;mix-blend-mode:screen;"/>' +
    '<g filter="url(#gb-glow-' + uid + ')" data-gb="arc" style="transform-origin:60px 60px;"><path d="M14 76 Q60 10 106 76 Q60 30 14 76 Z" fill="url(#gb-shd-' + uid + ')"/><path d="M20 70 Q60 16 100 70" fill="none" stroke="#e0f2fe" stroke-width="4" stroke-linecap="round"/></g></svg></div>', 520);
  const arcMs = summon ? 360 : 480;
  shield.querySelector('[data-gb=arc]').animate([{ transform: 'scale(0.55)', opacity: 0 }, { transform: 'scale(1.14)', opacity: 1, offset: 0.18 }, { transform: 'scale(1.03)', opacity: 0.94, offset: 0.72 }, { transform: 'scale(1.16)', opacity: 0 }], { duration: arcMs, easing: 'cubic-bezier(0.16,0.88,0.3,1)', fill: 'forwards' });
  shield.querySelector('[data-gb=bloom]').animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: summon ? 310 : 380, easing: 'ease-out', fill: 'forwards' });
  // 火花锥：朝攻击来源方向迸散
  let sparks = '';
  const n = summon ? 16 : 26;
  for (let i = 0; i < n; i++) {
    const a = ang + rnd(-1.1, 1.1), d = rnd(28, 86), col = pick(['#ffffff', '#bae6fd', '#38bdf8', '#7dd3fc']);
    sparks += '<i style="position:absolute;left:' + (bp.x + rnd(-8, 8)).toFixed(1) + 'px;top:' + bp.y.toFixed(1) + 'px;width:' + rnd(4, 7).toFixed(1) + 'px;height:2px;margin:-1px 0 0 -3px;border-radius:2px;background:' + col + ';box-shadow:0 0 6px ' + col + ';transform-origin:center;" data-a="' + a.toFixed(3) + '" data-d="' + d.toFixed(1) + '"></i>';
  }
  const sl = fx.top(sparks, 760);
  [...sl.children].forEach(el => {
    const a = +el.dataset.a, d = +el.dataset.d, r = a * 180 / Math.PI;
    el.animate([{ transform: 'translate(0,0) rotate(' + r + 'deg)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * d).toFixed(1) + 'px,' + (Math.sin(a) * d + d * 0.25).toFixed(1) + 'px) rotate(' + r + 'deg) scaleX(0.4)', opacity: 0 }], { duration: rnd(380, 700), easing: 'cubic-bezier(0.1,0.7,0.3,1)', fill: 'forwards' });
  });
  for (let i = 0; i < 2; i++) {
    const r1 = (summon ? 52 : 72) + i * (summon ? 20 : 26);
    const ring = fx.top('<i style="position:absolute;left:' + bp.x + 'px;top:' + bp.y + 'px;width:' + r1 * 2 + 'px;height:' + r1 * 2 + 'px;margin:-' + r1 + 'px 0 0 -' + r1 + 'px;border-radius:50%;border:' + (3.8 - i) + 'px solid ' + (i ? 'rgba(56,189,248,0.72)' : 'rgba(224,242,254,0.9)') + ';"></i>', 520);
    ring.firstChild.animate([{ transform: 'scale(0.14)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 300 + i * 160, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
  }
  fx.sfx('parry_perfect', summon ? 0.84 : 0.98);
  fx.shake(summon ? 'medium' : 'heavy');
  floatText(fx, worldPx(cp).x, worldPx(cp).y - 40, summon ? '🛡️ 召唤守护' : '🛡️ 舍身格挡', '#bae6fd', '#0369a1', { ms: 900, size: 14 });
  // 后坐：被攻击方向推回再站定（显示层，最终停在 contactPoint）
  const back = { x: -Math.cos(ang), y: -Math.sin(ang) };
  tween(summon ? 320 : 480, t => {
    const k = t < 0.24 ? t / 0.24 * 0.26 : t < 0.62 ? 0.26 - (t - 0.24) / 0.38 * 0.06 : 0.2 * (1 - (t - 0.62) / 0.38);
    view.setDisplayPos(guard.guardianId, cp.x + back.x * k, cp.y + back.y * k);
  }).then(() => view.setDisplayPos(guard.guardianId, cp.x, cp.y));
}

// ---------- 【肃正】结界穹顶 ----------
const THEMES = {
  gold: { dome: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, rgba(245,158,11,0.04) 65%, rgba(217,119,6,0.18) 100%)', shadow: '0 0 25px rgba(245,158,11,0.3), inset 0 0 20px rgba(251,191,36,0.25), inset 0 0 50px rgba(217,119,6,0.12)',
    border: 'rgba(251,191,36,0.65)', flow: 'rgba(254,240,138,0.85)', mesh: 'rgba(251,191,36,0.22)', svg: ['#fef08a', '#f59e0b', '#b45309'],
    badgeBg: 'linear-gradient(135deg, rgba(120,53,15,0.95), rgba(69,26,3,0.95))', badgeBorder: 'rgba(253,230,138,0.85)', badgeShadow: '0 4px 16px rgba(245,158,11,0.6), inset 0 0 8px rgba(251,191,36,0.35)',
    track: 'rgba(251,191,36,0.4)', fillA: '#f59e0b', fillB: '#fef08a', fillShadow: '#fbbf24', text: '#fde68a',
    ripple: '#fef08a', rippleBg: 'radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(251,191,36,0.4) 40%, transparent 75%)', rippleShadow: '0 0 25px #fbbf24, 0 0 50px #f59e0b, inset 0 0 20px #fff7ed',
    hex: 'radial-gradient(circle, rgba(254,240,138,0.9) 0%, rgba(245,158,11,0.5) 45%, transparent 75%)', hit: '0 0 45px rgba(254,240,138,0.8), inset 0 0 40px rgba(251,191,36,0.7)',
    shard: [251, 191, 36], shardStroke: '#fef08a' },
  blue: { dome: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, rgba(14,165,233,0.04) 65%, rgba(2,132,199,0.18) 100%)', shadow: '0 0 25px rgba(14,165,233,0.3), inset 0 0 20px rgba(34,211,238,0.25), inset 0 0 50px rgba(3,105,161,0.12)',
    border: 'rgba(34,211,238,0.65)', flow: 'rgba(165,243,252,0.85)', mesh: 'rgba(34,211,238,0.22)', svg: ['#67e8f9', '#0ea5e9', '#0369a1'],
    badgeBg: 'linear-gradient(135deg, rgba(12,74,110,0.95), rgba(8,47,73,0.95))', badgeBorder: 'rgba(125,211,252,0.85)', badgeShadow: '0 4px 16px rgba(14,165,233,0.6), inset 0 0 8px rgba(34,211,238,0.35)',
    track: 'rgba(34,211,238,0.4)', fillA: '#0ea5e9', fillB: '#7dd3fc', fillShadow: '#38bdf8', text: '#a5f3fc',
    ripple: '#7dd3fc', rippleBg: 'radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(14,165,233,0.4) 40%, transparent 75%)', rippleShadow: '0 0 25px #38bdf8, 0 0 50px #0284c7, inset 0 0 20px #e0f2fe',
    hex: 'radial-gradient(circle, rgba(125,211,252,0.9) 0%, rgba(14,165,233,0.5) 45%, transparent 75%)', hit: '0 0 45px rgba(125,211,252,0.8), inset 0 0 40px rgba(34,211,238,0.7)',
    shard: [56, 189, 248], shardStroke: '#e0f2fe' },
  white: { dome: 'radial-gradient(circle, rgba(226,232,240,0.12) 0%, rgba(148,163,184,0.04) 65%, rgba(100,116,139,0.18) 100%)', shadow: '0 0 25px rgba(203,213,225,0.3), inset 0 0 20px rgba(226,232,240,0.25), inset 0 0 50px rgba(100,116,139,0.12)',
    border: 'rgba(226,232,240,0.65)', flow: 'rgba(248,250,252,0.85)', mesh: 'rgba(226,232,240,0.22)', svg: ['#f1f5f9', '#cbd5e1', '#64748b'],
    badgeBg: 'linear-gradient(135deg, rgba(51,65,85,0.95), rgba(30,41,59,0.95))', badgeBorder: 'rgba(226,232,240,0.85)', badgeShadow: '0 4px 16px rgba(148,163,184,0.6), inset 0 0 8px rgba(226,232,240,0.35)',
    track: 'rgba(226,232,240,0.4)', fillA: '#94a3b8', fillB: '#e2e8f0', fillShadow: '#cbd5e1', text: '#e2e8f0',
    ripple: '#e2e8f0', rippleBg: 'radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(148,163,184,0.4) 40%, transparent 75%)', rippleShadow: '0 0 25px #cbd5e1, 0 0 50px #94a3b8, inset 0 0 20px #f8fafc',
    hex: 'radial-gradient(circle, rgba(226,232,240,0.9) 0%, rgba(148,163,184,0.5) 45%, transparent 75%)', hit: '0 0 45px rgba(226,232,240,0.8), inset 0 0 40px rgba(148,163,184,0.7)',
    shard: [241, 245, 249], shardStroke: '#ffffff' },
};
export const barrierTheme = b => THEMES[b.visualIdentity] || THEMES.white;

let domeUid = 0;
// 挂载常驻穹顶：ground = 穹面渐变 + 蜂窝网格（压在单位下）；top = 边缘辉光 + 流光描边 + 耐久徽标（单位上方，中心透明）
export function mountBarrierDome(layers, b, name) {
  const t = barrierTheme(b), c = worldPx(b.center), r = b.radius * PX, uid = ++domeUid;
  const box = 'position:absolute;left:' + (c.x - r) + 'px;top:' + (c.y - r) + 'px;width:' + r * 2 + 'px;height:' + r * 2 + 'px;border-radius:50%;pointer-events:none;transform-origin:center;';
  const ground = layers.ground('<div data-barrier-dome="ground" style="' + box + 'background:' + t.dome + ';overflow:hidden;">' +
    '<svg width="100%" height="100%" style="position:absolute;inset:0;opacity:0.35;mix-blend-mode:screen;"><defs>' +
    '<pattern id="br-hex-' + uid + '" width="28" height="32.3" patternUnits="userSpaceOnUse"><path d="M14 0 L28 8.1 L28 24.2 L14 32.3 L0 24.2 L0 8.1 Z" fill="none" stroke="' + t.mesh + '" stroke-width="1"/></pattern>' +
    '<radialGradient id="br-glow-' + uid + '" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="' + t.svg[0] + '" stop-opacity="0.2"/><stop offset="70%" stop-color="' + t.svg[1] + '" stop-opacity="0.06"/><stop offset="100%" stop-color="' + t.svg[2] + '" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="100%" height="100%" fill="url(#br-glow-' + uid + ')"/><rect width="100%" height="100%" fill="url(#br-hex-' + uid + ')"/></svg></div>');
  const L = 2 * Math.PI * r;
  const badgeY = Math.max(16, c.y - r);
  const top = layers.top('<div data-barrier-dome="rim" style="' + box + 'border:1.5px solid ' + t.border + ';box-shadow:' + t.shadow + ';">' +
    '<svg width="100%" height="100%" viewBox="0 0 ' + r * 2 + ' ' + r * 2 + '" style="position:absolute;inset:0;overflow:visible;"><circle cx="' + r + '" cy="' + r + '" r="' + (r - 1) + '" fill="none" stroke="' + t.flow + '" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="' + (L * 0.16).toFixed(1) + ' ' + (L * 0.34).toFixed(1) + '" data-br="flow" style="filter:drop-shadow(0 0 4px ' + t.flow + ');"/></svg></div>' +
    '<div data-barrier-dome="badge" style="position:absolute;left:' + c.x + 'px;top:' + badgeY + 'px;transform:translate(-50%,-50%);display:flex;align-items:center;gap:7px;padding:3px 12px;border-radius:20px;background:' + t.badgeBg + ';border:1px solid ' + t.badgeBorder + ';box-shadow:' + t.badgeShadow + ';white-space:nowrap;font:700 10px/1 system-ui,sans-serif;color:' + t.text + ';pointer-events:none;">' +
    '<span>🛡️ <span data-br="name"></span></span><span style="width:80px;height:6px;background:rgba(0,0,0,0.7);border-radius:4px;overflow:hidden;border:1px solid ' + t.track + ';"><i data-br="fill" style="display:block;height:100%;width:100%;background:linear-gradient(90deg,' + t.fillA + ',' + t.fillB + ');box-shadow:0 0 8px ' + t.fillShadow + ';transition:width .3s ease-out;"></i></span>' +
    '<span data-br="value" style="font-family:ui-monospace,monospace;"></span></div>');
  top.querySelector('[data-br=name]').textContent = name;
  top.querySelector('[data-br=flow]').animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -L }], { duration: 7000, iterations: Infinity });
  const rec = { id: b.id, barrier: b, theme: t, ground, top, rim: top.querySelector('[data-barrier-dome=rim]'), dome: ground.firstChild };
  updateBarrierBadge(rec, b.integrity, b.maxIntegrity);
  return rec;
}
export function updateBarrierBadge(rec, integrity, maxIntegrity) {
  const b = rec.barrier, max = maxIntegrity || b.maxIntegrity || 1;
  rec.top.querySelector('[data-br=fill]').style.width = Math.max(0, Math.min(100, integrity / max * 100)) + '%';
  const parts = [];
  if (b.armor > 0) parts.push('甲' + b.armor);
  if (b.protectType && b.protectType !== 'all') parts.push(b.protectType + '克');
  rec.top.querySelector('[data-br=value]').textContent = Math.floor(integrity) + ' / ' + Math.floor(max) + (parts.length ? ' · ' + parts.join(' · ') : '');
}

// 展开：穹顶由中心张开 + 中心蜂窝聚光
export function playBarrierRaise(fx, rec, opts = {}) {
  const kf = [{ transform: 'scale(0.15)', opacity: 0 }, { transform: 'scale(1.04)', opacity: 1, offset: 0.62 }, { transform: 'scale(1)', opacity: 1 }];
  rec.dome.animate(kf, { duration: 620, easing: 'cubic-bezier(0.2,0.85,0.3,1)' });
  rec.rim.animate(kf, { duration: 620, easing: 'cubic-bezier(0.2,0.85,0.3,1)' });
  rec.top.querySelector('[data-barrier-dome=badge]').animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], { duration: 620 });
  const c = worldPx(rec.barrier.center), d = rec.barrier.radius * PX * 1.2;
  spotlight(fx, rec.theme, c, d, 760);
  if (!opts.silent) fx.sfx('shieldUp', 0.68);
  floatText(fx, c.x, c.y - 30, '🛡️ ' + rec.top.querySelector('[data-br=name]').textContent + ' +' + rec.barrier.integrity, rec.theme.text, rec.theme.fillShadow, { ms: 1100, size: 14 });
}
function spotlight(fx, t, p, d, ms) {
  fx.top('<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + d + 'px;height:' + d + 'px;background:' + t.hex + ';mix-blend-mode:screen;border-radius:50%;"></i>', ms)
    .firstChild.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.4)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.1)', offset: 0.2 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.7)' }], { duration: ms - 40, easing: 'ease-out', fill: 'forwards' });
}
function ripple(fx, t, p, size) {
  fx.top('<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + size + 'px;height:' + size + 'px;border-radius:50%;border:3px solid ' + t.ripple + ';background:' + t.rippleBg + ';box-shadow:' + t.rippleShadow + ';"></i>', 600)
    .firstChild.animate([{ transform: 'translate(-50%,-50%) scale(0.2)', opacity: 1, borderWidth: '4px' }, { opacity: 0.85, offset: 0.5 }, { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0, borderWidth: '1px' }], { duration: 550, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
}
function compress(rec) {
  const kf = [{ transform: 'scale(1)' }, { transform: 'scale(0.975) translateX(-3px)', offset: 0.2 }, { transform: 'scale(1.015) translateX(3px)', offset: 0.4 }, { transform: 'scale(0.99) translateX(-2px)', offset: 0.6 }, { transform: 'scale(1.005) translateX(1px)', offset: 0.8 }, { transform: 'scale(1)' }];
  rec.dome.animate(kf, { duration: 350, easing: 'cubic-bezier(0.36,0.07,0.19,0.97)' });
  rec.rim.animate(kf, { duration: 350, easing: 'cubic-bezier(0.36,0.07,0.19,0.97)' });
  rec.rim.animate([{ borderColor: '#fff7ed', boxShadow: rec.theme.hit }, { borderColor: rec.theme.border, boxShadow: rec.theme.shadow }], { duration: 350, easing: 'ease-out' });
}
// 外敌减益/场地被隔绝的边界接触点：结界圆心朝来源方向的边界点
export function blockContact(b, origin) {
  const dx = (origin?.x ?? b.center.x) - b.center.x, dy = (origin?.y ?? b.center.y - 1) - b.center.y, d = Math.hypot(dx, dy) || 1;
  return { x: b.center.x + dx / d * b.radius, y: b.center.y + dy / d * b.radius };
}

// 受击：每个 barrier-damaged 事件只播一次（群攻共享），接触点 = 后端 contactPoint
export function playBarrierHit(fx, rec, ev) {
  const t = rec.theme, p = worldPx(ev.contactPoint || blockContact(rec.barrier, ev.origin));
  const group = (ev.protectedTargetIds || []).length > 1;
  compress(rec);
  ripple(fx, t, p, group ? 240 : 120);
  spotlight(fx, t, p, 160, 650);
  updateBarrierBadge(rec, ev.integrityAfter, rec.barrier.maxIntegrity);
  const label = ev.actualLoss > 0 ? '-' + ev.actualLoss : (rec.barrier.armor > 0 ? '🛡️ 护甲格挡' : '🛡️ 克制格挡');
  floatText(fx, p.x, p.y - 18, label, t.text, t.fillShadow, { ms: 900, size: ev.actualLoss > 0 ? 16 : 13 });
  if (!ev.broken) {
    fx.sfx(group ? 'atk1' : 'atk2', group ? 0.62 : 0.58);
    fx.shake(ev.actualLoss >= rec.barrier.maxIntegrity * 0.5 ? 'medium' : 'light');
  }
}
// 减益/场地隔绝：轻量受击（不扣耐久）+ atk2
export function playBarrierBlocked(fx, rec, ev) {
  const t = rec.theme, p = worldPx(blockContact(rec.barrier, ev.origin || ev.source?.center));
  compress(rec);
  ripple(fx, t, p, 120);
  spotlight(fx, t, p, 160, 650);
  floatText(fx, p.x, p.y - 18, '🛡️ 隔绝' + (ev.blockedTag ? ' · ' + (ev.blockedTag === 'fog' ? '浓雾' : ev.blockedTag) : ''), t.text, t.fillShadow, { ms: 900, size: 13 });
  fx.shake('light');
  fx.sfx('atk2', 0.8);
}
// 击碎：穹顶色差闪断震颤 0.2s → 184ms 强震屏 + 80 片六边晶片外爆 → 850ms 收尾移除
export function playBarrierShatter(fx, rec, drop, after) {
  const t = rec.theme, c = worldPx(rec.barrier.center), r = rec.barrier.radius * PX;
  rec.top.querySelector('[data-barrier-dome=badge]').style.display = 'none';
  fx.sfx('atk1', 1);
  const glitch = [{ transform: 'translate(0,0) skewX(0deg)' }, { transform: 'translate(-14px,6px) skewX(8deg)', offset: 0.15 }, { transform: 'translate(16px,-8px) skewX(-10deg)', offset: 0.3 }, { transform: 'translate(-10px,10px) skewY(6deg)', offset: 0.45 }, { transform: 'translate(12px,-4px) skewX(-6deg)', offset: 0.6 }, { transform: 'translate(-6px,-8px) skewY(-4deg)', offset: 0.75 }, { transform: 'translate(4px,4px) skewX(4deg)', offset: 0.9 }, { transform: 'scale(1.15)', opacity: 0 }];
  const flash = [{ filter: 'brightness(1)' }, { filter: 'brightness(3) drop-shadow(0 0 30px ' + t.fillShadow + ')', offset: 0.15 }, { filter: 'brightness(4.5)', offset: 0.3 }, { filter: 'brightness(3)', offset: 0.45 }, { filter: 'brightness(5) drop-shadow(0 0 45px ' + t.fillShadow + ')', offset: 0.6 }, { filter: 'brightness(4)', offset: 0.75 }, { filter: 'brightness(6)', offset: 0.9 }, { filter: 'brightness(8) blur(5px)' }];
  for (const el of [rec.dome, rec.rim]) {
    el.animate(glitch, { duration: 200, easing: 'cubic-bezier(0.1,0.9,0.2,1)', fill: 'forwards' });
    el.animate(flash, { duration: 200, easing: 'steps(1)', fill: 'forwards' });
  }
  const L = fx.top('', 1700);
  after(184, () => {
    fx.shake('quake');
    let html = '';
    for (let i = 0; i < 80; i++) {
      const a = rnd(0, Math.PI * 2), rr = Math.sqrt(Math.random()) * r * 0.9;
      const x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr, dist = rnd(120, 380), s = rnd(4, 14);
      const alpha = 0.55 * rnd(0.8, 1.2);
      html += '<i style="position:absolute;left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;width:' + (s * 2).toFixed(1) + 'px;height:' + (s * 1.732).toFixed(1) + 'px;margin:-' + (s * 0.866).toFixed(1) + 'px 0 0 -' + s.toFixed(1) + 'px;' +
        'clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:linear-gradient(' + Math.round(rnd(0, 180)) + 'deg,rgba(' + t.shard.join(',') + ',' + alpha.toFixed(2) + ') 40%,' + t.shardStroke + ' 50%,rgba(' + t.shard.join(',') + ',' + alpha.toFixed(2) + ') 60%);" data-a="' + a.toFixed(3) + '" data-d="' + dist.toFixed(1) + '"></i>';
    }
    L.innerHTML = html;
    [...L.children].forEach(el => {
      const a = +el.dataset.a, d = +el.dataset.d, rz = rnd(-540, 540), life = rnd(670, 1420);
      el.animate([{ transform: 'translate(0,0) rotate(0deg) scale(1,1)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * d * 0.7).toFixed(1) + 'px,' + (Math.sin(a) * d * 0.7).toFixed(1) + 'px) rotate(' + (rz * 0.6).toFixed(0) + 'deg) scale(1,0.2)', opacity: 0.85, offset: 0.45 },
        { transform: 'translate(' + (Math.cos(a) * d).toFixed(1) + 'px,' + (Math.sin(a) * d + d * 0.35).toFixed(1) + 'px) rotate(' + rz.toFixed(0) + 'deg) scale(1,0.9)', opacity: 0 }], { duration: life, easing: 'cubic-bezier(0.05,0.8,0.3,1)', fill: 'forwards' });
    });
  });
  floatText(fx, c.x, Math.max(16, c.y - r) + 4, '💥 结界破碎', t.text, t.fillShadow, { ms: 1000, size: 15 });
  after(850, () => drop(rec));
}
// 到期/替换/重开：淡出
export function fadeBarrierDome(rec, drop, after) {
  const kf = [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.06)' }];
  rec.dome.animate(kf, { duration: 380, fill: 'forwards' });
  rec.rim.animate(kf, { duration: 380, fill: 'forwards' });
  rec.top.querySelector('[data-barrier-dome=badge]').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
  after(400, () => drop(rec));
}
