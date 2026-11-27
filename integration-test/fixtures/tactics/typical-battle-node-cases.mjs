// 典型对局后端：真实规则断言，局内不复制结算公式或修改资源来冒充技能成功。
import fs from 'node:fs';
import { parseYamlText, parseSkill, parseItem } from '../../../tactics/src/parser.mjs';
import { createScenarioData, createSeededRandom } from '../../../tactics/src/scenario-data.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { chargePath } from '../../../tactics/src/movement.mjs';
import { queryAttack } from '../../../tactics/src/range.mjs';
import { chooseEnemyAction } from '../../../tactics/src/ai.mjs';
import { CHAPEL_SCENE } from '../../../tactics/src/chapel-scene.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';
import { advanceToNextAction, createClock, dispatchClock, getUnitNextActionAt } from '../../../tactics/src/clock.mjs';
import { settlePhase12 } from '../../../tactics/src/scheduler.mjs';
import { emptyBattleState } from '../../../tactics/src/lifecycle.mjs';

const sample = () => createScenarioData(parseYamlText(fs.readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8')));
const map = objects => ({ sceneId: 'tt-battle', grid: { columns: 30, rows: 18, metersPerCell: 1 }, ground: {}, objects: objects || [] });
const aim = (b, id) => ({ ...unitCenter(b.ctx.placementsById[id], b.ctx.footprintsById[id]), targetId: id });
function unit(id, side, opts = {}) {
  return { id, name: id, side, controller: opts.controller || 'player', classType: opts.classType || null,
    footprint: opts.footprint || { width: 1, height: 1 }, attrTags: opts.attrTags || [], skills: opts.skills || [], items: opts.items || [],
    ref: { hp: opts.hp ?? 1000, maxHp: opts.hp ?? 1000, mp: opts.mp ?? 110, maxMp: opts.mp ?? 110,
      tp: opts.tp ?? 0, maxTp: 100, atk: opts.atk ?? 20, def: opts.def ?? 0, spd: opts.spd ?? 100,
      evasion: 0, strength: 50, totalWeight: 70, perception: 100, moveDistance: opts.moveDistance ?? 6, shield: opts.shield ?? 0 } };
}
function make(units, placements, options = {}) {
  const b = createBattle({ units, placementsById: placements, scene: map(options.objects), random: options.random || (() => 0.5), ...options });
  b.start(); return b;
}
function drive(gen, choose = () => null) { let s = gen.next(); while (!s.done) s = gen.next(choose(s.value)); return s.value; }
function nextActor(b, id) { for (let i = 0; i < 40 && b.snapshot().currentId !== id; i++) b.endAction(); }

function run() {
  const cases = [];
  const check = (id, pass, detail = '') => cases.push({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  {
    const charger = unit('charge', 'hero', { spd: 200, footprint: { width: 2, height: 2 } });
    const foe = unit('foe', 'enemy', { footprint: { width: 2, height: 2 } });
    const ally = unit('ally', 'hero');
    const skill = parseSkill('【冲锋】[钝击;power:40][近战][位移:冲锋;距离:6][范围:直线;长度:6;宽度:2]');
    const positions = { charge: { col: 2, row: 5 }, ally: { col: 4, row: 5 }, foe: { col: 8, row: 6 } };
    const objects = [{ id: 'counter', kind: 'lowCounter', bounds: { col: 5, row: 5, width: 1, height: 1 } }];
    const b = make([charger, foe, ally], structuredClone(positions), { objects });
    const point = { x: 8.5, y: 6.5, targetId: 'foe' };
    const q = b.previewAttack(skill, point);
    check('TT-B 2×2 冲锋量化后扫过友军和低障，触及横向边格', q.ok && q.shape.dir === 0
      && q.damageTargetIds.join(',') === 'foe' && q.cells.some(c => c.col === 8 && c.row === 6), q);
    const wall = make([charger, foe, ally], structuredClone(positions), { objects: [
      { id: 'wall', kind: 'wall', bounds: { col: 7, row: 5, width: 1, height: 1 } },
    ] });
    const wallPath = chargePath(wall.ctx, 'charge', point, 6);
    check('TT-B 2×2 冲锋任一占格撞实墙即截停', wallPath.path.at(-1).col === 5
      && wallPath.blockingEntries.some(e => e.type === 'terrain') && !wall.previewAttack(skill, point).ok, wallPath);
    const r = b.attack(skill, point);
    const move = r.events.find(e => e.type === 'unit-charged');
    check('TT-B 冲过友军，对连续两步扫到的2×2敌人只命中一次，最后落在空位', r.ok
      && r.hits.map(h => h.targetId).join(',') === q.damageTargetIds.join(',') && r.hits[0].segments.length === 1
      && move.to.col === 6 && move.path.some(p => p.col === 8) && move.path.at(-1).col === 6
      && r.hits[0].segments[0].chargeStep === move.path.findIndex(p => p.col === 7), { hits: r.hits, move });
  }
  {
    const beast = sample().summonProvider('幻梦行军兽');
    const skill = beast.skills.find(s => s.name === '冲撞');
    const charger = unit('ai-charge', 'enemy', { spd: 100, controller: 'ai', footprint: beast.footprint, skills: [skill] });
    const target = unit('ai-target', 'hero', { spd: 200 });
    const b = make([charger, target], { 'ai-charge': { col: 2, row: 5 }, 'ai-target': { col: 7, row: 5 } });
    const barrier = parseSkill('【障壁】[肃正:近战;power:200;Armor:40][范围:圆形;半径:2]');
    b.attack(barrier); b.endAction(); nextActor(b, charger.id);
    const action = chooseEnemyAction(b.ctx, charger.id, 0, [skill]);
    const q = queryAttack(b.ctx, charger.id, skill, aim(b, target.id));
    const r = action.skill && b.attack(action.skill, action.aim);
    check('TT-B AI 读取共享扫掠攻击结界内目标，实际穿界命中而不是打结界', q.damageTargetIds.join(',') === target.id
      && action.skill === skill && !action.moveTo && r?.hits[0]?.hit && r.hits[0].targetId === target.id
      && b.ctx.barriers[0].integrity === 200 && r.events.find(e => e.type === 'unit-charged').to.col === 8, { action, hits: r?.hits });
  }
  {
    const d = sample(); const b = createBattle({ ...d, scene: CHAPEL_SCENE, random: createSeededRandom(d.seed) });
    const s = b.start();
    check('TT-B 开场四英雄六敌，资源原值TP0', s.units.length === 10 && d.units.every(u => u.ref.tp === 0), s.units.map(u => [u.name, u.hp, u.mp]));
    check('TT-B 权威样本包含巫师护盾', d.units[0].skills.some(s => s.name === '巫师护盾'));
    const ruleState = snap => {
      const { runId, resetEvents, events, ...state } = snap;
      return JSON.stringify({ ...state, events: events.map(({ runId, eventId, actionId, ...event }) => event) });
    };
    const reset = b.reset();
    check('TT-B reset同种子恢复状态', ruleState(reset) === ruleState(s));
    check('TT-B reset切换展示代际，不重用旧事件身份', reset.runId !== s.runId);
  }
  {
    const h = unit('h', 'hero', { spd: 200, moveDistance: 8 }); const e = unit('e', 'enemy');
    const b = make([h,e], { h: {col:2,row:4}, e:{col:18,row:4} });
    const before = b.snapshot().resources.moveRemaining;
    const q = b.jump(5,4);
    check('TT-B 跳跃ceil(8/3)=3且不耗移动', q.ok && b.snapshot().resources.moveRemaining === before && b.snapshot().resources.aux === 0);
    check('TT-B 一行动只能跳一次', !b.jump(6,4).ok);
  }
  {
    const flying = parseSkill('【飞行】[赋予:飞行][MP:1][Turns:10][范围:自身]');
    const h = unit('h','hero',{spd:200,moveDistance:6}); const e = unit('e','enemy',{spd:50});
    const b=make([h,e],{h:{col:2,row:4},e:{col:20,row:4}});
    b.attack(flying); b.endAction(); nextActor(b,'h');
    check('TT-B 飞行下自然移动9米跳距仍2米', b.snapshot().resources.moveRemaining===9 && !b.previewJump(5,4).ok);
  }
  {
    const guard=parseSkill('【免】[免伤;power:120][反应:法术][范围:自身]');
    const h=unit('h','hero',{spd:200}); const e=unit('e','enemy',{def:10,shield:20,skills:[guard]});
    const b=make([h,e],{h:{col:2,row:4},e:{col:5,row:4}});
    const tri=parseSkill('【三段】[火焰;power:60][火焰;power:60][火焰;power:60][法术][范围:单体;射程:12]');
    let n=0;
    const r=drive(b.beginAttack(tri,aim(b,'e')),req=> (++n===1 ? {skill:req.candidates[0].skill}:null));
    check('TT-B 整技免伤按甲后逐段扣120', r.hits[0].segments.map(s=>s.hpDmg).join(',')==='0,0,10',r.hits[0].segments);
    check('TT-B 整技结束免伤无残留',!b.buffsOf('e').some(x=>x.type==='damageGuard'));
    check('TT-B 三段均可反应，护盾仅剩余伤害扣',n===3 && e.ref.shield===0);
  }
  {
    const shield=parseSkill('【盾】[护盾;power:180][MP:4][反应][范围:自身]');
    const h=unit('h','hero',{spd:200}); const e=unit('e','enemy',{skills:[shield]});
    const b=make([h,e],{h:{col:2,row:4},e:{col:5,row:4}});
    const tri=parseSkill('【三段】[枪击;power:50][枪击;power:50][枪击;power:50][远程][范围:单体;射程:12]');
    const r=drive(b.beginAttack(tri,aim(b,'e')),req=>({skill:req.candidates[0].skill}));
    check('TT-B 巫师护盾逐段加总不单段清空',r.ok && e.ref.shield===390 && e.ref.mp===98,{shield:e.ref.shield,mp:e.ref.mp});
  }
  {
    const step=parseSkill('【折影步】[单避;power:900][MP:4][反应:近战][位移:闪现;距离:2][范围:自身]');
    const h=unit('h','hero',{spd:200});const e=unit('e','enemy',{skills:[step]});
    const b=make([h,e],{h:{col:2,row:4},e:{col:5,row:4}},{random:()=>0.9});
    const tri=parseSkill('【三段】[伤害;power:50][伤害;power:50][伤害;power:50][近战][范围:单体;射程:3]');
    let requests=0;
    const r=drive(b.beginAttack(tri,aim(b,'e')),req=>{if(req.type==='teleport')return {col:5,row:6};requests++;return {skill:req.candidates[0].skill};});
    check('TT-B 单避本段化解后选格闪现2米',r.hits[0].segments[0].hpDmg===0 && r.hits[0].segments[0].reaction.shift?.distance===2);
    check('TT-B 后两段重查射程并不再弹反应', requests===1 && e.ref.mp===106 && r.hits[0].segments.slice(1).every(s=>s.reason==='目标超出射程'),r.hits[0].segments);
  }
  {
    const d=sample(); const el=d.units[0]; const b=make([el,unit('e','enemy',{spd:1})],{[el.id]:{col:2,row:4},e:{col:20,row:4}},{summonProvider:d.summonProvider});
    const bottle=el.items.find(x=>x.name==='化尘者之瓶');
    const r=drive(b.beginUseItem(bottle,{x:4.5,y:4.5},{child:bottle.children[0]}));
    check('TT-B 瓶正常召唤在选中落点并扣共享次数',r.ok&&r.summons.length===1&&bottle.usesRemaining===0&&b.ctx.placementsById[r.summons[0]].col===4,r);
    check('TT-B 共享瓶次数耗尽阻止另一用法',!b.canUseItem(bottle,bottle.children[1]).ok);
    check('TT-B 化尘者继承流体虚形',b.ctx.units.find(x=>x.isSummon).attrTags.includes('[流体]')&&b.ctx.units.find(x=>x.isSummon).attrTags.includes('[虚形]'));
    check('TT-B 召唤物从零跑圈',b.state.progress[r.summons[0]].distance===0);
  }
  {
    const d=sample(); const beast=d.summonProvider('幻梦行军兽');
    const h=unit('h','hero',{spd:200,footprint:beast.footprint,skills:beast.skills});
    const e1=unit('e1','enemy');const e2=unit('e2','enemy');
    const b=make([h,e1,e2],{h:{col:2,row:4},e1:{col:5,row:4},e2:{col:8,row:5}});
    const r=b.attack(beast.skills.find(s=>s.name==='冲撞'),{x:12,y:5});
    check('TT-B 冲撞6米路径逐敌一次',r.ok&&r.hits.length===2&&r.hits.every(x=>x.segments.length===1),r.hits);
    check('TT-B 冲撞击退3米后可穿过已攻击目标，末端重叠落前一空位',b.ctx.placementsById.h.col===6&&b.ctx.placementsById.e1.col===8&&b.ctx.placementsById.e2.col===11
      && r.events.find(e=>e.type==='unit-charged').path.some(p=>p.col===8),b.ctx.placementsById);
  }
  {
    // 弗兰克【重击推撞】= 4米直线冲撞：不占移动/跳跃额度，撞到即结算并沿冲撞方向击退
    const d=sample(); const frank=d.units.find(u=>u.name==='弗兰克'); const push=frank.skills.find(s=>s.name==='重击推撞');
    const h=unit('h','hero',{spd:200,tp:100,skills:[push]}); const e1=unit('e1','enemy');
    const b=make([h,e1],{h:{col:2,row:4},e1:{col:4,row:4}});
    const before=b.snapshot().resources;
    const r=b.attack(push,{x:12,y:4.5});
    const after=b.snapshot().resources, ev=r.events.find(e=>e.type==='unit-charged');
    check('TT-B 重击推撞4米冲撞命中路径敌人并击退',r.ok&&r.hits.length===1&&r.hits[0].targetId==='e1'&&ev&&ev.requestedDistance===4&&b.ctx.placementsById.h.col===6,{hits:r.hits.map(x=>x.targetId),reason:r.reason,ev,pos:b.ctx.placementsById});
    check('TT-B 重击推撞不扣移动与跳跃额度',before&&after&&after.moveRemaining===before.moveRemaining&&after.jumped===before.jumped,{before,after});
  }
  {
    const us = sample().units.map((u, i) => unit('u' + i, u.side, { spd: u.ref.spd, controller: u.controller }));
    const pos = Object.fromEntries(us.map((u, i) => [u.id, { col: 2 + i * 2, row: 3 }]));
    const b = make(us, pos);
    const plain = emptyBattleState('tt-battle', 'plain');
    createClock(plain, us.map(u => ({ id: u.id, side: u.side, baseSpd: u.ref.spd })));
    const plainNext = () => {
      const r = advanceToNextAction(plain);
      dispatchClock(plain, { type: 'endAction', unitId: r.unitId });
      return [r.unitId, r.time];
    };
    const actualNext = () => {
      const point = [b.snapshot().currentId, b.ctx.now()];
      b.endAction();
      return point;
    };
    const measure = next => {
      const counts = {};
      let opening = null, streak = 0, longest = 0;
      for (let i = 0; i < 240; i++) {
        const [id, time] = next();
        if (!id || time > 1000) break;
        counts[id] = (counts[id] || 0) + 1;
        if (us.find(u => u.id === id).side === 'enemy') longest = Math.max(longest, ++streak);
        else { opening ??= streak; streak = 0; }
      }
      return { opening, longest, counts };
    };
    const before = measure(plainNext), after = measure(actualNext);
    const roster = sample().units;
    const highRanks = ['伊塔库亚的眷族', '犹格索托斯之子'].map(name => roster.findIndex(u => u.name.includes(name)));
    check('TT-B 眷族和优格按新敏捷排轴，连续行动衰减仍生效', highRanks.every(i => i >= 0)
      && us[highRanks[0]].ref.spd === 100 && us[highRanks[1]].ref.spd === 80
      && after.opening === 1 && after.longest <= before.longest && after.counts.u6 < before.counts.u6, { before, after });
  }
  {
    const us = [unit('h', 'hero', { spd: 50 }), unit('s', 'hero', { spd: 200, controller: 'ai' }), unit('e', 'enemy', { spd: 400, controller: 'ai' })];
    const pos = { h: { col: 2, row: 3 }, s: { col: 6, row: 3 }, e: { col: 10, row: 3 } };
    const b = make(us, structuredClone(pos));
    const clock = b.battleState.combatState.clock;
    const advanceTo = (battle, time) => { for (let i = 0; i < 20 && battle.ctx.now() < time; i++) battle.endAction(); };
    const first = b.ctx.now(), next = getUnitNextActionAt(b.battleState, 'e');
    advanceTo(b, 75);
    const second = b.ctx.now(), thirdPredicted = getUnitNextActionAt(b.battleState, 'e');
    const resume = make(structuredClone(us), structuredClone(pos), { battleState: structuredClone(b.battleState) });
    check('TT-B 连动间隔25→50→75，友方AI不重置，存档续接不重复计数', first === 25 && next === 75
      && second === 75 && thirdPredicted === 150 && clock.units.e.repeatActions === 2
      && getUnitNextActionAt(resume.battleState, 'e') === 150, { first, next, second, thirdPredicted });
    advanceTo(b, 200);
    advanceTo(resume, 200);
    if (b.snapshot().currentId === 's') b.endAction();
    if (resume.snapshot().currentId === 's') resume.endAction();
    check('TT-B 玩家实际行动后恢复排轴速度、不清已有距离，续接与原局一致', b.snapshot().currentId === 'h'
      && b.battleState.progress.e.distance === 5000 && getUnitNextActionAt(b.battleState, 'e') === 212.5
      && getUnitNextActionAt(resume.battleState, 'e') === 212.5 && b.statsOf(us[2]).spd === 400);
  }
  for (const kind of ['stun', 'paralyze']) {
    const us = [unit('h', 'hero', { spd: 100 }), unit('e', 'enemy', { spd: 200, controller: 'ai' })];
    const b = make(us, { h: { col: 2, row: 3 }, e: { col: 10, row: 3 } }, { random: () => 0 });
    if (kind === 'stun') dispatchClock(b.battleState, { type: 'applyStun', unitId: 'h' });
    else b.buffsOf('h').push({ type: 'paralyze', value: 1 });
    b.endAction();
    check('TT-B 玩家跳过不重置敌方递减：' + kind, b.snapshot().currentId === 'e' && b.ctx.now() === 150
      && b.battleState.combatState.clock.units.e.repeatActions === 2 && getUnitNextActionAt(b.battleState, 'e') === 300);
  }
  {
    const hit=parseSkill('【击】[钝击;power:40][近战][位移:击退;距离:3][范围:单体;射程:2]');
    const h=unit('h','hero',{spd:200});const e=unit('e','enemy',{shield:100});
    const b=make([h,e],{h:{col:2,row:4},e:{col:3,row:4}});
    const r=b.attack(hit,aim(b,'e'));
    check('TT-B 护盾全吸收不触发击退',r.hits[0].hpDmg===0&&b.ctx.placementsById.e.col===3);
  }
  {
    const d=sample(); const el=d.units[0];const enemy=unit('e','enemy',{spd:1});
    const b=make([el,enemy],{[el.id]:{col:2,row:4},e:{col:20,row:4}});
    const fog=el.skills.find(x=>x.name==='拉莱耶造雾术');
    const r=b.attack(fog,{x:5.5,y:4.5});
    check('TT-B 浓雾施放建立5回合区域无挂个人盲状态',r.ok&&b.ctx.regions.length===1&&!b.buffsOf(el.id).some(x=>x.type==='hit'),b.ctx.regions);
    check('TT-B 入雾命中-40离雾恢复',b.statsOf(el).hit===-40 && b.move(2,13).ok===false);
  }
  {
    const barrier=parseSkill('【障壁】[肃正:近战;power:200;Armor:40][范围:圆形;半径:3]');
    const h=unit('h','hero',{spd:200});const ally=unit('a','hero',{spd:30});const e=unit('e','enemy',{spd:100});
    const b=make([h,ally,e],{h:{col:6,row:4},a:{col:7,row:4},e:{col:2,row:4}});
    b.attack(barrier); b.endAction();nextActor(b,'e');
    const bomb=parseSkill('【爆】[钝击;power:600][法术][范围:爆炸;射程:12;半径:3]');
    const r=b.attack(bomb,{x:6.5,y:4.5});
    check('TT-B 结界只承伤一次且击破当次不溢出',r.ok&&h.ref.hp===1000&&ally.ref.hp===1000&&b.ctx.barriers.length===0,r.hits);
  }
  {
    const h=unit('h','hero',{spd:200});const ally=unit('a','hero',{hp:0,spd:100}); const e=unit('e','enemy',{spd:1});
    const b=make([h,ally,e],{h:{col:2,row:4},a:{col:3,row:4},e:{col:20,row:4}});
    ally.ref.maxHp=100;
    const heal=parseSkill('【救】[回复;power:30][行动:辅][范围:单体;射程:4]');
    const r=b.attack(heal,aim(b,'a'));
    check('TT-B 单体回复可救起倒地友军并零跑圈',r.ok&&ally.ref.hp===30&&b.state.combatState.clock.units.a.status==='active'&&b.state.progress.a.distance===0,r);
  }
  {
    const guard=parseSkill('【大免伤】[免伤;power:200][反应:法术][范围:自身]');
    const h=unit('h','hero',{spd:200}),e=unit('e','enemy',{skills:[guard]});
    const b=make([h,e],{h:{col:2,row:4},e:{col:4,row:4}});
    const r=drive(b.beginAttack(parseSkill('【火】[火焰;power:50][法术][范围:单体;射程:12]'),aim(b,'e')),req=>({skill:req.candidates[0].skill}));
    check('TT-B 非耗尽免伤池也在整技finally清理',r.ok&&!b.buffsOf('e').some(x=>x.type==='damageGuard'));
  }
  {
    const shot=parseSkill('【蓄力枪】[枪击;power:50][远程][延迟:1][范围:单体;射程:12]');
    const ammo=parseItem('【子弹】[弹药][数量:2][绑定:蓄力枪*1]');
    const h=unit('h','hero',{spd:200,items:[ammo]}),e=unit('e','enemy',{spd:1});
    const b=make([h,e],{h:{col:2,row:4},e:{col:4,row:4}});
    const r=b.attack(shot,aim(b,'e'));
    b.endAction();nextActor(b,'h');
    b.advancePreparation();
    const fired=b.attack(shot,aim(b,'e'));
    check('TT-B 蓄力枪准备扣弹药一次释放不重复',r.preparing&&fired.ok&&!fired.preparing&&ammo.count===1,fired);
  }
  {
    const h=unit('h','hero',{spd:200}),a=unit('a','hero'),e=unit('e','enemy');
    const b=make([h,a,e],{h:{col:2,row:4},a:{col:3,row:4},e:{col:4,row:4}});
    const all=parseSkill('【盲】[致盲;power:20][Turns:5][范围:圆形;半径:3]');
    all.affectsAll=true;
    b.attack(all);
    check('TT-B 不分敌友普通致盲三方都生效', ['h','a','e'].every(id=>b.statsOf(b.ctx.units.find(u=>u.id===id)).hit===-20));
  }
  {
    const hero = unit('hero', 'hero', { spd: 200 });
    const foe = unit('foe', 'enemy', { hp: 7 });
    const b = make([hero, foe], { hero: { col: 2, row: 4 }, foe: { col: 3, row: 4 } });
    const skill = parseSkill('【毒火】[中毒;power:20][燃烧;power:10][Turns:3][必中][范围:圆形;半径:2]');
    skill.affectsAll = true;
    const attack = b.attack(skill);
    for (let i = 0; i < 12 && b.snapshot().events.filter(e => e.type === 'status-tick').length < 3; i++) b.endAction();
    const ticks = b.snapshot().events.filter(e => e.type === 'status-tick');
    check('TT-B 敌我周期伤害事件用实际扣血值，致死一跳只报剩余HP', attack.ok
      && ticks.some(e => e.unitId === hero.id && e.kind === 'burn' && e.damage === 10)
      && ticks.some(e => e.unitId === hero.id && e.kind === 'poison' && e.damage === 20)
      && ticks.filter(e => e.unitId === foe.id).length === 1
      && ticks.some(e => e.unitId === foe.id && e.damage === 7 && e.hpAfter === 0), ticks);
  }
  {
    const state = emptyBattleState('tick-removal', 'tick-removal');
    createClock(state, [{ id: 'victim', side: 'enemy', baseSpd: 100 }]);
    const first = { casterId: 'h', skillId: 'poison', effectId: 'first' };
    const second = { casterId: 'h', skillId: 'poison', effectId: 'second' };
    for (const source of [first, second]) dispatchClock(state, { type: 'applyStatus', unitId: 'victim', source, kind: 'poison', strength: 20, duration: 300 });
    const events = settlePhase12(state, 100, { onEvent: ev => {
      if (ev.type === 'dot-tick') for (const source of [first, second]) dispatchClock(state, { type: 'removeStatus', unitId: 'victim', source });
    } });
    check('TT-B 周期回调清除后续状态不会崩溃或继续跳伤', events.filter(e => e.type === 'dot-tick').length === 1 && Object.keys(state.combatState.clock.statuses).length === 0);
  }
  {
    const guard=parseSkill('【反复免伤】[免伤;power:80][反应:法术][范围:自身]');
    const h=unit('h','hero',{spd:200}),e=unit('e','enemy',{skills:[guard]});
    const b=make([h,e],{h:{col:2,row:4},e:{col:4,row:4}});
    const tri=parseSkill('【三火】[火焰;power:50][火焰;power:50][火焰;power:50][法术][范围:单体;射程:12]');
    let n=0;
    const r=drive(b.beginAttack(tri,aim(b,'e')),req=> ++n<=2 ? {skill:req.candidates[0].skill}:null);
    check('TT-B 同源免伤重用替换而不追加，第三段HP20',r.hits[0].segments.map(s=>s.hpDmg).join(',')==='0,0,20',r.hits[0].segments);
  }
  {
    const h=unit('h','hero',{spd:200}),e1=unit('e1','enemy'),e2=unit('e2','enemy');
    const b=make([h,e1,e2],{h:{col:2,row:4},e1:{col:4,row:4},e2:{col:6,row:4}});
    const double=parseSkill('【双击】[钝击;power:20][钝击;power:20][转火][范围:单体;射程:8]');
    const first = aim(b, 'e1');
    const valid = b.beginAttack(double, first, { reuseTarget: true }).next();
    check('TT-B 双击规则侧沿用有效后续目标且不要求第二次选择', valid.done && valid.value.ok && valid.value.hits[0].targetId === 'e1' && valid.value.hits[0].segments.length === 2);
    const h2 = unit('h2', 'hero', { spd: 200 }), x = unit('x', 'enemy', { hp: 10 }), y = unit('y', 'enemy');
    const b2 = make([h2, x, y], { h2: { col: 2, row: 4 }, x: { col: 4, row: 4 }, y: { col: 6, row: 4 } });
    const gen = b2.beginAttack(double, aim(b2, 'x'), { reuseTarget: true });
    const step = gen.next();
    check('TT-B 双击沿用目标倒地仍请求重新选目标', !step.done && step.value.type === 'retarget-request');
    const canceled = gen.next(null);
    check('TT-B 快捷沿用失效后放弃不会自动伤害其他敌人', canceled.done && canceled.value.ok && y.ref.hp === y.ref.maxHp);
    const h3 = unit('h3', 'hero', { spd: 200 }), a = unit('a', 'enemy'), z = unit('z', 'enemy');
    const b3 = make([h3, a, z], { h3: { col: 2, row: 4 }, a: { col: 4, row: 4 }, z: { col: 4, row: 7 } });
    const manual = b3.beginAttack(double, aim(b3, 'a'));
    const request = manual.next();
    const changed = manual.next(aim(b3, 'z'));
    check('TT-B 非快捷确认依然能手动转火', request.value.type === 'retarget-request' && changed.value.hits.map(h => h.targetId).join(',') === 'a,z');
  }
  {
    const haste=parseSkill('【蓄力】[钝击;power:20][加速:2][范围:单体;射程:8]');
    const prep=parseSkill('【长准备】[钝击;power:20][延迟:3][范围:单体;射程:8]');
    const h=unit('h','hero',{spd:200}),e=unit('e','enemy');
    const b=make([h,e],{h:{col:2,row:4},e:{col:4,row:4}});
    const gain = b.attack(haste, aim(b, 'e'));
    const stocked = b.getEffectiveUnit('h').chargeInventory;
    b.endAction(); nextActor(b, 'h');
    const started = b.attack(prep, aim(b, 'e'));
    check('TT-B getEffectiveUnit 加速库存随蓄力消耗递减', gain.ok && stocked === 2 && started.preparing && b.getEffectiveUnit('h').chargeInventory === 0);
  }
  {
    const d=sample(); const beast=d.summonProvider('幻梦行军兽');
    const h=unit('h','hero',{spd:200,footprint:beast.footprint,skills:beast.skills});
    const e=unit('e','enemy'); const b=make([h,e],{h:{col:2,row:4},e:{col:5,row:4}});
    const r=b.attack(beast.skills.find(s=>s.name==='冲撞'),aim(b,'e'));
    const move=r.events.find(ev=>ev.type==='unit-charged');
    check('TT-B 2×2 冲撞前缘接触的步号关联伤害与击退', move.path[r.hits[0].segments[0].chargeStep].col === 4
      && r.events.find(ev => ev.type === 'unit-displaced').chargeStep === r.hits[0].segments[0].chargeStep, r.hits[0].segments[0]);
  }
  {
    const h=unit('h','hero',{spd:200}),e=unit('e','enemy');
    const b=make([h,e],{h:{col:2,row:4},e:{col:4,row:4}});
    const fog={...parseSkill('【雾】[致盲;power:40][Turns:5][法术][范围:爆炸;射程:15;半径:2]'),regionEffect:{type:'fog'}};
    b.attack(fog,{x:4.5,y:4.5});
    check('TT-B 敌我入雾致盲取40，不写个人状态',b.statsOf(h).hit===-40&&b.statsOf(e).hit===-40&&!b.buffsOf(e.id).some(x=>x.type==='hit'));
    check('TT-B 离雾解除且区域位置不跟随',b.move(2,7).ok&&b.statsOf(h).hit===0&&b.statsOf(e).hit===-40);
    for(let i=0;i<20&&b.snapshot().now<600;i++) b.endAction();
    check('TT-B 雾区到期恢复命中',b.ctx.regions.length===0&&b.statsOf(e).hit===0);
  }
  {
    const h=unit('h','hero',{spd:200}),e=unit('e','enemy',{hp:20,attrTags:['[复活]']});
    e.ref.reviveCount=1;
    e.skills=[{name:'自爆',isDeathTrigger:true,deathTag:'[自爆:群火]',range:{type:'圆形',radius:3}}];
    const b=make([h,e],{h:{col:2,row:4},e:{col:3,row:4}});
    const strike=parseSkill('【杀】[钝击;power:100][范围:单体;射程:2]');
    b.attack(strike,aim(b,'e'));
    check('TT-B 食尸鬼首次归零复活且不自爆',e.ref.hp===6&&!b.buffsOf('h').some(x=>x.type==='burn'));
    b.endAction();nextActor(b,'h');b.attack(strike,aim(b,'e'));
    check('TT-B 真正死亡按半径3自爆燃烧而不可主动',e.ref.hp===0&&b.buffsOf('h').some(x=>x.type==='burn'&&x.value===50));
  }
  return {cases};
}
export const groups={'TT-BATTLE':{run}};
