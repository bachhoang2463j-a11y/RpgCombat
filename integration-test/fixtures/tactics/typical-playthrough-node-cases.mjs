// 典型对局·战棋版：用真实样本、真实资源、固定种子，通过公开后端动作跑完整一局。
// 英雄 controller 保持 player，本 driver 只负责选动作；不修改战场/HP/MP/弹药，不跳敌回合。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYamlText } from '../../../tactics/src/parser.mjs';
import { createScenarioData, createSeededRandom } from '../../../tactics/src/scenario-data.mjs';
import { createBattle, BASIC_ATTACK, itemAsSkill } from '../../../tactics/src/battle.mjs';
import { CHAPEL_SCENE } from '../../../tactics/src/chapel-scene.mjs';
import { chooseEnemyAction } from '../../../tactics/src/ai.mjs';

const SAMPLE_URL = new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url);
const REPORT_URL = new URL('./reports/TYPICAL-BATTLE-playthrough.json', import.meta.url);
// 未看见敌人时沿固定已知地图路径推进：南入口 → 中殿 → 北厅（不引用隐藏敌人坐标）。
const WAYPOINTS = [{ col: 12, row: 30 }, { col: 12, row: 22 }, { col: 11, row: 14 }, { col: 11, row: 8 }];
// maxBatches=900：仅测试驱动防死循环上限，非游戏规则限制。
const SEED = 20261123;
const MAX_BATCHES = 900;
const WITH_SUMMONS = process.argv.includes('--with-summons');

function buildBattle() {
  const data = createScenarioData(parseYamlText(fs.readFileSync(SAMPLE_URL, 'utf8')));
  return createBattle({ ...data, scene: CHAPEL_SCENE, random: createSeededRandom(data.seed ?? SEED) });
}

function liveEnemies(b, id) {
  return b.ctx.units.filter(u => u.side === 'enemy' && u.ref.hp > 0 && b.ctx.canSeeUnit(id, u.id));
}

function resOf(b, id) {
  const e = b.getEffectiveUnit(id);
  if (!e) return null;
  const snap = b.snapshot();
  const withRes = snap.currentId === id && snap.resources;
  return { hp: e.hp, mp: e.mp, tp: e.tp,
    main: withRes ? snap.resources.main : null,
    aux: withRes ? snap.resources.aux : null,
    move: withRes ? snap.resources.moveRemaining : null };
}

function decide(b, id) {
  const snap = b.snapshot();
  const u = b.ctx.units.find(x => x.id === id);
  const itemSkills = WITH_SUMMONS ? u.items.filter(it => it.category !== '弹药' && !it.bindings?.length).flatMap(it => it.children?.length ? it.children.map(c => itemAsSkill(it, c)) : [itemAsSkill(it)]) : [];
  const skills = [...(u.skills || []), ...itemSkills, BASIC_ATTACK].filter(s => s && b.canUseSkill(s).ok);
  return chooseEnemyAction(b.ctx, id, snap.resources ? snap.resources.moveRemaining : 0, skills,
    s => b.canUseSkill(s), { ...(snap.resources || {}), preparing: null, moveDistance: u.ref.moveDistance });
}

function waypointMove(b, rec, actor) {
  const snap = b.snapshot();
  const cur = b.ctx.placementsById[actor];
  if (!snap.resources || !cur) return false;
  const north = WAYPOINTS.filter(w => w.row < cur.row - 0.01);
  const target = north.length ? north.reduce((a, w) => (w.row > a.row ? w : a)) : WAYPOINTS[WAYPOINTS.length - 1];
  let cells = [];
  try { cells = (b.reachable() || {}).cells || []; } catch { cells = []; }
  let best = null, bestD = Infinity;
  for (const c of cells) {
    if (!c || (c.col === cur.col && c.row === cur.row)) continue;
    const d = Math.hypot(c.col - target.col, c.row - target.row);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return false;
  const before = resOf(b, actor);
  const m = b.move(best.col, best.row);
  if (!m || !m.ok) return false;
  rec.push({ n: rec.length + 1, actor, action: 'move', col: best.col, row: best.row, before, after: resOf(b, actor) });
  return true;
}

function answerReaction(req) {
  const candidate = req.candidates.find(c => c.skill.type === '[护盾]') || req.candidates[0];
  return candidate ? { responderId: candidate.responderId, skill: candidate.skill } : null;
}
function drive(gen) { let s = gen.next(); while (!s.done) s = gen.next(answerReaction(s.value)); return s.value; }

function heroStep(b, rec, actor) {
  const current = b.ctx.units.find(u => u.id === actor);
  const preparation = b.snapshot().preparation;
  if (preparation && !preparation.ready) return false;
  if (preparation?.ready) {
    const target = liveEnemies(b, actor)[0];
    if (!target) return false;
    const before = resOf(b, actor);
    const p = b.ctx.placementsById[target.id];
    const r = b.attack(preparation.skill, { x: p.col + target.footprint.width / 2, y: p.row + target.footprint.height / 2, targetId: target.id }, { policy: 'auto' });
    rec.push({ n: rec.length + 1, actor, action: 'attack', skillName: preparation.skill.name, skillRef: preparation.skill, aim: { x: p.col + target.footprint.width / 2, y: p.row + target.footprint.height / 2, targetId: target.id }, ok: r.ok, before, after: resOf(b, actor) });
    return r.ok;
  }
  const summonUses = (WITH_SUMMONS ? current.items : []).flatMap(it => it.children?.length ? it.children.map(c => itemAsSkill(it, c)) : [itemAsSkill(it)])
    .filter(s => s?.summonTarget && b.canUseSkill(s).ok);
  for (const skill of summonUses) {
    const cell = b.reachable().cells.find(c => c.cost > 0 && b.previewAttack(skill, { x: c.col + 0.5, y: c.row + 0.5 }).ok);
    if (!cell) continue;
    const aim = { x: cell.col + 0.5, y: cell.row + 0.5 }, before = resOf(b, actor);
    const r = b.attack(skill, aim, { policy: 'auto' });
    rec.push({ n: rec.length + 1, actor, action: 'attack', skillName: skill.name, skillRef: skill, aim, ok: r.ok, before, after: resOf(b, actor) });
    if (r.ok) return true;
  }
  const vis = liveEnemies(b, actor);
  if (!vis.length) return waypointMove(b, rec, actor);
  const choice = decide(b, actor);
  if (!choice || choice.action === 'wait' || (!choice.moveTo && !choice.skill && !choice.action)) {
    return waypointMove(b, rec, actor);
  }
  let acted = false;
  if (choice.moveTo) {
    const before = resOf(b, actor);
    const m = b.move(choice.moveTo.col, choice.moveTo.row);
    if (!m || !m.ok) return acted;
    rec.push({ n: rec.length + 1, actor, action: 'move', col: choice.moveTo.col, row: choice.moveTo.row, before, after: resOf(b, actor) });
    acted = true;
    if (m.stoppedOnDiscovery) return acted;
  }
  if (choice.action === 'sprint') {
    const before = resOf(b, actor); b.sprint();
    rec.push({ n: rec.length + 1, actor, action: 'sprint', before, after: resOf(b, actor) }); acted = true;
  } else if (choice.action === 'defend') {
    const before = resOf(b, actor); b.defend();
    rec.push({ n: rec.length + 1, actor, action: 'defend', before, after: resOf(b, actor) }); acted = true;
  } else if (choice.skill) {
    const before = resOf(b, actor);
    const r = b.attack(choice.skill, choice.aim, { policy: 'auto' });
    rec.push({ n: rec.length + 1, actor, action: 'attack', skillName: choice.skill.name, skillRef: choice.skill,
      aim: choice.aim || null, ok: !!(r && r.ok), before, after: resOf(b, actor) });
    acted = true;
  }
  return acted;
}

function playHeroTurn(b, rec, actor) {
  for (let i = 0; i < 12; i++) {
    const s0 = b.snapshot();
    if (s0.terminal || !s0.resources || s0.currentId !== actor) break;
    const before = JSON.stringify([b.ctx.placementsById[actor], resOf(b, actor)]);
    const acted = heroStep(b, rec, actor);
    const s1 = b.snapshot();
    if (s1.terminal || s1.currentId !== actor) break;
    const r2 = s1.resources;
    if (!r2) break;
    const after = JSON.stringify([b.ctx.placementsById[actor], resOf(b, actor)]);
    if (r2.main < 1 && r2.aux < 1 && r2.moveRemaining < 1e-6) break;
    if (!acted && after === before) break;
    if (after === before && i > 0) break;
  }
  const s2 = b.snapshot();
  if (!s2.terminal && s2.currentId === actor) {
    const before = resOf(b, actor);
    b.endAction();
    rec.push({ n: rec.length + 1, actor, action: 'endAction', before, after: null });
  }
}

function play(b, rec) {
  let guard = 0;
  while (guard++ < MAX_BATCHES) {
    const snap = b.snapshot();
    if (snap.terminal) break;
    const id = snap.currentId;
    if (!id) { b.endAction(); rec.push({ n: rec.length + 1, actor: null, action: 'endAction', before: null, after: null }); continue; }
    const u = b.ctx.units.find(x => x.id === id);
    if (!u) { b.endAction(); rec.push({ n: rec.length + 1, actor: id, action: 'endAction', before: null, after: null }); continue; }
    if (u.side === 'enemy') {
      const before = resOf(b, id);
      if (WITH_SUMMONS) drive(b.beginEnemyTurn({ autoAnswer: answerReaction }));
      else b.runEnemyTurn();
      rec.push({ n: rec.length + 1, actor: id, action: 'enemyTurn', before, after: resOf(b, id) });
    } else {
      playHeroTurn(b, rec, id);
    }
  }
  return rec;
}

function sig(b) {
  const s = b.snapshot();
  return JSON.stringify({
    terminal: !!s.terminal, currentId: s.currentId,
    units: s.units.map(u => [u.id, u.side, u.hp, u.mp, u.tp, u.status]).sort(),
    pos: Object.keys(s.positions).sort().map(k => [k, s.positions[k].col, s.positions[k].row]),
  });
}

function summarize(b) {
  const s = b.snapshot();
  const heroes = s.units.filter(u => u.side === 'hero');
  const enemies = s.units.filter(u => u.side === 'enemy');
  const heroesAlive = heroes.filter(u => u.hp > 0).length;
  const enemiesAlive = enemies.filter(u => u.hp > 0).length;
  let result = 'unfinished';
  if (s.terminal || enemiesAlive === 0 || heroesAlive === 0) {
    if (enemiesAlive === 0 && heroesAlive > 0) result = 'win';
    else if (heroesAlive === 0) result = 'lose';
    else result = 'ended';
  }
  return { terminal: !!s.terminal, result, heroesAlive, enemiesAlive,
    heroes: heroes.map(u => ({ id: u.id, name: u.name, hp: u.hp, mp: u.mp, tp: u.tp, status: u.status })),
    enemies: enemies.map(u => ({ id: u.id, name: u.name, hp: u.hp, status: u.status })),
    positions: s.positions, regions: (s.regions || []).length };
}

function captureOpening(b) {
  return b.ctx.units.map(u => ({ id: u.id, maxHp: u.ref.maxHp ?? u.ref.hp, maxMp: u.ref.maxMp ?? u.ref.mp,
    maxTp: u.ref.maxTp ?? 100, items: (u.items || []).map(it => ({ name: it.name, count: it.count ?? null, uses: it.usesRemaining ?? null })) }));
}

function checkResources(b, opening) {
  const issues = [];
  for (const rec of opening) {
    const e = b.getEffectiveUnit(rec.id);
    if (!e) continue;
    if (e.hp > rec.maxHp + 1e-9) issues.push(rec.id + ' HP超上限');
    if (e.mp > rec.maxMp + 1e-9) issues.push(rec.id + ' MP超上限');
    if (e.tp > rec.maxTp + 1e-9) issues.push(rec.id + ' TP超上限');
    const u = b.ctx.units.find(x => x.id === rec.id);
    for (const snap of rec.items) {
      const it = (u.items || []).find(x => x.name === snap.name);
      if (!it) continue;
      if (snap.count != null && it.count > snap.count) issues.push(rec.id + ' ' + snap.name + ' 数量增加');
      if (snap.uses != null && it.usesRemaining > snap.uses) issues.push(rec.id + ' ' + snap.name + ' 次数增加');
    }
  }
  return issues;
}

function run() {
  const cases = [];
  const push = (id, pass, detail) => cases.push({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  const report = { seed: SEED, route: WITH_SUMMONS ? 'summons-and-reactions' : 'baseline-no-hero-reactions', scene: 'sc-chapel', sample: 'doc/tactics/典型对局-战棋版.yaml', startedAt: new Date().toISOString(), actions: [] };
  let summary = null, detOk = null;
  const errors = [];
  const t0 = Date.now();
  try {
    const b = buildBattle();
    const start = b.start();
    report.opening = { units: start.units.length,
      heroes: start.units.filter(u => u.side === 'hero').length,
      enemies: start.units.filter(u => u.side === 'enemy').length,
      tpAllZero: start.units.every(u => (u.tp || 0) === 0), seed: SEED };
    const opening = captureOpening(b);
    const rec = [];
    play(b, rec);
    summary = summarize(b);
    const resourceIssues = checkResources(b, opening);
    const sig1 = sig(b);
    report.summary = summary;
    report.turns = rec.length;
    report.resourceIssues = resourceIssues;
    report.actions = rec.map(e => ({ n: e.n, actor: e.actor, action: e.action, skill: e.skillName || null,
      move: e.action === 'move' ? { col: e.col, row: e.row } : null, before: e.before, after: e.after }));
    b.reset();
    for (const e of rec) {
      if (e.action === 'move') b.move(e.col, e.row);
      else if (e.action === 'sprint') b.sprint();
      else if (e.action === 'defend') b.defend();
      else if (e.action === 'attack') b.attack(e.skillRef, e.aim || undefined, { policy: 'auto' });
      else if (e.action === 'enemyTurn') {
        if (WITH_SUMMONS) drive(b.beginEnemyTurn({ autoAnswer: answerReaction }));
        else b.runEnemyTurn();
      }
      else if (e.action === 'endAction') b.endAction();
    }
    detOk = sig1 === sig(b);
    report.replayConsistent = detOk;
    push('TT-PLAY 真实样本完整跑完一局', rec.length > 0 && (summary.terminal || summary.result !== 'unfinished'),
      'result=' + summary.result + ' turns=' + rec.length);
    push('TT-PLAY 达成击败全部6敌的胜利', summary.result === 'win',
      'result=' + summary.result + ' 存活敌=' + summary.enemiesAlive + ' 存活英雄=' + summary.heroesAlive);
    push('TT-PLAY 资源守恒（无HP/MP/TP超限或库存增加）', resourceIssues.length === 0,
      resourceIssues.slice(0, 12).join('; ') || 'ok');
    push('TT-PLAY 同种子同操作重放一致', detOk, detOk ? 'signature identical' : 'signature mismatch');
    push('TT-PLAY 每行动均有机器可读记录', rec.length > 0 && rec.every(e => e.n && e.action), 'records=' + rec.length);
  } catch (err) {
    errors.push(String((err && err.stack) || err));
  }
  report.errors = errors;
  report.elapsedMs = Date.now() - t0;
  try {
    const dir = path.dirname(fileURLToPath(REPORT_URL));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REPORT_URL, JSON.stringify(report, null, 2));
  } catch (e) { errors.push('report write: ' + String(e)); }
  if (errors.length) push('TT-PLAY 运行未抛异常', false, errors[0].split('\n').slice(0, 4).join(' | '));
  return { cases };
}

export const groups = { 'TT-PLAY': { run } };
export { run };

const selfPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(selfPath)) {
  const result = groups['TT-PLAY'].run();
  console.log(JSON.stringify(result.cases, null, 2));
  if (!result.cases.length || result.cases.some(c => !c.pass)) process.exitCode = 1;
}
