// ==========================================
// 战棋视听切片 Node 用例（TAV-01～TAV-06）：人物/媒体映射、语音表、攻击身份与前摇分类、
// 连续移动几何、规则一次结算与敌方决策只读、范围几何副产物。
// 全部通过 deps.modules 导入 tactics/src 真模块；不 mock 引擎、不依赖浏览器。
// 视听"实际听到/看到"不在此验证（需真实桌面浏览器），这里只锁定数据契约与规则边界。
// ==========================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
const j = x => JSON.stringify(x);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// 用户确认的四名正式玩家头像（根 index.html AVATAR_MAP）
const EXPECTED_AVATARS = {
  '索恩': 'https://imgur.la/images/2026/08/13/77fcdf0fd006c4ff1ccae30774322270.png',
  '埃利奥特': 'https://imgur.la/images/2026/06/25/31a4dd84a831e3f76082542bf12fcf19.png',
  '玛德琳': 'https://imgur.la/images/2026/06/25/585bf7f2f1559168b419b8be56da36a6.png',
  '弗兰克': 'https://imgur.la/images/2026/06/25/26f001dbe399876cd74978bbe12a265b.png',
};

function demoView(m) {
  const { parseYamlText } = m.parser;
  const { DEMO_YAML, DEMO_PLACEMENTS } = m.fixture;
  const block = parseYamlText(DEMO_YAML);
  const scene = m.main.sceneForState(block.sceneId, {});
  return { block, view: m.main.buildViewData(block, block.heroes, scene, DEMO_PLACEMENTS, {}), scene };
}
function demoBattle(m, seed = 7) {
  const { view, scene } = demoView(m);
  const b = m.battle.createBattle({ units: view.units, placementsById: view.placementsById, scene, random: rng(seed) });
  b.start();
  return { b, view };
}

export const groups = {
  'TAV-01': { run({ modules: m }) {
    const cases = [];
    const { view } = demoView(m);
    const heroes = view.units.filter(u => u.side === 'hero');
    const enemies = view.units.filter(u => u.side === 'enemy');
    cases.push(ok('TAV-01 四名正式玩家（无先锋/术士占位）', j(heroes.map(u => u.name)) === j(['索恩', '埃利奥特', '玛德琳', '弗兰克']), j(heroes.map(u => u.name))));
    cases.push(ok('TAV-01 头像为 AVATAR_MAP 正确 URL（非首字/默认人像）', heroes.every(u => u.avatarUrl === EXPECTED_AVATARS[u.name]), j(heroes.map(u => [u.name, u.avatarUrl]))));
    cases.push(ok('TAV-01 敌方使用 emoji 且无头像外链', enemies.length === 4 && enemies.every(u => u.emoji && !u.avatarUrl), j(enemies.map(u => [u.id, u.emoji]))));
    cases.push(ok('TAV-01 敌方 ID 去 emoji 派生，与站位键对齐', j(enemies.map(u => u.id)) === j(['e:守卫', 'e:弓手', 'e:邪术师', 'e:斥候']), j(enemies.map(u => u.id))));
    const guard = view.units.find(u => u.id === 'e:守卫');
    cases.push(ok('TAV-01 大型敌人保留 2×2 真实占地', guard && guard.footprint.width === 2 && guard.footprint.height === 2, j(guard && guard.footprint)));
    cases.push(ok('TAV-01 单位视图未引入首字兜底', !/fallbackAvatar|data:image\/svg\+xml/.test(readFileSync(path.join(ROOT, 'tactics', 'src', 'unit-view.mjs'), 'utf8')), ''));
    return { cases };
  } },

  'TAV-02': { run({ modules: m }) {
    const cases = [];
    const V = m.vendor.RPG_HERO_VOICE_LINES;
    cases.push(ok('TAV-02 四人语音表完整（first + turn×3 + low×3）', ['索恩', '埃利奥特', '玛德琳', '弗兰克'].every(n => V[n] && V[n].first && V[n].turn.length === 3 && V[n].low.length === 3), j(Object.keys(V))));
    cases.push(ok('TAV-02 埃利奥特 first = 开始回合.wav（不存在"第一回合"文件）', V['埃利奥特'].first === '埃利奥特/埃利奥特_开始回合.wav', V['埃利奥特'].first));
    const vendorText = readFileSync(path.join(ROOT, 'tactics', 'src', 'vendor', 'rpg-av', 'rpg-av.mjs'), 'utf8');
    const missingKeys = m.avHost.DEMO_AUDIO_KEYS.filter(k => !new RegExp("^\\s*'" + k + "'\\s*:", 'm').test(vendorText));
    cases.push(ok('TAV-02 显式预载清单全部是回合制 audioUrls 已有键', missingKeys.length === 0, j(missingKeys)));
    cases.push(ok('TAV-02 预载清单有界（不预载整库）', m.avHost.DEMO_AUDIO_KEYS.length < 60, String(m.avHost.DEMO_AUDIO_KEYS.length)));
    // 语音文件确实存在于 my_assets（本地权威目录）
    const assets = path.resolve(ROOT, '..', 'my_assets');
    let missingFiles = [];
    try {
      for (const cfg of Object.values(V)) for (const f of [cfg.first, ...cfg.turn, ...cfg.low]) { try { readFileSync(path.join(assets, f)); } catch (e) { missingFiles.push(f); } }
      cases.push(ok('TAV-02 语音文件在 my_assets 中实际存在', missingFiles.length === 0, j(missingFiles)));
    } catch (e) { cases.push(ok('TAV-02 语音文件在 my_assets 中实际存在', false, String(e))); }
    return { cases };
  } },

  'TAV-03': { run({ modules: m }) {
    const cases = [];
    const { view } = demoView(m);
    const { resolveAttackIdentity, resolveWindupKind } = m.director;
    // 身份回归选取真实攻击槽，治疗等新可用支援技能不冒充枪击身份。
    const skillOf = (id) => { const s = view.units.find(u => u.id === id).skills; return s.find(x => m.battle.skillSupport(x).ok && [x.type, x.type2, x.type3].some(t => /伤害|穿透|散射|眩晕/.test(t))) || s[0]; };
    for (const u of view.units) {
      const sk = skillOf(u.id);
      const r = resolveAttackIdentity(sk, u.side);
      cases.push(ok('TAV-03 攻击身份仅由显式特效标签决定 ' + u.id,
        !!sk.fxTag && r.mode === 'tag' && r.subtype === sk.fxTag, j(r)));
    }
    const legacy = { type: '[伤害(枪击)]', damageType: '法术', range: { type: '扇形' } };
    cases.push(ok('TAV-03 无标签不根据伤害或旧括号猜测演出',
      resolveAttackIdentity(legacy, 'hero').subtype === null, j(resolveAttackIdentity(legacy, 'hero'))));
    cases.push(ok('TAV-03 特效标签覆盖旧括号且与伤害类型无关',
      resolveAttackIdentity({ ...legacy, fxTag: '冰霜' }, 'hero').subtype === '冰霜', ''));
    const editedRows = [{ name: '枪击', fxTag: '枪击', type: '[枪击]', power: 75, cost: 2 },
      { name: '父道具', count: 3, children: [{ name: '用法', fxTag: '火焰', power: 20 }] }];
    m.main.applyEditorFxTags(editedRows, [{ name: '枪击', fxTag: '冰霜', type: '[诅咒]', power: 999, cost: 999 },
      { name: '父道具', count: 0, children: [{ name: '用法', fxTag: null, power: 999 }] }]);
    cases.push(ok('TAV-03 本场特效编辑仅覆写标签，规则与道具库存不变',
      editedRows[0].fxTag === '冰霜' && editedRows[0].type === '[枪击]' && editedRows[0].power === 75 && editedRows[0].cost === 2 &&
      editedRows[1].count === 3 && editedRows[1].children[0].fxTag === null && editedRows[1].children[0].power === 20, j(editedRows)));
    const basic = m.battle.BASIC_ATTACK;
    const rb = resolveAttackIdentity(basic, 'hero');
    cases.push(ok('TAV-03 普通攻击显式指定刀砍特效', basic.fxTag === '刀砍' && rb.mode === 'tag' && rb.subtype === '刀砍', j(rb)));
    const kinds = { 'e:守卫': 'red-wide', 'e:弓手': 'amber-single', 'e:邪术师': 'violet-single', 'e:斥候': 'red-single' };
    for (const [id, k] of Object.entries(kinds)) cases.push(ok('TAV-03 前摇 ' + id + ' → ' + k, resolveWindupKind(skillOf(id)) === k, resolveWindupKind(skillOf(id))));
    cases.push(ok('TAV-03 前摇单群以显式空间范围为准（旧"单体"标签不覆盖扇形）', /伤害/.test(skillOf('e:守卫').type) && resolveWindupKind(skillOf('e:守卫')) === 'red-wide', skillOf('e:守卫').type));
    cases.push(ok('TAV-03 普通攻击前摇 → red-single', resolveWindupKind(basic) === 'red-single', resolveWindupKind(basic)));
    return { cases };
  } },

  'TAV-04': { run({ modules: m }) {
    const cases = [];
    const { pathSegments, pathDuration, travelFraction, pointAtDistance } = m.motion;
    const path1 = [{ col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 3 }, { col: 4, row: 4 }];
    const segs = pathSegments(path1, { width: 1, height: 1 });
    cases.push(ok('TAV-04 路径逐段（3 段，不只终点）', segs.length === 3, String(segs.length)));
    cases.push(ok('TAV-04 斜段长度 √2，直段 1', Math.abs(segs[1].len - Math.SQRT2) < 1e-9 && Math.abs(segs[0].len - 1) < 1e-9, j(segs.map(s => s.len))));
    const corner = pointAtDistance(segs, 1);
    cases.push(ok('TAV-04 经过转角格中心（不直线穿墙）', Math.abs(corner.x - 3.5) < 1e-9 && Math.abs(corner.y - 2.5) < 1e-9, j(corner)));
    let mono = true, prev = -1;
    for (let t = 0; t <= 1.0001; t += 0.02) { const f = travelFraction(Math.min(1, t), 0.2); if (f < prev - 1e-12) mono = false; prev = f; }
    cases.push(ok('TAV-04 缓起缓停曲线单调且端点 0/1', mono && travelFraction(0, 0.2) === 0 && travelFraction(1, 0.2) === 1, ''));
    cases.push(ok('TAV-04 时长随路程增长（按段长保持速度）', pathDuration(pathSegments([{ col: 0, row: 0 }, { col: 6, row: 0 }], null)) > pathDuration(pathSegments([{ col: 0, row: 0 }, { col: 2, row: 0 }], null)), ''));
    const turnFacings = segs.map(s => Math.round(s.facing));
    cases.push(ok('TAV-04 每段独立朝向（右→右下→下）', j(turnFacings) === j([90, 135, 180]), j(turnFacings)));
    return { cases };
  } },

  'TAV-05': { run({ modules: m }) {
    const cases = [];
    // A. 移动返回真实路径与额度；动画不在规则层
    {
      const { b, view } = demoBattle(m);
      const s0 = b.snapshot();
      const hero = view.units.find(u => u.id === s0.currentId);
      cases.push(ok('TAV-05 开场玩家先手（玛德琳敏捷 120）', s0.currentId === 'h:玛德琳', s0.currentId));
      cases.push(ok('TAV-05 actionSerial 首次自然行动 = 1', s0.actionSerial === 1, String(s0.actionSerial)));
      const target = b.reachable().cells.filter(c => c.cost > 0).sort((a, c) => c.cost - a.cost)[0];
      const mv = b.move(target.col, target.row);
      cases.push(ok('TAV-05 move返回实际路径与扣费（发现新敌人可提前停止）', mv.ok && mv.cell.path.length >= 2 && Math.abs(mv.moveBefore - mv.moveAfter - mv.cell.cost) < 1e-9, j({ len: mv.cell.path.length, b: mv.moveBefore, a: mv.moveAfter })));
      cases.push(ok('TAV-05 移动不推进虚拟时间', b.snapshot().now === s0.now, ''));
      void hero;
    }
    // B. 攻击一次结算：hpBefore/hpAfter 与真值一致；预览不扣费
    {
      const { b, view } = demoBattle(m, 11);
      const id = b.snapshot().currentId;
      const me = view.units.find(u => u.id === id);
      // 礼拜堂中殿：守卫 2×2 占 (11,25)-(12,26)，施法者站其正南 3 格，视线无遮挡
      view.placementsById[id] = Object.assign(view.placementsById[id], { col: 12, row: 29 });
      const skill = me.skills[0];
      const tc = { x: 12, y: 26, targetId: 'e:守卫' };
      const mp0 = me.ref.mp, main0 = b.snapshot().resources.main;
      const pv = b.previewAttack(skill, tc);
      cases.push(ok('TAV-05 预览不扣 MP/主行动', me.ref.mp === mp0 && b.snapshot().resources.main === main0 && pv.ok, j({ ok: pv.ok, r: pv.reason })));
      const hpBefore = view.units.find(u => u.id === 'e:守卫').ref.hp;
      const res = b.attack(skill, tc);
      const h = res.hits[0];
      const guard = view.units.find(u => u.id === 'e:守卫');
      cases.push(ok('TAV-05 攻击结果含揭示所需字段且只结算一次', res.ok && h.hpBefore === hpBefore && h.hpAfter === guard.ref.hp && (h.hit ? h.hpBefore - h.hpAfter === h.hpDmg : h.hpDmg === 0), j(h)));
      cases.push(ok('TAV-05 攻击扣 MP 与主行动各一次', me.ref.mp === mp0 - skill.cost && b.snapshot().resources.main === main0 - 1, ''));
      cases.push(ok('TAV-05 战报行索引可供拍点揭示', typeof h.logIndex === 'number' && h.logEnd > h.logIndex && res.logTo >= h.logEnd, j({ li: h.logIndex, le: h.logEnd, lt: res.logTo })));
      // 攻击后用剩余移动撤回，额度不变
      const mvRest = b.snapshot().resources.moveRemaining;
      const back = b.reachable().cells.find(c => c.cost > 0 && c.cost <= mvRest);
      const mv = b.move(back.col, back.row);
      cases.push(ok('TAV-05 攻击后撤回只扣实际路程（额度不刷新不丢失）', mv.ok && Math.abs(mvRest - mv.cell.cost - b.snapshot().resources.moveRemaining) < 1e-9, j({ mvRest, cost: mv.cell.cost, left: b.snapshot().resources.moveRemaining })));
    }
    // C. 敌方决策只读；runEnemyTurn 与 plan+move+attack 同一命令链
    {
      const { b } = demoBattle(m, 3);
      for (let i = 0; i < 6 && b.snapshot().currentId && !b.snapshot().currentId.startsWith('e:'); i++) b.endAction();
      const s1 = b.snapshot();
      cases.push(ok('TAV-05 轮转到敌方行动', s1.currentId && s1.currentId.startsWith('e:'), s1.currentId));
      const before = j({ pos: s1.positions, units: s1.units, res: s1.resources });
      const plan = b.planEnemyAction();
      const after = j({ pos: b.snapshot().positions, units: b.snapshot().units, res: b.snapshot().resources });
      cases.push(ok('TAV-05 planEnemyAction 只读（位置/资源/HP 不变）', before === after && plan !== null, j(plan && { moveTo: plan.moveTo, skill: plan.skill && plan.skill.name })));
      const serial = s1.actionSerial;
      b.runEnemyTurn();
      cases.push(ok('TAV-05 敌方结束后进入下一次自然行动（actionSerial+1）', b.snapshot().actionSerial === serial + 1, String(b.snapshot().actionSerial)));
    }
    return { cases };
  } },

  'TAV-06': { run({ modules: m }) {
    const cases = [];
    const { b, view } = demoBattle(m, 5);
    const ctx = b.ctx;
    const thorne = view.units.find(u => u.id === 'h:索恩');
    const frank = view.units.find(u => u.id === 'h:弗兰克');
    // 礼拜堂几何：入口厅 rows 33-42 / 下窄廊 cols 10-13 rows 30-32；其余为实心外壁
    const qLine = m.range.queryAttack(ctx, 'h:索恩', thorne.skills[0], { x: 9.5, y: 28.5 });
    cases.push(ok('TAV-06 直线返回 shape（长/宽/方向）', qLine.ok && qLine.shape && qLine.shape.type === '直线' && qLine.shape.length === 10 && qLine.shape.width === 1, j(qLine.shape)));
    cases.push(ok('TAV-06 直线作用格不越过外壁（入口厅北墙后无格，窄廊除外）', qLine.cells.length > 0 && qLine.cells.every(c => c.row >= 33 || (c.col >= 10 && c.col <= 13 && c.row >= 30)), j(qLine.cells.filter(c => c.row < 33))));
    const qFan = m.range.queryAttack(ctx, 'h:弗兰克', frank.skills[0], { x: 12.5, y: 33.5 });
    cases.push(ok('TAV-06 扇形返回 shape（半径/角度/方向）', qFan.ok && qFan.shape.type === '扇形' && qFan.shape.radius === 5 && qFan.shape.angle === 60, j(qFan.shape)));
    const madeline = view.units.find(u => u.id === 'h:玛德琳');
    const qWall = m.range.queryAttack(ctx, 'h:玛德琳', madeline.skills[0], { x: 13.5, y: 28.5, targetId: 'e:斥候' });
    cases.push(ok('TAV-06 单体被墙阻挡时给出阻挡点（同一次查询）', !qWall.ok && qWall.blockedBy && qWall.blockedBy.type === 'wall' && qWall.blockedBy.point && qWall.blockedBy.point.y >= 31 && qWall.blockedBy.point.y <= 33.5, j({ r: qWall.reason, b: qWall.blockedBy })));
    view.placementsById['h:弗兰克'] = Object.assign(view.placementsById['h:弗兰克'], { col: 12, row: 29 });
    const qG = m.range.queryAttack(ctx, 'h:弗兰克', frank.skills[0], { x: 12, y: 26 });
    cases.push(ok('TAV-06 多格单位在作用区只算一个目标', qG.targetIds.filter(x => x === 'e:守卫').length <= 1, j(qG.targetIds)));
    return { cases };
  } },
};
