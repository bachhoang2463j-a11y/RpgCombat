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

export const DEFAULT_FX_ENTRIES = [arsenicShot, fireBlast, volley, selfBoost, identity, zheYing, evadeGlide];
export function registerDefaultFx(registry) {
  for (const e of DEFAULT_FX_ENTRIES) registry.register(e);
  return registry;
}
