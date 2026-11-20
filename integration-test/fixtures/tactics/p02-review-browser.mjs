// 真实入口的审查反例；通过 import 后传 app/document 执行，不复制业务实现。
export async function runReviewBrowser(app, doc) {
  const { DEFAULT_YAML_A, DEFAULT_YAML_B, DEFAULT_YAML_C } = await import('../../../tactics/src/main.mjs');
  const cases = [];
  const check = (id, pass, actual) => cases.push({ id, pass: !!pass, actual });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const win = doc.defaultView;
  const errors = [];
  const error = e => errors.push(String(e.message || e.reason));
  win.addEventListener('error', error); win.addEventListener('unhandledrejection', error);
  try {
    app.loadYaml(DEFAULT_YAML_A, { forceReset: true });
    const damaged = DEFAULT_YAML_A.replace('[HP:30]', '[HP:11/30]');
    const oldWorld = doc.getElementById('tactics-world-root');
    app.loadYaml(damaged, { positions: { 'h:书采': { col:3,row:4,facing:180 } } });
    const rec = app.sandbox.getUnitView().nodes.get('h:书采');
    check('review-resume-map-bars', Math.abs(parseFloat(rec.hpBar.style.width) - 36.7) < .1, rec.hpBar.style.width);
    const bottom = doc.querySelector('.t-hero-card .t-bar-hp i').style.width;
    check('review-bottom-bars', bottom === '37%', bottom);
    check('review-facing-refresh', rec.direction.style.transform === 'rotate(180deg)', rec.direction.style.transform);
    check('review-resume-preserves-world', oldWorld === doc.getElementById('tactics-world-root'));
    const reduced = damaged.replace('名字: 杂兵*2', '名字: 杂兵*1');
    const loaded = app.loadYaml(reduced, { positions: { 'e:杂兵': { col:16,row:14,facing:270 } } });
    check('review-unit-remove-add', !app.sandbox.getUnitView().nodes.has('e:杂兵·2') && app.sandbox.getUnitView().nodes.has('e:杂兵'), loaded.viewData.units.map(u=>u.id));
    app.loadYaml(damaged, { sceneOverrides: { doors:{'door-main':false}, objects:{'counter-low':{bounds:{col:5,row:8,width:2,height:1}}} } });
    const c = app.sandbox.getCompiled();
    check('review-door-rules-art', c.cells[9*20+9].blocksMovement && c.artJson.features.some(f=>f.type==='doorLeaf'));
    check('review-object-rules-art', c.cells[8*20+5].lowObstacle && c.artJson.features.some(f=>f.type==='counter' && f.at[0]===250 && f.at[1]===400));
    app.loadYaml(DEFAULT_YAML_C); app.loadYaml(damaged);
    check('review-return-scene-preserves-door', app.sandbox.getCompiled().objectsIndex.get('door-main').open === false);
    const fx = app.sandbox.getVfx(); const scope = app.sandbox.getScope();
    const promise = app.playProjectile('fire','h:书采','e:堕天使');
    app.loadYaml(damaged, {forceReset:true});
    check('review-reset-settles-false', await promise === false);
    check('review-old-fx-clear', fx.state.particles.length===0 && fx.state.flights.length===0 && !fx.state.canvas);
    check('review-old-scope-empty', Object.entries(scope.counts()).every(([k,v])=>k==='active' ? v===false : v===0), scope.counts());
    await app.playProjectile('fire','h:书采','e:堕天使');
    await wait(550);
    check('review-fx-natural-no-errors', errors.length===0, errors);
    // 聚焦等待真实帧达到终点；按帧轮询，不按180ms现实睡眠假定后台帧率。
    app.sandbox.focusWorld(3.5,4.5);
    for(let i=0;i<5;i++) await new Promise(r=>win.requestAnimationFrame(r));
    const o=app.sandbox.getOrigin(), s=app.shell.getSafeRect(), p=app.sandbox.worldToScreenClient(3.5,4.5);
    check('review-focus-final', Math.abs(p.x-o.left-s.left-s.width/2)<1 && Math.abs(p.y-o.top-s.top-s.height/2)<1, p);
    check('review-natural-frame-count-zero', app.sandbox.getScope().counts().raf===0, app.sandbox.getScope().counts());
    check('review-natural-no-cancel-handles', app.sandbox.getScope().counts().cancelCallbacks===0);
    check('review-no-color-placeholders', !doc.querySelector('[data-tactics-layer=art]').innerHTML.includes('%%'));
    return {passed:cases.filter(c=>c.pass).length,failed:cases.filter(c=>!c.pass).length,cases,errors};
  } finally { win.removeEventListener('error', error); win.removeEventListener('unhandledrejection', error); }
}
