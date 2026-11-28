// 独立对比靶场 Demo 入口与八方旅人2打击感效果引擎
import { createApp } from '../tactics/src/main.mjs';
import { registerDefaultFx } from '../tactics/src/fx-library.mjs';
import { createFxRegistry } from '../tactics/src/fx-registry.mjs';
import { worldPx } from '../tactics/src/vfx-primitives.mjs';

export const RANGE_YAML = [
  'meta:',
  '  协议版本: 1',
  '  场景ID: sc-hit-range',
  '  场景: sc-hit-range',
  '  战斗ID: bt-hit-feel-demo',
  '  随机种子: 20261128',
  '  站位:',
  '    我方:',
  '      弗兰克: { col: 4, row: 5, facing: 90 }',
  '    敌方:',
  '      坚韧木桩: { col: 7, row: 4, facing: 270 }',
  '      杂兵靶: { col: 7, row: 6, facing: 270 }',
  '      精英靶: { col: 10, row: 4, facing: 270 }',
  '      首领靶: { col: 10, row: 6, facing: 270 }',
  '我方:',
  '  - 名字: 弗兰克',
  '    职业: 防守者',
  '    属性:',
  '      HP: 999',
  '      MP: 999',
  '      Atk: 60',
  '      Armor: 40',
  '      敏捷: 180',
  '      移动: 6',
  '      占格: 1x1',
  '    技能:',
  '      - 名字: 试射',
  '        动作: 主',
  '        标签: "[枪击;power:45][远程][必中][特效:枪击]"',
  '        范围: { 类型: 单体, 射程: 15 }',
  '      - 名字: 疾风重斩',
  '        动作: 主',
  '        标签: "[伤害;power:70][近战][必中][特效:近战重击]"',
  '        范围: { 类型: 单体, 射程: 15 }',
  '      - 名字: 极剑·破界斩',
  '        动作: 主',
  '        标签: "[伤害;power:180][近战][必中][特效:剑技蓄势斩]"',
  '        范围: { 类型: 单体, 射程: 15 }',
  '      - 名字: 圣光审判',
  '        动作: 主',
  '        标签: "[伤害;power:180][法术][必中][特效:圣光01]"',
  '        范围: { 类型: 单体, 射程: 15 }',
  '    物品: []',
  '敌方:',
  '  - 名字: "🗿坚韧木桩"',
  '    等级: 杂兵',
  '    属性: { HP: 9999, MP: 0, Atk: 0, Armor: 0, 敏捷: 10, 移动: 0, 占格: 1x1 }',
  '    技能: []',
  '    物品: []',
  '  - 名字: "🌑杂兵靶"',
  '    等级: 杂兵',
  '    属性: { HP: 35, MP: 0, Atk: 0, Armor: 0, 敏捷: 10, 移动: 0, 占格: 1x1 }',
  '    技能: []',
  '    物品: []',
  '  - 名字: "🎯精英靶"',
  '    等级: 精英',
  '    属性: { HP: 35, MP: 0, Atk: 0, Armor: 0, 敏捷: 10, 移动: 0, 占格: 1x1 }',
  '    技能: []',
  '    物品: []',
  '  - 名字: "👑首领靶"',
  '    等级: 首领',
  '    属性: { HP: 120, MP: 0, Atk: 0, Armor: 0, 敏捷: 10, 移动: 0, 占格: 2x2 }',
  '    技能: []',
  '    物品: []',
].join('\n');

const CHARGE_CHOICES = [
  { key: 'bomb_throw', label: '炸药充能' },
  { key: 'explosion_aoe_charge', label: '爆炸蓄压' },
  { key: 'thunder_charge', label: '雷电蓄能' },
  { key: 'light_charge', label: '圣光咏唱' },
  { key: 'herocharge', label: '原蓄力' },
];
let chargeIdx = 0;

const cfg = window.__HIT_DEMO_CFG__ = {
  mode: 'B',        // 'A' 现行版 | 'B' 八方均衡版 | 'C' 八方重击版
  execFlow: true,   // 攻击击杀特写结束后自然衔接原版击杀结算特写
};

// 8 块 & 12 块不规则多边形裂片模板（百分比坐标，围绕圆心放射割裂）
const SHARDS_8 = [
  { poly: '50% 50%, 50% 0%, 88% 12%', dx: 0.45, dy: -0.85, rot: 28 },
  { poly: '50% 50%, 88% 12%, 100% 50%', dx: 0.92, dy: -0.35, rot: 42 },
  { poly: '50% 50%, 100% 50%, 85% 90%', dx: 0.85, dy: 0.55, rot: 35 },
  { poly: '50% 50%, 85% 90%, 48% 100%', dx: 0.35, dy: 0.92, rot: -22 },
  { poly: '50% 50%, 48% 100%, 12% 86%', dx: -0.42, dy: 0.84, rot: -38 },
  { poly: '50% 50%, 12% 86%, 0% 48%', dx: -0.88, dy: 0.32, rot: -45 },
  { poly: '50% 50%, 0% 48%, 14% 12%', dx: -0.86, dy: -0.45, rot: -30 },
  { poly: '50% 50%, 14% 12%, 50% 0%', dx: -0.32, dy: -0.90, rot: 18 },
];

const SHARDS_12 = [
  { poly: '50% 50%, 50% 0%, 76% 6%', dx: 0.32, dy: -0.95, rot: 36 },
  { poly: '50% 50%, 76% 6%, 96% 26%', dx: 0.78, dy: -0.68, rot: 54 },
  { poly: '50% 50%, 96% 26%, 100% 52%', dx: 0.98, dy: -0.18, rot: 46 },
  { poly: '50% 50%, 100% 52%, 92% 80%', dx: 0.88, dy: 0.45, rot: 62 },
  { poly: '50% 50%, 92% 80%, 70% 96%', dx: 0.55, dy: 0.85, rot: 32 },
  { poly: '50% 50%, 70% 96%, 45% 100%', dx: 0.15, dy: 0.98, rot: -28 },
  { poly: '50% 50%, 45% 100%, 20% 92%', dx: -0.35, dy: 0.92, rot: -48 },
  { poly: '50% 50%, 20% 92%, 4% 70%', dx: -0.76, dy: 0.65, rot: -58 },
  { poly: '50% 50%, 4% 70%, 0% 44%', dx: -0.96, dy: 0.12, rot: -42 },
  { poly: '50% 50%, 0% 44%, 10% 18%', dx: -0.86, dy: -0.42, rot: -52 },
  { poly: '50% 50%, 10% 18%, 30% 4%', dx: -0.58, dy: -0.82, rot: -26 },
  { poly: '50% 50%, 30% 4%, 50% 0%', dx: -0.18, dy: -0.96, rot: 22 },
];

function cloneVisualOnly(medalEl) {
  const face = medalEl.querySelector('.t-unit-avatar') || medalEl.querySelector('.t-unit-emoji');
  if (!face) return null;
  const clone = face.cloneNode(true);
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  clone.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:50%;overflow:hidden;pointer-events:none;border:none;box-shadow:none;';
  return clone;
}

// 远程重击同款屏幕血块（原版 fx-library.mjs screenBlood + RANGED_SPLAT_POS / DRIPS）
const SPLAT_PATHS = [
  'M20,10 C35,2 50,15 45,30 C55,40 60,60 45,70 C30,80 15,65 10,50 C5,35 10,18 20,10 Z',
  'M30,5 C45,5 55,20 50,35 C65,30 75,45 70,60 C55,75 40,70 30,80 C15,75 10,55 15,40 C5,25 20,10 30,5 Z',
  'M15,20 C30,10 50,10 40,30 C55,35 60,55 45,65 C35,75 20,80 15,60 C5,45 5,30 15,20 Z',
  'M25,12 C40,4 55,18 48,32 C60,42 62,65 48,72 C32,82 18,68 12,52 C8,38 12,20 25,12 Z',
];
const RANGED_SPLAT_POS = [
  { top: '16%', left: '18%', size: 150, rot: -25, delay: 40 }, { top: '65%', left: '22%', size: 150, rot: 45, delay: 80 },
  { top: '20%', right: '16%', size: 150, rot: 15, delay: 60 }, { top: '60%', right: '18%', size: 150, rot: -55, delay: 95 },
  { top: '38%', left: '46%', size: 150, rot: 8, delay: 15 },
];
const RANGED_SPLAT_DRIPS = [['right:25%', 6, 140, 90, 1050], ['left:22%', 8, 180, 60, 1100]];

function playScreenBlood(fx, ms = 1150) {
  const pos = s => (s.top ? 'top:' + s.top + ';' : '') + (s.bottom ? 'bottom:' + s.bottom + ';' : '') + (s.left ? 'left:' + s.left + ';' : '') + (s.right ? 'right:' + s.right + ';' : '');
  const splats = RANGED_SPLAT_POS.map((s, i) => {
    const d = SPLAT_PATHS[i % SPLAT_PATHS.length];
    return '<div data-splat style="position:absolute;' + pos(s) + 'width:' + s.size + 'px;height:' + s.size + 'px;opacity:0;filter:drop-shadow(0 0 8px #7f1d1d);">' +
      '<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="' + d + '" fill="#7f1d1d"/><path d="' + d + '" fill="#991b1b" transform="translate(8,8) scale(.85)" opacity=".9"/>' +
      '<circle cx="85" cy="18" r="4.5" fill="#991b1b"/><circle cx="15" cy="85" r="3.5" fill="#7f1d1d"/><circle cx="92" cy="72" r="5" fill="#881337"/><circle cx="6" cy="16" r="3" fill="#991b1b"/><circle cx="70" cy="92" r="2.5" fill="#dc2626"/>' +
      '<circle cx="35" cy="28" r="1.8" fill="#fff" opacity=".6"/><circle cx="58" cy="45" r="1.5" fill="#fff" opacity=".5"/></svg></div>';
  }).join('');
  const drips = RANGED_SPLAT_DRIPS.map(([x, w, h]) => '<i data-drip style="position:absolute;top:0;' + x + ';width:' + w + 'px;height:' + h + 'px;border-radius:' + w + 'px;transform-origin:50% 0;opacity:0;' +
    'background:linear-gradient(#b91c1c,#7f1d1d 55%,transparent);filter:drop-shadow(0 0 6px #450a0a);"></i>').join('');
  const root = fx.screen('<i data-vig style="position:absolute;inset:0;opacity:0;background:radial-gradient(circle,transparent 32%,rgba(136,8,8,.45) 70%,rgba(65,8,8,.95) 100%);"></i>' + splats + drips, ms);
  root.style.overflow = 'hidden';
  root.querySelector('[data-vig]').animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)', offset: 0.14 }, { opacity: 0.88, transform: 'scale(1.02)', offset: 0.78 }, { opacity: 0, transform: 'scale(1.05)' }],
    { duration: ms, easing: 'cubic-bezier(0.1,0.8,0.2,1)', fill: 'forwards' });
  root.querySelectorAll('[data-splat]').forEach((el, i) => {
    const s = RANGED_SPLAT_POS[i], rr = ' rotate(' + s.rot + 'deg)';
    el.animate([{ transform: 'scale(.12)' + rr, opacity: 0 }, { transform: 'scale(1.12)' + rr, opacity: 1, offset: 0.22 }, { transform: 'scale(1)' + rr, opacity: 0.96, offset: 0.38 },
      { transform: 'translateY(4px) scale(1.01)' + rr, opacity: 0.85, offset: 0.72 }, { transform: 'translateY(12px) scale(1.04)' + rr, opacity: 0 }],
      { duration: Math.max(400, ms - s.delay), delay: s.delay, easing: 'cubic-bezier(0.12,0.85,0.25,1)', fill: 'both' });
  });
  root.querySelectorAll('[data-drip]').forEach((el, i) => {
    const [, , , delay, dms] = RANGED_SPLAT_DRIPS[i];
    el.animate([{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 0.9, offset: 0.35 }, { transform: 'scaleY(1.25)', opacity: 0 }],
      { duration: Math.min(dms, ms - delay), delay, easing: 'ease-out', fill: 'both' });
  });
}

// ---------- 八方旅人2 打击感与击杀破碎/蓄势核心效果器 ----------
window.__HIT_DEMO_FX__ = {
  playChargeSound(fx, key) {
    fx.sfx(key, 1.4, { offsetSec: key === 'herocharge' ? 0.315 : 0 });
  },
  playKillCharge(fx, from, ms) {
    const c = worldPx(from);
    const sparks = Array.from({ length: 12 }, (_, i) => {
      const a = i * 2.39996, d = 60 + i % 3 * 16;
      return { x: Math.cos(a) * d, y: Math.sin(a) * d * .64 };
    });
    const root = fx.top(`<div data-hit-demo-cue="kill-charge" style="position:absolute;left:${c.x}px;top:${c.y}px;">` +
      `<i style="position:absolute;left:-48px;top:-48px;width:96px;height:96px;background:radial-gradient(circle,#fff1c879 0%,#eaa64a4d 24%,#dd863823 49%,transparent 71%);mix-blend-mode:screen;"></i>` +
      sparks.map(() => '<i style="position:absolute;left:-8px;top:-8px;width:16px;height:16px;background:radial-gradient(ellipse,#fff5d9 0%,#efbb63a8 32%,transparent 73%);mix-blend-mode:screen;"></i>').join('') + '</div>', ms);
    const [core, ...particles] = root.firstChild.children;
    core.animate([{ transform: 'scale(.45)', opacity: 0 }, { transform: 'scale(1.12)', opacity: .65, offset: .44 },
      { transform: 'scale(.52)', opacity: 1, offset: .83 }, { transform: 'scale(.22)', opacity: 0 }], { duration: ms, fill: 'both' });
    particles.forEach((el, i) => {
      const { x, y } = sparks[i], delay = i % 4 * 16;
      el.animate([{ transform: `translate(${x}px,${y}px) scale(.5)`, opacity: 0 },
        { transform: `translate(${x * .8}px,${y * .8}px) scale(.88)`, opacity: .95, offset: .28 },
        { transform: 'translate(0,0) scale(.18)', opacity: 0 }], { duration: ms - delay, delay, easing: 'cubic-bezier(.48,.05,.83,.38)', fill: 'both' });
    });
  },
  // 普通命中基座（B/C 模式）：高频颤动 + 瞬时白闪剪影 + 锐利细冲击圆环 + 方向火星
  onImpactHit(directorCtx, { casterId, targetId, dirX, dirY, isLethal }) {
    if (cfg.mode === 'A') return;
    const heavy = cfg.mode === 'C';
    const { sandbox, fx } = directorCtx;
    const view = sandbox.getUnitView();
    const rec = view.nodes.get(targetId);
    const c = sandbox.unitWorldCenter(targetId);
    if (!rec || !c) return;
    const p = worldPx(c);
    const ux = dirX || 1, uy = dirY || 0;

    // 1. 瞬时受击微缩 + 高频受击颤动（去掉高曝光滤镜）
    const flashDur = heavy ? 110 : 85;
    rec.medal.animate([
      { transform: 'translate(-50%,-50%) scale(1.1)' },
      { transform: 'translate(-50%,-50%) scale(1.03)', offset: 0.45 },
      { transform: 'translate(-50%,-50%) scale(1)' },
    ], { duration: flashDur + 90, easing: 'ease-out' });

    const vibDur = heavy ? 190 : 150;
    const amp = heavy ? 7.5 : 5.2;
    rec.sprite.animate([
      { transform: `translate(${(ux * amp).toFixed(1)}px, ${(uy * amp).toFixed(1)}px)` },
      { transform: `translate(${(-ux * amp * 0.85).toFixed(1)}px, ${(-uy * amp * 0.85).toFixed(1)}px)` },
      { transform: `translate(${(ux * amp * 0.55).toFixed(1)}px, ${(uy * amp * 0.55).toFixed(1)}px)` },
      { transform: `translate(${(-ux * amp * 0.3).toFixed(1)}px, ${(-uy * amp * 0.3).toFixed(1)}px)` },
      { transform: 'translate(0,0)' },
    ], { duration: vibDur, easing: 'linear', composite: 'add' });

    // 2. 非致命时即刻在世界层弹出锐利冲击细环（顿帧不锁它，制造力量穿透感）
    if (!isLethal) {
      const ringSize = heavy ? 156 : 124;
      const ringMs = heavy ? 420 : 320;
      const ringEl = fx.top(
        `<svg width="${ringSize}" height="${ringSize}" viewBox="0 0 100 100" style="position:absolute;left:${p.x}px;top:${p.y}px;transform:translate(-50%,-50%);overflow:visible;mix-blend-mode:screen;pointer-events:none;">` +
        `<circle cx="50" cy="50" r="46" fill="none" stroke="${heavy ? '#fde68a' : '#fffbeb'}" stroke-width="${heavy ? 2.6 : 2}" stroke-opacity="0.95"/></svg>`,
        ringMs + 30
      ).firstChild;
      ringEl.animate([
        { transform: 'translate(-50%,-50%) scale(0.24)', opacity: 1 },
        { transform: 'translate(-50%,-50%) scale(0.88)', opacity: 0.9, offset: 0.4 },
        { transform: 'translate(-50%,-50%) scale(1.22)', opacity: 0 },
      ], { duration: ringMs, easing: 'cubic-bezier(0.14, 0.88, 0.25, 1)', fill: 'forwards' });
    }
    if (heavy) fx.shake('heavy');
  },

  // 棋盘原地方向性气化崩散 + 慢扩细金环 + 余烬（解冻那一帧引爆，绝不做均分碎花）
  playUnitShatter(directorCtx, { targetId, dirX, dirY, onSound }) {
    if (cfg.mode === 'A') return;
    const heavy = cfg.mode === 'C';
    const { sandbox, fx } = directorCtx;
    const view = sandbox.getUnitView();
    const rec = view.nodes.get(targetId);
    const c = sandbox.unitWorldCenter(targetId);
    if (!rec || !c) return;
    const p = worldPx(c);
    const ux = dirX || 1, uy = dirY || 0;
    const ang = Math.atan2(uy, ux);
    const d = parseFloat(rec.sprite.style.getPropertyValue('--d')) || 42;
    const faceNode = cloneVisualOnly(rec.medal);

    // 1. 先瞬间将原单位隐藏，由两半被刀风/冲击斜向劈开错位的残影接管并消散（去掉高曝光，保留真实色泽与血染）
    rec.root.classList.add('t-unit-shattered');
    if (faceNode) {
      const splitMs = heavy ? 320 : 240;
      const splitHost = fx.top(
        `<div style="position:absolute;left:${p.x}px;top:${p.y}px;width:${d}px;height:${d}px;transform:translate(-50%,-50%);pointer-events:none;overflow:visible;"></div>`,
        splitMs + 40
      ).firstChild;
      const nx = -uy, ny = ux;
      [
        { poly: '0 0, 100% 0, 100% 48%, 0 54%', sx: ux * 16 + nx * 6, sy: uy * 16 + ny * 6, rot: 14 },
        { poly: '0 54%, 100% 48%, 100% 100%, 0 100%', sx: ux * 10 - nx * 5, sy: uy * 10 - ny * 5, rot: -10 },
      ].forEach(h => {
        const w = document.createElement('div');
        w.style.cssText = `position:absolute;inset:0;clip-path:polygon(${h.poly});filter:drop-shadow(0 0 4px rgba(127,29,29,0.85));`;
        w.appendChild(faceNode.cloneNode(true));
        splitHost.appendChild(w);
        w.animate([
          { transform: 'translate(0,0) scale(1.06)', opacity: 1, filter: 'contrast(1.15) drop-shadow(0 0 4px rgba(153,27,27,0.9))' },
          { transform: `translate(${h.sx.toFixed(1)}px,${h.sy.toFixed(1)}px) rotate(${h.rot}deg) scale(0.85)`, opacity: 0, filter: 'brightness(0.45) blur(1.5px)' },
        ], { duration: splitMs, easing: 'cubic-bezier(0.15, 0.9, 0.3, 1)', fill: 'forwards' });
      });
    }

    // 2. 屏幕血块（与远程重击完全一致的 5 团屏幕溅血 + 2 道血泪 + 暗红边缘暗角）
    playScreenBlood(fx, heavy ? 1150 : 980);

    // 3. 贯穿受击点的深红裂痕（无高曝光白闪）
    const slashAng = ang * 180 / Math.PI + 24;
    const tear = fx.top(
      `<div style="position:absolute;left:${p.x}px;top:${p.y}px;width:${d * 3.4}px;height:4px;transform:translate(-50%,-50%) rotate(${slashAng.toFixed(1)}deg);background:linear-gradient(90deg,transparent,#7f1d1d 20%,#dc2626 50%,#7f1d1d 80%,transparent);filter:drop-shadow(0 0 6px #450a0a);"></div>`,
      260
    ).firstChild;
    tear.animate([
      { transform: `translate(-50%,-50%) rotate(${slashAng.toFixed(1)}deg) scaleX(0.4) scaleY(2.2)`, opacity: 1 },
      { transform: `translate(-50%,-50%) rotate(${slashAng.toFixed(1)}deg) scaleX(1.35) scaleY(0.2)`, opacity: 0 },
    ], { duration: 240, easing: 'ease-out', fill: 'forwards' });

    const ringD = heavy ? d * 4.8 : d * 3.8;
    const ringMs = heavy ? 740 : 580;
    const bigRing = fx.top(
      `<svg width="${ringD}" height="${ringD}" viewBox="0 0 100 100" style="position:absolute;left:${p.x}px;top:${p.y}px;transform:translate(-50%,-50%);overflow:visible;mix-blend-mode:screen;pointer-events:none;">` +
      `<circle cx="50" cy="50" r="46" fill="none" stroke="${heavy ? '#f87171' : '#fca5a5'}" stroke-width="1.8"/></svg>`,
      ringMs + 40
    ).firstChild;
    bigRing.animate([
      { transform: 'translate(-50%,-50%) scale(0.24)', opacity: 1 },
      { transform: 'translate(-50%,-50%) scale(0.8)', opacity: 0.9, offset: 0.32 },
      { transform: 'translate(-50%,-50%) scale(1.22)', opacity: 0 },
    ], { duration: ringMs, easing: 'cubic-bezier(0.08, 0.92, 0.2, 1)', fill: 'forwards' });

    // 3. 沿着攻击方向单向高速喷射的高密度血雾 + 粗血滴抛洒坠落（带重力弧线）+ 地面溅血痕留存
    const dustMs = heavy ? 860 : 700;
    const dustLayer = fx.top('', dustMs + 60);
    for (let i = 0; i < (heavy ? 10 : 7); i++) {
      const spread = (Math.random() - 0.5) * 1.1;
      const dist = 16 + Math.random() * 44;
      const dx = Math.cos(ang + spread) * dist, dy = Math.sin(ang + spread) * dist - 8;
      const sz = d * (0.45 + Math.random() * 0.45);
      const puff = document.createElement('i');
      puff.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:${sz}px;height:${sz}px;margin:${-sz / 2}px 0 0 ${-sz / 2}px;border-radius:50%;` +
        `background:radial-gradient(circle,rgba(120,10,16,0.88) 0%,rgba(76,6,10,0.45) 55%,transparent 75%);pointer-events:none;`;
      dustLayer.appendChild(puff);
      puff.animate([
        { transform: 'translate(0,0) scale(0.5)', opacity: 0.9 },
        { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(1.6)`, opacity: 0 },
      ], { duration: dustMs - i * 35, easing: 'cubic-bezier(0.16, 0.85, 0.3, 1)', fill: 'forwards' });
    }

    const dropCount = heavy ? 42 : 28;
    const dropMs = heavy ? 920 : 740;
    const dropLayer = fx.top('', dropMs + 60);
    for (let i = 0; i < dropCount; i++) {
      const isBigDrop = i % 3 === 0;
      const a = isBigDrop ? (ang + (Math.random() - 0.5) * 1.3) : (ang + (Math.random() - 0.5) * 0.95);
      const spd = isBigDrop ? (30 + Math.random() * 46) : (44 + Math.random() * (heavy ? 110 : 80));
      const sz = isBigDrop ? (3.5 + Math.random() * 4) : (2 + Math.random() * 3);
      const w = isBigDrop ? sz : sz * 4;
      const el = document.createElement('i');
      el.style.cssText = `position:absolute;left:${p.x + (Math.random() - 0.5) * d * 0.5}px;top:${p.y + (Math.random() - 0.5) * d * 0.5}px;width:${w}px;height:${sz}px;margin:${-sz / 2}px 0 0 ${-w / 2}px;` +
        `border-radius:99px;background:${isBigDrop ? 'radial-gradient(circle,#fecaca 0%,#dc2626 45%,#7f1d1d 90%)' : 'linear-gradient(90deg,transparent,#dc2626 40%,#7f1d1d 100%)'};` +
        `transform:rotate(${(a * 180 / Math.PI).toFixed(1)}deg);mix-blend-mode:normal;pointer-events:none;`;
      dropLayer.appendChild(el);
      const tx = Math.cos(a) * spd, ty = Math.sin(a) * spd;
      const fallMs = isBigDrop ? dropMs : (320 + Math.random() * 240);
      el.animate([
        { transform: `translate(0,0) rotate(${(a * 180 / Math.PI).toFixed(1)}deg) scale(1)`, opacity: 1 },
        { transform: `translate(${(tx * 0.7).toFixed(1)}px,${(ty * 0.55).toFixed(1)}px) rotate(${(a * 180 / Math.PI).toFixed(1)}deg) scale(0.9)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${tx.toFixed(1)}px,${(ty + (isBigDrop ? 30 + Math.random() * 20 : 6)).toFixed(1)}px) rotate(${(a * 180 / Math.PI + 20).toFixed(1)}deg) scale(0.4)`, opacity: 0 },
      ], { duration: fallMs, delay: isBigDrop ? (60 + Math.random() * 120) : 0, easing: 'cubic-bezier(0.3, 0.3, 0.3, 1)', fill: 'forwards' });
    }

    const splatLayer = fx.top('', 1600);
    for (let i = 0; i < (heavy ? 5 : 3); i++) {
      const sa = ang + (Math.random() - 0.5) * 0.9;
      const sdist = d * (0.9 + Math.random() * 1.6);
      const sx = Math.cos(sa) * sdist, sy = Math.sin(sa) * sdist * 0.4 + d * 0.3;
      const ssz = d * (0.22 + Math.random() * 0.26);
      const splat = document.createElement('i');
      splat.style.cssText = `position:absolute;left:${p.x + sx}px;top:${p.y + sy}px;width:${ssz}px;height:${ssz * 0.55}px;margin:${-ssz * 0.275}px 0 0 ${-ssz / 2}px;border-radius:50%;` +
        `background:radial-gradient(ellipse,rgba(90,8,12,0.75) 0%,rgba(60,5,8,0.4) 60%,transparent 85%);pointer-events:none;transform:rotate(${(sa * 180 / Math.PI).toFixed(0)}deg);`;
      splatLayer.appendChild(splat);
      splat.animate([
        { opacity: 0, transform: `rotate(${(sa * 180 / Math.PI).toFixed(0)}deg) scale(0.3)` },
        { opacity: 0.85, transform: `rotate(${(sa * 180 / Math.PI).toFixed(0)}deg) scale(1)`, offset: 0.2 },
        { opacity: 0, transform: `rotate(${(sa * 180 / Math.PI).toFixed(0)}deg) scale(1.05)` },
      ], { duration: 1500, delay: 100 + i * 40, easing: 'ease-out', fill: 'forwards' });
    }

    fx.shake(heavy ? 'quake' : 'heavy');
    if (onSound) onSound();
  },

  // 大招蓄势：极点细金环急速内收 + 100ms 寂静“收”（在爆发前 280ms 触发）
  playUltConverge(fx, targetWorldPx, { chargeMs = 1200, color = '#fde047' } = {}) {
    if (cfg.mode === 'A' || !targetWorldPx) return;
    const delay = Math.max(0, chargeMs - 300);
    const total = 300;
    const node = fx.top(
      `<svg width="240" height="240" viewBox="0 0 100 100" style="position:absolute;left:${targetWorldPx.x}px;top:${targetWorldPx.y}px;transform:translate(-50%,-50%);overflow:visible;mix-blend-mode:screen;pointer-events:none;opacity:0;">` +
      `<circle cx="50" cy="50" r="46" fill="none" stroke="${color}" stroke-width="1.6"/>` +
      `<circle cx="50" cy="50" r="10" fill="#ffffff" opacity="0.9"/></svg>`,
      delay + total + 50
    ).firstChild;
    node.animate([
      { transform: 'translate(-50%,-50%) scale(1.65)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.35)', opacity: 0.95, offset: 0.18 },
      { transform: 'translate(-50%,-50%) scale(0.06)', opacity: 1, offset: 0.86 },
      { transform: 'translate(-50%,-50%) scale(0.02)', opacity: 0.9 },
    ], { duration: total, delay, easing: 'cubic-bezier(0.55, 0.05, 0.85, 0.2)', fill: 'forwards' });
  },
};

// 靶场专用 L4 剑技蓄势斩条目（演示八方旅人2：蓝焰起势 -> 乌云暗场 -> 金环极点内收 -> 瞬发贯屏斜斩）
const SWORD_ULT_ENTRY = {
  id: 'sword-ult-demo', grade: 'L4', fxTags: ['剑技蓄势斩'], cine: 'lock',
  timeline: { chargeMs: 1200, totalMs: 2800, fullscreen: true, darken: true },
  cues: [{ key: 'light_charge', vol: 0.55 }, { key: 'slash_whoosh_hit_fs434873', vol: 0.8 }, { key: 'mx_deep_impact', vol: 0.72 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result } = ctx;
    const c = worldPx(ctx.centerOf(ctx.casterId));
    const t = worldPx(hits[0] ? ctx.centerOf(hits[0].targetId) : result.aim);
    const ang = Math.atan2(t.y - c.y, t.x - c.x) * 180 / Math.PI;
    // ① 起势蓝焰柱 + 末段细金环极点内收
    window.__HIT_DEMO_FX__.playChargeSound(fx, 'light_charge');
    const pillar = fx.top(
      `<div style="position:absolute;left:${c.x}px;top:${c.y}px;width:72px;height:180px;transform:translate(-50%,-82%);background:radial-gradient(ellipse at 50% 80%,rgba(56,189,248,.92) 0%,rgba(14,165,233,.45) 45%,transparent 75%);mix-blend-mode:screen;filter:blur(2px);"></div>`,
      1150
    ).firstChild;
    pillar.animate([
      { transform: 'translate(-50%,-82%) scaleY(0.15) scaleX(1.3)', opacity: 0 },
      { transform: 'translate(-50%,-82%) scaleY(1.15) scaleX(0.9)', opacity: 1, offset: 0.35 },
      { transform: 'translate(-50%,-82%) scaleY(0.2) scaleX(0.3)', opacity: 0 },
    ], { duration: 1050, easing: 'ease-out', fill: 'forwards' });
    if (cfg.mode !== 'A') window.__HIT_DEMO_FX__.playUltConverge(fx, c, { chargeMs: 1180, color: '#fde047' });
    if (!(await ctx.wait(1200))) return false;
    // ② 极速瞬发贯屏金紫斩痕（近战大招命中音由导演层恒定走 parry_heavy 近战重击音效）
    ctx.atmos?.burst();
    fx.sfx('slash_whoosh_hit_fs434873', 0.85);
    fx.shake('quake');
    const beam = fx.top(
      `<div style="position:absolute;left:${t.x}px;top:${t.y}px;width:540px;height:28px;transform:translate(-50%,-50%) rotate(${ang.toFixed(1)}deg);background:linear-gradient(90deg,transparent 0%,#c084fc 20%,#ffffff 50%,#fde047 80%,transparent 100%);mix-blend-mode:screen;filter:drop-shadow(0 0 18px #f59e0b);"></div>`,
      260
    ).firstChild;
    beam.animate([
      { transform: `translate(-50%,-50%) rotate(${ang.toFixed(1)}deg) scaleX(0.05) scaleY(1.8)`, opacity: 1 },
      { transform: `translate(-50%,-50%) rotate(${ang.toFixed(1)}deg) scaleX(1.15) scaleY(1)`, opacity: 1, offset: 0.35 },
      { transform: `translate(-50%,-50%) rotate(${ang.toFixed(1)}deg) scaleX(1.3) scaleY(0.1)`, opacity: 0 },
    ], { duration: 240, easing: 'cubic-bezier(0.12,0.9,0.2,1)', fill: 'forwards' });
    hits.forEach(h => ctx.reveal(h.targetId));
    return ctx.wait(650);
  },
};

const customRegistry = registerDefaultFx(createFxRegistry()).register(SWORD_ULT_ENTRY);

// ---------- 启动战棋靶场并安装顶部无感对比切换栏 ----------
const app = createApp(document.getElementById('tactics-app'), {
  defaultYaml: RANGE_YAML,
  playable: true,
  registry: customRegistry,
});
app.boot();

// 注入专用碎裂单位样式（原圆标彻底退隐，不留缩灰球）
const styleTag = document.createElement('style');
styleTag.textContent = `
  .t-unit-shattered .t-unit-medal, .t-unit-shattered .t-unit-bars, .t-unit-shattered .t-unit-direction { opacity: 0 !important; transition: opacity .08s; }
  .t-unit-shattered .t-unit-shadow { opacity: 0.15 !important; }
  .t-unit-shattered .t-unit-name { opacity: 0.38 !important; }
  #hit-demo-bar { position:fixed; top:10px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; align-items:center; gap:6px; padding:5px 10px;
    background:rgba(10,12,18,0.88); backdrop-filter:blur(10px); border:1px solid rgba(201,164,92,0.45); border-radius:999px; box-shadow:0 8px 24px rgba(0,0,0,0.65); font-family:system-ui,sans-serif; }
  #hit-demo-bar button { padding:4px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06); color:#cbd5e1; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; transition:all .15s; }
  #hit-demo-bar button:hover { background:rgba(201,164,92,0.22); color:#fef3c7; border-color:rgba(236,210,155,0.55); }
  #hit-demo-bar button.active { background:linear-gradient(135deg,#d97706,#b45309); color:#fffbeb; border-color:#fcd34d; box-shadow:0 0 12px rgba(245,158,11,0.45); }
  #hit-demo-bar .sep { width:1px; height:16px; background:rgba(255,255,255,0.14); margin:0 2px; }
`;
document.head.appendChild(styleTag);

const bar = document.createElement('div');
bar.id = 'hit-demo-bar';
bar.innerHTML = [
  '<button data-mode="A">A 现行版</button>',
  '<button data-mode="B" class="active">B 八方均衡版</button>',
  '<button data-mode="C">C 八方重击版</button>',
  '<span class="sep"></span>',
  '<button id="hd-charge">蓄力音: 炸药充能</button>',
  '<span class="sep"></span>',
  '<button data-preset="normal">普攻命中</button>',
  '<button data-preset="fodder">击杀杂兵</button>',
  '<button data-preset="elite">击杀精英</button>',
  '<button data-preset="swordUlt">剑技蓄势斩</button>',
  '<button data-preset="spellUlt">圣光蓄势</button>',
  '<button id="hd-reset">重置靶场</button>',
].join('');
document.body.appendChild(bar);

function syncBar() {
  bar.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === cfg.mode));
  const ex = document.getElementById('hd-exec');
  ex.textContent = '击杀结算特写: ' + (cfg.execFlow ? '开' : '关');
  ex.classList.toggle('active', cfg.execFlow);
}

// 靶场便捷自动续行：弗兰克行动完不切走，且支持一键复位与快捷施放
function resetRange() {
  app.restart();
}

async function runPreset(kind) {
  if (app.isBusy()) return;
  app.demoReviveRange?.();
  await new Promise(r => setTimeout(r, 30));
  const units = app.getViewData().units;
  const frank = units.find(u => u.id.includes('弗兰克'));
  const findEnemy = kw => units.find(u => u.side === 'enemy' && u.name.includes(kw));
  const map = {
    normal:   { skill: '试射', target: findEnemy('坚韧木桩') },
    fodder:   { skill: '疾风重斩', target: findEnemy('杂兵靶') },
    elite:    { skill: '试射', target: findEnemy('精英靶') },
    swordUlt: { skill: '极剑·破界斩', target: findEnemy('首领靶') },
    spellUlt: { skill: '圣光审判', target: findEnemy('首领靶') },
  }[kind];
  if (!map || !map.target || !frank) return;
  const sk = frank.skills.find(s => s.name === map.skill);
  if (!sk) return;
  const pos = app.getViewData().placementsById[map.target.id];
  const fp = app.getViewData().footprintsById[map.target.id] || { width: 1, height: 1 };
  const aim = { x: pos.col + fp.width / 2, y: pos.row + fp.height / 2, targetId: map.target.id };
  const res = await app.director.runAttackLive(sk, aim);
  if (res && res.ok) {
    if (kind === 'fodder' || kind === 'elite') res.demoRangedHeavy = true;
    await app.director.playAttack(res);
    await app.director.playExecution(res);
  } else {
    app.shell.showLog('预设触发失败: ' + (res?.reason || '未知'), 'warn', 2400);
  }
}

bar.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.mode) { cfg.mode = btn.dataset.mode; syncBar(); }
  else if (btn.id === 'hd-exec') { cfg.execFlow = !cfg.execFlow; syncBar(); }
  else if (btn.id === 'hd-charge') {
    chargeIdx = (chargeIdx + 1) % CHARGE_CHOICES.length;
    window.__HIT_DEMO_CHARGE_KEY__ = CHARGE_CHOICES[chargeIdx].key;
    btn.textContent = '蓄力音: ' + CHARGE_CHOICES[chargeIdx].label;
    app.avHost.av.playSound(CHARGE_CHOICES[chargeIdx].key, 1.4);
  }
  else if (btn.id === 'hd-reset') { resetRange(); }
  else if (btn.dataset.preset) { void runPreset(btn.dataset.preset); }
});

window.__HIT_DEMO__ = { app, cfg, resetRange, runPreset };
