// ==========================================
// 战棋动作协调（玩家与敌方共用）：
//   取得行动 → 镜头引导 → 连续移动 → 前摇（敌方，复用回合制八类） → 攻击身份演出（复用） →
//   各目标在各自接触拍点展示结果（血条/浮字/受击或闪避/倒地） → 收尾 → 交还控制
// 规则命令（battle.move/attack）已先一次性结算：本层只把确定结果在对应拍点"揭示"，不重掷骰、不重复扣费。
// 特效函数不负责扣血；动画时长不推进虚拟时间。scope 失活（重置/换场）时所有等待以 false 结算。
// 攻击演出统一经 fx-registry 分发（fxTag → 形状/效果槽谓词 → 兜底身份演出），本层不再为任何单个技能写特判。
// ==========================================

import { playPathMotion, pathSegments, pointAtDistance } from './motion.mjs';
import { unitCenter } from './geometry.mjs';
import { createFxRegistry, actionInput, reactionInput } from './fx-registry.mjs';
import { registerDefaultFx } from './fx-library.mjs';
import { createVfxHost } from './vfx-host.mjs';

const AOE_SUBTYPES = new Set(['爆炸', '雷', '火焰', '枪击', '毒雾', '冰霜', '风', '光']);
const SUBTYPE_RE = /[（(](枪击|霰弹|光|雷|爆炸|刀砍|拳击|爪击|撕咬|毒液|箭矢|冰霜|火焰|毒雾|风)[）)]/;
export const WINDUP_BEAT_MS = 330;   // 回合制敌方前摇拍点（OMEN_BEAT）：起手后此刻出手

// 攻击身份：显式括号子类优先 → 特效标签 → 伤害类型默认；空间范围决定单体/群体演出
export function resolveAttackIdentity(skill, casterSide) {
  const tags = [skill && skill.type, skill && skill.type2, skill && skill.type3].filter(t => t && t !== '[无]').join(' ');
  const m = tags.match(SUBTYPE_RE);
  let subtype = m ? m[1] : null;
  const dt = (skill && skill.damageType) || '近战';
  if (!subtype) {
    if (dt === '远程') subtype = '箭矢';
    else if (dt === '法术') return { mode: 'projectile', subtype: casterSide === 'hero' ? 'fire' : 'enemy_spell' };
    else subtype = '刀砍';
  }
  if (subtype === '火焰' && (!skill.range || skill.range.type === '单体')) return { mode: 'projectile', subtype: 'fire' };
  const area = !!(skill && skill.range && skill.range.type !== '单体');
  if (area && AOE_SUBTYPES.has(subtype)) return { mode: 'aoe', subtype };
  return { mode: area ? 'perTarget' : 'single', subtype };
}

// 前摇分类：颜色按伤害类型，单/群按战棋显式空间范围（不让旧"单体/群攻"标签覆盖）
export function resolveWindupKind(skill) {
  const dt = (skill && skill.damageType) || '近战';
  const color = dt === '远程' ? 'amber' : dt === '法术' ? 'violet' : 'red';
  const wide = !!(skill && skill.range && skill.range.type !== '单体');
  return color + '-' + (wide ? 'wide' : 'single');
}

export function createActionDirector(deps) {
  const { sandbox, avHost, getViewData, onReveal, onMoveFeedback, getUnitStyle } = deps;
  const av = avHost.av;
  const registry = deps.registry || registerDefaultFx(createFxRegistry());

  function scope() { return sandbox.getScope(); }
  function wait(ms) {
    const s = scope();
    if (!s || !s.isLive) return Promise.resolve(false);
    return new Promise(resolve => {
      const cancel = s.settleOnDispose(resolve);
      s.after(ms, () => { if (cancel) cancel(); resolve(true); });
    });
  }
  function awaitHandle(handle, fallbackMs) {
    if (!handle) return wait(fallbackMs || 0);
    const s = scope();
    if (!s || !s.isLive) return Promise.resolve(false);
    return new Promise(resolve => {
      let done = false;
      const finish = ok => { if (done) return; done = true; resolve(ok); };
      const cancel = s.settleOnDispose(finish);
      if (handle.onFinish && handle.onFinish.add) handle.onFinish.add(ok => { if (cancel) cancel(); finish(ok !== false); });
      const ms = Math.max(0, (handle.doneAt || Date.now()) - Date.now()) + 400;
      s.after(Math.max(ms, fallbackMs || 0), () => { if (cancel) cancel(); finish(true); });
    });
  }
  const centerOf = id => sandbox.unitWorldCenter(id);
  // 逐帧补间：t∈[0,1]；scope 失活即以 false 结算
  function tween(ms, fn) {
    const s = scope();
    if (!s || !s.isLive) return Promise.resolve(false);
    return new Promise(resolve => {
      let done = false;
      const t0 = performance.now();
      const finish = ok => { if (done) return; done = true; resolve(ok); };
      const stop = s.settleOnDispose(() => finish(false));
      s.loop(now => {
        const t = Math.min(1, (now - t0) / ms);
        fn(t);
        if (t >= 1) { if (stop) stop(); finish(true); return false; }
      });
    });
  }
  const feedback = (id, kind, p) => { if (onMoveFeedback) onMoveFeedback(id, kind, p); };
  const facingOf = (a, b) => ((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI) + 360) % 360;

  // ---------- 跳跃：下蹲蓄势 → 起跳拉伸 → 抛物线飞行（弧高随距离，地影缩小，镜头跟随）→ 落地压扁 + 尘环 ----------
  async function playJump(res) {
    if (!res || !res.ok) return false;
    const vd = getViewData(), id = res.unitId, view = sandbox.getUnitView();
    const fp = vd.footprintsById[id] || { width: 1, height: 1 };
    const a = unitCenter(res.from, fp), b = unitCenter(res.to, fp);
    await sandbox.guideTo([a, b]);
    view.lockMotion(id, true);
    view.setFlag(id, 't-unit-jumping', true);
    view.setDisplayFacing(id, facingOf(a, b));
    const H = Math.min(96, 28 + res.distance * 11), T = Math.min(920, 340 + res.distance * 75);
    feedback(id, 'jump-crouch', a);
    let ok = await tween(150, t => view.setHop(id, 0, 1 - 0.24 * Math.sin(t * Math.PI / 2)));
    if (ok) {
      feedback(id, 'jump-takeoff', a);
      ok = await tween(T, t => {
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        view.setDisplayPos(id, x, y);
        view.setHop(id, 4 * H * t * (1 - t), t < 0.5 ? 1.14 - 0.14 * t * 2 : 1 + 0.07 * (t - 0.5) * 2);
        sandbox.followWorld(x, y);
        feedback(id, 'frame', { x, y });
      });
    }
    view.setDisplayPos(id, b.x, b.y);
    if (ok) {
      feedback(id, 'jump-land', b);
      ok = await tween(230, t => view.setHop(id, 0, t < 0.3 ? 1 - 0.28 * (t / 0.3) : 0.72 + 0.28 * ((t - 0.3) / 0.7)));
    }
    view.setHop(id, 0, 1);
    view.setFlag(id, 't-unit-jumping', false);
    view.lockMotion(id, false);
    view.setDisplayFacing(id, null);
    view.updateUnit(id, { placement: vd.placementsById[id] });
    return ok;
  }

  // ---------- 推动：后撤蓄力 → 前冲接触 → 目标沿规则路径减速滑移（撞墙震屏）/ 抵抗晃动；推动者回位 ----------
  async function playShove(pusherId, res) {
    const vd = getViewData(), view = sandbox.getUnitView();
    const tid = res.targetId;
    const pfp = vd.footprintsById[pusherId] || { width: 1, height: 1 }, tfp = vd.footprintsById[tid] || { width: 1, height: 1 };
    const pa = unitCenter(vd.placementsById[pusherId], pfp);
    const ta = res.from ? unitCenter(res.from, tfp) : unitCenter(vd.placementsById[tid], tfp);
    const len = Math.hypot(ta.x - pa.x, ta.y - pa.y) || 1, dx = (ta.x - pa.x) / len, dy = (ta.y - pa.y) / len;
    const at = k => view.setDisplayPos(pusherId, pa.x + dx * k, pa.y + dy * k);
    await sandbox.guideTo([pa, res.to ? unitCenter(res.to, tfp) : ta]);
    view.lockMotion(pusherId, true); view.lockMotion(tid, true);
    view.setDisplayFacing(pusherId, facingOf(pa, ta));
    let ok = await tween(130, t => at(-0.16 * Math.sin(t * Math.PI / 2)));
    if (ok) ok = await tween(90, t => at(-0.16 + 0.5 * t));
    feedback(pusherId, 'shove', ta);
    if (ok && res.success && res.path && res.path.length > 1) {
      const segs = pathSegments(res.path, tfp), total = segs.reduce((s, g) => s + g.len, 0);
      ok = await tween(Math.min(900, 220 + total * 130), t => {
        const e = 1 - Math.pow(1 - t, 3);
        const p = pointAtDistance(segs, total * e);
        view.setDisplayPos(tid, p.x, p.y);
        view.setHop(tid, Math.sin(Math.min(1, t * 3) * Math.PI) * 5, 1);
        at(0.34 * (1 - Math.min(1, t * 2.2)));
        sandbox.followWorld(p.x, p.y);
      });
      if (res.collision) feedback(tid, 'impact', unitCenter(res.to, tfp));
    } else if (ok) {
      view.setFlag(tid, 't-unit-resist', true);
      ok = await tween(300, t => at(0.34 * (1 - t)));
      view.setFlag(tid, 't-unit-resist', false);
    }
    at(0);
    view.setHop(tid, 0, 1);
    view.setDisplayFacing(pusherId, null);
    view.lockMotion(pusherId, false); view.lockMotion(tid, false);
    view.updateUnit(pusherId, { placement: vd.placementsById[pusherId] });
    view.updateUnit(tid, { placement: vd.placementsById[tid] });
    return ok;
  }

  // ---------- 背起 / 放下：被背者沿弧线在地面与背负者肩上之间转移 ----------
  async function playTransfer(id, from, to, { lift } = {}) {
    const view = sandbox.getUnitView();
    if (!from || !to) return true;
    view.lockMotion(id, true);
    if (!lift) view.setFlag(id, 't-unit-carried', false);
    feedback(id, lift ? 'lift' : 'set-down', from);
    const ok = await tween(lift ? 420 : 380, t => {
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      view.setDisplayPos(id, from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      view.setHop(id, Math.sin(t * Math.PI) * 26, 1);
    });
    view.setHop(id, 0, 1);
    view.setDisplayPos(id, to.x, to.y);
    if (lift) view.setFlag(id, 't-unit-carried', true);
    else feedback(id, 'jump-land', to);
    return ok;
  }

  // ---------- 移动：消费真实 cell.path ----------
  async function playMove(moveResult) {
    if (!moveResult || !moveResult.ok) return false;
    const vd = getViewData();
    const id = moveResult.unitId;
    const fp = vd.footprintsById[id];
    const path = moveResult.cell.path;
    const start = centerOf(id) && path.length ? { x: path[0].col + fp.width / 2, y: path[0].row + fp.height / 2 } : null;
    const end = centerOf(id);
    if (start && end) await sandbox.guideTo([start, end]);
    const ok = await playPathMotion(sandbox.getUnitView(), scope(), {
      unitId: id, path, footprint: fp, gait: getUnitStyle && getUnitStyle(id) ? getUnitStyle(id).gait : null,
      onFrame: (x, y) => sandbox.followWorld(x, y),
      onFeedback: (kind, seg, p) => { if (onMoveFeedback) onMoveFeedback(id, kind, p); },
    });
    // 显示位置交还权威落点（placement 已由规则命令更新；插值从不回写）
    sandbox.getUnitView().lockMotion(id, false);
    sandbox.getUnitView().updateUnit(id, { placement: vd.placementsById[id] });
    return ok;
  }

  // ---------- 敌方前摇（复用 playEnemyWindup 八类之一） ----------
  async function playWindup(unitId, skill) {
    avHost.syncRoster();
    const kind = resolveWindupKind(skill);
    const handle = av.playEnemyWindup(avHost.entity(unitId), kind);
    if (!handle) return { kind, ok: false };
    const ok = await wait(WINDUP_BEAT_MS);
    return { kind, ok, handle };
  }

  // ---------- 演出世界层（每个 scope 一组：地面层在单位层之下、顶层在最上；均挂世界根，随相机变换） ----------
  let layersFor = null, fxUid = 0;
  function fxLayers() {
    const s = scope(), dom = sandbox.getDom();
    if (layersFor && layersFor.scope === s) return layersFor;
    const mk = name => {
      const d = document.createElement('div');
      d.setAttribute('data-tactics-fx', 'world-' + name);
      d.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; overflow:visible;';
      s.addNode(d);
      return d;
    };
    const ground = mk('ground'), top = mk('top');
    dom.world.insertBefore(ground, dom.unitLayer);
    dom.world.appendChild(top);
    const vd = () => getViewData();
    const hostDeps = { getPlacement: id => vd().placementsById[id], getFootprint: id => vd().footprintsById[id], getFacing: id => vd().placementsById[id].facing, scope: s, metersPerArtPx: 1 / 50 };
    layersFor = { scope: s, dom, top: createVfxHost({ anchorLayer: top, domLayer: top, canvasHolder: null }, hostDeps), ground: createVfxHost({ anchorLayer: ground, domLayer: ground, canvasHolder: null }, hostDeps) };
    return layersFor;
  }
  const SHAKE = { light: [180, 3], heavy: [320, 7], quake: [500, 10] };
  function makeFx(category) {
    const L = fxLayers();
    return {
      uid: () => ++fxUid,
      top: (html, ms) => L.top.layer(html, ms),
      ground: (html, ms) => L.ground.layer(html, ms),
      // 视口层：只放与位置无关的闪屏（屏幕坐标只在这一层）
      screen: (html, ms) => {
        const d = document.createElement('div');
        d.style.cssText = 'position:absolute; inset:0; pointer-events:none;';
        d.innerHTML = html;
        L.dom.viewport.appendChild(d);
        L.scope.addNode(d);
        L.scope.after(ms, () => L.scope.removeNode(d));
        return d;
      },
      shake: level => {
        const [ms, amp] = SHAKE[level];
        const frames = [];
        for (let i = 0; i <= 8; i++) { const k = amp * (1 - i / 8); frames.push({ transform: i === 8 ? 'translate3d(0,0,0)' : 'translate3d(' + ((i % 2 ? -1 : 1) * k).toFixed(1) + 'px,' + ((i % 3 - 1) * k * 0.6).toFixed(1) + 'px,0)' }); }
        L.dom.shake.animate(frames, { duration: ms });
      },
      sfx: (key, vol) => av.playSound(key, vol, 1, { track: 'skill', category }),
    };
  }
  function prepareAudio(keys) {
    const urls = keys.map(k => av.audioUrls[k]).filter(Boolean);
    if (!urls.length) return Promise.resolve(true);
    // 采样通常已在预载中：即时完成；资源服务未响应时最多等一拍，之后照常演出
    return Promise.race([Promise.all(urls.map(u => av.CombatAudioMixer.prepare(u))), wait(600)]).then(async () => {
      const ctx = av.CombatAudioMixer.context(); if (ctx && ctx.state === 'suspended') await ctx.resume();
      return !!(scope() && scope().isLive);
    });
  }

  // ---------- 攻击：注册表分发演出 + 接触拍点逐段揭示 ----------
  async function playAttack(result) {
    if (!result || !result.ok) return false;
    avHost.syncRoster();
    const vd = getViewData();
    const skill = result.skill;
    const casterUnit = vd.units.find(u => u.id === result.casterId);
    const identity = resolveAttackIdentity(skill, casterUnit.side);
    const casterEnt = avHost.entity(result.casterId);
    const hits = result.hits || [];
    const byId = new Map(hits.map(h => [h.targetId, h]));
    const audioContext = { category: av.CombatAudioMixer.classify(skill) };
    const actionId = av.CombatAudioDirector.beginAction();
    const wave = hits.length > 1 ? av.CombatAudioDirector.beginWave(hits.map(h => h.targetId), actionId) : null;
    const hitWaves = [];
    const incoming = (skill.power || 0) > 0 ? skill.power : (casterUnit.ref.atk || 0);
    const input = actionInput(result);
    const entry = registry.resolve(input);

    sandbox.getUnitView().setDisplayFacing(result.casterId, null);
    sandbox.getUnitView().updateUnit(result.casterId, { placement: vd.placementsById[result.casterId] });
    const pts = [centerOf(result.casterId), ...hits.map(h => centerOf(h.targetId))].filter(Boolean);
    if (result.query && result.query.blastCenter) pts.push(result.query.blastCenter);
    if (!hits.length && result.aim) pts.push({ x: result.aim.x, y: result.aim.y });
    await sandbox.guideTo(pts);
    if (!(await prepareAudio(entry.prepareKeys ? entry.prepareKeys({ identity }) : []))) return false;

    const revealed = new Map();      // targetId → 已揭示段序号集合
    const reactionRuns = [];
    function revealSegment(targetId, i, meta = {}) {
      const h = byId.get(targetId);
      if (!h) return;
      const segs = h.segments || [h];
      const seg = segs[i];
      if (!seg) return;
      const done = revealed.get(targetId) || new Set();
      if (done.has(i)) return;
      done.add(i); revealed.set(targetId, done);
      if (done.size === 1 && h.reaction) reactionRuns.push(playReaction(h));
      const r = {
        targetId, sourceId: result.casterId, outcome: seg.hit ? 'hit' : 'dodge',
        maxHp: h.maxHp, hpBefore: seg.hpBefore, hpAfter: seg.hpAfter, hpDmg: seg.hpDmg,
        shieldBefore: 0, shieldAfter: 0, shieldDmg: 0, incomingDmg: incoming,
        isHero: h.side === 'hero', damageType: skill.damageType || '近战',
        actionId, waveId: wave ? wave.id : null,
      };
      av.playHitFeedback(r, { wave: hitWaves[i] || (hitWaves[i] = { shook: false, hitStopped: false, classified: [] }) });
      av.CombatAudioDirector.publish(r);
      if (wave && done.size === segs.length) av.CombatAudioDirector.completeTarget(wave, targetId);
      if (onReveal) onReveal({ ...h, hit: seg.hit, hpBefore: seg.hpBefore, hpAfter: seg.hpAfter, hpDmg: seg.hpDmg, down: seg.down,
        logIndex: seg.logIndex, logEnd: seg.logEnd, segmentIndex: i, segmentCount: segs.length }, Object.assign({ result, identity, entryId: entry.id }, meta));
    }
    function reveal(targetId, meta) {
      const h = byId.get(targetId);
      if (h) (h.segments || [h]).forEach((_, i) => revealSegment(targetId, i, meta));
    }

    const ctx = {
      result, skill, hits, identity, input, casterId: result.casterId, casterEnt, av, avHost, sandbox,
      audioContext, outcomeMap: new Map(hits.map(h => [h.targetId, h.hit ? 'hit' : 'dodge'])),
      fx: makeFx(audioContext.category),
      wait, tween, awaitHandle, after: (ms, fn) => scope().after(ms, fn),
      reveal, revealSegment, ent: id => avHost.entity(id), centerOf,
      anchorAt: (x, y) => makeAnchor(x, y), aimAnchor: () => aimAnchor(result.aim), lineEndAnchor: () => lineEndAnchor(result),
    };
    const ok = await entry.play(ctx);
    hits.forEach(h => reveal(h.targetId, { late: true }));
    await Promise.all(reactionRuns);
    if (wave) av.CombatAudioDirector.closeWave(wave);
    dropAnchors();
    return ok;
  }

  // ---------- 反应演出（回避错位等）：在被攻击者的首个接触拍点启动，与攻击演出并行 ----------
  async function playReaction(h) {
    const reaction = h.reaction;
    const entry = registry.resolve(reactionInput(reaction));
    if (!entry) return true;
    const view = sandbox.getUnitView();
    const fp = getViewData().footprintsById[h.targetId];
    if (!(await prepareAudio(entry.prepareKeys ? entry.prepareKeys({}) : []))) return false;
    return entry.play({
      hitTargetId: h.targetId, reaction, shift: reaction.shift, footprint: fp, view, sandbox, av,
      fx: makeFx('B'), wait, tween,
      cameraScale: () => sandbox.getPose().scale,
      placement: () => getViewData().placementsById[h.targetId],
    });
  }
  // ---------- 空目标演出锚点（瞄准点/射界末端；只是视觉落点，不是规则目标） ----------
  const anchors = new Set();
  function makeAnchor(x, y) {
    const view = sandbox.getUnitView();
    const layer = view && [...view.nodes.values()][0] ? [...view.nodes.values()][0].root.parentNode : null;
    if (!layer) return null;
    const d = document.createElement('div');
    d.className = 't-aim-anchor';
    d.dataset.arcaneTargetId = '__aim';
    d.style.cssText = 'position:absolute; left:' + (x * 50 - 14) + 'px; top:' + (y * 50 - 14) + 'px; width:28px; height:28px; pointer-events:none;';
    layer.appendChild(d);
    scope().addNode(d);
    anchors.add(d);
    return d;
  }
  function aimAnchor(aim) { return makeAnchor(aim.x, aim.y); }
  function lineEndAnchor(result) {
    const o = centerOf(result.casterId);
    const sh = result.query && result.query.shape;
    if (!sh) return aimAnchor(result.aim);
    // 射界末端：沿方向逐 0.25m 前进到最后一个真实作用格（不穿墙）
    const cells = new Set((result.query.cells || []).map(c => c.col + ',' + c.row));
    let last = { x: o.x, y: o.y };
    for (let t = 0.25; t <= sh.length + 1e-9; t += 0.25) {
      const x = o.x + Math.cos(sh.dir) * t, y = o.y + Math.sin(sh.dir) * t;
      if (!cells.has(Math.floor(x) + ',' + Math.floor(y))) break;
      last = { x, y };
    }
    return makeAnchor(last.x, last.y);
  }
  function dropAnchors() { anchors.forEach(d => { const s = scope(); if (s) s.removeNode(d); else d.remove(); }); anchors.clear(); }

  return { playMove, playJump, playShove, playTransfer, playWindup, playAttack, wait, resolveAttackIdentity, resolveWindupKind };
}
