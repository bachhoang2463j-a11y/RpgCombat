// ==========================================
// 角色栏头像火焰（八方旅人式写实火焰粒子）：底栏上方一层全宽透明画布，按各头像框 getBoundingClientRect 实时映射发射点。
// 三层：① 火环光晕（贴合斜角方框的内外描边 + 沿边呼吸光点）② 体积焰流（多层径向柔光，叠加发光）③ 余烬火星（按速度拉伸的细拖尾，闪烁熄灭）。
// 气流斜向右上（45°~55°）+ 微湍流；只从头像上沿与右沿上段喷焰，左/下沿只亮框与零星火星，不糊脸。
// 每帧结尾按卡片抠掉铭牌信息区（与悬停属性浮层、指令面板），火焰不压姓名/职业/数值文字。
// 状态只读卡片 class：t-current / t-low（HP<30%）/ t-tp-half（50<TP<100）/ t-tp-full / t-tp-burst / t-down。
// 颜色看血量（常规暖金，残血红金相间），规模看 TP/行动（待机 → 中等 → 大型）。尺度均以头像边长 H 为单位。
// ==========================================

const TAU = Math.PI * 2;
const COLORS = { white: '255,248,226', gold: '255,204,112', amber: '255,142,44', crimson: '222,42,30', deep: '130,10,14' };
const POOL = 1600, CARD_CAP = 300;

// 档位（已按概念图缩小约 30% 校准）：rise = 焰尾高出头像上沿的高度（×H）
const TIER = {
  idle:   { flame: 0,   rise: 0,    size: 0,    ember: 5,  emberRise: 0.7, bright: 0.55, glow: 0.5 },
  active: { flame: 80,  rise: 0.8,  size: 0.46, ember: 16, emberRise: 1.0, bright: 0.9,  glow: 0.85 },
  charged:{ flame: 104, rise: 0.85, size: 0.48, ember: 30, emberRise: 1.15, bright: 1.15, glow: 1.05 },
  full:   { flame: 156, rise: 1.5,  size: 0.6,  ember: 60, emberRise: 1.9, bright: 1.3,  glow: 1.3 },
};

function sprite(rgb) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.25, 'rgba(' + rgb + ',.72)'); gr.addColorStop(0.55, 'rgba(' + rgb + ',.26)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
}
const PAL = {
  gold:     ['gold', 'amber', 'amber', 'amber'],
  goldHot:  ['gold', 'gold', 'amber', 'amber'],
  white:    ['white', 'gold', 'amber', 'amber'],
  red:      ['crimson', 'crimson', 'deep', 'deep'],
  redCore:  ['gold', 'amber', 'crimson', 'crimson'],
};

export function createHeroFlameFx(root, getHeroes, getAvoidRects) {
  const canvas = document.createElement('canvas');
  canvas.className = 't-hero-flames';
  canvas.setAttribute('aria-hidden', 'true');
  root.appendChild(canvas);
  const g = canvas.getContext('2d');
  const sprites = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, sprite(v)]));
  const pool = Array.from({ length: POOL }, () => ({ live: false }));
  const cards = new Map();   // card → { flameAcc, emberAcc, burstSeen, burstAt, count, seed }
  let raf = 0, last = 0, W = 0, Hc = 0, dpr = 1, alive = true;
  const free = [...pool];

  function resize() {
    const w = root.clientWidth, h = root.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
    if (w === W && h === Hc && d === dpr) return;
    W = w; Hc = h; dpr = d;
    canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
  }
  function spawn(card, st, type, ox, oy, o) {
    if (st.count >= CARD_CAP) return;
    const p = free.pop();
    if (!p) return;
    Object.assign(p, o, { live: true, type, card, ox, oy, t0: o.t0 });
    st.count++;
  }
  // 沿斜角方框取边上一点：edge = top/right/left/bottom，u∈[0,1]
  function edgePoint(r, edge, u, ch) {
    if (edge === 'top') return [r.left + ch + (r.width - ch) * u, r.top];
    if (edge === 'right') return [r.right, r.top + (r.height - ch) * u];
    if (edge === 'bottom') return [r.left + (r.width - ch) * u, r.bottom];
    return [r.left, r.top + ch + (r.height - ch) * u];
  }
  function framePath(r, ch) {
    g.beginPath();
    g.moveTo(r.left + ch, r.top); g.lineTo(r.right, r.top); g.lineTo(r.right, r.bottom - ch);
    g.lineTo(r.right - ch, r.bottom); g.lineTo(r.left, r.bottom); g.lineTo(r.left, r.top + ch); g.closePath();
  }
  // 解析轨迹：位置只是年龄的函数 → 拖尾 = 同一函数在稍早年龄处取点（精确运动模糊）
  function posAt(p, age, t) {
    const k = age * p.life;
    const tx = Math.sin(age * p.tf + p.seed * TAU + t * 1.3) * p.turb * age;
    const ty = Math.cos(age * p.tf * 0.7 + p.seed * 9) * p.turb * 0.5 * age;
    return [p.ox + p.vx * k + tx, p.oy + p.vy * k - p.lift * k * k + ty];
  }

  function emit(card, st, r, s, dt, t) {
    const H = r.width, ch = H * 9 / 64, tier = TIER[s.tier];
    const plateTop = s.plateTop, rightMax = Math.max(0.05, Math.min(1, (plateTop - r.top) / (r.height - ch)));
    const flick = 0.75 + 0.25 * Math.sin(t * 3.1 + st.seed * 7) + 0.15 * Math.sin(t * 7.7 + st.seed * 3);
    // 体积焰流：上沿偏右为主（√u 偏向右侧），右沿只取铭牌上沿以上的一段
    st.flameAcc += tier.flame * flick * dt;
    while (st.flameAcc >= 1) {
      st.flameAcc--;
      const top = Math.random() < 0.74;
      const [x, y] = top ? edgePoint(r, 'top', 0.25 + 0.75 * Math.sqrt(Math.random()), ch) : edgePoint(r, 'right', Math.random() * rightMax, ch);
      const red = s.red && Math.random() < 0.5;
      const life = (0.55 + Math.random() * 0.35) * (red ? 1 : s.red ? 0.82 : 1);
      const ang = (45 + Math.random() * 10 + (Math.random() - 0.5) * 18) * Math.PI / 180;
      const vy = -(tier.rise * H + (top ? 0 : (r.top - y))) / life * (0.82 + Math.random() * 0.3);
      spawn(card, st, 'flame', x + (Math.random() - 0.5) * 3 + (top ? 0 : H * 0.06), y - (top ? H * 0.1 : 0), {
        t0: t, life, vx: -vy / Math.tan(ang), vy, lift: H * 0.2, turb: H * 0.05, tf: 6 + Math.random() * 4, seed: Math.random(),
        size: H * tier.size * (red ? 1.05 : s.red ? 0.8 : 1) * (0.8 + Math.random() * 0.45),
        alpha: (red || s.red ? 0.42 : 0.36) * (0.75 + Math.random() * 0.5),
        pal: red ? PAL.red : s.red ? PAL.redCore : s.tier === 'full' && Math.random() < 0.22 ? PAL.white : (s.tier === 'full' || s.tier === 'charged') ? PAL.goldHot : PAL.gold,
      });
    }
    // 余烬：上沿 / 右沿为主，左下沿零星
    st.emberAcc += tier.ember * dt;
    while (st.emberAcc >= 1) {
      st.emberAcc--;
      const q = Math.random();
      const edge = q < 0.62 ? 'top' : q < 0.88 ? 'right' : q < 0.95 ? 'left' : 'bottom';
      const [x, y] = edgePoint(r, edge, edge === 'right' ? Math.random() * Math.max(rightMax, 0.4) : Math.random(), ch);
      const life = 0.8 + Math.random() * 0.75;
      const ang = (50 + (Math.random() - 0.5) * 30) * Math.PI / 180;
      const vy = -(tier.emberRise * H + (r.top - Math.min(y, r.top))) / life * (0.7 + Math.random() * 0.6);
      spawn(card, st, 'ember', x, y, {
        t0: t, life, vx: -vy / Math.tan(ang), vy, lift: H * 0.15, turb: H * 0.1, tf: 9 + Math.random() * 8, seed: Math.random(),
        width: 0.9 + Math.random() * 0.9, die: 0.55 + Math.random() * 0.45, flick: 8 + Math.random() * 14,
        color: s.red && Math.random() < 0.5 ? (Math.random() < 0.5 ? '255,92,50' : '232,52,34') : Math.random() < 0.3 ? COLORS.white : '255,214,128',
      });
    }
  }
  // TP 满爆发：径向火星喷射 + 扩散方环 + 中心短闪
  function burst(card, st, r, s, t) {
    st.burstAt = t;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, H = r.width;
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * TAU, sp = H * (1.6 + Math.random() * 2.2), life = 0.5 + Math.random() * 0.6;
      spawn(card, st, 'ember', cx + Math.cos(a) * H * 0.45, cy + Math.sin(a) * H * 0.45, {
        t0: t, life, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - H * 0.6, lift: H * 0.4, turb: H * 0.05, tf: 10, seed: Math.random(),
        width: 1 + Math.random() * 1.2, die: 1, flick: 6, color: s.red && Math.random() < 0.5 ? '255,92,50' : Math.random() < 0.4 ? COLORS.white : '255,214,128',
      });
    }
  }

  // 焰体：沿气流方向从焰根到焰尾叠 4 团拉长柔光（逐帧闪烁、横向摆动），让粒子焰流有连贯的火舌主体
  function drawBody(r, s, t, idx) {
    const tier = TIER[s.tier];
    if (!tier.flame) return;
    const H = r.width, ang = -50 * Math.PI / 180, dx = Math.cos(ang), dy = Math.sin(ang);
    const rx = r.left + H * 0.74, ry = r.top + H * 0.02, L = tier.rise * H * 0.95, b = tier.bright;
    const layers = s.red ? [['gold', 0.5], ['crimson', 0.9], ['crimson', 0.75], ['deep', 0.6]]
      : s.tier === 'full' ? [['white', 0.55], ['gold', 0.85], ['gold', 0.7], ['amber', 0.55]] : [['gold', 0.7], ['gold', 0.7], ['amber', 0.6], ['amber', 0.45]];
    for (let k = 0; k < 4; k++) {
      const f = k / 3, fl = 0.78 + 0.22 * Math.sin(t * (5.3 + k * 1.7) + idx * 2 + k) * Math.sin(t * 3.1 + k);
      const sway = Math.sin(t * 4.2 + k * 1.3 + idx) * H * 0.05 * (0.4 + f);
      const x = rx + dx * L * f * 0.85 - dy * sway, y = ry + dy * L * f * 0.85 + dx * sway;
      const sz = H * tier.size * 2.3 * (1 - 0.2 * k) * (s.red && k === 0 ? 0.7 : 1);
      g.save(); g.translate(x, y); g.rotate(ang); g.scale(1.55, 0.78 + 0.08 * Math.sin(t * 6 + k));
      g.globalAlpha = Math.min(1, 0.58 * layers[k][1] * b * fl);
      g.drawImage(sprites[layers[k][0]], -sz / 2, -sz / 2, sz, sz);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  function drawGlow(r, s, t, idx) {
    const H = r.width, ch = H * 9 / 64, tier = TIER[s.tier];
    const breath = 0.82 + 0.12 * Math.sin(t * 2.6 + idx * 1.7) + 0.06 * Math.sin(t * 7.3 + idx);
    const k = tier.glow * breath;
    const outer = s.red ? COLORS.crimson : COLORS.amber, inner = s.red ? '255,186,96' : COLORS.gold;
    g.lineJoin = 'miter';
    for (const [w, a, rgb] of [[9, 0.07, outer], [5.5, 0.12, outer], [3, 0.26, inner], [1.4, 0.75, s.tier === 'full' ? COLORS.white : inner]]) {
      framePath(r, ch);
      g.lineWidth = w * (H / 64); g.strokeStyle = 'rgba(' + rgb + ',' + Math.min(1, a * k) + ')'; g.stroke();
    }
    // 沿边呼吸光点：轻微抖动的暖色柔光（上沿/右沿更密更亮）
    const n = 18, img = s.red ? sprites.crimson : sprites.gold, sz = H * (0.16 + 0.1 * tier.glow);
    for (let i = 0; i < n; i++) {
      const edge = i < 7 ? 'top' : i < 12 ? 'right' : i < 15 ? 'left' : 'bottom';
      const u = ((i * 0.618 + idx * 0.37) % 1), [x, y] = edgePoint(r, edge, u, ch);
      const fl = 0.5 + 0.5 * Math.sin(t * (2.2 + (i % 5) * 0.7) + i * 2.1 + idx);
      g.globalAlpha = Math.min(1, (edge === 'top' || edge === 'right' ? 0.5 : 0.3) * k * fl);
      g.drawImage(img, x - sz / 2, y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    if (!alive) return;
    const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016);
    last = t;
    resize();
    const base = root.getBoundingClientRect();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, Hc);
    g.globalCompositeOperation = 'lighter';
    const heroes = getHeroes();
    const list = heroes ? [...heroes.querySelectorAll('.t-hero-card')] : [];
    const cuts = [], bright = new Map();
    const live = new Set(list);
    for (const c of cards.keys()) if (!live.has(c)) cards.delete(c);
    list.forEach((card, idx) => {
      let st = cards.get(card);
      if (!st) { st = { flameAcc: 0, emberAcc: 0, burstSeen: false, burstAt: null, count: 0, seed: Math.random() }; cards.set(card, st); }
      const av = card.querySelector('.t-hero-avatar');
      if (!av) return;
      const ar = av.getBoundingClientRect(), cr = card.getBoundingClientRect(), sc = cr.width / card.offsetWidth || 1;
      const r = { left: ar.left - base.left, top: ar.top - base.top, right: ar.right - base.left, bottom: ar.bottom - base.top, width: ar.width, height: ar.height };
      const plateTop = cr.top - base.top + 8 * sc;
      cuts.push({ x: r.right + 5 * sc, y: plateTop, w: cr.right - base.left + 3 * sc - (r.right + 5 * sc), h: cr.bottom - base.top - plateTop + 2 });
      if (card.matches(':hover')) {
        const sr = card.querySelector('.t-hero-stats')?.getBoundingClientRect();
        if (sr && sr.width) cuts.push({ x: sr.left - base.left - 2, y: sr.top - base.top - 2, w: sr.width + 4, h: sr.height + 4, hard: true });
      }
      const cl = card.classList;
      if (cl.contains('t-down')) return;
      const red = cl.contains('t-low'), full = cl.contains('t-tp-full'), charged = cl.contains('t-tp-half'), cur = cl.contains('t-current');
      const tier = full ? 'full' : charged ? 'charged' : (cur || red) ? 'active' : 'idle';
      const s = { tier, red, plateTop };
      bright.set(card, TIER[tier].bright * (cur && tier !== 'idle' ? 1.08 : 1));
      if (cl.contains('t-tp-burst') && !st.burstSeen) { st.burstSeen = true; burst(card, st, r, s, t); }
      if (!cl.contains('t-tp-burst')) st.burstSeen = false;
      emit(card, st, r, s, dt, t);
      drawGlow(r, s, t, idx);
      drawBody(r, s, t, idx);
      if (st.burstAt != null && t - st.burstAt < 0.7) {
        const e = (t - st.burstAt) / 0.7, grow = r.width * (0.1 + e * 0.9), ch = r.width * 9 / 64;
        const rr = { left: r.left - grow, top: r.top - grow, right: r.right + grow, bottom: r.bottom + grow, width: r.width + grow * 2, height: r.height + grow * 2 };
        framePath(rr, ch + grow * 0.6);
        g.lineWidth = 3 * (1 - e) + 1; g.strokeStyle = 'rgba(' + (red ? '255,170,120' : COLORS.white) + ',' + (0.9 * (1 - e)) + ')'; g.stroke();
        const fs = r.width * (1.2 + e * 1.4);
        g.globalAlpha = 0.55 * (1 - e) * (1 - e);
        g.drawImage(sprites.white, r.left + r.width / 2 - fs / 2, r.top + r.height / 2 - fs / 2, fs, fs);
        g.globalAlpha = 1;
      }
    });
    // 粒子绘制
    g.lineCap = 'round';
    for (const p of pool) {
      if (!p.live) continue;
      const age = (t - p.t0) / p.life;
      if (age >= 1 || !cards.has(p.card) || !bright.has(p.card) || (p.type === 'ember' && age >= p.die)) { p.live = false; free.push(p); const st = cards.get(p.card); if (st) st.count--; continue; }
      if (age < 0) continue;
      if (p.type === 'flame') {
        const [x, y] = posAt(p, age, t);
        const sz = p.size * (0.85 + 0.35 * Math.sin(Math.PI * Math.min(1, age * 2.5))) * (1 - 0.72 * age);
        const env = age < 0.12 ? age / 0.12 : Math.pow((1 - age) / 0.88, 1.4);
        const a = p.alpha * env * (bright.get(p.card) || 0);
        if (a <= 0.01) continue;
        g.globalAlpha = Math.min(1, a);
        g.drawImage(sprites[p.pal[Math.min(3, (age * 4) | 0)]], x - sz / 2, y - sz / 2, sz, sz);
      } else {
        const [x, y] = posAt(p, age, t), back = Math.max(0, age - 0.03 / p.life), [bx, by] = posAt(p, back, t);
        const fade = age > p.die - 0.15 ? Math.max(0, (p.die - age) / 0.15) : 1;
        const a = (0.55 + 0.45 * Math.sin(t * p.flick + p.seed * 40)) * fade * Math.min(1, age * 8) * Math.min(1, (bright.get(p.card) || 0) + 0.2);
        if (a <= 0.02) continue;
        g.globalAlpha = 1;
        g.strokeStyle = 'rgba(' + p.color + ',' + Math.min(1, a) + ')';
        g.lineWidth = p.width;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke();
        const hd = p.width * 3.2;
        g.globalAlpha = Math.min(1, a * 0.8);
        g.drawImage(sprites.white, x - hd / 2, y - hd / 2, hd, hd);
      }
    }
    g.globalAlpha = 1;
    // 文字保护：铭牌信息区（上沿 8px 羽化）/ 悬停属性浮层 / 指令面板
    g.globalCompositeOperation = 'destination-out';
    for (const c of cuts) {
      if (c.hard) { g.fillStyle = '#000'; g.fillRect(c.x, c.y, c.w, c.h); continue; }
      const gr = g.createLinearGradient(0, c.y - 8, 0, c.y + 2);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = gr; g.fillRect(c.x, c.y - 8, c.w, 10);
      g.fillStyle = '#000'; g.fillRect(c.x, c.y + 2, c.w, c.h - 2);
    }
    for (const rect of getAvoidRects()) { g.fillStyle = '#000'; g.fillRect(rect.left - base.left, rect.top - base.top, rect.width, rect.height); }
    g.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return {
    destroy() { alive = false; if (raf) cancelAnimationFrame(raf); canvas.remove(); },
  };
}
