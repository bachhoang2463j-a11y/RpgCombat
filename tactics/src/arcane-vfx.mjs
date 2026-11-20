// ==========================================
// 战棋 P02 特效切片：从 index.html arcaneVfxModule（L5729 起，R08）移植的坐标无关框架
// 移植范围：粒子(addP/burst)、贝塞尔弹道(flyBezier/fly)、驱动循环(ensureDriver)、
//   通用火焰弹(fireProjectile, 240ms 蓄势+340ms 飞行)、敌方法术弹(enemySpellProjectile, 480ms)、
//   播放入口(playArcaneProjectile) 与统一清场(clearFx)。
// 关键适配（相对原实现）：
//   1. 坐标：屏幕像素 → world-root 美术坐标（宿主 pointOf/rectOf 解析），镜头变化不改演出数据。
//   2. 挂载：position:fixed/body → position:absolute/世界层（宿主 mkAnchor/layer）。
//   3. 调度：裸 Set+combatToken → view-scope 代际作用域（dispose 即清，Promise 结算一次 false）。
//   4. 音频：本切片不接音频（坐标验证样本明确无声；后续经 R09 CombatAudioMixer 公共接口接线）。
// 粒子 Canvas 固定美术坐标尺寸，DPR backing store；只在有粒子/飞行物时驱动，空闲不空转。
// ==========================================

const TAU = 6.283185307179586;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// 二次贝塞尔求值（flyBezier 内联公式抽出；供 Node 坐标断言与绘制共用同一公式）
export function bezierPoint(a, ctrl, b, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
  };
}

// 粒子形状子集（原样移植原实现画法；局部坐标，调用方已 translate）
const DRAW = {
  dot(g, p) { g.fillStyle = p.color; g.beginPath(); g.arc(0, 0, p.size, 0, TAU); g.fill(); },
  ring(g, p) { g.strokeStyle = p.color; g.lineWidth = 3 * p.life; g.beginPath(); g.arc(0, 0, 4 + p.size * (1 - p.life) * 40, 0, TAU); g.stroke(); },
  flame(g, p) {
    const r = p.size * (0.4 + p.life * 0.8);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, '#fff7d6'); gr.addColorStop(0.35, p.color); gr.addColorStop(1, 'rgba(120,20,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  },
  smoke(g, p) {
    const r = p.size * (1.6 - p.life);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, p.color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  },
};

export function createArcaneVfxModule(host, getToken) {
  const S = {
    particles: [],
    flights: [],
    particleUntil: 0,
    driver: null,
    canvas: null, ctx: null,
  };

  const timers = new Set();
  const pending = new Set();
  const layers = new Set();
  const after = (ms, fn) => {
    const id = host.after(ms, () => { timers.delete(id); fn(); });
    timers.add(id);
    return id;
  };
  function layer(html, ms) {
    const node = host.layer(html);
    layers.add(node);
    after(ms, () => { layers.delete(node); host.scope.removeNode(node); });
    return node;
  }
  host.scope.onDispose(clearFx);

  // ---- 粒子 Canvas（固定美术 1000×1000，DPR backing；挂 canvasHolder） ----
  function ensureCanvas() {
    if (S.canvas && S.canvas.isConnected) return;
    const c = document.createElement('canvas');
    c.setAttribute('data-tactics-fx', 'canvas');
    c.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none;';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = 1000 * dpr; c.height = 1000 * dpr;
    host.canvasHolder.appendChild(c);
    S.canvas = c;
    S.ctx = c.getContext('2d');
    S.ctx.scale(dpr, dpr);
  }

  function render() {
    const g = S.ctx;
    if (!g || !S.canvas) return;
    g.clearRect(0, 0, 1000, 1000);
    for (let i = 0; i < S.particles.length; i++) {
      const p = S.particles[i];
      g.save();
      g.globalAlpha = Math.min(1, p.life * 1.4);
      g.globalCompositeOperation = p.blend;
      g.translate(p.x, p.y);
      if (p.shape !== 'streak' && p.shape !== 'spark') g.rotate(p.rot);
      DRAW[p.shape](g, p);
      g.restore();
    }
  }

  function step(dt) {
    const k = dt / 16.7;
    for (const f of S.flights) f.step(f.progress());
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const p = S.particles[i];
      p.vx *= Math.pow(p.drag, k); p.vy *= Math.pow(p.drag, k);
      p.vy += p.grav * k;
      p.x += p.vx * k; p.y += p.vy * k;
      if (p.trail) { (p.hist || (p.hist = [])).unshift([p.x, p.y]); if (p.hist.length > p.trail) p.hist.pop(); }
      p.rot += p.vr * k;
      p.life = Math.min(p.life - p.decay * k, Math.max(0, (p.expiresAt - performance.now()) * p.decay / 16.7));
      if (p.life <= 0) S.particles.splice(i, 1);
    }
  }

  function releaseIdle() {
    if (S.particles.length || S.flights.length || !S.canvas) return;
    S.canvas.remove(); S.canvas = null; S.ctx = null;
    if (S.driver) { S.driver(); S.driver = null; }
  }

  // 驱动循环：只在有内容时运行；返回停止函数
  function ensureDriver() {
    if (S.driver) return;
    let last = performance.now();
    S.driver = host.loop((now) => {
      const dt = Math.max(1, now - last); last = now;
      step(dt);
      render();
      if (!S.particles.length && !S.flights.length) {
        if (S.ctx) S.ctx.clearRect(0, 0, 1000, 1000);
        releaseIdle();
        return false; // 停止循环
      }
    });
  }

  function addP(o) {
    const p = Object.assign({ vx: 0, vy: 0, life: 1, decay: 0.02, size: 3, color: '#fde68a', grav: 0, drag: 0.98, rot: 0, vr: 0, shape: 'dot', blend: 'lighter' }, o);
    p.expiresAt = performance.now() + p.life / p.decay * 16.7;
    S.particleUntil = Math.max(S.particleUntil, p.expiresAt);
    S.particles.push(p);
    ensureCanvas(); ensureDriver();
  }
  function burst(n, fn) { for (let i = 0; i < n; i++) addP(fn(i)); }

  // ---- 贝塞尔弹道（原 flyBezier 原样移植；a/ctrl/b 为世界美术坐标） ----
  function flyBezier(a, ctrl, b, dur, draw, done, ease) {
    ease = ease || (k => k * k);
    const startedAt = performance.now();
    const f = {
      age: 0, dur, timer: null,
      step(pr) {
        const t = ease(pr);
        const pt = bezierPoint(a, ctrl, b, t);
        draw(pt.x, pt.y, pr);
      },
      progress() { return Math.min(1, (performance.now() - startedAt) / dur); },
    };
    S.flights.push(f);
    ensureCanvas(); ensureDriver();
    f.timer = after(dur, () => {
      const index = S.flights.indexOf(f);
      if (index >= 0) S.flights.splice(index, 1);
      f.step(1);
      if (done) done();
    });
    return f;
  }
  function fly(a, b, lift, dur, draw, done, ease) {
    return flyBezier(a, { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift }, b, dur, draw, done, ease);
  }

  // ---- ① 通用火焰弹（原 fireProjectile 原样移植，去音频；240 蓄 + 340 飞） ----
  // from/to: unitId；muzzle 由单位世界中心 + facing 方向偏移取得（不用"头像屏幕顶部-16px"）
  function fireProjectile(fromId, toId, dodged, token, onImpact) {
    const from = host.rectOf(fromId), to = host.rectOf(toId);
    const facing = host.getFacing ? host.getFacing(fromId) : 0;
    const rad = (facing || 0) * Math.PI / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const a = { x: from.x + dx * 16, y: from.y + dy * 16 };
    const b = { x: to.x, y: to.y };
    burst(22, () => {
      const ang = Math.random() * TAU, d = rnd(40, 70);
      return { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d, vx: -Math.cos(ang) * d / 9, vy: -Math.sin(ang) * d / 9, drag: 0.86, decay: 0.06, size: rnd(1.2, 2.4), color: pick(['#fdba74', '#f97316', '#fde68a']) };
    });
    layer('<div style="position:absolute; left:' + (a.x - 32) + 'px; top:' + (a.y - 32) + 'px; width:64px; height:64px; border-radius:50%; background: radial-gradient(circle, #fff7d6 0%, #fb923c 35%, rgba(220,38,38,0.45) 60%, transparent 72%);"></div>', 320);
    after(240, () => {
      if (token !== getToken()) return; // 代际失效即停
      fly(a, b, 90, 340, (x, y) => {
        if (token !== getToken()) return;
        addP({ x, y, shape: 'flame', size: 16, decay: 0.2, color: '#fb923c' });
        burst(5, () => ({ x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: rnd(-1, 1), vy: rnd(-1.6, -0.3), drag: 0.94, decay: rnd(0.04, 0.07), size: rnd(6, 11), shape: 'flame', color: pick(['#f97316', '#ef4444', '#fbbf24']) }));
        for (let j = 0; j < 2; j++) { const an = performance.now() / 45 + j * 3.14; addP({ x: x + Math.cos(an) * 11, y: y + Math.sin(an) * 11, decay: 0.3, size: 2, color: '#fff7d6' }); }
      }, () => {
        if (token !== getToken()) return;
        if (onImpact) onImpact();
        if (token !== getToken() || dodged) return;
        layer('<div style="position:absolute; left:' + (b.x - 70) + 'px; top:' + (b.y - 70) + 'px; width:140px; height:140px; border-radius:50%; background: radial-gradient(circle, #fff 0%, #fdba74 30%, rgba(239,68,68,0.5) 58%, transparent 72%);"></div>', 420);
        burst(2, i => ({ x: b.x, y: b.y, shape: 'ring', size: 1.8 + i, decay: 0.07 - i * 0.02, color: i ? '#f97316' : '#fde68a' }));
        burst(40, () => { const an = Math.random() * TAU, s = rnd(2, 8); return { x: b.x, y: b.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 1, grav: 0.13, drag: 0.93, decay: rnd(0.025, 0.05), size: rnd(1, 2.2), color: pick(['#fde68a', '#fb923c', '#fff7d6']) }; });
        burst(10, () => ({ x: b.x + rnd(-14, 14), y: b.y + rnd(-14, 14), vx: rnd(-1, 1), vy: rnd(-2, -0.5), drag: 0.95, decay: rnd(0.03, 0.05), size: rnd(12, 20), shape: 'flame', color: '#f97316' }));
        burst(9, () => ({ x: b.x + rnd(-24, 24), y: b.y + rnd(-18, 18), vx: rnd(-0.3, 0.3), vy: rnd(-0.9, -0.4), drag: 0.99, decay: 0.011, size: rnd(16, 28), shape: 'smoke', blend: 'source-over', color: 'rgba(40,32,30,0.55)' }));
      });
    });
  }

  // ---- ② 敌方紫色法术弹（原 enemySpellProjectile 原样移植，去音频；480ms） ----
  function enemySpellProjectile(fromId, toId, dodged, token, onImpact) {
    const from = host.rectOf(fromId), to = host.rectOf(toId);
    const a = { x: from.x - 20, y: from.y - 10 }, b = { x: to.x, y: to.y };
    fly(a, b, 30, 480, (x, y) => {
      if (token !== getToken()) return;
      addP({ x, y, size: 9, decay: 0.22, color: '#c084fc' });
      addP({ x, y, size: 4, decay: 0.3, color: '#fff' });
      burst(3, () => ({ x: x + rnd(-5, 5), y: y + rnd(-5, 5), vx: rnd(0.5, 1.5), vy: rnd(-0.5, 0.5), drag: 0.94, decay: 0.06, size: rnd(1.5, 3), color: pick(['#7c3aed', '#a855f7']) }));
    }, () => {
      if (token !== getToken()) return;
      if (onImpact) onImpact();
      if (token !== getToken() || dodged) return;
      burst(24, () => { const an = Math.random() * TAU, s = rnd(1.5, 5); return { x: b.x, y: b.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.93, decay: 0.04, size: rnd(1, 2.4), color: pick(['#e9d5ff', '#c084fc', '#7c3aed']) }; });
    }, k => k);
  }

  // ---- 播放入口（原 playArcaneProjectile 适配：Promise dispose 结算一次 false） ----
  function playArcaneProjectile(type, fromId, toId, dodged = false) {
    if (!fromId || !toId) return Promise.resolve(true);
    const token = getToken();
    if (!token || !host.scope.isLive) return Promise.resolve(false);
    ensureCanvas(); ensureDriver();
    return new Promise(resolve => {
      let settled = false;
      const done = ok => { if (settled) return; settled = true; pending.delete(done); resolve(!!ok && token === getToken()); };
      pending.add(done); // 代际失效结算一次 false
      if (type === 'fire') fireProjectile(fromId, toId, !!dodged, token, () => done(true));
      else if (type === 'enemy_spell') enemySpellProjectile(fromId, toId, !!dodged, token, () => done(true));
      else done(false);
    });
  }

  // ---- 统一清场（原 clearArcaneFx 的本切片子集；单个 handle 取消不走这里） ----
  function clearFx() {
    timers.forEach(id => host.scope.cancelAfter(id)); timers.clear();
    pending.forEach(done => done(false)); pending.clear();
    layers.forEach(node => host.scope.removeNode(node)); layers.clear();
    S.flights.length = 0;
    S.particles.length = 0;
    S.particleUntil = 0;
    if (S.driver) { S.driver(); S.driver = null; }
    if (S.canvas) { S.canvas.remove(); S.canvas = null; S.ctx = null; }
  }

  return { playArcaneProjectile, clearFx, state: S };
}
