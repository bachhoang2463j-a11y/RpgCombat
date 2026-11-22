// ==========================================
// 界面与步伐合成音（WebAudio 现场合成，不加载采样）：
//   hover（极轻，节流）/ select / lock / confirm / cancel / deny / turn（我方轮次提示）/ enemyTurn / step（脚步）/ endTurn
// 输出接回合制 CombatAudioMixer 的 aux 轨（K 类），与战斗音同一上下文与清场：混音器 clear 后自动重建。
// 风格：短、干净、偏木质/金属轻敲，配合深色哥特界面；不做旋律铺底。
// ==========================================

export function createUiSfx(mixer) {
  let noiseBuf = null, noiseCtx = null;
  const last = new Map();

  function ctx() {
    const c = mixer.context();
    if (!c) return null;
    if (c.state === 'suspended') c.resume();
    return c;
  }
  function out() { return mixer.output('aux', 'K'); }
  function noise(c) {
    if (noiseBuf && noiseCtx === c) return noiseBuf;
    noiseCtx = c;
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  // 单音：正弦/三角/方波 + 指数包络 + 可选滑音
  function tone(c, t, { type = 'sine', f0, f1, dur, vol, attack = 0.004, pan = 0, lp = 0 }) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    let dst = out();
    if (pan) { const p = c.createStereoPanner(); p.pan.value = pan; p.connect(dst); dst = p; }
    node.connect(g); g.connect(dst);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // 噪声敲击：带通噪声短脉冲（木/布/石）
  function tick(c, t, { freq, q = 1.2, dur, vol, type = 'bandpass', pan = 0 }) {
    const s = c.createBufferSource(); s.buffer = noise(c);
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let dst = out();
    if (pan) { const p = c.createStereoPanner(); p.pan.value = pan; p.connect(dst); dst = p; }
    s.connect(f); f.connect(g); g.connect(dst);
    s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
  }
  function gate(kind, ms) {
    const now = performance.now();
    if (now - (last.get(kind) || 0) < ms) return false;
    last.set(kind, now); return true;
  }

  const SFX = {
    hover(c, t) { tone(c, t, { type: 'sine', f0: 2400, dur: 0.035, vol: 0.018 }); },
    select(c, t) {
      tick(c, t, { freq: 2200, q: 2.5, dur: 0.03, vol: 0.12 });
      tone(c, t, { type: 'triangle', f0: 880, f1: 1320, dur: 0.07, vol: 0.06 });
    },
    lock(c, t) {
      tick(c, t, { freq: 3200, q: 4, dur: 0.025, vol: 0.10 });
      tone(c, t, { type: 'triangle', f0: 1046, dur: 0.06, vol: 0.06 });
      tone(c, t + 0.05, { type: 'triangle', f0: 1568, dur: 0.09, vol: 0.05 });
    },
    confirm(c, t) {
      tick(c, t, { freq: 900, q: 1, dur: 0.06, vol: 0.14 });
      tone(c, t, { type: 'sine', f0: 523, f1: 784, dur: 0.12, vol: 0.07 });
      tone(c, t + 0.02, { type: 'triangle', f0: 1568, dur: 0.14, vol: 0.035 });
    },
    cancel(c, t) {
      tone(c, t, { type: 'triangle', f0: 740, f1: 440, dur: 0.11, vol: 0.06 });
      tick(c, t, { freq: 1400, q: 1.5, dur: 0.04, vol: 0.06 });
    },
    deny(c, t) {
      tone(c, t, { type: 'square', f0: 180, dur: 0.07, vol: 0.035, lp: 900 });
      tone(c, t + 0.09, { type: 'square', f0: 150, dur: 0.09, vol: 0.035, lp: 900 });
    },
    turn(c, t) {
      tone(c, t, { type: 'sine', f0: 659, dur: 0.35, vol: 0.05 });
      tone(c, t + 0.07, { type: 'sine', f0: 988, dur: 0.4, vol: 0.04 });
      tone(c, t + 0.14, { type: 'triangle', f0: 1319, dur: 0.45, vol: 0.025 });
      tick(c, t, { freq: 5200, q: 6, dur: 0.18, vol: 0.03 });
    },
    enemyTurn(c, t) {
      tone(c, t, { type: 'sawtooth', f0: 98, f1: 82, dur: 0.5, vol: 0.05, lp: 420 });
      tone(c, t, { type: 'sine', f0: 196, f1: 165, dur: 0.45, vol: 0.04 });
      tick(c, t, { freq: 300, q: 0.8, dur: 0.25, vol: 0.06, type: 'lowpass' });
    },
    endTurn(c, t) {
      tick(c, t, { freq: 1800, q: 0.7, dur: 0.22, vol: 0.07 });
      tone(c, t, { type: 'sine', f0: 880, f1: 523, dur: 0.22, vol: 0.05 });
    },
    // 脚步：石地轻踏（低频闷击 + 鞋底擦声），左右交替微声像
    step(c, t, opts) {
      const pan = (opts && opts.pan) || 0;
      tick(c, t, { freq: 180 + Math.random() * 60, q: 0.9, dur: 0.07, vol: 0.20, type: 'lowpass', pan });
      tick(c, t + 0.005, { freq: 2600 + Math.random() * 800, q: 1.8, dur: 0.035, vol: 0.035, pan });
    },
    heavyStep(c, t) {
      tick(c, t, { freq: 90, q: 0.8, dur: 0.16, vol: 0.32, type: 'lowpass' });
      tone(c, t, { type: 'sine', f0: 62, f1: 45, dur: 0.18, vol: 0.10 });
    },
    // ---- 职业/分级步伐 ----
    armorStep(c, t, o) {        // 防守者：重靴 + 甲片轻响
      const pan = (o && o.pan) || 0;
      tick(c, t, { freq: 140, q: 0.8, dur: 0.11, vol: 0.30, type: 'lowpass', pan });
      tick(c, t + 0.012, { freq: 4200 + Math.random() * 900, q: 9, dur: 0.07, vol: 0.05, pan });
      tone(c, t + 0.01, { type: 'triangle', f0: 2900 + Math.random() * 300, dur: 0.06, vol: 0.012, pan });
    },
    berserkStep(c, t, o) {      // 狂战士：重踏 + 粗重喘息
      const pan = (o && o.pan) || 0;
      tick(c, t, { freq: 160, q: 0.9, dur: 0.09, vol: 0.28, type: 'lowpass', pan });
      if (Math.random() < 0.45) tick(c, t + 0.04, { freq: 700, q: 0.6, dur: 0.22, vol: 0.05, pan });
    },
    windStep(c, t, o) {         // 风行者：轻点地 + 风声掠过
      const pan = (o && o.pan) || 0;
      tick(c, t, { freq: 260, q: 1, dur: 0.04, vol: 0.10, type: 'lowpass', pan });
      tick(c, t, { freq: 1800 + Math.random() * 1200, q: 0.7, dur: 0.16, vol: 0.035, pan });
    },
    softStep(c, t, o) {         // 隐匿者：极轻布料擦声
      tick(c, t, { freq: 3200 + Math.random() * 1500, q: 1.4, dur: 0.05, vol: 0.018, pan: (o && o.pan) || 0 });
    },
    poisonDrag(c, t, o) {       // 灾厄使：湿滑拖步 + 气泡
      const pan = (o && o.pan) || 0;
      tick(c, t, { freq: 500, q: 0.8, dur: 0.14, vol: 0.06, pan });
      tone(c, t + 0.03, { type: 'sine', f0: 520 + Math.random() * 260, f1: 900, dur: 0.05, vol: 0.02, pan });
    },
    holyStep(c, t, o) {         // 圣职者：柔和脚步 + 轻铃
      const pan = (o && o.pan) || 0;
      tick(c, t, { freq: 200, q: 0.9, dur: 0.06, vol: 0.12, type: 'lowpass', pan });
      tone(c, t + 0.01, { type: 'sine', f0: 1760 + (Math.random() < 0.5 ? 0 : 220), dur: 0.22, vol: 0.012, pan });
    },
    marchStep(c, t, o) {        // 征伐者：军靴 + 金属扣件
      const pan = (o && o.pan) || 0;
      tick(c, t, { freq: 170, q: 1, dur: 0.08, vol: 0.26, type: 'lowpass', pan });
      tick(c, t + 0.008, { freq: 5200, q: 6, dur: 0.04, vol: 0.04, pan });
    },
    scuttle(c, t, o) {          // 杂兵：小碎步
      const pan = (o && o.pan) || 0;
      tick(c, t, { freq: 320 + Math.random() * 120, q: 1.2, dur: 0.035, vol: 0.12, type: 'lowpass', pan });
      tick(c, t + 0.06, { freq: 360 + Math.random() * 120, q: 1.2, dur: 0.03, vol: 0.08, type: 'lowpass', pan });
    },
    bossStomp(c, t) {           // BOSS：沉重踏地 + 低频冲击
      tick(c, t, { freq: 70, q: 0.7, dur: 0.28, vol: 0.42, type: 'lowpass' });
      tone(c, t, { type: 'sine', f0: 55, f1: 32, dur: 0.34, vol: 0.18 });
      tick(c, t + 0.02, { freq: 900, q: 0.6, dur: 0.18, vol: 0.04 });
    },
    arcaneGlide(c, t) {         // 施法者：起飞嗡鸣（无脚步）
      tone(c, t, { type: 'sine', f0: 220, f1: 330, dur: 0.6, vol: 0.035, attack: 0.08 });
      tone(c, t, { type: 'sine', f0: 660, f1: 990, dur: 0.5, vol: 0.012, attack: 0.08 });
    },
    shadowGlide(c, t) {         // 精英：暗影滑行低吟
      tone(c, t, { type: 'sawtooth', f0: 110, f1: 82, dur: 0.6, vol: 0.03, attack: 0.08, lp: 500 });
      tick(c, t, { freq: 400, q: 0.6, dur: 0.4, vol: 0.03 });
    },
    glideStop(c, t) { tone(c, t, { type: 'sine', f0: 440, f1: 260, dur: 0.18, vol: 0.02 }); },
    sparkle(c, t, o) {          // 悬浮行进的细碎闪光
      tone(c, t, { type: 'sine', f0: 2600 + Math.random() * 1400, dur: 0.07, vol: 0.012, pan: (o && o.pan) || 0 });
    },
    queueInsert(c, t) {         // 行动条插队：上扬掠过 + 叮
      tick(c, t, { freq: 1200, q: 0.6, dur: 0.22, vol: 0.05 });
      tone(c, t, { type: 'triangle', f0: 660, f1: 1320, dur: 0.18, vol: 0.04 });
      tone(c, t + 0.14, { type: 'sine', f0: 1760, dur: 0.25, vol: 0.03 });
    },
    // ---- 战棋场地动作 ----
    sprint(c, t) {              // 冲刺：风压掠过 + 上扬
      tick(c, t, { freq: 900, q: 0.5, dur: 0.32, vol: 0.09 });
      tone(c, t, { type: 'triangle', f0: 330, f1: 880, dur: 0.24, vol: 0.05 });
    },
    charge(c, t) {              // 蓄力投入：低鸣汇聚
      tone(c, t, { type: 'sine', f0: 196, f1: 392, dur: 0.45, vol: 0.06, attack: 0.05 });
      tone(c, t + 0.08, { type: 'triangle', f0: 784, f1: 1175, dur: 0.35, vol: 0.025, attack: 0.04 });
    },
    jumpCrouch(c, t) { tick(c, t, { freq: 320, q: 0.9, dur: 0.08, vol: 0.10, type: 'lowpass' }); },
    jumpTakeoff(c, t) {         // 起跳：蹬地 + 风声上扫
      tick(c, t, { freq: 160, q: 0.8, dur: 0.09, vol: 0.24, type: 'lowpass' });
      tick(c, t + 0.02, { freq: 1400, q: 0.5, dur: 0.30, vol: 0.06 });
      tone(c, t, { type: 'sine', f0: 260, f1: 620, dur: 0.22, vol: 0.035 });
    },
    jumpLand(c, t) {            // 落地：闷击 + 碎石
      tick(c, t, { freq: 110, q: 0.8, dur: 0.20, vol: 0.34, type: 'lowpass' });
      tone(c, t, { type: 'sine', f0: 80, f1: 48, dur: 0.20, vol: 0.12 });
      tick(c, t + 0.03, { freq: 2600, q: 1.2, dur: 0.08, vol: 0.04 });
    },
    shove(c, t) {               // 推：布料与身体撞击
      tick(c, t, { freq: 240, q: 0.7, dur: 0.12, vol: 0.26, type: 'lowpass' });
      tick(c, t + 0.01, { freq: 900, q: 0.6, dur: 0.12, vol: 0.06 });
    },
    impact(c, t) {              // 撞墙：重击 + 石屑
      tick(c, t, { freq: 90, q: 0.7, dur: 0.30, vol: 0.42, type: 'lowpass' });
      tone(c, t, { type: 'sine', f0: 60, f1: 34, dur: 0.30, vol: 0.16 });
      tick(c, t + 0.02, { freq: 3200, q: 0.9, dur: 0.14, vol: 0.06 });
    },
    lift(c, t) {                // 背起：用力 + 布料
      tick(c, t, { freq: 700, q: 0.6, dur: 0.20, vol: 0.06 });
      tone(c, t, { type: 'triangle', f0: 220, f1: 330, dur: 0.18, vol: 0.03 });
    },
    drop(c, t) {                // 放下：轻放落地
      tone(c, t, { type: 'triangle', f0: 330, f1: 220, dur: 0.16, vol: 0.03 });
      tick(c, t + 0.12, { freq: 200, q: 0.9, dur: 0.08, vol: 0.14, type: 'lowpass' });
    },
  };
  const RATE = { hover: 60, select: 50, step: 40, heavyStep: 60, sparkle: 60 };

  return function play(kind, opts) {
    const fn = SFX[kind];
    if (!fn || !gate(kind, RATE[kind] || 30)) return;
    const c = ctx();
    if (!c) return;
    fn(c, c.currentTime + 0.005, opts);
  };
}
