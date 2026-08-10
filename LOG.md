# 📋 项目施工历史日志 (LOG.md)

本文件严格按照 `Coding rule.md` 要求记录 RPG 战斗前端项目的所有代码升级、架构变更与决策日志。

---

## [LOG-001] 2026-07-14 — 初始提交与 V3.7 基础引擎构建

- **变更行为**：导入初始战斗前端引擎代码，建立项目框架与初始文档。
- **涉及函数/模块**：`calculateQueue()` (时轴排队), `getEffectiveStats()` (属性面板), `applySingleTagEffect()` (标签结算), `parseYamlToGameData()` (数据解构)
- **决策原因**：确立纯本地数值与逻辑运算架构，实现基础时间轴排轴、七大职业被动、反应拦截机制与酒馆 `<Combat_block>` 数据解析规范。

---

## [LOG-002] 2026-07-14 — V3.8 升级：敌方智慧旁白系统

- **变更行为**：在战斗引擎中新增敌方智慧旁白与对话交互功能。
- **涉及函数/模块**：`parseAttributes()` (`[智慧]` 标记解析), `executeEnemyTurn()` (敌方首功旁白触发), `sendPlayerChat()` (玩家发言气泡回应), `callLLMAPI()` (提示词立场扩展)
- **决策原因**：提升角色扮演剧情张力。具体包含：
  1. 敌方属性栏新增 `[智慧]` 解析与编辑器切换勾选框。
  2. 敌方回合首个行动触发非阻塞式 LLM 自动旁白（带红调气泡 `.chat-bubble.enemy`）。
  3. 玩家发言时，存活且带有 `[智慧]` 的敌人参与回应。
  4. 系统提示词升级，支持我方/敌方立场区分。

---

## [LOG-003] 2026-08-07 — V3.85 爬塔引擎重构与项目“三件套”规范建立

- **变更行为**：
  1. 升级核心战斗引擎至 `战斗前端-爬塔 V3.85.html`（包含动画优化、黑体辐射/耀斑渲染特效与战斗体验细节提升）。
  2. 清理废弃的旧版文件（删除 `怪物抽卡 V3.1.html`、`怪物数值设计文档.md`、`战斗前端-爬塔 V3.7.html`、`战斗前端说明文档.md`）。
  3. 彻底重构项目文档体系，补齐并规范项目“三件套”：`README.md`（现状）、`SPEC.md`（目标）、`LOG.md`（历史）及 `LOG-INDEX.md`（索引）。
  4. 将原 `更新日志.md` 迁移合并至 `LOG.md` 并删除旧日志文件。
- **涉及函数/模块**：`CanvasFxEngine` / `playAOEEffect()` (高阶视觉与粒子特效层), 文档规范体系 (三件套收拢与日志迁移)
- **决策原因**：依照 `Coding rule.md` 二、三项关于项目三件套与日志溯源的约定，规范管理项目资产；清理不再需要的“怪物抽卡”逻辑，聚焦爬塔战斗引擎核心能力。

---

## [LOG-004] 2026-08-07 — V3.9 升级：职业被动系统（CLASS_PASSIVES）模块化重构

- **变更行为**：
  1. 重构核心战斗引擎文件为 `战斗前端-爬塔 V3.9.html`（由 V3.85 升级）。
  2. 设计并实现 `CLASS_PASSIVES` 模块化注册表架构，将 7 大职业（防守者、狂战士、风行者、隐匿者、施法者、圣职者/支援者、灾厄使/施毒者）的被动逻辑、开局初始化、属性修正、受击避死与过量治疗护盾从硬编码中彻底解耦。
  3. 通过实测验证防守者锁血、隐匿者回避与施法者护盾/多重施法等均正常运行。
  4. 同步更新规范文档 `SPEC.md` 与施工日志索引 `LOG-INDEX.md`。
- **涉及函数/模块**：`CLASS_PASSIVES` (职业被动注册表), `getEffectiveStats()` (属性管道), `applySingleTagEffect()` (增伤/避死/淬毒/转盾钩子), `executeSkillAction()` (多重施法), `parseYamlToGameData()` & `saveEditor()` (初始被动挂载)
- **决策原因**：迈出 Effect System 架构优化的关键一步，解决引擎代码中职业被动散落且难以拓展的瓶颈，使后续新增职业或自定义被动只需向注册表追加钩子即可完成。

---

## [LOG-005] 2026-08-07 — V3.9 视觉增强：先天被动 UI 徽章显示（狂战士/风行者）

- **变更行为**：
  1. 在 `updateBuffUI` 渲染层中补全狂战士【浴血奋战】与【死斗】的动态 UI 徽章。狂战士掉血时自动高亮显示 `🩸浴血+X%` 动态增伤，HP < 30% 时显示 `💀死斗(穿透)` 破甲标记。
  2. 补全风行者【风之轻语】根据 TP 动态增益的 `💨风行避+X` 避险徽章。
  3. 经过手操实测，确认狂战士与各职业被动图标显示及伤害加成均完美生效。
- **涉及函数/模块**：`updateBuffUI()` (卡牌正面 Buff/Debuff 及先天被动 UI 徽章渲染器)
- **决策原因**：提升职业被动的视觉透明度与交互反馈，解决先天被动仅在后台计算数值而无前台 Buff 标记的问题。

---

## [LOG-006] 2026-08-07 — V3.95 升级：轻量级事件总线（CombatEvents）架构重构 (Effect System Step 2)

- **变更行为**：
  1. 将核心引擎升级重命名为 `战斗前端-爬塔 V3.95.html`。
  2. 构建 `CombatEvents` 发布/订阅事件总线与 `EVENTS` 生命周期待性常量（包含 `TURN_START`, `TURN_END`, `BEFORE_DAMAGE`, `AFTER_DAMAGE`, `BEFORE_HEAL`, `AFTER_HEAL`, `ON_KILL`, `ON_FATAL_DAMAGE`, `ON_DODGE`, `BUFF_APPLIED`, `BUFF_EXPIRED`）。
  3. 将防守者【毅力】(priority=10)、隐匿者【回避】(priority=5)、灾厄使【淬毒】、圣职者【溢出转盾】、施法者【多重施法】等 5 大生命周期型职业被动由硬编码/直接函数调用全面解耦为事件订阅。
  4. 在 `nextTurn()`、`endTurn()`、`applySingleTagEffect()`、`executeSkillAction()` 等核心流程中植入事件发射点 (`emit`)，并经用户全面实测验证通过。
  5. 同步更新 `SPEC.md` 与 `LOG-INDEX.md`。
- **涉及函数/模块**：`CombatEvents` (事件总线), `EVENTS` (事件常量表), `nextTurn()` (TURN_START/BUFF_EXPIRED 事件点), `endTurn()` & `executeSkillAction()` (TURN_END 事件点), `applySingleTagEffect()` (ON_FATAL_DAMAGE/AFTER_DAMAGE/AFTER_HEAL 事件点)
- **决策原因**：完成 Effect System 架构优化的第二步，实现时机性逻辑与核心流程的完全事件解耦，使得后续任何自定义 Buff、触发器或新职业被动均可通过 `CombatEvents.on()` 监听触发，无需侵入核心战斗结算代码。

---

## [LOG-007] 2026-08-08 — V4.0 里程碑：Effect System 标签处理器（TAG_HANDLERS）与全架构重构完成 (Effect System Step 1 & 2 终集)

- **变更行为**：
  1. 将核心战斗引擎正式升级为 `战斗前端-爬塔 V4.html`。
  2. 实现 `TAG_HANDLERS` 策略模式处理器注册表与 `resolveTagHandler` 标签匹配器，将 `applySingleTagEffect()` 中散落的 13 个 else-if 标签分支（包含命中、闪避、防御、免伤、护盾、回避、反击、嘲讽、隐匿、攻击增益、回复、再动等）彻底解耦并模块化独立注册。
  3. 至此全面完成 Effect System 架构改造的前两步（第一步标签注册表解耦 + 第二步 CombatEvents 事件总线），消除巨型 if-else 与硬编码隐性耦合。
  4. 经手操实测全套战斗流程正常，零报错无异常。
  5. 同步更新 `SPEC.md`、`LOG.md` 与 `LOG-INDEX.md` 并提交推送到 GitHub。
- **涉及函数/模块**：`TAG_HANDLERS` (标签策略注册表), `resolveTagHandler()` (标签分发求解器), `applySingleTagEffect()` (400 行 else-if 简化为注册表查找)
- **决策原因**：完成 Effect System 架构改造里程碑，将引擎扩展性提升至全新高度。后续新增自定义标签只需通过 `registerTagHandler` 注册即可完成，无需修改核心分发函数。

---

## [LOG-008] 2026-08-08 — V4.0 看破系统补全：标签解析与技能编辑器下拉

- **变更行为**：
  1. `parseSkill()` 支持解析 `[看破:类型]` 标签，并将结果写入技能对象的 `kanpoTarget` 字段；`[看破]` 简写默认视为 `all`。
  2. `getKanpoTarget()` 优先读取 `skill.kanpoTarget`，并保留旧数据从 `type/type2/type3` 反查的兼容路径。
  3. 技能编辑器我方技能行新增“看破”下拉栏，选项为 `无看破 / 看破(全能) / 看破(近战) / 看破(远程) / 看破(法术)`，与反应下拉并列。
  4. `syncEditorDataToMemory()` 同步 `kanpoTarget`；`addHeroSkill()` 新建技能默认 `kanpoTarget: null`。
  5. 经手操实测，我方【净蚀反冲】可通过技能编辑器设为 `看破(法术)`，成功看破敌方【极地暴风雪】。
- **涉及函数/模块**：`parseSkill()` (标签解析), `getKanpoTarget()` (看破目标判定), `openEditor()` (技能编辑器 UI), `syncEditorDataToMemory()` (编辑器数据同步), `addHeroSkill()` (新建技能默认值)
- **决策原因**：修复 `[看破:X]` 标签未被解析导致技能对象缺少看破目标、技能编辑器无看破选项、看破弹窗不触发的问题。

---

## [LOG-009] 2026-08-08 — V4.1 升级：反应/看破弹窗可收起聊天

- **变更行为**：
  1. 反应弹窗与看破弹窗新增“收起”按钮，收起后玩家可继续使用聊天框对话。
  2. 页面底部出现“继续反应/继续看破”悬浮按钮，点击可重新打开原弹窗并继续选择技能或跳过。
  3. 适配移动端底部安全区，悬浮按钮限宽防溢出。
  4. 经手操测试，反应/看破窗口收放功能正常运行。
- **涉及函数/模块**：`promptReaction()` (反应选择弹窗), `promptKanpo()` (看破选择弹窗), `shelvePrompt()` (弹窗收起与悬浮按钮), `cleanupPrompt()` (弹窗清理)
- **决策原因**：在等待玩家选择反应/看破时战斗处于暂停状态，此改动让玩家可以先与角色对话，再随时返回选择，不打断角色扮演体验。

---

## [LOG-010] 2026-08-08 — V4.1 看破演出升级：识破-反制-无效化仪式感特效

- **变更行为**：
  1. 新增 `playKanpoEffect()` 看破专属演出流程：屏幕压暗 → 敌方技能冻结锁环 → 看破英雄金色之眼 → 金色粒子流汇聚 → 敌方技能斜斩/破碎/无效化印章 → 全屏脉冲闪光。
  2. 新增 `spawnGoldStream()` / `spawnGoldBurst()` 金色琥珀粒子效果，复用 `CanvasFxEngine` 粒子层。
  3. 新增 `KANPO_SOUND_KEY` 与 `playKanpoSound()` 独立看破音效接口，默认复用 `hitDown`（debuff 音效），后续可单独更换。
  4. `checkKanpoInterrupt()` 不再直接 `ctx.cancelled = true`，改为等待演出完成后再标记取消，避免敌方技能被瞬间掐断。
- **涉及函数/模块**：`playKanpoEffect()` (看破演出编排), `spawnGoldStream()` / `spawnGoldBurst()` (金色粒子效果), `playKanpoSound()` (独立音效接口), `checkKanpoInterrupt()` (看破中断流程)
- **决策原因**：当前看破失效后敌方技能被无缝掐断，战略反制缺乏辨识度；通过冻结、金色识破之眼、粒子汇聚与无效化印章建立“识破-反制-无效化”的仪式感闭环。

---

## [LOG-011] 2026-08-08 — V4.1 看破旁白：敌方震惊/我方反应，复用 LLM 接口

- **变更行为**：
  1. 看破演出完成后，新增 `triggerKanpoNarration()` 按旁白开关触发 LLM 台词。
  2. 只开敌方旁白时敌方说震惊台词；只开我方旁白时看破英雄说反应台词；双方都开时同一轮请求双方各说一句。
  3. 未配置 LLM 或已有请求进行中时沿用现有 `llmState.isRequesting` 保护，不阻塞战斗。
- **涉及函数/模块**：`triggerKanpoNarration()` (看破旁白触发), `checkKanpoInterrupt()` (看破中断流程), `requestLLMResponse()` (LLM 请求复用)
- **决策原因**：看破是战略反制，需要让敌方与我方角色通过旁白建立“敌方震惊、我方识破”的叙事反馈，提升演出后的情绪延续感。
