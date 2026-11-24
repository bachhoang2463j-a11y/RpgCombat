// ==========================================
// 战棋完整特效工作台（多文件原生 ES Module，直接引用原版 fx-library 与视听资源，免打包刷新即同步）
// ==========================================
import { installVfxTemplateStage } from './src/vfx-template-host.mjs';
import { DEFAULT_FX_ENTRIES } from './src/fx-library.mjs';
import { checkBudget } from './src/fx-registry.mjs';

const yamlText = await (await fetch('../doc/tactics/' + encodeURIComponent('典型对局-战棋版.yaml'))).text();
const stage = installVfxTemplateStage(document.getElementById('tactics-app'), { yamlText });

// 顶部调试参数状态
const cfg = {
  outcome: 'hit', // hit | dodge | crit | fatal
  casterId: 'h:埃利奥特',
  targetPreset: 'single', // single | boss | group | self
  gradeFilter: 'all', // all | L1 | L2 | L3 | L4 | identity | prepare | reaction
};

const CASTERS = [
  { id: 'h:埃利奥特', label: '埃利奥特' },
  { id: 'h:弗兰克', label: '弗兰克' },
  { id: 'h:玛德琳', label: '玛德琳' },
  { id: 'h:索恩', label: '索恩' },
  { id: 'e:犹格索托斯之子', label: '敌:犹格' },
];

const TARGET_PRESETS = {
  single: { label: '单体·深潜A', ids: ['e:深潜者A'], range: { type: '单体', castRange: 18 } },
  boss:   { label: '2×2·伊塔库亚', ids: ['e:伊塔库亚的眷族'], range: { type: '单体', castRange: 18 } },
  group:  { label: '群聚·4杂兵', ids: ['e:深潜者A', 'e:深潜者B', 'e:食尸鬼A', 'e:食尸鬼B'], range: { type: '爆炸', castRange: 18, radius: 4 } },
  self:   { label: '自身', ids: null, range: { type: '自身' } },
};

const OUTCOMES = [
  { key: 'hit', label: '命中' },
  { key: 'dodge', label: '闪避' },
  { key: 'crit', label: '暴击' },
  { key: 'fatal', label: '处决', cls: 'warn' },
];

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'L1', label: 'L1' }, { key: 'L2', label: 'L2' }, { key: 'L3', label: 'L3' }, { key: 'L4', label: 'L4' },
  { key: 'identity', label: '身份' }, { key: 'prepare', label: '起手' }, { key: 'reaction', label: '反应' },
];

// 识别非直接伤害类的增益/回复/护盾/减益/场地/召唤条目，避免 mock 伤害打在自身或友军身上
const SUPPORT_FX_KINDS = {
  'heal-mend': 'heal', 'aoe-heal': 'heal', 'vital-flow': 'heal',
  'self-boost': 'buff', 'ally-buff': 'buff', 'harmony-ward': 'buff', 'holy-vow': 'buff',
  'sand-armor': 'shield', 'isis-embrace': 'shield', 'nak-tith-barrier': 'shield', 'sanctum-veil': 'shield',
  'pure-debuff': 'debuff', 'abyss-fog': 'debuff', 'xenon-blight-fog': 'debuff', 'silence-field': 'debuff',
  'high-summon': 'field', 'scorpion-key': 'field', 'sekhmet-vow': 'buff', 'strange-conch': 'buff',
};
function buildSupportEffects(kind, targetIds) {
  if (kind === 'heal') return targetIds.map(id => ({ kind: 'heal', targetId: id, value: 35, crit: cfg.outcome === 'crit' }));
  if (kind === 'shield') return targetIds.map(id => ({ kind: 'shield', targetId: id, value: 40 }));
  if (kind === 'buff') return targetIds.map(id => ({ kind: 'buff', targetId: id, field: 'atk', value: 15, tag: '增攻' }));
  if (kind === 'debuff') return targetIds.map(id => ({ kind: 'buff', targetId: id, field: 'def', value: -15, tag: '降防' }));
  return [];
}

// 自定义对比条目可按需追加到此处
const CUSTOM_FX_ENTRIES = [];

function registerAllDefault(reg) {
  for (const e of DEFAULT_FX_ENTRIES) {
    if (!reg.list().some(x => x.id === e.id)) reg.register(e);
  }
}

function buildWorkbenchUi() {
  const { menuBox, listWrap, subLabel, activeHeroName } = stage.els;
  menuBox.classList.add('vfx-stage-panel');
  if (activeHeroName) activeHeroName.textContent = '战棋特效工作台 · 实时原版库';

  const ctrlWrap = document.createElement('div');
  menuBox.insertBefore(ctrlWrap, listWrap);

  function renderControls() {
    ctrlWrap.innerHTML = '';
    // 第 1 排：结果态 + 施法者
    const row1 = document.createElement('div');
    row1.className = 'vfx-bar-row';
    for (const o of OUTCOMES) {
      const b = document.createElement('button');
      b.className = 'vfx-chip' + (o.cls ? ' ' + o.cls : '') + (cfg.outcome === o.key ? ' active' : '');
      b.textContent = o.label;
      b.onclick = () => { cfg.outcome = o.key; renderControls(); };
      row1.appendChild(b);
    }
    const sel = document.createElement('select');
    sel.style.cssText = 'margin-left:auto;font-size:10px;background:#0f172a;color:#e2e8f0;border:1px solid #475569;border-radius:4px;padding:1px 4px;';
    for (const c of CASTERS) {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.label; opt.selected = cfg.casterId === c.id;
      sel.appendChild(opt);
    }
    sel.onchange = () => { cfg.casterId = sel.value; };
    row1.appendChild(sel);

    // 第 2 排：目标预设 + 分级筛选
    const row2 = document.createElement('div');
    row2.className = 'vfx-bar-row';
    for (const [k, p] of Object.entries(TARGET_PRESETS)) {
      const b = document.createElement('button');
      b.className = 'vfx-chip' + (cfg.targetPreset === k ? ' active' : '');
      b.textContent = p.label;
      b.onclick = () => { cfg.targetPreset = k; renderControls(); };
      row2.appendChild(b);
    }

    const row3 = document.createElement('div');
    row3.className = 'vfx-bar-row';
    for (const f of FILTERS) {
      const b = document.createElement('button');
      b.className = 'vfx-chip' + (cfg.gradeFilter === f.key ? ' active' : '');
      b.textContent = f.label;
      b.onclick = () => { cfg.gradeFilter = f.key; renderControls(); renderEntryList(); };
      row3.appendChild(b);
    }

    ctrlWrap.append(row1, row2, row3);
  }

  function renderEntryList() {
    const all = stage.getRegistry().list().filter(e => !e.fallback);
    const shown = all.filter(e => {
      if (cfg.gradeFilter === 'all') return true;
      if (cfg.gradeFilter === 'prepare') return e.kind === 'prepare';
      if (cfg.gradeFilter === 'reaction') return e.kind === 'reaction';
      return (e.kind || 'action') === 'action' && e.grade === cfg.gradeFilter;
    });
    if (subLabel) subLabel.textContent = `${shown.length} / ${all.length} 项`;
    listWrap.replaceChildren();
    for (const entry of shown) {
      const tag = (entry.fxTags && entry.fxTags[0]) || entry.id;
      const bCheck = checkBudget(entry);
      const btn = document.createElement('button');
      btn.className = 'vfx-demo-card';
      btn.style.cssText = 'width:100%;padding:5px 8px;background:rgba(15,23,42,0.85);border:1px solid rgba(51,65,85,0.8);border-radius:7px;text-align:left;color:#f1f5f9;cursor:pointer;flex-shrink:0;';
      btn.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:700;"></span><span style="font-size:9px;padding:1px 5px;border-radius:4px;border:1px solid rgba(34,211,238,0.5);color:#67e8f9;"></span></div><div style="font-size:9px;color:#94a3b8;margin-top:1px;"></div>';
      const spans = btn.querySelectorAll('span');
      spans[0].textContent = tag + (entry.fxTags && entry.fxTags.length > 1 ? ` (+${entry.fxTags.length - 1})` : '');
      spans[1].textContent = entry.kind && entry.kind !== 'action' ? `${entry.kind}·${entry.grade}` : entry.grade;
      btn.lastElementChild.textContent = `id: ${entry.id}` + (bCheck.ok ? '' : ` · ⚠️ ${bCheck.reasons[0]}`);
      btn.onclick = () => {
        const preset = TARGET_PRESETS[cfg.targetPreset];
        const targetIds = preset.ids || [cfg.casterId];
        const supportKind = SUPPORT_FX_KINDS[entry.id] || null;
        const noDamage = !!supportKind;
        stage.playCard({
          name: tag, fxTag: tag, kind: entry.kind || 'action', level: entry.grade,
          casterId: cfg.casterId, targetIds, range: preset.range,
          noDamage, extraEffects: noDamage ? buildSupportEffects(supportKind, targetIds) : [],
          hit: cfg.outcome !== 'dodge', crit: cfg.outcome === 'crit', fatal: cfg.outcome === 'fatal',
          segments: tag === '枪击' ? 3 : 1,
        });
      };
      listWrap.appendChild(btn);
    }
  }

  stage.setResetHook(() => renderEntryList());
  renderControls();
  renderEntryList();
}

stage.boot({
  customEntries: CUSTOM_FX_ENTRIES,
  registerExtra: registerAllDefault,
  onReady: () => {
    buildWorkbenchUi();
    requestAnimationFrame(() => stage.fitHall());
    stage.shell.showLog('战棋特效完整工作台就绪（实时直连 fx-library.mjs 与原版资源）');
  },
});
