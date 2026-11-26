// ==========================================
// 战棋演出库：按"特效/效果"命名的通用条目（不按角色）。弗兰克/玛德琳/索恩接入时只往这里追加条目或复用现有条目。
// 每个条目只消费导演给的 ctx（battle.attack() 提交结果 + 揭示回调），不查询命中、不掷骰、不扣费。
// 坐标：世界美术像素（米 × 50）挂战棋世界层（vfx-host），镜头平移/缩放自然一致；
//       仅与位置无关的闪屏挂视口层（屏幕坐标只在这最后一层）。
// 声音：以项目已有真实采样（audioUrls 键）为主；原版用 Web Audio 合成的层（如重击低频冲击）按原版移植。
// ==========================================

import { pathSegments, pointAtDistance } from './motion.mjs';
import { FX_SCALE } from './av-host.mjs';
import { unitCenter } from './geometry.mjs';
import { letterbox, timeStop, hitFlash, ATTACK_STOP_MS, ATTACK_HIT_MS, zoomAt, holdOr } from './cinematic.mjs';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const PX = 50;                                  // 世界美术像素/米
const easeOut = t => 1 - Math.pow(1 - t, 3);

// 枪械身份出手前备好采样（与回合制 playSingleAttackFx 同口径）
export const PREPARE_KEYS = { '枪击': ['gunshot1', 'gunshot2', 'gunshot3'], '霰弹': ['xiandan'] };

// ---------- 共用画法（纯渐变，无硬描边） ----------
function orbHtml(x, y, size, color, core) {
  return '<i style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px;margin:' + (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px;border-radius:50%;' +
    'background:radial-gradient(circle,' + (core || color) + ' 0%,' + color + ' 38%,transparent 72%);mix-blend-mode:screen;will-change:transform,opacity;"></i>';
}
// 粒子：每个粒子一个渐变 <i>，WAAPI 只动 transform/opacity；层随时长自动回收
function particles(fx, list, ms, where = 'top') {
  const layer = fx[where](list.map(p => orbHtml(p.x, p.y, p.size, p.color, p.core)).join(''), ms);
  [...layer.children].forEach((el, i) => {
    const p = list[i];
    el.animate([
      { transform: 'translate(0,0) scale(' + (p.s0 ?? 1) + ')', opacity: p.o0 ?? 1 },
      { transform: 'translate(' + p.dx + 'px,' + p.dy + 'px) scale(' + (p.s1 ?? 0.3) + ')', opacity: 0 },
    ], { duration: p.dur, delay: p.delay || 0, easing: p.ease || 'cubic-bezier(0.2,0.7,0.3,1)', fill: 'both' });
  });
  return layer;
}
function glowDefs(uid, stops) {
  return '<defs><radialGradient id="rg' + uid + '">' + stops + '</radialGradient>' +
    '<filter id="gl' + uid + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
}
// 地面法阵：渐变光环 + 羽化符文光点（无虚线/硬线框）
function runeHtml(uid, x, y, r, c1, c2, glyphs, center = '') {
  const g = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, rr = r * 0.8;
    g.push('<circle cx="' + (Math.cos(a) * rr).toFixed(1) + '" cy="' + (Math.sin(a) * rr).toFixed(1) + '" r="' + (i % 3 ? r * 0.035 : r * 0.06).toFixed(1) + '" fill="' + (i % 3 ? c1 : c2) + '"/>');
  }
  const txt = glyphs ? glyphs.split('').map((ch, i) => {
    const a = i / glyphs.length * TAU;
    return '<text x="' + (Math.cos(a) * r * 0.62).toFixed(1) + '" y="' + (Math.sin(a) * r * 0.62).toFixed(1) + '" font-size="' + (r * 0.16).toFixed(1) + '" fill="' + c2 + '" text-anchor="middle" dominant-baseline="central">' + ch + '</text>';
  }).join('') : '';
  return '<svg data-fx="rune" width="' + r * 2 + '" height="' + r * 2 + '" viewBox="' + (-r) + ' ' + (-r) + ' ' + r * 2 + ' ' + r * 2 + '" style="position:absolute;left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-50%);overflow:visible;will-change:transform,opacity;">' +
    glowDefs(uid, '<stop offset="0%" stop-color="' + c1 + '" stop-opacity="0.18"/><stop offset="62%" stop-color="' + c1 + '" stop-opacity="0.05"/><stop offset="84%" stop-color="' + c2 + '" stop-opacity="0.75"/><stop offset="100%" stop-color="' + c1 + '" stop-opacity="0"/>') +
    '<g filter="url(#gl' + uid + ')"><circle r="' + r + '" fill="url(#rg' + uid + ')"/><g data-fx="spin">' + g.join('') + txt + center + '</g></g></svg>';
}
function ringHtml(x, y, d, inner, outer) {
  return '<i style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + d + 'px;height:' + d + 'px;margin:' + (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px;border-radius:50%;' +
    'background:radial-gradient(circle,transparent 52%,' + inner + ' 61%,' + outer + ' 69%,transparent 78%);mix-blend-mode:screen;will-change:transform,opacity;"></i>';
}
// WebM 视频特效：原版 playWebMFX 黑底转透明（index.html playWebMFX / FX_WEBM_SCREEN_MODE=false 默认路径）移植到世界层。
// 隐藏 video 逐帧绘制到 Canvas：RGB 最大通道 <12 全透明、12–80 渐进、更亮保留，尾段 0.35s 渐隐；
// 像素读取失败（跨域污染）才按原版降级 screen 混合。宽度定尺寸、按真实分辨率等比；
// cover=D（世界像素直径）：范围类效果短边覆盖真实直径，不按 16:9 帧宽误报范围。层收回即停帧、释放解码。
const FX_WEBM_KEY_MAX = 960;
export { FX_WEBM_KEY_MAX, webm as playWebmFx, playSupportEffects };
// audio>0：按原版 audioUrl:'none' 口径开启视频原声，经混音器以该增益播放（原版 applyAudioVolume(vw, 2.5)）
function webm(ctx, file, x, y, width, { ms = 1600, rate = 1, opacity = 1, cover = 0, audio = 0 } = {}) {
  const layer = ctx.fx.top('', ms);
  const v = document.createElement('video');
  v.muted = !audio; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.loop = false;
  v.style.display = 'none';
  const cv = document.createElement('canvas');
  cv.setAttribute('data-fx', 'webm');
  cv.setAttribute('data-webm', file);
  cv.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + (cover || width) + 'px;transform:translate(-50%,-50%);opacity:' + opacity + ';pointer-events:none;';
  const g = cv.getContext('2d', { willReadFrequently: true });
  let screenMode = false, raf = 0;
  // 播完句柄（导演 awaitHandle）：元数据到达后按真实时长更新 doneAt，释放时通知
  const t0 = Date.now();
  cv.handle = { onFinish: new Set(), doneAt: t0 + ms };
  v.onloadedmetadata = () => {
    if (v.duration) cv.handle.doneAt = t0 + v.duration * 1000 / rate;
    const aspect = (v.videoWidth || 1920) / (v.videoHeight || 1080);
    const cssW = cover ? cover * Math.max(1, aspect) : width;
    cv.width = Math.min(FX_WEBM_KEY_MAX, Math.round(cssW * 2));
    cv.height = Math.round(cv.width / aspect);
    cv.style.width = cssW + 'px';
    cv.style.height = Math.round(cssW / aspect) + 'px';
  };
  let released = false;
  const release = () => {
    if (released) return; released = true;
    if (raf) cancelAnimationFrame(raf);
    cv.remove(); v.pause(); v.removeAttribute('src'); v.load(); v.remove();
    cv.handle.onFinish.forEach(fn => fn(true));
  };
  const next = () => {
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(frame);
    else raf = requestAnimationFrame(frame);
  };
  function frame() {
    if (!cv.isConnected || v.paused || v.ended) { release(); return; }
    const cw = cv.width, ch = cv.height;
    if (!cw || !ch) { next(); return; }
    let fade = 1;
    if (v.duration && v.currentTime > v.duration - 0.35) fade = Math.max(0, (v.duration - v.currentTime) / 0.35);
    g.clearRect(0, 0, cw, ch);
    g.drawImage(v, 0, 0, cw, ch);
    if (!screenMode) {
      try {
        const img = g.getImageData(0, 0, cw, ch), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const m = Math.max(d[i], d[i + 1], d[i + 2]);
          if (m < 12) d[i + 3] = 0;
          else if (m < 80) d[i + 3] = Math.floor(d[i + 3] * ((m - 12) / 68) * fade);
          else d[i + 3] = Math.floor(d[i + 3] * fade);
        }
        g.putImageData(img, 0, 0);
      } catch (e) {
        screenMode = true; cv.style.mixBlendMode = 'screen';
      }
    } else cv.style.opacity = String(opacity * fade);
    next();
  }
  v.onended = release;
  v.onerror = release;
  v.src = ctx.av.ASSET_BASE + '/' + file;
  v.playbackRate = rate;
  layer.appendChild(v);
  layer.appendChild(cv);
  if (audio) ctx.av.CombatAudioMixer.media(v, audio, 'skill', { category: ctx.audioContext?.category });
  const p = v.play();
  if (p && typeof p.then === 'function') p.then(next, () => release());
  else next();
  return cv;
}
const worldPx = p => ({ x: p.x * PX, y: p.y * PX });
// 原版 playWebMFX 尺寸口径：targetSize = min(视口宽, 视口高) × scale（屏幕像素）；换算为世界美术像素（÷ 相机缩放）
function screenSpanPx(ctx, k) {
  const vp = ctx.sandbox.getDom().viewport;
  return Math.min(vp.clientWidth, vp.clientHeight) * k / (ctx.cine ? ctx.cine.homeScale : ctx.sandbox.getPose().scale);
}
// 视口面积占比下限对应的世界宽度（aspect = 视频宽/高）
function screenCoverPx(ctx, fraction, aspect) {
  const vp = ctx.sandbox.getDom().viewport;
  return Math.sqrt(fraction * vp.clientWidth * vp.clientHeight * aspect) / (ctx.cine ? ctx.cine.homeScale : ctx.sandbox.getPose().scale);
}

// 本库新增条目用到、回合制视听底座未登记键名的真实采样（文件已在既有资源服务中，键名对齐回合制 WEBM_FX_REGISTRY 音轨）
export const EXTRA_AUDIO = {
  light01: 'light01.mp3', thunder01: 'thunder01.mp3',
  weimu: 'weimu.wav', sheshen_armor_step: 'sheshen_armor_step.mp3',
  parry_heavy: 'parry_Weapon_GuardBreak.wav',
  move_hero_heavy_1: 'move_hero_heavy_1.mp3', move_hero_heavy_2: 'move_hero_heavy_2.mp3', move_hero_heavy_3: 'move_hero_heavy_3.mp3',
  move_hero_normal_1: 'move_hero_normal_1.mp3', move_hero_normal_2: 'move_hero_normal_2.mp3', move_hero_normal_3: 'move_hero_normal_3.mp3',
  move_hero_light_1: 'move_hero_light_1.mp3', move_hero_light_2: 'move_hero_light_2.mp3', move_hero_light_3: 'move_hero_light_3.mp3',
  move_enemy_boss_1: 'move_enemy_boss_1.mp3', move_enemy_boss_2: 'move_enemy_boss_2.mp3', move_enemy_boss_3: 'move_enemy_boss_3.mp3',
  move_enemy_elite_glide: 'move_enemy_elite_glide.mp3',
  move_enemy_elite_step_1: 'move_enemy_elite_step_1.mp3', move_enemy_elite_step_2: 'move_enemy_elite_step_2.mp3', move_enemy_elite_step_3: 'move_enemy_elite_step_3.mp3',
  move_enemy_fodder_1: 'move_enemy_fodder_1.mp3', move_enemy_fodder_2: 'move_enemy_fodder_2.mp3', move_enemy_fodder_3: 'move_enemy_fodder_3.mp3',
  move_flight_wind: 'move_flight_wind.mp3',
  jump_crouch_1: 'jump_crouch_1.mp3', jump_crouch_2: 'jump_crouch_2.mp3', jump_crouch_3: 'jump_crouch_3.mp3',
  jump_takeoff_light_1: 'jump_takeoff_light_1.mp3', jump_takeoff_light_2: 'jump_takeoff_light_2.mp3', jump_takeoff_light_3: 'jump_takeoff_light_3.mp3',
  jump_takeoff_heavy_1: 'jump_takeoff_heavy_1.mp3', jump_takeoff_heavy_2: 'jump_takeoff_heavy_2.mp3', jump_takeoff_heavy_3: 'jump_takeoff_heavy_3.mp3',
  jump_land_light_1: 'jump_land_light_1.mp3', jump_land_light_2: 'jump_land_light_2.mp3', jump_land_light_3: 'jump_land_light_3.mp3',
  jump_land_normal_1: 'jump_land_normal_1.mp3', jump_land_normal_2: 'jump_land_normal_2.mp3', jump_land_normal_3: 'jump_land_normal_3.mp3',
  jump_land_heavy_1: 'jump_land_heavy_1.mp3', jump_land_heavy_2: 'jump_land_heavy_2.mp3', jump_land_heavy_3: 'jump_land_heavy_3.mp3',
};

// 二次贝塞尔：SVG 光轨与粒子飞行共用同一控制点（防轨道分离）
function bez(a, c, b, t) { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; }
function flyOrb(fx, a, c, b, { size, color, core, ms, delay = 0, s0 = 0.6, s1 = 1, fade = false, where = 'top', ease = 'cubic-bezier(0.45,0,0.25,1)' }) {
  const layer = fx[where](orbHtml(0, 0, size, color, core), ms + delay + 80);
  const frames = [];
  for (let k = 0; k <= 12; k++) {
    const p = bez(a, c, b, k / 12);
    frames.push({ transform: 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) scale(' + (s0 + (s1 - s0) * k / 12).toFixed(3) + ')', opacity: k === 0 ? 0 : (fade && k === 12 ? 0 : 1) });
  }
  layer.firstChild.animate(frames, { duration: ms, delay, easing: ease, fill: 'both' });
  return layer;
}
// 羽化光轨：渐变描边沿同一贝塞尔"彗尾"推进（stroke-dashoffset），无硬边
function trail(fx, a, c, b, { color, width = 6, ms, delay = 0 }) {
  const uid = fx.uid();
  const html = '<svg width="1" height="1" style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none"><defs>' +
    '<linearGradient id="tg' + uid + '" gradientUnits="userSpaceOnUse" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"><stop offset="0" stop-color="' + color + '" stop-opacity="0.15"/><stop offset="0.7" stop-color="' + color + '" stop-opacity="0.85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.95"/></linearGradient>' +
    '<filter id="tb' + uid + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
    '<path d="M' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ' Q' + c.x.toFixed(1) + ',' + c.y.toFixed(1) + ' ' + b.x.toFixed(1) + ',' + b.y.toFixed(1) + '" fill="none" stroke="url(#tg' + uid + ')" stroke-width="' + width + '" stroke-linecap="round" filter="url(#tb' + uid + ')" pathLength="100" stroke-dasharray="34 140" stroke-dashoffset="34"/></svg>';
  const layer = fx.top(html, ms + delay + 60);
  layer.querySelector('path').animate([{ strokeDashoffset: 34, opacity: 0.9 }, { strokeDashoffset: -66, opacity: 1, offset: 0.85 }, { strokeDashoffset: -100, opacity: 0 }], { duration: ms, delay, easing: 'cubic-bezier(0.45,0,0.25,1)', fill: 'both' });
  return layer;
}
// 世界层飘字（规则真值文本，只做显示）
function floatText(fx, x, y, text, color, glow, { ms = 900, size = 16, delay = 0 } = {}) {
  const l = fx.top('<b style="position:absolute;left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-50%);white-space:nowrap;font:800 ' + size + 'px/1 system-ui,sans-serif;color:' + color + ';text-shadow:0 0 8px ' + glow + ',0 1px 2px rgba(0,0,0,.85);pointer-events:none;">' + text + '</b>', ms + delay);
  l.firstChild.animate([{ transform: 'translate(-50%,-20%) scale(.7)', opacity: 0 }, { transform: 'translate(-50%,-75%) scale(1.08)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-95%) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-150%) scale(.96)', opacity: 0 }], { duration: ms, delay, fill: 'both' });
  return l;
}
// 视口色罩（与位置无关的环境色）：淡入 → 保持 → 淡出
function tint(fx, css, { inMs, holdMs, outMs, peak }) {
  const ms = inMs + holdMs + outMs;
  fx.screen('<i style="position:absolute;inset:0;background:' + css + ';"></i>', ms).firstChild
    .animate([{ opacity: 0 }, { opacity: peak, offset: inMs / ms }, { opacity: peak, offset: (inMs + holdMs) / ms }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}
// 世界层暗场（锚在目标，镜头移动不漂移；目标周围留光孔）
function worldDarken(fx, at, { holeR, inMs, holdMs, outMs, peak }) {
  const ms = inMs + holdMs + outMs, S = 7000;
  fx.top('<i style="position:absolute;left:' + at.x + 'px;top:' + at.y + 'px;width:' + S + 'px;height:' + S + 'px;margin:' + (-S / 2) + 'px 0 0 ' + (-S / 2) + 'px;' +
    'background:radial-gradient(circle,rgba(4,6,14,0) 0px,rgba(4,6,14,0) ' + holeR + 'px,rgba(4,6,14,.88) ' + (holeR * 3.2) + 'px);pointer-events:none;"></i>', ms).firstChild
    .animate([{ opacity: 0 }, { opacity: peak, offset: inMs / ms }, { opacity: peak, offset: (inMs + holdMs) / ms }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}
function spin(el, deg, ms, easing = 'linear') { if (el) el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + deg + 'deg)' }], { duration: ms, easing, fill: 'forwards' }); }
function grow(el, { ms, s0 = 0.4, s1 = 1, hold = 0.7, s2 = s1 * 1.05, o = 1 }) {
  el.animate([{ transform: 'translate(-50%,-50%) scale(' + s0 + ')', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(' + s1 + ')', opacity: o, offset: 0.3 },
    { transform: 'translate(-50%,-50%) scale(' + s1 + ')', opacity: o, offset: hold }, { transform: 'translate(-50%,-50%) scale(' + s2 + ')', opacity: 0 }], { duration: ms, fill: 'forwards' });
}

// ---------- 枪械共用画法：移植回合制 gunshot / 枪击穿透 / 连续扫射 原版构图（枪口焰、曳光、激波星芒、血雾、抛壳、屏幕血块） ----------
const STAR8 = 'polygon(50% 0,59% 41%,100% 50%,59% 59%,50% 100%,41% 59%,0 50%,41% 41%)';
const deg = r => r * 180 / Math.PI;
// 枪口焰：沿射向的锥形焰舌 + 8 芒星芯 + 青烟（p 为枪口世界像素，ang 为射向弧度）
function gunFlash(fx, p, ang, { size = 32, ms = 150, smoke = true } = {}) {
  const r = deg(ang), s = size, r0 = rnd(0, 45);
  const l = fx.top(
    '<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + (s * 1.7) + 'px;height:' + s + 'px;margin-top:' + (-s / 2) + 'px;transform-origin:0 50%;' +
      'clip-path:polygon(0 38%,62% 4%,100% 50%,62% 96%,0 62%);background:radial-gradient(ellipse at 18% 50%,#fff 0%,#fef08a 28%,#f97316 62%,rgba(220,38,38,0) 82%);mix-blend-mode:screen;"></i>' +
    '<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + s + 'px;height:' + s + 'px;margin:' + (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px;' +
      'clip-path:' + STAR8 + ';background:radial-gradient(circle,#fff 0%,#fef08a 40%,rgba(249,115,22,0) 74%);mix-blend-mode:screen;"></i>', ms + 40);
  const [tongue, star] = l.children;
  tongue.animate([{ transform: 'rotate(' + r + 'deg) scaleX(.25)', opacity: 1 }, { transform: 'rotate(' + r + 'deg) scaleX(1.2)', opacity: 1, offset: 0.3 }, { transform: 'rotate(' + r + 'deg) scaleX(.7)', opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  star.animate([{ transform: 'rotate(' + r0 + 'deg) scale(.3)', opacity: 1 }, { transform: 'rotate(' + (r0 + 12) + 'deg) scale(1.25)', opacity: 1, offset: 0.3 }, { transform: 'rotate(' + (r0 + 20) + 'deg) scale(.9)', opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  if (!smoke) return;
  const sm = fx.top('<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + s + 'px;height:' + s + 'px;margin:' + (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px;border-radius:50%;background:radial-gradient(circle,rgba(203,213,225,.42) 0%,rgba(148,163,184,.2) 50%,transparent 72%);"></i>', 640);
  sm.firstChild.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.9 }, { transform: 'translate(' + (Math.cos(ang) * 10 + rnd(-6, 6)).toFixed(1) + 'px,' + (-14 - rnd(0, 12)).toFixed(1) + 'px) scale(1.7)', opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'both' });
}
// 曳光弹：亮芯短包沿直线急速推进（回合制 _spawnStrafeTracer：~110ms 彗尾 + 白炽弹头）
const TRACER_RED = ['linear-gradient(90deg,rgba(127,29,29,0),rgba(220,38,38,.85) 50%,#fca5a5 88%,#fff)', '#ef4444'];
function tracer(fx, a, b, { width = 3, ms = 110, len = 64, delay = 0, sky = false, tint = null } = {}) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.max(1, Math.hypot(dx, dy)), k = Math.min(len, L * 0.6);
  const grad = tint ? tint[0] : sky ? 'linear-gradient(90deg,rgba(14,165,233,0),rgba(56,189,248,.8) 55%,#e0f2fe 88%,#fff)' : 'linear-gradient(90deg,rgba(245,158,11,0),rgba(251,191,36,.78) 50%,#fef08a 88%,#fff)';
  const l = fx.top('<div style="position:absolute;left:' + a.x + 'px;top:' + a.y + 'px;width:0;height:0;transform:rotate(' + deg(Math.atan2(dy, dx)).toFixed(1) + 'deg);">' +
    '<i style="position:absolute;left:0;top:' + (-width / 2) + 'px;width:' + k.toFixed(1) + 'px;height:' + width + 'px;border-radius:' + width + 'px;transform-origin:100% 50%;background:' + grad + ';box-shadow:0 0 ' + (width * 3) + 'px ' + (tint ? tint[1] : sky ? '#38bdf8' : '#f59e0b') + ';mix-blend-mode:screen;"></i></div>', ms + delay + 40);
  l.firstChild.firstChild.animate([{ transform: 'translateX(0) scaleX(.4)', opacity: 1 }, { transform: 'translateX(' + (L - k).toFixed(1) + 'px) scaleX(1)', opacity: 1, offset: 0.85 }, { transform: 'translateX(' + (L - k).toFixed(1) + 'px) scaleX(.1)', opacity: 0 }], { duration: ms, delay, easing: 'linear', fill: 'both' });
}
// 喷溅：gore = 暗红血滴（正常混合，抛物下坠）；spark = 金色跳弹火星条（screen 混合）
const GORE = ['#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'];
function spray(fx, p, n, { kind = 'gore', ang = null, spread = TAU, dist = [16, 60], size = [3, 6.5], ms = [380, 680], colors } = {}) {
  const gore = kind === 'gore';
  const list = Array.from({ length: n }, () => ({
    a: ang == null ? rnd(0, TAU) : ang + rnd(-spread / 2, spread / 2), d: rnd(dist[0], dist[1]), s: rnd(size[0], size[1]),
    c: pick(colors || (gore ? GORE : ['#fef08a', '#fde047', '#f97316'])), dur: rnd(ms[0], ms[1]), x: p.x + rnd(-6, 6), y: p.y + rnd(-6, 6),
  }));
  const layer = fx.top(list.map(q => {
    const w = gore ? q.s * 1.5 : q.s * 4, h = gore ? q.s : Math.max(1.6, q.s * 0.45);
    return '<i style="position:absolute;left:' + q.x.toFixed(1) + 'px;top:' + q.y.toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px;margin:' + (-h / 2).toFixed(1) + 'px 0 0 ' + (-w / 2).toFixed(1) + 'px;border-radius:' + (gore ? '50%' : h.toFixed(1) + 'px') + ';' +
      (gore ? 'background:radial-gradient(circle at 35% 35%,' + q.c + ' 0%,' + q.c + ' 55%,#450a0a 100%);box-shadow:0 0 3px rgba(69,10,10,.8);'
        : 'background:linear-gradient(90deg,transparent,' + q.c + ' 60%,#fff);box-shadow:0 0 6px ' + q.c + ';mix-blend-mode:screen;') + '"></i>';
  }).join(''), Math.max(...list.map(q => q.dur)) + 40);
  [...layer.children].forEach((el, i) => {
    const q = list[i], dx = Math.cos(q.a) * q.d, dy = Math.sin(q.a) * q.d, r = deg(q.a).toFixed(1), fall = gore ? 18 + q.d * 0.25 : 6;
    el.animate([{ transform: 'translate(0,0) rotate(' + r + 'deg) scale(.6)', opacity: 1 },
      { transform: 'translate(' + (dx * 0.72).toFixed(1) + 'px,' + (dy * 0.72 - (gore ? 6 : 0)).toFixed(1) + 'px) rotate(' + r + 'deg) scale(1.1)', opacity: 0.95, offset: 0.45 },
      { transform: 'translate(' + dx.toFixed(1) + 'px,' + (dy + fall).toFixed(1) + 'px) rotate(' + r + 'deg) scale(' + (gore ? 0.75 : 0.3) + ')', opacity: 0 }],
      { duration: q.dur, easing: 'cubic-bezier(0.2,0.7,0.4,1)', fill: 'both' });
  });
}
// 抛壳：黄铜弹壳向射向侧面翻滚抛出、受重力下坠（side=±1 左右枪）
function casing(fx, p, ang, side = 1) {
  const a = ang + side * Math.PI / 2 + rnd(-0.35, 0.35), d = rnd(18, 30), dx = Math.cos(a) * d, dy = Math.sin(a) * d, spin = rnd(360, 900) * (Math.random() < 0.5 ? -1 : 1);
  const l = fx.top('<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:3.5px;height:8px;margin:-4px 0 0 -1.75px;border-radius:1px;background:linear-gradient(90deg,#fde68a,#b45309 55%,#fde68a);box-shadow:0 0 3px #d97706;"></i>', 720);
  l.firstChild.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
    { transform: 'translate(' + dx.toFixed(1) + 'px,' + (dy - 16).toFixed(1) + 'px) rotate(' + (spin * 0.45).toFixed(0) + 'deg)', opacity: 1, offset: 0.4 },
    { transform: 'translate(' + (dx * 1.5).toFixed(1) + 'px,' + (dy * 1.5 + 14).toFixed(1) + 'px) rotate(' + spin.toFixed(0) + 'deg)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(0.3,0.6,0.6,1)', fill: 'both' });
}
// 命中激波：双圈冲击环 + 6 向火星 + 8 芒星芯（回合制 gunshot / gunshot_pierce 命中构图）
function gunImpact(fx, p, { size = 64, sky = false, ms = 420 } = {}) {
  const c1 = sky ? 'rgba(56,189,248,.95)' : 'rgba(254,240,138,.95)', c2 = sky ? 'rgba(255,255,255,.75)' : 'rgba(249,115,22,.65)';
  const core = sky ? 'radial-gradient(circle,#fff 0%,#e0f2fe 30%,#38bdf8 62%,rgba(2,132,199,0) 78%)' : 'radial-gradient(circle,#fff 0%,#fef08a 32%,#f97316 64%,rgba(220,38,38,0) 80%)';
  const l = fx.top(ringHtml(p.x, p.y, size, c1, c2) + ringHtml(p.x, p.y, size * 0.7, c2, c1) +
    '<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + size + 'px;height:' + size + 'px;margin:' + (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px;clip-path:' + STAR8 + ';background:' + core + ';mix-blend-mode:screen;"></i>', ms + 80);
  const [r1, r2, star] = l.children, r0 = rnd(0, 45);
  const ring = [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0.75, offset: 0.5 }, { transform: 'scale(2.4)', opacity: 0 }];
  r1.animate(ring, { duration: ms * 0.8, easing: 'cubic-bezier(0.1,0.8,0.2,1)', fill: 'forwards' });
  r2.animate(ring, { duration: ms * 0.7, delay: 40, easing: 'cubic-bezier(0.1,0.8,0.2,1)', fill: 'both' });
  star.animate([{ transform: 'rotate(' + r0 + 'deg) scale(.15)', opacity: 0 }, { transform: 'rotate(' + (r0 + 12) + 'deg) scale(1.18)', opacity: 1, offset: 0.18 },
    { transform: 'rotate(' + (r0 + 20) + 'deg) scale(1.02)', opacity: 0.9, offset: 0.4 }, { transform: 'rotate(' + (r0 + 35) + 'deg) scale(1.35)', opacity: 0 }], { duration: ms * 0.8, easing: 'cubic-bezier(0.12,0.9,0.25,1)', fill: 'forwards' });
  spray(fx, p, 6, { kind: 'spark', dist: [size * 0.4, size * 0.8], size: [2, 3], ms: [220, 320], colors: sky ? ['#e0f2fe', '#7dd3fc', '#ffffff'] : null });
}
// 单位受击/后坐微颤：只动独立 translate/filter 属性，不覆盖既有 transform 动画
function jolt(ctx, id, { amp = 4, ms = 60, times = 1, glow = '#f59e0b' } = {}) {
  const el = ctx.sandbox.getUnitView().nodes.get(id)?.sprite;
  if (!el) return;
  el.animate([{ translate: '0 0', filter: 'none' }, { translate: amp + 'px ' + (-amp * 0.6) + 'px', filter: 'brightness(1.9) drop-shadow(0 0 12px ' + glow + ')', offset: 0.3 },
    { translate: (-amp) + 'px ' + (amp * 0.6) + 'px', filter: 'brightness(1.3) drop-shadow(0 0 6px ' + glow + ')', offset: 0.7 }, { translate: '0 0', filter: 'none' }], { duration: ms * 2, iterations: times, easing: 'ease-in-out' });
}
// 屏幕血块（视口层，回合制 _createStrafeScreenBloodOverlay）：暗红边缘压暗 + 8 团有机血渍依次溅上镜头 + 顶缘血泪垂落
const SPLAT_PATHS = [
  'M22,12 C40,4 68,14 62,35 C75,44 78,68 60,78 C42,86 18,74 12,54 C8,38 12,22 22,12 Z',
  'M32,6 C48,4 62,18 56,36 C72,32 82,48 76,64 C60,82 42,76 32,86 C16,80 8,58 14,42 C4,26 22,10 32,6 Z',
  'M18,22 C34,10 56,12 46,34 C62,38 68,60 52,72 C38,82 22,86 16,66 C6,50 6,32 18,22 Z',
  'M26,14 C44,5 60,20 52,36 C66,46 68,70 52,80 C36,90 20,74 14,56 C9,40 14,22 26,14 Z',
];
const SPLAT_POS = [
  { top: '8%', left: '8%', size: 140, rot: -22, delay: 80 }, { top: '12%', right: '10%', size: 155, rot: 35, delay: 160 },
  { bottom: '15%', left: '10%', size: 135, rot: 15, delay: 250 }, { bottom: '18%', right: '8%', size: 160, rot: -45, delay: 350 },
  { top: '4%', left: '38%', size: 110, rot: 65, delay: 480 }, { bottom: '8%', right: '35%', size: 125, rot: -15, delay: 650 },
  { top: '48%', left: '4%', size: 115, rot: -55, delay: 850 }, { top: '52%', right: '5%', size: 120, rot: 40, delay: 1050 },
];
const SPLAT_DRIPS = [['right:25%', 6, 150, 250], ['left:22%', 8, 180, 450], ['right:42%', 4, 120, 650]];
// opt：pos/drips 覆盖血块与血泪布局，each 为每团时长（默认铺满 ms），drip 第 5 项为该道时长
function screenBlood(fx, ms, { pos: P = SPLAT_POS, drips: DR = SPLAT_DRIPS, each = 0 } = {}) {
  const pos = s => (s.top ? 'top:' + s.top + ';' : '') + (s.bottom ? 'bottom:' + s.bottom + ';' : '') + (s.left ? 'left:' + s.left + ';' : '') + (s.right ? 'right:' + s.right + ';' : '');
  const splats = P.map((s, i) => {
    const d = SPLAT_PATHS[i % SPLAT_PATHS.length];
    return '<div data-splat style="position:absolute;' + pos(s) + 'width:' + s.size + 'px;height:' + s.size + 'px;opacity:0;filter:drop-shadow(0 0 8px #7f1d1d);">' +
      '<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="' + d + '" fill="#7f1d1d"/><path d="' + d + '" fill="#991b1b" transform="translate(8,8) scale(.85)" opacity=".9"/>' +
      '<circle cx="85" cy="18" r="4.5" fill="#991b1b"/><circle cx="15" cy="85" r="3.5" fill="#7f1d1d"/><circle cx="92" cy="72" r="5" fill="#881337"/><circle cx="6" cy="16" r="3" fill="#991b1b"/><circle cx="70" cy="92" r="2.5" fill="#dc2626"/>' +
      '<circle cx="35" cy="28" r="1.8" fill="#fff" opacity=".6"/><circle cx="58" cy="45" r="1.5" fill="#fff" opacity=".5"/></svg></div>';
  }).join('');
  const drips = DR.map(([x, w, h]) => '<i data-drip style="position:absolute;top:0;' + x + ';width:' + w + 'px;height:' + h + 'px;border-radius:' + w + 'px;transform-origin:50% 0;opacity:0;' +
    'background:linear-gradient(#b91c1c,#7f1d1d 55%,transparent);filter:drop-shadow(0 0 6px #450a0a);"></i>').join('');
  const root = fx.screen('<i data-vig style="position:absolute;inset:0;opacity:0;background:radial-gradient(circle,transparent 32%,rgba(136,8,8,.45) 70%,rgba(65,8,8,.95) 100%);"></i>' + splats + drips, ms);
  root.style.overflow = 'hidden';
  root.querySelector('[data-vig]').animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)', offset: 0.12 }, { opacity: 0.9, transform: 'scale(1.02)', offset: 0.85 }, { opacity: 0, transform: 'scale(1.05)' }],
    { duration: ms, easing: 'cubic-bezier(0.1,0.8,0.2,1)', fill: 'forwards' });
  root.querySelectorAll('[data-splat]').forEach((el, i) => {
    const s = P[i], rr = ' rotate(' + s.rot + 'deg)';
    el.animate([{ transform: 'scale(.12)' + rr, opacity: 0 }, { transform: 'scale(1.12)' + rr, opacity: 1, offset: 0.22 }, { transform: 'scale(1)' + rr, opacity: 0.96, offset: 0.38 },
      { transform: 'translateY(4px) scale(1.01)' + rr, opacity: 0.88, offset: 0.75 }, { transform: 'translateY(12px) scale(1.04)' + rr, opacity: 0 }],
      { duration: each || ms - s.delay, delay: s.delay, easing: 'cubic-bezier(0.12,0.85,0.25,1)', fill: 'both' });
  });
  root.querySelectorAll('[data-drip]').forEach((el, i) => {
    const dl = DR[i][3];
    el.animate([{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 0.95, offset: 0.25 }, { transform: 'translateY(8px) scaleY(1.06)', opacity: 0.85, offset: 0.7 }, { transform: 'translateY(18px) scaleY(1.12)', opacity: 0 }],
      { duration: DR[i][4] || ms - dl, delay: dl, easing: 'ease-out', fill: 'both' });
  });
}
// 弱点锁定准星（回合制 pierce-weakpoint-lock）：菱形虚线框 + 内圈 + 十字分划，由大旋入收紧
// snap：命中拍点即刻满亮出现（与伤害同帧），只做急速收紧与外扩淡出
function pierceLock(fx, p, d, ms, { snap = false } = {}) {
  const l = fx.top('<svg viewBox="0 0 120 120" width="' + d + '" height="' + d + '" style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;margin:' + (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px;overflow:visible;filter:drop-shadow(0 0 6px #38bdf8);">' +
    '<polygon points="60,10 110,60 60,110 10,60" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="8 4"/><circle cx="60" cy="60" r="38" fill="none" stroke="#0ea5e9" stroke-width="1.8"/>' +
    '<path d="M60,5 V35 M60,85 V115 M5,60 H35 M85,60 H115" stroke="#f0f9ff" stroke-width="2.5"/><circle cx="60" cy="60" r="6" fill="#38bdf8"/></svg>', ms + 40);
  l.firstChild.animate(snap
    ? [{ transform: 'scale(1.35) rotate(-20deg)', opacity: 1, filter: 'brightness(2.2)' }, { transform: 'scale(.92) rotate(0deg)', opacity: 1, filter: 'brightness(1.4)', offset: 0.18 },
      { transform: 'scale(1) rotate(4deg)', opacity: 1, offset: 0.55 }, { transform: 'scale(1.45) rotate(18deg)', opacity: 0 }]
    : [{ transform: 'scale(2.2) rotate(-45deg)', opacity: 0 }, { transform: 'scale(.95) rotate(0deg)', opacity: 1, offset: 0.3 }, { transform: 'scale(1.05) rotate(5deg)', opacity: 1, offset: 0.5 },
      { transform: 'scale(1.15) rotate(10deg)', opacity: 0.8, offset: 0.72 }, { transform: 'scale(1.4) rotate(20deg)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(0.15,0.9,0.2,1)', fill: 'forwards' });
}
// 超音速贯穿光束（回合制 pierce-beam-penetrate）：自枪口贯穿目标并向后延伸，横向先胀后收
function pierceBeam(fx, a, b, { width = 14, ms = 420 } = {}) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  const l = fx.top('<div style="position:absolute;left:' + a.x + 'px;top:' + a.y + 'px;width:0;height:0;transform:rotate(' + deg(Math.atan2(dy, dx)).toFixed(1) + 'deg);">' +
    '<i style="position:absolute;left:0;top:' + (-width / 2) + 'px;width:' + L.toFixed(1) + 'px;height:' + width + 'px;border-radius:' + width + 'px;transform-origin:0 50%;' +
    'background:linear-gradient(90deg,rgba(186,230,253,0),#a5f3fc 30%,#e0f2fe 70%,#0ea5e9);box-shadow:0 0 18px #0284c7;mix-blend-mode:screen;"></i></div>', ms + 40);
  l.firstChild.firstChild.animate([{ transform: 'scaleX(.1) scaleY(2.2)', opacity: 0 }, { transform: 'scaleX(1.05) scaleY(1)', opacity: 1, offset: 0.15 }, { transform: 'scaleX(1) scaleY(.7)', opacity: 0.9, offset: 0.4 }, { transform: 'scaleX(1) scaleY(0)', opacity: 0 }],
    { duration: ms, easing: 'cubic-bezier(0.1,0.9,0.2,1)', fill: 'forwards' });
}
// 普通枪击加强（世界层叠加于视听底座身份演出之上，不改底座）：出膛枪口焰 + 抛壳 + 后坐；命中激波星芒 + 血雾 + 受击颤 + 中震
function gunFire(ctx, to) {
  const c = worldPx(ctx.centerOf(ctx.casterId)), t = worldPx(to), ang = Math.atan2(t.y - c.y, t.x - c.x);
  gunFlash(ctx.fx, { x: c.x + Math.cos(ang) * 20, y: c.y + Math.sin(ang) * 20 }, ang, { size: 30, ms: 150 });
  casing(ctx.fx, c, ang);
  jolt(ctx, ctx.casterId, { amp: 2.5, ms: 45 });
}
function gunHit(ctx, impact) {
  if (!impact.hit) return;
  const c = worldPx(ctx.centerOf(ctx.casterId)), t = worldPx(ctx.centerOf(impact.targetId)), ang = Math.atan2(t.y - c.y, t.x - c.x);
  gunImpact(ctx.fx, t, { size: 62 });
  spray(ctx.fx, t, 8, { kind: 'gore', ang, spread: 1.7, dist: [14, 52] });
  jolt(ctx, impact.targetId, { amp: 4, ms: 55, times: 2 });
  ctx.fx.shake('medium');
}

// ---------- 霰弹与独头弹（弗兰克温切斯特）共用 ----------
// 红色霰弹壳：塑料壳身 + 黄铜底，翻滚抛出受重力下坠（泵动上膛）
function shellCasing(fx, p, ang, side = 1) {
  const a = ang + Math.PI + side * 0.9 + rnd(-0.3, 0.3), d = rnd(22, 34), dx = Math.cos(a) * d, dy = Math.sin(a) * d, spin = rnd(420, 820) * (Math.random() < 0.5 ? -1 : 1);
  const l = fx.top('<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:5px;height:11px;margin:-5.5px 0 0 -2.5px;border-radius:1.5px;' +
    'background:linear-gradient(180deg,#dc2626 0%,#991b1b 66%,#fbbf24 67%,#b45309 100%);box-shadow:0 0 3px rgba(0,0,0,.6);"></i>', 760);
  l.firstChild.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
    { transform: 'translate(' + dx.toFixed(1) + 'px,' + (dy - 20).toFixed(1) + 'px) rotate(' + (spin * 0.45).toFixed(0) + 'deg)', opacity: 1, offset: 0.4 },
    { transform: 'translate(' + (dx * 1.5).toFixed(1) + 'px,' + (dy * 1.5 + 16).toFixed(1) + 'px) rotate(' + spin.toFixed(0) + 'deg)', opacity: 0 }], { duration: 740, easing: 'cubic-bezier(0.3,0.6,0.6,1)', fill: 'both' });
}
// 枪口硝烟环：出膛后向前推出的灰白烟圈
function smokeRing(fx, p, ang, D = 1.2 * PX) {
  const l = fx.top('<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + D + 'px;height:' + D + 'px;margin:' + (-D / 2) + 'px 0 0 ' + (-D / 2) + 'px;border-radius:50%;' +
    'background:radial-gradient(circle,transparent 36%,rgba(203,213,225,.55) 52%,rgba(148,163,184,.3) 64%,transparent 74%);"></i>', 720);
  l.firstChild.animate([{ transform: 'translate(0,0) scale(.3)', opacity: 0.9 }, { transform: 'translate(' + (Math.cos(ang) * 26).toFixed(1) + 'px,' + (Math.sin(ang) * 26 - 8).toFixed(1) + 'px) scale(1.6)', opacity: 0 }], { duration: 700, easing: 'ease-out', fill: 'both' });
}
// 鹿弹出膛：宽口径扇面枪焰 + 硝烟环 + 泵动抛壳 + 后坐
function shotgunFire(ctx, to) {
  const c = worldPx(ctx.centerOf(ctx.casterId)), t = worldPx(to), ang = Math.atan2(t.y - c.y, t.x - c.x);
  const m = { x: c.x + Math.cos(ang) * 20, y: c.y + Math.sin(ang) * 20 };
  gunFlash(ctx.fx, m, ang, { size: 46, ms: 170 });
  gunFlash(ctx.fx, m, ang + 0.32, { size: 28, ms: 140, smoke: false });
  gunFlash(ctx.fx, m, ang - 0.32, { size: 28, ms: 140, smoke: false });
  smokeRing(ctx.fx, m, ang);
  ctx.after(160, () => shellCasing(ctx.fx, c, ang));
  jolt(ctx, ctx.casterId, { amp: 4, ms: 50, glow: '#fb923c' });
  ctx.fx.shake('medium');
}
// 鹿弹命中：多颗弹丸弹孔散布炸点 + 火星 + 血雾 + 被轰后仰；同一发多目标只震一次
function shotgunHit(ctx, impact) {
  if (!impact.hit) return;
  const c = worldPx(ctx.centerOf(ctx.casterId)), t = worldPx(ctx.centerOf(impact.targetId)), ang = Math.atan2(t.y - c.y, t.x - c.x);
  for (let k = 0; k < 6; k++) {
    const q = { x: t.x + rnd(-22, 22), y: t.y + rnd(-22, 22) };
    ctx.after(k * 14, () => gunImpact(ctx.fx, q, { size: rnd(22, 34), ms: 300 }));
  }
  spray(ctx.fx, t, 12, { kind: 'gore', ang, spread: 1.9, dist: [16, 70], size: [2.5, 6.5] });
  spray(ctx.fx, t, 10, { kind: 'spark', ang, spread: 2.2, dist: [20, 66], size: [2, 3.2], ms: [220, 340] });
  heavyFlinch(ctx, impact.targetId, RECOIL_FLINCH, ang);
  if (ctx.__shotgunShook !== ctx.result) { ctx.__shotgunShook = ctx.result; ctx.fx.shake('heavy'); ctx.after(240, () => { ctx.__shotgunShook = null; }); }
}

// ---------- 重击共用（移植回合制 index 远程重击 / 近战重击方案1） ----------
// 原版震屏关键帧：位移 + 缩放 + 旋转（比通用 shake 档位更重），直接驱动沙盘震屏层
const HEAVY_SHAKE_AT = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1];
const MELEE_HEAVY_SHAKE = [[0, 0, 1, 0], [-16, 14, 1.035, -2], [18, -12, 1.045, 2.2], [-14, 8, 1.025, -1.5], [10, -6, 1.015, 1], [-6, 4, 1.008, -0.5], [3, -2, 1.003, 0.2], [0, 0, 1, 0]];
const RANGED_HEAVY_SHAKE = [[0, 0, 1, 0], [-18, 12, 1.04, -2], [20, -14, 1.05, 2.2], [-15, 9, 1.03, -1.5], [12, -7, 1.02, 1], [-7, 4, 1.01, -0.5], [4, -2, 1.005, 0.2], [0, 0, 1, 0]];
function heavyShake(ctx, rows, ms) {
  ctx.sandbox.getDom().shake.animate(rows.map(([x, y, s, r], i) => ({ transform: 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + s + ') rotate(' + r + 'deg)', offset: HEAVY_SHAKE_AT[i] })),
    { duration: ms, easing: 'cubic-bezier(0.36,0.07,0.19,0.97)' });
}
// 原版受击后仰（近战 ram = 被推撞横移踉跄，远程 recoil = 中弹后仰）；位移沿攻击方向旋转，独立 translate/scale/rotate/filter 不覆盖单位既有动画
const RAM_FLINCH = { at: [0, 0.12, 0.3, 0.55, 0.8, 1], rows: [[0, 0, 1, 0], [38, -12, 0.88, 9], [20, 8, 1.08, -5], [8, -4, 0.96, 2], [-2, 1, 1.02, -1], [0, 0, 1, 0]],
  flash: ['none', 'brightness(3) contrast(1.5) drop-shadow(0 0 35px #f59e0b)', 'brightness(1.8) drop-shadow(0 0 20px #fbbf24)', 'brightness(1.2)', 'none', 'none'] };
const RECOIL_FLINCH = { at: [0, 0.1, 0.28, 0.5, 0.75, 1], rows: [[0, 0, 1, 0], [14, 0, 0.88, -6], [-16, 0, 1.1, 4], [6, 0, 0.96, -2], [-2, 0, 1.02, 1], [0, 0, 1, 0]],
  flash: ['none', 'brightness(3) contrast(1.5) drop-shadow(0 0 30px #ef4444)', 'brightness(1.8) drop-shadow(0 0 20px #f97316)', 'brightness(1.2)', 'none', 'none'] };
function heavyFlinch(ctx, id, F, ang) {
  const el = ctx.sandbox.getUnitView().nodes.get(id)?.sprite;
  if (!el) return;
  const c = Math.cos(ang), s = Math.sin(ang);
  el.animate(F.rows.map(([a, b, k, r], i) => ({ translate: (a * c - b * s).toFixed(1) + 'px ' + (a * s + b * c).toFixed(1) + 'px', scale: String(k), rotate: r + 'deg', filter: F.flash[i], offset: F.at[i] })),
    { duration: 550, easing: 'cubic-bezier(0.15,0.85,0.35,1)' });
}
// 视口平色闪（原版 melee/ranged-heavy-screen-flash）
function screenFlash(fx, color, peak, ms) {
  fx.screen('<i style="position:absolute;inset:0;background:' + color + ';"></i>', ms + 40).firstChild
    .animate([{ opacity: 0 }, { opacity: peak, offset: 0.12 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}
// 8 向火星束：沿各自方向外喷（原版 *-spark-jet）
function sparkJets(D, w, h, color, glow) {
  return [0, 45, 90, 135, 180, 225, 270, 315].map(d => '<i data-jet="' + d + '" style="position:absolute;left:' + (-w / 2) + 'px;top:' + (-h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;border-radius:' + w + 'px;opacity:0;' +
    'background:linear-gradient(0deg,transparent,' + color + ' 55%,#fff);filter:drop-shadow(0 0 6px ' + glow + ');"></i>').join('');
}
function animateJets(root, ms, d0, d1) {
  root.querySelectorAll('[data-jet]').forEach(el => {
    const r = el.dataset.jet + 'deg';
    el.animate([{ transform: 'rotate(' + r + ') translateY(0) scale(.2)', opacity: 1 }, { transform: 'rotate(' + r + ') translateY(' + (-d0) + 'px) scale(1.2)', opacity: 1, offset: 0.38 },
      { transform: 'rotate(' + r + ') translateY(' + (-d1) + 'px) scale(1.5)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(0.15,0.85,0.35,1)', fill: 'both' });
  });
}
const kf5 = (s, r, o) => s.map((v, i) => ({ transform: 'scale(' + v + ') rotate(' + r[i] + 'deg)', opacity: o[i] }));
// 原版重击低频冲击（playMeleeHeavySubBass / playRangedHeavySubBass）：振荡器 f0→f1 指数滑落 + 增益衰减，经混音器技能总线输出
function subBass(ctx, { type = 'sine', f0, f1, gain, ms }) {
  const M = ctx.av.CombatAudioMixer, ac = M.skillContext();
  if (!ac) return;
  const now = ac.currentTime, osc = ac.createOscillator(), g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, now); osc.frequency.exponentialRampToValueAtTime(f1, now + ms / 1000);
  g.gain.setValueAtTime(gain, now); g.gain.exponentialRampToValueAtTime(0.01, now + ms / 1000);
  osc.connect(g); g.connect(M.output('skill', ctx.audioContext?.category));
  osc.start(now); osc.stop(now + ms / 1000);
}
const MELEE_SUB_BASS = { type: 'triangle', f0: 160, f1: 36, gain: 0.75, ms: 300 };
const RANGED_SUB_BASS = { type: 'sine', f0: 140, f1: 32, gain: 0.8, ms: 350 };
// 近战重击·盾击推撞（原版 createMeleeHeavyHtml，原尺寸 240px）：双圈冲击环 + 沿冲撞方向的推撞新月波 + 碎裂线 + 8 向火星 + 金色爆核 + 眩晕星环
function meleeHeavyBurst(fx, p, ang, { D = 2.6 * PX, stun = true } = {}) {
  const k = D / 240, uid = fx.uid(), box = 'position:absolute;left:' + (-D / 2) + 'px;top:' + (-D / 2) + 'px;width:' + D + 'px;height:' + D + 'px;overflow:visible;';
  const root = fx.top('<div style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:0;height:0;">' +
    '<svg data-k="ring" viewBox="0 0 200 200" style="' + box + 'filter:drop-shadow(0 0 8px #f59e0b);"><circle cx="100" cy="100" r="48" fill="none" stroke="#fef08a" stroke-width="6"/><circle cx="100" cy="100" r="38" fill="none" stroke="#f97316" stroke-width="3.5" stroke-dasharray="10 5" opacity=".85"/></svg>' +
    '<div style="position:absolute;left:0;top:0;width:0;height:0;transform:rotate(' + deg(ang).toFixed(1) + 'deg);"><svg data-k="wave" viewBox="0 0 200 200" style="' + box + '">' +
      '<defs><linearGradient id="mw' + uid + '" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fef08a" stop-opacity=".9"/><stop offset="50%" stop-color="#f59e0b" stop-opacity=".7"/><stop offset="100%" stop-color="#ea580c" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M60,20 Q140,100 60,180 Q100,100 60,20 Z" fill="url(#mw' + uid + ')" style="filter:drop-shadow(0 0 10px #f59e0b);"/><path d="M75,40 Q135,100 75,160 Q105,100 75,40 Z" fill="#fff" opacity=".8"/></svg></div>' +
    '<svg data-k="crack" viewBox="0 0 200 200" style="' + box + 'filter:drop-shadow(0 0 6px #f59e0b);"><path d="M100,100 L40,60 M100,100 L60,150 M100,100 L160,50 M100,100 L150,160 M100,100 L170,105 M100,100 L30,110 M100,100 L100,30 M100,100 L95,175" stroke="#fcd34d" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="100" cy="100" r="12" fill="#fff"/></svg>' +
    sparkJets(D, 8 * k, 56 * k, '#fde047', '#f59e0b') +
    '<svg data-k="core" viewBox="0 0 200 200" style="' + box + 'filter:drop-shadow(0 0 14px #f59e0b);"><defs><radialGradient id="mc' + uid + '" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff"/><stop offset="35%" stop-color="#fef08a"/><stop offset="70%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309" stop-opacity="0"/></radialGradient></defs>' +
      '<polygon points="100,15 118,72 175,55 130,98 180,140 122,128 110,185 88,132 25,155 70,108 20,70 78,72" fill="url(#mc' + uid + ')"/><circle cx="100" cy="100" r="30" fill="#fff"/><circle cx="100" cy="100" r="44" fill="#fde047" opacity=".65"/></svg>' +
    (stun ? '<svg data-k="stun" viewBox="0 0 140 60" style="position:absolute;left:' + (-70 * k) + 'px;top:' + (-D * 0.62) + 'px;width:' + (140 * k) + 'px;height:' + (60 * k) + 'px;overflow:visible;opacity:0;filter:drop-shadow(0 0 6px #f59e0b);">' +
      '<ellipse cx="70" cy="30" rx="55" ry="18" fill="none" stroke="#fef08a" stroke-width="2.5" stroke-dasharray="8 6" opacity=".85"/><polygon points="20,25 24,30 20,35 16,30" fill="#fff"/><polygon points="120,25 124,30 120,35 116,30" fill="#fff"/>' +
      '<polygon points="70,10 75,15 70,20 65,15" fill="#fef08a"/><polygon points="70,42 75,47 70,52 65,47" fill="#fef08a"/></svg>' : '') +
    '</div>', 1050).firstChild;
  const q = s => root.querySelector('[data-k="' + s + '"]'), E = 'cubic-bezier(0.12,0.9,0.25,1)';
  q('ring').animate([{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.8)', opacity: 0.85, offset: 0.4 }, { transform: 'scale(2.8)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(0.1,0.8,0.2,1)', fill: 'forwards' });
  q('wave').animate([{ transform: 'translateX(0) scale(.2,.5)', opacity: 0 }, { transform: 'translateX(' + (D * 0.4) + 'px) scale(1.4,1.3)', opacity: 1, offset: 0.2 },
    { transform: 'translateX(' + (D * 0.75) + 'px) scale(1.8,1.5)', opacity: 0.75, offset: 0.5 }, { transform: 'translateX(' + (D * 1.15) + 'px) scale(2.3,1.7)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(0.15,0.9,0.25,1)', fill: 'forwards' });
  q('crack').animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.22 }, { transform: 'scale(1.15)', opacity: 0.8, offset: 0.6 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 500, easing: E, fill: 'forwards' });
  q('core').animate(kf5([0.1, 1.3, 1.1, 1.22, 1.45], [0, 10, 18, 25, 35], [0, 1, 0.95, 0.6, 0]).map((f, i) => ({ ...f, offset: [0, 0.15, 0.35, 0.7, 1][i] })), { duration: 480, easing: E, fill: 'forwards' });
  if (stun) q('stun').animate([{ transform: 'translateY(' + (D * 0.12) + 'px) scale(.2) rotate(0deg)', opacity: 0 }, { transform: 'translateY(-' + (D * 0.04) + 'px) scale(1.1) rotate(90deg)', opacity: 1, offset: 0.25 },
    { transform: 'translateY(-' + (D * 0.07) + 'px) scale(1) rotate(180deg)', opacity: 0.95, offset: 0.5 }, { transform: 'translateY(-' + (D * 0.1) + 'px) scale(1.05) rotate(270deg)', opacity: 0.9, offset: 0.75 },
    { transform: 'translateY(-' + (D * 0.16) + 'px) scale(1.15) rotate(360deg)', opacity: 0 }], { duration: 900, delay: 100, easing: 'cubic-bezier(0.12,0.85,0.25,1)', fill: 'both' });
  animateJets(root, 380, 28 * k, 58 * k);
}
// 远程重击·双管重爆（原版 createRangedHeavyMuzzleHtml，原尺寸 270px）：冲击双环 + 硝烟团 + 8 向火星 + 十二芒爆核
function rangedHeavyBurst(fx, p, { D = 2.9 * PX } = {}) {
  const k = D / 270, uid = fx.uid(), box = 'position:absolute;left:' + (-D / 2) + 'px;top:' + (-D / 2) + 'px;width:' + D + 'px;height:' + D + 'px;overflow:visible;';
  const root = fx.top('<div style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:0;height:0;">' +
    '<svg data-k="ring" viewBox="0 0 200 200" style="' + box + 'filter:drop-shadow(0 0 10px #f59e0b);"><circle cx="100" cy="100" r="50" fill="none" stroke="#fef08a" stroke-width="5"/><circle cx="100" cy="100" r="42" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="10 6" opacity=".8"/></svg>' +
    '<svg data-k="smoke" viewBox="0 0 200 200" style="' + box + 'opacity:0;"><g fill="#1c1917" fill-opacity=".8"><circle cx="90" cy="95" r="45"/><circle cx="115" cy="90" r="38"/><circle cx="100" cy="115" r="40"/></g></svg>' +
    sparkJets(D, 10 * k, 64 * k, '#fcd34d', '#f97316') +
    '<svg data-k="core" viewBox="0 0 200 200" style="' + box + 'filter:drop-shadow(0 0 18px #ea580c);"><defs><radialGradient id="rc' + uid + '" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff"/><stop offset="25%" stop-color="#fef08a"/><stop offset="55%" stop-color="#f97316"/><stop offset="85%" stop-color="#dc2626"/><stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/></radialGradient></defs>' +
      '<polygon points="100,10 120,70 185,45 135,95 190,140 125,130 115,190 90,135 20,160 65,110 10,75 75,70" fill="url(#rc' + uid + ')"/><polygon points="100,25 115,80 165,65 125,105 160,145 115,130 100,175 85,125 35,140 75,100 30,65 85,75" fill="#fef08a" opacity=".85"/>' +
      '<circle cx="92" cy="98" r="28" fill="#fff"/><circle cx="108" cy="102" r="28" fill="#fff"/><circle cx="100" cy="100" r="48" fill="#fde047" opacity=".7"/></svg>' +
    '</div>', 850).firstChild;
  const q = s => root.querySelector('[data-k="' + s + '"]');
  q('ring').animate([{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(2)', opacity: 0.85, offset: 0.4 }, { transform: 'scale(3.2)', opacity: 0 }], { duration: 450, easing: 'cubic-bezier(0.1,0.8,0.2,1)', fill: 'forwards' });
  q('smoke').animate(kf5([0.3, 1.1, 1.5, 1.9], [0, -15, -35, -50], [0, 0.75, 0.4, 0]).map((f, i) => ({ ...f, offset: [0, 0.25, 0.7, 1][i] })), { duration: 750, delay: 50, easing: 'ease-out', fill: 'both' });
  q('core').animate(kf5([0.1, 1.35, 1.15, 1.25, 1.45], [0, 15, 25, 40, 55], [0, 1, 0.95, 0.6, 0]).map((f, i) => ({ ...f, offset: [0, 0.12, 0.3, 0.7, 1][i] })), { duration: 550, easing: 'cubic-bezier(0.12,0.9,0.25,1)', fill: 'forwards' });
  animateJets(root, 420, 30 * k, 65 * k);
}
// 远程重击屏幕血块（原版 createRangedHeavyBloodHtml：5 团 1.15s + 2 道血泪）
const RANGED_SPLAT_POS = [
  { top: '16%', left: '18%', size: 150, rot: -25, delay: 80 }, { top: '65%', left: '22%', size: 150, rot: 45, delay: 120 },
  { top: '20%', right: '16%', size: 150, rot: 15, delay: 100 }, { top: '60%', right: '18%', size: 150, rot: -55, delay: 140 },
  { top: '38%', left: '46%', size: 150, rot: 8, delay: 50 },
];
const RANGED_SPLAT_DRIPS = [['right:25%', 6, 140, 150, 1250], ['left:22%', 8, 180, 100, 1350]];

// ==========================================
// 条目
// ==========================================

// 未知或缺失标签：按伤害类型与范围补通用出手音，由导演播放统一命中反馈。
// 敌方无专属特效的范围攻击按原版 resolveEnemyGroupAttackFx 走兜底群攻（近战/远程/法术）。
const neutralImpact = {
  id: 'neutral-impact', grade: 'identity', fallback: true,
  prepareKeys: () => ['atk1', 'atk2', 'light_impact', 'enemyMeleeGroupHit', 'enemyRangedGroupHit'],
  async play(ctx) {
    const sk = ctx.skill || {};
    const wide = !!(sk.range && sk.range.type !== '单体' && sk.range.type !== '自身');
    if (wide && !sk.fxTag && ctx.hits.length && ctx.casterEnt && ctx.casterEnt.side !== 'hero') return enemyGroupAttack.play(ctx);
    const cue = sk.damageType === '法术' ? 'light_impact' : (wide ? 'atk1' : 'atk2');
    ctx.fx.sfx(cue, 0.55);
    for (const h of ctx.hits) ctx.reveal(h.targetId);
    return true;
  },
};

// 敌方兜底群攻（原版 playMeleeGroup / playRangedGroup / playSpellGroup）：350ms 同色蓄势 →
// 近战：三道血刃自左向右横扫目标区，刃尖掠过即受击（175ms）；远程：14 枚金晶齐射，主晶按目标分组命中；法术：冰蓝法阵与十字棱光同拍爆开。
// 只传真实受击目标；按原版各自的接触拍点揭示命中/闪避。
const GROUP_KIND = { '法术': 'spell', '远程': 'ranged' };
const enemyGroupAttack = {
  id: 'enemy-group-attack', grade: 'identity', fxTags: ['group:melee', 'group:ranged', 'group:spell'],
  prepareKeys: () => ['enemyMeleeGroupHit', 'enemyRangedGroupHit', 'atk1'],
  async play(ctx) {
    const { av, hits } = ctx, sk = ctx.skill || {};
    const kind = sk.fxTag && sk.fxTag.startsWith('group:') ? sk.fxTag.slice(6) : (GROUP_KIND[sk.damageType] || 'melee');
    const list = hits.map(h => ({ id: h.targetId, p: ctx.centerOf(h.targetId) })).filter(t => t.p).sort((a, b) => a.p.x - b.p.x);
    const play = { melee: av.playMeleeGroup, ranged: av.playRangedGroup, spell: av.playSpellGroup }[kind];
    const handle = arcaneRun(ctx, () => play(ctx.casterEnt, list.map(t => ctx.ent(t.id)).filter(Boolean)));
    const x0 = list.length ? list[0].p.x : 0, span = list.length ? Math.max(0.01, list[list.length - 1].p.x - x0) : 1;
    list.forEach((t, i) => {
      const at = kind === 'melee' ? 350 + 175 * (1 - Math.pow(0.9 - 0.8 * (t.p.x - x0) / span, 0.625))
        : kind === 'ranged' ? 350 + Math.round(i * 14 / list.length) * 22 + 235
        : 350 + (i === Math.floor((list.length - 1) / 2) || i === Math.ceil((list.length - 1) / 2) ? 0 : 35);
      ctx.after(at, () => ctx.reveal(t.id));
    });
    return ctx.awaitHandle(handle, 1340);
  },
};

// 全局发序负责分组和排序；目标内下标仅传给导演的揭示接口。
function attackShots(ctx) {
  const shots = new Map((ctx.result.shots || []).map(shot => [shot.shotIndex, { ...shot, impacts: [] }]));
  for (const h of ctx.hits) {
    (h.segments || [h]).forEach((segment, index) => {
      const shotIndex = segment.shotIndex ?? 0;
      if (!shots.has(shotIndex)) shots.set(shotIndex, { shotIndex, aim: segment.aim || ctx.result.aim, impacts: [] });
      shots.get(shotIndex).impacts.push({ targetId: h.targetId, hit: segment.hit, index });
    });
  }
  if (!shots.size && !ctx.result.shots) return [{ aim: ctx.result.aim, impacts: [] }];
  return [...shots.values()].sort((a, b) => a.shotIndex - b.shotIndex);
}

// vendor 舞台单位与世界层相差 FX_SCALE，区域锚点独立于真实受击对象。
function attackAreaBounds(result, shot, range) {
  const shape = result.query?.shape;
  const cells = shot.cells || result.query?.cells;
  const initialAim = result.query?.aim || result.aim;
  const retargeted = shot.aim && initialAim && (shot.aim.x !== initialAim.x || shot.aim.y !== initialAim.y);
  const center = !retargeted && (result.query?.blastCenter || shape?.center);
  const radius = shape?.radius ?? range.radius;
  let l, r, t, b;
  if (center && radius != null) {
    l = center.x - radius; r = center.x + radius;
    t = center.y - radius; b = center.y + radius;
  } else if (cells?.length) {
    l = Math.min(...cells.map(c => c.col)); r = Math.max(...cells.map(c => c.col)) + 1;
    t = Math.min(...cells.map(c => c.row)); b = Math.max(...cells.map(c => c.row)) + 1;
  } else return null;
  const k = PX / FX_SCALE;
  return { x: (l + r) / 2 * k, y: (t + b) / 2 * k, w: (r - l) * k, h: (b - t) * k,
    l: l * k, r: r * k, t: t * k, b: b * k };
}

function basicAttack(name, { subtype = name, area = false, projectile, directional, gap = 0, fire, impactFx } = {}) {
  return {
    id: 'basic-' + name, grade: 'identity', fxTags: [name],
    prepareKeys: () => PREPARE_KEYS[name] || [],
    async play(ctx) {
      const { av, casterEnt, audioContext } = ctx;
      const range = ctx.skill?.range;
      const isArea = ['直线', '扇形', '圆形', '全域', '爆炸'].includes(range?.type);
      const scope = area === 'only' || (area && isArea) ? 'aoe' : 'single';
      const identity = (targets, outcomes, onImpact, options) =>
        av.playAttackIdentityFx({ scope, subtype, caster: casterEnt, targets, outcomes, audioContext, onImpact, ...options });
      for (const [i, shot] of attackShots(ctx).entries()) {
        const { aim, impacts } = shot;
        const revealed = new Set();
        const reveal = impact => {
          if (revealed.has(impact)) return;
          revealed.add(impact);
          ctx.revealSegment(impact.targetId, impact.index);
          if (impactFx) impactFx(ctx, impact);
        };
        if (i && gap && !(await ctx.wait(gap))) return false;
        const aimAnchor = () => ctx.anchorAt(aim.x, aim.y);
        const playIdentity = async (...args) => ctx.awaitHandle(identity(...args), scope === 'aoe' ? 1400 : 900);
        if (directional && range?.type === '扇形') {
          const origin = ctx.centerOf(ctx.casterId);
          const dx = aim.x - origin.x, dy = aim.y - origin.y;
          const scale = range.castRange / (Math.hypot(dx, dy) || 1);
          const endpoint = ctx.anchorAt(origin.x + dx * scale, origin.y + dy * scale);
          if (fire) fire(ctx, { x: origin.x + dx * scale, y: origin.y + dy * scale });
          // 方向锚点固定在射界末端，命闪由各目标的真实结算独立揭示。
          if (!(await playIdentity([endpoint], () => 'hit', () => impacts.forEach(reveal), { suppressImpact: true }))) return false;
        } else if (projectile && scope === 'single') {
          const spriteOf = id => ctx.avHost.host.spriteOf(id);
          for (const impact of impacts.length ? impacts : [null]) {
            const to = impact ? spriteOf(impact.targetId) : aimAnchor();
            const ok = await av.CombatAudioMixer.withContext(audioContext, () => av.playArcaneProjectile(projectile, spriteOf(ctx.casterId), to, !impact?.hit));
            if (!ok) return false;
            if (impact) reveal(impact);
          }
        } else if (scope === 'aoe') {
          const byId = new Map(impacts.map(p => [p.targetId, p]));
          const getImpact = target => byId.get(target?.id || target?.dataset?.arcaneTargetId);
          const areaBounds = ['爆炸', '火焰', '冰霜', '雷'].includes(subtype) ? attackAreaBounds(ctx.result, shot, range) : null;
          if (fire) fire(ctx, aim);
          if (!(await playIdentity(impacts.length || areaBounds ? impacts.map(p => ctx.ent(p.targetId)) : [aimAnchor()],
            target => getImpact(target)?.hit ? 'hit' : 'dodge', target => {
              const impact = getImpact(target);
              if (impact) reveal(impact);
            }, { areaBounds }))) return false;
        } else {
          for (const impact of impacts.length ? impacts : [null]) {
            if (fire) fire(ctx, impact ? ctx.centerOf(impact.targetId) : aim);
            if (!(await playIdentity([impact ? ctx.ent(impact.targetId) : aimAnchor()],
              () => impact?.hit ? 'hit' : 'dodge', () => { if (impact) reveal(impact); }))) return false;
          }
        }
        // 部分演出不会为落空目标回调接触；补揭示仍须在下一发瞄准之前。
        impacts.forEach(reveal);
        if (ctx.awaitShotFeedback && !(await ctx.awaitShotFeedback())) return false;
      }
      return true;
    },
  };
}

const basicAttacks = [
  basicAttack('枪击', { area: true, gap: 200, fire: gunFire, impactFx: gunHit }),
  basicAttack('霰弹', { directional: true, gap: 220, fire: shotgunFire, impactFx: shotgunHit }),
  basicAttack('火焰', { area: true, projectile: 'fire' }),
  basicAttack('冰霜', { area: true }), basicAttack('雷击', { area: true, subtype: '雷' }),
  basicAttack('爆炸', { area: true }), basicAttack('光', { area: true }),
  basicAttack('毒液'), basicAttack('毒雾', { area: 'only' }), basicAttack('风', { area: 'only' }),
  basicAttack('刀砍'), basicAttack('拳击'), basicAttack('爪击'), basicAttack('撕咬'), basicAttack('箭矢'),
];

// 砷弹射击（索恩定稿）：黑弹飞向最远命中目标（全闪避则到射界末端），途经目标在弹头经过时揭示
const arsenicShot = {
  id: 'arsenic-shot', grade: 'identity', fxTags: ['砷弹射击'],
  prepareKeys: () => ['gunshot_pierce'],
  async play(ctx) {
    const { av, hits, audioContext, casterEnt } = ctx;
    const origin = ctx.centerOf(ctx.casterId);
    const dist = h => { const c = ctx.centerOf(h.targetId); return Math.hypot(c.x - origin.x, c.y - origin.y); };
    const landed = hits.filter(h => h.hit).sort((a, b) => dist(b) - dist(a));
    const endTarget = landed.length ? ctx.ent(landed[0].targetId) : ctx.lineEndAnchor();
    const endDist = landed.length ? dist(landed[0]) : (ctx.skill.range.length || 10);
    const handle = av.CombatAudioMixer.withContext(audioContext, () => av.playArsenicShot(casterEnt, [endTarget]));
    const CHARGE = 340, FLIGHT = 160;
    for (const h of hits) {
      const k = Math.min(1, dist(h) / Math.max(0.5, endDist));
      ctx.after(CHARGE + FLIGHT * Math.pow(k, 1 / 0.88), () => ctx.reveal(h.targetId));
    }
    return ctx.awaitHandle(handle, 1300);
  },
};

// 火焰爆炸（[特效:火焰01]）L3：蓄势法阵 → 火弹射向接触点 → 收 → 接触点爆燃（fire.webm）→ 余烬/燃烧挂载
const fireBlast = {
  id: 'fire-blast', grade: 'L3', fxTags: ['火焰01'], cine: 'projectile',
  timeline: { chargeMs: 890, totalMs: 2430, fullscreen: true },   // 650 蓄势 + 240 火弹聚能 + 340 飞行 + 100 收 + 300 爆发 + 800 余韵
  // 原版火焰01 = fire.webm + fire01.mp3；ranshao 属于【燃烧弹】，燃烧挂载音由状态层统一播放，此处不再借用
  cues: [{ key: 'explosion_aoe_charge', vol: 0.45 }, { key: 'explosion_aoe_blast', vol: 0.62 }, { key: 'fire01', vol: 0.72 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result } = ctx;
    const shape = result.query.shape;
    const center = shape.center || result.aim;
    const c = worldPx(ctx.centerOf(ctx.casterId)), b = worldPx(center);
    const radius = shape.radius || 3, R = radius * PX, uid = fx.uid();
    // ① 蓄势：施法者脚下火纹法阵 + 火核压缩 + 火星吸入；爆心预告环
    fx.sfx('explosion_aoe_charge', 0.45);
    const rune = fx.ground(runeHtml(uid, c.x, c.y, 1.5 * PX, '#f97316', '#fde68a', 'ᚲᚨᚢᚾᛟᛋ'), 1500);
    rune.firstChild.animate([{ transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) scale(1.05)', opacity: 0.9 }], { duration: 650, fill: 'forwards' });
    rune.querySelector('[data-fx=spin]').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(120deg)' }], { duration: 1500, fill: 'forwards' });
    const core = fx.top(orbHtml(c.x, c.y - 18, 46, '#fb923c', '#fff7d6'), 900);
    core.firstChild.animate([{ transform: 'scale(0.3)', opacity: 0.5 }, { transform: 'scale(1.4)', opacity: 1, offset: 0.7 }, { transform: 'scale(0.5)', opacity: 1 }], { duration: 650, fill: 'forwards' });
    particles(fx, Array.from({ length: 22 }, () => {
      const a = rnd(0, TAU), d = rnd(1.4, 2.2) * PX;
      return { x: c.x + Math.cos(a) * d, y: c.y - 18 + Math.sin(a) * d, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d, size: rnd(8, 16), color: pick(['#f97316', '#ef4444', '#fbbf24']), core: '#fff7d6', s0: 1, s1: 0.2, o0: 0.9, dur: rnd(380, 560), delay: rnd(0, 180), ease: 'cubic-bezier(0.5,0,0.8,0.6)' };
    }), 900);
    const tele = fx.ground(ringHtml(b.x, b.y, R * 2.2, 'rgba(251,146,60,0.55)', 'rgba(239,68,68,0.35)'), 2000);
    tele.firstChild.animate([{ transform: 'scale(1.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.8 }], { duration: 650, fill: 'forwards' });
    ctx.after(360, () => fx.shake('light'));
    if (!(await ctx.wait(650))) return false;
    // ② 火弹射向接触点（复用回合制通用火焰弹；dodged=true 只保留弹道，不播其小型命中，爆炸由本条目承担）
    const anchor = ctx.anchorAt(center.x, center.y);
    ctx.cine?.launch(340, 240);   // 聚能 240 后火弹出手：镜头甩到爆心候弹
    const flown = await ctx.av.CombatAudioMixer.withContext(ctx.audioContext, () => ctx.av.playArcaneProjectile('fire', ctx.avHost.host.spriteOf(ctx.casterId), anchor, true));
    if (!flown) return false;
    // ③ 收：预告环向爆心坍缩
    tele.firstChild.animate([{ transform: 'scale(1)', opacity: 0.8 }, { transform: 'scale(0.15)', opacity: 1 }], { duration: 100, fill: 'forwards' });
    if (!(await ctx.wait(100))) return false;
    tele.remove();
    // ④ 爆发：音画震同帧
    fx.sfx('explosion_aoe_blast', 0.62); fx.sfx('fire01', 0.72);
    fx.shake('heavy');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    fx.top('<i style="position:absolute;left:' + b.x + 'px;top:' + b.y + 'px;width:' + R * 8 + 'px;height:' + R * 8 + 'px;margin:' + (-R * 4) + 'px 0 0 ' + (-R * 4) + 'px;border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,0.42),rgba(220,38,38,0.16) 40%,transparent 70%);mix-blend-mode:screen;"></i>', 1200)
      .firstChild.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: 1200, fill: 'forwards' });
    webm(ctx, 'fire.webm', b.x, b.y - R * 0.3, Math.max(R * 3.4, 220), { ms: 1500 });
    const wave = fx.top(ringHtml(b.x, b.y, R * 2.6, 'rgba(253,230,138,0.9)', 'rgba(249,115,22,0.7)'), 520);
    wave.firstChild.animate([{ transform: 'scale(0.15)', opacity: 1 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 480, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
    fx.top(orbHtml(b.x, b.y, R * 1.6, '#fdba74', '#ffffff'), 360).firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 340, fill: 'forwards' });
    particles(fx, Array.from({ length: 38 }, () => {
      const a = rnd(0, TAU), d = rnd(0.6, 1.25) * R;
      return { x: b.x, y: b.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d - rnd(0, 20), size: rnd(10, 22), color: pick(['#fde047', '#fb923c', '#ef4444']), core: '#fff7d6', s0: 1, s1: 0.25, dur: rnd(480, 820) };
    }), 1000);
    // 逐目标揭示：按到爆心距离错拍（真实受击名单来自提交结果）
    const order = hits.map(h => { const p = ctx.centerOf(h.targetId); return { h, d: Math.hypot(p.x - center.x, p.y - center.y) }; }).sort((a, z) => a.d - z.d);
    for (const { h, d } of order) ctx.after(30 + Math.min(1, d / radius) * 180, () => ctx.reveal(h.targetId));
    // ⑤ 余韵：余烬上飘、烟尘（同色系中心，不用亮白核）；燃烧挂载由状态层表现
    ctx.after(300, () => {
      particles(fx, Array.from({ length: 26 }, () => ({ x: b.x + rnd(-R, R), y: b.y + rnd(-R * 0.6, R * 0.6), dx: rnd(-14, 14), dy: rnd(-70, -30), size: rnd(4, 8), color: pick(['#fde047', '#fb923c']), core: '#fef9c3', s0: 1, s1: 0.4, dur: rnd(600, 800), delay: rnd(0, 160) })), 1000);
      particles(fx, Array.from({ length: 8 }, () => ({ x: b.x + rnd(-R * 0.7, R * 0.7), y: b.y + rnd(-R * 0.4, R * 0.4), dx: rnd(-10, 10), dy: rnd(-30, -12), size: rnd(40, 70), color: 'rgba(68,64,60,0.45)', core: 'rgba(68,64,60,0.5)', s0: 0.6, s1: 1.2, o0: 0.6, dur: 780 })), 1000, 'ground');
    });
    return ctx.wait(1100);
  },
};

// 自身再动/加速（无伤害、只作用自身）L2：脚下时针法阵展开 → 加速光点汇入 → 收束闪光 + 徽记飘字
const selfBoost = {
  id: 'self-boost', grade: 'L2', fxTags: ['再动加速'],
  timeline: { totalMs: 950 },
  cues: [{ key: 'herocharge', vol: 0.45 }, { key: 'link_chime', vol: 0.55 }],
  prepareKeys() { return [...this.cues.map(c => c.key), ...SUPPORT_KEYS]; },
  async play(ctx) {
    const { fx, input } = ctx;
    const c = worldPx(ctx.centerOf(ctx.casterId)), uid = fx.uid(), R = 1.2 * PX;
    fx.sfx('herocharge', 0.45);
    const rune = fx.ground(runeHtml(uid, c.x, c.y, R, '#818cf8', '#e0e7ff', ''), 950);
    rune.firstChild.animate([{ transform: 'translate(-50%,-50%) scale(0.5)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.75 }, { transform: 'translate(-50%,-50%) scale(1.08)', opacity: 0 }], { duration: 950, fill: 'forwards' });
    rune.querySelector('[data-fx=spin]').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-150deg)' }], { duration: 950, easing: 'cubic-bezier(0.3,0,0.2,1)', fill: 'forwards' });
    const n = Math.max(1, Math.min(5, input.haste || 1));
    particles(fx, Array.from({ length: n }, (_, k) => {
      const a = k / n * TAU - Math.PI / 2, d = 1.5 * PX;
      return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d, size: 22, color: '#a5b4fc', core: '#ffffff', s0: 1, s1: 0.4, dur: 560, delay: 140 + k * 40, ease: 'cubic-bezier(0.6,0,0.9,0.5)' };
    }), 950);
    ctx.after(720, () => {
      fx.sfx('link_chime', 0.55);
      fx.top(orbHtml(c.x, c.y, R * 1.4, '#c4b5fd', '#ffffff'), 260).firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 240, fill: 'forwards' });
      const label = [input.grantsMainPoint && '再动 +1', input.haste > 0 && '加速 +' + input.haste].filter(Boolean).join(' · ');
      const tag = fx.top('<b style="position:absolute;left:' + c.x + 'px;top:' + (c.y - 34) + 'px;transform:translate(-50%,-50%);white-space:nowrap;font:700 15px/1 system-ui,sans-serif;color:#eef2ff;text-shadow:0 0 6px #6366f1,0 0 12px #4338ca;">' + label + '</b>', 460);
      tag.firstChild.animate([{ transform: 'translate(-50%,-30%)', opacity: 0 }, { transform: 'translate(-50%,-70%)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-110%)', opacity: 0 }], { duration: 460, fill: 'forwards' });
    });
    const support = playSupportEffects(ctx, effect => effect.kind === 'buff');
    const [ok, finished] = await Promise.all([support, ctx.wait(950)]);
    return ok && finished;
  },
};

// ---------- 反应：回避成功后的真实错位（规则已改站位；只滑到本段终点，导演统一解锁） ----------
export async function glide(rctx, { ghosts, ms }) {
  const { view, hitTargetId: id, shift, fx } = rctx;
  const fp = rctx.footprint;
  const segs = pathSegments(shift.path, fp), total = segs.reduce((s, g) => s + g.len, 0);
  const rec = view.nodes.get(id);
  const marks = ghosts ? [0, 0.3, 0.6] : [];
  let next = 0;
  const ok = await rctx.tween(ms, t => {
    const p = pointAtDistance(segs, total * easeOut(t));
    view.setDisplayPos(id, p.x, p.y);
    while (next < marks.length && t >= marks[next]) {
      next++;
      const g = fx.top('', 700);
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;left:' + p.x * PX + 'px;top:' + p.y * PX + 'px;transform:translate(-50%,-50%) scale(' + (1 / rctx.cameraScale()) + ');filter:saturate(0.3) brightness(1.35) drop-shadow(0 0 8px #818cf8);';
      wrap.appendChild(rec.medal.cloneNode(true));
      g.appendChild(wrap);
      wrap.animate([{ opacity: 0.6 }, { opacity: 0 }], { duration: 480, delay: 60, fill: 'both' });
    }
  });
  return ok;
}

const zheYing = {
  id: 'evade-shift-ghost', kind: 'reaction', grade: 'L1', fxTags: ['折影步'],
  timeline: { totalMs: 600 },
  cues: [{ key: 'hide', vol: 0.32 }, { key: 'link_dash', vol: 0.26 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(rctx) {
    const { fx, shift } = rctx;
    if (!shift) return true;
    const from = worldPx(unitCenter(shift.from, rctx.footprint)), to = worldPx(unitCenter(shift.to, rctx.footprint));
    fx.sfx('hide', 0.32);
    fx.top(orbHtml(from.x, from.y, 90, 'rgba(129,140,248,0.7)', '#e0e7ff'), 260).firstChild.animate([{ transform: 'scale(0.5)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 240, fill: 'forwards' });
    if (!(await rctx.wait(70))) return false;
    fx.sfx('link_dash', 0.26);
    const ok = await glide(rctx, { ghosts: true, ms: 300 });
    fx.top(ringHtml(to.x, to.y, 80, 'rgba(199,210,254,0.85)', 'rgba(99,102,241,0.6)'), 320).firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 300, fill: 'forwards' });
    particles(fx, Array.from({ length: 9 }, () => { const a = rnd(0, TAU), d = rnd(18, 34); return { x: to.x, y: to.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d + 10, size: rnd(5, 9), color: '#a5b4fc', core: '#eef2ff', dur: rnd(220, 320) }; }), 400);
    await rctx.wait(230);
    return ok;
  },
};
// 回避错位：只滑步，不加残影
const evadeGlide = {
  id: 'evade-shift', kind: 'reaction', grade: 'L1', fxTags: ['回避错位'],
  timeline: { totalMs: 360 },
  cues: [{ key: 'link_dash', vol: 0.26 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(rctx) {
    if (!rctx.shift) return true;
    rctx.fx.sfx('link_dash', 0.26);
    return glide(rctx, { ghosts: false, ms: 300 });
  },
};

// ==========================================
// 埃利奥特首批（典型对局权威样本）：单体回复 / 浓雾 / 归尘礼赞（延迟·传奇）/ 召雷术（延迟·高阶）
// ==========================================

// 原版标签处理器的 playSVGEffect 类型与音色（index.html registerTagHandler：增/速/瞄/防/避/反击/嘲/再动/驱散/回/回蓝/冲/盾/免伤；盲/降/滞/弱/缓）
const SUPPORT_BUFF = {
  atk: ['buff', 'atkUp'], spd: ['buff', 'atkUp'], hit: ['buff', 'hitUp'],
  def: ['shield', 'defUp'], eva: ['buff', 'defUp'],
};
const SUPPORT_DEBUFF = { hit: ['debuff', 'hitDown'] };
const SUPPORT_DEBUFF_DEFAULT = ['debuff', 'defDown'];
const SUPPORT_EFFECT = {
  heal: ['heal', 'hpHeal'], healMp: ['mpHeal', 'mpHeal'], healTp: ['mpHeal', 'mpHeal'],
  shield: ['shield', 'shieldUp'], dispel: ['buff', 'defUp'], damageGuard: ['shield', 'defUp'],
  counter: ['buff', 'defUp'], taunt: ['taunt', 'taunt'], mainPoint: ['buff', 'atkUp'], drainMp: ['debuff', 'mpHeal'],
};
const SUPPORT_KEYS = [...new Set([...Object.values(SUPPORT_BUFF), ...Object.values(SUPPORT_DEBUFF), SUPPORT_DEBUFF_DEFAULT, ...Object.values(SUPPORT_EFFECT), ['buff', 'hide']].map(([, key]) => key).filter(Boolean))];
const SUPPORT_VOLUME = 0.5;
const SUPPORT_CUES = SUPPORT_KEYS.map(key => ({ key, vol: SUPPORT_VOLUME }));

// 多目标错峰：名单与顺序来自后端 result.effects（同一目标多个效果槽保持各自真实条目）；
// 目标按原版节拍启动，SVG/音色允许余波重叠，接触拍点揭示变化，不重新结算。
function supportFeedbackOf(effect) {
  if (effect.kind === 'taunt') return effect.value < 0 ? ['buff', 'hide'] : ['taunt', 'taunt'];
  if (effect.kind === 'buff') {
    if (effect.field === 'taunt') return effect.value < 0 ? ['buff', 'hide'] : ['taunt', 'taunt'];
    return effect.value > 0 ? SUPPORT_BUFF[effect.field] : (SUPPORT_DEBUFF[effect.field] || SUPPORT_DEBUFF_DEFAULT);
  }
  return SUPPORT_EFFECT[effect.kind];
}
async function playSupportEffects(ctx, accept = () => true) {
  // 原版辅助 SVG 启动后自行收尾，群体目标之间只隔 200ms；保留战棋 1.5 倍速，目标错峰约 133ms。
  // 后端 effects 已按槽→目标排序，各条目独立揭示；不逐项等余波，整组末尾统一收尾。
  const steps = [];
  const seenEffects = new Set();
  for (const effect of ctx.result.effects || []) {
    if (seenEffects.has(effect) || !accept(effect)) continue;
    seenEffects.add(effect);
    const feedback = supportFeedbackOf(effect);
    if (feedback) steps.push({ effect, feedback });
  }
  // 数值飘字由导演 revealEffect 统一按效果条目产生（含增攻/瞄准等全部效果），此处只负责原版 SVG/音色与拍点
  const handles = [], pending = [];
  let canceled = false;
  const cancelAll = () => {
    if (!canceled) { canceled = true; handles.forEach(handle => handle.cancel()); }
    return false;
  };
  const playOne = ([type, key], targetId, onImpact) => {
    const handle = ctx.av.CombatAudioMixer.withContext(ctx.audioContext,
      () => ctx.av.playGenericSupportFx(ctx.ent(targetId), type, { soundKey: key, volume: SUPPORT_VOLUME, onImpact }));
    if (!handle) return;
    handles.push(handle);
    pending.push(ctx.awaitHandle(handle).then(ok => { if (!ok) cancelAll(); return ok; }));
  };
  for (let i = 0; i < steps.length; i++) {
    const { effect, feedback } = steps[i];
    if (canceled) return false;
    const gap = i > 0 && effect.targetId !== steps[i - 1].effect.targetId ? 200 / 1.5 : 1;
    if (i > 0 && (!(await ctx.wait(gap)) || canceled)) return cancelAll();
    playOne(feedback, effect.targetId, () => { ctx.revealEffect(effect, true); buffFlourish(ctx.fx, buffKindOf(effect), ctx.centerOf(effect.targetId)); });
    if (effect.kind === 'heal' && effect.overheal > 0) {
      if (!(await ctx.wait(1)) || canceled) return cancelAll();
      playOne(SUPPORT_EFFECT.shield, effect.targetId);
    }
  }
  const finished = await Promise.all(pending);
  return !canceled && finished.every(ok => ok);

}

// ---------- 增益/减益施加动效（与原版通用辅助 SVG 同拍叠加，按种类区分构图；配色与头像持续弧光一致） ----------
const BUFF_FX_COLORS = {
  atk: ['#fb923c', '#fde68a'], def: ['#60a5fa', '#dbeafe'], hit: ['#facc15', '#fef9c3'], eva: ['#2dd4bf', '#ccfbf1'], spd: ['#22d3ee', '#cffafe'],
  down: ['#a855f7', '#f3e8ff'], taunt: ['#f87171', '#fee2e2'], hide: ['#94a3b8', '#f1f5f9'], counter: ['#f59e0b', '#fef3c7'], cleanse: ['#34d399', '#ecfdf5'],
};
function buffKindOf(e) {
  if (!e) return null;
  if (e.kind === 'buff') {
    if (e.field === 'taunt') return e.value < 0 ? 'hide' : 'taunt';
    if (e.value < 0) return 'down';
    return BUFF_FX_COLORS[e.field] ? e.field : null;
  }
  if (e.kind === 'taunt') return e.value < 0 ? 'hide' : 'taunt';
  if (e.kind === 'counter') return 'counter';
  if (e.kind === 'damageGuard') return 'def';
  if (e.kind === 'dispel' && e.removed && e.removed.length) return 'cleanse';
  return null;
}
export function buffFlourish(fx, kind, m) {
  const C = BUFF_FX_COLORS[kind];
  if (!C || !m) return;
  const p = worldPx(m), [c, l] = C;
  const ring = (d, ms, delay = 0) => fx.top(ringHtml(p.x, p.y, d, l, c), ms + delay + 40).firstChild
    .animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: ms, delay, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'both' });
  const at = (w, h, css) => '<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + w + 'px;height:' + h + 'px;margin:' + (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px;' + css + '"></i>';
  const pieces = (n, html, frames, ms, stagger = 0) => {
    const lay = fx.top(Array.from({ length: n }, (_, i) => html(i)).join(''), ms + n * stagger + 40);
    [...lay.children].forEach((el, i) => el.animate(frames(i), { duration: ms, delay: i * stagger, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }));
  };
  const svg = (d, inner) => '<svg viewBox="-50 -50 100 100" width="' + d + '" height="' + d + '" style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;margin:' + (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px;overflow:visible;filter:drop-shadow(0 0 5px ' + c + ');">' + inner + '</svg>';
  if (kind === 'atk') {        // 增攻：三道炽焰刃自脚下升腾
    pieces(3, () => at(14, 42, 'clip-path:polygon(50% 0,100% 68%,50% 100%,0 68%);background:linear-gradient(#fff7d6,' + c + ' 55%,rgba(220,38,38,0));filter:drop-shadow(0 0 6px ' + c + ');mix-blend-mode:screen;'),
      i => { const x = (i - 1) * 16; return [{ transform: 'translate(' + x + 'px,30px) scale(.4)', opacity: 0 }, { transform: 'translate(' + x + 'px,0) scale(1.1)', opacity: 1, offset: 0.4 }, { transform: 'translate(' + x + 'px,-36px) scale(.7)', opacity: 0 }]; }, 560, 60);
    ring(72, 460);
  } else if (kind === 'def') {  // 增防：六枚六角甲片自外合拢成环
    pieces(6, () => at(16, 14, 'clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:linear-gradient(160deg,' + l + ',' + c + ');filter:drop-shadow(0 0 4px ' + c + ');'),
      i => { const a = i / 6 * TAU, f = r => 'translate(' + (Math.cos(a) * r).toFixed(1) + 'px,' + (Math.sin(a) * r).toFixed(1) + 'px)'; return [{ transform: f(52) + ' scale(.5)', opacity: 0 }, { transform: f(22) + ' scale(1)', opacity: 1, offset: 0.55 }, { transform: f(26) + ' scale(1.1)', opacity: 0 }]; }, 600, 25);
    ring(64, 420, 300);
  } else if (kind === 'hit') {  // 瞄准：金色准星自大收紧锁定
    pieces(1, () => svg(64, '<circle r="30" fill="none" stroke="' + c + '" stroke-width="3"/><circle r="4" fill="' + l + '"/><path d="M0,-46 V-22 M0,46 V22 M-46,0 H-22 M46,0 H22" stroke="' + l + '" stroke-width="3.5" stroke-linecap="round"/>'),
      () => [{ transform: 'scale(2.2) rotate(45deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.45 }, { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(.8)', opacity: 0 }], 620);
  } else if (kind === 'eva') {  // 回避：两道疾风弧绕身急旋
    const v = fx.top(swirlHtml(p.x, p.y, 34, 9, [c, l], { tilt: 0.6, w: [2, 3.5], op: [0.6, 1] }), 640).firstChild.firstChild;
    v.animate([{ transform: 'rotate(0deg) scale(1.3)', opacity: 0 }, { transform: 'rotate(220deg) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'rotate(420deg) scale(.85)', opacity: 0 }], { duration: 620, fill: 'forwards' });
  } else if (kind === 'spd') {  // 增速：五道疾光自下而上掠过
    pieces(5, () => at(4, 34, 'border-radius:4px;background:linear-gradient(transparent,' + c + ',' + l + ');mix-blend-mode:screen;'),
      i => { const x = (i - 2) * 9; return [{ transform: 'translate(' + x + 'px,34px) scaleY(.4)', opacity: 0 }, { transform: 'translate(' + x + 'px,0) scaleY(1.2)', opacity: 1, offset: 0.35 }, { transform: 'translate(' + x + 'px,-42px) scaleY(.6)', opacity: 0 }]; }, 420, 45);
    ring(60, 360, 120);
  } else if (kind === 'down') { // 减益：三道紫色下沉折纹 + 暗雾压身
    pieces(3, () => svg(34, '<path d="M-22,-10 L0,10 L22,-10" fill="none" stroke="' + l + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'),
      () => [{ transform: 'translateY(-34px) scale(1.1)', opacity: 0 }, { transform: 'translateY(-6px) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'translateY(22px) scale(.8)', opacity: 0 }], 520, 110);
    fx.top(orbHtml(p.x, p.y, 70, 'rgba(76,29,149,0.55)', 'rgba(46,16,101,0.6)'), 640).firstChild.animate([{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 620, fill: 'forwards' });
  } else if (kind === 'taunt') { // 嘲讽：两圈赤红怒波外扩
    ring(80, 420); ring(96, 420, 150);
  } else if (kind === 'hide') {  // 隐匿：灰雾吐散、身形淡入阴影
    particles(fx, Array.from({ length: 8 }, () => { const a = rnd(0, TAU), d = rnd(14, 34); return { x: p.x, y: p.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d - 8, size: rnd(26, 40), color: 'rgba(148,163,184,0.45)', core: 'rgba(203,213,225,0.5)', o0: 0.8, s0: 0.6, s1: 1.3, dur: rnd(520, 720) }; }), 760);
  } else if (kind === 'counter') { // 反击架势：双刃交叉闪光
    pieces(2, () => at(76, 4, 'border-radius:3px;background:linear-gradient(90deg,transparent,' + c + ' 25%,' + l + ' 50%,' + c + ' 75%,transparent);mix-blend-mode:screen;'),
      i => { const r = i ? -42 : 42; return [{ transform: 'rotate(' + r + 'deg) scaleX(0)', opacity: 1 }, { transform: 'rotate(' + r + 'deg) scaleX(1.1)', opacity: 1, offset: 0.35 }, { transform: 'rotate(' + r + 'deg) scaleX(1)', opacity: 0 }]; }, 420, 60);
    ring(66, 380, 120);
  } else if (kind === 'cleanse') { // 驱散/整备：暗紫负面碎片剥离外飞 + 翠光上扬
    pieces(8, () => at(9, 7, 'clip-path:polygon(0 30%,60% 0,100% 55%,40% 100%);background:linear-gradient(135deg,#c084fc,#2e1065);filter:drop-shadow(0 0 3px #a855f7);'),
      i => { const a = i / 8 * TAU + 0.3, d = 30 + (i % 3) * 8; return [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * d).toFixed(0) + 'px,' + (Math.sin(a) * d - 12).toFixed(0) + 'px) rotate(' + (i % 2 ? 260 : -260) + 'deg)', opacity: 0 }]; }, 560, 15);
    particles(fx, Array.from({ length: 12 }, () => ({ x: p.x + rnd(-18, 18), y: p.y + rnd(-6, 16), dx: rnd(-8, 8), dy: -rnd(30, 60), size: rnd(4, 8), color: c, core: l, s0: 1, s1: 0.3, dur: rnd(520, 760), delay: rnd(80, 220) })), 1000);
    ring(70, 460, 60);
  }
}

// 整备（主行动，规则随机祛除一项负面状态）：翠色扫环自头顶掠下 + 负面碎片剥离 + 整备徽记 + 翠光上扬
export const READY_AUDIO = ['link_chime', 'defUp'];
export async function playReadyFx(rctx) {
  const { fx, unitId } = rctx, m = rctx.centerOf(unitId);
  if (!m) return true;
  const p = worldPx(m), C = '#34d399', L = '#ecfdf5';
  fx.sfx('link_chime', 0.52);
  const sweep = fx.top('<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:78px;height:24px;margin:-12px 0 0 -39px;border-radius:50%;' +
    'background:radial-gradient(ellipse,transparent 46%,rgba(110,231,183,.85) 60%,rgba(236,253,245,.95) 66%,transparent 74%);filter:drop-shadow(0 0 6px ' + C + ');mix-blend-mode:screen;"></i>', 560);
  sweep.firstChild.animate([{ transform: 'translateY(-46px) scale(.7)', opacity: 0 }, { transform: 'translateY(-30px) scale(1)', opacity: 1, offset: 0.2 }, { transform: 'translateY(26px) scale(1.05)', opacity: 1, offset: 0.85 }, { transform: 'translateY(30px) scale(1.15)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
  if (!(await rctx.wait(360))) return false;
  fx.sfx('defUp', 0.55);
  buffFlourish(fx, 'cleanse', m);
  floatText(fx, p.x, p.y - 40, '🧹 整备 · 祛除负面', L, '#065f46', { ms: 760, size: 13 });
  return rctx.wait(520);
}

const healMend = {
  id: 'heal-mend', grade: 'L2', fxTags: ['单体回复'],
  timeline: { totalMs: 1100 },
  cues: SUPPORT_CUES,
  prepareKeys: () => SUPPORT_KEYS,
  play: ctx => playSupportEffects(ctx),
};

// 拉莱耶造雾术 L3（敌方深潜者，特效标签【拉莱耶造雾术】；旧标签【浓雾】同指此条，区域数据提供落点与半径）：
// 暗场色罩 + 深渊符文阵 + 雾丝吸入 → 雾核抛物线投向接触点 → 收 → 雾毯按真实半径铺开（揭示常驻雾区）→ 雾内单位浮现致盲
const fogBurst = {
  id: 'abyss-fog', grade: 'L3', fxTags: ['拉莱耶造雾术', '浓雾'],
  timeline: { chargeMs: 900, totalMs: 2350, fullscreen: true },   // 900 蓄势 + 300 投放 + 100 收 + 350 爆发 + 700 余韵
  cues: [{ key: 'mx_vacuum', vol: 0.45 }, { key: 'fog', vol: 0.62 }, { key: 'mx_deep_impact', vol: 0.52 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, result } = ctx;
    const region = (ctx.regions || [])[0] || null;
    const shape = result.query.shape || {};
    const bm = region ? region.center : (shape.center || result.aim);
    const R = (region ? region.radius : (shape.radius || 3)) * PX;
    const c = worldPx(ctx.centerOf(ctx.casterId)), b = worldPx(bm);
    const MIST = 'rgba(34,62,74,0.6)', MIST_CORE = 'rgba(52,92,104,0.66)';   // 暗雾独立同色中心（防白芯黑圈）
    // ① 蓄势
    fx.sfx('mx_vacuum', 0.45);
    tint(fx, 'radial-gradient(circle at 50% 55%,rgba(14,40,52,.5),rgba(4,12,22,.94))', { inMs: 700, holdMs: 1250, outMs: 400, peak: 0.42 });
    const rune = fx.ground(runeHtml(fx.uid(), c.x, c.y, 1.6 * PX, '#2dd4bf', '#a5f3fc', 'ᛟᚱᛚᛃᛖᛞ'), 1400);
    grow(rune.firstChild, { ms: 1400, s0: 0.3, s1: 1, hold: 0.7 });
    spin(rune.querySelector('[data-fx=spin]'), -150, 1400, 'cubic-bezier(0.3,0,0.2,1)');
    particles(fx, Array.from({ length: 16 }, () => { const a = rnd(0, TAU), d = rnd(1.9, 2.8) * PX; return { x: c.x + Math.cos(a) * d, y: c.y - 10 + Math.sin(a) * d, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d, size: rnd(40, 70), color: MIST, core: MIST_CORE, o0: 0.85, s0: 1, s1: 0.25, dur: rnd(620, 860), delay: rnd(0, 120) }; }), 1000);
    particles(fx, Array.from({ length: 14 }, () => { const a = rnd(0, TAU), d = rnd(1.4, 2.2) * PX; return { x: c.x + Math.cos(a) * d, y: c.y - 10 + Math.sin(a) * d, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d, size: rnd(6, 11), color: '#67e8f9', core: '#ecfeff', s0: 1, s1: 0.2, dur: rnd(500, 760), delay: rnd(80, 260) }; }), 1000);
    const tele = fx.ground(ringHtml(b.x, b.y, R * 2, 'rgba(103,232,249,0.32)', 'rgba(20,60,80,0.4)'), 1300);
    tele.firstChild.animate([{ transform: 'scale(1.15)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.7 }], { duration: 900, fill: 'forwards' });
    ctx.after(350, () => fx.shake('light')); ctx.after(650, () => fx.shake('light'));
    if (!(await ctx.wait(900))) return false;
    // ② 投放：雾核沿抛物线飞向规则给出的雾区中心
    const from = { x: c.x, y: c.y - 20 }, lift = Math.max(80, Math.hypot(b.x - c.x, b.y - c.y) * 0.25);
    const ctrl = { x: (from.x + b.x) / 2, y: Math.min(from.y, b.y) - lift };
    trail(fx, from, ctrl, b, { color: '#5eead4', width: 10, ms: 300 });
    flyOrb(fx, from, ctrl, b, { size: 66, color: 'rgba(45,96,110,0.9)', core: '#cffafe', ms: 300, s0: 0.5, s1: 1.2 });
    for (const d of [40, 80]) flyOrb(fx, from, ctrl, b, { size: 48, color: MIST, core: MIST_CORE, ms: 300, delay: d, s0: 0.5, s1: 1, fade: true });
    if (!(await ctx.wait(300))) return false;
    // ③ 收
    tele.firstChild.animate([{ transform: 'scale(1)', opacity: 0.7 }, { transform: 'scale(0.12)', opacity: 1 }], { duration: 100, fill: 'forwards' });
    if (!(await ctx.wait(100))) return false;
    tele.remove();
    // ④ 爆发：雾毯按真实半径铺开，常驻雾区在此刻揭示
    fx.sfx('fog', 0.62); fx.sfx('mx_deep_impact', 0.52); fx.shake('heavy');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    fx.top(ringHtml(b.x, b.y, R * 2.2, 'rgba(165,243,252,0.75)', 'rgba(45,212,191,0.5)'), 560).firstChild
      .animate([{ transform: 'scale(0.1)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 540, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
    particles(fx, Array.from({ length: 30 }, () => { const a = rnd(0, TAU), d = rnd(0.3, 0.95) * R; return { x: b.x, y: b.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: rnd(70, 130), color: MIST, core: MIST_CORE, o0: 0.9, s0: 0.3, s1: 1.4, dur: rnd(700, 1000), ease: 'cubic-bezier(0.1,0.7,0.3,1)' }; }), 1100);
    if (region) ctx.after(60, () => ctx.revealRegion(region.id));
    if (!(await ctx.wait(350))) return false;
    // ⑤ 余韵：雾内单位（规则雾区格）按距中心远近浮现致盲；雾丝缓旋
    const inside = region ? ctx.unitsInCells(region.cells).map(id => ({ id, p: worldPx(ctx.centerOf(id)) })) : [];
    inside.sort((u, v) => Math.hypot(u.p.x - b.x, u.p.y - b.y) - Math.hypot(v.p.x - b.x, v.p.y - b.y));
    inside.forEach((u, k) => {
      const delay = Math.min(320, k * 70);
      ctx.after(delay, () => {
        fx.top(orbHtml(u.p.x, u.p.y - 4, 70, 'rgba(30,58,70,0.7)', 'rgba(44,84,96,0.75)'), 520).firstChild.animate([{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 500, fill: 'forwards' });
        floatText(fx, u.p.x, u.p.y - 30, '◉ 致盲', '#cbd5e1', '#0e7490', { ms: 640, size: 13 });
      });
    });
    particles(fx, Array.from({ length: 10 }, () => { const a = rnd(0, TAU), d = rnd(0.2, 0.8) * R; return { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d, dx: Math.cos(a + 1.4) * 30, dy: Math.sin(a + 1.4) * 30, size: rnd(60, 100), color: MIST, core: MIST_CORE, o0: 0.55, s0: 1, s1: 1.3, dur: rnd(560, 700) }; }), 740);
    return ctx.wait(700);
  },
};

// 造雾术（我方埃利奥特【拉莱耶造雾术】，原版 spawnRlyehSedimentFx「黑曜沉潮·重水沉积冷雾」）：fog.mp3 ×2 + 雾震屏 +
// 视口层贴地翻滚黑曜雾浪与双柱冷蒸气（1.35s）；雾浪铺满时揭示常驻雾区，雾内单位缠绕虚化
const rlyehSediment = {
  id: 'rlyeh-sediment', grade: 'identity', fxTags: ['造雾术'],
  prepareKeys: () => [],
  async play(ctx) {
    const { av } = ctx, region = (ctx.regions || [])[0] || null;
    arcaneRun(ctx, () => av.playCustomAudio(av.RLYEH_FOG_CLOUD_URL, 2, 1, { track: 'skill', profile: 'special', audioContext: av.CombatAudioMixer.capture('B') }));
    const inside = region ? ctx.unitsInCells(region.cells) : [];
    screenSvgFx(ctx, av.buildRlyehSedimentFxHtml(), { shakeClass: 'fog-shake-std', shakeMs: 700, shroud: 'target-fog-shroud 1.1s cubic-bezier(0.2, 0.8, 0.3, 1) both', shroudMs: 1200, ids: inside });
    if (region) ctx.after(300, () => ctx.revealRegion(region.id));
    return ctx.wait(1500);
  },
};

// 常驻浓雾层：只消费规则雾区（cells 为真实作用格），羽化边缘；地面层（单位之下）浓、顶层薄纱（单位之上）淡，单位始终可辨
export function fogFieldHtml(region, uid) {
  const cells = region.cells || [];
  let c0 = Infinity, r0 = Infinity, c1 = -Infinity, r1 = -Infinity;
  for (const k of cells) { c0 = Math.min(c0, k.col); r0 = Math.min(r0, k.row); c1 = Math.max(c1, k.col); r1 = Math.max(r1, k.row); }
  if (!cells.length) return { ground: '', top: '' };
  const x0 = (c0 - 1) * PX, y0 = (r0 - 1) * PX, w = (c1 - c0 + 3) * PX, h = (r1 - r0 + 3) * PX;
  const rects = cells.map(k => '<rect x="' + (k.col - c0 + 1) * PX + '" y="' + (k.row - r0 + 1) * PX + '" width="' + PX + '" height="' + PX + '"/>').join('');
  const cx = region.center.x * PX - x0, cy = region.center.y * PX - y0, R = region.radius * PX;
  const svg = (kind, base, n, alpha) => {
    const id = uid + kind;
    let blobs = '';
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), d = rnd(0, 0.85) * R, r = rnd(0.32, 0.55) * R;
      blobs += '<g data-drift="1"><circle cx="' + (cx + Math.cos(a) * d).toFixed(1) + '" cy="' + (cy + Math.sin(a) * d).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="url(#fg' + id + ')"/></g>';
    }
    return '<svg data-fx="fog-' + kind + '" width="' + w + '" height="' + h + '" style="position:absolute;left:' + x0 + 'px;top:' + y0 + 'px;overflow:visible;pointer-events:none;opacity:0;">' +
      '<defs><filter id="fm' + id + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>' +
      '<mask id="mk' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + w + '" height="' + h + '"><g fill="#fff" filter="url(#fm' + id + ')">' + rects + '</g></mask>' +
      '<radialGradient id="fg' + id + '"><stop offset="0" stop-color="rgb(58,94,106)" stop-opacity="' + alpha + '"/><stop offset=".55" stop-color="rgb(36,62,74)" stop-opacity="' + (alpha * 0.55).toFixed(2) + '"/><stop offset="1" stop-color="rgb(20,36,46)" stop-opacity="0"/></radialGradient></defs>' +
      '<g mask="url(#mk' + id + ')"><rect width="' + w + '" height="' + h + '" fill="rgb(16,32,42)" fill-opacity="' + base + '"/>' + blobs + '</g></svg>';
  };
  return { ground: svg('g', 0.42, 14, 0.85), top: svg('t', 0.08, 7, 0.32) };
}
export function animateFogField(layer) {
  const svg = layer.firstChild;
  if (!svg) return;
  svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
  layer.querySelectorAll('[data-drift]').forEach(g => {
    const dx = rnd(-28, 28), dy = rnd(-18, 18);
    g.animate([{ transform: 'translate(0px,0px)' }, { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' }], { duration: rnd(5000, 9000), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  });
}

// ---------- 火焰 / 中毒领域：常驻层（与浓雾同口径：只消费规则 cells，羽化边缘；地面层浓、顶层淡，单位始终可辨） ----------
const FIELD_THEMES = {
  fire: {
    base: 'rgb(58,14,6)', baseAlpha: 0.46,
    blob: ['#fde68a', '#f97316', '#9a1c0c'], blobN: 14, flicker: true,
    top: { kind: 'flame', n: 10, stops: ['#fff7d6', '#fb923c', '#dc2626'] },
    motes: { n: 18, colors: ['#fde68a', '#fb923c', '#fbbf24'], r: [1.6, 3.2] },
  },
  poison: {
    base: 'rgb(34,20,52)', baseAlpha: 0.44,
    blob: ['#bef264', '#65a30d', '#3b0764'], blobN: 12, drift: true,
    bubbles: { n: 16, stroke: '#d9f99d', fill: 'rgba(163,230,53,0.28)' },
    top: { kind: 'haze', n: 6, stops: ['#a3e635', '#7e22ce', '#1e1b4b'] },
    motes: { n: 12, colors: ['#bef264', '#c084fc', '#86efac'], r: [1.4, 2.6] },
  },
};
function fieldFrame(region) {
  const cells = region.cells || [];
  if (!cells.length) return null;
  let c0 = Infinity, r0 = Infinity, c1 = -Infinity, r1 = -Infinity;
  for (const k of cells) { c0 = Math.min(c0, k.col); r0 = Math.min(r0, k.row); c1 = Math.max(c1, k.col); r1 = Math.max(r1, k.row); }
  const x0 = (c0 - 1) * PX, y0 = (r0 - 1) * PX, w = (c1 - c0 + 3) * PX, h = (r1 - r0 + 3) * PX;
  const rects = cells.map(k => '<rect x="' + (k.col - c0 + 1) * PX + '" y="' + (k.row - r0 + 1) * PX + '" width="' + PX + '" height="' + PX + '"/>').join('');
  const pt = () => { const k = pick(cells); return { x: (k.col - c0 + 1 + rnd(0.12, 0.88)) * PX, y: (k.row - r0 + 1 + rnd(0.12, 0.88)) * PX }; };
  return { x0, y0, w, h, rects, pt, R: region.radius * PX };
}
const BOX = 'transform-box:fill-box;transform-origin:50% 50%;';
export function elementFieldHtml(region, uid) {
  const T = FIELD_THEMES[region.type], f = T && fieldFrame(region);
  if (!f) return { ground: '', top: '' };
  const open = kind => '<svg data-fx="field-' + region.type + '-' + kind + '" width="' + f.w + '" height="' + f.h + '" style="position:absolute;left:' + f.x0 + 'px;top:' + f.y0 + 'px;overflow:visible;pointer-events:none;opacity:0;">';
  const mask = id => '<filter id="fm' + id + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>' +
    '<mask id="mk' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + f.w + '" height="' + f.h + '"><g fill="#fff" filter="url(#fm' + id + ')">' + f.rects + '</g></mask>';
  // 地面层：焦土/毒沼底色 + 余烬或毒斑光团（闪烁或漂移）+ 毒泡
  const g = uid + 'g';
  let blobs = '';
  for (let i = 0; i < T.blobN; i++) {
    const p = f.pt(), r = rnd(0.5, 0.95) * PX;
    blobs += '<circle ' + (T.flicker ? 'data-flicker="1"' : 'data-drift="1"') + ' cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="url(#bg' + g + ')" style="' + BOX + '"/>';
  }
  let bubbles = '';
  if (T.bubbles) for (let i = 0; i < T.bubbles.n; i++) {
    const p = f.pt(), r = rnd(3, 7);
    bubbles += '<circle data-bubble="1" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + T.bubbles.fill + '" stroke="' + T.bubbles.stroke + '" stroke-width="1.2" style="' + BOX + 'opacity:0;"/>';
  }
  const ground = open('g') + '<defs>' + mask(g) +
    '<radialGradient id="bg' + g + '"><stop offset="0" stop-color="' + T.blob[0] + '" stop-opacity="0.75"/><stop offset=".45" stop-color="' + T.blob[1] + '" stop-opacity="0.42"/><stop offset="1" stop-color="' + T.blob[2] + '" stop-opacity="0"/></radialGradient></defs>' +
    '<g mask="url(#mk' + g + ')"><rect width="' + f.w + '" height="' + f.h + '" fill="' + T.base + '" fill-opacity="' + T.baseAlpha + '"/>' + blobs + bubbles + '</g></svg>';
  // 顶层：火舌或毒雾薄纱 + 上浮火星/孢子（淡，不遮单位）
  const t = uid + 't', S = T.top.stops;
  let tops = '';
  for (let i = 0; i < T.top.n; i++) {
    const p = f.pt();
    if (T.top.kind === 'flame') {
      // 尖顶火舌（外层 g 定位，内层 path 只给 CSS 动画用 transform，互不覆盖）+ 轻羽化
      const rx = rnd(7, 12), ry = rnd(18, 30);
      tops += '<g transform="translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')"><path data-flame="1" d="M0,0 C' + (-rx).toFixed(1) + ',' + (-ry * 0.25).toFixed(1) + ' ' + (-rx * 0.55).toFixed(1) + ',' + (-ry * 0.75).toFixed(1) + ' 0,' + (-ry).toFixed(1) +
        ' C' + (rx * 0.55).toFixed(1) + ',' + (-ry * 0.75).toFixed(1) + ' ' + rx.toFixed(1) + ',' + (-ry * 0.25).toFixed(1) + ' 0,0Z" fill="url(#tf' + t + ')" filter="url(#fb' + t + ')" style="transform-box:fill-box;transform-origin:50% 100%;mix-blend-mode:screen;"/></g>';
    } else {
      tops += '<g data-drift="1"><circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (rnd(0.9, 1.5) * PX).toFixed(1) + '" fill="url(#tf' + t + ')"/></g>';
    }
  }
  for (let i = 0; i < T.motes.n; i++) {
    const p = f.pt();
    tops += '<circle data-rise="1" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + rnd(T.motes.r[0], T.motes.r[1]).toFixed(1) + '" fill="' + pick(T.motes.colors) + '" style="' + BOX + 'opacity:0;"/>';
  }
  const topGrad = T.top.kind === 'flame'
    ? '<linearGradient id="tf' + t + '" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + S[0] + '" stop-opacity="0.85"/><stop offset=".45" stop-color="' + S[1] + '" stop-opacity="0.6"/><stop offset="1" stop-color="' + S[2] + '" stop-opacity="0"/></linearGradient>'
    : '<radialGradient id="tf' + t + '"><stop offset="0" stop-color="' + S[0] + '" stop-opacity="0.22"/><stop offset=".6" stop-color="' + S[1] + '" stop-opacity="0.12"/><stop offset="1" stop-color="' + S[2] + '" stop-opacity="0"/></radialGradient>';
  const top = open('t') + '<defs>' + mask(t) + topGrad + '<filter id="fb' + t + '" x="-50%" y="-30%" width="200%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter></defs><g mask="url(#mk' + t + ')">' + tops + '</g></svg>';
  return { ground, top };
}
export function animateElementField(layer) {
  const svg = layer.firstChild;
  if (!svg) return;
  svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
  layer.querySelectorAll('[data-drift]').forEach(g => {
    const dx = rnd(-22, 22), dy = rnd(-14, 14);
    g.animate([{ transform: 'translate(0px,0px)' }, { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' }], { duration: rnd(4000, 7000), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  });
  layer.querySelectorAll('[data-flicker]').forEach(el => el.animate([{ opacity: 0.5, transform: 'scale(0.88)' }, { opacity: 1, transform: 'scale(1.1)' }],
    { duration: rnd(420, 900), delay: -rnd(0, 900), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }));
  layer.querySelectorAll('[data-flame]').forEach(el => el.animate([
    { transform: 'scale(0.9,0.75) skewX(0deg)', opacity: 0.45 }, { transform: 'scale(1.05,1.18) skewX(6deg)', opacity: 0.9, offset: 0.45 }, { transform: 'scale(0.95,0.9) skewX(-5deg)', opacity: 0.6 }],
    { duration: rnd(520, 860), delay: -rnd(0, 860), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }));
  layer.querySelectorAll('[data-rise]').forEach(el => {
    const dx = rnd(-14, 14), up = rnd(40, 80);
    el.animate([{ transform: 'translate(0px,0px) scale(1)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translate(' + dx.toFixed(1) + 'px,' + (-up).toFixed(1) + 'px) scale(0.4)', opacity: 0 }],
      { duration: rnd(1400, 2400), delay: -rnd(0, 2400), iterations: Infinity, easing: 'ease-out' });
  });
  layer.querySelectorAll('[data-bubble]').forEach(el => el.animate([{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.95, offset: 0.75 }, { transform: 'scale(1.35)', opacity: 0 }],
    { duration: rnd(1300, 2300), delay: -rnd(0, 2300), iterations: Infinity, easing: 'ease-in' }));
}

// 领域每回合判定（规则 region-contest，非施放当拍）L1：常驻层增亮一拍 + 边缘脉冲环；命中者脚下爆一团，闪避者飘字
const PULSE = {
  fire: { sfx: 'ranshao', ring: ['rgba(253,186,116,0.8)', 'rgba(239,68,68,0.45)'], orb: ['rgba(249,115,22,0.75)', '#fde68a'], label: '🔥 灼烧领域' },
  poison: { sfx: 'creature_slime_01', ring: ['rgba(190,242,100,0.75)', 'rgba(168,85,247,0.45)'], orb: ['rgba(132,204,22,0.7)', '#ecfccb'], label: '☠️ 毒域侵蚀' },
};
export const REGION_PULSE_AUDIO = Object.values(PULSE).map(p => p.sfx);
export function playRegionPulse(fx, region, contests, centerOf, layers = []) {
  const P = PULSE[region.type];
  if (!P) return;
  for (const layer of layers) layer?.firstChild?.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.8) saturate(1.3)', offset: 0.3 }, { filter: 'brightness(1)' }], { duration: 640 });
  const b = worldPx(region.center), R = region.radius * PX;
  fx.sfx(P.sfx, 0.34);
  fx.ground(ringHtml(b.x, b.y, R * 2.1, P.ring[0], P.ring[1]), 640).firstChild
    .animate([{ transform: 'scale(0.55)', opacity: 0 }, { transform: 'scale(0.9)', opacity: 0.9, offset: 0.35 }, { transform: 'scale(1.04)', opacity: 0 }], { duration: 620, easing: 'cubic-bezier(0.2,0.7,0.3,1)', fill: 'forwards' });
  contests.forEach((ev, k) => {
    const c = centerOf(ev.targetId);
    if (!c) return;
    const p = worldPx(c), delay = Math.min(300, k * 70);
    if (!ev.hit) { floatText(fx, p.x, p.y - 48, '闪避', '#e2e8f0', '#334155', { ms: 620, size: 12, delay }); return; }
    fx.top(orbHtml(p.x, p.y + 4, 64, P.orb[0], P.orb[1]), 560 + delay).firstChild
      .animate([{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.35 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 520, delay, fill: 'both' });
    floatText(fx, p.x, p.y - 48, P.label, '#ffffff', P.ring[1], { ms: 700, size: 12, delay });
  });
}

// 火焰 / 中毒领域施放 L3（技能未指定特效时按区域类型匹配）：仿浓雾五拍——蓄势 → 投放 → 收 → 按真实半径铺开（揭示常驻层）→ 余韵逐个判定
const DOMAIN_THEMES = {
  fire: {
    charge: 'explosion_aoe_charge', burst: ['fire01', 0.66],
    tint: 'radial-gradient(circle at 50% 55%,rgba(90,26,8,.5),rgba(22,6,2,.94))',
    rune: ['#f97316', '#fde68a', 'ᚠᛚᚨᛗᛖ'], palette: ['#f97316', '#ef4444', '#fbbf24'], core: '#fff7d6',
    orb: 'rgba(234,88,12,0.92)', ring: ['rgba(253,186,116,0.8)', 'rgba(239,68,68,0.5)'],
    cloud: ['rgba(194,65,12,0.5)', 'rgba(251,146,60,0.55)'], video: ['fire.webm', 0.9],
  },
  poison: {
    charge: 'mx_vacuum', burst: ['aoe_poison_spell_fs219566', 0.66],
    tint: 'radial-gradient(circle at 50% 55%,rgba(42,20,64,.5),rgba(8,4,16,.94))',
    rune: ['#a3e635', '#e9d5ff', 'ᛈᛟᛁᛋᚾ'], palette: ['#84cc16', '#a855f7', '#bef264'], core: '#ecfccb',
    orb: 'rgba(101,163,13,0.92)', ring: ['rgba(190,242,100,0.8)', 'rgba(168,85,247,0.5)'],
    cloud: ['rgba(77,124,15,0.5)', 'rgba(126,34,206,0.45)'], video: ['fog.mp4', 0.7],
  },
};
async function playDomainBurst(ctx, type) {
  const T = DOMAIN_THEMES[type], { fx, result, hits } = ctx;
  const region = (ctx.regions || []).find(r => r.type === type) || null;
  const shape = result.query.shape || {};
  const bm = region ? region.center : (shape.center || result.aim);
  const R = (region ? region.radius : (shape.radius || 3)) * PX;
  const c = worldPx(ctx.centerOf(ctx.casterId)), b = worldPx(bm);
  // ① 蓄势：暗场色罩 + 施术者脚下符文阵 + 元素粒子吸入 + 落点预告环
  fx.sfx(T.charge, 0.45);
  tint(fx, T.tint, { inMs: 700, holdMs: 1250, outMs: 400, peak: 0.4 });
  const rune = fx.ground(runeHtml(fx.uid(), c.x, c.y, 1.6 * PX, T.rune[0], T.rune[1], T.rune[2]), 1400);
  grow(rune.firstChild, { ms: 1400, s0: 0.3, s1: 1, hold: 0.7 });
  spin(rune.querySelector('[data-fx=spin]'), type === 'fire' ? 160 : -150, 1400, 'cubic-bezier(0.3,0,0.2,1)');
  particles(fx, Array.from({ length: 22 }, () => { const a = rnd(0, TAU), d = rnd(1.4, 2.4) * PX; return { x: c.x + Math.cos(a) * d, y: c.y - 12 + Math.sin(a) * d, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d, size: rnd(8, 16), color: pick(T.palette), core: T.core, s0: 1, s1: 0.2, o0: 0.9, dur: rnd(480, 760), delay: rnd(0, 260), ease: 'cubic-bezier(0.5,0,0.8,0.6)' }; }), 1000);
  const tele = fx.ground(ringHtml(b.x, b.y, R * 2, T.ring[0], T.ring[1]), 1300);
  tele.firstChild.animate([{ transform: 'scale(1.15)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.7 }], { duration: 900, fill: 'forwards' });
  ctx.after(350, () => fx.shake('light')); ctx.after(650, () => fx.shake('light'));
  if (!(await ctx.wait(900))) return false;
  // ② 投放：元素核沿抛物线飞向规则领域中心
  const from = { x: c.x, y: c.y - 20 }, lift = Math.max(80, Math.hypot(b.x - c.x, b.y - c.y) * 0.25);
  const ctrl = { x: (from.x + b.x) / 2, y: Math.min(from.y, b.y) - lift };
  trail(fx, from, ctrl, b, { color: T.palette[0], width: 10, ms: 300 });
  flyOrb(fx, from, ctrl, b, { size: 60, color: T.orb, core: T.core, ms: 300, s0: 0.5, s1: 1.2 });
  for (const d of [40, 80]) flyOrb(fx, from, ctrl, b, { size: 34, color: T.cloud[0], core: T.cloud[1], ms: 300, delay: d, s0: 0.5, s1: 1, fade: true });
  if (!(await ctx.wait(300))) return false;
  // ③ 收
  tele.firstChild.animate([{ transform: 'scale(1)', opacity: 0.7 }, { transform: 'scale(0.12)', opacity: 1 }], { duration: 100, fill: 'forwards' });
  if (!(await ctx.wait(100))) return false;
  tele.remove();
  // ④ 爆发：按真实半径铺开，常驻领域层在此刻揭示；伤害段同拍按距中心错拍揭示
  fx.sfx(T.burst[0], T.burst[1]); fx.sfx('mx_deep_impact', 0.5); fx.shake('heavy');
  ctx.atmos?.burst();
  webm(ctx, T.video[0], b.x, b.y, R * 2, { ms: 1300, opacity: T.video[1], cover: R * 2 });
  fx.top(ringHtml(b.x, b.y, R * 2.2, T.ring[0], T.ring[1]), 560).firstChild
    .animate([{ transform: 'scale(0.1)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 540, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
  particles(fx, Array.from({ length: 26 }, () => { const a = rnd(0, TAU), d = rnd(0.3, 0.95) * R; return { x: b.x, y: b.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: rnd(60, 110), color: T.cloud[0], core: T.cloud[1], o0: 0.85, s0: 0.3, s1: 1.3, dur: rnd(700, 1000), ease: 'cubic-bezier(0.1,0.7,0.3,1)' }; }), 1100, 'ground');
  particles(fx, Array.from({ length: 30 }, () => { const a = rnd(0, TAU), d = rnd(0.5, 1.15) * R; return { x: b.x, y: b.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d - rnd(0, 24), size: rnd(8, 18), color: pick(T.palette), core: T.core, s0: 1, s1: 0.25, dur: rnd(480, 820) }; }), 1000);
  if (region) ctx.after(60, () => ctx.revealRegion(region.id));
  const order = hits.map(h => { const p = ctx.centerOf(h.targetId); return { h, d: p ? Math.hypot(p.x - bm.x, p.y - bm.y) : 0 }; }).sort((a, z) => a.d - z.d);
  for (const { h, d } of order) ctx.after(30 + Math.min(1, d / Math.max(1, R / PX)) * 180, () => ctx.reveal(h.targetId));
  if (!(await ctx.wait(350))) return false;
  // ⑤ 余韵：本次判定（规则 region-contest）按距中心远近逐个揭示；挂载音由状态层播放
  revealRegionContests(ctx, region, bm, T.cloud);
  return ctx.wait(700);
}
// 施放当拍的领域判定揭示：命中者脚下爆一团并揭示其领域状态（规则 effect-resolved），闪避者飘字
function revealRegionContests(ctx, region, center, cloud) {
  const { fx, result } = ctx, events = result.events || [];
  const contests = events.filter(ev => ev.type === 'region-contest' && (!region || ev.regionId === region.id))
    .map(ev => ({ ev, p: ctx.centerOf(ev.targetId) })).filter(x => x.p)
    .sort((u, v) => Math.hypot(u.p.x - center.x, u.p.y - center.y) - Math.hypot(v.p.x - center.x, v.p.y - center.y));
  contests.forEach(({ ev, p }, k) => ctx.after(Math.min(320, k * 70), () => {
    const w = worldPx(p);
    if (!ev.hit) { floatText(fx, w.x, w.y - 48, '闪避', '#e2e8f0', '#334155', { ms: 620, size: 12 }); return; }
    fx.top(orbHtml(w.x, w.y - 4, 72, cloud[0], cloud[1]), 520).firstChild.animate([{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 500, fill: 'forwards' });
    // 领域标签结果只在事件流里（不进 result.effects）；持续伤害补齐飘字字段
    events.filter(e => e.type === 'effect-resolved' && e.targetId === ev.targetId && e.attackId === ev.attackId)
      .forEach(e => ctx.revealEffect(e.kind === 'dot' ? { ...e, dot: /毒/.test(e.tag || '') ? 'poison' : 'burn', strength: e.value } : e));
  }));
}

// 投掷小瓶（SVG）：自施术者头顶沿抛物线飞向 to，边飞边翻转并放大；fire=燃烧瓶（瓶口火布 + 火星尾迹），poison=毒剂瓶（绿液）
function throwVial(fx, from, to, { kind, ms, s0 = 0.55, s1 = 1, size = 34 }) {
  const u = fx.uid(), fire = kind === 'fire';
  const liquid = fire ? ['#fde68a', '#f97316'] : ['#d9f99d', '#4d7c0f'];
  const svg = '<svg width="' + size + '" height="' + size * 1.5 + '" viewBox="-20 -34 40 60" style="position:absolute;left:0;top:0;margin:' + (-size * 0.75) + 'px 0 0 ' + (-size / 2) + 'px;overflow:visible;will-change:transform,opacity;">' +
    '<defs><linearGradient id="vl' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + liquid[0] + '"/><stop offset="1" stop-color="' + liquid[1] + '"/></linearGradient>' +
    '<filter id="vg' + u + '" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
    '<g filter="url(#vg' + u + ')">' +
    (fire ? '<path d="M-3,-30 C-9,-38 -2,-46 0,-52 C3,-45 10,-39 3,-30Z" fill="#fb923c"/><path d="M-1.5,-30 C-4,-35 0,-40 0,-44 C2,-40 5,-35 1.5,-30Z" fill="#fef3c7"/>' : '') +
    '<rect x="-4" y="-30" width="8" height="9" rx="1.5" fill="' + (fire ? '#a16207' : 'rgba(226,232,240,.75)') + '"/>' +
    '<path d="M-5,-21 L5,-21 L5,-15 C14,-11 16,-2 16,6 C16,18 9,24 0,24 C-9,24 -16,18 -16,6 C-16,-2 -14,-11 -5,-15Z" fill="rgba(220,252,231,.18)" stroke="rgba(236,253,245,.85)" stroke-width="1.6"/>' +
    '<path d="M-14,4 C-8,0 8,8 14,3 C15,16 9,22 0,22 C-9,22 -15,16 -14,4Z" fill="url(#vl' + u + ')" opacity=".92"/>' +
    '<path d="M-10,-6 C-12,0 -12,6 -10,11" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".65"/></g></svg>';
  const layer = fx.top(svg, ms + 80);
  const lift = Math.max(70, Math.hypot(to.x - from.x, to.y - from.y) * 0.32);
  const ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift }, spinDeg = (to.x >= from.x ? 1 : -1) * 540;
  const frames = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16, p = bez(from, ctrl, to, t);
    frames.push({ transform: 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' + (spinDeg * t).toFixed(0) + 'deg) scale(' + (s0 + (s1 - s0) * t).toFixed(3) + ')', opacity: k === 0 ? 0 : 1 });
  }
  layer.firstChild.animate(frames, { duration: ms, easing: 'cubic-bezier(0.35,0,0.65,1)', fill: 'both' });
  if (fire) particles(fx, Array.from({ length: 14 }, (_, i) => { const p = bez(from, ctrl, to, (i + 1) / 15); return { x: p.x, y: p.y, dx: rnd(-8, 8), dy: rnd(-22, -8), size: rnd(5, 9), color: pick(['#fb923c', '#fbbf24', '#ef4444']), core: '#fff7d6', s0: 1, s1: 0.2, dur: rnd(320, 460), delay: ms * (i + 1) / 15 }; }), ms + 500);
  return layer;
}
const fireDomain = {
  id: 'fire-domain', grade: 'L3', fxTags: ['火焰领域'], regionTypes: ['fire'],
  timeline: { chargeMs: 900, totalMs: 2350, fullscreen: true },   // 900 蓄势 + 300 投放 + 100 收 + 350 爆发 + 700 余韵
  cues: [{ key: 'explosion_aoe_charge', vol: 0.45 }, { key: 'fire01', vol: 0.66 }, { key: 'mx_deep_impact', vol: 0.5 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  play: ctx => playDomainBurst(ctx, 'fire'),
};
const poisonDomain = {
  id: 'poison-domain', grade: 'L3', fxTags: ['中毒领域'], regionTypes: ['poison'],
  timeline: { chargeMs: 900, totalMs: 2350, fullscreen: true },
  cues: [{ key: 'mx_vacuum', vol: 0.45 }, { key: 'aoe_poison_spell_fs219566', vol: 0.66 }, { key: 'mx_deep_impact', vol: 0.5 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  play: ctx => playDomainBurst(ctx, 'poison'),
};

// ---------- 职业被动资源到账（规则 passive-gain）L1：头顶图标飘字 + 职业色短动效 ----------
const PASSIVE_FX = {
  taunt: { sfx: 'taunt', icon: '💢', name: '嘲讽', color: '#fca5a5', glow: '#7f1d1d', ring: ['rgba(254,202,202,0.85)', 'rgba(220,38,38,0.55)'], dots: ['#f87171', '#fca5a5', '#ef4444'] },
  stealth: { sfx: 'hide', icon: '🌫️', name: '隐匿', color: '#e0e7ff', glow: '#312e81', ring: ['rgba(199,210,254,0.6)', 'rgba(67,56,202,0.4)'], dots: ['rgba(165,180,252,0.55)', 'rgba(100,116,139,0.55)'] },
  haste: { sfx: 'link_chime', icon: '⚡', name: '加速', color: '#a5f3fc', glow: '#155e75', ring: ['rgba(165,243,252,0.85)', 'rgba(8,145,178,0.5)'], dots: ['#67e8f9', '#e0f2fe', '#22d3ee'] },
};
export const PASSIVE_AUDIO = Object.values(PASSIVE_FX).map(p => p.sfx);
export function passiveGainLabel(ev) {
  const P = PASSIVE_FX[ev.kind];
  if (!P) return '';
  const extra = ev.kind === 'haste' ? (ev.tp ? ' · TP+' + ev.tp : '') : ev.kind === 'stealth' ? (ev.rush ? ' · 急袭' : ev.extraTurn ? ' · 再动' : '') : '';
  return P.icon + ' ' + P.name + ' +' + ev.value + extra;
}
export function playPassiveGain(fx, ev, at, sprite) {
  const P = PASSIVE_FX[ev.kind];
  if (!P) return;
  fx.sfx(P.sfx, 0.34);
  if (!at) return;
  const p = worldPx(at);
  if (ev.kind === 'taunt') {
    // 嘲讽：两道红色挑衅冲击环外扩 + 怒气碎点迸射
    [0, 120].forEach(d => fx.top(ringHtml(p.x, p.y, 1.8 * PX, P.ring[0], P.ring[1]), 600 + d).firstChild
      .animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 520, delay: d, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'both' }));
    particles(fx, Array.from({ length: 12 }, () => { const a = rnd(0, TAU), d = rnd(0.7, 1.1) * PX; return { x: p.x, y: p.y - 6, dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: rnd(6, 10), color: pick(P.dots), core: '#fff1f2', s0: 1, s1: 0.3, dur: rnd(380, 520) }; }), 600);
    sprite?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
  } else if (ev.kind === 'stealth') {
    // 隐匿：暗影雾丝向身体收拢，头像一瞬虚化
    particles(fx, Array.from({ length: 14 }, () => { const a = rnd(0, TAU), d = rnd(0.9, 1.4) * PX; return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d, size: rnd(22, 36), color: pick(P.dots), core: 'rgba(199,210,254,0.5)', o0: 0.8, s0: 1, s1: 0.3, dur: rnd(420, 560), delay: rnd(0, 120) }; }), 700);
    sprite?.animate([{ opacity: 1, filter: 'none' }, { opacity: 0.35, filter: 'blur(1.5px) grayscale(.6)', offset: 0.45 }, { opacity: 1, filter: 'none' }], { duration: 560, easing: 'ease-in-out' });
  } else {
    // 加速：脚下时针环疾转 + 光点上扬
    const hands = '<path d="M0,-22 L0,0 L15,9" fill="none" stroke="#e0f2fe" stroke-width="3" stroke-linecap="round"/><circle r="3" fill="#fff"/>';
    const rune = fx.ground(runeHtml(fx.uid(), p.x, p.y, 0.8 * PX, '#22d3ee', '#e0f2fe', '', hands), 600);
    grow(rune.firstChild, { ms: 600, s0: 0.4, s1: 1, hold: 0.6 });
    spin(rune.querySelector('[data-fx=spin]'), 300, 600, 'cubic-bezier(0.3,0,0.2,1)');
    particles(fx, Array.from({ length: 10 }, () => ({ x: p.x + rnd(-16, 16), y: p.y + rnd(-4, 10), dx: rnd(-6, 6), dy: rnd(-56, -34), size: rnd(5, 9), color: pick(P.dots), core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(380, 560), delay: rnd(0, 140) })), 700);
  }
  floatText(fx, p.x, p.y - 44, passiveGainLabel(ev), P.color, P.glow, { ms: 900, size: 13 });
}

// ---------- 敌方局部警报（规则 enemy-alarm）L1：报警者头顶感叹 + 红色波纹按真实警报半径外扩，收报者依距离逐个亮起 ----------
export const ALARM_AUDIO = ['bowlBronze', 'bellPing'];

// ---------- 起跳 / 落地扬尘（地面层，正常混合：灰土团 + 碎石；落地呈扁平环向外推开） ----------
function dustPuff(x, y, size, color) {
  return '<i style="position:absolute;left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;width:' + size.toFixed(1) + 'px;height:' + (size * 0.62).toFixed(1) + 'px;margin:' + (-size * 0.31).toFixed(1) + 'px 0 0 ' + (-size / 2).toFixed(1) + 'px;border-radius:50%;' +
    'background:radial-gradient(ellipse,' + color + ' 0%,rgba(178,163,136,0.55) 42%,rgba(120,110,95,0.18) 62%,transparent 74%);will-change:transform,opacity;pointer-events:none;"></i>';
}
export function playJumpDust(fx, at, { phase, heavy = false, scale = 1 }) {
  const p = worldPx(at), land = phase === 'land', k = scale * (heavy ? 1.45 : 1);
  const n = land ? Math.round(14 * (heavy ? 1.4 : 1)) : 8;
  const puffs = Array.from({ length: n }, (_, i) => {
    const a = land ? (i / n) * TAU + rnd(-0.2, 0.2) : Math.PI / 2 + rnd(-1.3, 1.3) + (i % 2 ? Math.PI : 0) * 0.5;
    const d = (land ? rnd(0.55, 1.05) : rnd(0.25, 0.55)) * PX * k;
    return { x: p.x + Math.cos(a) * 6, y: p.y + Math.sin(a) * 3, dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.42 - rnd(2, land ? 10 : 6), size: rnd(land ? 26 : 20, land ? 46 : 32) * k, dur: rnd(land ? 600 : 440, land ? 880 : 640), delay: rnd(0, 60) };
  });
  // 尘团画在顶层（盖过脚下与地格），碎石留在地面层
  const layer = fx.top(puffs.map(q => dustPuff(q.x, q.y, q.size, 'rgba(232,220,192,0.95)')).join(''), 960);
  [...layer.children].forEach((el, i) => { const q = puffs[i];
    el.animate([{ transform: 'translate(0,0) scale(0.45)', opacity: 1 }, { transform: 'translate(' + (q.dx * 0.6).toFixed(1) + 'px,' + (q.dy * 0.6).toFixed(1) + 'px) scale(1.05)', opacity: 0.9, offset: 0.35 },
      { transform: 'translate(' + q.dx.toFixed(1) + 'px,' + q.dy.toFixed(1) + 'px) scale(1.45)', opacity: 0 }], { duration: q.dur, delay: q.delay, easing: 'cubic-bezier(0.15,0.7,0.3,1)', fill: 'both' }); });
  if (!land) return;
  // 碎石：小颗粒抛起落下
  const pebbles = Array.from({ length: heavy ? 9 : 6 }, () => { const a = rnd(0, TAU); return { x: p.x, y: p.y, dx: Math.cos(a) * rnd(0.4, 0.9) * PX * k, up: rnd(10, 22) * k, s: rnd(2.5, 4.5) }; });
  const pl = fx.ground(pebbles.map(q => '<i style="position:absolute;left:' + q.x + 'px;top:' + q.y + 'px;width:' + q.s + 'px;height:' + q.s + 'px;margin:' + (-q.s / 2) + 'px;border-radius:30%;background:#8b7f6a;pointer-events:none;"></i>').join(''), 700);
  [...pl.children].forEach((el, i) => { const q = pebbles[i];
    el.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (q.dx * 0.5).toFixed(1) + 'px,' + (-q.up).toFixed(1) + 'px)', offset: 0.45 }, { transform: 'translate(' + q.dx.toFixed(1) + 'px,2px)', opacity: 0 }], { duration: rnd(460, 620), easing: 'ease-out', fill: 'both' }); });
}
export function playEnemyAlarm(fx, ev, centerOf) {
  const b = worldPx(ev.center), R = ev.radius * PX;
  fx.sfx('bowlBronze', 0.36);
  [0, 160].forEach(d => fx.ground(ringHtml(b.x, b.y, R * 2, 'rgba(254,202,202,0.7)', 'rgba(220,38,38,0.4)'), 900 + d).firstChild
    .animate([{ transform: 'scale(0.04)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 860, delay: d, easing: 'cubic-bezier(0.15,0.6,0.35,1)', fill: 'both' }));
  floatText(fx, b.x, b.y - 46, '❗ 警报', '#fecaca', '#991b1b', { ms: 900, size: 14 });
  for (const id of ev.recipientIds || []) {
    const c = centerOf(id);
    if (!c) continue;
    const p = worldPx(c), delay = Math.min(800, Math.hypot(p.x - b.x, p.y - b.y) / Math.max(1, R) * 860);
    fx.top(orbHtml(p.x, p.y - 26, 40, 'rgba(248,113,113,0.8)', '#fff1f2'), 520 + delay).firstChild
      .animate([{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 480, delay, fill: 'both' });
    floatText(fx, p.x, p.y - 44, '❗', '#fecaca', '#991b1b', { ms: 700, size: 15, delay });
  }
}

// 起手（延迟·圣光）L2：头顶圣徽光环展开 + 金色符文绕身汇入 + 脚下暖光，之后由常驻咏唱光环接管
const holyVow = {
  id: 'holy-vow', kind: 'prepare', grade: 'L2', fxTags: ['圣光01'],
  timeline: { totalMs: 1000 },
  cues: [{ key: 'light_charge', vol: 0.55 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(pctx) {
    const { fx } = pctx;
    const c = worldPx(pctx.centerOf(pctx.casterId)), head = { x: c.x, y: c.y - 36 };
    fx.sfx('light_charge', 0.55);
    const halo = fx.top(runeHtml(fx.uid(), head.x, head.y, 0.7 * PX, '#fbbf24', '#fffbeb', '✦✧✦✧✦✧'), 1000);
    grow(halo.firstChild, { ms: 1000, s0: 0.3, s1: 1, hold: 0.78 });
    spin(halo.querySelector('[data-fx=spin]'), 180, 1000);
    fx.ground(orbHtml(c.x, c.y + 6, 120, 'rgba(251,191,36,0.32)', 'rgba(254,243,199,0.45)'), 1000).firstChild.animate([{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 1000, fill: 'forwards' });
    particles(fx, Array.from({ length: 16 }, () => { const a = rnd(0, TAU), d = rnd(1.2, 1.8) * PX; return { x: head.x + Math.cos(a) * d, y: head.y + Math.sin(a) * d * 0.7, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d * 0.7, size: rnd(7, 12), color: pick(['#fde68a', '#fbbf24', '#fef3c7']), core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(520, 700), delay: rnd(0, 240) }; }), 1000);
    pctx.after(720, () => {
      fx.top(orbHtml(head.x, head.y, 54, '#fde68a', '#ffffff'), 260).firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 240, fill: 'forwards' });
      floatText(fx, c.x, c.y - 66, '咏唱 · ' + pctx.skill.name, '#fef3c7', '#b45309', { ms: 760, size: 14 });
    });
    return pctx.wait(1000);
  },
};
// 起手（延迟·雷电）L2：头顶暗紫雷云汇聚 + 电火花闪烁 + 脚下雷纹
const stormGather = {
  id: 'storm-gather', kind: 'prepare', grade: 'L2', fxTags: ['雷击01'],
  timeline: { totalMs: 1000 },
  cues: [{ key: 'thunder_charge', vol: 0.55 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(pctx) {
    const { fx } = pctx;
    const c = worldPx(pctx.centerOf(pctx.casterId)), cloud = { x: c.x, y: c.y - 44 };
    fx.sfx('thunder_charge', 0.55);
    const rune = fx.ground(runeHtml(fx.uid(), c.x, c.y + 4, 0.9 * PX, '#a78bfa', '#f5f3ff', 'ᛏᚺᚢᚱ'), 1000);
    grow(rune.firstChild, { ms: 1000, s0: 0.4, s1: 1, hold: 0.78 });
    spin(rune.querySelector('[data-fx=spin]'), -120, 1000);
    particles(fx, Array.from({ length: 10 }, () => { const a = rnd(0, TAU), d = rnd(1.1, 1.6) * PX; return { x: cloud.x + Math.cos(a) * d, y: cloud.y + Math.sin(a) * d * 0.5, dx: -Math.cos(a) * d * 0.85, dy: -Math.sin(a) * d * 0.42, size: rnd(40, 64), color: 'rgba(76,29,149,0.6)', core: 'rgba(109,40,217,0.66)', o0: 0.8, s0: 1, s1: 0.6, dur: rnd(600, 800) }; }), 1000);
    for (let t = 120; t < 820; t += 90) pctx.after(t, () => {
      const x = cloud.x + rnd(-26, 26), y = cloud.y + rnd(-10, 12);
      fx.top(orbHtml(x, y, rnd(14, 24), '#c4b5fd', '#ffffff'), 160).firstChild.animate([{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'scale(0.6)' }], { duration: 150, fill: 'forwards' });
    });
    pctx.after(760, () => {
      fx.top(orbHtml(cloud.x, cloud.y, 60, '#a78bfa', '#ffffff'), 260).firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 240, fill: 'forwards' });
      floatText(fx, c.x, c.y - 72, '引雷 · ' + pctx.skill.name, '#ede9fe', '#6d28d9', { ms: 760, size: 14 });
    });
    return pctx.wait(1000);
  },
};

// 归尘礼赞（[特效:圣光01] × 攻击槽，传奇·延迟释放）L4：
// 世界暗场留光孔 + 施法者圣光信标飞升 + 目标脚下巨型圣阵 / 头顶圣徽 + 四方光尘吸入 + 持续轻震 → 收 →
// 通天光柱 + 414 圣焰 + 十字光痕 + 全屏闪白 + 重震（揭示伤害）→ 光羽雨落 + 降防碎印 + 暗场渐退
const holyJudgment = {
  id: 'holy-judgment', grade: 'L4', fxTags: ['圣光01'], cine: false,
  timeline: { chargeMs: 1300, totalMs: 3300, fullscreen: true, darken: true },   // 1300 蓄势 + 450 爆发 + 1550 余韵
  cues: [{ key: 'light_charge', vol: 0.55 }, { key: 'light01', vol: 0.72 }, { key: 'light_impact', vol: 0.60 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result } = ctx;
    const h = hits[0] || null;
    const t = worldPx(h ? ctx.centerOf(h.targetId) : result.aim), c = worldPx(ctx.centerOf(ctx.casterId));
    const sky = { x: t.x, y: t.y - 3.4 * PX };
    // ① 蓄势
    fx.sfx('light_charge', 0.55);
    worldDarken(fx, t, { holeR: 72, inMs: 500, holdMs: 2100, outMs: 700, peak: 0.86 });
    tint(fx, 'radial-gradient(circle,rgba(0,0,0,0) 45%,rgba(120,72,8,.55))', { inMs: 800, holdMs: 1700, outMs: 800, peak: 0.55 });
    const beaconCtrl = { x: (c.x + sky.x) / 2, y: Math.min(c.y, sky.y) - 2.2 * PX };
    trail(fx, { x: c.x, y: c.y - 18 }, beaconCtrl, sky, { color: '#fbbf24', width: 7, ms: 620, delay: 120 });
    flyOrb(fx, { x: c.x, y: c.y - 18 }, beaconCtrl, sky, { size: 30, color: '#fde68a', core: '#ffffff', ms: 620, delay: 120, s0: 0.6, s1: 1, fade: true });
    const array = fx.ground(runeHtml(fx.uid(), t.x, t.y, 3.6 * PX, '#fbbf24', '#fffbeb', 'ᛋᛟᛚᚨᚱᛁᛊᛏ'), 2500);
    grow(array.firstChild, { ms: 2500, s0: 0.25, s1: 1, hold: 0.82, s2: 1.12 });
    spin(array.querySelector('[data-fx=spin]'), 210, 2500, 'cubic-bezier(0.2,0,0.3,1)');
    const crest = fx.top(runeHtml(fx.uid(), sky.x, sky.y, 1.3 * PX, '#fde68a', '#ffffff', '✦✧✦✧✦✧✦✧'), 1500);
    grow(crest.firstChild, { ms: 1500, s0: 0.2, s1: 1, hold: 0.85, s2: 0.3 });
    spin(crest.querySelector('[data-fx=spin]'), -240, 1500);
    const core = fx.top(orbHtml(sky.x, sky.y, 70, '#fde68a', '#ffffff'), 1340);
    core.firstChild.animate([{ transform: 'scale(0.1)', opacity: 0 }, { transform: 'scale(1.5)', opacity: 1, offset: 0.86 }, { transform: 'scale(0.25)', opacity: 1 }], { duration: 1300, fill: 'forwards' });
    for (const wave of [0, 350, 700]) ctx.after(wave, () => particles(fx, Array.from({ length: 16 }, () => {
      const a = rnd(0, TAU), d = rnd(5, 7) * PX;
      return { x: sky.x + Math.cos(a) * d, y: sky.y + Math.sin(a) * d * 0.7, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d * 0.7, size: rnd(8, 14), color: pick(['#fde68a', '#fef3c7', '#fbbf24']), core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(520, 640), ease: 'cubic-bezier(0.5,0,0.8,0.6)' };
    }), 700));
    for (const at of [380, 760, 1080]) ctx.after(at, () => fx.shake('light'));
    if (!(await ctx.wait(1300))) return false;
    // ② 爆发（音画震同帧）
    fx.sfx('light01', 0.72); fx.sfx('light_impact', 0.60); fx.shake('quake');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    const H = 16 * PX;
    const beam = (width, alpha, ms) => fx.top('<i style="position:absolute;left:' + t.x + 'px;top:' + (t.y - H + 14) + 'px;width:' + width + 'px;height:' + H + 'px;margin-left:' + (-width / 2) + 'px;transform-origin:50% 100%;' +
      'background:linear-gradient(90deg,transparent,rgba(251,191,36,' + alpha * 0.6 + ') 22%,rgba(255,251,235,' + alpha + ') 50%,rgba(251,191,36,' + alpha * 0.6 + ') 78%,transparent);mix-blend-mode:screen;will-change:transform,opacity;"></i>', ms).firstChild;
    beam(5 * PX, 0.45, 1100).animate([{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1.2)', opacity: 1, offset: 0.08 }, { transform: 'scaleX(1)', opacity: 0.8, offset: 0.4 }, { transform: 'scaleX(0.3)', opacity: 0 }], { duration: 1100, fill: 'forwards' });
    beam(1.8 * PX, 1, 900).animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1.35)', opacity: 1, offset: 0.09 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.45 }, { transform: 'scaleX(0.15)', opacity: 0 }], { duration: 900, fill: 'forwards' });
    fx.top('<i style="position:absolute;left:' + t.x + 'px;top:' + t.y + 'px;width:' + 10 * PX + 'px;height:22px;margin:-11px 0 0 ' + (-5 * PX) + 'px;background:linear-gradient(90deg,transparent,rgba(251,191,36,.55) 30%,#fffbeb 50%,rgba(251,191,36,.55) 70%,transparent);mix-blend-mode:screen;"></i>', 520)
      .firstChild.animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.25 }, { transform: 'scaleX(1.1)', opacity: 0 }], { duration: 500, fill: 'forwards' });
    fx.top(ringHtml(t.x, t.y, 4.6 * PX, 'rgba(255,251,235,0.9)', 'rgba(251,191,36,0.7)'), 620).firstChild
      .animate([{ transform: 'scale(0.12)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 600, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
    particles(fx, Array.from({ length: 36 }, () => { const a = rnd(0, TAU), d = rnd(1.2, 2.6) * PX; return { x: t.x, y: t.y - 10, dx: Math.cos(a) * d, dy: Math.sin(a) * d - rnd(10, 40), size: rnd(8, 18), color: pick(['#fde68a', '#fef3c7', '#fbbf24']), core: '#ffffff', s0: 1, s1: 0.25, dur: rnd(520, 820) }; }), 900);
    if (h) ctx.after(40, () => ctx.reveal(h.targetId));
    // 命中即掀起原版 414.webm 三道光柱（原版尺寸 min(视口)×1.4、锚定目标），延续为余韵
    ctx.after(60, () => webm(ctx, '414.webm', t.x, t.y, screenSpanPx(ctx, 1.4), { ms: 1200 }));
    if (!(await ctx.wait(450))) return false;
    // ③ 余韵：光羽雨落、降防碎印（规则 effects 真值）、暗场渐退
    particles(fx, Array.from({ length: 32 }, () => ({ x: t.x + rnd(-2.4, 2.4) * PX, y: t.y - rnd(1.2, 3.4) * PX, dx: rnd(-16, 16), dy: rnd(60, 120), size: rnd(6, 11), color: pick(['#fef3c7', '#fde68a', '#ffffff']), core: '#ffffff', s0: 1, s1: 0.5, dur: rnd(900, 1300), delay: rnd(0, 520), ease: 'cubic-bezier(0.3,0.2,0.6,1)' })), 1550);
    const def = (result.effects || []).find(e => e.kind === 'buff' && e.tag === '降防' && h && e.targetId === h.targetId);
    if (def) ctx.after(220, () => {
      floatText(fx, t.x, t.y - 46, '护甲 ' + def.value, '#fde68a', '#92400e', { ms: 1000, size: 15 });
      particles(fx, Array.from({ length: 10 }, () => ({ x: t.x + rnd(-14, 14), y: t.y - 20 + rnd(-8, 8), dx: rnd(-34, 34), dy: rnd(20, 50), size: rnd(6, 10), color: pick(['#a8a29e', '#fbbf24']), core: '#fef3c7', s0: 1, s1: 0.4, dur: rnd(560, 760) })), 900);
    });
    fx.ground(orbHtml(t.x, t.y, 3 * PX, 'rgba(251,191,36,0.28)', 'rgba(254,243,199,0.4)'), 1400).firstChild.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.4)', opacity: 0 }], { duration: 1400, fill: 'forwards' });
    return ctx.wait(1550);
  },
};

// 召雷术（[特效:雷击01] × 爆炸范围，高阶·延迟释放）L3：
// 紫色环境罩 + 爆心雷纹阵 + 施法者引雷光点飞升 + 爆心上空雷云汇聚 + 电火花 → 收 →
// 主雷 450.webm + 逐目标落雷（按距爆心错拍揭示）+ 地面冲击环 + 闪屏重震 → 麻痹电弧余韵
// 运镜（条目自编排，不走通用 cine、无时停顿帧）：蓄力全程缓缓微推 → 落雷瞬间急拉远 → 余韵末回位
const THUNDER_PUSH = 1.35, THUNDER_PULL = 0.66;   // 设计倍数（实际偏移 × ZOOM_AMP）
const thunderStorm = {
  id: 'thunder-storm', grade: 'L3', fxTags: ['雷击01'], cine: false,
  timeline: { chargeMs: 900, totalMs: 2400, fullscreen: true },   // 800 汇聚 + 100 收 + 500 落雷 + 1000 余韵
  cues: [{ key: 'thunder_charge', vol: 0.50 }, { key: 'thunder01', vol: 0.72 }, { key: 'thunder_aoe_hit', vol: 0.60 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result, sandbox: sb } = ctx;
    const shape = result.query.shape;
    const center = shape.center || result.aim;
    const b = worldPx(center), R = (shape.radius || 3) * PX, c = worldPx(ctx.centerOf(ctx.casterId));
    const cloud = { x: b.x, y: b.y - Math.min(R * 0.9, 3 * PX) - 40 };
    const home = sb.getPose(), cm = ctx.centerOf(ctx.casterId);
    const mid = { x: (cm.x + center.x) / 2, y: (cm.y + center.y) / 2 };
    sb.cameraTo(sb.poseAt(mid.x, mid.y, zoomAt(home.scale, home.scale * THUNDER_PUSH)), 900);
    // ① 汇聚
    fx.sfx('thunder_charge', 0.50);
    tint(fx, 'radial-gradient(circle,rgba(46,16,101,.28),rgba(8,4,26,.9))', { inMs: 600, holdMs: 1300, outMs: 500, peak: 0.46 });
    const rune = fx.ground(runeHtml(fx.uid(), b.x, b.y, R, '#a78bfa', '#f5f3ff', 'ᛏᚺᚢᚱᛁᛋᚨᛉ'), 1500);
    grow(rune.firstChild, { ms: 1500, s0: 0.3, s1: 1, hold: 0.7, o: 0.9 });
    spin(rune.querySelector('[data-fx=spin]'), 100, 1500);
    const beaconCtrl = { x: (c.x + cloud.x) / 2, y: Math.min(c.y, cloud.y) - 1.6 * PX };
    trail(fx, { x: c.x, y: c.y - 18 }, beaconCtrl, cloud, { color: '#a78bfa', width: 6, ms: 480, delay: 60 });
    flyOrb(fx, { x: c.x, y: c.y - 18 }, beaconCtrl, cloud, { size: 26, color: '#c4b5fd', core: '#ffffff', ms: 480, delay: 60, s0: 0.6, s1: 1, fade: true });
    particles(fx, Array.from({ length: 18 }, () => { const a = rnd(0, TAU), d = rnd(1.2, 1.5) * Math.max(R, 2 * PX); return { x: cloud.x + Math.cos(a) * d, y: cloud.y + Math.sin(a) * d * 0.45, dx: -Math.cos(a) * d * 0.8, dy: -Math.sin(a) * d * 0.36, size: rnd(60, 110), color: 'rgba(49,46,129,0.6)', core: 'rgba(76,29,149,0.7)', o0: 0.85, s0: 1, s1: 0.7, dur: rnd(650, 820) }; }), 1000);
    const core = fx.top(orbHtml(cloud.x, cloud.y, 80, '#7c3aed', '#ede9fe'), 920);
    core.firstChild.animate([{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1.3)', opacity: 0.9, offset: 0.88 }, { transform: 'scale(0.3)', opacity: 1 }], { duration: 900, fill: 'forwards' });
    for (let at = 160; at < 800; at += 110) ctx.after(at, () => {
      const a = rnd(0, TAU), d = rnd(0, 0.9) * R, x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
      fx.top(orbHtml(x, y, rnd(16, 28), '#c4b5fd', '#ffffff'), 140).firstChild.animate([{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'scale(0.6)' }], { duration: 130, fill: 'forwards' });
    });
    ctx.after(400, () => fx.shake('light')); ctx.after(700, () => fx.shake('light'));
    if (!(await ctx.wait(900))) return false;   // 末 100ms 为收（雷核压缩到最小）
    // ② 落雷
    fx.sfx('thunder01', 0.72); fx.shake('heavy');
    sb.cameraTo(sb.poseAt(center.x, center.y, zoomAt(home.scale, home.scale * THUNDER_PULL)), 90);
    ctx.after(40, () => fx.sfx('thunder_aoe_hit', 0.60));
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    const strikeH = b.y - cloud.y + 20;
    fx.top('<i style="position:absolute;left:' + b.x + 'px;top:' + cloud.y + 'px;width:56px;height:' + strikeH + 'px;margin-left:-28px;background:linear-gradient(90deg,transparent,rgba(167,139,250,.6) 25%,#f5f3ff 50%,rgba(167,139,250,.6) 75%,transparent);mix-blend-mode:screen;"></i>', 280)
      .firstChild.animate([{ opacity: 1, transform: 'scaleX(1.3)' }, { opacity: 0.8, transform: 'scaleX(0.6)', offset: 0.5 }, { opacity: 0, transform: 'scaleX(0.2)' }], { duration: 260, fill: 'forwards' });
    webm(ctx, '450.webm', b.x, b.y - R * 0.3, Math.max(R * 3.4, 220), { ms: 1500 });   // 同火焰01口径：画幅覆盖整个爆炸半径
    fx.top(ringHtml(b.x, b.y, R * 2.1, 'rgba(237,233,254,0.85)', 'rgba(139,92,246,0.6)'), 560).firstChild
      .animate([{ transform: 'scale(0.1)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 540, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
    const order = hits.map(hh => { const p = ctx.centerOf(hh.targetId); return { hh, p: worldPx(p), d: Math.hypot(p.x - center.x, p.y - center.y) }; }).sort((u, v) => u.d - v.d);
    order.forEach((o, k) => {
      const delay = Math.min(360, 40 + k * 90);
      ctx.after(delay, () => {
        webm(ctx, '450.webm', o.p.x, o.p.y - 40, 2.4 * PX, { ms: 1300, opacity: 0.95 });
        fx.top(orbHtml(o.p.x, o.p.y - 6, 80, '#c4b5fd', '#ffffff'), 220).firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 200, fill: 'forwards' });
        ctx.reveal(o.hh.targetId);
      });
    });
    if (!order.length) for (let k = 0; k < 3; k++) ctx.after(60 + k * 90, () => { const a = rnd(0, TAU), d = rnd(0.3, 0.7) * R; webm(ctx, '450.webm', b.x + Math.cos(a) * d, b.y + Math.sin(a) * d - 40, 2 * PX, { ms: 1300, opacity: 0.85 }); });
    if (!(await ctx.wait(500))) return false;
    // ③ 余韵：麻痹（规则 effects 真值）目标周身电弧闪烁 + 焦痕
    const numbed = [...new Set((result.effects || []).filter(e => e.tag === '麻痹').map(e => e.targetId))];
    for (const id of numbed) {
      const p = worldPx(ctx.centerOf(id));
      floatText(fx, p.x, p.y - 34, '⚡ 麻痹', '#ede9fe', '#7c3aed', { ms: 820, size: 13, delay: 80 });
      for (let at = 0; at < 800; at += 90) ctx.after(at, () => {
        fx.top(orbHtml(p.x + rnd(-18, 18), p.y + rnd(-22, 12), rnd(10, 18), '#c4b5fd', '#ffffff'), 130).firstChild.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
      });
    }
    fx.ground(orbHtml(b.x, b.y, R * 1.6, 'rgba(46,16,101,0.35)', 'rgba(76,29,149,0.4)'), 1000).firstChild.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 1000, fill: 'forwards' });
    if (!(await ctx.wait(620))) return false;
    sb.cameraTo(home, 380);
    return ctx.wait(380);
  },
};

// ---------- D3 通用非攻击槽与敌方/召唤空间模板 ----------
const aoeHeal = {
  id: 'aoe-heal', grade: 'L2', fxTags: ['群体回复'],
  timeline: { totalMs: 1100, fullscreen: false, darken: false },
  cues: SUPPORT_CUES,
  prepareKeys: () => SUPPORT_KEYS,
  play: ctx => playSupportEffects(ctx),
};

const allyBuff = {
  id: 'ally-buff', grade: 'L2', fxTags: ['群体增益'],
  timeline: { totalMs: 1100, fullscreen: false, darken: false },
  cues: SUPPORT_CUES,
  prepareKeys: () => SUPPORT_KEYS,
  play: ctx => playSupportEffects(ctx),
};

const pureDebuff = {
  id: 'pure-debuff', grade: 'L2', fxTags: ['群体减益'],
  timeline: { totalMs: 900, fullscreen: false, darken: false },
  cues: [{ key: 'enemyDebuff', vol: 0.52 }],
  prepareKeys() { return ['enemyDebuff']; },
  async play(ctx) {
    const { fx, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), a = worldPx(result.aim);
    fx.sfx('enemyDebuff', 0.52);
    const isBurn = (result.effects || []).some(e => e.dot === 'burn');
    const col = isBurn ? '#fb923c' : '#a78bfa';
    flyOrb(fx, c, { x: (c.x + a.x) / 2, y: Math.min(c.y, a.y) - 55 }, a, { size: 22, color: col, core: '#ffffff', ms: 320, fade: true });
    ctx.after(320, () => {
      fx.top(ringHtml(a.x, a.y, 2.2 * PX, col, 'transparent'), 450)
        .firstChild.animate([{ transform: 'scale(0.2)', opacity: 0.9 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 420, fill: 'forwards' });
      (result.effects || []).forEach(e => ctx.revealEffect(e, true));
    });
    return ctx.wait(860);
  },
};

const chargeDash = {
  id: 'charge-dash', grade: 'L2', fxTags: ['冲锋'],
  timeline: { totalMs: 980, fullscreen: false, darken: false },
  cues: [{ key: 'enemyMeleeGroupHit', vol: 0.62 }],
  prepareKeys() { return ['enemyMeleeGroupHit']; },
  async play(ctx) {
    const { fx, charge } = ctx;
    const c = worldPx(charge ? unitCenter(charge.from, charge.footprint) : ctx.centerOf(ctx.casterId));
    const dest = worldPx(charge ? unitCenter(charge.path.at(-1), charge.footprint) : ctx.result.aim);
    const impact = () => { fx.sfx('enemyMeleeGroupHit', 0.62); fx.shake('medium'); };
    particles(fx, Array.from({ length: 16 }, () => ({ x: c.x + rnd(-20, 20), y: c.y + rnd(-20, 20), dx: (dest.x - c.x) * 0.5 + rnd(-18, 18), dy: (dest.y - c.y) * 0.5 + rnd(-18, 18), size: rnd(14, 24), color: '#fbbf24', core: '#fef3c7', s0: 1, s1: 0.3, dur: 460 })), 520, 'ground');
    if (!charge) { ctx.after(180, () => { impact(); ctx.hits.forEach(h => ctx.reveal(h.targetId)); }); return ctx.wait(900); }
    const [ok, finished] = await Promise.all([ctx.playCharge(impact), ctx.wait(900)]);
    return ok && finished;
  },
};

const roarWave = {
  id: 'roar-wave', grade: 'L2', fxTags: ['咆哮'],
  timeline: { totalMs: 1000, fullscreen: false, darken: false },
  cues: [{ key: 'taunt', vol: 0.58 }],
  prepareKeys() { return ['taunt']; },
  async play(ctx) {
    const { fx, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), R = (result.query?.shape?.radius || 6) * PX;
    fx.sfx('taunt', 0.58); fx.shake('medium');
    for (let k = 0; k < 3; k++) ctx.after(k * 160, () => {
      fx.top(ringHtml(c.x, c.y, R * 2, 'rgba(251,191,36,0.7)', 'rgba(234,88,12,0.3)'), 540)
        .firstChild.animate([{ transform: 'scale(0.15)', opacity: 0.95 }, { transform: 'scale(1)', opacity: 0 }], { duration: 520, fill: 'forwards' });
    });
    ctx.after(260, () => (result.effects || []).forEach(e => ctx.revealEffect(e, true)));
    return ctx.wait(960);
  },
};

// ---------- 精英强力技能专属（伊塔库亚的眷族 / 犹格索托斯之子） ----------
// 旋涡带：同心椭圆上的短弧（外层容器压扁成地面透视，内层整体旋转，弧段不随旋转变形）
function swirlHtml(x, y, R, n, colors, { tilt = 0.62, w = [1.6, 4], op = [0.35, 0.9] } = {}) {
  let arcs = '';
  for (let i = 0; i < n; i++) {
    const r = R * rnd(0.16, 1.05), a0 = rnd(0, TAU), a1 = a0 + rnd(0.5, 1.4);
    arcs += '<path d="M' + (Math.cos(a0) * r).toFixed(1) + ',' + (Math.sin(a0) * r).toFixed(1) + ' A' + r.toFixed(1) + ',' + r.toFixed(1) + ' 0 0 1 ' + (Math.cos(a1) * r).toFixed(1) + ',' + (Math.sin(a1) * r).toFixed(1) +
      '" fill="none" stroke="' + pick(colors) + '" stroke-width="' + rnd(w[0], w[1]).toFixed(1) + '" stroke-linecap="round" opacity="' + rnd(op[0], op[1]).toFixed(2) + '"/>';
  }
  const S = R * 2.2;
  return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:0;height:0;transform:scaleY(' + tilt + ');">' +
    '<svg viewBox="' + (-S / 2) + ' ' + (-S / 2) + ' ' + S + ' ' + S + '" width="' + S + '" height="' + S + '" style="position:absolute;left:' + (-S / 2) + 'px;top:' + (-S / 2) + 'px;overflow:visible;filter:drop-shadow(0 0 5px ' + colors[0] + ');">' + arcs + '</svg></div>';
}
// 冰锥：自高空坠落钉入地面（clip-path 菱锥 + 冰蓝渐变）
function icicle(fx, p, { h = 70, w = 15, fall = 260, ms = 170, delay = 0 } = {}) {
  const l = fx.top('<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + w + 'px;height:' + h + 'px;margin:' + (-h) + 'px 0 0 ' + (-w / 2) + 'px;' +
    'clip-path:polygon(50% 100%,100% 22%,50% 0,0 22%);background:linear-gradient(#f0f9ff,#bae6fd 40%,#38bdf8 80%,#0369a1);filter:drop-shadow(0 0 6px #38bdf8);"></i>', ms + delay + 260);
  l.firstChild.animate([{ transform: 'translateY(' + (-fall) + 'px) scaleY(1.25)', opacity: 0 }, { transform: 'translateY(' + (-fall * 0.6) + 'px) scaleY(1.2)', opacity: 1, offset: 0.25 },
    { transform: 'translateY(0) scaleY(1)', opacity: 1, offset: 0.62 }, { transform: 'translateY(4px) scaleY(.85)', opacity: 0 }], { duration: ms + 240, delay, easing: 'cubic-bezier(.55,0,.9,.6)', fill: 'both' });
}
// 冰晶封裹：目标周身六枚冰棱刺出 → 迸裂为冰屑
function iceEncase(fx, p) {
  const shards = Array.from({ length: 6 }, (_, i) => {
    const a = i / 6 * 360 + rnd(-12, 12), h = rnd(26, 40);
    return '<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:12px;height:' + h.toFixed(0) + 'px;margin:' + (-h).toFixed(0) + 'px 0 0 -6px;transform-origin:50% 100%;--r:rotate(' + a.toFixed(0) + 'deg);' +
      'clip-path:polygon(50% 0,100% 70%,50% 100%,0 70%);background:linear-gradient(#ffffff,#bae6fd 45%,#0ea5e9);filter:drop-shadow(0 0 5px #7dd3fc);"></i>';
  }).join('');
  const l = fx.top(shards, 720);
  [...l.children].forEach(el => {
    const r = el.style.getPropertyValue('--r');
    el.animate([{ transform: r + ' scale(.1)', opacity: 0 }, { transform: r + ' scale(1.1)', opacity: 1, offset: 0.22 }, { transform: r + ' scale(1)', opacity: 0.95, offset: 0.6 }, { transform: r + ' scale(1.35)', opacity: 0 }], { duration: 680, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
  });
  particles(fx, Array.from({ length: 12 }, () => { const a = rnd(0, TAU), d = rnd(24, 60); return { x: p.x, y: p.y - 10, dx: Math.cos(a) * d, dy: Math.sin(a) * d - 10, size: rnd(4, 8), color: '#bae6fd', core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(380, 560), delay: 380 }; }), 1000);
}

// 极地暴风雪 L3（伊塔库亚的眷族，[特效:极地暴风雪]；蓄力 4 释放）：
// 冰原色罩 + 爆心霜纹阵逆旋 + 雪粒三波螺旋卷入 + 预告霜环收紧 → 收 →
// 双层暴风雪涡旋横扫 + 冰锥群自高空坠落钉地（目标逐个被冰棱封裹并揭示）+ 霜冻地表 → 斜吹飞雪余韵（击退由导演在条目后补间）
const polarBlizzard = {
  id: 'frost-blast', grade: 'L3', fxTags: ['极地暴风雪', '冰霜爆炸'],
  timeline: { chargeMs: 950, totalMs: 2950, fullscreen: true, darken: false },   // 950 蓄势 + 450 冰锥坠落 + 1550 风雪余韵
  cues: [{ key: 'aoe_wind_spin_fs772867', vol: 0.55 }, { key: 'freeze01', vol: 0.62 }, { key: 'frost_crystal_impact_fs550267', vol: 0.70 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result } = ctx, shape = result.query.shape || {}, center = shape.center || result.aim;
    const b = worldPx(center), R = (shape.radius || 5) * PX;
    const SNOW = ['#ffffff', '#e0f2fe', '#bae6fd'];
    // ① 蓄势
    fx.sfx('aoe_wind_spin_fs772867', 0.55);
    tint(fx, 'radial-gradient(circle,rgba(186,230,253,.06),rgba(8,47,73,.9))', { inMs: 600, holdMs: 1800, outMs: 600, peak: 0.44 });
    const rune = fx.ground(runeHtml(fx.uid(), b.x, b.y, R, '#7dd3fc', '#f0f9ff', 'ᛁᛋᚺᚨᚷᛚ'), 1500);
    grow(rune.firstChild, { ms: 1500, s0: 0.35, s1: 1, hold: 0.68, o: 0.85 });
    spin(rune.querySelector('[data-fx=spin]'), -170, 1500);
    const tele = fx.ground(ringHtml(b.x, b.y, R * 2, 'rgba(224,242,254,0.5)', 'rgba(14,116,144,0.42)'), 1000);
    tele.firstChild.animate([{ transform: 'scale(1.25)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.85 }], { duration: 900, fill: 'forwards' });
    for (const w of [0, 280, 560]) ctx.after(w, () => particles(fx, Array.from({ length: 20 }, (_, i) => {
      const a = i / 20 * TAU + rnd(-0.2, 0.2), d = rnd(1.15, 1.55) * R, a2 = a + 1.7;
      return { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.62, dx: (Math.cos(a2) * 0.3 - Math.cos(a) * 0.92) * d, dy: (Math.sin(a2) * 0.3 - Math.sin(a) * 0.92) * d * 0.62,
        size: rnd(4, 9), color: pick(SNOW), core: '#ffffff', s0: 1, s1: 0.35, dur: rnd(520, 700), ease: 'cubic-bezier(.4,0,.7,.6)' };
    }), 760));
    particles(fx, Array.from({ length: 12 }, () => { const a = rnd(0, TAU), d = rnd(1.1, 1.4) * R; return { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.62, dx: -Math.cos(a) * d * 0.7, dy: -Math.sin(a) * d * 0.43, size: rnd(60, 110), color: 'rgba(186,230,253,0.32)', core: 'rgba(224,242,254,0.4)', o0: 0.8, s0: 1, s1: 0.7, dur: rnd(760, 920) }; }), 1000);
    ctx.after(420, () => fx.shake('light')); ctx.after(760, () => fx.shake('light'));
    if (!(await ctx.wait(950))) return false;
    // ② 爆发
    fx.sfx('freeze01', 0.62); fx.sfx('frost_crystal_impact_fs550267', 0.70); fx.shake('heavy');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    tele.remove();
    for (const [dir, n, ms, op] of [[1, 46, 1500, [0.45, 0.95]], [-1, 28, 1300, [0.25, 0.6]]]) {
      const v = fx.top(swirlHtml(b.x, b.y, R, n, SNOW, { op }), ms).firstChild.firstChild;
      v.animate([{ transform: 'rotate(0deg) scale(.55)', opacity: 0 }, { transform: 'rotate(' + dir * 120 + 'deg) scale(1)', opacity: 1, offset: 0.25 }, { transform: 'rotate(' + dir * 360 + 'deg) scale(1.12)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
    }
    fx.top(ringHtml(b.x, b.y, R * 2.3, 'rgba(240,249,255,0.9)', 'rgba(56,189,248,0.45)'), 620).firstChild
      .animate([{ transform: 'scale(0.12)', opacity: 1 }, { transform: 'scale(1.08)', opacity: 0 }], { duration: 600, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
    fx.ground(orbHtml(b.x, b.y, R * 2.1, 'rgba(186,230,253,0.26)', 'rgba(240,249,255,0.34)'), 1900).firstChild
      .animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.15 }, { transform: 'scale(1.04)', opacity: 0 }], { duration: 1900, fill: 'forwards' });
    const order = hits.map(h => { const p = ctx.centerOf(h.targetId); return { h, p: worldPx(p), d: Math.hypot(p.x - center.x, p.y - center.y) }; }).sort((u, v) => u.d - v.d);
    order.forEach((o, k) => {
      const delay = Math.min(380, 40 + k * 80);
      icicle(fx, o.p, { h: 78, w: 17, delay });
      ctx.after(delay + 105, () => { ctx.reveal(o.h.targetId); if (o.h.hit) iceEncase(fx, o.p); else particles(fx, Array.from({ length: 8 }, () => ({ x: o.p.x, y: o.p.y + 14, dx: rnd(-30, 30), dy: rnd(-24, -6), size: rnd(5, 9), color: '#e0f2fe', core: '#ffffff', s0: 1, s1: 0.3, dur: 420 })), 500); });
    });
    for (let k = 0; k < 7; k++) { const a = rnd(0, TAU), d = rnd(0.25, 0.95) * R; icicle(fx, { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7 }, { h: rnd(40, 62), w: rnd(10, 14), delay: 30 + k * 55 }); }
    if (!(await ctx.wait(450))) return false;
    // ③ 余韵：斜吹飞雪掠过爆区
    particles(fx, Array.from({ length: 42 }, () => ({ x: b.x - R * 1.2 + rnd(-0.3, 0.6) * R, y: b.y + rnd(-1, 0.8) * R, dx: R * rnd(1.4, 2.2), dy: rnd(12, 40), size: rnd(3, 7), color: pick(SNOW), core: '#ffffff', s0: 1, s1: 0.5, dur: rnd(900, 1300), delay: rnd(0, 380), ease: 'linear' })), 1550);
    return ctx.wait(1550);
  },
};

// 时空扭曲震荡 L3（犹格索托斯之子，[特效:时空扭曲震荡]）：
// 爆心奇点生成 + 三重扭曲时轮反向旋转并向内坍缩 + 逆走时针 + 紫青粒子被吸入 → 奇点内爆 →
// 色差三重冲击波 + 破碎空间晶片外飞 + 目标时空残影错位（致盲暗纱）→ 涟漪余震（击退由导演在条目后补间）
function chromaRing(fx, p, d, ms, delay) {
  const l = fx.top(ringHtml(p.x - 4, p.y, d, 'rgba(244,114,182,0.75)', 'rgba(190,24,93,0.3)') + ringHtml(p.x + 4, p.y, d, 'rgba(34,211,238,0.75)', 'rgba(14,116,144,0.3)') + ringHtml(p.x, p.y, d, 'rgba(255,255,255,0.85)', 'rgba(168,85,247,0.4)'), ms + delay + 40);
  [...l.children].forEach((el, i) => el.animate([{ transform: 'scale(0.1)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: ms, delay: delay + i * 18, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'both' }));
}
const temporalQuake = {
  id: 'void-quake', grade: 'L3', fxTags: ['时空扭曲震荡', '虚空震荡'],
  timeline: { chargeMs: 900, totalMs: 2550, fullscreen: true, darken: false },   // 900 蓄势 + 100 内爆 + 450 冲击 + 1100 余韵
  cues: [{ key: 'mx_vacuum', vol: 0.52 }, { key: 'mx_deep_impact', vol: 0.72 }, { key: 'enemyMagicGroup', vol: 0.55 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result } = ctx, shape = result.query.shape || {}, center = shape.center || result.aim;
    const b = worldPx(center), R = (shape.radius || 4) * PX, uid = fx.uid();
    // ① 蓄势
    fx.sfx('mx_vacuum', 0.52);
    tint(fx, 'radial-gradient(circle,rgba(88,28,135,.1),rgba(10,4,24,.92))', { inMs: 500, holdMs: 1500, outMs: 600, peak: 0.46 });
    const rune = fx.ground(runeHtml(uid, b.x, b.y, R * 0.95, '#a855f7', '#f5d0fe', 'ᛃᛟᚷᛋᛟᚦ'), 1300);
    grow(rune.firstChild, { ms: 1300, s0: 0.3, s1: 1, hold: 0.72, o: 0.9 });
    spin(rune.querySelector('[data-fx=spin]'), 260, 1300);
    const wheels = [1.25, 0.95, 0.65].map((k, i) => fx.top(swirlHtml(b.x, b.y - 10, R * k, 14, i === 1 ? ['#22d3ee', '#a5f3fc'] : ['#c084fc', '#f5d0fe'], { tilt: 0.55, w: [2, 3.5], op: [0.5, 0.95] }), 1000).firstChild.firstChild);
    wheels.forEach((el, i) => el.animate([{ transform: 'rotate(0deg) scale(1.15)', opacity: 0 }, { transform: 'rotate(' + (i % 2 ? -1 : 1) * 200 + 'deg) scale(.85)', opacity: 1, offset: 0.6 }, { transform: 'rotate(' + (i % 2 ? -1 : 1) * 320 + 'deg) scale(.2)', opacity: 0.9 }], { duration: 950, easing: 'cubic-bezier(.45,0,.8,.6)', fill: 'forwards' }));
    const hands = fx.top('<svg viewBox="-60 -60 120 120" width="' + (R * 1.3).toFixed(0) + '" height="' + (R * 1.3).toFixed(0) + '" style="position:absolute;left:' + b.x + 'px;top:' + (b.y - 10) + 'px;margin:' + (-R * 0.65).toFixed(0) + 'px 0 0 ' + (-R * 0.65).toFixed(0) + 'px;overflow:visible;filter:drop-shadow(0 0 6px #e879f9);">' +
      '<g><path d="M0,0 L0,-52" stroke="#f5d0fe" stroke-width="3" stroke-linecap="round"/><path d="M0,0 L34,0" stroke="#a5f3fc" stroke-width="4" stroke-linecap="round"/></g></svg>', 960);
    hands.firstChild.firstChild.animate([{ transform: 'rotate(0deg)', opacity: 0 }, { transform: 'rotate(-540deg)', opacity: 1, offset: 0.4 }, { transform: 'rotate(-1440deg)', opacity: 0.2 }], { duration: 940, easing: 'cubic-bezier(.3,0,.7,1)', fill: 'forwards' });
    const core = fx.top(orbHtml(b.x, b.y - 10, 90, 'rgba(46,16,101,0.95)', '#05010d'), 1020);
    core.firstChild.style.mixBlendMode = 'normal';
    core.firstChild.style.boxShadow = '0 0 26px 6px rgba(192,132,252,.7), inset 0 0 18px rgba(34,211,238,.6)';
    core.firstChild.animate([{ transform: 'scale(0.1)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.85 }, { transform: 'scale(0.25)', opacity: 1 }], { duration: 1000, fill: 'forwards' });
    particles(fx, Array.from({ length: 26 }, () => { const a = rnd(0, TAU), d = rnd(1.1, 1.6) * R; return { x: b.x + Math.cos(a) * d, y: b.y - 10 + Math.sin(a) * d * 0.6, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d * 0.6, size: rnd(5, 10), color: pick(['#c084fc', '#22d3ee', '#f5d0fe']), core: '#ffffff', s0: 1, s1: 0.2, dur: rnd(560, 820), delay: rnd(0, 200), ease: 'cubic-bezier(.6,0,.9,.5)' }; }), 1100);
    ctx.after(380, () => fx.shake('light')); ctx.after(700, () => fx.shake('medium'));
    if (!(await ctx.wait(1000))) return false;   // 末 100ms 奇点内爆
    // ② 爆发
    fx.sfx('mx_deep_impact', 0.72); fx.sfx('enemyMagicGroup', 0.55); fx.shake('quake');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    [0, 110, 230].forEach((dl, i) => chromaRing(fx, b, R * (2.5 - i * 0.35), 620, dl));
    fx.top(orbHtml(b.x, b.y - 10, R * 1.4, 'rgba(216,180,254,0.85)', '#ffffff'), 300).firstChild
      .animate([{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 280, fill: 'forwards' });
    const shards = fx.top(Array.from({ length: 14 }, () => { const s = rnd(14, 26); return '<i style="position:absolute;left:' + b.x + 'px;top:' + (b.y - 10) + 'px;width:' + s.toFixed(0) + 'px;height:' + (s * 0.8).toFixed(0) + 'px;margin:' + (-s * 0.4).toFixed(0) + 'px 0 0 ' + (-s / 2).toFixed(0) + 'px;' +
      'clip-path:polygon(0 30%,60% 0,100% 55%,40% 100%);background:linear-gradient(135deg,rgba(245,208,254,.95),rgba(76,29,149,.9) 55%,rgba(34,211,238,.8));filter:drop-shadow(0 0 4px #c084fc);"></i>'; }).join(''), 900);
    [...shards.children].forEach(el => { const a = rnd(0, TAU), d = rnd(0.7, 1.3) * R; el.animate([{ transform: 'translate(0,0) rotate(0deg) scale(.4)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * d).toFixed(0) + 'px,' + (Math.sin(a) * d * 0.7).toFixed(0) + 'px) rotate(' + rnd(-300, 300).toFixed(0) + 'deg) scale(1)', opacity: 0 }], { duration: rnd(560, 820), easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' }); });
    const order = hits.map(h => { const p = ctx.centerOf(h.targetId); return { h, p: worldPx(p), d: Math.hypot(p.x - center.x, p.y - center.y) }; }).sort((u, v) => u.d - v.d);
    order.forEach((o, k) => ctx.after(Math.min(320, 60 + k * 70), () => {
      ctx.reveal(o.h.targetId);
      if (!o.h.hit) return;
      jolt(ctx, o.h.targetId, { amp: 6, ms: 70, times: 2, glow: '#c084fc' });
      const ghost = fx.top(orbHtml(o.p.x - 10, o.p.y, 54, 'rgba(244,114,182,0.5)', 'rgba(244,114,182,0.2)') + orbHtml(o.p.x + 10, o.p.y, 54, 'rgba(34,211,238,0.5)', 'rgba(34,211,238,0.2)') + orbHtml(o.p.x, o.p.y - 4, 74, 'rgba(15,5,30,0.7)', 'rgba(30,10,50,0.75)'), 760);
      [...ghost.children].forEach((el, i) => { if (i === 2) el.style.mixBlendMode = 'normal'; el.animate([{ transform: 'translateX(0) scale(.5)', opacity: 0 }, { transform: 'translateX(' + (i === 2 ? 0 : (i ? 8 : -8)) + 'px) scale(1)', opacity: 1, offset: 0.3 }, { transform: 'translateX(' + (i === 2 ? 0 : (i ? 16 : -16)) + 'px) scale(1.2)', opacity: 0 }], { duration: 740, fill: 'forwards' }); });
    }));
    if (!(await ctx.wait(450))) return false;
    // ③ 余韵：空间涟漪余震
    for (const dl of [0, 320]) chromaRing(fx, b, R * 1.6, 760, dl);
    particles(fx, Array.from({ length: 18 }, () => { const a = rnd(0, TAU), d = rnd(0.3, 1) * R; return { x: b.x, y: b.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.6 - 20, size: rnd(4, 8), color: pick(['#c084fc', '#22d3ee']), core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(700, 1000), delay: rnd(0, 300) }; }), 1100);
    return ctx.wait(1100);
  },
};

// 维度撕裂 L3（犹格索托斯之子，[特效:维度撕裂]；蓄力 2 释放，直线 12×2 穿透）：
// 沿射线描出锯齿维度裂缝并频闪 + 地面射界带亮起 → 收 →
// 裂缝自施法者向远端撕开为虚空裂隙（星点深渊 + 紫青裂缘），沿途目标随裂口推进逐个被斜斩并揭示 + 虚空触丝外溢 → 裂隙闭合白闪 → 余烬
const dimensionRift = {
  id: 'line-rift', grade: 'L3', fxTags: ['维度撕裂', '直线裂隙'],
  timeline: { chargeMs: 850, totalMs: 2450, fullscreen: true, darken: false },   // 850 裂缝描出 + 300 撕开推进 + 500 持续 + 250 闭合 + 550 余烬
  cues: [{ key: 'mx_rift_charge', vol: 0.55 }, { key: 'mx_rift_tear', vol: 0.72 }, { key: 'magicKill', vol: 0.55 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result } = ctx, shape = result.query.shape || {};
    const from = shape.from || ctx.centerOf(ctx.casterId), o = worldPx(from), aimP = result.aim || from;
    const dir = shape.dir != null ? shape.dir : Math.atan2(aimP.y - from.y, aimP.x - from.x);
    const L = (shape.length || 12) * PX, Wd = (shape.width || 2) * PX, rot = deg(dir).toFixed(2);
    const band = inner => fx.top('<div style="position:absolute;left:' + o.x + 'px;top:' + o.y + 'px;width:0;height:0;transform:rotate(' + rot + 'deg);">' + inner + '</div>', 2200).firstChild;
    let seam = 'M0,0';
    for (let i = 1; i <= 24; i++) seam += ' L' + (L * i / 24).toFixed(1) + ',' + (i === 24 ? 0 : rnd(-0.22, 0.22) * Wd).toFixed(1);
    // ① 蓄势：射界带 + 锯齿裂缝描出频闪 + 沿途紫青火花
    fx.sfx('mx_rift_charge', 0.55);
    tint(fx, 'radial-gradient(circle,rgba(76,29,149,.08),rgba(8,4,20,.9))', { inMs: 500, holdMs: 1500, outMs: 500, peak: 0.42 });
    const lane = band('<i style="position:absolute;left:0;top:' + (-Wd / 2) + 'px;width:' + L + 'px;height:' + Wd + 'px;background:linear-gradient(90deg,rgba(168,85,247,.28),rgba(34,211,238,.18) 80%,transparent);border-radius:' + (Wd / 2) + 'px;"></i>');
    lane.firstChild.animate([{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0.6 }], { duration: 850, fill: 'forwards' });
    const crack = band('<svg width="' + (L + 20) + '" height="' + (Wd * 2) + '" viewBox="0 ' + (-Wd) + ' ' + (L + 20) + ' ' + (Wd * 2) + '" style="position:absolute;left:0;top:' + (-Wd) + 'px;overflow:visible;filter:drop-shadow(0 0 6px #c084fc);">' +
      '<path d="' + seam + '" fill="none" stroke="#a855f7" stroke-width="7" stroke-linejoin="round" opacity=".55" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>' +
      '<path d="' + seam + '" fill="none" stroke="#f5f3ff" stroke-width="2.4" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>');
    [...crack.firstChild.children].forEach(p => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 620, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' }));
    crack.firstChild.animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], { duration: 850, easing: 'steps(5)', fill: 'forwards' });
    for (let t = 120; t < 820; t += 70) ctx.after(t, () => { const s = rnd(0.05, Math.min(1, t / 620)) * L; const x = o.x + Math.cos(dir) * s, y = o.y + Math.sin(dir) * s;
      fx.top(orbHtml(x, y, rnd(12, 22), pick(['#c084fc', '#22d3ee']), '#ffffff'), 150).firstChild.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'scale(.6)' }], { duration: 140, fill: 'forwards' }); });
    fx.top(orbHtml(o.x, o.y - 6, 60, 'rgba(168,85,247,0.8)', '#f5f3ff'), 900).firstChild.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 1, offset: 0.85 }, { transform: 'scale(.5)', opacity: 0 }], { duration: 880, fill: 'forwards' });
    ctx.after(500, () => fx.shake('light'));
    if (!(await ctx.wait(850))) return false;
    // ② 撕开：虚空裂隙自施法者向远端推进
    fx.sfx('mx_rift_tear', 0.72); fx.sfx('magicKill', 0.55); fx.shake('heavy');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    const stars = Array.from({ length: 26 }, () => '<i style="position:absolute;left:' + rnd(0, L).toFixed(0) + 'px;top:' + rnd(-Wd * 0.3, Wd * 0.3).toFixed(0) + 'px;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 4px #a5f3fc;opacity:' + rnd(0.4, 1).toFixed(2) + ';"></i>').join('');
    const rift = band('<div style="position:absolute;left:0;top:' + (-Wd * 0.45) + 'px;width:' + L + 'px;height:' + (Wd * 0.9) + 'px;transform-origin:0 50%;border-radius:' + Wd + 'px;' +
      'background:linear-gradient(180deg,transparent,rgba(192,132,252,.9) 14%,#1e0b3a 30%,#05010d 50%,#1e0b3a 70%,rgba(34,211,238,.9) 86%,transparent);box-shadow:0 0 22px 4px rgba(168,85,247,.55);">' + stars + '</div>');
    rift.firstChild.animate([{ transform: 'scaleX(0) scaleY(.15)', opacity: 1 }, { transform: 'scaleX(1) scaleY(.6)', opacity: 1, offset: 0.25 }, { transform: 'scaleX(1) scaleY(1)', opacity: 1, offset: 0.4 },
      { transform: 'scaleX(1) scaleY(.85)', opacity: 1, offset: 0.78 }, { transform: 'scaleX(1) scaleY(0)', opacity: 0.6 }], { duration: 1150, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    crack.firstChild.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    const along = p => (p.x - from.x) * Math.cos(dir) + (p.y - from.y) * Math.sin(dir);
    hits.map(h => ({ h, m: ctx.centerOf(h.targetId) })).sort((u, v) => along(u.m) - along(v.m)).forEach(({ h, m }) => {
      ctx.after(Math.max(30, Math.min(1, along(m) / (L / PX)) * 290), () => {
        ctx.reveal(h.targetId);
        if (!h.hit) return;
        const p = worldPx(m), cut = fx.top('<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:96px;height:5px;margin:-2.5px 0 0 -48px;border-radius:3px;background:linear-gradient(90deg,transparent,#c084fc 25%,#ffffff 50%,#22d3ee 75%,transparent);box-shadow:0 0 10px #a855f7;mix-blend-mode:screen;"></i>' +
          '<i style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:70px;height:3px;margin:-1.5px 0 0 -35px;border-radius:2px;background:linear-gradient(90deg,transparent,#f5f3ff,transparent);mix-blend-mode:screen;"></i>', 360);
        [...cut.children].forEach((el, i) => { const r = (i ? -38 : 32) + rnd(-8, 8); el.animate([{ transform: 'rotate(' + r + 'deg) scaleX(0)', opacity: 1 }, { transform: 'rotate(' + r + 'deg) scaleX(1.1)', opacity: 1, offset: 0.35 }, { transform: 'rotate(' + r + 'deg) scaleX(1)', opacity: 0 }], { duration: 340, delay: i * 50, fill: 'both' }); });
        jolt(ctx, h.targetId, { amp: 5, ms: 60, times: 2, glow: '#a855f7' });
      });
    });
    for (let t = 80; t < 800; t += 90) ctx.after(t, () => particles(fx, Array.from({ length: 5 }, () => { const s = rnd(0.05, 1) * L, side = Math.random() < 0.5 ? -1 : 1, x = o.x + Math.cos(dir) * s, y = o.y + Math.sin(dir) * s, n = dir + side * Math.PI / 2, d = rnd(20, 60);
      return { x, y, dx: Math.cos(n) * d, dy: Math.sin(n) * d, size: rnd(5, 10), color: pick(['#a855f7', '#22d3ee', '#4c1d95']), core: '#f5f3ff', s0: 1, s1: 0.2, dur: rnd(380, 560) }; }), 600));
    if (!(await ctx.wait(900))) return false;
    // ③ 闭合白闪 + 余烬
    lane.firstChild.animate([{ opacity: 0.6 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    const flash = band('<i style="position:absolute;left:0;top:-3px;width:' + L + 'px;height:6px;border-radius:3px;background:linear-gradient(90deg,#f5f3ff,#ffffff 50%,rgba(165,243,252,.6));box-shadow:0 0 16px #e9d5ff;mix-blend-mode:screen;"></i>');
    flash.firstChild.animate([{ transform: 'scaleY(2.4)', opacity: 1 }, { transform: 'scaleY(.2)', opacity: 0 }], { duration: 300, fill: 'forwards' });
    fx.shake('medium');
    particles(fx, Array.from({ length: 16 }, () => { const s = rnd(0, 1) * L; return { x: o.x + Math.cos(dir) * s, y: o.y + Math.sin(dir) * s, dx: rnd(-14, 14), dy: rnd(-46, -16), size: rnd(4, 7), color: pick(['#c084fc', '#a5f3fc']), core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(500, 700) }; }), 760);
    return ctx.wait(700);
  },
};

// 蓄力起手（极地暴风雪 Charge:4）L2：周身寒气凝结 + 霜纹阵 + 雪粒螺旋卷入 + 冰晶冠闪
const frostGather = {
  id: 'frost-gather', kind: 'prepare', grade: 'L2', fxTags: ['极地暴风雪', '冰霜爆炸'],
  timeline: { totalMs: 1000 },
  cues: [{ key: 'aoe_wind_spin_fs772867', vol: 0.52 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(pctx) {
    const { fx } = pctx, c = worldPx(pctx.centerOf(pctx.casterId));
    fx.sfx('aoe_wind_spin_fs772867', 0.52);
    const rune = fx.ground(runeHtml(fx.uid(), c.x, c.y + 6, 1.3 * PX, '#7dd3fc', '#f0f9ff', 'ᛁᛋᚺᚨ'), 1000);
    grow(rune.firstChild, { ms: 1000, s0: 0.4, s1: 1, hold: 0.78 });
    spin(rune.querySelector('[data-fx=spin]'), -140, 1000);
    const v = fx.top(swirlHtml(c.x, c.y, 1.2 * PX, 18, ['#ffffff', '#bae6fd', '#e0f2fe'], { op: [0.4, 0.9] }), 980).firstChild.firstChild;
    v.animate([{ transform: 'rotate(0deg) scale(1.3)', opacity: 0 }, { transform: 'rotate(-200deg) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'rotate(-420deg) scale(.6)', opacity: 0 }], { duration: 960, fill: 'forwards' });
    particles(fx, Array.from({ length: 18 }, () => { const a = rnd(0, TAU), d = rnd(1.2, 1.8) * PX; return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.62, dx: -Math.cos(a) * d * 0.85, dy: -Math.sin(a) * d * 0.53, size: rnd(4, 8), color: '#e0f2fe', core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(560, 820), delay: rnd(0, 240) }; }), 1000);
    pctx.after(720, () => {
      iceEncase(fx, { x: c.x, y: c.y - 6 });
      floatText(fx, c.x, c.y - 72, '❄️ 暴风雪蓄势 · ' + pctx.skill.name, '#e0f2fe', '#0369a1', { ms: 760, size: 14 });
    });
    return pctx.wait(1000);
  },
};

// 蓄力起手（维度撕裂 Charge:2）L2：周身空间裂纹频闪 + 紫青微光吸入 + 掌心奇点
const riftGather = {
  id: 'rift-gather', kind: 'prepare', grade: 'L2', fxTags: ['维度撕裂', '直线裂隙'],
  timeline: { totalMs: 1000 },
  cues: [{ key: 'mx_rift_charge', vol: 0.55 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(pctx) {
    const { fx } = pctx, c = worldPx(pctx.centerOf(pctx.casterId));
    fx.sfx('mx_rift_charge', 0.55);
    for (let t = 60; t < 860; t += 110) pctx.after(t, () => {
      const a = rnd(0, TAU), r0 = rnd(0.7, 1.1) * PX, r1 = r0 + rnd(0.5, 0.9) * PX;
      let d = 'M' + (Math.cos(a) * r0).toFixed(1) + ',' + (Math.sin(a) * r0).toFixed(1);
      for (let k = 1; k <= 4; k++) { const rr = r0 + (r1 - r0) * k / 4, aa = a + rnd(-0.18, 0.18); d += ' L' + (Math.cos(aa) * rr).toFixed(1) + ',' + (Math.sin(aa) * rr).toFixed(1); }
      fx.top('<svg width="2" height="2" style="position:absolute;left:' + c.x + 'px;top:' + c.y + 'px;overflow:visible;filter:drop-shadow(0 0 5px #c084fc);"><path d="' + d + '" fill="none" stroke="' + pick(['#f5f3ff', '#a5f3fc']) + '" stroke-width="2.2" stroke-linejoin="round"/></svg>', 200)
        .firstChild.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0.3, offset: 0.5 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 190, easing: 'steps(4)', fill: 'forwards' });
    });
    particles(fx, Array.from({ length: 16 }, () => { const a = rnd(0, TAU), d = rnd(1.3, 1.9) * PX; return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, dx: -Math.cos(a) * d * 0.9, dy: -Math.sin(a) * d * 0.9, size: rnd(5, 9), color: pick(['#a855f7', '#22d3ee']), core: '#ffffff', s0: 1, s1: 0.2, dur: rnd(560, 820), delay: rnd(0, 240) }; }), 1000);
    const core = fx.top(orbHtml(c.x, c.y - 8, 46, 'rgba(46,16,101,0.95)', '#05010d'), 1000);
    core.firstChild.style.mixBlendMode = 'normal';
    core.firstChild.style.boxShadow = '0 0 16px 4px rgba(192,132,252,.7)';
    core.firstChild.animate([{ transform: 'scale(.1)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.75 }, { transform: 'scale(.4)', opacity: 0 }], { duration: 980, fill: 'forwards' });
    pctx.after(740, () => floatText(fx, c.x, c.y - 72, '🌌 维度撕裂蓄势 · ' + pctx.skill.name, '#f5f3ff', '#6d28d9', { ms: 760, size: 14 }));
    return pctx.wait(1000);
  },
};

const waterBolt = {
  id: 'water-bolt', grade: 'L1', fxTags: ['水流'],
  timeline: { totalMs: 520, fullscreen: false, darken: false },
  cues: [{ key: 'enemyMagic', vol: 0.34 }],
  prepareKeys() { return ['enemyMagic']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), a = worldPx(result.aim);
    fx.sfx('enemyMagic', 0.34);
    flyOrb(fx, c, { x: (c.x + a.x) / 2, y: (c.y + a.y) / 2 - 24 }, a, { size: 22, color: '#22d3ee', core: '#ecfeff', ms: 260, fade: true });
    ctx.after(250, () => hits.forEach(h => ctx.reveal(h.targetId)));
    return ctx.wait(480);
  },
};

const curseBeam = {
  id: 'curse-beam', grade: 'L1', fxTags: ['诅咒'],
  timeline: { totalMs: 520, fullscreen: false, darken: false },
  cues: [{ key: 'enemyDebuff', vol: 0.34 }],
  prepareKeys() { return ['enemyDebuff']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), a = worldPx(result.aim);
    fx.sfx('enemyDebuff', 0.34);
    trail(fx, c, { x: (c.x + a.x) / 2, y: (c.y + a.y) / 2 - 12 }, a, { color: '#9333ea', width: 5, ms: 260 });
    ctx.after(240, () => hits.forEach(h => ctx.reveal(h.targetId)));
    return ctx.wait(480);
  },
};

const reactionKanpo = {
  // 原版 playKanpoEffect（index.html）移植到世界层：压暗 + 来袭者锁定 → 看破者金色之眼 + 金流射向来袭者 →
  // 金环汇聚 + 金屑迸射 → 斜斩 + 「无效化」印章 + 暖白闪 + 震屏；尺寸按头像（PX）而非屏幕像素
  id: 'reaction-kanpo', kind: 'reaction', grade: 'identity', fxTags: ['看破'], reuseAudio: true,
  timeline: { totalMs: 1410 },
  cues: [{ key: 'kanpo', vol: 1 }],
  prepareKeys() { return ['kanpo']; },
  async play(ctx) {
    const { fx } = ctx;
    const hp = ctx.centerOf(ctx.responderId), ep = ctx.attackerId && ctx.centerOf(ctx.attackerId);
    if (!hp) return true;
    const h = worldPx(hp), e = ep ? worldPx(ep) : { x: h.x, y: h.y - 2 * PX };
    const pop = (html, ms, frames, o = {}) => fx.top(html, ms).firstChild.animate(frames, Object.assign({ duration: ms, fill: 'forwards' }, o));
    const svgAt = (x, y, size, vb, body, glow) => '<svg viewBox="' + vb + '" width="' + size + '" height="' + size + '" style="position:absolute;left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-50%);overflow:visible;filter:drop-shadow(0 0 ' + glow + 'px rgba(245,158,11,0.9));">' + body + '</svg>';
    const T = (s, o = 1, extra = '') => ({ transform: 'translate(-50%,-50%) ' + extra + ' scale(' + s + ')', opacity: o });
    // ① 压暗（锚在来袭者）+ 来袭者锁定环
    worldDarken(fx, e, { holeR: 1.6 * PX, inMs: 250, holdMs: 900, outMs: 260, peak: 0.5 });
    const lock = svgAt(e.x, e.y, 3 * PX, '0 0 100 100', '<circle cx="50" cy="50" r="42" stroke="#fbbf24" stroke-width="3" fill="none" stroke-dasharray="10 8"/>' +
      '<path d="M30,50 L45,50 L45,35 L55,35 L55,50 L70,50 M50,50 L50,62" stroke="#fde68a" stroke-width="7" stroke-linecap="round" fill="none"/><circle cx="50" cy="62" r="8" fill="none" stroke="#fff7ed" stroke-width="2"/>', 18);
    pop(lock, 900, [T(0.8, 0), T(1.1, 1, 'rotate(20deg)'), T(1.05, 1, 'rotate(60deg)'), T(1.2, 0, 'rotate(80deg)')]);
    // ② 看破者头顶金色之眼 + 文字
    const eye = svgAt(h.x, h.y - 1.7 * PX, 2.5 * PX, '0 0 120 120', '<defs><radialGradient id="kpg' + fx.uid() + '"><stop offset="0" stop-color="#fff7ed"/><stop offset=".45" stop-color="#fbbf24" stop-opacity=".85"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="60" cy="60" r="52" fill="#fbbf2433"/><path d="M14,60 Q34,28 60,28 Q86,28 106,60 Q86,92 60,92 Q34,92 14,60 Z" fill="#78350f" stroke="#fbbf24" stroke-width="4"/>' +
      '<circle cx="60" cy="60" r="24" fill="#fde68a" stroke="#fff7ed" stroke-width="3"/><circle cx="60" cy="60" r="8" fill="#fff7ed"/><path d="M38,60 Q48,52 60,52 Q72,52 82,60" stroke="#f59e0b" stroke-width="3" fill="none" opacity=".9"/>', 22);
    pop(eye, 1000, [T(0.4, 0), T(1.15, 1), T(0.95, 1), T(1.15, 0.9), T(1.3, 0)], { easing: 'ease-out' });
    floatText(fx, h.x, h.y - 3.1 * PX, '看破识破！', '#fde68a', '#f59e0b', { ms: 1000, size: 15 });
    // 金流：金屑从看破者出发，在来袭者身上汇合。
    const origin = { x: h.x, y: h.y - 1.2 * PX };
    for (let i = 0; i < 28; i++) {
      const a = { x: origin.x + rnd(-0.24, 0.24) * PX, y: origin.y + rnd(-0.24, 0.24) * PX };
      const b = { x: e.x + rnd(-0.2, 0.2) * PX, y: e.y + rnd(-0.2, 0.2) * PX };
      const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - rnd(0.3, 1) * PX };
      flyOrb(fx, a, c, b, { size: rnd(0.12, 0.22) * PX, color: pick(['#fbbf24', '#f59e0b', '#fde68a']), core: '#fff7ed', ms: rnd(270, 340), delay: i * 3, fade: true });
    }
    if (!(await ctx.wait(430))) return false;
    // ③ 金环汇聚 + 金屑迸射
    pop(svgAt(e.x, e.y, 2.6 * PX, '0 0 100 100', '<circle cx="50" cy="50" r="30" stroke="#fbbf24" stroke-width="4" fill="none"/><circle cx="50" cy="50" r="42" stroke="#fde68a" stroke-width="2" fill="none" stroke-dasharray="6 6"/>', 22),
      700, [T(1.35, 0), { ...T(0.72, 1), offset: 0.36 }, T(1.65, 0)], { easing: 'ease-out' });
    particles(fx, Array.from({ length: 38 }, () => { const a = rnd(0, TAU), d = rnd(0.6, 2) * PX; return { x: e.x + rnd(-12, 12), y: e.y + rnd(-12, 12), dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: rnd(6, 11), color: pick(['#fbbf24', '#f59e0b', '#fde68a']), core: '#fff7ed', s0: 1, s1: 0.3, dur: rnd(420, 800) }; }), 900);
    if (!(await ctx.wait(260))) return false;
    // ④ 斜斩 + 无效化印章 + 暖白闪 + 震屏（原版 playKanpoSound）
    fx.sfx('kanpo', 1); fx.shake('medium');
    pop('<i style="position:absolute;left:' + e.x + 'px;top:' + e.y + 'px;width:' + 8 * PX + 'px;height:' + 8 * PX + 'px;margin:' + (-4 * PX) + 'px 0 0 ' + (-4 * PX) + 'px;border-radius:50%;background:radial-gradient(circle,rgba(255,237,213,0.9),rgba(251,191,36,0.35) 45%,transparent 75%);mix-blend-mode:screen;"></i>',
      450, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }]);
    pop(svgAt(e.x, e.y, 3.6 * PX, '0 0 100 100', '<path d="M10,90 L90,10" stroke="#f59e0b" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M22,90 L95,17" stroke="#fff7ed" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/>', 18),
      550, [T(0.2, 1), Object.assign(T(1.15, 1), { offset: 0.35 }), T(1.4, 0)], { easing: 'ease-out' });
    pop(svgAt(e.x, e.y - 0.9 * PX, 3 * PX, '0 0 100 100', '<path d="M50,12 L58,42 L88,50 L58,58 L50,88 L42,58 L12,50 L42,42 Z" fill="#fbbf24" opacity=".9"/><path d="M42,50 L70,50 L55,65 L50,48 L62,38 Z" fill="#fff7ed" opacity=".95"/>' +
      '<path d="M24,24 L38,38 M62,62 L76,76 M24,76 L38,62 M62,38 L76,24" stroke="#fff7ed" stroke-width="3" stroke-linecap="round" opacity=".8"/>', 24), 800, [T(0.4, 0), T(1.15, 1), T(1.05, 1), T(1.35, 0)], { easing: 'ease-out' });
    floatText(fx, e.x, e.y - 2.6 * PX, '无效化', '#fde68a', '#f59e0b', { ms: 800, size: 17 });
    floatText(fx, e.x, e.y - 1.4 * PX, '技能无效化！', '#fcd34d', '#92400e', { ms: 900, size: 13, delay: 120 });
    return ctx.wait(720);
  },
};

const reactionSheshen = {
  id: 'reaction-sheshen', kind: 'reaction', grade: 'L1', fxTags: ['舍身'],
  timeline: { totalMs: 420, fullscreen: false, darken: false },
  cues: [{ key: 'sheshen_armor_step', vol: 0.34 }],
  prepareKeys() { return ['sheshen_armor_step']; },
  async play(ctx) {
    const p = ctx.placement(); if (!p) return true;
    const c = worldPx(unitCenter(p, ctx.footprint));
    ctx.fx.sfx('sheshen_armor_step', 0.34);
    ctx.fx.top(ringHtml(c.x, c.y, 88, 'rgba(56,189,248,0.9)', 'rgba(2,132,199,0.45)'), 380)
      .firstChild.animate([{ transform: 'scale(0.4)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 360, fill: 'forwards' });
    floatText(ctx.fx, c.x, c.y - 34, '🛡️ 舍身承伤', '#bae6fd', '#0c4a6e', { ms: 420, size: 13 });
    return ctx.wait(380);
  },
};

const reactionGuard = {
  id: 'reaction-guard', kind: 'reaction', grade: 'L1', fxTags: ['格挡'],
  timeline: { totalMs: 400, fullscreen: false, darken: false },
  cues: [{ key: 'shieldUp', vol: 0.30 }],
  prepareKeys() { return ['shieldUp']; },
  async play(ctx) {
    const p = ctx.placement(); if (!p) return true;
    const c = worldPx(unitCenter(p, ctx.footprint));
    ctx.fx.sfx('shieldUp', 0.30);
    ctx.fx.top(ringHtml(c.x, c.y, 84, 'rgba(167,139,250,0.85)', 'rgba(109,40,217,0.4)'), 360)
      .firstChild.animate([{ transform: 'scale(0.45)', opacity: 0.95 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 340, fill: 'forwards' });
    return ctx.wait(360);
  },
};

// ---------- D4-A 埃利奥特奥术核心（5项） ----------
// 灵风术（埃利奥特定稿，demo-bastet-conch-arsenic-vfx「A 圣洁羽翼」= 根 index.html playLingFeng 原样提取）：
// 风玫瑰罗盘阵 + 羽毛绕场蓄势 1000ms → 全屏疾风流光/旋风环/羽毛爆散 → 圣洁双翼加身；真音 windHum/crystalChime → aoe_wind_spin/dodgeWind/crystalChime。
// 规则结果（单避/单速/赋予虚形）在双翼展开拍点揭示；原版标签处理器对 arcane 特效不叠通用 buff SVG，故 quiet 揭示。
const lingFengShu = {
  id: 'ling-feng-shu', grade: 'identity', fxTags: ['灵风术'],
  prepareKeys: () => ['windHum', 'crystalChime', 'aoe_wind_spin_fs772867', 'dodgeWind'],
  async play(ctx) {
    const { av, result, audioContext, casterEnt } = ctx, CHARGE = 1000;
    const handle = av.CombatAudioMixer.withContext(audioContext, () => av.playLingFeng(casterEnt));
    ctx.after(CHARGE + 350, () => {
      (result.effects || []).forEach(e => ctx.revealEffect(e, true));
      const c = worldPx(ctx.centerOf(ctx.casterId));
      floatText(ctx.fx, c.x, c.y - 44, '🕊️ 灵风 · 疾行', '#a7f3d0', '#065f46', { ms: 900, size: 13 });
    });
    return ctx.awaitHandle(handle, CHARGE + 2200);
  },
};

// 【肃正】结界在条目爆发拍点展开（真实 barrier-created 事件；导演按 eventId 去重，条目后统一揭示时不重复）
function revealBarriers(ctx) {
  for (const ev of ctx.result.events || []) if (ev.type === 'barrier-created') ctx.revealRule(ev, 'barrier-created');
}

const nakTithBarrier = {
  id: 'nak-tith-barrier', grade: 'L3', fxTags: ['纳克提特障壁术'],
  timeline: { chargeMs: 820, totalMs: 2100, fullscreen: true, darken: false },
  cues: [{ key: 'herochargedone', vol: 0.62 }, { key: 'shieldUp', vol: 0.56 }],
  prepareKeys() { return ['herochargedone', 'shieldUp']; },
  async play(ctx) {
    const { fx, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), R = (result.query?.shape?.radius || 3) * PX;
    fx.sfx('shieldUp', 0.56);
    const rune = fx.ground(runeHtml(fx.uid(), c.x, c.y, 2.4 * PX, '#f59e0b', '#fef3c7', 'ᛒᛖᚱᚲᚨᚾᛟ'), 1500);
    grow(rune.firstChild, { ms: 1500, s0: 0.2, s1: 1, hold: 0.75, s2: 1.1 });
    spin(rune.querySelector('[data-fx=spin]'), 160, 1500);
    if (!(await ctx.wait(820))) return false;
    fx.sfx('herochargedone', 0.62); fx.shake('medium');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    revealBarriers(ctx);
    fx.top(ringHtml(c.x, c.y, R * 2, 'rgba(253,230,138,0.85)', 'rgba(217,119,6,0.4)'), 680)
      .firstChild.animate([{ transform: 'scale(0.15)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 640, fill: 'forwards' });
    return ctx.wait(1220);
  },
};

// ---------- 回合制原版秘术 / 奇物演出接入（vendor 原样提取函数；战棋只传真实目标，按原版拍点揭示规则结果） ----------
// 原版函数自带暗场、全屏层、震屏与合成音色，故按 identity 级接入（不叠通用屏幕氛围/运镜），与灵风术同口径。
const stagePt = p => ({ x: p.x * PX / FX_SCALE, y: p.y * PX / FX_SCALE });   // 世界米 → 视听底座舞台坐标
const effectIds = (ctx, accept = () => true) => [...new Set((ctx.result.effects || []).filter(accept).map(e => e.targetId))];
const revealEffectsOf = (ctx, id) => (ctx.result.effects || []).filter(e => e.targetId === id).forEach(e => ctx.revealEffect(e, true));
const dispelledIds = ctx => effectIds(ctx, e => e.kind === 'dispel' && e.removed && e.removed.length);
function arcaneRun(ctx, fn) { return ctx.av.CombatAudioMixer.withContext(ctx.audioContext, fn); }

// 伊西丝之拥（原版 playIsis）：金翼日轮蓄势 1100ms → 双翼合抱 + 翡翠光雨；受益者自释放后 260ms 起按原版 200ms 错峰闪绿并揭示回复，
// 真实驱散（removed>0）在同拍追加原版驱散尾韵
const isisEmbrace = {
  id: 'isis-embrace', grade: 'identity', fxTags: ['伊西丝之拥', '伊西斯之拥'],
  prepareKeys: () => [],
  async play(ctx) {
    const CHARGE = 1100, ids = effectIds(ctx), dispelled = new Set(dispelledIds(ctx));
    const handle = arcaneRun(ctx, () => ctx.av.playIsis(ctx.casterEnt, ids.map(ctx.ent).filter(Boolean)));
    ids.forEach((id, i) => ctx.after(CHARGE + 260 + i * 200, () => {
      revealEffectsOf(ctx, id);
      if (dispelled.has(id) && handle && handle.dispel) handle.dispel(ctx.avHost.host.spriteOf(id));
    }));
    return ctx.awaitHandle(handle, CHARGE + 2000);
  },
};

const wizardShield = {
  id: 'wizard-shield', kind: 'reaction', grade: 'L1', fxTags: ['巫师护盾'],
  timeline: { totalMs: 460, fullscreen: false, darken: false },
  cues: [{ key: 'shieldUp', vol: 0.34 }],
  prepareKeys() { return ['shieldUp']; },
  async play(ctx) {
    const p = ctx.placement(); if (!p) return true;
    const c = worldPx(unitCenter(p, ctx.footprint)), crit = !!ctx.reaction?.crit;
    ctx.fx.sfx('shieldUp', 0.34);
    ctx.fx.top(ringHtml(c.x, c.y, 92, crit ? 'rgba(253,224,71,0.95)' : 'rgba(96,165,250,0.9)', 'rgba(139,92,246,0.45)'), 420)
      .firstChild.animate([{ transform: 'scale(0.35)', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 400, fill: 'forwards' });
    floatText(ctx.fx, c.x, c.y - 36, crit ? '💥 巫师护盾×2!' : '🛡️ 巫师护盾', crit ? '#fef08a' : '#bfdbfe', '#1e3a8a', { ms: 440, size: 13 });
    return ctx.wait(420);
  },
};

// 飞沙化甲（原版 playFeiShaHuaJia）：玄武岩瓶启封尘沙 → 瓶雾飞向受益者 → 280ms 哥特盾框 + 冥河铠影（abyss 原采样）→ 660ms 再动流光；
// 增防/瞄准在盾框成形拍点揭示
const sandArmor = {
  id: 'sand-armor', grade: 'identity', fxTags: ['飞沙化甲'],
  prepareKeys: () => ['mx_sand_swish', 'mx_stygian_whoosh', 'mx_sword_metal', 'defUp', 'mx_gear_lock', 'shieldUp'],
  async play(ctx) {
    const ids = effectIds(ctx), first = ids.find(id => id !== ctx.casterId) || ids[0];
    const handle = arcaneRun(ctx, () => ctx.av.playFeiShaHuaJia(ctx.casterEnt, first ? [ctx.ent(first)] : []));
    ctx.after(280, () => ids.forEach(id => revealEffectsOf(ctx, id)));
    return ctx.awaitHandle(handle, 1320);
  },
};

// ---------- D4-B 弗兰克 / 玛德琳枪械与近战重击（5项 + 克虏伯起手） ----------
// 近战重击（移植回合制 spawnMeleeHeavyParticles，弗兰克【重击推撞】）：蓄力下压 → 沿直线冲撞（冲锋路径真值，逐接触步结算）→
// 每次命中：破防音 parry_heavy + 80ms 后 hitDown，原版重震屏、金色平闪、盾击推撞爆发（新月波沿冲撞方向）、目标推撞踉跄 + 眩晕星环；落空只擦出火星
const meleeHeavy = {
  id: 'melee-heavy', grade: 'L2', fxTags: ['近战重击'],
  timeline: { totalMs: 1100, fullscreen: false, darken: false },
  cues: [{ key: 'parry_heavy', vol: 0.72 }, { key: 'hitDown', vol: 0.6 }],
  prepareKeys() { return ['parry_heavy', 'hitDown', 'swish_3']; },
  async play(ctx) {
    const { fx, hits, result, charge } = ctx;
    const from = charge ? unitCenter(charge.from, charge.footprint) : ctx.centerOf(ctx.casterId);
    const toM = charge ? unitCenter(charge.path.at(-1), charge.footprint) : (hits[0] ? ctx.centerOf(hits[0].targetId) : result.aim);
    const c = worldPx(from), e = worldPx(toM), ang = Math.atan2(e.y - c.y, e.x - c.x) || 0, ux = Math.cos(ang), uy = Math.sin(ang);
    const strike = (p, list) => {
      const landed = list.filter(t => t.hit);
      if (!landed.length) { spray(fx, p, 6, { kind: 'spark', ang: ang + Math.PI, spread: 2.4, dist: [16, 46], size: [2, 3], ms: [220, 320] }); return; }
      fx.sfx('parry_heavy', 0.72); subBass(ctx, MELEE_SUB_BASS); ctx.after(80, () => fx.sfx('hitDown', 0.6));
      heavyShake(ctx, MELEE_HEAVY_SHAKE, 440);
      screenFlash(fx, 'rgba(251,191,36,0.9)', 0.22, 300);
      meleeHeavyBurst(fx, p, ang);
      landed.forEach(t => heavyFlinch(ctx, t.id, RAM_FLINCH, ang));
    };
    // ① 蓄力：重心后压 + 脚下尘环
    const me = ctx.sandbox.getUnitView().nodes.get(ctx.casterId)?.sprite;
    me?.animate([{ translate: '0 0', scale: '1' }, { translate: (-ux * 6).toFixed(1) + 'px ' + (-uy * 6).toFixed(1) + 'px', scale: '0.9 1.06', offset: 0.8 }, { translate: '0 0', scale: '1' }], { duration: 240, easing: 'ease-in' });
    fx.ground(ringHtml(c.x, c.y, 1.6 * PX, 'rgba(251,191,36,0.55)', 'rgba(120,53,15,0.25)'), 300).firstChild
      .animate([{ transform: 'scale(1.3)', opacity: 0 }, { transform: 'scale(.6)', opacity: 0.9 }], { duration: 240, fill: 'forwards' });
    if (!(await ctx.wait(220))) return false;
    fx.sfx('swish_3', 0.5);
    if (!charge) {
      const t = hits[0] ? worldPx(ctx.centerOf(hits[0].targetId)) : e;
      strike(t, hits.map(h => ({ id: h.targetId, hit: h.hit })));
      hits.forEach(h => ctx.reveal(h.targetId));
      return ctx.wait(860);
    }
    // ② 冲撞：沿路径扬尘；接触步 = 规则结算的 chargeStep，爆点取弗兰克当时的前沿
    particles(fx, Array.from({ length: 18 }, () => ({ x: c.x + rnd(-14, 14), y: c.y + rnd(-14, 14), dx: (e.x - c.x) * rnd(0.3, 0.8) + rnd(-16, 16), dy: (e.y - c.y) * rnd(0.3, 0.8) + rnd(-16, 16), size: rnd(12, 22), color: 'rgba(214,190,150,.55)', core: 'rgba(255,247,237,.6)', s0: 0.6, s1: 1.4, dur: rnd(380, 560) })), 600, 'ground');
    const byStep = new Map();
    hits.forEach(h => (h.segments || [h]).forEach(sg => { if (sg.chargeStep == null) return; if (!byStep.has(sg.chargeStep)) byStep.set(sg.chargeStep, []); byStep.get(sg.chargeStep).push({ id: h.targetId, hit: sg.hit }); }));
    const onContact = step => {
      const at = charge.path[Math.min(step, charge.path.length - 1)], m = unitCenter(at, charge.footprint);
      strike(worldPx({ x: m.x + ux * 0.7, y: m.y + uy * 0.7 }), byStep.get(step) || []);
    };
    const [ok, finished] = await Promise.all([ctx.playCharge(onContact), ctx.wait(860)]);
    return ok && finished;
  },
};

// 独头弹 L2（弗兰克【独头二连发】，12 号独头重弹）：每发 = 宽口枪焰 + 硝烟环 + 粗短炽白弹头（拖热浪尾迹）直射 →
// 命中：盘状冲击波（垂直弹道压扁）+ 破甲碎片向后崩飞 + 甲面裂纹贴花（降防）+ 血雾 + 重后仰 + 低频；闪避：擦过目标在其身后掀起尘土。
// 两发之间泵动上膛（红壳抛出 + 上膛声），第二发更重；每发按全局发序逐段揭示，中间等反应收尾
const SLUG_TINT = ['linear-gradient(90deg,rgba(234,88,12,0),rgba(249,115,22,.85) 45%,#fed7aa 82%,#fff)', '#f97316'];
function slugImpact(fx, p, ang, heavy) {
  const r = deg(ang + Math.PI / 2).toFixed(1), D = (heavy ? 2.1 : 1.7) * PX;
  // 盘状冲击：沿弹道法向压扁的椭圆双环
  const l = fx.top('<div style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:0;height:0;transform:rotate(' + r + 'deg);">' +
    ringHtml(0, 0, D, 'rgba(254,215,170,.95)', 'rgba(234,88,12,.6)') + ringHtml(0, 0, D * 0.7, 'rgba(255,255,255,.8)', 'rgba(251,146,60,.5)') + '</div>', 520).firstChild;
  [...l.children].forEach((el, i) => el.animate([{ transform: 'scale(.2,.08)', opacity: 1 }, { transform: 'scale(1.3,.5)', opacity: 0.85, offset: 0.4 }, { transform: 'scale(2,.7)', opacity: 0 }],
    { duration: 420 - i * 60, delay: i * 40, easing: 'cubic-bezier(0.1,0.8,0.2,1)', fill: 'both' }));
  // 炽白爆心
  fx.top(orbHtml(p.x, p.y, D * 0.8, 'rgba(251,146,60,.7)', 'rgba(255,255,255,.98)'), 260).firstChild
    .animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0.9, offset: 0.3 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 240, fill: 'forwards' });
  // 破甲碎片：灰铁片沿弹道方向崩飞
  spray(fx, p, heavy ? 10 : 7, { kind: 'spark', ang, spread: 1.3, dist: [30, 96], size: [2.5, 4], ms: [280, 460], colors: ['#e2e8f0', '#94a3b8', '#fde68a'] });
}
// 甲面裂纹（降防）：暗橙裂纹放射，停留后淡出
function armorCrack(fx, p, ang) {
  const uid = fx.uid(), D = 1.3 * PX, rays = Array.from({ length: 7 }, (_, i) => {
    const a = i / 7 * TAU + rnd(-0.25, 0.25), L1 = rnd(0.22, 0.32), L2 = rnd(0.38, 0.5), b = a + rnd(-0.4, 0.4);
    return 'M50,50 L' + (50 + Math.cos(a) * L1 * 100).toFixed(1) + ',' + (50 + Math.sin(a) * L1 * 100).toFixed(1) + ' L' + (50 + Math.cos(b) * L2 * 100).toFixed(1) + ',' + (50 + Math.sin(b) * L2 * 100).toFixed(1);
  }).join(' ');
  fx.top('<svg viewBox="0 0 100 100" width="' + D + '" height="' + D + '" style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;margin:' + (-D / 2) + 'px 0 0 ' + (-D / 2) + 'px;overflow:visible;filter:drop-shadow(0 0 4px #ea580c);">' +
    '<path id="ck' + uid + '" d="' + rays + '" stroke="#fdba74" stroke-width="2.6" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>', 820).firstChild.firstChild
    .animate([{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.25 }, { strokeDashoffset: 0, opacity: 0.9, offset: 0.7 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 800, easing: 'ease-out', fill: 'forwards' });
}
const slugShot = {
  id: 'slug-shot', grade: 'L2', fxTags: ['独头弹'], reuseAudio: true,
  timeline: { totalMs: 1150, fullscreen: false, darken: false },
  cues: [{ key: 'xiandan', vol: 0.75 }, { key: 'hitDown', vol: 0.6 }, { key: 'mx_gear_lock', vol: 0.5 }],
  prepareKeys() { return ['xiandan', 'hitDown', 'mx_gear_lock']; },
  async play(ctx) {
    const { fx } = ctx, FLY = 90, PUMP = 380;
    const shots = attackShots(ctx);
    for (const [i, shot] of shots.entries()) {
      const heavy = i === shots.length - 1 && shots.length > 1;
      if (i) {
        // 泵动上膛：上膛声 + 红壳抛出 + 出手者微后撤
        const c0 = worldPx(ctx.centerOf(ctx.casterId));
        fx.sfx('mx_gear_lock', 0.5);
        shellCasing(fx, c0, Math.atan2((shot.aim?.y ?? 0) * PX - c0.y, (shot.aim?.x ?? 0) * PX - c0.x));
        if (!(await ctx.wait(PUMP))) return false;
      }
      const impact = shot.impacts[0] || null;
      const cm = ctx.centerOf(ctx.casterId), tm = impact ? ctx.centerOf(impact.targetId) : shot.aim;
      const c = worldPx(cm), t = worldPx(tm), ang = Math.atan2(t.y - c.y, t.x - c.x), ux = Math.cos(ang), uy = Math.sin(ang);
      const m = { x: c.x + ux * 22, y: c.y + uy * 22 }, hit = !!impact?.hit;
      const end = hit ? t : { x: t.x + ux * 70, y: t.y + uy * 70 };
      // 出膛
      fx.sfx('xiandan', heavy ? 0.75 : 0.68); fx.shake(heavy ? 'heavy' : 'medium');
      gunFlash(fx, m, ang, { size: heavy ? 58 : 50, ms: 190 });
      smokeRing(fx, m, ang, 1.4 * PX);
      jolt(ctx, ctx.casterId, { amp: heavy ? 6 : 5, ms: 55, glow: '#fb923c' });
      tracer(fx, m, end, { width: 7, ms: FLY, len: 46, tint: SLUG_TINT });
      tracer(fx, m, end, { width: 13, ms: FLY + 40, len: 110, tint: ['linear-gradient(90deg,rgba(254,215,170,0),rgba(254,215,170,.22) 60%,rgba(255,237,213,.35))', 'rgba(251,146,60,.35)'] });
      if (!(await ctx.wait(FLY))) return false;
      // 命中 / 落空
      shot.impacts.forEach(p => ctx.revealSegment(p.targetId, p.index));
      if (hit) {
        fx.sfx('hitDown', heavy ? 0.6 : 0.52); subBass(ctx, { type: 'sine', f0: 120, f1: 34, gain: heavy ? 0.6 : 0.45, ms: 260 });
        slugImpact(fx, t, ang, heavy);
        armorCrack(fx, t, ang);
        spray(fx, t, heavy ? 14 : 10, { kind: 'gore', ang, spread: 1.2, dist: [24, 92], size: [3, 7] });
        heavyFlinch(ctx, impact.targetId, RECOIL_FLINCH, ang);
        if (heavy) heavyShake(ctx, RANGED_HEAVY_SHAKE, 360);
      } else {
        particles(fx, Array.from({ length: 10 }, () => ({ x: end.x + rnd(-8, 8), y: end.y + rnd(-8, 8), dx: ux * rnd(10, 40) + rnd(-20, 20), dy: uy * rnd(10, 40) - rnd(6, 26), size: rnd(10, 18), color: 'rgba(168,162,158,.5)', core: 'rgba(231,229,228,.55)', s0: 0.5, s1: 1.5, dur: rnd(380, 560) })), 600, 'ground');
        spray(fx, end, 5, { kind: 'spark', ang: ang + Math.PI, spread: 2.4, dist: [14, 40], size: [2, 3], ms: [200, 300] });
      }
      if (ctx.awaitShotFeedback && !(await ctx.awaitShotFeedback())) return false;
    }
    ctx.hits.forEach(h => ctx.reveal(h.targetId));
    return ctx.wait(420);
  },
};

// 远程重击（弗兰克【皇家猎象枪】，移植回合制 spawnRangedHeavyParticles）：枪口红光快速聚能 → shot01 击发 + 重枪口焰 + 后坐，
// 粗红色弹道直射目标 → 命中拍 hitDown + 低频冲击 + 白闪 + 原版双管重爆、原版重震屏、屏幕血花（无论命中/闪避都溅，闪避在目标身后炸开）+ 目标后仰
const rangedHeavy = {
  id: 'ranged-heavy', grade: 'L2', fxTags: ['远程重击'], reuseAudio: true,
  timeline: { totalMs: 980, fullscreen: false, darken: false },
  cues: [{ key: 'herocharge', vol: 0.4 }, { key: 'shot', vol: 0.8 }, { key: 'hitDown', vol: 0.75 }],
  prepareKeys() { return ['herocharge', 'shot', 'hitDown']; },
  async play(ctx) {
    const { fx, hits, result } = ctx;
    const CHARGE = 260, FLY = 110;
    const cm = ctx.centerOf(ctx.casterId), tm = hits[0] ? ctx.centerOf(hits[0].targetId) : result.aim;
    const c = worldPx(cm), t = worldPx(tm), ang = Math.atan2(t.y - c.y, t.x - c.x), ux = Math.cos(ang), uy = Math.sin(ang);
    const m = { x: c.x + ux * 24, y: c.y + uy * 24 }, landed = hits.filter(h => h.hit);
    const ip = landed.length ? t : { x: t.x + ux * 45, y: t.y + uy * 45 };
    // ① 快速蓄力：枪口红光收束 + 火星吸入
    fx.sfx('herocharge', 0.4);
    fx.top(orbHtml(m.x, m.y, 0.9 * PX, 'rgba(220,38,38,0.6)', 'rgba(254,226,226,0.95)'), CHARGE + 40).firstChild
      .animate([{ transform: 'scale(.3)', opacity: 0.4 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.75 }, { transform: 'scale(.7)', opacity: 0.9 }], { duration: CHARGE, fill: 'forwards' });
    particles(fx, Array.from({ length: 10 }, () => { const a = rnd(0, TAU), r = rnd(34, 56); return { x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r, dx: -Math.cos(a) * r, dy: -Math.sin(a) * r, size: rnd(4, 7), color: '#f87171', core: '#fee2e2', s0: 1, s1: 0.4, dur: rnd(180, CHARGE), ease: 'ease-in' }; }), CHARGE);
    if (!(await ctx.wait(CHARGE))) return false;
    // ② 击发：重枪口焰 + 后坐 + 粗红色弹道
    fx.sfx('shot', 0.8); fx.shake('heavy');
    gunFlash(fx, m, ang, { size: 52, ms: 200 });
    jolt(ctx, ctx.casterId, { amp: 5, ms: 55, glow: '#ef4444' });
    tracer(fx, m, ip, { width: 9, ms: FLY, len: 150, tint: TRACER_RED });
    if (!(await ctx.wait(FLY))) return false;
    // ③ 命中拍：原版双管重爆 + 白闪 + 重震屏 + 屏幕血花 + 后仰
    hits.forEach(h => ctx.reveal(h.targetId));
    fx.sfx('hitDown', 0.75); subBass(ctx, RANGED_SUB_BASS);
    screenFlash(fx, '#fff', 0.45, 300);
    rangedHeavyBurst(fx, ip);
    heavyShake(ctx, RANGED_HEAVY_SHAKE, 480);
    screenBlood(fx, 1400, { pos: RANGED_SPLAT_POS, drips: RANGED_SPLAT_DRIPS, each: 1150 });
    landed.forEach(h => heavyFlinch(ctx, h.targetId, RECOIL_FLINCH, ang));
    if (landed.length) spray(fx, t, 14, { kind: 'gore', ang, spread: 1.4, dist: [24, 96], size: [3, 7] });
    return ctx.wait(560);
  },
};

// 枪击穿透（移植回合制 gunshot_pierce）：枪口青光聚能 → 击发：重枪口焰 + 抛壳后坐 + 超音速青色贯穿光束
// → 命中：菱形弱点准星与伤害同帧锁定 + 双圈激波星芒 + 背部破片锥 + 出口血雾喷溅 + 受击硬直 + 重震（L2 预算内，不用暗场/全屏）
const gunshotPierce = {
  id: 'gunshot-pierce', grade: 'L2', fxTags: ['枪击穿透'], reuseAudio: true,
  timeline: { totalMs: 1160, fullscreen: false, darken: false },
  cues: [{ key: 'gunshot_pierce', vol: 0.75 }],
  prepareKeys() { return ['gunshot_pierce']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), t = worldPx(hits[0] ? ctx.centerOf(hits[0].targetId) : result.aim);
    const dx = t.x - c.x, dy = t.y - c.y, len = Math.max(1, Math.hypot(dx, dy)), ux = dx / len, uy = dy / len, ang = Math.atan2(dy, dx);
    const landed = hits.filter(h => h.hit);
    const m = { x: c.x + ux * 22, y: c.y + uy * 22 }, over = { x: t.x + ux * 150, y: t.y + uy * 150 };
    fx.top(orbHtml(m.x, m.y, 34, 'rgba(56,189,248,0.85)', '#f0f9ff'), 320).firstChild
      .animate([{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(.55)', opacity: 1, offset: 0.85 }, { transform: 'scale(.3)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
    particles(fx, Array.from({ length: 10 }, () => { const a = rnd(0, TAU), d = rnd(26, 46); return { x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d, size: rnd(4, 7), color: '#7dd3fc', core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(220, 290) }; }), 320);
    if (!(await ctx.wait(300))) return false;
    fx.sfx('gunshot_pierce', 0.75); fx.shake('heavy');
    gunFlash(fx, m, ang, { size: 48, ms: 210 });
    casing(fx, c, ang);
    jolt(ctx, ctx.casterId, { amp: 4, ms: 60, glow: '#38bdf8' });
    pierceBeam(fx, m, over, { width: 14, ms: 420 });
    tracer(fx, m, over, { width: 5, ms: 120, len: 120, sky: true });
    ctx.after(70, () => {
      hits.forEach(h => ctx.reveal(h.targetId));
      pierceLock(fx, t, 2.6 * PX, 520, { snap: true });
      gunImpact(fx, t, { size: 96, sky: true, ms: 480 });
      spray(fx, t, 10, { kind: 'spark', ang, spread: 0.8, dist: [40, 130], size: [2.5, 4], ms: [260, 420], colors: ['#e0f2fe', '#7dd3fc', '#ffffff'] });
      if (!landed.length) return;
      fx.shake('quake');
      spray(fx, t, 14, { kind: 'gore', ang, spread: 0.9, dist: [30, 115], size: [3, 7.5] });
      landed.forEach(h => jolt(ctx, h.targetId, { amp: 7, ms: 60, times: 2, glow: '#38bdf8' }));
    });
    return ctx.wait(860);
  },
};

// 连续扫射（移植回合制 startStrafeBurst，2600ms = 52 发 × 50ms 对齐原版）：双枪左右交替超密连发，扇形往返扫过全部目标；
// 每发：枪口焰 + 曳光 + 抛壳 + 跳弹火星 + 血雾，偶数发副枪交叉射向相邻目标；施法者后坐 / 目标弹雨硬直 / 持续后坐震屏；全程屏幕血块覆盖。
// 运镜：遮幅入场 + 推近玛德琳（偏向射向）→（时停 ATTACK_STOP_MS）→ 拉开框住全部目标并随扫射摆镜 → 末击（顿帧 ATTACK_HIT_MS）急推 + 白闪 → 回位
const strafeBurst = {
  id: 'strafe-burst', grade: 'L3', fxTags: ['连续扫射'], cine: false,
  timeline: { chargeMs: 800, totalMs: 3830, fullscreen: true, darken: false },   // 800 蓄势 + 2600 扫射 + 60 + 360 回位（攻击类时停/顿帧为 0）
  cues: [{ key: 'aoe_gun_burst_fs482122', vol: 0.68 }],
  prepareKeys() { return ['aoe_gun_burst_fs482122', 'gunshot1', 'gunshot2', 'gunshot3']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, sb = ctx.sandbox;
    const CHARGE_MS = 800, STOP_MS = ATTACK_STOP_MS, TICK = 50, N = 52, FIRE_MS = N * TICK, HIT_MS = ATTACK_HIT_MS, BACK_MS = 360;
    const cm = ctx.centerOf(ctx.casterId), am = result.aim, c = worldPx(cm), a = worldPx(am);
    const baseAng = Math.atan2(a.y - c.y, a.x - c.x);
    const home = sb.getPose();
    const targets = hits.map(h => { const m = ctx.centerOf(h.targetId); return { id: h.targetId, hit: h.hit, m, p: worldPx(m) }; });

    // ① 蓄势：遮幅入场，镜头推近出手者并略偏射向；脚下火环 + 出手者金色辉光
    letterbox(fx, CHARGE_MS + STOP_MS + FIRE_MS + 60 + HIT_MS + BACK_MS);
    const Z = k => zoomAt(home.scale, k);   // 绝对设计缩放 → 收敛后缩放
    sb.cameraTo(sb.poseAt(cm.x + Math.cos(baseAng) * 1.2, cm.y + Math.sin(baseAng) * 1.2, Z(home.scale * 1.6)), 720);
    const rune = fx.ground(ringHtml(c.x, c.y, 1.8 * PX, 'rgba(251,146,60,0.55)', 'transparent'), CHARGE_MS + 50);
    rune.firstChild.animate([{ transform: 'scale(0.5)', opacity: 0.3 }, { transform: 'scale(1.1)', opacity: 0.9 }], { duration: CHARGE_MS, fill: 'forwards' });
    sb.getUnitView().nodes.get(ctx.casterId)?.sprite.animate([{ filter: 'none' }, { filter: 'brightness(1.35) drop-shadow(0 0 14px #fbbf24)' }], { duration: CHARGE_MS, easing: 'ease-in' });
    if (!(await ctx.wait(CHARGE_MS))) return false;

    // ② 时停：整场定格去色，以出手者为焦点放射速度线 + 白闪
    if (!(await holdOr(ctx.hold, STOP_MS, () => { if (STOP_MS > 0) timeStop(sb, fx, STOP_MS, cm); }))) return false;

    // ③ 开火：镜头拉开框住出手者与全部目标，随扫射主目标缓摆；持续高频后坐震屏
    fx.sfx('aoe_gun_burst_fs482122', 0.68); fx.shake('heavy');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    screenBlood(fx, 2750);
    const pts = [cm, ...(targets.length ? targets.map(t => t.m) : [am])];
    const C = { x: (Math.min(...pts.map(p => p.x)) + Math.max(...pts.map(p => p.x))) / 2, y: (Math.min(...pts.map(p => p.y)) + Math.max(...pts.map(p => p.y))) / 2 };
    const S = Math.min(sb.poseFrame(pts, { pad: 2.4, tight: 1.08 }).scale, home.scale * 1.5);
    sb.cameraTo(sb.poseAt(C.x, C.y, Z(S)), 260);
    const rumble = sb.getDom().shake.animate([{ transform: 'translate3d(-4px,3px,0)' }, { transform: 'translate3d(4px,-3px,0)' }, { transform: 'translate3d(-3px,-4px,0)' }],
      { duration: 120, iterations: Math.ceil((FIRE_MS + 60) / 120), direction: 'alternate' });
    const fwd = { x: Math.cos(baseAng) * 18, y: Math.sin(baseAng) * 18 }, side = { x: -Math.sin(baseAng) * 13, y: Math.cos(baseAng) * 13 };
    const guns = [{ x: c.x + fwd.x + side.x, y: c.y + fwd.y + side.y }, { x: c.x + fwd.x - side.x, y: c.y + fwd.y - side.y }];
    const order = targets.map((_, i) => i), sweep = targets.length > 2 ? [...order, ...order.slice(1, -1).reverse()] : order;
    const rg = ctx.skill?.range || {}, reach = (rg.length || rg.castRange || 8) * PX, half = (rg.angle || 90) / 2 * Math.PI / 180;
    const [mainSp, mainGo, altSp, altGo] = targets.length >= 7 ? [5, 3, 2, 1] : targets.length >= 4 ? [6, 4, 3, 2] : [7, 6, 4, 3];
    const shown = new Set();
    const show = id => { if (shown.has(id)) return; shown.add(id); ctx.reveal(id); };
    // 单发：命中目标溅血 + 硬直，闪避则子弹擦过目标后方落空只溅火星；无目标时沿扇面往返扫射
    const shoot = (g, tg, sp, go, k) => {
      let end;
      if (tg) end = tg.hit ? { x: tg.p.x + rnd(-14, 14), y: tg.p.y + rnd(-14, 14) } : { x: tg.p.x + (tg.p.x - g.x) * 0.35 + rnd(-30, 30), y: tg.p.y + (tg.p.y - g.y) * 0.35 + rnd(-30, 30) };
      else { const an = baseAng + Math.sin(k / N * Math.PI * 3) * half * 0.9 + rnd(-0.06, 0.06), d = reach * rnd(0.7, 1); end = { x: c.x + Math.cos(an) * d, y: c.y + Math.sin(an) * d }; }
      const ang = Math.atan2(end.y - g.y, end.x - g.x);
      tracer(fx, g, end, { width: 3.2, ms: 110, len: 60 });
      ctx.after(100, () => {
        spray(fx, end, tg && tg.hit ? sp : 3, { kind: 'spark', ang: ang + Math.PI, spread: 2.6, dist: [18, 60], size: [2, 3.2], ms: [260, 420] });
        if (tg && tg.hit) { spray(fx, end, go, { kind: 'gore', ang, spread: 2.2, dist: [14, 58], size: [2.5, 6] }); if (k % 2 === 0) jolt(ctx, tg.id, { amp: 3, ms: 35 }); }
        if (tg) show(tg.id);
      });
      return ang;
    };
    for (let k = 0; k < N; k++) ctx.after(k * TICK, () => {
      const gi = k % 2, g = guns[gi], tg = targets.length ? targets[sweep[k % sweep.length]] : null;
      gunFlash(fx, g, shoot(g, tg, mainSp, mainGo, k), { size: 26, ms: 100, smoke: k % 3 === 0 });
      if (k % 2 === 0) casing(fx, g, baseAng, gi ? -1 : 1);
      // 偶数发双枪交叉：副枪射向相邻目标（7 敌以上每 4 发一次降峰值）
      if (targets.length > 1 && k % 2 === 0 && (targets.length < 7 || k % 4 === 0)) {
        const g2 = guns[1 - gi], alt = targets[(sweep[k % sweep.length] + 1) % targets.length];
        gunFlash(fx, g2, shoot(g2, alt, altSp, altGo, k), { size: 22, ms: 90, smoke: false });
      }
      if (k % 2 === 0) fx.sfx(pick(['gunshot1', 'gunshot2', 'gunshot3']), 0.42);
      if (k % 2 === 1) jolt(ctx, ctx.casterId, { amp: 2.5, ms: 30, glow: '#fbbf24' });
      // 摆镜：每 0.5s 把镜头中心向当前主目标偏 18%
      if (tg && k >= 8 && k % 10 === 0) sb.cameraTo(sb.poseAt(C.x + (tg.m.x - C.x) * 0.18, C.y + (tg.m.y - C.y) * 0.18, Z(S)), 460);
    });
    ctx.after(FIRE_MS, () => hits.forEach(h => show(h.targetId)));
    if (!(await ctx.wait(FIRE_MS + 60))) { rumble.cancel(); return false; }

    // ④ 末击顿帧：整场冻结，镜头急推最后一发命中的目标 + 白闪
    const last = targets[sweep[(N - 1) % Math.max(1, sweep.length)]];
    const fm = last ? last.m : am;
    if (!(await holdOr(ctx.hold, HIT_MS, () => { sb.cameraTo(sb.poseAt(C.x + (fm.x - C.x) * 0.4, C.y + (fm.y - C.y) * 0.4, Z(S * 1.12)), 40); hitFlash(fx, fm); }))) { rumble.cancel(); return false; }
    rumble.cancel();
    fx.shake('quake');
    if (last && last.hit) spray(fx, last.p, 16, { kind: 'gore', ang: Math.atan2(last.p.y - c.y, last.p.x - c.x), spread: 1.6, dist: [30, 110], size: [3, 7.5] });

    // ⑤ 回位：镜头缓回出手前构图，遮幅同步滑出
    sb.cameraTo(home, BACK_MS);
    return ctx.wait(BACK_MS);
  },
};

const kruppSnipe = {
  id: 'krupp-snipe', grade: 'L4', fxTags: ['克虏伯重狙'], cine: false,
  timeline: { chargeMs: 1220, totalMs: 3400, fullscreen: true, darken: true },   // 1220 瞄准 + 2100 原版视频全段 + 收尾
  cues: [{ key: 'gunshot_pierce', vol: 0.72 }, { key: 'explosion_aoe_blast', vol: 0.62 }],
  prepareKeys() { return ['gunshot_pierce', 'explosion_aoe_blast']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), t = worldPx(hits[0] ? ctx.centerOf(hits[0].targetId) : result.aim);
    worldDarken(fx, t, { holeR: 68, inMs: 420, holdMs: 1900, outMs: 650, peak: 0.85 });
    trail(fx, c, { x: (c.x + t.x) / 2, y: (c.y + t.y) / 2 }, t, { color: '#ef4444', width: 2, ms: 1180 });
    if (!(await ctx.wait(1220))) return false;
    fx.sfx('gunshot_pierce', 0.72); fx.sfx('explosion_aoe_blast', 0.62); fx.shake('quake');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    const shot = webm(ctx, 'snipe-ezremove.mp4', t.x, t.y, Math.max(screenSpanPx(ctx, 1.5), screenCoverPx(ctx, 0.5, 16 / 9)), { ms: 2600 });
    trail(fx, c, { x: (c.x + t.x) / 2, y: (c.y + t.y) / 2 }, t, { color: '#fef08a', width: 9, ms: 260 });
    ctx.after(60, () => hits.forEach(h => ctx.reveal(h.targetId)));
    return ctx.awaitHandle(shot.handle, 1850);
  },
};

const kruppAim = {
  id: 'krupp-aim', kind: 'prepare', grade: 'L2', fxTags: ['克虏伯重狙'],
  timeline: { totalMs: 900, fullscreen: false, darken: false },
  cues: [{ key: 'herocharge', vol: 0.52 }],
  prepareKeys() { return ['herocharge']; },
  async play(ctx) {
    const c = worldPx(ctx.centerOf(ctx.casterId));
    ctx.fx.sfx('herocharge', 0.52);
    floatText(ctx.fx, c.x, c.y - 38, '🎯 架枪瞄准', '#fca5a5', '#7f1d1d', { ms: 850, size: 13 });
    return ctx.wait(860);
  },
};

// ---------- D4-C 奇物与音叉（原版 playHarmonyShelter / playSilenceDomain / playShatterResonance）+ 塞赫美特等混合 WebM ----------
// 谐律之庇：暗铁三联音叉悬于受益者上方嗡鸣 → 900ms 青银涟漪 WebM + 逐人脚下光环；驱散在涟漪拍点揭示并追加原版铃音尾韵
const harmonyWard = {
  id: 'harmony-ward', grade: 'identity', fxTags: ['谐律之庇'],
  prepareKeys: () => ['forkHum', 'bowlClear', 'bellPing'],
  async play(ctx) {
    const ids = effectIds(ctx), dispelled = new Set(dispelledIds(ctx));
    const handle = arcaneRun(ctx, () => ctx.av.playHarmonyShelter(ctx.casterEnt, ids.map(ctx.ent).filter(Boolean)));
    ids.forEach((id, i) => ctx.after(900 + i * 45, () => {
      revealEffectsOf(ctx, id);
      if (dispelled.has(id) && handle && handle.dispel) handle.dispel(ctx.avHost.host.spriteOf(id));
    }));
    return ctx.awaitHandle(handle, 2300);
  },
};

// 静默之域：倒悬音叉 + 低频向心收束 → 840ms 绝对静默（定帧在战棋恒为 0）→ 950ms 紫色静默涟漪/裂纹 WebM，停滞在爆发拍点揭示
const silenceField = {
  id: 'silence-field', grade: 'identity', fxTags: ['静默之域'],
  prepareKeys: () => ['bowlBronze', 'forkMute', 'sd_ring_blast'],
  async play(ctx) {
    const { hits } = ctx;
    const handle = arcaneRun(ctx, () => ctx.av.playSilenceDomain(ctx.casterEnt, hits.map(h => ctx.ent(h.targetId)).filter(Boolean)));
    ctx.after(950, () => hits.forEach(h => ctx.reveal(h.targetId)));
    return ctx.awaitHandle(handle, 2400);
  },
};

// 碎裂之响：三连音叉高频递进起振 → 950ms 冷银音爆光带 + 碎裂弧 WebM + 逐目标火花，降防在爆发拍点揭示（命中追加原版碎光）
const shatterEcho = {
  id: 'shatter-echo', grade: 'identity', fxTags: ['碎裂之响'],
  prepareKeys: () => ['fork432', 'sd_shatter_blast'],
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId));
    const handle = arcaneRun(ctx, () => ctx.av.playShatterResonance(ctx.casterEnt, hits.map(h => ctx.ent(h.targetId)).filter(Boolean)));
    ctx.after(950, () => {
      if (result.crit) floatText(fx, c.x, c.y - 42, '💥 碎裂暴击×2!', '#fecdd3', '#881337', { ms: 900, size: 15 });
      hits.forEach(h => {
        ctx.reveal(h.targetId);
        if (h.hit && handle && handle.hit) handle.hit(ctx.avHost.host.spriteOf(h.targetId));
      });
    });
    return ctx.awaitHandle(handle, 2500);
  },
};

const sekhmetWrath = {
  id: 'sekhmet-wrath', grade: 'L4', fxTags: ['塞赫美特之愠'], cine: 'lock',
  timeline: { chargeMs: 1220, totalMs: 3200, fullscreen: true, darken: true },
  cues: [{ key: 'fire01', vol: 0.70 }, { key: 'explosion_aoe_blast', vol: 0.65 }],
  prepareKeys() { return ['fire01', 'explosion_aoe_blast']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, t = worldPx(hits[0] ? ctx.centerOf(hits[0].targetId) : result.aim);
    worldDarken(fx, t, { holeR: 70, inMs: 420, holdMs: 1950, outMs: 650, peak: 0.86 });
    const rune = fx.ground(runeHtml(fx.uid(), t.x, t.y, 3.2 * PX, '#f97316', '#fde047', 'ᛊᛖᚲᚺ'), 2200);
    grow(rune.firstChild, { ms: 2200, s0: 0.25, s1: 1.05, hold: 0.8, s2: 1.2 });
    if (!(await ctx.wait(1220))) return false;
    fx.sfx('fire01', 0.70); fx.sfx('explosion_aoe_blast', 0.65); fx.shake('quake');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    webm(ctx, 'vfx_sekhmet_pillar.webm', t.x, t.y - 40, 4.5 * PX, { ms: 1500 });
    particles(fx, Array.from({ length: 30 }, () => { const a = rnd(0, TAU), d = rnd(1, 2.5) * PX; return { x: t.x, y: t.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d - 20, size: rnd(10, 18), color: '#fb923c', core: '#fff7ed', s0: 1, s1: 0.25, dur: 740 }; }), 850);
    ctx.after(60, () => hits.forEach(h => ctx.reveal(h.targetId)));
    return ctx.wait(1900);
  },
};

const sekhmetVow = {
  id: 'sekhmet-vow', kind: 'prepare', grade: 'L2', fxTags: ['塞赫美特之愠'],
  timeline: { totalMs: 920, fullscreen: false, darken: false },
  cues: [{ key: 'explosion_aoe_charge', vol: 0.54 }],
  prepareKeys() { return ['explosion_aoe_charge']; },
  async play(ctx) {
    const c = worldPx(ctx.centerOf(ctx.casterId));
    ctx.fx.sfx('explosion_aoe_charge', 0.54);
    floatText(ctx.fx, c.x, c.y - 38, '🦁 太阳神火蓄势', '#fed7aa', '#9a3412', { ms: 860, size: 13 });
    return ctx.wait(880);
  },
};

const mirrorCounter = {
  id: 'mirror-counter', kind: 'reaction', grade: 'L1', fxTags: ['逆咒归源镜'],
  timeline: { totalMs: 560, fullscreen: false, darken: false },
  cues: [{ key: 'kanpo', vol: 0.36 }],
  prepareKeys() { return ['kanpo']; },
  async play(ctx) {
    const p = ctx.placement(); if (!p) return true;
    const c = worldPx(unitCenter(p, ctx.footprint)), drained = ctx.reaction?.drained || 0;
    ctx.fx.sfx('kanpo', 0.36);
    webm(ctx, 'vfx_mirror_cage.webm', c.x, c.y, 2.5 * PX, { ms: 540 });
    ctx.fx.top(ringHtml(c.x, c.y, 108, 'rgba(56,189,248,0.9)', 'rgba(168,85,247,0.5)'), 460)
      .firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 440, fill: 'forwards' });
    floatText(ctx.fx, c.x, c.y - 38, drained > 0 ? '🪞 逆咒吸蓝 +' + drained : '🪞 逆咒看破!', '#bae6fd', '#312e81', { ms: 520, size: 13 });
    return ctx.wait(500);
  },
};

const bastetOpal = {
  id: 'bastet-opal', grade: 'L2', fxTags: ['芭斯特的猫眼石'],
  timeline: { totalMs: 960, fullscreen: false, darken: false },
  cues: [{ key: 'hpHeal', vol: 0.55 }],
  prepareKeys() { return ['hpHeal']; },
  async play(ctx) {
    const { fx, result } = ctx, a = worldPx(result.aim);
    fx.sfx('hpHeal', 0.55);
    webm(ctx, 'vfx_bastet_spiral.webm', a.x, a.y, 3 * PX, { ms: 900 });
    fx.ground(runeHtml(fx.uid(), a.x, a.y, 1.4 * PX, '#f59e0b', '#fef08a', ''), 850)
      .firstChild.animate([{ transform: 'translate(-50%,-50%) scale(0.4)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0 }], { duration: 820, fill: 'forwards' });
    ctx.after(260, () => (result.effects || []).forEach(e => ctx.revealEffect(e, false)));
    return ctx.wait(900);
  },
};

const strangeConch = {
  id: 'strange-conch', grade: 'L3', fxTags: ['奇异海螺'],
  timeline: { chargeMs: 820, totalMs: 2150, fullscreen: true, darken: false },
  cues: [{ key: 'enemyDebuff', vol: 0.62 }],
  prepareKeys() { return ['enemyDebuff']; },
  async play(ctx) {
    const { fx, hits } = ctx, c = worldPx(ctx.centerOf(ctx.casterId));
    fx.ground(ringHtml(c.x, c.y, 4 * PX, 'rgba(34,211,238,0.55)', 'rgba(15,23,42,0.3)'), 840)
      .firstChild.animate([{ transform: 'scale(0.3)', opacity: 0.3 }, { transform: 'scale(1)', opacity: 0.9 }], { duration: 800, fill: 'forwards' });
    if (!(await ctx.wait(820))) return false;
    fx.sfx('enemyDebuff', 0.62); fx.shake('medium');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    webm(ctx, 'vfx_conch_vortex.webm', c.x, c.y, 6 * PX, { ms: 1300 });
    hits.forEach((h, i) => ctx.after(50 + i * 40, () => ctx.reveal(h.targetId)));
    return ctx.wait(1260);
  },
};

// ---------- D4-D 召唤 / 索恩 / 圣域帷幕收尾 ----------
// 原版 _spawnFullscreenSvgFx（造雾术 / 高阶召唤术共用）：舞台震屏类 + 视口层全屏 SVG（1.5s 回收）+ 受影响单位缠绕动画。
// 原版缠绕对侧全体卡片；战棋按空间真实范围传入受影响单位。
function screenSvgFx(ctx, html, { shakeClass, shakeMs, shroud, shroudMs, ids = [] }) {
  const scene = ctx.avHost.host.stage.shakeEl();
  if (scene) {
    scene.classList.remove(shakeClass); void scene.offsetWidth; scene.classList.add(shakeClass);
    ctx.after(shakeMs, () => scene.classList.remove(shakeClass));
  }
  ctx.fx.screen(html, 1500);
  for (const id of ids) {
    const sp = ctx.avHost.host.spriteOf(id);
    if (!sp) continue;
    sp.style.animation = 'none'; void sp.offsetWidth; sp.style.animation = shroud;
    ctx.after(shroudMs, () => { sp.style.animation = ''; });
  }
}
// 召唤物出场过渡：专属召唤特效（原版跳过通用召唤三瞬）期间先隐去真实落点上的新单位，
// 到特效显形拍点再从光核中凝形（缩放回弹 + 高光褪去）并在脚下炸开召唤环与上升光尘；中途被打断即复原可见
function summonMaterialize(ctx, at, { core, glow, ring }) {
  const ids = ctx.result.summons || [];
  const list = ids.map(id => ({ id, el: ctx.avHost.host.spriteOf(id) })).filter(s => s.el);
  list.forEach(s => { s.prev = s.el.style.opacity; s.el.style.opacity = '0'; });
  let shown = false;
  const show = () => {
    if (shown) return; shown = true;
    list.forEach((s, i) => {
      s.el.style.opacity = s.prev;
      s.el.animate([
        { opacity: 0, transform: 'translateY(12px) scale(0.55)', filter: 'brightness(3.2) blur(6px)' },
        { opacity: 1, transform: 'translateY(-4px) scale(1.1)', filter: 'brightness(1.8) blur(0px)', offset: 0.55 },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'brightness(1) blur(0px)' },
      ], { duration: 620, delay: i * 110, easing: 'cubic-bezier(0.2,0.85,0.3,1)', fill: 'backwards' });
      const p = worldPx(ctx.centerOf(s.id)), fx = ctx.fx;
      ctx.after(i * 110, () => {
        fx.top(orbHtml(p.x, p.y, 2.4 * PX, glow, core), 520).firstChild
          .animate([{ transform: 'scale(0.25)', opacity: 1 }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
        fx.ground(ringHtml(p.x, p.y + 0.3 * PX, 2.6 * PX, core, ring), 640).firstChild
          .animate([{ transform: 'scaleX(0.2) scaleY(0.1)', opacity: 1 }, { transform: 'scaleX(1.15) scaleY(0.5)', opacity: 0 }], { duration: 620, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
        particles(fx, Array.from({ length: 14 }, () => ({ x: p.x + rnd(-0.5, 0.5) * PX, y: p.y + rnd(-0.2, 0.4) * PX, dx: rnd(-10, 10), dy: -rnd(40, 90), size: rnd(6, 12), color: glow, core, s0: 1, s1: 0.3, dur: rnd(520, 820), delay: rnd(0, 160) })), 1000);
      });
    });
  };
  ctx.after(at, show);
  return ok => { if (!ok) list.forEach(s => { s.el.style.opacity = s.prev; }); return ok; };
}

// 高阶召唤术（原版 spawnTitanGazeFx「旧日幻影·巨神凝视终局」）：古神三全音低语 + 惊惧震屏 + 巨神暗影/猩红巨瞳/精神海啸（视口层 1.4s），
// 对侧存活单位缠绕摇晃；召唤物在暗影最盛（约 520ms）时凝形
const highSummon = {
  id: 'high-summon', grade: 'identity', fxTags: ['高阶召唤术'],
  prepareKeys: () => [],
  async play(ctx) {
    const { av, casterEnt } = ctx;
    arcaneRun(ctx, () => av.playEldritchWhisper());
    const foes = [...ctx.sandbox.getUnitView().nodes.keys()]
      .filter(id => { const e = ctx.ent(id); return e && e.isAlive && e.side !== casterEnt.side; });
    screenSvgFx(ctx, av.buildTitanGazeFxHtml(), { shakeClass: 'san-shake-dread', shakeMs: 800, shroud: 'target-enshrouded-wobble 1s cubic-bezier(0.2, 0.8, 0.3, 1) both', shroudMs: 1100, ids: foes });
    const done = summonMaterialize(ctx, 520, { core: '#fef2f2', glow: 'rgba(239,68,68,0.75)', ring: 'rgba(127,29,29,0.55)' });
    return done(await ctx.wait(1500));
  },
};

// 蝎眼钥匙（原版 playXieYanKey「幻梦行军兽」）：钥匙启封暗紫流光向召唤落点收束 → 1150ms 竖裂撕开、行军兽探身（abyss 原采样咆哮/踏地）→
// 2500ms 齿轮锁合单防回流受益者；召唤物在裂隙消融时（约 1900ms）凝形，单防在回流抵达时揭示
const scorpionKey = {
  id: 'scorpion-key', grade: 'identity', fxTags: ['蝎眼钥匙'],
  prepareKeys: () => ['mx_tunnel', 'mx_rift_charge', 'mx_stygian_whoosh', 'mx_deep_impact', 'mx_giant_roar', 'mx_dino_roar', 'mx_golem_stomp', 'mx_gear_lock', 'shieldUp'],
  async play(ctx) {
    const { result } = ctx, sid = (result.summons || [])[0];
    const at = stagePt(sid ? ctx.centerOf(sid) : result.aim);
    const wards = effectIds(ctx, e => e.kind === 'buff' && e.field === 'def' && e.value > 0);
    const handle = arcaneRun(ctx, () => ctx.av.playXieYanKey(ctx.casterEnt, wards.map(ctx.ent).filter(Boolean), false, at));
    const done = summonMaterialize(ctx, 1900, { core: '#f5f3ff', glow: 'rgba(139,112,184,0.8)', ring: 'rgba(56,39,82,0.6)' });
    ctx.after(2840, () => effectIds(ctx).forEach(id => revealEffectsOf(ctx, id)));
    return done(await ctx.awaitHandle(handle, 3350));
  },
};

// 异种坏死雾 L4（对照原版：fog.mp4 scale 0.8×屏幕短边、视频原声 ×2.5、不另配采样）：
// 索恩投出 SVG 毒剂瓶 → 抵达视频首帧瓶位时交接给视频 → 完整播放（瓶落、碎裂、毒液、白雾漫出，2.7s）→ 雾起时揭示常驻毒域与逐个判定
// 视频帧内碎裂点约在 (0.5, 0.83)、首帧瓶位约在 (0.47, 0.17)，据此把碎裂点对准规则落点
const FOG_SHATTER_Y = 0.83, FOG_BOTTLE = { x: 0.47, y: 0.17 }, FOG_SHATTER_MS = 950;
const xenonBlightFog = {
  id: 'xenon-blight-fog', grade: 'L4', fxTags: ['异种坏死雾'], reuseAudio: true, cine: false,
  timeline: { chargeMs: 1400, totalMs: 3250, fullscreen: true, darken: true },   // ≈450 投瓶 + 950 瓶落至碎裂 + 1770 雾起与余韵
  cues: [{ key: 'fog.mp4 原声', vol: 2.5 }],
  prepareKeys() { return []; },
  async play(ctx) {
    const { fx, hits, result } = ctx;
    const region = (ctx.regions || []).find(r => r.type === 'poison') || null, shape = result.query.shape || {};
    const bm = region ? region.center : (shape.center || result.aim), b = worldPx(bm), R = (region ? region.radius : (shape.radius || 8)) * PX;
    const c = worldPx(ctx.centerOf(ctx.casterId)), head = { x: c.x, y: c.y - 26 };
    const W = screenSpanPx(ctx, 0.8), H = W * 720 / 1280, vy = b.y - (FOG_SHATTER_Y - 0.5) * H;
    const hand = { x: b.x + (FOG_BOTTLE.x - 0.5) * W, y: vy + (FOG_BOTTLE.y - 0.5) * H };
    worldDarken(fx, b, { holeR: Math.max(R * 0.8, W * 0.45), inMs: 380, holdMs: 2300, outMs: 520, peak: 0.55 });
    const flyMs = Math.round(Math.min(560, Math.max(360, Math.hypot(hand.x - head.x, hand.y - head.y) * 0.9)));
    throwVial(fx, head, hand, { kind: 'poison', ms: flyMs, s0: 0.5, s1: W * 0.2 / 34 });
    // 镜头随瓶跟到落点：视频在落点上方展开，远投时开场构图会裁掉上半段（未手动操作镜头时才跟）
    ctx.sandbox.guideTo([{ x: bm.x, y: (vy - H / 2) / PX }, bm, { x: bm.x, y: bm.y + 1 }], { ms: flyMs });
    if (!(await ctx.wait(flyMs))) return false;
    const cv = webm(ctx, 'fog.mp4', b.x, vy, W, { ms: 3400, audio: 2.5 });
    ctx.after(FOG_SHATTER_MS, () => { fx.shake('medium'); ctx.atmos?.burst(); });
    hits.forEach((h, i) => ctx.after(FOG_SHATTER_MS + 40 + i * 45, () => ctx.reveal(h.targetId)));
    if (region) ctx.after(1250, () => ctx.revealRegion(region.id));
    ctx.after(1400, () => revealRegionContests(ctx, region, bm, ['rgba(132,204,22,0.55)', 'rgba(236,252,203,0.6)']));
    return ctx.awaitHandle(cv.handle, 3000);
  },
};

// 【燃烧弹】（对照原版：ranshao.webm scale 0.42×屏幕短边、ranshao.mp3）：索恩投出燃烧瓶 → 落点完整播放 ranshao.webm 并同拍原版音效 → 火起时揭示常驻火域与逐个判定
const incendiaryBottle = {
  id: 'incendiary-bottle', grade: 'identity', fxTags: ['燃烧弹'], reuseAudio: true,
  timeline: { totalMs: 1750 },
  cues: [{ key: 'ranshao', vol: 1 }],
  prepareKeys() { return ['ranshao']; },
  async play(ctx) {
    const { fx, hits, result } = ctx;
    const region = (ctx.regions || []).find(r => r.type === 'fire') || null, shape = result.query.shape || {};
    const bm = region ? region.center : (shape.center || result.aim), b = worldPx(bm);
    const c = worldPx(ctx.centerOf(ctx.casterId)), head = { x: c.x, y: c.y - 26 };
    const flyMs = Math.round(Math.min(520, Math.max(340, Math.hypot(b.x - head.x, b.y - head.y) * 0.9)));
    throwVial(fx, head, b, { kind: 'fire', ms: flyMs, s0: 0.55, s1: 0.95 });
    ctx.sandbox.guideTo([{ x: bm.x, y: bm.y - 3 }, bm, { x: bm.x, y: bm.y + 1.5 }], { ms: flyMs });
    if (!(await ctx.wait(flyMs))) return false;
    const W = screenSpanPx(ctx, 0.42);
    fx.sfx('ranshao', 1); fx.shake('light');
    fx.top(orbHtml(b.x, b.y, W * 0.5, 'rgba(251,146,60,0.7)', '#fff7d6'), 360).firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 320, fill: 'forwards' });
    const cv = webm(ctx, 'ranshao.webm', b.x, b.y - W * 0.12, W, { ms: 1500 });
    hits.forEach((h, i) => ctx.after(60 + i * 45, () => ctx.reveal(h.targetId)));
    if (region) ctx.after(260, () => ctx.revealRegion(region.id));
    ctx.after(420, () => revealRegionContests(ctx, region, bm, ['rgba(234,88,12,0.6)', 'rgba(253,230,138,0.6)']));
    return ctx.awaitHandle(cv.handle, 1400);
  },
};

const vitalFlow = {
  id: 'vital-flow', grade: 'L2', fxTags: ['生体流转'],
  timeline: { totalMs: 1180, fullscreen: false, darken: false },
  cues: [{ key: 'herocharge', vol: 0.56 }],
  prepareKeys() { return ['herocharge']; },
  // 心搏两拍（lub-dub ×2）：脚下血脉法阵 → 胸前心核随拍收缩、八道血管自心核描向周身 → 血珠沿 ∞ 环流 →
  // 心电迹线横扫 → 第二拍揭示再动。全部锚定施术者世界坐标、半径 ≤2.6m，不遮邻格。
  async play(ctx) {
    const { fx, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), u = fx.uid();
    const hx = c.x, hy = c.y - 30, R = 2.6 * PX;
    fx.sfx('herocharge', 0.56);
    webm(ctx, 'heart.mp4', hx, hy, 4.4 * PX, { ms: 1150, opacity: 0.9 });
    const rune = fx.ground(runeHtml(u, c.x, c.y, 1.8 * PX, '#ef4444', '#fecaca', 'ᛒᛚᛟᛞ'), 1180).firstChild;
    rune.animate([{ transform: 'translate(-50%,-50%) scale(0.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%,-50%) scale(1.06)', opacity: 0.9, offset: 0.7 }, { transform: 'translate(-50%,-50%) scale(1.2)', opacity: 0 }], { duration: 1160, fill: 'forwards' });
    spin(rune.querySelector('[data-fx=spin]'), 90, 1160);
    // 心核 + 血管（共用 viewBox 以心核为原点）
    const veins = Array.from({ length: 8 }, (_, i) => {
      const a = i / 8 * TAU + 0.2, L = R * (0.75 + (i % 3) * 0.1), m = L * 0.5;
      return '<path d="M0,0 Q' + (Math.cos(a + 0.5) * m).toFixed(1) + ',' + (Math.sin(a + 0.5) * m).toFixed(1) + ' ' + (Math.cos(a) * L).toFixed(1) + ',' + (Math.sin(a) * L).toFixed(1) + '" fill="none" stroke="url(#vv' + u + ')" stroke-width="' + (3.4 - (i % 2)) + '" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" data-fx="vein"/>';
    }).join('');
    const heart = 'M0,14 C-26,-6 -24,-30 -10,-32 C-2,-33 0,-26 0,-22 C0,-26 2,-33 10,-32 C24,-30 26,-6 0,14Z';
    const S = R * 2.4;
    const svg = '<svg width="' + S + '" height="' + S + '" viewBox="' + (-S / 2) + ' ' + (-S / 2) + ' ' + S + ' ' + S + '" style="position:absolute;left:' + hx + 'px;top:' + hy + 'px;transform:translate(-50%,-50%);overflow:visible;pointer-events:none;">' +
      '<defs><radialGradient id="hc' + u + '"><stop offset="0" stop-color="#fff1f2"/><stop offset="0.45" stop-color="#fb7185"/><stop offset="1" stop-color="#9f1239"/></radialGradient>' +
      '<linearGradient id="vv' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fecdd3"/><stop offset="1" stop-color="#be123c" stop-opacity="0.2"/></linearGradient>' +
      '<filter id="hg' + u + '" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      '<g filter="url(#hg' + u + ')">' + veins + '<g data-fx="heart"><path d="' + heart + '" fill="url(#hc' + u + ')" transform="scale(1.3)"/></g></g></svg>';
    const layer = fx.top(svg, 1180);
    const hEl = layer.querySelector('[data-fx=heart]');
    const beat = [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: 0.12 }, { transform: 'scale(0.95)', offset: 0.22 }, { transform: 'scale(1.15)', offset: 0.32 }, { transform: 'scale(1)', offset: 0.45 },
      { transform: 'scale(1.28)', offset: 0.56 }, { transform: 'scale(0.95)', offset: 0.64 }, { transform: 'scale(1.18)', offset: 0.72 }, { transform: 'scale(1)', opacity: 1, offset: 0.85 }, { transform: 'scale(0.7)', opacity: 0 }];
    hEl.animate(beat, { duration: 1150, fill: 'forwards', easing: 'ease-out' });
    layer.querySelectorAll('[data-fx=vein]').forEach((v, i) => {
      v.animate([{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.35 }, { strokeDashoffset: 0, opacity: 0.25, offset: 0.55 }, { strokeDashoffset: -1, opacity: 0 }], { duration: 600, delay: (i % 2) * 40, fill: 'forwards' });
      v.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 520, delay: 560 + (i % 2) * 40, fill: 'forwards' });
    });
    // 每拍一圈血色冲击环
    [0, 100, 560, 660].forEach((t, k) => ctx.after(t, () => fx.top(ringHtml(hx, hy, R * (k % 2 ? 1.4 : 2), 'rgba(254,205,211,0.85)', 'rgba(225,29,72,0.45)'), 560)
      .firstChild.animate([{ transform: 'scale(0.2)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' })));
    // 血珠沿 ∞ 字环流（伯努利双纽线，同一组采样点保证首尾相接）
    const lem = t => { const s = Math.sin(t), k = 1 + s * s; return { x: hx + R * 0.9 * Math.cos(t) / k, y: c.y + R * 0.45 * Math.sin(t) * Math.cos(t) / k }; };
    for (let n = 0; n < 10; n++) {
      const l = fx.top(orbHtml(0, 0, 10 - (n % 3) * 2, '#e11d48', '#ffe4e6'), 1180);
      const frames = Array.from({ length: 17 }, (_, k) => { const p = lem((k / 16) * TAU + n * 0.63); return { transform: 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)', opacity: k === 0 || k === 16 ? 0 : 1 }; });
      l.firstChild.animate(frames, { duration: 900, delay: 100 + n * 24, easing: 'linear', fill: 'both' });
    }
    // 心电迹线：头顶横扫（描边推进）
    let ecg = 'M' + (-R) + ',0';
    [[-0.55, 0], [-0.42, -8], [-0.34, 0], [-0.22, 0], [-0.16, 14], [-0.1, -46], [-0.03, 22], [0.04, 0], [0.22, 0], [0.32, -12], [0.42, 0], [R / R, 0]].forEach(([x, y]) => { ecg += ' L' + (x * R).toFixed(1) + ',' + y; });
    const ecgL = fx.top('<svg width="' + (R * 2) + '" height="80" viewBox="' + (-R) + ' -50 ' + (R * 2) + ' 80" style="position:absolute;left:' + hx + 'px;top:' + (hy - R * 0.95) + 'px;transform:translate(-50%,-50%);overflow:visible;"><path d="' + ecg + '" fill="none" stroke="#fda4af" stroke-width="3" stroke-linejoin="round" pathLength="1" stroke-dasharray="0.35 1" stroke-dashoffset="0.35" filter="url(#hg' + u + ')"/></svg>', 1150);
    ecgL.querySelector('path').animate([{ strokeDashoffset: 0.35, opacity: 1 }, { strokeDashoffset: -1, opacity: 1, offset: 0.9 }, { strokeDashoffset: -1, opacity: 0 }], { duration: 980, delay: 80, fill: 'forwards' });
    // 第二拍揭示再动（规则结果）
    ctx.after(580, () => {
      (result.effects || []).forEach(e => ctx.revealEffect(e, true));
      floatText(fx, hx, hy - R * 0.55, '💓 生体流转 · 再动 +1', '#fecaca', '#7f1d1d', { ms: 580, size: 14 });
    });
    return ctx.wait(1160);
  },
};

const sanctumVeil = {
  id: 'sanctum-veil', grade: 'L4', fxTags: ['圣域帷幕'],
  timeline: { chargeMs: 1220, totalMs: 3200, fullscreen: true, darken: true },
  cues: [{ key: 'weimu', vol: 0.70 }, { key: 'light_charge', vol: 0.52 }],
  prepareKeys() { return ['weimu', 'light_charge']; },
  async play(ctx) {
    const { fx, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), R = (result.query?.shape?.radius || 5) * PX;
    fx.sfx('light_charge', 0.52);
    worldDarken(fx, c, { holeR: 80, inMs: 420, holdMs: 2000, outMs: 650, peak: 0.85 });
    const rune = fx.ground(runeHtml(fx.uid(), c.x, c.y, 3.6 * PX, '#38bdf8', '#fef9c3', 'ᛊᚨᚾᚲᛏᚢᛗ'), 2200);
    grow(rune.firstChild, { ms: 2200, s0: 0.25, s1: 1.05, hold: 0.8, s2: 1.15 });
    if (!(await ctx.wait(1220))) return false;
    fx.sfx('weimu', 0.70); fx.shake('heavy');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    revealBarriers(ctx);
    webm(ctx, 'weimu.webm', c.x, c.y, R * 2, { ms: 1600, cover: R * 2 });
    fx.top(ringHtml(c.x, c.y, R * 2, 'rgba(186,230,253,0.9)', 'rgba(56,189,248,0.35)'), 900)
      .firstChild.animate([{ transform: 'scale(0.15)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 860, fill: 'forwards' });
    return ctx.wait(1900);
  },
};

export const DEFAULT_FX_ENTRIES = [arsenicShot, holyJudgment, thunderStorm, fireBlast, lingFengShu, nakTithBarrier, isisEmbrace, sandArmor, meleeHeavy, rangedHeavy, slugShot, gunshotPierce, strafeBurst, kruppSnipe, harmonyWard, silenceField, shatterEcho, sekhmetWrath, bastetOpal, strangeConch, highSummon, scorpionKey, xenonBlightFog, incendiaryBottle, vitalFlow, sanctumVeil, healMend, fogBurst, rlyehSediment, fireDomain, poisonDomain, selfBoost, aoeHeal, allyBuff, pureDebuff, chargeDash, roarWave, polarBlizzard, temporalQuake, dimensionRift, waterBolt, curseBeam, ...basicAttacks, enemyGroupAttack, neutralImpact, zheYing, mirrorCounter, wizardShield, reactionKanpo, reactionSheshen, reactionGuard, evadeGlide, holyVow, stormGather, frostGather, riftGather, kruppAim, sekhmetVow];
export function getFxTagOptions() {
  return [...new Set(DEFAULT_FX_ENTRIES.flatMap(entry => entry.fxTags || []))].map(name => ({ name, label: name }));
}

export function registerDefaultFx(registry) {
  for (const e of DEFAULT_FX_ENTRIES) registry.register(e);
  return registry;
}

