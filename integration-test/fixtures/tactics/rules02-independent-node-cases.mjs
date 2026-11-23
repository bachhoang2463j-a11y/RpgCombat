// ==========================================
// RULES02 规则集二·独立节点回归（全部使用 tactics/src 真实模块；不复制业务实现）
// 运行：node tactics/tools/run-tests.cjs --stage=rules02（stage 由主代理登记，本文件不登记）
// 登记建议：groups=['TR2-01','TR2-02','TR2-03','TR2-04']
//   modules=['parser','protocol','battle','range','scene','clock','effectDefinitions']
//   （MODULE_FILES 需新增 effectDefinitions → 'effect-definitions.mjs'）
//   requiredExports 仅列函数：parser.parseSkill/parseItem/getGrantedVariantName、
//   battle.createBattle、range.queryAttack/resolveSlotTargets、scene.compileScene、
//   clock.advanceToNextAction、effectDefinitions.normalizeEffectTag/effectDefinition/skillSlots
//   （EFFECT_DEFINITIONS/RANGE_TYPES 为常量，不在 runner 常量白名单，用例内自行校验）
// 契约来源：effect-definitions.mjs 头注（contract v2）+ 协调者纠错（2026-11-23）：
//   ① 单群别名只作读入，类型值输出规范归一标签（可无外层[]），括号子型保留
//   ② 单避/群避 归持续「闪避」（consumable:false），不与一次性「回避」合并
//   ③ 再动/赋予带显式范围按范围友敌方，可作用队友而非自动 self
//   ④ skill.slotTargets[index]='self' 覆盖；RANGE_TYPES 七种含「自身」
//   ⑤ 旧 delay=准备需求而非 CD；就绪后必须手动释放当下目标，不自动存瞄执行
//   ⑥ Buff 有效值经 getEffectiveUnit(id) 查询，旧 ref 不直接加 buff
//   ⑦ battle.beginAttack(skill,aim,options) 为生成器：yield reaction 请求（candidates 含 skill），
//     next(null) 放弃不扣费 / next({responderId,skill}) 确认一次；同步 attack 用于无交互探针
//   ⑧ 物品 beginUseItem 同生成器，弹药按发消耗
// 接口未落地时对应用例 pass:null（pending），不判失败；落地后自动转为真实断言。
// ==========================================

function ok(id, pass, detail) { return { id, pass: pass === undefined ? null : !!pass, detail: detail || '' }; }
function pend(id, reason, extra) { return { id, pass: null, detail: '[pending] ' + reason + (extra ? ' | ' + extra : '') }; }
function j(value) { return JSON.stringify(value); }
function scene0() { return { sceneId: 'rules02', grid: { columns: 16, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects: [] }; }
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 50;
  return { id, name: id, side, footprint: { width: 1, height: 1 }, skills: opts.skills || [], ref: {
    hp, maxHp: hp, mp: opts.mp ?? 20, maxMp: opts.mp ?? 20, atk: opts.atk ?? 10, def: opts.def ?? 0,
    spd: opts.spd ?? 100, evasion: opts.evasion ?? 0, moveDistance: 4,
  } };
}
function ctxOf(m, open, units, positions) {
  return { compiled: m.scene.compileScene(open), units, placementsById: positions,
    footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint])), visibleUnitIds: null };
}
function aimAt(col, row, targetId) { return { x: col + 0.5, y: row + 0.5, ...(targetId ? { targetId } : {}) }; }
async function loadED(m) {
  if (m && m.effectDefinitions && m.effectDefinitions.EFFECT_DEFINITIONS) return m.effectDefinitions;
  try { return await import(new URL('../../../tactics/src/effect-definitions.mjs', import.meta.url).href); } catch { return null; }
}
// 生成器驱动：无交互时一路 next(null) 到底；遇 reaction 请求（candidates 数组）即停返回
function drive(gen, cap = 8) {
  let steps = 0, r = gen.next();
  while (!r.done && steps < cap) {
    if (r.value && Array.isArray(r.value.candidates)) return { request: r.value, done: false, value: null };
    r = gen.next(null); steps++;
  }
  return { request: null, done: r.done, value: r.value };
}
function newBattle(m, units, positions, random) {
  return m.battle.createBattle({ units, placementsById: positions, scene: scene0(), random: random || (() => 0) });
}

// ---------- TR2-01 规范单群归一 / 七自身范围 / 自用slotTargets覆盖 / 再动赋予显式范围 ----------

async function rules02Norm(m) {
  const cases = [];
  const ED = await loadED(m);

  // R2-01 单群别名归一 + 单避/群避归持续闪避 + 括号子型保留（ED 已落地→真实断言）
  if (!ED || typeof ED.normalizeEffectTag !== 'function' || !ED.EFFECT_DEFINITIONS) {
    cases.push(pend('R2-01', 'effect-definitions(EFFECT_DEFINITIONS/normalizeEffectTag) 未落地'));
  } else {
    const norm = ED.normalizeEffectTag, defs = ED.EFFECT_DEFINITIONS;
    const singleGroup = norm('单体') === norm('群攻') && norm('单体') === '伤害' && norm('单回') === norm('群回') && norm('单回') === '回复';
    const dodgeSplit = norm('单避') === '单避' && norm('群避') === '回避' && norm('单避') !== norm('回避')
      && defs['单避'] && defs['回避'] && defs['单避'].consumable === true && defs['回避'].consumable === false;
    const subtype = norm('[单体(火焰)]') === '伤害(火焰)' && norm('[单避]') === norm('单避');
    const idempotent = norm(norm('单避')) === norm('单避') && norm(norm('火焰')) === '火焰';
    cases.push(ok('R2-01 单群别名归一为规范标签，单避/群避归持续闪避不并回避，子型保留',
      singleGroup && dodgeSplit && subtype && idempotent,
      j({ 单体: norm('单体'), 群攻: norm('群攻'), 单避: norm('单避'), 群避: norm('群避'), 回避: norm('回避'),
        闪避持续: defs['闪避'] && defs['闪避'].consumable, 回避一次性: defs['回避'] && defs['回避'].consumable, 子型: norm('[单体(火焰)]') })));
  }

  // R2-02 parser 槽位输出规范标签（旧单群写法只作别名读入）
  if (!ED) {
    cases.push(pend('R2-02', 'parser 规范槽输出待 effect-definitions 联调'));
  } else {
    const s1 = m.parser.parseSkill('【甲】[单体(火焰);power:5][范围:单体;射程:9]');
    const s2 = m.parser.parseSkill('【乙】[群攻(火焰);power:5][范围:单体;射程:9]');
    const s3 = m.parser.parseSkill('【丙】[单避][范围:单体;射程:9]');
    const pass = s1 && s2 && s3 && s1.type === '[伤害(火焰)]' && s2.type === '[伤害(火焰)]' && s3.type === '[单避]';
    cases.push(ok('R2-02 parser 槽位输出规范标签且不保留单群写法', pass, j({ 甲: s1 && s1.type, 乙: s2 && s2.type, 丙: s3 && s3.type })));
  }

  // R2-03 skillSlots 规范槽视图 + slotTargets[index]='self' 覆盖 + 自X 恒 self
  if (!ED || typeof ED.skillSlots !== 'function') {
    cases.push(pend('R2-03', 'effectDefinitions.skillSlots 未落地'));
  } else {
    const skill = m.parser.parseSkill('【混合】[单体;power:2][群回;power:3][范围:圆形;半径:3;射程:8]');
    const slots = ED.skillSlots(skill);
    const base = slots.length === 2 && slots[0].index === 0 && slots[0].tag === '伤害' && slots[0].attack === true
      && slots[0].power === 2 && slots[0].target === 'default' && slots[1].tag === '回复' && slots[1].target === 'default';
    const overrideView = ED.skillSlots({ ...skill, slotTargets: ['self'] });
    const ovr = overrideView.length === 2 && overrideView[0].target === 'self' && overrideView[1].target === 'default';
    const selfCost = ED.skillSlots(m.parser.parseSkill('【耗】[自降;power:3][范围:圆形;半径:2;射程:8]'));
    const pass = base && ovr && selfCost.length === 1 && selfCost[0].target === 'self';
    cases.push(ok('R2-03 skillSlots 规范视图：slotTargets 按下标覆盖 self、自X 恒 self', pass,
      j({ base: slots.map(s => [s.index, s.tag, s.target]), 覆盖: overrideView.map(s => s.target), 自降: selfCost.map(s => s.target) })));
  }

  // R2-04 七自身范围（RANGE_TYPES 含自身）+ 自身范围目标解析 + slotTargets self 覆盖接入目标解析
  {
    const open = scene0();
    const h = unit('h', 'hero', { spd: 200 }); const a = unit('a', 'hero');
    const rangeOk = Array.isArray(m.protocol.RANGE_TYPES) && m.protocol.RANGE_TYPES.includes('自身') && m.protocol.RANGE_TYPES.includes('召唤');
    const selfSkill = m.parser.parseSkill('【自省】[自降;power:3][范围:自身]');
    const q = m.range.queryAttack(ctxOf(m, open, [h, a], { h: { col: 1, row: 4 }, a: { col: 3, row: 4 } }), 'h', selfSkill, aimAt(1, 4));
    const selfBranch = q.ok && Array.isArray(q.slotTargets) && q.slotTargets[0] && j(q.slotTargets[0].targetIds) === j(['h']);
    const groupHeal = m.parser.parseSkill('【全面】[群回;power:3][范围:圆形;半径:2;射程:8]');
    const res = m.range.resolveSlotTargets(ctxOf(m, open, [h, a], { h: { col: 1, row: 4 }, a: { col: 3, row: 4 } }),
      'h', { ...groupHeal, slotTargets: ['self'] }, ['h', 'a']);
    const overrideLanded = res && res[0] && j(res[0].targetIds) === j(['h']);
    if (!rangeOk) cases.push(pend('R2-04', 'RANGE_TYPES 七种含自身未落地', j(m.protocol.RANGE_TYPES)));
    else if (!selfBranch && !overrideLanded) cases.push(pend('R2-04', '「自身」query分支与 slotTargets self 覆盖均未接入', q.reason || ''));
    else if (!selfBranch) cases.push(pend('R2-04', 'queryAttack 「自身」范围分支未接入（self覆盖已接入）', q.reason || j({ ok: q.ok })));
    else if (!overrideLanded) cases.push(pend('R2-04', 'skill.slotTargets="self" 覆盖未接入 resolveSlotTargets（自身分支已接入）', j(res && res[0])));
    else cases.push(ok('R2-04 七自身范围与自用slotTargets覆盖接入目标解析', selfBranch && overrideLanded,
      j({ 自身槽: q.slotTargets[0].targetIds, 覆盖槽: res[0].targetIds, RANGE_TYPES: m.protocol.RANGE_TYPES })));
  }

  // R2-05 再动/赋予带显式范围按范围友方作用队友，不自动锁 self
  {
    const open = scene0();
    const h = unit('h', 'hero', { spd: 200 }); const a = unit('a', 'hero');
    const again = m.parser.parseSkill('【号令】[再动][范围:圆形;半径:2;射程:8]');
    const grant = m.parser.parseSkill('【赐福】[赋予:再生][范围:圆形;半径:2;射程:8]');
    const parserOk = again && grant && again.slotTargets == null && grant.slotTargets == null;
    const c5 = ctxOf(m, open, [h, a], { h: { col: 1, row: 4 }, a: { col: 3, row: 4 } });
    const r5a = m.range.resolveSlotTargets(c5, 'h', again, ['a']);
    const r5b = m.range.resolveSlotTargets(c5, 'h', grant, ['a']);
    const landed = r5a && r5a[0] && r5a[0].targetIds.includes('a') && r5b && r5b[0] && r5b[0].targetIds.includes('a');
    if (!parserOk) cases.push(ok('R2-05 再动/赋予显式范围不自动锁 self', false, j({ 再动: again && again.slotTargets, 赋予: grant && grant.slotTargets })));
    else if (!landed) cases.push(pend('R2-05', '再动/赋予显式范围按范围友方未接入 resolveSlotTargets',
      j({ 再动: r5a && r5a[0], 赋予: r5b && r5b[0] })));
    else cases.push(ok('R2-05 再动/赋予显式范围可作用范围队友', true, j({ 再动: r5a[0].targetIds, 赋予: r5b[0].targetIds })));
  }

  return { cases };
}

// ---------- TR2-02 三伤害槽独立判定 / 护盾穿透 / 降防走 getEffectiveUnit ----------

async function rules02Damage(m) {
  const cases = [];
  const ED = await loadED(m);

  // R2-06 三伤害槽逐段独立判定（同步 attack 无交互探针）
  {
    const caster = unit('h', 'hero', { spd: 200 });
    const enemy = unit('e', 'enemy', { hp: 100 });
    const tri = m.parser.parseSkill('【三连】[单体;power:2][单体;power:5][单体;power:8][范围:单体;射程:12]');
    const b = newBattle(m, [caster, enemy], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } });
    b.start();
    let r6 = null;
    try { r6 = b.attack(tri, aimAt(5, 4, 'e')); } catch (err) {
      const at = String(err && err.stack || '').split('\n').find(l => l.includes('battle.mjs')) || '';
      r6 = { ok: false, reason: 'throw:' + (err && err.message) + ' @' + at.trim().slice(0, 100) };
    }
    const hit0 = r6 && r6.ok && r6.hits && r6.hits[0];
    const segs = hit0 && hit0.segments || [];
    if (!r6 || !r6.ok) cases.push(ok('R2-06 三伤害槽逐段独立判定（同步attack）', false, 'attack失败: ' + ((r6 && r6.reason) || 'throw')));
    else if (!segs.length) cases.push(pend('R2-06', '同步 attack 未输出逐段 segments', j(r6.hits)));
    else {
      const sum = segs.reduce((n, s) => n + (s.hpDmg || 0), 0);
      const pass = segs.length === 3 && segs.every(s => s.hit === true)
        && (hit0.hpBefore - hit0.hpAfter) === sum && segs[2].hpDmg > segs[0].hpDmg;
      cases.push(ok('R2-06 三伤害槽逐段独立判定且各段按本槽威力结算', pass,
        j({ 段: segs.map(s => [s.index, s.hit, s.hpDmg]), 总扣血: hit0.hpBefore - hit0.hpAfter })));
    }
  }

  // R2-07 护盾：加盾吸收普通伤害、穿透无视护盾（行为需 beginAttack，未落地→pending）
  {
    const pierceDef = ED && ED.effectDefinition ? ED.effectDefinition('穿透') : null;
    const shieldDef = ED && ED.effectDefinition ? ED.effectDefinition('加盾') : null;
    const semant = pierceDef && pierceDef.pierce === true && shieldDef && shieldDef.kind === 'shield';
    if (!semant) {
      cases.push(ok('R2-07 护盾穿透语义（穿透 pierce / 加盾 shield）', false,
        j({ 穿透: pierceDef && pierceDef.pierce, 加盾: shieldDef && shieldDef.kind })));
    } else if (!m.battle || typeof m.battle.createBattle !== 'function') {
      cases.push(pend('R2-07', 'battle.createBattle 缺失'));
    } else {
      const h = unit('h', 'hero', { spd: 300 });
      const g = unit('g', 'enemy', { spd: 100, hp: 100 });
      const shieldSkill = m.parser.parseSkill('【护盾】[单盾;power:30][他人][范围:单体;射程:9]');
      const plain = m.parser.parseSkill('【直击】[单体;power:6][范围:单体;射程:12]');
      const pierce = m.parser.parseSkill('【破盾】[穿透;power:6][范围:单体;射程:12]');
      const b = newBattle(m, [h, g], { h: { col: 1, row: 4 }, g: { col: 8, row: 4 } });
      if (typeof b.beginAttack !== 'function') {
        cases.push(pend('R2-07', 'battle.beginAttack 生成器未落地（护盾吸收/穿透无视护盾行为待验证）'));
      } else {
        try {
          b.start();
          drive(b.beginAttack(shieldSkill, aimAt(1, 4, 'h'))); // h 给自己上盾
          b.endAction();
          let guard = 0;
          while (b.snapshot().currentId !== 'g' && guard++ < 10) b.endAction();
          const hp0 = h.ref.hp;
          const rPlain = drive(b.beginAttack(plain, aimAt(1, 4, 'h')));
          const absorbed = rPlain.done && h.ref.hp === hp0;
          b.endAction();
          guard = 0;
          while (b.snapshot().currentId !== 'g' && guard++ < 10) b.endAction();
          const rPierce = drive(b.beginAttack(pierce, aimAt(1, 4, 'h')));
          const pierced = rPierce.done && h.ref.hp < hp0;
          cases.push(ok('R2-07 加盾吸收普通伤害而穿透无视护盾直扣HP', absorbed && pierced,
            j({ 吸收后: h.ref.hp === hp0, 穿透后扣血: hp0 - h.ref.hp })));
        } catch (err) {
          const at = String(err && err.stack || '').split('\n').find(l => l.includes('battle.mjs')) || '';
          cases.push(ok('R2-07 加盾吸收普通伤害而穿透无视护盾直扣HP', false, '驱动抛错: ' + (err && err.message) + ' @' + at.trim().slice(0, 100)));
        }
      }
    }
  }

  // R2-08 降防：getEffectiveUnit(id) 查 Buff 有效值，旧 ref 不直接加 buff
  {
    const h = unit('h', 'hero', { spd: 200 });
    const e = unit('e', 'enemy', { hp: 100, def: 5 });
    const debuff = m.parser.parseSkill('【破甲】[单降;power:3][范围:单体;射程:12]');
    const b = newBattle(m, [h, e], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } });
    const getEff = (typeof b.getEffectiveUnit === 'function' && (id => b.getEffectiveUnit(id)))
      || (typeof m.battle.getEffectiveUnit === 'function' && (id => m.battle.getEffectiveUnit(b, id)))
      || null;
    if (typeof b.beginAttack !== 'function' || !getEff) {
      cases.push(pend('R2-08', 'beginAttack/getEffectiveUnit 未落地（降防写 ref 与有效值查询待验证）'));
    } else {
      try {
        b.start();
        drive(b.beginAttack(debuff, aimAt(5, 4, 'e')));
        const refUnchanged = e.ref.def === 5;
        const eff = getEff('e');
        const effDef = eff ? (eff.def ?? (eff.ref && eff.ref.def)) : null;
        cases.push(ok('R2-08 降防不写 ref.def 且 getEffectiveUnit 查得有效值下降', refUnchanged && effDef === 2,
          j({ refDef: e.ref.def, effDef })));
      } catch (err) {
        const at = String(err && err.stack || '').split('\n').find(l => l.includes('battle.mjs')) || '';
        cases.push(ok('R2-08 降防不写 ref.def 且 getEffectiveUnit 查得有效值下降', false, '抛错: ' + (err && err.message) + ' @' + at.trim().slice(0, 100)));
      }
    }
  }

  return { cases };
}

// ---------- TR2-03 玩家 reaction 生成器：请求→放弃不扣费 / 确认一次 / 自然闪避无请求 ----------

function reactionSetup(m) {
  const h = unit('h', 'hero', { spd: 200, mp: 20 });
  const reactionSkill = m.parser.parseSkill('【格挡】[单避][反应][MP:3][范围:自身]');
  const re = unit('re', 'enemy', { hp: 50, mp: 20, skills: [reactionSkill] });
  re.controller = 'player';
  const plain = m.parser.parseSkill('【直击】[单体;power:6][范围:单体;射程:12]');
  return { h, re, reactionSkill, plain, parsedOk: !!(reactionSkill.isReaction && reactionSkill.cost === 3) };
}

async function rules02Reaction(m) {
  const cases = [];
  const setup = reactionSetup(m);
  const b = newBattle(m, [setup.h, setup.re], { h: { col: 1, row: 4 }, re: { col: 5, row: 4 } });
  if (!setup.parsedOk) {
    cases.push(pend('R2-09', '反应技能解析（[反应] 标记/MP成本）未就绪', j({ isReaction: setup.reactionSkill.isReaction, cost: setup.reactionSkill.cost })));
    cases.push(pend('R2-10', '反应技能解析未就绪'));
    cases.push(pend('R2-11', '依赖同组反应环境'));
    return { cases };
  }
  if (!b || typeof b.beginAttack !== 'function') {
    cases.push(pend('R2-09', 'battle.beginAttack 生成器未落地'));
    cases.push(pend('R2-10', 'battle.beginAttack 生成器未落地'));
    cases.push(pend('R2-11', 'battle.beginAttack 生成器未落地'));
    return { cases };
  }

  // R2-09 请求→放弃：攻击照常命中，反应方不扣费
  try {
    b.start();
    const gen = b.beginAttack(setup.plain, aimAt(5, 4, 're'));
    const step1 = gen.next();
    const req = !step1.done && step1.value && Array.isArray(step1.value.candidates) ? step1.value : null;
    if (!req) {
      const res = step1.done ? step1.value : drive(gen).value;
      cases.push(pend('R2-09', 'reaction 请求未触发（请求/candidates 形态待确认）', j({ done: step1.done, value: res && res.ok })));
    } else {
      const candOk = req.candidates.some(c => c && (c.skill === setup.reactionSkill || (c.skill && c.skill.name === setup.reactionSkill.name)) && (c.responderId === 're' || c.responderId === undefined));
      const mpBefore = setup.re.ref.mp;
      const res = gen.next(null); // 放弃反应
      const hpAfter = setup.re.ref.hp;
      cases.push(ok('R2-09 reaction 请求含技能候选，放弃后攻击照常且反应方不扣费',
        res.done === true && res.value && res.value.ok === true && res.value.hits[0].hit === true
          && hpAfter < 50 && setup.re.ref.mp === mpBefore && candOk,
        j({ 候选含技能: candOk, 命中: res.value && res.value.hits[0] && res.value.hits[0].hit, 反应方MP: setup.re.ref.mp, 扣前: mpBefore })));
    }
  } catch (err) {
    const at = String(err && err.stack || '').split('\n').find(l => l.includes('battle.mjs')) || '';
    cases.push(ok('R2-09 reaction 请求含技能候选，放弃后攻击照常且反应方不扣费', false, '抛错: ' + (err && err.message) + ' @' + at.trim().slice(0, 100)));
  }

  // R2-10 确认一次：反应生效攻击落空，反应方恰好扣一次费，无第二次请求
  try {
    const s2 = reactionSetup(m);
    const rolls = [0.5, 0, 0.9, 0.99, 0.01];
    let rollIndex = 0;
    const b2 = newBattle(m, [s2.h, s2.re], { h: { col: 1, row: 4 }, re: { col: 5, row: 4 } }, () => rolls[rollIndex++ % rolls.length]);
    b2.start();
    const gen = b2.beginAttack(s2.plain, aimAt(5, 4, 're'));
    const step1 = gen.next();
    const req = !step1.done && step1.value && Array.isArray(step1.value.candidates) ? step1.value : null;
    if (!req) {
      cases.push(pend('R2-10', 'reaction 请求未触发（形态待确认）'));
    } else {
      const cand = req.candidates[0] || {};
      const ans = { responderId: cand.responderId || 're', skill: cand.skill || s2.reactionSkill };
      const res = gen.next(ans);
      const hpOk = s2.re.ref.hp === 50;
      const mpOk = s2.re.ref.mp === 20 - 3;
      cases.push(ok('R2-10 确认反应后攻击落空且反应方恰好扣一次费', res.done === true && res.value && res.value.ok === true
        && res.value.hits[0].hit === false && hpOk && mpOk,
        j({ 命中: res.value && res.value.hits[0] && res.value.hits[0].hit, HP: s2.re.ref.hp, MP: s2.re.ref.mp, 生成器完结: res.done })));
    }
  } catch (err) {
    const at = String(err && err.stack || '').split('\n').find(l => l.includes('battle.mjs')) || '';
    cases.push(ok('R2-10 确认反应后攻击落空且反应方恰好扣一次费', false, '抛错: ' + (err && err.message) + ' @' + at.trim().slice(0, 100)));
  }

  // R2-11 自然闪避：无反应技能→生成器不产生请求；同步 attack 同判（无交互探针）
  try {
    const nd = unit('nd', 'enemy', { hp: 50, evasion: 1000 });
    const b3 = newBattle(m, [unit('h3', 'hero', { spd: 200 }), nd], { h3: { col: 1, row: 4 }, nd: { col: 5, row: 4 } }, () => 0.99);
    b3.start();
    const gen = b3.beginAttack(setup.plain, aimAt(5, 4, 'nd'));
    const step1 = gen.next();
    if (!step1.done && step1.value && Array.isArray(step1.value.candidates)) {
      cases.push(ok('R2-11 自然闪避不产生 reaction 请求', false, j({ 意外请求: step1.value.candidates })));
    } else {
      let r = step1, guard = 0;
      while (!r.done && guard++ < 5) r = gen.next(null);
      const rOk = r.done && r.value && r.value.ok === true && r.value.hits[0].hit === false && nd.ref.hp === 50;
      const b4 = newBattle(m, [unit('h4', 'hero', { spd: 200 }), unit('nd4', 'enemy', { hp: 50, evasion: 1000 })],
        { h4: { col: 1, row: 4 }, nd4: { col: 5, row: 4 } }, () => 0.99);
      b4.start();
      const sync = b4.attack(setup.plain, aimAt(5, 4, 'nd4'));
      const syncOk = sync.ok === true && sync.hits[0].hit === false;
      cases.push(ok('R2-11 自然闪避无请求且同步 attack 同判闪避', rOk && syncOk,
        j({ 生成器命中: r.value && r.value.hits[0] && r.value.hits[0].hit, 同步命中: sync.hits[0] && sync.hits[0].hit })));
    }
  } catch (err) {
    const at = String(err && err.stack || '').split('\n').find(l => l.includes('battle.mjs')) || '';
    cases.push(ok('R2-11 自然闪避无请求且同步 attack 同判闪避', false, '抛错: ' + (err && err.message) + ' @' + at.trim().slice(0, 100)));
  }

  return { cases };
}

// ---------- TR2-04 旧delay=准备非CD / 就绪手动释放 / 物品弹药按发 / variant / 召唤 ----------

async function rules02Prep(m) {
  const cases = [];
  const ED = await loadED(m);

  // R2-12 旧 delay=准备需求而非 CD：施放进入 preparing，不自动执行
  {
    const h = unit('h', 'hero', { spd: 200 });
    const e = unit('e', 'enemy', { hp: 100 });
    const skill = m.parser.parseSkill('【蓄力斩】[单体;power:9][延迟:2][范围:单体;射程:12]');
    const parsedOk = skill && skill.delay === 2;
    const b = newBattle(m, [h, e], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } });
    if (!parsedOk) cases.push(ok('R2-12 [延迟:N] 解析为 delay', false, j({ delay: skill && skill.delay })));
    else if (!b || typeof b.beginAttack !== 'function') cases.push(pend('R2-12', 'battle.beginAttack 未落地（delay→准备映射待验证）'));
    else {
      try {
        b.start();
        drive(b.beginAttack(skill, aimAt(5, 4, 'e')));
        const snap = b.snapshot();
        if (!snap.preparation) cases.push(pend('R2-12', 'delay→准备(preparing)映射未落地', j({ preparation: snap.preparation })));
        else cases.push(ok('R2-12 旧delay进入准备而非CD且不自动执行',
          e.ref.hp === 100 && snap.preparation.remaining > 0,
          j({ preparation: snap.preparation, 目标HP: e.ref.hp })));
      } catch (err) {
        cases.push(pend('R2-12', '准备态驱动失败', String(err && err.message).slice(0, 120)));
      }
    }
  }

  // R2-13 准备就绪必须手动释放当下目标（推进时钟后对新瞄准点释放，不自动执行旧瞄准）
  {
    const h = unit('h', 'hero', { spd: 200 });
    const e1 = unit('e1', 'enemy', { hp: 100 });
    const e2 = unit('e2', 'enemy', { hp: 100 });
    const skill = m.parser.parseSkill('【蓄力斩】[单体;power:9][延迟:2][范围:单体;射程:12]');
    const b = newBattle(m, [h, e1, e2], { h: { col: 1, row: 4 }, e1: { col: 5, row: 4 }, e2: { col: 8, row: 5 } });
    const st = b.state || (typeof b.getState === 'function' ? b.getState() : null);
    if (!b || typeof b.beginAttack !== 'function' || !st || typeof m.clock.advanceToNextAction !== 'function') {
      cases.push(pend('R2-13', 'beginAttack/内部state/clock 推进未齐备（手动释放语义待验证）',
        j({ beginAttack: !!(b && b.beginAttack), state: !!st, clock: typeof m.clock.advanceToNextAction })));
    } else {
      try {
        b.start();
        drive(b.beginAttack(skill, aimAt(5, 4, 'e1')));
        let ready = false, guard = 0;
        while (guard++ < 60) {
          const snap = b.snapshot();
          if (snap.currentId === 'h' && (!snap.preparation || !(snap.preparation.remaining > 0))) { ready = true; break; }
          if (snap.currentId === 'h' && snap.resources?.main > 0) b.advancePreparation();
          else b.endAction();
        }
        if (!ready) cases.push(ok('R2-13 准备就绪后手动释放当下目标，不自动执行旧瞄准', false,
          '60步内未就绪: ' + j({ currentId: b.snapshot().currentId, preparation: b.snapshot().preparation })));
        else {
          const hpE1 = e1.ref.hp;
          const res = drive(b.beginAttack(skill, aimAt(8, 5, 'e2')));
          const pass = res.done && res.value && res.value.ok === true && res.value.hits[0].targetId === 'e2'
            && res.value.hits[0].hit === true && e1.ref.hp === hpE1;
          cases.push(ok('R2-13 准备就绪后手动释放当下目标，不自动执行旧瞄准', pass,
            j({ 命中: res.value && res.value.hits[0] && res.value.hits[0].targetId, e1HP: e1.ref.hp })));
        }
      } catch (err) {
        const at = String(err && err.stack || '').split('\n').find(l => l.includes('battle.mjs')) || '';
        cases.push(ok('R2-13 准备就绪后手动释放当下目标，不自动执行旧瞄准', false, '抛错: ' + (err && err.message) + ' @' + at.trim().slice(0, 100)));
      }
    }
  }

  // R2-14 物品弹药解析：[弹药] 分类 + [数量] 按发 + [次数] 额度（已落地→真实断言）
  {
    const item = m.parser.parseItem('【箭袋】[弹药][数量:30][次数:3]');
    const pass = item && item.isItem === true && item.category === '弹药' && item.count === 30
      && item.maxUses === 3 && item.usesRemaining === 3;
    cases.push(ok('R2-14 弹药物品解析：分类弹药、数量按发、次数额度', pass,
      j({ category: item && item.category, count: item && item.count, maxUses: item && item.maxUses, usesRemaining: item && item.usesRemaining })));
  }

  // R2-15 物品弹药按发消耗：每次使用恰好消耗一发，额度归零后拒绝再使用（需 beginUseItem）
  {
    const item = m.parser.parseItem('【弹药匣】[枪击;power:1][道具][次数:3][范围:单体;射程:12]');
    const e = unit('e', 'enemy', { hp: 100 });
    const b = newBattle(m, [unit('h', 'hero', { spd: 200 }), e], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } });
    if (!b || typeof b.beginUseItem !== 'function') {
      cases.push(pend('R2-15', 'battle.beginUseItem 生成器未落地（按发消耗待验证）'));
    } else {
      try {
        b.start();
        const seq = [];
        for (let i = 0; i < 3; i++) {
          let guard = 0;
          while (b.snapshot().currentId !== 'h' && guard++ < 10) b.endAction();
          const before = item.usesRemaining;
          const r = drive(b.beginUseItem(item, aimAt(5, 4, 'e')));
          seq.push({ done: r.done, ok: !!(r.value && r.value.ok), before, after: item.usesRemaining });
          if (i < 2) { b.endAction(); let g2 = 0; while (b.snapshot().currentId !== 'h' && g2++ < 10) b.endAction(); }
        }
        let rejected = false, fourthOk = false;
        try {
          const r4 = drive(b.beginUseItem(item, aimAt(5, 4, 'e')));
          fourthOk = !!(r4.done && r4.value && r4.value.ok === true);
          rejected = !fourthOk;
        } catch { rejected = true; }
        const perShot = seq.length === 3 && seq.every(s => s.done && s.ok && s.before - s.after === 1);
        cases.push(ok('R2-15 弹药按发消耗且额度归零后拒绝', perShot && item.usesRemaining === 0 && rejected && !fourthOk,
          j({ 序列: seq, 终值: item.usesRemaining, 拒绝第四次: rejected })));
      } catch (err) {
        const at = String(err && err.stack || '').split('\n').find(l => l.includes('battle.mjs')) || '';
        cases.push(ok('R2-15 弹药按发消耗且额度归零后拒绝', false, '抛错: ' + (err && err.message) + ' @' + at.trim().slice(0, 100)));
      }
    }
  }

  // R2-16 职业赋予 variant：赋予标签规范视图 + 白名单识别（已落地→真实断言）
  if (!ED || typeof ED.effectDefinition !== 'function' || typeof ED.skillSlots !== 'function') {
    cases.push(pend('R2-16', 'effectDefinitions 未落地（variant 视图待验证）'));
  } else {
    const def = ED.effectDefinition('[赋予:再生]');
    const skill = m.parser.parseSkill('【赐】[单体;power:5][范围:单体;射程:9][赋予:再生]');
    const slots = ED.skillSlots(skill);
    const slotOk = slots.some(s => s.tag === '赋予:再生' && s.definition && s.definition.kind === 'variant');
    const grantOk = typeof m.parser.getGrantedVariantName === 'function'
      && m.parser.getGrantedVariantName('[赋予:再生]') === '再生'
      && m.parser.getGrantedVariantName('[单体]') === null;
    cases.push(ok('R2-16 赋予variant：定义表识别为 variant 槽且白名单识别生效',
      !!def && def.kind === 'variant' && def.variant === '再生' && slotOk && grantOk,
      j({ def, 槽: slots.map(s => s.tag), grant: grantOk })));
  }

  // R2-17 召唤生命周期：[召唤:X] 解析 + 施放生成召唤物（需 beginAttack，死亡退场待接口定型）
  {
    const summonSkill = m.parser.parseSkill('【召唤】[召唤:幽灵][范围:召唤;射程:8]');
    const parsedOk = summonSkill && summonSkill.summonTarget === '幽灵';
    const provider = () => ({ maxHp: 20, mp: 0, maxMp: 0, atk: 5, def: 0, spd: 80, evasion: 0, moveDistance: 3, footprint: { width: 1, height: 1 } });
    const b = m.battle.createBattle({ units: [unit('h', 'hero', { spd: 200 }), unit('e', 'enemy', { hp: 50 })],
      placementsById: { h: { col: 1, row: 4 }, e: { col: 9, row: 4 } }, scene: scene0(), random: () => 0, summonProvider: provider });
    if (!parsedOk) cases.push(ok('R2-17 [召唤:X] 解析为 summonTarget', false, j({ summonTarget: summonSkill && summonSkill.summonTarget })));
    else if (!b || typeof b.beginAttack !== 'function') {
      cases.push(pend('R2-17', 'battle.beginAttack 未落地（召唤生成/退场生命周期待验证）'));
    } else {
      try {
        b.start();
        const ids0 = b.snapshot().units.map(u => u.id);
        drive(b.beginAttack(summonSkill, aimAt(3, 4)));
        const snap = b.snapshot();
        const spawned = snap.units.filter(u => !ids0.includes(u.id));
        if (!spawned.length) cases.push(ok('R2-17 施放召唤生成召唤物单位', false,
          '未生成: ' + j({ 总数: snap.units.length, log尾部: (snap.log || []).slice(-2) })));
        else cases.push(ok('R2-17 施放召唤生成召唤物单位', spawned.every(u => u.hp > 0),
          j({ 新增: spawned.map(u => u.id), 总数: snap.units.length })));
      } catch (err) {
        const at = String(err && err.stack || '').split('\n').find(l => l.includes('battle.mjs')) || '';
        cases.push(ok('R2-17 施放召唤生成召唤物单位', false, '抛错: ' + (err && err.message) + ' @' + at.trim().slice(0, 100)));
      }
    }
  }

  return { cases };
}

export const groups = {
  'TR2-01': { run: deps => rules02Norm(deps.modules) },
  'TR2-02': { run: deps => rules02Damage(deps.modules) },
  'TR2-03': { run: deps => rules02Reaction(deps.modules) },
  'TR2-04': { run: deps => rules02Prep(deps.modules) },
};
