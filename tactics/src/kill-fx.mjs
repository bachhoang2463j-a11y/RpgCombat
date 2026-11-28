// 击杀蓄势与碎裂原语：只依赖现有世界层 fx 和沙盘单位视图。
import { worldPx } from './vfx-primitives.mjs';

function scopedAnimate(scope, el, frames, options) {
  const animation = el.animate(frames, options);
  scope.animate(animation);
  return animation;
}

function cloneAvatar(medal) {
  const face = medal.querySelector('.t-unit-avatar') || medal.querySelector('.t-unit-emoji');
  if (!face) return null;
  const clone = face.cloneNode(true);
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  clone.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:50%;overflow:hidden;pointer-events:none;border:none;box-shadow:none;';
  return clone;
}

export function playKillCharge(fx, sandbox, unitId, ms) {
  const center = sandbox.unitWorldCenter(unitId);
  const rec = sandbox.getUnitView().nodes.get(unitId);
  const scope = sandbox.getScope?.();
  if (!center || !rec || !scope?.isLive) return;
  const p = worldPx(center);
  const sparks = Array.from({ length: 12 }, (_, i) => {
    const a = i * 2.39996, d = 60 + i % 3 * 16;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d * .64 };
  });
  const root = fx.top(`<div data-tactics-fx="kill-charge" style="position:absolute;left:${p.x}px;top:${p.y}px;pointer-events:none;">` +
    '<i data-core style="position:absolute;left:-48px;top:-48px;width:96px;height:96px;background:radial-gradient(circle,#fff1c879 0%,#eaa64a4d 24%,#dd863823 49%,transparent 71%);mix-blend-mode:screen;"></i>' +
    sparks.map(() => '<i style="position:absolute;left:-8px;top:-8px;width:16px;height:16px;background:radial-gradient(ellipse,#fff5d9 0%,#efbb63a8 32%,transparent 73%);mix-blend-mode:screen;"></i>').join('') + '</div>', ms);
  const [core, ...particles] = root.firstChild.children;
  scopedAnimate(scope, core, [{ transform: 'scale(.45)', opacity: 0 }, { transform: 'scale(1.12)', opacity: .65, offset: .44 },
    { transform: 'scale(.52)', opacity: 1, offset: .83 }, { transform: 'scale(.22)', opacity: 0 }], { duration: ms, fill: 'both' });
  particles.forEach((el, i) => {
    const { x, y } = sparks[i], delay = i % 4 * 16;
    scopedAnimate(scope, el, [{ transform: `translate(${x}px,${y}px) scale(.5)`, opacity: 0 },
      { transform: `translate(${x * .8}px,${y * .8}px) scale(.88)`, opacity: .95, offset: .28 },
      { transform: 'translate(0,0) scale(.18)', opacity: 0 }], { duration: ms - delay, delay, easing: 'cubic-bezier(.48,.05,.83,.38)', fill: 'both' });
  });
}

export function playUnitShatter(fx, sandbox, unitId, dirX, dirY, heavy) {
  const center = sandbox.unitWorldCenter(unitId);
  const rec = sandbox.getUnitView().nodes.get(unitId);
  const scope = sandbox.getScope?.();
  if (!center || !rec || !scope?.isLive) return;
  const p = worldPx(center), ux = dirX, uy = dirY;
  const ang = Math.atan2(uy, ux), d = parseFloat(rec.sprite.style.getPropertyValue('--d')) || 42;
  const face = cloneAvatar(rec.medal);
  if (face) {
    const splitMs = heavy ? 320 : 240;
    const host = fx.top(`<div style="position:absolute;left:${p.x}px;top:${p.y}px;width:${d}px;height:${d}px;transform:translate(-50%,-50%);pointer-events:none;overflow:visible;"></div>`, splitMs + 40).firstChild;
    rec.medal.style.visibility = 'hidden';
    scope.onDispose(() => { rec.medal.style.visibility = ''; });
    const nx = -uy, ny = ux;
    [
      { poly: '0 0, 100% 0, 100% 48%, 0 54%', sx: ux * 16 + nx * 6, sy: uy * 16 + ny * 6, rot: 14 },
      { poly: '0 54%, 100% 48%, 100% 100%, 0 100%', sx: ux * 10 - nx * 5, sy: uy * 10 - ny * 5, rot: -10 },
    ].forEach(h => {
      const half = document.createElement('div');
      half.style.cssText = `position:absolute;inset:0;clip-path:polygon(${h.poly});filter:drop-shadow(0 0 4px rgba(127,29,29,0.85));`;
      half.appendChild(face.cloneNode(true)); host.appendChild(half);
      scopedAnimate(scope, half, [
        { transform: 'translate(0,0) scale(1.06)', opacity: 1, filter: 'contrast(1.15) drop-shadow(0 0 4px rgba(153,27,29,0.9))' },
        { transform: `translate(${h.sx.toFixed(1)}px,${h.sy.toFixed(1)}px) rotate(${h.rot}deg) scale(.85)`, opacity: 0, filter: 'brightness(.45) blur(1.5px)' },
      ], { duration: splitMs, easing: 'cubic-bezier(.15,.9,.3,1)', fill: 'forwards' });
    });
  }

  // 方向性深红斩痕，不触发屏幕血幕、全局镜头或震动。
  const slashAng = ang * 180 / Math.PI + 24;
  const tear = fx.top(`<div style="position:absolute;left:${p.x}px;top:${p.y}px;width:${d * 3.4}px;height:4px;transform:translate(-50%,-50%) rotate(${slashAng.toFixed(1)}deg);background:linear-gradient(90deg,transparent,#7f1d1d 20%,#dc2626 50%,#7f1d1d 80%,transparent);filter:drop-shadow(0 0 6px #450a0a);pointer-events:none;"></div>`, 260).firstChild;
  scopedAnimate(scope, tear, [
    { transform: `translate(-50%,-50%) rotate(${slashAng.toFixed(1)}deg) scaleX(.4) scaleY(2.2)`, opacity: 1 },
    { transform: `translate(-50%,-50%) rotate(${slashAng.toFixed(1)}deg) scaleX(1.35) scaleY(.2)`, opacity: 0 },
  ], { duration: 240, easing: 'ease-out', fill: 'forwards' });

  const dustMs = heavy ? 860 : 700;
  const dustLayer = fx.top('', dustMs + 60);
  for (let i = 0; i < (heavy ? 10 : 7); i++) {
    const spread = (Math.random() - .5) * 1.1, dist = 16 + Math.random() * 44;
    const dx = Math.cos(ang + spread) * dist, dy = Math.sin(ang + spread) * dist - 8;
    const sz = d * (.45 + Math.random() * .45), puff = document.createElement('i');
    puff.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:${sz}px;height:${sz}px;margin:${-sz / 2}px 0 0 ${-sz / 2}px;border-radius:50%;background:radial-gradient(circle,rgba(120,10,16,.88) 0%,rgba(76,6,10,.45) 55%,transparent 75%);pointer-events:none;`;
    dustLayer.appendChild(puff);
    scopedAnimate(scope, puff, [{ transform: 'translate(0,0) scale(.5)', opacity: .9 },
      { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(1.6)`, opacity: 0 }],
    { duration: dustMs - i * 35, easing: 'cubic-bezier(.16,.85,.3,1)', fill: 'forwards' });
  }

  const dropCount = heavy ? 42 : 28, dropMs = heavy ? 920 : 740, drops = fx.top('', dropMs + 60);
  for (let i = 0; i < dropCount; i++) {
    const big = i % 3 === 0;
    const a = ang + (Math.random() - .5) * (big ? 1.3 : .95);
    const speed = big ? 30 + Math.random() * 46 : 44 + Math.random() * (heavy ? 110 : 80);
    const sz = big ? 3.5 + Math.random() * 4 : 2 + Math.random() * 3, w = big ? sz : sz * 4;
    const el = document.createElement('i');
    el.style.cssText = `position:absolute;left:${p.x + (Math.random() - .5) * d * .5}px;top:${p.y + (Math.random() - .5) * d * .5}px;width:${w}px;height:${sz}px;margin:${-sz / 2}px 0 0 ${-w / 2}px;border-radius:99px;background:${big ? 'radial-gradient(circle,#fecaca 0%,#dc2626 45%,#7f1d1d 90%)' : 'linear-gradient(90deg,transparent,#dc2626 40%,#7f1d1d 100%)'};pointer-events:none;`;
    drops.appendChild(el);
    const tx = Math.cos(a) * speed, ty = Math.sin(a) * speed, fallMs = big ? dropMs : 320 + Math.random() * 240;
    const rot = (a * 180 / Math.PI).toFixed(1);
    scopedAnimate(scope, el, [{ transform: `rotate(${rot}deg)`, opacity: 1 },
      { transform: `translate(${(tx * .7).toFixed(1)}px,${(ty * .55).toFixed(1)}px) rotate(${rot}deg) scale(.9)`, opacity: 1, offset: .55 },
      { transform: `translate(${tx.toFixed(1)}px,${(ty + (big ? 38 : 6)).toFixed(1)}px) rotate(${(a * 180 / Math.PI + 20).toFixed(1)}deg) scale(.4)`, opacity: 0 }],
    { duration: fallMs, delay: big ? 60 + Math.random() * 120 : 0, easing: 'cubic-bezier(.3,.3,.3,1)', fill: 'forwards' });
  }

  const splats = fx.ground('', 1600);
  for (let i = 0; i < (heavy ? 5 : 3); i++) {
    const a = ang + (Math.random() - .5) * .9, distance = d * (.9 + Math.random() * 1.6);
    const x = p.x + Math.cos(a) * distance, y = p.y + Math.sin(a) * distance * .4 + d * .3;
    const size = d * (.22 + Math.random() * .26), stain = document.createElement('i');
    stain.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size * .55}px;margin:${-size * .275}px 0 0 ${-size / 2}px;border-radius:50%;background:radial-gradient(ellipse,rgba(90,8,12,.75) 0%,rgba(60,5,8,.4) 60%,transparent 85%);pointer-events:none;`;
    splats.appendChild(stain);
    scopedAnimate(scope, stain, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: .85, transform: 'scale(1)', offset: .2 }, { opacity: 0, transform: 'scale(1.05)' }],
      { duration: 1500, delay: 100 + i * 40, easing: 'ease-out', fill: 'forwards' });
  }
}
