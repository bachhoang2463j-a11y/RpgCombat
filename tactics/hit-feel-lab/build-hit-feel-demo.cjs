'use strict';
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const tacticsDir = path.resolve(__dirname, '..');
const workspaceDir = path.resolve(tacticsDir, '..');
const esbuild = createRequire(path.join(tacticsDir, 'p00-probe', 'node_modules', 'esbuild'))('esbuild');

function mustReplace(src, target, replacement, label) {
  if (!src.includes(target)) throw new Error('Patch target missing: ' + label);
  return src.replace(target, replacement);
}
const readLf = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const demoPatchPlugin = {
  name: 'hit-feel-demo-patch',
  setup(build) {
    // 0. battle.mjs: 增加 demoReviveAll 无闪烁静默复原所有靶子与主行动资源
    build.onLoad({ filter: /tactics[\\/]src[\\/]battle\.mjs$/ }, args => {
      let s = readLf(args.path);
      s = mustReplace(s,
        '  return { ctx, battleState: state, get state() { return state; },',
        `  function demoReviveAll() {
    for (const u of ctx.units || []) {
      u.ref.hp = u.ref.maxHp; u.ref.mp = u.ref.maxMp; u.ref.isAlive = true; u.ref.isSubdued = false;
      u.status = 'active';
    }
    if (state.combatState?.clock) state.combatState.clock.terminal = null;
    const r = currentResources();
    if (r) { r.main = 1; r.aux = 1; r.universal = Math.max(r.universal || 0, 0); if (r.move != null) r.move = 6; }
  }
  return { ctx, battleState: state, demoReviveAll, get state() { return state; },`,
        'battle:demoReviveAll'
      );
      return { contents: s, loader: 'js' };
    });

    // 1. main.mjs: 注入红毯靶场场景 sc-hit-range + 支持 opts.registry + 非A模式敌方死亡跳过缩灰
    build.onLoad({ filter: /tactics[\\/]src[\\/]main\.mjs$/ }, args => {
      let s = readLf(args.path);
      s = mustReplace(s,
        "'sc-chapel': CHAPEL_SCENE,",
        "'sc-chapel': CHAPEL_SCENE,\n  'sc-hit-range': { sceneId: 'sc-hit-range', style: 'chapel', grid: { columns: 18, rows: 12, metersPerCell: 1 }, ground: { material: 'stone' }, floor: [{ col: 1, row: 1, width: 16, height: 10 }], objects: [{ id: 'carpet-range', kind: 'carpet', bounds: { col: 3, row: 4, width: 12, height: 4 } }, { id: 'pillar-n', kind: 'pillar', bounds: { col: 1, row: 1, width: 1, height: 1 } }, { id: 'pillar-s', kind: 'pillar', bounds: { col: 1, row: 10, width: 1, height: 1 } }] },",
        'main:SCENE_LIBRARY'
      );
      s = mustReplace(s,
        'const director = createActionDirector({',
        'const director = createActionDirector({ registry: opts.registry,',
        'main:createActionDirector'
      );
      s = mustReplace(s,
        'function playDown(u) {',
        'function playDown(u) {\n    if (window.__HIT_DEMO_CFG__?.mode !== "A" && u.side !== "hero") return;',
        'main:playDown'
      );
      s = mustReplace(s,
        '  return {\n    loadYaml, boot, destroy, playProjectile, restart,',
        `  function demoReviveRange() {
    if (!battle || !currentViewData) return;
    battle.demoReviveAll?.();
    const view = sandbox.getUnitView();
    for (const vu of currentViewData.units || []) {
      const eff = battle.getEffectiveUnit(vu.id);
      const maxHp = eff?.maxHp ?? vu.ref.maxHp, maxMp = eff?.maxMp ?? vu.ref.maxMp;
      vu.ref.hp = maxHp; vu.ref.mp = maxMp;
      vu.bars = { ...vu.bars, hp: maxHp, maxHp, mp: maxMp, maxMp, shield: 0 };
      shown.set(vu.id, { hp: maxHp, maxHp, mp: maxMp, maxMp, tp: vu.bars.tp || 0, shield: 0 });
      view.setFlag(vu.id, 't-unit-shattered', false);
      view.setFlag(vu.id, 't-unit-falling', false);
      view.setFlag(vu.id, 't-unit-down', false);
      view.updateUnit(vu.id, { bars: { ...vu.bars } });
    }
    shell.renderHeroes(currentViewData.units, currentViewData.heroCardIds);
    shell.renderTurnOrder(currentViewData.units);
  }
  return {\n    loadYaml, boot, destroy, playProjectile, restart, demoReviveRange,`,
        'main:demoReviveRange'
      );
      return { contents: s, loader: 'js' };
    });

    // 2. cinematic.mjs: 解放出招大特写 ZOOM_AMP 与出招前/命中双时停 (ATTACK_STOP_MS / ATTACK_HIT_MS)
    build.onLoad({ filter: /tactics[\\/]src[\\/]cinematic\.mjs$/ }, args => {
      let s = readLf(args.path);
      s = mustReplace(s,
        'export const ATTACK_STOP_MS = 0, ATTACK_HIT_MS = 0, SUPPORT_STOP_MS = 0, SUPPORT_STOP_MS_L4 = 0;',
        `export const ATTACK_STOP_MS = 0, ATTACK_HIT_MS = 0, SUPPORT_STOP_MS = 0, SUPPORT_STOP_MS_L4 = 0;
function demoStopMs(kind) {
  const m = (typeof window !== 'undefined' && window.__HIT_DEMO_CFG__?.mode) || 'B';
  if (m === 'A') return 0;
  if (kind === 'hit') return m === 'C' ? 300 : 260;
  return m === 'C' ? 520 : 440;
}`,
        'cinematic:stopMs'
      );
      s = mustReplace(s,
        'export const ZOOM_AMP = 1 / 3;\nexport const zoomAt = (homeScale, s) => homeScale + (s - homeScale) * ZOOM_AMP;',
        `export const ZOOM_AMP = 1 / 3;
export const zoomAt = (homeScale, s) => {
  const m = (typeof window !== 'undefined' && window.__HIT_DEMO_CFG__?.mode) || 'B';
  const amp = m === 'A' ? 1 / 3 : m === 'C' ? 1.0 : 0.85;
  return homeScale + (s - homeScale) * amp;
};`,
        'cinematic:zoomAt'
      );
      s = mustReplace(s,
        'export const KILL_TIMING = { push: 345, pull: 435, cutin: 570, stop: 210, tail: 500 };',
        `const KILL_PRESETS = {
  A: { push: 345, pull: 435, cutin: 570, stop: 210, tail: 500 },
  B: { push: 320, pull: 340, cutin: 0, stop: 460, tail: 820 },
  C: { push: 360, pull: 380, cutin: 0, stop: 560, tail: 980 },
};
export const KILL_TIMING = new Proxy({}, {
  get(_, prop) {
    const m = (typeof window !== 'undefined' && window.__HIT_DEMO_CFG__?.mode) || 'B';
    return (KILL_PRESETS[m] || KILL_PRESETS.B)[prop];
  }
});`,
        'cinematic:KILL_TIMING'
      );
      s = mustReplace(s,
        'sandbox.cameraTo(sandbox.poseAt(from.x, from.y, home.scale * 1.24), KILL_TIMING.push);',
        `const m = (typeof window !== 'undefined' && window.__HIT_DEMO_CFG__?.mode) || 'B';
  const k = m === 'A' ? 1.24 : m === 'C' ? 2.2 : 1.9;
  sandbox.cameraTo(sandbox.poseAt(from.x, from.y, home.scale * k), KILL_TIMING.push);`,
        'cinematic:startKillCamera'
      );
      s = mustReplace(s,
        'const stopMs = attack ? ATTACK_STOP_MS : (epic ? SUPPORT_STOP_MS_L4 : SUPPORT_STOP_MS), hitMs = ATTACK_HIT_MS;',
        "const stopMs = attack ? demoStopMs('cast') : (epic ? demoStopMs('cast') : 0), hitMs = demoStopMs('hit');",
        'cinematic:dynamicStop'
      );
      s = mustReplace(s,
        'sb.cameraTo(P(cm.x + dx / L * b, cm.y + dy / L * b, home.scale * (strike ? 1.45 : K.push) * (epic ? 1.12 : 1)), Math.min(casterMs, 620));',
        "const dm = (typeof window !== 'undefined' && window.__HIT_DEMO_CFG__?.mode) || 'B';\n  const pushMs = dm === 'A' ? Math.min(casterMs, 620) : dm === 'C' ? 340 : 300;\n  sb.cameraTo(P(cm.x + dx / L * b, cm.y + dy / L * b, home.scale * (strike ? (dm === 'C' ? 2.1 : 1.85) : K.push) * (epic ? 1.15 : 1)), pushMs);",
        'cinematic:instantPush'
      );
      s = mustReplace(s,
        'if (style === \'lock\') env.after(casterMs, () => { if (!bursted) whip(I, epic ? 1.8 : 1.65, 240, env.chargeMs - casterMs); });',
        "if (style === 'lock') env.after(casterMs, () => { if (!bursted) whip(I, epic ? (dm === 'C' ? 2.35 : 2.1) : 1.7, dm === 'A' ? 240 : (dm === 'C' ? 360 : 320), env.chargeMs - casterMs); });",
        'cinematic:instantWhip'
      );
      s = mustReplace(s,
        "if (stopMs > 0) timeStop(sb, fx, stopMs, I, { tint: 'rgba(255,255,255,.95)', lines: 36 });",
        "if (stopMs > 0) timeStop(sb, fx, stopMs, I, { tint: 'rgba(255,255,255,.95)', lines: 36, filter: 'contrast(1.6) saturate(1.4) brightness(1.1)' });",
        'cinematic:strikeStopFilter'
      );
      return { contents: s, loader: 'js' };
    });

    // 3. action-director.mjs: 去掉横切头像 + 出招前时停 + 命中全球时停(timeStop+hold) + 解冻瞬间气化崩散
    build.onLoad({ filter: /tactics[\\/]src[\\/]action-director\.mjs$/ }, args => {
      let s = readLf(args.path);
      s = mustReplace(s,
        "import { startCine, planKillBeat, startKillCamera, killPortraitSweep, KILL_TIMING } from './cinematic.mjs';",
        "import { startCine, planKillBeat, startKillCamera, killPortraitSweep, timeStop, hitFlash, KILL_TIMING } from './cinematic.mjs';",
        'director:imports'
      );
      s = mustReplace(s,
        '    const portrait = kill.focus?.cutin ? portraitOf(result.casterId)?.img : null;',
        '    const portrait = null;',
        'director:noCutin'
      );
      s = mustReplace(s,
        '    if (!entry.finisherCue && finisherWindupMs) {\n      if (!(await wait(finisherWindupMs)) || !isCurrent()) return false;\n      releaseFinisher();\n    }',
        `    if (!entry.finisherCue && finisherWindupMs) {
      if (!(await wait(finisherWindupMs)) || !isCurrent()) return false;
      const dm = (typeof window !== 'undefined' && window.__HIT_DEMO_CFG__?.mode) || 'B';
      if (dm !== 'A' && killFrom) {
        const castStop = dm === 'C' ? 450 : 380;
        await hold(castStop, () => timeStop(sandbox, makeFx(audioContext.category), castStop, killFrom, { tint: 'rgba(254,243,199,.95)', lines: 32, filter: 'contrast(1.3) saturate(1.2) brightness(1.08)' }));
        if (!isCurrent()) return false;
      }
      releaseFinisher();
    }`,
        'director:castStop'
      );
      s = mustReplace(s,
        '      if (finisher) {\n        if (!killWaves.has(waveIndex)) {\n          killWaves.add(waveIndex);\n          // 同拍新挂的后仰／后坐也纳入定格；不拦飘字和重击声。\n          queueMicrotask(() => { if (isCurrent()) microStop(result.casterId, targetId, KILL_TIMING.stop); });\n        }\n        // 短技能也等倒下动作露出来，再交给旧击杀特写。\n        killTail = wait(KILL_TIMING.tail);\n      } else if (!healed && !seg.barrierHitId) microStop(result.casterId, targetId, hitStopMs(r));',
        `      const demoMode = (typeof window !== 'undefined' && window.__HIT_DEMO_CFG__?.mode) || 'A';
      if (!healed && !seg.barrierHitId && r.outcome === 'hit' && demoMode !== 'A') {
        const ca = centerOf(result.casterId), tb = centerOf(targetId);
        const dl = ca && tb ? Math.hypot(tb.x - ca.x, tb.y - ca.y) || 1 : 1;
        const dirX = ca && tb ? (tb.x - ca.x) / dl : 1, dirY = ca && tb ? (tb.y - ca.y) / dl : 0;
        window.__HIT_DEMO_FX__?.onImpactHit({ sandbox, fx: makeFx(audioContext.category) }, { casterId: result.casterId, targetId, dirX, dirY, isLethal: finisher });
      }
      if (finisher) {
        if (demoMode === 'A') {
          if (!killWaves.has(waveIndex)) {
            killWaves.add(waveIndex);
            queueMicrotask(() => { if (isCurrent()) microStop(result.casterId, targetId, KILL_TIMING.stop); });
          }
          killTail = wait(KILL_TIMING.tail);
        } else {
          // 命中瞬间全球真·时停（黑白/反色放射速度线 + 焦点白闪 + 冻结视口），解冻那一帧再爆裂气化！
          const ca = centerOf(result.casterId), tb = centerOf(targetId);
          const dl = ca && tb ? Math.hypot(tb.x - ca.x, tb.y - ca.y) || 1 : 1;
          const dirX = ca && tb ? (tb.x - ca.x) / dl : 1, dirY = ca && tb ? (tb.y - ca.y) / dl : 0;
          const stopMs = KILL_TIMING.stop;
          const stopFilter = demoMode === 'C' ? 'contrast(1.7) saturate(1.45) brightness(1.1)' : 'contrast(1.45) saturate(1.3) brightness(1.06)';
          if (!killWaves.has(waveIndex)) {
            killWaves.add(waveIndex);
            hold(stopMs, () => {
              if (!isCurrent() || !tb) return;
              timeStop(sandbox, makeFx(audioContext.category), stopMs, tb, { tint: 'rgba(255,255,255,.96)', lines: 36, filter: stopFilter });
              hitFlash(makeFx(audioContext.category), tb, { ms: stopMs + 140 });
            }).then(ok => {
              if (!ok || !isCurrent()) return;
              window.__HIT_DEMO_FX__?.playUnitShatter({ sandbox, fx: makeFx(audioContext.category) }, {
                targetId, dirX, dirY,
                onSound: () => scope().after(60, () => av.playSound('sd_shatter_blast', demoMode === 'C' ? 0.62 : 0.46, 0.92, { track: 'result', category: 'F', pan })),
              });
            });
          }
          killTail = wait(stopMs + KILL_TIMING.tail);
        }
      } else if (!healed && !seg.barrierHitId) {
        if (demoMode !== 'A' && r.outcome === 'hit') {
          const tb = centerOf(targetId);
          const hitStop = demoMode === 'C' ? 170 : 120;
          hold(hitStop, () => { if (tb) timeStop(sandbox, makeFx(audioContext.category), hitStop, tb, { tint: 'rgba(254,243,199,.92)', lines: 26, filter: 'contrast(1.2) saturate(1.1)' }); });
        } else microStop(result.casterId, targetId, hitStopMs(r));
      }`,
        'director:revealSegment'
      );
      s = mustReplace(s,
        '  function playExecution(result) {\n    const kills = result && result.ok ? executionKills(result) : [];\n    if (!kills.length) return Promise.resolve(true);',
        `  function playExecution(result) {
    const kills = result && result.ok ? executionKills(result) : [];
    if (!kills.length) return Promise.resolve(true);
    const demoCfg = typeof window !== 'undefined' ? window.__HIT_DEMO_CFG__ : null;
    if (demoCfg && demoCfg.mode !== 'A') {
      const b = battleOf();
      const hasElite = kills.some(id => { const u = b?.getEffectiveUnit(id); return u && (u.level === '精英' || u.level === '首领'); });
      if (!hasElite || !demoCfg.eliteExec) return Promise.resolve(true);
    }`,
        'director:playExecution'
      );
      return { contents: s, loader: 'js' };
    });

    // 4. screen-atmos.mjs: B/C 模式下增加中心低饱和动态暗场罩，拉高大招蓄势对比度
    build.onLoad({ filter: /tactics[\\/]src[\\/]screen-atmos\.mjs$/ }, args => {
      let s = readLf(args.path);
      s = mustReplace(s,
        'const bands = BANDS.map',
        `const demoMode = (typeof window !== 'undefined' && window.__HIT_DEMO_CFG__?.mode) || 'A';
  const centerVeil = demoMode !== 'A' ? '<div data-atmos-veil style="position:absolute;inset:0;backdrop-filter:saturate(0.45) brightness(' + (demoMode === 'C' ? '0.62' : '0.72') + ');background:radial-gradient(circle at 50% 50%,rgba(8,12,24,0.18) 22%,rgba(5,8,18,0.68) 92%);opacity:0;"></div>' : '';
  const bands = BANDS.map`,
        'atmos:centerVeil'
      );
      s = mustReplace(s,
        "bands + card + '</div>'",
        "centerVeil + bands + card + '</div>'",
        'atmos:mountVeil'
      );
      s = mustReplace(s,
        'els.forEach(el => anim(el,',
        "const veil$ = root.querySelector('[data-atmos-veil]'); if (veil$) anim(veil$, [{ opacity: 0 }, { opacity: 1 }], gather); els.forEach(el => anim(el,",
        'atmos:gatherVeil'
      );
      s = mustReplace(s,
        'if (ring) anim(ring, [{ opacity: 0.9 }, { opacity: 0 }], 520);',
        "const veil$ = root.querySelector('[data-atmos-veil]'); if (veil$) anim(veil$, [{ opacity: 1 }, { opacity: 0 }], 460); if (ring) anim(ring, [{ opacity: 0.9 }, { opacity: 0 }], 520);",
        'atmos:endVeil'
      );
      return { contents: s, loader: 'js' };
    });

    // 5. fx-library.mjs: 在圣光审判蓄势末段接入 B/C 模式的细金环极点内收
    build.onLoad({ filter: /tactics[\\/]src[\\/]fx-library\.mjs$/ }, args => {
      let s = readLf(args.path);
      s = mustReplace(s,
        "core.firstChild.animate([{ transform: 'scale(0.1)', opacity: 0 }, { transform: 'scale(1.5)', opacity: 1, offset: 0.86 }, { transform: 'scale(0.25)', opacity: 1 }], { duration: 1300, fill: 'forwards' });",
        "core.firstChild.animate([{ transform: 'scale(0.1)', opacity: 0 }, { transform: 'scale(1.5)', opacity: 1, offset: 0.86 }, { transform: 'scale(0.25)', opacity: 1 }], { duration: 1300, fill: 'forwards' });\n    window.__HIT_DEMO_FX__?.playUltConverge?.(fx, sky, { chargeMs: 1280, color: '#fde047' });",
        'fxlib:holy-converge'
      );
      return { contents: s, loader: 'js' };
    });
  },
};

(async () => {
  const entryPath = path.join(__dirname, 'hit-feel-demo-entry.mjs');
  const entryText = readFileSync(entryPath, 'utf8').replace(/\.\.\/tactics\/src\//g, './src/');
  const result = await esbuild.build({
    stdin: { contents: entryText, resolveDir: tacticsDir, sourcefile: 'hit-feel-demo-entry.mjs' },
    absWorkingDir: tacticsDir,
    plugins: [demoPatchPlugin],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    minifyWhitespace: false,
    minifySyntax: false,
    minifyIdentifiers: false,
    write: false,
  });

  const uiDir = path.join(tacticsDir, 'src', 'vendor', 'rpg-ui');
  const avDir = path.join(tacticsDir, 'src', 'vendor', 'rpg-av');
  const css = [
    readFileSync(path.join(uiDir, 'rpg-ui.css'), 'utf8'),
    readFileSync(path.join(tacticsDir, 'tactics.css'), 'utf8').replace(/^\uFEFF/, ''),
    readFileSync(path.join(avDir, 'rpg-av.css'), 'utf8'),
  ].join('\n');

  const bundle = result.outputFiles[0].text.split('</script').join('<\\/script');
  const html = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>战棋打击感三档对比靶场 Demo</title>',
    '<style>', css, '</style>',
    '</head>',
    '<body>',
    '<div id="tactics-app"></div>',
    '<script>', bundle, '</script>',
    '</body>',
    '</html>',
  ].join('\n');

  const out = path.join(tacticsDir, 'demo-hit-feel-compare.html');
  writeFileSync(out, html);
  console.log(JSON.stringify({ ok: true, out, bytes: Buffer.byteLength(html) }));
})().catch(e => { console.error(e); process.exit(1); });
