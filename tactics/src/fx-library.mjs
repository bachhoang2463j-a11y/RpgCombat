// ==========================================
// 战棋演出库：按"特效/效果"命名的通用条目（不按角色）。弗兰克/玛德琳/索恩接入时只往这里追加条目或复用现有条目。
// 每个条目只消费导演给的 ctx（battle.attack() 提交结果 + 揭示回调），不查询命中、不掷骰、不扣费。
// 坐标：世界美术像素（米 × 50）挂战棋世界层（vfx-host），镜头平移/缩放自然一致；
//       仅与位置无关的闪屏挂视口层（屏幕坐标只在这最后一层）。
// 声音：全部为项目已有真实采样（audioUrls 键），禁用振荡器/白噪合成。
// ==========================================

import { pathSegments, pointAtDistance } from './motion.mjs';
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
// WebM（VP9 透明通道）挂世界层，宽度定尺寸、等比；播完即收
function webm(ctx, file, x, y, width, { ms = 1600, rate = 1, opacity = 1 } = {}) {
  const layer = ctx.fx.top('', ms);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
  v.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + width + 'px;transform:translate(-50%,-50%);mix-blend-mode:screen;opacity:' + opacity + ';pointer-events:none;';
  v.src = ctx.av.ASSET_BASE + '/' + file;
  v.playbackRate = rate;
  v.onended = () => v.remove();
  layer.appendChild(v);
  v.play();
  return v;
}
const worldPx = p => ({ x: p.x * PX, y: p.y * PX });

// 本库新增条目用到、回合制视听底座未登记键名的真实采样（文件已在既有资源服务中，键名对齐回合制 WEBM_FX_REGISTRY 音轨）
export const EXTRA_AUDIO = { light01: 'light01.mp3', thunder01: 'thunder01.mp3' };

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

// 兜底：回合制攻击身份演出（单体/逐目标/面状/法术弹），时长与音量沿用定稿资产
const identity = {
  id: 'identity', grade: 'identity', fallback: true,
  prepareKeys: ctx => PREPARE_KEYS[ctx.identity.subtype] || [],
  async play(ctx) {
    const { av, identity: idn, hits, outcomeMap, audioContext, casterEnt } = ctx;
    const targetsOrAim = () => hits.length ? hits.map(h => ctx.ent(h.targetId)) : [ctx.aimAnchor()];
    const outcomes = hits.length ? outcomeMap : (() => 'dodge');
    const onImpact = visual => ctx.reveal(visual && (visual.id || (visual.dataset && visual.dataset.arcaneTargetId)));
    if (idn.mode === 'single') {
      const handle = av.playAttackIdentityFx({ scope: 'single', subtype: idn.subtype, caster: casterEnt, targets: [targetsOrAim()[0]], outcomes, audioContext, onImpact });
      return ctx.awaitHandle(handle, 900);
    }
    if (idn.mode === 'perTarget') {
      const list = targetsOrAim(), handles = [];
      for (let i = 0; i < list.length; i++) {
        if (i && !(await ctx.wait(70))) return false;
        handles.push(av.playAttackIdentityFx({ scope: 'single', subtype: idn.subtype, caster: casterEnt, targets: [list[i]], outcomes, audioContext, onImpact }));
      }
      return (await Promise.all(handles.map(hd => ctx.awaitHandle(hd, 900)))).every(Boolean);
    }
    if (idn.mode === 'aoe') {
      const handle = av.playAttackIdentityFx({ scope: 'aoe', subtype: idn.subtype, caster: casterEnt, targets: targetsOrAim(), outcomes, audioContext, onImpact });
      return ctx.awaitHandle(handle, 1400);
    }
    // projectile
    const h = hits[0];
    const fromDom = ctx.avHost.host.spriteOf(ctx.casterId);
    const toDom = h ? ctx.avHost.host.spriteOf(h.targetId) : ctx.avHost.host.spriteOf(ctx.aimAnchor());
    const ok = await av.CombatAudioMixer.withContext(audioContext, () => av.playArcaneProjectile(idn.subtype, fromDom, toDom, h ? !h.hit : true));
    if (h) ctx.reveal(h.targetId);
    await ctx.wait(260);
    return ok;
  },
};

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

// 连发（多段攻击槽 × 单体）：每段一发 L1 身份演出，间隔 200ms，逐段揭示（三连发等通用）
const volley = {
  id: 'volley', grade: 'L1', reuseAudio: true,
  timeline: { totalMs: 500, gapMs: 200 },   // 单发预算；段间 200ms 错拍
  match: i => i.attackSlots > 1 && i.shape === '单体',
  prepareKeys: ctx => PREPARE_KEYS[ctx.identity.subtype] || [],
  async play(ctx) {
    const { av, hits, audioContext, casterEnt, identity: idn } = ctx;
    const h = hits[0];
    if (!h) return identity.play(ctx);
    const target = ctx.ent(h.targetId);
    const segs = h.segments || [h];
    const shots = h.reaction ? ctx.input.attackSlots : segs.length;
    const handles = [];
    for (let i = 0; i < shots; i++) {
      if (i && !(await ctx.wait(this.timeline.gapMs))) return false;
      const seg = segs[i];
      handles.push(av.playAttackIdentityFx({ scope: 'single', subtype: idn.subtype, caster: casterEnt, targets: [target],
        outcomes: () => (seg && seg.hit ? 'hit' : 'dodge'), audioContext, onImpact: () => ctx.revealSegment(h.targetId, i) }));
    }
    return (await Promise.all(handles.map(hd => ctx.awaitHandle(hd, 900)))).every(Boolean);
  },
};

// 火焰爆炸（[特效:火焰01] × 爆炸范围）L3：蓄势法阵 → 火弹射向接触点 → 收 → 接触点爆燃（fire.webm）→ 余烬/燃烧挂载
const fireBlast = {
  id: 'fire-blast', grade: 'L3', fxTags: ['火焰01'],
  match: i => i.shape === '爆炸',
  timeline: { chargeMs: 890, totalMs: 2430, fullscreen: true },   // 650 蓄势 + 240 火弹聚能 + 340 飞行 + 100 收 + 300 爆发 + 800 余韵
  cues: [{ key: 'explosion_aoe_charge', vol: 0.45 }, { key: 'explosion_aoe_blast', vol: 0.70 }, { key: 'fire01', vol: 0.62 }, { key: 'ranshao', vol: 0.30 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result } = ctx;
    const shape = result.query.shape;
    const c = worldPx(ctx.centerOf(ctx.casterId)), b = worldPx(shape.center);
    const R = shape.radius * PX, uid = fx.uid();
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
    const anchor = ctx.anchorAt(shape.center.x, shape.center.y);
    const flown = await ctx.av.CombatAudioMixer.withContext(ctx.audioContext, () => ctx.av.playArcaneProjectile('fire', ctx.avHost.host.spriteOf(ctx.casterId), anchor, true));
    if (!flown) return false;
    // ③ 收：预告环向爆心坍缩
    tele.firstChild.animate([{ transform: 'scale(1)', opacity: 0.8 }, { transform: 'scale(0.15)', opacity: 1 }], { duration: 100, fill: 'forwards' });
    if (!(await ctx.wait(100))) return false;
    tele.remove();
    // ④ 爆发：音画震同帧
    fx.sfx('explosion_aoe_blast', 0.70); fx.sfx('fire01', 0.62);
    fx.shake('heavy');
    fx.screen('<i style="position:absolute;inset:0;background:radial-gradient(circle,rgba(255,247,214,0.7),rgba(251,146,60,0.25) 60%,rgba(124,45,18,0.1));"></i>', 320)
      .firstChild.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 320, fill: 'forwards' });
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
    const order = hits.map(h => { const p = ctx.centerOf(h.targetId); return { h, d: Math.hypot(p.x - shape.center.x, p.y - shape.center.y) }; }).sort((a, z) => a.d - z.d);
    for (const { h, d } of order) ctx.after(30 + Math.min(1, d / shape.radius) * 180, () => ctx.reveal(h.targetId));
    // ⑤ 余韵：余烬上飘、烟尘（同色系中心，不用亮白核）、燃烧挂载
    ctx.after(300, () => {
      particles(fx, Array.from({ length: 26 }, () => ({ x: b.x + rnd(-R, R), y: b.y + rnd(-R * 0.6, R * 0.6), dx: rnd(-14, 14), dy: rnd(-70, -30), size: rnd(4, 8), color: pick(['#fde047', '#fb923c']), core: '#fef9c3', s0: 1, s1: 0.4, dur: rnd(600, 800), delay: rnd(0, 160) })), 1000);
      particles(fx, Array.from({ length: 8 }, () => ({ x: b.x + rnd(-R * 0.7, R * 0.7), y: b.y + rnd(-R * 0.4, R * 0.4), dx: rnd(-10, 10), dy: rnd(-30, -12), size: rnd(40, 70), color: 'rgba(68,64,60,0.45)', core: 'rgba(68,64,60,0.5)', s0: 0.6, s1: 1.2, o0: 0.6, dur: 780 })), 1000, 'ground');
    });
    const burned = hits.filter(h => h.hit);
    if (burned.length) ctx.after(380, () => {
      fx.sfx('ranshao', 0.30);
      for (const h of burned) { const p = worldPx(ctx.centerOf(h.targetId)); webm(ctx, 'ranshao.webm', p.x, p.y - 14, 76, { ms: 900, opacity: 0.9 }); }
    });
    return ctx.wait(1100);
  },
};

// 自身再动/加速（无伤害、只作用自身）L2：脚下时针法阵展开 → 加速光点汇入 → 收束闪光 + 徽记飘字
const selfBoost = {
  id: 'self-boost', grade: 'L2',
  match: i => i.selfOnly && (i.grantsMainPoint || i.haste > 0),
  timeline: { totalMs: 950 },
  cues: [{ key: 'herocharge', vol: 0.45 }, { key: 'link_chime', vol: 0.55 }],
  prepareKeys() { return this.cues.map(c => c.key); },
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
    return ctx.wait(950);
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
  match: i => i.canceled && !!i.shift,
  timeline: { totalMs: 600 },
  cues: [{ key: 'hide', vol: 0.32 }, { key: 'link_dash', vol: 0.26 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(rctx) {
    const { fx, shift } = rctx;
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
// 通用回避错位（无专属特效标签）：只滑步，不加残影
const evadeGlide = {
  id: 'evade-shift', kind: 'reaction', grade: 'L1', fallback: true,
  match: i => i.canceled && !!i.shift,
  timeline: { totalMs: 360 },
  cues: [{ key: 'link_dash', vol: 0.26 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(rctx) {
    rctx.fx.sfx('link_dash', 0.26);
    return glide(rctx, { ghosts: false, ms: 300 });
  },
};

// ==========================================
// 埃利奥特首批（典型对局权威样本）：单体回复 / 浓雾 / 归尘礼赞（延迟·传奇）/ 召雷术（延迟·高阶）
// ==========================================

// 单体即时回复（规则 effects.kind='heal'）L2：掌心光核 → 三缕光丝沿共享贝塞尔飞抵 → 目标绽光 + 回复揭示 → 光粒上浮
const healMend = {
  id: 'heal-mend', grade: 'L2',
  match: i => i.healOnly && i.shape === '单体',
  timeline: { totalMs: 1000 },   // 260 凝光 + 260 光丝 + 100 绽放 + 380 余韵
  cues: [{ key: 'regen_hum', vol: 0.40 }, { key: 'hpHeal', vol: 0.58 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, result } = ctx;
    const heals = (result.effects || []).filter(e => e.kind === 'heal');
    const c = worldPx(ctx.centerOf(ctx.casterId)), hand = { x: c.x, y: c.y - 16 };
    // ① 凝光：掌心金绿光核 + 光点吸入；受术者脚下生命符文
    fx.sfx('regen_hum', 0.40);
    fx.top(orbHtml(hand.x, hand.y, 44, '#86efac', '#fefce8'), 560).firstChild.animate([{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 1, offset: 0.45 }, { transform: 'scale(0.7)', opacity: 0.9, offset: 0.8 }, { transform: 'scale(0.3)', opacity: 0 }], { duration: 560, fill: 'forwards' });
    particles(fx, Array.from({ length: 9 }, () => { const a = rnd(0, TAU), d = rnd(28, 46); return { x: hand.x + Math.cos(a) * d, y: hand.y + Math.sin(a) * d, dx: -Math.cos(a) * d, dy: -Math.sin(a) * d, size: rnd(6, 10), color: pick(['#86efac', '#fde68a']), core: '#ffffff', s0: 1, s1: 0.3, dur: 240, delay: rnd(0, 60) }; }), 360);
    const spots = heals.map(e => ({ e, p: worldPx(ctx.centerOf(e.targetId)), self: e.targetId === ctx.casterId }));
    for (const s of spots) {
      const rune = fx.ground(runeHtml(fx.uid(), s.p.x, s.p.y + 8, 0.85 * PX, '#4ade80', '#fef08a', ''), 1000);
      grow(rune.firstChild, { ms: 1000, s0: 0.4, s1: 1, hold: 0.75, o: 0.9 });
      spin(rune.querySelector('[data-fx=spin]'), 100, 1000);
    }
    if (!(await ctx.wait(260))) return false;
    // ② 光丝：三缕光沿共享控制点飞抵（自疗时由脚边螺旋上升）
    for (const s of spots) {
      const end = { x: s.p.x, y: s.p.y - 10 };
      const len = Math.hypot(end.x - hand.x, end.y - hand.y) || 1, nx = -(end.y - hand.y) / len, ny = (end.x - hand.x) / len;
      for (const k of [-1, 0, 1]) {
        const a = s.self ? { x: s.p.x + k * 26, y: s.p.y + 24 } : hand;
        const ctrl = s.self ? { x: s.p.x + k * 46, y: s.p.y - 4 } : { x: (hand.x + end.x) / 2 + nx * k * len * 0.28, y: (hand.y + end.y) / 2 + ny * k * len * 0.28 - 26 };
        trail(fx, a, ctrl, end, { color: '#86efac', width: 5, ms: 260, delay: Math.abs(k) * 40 });
        flyOrb(fx, a, ctrl, end, { size: 16, color: '#bbf7d0', core: '#ffffff', ms: 260, delay: Math.abs(k) * 40, s0: 0.5, s1: 1, fade: true });
      }
    }
    if (!(await ctx.wait(260))) return false;
    // ③ 绽放：音画同帧揭示回复值（规则真值）
    fx.sfx('hpHeal', 0.58);
    for (const s of spots) {
      fx.top(orbHtml(s.p.x, s.p.y - 6, 96, '#bbf7d0', '#ffffff'), 300).firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 280, fill: 'forwards' });
      fx.top(ringHtml(s.p.x, s.p.y, 92, 'rgba(187,247,208,0.9)', 'rgba(74,222,128,0.6)'), 440).firstChild.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
      const gained = ctx.revealEffect(s.e, true);   // 宿主返回封顶后的实际回复量
      floatText(fx, s.p.x, s.p.y - 30, '+' + (gained == null ? s.e.value : gained), '#dcfce7', '#16a34a', { ms: 880, size: 17 });
      // ④ 余韵：光粒上浮淡出
      particles(fx, Array.from({ length: 12 }, () => ({ x: s.p.x + rnd(-20, 20), y: s.p.y + rnd(-6, 14), dx: rnd(-8, 8), dy: rnd(-70, -36), size: rnd(5, 9), color: pick(['#86efac', '#fef08a', '#bbf7d0']), core: '#ffffff', s0: 1, s1: 0.3, dur: rnd(420, 560), delay: rnd(0, 120) })), 760);
    }
    return ctx.wait(480);
  },
};

// 浓雾（显式区域 {类型:浓雾}，不按技能名/特效名判断，敌我造雾共用）L3：
// 暗场色罩 + 深渊符文阵 + 雾丝吸入 → 雾核抛物线投向接触点 → 收 → 雾毯按真实半径铺开（揭示常驻雾区）→ 雾内单位浮现致盲
const fogBurst = {
  id: 'abyss-fog', grade: 'L3',
  match: i => i.region === 'fog',
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
    fx.screen('<i style="position:absolute;inset:0;background:radial-gradient(circle,rgba(165,243,252,.32),rgba(14,40,52,.18) 60%,transparent);"></i>', 300)
      .firstChild.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
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
  match: i => i.attackSlots > 0,
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
    fx.screen('<i style="position:absolute;inset:0;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(254,243,199,.75) 55%,rgba(251,191,36,.35));"></i>', 440)
      .firstChild.animate([{ opacity: 0 }, { opacity: 1, offset: 0.14 }, { opacity: 0 }], { duration: 440, fill: 'forwards' });
    const H = 16 * PX;
    const beam = (width, alpha, ms) => fx.top('<i style="position:absolute;left:' + t.x + 'px;top:' + (t.y - H + 14) + 'px;width:' + width + 'px;height:' + H + 'px;margin-left:' + (-width / 2) + 'px;transform-origin:50% 100%;' +
      'background:linear-gradient(90deg,transparent,rgba(251,191,36,' + alpha * 0.6 + ') 22%,rgba(255,251,235,' + alpha + ') 50%,rgba(251,191,36,' + alpha * 0.6 + ') 78%,transparent);mix-blend-mode:screen;will-change:transform,opacity;"></i>', ms).firstChild;
    beam(5 * PX, 0.45, 1100).animate([{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1.2)', opacity: 1, offset: 0.08 }, { transform: 'scaleX(1)', opacity: 0.8, offset: 0.4 }, { transform: 'scaleX(0.3)', opacity: 0 }], { duration: 1100, fill: 'forwards' });
    beam(1.8 * PX, 1, 900).animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1.35)', opacity: 1, offset: 0.09 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.45 }, { transform: 'scaleX(0.15)', opacity: 0 }], { duration: 900, fill: 'forwards' });
    fx.top('<i style="position:absolute;left:' + t.x + 'px;top:' + t.y + 'px;width:' + 10 * PX + 'px;height:22px;margin:-11px 0 0 ' + (-5 * PX) + 'px;background:linear-gradient(90deg,transparent,rgba(251,191,36,.55) 30%,#fffbeb 50%,rgba(251,191,36,.55) 70%,transparent);mix-blend-mode:screen;"></i>', 520)
      .firstChild.animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.25 }, { transform: 'scaleX(1.1)', opacity: 0 }], { duration: 500, fill: 'forwards' });
    const flame = webm(ctx, '414.webm', t.x, t.y - 62, 4 * PX, { ms: 1000 });
    flame.style.filter = 'sepia(.35) saturate(.75) brightness(1.55)';
    fx.top(ringHtml(t.x, t.y, 4.6 * PX, 'rgba(255,251,235,0.9)', 'rgba(251,191,36,0.7)'), 620).firstChild
      .animate([{ transform: 'scale(0.12)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 600, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
    particles(fx, Array.from({ length: 36 }, () => { const a = rnd(0, TAU), d = rnd(1.2, 2.6) * PX; return { x: t.x, y: t.y - 10, dx: Math.cos(a) * d, dy: Math.sin(a) * d - rnd(10, 40), size: rnd(8, 18), color: pick(['#fde68a', '#fef3c7', '#fbbf24']), core: '#ffffff', s0: 1, s1: 0.25, dur: rnd(520, 820) }; }), 900);
    if (h) ctx.after(40, () => ctx.reveal(h.targetId));
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
  match: i => i.shape === '爆炸',
  timeline: { chargeMs: 900, totalMs: 2400, fullscreen: true },   // 800 汇聚 + 100 收 + 500 落雷 + 1000 余韵
  cues: [{ key: 'thunder_charge', vol: 0.50 }, { key: 'thunder01', vol: 0.72 }, { key: 'thunder_aoe_hit', vol: 0.60 }],
  prepareKeys() { return this.cues.map(c => c.key); },
  async play(ctx) {
    const { fx, hits, result } = ctx;
    const shape = result.query.shape;
    const b = worldPx(shape.center), R = shape.radius * PX, c = worldPx(ctx.centerOf(ctx.casterId));
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
    fx.screen('<i style="position:absolute;inset:0;background:radial-gradient(circle,rgba(245,243,255,.85),rgba(167,139,250,.35) 60%,rgba(46,16,101,.15));"></i>', 300)
      .firstChild.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    const strikeH = b.y - cloud.y + 20;
    fx.top('<i style="position:absolute;left:' + b.x + 'px;top:' + cloud.y + 'px;width:56px;height:' + strikeH + 'px;margin-left:-28px;background:linear-gradient(90deg,transparent,rgba(167,139,250,.6) 25%,#f5f3ff 50%,rgba(167,139,250,.6) 75%,transparent);mix-blend-mode:screen;"></i>', 280)
      .firstChild.animate([{ opacity: 1, transform: 'scaleX(1.3)' }, { opacity: 0.8, transform: 'scaleX(0.6)', offset: 0.5 }, { opacity: 0, transform: 'scaleX(0.2)' }], { duration: 260, fill: 'forwards' });
    webm(ctx, '450.webm', b.x, b.y - 60, Math.max(R * 1.5, 4 * PX), { ms: 1300 });
    fx.top(ringHtml(b.x, b.y, R * 2.1, 'rgba(237,233,254,0.85)', 'rgba(139,92,246,0.6)'), 560).firstChild
      .animate([{ transform: 'scale(0.1)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 540, easing: 'cubic-bezier(0.1,0.8,0.3,1)', fill: 'forwards' });
    const order = hits.map(hh => { const p = ctx.centerOf(hh.targetId); return { hh, p: worldPx(p), d: Math.hypot(p.x - shape.center.x, p.y - shape.center.y) }; }).sort((u, v) => u.d - v.d);
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

export const DEFAULT_FX_ENTRIES = [arsenicShot, holyJudgment, thunderStorm, fireBlast, volley, healMend, fogBurst, selfBoost, identity, zheYing, evadeGlide, holyVow, stormGather];
export function registerDefaultFx(registry) {
  for (const e of DEFAULT_FX_ENTRIES) registry.register(e);
  return registry;
}
