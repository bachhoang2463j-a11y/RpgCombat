# 战棋前端现状总览（独立文档）

> 本文档只描述战棋（tactics/）现状，**不与回合制前端混写**。回合制战斗前端（根 `index.html` / `regex-前端战斗v12_16.json`）的现状见根 [README.md](../../README.md)，两者是并行的独立产品线。

## 核心目的

为战棋子项目提供单一入口的现状描述：进度、运行方式、源码结构、已迁移/未迁移能力边界与交接文档索引，供新会话快速建立上下文，不复制各交接文档正文。

## 开发基线（2026-11-27）

[单文件 Demo](../../tactics/mvp-standalone.html) 默认使用三层礼拜堂和典型阵容：双方开局交战，高障碍挡弹，技能雾仍生效。**目标口径已更新**：初版不做随机地图，每主题提供恒定房间，只变拼接顺序与方向（见 [SPEC.md](SPEC.md) S01/S14）；当前实现仍是固定三层地图，主题房间库与拼接逻辑尚未开发。

**基本玩法状态：固定三层 Demo 战斗主线已完成，完整规格和正式酒馆产品尚未完成。**

- 已交付（`15daf9e`／`0fe3b32`）：直射跳过友军、玩家低墙 25% 掩护、背袭、双方借机、两种折影步；六职业空间被动与施法者驻足／法力回响／棱镜中继；先声明蓄力、本人确认继续投入、就绪后选点，释放不重复扣费。
- 阶段 3（`bd35ead`）：爆炸／穿透直线原始单段伤害 >100 拆低墙，该段先按旧地形结算；通用显式 2×2 精英／首领双跳（首跳扣辅、次跳免费）、落地破墙与推动；敌方无合适攻击时有效冲刺推进。
- 阶段 4（`cac160c`）：残血传令和最早命令、雾中最后见处、集火可执行时优先于嘲讽；发令连线／准心／眼睛；头像下 Charge 菱格、满充固定地面意向及实际施放重选，人数优先且大型单位不重复计数。
- 验证基线：源码累计 **52 阶段 1491 项通过**（唯一全量首跑在旧演出夹具倒地处中断，修订后定向复跑并续跑未执行组）；最终单文件 59 模块、44 项入包校验，阶段 4 产物 11/11、阶段 3 与职业产物专项及 IAB 三层礼拜堂定向流程通过。不是重新跑过一次无中断全量；阶段 4 未在外部 Chrome、雷电或真实酒馆运行。

### 当前未完成／待接入

1. **地图制作与拼接**：恒定房间库、连接口及拼接逻辑未开发；现有固定三层地图是权威 Demo，不等于已实现不同种子的房间拼接。
2. **正式酒馆接入**：独立 iframe／正则传输、真实变量输入、同 ID 续载和战后 MMS 单写者回执仍待正式环境验收；不改根回合制打包器。
3. **LLM 接入**：已有友方／敌方旁白开关、对话入口和预留数据，但未接真实生成接口。后续接旁白、角色发言与战后总结；LLM 不决定移动、命中、伤害或敌方选招，生产提示词先送用户审核。

以上不覆盖为“全部旧能力已迁移”；历史切片的证据与边界继续按下文和 LOG-INDEX 定位。

## 当前实现与历史里程碑

生产基线仍是回合制 `index.html`；战棋在 `tactics/` 独立演进，P01—P03 已验证，P00 有承载探针待正式传输补验，P04—P07 仅部分切片通过；**FX01（埃利奥特四招规则与演出切片）**已交付，不等于完整旧能力迁移。P07 本轮重新打开补齐底层规则：RULES02 源码全量536项、单文件专项与真实页面战斗/反应门禁均已通过（排障模式实测，含反应弹窗选择/扣费/侧闪），详见 [RULES02-MIGRATION.md](RULES02-MIGRATION.md)；旧 P08 的听力／探索感知不再实施；当前固定三层 Demo 已把初始位置公开与技能雾、攻击遮挡分开。

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

| 走位／职业批次 | 射界、掩护、背袭、借机、折影步、职业与无目标蓄力 | `15daf9e`／`0fe3b32` |
| 阶段 3 | 逐段拆低墙、通用双跳、AI 冲刺 | `bd35ead` |
| 阶段 4 | 残血传令、Charge 菱格、固定意向与施放重选 | `cac160c` |

## 现有典型对局与迁移边界

- 当前 Demo 读取 [典型对局-战棋版.yaml](典型对局-战棋版.yaml)，字段见 [TYPICAL-BATTLE-CONTRACT.md](TYPICAL-BATTLE-CONTRACT.md)，原实施计划已[归档](obsolete_documents/TYPICAL-BATTLE-BACKEND-PLAN.md)。已写入4英雄、6敌、2召唤词条、固定出生点、TP0、严格资源与固定种子。
- 新后端模块：`scenario-data`、`regions`、`perception`、`barriers`；生产中文对象解析、8范围、单避/回避归一、整技免伤池、累计盾、跳跃/飞行、冲锋、共享父道具、召唤/结界已接线。既有RULES02能力边界以本条及交接契约为新口径。
- 定向组 `typical-data/space/ai/battle/skills`，90个技能/用法条目均有专项调用；反应是生成器实际执行，不用存在性冒充生效。各轮源码／产物与实页证据按 LOG-INDEX 定位；不把定向调用或试局当作所有技能的完整对局验收。
- 默认 Demo 从同一份样本读取阵容、技能、资源与显式出生点，使用固定三层礼拜堂；工作台与历史测试保留各自夹具。正式酒馆发布链仍需独立验收。

## 运行方式

- **单文件版（推荐）**：双击 `tactics/mvp-standalone.html`，业务 JS/CSS 全内联；远程头像／媒体仍按现有来源加载。
- **多文件版**：双击 `tactics/启动Demo.bat` → <http://127.0.0.1:8126/tactics/index.html>。
- **重新打包**：`node tactics/tools/build-demo-html.cjs` → `tactics/mvp-standalone.html`。**源码改动后必须重跑打包并过产物断言＋真页战斗流程验证才算交付**（项目 AGENTS.md §七门禁）。

## 源码结构（tactics/src/）

- **规则层**：`parser`（YAML/标签解析）、`protocol`（显式字段契约）、`battle`（行动提交）、`damage`、`range`/`geometry`（八范围统一几何）、`clock`/`scheduler`（跑圈）、`movement`、`lifecycle`、`ai`、`roster`/`config-package`/`storage`、`sandbox`。
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
| [SPEC.md](SPEC.md) | 已确认的主题恒定房间拼接战棋规则 |
| [PLAN.md](PLAN.md) | 基础战斗完成状态、后续地图／酒馆／LLM 方向与交付门禁 |
| [RESOURCES.md](RESOURCES.md) | R01—R13 复用表（R08 特效宿主/R09 音频、R13 MMS 底图） |
| [P06-FX-HANDOFF.md](P06-FX-HANDOFF.md) | 特效层接口契约＋典型对局迁移分层 |
| [P07-FRONTEND-HANDOFF.md](P07-FRONTEND-HANDOFF.md) | P07 前端问题清单与验证债 |
| [P07-MIGRATION.md](P07-MIGRATION.md) | 旧能力迁移清单（已替换/未验证逐项） |
| [FX01-ELLIOTT.md](FX01-ELLIOTT.md) | 埃利奥特技能移植：分级/时间轴/素材映射、暂缓技能预定映射、新角色接入方法 |
| [DEMO.md](../../tactics/DEMO.md) | 玩法说明 |
