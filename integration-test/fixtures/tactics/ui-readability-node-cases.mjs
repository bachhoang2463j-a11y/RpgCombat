// UI 可读性：状态徽章 / 效果飘字 / 检视卡 / 命中概率 / 主辅过滤与快捷操作接线。真实规则 + 最小桩，不复制被测逻辑。
import { readFileSync } from 'node:fs';
import { parseSkill } from '../../../tactics/src/parser.mjs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';
import { resolveHit, hitChance } from '../../../tactics/src/damage.mjs';
import { getEffectiveStats } from '../../../tactics/src/class-passives.mjs';
import { statusBadges, compactStatusHtml, fullStatusHtml, effectFloat, inspectorHtml } from '../../../tactics/src/status-ui.mjs';
import { resolveLore, loreKey, SAMPLE_LORE } from '../../../tactics/src/lore.mjs';
import { parseYamlText } from '../../../tactics/src/parser.mjs';
import { createScenarioData } from '../../../tactics/src/scenario-data.mjs';

const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const src = p => readFileSync(new URL('../../../tactics/' + p, import.meta.url), 'utf8');
const map = () => ({ sceneId: 'uir', grid: { columns: 20, rows: 12, metersPerCell: 1 }, ground: {}, objects: [] });
function unit(id, side, skills = [], extra = {}) {
  return { id, name: id, side, controller: side === 'hero' ? 'player' : 'ai', footprint: { width: 1, height: 1 }, attrTags: [], skills, items: [],
    ref: { hp: 500, maxHp: 500, mp: 100, maxMp: 100, tp: 0, maxTp: 100, atk: 20, def: 0, spd: extra.spd ?? 100, evasion: 0, strength: 50, totalWeight: 70, perception: 100, moveDistance: 6, shield: 0 } };
}
const drive = gen => { let s = gen.next(); while (!s.done) s = gen.next(null); return s.value; };

function badgeCases() {
  const out = [];
  const buff = parseSkill('【战吼】[增攻;power:30][瞄准;power:20][Turns:3][范围:自身]');
  const debuff = parseSkill('【诅咒】[降防;power:15][中毒;power:12][Turns:2][必中][范围:单体;射程:9]');
  const b = createBattle({ units: [unit('h', 'hero', [buff, debuff], { spd: 200 }), unit('e', 'enemy')], placementsById: { h: { col: 2, row: 2, facing: 0 }, e: { col: 6, row: 2, facing: 0 } }, scene: map(), random: () => 0.5 });
  b.start();
  const r1 = drive(b.beginAttack(buff, { ...unitCenter({ col: 2, row: 2 }, { width: 1, height: 1 }), targetId: 'h' }));
  const eff = b.getEffectiveUnit('h');
  const badges = statusBadges(eff);
  out.push(ok('UIR-S 真实增益结果：getEffectiveUnit.buffs 带时钟剩余回合', r1.ok && eff.buffs.filter(x => x.type === 'atk' || x.type === 'hit').every(x => x.remaining === 3), eff.buffs));
  out.push(ok('UIR-S 徽章：攻+30·3回、命+20·3回（原版 updateBuffUI 口径）', badges.some(x => x.text === '攻+30·3回') && badges.some(x => x.text === '命+20·3回'), badges.map(x => x.text)));
  b.endAction();
  for (let i = 0; i < 6 && b.snapshot().currentId !== 'h'; i++) b.endAction();
  const r2 = drive(b.beginAttack(debuff, { ...unitCenter({ col: 6, row: 2 }, { width: 1, height: 1 }), targetId: 'e' }));
  const eb = statusBadges(b.getEffectiveUnit('e'));
  out.push(ok('UIR-S 减益/中毒：负面在前、紫色、剩余回合来自时钟', r2.ok && eb[0].neg && eb.some(x => /^毒12/.test(x.text)) && eb.some(x => /^防-15/.test(x.text)) && eb.every(x => x.neg), eb.map(x => x.text)));
  const many = statusBadges({ buffs: [{ type: 'atk', value: 5, remaining: 1 }, { type: 'def', value: 5, remaining: 2 }, { type: 'hit', value: 5 }, { type: 'eva', value: 5 }, { type: 'spd', value: 5 }], stunned: true, shield: 9 });
  const compact = compactStatusHtml(many);
  out.push(ok('UIR-S 地图紧凑：最多 4 个 + 折叠计数；剩 1 回合闪烁', (compact.match(/class="t-st(?: t-st-neg| t-st-exp)*"/g) || []).length === 4 && />\+3</.test(compact) && /t-st-exp/.test(fullStatusHtml(many)), compact));
  out.push(ok('UIR-S 消耗型回避显示「1次」', statusBadges({ buffs: [{ type: 'eva', value: 50, isConsumable: true, remaining: null }] })[0].text === '避+50·1次'));
  const loaded = statusBadges({ ...eff, chargeInventory: 3 });
  out.push(ok('UIR-S 加速库存同步进地图与底栏，不改变速度或标剩余回合', /加速 3/.test(compactStatusHtml(loaded))
    && /加速 3/.test(fullStatusHtml(loaded)) && !statusBadges({ ...eff, chargeInventory: 0 }).some(x => x.key === 'haste')));
  return out;
}

function floatCases() {
  const out = [];
  const want = [
    [{ kind: 'buff', field: 'atk', value: 10, turns: 3, tag: '[增攻]' }, '攻+10 3回'], [{ kind: 'buff', field: 'hit', value: 20, turns: 3, tag: '[瞄准]' }, '命+20 3回'],
    [{ kind: 'buff', field: 'def', value: -15, turns: 2, tag: '[降防]' }, '防-15 2回'], [{ kind: 'buff', field: 'eva', value: 50, turns: Infinity, tag: '[单避]' }, '避+50 1次'],
    [{ kind: 'heal', value: 35 }, '+35 HP'], [{ kind: 'shield', value: 40 }, '+40 护盾'], [{ kind: 'taunt', value: 20, turns: 3 }, '仇恨+20 3回'],
    [{ kind: 'dispel', removed: ['poison', 'def'] }, '驱散 2 负面'], [{ kind: 'mainPoint', points: 1 }, '再动 +1'], [{ kind: 'dot', dot: 'poison', strength: 12, turns: 2 }, '☠️ 毒12 2回'],
  ];
  const bad = want.filter(([e, t]) => effectFloat(e)?.text !== t).map(([e, t]) => [t, effectFloat(e)?.text]);
  out.push(ok('UIR-F 所有效果类型都有飘字（原版 registerTagHandler 文案）', !bad.length, bad));
  out.push(ok('UIR-F 结界拦截不飘效果字（由结界演出负责）', effectFloat({ kind: 'blocked' }) === null));
  const d = src('src/action-director.mjs'), lib = src('src/fx-library.mjs');
  out.push(ok('UIR-F 飘字统一在导演 revealEffect 揭示拍点（攻击附带减益与辅助条目同口径），支援演出不再只覆盖 HP/MP',
    /floatEffect\(e\.targetId, effectFloat\(e\)\);/.test(d) && !/SUPPORT_NUMBERS/.test(lib) && /playOne\(feedback, effect\.targetId, \(\) => \{ ctx\.revealEffect\(effect, true\); buffFlourish\(/.test(lib)));
  return out;
}

function previewCases() {
  const out = [];
  const rnd = Math.random;   // 抽样核对解析式（LCG 低位相关会偏）
  for (const [A, D] of [[100, 40], [80, 120], [1, 1], [150, 150]]) {
    let n = 0; const N = 60000;
    for (let i = 0; i < N; i++) if (resolveHit({ hitBonus: A - 100 }, { evasion: D, evaBonus: 0 }, { hit: 100 }, rnd).hit) n++;
    out.push(ok('UIR-P 命中概率与 resolveHit 实测一致 A=' + A + ' D=' + D, Math.abs(n / N - hitChance(A, D)) < 0.01, [n / N, hitChance(A, D)]));
  }
  const m = src('src/main.mjs');
  out.push(ok('UIR-P 攻击预览：血条预计扣除段 + 命中率 + 击杀标记，用规则 damagePreview 与显示态 HP', /view\.setPredict\(id, \{ from: hp \/ max, to: Math\.max\(0, hp - dmg\) \/ max, kill/.test(m) && /hitChance\(mine\[0\]\.attackCap, mine\[0\]\.dodgeCap\)/.test(m) && /skill\.guaranteedHit \? 1/.test(m)));
  const html = inspectorHtml({ unit: { id: 'e', name: '深潜者', side: 'enemy', attrTags: ['[流体]'] }, eff: { hp: 50, maxHp: 100, mp: 0, maxMp: 0, tp: 0, maxTp: 0, shield: 0, atk: 70, def: 10, hit: 0, eva: 0, spd: 90, evasion: 30, moveDistance: 6, effectiveMoveDistance: 6, buffs: [] },
    base: { atk: 50, def: 10, hit: 0, eva: 0, spd: 100 }, badges: [], charge: { current: 4, max: 4 }, lore: resolveLore({ name: '🦈深潜者A' }) });
  out.push(ok('UIR-P 检视卡：加减成标注、原版变种特质图标与说明、满充能提示', /ATK:<b>70<\/b><em class="t-up">\+20<\/em>/.test(html) && /SPD:<b>90<\/b><em class="t-down">-10<\/em>/.test(html)
    && /data-tagtip-body="受到的远程伤害 -50%"><i>💧<\/i>流体<\/span>/.test(html) && /大招就绪/.test(html)));
  out.push(ok('UIR-P 检视卡为暗金扁平铭牌（金细线 + 伪元素四角刻线），无四角节点与钉住行为', /t-insp-glass/.test(html) && !/t-insp-corner|点选钉住/.test(html)
    && !/inspectPinned/.test(m) && !/\.t-insp-corner/.test(src('tactics.css'))
    && /\.t-insp-glass \{[^}]*rgba\(24,21,16,\.96\)[^}]*border: 1px solid var\(--g-line\)/.test(src('tactics.css')) && /\.t-insp-glass::before/.test(src('tactics.css'))));
  out.push(ok('UIR-P 世界书档案块：示例标 SAMPLE，接入后 unit.wbSource（原版契约）优先并标 LORE ENTRY', /📚 世界书图鉴档案<\/span><em>SAMPLE<\/em>/.test(html) && html.includes(SAMPLE_LORE['深潜者'])
    && resolveLore({ name: '食尸鬼B', wbSource: { wbName: '澳洲篇', entryName: '食尸鬼', desc: '真值' } }).desc === '真值' && !resolveLore({ name: '食尸鬼B', wbSource: { wbName: '澳洲篇', entryName: '食尸鬼', desc: '真值' } }).sample));
  {
    const d = createScenarioData(parseYamlText(readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8')));
    const tpl = parseYamlText(readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8')).summonTemplates || [];
    const miss = [...d.units, ...tpl].filter(u => !resolveLore(u)).map(u => u.name);
    out.push(ok('UIR-P 典型对局全部单位与召唤模板都有示例档案（装饰名/编号归一）', !miss.length && loreKey('❄️♱⸨伊塔库亚的眷族⸩♱') === '伊塔库亚的眷族' && loreKey('🦏◈幻梦行军兽◈') === '幻梦行军兽', miss));
  }
  return out;
}

function wiringCases() {
  const out = [], m = src('src/main.mjs'), sh = src('src/ui-shell.mjs'), sb = src('src/sandbox.mjs'), uv = src('src/unit-view.mjs');
  out.push(ok('UIR-W 冲刺移动：超额/额度用完且冲刺后可达 → 首次点击锁定，同格再点 sprint()+move()', /if \(!ev\.armed\) \{ sprintArm = ev\.key;/.test(m) && /const sp = battle\.sprint\(\);/.test(m) && /need <= r\.moveRemaining \+ add/.test(m)));
  out.push(ok('UIR-W 右键：瞄准/目标选择中仍为取消；否则进入跳跃并锁定，同格再右键起跳', /if \(aim \|\| pending \|\| sprintArm \|\| \(fieldAction && fieldAction !== 'jump'\)\) return false;/.test(m)
    && /if \(fieldAction === 'jump' && jumpArm === key\) \{ jumpArm = null; runFieldTarget\('jump', hit\);/.test(m) && /onContextCb\(hitAt\(e\.clientX, e\.clientY\)\)\) return;\s*\n\s*if \(onCancelCb\) onCancelCb\(\);/.test(sb)));
  out.push(ok('UIR-W 主/辅筛选按效果；技能卡不重复标费，物品显示主辅费；空列表提示仅在变化时更新',
    /data-cost-filter="main"/.test(sh) && /data-cost-filter="aux"/.test(sh) && /skillActionKind\(s\) === state\.costFilter/.test(sh)
    && sh.includes('decorateItemCards') && sh.includes('t-universal') && /if \(tip && tip\.textContent === want\) return;/.test(sh)));
  out.push(ok('UIR-W 技能卡 TP 校验读真实 TP（原 tp:0 导致 TP 技能误判不足）', /tp: u\.ref\.tp \|\| 0, burstActivated/.test(sh)));
  out.push(ok('UIR-W 徽章显示态：结算揭示前保持旧状态，效果揭示拍点只更新该单位', /shownEff\.set\(u\.id, battle\.getEffectiveUnit\(u\.id\)\);\s*\n\s*renderStatus\(u\.id\);/.test(m) && /setStatus, setPredict, clearPredict/.test(uv)));
  return out;
}

export const groups = {
  'UIR-S': { run: () => ({ cases: badgeCases() }) },
  'UIR-F': { run: () => ({ cases: floatCases() }) },
  'UIR-P': { run: () => ({ cases: previewCases() }) },
  'UIR-W': { run: () => ({ cases: wiringCases() }) },
};
