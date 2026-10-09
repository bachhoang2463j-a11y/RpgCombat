#!/usr/bin/env node
'use strict';
/* ============================================================================
   离线回归：召唤物忽略非致命制服 + 名单(roster)缺省归一 + OpeningSetup 机制回合
   特点：可完全离线运行（无网络 / 无 LLM / 无浏览器 / 无依赖）
   原则：从真实 HTML 中提取真实源码函数，在最小沙箱里执行；不复制任何业务实现。
   用法：node integration-test/fixtures/verify-summon-roster.cjs [引擎HTML ...]
        默认对 index.html 与 index-公开版.html 各跑一遍（引擎版本参数化）。
   退出码：真实断言失败 → 1；仅“待对齐”（接口尚未落地）→ 0。
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const RPG_DEFAULT = 'D:/Project/RpgCombat/index.html';
const RPG_PUBLIC = 'D:/Project/RpgCombat/index-公开版.html';
const OPENING_PUBLIC = 'D:/Project/OpeningSetup/OpeningSetup-公开版.html';

/* ---------------- 源码提取（花括号配平，识别字符串/模板/注释/正则） -------- */
function sliceBalanced(src, openIdx, open, close) {
  let i = openIdx, depth = 0;
  const n = src.length;
  const lastNonWs = (from) => {
    let k = from;
    while (k >= 0 && /\s/.test(src[k])) k--;
    return k >= 0 ? src[k] : '';
  };
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (c === '/' && c2 === '/') { const e = src.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (c === '/' && c2 === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === q) { i++; break; }
        if (q === '`' && src[i] === '$' && src[i + 1] === '{') {
          let d = 1; i += 2;
          while (i < n && d > 0) { if (src[i] === '{') d++; else if (src[i] === '}') d--; i++; }
          continue;
        }
        i++;
      }
      continue;
    }
    if (c === '/') {
      const p = lastNonWs(i - 1);
      if (p === '' || '([{,;:=!&|?+-*%~^<>'.includes(p)) {
        i++;
        let inClass = false;
        while (i < n) {
          const rc = src[i];
          if (rc === '\\') { i += 2; continue; }
          if (rc === '[') inClass = true;
          else if (rc === ']') inClass = false;
          else if (rc === '/' && !inClass) { i++; break; }
          else if (rc === '\n') break;
          i++;
        }
        while (i < n && /[a-z]/i.test(src[i])) i++;
        continue;
      }
    }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

/* 提取顶层 function 声明，或 const/let/var 初始化式（对象/数组/字面量） */
function extractDecl(src, name) {
  const reFn = new RegExp('(?:^|\\n)[ \\t]*(?:async[ \\t]+)?function[ \\t]+' + name + '[ \\t]*\\(', 'm');
  const mf = reFn.exec(src);
  if (mf) {
    const brace = src.indexOf('{', mf.index + mf[0].length - 1);
    if (brace > 0) {
      const end = sliceBalanced(src, brace, '{', '}');
      if (end > 0) return src.slice(mf.index, end + 1).trim();
    }
  }
  const reVar = new RegExp('(?:^|\\n)[ \\t]*(?:const|let|var)[ \\t]+' + name + '[ \\t]*=', 'm');
  const mv = reVar.exec(src);
  if (mv) {
    const eq = src.indexOf('=', mv.index);
    let i = eq + 1;
    while (i < src.length && /\s/.test(src[i])) i++;
    const ch = src[i];
    if (ch === '{') { const e = sliceBalanced(src, i, '{', '}'); if (e > 0) return src.slice(mv.index, e + 1).trim(); }
    if (ch === '[') { const e = sliceBalanced(src, i, '[', ']'); if (e > 0) return src.slice(mv.index, e + 1).trim(); }
    const semi = src.indexOf(';', i);
    if (semi > 0) return src.slice(mv.index, semi + 1).trim();
  }
  return null;
}

/* 把若干真实声明拼进同一 realm，返回指定名字的对象 */
function buildSandbox(decls, names) {
  const body = decls.filter(Boolean).join('\n') + '\nreturn {' + names.join(',') + '};';
  return new Function(body)();
}

/* ---------------- 断言与待对齐计数 ---------------- */
function makeReporter() {
  const st = { pass: 0, fail: 0, pending: [] };
  const line = (sym, name) => console.log('   ' + sym + ' ' + name);
  st.real = (cond, name) => { if (cond) { st.pass++; line('✓ [真实]', name); } else { st.fail++; line('✗ [真实]', name); } };
  st.stat = (cond, name) => { if (cond) { st.pass++; line('✓ [静态]', name); } else { st.fail++; line('✗ [静态]', name); } };
  // 硬门槛：接口已落地，待对齐一律计为失败（并登记明细），不得全绿
  st.pendingIf = (cond, name, reason) => {
    if (cond) { st.pass++; line('✓ [真实]', name); return; }
    st.fail++; st.pending.push(name + ' — ' + reason);
    line('✗ [待对齐]', name + '（' + reason + '）');
  };
  st.pendingStat = (cond, name, reason) => {
    if (cond) { st.pass++; line('✓ [静态]', name); return; }
    st.fail++; st.pending.push(name + ' — ' + reason);
    line('✗ [待对齐]', name + '（' + reason + '）');
  };
  return st;
}

const iitDecl = (src) => extractDecl(src, 'isIgnoredSummonTarget');
const normDecl = (src) => extractDecl(src, 'normalizeRosterSkill');

/* ============================ 引擎侧断言 ================================= */
async function runEngine(enginePath, openSrc) {
  console.log('\n===== 引擎：' + enginePath + ' =====');
  const R = makeReporter();
  const src = fs.readFileSync(enginePath, 'utf8');

  /* --- G1 召唤物忽略非致命制服：isIgnoredSummonTarget 真值表 --- */
  console.log('\n-- G1 召唤物忽略非致命制服（isIgnoredSummonTarget）--');
  let iit = null;
  if (iitDecl(src)) {
    try {
      iit = buildSandbox([extractDecl(src, 'isHeroSideEntity'), iitDecl(src)], ['isIgnoredSummonTarget']).isIgnoredSummonTarget;
    } catch (e) { console.log('   提取沙箱失败：' + e.message); }
  }
  if (typeof iit !== 'function') {
    R.pendingIf(false, 'isIgnoredSummonTarget 真值表（6 例）', '接口未落地');
  } else {
    const S_hero = { isSummon: true, side: 'hero', id: 's_h1' };
    const S_enemy = { isSummon: true, side: 'enemy', id: 's_e1' };
    const H = { id: 'h1' };
    const E = { id: 'e1' };
    const E_sub = { id: 'e2', isSubdued: true };
    const H_sub = { id: 'h2', isSubdued: true };
    const E_stun = { id: 'e3', buffs: [{ type: 'stun' }] };
    R.real(iit(S_hero, E_sub) === true, '英雄侧召唤物 × 被制服敌方 → 忽略(true)');
    R.real(iit(S_enemy, H_sub) === true, '敌方召唤物 × 被制服英雄 → 忽略(true)');
    R.real(iit(S_hero, H_sub) === false, '同侧（召唤物 × 被制服英雄）→ 不忽略(false)');
    R.real(iit(S_hero, E) === false, '目标未制服 → 不忽略(false)');
    R.real(iit(H, E_sub) === false, '非召唤物施法者 → 不忽略(false)');
    R.real(iit(S_hero, E_stun) === false, '仅普通眩晕（非制服）→ 不忽略(false)：普通眩晕保留');
  }

  /* --- G2 名单缺省归一：normalizeRosterSkill --- */
  console.log('\n-- G2 技能/物品/children 缺省回合与空槽归一（normalizeRosterSkill）--');
  let norm = null;
  if (normDecl(src)) {
    try { norm = buildSandbox([normDecl(src)], ['normalizeRosterSkill']).normalizeRosterSkill; } catch (e) { console.log('   提取沙箱失败：' + e.message); }
  }
  if (typeof norm !== 'function') {
    R.pendingIf(false, 'normalizeRosterSkill 空槽/回合/children 归一', '接口未落地');
  } else {
    const o1 = { type: null, type2: undefined, type3: null };
    norm(o1); // 就地归一（无返回值，改原引用）
    R.real(o1.type === '[无]', 'type:null → \'[无]\'');
    R.real(o1.type2 === '[无]', 'type2:undefined → \'[无]\'');
    R.real(o1.type3 === '[无]', 'type3:null → \'[无]\'');

    const t = { turns: undefined }; norm(t); R.real(t.turns === null, 'turns 缺失 → null');
    const t2 = { turns: null }; norm(t2); R.real(t2.turns === null, 'turns:null → null');
    const t0 = { turns: 0 }; norm(t0); R.real(t0.turns === null, 'turns:0 → null');
    const t5 = { turns: 5 }; norm(t5); R.real(t5.turns === 5, '显式正数 turns:5 保留');

    const par = { type: null, children: [{ type: null, type2: undefined, turns: 0 }, { type: '[单增]', turns: 3 }] };
    norm(par);
    R.real(par.children[0].type === '[无]' && par.children[0].type2 === '[无]' && par.children[0].turns === null,
      'children 递归归一（子槽空 → \'[无]\'、turns 0 → null）');
    R.real(par.children[1].type === '[单增]' && par.children[1].turns === 3, 'children 递归不改显式正数回合');

    const itemLike = { type: null, type2: null, type3: null, turns: null, children: [{ type2: undefined }] };
    let itemOk = false;
    try { norm(itemLike); itemOk = itemLike.type === '[无]' && itemLike.turns === null && itemLike.children[0].type2 === '[无]'; } catch (e) { itemOk = false; }
    R.real(itemOk, '物品同构对象（含 children）归一不抛错且空槽 → \'[无]\'');
  }

  /* --- G3 executeSummonTurn：筛敌 + 空敌池 endTurn（静态源码） --- */
  console.log('\n-- G3 executeSummonTurn 筛敌 / 空敌池安全结束（静态源码）--');
  const sumSrc = extractDecl(src, 'executeSummonTurn');
  if (!sumSrc) {
    R.pendingStat(false, 'executeSummonTurn 源码可提取', '函数缺失');
  } else {
    R.pendingStat(sumSrc.includes('isIgnoredSummonTarget'),
      'executeSummonTurn 用 isIgnoredSummonTarget 筛敌', '筛敌未落地');
    R.pendingStat(/!\s*\w*[Ee]nemyPool\w*\.length[\s\S]{0,400}?endTurn/.test(sumSrc)
      || /[Ee]nemyPool[\s\S]{0,200}?\.length[\s\S]{0,300}?endTurn/.test(sumSrc),
      '空敌池 → 直接 endTurn（安全结束）', '空池守卫未落地');
  }

  /* --- G3b executeSummonTurn 空敌池安全结束 + 普通眩晕保留（真实执行） --- */
  console.log('\n-- G3b executeSummonTurn 空敌池安全结束 / 普通眩晕保留（真实执行）--');
  if (!sumSrc || typeof iit !== 'function') {
    R.pendingIf(false, 'executeSummonTurn 空敌池/普通眩晕真实执行', 'executeSummonTurn/isIgnoredSummonTarget 未落地');
  } else {
    const turnFactory = (ctx) => new Function('ctx', [
      extractDecl(src, 'isHeroSideEntity'),
      iitDecl(src),
      extractDecl(src, 'isCombatActive'),
      extractDecl(src, 'isManualSubduedExempt'),
      sumSrc,
      'let heroesData = ctx.heroes, enemiesData = ctx.enemies;',
      'const combatToken = {}; const _pipelineFrozen = false;',
      'const sleep = () => Promise.resolve();',
      'const endTurn = async () => { ctx.rec.end++; };',
      'const executeSkillAction = async (c, t) => { ctx.rec.skill++; ctx.rec.targets.push(t && t.name); };',
      'const triggerBurstIfNeeded = async () => 1;',
      'const getEntitySpriteDom = () => null;',
      'const updateHeroUI = () => {};',
      'const updateEnemyUI = () => {};',
      'const getTauntTarget = (pool) => (pool && pool[0]) || null;',
      'const isHighYieldSkill = () => false;',
      'const selectEnemySkillAndTarget = ctx.select || (() => ({ selectedSkill: null, specificTarget: null }));',
      'return executeSummonTurn;'
    ].join('\n'))(ctx);
    const summon = {
      id: 's_test', name: '测试召唤物', isSummon: true, side: 'hero', isAlive: true,
      hp: 50, maxHp: 50, mp: 10, maxMp: 10, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 50,
      buffs: [], skills: [], items: [], classType: '', cooldowns: {}, currentCharge: 0, isWise: false
    };
    const mkEnemy = (id, name, extra) => Object.assign({
      id: id, name: name, isAlive: true, hp: 1, maxHp: 100, mp: 0, maxMp: 0,
      atk: 5, def: 0, spd: 50, buffs: [], skills: [], row: 'front'
    }, extra);
    try {
      const recA = { skill: 0, end: 0, targets: [] };
      const runA = turnFactory({
        heroes: [summon], summon, rec: recA,
        enemies: [mkEnemy('e_t1', '敌甲', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }),
                  mkEnemy('e_t2', '敌乙', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] })],
      });
      await runA(summon);
      R.real(recA.end >= 1, '敌方全员被制服 → endTurn 收尾（安全结束）');
      R.real(recA.skill === 0, '召唤物不向被制服目标出手（executeSkillAction 0 次）');

      const recB = { skill: 0, end: 0, targets: [] };
      const runB = turnFactory({
        heroes: [summon], summon, rec: recB,
        enemies: [mkEnemy('e_t3', '敌丙', { buffs: [{ type: 'stun' }] })],
      });
      await runB(summon);
      R.real(recB.skill === 1 && recB.targets[0] === '敌丙', '仅普通眩晕目标未被忽略，召唤物仍对其出手');

      // 场景 C：异侧（敌方）召唤物，我方全员被制服 → 同样空池安全结束
      const enemySummon = Object.assign({}, summon, { id: 's_test2', name: '敌方召唤物', side: 'enemy' });
      const recC = { skill: 0, end: 0, targets: [] };
      const runC = turnFactory({
        heroes: [mkEnemy('h_t1', '勇甲', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }),
                 mkEnemy('h_t2', '勇乙', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] })],
        enemies: [Object.assign({}, enemySummon, { id: 'e_ally1' })],
        summon: enemySummon, rec: recC,
      });
      await runC(enemySummon);
      R.real(recC.end >= 1 && recC.skill === 0, '异侧（敌方）召唤物 × 我方全员被制服 → 同样 endTurn 安全结束');

      // 场景 D：异侧过滤只作用于对手池；同侧被制服友军保留（友方增益不被过滤）
      const recD = { skill: 0, end: 0, targets: [], cap: null };
      const runD = turnFactory({
        heroes: [summon, mkEnemy('h_ally', '被制服友军', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] })],
        enemies: [mkEnemy('e_x1', '敌甲', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }),
                  mkEnemy('e_x2', '敌乙', {})],
        summon, rec: recD,
        select: (caster, valid, a3, a4) => { recD.cap = { enemyPool: a4, allyPool: a3 }; return { selectedSkill: null, specificTarget: null }; },
      });
      await runD(summon);
      R.real(!!recD.cap && recD.cap.enemyPool.length === 1 && recD.cap.enemyPool[0].name === '敌乙',
        '异侧过滤只作用于对手池（被制服敌方已剔除）');
      R.real(!!recD.cap && !recD.cap.allyPool.some((e) => e.name === '被制服友军'),
        '友方池排除制服友军（治疗与增益不再作用）');
    } catch (e) {
      R.real(false, 'executeSummonTurn 真实执行异常：' + e.message);
    }
  }

  /* --- G3e executeEnemyTurn 敌方召唤：侧别过滤 + 空敌池（真实执行 + 静态） --- */
  console.log('\n-- G3e executeEnemyTurn 敌方召唤 侧别过滤 / 空敌池（真实执行 + 静态）--');
  const etSrc = extractDecl(src, 'executeEnemyTurn');
  if (!etSrc || typeof iit !== 'function') {
    R.pendingStat(false, 'executeEnemyTurn 侧别过滤/空池守卫', '函数或 helper 未落地');
  } else {
    R.pendingStat(etSrc.includes('isIgnoredSummonTarget'), 'executeEnemyTurn 按侧别过滤我方池', '侧别过滤未落地');
    R.pendingStat(/enemy\.isSummon\s*&&\s*!\s*aliveHeroes\.length[\s\S]{0,200}?endTurn/.test(etSrc),
      'executeEnemyTurn 敌方召唤空池 → endTurn', '空池守卫未落地');
    const summon = { id: 's_base', name: '测试召唤物', isSummon: true, side: 'hero', isAlive: true, hp: 50, maxHp: 50, mp: 10, maxMp: 10, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 50, buffs: [], skills: [], items: [], classType: '', cooldowns: {}, currentCharge: 0, isWise: false };
    const mkEnemy = (id, name, extra) => Object.assign({ id: id, name: name, isAlive: true, hp: 1, maxHp: 100, mp: 0, maxMp: 0, atk: 5, def: 0, spd: 50, buffs: [], skills: [], row: 'front' }, extra);
    const enemyTurnFactory = (ctx) => new Function('ctx', [
      extractDecl(src, 'isHeroSideEntity'),
      iitDecl(src),
      extractDecl(src, 'isCombatActive'),
      extractDecl(src, 'isManualSubduedExempt'),
      etSrc,
      'let heroesData = ctx.heroes, enemiesData = ctx.enemies;',
      'const combatToken = {}; const _pipelineFrozen = false;',
      'const sleep = () => Promise.resolve();',
      'const endTurn = async () => { ctx.rec.end++; };',
      'const executeSkillAction = async (c, t) => { ctx.rec.skill++; ctx.rec.targets.push(t && t.name); };',
      'const getEntitySpriteDom = () => null;',
      'const document = { getElementById: () => null };',
      'const getTauntTarget = (pool) => (pool && pool[0]) || null;',
      'const selectEnemySkillAndTarget = ctx.select || (() => ({ selectedSkill: null, specificTarget: null }));',
      'return executeEnemyTurn;'
    ].join('\n'))(ctx);
    const enemySummon = Object.assign({}, summon, { id: 's_e9', name: '敌方召唤物', side: 'enemy', isWise: false });
    try {
      const recE1 = { skill: 0, end: 0, targets: [] };
      const runE1 = enemyTurnFactory({
        heroes: [mkEnemy('h_s1', '勇甲', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }),
                 mkEnemy('h_s2', '勇乙', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] })],
        enemies: [Object.assign({}, enemySummon, { id: 'e_ally9' })],
        rec: recE1,
      });
      await runE1(enemySummon);
      R.real(recE1.end >= 1 && recE1.skill === 0, '真实：executeEnemyTurn 敌方召唤 × 我方全员被制服 → endTurn 安全结束');

      const recE2 = { skill: 0, end: 0, targets: [], cap: null };
      const STOP = { __stop: true };
      const runE2 = enemyTurnFactory({
        heroes: [mkEnemy('h_s3', '勇丙', { isSubdued: true, buffs: [{ type: 'stun', permanent: true }] }),
                 mkEnemy('h_s4', '勇丁', {})],
        enemies: [Object.assign({}, enemySummon, { id: 'e_ally10' })],
        rec: recE2,
        select: (caster, valid, a3, a4) => { recE2.cap = { ally: a3, targets: a4 }; throw STOP; },
      });
      try { await runE2(enemySummon); } catch (e) { if (e !== STOP) throw e; }
      R.real(!!recE2.cap && recE2.cap.targets.length === 1 && recE2.cap.targets[0].name === '勇丁',
        '真实：executeEnemyTurn 我方池按侧别过滤（被制服我方已剔除）');
      R.real(!!recE2.cap && recE2.cap.ally.some((e) => e.name === '敌方召唤物'),
        '真实：executeEnemyTurn 己方池不被过滤（友方增益对象保留）');
    } catch (e) {
      R.real(false, 'executeEnemyTurn 真实执行异常：' + e.message);
    }
  }

  /* --- G4 executeSkillAction：opponents/targets/转火/特效快照过滤（静态） --- */
  console.log('\n-- G4 executeSkillAction 对手/目标/转火/特效快照过滤（静态源码）--');
  const skSrc = extractDecl(src, 'executeSkillAction');
  if (!skSrc) {
    R.pendingStat(false, 'executeSkillAction 源码可提取', '函数缺失');
  } else {
    const hits = (skSrc.match(/isIgnoredSummonTarget/g) || []).length;
    R.pendingStat(hits >= 4,
      'opponents / targets / 转火 / 特效快照 四处均过滤（当前引用 ' + hits + ' 处）', '过滤点不足');
    R.stat(/const opponents\s*=/.test(skSrc), 'executeSkillAction 保留 opponents 构建点（AOE/random 同源）');
    R.stat(/isAoe/.test(skSrc), 'executeSkillAction 保留 AOE 分支');
    R.pendingStat(/isIgnoredSummonTarget/.test(skSrc.replace(/\/\/[^\n]*/g, '')),
      'executeSkillAction 过滤不只在注释里', '过滤未落地');
  }

  /* --- G4b executeSkillAction 真实路由（AOE/random/转火/跳过/自盲） --- */
  console.log('\n-- G4b executeSkillAction 真实路由（AOE/random/转火/跳过/自盲）--');
  if (!skSrc || typeof iit !== 'function') {
    R.pendingStat(false, 'executeSkillAction 真实路由', '函数或 helper 未落地');
  } else {
    const skillFactory = (ctx) => new Function('ctx', [
      extractDecl(src, 'isHeroSideEntity'),
      iitDecl(src),
      extractDecl(src, 'isCombatActive'),
      extractDecl(src, 'isManualSubduedExempt'),
      extractDecl(src, 'SELF_DEBUFF_KEYS'),
      extractDecl(src, 'isSelfDebuffTag') || 'function isSelfDebuffTag(){ return false; }',
      skSrc,
      'let heroesData = ctx.heroes, enemiesData = ctx.enemies;',
      'const combatToken = {}; const _pipelineFrozen = false;',
      'let barrierAoEActive = false, barrierAoELeak = null;',
      'const teamBarrier = 0;',
      'const state = { usedExtraTurnSkillsThisRound: new Set(), highTierNarrated: new Set() };',
      'const sleep = () => Promise.resolve();',
      'const updateHeroUI = () => {};',
      'const updateEnemyUI = () => {};',
      'const getEntitySpriteDom = () => null;',
      'const document = { getElementById: () => null };',
      'const window = { isExecutingCutin: false };',
      'const playAOEEffect = () => {};',
      'const isHighYieldSkill = () => false;',
      'const getTauntTarget = (pool) => (pool && pool[0]) || null;',
      'const addHistory = (l) => { ctx.rec.history.push(String(l)); };',
      'const CombatEvents = { emit: () => {}, emitAsync: async () => {} };',
      'const EVENTS = { TURN_END: "t", BEFORE_SKILL_RESOLVE: "b" };',
      'const CLASS_PASSIVES = {};',
      'const applySingleTagEffect = async (c, t) => { ctx.rec.targets.push(t && t.name); ctx.rec.seg++; if (ctx.rec.seg === 1 && t) t.isSubdued = true; return undefined; };',
      'return executeSkillAction;'
    ].join('\n'))(ctx);
    const caster = {
      id: 's_rt', name: '测试召唤物', isSummon: true, side: 'hero', isAlive: true,
      hp: 50, maxHp: 50, mp: 10, maxMp: 10, tp: 0, maxTp: 100, atk: 10, def: 0, spd: 50,
      buffs: [], skills: [], items: [], classType: '', cooldowns: {}, currentCharge: 0, isWise: false, hitBonus: 0
    };
    const mkE = (id, name, extra) => Object.assign({
      id: id, name: name, isAlive: true, hp: 100, maxHp: 100, mp: 0, maxMp: 0,
      atk: 5, def: 0, spd: 50, buffs: [], skills: [], row: 'front'
    }, extra);
    const mkSk = (o) => Object.assign({
      name: 's', type: '[单体]', type2: '[无]', type3: '[无]', power: 10, power2: 0, power3: 0,
      hit: 100, cost: 0, damageType: '远程', fxTag: null, isReaction: false, reactionTarget: 'all'
    }, o);
    try {
      const run = (rec, enemies, primary, skill) =>
        skillFactory({ heroes: [caster], enemies, rec })(caster, primary, skill, 1, false, true);
      let rec = { targets: [], seg: 0, history: [] };
      await run(rec, [mkE('e_a', '敌甲', { isSubdued: true }), mkE('e_b', '敌乙')], null, mkSk({ name: '群攻', type: '[群攻]' }));
      R.real(rec.targets.join(',') === '敌乙', 'AOE：命中集剔除被制服敌方（实际 ' + rec.targets.join(',') + '）');

      rec = { targets: [], seg: 0, history: [] };
      await run(rec, [mkE('e_a', '敌甲', { isSubdued: true }), mkE('e_b', '敌乙')], null, mkSk({ name: '单体' }));
      R.real(rec.targets.join(',') === '敌乙', 'random：主目标为空时随机池已过滤（实际 ' + rec.targets.join(',') + '）');

      rec = { targets: [], seg: 0, history: [] };
      const eA2 = mkE('e_a', '敌甲', { isSubdued: true }), eB2 = mkE('e_b', '敌乙');
      await run(rec, [eA2, eB2], eB2, mkSk({ name: '双段', type2: '[单体]' }));
      R.real(rec.targets.join(',') === '敌乙' && rec.targets.length === 1, '同技能制服后无转火 → 后续段跳过（仅 1 段命中）');

      rec = { targets: [], seg: 0, history: [] };
      const eA3 = mkE('e_a', '敌甲', { isSubdued: true }), eB3 = mkE('e_b', '敌乙'), eC3 = mkE('e_c', '敌丙');
      await run(rec, [eA3, eB3, eC3], eB3, mkSk({ name: '双段转火', type2: '[单体]', switchTarget: true }));
      R.real(rec.targets.join(',') === '敌乙,敌丙', '同技能制服后带转火 → 后续段转向其他存活敌（实际 ' + rec.targets.join(',') + '）');
      R.real(rec.history.some((l) => l.indexOf('转火') >= 0), '转火战报已写入战斗历史');

      rec = { targets: [], seg: 0, history: [] };
      await run(rec, [mkE('e_a', '敌甲', { isSubdued: true })], null, mkSk({ name: '自盲', type: '[自盲]', power: 10 }));
      R.real(rec.targets.join(',') === '测试召唤物', 'self-debuff（自盲）目标恒为施法者，不受过滤影响');
    } catch (e) {
      R.real(false, 'executeSkillAction 真实路由异常：' + e.message);
    }
  }

  /* --- G5b applySingleTagEffect 直连保护（真实执行） --- */
  console.log('\n-- G5b applySingleTagEffect 直连保护（真实执行）--');
  const astDecl = extractDecl(src, 'applySingleTagEffect');
  if (!astDecl || typeof iit !== 'function') {
    R.pendingStat(false, 'applySingleTagEffect 直连保护（真实执行）', '函数或 helper 未落地');
  } else {
    try {
      const astFn = buildSandbox(['const combatToken = {}; const _pipelineFrozen = false;', extractDecl(src, 'isHeroSideEntity'), iitDecl(src), extractDecl(src, 'isCombatActive'), extractDecl(src, 'isManualSubduedExempt'), astDecl],
        ['applySingleTagEffect']).applySingleTagEffect;
      const caster = { id: 's_p', name: '测试召唤物', isSummon: true, side: 'hero', isAlive: true };
      const victim = { id: 'e_p', name: '被制服敌', isAlive: true, hp: 7, maxHp: 100, buffs: [], isSubdued: true };
      const before = { hp: victim.hp, buffs: victim.buffs.length };
      const out = await astFn(caster, victim, '[单体]', 999, 100, 1, null, { name: '直连保护' });
      R.real(out === undefined && victim.hp === before.hp && victim.buffs.length === before.buffs,
        'applySingleTagEffect 对忽略目标直连保护（直接返回，无伤害/无状态）');
    } catch (e) {
      R.real(false, 'applySingleTagEffect 直连保护异常：' + e.message);
    }
  }

  /* --- G5 applySingleTagEffect：直连保护（静态源码） --- */
  console.log('\n-- G5 applySingleTagEffect 直连保护（静态源码）--');
  const astSrc = extractDecl(src, 'applySingleTagEffect');
  if (!astSrc) {
    R.pendingStat(false, 'applySingleTagEffect 源码可提取', '函数缺失');
  } else {
    R.pendingStat(astSrc.includes('isIgnoredSummonTarget'),
      'applySingleTagEffect 直连保护（忽略目标直接返回）', '直连保护未落地');
  }

  /* --- G6 普通眩晕保留：nextTurn 跳过判定仍在（静态源码，已落地 → 硬断言） --- */
  console.log('\n-- G6 普通眩晕保留：nextTurn 跳过判定（静态源码）--');
  const ntSrc = extractDecl(src, 'nextTurn');
  if (!ntSrc) {
    R.pendingStat(false, 'nextTurn 源码可提取', '函数缺失');
  } else {
    R.stat(/\.type\s*===\s*'stun'/.test(ntSrc), 'nextTurn 仍按 buff.type===\'stun\' 判定跳过（普通眩晕保留）');
    R.stat(ntSrc.includes('isSubdued'), 'nextTurn 制服分支仍存在');
  }

  /* --- G7 名单字段补齐：不改显式正数回合（真实提取 _gapFillSkill） --- */
  console.log('\n-- G7 战意激增保存重载：字段补齐不改显式正数回合 --');
  let gap = null;
  try {
    gap = buildSandbox([
      extractDecl(src, 'ROSTER_GAP_FILL'),
      extractDecl(src, '_rosterFieldEmpty'),
      extractDecl(src, '_gapFillSkill'),
    ], ['_gapFillSkill'])._gapFillSkill;
  } catch (e) { console.log('   提取沙箱失败：' + e.message); }
  if (typeof gap !== 'function') {
    R.pendingIf(false, '_gapFillSkill 可提取执行', '提取失败');
  } else {
    const yaml = { name: '战意激增', type: '[单增]', turns: null, slotTurns: null, slotTurns2: null };
    gap(yaml, { name: '战意激增', turns: 3, slotTurns: 3, slotTurns2: 2 });
    R.real(yaml.slotTurns === 3, '存档 slotTurns=3（增攻3）→ YAML 空则补齐');
    R.real(yaml.slotTurns2 === 2, '存档 slotTurns2=2（自盲2）→ YAML 空则补齐');

    const yaml2 = { name: '战意激增', type: '[单增]', turns: 5 };
    gap(yaml2, { name: '战意激增', turns: 3 });
    R.real(yaml2.turns === 5, 'YAML 显式正数回合 turns:5 不被存档 3 覆盖');

    if (typeof norm === 'function') {
      const savedRaw = { turns: 0, slotTurns: 0 };
      norm(savedRaw);
      const yaml3 = { name: '战意激增', type: '[单增]', turns: null, slotTurns: null };
      gap(yaml3, savedRaw);
      R.real(savedRaw.turns === null && yaml3.turns === null, '存档 turns:0 先归一为 null → 不覆盖 YAML 空回合');
    } else {
      R.pendingIf(false, '存档 turns:0 先归一为 null 再合并', 'normalizeRosterSkill 未落地');
    }
  }

  /* --- G8 OpeningSetup：模板 / 机制回合 / 空槽模板 --- */
  console.log('\n-- G8 OpeningSetup 模板与机制回合（getMechTurns / empty*Data）--');
  const TEMPLATE = '[单增;power:50;turns:3][自盲;power:10;turns:2]';
  R.stat(openSrc.includes(TEMPLATE), '战意激增模板含 ' + TEMPLATE);

  let gmt = null, emptySkill = null, emptyItem = null;
  try {
    const sb = buildSandbox([
      extractDecl(openSrc, 'DURATION_MECH_PATTERNS'),
      extractDecl(openSrc, 'getMechTurns'),
      extractDecl(openSrc, 'emptySkillData'),
      extractDecl(openSrc, 'emptyItemData'),
    ], ['getMechTurns', 'emptySkillData', 'emptyItemData']);
    gmt = sb.getMechTurns; emptySkill = sb.emptySkillData; emptyItem = sb.emptyItemData;
  } catch (e) { console.log('   提取沙箱失败：' + e.message); }

  if (typeof gmt !== 'function') {
    R.pendingIf(false, 'getMechTurns 可提取执行', '提取失败');
  } else {
    const raw = '【战意激增】[通用][价:2][MP:2]' + TEMPLATE;
    R.real(gmt('目标增攻', raw) === 3, 'getMechTurns(目标增攻) = 3（取槽位 ;turns:3）');
    R.real(gmt('自身致盲', raw) === 2, 'getMechTurns(自身致盲) = 2（取槽位 ;turns:2）');
    R.pendingIf(gmt('自身致盲', '[自盲;power:10]') === 3,
      'getMechTurns 不再硬编码自盲=2（无显式 turns 时回落默认 3）', '自盲硬编码 2 仍存在');
    R.real(gmt('眩晕', '[眩晕;power:15]') === 1, 'getMechTurns(眩晕) = 1（既有默认保留）');
  }

  if (typeof emptySkill === 'function' && typeof emptyItem === 'function') {
    const es = emptySkill(), ei = emptyItem();
    R.real(es.turns === null, 'emptySkillData().turns === null');
    R.real(ei.turns === null, 'emptyItemData().turns === null');
    R.real(Array.isArray(ei.children), 'emptyItemData().children 为数组（空槽兼容）');
    R.real(es.type === '[无]', 'emptySkillData().type 空槽归一为 \'[无]\'');
    if (typeof norm === 'function') {
      const n2 = emptySkill(); norm(n2);
      R.real(n2.type === '[无]' && n2.turns === null, 'emptySkillData 经归一后空槽 → \'[无]\' 且 turns null');
    } else {
      R.pendingIf(false, 'emptySkillData 经归一后空槽 → \'[无]\'', 'normalizeRosterSkill 未落地');
    }
  } else {
    R.pendingIf(false, 'emptySkillData/emptyItemData 可提取执行', '提取失败');
  }

  return R;
}

/* ============================ 主流程 ==================================== */
const engines = process.argv.slice(2).filter((a) => a && !a.startsWith('-'));
if (!engines.length) engines.push(RPG_DEFAULT, RPG_PUBLIC);
const openSrc = fs.readFileSync(OPENING_PUBLIC, 'utf8');

(async function main() {
  const totals = { pass: 0, fail: 0, pending: [] };
  for (const eng of engines) {
    if (!fs.existsSync(eng)) { console.log('\n[跳过] 引擎文件不存在：' + eng); continue; }
    const R = await runEngine(eng, openSrc);
    totals.pass += R.pass; totals.fail += R.fail; totals.pending.push(...R.pending);
  }

  console.log('\n==================== 汇总 ====================');
  console.log('通过（真实/静态）：' + totals.pass + '    失败：' + totals.fail + '    待对齐：' + totals.pending.length);
  if (totals.pending.length) {
    console.log('待对齐（接口/行为尚未落地，不计最终失败）：');
    totals.pending.forEach((p, i) => console.log('  ' + (i + 1) + '. ' + p));
  }
  console.log(totals.fail === 0 ? '结论：无真实断言失败。' : '结论：存在 ' + totals.fail + ' 项真实断言失败。');
  process.exit(totals.fail === 0 ? 0 : 1);
})();
