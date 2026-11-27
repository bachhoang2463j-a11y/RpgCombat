// P07 原版还原轮 B–D：WebM 抠黑底 / L3·L4 屏幕氛围 / 多目标 buff 串行 / 击杀聚合 / 召唤结果 / 特写提取与清理。
// 只用最小 DOM 桩驱动真实函数，不复制被测逻辑。
import { readFileSync } from 'node:fs';
import { parseSkill } from '../../../tactics/src/parser.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';
import { playWebmFx, playSupportEffects, FX_WEBM_KEY_MAX } from '../../../tactics/src/fx-library.mjs';
import { startAtmos, atmosStyleOf, ATMOS_STYLES } from '../../../tactics/src/screen-atmos.mjs';
import { createActionDirector } from '../../../tactics/src/action-director.mjs';
import { SHOWPIECES } from '../../../tactics/src/screen-showpiece.mjs';

const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

function el(tag) {
  const attrs = {}, kids = [];
  const e = { tag, attrs, kids, style: {}, animations: [], isConnected: true, parentNode: null,
    setAttribute(k, v) { attrs[k] = String(v); }, getAttribute: k => attrs[k] ?? null, removeAttribute(k) { delete attrs[k]; },
    appendChild(c) { kids.push(c); c.parentNode = e; c.isConnected = true; return c; },
    remove() { e.isConnected = false; e.removed = true; },
    animate(frames, options) { const a = { frames, options }; e.animations.push(a); return a; } };
  Object.defineProperty(e, 'style', { value: { setProperty(k, v) { this[k] = v; } } });
  return e;
}

// ---------- WebM：原版黑底转透明 ----------
function webmCases() {
  const out = [];
  const created = [];
  let frameCb = null, pixels = null;
  globalThis.document = { createElement(tag) {
    const e = el(tag); created.push(e);
    if (tag === 'video') Object.assign(e, { paused: false, ended: false, duration: 2, currentTime: 0.5, videoWidth: 1920, videoHeight: 1080,
      play() { return Promise.resolve(); }, pause() { e.paused = true; }, load() {}, requestVideoFrameCallback(fn) { frameCb = fn; } });
    if (tag === 'canvas') e.getContext = () => ({ clearRect() {}, drawImage() {},
      getImageData: (x, y, w, h) => ({ data: pixels }), putImageData(img) { e.put = Array.from(img.data); } });
    return e;
  } };
  globalThis.requestAnimationFrame = fn => { frameCb = fn; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  const layer = el('div');
  const ctx = { fx: { top: () => layer }, av: { ASSET_BASE: 'https://assets' } };
  const cv = playWebmFx(ctx, 'heart.mp4', 100, 200, 220, { ms: 900 });
  const v = created.find(e => e.tag === 'video');
  v.onloadedmetadata();
  out.push(ok('TP7AV-B WebM 走 Canvas 抠图：隐藏 video、默认不加 screen 混合', cv.tag === 'canvas' && v.style.display === 'none' && !cv.style.mixBlendMode && /mix-blend-mode/.test(cv.style.cssText || '') === false
    && cv.attrs['data-webm'] === 'heart.mp4' && v.src === 'https://assets/heart.mp4', { css: cv.style.cssText, display: v.style.display }));
  out.push(ok('TP7AV-B 抠图画布按原分辨率等比、宽度封顶 960', cv.width === Math.min(FX_WEBM_KEY_MAX, 440) && cv.height === Math.round(cv.width / (16 / 9)) && cv.style.width === '220px', { w: cv.width, h: cv.height, cssW: cv.style.width }));
  return Promise.resolve().then(() => {
    // 黑(5)、暗(46)、亮(200) 三像素；原 alpha 255
    pixels = new Uint8ClampedArray([5, 5, 5, 255, 46, 10, 10, 255, 200, 180, 90, 255]);
    frameCb && frameCb();
    const a = cv.put ? [cv.put[3], cv.put[7], cv.put[11]] : null;
    out.push(ok('TP7AV-B 原版阈值：<12 全透明、12–80 渐进、亮部保留', a && a[0] === 0 && a[1] === Math.floor(255 * ((46 - 12) / 68)) && a[2] === 255, a));
    v.currentTime = 1.825;   // 尾段 0.35s 内：fade=(2-1.825)/0.35=0.5
    pixels = new Uint8ClampedArray([200, 180, 90, 255]);
    frameCb();
    out.push(ok('TP7AV-B 尾段 0.35s 渐隐', cv.put && cv.put[3] === Math.floor(255 * 0.5), cv.put && cv.put[3]));
    const cv2 = playWebmFx(ctx, 'fog.mp4', 0, 0, 400, { cover: 400 });
    const v2 = created.filter(e => e.tag === 'video').pop(); v2.onloadedmetadata();
    out.push(ok('TP7AV-B 范围类 cover：短边=真实直径（16:9 宽按比例外扩）', cv2.style.height === '400px' && parseFloat(cv2.style.width) > 700, { w: cv2.style.width, h: cv2.style.height }));
    const cv3 = playWebmFx(ctx, 'x.webm', 0, 0, 100);
    const v3 = created.filter(e => e.tag === 'video').pop(); v3.onloadedmetadata();
    return Promise.resolve().then(() => {
      pixels = null;   // 像素读取抛错（等同跨域污染）：按原版降级 screen
      frameCb();
      out.push(ok('TP7AV-B 像素读取失败才降级 screen', cv3.style.mixBlendMode === 'screen', cv3.style.mixBlendMode));
      let finished = 0; cv3.handle.onFinish.add(() => finished++);
      v3.ended = true; frameCb();
      out.push(ok('TP7AV-B 播完即释放 canvas/video', cv3.removed && v3.removed && v3.paused, { cv: cv3.removed, v: v3.removed }));
      out.push(ok('TP7AV-B 播完句柄：doneAt 取真实时长、释放只通知一次（重狙等全段播完）', finished === 1 && Math.abs(cv3.handle.doneAt - Date.now() - 2000) < 1500 && (v3.onended(), finished === 1), { finished, doneIn: cv3.handle.doneAt - Date.now() }));
      return out;
    });
  });
}

// ---------- L3/L4 屏幕氛围 ----------
function atmosCases() {
  const out = [];
  const timers = [];
  const made = [];
  const fx = {
    screen(html, ms) {
      const root = el('div'); root.html = html; root.life = ms;
      const count = re => (html.match(re) || []).length;
      const bands = Array.from({ length: count(/data-atmos-band=/g) }, () => el('div'));
      const svgs = Array.from({ length: count(/data-atmos-svg=/g) }, () => el('svg'));
      const card = /data-atmos-card/.test(html) ? el('div') : null;
      root.querySelectorAll = sel => sel.includes('band') ? bands : svgs;
      root.querySelector = () => card;
      root.bands = bands; root.svgs = svgs; root.card = card;
      made.push(root);
      return { firstChild: root };
    },
    ground(html, ms) { const r = el('i'); r.html = html; made.push(r); return { firstChild: r }; },
  };
  const after = (ms, fn) => timers.push({ ms, fn });
  const h3 = startAtmos(fx, { style: 'fire', grade: 'L3', chargeMs: 650, totalMs: 2430, skillName: '压缩爆燃', shape: { center: { x: 10, y: 6 }, radius: 3 }, after });
  const root3 = made[0], ring3 = made[1];
  out.push(ok('TP7AV-L L3：四边边带 + 同风格 SVG，挂视口屏幕层，无技能名卡', root3.bands.length === 4 && root3.svgs.length === 4 && !root3.card && /data-grade="L3"/.test(root3.html)
    && root3.html.includes(ATMOS_STYLES.fire.c1) && /pointer-events:none/.test(root3.html), { bands: root3.bands.length }));
  const depth = Math.max(...[...root3.html.matchAll(/data-atmos-band="\w+" style="position:absolute;[^"]*?(?:height|width):(\d+)%/g)].map(m => +m[1]));
  out.push(ok('TP7AV-L 中心保留阅读窗口：L3 边带深度≤22%', depth === 22, depth));
  out.push(ok('TP7AV-L 真实范围环：世界层、半径=规则半径×50', ring3 && /left:500px;top:300px;width:300px/.test(ring3.html), ring3 && ring3.html.slice(0, 120)));
  const gatherFrames = root3.bands[0].animations[0].frames;
  out.push(ok('TP7AV-L 蓄势：边带自屏幕边缘推入（scale 0.08→0.72），未到最深', gatherFrames[0].transform === 'scale(0.08)' && gatherFrames[1].transform === 'scale(0.72)', gatherFrames));
  h3.lower();
  const lowerOpacity = root3.bands[0].animations.at(-1).frames.at(-1).opacity;
  out.push(ok('TP7AV-L 首个真实揭示即降低遮挡（≤0.3）', lowerOpacity <= 0.3 && root3.bands[0].animations.length === 3, lowerOpacity));
  h3.end(); h3.end();
  timers.filter(t => t.ms === 520).forEach(t => t.fn());
  out.push(ok('TP7AV-L 余韵外撤后节点移除、幂等', root3.removed && ring3.removed && root3.bands[0].animations.at(-1).frames.at(-1).opacity === 0, { root: root3.removed, ring: ring3.removed }));
  made.length = 0;
  startAtmos(fx, { style: 'holy', grade: 'L4', chargeMs: 1220, totalMs: 3200, skillName: '圣域帷幕', casterName: '埃利奥特', after });
  const root4 = made[0];
  const depth4 = Math.max(...[...root4.html.matchAll(/data-atmos-band="\w+" style="position:absolute;[^"]*?(?:height|width):(\d+)%/g)].map(m => +m[1]));
  const cardFrames = root4.card && root4.card.animations[0].frames;
  out.push(ok('TP7AV-L L4：更深边压(28%)+技能身份卡，爆发前退场', depth4 === 28 && root4.card && cardFrames.at(-1).opacity === 0 && root4.card.animations[0].options.duration <= 1220
    && /圣域帷幕/.test(root4.html) && /埃利奥特/.test(root4.html), { depth4, dur: root4.card && root4.card.animations[0].options.duration }));
  out.push(ok('TP7AV-L 风格按条目身份，未登记按伤害类型兜底', atmosStyleOf({ id: 'fire-blast' }) === 'fire' && atmosStyleOf({ id: 'xenon-blight-fog' }) === 'poison'
    && atmosStyleOf({ id: 'x' }, { damageType: '远程' }) === 'gun' && atmosStyleOf({ id: 'x' }, { damageType: '近战' }) === 'blood'));
  const src = readFileSync(new URL('../../../tactics/src/action-director.mjs', import.meta.url), 'utf8');
  out.push(ok('TP7AV-L 导演只对 L3/L4 启动氛围，揭示即 lower、条目结束即 end',
    /grade === 'L3' \|\| grade === 'L4'\) \? startAtmos/.test(src) && (src.match(/if \(atmos\) atmos\.lower\(\);/g) || []).length === 2 && /await entry\.play\(ctx\);\s*\n\s*if \(atmos\) atmos\.end\(\);/.test(src)));
  return out;
}

// ---------- 多目标 buff：原版逐标签目标错峰，SVG余波重叠（寂静指令 增攻→瞄准 两轮） ----------
async function serialCases() {
  const out = [];
  const log = [];
  const handles = [];
  const waits = [];
  let time = 0, settled = false;
  const effects = [
    { kind: 'buff', field: 'atk', value: 10, targetId: 'A' },
    { kind: 'buff', field: 'atk', value: 10, targetId: 'B' },
    { kind: 'buff', field: 'hit', value: 20, targetId: 'A' },
    { kind: 'buff', field: 'hit', value: 20, targetId: 'B' },
    { kind: 'buff', field: 'hit', value: -20, targetId: 'C' },
  ];
  const ctx = {
    result: { effects }, audioContext: {},
    av: {
      CombatAudioMixer: { withContext: (_, fn) => fn() },
      playSound: (k) => log.push('sound:' + k),
      playGenericSupportFx(entity, type, { soundKey, onImpact }) {
        log.push('start:' + entity.id + ':' + type + ':' + soundKey);
        onImpact();
        const h = { onFinish: new Set(), cancel() {}, id: entity.id, startedAt: time, doneAt: time + 1100 / 1.5 };
        handles.push(h);
        return h;
      },
    },
    ent: id => ({ id }),
    centerOf: () => ({ x: 1, y: 1 }),
    fx: { top: () => ({ firstChild: el('b'), children: [] }) },
    revealEffect: e => log.push('reveal:' + e.targetId + ':' + e.field),
    wait: ms => { waits.push(ms); time += ms; return Promise.resolve(true); },
    awaitHandle: h => new Promise(res => h.onFinish.add(res)),
  };
  const run = playSupportEffects(ctx).then(ok => { settled = true; return ok; });
  await new Promise(r => setTimeout(r, 0));
  out.push(ok('TP7AV-S 前一SVG未完成时下一目标已启动，末尾统一等待收尾', handles.length === 5 && !settled &&
    handles[1].startedAt < handles[0].doneAt && handles.at(-1).startedAt < handles[0].doneAt, handles));
  handles.forEach(h => [...h.onFinish].forEach(fn => fn(true)));
  const done = await run;
  const order = log.filter(s => s.startsWith('start:')).map(s => s.split(':').slice(1).join(':'));
  out.push(ok('TP7AV-S 两轮错峰：增攻 A→B，再瞄准 A→B（标签独立，不合并），顺序=后端 effects', done === true &&
    order.slice(0, 4).join(',') === 'A:buff:atkUp,B:buff:atkUp,A:buff:hitUp,B:buff:hitUp', order));
  out.push(ok('TP7AV-S 同目标两个标签各自一次原版 SVG 与揭示', log.filter(s => s.startsWith('start:A')).length === 2 && log.filter(s => s.startsWith('reveal:A')).length === 2, log));
  out.push(ok('TP7AV-S 跨目标间隔200/1.5ms（4个间隔），不叠加完整句柄时长', waits.length === 4 && waits.every(ms => ms === 200 / 1.5) && time === 4 * 200 / 1.5, waits));
  out.push(ok('TP7AV-S 减益走原版 debuff SVG 与 hitDown 音色', order.at(-1) === 'C:debuff:hitDown', order));
  for (const duringGap of [true, false]) {
    const active = [], canceledHandles = [];
    const cancelCtx = { ...ctx, result: { effects: effects.slice(0, 2) },
      wait: () => Promise.resolve(!duringGap),
      av: { ...ctx.av, playGenericSupportFx(entity, type, { onImpact }) {
        onImpact();
        const h = { onFinish: new Set(), canceled: false, cancel() {
          if (h.canceled) return;
          h.canceled = true; canceledHandles.push(h);
          [...h.onFinish].forEach(fn => fn(false)); h.onFinish.clear();
        } };
        active.push(h); return h;
      } } };
    const cancelRun = playSupportEffects(cancelCtx);
    if (!duringGap) {
      await new Promise(r => setTimeout(r, 0));
      active[0].cancel();
    }
    const canceledResult = await cancelRun;
    out.push(ok('TP7AV-S ' + (duringGap ? '错峰等待取消' : '整组收尾取消') + '停止全部已启动句柄，不继续揭示',
      canceledResult === false && active.length === (duringGap ? 1 : 2) && canceledHandles.length === active.length));
  }
  return out;
}

// ---------- 击杀聚合 / 召唤结果 / 特写提取 ----------
function killAndSummonCases() {
  const out = [];
  const eff = { h: { side: 'hero', hp: 100 }, e1: { side: 'enemy', hp: 0 }, e2: { side: 'enemy', hp: 0 }, e3: { side: 'enemy', hp: 12 }, s1: { side: 'hero', hp: 0, isSummon: true } };
  const director = createActionDirector({
    sandbox: { getScope: () => null }, avHost: { av: {} }, getViewData: () => ({ units: [] }),
    battle: () => ({ getEffectiveUnit: id => eff[id] ? { id, ...eff[id] } : null }),
    registry: { resolve: () => null },
  });
  const res = { ok: true, casterId: 'h', skill: { damageType: '法术' }, hits: [
    { targetId: 'e1', segments: [{ hpBefore: 30, hpAfter: 10 }, { hpBefore: 10, hpAfter: 0 }] },   // 多段击杀
    { targetId: 'e2', hpBefore: 20, hpAfter: 0 },
    { targetId: 'e3', hpBefore: 20, hpAfter: 12 },                                                 // 复活/保命后存活
    { targetId: 'e1', hpBefore: 10, hpAfter: 0 },                                                 // 同目标重复
  ] };
  const kills = director.executionKills(res);
  out.push(ok('TP7AV-K 整技能聚合真实死亡，多段/重复只计一次、存活(复活)不计', kills.join(',') === 'e1,e2', kills));
  out.push(ok('TP7AV-K 敌方/召唤物施术不播英雄击杀特写', director.executionKills({ ...res, casterId: 'e3' }).length === 0 && director.executionKills({ ...res, casterId: 's1' }).length === 0));
  out.push(ok('TP7AV-K 开场前已死亡的目标不计入', director.executionKills({ ...res, hits: [{ targetId: 'e2', hpBefore: 0, hpAfter: 0 }] }).length === 0));

  const summonSkill = parseSkill('【召唤阵】[召唤:石像][法术][范围:召唤;射程:8]');
  const provider = name => ({ name, maxHp: 80, maxMp: 0, atk: 10, def: 0, spd: 60, evasion: 0, strength: 40, totalWeight: 60, moveDistance: 4, perception: 50, footprint: { width: 1, height: 1 }, skills: [] });
  const mk = (id, side) => ({ id, name: id, side, controller: 'player', footprint: { width: 1, height: 1 }, attrTags: [], skills: [], items: [],
    ref: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, tp: 0, maxTp: 100, atk: 20, def: 0, spd: side === 'hero' ? 200 : 20, evasion: 0, strength: 50, totalWeight: 70, perception: 100, moveDistance: 6, shield: 0 } });
  const b = createBattle({ units: [mk('c', 'hero'), mk('z', 'enemy')], placementsById: { c: { col: 3, row: 3 }, z: { col: 12, row: 3 } },
    scene: { sceneId: 's', grid: { columns: 20, rows: 12, metersPerCell: 1 }, ground: {}, objects: [] }, random: () => 0.5, summonProvider: provider });
  b.start();
  const r = b.attack(summonSkill, { x: 5.5, y: 3.5 });
  const ev = b.snapshot().events.find(e => e.type === 'unit-summoned');
  out.push(ok('TP7AV-M 召唤结果携带真实单位 ID 与实际落点（导演据此在落点入场）', r.ok && r.summons && r.summons.length === 1 && ev && ev.unitId === r.summons[0] && b.ctx.placementsById[r.summons[0]].col === ev.placement.col,
    { ok: r.ok, reason: r.reason, summons: r.summons, ev }));
  const dsrc = readFileSync(new URL('../../../tactics/src/action-director.mjs', import.meta.url), 'utf8');
  out.push(ok('TP7AV-M 导演入场消费 result.summons、召唤物真实死亡走 playSummonExit',
    /const summonIds = result\.summons \|\| \[\]/.test(dsrc) && /av\.playSummonEnter\(casterEnt, ents/.test(dsrc) && /av\.playSummonExit\(ent, \{ exitCause: 'killed'/.test(dsrc)));

  const av = readFileSync(new URL('../../../tactics/src/vendor/rpg-av/rpg-av.mjs', import.meta.url), 'utf8');
  const rangedExecution = av.slice(av.indexOf("} else if (type === '远程')"), av.indexOf('// Style 2（近战，默认）'));
  out.push(ok('TP7AV-X 远程击杀隐藏我方名称，保留头像、敌方名称和原版5朵血花', !/档案:|hero\.name/.test(rangedExecution)
    && /hero\.img/.test(rangedExecution) && /enemy\.name/.test(rangedExecution) && /createBloodSplatterHtml\(5\)/.test(rangedExecution)));
  out.push(ok('TP7AV-X 原版击杀特写/Cut-in/召唤三瞬入包（非桩）', /async function playExecutionAnimation\(hero, killedEnemies, damageType\)/.test(av) && /async function playEnemyUltimateCutin\(enemy, skillName\)/.test(av)
    && /function playSummonEnter\(caster, targets/.test(av) && /function playSummonGuard\(guardian/.test(av) && !/function clearSummonState\(\) \{ \/\* 未迁移段/.test(av)));
  out.push(ok('TP7AV-X 特写挂 iframe 屏幕宿主、计时可清理，重开/换代清除', (av.match(/__SCREEN\(\)\.appendChild\(overlay\); __MOMENTS\.add\(overlay\)/g) || []).length === 2
    && !/playExecutionAnimation[\s\S]{0,9000}?\bsetTimeout\(/.test(av.slice(av.indexOf('async function playExecutionAnimation'), av.indexOf('async function playEnemyUltimateCutin')))
    && /clearArcaneFx\(\) \{ clearPowerCounterEffects\(\); supportHandles\.forEach\(handle => handle\.cancel\(\)\); clearMoments\(\);/.test(av) && /setToken\(t\) \{ if \(t !== combatToken\) \{[^}]*clearMoments\(\);/.test(av)));
  // 真实页面启动崩溃回归：clearSummonState（清场/重开必经）引用的回合制顶层集合必须在工厂内声明
  const conchAt = av.indexOf('function playStrangeConch(caster, targets)');
  out.push(ok('TP7AV-X 折影步/奇异海螺原版入包：去卡片横移、涟漪落真实落点、海螺无顿帧', /function playZheYingBu\(caster, targets, isReaction\)/.test(av)
    && /handle\.dodge = \(success, land = null\) =>/.test(av) && /left:\$\{land \? land\.x : /.test(av) && !/translateX\(-90px\) skewX/.test(av)
    && conchAt > 0 && !/fxEngine\.hitStop = 80/.test(av.slice(conchAt, conchAt + 6000))));
  const hostSrc = readFileSync(new URL('../../../tactics/src/av-host.mjs', import.meta.url), 'utf8');
  out.push(ok('TP7AV-X 击杀特写/Cut-in 屏幕宿主挂 iframe body 最顶层（压住全部 UI、不挡输入）',
    /document\.body\.appendChild\(screenEl\)/.test(hostSrc) && /position:fixed; inset:0; z-index:2147483000; pointer-events:none/.test(hostSrc) && /screenEl\.setAttribute\('data-rpg-av-scope', ''\)/.test(hostSrc)));
  const libSrc = readFileSync(new URL('../../../tactics/src/fx-library.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const fsIds = [...libSrc.matchAll(/id: '([\w-]+)', grade: 'L[34]'[^\n]*\n\s*timeline: \{[^}]*fullscreen: true/g)].map(m => m[1]);
  // 火焰/中毒领域两条目共用 playDomainBurst 的同一处爆发拍点：17 条目对应 16 处调用（伊西丝/音叉三件/高阶召唤/蝎眼钥匙/奇异海螺为原版 identity 直调；时空扭曲震荡/维度撕裂升为 L3；幻梦行军兽冲撞/咆哮为精英口径 L3）
  out.push(ok('TP7AV-L 每个全屏 L3/L4 条目都有独立屏幕主演出，并在真实冲击拍点 ctx.atmos.burst()', fsIds.length === 17 && fsIds.every(id => SHOWPIECES[id])
    && (libSrc.match(/ctx\.atmos\?\.burst\(\);/g) || []).length === 16 && !/fx\.screen\('<i style="position:absolute;inset:0;background:radial-gradient/.test(libSrc), fsIds));
  let seed = 3; const rr = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const built = fsIds.map(id => SHOWPIECES[id].build(9, rr));
  out.push(ok('TP7AV-L 主演出构图互不相同、渐变辉光滤镜带 uid、无 NaN/undefined', new Set(built).size === 17 && built.every(h => /<filter id="g9"/.test(h) && !/NaN|undefined/.test(h))));
  const holyBuilt = SHOWPIECES['holy-judgment'].build(9, rr, { x: 800, y: 450 });
  out.push(ok('TP7AV-L 圣光01 屏幕层无中心光柱/十字/中央光束（真实光柱只在目标处）', !/data-k="pillar"|data-k="cross"/.test(holyBuilt) && (holyBuilt.match(/data-k="ray"/g) || []).length === 8));
  const k1 = SHOWPIECES['krupp-snipe'].build(9, rr, { x: 300, y: 200 });
  out.push(ok('TP7AV-L 重狙准星中心=真实目标视口点（镜孔/十字/冲击环均以 F 为心）', /<circle data-k="hole" cx="300" cy="200" r="330"/.test(k1) && /data-k="sw" cx="300" cy="200"/.test(k1) && /M-20,200 L260,200/.test(k1)));
  out.push(ok('TP7AV-L 原版尺寸口径：圣光命中即起 414 min(视口)×1.4；雷击主雷同火焰01覆盖范围；重狙全段视频≥50%屏幕并等播完',
    /ctx\.reveal\(h\.targetId\)\);\n[^\n]*\n\s*ctx\.after\(60, \(\) => webm\(ctx, '414\.webm', t\.x, t\.y, screenSpanPx\(ctx, 1\.4\)/.test(libSrc) && !/webm\(ctx, '414\.webm', t\.x, t\.y - 62/.test(libSrc)
    && /webm\(ctx, '450\.webm', b\.x, b\.y - R \* 0\.3, Math\.max\(R \* 3\.4, 220\)/.test(libSrc)
    && /webm\(ctx, 'snipe-ezremove\.mp4', t\.x, t\.y, Math\.max\(screenSpanPx\(ctx, 1\.5\), screenCoverPx\(ctx, 0\.5, 16 \/ 9\)\)/.test(libSrc) && /return ctx\.awaitHandle\(shot\.handle, 1850\);/.test(libSrc)));
  out.push(ok('TP7AV-X 召唤段引用的 summonEnterPending 已在工厂内声明（启动/清场不抛 ReferenceError）',
    /^\s*const summonEnterPending = new Set\(\);/m.test(av) && av.indexOf('const summonEnterPending') < av.indexOf('function clearSummonState(')));
  out.push(ok('TP7AV-X 灵风术=根 index playLingFeng 原样入包（风玫瑰/疾风/双翼 + windHum/crystalChime/aoe_wind_spin/dodgeWind 真音）',
    /function playLingFeng\(caster\) \{/.test(av) && /playSfxSample\('windHum', 0\.02, \{ volume:0\.62/.test(av) && /playSfxSample\('aoe_wind_spin_fs772867', 0, \{ volume:0\.78/.test(av)
    && /playSfxSample\('dodgeWind', 0\.04/.test(av) && /arcane-angel-flap/.test(av) && /clearSummonState, playLingFeng[,\s}]/.test(av)));
  {
    const libSrc2 = readFileSync(new URL('../../../tactics/src/fx-library.mjs', import.meta.url), 'utf8');
    const lf = libSrc2.slice(libSrc2.indexOf('const lingFengShu = {'), libSrc2.indexOf('\n};', libSrc2.indexOf('const lingFengShu = {')));
    out.push(ok('TP7AV-X 灵风术条目直调原版、双翼拍点 quiet 揭示规则结果、等原版句柄结束', /grade: 'identity'/.test(lf) && /av\.playLingFeng\(casterEnt\)/.test(lf)
      && /ctx\.after\(CHARGE \+ 350, \(\) => \{\s*\(result\.effects \|\| \[\]\)\.forEach\(e => ctx\.revealEffect\(e, true\)\)/.test(lf) && /return ctx\.awaitHandle\(handle, CHARGE \+ 2200\)/.test(lf)));
    const css2 = readFileSync(new URL('../../../tactics/src/vendor/rpg-av/rpg-av.css', import.meta.url), 'utf8');
    out.push(ok('TP7AV-X 灵风术关键帧与类入 CSS', ['arcane-rose-in', 'arcane-rose-out', 'arcane-twister', 'arcane-streak', 'arcane-wing-glyph', 'arcane-angel-flap', 'arcane-flash-heal'].every(k => css2.includes(k))));
    const ported = ['playIsis', 'playFeiShaHuaJia', 'playXieYanKey', 'playHarmonyShelter', 'playSilenceDomain', 'playShatterResonance',
      'playMeleeGroup', 'playRangedGroup', 'playSpellGroup', 'playEldritchWhisper', 'buildRlyehSedimentFxHtml', 'buildTitanGazeFxHtml'];
    out.push(ok('TP7AV-X 原版伊西丝/飞沙化甲/蝎眼钥匙/三音叉/兜底群攻/造雾术/巨神凝视原样入包并由条目直调',
      ported.every(n => new RegExp('function ' + n + '\\(').test(av) && libSrc2.includes('av.' + n))
      && ['arcane-marcher-rift-stage', 'arcane-stygian-shield-wrap', 'arcane-group-stage', 'mist-obsidian-carpet', 'titan-shadow-loom', 'target-fog-shroud', 'san-shake-dread-anim'].every(k => css2.includes(k)),
      ported.filter(n => !libSrc2.includes('av.' + n))));
  }
  out.push(ok('TP7AV-X 原版击杀三类音效与震屏保留', /playSound\('kill', 2, 1/.test(av) && /playSound\('combatKill'/.test(av) && /playSound\('magicKill'/.test(av) && /__STAGE\.shakeEl\(\)/.test(av) && /playSound\('taunt', 1, 1, \{ category:'L' \}\)/.test(av)));
  const css = readFileSync(new URL('../../../tactics/src/vendor/rpg-av/rpg-av.css', import.meta.url), 'utf8');
  out.push(ok('TP7AV-X 特写关键帧与任意值类入 CSS', ['s2-ink-stamp', 's3-shard-1', 'v1-tommy-scope', 'blood-splat-burst', 'anim-cutin-slash', 'anim-debuff', 'anim-taunt'].every(k => css.includes(k)) && css.includes('z-\\[200\\]')));
  const msrc = readFileSync(new URL('../../../tactics/src/main.mjs', import.meta.url), 'utf8');
  out.push(ok('TP7AV-X 满充能才 Cut-in，且在原技能前摇之前；击杀特写在攻击演出之后',
    /cur\.charge\.current >= cur\.charge\.max\) \{\s*\n\s*await director\.playChargeCutin[\s\S]{0,120}await director\.playWindup/.test(msrc) && /await director\.playAttack\(res\);\s*\} finally \{[\s\S]*?\n\s*if \(myFlow !== flow\) return;\s*\n\s*await director\.playExecution\(res\);/.test(msrc)));
  return out;
}

export const groups = {
  'TP7AV-B': { run: async () => ({ cases: await webmCases() }) },
  'TP7AV-L': { run: () => ({ cases: atmosCases() }) },
  'TP7AV-S': { run: async () => ({ cases: await serialCases() }) },
  'TP7AV-K': { run: () => ({ cases: killAndSummonCases() }) },
};
