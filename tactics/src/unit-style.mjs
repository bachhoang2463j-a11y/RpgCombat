// ==========================================
// 地图单位表现风格：我方按【职业】（README §7 八大职业），敌方按【杂兵/精英/BOSS】分级（敌方无职业，外圈保持红色）。
// 只决定画面与声音（外层光圈、待机动效类名、步态参数、步伐音/拖尾种类），不进规则、不接职业被动。
// 敌方分级沿用原版 getEnemyTier 的相对倍数兜底口径（以我方存活平均面板为基准；世界书等级直判本 Demo 未迁移）。
// ==========================================

// 6 档真实步态池：我方重装/常装/轻敏（8 职业调参区分） + 敌方杂兵/精英/BOSS
const HERO_HEAVY_POOL = ['move_hero_heavy_1', 'move_hero_heavy_2', 'move_hero_heavy_3'];
const HERO_NORMAL_POOL = ['move_hero_normal_1', 'move_hero_normal_2', 'move_hero_normal_3'];
const HERO_LIGHT_POOL = ['move_hero_light_1', 'move_hero_light_2', 'move_hero_light_3'];
const ENEMY_BOSS_POOL = ['move_enemy_boss_1', 'move_enemy_boss_2', 'move_enemy_boss_3'];
const ENEMY_ELITE_STEP_POOL = ['move_enemy_elite_step_1', 'move_enemy_elite_step_2', 'move_enemy_elite_step_3'];
const ENEMY_FODDER_POOL = ['move_enemy_fodder_1', 'move_enemy_fodder_2', 'move_enemy_fodder_3'];

// gait 字段见 motion.playPathMotion；stepSfx/glideSfx 为真实采样配置，step 保留旧标识兼容
export const CLASS_STYLE = {
  '防守者': { key: 'guard',   gait: { hop: 3, squash: 0.12, speed: 0.82, stride: 1.05 }, step: 'armorStep',   stepSfx: { pool: HERO_HEAVY_POOL,  vol: 0.88, rate: [0.94, 1.00] }, dust: 'heavy' },
  '狂战士': { key: 'berserk', gait: { hop: 6, squash: 0.14, speed: 1.12, stride: 0.95 }, step: 'berserkStep', stepSfx: { pool: HERO_HEAVY_POOL,  vol: 0.85, rate: [0.98, 1.06] }, dust: 'normal' },
  '风行者': { key: 'swift',   gait: { hop: 10, squash: 0.04, speed: 1.4, stride: 0.72 }, step: 'windStep',    stepSfx: { pool: HERO_LIGHT_POOL,  vol: 0.80, rate: [1.06, 1.14] }, dust: 'light', trail: 'ghost' },
  '灾厄使': { key: 'blight',  gait: { hop: 1, squash: 0.02, speed: 0.9, stride: 1.05 },  step: 'poisonDrag',  stepSfx: { pool: HERO_NORMAL_POOL, vol: 0.68, rate: [0.90, 0.96] }, dust: null,    trail: 'poison' },
  '隐匿者': { key: 'stealth', gait: { hop: 2, squash: 0.03, speed: 1.12, stride: 1.05 }, step: 'softStep',    stepSfx: { pool: HERO_LIGHT_POOL,  vol: 0.40, rate: [0.94, 1.00] }, dust: null },
  '施法者': { key: 'caster',  gait: { hop: 0, float: 9, speed: 0.95 },     step: null,          glideSfx: { key: 'move_enemy_elite_glide', vol: 0.72, rate: [1.15, 1.22], loop: true }, dust: null,    trail: 'arcane', glide: 'arcaneGlide' },
  '圣职者': { key: 'holy',    gait: { hop: 4, squash: 0.05, speed: 1, stride: 1.00 },    step: 'holyStep',    stepSfx: { pool: HERO_NORMAL_POOL, vol: 0.76, rate: [0.97, 1.04] }, dust: 'light', trail: 'holy' },
  '征伐者': { key: 'conquer', gait: { hop: 5, squash: 0.08, speed: 1.05, accel: true, stride: 1.00 }, step: 'marchStep', stepSfx: { pool: HERO_HEAVY_POOL, vol: 0.82, rate: [0.97, 1.04] }, dust: 'normal' },
};
CLASS_STYLE['施毒者'] = CLASS_STYLE['灾厄使'];
CLASS_STYLE['支援者'] = CLASS_STYLE['圣职者'];

export const TIER_STYLE = {
  fodder: { key: 'fodder', gait: { hop: 4, squash: 0.06, speed: 1.18, stride: 0.80 }, step: 'scuttle',   stepSfx: { pool: ENEMY_FODDER_POOL,     vol: 0.72, rate: [0.95, 1.08] }, dust: 'light' },
  elite:  { key: 'elite',  gait: { hop: 0, float: 5, speed: 0.92, stride: 1.10 },  step: null,        stepSfx: { pool: ENEMY_ELITE_STEP_POOL, vol: 0.78, rate: [0.96, 1.04] }, glideSfx: { key: 'move_enemy_elite_glide', vol: 0.58, rate: [0.96, 1.04] }, dust: null, trail: 'shadow', glide: 'shadowGlide' },
  legend: { key: 'boss',   gait: { hop: 5, squash: 0.16, speed: 0.72, stride: 1.35 }, step: 'bossStomp', stepSfx: { pool: ENEMY_BOSS_POOL,       vol: 0.95, rate: [0.95, 1.02] }, dust: 'heavy', shake: true },
};
const DEFAULT_STYLE = { key: 'default', gait: { stride: 1.00 }, step: 'step', stepSfx: { pool: HERO_NORMAL_POOL, vol: 0.75, rate: [0.97, 1.03] }, dust: 'normal' };

// 原版 getEnemyTier 第 2 段（相对倍数兜底）+ 机制关键词至少精英
export function enemyTier(enemy, heroes) {
  const alive = heroes.filter(h => (h.hp == null ? 1 : h.hp) > 0);
  const avg = (k, d) => alive.length ? alive.reduce((s, h) => s + (h[k] || d), 0) / alive.length : d;
  const avgHp = avg('maxHp', 100) || 100, avgAtk = avg('atk', 10) || 10, avgArmor = avg('def', 5) || 5;
  const rHp = (enemy.maxHp || 100) / avgHp;
  const rAtk = (enemy.atk || 10) / Math.max(1, avgAtk);
  const rArm = (enemy.def || 5) / Math.max(1, avgArmor);
  const act = enemy.actCount || 1;
  const tagStr = (enemy.tags || []).join(' ');
  const hasEliteMechanic = /坚韧|绝对抗性|无形|再生|复活|阶段|传奇Boss|头目|顶点/.test(tagStr) || (enemy.skills || []).some(s => /坚韧|绝对抗性|无形|再生|Boss/.test(s.name || ''));
  if (rHp >= 2.8 || rArm >= 2.8 || act >= 4) return 'legend';
  if (rHp >= 1.6 || rAtk >= 1.5 || rArm >= 1.8 || act >= 2 || hasEliteMechanic) return 'elite';
  return 'fodder';
}

// units：buildViewData 产物（u.side / u.ref 为 P01 角色）；返回 id → { key, cls, gait, step, dust, trail, glide, shake, tier? }
export function resolveUnitStyles(units) {
  const heroes = units.filter(u => u.side === 'hero').map(u => u.ref);
  const out = {};
  for (const u of units) {
    let st, cls;
    if (u.side === 'hero') {
      st = CLASS_STYLE[(u.ref.classType || '').trim()] || DEFAULT_STYLE;
      cls = 't-cls-' + st.key;
    } else {
      const tier = enemyTier(u.ref, heroes);
      st = Object.assign({ tier }, TIER_STYLE[tier]);
      cls = 't-tier-' + st.key;
    }
    out[u.id] = Object.assign({ cls }, st);
  }
  return out;
}
