// ==========================================
// P03 Node 侧用例（T03-01～T03-08）：跑圈与全局事件时钟
// 全部通过 deps.modules 真实导入 tactics/src/clock.mjs、scheduler.mjs、lifecycle.mjs，
// 不复制业务实现、不 mock 引擎；时序断言统一用 1e-6 容差（引擎浮点 EPS=1e-9）。
// 每组 run(deps) → { cases: [{id, pass, detail}] }；run-tests.cjs 门禁强制 passed>0。
// 契约依据：doc/tactics/P03-CLOCK-CONTRACT.md（冻结）与 doc/tactics/PLAN.md L180-189。
// 注：T03-05 同刻顺序按契约 §三.2（阶段②内：状态到期 → CD 解除 → 救援截止）断言。
// ==========================================

function ok(id, pass, detail) {
  return { id, pass: !!pass, detail: detail || '' };
}

function near(a, b, eps) {
  return Math.abs(a - b) <= (eps === undefined ? 1e-6 : eps);
}

function eqJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// 时刻序列容差比较（顺序敏感）
function timesNear(list, expected) {
  return Array.isArray(list) && list.length === expected.length &&
    expected.every((t, i) => near(list[i], t));
}

function clockLog(bs) {
  return bs.combatState.clock.log;
}

function entriesOf(bs, type) {
  return clockLog(bs).filter(e => e.type === type);
}

function typesAt(bs, t) {
  return clockLog(bs).filter(e => near(e.t, t)).map(e => e.type);
}

function statusOf(bs, unitId, source) {
  const key = typeof source === 'object'
    ? [unitId, source.casterId ?? source.caster ?? '', source.skillId ?? source.skill ?? '', source.effectId ?? source.effect ?? ''].map(String).join('\u0000')
    : unitId + '\u0000' + source;
  return bs.combatState.clock.statuses[key] || null;
}

// 通用推进：连续取得 n 次自然行动，每次立即 endAction；返回行动序列与终局
function drive(bs, clock, n, rulesContext) {
  const rc = rulesContext || {};
  const actions = [];
  let terminal = null;
  for (let i = 0; i < n; i++) {
    const r = clock.advanceToNextAction(bs, rc);
    if (r.status === 'action') {
      actions.push({ t: r.time, unitId: r.unitId });
      clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, rc);
    } else if (r.status === 'terminal') {
      terminal = r.terminal;
      break;
    } else {
      break; // frozen 等异常态直接停（正常驱动流不应出现）
    }
  }
  return { actions, terminal };
}

// ---------- T03-01 速度100/200起跑至200：自然到轴、同刻基础敏捷优先、不用Act ----------

async function t0301(deps) {
  const { clock, lifecycle } = deps.modules;
  const cases = [];

  // 主场景：速度 200 与 100 从 0 起跑
  const bs = lifecycle.emptyBattleState('sc-t03', 'bt-t03a');
  clock.createClock(bs, [
    { id: 'u-fast', side: 'ally', baseSpd: 200 },
    { id: 'u-slow', side: 'ally', baseSpd: 100 },
  ]);
  const main = drive(bs, clock, 6);
  const fastTimes = main.actions.filter(a => a.unitId === 'u-fast').map(a => a.t);
  const slowTimes = main.actions.filter(a => a.unitId === 'u-slow').map(a => a.t);
  cases.push(ok('T03-01 200速单位在50/100/150/200获得机会',
    timesNear(fastTimes, [50, 100, 150, 200]),
    'fast=' + JSON.stringify(fastTimes)));
  cases.push(ok('T03-01 100速单位在100/200获得机会',
    timesNear(slowTimes, [100, 200]),
    'slow=' + JSON.stringify(slowTimes)));
  const at100 = main.actions.filter(a => near(a.t, 100)).map(a => a.unitId);
  cases.push(ok('T03-01 同刻t=100基础敏捷高者先取得行动',
    eqJson(at100, ['u-fast', 'u-slow']),
    't=100序=' + JSON.stringify(at100)));

  // 基础敏捷与有效敏捷相反：baseSpd 200 挂减速（有效100） vs baseSpd 100 挂加速（有效200）
  const eff2 = { 'u-highbase': 100, 'u-lowbase': 200 };
  const bs2 = lifecycle.emptyBattleState('sc-t03', 'bt-t03b');
  clock.createClock(bs2, [
    { id: 'u-highbase', side: 'ally', baseSpd: 200 },
    { id: 'u-lowbase', side: 'ally', baseSpd: 100 },
  ], { speedOf: id => eff2[id] });
  const inv = drive(bs2, clock, 6);
  const invFirst = inv.actions[0];
  const invAt100 = inv.actions.filter(a => near(a.t, 100)).map(a => a.unitId);
  cases.push(ok('T03-01 有效敏捷驱动到轴（低基础高有效者t=50首到）',
    !!invFirst && invFirst.unitId === 'u-lowbase' && near(invFirst.t, 50),
    '首行动=' + JSON.stringify(invFirst) + ' 全序=' + JSON.stringify(inv.actions)));
  cases.push(ok('T03-01 基础与有效相反时同刻仍按基础敏捷降序',
    eqJson(invAt100, ['u-highbase', 'u-lowbase']),
    't=100序=' + JSON.stringify(invAt100)));

  // actCount 字段被忽略（旧大回合机械轮次不产生行动、不入时钟档）
  const bs3 = lifecycle.emptyBattleState('sc-t03', 'bt-t03c');
  clock.createClock(bs3, [
    { id: 'u-a', side: 'ally', baseSpd: 200, actCount: 5 },
    { id: 'u-b', side: 'ally', baseSpd: 100, actCount: 3 },
  ]);
  const act = drive(bs3, clock, 6);
  const expectedAct = [
    { t: 50, unitId: 'u-a' }, { t: 100, unitId: 'u-a' }, { t: 100, unitId: 'u-b' },
    { t: 150, unitId: 'u-a' }, { t: 200, unitId: 'u-a' }, { t: 200, unitId: 'u-b' },
  ];
  cases.push(ok('T03-01 actCount不产生额外行动不影响时序且不入档',
    act.actions.length === 6 &&
    act.actions.every((a, i) => a.unitId === expectedAct[i].unitId && near(a.t, expectedAct[i].t)) &&
    bs3.combatState.clock.units['u-a'].actCount === undefined,
    'seq=' + JSON.stringify(act.actions)));

  // 同速两单位按稳定序（缺省稳定 ID 字典序）；恢复时输入数组重排不影响顺序
  const bs4 = lifecycle.emptyBattleState('sc-t03', 'bt-t03d');
  clock.createClock(bs4, [
    { id: 'u-beta', side: 'ally', baseSpd: 100 },
    { id: 'u-alpha', side: 'ally', baseSpd: 100 },
  ]);
  const same1 = drive(bs4, clock, 2);
  cases.push(ok('T03-01 同速按稳定ID字典序建轴（alpha先于beta）',
    eqJson(bs4.combatState.clock.order, ['u-alpha', 'u-beta']) &&
    same1.actions.length === 2 &&
    same1.actions[0].unitId === 'u-alpha' && near(same1.actions[0].t, 100) &&
    same1.actions[1].unitId === 'u-beta' && near(same1.actions[1].t, 100),
    'order=' + JSON.stringify(bs4.combatState.clock.order) + ' seq=' + JSON.stringify(same1.actions)));
  // 恢复：输入数组重排后再 createClock
  clock.createClock(bs4, [
    { id: 'u-beta', side: 'ally', baseSpd: 100 },
    { id: 'u-alpha', side: 'ally', baseSpd: 100 },
  ]);
  const orderAfterResume = bs4.combatState.clock.order.slice();
  const lapAlpha = bs4.progress['u-alpha'].lap;
  const nowAfterResume = bs4.combatState.clock.now;
  const same2 = drive(bs4, clock, 2);
  cases.push(ok('T03-01 恢复忽略输入数组顺序且不重置进度',
    eqJson(orderAfterResume, ['u-alpha', 'u-beta']) && lapAlpha === 1 && near(nowAfterResume, 100),
    'order=' + JSON.stringify(orderAfterResume) + ' lap=' + lapAlpha + ' now=' + nowAfterResume));
  cases.push(ok('T03-01 恢复后同刻仍按稳定序（alpha先于beta）',
    same2.actions.length === 2 &&
    same2.actions[0].unitId === 'u-alpha' && near(same2.actions[0].t, 200) &&
    same2.actions[1].unitId === 'u-beta' && near(same2.actions[1].t, 200) &&
    bs4.progress['u-alpha'].lap === 2,
    'seq=' + JSON.stringify(same2.actions) + ' lapAlpha=' + bs4.progress['u-alpha'].lap));

  return { cases };
}

// ---------- T03-02 途中变速保留已跑距离：t=30 由100改200，余7000用35时间 → t=65 ----------

async function t0302(deps) {
  const { clock, lifecycle } = deps.modules;
  const cases = [];
  const bs = lifecycle.emptyBattleState('sc-t03', 'bt-t03e');
  clock.createClock(bs, [
    { id: 'pacer', side: 'ally', baseSpd: 1000 },
    { id: 'runner', side: 'ally', baseSpd: 100 },
  ]);
  // 推进到 t=30（pacer 于 10/20/30 行动），在其行动冻结期内变速
  let frozen = null;
  let change = null;
  for (let i = 0; i < 10; i++) {
    const r = clock.advanceToNextAction(bs, {});
    if (r.status !== 'action') break;
    if (near(r.time, 30)) {
      const fr = clock.advanceToNextAction(bs, {});
      frozen = {
        status: fr.status, time: fr.time,
        now: bs.combatState.clock.now,
        dist: bs.progress.runner.distance,
      };
      const d = clock.dispatchClock(bs, { type: 'speedChange', unitId: 'runner' },
        { speedOf: id => (id === 'runner' ? 200 : 100) });
      change = {
        ok: d.ok,
        dist: bs.progress.runner.distance,
        lap: bs.progress.runner.lap,
        speedLog: entriesOf(bs, 'speed-changed').map(e => ({ t: e.t, unitId: e.unitId, speed: e.speed })),
        nextAt: clock.getUnitNextActionAt(bs, 'runner'),
      };
      clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, {});
      break;
    }
    clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, {});
  }
  cases.push(ok('T03-02 冻结期内推进返回frozen且时间进度静止',
    !!frozen && frozen.status === 'frozen' && near(frozen.time, 30) && near(frozen.now, 30) && near(frozen.dist, 3000),
    JSON.stringify(frozen)));
  cases.push(ok('T03-02 变速结算已跑距离3000不重置（非重新起跑）',
    !!change && change.ok === true && near(change.dist, 3000) && change.lap === 0 &&
    eqJson(change.speedLog, [{ t: 30, unitId: 'runner', speed: 200 }]),
    JSON.stringify(change)));

  // 变速后推进：pacer 40/50/60 照常；runner 余 7000 ÷ 200 = 35 → t=65 首行动
  let distAt60 = null;
  const post = [];
  let runnerGrant = null;
  for (let i = 0; i < 20; i++) {
    const r = clock.advanceToNextAction(bs, {});
    if (r.status !== 'action') break;
    if (r.unitId === 'runner') {
      runnerGrant = { t: r.time, lap: bs.progress.runner.lap, moveQuota: r.resources.moveQuota, dist: bs.progress.runner.distance };
      break;
    }
    post.push({ t: r.time, unitId: r.unitId });
    if (near(r.time, 60)) distAt60 = bs.progress.runner.distance;
    clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, {});
  }
  cases.push(ok('T03-02 余7000用35时间下次t=65且途中连续计息',
    !!change && near(change.nextAt, 65) && distAt60 !== null && near(distAt60, 9000) &&
    !!runnerGrant && near(runnerGrant.t, 65),
    'nextAt=' + (change && change.nextAt) + ' dist60=' + distAt60 + ' grant=' + JSON.stringify(runnerGrant)));
  cases.push(ok('T03-02 加速不是赠送轮次（lap=1配额标准）且pacer照常行动',
    !!runnerGrant && runnerGrant.lap === 1 && runnerGrant.moveQuota === 1 && runnerGrant.dist === 0 &&
    post.length === 3 && post.every((a, i) => a.unitId === 'pacer' && near(a.t, [40, 50, 60][i])),
    'post=' + JSON.stringify(post) + ' grant=' + JSON.stringify(runnerGrant)));

  return { cases };
}

// ---------- T03-03 速度归零停跑、到期事件照常推进、恢复后按剩余距离到轴不倒退 ----------

async function t0303(deps) {
  const { clock, lifecycle } = deps.modules;
  const cases = [];
  const eff = { pacer: 1000, runner: 100 };
  const speedOf = id => eff[id];
  const rules = {
    speedOf,
    onEvent: ev => { if (ev.type === 'spd-expired' && ev.unitId === 'runner') eff.runner = 100; },
  };
  const bs = lifecycle.emptyBattleState('sc-t03', 'bt-t03f');
  clock.createClock(bs, [
    { id: 'pacer', side: 'ally', baseSpd: 1000 },
    { id: 'runner', side: 'ally', baseSpd: 100 },
  ], { speedOf });
  // 推进到 t=30，施 spd 效果把有效速度归零（endAt=100）
  let applied = null;
  for (let i = 0; i < 10; i++) {
    const r = clock.advanceToNextAction(bs, rules);
    if (r.status !== 'action') break;
    if (near(r.time, 30)) {
      const distBefore = bs.progress.runner.distance;
      eff.runner = 0; // 先把有效速度归零，spd 效果登记时引擎经 speedOf 读取并落档
      const d = clock.dispatchClock(bs, {
        type: 'applyStatus', unitId: 'runner', source: 'frost-lock', kind: 'spd', duration: 70,
      }, rules);
      const rec = statusOf(bs, 'runner', 'frost-lock');
      applied = {
        ok: d.ok, distBefore,
        endAt: rec ? rec.endAt : null,
        speed: bs.combatState.clock.units.runner.speed,
        dist: bs.progress.runner.distance,
      };
      clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, rules);
      break;
    }
    clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, rules);
  }
  // 停跑期：pacer 40..90 照常推进，runner 距离恒 3000、无行动
  const frozenDists = [];
  const seqTo90 = [];
  for (let i = 0; i < 20; i++) {
    const r = clock.advanceToNextAction(bs, rules);
    if (r.status !== 'action') break;
    seqTo90.push(r.unitId);
    frozenDists.push(bs.progress.runner.distance);
    clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, rules);
    if (near(r.time, 90)) break;
  }
  cases.push(ok('T03-03 归零生效且已跑距离3000保留',
    !!applied && applied.ok === true && near(applied.distBefore, 3000) &&
    near(applied.endAt, 100) && applied.speed === 0 && near(applied.dist, 3000),
    JSON.stringify(applied)));
  cases.push(ok('T03-03 停跑期间距离冻结且runner无行动（非重新起跑）',
    frozenDists.length === 6 && frozenDists.every(d => near(d, 3000)) &&
    seqTo90.length === 6 && seqTo90.every(id => id === 'pacer'),
    'dists=' + JSON.stringify(frozenDists) + ' seq=' + JSON.stringify(seqTo90)));

  // t=100：到期事件照常推进（全局时钟不依赖零速单位的行动）并恢复速度
  const r100 = clock.advanceToNextAction(bs, rules);
  const spdExp = entriesOf(bs, 'spd-expired');
  const restored = {
    grantUnit: r100.status === 'action' ? r100.unitId : null,
    grantTime: r100.time,
    expired: spdExp.map(e => ({ t: e.t, unitId: e.unitId })),
    speed: bs.combatState.clock.units.runner.speed,
    dist: bs.progress.runner.distance,
  };
  if (r100.status === 'action') clock.dispatchClock(bs, { type: 'endAction', unitId: r100.unitId }, rules);
  cases.push(ok('T03-03 到期事件照常推进且速度恢复为100',
    restored.expired.length === 1 && near(restored.expired[0].t, 100) && restored.expired[0].unitId === 'runner' &&
    restored.speed === 100 && near(restored.dist, 3000) &&
    restored.grantUnit === 'pacer' && near(restored.grantTime, 100),
    JSON.stringify(restored)));

  // 恢复后按剩余距离到轴：剩余 7000 ÷ 100 = 70 → t=170（停跑期不追溯计距、不倒退）
  const nextAt = clock.getUnitNextActionAt(bs, 'runner');
  let runnerFirst = null;
  for (let i = 0; i < 20; i++) {
    const r = clock.advanceToNextAction(bs, rules);
    if (r.status !== 'action') break;
    if (r.unitId === 'runner') {
      runnerFirst = { t: r.time, lap: bs.progress.runner.lap, dist: bs.progress.runner.distance };
      break;
    }
    clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, rules);
  }
  cases.push(ok('T03-03 恢复后按剩余距离到轴不倒退（100+7000/100=170）',
    nextAt !== null && near(nextAt, 170) && !!runnerFirst && near(runnerFirst.t, 170) &&
    runnerFirst.lap === 1 && runnerFirst.dist === 0,
    'nextAt=' + nextAt + ' first=' + JSON.stringify(runnerFirst)));

  // 负速按零处理：不计时距、无到轴、不被发放行动
  const effN = { neg: -50, tick: 1000 };
  const bsN = lifecycle.emptyBattleState('sc-t03', 'bt-t03g');
  clock.createClock(bsN, [
    { id: 'neg', side: 'ally', baseSpd: 200 },
    { id: 'tick', side: 'ally', baseSpd: 1000 },
  ], { speedOf: id => effN[id] });
  const rN = drive(bsN, clock, 2, { speedOf: id => effN[id] });
  cases.push(ok('T03-03 负速按零处理：不计时距无到轴不被发放行动',
    bsN.progress.neg.distance === 0 &&
    clock.getUnitNextActionAt(bsN, 'neg') === null &&
    bsN.combatState.clock.units.neg.speed === -50 &&
    rN.actions.length === 2 && !rN.actions.some(a => a.unitId === 'neg'),
    'dist=' + bsN.progress.neg.distance + ' next=' + clock.getUnitNextActionAt(bsN, 'neg')));
  const bsSolo = lifecycle.emptyBattleState('sc-t03', 'bt-t03h');
  clock.createClock(bsSolo, [{ id: 'neg', side: 'ally', baseSpd: 200 }], { speedOf: () => -50 });
  const term = clock.advanceToNextAction(bsSolo, {});
  cases.push(ok('T03-03 仅负速单位视同无人可行动（僵持预检）',
    term.status === 'terminal' && !!term.terminal && term.terminal.type === 'stalemate' && near(term.time, 0),
    JSON.stringify({ status: term.status, terminal: term.terminal })));

  return { cases };
}

// ---------- T03-04 t=35施毒持续300、t=125同源重施：首跳仍135、保节拍、末跳先于移除 ----------

async function t0304(deps) {
  const { clock, scheduler, lifecycle } = deps.modules;
  const cases = [];
  const bs = lifecycle.emptyBattleState('sc-t03', 'bt-t03i');
  // 施法者速度 2000：每 5 时间到轴（5,10,…），可在 t=35 / t=125 精确落点施毒
  clock.createClock(bs, [
    { id: 'caster', side: 'ally', baseSpd: 2000 },
    { id: 'victim', side: 'enemy', baseSpd: 0 },
  ]);
  const cadence = { casterId: 'caster', skillId: 'venom', effectId: 'slot-1' };
  let recAtApply = null;
  let recAtRefresh = null;
  let applied = false;
  let refreshed = false;
  for (let i = 0; i < 120; i++) {
    const r = clock.advanceToNextAction(bs, {});
    if (r.status !== 'action') break;
    if (near(r.time, 35) && !applied) {
      applied = true;
      clock.dispatchClock(bs, {
        type: 'applyStatus', unitId: 'victim', source: cadence, kind: 'poison', strength: 5, duration: 300,
      });
      recAtApply = Object.assign({}, statusOf(bs, 'victim', cadence));
    }
    if (near(r.time, 125) && applied && !refreshed) {
      refreshed = true;
      clock.dispatchClock(bs, {
        type: 'applyStatus', unitId: 'victim', source: cadence, kind: 'poison', strength: 8, duration: 300,
      });
      recAtRefresh = Object.assign({}, statusOf(bs, 'victim', cadence));
    }
    clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, {});
    if (entriesOf(bs, 'status-expired').length > 0) break;
  }
  const ticks = entriesOf(bs, 'dot-tick').filter(e => e.unitId === 'victim');
  const tickTimes = ticks.map(e => e.t);
  const tickStrengths = ticks.map(e => e.strength);
  const expired = entriesOf(bs, 'status-expired');
  const refreshedLog = entriesOf(bs, 'status-refreshed');
  cases.push(ok('T03-04 首跳恰在t=135（施毒后+100，不因重施推迟）',
    !!recAtApply && near(recAtApply.nextTickAt, 135) && near(recAtApply.endAt, 335) &&
    timesNear(tickTimes, [135, 235, 335]),
    'rec=' + JSON.stringify(recAtApply) + ' ticks=' + JSON.stringify(tickTimes)));
  cases.push(ok('T03-04 同源重施保节拍仅更新强度与到期（endAt=125+300）',
    !!recAtRefresh && near(recAtRefresh.nextTickAt, 135) && near(recAtRefresh.endAt, 425) &&
    recAtRefresh.strength === 8 &&
    refreshedLog.length === 1 && near(refreshedLog[0].t, 125) &&
    eqJson(tickStrengths, [8, 8, 8]),
    'rec=' + JSON.stringify(recAtRefresh) + ' strengths=' + JSON.stringify(tickStrengths)));
  cases.push(ok('T03-04 末跳先于到期移除且过期后不再跳',
    expired.length === 1 && near(expired[0].t, 425) &&
    tickTimes.length === 3 && tickTimes.every(t => t < 425 - 1e-6),
    'expired=' + JSON.stringify(expired.map(e => e.t)) + ' ticks=' + JSON.stringify(tickTimes)));

  // 边界：末跳与到期同刻 → 先跳后移（阶段①先于②）
  const bs2 = lifecycle.emptyBattleState('sc-t03', 'bt-t03j');
  clock.createClock(bs2, [{ id: 'victim2', side: 'enemy', baseSpd: 0 }]);
  clock.dispatchClock(bs2, {
    type: 'applyStatus', unitId: 'victim2', source: { casterId: 'caster2', skillId: 'venom2', effectId: 'slot-1' }, kind: 'poison', strength: 4, duration: 300,
  });
  const rT = clock.advanceToNextAction(bs2, {});
  const types300 = typesAt(bs2, 300);
  const miniTicks = entriesOf(bs2, 'dot-tick').map(e => e.t);
  cases.push(ok('T03-04 末跳与到期同刻先跳后移（跳完才移除）',
    rT.status === 'terminal' && !!rT.terminal && rT.terminal.type === 'stalemate' && near(rT.time, 300) &&
    eqJson(types300, ['dot-tick', 'status-expired', 'stalemate']) &&
    timesNear(miniTicks, [100, 200, 300]),
    'types300=' + JSON.stringify(types300) + ' ticks=' + JSON.stringify(miniTicks)));

  // 来源身份包含目标、施术者、技能与效果槽；不同施术者的同名技能不可互刷。
  const bs3 = lifecycle.emptyBattleState('sc-t03', 'bt-t03source');
  clock.createClock(bs3, [{ id: 'target', side: 'enemy', baseSpd: 0 }]);
  const sourceA = { casterId: 'hero-a', skillId: 'venom', effectId: 'slot-1' };
  const sourceB = { casterId: 'hero-b', skillId: 'venom', effectId: 'slot-1' };
  clock.dispatchClock(bs3, { type: 'applyStatus', unitId: 'target', source: sourceA, kind: 'poison', strength: 3, duration: 300 });
  clock.dispatchClock(bs3, { type: 'applyStatus', unitId: 'target', source: sourceB, kind: 'poison', strength: 5, duration: 400 });
  const keyA = scheduler.statusKeyOf('target', sourceA);
  const keyB = scheduler.statusKeyOf('target', sourceB);
  const cadenceB = bs3.combatState.clock.statuses[keyB].nextTickAt;
  clock.dispatchClock(bs3, { type: 'applyStatus', unitId: 'target', source: sourceA, kind: 'poison', strength: 8, duration: 500 });
  const recA = bs3.combatState.clock.statuses[keyA];
  const recB = bs3.combatState.clock.statuses[keyB];
  cases.push(ok('T03-04 同目标同技能不同施术者建立独立状态键',
    keyA !== keyB && Object.keys(bs3.combatState.clock.statuses).length === 2 &&
    recA.strength === 8 && near(recA.endAt, 500) && near(recA.nextTickAt, 100) &&
    recB.strength === 5 && near(recB.endAt, 400) && near(recB.nextTickAt, cadenceB),
    'keys=' + JSON.stringify([keyA, keyB]) + ' A=' + JSON.stringify(recA) + ' B=' + JSON.stringify(recB)));

  return { cases };
}

// ---------- T03-05 救援截止/CD归零/到轴同刻t=300：先效果与截止、后行动 ----------

async function t0305(deps) {
  const { clock, scheduler, lifecycle } = deps.modules;
  const cases = [];
  const bs = lifecycle.emptyBattleState('sc-t03', 'bt-t03k');
  clock.createClock(bs, [
    { id: 'hero', side: 'ally', baseSpd: 100 },
    { id: 'patient', side: 'ally', baseSpd: 100 },
  ]);
  clock.dispatchClock(bs, { type: 'exitUnit', unitId: 'patient', cause: 'down' });
  clock.dispatchClock(bs, { type: 'scheduleRescue', unitId: 'patient', deadline: 300 });
  clock.dispatchClock(bs, { type: 'applyCooldown', unitId: 'hero', skillKey: 'ult', duration: 300 });
  clock.dispatchClock(bs, {
    type: 'applyStatus', unitId: 'patient', source: { casterId: 'hero', skillId: 'venom', effectId: 'slot-1' }, kind: 'poison', strength: 5, duration: 600,
  });
  let grant300 = null;
  const cdAt = {};
  for (let i = 0; i < 8; i++) {
    const r = clock.advanceToNextAction(bs, {});
    if (r.status !== 'action') break;
    if (near(r.time, 300)) {
      grant300 = {
        unitId: r.unitId,
        types: r.events.map(e => e.type),
        ts: r.events.map(e => e.t),
        cdNow: bs.cooldowns && bs.cooldowns.hero ? bs.cooldowns.hero.ult : undefined,
        rescues: Object.keys(bs.combatState.clock.rescues),
        patientStatus: bs.combatState.clock.units.patient.status,
        logTypes: typesAt(bs, 300),
      };
      clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, {});
      continue;
    }
    if (near(r.time, 100) || near(r.time, 200)) {
      cdAt[r.time] = bs.cooldowns && bs.cooldowns.hero ? bs.cooldowns.hero.ult : undefined;
    }
    clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, {});
  }
  drive(bs, clock, 1); // 推过 t=400，验证截止/解除不重发
  const refired = clockLog(bs).filter(e =>
    (e.type === 'rescue-deadline' || e.type === 'cooldown-ready') && e.t > 300 + 1e-6);
  cases.push(ok('T03-05 t=300同刻事件按契约阶段序（先效果与截止后行动）',
    !!grant300 && grant300.unitId === 'hero' &&
    eqJson(grant300.types, ['dot-tick', 'cooldown-ready', 'rescue-deadline', 'action-granted']) &&
    grant300.ts.every(t => near(t, 300)) &&
    eqJson(grant300.logTypes, ['dot-tick', 'cooldown-ready', 'rescue-deadline', 'action-granted']),
    JSON.stringify(grant300)));
  cases.push(ok('T03-05 归零CD当次可用（未到期不提前解除且不重发）',
    cdAt[100] === 300 && cdAt[200] === 300 && !!grant300 && grant300.cdNow === undefined &&
    entriesOf(bs, 'cooldown-ready').length === 1 && refired.length === 0,
    'cd100=' + cdAt[100] + ' cd200=' + cdAt[200] + ' refired=' + refired.length));
  cases.push(ok('T03-05 压线救援来不及（截止先于当刻行动且不自动救起）',
    !!grant300 && grant300.rescues.length === 0 && grant300.patientStatus === 'down' &&
    entriesOf(bs, 'rescue-deadline').length === 1 && near(entriesOf(bs, 'rescue-deadline')[0].t, 300) &&
    grant300.types.indexOf('rescue-deadline') < grant300.types.indexOf('action-granted'),
    JSON.stringify(grant300)));

  // 缺省救援窗口 = now+300；压线前取消则无截止事件
  const bs2 = lifecycle.emptyBattleState('sc-t03', 'bt-t03l');
  clock.createClock(bs2, [{ id: 'x', side: 'ally', baseSpd: 100 }]);
  clock.dispatchClock(bs2, { type: 'scheduleRescue', unitId: 'x' });
  const defaultDeadline = bs2.combatState.clock.rescues.x.deadline;
  const cancel = clock.dispatchClock(bs2, { type: 'cancelRescue', unitId: 'x' });
  drive(bs2, clock, 4);
  cases.push(ok('T03-05 缺省救援窗口=now+300',
    near(defaultDeadline, scheduler.DEFAULT_RESCUE_TIME) && near(defaultDeadline, 300),
    'deadline=' + defaultDeadline));
  cases.push(ok('T03-05 压线前取消后无截止事件',
    cancel.ok === true && entriesOf(bs2, 'rescue-deadline').length === 0,
    'cancelled=' + cancel.ok));

  // —— 增补①：临时眩晕（非永久）到轴跳过、资源不发、待领取点保留、重跑一圈后交付 ——
  const bsS = lifecycle.emptyBattleState('sc-t03', 'bt-t03s');
  clock.createClock(bsS, [{ id: 'bashful', side: 'ally', baseSpd: 1000 }]);
  const stunApply = clock.dispatchClock(bsS, { type: 'applyStun', unitId: 'bashful' });
  const pendingPre = clock.dispatchClock(bsS, { type: 'grantMainPoint', targetId: 'bashful', sourceKey: '再动A' });
  const rStun = clock.advanceToNextAction(bsS, {});
  const skips = entriesOf(bsS, 'stun-skip');
  const grantsAt10 = entriesOf(bsS, 'action-granted').filter(e => near(e.t, 10));
  cases.push(ok('T03-05 临时眩晕到轴发stun-skip且消耗眩晕',
    stunApply.ok === true && pendingPre.ok === true &&
    skips.length === 1 && near(skips[0].t, 10) && skips[0].unitId === 'bashful' &&
    bsS.combatState.clock.units.bashful.stun === null,
    'skips=' + JSON.stringify(skips) + ' stunLeft=' + JSON.stringify(bsS.combatState.clock.units.bashful.stun)));
  cases.push(ok('T03-05 眩晕本圈资源不发且重跑一圈后t=20取得行动',
    grantsAt10.length === 0 &&
    !!rStun && rStun.status === 'action' && rStun.unitId === 'bashful' && near(rStun.time, 20) &&
    rStun.resources.moveQuota === 1 && bsS.progress.bashful.lap === 1,
    'grant=' + JSON.stringify({ status: rStun.status, time: rStun.time, unitId: rStun.unitId, res: rStun.resources }) +
    ' grantsAt10=' + grantsAt10.length));
  cases.push(ok('T03-05 待领取点跨眩晕保留并在下次自然行动交付（main=2）',
    rStun.resources.universal === 1 && eqJson(rStun.resources.deliveredMainSources, ['再动A']) &&
    entriesOf(bsS, 'main-point-granted').length === 1,
    'res=' + JSON.stringify(rStun.resources)));

  // —— 增补②：隐匿窗口每100时间发事件、wasHit 先false后true、事件后复位 ——
  const bsW = lifecycle.emptyBattleState('sc-t03', 'bt-t03t');
  clock.createClock(bsW, [
    { id: 'watcher', side: 'ally', baseSpd: 1000 },
    { id: 'ghost', side: 'enemy', baseSpd: 0 },
  ]);
  const stealthApply = clock.dispatchClock(bsW, {
    type: 'applyStatus', unitId: 'ghost', source: '潜行', kind: 'stealth-window',
  });
  for (let i = 0; i < 40; i++) {
    const r = clock.advanceToNextAction(bsW, {});
    if (r.status !== 'action') break;
    if (near(r.time, 150)) clock.dispatchClock(bsW, { type: 'markHit', unitId: 'ghost' });
    clock.dispatchClock(bsW, { type: 'endAction', unitId: r.unitId }, {});
    if (entriesOf(bsW, 'stealth-window').length >= 3) break;
  }
  const wins = entriesOf(bsW, 'stealth-window');
  cases.push(ok('T03-05 隐匿窗口每100时间发事件（t=100/200/300）',
    stealthApply.ok === true && wins.length === 3 && timesNear(wins.map(e => e.t), [100, 200, 300]),
    'wins=' + JSON.stringify(wins.map(e => ({ t: e.t, wasHit: e.wasHit })))));
  cases.push(ok('T03-05 wasHit先false后true且事件后窗口标记复位',
    wins.length === 3 && wins[0].wasHit === false && wins[1].wasHit === true && wins[2].wasHit === false &&
    bsW.combatState.clock.units.ghost.hitSinceWindow === false,
    'wasHit=' + JSON.stringify(wins.map(e => e.wasHit))));

  // —— 增补③：再动全链路（立即加点/同源拒绝/待领取交付/exitUnit清除） ——
  const bsR = lifecycle.emptyBattleState('sc-t03', 'bt-t03u');
  clock.createClock(bsR, [
    { id: 'a-actor', side: 'ally', baseSpd: 1000 },
    { id: 'b-buddy', side: 'ally', baseSpd: 500 },
  ]);
  let im1 = null, im2 = null, im3 = null, stateFirst = null, stateAfterThird = null, endState = null;
  let pend = null, pendSnapshot = null, buddyGrant = null, pendB = null, exitB = null, pendAfterExit = null;
  for (let i = 0; i < 20; i++) {
    const r = clock.advanceToNextAction(bsR, {});
    if (r.status !== 'action') break;
    const t = r.time;
    if (near(t, 10) && !im1) {
      im1 = clock.dispatchClock(bsR, { type: 'grantMainPoint', targetId: 'a-actor', sourceKey: '迅捷' });
      stateFirst = clock.getActionState(bsR);
      im2 = clock.dispatchClock(bsR, { type: 'grantMainPoint', targetId: 'a-actor', sourceKey: '迅捷' });
      im3 = clock.dispatchClock(bsR, { type: 'grantMainPoint', targetId: 'a-actor', sourceKey: '风行' });
      stateAfterThird = clock.getActionState(bsR);
      clock.dispatchClock(bsR, { type: 'endAction', unitId: r.unitId }, {});
      endState = {
        extraMain: bsR.combatState.clock.units['a-actor'].extraMain,
        sources: bsR.combatState.clock.units['a-actor'].mainPointSources.slice(),
        state: clock.getActionState(bsR),
      };
      continue;
    }
    if (near(t, 20) && r.unitId === 'a-actor' && !pend) {
      pend = clock.dispatchClock(bsR, { type: 'grantMainPoint', targetId: 'b-buddy', sourceKey: '援射' });
      pendSnapshot = bsR.combatState.clock.pendingMainPoints.slice();
      clock.dispatchClock(bsR, { type: 'endAction', unitId: r.unitId }, {});
      continue;
    }
    if (r.unitId === 'b-buddy' && !buddyGrant) {
      buddyGrant = { t: r.time, res: r.resources };
      clock.dispatchClock(bsR, { type: 'endAction', unitId: r.unitId }, {});
      continue;
    }
    if (near(t, 30) && !pendB) {
      pendB = clock.dispatchClock(bsR, { type: 'grantMainPoint', targetId: 'b-buddy', sourceKey: '再动B' });
      exitB = clock.dispatchClock(bsR, { type: 'exitUnit', unitId: 'b-buddy', cause: 'down' });
      pendAfterExit = bsR.combatState.clock.pendingMainPoints.slice();
      clock.dispatchClock(bsR, { type: 'endAction', unitId: r.unitId }, {});
      break;
    }
    clock.dispatchClock(bsR, { type: 'endAction', unitId: r.unitId }, {});
  }
  const grantLogs = entriesOf(bsR, 'main-point-granted');
  cases.push(ok('T03-05 行动中grantMainPoint立即加点且getActionState实时含余额',
    !!im1 && im1.ok === true && !!stateFirst && stateFirst.unitId === 'a-actor' &&
    stateFirst.resources.universal === 1 &&
    grantLogs.some(e => e.immediate === true && e.targetId === 'a-actor' && e.sourceKey === '迅捷'),
    'state=' + JSON.stringify(stateFirst) + ' logs=' + JSON.stringify(grantLogs)));
  cases.push(ok('T03-05 同sourceKey本次行动二次拒绝而不同来源可叠加',
    !!im2 && im2.ok === false && im2.events.length === 0 &&
    !!im3 && im3.ok === true && !!stateAfterThird && stateAfterThird.resources.universal === 2,
    'dup=' + JSON.stringify(im2) + ' third=' + JSON.stringify(im3) +
    ' state=' + JSON.stringify(stateAfterThird)));
  cases.push(ok('T03-05 endAction清未用点并解冻（getActionState回null）',
    !!endState && endState.extraMain === 0 && eqJson(endState.sources, []) && endState.state === null,
    JSON.stringify(endState)));
  cases.push(ok('T03-05 非当前行动者转待领取并在其自然行动交付（main=2）',
    !!pend && pend.ok === true && eqJson(pendSnapshot, [{ targetId: 'b-buddy', sourceKey: '援射' }]) &&
    !!buddyGrant && near(buddyGrant.t, 20) && buddyGrant.res.main === 1 && buddyGrant.res.universal === 1 &&
    eqJson(buddyGrant.res.deliveredMainSources, ['援射']),
    'pend=' + JSON.stringify(pend) + ' snapshot=' + JSON.stringify(pendSnapshot) +
    ' grant=' + JSON.stringify(buddyGrant)));
  cases.push(ok('T03-05 exitUnit清除指向该单位的待领取点',
    !!pendB && pendB.ok === true && !!exitB && exitB.ok === true && eqJson(pendAfterExit, []),
    'pendB=' + JSON.stringify(pendB) + ' afterExit=' + JSON.stringify(pendAfterExit)));

  // —— 增补④：机会门槛（含同刻）、defend 100 到期、periodic 按 interval 结算 ——
  const bsG = lifecycle.emptyBattleState('sc-t03', 'bt-t03v');
  clock.createClock(bsG, [
    { id: 'driver', side: 'ally', baseSpd: 1000 },
    { id: 'sentry', side: 'enemy', baseSpd: 0 },
  ]);
  const gate = clock.dispatchClock(bsG, { type: 'setOpportunityGate', key: '偷袭' });
  const defend = clock.dispatchClock(bsG, {
    type: 'applyStatus', unitId: 'driver', source: '铁壁', kind: 'defend', duration: 100,
  });
  const periodic = clock.dispatchClock(bsG, {
    type: 'applyStatus', unitId: 'sentry', source: '蓄能', kind: 'periodic', interval: 50,
  });
  const gateAt = {
    readyAt: bsG.combatState.clock.opportunityGates['偷袭'],
    now0: clock.isOpportunityReadyAt(bsG, '偷袭'),
    at50: null, at100: null,
  };
  for (let i = 0; i < 30; i++) {
    const r = clock.advanceToNextAction(bsG, {});
    if (r.status !== 'action') break;
    if (near(r.time, 50) && gateAt.at50 === null) gateAt.at50 = clock.isOpportunityReadyAt(bsG, '偷袭');
    if (near(r.time, 100) && gateAt.at100 === null) gateAt.at100 = clock.isOpportunityReadyAt(bsG, '偷袭');
    clock.dispatchClock(bsG, { type: 'endAction', unitId: r.unitId }, {});
    if (entriesOf(bsG, 'periodic-tick').length >= 4) break;
  }
  const ticks = entriesOf(bsG, 'periodic-tick').map(e => e.t);
  const defends = entriesOf(bsG, 'defend-expired');
  cases.push(ok('T03-05 机会门槛readyAt=now+100且到期前false同刻起true',
    gate.ok === true && near(gateAt.readyAt, 100) && gateAt.now0 === false &&
    gateAt.at50 === false && gateAt.at100 === true,
    JSON.stringify(gateAt)));
  cases.push(ok('T03-05 defend恰100时间到期发defend-expired',
    defend.ok === true && defends.length === 1 && near(defends[0].t, 100) && defends[0].kind === 'defend',
    'defends=' + JSON.stringify(defends.map(e => ({ t: e.t, kind: e.kind })))));
  cases.push(ok('T03-05 periodic按interval=50结算且零速单位照常触发',
    periodic.ok === true && timesNear(ticks, [50, 100, 150, 200]),
    'ticks=' + JSON.stringify(ticks)));

  // —— 增补⑤：待领取交付并入冻结期实时余额（getActionState main=2，业务侧 extraMain 修复回归） ——
  const bsM = lifecycle.emptyBattleState('sc-t03', 'bt-t03w');
  clock.createClock(bsM, [{ id: 'receiver', side: 'ally', baseSpd: 1000 }]);
  const pendPoint = clock.dispatchClock(bsM, { type: 'grantMainPoint', targetId: 'receiver', sourceKey: '策应' });
  const stateBefore = clock.getActionState(bsM);
  const rM = clock.advanceToNextAction(bsM, {});
  const stateFrozen = clock.getActionState(bsM);
  const extraFrozen = bsM.combatState.clock.units.receiver.extraMain; // endAction 前捕获
  clock.dispatchClock(bsM, { type: 'endAction', unitId: rM.unitId }, {});
  const stateAfter = clock.getActionState(bsM);
  const extraAfter = bsM.combatState.clock.units.receiver.extraMain;
  cases.push(ok('T03-05 交付点入冻结期实时余额（getActionState main=2）',
    pendPoint.ok === true && stateBefore === null &&
    rM.status === 'action' && rM.unitId === 'receiver' && near(rM.time, 10) &&
    rM.resources.universal === 1 && eqJson(rM.resources.deliveredMainSources, ['策应']) &&
    !!stateFrozen && stateFrozen.unitId === 'receiver' &&
    stateFrozen.resources.main === 1 && stateFrozen.resources.universal === 1 && stateFrozen.resources.moveQuota === 1 && stateFrozen.resources.aux === 1 &&
    extraFrozen === 1 &&
    stateAfter === null && extraAfter === 0,
    'frozen=' + JSON.stringify(stateFrozen) + ' extraFrozen=' + extraFrozen +
    ' res=' + JSON.stringify(rM.resources) + ' after=' + JSON.stringify(stateAfter)));

  return { cases };
}

// ---------- T03-06 新单位t=120注册（速度200首行动170）、重复注册拒绝、隐藏巡逻零泄露、离场/复活 ----------

async function t0306(deps) {
  const { clock, lifecycle } = deps.modules;
  const cases = [];
  const bs = lifecycle.emptyBattleState('sc-t03', 'bt-t03m');
  clock.createClock(bs, [{ id: 'pacer', side: 'ally', baseSpd: 1000, name: '先导' }]);
  const reg = {};
  const seq = [];
  for (let i = 0; i < 60; i++) {
    const r = clock.advanceToNextAction(bs, {});
    if (r.status !== 'action') break;
    const t = r.time;
    seq.push({ t: r.time, unitId: r.unitId });
    if (near(t, 120) && !reg.done) {
      reg.done = true;
      reg.spawn = clock.dispatchClock(bs, {
        type: 'registerUnit', fresh: true, unit: { id: 'spawn', side: 'ally', baseSpd: 200, name: '援军' },
      });
      reg.scout = clock.dispatchClock(bs, {
        type: 'registerUnit', fresh: true, unit: { id: 'scout', side: 'enemy', baseSpd: 200, name: '斥候' },
      });
      reg.patrol = clock.dispatchClock(bs, {
        type: 'registerUnit', fresh: true, unit: { id: 'patrol', side: 'enemy', baseSpd: 1000, name: '暗哨' },
      });
      reg.dupPacer = clock.dispatchClock(bs, {
        type: 'registerUnit', fresh: true, unit: { id: 'pacer', side: 'ally', baseSpd: 1000 },
      });
      reg.order = bs.combatState.clock.order.slice();
      reg.spawnRec = Object.assign({}, bs.combatState.clock.units.spawn);
      reg.spawnProg = Object.assign({}, bs.progress.spawn);
      reg.spawnNext = clock.getUnitNextActionAt(bs, 'spawn');
      reg.queue = clock.getVisibleTurnQueue(bs, 'ally', { visibleUnitIds: ['scout'] });
      reg.queueIds = reg.queue.map(row => row.unitId);
      reg.regLogCount = entriesOf(bs, 'unit-registered').length;
    }
    if (near(t, 130) && !reg.dupScout) {
      reg.dupScout = true;
      reg.scoutDistAt130 = bs.progress.scout.distance;
      reg.dupScoutRes = clock.dispatchClock(bs, {
        type: 'registerUnit', fresh: true, unit: { id: 'scout', side: 'enemy', baseSpd: 200 },
      });
      reg.scoutDistAfter = bs.progress.scout.distance;
      reg.scoutNextAfter = clock.getUnitNextActionAt(bs, 'scout');
    }
    if (near(t, 150) && !reg.exited) {
      reg.exited = true;
      reg.exitRes = clock.dispatchClock(bs, { type: 'exitUnit', unitId: 'scout', cause: 'down' });
      reg.scoutDistAt150 = bs.progress.scout.distance;
      reg.scoutStatusAfterExit = bs.combatState.clock.units.scout.status;
      reg.scoutNextAfterExit = clock.getUnitNextActionAt(bs, 'scout');
      reg.queueDown = clock.getVisibleTurnQueue(bs, 'ally', { visibleUnitIds: ['scout'] });
      reg.queueDownIds = reg.queueDown.map(row => row.unitId);
    }
    if (near(t, 200) && !reg.reentered) {
      reg.reentered = true;
      reg.distAt200WhileDown = bs.progress.scout.distance;
      reg.reenterRes = clock.dispatchClock(bs, { type: 'reenterUnit', unitId: 'scout' });
      reg.reenterRec = {
        dist: bs.progress.scout.distance,
        lastSync: bs.combatState.clock.units.scout.lastSync,
        status: bs.combatState.clock.units.scout.status,
        next: clock.getUnitNextActionAt(bs, 'scout'),
      };
      reg.queueAt200 = clock.getVisibleTurnQueue(bs, 'ally', { visibleUnitIds: ['scout'] });
      reg.queueAt200Ids = reg.queueAt200.map(row => row.unitId);
    }
    clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, {});
    if (r.unitId === 'scout') { reg.scoutAction = { t: r.time }; break; }
  }
  const spawnLog = entriesOf(bs, 'unit-registered').filter(e => e.unitId === 'spawn')[0];
  const patrolActs = seq.filter(a => a.unitId === 'patrol');

  cases.push(ok('T03-06 新单位立即占位但首行动=注册时刻+10000/速度（120+50=170）',
    !!reg.spawn && reg.spawn.ok === true &&
    reg.spawnRec.spawnedAt === 120 && reg.spawnRec.lastSync === 120 &&
    reg.spawnRec.speed === 200 && reg.spawnRec.status === 'active' &&
    reg.spawnProg.distance === 0 && reg.spawnProg.lap === 0 &&
    near(reg.spawnNext, 170) &&
    !!spawnLog && spawnLog.via === 'spawn' && near(spawnLog.firstActionAt, 170) &&
    reg.queueIds.indexOf('spawn') >= 0 &&
    seq.some(a => a.unitId === 'spawn' && near(a.t, 170)),
    'rec=' + JSON.stringify(reg.spawnRec) + ' next=' + reg.spawnNext +
    ' log=' + JSON.stringify(spawnLog) + ' queue=' + JSON.stringify(reg.queueIds)));
  cases.push(ok('T03-06 重复注册被拒且不重置既有进度',
    !!reg.dupPacer && reg.dupPacer.ok === false && reg.dupPacer.events.length === 0 &&
    reg.regLogCount === 3 &&
    !!reg.dupScoutRes && reg.dupScoutRes.ok === false &&
    near(reg.scoutDistAt130, 2000) && near(reg.scoutDistAfter, 2000) && near(reg.scoutNextAfter, 170),
    'dupPacer=' + JSON.stringify(reg.dupPacer) + ' regLogs=' + reg.regLogCount +
    ' scoutDist=' + reg.scoutDistAfter + ' scoutNext=' + reg.scoutNextAfter));
  cases.push(ok('T03-06 隐藏巡逻单位内部正常调度但玩家轴零泄露',
    patrolActs.length >= 5 &&
    eqJson(reg.queueIds, ['pacer', 'spawn', 'scout']) &&
    reg.queueIds.indexOf('patrol') < 0 &&
    JSON.stringify(reg.queue).indexOf('暗哨') < 0 &&
    reg.queueAt200Ids.indexOf('patrol') < 0 && reg.queueAt200Ids.length === 3,
    'patrolActs=' + patrolActs.length + ' q120=' + JSON.stringify(reg.queueIds) +
    ' q200=' + JSON.stringify(reg.queueAt200Ids)));
  cases.push(ok('T03-06 exitUnit后不进轴不计时距（距离冻结6000）',
    !!reg.exitRes && reg.exitRes.ok === true &&
    reg.scoutStatusAfterExit === 'down' && reg.scoutNextAfterExit === null &&
    reg.queueDownIds.indexOf('scout') < 0 &&
    near(reg.scoutDistAt150, 6000) && near(reg.distAt200WhileDown, 6000),
    'dist150=' + reg.scoutDistAt150 + ' dist200=' + reg.distAt200WhileDown +
    ' next=' + reg.scoutNextAfterExit + ' qDown=' + JSON.stringify(reg.queueDownIds)));
  cases.push(ok('T03-06 reenterUnit从零跑圈（200+50=250）',
    !!reg.reenterRes && reg.reenterRes.ok === true &&
    reg.reenterRec.dist === 0 && near(reg.reenterRec.lastSync, 200) &&
    reg.reenterRec.status === 'active' && near(reg.reenterRec.next, 250) &&
    reg.queueAt200Ids.indexOf('scout') >= 0 &&
    !!reg.scoutAction && near(reg.scoutAction.t, 250),
    'rec=' + JSON.stringify(reg.reenterRec) + ' action=' + JSON.stringify(reg.scoutAction)));

  return { cases };
}

// ---------- T03-07 现实暂停30秒不推进虚拟时间；冻结期静止；JSON 往返重放一致 ----------

async function t0307(deps) {
  const { clock, lifecycle } = deps.modules;
  const cases = [];
  const mkSim = () => {
    const bs = lifecycle.emptyBattleState('sc-t03', 'bt-t03n');
    clock.createClock(bs, [
      { id: 'u-alpha', side: 'ally', baseSpd: 200 },
      { id: 'u-beta', side: 'ally', baseSpd: 100 },
    ]);
    return bs;
  };
  const driveN = (bs, n) => {
    const seq = [];
    for (let i = 0; i < n; i++) {
      const r = clock.advanceToNextAction(bs, {});
      if (r.status !== 'action') break;
      seq.push({ t: r.time, unitId: r.unitId });
      clock.dispatchClock(bs, { type: 'endAction', unitId: r.unitId }, {});
    }
    return seq;
  };

  // ① 冻结期推进返回 frozen 且完整快照逐字节不变
  const bsA = mkSim();
  const firstA = clock.advanceToNextAction(bsA, {});
  const snapBefore = JSON.stringify(bsA);
  const frozenA = clock.advanceToNextAction(bsA, {});
  const snapAfter = JSON.stringify(bsA);
  cases.push(ok('T03-07 冻结期推进返回frozen且完整快照不变',
    firstA.status === 'action' && near(firstA.time, 50) &&
    frozenA.status === 'frozen' && near(frozenA.time, 50) &&
    near(bsA.combatState.clock.now, 50) && snapBefore === snapAfter,
    'first=' + JSON.stringify(firstA) + ' frozen=' + JSON.stringify(frozenA) +
    ' snapshotSame=' + (snapBefore === snapAfter)));

  // ② 现实钟前移 30000ms（假想暂停动画/旁白30现实秒）→ 与未位移对照组逐字节一致
  const bsD = mkSim();
  driveN(bsD, 3);
  const realNow = Date.now;
  let shiftedSeq = null;
  try {
    Date.now = () => realNow() + 30000;
    shiftedSeq = driveN(bsD, 3);
  } finally {
    Date.now = realNow;
  }
  const bsE = mkSim();
  const controlSeq = driveN(bsE, 6);
  cases.push(ok('T03-07 现实钟前移30s虚拟推进与对照逐字节一致（引擎不读现实钟）',
    JSON.stringify(bsD) === JSON.stringify(bsE) &&
    near(bsD.combatState.clock.now, 200) && near(bsE.combatState.clock.now, 200) &&
    eqJson(shiftedSeq, controlSeq.slice(3)),
    'nowD=' + bsD.combatState.clock.now + ' nowE=' + bsE.combatState.clock.now +
    ' shifted=' + JSON.stringify(shiftedSeq)));

  // ③ JSON 往返恢复：now/order/进度保留，输入数组重排不影响 order
  const bsF = mkSim();
  driveN(bsF, 3);
  const snapS = JSON.stringify(bsF);
  const restored = JSON.parse(snapS);
  const resumed = clock.createClock(restored, [
    { id: 'u-beta', side: 'ally', baseSpd: 100 },
    { id: 'u-alpha', side: 'ally', baseSpd: 200 },
  ]);
  cases.push(ok('T03-07 恢复保留now/order/进度且输入重排不影响order',
    resumed === restored.combatState.clock &&
    near(restored.combatState.clock.now, 100) &&
    eqJson(restored.combatState.clock.order, ['u-alpha', 'u-beta']) &&
    eqJson(restored.progress, bsF.progress) &&
    restored.combatState.clock.seq === restored.combatState.clock.log.length,
    'now=' + restored.combatState.clock.now +
    ' order=' + JSON.stringify(restored.combatState.clock.order)));

  // ④ 恢复后相同命令序列 → 最终状态与事件流水逐字节一致
  const contF = driveN(bsF, 3);
  const contR = driveN(restored, 3);
  cases.push(ok('T03-07 相同命令序列重放后状态与log逐字节一致',
    JSON.stringify(bsF) === JSON.stringify(restored) && eqJson(contF, contR) &&
    near(restored.combatState.clock.now, 200),
    'nowR=' + restored.combatState.clock.now + ' identical=' +
    (JSON.stringify(bsF) === JSON.stringify(restored))));

  return { cases };
}

// ---------- T03-08 全员永久零速无未来事件 → 一次僵持终局；重复查询不重发；对照组不误判 ----------

async function t0308(deps) {
  const { clock, lifecycle } = deps.modules;
  const cases = [];

  // SimA：永久零速、无未来事件
  const bsA = lifecycle.emptyBattleState('sc-t03', 'bt-t03o');
  clock.createClock(bsA, [{ id: 'still', side: 'ally', baseSpd: 0 }]);
  const r1 = clock.advanceToNextAction(bsA, {});
  const staleAfterFirst = entriesOf(bsA, 'stalemate').length;
  const logLen1 = clockLog(bsA).length;
  const r2 = clock.advanceToNextAction(bsA, {});
  const r3 = clock.advanceToNextAction(bsA, {});
  cases.push(ok('T03-08 首次推进即一次僵持终局（不无限循环）',
    r1.status === 'terminal' && !!r1.terminal && r1.terminal.type === 'stalemate' &&
    near(r1.time, 0) && near(r1.terminal.at, 0) && staleAfterFirst === 1,
    JSON.stringify({ status: r1.status, terminal: r1.terminal, staleLogs: staleAfterFirst })));
  cases.push(ok('T03-08 重复查询不重发僵持且不恢复速度',
    r2.status === 'terminal' && r3.status === 'terminal' &&
    near(r2.terminal.at, 0) && near(r3.terminal.at, 0) &&
    entriesOf(bsA, 'stalemate').length === 1 && clockLog(bsA).length === logLen1 &&
    near(bsA.combatState.clock.now, 0) && bsA.combatState.clock.units.still.speed === 0,
    'staleLogs=' + entriesOf(bsA, 'stalemate').length + ' logLen=' + clockLog(bsA).length +
    ' speed=' + bsA.combatState.clock.units.still.speed));

  // SimB 对照：存在未到期 spd 效果 → 不得提前误判僵持；到期事件后才终局
  const bsB = lifecycle.emptyBattleState('sc-t03', 'bt-t03p');
  clock.createClock(bsB, [{ id: 'sleeper', side: 'ally', baseSpd: 0 }]);
  clock.dispatchClock(bsB, {
    type: 'applyStatus', unitId: 'sleeper', source: 'hex', kind: 'spd', duration: 100,
  });
  const rB = clock.advanceToNextAction(bsB, {});
  const spdExpB = entriesOf(bsB, 'spd-expired');
  cases.push(ok('T03-08 存在未到期spd时不误判僵持（推进至t=100到期后才终局）',
    rB.status === 'terminal' && !!rB.terminal && rB.terminal.type === 'stalemate' &&
    near(rB.terminal.at, 100) &&
    spdExpB.length === 1 && near(spdExpB[0].t, 100) &&
    entriesOf(bsB, 'stalemate').length === 1,
    'at=' + (rB.terminal && rB.terminal.at) + ' spdExpired=' + JSON.stringify(spdExpB.map(e => e.t))));

  // SimC：永久眩晕视为无人可行动；SimD：周期回血不阻止僵持判定
  const bsC = lifecycle.emptyBattleState('sc-t03', 'bt-t03q');
  clock.createClock(bsC, [{ id: 'caged', side: 'ally', baseSpd: 100 }]);
  clock.dispatchClock(bsC, { type: 'applyStun', unitId: 'caged', permanent: true });
  const rC = clock.advanceToNextAction(bsC, {});
  const bsD = lifecycle.emptyBattleState('sc-t03', 'bt-t03r');
  clock.createClock(bsD, [{ id: 'bedridden', side: 'ally', baseSpd: 0 }]);
  clock.dispatchClock(bsD, {
    type: 'applyStatus', unitId: 'bedridden', source: 'regen', kind: 'periodic', strength: 3,
  });
  const rD = clock.advanceToNextAction(bsD, {});
  cases.push(ok('T03-08 永久眩晕与周期状态均不阻止僵持（首推即t=0终局）',
    rC.status === 'terminal' && !!rC.terminal && rC.terminal.type === 'stalemate' && near(rC.time, 0) &&
    rD.status === 'terminal' && !!rD.terminal && rD.terminal.type === 'stalemate' && near(rD.time, 0),
    'C=' + JSON.stringify({ status: rC.status, terminal: rC.terminal }) +
    ' D=' + JSON.stringify({ status: rD.status, terminal: rD.terminal })));

  // 永久 DoT（endAt=null）不可无限推迟僵持；同一事件点最多结算一次后终局。
  const bsE = lifecycle.emptyBattleState('sc-t03', 'bt-t03forever');
  clock.createClock(bsE, [{ id: 'still-target', side: 'enemy', baseSpd: 0 }]);
  clock.dispatchClock(bsE, { type: 'applyStatus', unitId: 'still-target', source: { casterId: 'eternal', skillId: 'poison', effectId: 'permanent' }, kind: 'poison', strength: 1 });
  const rE = clock.advanceToNextAction(bsE, {});
  const rE2 = clock.advanceToNextAction(bsE, {});
  cases.push(ok('T03-08 永久DoT不阻止僵持且重复查询不重发',
    rE.status === 'terminal' && rE.terminal.type === 'stalemate' && near(rE.time, 0) &&
    entriesOf(bsE, 'dot-tick').length === 0 && entriesOf(bsE, 'stalemate').length === 1 &&
    rE2.status === 'terminal' && rE2.terminal.type === 'stalemate' && clockLog(bsE).length === 3,
    'first=' + JSON.stringify({ status: rE.status, time: rE.time }) +
    ' second=' + JSON.stringify({ status: rE2.status, time: rE2.time }) +
    ' dotTicks=' + entriesOf(bsE, 'dot-tick').length + ' log=' + clockLog(bsE).length));

  // 倒地：状态时钟继续，tick明确抑制伤害；存活目标同刻照常可结算。
  const bsF = lifecycle.emptyBattleState('sc-t03', 'bt-t03down-dot');
  clock.createClock(bsF, [
    { id: 'down-target', side: 'ally', baseSpd: 100 },
    { id: 'active-target', side: 'ally', baseSpd: 100 },
  ]);
  clock.dispatchClock(bsF, { type: 'exitUnit', unitId: 'down-target', cause: 'down' });
  clock.dispatchClock(bsF, { type: 'applyStatus', unitId: 'down-target', source: { casterId: 'c1', skillId: 'fire', effectId: 'slot0' }, kind: 'burn', strength: 4, duration: 200 });
  clock.dispatchClock(bsF, { type: 'applyStatus', unitId: 'active-target', source: { casterId: 'c1', skillId: 'fire', effectId: 'slot0' }, kind: 'burn', strength: 4, duration: 200 });
  const hitEvents = [];
  const rF = clock.advanceToNextAction(bsF, { onEvent: ev => hitEvents.push(ev) });
  const downTick = hitEvents.find(e => e.type === 'dot-tick' && e.unitId === 'down-target');
  const activeTick = hitEvents.find(e => e.type === 'dot-tick' && e.unitId === 'active-target');
  cases.push(ok('T03-08 倒地单位DoT照计时但标记suppressed，存活单位正常tick',
    near(rF.time, 100) && !!downTick && downTick.suppressed === true &&
    !!activeTick && activeTick.suppressed === false &&
    entriesOf(bsF, 'status-expired').length === 0,
    'at=' + rF.time + ' down=' + JSON.stringify(downTick) + ' active=' + JSON.stringify(activeTick)));

  return { cases };
}

export const groups = {
  'T03-01': { run: t0301 },
  'T03-02': { run: t0302 },
  'T03-03': { run: t0303 },
  'T03-04': { run: t0304 },
  'T03-05': { run: t0305 },
  'T03-06': { run: t0306 },
  'T03-07': { run: t0307 },
  'T03-08': { run: t0308 },
};
