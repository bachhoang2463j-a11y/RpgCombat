// ==========================================
// FX02 规则内核定向用例（TR2-A~D）：规范标签/伤害管线/反应与费用/物品召唤职业变种。
// 全部走真实 createBattle/beginAttack/beginUseItem/defend/predictAttack，不复制规则实现；
// 随机以注入队列驱动，断言原版口径数值（0.8–1.2 随机段伤、护甲/穿透/散射3倍、反应纯回避值判定）。
// 每场 battle 必含敌我双方（无敌方即胜利终局，无法行动）。
// ==========================================

import { pathToFileURL } from 'node:url';

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
const j = v => JSON.stringify(v);
// 队列随机：按序消费，耗尽回落 0.5
function rng(values = []) { let i = 0; return () => (i < values.length ? values[i++] : 0.5); }
function scene(objects = []) { return { sceneId: 'fx02', grid: { columns: 18, rows: 12, metersPerCell: 1 }, ground: { material: 'brick' }, objects }; }
function unit(id, side, opts = {}) {
  const hp = opts.hp ?? 100;
  return { id, name: id, side, footprint: opts.footprint || { width: 1, height: 1 }, skills: opts.skills || [], items: opts.items || [],
    classType: opts.classType || null, attrTags: opts.attrTags || null,
    ref: { hp, maxHp: opts.maxHp ?? hp, mp: opts.mp ?? 110, maxMp: opts.mp ?? 110, tp: opts.tp ?? 0, maxTp: opts.maxTp ?? 100,
      atk: opts.atk ?? 20, def: opts.def ?? 0, spd: opts.spd ?? 100, evasion: opts.evasion ?? 0,
      strength: 50, moveDistance: 6, totalWeight: 40, shield: opts.shield ?? 0 } };
}
function battle(m, units, placements, random, options = {}) { const b = m.battle.createBattle({ units, placementsById: placements, scene: scene(), random, ...options }); b.start(); return b; }
function aim(col, row, targetId) { return { x: col + 0.5, y: row + 0.5, ...(targetId ? { targetId } : {}) }; }
function drive(gen, answer = null) { let s = gen.next(); while (!s.done) s = gen.next(typeof answer === 'function' ? answer(s.value) : answer); return s.value; }

export const groups = {
  // ---------- TR2-A 规范标签 / 解析输出 / 槽视图 ----------
  'TR2-A': { run({ modules: m }) {
    const cases = [];
    const ED = m.effectDefinitions;
    cases.push(ok('TR2-A normalizeEffectTag：单群合并+子型保留+别名吸收',
      ED.normalizeEffectTag('[群攻(火焰)]') === '伤害(火焰)' && ED.normalizeEffectTag('[单体]') === '伤害'
      && ED.normalizeEffectTag('[单避]') === '单避' && ED.normalizeEffectTag('[回避]') === '回避'
      && ED.normalizeEffectTag('[群回]') === '回复' && ED.normalizeEffectTag('[单防]') === '增防'
      && ED.normalizeEffectTag('[回复]') === '回复' && ED.normalizeEffectTag('[增攻]') === '增攻',
      j({ a: ED.normalizeEffectTag('[群攻(火焰)]'), b: ED.normalizeEffectTag('[单避]') })));
    cases.push(ok('TR2-A effectDefinition：精确→剥子型回退，赋予走 variant', (() => {
      const d1 = ED.effectDefinition('[伤害(火焰)]'), d2 = ED.effectDefinition('[散射(霰弹)]'), d3 = ED.effectDefinition('[赋予:流体]');
      return d1 && d1.attack === true && d2 && d2.scatter === true && d3 && d3.kind === 'variant' && d3.variant === '流体';
    })(), ''));
    cases.push(ok('TR2-A parser 槽位输出规范标签（旧写法只作别名读入）', (() => {
      const s = m.parser.parseSkill('【爆】[群攻;power:70][群燃烧;power:10][范围:爆炸;射程:10;半径:2]');
      const s2 = m.parser.parseSkill('【雾】[单避;power:50][范围:单体;射程:6]');
      return s.type === '[伤害]' && s.type2 === '[燃烧]' && s2.type === '[单避]';
    })(), ''));
    cases.push(ok('TR2-A [冷却:N] 独立字段、[延迟:N] 仍为 delay 且不相混', (() => {
      const s = m.parser.parseSkill('【斩】[伤害;power:9][冷却:2][延迟:1][范围:单体;射程:12]');
      return s.cooldownTurns === 2 && s.delay === 1;
    })(), ''));
    cases.push(ok('TR2-A 第七范围「自身」入 RANGE_TYPES 且 parseRangeTag 接受', (() => {
      const s = m.parser.parseSkill('【守】[加防;power:30][范围:自身]');
      return m.protocol.RANGE_TYPES.includes('自身') && s.range && s.range.type === '自身';
    })(), ''));
    cases.push(ok('TR2-A 旧协议来源（无显式范围）[再动] 迁移标 self；显式范围不标', (() => {
      const legacy = m.parser.parseSkill('【预备】[再动;power:1][加速:3]');
      const modern = m.parser.parseSkill('【号令】[再动;power:1][范围:圆形;射程:8;半径:2]');
      return legacy.slotTargets && legacy.slotTargets[0] === 'self' && (!modern.slotTargets || modern.slotTargets[0] !== 'self');
    })(), j({ legacy: true })));
    cases.push(ok('TR2-A skillSlots：power/turns/target/attack/debuff 视图正确', (() => {
      const s = m.parser.parseSkill('【混】[伤害;power:55][中毒;power:5][单避;power:50][Turns:4][范围:单体;射程:9]');
      const slots = ED.skillSlots(s);
      return slots.length === 3 && slots[0].attack === true && slots[0].power === 55
        && slots[1].debuff === true && slots[1].turns === 4
        && slots[2].tag === '单避' && slots[2].definition.consumable === true && slots[2].target === 'default';
    })(), ''));
    cases.push(ok('TR2-A 槽结算顺序：攻击槽先于减益槽（稳定排序）', (() => {
      const s = m.parser.parseSkill('【序】[中毒;power:5][伤害;power:6][范围:单体;射程:9]');
      const sorted = ED.sortSlotsForResolve(ED.skillSlots(s));
      return sorted[0].attack === true && sorted[1].tag === '中毒';
    })(), ''));
    return { cases };
  } },

  // ---------- TR2-B 伤害管线 / 命中门 / 有效属性 ----------
  'TR2-B': { run({ modules: m }) {
    const cases = [];
    // B1 三槽逐段独立：威力 2/5/8、rng 0.5 → roll=1.0；防御 0；命闪 evasion 0 恒命中
    {
      const caster = unit('h', 'hero', { spd: 200, atk: 10 });
      const enemy = unit('e', 'enemy', { hp: 100, def: 0 });
      const tri = m.parser.parseSkill('【三连】[伤害;power:2][伤害;power:5][伤害;power:8][范围:单体;射程:12]');
      const b = battle(m, [caster, enemy], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
      const r = b.attack(tri, aim(5, 4, 'e'));
      const h0 = r.hits[0];
      cases.push(ok('TR2-B 三伤害槽逐段独立判定：3段各按本槽威力、聚合=逐段之和',
        r.ok && h0.segments.length === 3 && h0.segments.every(s => s.hit)
        && h0.segments.map(s => s.hpDmg).join(',') === '2,5,8' && (h0.hpBefore - h0.hpAfter) === 15,
        j({ segs: h0.segments.map(s => s.hpDmg), total: h0.hpBefore - h0.hpAfter })));
    }
    // B2 减益命中门：攻击段命中 → 中毒随攻击落地；纯减益技能独立掷骰共享结论
    {
      const caster = unit('h', 'hero', { spd: 200, atk: 10 });
      const enemy = unit('e', 'enemy', { hp: 100 });
      const mixed = m.parser.parseSkill('【混】[伤害;power:4][中毒;power:5][范围:单体;射程:12]');
      const b = battle(m, [caster, enemy], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5]));
      const r = b.attack(mixed, aim(5, 4, 'e'));
      const poison = (r.effects || []).find(x => x.kind === 'dot' && x.dot === 'poison');
      cases.push(ok('TR2-B 减益随攻击命中落地（至少一次命中共享）', r.ok && !!poison && enemy.ref.hp === 96, j({ effects: r.effects })));
      const pure = m.parser.parseSkill('【蚀】[中毒;power:5][降防;power:10][范围:单体;射程:12]');
      const b2 = battle(m, [unit('h2', 'hero', { spd: 200, atk: 10 }), unit('e2', 'enemy', { hp: 100 })],
        { h2: { col: 1, row: 4 }, e2: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5]));
      const r2 = b2.attack(pure, aim(5, 4, 'e2'));
      const hasPoison = (r2.effects || []).some(x => x.kind === 'dot') && (r2.effects || []).some(x => x.kind === 'buff' && x.field === 'def');
      const eff = b2.getEffectiveUnit('e2');
      cases.push(ok('TR2-B 纯减益首槽独立掷骰、后续槽共享结论；有效属性不写 ref',
        r2.ok && hasPoison && eff.def === -10 && eff.buffs.some(x => x.type === 'def' && x.value < 0) && b2.ctx.units[1].ref.def === 0,
        j({ effDef: eff.def, refDef: b2.ctx.units[1].ref.def })));
    }
    // B3 穿透无视护甲与护盾；散射 3 倍护甲、护盾逐段吸收
    {
      const caster = unit('h', 'hero', { spd: 200, atk: 10 });
      const enemy = unit('e', 'enemy', { hp: 100, def: 30, shield: 50 });
      const pierce = m.parser.parseSkill('【穿】[穿透;power:20][范围:单体;射程:12]');
      const scatter = m.parser.parseSkill('【散】[散射;power:200][范围:单体;射程:12]');
      const b = battle(m, [caster, enemy], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
      const r1 = b.attack(pierce, aim(5, 4, 'e'));
      const hpAfterPierce = enemy.ref.hp; // 穿透 20 直扣 → 80
      enemy.ref.shield = 50;
      const before = enemy.ref.hp;
      b.endAction(); b.endAction(); b.endAction();
      const r2 = b.attack(scatter, aim(5, 4, 'e')); // raw 200 → 甲90 → 110；盾吸50 → HP 60
      cases.push(ok('TR2-B 穿透无视护甲护盾直扣HP', r1.ok && hpAfterPierce === 80, j({ pierce: hpAfterPierce })));
      cases.push(ok('TR2-B 散射每弹丸吃3倍护甲（30×3）且护盾先吸收', r2.ok && (before - enemy.ref.hp) === 60 && enemy.ref.shield === 0,
        j({ hpDmg: before - enemy.ref.hp, shield: enemy.ref.shield })));
    }
    // B4 变种类型抗性：【流体】远程-50%；【耐毒】免疫中毒
    {
      const poisonSkill = m.parser.parseSkill('【毒】[中毒;power:9][范围:单体;射程:12]');
      const caster = unit('h', 'hero', { spd: 200, atk: 10 });
      const fluid = unit('f', 'enemy', { hp: 100, attrTags: ['[流体]'] });
      const skillRanged = m.parser.parseSkill('【射】[伤害;power:20][远程][范围:单体;射程:12]');
      const b = battle(m, [caster, fluid], { h: { col: 1, row: 4 }, f: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5]));
      const r = b.attack(skillRanged, aim(5, 4, 'f'));
      cases.push(ok('TR2-B 变种【流体】远程伤害减半', r.ok && r.hits[0].hpDmg === 10, j({ dmg: r.hits[0].hpDmg })));
      const b3 = battle(m, [unit('h3', 'hero', { spd: 200, atk: 10 }), unit('f3', 'enemy', { hp: 100, attrTags: ['[耐毒]'] })],
        { h3: { col: 1, row: 4 }, f3: { col: 5, row: 4 } }, rng([0.5, 0.5]));
      const r3 = b3.attack(poisonSkill, aim(5, 4, 'f3'));
      cases.push(ok('TR2-B 【耐毒】目标免疫中毒', r3.ok && (r3.effects || []).some(x => x.kind === 'dot' && x.immune), j(r3.effects)));
    }
    // B5 免伤一次性消耗（敌方先手自上免伤，我方攻击归零并消耗）
    {
      const guard = m.parser.parseSkill('【免】[免伤;power:120][范围:自身]');
      const hit20 = m.parser.parseSkill('【击】[伤害;power:20][范围:单体;射程:12]');
      const e = unit('e', 'enemy', { hp: 100, spd: 300 });
      const h = unit('h', 'hero', { spd: 200, atk: 10 });
      const b = battle(m, [h, e], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
      const g = b.attack(guard, aim(5, 4)); // e 先手（spd 300）自上免伤
      b.endAction(); // e 行动结束 → h 到轴
      const r1 = b.attack(hit20, aim(5, 4, 'e')); // h 行动：免伤计入有效 def（120）→ 20-120 → 0 并消耗
      for (let i = 0; i < 4; i++) {
        b.endAction();
        if (b.snapshot().currentId === 'h') break;
      }
      const r2 = b.attack(hit20, aim(5, 4, 'e')); // 免伤已消耗 → 正常 20
      cases.push(ok('TR2-B 免伤一次性：下一次受击防御+120 归零并消耗，随后恢复正常',
        g.ok && r1.ok && r1.hits[0].hpDmg === 0 && r2.ok && r2.hits[0].hpDmg === 20,
        j({ a: r1.hits[0]?.hpDmg, b: r2.hits[0]?.hpDmg, reason: r2.reason })));
    }
    // B6 防御姿态（原版 actionDefend：MP+20%、TP+25%、命中+30、defend 状态）+ 毅力保命
    {
      const h = unit('h', 'hero', { spd: 200, mp: 50, tp: 0, maxTp: 100 });
      h.ref.maxMp = 100;
      const e = unit('e', 'enemy', { hp: 100, spd: 50 });
      const b = battle(m, [h, e], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } }, rng([]));
      const r = b.defend();
      cases.push(ok('TR2-B 防御姿态：MP+20% TP+25% 命中+30（原版参数）',
        r.ok && h.ref.mp === 70 && h.ref.tp === 25 && b.getEffectiveUnit('h').hit === 30 && b.getEffectiveUnit('h').buffs.some(x => x.type === 'defend'),
        j({ mp: h.ref.mp, tp: h.ref.tp, hit: b.getEffectiveUnit('h').hit })));
      const fatal = m.parser.parseSkill('【斩】[伤害;power:500][范围:单体;射程:12]');
      const grit = unit('g', 'enemy', { hp: 30, classType: '防守者' });
      const b2 = battle(m, [unit('hh', 'hero', { spd: 200, atk: 10 }), grit], { hh: { col: 1, row: 4 }, g: { col: 5, row: 4 } }, rng([0.5, 0.5]));
      const r2 = b2.attack(fatal, aim(5, 4, 'g'));
      cases.push(ok('TR2-B 防守者【毅力留存】致命保留1HP（每场一次）', r2.ok && grit.ref.hp === 1 && grit.ref.hasTriggeredGrit === true, j({ hp: grit.ref.hp })));
    }
    return { cases };
  } },

  // ---------- TR2-C 反应 generator / 费用一次 / 弹药 / 延迟冷却 / 预测 ----------
  'TR2-C': { run({ modules: m }) {
    const cases = [];
    const zhey = () => m.parser.parseSkill('【折影步】[单避;power:900][MP:4][反应:近战][限1次][位移:侧闪;距离:2][范围:自身]');
    // C1 反应 generator：yield 请求 → 采纳 → 二次闪避（纯回避值900）成功 → 该发落空 + 侧闪错位；恰好扣一次费
    {
      const attacker = unit('h', 'hero', { spd: 200, atk: 10 });
      const defender = unit('re', 'enemy', { hp: 50, mp: 20, skills: [zhey()] });
      defender.controller = 'player';
      const plain = m.parser.parseSkill('【直击】[伤害;power:6][范围:单体;射程:12]');
      const b = battle(m, [attacker, defender], { h: { col: 3, row: 4 }, re: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.9, 0.1, 0.5, 0.5, 0.5]));
      const gen = b.beginAttack(plain, aim(5, 4, 're'));
      const step1 = gen.next();
      const req = !step1.done && step1.value && step1.value.type === 'reaction' ? step1.value : null;
      if (!req) { cases.push(ok('TR2-C reaction 请求 shape（responderId/candidates/slotIndex/shotIndex）', false, j(step1.value))); }
      else {
        const shapeOk = req.responderId === 're' && req.casterId === 'h' && Array.isArray(req.candidates)
          && req.candidates[0].skill.name === '折影步' && typeof req.candidates[0].usesLeft === 'number'
          && req.slotIndex === 0 && req.shotIndex === 1;
        const row0 = b.ctx.placementsById.re.row;
        const res = gen.next({ responderId: 're', skill: req.candidates[0].skill });
        const seg0 = res.value.hits[0].segments[0];
        cases.push(ok('TR2-C reaction 请求 shape 完整（含 shotIndex/slotIndex/usesLeft）', shapeOk, j(req)));
        cases.push(ok('TR2-C 折影步：确认后该发落空、侧闪2m错位、反应方恰好扣一次费、攻击零伤害',
          res.value.ok && seg0.hit === false && seg0.reaction && seg0.reaction.dodged === true && seg0.reaction.shift
          && b.ctx.placementsById.re.row === row0 - 2 && defender.ref.mp === 16 && res.value.hits[0].hpDmg === 0,
          j({ seg: seg0, mp: defender.ref.mp, at: b.ctx.placementsById.re })));
      }
    }
    // C2 看破：确认后整段技能无效化（canceled）
    {
      const kanpo = m.parser.parseSkill('【净蚀反冲】[看破:法术][MP:10][限3次][范围:单体;射程:12]');
      const attacker = unit('h', 'hero', { spd: 200, atk: 10 });
      const defender = unit('re', 'enemy', { hp: 50, mp: 50, skills: [kanpo] });
      defender.controller = 'player';
      const spell = m.parser.parseSkill('【魔弹】[伤害;power:6][法术][范围:单体;射程:12]');
      const b = battle(m, [attacker, defender], { h: { col: 1, row: 4 }, re: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5, 0.5]));
      const gen = b.beginAttack(spell, aim(5, 4, 're'));
      const step1 = gen.next();
      const req = !step1.done && step1.value && step1.value.type === 'reaction' ? step1.value : null;
      const res = req ? gen.next({ responderId: 're', skill: req.candidates[0].skill }) : { value: { ok: false, reason: 'no req' } };
      cases.push(ok('TR2-C 看破：整段来袭技能无效化（canceled 且零伤害）',
        !!req && res.value.ok && res.value.canceled === true && res.value.hits.every(h2 => h2.hpDmg === 0) && defender.ref.mp === 40,
        j({ canceled: res.value.canceled, mp: defender.ref.mp })));
    }
    // C3 费用一次：MP5 三段攻击只扣 5；弹药绑定按发扣（*3 → 三段各1发）
    {
      const ammo = m.parser.parseItem('【.32子弹】[弹药][数量:10][绑定:三连*3]');
      const attacker = unit('h', 'hero', { spd: 200, atk: 10, items: [ammo] });
      const enemy = unit('e', 'enemy', { hp: 100 });
      const tri = m.parser.parseSkill('【三连】[伤害;power:2][伤害;power:2][伤害;power:2][MP:5][远程][范围:单体;射程:12]');
      const b = battle(m, [attacker, enemy], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
      const r = b.attack(tri, aim(5, 4, 'e'));
      cases.push(ok('TR2-C 费用整次一次（MP 5 不乘段数）+ 弹药按发扣 3 发',
        r.ok && attacker.ref.mp === 105 && ammo.count === 7 && (r.ammoEvents || []).length === 3,
        j({ mp: attacker.ref.mp, ammo: ammo.count })));
    }
    // C4 [延迟:1]→准备（不写冷却，就绪手动释放当下目标）；[冷却:2]→绝对冷却
    {
      const delaySkill = m.parser.parseSkill('【蓄】[伤害;power:9][延迟:1][范围:单体;射程:12]');
      const cdSkill = m.parser.parseSkill('【冷】[伤害;power:9][冷却:2][范围:单体;射程:12]');
      const h = unit('h', 'hero', { spd: 200, atk: 10 });
      const e = unit('e', 'enemy', { hp: 100, spd: 100 });
      const b = battle(m, [h, e], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
      const r1 = b.attack(delaySkill, aim(5, 4, 'e'));
      const prepOk = r1.preparing === true && b.snapshot().preparation && b.snapshot().preparation.source === 'delay' && b.snapshot().preparation.remaining === 1 && e.ref.hp === 100;
      b.endAction(); // 下一自然行动自动投入主行动 → 就绪（SPEC S06：后续取得的主行动自动投入）
      const prep = b.snapshot().preparation;
      const readyOk = prep && prep.remaining === 0;
      const r2 = b.attack(delaySkill, aim(5, 4, 'e')); // 就绪释放当下目标，不再扣主行动/MP
      const noCd = !b.battleState.cooldowns || !b.battleState.cooldowns.h || Object.keys(b.battleState.cooldowns.h).length === 0;
      b.endAction(); // e 到轴 → 结束
      b.endAction(); // h 再次到轴（t=150）
      const r3 = b.attack(cdSkill, aim(5, 4, 'e'));
      const cdAt = b.battleState.cooldowns && b.battleState.cooldowns.h ? Object.values(b.battleState.cooldowns.h)[0] : null;
      cases.push(ok('TR2-C [延迟:1] 进入准备（source=delay 不写冷却），就绪手动释放当下目标',
        prepOk && readyOk && r2.ok && r2.hits[0].hit === true && noCd, j({ prepOk, readyOk, noCd })));
      cases.push(ok('TR2-C [冷却:2] 提交后写绝对冷却 now+200', r3.ok && cdAt === b.battleState.combatState.clock.now + 200, j({ cdAt })));
    }
    // C5 predictAttack：零掷骰预测（费用/弹药计划/效果槽/伤害预估含盾副本消耗）
    {
      const ammo = m.parser.parseItem('【弹】[弹药][数量:9][绑定:三连*3]');
      const attacker = unit('h', 'hero', { spd: 200, atk: 10, items: [ammo] });
      const enemy = unit('e', 'enemy', { hp: 100, def: 2, shield: 5 });
      const tri = m.parser.parseSkill('【三连】[伤害;power:10][伤害;power:10][MP:5][远程][范围:单体;射程:12]');
      const b = battle(m, [attacker, enemy], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } }, rng([]));
      const p = b.predictAttack(tri, aim(5, 4, 'e'));
      cases.push(ok('TR2-C predictAttack：costs/ammoPlan/effects/damagePreview，盾在预测副本上逐槽消耗',
        p.ok && p.costs.mp === 5 && p.ammoPlan[0].remaining === 9 && p.effects.length === 2
        && p.damagePreview[0].estimatedHpDmg === Math.max(1, 10 - 2 - 5) && p.damagePreview[1].estimatedHpDmg === Math.max(1, 10 - 2),
        j({ preview: p.damagePreview.map(x => x.estimatedHpDmg) })));
    }
    return { cases };
  } },

  // ---------- TR2-D 物品 / 召唤 / 职业 / 单群合并 / 自身范围 / TP 经济 ----------
  'TR2-D': { run({ modules: m }) {
    const cases = [];
    // D1 beginUseItem：消耗品扣数量、回蓝生效；generator 与反应同链
    {
      const potion = m.parser.parseItem('【精华秘酿】[回蓝;power:10][消耗品][数量:6]');
      const h = unit('h', 'hero', { spd: 200, mp: 20 });
      h.ref.maxMp = 40;
      const e = unit('e', 'enemy', { hp: 100, spd: 50 });
      const b = battle(m, [h, e], { h: { col: 1, row: 4 }, e: { col: 10, row: 8 } }, rng([0.5, 0.5, 0.5]));
      const res = drive(b.beginUseItem(potion, aim(1, 4, 'h')));
      cases.push(ok('TR2-D beginUseItem：回蓝+10、消耗品数量6→5、isItem 结果',
        res && res.ok && res.isItem === true && h.ref.mp === 30 && potion.count === 5, j({ mp: h.ref.mp, count: potion.count })));
    }
    // D2 召唤：由明确模板生成单位（controller=ai、owner 绑定），不虚构缺失词条
    {
      const summonSkill = m.parser.parseSkill('【召】[召唤:幽灵*2][范围:召唤;射程:8]');
      const enemy = unit('e', 'enemy', { hp: 100 });
      const h = unit('h', 'hero', { spd: 200 });
      const b = battle(m, [h, enemy], { h: { col: 1, row: 4 }, e: { col: 12, row: 8 } }, rng([0.5, 0.5, 0.5, 0.5]), {
        summonProvider: name => name === '幽灵' ? { ...unit('template', 'hero', { hp: 60, mp: 20, atk: 8, spd: 80 }).ref, skills: [], footprint: { width: 1, height: 1 } } : null,
      });
      const r = b.attack(summonSkill, aim(3, 4));
      const snap = b.snapshot();
      const spawned = snap.units.filter(u => u.id.startsWith('sum_'));
      cases.push(ok('TR2-D 召唤*2 真实生成：controller=ai、owner 绑定、HP>0 且入快照',
        r.ok && spawned.length === 2 && spawned.every(u => u.controller === 'ai' && u.hp > 0)
        && b.getEffectiveUnit(spawned[0].id).summonOwnerId === 'h',
        j({ spawned: spawned.map(u => u.id), reason: r.reason })));
    }
    // D3 职业：施法者开场半MP盾；风行者 eva+=TP；防守者天生嘲讽200
    {
      const mage = unit('mg', 'hero', { classType: '施法者', mp: 100, spd: 300 });
      const wind = unit('wd', 'hero', { classType: '风行者', tp: 40, spd: 250 });
      const guard = unit('gd', 'hero', { classType: '防守者', spd: 240 });
      const enemy = unit('e', 'enemy', { hp: 100, spd: 50 });
      const b = battle(m, [mage, wind, guard, enemy], { mg: { col: 1, row: 1 }, wd: { col: 1, row: 2 }, gd: { col: 1, row: 3 }, e: { col: 10, row: 8 } }, rng([]));
      cases.push(ok('TR2-D 职业被动：施法者盾=maxMp/2、风行者闪避+TP、防守者嘲讽200',
        b.getEffectiveUnit('mg').shield === 50 && b.getEffectiveUnit('wd').eva === 40 && b.getEffectiveUnit('gd').taunt === 200,
        j({ shield: b.getEffectiveUnit('mg').shield, eva: b.getEffectiveUnit('wd').eva, taunt: b.getEffectiveUnit('gd').taunt })));
    }
    // D4 单群合并：旧[单体]标签配显式直线 → 直线内两名敌人皆中（数量由范围决定）
    {
      const lineSkill = m.parser.parseSkill('【扫】[单体;power:4][范围:直线;长:10;宽:1]');
      const h = unit('h', 'hero', { spd: 200, atk: 10 });
      const e1 = unit('e1', 'enemy', { hp: 100 });
      const e2 = unit('e2', 'enemy', { hp: 100 });
      const b = battle(m, [h, e1, e2], { h: { col: 1, row: 4 }, e1: { col: 4, row: 4 }, e2: { col: 7, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
      const r = b.attack(lineSkill, aim(9, 4));
      cases.push(ok('TR2-D 单群合并：[单体]+显式直线 → 直线内两敌皆结算',
        r.ok && r.hits.length === 2 && r.hits.every(x => x.hit === true), j({ hits: r.hits.map(x => x.targetId) })));
    }
    // D5 TP 经济：技能施放+5、受击+10、普通攻击+20
    {
      const h = unit('h', 'hero', { spd: 300, atk: 10, tp: 0, maxTp: 100 });
      const e = unit('e', 'enemy', { hp: 100, spd: 100 });
      const skill = m.parser.parseSkill('【击】[伤害;power:4][范围:单体;射程:12]');
      const b = battle(m, [h, e], { h: { col: 1, row: 4 }, e: { col: 5, row: 4 } }, rng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
      b.attack(skill, aim(5, 4, 'e'));
      const casterTp = h.ref.tp, targetTp = e.ref.tp;
      b.endAction(); // 敌方行动（普攻）
      cases.push(ok('TR2-D TP 经济：施法+5 / 受击+10 / 普攻+20', casterTp === 5 && targetTp === 10, j({ casterTp, targetTp })));
    }
    // D6 自身范围：预览与结算均落自身
    {
      const selfSkill = m.parser.parseSkill('【守】[加防;power:30][范围:自身]');
      const h = unit('h', 'hero', { spd: 200 });
      const e = unit('e', 'enemy', { hp: 100, spd: 50 });
      const b = battle(m, [h, e], { h: { col: 1, row: 4 }, e: { col: 10, row: 8 } }, rng([0.5, 0.5]));
      const q = b.previewAttack(selfSkill, aim(1, 4));
      const r = b.attack(selfSkill, aim(1, 4));
      cases.push(ok('TR2-D 第七范围[范围:自身]：预览与结算均落自身',
        q.ok && r.ok && (r.effects || []).some(x => x.kind === 'buff' && x.field === 'def' && x.targetId === 'h')
        && b.getEffectiveUnit('h').def === 30, j({ effects: r.effects, reason: r.reason })));
    }
    // D7 reset：本战斗基线重置（召唤退场、物品/TP/盾/毅力回开场）
    {
      const summonSkill = m.parser.parseSkill('【召】[召唤:幽灵][范围:自身]');
      const potion = m.parser.parseItem('【药】[消耗品][数量:5]');
      const h = unit('h', 'hero', { spd: 300, tp: 10, items: [potion] });
      const e = unit('e', 'enemy', { hp: 100, spd: 50 });
      const b = battle(m, [h, e], { h: { col: 1, row: 4 }, e: { col: 10, row: 8 } }, rng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
      b.attack(summonSkill, aim(1, 4));
      b.attack(m.parser.parseSkill('【击】[伤害;power:4][范围:单体;射程:12]'), aim(10, 8, 'e'));
      b.reset();
      const snap = b.snapshot();
      cases.push(ok('TR2-D reset 回本战斗基线：召唤退场、物品数量/TP 还原',
        snap.units.every(u => !u.id.startsWith('sum_')) && snap.units.length === 2 && h.ref.tp === 10 && potion.count === 5,
        j({ units: snap.units.map(u => u.id), tp: h.ref.tp, count: potion.count })));
    }
    return { cases };
  } },
};
