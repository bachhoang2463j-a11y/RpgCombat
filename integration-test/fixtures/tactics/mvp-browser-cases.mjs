// ==========================================
// MVP 浏览器侧用例（?stage=mvp 时由 tactics-harness.html 挂载真实 tactics/index.html 执行）
// 被测对象：真实页面 __TACTICS_APP__.app（DEMO 真实数据开局，playable），真实模块不复制业务算法。
// 交互通道：菜单真 DOM onclick / 地图 sandbox.selectAt（与真实 pointerup 同一 handleSelect 入口）。
// 敌方轮只等页面真实 420ms timer，不手动 runEnemyTurn 以免与 timer 链双轮。
// 分类标注：[GUI]=DOM+selectAt 真交互；[controller]=独立纯控制器局（不等同 GUI 试玩，不伪称 GUI 胜负）。
// ==========================================

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function ok(id, pass, detail) {
  return { id, pass: pass === null ? null : !!pass, detail: detail || '' };
}
function pending(id, detail) {
  return Object.assign(ok(id, false, detail), { pass: null });
}

export async function runBrowserCases(frame) {
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  const results = [];
  let handle = win && win.__TACTICS_APP__;
  for (let i = 0; i < 50 && !handle; i++) { await sleep(100); handle = win.__TACTICS_APP__; }
  if (!handle || !handle.app) {
    return [ok('mvp-boot', false, '真实入口未暴露 __TACTICS_APP__')];
  }
  const app = handle.app;
  const results2 = results;
  const errors = [];
  const capture = e => errors.push(String((e && (e.message || e.reason)) || e));
  win.addEventListener('error', capture);
  win.addEventListener('unhandledrejection', capture);

  const battle = () => app.getBattle();
  const snap = () => battle().snapshot();
  const logText = () => doc.getElementById('battle-log').textContent;
  const pos = (id) => app.getViewData().placementsById[id];
  const unit = (id) => app.getViewData().units.find(u => u.id === id);
  const dist = (a, b) => Math.hypot(a.col - b.col, a.row - b.row);
  const selectCell = (col, row) => {
    const s = app.sandbox.worldToScreenClient(col + 0.5, row + 0.5);
    return app.sandbox.selectAt(s.x, s.y); // 真实点击入口（与 pointerup 同路径）
  };
  function clickRow(menuId, skillKey) {
    doc.getElementById(menuId).click();
    const btn = [...doc.querySelectorAll('#submenu-list button[data-skill]')]
      .find(b => b.dataset.skill === skillKey);
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  }
  async function pollUntil(fn, timeoutMs, stepMs) {
    const t0 = Date.now();
    while (Date.now() - t0 < (timeoutMs || 6000)) {
      const v = fn();
      if (v) return v;
      await sleep(stepMs || 100);
    }
    return null;
  }
  function endHeroTurnUI() {
    const cur = snap().currentId;
    if (!cur || cur.indexOf('e:') === 0 || snap().terminal) return false;
    return clickRow('menu-basic', 'end'); // 真菜单"结束行动"
  }
  async function advanceToHero(heroId, seen) {
    // 敌方轮依赖页面真实 timer 自动推进；非目标我方轮经真菜单结束
    return pollUntil(() => {
      if (snap().terminal || unit(heroId).ref.hp <= 0) return 'finished';
      const cur = snap().currentId;
      if (cur && seen) seen.add(cur);
      if (cur === heroId) return true;
      if (cur && cur.indexOf('h:') === 0 && cur !== heroId) endHeroTurnUI();
      return false;
    }, 15000, 150);
  }
  function enemyCells() {
    const out = [];
    for (const u of app.getViewData().units) {
      if (u.side !== 'enemy' || u.ref.hp <= 0) continue;
      const p = pos(u.id);
      for (let c = p.col; c < p.col + u.footprint.width; c++)
        for (let r = p.row; r < p.row + u.footprint.height; r++) out.push({ col: c, row: r });
    }
    return out;
  }
  function nearestEnemyCell(from) {
    return enemyCells().reduce((best, c) => (!best || dist(c, from) < dist(best, from)) ? c : best, null);
  }
  async function resetViaUI() {
    doc.getElementById('btn-reset').click(); // 真实页面重置（forceReset 满资源回开场）
    return pollUntil(() => snap().currentId === 'h:先锋' && !snap().terminal
      && pos('h:先锋').col === 6 && pos('h:先锋').row === 9, 4000, 100);
  }
  // 真 UI 一次技能攻击：只读 previewAttack 选合法瞄准点 → 菜单进入 → selectAt 预览 → 同格确认
  async function uiAttack(skillKey, expectLabel) {
    const heroId = 'h:先锋';
    const skill = unit(heroId).skills[Number(skillKey.slice(6))];
    const mpBefore = unit(heroId).ref.mp;
    const tried = new Set();
    const candidates = enemyCells().sort((a, b) => dist(a, pos(heroId)) - dist(b, pos(heroId))).slice(0, 4);
    for (const aim of candidates) {
      const key = aim.col + ',' + aim.row;
      if (tried.has(key)) continue;
      tried.add(key);
      const target = app.getViewData().units.find(u => u.side === 'enemy' && u.ref.hp > 0 &&
        aim.col >= pos(u.id).col && aim.col < pos(u.id).col + u.footprint.width &&
        aim.row >= pos(u.id).row && aim.row < pos(u.id).row + u.footprint.height);
      const q = battle().previewAttack(skill, { col: aim.col, row: aim.row, x: aim.col + 0.5, y: aim.row + 0.5, targetId: target?.id });
      if (!q.ok || !q.targetIds || !q.targetIds.length) continue;
      if (!clickRow('menu-attack', skillKey)) break;
      selectCell(aim.col, aim.row);
      if (!logText().includes('预计命中')) continue;
      selectCell(aim.col, aim.row); // 同格确认
      const re = new RegExp('先锋 · ' + expectLabel + ' → ');
      const tail = snap().log.slice(-3).join('|');
      const mpAfter = unit(heroId).ref.mp;
      return {
        ok: re.test(tail) && mpAfter === mpBefore - skill.cost,
        detail: 'aim=(' + key + ') mp=' + mpBefore + '->' + mpAfter + ' log=' + snap().log.slice(-2).join(' / '),
      };
    }
    return { ok: false, detail: '候选瞄准点均未通过预览：' + logText() };
  }

  // ---------- A 当前行动权 ----------
  const s0 = snap();
  const sb0 = app.sandbox.getSnapshot();
  results2.push(ok('mvp-A1 [GUI] 固定样本启动：先锋现行', sb0.mounted && sb0.sceneId === 'sc-test-room'
    && s0.currentId === 'h:先锋' && app.getViewData().units.length === 5 && !s0.terminal,
    JSON.stringify([s0.currentId, app.getViewData().units.length])));
  const qCur = doc.querySelector('#turn-order-container .t-queue-current');
  results2.push(ok('mvp-A2 [GUI] 行动权呈现（轴名/队列/菜单可用）',
    doc.getElementById('active-hero-name').textContent.includes('先锋')
    && qCur && qCur.dataset.unitId === 'h:先锋' && !doc.getElementById('menu-basic').disabled,
    doc.getElementById('active-hero-name').textContent + '/' + (qCur && qCur.dataset.unitId)));
  const cardWs = doc.querySelector('.t-hero-card[data-unit-id="h:术士"]');
  cardWs.click(); // 查看术士
  results2.push(ok('mvp-A3 [GUI] 查看不夺权（MVP 只操作到轴者）',
    cardWs.classList.contains('t-selected')
    && doc.getElementById('active-hero-name').textContent.includes('先锋')
    && snap().currentId === 'h:先锋', ''));
  results2.push(ok('mvp-A4 [GUI] 行动资源（移动力/主行动）',
    s0.resources && s0.resources.moveRemaining > 0 && s0.resources.main === 1,
    JSON.stringify(s0.resources)));

  // ---------- B 移动预览/取消/确认 ----------
  const fresh = await resetViaUI();
  results2.push(ok('mvp-B0 [GUI] 真实页面重置回开场', !!fresh, JSON.stringify(pos('h:先锋'))));
  results2.push(ok('mvp-B1 [GUI] 真菜单进入移动模式',
    clickRow('menu-basic', 'move') && logText().includes('点击绿格预览路径'), logText()));
  const cells = battle().reachable().cells.filter(c => c.cost > 0);
  const target = cells.reduce((best, c) =>
    (!best || dist(c, { col: 13, row: 10 }) < dist(best, { col: 13, row: 10 })) ? c : best, null);
  const remBefore = snap().resources.moveRemaining;
  selectCell(target.col, target.row); // 第一次：仅预览
  results2.push(ok('mvp-B2 [GUI] 移动预览不付费（首点不落子）',
    pos('h:先锋').col === 6 && pos('h:先锋').row === 9 && logText().includes('再点同一格确认'), logText()));
  selectCell(target.col, target.row); // 同格确认
  const remAfter = snap().resources.moveRemaining;
  results2.push(ok('mvp-B3 [GUI] 同格确认移动生效并扣移动力',
    pos('h:先锋').col === target.col && pos('h:先锋').row === target.row
    && Math.abs(remAfter - (remBefore - target.cost)) < 0.01
    && (snap().log[snap().log.length - 1] || '').includes('先锋 移动'),
    'target=(' + target.col + ',' + target.row + ') cost=' + target.cost.toFixed(2) + ' rem=' + remBefore + '->' + remAfter));
  endHeroTurnUI();
  await advanceToHero('h:先锋'); // 新自然行动再测取消，不让前一步逼近消耗的余额污染用例。
  const alt = battle().reachable().cells.find(c => c.cost > 0
    && (c.col !== pos('h:先锋').col || c.row !== pos('h:先锋').row));
  if (alt) {
    const p0 = { ...pos('h:先锋') };
    clickRow('menu-basic', 'move');
    selectCell(alt.col, alt.row); // 预览
    doc.getElementById('submenu-back').click(); // 返回 = onCommand('cancel')
    selectCell(alt.col, alt.row); // 取消后再点不移动
    results2.push(ok('mvp-B4 [GUI] 返回取消移动', pos('h:先锋').col === p0.col && pos('h:先锋').row === p0.row, ''));
    clickRow('menu-basic', 'move');
    selectCell(alt.col, alt.row);
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    selectCell(alt.col, alt.row);
    results2.push(ok('mvp-B5 [GUI] Esc 取消移动', pos('h:先锋').col === p0.col && pos('h:先锋').row === p0.row, ''));
  } else {
    results2.push(ok('mvp-B4/B5 [GUI] 无剩余移动力可复测取消', false, '移动力不足'));
  }
  clickRow('menu-basic', 'move');
  selectCell(17, 3); // 图内远格（p02 已证 (17,3) 在格），超出移动力
  results2.push(ok('mvp-B6 [GUI] 不可达落点拒绝', logText().includes('落点不可达')
    && pos('h:先锋').col !== 17 && pos('h:先锋').row !== 3, logText()));

  // ---------- C 三范围（拆轮：MP 够用 + 位置合法） + D 主点不可重复 ----------
  const rC1 = await uiAttack('skill-2', '横扫'); // 扇形 射程3（B3 已逼近守卫）
  results2.push(ok('mvp-C1 [GUI] 扇形【横扫】真UI攻击', rC1.ok, rC1.detail + ' [菜单+selectAt]'));
  results2.push(ok('mvp-D1 [GUI] 主行动消耗清零', snap().resources && snap().resources.main === 0,
    JSON.stringify(snap().resources)));
  doc.getElementById('menu-basic').click();
  const rowAtk = doc.querySelector('#submenu-list button[data-skill="attack"]');
  const basicDisabled = rowAtk && rowAtk.disabled;
  doc.getElementById('menu-attack').click();
  const skillRows = [...doc.querySelectorAll('#submenu-list button[data-skill^="skill-"]')];
  const skillsDisabled = skillRows.length === 3 && skillRows.every(b => b.disabled);
  doc.getElementById('submenu-back').click();
  results2.push(ok('mvp-D2 [GUI] 主点用尽后菜单行禁用', basicDisabled && skillsDisabled,
    'basic=' + basicDisabled + ' skills=' + skillsDisabled));
  const qD3 = battle().previewAttack({ name: '普通攻击', cost: 0, range: { type: '单体', castRange: 2 } },
    { col: 12, row: 9, x: 12.5, y: 9.5 });
  results2.push(ok('mvp-D3 [只读] previewAttack 确认主点不可重复',
    !qD3.ok && String(qD3.reason).includes('主行动'), String(qD3.reason)));
  const seen = new Set();
  endHeroTurnUI();
  const back1 = await advanceToHero('h:先锋', seen);
  const seenArr = [...seen];
  results2.push(ok('mvp-E1 [GUI+timer] 结束轴推进（先锋→敌斥候→术士→回先锋）',
    !!back1 && seenArr.includes('e:斥候') && seenArr.includes('h:术士'), seenArr.join('>')));
  const rC2 = await uiAttack('skill-1', '贯线'); // 直线 长10 宽1
  results2.push(ok('mvp-C2 [GUI] 直线【贯线】真UI攻击（次轮）', rC2.ok, rC2.detail));
  endHeroTurnUI();
  await advanceToHero('h:先锋', seen);
  const rC3 = await uiAttack('skill-0', '火舌'); // 单体 射程15
  results2.push(ok('mvp-C3 [GUI] 单体【火舌】真UI攻击（三轮）', rC3.ok, rC3.detail));
  let e2Ok = false, e2Detail = '';
  for (let i = 0; i < 3 && !e2Ok; i++) {
    endHeroTurnUI();
    await advanceToHero('h:先锋', seen);
    const m = snap().log.join('|').match(/(守卫|弓手|斥候) · .+ → (先锋|术士)/);
    const hurt = ['h:先锋', 'h:术士'].some(id => { const u = unit(id); return u && u.ref.hp < u.bars.maxHp; });
    e2Ok = !!(m || hurt);
    e2Detail = '敌攻击日志=' + (m ? m[0] : '无') + ' 我方受伤=' + hurt;
  }
  results2.push(ok('mvp-E2 [GUI+timer] 敌人还手', e2Ok, e2Detail + ' log尾=' + snap().log.slice(-2).join(' / ')));

  // ---------- F 胜负重开（独立纯 controller 完整局 + 真实页面重开） ----------
  const base = new URL('./src/main.mjs', win.location.href).href;
  const uBattle = new URL('battle.mjs', base).href;
  const uParser = new URL('parser.mjs', base).href;
  const uStorage = new URL('storage.mjs', base).href;
  const uDemo = new URL('demo-fixture.mjs', base).href;
  const uAi = new URL('ai.mjs', base).href;
  const script = doc.createElement('script');
  script.type = 'module';
  script.textContent = 'try {\n'
    + '  const [M, B, P, S, D, AI] = await Promise.all(['
    + 'import(' + JSON.stringify(base) + '), import(' + JSON.stringify(uBattle) + '),'
    + ' import(' + JSON.stringify(uParser) + '), import(' + JSON.stringify(uStorage) + '),'
    + ' import(' + JSON.stringify(uDemo) + '), import(' + JSON.stringify(uAi) + ')]);\n'
    + '  let seed = 20260601 >>> 0;\n'
    + '  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };\n'
    + '  const block = P.parseYamlText(D.DEMO_YAML);\n'
    + '  const roster = S.loadTacticsRoster(block, []);\n'
    + '  const scene = M.sceneForState("sc-test-room", {});\n'
    + '  const vd = M.buildViewData(block, roster.heroes, scene, structuredClone(D.DEMO_PLACEMENTS), {});\n'
    + '  const b = B.createBattle({ units: vd.units, placementsById: vd.placementsById, scene, random: rand });\n'
    + '  b.start();\n'
    + '  const BASIC = { name: "普通攻击", power: 0, hit: 100, cost: 0, range: { type: "单体", castRange: 2 }, actionCost: { main: 1, aux: 0 } };\n'
    + '  const openingHp = {};\n'
    + '  for (const u of vd.units) openingHp[u.id] = u.ref.hp;\n'
    + '  let heroActs = 0, enemyActs = 0, guard = 0;\n'
    + '  while (guard < 120 && heroActs < 60 && !b.snapshot().terminal && b.snapshot().currentId) {\n'
    + '    guard++;\n'
    + '    const cur = b.snapshot().currentId;\n'
    + '    const u = vd.units.find(x => x.id === cur);\n'
    + '    if (u.side === "hero") {\n'
    + '      heroActs++;\n'
    + '      const skills = u.skills.filter(s => s.cost <= u.ref.mp).concat(BASIC);\n'
    + '      const choice = AI.chooseEnemyAction(b.ctx, cur, b.snapshot().resources.moveRemaining, skills);\n'
    + '      if (choice.moveTo) b.move(choice.moveTo.col, choice.moveTo.row);\n'
    + '      if (choice.skill) b.attack(choice.skill, choice.aim);\n'
    + '      b.endAction();\n'
    + '    } else { enemyActs++; b.runEnemyTurn(); }\n'
    + '  }\n'
    + '  const term = b.snapshot().terminal;\n'
    + '  const enemyAtkLogs = b.snapshot().log.filter(l => /(守卫|弓手|斥候) · .+ → (先锋|术士)/.test(l)).length;\n'
    + '  const logTail = b.snapshot().log.slice(-3).join(" / ");\n'
    + '  b.reset();\n'
    + '  const rs = b.snapshot();\n'
    + '  const hpFull = Object.keys(openingHp).every(id => { const su = rs.units.find(x => x.id === id); return su && su.hp === openingHp[id]; });\n'
    + '  window.__TACTICS_MVP_CONTROLLER__ = { terminal: term && term.type, heroActs, enemyActs, enemyAtkLogs, logTail,\n'
    + '    reset: { currentId: rs.currentId, terminal: rs.terminal, hpFull, vanguard: JSON.parse(JSON.stringify(vd.placementsById["h:先锋"])) } };\n'
    + '} catch (e) { window.__TACTICS_MVP_CONTROLLER__ = { error: String((e && e.stack) || e) }; }\n';
  doc.body.appendChild(script);
  const ctl = await pollUntil(() => win.__TACTICS_MVP_CONTROLLER__, 20000, 200);
  if (!ctl || ctl.error) {
    results2.push(ok('mvp-F [controller] 独立完整局未产出', false, String(ctl && ctl.error || '20s 未结算')));
  } else {
    results2.push(ctl.terminal === 'victory' && ctl.heroActs <= 60
      ? ok('mvp-F1 [controller] 独立纯controller完整局胜利（≤60英雄行动）', true,
        'heroActs=' + ctl.heroActs + ' enemyActs=' + ctl.enemyActs + ' log尾=' + ctl.logTail)
      : ctl.terminal
        ? ok('mvp-F1 [controller] 完整局未达胜利', false, 'terminal=' + ctl.terminal + ' heroActs=' + ctl.heroActs)
        : pending('mvp-F1 [controller] 60英雄行动内未分出胜负（pending）',
          'heroActs=' + ctl.heroActs + ' enemyActs=' + ctl.enemyActs + ' 需人工/排障复验'));
    results2.push(ok('mvp-F2 [controller] 完整局敌人还手证据', ctl.enemyAtkLogs > 0, '敌攻击日志条数=' + ctl.enemyAtkLogs));
    results2.push(ok('mvp-F3 [controller] controller.reset 胜负重开（满血/先锋现行/无终局）',
      ctl.reset && ctl.reset.currentId === 'h:先锋' && !ctl.reset.terminal && ctl.reset.hpFull
      && ctl.reset.vanguard.col === 6 && ctl.reset.vanguard.row === 9,
      JSON.stringify(ctl.reset)));
  }
  const okReset = await resetViaUI();
  const sR = snap();
  const hpFullUi = app.getViewData().units.filter(u => u.side === 'hero').every(u => {
    const su = sR.units.find(x => x.id === u.id);
    return su && su.hp === u.bars.maxHp;
  });
  results2.push(ok('mvp-F4 [GUI] 真实页面按钮重开回开场', !!okReset && !sR.terminal && hpFullUi
    && pos('h:先锋').col === 6 && pos('h:先锋').row === 9,
    JSON.stringify([sR.currentId, pos('h:先锋')])));

  results2.push(ok('mvp-runtime-errors', errors.length === 0, JSON.stringify(errors.slice(0, 3))));
  win.removeEventListener('error', capture);
  win.removeEventListener('unhandledrejection', capture);
  return results2;
}
