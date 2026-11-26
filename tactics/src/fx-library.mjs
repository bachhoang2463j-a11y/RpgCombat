// ==========================================
// 战棋演出库：按"特效/效果"命名的通用条目（不按角色）。弗兰克/玛德琳/索恩接入时只往这里追加条目或复用现有条目。
// 每个条目只消费导演给的 ctx（battle.attack() 提交结果 + 揭示回调），不查询命中、不掷骰、不扣费。
// 坐标：世界美术像素（米 × 50）挂战棋世界层（vfx-host），镜头平移/缩放自然一致；
//       仅与位置无关的闪屏挂视口层（屏幕坐标只在这最后一层）。
// 声音：全部为项目已有真实采样（audioUrls 键），禁用振荡器/白噪合成。
// ==========================================

import { pathSegments, pointAtDistance } from './motion.mjs';
import { FX_SCALE } from './av-host.mjs';
import { unitCenter } from './geometry.mjs';

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
function runeHtml(uid, x, y, r, c1, c2, glyphs) {
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
    '<g filter="url(#gl' + uid + ')"><circle r="' + r + '" fill="url(#rg' + uid + ')"/><g data-fx="spin">' + g.join('') + txt + '</g></g></svg>';
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
  return Math.min(vp.clientWidth, vp.clientHeight) * k / ctx.sandbox.getPose().scale;
}
// 视口面积占比下限对应的世界宽度（aspect = 视频宽/高）
function screenCoverPx(ctx, fraction, aspect) {
  const vp = ctx.sandbox.getDom().viewport;
  return Math.sqrt(fraction * vp.clientWidth * vp.clientHeight * aspect) / ctx.sandbox.getPose().scale;
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

// ==========================================
// 条目
// ==========================================

// 未知或缺失标签：按伤害类型与范围补通用出手音，由导演播放统一命中反馈。
const neutralImpact = {
  id: 'neutral-impact', grade: 'identity', fallback: true,
  prepareKeys: () => ['atk1', 'atk2', 'light_impact'],
  async play(ctx) {
    const sk = ctx.skill || {};
    const wide = !!(sk.range && sk.range.type !== '单体' && sk.range.type !== '自身');
    const cue = sk.damageType === '法术' ? 'light_impact' : (wide ? 'atk1' : 'atk2');
    ctx.fx.sfx(cue, 0.55);
    for (const h of ctx.hits) ctx.reveal(h.targetId);
    return true;
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

function basicAttack(name, { subtype = name, area = false, projectile, directional, gap = 0 } = {}) {
  return {
    id: 'basic-' + name, grade: 'identity', fxTags: [name],
    prepareKeys: () => PREPARE_KEYS[name] || [],
    async play(ctx) {
      const { av, casterEnt, audioContext } = ctx;
      const range = ctx.skill?.range;
      const isArea = ['直线', '扇形', '圆形', '全域', '爆炸'].includes(range?.type);
      const scope = area === 'only' || (area && isArea) ? 'aoe' : 'single';
      const reveal = ({ targetId, index }) => ctx.revealSegment(targetId, index);
      const identity = (targets, outcomes, onImpact, options) =>
        av.playAttackIdentityFx({ scope, subtype, caster: casterEnt, targets, outcomes, audioContext, onImpact, ...options });
      for (const [i, shot] of attackShots(ctx).entries()) {
        const { aim, impacts } = shot;
        if (i && gap && !(await ctx.wait(gap))) return false;
        const aimAnchor = () => ctx.anchorAt(aim.x, aim.y);
        const playIdentity = async (...args) => ctx.awaitHandle(identity(...args), scope === 'aoe' ? 1400 : 900);
        if (directional && range?.type === '扇形') {
          const origin = ctx.centerOf(ctx.casterId);
          const dx = aim.x - origin.x, dy = aim.y - origin.y;
          const scale = range.castRange / (Math.hypot(dx, dy) || 1);
          const endpoint = ctx.anchorAt(origin.x + dx * scale, origin.y + dy * scale);
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
          if (!(await playIdentity(impacts.length || areaBounds ? impacts.map(p => ctx.ent(p.targetId)) : [aimAnchor()],
            target => getImpact(target)?.hit ? 'hit' : 'dodge', target => {
              const impact = getImpact(target);
              if (impact) reveal(impact);
            }, { areaBounds }))) return false;
        } else {
          for (const impact of impacts.length ? impacts : [null]) {
            if (!(await playIdentity([impact ? ctx.ent(impact.targetId) : aimAnchor()],
              () => impact?.hit ? 'hit' : 'dodge', () => { if (impact) reveal(impact); }))) return false;
          }
        }
        if (ctx.awaitCounters && !(await ctx.awaitCounters())) return false;
      }
      return true;
    },
  };
}

const basicAttacks = [
  basicAttack('枪击', { area: true, gap: 200 }),
  basicAttack('霰弹', { directional: true, gap: 220 }),
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
  id: 'fire-blast', grade: 'L3', fxTags: ['火焰01'],
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

// ---------- 反应：回避成功后的真实错位（规则已改站位；此处把显示从原位滑到新位并放开锁定） ----------
async function glide(rctx, { ghosts, ms }) {
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
  view.lockMotion(id, false);
  view.updateUnit(id, { placement: rctx.placement() });
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
    playOne(feedback, effect.targetId, () => ctx.revealEffect(effect, true));
    if (effect.kind === 'heal' && effect.overheal > 0) {
      if (!(await ctx.wait(1)) || canceled) return cancelAll();
      playOne(SUPPORT_EFFECT.shield, effect.targetId);
    }
  }
  const finished = await Promise.all(pending);
  return !canceled && finished.every(ok => ok);

}

const healMend = {
  id: 'heal-mend', grade: 'L2', fxTags: ['单体回复'],
  timeline: { totalMs: 1100 },
  cues: SUPPORT_CUES,
  prepareKeys: () => SUPPORT_KEYS,
  play: ctx => playSupportEffects(ctx),
};

// 浓雾 L3（敌我共用，区域数据提供落点与半径）：
// 暗场色罩 + 深渊符文阵 + 雾丝吸入 → 雾核抛物线投向接触点 → 收 → 雾毯按真实半径铺开（揭示常驻雾区）→ 雾内单位浮现致盲
const fogBurst = {
  id: 'abyss-fog', grade: 'L3', fxTags: ['浓雾'],
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
  if (!P || !at) return;
  const p = worldPx(at);
  fx.sfx(P.sfx, 0.34);
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
    const rune = fx.ground(runeHtml(fx.uid(), p.x, p.y, 0.8 * PX, '#22d3ee', '#e0f2fe', ''), 600);
    grow(rune.firstChild, { ms: 600, s0: 0.4, s1: 1, hold: 0.6 });
    spin(rune.querySelector('[data-fx=spin]'), 300, 600, 'cubic-bezier(0.3,0,0.2,1)');
    particles(fx, Array.from({ length: 10 }, () => ({ x: p.x + rnd(-16, 16), y: p.y + rnd(-4, 10), dx: rnd(-6, 6), dy: rnd(-56, -34), size: rnd(5, 9), color: pick(P.dots), core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(380, 560), delay: rnd(0, 140) })), 700);
  }
  floatText(fx, p.x, p.y - 44, passiveGainLabel(ev), P.color, P.glow, { ms: 900, size: 13 });
}

// ---------- 敌方局部警报（规则 enemy-alarm）L1：报警者头顶感叹 + 红色波纹按真实警报半径外扩，收报者依距离逐个亮起 ----------
export const ALARM_AUDIO = ['bowlBronze', 'bellPing'];
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
  id: 'holy-judgment', grade: 'L4', fxTags: ['圣光01'],
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
const thunderStorm = {
  id: 'thunder-storm', grade: 'L3', fxTags: ['雷击01'],
  timeline: { chargeMs: 900, totalMs: 2400, fullscreen: true },   // 800 汇聚 + 100 收 + 500 落雷 + 1000 余韵
  cues: [{ key: 'thunder_charge', vol: 0.50 }, { key: 'thunder01', vol: 0.72 }, { key: 'thunder_aoe_hit', vol: 0.60 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result } = ctx;
    const shape = result.query.shape;
    const center = shape.center || result.aim;
    const b = worldPx(center), R = (shape.radius || 3) * PX, c = worldPx(ctx.centerOf(ctx.casterId));
    const cloud = { x: b.x, y: b.y - Math.min(R * 0.9, 3 * PX) - 40 };
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
    return ctx.wait(1000);
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
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId));
    const ev = (result.events || []).find(e => e.type === 'unit-charged');
    const dest = ev ? worldPx(ev.to) : worldPx(result.aim);
    fx.sfx('enemyMeleeGroupHit', 0.62); fx.shake('medium');
    particles(fx, Array.from({ length: 16 }, () => ({ x: c.x + rnd(-20, 20), y: c.y + rnd(-20, 20), dx: (dest.x - c.x) * 0.5 + rnd(-18, 18), dy: (dest.y - c.y) * 0.5 + rnd(-18, 18), size: rnd(14, 24), color: '#fbbf24', core: '#fef3c7', s0: 1, s1: 0.3, dur: 460 })), 520, 'ground');
    hits.forEach((h, idx) => ctx.after(180 + idx * 90, () => ctx.reveal(h.targetId)));
    return ctx.wait(900);
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

const frostBlast = {
  id: 'frost-blast', grade: 'L3', fxTags: ['冰霜爆炸'],
  timeline: { chargeMs: 820, totalMs: 2150, fullscreen: true, darken: false },
  cues: [{ key: 'frost_crystal_impact_fs550267', vol: 0.68 }],
  prepareKeys() { return ['frost_crystal_impact_fs550267']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, shape = result.query.shape, b = worldPx(shape.center || result.aim), R = (shape.radius || 5) * PX;
    fx.ground(ringHtml(b.x, b.y, R * 2, 'rgba(125,211,252,0.55)', 'rgba(56,189,248,0.25)'), 900)
      .firstChild.animate([{ transform: 'scale(1.1)', opacity: 0 }, { transform: 'scale(0.9)', opacity: 0.9, offset: 0.7 }, { transform: 'scale(0.2)', opacity: 1 }], { duration: 820, fill: 'forwards' });
    if (!(await ctx.wait(820))) return false;
    fx.sfx('frost_crystal_impact_fs550267', 0.68); fx.shake('heavy');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    fx.top(ringHtml(b.x, b.y, R * 2.4, 'rgba(186,230,253,0.9)', 'rgba(14,165,233,0.4)'), 600)
      .firstChild.animate([{ transform: 'scale(0.15)', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 580, fill: 'forwards' });
    particles(fx, Array.from({ length: 28 }, () => { const a = rnd(0, TAU), d = rnd(0.5, 1.15) * R; return { x: b.x, y: b.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: rnd(8, 16), color: '#7dd3fc', core: '#f0f9ff', s0: 1, s1: 0.2, dur: 680 }; }), 800);
    hits.forEach((h, k) => ctx.after(30 + k * 55, () => ctx.reveal(h.targetId)));
    return ctx.wait(1280);
  },
};

const voidQuake = {
  id: 'void-quake', grade: 'L2', fxTags: ['虚空震荡'],
  timeline: { totalMs: 1150, fullscreen: false, darken: false },
  cues: [{ key: 'enemyMagicGroup', vol: 0.60 }],
  prepareKeys() { return ['enemyMagicGroup']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, shape = result.query.shape, b = worldPx(shape.center || result.aim), R = (shape.radius || 4) * PX;
    fx.sfx('enemyMagicGroup', 0.60); fx.shake('medium');
    fx.top(ringHtml(b.x, b.y, R * 2.2, 'rgba(192,132,252,0.85)', 'rgba(88,28,135,0.55)'), 620)
      .firstChild.animate([{ transform: 'scale(0.2)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 600, fill: 'forwards' });
    particles(fx, Array.from({ length: 20 }, () => { const a = rnd(0, TAU), d = rnd(0.4, 1) * R; return { x: b.x, y: b.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: rnd(10, 18), color: '#a855f7', core: '#f3e8ff', s0: 1, s1: 0.2, dur: 560 }; }), 640);
    hits.forEach((h, k) => ctx.after(50 + k * 60, () => ctx.reveal(h.targetId)));
    return ctx.wait(1080);
  },
};

const lineRift = {
  id: 'line-rift', grade: 'L2', fxTags: ['直线裂隙'],
  timeline: { totalMs: 960, fullscreen: false, darken: false },
  cues: [{ key: 'magicKill', vol: 0.58 }],
  prepareKeys() { return ['magicKill']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), a = worldPx(result.aim);
    const dx = a.x - c.x, dy = a.y - c.y, len = Math.max(1, Math.hypot(dx, dy)), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    fx.sfx('magicKill', 0.58); fx.shake('medium');
    const L = Math.min(len, (result.query?.shape?.length || 12) * PX);
    fx.top('<i style="position:absolute;left:' + c.x + 'px;top:' + (c.y - 12) + 'px;width:' + L + 'px;height:24px;transform-origin:0 50%;transform:rotate(' + ang + 'deg);background:linear-gradient(90deg,rgba(168,85,247,0.85),#f3e8ff,rgba(56,189,248,0.65));mix-blend-mode:screen;border-radius:12px;"></i>', 480)
      .firstChild.animate([{ transform: 'rotate(' + ang + 'deg) scaleX(0.1)', opacity: 1 }, { transform: 'rotate(' + ang + 'deg) scaleX(1)', opacity: 0.9, offset: 0.35 }, { transform: 'rotate(' + ang + 'deg) scaleX(1)', opacity: 0 }], { duration: 460, fill: 'forwards' });
    hits.forEach((h, k) => ctx.after(80 + k * 70, () => ctx.reveal(h.targetId)));
    return ctx.wait(900);
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
  id: 'reaction-kanpo', kind: 'reaction', grade: 'L1', fxTags: ['看破'],
  timeline: { totalMs: 420, fullscreen: false, darken: false },
  cues: [{ key: 'kanpo', vol: 0.34 }],
  prepareKeys() { return ['kanpo']; },
  async play(ctx) {
    const p = ctx.placement(); if (!p) return true;
    const c = worldPx(unitCenter(p, ctx.footprint));
    ctx.fx.sfx('kanpo', 0.34);
    ctx.fx.top(ringHtml(c.x, c.y, 96, 'rgba(253,224,71,0.9)', 'rgba(245,158,11,0.45)'), 380)
      .firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 360, fill: 'forwards' });
    floatText(ctx.fx, c.x, c.y - 36, '⛔ 看破!', '#fef08a', '#92400e', { ms: 420, size: 14 });
    return ctx.wait(380);
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

const isisEmbrace = {
  id: 'isis-embrace', grade: 'L3', fxTags: ['伊西丝之拥', '伊西斯之拥'],
  timeline: { chargeMs: 820, totalMs: 2150, fullscreen: true, darken: false },
  cues: [{ key: 'hpHeal', vol: 0.65 }],
  prepareKeys() { return ['hpHeal']; },
  async play(ctx) {
    const { fx, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), R = (result.query?.shape?.radius || 8) * PX;
    const rune = fx.ground(runeHtml(fx.uid(), c.x, c.y, 2.8 * PX, '#fbbf24', '#fffbeb', 'ᛁᛊᛁᛊ'), 1800);
    grow(rune.firstChild, { ms: 1800, s0: 0.2, s1: 1, hold: 0.78, s2: 1.15 });
    spin(rune.querySelector('[data-fx=spin]'), -140, 1800);
    if (!(await ctx.wait(820))) return false;
    fx.sfx('hpHeal', 0.65);
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    fx.top(ringHtml(c.x, c.y, R * 2, 'rgba(254,240,138,0.85)', 'rgba(74,222,128,0.35)'), 760)
      .firstChild.animate([{ transform: 'scale(0.15)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 720, fill: 'forwards' });
    (result.effects || []).forEach((e, i) => ctx.after(60 + i * 50, () => ctx.revealEffect(e, false)));
    return ctx.wait(1260);
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

const sandArmor = {
  id: 'sand-armor', grade: 'L2', fxTags: ['飞沙化甲'],
  timeline: { totalMs: 960, fullscreen: false, darken: false },
  cues: [{ key: 'defUp', vol: 0.54 }],
  prepareKeys() { return ['defUp']; },
  async play(ctx) {
    const { fx, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), a = worldPx(result.aim);
    fx.sfx('defUp', 0.54);
    flyOrb(fx, c, { x: (c.x + a.x) / 2, y: Math.min(c.y, a.y) - 42 }, a, { size: 22, color: '#f59e0b', core: '#fef3c7', ms: 320, fade: true });
    ctx.after(300, () => {
      fx.ground(runeHtml(fx.uid(), a.x, a.y, 1.3 * PX, '#d97706', '#fde68a', ''), 620)
        .firstChild.animate([{ transform: 'translate(-50%,-50%) scale(0.4)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0 }], { duration: 600, fill: 'forwards' });
      (result.effects || []).forEach(e => ctx.revealEffect(e, true));
    });
    return ctx.wait(920);
  },
};

// ---------- D4-B 弗兰克 / 玛德琳枪械与近战重击（5项 + 克虏伯起手） ----------
const meleeHeavy = {
  id: 'melee-heavy', grade: 'L2', fxTags: ['近战重击'],
  timeline: { totalMs: 920, fullscreen: false, darken: false },
  cues: [{ key: 'parry_heavy', vol: 0.65 }],
  prepareKeys() { return ['parry_heavy']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, t = worldPx(hits[0] ? ctx.centerOf(hits[0].targetId) : result.aim);
    fx.sfx('parry_heavy', 0.65); fx.shake('heavy');
    fx.top(ringHtml(t.x, t.y, 2.8 * PX, 'rgba(251,191,36,0.9)', 'rgba(234,88,12,0.5)'), 480)
      .firstChild.animate([{ transform: 'scale(0.2)', opacity: 1 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 460, fill: 'forwards' });
    ctx.after(80, () => hits.forEach(h => ctx.reveal(h.targetId)));
    return ctx.wait(880);
  },
};

const rangedHeavy = {
  id: 'ranged-heavy', grade: 'L2', fxTags: ['远程重击'], reuseAudio: true,
  timeline: { totalMs: 900, fullscreen: false, darken: false },
  cues: [{ key: 'gunshot_pierce', vol: 0.7 }],
  prepareKeys() { return ['gunshot_pierce']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), t = worldPx(hits[0] ? ctx.centerOf(hits[0].targetId) : result.aim);
    fx.sfx('gunshot_pierce', 0.7); fx.shake('medium');
    trail(fx, c, { x: (c.x + t.x) / 2, y: (c.y + t.y) / 2 }, t, { color: '#fbbf24', width: 6, ms: 200 });
    ctx.after(160, () => hits.forEach(h => ctx.reveal(h.targetId)));
    return ctx.wait(860);
  },
};

const gunshotPierce = {
  id: 'gunshot-pierce', grade: 'L2', fxTags: ['枪击穿透'], reuseAudio: true,
  timeline: { totalMs: 880, fullscreen: false, darken: false },
  cues: [{ key: 'gunshot_pierce', vol: 0.65 }],
  prepareKeys() { return ['gunshot_pierce']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), t = worldPx(hits[0] ? ctx.centerOf(hits[0].targetId) : result.aim);
    const dx = t.x - c.x, dy = t.y - c.y, len = Math.max(1, Math.hypot(dx, dy));
    const over = { x: t.x + (dx / len) * 65, y: t.y + (dy / len) * 65 };
    fx.sfx('gunshot_pierce', 0.65); fx.shake('light');
    trail(fx, c, t, over, { color: '#38bdf8', width: 4, ms: 240 });
    ctx.after(140, () => hits.forEach(h => ctx.reveal(h.targetId)));
    return ctx.wait(840);
  },
};

const strafeBurst = {
  id: 'strafe-burst', grade: 'L3', fxTags: ['连续扫射'],
  timeline: { chargeMs: 800, totalMs: 2150, fullscreen: true, darken: false },
  cues: [{ key: 'aoe_gun_burst_fs482122', vol: 0.68 }],
  prepareKeys() { return ['aoe_gun_burst_fs482122']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId)), a = worldPx(result.aim);
    const baseAng = Math.atan2(a.y - c.y, a.x - c.x);
    const rune = fx.ground(ringHtml(c.x, c.y, 1.8 * PX, 'rgba(251,146,60,0.55)', 'transparent'), 850);
    rune.firstChild.animate([{ transform: 'scale(0.5)', opacity: 0.3 }, { transform: 'scale(1.1)', opacity: 0.9 }], { duration: 800, fill: 'forwards' });
    if (!(await ctx.wait(800))) return false;
    fx.sfx('aoe_gun_burst_fs482122', 0.68); fx.shake('medium');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    for (let k = 0; k < 14; k++) ctx.after(k * 55, () => {
      const ang = baseAng + rnd(-0.72, 0.72), dist = rnd(260, 520);
      const end = { x: c.x + Math.cos(ang) * dist, y: c.y + Math.sin(ang) * dist };
      trail(fx, c, { x: (c.x + end.x) / 2, y: (c.y + end.y) / 2 }, end, { color: k % 2 ? '#fde047' : '#fb923c', width: 3, ms: 160 });
    });
    hits.forEach((h, i) => ctx.after(140 + i * 70, () => ctx.reveal(h.targetId)));
    return ctx.wait(1300);
  },
};

const kruppSnipe = {
  id: 'krupp-snipe', grade: 'L4', fxTags: ['克虏伯重狙'],
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

// ---------- D4-C 奇物与音叉混合 WebM（7项 + 塞赫美特起手） ----------
const harmonyWard = {
  id: 'harmony-ward', grade: 'L3', fxTags: ['谐律之庇'],
  timeline: { chargeMs: 820, totalMs: 2100, fullscreen: true, darken: false },
  cues: [{ key: 'hpHeal', vol: 0.62 }],
  prepareKeys() { return ['hpHeal']; },
  async play(ctx) {
    const { fx, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId));
    const rune = fx.ground(runeHtml(fx.uid(), c.x, c.y, 2.2 * PX, '#38bdf8', '#e0f2fe', 'ᚺᚨᚱᛗᛟ'), 1400);
    grow(rune.firstChild, { ms: 1400, s0: 0.3, s1: 1, hold: 0.7, s2: 1.15 });
    if (!(await ctx.wait(820))) return false;
    fx.sfx('hpHeal', 0.62);
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    webm(ctx, 'vfx_harmony_ripple.webm', c.x, c.y, 5 * PX, { ms: 1300 });
    fx.top(ringHtml(c.x, c.y, 8 * PX, 'rgba(186,230,253,0.85)', 'rgba(56,189,248,0.3)'), 720)
      .firstChild.animate([{ transform: 'scale(0.1)', opacity: 1 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 700, fill: 'forwards' });
    (result.effects || []).forEach(e => ctx.revealEffect(e, false));
    return ctx.wait(1220);
  },
};

const silenceField = {
  id: 'silence-field', grade: 'L3', fxTags: ['静默之域'],
  timeline: { chargeMs: 820, totalMs: 2100, fullscreen: true, darken: false },
  cues: [{ key: 'enemyDebuff', vol: 0.62 }],
  prepareKeys() { return ['enemyDebuff']; },
  async play(ctx) {
    const { fx, hits } = ctx, c = worldPx(ctx.centerOf(ctx.casterId));
    fx.ground(ringHtml(c.x, c.y, 3 * PX, 'rgba(148,163,184,0.6)', 'transparent'), 840)
      .firstChild.animate([{ transform: 'scale(0.4)', opacity: 0.3 }, { transform: 'scale(1)', opacity: 0.9 }], { duration: 800, fill: 'forwards' });
    if (!(await ctx.wait(820))) return false;
    fx.sfx('enemyDebuff', 0.62); fx.shake('light');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    webm(ctx, 'vfx_silence_ripple.webm', c.x, c.y, 6 * PX, { ms: 1300 });
    hits.forEach((h, i) => ctx.after(60 + i * 50, () => ctx.reveal(h.targetId)));
    return ctx.wait(1220);
  },
};

const shatterEcho = {
  id: 'shatter-echo', grade: 'L3', fxTags: ['碎裂之响'],
  timeline: { chargeMs: 820, totalMs: 2150, fullscreen: true, darken: false },
  cues: [{ key: 'defDown', vol: 0.64 }],
  prepareKeys() { return ['defDown']; },
  async play(ctx) {
    const { fx, hits, result } = ctx, c = worldPx(ctx.centerOf(ctx.casterId));
    fx.ground(runeHtml(fx.uid(), c.x, c.y, 2 * PX, '#f43f5e', '#fecdd3', ''), 840)
      .firstChild.animate([{ transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0.4 }, { transform: 'translate(-50%,-50%) scale(1.05)', opacity: 0.9 }], { duration: 800, fill: 'forwards' });
    if (!(await ctx.wait(820))) return false;
    fx.sfx('defDown', 0.64); fx.shake('medium');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    webm(ctx, 'vfx_shatter_arc.webm', c.x, c.y, 6 * PX, { ms: 1300 });
    if (result.crit) floatText(fx, c.x, c.y - 42, '💥 碎裂暴击×2!', '#fecdd3', '#881337', { ms: 900, size: 15 });
    hits.forEach((h, i) => ctx.after(60 + i * 50, () => ctx.reveal(h.targetId)));
    return ctx.wait(1260);
  },
};

const sekhmetWrath = {
  id: 'sekhmet-wrath', grade: 'L4', fxTags: ['塞赫美特之愠'],
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
const highSummon = {
  id: 'high-summon', grade: 'L3', fxTags: ['高阶召唤术'],
  timeline: { chargeMs: 820, totalMs: 2100, fullscreen: true, darken: false },
  cues: [{ key: 'herochargedone', vol: 0.62 }],
  prepareKeys() { return ['herochargedone']; },
  async play(ctx) {
    const { fx, result } = ctx, a = worldPx(result.aim);
    const rune = fx.ground(runeHtml(fx.uid(), a.x, a.y, 2 * PX, '#f59e0b', '#fef08a', 'ᛊᚢᛗᛗᛟᚾ'), 1600);
    grow(rune.firstChild, { ms: 1600, s0: 0.25, s1: 1.05, hold: 0.78, s2: 1.15 });
    spin(rune.querySelector('[data-fx=spin]'), 180, 1600);
    if (!(await ctx.wait(820))) return false;
    fx.sfx('herochargedone', 0.62); fx.shake('medium');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    particles(fx, Array.from({ length: 20 }, () => { const ang = rnd(0, TAU), d = rnd(0.5, 1.4) * PX; return { x: a.x, y: a.y, dx: Math.cos(ang) * d, dy: Math.sin(ang) * d - 25, size: rnd(8, 14), color: '#fbbf24', core: '#fffbeb', s0: 1, s1: 0.2, dur: 640 }; }), 760);
    return ctx.wait(1220);
  },
};

const scorpionKey = {
  id: 'scorpion-key', grade: 'L3', fxTags: ['蝎眼钥匙'],
  timeline: { chargeMs: 820, totalMs: 2150, fullscreen: true, darken: false },
  cues: [{ key: 'herochargedone', vol: 0.65 }],
  prepareKeys() { return ['herochargedone']; },
  async play(ctx) {
    const { fx, result } = ctx, a = worldPx(result.aim);
    const rune = fx.ground(runeHtml(fx.uid(), a.x, a.y, 2.8 * PX, '#a855f7', '#f3e8ff', 'ᚴᛖᛁ'), 1800);
    grow(rune.firstChild, { ms: 1800, s0: 0.2, s1: 1.1, hold: 0.8, s2: 1.2 });
    spin(rune.querySelector('[data-fx=spin]'), -210, 1800);
    if (!(await ctx.wait(820))) return false;
    fx.sfx('herochargedone', 0.65); fx.shake('heavy');
    ctx.atmos?.burst();   // 屏幕主演出爆发与本条目冲击同拍（替代原通用径向闪屏）
    fx.top(ringHtml(a.x, a.y, 4 * PX, 'rgba(216,180,254,0.9)', 'rgba(126,34,206,0.45)'), 680)
      .firstChild.animate([{ transform: 'scale(0.15)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 640, fill: 'forwards' });
    return ctx.wait(1260);
  },
};

// 异种坏死雾 L4（对照原版：fog.mp4 scale 0.8×屏幕短边、视频原声 ×2.5、不另配采样）：
// 索恩投出 SVG 毒剂瓶 → 抵达视频首帧瓶位时交接给视频 → 完整播放（瓶落、碎裂、毒液、白雾漫出，2.7s）→ 雾起时揭示常驻毒域与逐个判定
// 视频帧内碎裂点约在 (0.5, 0.83)、首帧瓶位约在 (0.47, 0.17)，据此把碎裂点对准规则落点
const FOG_SHATTER_Y = 0.83, FOG_BOTTLE = { x: 0.47, y: 0.17 }, FOG_SHATTER_MS = 950;
const xenonBlightFog = {
  id: 'xenon-blight-fog', grade: 'L4', fxTags: ['异种坏死雾'], reuseAudio: true,
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

export const DEFAULT_FX_ENTRIES = [arsenicShot, holyJudgment, thunderStorm, fireBlast, lingFengShu, nakTithBarrier, isisEmbrace, sandArmor, meleeHeavy, rangedHeavy, gunshotPierce, strafeBurst, kruppSnipe, harmonyWard, silenceField, shatterEcho, sekhmetWrath, bastetOpal, strangeConch, highSummon, scorpionKey, xenonBlightFog, incendiaryBottle, vitalFlow, sanctumVeil, healMend, fogBurst, fireDomain, poisonDomain, selfBoost, aoeHeal, allyBuff, pureDebuff, chargeDash, roarWave, frostBlast, voidQuake, lineRift, waterBolt, curseBeam, ...basicAttacks, neutralImpact, zheYing, mirrorCounter, wizardShield, reactionKanpo, reactionSheshen, reactionGuard, evadeGlide, holyVow, stormGather, kruppAim, sekhmetVow];
export function getFxTagOptions() {
  return [...new Set(DEFAULT_FX_ENTRIES.flatMap(entry => entry.fxTags || []))].map(name => ({ name, label: name }));
}

export function registerDefaultFx(registry) {
  for (const e of DEFAULT_FX_ENTRIES) registry.register(e);
  return registry;
}

