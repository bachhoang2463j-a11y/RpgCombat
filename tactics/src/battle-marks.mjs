// ==========================================
// 战斗留痕（C3）与法术照亮（C4）：世界层表现，不进规则。
// · 留痕：地图底图之上、单位之下一层；按元素画焦痕/霜斑/腐液/余烬圈/弹痕/暗色溅痕/坑状焦痕；
//   旋转与形状只由种子决定（同局重试位置与形态一致）；3 个回合（ROUND_TIME×3 虚拟时间）内淡出；最多 40 处，超出先移除最旧。
// · 照亮：单位层之下的滤色光照层；蓄力弱光 / 命中强光 / 枪口闪光，半径与时长按演出分级。
// 每个视图作用域一组图层，作用域失效（重置/换场）即随节点清空。
// ==========================================

import { ROUND_TIME } from './scheduler.mjs';
import { ELEMENT_COLORS } from './fx-infer.mjs';

const PX = 50, MAX_MARKS = 40, LIFE = ROUND_TIME * 3;

export function seedOf(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

// 元素 → 痕迹画法（纯渐变，无硬描边）
function markHtml(element, r, size) {
  const d = size * PX, c = ELEMENT_COLORS[element] || ELEMENT_COLORS.physical;
  const blob = (w, h, bg, extra = '') => '<i style="position:absolute;left:50%;top:50%;width:' + w + 'px;height:' + h + 'px;margin:' + (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px;border-radius:50%;background:' + bg + ';' + extra + '"></i>';
  const squash = 0.72 + r() * 0.28;
  if (element === 'fire' || element === 'blast') return blob(d, d * squash, 'radial-gradient(closest-side, rgba(12,8,6,.82) 0%, rgba(30,14,8,.62) 45%, rgba(120,45,10,.28) 70%, transparent 100%)')
    + blob(d * 0.5, d * 0.5 * squash, 'radial-gradient(closest-side, rgba(251,146,60,.28), transparent)', 'mix-blend-mode:screen;');
  if (element === 'frost') {
    let s = blob(d, d * squash, 'radial-gradient(closest-side, rgba(224,242,254,.55) 0%, rgba(125,211,252,.32) 50%, transparent 100%)');
    for (let i = 0; i < 6; i++) s += '<i style="position:absolute;left:50%;top:50%;width:' + (d * 0.48) + 'px;height:1.5px;transform-origin:0 50%;transform:rotate(' + (i * 60 + r() * 20) + 'deg);background:linear-gradient(90deg,rgba(240,249,255,.8),transparent);"></i>';
    return s;
  }
  if (element === 'poison') return blob(d, d * squash, 'radial-gradient(closest-side, rgba(101,163,13,.55) 0%, rgba(54,83,20,.45) 55%, transparent 100%)')
    + blob(d * 0.3, d * 0.3, 'radial-gradient(closest-side, rgba(190,242,100,.45), transparent)', 'margin-left:' + (d * 0.12) + 'px;');
  if (element === 'holy') return blob(d, d, 'radial-gradient(closest-side, transparent 52%, rgba(253,230,138,.55) 62%, rgba(250,204,21,.25) 74%, transparent 88%)', 'mix-blend-mode:screen;');
  if (element === 'gun') {
    let s = blob(d * 0.34, d * 0.34, 'radial-gradient(closest-side, rgba(5,5,6,.9) 0%, rgba(20,18,16,.6) 55%, transparent 100%)');
    for (let i = 0; i < 4; i++) s += '<i style="position:absolute;left:50%;top:50%;width:' + (d * (0.25 + r() * 0.2)) + 'px;height:1px;transform-origin:0 50%;transform:rotate(' + (r() * 360) + 'deg);background:linear-gradient(90deg,rgba(10,10,10,.7),transparent);"></i>';
    return s;
  }
  if (element === 'thunder') {
    let s = blob(d * 0.8, d * 0.8 * squash, 'radial-gradient(closest-side, rgba(15,10,25,.7) 0%, rgba(40,20,60,.35) 60%, transparent 100%)');
    for (let i = 0; i < 5; i++) s += '<i style="position:absolute;left:50%;top:50%;width:' + (d * (0.35 + r() * 0.2)) + 'px;height:1.5px;transform-origin:0 50%;transform:rotate(' + (r() * 360) + 'deg) skewX(' + (r() * 40 - 20) + 'deg);background:linear-gradient(90deg,rgba(196,181,253,.7),transparent);"></i>';
    return s;
  }
  if (element === 'water') return blob(d, d * squash, 'radial-gradient(closest-side, rgba(14,116,144,.42) 0%, rgba(8,47,73,.32) 60%, transparent 100%)');
  if (element === 'void' || element === 'curse' || element === 'arcane') return blob(d, d * squash, 'radial-gradient(closest-side, rgba(20,8,35,.7) 0%, ' + c + '44 55%, transparent 100%)');
  // 近战/物理：中性暗色溅痕（世界观不固定，不画红色血迹）
  let s = blob(d * 0.6, d * 0.6 * squash, 'radial-gradient(closest-side, rgba(10,10,12,.6) 0%, rgba(20,20,24,.3) 60%, transparent 100%)');
  for (let i = 0; i < 4; i++) { const a = r() * Math.PI * 2, k = 0.25 + r() * 0.2; s += '<i style="position:absolute;left:calc(50% + ' + (Math.cos(a) * d * k) + 'px);top:calc(50% + ' + (Math.sin(a) * d * k) + 'px);width:' + (d * 0.1) + 'px;height:' + (d * 0.1) + 'px;margin:' + (-d * 0.05) + 'px;border-radius:50%;background:rgba(12,12,14,.55);"></i>'; }
  return s;
}

export function createBattleMarks() {
  let bound = null;
  const marks = [];
  function layers(scope, dom) {
    if (bound && bound.scope === scope) return bound;
    const mk = (name, before, css) => {
      const d = document.createElement('div');
      d.setAttribute('data-tactics-layer', name);
      d.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; overflow:visible;' + css;
      dom.world.insertBefore(d, before);
      scope.addNode(d);
      return d;
    };
    marks.length = 0;
    bound = { scope, decal: mk('marks', dom.art.nextSibling, ''), light: mk('fx-light', dom.unitLayer, 'mix-blend-mode:screen;') };
    return bound;
  }
  function mark(scope, dom, { x, y, element, size = 1.1, seed, now }) {
    const L = layers(scope, dom), r = rng(seed);
    const el = document.createElement('div');
    el.className = 't-mark t-mark-' + (element || 'physical');
    el.style.cssText = 'position:absolute; left:' + (x * PX) + 'px; top:' + (y * PX) + 'px; width:0; height:0; transform:rotate(' + Math.floor(r() * 360) + 'deg);';
    el.innerHTML = markHtml(element, r, size);
    L.decal.appendChild(el);
    marks.push({ el, born: now });
    while (marks.length > MAX_MARKS) marks.shift().el.remove();
    return el;
  }
  function age(now) {
    for (let i = marks.length - 1; i >= 0; i--) {
      const k = (now - marks[i].born) / LIFE;
      if (k >= 1) { marks[i].el.remove(); marks.splice(i, 1); continue; }
      marks[i].el.style.opacity = String(Math.max(0, 1 - Math.max(0, k)));
    }
  }
  // radius：米；ms：时长；peak：峰值不透明度
  function light(scope, dom, { x, y, color, radius, ms, peak = 0.85 }) {
    const L = layers(scope, dom), d = radius * 2 * PX;
    const el = document.createElement('i');
    el.className = 't-fx-light';
    el.style.cssText = 'position:absolute; left:' + (x * PX) + 'px; top:' + (y * PX) + 'px; width:' + d + 'px; height:' + d + 'px; margin:' + (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px; border-radius:50%;'
      + 'background:radial-gradient(closest-side, ' + color + 'cc 0%, ' + color + '55 38%, ' + color + '18 68%, transparent 100%); opacity:0;';
    L.light.appendChild(el);
    const a = el.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: peak, transform: 'scale(1)', offset: 0.22 }, { opacity: 0, transform: 'scale(1.08)' }], { duration: ms, easing: 'ease-out' });
    scope.animate(a);
    scope.after(ms, () => el.remove());
    return el;
  }
  return { mark, age, light, count: () => marks.length };
}

// 照亮分级：L3/L4 8m 600ms，L2 4m 450ms，其余 2m 300ms
export function lightTier(grade) {
  if (grade === 'L3' || grade === 'L4') return { radius: 8, ms: 600 };
  if (grade === 'L2') return { radius: 4, ms: 450 };
  return { radius: 2, ms: 300 };
}
