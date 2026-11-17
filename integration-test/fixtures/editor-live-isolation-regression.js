/* 编辑器数据隔离专项：草稿独立、取消不回滚、保存交接、载入/重置边界。
   仅在源码模式（?artifact=0）运行：夹具经 w.eval 直接读写顶层词法变量名，
   压缩产物 mangle 后变量名变化，产物入包由 editor-live-isolation-artifact-check.cjs 静态断言兜底。 */
window.runEditorLiveIsolationRegression = async function ({ w, check, eq, mock }) {
  const ev = code => w.eval(code);
  const doc = w.document;
  const saved = ev(`({ heroesData, enemiesData, initialHeroesCache, initialEnemiesCache,
    editorDraftHeroes, editorDraftEnemies, state:{...state}, token: combatToken, frozen: _pipelineFrozen,
    battleHistory, _historyRawCache, itemBindingKnowledge, particles: fxEngine.particles.slice(),
    tab: window.__editorFactionTab })`);
  const chat = mock.api.getVariables({ type: 'chat' });
  const storage = Object.fromEntries(Array.from({ length: w.localStorage.length }, (_, i) => {
    const k = w.localStorage.key(i); return [k, w.localStorage.getItem(k)];
  }));
  const HERO = name => ({ id: 'h_iso0', name, img: '', hp: 200, maxHp: 200, mp: 50, maxMp: 50, tp: 0, maxTp: 100,
    atk: 20, def: 5, spd: 200, shield: 0, actCount: 1, isAlive: true, buffs: [], isDefending: false,
    hitBonus: 0, evaBonus: 0, burstActivated: false, hasteStore: 0, currentDelay: null,
    skills: [{ name: '攻击', isReaction: false, reactionTarget: 'all', kanpoTarget: null, sheshenTarget: null,
      isOthers: false, guaranteedHit: false, switchTarget: false, critRate: 0, isHighTier: false, isLegendary: false,
      damageType: '远程', fxTag: null, cost: 0, hpCost: 0, tpCost: 0, hit: 100, turns: null, delay: 0, haste: 0,
      maxUses: 0, type: '[单体]', power: 20, type2: '[无]', power2: 0, type3: '[无]', power3: 0 }],
    items: [], classType: null, isWise: false });
  const ENEMY = name => ({ id: 'e_iso0', name, emoji: '👾', img: null, nameTags: [], tags: [], mutatedFrom: [],
    resistMap: {}, immuneBurn: false, immunePoison: false, explode: null, hp: 300, maxHp: 300, mp: 0, maxMp: 0,
    tp: 0, maxTp: 100, currentCharge: 0, atk: 10, def: 0, spd: 50, shield: 0, actCount: 1, isAlive: true,
    buffs: [], isDefending: false, hitBonus: 0, evaBonus: 0,
    skills: [{ name: '撕咬', damageType: null, fxTag: null, guaranteedHit: false, switchTarget: false, critRate: 0,
      cost: 0, hpCost: 0, tpCost: 0, charge: 0, hit: 100, type: '[单体]', power: 10, type2: '[无]', power2: 0, type3: '[无]', power3: 0 }],
    items: [], classType: null, isWise: false, reviveCount: 0, baseTauntBonus: 0, row: 'front', tier: null, _manualRow: null });
  const install = () => {
    w.__isoHero = HERO('隔离英雄'); w.__isoEnemy = ENEMY('隔离敌');
    ev('heroesData=[window.__isoHero];enemiesData=[window.__isoEnemy];');
    ev('state.isGameStarted=false;state.round=1;state.queueIndex=0;state.actionQueue=[];state.isAnimating=false;state.isTargeting=false;_pipelineFrozen=false;');
    ev('battleHistory=[];initialHeroesCache=[];initialEnemiesCache=[];editorDraftHeroes=null;editorDraftEnemies=null;');
    ev('teamBarrier=0;teamBarrierMax=0;barrierStandIn=null;teamBarrierArmor=0;barrierSub=null;initUI();');
  };
  const watchRejections = () => {
    w.__isoErr = null;
    w.__isoRejHandler = e => { w.__isoErr = String(e.reason); };
    w.addEventListener('unhandledrejection', w.__isoRejHandler);
  };
  const stopRejections = () => { if (w.__isoRejHandler) { w.removeEventListener('unhandledrejection', w.__isoRejHandler); w.__isoRejHandler = null; } };
  const closeModal = () => {
    const m = doc.getElementById('editor-modal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    ev('editorDraftHeroes=null;editorDraftEnemies=null;');
    ev('closeSkillTypeCombo()');
    const ov = doc.getElementById('save-freeze-overlay'); if (ov) ov.remove();
  };
  try {
    /* ========== 场景一：准备页打开编辑器——引用恒等、取消全丢弃 ========== */
    install();
    ev('window.__isoProbe = heroesData[0];');
    ev('openEditor()');
    check(ev('editorDraftHeroes') && ev('editorDraftHeroes') !== ev('heroesData'), '准备页打开编辑器建立独立草稿');
    check(ev('heroesData[0] === window.__isoProbe'), '打开编辑器后实时实体引用恒等');
    check(ev('editorDraftHeroes[0] !== window.__isoProbe'), '草稿实体与实时实体不共享对象');
    const nameEl = doc.getElementById('edit-h-0-name');
    if (!nameEl) { check(false, '准备页编辑器渲染英雄表单'); } else {
      nameEl.value = '草稿改名'; nameEl.dispatchEvent(new w.Event('input', { bubbles: true }));
    }
    ev('closeEditor()');
    check(ev('heroesData[0].name') === '隔离英雄', '取消编辑不提前改变实时阵容');
    check(ev('editorDraftHeroes') === null && ev('editorDraftEnemies') === null, '取消丢弃草稿');

    /* ========== 场景二：准备页增删不提前生效 ========== */
    ev('openEditor()');
    const liveSkillN = ev('heroesData[0].skills.length');
    w.addHeroSkill(0);
    check(ev('heroesData[0].skills.length') === liveSkillN, '编辑器内新增技能不提前改动实时阵容');
    check(ev('editorDraftHeroes[0].skills.length') === liveSkillN + 1, '新增技能写入独立草稿');
    w.removeHeroSkill(0, 0);
    check(ev('editorDraftHeroes[0].skills.length') === liveSkillN, '草稿内删除技能即时生效');
    ev('closeEditor()');
    check(ev('heroesData[0].skills.length') === liveSkillN, '取消后草稿增删不残留');

    /* ========== 场景三：战斗中打开编辑器——DOM/队列恒等、原始故障点复现 ========== */
    ev('state.isGameStarted=true;freezeInitialCaches();');
    ev('heroesData[0].hp -= 30; heroesData[0].mp -= 5;'); // 模拟已发生的战斗消耗
    ev('window.__isoDoms = heroesData.map(h => h.dom); window.__isoHeroRef = heroesData[0];');
    ev('openEditor()');
    check(ev('editorDraftHeroes[0] !== window.__isoHeroRef'), '战斗中草稿与实时实体分离');
    eq(ev('editorDraftHeroes[0].hp'), ev('initialHeroesCache[0].hp'), '战斗中草稿显示开场基线HP（不显示消耗）');
    check(ev('editorDraftHeroes[0].hp') !== ev('heroesData[0].hp'), '草稿HP≠实时HP（战斗消耗不进表单）');
    check(ev('heroesData.every((h, i) => h.dom === window.__isoDoms[i])'), '打开编辑器后战场DOM引用恒等');
    ev('openEditor()'); // 重渲染
    check(ev('heroesData.every((h, i) => h.dom === window.__isoDoms[i])'), '编辑器重渲染不改战场DOM');
    watchRejections();
    check(ev('(() => { try { updateActiveHeroDisplay(heroesData[0].id); return null; } catch (e) { return String(e); } })()') === null,
      '编辑器打开时 updateActiveHeroDisplay 无 classList 异常（原始故障点）');
    ev('window.__isoQueueRef = null; state.queueIndex = 0; startRound();');
    await new Promise(r => setTimeout(r, 400));
    check(ev('window.__isoErr') === null, 'startRound→nextTurn→updateActiveHeroDisplay 全程无 rejection', String(ev('window.__isoErr')));
    check(ev('state.actionQueue.length') > 0 && ev('state.actionQueue.some(a => a.type === "hero" && a.ref === window.__isoHeroRef)'),
      '行动队列引用实时实体而非草稿');

    /* ========== 场景四：开窗期间战斗推进后取消——不回滚战斗 ========== */
    ev('heroesData[0].hp -= 20; heroesData[0].mp -= 3;');
    ev('closeEditor()');
    eq(ev('heroesData[0].hp'), 150, '取消编辑不回滚开窗期间的HP消耗');
    eq(ev('heroesData[0].mp'), 42, '取消编辑不回滚开窗期间的MP消耗');
    check(ev('heroesData[0] === window.__isoHeroRef'), '取消编辑不替换实时实体');
    stopRejections();

    /* ========== 场景四B：敌方实际行动链进行中开关编辑器——伤害落地且不被回滚/中断 ========== */
    install();
    ev('state.isGameStarted=true;freezeInitialCaches();initUI();');
    // 敌方先动（spd 999）、英雄几乎不闪避（spd=1→Eva上限1永不闪避）、无护甲保证伤害落地
    ev('enemiesData[0].spd = 999; heroesData[0].spd = 1; heroesData[0].def = 0;');
    ev('window.__isoHeroRef = heroesData[0]; window.__isoHpFull = heroesData[0].hp;');
    watchRejections();
    ev('startRound();'); // 敌方 AI 自动行动：前摇→命中结算→动画的完整异步链
    await new Promise(r => setTimeout(r, 700)); // 行动链进行中（结算窗口前后）
    ev('openEditor()');
    check(ev('editorDraftHeroes') !== null, '敌方行动进行中可打开编辑器');
    ev('closeEditor()');
    check(ev('heroesData[0] === window.__isoHeroRef'), '行动中取消编辑不替换实时实体');
    await new Promise(r => setTimeout(r, 2500)); // 等敌方行动链完整走完
    check(ev('window.__isoErr') === null, '敌方行动链开关编辑器全程无 rejection', String(ev('window.__isoErr')));
    check(ev('heroesData[0].hp') < ev('window.__isoHpFull') && ev('heroesData[0].hp') > 0,
      '敌方攻击伤害实际落在实时实体（行动链未被打断/回滚）');
    check(ev('document.getElementById("hero-card-h_iso0")') !== null, '行动链完成后战场节点仍有效');

    /* ========== 场景四C：开窗期间召唤入队——守卫跳过无表单召唤物、取消后保留 ========== */
    ev('openEditor()');
    ev('window.__isoSum = { id: "s_iso", name: "隔离召唤", isSummon: true, side: "hero", emoji: "🐾", img: null, hp: 50, maxHp: 50, mp: 0, maxMp: 0, tp: 0, maxTp: 100, atk: 5, def: 0, spd: 10, shield: 0, actCount: 1, isAlive: true, buffs: [], isDefending: false, skills: [{ name: "支援", isReaction: false, kanpoTarget: null, sheshenTarget: null, isOthers: false, guaranteedHit: false, switchTarget: false, critRate: 0, cost: 0, hpCost: 0, tpCost: 0, hit: 100, type: "[单体]", power: 5, type2: "[无]", power2: 0, type3: "[无]", power3: 0 }], items: [] };');
    ev('heroesData.push(window.__isoSum);');
    ev('try { initUIIncrementalSummon(window.__isoSum); } catch (e) { window.__isoSumErr = String(e); }');
    check(ev('window.__isoSumErr') === undefined, '开窗期间召唤增量入队不抛错');
    ev('syncEditorDataToMemory()'); // 守卫应跳过无表单的召唤物（组20为源码仿真，此处为战斗态实景复验）
    eq(ev('window.__isoSum.hp'), 50, '召唤物无表单被守卫跳过，草稿同步不覆盖实时召唤');
    ev('closeEditor()');
    check(ev('heroesData.includes(window.__isoSum)'), '取消编辑后开窗期间入队的召唤物保留');
    check(ev('document.getElementById("hero-wrap-s_iso")') !== null && ev('document.getElementById("hero-wrap-s_iso").isConnected'), '召唤物战场节点保留且已连接');
    stopRejections();

    /* ========== 场景五：保存交接——草稿固化为新基线并完整重置 ========== */
    ev('openEditor()');
    const nameEl2 = doc.getElementById('edit-h-0-name');
    if (nameEl2) nameEl2.value = '隔离保存';
    const clsEl = doc.getElementById('edit-h-0-class');
    if (clsEl) clsEl.value = '防守者';
    ev('window.__isoOldDom = heroesData[0].dom; window.__isoOldToken = combatToken;');
    ev('saveEditor()');
    const rosterNow = mock.api.getVariables({ type: 'chat' }).rpg_combat_roster;
    check(rosterNow && rosterNow.heroes[0].name === '隔离保存', '保存把草稿写入roster（非旧实时阵容）');
    check(rosterNow && rosterNow.heroes[0].config.classType === '防守者', '保存草稿职业写入roster');
    eq(ev('heroesData[0].name'), '隔离保存', '保存后实时阵容从新基线重建');
    check(ev('heroesData[0].dom') && ev('heroesData[0].dom') !== ev('window.__isoOldDom'), '保存重置后战场DOM重建');
    check(ev('editorDraftHeroes') === null && ev('editorDraftEnemies') === null, '保存后草稿丢弃');
    check(ev('combatToken') !== ev('window.__isoOldToken'), '保存重置换新代际令牌（旧链失效）');
    eq(ev('state.actionQueue.length'), 0, '保存重置清空旧行动队列');
    check(ev('_pipelineFrozen') === true, '战斗中保存进入冻结等待点击');
    eq(ev('initialHeroesCache[0].name'), '隔离保存', '新基线由草稿固化');
    eq(ev('initialHeroesCache[0].hp'), 200, '新基线HP为归一化后的开场值（不含战斗消耗）');
    ev('openEditor()');
    eq((doc.getElementById('edit-h-0-name') || {}).value, '隔离保存', '保存后重开显示新基线名称');
    const shieldAfterFirstSave = ev('heroesData[0].shield');
    ev('saveEditor()'); // 二次保存幂等（职业派生不叠加）
    const ov2 = doc.getElementById('save-freeze-overlay'); if (ov2) ov2.remove();
    eq(ev('heroesData[0].shield'), shieldAfterFirstSave, '二次保存职业盾不叠加（幂等收敛）');
    check(ev('heroesData[0].dom') && ev('heroesData[0].dom.isConnected'), '二次保存后DOM仍有效');

    /* ========== 场景六：完整载入路径——载入前开设置→新YAML→真实startGame→首回合 ========== */
    install();
    ev('openEditor()');
    check(ev('editorDraftHeroes') !== null, '载入前编辑器草稿已建立（原始故障前置态）');
    ev('onCombatDataReceived("战斗数据栏:\\n  我方列表:\\n    - 角色:\\n        名字: \\"新载入英雄\\"\\n        属性: \\"[HP:150/150][MP:30/30][Atk:15][Armor:3][Speed:80]\\"\\n  敌方列表:\\n    - 角色:\\n        名字: \\"新载入敌\\"\\n        属性: \\"[HP:250/250][MP:0/0][Atk:8][Armor:0][Speed:30]\\"")');
    check(ev('editorDraftHeroes') === null, '成功载入新YAML后旧草稿失效');
    const edModal = doc.getElementById('editor-modal');
    check(edModal && edModal.classList.contains('hidden'), '成功载入新YAML后编辑器关闭');
    eq(ev('heroesData[0].name'), '新载入英雄', '新YAML阵容生效');
    // 真实 startGame 完整路径：开战前关草稿 → 冻结本场基线 → 1s 开场窗 → 0.8s 后 startRound → nextTurn → updateActiveHeroDisplay
    watchRejections();
    ev('window.__isoStartErr = null; try { startGame(); } catch (e) { window.__isoStartErr = String(e && e.stack || e); }');
    check(ev('window.__isoStartErr') === null, '真实startGame同步段无异常', String(ev('window.__isoStartErr')));
    await new Promise(r => setTimeout(r, 3600)); // 覆盖 startGame 1s+0.8s 延时链直到首回合刷新
    check(ev('window.__isoErr') === null, '完整开战→首回合显示全程无 classList rejection（原始故障路径）', String(ev('window.__isoErr')));
    check(ev('state.isGameStarted') === true, 'startGame 正式开战');
    check(ev('heroesData[0].dom') && ev('heroesData[0].dom.isConnected'), '开战后英雄战场节点有效');
    check(ev('state.actionQueue.length') > 0 && ev('state.actionQueue[0].ref') === ev('heroesData[0]'),
      '首回合队列引用实时实体而非草稿');
    check(ev('(() => { try { updateActiveHeroDisplay(heroesData[0].id); return null; } catch (e) { return String(e); } })()') === null,
      '首回合显示函数直调无 classList 异常（确定性补充）');

    /* ========== 场景七：重置管线丢弃草稿 ========== */
    ev('openEditor()');
    check(ev('editorDraftHeroes') !== null, '重置前编辑器草稿存在');
    ev('runResetPipeline()');
    check(ev('editorDraftHeroes') === null && ev('editorDraftEnemies') === null, '重置管线丢弃编辑草稿');
    ev('closeEditor()');
  } finally {
    stopRejections();
    closeModal();
    w.__isoRestore = saved;
    ev(`(() => {
      const s = window.__isoRestore;
      heroesData = s.heroesData; enemiesData = s.enemiesData;
      initialHeroesCache = s.initialHeroesCache; initialEnemiesCache = s.initialEnemiesCache;
      editorDraftHeroes = s.editorDraftHeroes; editorDraftEnemies = s.editorDraftEnemies;
      battleHistory = s.battleHistory; _historyRawCache = s._historyRawCache; itemBindingKnowledge = s.itemBindingKnowledge;
      for (const key of Object.keys(state)) delete state[key]; Object.assign(state, s.state);
      combatToken = s.token; _pipelineFrozen = s.frozen;
      fxEngine.particles = s.particles; window.__editorFactionTab = s.tab;
      delete window.__isoRestore; delete window.__isoHero; delete window.__isoEnemy;
      delete window.__isoProbe; delete window.__isoDoms; delete window.__isoHeroRef;
      delete window.__isoOldDom; delete window.__isoOldToken; delete window.__isoErr; delete window.__isoQueueRef;
      initUI();
    })()`);
    mock.api.replaceVariables(chat, { type: 'chat' });
    w.localStorage.clear();
    Object.entries(storage).forEach(([k, v]) => w.localStorage.setItem(k, v));
  }
};
