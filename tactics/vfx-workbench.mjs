// ==========================================
// 战棋新特效研发工作台（多文件开发入口 · 纯明文小文件）
// 本地静态服务打开 tactics/vfx-template.html 时加载本文件。
// ==========================================
import { installVfxTemplateStage } from './src/vfx-template-host.mjs';
import {
  PX, worldPx, bez, orbHtml, particles, glowDefs, runeHtml, ringHtml,
  flyOrb, trail, floatText, tint, worldDarken, playWebmFx as webm, spin, grow,
} from './src/vfx-primitives.mjs';

const yamlText = await (await fetch('../doc/tactics/' + encodeURIComponent('典型对局-战棋版.yaml'))).text();
const stage = installVfxTemplateStage(document.getElementById('tactics-app'), { yamlText });

// ===== 新特效编写区 BEGIN（定稿后直接原样拷入 tactics/src/fx-library.mjs） =====
// 可用工具：PX, worldPx, bez, orbHtml, particles, glowDefs, runeHtml, ringHtml, flyOrb, trail, floatText, tint, worldDarken, webm, spin, grow
const CUSTOM_FX_ENTRIES = [
  // {
  //   id: 'my-skill-fx', grade: 'L3', fxTags: ['新技能标签'],
  //   timeline: { chargeMs: 900, totalMs: 2200, fullscreen: true, darken: false },
  //   cues: [{ key: 'explosion_aoe_blast', vol: 0.65 }],
  //   prepareKeys() { return ['explosion_aoe_blast']; },
  //   async play(ctx) { ... }
  // }
];
// ===== 新特效编写区 END =====

// ===== 演示按钮 CARDS 区 BEGIN（仅驱动演练面板，不参与移植） =====
// casterId: 'h:埃利奥特' | 'h:弗兰克' | 'h:玛德琳' | 'h:索恩'
// targetIds: ['e:深潜者A', 'e:深潜者B', 'e:食尸鬼A', 'e:食尸鬼B', 'e:伊塔库亚的眷族', 'e:犹格索托斯之子']
const CARDS = [];
// ===== 演示按钮 CARDS 区 END =====

stage.boot({ customEntries: CUSTOM_FX_ENTRIES, cards: CARDS });
