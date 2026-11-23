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
  'TFX-01': { async run({ modules: m }) {
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
      glide: reg.resolve(reactionInput({ fxTag: '回避错位', canceled: true, shift: { distance: 2 } })).id,
      noTagShift: reg.resolve(reactionInput({ canceled: true, shift: { distance: 2 }, kanpo: true })),
      unknown: reg.resolve(actionInput(fakeResult({ ...savage, fxTag: '未知特效' }, '单体', [atkSlot(0, savage.type)]))).id,
      noShift: reg.resolve(reactionInput({ skillName: '战壕格斗术', fxTag: null, canceled: true, shift: null })),
    };
    cases.push(ok('TFX-01 动作和反应通道仅按标签分发；范围和效果槽不会改选演出',
      resolved.savage === 'basic-枪击' && resolved.blast === 'fire-blast' && resolved.chant === 'self-boost' && resolved.arsenic === 'arsenic-shot' &&
      resolved.plain === 'neutral-impact' && resolved.unknown === 'neutral-impact' && resolved.fireSingle === 'fire-blast' &&
      resolved.zheYing === 'evade-shift-ghost' && resolved.glide === 'evade-shift' && resolved.noTagShift === null && resolved.noShift === null, j(resolved)));
    const basicNames = ['枪击', '霰弹', '火焰', '冰霜', '雷击', '爆炸', '光', '毒液', '毒雾', '风', '刀砍', '拳击', '爪击', '撕咬', '箭矢'];
    const options = m.fxLibrary.getFxTagOptions();
    const names = options.map(x => x.name);
    const registered = new Set(reg.list().flatMap(e => e.fxTags || []));
    cases.push(ok('TFX-01 标签选项来自同一注册表，覆盖基础标签且跨通道去重',
      names.length === registered.size && new Set(names).size === names.length && names.every(n => registered.has(n)) &&
      basicNames.every(n => reg.resolve({ kind: 'action', fxTag: n }).id === 'basic-' + n) &&
      reg.resolve({ kind: 'prepare', fxTag: '圣光01' }).id === 'holy-vow' && reg.resolve({ kind: 'action', fxTag: '圣光01' }).id === 'holy-judgment', j(names)));

    const events = [], calls = [];
    const hits = [
      { targetId: 'e', segments: [{ shotIndex: 2, hit: true }, { shotIndex: 0, hit: false }] },
      { targetId: 'f', segments: [{ shotIndex: 1, hit: true }] },
    ];
    const shots = [2, 0, 1].map(shotIndex => ({ shotIndex, aim: { x: shotIndex + 1, y: 4 } }));
    const ctx = {
      hits, result: { shots }, skill: { range: { type: '单体' } }, centerOf: () => ({ x: 0, y: 4 }), casterId: 'c', ent: id => ({ id }), anchorAt: (x, y) => ({ x, y }),
      revealSegment: (id, index) => events.push([id, index]), reveal: id => events.push(id),
      wait: async ms => { events.push(ms); return true; }, awaitHandle: async () => true,
      avHost: { host: { spriteOf: id => id } },
      av: {
        playAttackIdentityFx({ scope, subtype, targets, outcomes, onImpact, areaBounds, suppressImpact }) {
          calls.push({ targets, areaBounds, suppressImpact });
          for (const target of targets) {
            events.push([scope, subtype, target.id ?? [target.x, target.y], outcomes(target)]);
            onImpact(target);
          }
        },
        CombatAudioMixer: { withContext: (_, play) => play() },
        async playArcaneProjectile(type, from, to, dodge) { events.push([type, from, to, dodge]); return true; },
      },
    };
    const play = fxTag => reg.resolve({ kind: 'action', fxTag }).play(ctx);
    const gunOk = await play('枪击');
    cases.push(ok('TFX-01 枪击依真实发序和转火逐发播放，命中回调揭示目标内对应段', gunOk &&
      j(events) === j([['single', '枪击', 'e', 'dodge'], ['e', 1], 200, ['single', '枪击', 'f', 'hit'], ['f', 0], 200, ['single', '枪击', 'e', 'hit'], ['e', 0]]), j(events)));
    events.length = 0;
    ctx.hits = [hits[0]];
    ctx.skill.range = { type: '扇形', castRange: 5 };
    shots.find(s => s.shotIndex === 1).aim = { x: 0, y: 6 };
    const shotgunOk = await play('霰弹');
    const directionalCalls = calls.slice(-3);
    cases.push(ok('TFX-01 霰弹按每发实际瞄向播放，保留无目标段并逐段揭示', shotgunOk && directionalCalls.every(c => c.suppressImpact) &&
      j(events) === j([['single', '霰弹', [5, 4], 'hit'], ['e', 1], 220, ['single', '霰弹', [0, 9], 'hit'], 220, ['single', '霰弹', [5, 4], 'hit'], ['e', 0]]), j(events)));
    events.length = 0;
    ctx.result = { aim: { x: 1, y: 4 } };
    ctx.hits = [{ targetId: 'e', hit: true }];
    ctx.skill.range = { type: '单体' };
    const fireOk = await play('火焰');
    const neutralOk = await play('未知特效') && await play(null);
    cases.push(ok('TFX-01 火焰复用原版弹道，未知和缺失标签只揭示命中', fireOk && neutralOk &&
      j(events) === j([['fire', 'c', 'e', false], ['e', 0], 'e', 'e']), j(events)));
    for (const [tag, subtype] of [['火焰', '火焰'], ['枪击', '枪击'], ['冰霜', '冰霜'], ['雷击', '雷'], ['爆炸', '爆炸'], ['光', '光'], ['霰弹', '霰弹']]) {
      events.length = 0;
      ctx.skill.range = { type: tag === '火焰' ? '圆形' : '单体' };
      const firstOk = await play(tag);
      const first = events.slice();
      events.length = 0;
      ctx.skill.range = { type: '圆形' };
      ctx.hits = [{ targetId: 'e', hit: true }, { targetId: 'f', hit: false }];
      const secondOk = await play(tag);
      const areaScope = tag === '霰弹' ? 'single' : 'aoe';
      cases.push(ok('TFX-01 原版播放接口按范围适配 ' + tag, firstOk && secondOk &&
        j(first) === j([[tag === '火焰' ? 'aoe' : 'single', subtype, 'e', 'hit'], ['e', 0]]) &&
        j(events) === j([[areaScope, subtype, 'e', 'hit'], ['e', 0], [areaScope, subtype, 'f', 'dodge'], ['f', 0]]), j({ first, events })));
      ctx.hits = [{ targetId: 'e', hit: true }];
    }
    events.length = 0;
    ctx.skill.range = { type: '爆炸', radius: 2 };
    ctx.result = { aim: { x: 9, y: 5 }, query: { blastCenter: { x: 5, y: 5 } } };
    const edgeOk = await play('爆炸');
    const edge = calls.at(-1);
    cases.push(ok('TFX-01 边缘单目标保留目标回调，爆心和直径取规则区域', edgeOk &&
      j(edge.targets) === j([{ id: 'e' }]) && Math.abs(edge.areaBounds.x - 250 / 0.72) < 1e-8 && Math.abs(edge.areaBounds.w - 200 / 0.72) < 1e-8 &&
      j(events) === j([['aoe', '爆炸', 'e', 'hit'], ['e', 0]]), j({ edge, events })));

    const vendor = readFileSync(path.join(ROOT, 'tactics', 'src', 'vendor', 'rpg-av', 'rpg-av.mjs'), 'utf8');
    const shotgunSource = vendor.slice(vendor.indexOf('    function playSingleShotgun('), vendor.indexOf('    // ===== ③ 单体(光)'));
    const layers = [], beats = [];
    const owner = { handle: {}, layer(html) { layers.push(html); return { querySelector() {}, querySelectorAll: () => [] }; },
      anim() {}, burst() { layers.push('impact burst'); }, audioAt: (_, callback) => callback() };
    const shotgun = new Function('entityVisualRect', 'IDENTITY_TIMINGS', 'identityRun', 'S', 'computeLineGeom', 'idSfx', 'rnd',
      shotgunSource + '\nreturn playSingleShotgun;')((rect) => rect, { shotgun: { impactMs: 115 } }, () => owner, { uid: 0 },
        () => ({ muzzle: { x: 0, y: 0 }, angleDeg: 0, ux: 1, uy: 0, nx: 0, ny: 1 }), () => {}, (a, b) => (a + b) / 2);
    const caster = { x: 0, y: 0, h: 28 }, endpoint = { x: 250, y: 0, h: 28 };
    shotgun(caster, endpoint, 'hit', (_, beat) => beats.push(beat.beatMs), true);
    const emptyLayers = layers.slice();
    layers.length = 0;
    shotgun(caster, endpoint, 'hit', (_, beat) => beats.push(beat.beatMs));
    cases.push(ok('TFX-01 vendor 空方向锚保留枪口与弹道、回调到拍，无弹坑或命中粒子',
      j(beats) === j([115, 115]) && emptyLayers.length === 2 && emptyLayers[1].includes('id-sg-pellet') &&
      layers.slice(2).some(html => html.includes('arcane-identity-puncture')) && layers.includes('impact burst'), j(beats)));
    const graded = reg.list().filter(e => e.grade !== 'identity');
    const budgets = graded.map(e => ({ id: e.id, grade: e.grade, ...checkBudget(e) }));
    cases.push(ok('TFX-01 分级预算：全部分级条目时长/蓄势/全屏/暗场/峰值音量落在本级区间', graded.length >= 5 && budgets.every(b => b.ok), j(budgets)));
    const fake = checkBudget({ id: 'fake', grade: 'L3', timeline: { totalMs: 1000, chargeMs: 200 }, cues: [{ key: 'x', vol: 0.95 }] });
    cases.push(ok('TFX-01 预算核对能抓出违规（防假绿）', !fake.ok && fake.reasons.length >= 3, j(fake)));
    let dup = null, bad = null;
    try { reg.register({ id: 'basic-枪击', grade: 'L1', play() {} }); } catch (e) { dup = e.message; }
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
    cases.push(ok('TFX-02 主动可用恰为 13 项（含 2 结界）；4 反应按真实原因拒绝（无"范围未迁移"遮挡）',
      j(usable) === j(['伊西斯之拥', '压缩爆燃', '召雷术', '圣域帷幕', '归尘礼赞', '拉莱耶造雾术', '提前瞄准', '灵风术', '精准流火', '纳克提特障壁术', '萨维奇三连发', '迅捷愈合法', '预备咏唱'].sort()) &&
      rejected.length === 4 && rejected.every(r => r.reason && r.reason !== '范围未迁移') &&
      rejBy('折影步') === '反应技能只能被动触发' && rejBy('双莲祛煞') === '反应技能只能被动触发' && rejBy('巫师护盾') === '反应技能只能被动触发' &&
      rejBy('净蚀反冲') === '反应技能只能被动触发', j({ usable, rejected })));
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
  // ---------- 典型对局权威样本首批（迅捷愈合 / 浓雾 / 归尘礼赞 / 召雷术 + 复验）：真实后端提交结果 → 注册表分发 ----------
  'TFX-03': { run({ modules: m }) {
    const cases = [];
    const { createFxRegistry, actionInput, prepareInput, checkBudget } = m.fxRegistry;
    const reg = m.fxLibrary.registerDefaultFx(createFxRegistry());
    const yaml = readFileSync(path.join(ROOT, 'doc', 'tactics', '典型对局-战棋版.yaml'), 'utf8');
    const block = m.parser.parseYamlText(yaml);
    const EL = 'h:埃利奥特';
    let data, b, el;
    // 每段独立开局（只有 AI 行动的模拟会消耗我方血量；长链会导致埃利奥特倒地而准备被规则清除）
    const fresh = () => {
      data = m.scenarioData.createScenarioData(m.parser.parseYamlText(yaml));
      data.placementsById[EL] = { col: 11, row: 31, facing: 0 };   // 推进到中殿，使首批目标处于射程/视野内
      b = m.battle.createBattle({ ...data, scene: m.chapelScene.CHAPEL_SCENE, random: m.scenarioData.createSeededRandom(data.seed) });
      b.start();
      el = data.units.find(u => u.id === EL);
    };
    fresh();
    const sk = n => el.skills.find(s => s.name === n);
    const reqs = [];
    const drive = (gen, answer = () => null) => { let s = gen.next(); while (!s.done) { reqs.push(s.value); s = gen.next(answer(s.value)); } return s.value; };
    const enemyTurn = () => { const plan = b.planEnemyAction(); if (plan && plan.moveTo) b.move(plan.moveTo.col, plan.moveTo.row); if (plan && plan.skill && b.snapshot().resources.main > 0) return drive(b.beginAttack(plan.skill, plan.aim)); return null; };
    const enemyResults = [];
    const toEl = (waitEnemies = false) => { let g = 0; while (b.snapshot().currentId !== EL && g++ < 60) { if (!waitEnemies && b.snapshot().currentId.startsWith('e:')) { const r = enemyTurn(); if (r) enemyResults.push(r); } b.endAction(); } };
    const center = id => { const p = b.snapshot().positions[id], u = data.units.find(x => x.id === id); return { x: p.col + u.footprint.width / 2, y: p.row + u.footprint.height / 2 }; };
    const prep = () => b.state.combatState.charges?.[EL]?.preparing || null;
    const pick = r => { const e = reg.resolve(actionInput(r)); return e && e.id; };

    toEl();
    cases.push(ok('TFX-03 页面入口识别典型对局对象格式（站位表）且旧切片数据不误判',
      m.main.isTypicalBlock(block) && !m.main.isTypicalBlock(m.parser.parseYamlText(m.fixture.DEMO_YAML)), ''));
    el.ref.hp -= 40;
    const heal = drive(b.beginAttack(sk('迅捷愈合法'), { ...center(EL), targetId: EL }));
    const healFx = heal.effects.find(e => e.kind === 'heal');
    cases.push(ok('TFX-03 迅捷愈合法：规则 effects 回复真值 → heal-mend(L2)，不走受击揭示',
      heal.ok && !heal.hits.length && healFx && healFx.value === 30 && heal.costSummary.aux === 1 && heal.costSummary.mp === 3 && pick(heal) === 'heal-mend', j({ ok: heal.ok, effects: heal.effects, cost: heal.costSummary, id: pick(heal) })));
    b.endAction(); toEl();   // 愈合与造雾同为辅助行动：分两次自然行动
    const fogBefore = (b.snapshot().regions || []).length;
    const fogAim = ['e:食尸鬼A', 'e:食尸鬼B', 'e:深潜者A'].map(center).find(c => b.previewAttack(sk('拉莱耶造雾术'), c).ok);
    const fog = drive(b.beginAttack(sk('拉莱耶造雾术'), fogAim));
    const fogEv = (fog.events || []).find(ev => ev.type === 'region-created');
    cases.push(ok('TFX-03 拉莱耶造雾术：region-created 真值（半径5·接触点）→ abyss-fog(L3)；由显式特效标签指定',
      fog.ok && fogEv && fogEv.region.type === 'fog' && fogEv.region.radius === 5 && pick(fog) === 'abyss-fog' && (b.snapshot().regions || []).length >= fogBefore,
      j({ ok: fog.ok, reason: fog.reason, region: fogEv && { r: fogEv.region.radius, c: fogEv.region.center }, id: pick(fog) })));
    const enemyFog = enemyResults.find(r => (r.events || []).some(ev => ev.type === 'region-created'));
    cases.push(ok('TFX-03 深潜者造雾显式浓雾标签同走 abyss-fog', !enemyFog || pick(enemyFog) === 'abyss-fog', j(enemyFog ? { skill: enemyFog.skill.name, id: pick(enemyFog) } : 'none')));
    // 蓄力分发单独验证：敌人等待，避免 AI 决策变化导致施法者在释放前死亡。
    fresh(); toEl(true);
    el.ref.tp = 80; el.ref.mp = 100;
    const target = ['e:食尸鬼B', 'e:食尸鬼A'].find(id => b.previewAttack(sk('归尘礼赞'), { ...center(id), targetId: id }).ok);
    const gs = drive(b.beginAttack(sk('归尘礼赞'), { ...center(target), targetId: target }));
    const gsEntry = reg.resolve(prepareInput(gs));
    cases.push(ok('TFX-03 归尘礼赞起手：延迟准备结果（未结算槽位、已扣 HP/MP/TP）→ holy-vow(L2)',
      gs.ok && gs.preparing && !gs.hits.length && gs.costSummary.hp === 10 && gs.costSummary.tp === 10 && gsEntry && gsEntry.id === 'holy-vow', j({ ok: gs.ok, reason: gs.reason, cost: gs.costSummary, id: gsEntry && gsEntry.id })));
    b.endAction(); toEl(true);
    const gr = drive(b.beginAttack(sk('归尘礼赞'), prep() ? prep().aim : { ...center(target), targetId: target }));
    cases.push(ok('TFX-03 归尘礼赞释放：必中穿透 + 降防效果真值 → holy-judgment(L4)',
      gr.ok && !gr.preparing && gr.hits.length === 1 && gr.hits[0].hit && gr.effects.some(e => e.tag === '降防') && pick(gr) === 'holy-judgment', j({ ok: gr.ok, reason: gr.reason, hits: gr.hits.map(h => [h.targetId, h.hit]), id: pick(gr) })));
    fresh(); toEl(true);
    el.ref.tp = 80; el.ref.mp = 100;
    const ts = drive(b.beginAttack(sk('召雷术'), center('e:食尸鬼A')));
    const tsEntry = ts.ok && reg.resolve(prepareInput(ts));
    let waited = 0;
    while (prep() && !prep().ready && waited++ < 3) { b.endAction(); toEl(true); }
    const tr = prep() ? drive(b.beginAttack(sk('召雷术'), prep().aim)) : { ok: false, reason: '准备丢失', hp: el.ref.hp, cur: b.snapshot().currentId, log: b.snapshot().log.slice(-8) };
    cases.push(ok('TFX-03 召雷术：延迟2起手 → storm-gather(L2)；后续自然行动自动投入（含加速库存）就绪后释放 → thunder-storm(L3)，麻痹效果真值',
      ts.ok && ts.preparing && tsEntry && tsEntry.id === 'storm-gather' && waited >= 1 && waited <= 2 && tr.ok && tr.hits.length > 0 && tr.effects.some(e => e.tag === '麻痹') && pick(tr) === 'thunder-storm',
      j({ start: ts.ok && ts.reason, waited, release: tr.ok, reason: tr.reason, hits: (tr.hits || []).length, id: tr.ok && pick(tr), hp: tr.hp, cur: tr.cur, log: tr.log })));
    const graded = reg.list().filter(e => ['heal-mend', 'abyss-fog', 'holy-vow', 'storm-gather', 'holy-judgment', 'thunder-storm'].includes(e.id));
    const budgets = graded.map(e => ({ id: e.id, grade: e.grade, ...checkBudget(e) }));
    cases.push(ok('TFX-03 首批新条目分级预算（L2/L3/L4 时长、蓄势、全屏/暗场、峰值音量）全部达标', graded.length === 6 && budgets.every(x => x.ok), j(budgets)));
    // 反应请求：规则只读承伤预览与候选绑定（弹窗只显示不计算）
    const withPreview = reqs.filter(r => r && r.type === 'reaction');
    const pv = withPreview.map(r => r.preview).filter(Boolean);
    cases.push(ok('TFX-03 反应请求携带本段只读承伤预览（min≤max、0.8/1.2 两端）与候选绑定存量',
      withPreview.length > 0 && pv.length === withPreview.length && pv.every(p => p.hpMin <= p.hpMax && p.rawMin <= p.rawMax) && withPreview.every(r => r.candidates.every(c => Array.isArray(c.bindings))),
      j({ n: withPreview.length, sample: pv[0] })));
    const rp = m.reactionPrompt;
    const kinds = [rp.candidateKind({ skill: { name: 'a' } }), rp.candidateKind({ skill: { name: 'b', kanpoTarget: '法术' } }), rp.candidateKind({ guardian: true, skill: { name: 'c', sheshenTarget: 'all' } })];
    const auto = rp.autoPickChoice({ responderId: 't', candidates: [{ skill: { name: 'g' }, responderId: 'guard', guardian: true }] });
    cases.push(ok('TFX-03 反应弹窗候选分类（反应/看破/舍身）与自动选择回传候选自身 responderId',
      j(kinds) === j(['reaction', 'kanpo', 'sheshen']) && auto && auto.responderId === 'guard', j({ kinds, auto })));
    return { cases };
  } },
};
