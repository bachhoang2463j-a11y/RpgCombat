// ==========================================
// P02 Node 侧用例（T02-01～T02-04）
// 全部测试真实业务模块（tactics/src/*.mjs），不复制实现。
// 每组 run(deps) → { cases: [{id, pass, detail}] }；run-tests.cjs 门禁强制 passed>0。
// 浏览器侧（tactics-harness.html ?stage=p02）另测真实 iframe 挂载 / 手势 / 特效跟随 / 生命周期。
// ==========================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

function ok(id, pass, detail) {
  return { id, pass: !!pass, detail: detail || '' };
}

// ---------- T02-01 原槽位结构 + 双尺寸 safeRect ----------

async function t0201(deps) {
  const { scene, mapArt, camera } = deps.modules;
  const cases = [];

  // 1. 原槽位结构（槽位 DOM 由 ui-shell.buildShell 生成；真实 DOM 唯一性由浏览器组验证）
  const html = readFileSync(join(ROOT, 'tactics', 'index.html'), 'utf8');
  const css = readFileSync(join(ROOT, 'tactics', 'tactics.css'), 'utf8');
  // 行动条/技能栏槽位由原版界面生成文件提供（vendor/rpg-ui，HTML 以 JSON 字符串内嵌）
  const vendorUi = readFileSync(join(ROOT, 'tactics', 'src', 'vendor', 'rpg-ui', 'rpg-ui.mjs'), 'utf8').replace(/\\"/g, '"');
  const vendorCss = readFileSync(join(ROOT, 'tactics', 'src', 'vendor', 'rpg-ui', 'rpg-ui.css'), 'utf8');
  const shell = readFileSync(join(ROOT, 'tactics', 'src', 'ui-shell.mjs'), 'utf8') + '\n' + vendorUi;
  const slots = ['battle-scene', 'tactics-map-slot', 'turn-order-container', 'heroes-container',
    'menu-container', 'chat-input-area', 'chat-input-bar', 'tactics-topbar'];
  for (const id of slots) {
    const n = shell.split('id="' + id + '"').length - 1;
    cases.push(ok('T02-01 槽位唯一 ' + id, n === 1, '出现 ' + n + ' 次'));
  }
  cases.push(ok('T02-01 enemies-container 已替换为地图槽',
    !shell.includes('id="enemies-container"') && shell.includes('id="tactics-map-slot"'), ''));
  cases.push(ok('T02-01 入口真实挂载 main.mjs', html.includes('./src/main.mjs') && html.includes('app.boot()'), ''));

  // 2. 无外链（Tailwind CDN / Google Fonts 禁止；计划 2.3——检查实际引用标签，不含注释文案）
  const externalLinks = [...(html + css).matchAll(/(?:src|href)\s*=\s*["'](?:https?:)?\/\/[^"']+["']/g)].map(m => m[0]);
  const cdnRefs = [...(html + css).matchAll(/(?:src|href)\s*=\s*["'][^"']*(?:tailwindcss|fonts\.googleapis|cdn\.)[^"']*["']/gi)].map(m => m[0]);
  cases.push(ok('T02-01 无 CDN/字体外链', externalLinks.length === 0 && cdnRefs.length === 0,
    JSON.stringify(externalLinks.concat(cdnRefs).slice(0, 3))));

  // 3. 原版技能栏 260×172（Tailwind 任意值类随生成 CSS）与四列我方区
  cases.push(ok('T02-01 菜单 260×172', vendorUi.includes('w-[260px] h-[172px]') && vendorCss.includes('{width:260px}') && vendorCss.includes('{height:172px}'), ''));
  cases.push(ok('T02-01 我方四列 grid', css.includes('grid-template-columns: repeat(4,'), ''));
  cases.push(ok('T02-01 顶栏入口顺序（世界书/记录/全屏/对话/设置/重置）',
    shell.indexOf('btn-worldbook') < shell.indexOf('btn-history') &&
    shell.indexOf('btn-history') < shell.indexOf('btn-fullscreen') &&
    shell.indexOf('btn-fullscreen') < shell.indexOf('btn-dialogue') &&
    shell.indexOf('btn-dialogue') < shell.indexOf('btn-editor') &&
    shell.indexOf('btn-editor') < shell.indexOf('btn-reset'), ''));

  // 4. 双输出冒烟：同一权威场景 → 格表 + R13 SVG
  const compiled = scene.compileScene(scene.TEST_ROOM);
  cases.push(ok('T02-01 格表 400 格', compiled.cells.length === 400, String(compiled.cells.length)));
  cases.push(ok('T02-01 物件索引 13 件', compiled.objectsIndex.size === 13, String(compiled.objectsIndex.size)));
  const svg = mapArt.renderSceneArt(compiled.artJson);
  cases.push(ok('T02-01 底图 SVG 含石砖与红毯 pattern',
    svg.includes('url(#mms-mini-brick)') && svg.includes('url(#mms-mini-carpet)'), 'len=' + svg.length));
  cases.push(ok('T02-01 viewBox 1000 正方形（消除 slice/百分比错位）',
    svg.includes('viewBox="0 0 1000 1000"'), ''));

  // 5. 双尺寸 fitPose 分别计算（不沿用另一尺寸）
  const grid = { columns: 20, rows: 20 };
  const origin = { left: 0, top: 0 };
  const fitA = camera.fitPose(grid, 50, origin, { left: 56, top: 64, width: 1000, height: 440 });
  const fitB = camera.fitPose(grid, 50, origin, { left: 56, top: 64, width: 1320, height: 620 });
  cases.push(ok('T02-01 双尺寸 fit 结果不同', JSON.stringify(fitA) !== JSON.stringify(fitB),
    'A=' + JSON.stringify(fitA) + ' B=' + JSON.stringify(fitB)));
  cases.push(ok('T02-01 fitA 整图适配可用高', fitA.scale * 1000 <= 440, 'scale=' + fitA.scale));
  cases.push(ok('T02-01 fitB 整图适配可用高', fitB.scale * 1000 <= 620, 'scale=' + fitB.scale));

  return { cases };
}

// ---------- T02-02 双向坐标 / 朝向 / 聚焦 / 弹道公式 ----------

async function t0202(deps) {
  const { camera, arcaneVfx, geometry, scene } = deps.modules;
  const cases = [];
  const origin = { left: 100, top: 60 };
  const q = 50;

  // 1. 双向投影往返（非零 L/T、负平移、缩放）误差 ≤ 1e-9
  const poses = [camera.createPose(0, 0, 1), camera.createPose(-123.5, 88.25, 0.7), camera.createPose(240, -40, 1.6)];
  let maxErr = 0;
  for (const pose of poses) {
    for (const [wx, wy] of [[0, 0], [12.3, 7.7], [19.99, 0.01]]) {
      const s = camera.worldToScreen(pose, origin, q, wx, wy);
      const w = camera.screenToWorld(pose, origin, q, s.x, s.y);
      maxErr = Math.max(maxErr, Math.abs(w.x - wx), Math.abs(w.y - wy));
    }
  }
  cases.push(ok('T02-02 双向投影往返误差≤1e-9', maxErr <= 1e-9, 'maxErr=' + maxErr.toExponential(2)));

  // 2. 光标锚定缩放：光标下世界点不动
  const pose0 = camera.createPose(50, 30, 1.2);
  const px = 300, py = 240; // 视口局部
  const before = camera.screenToWorld(pose0, origin, q, px + origin.left, py + origin.top);
  const pose1 = camera.zoomAtPose(pose0, px, py, 1.15);
  const after = camera.screenToWorld(pose1, origin, q, px + origin.left, py + origin.top);
  cases.push(ok('T02-02 光标锚定缩放世界点不动',
    Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9, ''));

  // 3. 缩放往返：×1.15^3 ÷1.15^3 回到原 pose
  let p = pose0;
  for (let i = 0; i < 3; i++) p = camera.zoomAtPose(p, px, py, 1.15);
  for (let i = 0; i < 3; i++) p = camera.zoomAtPose(p, px, py, 1 / 1.15);
  cases.push(ok('T02-02 缩放往返还原 pose',
    Math.abs(p.tx - pose0.tx) < 1e-6 && Math.abs(p.ty - pose0.ty) < 1e-6 && Math.abs(p.scale - pose0.scale) < 1e-9,
    JSON.stringify(p)));

  // 4. screenToGrid 越界 null（不 clamp 成边缘格）；pose0(50,30,1.2) 下屏幕局部(260,260) → 世界(3.5,3.833) → 格(3,3)
  const grid = { columns: 20, rows: 20 };
  const gHit = camera.screenToGrid(pose0, origin, q, grid, origin.left + 260, origin.top + 260);
  cases.push(ok('T02-02 屏幕点逆投影到逻辑格', gHit && gHit.col === 3 && gHit.row === 3, JSON.stringify(gHit)));
  const gOut1 = camera.screenToGrid(camera.createPose(), origin, q, grid, origin.left - 5, origin.top + 500);
  const gOut2 = camera.screenToGrid(camera.createPose(), origin, q, grid, origin.left + 1010, origin.top + 10);
  cases.push(ok('T02-02 世界范围外返回 null', gOut1 === null && gOut2 === null,
    JSON.stringify([gOut1, gOut2])));

  // 5. 朝向：0/90/180/270/360 方向向量；360°≡0°
  const dv = geometry.directionVector;
  cases.push(ok('T02-02 facing 四方向向量',
    JSON.stringify(dv(0)) === JSON.stringify({ dx: 0, dy: -1 }) &&
    JSON.stringify(dv(90)) === JSON.stringify({ dx: 1, dy: 0 }) &&
    JSON.stringify(dv(180)) === JSON.stringify({ dx: 0, dy: 1 }) &&
    JSON.stringify(dv(270)) === JSON.stringify({ dx: -1, dy: 0 }), JSON.stringify([dv(0), dv(90), dv(180), dv(270)])));
  cases.push(ok('T02-02 facing 360≡0', geometry.normalizeFacing(360) === 0 && geometry.normalizeFacing(-90) === 270, ''));

  // 6. 单位中心：1×1 半格中心 vs 2×2 完整占地中心
  const c1 = geometry.unitCenter({ col: 3, row: 4 }, { width: 1, height: 1 });
  const c2 = geometry.unitCenter({ col: 14, row: 10 }, { width: 2, height: 2 });
  cases.push(ok('T02-02 单位中心（1×1 半格 / 2×2 占地中心）',
    c1.x === 3.5 && c1.y === 4.5 && c2.x === 15 && c2.y === 11, JSON.stringify([c1, c2])));

  // 7. 聚焦：目标世界点投到 safeRect 中心
  const safe = { left: 56, top: 64, width: 900, height: 500 };
  const safeCx = origin.left + safe.left + safe.width / 2;
  const safeCy = origin.top + safe.top + safe.height / 2;
  const fp = camera.focusPose(6, 6, 1, origin, q, { x: safeCx, y: safeCy });
  const fs = camera.worldToScreen(fp, origin, q, 6, 6);
  cases.push(ok('T02-02 focusWorld 落 safeRect 中心', Math.abs(fs.x - safeCx) < 1e-9 && Math.abs(fs.y - safeCy) < 1e-9,
    JSON.stringify(fs)));

  // 8. 弹道贝塞尔公式：端点与中点（真实弹道绘制共用同一公式源）
  const a = { x: 150, y: 300 }, ctrl = { x: 500, y: 100 }, b = { x: 850, y: 450 };
  const t0 = arcaneVfx.bezierPoint(a, ctrl, b, 0);
  const t1 = arcaneVfx.bezierPoint(a, ctrl, b, 1);
  const tm = arcaneVfx.bezierPoint(a, ctrl, b, 0.5);
  cases.push(ok('T02-02 贝塞尔端点', t0.x === a.x && t0.y === a.y && t1.x === b.x && t1.y === b.y, JSON.stringify([t0, t1])));
  cases.push(ok('T02-02 贝塞尔 t=0.5 中点公式值',
    Math.abs(tm.x - (0.25 * a.x + 0.5 * ctrl.x + 0.25 * b.x)) < 1e-9 &&
    Math.abs(tm.y - (0.25 * a.y + 0.5 * ctrl.y + 0.25 * b.y)) < 1e-9, JSON.stringify(tm)));

  // 9. 相机 pose 与格表语义无关（世界数据不改演出/相机数据；单源边界）
  const compiled = scene.compileScene(scene.TEST_ROOM);
  const beforeCells = JSON.stringify(compiled.cells);
  camera.createPose(1, 2, 3); worldNothing();
  function worldNothing() { /* 仅证明调用相机不触碰场景数据 */ }
  cases.push(ok('T02-02 相机操作不触碰格表数据', JSON.stringify(compiled.cells) === beforeCells, ''));

  return { cases };
}

// ---------- T02-03 真实占格 / 同名身份 / 手势状态机 / 单源反证 ----------

async function t0203(deps) {
  const { geometry, scene, camera, main } = deps.modules;
  const cases = [];

  // 1. 占格枚举
  const c1 = geometry.occupiedCells({ col: 3, row: 4 }, { width: 1, height: 1 });
  const c2 = geometry.occupiedCells({ col: 14, row: 10 }, { width: 2, height: 2 });
  cases.push(ok('T02-03 1×1 枚举 1 格', c1.length === 1 && c1[0].col === 3 && c1[0].row === 4, JSON.stringify(c1)));
  cases.push(ok('T02-03 2×2 枚举 4 格', c2.length === 4 &&
    JSON.stringify(c2) === JSON.stringify([{ col: 14, row: 10 }, { col: 15, row: 10 }, { col: 14, row: 11 }, { col: 15, row: 11 }]),
    JSON.stringify(c2)));

  // 2. 占位索引：2×2 四格中心同 ID；边界外 null
  const placements = [
    { unitId: 'h:书采', col: 3, row: 4 }, { unitId: 'h:书采:2', col: 5, row: 4 },
    { unitId: 'e:堕天使', col: 14, row: 10 },
  ];
  const fps = { 'h:书采': { width: 1, height: 1 }, 'h:书采:2': { width: 1, height: 1 }, 'e:堕天使': { width: 2, height: 2 } };
  const occ = geometry.buildOccupancyIndex(placements, fps);
  cases.push(ok('T02-03 2×2 四格同 ID', geometry.unitAt(occ, 14, 10) === 'e:堕天使' &&
    geometry.unitAt(occ, 15, 10) === 'e:堕天使' && geometry.unitAt(occ, 14, 11) === 'e:堕天使' &&
    geometry.unitAt(occ, 15, 11) === 'e:堕天使', ''));
  cases.push(ok('T02-03 2×2 占格外不命中（16,10 → null）', geometry.unitAt(occ, 16, 10) === null, ''));
  cases.push(ok('T02-03 1×1 圆标视觉外延不参与命中（3,5 → null）', geometry.unitAt(occ, 3, 5) === null, ''));

  // 3. 同名两单位派生不同稳定 ID（buildViewData 真实入口）
  globalThis.getVariables = () => ({});
  globalThis.replaceVariables = () => {};
  globalThis.insertOrAssignVariables = () => {};
  const { parseYamlText } = deps.modules.parser;
  const { loadTacticsRoster } = deps.modules.storage;
  const block = parseYamlText(main.DEFAULT_YAML_A);
  const roster = loadTacticsRoster(block, []);
  const view = main.buildViewData(block, roster.heroes,
    { sceneId: block.sceneId, grid: { columns: 20, rows: 20, metersPerCell: 1 } }, main.DEFAULT_PLACEMENTS, {});
  const ids = view.units.map(u => u.id);
  cases.push(ok('T02-03 同名两我方派生不同 ID', ids.includes('h:书采') && ids.includes('h:书采:2') &&
    new Set(ids).size === ids.length, ids.join(',')));
  cases.push(ok('T02-03 敌方乘数展开各自 ID（杂兵·1/杂兵·2）', ids.includes('e:杂兵·1') && ids.includes('e:杂兵·2'), ''));
  cases.push(ok('T02-03 大型敌方原型 footprint 2×2（P01 敌方原型修复回归）',
    view.footprintsById['e:堕天使'].width === 2 && view.footprintsById['e:堕天使'].height === 2,
    JSON.stringify(view.footprintsById['e:堕天使'])));

  // 4. buildViewData 缺站位直接失败（不静默）
  let threw = false;
  try {
    main.buildViewData(block, roster.heroes, { sceneId: 'x', grid: { columns: 1, rows: 1, metersPerCell: 1 } }, {}, {});
  } catch (e) { threw = true; }
  cases.push(ok('T02-03 单位缺站位抛错', threw, ''));

  // 5. 手势状态机全路径（阈值 6）
  const G = camera.createGesture;
  const p0 = camera.createPose();
  // a. 小于阈值不平移不选取，up 产生 click
  const g1 = G({ threshold: 6 });
  g1.down({ pointerId: 1, clientX: 0, clientY: 0 }, p0);
  const midMove = g1.move({ pointerId: 1, clientX: 3, clientY: 0 });
  const upClick = g1.up({ pointerId: 1, clientX: 3, clientY: 0 });
  cases.push(ok('T02-03 手势 <6px 不平移且 up=click', midMove === null && upClick.type === 'click',
    JSON.stringify([midMove, upClick])));
  // b. 达到阈值转 dragging（起始 pose+总位移）；up=drag-end 零选取
  const g2 = G({ threshold: 6 });
  g2.down({ pointerId: 2, clientX: 10, clientY: 10 }, p0);
  const dragMove = g2.move({ pointerId: 2, clientX: 60, clientY: 25 });
  const upDrag = g2.up({ pointerId: 2, clientX: 60, clientY: 25 });
  cases.push(ok('T02-03 ≥6px 转 dragging（起始pose+总位移）',
    dragMove && dragMove.state === 'dragging' && dragMove.pose.tx === 50 && dragMove.pose.ty === 15, JSON.stringify(dragMove)));
  cases.push(ok('T02-03 dragging 结束零选取', upDrag.type === 'drag-end', JSON.stringify(upDrag)));
  // c. 拖远再拖回原点不能变 click
  const g3 = G({ threshold: 6 });
  g3.down({ pointerId: 3, clientX: 0, clientY: 0 }, p0);
  g3.move({ pointerId: 3, clientX: 100, clientY: 0 });
  const backUp = g3.up({ pointerId: 3, clientX: 0, clientY: 0 });
  cases.push(ok('T02-03 拖远回原点仍 drag-end', backUp.type === 'drag-end', JSON.stringify(backUp)));
  // d. pointercancel 只结束不选取
  const g4 = G({ threshold: 6 });
  g4.down({ pointerId: 4, clientX: 0, clientY: 0 }, p0);
  const canceled = g4.cancel({ pointerId: 4 });
  cases.push(ok('T02-03 cancel 不选取', canceled.type === 'cancel' && g4.state === 'idle', ''));
  // e. 不匹配 pointerId 不处理
  const g5 = G({ threshold: 6 });
  g5.down({ pointerId: 5, clientX: 0, clientY: 0 }, p0);
  cases.push(ok('T02-03 错误 pointerId 忽略',
    g5.move({ pointerId: 9, clientX: 50, clientY: 50 }) === null && g5.up({ pointerId: 9, clientX: 0, clientY: 0 }) === null,
    ''));

  // 6. 单源反证：只改一处权威描述 → 格表与美术一起变（禁止第二份几何）
  const scene2 = JSON.parse(JSON.stringify(scene.TEST_ROOM));
  scene2.objects.find(o => o.id === 'counter-low').bounds = { col: 5, row: 5, width: 2, height: 1 };
  const cNew = scene.compileScene(scene2);
  const cell55 = cNew.cells[5 * 20 + 5];
  const feature = cNew.artJson.features.find(f => f.type === 'counter');
  cases.push(ok('T02-03 低柜移动：格表与美术同动',
    cell55.blocksMovement === true && cell55.lowObstacle === true && feature.at[0] === 250 && feature.at[1] === 250,
    JSON.stringify([cell55.blocksMovement, feature])));
  const scene3 = JSON.parse(JSON.stringify(scene.TEST_ROOM));
  scene3.objects.find(o => o.id === 'door-main').open = false;
  const cDoor = scene.compileScene(scene3);
  const doorCell = cDoor.cells[9 * 20 + 9];
  cases.push(ok('T02-03 门关闭：三阻挡与门叶画法同变',
    doorCell.blocksMovement && doorCell.blocksProjectile && doorCell.blocksVision &&
    cDoor.artJson.features.some(f => f.type === 'doorLeaf'), ''));
  cases.push(ok('T02-03 门开：无阻挡且无门叶', scene.compileScene(scene.TEST_ROOM).cells[9 * 20 + 9].blocksMovement === false &&
    !scene.compileScene(scene.TEST_ROOM).artJson.features.some(f => f.type === 'doorLeaf'), ''));

  return { cases };
}

// ---------- T02-04 生命周期（可控时钟）+ 路由分支 ----------

async function t0204(deps) {
  const { viewScope, lifecycle } = deps.modules;
  const cases = [];

  // 可控时钟：虚拟推进，不依赖现实等待（一次性定时；after/raf 共用）
  function makeClock() {
    let now = 0;
    let queue = [];
    return {
      get now() { return now; },
      advance(ms) {
        now += ms;
        const due = queue.filter(t => t.at <= now && !t.canceled);
        queue = [];
        due.forEach(t => t.fn());
      },
      setTimeout(fn, ms) { const t = { at: now + ms, fn, canceled: false }; queue.push(t); return t; },
      clearTimeout(t) { if (t) t.canceled = true; },
      setInterval() { throw new Error('可控时钟不支持 interval（P02 视图循环统一走 loop/after）'); },
      clearInterval() {},
      raf(fn) { const t = { at: now + 16, fn: () => fn(now), canceled: false }; queue.push(t); return t; },
      caf(t) { if (t) t.canceled = true; },
    };
  }

  // 1. after：dispose 后旧定时器推进仍零触发
  const clock1 = makeClock();
  const s1 = viewScope.createViewScope(clock1);
  let fired = 0;
  s1.after(100, () => fired++);
  s1.dispose();
  clock1.advance(500);
  cases.push(ok('T02-04 dispose 后旧 after 零触发', fired === 0 && s1.counts().timers === 0, 'fired=' + fired));

  // 2. settleOnDispose：取消 Promise 恰好结算一次 false
  const clock2 = makeClock();
  const s2 = viewScope.createViewScope(clock2);
  let settled = 0, lastOk;
  s2.settleOnDispose(v => { settled++; lastOk = v; });
  s2.dispose();
  s2.dispose(); // 幂等
  cases.push(ok('T02-04 取消 Promise 只结算一次 false', settled === 1 && lastOk === false, 'n=' + settled + ' ok=' + lastOk));

  // 3. dispose 幂等：重复调用计数不为负
  const s3 = viewScope.createViewScope();
  s3.dispose();
  const again = s3.dispose();
  cases.push(ok('T02-04 dispose 幂等且计数归零',
    again.timers === 0 && again.listeners === 0 && again.nodes === 0 && again.active === false, JSON.stringify(again)));

  // 4. loop：正常返回 false 自停；dispose 后停止
  const clock4 = makeClock();
  const s4 = viewScope.createViewScope(clock4);
  let loops = 0;
  s4.loop(() => { loops++; return loops < 2; });
  clock4.advance(100); // 第 1 帧
  clock4.advance(100); // 第 2 帧：返回 false 自停
  const naturalLoops = loops;
  s4.dispose();
  clock4.advance(100); // 自停后无新帧
  const loopsAfterDispose = loops;
  const s4b = viewScope.createViewScope(clock4);
  let loopHits = 0;
  s4b.loop(() => { loopHits++; return true; });
  s4b.dispose(); // 先失效再推进
  clock4.advance(100);
  cases.push(ok('T02-04 loop 正常自停（2 帧）', loops === 2 && naturalLoops === 2 && loopsAfterDispose === 2,
    'loops=' + loops + ' natural=' + naturalLoops));
  cases.push(ok('T02-04 dispose 停止 loop', loopHits === 0, 'loopHits=' + loopHits));

  // 5. listen：dispose 解绑后触发不再进入
  const s5 = viewScope.createViewScope();
  let hits = 0;
  const fakeEl = { _ls: [], addEventListener(type, fn) { this._ls.push(fn); }, removeEventListener(type, fn) { const i = this._ls.indexOf(fn); if (i >= 0) this._ls.splice(i, 1); } };
  s5.listen(fakeEl, 'x', () => hits++);
  const countsBefore = s5.counts().listeners;
  s5.dispose();
  fakeEl._ls.slice().forEach(fn => fn());
  cases.push(ok('T02-04 dispose 解绑监听', countsBefore === 1 && hits === 0 && s5.counts().listeners === 0, 'hits=' + hits));

  // 5b. hold：演出时钟暂停期间，已排与新排的 after 都顺延，结束后按剩余时长续跑；heldMs 累计暂停时长
  const clock5 = (() => {
    let now = 0, q = [];
    return {
      get now() { return now; }, time: () => now,
      advance(ms) { const end = now + ms; for (;;) { const t = q.filter(x => !x.c && x.at <= end).sort((a, b) => a.at - b.at)[0]; if (!t) break; now = t.at; t.c = true; t.fn(); } now = end; },
      setTimeout(fn, ms) { const t = { at: now + ms, fn, c: false }; q.push(t); return t; }, clearTimeout(t) { if (t) t.c = true; },
      setInterval() {}, clearInterval() {}, raf() {}, caf() {},
    };
  })();
  const s5b = viewScope.createViewScope(clock5);
  const order = [];
  s5b.after(100, () => order.push('a@' + clock5.now));
  clock5.advance(40);
  let resumed = -1;
  s5b.hold(200, () => { resumed = clock5.now; });
  s5b.after(30, () => order.push('b@' + clock5.now));
  clock5.advance(100);                   // 140：暂停中，无触发
  const quiet = order.length === 0 && s5b.heldMs() === 100;
  clock5.advance(100);                   // 240：解冻（a 剩 60，b 剩 30）
  clock5.advance(30); clock5.advance(30); // 270 触发 b，300 触发 a
  cases.push(ok('T02-04 hold 顺延已排/新排计时并累计暂停时长',
    quiet && resumed === 240 && order.join(',') === 'b@270,a@300' && s5b.heldMs() === 200 && s5b.counts().timers === 0,
    JSON.stringify({ quiet, resumed, order, held: s5b.heldMs() })));

  // 6. P02 路由口径：三分支 branch 值（sandbox 动作映射的依据）
  const st = lifecycle.applyLoad(null, { sceneId: 'sc-a', battleId: 'bt-1' }, null, {});
  const resume = lifecycle.applyLoad(st.state, { sceneId: 'sc-a', battleId: 'bt-1' }, null, {});
  const newBattle = lifecycle.applyLoad(st.state, { sceneId: 'sc-a', battleId: 'bt-2' }, null, {});
  const newScene = lifecycle.applyLoad(st.state, { sceneId: 'sc-b', battleId: 'bt-1' }, null, {});
  cases.push(ok('T02-04 路由分支 resume/new-battle/new-scene',
    resume.branch === 'resume' && newBattle.branch === 'new-battle' && newScene.branch === 'new-scene',
    JSON.stringify([resume.branch, newBattle.branch, newScene.branch])));
  // 同 scene 新 battle：场景态（位置）保留（深拷贝语义下比较内容）、战斗态全新
  cases.push(ok('T02-04 新 battle 保留场景态',
    JSON.stringify(newBattle.sceneState.positions) === JSON.stringify(st.state.scenes['sc-a'].positions) &&
    JSON.stringify(newBattle.sceneState.doors) === JSON.stringify(st.state.scenes['sc-a'].doors) &&
    Object.keys(newBattle.battleState.perBattleUses).length === 0, ''));
  // 新 scene：重建场景
  cases.push(ok('T02-04 新 scene 重建', newScene.sceneState !== st.state.scenes['sc-a'] && newScene.sceneState.sceneId === 'sc-b', ''));
  // resume 幂等：重复输入 explicitApplied=false（无显式增量）
  cases.push(ok('T02-04 重复输入无副作用', resume.branch === 'resume' && resume.explicitApplied === false, ''));

  return { cases };
}

// ---------- 注册表 ----------

export const groups = {
  'T02-01': { run: t0201 },
  'T02-02': { run: t0202 },
  'T02-03': { run: t0203 },
  'T02-04': { run: async deps => { const base = await t0204(deps); const {runReviewCases}=await import('./p02-review-node.mjs'); base.cases.push(...runReviewCases()); return base; } },
};
