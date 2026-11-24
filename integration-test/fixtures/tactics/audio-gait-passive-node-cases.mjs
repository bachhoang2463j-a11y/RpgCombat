// 6 档真实步态音效 + 三块原版通用音频 + 毅力/致命回避被动特效接线专项回归
import { readFileSync } from 'node:fs';
import { CLASS_STYLE, TIER_STYLE, resolveUnitStyles } from '../../../tactics/src/unit-style.mjs';
import { EXTRA_AUDIO } from '../../../tactics/src/fx-library.mjs';
import { DEMO_AUDIO_KEYS, MOVE_AUDIO_KEYS } from '../../../tactics/src/av-host.mjs';
import { playPathMotion } from '../../../tactics/src/motion.mjs';
import { BARRIER_AUDIO_KEYS } from '../../../tactics/src/guard-barrier-fx.mjs';

const ok = (id, pass, detail = '') => ({ id, pass: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

function gaitCases() {
  const out = [];
  const moveKeys = Object.keys(EXTRA_AUDIO).filter(k => k.startsWith('move_'));
  out.push(ok('AGP-G 19个真实步态采样已在 EXTRA_AUDIO 与 MOVE_AUDIO_KEYS 登记', moveKeys.length === 19 && moveKeys.every(k => MOVE_AUDIO_KEYS.includes(k)), moveKeys.length));
  out.push(ok('AGP-G DEMO_AUDIO_KEYS 无重复键', new Set(DEMO_AUDIO_KEYS).size === DEMO_AUDIO_KEYS.length, DEMO_AUDIO_KEYS.length));

  const styles = resolveUnitStyles([
    { id: 'h1', side: 'hero', ref: { classType: '防守者', maxHp: 200, atk: 20, def: 15 } },
    { id: 'h2', side: 'hero', ref: { classType: '风行者', maxHp: 120, atk: 25, def: 5 } },
    { id: 'h3', side: 'hero', ref: { classType: '隐匿者', maxHp: 110, atk: 28, def: 5 } },
    { id: 'h4', side: 'hero', ref: { classType: '施法者', maxHp: 100, atk: 30, def: 5 } },
    { id: 'e1', side: 'enemy', ref: { maxHp: 800, atk: 40, def: 30, actCount: 4 } },
    { id: 'e2', side: 'enemy', ref: { maxHp: 260, atk: 35, def: 15, actCount: 2 } },
    { id: 'e3', side: 'enemy', ref: { maxHp: 90, atk: 12, def: 3, actCount: 1 } },
  ]);
  out.push(ok('AGP-G 我方8职业与敌方3分级步态池映射正确',
    styles.h1.stepSfx.pool[0].startsWith('move_hero_heavy_')
    && styles.h2.stepSfx.pool[0].startsWith('move_hero_light_') && styles.h2.gait.stride < styles.h3.gait.stride && styles.h2.stepSfx.vol > styles.h3.stepSfx.vol
    && styles.h4.glideSfx.key === 'move_enemy_elite_glide'
    && styles.e1.stepSfx.pool[0].startsWith('move_enemy_boss_')
    && styles.e2.glideSfx.key === 'move_enemy_elite_glide'
    && styles.e3.stepSfx.pool[0].startsWith('move_enemy_fodder_')));

  // 验证 motion.mjs 连续路程步距与悬浮单位静步
  const runMotion = gait => new Promise(resolve => {
    const steps = [];
    let raf = null;
    const scope = { isLive: true, settleOnDispose: () => () => {}, loop: fn => { raf = fn; } };
    const view = { lockMotion() {}, setFlag() {}, setDisplayPos() {}, setHop() {}, setDisplayFacing() {} };
    const p = playPathMotion(view, scope, {
      unitId: 'u', path: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }],
      footprint: { width: 1, height: 1 }, gait,
      onFeedback: kind => { if (kind === 'step') steps.push(kind); },
    });
    const t0 = performance.now();
    for (let dt = 0; dt <= 2500; dt += 40) { if (raf && raf(t0 + dt) === false) break; }
    p.then(() => resolve(steps.length));
  });

  return Promise.all([
    runMotion(CLASS_STYLE['风行者'].gait),
    runMotion(TIER_STYLE.legend.gait),
    runMotion(CLASS_STYLE['施法者'].gait),
    runMotion(null),
  ]).then(([swiftSteps, bossSteps, casterSteps, legacySteps]) => {
    out.push(ok('AGP-G 连续步距：风行者(0.72m)步频高于BOSS(1.35m)，悬浮施法者0步音，无stride保持每格1步向下兼容',
      swiftSteps > bossSteps && casterSteps === 0 && legacySteps >= 3, { swiftSteps, bossSteps, casterSteps, legacySteps }));
    return out;
  });
}

function integrationCases() {
  const out = [];
  const avSrc = readFileSync(new URL('../../../tactics/src/vendor/rpg-av/rpg-av.mjs', import.meta.url), 'utf8');
  const dirSrc = readFileSync(new URL('../../../tactics/src/action-director.mjs', import.meta.url), 'utf8');
  const batSrc = readFileSync(new URL('../../../tactics/src/battle.mjs', import.meta.url), 'utf8');
  const fxSrc = readFileSync(new URL('../../../tactics/src/fx-library.mjs', import.meta.url), 'utf8');
  const mainSrc = readFileSync(new URL('../../../tactics/src/main.mjs', import.meta.url), 'utf8');

  out.push(ok('AGP-I rpg-av 原样提取毅力/致命回避/抗性/反击/自爆/环境音且无window污染',
    ['playRescueGrit', 'playRescueAvoidFatal', 'playVariantResistFx', 'playCounterAttackL1', 'playSelfDestructWindup', 'playSelfDestructBurst', 'atmoAudio', 'setIdentitySfx', 'setVariantSfx', 'setStatusSfx', 'setSelfDestructSfx'].every(s => avSrc.includes(s))
    && !avSrc.includes('window.playVariantResistFx =')));

  out.push(ok('AGP-I 毅力与致命回避被动特效已接入 action-director 揭示拍点与 battle 自爆',
    /av\.playRescueAvoidFatal\(ent\)/.test(dirSrc) && /av\.playRescueGrit\(ent\)/.test(dirSrc)
    && /fatalResult: sdFatalResult/.test(batSrc)));

  out.push(ok('AGP-I 三块原版通用音频全部接线：抗性/禁疗/反击/自爆/结界/防御/辅助/兜底/治疗脉冲/设置开关',
    /kind === 'resistance'/.test(dirSrc) && /av\.playVariantResistFx/.test(dirSrc)
    && /kind === 'heal-suppressed'/.test(dirSrc) && /event: 'healSuppressed'/.test(dirSrc)
    && /ev\.type === 'reaction-damage'/.test(dirSrc) && /av\.playCounterAttackL1/.test(dirSrc)
    && /av\.playSelfDestructWindup/.test(dirSrc) && /av\.playSelfDestructBurst/.test(dirSrc)
    && /av\.playSound\('hpHeal'/.test(dirSrc)
    && BARRIER_AUDIO_KEYS.includes('shieldUp')
    && /taunt: \['taunt', 'taunt'\]/.test(fxSrc) && /effect\.field === 'taunt'/.test(fxSrc) && /cue = sk\.damageType === '法术' \? 'light_impact'/.test(fxSrc)
    && /avHost\.sfx\('defUp'/.test(mainSrc) && /data-audio-pref/.test(mainSrc)));
  return out;
}

export const groups = {
  'AGP-G': { run: () => gaitCases().then(cases => ({ cases })) },
  'AGP-I': { run: () => ({ cases: integrationCases() }) },
};
