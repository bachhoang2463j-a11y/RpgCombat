// ==========================================
// 高阶技能运镜（L3/L4）：遮幅 + 推近出手者 → 爆发拍时停定格 → 按类型构图 → 首次命中顿帧 → 回位。
// 类型按真实结算判定（不按角色/条目硬编码）：创建区域 = 领域；有伤害段 = 单体/范围；其余 = 守护/召唤/增益。
// 条目可声明打击镜头（两者都先特写施法者蓄力，再快速甩到打击点，释放瞬间时停后猛拉远 + 大震）：
// cine:'lock' 锁定打击（蓄力末段自动甩镜，甩到后随蓄力缓推）；cine:'projectile' 弹道打击（条目在发射时调 ctx.cine.launch 甩镜候弹）；
// cineHold:false 爆发不定格不闪白（视频主导的条目让视频自然播放，仅拉远）。
// cine:false 则自行编排（如连续扫射）。时停/顿帧由导演 hold（暂停演出时钟 + 冻结视口动画）承担。
// 镜头被玩家本次动作接管（拖拽/缩放）即让出，仅保留画面层。
// ==========================================

const TAU = Math.PI * 2, PX = 50;
const rnd = (a, b) => a + Math.random() * (b - a);

// 世界米坐标 → 视口内像素
export function viewPt(sandbox, m) {
  const r = sandbox.getDom().viewport.getBoundingClientRect(), s = sandbox.worldToScreenClient(m.x, m.y);
  return { x: s.x - r.left, y: s.y - r.top, w: r.width, h: r.height };
}
// 电影遮幅：上下黑边滑入 → 保持 → 滑出（视口层）
export function letterbox(fx, ms, { h = 9, inMs = 280, outMs = 340 } = {}) {
  const bar = (edge, dir) => '<i style="position:absolute;left:0;right:0;' + edge + ':0;height:' + h + '%;background:linear-gradient(' + dir + ',#000 0%,#000 72%,rgba(0,0,0,.55) 100%);"></i>';
  const root = fx.screen(bar('top', '180deg') + bar('bottom', '0deg'), ms);
  [...root.children].forEach((el, i) => {
    const off = i ? 'translateY(100%)' : 'translateY(-100%)';
    el.animate([{ transform: off }, { transform: 'translateY(0)', offset: inMs / ms }, { transform: 'translateY(0)', offset: 1 - outMs / ms }, { transform: off }], { duration: ms, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' });
  });
}
// 击中时停只压暗降饱和；甩镜复用放射线，首帧就出现，不冻结时钟。
export function timeStop(sandbox, fx, ms, m, { tint = 'rgba(254,243,199,.95)', lines = 30, filter = 'brightness(0.88) saturate(0.9)', rush = false } = {}) {
  const p = viewPt(sandbox, m), R = Math.hypot(p.w, p.h), total = ms + (rush ? 70 : 200);
  const ls = Array.from({ length: lines }, (_, i) => {
    const a = i / lines * TAU + rnd(-0.08, 0.08), r0 = R * rnd(0.14, 0.28);
    return '<line x1="' + (p.x + Math.cos(a) * r0).toFixed(1) + '" y1="' + (p.y + Math.sin(a) * r0).toFixed(1) + '" x2="' + (p.x + Math.cos(a) * R).toFixed(1) + '" y2="' + (p.y + Math.sin(a) * R).toFixed(1) +
      '" stroke="' + tint + '" stroke-width="' + rnd(1.2, 4.5).toFixed(1) + '" stroke-linecap="round"/>';
  }).join('');
  const root = fx.screen('<svg width="100%" height="100%" style="position:absolute;inset:0;overflow:visible;transform-origin:' + p.x.toFixed(0) + 'px ' + p.y.toFixed(0) + 'px;mix-blend-mode:screen;">' + ls + '</svg>', total);
  root.dataset.tacticsFx = rush ? 'camera-rush' : 'hit-time-stop';
  const svg = root.firstChild;
  if (!rush) {
    const shade = root.ownerDocument.createElement('i');
    shade.style.cssText = 'position:absolute;inset:0;backdrop-filter:' + filter + ';-webkit-backdrop-filter:' + filter;
    root.prepend(shade);
    shade.animate([{ opacity: 1 }, { opacity: 1, offset: ms / total }, { opacity: 0 }], { duration: total, fill: 'forwards' });
  }
  svg.animate(rush
    ? [{ opacity: 0.96, transform: 'scale(.98)' }, { opacity: 0.84, transform: 'scale(1.05)', offset: 0.32 }, { opacity: 0, transform: 'scale(1.14)' }]
    : [{ opacity: 1, transform: 'scale(1.06)' }, { opacity: 0.85, transform: 'scale(1)', offset: ms / total }, { opacity: 0, transform: 'scale(.94)' }],
  { duration: total, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
}
// 末击白闪（顿帧画面）：世界层锚定目标的白芯红晕光团，随镜头不漂移
export function hitFlash(fx, m, { ms = 260, color = 'rgba(254,202,202,.55)' } = {}) {
  const x = m.x * PX, y = m.y * PX, d = 4.2 * PX;
  fx.top('<i style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + d + 'px;height:' + d + 'px;margin:' + (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px;border-radius:50%;' +
    'background:radial-gradient(circle,rgba(255,255,255,.98) 0%,' + color + ' 38%,transparent 72%);mix-blend-mode:screen;"></i>', ms).firstChild
    .animate([{ transform: 'scale(.55)', opacity: 1 }, { transform: 'scale(1)', opacity: 0.8, offset: 0.4 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: ms, fill: 'forwards' });
}

// 时停与命中顿帧时长：0 = 不冻结、不出时停画面（白闪与震屏保留）。攻击类与守护/领域类分开，当前全部为 0
export const ATTACK_STOP_MS = 0, ATTACK_HIT_MS = 0, SUPPORT_STOP_MS = 0, SUPPORT_STOP_MS_L4 = 0;
// 运镜缩放幅度：所有推近/拉远相对出手前缩放的偏移量 × ZOOM_AMP（下方倍数均为设计值，实际按此比例收敛）
export const ZOOM_AMP = 1 / 3;
export const zoomAt = (homeScale, s) => homeScale + (s - homeScale) * ZOOM_AMP;
// 演出时钟冻结：ms ≤ 0 时直接执行 during，不暂停
export function holdOr(hold, ms, during) { if (ms > 0) return hold(ms, during); if (during) during(); return Promise.resolve(true); }

// 类型模板：push=蓄势推近倍数，cap=构图缩放上限（相对出手前），frameMs=爆发后构图时长，hitStop=首次命中顿帧
const KINDS = {
  single:  { push: 1.6, cap: 1.7, tight: 1.1, pad: 2.2, frameMs: 220, bias: 0.25, hitStop: true,  stop: { tint: 'rgba(254,243,199,.95)' } },
  area:    { push: 1.5, cap: 1.5, tight: 1.05, pad: 2.4, frameMs: 300, bias: 0, hitStop: true,  stop: { tint: 'rgba(254,243,199,.95)' } },
  domain:  { push: 1.45, cap: 1.3, tight: 0.95, pad: 3, frameMs: 900, bias: 0, hitStop: false, stop: { tint: 'rgba(209,250,229,.9)', lines: 22 } },
  support: { push: 1.5, cap: 1.5, tight: 1.05, pad: 2.6, frameMs: 380, bias: 0, hitStop: false, stop: { tint: 'rgba(253,230,138,.95)', lines: 24, filter: 'sepia(.55) saturate(1.35) contrast(1.15) brightness(1.08)' } },
};

export function cineKind(result, hits, regions) {
  if (regions.length) return 'domain';
  const dmg = hits.filter(h => (h.segments || [h]).some(s => !s.heal));
  if (!dmg.length) return 'support';
  return dmg.length === 1 && (result.skill?.range?.type || '单体') === '单体' ? 'single' : 'area';
}

// 只消费真实伤害段；范围和多发守住原构图，单体单发才安排出手前镜头。
export function planKillBeat(result, caster, units) {
  const lethal = new Set();
  const hits = result.hits || [];
  let focus = null;
  if (caster?.side !== 'hero' || caster.isSummon) return { lethal, focus };
  for (const h of hits) {
    const target = units.find(u => u.id === h.targetId && u.side === 'enemy');
    if (!target) continue;
    const segments = h.segments || [h];
    for (const s of segments) {
      if (s.hit && s.down && s.hpBefore > 0 && s.hpAfter === 0 && s.hpDmg > 0 && !s.heal && !s.fatalResult && !s.barrierHitId) lethal.add(s);
    }
    if (hits.length === 1 && segments.filter(s => !s.heal).length === 1 && lethal.size && (result.shots?.length || 0) <= 1
      && (result.skill?.range?.type || '单体') === '单体') {
      focus = { targetId: h.targetId, timing: killTimingFor(target) };
    }
  }
  return { lethal, focus };
}

export const KILL_TIMING = {
  B: { rush: 90, cast: 380, pull: 340, hit: 120, stop: 460, tail: 820, zoom: 1.9, whip: 2.1, filter: 'brightness(0.88) saturate(0.9)' },
  C: { rush: 72, cast: 450, pull: 380, hit: 170, stop: 560, tail: 980, zoom: 2.2, whip: 2.35, filter: 'brightness(0.82) saturate(0.85)' },
};
export function killTimingFor(target) {
  return target?.level === '精英' || target?.level === '首领' ? KILL_TIMING.C : KILL_TIMING.B;
}

// 同一发只选一次全场定格；只有真正参与定格的命中可抬高档位。
export function planHitStopWaves(result, units, lethal) {
  const waves = new Map();
  const unitById = new Map(units.map(u => [u.id, u]));
  for (const h of result.hits || []) (h.segments || [h]).forEach((segment, i) => {
    const kill = lethal.has(segment);
    if (!kill && (!segment.hit || segment.heal || segment.barrierHitId || !(segment.hpAfter > 0)
      || !(segment.hpDmg > 0 && segment.hpDmg * 2 >= (segment.maxHp ?? h.maxHp)))) return;
    const key = segment.shotIndex ?? i, timing = killTimingFor(unitById.get(h.targetId));
    let wave = waves.get(key);
    if (!wave) waves.set(key, wave = { timing, anchorId: h.targetId, lethal: [], segments: new Set(), ms: timing.hit });
    if (timing.stop > wave.timing.stop) { wave.timing = timing; wave.anchorId = h.targetId; }
    wave.segments.add(segment);
    if (kill) wave.lethal.push({ targetId: h.targetId, segment });
    wave.ms = wave.lethal.length ? wave.timing.stop : wave.timing.hit;
  });
  return waves;
}

function rushFocus(sb, fx, at, ms) {
  if (!sb.cameraTouched?.()) timeStop(sb, fx, ms, at, { tint: 'rgba(255,242,218,.88)', lines: 32, rush: true });
}
export function startKillCamera(sandbox, from, to, fx, timing) {
  const home = sandbox.getPose();
  rushFocus(sandbox, fx, from, timing.rush);
  sandbox.cameraTo(sandbox.poseAt(from.x, from.y, home.scale * timing.zoom), timing.rush);
  return () => {
    const frame = sandbox.poseFrame([from, to], { pad: 2 });
    const pose = frame.scale <= home.scale ? frame : sandbox.poseAt((from.x + to.x) / 2, (from.y + to.y) / 2, home.scale);
    return sandbox.cameraTo(pose, timing.pull);
  };
}

// env: { sandbox, fx, hold, after, style, freeze, grade, totalMs, chargeMs, result, hits, regions, shape, centerOf }
export function startCine(env) {
  const { sandbox: sb, fx, hold, grade, result, hits, centerOf } = env;
  const kind = cineKind(result, hits, env.regions), K = KINDS[kind], epic = grade === 'L4';
  const style = env.style, strike = style === 'lock' || style === 'projectile';
  const home = sb.getPose();
  const P = (x, y, k) => sb.poseAt(x, y, zoomAt(home.scale, k));   // k 为绝对设计缩放
  const cm = centerOf(result.casterId);
  const tgtIds = [...new Set([...hits.map(h => h.targetId), ...(result.effects || []).map(e => e.targetId)])].filter(id => id !== result.casterId);
  const tpts = tgtIds.map(centerOf).filter(Boolean);
  const focus = tpts[0] || result.aim || cm;
  const box = env.shape ? [{ x: env.shape.center.x - env.shape.radius, y: env.shape.center.y - env.shape.radius }, { x: env.shape.center.x + env.shape.radius, y: env.shape.center.y + env.shape.radius }] : [];
  const I = env.shape ? env.shape.center : focus;   // 打击点：范围取爆心，单体取首个目标
  const attack = strike || kind === 'single' || kind === 'area';
  const stopMs = attack ? ATTACK_STOP_MS : (epic ? SUPPORT_STOP_MS_L4 : SUPPORT_STOP_MS), hitMs = ATTACK_HIT_MS;
  let bursted = false, hitDone = false, framed = null;

  // ① 蓄势：遮幅入场 + 推近出手者（略偏向目标方向）；锁定打击在蓄力末 480ms 自动甩到打击点
  letterbox(fx, env.totalMs + stopMs + hitMs + 700, { h: epic ? 11 : 8 });
  const dx = focus.x - cm.x, dy = focus.y - cm.y, L = Math.hypot(dx, dy) || 1, b = Math.min(1.2, L * 0.3);
  const casterMs = style === 'lock' ? Math.max(300, env.chargeMs - 480) : Math.min(700, env.chargeMs * 0.8);
  sb.cameraTo(P(cm.x + dx / L * b, cm.y + dy / L * b, home.scale * (strike ? 1.45 : K.push) * (epic ? 1.12 : 1)), Math.min(casterMs, 620));
  // 甩镜到打击点：whipMs 内急甩推近，到位后余下蓄力缓推 1.1 倍（压迫感），爆发即被拉远打断
  function whip(at, k, whipMs, untilMs) {
    sb.cameraTo(P(at.x, at.y, home.scale * k), whipMs).then(ok => {
      if (ok && !bursted && untilMs > whipMs + 80) sb.cameraTo(P(at.x, at.y, home.scale * k * 1.1), untilMs - whipMs);
    });
  }
  if (style === 'lock') env.after(casterMs, () => {
    if (bursted || sb.cameraTouched?.()) return;
    const timing = env.lockTiming || KILL_TIMING.B;
    rushFocus(sb, fx, I, timing.rush);
    whip(I, epic ? timing.whip : 1.7, timing.rush, env.chargeMs - casterMs);
  });

  // 打击爆发：打击点时停定格（白闪 + 速度线）→ 解冻瞬间大震 + 猛拉远过冲 → 回落到框住爆区的构图
  // freeze:false 时不定格不闪白，直接拉远（震屏交由条目自身）
  function pullBack(quake) {
    if (quake) fx.shake('quake');
    const pts = [I, ...box, ...tpts], fr = sb.poseFrame(pts, { pad: 3.5, tight: 0.95 });
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    framed = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, scale: Math.min(fr.scale, home.scale * 1.05) };
    sb.cameraTo(P(framed.x, framed.y, framed.scale * 0.8), 140).then(ok2 => { if (ok2) sb.cameraTo(P(framed.x, framed.y, framed.scale), 480); });
  }
  function strikeBurst() {
    if (env.freeze === false) { pullBack(false); return; }
    holdOr(hold, stopMs, () => {
      if (stopMs > 0) timeStop(sb, fx, stopMs, I, { tint: 'rgba(255,255,255,.95)', lines: 36 });
      hitFlash(fx, I, { ms: stopMs + 220 });
    }).then(ok => { if (ok) pullBack(true); });
  }

  return {
    kind,
    homeScale: home.scale,   // 出手前缩放：条目按屏幕比例定尺寸的视频以此为准，特写/拉远不改变其设计尺寸
    // 弹道发射：delay 后甩镜到落点（at 可覆盖、k 为相对出手前的推近倍数），于飞行 75% 处完成推近，弹体入画落下
    launch(flightMs, delay = 0, { at = I, k = epic ? 1.8 : 1.65 } = {}) {
      if (style !== 'projectile') return;
      const ms = Math.max(160, Math.min(700, flightMs * 0.75));
      env.after(delay, () => { if (!bursted) whip(at, k, ms, ms); });
    },
    // ② 爆发拍：时停定格 → 解冻后按类型构图
    burst() {
      if (bursted) return; bursted = true;
      if (strike) { strikeBurst(); return; }
      holdOr(hold, stopMs, () => { if (stopMs > 0) timeStop(sb, fx, stopMs, cm, K.stop); }).then(ok => {
        if (!ok) return;
        const pts = [cm, ...(kind === 'domain' ? [] : tpts), ...box];
        if (!tpts.length && !box.length && result.aim) pts.push(result.aim);
        const fr = sb.poseFrame(pts, { pad: K.pad, tight: K.tight });
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const C = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
        framed = { x: C.x + (focus.x - C.x) * K.bias, y: C.y + (focus.y - C.y) * K.bias, scale: Math.min(fr.scale, home.scale * K.cap) };
        sb.cameraTo(P(framed.x, framed.y, framed.scale), K.frameMs);
      });
    },
    // ③ 首次命中：（顿帧）+ 镜头向命中点急推 + 白闪（仅攻击类）
    firstHit(targetId) {
      if (strike || !K.hitStop || !bursted || hitDone || !framed) return;
      hitDone = true;
      const m = centerOf(targetId) || focus;
      holdOr(hold, hitMs, () => {
        hitFlash(fx, m);
        sb.cameraTo(P(framed.x + (m.x - framed.x) * 0.3, framed.y + (m.y - framed.y) * 0.3, framed.scale * 1.08), 50);
      });
    },
    // ④ 回位：镜头缓回出手前构图
    end() { return sb.cameraTo(home, 380); },
  };
}
