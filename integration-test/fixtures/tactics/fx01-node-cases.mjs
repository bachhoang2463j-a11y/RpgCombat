// ==========================================
// FX01 埃利奥特首位角色移植用例：通用演出注册表（分发顺序/分级预算/无单技能特判）
// + 规则接线（多段攻击槽逐段结算、爆炸接触单位计入一次、回避错位、自身再动/加速、可用/拒绝清单）。
// 技能数据一律取真实 demo-fixture（典型对局原文 + 显式范围），不手搓近似技能。
// ==========================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
const j = v => JSON.stringify(v);
function rng(values = []) { let i = 0; return () => values[i++] ?? 0; }
function scene(objects = []) { return { sceneId: 'fx01', grid: { columns: 18, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects }; }
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 100;
  return { id, name: id, side, footprint: opts.footprint || { width: 1, height: 1 }, skills: opts.skills || [], ref: {
    hp, maxHp: opts.maxHp ?? hp, mp: opts.mp ?? 110, maxMp: 110, tp: opts.tp ?? 0, maxTp: 100,
    atk: opts.atk ?? 20, def: opts.def ?? 0, spd: opts.spd ?? 100, evasion: opts.evasion ?? 0,
    strength: 50, moveDistance: 6, totalWeight: 40,
  } };
}
function elliott(m) {
  const block = m.parser.parseYamlText(m.fixture.DEMO_YAML);
  return block.heroes.find(h => h.name === '埃利奥特');
}
const skillNamed = (hero, name) => hero.skills.find(s => s.name === name);
function battle(m, units, placements, random) { const b = m.battle.createBattle({ units, placementsById: placements, scene: scene(), random }); b.start(); return b; }
// 构造一次 battle.attack() 风格的提交结果，供注册表分发断言（只需 skill/query.shape/slotTargets/casterId）
function fakeResult(skill, shapeType, slotTargets, casterId = 'c') { return { ok: true, casterId, skill, query: { shape: { type: shapeType }, slotTargets }, hits: [] }; }

export const groups = {
  'TFX-01': { run({ modules: m }) {
    const cases = [];
    const { createFxRegistry, actionInput, reactionInput, checkBudget, GRADE_BUDGETS } = m.fxRegistry;
    const reg = m.fxLibrary.registerDefaultFx(createFxRegistry());
    const ell = elliott(m);
    const atkSlot = (i, tag) => ({ index: i, tag, side: 'enemy', scope: 'single', attack: true, targetIds: ['e'] });
    const savage = skillNamed(ell, '萨维奇三连发'), blast = skillNamed(ell, '压缩爆燃'), chant = skillNamed(ell, '预备咏唱');
    const arsenic = m.parser.parseSkill('【砷弹射击】[远程] [MP:4] [单体(枪击);power:16] [特效:砷弹射击] [范围:直线;长:10;宽:1]');
    const plain = m.parser.parseSkill('【柯尔特】[远程] [单体(枪击);power:14] [范围:单体;射程:15]');
    const fireSingle = m.parser.parseSkill('【火球】[法术] [单体(火焰);power:14] [特效:火焰01] [范围:单体;射程:10]');
    const resolved = {
      savage: reg.resolve(actionInput(fakeResult(savage, '单体', [atkSlot(0, savage.type), atkSlot(1, savage.type2), atkSlot(2, savage.type3)]))).id,
      blast: reg.resolve(actionInput(fakeResult(blast, '爆炸', [{ ...atkSlot(0, '[群攻]'), scope: 'area' }, { index: 1, tag: '[群燃烧]', side: 'enemy', scope: 'area', attack: false, targetIds: ['e'] }]))).id,
      chant: reg.resolve(actionInput(fakeResult(chant, '单体', [{ index: 0, tag: '[再动]', side: 'ally', scope: 'single', attack: false, targetIds: ['c'] }]))).id,
      arsenic: reg.resolve(actionInput(fakeResult(arsenic, '直线', [atkSlot(0, arsenic.type)]))).id,
      plain: reg.resolve(actionInput(fakeResult(plain, '单体', [atkSlot(0, plain.type)]))).id,
      fireSingle: reg.resolve(actionInput(fakeResult(fireSingle, '单体', [atkSlot(0, fireSingle.type)]))).id,
      zheYing: reg.resolve(reactionInput({ skillName: '折影步', fxTag: '折影步', canceled: true, shift: { distance: 2 } })).id,
      glide: reg.resolve(reactionInput({ skillName: '战壕格斗术', fxTag: null, canceled: true, shift: { distance: 2 } })).id,
      noShift: reg.resolve(reactionInput({ skillName: '战壕格斗术', fxTag: null, canceled: true, shift: null })),
    };
    cases.push(ok('TFX-01 分发：fxTag 精确优先，形状谓词收窄，效果槽谓词次之，兜底身份演出',
      resolved.savage === 'volley' && resolved.blast === 'fire-blast' && resolved.chant === 'self-boost' && resolved.arsenic === 'arsenic-shot' &&
      resolved.plain === 'identity' && resolved.fireSingle === 'identity' && resolved.zheYing === 'evade-shift-ghost' && resolved.glide === 'evade-shift' && resolved.noShift === null, j(resolved)));
    const graded = reg.list().filter(e => e.grade !== 'identity');
    const budgets = graded.map(e => ({ id: e.id, grade: e.grade, ...checkBudget(e) }));
    cases.push(ok('TFX-01 分级预算：全部分级条目时长/蓄势/全屏/暗场/峰值音量落在本级区间', graded.length >= 5 && budgets.every(b => b.ok), j(budgets)));
    const fake = checkBudget({ id: 'fake', grade: 'L3', timeline: { totalMs: 1000, chargeMs: 200 }, cues: [{ key: 'x', vol: 0.95 }] });
    cases.push(ok('TFX-01 预算核对能抓出违规（防假绿）', !fake.ok && fake.reasons.length >= 3, j(fake)));
    let dup = null, bad = null;
    try { reg.register({ id: 'volley', grade: 'L1', play() {} }); } catch (e) { dup = e.message; }
    try { createFxRegistry().register({ id: 'x', grade: 'L9', play() {} }); } catch (e) { bad = e.message; }
    cases.push(ok('TFX-01 重复 id 与未知分级注册即失败', /重复/.test(dup || '') && /未知演出分级/.test(bad || ''), j({ dup, bad })));
    const src = readFileSync(path.join(ROOT, 'tactics', 'src', 'action-director.mjs'), 'utf8');
    cases.push(ok('TFX-01 导演层无单技能特判（无 fxTag === / 砷弹 字样）', !/fxTag\s*===/.test(src) && !/砷弹/.test(src) && /registry\.resolve\(/.test(src), ''));
    cases.push(ok('TFX-01 L1–L4 预算表完整', ['L1', 'L2', 'L3', 'L4'].every(k => GRADE_BUDGETS[k]) && GRADE_BUDGETS.L4.darken && !GRADE_BUDGETS.L3.darken, j(Object.keys(GRADE_BUDGETS))));
    return { cases };
  } },

  'TFX-02': { run({ modules: m }) {
    const cases = [];
    const ell = elliott(m);
    const sup = s => m.battle.skillSupport(s);
    const usable = ell.skills.filter(s => sup(s).ok).map(s => s.name).sort();
    const rejected = ell.skills.filter(s => !s.isGroup && !sup(s).ok).map(s => ({ name: s.name, reason: sup(s).reason }));
    cases.push(ok('TFX-02 埃利奥特原值属性与技能/物品全量载入（19 技能条目含 2 组头 + 7 物品）',
      ell.maxHp === 100 && ell.maxMp === 110 && ell.atk === 20 && ell.def === 40 && ell.spd === 50 && ell.skills.length === 19 && ell.items.length === 7,
      j({ hp: ell.maxHp, mp: ell.maxMp, atk: ell.atk, def: ell.def, spd: ell.spd, skills: ell.skills.length, items: ell.items.length })));
    const rejBy = name => (rejected.find(r => r.name === name) || {}).reason || '';
    cases.push(ok('TFX-02 主动可用恰为 11 项（RULES02 迁移后）；4 反应与 2 结界暂缓按真实原因拒绝（无"范围未迁移"遮挡）',
      j(usable) === j(['伊西斯之拥', '压缩爆燃', '召雷术', '归尘礼赞', '拉莱耶造雾术', '提前瞄准', '灵风术', '精准流火', '萨维奇三连发', '迅捷愈合法', '预备咏唱'].sort()) &&
      rejected.length === 6 && rejected.every(r => r.reason && r.reason !== '范围未迁移') &&
      rejBy('纳克提特障壁术') === '场地结界（肃正）暂缓' && rejBy('圣域帷幕') === '场地结界（肃正）暂缓' &&
      rejBy('折影步') === '反应技能只能被动触发' && rejBy('双莲祛煞') === '反应技能只能被动触发' && rejBy('巫师护盾') === '反应技能只能被动触发' &&
      rejBy('净蚀反冲') === '看破只能由反应链触发', j({ usable, rejected })));
    const zy = skillNamed(ell, '折影步');
    cases.push(ok('TFX-02 折影步：近战回避反应 + 显式侧闪 2m 位移标签', zy.isReaction && zy.reactionTarget === '近战' && zy.evadeShift && zy.evadeShift.mode === 'side' && zy.evadeShift.distance === 2 && zy.fxTag === '折影步', j(zy.evadeShift)));

    // 多段攻击槽逐段结算：三段 55，护甲 0；第二段被闪避
    const savage = skillNamed(ell, '萨维奇三连发');
    const h1 = unit('ell', 'hero', { spd: 200 }), t1 = unit('t', 'enemy', { hp: 200, spd: 10, evasion: 20 });
    // 每段消费顺序＝伤害系数 roll（0.8+0.4r）→ 命闪 dodge/attack 两 roll（miss 仍消费系数）；序列逐段固定：段1 系数0→44 命中、段2 命闪落空、段3 系数0.5→55 命中
    const b1 = battle(m, [h1, t1], { ell: { col: 2, row: 4 }, t: { col: 8, row: 4 } }, rng([0, 0, 0.99, 0.5, 0.99, 0, 0.5, 0, 0.99]));
    const r1 = b1.attack(savage, { x: 8.5, y: 4.5, targetId: 't' });
    const segs1 = r1.hits[0] && r1.hits[0].segments;
    cases.push(ok('TFX-02 多段攻击槽：三段独立命闪与扣血，聚合值=逐段之和，日志逐段',
      r1.ok && segs1.length === 3 && j(segs1.map(s => s.hit)) === j([true, false, true]) && t1.ref.hp === 101 && r1.hits[0].hpDmg === 99 &&
      segs1[0].hpAfter === 156 && segs1[2].hpAfter === 101 && b1.snapshot().log.filter(l => l.includes('萨维奇三连发')).length === 3, // 段日志逐条成行（原版口径，不再写第N段前缀）
      j({ segs: segs1, hp: t1.ref.hp, log: b1.snapshot().log })));
    // 中途击倒：后续段不再结算
    const h2 = unit('ell', 'hero', { spd: 200 }), t2 = unit('t', 'enemy', { hp: 60, spd: 10 });
    const b2 = battle(m, [h2, t2], { ell: { col: 2, row: 4 }, t: { col: 8, row: 4 } }, () => 0.5);
    const r2 = b2.attack(savage, { x: 8.5, y: 4.5, targetId: 't' });
    cases.push(ok('TFX-02 多段攻击槽：目标倒地后剩余段不结算', r2.ok && r2.hits[0].segments.length === 2 && r2.hits[0].down && t2.ref.hp === 0, j(r2.hits[0])));

    // 爆炸：火弹撞上首个敌人，在接触点起爆；被撞者计入一次，半径内其他敌人同受；命中者挂燃烧
    const blast = skillNamed(ell, '压缩爆燃');
    const h3 = unit('ell', 'hero', { spd: 200 }), front = unit('front', 'enemy', { hp: 200, spd: 10 }), side = unit('side', 'enemy', { hp: 200, spd: 10 }), far = unit('far', 'enemy', { hp: 200, spd: 10 });
    const b3 = battle(m, [h3, front, side, far], { ell: { col: 2, row: 4 }, front: { col: 6, row: 4 }, side: { col: 7, row: 5 }, far: { col: 12, row: 4 } }, () => 0.5);
    const r3 = b3.attack(blast, { x: 10.5, y: 4.5 });
    const ids3 = r3.hits.map(h => h.targetId).sort();
    const burns = Object.values(b3.battleState.combatState.clock.statuses).filter(s => s.kind === 'burn').map(s => s.unitId).sort();
    cases.push(ok('TFX-02 压缩爆燃：接触点起爆，被撞者恰好结算一次，半径外不受伤，命中者挂燃烧',
      r3.ok && r3.query.contact.unitId === 'front' && j(ids3) === j(['front', 'side']) && front.ref.hp === 130 && side.ref.hp === 130 && far.ref.hp === 200 && j(burns) === j(['front', 'side']),
      j({ contact: r3.query.contact, ids3, hp: [front.ref.hp, side.ref.hp, far.ref.hp], burns })));

    // 折影步：近战来袭 → 回避成功 → 沿攻击线垂直方向真实错位 2m（先左后右），扣反应 MP，不扣 HP
    const melee = m.parser.parseSkill('【横扫】[近战] [单体(刀砍);power:18] [范围:单体;射程:2]');
    const ranged = m.parser.parseSkill('【箭矢】[远程] [单体;power:10] [范围:单体;射程:10]');
    const shiftCase = (blocker) => {
      const hero = unit('ell', 'hero', { spd: 10, mp: 110, skills: [zy] });
      const foe = unit('foe', 'enemy', { spd: 200 });
      const units = [hero, foe];
      const placements = { ell: { col: 4, row: 4 }, foe: { col: 5, row: 4 } };
      if (blocker) { units.push(unit('blk', 'hero', { spd: 5 })); placements.blk = { col: 4, row: 5 }; }
      // 同步 attack() 缺省 policy:none 不代玩家响应反应（battle.mjs 离线包装）；改走 beginAttack 生成器，收到 reaction 请求后显式确认折影步。
      // 序列：系数0→0.8 → 命闪(1,100)命中 → 反应二次闪避 dodge 0.99×900 vs attack 1 → 回避成功
      const b = battle(m, units, placements, rng([0, 0, 0.99, 0.99, 0]));
      const gen = b.beginAttack(melee, { x: 4.5, y: 4.5, targetId: 'ell' });
      let step = gen.next(), req = null;
      while (!step.done) { if (step.value && step.value.type === 'reaction') { req = step.value; step = gen.next({ responderId: req.responderId, skill: req.candidates[0].skill }); } else step = gen.next(null); }
      const r = step.value;
      return { r, hero, b, at: { col: b.ctx.placementsById.ell.col, row: b.ctx.placementsById.ell.row } };
    };
    const free = shiftCase(false), blocked = shiftCase(true);
    const rx = free.r.hits[0] && free.r.hits[0].reaction;
    cases.push(ok('TFX-02 折影步：回避成功即侧闪 2m，规则站位立即更新，结果带 reaction.shift 路径',
      free.r.ok && rx && rx.dodged && rx.fxTag === '折影步' && rx.shift.distance === 2 && j(free.at) === j({ col: 4, row: 6 }) &&
      rx.shift.path.length === 3 && free.hero.ref.hp === 100 && free.hero.ref.mp === 106,
      j({ reaction: rx, at: free.at, hp: free.hero.ref.hp, mp: free.hero.ref.mp })));
    cases.push(ok('TFX-02 折影步：一侧被挡改向另一侧', blocked.r.ok && j(blocked.at) === j({ col: 4, row: 2 }), j({ at: blocked.at, reaction: blocked.r.hits[0] && blocked.r.hits[0].reaction })));
    const rangedHero = unit('ell', 'hero', { spd: 10, skills: [zy] }), archer = unit('arc', 'enemy', { spd: 200 });
    const b5 = battle(m, [rangedHero, archer], { ell: { col: 4, row: 4 }, arc: { col: 9, row: 4 } }, () => 0.5);
    const r5 = b5.attack(ranged, { x: 4.5, y: 4.5, targetId: 'ell' });
    cases.push(ok('TFX-02 折影步只响应近战（反应类型按来袭技能匹配），远程来袭不位移不扣蓝',
      r5.ok && !r5.hits[0].reaction && rangedHero.ref.mp === 110 && b5.ctx.placementsById.ell.col === 4 && b5.ctx.placementsById.ell.row === 4, j({ hit: r5.hits[0], mp: rangedHero.ref.mp })));

    // 预备咏唱：自身再动 + 加速库存
    const chant = skillNamed(ell, '预备咏唱');
    const h6 = unit('ell', 'hero', { spd: 200 }), e6 = unit('e', 'enemy', { spd: 10 });
    const b6 = battle(m, [h6, e6], { ell: { col: 2, row: 4 }, e: { col: 8, row: 4 } }, () => 0.5);
    const before6 = b6.snapshot().resources.main;
    const r6 = b6.attack(chant, { x: 2.5, y: 4.5, targetId: 'ell' });
    const after6 = b6.snapshot();
    cases.push(ok('TFX-02 预备咏唱：只作用自身，再动返还主行动，加速 +3 入库存', r6.ok && before6 === 1 && after6.resources.main === 1 && after6.chargeInventory === 3 && r6.hits.length === 0,
      j({ before6, after: after6.resources, inv: after6.chargeInventory, hits: r6.hits })));
    return { cases };
  } },
};
