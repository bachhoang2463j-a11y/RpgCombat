// 中文技能组解析定向用例：直接调用生产 parser.mjs，不复制解析逻辑。
import { parseSkillList } from '../../../tactics/src/parser.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const skill = (name, tags, extra = {}) => ({ 名字: name, 动作: '主', 标签: tags, ...extra });

const parent = (name, children) => ({ 名字: name, 子技能: children });
const chinese = parseSkillList([
  parent('火舞术', [skill('火舞术-精准流火', '[火焰;power:30][MP:2][限3次]'), skill('火舞术-压缩爆燃', '[火焰;power:70][MP:5]')]),
  skill('独立-技能', '[伤害;power:9]'),
  parent('早有准备', [skill('早有准备-预备咏唱', '[加速:3][再动;power:1]'), skill('早有准备-提前瞄准', '[瞄准;power:30][再动;power:1]')]),
]);
const fire = chinese.find(s => s.isGroup && s.name === '火舞术');
const prep = chinese.find(s => s.isGroup && s.name === '早有准备');
assert(fire && prep, '显式中文父对象未生成组卡');
assert(fire.children[0] === chinese[1] && fire.children[1] === chinese[2], 'children 与全局平铺引用/索引不一致');
assert(chinese[1]._inGroup && chinese[1].parentName === fire.name && chinese[1].name === '火舞术-精准流火', '组标记或完整原子技能名被修改');
assert(chinese[1].cost === 2 && chinese[1].maxUses === 3 && chinese[2].power === 70, '子技能数值、费用或次数被改动');
assert(prep.children[0] === chinese[5] && prep.children[1] === chinese[6], '早有准备 children 与全局平铺引用/索引不一致');
assert(prep.children.length === 2 && chinese.filter(s => s._inGroup).length === 4, '分组子技能缺失或重复平铺');
assert(chinese.some(s => s.name === '独立-技能' && !s._inGroup), '未声明子技能的连字符名字不应自动分组');

const explicitRoundTrip = parseSkillList([
  { name: '火舞术', isGroup: true, groupOnly: true, children: [{ name: '火舞术-精准流火', cost: 2, maxUses: 3, type: '[伤害]', power: 30, range: { type: '单体', castRange: 15 }, actionCost: { main: 1, aux: 0 }, isPierce: true }] },
]);
assert(explicitRoundTrip[0].children[0].range.castRange === 15 && explicitRoundTrip[0].children[0].actionCost.main === 1 && explicitRoundTrip[0].children[0].isPierce === true, '规范分组回读丢失范围/动作/穿透');

const legacy = parseSkillList([
  { name: '火舞术', isGroup: true, groupOnly: true, children: [{ name: '精准流火', cost: 2, maxUses: 3, type: '[伤害]', power: 30, _inGroup: true, parentName: '火舞术' }] },
  { name: '精准流火', cost: 2, maxUses: 3, type: '[伤害]', power: 30, _inGroup: true, parentName: '火舞术' },
]);
assert(legacy.length === 2 && legacy[0].children[0] === legacy[1], '旧规范children + flat存档重复或父子引用未归一');
assert(legacy[1]._inGroup && legacy[1].parentName === '火舞术', '旧flat子技能父子关系丢失');

const nested = parseSkillList([{ '【旧组】': ['【子技能】[MP:4][单体;power:12]'] }]);
assert(nested.length === 2 && nested[0].children[0] === nested[1], '旧嵌套组没有保持同一flatten引用');
console.log('中文技能组用例通过');
