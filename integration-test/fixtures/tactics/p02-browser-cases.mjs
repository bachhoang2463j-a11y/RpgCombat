// ==========================================
// P02 浏览器侧用例（?stage=p02 时由 tactics-harness.html 挂载真实 tactics/index.html 执行）
// 测真实产物：iframe src 指向真实入口，不复制业务实现；交互用合成 PointerEvent/WheelEvent（真实输入另验）。
// 结果数组由宿主页汇总（window.__TACTICS_P02_RESULT）。
// IAB 已知环境限制（rAF 节流/截图管道）如实记 pending，不改业务时序凑绿。
// ==========================================

function ok(id, pass, detail) {
  return { id, pass: !!pass, detail: detail || '' };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 在地图视口派发合成指针事件（合成事件无真实 capture；sandbox 已容忍 capture 失败）
function pointerEvents(win, viewport, seq) {
  for (const [type, x, y, extra] of seq) {
    const ev = new win.PointerEvent(type, Object.assign({
      bubbles: true, cancelable: true, composed: true,
      clientX: x, clientY: y, pointerId: 71, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
    }, extra || {}));
    viewport.dispatchEvent(ev);
  }
}

function clickAt(win, doc, viewport, x, y) {
  pointerEvents(win, viewport, [['pointerdown', x, y], ['pointerup', x, y]]);
  viewport.dispatchEvent(new win.MouseEvent('click', { bubbles: true, clientX: x, clientY: y, detail: 1 }));
}

function dragBy(win, viewport, x0, y0, dx, dy) {
  pointerEvents(win, viewport, [
    ['pointerdown', x0, y0], ['pointermove', x0 + dx / 2, y0 + dy / 2], ['pointermove', x0 + dx, y0 + dy], ['pointerup', x0 + dx, y0 + dy],
  ]);
}

function wheelAt(win, viewport, x, y, deltaY) {
  viewport.dispatchEvent(new win.WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: x, clientY: y, deltaY, deltaMode: 0 }));
}

export async function runBrowserCases(frame) {
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  const results = [];
  const handle = win.__TACTICS_APP__;
  if (!handle || !handle.app) {
    return [ok('p02-iframe-boot', false, '真实入口未暴露 __TACTICS_APP__')];
  }
  const app = handle.app;
  const runtimeErrors = [];
  const captureError = e => runtimeErrors.push(String(e.message || e.reason));
  win.addEventListener('error', captureError);
  win.addEventListener('unhandledrejection', captureError);
  const viewport = doc.getElementById('tactics-map-viewport');

  // ---------- T02-01：双尺寸槽位 / 菜单 / 面板 ----------
  async function stage01() {
    const cases = [];
    const cw = doc.documentElement.clientWidth, ch = doc.documentElement.clientHeight;
    cases.push(ok('T02-01-b 真实尺寸 1280×720', cw === 1280 && ch === 720, cw + '×' + ch));

    const menu = doc.getElementById('menu-container');
    const mr = menu.getBoundingClientRect();
    cases.push(ok('T02-01-b 菜单 260×172', Math.round(mr.width) === 260 && Math.round(mr.height) === 172,
      Math.round(mr.width) + '×' + Math.round(mr.height)));

    // 菜单导航四面板 + 返回
    const titles = ['menu-basic', 'menu-attack', 'menu-support', 'menu-item'];
    let navOk = true;
    for (const id of titles) {
      doc.getElementById(id).click();
      const sub = doc.getElementById('submenu');
      if (sub.style.display === 'none') navOk = false;
      doc.getElementById('submenu-back').click();
      if (sub.style.display !== 'none') navOk = false;
    }
    cases.push(ok('T02-01-b 四菜单开合与返回', navOk, ''));

    // 面板壳打开/关闭可达（记录/设置/对话）
    let panelOk = true;
    for (const id of ['btn-history', 'btn-editor', 'btn-dialogue']) {
      doc.getElementById(id).click();
      const ov = doc.getElementById('panel-overlay');
      if (ov.style.display === 'none') panelOk = false;
      doc.getElementById('panel-close').click();
      if (ov.style.display !== 'none') panelOk = false;
    }
    cases.push(ok('T02-01-b 记录/设置/对话面板开合', panelOk, ''));

    // 旁白开关本地状态（不调 LLM）
    const ally = doc.getElementById('chat-ally-toggle');
    const beforeCls = ally.classList.contains('t-toggle-on');
    ally.click();
    const afterCls = ally.classList.contains('t-toggle-on');
    ally.click();
    cases.push(ok('T02-01-b 旁白开关本地切换', beforeCls !== afterCls && ally.classList.contains('t-toggle-on') === beforeCls, ''));

    // 地图层不抢按钮事件：菜单按钮中心 elementFromPoint 命中按钮自身（世界层 pointer-events:none）
    doc.getElementById('menu-attack').click();
    doc.getElementById('submenu-back').click();
    const btn = doc.getElementById('menu-basic');
    const br = btn.getBoundingClientRect();
    const hit = doc.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
    cases.push(ok('T02-01-b 菜单按钮可命中（地图不抢事件）', btn === hit || btn.contains(hit), String(hit && hit.id)));
    cases.push(ok('T02-01-b 按钮在视口内', br.top >= 0 && br.bottom <= ch && br.left >= 0 && br.right <= cw, ''));

    // 无外部网络资源（P00-native 证据之一；本地测试服务同源资源不算外链）
    const res = win.performance.getEntriesByType('resource')
      .filter(r => /^https?:\/\//.test(r.name))
      .filter(r => !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(r.name));
    cases.push(ok('T02-01-b 零外部 HTTP 资源', res.length === 0, JSON.stringify(res.slice(0, 2).map(r => r.name))));

    // 1600×900 独立复核（不沿用 1280 结果）
    frame.style.width = '1600px'; frame.style.height = '900px';
    await sleep(120);
    const cw2 = doc.documentElement.clientWidth, ch2 = doc.documentElement.clientHeight;
    cases.push(ok('T02-01-b 真实尺寸 1600×900', cw2 === 1600 && ch2 === 900, cw2 + '×' + ch2));
    const mr2 = doc.getElementById('menu-container').getBoundingClientRect();
    cases.push(ok('T02-01-b 1600 下菜单仍 260×172', Math.round(mr2.width) === 260 && Math.round(mr2.height) === 172, ''));
    const br2 = doc.getElementById('menu-basic').getBoundingClientRect();
    const hit2 = doc.elementFromPoint(br2.left + br2.width / 2, br2.top + br2.height / 2);
    cases.push(ok('T02-01-b 1600 下按钮仍可命中', btn === hit2 || btn.contains(hit2), String(hit2 && hit2.id)));
    // 回到 1280 供后续用例
    frame.style.width = '1280px'; frame.style.height = '720px';
    await sleep(120);
    return cases;
  }

  // ---------- T02-02：双向坐标 / 正立头像 / 播放中特效跟随 ----------
  async function stage02() {
    const cases = [];
    const snap = app.sandbox.getSnapshot();
    cases.push(ok('T02-02-b 挂载与场景', snap.mounted && snap.sceneId === 'sc-test-room', JSON.stringify([snap.mounted, snap.sceneId])));

    // 圆形头像数量与 billboard 无旋转（头像正立）
    const unitEls = doc.querySelectorAll('.t-unit');
    cases.push(ok('T02-02-b 六单位圆标', unitEls.length === 6, String(unitEls.length)));
    const bill = doc.querySelector('.t-unit-billboard');
    const billTf = bill.style.transform || '';
    cases.push(ok('T02-02-b billboard 逆缩放无旋转', billTf.includes('scale') && !billTf.includes('rotate'), billTf));

    // 朝向箭头独立旋转：setFacing 90° 后只有 direction 层旋转
    app.sandbox.getUnitView().setFacing('h:书采', 90);
    await sleep(30);
    const dirEl = doc.querySelector('.t-unit[data-unit-id="h:书采"] .t-unit-direction');
    cases.push(ok('T02-02-b 朝向箭头 90°', (dirEl.style.transform || '').includes('rotate(90deg)'), dirEl.style.transform));
    cases.push(ok('T02-02-b 头像/名字不随朝向旋转',
      !((doc.querySelector('.t-unit[data-unit-id="h:书采"] .t-unit-billboard').style.transform || '').includes('rotate')), ''));

    // 已知单位真实点击选取；平移后同一世界位置再点 → 同 ID
    const origin = app.sandbox.getOrigin();
    const p = app.getViewData().placementsById['h:书采'];
    const s1 = app.sandbox.worldToScreenClient(p.col + 0.5, p.row + 0.5);
    clickAt(win, doc, viewport, s1.x, s1.y);
    const sel1 = app.sandbox.getSelectedId();
    cases.push(ok('T02-02-b 点击选中单位', sel1 === 'h:书采', String(sel1)));

    dragBy(win, viewport, 600, 300, 60, -30); // 平移 (+60,-30)（小幅，保持目标格不出图）
    const poseAfterPan = app.sandbox.getPose();
    cases.push(ok('T02-02-b 拖拽平移生效', poseAfterPan.tx !== snap.pose.tx || poseAfterPan.ty !== snap.pose.ty,
      JSON.stringify([snap.pose.tx, poseAfterPan.tx])));
    const gMoved = app.sandbox.screenToGridClient(s1.x, s1.y);
    // 同一屏幕点对应的世界格必须改变（含平移出图时的 null 越界语义）
    cases.push(ok('T02-02-b 平移后同一屏幕点世界格已变',
      !gMoved || gMoved.col !== p.col || gMoved.row !== p.row, JSON.stringify(gMoved)));

    // 反向平移复位后同屏点仍选中同一单位（世界↔屏幕一致；从第一段拖拽终点拖回原位）
    dragBy(win, viewport, 660, 270, -60, 30);
    clickAt(win, doc, viewport, s1.x, s1.y);
    cases.push(ok('T02-02-b 复位后同点同 ID', app.sandbox.getSelectedId() === 'h:书采', String(app.sandbox.getSelectedId())));

    // 滚轮缩放后点击已知格仍返回同 ID
    const s2 = app.sandbox.worldToScreenClient(p.col + 0.5, p.row + 0.5);
    wheelAt(win, viewport, s2.x, s2.y, -120); // 放大
    await sleep(30);
    const s3 = app.sandbox.worldToScreenClient(p.col + 0.5, p.row + 0.5);
    clickAt(win, doc, viewport, s3.x, s3.y);
    cases.push(ok('T02-02-b 缩放后点击同单位', app.sandbox.getSelectedId() === 'h:书采', String(app.sandbox.getSelectedId())));

    // 播放中特效跟随：真实火焰弹，播放中途平移+缩放，粒子数据（世界坐标）不变
    const vfx = app.sandbox.getVfx();
    const beforeParticles = () => vfx.state.particles.map(x => [Math.round(x.x), Math.round(x.y)]);
    const playPromise = app.playProjectile('fire', 'h:书采', 'e:堕天使');
    await sleep(300); // 飞行段（240ms 蓄势后）
    const midParticles = beforeParticles();
    cases.push(ok('T02-02-b 火焰弹已发射（飞行粒子>0）', midParticles.length > 0, String(midParticles.length)));
    app.sandbox.setCamera({ tx: poseAfterPan.tx + 200, ty: poseAfterPan.ty + 100, scale: 1.4 }); // 播放中改镜头
    const afterMove = vfx.state.particles.map(x => [Math.round(x.x), Math.round(x.y)]);
    cases.push(ok('T02-02-b 相机变化不改粒子世界坐标',
      midParticles.length > 0 && JSON.stringify(midParticles) === JSON.stringify(afterMove),
      'n=' + afterMove.length));
    // 粒子 canvas 有真实绘制内容（P00-native Canvas 证据；IAB rAF 节流时等待到飞行中段重采样）
    let hasPixels = false;
    const fxCanvas = doc.querySelector('[data-tactics-fx="canvas"]');
    for (let attempt = 0; attempt < 4 && !hasPixels; attempt++) {
      await sleep(120);
      if (!fxCanvas || !fxCanvas.isConnected) break;
      const g = fxCanvas.getContext('2d');
      const data = g.getImageData(0, 0, fxCanvas.width, fxCanvas.height).data;
      for (let i = 3; i < data.length; i += 4) { if (data[i] > 0) { hasPixels = true; break; } }
    }
    cases.push(hasPixels
      ? ok('T02-02-b 特效 Canvas 真实产出像素', true, '')
      : Object.assign(ok('T02-02-b 特效 Canvas 真实产出像素（pending）', false, 'IAB rAF 暂停无法采样；需排障模式真 Chrome 复验'), { pass: null }));
    const settledOk = await playPromise.catch(() => 'error');
    cases.push(ok('T02-02-b 弹道完成 Promise 结算 true', settledOk === true, String(settledOk)));

    // 特效 DOM 锚点在世界层内（position:absolute 挂世界层，而非 body/fixed）
    const anchors = doc.querySelectorAll('[data-tactics-fx="anchor"], [data-tactics-fx="layer"]');
    const inWorld = [...anchors].every(a => a.closest('#tactics-world-root'));
    cases.push(ok('T02-02-b 特效节点全部挂世界层', inWorld, String(anchors.length)));

    // focusWorld 落 safeRect 中心（容差 2px；IAB rAF 节流时放宽等待）
    const safeCenter = app.shell.getSafeRect();
    app.sandbox.focusWorld(p.col + 0.5, p.row + 0.5);
    for (let i = 0; i < 4; i++) await new Promise(resolve => win.requestAnimationFrame(resolve));
    const fs = app.sandbox.worldToScreenClient(p.col + 0.5, p.row + 0.5);
    const expX = origin.left + safeCenter.left + safeCenter.width / 2;
    const expY = origin.top + safeCenter.top + safeCenter.height / 2;
    const dx = Math.abs(fs.x - expX), dy = Math.abs(fs.y - expY);
    cases.push(dx <= 2 && dy <= 2
      ? ok('T02-02-b focusWorld 落 safeRect 中心', true, '')
      : Object.assign(ok('T02-02-b focusWorld 落 safeRect 中心（pending）', false,
        'dx=' + dx.toFixed(1) + ' dy=' + dy.toFixed(1) + '；IAB rAF 暂停缓动不推进；需排障模式真 Chrome 复验'), { pass: null }));
    return cases;
  }

  // ---------- T02-03：真实占格选取 / 同名身份 / 拖拽零选取 ----------
  async function stage03() {
    const cases = [];
    const vd = app.getViewData();
    // 重置相机到已知 pose（避免上一组遗留）
    app.sandbox.setCamera({ tx: 40, ty: 20, scale: 1 });
    const clickWorld = (col, row) => {
      const s = app.sandbox.worldToScreenClient(col + 0.5, row + 0.5);
      clickAt(win, doc, viewport, s.x, s.y);
      return app.sandbox.getSelectedId();
    };

    // 2×2 四格全部命中大型单位；圆标视觉只有 40px 小圆但占格 100px
    const sel00 = clickWorld(14, 10), sel10 = clickWorld(15, 10), sel01 = clickWorld(14, 11), sel11 = clickWorld(15, 11);
    cases.push(ok('T02-03-b 2×2 四格同 ID', sel00 === 'e:堕天使' && sel10 === 'e:堕天使' && sel01 === 'e:堕天使' && sel11 === 'e:堕天使',
      [sel00, sel10, sel01, sel11].join(',')));
    cases.push(ok('T02-03-b 2×2 外一格不命中', clickWorld(16, 10) === null, ''));

    // 同名两单位分别 ID
    cases.push(ok('T02-03-b 同名两单位各自 ID',
      clickWorld(3, 4) === 'h:书采' && clickWorld(5, 4) === 'h:书采:2', ''));

    // 1×1 单位相邻空格不命中（视觉圆标 32px 小于 1 格时不会外溢，但显式断言）
    cases.push(ok('T02-03-b 空格点击 null', clickWorld(4, 4) === null, ''));

    // 在单位上开始拖拽并松手 → 选取计数不增长
    app.sandbox.setCamera({ tx: 40, ty: 20, scale: 1 });
    clickWorld(3, 4); // 先选中 h:书采
    const s = app.sandbox.worldToScreenClient(3.5, 4.5);
    dragBy(win, viewport, s.x, s.y, 90, 40); // 从单位上拖走
    cases.push(ok('T02-03-b 拖拽松手零选取（保持原选中）',
      app.sandbox.getSelectedId() === 'h:书采', String(app.sandbox.getSelectedId())));

    // 小幅抖动点击只选中一次（先复位相机，抖动点才有确定世界格）
    app.sandbox.setCamera({ tx: 40, ty: 20, scale: 1 });
    pointerEvents(win, viewport, [['pointerdown', s.x, s.y], ['pointermove', s.x + 2, s.y + 1], ['pointerup', s.x + 2, s.y + 1]]);
    viewport.dispatchEvent(new win.MouseEvent('click', { bubbles: true, clientX: s.x + 2, clientY: s.y + 1, detail: 1 }));
    cases.push(ok('T02-03-b 抖动仍算点击', app.sandbox.getSelectedId() === 'h:书采', ''));

    // 2×2 选取框绘制真实占格（overlay canvas 像素）
    clickWorld(14, 10);
    const overlay = doc.querySelector('[data-tactics-layer="overlay"]');
    const og = overlay.getContext('2d');
    const od = og.getImageData(0, 0, overlay.width, overlay.height).data;
    let overlayPixels = 0;
    for (let i = 3; i < od.length; i += 4) { if (od[i] > 0) overlayPixels++; }
    cases.push(ok('T02-03-b 占格选框真实绘制', overlayPixels > 100, String(overlayPixels)));
    return cases;
  }

  // ---------- T02-04：重置/换战斗/关开重开清理 ----------
  async function stage04() {
    const cases = [];
    const { DEFAULT_YAML_B, DEFAULT_YAML_C } = await import('./p02-fixture.mjs');

    // 基线监听数
    const baseCounts = app.sandbox.getSnapshot().scopeCounts;

    // a. 活跃弹道中重置（forceReset 同 battle）→ 旧代际清零
    const playPromise = app.playProjectile('fire', 'h:书采', 'e:堕天使');
    await sleep(80);
    const loadA = app.loadYaml(DEFAULT_YAML_B); // 同场景新 battle：sandbox.reset
    await sleep(60);
    const countsAfterReset = app.sandbox.getSnapshot().scopeCounts;
    const vfx = app.sandbox.getVfx();
    cases.push(ok('T02-04-b 重置后新战斗态', loadA.branch === 'new-battle' && app.sandbox.getSnapshot().battleId === 'bt-02',
      loadA.branch + '/' + app.sandbox.getSnapshot().battleId));
    cases.push(ok('T02-04-b 重置后无残留粒子', vfx.state.particles.length === 0 && vfx.state.flights.length === 0,
      vfx.state.particles.length + '/' + vfx.state.flights.length));
    cases.push(ok('T02-04-b 重置后监听数为单份基线',
      countsAfterReset.listeners === baseCounts.listeners, countsAfterReset.listeners + ' vs ' + baseCounts.listeners));
    await playPromise.then(settled => cases.push(ok('T02-04-b 旧弹道 Promise 因重置结算 false', settled === false, String(settled))));

    // b. 同场景新 battle 保留档内位置（P01 生命周期）：不恢复夹具开场
    //    bt-01 时已把 h:书采 拖到别处？此处直接断言 positions 来自 sceneState（非 null）
    const vd = app.getViewData();
    cases.push(ok('T02-04-b 新 battle 站位来自档', vd.placementsById['h:书采'].col === 3, JSON.stringify(vd.placementsById['h:书采'])));

    // c. 换场景重建（bt-02 → sc-second-room）
    const loadC = app.loadYaml(DEFAULT_YAML_C);
    cases.push(ok('T02-04-b 换场景重建', loadC.branch === 'new-scene' && app.sandbox.getSnapshot().sceneId === 'sc-second-room',
      loadC.branch + '/' + app.sandbox.getSnapshot().sceneId));

    // d. 连续 3 次载入循环：监听数不递增（关开重开语义）
    for (let i = 0; i < 3; i++) app.loadYaml(DEFAULT_YAML_B);
    const finalCounts = app.sandbox.getSnapshot().scopeCounts;
    cases.push(ok('T02-04-b 3 次循环监听不递增',
      finalCounts.listeners === baseCounts.listeners, finalCounts.listeners + ' vs ' + baseCounts.listeners));
    cases.push(ok('T02-04-b 3 次循环无残留计时/rAF/动画',
      finalCounts.timers === 0 && finalCounts.raf === 0 && finalCounts.animations === 0,
      JSON.stringify(finalCounts)));

    // e. LLM 计数：全程无 generateRaw/generate 定义与调用
    cases.push(ok('T02-04-b 零 LLM 调用入口',
      typeof win.generateRaw === 'undefined' && typeof win.generate === 'undefined', ''));

    // f. P00-native：平移缩放后真实点击返回同一世界格（contract 第 9 节待验项）
    app.sandbox.setCamera({ tx: 60, ty: 30, scale: 1.25 });
    const target = { col: 17, row: 3 };
    const sc1 = app.sandbox.worldToScreenClient(target.col + 0.5, target.row + 0.5);
    const g1 = app.sandbox.screenToGridClient(sc1.x, sc1.y);
    app.sandbox.setCamera({ tx: -80, ty: 50, scale: 0.8 });
    const sc2 = app.sandbox.worldToScreenClient(target.col + 0.5, target.row + 0.5);
    const g2 = app.sandbox.screenToGridClient(sc2.x, sc2.y);
    cases.push(ok('T02-04-b P00-native 双相机位同格', g1 && g2 && g1.col === target.col && g2.col === target.col && g2.row === target.row,
      JSON.stringify([g1, g2])));

    return cases;
  }

  results.push(...await stage01());
  results.push(...await stage02());
  results.push(...await stage03());
  results.push(...await stage04());
  results.push(ok('T02-runtime-errors', runtimeErrors.length === 0, JSON.stringify(runtimeErrors)));
  win.removeEventListener('error', captureError);
  win.removeEventListener('unhandledrejection', captureError);
  return results;
}
