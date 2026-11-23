// ==========================================
// TT-AI 敌方 AI 定向用例（真实 tactics/src/ai.mjs + movement/range/geometry/scene）
// 不加载 battle（并行 perception/regions 未落地时 battle 不可导入），AI 直接喂构造 ctx。
// 覆盖：合法性复用、仅可见敌人、浓雾离场/冲刺/出雾再攻击、纯减益走 slotTargets、
//       治疗缺血/满血、同源增益不刷、蓄力→prepare、无感知兼容旧接近、主行动不足不冲刺、贴身防御。
// groups['TT-AI'].run({modules}) -> { cases:[{id,pass,detail}] }；也可 node 直跑。
// ==========================================

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
function j(x) { return JSON.stringify(x); }

function sceneOf(cols, rows) {
  return { sceneId: 'sc-tt-ai', grid: { columns: cols, rows: rows, metersPerCell: 1 }, ground: { material: 'brick' }, objects: [] };
}

function mkUnit(id, side, o) {
  o = o || {};
  const hp = o.hp != null ? o.hp : 100;
  const mp = o.mp != null ? o.mp : 30;
  return {
    id, name: o.name || id, side,
    footprint: o.footprint || { width: 1, height: 1 },
    skills: o.skills || [],
    ref: {
      hp, maxHp: o.maxHp != null ? o.maxHp : hp,
      mp, maxMp: o.maxMp != null ? o.maxMp : mp,
      tp: 0, maxTp: 100,
      atk: o.atk != null ? o.atk : 10, def: o.def != null ? o.def : 0,
      spd: o.spd != null ? o.spd : 100, evasion: o.evasion != null ? o.evasion : 0,
      strength: 50, moveDistance: o.moveDistance != null ? o.moveDistance : 4,
      totalWeight: 40, perception: 50,
    },
  };
}

function makeCtx(m, scene, units, placements, extra) {
  const footprintsById = {};
  for (const u of units) footprintsById[u.id] = u.footprint;
  return Object.assign({
    compiled: m.scene.compileScene(scene),
    units,
    placementsById: placements,
    footprintsById,
  }, extra || {});
}

function cloneWith(ctx, unitId, col, row) {
  const placementsById = Object.assign({}, ctx.placementsById);
  placementsById[unitId] = Object.assign({}, placementsById[unitId], { col, row });
  return Object.assign({}, ctx, { placementsById });
}

function skill(o) {
  return Object.assign({ name: o.name, type: o.type, power: o.power, range: o.range, actionCost: { main: 1, aux: 0 } }, o.extra || {});
}

async function loadModules(deps) {
  const m = (deps && deps.modules) || {};
  const need = ['ai', 'range', 'movement', 'geometry', 'scene'];
  if (need.every(k => m[k])) return m;
  const out = Object.assign({}, m);
  if (!out.ai) out.ai = await import('../../../tactics/src/ai.mjs');
  if (!out.range) out.range = await import('../../../tactics/src/range.mjs');
  if (!out.movement) out.movement = await import('../../../tactics/src/movement.mjs');
  if (!out.geometry) out.geometry = await import('../../../tactics/src/geometry.mjs');
  if (!out.scene) out.scene = await import('../../../tactics/src/scene.mjs');
  return out;
}

async function run(deps) {
  const m = await loadModules(deps);
  const { ai, range } = m;
  const cases = [];

  const claw = skill({ name: 'claw', type: '[伤害]', power: 8, range: { type: '单体', castRange: 1 } });
  const sunder = skill({ name: 'sunder', type: '[降防]', power: 30, range: { type: '单体', castRange: 10 } });
  const mend = skill({ name: 'mend', type: '[回复]', power: 40, range: { type: '单体', castRange: 10 } });
  const might = skill({ name: 'might', type: '[增攻]', power: 20, range: { type: '单体', castRange: 10 } });
  const cannon = skill({ name: 'cannon', type: '[伤害]', power: 30, range: { type: '单体', castRange: 10 }, extra: { charge: 2 } });

  // 01 合法性复用：AI 落点 + 声明技能经真实 queryAttack 可组合命中
  {
    const scene = sceneOf(16, 10);
    const units = [mkUnit('h', 'hero', { hp: 100 }), mkUnit('e', 'enemy', { hp: 100 })];
    const ctx = makeCtx(m, scene, units, { h: { col: 3, row: 3 }, e: { col: 10, row: 3 } });
    const plan = ai.chooseEnemyAction(ctx, 'e', 6, [claw]);
    const moved = cloneWith(ctx, 'e', plan.moveTo ? plan.moveTo.col : 10, plan.moveTo ? plan.moveTo.row : 3);
    const q = plan.skill ? range.queryAttack(moved, 'e', claw, plan.aim) : null;
    cases.push(ok('TT-AI-01 AI落位与真实查询可组合（攻击位命中合法）',
      !!plan.moveTo && plan.moveTo.col === 4 && plan.moveTo.row === 3
      && !!plan.skill && plan.skill.name === 'claw' && plan.aim && plan.aim.targetId === 'h'
      && !!q && q.ok === true && q.damageTargetIds.includes('h'),
      j({ plan, ok: q && q.ok, dmg: q && q.damageTargetIds })));
  }

  // 02 仅可见敌人：不可见近敌被忽略，改打可见远敌
  {
    const scene = sceneOf(16, 10);
    const units = [mkUnit('near', 'hero', { hp: 100 }), mkUnit('far', 'hero', { hp: 100 }), mkUnit('e', 'enemy', { hp: 100 })];
    const ctx = makeCtx(m, scene, units, { near: { col: 4, row: 3 }, far: { col: 8, row: 3 }, e: { col: 10, row: 3 } }, {
      canSeeUnit: (obs, tgt) => tgt === 'far',
    });
    const plan = ai.chooseEnemyAction(ctx, 'e', 6, [claw]);
    cases.push(ok('TT-AI-02 不可见近敌不评分，AI改打可见远敌',
      !!plan.skill && plan.skill.name === 'claw' && plan.aim && plan.aim.targetId === 'far'
      && !!plan.moveTo && plan.moveTo.col === 9 && plan.moveTo.row === 3,
      j(plan)));

    const blind = makeCtx(m, scene, units, { near: { col: 4, row: 3 }, far: { col: 8, row: 3 }, e: { col: 10, row: 3 } }, {
      canSeeUnit: () => false,
    });
    const hold = ai.chooseEnemyAction(blind, 'e', 6, [claw]);
    cases.push(ok('TT-AI-02 全不可见时守位等待，不追踪隐藏目标',
      !hold.moveTo && !hold.skill && hold.action === 'wait', j(hold)));
  }

  // 03 浓雾离场：跨预算请求冲刺；预算足够则移出；出雾后下一轮可再攻击
  {
    const scene = sceneOf(20, 12);
    const fog = { type: 'fog', center: { x: 3.5, y: 5.5 }, radius: 2.5, strength: 50, endAt: null, casterId: 'mob', sourceKey: 'fog-1' };
    const units = [mkUnit('h', 'hero', { hp: 100 }), mkUnit('e', 'enemy', { hp: 100 })];
    const base = { h: { col: 0, row: 3 }, e: { col: 3, row: 5 } };
    const ctx = makeCtx(m, scene, units, base, { regions: [fog], canSeeUnit: () => true });

    const sprint = ai.chooseEnemyAction(ctx, 'e', 1, [claw], null, { main: 1, aux: 1, preparing: null });
    cases.push(ok('TT-AI-03 浓雾无邻接敌人且出口跨预算时请求冲刺',
      sprint.action === 'sprint' && !sprint.skill, j(sprint)));

    const walk = ai.chooseEnemyAction(ctx, 'e', 3, [claw], null, { main: 1, aux: 1, preparing: null });
    const outside = !!walk.moveTo && !((walk.moveTo.col - 3.5) ** 2 + (walk.moveTo.row - 5.5) ** 2 <= 2.5 * 2.5 + 1e-9);
    cases.push(ok('TT-AI-03 预算足够时移动到雾外合法落点',
      !!walk.moveTo && !walk.skill && outside, j(walk)));

    if (walk.moveTo) {
      const outCtx = makeCtx(m, scene, units, { h: { col: 0, row: 3 }, e: { col: walk.moveTo.col, row: walk.moveTo.row } }, { regions: [fog], canSeeUnit: () => true });
      const attack = ai.chooseEnemyAction(outCtx, 'e', 0, [claw], null, { main: 1, aux: 1, preparing: null });
      cases.push(ok('TT-AI-03 出雾后剩余主行动可再攻击邻接敌人',
        !!attack.skill && attack.skill.name === 'claw' && attack.aim && attack.aim.targetId === 'h',
        j({ exit: walk.moveTo, attack })));
    } else {
      cases.push(ok('TT-AI-03 出雾后剩余主行动可再攻击邻接敌人', false, '未取得出雾落点'));
    }

    const noMain = ai.chooseEnemyAction(ctx, 'e', 1, [claw], null, { main: 0, aux: 1, preparing: null });
    cases.push(ok('TT-AI-03 主行动为0时不得冲刺', noMain.action !== 'sprint', j(noMain)));
  }

  // 04 纯减益：无 damageTargetIds，仍按 slotTargets 生成合法候选
  {
    const scene = sceneOf(14, 10);
    const units = [mkUnit('h', 'hero', { hp: 100 }), mkUnit('e', 'enemy', { hp: 100 })];
    const ctx = makeCtx(m, scene, units, { h: { col: 6, row: 3 }, e: { col: 2, row: 3 } });
    const plan = ai.chooseEnemyAction(ctx, 'e', 0, [sunder]);
    const q = range.queryAttack(ctx, 'e', sunder, plan.aim || { x: 6.5, y: 3.5, targetId: 'h' });
    cases.push(ok('TT-AI-04 纯减益技能按实际槽目标生成候选（damageTargetIds为空）',
      !!plan.skill && plan.skill.name === 'sunder' && plan.aim && plan.aim.targetId === 'h'
      && Array.isArray(q.damageTargetIds) && q.damageTargetIds.length === 0
      && (q.slotTargets || []).some(st => st.side === 'enemy' && (st.targetIds || []).includes('h')),
      j({ plan, dmg: q.damageTargetIds, slots: q.slotTargets })));
  }

  // 05 治疗：缺血才选；满血不选
  {
    const scene = sceneOf(16, 10);
    const hurt = [mkUnit('e', 'enemy', { hp: 100 }), mkUnit('a', 'enemy', { hp: 40, maxHp: 100 })];
    const ctxHurt = makeCtx(m, scene, hurt, { e: { col: 2, row: 5 }, a: { col: 3, row: 5 } });
    const heal = ai.chooseEnemyAction(ctxHurt, 'e', 0, [mend]);
    cases.push(ok('TT-AI-05 队友缺血时优先治疗',
      !!heal.skill && heal.skill.name === 'mend' && heal.aim && heal.aim.targetId === 'a', j(heal)));

    const full = [mkUnit('e', 'enemy', { hp: 100 }), mkUnit('a', 'enemy', { hp: 100, maxHp: 100 })];
    const ctxFull = makeCtx(m, scene, full, { e: { col: 2, row: 5 }, a: { col: 3, row: 5 } });
    const noHeal = ai.chooseEnemyAction(ctxFull, 'e', 0, [mend]);
    cases.push(ok('TT-AI-05 满血时不刷治疗', !noHeal.skill && noHeal.action === 'wait', j(noHeal)));
  }

  // 06 同源增益不反复刷：已存在同源（含父道具前缀）则跳过
  {
    const scene = sceneOf(16, 10);
    const units = [mkUnit('e', 'enemy', { hp: 100 }), mkUnit('a', 'enemy', { hp: 100, maxHp: 100 })];
    const clean = makeCtx(m, scene, units, { e: { col: 2, row: 5 }, a: { col: 3, row: 5 } });
    const buffPlan = ai.chooseEnemyAction(clean, 'e', 0, [might]);
    cases.push(ok('TT-AI-06 无增益时给出增益候选',
      !!buffPlan.skill && buffPlan.skill.name === 'might', j(buffPlan)));

    const buffed = makeCtx(m, scene, units, { e: { col: 2, row: 5 }, a: { col: 3, row: 5 } }, {
      buffsOf: id => [{ type: 'atk', value: 50, _source: { skillId: id === 'a' ? '圣物\u0000bless' : 'might' } }],
    });
    const itemSkill = skill({ name: 'bless', type: '[增攻]', power: 20, range: { type: '单体', castRange: 10 }, extra: { isItem: true, parentItemName: '圣物' } });
    const itemPlan = ai.chooseEnemyAction(buffed, 'e', 0, [itemSkill]);
    cases.push(ok('TT-AI-06 同源增益已生效时不再施放（父道具前缀同源）',
      !itemPlan.skill && itemPlan.action === 'wait', j(itemPlan)));
  }

  // 07 蓄力技能 → prepare 动作
  {
    const scene = sceneOf(16, 10);
    const units = [mkUnit('h', 'hero', { hp: 100 }), mkUnit('e', 'enemy', { hp: 100 })];
    const ctx = makeCtx(m, scene, units, { h: { col: 6, row: 5 }, e: { col: 2, row: 5 } });
    const plan = ai.chooseEnemyAction(ctx, 'e', 0, [cannon], null, { main: 1, aux: 1, preparing: null });
    cases.push(ok('TT-AI-07 蓄力技能生成候选并声明 prepare',
      !!plan.skill && plan.skill.name === 'cannon' && plan.action === 'prepare', j(plan)));
  }

  // 08 无感知/空 regions 兼容：旧接近行为不变
  {
    const scene = sceneOf(16, 10);
    const units = [mkUnit('h', 'hero', { hp: 100 }), mkUnit('e', 'enemy', { hp: 100 })];
    const ctx = makeCtx(m, scene, units, { h: { col: 3, row: 3 }, e: { col: 10, row: 3 } });
    const plan = ai.chooseEnemyAction(ctx, 'e', 2, [claw]);
    cases.push(ok('TT-AI-08 空regions无perception时保持旧接近（额度内前进不攻击）',
      !plan.skill && !!plan.moveTo && plan.moveTo.col === 8 && plan.moveTo.row === 3, j(plan)));
  }

  // 09 贴身且无可用收益 → 防御
  {
    const scene = sceneOf(12, 10);
    const units = [mkUnit('h', 'hero', { hp: 100 }), mkUnit('e', 'enemy', { hp: 100 })];
    const ctx = makeCtx(m, scene, units, { h: { col: 3, row: 5 }, e: { col: 2, row: 5 } });
    const plan = ai.chooseEnemyAction(ctx, 'e', 0, []);
    cases.push(ok('TT-AI-09 贴身无可用技能时选择防御',
      !plan.moveTo && !plan.skill && plan.action === 'defend', j(plan)));
  }

  return { cases };
}

export const groups = { 'TT-AI': { run: deps => run(deps) } };

if (typeof process !== 'undefined' && process.argv && process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('typical-ai-node-cases.mjs')) {
  const { cases } = await run({});
  for (const c of cases) console.log((c.pass ? 'PASS ' : 'FAIL ') + c.id + (c.pass ? '' : ' :: ' + c.detail));
  const failed = cases.filter(c => c.pass !== true).length;
  console.log('[TT-AI] cases=' + cases.length + ' passed=' + (cases.length - failed) + ' failed=' + failed);
  if (!cases.length || failed > 0) process.exit(1);
}
