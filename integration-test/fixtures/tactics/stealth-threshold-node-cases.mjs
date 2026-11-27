// 隐匿阈值独立契约回归：真实 createBattle / 状态徽章 / renderStrip 模板。
// 本文件不修补业务、不模拟阈值规则；尚未落地的契约照常断言，异常记失败。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { statusBadges } from '../../../tactics/src/status-ui.mjs';

function unit(id, side, classType = null, spd = 100) {
  return { id, name: id, side, classType, controller: 'player',
    footprint: { width: 1, height: 1 }, attrTags: [], skills: [], items: [],
    ref: { hp: 5000, maxHp: 5000, mp: 100, maxMp: 100, tp: 0, maxTp: 100,
      atk: 20, def: 0, spd, evasion: 0, perception: 100, strength: 50,
      totalWeight: 40, shield: 0, moveDistance: 12 } };
}
function make() {
  const b = createBattle({
    units: [unit('h', 'hero', '隐匿者', 300), unit('a', 'hero', '隐匿者', 250), unit('e', 'enemy')],
    placementsById: { h: { col: 2, row: 4 }, a: { col: 3, row: 4 }, e: { col: 5, row: 4 } },
    scene: { sceneId: 'stealth-threshold', grid: { columns: 20, rows: 12, metersPerCell: 1 }, ground: {}, objects: [] },
    random: () => 0.5,
  });
  b.start();
  assert.equal(b.snapshot().currentId, 'h', '夹具必须由 h 先行动');
  assert.equal(main(b), 1, '夹具初始主点必须为 1');
  assert.equal(depth(b), 50, '真实职业初始化隐匿值为 50');
  return b;
}
const main = b => b.snapshot().resources.main;
const universal = b => b.snapshot().resources.universal;
const depth = (b, id = 'h') => Math.max(0, 100 - b.getEffectiveUnit(id).taunt);
const rushes = (b, id = 'h') => b.buffsOf(id).filter(x => x.isConcealAtk);
const target = (b, id) => ({ x: b.ctx.placementsById[id].col + 0.5, y: b.ctx.placementsById[id].row + 0.5, targetId: id });
let sequence = 0;
function castTaunt(b, value, id = 'h') {
  // 注入辅助额度，只隔离本用例的隐匿阈值，不花被测的万能奖励。
  b.battleState.combatState.clock.currentAction.resources.aux = 1;
  const sk = { name: '阈值临时嘲讽-' + (++sequence), type: '[嘲讽]', power: value, isOthers: true,
    turns: 20, slotTurns: 20, hit: 100, guaranteedHit: true, cost: 0,
    range: id === b.snapshot().currentId ? { type: '自身' } : { type: '单体', castRange: 10 } };
  const result = b.attack(sk, target(b, id), { policy: 'none' });
  assert.equal(result.ok, true, '真实临时嘲讽技能必须成功：' + (result.reason || ''));
  // 必须真实进入 effect-handlers 的 taunt 分支，避免未知标签产生空结算假绿。
  assert.ok(b.snapshot().events.length > 0, '真实战斗应留下领域事件');
  if (value !== 0 && depth(b, id) < 100 && !rushes(b, id).length) {
    assert.ok(b.buffsOf(id).some(x => x.type === 'taunt' && x.value === value), '临时 taunt 必须真实入状态');
  }
  return result;
}
function attack(b) {
  const result = b.attack({ name: '急袭消费试攻', type: '[伤害]', power: 0, hit: 100,
    guaranteedHit: true, damageType: '近战', cost: 0,
    range: { type: '单体', castRange: 10 } }, target(b, 'e'), { policy: 'none' });
  assert.equal(result.ok, true, result.reason || '攻击必须成功');
  const hits = (result.hits || []).flatMap(h => h.segments || [h]).filter(h => h.hit);
  assert.ok(hits.length, '必须存在真实命中，不能用空攻击验证消费');
  return hits;
}

// 仅提取并执行真实闭包函数；宿主只承载 innerHTML 与状态，不实现点数/渲染业务。
function stripHost() {
  const source = readFileSync(new URL('../../../tactics/src/ui-shell.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('  function renderStrip(cmd) {');
  const end = source.indexOf('  function previewMoveCost(', start);
  assert.ok(start >= 0 && end > start, '真实 renderStrip 提取锚点必须存在');
  const state = { pipKey: '', costFilter: null, moveCost: null };
  const els = { strip: { hidden: true, innerHTML: '' } };
  const render = new Function('els', 'state', 'ESC', 'previewMoveCost',
    source.slice(start, end) + '\nreturn renderStrip;')(els, state, String, () => {
      throw new Error('本夹具未请求移动预览');
    });
  return {
    render(b) {
      const snap = b.snapshot();
      render({ unit: b.ctx.units.find(u => u.id === snap.currentId), resources: snap.resources,
        serial: snap.actionSerial, terminal: snap.terminal, preparation: null });
      assert.equal(els.strip.hidden, false, '英雄资源条应可见');
      return els.strip.innerHTML;
    },
  };
}
function assertStrip(html, count, extra) {
  const button = html.match(/<button\b[^>]*data-cost-filter="main"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(button, '必须保留原有主按钮');
  assert.equal(button[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(), '主');
  const pips = [...html.matchAll(/<i\b[^>]*class="([^"]*\bt-pip-main\b[^"]*)"[^>]*>/g)];
  assert.equal(pips.length, 1, '主点格容量必须保持');
  assert.equal(pips.filter(p => /(?:^|\s)t-on(?:\s|$)/.test(p[1])).length, count, '亮起格数必须等于真实主点');
  assert.ok(html.includes('>万能 ' + extra + '</span>'), '万能文本必须等于实际余额');
}

export function runCases() {
  const cases = [];
  const check = (id, run) => {
    try { run(); cases.push({ id: 'STEALTH-THRESHOLD ' + id, family: 'stealth-threshold', pass: true, detail: '' }); }
    catch (error) { cases.push({ id: 'STEALTH-THRESHOLD ' + id, family: 'stealth-threshold', pass: false, detail: String(error.stack || error) }); }
  };
  for (const value of [79, 80, 99, 100]) {
    check('临时隐匿边界 ' + value, () => {
      const b = make();
      castTaunt(b, -(value - 50));
      const u = b.ctx.units.find(x => x.id === 'h');
      assert.equal(main(b), 1);
      assert.equal(universal(b), value >= 80 ? 1 : 0, '80 阈值必须增加当前万能点');
      assert.equal(depth(b), value === 100 ? 50 : value);
      assert.equal(u.ref.baseTauntBonus, -50, '临时隐匿不可固化为永久深度');
      assert.equal(u.ref.stealthCycleProcessed, value >= 80 && value < 100);
      assert.equal(rushes(b).length, value === 100 ? 1 : 0);
      if (value === 100) {
        assert.equal(rushes(b)[0].value, 50);
        assert.ok(!b.buffsOf('h').some(x => x.type === 'taunt' && x.value < 0), '破百清除负 taunt');
      }
    });
  }
  check('80 万能点 0→1，同循环重复检查不重复发放', () => {
    const b = make();
    castTaunt(b, -30);
    assert.equal(universal(b), 1);
    for (let i = 0; i < 3; i++) { castTaunt(b, 0); assert.equal(universal(b), 1); }
    castTaunt(b, -19);
    assert.equal(depth(b), 99);
    assert.equal(universal(b), 1, '同循环涨至99仍不重复');
  });
  check('跌回79解锁，重越80进入新循环', () => {
    const b = make();
    castTaunt(b, -30);
    castTaunt(b, 1);
    assert.equal(depth(b), 79);
    assert.equal(b.ctx.units.find(x => x.id === 'h').ref.stealthCycleProcessed, false);
    castTaunt(b, -1);
    assert.equal(depth(b), 80);
    assert.equal(universal(b), 2, '新循环应再授予一万能点');
    castTaunt(b, 0);
    assert.equal(universal(b), 2);
  });
  check('100 清全部负taunt、回50、保留无关buff并开启新循环', () => {
    const b = make();
    const ordinary = { type: 'atk', value: 7, duration: 20 };
    b.buffsOf('h').push(ordinary);
    castTaunt(b, -10);
    castTaunt(b, -40);
    assert.equal(depth(b), 50);
    assert.ok(!b.buffsOf('h').some(x => x.type === 'taunt' && x.value < 0));
    assert.ok(b.buffsOf('h').includes(ordinary));
    assert.equal(rushes(b).length, 1);
    assert.equal(universal(b), 1, '80与100一次跨越只领一次万能点');
    castTaunt(b, -30);
    assert.equal(depth(b), 80);
    assert.equal(universal(b), 2, '回50后可进入下一循环');
    assert.equal(rushes(b).length, 1);
  });
  check('100真实授予快照isConcealAtk，下一次攻击+50并消费', () => {
    const b = make();
    castTaunt(b, -50);
    const view = b.getEffectiveUnit('h');
    assert.equal(view.buffs.filter(x => x.isConcealAtk && x.type === 'atk' && x.value === 50).length, 1);
    const first = attack(b);
    assert.equal(rushes(b).length, 0);
    assert.ok(!b.getEffectiveUnit('h').buffs.some(x => x.isConcealAtk));
    const second = attack(b);
    assert.equal(first.length, second.length);
    first.forEach((hit, i) => assert.equal(hit.rawDmg, second[i].rawDmg + 50));
    assert.equal(rushes(b).length, 0);
  });
  check('攻击同技能触发100时，新授急袭留到下一次攻击', () => {
    const b = make();
    const mixed = b.attack({ name: '攻击后隐匿', type: '[伤害]', power: 0, type2: '[嘲讽]', power2: -50,
      slotTargets: ['default', 'self'], guaranteedHit: true, hit: 100, damageType: '近战', cost: 0,
      range: { type: '单体', castRange: 10 }, actionCost: { main: 0, aux: 0 } }, target(b, 'e'), { policy: 'none' });
    assert.equal(mixed.ok, true);
    assert.ok(mixed.hits.some(hit => hit.hit));
    assert.equal(depth(b), 50);
    assert.equal(rushes(b).length, 1, '本次刚授予不能在同技能末尾消费');
    attack(b);
    assert.equal(rushes(b).length, 0);
  });
  check('非当前隐匿者待领取万能点，不发给施术者且只领取一次', () => {
    const b = make();
    castTaunt(b, -30, 'a');
    assert.equal(depth(b, 'a'), 80);
    assert.equal(b.snapshot().currentId, 'h');
    assert.equal(universal(b), 0, '非当前单位奖励不得误发给施术者');
    castTaunt(b, 0, 'a');
    for (let i = 0; i < 12 && b.snapshot().currentId !== 'a'; i++) b.endAction();
    assert.equal(b.snapshot().currentId, 'a', '有限轮转内必须轮到待领取者');
    assert.equal(universal(b), 1, '自然行动交付一份万能奖励');
    castTaunt(b, 0, 'a');
    assert.equal(universal(b), 1, '领取后同循环不可重复授予');
    b.endAction();
    for (let i = 0; i < 12 && b.snapshot().currentId !== 'a'; i++) b.endAction();
    assert.equal(b.snapshot().currentId, 'a');
    assert.equal(universal(b), 0, '万能点不得下次自然行动重复领取');
  });
  check('statusBadges 只显示合并后的当前值和名称', () => {
    const b = make();
    castTaunt(b, -29);
    const badges = statusBadges(b.getEffectiveUnit('h')).filter(x => x.key === 'taunt');
    assert.deepEqual(badges.map(({ text, title }) => [text, title]), [['隐匿 79', '当前隐匿值 79']]);
    castTaunt(b, 30);
    assert.deepEqual(statusBadges(b.getEffectiveUnit('h')).filter(x => x.key === 'taunt').map(x => x.text), ['隐匿 49']);
  });
  check('急袭独立atk徽章+50·1次，不并入普通攻提升', () => {
    const b = make();
    castTaunt(b, -50);
    b.buffsOf('h').push({ type: 'atk', value: 7, duration: 3 });
    const badges = statusBadges(b.getEffectiveUnit('h'));
    const rush = badges.filter(x => x.text === '急袭+50·1次');
    assert.equal(rush.length, 1);
    assert.ok(badges.some(x => /^攻\+7(?:·|$)/.test(x.text)), '普通攻击加成独立显示');
    assert.ok(!badges.some(x => /^攻\+57(?:·|$)/.test(x.text)), '急袭不可合并进普通攻加成');
    assert.ok(!/回/.test(rush[0].text), '消耗型急袭应显示次数');
    attack(b);
    const after = statusBadges(b.getEffectiveUnit('h'));
    assert.ok(!after.some(x => /急袭/.test(x.text)));
    assert.ok(after.some(x => /^攻\+7(?:·|$)/.test(x.text)));
  });
  check('专用主点再用万能点，第三次攻击被禁止', () => {
    const b = make();
    castTaunt(b, -30);
    assert.equal(universal(b), 1);
    attack(b);
    assert.equal(main(b), 0);
    assert.equal(universal(b), 1);
    attack(b);
    assert.equal(universal(b), 0);
    assert.throws(() => attack(b), /主行动|行动点/);
  });
  check('真实renderStrip：主点只显示菱形，万能点奖励和消费同步', () => {
    const b = make(), host = stripHost();
    assertStrip(host.render(b), 1, 0);
    castTaunt(b, -30);
    assertStrip(host.render(b), 1, 1);
    assert.equal(b.sprint().ok, true);
    assertStrip(host.render(b), 0, 1);
    assert.equal(b.sprint().ok, true);
    assertStrip(host.render(b), 0, 0);
  });
  return { cases };
}

export const groups = { 'STEALTH-THRESHOLD': { run: runCases } };
