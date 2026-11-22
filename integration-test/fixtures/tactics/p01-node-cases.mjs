// ==========================================
// P01 Node 侧用例（T01-01～T01-08）
// 全部测试真实业务模块（tactics/src/*.mjs），不复制实现。
// 每组 run(deps) → { cases: [{id, pass, detail}] }；run-tests.cjs 门禁强制 passed>0。
// 浏览器侧（tactics-harness.html）另测 T01-05 的真实 iframe 链路与传输通道。
// ==========================================

import { createTavernMock, installGlobalMock } from './p01-tavern-mock.mjs';

function ok(id, pass, detail) {
  return { id, pass: !!pass, detail: detail || '' };
}

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------- T01-01 YAML 显式最高优先 ----------

async function t0101(deps) {
  const { parser, roster, protocol } = deps.modules;
  const cases = [];

  // 输入：YAML 显式 0/false/null/空集合/显式 0 数量 vs 持久化档 vs MMS
  const yamlText = [
    '战斗数据栏:',
    '  协议版本: 1',
    '  场景ID: sc-a',
    '  战斗ID: bt-a',
    '  我方列表:',
    '    - 角色:',
    '        名字: 甲',
    '        原型: 标准人形',
    '        属性: { hp: 0, maxHp: 100, mp: 0, maxMp: 50, atk: 0, def: 0, spd: 120, evasion: 0, classType: null, isWise: false }',
    '        技能: []',
    '        物品:',
    '          - { name: 弹药A, category: 弹药, count: 0, maxUses: 0 }',
    '  敌方列表:',
    '    - 名字: 侦察兵',
    '      属性: "[HP:80/80][Speed:100]"',
    '      技能: []',
  ].join('\n');
  const block = parser.parseYamlText(yamlText);
  const y = block.heroes[0];

  const persisted = {
    version: 1,
    heroes: [{
      name: '甲',
      config: { maxHp: 999, mp: 77, maxMp: 88, atk: 30, def: 40, spd: 200, evasion: 40, classType: '剑士', isWise: true },
      persist: {},
      skills: [{ name: '编辑器保留技', type: '[单体]', power: 20, type2: '[无]', type3: '[无]' }],
      items: [],
    }],
  };
  const mms = { name: '甲', hp: 50, maxHp: 55, mp: 60, maxMp: 65, armor: 99, items: [{ name: '弹药A', count: 7 }], props: undefined };

  const r = roster.resolveHero(y, { persistedHero: persisted.heroes[0], mmsHero: mms, hasProtocolVersion: true });
  const h = r.hero;

  cases.push(ok('T01-01 hp显式0胜MMS', h.hp === 0, 'hp=' + h.hp + '（期望0，MMS给50）'));
  cases.push(ok('T01-01 maxHp显式胜persisted', h.maxHp === 100, 'maxHp=' + h.maxHp));
  cases.push(ok('T01-01 mp显式0胜MMS', h.mp === 0, 'mp=' + h.mp));
  cases.push(ok('T01-01 atk显式0胜persisted', h.atk === 0, 'atk=' + h.atk));
  cases.push(ok('T01-01 def显式0胜persisted+MMS', h.def === 0, 'def=' + h.def));
  cases.push(ok('T01-01 spd显式120胜persisted', h.spd === 120, 'spd=' + h.spd));
  cases.push(ok('T01-01 evasion显式0胜persisted', h.evasion === 0, 'evasion=' + h.evasion));
  cases.push(ok('T01-01 classType显式null胜persisted', h.classType === null, 'classType=' + JSON.stringify(h.classType)));
  cases.push(ok('T01-01 isWise显式false胜persisted', h.isWise === false, 'isWise=' + h.isWise));
  cases.push(ok('T01-01 skills显式[]清空不补回', eq(h.skills, []), 'skills=' + JSON.stringify(h.skills)));
  cases.push(ok('T01-01 count显式0胜MMS', h.items[0] && h.items[0].count === 0, 'count=' + (h.items[0] && h.items[0].count)));

  // 正对照：缺失字段按职责回填（开关启用下 persisted 补 maxTp；MMS 补未显式 hp 的当前值）
  const yamlText2 = [
    '战斗数据栏:',
    '  协议版本: 1',
    '  场景ID: sc-a',
    '  战斗ID: bt-a',
    '  我方列表:',
    '    - 角色:',
    '        名字: 乙',
    '        属性: "[Speed:100]"',
    '        技能:',
    '          - 【斩击】[MP:5][单体;power:30]',
  ].join('\n');
  const y2 = parser.parseYamlText(yamlText2).heroes[0];
  const persisted2 = {
    version: 1,
    heroes: [{
      name: '乙',
      config: { maxTp: 3, maxMp: 70 },
      persist: { persistMaxTp: true },
      skills: [{ name: '斩击', cost: 5, type: '[单体]', power: 30, slotTurns: 4, type2: '[无]', type3: '[无]' }],
      items: [],
    }],
  };
  const r2 = roster.resolveHero(y2, { persistedHero: persisted2.heroes[0], mmsHero: { name: '乙', hp: 42, maxHp: 90, mp: 10, maxMp: 70 }, hasProtocolVersion: true });
  const h2 = r2.hero;
  cases.push(ok('T01-01 正对照 maxTp缺失回填persisted', h2.maxTp === 3, 'maxTp=' + h2.maxTp));
  cases.push(ok('T01-01 正对照 hp缺失走MMS', h2.hp === 42, 'hp=' + h2.hp));
  cases.push(ok('T01-01 正对照 技能slotTurns缺失回填', h2.skills[0].slotTurns === 4, 'slotTurns=' + h2.skills[0].slotTurns));

  // 开关关闭也不能反转 YAML 显式优先
  const persisted3 = { version: 1, heroes: [{ name: '甲', config: { atk: 30, evasion: 40 }, persist: { persistAtk: true, persistEvasion: true }, skills: [], items: [] }] };
  const y3 = JSON.parse(JSON.stringify(y));
  const r3 = roster.resolveHero(y3, { persistedHero: persisted3.heroes[0], mmsHero: null, hasProtocolVersion: true });
  cases.push(ok('T01-01 persist开启仍YAML显式胜出', r3.hero.atk === 0 && r3.hero.evasion === 0, 'atk=' + r3.hero.atk + ' evasion=' + r3.hero.evasion));

  // 敌方不在独立档合并路径中（roster 只对我方；敌方解析冒烟）
  cases.push(ok('T01-01 敌方解析存在', block.enemies.length === 1 && block.enemies[0].name === '侦察兵', JSON.stringify(block.enemies.map(e => e.name))));

  return { cases };
}

// ---------- T01-02 三原型缺省补齐 ----------

async function t0102(deps) {
  const { parser, protocol } = deps.modules;
  const cases = [];
  const table = protocol.PROTOTYPES;

  for (const proto of Object.keys(table)) {
    const y = parser.parseHeroEntry({ '名字': '丙', '原型': proto, '属性': '[Speed:100]' });
    const p = table[proto];
    cases.push(ok('T01-02 ' + proto + ' evasion', y.evasion === p.evasion, y.evasion + '≠' + p.evasion));
    cases.push(ok('T01-02 ' + proto + ' strength', y.strength === p.strength, y.strength + '≠' + p.strength));
    cases.push(ok('T01-02 ' + proto + ' totalWeight', y.totalWeight === p.totalWeight, y.totalWeight + '≠' + p.totalWeight));
    cases.push(ok('T01-02 ' + proto + ' moveDistance', y.moveDistance === p.moveDistance, y.moveDistance + '≠' + p.moveDistance));
    cases.push(ok('T01-02 ' + proto + ' perception', y.perception === p.perception, y.perception + '≠' + p.perception));
    cases.push(ok('T01-02 ' + proto + ' footprint', eq(y.footprint, p.footprint), JSON.stringify(y.footprint)));
  }

  // 已有 HP/敏捷不被原型重设
  const y2 = parser.parseHeroEntry({ '名字': '丁', '原型': '大型生物', '属性': '[HP:80/120][Speed:250]' });
  cases.push(ok('T01-02 已有HP不重设', y2.hp === 80 && y2.maxHp === 120, JSON.stringify([y2.hp, y2.maxHp])));
  cases.push(ok('T01-02 已有敏捷不重设', y2.spd === 250, 'spd=' + y2.spd));
  cases.push(ok('T01-02 已有敏捷不被闪避覆盖', y2.spd === 250 && y2.evasion === 30, 'spd=' + y2.spd + ' evasion=' + y2.evasion));

  // 逐字段显式值不被原型重置（含显式 0）
  const y3 = parser.parseHeroEntry({ '名字': '戊', '原型': '轻型生物', '属性': { evasion: 0, strength: 99, moveDistance: 3, perception: 10, totalWeight: 500 } });
  cases.push(ok('T01-02 显式evasion0保留', y3.evasion === 0, 'evasion=' + y3.evasion));
  cases.push(ok('T01-02 显式strength保留', y3.strength === 99, 'strength=' + y3.strength));
  cases.push(ok('T01-02 显式move保留', y3.moveDistance === 3, 'move=' + y3.moveDistance));
  cases.push(ok('T01-02 显式perception保留', y3.perception === 10, 'perception=' + y3.perception));
  cases.push(ok('T01-02 显式totalWeight保留', y3.totalWeight === 500, 'weight=' + y3.totalWeight));
  // 未显式的 footprint 仍由原型补齐
  cases.push(ok('T01-02 footprint仍补齐', eq(y3.footprint, { width: 1, height: 1 }), JSON.stringify(y3.footprint)));

  return { cases };
}

// ---------- T01-03 六范围与组结构 ----------

async function t0103(deps) {
  const { parser, protocol } = deps.modules;
  const cases = [];

  // 六种范围
  const six = [
    ['【刺击】[范围:单体]', { type: '单体' }],
    ['【扫射】[范围:直线;长:10;宽:1]', { type: '直线', length: 10, width: 1 }],
    ['【横斩】[范围:扇形;射程:3;角度:90]', { type: '扇形', castRange: 3, angle: 90 }],
    ['【火球】[范围:圆形;射程:15;半径:3]', { type: '圆形', castRange: 15, radius: 3 }],
    ['【天罚】[范围:全域]', { type: '全域' }],
    ['【榴弹】[范围:爆炸;射程:12;半径:4]', { type: '爆炸', castRange: 12, radius: 4 }],
  ];
  for (const [str, want] of six) {
    const s = parser.parseSkill(str);
    cases.push(ok('T01-03 range ' + want.type, eq(s.range, want), JSON.stringify(s.range)));
  }

  // 缺尺寸按 S14 补齐；补齐值不标 explicit
  const s2 = parser.parseSkill('【直斩】[范围:直线]');
  cases.push(ok('T01-03 直线缺尺寸补10/1', s2.range.length === 10 && s2.range.width === 1, JSON.stringify(s2.range)));
  cases.push(ok('T01-03 补齐值不标explicit', s2._explicit.includes('range') && !s2._explicit.includes('range.length') && !s2._explicit.includes('range.width'), JSON.stringify(s2._explicit)));
  const s3 = parser.parseSkill('【爆弹】[范围:爆炸]');
  cases.push(ok('T01-03 爆炸缺尺寸补15/3', s3.range.castRange === 15 && s3.range.radius === 3, JSON.stringify(s3.range)));

  // 显式范围配旧 [单体]/[群攻] 名称：range 保留，槽位照常（显式范围是唯一空间信息）
  const s4 = parser.parseSkill('【贯通】[单体;power:40][范围:直线;长:12;宽:2]');
  cases.push(ok('T01-03 显式范围配旧单体并存', eq(s4.range, { type: '直线', length: 12, width: 2 }) && s4.type === '[单体]' && s4.power === 40, JSON.stringify({ range: s4.range, type: s4.type, power: s4.power })));
  const s5 = parser.parseSkill('【爆裂】[群攻][范围:圆形;射程:10;半径:5]');
  cases.push(ok('T01-03 显式范围配旧群攻并存', eq(s5.range, { type: '圆形', castRange: 10, radius: 5 }) && s5.type === '[群攻]', JSON.stringify({ range: s5.range, type: s5.type })));

  // 范围/行动标签不占三效果槽
  const s6 = parser.parseSkill('【辅射】[范围:直线;长:8][行动:辅][群攻(枪击)]');
  cases.push(ok('T01-03 行动辅', eq(s6.actionCost, { main: 0, aux: 1 }), JSON.stringify(s6.actionCost)));
  cases.push(ok('T01-03 主槽仍为群攻(枪击)', s6.type === '[群攻(枪击)]' && s6.type2 === '[无]', JSON.stringify([s6.type, s6.type2])));
  const s7 = parser.parseSkill('【主射】[行动:主][单体]');
  cases.push(ok('T01-03 行动主', eq(s7.actionCost, { main: 1, aux: 0 }), JSON.stringify(s7.actionCost)));
  const s8 = parser.parseSkill('【默认】[单体]');
  cases.push(ok('T01-03 缺省主行动', eq(s8.actionCost, { main: 1, aux: 0 }), JSON.stringify(s8.actionCost)));
  cases.push(ok('T01-03 缺省行动不标explicit', !s8._explicit.includes('actionCost'), JSON.stringify(s8._explicit)));

  // 嵌套技能组：子技能参数不丢（含 slotTurns / range）——组输入为对象形态（jsyaml 4 实测口径）
  const list = parser.parseSkillList([
    { '【温切斯特M1897】': ['【霰弹】[MP:2][单体(枪击);power:25;turns:2][范围:扇形;射程:5;角度:60]', '【穿甲弹】[MP:4][单体(枪击);power:45]'] },
  ]);
  const parent = list.find(s => s.isGroup);
  cases.push(ok('T01-03 组父存在', !!parent, '无组父'));
  cases.push(ok('T01-03 子行数', list.filter(s => s._inGroup).length === 2, String(list.filter(s => s._inGroup).length)));
  const child = list.find(s => s.name === '霰弹');
  cases.push(ok('T01-03 子slotTurns不丢', child && child.slotTurns === 2, child && String(child.slotTurns)));
  cases.push(ok('T01-03 子range不丢', child && child.range && child.range.type === '扇形', JSON.stringify(child && child.range)));
  cases.push(ok('T01-03 纯名父groupOnly假槽清空', parent.groupOnly === true && parent.type === '[无]' && parent.power === 0, JSON.stringify([parent.groupOnly, parent.type, parent.power])));

  // 组父/子同名不串档（\u0000 键路径在 roster 合并；解析层保证 parentName 标记）
  const dup = parser.parseSkillList(['【同名技】[单体;power:10]', { '【同名技】': ['【同名技】[单体;power:99]'] }]);
  const flatDup = dup.find(s => s.name === '同名技' && !s._inGroup);
  const childDup = dup.find(s => s.name === '同名技' && s._inGroup);
  cases.push(ok('T01-03 同名父子并行存在', !!flatDup && !!childDup && flatDup.power === 10 && childDup.power === 99, JSON.stringify([flatDup && flatDup.power, childDup && childDup.power])));

  // 物品组与绑定
  const items = parser.parseItemList([
    { '【化学弹药】[弹药][数量:6]': ['【爆射】[单体(枪击);power:35]'] },
    '【铝热投剂】[消耗品][数量:2][绑定:爆射*1]',
  ]);
  const ammo = items.find(i => i.name === '化学弹药');
  const consum = items.find(i => i.name === '铝热投剂');
  cases.push(ok('T01-03 物品组children', ammo && Array.isArray(ammo.children) && ammo.children[0].name === '爆射', JSON.stringify(ammo && ammo.children && ammo.children.map(c => c.name))));
  cases.push(ok('T01-03 弹药效果槽清空', ammo && ammo.type === '[无]', ammo && ammo.type));
  cases.push(ok('T01-03 绑定参数', consum && eq(consum.bindings, [{ skillName: '爆射', cost: 1 }]), JSON.stringify(consum && consum.bindings)));

  // JSON 往返不串档（引用断裂后 _inGroup/parentName 仍在）
  const round = JSON.parse(JSON.stringify(dup));
  const rFlat = round.find(s => s.name === '同名技' && !s._inGroup);
  const rChild = round.find(s => s.name === '同名技' && s._inGroup);
  cases.push(ok('T01-03 JSON往返标记保留', !!rFlat && !!rChild && rChild.parentName === '同名技' && rChild._inGroup === true, JSON.stringify(rChild && [rChild._inGroup, rChild.parentName])));

  return { cases };
}

// ---------- T01-04 生命周期三分支 ----------

async function t0104(deps) {
  const { lifecycle } = deps.modules;
  const cases = [];

  // 新 scene
  let state = null;
  let sceneCalls = 0, battleCalls = 0;
  const deps2 = {
    initScene: () => { sceneCalls++; return { rooms: 3 }; },
    initBattle: () => { battleCalls++; return { opening: true }; },
  };
  let r = lifecycle.applyLoad(state, { sceneId: 'sc-1', battleId: 'bt-1' }, null, deps2);
  state = r.state;
  cases.push(ok('T01-04 新scene分支', r.branch === 'new-scene', r.branch));
  cases.push(ok('T01-04 新scene初始化1+1', r.initSceneCalls === 1 && r.initBattleCalls === 1, JSON.stringify([r.initSceneCalls, r.initBattleCalls])));
  cases.push(ok('T01-04 战术档无资源真值', !('hp' in r.sceneState) && !('hp' in r.battleState) && !('items' in r.battleState), 'ok'));
  // 进度写入（模拟本场战斗推进）
  r.battleState.progress = { '甲': 5000 };
  r.battleState.perBattleUses = { '大招': 1 };
  r.sceneState.objects = { 'door-1': 'broken' };
  r.sceneState.positions = { '甲': { x: 4, y: 7 } };

  // 同 scene 同 battle 续接：0 次初始化，进度保留
  const before = JSON.stringify(state);
  r = lifecycle.applyLoad(state, { sceneId: 'sc-1', battleId: 'bt-1' }, null, deps2);
  cases.push(ok('T01-04 续接分支', r.branch === 'resume', r.branch));
  cases.push(ok('T01-04 续接零初始化', r.initSceneCalls === 0 && r.initBattleCalls === 0, JSON.stringify([r.initSceneCalls, r.initBattleCalls])));
  cases.push(ok('T01-04 续接保留进度', r.battleState.progress['甲'] === 5000, JSON.stringify(r.battleState.progress)));
  cases.push(ok('T01-04 续接保留限次用量', r.battleState.perBattleUses['大招'] === 1, JSON.stringify(r.battleState.perBattleUses)));
  cases.push(ok('T01-04 重复载入无副作用', JSON.stringify(r.state) === before, 'state 被意外修改'));

  // 续接 + YAML 显式增量：显式键覆盖、未提供键不动、重复同一增量仍无变化
  r = lifecycle.applyLoad(state, { sceneId: 'sc-1', battleId: 'bt-1' }, { objects: { 'door-2': 'open' } }, deps2);
  cases.push(ok('T01-04 显式增量生效', r.sceneState.objects['door-2'] === 'open', JSON.stringify(r.sceneState.objects)));
  cases.push(ok('T01-04 未提供键不动', r.sceneState.objects['door-1'] === 'broken', JSON.stringify(r.sceneState.objects)));
  const mid = JSON.stringify(r.state);
  r = lifecycle.applyLoad(r.state, { sceneId: 'sc-1', battleId: 'bt-1' }, { objects: { 'door-2': 'open' } }, deps2);
  cases.push(ok('T01-04 重复增量幂等', JSON.stringify(r.state) === mid, '重复增量改变状态'));

  // 同 scene 新 battle：物件/位置保留，进度/限次清零
  r = lifecycle.applyLoad(state, { sceneId: 'sc-1', battleId: 'bt-2' }, null, deps2);
  cases.push(ok('T01-04 新battle分支', r.branch === 'new-battle', r.branch));
  cases.push(ok('T01-04 新battle只初始化battle', r.initSceneCalls === 0 && r.initBattleCalls === 1, JSON.stringify([r.initSceneCalls, r.initBattleCalls])));
  cases.push(ok('T01-04 新battle留物件', r.sceneState.objects['door-1'] === 'broken', JSON.stringify(r.sceneState.objects)));
  cases.push(ok('T01-04 新battle留位置', eq(r.sceneState.positions['甲'], { x: 4, y: 7 }), JSON.stringify(r.sceneState.positions)));
  cases.push(ok('T01-04 新battle清进度', JSON.stringify(r.battleState.progress) === '{}' && JSON.stringify(r.battleState.perBattleUses) === '{}', JSON.stringify([r.battleState.progress, r.battleState.perBattleUses])));

  // 新 scene：全部重建
  r = lifecycle.applyLoad(state, { sceneId: 'sc-2', battleId: 'bt-1' }, null, deps2);
  cases.push(ok('T01-04 新scene重建', r.branch === 'new-scene' && r.initSceneCalls === 1 && r.initBattleCalls === 1, JSON.stringify([r.branch, r.initSceneCalls, r.initBattleCalls])));
  cases.push(ok('T01-04 新scene物件独立', JSON.stringify(r.sceneState.objects) === '{}', JSON.stringify(r.sceneState.objects)));

  // 重开：战术字段恢复；资源由调用方重新走 resolveHero（此处断言 reopen 不产出资源字段）
  const r2 = lifecycle.reopenLoad(state, { sceneId: 'sc-1', battleId: 'bt-1' }, deps2);
  cases.push(ok('T01-04 重开保留场景态', r2.branch === 'reopen-existing' && r2.sceneState.objects['door-1'] === 'broken', JSON.stringify(r2.branch)));
  cases.push(ok('T01-04 重开零初始化', r2.initSceneCalls === 0 && r2.initBattleCalls === 0, JSON.stringify([r2.initSceneCalls, r2.initBattleCalls])));
  cases.push(ok('T01-04 重开不恢复资源', !('hp' in r2.battleState), 'ok'));

  // 总初始化计数：整个会话 initScene 恰 2 次（sc-1、sc-2），initBattle 恰 4 次（bt-1新、bt-2、sc-2/bt-1、无）
  cases.push(ok('T01-04 不重复生成', sceneCalls === 2, 'initScene=' + sceneCalls));

  // 非法输入
  let threw = false;
  try { lifecycle.classifyLoad(null, { battleId: 'x' }); } catch (e) { threw = true; }
  cases.push(ok('T01-04 缺sceneId报错', threw, '未抛错'));

  return { cases };
}

// ---------- T01-05 mock 语义（Node 侧单元；浏览器侧另测 iframe 真链路） ----------

async function t0105(deps) {
  const { storage, protocol } = deps.modules;
  const cases = [];

  const mock = installGlobalMock(createTavernMock());
  const { api, store, counts } = mock;

  // 三作用域隔离
  api.insertOrAssignVariables({ a: 1 }, { type: 'global' });
  api.insertOrAssignVariables({ a: 2 }, { type: 'chat' });
  api.insertOrAssignVariables({ a: 3 }, { type: 'message', message_id: 0 });
  api.insertOrAssignVariables({ a: 4 }, { type: 'message', message_id: 1 });
  cases.push(ok('T01-05 global隔离', api.getVariables({ type: 'global' }).a === 1, ''));
  cases.push(ok('T01-05 chat隔离', api.getVariables({ type: 'chat' }).a === 2, ''));
  cases.push(ok('T01-05 message楼层隔离', api.getVariables({ type: 'message', message_id: 0 }).a === 3 && api.getVariables({ type: 'message', message_id: 1 }).a === 4, ''));

  // replaceVariables 真删键（整表替换）
  api.insertOrAssignVariables({ k1: 1, k2: 2, nest: { x: 1, y: 2 } }, { type: 'chat' });
  api.replaceVariables({ k2: 9 }, { type: 'chat' });
  const chat = api.getVariables({ type: 'chat' });
  cases.push(ok('T01-05 替换删旧键', !('k1' in chat) && !('nest' in chat), JSON.stringify(chat)));
  cases.push(ok('T01-05 替换留新键', chat.k2 === 9, JSON.stringify(chat)));

  // insertOrAssign 深合并：对象递归、数组/原子整体替换
  api.insertOrAssignVariables({ deep: { a: { b: 1 } }, arr: [1, 2] }, { type: 'global' });
  api.insertOrAssignVariables({ deep: { a: { c: 2 } }, arr: [3] }, { type: 'global' });
  const glob = api.getVariables({ type: 'global' });
  cases.push(ok('T01-05 深合并留未声明键', glob.deep.a.b === 1 && glob.deep.a.c === 2, JSON.stringify(glob.deep)));
  cases.push(ok('T01-05 数组整体替换', eq(glob.arr, [3]), JSON.stringify(glob.arr)));

  // storage.saveTacticsKey：只换本方键，保留外部键（整档替换语义）
  api.insertOrAssignVariables({ 'rpg_combat_roster': { version: 1, heroes: [] }, '$shop_catalog': { items: [] } }, { type: 'chat' });
  storage.saveTacticsKey(protocol.TACTICS_ROSTER_KEY, { version: 1, heroes: [{ name: '甲' }] }, 'chat');
  const after = api.getVariables({ type: 'chat' });
  cases.push(ok('T01-05 保留原RPG键', 'rpg_combat_roster' in after && '$shop_catalog' in after, JSON.stringify(Object.keys(after))));
  cases.push(ok('T01-05 写入战棋键', after[protocol.TACTICS_ROSTER_KEY].heroes[0].name === '甲', ''));
  // 再保存一次（删除英雄）→ 旧条目不残留（整档替换）
  storage.saveTacticsKey(protocol.TACTICS_ROSTER_KEY, { version: 1, heroes: [] }, 'chat');
  cases.push(ok('T01-05 整档替换无残留', api.getVariables({ type: 'chat' })[protocol.TACTICS_ROSTER_KEY].heroes.length === 0, ''));

  // get 返回副本（改返回值不影响存储）
  const copy = api.getVariables({ type: 'chat' });
  copy[protocol.TACTICS_ROSTER_KEY].heroes.push({ name: 'ghost' });
  cases.push(ok('T01-05 get返回副本', api.getVariables({ type: 'chat' })[protocol.TACTICS_ROSTER_KEY].heroes.length === 0, ''));

  // LLM 计数为 0
  cases.push(ok('T01-05 generateRaw=0', counts.generateRaw === 0, String(counts.generateRaw)));
  cases.push(ok('T01-05 generate=0', counts.generate === 0, String(counts.generate)));

  return { cases };
}

// ---------- T01-06 门禁负路径 ----------

async function t0106(deps) {
  const { spawnSync } = await import('child_process');
  const { fileURLToPath } = await import('url');
  const path = await import('path');
  const here = path.default.dirname(fileURLToPath(import.meta.url)); // integration-test/fixtures/tactics
  const runner = path.default.resolve(here, '..', '..', '..', 'tactics', 'tools', 'run-tests.cjs');
  const cases = [];

  const self = process.execPath;
  const run = (a) => spawnSync(self, [runner, ...a], { encoding: 'utf8', timeout: 120000 });

  // 三个负路径必须非零退出
  const n1 = run(['--stage=nonexistent']);
  cases.push(ok('T01-06 不存在stage非零', n1.status !== 0, 'status=' + n1.status));
  const n2 = run(['--stage=p01', '--group=T99-99']);
  cases.push(ok('T01-06 不存在group非零', n2.status !== 0, 'status=' + n2.status));
  const n3 = run(['--artifact', '--stage=p01']);
  cases.push(ok('T01-06 artifact明确拒绝', n3.status !== 0, 'status=' + n3.status));

  // 正对照：真实组执行成功（防"加载器永远失败"也通过）
  const p = run(['--stage=p01', '--group=T01-02']);
  cases.push(ok('T01-06 真实组执行成功对照', p.status === 0, 'status=' + p.status));

  // self-check 全过
  const sc = run(['--self-check']);
  cases.push(ok('T01-06 self-check通过', sc.status === 0, sc.status === 0 ? '' : String(sc.stdout).slice(-400)));

  return { cases };
}

// ---------- T01-07 独立闪避迁移 ----------

async function t0107(deps) {
  const { parser, roster } = deps.modules;
  const cases = [];

  const yamlText = [
    '战斗数据栏:',
    '  我方列表:',
    '    - 角色:',
    '        名字: 老狼',
    '        属性: "[Speed:120]"',
    '        技能: []',
    '        物品: []',
  ].join('\n');
  const y = parser.parseYamlText(yamlText).heroes[0];

  // 旧输入（无协议版本）首次迁移：evasion = 120
  const r1 = roster.resolveHero(y, { persistedHero: null, mmsHero: null, hasProtocolVersion: false });
  cases.push(ok('T01-07 首次迁移=spd', r1.hero.evasion === 120 && r1.evasion.source === 'legacy-spd' && r1.evasion.migrated === true, JSON.stringify(r1.evasion)));

  // 迁移值写入独立档 → 改敏捷 300 → 重载仍 120
  const persisted = { version: 1, heroes: [{ name: '老狼', config: { evasion: 120 }, persist: {}, skills: [], items: [] }] };
  const y2 = parser.parseYamlText(yamlText.replace('Speed:120', 'Speed:300')).heroes[0];
  const r2 = roster.resolveHero(y2, { persistedHero: persisted.heroes[0], mmsHero: null, hasProtocolVersion: false });
  cases.push(ok('T01-07 改敏捷闪避仍120', r2.hero.evasion === 120 && r2.evasion.source === 'baseline' && r2.evasion.migrated === false, JSON.stringify(r2.evasion)));
  cases.push(ok('T01-07 敏捷已改300', r2.hero.spd === 300, 'spd=' + r2.hero.spd));

  // 显式闪避 40 不被迁移覆盖
  const y3 = parser.parseYamlText(yamlText.replace('[Speed:120]', '[Speed:120][闪避:40]')).heroes[0];
  const r3 = roster.resolveHero(y3, { persistedHero: null, mmsHero: null, hasProtocolVersion: false });
  cases.push(ok('T01-07 显式40不被迁移覆盖', r3.hero.evasion === 40 && r3.evasion.source === 'yaml' && r3.evasion.migrated === false, JSON.stringify(r3.evasion)));

  // 显式 0 不被迁移覆盖
  const y4 = parser.parseYamlText(yamlText.replace('[Speed:120]', '[Speed:120][闪避:0]')).heroes[0];
  const r4 = roster.resolveHero(y4, { persistedHero: null, mmsHero: null, hasProtocolVersion: false });
  cases.push(ok('T01-07 显式0不被迁移覆盖', r4.hero.evasion === 0 && r4.evasion.source === 'yaml', JSON.stringify(r4.evasion)));

  // 重复迁移不再写（幂等）：第二次 resolveHero 有基准 → migrated=false
  const r5 = roster.resolveHero(JSON.parse(JSON.stringify(y)), { persistedHero: { version: 1, heroes: [{ name: '老狼', config: { evasion: 120 }, persist: {}, skills: [], items: [] }] }.heroes[0], mmsHero: null, hasProtocolVersion: false });
  cases.push(ok('T01-07 重复迁移不再写', r5.evasion.migrated === false && r5.hero.evasion === 120, JSON.stringify(r5.evasion)));

  // v1 新角色：原型闪避（标准人形 50）；legacy 判定不混淆
  const y6 = parser.parseYamlText('战斗数据栏:\n  协议版本: 1\n  我方列表:\n    - 角色:\n        名字: 新丁\n        原型: 标准人形\n        属性: "[Speed:100]"\n        技能: []\n        物品: []\n').heroes[0];
  const r6 = roster.resolveHero(y6, { persistedHero: null, mmsHero: null, hasProtocolVersion: true });
  cases.push(ok('T01-07 v1新角色原型闪避', r6.hero.evasion === 50 && r6.evasion.source === 'prototype', JSON.stringify(r6.evasion)));

  // v1 无原型新角色 → 标准人形缺省 50
  const y7 = parser.parseYamlText('战斗数据栏:\n  协议版本: 1\n  我方列表:\n    - 角色:\n        名字: 新丁2\n        属性: "[Speed:100]"\n        技能: []\n        物品: []\n').heroes[0];
  const r7 = roster.resolveHero(y7, { persistedHero: null, mmsHero: null, hasProtocolVersion: true });
  cases.push(ok('T01-07 v1无原型缺省50', r7.hero.evasion === 50 && r7.evasion.source === 'default-humanoid', JSON.stringify(r7.evasion)));

  // 同名历史角色不因 v1 变新人：有基准用基准
  const y8 = parser.parseYamlText('战斗数据栏:\n  协议版本: 1\n  我方列表:\n    - 角色:\n        名字: 老狼\n        属性: "[Speed:999]"\n        技能: []\n        物品: []\n').heroes[0];
  const r8 = roster.resolveHero(y8, { persistedHero: persisted.heroes[0], mmsHero: null, hasProtocolVersion: true });
  cases.push(ok('T01-07 同名历史角色用基准', r8.hero.evasion === 120 && r8.evasion.source === 'baseline', JSON.stringify(r8.evasion)));

  // 关闭属性持久化不能让闪避重新跟随敏捷：persistEvasion=false + 敏捷已改 → 仍基准 120
  const y9 = parser.parseYamlText(yamlText.replace('Speed:120', 'Speed:300')).heroes[0];
  const r9 = roster.resolveHero(y9, { persistedHero: { name: '老狼', config: { evasion: 120 }, persist: { persistEvasion: false }, skills: [], items: [] }, mmsHero: null, hasProtocolVersion: false });
  cases.push(ok('T01-07 persist关闭仍用基准', r9.hero.evasion === 120 && r9.evasion.source === 'baseline' && r9.evasion.migrated === false, JSON.stringify(r9.evasion)));

  return { cases };
}

// ---------- T01-08 配置包往返与草稿事务 ----------

async function t0108(deps) {
  const { parser, configPackage, storage, protocol } = deps.modules;
  const cases = [];

  // 构造含组子技能/绑定/显式0/persist 开关的角色（对象形态技能保证显式0）
  const heroA = parser.parseHeroEntry({
    '名字': 'A',
    '显示名称': 'A·别名',
    '原型': '标准人形',
    '属性': { maxHp: 100, atk: 0, evasion: 0, spd: 100 },
    '技能': [
      { name: '零耗技', cost: 0, type: '[单体]', power: 0, type2: '[无]', type3: '[无]', range: { type: '直线', length: 10, width: 1 }, actionCost: { main: 1, aux: 0 } },
      { name: '限次技', maxUses: 5, type: '[单体]', power: 20, type2: '[无]', type3: '[无]' },
      { name: '枪组', isGroup: true, groupOnly: true, type: '[无]', power: 0, type2: '[无]', type3: '[无]', children: [
        { name: '霰弹', cost: 2, type: '[单体(枪击)]', power: 25, slotTurns: 2, type2: '[无]', type3: '[无]' },
      ] },
    ],
    '物品': [
      { name: '子弹包', category: '弹药', maxUses: 0, bindings: [{ skillName: '霰弹', cost: 2 }], type: '[无]', power: 0, type2: '[无]', type3: '[无]' },
      { name: '改造装置', category: '道具', maxUses: 5, type: '[无]', power: 0, type2: '[无]', type3: '[无]',
        children: [{ name: '爆射', cost: 3, type: '[单体(枪击)]', power: 35, type2: '[无]', type3: '[无]' }] },
    ],
    '持久化': { persistAtk: true, persistSpd: false },
  });
  heroA.displayName = 'A·别名';
  const heroB = parser.parseHeroEntry({ '名字': 'B', '属性': '[Speed:80]', '技能': [], '物品': [] });

  // 对象形态限次：usesRemaining 初始 = maxUses（H2 回归锁）
  const skillLimit = heroA.skills.find(s => s.name === '限次技');
  cases.push(ok('T01-08 对象形态maxUses解锁', skillLimit.usesRemaining === 5, 'usesRemaining=' + skillLimit.usesRemaining));
  const itemKids = heroA.items[1];
  cases.push(ok('T01-08 物品对象形态children解析', itemKids.children && itemKids.children[0].name === '爆射', JSON.stringify(itemKids.children && itemKids.children.map(c => c.name))));

  // 全体序列化 → 往返
  const pkg = configPackage.buildConfigPackage([heroA, heroB], 'all');
  cases.push(ok('T01-08 包结构', pkg.format === 'rpg-tactics-config' && pkg.version === 1 && pkg.scope === 'all' && pkg.heroes.length === 2, JSON.stringify([pkg.format, pkg.version, pkg.scope])));
  const a = pkg.heroes[0];
  cases.push(ok('T01-08 显示别名保留', a.displayName === 'A·别名', JSON.stringify(a.displayName)));
  cases.push(ok('T01-08 显式0保留', a.config.atk === 0 && a.config.evasion === 0, JSON.stringify([a.config.atk, a.config.evasion])));
  cases.push(ok('T01-08 persist开关保留', a.persist.persistAtk === true && a.persist.persistSpd === false, JSON.stringify(a.persist)));
  const group = a.skills.find(s => s.isGroup);
  cases.push(ok('T01-08 组子技能保留', group && group.children.length === 1 && group.children[0].name === '霰弹' && group.children[0].slotTurns === 2, JSON.stringify(group && group.children)));
  const skill0 = a.skills.find(s => s.name === '零耗技');
  cases.push(ok('T01-08 范围/成本保留', eq(skill0.range, { type: '直线', length: 10, width: 1 }) && eq(skill0.actionCost, { main: 1, aux: 0 }), JSON.stringify([skill0.range, skill0.actionCost])));
  cases.push(ok('T01-08 绑定保留', eq(a.items[0].bindings, [{ skillName: '霰弹', cost: 2 }]), JSON.stringify(a.items[0].bindings)));

  // 禁项检查（逐层；含物品 children 路径的全量字符串断言——H1 回归锁）
  const json = JSON.stringify(pkg);
  const heroJson = JSON.stringify(a);
  cases.push(ok('T01-08 无当前hp/mp/tp', !/"hp":\d/.test(heroJson) || !heroA.hp, '当前资源未序列化（config 白名单不含）'));
  cases.push(ok('T01-08 无count/usesRemaining', !heroJson.includes('"count"') && !heroJson.includes('"usesRemaining"'), ''));
  cases.push(ok('T01-08 全包无usesRemaining含物品children', !json.includes('"usesRemaining"') && !json.includes('"_explicit"') && !json.includes('"_inGroup"'), ''));
  cases.push(ok('T01-08 物品children白名单往返', a.items[1].children.length === 1 && a.items[1].children[0].name === '爆射' && !('_explicit' in a.items[1].children[0]), JSON.stringify(a.items[1].children)));
  cases.push(ok('T01-08 无API密钥', !json.includes('apikey') && !json.includes('api_key') && !json.includes('apiKey'), ''));
  cases.push(ok('T01-08 无地图/桥台账', !json.includes('scenes') && !json.includes('battles') && !json.includes('pendingId'), ''));
  cases.push(ok('T01-08 无实时护盾/Buff', !heroJson.includes('shield') && !heroJson.includes('buffs') && !heroJson.includes('cooldowns'), ''));

  // 导入路径：children 不走私任意键（unpackItem 白名单）
  const smuggle = JSON.parse(JSON.stringify(pkg));
  smuggle.heroes[0].items[1].children[0].count = 99;
  smuggle.heroes[0].items[1].children[0].usesRemaining = 0;
  const unpacked = configPackage.createImportDraft([], smuggle);
  const unpackedChild = unpacked.draft[0].items[1].children[0];
  cases.push(ok('T01-08 导入children不走私键', !('count' in unpackedChild) && !('usesRemaining' in unpackedChild), JSON.stringify(Object.keys(unpackedChild))));

  // 单角色包恰好一项
  const pkgHero = configPackage.buildConfigPackage(heroA, 'hero');
  cases.push(ok('T01-08 单角色包一项', pkgHero.scope === 'hero' && pkgHero.heroes.length === 1, ''));
  let threw = false;
  try { configPackage.buildConfigPackage([heroA, heroB], 'hero'); } catch (e) { threw = true; }
  cases.push(ok('T01-08 单角色包两项报错', threw, ''));

  // 导入草稿：A 完整替换、C 追加、B 同名替换（内容不变）且保留在结果中
  const current = [JSON.parse(JSON.stringify(pkg.heroes[0])), JSON.parse(JSON.stringify(pkg.heroes[1]))];
  // 给当前 A 增加一项旧技能（模拟已保存状态）
  current[0].skills.push({ name: '旧技能X', type: '[单体]', power: 20, type2: '[无]', type3: '[无]' });
  const pkg2 = JSON.parse(JSON.stringify(pkg));
  pkg2.heroes[0].skills = pkg2.heroes[0].skills.filter(s => s.name !== '旧技能X'); // 导入文件里 A 无旧技能X
  pkg2.heroes.push({ name: 'C', config: {}, persist: {}, skills: [], items: [] });
  const draft = configPackage.createImportDraft(current, pkg2);
  cases.push(ok('T01-08 A完整替换', draft.replaced.includes('A') && !draft.draft[0].skills.some(s => s.name === '旧技能X'), JSON.stringify(draft.replaced)));
  cases.push(ok('T01-08 C追加', draft.added.includes('C') && draft.draft.some(h => h.name === 'C'), JSON.stringify(draft.added)));
  const reloadedB = draft.draft.find(h => h.name === 'B');
  cases.push(ok('T01-08 B保留', !!reloadedB && eq(reloadedB, current[1]), JSON.stringify([draft.added, draft.replaced, draft.kept])));

  // 取消零写入：走真实导入草稿流程但不调用保存（mock store 应保持初始空）
  const mock = installGlobalMock(createTavernMock());
  configPackage.createImportDraft(current, pkg2); // 只建草稿
  cases.push(ok('T01-08 取消零写入', JSON.stringify(mock.store.chat) === '{}', JSON.stringify(mock.store.chat)));

  // 保存 → 重载 → 新 YAML 显式仍最高优先
  const finalDraft = configPackage.finalizeImportDraft(draft.draft);
  storage.saveTacticsRoster({ version: 1, heroes: finalDraft }, 'chat');
  const reloaded = storage.readTacticsRoster('chat');
  cases.push(ok('T01-08 保存后可读回', reloaded && reloaded.heroes.length === 3, JSON.stringify(reloaded && reloaded.heroes.map(h => h.name))));
  // 删除旧技能不复活：读回的 A 无旧技能X
  const reloadedA = reloaded.heroes.find(h => h.name === 'A');
  cases.push(ok('T01-08 删除技能不复活', !reloadedA.skills.some(s => s.name === '旧技能X'), JSON.stringify(reloadedA.skills.map(s => s.name))));
  // 新 YAML 显式 0 仍最高优先：YAML evasion:0 vs 档里 evasion:0（同值），换 YAML 显式 evasion:33 → 33
  const yA = parser.parseHeroEntry({ '名字': 'A', '属性': { evasion: 33, spd: 100 } });
  const persistedHero = { name: 'A', config: reloadedA.config, persist: reloadedA.persist, skills: reloadedA.skills, items: reloadedA.items };
  const rA = rosterResolve(deps, yA, persistedHero);
  cases.push(ok('T01-08 保存后YAML显式仍最高', rA.hero.evasion === 33, 'evasion=' + rA.hero.evasion));

  return { cases };
}

// 辅助：避免在用例文件顶部重复 import roster
function rosterResolve(deps, yamlHero, persistedHero) {
  return deps.modules.roster.resolveHero(yamlHero, { persistedHero, mmsHero: null, hasProtocolVersion: true });
}

// ---------- 注册表 ----------

export const groups = {
  'T01-01': { run: withReview(t0101, 'T01-01') },
  'T01-02': { run: t0102 },
  'T01-03': { run: t0103 },
  'T01-04': { run: withReview(t0104, 'T01-04') },
  'T01-05': { run: t0105 },
  'T01-06': { run: withReview(t0106, 'T01-06') },
  'T01-07': { run: withReview(t0107, 'T01-07') },
  'T01-08': { run: withReview(t0108, 'T01-08') },
};

async function withLocalReview(modules) {
  const { parser, roster, storage, lifecycle } = modules;
  const cases = [];
  const check = (id, input, expected, actual) => cases.push({ id, input, expected, actual, pass: JSON.stringify(expected) === JSON.stringify(actual) });
  const y = parser.parseHeroEntry({ 名字: 'A', 属性: { maxHp: 200, maxMp: 150 } });
  const resolved = roster.resolveHero(y, { mmsHero: { hp: 50, maxHp: 55, mp: 20, maxMp: 25 }, hasProtocolVersion: true });
  check('T01-01 review resource maxima', { maxHp:200,maxMp:150,mmsHp:50,mmsMaxHp:55 }, [200,150,50,20,'yaml','yaml'], [resolved.hero.maxHp,resolved.hero.maxMp,resolved.hero.hp,resolved.hero.mp,resolved.sources.maxHp,resolved.sources.maxMp]);
  const emptyHero = parser.parseHeroEntry({ 名字:'A', 技能:[{name:'组',isGroup:true,children:[]}], 物品:[{name:'装置',children:[],bindings:[]}] });
  const cleared = roster.resolveHero(emptyHero, {persistedHero:{name:'A',config:{},skills:[{name:'组',isGroup:true,children:[{name:'旧技'}]}],items:[{name:'装置',children:[{name:'旧用法'}],bindings:[{skillName:'旧技',cost:2}]}]},hasProtocolVersion:true}).hero;
  check('T01-01 review nested clear', {children:[],bindings:[]}, [0,0,0], [cleared.skills[0].children.length,cleared.items[0].children.length,cleared.items[0].bindings.length]);
  const mock = installGlobalMock(createTavernMock());
  let writes=0; const replace=globalThis.replaceVariables; globalThis.replaceVariables=(...args)=>{writes++;return replace(...args);};
  const block=spd=>({protocolVersion:null,heroes:[parser.parseHeroEntry({名字:'旧角',属性:{spd,hp:23,mp:7},物品:[{name:'弹',category:'弹药',count:9}]})]});
  const first=storage.loadTacticsRoster(block(120));
  const second=storage.loadTacticsRoster(block(300));
  check('T01-07 review migration persists once', {firstSpd:120,nextSpd:300}, [120,120,300,1,true,false], [first.heroes[0].evasion,second.heroes[0].evasion,second.heroes[0].spd,writes,first.persisted,second.persisted]);
  check('T01-07 review baseline only', {}, {name:'旧角',config:{evasion:120}}, storage.readTacticsRoster().heroes[0]);
  for (const evasion of [0,40]) {
    storage.loadTacticsRoster({protocolVersion:null,heroes:[parser.parseHeroEntry({名字:'显式'+evasion,属性:{spd:999,evasion}})]});
    check('T01-07 review explicit '+evasion,{evasion},evasion,storage.readTacticsRoster().heroes.find(h=>h.name==='显式'+evasion).config.evasion);
  }
  let init=0; const deps={initScene:()=>++init};
  let state=lifecycle.applyLoad(null,{sceneId:'s',battleId:'b1'},null,deps).state;
  state.battles[lifecycle.battleKey('s','b1')].perBattleUses={ult:1};
  state=lifecycle.applyLoad(state,{sceneId:'s',battleId:'b2'},null,deps).state;
  const old=lifecycle.applyLoad(state,{sceneId:'s',battleId:'b1'},null,deps);
  check('T01-04 review old battle retains uses',{},['resume',1], [old.branch,old.battleState.perBattleUses.ult]);
  state=lifecycle.applyLoad(state,{sceneId:'other',battleId:'b'},null,deps).state;
  const reopen=lifecycle.reopenLoad(state,{sceneId:'s',battleId:'b1'});
  const follow=lifecycle.applyLoad(reopen.state,{sceneId:'s',battleId:'b1'},null,deps);
  check('T01-04 review reopen then update',{},['s','b1','resume',2], [reopen.state.current.sceneId,reopen.state.current.battleId,follow.branch,init]);
  return cases;
}

function withReview(run, group) {
  return async deps => {
    const result = await run(deps);
    if (['T01-01','T01-04','T01-07'].includes(group)) result.cases.push(...(await withLocalReview(deps.modules)).filter(c=>c.id.startsWith(group)));
    if (['T01-06','T01-08'].includes(group)) {
      const { runReviewRegressions } = await import('./p01-review-regressions.mjs');
      const extra=await runReviewRegressions(deps.modules);
      result.cases.push(...extra.filter(c=>c.id.startsWith(group)));
    }
    return result;
  };
}
