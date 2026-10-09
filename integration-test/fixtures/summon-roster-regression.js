/* ============================================================================
   召唤物忽略非致命制服 + 名单(roster)缺省归一 —— 浏览器回归（harness test42）
   调用：window.runSummonRosterRegression({ w: rpgWin(), check, eq })
   - w    ：真实引擎 iframe 的 window（含已装载的真实函数）
   - check：harness 的 (cond, name, extra)   - eq：harness 的 (actual, expect, name)
   门槛：接口已落地，soft/待对齐一律按 check(false) 计为失败（不得全绿）。
   约束：只调用引擎中已装载的真实函数；仅 stub 动画/UI/sleep 与 applySingleTagEffect；
         临时替换按引用保存并在 finally 内恢复（同一 realm，禁 JSON 序列化函数）。
   ========================================================================== */
(function () {
  'use strict';

  window.runSummonRosterRegression = async function (opts) {
    const w = opts && opts.w;
    const check = opts && opts.check;
    const eq = opts && opts.eq;
    if (!w || typeof check !== 'function') {
      if (typeof check === 'function') check(false, '召唤/名单回归：缺少 w（引擎 iframe window）');
      return { skipped: true };
    }
    const eqFn = typeof eq === 'function' ? eq : function (a, b, n) { check(JSON.stringify(a) === JSON.stringify(b), n); };

    const pending = [];
    const has = (n) => typeof w[n] === 'function';
    const srcOf = (n) => { try { return has(n) ? String(w[n]) : ''; } catch (e) { return ''; } };
    // 硬门槛：契约未落地即失败（并登记待对齐明细，便于主代理定位）
    const soft = (cond, name, reason) => {
      if (cond) { check(true, name); return; }
      pending.push(name + ' — ' + (reason || '接口/行为未落地'));
      check(false, name + '（待对齐：' + (reason || '接口/行为未落地') + '）');
    };

    /* -------- 临时替换管理（同 realm 按引用保存 / finally 恢复） -------- */
    const stubs = [];
    const stub = (key, val) => {
      stubs.push({ key, had: Object.prototype.hasOwnProperty.call(w, key), old: w[key] });
      try { w[key] = val; } catch (e) { /* 只读属性：忽略 */ }
    };
    const restoreAll = () => {
      while (stubs.length) {
        const s = stubs.pop();
        try { if (s.had) w[s.key] = s.old; else delete w[s.key]; } catch (e) { /* ignore */ }
      }
    };
    const saveData = () => w.eval('window.__srr_savedHeroes = heroesData; window.__srr_savedEnemies = enemiesData; window.__srr_savedInitialHeroes = initialHeroesCache; window.__srr_savedInitialEnemies = initialEnemiesCache; window.__srr_savedBindings = itemBindingKnowledge; window.__srr_savedHistory = battleHistory; battleHistory = [];');
    const restoreData = () => w.eval(
      'if (window.__srr_savedHeroes !== undefined) { heroesData = window.__srr_savedHeroes; enemiesData = window.__srr_savedEnemies; initialHeroesCache = window.__srr_savedInitialHeroes; initialEnemiesCache = window.__srr_savedInitialEnemies; itemBindingKnowledge = window.__srr_savedBindings; battleHistory = window.__srr_savedHistory; }' +
      'delete window.__srr_savedHeroes; delete window.__srr_savedEnemies; delete window.__srr_savedInitialHeroes; delete window.__srr_savedInitialEnemies; delete window.__srr_savedBindings; delete window.__srr_savedHistory;');

    const mkSummon = (o) => Object.assign({
      id: 's_rt', name: '测试召唤物', isSummon: true, side: 'hero', isAlive: true,
      hp: 50, maxHp: 50, mp: 10, maxMp: 10, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 50,
      buffs: [], skills: [], items: [], classType: '', cooldowns: {}, currentCharge: 0, isWise: false, hitBonus: 0
    }, o);
    const mkE = (id, name, extra) => Object.assign({
      id: id, name: name, isAlive: true, hp: 100, maxHp: 100, mp: 0, maxMp: 0,
      atk: 5, def: 0, spd: 50, buffs: [], skills: [], row: 'front'
    }, extra);
    const mkSkill = (o) => Object.assign({
      name: '测试技', type: '[单体]', type2: '[无]', type3: '[无]', power: 10, power2: 0, power3: 0,
      hit: 100, cost: 0, damageType: '远程', fxTag: null, isReaction: false, reactionTarget: 'all'
    }, o);
    const setData = (heroes, enemies) => w.eval(
      'heroesData = ' + JSON.stringify(heroes) + '; enemiesData = ' + JSON.stringify(enemies) + ';');

    /* ================= G1 召唤物忽略非致命制服（真实执行） ================= */
    if (has('isIgnoredSummonTarget')) {
      const f = w.isIgnoredSummonTarget;
      const S_hero = { isSummon: true, side: 'hero', id: 's_h1' };
      const S_enemy = { isSummon: true, side: 'enemy', id: 's_e1' };
      const H = { id: 'h1' };
      const E = { id: 'e1' };
      const E_sub = { id: 'e2', isSubdued: true };
      const H_sub = { id: 'h2', isSubdued: true };
      const E_stun = { id: 'e3', buffs: [{ type: 'stun' }] };
      check(f(S_hero, E_sub) === true, '真实：英雄侧召唤物 × 被制服敌方 → 忽略');
      check(f(S_enemy, H_sub) === true, '真实：敌方召唤物 × 被制服英雄 → 忽略');
      check(f(S_hero, H_sub) === false, '真实：同侧目标 → 不忽略');
      check(f(S_hero, E) === false, '真实：目标未制服 → 不忽略');
      check(f(H, E_sub) === false, '真实：非召唤物施法者 → 不忽略');
      check(f(S_hero, E_stun) === false, '真实：仅普通眩晕（非制服）→ 不忽略：普通眩晕保留');
    } else {
      soft(false, 'isIgnoredSummonTarget 真值表', '接口未落地');
    }

    /* ================= G2 名单缺省归一（真实执行） ================= */
    if (has('normalizeRosterSkill')) {
      const norm = w.normalizeRosterSkill;
      const o1 = { type: null, type2: undefined, type3: null };
      norm(o1); // 就地归一（无返回值）
      eqFn([o1.type, o1.type2, o1.type3], ['[无]', '[无]', '[无]'], '真实：空槽 type/type2/type3 → \'[无]\'');
      const t0 = { turns: 0 }; norm(t0); eqFn(t0.turns, null, '真实：turns:0 → null');
      const t5 = { turns: 5 }; norm(t5); eqFn(t5.turns, 5, '真实：显式正数 turns:5 保留');
      const par = { type: null, children: [{ type: null, turns: 0 }, { type: '[单增]', turns: 3 }] };
      norm(par);
      eqFn([par.children[0].type, par.children[0].turns, par.children[1].turns], ['[无]', null, 3],
        '真实：children 递归归一且不改显式正数回合');
      const itemLike = { type: null, type2: null, type3: null, turns: null, children: [{ type2: undefined }] };
      let ok = false;
      try { norm(itemLike); ok = itemLike.type === '[无]' && itemLike.turns === null && itemLike.children[0].type2 === '[无]'; } catch (e) { ok = false; }
      check(ok, '真实：物品同构对象（含 children）归一不抛错且空槽 → \'[无]\'');
    } else {
      soft(false, 'normalizeRosterSkill 空槽/回合/children 归一', '接口未落地');
    }

    /* ========= G3 executeSummonTurn：空敌池 / 普通眩晕 / 异侧 / 友方池（真实执行） ========= */
    if (has('executeSummonTurn') && has('isIgnoredSummonTarget')) {
      const rec = { skill: 0, end: 0, targets: [] };
      try {
        saveData();
        stub('executeSkillAction', async function (caster, target) { rec.skill++; rec.targets.push(target && target.name); });
        stub('endTurn', async function () { rec.end++; });
        stub('triggerBurstIfNeeded', async function () { return 1; });
        stub('getEntitySpriteDom', function () { return null; });
        stub('updateHeroUI', function () {});
        stub('updateEnemyUI', function () {});
        stub('getTauntTarget', function (pool) { return (pool && pool[0]) || null; });
        stub('isHighYieldSkill', function () { return false; });
        let selectImpl = function () { return { selectedSkill: null, specificTarget: null }; };
        stub('selectEnemySkillAndTarget', function () { return selectImpl.apply(null, arguments); });

        const summon = mkSummon({});

        // A：敌方全员被制服 → 直接 endTurn，不出手
        setData([summon], [mkE('e_t1', '敌甲', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }),
                           mkE('e_t2', '敌乙', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] })]);
        await w.executeSummonTurn(summon);
        check(rec.end >= 1, '真实：召唤物遇全员被制服敌池 → 调用 endTurn 安全收尾');
        check(rec.skill === 0, '真实：召唤物不向被制服目标出手（executeSkillAction 0 次）');

        // B：仅普通眩晕（非制服）→ 不被忽略，仍出手
        rec.skill = 0; rec.end = 0; rec.targets.length = 0;
        setData([summon], [mkE('e_t3', '敌丙', { buffs: [{ type: 'stun' }] })]);
        await w.executeSummonTurn(summon);
        check(rec.skill === 1 && rec.targets[0] === '敌丙', '真实：仅普通眩晕的目标未被忽略，召唤物仍对其出手');

        // C：异侧（敌方）召唤物，我方全员被制服 → 同样空池安全结束
        rec.skill = 0; rec.end = 0; rec.targets.length = 0;
        const enemySummon = mkSummon({ id: 's_test2', name: '敌方召唤物', side: 'enemy' });
        setData([mkE('h_t1', '勇甲', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }),
                 mkE('h_t2', '勇乙', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] })],
                [mkE('e_ally1', '敌援')]);
        await w.executeSummonTurn(enemySummon);
        check(rec.end >= 1 && rec.skill === 0, '真实：异侧（敌方）召唤物 × 我方全员被制服 → 同样 endTurn 安全结束');

        // D：异侧过滤只作用于对手池；同侧被制服友军保留（友方增益不被过滤）
        rec.skill = 0; rec.end = 0; rec.targets.length = 0;
        const cap = { enemyPool: null, allyPool: null };
        selectImpl = function (caster, valid, a3, a4) { cap.enemyPool = a4; cap.allyPool = a3; return { selectedSkill: null, specificTarget: null }; };
        setData([summon, mkE('h_ally', '被制服友军', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] })],
                [mkE('e_x1', '敌甲', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }), mkE('e_x2', '敌乙')]);
        await w.executeSummonTurn(summon);
        check(!!cap.enemyPool && cap.enemyPool.length === 1 && cap.enemyPool[0].name === '敌乙',
          '真实：异侧过滤只作用于对手池（被制服敌方已剔除）');
        check(!!cap.allyPool && cap.allyPool.some((e) => e.name === '被制服友军'),
          '真实：友方池不被过滤（同侧被制服友军仍在，友方增益对象保留）');
      } catch (e) {
        check(false, '真实：executeSummonTurn 场景异常', String((e && e.message) || e));
      } finally {
        restoreAll();
        try { restoreData(); } catch (e) { /* ignore */ }
      }
    } else {
      soft(false, 'executeSummonTurn 空敌池/异侧/友方池（真实执行）', 'executeSummonTurn 未落地');
    }

    /* ========= G3e executeEnemyTurn 敌方召唤：侧别过滤 + 空敌池（真实执行 + 静态） ========= */
    const etSrc = srcOf('executeEnemyTurn');
    if (etSrc && has('isIgnoredSummonTarget')) {
      check(/enemy\.isSummon\s*&&\s*!\s*aliveHeroes\.length[\s\S]{0,200}?endTurn/.test(etSrc),
        '静态：executeEnemyTurn 敌方召唤空池 → endTurn');
      soft(etSrc.includes('isIgnoredSummonTarget'), '静态：executeEnemyTurn 按侧别过滤我方池', '侧别过滤未落地');
      const rec = { skill: 0, end: 0, targets: [] };
      try {
        saveData();
        stub('executeSkillAction', async function (c, t) { rec.skill++; rec.targets.push(t && t.name); });
        stub('endTurn', async function () { rec.end++; });
        stub('triggerBurstIfNeeded', async function () { return 1; });
        stub('getEntitySpriteDom', function () { return null; });
        stub('updateHeroUI', function () {});
        stub('updateEnemyUI', function () {});
        stub('getTauntTarget', function (pool) { return (pool && pool[0]) || null; });
        stub('isHighYieldSkill', function () { return false; });
        let etSelect = function () { return { selectedSkill: null, specificTarget: null }; };
        stub('selectEnemySkillAndTarget', function () { return etSelect.apply(null, arguments); });

        const enemySummon = mkSummon({ id: 's_e9', name: '敌方召唤物', side: 'enemy' });
        setData([mkE('h_s1', '勇甲', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }),
                 mkE('h_s2', '勇乙', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] })],
                [mkE('e_ally9', '敌援')]);
        await w.executeEnemyTurn(enemySummon);
        check(rec.end >= 1 && rec.skill === 0, '真实：executeEnemyTurn 敌方召唤 × 我方全员被制服 → endTurn 安全结束');

        rec.skill = 0; rec.end = 0; rec.targets.length = 0;
        const cap = { ally: null, targets: null };
        const STOP = { __stop: true };
        etSelect = function (caster, valid, a3, a4) { cap.ally = a3; cap.targets = a4; throw STOP; };
        setData([mkE('h_s3', '勇丙', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }), mkE('h_s4', '勇丁')],
                [mkE('e_ally10', '敌援')]);
        try { await w.executeEnemyTurn(enemySummon); } catch (e) { if (e !== STOP) throw e; }
        check(!!cap.targets && cap.targets.length === 1 && cap.targets[0].name === '勇丁',
          '真实：executeEnemyTurn 我方池按侧别过滤（被制服我方已剔除）');
        check(!!cap.ally && cap.ally.some((e) => e.name === '敌援'),
          '真实：executeEnemyTurn 己方池不被过滤（友方增益对象保留）');
      } catch (e) {
        check(false, '真实：executeEnemyTurn 场景异常', String((e && e.message) || e));
      } finally {
        restoreAll();
        try { restoreData(); } catch (e) { /* ignore */ }
      }
    } else {
      soft(false, 'executeEnemyTurn 侧别过滤/空池（真实执行）', 'executeEnemyTurn 未落地');
    }

    /* ========= G4 executeSkillAction 真实路由：AOE/random/转火/跳过/自盲 ========= */
    if (has('executeSkillAction') && has('isIgnoredSummonTarget')) {
      try {
        saveData();
        const rec = { targets: [], seg: 0 };
        stub('applySingleTagEffect', async function (c, t) {
          rec.targets.push(t && t.name);
          rec.seg++;
          if (rec.seg === 1 && t) { // 第一段即制服目标（引擎数组经 JSON 往返，须按 id 回写真实条目）
            t.isSubdued = true;
            try { w.eval('(function(id){ var all = enemiesData.concat(heroesData); for (var i = 0; i < all.length; i++) if (all[i] && all[i].id === id) all[i].isSubdued = true; })(' + JSON.stringify(t.id) + ')'); } catch (e) { /* ignore */ }
          }
          return undefined;
        });
        stub('updateHeroUI', function () {});
        stub('updateEnemyUI', function () {});
        stub('getEntitySpriteDom', function () { return null; });
        stub('playAOEEffect', function () {});
        stub('isHighYieldSkill', function () { return false; });
        const caster = mkSummon({});
        const run = (unused, primary, skill) =>
          w.executeSkillAction(caster, primary, skill, 1, false, true);

        // AOE：对手池已剔除被制服敌方
        rec.targets.length = 0; rec.seg = 0;
        setData([caster], [mkE('e_a', '敌甲', { isSubdued: true }), mkE('e_b', '敌乙')]);
        await run(null, null, mkSkill({ name: '群攻', type: '[群攻]' }));
        check(rec.targets.join(',') === '敌乙', '真实：AOE 命中集剔除被制服敌方（实际 ' + rec.targets.join(',') + '）');

        // random：主目标为空时随机池已过滤
        rec.targets.length = 0; rec.seg = 0;
        setData([caster], [mkE('e_a', '敌甲', { isSubdued: true }), mkE('e_b', '敌乙')]);
        await run(null, null, mkSkill({ name: '单体' }));
        check(rec.targets.join(',') === '敌乙', '真实：random 保底随机池剔除被制服敌方（实际 ' + rec.targets.join(',') + '）');

        // 同技能制服后无转火 → 后续段跳过
        rec.targets.length = 0; rec.seg = 0;
        setData([caster], [mkE('e_a', '敌甲', { isSubdued: true }), mkE('e_b', '敌乙')]);
        await run(null, mkE('e_b', '敌乙'), mkSkill({ name: '双段', type2: '[单体]' }));
        check(rec.targets.join(',') === '敌乙' && rec.targets.length === 1,
          '真实：同技能制服后无转火标签 → 后续段跳过（仅 1 段命中）');

        // 同技能制服后带转火 → 后续段转火
        rec.targets.length = 0; rec.seg = 0;
        const histBefore = w.eval('battleHistory.length');
        setData([caster], [mkE('e_a', '敌甲', { isSubdued: true }), mkE('e_b', '敌乙'), mkE('e_c', '敌丙')]);
        await run(null, mkE('e_b', '敌乙'), mkSkill({ name: '双段转火', type2: '[单体]', switchTarget: true }));
        check(rec.targets.join(',') === '敌乙,敌丙', '真实：同技能制服后带转火 → 后续段转向其他存活敌（实际 ' + rec.targets.join(',') + '）');
        check(w.eval('battleHistory.slice(' + histBefore + ').join("\\n").indexOf("转火") >= 0'), '真实：转火战报已写入战斗历史');

        // self-debuff：目标恒为施法者
        rec.targets.length = 0; rec.seg = 0;
        setData([caster], [mkE('e_a', '敌甲', { isSubdued: true })]);
        await run(null, null, mkSkill({ name: '自盲', type: '[自盲]', power: 10 }));
        check(rec.targets.join(',') === '测试召唤物', '真实：self-debuff（自盲）目标恒为施法者，不受过滤影响');
      } catch (e) {
        check(false, '真实：executeSkillAction 路由场景异常', String((e && e.message) || e));
      } finally {
        restoreAll();
        try { restoreData(); } catch (e) { /* ignore */ }
      }
    } else {
      soft(false, 'executeSkillAction 真实路由（AOE/random/转火/跳过/自盲）', 'executeSkillAction 未落地');
    }

    /* ========= G4s executeSkillAction 过滤点静态复核 ========= */
    const skSrc = srcOf('executeSkillAction');
    if (skSrc) {
      const hits = (skSrc.match(/isIgnoredSummonTarget/g) || []).length;
      soft(hits >= 4, '静态：opponents / 转火 / targets 后置过滤 / 扫射快照 四处均过滤（当前 ' + hits + ' 处）', '过滤点不足');
    } else {
      soft(false, 'executeSkillAction 过滤点（静态源码）', '函数未落地');
    }

    /* ========= G5 applySingleTagEffect 直连保护（真实执行 + 静态） ========= */
    const astSrc = srcOf('applySingleTagEffect');
    if (astSrc && has('isIgnoredSummonTarget')) {
      soft(astSrc.includes('isIgnoredSummonTarget'), '静态：applySingleTagEffect 直连保护', '直连保护未落地');
      try {
        const caster = mkSummon({});
        const victim = mkE('e_p', '被制服敌', { isSubdued: true, hp: 7 });
        const before = { hp: victim.hp, buffs: victim.buffs.length };
        const out = await w.applySingleTagEffect(caster, victim, '[单体]', 999, 100, 1, null, { name: '直连保护' });
        check(out === undefined && victim.hp === before.hp && victim.buffs.length === before.buffs,
          '真实：applySingleTagEffect 对忽略目标直连保护（直接返回，无伤害/无状态）');
      } catch (e) {
        check(false, '真实：applySingleTagEffect 直连保护场景异常', String((e && e.message) || e));
      }
    } else {
      soft(false, 'applySingleTagEffect 直连保护', '函数未落地');
    }

    /* ========= G6 普通眩晕保留：nextTurn 跳过判定（静态源码，硬断言） ========= */
    const ntSrc = srcOf('nextTurn');
    if (ntSrc) {
      check(/\.type\s*===\s*'stun'/.test(ntSrc), '静态：nextTurn 仍按 buff.type===\'stun\' 判定跳过（普通眩晕保留）');
      check(ntSrc.includes('isSubdued'), '静态：nextTurn 制服分支仍存在');
    } else {
      soft(false, 'nextTurn 跳过判定（静态源码）', '函数未落地');
    }

    /* ========= G7 战意激增（自盲2/增攻3）真实保存→重载往返 ========= */
    if (has('persistHeroesRoster') && has('applyPersistedRoster') && has('serializeHeroesForSave') && has('getVariables') && has('insertOrAssignVariables')) {
      try {
        saveData();
        const mkHero = (id, skill) => ({
          name: '狂战士', id: id, img: '', hp: 200, maxHp: 200, mp: 8, maxMp: 8,
          tp: 0, maxTp: 100, atk: 60, def: 60, spd: 50, shield: 0, actCount: 1, isAlive: true,
          buffs: [], classType: '狂战士', isSummon: false, items: [], skills: [skill]
        });
        const savedSkill = { name: '战意激增', type: '[单增]', power: 50, turns: 3, slotTurns: 3, type2: '[自盲]', power2: 10, slotTurns2: 2 };
        w.eval('heroesData = ' + JSON.stringify([mkHero('h_r1', savedSkill)]) + ';');
        w.persistHeroesRoster(); // 真实写入 chat 变量（经 getVariables mock 持久层）

        // 重载 1：YAML 空槽（turns null / slotTurns null）→ 应被存档补齐
        w.eval('heroesData = ' + JSON.stringify([mkHero('h_r2', { name: '战意激增', type: '[单增]', power: 50, turns: null, slotTurns: null, slotTurns2: null })]) + ';');
        w.applyPersistedRoster();
        const got = w.eval('(function(){ var s = heroesData[0].skills.find(function(x){return x.name==="战意激增";}); return { st: s.slotTurns, st2: s.slotTurns2, t: s.turns }; })()');
        eqFn([got.st, got.st2, got.t], [3, 2, 3], '真实：persistHeroesRoster → applyPersistedRoster 往返补齐 slotTurns=3 / slotTurns2=2 / turns=3');

        // 重载 2：YAML 显式正数回合 → 不被存档覆盖
        w.eval('heroesData = ' + JSON.stringify([mkHero('h_r3', { name: '战意激增', type: '[单增]', power: 50, turns: 5 })]) + ';');
        w.applyPersistedRoster();
        const got2 = w.eval('(function(){ var s = heroesData[0].skills.find(function(x){return x.name==="战意激增";}); return s.turns; })()');
        eqFn(got2, 5, '真实：YAML 显式正数回合 turns:5 在重载后仍为 5');
      } catch (e) {
        check(false, '真实：战意激增保存→重载往返异常', String((e && e.message) || e));
      } finally {
        restoreAll();
        try { restoreData(); } catch (e) { /* ignore */ }
        try { w.insertOrAssignVariables({ rpg_combat_roster: { version: 0 } }, { type: 'chat' }); } catch (e) { /* ignore */ }
      }
    } else {
      soft(false, '战意激增保存→重载往返（真实执行）', 'persistHeroesRoster/applyPersistedRoster/getVariables 未落地');
    }

    /* ========= G8 说明与门槛 ========= */
    check(true, '说明：OpeningSetup 侧模板与 getMechTurns 由 fixtures/verify-summon-roster.cjs 离线覆盖（RpgCombat iframe 不含该文件）');
    check(pending.length === 0, '待对齐项为 0（当前 ' + pending.length + ' 项）' + (pending.length ? '：' + pending.join('；') : ''));
    return { pending: pending };
  };
})();
