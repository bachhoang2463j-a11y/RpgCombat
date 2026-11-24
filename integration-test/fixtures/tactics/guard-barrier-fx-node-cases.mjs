// 舍身格挡 / 【肃正】结界 前端演出：真实函数 + 最小桩；舍身落点与结界数据取真实规则模块输出，不复制被测逻辑。
import { readFileSync } from 'node:fs';
import { parseYamlText } from '../../../tactics/src/parser.mjs';
import { createScenarioData } from '../../../tactics/src/scenario-data.mjs';
import { compileScene } from '../../../tactics/src/scene.mjs';
import { unitCenter } from '../../../tactics/src/geometry.mjs';
import { previewGuard } from '../../../tactics/src/guard.mjs';
import { previewBarrier, damageBarrier, barrierContact } from '../../../tactics/src/barriers.mjs';
import { playGuardDash, playGuardBlock, mountBarrierDome, playBarrierHit, barrierTheme, blockContact, GUARD_AUDIO_KEYS, BARRIER_AUDIO_KEYS } from '../../../tactics/src/guard-barrier-fx.mjs';
import { VFX_CHAPEL_HALL, VFX_STAGE_PLACEMENTS } from '../../../tactics/src/vfx-template-host.mjs';

const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const src = p => readFileSync(new URL('../../../tactics/' + p, import.meta.url), 'utf8');

// 动画桩：记录 html 与音效/震屏，不解析 DOM
function stubEl(html = '') {
  const e = { html, style: {}, dataset: {}, children: [], removed: false, anims: [],
    animate(f, o) { e.anims.push({ f, o }); return {}; }, remove() { e.removed = true; },
    querySelector: () => stubEl(), appendChild() {} };
  e.firstChild = e;
  return e;
}
function stubFx() {
  const log = { top: [], sfx: [], shake: [] };
  let uid = 0;
  return { log, uid: () => ++uid, top: (html, ms) => { log.top.push({ html, ms }); return stubEl(html); }, ground: html => stubEl(html),
    sfx: (k, v) => log.sfx.push([k, v]), shake: l => log.shake.push(l) };
}
function stubView() {
  const pos = [], facing = [];
  return { pos, facing, nodes: new Map(), setDisplayPos: (id, x, y) => pos.push([id, x, y]), setDisplayFacing: (id, d) => facing.push([id, d]) };
}
const tween = async (ms, fn) => { for (let i = 0; i <= 10; i++) fn(i / 10); return true; };

function stageCtx() {
  const sc = createScenarioData(parseYamlText(readFileSync(new URL('../../../doc/tactics/典型对局-战棋版.yaml', import.meta.url), 'utf8')));
  const units = sc.units.filter(u => VFX_STAGE_PLACEMENTS[u.id]);
  return { units, placementsById: structuredClone(VFX_STAGE_PLACEMENTS), footprintsById: Object.fromEntries(units.map(u => [u.id, u.footprint || { width: 1, height: 1 }])),
    compiled: compileScene(VFX_CHAPEL_HALL), barriers: [], runId: 'vfx' };
}

async function guardCases() {
  const out = [], ctx = stageCtx();
  const frank = ctx.units.find(u => u.id === 'h:弗兰克');
  const g = previewGuard(ctx, 'h:弗兰克', 'h:玛德琳', 'e:食尸鬼A', frank.ref.moveDistance / 2);
  out.push(ok('TGB-G 工作台弗兰克舍身：真实规则口径（移动 5 的一半 2.5m）可护玛德琳，落点在来源一侧相邻', g.ok && g.maxDistance === 2.5 && Math.hypot(g.contactPoint.x - g.protectedPosition.x, g.contactPoint.y - g.protectedPosition.y) <= 1.5
    && Math.hypot(g.contactPoint.x - g.origin.x, g.contactPoint.y - g.origin.y) < Math.hypot(g.protectedPosition.x - g.origin.x, g.protectedPosition.y - g.origin.y), g));
  const far = previewGuard(ctx, 'h:弗兰克', 'h:索恩', 'e:食尸鬼A', frank.ref.moveDistance / 2);
  out.push(ok('TGB-G 超出舍身保护距离的组合由规则拒绝（演示不伪造）', !far.ok && far.reason === '超过舍身保护距离', far));

  const fx = stubFx(), view = stubView();
  const guard = { ...g, segmentId: 's1', reason: 'guard' };
  const waits = [];
  const done = await playGuardDash({ fx, view, tween, wait: async ms => { waits.push(ms); return true; }, footprint: { width: 1, height: 1 } }, guard);
  const last = view.pos[view.pos.length - 1], first = view.pos[0];
  out.push(ok('TGB-G 冲刺：决意 335ms 后沿 path 从 startPosition 插值到 contactPoint（只动显示位置），终点精确停在落点',
    done === true && waits[0] === 335 && Math.abs(first[1] - g.startPosition.x) < 1e-6 && Math.abs(first[2] - g.startPosition.y) < 1e-6
    && last[1] === g.contactPoint.x && last[2] === g.contactPoint.y && view.pos.every(p => p[0] === 'h:弗兰克'), { first, last, waits }));
  out.push(ok('TGB-G 冲刺：面朝攻击来源、两段重甲步伐（决意轻/突进重）、到位挂守护虚线环', view.facing[0] && Math.abs(view.facing[0][1] - Math.atan2(g.origin.x - g.contactPoint.x, -(g.origin.y - g.contactPoint.y)) * 180 / Math.PI) < 1e-6
    && fx.log.sfx.map(s => s[0]).join() === 'sheshen_armor_step,sheshen_armor_step' && fx.log.sfx[0][1] < fx.log.sfx[1][1] && fx.log.top.some(t => /dashed/.test(t.html)), fx.log.sfx));

  const fx2 = stubFx(), view2 = stubView(), w2 = [];
  await playGuardDash({ fx: fx2, view: view2, tween, wait: async ms => { w2.push(ms); return true; } }, { ...guard, reason: 'summon-lethal-guard' });
  out.push(ok('TGB-G 召唤自动守护：无决意蓄势直接冲刺', w2.length === 0 && view2.pos.length > 0));

  const fx3 = stubFx(), view3 = stubView();
  playGuardBlock({ fx: fx3, view: view3, tween }, guard);
  const ang = Math.atan2(g.origin.y - g.contactPoint.y, g.origin.x - g.contactPoint.x) * 180 / Math.PI + 90;
  const shield = fx3.log.top.find(t => /gb-shd-/.test(t.html));
  const rot = +((shield && shield.html.match(/rotate\((-?[\d.]+)deg\)/)) || [])[1];
  out.push(ok('TGB-G 格挡：盾弧凸面朝攻击来源、parry_perfect + heavy 震屏 + 「舍身格挡」飘字', shield && Math.abs(rot - ang) < 0.06
    && fx3.log.sfx.some(s => s[0] === 'parry_perfect' && s[1] === 0.98) && fx3.log.shake.includes('heavy') && fx3.log.top.some(t => /舍身格挡/.test(t.html)), { rot, ang }));
  out.push(ok('TGB-G 格挡后坐只在显示层且最终回到落点（不归位到出发点）', view3.pos.length > 0 && view3.pos.every(p => Math.hypot(p[1] - g.contactPoint.x, p[2] - g.contactPoint.y) <= 0.27)));
  const avSrc = src('src/vendor/rpg-av/rpg-av.mjs');
  out.push(ok('TGB-G 舍身/结界音效键均为原版已登记采样', [...GUARD_AUDIO_KEYS, ...BARRIER_AUDIO_KEYS].every(k => avSrc.includes("'" + k + "': `${ASSET_BASE}/")), [...GUARD_AUDIO_KEYS, ...BARRIER_AUDIO_KEYS]));
  return out;
}

function barrierCases() {
  const out = [], ctx = stageCtx();
  const ell = ctx.units.find(u => u.id === 'h:埃利奥特');
  const pre = previewBarrier(ctx, 'h:埃利奥特', ell.skills.find(s => s.name === '纳克提特障壁术'), null);
  const b = pre.barrier;
  const html = [];
  const layers = { ground: h => { html.push(h); return stubEl(h); }, top: h => { html.push(h); return stubEl(h); } };
  const rec = mountBarrierDome(layers, b, '纳克提特障壁术');
  const r = b.radius * 50, c = { x: b.center.x * 50, y: b.center.y * 50 };
  out.push(ok('TGB-B 穹顶按后端 center/radius 的固定世界圆（不估算）', html[0].includes('left:' + (c.x - r) + 'px;top:' + (c.y - r) + 'px;width:' + r * 2 + 'px') && /border-radius:50%/.test(html[0]), { center: b.center, radius: b.radius }));
  out.push(ok('TGB-B 颜色身份只读 visualIdentity：近战肃正=银白；法术=金；远程=蓝', b.visualIdentity === 'white' && html.join('').includes(barrierTheme({ visualIdentity: 'white' }).border)
    && barrierTheme({ visualIdentity: 'gold' }).border === 'rgba(251,191,36,0.65)' && barrierTheme({ visualIdentity: 'blue' }).border === 'rgba(34,211,238,0.65)'));
  out.push(ok('TGB-B 穹面蜂窝网格 + 流光描边 + 耐久徽标（原版 team-barrier 结构）', /<pattern id="br-hex-/.test(html[0]) && /data-br="flow"/.test(html[1]) && /data-barrier-dome="badge"/.test(html[1]) && rec.id === b.id));

  const origin = unitCenter(ctx.placementsById['e:深潜者A'], { width: 1, height: 1 });
  ctx.barriers.push(b);
  const dmg = damageBarrier(ctx, b.id, 90, { incomingType: '法术' });
  const contact = barrierContact(ctx, b, origin, unitCenter(ctx.placementsById['h:埃利奥特'], { width: 1, height: 1 }));
  out.push(ok('TGB-B 结界受击数据=真实规则：护甲先减、非克制类型不减半、接触点在边界上', dmg.integrityBefore === 200 && dmg.actualLoss === 50 && !dmg.broken
    && Math.abs(Math.hypot(contact.x - b.center.x, contact.y - b.center.y) - b.radius) < 1e-6, dmg));
  const fx = stubFx();
  const fills = [], values = [];
  rec.top.querySelector = sel => { const e = stubEl(); if (sel === '[data-br=fill]') fills.push(e); if (sel === '[data-br=value]') values.push(e); return e; };
  playBarrierHit(fx, rec, { ...dmg, contactPoint: contact, protectedTargetIds: ['h:埃利奥特'] });
  const ripple = fx.log.top.find(t => /border:3px solid/.test(t.html));
  out.push(ok('TGB-B 受击：接触点涟漪(单体120) + 蜂窝聚光 + 「-50」 + 徽标 150/200', ripple && ripple.html.includes('left:' + contact.x * 50 + 'px') && /width:120px/.test(ripple.html)
    && fx.log.top.some(t => />-50</.test(t.html)) && values.at(-1).textContent.startsWith('150 / 200') && fills.at(-1).style.width === '75%'));
  const fx2 = stubFx();
  playBarrierHit(fx2, rec, { ...dmg, contactPoint: contact, protectedTargetIds: ['a', 'b'] });
  out.push(ok('TGB-B 群攻共享一次受击：涟漪加大到 240', fx2.log.top.some(t => /border:3px solid/.test(t.html) && /width:240px/.test(t.html))));
  const bc = blockContact(b, origin);
  out.push(ok('TGB-B 减益隔绝落点：结界圆心朝来源方向的边界点', Math.abs(Math.hypot(bc.x - b.center.x, bc.y - b.center.y) - b.radius) < 1e-6 && bc.y < b.center.y));
  return out;
}

function wiringCases() {
  const out = [], d = src('src/action-director.mjs'), lib = src('src/fx-library.mjs'), host = src('src/vfx-template-host.mjs'), stage = src('vfx-stage.mjs');
  out.push(ok('TGB-W 舍身冲刺与攻击条目并行起跑；格挡在受击揭示拍点（守护已到位后）', /guardEvents\.forEach\(ev => revealGuard\(ev\)\);\s*\n\s*const ok = await entry\.play\(ctx\);/.test(d) && /if \(guard\) revealRule\(guard, 'guard'\);/.test(d)
    && /kind === 'guard'\) return deps\.presentGuard \? undefined : playGuardBlock/.test(d)));
  out.push(ok('TGB-W 舍身段不再叠旧「舍身承伤」反应条目；结界整体吸收的段不播目标受击', /if \(reaction && !reaction\.guard\) reactionRuns\.push/.test(d) && /else if \(!seg\.barrierHitId\) av\.playHitFeedback/.test(d)));
  out.push(ok('TGB-W 新建结界持有到条目爆发拍点；受击结界锁定显示耐久直到揭示；击破先破碎再移除', /if \(ev\.type === 'barrier-created'\) heldBarriers\.add/.test(d) && /if \(ev\.type === 'barrier-damaged'\) lockedBarriers\.set/.test(d)
    && /if \(value\.broken\) \{[^\n]*playBarrierShatter/.test(d) && (lib.match(/revealBarriers\(ctx\);/g) || []).length === 2));
  out.push(ok('TGB-W 旧临时结界圈（读 hp/sub 字段）已替换', !/b\.sub === '法术'/.test(d) && !/结界 ' \+ b\.hp/.test(d)));
  out.push(ok('TGB-W 工作台演示：敌攻直击/弗兰克舍身/结界释放/受击/击破/隔绝 六个按钮，数据走真实 previewGuard/previewBarrier/damageBarrier',
    ['enemy-hit', 'frank-guard', 'barrier-raise', 'barrier-hit', 'barrier-break', 'barrier-debuff'].every(k => stage.includes("key: '" + k + "'") && host.includes("'" + k + "': () =>"))
    && /previewGuard\(ruleCtx\(\), 'h:弗兰克'/.test(host) && /previewBarrier\(ctx, 'h:埃利奥特'/.test(host) && /damageBarrier\(ctx, b\.id, raw/.test(host)));
  return out;
}

export const groups = {
  'TGB-G': { run: async () => ({ cases: await guardCases() }) },
  'TGB-B': { run: () => ({ cases: barrierCases() }) },
  'TGB-W': { run: () => ({ cases: wiringCases() }) },
};
