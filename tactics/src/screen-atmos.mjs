// ==========================================
// L3/L4 屏幕氛围层（视口宿主，不挂世界坐标）：边缘向内压缩的视觉围压 + 与技能同风格的 SVG 能量纹理。
// 只是围压：不缩地图、不动 UI、不改世界坐标；四条边带最多压入 22%（L3）/ 28%（L4），中心始终留战场阅读窗口。
// 节奏：蓄势聚拢（边带随 chargeMs 推入、纹理向内流动）→ 爆发（一次边缘闪压，纹理反而收暗，主冲击交给世界效果）
//      → 结果（首个真实揭示即降到低透明，让位命中/位移/数字）→ 余韵退出（边带外撤淡出，战场恢复）。
// L4 额外：蓄势期在左边带内短暂打出技能身份（技能名/施术者），爆发前退场，把空间信息交还战场。
// 风格取自各条目已有的配色与母题（火纹、冰晶、雷弧、圣光、毒雾、裂隙、准星、符文、水纹、脉动）。
// ==========================================
import { mountShowpiece, SHOWPIECES } from './screen-showpiece.mjs';

export const ATMOS_STYLES = {
  fire:    { c1: '#f97316', c2: '#fde68a', dark: 'rgba(67,20,7,', motif: 'flame' },
  frost:   { c1: '#38bdf8', c2: '#e0f2fe', dark: 'rgba(8,30,52,', motif: 'shard' },
  thunder: { c1: '#a78bfa', c2: '#fef9c3', dark: 'rgba(22,16,52,', motif: 'bolt' },
  holy:    { c1: '#facc15', c2: '#fef9c3', dark: 'rgba(40,32,6,', motif: 'ray' },
  poison:  { c1: '#22c55e', c2: '#bbf7d0', dark: 'rgba(5,32,16,', motif: 'drip' },
  void:    { c1: '#a855f7', c2: '#f5d0fe', dark: 'rgba(24,6,40,', motif: 'crack' },
  gun:     { c1: '#f59e0b', c2: '#fef3c7', dark: 'rgba(28,18,4,', motif: 'scope' },
  arcane:  { c1: '#60a5fa', c2: '#e0e7ff', dark: 'rgba(10,16,44,', motif: 'rune' },
  water:   { c1: '#22d3ee', c2: '#cffafe', dark: 'rgba(4,28,40,', motif: 'wave' },
  life:    { c1: '#ef4444', c2: '#fecaca', dark: 'rgba(48,6,10,', motif: 'pulse' },
  blood:   { c1: '#e11d48', c2: '#fecdd3', dark: 'rgba(40,2,10,', motif: 'slash' },
};
// 条目 → 风格（按条目自身的配色/母题；未登记的 L3/L4 条目按伤害类型兜底）
export const ENTRY_ATMOS = {
  'fire-blast': 'fire', 'sekhmet-wrath': 'fire', 'fire-domain': 'fire', 'poison-domain': 'poison', 'frost-blast': 'frost', 'thunder-storm': 'thunder', 'storm-gather': 'thunder',
  'holy-judgment': 'holy', 'sanctum-veil': 'holy', 'isis-embrace': 'holy', 'holy-vow': 'holy',
  'xenon-blight-fog': 'poison', 'abyss-fog': 'void', 'void-quake': 'void', 'line-rift': 'void', 'shatter-echo': 'void',
  'krupp-snipe': 'gun', 'strafe-burst': 'gun', 'krupp-aim': 'gun',
  'harmony-ward': 'arcane', 'silence-field': 'arcane', 'high-summon': 'arcane', 'scorpion-key': 'arcane', 'nak-tith-barrier': 'arcane',
  'strange-conch': 'water', 'water-bolt': 'water', 'vital-flow': 'life',
};
export function atmosStyleOf(entry, skill) {
  if (entry && ENTRY_ATMOS[entry.id]) return ENTRY_ATMOS[entry.id];
  const t = skill && skill.damageType;
  return t === '远程' ? 'gun' : t === '近战' ? 'blood' : 'arcane';
}

const BANDS = ['top', 'bottom', 'left', 'right'];
function bandBox(side, depth) {
  const d = depth + '%';
  if (side === 'top') return 'left:0;right:0;top:0;height:' + d + ';transform-origin:50% 0;';
  if (side === 'bottom') return 'left:0;right:0;bottom:0;height:' + d + ';transform-origin:50% 100%;';
  if (side === 'left') return 'top:0;bottom:0;left:0;width:' + d + ';transform-origin:0 50%;';
  return 'top:0;bottom:0;right:0;width:' + d + ';transform-origin:100% 50%;';
}
function bandGradient(side, st, peak) {
  const dir = { top: 'to bottom', bottom: 'to top', left: 'to right', right: 'to left' }[side];
  return 'linear-gradient(' + dir + ',' + st.dark + (0.78 * peak).toFixed(2) + ') 0%,' + st.dark + (0.42 * peak).toFixed(2) + ') 45%,' + st.dark + '0) 100%)';
}
// 母题：每条边带一个 SVG（边带坐标 0..1000 × 0..100，x 沿边、y 从屏幕边缘(0)指向中心(100)）
function motifPaths(motif, st, seed) {
  let r = seed;
  const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const out = [];
  const stroke = (d, c, w, o) => out.push('<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + o + '" vector-effect="non-scaling-stroke"/>');
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 115 + rand() * 40, len = 45 + rand() * 45;
    if (motif === 'flame') stroke('M' + x + ',0 C' + (x - 22) + ',' + len * 0.35 + ' ' + (x + 26) + ',' + len * 0.6 + ' ' + (x + rand() * 10) + ',' + len, i % 2 ? st.c1 : st.c2, 2.2, 0.85);
    else if (motif === 'shard') stroke('M' + (x - 14) + ',0 L' + x + ',' + len + ' L' + (x + 14) + ',0 M' + (x - 6) + ',' + len * 0.45 + ' L' + (x + 9) + ',' + len * 0.3, i % 2 ? st.c1 : st.c2, 1.6, 0.9);
    else if (motif === 'bolt') stroke('M' + x + ',0 L' + (x + 16) + ',' + len * 0.3 + ' L' + (x - 10) + ',' + len * 0.55 + ' L' + (x + 12) + ',' + len, i % 2 ? st.c1 : st.c2, 2, 0.9);
    else if (motif === 'ray') stroke('M' + x + ',0 L' + (x + (rand() - 0.5) * 30) + ',' + len, st.c2, 3.2, 0.55);
    else if (motif === 'drip') { stroke('M' + x + ',0 Q' + (x + 4) + ',' + len * 0.5 + ' ' + x + ',' + len * 0.8, st.c1, 2.4, 0.8); out.push('<circle cx="' + x + '" cy="' + len * 0.86 + '" r="4" fill="' + st.c2 + '" opacity="0.7"/>'); }
    else if (motif === 'crack') stroke('M' + x + ',0 L' + (x + 9) + ',' + len * 0.25 + ' L' + (x - 7) + ',' + len * 0.48 + ' L' + (x + 14) + ',' + len * 0.7 + ' M' + (x + 9) + ',' + len * 0.25 + ' L' + (x + 30) + ',' + len * 0.38, i % 2 ? st.c1 : st.c2, 1.8, 0.9);
    else if (motif === 'scope') stroke('M' + x + ',4 L' + x + ',' + (14 + len * 0.3) + ' M' + (x - 10) + ',8 L' + (x + 10) + ',8', st.c1, 1.6, 0.75);
    else if (motif === 'rune') out.push('<text x="' + x + '" y="' + (20 + len * 0.4) + '" font-size="18" fill="' + (i % 2 ? st.c1 : st.c2) + '" opacity="0.75" text-anchor="middle">' + 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒ'[i * 2 % 18] + '</text>');
    else if (motif === 'wave') stroke('M' + (x - 50) + ',' + (10 + i % 3 * 12) + ' q25,-12 50,0 t50,0', i % 2 ? st.c1 : st.c2, 2, 0.75);
    else if (motif === 'pulse') stroke('M' + (x - 50) + ',14 L' + (x - 12) + ',14 L' + (x - 4) + ',' + (14 + len * 0.4) + ' L' + (x + 6) + ',4 L' + (x + 14) + ',14 L' + (x + 50) + ',14', st.c1, 2, 0.8);
    else stroke('M' + (x - 30) + ',0 L' + (x + 20) + ',' + len, i % 2 ? st.c1 : st.c2, 2.4, 0.8); // slash
  }
  return out.join('');
}
function bandSvg(side, motif, st, seed) {
  // 左右边带：旋转坐标，让母题同样从屏幕边缘指向中心
  const rot = { top: '', bottom: 'translate(1000,100) rotate(180)', left: '', right: '' }[side];
  const vb = side === 'left' || side === 'right' ? '0 0 100 1000' : '0 0 1000 100';
  const inner = motifPaths(motif, st, seed);
  const g = side === 'left' ? '<g transform="translate(0,1000) rotate(-90)">' + inner + '</g>'
    : side === 'right' ? '<g transform="translate(100,0) rotate(90)">' + inner + '</g>'
    : '<g' + (rot ? ' transform="' + rot + '"' : '') + '>' + inner + '</g>';
  return '<svg data-atmos-svg="' + side + '" viewBox="' + vb + '" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;mix-blend-mode:screen;filter:drop-shadow(0 0 4px ' + st.c1 + ');">' + g + '</svg>';
}
function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// fx: 导演 makeFx 句柄（screen/ground/after）；返回 { burst, lower, end }，均幂等
export function startAtmos(fx, { style, grade, chargeMs = 600, totalMs = 2000, skillName = '', casterName = '', shape = null, after, entryId = null, focus = null }) {
  const st = ATMOS_STYLES[style] || ATMOS_STYLES.arcane;
  const L4 = grade === 'L4';
  const depth = L4 ? 28 : 22, peak = L4 ? 1 : 0.82;
  const life = totalMs + chargeMs + 2400;
  const uid = Math.floor(Math.random() * 1e9);
  // 有专属主演出的条目：边带只保留暗场渐变，母题纹理交给主演出（不重复堆叠通用纹理）
  const hasShow = !!(entryId && SHOWPIECES[entryId]);
  const bands = BANDS.map((side, i) => '<div data-atmos-band="' + side + '" style="position:absolute;' + bandBox(side, depth) + 'background:' + bandGradient(side, st, peak) + ';transform:scale(0.08);opacity:0;">' +
    (hasShow ? '' : bandSvg(side, st.motif, st, 17 + i * 31)) + '</div>').join('');
  const card = L4 && skillName ? '<div data-atmos-card style="position:absolute;left:2.5%;top:50%;transform:translate(-40px,-50%);opacity:0;padding:10px 18px 10px 14px;border-left:3px solid ' + st.c1 + ';' +
    'background:linear-gradient(90deg,' + st.dark + '0.86),' + st.dark + '0));font:900 clamp(20px,3.4vw,40px)/1.05 system-ui,sans-serif;letter-spacing:.08em;color:' + st.c2 + ';text-shadow:0 0 18px ' + st.c1 + ',0 2px 2px #000;white-space:nowrap;">' +
    esc(skillName) + '<div style="font:700 11px/1.4 system-ui,sans-serif;letter-spacing:.42em;color:' + st.c1 + ';opacity:.9;">' + esc(casterName) + '</div></div>' : '';
  const root = fx.screen('<div data-atmos="' + style + '" data-grade="' + grade + '" style="position:absolute;inset:0;pointer-events:none;">' + bands + card + '</div>', life).firstChild;
  const show = hasShow ? mountShowpiece(root, entryId, uid, focus) : null;
  if (card && show) root.appendChild(root.querySelector('[data-atmos-card]'));   // 身份卡压在主演出之上
  const els = [...root.querySelectorAll('[data-atmos-band]')];
  const svgs = [...root.querySelectorAll('[data-atmos-svg]')];
  const anim = (el, frames, ms, easing = 'cubic-bezier(0.3,0.7,0.2,1)') => el.animate(frames, { duration: ms, easing, fill: 'forwards' });
  // ① 蓄势聚拢：边带从屏幕边缘推入，纹理向内流动
  const gather = Math.max(280, chargeMs);
  if (show) show.gather(gather);
  els.forEach(el => anim(el, [{ transform: 'scale(0.08)', opacity: 0 }, { transform: 'scale(0.72)', opacity: 0.75 * peak }], gather, 'cubic-bezier(0.55,0,0.85,0.5)'));
  svgs.forEach(s => anim(s, [{ opacity: 0.2 }, { opacity: 0.95 }], gather));
  const card$ = root.querySelector('[data-atmos-card]');
  if (card$) {
    anim(card$, [{ transform: 'translate(-40px,-50%)', opacity: 0 }, { transform: 'translate(0,-50%)', opacity: 1, offset: 0.25 }, { transform: 'translate(6px,-50%)', opacity: 1, offset: 0.8 }, { transform: 'translate(-24px,-50%)', opacity: 0 }], Math.max(420, gather * 0.9), 'ease-out');
  }
  // 真实作用范围边界（信息保护：只画规则 shape 的真实半径，细线、低亮度，结果揭示后保留到余韵）
  let ring = null;
  if (shape && shape.center && shape.radius > 0) {
    const px = shape.center.x * 50, py = shape.center.y * 50, r = shape.radius * 50;
    ring = fx.ground('<i data-atmos-range style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + r * 2 + 'px;height:' + r * 2 + 'px;margin:' + (-r) + 'px 0 0 ' + (-r) + 'px;border-radius:50%;' +
      'box-shadow:0 0 0 2px ' + st.c1 + 'aa,inset 0 0 22px ' + st.c1 + '44;opacity:0;"></i>', life).firstChild;
    anim(ring, [{ opacity: 0 }, { opacity: 0.9 }], gather);
  }
  let state = 'gather';
  const h = {
    // ② 爆发：一次边缘闪压到最深，纹理收暗，主冲击交给世界效果与震屏
    burst() {
      if (state !== 'gather' || !root.isConnected) return; state = 'burst';
      if (show) show.burst();
      els.forEach(el => anim(el, [{ transform: 'scale(0.72)', opacity: 0.75 * peak }, { transform: 'scale(1)', opacity: peak, offset: 0.25 }, { transform: 'scale(0.86)', opacity: 0.62 * peak }], 420));
      svgs.forEach(s => anim(s, [{ opacity: 0.95 }, { opacity: 0.35 }], 300));
    },
    // ③ 结果：降低遮挡，突出受击变化
    lower() {
      if (state === 'lower' || state === 'end' || !root.isConnected) return; if (state === 'gather') h.burst(); state = 'lower';
      if (show) show.lower();
      els.forEach(el => anim(el, [{ opacity: 0.62 * peak }, { opacity: 0.3 * peak }], 260));
      svgs.forEach(s => anim(s, [{ opacity: 0.35 }, { opacity: 0.18 }], 260));
    },
    // ④ 余韵退出：边带外撤，战场完全恢复（节点随 scope 生命周期回收）
    end() {
      if (state === 'end') return; state = 'end';
      if (!root.isConnected) return;
      if (show) show.end();
      els.forEach(el => anim(el, [{ transform: 'scale(0.86)' }, { transform: 'scale(0.05)', opacity: 0 }], 460, 'ease-in'));
      if (ring) anim(ring, [{ opacity: 0.9 }, { opacity: 0 }], 520);
      after(show ? 1300 : 520, () => { root.remove(); if (ring) ring.remove(); });
    },
  };
  // 条目在真实冲击拍点调用 burst()；未调用时兜底于蓄势结束后
  after(show ? gather + 1000 : gather, () => h.burst());
  return h;
}
