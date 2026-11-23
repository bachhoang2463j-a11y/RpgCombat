// ==========================================
// rules02 UI 接线用例（FX02 反应弹窗 / 攻击 generator 驱动 / 编辑器规范标签）：
//   1) 反应弹窗候选纯函数（contract v2：选择 = null | {responderId, skill}，候选带 usesLeft）
//   2) 攻击驱动 director.driveAttack：reaction yield → choice 回投 → 放弃(null) 继续 → 返回 FX01 result；取消（cancelAttack）即作废
//   3) vendor 编辑器标签去单群：下拉只含规范标签（伤害/回复/…带括号子型），旧标签仅作当前值保留
//   4) demo fixture 反应/治疗技能数据存在（反应弹窗与治疗反馈的规则输入）
// 本文件可独立运行：node integration-test/fixtures/tactics/rules02-ui-node-cases.mjs
// ==========================================

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const SRC = path.join(ROOT, 'tactics', 'src');

function ok(id, pass, detail) { return { id, pass: !!pass, detail: detail || '' }; }
const j = v => JSON.stringify(v);

// ---------- 最小模块组装（与 run-tests 同源路径；本文件自带 runner，不改测试启动器） ----------
async function loadModules() {
  const mods = {};
  for (const [key, file] of Object.entries({
    parser: 'parser.mjs', battle: 'battle.mjs', fxRegistry: 'fx-registry.mjs', fxLibrary: 'fx-library.mjs',
    director: 'action-director.mjs', reactionPrompt: 'reaction-prompt.mjs', editorPanel: 'editor-panel.mjs', fixture: 'demo-fixture.mjs',
    effectDefs: 'effect-definitions.mjs',
  })) mods[key] = await import(pathToFileURL(path.join(SRC, file)).href);
  return mods;
}
// FX01 演出注册表回归（fx-registry/fx-library 规范前缀适配后真跑，与 run-tests 同源用例文件，只读引用）
async function loadFx01Groups() {
  return (await import(pathToFileURL(path.join(ROOT, 'integration-test', 'fixtures', 'tactics', 'fx01-node-cases.mjs').replace(/\\/g, '/')))).groups;
}

export const groups = {
  'TRU-01': { run({ modules: m }) {
    const cases = [];
    const { reactionChoices, autoPickChoice } = m.reactionPrompt;
    const skillA = { name: '折影步', isReaction: true }, skillB = { name: '双莲祛煞', isReaction: true };
    const req = { type: 'reaction', responderId: 'h:埃利奥特', casterId: 'e:斥候', skill: { name: '爪击' },
      incomingType: '近战', candidates: [{ skill: skillA, usesLeft: 2 }, { skill: skillB, usesLeft: 0 }, null, {}], slotIndex: 0, segmentIndex: 0, targetId: 'h:埃利奥特', shotIndex: 0, totalShots: 1 };
    cases.push(ok('TRU-01a 候选归一化：保留 {skill,usesLeft}，丢弃空项', j(reactionChoices(req)) === j([{ skill: skillA, usesLeft: 2 }, { skill: skillB, usesLeft: 0 }]), j(reactionChoices(req))));
    const pick = autoPickChoice(req);
    cases.push(ok('TRU-01b AI 自动选择：v2 形状 {responderId, skill}，取首个候选', pick && pick.responderId === 'h:埃利奥特' && pick.skill === skillA, j(pick)));
    cases.push(ok('TRU-01c 无候选：AI 自动选择为 null（承受攻击）', autoPickChoice({ type: 'reaction', responderId: 'e:斥候', candidates: [] }) === null, ''));
    cases.push(ok('TRU-01d 空/坏请求不抛错', reactionChoices(null).length === 0 && autoPickChoice(undefined) === null, ''));
    return cases;
  } },
  'TRU-02': { async run({ modules: m }) {
    const cases = [];
    // 最小 sandbox stub：driveAttack 只消费 scope().isLive
    const live = { isLive: true };
    const director = m.director.createActionDirector({
      sandbox: { getScope: () => live }, avHost: { av: { CombatAudioMixer: {} } }, getViewData: () => null,
      promptReaction: null, battle: () => null,
    });
    // contract v2 generator 模拟：yield reaction req → next(choice={responderId,skill}|null) → … → return FX01 result
    const skillA = { name: '折影步' };
    const req1 = { type: 'reaction', responderId: 'h:埃利奥特', casterId: 'e:斥候', skill: { name: '爪击' }, candidates: [{ skill: skillA, usesLeft: 1 }], slotIndex: 0 };
    const req2 = { type: 'reaction', responderId: 'h:埃利奥特', casterId: 'e:斥候', skill: { name: '爪击' }, candidates: [{ skill: skillA, usesLeft: 1 }], slotIndex: 0 };
    const result = { ok: true, hits: [{ targetId: 't1', segments: [{ hit: true, hpBefore: 10, hpAfter: 3 }] }] };
    const seen = [];
    function* fakeBeginAttack() {
      const choice1 = yield req1;
      seen.push(choice1);
      const choice2 = yield req2;
      seen.push(choice2);
      return result;
    }
    // 手动驱动（与 director.driveAttack 同一协议）：prompt stub 依次回 {responderId,skill} 与 null（放弃）
    const choices = [{ responderId: 'h:埃利奥特', skill: skillA }, null];
    const gen = fakeBeginAttack();
    let step = gen.next();
    while (!step.done) { step = gen.next(choices[seen.length]); }
    cases.push(ok('TRU-02a 驱动协议：choice 形状回投顺序正确', seen.length === 2 && seen[0] === choices[0] && seen[1] === null, j(seen)));
    cases.push(ok('TRU-02b generator 返回 FX01 result 原样透出', step.value === result, j(step.value)));
    // director.driveAttack 集成：prompt 返回值喂回 next；scope 失活 / cancelAttack 即作废
    live.isLive = true;
    let promptCall = 0;
    const promptChoices = [{ responderId: 'h:埃利奥特', skill: skillA }, null];
    const dir2 = m.director.createActionDirector({
      sandbox: { getScope: () => live }, avHost: { av: { CombatAudioMixer: {} } }, getViewData: () => null,
      promptReaction: () => Promise.resolve(promptChoices[promptCall++] ?? null), battle: () => null,
    });
    const out = await dir2.driveAttack((function* () { const c = yield req1; return { ok: true, choice: c }; })());
    cases.push(ok('TRU-02c driveAttack：prompt 返回值喂回 next 并透出返回值', out && out.ok && j(out.choice) === j(promptChoices[0]), j(out)));
    live.isLive = false;
    const dead = await dir2.driveAttack((function* () { yield req1; return { ok: true }; })());
    cases.push(ok('TRU-02d scope 失活（重置/换场）：等待以 null 结算，旧链作废', dead === null, j(dead)));
    live.isLive = true;
    let releaseGate;
    const gate = new Promise(r => { releaseGate = r; });
    const dir3 = m.director.createActionDirector({
      sandbox: { getScope: () => live }, avHost: { av: { CombatAudioMixer: {} } }, getViewData: () => null,
      promptReaction: () => gate, battle: () => null,
    });
    const pRun = dir3.driveAttack((function* () { yield req1; return { ok: true }; })());
    await new Promise(r => setTimeout(r, 5));
    dir3.cancelAttack();
    const outC = await Promise.race([pRun, new Promise(r => setTimeout(() => r('pending'), 100))]);
    cases.push(ok('TRU-02e cancelAttack：不等待弹窗回调即返回 null', outC === null, j(outC)));
    releaseGate(null);
    let returned = false;
    const dirRetarget = m.director.createActionDirector({
      sandbox: { getScope: () => live }, avHost: { av: { CombatAudioMixer: {} } }, getViewData: () => null,
      promptRetarget: () => new Promise(() => {}), battle: () => null,
    });
    const retargetRun = dirRetarget.driveAttack((function* () {
      try { yield { type: 'retarget-request' }; return { ok: true }; }
      finally { returned = true; }
    })());
    dirRetarget.cancelAttack();
    const retargetOut = await Promise.race([retargetRun, new Promise(r => setTimeout(() => r('pending'), 100))]);
    cases.push(ok('TRU-02g 转火取消：生成器退出且驱动等待结清', retargetOut === null && returned, j({ retargetOut, returned })));
    const mainSrc = readFileSync(path.join(SRC, 'main.mjs'), 'utf8');
    cases.push(ok('TRU-02h 转火地图悬停与点击不重新校验施放费用',
      (mainSrc.match(/battle\.previewRetarget\(r\.skill, a, r\.casterId, r\.slotIndex\)/g) || []).length === 2 &&
      !mainSrc.includes('battle.previewAttack(r.skill, a)'), ''));
    cases.push(ok('TRU-02i 换场与销毁关闭转火浮层',
      (mainSrc.match(/cancelRetargetPrompt\(\);/g) || []).length === 2, ''));
    cases.push(ok('TRU-02j 公开结束回合入口拒绝忙状态与非玩家回合',
      /endTurn: \(\) => \{\s*if \(!battle \|\| busy \|\| !isHeroTurn\(\)\) return false;/.test(mainSrc), ''));
    // runAttackLive：规则接口未落地时给待对齐结果（不静默吞掉）
    const notReady = await m.director.createActionDirector({
      sandbox: { getScope: () => ({ isLive: true }) }, avHost: { av: { CombatAudioMixer: {} } }, getViewData: () => null,
      promptReaction: null, battle: () => ({ /* 无 beginAttack */ }),
    }).runAttackLive({ name: 'x' }, null);
    cases.push(ok('TRU-02f battle.beginAttack 未落地：报告待对齐而非崩溃', notReady && !notReady.ok && /beginAttack/.test(notReady.reason), j(notReady)));
    return cases;
  } },
  'TRU-03': { run() {
    const cases = [];
    const vendorSrc = readFileSync(path.join(SRC, 'vendor', 'rpg-ui', 'rpg-ui.mjs'), 'utf8');
    const line = re => { const mm = vendorSrc.match(re); return mm ? mm[0] : ''; };
    const sk = line(/const SKILL_TYPES = \[[^\n]*\];/);
    cases.push(ok('TRU-03a 下拉官方规范名（EFFECT_DEFINITIONS 同名）：伤害/治疗/回蓝/充能/加攻/加盾/加瞄/致盲/迟滞/虚弱/加速/减速/闪避/穿透',
      sk.includes("'[伤害]'") && sk.includes("'[伤害(火焰)]'") && sk.includes("'[伤害(枪击)]'") && sk.includes("'[治疗]'") &&
      sk.includes("'[回蓝]'") && sk.includes("'[充能]'") && sk.includes("'[加攻]'") && sk.includes("'[加盾]'") && sk.includes("'[加瞄]'") &&
      sk.includes("'[致盲]'") && sk.includes("'[迟滞]'") && sk.includes("'[虚弱]'") && sk.includes("'[加速]'") && sk.includes("'[减速]'") &&
      sk.includes("'[闪避]'") && sk.includes("'[穿透]'") && sk.includes("'[回避]'"), ''));
    cases.push(ok('TRU-03b 下拉无任何旧单/群形态（含群眩晕/群中毒/群盾/单盾/群驱散/群散射/群反击）',
      !/['\[](单体|群攻|单回|群回|单回蓝|群回蓝|单增|群增|单防|群防|单盾|群盾|单瞄|群瞄|单降|群降|单盲|群盲|单滞|群滞|单弱|群弱|单速|群速|单缓|群缓|单避|群避|群穿透|群眩晕|群散射|群中毒|群燃烧|群麻痹|群反击|群驱散)['\]]/.test(sk), ''));
    cases.push(ok('TRU-03c 回避（一次性）与闪避（持续）两项独立', sk.includes("'[回避]'") && sk.includes("'[闪避]'"), ''));
    cases.push(ok('TRU-03d 攻击技能判定/胶囊配色/悬浮说明识别规范伤害标签',
      /function isAttackSkill\(skill\)\s*\{\s*return skillSlots\(skill\)\.some\(slot => slot\.attack\);/.test(vendorSrc) &&
      /'伤害': '按空间范围命中目标/.test(vendorSrc), ''));
    cases.push(ok('TRU-03e 下拉当前值经 normalizeEffectTag 规范化（旧标签不再作为当前值保留）', /curVal = \(curVal && normalizeEffectTag\)/.test(vendorSrc), ''));
    return cases;
  } },
  'TRU-05': { async run({ modules: m }) {
    const cases = [];
    // 连续两发反应弹窗：上一发 finish 的 180ms 淡出计时器不得误删下一发弹窗（主代理回归点）
    const stubDoc = () => {
      const mk = () => ({ style: {}, className: '', children: [], parentNode: null,
        addEventListener(t, fn) { this['on' + t] = fn; }, textContent: '', innerHTML: '',
        appendChild(c) { c.parentNode = this; this.children.push(c); },
        remove() { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); } this.parentNode = null; },
        querySelector() { return { addEventListener() {} }; }, getAttribute: () => '0' });
      return { body: mk(), createElement: mk };
    };
    const prevDoc = globalThis.document;
    globalThis.document = stubDoc();
    try {
      const rp = m.reactionPrompt.createReactionPrompt({});
      const skillA = { name: '折影步' };
      const req = i => ({ type: 'reaction', responderId: 'h:埃利奥特', casterId: 'e:斥候', skill: { name: '爪击' }, candidates: [{ skill: skillA, usesLeft: 1 }], slotIndex: 0, segmentIndex: i, shotIndex: i, totalShots: 3 });
      const p1 = rp.prompt(req(0));
      const overlay1 = globalThis.document.body.children[0];
      // 上一发选择候选（finish → 180ms 淡出计时器启动），期间立即弹下一发
      overlay1['onclick']({ target: { closest: sel => sel === '[data-ri]' ? { getAttribute: () => '0' } : null } });
      const choice1 = await p1;
      const p2 = rp.prompt(req(1));
      const overlay2 = globalThis.document.body.children.find(el => el !== overlay1);
      await new Promise(r => setTimeout(r, 240));   // 跨过旧 timer 窗口
      cases.push(ok('TRU-05a 连续两发：第一发 choice 正确回传', choice1 && choice1.responderId === 'h:埃利奥特' && choice1.skill === skillA, j(choice1)));
      cases.push(ok('TRU-05b 连续两发：旧淡出计时器不误删第二发弹窗（仍打开）', overlay2 && overlay2.parentNode === globalThis.document.body && rp.isOpen(), 'overlay2=' + !!overlay2 + ' isOpen=' + rp.isOpen()));
      rp.cancel();
      cases.push(ok('TRU-05c cancel：第二发立即以 null 结算并清理', await p2 === null && !rp.isOpen(), ''));
    } finally { globalThis.document = prevDoc; }
    return cases;
  } },
  'TRU-06': { run({ modules: m }) {
    const cases = [];
    // 演出输入仅传显式标签，旧规则子型不参与选择。
    const inp = m.fxRegistry.actionInput({ ok: true, casterId: 'c', skill: { type: '[群攻(火焰)]', type2: '[单回]', fxTag: '冰霜', power: 30, power2: 10 }, query: { shape: { type: '爆炸' }, slotTargets: [] }, hits: [] });
    cases.push(ok('TRU-06a actionInput 仅传显式特效标签', inp.fxTag === '冰霜' && !Object.hasOwn(inp, 'slotTags'), j(inp)));
    // 编辑器写入的 skill.slotTargets 由 skillSlots 正式读取（联动）
    const slots = m.effectDefs.skillSlots({ name: 'x', type: '[治疗]', power: 30, slotTargets: ['self'] });
    cases.push(ok('TRU-06b skillSlots 读 slotTargets[0]="self" → target self', slots.length === 1 && slots[0].target === 'self', j(slots)));
    const slots2 = m.effectDefs.skillSlots({ name: 'x', type: '[伤害]', power: 20, slotTargets: ['default'] });
    cases.push(ok('TRU-06c slotTargets="default" → 按范围友敌方', slots2.length === 1 && slots2[0].target === 'default', j(slots2)));
    return cases;
  } },
  'TRU-04': { run({ modules: m }) {
    const cases = [];
    const block = m.parser.parseYamlText(m.fixture.DEMO_YAML);
    const ell = block.heroes.find(h => h.name === '埃利奥特');
    const zheYing = ell.skills.find(s => s.name === '折影步');
    const heal = ell.skills.find(s => s.name === '迅捷愈合法');
    cases.push(ok('TRU-04a demo 反应技能（折影步）可解析：isReaction + 反应类型', zheYing && zheYing.isReaction === true && zheYing.reactionTarget === '近战', j(zheYing && { isReaction: zheYing.isReaction, rt: zheYing.reactionTarget })));
    cases.push(ok('TRU-04b demo 治疗技能解析为规范回复槽且有明确特效', heal && heal.type === '[回复]' && heal.isOthers === true && heal.fxTag === '单体回复', j(heal && { type: heal.type, others: heal.isOthers, fxTag: heal.fxTag })));
    cases.push(ok('TRU-04c 反应候选技能存在多个（弹窗选择有意义）', ell.skills.filter(s => s.isReaction).length >= 3, String(ell.skills.filter(s => s.isReaction).length)));
    return cases;
  } },
};

// ---------- 自跑 runner（node integration-test/fixtures/tactics/rules02-ui-node-cases.mjs） ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const modules = await loadModules();
  const fx01 = await loadFx01Groups();
  let failed = 0, total = 0;
  const runGroup = async (name, g) => {
    const out = await g.run({ modules });
    const cases = Array.isArray(out) ? out : (out && Array.isArray(out.cases) ? out.cases : []);
    for (const c of cases) {
      total++;
      if (!c.pass) failed++;
      console.log((c.pass ? 'PASS' : 'FAIL') + ' [' + name + '] ' + c.id + (c.pass ? '' : ' :: ' + c.detail));
    }
  };
  for (const [name, g] of Object.entries(groups)) await runGroup(name, g);
  // 规范前缀适配后的 FX01 演出注册表回归：只跑 TFX-01（分发/分级预算，fx-registry/fx-library 范围）；
  // TFX-02 是规则内核接线用例（battle.attack），其断言随规则代理施工中间态波动，由规则侧全量跑
  if (fx01['TFX-01']) await runGroup('TFX-01', fx01['TFX-01']);
  console.log((failed ? 'FAILED ' + failed : 'ALL GREEN') + ' · ' + total + ' cases');
  process.exit(failed ? 1 : 0);
}
