import assert from 'node:assert/strict';
import {
  BGM_MOOD_TIERS,
  EXPEDITION33_TRACK_DB,
  evaluateBattleMood,
  createTrackUrlResolver,
  createBgmDirector,
} from '../../../tactics/src/bgm-director.mjs';

const mkUnit = (id, side, hp, maxHp, level = '普通') => ({ id, side, hp, maxHp, level });

async function run() {
  const cases = [];
  const check = async (id, fn) => {
    try { await fn(); cases.push({ id, pass: true }); }
    catch (error) { cases.push({ id, pass: false, detail: error.stack }); }
  };

  await check('BGM-01 7态战况情绪状态机与33号远征队曲库映射', async () => {
    assert.equal(BGM_MOOD_TIERS.length, 7);
    assert.equal(Object.keys(EXPEDITION33_TRACK_DB).length, 14);

    // 1. 战前序幕
    const calmSnap = { units: [mkUnit('h1', 'hero', 30, 30), mkUnit('h2', 'hero', 25, 25), mkUnit('e1', 'enemy', 20, 20)] };
    assert.equal(evaluateBattleMood(calmSnap, {}).moodId, 'TACTICAL_CALM');

    // 2. 常规交锋（发生伤害或已进入战斗）
    const skirmishSnap = { units: [mkUnit('h1', 'hero', 28, 30), mkUnit('h2', 'hero', 25, 25), mkUnit('e1', 'enemy', 12, 20)] };
    assert.equal(evaluateBattleMood(skirmishSnap, { combatStarted: true }).moodId, 'SKIRMISH');

    // 3. 强敌压境（首领在场或精英 >= 2）
    const bossSnap = { units: [mkUnit('h1', 'hero', 30, 30), mkUnit('h2', 'hero', 25, 25), mkUnit('e1', 'enemy', 80, 80, '首领')] };
    assert.equal(evaluateBattleMood(bossSnap, { combatStarted: true }).moodId, 'BOSS_PHASE1');
    const twoEliteSnap = { units: [mkUnit('h1', 'hero', 30, 30), mkUnit('e1', 'enemy', 30, 30, '精英'), mkUnit('e2', 'enemy', 30, 30, '精英')] };
    assert.equal(evaluateBattleMood(twoEliteSnap, {}).moodId, 'BOSS_PHASE1');

    // 4. 首领狂暴 / 二阶段（<=50% HP 或 variant-trigger rage/molt）
    const bossHalfSnap = { units: [mkUnit('h1', 'hero', 30, 30), mkUnit('e1', 'enemy', 40, 80, '首领')] };
    assert.equal(evaluateBattleMood(bossHalfSnap, { combatStarted: true }).moodId, 'CLIMAX_BOSS');
    assert.equal(evaluateBattleMood(bossSnap, { bossEnraged: true }).moodId, 'CLIMAX_BOSS');

    // 5. 绝境求生（我方 <30% HP 或 存活率 <= 50%）
    const crisisLowSnap = { units: [mkUnit('h1', 'hero', 8, 30), mkUnit('h2', 'hero', 25, 25), mkUnit('e1', 'enemy', 40, 80, '首领')] };
    assert.equal(evaluateBattleMood(crisisLowSnap, { bossEnraged: true }).moodId, 'CRISIS');
    const crisisDeadSnap = { units: [mkUnit('h1', 'hero', 0, 30), mkUnit('h2', 'hero', 25, 25), mkUnit('e1', 'enemy', 20, 20)] };
    assert.equal(evaluateBattleMood(crisisDeadSnap, {}).moodId, 'CRISIS');

    // 6 & 7. 胜利 / 战败最高优先级覆盖
    assert.equal(evaluateBattleMood({ ...crisisLowSnap, terminal: { type: 'victory' } }, {}).moodId, 'VICTORY');
    assert.equal(evaluateBattleMood({ ...calmSnap, terminal: { type: 'defeat' } }, {}).moodId, 'DEFEAT');
  });

  await check('BGM-02 升档0延迟响应与降档25s防抖迟滞锁', async () => {
    let clock = 1000;
    const director = createBgmDirector({ now: () => clock, holdMs: 25000, crossfadeMs: 0 });
    director.unlock();

    const calm = { units: [mkUnit('h1', 'hero', 30, 30), mkUnit('h2', 'hero', 25, 25), mkUnit('e1', 'enemy', 20, 20)] };
    const crisis = { units: [mkUnit('h1', 'hero', 6, 30), mkUnit('h2', 'hero', 25, 25), mkUnit('e1', 'enemy', 15, 20)] };
    const skirmish = { units: [mkUnit('h1', 'hero', 22, 30), mkUnit('h2', 'hero', 25, 25), mkUnit('e1', 'enemy', 15, 20)] };

    director.syncBattle(calm, {});
    assert.equal(director.getState().moodId, 'TACTICAL_CALM');

    // 升档即时跃迁至绝境
    const r1 = director.syncBattle(crisis, { combatStarted: true });
    assert.equal(r1.switched, true);
    assert.equal(director.getState().moodId, 'CRISIS');

    // 奶妈抬血至 SKIRMISH：未满 25s 必须锁住
    clock += 10000;
    assert.equal(director.syncBattle(skirmish, { combatStarted: true }).switched, false);
    assert.equal(director.getState().moodId, 'CRISIS');

    // 满 25s 后因之前已累计 1 次低档评估，本次(第2次)直接平稳降档
    clock += 16000;
    const r2 = director.syncBattle(skirmish, { combatStarted: true });
    assert.equal(r2.switched, true);
    assert.equal(director.getState().moodId, 'SKIRMISH');

    // 重新切入 BOSS_PHASE1 验证同动作内防穿透：同一 actionSerial 在 1.5s 内连续评估不刷满 streak
    const boss = { actionSerial: 10, units: [mkUnit('h1', 'hero', 30, 30), mkUnit('e1', 'enemy', 60, 60, '首领')] };
    assert.equal(director.syncBattle(boss, { combatStarted: true }).switched, true);
    clock += 26000;
    assert.equal(director.syncBattle({ ...skirmish, actionSerial: 11 }, { combatStarted: true }).switched, false);
    assert.equal(director.syncBattle({ ...skirmish, actionSerial: 11 }, { combatStarted: true }).switched, false);
    assert.equal(director.syncBattle({ ...skirmish, actionSerial: 12 }, { combatStarted: true }).switched, true);
    assert.equal(director.getState().moodId, 'SKIRMISH');

    // 终局胜利无视防抖锁立即接管
    const r3 = director.syncBattle({ ...skirmish, terminal: { type: 'victory' } }, { combatStarted: true });
    assert.equal(r3.switched, true);
    assert.equal(director.getState().moodId, 'VICTORY');
    director.destroy();
  });

  await check('BGM-03 手动锁频不受自动切歌干扰且切回自动立即对齐', async () => {
    const director = createBgmDirector({ crossfadeMs: 0 });
    director.selectTrack('BOSS_PHASE1', 1);
    assert.equal(director.getState().mode, 'manual');
    assert.equal(director.getState().track.title, 'Flying Waters - Goblu');

    const crisis = { units: [mkUnit('h1', 'hero', 5, 30), mkUnit('e1', 'enemy', 20, 20)] };
    const r = director.syncBattle(crisis, { combatStarted: true });
    assert.equal(r.switched, false);
    assert.equal(director.getState().moodId, 'BOSS_PHASE1');
    assert.equal(director.getState().recommendedMoodId, 'CRISIS');

    director.setMode('auto', crisis, { combatStarted: true });
    assert.equal(director.getState().mode, 'auto');
    assert.equal(director.getState().moodId, 'CRISIS');
    director.destroy();
  });

  await check('BGM-04 三级直链容错解析与跨窗AiRadio协议联动及Ducking闪避', async () => {
    // 1. 直链三级容错：前两个源报错，第三个 open.motues 成功并写入缓存
    let calls = 0;
    const resolver = createTrackUrlResolver({
      fetchImpl: async (url) => {
        calls++;
        if (url.includes('open.motues.top')) {
          return { ok: true, json: async () => ({ url: 'https://cdn.example.com/lumiere.mp3', size: 6400000, br: 320 }) };
        }
        throw new Error('upstream down');
      },
    });
    const url1 = await resolver.resolveTrackUrl({ id: '2692441576', title: 'Lumière' });
    assert.equal(url1, 'https://cdn.example.com/lumiere.mp3');
    assert.equal(calls, 3);
    const url2 = await resolver.resolveTrackUrl({ id: '2692441576', title: 'Lumière' });
    assert.equal(url2, url1);
    assert.equal(calls, 3); // 命中缓存不再发请求

    // 2. 跨窗 postMessage 握手联动与 Ducking
    const posted = [];
    const listeners = new Set();
    const fakeWin = {
      parent: {
        postMessage(msg) { posted.push(msg); },
      },
      addEventListener(type, fn) { if (type === 'message') listeners.add(fn); },
      removeEventListener(type, fn) { if (type === 'message') listeners.delete(fn); },
    };
    const director = createBgmDirector({ window: fakeWin, crossfadeMs: 0, volume: 0.5 });
    assert.equal(posted[0].type, 'TACTICS_BGM_PING');
    for (const fn of listeners) fn({ data: { type: 'TACTICS_BGM_PONG' } });
    assert.equal(director.getState().bridgeConnected, true);

    director.duck(0.3, 400);
    assert.equal(director.getState().duckFactor, 0.3);
    assert.ok(Math.abs(director.getState().effectiveVolume - 0.15) < 1e-6);
    assert.ok(posted.some(m => m.type === 'TACTICS_BGM_CMD' && m.action === 'duck' && m.ratio === 0.3));
    director.destroy();
  });

  await check('BGM-05 异步解链期间静音竞态锁与深度Ducking保护', async () => {
    const slowResolver = {
      resolveTrackUrl: () => new Promise(res => setTimeout(() => res('https://cdn.example.com/slow.mp3'), 40)),
      prewarmTier: () => {},
    };
    const director = createBgmDirector({ resolver: slowResolver, crossfadeMs: 0 });
    director.unlock();
    const p = director.playTrack({ id: '2692441576', title: 'Lumière', artist: 'Lorien Testard' });
    director.toggleMute(); // 在解链途中立即静音
    const ok = await p;
    assert.equal(ok, false);
    assert.equal(director.getState().muted, true);
    assert.equal(director.getState().playing, false);

    // 验证深度 Ducking 不会被后续较浅/较短的 Duck 抬高或提前解除
    director.duck(0.28, 2000);
    director.duck(0.45, 300);
    assert.equal(director.getState().duckFactor, 0.28);
    director.destroy();
  });

  return { cases };
}

export const groups = {
  BGM: { run },
};
