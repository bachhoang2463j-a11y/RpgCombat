// ==========================================
// 典型对局战棋样本数据用例（TT-DATA）
// 真实读取 doc/tactics/典型对局-战棋版.yaml，真实 import 生产源码；不复制业务实现。
// 组入口 run({modules}) → { cases: [{id, pass, detail}] }。
// ==========================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const srcDir = path.join(root, 'tactics', 'src');
const yamlPath = path.join(root, 'doc', 'tactics', '典型对局-战棋版.yaml');

const MODULE_FILES = {
  parser: 'parser.mjs',
  protocol: 'protocol.mjs',
  roster: 'roster.mjs',
  configPackage: 'config-package.mjs',
  scenarioData: 'scenario-data.mjs',
};

async function loadModules(provided) {
  const out = Object.assign({}, provided || {});
  for (const [key, file] of Object.entries(MODULE_FILES)) {
    if (!out[key]) out[key] = await import(pathToFileURL(path.join(srcDir, file)).href);
  }
  return out;
}

async function runTTData(deps = {}) {
  const m = await loadModules(deps.modules);
  const text = fs.readFileSync(yamlPath, 'utf8');
  const block = m.parser.parseYamlText(text);
  const cases = [];
  const ok = (id, pass, detail = '') => cases.push({ id, pass: !!pass, detail });

  const hero = n => block.heroes.find(h => h.name === n);
  const enemy = n => block.enemies.find(e => String(e.name).includes(n));
  const skill = (u, n) => (u && Array.isArray(u.skills) ? u.skills.find(s => s.name === n) : null);
  const item = (u, n) => (u && Array.isArray(u.items) ? u.items.find(i => i.name === n) : null);

  // 一、样本数量与身份
  ok('TT 英雄4', block.heroes.length === 4, String(block.heroes.length));
  ok('TT 敌方6', block.enemies.length === 6, String(block.enemies.length));
  ok('TT 召唤模板2', block.summonTemplates.length === 2, String(block.summonTemplates.length));
  ok('TT sceneId', block.sceneId === 'sc-chapel', String(block.sceneId));
  ok('TT 固定种子', block.meta && block.meta['随机种子'] === 20261123, JSON.stringify(block.meta && block.meta['随机种子']));

  // 二、中文属性保真
  const el = hero('埃利奥特');
  ok('TT 埃利奥特HP原值', el && el.hp === 100 && el.maxHp === 100, el && [el.hp, el.maxHp].join('/'));
  ok('TT 埃利奥特MP原值', el && el.mp === 110 && el.maxMp === 110, el && [el.mp, el.maxMp].join('/'));
  ok('TT 埃利奥特数值', el && el.atk === 20 && el.def === 40 && el.spd === 50 && el.evasion === 50 && el.strength === 35 && el.totalWeight === 50 && el.moveDistance === 6 && el.perception === 50, JSON.stringify(el && { atk: el.atk, def: el.def, spd: el.spd, evasion: el.evasion }));
  ok('TT 占格1x1', el && el.footprint && el.footprint.width === 1 && el.footprint.height === 1, JSON.stringify(el && el.footprint));
  ok('TT 职业', el && el.classType === '施法者', String(el && el.classType));
  ok('TT 玛德琳敏捷80', hero('玛德琳') && hero('玛德琳').spd === 80, String(hero('玛德琳') && hero('玛德琳').spd));

  const yug = enemy('犹格索托斯');
  ok('TT 特性带方括号', yug && ['[破法]', '[钢体]', '[再生]'].every(t => yug.attrTags.includes(t)), JSON.stringify(yug && yug.attrTags));
  ok('TT 占格2x2', yug && yug.footprint && yug.footprint.width === 2 && yug.footprint.height === 2, JSON.stringify(yug && yug.footprint));
  const deep = enemy('深潜者A');
  ok('TT 敌方特性', deep && deep.attrTags.includes('[要害]') && deep.attrTags.includes('[智慧]'), JSON.stringify(deep && deep.attrTags));

  // 三、范围
  const wall = skill(el, '纳克提特障壁术');
  ok('TT 圆形只半径无射程', wall && wall.range && wall.range.type === '圆形' && wall.range.radius === 6 && !('castRange' in wall.range), JSON.stringify(wall && wall.range));
  const dim = skill(yug, '维度撕裂');
  ok('TT 直线长宽', dim && dim.range && dim.range.type === '直线' && dim.range.length === 12 && dim.range.width === 2, JSON.stringify(dim && dim.range));
  const deer = skill(hero('弗兰克'), '温切斯特M1897-鹿弹二连发');
  ok('TT 扇形长度角度', deer && deer.range && deer.range.type === '扇形' && deer.range.length === 6 && deer.range.angle === 60, JSON.stringify(deer && deer.range));
  const bottle = item(el, '化尘者之瓶');
  const bottleChild = bottle && bottle.children.find(c => c.name === '瓶中之物');
  ok('TT 召唤范围', bottleChild && bottleChild.range && bottleChild.range.type === '召唤' && bottleChild.range.castRange === 12, JSON.stringify(bottleChild && bottleChild.range));
  const key = item(el, '蝎眼钥匙');
  ok('TT 召唤道具范围', key && key.range && key.range.type === '召唤' && key.range.castRange === 8, JSON.stringify(key && key.range));
  const kanpo = skill(el, '净蚀反冲');
  ok('TT 攻击来源→自身+reactionSource', kanpo && kanpo.range && kanpo.range.type === '自身' && kanpo.reactionSource === true, JSON.stringify({ range: kanpo && kanpo.range, rs: kanpo && kanpo.reactionSource }));

  // 四、区域
  const fog = skill(el, '拉莱耶造雾术');
  ok('TT 浓雾区域', fog && fog.regionEffect && fog.regionEffect.type === 'fog', JSON.stringify(fog && fog.regionEffect));

  // 五、动作与反应
  const quick = skill(el, '迅捷愈合法');
  ok('TT 动作辅', quick && quick.actionCost && quick.actionCost.main === 0 && quick.actionCost.aux === 1, JSON.stringify(quick && quick.actionCost));
  const savage = skill(el, '萨维奇三连发');
  ok('TT 动作主', savage && savage.actionCost && savage.actionCost.main === 1 && savage.actionCost.aux === 0, JSON.stringify(savage && savage.actionCost));
  const zhe = skill(el, '折影步');
  ok('TT 反应近战', zhe && zhe.isReaction === true && zhe.reactionTarget === '近战', JSON.stringify({ r: zhe && zhe.isReaction, t: zhe && zhe.reactionTarget }));
  ok('TT 看破法术', kanpo && kanpo.isReaction === true && kanpo.reactionTarget === '法术' && kanpo.kanpoTarget === '法术', JSON.stringify({ rt: kanpo && kanpo.reactionTarget, k: kanpo && kanpo.kanpoTarget }));
  const guard = skill(hero('弗兰克'), '紧急格挡');
  ok('TT 舍身近战', guard && guard.isReaction === true && guard.sheshenTarget === '近战', JSON.stringify({ s: guard && guard.sheshenTarget }));

  // 六、位移
  ok('TT 侧闪3', zhe && Array.isArray(zhe.displacements) && zhe.displacements.length === 1 && zhe.displacements[0].type === '侧闪' && zhe.displacements[0].distance === 3, JSON.stringify(zhe && zhe.displacements));
  ok('TT evadeShift兼容派生', zhe && zhe.evadeShift && zhe.evadeShift.mode === 'side' && zhe.evadeShift.distance === 3, JSON.stringify(zhe && zhe.evadeShift));
  const push = skill(hero('弗兰克'), '重击推撞');
  ok('TT 击退3', push && push.displacements && push.displacements.some(d => d.type === '击退' && d.distance === 3), JSON.stringify(push && push.displacements));
  const beast = block.summonTemplates.find(t => t.name.includes('幻梦行军兽'));
  const charge = skill(beast, '冲撞');
  ok('TT 冲锋6+击退3方向', charge && Array.isArray(charge.displacements) && charge.displacements.length === 2 && charge.displacements[0].type === '冲锋' && charge.displacements[0].distance === 6 && charge.displacements[1].type === '击退' && charge.displacements[1].distance === 3 && charge.displacements[1].direction === '冲锋方向', JSON.stringify(charge && charge.displacements));
  const blizzard = skill(enemy('伊塔库亚'), '极地暴风雪');
  ok('TT 爆心向外', blizzard && blizzard.displacements && blizzard.displacements.some(d => d.type === '击退' && d.distance === 2 && d.direction === '爆心向外'), JSON.stringify(blizzard && blizzard.displacements));

  // 七、穿透 / 眩晕 / 纯召唤
  const fire = skill(el, '火舞术-精准流火');
  ok('TT 裸穿透整技bool不占槽', fire && fire.isPierce === true && fire.type === '[火焰]' && fire.power === 30 && fire.type2 === '[燃烧]' && fire.power2 === 10 && fire.type3 === '[无]' && ![fire.type, fire.type2, fire.type3].includes('[穿透]'), JSON.stringify({ p: fire && fire.isPierce, s: fire && [fire.type, fire.power, fire.type2, fire.power2] }));
  const oldPierce = m.parser.parseSkill('【旧穿】[穿透;power:60][近战]');
  ok('TT 旧穿透power保槽', oldPierce.type === '[穿透]' && oldPierce.power === 60 && !oldPierce.isPierce, JSON.stringify([oldPierce.type, oldPierce.power, oldPierce.isPierce]));
  const stun = m.parser.parseSkill('【纯晕】[钝击;power:80][眩晕][近战]');
  ok('TT 眩晕无power纯减益', stun.type === '[钝击]' && stun.power === 80 && stun.type2 === '[眩晕]' && stun.power2 === 0, JSON.stringify([stun.type, stun.power, stun.type2, stun.power2]));
  const oldStun = m.parser.parseSkill('【旧晕】[眩晕;power:40][近战]');
  ok('TT 旧眩晕拆伤害+眩晕', oldStun.type === '[伤害]' && oldStun.power === 40 && oldStun.type2 === '[眩晕]' && oldStun.power2 === 0, JSON.stringify([oldStun.type, oldStun.power, oldStun.type2, oldStun.power2]));
  const pureSummon = m.parser.parseSkill('【纯召】[召唤:化尘者][MP:5][法术]');
  ok('TT 纯召唤不fallback伤害', pureSummon.type === '[无]' && pureSummon.power === 0 && pureSummon.summonTarget === '化尘者', JSON.stringify([pureSummon.type, pureSummon.power, pureSummon.summonTarget]));

  // 八、物品父子与绑定
  ok('TT 瓶父次数', bottle && bottle.maxUses === 1 && bottle.count === 1 && bottle.category === '道具' && bottle.isItem === true, JSON.stringify({ u: bottle && bottle.maxUses, c: bottle && bottle.count }));
  ok('TT 瓶子技能两名', bottle && Array.isArray(bottle.children) && bottle.children.length === 2 && bottle.children.map(c => c.name).join(',') === '瓶中之物,飞沙化甲', JSON.stringify(bottle && bottle.children && bottle.children.map(c => c.name)));
  ok('TT 子父名稳定无循环引用', bottle && bottle.children.every(c => c.parentItemName === '化尘者之瓶' && !('parentItem' in c)), JSON.stringify(bottle && bottle.children.map(c => c.parentItemName)));
  const fork = item(el, '安魂曲音叉');
  ok('TT 音叉3次三子', fork && fork.maxUses === 3 && fork.children.length === 3, JSON.stringify(fork && { u: fork.maxUses, n: fork.children.length }));
  const bullet = item(el, '.32子弹');
  ok('TT 弹药绑定', bullet && bullet.category === '弹药' && bullet.bindings.length === 1 && bullet.bindings[0].skillName === '萨维奇三连发' && bullet.bindings[0].cost === 3, JSON.stringify(bullet && bullet.bindings));

  // 九、配置包往返
  const pkg = m.configPackage.buildConfigPackage(block.heroes, 'all');
  const draft = m.configPackage.createImportDraft([], pkg);
  const dEl = draft.draft.find(h => h.name === '埃利奥特');
  const dBottle = dEl && dEl.items.find(i => i.name === '化尘者之瓶');
  ok('TT 配置往返父子结构', dBottle && Array.isArray(dBottle.children) && dBottle.children.length === 2 && dBottle.children[0].name === '瓶中之物' && dBottle.children[0].parentItemName === '化尘者之瓶', JSON.stringify(dBottle && dBottle.children && dBottle.children.map(c => c.name)));
  const dFire = dEl && dEl.skills.find(s => s.name === '火舞术-精准流火');
  ok('TT 配置往返范围/动作/穿透', dFire && dFire.range && dFire.range.type === '单体' && dFire.range.castRange === 15 && dFire.actionCost && dFire.actionCost.main === 1 && dFire.isPierce === true, JSON.stringify(dFire && { r: dFire.range, a: dFire.actionCost, p: dFire.isPierce }));
  const dZhe = dEl && dEl.skills.find(s => s.name === '折影步');
  ok('TT 配置往返位移', dZhe && Array.isArray(dZhe.displacements) && dZhe.displacements[0] && dZhe.displacements[0].type === '侧闪' && dZhe.displacements[0].distance === 3, JSON.stringify(dZhe && dZhe.displacements));
  const dFog = dEl && dEl.skills.find(s => s.name === '拉莱耶造雾术');
  ok('TT 配置往返区域', dFog && dFog.regionEffect && dFog.regionEffect.type === 'fog', JSON.stringify(dFog && dFog.regionEffect));

  // 十、scenario-data（可喂 createBattle）
  const data = m.scenarioData.createScenarioData(block);
  ok('TT 单位10', data.units.length === 10, String(data.units.length));
  ok('TT 站位10', Object.keys(data.placementsById).length === 10, String(Object.keys(data.placementsById).length));
  ok('TT 种子透传', data.seed === 20261123, String(data.seed));
  const ida = data.units.find(u => u.name.includes('伊塔库亚'));
  ok('TT 2x2左上锚点', ida && ida.footprint.width === 2 && ida.footprint.height === 2 && data.placementsById[ida.id].col === 2 && data.placementsById[ida.id].row === 5, JSON.stringify(ida && { fp: ida.footprint, p: data.placementsById[ida.id] }));
  const elUnit = data.units.find(u => u.name === '埃利奥特');
  ok('TT 单位字段完整', elUnit && elUnit.side === 'hero' && elUnit.controller === 'player' && elUnit.ref.hp === 100 && elUnit.ref.maxHp === 100 && elUnit.ref.tp === 0 && elUnit.ref.maxTp === 100 && elUnit.classType === '施法者' && Array.isArray(elUnit.skills) && Array.isArray(elUnit.items), JSON.stringify(elUnit && { hp: elUnit.ref.hp, tp: elUnit.ref.tp, maxTp: elUnit.ref.maxTp }));
  ok('TT 敌方controller ai', data.units.filter(u => u.side === 'enemy').every(u => u.controller === 'ai'), '');
  ok('TT createBattle字段齐全', data.units.every(u => u.id && u.name && (u.side === 'hero' || u.side === 'enemy') && u.footprint && u.ref && Array.isArray(u.skills) && Array.isArray(u.items) && Array.isArray(u.attrTags) && u.controller), '');
  const beastData = data.summonProvider('幻梦行军兽');
  ok('TT 召唤provider数值', beastData && beastData.maxHp === 420 && beastData.atk === 140 && beastData.footprint.width === 2 && beastData.skills.some(s => s.name === '冲撞' && Array.isArray(s.displacements) && s.displacements.length === 2), JSON.stringify(beastData && { hp: beastData.maxHp, atk: beastData.atk }));
  const dustData = data.summonProvider('化尘者');
  ok('TT 化尘者provider别名', dustData && dustData.maxHp === 90 && dustData.attrTags.includes('[流体]'), JSON.stringify(dustData && { hp: dustData.maxHp, tags: dustData.attrTags }));
  ok('TT provider精确别名不模糊', data.summonProvider('幻梦行军兽X') === null && data.summonProvider('行军兽') === null, '');

  // 十一、随机可复现
  const r1 = m.scenarioData.createSeededRandom(20261123);
  const a1 = r1(); const a2 = r1();
  const r2 = m.scenarioData.createSeededRandom(20261123);
  ok('TT 同种子同序列', r2() === a1 && r2() === a2, '');
  r1.reset();
  ok('TT reset复现', r1() === a1, '');

  return { cases };
}

export const groups = {
  'TT-DATA': { run: runTTData },
};
