// ==========================================
// 典型对局战棋样本 → createBattle 输入（纯数据，无 DOM）
// 唯一解析来源为 parser.mjs（不复制第二解析器）；本模块只做单位/布阵/种子/召唤 provider 组装。
// ==========================================

import { parseYamlCombatBlock, normalizeHeroName } from './parser.mjs';
import { generateEncounter } from './generation.mjs';

// 展示名去装饰（emoji / 变体选择符 / 装饰符号 ◈〖〗⸨⸩♱❄ 等）；保留原大小写，仅用于 ID 与别名。
const EMOJI_RE = /[\u200D\uFE0F\u2640\u2642\u26A7\u2600-\u27BF\u25A0-\u25FF\u3016\u3017\p{Extended_Pictographic}]/gu;
const DECOR_RE = /[◈〖〗⸨⸩♱❄★☆◆◇]/g;

export function stripNameDecoration(s) {
  return String(s == null ? '' : s).replace(EMOJI_RE, '').replace(DECOR_RE, '').trim();
}

// 匹配键：去装饰后再用生产 normalizeHeroName（剥残余前缀 emoji/空白、小写）
function matchKey(s) {
  return normalizeHeroName(stripNameDecoration(s));
}

// 同种子可复现随机（mulberry32）；reset 回到种子初值，供 battle.reset 复用
export function createSeededRandom(seed) {
  const initial = Number(seed) >>> 0;
  let state = initial;
  const rng = () => {
    state |= 0; state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.reset = () => { state = initial; };
  rng.seed = initial;
  return rng;
}

// 完整数值 ref：保留解析属性；TP 归零，maxTp 未显式时默认 100
function buildRef(src) {
  const explicit = Array.isArray(src && src._explicit) ? src._explicit : [];
  const maxTp = explicit.includes('maxTp') ? src.maxTp : 100;
  const ref = {
    hp: src.hp == null ? src.maxHp : src.hp,
    maxHp: src.maxHp,
    mp: src.mp == null ? src.maxMp : src.mp,
    maxMp: src.maxMp,
    tp: 0,
    maxTp,
    atk: src.atk, def: src.def, spd: src.spd,
    evasion: src.evasion, strength: src.strength, totalWeight: src.totalWeight,
    moveDistance: src.moveDistance, perception: src.perception,
    actCount: src.actCount, isWise: !!src.isWise,
    classType: src.classType == null ? null : src.classType,
    footprint: src.footprint && src.footprint.width > 0 && src.footprint.height > 0
      ? { width: Math.round(src.footprint.width), height: Math.round(src.footprint.height) }
      : { width: 1, height: 1 },
    attrTags: Array.isArray(src.attrTags) ? src.attrTags.slice() : [],
  };
  if (src.prototype) ref.prototype = src.prototype;
  // [复活] 且无显式次数：默认复活一次（归零后可复活 1 次）
  if (ref.attrTags.some(t => String(t).includes('复活')) && src.reviveCount == null) ref.reviveCount = 1;
  return ref;
}

export function createScenarioData(block, options = {}) {
  const parsed = block && Array.isArray(block.heroes) ? block : parseYamlCombatBlock(block);

  const placementByKey = new Map();
  if (!options.ignorePlacements) Object.keys(parsed.placements || {}).forEach(k => placementByKey.set(matchKey(k), parsed.placements[k]));

  const occ = new Map();
  const units = [];
  const placementsById = {};

  const addUnit = (src, side) => {
    if (!src) return;
    const display = stripNameDecoration(src.name) || String(src.name || '').trim();
    const baseKey = side + ':' + display;
    const n = (occ.get(baseKey) || 0) + 1;
    occ.set(baseKey, n);
    const id = (side === 'hero' ? 'h:' : 'e:') + display + (n > 1 ? ':' + n : '');
    const p = placementByKey.get(matchKey(src.name)) || placementByKey.get(matchKey(display));
    if (!p && !options.generatedPlacement) throw new Error('单位缺少站位: ' + src.name);
    const ref = buildRef(src);
    units.push({
      id,
      name: display,
      side,
      footprint: { width: ref.footprint.width, height: ref.footprint.height },
      ref,
      skills: structuredClone(src.skills || []),
      items: structuredClone(src.items || []),
      attrTags: Array.isArray(src.attrTags) ? src.attrTags.slice() : [],
      classType: src.classType == null ? null : src.classType,
      ...(src.level == null ? {} : { level: src.level }),
      controller: side === 'hero' ? 'player' : 'ai',
    });
    if (p) placementsById[id] = { col: p.col, row: p.row, facing: p.facing == null ? 0 : p.facing };
  };

  (parsed.heroes || []).forEach(h => addUnit(h, 'hero'));
  (parsed.enemies || []).forEach(e => addUnit(e, 'enemy'));

  // 召唤模板别名：剥装饰后的展示名做精确匹配（不做模糊全名匹配）
  const summonByAlias = new Map();
  (parsed.summonTemplates || []).forEach(t => {
    const alias = stripNameDecoration(t.name);
    if (alias) summonByAlias.set(alias, t);
  });

  const summonProvider = (name) => {
    const alias = stripNameDecoration(name);
    const t = summonByAlias.get(alias);
    if (!t) return null;
    const ref = buildRef(t);
    return {
      name: stripNameDecoration(t.name),
      portraitName: t.name, emoji: t.emoji, img: t.img, avatarUrl: t.avatarUrl,
      hp: ref.hp, maxHp: ref.maxHp, mp: ref.mp, maxMp: ref.maxMp, tp: 0, maxTp: ref.maxTp,
      atk: ref.atk, def: ref.def, spd: ref.spd,
      evasion: ref.evasion, strength: ref.strength, totalWeight: ref.totalWeight,
      moveDistance: ref.moveDistance, perception: ref.perception,
      footprint: { width: ref.footprint.width, height: ref.footprint.height },
      skills: Array.isArray(t.skills) ? t.skills : [],
      items: Array.isArray(t.items) ? t.items : [],
      attrTags: Array.isArray(t.attrTags) ? t.attrTags.slice() : [],
      classType: t.classType == null ? null : t.classType,
      reviveCount: ref.reviveCount || 0,
      level: t.level || null,
      entry: t.entry || null,
      extraRef: {
        hp: ref.hp, mp: ref.mp, maxHp: ref.maxHp, maxMp: ref.maxMp, maxTp: ref.maxTp, tp: 0,
        atk: ref.atk, def: ref.def, spd: ref.spd,
        evasion: ref.evasion, strength: ref.strength, totalWeight: ref.totalWeight,
        moveDistance: ref.moveDistance, perception: ref.perception,
      },
    };
  };

  const seedRaw = parsed.meta && parsed.meta['随机种子'] != null ? parsed.meta['随机种子'] : (parsed.seed != null ? parsed.seed : 0);
  const seed = Number.isFinite(+seedRaw) ? +seedRaw : 0;

  return { units, placementsById, seed, summonProvider };
}

export function createEncounterDemo(defaultYaml) {
  return { defaultYaml, encounter: { theme: 'chapel' } };
}

const ROOM_SIZES = { 小: 'small', 中: 'medium', 大: 'large' };

export function createEncounterScenario(block, defaults, positions) {
  // 复用旧样本阵容，不把三层礼拜堂的固定坐标带进生成房间。
  const demo = defaults && block.sceneId === 'sc-chapel' && block.battleId === 'bt-typical-01';
  const requested = block.meta?.['房间大小'];
  const theme = block.meta?.['地图主题'];
  if (!demo && requested == null && theme == null) return null;
  const data = createScenarioData(block, { generatedPlacement: true, ignorePlacements: !!demo });
  const sceneId = demo ? 'sc-chapel-nave' : block.sceneId;
  const room = generateEncounter({ theme: theme ?? defaults?.theme, size: ROOM_SIZES[requested] ?? requested ?? defaults?.size,
    seed: data.seed, sceneId, units: data.units, positions: { ...data.placementsById, ...positions } });
  if (!room.ok) throw new Error('单房间布阵冲突：' + JSON.stringify(room.report.conflicts));
  return { ...data, scene: room.scene, placementsById: room.placementsById };
}
