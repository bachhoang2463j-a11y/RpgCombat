// ==========================================
// 战棋动作协调（玩家与敌方共用）：
//   取得行动 → 镜头引导 → 连续移动 → 前摇（敌方，复用回合制八类） → 攻击身份演出（复用） →
//   各目标在各自接触拍点展示结果（血条/浮字/受击或闪避/倒地） → 收尾 → 交还控制
// 规则命令（battle.move/attack）已先一次性结算：本层只把确定结果在对应拍点"揭示"，不重掷骰、不重复扣费。
// 特效函数不负责扣血；动画时长不推进虚拟时间。scope 失活（重置/换场）时所有等待以 false 结算。
// ==========================================

import { playPathMotion } from './motion.mjs';

const AOE_SUBTYPES = new Set(['爆炸', '雷', '火焰', '枪击', '毒雾', '冰霜', '风', '光']);
const SUBTYPE_RE = /[（(](枪击|霰弹|光|雷|爆炸|刀砍|拳击|爪击|撕咬|毒液|箭矢|冰霜|火焰|毒雾|风)[）)]/;
export const WINDUP_BEAT_MS = 330;   // 回合制敌方前摇拍点（OMEN_BEAT）：起手后此刻出手
// 与回合制 playSingleAttackFx 同口径：枪械身份在出手前先备好采样（演出以实际起音为拍点）
const PREPARE_KEYS = { '枪击': ['gunshot1', 'gunshot2', 'gunshot3'], '霰弹': ['xiandan'], '砷弹': ['gunshot_pierce'] };

// 攻击身份：显式括号子类优先 → 特效标签 → 伤害类型默认；空间范围决定单体/群体演出
export function resolveAttackIdentity(skill, casterSide) {
  if (skill && skill.fxTag === '砷弹射击') return { mode: 'arsenic', subtype: '砷弹' };
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
  const { sandbox, avHost, getViewData, onReveal, onMoveFeedback } = deps;
  const av = avHost.av;

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
      unitId: id, path, footprint: fp,
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

  // ---------- 攻击：身份演出 + 接触拍点逐目标揭示 ----------
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
    const revealed = new Set();
    const audioContext = { category: av.CombatAudioMixer.classify(skill) };
    const actionId = av.CombatAudioDirector.beginAction();
    const wave = hits.length > 1 ? av.CombatAudioDirector.beginWave(hits.map(h => h.targetId), actionId) : null;
    const hitWave = { shook: false, hitStopped: false, classified: [] };
    const incoming = (skill.power || 0) > 0 ? skill.power : (casterUnit.ref.atk || 0);

    sandbox.getUnitView().setDisplayFacing(result.casterId, null);
    sandbox.getUnitView().updateUnit(result.casterId, { placement: vd.placementsById[result.casterId] });
    const pts = [centerOf(result.casterId), ...hits.map(h => centerOf(h.targetId))].filter(Boolean);
    if (!hits.length && result.aim) pts.push({ x: result.aim.x, y: result.aim.y });
    await sandbox.guideTo(pts);
    const prep = PREPARE_KEYS[identity.subtype];
    if (prep) {
      // 采样已在预载中：通常即时完成；资源服务未响应时不让演出卡死（最多等一拍，之后照常演出）
      await Promise.race([Promise.all(prep.map(k => av.CombatAudioMixer.prepare(av.audioUrls[k]))), wait(600)]);
      const ctx = av.CombatAudioMixer.context(); if (ctx && ctx.state === 'suspended') await ctx.resume();
      if (!scope() || !scope().isLive) return false;
    }

    function reveal(targetId, meta = {}) {
      const h = byId.get(targetId);
      if (!h || revealed.has(targetId)) return;
      revealed.add(targetId);
      const r = {
        targetId, sourceId: result.casterId, outcome: h.hit ? 'hit' : 'dodge',
        maxHp: h.maxHp, hpBefore: h.hpBefore, hpAfter: h.hpAfter, hpDmg: h.hpDmg,
        shieldBefore: 0, shieldAfter: 0, shieldDmg: 0, incomingDmg: incoming,
        isHero: h.side === 'hero', damageType: skill.damageType || '近战',
        actionId, waveId: wave ? wave.id : null,
      };
      av.playHitFeedback(r, { wave: hitWave });
      av.CombatAudioDirector.publish(r);
      if (wave) av.CombatAudioDirector.completeTarget(wave, targetId);
      if (onReveal) onReveal(h, Object.assign({ result, identity }, meta));
    }
    const revealAll = () => hits.forEach(h => reveal(h.targetId, { late: true }));

    let handle = null, ok = true;
    const outcomeMap = new Map(hits.map(h => [h.targetId, h.hit ? 'hit' : 'dodge']));
    const ent = id => avHost.entity(id);
    const anchorFor = () => aimAnchor(result.aim);

    if (identity.mode === 'single') {
      const h = hits[0];
      const target = h ? ent(h.targetId) : anchorFor();
      handle = av.playAttackIdentityFx({ scope: 'single', subtype: identity.subtype, caster: casterEnt, targets: [target],
        outcomes: h ? outcomeMap : (() => 'dodge'), audioContext, onImpact: (visual) => reveal(visual && (visual.id || visual.dataset && visual.dataset.arcaneTargetId)) });
      ok = await awaitHandle(handle, 900);
    } else if (identity.mode === 'perTarget') {
      const list = hits.length ? hits.map(h => ent(h.targetId)) : [anchorFor()];
      const handles = [];
      for (let i = 0; i < list.length; i++) {
        if (i) { const alive = await wait(70); if (!alive) return false; }
        const t = list[i];
        handles.push(av.playAttackIdentityFx({ scope: 'single', subtype: identity.subtype, caster: casterEnt, targets: [t],
          outcomes: hits.length ? outcomeMap : (() => 'dodge'), audioContext, onImpact: (visual) => reveal(visual && visual.id) }));
      }
      const results = await Promise.all(handles.map(hd => awaitHandle(hd, 900)));
      ok = results.every(Boolean);
    } else if (identity.mode === 'aoe') {
      const list = hits.length ? hits.map(h => ent(h.targetId)) : [anchorFor()];
      handle = av.playAttackIdentityFx({ scope: 'aoe', subtype: identity.subtype, caster: casterEnt, targets: list,
        outcomes: hits.length ? outcomeMap : (() => 'dodge'), audioContext, onImpact: (visual) => reveal(visual && visual.id) });
      ok = await awaitHandle(handle, 1400);
    } else if (identity.mode === 'projectile') {
      const h = hits[0];
      const fromDom = avHost.host.spriteOf(result.casterId);
      const toDom = h ? avHost.host.spriteOf(h.targetId) : avHost.host.spriteOf(anchorFor());
      ok = await av.CombatAudioMixer.withContext(audioContext, () => av.playArcaneProjectile(identity.subtype, fromDom, toDom, h ? !h.hit : true));
      if (h) reveal(h.targetId);
      await wait(260);
    } else if (identity.mode === 'arsenic') {
      // 定稿砷弹：黑弹飞向最远的命中目标（全闪避则飞向射界末端）；途经目标在弹头经过时揭示，闪避者不播命中爆点
      const origin = centerOf(result.casterId);
      const dist = h => { const c = centerOf(h.targetId); return Math.hypot(c.x - origin.x, c.y - origin.y); };
      const landed = hits.filter(h => h.hit).sort((a, b) => dist(b) - dist(a));
      const endTarget = landed.length ? ent(landed[0].targetId) : lineEndAnchor(result);
      const endDist = landed.length ? dist(landed[0]) : (result.skill.range.length || 10);
      handle = av.CombatAudioMixer.withContext(audioContext, () => av.playArsenicShot(casterEnt, [endTarget]));
      const CHARGE = 340, FLIGHT = 160;
      for (const h of hits) {
        const k = Math.min(1, dist(h) / Math.max(0.5, endDist));
        const at = CHARGE + FLIGHT * Math.pow(k, 1 / 0.88);
        scope().after(at, () => reveal(h.targetId));
      }
      ok = await awaitHandle(handle, 1300);
    }
    revealAll();
    if (wave) av.CombatAudioDirector.closeWave(wave);
    dropAnchors();
    return ok;
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

  return { playMove, playWindup, playAttack, wait, resolveAttackIdentity, resolveWindupKind };
}
