# 战棋前端现状总览（独立文档）

> 本文档只描述战棋（tactics/）现状，**不与回合制前端混写**。回合制战斗前端（根 `index.html` / `regex-前端战斗v12_16.json`）的现状见根 [README.md](../../README.md)，两者是并行的独立产品线。

## 核心目的

为战棋子项目提供单一入口的现状描述：进度、运行方式、源码结构、已迁移/未迁移能力边界与交接文档索引，供新会话快速建立上下文，不复制各交接文档正文。

## 后续路线（2026-11-27 确认，尚未实施）

已转向单房间开局即战，按 [PLAN.md](PLAN.md) 四阶段施工；规则见 [SPEC.md](SPEC.md)。本轮只更新文档。当前 Demo 仍使用三层礼拜堂和现有感知逻辑；单房间、借机、双跳、可破坏低墙、残血集火及 Charge 意向均未因本次更新上线。

## 当前实现与历史里程碑

生产基线仍是回合制 `index.html`；战棋在 `tactics/` 独立演进，P01—P03 已验证，P00 有承载探针待正式传输补验，P04—P07 仅部分切片通过；**FX01（埃利奥特四招规则与演出切片）**已交付，不等于完整旧能力迁移。P07 本轮重新打开补齐底层规则：RULES02 源码全量536项、单文件专项与真实页面战斗/反应门禁均已通过（排障模式实测，含反应弹窗选择/扣费/侧闪），详见 [RULES02-MIGRATION.md](RULES02-MIGRATION.md)；旧 P08 的听力／探索感知不再实施；当前技能雾、攻击遮挡和既有接战逻辑由后续第 1 阶段拆分。

| 阶段 | 内容 | 业务 HASH |
| --- | --- | --- |
| P00 | Phaser3.90＋ROT2.2.1 隔离探针（历史证据，正式路线已改 R13 SVG 底图＋原生 Canvas） | `ca38c2b` |
| P01 | 协议/独立闪避/配置包/真代码测试底座（Node+IAB） | `d615d8c` |
| P02 | 地图/圆标头像/相机/原槽位 UI | `2024d5a` |
| P03 | 跑圈时钟/事件调度/隐藏轴过滤 | `a9097be` |
| MVP | 移动/三范围/独立命闪/追打 AI/胜负重开＋单文件自包含打包与交付门禁 | `de9e82a` / `0962462` / `9337ec5` |
| 视听切片 | 三层礼拜堂/点地即走/技能栏/合成 UI 音/步态；复用原版行动条与技能栏（extract-rpg-ui）＋八职业/敌方三档表现 | `0adb0a3` / `8b5f40f` |
| P04/P05 部分＋P06 | 跳跃/推动/背起规则接线；六范围查询与预览、真实/披露目标分离、FX 交接契约 | `fe52201` |
| P07 规则 | 行动提交/蓄力/反应闭环（毒针全链验证）＋修复收口 | `9cfb2db` / `871a444` |
| P07 前端 | 资源条/基础行动格/蓄力槽/禁用原因可读化/手风琴编辑器/跳跃推动动效；产物页面流程已过门禁 | `0ab4fe3` |
| FX01 | 通用 fxTag 演出注册表（L1—L4 预算）＋埃利奥特：萨维奇三连发/压缩爆燃/预备咏唱/折影步；多段攻击槽逐段结算、爆炸接触单位计入、回避真实错位 | 见 [LOG-INDEX](LOG-INDEX.md) |
| 原版演出移植（11-27，已确认） | 召雷术蓄力微推/落雷急拉远（顿帧 0）；伊西斯之拥/飞沙化甲/蝎眼钥匙/音叉三件/高阶召唤术/我方造雾术直调根 index 原版演出，召唤物凝形出场；深潜者造雾独立标签 `[特效:拉莱耶造雾术]`；敌方近战/远程/法术通用群攻用原版兜底演出 | `a2422fb` |

## 现有典型对局与迁移边界

- 当前 Demo 读取 [典型对局-战棋版.yaml](典型对局-战棋版.yaml)，字段见 [TYPICAL-BATTLE-CONTRACT.md](TYPICAL-BATTLE-CONTRACT.md)，原实施计划已[归档](obsolete_documents/TYPICAL-BATTLE-BACKEND-PLAN.md)。已写入4英雄、6敌、2召唤词条、固定出生点、TP0、严格资源与固定种子。
- 新后端模块：`scenario-data`、`regions`、`perception`、`barriers`；生产中文对象解析、8范围、单避/回避归一、整技免伤池、累计盾、跳跃/飞行、冲锋、共享父道具、召唤/结界已接线。既有RULES02能力边界以本条及交接契约为新口径。
- 定向组 `typical-data/space/ai/battle/skills`，90个技能/用法条目均有专项调用；反应是生成器实际执行，不用存在性冒充生效。正式主棋盘完整对局证据与源码全量/产物结果另见本轮报告。
- 当前 Demo 与工作台仍消费该三层样本。新路线第 1 阶段会迁移场景和出生点，不改变已有阵容、技能与资源基线；届时再更新工作台/测试引用并归档旧图。正式酒馆发布链仍需独立验收。

## 运行方式

- **单文件版（推荐）**：双击 `tactics/mvp-standalone.html`，JS/CSS 全内联、零网络请求。
- **多文件版**：双击 `tactics/启动Demo.bat` → <http://127.0.0.1:8126/tactics/index.html>。
- **重新打包**：`node tactics/tools/build-demo-html.cjs` → `tactics/mvp-standalone.html`。**源码改动后必须重跑打包并过产物断言＋真页战斗流程验证才算交付**（项目 AGENTS.md §七门禁）。

## 源码结构（tactics/src/）

- **规则层**：`parser`（YAML/标签解析）、`protocol`（显式字段契约）、`battle`（行动提交）、`damage`、`range`/`geometry`（六范围统一几何）、`clock`/`scheduler`（跑圈）、`movement`、`lifecycle`、`ai`、`roster`/`config-package`/`storage`、`sandbox`。
- **表现层**：`scene`/`chapel-scene`/`chapel-art`/`map-art`（底图）、`camera`、`unit-view`/`unit-style`（头像/光圈/步态）、`range-overlay`、`motion`（跳跃/推动/背起）、`vfx-host`（**世界坐标特效宿主**）、`arcane-vfx`（SVG 技能特效）、`action-director`（演出导演：前摇/命中拍点/逐段揭示/反应演出/波次音效）、`fx-registry`（fxTag/形状/槽分发 + L1—L4 预算）、`fx-library`（按特效命名的演出条目）、`ui-shell`/`ui-sfx`/`editor-panel`、`demo-fixture`（演示对局数据）。
- **vendor**：`rpg-ui`（原版 UI 提取，经 `tactics/tools/extract-rpg-ui.cjs`）、`rpg-av`（原版音视资产）、`js-yaml-4.1.0`、`mms-map-art`。

## 能力边界

- **已接入**：主辅资源、逐槽多段结算、再动、`delay` 准备和加速库存、周期伤害、空间反应与反击；典型对局另接入八范围、增益/回复、道具/弹药、召唤、结界与技能浓雾。当前舍身与召唤守护口径见 [GUARD-BARRIER-FRONTEND-HANDOFF.md](GUARD-BARRIER-FRONTEND-HANDOFF.md)。
- **分阶段迁移证据**：[P07-MIGRATION.md](P07-MIGRATION.md) 与 [RULES02-MIGRATION.md](RULES02-MIGRATION.md) 记录各自切片，不用早期「未迁移」清单覆盖后续典型对局和守护/结界的实现；更晚的变更按 [LOG-INDEX.md](LOG-INDEX.md) 定位。
- **表现层既有资产**：通用演出注册表、世界层 WebM、枪击/连发/火焰爆炸/回避错位以及上表所列原版演出。技能分级与移植方法见 [FX01-ELLIOTT.md](FX01-ELLIOTT.md)。

## 特效层契约（接技能移植前必读）

[P06-FX-HANDOFF.md](P06-FX-HANDOFF.md) 的硬约束：

1. 特效层只消费 `battle.attack()` 提交结果 payload（`casterId/skill/aim/facing/query/hits`），不自行查询命中、选目标、扣费或掷骰；命中判定不由动画 callback 驱动。
2. 全部 SVG/CSS/Canvas/WebAudio 技能效果挂载到**战棋世界坐标宿主**（`vfx-host`），屏幕坐标只在最后一层换算；特效播放中相机平移/缩放须保持一致（R08 `mkAnchor` 教训：禁止单次静态换算）。
3. 通用 `fxTag` 分发注册已建（FX01：`fx-registry.mjs`/`fx-library.mjs`），砷弹特判已删除；演出身份输入同时包含空间形状与效果槽标签。
4. 复用既有 `playAttackIdentityFx`、`playArcaneProjectile`、`CombatAudioMixer`、`playHitFeedback`、`createActionDirector` 波次聚合，不重复造枪械/斩击/爪击/箭矢/法术弹道资产。

## 角色技能移植入口

- **数据源**：根目录 [典型对局.txt](../../典型对局.txt)（`<Combat_block>` 完整对局；首位移植角色为**埃利奥特**，施法者，16 个技能＋7 项物品，含变体组嵌套）。
- **特效素材**：[webm_effects_index.md](../../webm_effects_index.md)（WebM 特效总索引）、[demo-skill-vfx-template.html](../../demo-skill-vfx-template.html)＋[技能SVG模板使用与快速移植.md](../../技能SVG模板使用与快速移植.md)（SVG 母版与移植契约）、`资源/` 目录（三档音效/前摇/群攻/变种/自爆等分类音效，含 Catbox 链接表）、`奇幻动效/`、`修仙特效/`。
- **演出分级**：L1—L4 定义见 `.agents/skills/svg-skill-vfx/SKILL.md`（L1 轻量 ≤0.6s / L2 中量 0.8—1.2s / L3 重量全屏 2—2.5s / L4 史诗全屏+暗场 3—3.5s，含三幕时间轴、七层叠加、音量分级）。
- **计划纪律**：移植前先出计划，逐技能标注归属分级与素材来源；规则层未迁移的槽位不得假装可执行（演出可先行铺路，但须与真实规则效果区分标注）。

## 文档分工

规划与契约正文不复制到本文档，按需查：

| 文档 | 职责 |
| --- | --- |
| [INDEX.md](INDEX.md) | 战棋文档总目录与状态纪律 |
| [SPEC.md](SPEC.md) | 已确认的单房间战棋规则 |
| [PLAN.md](PLAN.md) | 单房间路线的四阶段施工顺序与门禁 |
| [RESOURCES.md](RESOURCES.md) | R01—R13 复用表（R08 特效宿主/R09 音频、R13 MMS 底图） |
| [P06-FX-HANDOFF.md](P06-FX-HANDOFF.md) | 特效层接口契约＋典型对局迁移分层 |
| [P07-FRONTEND-HANDOFF.md](P07-FRONTEND-HANDOFF.md) | P07 前端问题清单与验证债 |
| [P07-MIGRATION.md](P07-MIGRATION.md) | 旧能力迁移清单（已替换/未验证逐项） |
| [FX01-ELLIOTT.md](FX01-ELLIOTT.md) | 埃利奥特技能移植：分级/时间轴/素材映射、暂缓技能预定映射、新角色接入方法 |
| [DEMO.md](../../tactics/DEMO.md) | 玩法说明 |
