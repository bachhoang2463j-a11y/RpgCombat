// ==========================================
// 战棋 P01 协议常量与字段表（doc/tactics/P01-CONTRACT.md 的代码形态）
// 本文件只放"已冻结"的数据：协议版本、字段表、三原型、六范围、行动成本、布阵结构。
// 不含解析逻辑（parser.mjs）与合并逻辑（roster.mjs）。
// ==========================================

export const PROTOCOL_VERSION = 1;

// ---------- 独立存档键（chat 作用域） ----------
export const TACTICS_ROSTER_KEY = 'rpg_tactics_roster';
export const TACTICS_STATE_KEY = '$rpg_tactics_state';
export const TACTICS_BRIDGE_KEY = '$rpg_tactics_bridge';

// ---------- MMS 兼容桥（P01 仅定义与 mock 验证，不连接真实 MMS） ----------
export const COMBAT_RESULT_VAR_KEY = '$rpg_combat_result';
export const COMBAT_RESULT_EVENT = 'rpgcombat:battle-result';
export const COMBAT_APPLIED_EVENT = 'mms:combat-applied';
export const COMBAT_BRIDGE_CHANNEL = 'rpg-combat-bridge';
export const TACTICS_RESULT_ID_PREFIX = 'rt-';

// ---------- 基础战斗属性字段（旧属性，原版口径） ----------
// 这些字段全部按"存在性"判定，缺省值只在解析末尾填充，不参与显式判定。
export const BASE_STAT_FIELDS = ['hp', 'maxHp', 'mp', 'maxMp', 'tp', 'maxTp', 'atk', 'def', 'spd'];

// ---------- 新增独立属性字段（S05/S10/S14） ----------
export const TACTICS_STAT_FIELDS = ['evasion', 'strength', 'totalWeight', 'moveDistance', 'perception'];

// ---------- 原型字段 ----------
export const PROTOTYPE_NAMES = ['标准人形', '轻型生物', '大型生物'];

// 三原型缺省值（用户 2026-11-21 确认）：只补缺失字段，绝不覆盖已有值。
export const PROTOTYPES = {
  '标准人形': { evasion: 50, strength: 50, totalWeight: 70, moveDistance: 6, perception: 50, footprint: { width: 1, height: 1 } },
  '轻型生物': { evasion: 70, strength: 30, totalWeight: 25, moveDistance: 8, perception: 60, footprint: { width: 1, height: 1 } },
  '大型生物': { evasion: 30, strength: 150, totalWeight: 250, moveDistance: 8, perception: 50, footprint: { width: 2, height: 2 } },
};

// 新属性标签 → 规范字段（parseAttributes 扩展用）
export const TACTICS_TAG_FIELDS = {
  '闪避': 'evasion',
  '力量': 'strength',
  '总重': 'totalWeight',
  '移动': 'moveDistance',
  '感知': 'perception',
};

// ---------- 六种范围 ----------
export const RANGE_TYPES = ['单体', '直线', '扇形', '圆形', '全域', '爆炸'];

// 范围参数中文 → 规范字段。单位：长度米、角度度。
export const RANGE_PARAM_FIELDS = {
  '射程': 'castRange',
  '长': 'length',
  '宽': 'width',
  '角度': 'angle',
  '半径': 'radius',
};

// 各范围类型的必备/可选参数（数值仅为解析层的形态描述，缺尺寸时由 S14 预设补齐）
export const RANGE_PARAMS_BY_TYPE = {
  '单体': [],
  '直线': ['length', 'width'],
  '扇形': ['castRange', 'angle'],
  '圆形': ['castRange', 'radius'],
  '全域': [],
  '爆炸': ['castRange', 'radius'],
};

// ---------- 行动成本 ----------
// 普通主动技能缺省主行动；[行动:主]/[行动:辅] 显式覆盖。不新增通用零行动主动技。
export const ACTION_COST_MAIN = { main: 1, aux: 0 };
export const ACTION_COST_AUX = { main: 0, aux: 1 };
export const ACTION_COST_DEFAULT = ACTION_COST_MAIN;

// ---------- S14 空间预设（缺显式范围时按伤害类型/标签推导，不按技能名字猜） ----------
export const S14_RANGE_PRESETS = {
  单体近战: { type: '单体', castRange: 2 },
  单体远程: { type: '单体', castRange: 15 },
  群体近战: { type: '扇形', castRange: 3, angle: 90 },
  群体远程: { type: '圆形', castRange: 15, radius: 3 },
  显式直线缺尺寸: { length: 10, width: 1 },
  显式爆炸缺尺寸: { castRange: 15, radius: 3 },
};

// ---------- 显式集合的合法空值（必须保留，不算缺失） ----------
// 这些字段显式给出 null/''/[] 时按合法值保留；数值字段 null 不凭空解释为 0。
export const EXPLICIT_NULL_FIELDS = ['classType'];
export const EXPLICIT_EMPTY_STRING_FIELDS = ['fxTag'];
export const EXPLICIT_EMPTY_ARRAY_FIELDS = ['skills', 'items', 'children', 'bindings'];

// ---------- 持久化开关 ----------
// persist* 控制缺失字段是否采用存档，默认启用；任何开关不能反转 YAML 显式优先。
export const PERSIST_TOGGLE_FIELDS = {
  persistAtk: 'atk',
  persistDef: 'def',
  persistSpd: 'spd',
  persistMaxHp: 'maxHp',
  persistMaxMp: 'maxMp',
  persistMaxTp: 'maxTp',
  persistEvasion: 'evasion',
  persistStrength: 'strength',
  persistTotalWeight: 'totalWeight',
  persistMoveDistance: 'moveDistance',
  persistPerception: 'perception',
};

// ---------- 当前资源字段（不进配置/战术档，来源链 YAML 显式 > MMS > 初始化缺省） ----------
export const RUNTIME_RESOURCE_FIELDS = ['hp', 'mp', 'tp'];

// ---------- 库存实时字段（配置包严格排除） ----------
export const RUNTIME_ITEM_FIELDS = ['count', 'usesRemaining'];

// ---------- 配置包 ----------
export const CONFIG_PACKAGE_FORMAT = 'rpg-tactics-config';
export const CONFIG_PACKAGE_VERSION = 1;

// 配置包角色条目白名单：序列化与导入只认这些键（白名单生成，禁止黑名单删键）。
export const CONFIG_PACKAGE_HERO_KEYS = ['name', 'displayName', 'config', 'persist', 'skills', 'items'];

// config 内白名单（含新属性；不含当前 hp/mp/tp 与任何实时字段）
export const CONFIG_PACKAGE_CONFIG_KEYS = [
  'img', 'classType', 'isWise', 'prototype',
  'maxHp', 'maxMp', 'maxTp',
  'atk', 'def', 'spd',
  'evasion', 'strength', 'totalWeight', 'moveDistance', 'perception',
  'footprint', 'actCount',
];

// persist 开关白名单
export const CONFIG_PACKAGE_PERSIST_KEYS = Object.keys(PERSIST_TOGGLE_FIELDS);

// ---------- 语义布阵数据结构（仅定义，不求解；P05 做生成） ----------
// {
//   regions:   [{ id, ... }],
//   landmarks: [{ id, regionId, ... }],
//   relations: [{ subject, relation, object, strength: 'hard'|'soft', params }],
//   groups:    [{ id, unitIds, placement }],
//   overrides: [{ unitId, placement }]
// }
// 个体覆盖组偏好；硬关系不能静默丢弃。
export function emptyFormationSpec() {
  return { regions: [], landmarks: [], relations: [], groups: [], overrides: [] };
}

// ---------- scene/battle 身份 ----------
// 身份必须从输入取得；battle 按 scene 作用域寻址；单位 ID 同 scene 内稳定。
export function normalizeSceneBattleId(sceneId, battleId) {
  const scene = String(sceneId == null ? '' : sceneId).trim();
  const battle = String(battleId == null ? '' : battleId).trim();
  return { sceneId: scene || null, battleId: battle || null };
}
