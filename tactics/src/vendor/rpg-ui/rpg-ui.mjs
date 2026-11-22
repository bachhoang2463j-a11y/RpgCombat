// ==========================================
// 由 tactics/tools/extract-rpg-ui.cjs 自动生成，请勿手改。
// 源: index.html  sha256=6a7b72f3c58ec1eab918839113b30a7ff4dff2569b31684d89126556e8c72e53
// 入选声明 55 段: VARIANT_GRANT_NAMES@3103, VARIANT_GRANT_TIPS@3104, getGrantedVariantName@3112, SKILL_TYPES@3121, SKILL_TYPE_EDIT_OPTIONS@3139, TAG_EXPAND_MAP@3149, expandTagLabel@3169, tagDisplayLabel@3182, TAG_EFFECT_TIPS@3188, getTagTip@3256, tagTipAttrs@3272, ASSET_ORIGIN@3340, ASSET_BASE@3341, escapeHistoryHtml@3563, RLYEH_FOG_CLOUD_URL@15572, WEBM_FX_REGISTRY@16678, getEffectiveGroupChildren@19073, _queueUidCounter@20543, _prevQueueCurrentUid@20544, _roundStartGlowPending@20545, _recentSpeedChanges@20546, _TURN_QUEUE_ANIM_MS@20547, _TURN_QUEUE_EASE@20548, renderTurnQueue@20550, MENU_DAMAGE_TAGS@26978, isAttackSkill@26979, formatTagPill@26985, createSkillCard@27020, createSkillGroupCard@27156, updateSkillMenus@27199, closeAllSubMenus@27267, openBasicMenu@27272, closeBasicMenu@27273, openAttackSkillMenu@27276, closeAttackSkillMenu@27277, openSupportSkillMenu@27278, closeSupportSkillMenu@27279, ITEM_CATEGORY_META@27284, createItemCard@27290, updateItemMenu@27416, openItemMenu@27433, closeItemMenu@27439, closeSkillMenu@27445, buildEditorSkillTagPreview@27533, buildSkillFormFieldsHtml@27553, syncGrantSlotPower@27616, renderSkillTypeOptions@27627, closeSkillTypeCombo@27639, openSkillTypeCombo@27643, filterSkillTypeCombo@27662, applySkillTypeCombo@27677, togglePillClass@28478, _rcTipTimer@31334, showTagTipFor@31335, hideTagTip@31361
// 宿主注入: state, isSkillActionable, prepareSkillTarget, teamBarrier, skillHasBarrierTag, hasEnoughBindings, isSummonBlockedByLimit, getHeroItemBindings, itemBindingKnowledge, isItemUsable, prepareItemTarget, handleBasicAttack, handleBasicDefend, handleBasicRetreat, cancelTargeting, getSkillGroupChildren, prepareGroupedItemSkill
// 宿主适配补丁: 技能卡挂全局索引（宿主补射程胶囊）×1; 行动条外层加 id（宿主安全区）×1; 内联 onclick → 委托×13; 防御/撤退禁用注明×2; 标签下拉浮层挂作用域×1
// ==========================================
/* eslint-disable */
export const RPG_UI_RAIL_HTML = "    <div id=\"turn-order-rail\" class=\"absolute left-1 sm:left-4 md:left-6 top-16 sm:top-20 bottom-44 sm:bottom-48 w-12 sm:w-14 z-30 pointer-events-auto flex flex-col items-center select-none\">\n      <div class=\"relative w-full h-full flex flex-col items-center\">\n        <div class=\"timeline-rail\">\n          <div class=\"rail-pulse-beam\"></div>\n        </div>\n        <div id=\"turn-order-container\" class=\"relative w-full h-full flex flex-col gap-2 sm:gap-2.5 items-center overflow-y-auto no-scrollbar mask-fade-y py-3 scroll-smooth\"></div>\n      </div>\n    </div>";
export const RPG_UI_MENU_HTML = "      <div id=\"menu-container\" class=\"w-[260px] h-[172px] bg-slate-950/95 backdrop-blur-xl rounded-xl border border-slate-700/80 border-t-2 border-t-cyan-500/80 flex flex-col overflow-hidden transition-all duration-300 relative shadow-[0_15px_35px_rgba(0,0,0,0.9)] pointer-events-auto self-end mb-1 sm:mb-0\">\n      <div id=\"active-hero-name\" class=\"text-center text-[10px] sm:text-xs py-1 text-white/80 bg-white/5 tracking-widest uppercase border-b border-white/10 font-bold\">等待指令</div>\n      <div id=\"main-menu\" class=\"flex-1 flex flex-col p-1.5 gap-1 justify-center relative bg-slate-900/50\">\n        <button data-rpg-ui-act=\"openBasicMenu\" class=\"w-full py-1.5 px-3 bg-slate-900/80 hover:bg-cyan-950/60 border border-slate-700/80 hover:border-cyan-500/60 rounded-lg text-xs font-bold text-slate-200 hover:text-cyan-300 transition-all flex items-center gap-2 shadow-sm\"><span>📦</span> 基础行动</button>\n        <button data-rpg-ui-act=\"openAttackSkillMenu\" class=\"w-full py-1.5 px-3 bg-gradient-to-r from-rose-950/90 to-slate-900 border border-rose-500/50 rounded-lg text-xs font-bold text-white shadow-[0_0_12px_rgba(244,63,94,0.18)] hover:scale-[1.01] transition-all flex items-center gap-2\"><span class=\"text-rose-300\">🗡️</span> 攻击技能</button>\n        <button data-rpg-ui-act=\"openSupportSkillMenu\" class=\"w-full py-1.5 px-3 bg-gradient-to-r from-emerald-950/90 to-slate-900 border border-emerald-500/50 rounded-lg text-xs font-bold text-white shadow-[0_0_12px_rgba(16,185,129,0.18)] hover:scale-[1.01] transition-all flex items-center gap-2\"><span class=\"text-emerald-300\">✨</span> 辅助技能</button>\n        <button data-rpg-ui-act=\"openItemMenu\" class=\"w-full py-1.5 px-3 bg-slate-900/80 hover:bg-amber-950/60 border border-slate-700/80 hover:border-amber-500/60 rounded-lg text-xs font-bold text-slate-200 hover:text-amber-300 transition-all flex items-center gap-2\"><span>🎒</span> 物品道具</button>\n      </div>\n      <div id=\"charge-menu\" class=\"flex-1 flex-col p-2 gap-1 justify-center relative\" style=\"display:none\"></div>\n      <div id=\"basic-menu\" class=\"absolute inset-0 bg-slate-950/95 flex flex-col transform translate-x-full transition-transform duration-300 z-10 min-h-0\">\n        <div class=\"px-2.5 py-1 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0\">\n          <div class=\"flex items-center gap-1.5 min-w-0\">\n            <span class=\"w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0\"></span>\n            <span class=\"text-xs font-bold text-cyan-300\">基础行动</span>\n          </div>\n          <button data-rpg-ui-act=\"closeBasicMenu\" class=\"text-[9px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700\"><span>↩</span> 返回</button>\n        </div>\n        <div class=\"flex-1 flex flex-col gap-1 p-1.5 justify-center\">\n          <button data-rpg-ui-act=\"handleBasicAttack\" class=\"w-full py-2 px-3 bg-slate-900/80 hover:bg-cyan-950/60 border border-slate-700/80 hover:border-cyan-500/60 rounded-lg text-xs font-bold text-slate-200 hover:text-cyan-300 transition-all flex items-center gap-2\"><span class=\"text-rose-400\">⚔️</span> 普攻攻击</button>\n          <button data-rpg-ui-act=\"handleBasicDefend\" class=\"w-full py-2 px-3 bg-slate-900/80 hover:bg-emerald-950/60 border border-slate-700/80 hover:border-emerald-500/60 rounded-lg text-xs font-bold text-slate-200 hover:text-emerald-300 transition-all flex items-center gap-2\" disabled title=\"战棋未迁移\"><span class=\"text-emerald-400\">🛡️</span> 防御姿态 <span class=\"ml-auto text-[9px] text-slate-500 font-normal\">战棋未迁移</span></button>\n          <button data-rpg-ui-act=\"handleBasicRetreat\" class=\"w-full py-2 px-3 bg-slate-900/80 hover:bg-purple-950/60 border border-slate-700/80 hover:border-purple-500/60 rounded-lg text-xs font-bold text-slate-200 hover:text-purple-300 transition-all flex items-center gap-2\" disabled title=\"战棋未迁移\"><span class=\"text-purple-400\">💨</span> 尝试撤离 <span class=\"ml-auto text-[9px] text-slate-500 font-normal\">战棋未迁移</span></button>\n        </div>\n      </div>\n      <div id=\"attack-skill-menu\" class=\"absolute inset-0 bg-slate-950/95 flex flex-col transform translate-x-full transition-transform duration-300 z-10 min-h-0\">\n        <div class=\"px-2.5 py-1 bg-gradient-to-r from-rose-950/60 via-slate-900/90 to-slate-950 border-b border-rose-900/40 flex justify-between items-center shrink-0\">\n          <div class=\"flex items-center gap-1.5 min-w-0\">\n            <span class=\"w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0\"></span>\n            <span class=\"text-xs font-bold text-rose-300\">攻击技能</span>\n          </div>\n          <button data-rpg-ui-act=\"closeAttackSkillMenu\" class=\"text-[9px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700\"><span>↩</span> 返回</button>\n        </div>\n        <div id=\"attack-skill-list\" class=\"flex-1 flex flex-col gap-1 p-1 overflow-y-auto custom-scrollbar\"></div>\n      </div>\n      <div id=\"support-skill-menu\" class=\"absolute inset-0 bg-slate-950/95 flex flex-col transform translate-x-full transition-transform duration-300 z-10 min-h-0\">\n        <div class=\"px-2.5 py-1 bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-slate-950 border-b border-emerald-900/40 flex justify-between items-center shrink-0\">\n          <div class=\"flex items-center gap-1.5 min-w-0\">\n            <span class=\"w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0\"></span>\n            <span class=\"text-xs font-bold text-emerald-300\">辅助技能</span>\n          </div>\n          <button data-rpg-ui-act=\"closeSupportSkillMenu\" class=\"text-[9px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700\"><span>↩</span> 返回</button>\n        </div>\n        <div id=\"support-skill-list\" class=\"flex-1 flex flex-col gap-1 p-1 overflow-y-auto custom-scrollbar\"></div>\n      </div>\n      <div id=\"item-menu\" class=\"absolute inset-0 bg-slate-950/95 flex flex-col transform translate-x-full transition-transform duration-300 z-10 min-h-0\">\n        <div class=\"px-2.5 py-1 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-slate-950 border-b border-amber-900/40 flex justify-between items-center shrink-0\">\n          <div class=\"flex items-center gap-1.5 min-w-0\">\n            <span class=\"w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0\"></span>\n            <span class=\"text-xs font-bold text-amber-300\">物品道具</span>\n          </div>\n          <button data-rpg-ui-act=\"closeItemMenu\" class=\"text-[9px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700\"><span>↩</span> 返回</button>\n        </div>\n        <div id=\"item-list\" class=\"flex-1 flex flex-col gap-1 p-1 overflow-y-auto custom-scrollbar\"></div>\n      </div>\n      <div id=\"skill-menu\" class=\"absolute inset-0 bg-slate-950/95 hidden flex-col transform translate-x-full transition-transform duration-300 z-10 min-h-0\">\n        <div class=\"px-2.5 py-1 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0\">\n          <div class=\"flex items-center gap-1.5 min-w-0\">\n            <span class=\"w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0\"></span>\n            <span class=\"text-xs font-bold text-cyan-300\">选择技能</span>\n          </div>\n          <button data-rpg-ui-act=\"closeSkillMenu\" class=\"text-[9px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700\"><span>↩</span> 返回</button>\n        </div>\n        <div id=\"skill-list\" class=\"flex-1 flex flex-col gap-1 p-1 overflow-y-auto custom-scrollbar\"></div>\n      </div>\n      <div id=\"target-menu\" class=\"absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-2 transform translate-y-full transition-transform duration-300 z-20\">\n        <div id=\"target-hint\" class=\"text-rose-300 text-[10px] sm:text-xs font-bold tracking-widest mb-2 sm:mb-3 animate-pulse text-center leading-relaxed\">请选择目标</div>\n        <button data-rpg-ui-act=\"cancelTargeting\" class=\"px-3 sm:px-4 py-1 sm:py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded text-[10px] sm:text-xs border border-white/10 transition-colors\">取消</button>\n      </div>\n      <div id=\"enemy-turn-overlay\" class=\"absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300\"><span class=\"text-xs sm:text-sm text-rose-500/80 font-bold tracking-widest animate-pulse\">非玩家回合</span></div>\n    </div>";
export const RPG_UI_TIP_HTML = "<div id=\"rc-tag-tooltip\" aria-hidden=\"true\">\n  <div class=\"rc-tip-card\">\n    <div class=\"rc-tip-head\">\n      <span id=\"rc-tip-title\" class=\"rc-tip-title\"></span>\n      <span id=\"rc-tip-raw\" class=\"rc-tip-raw\"></span>\n    </div>\n    <div id=\"rc-tip-body\" class=\"rc-tip-body\"></div>\n  </div>\n</div>";
export const RPG_UI_EDITOR_HTML = "<div id=\"editor-modal\" class=\"fixed inset-0 bg-black/80 backdrop-blur-md z-[100] hidden items-center justify-center p-2 sm:p-4 overflow-y-auto\"></div>";

export function createRpgUi(host) {
  // ---- 宿主注入（战棋规则判定、瞄准入口、伪 state） ----
  const { state, isSkillActionable, prepareSkillTarget, skillHasBarrierTag, hasEnoughBindings, isSummonBlockedByLimit,
    getHeroItemBindings, itemBindingKnowledge, isItemUsable, prepareItemTarget, handleBasicAttack, handleBasicDefend,
    handleBasicRetreat, cancelTargeting, getSkillGroupChildren, prepareGroupedItemSkill } = host;
  const teamBarrier = 0;

  // ---- 原版代码（原样） ----
const VARIANT_GRANT_NAMES = ['流体', '虚形', '破法', '要害', '防火', '耐毒', '钢体', '再生', '狂暴', '吸血', '荆棘', '复活'];

const VARIANT_GRANT_TIPS = {
  '流体': '受到的远程伤害减半。', '虚形': '受到的近战伤害减半。',
  '破法': '受到的法术伤害减半。', '要害': '受到的群攻伤害减半，可与类型减伤叠加。',
  '防火': '免疫后续燃烧状态施加。', '耐毒': '免疫后续中毒状态施加。', '钢体': '免疫后续眩晕状态施加。',
  '再生': '每回合首次行动前回复最大生命值的10%。', '狂暴': '生命值不高于30%时攻击力提升50%。',
  '吸血': '造成实质生命伤害时回复伤害量的30%。', '荆棘': '被近战命中时反弹50%实质伤害，护甲减免后保底10点。',
  '复活': '有效期内遭致命伤以最大生命值的30%复活，本场仅一次，重施不恢复机会。'
};

function getGrantedVariantName(tag) {
  const m = String(tag || '').match(/^\[赋予[:：]([^\[\];]+)\]$/);
  return m && VARIANT_GRANT_NAMES.includes(m[1].trim()) ? m[1].trim() : null;
}

const SKILL_TYPES = [
  '[无]', '[群攻]', '[群攻(爆炸)]', '[群攻(雷)]', '[群攻(火焰)]', '[群攻(枪击)]', '[群攻(毒雾)]', '[群攻(冰霜)]', '[群攻(风)]', '[群攻(光)]',
  '[单体]', '[单体(枪击)]', '[单体(火焰)]', '[单体(光)]', '[单体(雷)]', '[单体(爆炸)]', '[单体(刀砍)]', '[单体(拳击)]', '[单体(爪击)]', '[单体(撕咬)]', '[单体(毒液)]', '[单体(冰霜)]', '[群回]', '[单回]', '[群增]',
  '[单增]', '[群防]', '[单防]', '[群盾]', '[单盾]',
  '[群回蓝]', '[单回蓝]', '[吸蓝]', '[群冲]', '[单冲]', '[群瞄]', '[单瞄]', '[群降]', '[单降]', '[群盲]', '[单盲]', '[群滞]', '[单滞]', '[群弱]', '[单弱]', '[嘲讽]', '[反击]', '[群反击]', '[再动]', '[回避]', '[群避]', '[单避]',
  '[眩晕]', '[群眩晕]', '[穿透]', '[群穿透]', '[散射]', '[散射(霰弹)]', '[群散射]', '[群散射(霰弹)]', '[免伤]',
  '[中毒]', '[群中毒]', '[燃烧]', '[群燃烧]', '[麻痹]', '[群麻痹]',
  '[单速]', '[群速]', '[单缓]', '[群缓]',
  '[自盲]', '[自降]', '[自弱]', '[自滞]', '[自缓]',
  '[驱散]', '[群驱散]',
  '[肃正]', '[肃正:近战]', '[肃正:远程]', '[肃正:法术]',
  ...VARIANT_GRANT_NAMES.map(name => `[赋予:${name}]`),
  '[必中]', '[转火]', '[突进]', '[众召]',
  '[高阶]', '[传奇]', '[神术]',
  '[近战]', '[远程]', '[法术]'
];

const SKILL_TYPE_EDIT_OPTIONS = SKILL_TYPES.filter(t => !['[必中]', '[转火]', '[突进]', '[众召]', '[高阶]', '[传奇]', '[神术]', '[近战]', '[远程]', '[法术]'].includes(t));

const TAG_EXPAND_MAP = {
  '单体': '单体伤害', '群攻': '群体伤害', '穿透': '单体穿透', '群穿透': '群体穿透',
  '散射': '散射伤害', '群散射': '群体散射', '眩晕': '击晕瘫痪', '群眩晕': '群体击晕',
  '单回': '目标回复', '群回': '群体回复', '单回蓝': '目标回蓝', '群回蓝': '群体回蓝',
  '吸蓝': '法力抽取', '单冲': '目标充能', '群冲': '群体充能',
  '单增': '目标增攻', '群增': '群体增攻', '单弱': '目标降攻', '群弱': '群体降攻',
  '单防': '目标加防', '群防': '群体加防', '单盾': '目标护盾', '群盾': '群体护盾',
  '单降': '目标降防', '群降': '群体降防', '单盲': '目标致盲', '群盲': '群体致盲',
  '单滞': '目标降避', '群滞': '群体降避', '单瞄': '目标瞄准', '群瞄': '群体瞄准',
  '单速': '目标加速', '群速': '群体加速', '单缓': '目标缓速', '群缓': '群体缓速',
  '单避': '目标闪避', '群避': '群体闪避', '自盲': '自身致盲',
  '自降': '自身降防', '自弱': '自身降攻', '自滞': '自身降避', '自缓': '自身缓速',
  '嘲讽': '目标嘲讽', '隐匿': '战术隐匿', '反击': '受击反击', '群反击': '全体反击',
  '再动': '额外行动', '回避': '紧急回避', '免伤': '绝对免伤', '必中': '锁定必中', '转火': '转火追击', '突进': '突进越阵', '众召': '众召破限',
  '中毒': '毒素侵蚀', '群中毒': '群体中毒', '燃烧': '火焰灼烧', '群燃烧': '群体灼烧',
  '麻痹': '雷电麻痹', '群麻痹': '群体麻痹', '驱散': '净化', '群驱散': '群体净化',
  '肃正': '绝对肃正', '高阶': '高阶战技', '传奇': '传奇秘术'
};

function expandTagLabel(typeStr) {
  if (!typeStr) return '';
  let core = String(typeStr).replace(/[\[\]]/g, '').trim();
  if (!core) return core;
  const grantName = getGrantedVariantName('[' + core + ']');
  if (grantName) return '赋予·' + grantName;
  const _szm = core.match(/^肃正[:：](.+)$/);
  if (_szm) return '肃正·' + _szm[1].trim();
  core = core.replace(/[（(][^）)]*[）)]/g, '');
  return TAG_EXPAND_MAP[core] || core;
}

function tagDisplayLabel(cleanTag, powerNum) {
  const _core = (String(cleanTag) === '嘲讽' && Number(powerNum) < 0) ? '隐匿' : cleanTag;
  return expandTagLabel(_core);
}

const TAG_EFFECT_TIPS = {
  '单体': '对单一目标造成 {N} 点伤害，受目标护甲减免。',
  '群攻': '对敌方全体造成 {N} 点伤害，受各自护甲减免。',
  '穿透': '无视目标护甲与护盾，直接造成 {N} 点伤害。',
  '群穿透': '对敌方全体造成无视护甲与护盾的 {N} 点伤害。',
  '眩晕': '造成 {N} 点伤害，被命中目标跳过下一次行动。',
  '群眩晕': '对敌方全体造成 {N} 点伤害，被命中目标跳过下一次行动。',
  '散射': '造成 {N} 点散射伤害，多弹丸各自受护甲减免（护甲减免×3），对无甲目标等效高威力。',
  '单回': '恢复目标 {N} 点 HP。',
  '群回': '恢复我方全体 {N} 点 HP。',
  '单回蓝': '恢复目标 {N} 点 MP。',
  '群回蓝': '恢复我方全体 {N} 点 MP。',
  '吸蓝': '命中后从目标抽走 {N} 点 MP 转移给施法者（仅单体）。',
  '单冲': '为目标注入 {N} 点战技点（TP），加速极限爆发充能。',
  '群冲': '为我方全体注入 {N} 点战技点（TP）。',
  '单增': '提升目标攻击力 {N} 点，持续数回合（默认 3 回合）。',
  '群增': '提升我方全体攻击力 {N} 点，持续数回合（默认 3 回合）。',
  '单弱': '降低目标攻击力 {N} 点，削弱其造成的伤害。',
  '群弱': '降低敌方全体攻击力 {N} 点。',
  '单防': '提升目标防御力 {N} 点，直接抵扣承受的伤害（无法减免穿透与真实伤害）。',
  '群防': '提升我方全体防御力 {N} 点。',
  '单盾': '赋予目标 {N} 点护盾，先于 HP 全额吸收直接伤害（真实伤害可绕过）。',
  '群盾': '赋予我方全体 {N} 点护盾。',
  '单降': '降低目标防御力 {N} 点，使其承受更多伤害。',
  '群降': '降低敌方全体防御力 {N} 点。',
  '单盲': '降低目标命中率 {N} 点，削弱其攻击命中上限。',
  '群盲': '降低敌方全体命中率 {N} 点。',
  '单滞': '降低目标闪避率 {N} 点，更易被命中（不影响行动速度）。',
  '群滞': '降低敌方全体闪避率 {N} 点。',
  '单瞄': '提升目标命中率 {N} 点，增强攻击判定命中上限，抵消受击方闪避。',
  '群瞄': '提升我方全体命中率 {N} 点。',
  '单速': '提升目标行动速度 {N} 点，行动顺序提前并立即重排（不影响闪避率）。',
  '群速': '提升我方全体行动速度 {N} 点。',
  '单缓': '降低目标行动速度 {N} 点，行动顺序延后并立即重排（不影响闪避率）。',
  '群缓': '降低敌方全体行动速度 {N} 点。',
  '单避': '持续提升目标闪避率 {N} 点，期间多次受击判定均有效（区别于单次生效的紧急回避）。',
  '群避': '持续提升我方全体闪避率 {N} 点。',
  '嘲讽': '提升自身受击仇恨权重，强制敌方索敌与单体攻击优先锁定自身。',
  '隐匿': '大幅降低自身受击仇恨权重，使敌方索敌优先将目标转向其他队友，大幅降低被集火概率。',
  '反击': '进入反击架势：成功闪避敌方近战攻击后，自动以攻击力结合技能威力回敬目标。',
  '群反击': '我方全体进入反击架势：闪避近战攻击后自动回击。',
  '再动': '施展后立即获得 {N} 次额外行动回合（该技能每大回合限用一次）。',
  '回避': '反应技：闪避判定失败、即将遭受对应类型攻击时，消耗 MP 插队重新进行闪避判定。',
  '免伤': '反应技：受击时临时提升 {N} 点防御抵挡一次，结算后立即消耗清除。',
  '中毒': '每回合造成 {N} 点真实伤害（无视护甲与护盾），每次命中独立叠层，层数无上限。',
  '群中毒': '对敌方全体施加中毒：每回合 {N} 点真实伤害，叠层。',
  '燃烧': '每回合造成 {N} 点真实伤害（无视护甲），期间目标受治疗效果减半（禁疗），重复施加仅刷新持续，不叠层。',
  '群燃烧': '对敌方全体施加燃烧：每回合 {N} 点真实伤害并禁疗。',
  '麻痹': '降低目标闪避率 {N} 点并叠层；每层附加 5% 行动僵直概率（封顶 20%），雷电系技能伴生。',
  '群麻痹': '对敌方全体施加麻痹：闪避降低并叠层，概率行动僵直。',
  '驱散': '净化目标身上的 {N} 层中毒、燃烧、眩晕、麻痹及负面属性状态。',
  '群驱散': '净化我方全体 {N} 层负面状态。',
  '肃正': '展开全队共享圣域屏障，存在期间敌方对应类型攻击强制归集结界，全额吸收穿透伤害并隔离负面效果；屏障未被击破前无法重复施展。',
  '必中': '该技能跳过闪避判定必定命中（仍可被敌方反应或看破化解）。',
  '转火': '多段连续攻击中，前置攻击段击杀当前目标后，后续攻击段自动转向其他存活敌人。',
  '突进': '近战攻击不受前排掩护限制，可直接攻击敌方后排（与职业【征伐者·破阵贯穿】同效）。',
  '众召': '群体召唤：本技能一次可召唤多只（清单用 ；/， 分隔，每只可带 *N，如 幻影*4；暗影），且其召唤物不占阵营召唤名额上限（默认 4 只），可超出上限入场。',
  '自盲': '施展代价：降低自身命中率 {N} 点。固定值生效，不受极限爆发与暴击放大。',
  '自降': '施展代价：降低自身防御力 {N} 点。',
  '自弱': '施展代价：降低自身攻击力 {N} 点。',
  '自滞': '施展代价：降低自身闪避率 {N} 点。',
  '自缓': '施展代价：降低自身行动速度 {N} 点。',
  '高阶': '高阶战技（Tier 2）品阶标记：卡牌呈现紫色高阶特效，通常伴随战技点（TP）消耗。',
  '传奇': '传奇秘术（Tier 3）品阶标记：品阶最高级，卡牌呈现赤红传奇特效。',
  '神术': '传奇阶叙事标记（[传奇] 的别名），无额外战斗数值效果。'
};

function getTagTip(typeStr, powerNum) {
  if (!typeStr) return '';
  let core = String(typeStr).replace(/[\[\]]/g, '').trim();
  const grantName = getGrantedVariantName('[' + core + ']');
  if (grantName) return `限时赋予目标【${grantName}】：${VARIANT_GRANT_TIPS[grantName]}持续由槽位回合或技能持续指定，默认3回合；同名不叠强度，重施仅延长持续。`;
  if (/^肃正[:：]/.test(core)) core = '肃正';
  if (String(core) === '嘲讽' && Number(powerNum) < 0) core = '隐匿';
  core = core.replace(/[（(][^）)]*[）)]/g, '');
  const tpl = TAG_EFFECT_TIPS[core];
  if (!tpl) return '';
  const _n = Number(powerNum);
  const hasP = powerNum !== undefined && powerNum !== null && !Number.isNaN(_n) && _n !== 0;
  return hasP ? tpl.split('{N}').join(String(Math.abs(_n))) : tpl.replace(/\s*\{N\}\s*(点|层|次|%|回合)/g, '');
}

function tagTipAttrs(cleanTag, powerNum, rawType) {
  let core = cleanTag;
  if (String(cleanTag) === '嘲讽' && Number(powerNum) < 0) core = '隐匿';
  const _tip = getTagTip(core, powerNum);
  if (!_tip) return '';
  return ` data-tagtip-title="【${expandTagLabel(core)}】" data-tagtip-body="${_tip}" data-tagtip-raw="${rawType || ''}"`;
}

const ASSET_ORIGIN = window.__RPG_ASSET_BASE__ || 'http://192.168.110.83:8766';

const ASSET_BASE = ASSET_ORIGIN;

function escapeHistoryHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

const RLYEH_FOG_CLOUD_URL = `${ASSET_BASE}/fog.mp3`;

const WEBM_FX_REGISTRY = {
    '火焰01': { url: `${ASSET_BASE}/fire.webm`,                                              scale: 1.4, particles: 'fire_aoe',    audioUrl: `${ASSET_BASE}/fire01.mp3` },
    '冰霜01': { url: `${ASSET_BASE}/ice.webm`,                                              scale: 1.4, particles: 'frost',       audioUrl: `${ASSET_BASE}/freeze01.mp3` },
    '雷击01': { url: `${ASSET_BASE}/450.webm`,               scale: 1.4, particles: 'thunder_aoe', audioUrl: `${ASSET_BASE}/thunder01.mp3` },
    '圣光01': { url: `${ASSET_BASE}/414.webm`,               scale: 1.4, particles: 'holy_light',  audioUrl: `${ASSET_BASE}/light01.mp3` },
    '双枪扫射': { url: `${ASSET_BASE}/strafe-ezremove05.mp4`, scale: 0.9, particles: 'gunshot',    audioUrl: 'none', delay: 0.5 },
    '克虏伯重狙': { url: `${ASSET_BASE}/snipe-ezremove.mp4`,  scale: 1.5, particles: 'gunshot',    audioUrl: 'none' },
    '异种坏死雾': { url: `${ASSET_BASE}/fog.mp4`, scale: 0.8, particles: 'poison',     audioUrl: 'none', delay: 0.2 },
    '生体流转': { url: `${ASSET_BASE}/heart.mp4`, scale: 0.4, particles: 'fire_aoe',     audioUrl: 'none' },
    '近战重击': { url: '', scale: 1.0, particles: 'melee_heavy', audioUrl: `${ASSET_BASE}/parry_Weapon_GuardBreak.wav` },
    '远程重击': { url: '', scale: 1.0, particles: 'ranged_heavy', audioUrl: 'none' },
    '枪击穿透': { url: '', scale: 1.0, particles: 'gunshot_pierce', audioUrl: `${ASSET_BASE}/gunshot_pierce.mp3` },
    '连续扫射': { url: '', scale: 1.0, particles: 'strafe_burst', audioUrl: 'none' },
    '造雾术': { url: '', scale: 1.0, particles: 'rlyeh_sediment', audioUrl: RLYEH_FOG_CLOUD_URL },
    '高阶召唤术': { url: '', scale: 1.0, particles: 'titan_gaze', audioUrl: 'none', delay: 1.0 },
    '障壁术': { url: '', scale: 1.0, particles: 'nak_aegis', audioUrl: 'none', delay: 0.8 },
    '灵风术': { url: '', scale: 1.0, particles: 'arcane', delay: 1.0 },
    '纳克提特障壁术': { url: '', scale: 1.0, particles: 'arcane', delay: 1.2 },
    '伊西丝之拥': { url: '', scale: 1.0, particles: 'arcane', delay: 1.1 },
    '折影步': { url: '', scale: 1.0, particles: 'arcane', delay: 0 },
    '巫师护盾': { url: '', scale: 1.0, particles: 'arcane', delay: 0 },
    '飞沙化甲': { url: '', scale: 1.0, particles: 'arcane', delay: 0.28 },
    '蝎眼钥匙': { url: '', scale: 1.0, particles: 'arcane', delay: 1.15 },
    '谐律之庇': { url: '', scale: 1.0, particles: 'arcane', delay: 0.90 },
    '静默之域': { url: '', scale: 1.0, particles: 'arcane', delay: 0.95 },
    '碎裂之响': { url: '', scale: 1.0, particles: 'arcane', delay: 0.95 },
    '塞赫美特之愠': { url: '', scale: 1.0, particles: 'arcane', delay: 1.45 },
    '逆咒归源镜': { url: '', scale: 1.0, particles: 'arcane', delay: 0.45 },
    '芭斯特的猫眼石': { url: '', scale: 1.0, particles: 'arcane', delay: 0.92 },
    '奇异海螺': { url: '', scale: 1.0, particles: 'arcane', delay: 0.50 },
    '砷弹射击': { url: '', scale: 1.0, particles: 'arcane', delay: 0.50 },
    'group:melee': { url: '', scale: 1.0, particles: 'arcane', delay: 0.35 },
    'group:ranged': { url: '', scale: 1.0, particles: 'arcane', delay: 0.35 },
    'group:spell': { url: '', scale: 1.0, particles: 'arcane', delay: 0.35 },
    // 用户新增三组（my_assets 实测核名：miaozhun/ranshao 为 .mp3+.webm，weimu 音效为 .wav）；开镜瞄准/燃烧弹无 delay（立即结算），圣域帷幕 delay 1（演出后结算）、均不放大音量
    // 开镜瞄准/燃烧弹 scale 0.42：用户实测原 1.4 过大，降至 30%（1.4×0.3）
    '开镜瞄准': { url: `${ASSET_BASE}/miaozhun.webm`, scale: 0.42, audioUrl: `${ASSET_BASE}/miaozhun.mp3` },
    '燃烧弹': { url: `${ASSET_BASE}/ranshao.webm`, scale: 0.42, particles: 'fire_aoe', audioUrl: `${ASSET_BASE}/ranshao.mp3` },
    '圣域帷幕': { url: `${ASSET_BASE}/weimu.webm`, scale: 1.4, particles: 'holy_light', audioUrl: `${ASSET_BASE}/weimu.wav`, delay: 1 },
    // 在此继续添加：
    // delay 可选（单位：秒）：特效播放后、伤害结算前的等待时长，用于长特效演出与伤害数字同步；未配置则立即结算
    // '火焰02': { url: 'https://...', scale: 1.2, particles: 'fire_aoe',    audioUrl: 'https://...' },
    // '冰霜02': { url: 'https://...', scale: 1.6, particles: 'frost',        audioUrl: 'https://...' },
    // '雷击02': { url: 'https://...', scale: 1.0, particles: 'thunder_aoe',  audioUrl: 'https://...' },
    // '圣光02': { url: 'https://...', scale: 1.4, particles: 'holy_light',   audioUrl: 'https://...' },
    // '爆炸01': { url: null,          scale: 0,   particles: 'explosion'                             },
};

function getEffectiveGroupChildren(hero, parent) {
    const paired = getSkillGroupChildren(hero, parent);
    if (paired.length) return paired;
    return Array.isArray(parent.children) ? parent.children : [];
}

let _queueUidCounter = 0;            // 队列条目 uid 分配器（FLIP 定位 + 行动切换判定）

let _prevQueueCurrentUid = null;     // 上次渲染的当前行动者 uid（聚焦冲击 / 再动爆闪切换判定）

let _roundStartGlowPending = false;  // 新回合开始光晕待触发标记（startRound 置位、本函数消费一次）

const _recentSpeedChanges = new Map(); // 速度变动追踪总线：entityId -> { delta, time }

const _TURN_QUEUE_ANIM_MS = 600;     // 行动条动效基准时长（0.6s）

const _TURN_QUEUE_EASE = 'cubic-bezier(0.34, 1.45, 0.64, 1)'; // 崩铁原味弹簧缓动

function renderTurnQueue() {
  const container = document.getElementById('turn-order-container');
  if (!container) return;

  // 1. FIRST：记录现有节点的绝对位置（FLIP 定位用）
  const firstRects = new Map();
  Array.from(container.querySelectorAll('.turn-queue-item')).forEach(node => {
    const id = node.getAttribute('data-item-uid');
    if (id) firstRects.set(id, node.getBoundingClientRect());
  });

  // 回合开始光晕标记只消费一次（startRound 置位），本帧渲染即清零
  const isRoundStart = _roundStartGlowPending;
  _roundStartGlowPending = false;

  // 2. 渲染：视觉轮转——当前行动者恒在顶部，已行动者滚回队尾（环形扫描跳过死亡）
  container.innerHTML = '';
  container.scrollTop = 0; // 当前恒在顶部，无需滚动居中
  let visualIdx = 0;       // 存活单位的视觉序号（0 = 当前行动者）
  let currentUid = null;   // 本帧当前行动者的 uid（无当前行动者时为 null）
  const glowNodes = [];
  const q = state.actionQueue;
  const curRef = (q[state.queueIndex] && q[state.queueIndex].ref) || null;

  for (let ri = 0; ri < q.length; ri++) {
    const realIndex = (state.queueIndex + ri) % q.length;
    const item = q[realIndex];
    if (!item || !item.ref || !item.ref.isAlive) continue;
    if (!item.uid) item.uid = ++_queueUidCounter;

    const isCurrent = visualIdx === 0 && state.isGameStarted && curRef && curRef.isAlive;
    const isExtra = item.isExtraTurn && item.queueSpd === undefined; // 再动/多重施法/连动/祈愿 插队项
    const justSwitched = item.uid !== _prevQueueCurrentUid;

    const borderCol = isExtra ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]' : 
                      (item.type === 'hero' ? 'border-cyan-400' : 'border-rose-500');
    const bgCol = isExtra ? 'bg-amber-950/70' : 
                  (item.type === 'hero' ? 'bg-cyan-900/50' : 'bg-rose-900/50');
    const highlight = isCurrent ? 'scale-110 ring-2 ring-yellow-400 z-30' : 'opacity-70 scale-90 blur-[1px]';

    const _isSummonQ = !!(item.ref && item.ref.isSummon);
    const content = (_isSummonQ ? !!item.ref.img : (item.type === 'hero' || !!item.ref.img))
      ? `<img src="${item.ref.img}" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none';this.nextElementSibling&&this.nextElementSibling.classList.remove('hidden')"><div class="hidden w-full h-full flex items-center justify-center text-sm sm:text-2xl">${item.ref.emoji || '👻'}</div>`
      : `<div class="w-full h-full flex items-center justify-center text-sm sm:text-2xl">${item.ref.emoji || '👻'}</div>`;

    // 序号徽章（左下角 #1, #2...）
    const rankPill = `
      <div class="absolute -left-1 -bottom-1 z-20 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-950/95 border border-slate-700 flex items-center justify-center text-[7px] sm:text-[9px] font-mono font-bold text-slate-300 shadow-sm pointer-events-none">
        ${visualIdx + 1}
      </div>
    `;

    // 「⚡再动」角标：精美琥珀流金置顶（未行动插队项常驻，已行动滚回队尾后消失）
    const extraBadgeHtml = (isExtra && realIndex >= state.queueIndex)
      ? `<div class="extra-badge-active absolute -top-1.5 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 border border-amber-200/90 shadow-[0_0_10px_rgba(251,191,36,0.9)] text-[7px] sm:text-[8px] font-black text-slate-950 leading-none whitespace-nowrap pointer-events-none">⚡再动</div>`
      : '';

    // 速度变动角标与漂浮数值（🟢▲ 提速 / 🔴▼ 降速）
    const speedChg = _recentSpeedChanges.get(item.ref.id);
    let spdBadgeHtml = '';
    let spdFloatHtml = '';

    if (speedChg && (Date.now() - speedChg.time < 2000)) {
      const isUp = speedChg.delta > 0;
      if (isUp) {
        spdBadgeHtml = `
          <div class="spd-badge-up absolute -top-1 -right-1 z-40 flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-tr from-emerald-600 via-green-400 to-emerald-200 border border-white shadow-[0_0_8px_rgba(16,185,129,0.9)] pointer-events-none">
            <span class="arrow-icon text-[8px] sm:text-[9px] font-black text-slate-950 leading-none">▲</span>
          </div>
        `;
        spdFloatHtml = `<div class="spd-float-up absolute -right-6 top-0 z-50 text-[9px] sm:text-[10px] font-black text-emerald-300 font-mono drop-shadow-[0_0_6px_rgba(16,185,129,0.9)] whitespace-nowrap pointer-events-none">+${speedChg.delta}速</div>`;
      } else {
        spdBadgeHtml = `
          <div class="spd-badge-down absolute -top-1 -right-1 z-40 flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-tr from-rose-700 via-red-500 to-rose-300 border border-white shadow-[0_0_8px_rgba(244,63,94,0.9)] pointer-events-none">
            <span class="arrow-icon text-[8px] sm:text-[9px] font-black text-white leading-none">▼</span>
          </div>
        `;
        spdFloatHtml = `<div class="spd-float-down absolute -right-6 top-0 z-50 text-[9px] sm:text-[10px] font-black text-rose-400 font-mono drop-shadow-[0_0_6px_rgba(244,63,94,0.9)] whitespace-nowrap pointer-events-none">${speedChg.delta}速</div>`;
      }
    }

    const currentCursor = isCurrent
      ? `<div class="absolute -right-1 sm:-right-2 top-1/2 -translate-y-1/2 text-yellow-400 text-[8px] sm:text-xs font-bold animate-pulse drop-shadow-md">◀</div>`
      : '';

    const itemDiv = document.createElement('div');
    // 外层不设 overflow-hidden（让冲击环/角标可溢出显示），尺寸优化为精致响应式
    itemDiv.className = `turn-queue-item relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${borderCol} ${bgCol} shadow-lg transition-all duration-300 ${highlight} flex-shrink-0 cursor-pointer`;
    itemDiv.setAttribute('data-item-uid', item.uid);
    itemDiv.title = item.ref.name;
    itemDiv.innerHTML = `
      <div class="w-full h-full rounded-full overflow-hidden relative">
        ${content}
      </div>
      ${rankPill}
      ${extraBadgeHtml}
      ${spdBadgeHtml}
      ${spdFloatHtml}
      ${currentCursor}
    `;
    container.appendChild(itemDiv);

    // 3. 动效挂点
    if (isCurrent) {
      currentUid = item.uid;
      // 回合开始光晕全队覆盖当前项，本帧不叠加聚焦/爆闪（两种 animation 互斥）
      if (!isRoundStart && justSwitched) {
        if (isExtra) {
          // 再动爆闪：闪电能量爆发 + 金色冲击环
          itemDiv.classList.add('extra-turn-burst-enter');
          const ring = document.createElement('div');
          ring.className = 'lightning-shockwave-ring';
          itemDiv.appendChild(ring);
          setTimeout(() => ring.remove(), 800);
        } else {
          // 崩铁原味：新行动者金色聚焦冲击
          itemDiv.classList.add('queue-focus-surge');
          setTimeout(() => itemDiv.classList.remove('queue-focus-surge'), 650);
        }
      }
    }

    // 新回合开始：全队按阵营色发出一次光晕（赛博光轨，逐项 40ms 错峰）
    if (isRoundStart) {
      const glowColor = isExtra
        ? 'rgba(251,191,36,0.9)'
        : (item.type === 'hero' ? 'rgba(6,182,212,0.85)' : 'rgba(244,63,94,0.85)');
      itemDiv.style.setProperty('--glow-c', glowColor);
      itemDiv.classList.add('queue-round-glow');
      itemDiv.style.animationDelay = `${visualIdx * 40}ms`;
      glowNodes.push(itemDiv);
    }

    visualIdx++;
  }

  // 4. FLIP：存活节点从旧位置弹簧滑向新位置（行动切换整列上移 / 已行动者滚回队尾 / 速度重排）
  Array.from(container.querySelectorAll('.turn-queue-item')).forEach(node => {
    const id = node.getAttribute('data-item-uid');
    const firstRect = firstRects.get(id);
    if (!firstRect) return;
    const lastRect = node.getBoundingClientRect();
    const deltaY = firstRect.top - lastRect.top;
    const deltaX = firstRect.left - lastRect.left;
    if (Math.abs(deltaY) > 1 || Math.abs(deltaX) > 1) {
      node.style.transition = 'none';
      node.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      node.offsetHeight; // force reflow
      node.style.transition = `transform ${_TURN_QUEUE_ANIM_MS}ms ${_TURN_QUEUE_EASE}, box-shadow ${_TURN_QUEUE_ANIM_MS}ms ease`;
      node.style.transform = 'translate3d(0, 0, 0)';
      setTimeout(() => {
        node.style.transition = '';
        node.style.transform = ''; // 回落至 Tailwind scale 工具类（transition-all 300ms 平滑过渡）
      }, _TURN_QUEUE_ANIM_MS + 50);
    }
  });

  // 5. 收尾：回合光晕批量清理 / 记录当前行动者 uid（供下次切换判定）
  if (glowNodes.length) {
    const glowCleanupMs = _TURN_QUEUE_ANIM_MS + (glowNodes.length) * 40 + 100;
    setTimeout(() => glowNodes.forEach(n => {
      n.classList.remove('queue-round-glow');
      n.style.animationDelay = '';
      n.style.removeProperty('--glow-c');
    }), glowCleanupMs);
  }
  _prevQueueCurrentUid = currentUid;
}

const MENU_DAMAGE_TAGS = ['单体','群攻','穿透','群穿透','眩晕','群眩晕'];

function isAttackSkill(skill) {
  const slots = [skill.type, skill.type2, skill.type3];
  return MENU_DAMAGE_TAGS.some(t => slots.some(s => s && s.includes(t)));
}

function formatTagPill(typeStr, powerNum) {
  if (!typeStr || typeStr === '[无]') return '';
  let cleanTag = typeStr.replace(/[\[\]]/g, '');
  let colorStyle = 'bg-slate-900/80 text-slate-300 border-slate-700';
  if (getGrantedVariantName(typeStr)) colorStyle = 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70';
  else if (cleanTag.includes('攻') || cleanTag.includes('单体') || cleanTag.includes('穿透')) colorStyle = 'bg-rose-950/80 text-rose-300 border-rose-800/70';
  else if (cleanTag.includes('吸蓝')) colorStyle = 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70';
  else if (cleanTag.includes('回') || cleanTag.includes('冲') || cleanTag.includes('驱散')) colorStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/70';
  else if (cleanTag.includes('盾') || cleanTag.includes('防')) colorStyle = 'bg-blue-950/80 text-blue-300 border-blue-800/70';
  else if (cleanTag.includes('降') || cleanTag.includes('盲') || cleanTag.includes('滞') || cleanTag.includes('弱') || cleanTag.includes('眩晕') || cleanTag.includes('中毒') || cleanTag.includes('燃烧') || cleanTag.includes('麻痹')) colorStyle = 'bg-purple-950/80 text-purple-300 border-purple-800/70';
  else if (cleanTag.includes('再动')) colorStyle = 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-700/70 font-bold';
  else if (cleanTag.includes('避')) colorStyle = 'bg-teal-950/80 text-teal-300 border-teal-700/70';
  else if (cleanTag.includes('缓')) colorStyle = 'bg-purple-950/80 text-purple-300 border-purple-800/70';
  else if (cleanTag.includes('速')) colorStyle = 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70';
  else if (cleanTag.includes('嘲')) colorStyle = 'bg-amber-950/80 text-amber-300 border-amber-800/70';
  else if (cleanTag.includes('传奇') || cleanTag.includes('神术')) colorStyle = 'bg-amber-950/90 text-amber-200 border-amber-500/70 font-bold';
  else if (cleanTag.includes('高阶')) colorStyle = 'bg-violet-950/90 text-violet-200 border-violet-500/70 font-bold';
  else if (cleanTag.includes('肃正')) colorStyle = 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70';
  else if (cleanTag.includes('召唤')) colorStyle = 'bg-sky-950/90 text-sky-300 border-sky-500/70 font-bold';
  let pText = !getGrantedVariantName(typeStr) && powerNum !== undefined && powerNum !== 0 ? `<span class="opacity-90 font-mono-num ml-0.5">${powerNum}</span>` : '';
  return `<span${tagTipAttrs(cleanTag, powerNum, typeStr)} class="text-[8px] px-1 py-0.2 rounded border ${colorStyle} shrink-0 flex items-center leading-none">${tagDisplayLabel(cleanTag, powerNum)}${pText}</span>`;
}

function createSkillCard(hero, skill, idx) {
    const isExtraTurnSkill = skill.type.includes('再动') || (skill.type2 && skill.type2.includes('再动')) || (skill.type3 && skill.type3.includes('再动'));
    const isUsedExtraTurn = isExtraTurnSkill && state.usedExtraTurnSkillsThisRound && state.usedExtraTurnSkillsThisRound.has(skill.name);
    const usesLeft = skill.maxUses > 0 ? (skill.usesRemaining ?? skill.maxUses) : 0;
    const isUsesExhausted = skill.maxUses > 0 && usesLeft <= 0;
    const isMpEnough = hero.mp >= skill.cost;
    const isHpEnough = hero.hp > (skill.hpCost || 0);
    const isTpEnough = hero.tp >= (skill.tpCost || 0);
    const isBurstBlocked = hero.burstActivated && skill.tpCost > 0;
    const isBarrierBlocked = teamBarrier > 0 && skillHasBarrierTag(skill);
    const isBindingEnough = hasEnoughBindings(hero, skill);
    const isEnough = isSkillActionable(hero, skill);
    let themeClass = 'skill-card-default';
    let typeBadgeStyle = 'bg-slate-800 text-slate-300 border-slate-600/60';
    let typeIcon = '⚔️';
    if (skill.damageType === '法术') { themeClass = 'skill-card-magic'; typeBadgeStyle = 'bg-purple-950/90 text-purple-300 border-purple-500/60'; typeIcon = '⚡'; }
    else if (skill.damageType === '远程') { themeClass = 'skill-card-ranged'; typeBadgeStyle = 'bg-amber-950/90 text-amber-300 border-amber-500/60'; typeIcon = '🎯'; }
    else if (skill.damageType === '近战') { themeClass = 'skill-card-melee'; typeBadgeStyle = 'bg-rose-950/90 text-rose-300 border-rose-500/60'; typeIcon = '🗡️'; }
    let cardStateClass = themeClass;
    if (isUsesExhausted) cardStateClass += ' exhausted-card';
    else if (!isEnough) cardStateClass += ' disabled-card';
    const btn = document.createElement('button');
    btn.className = `w-full p-1.5 rounded-lg border border-slate-800/80 text-left shrink-0 flex flex-col gap-1 relative overflow-hidden transition-all duration-200 group ${cardStateClass}`;
    let row1Html = `
      <div class="flex items-center justify-between gap-1.5 w-full shrink-0">
        <div class="flex items-center gap-1 min-w-0">
          <span class="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors tracking-wide truncate leading-tight">
            ${skill.name}
          </span>
          ${skill.isOthers ? `<span class="text-[8px] bg-teal-950/90 text-teal-300 border border-teal-600/60 px-1 py-0.2 rounded shrink-0 leading-tight">他人</span>` : ''}
          ${skill.isLegendary ? `<span class="text-[8px] bg-amber-950/90 text-amber-200 border border-amber-500/70 px-1 py-0.2 rounded shrink-0 leading-tight font-bold">✦传奇</span>` : ''}
          ${(!skill.isLegendary && skill.isHighTier) ? `<span class="text-[8px] bg-violet-950/90 text-violet-200 border border-violet-500/70 px-1 py-0.2 rounded shrink-0 leading-tight font-bold">⬥高阶</span>` : ''}
        </div>
        ${skill.damageType ? `
          <span class="text-[8px] font-bold px-1 py-0.2 rounded border shrink-0 flex items-center gap-0.5 ${typeBadgeStyle} leading-tight">
            <span>${typeIcon}</span> ${skill.damageType}
          </span>
        ` : `
          <span class="text-[8px] font-bold px-1 py-0.2 rounded border border-slate-700 bg-slate-900 text-slate-400 shrink-0 leading-tight">
            普通
          </span>
        `}
      </div>
    `;
    let tagsHtml = '';
    if (skill.summonTarget) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-sky-950/90 text-sky-300 border-sky-500/70 shrink-0 flex items-center leading-none font-bold">召唤:${escapeHistoryHtml(skill.summonTarget)}</span>`;
    if (skill.summonNoLimit) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-indigo-950/90 text-indigo-300 border-indigo-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">🐾 众召·破限</span>`;
    else if (isSummonBlockedByLimit(skill)) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border text-rose-400 border-rose-500/80 bg-rose-950 shrink-0 font-bold flex items-center gap-0.5 leading-none">🐾 召唤名额已满</span>`;
    tagsHtml += formatTagPill(skill.type, skill.power);
    if (skill.type2) tagsHtml += formatTagPill(skill.type2, skill.power2);
    if (skill.type3) tagsHtml += formatTagPill(skill.type3, skill.power3);
    if (skill.delay) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-amber-950/90 text-amber-300 border-amber-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">⏳ 蓄力:${skill.delay}</span>`;
    if (skill.haste) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-cyan-950/90 text-cyan-300 border-cyan-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">⚡ 加速:${skill.haste}</span>`;
    if (skill.hit && skill.hit !== 100) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-slate-900 text-slate-400 border-slate-700 font-mono-num shrink-0 leading-none">🎯${skill.hit}</span>`;
    if (skill.guaranteedHit) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-rose-950/90 text-rose-300 border-rose-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">🎯 必中</span>`;
    if (skill.switchTarget) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-orange-950/90 text-orange-300 border-orange-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">🔥 转火</span>`;
    if (skill.ignoreRow) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-indigo-950/90 text-indigo-300 border-indigo-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">🗡️ 突进</span>`;
    if (skill.critRate > 0) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-orange-950/90 text-orange-300 border-orange-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">💥 暴击${skill.critRate}%</span>`;
    let row2Html = `
      <div class="flex items-center gap-1 flex-wrap w-full shrink-0">
        ${tagsHtml || '<span class="text-[8px] text-slate-500">无附加效果</span>'}
      </div>
    `;
    let costBadgesHtml = '';
    if (skill.cost > 0) {
      const errClass = !isMpEnough ? 'text-rose-400 border-rose-500/80 bg-rose-950' : 'text-cyan-300 border-cyan-800/60 bg-cyan-950/60';
      costBadgesHtml += `<span class="text-[8px] font-mono-num font-bold px-1 py-0.2 rounded border ${errClass} leading-none">💧 ${skill.cost} MP</span>`;
    }
    if (skill.hpCost > 0) {
      const errClass = !isHpEnough ? 'text-rose-400 border-rose-500/80 bg-rose-950' : 'text-rose-300 border-rose-800/60 bg-rose-950/60';
      costBadgesHtml += `<span class="text-[8px] font-mono-num font-bold px-1 py-0.2 rounded border ${errClass} leading-none">❤️ ${skill.hpCost} HP</span>`;
    }
    if (skill.tpCost > 0) {
      const errClass = (!isTpEnough || isBurstBlocked) ? 'text-rose-400 border-rose-500/80 bg-rose-950' : 'text-emerald-300 border-emerald-800/60 bg-emerald-950/60';
      costBadgesHtml += `<span class="text-[8px] font-mono-num font-bold px-1 py-0.2 rounded border ${errClass} leading-none">🔥 ${skill.tpCost} TP</span>`;
    }
    // 绑定物品需求徽章（弹药/道具/消耗品通用，AND 语义逐项列出）：存量不足时红色告警，与 MP/HP/TP 不足同级的禁用条件
    const _itemBindings = getHeroItemBindings(hero).get(skill.name);
    if (_itemBindings) {
      _itemBindings.forEach(b => {
        const it = b.item;
        const isGear = it.category === '道具';
        const remain = isGear ? `${(it.usesRemaining ?? it.maxUses) || 0}次` : `${it.count || 0}`;
        const icon = it.category === '弹药' ? '🔹' : it.category === '消耗品' ? '🧪' : '🎒';
        const insufficient = isGear ? (it.maxUses > 0 && (it.usesRemaining ?? it.maxUses) <= 0) : (it.count || 0) < b.cost;
        const errClass = insufficient ? 'text-rose-400 border-rose-500/80 bg-rose-950' : 'text-amber-300 border-amber-800/60 bg-amber-950/60';
        costBadgesHtml += `<span class="text-[8px] font-mono-num font-bold px-1 py-0.2 rounded border ${errClass} leading-none">${icon} ${it.name}×${b.cost}（剩${remain}）</span>`;
      });
    } else {
      // 材料严格模式：英雄未携带该技能的绑定物品，但注册表登记过它需要材料 → 禁用态整体提示（无物品列表可列）
      const _knownNeed = itemBindingKnowledge.get(skill.name);
      if (_knownNeed && _knownNeed.length) costBadgesHtml += `<span class="text-[8px] font-mono-num font-bold px-1 py-0.2 rounded border text-rose-400 border-rose-500/80 bg-rose-950 leading-none">🎒 缺少施展材料</span>`;
    }
    if (!costBadgesHtml) costBadgesHtml = `<span class="text-[8px] text-slate-400 font-mono leading-none">⚡ 零消耗</span>`;
    let limitBadgeHtml = '';
    if (isUsedExtraTurn) limitBadgeHtml += `<span class="text-[8px] font-bold px-1 py-0.2 rounded border bg-rose-950 text-rose-400 border-rose-800 leading-none">🚫 本轮已用</span>`;
    else if (skill.maxUses > 0) {
      if (isUsesExhausted) limitBadgeHtml += `<span class="text-[8px] font-bold px-1 py-0.2 rounded border bg-rose-950 text-rose-400 border-rose-800 leading-none">🚫 已用尽</span>`;
      else limitBadgeHtml += `<span class="text-[8px] font-bold px-1 py-0.2 rounded border bg-amber-950 text-amber-300 border-amber-600/70 leading-none">📌 限${usesLeft}/${skill.maxUses}次</span>`;
    }
    let notEnoughNotice = '';
    if (!isUsesExhausted && !isUsedExtraTurn && !isEnough) {
      let missingArr = [];
      if (isBurstBlocked) missingArr.push('爆发中禁' + (skill.tpCost) + 'TP');
      if (isBarrierBlocked) missingArr.push('屏障存在中');
      if (!isMpEnough) missingArr.push('MP不足');
      if (!isHpEnough) missingArr.push('HP不足');
      if (!isTpEnough) missingArr.push('TP不足');
      if (!isBindingEnough) missingArr.push(_itemBindings && _itemBindings.some(b => b.item.category === '弹药') ? '弹药不足' : '材料不足');
      if (isSummonBlockedByLimit(skill)) missingArr.push('召唤名额已满');
      notEnoughNotice = `<span class="text-[8px] text-rose-400 font-bold leading-none">⚠️ ${missingArr.join(' ')}</span>`;
    }
    let row3Html = `
      <div class="flex items-center justify-between gap-1 w-full shrink-0 pt-0.5 border-t border-slate-800/80">
        <div class="flex items-center gap-1 flex-wrap">
          ${costBadgesHtml}
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${limitBadgeHtml}
          ${notEnoughNotice}
        </div>
      </div>
    `;
    btn.innerHTML = row1Html + row2Html + row3Html;
    btn.dataset.skillIdx = idx; if (isEnough) btn.onclick = () => prepareSkillTarget(idx);
    return btn;
}

function createSkillGroupCard(hero, parent, parentIdx, children, groupUsable) {
    // 组父无自身行动语义：伪造无消耗/无标签的展示对象走 createSkillCard 渲染（恒灰显）
    const displayObj = Object.assign({}, parent, {
        cost: 0, hpCost: 0, tpCost: 0, delay: 0, haste: 0,
        type: '[无]', power: 0, type2: '[无]', power2: 0, type3: '[无]', power3: 0
    });
    const btn = createSkillCard(hero, displayObj, parentIdx);
    // 名称旁追加变体徽章 + 展开箭头（复用 createSkillCard 后就地补充，不重写模板）
    const nameSpan = btn.querySelector('span.text-xs');
    let arrow = null;
    if (nameSpan) {
        const badge = document.createElement('span');
        badge.className = 'text-[8px] bg-slate-800 text-slate-300 border border-slate-600/60 px-1 py-0.2 rounded shrink-0 leading-tight';
        badge.textContent = '⇅ 变体×' + children.length;
        arrow = document.createElement('span');
        arrow.className = 'text-slate-400 text-[10px] transition-transform duration-200 shrink-0' + (parent.isGroupExpanded ? ' rotate-180' : '');
        arrow.textContent = '▼';
        nameSpan.after(badge, arrow);
    }
    btn.classList.toggle('disabled-card', !groupUsable);
    // 子技能卡容器（预渲染；updateSkillMenus 渲染前已统一重置收起，展开仅当次菜单会话内有效；
    // 子卡直接复用 createSkillCard → prepareSkillTarget(全局idx) 生效）
    const wrap = document.createElement('div');
    wrap.className = 'pl-2 flex flex-col gap-1 border-l border-slate-800 ml-1' + (parent.isGroupExpanded ? '' : ' hidden');
    children.forEach(c => {
        const gIdx = hero.skills.indexOf(c);
        if (gIdx >= 0) wrap.appendChild(createSkillCard(hero, c, gIdx));
    });
    if (groupUsable) { btn.onclick = () => {
        parent.isGroupExpanded = !parent.isGroupExpanded;
        wrap.classList.toggle('hidden', !parent.isGroupExpanded);
        if (arrow) arrow.classList.toggle('rotate-180', parent.isGroupExpanded);
    }; }
    else { btn.onclick = null; }
    const outer = document.createElement('div');
    outer.className = 'flex flex-col gap-1 shrink-0';
    outer.appendChild(btn);
    outer.appendChild(wrap);
    return outer;
}

function updateSkillMenus(hero) {
  if (!hero) return;
  // 子技能组默认收起：每次（重）渲染一律折叠，展开态不跨渲染/跨回合记忆（避免菜单逐次打开愈发杂乱）
  if (hero.skills) hero.skills.forEach(s => { if (s.isGroupExpanded) s.isGroupExpanded = false; });
  const atkList = document.getElementById('attack-skill-list');
  const supList = document.getElementById('support-skill-list');
  const legacyList = document.getElementById('skill-list');
  if (atkList) atkList.innerHTML = '';
  if (supList) supList.innerHTML = '';
  if (legacyList) legacyList.innerHTML = '';
  let atkCount = 0, supCount = 0;
  // 可用技能优先排列：按 isSkillActionable 稳定排序（同组内保持原有技能顺序），不可用（灰显）技能沉底
  // 变体组：组父卡单发（children 非空）；组内子技能（_inGroup）不单发，只在组卡展开时呈现。
  // 断链兜底：标记丢失的子行按"组父 children 引用集合"二次排除（与 getEffectiveGroupChildren 回退口径一致），
  // 防止断链时子技能脱离组卡在面板额外显示
  const groupedRefs = new Set();
  hero.skills.forEach(s => { if (s && s.isGroup && Array.isArray(s.children)) s.children.forEach(c => groupedRefs.add(c)); });
  hero.skills.map((skill, idx) => ({ skill, idx, usable: isSkillActionable(hero, skill) }))
    .filter(({ skill }) => !(skill.isReaction || skill.kanpoTarget || (skill.sheshenTarget && !skill._ownerOnly)))
    .filter(({ skill }) => !(skill._ownerOnly && !skill.summonTarget))
    .filter(({ skill }) => !skill._inGroup && !groupedRefs.has(skill))
    .sort((a, b) => (b.usable ? 1 : 0) - (a.usable ? 1 : 0))
    .forEach(({ skill, idx }) => {
      const children = getEffectiveGroupChildren(hero, skill);
      if (children.length) {
        // 组卡可用性 = 任一子技能可用；分栏 = 子技能中含攻击标签 → 攻击栏，否则辅助栏（组父自身无行动语义）
        const groupUsable = children.some(c => isSkillActionable(hero, c));
        const atk = children.some(c => isAttackSkill(c));
        const btn = createSkillGroupCard(hero, skill, idx, children, groupUsable);
        if (atk) { if (atkList) atkList.appendChild(btn); atkCount++; }
        else { if (supList) supList.appendChild(btn); supCount++; }
        return;
      }
      const btn = createSkillCard(hero, skill, idx);
      const atk = isAttackSkill(skill);
      if (atk) { if (atkList) atkList.appendChild(btn); atkCount++; }
      else { if (supList) supList.appendChild(btn); supCount++; }
    });
  function emptyTip(text) {
    const div = document.createElement('div');
    div.className = 'text-[10px] text-slate-500 text-center py-6 leading-relaxed';
    div.textContent = text;
    return div;
  }
  if (atkList && atkCount === 0) atkList.appendChild(emptyTip('暂无攻击技能'));
  if (supList && supCount === 0) supList.appendChild(emptyTip('暂无辅助技能'));
}

function closeAllSubMenus() {
  ['basic-menu','attack-skill-menu','support-skill-menu','item-menu','skill-menu'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.add('translate-x-full');
  });
}

function openBasicMenu() { if (state.isAnimating) return; const el=document.getElementById('basic-menu'); if(el) el.classList.remove('translate-x-full'); }

function closeBasicMenu() { const el=document.getElementById('basic-menu'); if(el) el.classList.add('translate-x-full'); }

function openAttackSkillMenu() { if (state.isAnimating) return; const hero = state.actionQueue?.[state.queueIndex]?.ref; if (hero) updateSkillMenus(hero); const el=document.getElementById('attack-skill-menu'); if(el) el.classList.remove('translate-x-full'); }

function closeAttackSkillMenu() { const el=document.getElementById('attack-skill-menu'); if(el) el.classList.add('translate-x-full'); }

function openSupportSkillMenu() { if (state.isAnimating) return; const hero = state.actionQueue?.[state.queueIndex]?.ref; if (hero) updateSkillMenus(hero); const el=document.getElementById('support-skill-menu'); if(el) el.classList.remove('translate-x-full'); }

function closeSupportSkillMenu() { const el=document.getElementById('support-skill-menu'); if(el) el.classList.add('translate-x-full'); }

const ITEM_CATEGORY_META = {
  '消耗品': { icon: '🧪', badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60' },
  '道具':   { icon: '🎒', badgeClass: 'bg-sky-950/90 text-sky-300 border-sky-600/60' },
  '弹药':   { icon: '🔹', badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-600/60' }
};

function createItemCard(hero, item, idx) {
    const meta = ITEM_CATEGORY_META[item.category] || ITEM_CATEGORY_META['道具'];
    const isAmmo = item.category === '弹药';
    const isExhausted = !isAmmo && !isItemUsable(item);
    // [再动] 物品每回合限用一次（与再动技能同规则）
    const isExtraTurnItem = [item.type, item.type2, item.type3].some(t => t && t.includes('再动'));
    const isUsedExtraTurn = isExtraTurnItem && state.usedExtraTurnSkillsThisRound && state.usedExtraTurnSkillsThisRound.has(item.name);
    // [MP:N] 物品资源不足与技能卡同口径灰显（缺省/0 = 零消耗不受影响）
    const isMpShort = !isAmmo && (item.cost || 0) > 0 && hero.mp < (item.cost || 0);
    const isBlocked = isAmmo || isExhausted || isUsedExtraTurn || isMpShort;
    let cardStateClass = 'skill-card-default';
    if (isExhausted) cardStateClass = 'exhausted-card';
    else if (isBlocked) cardStateClass = 'disabled-card';
    const btn = document.createElement('button');
    btn.className = `w-full p-1.5 rounded-lg border border-slate-800/80 text-left shrink-0 flex flex-col gap-1 relative overflow-hidden transition-all duration-200 group ${cardStateClass}`;
    if (isBlocked) btn.disabled = true;
    let row1Html = `
      <div class="flex items-center justify-between gap-1.5 w-full shrink-0">
        <div class="flex items-center gap-1 min-w-0">
          <span class="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors tracking-wide truncate leading-tight">
            ${escapeHistoryHtml(item.name)}
          </span>
          ${item.isOthers ? `<span class="text-[8px] bg-teal-950/90 text-teal-300 border border-teal-600/60 px-1 py-0.2 rounded shrink-0 leading-tight">他人</span>` : ''}
          ${item.isLegendary ? `<span class="text-[8px] bg-amber-950/90 text-amber-200 border border-amber-500/70 px-1 py-0.2 rounded shrink-0 leading-tight font-bold">✦传奇</span>` : ''}
          ${(!item.isLegendary && item.isHighTier) ? `<span class="text-[8px] bg-violet-950/90 text-violet-200 border border-violet-500/70 px-1 py-0.2 rounded shrink-0 leading-tight font-bold">⬥高阶</span>` : ''}
        </div>
        <span class="text-[8px] font-bold px-1 py-0.2 rounded border shrink-0 flex items-center gap-0.5 ${meta.badgeClass} leading-tight">
          <span>${meta.icon}</span> ${item.category}
        </span>
      </div>
    `;
    let tagsHtml = '';
    if (!isAmmo) {
      // 召唤/蓄力徽章与技能卡同构（[召唤:X]/[延迟:N] 物品已是可执行行为，卡片须可发现）
      if (item.summonTarget) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-sky-950/90 text-sky-300 border-sky-500/70 shrink-0 flex items-center leading-none font-bold">召唤:${escapeHistoryHtml(item.summonTarget)}</span>`;
      if (item.summonNoLimit) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-indigo-950/90 text-indigo-300 border-indigo-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">🐾 众召·破限</span>`;
      else if (isSummonBlockedByLimit(item)) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border text-rose-400 border-rose-500/80 bg-rose-950 shrink-0 font-bold flex items-center gap-0.5 leading-none">🐾 召唤名额已满</span>`;
      tagsHtml += formatTagPill(item.type, item.power);
      if (item.type2) tagsHtml += formatTagPill(item.type2, item.power2);
      if (item.type3) tagsHtml += formatTagPill(item.type3, item.power3);
      if (item.delay) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-amber-950/90 text-amber-300 border-amber-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">⏳ 蓄力:${item.delay}</span>`;
      if (item.guaranteedHit) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-rose-950/90 text-rose-300 border-rose-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">🎯 必中</span>`;
      if (item.switchTarget) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-orange-950/90 text-orange-300 border-orange-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">🔥 转火</span>`;
      if (item.ignoreRow) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-indigo-950/90 text-indigo-300 border-indigo-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">🗡️ 突进</span>`;
      if (item.critRate > 0) tagsHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-orange-950/90 text-orange-300 border-orange-500/70 shrink-0 font-bold flex items-center gap-0.5 leading-none">💥 暴击${item.critRate}%</span>`;
    }
    let row2Html = `
      <div class="flex items-center gap-1 flex-wrap w-full shrink-0">
        ${tagsHtml || '<span class="text-[8px] text-slate-500">无附加效果</span>'}
      </div>
    `;
    let stockBadgesHtml = '';
    if (!isAmmo && (item.cost || 0) > 0) {
      stockBadgesHtml += `<span class="text-[8px] font-mono-num font-bold px-1 py-0.2 rounded border ${isMpShort ? 'text-rose-400 border-rose-500/80 bg-rose-950' : 'text-cyan-300 border-cyan-800/60 bg-cyan-950/60'} leading-none">💧 ${item.cost} MP</span>`;
    }
    if (isAmmo) {
      const errClass = (item.count || 0) > 0 ? 'text-amber-300 border-amber-800/60 bg-amber-950/60' : 'text-rose-400 border-rose-500/80 bg-rose-950';
      stockBadgesHtml += `<span class="text-[8px] font-mono-num font-bold px-1 py-0.2 rounded border ${errClass} leading-none">📦 ${item.count || 0} 发</span>`;
    } else if (item.category === '道具') {
      stockBadgesHtml += item.maxUses > 0
        ? `<span class="text-[8px] font-mono-num font-bold px-1 py-0.2 rounded border ${isExhausted ? 'text-rose-400 border-rose-500/80 bg-rose-950' : 'text-sky-300 border-sky-800/60 bg-sky-950/60'} leading-none">📌 ${(item.usesRemaining ?? item.maxUses)}/${item.maxUses}次</span>`
        : `<span class="text-[8px] text-sky-300 font-mono leading-none">♾️ 不限次数</span>`;
    } else {
      const errClass = !isExhausted ? 'text-emerald-300 border-emerald-800/60 bg-emerald-950/60' : 'text-rose-400 border-rose-500/80 bg-rose-950';
      stockBadgesHtml += `<span class="text-[8px] font-mono-num font-bold px-1 py-0.2 rounded border ${errClass} leading-none">📦 剩余 ${item.count || 0}</span>`;
    }
    // 绑定信息徽章（弹药/道具/消耗品通用：绑定物品即对应技能的施展材料）
    const _bindStr = (item.bindings || []).map(b => `${b.skillName}×${b.cost}`).join('、');
    if (_bindStr) stockBadgesHtml += `<span class="text-[8px] px-1 py-0.2 rounded border bg-slate-900 text-slate-400 border-slate-700 leading-none truncate max-w-full">🔗 ${_bindStr}</span>`;
    let noticeHtml = '';
    if (isAmmo) noticeHtml = `<span class="text-[8px] text-slate-500 leading-none">技能弹药 · 不可主动使用</span>`;
    else if (isExhausted) noticeHtml = `<span class="text-[8px] text-rose-400 font-bold leading-none">🚫 已耗尽</span>`;
    else if (isUsedExtraTurn) noticeHtml = `<span class="text-[8px] text-rose-400 font-bold leading-none">🚫 本轮已用</span>`;
    else if (isMpShort) noticeHtml = `<span class="text-[8px] text-rose-400 font-bold leading-none">🚫 MP不足</span>`;
    let row3Html = `
      <div class="flex items-center justify-between gap-1 w-full shrink-0 pt-0.5 border-t border-slate-800/80">
        <div class="flex items-center gap-1 flex-wrap min-w-0">
          ${stockBadgesHtml}
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${noticeHtml}
        </div>
      </div>
    `;
    btn.innerHTML = row1Html + row2Html + row3Html;
    // 普通道具：点击进目标选择/使用
    if (!isBlocked) btn.onclick = () => prepareItemTarget(idx);
    // 变体组道具（嵌套子技能）：父卡点击 = 展开子技能列表（覆盖上面的普通 onclick）；
    // 父道具耗尽（isExhausted）时整组灰显不可展开。展开范式与技能组卡同构（isGroupExpanded + hidden 切换，
    // DOM 节点闭包引用防同名冲突）。子技能卡 onclick 重绑到道具组执行入口（组内序号，不进技能全局索引）。
    const _children = (item.children && item.children.length) ? item.children : null;
    if (_children) {
        let _arrow = null;
        const nameSpan = btn.querySelector('span.text-xs');
        if (nameSpan) {
            const badge = document.createElement('span');
            badge.className = 'text-[8px] bg-slate-800 text-slate-300 border border-slate-600/60 px-1 py-0.2 rounded shrink-0 leading-tight';
            badge.textContent = '⇅ 变体×' + _children.length;
            _arrow = document.createElement('span');
            _arrow.className = 'text-slate-400 text-[10px] transition-transform duration-200 shrink-0' + (item.isGroupExpanded ? ' rotate-180' : '');
            _arrow.textContent = '▼';
            nameSpan.after(badge, _arrow);
        }
        const wrap = document.createElement('div');
        wrap.className = 'pl-2 flex flex-col gap-1 border-l border-slate-800 ml-1' + (item.isGroupExpanded ? '' : ' hidden');
        _children.forEach((c, cIdx) => {
            const card = createSkillCard(hero, c, cIdx);
            // 子技能卡 onclick 重绑到道具组执行入口（组内序号 + 父物品索引，不进技能全局索引）
            card.onclick = () => prepareGroupedItemSkill(idx, cIdx);
            wrap.appendChild(card);
        });
        const _toggle = () => {
            item.isGroupExpanded = !item.isGroupExpanded;
            wrap.classList.toggle('hidden', !item.isGroupExpanded);
            if (_arrow) _arrow.classList.toggle('rotate-180', item.isGroupExpanded);
        };
        if (!isExhausted) btn.onclick = _toggle;
        const _outer = document.createElement('div');
        _outer.className = 'flex flex-col gap-1 shrink-0';
        _outer.appendChild(btn);
        _outer.appendChild(wrap);
        return _outer;
    }
    return btn;
}

function updateItemMenu(hero) {
  const list = document.getElementById('item-list');
  if (!list || !hero) return;
  list.innerHTML = '';
  const items = hero.items || [];
  // 变体组道具同规则：每次打开/刷新物品菜单一律折叠（展开态不跨渲染记忆）
  items.forEach(it => { if (it.isGroupExpanded) it.isGroupExpanded = false; });
  if (items.length === 0) {
    const div = document.createElement('div');
    div.className = 'text-[10px] text-slate-500 text-center py-6 leading-relaxed';
    div.textContent = '背包空空如也';
    list.appendChild(div);
    return;
  }
  items.forEach((item, idx) => list.appendChild(createItemCard(hero, item, idx)));
}

function openItemMenu() {
  if (state.isAnimating) return;
  const hero = state.actionQueue?.[state.queueIndex]?.ref;
  if (hero) updateItemMenu(hero);
  const el = document.getElementById('item-menu'); if (el) el.classList.remove('translate-x-full');
}

function closeItemMenu() { const el=document.getElementById('item-menu'); if(el) el.classList.add('translate-x-full'); }

function closeSkillMenu() { closeAllSubMenus(); }

function buildEditorSkillTagPreview(type, power, type2, power2, type3, power3, tone) {
  var slots = [[type, power], [type2, power2], [type3, power3]];
  var colorClass = tone === 'enemy' ? 'text-rose-300' : 'text-cyan-300';
  return slots.filter(function(slot) { return slot[0] && slot[0] !== '[无]'; }).map(function(slot) {
    var powerText = !getGrantedVariantName(slot[0]) && Number(slot[1]) ? ' ' + slot[1] : '';
    var _core = String(slot[0]).replace(/[\[\]]/g, '');
    return `<span${tagTipAttrs(_core, slot[1], slot[0])} class="px-1.5 py-0.2 rounded text-[9px] font-mono-num font-semibold bg-slate-800 ${colorClass} border border-slate-700 shrink-0 whitespace-nowrap">${tagDisplayLabel(_core, slot[1])}${powerText}</span>`;
  }).join('');
}

function buildSkillFormFieldsHtml(idNS, s, onInputJs) {
  let html = '';
  // 模块 A：基础设定与修饰开关
  html += `<div class="grid grid-cols-1 sm:grid-cols-12 gap-1.5 text-xs items-center">`;
  html += `<div class="sm:col-span-3 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">名称</span><input type="text" id="edit-${idNS}-name" value="${escapeHistoryHtml(s.name)}" oninput="${onInputJs}" class="edit-input-game w-full font-bold text-slate-100 py-1 text-xs" placeholder="技能名"></div>`;
  html += `<div class="sm:col-span-2 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">属性</span><select id="edit-${idNS}-dmgType" onchange="${onInputJs}" class="edit-input-game w-full text-orange-300 font-bold py-1 text-xs"><option value="" ${!s.damageType ? 'selected' : ''}>无(近战)</option><option value="近战" ${s.damageType === '近战' ? 'selected' : ''}>🗡️ 近战</option><option value="远程" ${s.damageType === '远程' ? 'selected' : ''}>🎯 远程</option><option value="法术" ${s.damageType === '法术' ? 'selected' : ''}>⚡ 法术</option></select></div>`;
  html += `<div class="sm:col-span-3 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">特效</span><select id="edit-${idNS}-fxTag" class="edit-input-game w-full text-yellow-300 font-bold py-1 text-xs">${['特效:无', ...Object.keys(WEBM_FX_REGISTRY)].map(f => { const val = f === '特效:无' ? '' : f; const isSel = (s.fxTag || '') === val; return `<option value="${val}" ${isSel ? 'selected' : ''}>${f}</option>`; }).join('')}</select></div>`;

  // 药丸修饰开关
  html += `<div class="sm:col-span-4 flex items-center gap-1.5 flex-wrap">`;
  html += `<label id="pill-${idNS}-others" class="tag-toggle-pill border-emerald-500 text-emerald-300 bg-emerald-950/70 ${s.isOthers ? 'active' : 'inactive'}"><input type="checkbox" id="edit-${idNS}-others" ${s.isOthers ? 'checked' : ''} class="hidden" onchange="togglePillClass(this, 'pill-${idNS}-others')"><span>👥</span> 他人</label>`;
  html += `<label id="pill-${idNS}-guaranteed" class="tag-toggle-pill border-rose-500 text-rose-300 bg-rose-950/70 ${s.guaranteedHit ? 'active' : 'inactive'}"><input type="checkbox" id="edit-${idNS}-guaranteed" ${s.guaranteedHit ? 'checked' : ''} class="hidden" onchange="togglePillClass(this, 'pill-${idNS}-guaranteed')"><span>🎯</span> 必中</label>`;
  html += `<label id="pill-${idNS}-switch" class="tag-toggle-pill border-orange-500 text-orange-300 bg-orange-950/70 ${s.switchTarget ? 'active' : 'inactive'}"><input type="checkbox" id="edit-${idNS}-switch" ${s.switchTarget ? 'checked' : ''} class="hidden" onchange="togglePillClass(this, 'pill-${idNS}-switch')"><span>🔥</span> 转火</label>`;
  html += `<label id="pill-${idNS}-highTier" class="tag-toggle-pill border-violet-500 text-violet-300 bg-violet-950/70 ${s.isHighTier ? 'active' : 'inactive'}"><input type="checkbox" id="edit-${idNS}-highTier" ${s.isHighTier ? 'checked' : ''} class="hidden" onchange="togglePillClass(this, 'pill-${idNS}-highTier')"><span>⬥</span> 高阶</label>`;
  html += `<label id="pill-${idNS}-legendary" class="tag-toggle-pill border-amber-500 text-amber-300 bg-amber-950/70 ${s.isLegendary ? 'active' : 'inactive'}"><input type="checkbox" id="edit-${idNS}-legendary" ${s.isLegendary ? 'checked' : ''} class="hidden" onchange="togglePillClass(this, 'pill-${idNS}-legendary')"><span>✦</span> 传奇</label>`;
  html += `</div></div>`;

  // 模块 B：反制策略
  html += `<div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs bg-slate-900/70 p-1.5 rounded border border-slate-800 grid-reactions-responsive">`;
  html += `<div class="flex items-center gap-1"><span class="text-indigo-400 text-[10px] whitespace-nowrap font-bold">反应</span><select id="edit-${idNS}-reaction" class="edit-input-game w-full text-indigo-300 text-[10px] py-1 font-semibold"><option value="none" ${!s.isReaction ? 'selected' : ''}>非反应</option><option value="all" ${s.isReaction && s.reactionTarget === 'all' ? 'selected' : ''}>反应(全能)</option><option value="近战" ${s.isReaction && s.reactionTarget === '近战' ? 'selected' : ''}>反应(近战)</option><option value="远程" ${s.isReaction && s.reactionTarget === '远程' ? 'selected' : ''}>反应(远程)</option><option value="法术" ${s.isReaction && s.reactionTarget === '法术' ? 'selected' : ''}>反应(法术)</option></select></div>`;
  html += `<div class="flex items-center gap-1"><span class="text-amber-400 text-[10px] whitespace-nowrap font-bold">看破</span><select id="edit-${idNS}-kanpo" class="edit-input-game w-full text-amber-300 text-[10px] py-1 font-semibold"><option value="none" ${!s.kanpoTarget ? 'selected' : ''}>无看破</option><option value="all" ${s.kanpoTarget === 'all' ? 'selected' : ''}>看破(全能)</option><option value="近战" ${s.kanpoTarget === '近战' ? 'selected' : ''}>看破(近战)</option><option value="远程" ${s.kanpoTarget === '远程' ? 'selected' : ''}>看破(远程)</option><option value="法术" ${s.kanpoTarget === '法术' ? 'selected' : ''}>看破(法术)</option></select></div>`;
  html += `<div class="flex items-center gap-1"><span class="text-sky-400 text-[10px] whitespace-nowrap font-bold">舍身</span><select id="edit-${idNS}-sheshen" class="edit-input-game w-full text-sky-300 text-[10px] py-1 font-semibold"><option value="none" ${!s.sheshenTarget ? 'selected' : ''}>无舍身</option><option value="all" ${s.sheshenTarget === 'all' ? 'selected' : ''}>舍身(全能)</option><option value="近战" ${s.sheshenTarget === '近战' ? 'selected' : ''}>舍身(近战)</option><option value="远程" ${s.sheshenTarget === '远程' ? 'selected' : ''}>舍身(远程)</option><option value="法术" ${s.sheshenTarget === '法术' ? 'selected' : ''}>舍身(法术)</option></select></div>`;
  html += `</div>`;

  // 模块 C：消耗与节奏数值矩阵
  html += `<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 text-[10px] grid-costs-responsive">`;
  html += `<div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1 min-w-0"><span class="text-sky-400 whitespace-nowrap text-[9px] font-semibold shrink-0">💧 MP耗</span><input type="number" id="edit-${idNS}-cost" value="${s.cost || 0}" oninput="${onInputJs}" class="edit-input-game flex-1 min-w-0 font-mono-num text-right text-sky-200 text-[10px] py-0.5 px-1"></div>`;
  html += `<div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1 min-w-0"><span class="text-rose-400 whitespace-nowrap text-[9px] font-semibold shrink-0">🩸 HP耗</span><input type="number" id="edit-${idNS}-hpCost" value="${s.hpCost || 0}" oninput="${onInputJs}" class="edit-input-game flex-1 min-w-0 font-mono-num text-right text-rose-200 text-[10px] py-0.5 px-1"></div>`;
  html += `<div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1 min-w-0"><span class="text-emerald-400 whitespace-nowrap text-[9px] font-semibold shrink-0">🔥 TP耗</span><input type="number" id="edit-${idNS}-tpCost" value="${s.tpCost || 0}" oninput="${onInputJs}" class="edit-input-game flex-1 min-w-0 font-mono-num text-right text-emerald-200 text-[10px] py-0.5 px-1"></div>`;
  html += `<div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1 min-w-0"><span class="text-yellow-400 whitespace-nowrap text-[9px] font-semibold shrink-0">🎯 Aim</span><input type="number" id="edit-${idNS}-hit" value="${s.hit != null ? s.hit : 100}" class="edit-input-game flex-1 min-w-0 font-mono-num text-right text-yellow-200 text-[10px] py-0.5 px-1"></div>`;
  html += `<div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1 min-w-0"><span class="text-purple-400 whitespace-nowrap text-[9px] font-semibold shrink-0">⏱️ 持续</span><input type="number" id="edit-${idNS}-turns" value="${s.turns || ''}" class="edit-input-game flex-1 min-w-0 font-mono-num text-right text-purple-200 text-[10px] py-0.5 px-1" placeholder="默认"></div>`;
  html += `<div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1 min-w-0"><span class="text-yellow-300 whitespace-nowrap text-[9px] font-semibold shrink-0">⏳ 延迟</span><input type="number" id="edit-${idNS}-delay" value="${s.delay || 0}" oninput="${onInputJs}" class="edit-input-game flex-1 min-w-0 font-mono-num text-right text-yellow-200 text-[10px] py-0.5 px-1"></div>`;
  html += `<div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1 min-w-0"><span class="text-cyan-300 whitespace-nowrap text-[9px] font-semibold shrink-0">⚡ 加速</span><input type="number" id="edit-${idNS}-haste" value="${s.haste || 0}" class="edit-input-game flex-1 min-w-0 font-mono-num text-right text-cyan-200 text-[10px] py-0.5 px-1"></div>`;
  html += `<div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1 min-w-0"><span class="text-fuchsia-300 whitespace-nowrap text-[9px] font-semibold shrink-0">🚫 限次</span><input type="number" id="edit-${idNS}-limit" value="${s.maxUses || 0}" class="edit-input-game flex-1 min-w-0 font-mono-num text-right text-fuchsia-200 text-[10px] py-0.5 px-1" placeholder="0"></div>`;
  html += `<div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1 min-w-0"><span class="text-orange-300 whitespace-nowrap text-[9px] font-semibold shrink-0">💥 暴击%</span><input type="number" min="0" max="100" id="edit-${idNS}-crit" value="${s.critRate || 0}" oninput="${onInputJs}" class="edit-input-game flex-1 min-w-0 font-mono-num text-right text-orange-200 text-[10px] py-0.5 px-1" placeholder="0"></div>`;
  html += `</div>`;

  // 模块 D：三重复合标签槽位与威力配置（带屏障护甲与驱散量并排）
  var _dispVal = (() => { if ((s.type||'').includes('驱散')) return s.power; if ((s.type2||'').includes('驱散')) return s.power2; if ((s.type3||'').includes('驱散')) return s.power3; return 0; })();
  html += `<div class="space-y-1">`;
  html += `<div class="text-[10px] text-slate-400 font-bold flex items-center justify-between flex-wrap gap-1">`;
  html += `<span>三重复合标签槽位:</span>`;
  html += `<div class="flex items-center gap-3 text-[10px]">`;
  html += `<span class="text-cyan-400 font-semibold flex items-center gap-1">🛡️ 屏障护甲: <input type="number" id="edit-${idNS}-armor" value="${s.barrierArmor||0}" class="edit-input-game w-12 font-mono-num text-right text-cyan-200 py-0.5 text-[10px]" min="0"> 点</span>`;
  html += `<span class="text-emerald-400 font-semibold flex items-center gap-1">✨ 驱散量: <input type="number" id="edit-${idNS}-dispel" value="${_dispVal}" class="edit-input-game w-12 font-mono-num text-right text-emerald-200 py-0.5 text-[10px]" min="0"> 层</span>`;
  html += `</div>`;
  html += `</div>`;

  html += `<div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 grid-tags-responsive">`;
  html += `<div class="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded border border-slate-700/60"><button type="button" onclick="openSkillTypeCombo('edit-${idNS}-type', this)" class="edit-input-game skill-type-combo w-full text-cyan-300 font-bold text-[10px] py-1 flex items-center justify-between gap-1"><span class="truncate">${s.type && s.type !== '[无]' ? tagDisplayLabel(String(s.type).replace(/[\[\]]/g, ''), s.power) : '[无]'}</span><span class="text-slate-500 shrink-0">▾</span></button><select id="edit-${idNS}-type" onchange="${onInputJs}" class="hidden">${renderSkillTypeOptions(s.type)}</select><span class="text-[10px] text-slate-500 whitespace-nowrap">威力</span><input type="number" id="edit-${idNS}-power" value="${s.power}" oninput="${onInputJs}" class="edit-input-game w-14 font-mono-num text-right text-emerald-200 text-[10px] py-1"><span class="text-[10px] text-slate-500 whitespace-nowrap">回</span><input type="number" id="edit-${idNS}-slot-turns" value="${s.slotTurns ?? ''}" class="edit-input-game w-12 font-mono-num text-right text-purple-200 text-[10px] py-1" placeholder="默认"></div>`;
  html += `<div class="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded border border-slate-700/60"><button type="button" onclick="openSkillTypeCombo('edit-${idNS}-type2', this)" class="edit-input-game skill-type-combo w-full text-slate-300 font-bold text-[10px] py-1 flex items-center justify-between gap-1"><span class="truncate">${s.type2 && s.type2 !== '[无]' ? tagDisplayLabel(String(s.type2).replace(/[\[\]]/g, ''), s.power2) : '[无]'}</span><span class="text-slate-500 shrink-0">▾</span></button><select id="edit-${idNS}-type2" onchange="${onInputJs}" class="hidden">${renderSkillTypeOptions(s.type2)}</select><span class="text-[10px] text-slate-500 whitespace-nowrap">威力</span><input type="number" id="edit-${idNS}-power2" value="${s.power2}" oninput="${onInputJs}" class="edit-input-game w-14 font-mono-num text-right text-emerald-200 text-[10px] py-1"><span class="text-[10px] text-slate-500 whitespace-nowrap">回</span><input type="number" id="edit-${idNS}-slot-turns2" value="${s.slotTurns2 ?? ''}" class="edit-input-game w-12 font-mono-num text-right text-purple-200 text-[10px] py-1" placeholder="默认"></div>`;
  html += `<div class="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded border border-slate-700/60"><button type="button" onclick="openSkillTypeCombo('edit-${idNS}-type3', this)" class="edit-input-game skill-type-combo w-full text-slate-300 font-bold text-[10px] py-1 flex items-center justify-between gap-1"><span class="truncate">${s.type3 && s.type3 !== '[无]' ? tagDisplayLabel(String(s.type3).replace(/[\[\]]/g, ''), s.power3) : '[无]'}</span><span class="text-slate-500 shrink-0">▾</span></button><select id="edit-${idNS}-type3" onchange="${onInputJs}" class="hidden">${renderSkillTypeOptions(s.type3)}</select><span class="text-[10px] text-slate-500 whitespace-nowrap">威力</span><input type="number" id="edit-${idNS}-power3" value="${s.power3}" oninput="${onInputJs}" class="edit-input-game w-14 font-mono-num text-right text-emerald-200 text-[10px] py-1"><span class="text-[10px] text-slate-500 whitespace-nowrap">回</span><input type="number" id="edit-${idNS}-slot-turns3" value="${s.slotTurns3 ?? ''}" class="edit-input-game w-12 font-mono-num text-right text-purple-200 text-[10px] py-1" placeholder="默认"></div>`;
  html += `</div>`;
  // 模块 E：召唤对象（世界书词条名；支持 `A*4；B` 多只清单与 *N 数量，留空=无召唤）
  html += `<div class="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded border border-sky-700/40"><span class="text-[10px] text-sky-300 font-bold whitespace-nowrap">召唤对象</span><input type="text" id="edit-${idNS}-summon" value="${escapeHistoryHtml(s.summonTarget||'')}" class="edit-input-game w-full text-sky-200 font-mono-num text-[10px] py-1" placeholder="词条名[*N]；词条名…（如 幻影*4；暗影），留空=无召唤"></div>`;
  html += `</div>`; // close module D space-y-1
  return html;
}

function syncGrantSlotPower(select) {
  const powerId = select.id.replace(/-type(\d?)$/, (_, suffix) => '-power' + suffix);
  const power = document.getElementById(powerId);
  if (!power) return;
  power.disabled = !!getGrantedVariantName(select.value);
  if (power.disabled) power.value = 0;
}

function renderSkillTypeOptions(curVal) {
  const _nonSlot = new Set(['[必中]', '[转火]', '[突进]', '[众召]', '[高阶]', '[传奇]', '[神术]', '[近战]', '[远程]', '[法术]']);
  const opts = (curVal && _nonSlot.has(curVal)) ? [curVal, ...SKILL_TYPE_EDIT_OPTIONS] : SKILL_TYPE_EDIT_OPTIONS;
  // option 文本「可读名 [原标签]」，value 保持原始标签不变（保存同步零影响）
  return opts.map(t => `<option value="${t}" ${curVal === t ? 'selected' : ''}>${t === '[无]' ? t : tagDisplayLabel(t.replace(/[\[\]]/g, '')) + ' ' + t}</option>`).join('');
}

function closeSkillTypeCombo() {
  const pop = document.getElementById('skill-type-combo-popup');
  if (pop) pop.remove();
}

function openSkillTypeCombo(selectId, btn) {
  const existing = document.getElementById('skill-type-combo-popup');
  if (existing && existing.__comboBtn === btn) { existing.remove(); return; } // 同一按钮再点 = 收起
  if (existing) existing.remove();
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const pop = document.createElement('div');
  pop.id = 'skill-type-combo-popup';
  pop.className = 'skill-type-combo-popup';
  pop.innerHTML = `<input type="text" class="edit-input-game w-full text-cyan-200 text-[10px] py-1" placeholder="🔍 搜索标签…" oninput="filterSkillTypeCombo(this.value)" onkeydown="if(event.key==='Enter'){const _f=document.querySelectorAll('#skill-type-combo-popup .skill-type-combo-opt');if(_f.length)_f[0].click();}else if(event.key==='Escape'){closeSkillTypeCombo();}"><div class="skill-type-combo-list"></div>`;
  pop.__comboSelect = sel; pop.__comboBtn = btn;
  (document.querySelector('[data-rpg-ui-scope]') || document.body).appendChild(pop);
  const rect = btn.getBoundingClientRect();
  pop.style.minWidth = Math.max(rect.width, 160) + 'px';
  pop.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 270)) + 'px';
  pop.style.top = Math.max(4, Math.min(rect.bottom + 4, window.innerHeight - 300)) + 'px';
  filterSkillTypeCombo('');
  pop.querySelector('input').focus();
}

function filterSkillTypeCombo(q) {
  const pop = document.getElementById('skill-type-combo-popup');
  if (!pop) return;
  const sel = pop.__comboSelect;
  const kw = String(q || '').trim().toLowerCase().replace(/[\[\]]/g, '');
  const list = pop.querySelector('.skill-type-combo-list');
  const opts = [...sel.options].map(o => o.value).filter(v => {
    if (!kw) return true;
    const _clean = v.replace(/[\[\]]/g, '');
    return _clean.toLowerCase().includes(kw) || tagDisplayLabel(_clean).toLowerCase().includes(kw);
  });
  list.innerHTML = opts.length
    ? opts.map(v => `<div class="skill-type-combo-opt ${v === sel.value ? 'sel' : ''}" data-val="${v}" onclick="applySkillTypeCombo(this.dataset.val)"><span class="skill-type-combo-name">${v === '[无]' ? v : tagDisplayLabel(v.replace(/[\[\]]/g, ''))}</span><span class="skill-type-combo-code">${v}</span></div>`).join('')
    : `<div class="skill-type-combo-empty">无匹配标签</div>`;
}

function applySkillTypeCombo(val) {
  const pop = document.getElementById('skill-type-combo-popup');
  if (!pop) return;
  const sel = pop.__comboSelect, btn = pop.__comboBtn;
  if (sel) { sel.value = val; syncGrantSlotPower(sel); sel.dispatchEvent(new Event('change', { bubbles: true })); }
  if (btn) { const label = btn.querySelector('span'); if (label) label.textContent = val; }
  closeSkillTypeCombo();
}

function togglePillClass(inputEl, pillId) {
  var pill = document.getElementById(pillId);
  if (pill && inputEl) {
    if (inputEl.checked) {
      pill.classList.add('active');
      pill.classList.remove('inactive');
    } else {
      pill.classList.remove('active');
      pill.classList.add('inactive');
    }
  }
}

let _rcTipTimer = null;

function showTagTipFor(el) {
  const box = document.getElementById('rc-tag-tooltip');
  if (!box) return;
  const title = el.getAttribute('data-tagtip-title') || '';
  const body = el.getAttribute('data-tagtip-body') || '';
  if (!title || !body) return;
  const _titleEl = document.getElementById('rc-tip-title');
  const _rawEl = document.getElementById('rc-tip-raw');
  const _bodyEl = document.getElementById('rc-tip-body');
  if (!_titleEl || !_bodyEl) return;
  _titleEl.textContent = title;
  const _raw = el.getAttribute('data-tagtip-raw') || '';
  if (_rawEl) { _rawEl.textContent = _raw; _rawEl.style.display = _raw ? '' : 'none'; }
  _bodyEl.textContent = body;
  box.classList.add('visible');
  // 定位：默认标签上方居中；上放不下改下方，四边夹取防溢出
  const r = el.getBoundingClientRect();
  const w = box.offsetWidth || 300, h = box.offsetHeight || 80, pad = 10;
  let x = r.left + r.width / 2 - w / 2;
  let y = r.top - h - 8;
  if (y < pad) y = r.bottom + 8;
  if (y + h > window.innerHeight - pad) y = Math.max(pad, window.innerHeight - h - pad);
  x = Math.max(pad, Math.min(x, window.innerWidth - w - pad));
  box.style.left = Math.round(x) + 'px';
  box.style.top = Math.round(y) + 'px';
}

function hideTagTip() {
  const box = document.getElementById('rc-tag-tooltip');
  if (box) box.classList.remove('visible');
}

(function initTagTipEvents() {
  document.addEventListener('mouseover', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-tagtip-title]') : null;
    if (!el) return;
    clearTimeout(_rcTipTimer);
    _rcTipTimer = setTimeout(() => showTagTipFor(el), 60);
  });
  document.addEventListener('mouseout', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-tagtip-title]') : null;
    if (!el) return;
    const related = e.relatedTarget;
    if (related && el.contains(related)) return;
    clearTimeout(_rcTipTimer);
    hideTagTip();
  });
  document.addEventListener('click', () => { clearTimeout(_rcTipTimer); hideTagTip(); });
  window.addEventListener('scroll', () => { clearTimeout(_rcTipTimer); hideTagTip(); }, { passive: true });
})();

  const __acts = { openBasicMenu: () => openBasicMenu(), closeBasicMenu: () => closeBasicMenu(), openAttackSkillMenu: () => openAttackSkillMenu(), closeAttackSkillMenu: () => closeAttackSkillMenu(), openSupportSkillMenu: () => openSupportSkillMenu(), closeSupportSkillMenu: () => closeSupportSkillMenu(), openItemMenu: () => openItemMenu(), closeItemMenu: () => closeItemMenu(), closeSkillMenu: () => closeSkillMenu(), handleBasicAttack: () => handleBasicAttack(), handleBasicDefend: () => handleBasicDefend(), handleBasicRetreat: () => handleBasicRetreat(), cancelTargeting: () => cancelTargeting() };
  function bind(root) {
    root.addEventListener('click', e => {
      const el = e.target.closest('[data-rpg-ui-act]');
      if (!el || el.disabled) return;
      const fn = __acts[el.getAttribute('data-rpg-ui-act')];
      if (fn) { e.stopPropagation(); fn(); }
    });
  }
  return { bind, tagDisplayLabel, tagTipAttrs, escapeHistoryHtml, WEBM_FX_REGISTRY, renderTurnQueue, formatTagPill, updateSkillMenus, closeAllSubMenus, openBasicMenu, closeBasicMenu, openAttackSkillMenu, openSupportSkillMenu, updateItemMenu, openItemMenu, buildEditorSkillTagPreview, buildSkillFormFieldsHtml, syncGrantSlotPower, renderSkillTypeOptions, closeSkillTypeCombo, openSkillTypeCombo, filterSkillTypeCombo, applySkillTypeCombo, togglePillClass, hideTagTip,
    markRoundStart() { _roundStartGlowPending = true; },
    resetQueue() { _prevQueueCurrentUid = null; } };
}
