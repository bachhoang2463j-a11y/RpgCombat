// ==========================================
// 战棋设置编辑器：移植原版「数据覆写」多层手风琴（index.html openEditor 同构）
//   一级：全局设置手风琴 / 阵营 Tab → 角色卡（头像·名称·职业或分级·HP/MP/技能数看板）
//   二级：角色核心属性 + 战棋属性 + 本场资源 + 持久化开关；技能卡 / 物品卡；高级 JSON
//   三级：变体子技能 / 物品变体用法
// 技能表单体直接复用原版 buildSkillFormFieldsHtml（模块 A-E，vendor 提取，控件 id 与原版同规范 edit-<ns>-*）；
// 战棋专有「模块 G」= 空间范围 / 行动成本 / 蓄力。看破、舍身、召唤、肃正、驱散、槽位持续在表单内标注「未迁移」。
// 折叠照抄原版范式（hidden class + 箭头 rotate-180，不重建 DOM）；增删先读回再重绘（原版 addHeroSkill 同规范）。
// 本模块只做表单 ↔ 草稿；持久档、本场覆盖与「保存即重置本场」仍由 main 执行，规则不变。
// ==========================================

import { RANGE_TYPES, CONFIG_PACKAGE_PERSIST_KEYS } from './protocol.mjs';
import { CLASS_STYLE } from './unit-style.mjs';
import { normalizeEffectTag } from './effect-definitions.mjs';
import { getFxTagOptions } from './fx-library.mjs';

// 七范围（六范围 + 自身）：protocol.RANGE_TYPES 仍是六范围（协议文件不动），「自身」在编辑器本地扩展；
// 解析支持（parser/[范围:自身]）待规则代理落地，落地前保存带「自身」的技能会走 parseSkillEntry 校验。
const RANGE_TYPES_SEVEN = [...RANGE_TYPES, '自身'];
const RANGE_FIELDS = { 单体: ['castRange'], 直线: ['length', 'width'], 扇形: ['castRange', 'angle'], 圆形: ['castRange', 'radius'], 全域: [], 爆炸: ['castRange', 'radius'], 自身: [], 召唤: ['castRange'] };
const RANGE_LABEL = { castRange: '射程', length: '长', width: '宽', angle: '角度', radius: '半径' };
const RANGE_UNIT = { castRange: 'm', length: 'm', width: 'm', angle: '°', radius: 'm' };
const PERSIST_LABEL = { persistAtk: '攻击', persistDef: '防御', persistSpd: '速度', persistMaxHp: 'HP上限', persistMaxMp: 'MP上限', persistMaxTp: 'TP上限',
  persistEvasion: '闪避', persistStrength: '力量', persistTotalWeight: '总重', persistMoveDistance: '移动', persistPerception: '感知' };
const CLASSES = Object.keys(CLASS_STYLE);
const NUM_FIELDS = ['maxHp', 'maxMp', 'maxTp', 'atk', 'def', 'spd', 'evasion', 'strength', 'totalWeight', 'moveDistance', 'perception'];

export const NEW_SKILL = () => ({ name: '新技能', damageType: '近战', type: '[单体]', power: 20, type2: '[无]', power2: 0, type3: '[无]', power3: 0,
  cost: 0, hpCost: 0, tpCost: 0, hit: 100, delay: 0, haste: 0, maxUses: 0, critRate: 0, charge: 0,
  range: { type: '单体', castRange: 2 }, actionCost: { main: 1, aux: 0 } });
export const NEW_ITEM = () => ({ isItem: true, name: '新物品', category: '道具', count: 1, maxUses: 1, bindings: [],
  type: '[无]', power: 0, type2: '[无]', power2: 0, type3: '[无]', power3: 0, hit: 100, critRate: 0 });

export function createEditorPanel({ rpgUi, shell, globalHtml, validate, onSave, onCancel }) {
  const E = s => rpgUi.escapeHistoryHtml(s == null ? '' : String(s));
  const modal = shell.els.editorModal;
  let draft = null;
  const $ = id => modal.querySelector('#' + CSS.escape(id));
  const val = id => { const el = $(id); return el ? el.value : ''; };
  const num = (id, d = 0) => { const v = val(id); return v === '' ? d : Number(v); };
  const chk = id => { const el = $(id); return !!(el && el.checked); };
  const pfx = ui => (draft.units[ui].side === 'hero' ? 'h-' : 'e-') + ui;

  // ---------- 小部件（原版类名） ----------
  const chip = (cls, html) => '<span class="px-1 py-0.2 rounded text-[8px] border shrink-0 ' + cls + '">' + html + '</span>';
  const unmig = (txt) => '<span class="t-unmig" title="' + E(txt || '战棋执行器尚未迁移该能力；字段会保存，但战斗中不会生效') + '">未迁移</span>';
  const arrow = (id, open) => '<span id="' + id + '" class="text-slate-400 text-[10px] transition-transform duration-200 ' + (open ? 'rotate-180' : '') + '">▼</span>';
  const delBtn = (act, data, title) => '<button data-ed-act="' + act + '" ' + data + ' class="w-4 h-4 rounded hover:bg-red-900/60 text-slate-500 hover:text-red-300 flex items-center justify-center text-[10px] transition-colors" title="' + title + '">✕</button>';
  const statCell = (label, cls, id, v, extra = '') => '<div class="bg-slate-900/90 px-2 py-1 rounded border border-slate-700/50 flex flex-col"><span class="' + cls + ' font-semibold text-[9px]">' + label + '</span>' +
    '<input type="number" id="' + id + '" value="' + (v == null ? '' : E(v)) + '" ' + extra + ' class="edit-input-game w-full font-mono-num mt-0.5 text-[11px] py-0.5 px-1" placeholder="缺省"></div>';
  const pill = (id, on, cls, icon, label) => '<label id="pill-' + id + '" class="tag-toggle-pill ' + cls + ' ' + (on ? 'active' : 'inactive') + '"><input type="checkbox" id="edit-' + id + '" ' + (on ? 'checked' : '') +
    ' class="hidden" onchange="togglePillClass(this, \'pill-' + id + '\')"><span>' + icon + '</span> ' + label + '</label>';
  const rangeText = r => !r ? 'S14推导' : r.type === '单体' ? '单体 ' + (r.castRange ?? '') + 'm' : r.type === '直线' ? '直线 ' + r.length + '×' + (r.width || 1) + 'm'
    : r.type === '扇形' ? '扇形 ' + r.castRange + 'm·' + r.angle + '°' : r.type === '全域' ? '全域' : r.type === '自身' ? '自身' : r.type + ' ' + (r.castRange ?? '') + 'm·r' + r.radius;

  // ---------- 模块 G：战棋专有（范围 / 行动 / 蓄力 / 槽自身覆盖） ----------
  // 槽目标覆盖（正式字段 skill.slotTargets[i] = 'self' | 'default'，skillSlots 按 index 读取）：全 default 时不写字段
  const selfPill = (ns, k, on) => '<label id="pill-' + ns + '-self' + k + '" class="tag-toggle-pill ' + (on ? 'active' : 'inactive') +
    ' border-violet-500 text-violet-300 bg-violet-950/70" title="覆盖本槽目标为施法者自身（默认按范围几何取目标）"><input type="checkbox" id="edit-' + ns + '-slotself' + k + '"' + (on ? ' checked' : '') +
    ' class="hidden" onchange="togglePillClass(this, \'pill-' + ns + '-self' + k + '\')"><span>自身</span></label>';
  const slotSelfOn = (s, i) => Array.isArray(s.slotTargets) && s.slotTargets[i] === 'self';
  function slotSelfHtml(ns, s) {
    return '<div class="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400"><span class="font-bold">槽目标覆盖:</span>' +
      '<span class="text-slate-500">槽1</span>' + selfPill(ns, '', slotSelfOn(s, 0)) +
      '<span class="text-slate-500">槽2</span>' + selfPill(ns, '2', slotSelfOn(s, 1)) +
      '<span class="text-slate-500">槽3</span>' + selfPill(ns, '3', slotSelfOn(s, 2)) + '</div>';
  }
  function moduleG(ns, s) {
    const r = s.range || null, type = r ? r.type : '';
    const fields = ['castRange', 'length', 'width', 'angle', 'radius'].map(f =>
      '<label class="t-ed-rp" data-rp-for="' + ns + '" data-rp="' + f + '"' + ((RANGE_FIELDS[type] || []).includes(f) ? '' : ' hidden') + '><span>' + RANGE_LABEL[f] + '</span>' +
      '<input type="number" step="0.5" min="0" id="edit-' + ns + '-r-' + f + '" value="' + (r && r[f] != null ? E(r[f]) : '') + '" class="edit-input-game w-14 font-mono-num text-right text-amber-100 text-[10px] py-0.5 px-1"><em>' + RANGE_UNIT[f] + '</em></label>').join('');
    const aux = s.actionCost && s.actionCost.aux > 0;
    return '<div class="t-ed-tac"><span class="t-ed-tac-h">🗺️ 战棋</span>' +
      '<label><span>范围</span><select id="edit-' + ns + '-rtype" data-ed-rtype="' + ns + '" class="edit-input-game text-amber-300 font-bold text-[10px] py-0.5">' +
        '<option value=""' + (!type ? ' selected' : '') + '>按伤害类型推导(S14)</option>' + RANGE_TYPES_SEVEN.map(t => '<option value="' + t + '"' + (t === type ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>' +
      fields +
      '<label><span>行动</span><select id="edit-' + ns + '-act" class="edit-input-game text-cyan-300 font-bold text-[10px] py-0.5"><option value="main"' + (aux ? '' : ' selected') + '>◆ 主行动</option><option value="aux"' + (aux ? ' selected' : '') + '>◇ 辅助行动</option></select></label>' +
      '<label title="敌方大招充能：每个自然行动末 +1，满后下次行动优先释放；与[延迟]准备无关"><span>充能</span><input type="number" min="0" id="edit-' + ns + '-charge" value="' + (s.charge || 0) + '" class="edit-input-game w-12 font-mono-num text-right text-cyan-100 text-[10px] py-0.5 px-1"><em>回合</em></label></div>' +
      slotSelfHtml(ns, s);
  }
  function fxOptions(value, inferred = false) {
    if (value === '无') value = '';
    const options = [...getFxTagOptions()];
    if (value && !options.some(({ name }) => name === value)) {
      options.push({ name: value, label: value + '（未知特效）' });
    }
    return [{ name: '', label: '特效:无' }, ...options].map(({ name, label }) =>
      '<option value="' + E(name) + '"' + ((value || '') === name ? ' selected' : '') + '>' + E(inferred && name && name === value ? label + '（推断）' : label) + '</option>').join('');
  }
  function skillBody(ns, s) {
    const fields = rpgUi.buildSkillFormFieldsHtml(ns, s, '');
    const fxSelect = /(<select id="edit-[^"]+-fxTag"[^>]*>)[\s\S]*?(<\/select>)/;
    return moduleG(ns, s) + fields.replace(fxSelect, (_, open, close) => open + fxOptions(s.fxTag, s.fxTagInferred) + close);
  }

  // 槽标签预览统一走官方规范名（输入别名可接受，显示只规范）：'[单体(枪击)]' → '[伤害(枪击)]'
  const normSlotTag = t => (t && t !== '[无]' && normalizeEffectTag(t)) ? '[' + normalizeEffectTag(t) + ']' : (t || '[无]');
  function skillHeader(ns, s, tone, foldKey, delHtml, open) {
    const dmgBadge = s.damageType === '近战' ? '🗡️' : s.damageType === '远程' ? '🎯' : s.damageType === '法术' ? '⚡' : '🌀';
    let h = '<div data-ed-fold="' + foldKey + '" data-ed-ns="' + ns + '" class="px-2.5 py-1.5 cursor-pointer bg-slate-900/90 hover:bg-slate-800/90 transition-colors flex items-center justify-between gap-1.5">';
    h += '<div class="flex items-center gap-1.5 flex-wrap min-w-0 flex-1"><span class="text-xs shrink-0">' + dmgBadge + '</span>';
    h += '<span id="' + ns + '-hd-name" class="text-xs font-bold text-slate-100 tracking-wide">' + E(s.name || '新技能') + '</span>';
    h += '<div class="flex items-center gap-1 flex-wrap">' + rpgUi.buildEditorSkillTagPreview(normSlotTag(s.type), s.power, normSlotTag(s.type2), s.power2, normSlotTag(s.type3), s.power3, tone) + '</div>';
    h += chip('bg-amber-950/80 text-amber-200 border-amber-700/70', '🗺 ' + E(rangeText(s.range)));
    if (s.actionCost && s.actionCost.aux > 0) h += chip('bg-sky-950 text-sky-300 border-sky-700', '◇辅助');
    if (s.charge > 0) h += chip('bg-cyan-950 text-cyan-300 border-cyan-700', '⏳充能' + s.charge);
    if (s.isReaction) h += chip('bg-indigo-950 text-indigo-300 border-indigo-700', '反应');
    if (s.guaranteedHit) h += chip('bg-rose-950 text-rose-300 border-rose-700', '必中');
    if (s.maxUses > 0) h += chip('bg-fuchsia-950 text-fuchsia-300 border-fuchsia-700', '限' + s.maxUses);
    h += '</div><div class="desktop-single-row items-center gap-1 ml-auto mr-1 font-mono-num text-[10px]">';
    h += '<span class="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">💧MP:<span id="' + ns + '-hd-cost">' + (s.cost || 0) + '</span></span>';
    h += '<span class="px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60">🩸HP:<span id="' + ns + '-hd-hpCost">' + (s.hpCost || 0) + '</span></span>';
    h += '</div><div class="flex items-center gap-1 shrink-0">' + delHtml + arrow(ns + '-arrow', open) + '</div></div>';
    return h;
  }

  function variantsHtml(ns, list, ui, path, tone, label, addLabel) {
    let h = '<div class="space-y-1.5 border-t border-cyan-900/40 pt-1.5"><div class="flex items-center justify-between flex-wrap gap-1">';
    h += '<span class="text-cyan-400 text-[10px] font-bold">⇅ ' + label + '（' + list.length + '）</span>';
    h += '<button data-ed-act="add-var" data-ui="' + ui + '" data-path="' + path + '" class="px-2 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-[10px] font-bold rounded border border-cyan-600/50"><span>+</span> ' + addLabel + '</button></div>';
    list.forEach((c, ci) => {
      const cns = ns + '-c-' + ci, key = 'c:' + ui + ':' + path + ':' + ci, open = draft.open.has(key);
      h += '<div class="skill-card-item rounded overflow-hidden ' + (open ? 'is-expanded' : '') + '" id="' + cns + '-card">';
      h += skillHeader(cns, c, tone, key, delBtn('del-var', 'data-ui="' + ui + '" data-path="' + path + '" data-ci="' + ci + '"', '删除变体'), open);
      h += '<div id="' + cns + '-body" class="' + (open ? '' : 'hidden') + ' p-2 space-y-2 bg-black/50 border-t border-slate-800 text-[11px]">' + skillBody(cns, c) + '</div></div>';
    });
    return h + '</div>';
  }

  function skillsHtml(row, ui, p) {
    const tone = row.side === 'hero' ? 'hero' : 'enemy';
    let h = '<div class="space-y-1.5 pt-1"><div class="flex items-center justify-between border-b border-cyan-900/40 pb-1">';
    h += '<div class="flex items-center gap-1.5"><span class="text-cyan-400 text-xs font-bold">⚡ 技能列表</span><span class="text-[10px] text-slate-500">(' + row.skills.length + '项)</span></div>';
    const skillRule = row.side === 'hero' ? '同名技能的规则以 YAML 为准，特效选择在本场生效；新增或改名的技能会追加到本场' : '敌方修改只在本场内存生效';
    h = h.replace(/(\(\d+项\)<\/span>)/, '$1<span class="text-[9px] text-slate-500 ml-1">' + skillRule + '</span>');
    h += '<div class="flex items-center gap-2"><button data-ed-act="fold-all" data-ui="' + ui + '" data-open="1" class="text-[10px] text-slate-400 hover:text-cyan-300">展开全部</button><span class="text-slate-600 text-[10px]">|</span>' +
      '<button data-ed-act="fold-all" data-ui="' + ui + '" data-open="" class="text-[10px] text-slate-400 hover:text-cyan-300">收起全部</button>' +
      '<button data-ed-act="add-skill" data-ui="' + ui + '" class="px-2 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-[10px] font-bold rounded border border-cyan-600/50"><span>+</span> 新增技能</button></div></div><div class="space-y-1.5">';
    row.skills.forEach((s, si) => {
      const ns = p + '-s-' + si, key = 's:' + ui + ':' + si, open = draft.open.has(key);
      h += '<div class="skill-card-item rounded overflow-hidden ' + (open ? 'is-expanded' : '') + '" id="' + ns + '-card">';
      h += skillHeader(ns, s, tone, key, delBtn('del-skill', 'data-ui="' + ui + '" data-si="' + si + '"', '删除技能'), open);
      h += '<div id="' + ns + '-body" class="' + (open ? '' : 'hidden') + ' p-2 sm:p-2.5 space-y-2 bg-black/50 border-t border-slate-800 text-[11px]">' + skillBody(ns, s) +
        variantsHtml(ns, Array.isArray(s.children) ? s.children : [], ui, 's' + si, tone, '变体子技能', '新增变体') + '</div></div>';
    });
    if (!row.skills.length) h += '<div class="text-[10px] text-slate-500 text-center py-2">暂无技能，点击「新增技能」添加</div>';
    return h + '</div></div>';
  }

  function slotsHtml(ns, it) {
    const slot = (k, cls) => {
      const t = it['type' + k], pw = it['power' + k];
      return '<div class="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded border border-slate-700/60"><button type="button" onclick="openSkillTypeCombo(\'edit-' + ns + '-type' + k + '\', this)" class="edit-input-game skill-type-combo w-full ' + cls + ' font-bold text-[10px] py-1 flex items-center justify-between gap-1"><span class="truncate">' + E(t || '[无]') + '</span><span class="text-slate-500 shrink-0">▾</span></button>' +
        '<select id="edit-' + ns + '-type' + k + '" class="hidden">' + rpgUi.renderSkillTypeOptions(t) + '</select><span class="text-[10px] text-slate-500 whitespace-nowrap">威力</span><input type="number" id="edit-' + ns + '-power' + k + '" value="' + (pw || 0) + '" class="edit-input-game w-14 font-mono-num text-right text-emerald-200 text-[10px] py-1"></div>';
    };
    return '<div id="' + ns + '-slots" class="' + (it.category === '弹药' ? 'hidden' : '') + ' space-y-1"><div class="text-[10px] text-slate-400 font-bold">效果槽位:</div><div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 grid-tags-responsive">' +
      slot('', 'text-cyan-300') + slot('2', 'text-slate-300') + slot('3', 'text-slate-300') + '</div></div>';
  }

  function itemsHtml(row, ui, p) {
    let h = '<div class="space-y-1.5 pt-1"><div class="flex items-center justify-between border-b border-amber-900/40 pb-1">';
    h += '<div class="flex items-center gap-1.5"><span class="text-amber-400 text-xs font-bold">🎒 物品道具</span><span class="text-[10px] text-slate-500">(' + row.items.length + '项)</span></div>';
    h += '<button data-ed-act="add-item" data-ui="' + ui + '" class="px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[10px] font-bold rounded border border-amber-600/50 flex items-center gap-0.5"><span>+</span> 新增物品</button></div><div class="space-y-1.5">';
    row.items.forEach((it, ii) => {
      const ns = p + '-it-' + ii, key = 'i:' + ui + ':' + ii, open = draft.open.has(key);
      const cat = it.category || '道具', stockLabel = cat === '道具' ? '次数' : '数量', stock = cat === '道具' ? (it.maxUses || 0) : (it.count || 0);
      h += '<div class="skill-card-item rounded overflow-hidden ' + (open ? 'is-expanded' : '') + '" id="' + ns + '-card">';
      h += '<div data-ed-fold="' + key + '" data-ed-ns="' + ns + '" class="px-2.5 py-1.5 cursor-pointer bg-slate-900/90 hover:bg-slate-800/90 transition-colors flex items-center justify-between gap-1.5"><div class="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">';
      h += '<span class="text-xs shrink-0">🎒</span><span id="' + ns + '-hd-name" class="text-xs font-bold text-slate-100 tracking-wide">' + E(it.name || '新物品') + '</span>';
      h += chip(cat === '弹药' ? 'bg-amber-950 text-amber-300 border-amber-700' : cat === '消耗品' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-sky-950 text-sky-300 border-sky-700', cat);
      h += '<div class="flex items-center gap-1 flex-wrap">' + rpgUi.buildEditorSkillTagPreview(it.type, it.power, it.type2, it.power2, it.type3, it.power3, 'hero') + '</div></div>';
      h += '<div class="flex items-center gap-1 shrink-0"><span class="font-mono-num text-[10px] text-amber-300">' + stockLabel + stock + '</span>' + delBtn('del-item', 'data-ui="' + ui + '" data-ii="' + ii + '"', '删除物品') + arrow(ns + '-arrow', open) + '</div></div>';
      h += '<div id="' + ns + '-body" class="' + (open ? '' : 'hidden') + ' p-2 sm:p-2.5 space-y-2 bg-black/50 border-t border-slate-800 text-[11px]">';
      h += '<div class="grid grid-cols-1 sm:grid-cols-12 gap-1.5 text-xs items-center">';
      h += '<div class="sm:col-span-3 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">名称</span><input type="text" id="edit-' + ns + '-name" value="' + E(it.name) + '" class="edit-input-game w-full font-bold text-slate-100 py-1 text-xs" placeholder="物品名"></div>';
      h += '<div class="sm:col-span-2 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">类别</span><select id="edit-' + ns + '-category" data-ed-cat="' + ns + '" class="edit-input-game w-full text-amber-300 font-bold py-1 text-xs">' +
        ['消耗品', '道具', '弹药'].map(c => '<option value="' + c + '"' + (c === cat ? ' selected' : '') + '>' + ({ 消耗品: '🧪 消耗品', 道具: '🎒 道具', 弹药: '🔹 弹药' })[c] + '</option>').join('') + '</select></div>';
      h += '<div class="sm:col-span-2 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap" id="' + ns + '-stock-label">' + stockLabel + '</span><input type="number" min="0" id="edit-' + ns + '-stock" value="' + stock + '" class="edit-input-game w-full font-mono-num text-right text-amber-200 py-1 text-[11px]"></div>';
      h += '<div class="sm:col-span-2 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">属性</span><select id="edit-' + ns + '-dmgType" class="edit-input-game w-full text-orange-300 font-bold py-1 text-xs">' +
        [['', '无(近战)'], ['近战', '🗡️ 近战'], ['远程', '🎯 远程'], ['法术', '⚡ 法术']].map(([v, l]) => '<option value="' + v + '"' + ((it.damageType || '') === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>';
      h += '<div class="sm:col-span-3 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">特效</span><select id="edit-' + ns + '-fxTag" class="edit-input-game w-full text-yellow-300 font-bold py-1 text-xs">' +
        fxOptions(it.fxTag, it.fxTagInferred) + '</select></div>';
      h += '<div class="sm:col-span-12 flex items-center gap-1.5 flex-wrap">' + pill(ns + '-others', it.isOthers, 'border-emerald-500 text-emerald-300 bg-emerald-950/70', '👥', '他人') +
        pill(ns + '-guaranteed', it.guaranteedHit, 'border-rose-500 text-rose-300 bg-rose-950/70', '🎯', '必中') + pill(ns + '-legendary', it.isLegendary, 'border-amber-500 text-amber-300 bg-amber-950/70', '✦', '传奇') +
        pill(ns + '-highTier', !it.isLegendary && it.isHighTier, 'border-violet-500 text-violet-300 bg-violet-950/70', '⬥', '高阶') +
        '<span class="text-[9px] text-slate-600">命中</span><input type="number" id="edit-' + ns + '-hit" value="' + (it.hit != null ? it.hit : 100) + '" class="edit-input-game w-14 font-mono-num text-right text-yellow-200 py-0.5 text-[10px]">' +
        '<span class="text-[9px] text-slate-600">暴击%</span><input type="number" min="0" max="100" id="edit-' + ns + '-crit" value="' + (it.critRate || 0) + '" class="edit-input-game w-14 font-mono-num text-right text-orange-200 py-0.5 text-[10px]"></div></div>';
      h += slotsHtml(ns, it);
      h += '<div class="space-y-1"><div class="text-[10px] text-slate-400 font-bold flex items-center justify-between flex-wrap gap-1"><span>物品绑定（对应技能每次施展消耗该物品）:</span><button data-ed-act="add-bind" data-ui="' + ui + '" data-ii="' + ii + '" class="px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[10px] font-bold rounded border border-amber-600/50"><span>+</span> 添加绑定</button></div>';
      (it.bindings || []).forEach((b, bi) => {
        const miss = b.skillName && !row.skills.some(sk => sk.name === b.skillName);
        h += '<div class="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded border border-slate-700/60"><span class="text-[10px] text-amber-300 font-bold whitespace-nowrap">🔗 绑定</span>' +
          '<select id="edit-' + ns + '-b-' + bi + '-skill" class="edit-input-game flex-1 min-w-0 text-slate-200 font-bold text-[10px] py-1">' + (miss ? '<option value="' + E(b.skillName) + '" selected>' + E(b.skillName) + '（技能不存在）</option>' : '') +
          row.skills.map(sk => '<option value="' + E(sk.name) + '"' + (sk.name === b.skillName ? ' selected' : '') + '>' + E(sk.name || '未命名') + '</option>').join('') + '</select>' +
          '<span class="text-[10px] text-slate-500 whitespace-nowrap">每次消耗</span><input type="number" min="1" id="edit-' + ns + '-b-' + bi + '-cost" value="' + (b.cost || 1) + '" class="edit-input-game w-12 font-mono-num text-right text-amber-200 text-[10px] py-1">' +
          delBtn('del-bind', 'data-ui="' + ui + '" data-ii="' + ii + '" data-bi="' + bi + '"', '移除绑定') + '</div>';
      });
      if (!(it.bindings || []).length) h += '<div class="text-[10px] text-slate-500 py-1">暂无绑定</div>';
      h += '</div>' + variantsHtml(ns, Array.isArray(it.children) ? it.children : [], ui, 'i' + ii, 'hero', '变体用法', '新增用法') + '</div></div>';
    });
    if (!row.items.length) h += '<div class="text-[10px] text-slate-500 text-center py-2">暂无物品，点击「新增物品」添加</div>';
    return h + '</div></div>';
  }

  function unitHtml(row, ui) {
    const p = pfx(ui), hero = row.side === 'hero', open = draft.open.has('u:' + ui), c = row.config;
    const fp = c.footprint || { width: 1, height: 1 };
    let h = '<div class="' + (hero ? 'char-card-hero' : 'char-card-enemy') + ' rounded-lg overflow-hidden ' + (open ? 'is-expanded' : '') + '" id="' + p + '-card">';
    h += '<div data-ed-fold="u:' + ui + '" data-ed-ns="' + p + '" class="px-2.5 sm:px-3 py-2 cursor-pointer bg-slate-900/80 hover:bg-slate-800/90 transition-colors flex flex-col gap-1.5"><div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 min-w-0">';
    h += '<div class="w-6 h-6 rounded overflow-hidden border ' + (hero ? 'border-cyan-500/40' : 'border-rose-500/40') + ' bg-black/40 shrink-0 flex items-center justify-center text-xs">' +
      (row.emoji ? E(row.emoji) : row.avatarUrl ? '<img src="' + E(row.avatarUrl) + '" referrerpolicy="no-referrer" class="w-full h-full object-cover" onerror="this.remove()">' : '👤') + '</div>';
    h += '<span id="' + p + '-hd-name" class="font-bold text-xs sm:text-sm ' + (hero ? 'text-yellow-200' : 'text-rose-200') + ' tracking-wide">' + E(row.displayName) + '</span>';
    h += '<span class="px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ' + (hero ? 'bg-cyan-950 text-cyan-300 border-cyan-700/60' : row.tierClass || 'bg-slate-800 text-slate-300 border-slate-600/60') + '">' + E(row.badge) + '</span></div>';
    h += '<div class="desktop-single-row items-center gap-2 ml-auto mr-1 font-mono-num text-[11px]">';
    h += '<span class="px-2 py-0.5 rounded bg-rose-950/70 border border-rose-800/60 text-rose-300"><span class="text-[9px] text-rose-400 font-bold">HP</span> <span id="' + p + '-hd-hp" class="font-bold">' + row.resources.hp + '</span><span class="text-rose-500/60">/</span>' + (c.maxHp ?? '-') + '</span>';
    h += '<span class="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300"><span class="text-[9px] text-cyan-400 font-bold">MP</span> <span id="' + p + '-hd-mp" class="font-bold">' + row.resources.mp + '</span><span class="text-cyan-500/60">/</span>' + (c.maxMp ?? '-') + '</span>';
    h += '<span class="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50 text-[10px]">⬛ ' + fp.width + '×' + fp.height + ' · 🦶 ' + (c.moveDistance ?? '-') + 'm</span>';
    h += '<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">技能: ' + row.skills.length + '</span></div>';
    h += '<div class="flex items-center gap-1.5 shrink-0">' + arrow(p + '-arrow', open) + '</div></div>';
    h += '<div class="mobile-multi-row items-center gap-1.5 font-mono-num text-[10px] pt-0.5 border-t border-slate-800/50"><span class="px-2 py-0.5 rounded bg-rose-950/70 border border-rose-800/60 text-rose-300">HP ' + row.resources.hp + '/' + (c.maxHp ?? '-') + '</span>' +
      '<span class="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">MP ' + row.resources.mp + '/' + (c.maxMp ?? '-') + '</span><span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] ml-auto">技能数: ' + row.skills.length + '</span></div></div>';

    h += '<div id="' + p + '-body" class="' + (open ? '' : 'hidden') + ' p-2.5 sm:p-3 space-y-3 bg-black/40 border-t border-cyan-950/60">';
    // 角色核心属性
    h += '<div class="space-y-2"><div class="flex items-center gap-1 text-[11px] font-bold text-cyan-400 border-l-2 border-cyan-500 pl-1.5">角色核心属性</div>';
    h += '<div class="grid grid-cols-1 sm:grid-cols-12 gap-1.5 text-xs">';
    h += '<div class="sm:col-span-3 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">显示名</span><input type="text" id="edit-' + p + '-dname" value="' + E(row.displayName) + '" class="edit-input-game w-full font-bold text-yellow-200 py-1 text-xs"></div>';
    h += '<div class="sm:col-span-2 flex items-center gap-1 text-[10px] text-slate-500" title="身份名与 YAML 匹配，不在此修改">身份 <b class="text-slate-300 truncate">' + E(row.name) + '</b></div>';
    const cls = c.classType || '';
    h += '<div class="sm:col-span-3 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">职业</span><select id="edit-' + p + '-class" class="edit-input-game w-full text-cyan-300 font-bold py-1 text-xs"><option value=""' + (!cls ? ' selected' : '') + '>无职业</option>' +
      (cls && !CLASSES.includes(cls) ? '<option value="' + E(cls) + '" selected>' + E(cls) + '</option>' : '') + CLASSES.map(k => '<option value="' + E(k) + '"' + (k === cls ? ' selected' : '') + '>' + E(k) + '</option>').join('') + '</select></div>';
    h += '<div class="sm:col-span-4 flex items-center gap-1"><span class="text-slate-400 text-[10px] whitespace-nowrap">头像URL</span><input type="text" id="edit-' + p + '-img" value="' + E(c.img || '') + '" class="edit-input-game w-full text-slate-400 font-mono-num text-[10px] py-1" placeholder="留空=按名字查找；名字带 emoji 时显示 emoji"></div></div>';
    h += '<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 text-[10px] grid-stats-responsive">' +
      statCell('❤️ 本场HP', 'text-rose-400', 'edit-' + p + '-hp', row.resources.hp, 'min="0"') + statCell('MaxHP 上限', 'text-slate-400', 'edit-' + p + '-maxHp', c.maxHp) +
      statCell('💧 本场MP', 'text-cyan-400', 'edit-' + p + '-mp', row.resources.mp, 'min="0"') + statCell('MaxMP 上限', 'text-slate-400', 'edit-' + p + '-maxMp', c.maxMp) +
      statCell('⚔️ 攻击(Atk)', 'text-orange-400', 'edit-' + p + '-atk', c.atk) + statCell('🛡️ 防御(Def)', 'text-blue-400', 'edit-' + p + '-def', c.def) +
      statCell('⚡ 速度(Spd)', 'text-yellow-400', 'edit-' + p + '-spd', c.spd) + statCell('🔥 MaxTP', 'text-emerald-400', 'edit-' + p + '-maxTp', c.maxTp) + '</div></div>';
    // 战棋属性
    const jump = ((Math.max(0, c.spd || 0) + Math.max(0, c.strength || 0)) / 20);
    h += '<div class="space-y-2"><div class="flex items-center gap-1 text-[11px] font-bold text-amber-400 border-l-2 border-amber-500 pl-1.5">战棋属性 <span class="text-[9px] font-normal text-slate-500 ml-1">跳跃上限 ≈ (速度+力量)/20 = ' + jump.toFixed(1) + 'm · 可推动总重 &lt; 力量×1.5</span></div>';
    h += '<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 text-[10px] grid-stats-responsive">';
    h += '<div class="bg-slate-900/90 px-2 py-1 rounded border border-slate-700/50 flex flex-col"><span class="text-amber-300 font-semibold text-[9px]">🧬 原型</span><select id="edit-' + p + '-prototype" class="edit-input-game w-full mt-0.5 text-[10px] py-0.5"><option value="">不指定</option>' +
      ['标准人形', '轻型生物', '大型生物'].map(t => '<option value="' + t + '"' + (c.prototype === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>';
    h += '<div class="bg-slate-900/90 px-2 py-1 rounded border border-slate-700/50 flex flex-col"><span class="text-amber-300 font-semibold text-[9px]">⬛ 占格 宽×高</span><span class="flex items-center gap-0.5 mt-0.5"><input type="number" min="1" id="edit-' + p + '-fpw" value="' + fp.width + '" class="edit-input-game w-full font-mono-num text-[11px] py-0.5 px-1"><b class="text-slate-500">×</b><input type="number" min="1" id="edit-' + p + '-fph" value="' + fp.height + '" class="edit-input-game w-full font-mono-num text-[11px] py-0.5 px-1"></span></div>';
    h += statCell('🦶 移动(m)', 'text-sky-300', 'edit-' + p + '-moveDistance', c.moveDistance) + statCell('💪 力量', 'text-orange-300', 'edit-' + p + '-strength', c.strength) +
      statCell('⚖️ 总重', 'text-stone-300', 'edit-' + p + '-totalWeight', c.totalWeight) + statCell('👁 感知', 'text-violet-300', 'edit-' + p + '-perception', c.perception) +
      statCell('💨 闪避', 'text-teal-300', 'edit-' + p + '-evasion', c.evasion);
    h += '<div class="bg-slate-900/90 px-2 py-1 rounded border border-slate-700/50 flex items-center">' + pill(p + '-isWise', c.isWise, 'border-amber-500 text-amber-300 bg-amber-950/70', '🧠', '智慧') + '</div></div></div>';
    if (hero) {
      h += '<div class="space-y-1.5"><div class="flex items-center gap-1 text-[11px] font-bold text-emerald-400 border-l-2 border-emerald-500 pl-1.5">持久化开关 <span class="text-[9px] font-normal text-slate-500 ml-1">开启 = YAML 未给出该字段时采用存档值；YAML 显式字段始终优先</span></div><div class="flex items-center gap-1.5 flex-wrap">' +
        CONFIG_PACKAGE_PERSIST_KEYS.map(k => pill(p + '-' + k, row.persist[k] !== false, 'border-emerald-500 text-emerald-300 bg-emerald-950/70', '💾', PERSIST_LABEL[k] || k)).join('') + '</div></div>';
    }
    h += '<div class="t-ed-source">' + E(row.sourceText || '') + '</div>';
    h += skillsHtml(row, ui, p);
    if (hero || row.items.length) h += itemsHtml(row, ui, p);
    // 高级 JSON（保留规则测试能力；按钮显式覆盖，错误定位到行列）
    const jk = 'j:' + ui, jopen = draft.open.has(jk);
    h += '<div class="rounded border border-slate-700/60 overflow-hidden"><div data-ed-fold="' + jk + '" data-ed-ns="' + p + '-json" class="px-2.5 py-1 cursor-pointer bg-slate-900/80 hover:bg-slate-800/90 flex items-center justify-between text-[10px] text-slate-400"><span>🧾 高级：技能 / 物品 JSON</span>' + arrow(p + '-json-arrow', jopen) + '</div>' +
      '<div id="' + p + '-json-body" class="' + (jopen ? '' : 'hidden') + ' p-2 space-y-1.5 bg-black/50">' +
      '<textarea id="edit-' + p + '-json-skills" spellcheck="false" class="t-ed-json">' + E(JSON.stringify(row.skills, null, 2)) + '</textarea>' +
      '<textarea id="edit-' + p + '-json-items" spellcheck="false" class="t-ed-json">' + E(JSON.stringify(row.items, null, 2)) + '</textarea>' +
      '<div class="flex justify-end"><button data-ed-act="json-apply" data-ui="' + ui + '" class="px-2.5 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-600/50">以 JSON 覆盖本角色技能与物品</button></div></div></div>';
    return h + '</div></div>';
  }

  function render(keepScroll) {
    const sc = modal.querySelector('#main-scroll-area');
    const top = keepScroll && sc ? sc.scrollTop : 0;
    const heroes = draft.units.map((u, i) => [u, i]).filter(([u]) => u.side === 'hero'), foes = draft.units.map((u, i) => [u, i]).filter(([u]) => u.side !== 'hero');
    const tab = draft.tab;
    let h = '<div id="editor-scroll-container" class="cyber-modal-editor bg-slate-950/95 border border-cyan-500/50 p-2 sm:p-4 rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.25)] relative text-gray-200 overflow-hidden custom-scrollbar">';
    h += '<div class="cyber-corner cyber-corner-tl"></div><div class="cyber-corner cyber-corner-tr"></div><div class="cyber-corner cyber-corner-bl"></div><div class="cyber-corner cyber-corner-br"></div>';
    h += '<div class="flex items-center justify-between pb-2 border-b border-cyan-500/30 gap-2 shrink-0"><div class="flex items-center gap-2 min-w-0"><span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0"></span><h2 class="text-xs sm:text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300 truncate">数据覆写</h2><span class="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-mono tracking-widest hidden sm:inline-block">TACTICS OVERRIDE</span></div>';
    h += '<div class="flex items-center gap-1.5 shrink-0"><button data-ed-act="cancel" class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-600/70 transition-all">取消</button><button data-ed-act="save" id="t-editor-save" class="px-3.5 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/50 transition-all flex items-center gap-1"><span>💾</span> 保存并重置本场</button></div></div>';
    h += '<div id="t-editor-error" role="status" class="t-ed-error"></div>';
    h += '<div id="main-scroll-area" class="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar my-2">';
    const gOpen = draft.open.has('g');
    h += '<div class="bg-slate-900/70 rounded-lg border border-amber-500/25 overflow-hidden"><div data-ed-fold="g" data-ed-ns="t-ed-global" class="px-3 py-1.5 bg-amber-950/20 hover:bg-amber-950/35 cursor-pointer flex items-center justify-between gap-2 border-b border-amber-500/20 transition-colors"><div class="flex items-center gap-2 flex-wrap min-w-0"><span class="text-amber-400 text-xs">⚙️</span><span class="text-xs font-bold text-amber-300">战斗全局设置</span>' +
      '<span class="text-[10px] text-slate-400">声音与资源 · 保存规则</span></div>' + arrow('t-ed-global-arrow', gOpen) + '</div>' +
      '<div id="t-ed-global-body" class="' + (gOpen ? '' : 'hidden') + ' p-2.5 space-y-2 text-[11px]">' + globalHtml() +
      '<div class="t-ed-rules">💾 保存 = 写入我方持久档 + 立即<b>重置本场</b>（限次、冷却、行动进度清零）。本场 HP/MP 与敌方配置只留在本场内存；YAML 显式字段在后续载入时仍优先于持久档。配置包导入/导出留在 P11。</div></div></div>';
    h += '<div class="flex items-center justify-between gap-2 border-b border-slate-700/50 pb-1.5"><div class="flex items-center gap-1 p-0.5 bg-slate-900/90 rounded-lg border border-slate-700/70">' +
      '<button data-ed-act="tab" data-tab="hero" class="px-2.5 py-1 rounded text-xs font-bold transition-all ' + (tab === 'hero' ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/50 shadow' : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40') + ' flex items-center gap-1"><span>🛡️</span> 我方 <span class="px-1 py-0.2 rounded-full bg-cyan-500/20 text-[9px] font-mono-num">' + heroes.length + '</span></button>' +
      '<button data-ed-act="tab" data-tab="enemy" class="px-2.5 py-1 rounded text-xs font-bold transition-all ' + (tab === 'enemy' ? 'bg-rose-950 text-rose-300 border border-rose-600/50 shadow' : 'text-slate-400 hover:text-rose-300 hover:bg-rose-950/40') + ' flex items-center gap-1"><span>👾</span> 敌方 <span class="px-1 py-0.2 rounded-full bg-rose-500/20 text-[9px] font-mono-num">' + foes.length + '</span></button></div>' +
      '<span class="text-[10px] text-slate-500">阵容来自 YAML，编辑器不增删角色</span></div>';
    h += '<div class="space-y-2.5 ' + (tab === 'hero' ? '' : 'hidden') + '">' + heroes.map(([u, i]) => unitHtml(u, i)).join('') + '</div>';
    h += '<div class="space-y-2.5 ' + (tab === 'enemy' ? '' : 'hidden') + '">' + foes.map(([u, i]) => unitHtml(u, i)).join('') + '</div>';
    h += '</div></div>';
    shell.openModal(h);
    markUnmigrated();
    if (keepScroll) { const s2 = modal.querySelector('#main-scroll-area'); if (s2) s2.scrollTop = top; }
  }
  // 原版模板内的未迁移能力：只加标注，不改模板
  function markUnmigrated() {
    modal.querySelectorAll('select[id$="-kanpo"], select[id$="-sheshen"]').forEach(el => el.parentElement.insertAdjacentHTML('beforeend', unmig('看破／舍身尚未迁移；含此机制的技能会被战棋拒绝使用')));
    modal.querySelectorAll('input[id$="-summon"]').forEach(el => el.previousElementSibling && el.previousElementSibling.insertAdjacentHTML('afterend', unmig('召唤生成单位/进轴尚未迁移；含召唤的技能会被拒绝')));
    modal.querySelectorAll('input[id$="-armor"], input[id$="-dispel"]').forEach(el => el.parentElement.insertAdjacentHTML('beforeend', unmig('肃正屏障与驱散尚未迁移')));
    modal.querySelectorAll('input[id*="-slot-turns"]').forEach(el => { el.classList.add('t-ed-dim'); el.title = '槽位独立持续时间尚未迁移：非空会被战棋拒绝'; });
  }

  // ---------- 读回（与原版 syncEditorDataToMemory 同口径 + 模块 G） ----------
  function readSkill(ns, s) {
    if (!$('edit-' + ns + '-name')) return;
    const id = k => 'edit-' + ns + '-' + k;
    s.name = val(id('name'));
    const rv = val(id('reaction')); s.isReaction = rv !== 'none'; s.reactionTarget = rv === 'none' ? 'all' : rv;
    const kv = val(id('kanpo')); s.kanpoTarget = kv === 'none' ? null : kv;
    const sv = val(id('sheshen')); s.sheshenTarget = sv === 'none' ? null : sv;
    s.isOthers = chk(id('others')); s.guaranteedHit = chk(id('guaranteed')); s.switchTarget = chk(id('switch'));
    s.critRate = Math.max(0, Math.min(100, num(id('crit'))));
    const leg = chk(id('legendary')); s.isLegendary = leg; s.isHighTier = leg ? false : chk(id('highTier'));
    s.damageType = val(id('dmgType')); s.fxTag = val(id('fxTag')) || '无';   // 显式选「无」保存为「无」：推断不会再补回
    s.cost = num(id('cost')); s.hpCost = num(id('hpCost')); s.tpCost = num(id('tpCost')); s.hit = num(id('hit'), 100);
    s.turns = val(id('turns')) !== '' ? Number(val(id('turns'))) : null;
    s.delay = num(id('delay')); s.haste = num(id('haste')); s.maxUses = num(id('limit'));
    for (const k of ['', '2', '3']) {
      s['type' + k] = val(id('type' + k)); s['power' + k] = num(id('power' + k));
      s['slotTurns' + k] = val(id('slot-turns' + k)) !== '' ? Number(val(id('slot-turns' + k))) : null;
    }
    // 槽目标覆盖（正式字段）：slotTargets[i]='self'|'default'；全 default 不写字段
    const selfs = [chk(id('slotself')), chk(id('slotself2')), chk(id('slotself3'))];
    if (selfs.some(Boolean)) s.slotTargets = selfs.map(v => v ? 'self' : 'default');
    else delete s.slotTargets;
    if ($(id('armor'))) s.barrierArmor = Math.max(0, num(id('armor')));
    if ($(id('dispel'))) { const d = Math.max(0, num(id('dispel'))); const k = ['', '2', '3'].find(x => (s['type' + x] || '').includes('驱散')); if (k !== undefined) s['power' + k] = d; }
    const sz = [s.type, s.type2, s.type3].find(t => t && t.includes('肃正'));
    if (sz) { const m = sz.match(/\[肃正(?::(近战|远程|法术))?/); s.barrierSub = m && m[1] ? m[1] : null; }
    if ($(id('summon'))) s.summonTarget = (val(id('summon')) || '').trim() || null;
    // 模块 G
    const rt = val(id('rtype'));
    if (!rt) s.range = null;
    else { const r = { type: rt }; for (const f of RANGE_FIELDS[rt]) { const v = val(id('r-' + f)); if (v !== '') r[f] = Number(v); } s.range = r; }
    s.actionCost = val(id('act')) === 'aux' ? { main: 0, aux: 1 } : { main: 1, aux: 0 };
    s.charge = Math.max(0, num(id('charge')));
    (s.children || []).forEach((c, ci) => readSkill(ns + '-c-' + ci, c));
    if (s.isGroup && Array.isArray(s.children)) s.children.forEach(c => { c.parentName = s.name; });
  }
  function readItem(ns, it) {
    if (!$('edit-' + ns + '-name')) return;
    const id = k => 'edit-' + ns + '-' + k;
    it.name = val(id('name')); it.category = val(id('category'));
    if (it.category === '道具') it.maxUses = num(id('stock')); else it.count = num(id('stock'));
    it.damageType = val(id('dmgType')) || null; it.fxTag = val(id('fxTag')) || '无';
    it.isOthers = chk(id('others')); it.guaranteedHit = chk(id('guaranteed'));
    const leg = chk(id('legendary')); it.isLegendary = leg; it.isHighTier = leg ? false : chk(id('highTier'));
    it.hit = num(id('hit'), 100); it.critRate = Math.max(0, Math.min(100, num(id('crit'))));
    for (const k of ['', '2', '3']) { it['type' + k] = val(id('type' + k)) || '[无]'; it['power' + k] = num(id('power' + k)); }
    it.bindings = (it.bindings || []).map((b, bi) => ({ skillName: val(id('b-' + bi + '-skill')), cost: Math.max(1, num(id('b-' + bi + '-cost'), 1)) }));
    (it.children || []).forEach((c, ci) => readSkill(ns + '-c-' + ci, c));
  }
  function readUnit(ui) {
    const row = draft.units[ui], p = pfx(ui);
    if (!$('edit-' + p + '-dname')) return;
    const id = k => 'edit-' + p + '-' + k;
    row.displayName = val(id('dname')).trim() || row.name;
    const cfg = Object.assign({}, row.config);
    for (const k of NUM_FIELDS) { const v = val(id(k)); if (v === '') delete cfg[k]; else cfg[k] = Number(v); }
    cfg.classType = val(id('class')) || null;
    const img = val(id('img')).trim(); if (img) cfg.img = img; else delete cfg.img;
    const proto = val(id('prototype')); if (proto) cfg.prototype = proto; else delete cfg.prototype;
    const w = val(id('fpw')), hgt = val(id('fph'));
    if (w !== '' && hgt !== '') cfg.footprint = { width: Number(w), height: Number(hgt) };
    cfg.isWise = chk(id('isWise'));
    row.config = cfg;
    if (row.side === 'hero') CONFIG_PACKAGE_PERSIST_KEYS.forEach(k => { row.persist[k] = chk(id(k)); });
    row.resources.hp = num(id('hp')); row.resources.mp = num(id('mp'));
    row.skills.forEach((s, si) => readSkill(p + '-s-' + si, s));
    row.items.forEach((it, ii) => readItem(p + '-it-' + ii, it));
  }
  function readAll() { draft.units.forEach((_, ui) => readUnit(ui)); }

  function showError(msg) {
    const el = modal.querySelector('#t-editor-error');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('t-on', !!msg);
  }
  function jsonError(label, text, err) {
    const m = /position (\d+)/.exec(err.message || '');
    if (!m) return label + '：' + err.message;
    const pos = Number(m[1]), before = text.slice(0, pos), line = before.split('\n').length, col = pos - before.lastIndexOf('\n');
    return label + '：第 ' + line + ' 行第 ' + col + ' 列 — ' + err.message;
  }
  function listAt(row, path) { return path[0] === 's' ? row.skills[Number(path.slice(1))] : row.items[Number(path.slice(1))]; }

  function act(btn) {
    const a = btn.dataset.edAct, ui = Number(btn.dataset.ui), row = draft.units[ui];
    if (a === 'cancel') { draft = null; shell.closeModal(); onCancel(); return; }
    if (a === 'save') {
      try { readAll(); validate(draft); } catch (err) { showError(String(err.message || err)); return; }
      const d = draft; draft = null; shell.closeModal(); onSave(d); return;
    }
    if (a === 'tab') { readAll(); draft.tab = btn.dataset.tab; render(false); return; }
    if (a === 'fold-all') {
      const on = !!btn.dataset.open;
      row.skills.forEach((_, si) => { const k = 's:' + ui + ':' + si; if (on) draft.open.add(k); else draft.open.delete(k); });
      readAll(); render(true); return;
    }
    if (a === 'json-apply') {
      const p = pfx(ui);
      const ts = val('edit-' + p + '-json-skills'), ti = val('edit-' + p + '-json-items');
      let skills, items;
      try { skills = JSON.parse(ts); } catch (err) { showError(row.displayName + ' · ' + jsonError('技能 JSON', ts, err)); return; }
      try { items = JSON.parse(ti); } catch (err) { showError(row.displayName + ' · ' + jsonError('物品 JSON', ti, err)); return; }
      if (!Array.isArray(skills) || !Array.isArray(items)) { showError(row.displayName + ' · 技能和物品必须是 JSON 数组'); return; }
      readAll(); row.skills = skills; row.items = items; showError(''); render(true); return;
    }
    readAll();
    if (a === 'add-skill') { row.skills.push(NEW_SKILL()); draft.open.add('s:' + ui + ':' + (row.skills.length - 1)); draft.open.add('u:' + ui); }
    else if (a === 'del-skill') row.skills.splice(Number(btn.dataset.si), 1);
    else if (a === 'add-var') {
      const owner = listAt(row, btn.dataset.path);
      if (!Array.isArray(owner.children)) owner.children = [];
      if (btn.dataset.path[0] === 's') owner.isGroup = true;
      owner.children.push(NEW_SKILL());
    } else if (a === 'del-var') {
      const owner = listAt(row, btn.dataset.path);
      owner.children.splice(Number(btn.dataset.ci), 1);
      if (btn.dataset.path[0] === 's' && !owner.children.length) { delete owner.children; delete owner.isGroup; delete owner.groupOnly; }
    } else if (a === 'add-item') { row.items.push(NEW_ITEM()); draft.open.add('i:' + ui + ':' + (row.items.length - 1)); }
    else if (a === 'del-item') row.items.splice(Number(btn.dataset.ii), 1);
    else if (a === 'add-bind') { const it = row.items[Number(btn.dataset.ii)]; (it.bindings || (it.bindings = [])).push({ skillName: (row.skills[0] && row.skills[0].name) || '', cost: 1 }); }
    else if (a === 'del-bind') row.items[Number(btn.dataset.ii)].bindings.splice(Number(btn.dataset.bi), 1);
    render(true);
  }

  modal.addEventListener('click', e => {
    if (!draft) return;
    const b = e.target.closest('[data-ed-act]');
    if (b) { e.stopPropagation(); act(b); return; }
    const f = e.target.closest('[data-ed-fold]');
    if (!f || e.target.closest('input,select,textarea,label')) return;
    const key = f.dataset.edFold, ns = f.dataset.edNs;
    const open = !draft.open.has(key);
    if (open) draft.open.add(key); else draft.open.delete(key);
    $(ns + '-body')?.classList.toggle('hidden', !open);
    $(ns + '-arrow')?.classList.toggle('rotate-180', open);
    $(ns + '-card')?.classList.toggle('is-expanded', open);
  });
  // 头部摘要即时回显（原版 update*HeaderSummary 同口径）
  modal.addEventListener('input', e => {
    const m = /^edit-(.+)-(name|dname|cost|hpCost|hp|mp)$/.exec(e.target.id || '');
    if (!m) return;
    const field = m[2] === 'dname' ? 'name' : m[2];
    const out = $(m[1] + '-hd-' + field);
    if (out) out.textContent = e.target.value;
  });
  modal.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.edRtype) {
      const ns = t.dataset.edRtype, keep = RANGE_FIELDS[t.value] || [];
      modal.querySelectorAll('[data-rp-for="' + CSS.escape(ns) + '"]').forEach(l => { l.hidden = !keep.includes(l.dataset.rp); });
    } else if (t.dataset.edCat) {
      const ns = t.dataset.edCat;
      $(ns + '-slots')?.classList.toggle('hidden', t.value === '弹药');
      const lab = $(ns + '-stock-label'); if (lab) lab.textContent = t.value === '道具' ? '次数' : '数量';
    }
  });

  return {
    open(d) { draft = Object.assign({ tab: 'hero', open: new Set() }, d); render(false); },
    isOpen: () => !!draft,
  };
}
