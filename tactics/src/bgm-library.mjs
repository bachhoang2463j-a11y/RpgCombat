const toTracks = (dir, rows) => rows.map(([id, title, file, vocal, cueIn]) => ({
  id, title, path: `${dir}/${file}`, vocal, cueIn,
}));

const OCTOPATH_TRACKS = toTracks('BGM_OCTOPATH', [
  ['ot1-for-revenge', 'For Revenge · 复仇之念', 'bgm_ot1_for_revenge.mp3', 'instrumental', 0.55],
  ['ot1-for-truth', 'For Truth · 追索真相', 'bgm_ot1_for_truth.mp3', 'instrumental', 0.30],
  ['ot2-night-awake', '夜の目覚め · 暗夜苏醒', 'bgm_ot2_night_awake.mp3', 'instrumental', 1.50],
  ['ot1-decisive-2', 'ボスバトル2 · Decisive Battle II', 'bgm_ot1_decisive_2.mp3', 'instrumental', 0.35],
  ['ot2-clash-2', '決戦2 · Critical Clash II', 'bgm_ot2_clash_2.mp3', 'instrumental', 0.50],
  ['ot2-fierce', '激戦 · Fierce Confrontation', 'bgm_ot2_fierce.mp3', 'instrumental', 0.45],
  ['ot1-reason', '理を司る者 · They Who Govern Reason', 'bgm_ot1_reason.mp3', 'chant', 0.40],
  ['ot1-dark-god', '魔神の血を継ぐ者 · Daughter of the Dark God', 'bgm_ot1_dark_god.mp3', 'chant', 1.30],
  ['ot2-deny-dawn', '明日を望まぬ者 · Those Who Deny the Dawn', 'bgm_ot2_deny_dawn.mp3', 'chant', 4.85],
  ['ot2-for-dawn', 'それぞれの未来のために · For the Dawn', 'bgm_ot2_for_dawn.mp3', 'instrumental', 5.65],
  ['ot1-journey-end', "旅路の果てに立ちはだかる者 · Battle at Journey's End", 'bgm_ot1_journey_end.mp3', 'chant', 0.40],
]);

// 保留原版 33 号远征队混搭曲库（文件名前缀即分池；按原目录逐字引用）
const E33_TRACKS = toTracks('BGM_33', [
  ['normal-skirmish-01', 'Warding Blades', '低烈度 - 战斗 节奏弦乐  - Stone Wave Cliffs - Warding Blades - Lorien Testard.mp3', 'chant', 0.70],
  ['normal-skirmish-02', '凯尔特风低烈度', '低烈度 - 战斗 凯尔特风 .mp3', 'chant', 0.90],
  ['normal-electro-03', 'Rain from the Ground', '低烈度 - 战斗 轻快电子 .mp3', 'instrumental', 0.50],
  ['normal-pressure-01', 'Beneath the Blue Tree', '中烈度 - 战斗 节奏吟唱 - Spring Meadows - Beneath the Blue Tree - Lorien Testard _ Alice Duport-Percier.mp3', 'vocal', 1.45],
  ['normal-pressure-02', 'Taking Down the Paintress', '中烈度 - 战斗 节奏鼓点.mp3', 'vocal', 0.40],
  ['medium-advance-03', 'Get Up! For Lumière!', '中烈度 - 战斗 振作反击 .mp3', 'chant', 36.45],
  ['normal-crisis-01', '维尔蒙德危险战斗', '高烈度 - 战斗 史诗吟唱 .mp3', 'chant', 0.65],
  ['normal-crisis-02', 'Dualliste', '高烈度 - 战斗 强敌出现.mp3', 'vocal', 1.35],
  ['high-witch-03', '魔女と呼ばれる者', '高烈度 - 战斗 BOSS压迫.mp3', 'vocal', 0.40],
  ['normal-comeback-01', 'For Those Who Come After', '反击 - For Those Who Come After.mp3', 'vocal', 2.15],
  ['normal-comeback-02', 'Idéal Mental', '反击 -  战斗 对抗心魔绝地反击.mp3', 'instrumental', 1.80],
]);

export const DEFAULT_BGM_THEME = 'octopath';

export const BGM_THEMES = {
  octopath: {
    id: 'octopath',
    label: '八方旅人',
    tracks: OCTOPATH_TRACKS,
    pools: {
      low: ['ot1-for-revenge', 'ot1-for-truth', 'ot2-night-awake'],
      medium: ['ot1-decisive-2', 'ot2-clash-2', 'ot2-fierce'],
      high: ['ot1-reason', 'ot1-dark-god', 'ot2-deny-dawn'],
    },
    comeback: ['ot2-for-dawn', 'ot1-journey-end'],
  },
  e33: {
    id: 'e33',
    label: '33号混搭',
    tracks: E33_TRACKS,
    pools: {
      low: ['normal-skirmish-01', 'normal-skirmish-02', 'normal-electro-03'],
      medium: ['normal-pressure-01', 'normal-pressure-02', 'medium-advance-03'],
      high: ['normal-crisis-01', 'normal-crisis-02', 'high-witch-03'],
    },
    comeback: ['normal-comeback-01', 'normal-comeback-02'],
  },
};

export const BGM_TRACKS = BGM_THEMES.octopath.tracks;
export const BGM_POOLS = BGM_THEMES.octopath.pools;
export const COMEBACK_POOL = BGM_THEMES.octopath.comeback;
export const ALL_BGM_TRACKS = [...OCTOPATH_TRACKS, ...E33_TRACKS];
