// 文件名前缀即用户确认的分池；按原目录逐字引用（包括空格），不裁剪。
export const BGM_TRACKS = [
  ['normal-skirmish-01', 'Warding Blades', '低烈度 - 战斗 节奏弦乐  - Stone Wave Cliffs - Warding Blades - Lorien Testard.mp3', 'chant'],
  ['normal-skirmish-02', '凯尔特风低烈度', '低烈度 - 战斗 凯尔特风 .mp3', 'chant'],
  ['normal-electro-03', 'Rain from the Ground', '低烈度 - 战斗 轻快电子 .mp3', 'instrumental'],
  ['normal-pressure-01', 'Beneath the Blue Tree', '中烈度 - 战斗 节奏吟唱 - Spring Meadows - Beneath the Blue Tree - Lorien Testard _ Alice Duport-Percier.mp3', 'vocal'],
  ['normal-pressure-02', 'Taking Down the Paintress', '中烈度 - 战斗 节奏鼓点.mp3', 'vocal'],
  ['medium-advance-03', 'Get Up! For Lumière!', '中烈度 - 战斗 振作反击 .mp3', 'chant'],
  ['normal-crisis-01', '维尔蒙德危险战斗', '高烈度 - 战斗 史诗吟唱 .mp3', 'chant'],
  ['normal-crisis-02', 'Dualliste', '高烈度 - 战斗 强敌出现.mp3', 'vocal'],
  ['high-witch-03', '魔女と呼ばれる者', '高烈度 - 战斗 BOSS压迫.mp3', 'vocal'],
  ['normal-comeback-01', 'For Those Who Come After', '反击 - For Those Who Come After.mp3', 'vocal'],
  ['normal-comeback-02', 'Idéal Mental', '反击 -  战斗 对抗心魔绝地反击.mp3', 'instrumental'],
].map(([id, title, file, vocal]) => ({ id, title, path: 'BGM_33/' + file, vocal }));

export const BGM_POOLS = {
  low: ['normal-skirmish-01', 'normal-skirmish-02', 'normal-electro-03'],
  medium: ['normal-pressure-01', 'normal-pressure-02', 'medium-advance-03'],
  high: ['normal-crisis-01', 'normal-crisis-02', 'high-witch-03'],
};

export const COMEBACK_POOL = ['normal-comeback-01', 'normal-comeback-02'];
