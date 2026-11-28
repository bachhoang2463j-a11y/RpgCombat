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

const cfg = window.__HIT_DEMO_CFG__ = {
  mode: 'B',        // 'A' 现行版 | 'B' 八方均衡版 | 'C' 八方重击版
  eliteExec: false, // 精英/首领击杀后是否接续旧版全屏处决
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

// ---------- 八方旅人2 打击感与击杀破碎/蓄势核心效果器 ----------
window.__HIT_DEMO_FX__ = {
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

    // 1. 瞬时高白剪影过曝 + 高频受击颤动（不靠缓慢平推 4px）
    const flashDur = heavy ? 110 : 85;
    rec.medal.animate([
      { filter: 'brightness(3.8) contrast(1.8) saturate(0)', transform: 'translate(-50%,-50%) scale(1.12)' },
      { filter: 'brightness(2.2) contrast(1.3)', transform: 'translate(-50%,-50%) scale(1.04)', offset: 0.45 },
      { filter: 'none', transform: 'translate(-50%,-50%) scale(1)' },
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

    // 1. 先瞬间将原单位隐藏，由两半被刀风/冲击斜向劈开错位的残影接管并瞬间气化
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
        w.style.cssText = `position:absolute;inset:0;clip-path:polygon(${h.poly});filter:brightness(3.2) contrast(1.6) saturate(0.15);`;
        w.appendChild(faceNode.cloneNode(true));
        splitHost.appendChild(w);
        w.animate([
          { transform: 'translate(0,0) scale(1.12)', opacity: 1, filter: 'brightness(3.6) saturate(0)' },
          { transform: `translate(${h.sx.toFixed(1)}px,${h.sy.toFixed(1)}px) rotate(${h.rot}deg) scale(0.85)`, opacity: 0, filter: 'brightness(0.4) blur(2px)' },
        ], { duration: splitMs, easing: 'cubic-bezier(0.15, 0.9, 0.3, 1)', fill: 'forwards' });
      });
    }

    // 2. 贯穿受击点的白热伤口闪光 + 慢扩深红冲击环（力量感从"魔法金色"换成"血肉冲击"）
    const slashAng = ang * 180 / Math.PI + 24;
    const tear = fx.top(
      `<div style="position:absolute;left:${p.x}px;top:${p.y}px;width:${d * 3.4}px;height:4px;transform:translate(-50%,-50%) rotate(${slashAng.toFixed(1)}deg);background:linear-gradient(90deg,transparent,#dc2626 20%,#ffffff 50%,#dc2626 80%,transparent);mix-blend-mode:screen;filter:drop-shadow(0 0 8px #7f1d1d);"></div>`,
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
    fx.sfx('light_charge', 0.55);
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
    // ② 极速瞬发贯屏金紫斩痕
    ctx.atmos?.burst();
    fx.sfx('slash_whoosh_hit_fs434873', 0.85);
    fx.sfx('mx_deep_impact', 0.65);
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
  '<button id="hd-exec">精英全屏处决: 关</button>',
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
  ex.textContent = '精英全屏处决: ' + (cfg.eliteExec ? '开' : '关');
  ex.classList.toggle('active', cfg.eliteExec);
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
  else if (btn.id === 'hd-exec') { cfg.eliteExec = !cfg.eliteExec; syncBar(); }
  else if (btn.id === 'hd-reset') { resetRange(); }
  else if (btn.dataset.preset) { void runPreset(btn.dataset.preset); }
});

window.__HIT_DEMO__ = { app, cfg, resetRange, runPreset };
