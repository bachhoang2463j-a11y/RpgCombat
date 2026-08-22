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

---

## [LOG-012] 2026-08-11 — V4.1 防御恢复 TP/MP 百分比可自定义（localStorage 持久化）

- **变更行为**：
  1. 新增 `defendSettings` 全局设置对象（`mpRecoverPct: 20`、`tpRecoverPct: 25`，默认与旧行为等效）与 `loadDefendSettings()` / `persistDefendSettings()` 读写函数，持久化键 `DEFEND_VAR_KEY = 'rpg_combat_defend_settings'`，采用 localStorage 存储。
  2. `actionDefend()` 中防御恢复由硬编码改为百分比口径：MP 恢复 `maxMp * mpRecoverPct%`，TP 恢复由“固定 +25 点”统一为 `maxTp * tpRecoverPct%`。
  3. 技能修改器（`openEditor()`）最上方新增“⚙️ 战斗全局设置：防御恢复”区块，两个 0–100% 的 MP/TP 恢复百分比输入框。
  4. `saveEditor()` 保存时读取输入值，经 `clampPct()` 钳制到 0–100 后写入 `defendSettings` 并持久化。
  5. 脚本初始化末尾调用 `loadDefendSettings()`，刷新页面后设置自动恢复。
  6. 经 syntax 校验（Node 提取 `<script>` 校验）通过，零报错。
- **涉及函数/模块**：`defendSettings` (全局设置对象), `loadDefendSettings()` / `persistDefendSettings()` / `clampPct()` (持久化与钳制), `actionDefend()` (防御恢复生效点), `openEditor()` (编辑器 UI 全局设置区), `saveEditor()` (设置读取与持久化)
- **决策原因**：防御恢复 TP/MP 原为硬编码常量（MP 20%、TP 固定 +25），无法按战局或角色平衡需求灵活调整；现改为 0–100% 可配置并持久化，方便测试人员即时调整平衡性，且默认值与旧行为完全一致，无回归。

---

## [LOG-013] 2026-08-11 — V4.1 我方角色技能持久化到酒馆聊天记录 chat 变量

- **变更行为**：
  1. 新增 `ROSTER_VAR_KEY = 'rpg_combat_roster'` 单一键，将我方角色"配置字段 + 技能集"序列化存入酒馆助手 **chat 变量**（即聊天记录 JSON 的 `chat_metadata.variables`），随聊天文件导出；用 `insertOrAssignVariables` 增量写入，避免覆盖其他聊天变量。
  2. `saveEditor()` 追加 `persistHeroesRoster()`，玩家点击编辑器"保存"即**立刻落盘**，删除/修改技能无需刷新。
  3. `onCombatDataReceived()` 在 `buildCombatDataFromYAML()` 成功后、`initUI()` 前调用 `applyPersistedRoster()` 合并。
  4. 合并规则（持久化优先）：同名角色配置字段以持久化为准；同名技能以持久化版本覆盖；`Combat_block` 新增技能追加进战局不丢弃；持久化中无同名角色则保留 `Combat_block` 原版。
  5. 仅持久化我方角色，敌方不持久化（敌人由 `Combat_block` 动态生成）。
  6. 经 syntax 校验（Node 提取 `<script>` 校验）通过，零报错。
- **涉及函数/模块**：`ROSTER_VAR_KEY` / `ROSTER_VERSION` (持久化常量), `serializeHeroesForSave()` (白名单序列化), `persistHeroesRoster()` (写入 chat 变量), `readRoster()` (读取与校验), `applyPersistedRoster()` (按名合并), `saveEditor()` (落盘触发点), `onCombatDataReceived()` (加载合并挂载点)
- **决策原因**：角色技能原仅存于浏览器内存，刷新即丢，且每次依赖 LLM 透过 `<Combat_block>` 重新传递、无法固定玩家偏好的技能数值；localStorage 以浏览器地址为依据、跨聊天共享会导致不同聊天的角色技能串味。改用酒馆助手 `chat` 类型变量将技能绑定到**聊天记录文件**，实现"清空 combatstatus 刷新后同名角色技能仍在、新建聊天对话后技能消失"的精确生命周期，且点保存即落盘，无需刷新。

---

## [LOG-014] 2026-08-11 — V4.3 版本升级 + Combat_block 新增技能置顶

- **变更行为**：
  1. 版本号升级至 **V4.3**，核心引擎文件由 `战斗前端-爬塔 V4.1.html` 重命名为 `战斗前端-爬塔 V4.3.html`（遵循历史版本重命名惯例）。
  2. `applyPersistedRoster()` 合并逻辑微调：`Combat_block` 中持久化不存在的新增技能，由**追加到列表末尾**改为**置顶到技能列表最顶部**。
  3. 同步更新 `README.md`（当前版本 V4.3）与 `SPEC.md`（文件名引用 V4.3）。
  4. 经 syntax 校验（Node 提取 `<script>` 校验）通过，零报错。
- **涉及函数/模块**：`applyPersistedRoster()` (技能合并置顶逻辑), 文件重命名 (`战斗前端-爬塔 V4.3.html`)
- **决策原因**：版本升级遵循项目历史惯例（每次升版重命名核心文件）；`Combat_block` 新增技能置顶，让玩家在技能编辑器中优先看到新出现的技能，提升可发现性。

---

## [LOG-015] 2026-08-11 — V4.3 防守者新增【强力反击】被动 + 红色瞄准演出

- **变更行为**：
  1. 首次启用 `EVENTS.ON_DODGE` 事件（此前仅定义未 emit）：在 `applySingleTagEffect()` 闪避成功分支内、常规反击判定前，`await CombatEvents.emitAsync(EVENTS.ON_DODGE, { target, caster, targetDom, incomingDamageType, skill })` 广播。
  2. `CLASS_PASSIVES['防守者']` 新增 `async onDodge(ctx)` 钩子：闪避成功时按概率 `POWER_COUNTER_CHANCE`（测试期 50%，注释标明可调回 5%）触发强力反击，以 `2 × 当前有效攻击力` 结算伤害（经 `calculateDamage` 正常受防御减免），实际扣血 `caster.hp`，补充破盾/飘字/历史/UI 刷新。
  3. 事件适配层新增 `CombatEvents.on(EVENTS.ON_DODGE, ...)` 订阅，按 `classType === '防守者'` 过滤并调用 `onDodge`。
  4. 新增 `playPowerCounterEffect()` 分幕演出（约 1 秒）：防守者头像泛起红色光芒（仿极限爆发红色系光晕）→ 被反击者图标上浮现红色瞄准准心 → 播放专属音效 `shot01.mp3` 的同时血花飞溅 + 全屏红色脉冲 + 震屏。
  5. 血花采用仿【群攻(爆炸)】外层发散粒子（带重力、速度衰减、白色高光核心，改红/暗红色系），并叠加红色双环冲击波；粒子量控制在 22 个左右，避免卡顿。
  6. 强力反击与常规反击**完全独立**，可同时触发；**无视**"仅近战"限制；命中后**不触发**防守者"嘲讽值永久+20"（仅常规反击保留）。
  7. 经 syntax 校验（Node 提取 `<script>` 校验，4 个 script 全部 OK）通过，零报错。
- **涉及函数/模块**：`EVENTS.ON_DODGE` & `CombatEvents.emitAsync` (事件广播), `CLASS_PASSIVES['防守者'].onDodge` (被动钩子), `CombatEvents.on(EVENTS.ON_DODGE)` (事件订阅), `playPowerCounterEffect()` / `POWER_COUNTER_SOUND_URL` (强力反击演出与音效), `spawnPowerBurst()` (红色发散粒子), CSS keyframes (`.power-crosshair/.power-burst/.power-flash/.power-glow`)
- **决策原因**：强化防守者"闪避后反击"的威胁感与演出辨识度，提供一种无视伤害类型限制、可与常规反击叠加的爆发型反击手段；采用 `ON_DODGE` 事件 + `CLASS_PASSIVES` 钩子的模块化接入，不侵入核心战斗结算代码。演出方案经多轮迭代：由"圆锥冲击波飞行"简化为"瞄准准心 + 防守者红芒 + 血花溅射"，在保持华丽度的同时规避粒子卡顿。

---

## [LOG-016] 2026-08-11 — 强力反击视觉特效重构与 VFX 设计指南文档

- **变更行为**：
  1. 重构【强力反击】（`playPowerCounterEffect`）视觉特效与打击感：
     - **瞄准框残留修复**：在反击触发瞬间强制移除 `targeting-mode-enemy` CSS 类，消除玩家选敌残留的大准星。
     - **蓄力与爆发分离**：将前摇提升至 350ms，新增红色聚气粒子向防守者汇聚（`spawnChargeUpParticles`），使蓄力阶段视觉清晰可见。
     - **命中准星替换刀光**：替换有渲染方块截断问题的 SVG 刀光，改为 90px 精准红色准心（`pc-crosshair`：虚线圆环+十字光臂+辉光），配合 `pc-crosshair-hit` 贝塞尔弹入旋转消退动画。
  2. 根目录生成 `VFX_DESIGN_GUIDE.md`（视觉特效设计与实现指南）：
     - 归纳独立 SVG/CSS 特效模式与 WebM 叠加 + 粒子 + 全屏辉光的五层大招模型。
     - 记录 SVG Filter 渲染方块避坑规范、Blob URL 预加载机制、多通道并发音效及开发 Check-list。
- **涉及函数/模块**：`playPowerCounterEffect()` (强力反击演出), `.pc-crosshair` / `@keyframes pc-crosshair-hit` (命中准星), `VFX_DESIGN_GUIDE.md` (设计指南)
- **决策原因**：解决强力反击特效软绵绵、蓄力受击同步、SVG Filter 方块边界截断等视觉瑕疵；归纳沉淀 VFX 规范文档以指导后续技能特效开发。
---

## [LOG-017] 2026-08-11 — 优化闪避视觉特效

- **变更行为**：
  1. 新增 .dodge-shake CSS 动画，将闪避时的晃动持续时间延长至 0.5s，并加大水平晃动（±10px）与倾斜（±5度）幅度，采用贝塞尔缓动曲线提升物理反馈感。
  2. 新增 spawnDodgeSmokeParticles() 函数，在成功闪避时于角色图标底部生成向两侧和下方扩散的浅灰色烟雾粒子，模拟快速移动激起的扬尘。
  3. 修改闪避结算逻辑（isDodged 分支），将原有的通用 .shake（0.2s）替换为 .dodge-shake 并调用新增的烟雾粒子函数。
- **涉及函数/模块**：\isDodged\ (闪避结算分支), \.dodge-shake\ (CSS 动画), \spawnDodgeSmokeParticles()\ (烟雾粒子生成)
- **决策原因**：原有闪避特效仅短暂轻微晃动，且与其他受击晃动混用，容易被忽略。通过解耦闪避专属晃动并增加扬尘粒子，提升了闪避动作的实体感与视觉辨识度。

---

## [LOG-018] 2026-08-11 — V4.5 修复重置清空持久化技能 bug + 版本升级

- **变更行为**：
  1. **修复重置 bug**：点击战斗界面右上角"重置"按钮后，缓存角色技能被清空（回退到 Combat_block 原始快照），但完整刷新页面会恢复。
     - 根因：`initialHeroesCache` 在 `buildCombatDataFromYAML()` 中被赋值为**未合并持久化**的 Combat_block 原始快照（L3518），而 `applyPersistedRoster()` 在其后（L3585）才把持久化技能合并进 `heroesData`。`resetBattle()` 依赖此缓存还原，导致重置后技能回退而非持久化版；刷新页面重新走合并流程故能恢复。
     - 修复（方案 A）：在 `applyPersistedRoster()` 合并完成后，同步更新 `initialHeroesCache`/`initialEnemiesCache`，使缓存始终反映持久化合并后的最终数据。无持久化数据时提前 return，缓存维持 Combat_block 版，逻辑正确。
  2. 版本号升级至 **V4.5**，核心引擎文件由 `战斗前端-爬塔 V4.3.html` 重命名为 `战斗前端-爬塔 V4.5.html`。
  3. 同步更新 `README.md`（当前版本 V4.5）与 `SPEC.md`（文件名引用 V4.5）。
  4. 经 syntax 校验（Node 提取 `<script>` 校验）通过，零报错；重置功能实测有效。
- **涉及函数/模块**：`applyPersistedRoster()` (合并后同步缓存，修复点), `resetBattle()` (重置还原依赖缓存), `buildCombatDataFromYAML()` (缓存初次建立), 文件重命名 (`战斗前端-爬塔 V4.5.html`)
- **决策原因**：重置与刷新行为不一致暴露了缓存快照与实际数据源脱节的问题；让缓存与持久化合并结果保持同步，使"重置"与"刷新"语义一致，均恢复持久化保存的技能版本。

---

## [LOG-019] 2026-08-11 — V4.8 升级：眩晕/普攻TP/强力反击演出优化

- **变更行为**：
  1. **眩晕修复（多动敌人）**：眩晕改为**每次行动**（含多动单位的额外行动）都判定——被眩晕即跳过其"下一次行动"，并即时消耗眩晕状态；常规 Buff 计时/毒 tick/TURN_START 事件仍仅在首次（非额外）行动执行一次，避免重复结算。
  2. **普攻 TP 恢复可配置**：新增 `defendSettings.basicAttackTp`（默认 20 点），可在编辑器"战斗全局设置：防御/普攻恢复"中配置并 localStorage 持久化；普攻（`actionAttack`）读取该值，普通技能仍保留固定 +5，避免重复叠加。
  3. **强力反击演出优化**：`playPowerCounterEffect` 开头加入 500ms 观感缓冲，让"闪避"特效（烟雾 + `dodge-shake` 抖动）完整呈现后再开始聚气，避免 `power-glow` 的 `!important` 动画立即覆盖闪避演出，使演出呈现"闪避 → 反应 → 强力反击"的清晰时序。
  4. 版本号升级至 **V4.8**，核心引擎文件由 `战斗前端-爬塔 V4.5.html` 重命名为 `战斗前端-爬塔 V4.8.html`。
  5. 同步更新 `README.md`（当前版本 V4.8）与 `SPEC.md`（文件名引用 V4.8）。
- **涉及函数/模块**：`nextTurn()`/`startRound()` (眩晕判定与多动处理), `defendSettings.basicAttackTp` (普攻TP配置), `actionAttack` (普攻TP恢复), `executeSkillAction` (技能TP恢复去重), `playPowerCounterEffect()` (强力反击演出), `openEditor()`/`saveEditor()` (编辑器与持久化), 文件重命名 (`战斗前端-爬塔 V4.8.html`)
- **决策原因**：修复多动敌人眩晕时序错误、消除普攻TP恢复写死、改进强力反击的视觉时序，使"闪避后强力反击"的演出清晰可辨。

---

## [LOG-020] 2026-08-11 — 防守者强力反击几率随仇恨提升 + 反击后仇恨重置

- **变更行为**：
  1. `CLASS_PASSIVES['防守者'].onDodge` 中强力反击触发几率由固定 10% 改为**随仇恨动态计算**：`几率 = 10% + max(0, 有效仇恨 - 200) × 0.2%`，无上限（仇恨越高越易触发强力反击）。
  2. 打出一次强力反击命中后，防守者仇恨回归"天生重装"档位：清除临时 `[嘲讽]` buff（`buffs` 中 `taunt` 项）并将 `baseTauntBonus` 回归 100（有效仇恨回到 200），同时飘字"仇恨重置!"并追加历史记录。
  3. 仇恨重置后 `updateHeroUI(target)` 内部调用 `updateBuffUI` 自动刷新卡牌仇恨徽章，无需额外改动。
- **涉及函数/模块**：`CLASS_PASSIVES['防守者'].onDodge` (强力反击触发与仇恨重置), `getEffectiveStats()` (有效仇恨读取), `updateHeroUI()`/`updateBuffUI()` (仇恨徽章刷新)
- **决策原因**：强化防守者"仇恨越高 → 防守反击越凶"的坦克博弈正反馈；强力反击消耗仇恨并将几率重置，形成"蓄仇恨 → 反击爆发 → 仇恨回落"的节奏闭环，与现有"嘲讽/反击+20"仇恨来源联动，不新增仇恨来源、不引入新状态字段。

---

## [LOG-022] 2026-08-11 — 隐匿者隐匿值累积被动 + ON_KILL 接线 + V5.0 升版

- **变更行为**：
  1. **隐匿者隐匿值累积系统**：隐匿者通过行动累积"隐匿值"（初始 50，即 `100 - 初始嘲讽50`）：
     - **击杀敌人 +30**、**成功闪避 +4**，固化为永久隐匿深度（降低 `baseTauntBonus`）。
     - **临时负 `[嘲]`技能**（如 `【无迹可寻】[嘲讽;power:-30]`）也计入隐匿值，按数值累加（+30），默认持续 3 回合后自然消失、隐匿值回落。
     - **隐匿值 ≥ 80**：立刻触发 1 次【再动】（每循环一次；若隐匿值跌回 80 以下则解锁，可再次触发）。
     - **隐匿值 ≥ 100**：立刻获得下一次非反应攻击 **攻击力 +80**（单次消耗【参考回避/免伤】`isConsumable` 模式，默认持续 3 回合，一旦攻击后便消失），随后隐匿值**回归 50** 开启新一轮循环。
  2. **ON_KILL 事件接线**：在敌方被击杀结算处（`return '__killed__'` 前）补 `CombatEvents.emit(EVENTS.ON_KILL, ...)`，交付隐匿者 `onKill` 被动（此前仅预留未 emit）。
  3. **新增事件订阅**：`ON_KILL`（隐匿者击杀 +30）、`ON_DODGE`（隐匿者闪避 +4，与防守者强力反击并存）、`BUFF_EXPIRED`（隐匿者临时负[嘲]到期回落解锁再动）。
  4. **UI 徽章**：`updateBuffUI` 为隐匿急袭 buff（`isConcealAtk`，不并入通用攻击力徽章）新增 `🎯隐匿急袭+80 1次` 徽章；隐匿值进度沿用现有 `🌫️隐匿` 负嘲讽显示。
  5. **急袭释放消耗**：`executeSkillAction` 在非反应攻击结算后移除 `isConcealAtk` buff（攻击已通过 `getEffectiveStats` 计入 +80）。
  6. **急袭消耗条件修复（bugfix）**：原实现会在任何非反应技能（含纯 buff 技能、带隐匿的自身攻击技能）结算后无条件消耗急袭 buff，导致"施放隐匿技能刚跨100获得急袭"被该技能瞬间吞噬。现改为：仅当①技能为真正的攻击技能（攻/单体/穿透/眩晕标签）且②急袭 buff 在技能开始前已存在（`hadConcealAtkBefore`）时才消耗移除；若急袭由本技能自身累积隐匿值跨100刚授予，则保留给下一次攻击。
  7. 版本号升级至 **V5.0**，核心引擎文件由 `战斗前端-爬塔 V4.9.html` 重命名为 `战斗前端-爬塔 V5.0.html`。
- **涉及函数/模块**：`CLASS_PASSIVES['隐匿者']`（新增 `computeStealthValue`/`checkStealthThresholds`/`gainStealth`/`onKill`/`onDodge` 钩子）, `EVENTS.ON_KILL`（补 emit）, `CombatEvents.on(ON_KILL/ON_DODGE/BUFF_EXPIRED)`（事件订阅）, `TAG_HANDLERS['嘲']`（负[嘲]计入阈值判定）, `updateBuffUI()`（隐匿急袭徽章）, `executeSkillAction()`（急袭 buff 消耗 + `hadConcealAtkBefore` 预捕获与攻击技能判定）, 文件重命名 (`战斗前端-爬塔 V5.0.html`)
- **决策原因**：为隐匿者打造"击杀/闪避/隐匿技能 → 累积隐匿值 → 再动/急袭爆发"的正反馈博弈闭环，与现有"狙击/暗杀"的隐匿深度增伤/眩晕机制联动；同时补齐 `ON_KILL` 预留事件接线，验证 Effect System 预留钩子的可扩充路径。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错。

---

## [LOG-021] 2026-08-11 — V4.9 版本升级：防守者强力反击仇恨机制定版

- **变更行为**：
  1. 经手操实测确认 [LOG-020] 强力反击随仇恨提升 + 反击后仇恨重置机制有效。
  2. 版本号升级至 **V4.9**，核心引擎文件由 `战斗前端-爬塔 V4.8.html` 重命名为 `战斗前端-爬塔 V4.9.html`。
  3. 同步更新 `README.md`（当前版本 V4.9）与 `SPEC.md`（文件名引用 V4.9）。
  4. 经 syntax 校验（Node 提取 `<script>` 校验）通过，零报错。
- **涉及函数/模块**：[LOG-020] 的 `CLASS_PASSIVES['防守者'].onDodge` 机制定版，文件重命名 (`战斗前端-爬塔 V4.9.html`)
- **决策原因**：功能验证通过后遵循项目版本升级惯例（每次升版重命名核心文件），将强力反击仇恨机制作为 V4.9 正式发布。

---

## [LOG-023] 2026-08-11 — 技能面板显示规则修正（仅 UI）：类型徽章需显式标签 + 反应/看破技能隐藏

- **变更行为**：
  1. **类型徽章不再默认显示「近战」**：编辑器 dmgType 下拉（我方/敌方）新增「无(近战)」选项并作为新技能默认值（`damageType` 存 `null`/空串）；新建技能/新角色默认 `damageType` 由 `'近战'` 改为 `null`。面板（`updateMenu`）仅当技能带**显式** `[近战]/[远程]/[法术]` 标签（`damageType` 非空）时才渲染类型徽章，buff 类技能不再显示「近战」。
  2. **反应/看破技能从面板彻底隐藏**：`updateMenu` 遍历时 `if (skill.isReaction || skill.kanpoTarget) return;` 跳过，面板完全不渲染、不可点击，避免被当作主动技能误释放。
  3. **移除反应徽章渲染**：因反应技能已从面板过滤，`updateMenu` 中 `reactionHtml` 渲染逻辑成为死代码，一并删除。
  4. **不影响结算**：无类型技能的 `damageType` 为 `null`，内部结算仍以 `skill.damageType || '近战'` 兜底（L4749/4843/4890），反应/看破系统扫描完整 `skills` 数组（L4754/4916），功能不受影响。
- **涉及函数/模块**：`updateMenu()`（类型徽章显式判定 + 反应/看破过滤 + 移除反应徽章），编辑器 dmgType 下拉（我方 L6134 / 敌方 L6140 新增「无」选项），`addHeroSkill`/`addEnemySkill`/`addHero`/`addEnemy`（新建技能默认 `damageType: null`）
- **决策原因**：修复"buff 类技能默认显示近战、反应/看破技能被罗列可主动释放"的 UI 诡异观感；明确"显式类型标签才显示、无类型默认近战兜底"的显示规则，使面板信息与实际伤害属性判定一一对应，同时保持结算逻辑零改动。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错。

---

## [LOG-025] 2026-08-11 — V5.1 版本升级：技能面板显示规则修正定版

- **变更行为**：
  1. 经手操实测确认 [LOG-023] 技能面板显示规则修正（类型徽章需显式标签 + 反应/看破技能隐藏）有效。
  2. 版本号升级至 **V5.1**，核心引擎文件由 `战斗前端-爬塔 V5.0.html` 重命名为 `战斗前端-爬塔 V5.1.html`。
  3. 同步更新 `README.md`（当前版本 V5.1）与 `SPEC.md`（文件名引用 V5.1）。
  4. 经 syntax 校验（Node 提取 `<script>` 校验）通过，零报错。
- **涉及函数/模块**：[LOG-023] 的 `updateMenu()` 机制定版，文件重命名 (`战斗前端-爬塔 V5.1.html`)
- **决策原因**：功能验证通过后遵循项目版本升级惯例（每次升版重命名核心文件），将技能面板显示规则修正作为 V5.1 正式发布。

## [LOG-026] 2026-08-11 — 新增 [他人] 标签 + 目标取向全标签扫描（消除顺序依赖）

- **变更行为**：
  1. **新增 `[他人]` 标签**：作为独立布尔标记 `skill.isOthers`（类似 `isReaction`/`kanpoTarget`，不占 type/type2/type3 槽位）。技能含 `[他人]` 且含纯有益单体标签（单回/单增/单防/单盾/单瞄/嘲/避/免伤/反击）时，进入**我方选目标**（不排除自己，可对任意我方角色，含施法者自己）；选中后所有纯有益单体标签作用于该目标。
  2. **目标取向判定改为全标签扫描**：新增 `classifySkill()` 扫描 type/type2/type3 一次定好技能取向，替代原先"只看第一个标签 `isBeneficial`"的判定，彻底消除顺序依赖（如 `[单增][群攻]` 与 `[群攻][单增]` 行为一致）。
  3. **敌方单体选目标**：技能含任一敌方单体伤害/妨害标签（单体/穿透/眩晕/单降/单盲）即进入敌方选目标（即使第一个标签是群攻）；结算时该敌方标签作用于选中的目标。
  4. **其余直接施放**：纯群技能（全群X）→ AOE 直接施放；纯单体有益且无 `[他人]` → 对自己施放（满足"只有带他人标签才能对其他角色"）；纯单体伤害 → 保持现状。
  5. **编辑器**：我方/敌方技能行新增「他人」勾选框，`syncEditorDataToMemory` 读取写入 `isOthers`；`serializeHeroesForSave` 持久化 `isOthers`；新建技能默认 `isOthers:false`。
- **涉及函数/模块**：`parseSkill()`（解析 `[他人]` → `isOthers`）, 新增 `classifySkill()`, `prepareSkillTarget()`（重写目标取向）, `handleTargetClick()`（mode 合法性判定）, `openEditor()`（他人勾选框）, `syncEditorDataToMemory()`（读写 `isOthers`）, `serializeHeroesForSave()`（持久化）, `addHeroSkill`/`addEnemySkill`（默认值）
- **决策原因**：修复"所有单体 buff 技能都可自由选择释放对象"的不合理设计——引入 `[他人]` 显式白名单，只有打上该标签的 buff 技能才能对其他角色使用；同时顺手修复多标签混合技能目标取向随标签顺序错乱的历史问题（`isBeneficial` 只看第一个标签导致 `[单体][单增][单降]` 与 `[单增][单体][单降]` 行为不一致）。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错。

## [LOG-027] 2026-08-11 — V5.2 版本升级：目标取向/[他人]标签机制定版 + README 补【免伤】说明

- **变更行为**：
  1. 经手操实测确认 [LOG-026] 新增 `[他人]` 标签 + 目标取向全标签扫描（消除顺序依赖）机制有效。
  2. 版本号升级至 **V5.2**，核心引擎文件由 `战斗前端-爬塔 V5.1.html` 重命名为 `战斗前端-爬塔 V5.2.html`。
  3. 同步更新 `README.md`：当前版本 V5.2；§3.2 回护增益标签新增 `[他人]` 说明（纯有益单体技能只有带该标签才能对其他角色施放，含自己）与 `[免伤]` 说明（单次消耗性减伤，与 `[回避]` 同属"一次生效即消失"机制）。
  4. 同步更新 `SPEC.md`（文件名引用 V5.2）。
  5. 经 syntax 校验（Node 提取 `<script>` 校验）通过，零报错。
- **涉及函数/模块**：[LOG-026] 的 `classifySkill()`/`prepareSkillTarget()` 机制定版，文件重命名 (`战斗前端-爬塔 V5.2.html`)
- **决策原因**：功能验证通过后遵循项目版本升级惯例（每次升版重命名核心文件），将目标取向/[他人]标签机制作为 V5.2 正式发布；同时补全 README 中遗漏的 `[免伤]` 单次消耗减伤标签文档。

## [LOG-028] 2026-08-11 — 新增 `[延迟]` 蓄力等待 + `[加速]` 永久加速库存（我方专属）

- **变更行为**：
  1. **`[延迟:N]` 蓄力等待**：技能先"蓄力"N 回合，蓄力期间只处于准备态、**不结算任何技能效果**，但**仍可使用反应技能与看破**（不可主动普攻/技能/防御）；蓄力完成后需玩家选择**释放**才触发其全部效果。
  2. **`[加速:N]` 永久加速库存**：不自动过期，**只在蓄力释放结算完成时才施加**到角色身上；之后每次蓄力按"所需延迟回合"抵扣库存（covered = min(delay, hasteStore)，蓄力3 遇 加速9 → 加速变6）。
  3. **顺序**：先蓄力 → 完成后由玩家选择释放才结算（此时才 +加速），加速只影响"之后"的蓄力，不影响"本次"。
  4. **`[延迟:3][加速:3]` 组合**：第一次蓄力3回合，完成后 +3 加速库存；下次再使用即立即释放（模拟"狙击枪拼装后持续射击"）。
  5. **数据字段**：英雄对象新增 `hasteStore`（永久加速库存，UI `⚡加速xN`）与 `currentDelay = { skill, remaining }`（蓄力中技能，UI `⏳蓄力N`）。
  6. **交互（蓄力专用菜单）**：蓄力期间右侧技能面板切换为固定**【1.继续蓄力 / 2.终止蓄力】**；蓄力就绪后变为**【1.释放蓄力 / 2.终止蓄力】**；点击"释放蓄力"若满足选目标条件（敌方单体 / 带 `[他人]` 的我方单体）则进入目标选择，否则直接释放。
  7. **回合推进**：蓄力 `remaining` 仅在该英雄**非额外行动**（`!isExtraTurn`，与 Buff 计时同处 `nextTurn`）时 -1；归零后该英雄回合展示释放菜单；英雄死亡清空蓄力。
  8. **编辑器**：我方技能行新增「延迟(蓄力)」「加速」数字输入，`addHeroSkill` 默认 `delay:0, haste:0`；`serializeHeroesForSave` 持久化两字段。
- **涉及函数/模块**：`parseSkill()`（解析 `[延迟]`/`[加速]` → `skill.delay`/`skill.haste`）、新增 `handleChargeSkill()`（蓄力入口 / 库存抵扣）、`releaseCharge()`/`doReleaseCharge()`（释放蓄力 + 目标取向 + 施加加速）、`continueCharge()`（继续蓄力）、`cancelCharge()`（终止蓄力：**不结束回合，恢复本回合正常行动面板**）、`renderHeroMenu()`/`updateChargeMenu()`（蓄力专用菜单渲染）、`prepareSkillTarget()`（独立 `[加速]` 增益直接+库存）、`prepareAttack()`/`actionDefend()`（蓄力中守卫）、`nextTurn()`（蓄力回合推进 / 归零展示释放菜单 / 死亡清空）、`handleTargetClick()`（`release_charge` 目标选择分支）、`updateBuffUI()`（蓄力/加速徽章）、`syncEditorDataToMemory()`/`serializeHeroesForSave()`/`addHeroSkill()`（编辑器与持久化）
- **决策原因**：需求明确"蓄力期间可反应与看破、但不可主动行动"+"加速按所需回合抵扣、仅影响后续"+"一个技能可同时带延迟与加速实现解锁型技能"。为避免与现有 `[蓄力]`（敌方 FGO 大招充能槽）冲突，按用户确认采用**新标签 `[延迟]`**；敌方机制完全不动。**交互定版**：蓄力流程改为玩家可控（继续/终止/释放），修复"蓄力>1 回合时角色卡死"与"单体蓄力无法选目标"两个 bug。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；核心抵扣/释放逻辑经 Node 模拟验证（`[延迟:3][加速:9]` 二次使用 `effective=0, 库存9→6`；`[延迟:3][加速:3]` 二次使用立即释放）。

## [LOG-029] 2026-08-12 — 修复 `[加速]` 无法与其它标签同时触发 / 无法施加给他人

- **变更行为**：
  1. **统一加速结算入口**：`[加速:N]` 改为在 `executeSkillAction()` 结尾统一施加（与其它标签同时触发），而非此前 `prepareSkillTarget()`/`doReleaseCharge()` 中的独立短路分支。
  2. **可施加给他人**：加速目标取向遵循 `skill.isOthers`——若技能带 `[他人]` 且所选目标为我方角色，则加速施加到所选目标；否则施加到施法者自身。`[加速:3][回避;power:100][他人]` 现在可对任意我方角色同时施加「回避」buff 与「+3 加速库存」。
  3. **蓄力技能加速与伤害同触发**：`handleChargeSkill()` 蓄力状态保存完整技能（含 `haste`），`doReleaseCharge()` 不再剥离/手动加加速，直接交给 `executeSkillAction` 统一结算。`[穿透(枪击);power:280][延迟:3][加速:3]` 现在蓄力完成后释放时**同时**造成伤害并 +3 加速库存。
  4. **移除独立加速分支**：`prepareSkillTarget()` 中原先"仅加速、直接结束回合"的独立分支已删除，纯 `[加速:N]` 技能（无其它标签）也能正常进入目标选择/正常结算。
- **涉及函数/模块**：`executeSkillAction()`（结尾新增 `skill.haste > 0` 统一施加）、`handleChargeSkill()`（蓄力状态保存完整含 haste 技能）、`doReleaseCharge()`（去除剥离/手动加速）、`prepareSkillTarget()`（去除独立加速短路分支）
- **决策原因**：经手操实测，此前 `[加速]` 被当作"独立技能类型"短路处理，导致无法与回避等 buff 叠加、无法对他人施放；蓄力技能因 `haste` 被剥离丢失导致释放后无加速。改为统一结算入口后，加速成为普通技能效果，与其它标签天然组合。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；逻辑经代码走查验证（`[加速][回避][他人]` 对目标同时施加回避+加速；`[穿透][延迟:3][加速:3]` 释放时伤害+加速同时结算）。

## [LOG-030] 2026-08-12 — V5.4 版本升级：新增 `[限N次]` 技能本场战斗次数限制标签（我方专属）

- **变更行为**：
  1. **新增 `[限N次]` 标签**：限制某技能**本场战斗**内可使用的总次数（如 `[限1次]`、`[限3次]`）。`parseSkill()` 解析 `[限(\d+)次?]` → 技能对象新增 `maxUses`（上限）与 `usesRemaining`（本场剩余，初始=满值）。
  2. **主动技能面板**：累计用尽后技能栏中该技能**变灰不可选中**（`cursor-not-allowed`、不绑定点击），并显示红色 `[用尽]` 徽章；尚有余量时显示琥珀色 `[限N]` 剩余次数徽章。
  3. **反应/看破技能**（本就不显示在主动面板）：用尽后**后台静默失效**，不再出现在反应/看破弹窗候选；但弹窗按钮会**备注剩余次数**（如 `[限2次]`）。
  4. **消耗时机**：统一在 `executeSkillAction()` 资源扣除处递减——天然覆盖普通施放、蓄力（`[延迟]`）释放、反应技三条路径；看破成功使用时在 `checkKanpoInterrupt()` 单独递减。蓄力释放传入的是 `currentDelay.skill` 浅拷贝，故按技能名定位到真实技能对象再递减，避免拷贝不同步。
  5. **仅作用于我方**：敌方 AI 技能选择（`enemyAction`/`selectEnemySkillAndTarget`/`validSkills`）完全不受影响。
  6. **编辑器与持久化**：我方技能行新增「限次」数字输入框；`syncEditorDataToMemory()` 读写 `maxUses` 并重置 `usesRemaining`；`serializeHeroesForSave()` 序列化 `maxUses`，持久化加载后自动初始化本场剩余次数。
  7. **次数生命周期**：本场战斗内累计，战斗重置/新战局自动恢复满值（`initialHeroesCache` 快照在 `parseSkill` 时已含满值 `usesRemaining`）。
- **涉及函数/模块**：`parseSkill()`（解析 `[限N次]` → `maxUses`/`usesRemaining`）、`executeSkillAction()`（资源扣除处统一递减）、`applySingleTagEffect()`（反应技过滤）、`promptReaction()`（弹窗备注剩余次数）、`checkKanpoInterrupt()`（看破候选过滤 + 成功使用时递减）、`promptKanpo()`（弹窗备注）、`updateMenu()`（主动技能面板变灰 + 徽章）、`openEditor()`（限次输入框）、`syncEditorDataToMemory()`（读写限次字段）、`serializeHeroesForSave()`/`applyPersistedRoster()`（持久化）
- **决策原因**：需求希望给强力/稀有技能增加"本场战斗使用次数"约束，提升战术资源管理深度。用户明确该标签**仅影响我方角色**，故不触碰敌方 AI 选择逻辑；反应/看破不显示在主动面板，用尽后静默失效即可，只需在弹窗备注剩余次数。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；逻辑经代码走查验证（`[限1次]` 主动技能用一次后变灰 `[用尽]`；`[限3次]` 反应/看破技能弹窗显示剩余次数、用尽后不再出现；蓄力释放正确消耗；持久化保存/加载后限次保留）。

## [LOG-031] 2026-08-12 — 新增 `[驱散:N]` / `[群驱散:N]` 负面状态驱散标签（我方专属）

- **变更行为**：
  1. **新增 `[驱散:N]` / `[群驱散:N]` 标签**：对我方目标各驱散 N 个负面 buff（`N` 可选，无数字默认 1；如 `[群回;power:100][群驱散:1]` 为全体回血 + 我方每人驱散 1 个负面）。`parseSkill()` 解析 `[驱散:N]`/`[群驱散:N]` → 计数存入对应标签槽的 `powers[i]`（自然沿用爆发倍率与持久化）。
  2. **槽位分配**：若技能无任何真实标签（主槽为纯兜底 `[单体]`/20），`[驱散]`/`[群驱散]` 占用主槽；否则（如与 `[群回;power:100]` 组合）填入第一个空闲的 type2/type3 槽。
  3. **效果**：新增 `TAG_HANDLERS['驱散']` handler，复用灾厄使被动的负面判定谓词（`poison`/`stun`/负值 `def`/`hit`/`eva`/`atk`），按计数依次移除最多 N 个负面；无负面时显示"无负面"占位反馈，不报错。因 `resolveTagHandler` 子串匹配，key `驱散` 同时命中单体与群体写法，群体行为由目标选择（AOE→全体我方）处理。
  4. **目标取向**：`isBeneficial` 加入 `驱散`（目标选我方，同 `[单增]`）；`classifySkill()` 的 `hasSingleBuff` 加入 `驱散`（`[驱散]` 单体无 `[他人]` 只能对自己释放，带 `[他人]` 可进入"我方选目标"；`[群驱散]` 因含`群`被排除、走 AOE 直接施放）。
  5. **编辑器**：`SKILL_TYPES` 新增 `'[驱散]'`、`'[群驱散]'` 供"3 重标签"下拉选择；计数用该标签的"威"值。`updateMenu()` 徽章配色新增 `驱散` 分支（翠绿，与 `[回]` 同类）。
- **涉及函数/模块**：`parseSkill()`（解析 `[驱散:N]`/`[群驱散:N]` 并填入标签槽）、`TAG_HANDLERS['驱散']`（负面移除 handler）、`executeSkillAction()` 的 `isBeneficial`（目标取向）、`classifySkill()` 的 `hasSingleBuff`（`[他人]` 选目标）、`SKILL_TYPES`（编辑器下拉）、`updateMenu()`（徽章配色）
- **决策原因**：需求给我方增加"净化负面"的战术标签，按用户确认 `[驱散]` 视同 `[单增]` 类纯增益单体标签（`[他人]` 可对任意我方施放），`[群驱散]` 对我方全体各驱散 N 个；计数采用与 `[延迟:N]`/`[加速:N]` 一致的 `:N` 语法。项目无现成 dispel，负面判定复用了灾厄使被动的权威谓词，保证与"痛打落水狗"计数口径一致。仅影响我方，不触碰敌方 AI。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；逻辑经 Node 模拟验证（`[群回;power:100][群驱散:1]` → type2 槽 `[群驱散]`/1；`[驱散:2]` 纯单体主槽；`[驱散]` 无数字默认 1；`[单体;power:30][驱散:1]` 填入空闲槽；handler 按计数移除负面、无负面时 removed=0；`[驱散]` 单体 `hasSingleBuff=true` 可配 `[他人]` 选我方可）。

## [LOG-032] 2026-08-12 — 右侧技能选择面板 UI 重构与美化（320px 宽度 / 215px 高度 / 三排卡片结构）

- **变更行为**：
  1. **面板扩宽与平齐对齐**：`#menu-container` 宽度由 `176px` 扩宽至 `320px`，高度锁定为 `215px`，与左侧英雄头像框顶端和底端完全平齐对齐。
  2. **技能卡片三排结构**：重构 `updateMenu(hero)` 函数，将技能卡片渲染为三排清晰层级（第 1 排【技能名称/类型】、第 2 排【效果/蓄力/命中】、第 3 排【消耗/限制/状态】）。
  3. **属性调色与状态遮罩**：技能卡片左侧增加炫彩属性指示条（法术紫/远程黄/近战红/基础蓝）；不可用/已用尽技能呈现暗沉灰色遮罩 (`disabled-card` / `exhausted-card`) 并标注 `⚠️ MP不足` 或 `🚫 已用尽`。
  4. **释放全部垂直空间**：移除技能列表底部的页脚，将全部垂直高度留给技能列表卡片，支持流畅垂直滚动。
  5. **蓄力专用菜单美化**：重构 `updateChargeMenu(hero)`，使 `[延迟]` 蓄力中与蓄力就绪菜单风格与 320px 新 UI 统一。
- **涉及函数/模块**：`战斗前端-爬塔 V5.5.html` 中的 CSS 样式区、`#menu-container` & `#skill-menu` HTML 结构、`updateMenu()`、`updateChargeMenu()`。
- **决策原因**：原 176px 技能面板极为狭窄，多字技能名截断为“...”，标签与消耗重叠。根据用户明确要求，将面板扩宽 1.8 倍（320px）、高度与头像框平齐（215px），并使用三排结构进行高质感游戏 UI 美化，纯 UI 样式调整，不改动任何底层计算与机制逻辑。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；用户演示网页 1:1 实机确认。

## [LOG-033] 2026-08-12 — 技能面板尺寸微调（260px x 172px）、初始面板图 2 风格升级与蓄力蓝色系配色

- **变更行为**：
  1. **面板尺寸按 20% 比例缩减**：`#menu-container` 尺寸调整为 `260px` 宽度 × `172px` 高度，避免挡住英雄头像；`#heroes-container` 同步锁定为 `172px` 高度平齐对齐。
  2. **初始行动面板升级**：`#main-menu` 摒弃原简陋文本列表，升级为图 2 高质感精致按钮风格（`⚔️ 普攻攻击` / `⚡ 释放技能` / `🛡️ 防御姿态`）。
  3. **蓄力菜单深蓝配色**：重构 `updateChargeMenu(hero)` 配色方案，将原棕红杂色替换为科技感深蓝渐变（`bg-gradient-to-r from-cyan-700 to-blue-700`），与 260px 玻璃透明面板完全契合。
  4. **卡片内边距微调**：`updateMenu(hero)` 内部内边距微调为 `p-1.5`，确保 260px 宽度下 3 排布局精致美观。
- **涉及函数/模块**：`战斗前端-爬塔 V5.5.html` 中的 `#menu-container`、`#main-menu`、`updateChargeMenu()`、`updateMenu()`。
- **决策原因**：根据用户反馈 320px 偏大，将长宽各按约 20% 缩减（260px × 172px），并将初始面板按用户指名的图 2 高质感按钮风格重构，同时将蓄力菜单调为蓝色系，兼顾紧凑视觉与高品质表现。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；主源文件同步完成验证。

---

## [LOG-034] 2026-08-12 — 敌方攻击预示红色轮廓光晕（enemyOmen）

- **变更行为**：
  1. **新增 CSS `@keyframes enemyOmen` 与 `.enemy-omen`**：使用 `filter: drop-shadow(0 0 18px rgba(239, 68, 68, 0.95))` 实现红光轮廓发光（与大招预警风格一致，而非方形 `box-shadow`），在 400ms 内由无到强再消散，不改变图标形变。
  2. **重构 `executeEnemyTurn` 技能预选逻辑**：将技能决策（`selectEnemySkillAndTarget`）提前到显示光晕前执行，从而判断即将释放的技能类型。
  3. **新增攻击判定过滤**：仅当技能类型包含伤害/控制标签（`['单体', '群攻', '穿透', '群穿透', '眩晕', '群眩晕']`）时，才为敌方图标添加 `.enemy-omen` 光晕；辅助/治疗/纯增益技能不显示红光。
  4. **异步清理与节奏配合**：通过 `setTimeout` 400ms 后非阻塞清理 class，配合 `await sleep(400)` 预留反应机制与决策时间窗口。
- **涉及文件**：`战斗前端-爬塔 V5.5.html`（CSS 区约第 121 行、`executeEnemyTurn` 函数约第 5917 行）。
- **决策原因**：
  - 弃用缩放猛冲动效，避免与受击/反应决策时序冲突。
  - 弃用方形 `box-shadow`，改用 `drop-shadow` 贴合怪兽立绘轮廓，视觉效果更精致 premium。
  - 仅攻击/控制技能显示红光，过滤掉辅助与回复技能，使敌方的“攻击意图”提示更精确合理。

---

## [LOG-035] 2026-08-12 — V5.6 敌方攻击预兆升级：颤抖闪烁/迸发突刺组合动效 + 专属音效 + 330ms 打击时序对齐

- **变更行为**：
  1. **升级 CSS `@keyframes enemyOmenCombo`**：将原本静态的红色轮廓光晕（`enemyOmen`）重构为包含物理形变与光学爆裂的复合动效。前 45% 时间（0-270ms）进行 2 次高频左右剧烈颤抖（shiver）与红晕快速频闪，第 45% 时间点略微收缩蓄力，随后在第 55% 爆发期（330ms）向玩家方向（向下前倾）大幅度突刺突进（lunge），并触发两层叠加的 `drop-shadow` 光学向外大幅度迸发扩散，最终缓慢收回并恢复原状，总时长由 400ms 延长为 600ms。
  2. **精准作用于 Sprite 节点**：将 `executeEnemyTurn` 中添加 `.enemy-omen` 的目标由整个包裹框 `enemy-box-${enemy.id}` 修正为精确的怪物图标 `${enemy.id}-sprite`，解决之前晃动连带血条、名字一起振动的粗糙感。在动效期间临时移除 `.breathe` 呼吸动效防止冲突，动画结束后再行恢复。
  3. **增加攻击预警专属音效**：在 `audioUrls` 注册了 `monsterAttack` 音效（`https://cdn.jsdelivr.net/gh/bachhoang2463j-a11y/test1@main/monsterattack2.mp3`），在添加攻击预警动效时通过 `playSound('monsterAttack')` 播放。
  4. **打击点时序（Hit-Sync）优化**：为了使受击/反应决策与动效高度契合，保持 `setTimeout` 为 600ms（在后台非阻塞播放完毕并清理样式和恢复呼吸），但将主线程 `await sleep` 缩短为 **330ms**（对应 `enemyOmenCombo` 中 55% 处的峰值爆发点）。我方受击飘字或反应弹窗将在怪物完全放大的前冲一瞬间（打击点）即刻触发，彻底消除严重延迟感。
- **涉及文件**：`战斗前端-爬塔 V5.5.html`（CSS 动画区、`audioUrls` 对象、`executeEnemyTurn` 函数）。
- **决策原因**：用户体验调优。将物理运动学的后撤/前冲、极高频剧烈抖动、光学爆发以及高品质怪兽咆哮音效完美融为一体；并将主线程等待对齐至突刺爆发帧（330ms），消除了滞后感，使打击反应行云流水。

---

## [LOG-036] 2026-08-12 — V5.7 我方角色蓄力[延迟]替换为物理雷电全生命周期过渡动效 + 专属音效

- **变更行为**：
  1. **接入全生命周期 Canvas 雷电系统 (Scheme 1)**：在 `CanvasFxEngine` 扩展了我方英雄 `[延迟]` 蓄力雷电渲染管线（`drawHeroChargeLightningOverlay`），实时沿卡片四周生成折线雷电电弧、白亮线芯、动态 Glow 发光边框以及散射飞溅火花（sparks）。
  2. **三阶状态过渡动效与 Card Glow 样式**：
     - **开始蓄力 (`charging`)**：苍蓝电弧（`#38bdf8`）从无平滑显现，英雄卡片亮起 `.charge-glow-cyan` 辉光。
     - **蓄力完成 (`ready`)**：电弧颜色从苍蓝渐变色变至邪术紫（`#c084fc`），触发一道向外放大的紫色冲击波环（`shockwaveRadius`），英雄卡片切换为 `.charge-glow-purple` 紫色高能辉光。
     - **释放技能 (`burst`)**：紫色雷电向外剧烈外扩爆裂（`burstScale` 1.0 ➔ 2.5），大量电火花向四周爆发散射并渐隐消散。
  3. **专属音效集成**：在 `audioUrls` 注册 `herocharge`（开始蓄力）与 `herochargedone`（蓄力完成）音频 URL，分别在 `handleChargeSkill` 与 `startRound`/`triggerHeroChargeReady` 节点触发调用。
  4. **状态与生命周期自动联动**：在 `handleChargeSkill`、`startRound`（蓄力回合数推进）、`doReleaseCharge`（释放）、`cancelCharge`（终止）以及重伤/死亡节点完备串联，彻底替换原先无动效的静态蓄力。
- **涉及文件**：`战斗前端-爬塔 V5.5.html`（CSS Glow 样式、`audioUrls` 对象、`CanvasFxEngine` 扩展、蓄力处理函数）。
- **决策原因**：替换原先无动效的潦草蓄力展示。结合程序物理雷电折线、色变脉冲、火花爆发与高品质音频，赋予我方角色蓄力过程极强的仪式感与大招能量积聚反馈。

---

## [LOG-037] 2026-08-12 — 修复蓄力雷电框延迟显现 bug (fxEngine 全局作用域绑定)

- **变更行为**：
  1. **补全 `window.fxEngine = fxEngine` 全局挂载**：`const fxEngine = new CanvasFxEngine()` 声明在模块域，`triggerHeroChargeStart`/`Ready`/`Release` 内部检查 `if (window.fxEngine)` 导致判断为 `undefined`，无法在按下蓄力技能的瞬间即时调用 `fxEngine.startLoop()`。显式挂载到 `window.fxEngine` 并修正内部调用直接为 `if (fxEngine) fxEngine.startLoop()`。
  2. **修复结果**：英雄点击 `[延迟]` 技能开始蓄力的瞬间，Canvas 特效引擎渲染循环被立刻激活，苍蓝雷电电弧与 `.charge-glow-cyan` 辉光边框 0 延迟即刻从无平滑渐变出现，不再需要等待后续看破或 Buff 触发 `addParticle` 才被动唤醒。
- **涉及文件**：`战斗前端-爬塔 V5.5.html`（`fxEngine` 初始化及 `triggerHeroCharge*` 触发函数）。
- **决策原因**：修复运行时 Bug，确保 UI 与动效响应绝对即时。

---

## [LOG-038] 2026-08-12 — 升级版本号至 V5.7 (文件更名为 战斗前端-爬塔 V5.7.html)

- **变更行为**：
  1. **引擎主文件重命名**：使用 `git mv` 将 `战斗前端-爬塔 V5.5.html` 重命名为 `战斗前端-爬塔 V5.7.html`。
  2. **更新项目说明文档**：同步更新 `README.md` 中的当前版本号为 **V5.7**，并更新 `SPEC.md` 中的主文件路径与版本引用。
- **涉及文件**：`README.md`、`SPEC.md`、`战斗前端-爬塔 V5.7.html`。
- **决策原因**：版本迭代归档规范化，保持文档与源代码版本标识统一。

---

## [LOG-039] 2026-08-12 — 清理并移除项目根目录与 Git 仓库中的 Demo 演示网页文件

- **变更行为**：
  1. **移除 Demo 文件**：使用 `git rm` 彻底从 Git 历史和磁盘中彻底清理并删除了所有临时 Preview/Demo 网页文件（`demo_skill_ui.html` 与 `demo_charge_lightning.html`）。
  2. **保持根目录干净**：保证根目录下仅保留核心引擎文件 `战斗前端-爬塔 V5.7.html` 以及标准规范/日志文档。
- **涉及文件**：`demo_skill_ui.html`（已删除）、`demo_charge_lightning.html`（已删除）。
- **决策原因**：响应用户要求清理临时测试页面，确保 Git 仓库和项目根目录整洁纯粹。

---

## [LOG-040] 2026-08-12 — 新增【肃正】全队共享护盾标签机制

- **变更行为**：
  1. **全队共享屏障数据层**：新增模块级全局变量 `teamBarrier`（当前共享屏障值）与 `teamBarrierMax`（历史峰值供 UI 进度条基准），与各角色自身的 `entity.shield` 完全独立，`startGame()` 新战局时清零。
  2. **施放标签 `[肃正]`**：在 `SKILL_TYPES` 数组加入 `[肃正]` 使编辑器下拉可选；`parseSkill` 的 `singleTagMatches` 正则补入 `肃正` 以支持无 power 写法；`isBeneficial` 补 `tag.includes('肃正')` 避免目标选择误判为伤害类；`executeSkillAction` 目标锚定施法者自身（与 `[再动]` 同分支）。注册 `TAG_HANDLERS['肃正']`：`teamBarrier += actualPower`、播盾特效、施法者飘字、更新共享盾横幅。
  3. **伤害拦截（核心）**：在 `applySingleTagEffect` 伤害分支、`calculateDamage` 之前插入屏障拦截——`targetType === 'hero'` 且屏障存在时，先按 `min(teamBarrier, rawDamage)` 全额吸收原始伤害（**armor=0**：不减伤直接扣，穿透 `isPierce` 攻击同样撞屏障），剩余泄漏量 `rawDamage` 续走角色自身 Armor → 个人护盾 → 防御姿态 → HP 的正常管线。**群攻"挡一次，泄漏给全员"**：屏障作为"单个目标"只被群攻命中一次，批次首次结算吸收一次命中量后，将泄漏量经 `barrierAoELeak` 共享给全体成员，后续成员不再重复扣屏障。屏障可无限叠加。
  4. **屏障 UI**：在 `#heroes-container` 顶部新增"🛡️ 圣域帷幕"全局横幅（屏障值 + 进度条），值为 0 时隐藏；新增 `updateTeamBarrierUI()` 刷新。屏障吸收时在受击目标上飘字并写入战局历史。
  5. **视觉反馈修正**：屏障完全挡下伤害（`hpDmg===0 && barrierAbsorb>0`）时补充分支，避免显示误导性的 `-0` 红色飘字。
- **涉及文件**：`战斗前端-爬塔 V5.7.html`（模块变量区、`SKILL_TYPES`、`parseSkill`、`TAG_HANDLERS`、`executeSkillAction`、`applySingleTagEffect` 伤害分支、`#heroes-container` HTML、`updateTeamBarrierUI`）。
- **决策原因**：响应需求新增集"全队共享、不可被穿透、armor=0、群攻只命中一次"于一体的独特护盾标签，为团队提供战略级抵挡手段，区别于现有单角色护盾。

---

## [LOG-041] 2026-08-12 — 【肃正】屏障升级为"伪实体肉盾" + 修复 UI 横幅 bug

- **变更行为**：
  1. **修复 UI 横幅 bug（根因）**：`initUI()` 每次调用都执行 `heroesContainer.innerHTML = ''`，把静态写在 `#heroes-container` 内的 `#team-barrier-banner` 删掉，导致横幅在首次构建后永久消失。将横幅 HTML 抽成常量 `TEAM_BARRIER_BANNER_HTML`，在 `initUI()` 清空容器后 `insertAdjacentHTML('afterbegin', ...)` 重建，覆盖数据就绪/重置/编辑器保存三处调用点。
  2. **屏障成为"伪实体肉盾"（核心）**：屏障存在期间，我方角色完全不被敌方攻击选中、不进入各自的闪避判定。
     - `getTauntTarget()` 开头判断 `teamBarrier > 0` → 返回屏障伪目标（`barrierStandIn`，`id:'barrier'`、`spd:0`、`isBarrierTarget:true`），使敌方单体攻击的目标选择直接命中屏障。
     - `applySingleTagEffect()` 顶部新增屏障伪目标特判：伤害类攻击 → 调用 `applyBarrierHit()` 直接命中屏障（**无闪避 spd=0 不 roll、跳过反应弹窗、穿透也撞屏障**）；非伤害负面效果（降/盲等）被屏障格挡，我方不受益也不受害。
     - 新增 `applyBarrierHit()`：复用主伤害管线公式计算 rawDamage，屏障 `armor=0` 全额吸收，**全挡到被打破为止**；破碎那一击溢出部分：单体→打代理目标（`proxyHero`），群攻→打全员，均走正常闪避+减伤管线。
     - `executeSkillAction()` 敌方对我方群攻：屏障存在时整个群攻被屏障命中一次（伪实体肉盾），我方成员不闪避、不被选中。
  3. **反应弹窗**：屏障存在时我方不受击，跳过反应弹窗（被动防御无意义）；**看破不受影响**——看破经 `BEFORE_SKILL_RESOLVE` 事件在技能结算前主动拦截，独立于受击目标。
  4. **状态清理**：`startGame()` 补充重置 `barrierStandIn`。
  5. **屏障受击反馈**：`applyBarrierHit()` 中为屏障横幅接入与角色受击一致的演出——白色剪影泛白（`spawnHitFlash`，依伤害强度分级）、横幅抖动（`.shake`）、屏幕震动（`triggerScreenShake`）、打击音效（单体 `atk2`/群攻 `atk1`）；屏障破碎时追加全屏红闪 + 强力震屏 + `kill` 破碎音效。
- **涉及文件**：`战斗前端-爬塔 V5.7.html`（`initUI`、`TEAM_BARRIER_BANNER_HTML`、`getTauntTarget`、`applySingleTagEffect`、`applyBarrierHit`、`executeSkillAction`、`startGame`）。
- **决策原因**：响应用户需求，将【肃正】从"数值挡伤害"升级为"一个伪实体肉盾角色"——屏障存在期间我方角色等同处于无敌状态，攻击全部被屏障吸收，直到屏障被打破，实现"新增一个角色直到敌方击杀他"的战术语义。

---

## [LOG-042] 2026-08-13 — 升级版本号至 V5.8 (重命名引擎主文件为 战斗前端-爬塔 V5.8.html 并更新文档规范)

- **变更行为**：
  1. **引擎主文件重命名**：使用 `git mv` 将 `战斗前端-爬塔 V5.7.html` 重命名为 `战斗前端-爬塔 V5.8.html`。
  2. **更新项目三件套文档说明**：同步更新 `README.md` 中的当前版本号为 **V5.8**，并更新 `SPEC.md` 中的主文件路径与版本引用。
  3. **定版【肃正】机制**：包含【肃正】全队共享屏障数据层、伪实体肉盾拦截逻辑与 UI 横幅持久重建。
- **涉及文件**：`README.md`、`SPEC.md`、`战斗前端-爬塔 V5.8.html`（原 `战斗前端-爬塔 V5.7.html`）。
- **决策原因**：完成【肃正】伪实体肉盾机制迭代后升级版本号至 V5.8，归档版本规范并保持全局文档标识一致。

---

## [LOG-043] 2026-08-13 — 【肃正】全队笼罩式金光圣域屏障 Visual FX 视觉升级

- **变更行为**：
  1. **【肃正】屏障 DOM 结构与 UI 重构**：将原本放置在角色头像上方的长条横幅，升级为笼罩整个我方英雄小队的 `3D 弧形金光圣域屏障`（`.team-barrier-wrapper` / `.team-barrier-dome`），并搭配内嵌 SVG 蜂窝能量网格与流光边界。
  2. **解决文字裁切**：将悬浮标题徽章 `#barrier-header-badge` 独立于 `overflow: hidden` 容器之外，确保“🛡️ 圣域帷幕 数值”100% 完整显示无裁切。
  3. **受击光晕与波纹动效**：在 `applyBarrierHit()` 受击反馈中接入击打能量涟漪（`.barrier-hit-ripple`）、蜂窝网格过载高亮（`.barrier-hex-spotlight`）与结界压缩抖动（`.barrier-hit-impact`）。
  4. **严禁改动逻辑**：所有伤害结算、全队伪实体肉盾单次群攻扣减、数值生命周期及事件逻辑保持 100% 原样不变。
- **涉及文件**：`index.html`（`<style>` 样式、`TEAM_BARRIER_BANNER_HTML`、`updateTeamBarrierUI`、`applyBarrierHit`）。
- **决策原因**：响应需求将【肃正】屏障视觉升级为全队笼罩式金光结界，提升战斗演出代入感与视觉品质，同时严格保持底层逻辑不变。

---

## [LOG-044] 2026-08-13 — 隐匿者【隐匿值累积】被动优化：击杀+30 改为 击杀+30 / 一回合未受击+10

- **变更行为**：
  1. **新增受击标记字段**：隐匿者 `onBattleInit` 增加 `entity.stealthHitThisRound = false`（本回合是否被敌方攻击命中）。
  2. **受击标记打点**：在 `applySingleTagEffect()` 伤害管线命中分支（`target.hp -= hpDmg` 处）对存活隐匿者我方英雄置 `stealthHitThisRound = true`。该分支仅在「未闪避、伤害管线执行」时进入，覆盖护盾/屏障全挡、-0 与实质扣血三种情况，符合「被敌方攻击命中即算受伤」口径；闪避成功走既有 `return` 分支，天然不计受伤。
  3. **每回合结束统一结算**：在 `startRound()` 排轴之后、`nextTurn()` 之前，遍历我方全队，对存活且本回合未被命中的隐匿者经 `gainStealth(h, 10)` 累积 +10，并每回合清零 `stealthHitThisRound`。结算刻意置于 `state.actionQueue = allEntities` 排轴之后，确保 `gainStealth` 触发的【再动】splice 不会被重建队列丢弃。
  4. **移除原「闪避+4」逻辑**：删除隐匿者 `onDodge` 方法及其订阅（`EVENTS.ON_DODGE` 不再为隐匿者累积隐匿值）。
- **涉及文件**：`index.html`（隐匿者 `onBattleInit`、`onDodge` 移除、`applySingleTagEffect` 命中分支、`startRound`）；`README.md`（第 7.5 隐匿者条目）。
- **决策原因**：隐匿者本身嘲讽值极低、不易被攻击，原「闪避+4」累积途径依赖"被打到"这一低频事件，被动效果割裂且难以触发。改为「一回合未被攻击命中 +10」后，隐匿者保持隐匿、不挨打即可稳定累积隐匿值，与"隐匿即收益"的玩法定位一致，并使 80/100 阈值循环（再动 / 急袭+80）更易达成。

---

## [LOG-045] 2026-08-13 — 隐匿者数值平衡微调：隐匿急袭攻击力加成由 +80 调整为 +50

- **变更行为**：
  1. **数值平稳下调**：将隐匿者隐匿值突破 100 时获得的【隐匿急袭】攻击力加成数值由 `+80` 调整为 `+50`。
  2. **项目三件套文档同步**：同步更新 `README.md`（第 7.5 隐匿者条目）与 `SPEC.md`（§4.2 隐匿者隐匿值累积标准）中的数值说明，确保代码与全局文档标识 100% 保持一致。
- **涉及文件**：`index.html`（隐匿者被动 `checkStealthThresholds`）、`README.md`、`SPEC.md`。
- **决策原因**：进行数值平衡微调，适当收敛隐匿者急袭爆发强度，同时维持玩法循环机制不变。

---

## [LOG-046] 2026-08-13 — 【双枪扫射】技能特效集成与 playWebMFX 图像扣图渐隐引擎升级

- **变更行为**：
  1. **注册【双枪扫射】特效项**：在 `WEBM_FX_REGISTRY` 注册表新增 `'双枪扫射'` 特效，挂载 AI 生成并优化的扫射资源 `strafe-ezremove02.mp4`，支持自带对齐音轨播放。
  2. **升级 `playWebMFX` 渲染引擎**：
     - **Canvas 实时 Luminance Alpha 抠图**：解决 GPU 图层隔离导致的 `mix-blend-mode` 实体黑框 bug，将纯黑背景转化为真正的 PNG 级 Alpha 0 透明度。
     - **画面自适应不拉伸**：读取视频 `videoWidth` / `videoHeight` 动态按原比例计算 Canvas 尺寸，彻底解决非正方形视频形变拉伸问题。
     - **边缘抗锯齿羽化**：引入 Alpha 柔和平滑渐变（12~80 灰度过渡），保留精致发光轮廓与平滑边缘。
     - **尾部 0.35s 平滑渐隐 (Fade-out)**：播放结束前 0.35s 自动淡出，消除动画终止时的生硬断切。
- **涉及文件**：`index.html`（`WEBM_FX_REGISTRY`、`playWebMFX`）。
- **决策原因**：完成短前摇【双枪扫射】特效的源文件集成，并全面重构升级 WebM/MP4 特效播放引擎，完美解决实体黑框、视频拉伸与硬边锯齿等全套渲染难题。

---

## [LOG-047] 2026-08-13 — 升级版本号至 V6.0 (优化特效音量 2.5 倍增益与版本号更新)

- **变更行为**：升级版本号至 V6.0。优化 `playWebMFX` 原声音轨 2.5 倍 Web Audio 增益放大与 `audioUrl: 'none'` 音轨独占模式；清理 demo 文件。
- **涉及文件**：`index.html`、`README.md`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。

---

## [LOG-048] 2026-08-13 — 集成【克虏伯重狙】特效与补充 VFX 开发避坑指南文档

- **变更行为**：
  1. **挂载克虏伯重狙特效**：在 `WEBM_FX_REGISTRY` 注册表新增 `'克虏伯重狙'` 特效资源（`snipe-ezremove.mp4`），并配置 `audioUrl: 'none'` 激活 2.5 倍原声放大与音效独占。
  2. **完善 VFX 开发指南**：在 `VFX_DESIGN_GUIDE.md` 补充 GPU 图层隔离黑框原因、Luminance Alpha 抠图原理、AI 视频黑底压暗、抗锯齿羽化与音量增益放大规范。
- **涉及文件**：`index.html`、`VFX_DESIGN_GUIDE.md`、`LOG.md`、`LOG-INDEX.md`。

---

## [LOG-049] 2026-08-13 — 修复极限爆发（Burst）激活时 TP 技能误选与"释放条件不足"失败 Bug

- **变更行为**：
  1. **新增爆发中禁用 TP 技能逻辑**：在 `updateMenu` 中添加 `isBurstBlocked = hero.burstActivated && skill.tpCost > 0` 判定。因开启极限爆发后施技能会在结算时将 TP 清零（`triggerBurstIfNeeded`），消耗 TP 的技能若在此状态下施放必定会导致 `hero.tp < skill.tpCost` 判定失败报错“释放条件不足！”，故在菜单中将其设为禁用灰色遮罩（`disabled-card`）。
  2. **禁用提示与徽章红色预警**：被禁用的 TP 技能显示 `⚠️ 爆发中禁 NTP` 明确原因，TP 消耗徽章同步渲染为红色警告框（`text-rose-400 border-rose-500/80 bg-rose-950`）。
  3. **头像点击实时刷新技能菜单**：在头像点击切换爆发回调 `handleTargetClick` 中补充 `updateMenu(target)` 重新渲染调用，解决英雄回合中途开启/关闭爆发时技能菜单 UI 未实时刷新导致旧状态残留的问题。
- **涉及文件**：`index.html`（`handleTargetClick`、`updateMenu`）、`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：修复在极限爆发激活状态下误选 TP 技能导致行动无效与“释放条件不足”错误的体验问题，并确保回合中途切换爆发状态时 UI 即时同步。

---

## [LOG-050] 2026-08-13 — 补全【肃正】全队共享伪实体肉盾屏障机制在 README 与 SPEC 中的说明

- **变更行为**：
  1. **同步 `README.md`**：在 §2.2 战斗面板 UI 中新增【肃正】全队共享屏障（圣域帷幕）视效与伪实体肉盾特性说明；在 §3.2 标签解析中新增 `[肃正]` / `[肃正;power:数值]` 标签功能说明。
  2. **同步 `SPEC.md`**：新增 §4.2.3 规范章节，详尽定义【肃正】屏障索敌归集拦截、`Armor=0` 无视穿透抵扣、敌方群攻单次扣减与溢出分发规则，并列出底层涉及的 8 个核心函数/模块引用。
- **涉及文件**：`README.md`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：补全项目“三件套”中关于【肃正】机制的设计规范与现状文档，确保引擎文档与最新底层逻辑 100% 保持一致。


## [LOG-051] 2026-08-13 — 新增 TP 潜能来源：成功闪避 +5（我方英雄）

- **变更行为**：
  1. **机制改动**（`index.html` 闪避成功分支 `isDodged`）：我方英雄成功闪避敌方攻击时，额外积攒 +5 TP（`target.tp + 5`，封顶 `maxTp`），并即时刷新 UI。与原受击 +10×倍率、施法 +5、普攻/防御恢复并列，成为一类新的潜能来源。
  2. **同步 `README.md`**：§2.2 TP（潜能槽）条目补充“成功闪避（+5）”来源说明。
- **涉及文件**：`index.html`、`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：原闪避成功不增加 TP，与“受击/行动积攒潜能”的设计直觉不符；闪避表示成功规避危机，理应获得潜能奖励，提升身法流（反应闪避/风行者 TP 闪避）的收益与博弈趣味。

## [LOG-052] 2026-08-13 — 修复蓄力技能未在开启蓄力时即时消耗资源的问题

- **变更行为**：
  1. **机制修正**（`index.html` `handleChargeSkill` 与 `doReleaseCharge`）：
     - 我方英雄在开启蓄力时（`handleChargeSkill`），即时校验并扣除 MP/HP/TP 资源（`hero.mp -= skill.cost; ...`），实现“蓄力即押注/支付资源”逻辑。若资源不足直接显示“释放条件不足！”并中断；
     - 蓄力完成到期释放时（`doReleaseCharge`），向 `executeSkillAction` 传入 `skipCost = true`，跳过重复的资源扣除。
  2. **同步 `README.md` 与 `SPEC.md`**：在 §3.2 与 §4.2.1 蓄力机制说明中补充“开启蓄力时即时扣除资源”规则说明。
- **涉及文件**：`index.html`、`README.md`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：解决原蓄力技能在开启蓄力时不扣除资源、延后至释放结算时才扣除导致的逻辑漏洞，确保蓄力从一开始即符合付出相应代价的设计规则。

## [LOG-053] 2026-08-13 — 新增降闪避/降攻击 debuff 标签【单滞】【群滞】【单弱】【群弱】并写入目标选择判定

- **变更行为**：
  1. **新增两个 debuff 标签系**（`index.html`）：
     - **【单滞】/【群滞】**：降低目标闪避率（`type:'eva'` 负值），「迟滞身法」演出。
     - **【单弱】/【群弱】**：降低目标攻击力（`type:'atk'` 负值），「虚弱无力」演出。
  2. **效果结算**：在 `TAG_HANDLERS` 注册表新增 `'滞'`（降 eva）与 `'弱'`（降 atk）两个 handler，完全复刻 `[降]`/`[盲]` 的 debuff 模式（`playSound('defDown')` + `playSVGEffect('debuff')` + 紫色飘字 + 历史记录），单/群前缀自动共享同一 handler。
  3. **目标选择判定（核心）**：`classifySkill` 的 `hasEnemyTargetTag` 清单追加 `滞`/`弱`，使 `[单滞]`/`[单弱]`（不含"群"）正确进入**敌方选目标**流程；`[群滞]`/`[群弱]` 因含"群"被排除（群攻无需选目标）。
  4. **编辑器下拉**：`SKILL_TYPES` 追加 `[单滞]`/`[群滞]`/`[单弱]`/`[群弱]`，三个标签下拉自动同步新增选项。
  5. **手写裸标签兼容**：`parseSkill` 的 `singleTagMatches` 白名单正则追加 `群滞|单滞|群弱|单弱`，支持手写 `[单滞]`（无 power）正确解析（不落入 `[单体]` 兜底）。
  6. **敌方 AI 识别**：`selectEnemySkillAndTarget` 的 `isDebuff` 判定追加 `滞`/`弱`，敌方施放这些技能时正确进入减益逻辑（优先对未中 debuff 的英雄施放）。
  7. **负面 Buff UI 修复**：`updateBuffUI` 为 `eva` 与 `atk` 补上 `< 0` 负面值渲染分支（原有它们只显示正值，负面值静默不显示），使降闪避 `💨避-X` / 降攻击 `⚔️-X` 紫色图标可见。
  8. **技能徽章颜色**：`formatTagPill` 的 debuff 紫色分支追加 `滞`/`弱`，与 `降`/`盲` 同色。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：补齐可降低敌方闪避率与攻击力的两类单体/群体 debuff，丰富控制与削弱手段；并确保这两个单目标妨害标签符合系统既定"敌方选目标"目标取向规则（与 `单降`/`单盲` 一致），避免落入"直接对自己施放"的分支错误结算。

## [LOG-054] 2026-08-13 — 新增【单冲】【群冲】潜能值(TP)回复标签并写入 [他人] 目标选择判定

- **变更行为**：
  1. **新增两个 TP 回复标签系**（`index.html`）：
     - **【单冲】/【群冲】**：恢复目标潜能值（TP），`power` 数值即回复点数（如 `[单冲;power:30]` 恢复 30 点 TP），上限 `maxTp`（默认 100）。
  2. **效果结算**：在 `TAG_HANDLERS` 注册表新增 `'冲'` handler，完全复刻 `[回蓝]` 的回复模式（`playSound('mpHeal')` + `playSVGEffect('mpHeal')` + 飘字 + 历史记录），但作用于 `ctx.target.tp` 而非 MP；单/群前缀自动共享同一 handler（`resolveTagHandler` 子串匹配）。
  3. **目标选择判定（核心）**：`classifySkill` 的 `hasSingleBuff` 清单追加 `单冲`，使 `[单冲]`（不含"群"）进入**我方选目标**流程，配合 `[他人]` 可对任意我方角色（含自己）施放；`[群冲]` 因含"群"被排除，走 AOE 对我方全体直接施放。
  4. **编辑器下拉**：`SKILL_TYPES` 追加 `[单冲]`/`[群冲]`，三个标签下拉自动同步新增选项。
  5. **沿用回蓝 power 口径**：与 `[回蓝]` 一致，`[冲]` 标签须带 `;power:xx` 才生效（裸标签落入 `[单体]` 兜底），`parseSkill` 的通用 `typeMatches` 正则（`;power`）无需改动即自动识别。
  6. **文档同步**：`README.md` §3.2 与 `SPEC.md`（§4.2.3 新增小节 + 标签注册表清单 + `hasSingleBuff` 纯增益单体名单）补充 `[单冲]`/`[群冲]` 说明。
- **涉及文件**：`index.html`、`README.md`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：当前 TP（潜能槽）只能通过被命中/施法/闪避/防御普攻等被动途径累积，缺少主动定向回复手段。新增 `[单冲]`/`[群冲]` 标签，使支援/治疗类角色能为任意我方队友定向充能，与既有的 MP 回复 `[回蓝]` 完全对称；并确保 `[单冲]` 正确归入"纯增益单体"，带 `[他人]` 可对任意我方角色施放，避免落入"直接对自己施放"的分支错误结算。

## [LOG-055] 2026-08-13 — 修复【单冲】【群冲】误给敌方增加 TP 的目标取向 Bug

- **变更行为**：
  1. **根因**：`executeSkillAction` 的 `isBeneficial` 判定（`index.html:6172`）未收录 `冲`，导致 `[单冲]`/`[群冲]` 被归为非增益标签，目标选择落入**敌方分支**（`opponents`），`TAG_HANDLERS['冲']` 因此把 TP 加到了敌方身上。
  2. **核心修复**：`isBeneficial` 判定追加 `tag.includes('冲')`，使 `[单冲]` 自动目标/`[他人]` 选定目标均落在**我方**，`[群冲]` 走 AOE 对我方全体。
  3. **配套一致性**：
     - 技能面板 AOE 目标预览文案（`index.html:6128`）追加 `冲`，`[群冲]` 显示"全体友方"而非"全体敌方"；
     - 蓄力充能颜色（`index.html:6155`）追加 `冲`，与 `回`/`增` 同取绿色；
     - 技能徽章配色（`formatTagPill`，`index.html:7230`）追加 `冲`，与 `回`/`驱散` 同取绿色系。
  4. **无需改动**：敌方 AI 技能选择（`isHeal`/`isBuff`/`isDebuff`，`index.html:6654-6656`）与满血免疗判（6742）仅服务敌方 AI，`[冲]` 为我方专属标签，敌方不会持有，故不涉及。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：`[单冲]`/`[群冲]` 为纯增益回复标签，目标取向必须与 `[回蓝]` 一致（我方选目标/我方全体），否则会误充敌方能级，破坏战术平衡。

## [LOG-056] 2026-08-13 — 更新 README 文档补全【单滞/群滞】与【单弱/群弱】debuff 标签说明并升级版本号至 V6.3

- **变更行为**：
  1. **文档补全**（`README.md`）：在 §3.3 减益与控制类标签中补齐 `[单滞] / [群滞]`（降闪避率 Eva）与 `[单弱] / [群弱]`（降攻击力 Atk）两个 debuff 标签的说明。
  2. **版本号升级**（`README.md`）：将当前版本从 `V6.0` 升级为 `V6.3`。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：响应用户需求将遗漏的新 debuff 标签（滞/弱）补充在 README.md 对应小节中，并进行版本号的递增发布。

## [LOG-057] 2026-08-13 — 新增持续伤害(DoT)标签【中毒】【燃烧】与补充 README 说明并升级版本号至 V6.4

- **变更行为**：
  1. **新增两个 DoT 标签系**（`index.html`）：
     - **【中毒】/【群中毒】**：施加毒素层，每回合造成固定真实伤害，**叠层加深**——每次施放直接叠加新毒层，各层独立发作、互不覆盖（与灾厄使/施毒者淬毒攻击的 push 叠加语义完全一致）。
     - **【燃烧】/【群燃烧】**：施加火焰层，每回合造成固定真实伤害，**灼烧禁疗**——重复施放不叠层、仅刷新强度与持续时间；燃烧期间目标受到的 HP 治疗/回复效果**减半**（火炙伤口难以愈合）。
  2. **共同规则**：`power` 即每回合真实伤害，直接扣 HP、**无视护甲/个人护盾/肃正屏障/免伤**（完全复用 `nextTurn` 既有中毒 tick 的直接扣血管线，不经 `calculateDamage`）；默认持续 3 回合、支持 `[持续:N]` 调整；受极限爆发倍率影响（施放时 `actualPower = power × multiplier`）；不做闪避判定、可被【肃正】屏障格挡（与 降/盲/滞/弱 同级的纯 debuff 路线）。
  3. **目标取向**：单目标进入敌方选目标、`[群X]` 走 AOE 打全体敌方——`classifySkill` 的 `hasEnemyTargetTag` 靠 `!t.includes('群')` 自动排除群标签、`isBeneficial`（不含 中毒/燃烧）天然判为减益，无需额外接线即正确落位。
  4. **管线接线点**：`TAG_HANDLERS` 注册 `'中毒'`/`'燃烧'` 两个 handler（含叠层 push 与燃烧刷新逻辑）；`nextTurn` 毒 tick 扩展为 `poison || burn`（紫/橙双色飘字与历史）；`updateBuffUI` 新增 `☠️毒N·M回` / `🔥燃N·M回` 状态徽章（毒聚合各层、燃取最强单层）；`[回]` 治疗 handler 检测 burn 后治疗减半（`AFTER_HEAL` 事件与溢出转盾联动自动一致）；【驱散】与灾厄使"痛打落水狗"两处负面谓词均追加 `burn`；敌方 AI 的 `isDebuff`/`heroesWithoutDebuff` 识别 中毒/燃烧；`formatTagPill` 徽章与 降/盲 同色；`SKILL_TYPES` 与 `parseSkill` 裸标签白名单追加 4 标签。
  5. **同步文档与版本升级**：
     - 更新 `README.md`：在 §3.3 减益与控制类标签中补齐 `[中毒] / [群中毒]` 与 `[燃烧] / [群燃烧]` 两个 DoT 标签的说明；在 `[驱散]` 描述中增加 `燃烧` 负面状态；在“灾厄使 / 施毒者”被动中补齐 `燃烧` 说明。
     - 升级版本号：将 `README.md` 中的当前版本号从 `V6.3` 升级为 `V6.4`。
- **涉及文件**：`index.html`、`SPEC.md`、`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：响应需求新增 DoT 机制，复用灾厄使既有中毒管线（buffs 数组 + 回合 tick 直接扣血），并让两种持续伤害在"同为无视护甲固定真伤"的共性下形成差异化分工——【中毒】叠层加深压制高甲/高血单位，【燃烧】禁疗克制圣职者/自愈型/Boss 回血，丰富持续压制与反治疗博弈；同步补全 README 说明并升级版本号为 V6.4 发布。



## [LOG-058] 2026-08-16 — 【肃正】屏障强化参数（Armor 护甲 / 子类型属性克制）+ 屏障名字跟随技能名

- **变更行为**：
  1. **新增屏障参数语法**（`index.html` `parseSkill`）：支持 `【魔法壁垒】[肃正:法术;power:1000;Armor:40]` 双参数写法：
     - **`Armor:N`**：屏障对所有伤害（含穿透）拥有 N 点护甲值，伤害进入屏障吸收前**先扣减护甲**。解析时先用 `;Armor:(\d+)` 提取数值再摘除 `;Armor:N`（避免其阻断主 `;power:` 标签正则的 `]` 匹配），存入 `skill.barrierArmor`。
     - **子类型 `:近战/远程/法术`**：屏障对该属性伤害额外 50% 减免，**发生在护甲扣除之前**（先减半 → 再扣护甲 → 剩余量进屏障吸收）。子类型缺失时回退到独立 `[法术]`/`[近战]`/`[远程]` 标签（`skill.damageType`），存入 `skill.barrierSub`。
     - 无 power 的 `[肃正:法术]` 写法仿 `[驱散]` 槽位填充模式手动填入标签槽（power 默认 50）。
  2. **屏障名字跟随技能名**：新增全局 `teamBarrierName`，`TAG_HANDLERS['肃正']` 施放时令其等于技能名；横幅标题（`#team-barrier-name`）、战报、飘字、`barrierStandIn.name` 全部改为动态 `teamBarrierName`（不再写死"圣域帷幕"），例如施放【魔法壁垒】后屏障即显示"魔法壁垒"。
  3. **显式覆盖叠加规则**：仅当施放携带 `Armor`/子类型参数时才更新 `barrierArmor`/`barrierSub`；裸 `[肃正]` 补盾不改属性、只累加数值与刷新名字；屏障被击破（两条吸收路径：`applyBarrierHit` 与主管线屏障块）后属性重置为默认（无甲/无克制）。
  4. **统一减免接入**：新增 `applyBarrierResist(rawDamage, incomingDamageType)`（克制减半 → 扣护甲），接入 `applyBarrierHit`（屏障伪实体单体路径）与主管线屏障块（群攻泄漏路径）；战报记录减免量。
  5. **UI 与持久化**：`formatTagPill` 新增 `肃正` 青色系徽章配色；`updateTeamBarrierUI` 值文本追加 `· 甲N · 类型克` 后缀并同步名字；`serializeHeroesForSave` 追加 `barrierSub`/`barrierArmor` 字段（持久化保存/还原不丢失）。
  6. **文档**：`SPEC.md` §4.2.4 补全新参数与机制说明。
- **涉及文件**：`index.html`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：需求要求屏障具备"对所有伤害固定护甲值"与"对特定伤害类型额外免伤"两种强化维度，并让屏障文案随技能名变化以增强技能辨识度。解析上采用 `[肃正:子类型]` 内联语法 + `;Armor:N` 附加参数，与既有 `[看破:法术]`/`[反应:近战]` 的子类型体系风格一致；减免顺序"先克制减半、再扣护甲、后进吸收"严格遵循需求描述（在被护甲减免之前进行额外免伤）。

## [LOG-059] 2026-08-16 — 反应/看破弹窗新增敌方技能详情展示（伤害属性/攻击类型/威力/命中/单体目标）

- **变更行为**：
  1. **新增共用详情行构造函数 `buildSkillDetailHTML(skill, showTarget, target)`**（`index.html`，位于 `getKanpoTarget` 之后）：按 `skill.damageType || '近战'` 输出伤害属性徽章；扫描 `type/type2/type3` 三槽含 `群` 判定攻击类型（单体/群攻）；`power > 0` 显示 `威力 N`、否则显示 `威力 普攻`（敌方无技能时的 mock 普攻 `power:0`）；`hit` 默认 100（显示技能 `[Hit:N]` 配置值）；`showTarget=true` 时群攻显示 `目标 全体敌方`、单体显示目标名（屏障拦截时目标为 `barrierStandIn`，显示 `屏障·名字`）。输出 Tailwind `font-mono` 小字号详情行，两个弹窗复用。
  2. **反应弹窗 `promptReaction`**（`index.html`）：头部改为 `面临 X 的【技能名】`（原仅显示攻击者名与伤害类型），下方新增 `buildSkillDetailHTML(incomingSkill)` 详情行；移除原局部变量 `incomingDmgType`。
  3. **看破弹窗 `promptKanpo`**（`index.html`）：签名新增第 4 参 `incomingTarget`；头部保留技能名，下方新增 `buildSkillDetailHTML(incomingSkill, true, incomingTarget)` 详情行（含攻击类型与单体目标）；移除原 `incomingDmgType`。
  4. **目标信息链路传递**（`index.html` 两处）：`executeSkillAction` 内看破中断点 `kanpoCtx` 追加 `target: primaryTarget`；`checkKanpoInterrupt` 调用 `promptKanpo` 时透传 `ctx.target`。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：需求要求反应/看破弹窗展示敌方技能威力与命中率、看破弹窗展示攻击类型与单体攻击目标，让玩家能依据技能强度与受击目标精准决策是否消耗资源打断/应对。目标信息在 `executeSkillAction` 宣告点已由 `primaryTarget` 持有（屏障存在时为 `barrierStandIn` 伪实体），故仅需透传即可，无需改动索敌与结算流程。

## [LOG-060] 2026-08-17 — 减益受命中判定影响 + 新增【必中】标签（升级 V6.8）

- **变更行为**：
  1. **减益命中判定（`index.html` `applySingleTagEffect`）**：作用于**敌方**的非伤害效果（降/盲/滞/弱/中毒/燃烧）不再无条件生效，改为跟随**同技能的攻击命中**——**一个技能有多少次伤害攻击就判定多少次，只要有一次攻击命中，其携带的所有敌方非伤害效果全部施加**。
     - 跨标签共享命中结论：`executeSkillAction` 在结算前为 `skill._bdg = { targetHit, targetResolved }`（键为目标 id），攻击标签结算后写入该目标的命中结论；减益标签查询同一目标 `targetHit` 判定是否施加。
     - 为保证"先判定攻击、再施加减益"，`tagList`（type/type2/type3 三槽）在循环前按「攻击/控制标签优先，减益标签其次」稳定排序，避免因槽位顺序导致减益先于攻击结算而误判。
     - **纯减益技能**（无攻击本体、未带 `[必中]`）：对每个目标单独做一次命中判定（复用 `hitChance`/命中增益与目标速度/闪避增益公式），闪避则落空。
     - **我方增益**（回/冲/增/防/盾/瞄/嘲/再动/避/免伤/反击/驱散/肃正）保持无条件生效，不受命中判定影响。
  2. **新增 【必中】 标签（`index.html` `parseSkill`）**：解析 `[必中]` → `skill.guaranteedHit`（布尔）。带此标签的技能跳过命中/闪避判定——`applySingleTagEffect` 的初次（与二次反应）判定短路为恒命中，减益分支也因 `guaranteedHit` 短路直接施加，模拟拟真大范围妨害无法被闪避规避。
- **Bug修复（纯减益判定复用真实命中管线）**：
  - 初版纯减益在 `else` 分支内用自定义 `Math.random` 迷你 roll 做命中，导致两个问题：① 每个减益标签各自独立判定（如 `【铝热投剂】[燃烧][单降]` 会判定两次）；② 该迷你 roll 完全绕过 `isDamage` 判断管线的反应拦截与闪避动效，敌方闪避无演出、也无法触发反应技能。
  - 现将纯减益的首个标签**复用判断管线**：进入判断块的入口条件由 `if (isDamage)` 改为 `if (isDamage || (isDebuffTag && 该目标尚未判定))`——纯减益首标签同样经历反应拦截、命中 roll、闪避飘字/烟雾等完整演出并记录结论到 `_bdg.targetHit/targetResolved`；其后的减益标签（以及"跟随攻击"的减益）仅查询 `_bdg` 中该目标已记录的命中结论，**不再重复 roll/播放动效**。
  - 效果：`【铝热投剂】`只判定一次；命中则燃烧+单降+再动全部施加，闪避则播放完整闪避演出并整体落空，且纯减益命中不足时可正常触发放置在目标身上的反应技能。
  3. **编辑与持久化**：`SKILL_TYPES` 追加 `[必中]`；技能编辑器每行新增「必中」复选框（hero/enemy 技能行的「他人」旁，id `edit-h/e-…-guaranteed`）；`syncEditorDataToMemory` 读回；`addHeroSkill`/`addEnemySkill`/`addHero`/`addEnemy` 默认对象、`serializeHeroesForSave` 均追加 `guaranteedHit` 字段（持久化不丢失）；技能面板新增 `🎯必中` 徽章。
- **涉及文件**：`index.html`、`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：需求要求 buff/减益同样受命中率影响，让高闪避单位能规避妨害、同时多段攻击只需命中一次即可挂满减益，丰富攻击命中与妨害施加的联动博弈；`[必中]` 标签则用于大范围妨害（如暴风雪/造雾术）锁定施加、不受闪避影响。实现上复用既有 `skill.hit` 命中管线与 `skill` 跨槽共享对象，以最小侵入承载"共享一次攻击判定结论"，并保持我方增益无条件生效以不破坏治疗/辅助体验。

---

## [LOG-061] 2026-08-17 — 三项职业被动优化（风行者回避致命 / 狂战士毅力留存 / 强力反击与普通反击互斥）（升级 V6.9）

- **变更行为**：
  1. **风行者新增【被动 - 回避致命】**（`index.html`）：风行者原本仅 `modifyStats`（Eva += TP），现复用隐匿者同款机制——每场战斗一次，遭受致命伤害时完美回避免除伤害（一次性标记 `hasTriggeredAvoidFatal`，`hpDmg=0`/`shieldDmg=0`/`prevented=true`，飘字"回避致命!" indigo）。事件总线 `ON_FATAL_DAMAGE` 新增守卫 `classType !== '风行者'`（priority=5，与隐匿者同档）。
  2. **狂战士新增【被动 - 毅力留存】**（`index.html`）：狂战士原本仅 `modifyStats`/`checkPierce`/`modifyTrueDamage`，现复用防守者同款机制——每场战斗一次，承受致命伤害时强制保留 1 点 HP（一次性标记 `hasTriggeredGrit`，`hpDmg = hp - 1`/`prevented=true`，飘字"毅力留存!" yellow）。事件总线 `ON_FATAL_DAMAGE` 新增守卫 `classType !== '狂战士'`（priority=10，与防守者同档）。
  3. **防守者强力反击与普通反击互斥**（`index.html`）：因防守者经 `onBattleInit` 永久持有 `counter` buff，闪避近战攻击时若强力反击触发，紧接着的普通反击判定仍为真，导致一击内双重反击。现设互斥标记：闪避成功分支在 `emitAsync(EVENTS.ON_DODGE)` 前 `target.powerCounterFired = false` 复位；`onDodge` 打出强力反击后（仇恨重置处）置 `target.powerCounterFired = true`；普通反击守卫追加 `&& !target.powerCounterFired`。效果：强力反击命中后跳过同次闪避的普通反击，避免重复伤害/重复"仇恨反击+20"；未触发强力反击时普通反击逻辑完全不变。
- **涉及文件**：`index.html`、`README.md`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：需求要求 ①风行者和隐匿者一样具备规避致命、②狂战士和防守者一样具备毅力留存，③修复防守者强力反击与普通反击在同一闪避内双发的问题。前两者通过复用既有的 `onFatalDamage` 机制与同名一次性标记（战斗开始已统一 `delete` 清零），以零/低侵入接入 `CLASS_PASSIVES` 与事件总线；后者以最小侵入增设 `powerCounterFired` 互斥标记实现"强力反击触发即跳过普通反击"，保持日常普通反击行为不变，并同步补全 README/SPEC 说明并升级版本号为 V6.9 发布。

- **⚠️ 遗留 Bug 备注（与本次改动无关，来自更早的 `[必中]` 实现；已于 LOG-062 / V6.10 修复）**：敌方技能带 `[必中]` 标签时会**跳过敌我双方角色反应技能的触发**。根源在 `index.html` 反应拦截入口 `if (!isDodged && !(skill && skill.guaranteedHit))`——`[必中]` 令该条件恒为假，故敌方必中技能不弹我方反应面板、也无法触发看破打断。修复已完成（见 LOG-062）：改为 `if (!isDodged)`，让 `[必中]` 仅跳过被动闪避 roll、仍可被反应技/看破主动化解。

---

## [LOG-062] 2026-08-17 — 修复【必中】标签跳过反应拦截的遗留 Bug（升级 V6.10）

- **变更行为**：
  1. **修复反应拦截被 `[必中]` 整体排除**（`index.html`）：`applySingleTagEffect` 内反应拦截入口条件由 `if (!isDodged && !(skill && skill.guaranteedHit))` 改为 `if (!isDodged)`。此前敌方技能一旦带 `[必中]`，`!(skill && skill.guaranteedHit)` 恒为假，整个反应拦截块被跳过——我方不弹反应面板、敌方也不做 AI 自动反应，`[必中]` 技能完全无法被主动化解。
  2. **语义定版**：`[必中]` 仅跳过**被动闪避 roll**（初次判定 `isDodged = false`），而保留反应拦截与看破中断（`checkKanpoInterrupt`，本就未受 `guaranteedHit` 门槛限制）。因此必中伤害/妨害虽无法被被动闪避规避，但仍可被我方角色用反应技（含反应技生成的 `[回避]` buff，触发二次闪避判定）仓促应对，或被看破彻底无效化。
- **涉及文件**：`index.html`、`README.md`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户在使用中发现了"敌方带 `[必中]` 时跳过我方反应技能"的偏差——`[必中]` 本意是"无法靠闪避躲开"（拟真大范围妨害），而非"彻底免疫主动应对"。修复以最小改动移除反应拦截入口的 `guaranteedHit` 排除项，使"必中=跳过被动闪避、但可被主动化解"的预期语义成立，并同步更新 README（§5 第 4 点与已知问题标记为已修复）、SPEC（新增 `[必中]` 与反应拦截小节）并升级版本号至 V6.10 发布。

## [LOG-063] 2026-08-17 — 新增速度增减标签【单速/群速/单缓/群缓】+ 施放瞬间实时重排剩余行动顺序

- **变更行为**：
  1. **新增 4 个速度类技能标签**（`index.html` `SKILL_TYPES`、`parseSkill` 裸标签正则，并注册 `TAG_HANDLERS['速']` / `['缓']`）：
     - **【单速/群速】**：增加我方目标速度，buff `{type:'spd', value:+power, duration}`（加速）；**【单缓/群缓】**：降低敌方目标速度，buff `value:-power`（减速）。
     - 速度增益为**独立临时 buff**，明确**不写回基础 `spd`、不改变闪避上限**——与原公式"基础闪避值=速度"解耦，纯作用行动顺序（用户指定：速度增减独立为临时速度，与角色基础速度区别开）。
     - 目标取向：`单速`→我方单体（带 `[他人]` 可指定目标）、`群速`→我方全体、`单缓`→敌方单体、`群缓`→敌方全体。接线：`isBeneficial` 判据追加 `'速'`（使速类走我方增益落位）、`classifySkill.hasSingleBuff` 追加 `'单速'`、`hasEnemyTargetTag` 追加 `'缓'`。
     - `'缓'` 纳入两个 `isDebuffTag` 判据（`applySingleTagEffect` 与 `executeSkillAction` 标签排序），使减速作为敌方 debuff 跟随技能攻击命中判定（与 降/盲/滞/弱 一致）；`[必中]` 亦对其生效。
  2. **有效速度计算与实时重排**（`index.html` 新增两个函数 `getEffectiveSpeed` / `reorderRemainingQueue`）：
     - **有效速度** = 基础 `spd` + 该角色身上所有 `type:'spd'` buff 求和（加速正/减速负），仅用于行动顺序排轴。
     - **施放瞬间实时重排当前回合剩余队列**：`executeSkillAction` 末尾检测 `skill._speedChanged`（速度 handler 内置位）触发 `reorderRemainingQueue()` —— 保留已完成前缀（含当前施法者），对 `queueIndex` 之后的剩余队列按最新有效速度重算 `queueSpd` 并降序重排，随后 `renderTurnQueue()` 刷新。
  3. **重排安全语义**：
     - **施法者不因加速白得行动**：施法者已行动完（位于保留前缀），不参与剩余重排；只有携 `[再动]` 标签才会额外插入一次行动（另一独立机制，与本次速度无关）。
     - **`isExtraTurn` 条目（再动/多重施法的合成 entry，无 `queueSpd`）视为最高优先级（`queueSpd = Infinity`）**，保证"立即插队"的额外行动不被慢速单位插队。
     - 多动单位（`actCount>1`）剩余行动的速度衰减 `-i*10` 在重排时按"已完成主行动次数"续算，与 `startRound` 排轴规则一致。
  4. **UI**：`updateBuffUI` 新增速度 buff 求和与徽章（`⚡速+N·M回` 青 / `🐌速-N·M回` 紫）；`formatTagPill` 为 `'速'`（cyan）/`'缓'`（purple）追加标签配色。
  5. **文档**：待用户确认本轮有效后，同步更新 `README.md`（§3 增补 4 标签说明、有效速度定义、"不影响闪避/实时重排当前回合/施法者不额外行动"三条语义）并将版本号升级为 `V6.11`；`SPEC.md` 同步。本次仅回填 `LOG.md`/`LOG-INDEX.md`。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`（README/SPEC 待确认后更新）。
- **决策原因**：需求"敏捷值实时变动的技能单/群速、单/群缓"，经与用户厘清四个方案（下一回合生效/实时重排/即时插入/星铁式连续时间轴）后确定：放弃星铁式引擎改造（过于复杂、需重写核心循环），采用**实时完全重排当前回合剩余队列**（施法者不额外行动）。速度改动与原公式耦合点（基础闪避=速度）由用户明确解耦为**独立临时速度**，既避免误改闪避、也能在施放的当下立即体现先后手变化，且下一回合起由 `startRound` 按新有效速度自然生效、持续回合走通用 buff 递减。
- **⚠️ 测试反馈发现并修复两条 Bug（均未改动文档已述设计，仅修正实现）**：
  1. **下一回合减速不生效**：`startRound` 排轴参数原本直接读原始 `e.spd`/`h.spd`，从不读取速度 buff，导致减速 buff 挂在怪物身上但下一回合重建队列时被无视。修复：`startRound` 改用 `getEffectiveSpeed()`（基础 spd + 临时速度 buff 求和）计算 `queueSpd`。
  2. **本回合对多次行动单位（`actCount>1`）失效**：startRound 为多动单位排的多条队列项 `i>0` 均标记 `isExtraTurn:true`，但初版 `reorderRemainingQueue` 把所有 `isExtraTurn` 一律视为"再动插队"按最高优先级处理，导致减速怪物的 3 次额外行动仍被钉在队首、继续四连动霸轴。修复：以**是否携带 `queueSpd`** 区分两类 `isExtraTurn`——带 `queueSpd` 的（startRound 为多动单位排的后续行动）参与速度排序并按有效速度衰减（有效速度−序数×10），无 `queueSpd` 的（`[再动]`/多重施法 splice 插入的"立刻插队"）保留最高优先级不被冲散。
  - **验证**：经用户以"行动次数4、速度115"怪物实测确认有效（减速后其剩余行动按 95/85/75 正常延后、不再霸占队首；下一回合亦按新有效速度排轴），后用户确认本轮有效并拍摄收尾。

## [LOG-064] 2026-08-17 — 分离【记录】预览与【尝试撤离】：撤离改为行动面板第四按钮 + 基于实时平均速度的 roll 判定（V6.12）

- **变更行为**：
  1. **右上角【撤离】改为固定【📜 记录】**（`index.html` 顶部按钮 `onclick` 与文案）：点击 `showHistoryOnly()` 仅弹**只读战局记录预览弹窗**（新增 `battle-history-modal`，展示 `battleHistory` 文本 + 关闭按钮），**不写撤离文案、不发送到酒馆**。
  2. **撤离降为行动面板第四按钮**【💨 尝试撤离】（`main-menu` 普攻/技能/防御三按钮之后新增第四个按钮，样式与三按钮一致，hover 紫色系）：仅在我方角色行动回合可点（main-menu 只在英雄回合显示）。
  3. **撤离不再百分百成功**：`retreatBattle()` 改为委托 `attemptRetreat()`：
     - **实时平均速度**：我方均速 = 存活我方各 `getEffectiveSpeed()`（基础 `Speed` + `[单速]/[群速]/[单缓]/[群缓]` 临时速度增益/减益求和）的平均；敌方同理。复用 `getEffectiveSpeed`（index.html:4881），故速度增减真实影响撤离成败。
     - **对抗 roll（同攻击闪避公式方向）**：$Roll_{我}=\text{Random}(1\sim 我方均速)$，$Roll_{敌}=\text{Random}(1\sim 敌方均速)$，**$Roll_{我} > Roll_{敌}$ 才成功**。
     - **成功**：写成功文案（含双方均速与判定点数）→ `showBattleResult('retreat')` 弹发送到酒馆的战后结算面板。
     - **失败**：写失败文案 → `await sleep(1000); await endTurn();` **消耗该行动角色的本回合**，不弹发送面板，战斗继续。
     - **两结果均写入 `addHistory`**。
     - 蓄力中（`currentDelay`）禁止撤离；`state.isAnimating` 防重入。
  4. **文档**：`README.md` §2.2 重写"战术撤退"小节 + 新增"📜 战局记录预览"条目，版本号升级为 `V6.12`；`SPEC.md` §4.2 新增"战术撤离判定"公式小节；`LOG.md`/`LOG-INDEX.md` 追加本条。
- **涉及文件**：`index.html`、`README.md`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：需求将"撤离"的入口与"战局记录查看"解耦——记录是纯查看功能（不应占用放弃战斗的高风险入口），撤离变为有策略代价的行动（消耗一回合且不再稳成）。判定借用与命中/闪避一致的 roll 范式（以实时平均速度为上限、我方更大即成功），并复用上一轮的速度有效值体系，使速度增减能自然地影响撤离成功率，形成"提速提升逃跑成功、被缓拖累更难逃脱"的玩法联动。按用户要求撤离按钮样式与普攻/技能/防御三者一致、文案为【💨 尝试撤离】。

## [LOG-065] 2026-08-17 — 新增【舍身】标签：目标闪避失败后替其承受攻击（必中、全盘接下，合并进反应弹窗）（V6.13）

- **变更行为**：
  1. **技能解析**（`parseSkill`，index.html:4146-4149）：新增 `[舍身]`（全能）/`[舍身:近战|远程|法术]`（类型匹配）标签解析 → 技能字段 `sheshenTarget`，加入技能对象规范（index.html:4205）。新增兼容读取 `getSheshenTarget(skill)`（index.html:5409-5420，仿 `getKanpoTarget`，兜底扫描类型槽旧数据）。
  2. **触发时机与弹窗**：触发时机**不在看破同级**，而是下放到**目标闪避失败后**——与反应技能**合并进同一个弹窗**（`promptReaction` 扩展第 5 参 `sheshenCandidates`，index.html:5818）。弹窗渲染反应紫分区 + 舍身钢蓝分区（舍身按钮展示守护者头像/名字/技能名/消耗/[限N次]）；目标无反应技能时弹窗仅含舍身分区并切换钢蓝主题（等效"为舍身者新建弹窗"）。
  3. **候选收集**（`applySingleTagEffect` 反应拦截块，index.html:5944-5962）：目标闪避失败后，扫描**其他存活我方角色**的舍身技能；门槛同反应（MP/HP/TP、[限N次] 未用尽）、类型匹配同看破（`incomingDamageType` includes 双向匹配）；**仅限单体攻击（`!tag.includes('群')`，群攻 v1 不触发）**；屏障在场期间攻击被归集命中屏障伪目标、英雄不被选中，天然不进入此处。
  4. **舍身结算分支**（index.html:5975-5999）：扣守护者 MP/HP/TP + [限N次] → `updateHeroUI` → 日志 `🛡️ B 施展【技能】舍身护佑，替 X 承受攻击！` → 轻量演出（`spawnFocusOverlay` 聚焦暗化 + 钢蓝 `spawnChargeUpParticles` 粒子）→ **`target`/`targetDom` 切换为守护者**，后续伤害管线（屏障/防御/护盾/免伤/毅力留存/受击+10TP）对守护者完整结算——**全盘接下**、跳过闪避（必中）；原目标毫发无伤。若守卫者被击倒，`_pendingKills`/击杀特写流程自动适用。
  5. **反应分支**：原反应流程不变（含二次闪避"弹开"攻击），弹窗返回值从裸 skill 改为 `{type, hero, skill}` 合并候选对象，反应项取 `.skill`。
  6. **面板与编辑器**：`updateMenu`（index.html:7593）主动面板排除舍身技能；敌方 `validSkills`（index.html:7167）追加 `!s.sheshenTarget` 防御性排除；英雄技能编辑器新增"舍身"下拉（无舍身/全能/近战/远程/法术，index.html:7804）+ `syncEditorDataToMemory` 读回（index.html:7844）；`addHeroSkill` 默认模板加 `sheshenTarget: null`（index.html:7943）；`serializeHeroesForSave` 持久化加 `sheshenTarget`（index.html:8068）。
  7. **设计边界**：与【看破】的优先级关系由阶段天然保证——看破在技能宣告阶段（`BEFORE_SKILL_RESOLVE`）拦截、成功即吞掉整技，舍身在目标闪避失败后才触发，故看破优先级永远在舍身之上；【必中】不豁免舍身（必中仅跳过被动闪避 roll，仍可被主动化解）；多标签技能逐标签独立弹窗（与反应机制一致）。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`（README 待用户确认后更新）。
- **决策原因**：需求希望【舍身】与【看破】同属"打断类"但优先级在其之下，且原定的"看破同级触发"过于频繁——遂按用户指示将时机迁移到目标闪避失败后、并入反应弹窗（若目标无反应技则独立弹窗），使舍身成为反应层级的"守护向"选项（反应=自救、舍身=护人）。群攻半挡方案经评估需重构 AOE 逐目标独立结算循环（跨目标伤害累加、半份伤害的减伤归属与反应弹窗连锁均存在歧义），复杂度高，按用户确认 v1 仅单体触发。承接范围按用户确认为"全盘接下"（伤害与附带减益全部由守护者承受，模型连贯）。舍身本身"跳过闪避、必中"由"承接者已进入受击管线"自然实现（无需额外 roll），硬解释为替身挡下攻击；目标反应技若选择，仍以二次闪避"弹开"攻击，与舍身互斥。

## [LOG-066] 2026-08-17 — 修复【舍身】承接者无法触发自身反应技能（守护者承接后可二次化解，提取 runReactionIntercept）

- **变更行为**：
  1. **重构反应/舍身拦截**：将目标闪避失败后的拦截逻辑提取为独立辅助函数 `runReactionIntercept(caster, target, skill, hitChance, incomingDamageType, sheshenCandidates)`（index.html:5882 附近，位于 `promptReaction` 与 `applySingleTagEffect` 之间），返回 `{ dodged, guardian, usedSheshen }`：
     - 收集目标自身反应技能（原过滤逻辑原样迁入）+ 传入的舍身候选 → 我方合并弹窗 / 敌方 AI 随机；
     - 舍身分支：扣守护者 MP/HP/TP + [限N次]、日志、钢蓝聚焦演出，返回 `{ usedSheshen: true, guardian }`；
     - 反应分支：释放反应技 + 二次闪避判定（原逻辑原样迁入），返回 `{ dodged }`；
     - 无候选或放弃：返回 `{ dodged: false }`，调用方继续受击管线。
  2. **守护者二次化解**（index.html:6044-6050）：`applySingleTagEffect` 主拦截块检测到舍身生效后，将 `target` 切换为守护者，随后**再次调用 `runReactionIntercept`（无舍身候选，防连锁舍身）**——守护者现在可用**自身反应技能**（如 `[回避]`）做二次化解，若二次闪避成功则 `isDodged = true`，走既有闪避成功分支（飘字/反击判定均对守护者结算）；无反应技能时早返回、正常承接伤害。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：实测发现舍身格挡后，守护者自身持有的反应技能（如身法 `[回避]`）完全不生效——因为守卫者承接伤害的"必中"把受击管线整体跳过，与其"反应技可把攻击弹开"的设定矛盾。修复后守护者承接后仍可主动化解，与普通受击者的反应机制对齐；但不再提供连锁舍身（守卫者不可再指定另一人替自己），避免 A→B→C 无限转移。用户确认问题①（编辑器无舍身标签/显示为近战）为测试误报：舍身下拉正常渲染于看破下拉右侧，第一类型槽默认 `[单体]` 与伤害类型"无(近战)"是既有默认行为，非本功能缺陷，不予改动。

## [LOG-067] 2026-08-17 — 新增【场地】战前准备效果系统：我方列表行支持 (场地:xx) 后缀标签

- **变更行为**：
  1. **协议扩展**：`<Combat_block>` YAML 的 `我方列表` 行支持后缀 `(场地:xx)`（如 `我方列表(场地:有备而来):`）；`敌方列表` 不支持。解析（`index.html` `resolveHeroListKey`）扫描 `Object.keys(block)` 中 `startsWith('我方列表')` 的键 + 正则 `场地:([^)\]]+)` 提取场地名，兼容带后缀/不带后缀两种键名——**顺带修复了"带后缀键使 `block["我方列表"]` 取不到导致整队静默变空"的隐患**。
  2. **场地注册表 `FIELD_EFFECTS`**（index.html:4048）：每条目含 `desc`（徽章描述）、`buffs`（回合型 buff 模板）、可选 `onApply(heroes)`（开局一次性）。当前收录 10 个场地：
     - 回合型（`buffs` 注入，带 `fieldBuff: true` 标记）：【有备而来】hit+30×3、【猝不及防】eva-20×1（本人第一回合行动后消失）、【背水一战】atk+15×3、【严阵以待】def+15×2、【居高临下】spd+10×2、【劳师远征】spd-10×2、【雾霭弥漫】hit-10+eva+10×9999。
     - 开局一次性（`onApply`）：【士气高涨】全体 TP+20、【补给充沛】全体 MP+30% 上限、【装备精良】全体护盾=MaxHP×20%（取较大值）。
  3. **注入时机**（`applyFieldEffects`，`buildCombatDataFromYAML` 内、`heroesData` 赋值后 / `initialHeroesCache` 快照前）：buff 与资源进入重置缓存 → **resetBattle 后场地效果保留**；职业被动 `onBattleInit` 在其之前执行，互不干扰。未知场地名忽略并 `console.warn`（列出可用场地），战斗正常建立。
  4. **机制复用（零特判）**：`hit/eva` buff 自动被命中公式与 `getEffectiveStats` 读取；`spd` buff 自动被 `getEffectiveSpeed` 读取（排轴+撤离判定，不写回基础 `spd`、不影响闪避）；衰减语义 = 该角色每回合**首次（非额外）行动**时 `duration--`（`nextTurn` 的 `!isExtraTurn` 守卫），**再动/多重施法/多动额外行动不消耗场地回合**；【猝不及防】的 eva-20 天然不影响反应技能（反应二次判定只读"本次反应新加的 eva buff"）。
  5. **不可驱散**：`【驱散】handler`（index.html:4926）负面谓词追加 `!b.fieldBuff` 守卫——场地 debuff 无法被净化，普通 debuff 不受影响。
  6. **UI 展示**：`initUI` 在 `heroes-container` 重建 `FIELD_BADGE_HTML` 场地徽章（🏟️ 场地名，hover 显示描述，无场地时隐藏）；`startGame` 开场写入战局日志 `🏟️ 场地：xxx — 描述`。
  7. **用户实测反馈修订**：① 全角冒号兼容——正则 `场地:([^)\]]+)` 扩展为 `场地[:：]([^)\]]+)`，支持 `(场地：有备而来)` 全角冒号写法（用户输入即为此格式，修复后生效）；② 徽章位置——按用户要求由战场顶部悬浮改为**右上角按钮区、【记录】按钮左侧**（`index.html` 顶部控制区静态 HTML `#field-badge`，样式与记录按钮一致，`group-hover` 在徽章下方弹出效果描述），移除原 `FIELD_BADGE_HTML` 动态注入与重建逻辑，`updateFieldBadgeUI` 仅控制显示/名称/描述。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`（README/SPEC 待用户确认本轮有效后更新）。
- **决策原因**：需求为跑团战前准备阶段提供"场地"抽象——在战斗开始时为我方注入对应 buff/debuff，无标签即无效果。与用户厘清三个关键设计：①【猝不及防】应为"本人第一回合行动后消失"的突袭语义（已按此实现，其余回合型效果口径与全游戏「持续 N 回合」buff 一致）；②场地效果为战前环境状态，不可被【驱散】清除（`fieldBuff` 标记）；③全部复用既有 buff 体系（type/duration/衰减/显示），仅新增注册表与键名解析，改动面最小。回合计数采用 `state.round`（第 1 回合期间恒为 1），开场日志用于场地效果可溯源。

## [LOG-068] 2026-08-18 — 新增【世界书】敌方数据载入系统 + 敌方名字 `*N` 数量后缀（V6.15 代码先行）

- **变更行为**：
  1. **敌方名字 `*N` 数量后缀**：`名字: "❄️《冰雪随从》*2"` 表示载入 2 个该敌人（独立列表项、仅敌方列表生效）。新增 `parseNameMultiplier`（index.html:4150，兼容半角 `*` 与全角 `×`，count=0 时跳过该敌人）；敌方构建循环改为先拆 `{baseName,count}` 再按 count 循环 `parseEnemyItem` 展开（index.html:4358-4366），`*2` 不进显示名、id 用 `'e'+tempEnemies.length` 保证唯一、`AVATAR_MAP` 兜底改用 baseName。同时从敌方循环提取独立辅助函数 `parseEnemyItem(data, index)`（index.html:4315），供 YAML 敌方循环与图鉴条目解析复用（属性/技能/职业被动 onBattleInit 逻辑原样迁入）。
  2. **准备页按钮拆分**：`#start-btn` 单按钮替换为 `#start-actions` 容器双按钮——**【🧾 Yaml 载入】**（`onclick="startGame()"`，保持原逻辑）+ **【📚 世界书载入】**（`onclick="startGameFromWorldbook()"`，新逻辑）；`onCombatDataReceived` 改为显示按钮组并按 `isWorldbookAvailable()` 控制世界书按钮显隐。
  3. **世界书核心系统**（index.html:4376 起，`buildCombatDataFromYAML` 之后新增区块）：
     - **持久化**：`WORLDBOOK_VAR_KEY='rpg_combat_worldbook_settings'`（localStorage，仿 defendSettings 模式），`worldbookSettings = { boundName, entries }`（entries[uid]={enabled}，未记录=默认启用），`loadWorldbookSettings`/`persistWorldbookSettings`。
     - **读取**：`isWorldbookAvailable()`（检测酒馆助手 `getWorldbook`/`getWorldbookNames`）；`loadWorldbookData()`（async，`await getWorldbook(boundName)` → `worldbookCache` + `buildWorldbookIndex()` 以词条名+别名 keys 建小写检索表）；`isWorldbookEntryEnabled(entry)`。
     - **匹配**：`resolveWorldbookEnemy(name)` —— 剥离 emoji 后 ①词条名精确 ②别名精确 ③双向包含（≥2 字防误匹配），返回词条（由索引或遍历兜底）。
     - **载入**：`parseWorldbookEntryEnemy(entry)` 从词条 content 正则提取内嵌 `<Combat_block>` 并用 `jsyaml.load` 解析为 `{名字,属性,技能}`（已实测图鉴 29 个条目全部可解析）；`startGameFromWorldbook()`（async）——已开战提示、未绑定/未加载时自动加载，遍历 `enemiesData` 按名字匹配（含别名/包含），命中 → `parseEnemyItem` 完整替换（保留原槽位 id，名字/属性/技能以图鉴为准），未命中 → 原样保留；`addHistory` 写 `📚 图鉴载入：xxx → 条目「yyy」` + 命中统计；全部未命中则提示不开始；重新快照 `initialEnemiesCache`（重置后保留图鉴数据）→ `initUI()` → `startGame()`。
  4. **右上角【📚 世界书管理】按钮**：插入顶部按钮区场地徽章与【记录】之间（index.html:827，样式与其他按钮一致，`onclick="openWorldbookManager()"`）；非酒馆环境由 `updateWorldbookBtnVisibility()`（index.html:4393）隐藏（启动时 + initUI 两处调用）。
  5. **世界书管理弹窗** `#worldbook-modal`（index.html:936）：复刻 battle-history-modal 三段式骨架（`z-[120]` 500ms 淡入淡出），body 由 `renderWorldbookManager()` 动态渲染三个区块——①**绑定世界书**：下拉框（`getWorldbookNames()` 全量 + 未绑定，选中即持久化）+「🔄 刷新」按钮；②**词条列表**：全部词条（名称 + 启用开关 checkbox + 「查看」按钮），开关切换即时持久化并重渲染，查看弹条目 content 原文；③**当前载入敌人**：当前 `enemiesData`（名字/HP/技能数摘要）。底部「关闭」。
  6. **环境降级**：非酒馆助手环境（无 `getWorldbook`）隐藏右上角入口与准备页世界书按钮，Yaml 载入流程完全不受影响。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`（README/SPEC 待用户确认本轮有效后更新）。
- **决策原因**：需求①为敌方图鉴化提供"名字点名即可精确载入"路径——LLM 无需手写属性/技能，避免摘录幻觉；与用户确认四项决策：**按敌方名字匹配**（LLM 照旧输出名字即可）、**未命中保留 LLM 原样数据**（图鉴外临场新敌人不受影响）、**localStorage 持久化**（绑定名+开关状态数据量小，与现有持久化模式一致）、**非酒馆环境隐藏并提示**（世界书接口依赖酒馆助手 iframe 环境）。需求②为跑团多敌场景——`*2` 乘数后缀仅敌方列表生效（我方靠编辑器/持久化维护，数量固定），独立列表项写法避免 js-yaml 重复键冲突；`parseEnemyItem` 提取为共用辅助函数，Yaml 路径与世界书路径天然共享同一解析管线（含职业被动 onBattleInit），保证两条载入路径行为一致。

## [LOG-069] 2026-08-18 — 世界书系统实测反馈修订：自动绑定角色卡世界书 + 管理面板搜索/置顶/二级滚动 + 载入按钮配色统一

- **变更行为**：
  1. **自动绑定世界书（修复"不绑定进不去"交互死锁）**：新增 `autoBindWorldbook()`（index.html:4587，位于 `worldbookNamesList` 后）——已手动绑定则保持；未绑定时依次尝试 `getCharWorldbookNames('current')` 的 `primary` → `additional[0]`，兜底 `getChatWorldbookName('current')`，命中即写入 `worldbookSettings.boundName` 并持久化。接线三处：① 启动序列 `autoBindWorldbook()`（index.html:9071）；② `startGameFromWorldbook()` 未绑定分支改为先 `autoBindWorldbook()`，仍无则提示手动绑定；③ `openWorldbookManager()` 打开时未绑定自动绑定，且已绑定未加载时自动 `refreshWorldbookData()` 拉取词条。启动后若自动绑定成功，后台异步 `loadWorldbookData()` 预加载词条（失败静默），点击【世界书载入】即可直接使用。
  2. **管理面板重构（搜索 + 激活置顶 + 二级滚动）**：`renderWorldbookManager()` 重写为四个独立区块，每块自带滚动（`max-h` + `overflow-y-auto custom-scrollbar`），消除信息挤压——① **绑定世界书**：下拉 select 改为**可搜索名称列表**（`#worldbook-name-search` 过滤，`renderWorldbookNameList()` 渲染 ○/● 单选行，点击即绑定）；② **词条列表**：新增搜索框（`#worldbook-entry-search`，匹配词条名+别名 keys）+ **启用词条置顶排序**（`isWorldbookEntryEnabled` 分组后 stable sort）+ 条目计数 `（x/y）`；③ **当前载入敌人** 独立滚动区；④ **词条数据预览** 折叠面板。`renderWorldbookEntryList()` 改为写 DOM（含空态与计数），`toggleWorldbookEntry` 改走新渲染函数。
  3. **准备页【世界书载入】按钮配色**：由紫色渐变改为与【Yaml 载入】一致的 `from-gray-800 to-gray-700` + `text-blue-100`（整体风格统一，仅文案区分）。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`（README/SPEC 待用户确认本轮有效后更新）。
- **决策原因**：用户实测反馈三点——① 原设计"未绑定则提示手动绑定"在角色卡已绑定世界书的酒馆环境构成交互死锁（不进管理面板无法绑定、但进入准备页点载入又拦在前面），按反馈改为**自动继承角色卡绑定的世界书**（primary → additional 优先，聊天文件兜底），手动绑定仍优先；② 原面板三区块共享一个滚动容器、词条多时信息拥挤不可读，按反馈改为**每区块独立二级滚动**，并新增世界书/词条双搜索框与**激活词条置顶**（启用在前便于快速确认生效词条）；③ 载入按钮原为紫色渐变、与整体蓝灰风格突兀，按反馈统一为 Yaml 按钮同款配色。


## [LOG-070] 2026-08-18 — 准备页新增世界书选择下拉 + 修复 COC7 人类 NPC 图鉴 V1/V2 加载失败（缺顶层 name 字段）

- **变更行为**：
  1. **准备页【世界书载入】入口升级**：`#worldbook-start-btn` 由裸按钮升级为 `#worldbook-start-wrap` 容器（按钮 + 下拉选择器 `#worldbook-start-select`，与 Yaml 按钮同风格、容器 `flex-col items-center`）。新增 `initWorldbookStartPicker()`（index.html:4406，位于 `updateWorldbookBtnVisibility` 后）填充下拉：`worldbookNamesList()` 全部可用世界书 +「（选择要载入的图鉴世界书）」空项，默认选中当前绑定名；下拉 `onchange="bindWorldbook(this.value)"` 即时绑定。`onCombatDataReceived` 显隐逻辑改为控制 `worldbook-start-wrap`（酒馆环境才显示）。`startGameFromWorldbook()` 载入时**优先采用下拉选中值**（`picked` 与当前绑定不同则改写绑定并持久化），再回退 `autoBindWorldbook()`，彻底绕开"绑定世界书里没有怪物却弹错误"的死锁路径。
  2. **COC7-人类NPC战斗图鉴 V1.0/V2.0 加载失败修复（根因）**：诊断确认——两本图鉴 JSON 顶层**缺失 `name` 字段**（仅有 `entries`），而 SillyTavern 导入世界书时世界书名称取自顶层 `name`，缺失时回退默认名 → 前端按自动绑定名 `getWorldbook(boundName)` 抛"世界书不存在" → 显示加载失败（正常图鉴均有 name，与"其他正常"现象吻合）。**修复**：给两本 JSON 补顶层 `name`（`COC7-人类NPC战斗图鉴V1.0` / `V2.0`），导入后名称稳定、可被精确匹配。两本均为 19 条（18 条含内嵌 `<Combat_block>`，1 条 overview 索引）。
  3. **加载失败容错**：`refreshWorldbookData()` 与 `startGameFromWorldbook()` 的读取失败 alert 均追加**当前可用世界书清单**（`worldbookNamesList()` 逐行列名），帮助识别名称不匹配/未导入的问题，不再只给一句笼统报错。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`、`C:/Users/ELevin/Desktop/奈亚拉托提普的面具/COC7-人类NPC战斗图鉴V1.0.json`、`COC7-人类NPC战斗图鉴V2.0.json`（桌面图鉴数据）。
- **决策原因**：① 上一版自动绑定依赖"角色卡绑定的世界书恰好是怪物图鉴"，当绑定世界书无怪物时点载入会直接报错且无法在本页纠正——按用户要求改为**准备页就地选择世界书**（最干脆），下拉选中即生效，载入逻辑优先用用户显式选择，自动绑定仅作兜底；② 用户实测"两本人类 NPC 图鉴加载失败、其他正常"，差异恰在顶层 `name` 字段缺失导致导入名回退，补上后导入名与绑定名一致即可正常加载；③ 失败提示列出可用世界书，避免"不知道有哪些名字可选"的二次困惑。

## [LOG-071] 2026-08-18 — 世界书管理弹窗重构为现代两列布局 + 修复当前载入敌人不显示 bug（V6.17 代码先行）

> ⚠️ **回退记录**：本改动（V6.17）在实测中出现严重 bug，`index.html` 已整体回退至 `f9ae832`（V6.16 状态）。本条目仅保留为历史记录，不再代表当前代码，详见 LOG-072。

- **变更行为**：
  1. **修复「当前载入敌人」不显示的 bug（根因）**：`renderWorldbookLoadedEnemies()`（index.html:4690）原实现**只调用却没有把返回值写入容器**——`renderWorldbookManager()` 中 `renderWorldbookLoadedEnemies();` 丢掉了返回的 HTML 字符串，导致 `#worldbook-loaded-enemies` 容器永远停留在初始占位、激活敌人从不展示。重构后该函数改为**直接写入容器**（`box.innerHTML = ...`），底部通栏正确展示当前 `enemiesData` 摘要（名字 · HP · 技能数）。
  2. **弹窗重构为现代两列布局**（左右比例约 1:4）：`#worldbook-manager-body` 由单列堆叠改为 **`flex gap-3` 两列主区 + 底部通栏敌人区三层结构**——**左列（w-[20%] min-w-[160px]）**为世界书列表（📚 世界书 + 🔄 刷新 + 搜索框 + 可滚动名称单选框 + 绑定信息）；**右列（flex-1 min-w-0）**为词条列表（🗂️ 词条列表计数 + 搜索框 + 可滚动词条行）；**底部通栏**为当前载入敌人（⚔️ 当前载入敌人，max-h-[20vh]）。外层 `worldbook-manager-body` 由 `overflow-y-auto` 改为 `overflow-hidden`，主区两列 `flex-1 min-h-0` + 各自 `overflow-y-auto`，实现**左右两列表格各自独立滚动、不再整窗滚**。
  3. **搜索栏摆放**：左列顶部世界书搜索（`#worldbook-name-search`）、右列顶部词条搜索（`#worldbook-entry-search`），各管其列。
  4. **词条详情改为内嵌展开正文**：移除 `#worldbook-detail-panel` 独立预览面板（含 `showWorldbookEntryDetail`/`closeWorldbookDetail`/detail DOM），词条行新增 **▶/▼ 展开按钮**调用 `toggleWorldbookEntryExpand()`（index.html:4700）在该行下方内嵌显示词条 `content` 原文（`whitespace-pre-wrap font-mono`、`max-h-40 overflow-y-auto` 防爆长文）。词条行由「展开按钮 + 启用开关 + 名字」组成；`renderWorldbookEntryList()` 改为直接写容器；`toggleWorldbookEntry()` 同步改为直接重渲染。**展开状态持久化**：模块级 `worldbookExpanded` 集合（index.html:4407）记录已展开 uid，经 `worldbookSettings.entries[uid].expanded` 写入 localStorage（`loadWorldbookSettings` 恢复），关闭弹窗重开仍保留各词条展开/收起状态。
  5. **XSS 防护**：新增 `escapeHtml()`（index.html:4740），词条名与敌人名输出统一转义（原「查看」用 textarea 赋值天然安全，改为 innerHTML 内嵌展开后必须转义）。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`（README/SPEC 待用户确认本轮有效后更新；桌面图鉴 JSON 未改动）。
- **决策原因**：① 需求为「当前激活敌人未显示 + 优化窗口布局」——前是因**渲染函数返回值未落容器**的疏漏；后参考现代 PC 软件两列（左右约 1:4~5，左选世界书、右看词条），词条详情按**用户在讨论中明确「不需要分组树、保持扁平列表、详情改为内嵌展开正文」**实现，故移除独立预览面板改为条目内嵌展开；② 外层改 `overflow-hidden` 让左右两列各自滚动，符合现代列表窗口「分区滚动」体验；③ 转义词条名/敌人名属数据安全底线，避免世界书词条内容直接注入 innerHTML 造成 XSS。

## [LOG-072] 2026-08-18 — V6.17 世界书弹窗两列布局重构实测出现严重 bug，整体回退至 V6.16

- **变更行为**：
  1. **整体回退**：V6.17 代码先行版（`index.html` 世界书管理弹窗两列布局重构）在实测中出现严重 bug，用户已将主文件回退至 `f9ae832`（HEAD）。回退后管理弹窗恢复为 V6.16 的分区块二级滚动布局（① 绑定世界书 ② 词条列表 ③ 当前载入敌人 ④ 词条数据预览），V6.17 的两列布局、词条行内展开正文（`toggleWorldbookEntryExpand` / `worldbookExpanded` 持久化）、`escapeHtml`、`renderWorldbookLoadedEnemies` 返回值落容器等改动**全部撤销**——V6.17 曾修复的「当前载入敌人不显示」旧 bug 随之复现（该函数仍只返回字符串未写入容器，index.html:4691）。
  2. **版本**：当前代码保持 V6.16（世界书 V6.15/16 功能完整保留：准备页世界书选择下拉、`*N` 数量后缀、自动绑定三处接线 + 后台预载、双搜索/激活置顶、加载失败列出可用世界书）；V6.17 不落地。
  3. **文档同步**：README 版本号对齐 V6.16 并补世界书系统说明（不含已回退的 V6.17）；LOG-071 保留为历史记录并标记已回退；LOG-INDEX 同步更新。
- **涉及文件**：`index.html`（用户回退）、`LOG.md`、`LOG-INDEX.md`、`README.md`。
- **决策原因**：用户实测 V6.17 重构出现严重 bug，优先保障管理弹窗可用性而选择**整体回退**（而非逐条修补），后续再另起迭代重做该 UI 优化；文档先行同步回当前真实代码状态，避免 README/LOG 描述与代码不一致误导后续施工。

## [LOG-073] 2026-08-18 — 世界书管理弹窗两列布局重构（comment 分组树+行内展开）+ 修复敌人通栏 bug + 轮询卡死加固（V6.18 代码先行）

> ⚠️ **回退记录**：V6.18 代码先行版在用户实测中**仍卡在「等待 LLM 输出正则标签」**（刷新浏览器/切换浏览器/重启酒馆均复现），而 V6.16 版本正常——判定改动引入了回归，`index.html` 已整体回退至 `f9ae832`（V6.16）并仅保留 LOG-074 的最小修复。本条目仅保留为历史记录，不再代表当前代码。

- **变更行为**：
  1. **修复「当前载入敌人」不显示 bug（根因）**：`renderWorldbookLoadedEnemies()`（index.html:4718）改为**直接写入容器**（`box.innerHTML = ...`，原实现只 return 字符串、`renderWorldbookManager` 裸调用丢弃返回值导致容器永远空白）；并按名字**聚合 `*N` 展开后的敌人数量**（`*N` 在构建期展开为独立敌人、对象无 count 字段，前端 Map 聚合）——`食尸鬼*2` 显示为 `食尸鬼 ×2`，一行一个名字。
  2. **弹窗重构为现代两列布局**（左右约 1:4.5）：`#worldbook-manager-body` 由单列堆叠改为 **`flex gap-3` 两列主区 + 底部通栏敌人**三层结构——**左列（w-[22%] min-w-[170px]）**📚 世界书列表（🔄 刷新 + 搜索 + 可滚动单选行 + 绑定信息）；**右列（flex-1 min-w-0）**🗂️ 词条列表（计数 + 搜索 + 可滚动分组树）；**底部通栏**⚔️ 当前战斗敌人（max-h-[20vh]）。外层由 `overflow-y-auto` 改 `overflow-hidden`，左右两列 `flex-1 min-h-0` + 各自 `overflow-y-auto` 分区滚动，不再整窗滚。
  3. **词条列表改为 comment 分类分组树**：`renderWorldbookEntryList()`（index.html:4657）重写为分组树渲染（直接写容器）——分组键取 `(entry.comment||'').trim()` 首分类（`split(/[,，]/)[0]`），空归「未分类」且排最后；组行 `[▶/▼] 组名 (启用数/总数)` 点击折叠/展开整组；词条行 `[▶/▼] [启用checkbox] 词条名`，▶/▼ 行内展开显示词条 `content` 原文（`whitespace-pre-wrap font-mono max-h-40 overflow-y-auto` 防爆长文）；组内保持**启用置顶 + 中文名稳定排序**；搜索非空时强制展开全部组以展示命中项。新增 `toggleWorldbookEntryExpand(uid)`（词条展开状态存 `worldbookSettings.entries[uid].expanded`，**保留 enabled 位向后兼容**既有 localStorage）与 `toggleWorldbookCategory(name)`（分类折叠存 `worldbookSettings.catCollapsed[组名]`，`loadWorldbookSettings` 恢复、`persistWorldbookSettings` 整体序列化已覆盖）。
  4. **移除词条数据预览面板**：删除 `showWorldbookEntryDetail` / `closeWorldbookDetail` 函数与 `#worldbook-detail-panel` DOM（原「查看」按钮改为行内展开正文，不再需要独立预览面板）。
  5. **XSS 防护**：新增 `escapeHtml()`（index.html:4780），词条名/组名/content/世界书名输出统一转义；世界书名称列表与词条行交互改 **`data-*` 属性传值 + `onclick="fn(this.dataset.xx)"`**（世界书列表由 `onclick="bindWorldbook('${n}')"` 内联字符串改为 `this.dataset.name`，绕开名字含引号时内联进 JS 源码字符串的隐患）。
  6. **轮询卡死加固（Bug C，避免卡在「等待 LLM 输出正则标签」）**：`startSTPolling()`（index.html:4745）两处消息读取由只读 `actualMsg.message` 单字段改为字段兼容 `message || mes || content || raw_content`（与 `callLLMAPI` index.html:9029 同口径——SillyTavern 原生消息字段为 `mes`，仅 JS-Slash-Runner 用 `message`，单字段读取在环境切换时永远扫不到）；`<Combat_block>` 检测由 `lastIndexOf` 精确匹配（大小写敏感、不兼容空白）改为惰性正则 `/<Combat_block>([\s\S]*?)<\/Combat_block>/i`（与 `parseWorldbookEntryEnemy` 同款）。轮询频率 1s、5 秒兜底提示、顶层同步初始化顺序均未改动。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`（README 待用户确认本轮有效后更新）。
- **决策原因**：① 用户实测反馈「当前激活敌人未显示」——根因是渲染函数返回值未落容器（V6.17 曾修复过、随整体回退而复现），本次直接改为写容器并顺带按名字聚合 `*N` 数量（用户测试数据 `食尸鬼*2` 场景）；② 用户按示意图要求现代 PC 软件两列布局（左右约 1:4~5，左选世界书、右看词条）+ 词条按分类分组树 + 行内展开正文——分组数据源经与用户确认采用 **SillyTavern 词条标准 `comment` 分类字段**（此前从未使用，未填分类的词条归「未分类」组）；③ 卡死在「等待 LLM 输出正则标签」经逐字节 diff 排查确认与 V6.17 改动**零交集**（114 行 diff 全在弹窗内部），真正脆弱点是轮询单字段读取 + 标签精确匹配，本次加固两点（字段兼容 + 惰性正则）以彻底避免环境切换时的无限等待；④ XSS 转义与 data-* 传值属数据安全底线，词条 content/名字/组名/世界书名均来自外部导入数据，不得直接注入 innerHTML。

## [LOG-074] 2026-08-18 — V6.18 世界书弹窗重构实测仍卡死，整体回退 V6.16 + 仅修复「当前载入敌人不显示」最小改动

- **变更行为**：
  1. **整体回退**：V6.18 代码先行版（世界书管理弹窗两列布局 + comment 分组树 + 轮询加固）在用户实测中**仍卡在「等待 LLM 输出正则标签」**——刷新浏览器、切换浏览器、重启酒馆均复现，而切换回 V6.16 立即正常。判定改动引入回归（范围与 V6.17 完全一致，连续两次整体回退，期间用户实测正常版本均未包含这些改动），`index.html` 已 `git checkout` 回退至 `f9ae832`（V6.16）。
  2. **最小修复（唯一保留的代码改动）**：`renderWorldbookLoadedEnemies()`（index.html:4691）由「只 return 字符串」改为**直接写入容器** `box.innerHTML = ...`（`renderWorldbookManager` 在 4636 行裸调用、原返回值被丢弃导致「当前载入敌人」永远空白）。**仅此一处 6 行改动**，其余 V6.18 全部功能（两列布局/分组树/轮询加固/escapeHtml）均未保留。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`（README 维持 V6.16 现状，无需改动）。
- **决策原因**：① 用户明确要求「一步一步来」——先回到已知正常的 V6.16，优先解决最容易确认的激活敌人显示 bug；② V6.16 在用户环境实测正常，任何超出该基线的改动都可能与卡死相关，因此**采用手术式最小改动原则**：只修一个 bug、不叠功能；③ 卡死根因至今未明（逐字节 diff 显示改动与轮询零交集，但用户实测证明改动版必卡、基线版必不卡），需要后续用"基线 + 单项功能逐步叠加"的方式定位，本轮不做任何猜测性加固。
- **版本确认**：用户实测本轮改动无误，版本号定版为 **V6.20**（V6.17~6.19 均因严重 bug 回退未落地），README 同步更新。

## [LOG-075] 2026-08-18 — 第 0 步：诊断探头（全局异常红条 + 轮询/初始化打点，纯观察零行为变化）

- **变更行为**：
  1. **全局异常捕获（`<script>` 开头，index.html:1026 起）**：自执行 IIFE 注册 `window.addEventListener('error')` / `unhandledrejection` / `window.onerror`，错误收进 `window.__dbgErrors`（最多 20 条），首次出错时**惰性创建顶部红条**（`fixed top:0 inset-inline:0 z-index:99999`，白字列表含时间/消息/来源/行号，最多 5 条、超出滚动），无错时不占任何 DOM；红条渲染自身包 try/catch，探头不许成为新 bug 源。**只新增 fixed 覆盖层，不触碰任何现有 DOM/逻辑**。
  2. **`startSTPolling` 打点（index.html:4787 起）**：函数入口 `CRITICAL_LOG: 7. startSTPolling entered`；setInterval 回调**首轮** tick `CRITICAL_LOG: 8. ST polling tick #1`（仅打首轮防刷屏）；5 秒兜底 setTimeout 触发 `CRITICAL_LOG: 9. ST polling 5s fallback fired`（说明轮询在跑但未扫到 Combat_block）。
  3. **顶层初始化序列细化打点（index.html:9159 起）**：`5.1 loadLLMSettings() before` → `5.2 done` → `5.3 loadWorldbookSettings() before` → `5.4 done -> boundName=xx` → `5.5 autoBindWorldbook() before` → `5.6 done -> boundName=xx` → `5.7 loadWorldbookData() start/无绑定跳过` → `5.8 done ok=xx / FAILED`（`loadWorldbookData().catch(()=>{})` 改为 `.then(...).catch(...)` **仅追加打点，行为不变仍静默**）；`startSTPolling()` 后新增 `10. startSTPolling invoked`。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：V6.17/V6.18 两次整体回退均"改动版必卡、基线版必不卡"，但逐字节 diff 显示改动与轮询/加载页零交集——静态分析只能证明"代码没写错"，无法证明"运行时无异常"，且 `loadWorldbookSettings`/`autoBindWorldbook`/`loadWorldbookData` 均有 try/catch 吞异常、无红错。故本次**零行为变化**只加观测：①全局异常红条兜住"异常被吞"盲区；② 7/8/9 打点补齐用户日志缺失的"初始化完成之后"环节（7 未出=初始化中断，8 无 9 有=轮询在跑但扫不到，全无=脚本未执行到 startSTPolling）；③初始化每步打点定位具体中断点。为后续"基线+单项功能逐步叠加"（两列布局→分组树→行内展开）提供可复现的定位手段。

## [LOG-076] 2026-08-18 — 第 1 步两列布局实测通过，用户确认当前布局已满足需求，跳过后续功能步骤，定版 V6.22

- **变更行为**：
  1. **第 1 步两列布局（纯 HTML 模板重构，功能零变化）**：`renderWorldbookManager()`（index.html:4642）模板由单列堆叠改为 **`flex gap-3` 两列主区 + 底部通栏敌人**——左列 `w-[22%] min-w-[170px]` 世界书列表（可搜索单选行 + 🔄 刷新 + 绑定信息）、右列 `flex-1 min-w-0` 词条列表（搜索 + 启用置顶 + 独立滚动）、底部通栏「⚔️ 当前战斗敌人」（max-h-[20vh]）；外层 `#worldbook-manager-body` 由 `overflow-y-auto` 改 `overflow-hidden`，左右两列各自 `overflow-y-auto` 分区滚动。**渲染函数（renderWorldbookNameList/EntryList/LoadedEnemies）、detail 预览面板、轮询、初始化序列全部原样未动**（仅保留第 0 步诊断探头）。
  2. **跳过后续步骤**：按用户决定，当前两列布局已满足需求，**不再实施** 第 2 步词条分组树（comment 分类）、第 3 步行内展开正文/XSS 防护/移除 detail 面板——`renderWorldbookEntryList` 保持扁平列表 + 启用置顶，词条「查看」仍走独立预览面板。
  3. **版本定版 V6.22**：README 版本号 V6.20 → V6.22。
- **涉及文件**：`index.html`、`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：第 0 步诊断探头先确认基线健康（CRITICAL_LOG 2~10 完整、轮询在跑、5s 兜底正常触发），第 1 步纯模板重构后用户实测两列布局功能无误——**两处独立改动均未复现卡死，证明布局模板与渲染逻辑不是卡死源**（连续两次回退的问题已被逐小步隔离）。用户实测确认后认为两列布局已满足最初需求，跳过分组树/行内展开等增强，以当前形态定版，减少非必要改动面。

## [LOG-077] 2026-08-18 — 敌方名字通用变种标签机制：名字后缀 `[...]`（[复活]/[智慧]）解析 + [复活] 死亡后 30% 血复活一次（V6.22 后续，未升级版本号）

- **变更行为**：
  1. **通用名字变种标签剥离**：将 `parseNameMultiplier` 重构为 `parseNameTagAndMultiplier`（index.html:4219）——先以 `/\[[^\]]*\]/g` 剥离名字内所有 `[...]` 标签并收集进 `tags` 数组，再对剥离后的串解析 `*N`/`×N` 数量后缀 → 返回 `{ baseName, count, tags }`。顺序固定「先剥标签再解析数量」：半角 `食尸鬼*2[复活]` 会先剥成 `食尸鬼*2` 再被 `*N` 匹配展开成 2 个，无需针对半角 `*` 的专用兜底；`[复活]` 写在名字末尾或数量之后均合法。
  2. **标签落地**：`parseEnemyItem`（index.html:4393，第三参 `tags`）将 `[智慧]` 以 `attrs.isWise || tags.includes('[智慧]')` 布尔合并（属性栏智慧 || 名字智慧，重复挂载幂等无害，既有「属性栏已挂智慧」的老敌人行为不变）；`[复活]` 置 `reviveCount = 1`（仅一次）。对象字面量新增 `nameTags`/`reviveCount` 字段，随 `initialEnemiesCache` 深克隆，重置战斗自动保留。`enemy.name` 为剥离后干净名，`[...]` 不外泄到 tooltip/死亡战报/世界书匹配/统计弹窗。
  3. **世界书模式标签继承**：世界书条目替换敌人时（`startGameFromWorldbook`，index.html:4588）将原 LLM 名字上的 `nameTags` 透传给 `parseEnemyItem`，使名字标签在世界书模式下依旧合法（属性来自图鉴、名字标签照样生效）。
  4. **【复活】运行时**：新增 `tryReviveEnemy(enemy, dom)` 辅助（index.html:5140）——带 `[复活]` 的敌人第一次被击杀（HP 归 0）时以 **30% 最大血量** 原地复活、清空死亡缓冲状态（shield/buffs/isDefending）、浮字「复活!」+ hpHeal 音效 + 战报。接入**三处死亡收口**保证任意死亡通道都触发复活：
     - 收口① **`ON_FATAL_DAMAGE` 事件**（priority 8，位于毅力留存/回避致命的 10/5 之下，index.html:5909）：标签伤害路由，`ctx.hpDmg=0` + `prevented=true`，正确阻断 `__killed__` 假击杀、死亡特写与 ON_KILL 隐匿累积；
     - 收口② **`updateEnemyUI` 致死分支**（index.html:5202）：反击/强力反击/直接减血打击杀收口——致死前先 `tryReviveEnemy`，成功则回刷 HP 条并 `return` 跳过死亡处理，`isAlive` 保持 true → 不脱行动队列、回合正常继续（覆盖「敌人在自己回合被反击杀死」场景）；
     - 收口③ **回合起始 DoT 致死**（index.html:7475，中毒/燃烧）：致死前先 `tryReviveEnemy`，成功则沿用下方正常行动流程，`updateEnemyUI` 回刷 HP 条后继续行动。
  5. **语义与限制**：仅敌方（`id.startsWith('h')` 一律跳过）、仅一次（`reviveCount` 1→0，第二次击杀正常死亡）；敌人带 [复活] 两次收口（①事件 与 ②/③）同日触发时天然幂等——首次后 `reviveCount` 归 0，第二处 `tryReviveEnemy` 返回 false 不重复复活。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户需求世界书模式下无需再在属性栏挂 `[智慧]`，希望名字后可直接跟 `[...]` 变种标签（`[复活]`/`[智慧]` 为第一批验证的最小实现），并支持同名不同变种敌人（如【食尸鬼】与【食尸鬼[复活]】）安全共存。核心疑问「同名不同变种会否报错」排除：全角 `×N` 写在名字末尾时以 `[复活]` 结尾不会误解析、天然分开；半角 `*N` 需先剥标签避免误判，通用「先剥标签再算数量」顺序一并解决。复活需覆盖一切死亡通道（含敌人自己回合被反击杀死、DoT 毒杀），故触发点放在真正的死亡收口而非仅事件总线。按 Coding rule 本轮不升版本号、不改 README（待用户实测确认有效后再定版升 V 并补 README/SPEC）。

## [LOG-078] 2026-08-18 — V6.23 定版：多标签实测正常 + README 补充名字变种标签机制说明

- **变更行为**：
  1. **多标签实测确认**：用户实测 `名字: "食尸鬼*2[复活][智慧]"` 曾一度显示只有智慧生效，经排查确认为上游 LLM 输出问题、非本机制缺陷；复测后**多个标签同时生效均正常**（解析逻辑本身对 `[...]` 全体剥离收集，`tags` 数组含 `[复活]` 与 `[智慧]`，`isWise`/`reviveCount` 各自正确落地）。代码无需改动。
  2. **README 文档补充（V6.22 → V6.23）**：
     - §1 敌方名字 `*N` 数量后缀条目补一句变种标签机制（V6.23）；
     - 新增 **`§3.9 敌方名字变种标签`**：通用写法、`[复活]`（仅敌方/仅一次/30%血/覆盖反击与DoT全部死亡通道）与 `[智慧]`（与属性栏等价、布尔合并幂等）两条标签说明，含 `*2[复活][智慧]` 组合示例与「同名不同变种共存」说明；
     - §9 世界书系统补「名字变种标签在图鉴替换时自动继承」。
  3. **版本号升级**：README `V6.22 → V6.23`。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后才更新 README 并升版本号；LOG-077 为代码施工记录、本轮为文档定版本感谢记录，分两条以保持施工日志可溯源。

## [LOG-079] 2026-08-18 — 敌方变种标签双写入点通用化：属性栏 `[...]` 与名字 `[...]` 等价（V6.23 后续，未升版本号）

- **变更行为**：
  1. **`parseAttributes` 通用标签收集**（index.html:4242）：在原有数值/职业字段解析（HP/MP/Atk/Armor/Speed/行动/职业 + `[智慧]→isWise`）之外，新增收集——先用 `ignored` 正则剔除已解析的带值字段，再把剩余的所有裸 `[...]` 纯标签（无冒号/斜杠）收集进返回的 `attrTags` 数组（含括号，如 `[复活]`）。返回对象新增 `attrTags` 字段，**非破坏**：hero 路径（parseAttributes 第二处调用，index.html:4430）不消费它，完全无影响。
  2. **`parseEnemyItem` 双写入点合并**（index.html:4405-4410）：名字标签 `nameTags` 与 属性栏标签 `attrTags` 合并为单一命名空间 `allTags`，`[智慧]` 用 `attrs.isWise || allTags.includes('[智慧]')`（布尔合并、幂等）、`[复活]` 用 `allTags.includes('[复活]') ? 1 : 0`（置1、仅一次）。效果：**属性栏写 `[复活]` 与名字写 `[复活]` 完全等价**；未来新增任意变种标签（如 `[狂暴]`）在属性栏或名字两处都无需再改解析代码，只需在语义处用 `allTags.includes('[标签]')` 取值。
  3. **世界书路径自行覆盖**：世界书替换时仍用 `enemy.nameTags`（LLM 名字标签）透传，而属性栏标签由词条 `属性` 经 `parseAttributes` 重建 `attrTags`，二者在 `parseEnemyItem` 内自然合并，无需额外接线。
  4. **编辑器保存不丢**：`syncEditorDataToMemory` 仍只写 `e.isWise`、不动 `reviveCount`，已载入 `[复活]` 的敌人在编辑器编辑保存后保留复活标记；被编辑器清空的 `reviveCount` 由 `enemiesData` 深克隆从 `initialEnemiesCache` 恢复，行为不变。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户确认希望「属性栏」与「名字」两个写入点对所有变种标签通用（含未来新增标签），而非仅当前 `[复活]`/`[智慧]` 两个硬编码。真·通用实现将解析与语义解耦：解析端统一收集裸标签、语义端统一按标签名取值，后续扩展零解析改动。按 Coding rule 本轮仅施工记录、不升版本号不改 README（待用户实测「属性栏 [复活] 与名字 [复活] 均生效、字段解析不受干扰」后定版升 V6.24 并补 README §3.9 双写入点说明）。

## [LOG-080] 2026-08-18 — V6.24 定版：双写入点实测确认 + README §3.9 重写为通用变种标签说明

- **变更行为**：
  1. **实测确认**：用户确认「属性栏写 `[复活]` 与 名字写 `[复活]` 均能正常生效、数值字段解析不受干扰」，双写入点通用机制定版。
  2. **README 文档更新（V6.23 → V6.24）**：
     - **§3.9 标题改「敌方变种标签」并重写**：核心新增「**双写入点（通用）**」说明——变种标签可写在名字后或属性栏里，两处完全等价、任意混用（解析端合并为同一命名空间、重复挂载幂等无害）；明确「未来新增任意标签均无需改解析代码（属性栏与名字两处自动通吃）」；示例补充属性栏写法 `属性: "[HP:100/100][复活][智慧]"`。
     - **§1 敌方名字变种标签条目**升级 V6.23→V6.24 并补双写入点。
     - **§9 世界书系统**变种标签条目升级 V6.24，补充「标签也可直接写进图鉴词条属性栏（双写入点等价）」。
  3. **版本号升级**：README `V6.23 → V6.24`。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认「属性栏/名字双写入点均生效」后更新 README 并升版本号定版；LOG-079 为代码施工记录、本轮为文档定版记录，分两条保持可溯源。

## [LOG-081] 2026-08-18 — 新增 9 个敌方变种标签：类型减伤/状态免疫/回合再生/半血狂暴/攻击吸血（V6.24 后续，未升版本号）

- **变更行为**：
  1. **通用标签存储**（parseEnemyItem，index.html:4408-4420）：`enemyObj` 新增 `tags`（allTags 全量标签数组）、`resistMap`（类型减伤映射）、`immuneBurn`（[防火]）、`immunePoison`（[耐毒]）。语义处统一用 `tags.includes('[xxx]')` 读取，**双写入点（属性栏/名字）自动通吃**。
  2. **【流体】【虚形】【破法】类型减伤 50%**：新增 `applyEnemyTypeResist(rawDmg, damageType, target, dom)` helper（index.html:6470）——[流体]→远程 / [虚形]→近战 / [破法]→法术。接入两处：① 主伤害路径（applySingleTagEffect，index.html:6901，屏障之后、护甲结算之前）；② 普通反击侧（index.html:6765，反击为近战伤害，敌方 caster 带【虚形】时减半）。语义：作用于折算前原始伤害的独立减伤系数（与屏障克制 barrierSub 同型）；【穿透】无视的是护甲、仍吃此属性减伤。**已知限制**：防守者【强力反击】为无类型上下文（onDodge 不传 incomingDamageType），本轮不参与减伤。
  3. **【防火】【耐毒】状态免疫**：`registerTagHandler('中毒')`（index.html:5293）与 `('燃烧')`（index.html:5309）开头拦截——敌方带对应免疫字段时跳过施加、飘字「免疫·毒/免疫·燃」+ 战报。免疫字段仅敌方有 → 天然只拦敌方目标。
  4. **【钢体】免疫眩晕**：眩晕施加点（index.html:6959）拦截——敌方带 [钢体] 时跳过眩晕、飘字「免疫·眩晕」+ 战报。
  5. **【再生】每回合回血 10%**：`TURN_START` 事件监听（index.html:5949）——敌方带 [再生] 且存活时 `hp = min(maxHp, hp + floor(maxHp*0.1))`，飘字 + 战报；HP 条由主流程后续 `updateEnemyUI` 刷新。
  6. **【狂暴】半血攻击 +50%**：`getEffectiveStats`（index.html:6443）职业被动修正之后追加——敌方带 [狂暴] 且 `hp/maxHp ≤ 0.3` 时 `atk = floor(atk*1.5)`（肉鸽"半血狂怒"）。
  7. **【吸血】攻击伤害 30% 回血**：`AFTER_DAMAGE` 事件监听（index.html:5988）——敌方带 [吸血] 施法者对英雄造成实际伤害时，`hp = min(maxHp, hp + floor(hpDmg*0.3))`，飘字 + 战报 + `updateEnemyUI` 刷新。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户提供 5 个标签（流体/虚形/破法/防火/耐毒），并采纳 4 个参考经典 RPG/肉鸽的构思标签（再生=巨魔再生、钢体=石肤免控、狂暴=半血狂怒、吸血=吸血词条）。实现遵循"零解析改动"承诺（新标签全部在 parseEnemyItem 一处声明字段、语义处读取 tags），且全部仅敌方生效（英雄无 tags 字段自动跳过）。**构思清单（本轮未实现，待后续）**：【自爆】死亡对全体英雄造成 maxHp 15% 真实伤害（亡语，需挂死亡收口）；【亡语·剧毒】死亡对全体英雄施加中毒（亡语）；【分裂】死亡分裂成 2 个 50% 血小怪（需动态生成敌人与槽位管理，高复杂度）；【先攻】首回合强制先手（需干预排轴，高复杂度）。按 Coding rule 本轮不升版本号、不改 README（待用户实测确认后定版 V6.25 补 README §3.9 标签表）。

## [LOG-082] 2026-08-18 — V6.25 定版：9 个新变种标签实测确认 + README §3.9 扩展为 11 标签表

- **变更行为**：
  1. **实测确认**：用户确认 9 个新标签（流体/虚形/破法/防火/耐毒/再生/钢体/狂暴/吸血）实测全部有效，功能定版。
  2. **README 文档更新（V6.24 → V6.25）**：
     - **§3.9 扩展为 11 标签表**：原有 [复活]/[智慧] 基础上，新增 9 个标签的分组说明——类型减免组（**流体**远程-50%/**虚形**近战-50%/**破法**法术-50%，标注强力反击无类型上下文不参与）、状态免疫组（**防火**免疫点燃/**耐毒**免疫中毒/**钢体**免疫眩晕）、回合再生组（**再生**每回合回 10%）、半血爆发组（**狂暴** HP≤30% atk+50%）、攻击吸血组（**吸血**造成伤害 30% 回血）；明确「全部标签均为敌方专属」；补组合示例 `炎魔[防火][破法][再生][狂暴]`。
     - **§1 敌方名字变种标签条目**升级 V6.25 并列全部 11 标签。
     - **§9 世界书系统**变种标签条目升级 V6.25（支持标签数同步更新）。
  3. **版本号升级**：README `V6.24 → V6.25`。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认 9 个新标签有效后更新 README 并升版本号定版；LOG-081 为代码施工记录、本轮为文档定版记录，分两条保持可溯源。

## [LOG-083] 2026-08-18 — 修复同名敌人气泡全部归属第一个 + 敌方低血/死亡智慧旁白触发点（V6.25 后续，未升版本号）

- **变更行为**：
  1. **Bug 修复：多个同名敌人说话时对话框全部归属第一个敌人**（`requestLLMResponse`，index.html:9087-9101）：根因为解析 LLM 返回的 `角色名：「台词」` 后按 `enemiesData.find(e => e.name === name)` 全局按名查找，`find` 命中同名（如 `食尸鬼*2`）的第一个实例。修复：优先在**本次请求的目标集 `targetAllies` 内**按名字分配**未用实例**（维护 `usedTargetIds` Set，同名实例按 LLM 输出顺序各归各、气泡挂到各自头上）；名字未命中时回退到目标集任意未用实例，最后再回退全局查找。不改 LLM 响应格式、无需敌人带编号；对智慧旁白/友方旁白/看破旁白/玩家群聊回应四类调用方均生效。
  2. **新增敌方低血量旁白触发点**（`triggerEnemyLowHpSpeak` + `tryTriggerEnemyLowHpSpeak` 判定 helper，index.html:9150/9166）：仅 `[智慧]` 敌方 + 敌方旁白开关开启 + 存活 + HP≤30% 时，以本人口吻说话（prompt 提示绝境/负隅顽抗口吻），走既有 `requestLLMResponse(trigger,[enemy],true)` 链路。`enemy.hasLowHpNarrated` 标志防重复（每次跌破 30% 仅触发一次，回血后再跌破不重复；重置/新战局随 enemiesData 重建自然清零）。挂接三条扣血路径：① 主伤害路径 `applySingleTagEffect` 收尾（index.html:7011）；② 闪避反击路径（index.html:6797）；③ DoT 回合起始扣血（index.html:7543）。
  3. **新增敌方死亡旁白触发点**（`triggerEnemyDeathSpeak` + `tryTriggerEnemyDeathSpeak`，index.html:9158/9175）：仅 `[智慧]` 敌方 + 开关开启时以本人口吻留下临死台词。挂接**两处统一死亡收口**覆盖全部死亡通道：① `updateEnemyUI` 致死分支、`tryReviveEnemy` 失败后（index.html:5231，主伤害/反击/直接减血三通道通吃）；② DoT 回合起始致死（index.html:7577，该路径手动置死不经过 updateEnemyUI 致死分支）。`[复活]` 敌人第一次被击杀复活不触发、复活后再死正常触发。
  4. **顺带语义**：致死伤害（主伤害路径）在击杀收口前先触发低血旁白判定、再经 `updateEnemyUI` 触发死亡旁白，濒死→死亡台词依次衔接；敌方旁白开关关闭时三个触发点全部静默。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：① 同名归属 bug 根因是全局 `find` 按名匹配无法区分同名实例，修复收窄查找范围到本次请求目标集、按序分配未用实例，零侵入既有 LLM 响应协议；② 低血/死亡旁白沿用现有「智慧旁白」的口径与链路（仅 [智慧] 敌人、受敌方旁白开关控制、`requestLLMResponse` 统一编排），新增两个独立 trigger 函数 + 判定 helper 避免重复散落条件判断；低血标志用「每次跌破触发一次」语义（用户确认），不做回血复位；死亡旁白挂统一死亡收口（updateEnemyUI 致死分支 + DoT 致死分支）保证任意死亡通道都不漏。按 Coding rule 本轮仅施工记录、不升版本号不改 README（待用户实测确认后定版升 V 并补 README §1/§3.9 说明）。

## [LOG-084] 2026-08-18 — 修复 LOG-083 引入的回归：非目标集角色台词被错误塞给目标集实例

- **变更行为**：
  1. **Bug 复现**：用户实测 LLM 返回多条台词（如 弗兰克/玛德琳/索恩/食尸鬼 各一句）时，其中**不在本次请求目标集内**的角色（如玩家「弗兰克」）台词被错误归属到目标集角色头上（示例：弗兰克的台词气泡与战报挂到了「〖食尸鬼〗」）。
  2. **根因**：LOG-083 修复同名归属时把查找顺序定为 ①目标集内按名找未用实例 → ②**目标集内任意未用实例**（无名字约束）→ ③全局按名查找。第②步在 LLM 输出名字不在目标集内时（玩家、已死亡角色、LLM 自由发挥的角色名）会**无差别抢占**目标集第一个未用实例，而原本能正确命中该角色的全局查找（③，`heroesData`/`enemiesData` 按名 find）被排到最后根本没有执行机会。
  3. **修复**（index.html:9091-9099）：重排查找优先级为 ①目标集内按名找未用实例（保留 LOG-083 的同名归属修复）→ ②**全局按名查找**（`heroesData`/`enemiesData` 按名 find，恢复原语义：玩家/已死/非目标集角色按名字正确归属）→ ③目标集内任意未用实例（仅当名字完全对不上时才兜底，保证气泡仍能显示）→ ④`targetAllies[i % length]` 最终兜底。同名敌人各实例各归各的核心修复不受影响。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：LOG-083 的修复步骤②过度激进——"任意未用实例"兜底本应只在名字无法匹配到任何实体时兜底，却因排在全局查找之前而抢占了正确归属。按"名字精确优先、实例分配其次、任意兜底最后"的原则重排，同名修复与全局归属语义二者兼得。按 Coding rule 本轮仍不升版本号不改 README（待用户实测确认）。

## [LOG-085] 2026-08-18 — V6.26 定版：同名归属 + 低血/死亡旁白实测确认 + README §2.1/§3.9 补充

- **变更行为**：
  1. **实测确认**：用户确认（1）同名敌人气泡各归各、（2）非目标集角色台词按名正确归属、（3）低血旁白（跌破 30% 触发一次）与死亡旁白（[复活] 复活后再死再触发）全部有效，版本定版 V6.26。
  2. **README 文档更新（V6.25 → V6.26）**：
     - **§2.1 新增「敌方旁白 ON/OFF」条目**：说明带 `[智慧]` 敌方的**三档旁白触发点**——① 回合开始智慧旁白（原有）；② 生命跌破 30% 绝境台词（每次跌破仅触发一次、回血后再跌破不重复）；③ 被击杀临死台词（[复活] 第一次被击杀复活不触发、复活后再死正常触发）；三者均受开关控制、均以本人口吻说话；并注明同名敌人各实例独立说话、气泡归属各自实体。
     - **§3.9 标题升级 V6.26**；`[智慧]` 条目改写为「三档旁白触发点」说明并指向 §2.1。
  3. **版本号升级**：README `V6.25 → V6.26`。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后更新 README 并升版本号定版；LOG-083/084 为代码施工与回归修正记录、本轮为文档定版记录，分三条保持可溯源。

## [LOG-086] 2026-08-19 — 我方角色多动（行动次数）编辑器入口 + 剩余行动提示（未升版本号）

- **变更行为**：
  1. **背景发现**：经调研确认引擎层**早已天然支持我方多动**——`startRound`（index.html:7477-7480）按 `h.actCount || 1` 给我方排多条带速度衰减（`有效速度 - 行动序数×10`）的行动条目，与敌方共用同一构建/排序路径；`nextTurn` 英雄分支（index.html:7606-7615）不区分 `isExtraTurn`，每个队列条目都会弹操作菜单；蓄力推进/DoT tick/TURN_START 事件由 `!isExtraTurn` 守卫仅首次行动执行（多动语义天然正确）、眩晕只吞一条行动。且 YAML 属性栏 `[行动次数:N]`/`[Act:N]` 对我方早已生效（`parseAttributes` index.html:4232 → heroObj index.html:4444），持久化也已读写 `actCount`（`serializeHeroesForSave`/`applyPersistedRoster`）。**本轮不触碰任何核心回合逻辑**。
  2. **编辑器入口**（openEditor 我方属性网格，index.html:8530）：属性网格 `lg:grid-cols-7` → `lg:grid-cols-8`，「速度」后新增「行动」输入框（`id="edit-h-${i}-act"`，`value="${h.actCount || 1}"`，min=1，悬浮提示「一回合行动次数，每次行动速度依次 -10 衰减」）。**仅我方角色**（按用户确认，敌方维持现状走 YAML）。
  3. **同步读取**（`syncEditorDataToMemory`，index.html:8563）：`h.actCount = Math.max(1, Number(...) || 1)`，防止填 0/负数导致排轴异常。
  4. **默认对象**（`addHero`，index.html:8675）：新角色补 `actCount: 1`，消除 undefined 依赖运行期 `|| 1` 兜底。
  5. **剩余行动提示徽章**（`updateActiveHeroDisplay`，index.html:8491）：行动面板顶部「xxx 的回合」条统计 `state.actionQueue.slice(queueIndex)` 中剩余属于当前英雄的条目数，`>1` 时显示 `<span class="text-cyan-300">⏩ 剩余 N 次行动</span>`。基于真实队列计数，天然覆盖 actCount 多动与 [再动]/祈愿插队；单动英雄无徽章、敌方回合传 null 被守卫跳过，行为零变化。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户需求「为我方角色加入和敌方相同的多次行动标签」——调研后发现引擎（排轴/衰减/出队/事件节流）与 YAML/持久化通道全部敌我通用、零改动即可生效，真正缺口只在「编辑器入口 + 剩余行动提示 + 文档」。按 Coding rule 最小改动原则：只补配置入口与体验提示，不重写已工作的回合循环；`Math.max(1,…)` 守卫输入边界；剩余行动徽章基于队列实时计数，一次实现同时服务 actCount 多动与再动插队两种来源。本轮仅施工记录、不升版本号不改 README（待用户实测确认后定版升 V 并补 README 说明）。

## [LOG-087] 2026-08-19 — V6.27 定版：我方多动实测确认 + README §1/§4.2 补充

- **变更行为**：
  1. **实测确认**：用户确认（1）编辑器「行动」输入框生效，英雄一回合多次行动并按 -10 速度衰减排轴（不会连续霸榜）；（2）行动面板顶部「⏩ 剩余 N 次行动」提示正确、单动英雄无徽章、敌方回合无干扰；（3）YAML 属性栏 `[行动次数:N]` 写入同样生效。版本定版 V6.27。
  2. **README 文档更新（V6.26 → V6.27）**：
     - **§1 属性字段格式**：补充可选字段 `[行动次数:N]`（或 `[Act:N]`）——表示该角色每回合可行动 N 次，我方与敌方通用，指向 §4.2。
     - **§4.2 标题**升级为「多次行动与蓄力机制」，追加**我方多动**条目：与敌方共用同一套排轴/速度衰减/事件节流引擎，可在角色编辑器「行动」框或 YAML 属性栏设置；多动英雄行动时行动面板顶部显示 `⏩ 剩余 N 次行动`；多动语义与敌方完全一致（蓄力推进/DoT tick/回合开始事件仅首次行动触发、眩晕只吞一条、[再动]/祈愿插队不受影响）。
  3. **版本号升级**：README `V6.26 → V6.27`。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后更新 README 并升版本号定版；LOG-086 为代码施工记录、本轮为文档定版记录，分两条保持可溯源。

## [LOG-088] 2026-08-19 — 我方新增两档旁白触发点：力竭倒下/保命被动 + 被治疗合并旁白（未升版本号）

- **变更行为**：
  1. **新增 3 个旁白触发函数**（index.html，位于 `triggerAllyAutoSpeak` 之后）：
     - `triggerAllyDownSpeak(hero)`：**力竭倒下旁白**——角色 HP 归 0 倒下时以本人口吻留下临别台词（不甘/遗言/痛呼/诀别）。
     - `triggerAllyFatalSaveSpeak(hero, passiveName)`：**保命被动旁白**——触发【毅力留存】/【回避致命】死里逃生时以本人口吻说话（死里逃生喘息/强撑倔强/后怕）。
     - `triggerAllyHealSpeak(healer, healedTargets)`：**被治疗合并旁白**——一次 LLM 调用合并治疗者与被治疗者台词（格式 `角色名：「台词」`），节省 token。
  2. **治疗旁白合并（群回/单回）**：`executeSkillAction` 目标遍历循环中精确匹配 HP 治疗标签（`tag === '[单回]' || tag === '[群回]'`，排除 `[回避]`/`[回蓝]` 等含"回"字的标签），记录治疗前 HP 并收集**实际回血**（排除满血/燃烧禁疗 0 回复）且**非施法者自身**的我方目标；技能结算收尾的友方发言钉子改为：有被治疗者时调用 `triggerAllyHealSpeak`（治疗者+被治疗者一次对话），否则回退原 `triggerAllyAutoSpeak`（非治疗技能行为零变化）。
  3. **保命被动旁白接线**：`applySingleTagEffect` 的 `ON_FATAL_DAMAGE` 事件块 `fatalCtx.prevented` 后，按 `target.hasTriggeredGrit`（毅力留存）→ `target.hasTriggeredAvoidFatal`（回避致命）取被动名，我方目标且开关开启时触发。无 heroIdx 排除（**含 1 号位玩家**，用户确认倒下/保命为剧情高光时刻 1 号位也发言）。
  4. **力竭倒下旁白接线**（两处死亡收口）：
     - `updateHeroUI` 死亡分支（`hero.hp <= 0 && hero.isAlive`，天然恰好一次）——覆盖敌方攻击/反击/强力反击/hpCost 自伤全部致死路径；
     - `nextTurn` DoT（毒/灼烧）回合起始致死路径——该路径先置 `isAlive=false` 不走 updateHeroUI 分支，单独接线。
     - 均含 1 号位、受「友方旁白」开关控制。
  5. **1 号位参与规则**（用户确认）：触发①倒下/保命含 1 号位；触发②被治疗时 1 号位作为**被治疗者**说话、作为治疗者仍不自动发言（维持"玩家不自动说话"约定）。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户需求"为我方角色新增旁白触发点"——倒下/保命是被动受动事件的一次性剧情高光，与"主动行动时不自动说话"的既有约定不同，故含 1 号位；被治疗因群回一次常有多角色，若沿用逐角色单独调用会连发多个 LLM 请求，故参照 `triggerKanpoNarration` 多角色模板改为**一次调用返回所有治疗者与被治疗者台词**（`requestLLMResponse` 按名分发气泡已支持）；治疗者沿用"仅非 1 号位自动发言"避免玩家被 AI 抢占说话。HP 治疗标签精确匹配 `[单回]/[群回]` 而非 `includes('回')`，杜绝误收 `[回避]`（含"回"字）与 `[回蓝]`（先命中 `'回蓝'` handler 但标签串含"回"）。本轮仅施工记录、不升版本号不改 README（待用户实测确认后定版升 V 并补 README 说明）。

## [LOG-089] 2026-08-19 — V6.28 定版：我方两档旁白触发点实测确认 + README §2.1 补充

- **变更行为**：
  1. **实测确认**：用户确认（1）力竭倒下旁白与保命被动旁白（毅力留存/回避致命）正常触发、含 1 号位玩家；（2）被治疗合并旁白一次 LLM 调用返回治疗者与被治疗者台词（群回多人各一句）、气泡归属正确；（3）1 号位参与规则正确（倒下/保命含 1 号位、被治疗者含 1 号位、1 号位作治疗者不自动发言）；（4）非治疗技能旁白行为零回归。版本定版 V6.28。
  2. **README 文档更新（V6.27 → V6.28）**：
     - **§2.1「友方旁白 ON/OFF」条目**扩展为四时机说明：① 英雄行动时（原有，仅非 1 号位）；② 被治疗时（一次 LLM 调用合并治疗者与被治疗者台词、写明治疗者，被治疗者含 1 号位；1 号位作治疗者不自动发言）；③ 力竭倒下（临别台词，含 1 号位）；④ 触发保命被动（毅力留存/回避致命死里逃生台词，含 1 号位）。
  3. **版本号升级**：README `V6.27 → V6.28`。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后更新 README 并升版本号定版；LOG-088 为代码施工记录、本轮为文档定版记录，分两条保持可溯源。

## [LOG-090] 2026-08-19 — 敌方新增 5 个变种标签：自爆四件套 + 【要害】（未升版本号）

- **变更行为**：
  1. **背景**：用户希望限制玩家滥用 AOE、提高单体攻击地位，为敌方新增类似 [复活] 的特性标签。经方案确认定版范围：**自爆四件套（[自爆:群伤/群火/群毒/群穿]）+ 【要害】群攻减伤**。
  2. **标签解析**（`parseEnemyItem`，index.html:4399-4455）：新增 `[要害]` → `resistMap['AoE'] = 0.5`（与 [流体]/[虚形]/[破法] 并排）；新增自爆解析 `const explodeTag = allTags.find(t => /^\[自爆:/.test(t))`，正则 `/^\[自爆:([^\];]+?)(?:;power:(\d+))?\]$/` 解析子类型（群伤/群火/群毒/群穿，未知忽略并 console.warn）与 power（缺省 50），存入 `enemyObj.explode = { type, power }`（与 reviveCount/isWise 同风格）。双写入点（名字/属性栏）自动通吃，无标签时 explode=null 零行为变化。
  3. **【要害】减伤**（`applyEnemyTypeResist`，index.html:6531-6552）：签名加第 5 参 `isAoE`，查表 key 改 `isAoE ? 'AoE' : damageType`，减伤飘字/战报在 isAoE 时写「【要害】」。调用点 6927 主伤害管线传 `tag.includes('群')`（此时 tag 必为攻击类，不误伤 [群回] 等）；反击路径 6786 补第 5 参 false（反击为单体近战）。【要害】含穿透语义对齐流体家族：群攻（含 [群穿透]）伤害 -50%，单体不受影响。
  4. **自爆触发函数**（新增，index.html:5186-5233，位于 tryReviveEnemy 之后）：`triggerEnemySelfDestruct(enemy)` 检查 `enemy.explode`，用全局 `selfDestructChain` Promise 链串行化多敌人同回合自爆；`doEnemySelfDestruct(enemy)`（async）先播爆炸粒子（spawnExplosionParticles 1.4 倍 + 战场 shake + 死亡音效）并写 `💥 xxx 自爆了！` 战报，再构造合成技能对象 `{ name:'自爆·群X', type: 群火?'[群燃烧]':群毒?'[群中毒]':群穿?'[群穿透]':'[群攻]', power, hit:100, cost/hpCost/tpCost:0, damageType:'法术', turns:3, guaranteedHit:false, isReaction:false }`（零消耗防已死敌人二次扣资源），`await executeSkillAction(enemy, null, boomSkill, 1)` 与敌方 AI 施法同款调用。**完整管线**：逐目标独立闪避、可触发反应拦截、可被【看破】打断、【肃正】屏障吸收+泄漏、防御/护盾/保命被动/飘字战报全复用；群火/群毒走纯减益路径（闪避成功连状态也不中）。
  5. **两处真正死亡收口接线**（与 [复活] 自洽：复活拦截成功早已 return/跳过，自爆只在真正死亡触发）：
     - `updateEnemyUI` 死亡分支（index.html:5283-5288）：`tryTriggerEnemyDeathSpeak` 之后、`isAlive=false` 之后、死亡演出前插入 `triggerEnemySelfDestruct(enemy)`——异步 promise.then 天然晚于当前同步死亡块执行，不会与本分支重复触发；
     - `nextTurn` DoT（毒/灼烧）回合起始致死路径（index.html:7652-7658）：`revived=false` 分支内 `isAlive=false` 之后单独接线（此路径手动置死、updateEnemyUI 死亡分支守卫失效不会二次触发）。
  6. **副作用排查结论**（子代理探索 + 人工复核）：`executeSkillAction` 对 caster 调用 `updateEnemyUI` 在 7217 行、自爆异步入队晚于外层死亡同步块执行，安全；`promptKanpo`→`buildSkillDetailHTML` 对 primaryTarget=null 安全（群攻显示"目标 全体敌方"）；`TURN_END` 多重施法订阅对无 classType 敌方有 `p &&` 守卫；死亡后 caster 无 buffs/classType，`getEffectiveStats` 与 CLASS_PASSIVES 查找均安全。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户确认自爆本体伤害参数化（`;power:N` 缺省 50）、自爆走完整反制管线（可闪避/反应/看破/屏障）、群火/群毒为纯状态（无直接伤害）、【要害】减伤 50%。设计上刻意复用既有管线而非特判写死：合成技能走 executeSkillAction 使自爆天然获得屏障/看破/反应/保命被动全套交互；【要害】挂 resistMap 哨兵 key 与流体家族同构，未来新增群攻减伤系标签零解析改动。本轮仅施工记录、不升版本号不改 README（待用户实测确认后定版升 V6.29 并补 README §3.9 说明）。

## [LOG-091] 2026-08-19 — 自爆三处体验修复：不可被反击 + 自爆前摇动效 + 详情面板变种标签显示

- **变更行为**：
  1. **修复自爆可被反击的 bug**：自爆由合成技能经 executeSkillAction 结算，玩家闪避成功时会触发反击判定——但自爆施法者（敌人）已死亡，导致反击打到不存在的目标上（飘字/战报/伤害都落在已死敌人上）。修复双守卫：
     - 合成技能加 `isSelfDestruct: true` 标记（index.html:5231）；
     - 普通反击入口守卫：`!(skill && skill.isSelfDestruct) && caster.isAlive`（index.html:6851）；
     - 强力反击守卫：ON_DODGE 订阅（index.html:6045）开头 `if (ctx.skill && ctx.skill.isSelfDestruct) return;`——防守者强力反击无视伤害类型，仅靠普通反击的近战限制挡不住，必须单独拦截。
  2. **自爆前摇动效**：此前自爆敌人在死亡分支立即播消失动画，玩家完全不知道发生了什么就全队掉血。现改为：自爆敌人在 `updateEnemyUI` 死亡分支**保留尸体**（`if (enemy.explode)` 分支跳过立即消失演出，index.html:5308-5313）；`doEnemySelfDestruct` 在结算前复用敌方攻击预警动效——尸体 `enemy-omen` 红色轮廓光晕（600ms）+ `monsterAttack` 预警音效 + `💥 自爆预警!` 飘字 + 战报 `⚠️ xxx 自爆前兆`，`await sleep(600)` 与动画时长对齐后播爆炸粒子/震屏/爆炸音效再进 executeSkillAction；自爆结算完成后收尾隐藏尸体（opacity-0 + display none）。前摇期间玩家有完整看破/反应决策窗口。
  3. **详情面板变种标签显示**（`showEnemyInfo`，index.html:8276-8340）：新增「变种标签」区块，枚举 `enemy.tags`（名字/属性栏双写入点收集的完整命名空间）渲染为可读徽章：已支持的 12 个标签全部映射（复活/智慧/流体/虚形/破法/要害/防火/耐毒/钢体/再生/狂暴/吸血），hover 显示效果描述；`[自爆:群X]` 合并展示为「💥 自爆·群X」徽章（含威力 tooltip）；未识别标签原样兜底展示（灰色 `[xxx]`），保证未来新标签零解析改动即可见。徽章区插入属性行与技能面板之间。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：① 反击对已死目标造成伤害是明显逻辑错误，根因在强力反击无视伤害类型 + 自爆施法者死亡；用 `isSelfDestruct` 单一标记做双守卫，比在回调里反复判断更内聚，未来任何"亡语类"结算技能均可复用该标记。② 自爆前摇复用既有的 `enemy-omen` 预警体系（攻击预警动画+音效），与敌方普通攻击的预警语言完全一致，玩家无需学习新视觉；保留尸体使预警有实体锚点，爆炸后再消失，演出闭环。③ 详情面板直接渲染 `enemy.tags` 原始命名空间而非逐字段特判，天然覆盖全部现有标签与未来新增标签，符合"双写入点/通用命名空间"架构。本轮为修复记录，README 定版（V6.29）仍待用户实测确认后另行记录。

## [LOG-092] 2026-08-19 — 修复自爆看破/反应弹窗打断演出：自爆链与主链串行化 + 先看破后爆炸

- **变更行为**：
  1. **背景**：用户反馈自爆触发看破弹窗会打断演出、产生怪异延迟。探索确认根因有二：① 自爆跑在脱离主链的 `selfDestructChain`（fire-and-forget）上，弹窗挂起期间后台回合照常推进（下一个行动者/操作菜单/时间轴刷新）——正常敌方攻击的弹窗在主链 `await` 上、逻辑本就冻结，唯独自爆链例外；② 爆炸演出（粒子/震屏/音效）在看破窗口之前播放，玩家决策时"已经炸了"，演出自相矛盾。
  2. **自爆链与主链串行化**（index.html:5193-5205 + endTurn 汇合点 7760-7766）：`triggerEnemySelfDestruct` 维护 `selfDestructCount`（入队 ++、`selfDestructChain.then` 内 try/catch/finally 中 --）；`endTurn()`（async，所有调用点均 await）开头加 `while (selfDestructCount > 0) await sleep(50);`——自爆演出（含看破/反应弹窗）期间主回合循环挂起，弹窗时游戏逻辑真正暂停；无自爆时计数 0 立即跳过零开销；异常有兜底防轮询卡死。
  3. **先看破后爆炸**（doEnemySelfDestruct 重构，index.html:5207-5270）：合成技能 `boomSkill` 加 `skipKanpoWindow: true`；执行序改为 预警(600ms) → **手动看破判定** `await checkKanpoInterrupt({ caster: enemy, skill: boomSkill, target: null, cancelled: false })` → 被看破则无爆炸直接收尾隐藏尸体（战报 `⛔ 自爆·群X 被看破破局`）→ 通过才播爆炸演出 → `executeSkillAction` 结算。复用现役 checkKanpoInterrupt（BEFORE_SKILL_RESOLVE 同一函数），扣费/[限N次]/旁白/演出全复用；`buildSkillDetailHTML` 对 target=null 安全（群攻显示"目标 全体敌方"）。
  4. **executeSkillAction 看破窗口守卫**（index.html:7318）：条件加 `&& !(skill && skill.skipKanpoWindow)`——自爆跳过内建窗口避免二次弹窗；正常敌方技能行为零变化。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户选定"仅逻辑串行"深度（不引入全局 gamePaused/不冻结粒子/CSS 动画，改动最小且足以消除弹窗时后台推进的怪异感）+ "修复先看破后爆炸"。endTurn 是唯一被所有回合路径 await 的汇合点，在此等待自爆链成本最低；checkKanpoInterrupt 独立可调用，看破判定天然适配前移到爆炸前。本轮为修复记录，README 定版（V6.29）仍待用户实测确认后另行记录。

## [LOG-093] 2026-08-19 — 修复自爆敌人死亡幽灵占位（空血条/残留 buff 图标不消失）

- **变更行为**：
  1. **背景**：用户实测反馈自爆敌人死亡后遗留幽灵占位——上一次改动测试留下**空血条**、本次改动测试留下 **buff 图标残留**，共同点都是敌人不会完全消失。
  2. **根因**：普通死亡路径（`updateEnemyUI` 死亡分支 else 分支，index.html:5340-5341）隐藏的是**整个敌人卡片容器** `enemy.dom`（`#enemy-box-*`，内含名字/buff 容器/sprite/血条/充能格，见 renderEnemies 4949-4966），所以血条与 buff 图标一并消失；而自爆敌人走 `enemy.explode` 分支保留尸体供前摇演出，收尾（`doEnemySelfDestruct` 两处，index.html:5244-5247 看破取消路径与 5263-5267 结算完成路径）只操作了 `spriteDom`（`#enemy-id-sprite`）——**血条容器与 buff 容器（`${enemy.id}-buffs`）未隐藏**，于是空血条/残留 buff 图标滞留在战场上。
  3. **修复**：两处自爆收尾改为同时隐藏 `spriteDom` 与整个 `enemy.dom` 容器（`if (enemy.dom) enemy.dom.style.display = 'none'`，index.html:5247/5267），与普通死亡路径完全一致——前摇期间保留尸体与血条供玩家识别目标，结算完成后整卡消失（含血条/buff/充能格），不再幽灵占位。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：幽灵占位根因是自爆收尾只隐藏 sprite 子节点而漏掉容器；改为隐藏 `enemy.dom` 容器与普通死亡路径对齐，语义统一（"死亡即整卡消失"），也避免后续新增敌人子元素时再次遗漏。本轮为修复记录，README 定版（V6.29）仍待用户实测确认后另行记录。

## [LOG-094] 2026-08-19 — 击杀特写时序 + 横屏刀光错位修复

- **变更行为**：
  1. **击杀特写严格在自爆敌人完全消失后播放**（index.html:7498-7501）：此前击杀特写（playExecutionAnimation）在我方英雄技能结算的 `_pendingKills` 分支直接播放，早于 `endTurn` 的自爆链汇合等待——自爆敌人还在前摇/爆炸演出中（尸体未消失）特写就抢先横斩，演出交错。修复：`_pendingKills` 分支开头（isExecutingCutin 自旋之前）加 `while (selfDestructCount > 0) await sleep(50);`，击杀特写严格等自爆演出（含看破/爆炸/尸体完全消失）全部完成后播放；无自爆时计数 0 立即跳过，行为零变化。
  2. **全屏横屏击杀刀光错位**（index.html:1184-1189 + 1218 + CSS keyframes 33 行）：根因——刀光 `w-[200vw]`（横屏 1920px 屏宽 → 3840px 长线）+ rotate(-15deg) 产生约 500px 垂直偏移，线端脱离敌方图标区、翘到屏幕左上方（"我方角色头顶左边"）。修复：按视口方向动态调整——`isLandscape = innerWidth > innerHeight` 时刀光缩短为 `min(120vw, 1800px)` 且倾角收紧为 `-6deg`（CSS 变量 `--exec-slash-rot`，keyframes 改用变量），使刀光始终横过敌方图标区；竖屏保持 `min(200vw, 900px)` + `-15deg` 原视觉。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：① 击杀特写是"技能收尾演出"，语义上应晚于目标消失演出——在播放点等待自爆链与 endTurn 汇合点等待同构，复用同一 `selfDestructCount` 计数，改动一行；② 刀光错位是横屏视口宽高比剧变放大了长线旋转的垂直偏移，按方向收紧长度/角度比改 CSS 定位更贴合斩击感（刀光仍从中心向两侧展开横扫），CSS 变量让 keyframes 零硬编码、竖屏零回归。本轮为修复记录，README 定版（V6.29）仍待用户实测确认后另行记录。

## [LOG-095] 2026-08-19 — V6.29 定版：自爆四件套+【要害】实测确认 + README §3.9 补充

- **变更行为**：
  1. **实测确认**：用户确认（1）自爆四件套（群伤/群火/群毒/群穿）与【要害】全部生效——群伤非穿透吃防御、群穿穿透吃护盾不吃防御、群火/群毒纯状态、要害群攻减伤 50%；（2）自爆完整反制管线（可闪避/反应拦截/看破打断/屏障吸收）、[复活]+[自爆] 组合（第一次死复活不自爆、再死才自爆）；（3）自爆演出（预警→看破判定→爆炸→整卡消失）、不可被反击、多自爆串行、击杀特写晚于自爆演出、横屏刀光定位全部符合预期。版本定版 V6.29。
  2. **README 文档更新（V6.28 → V6.29）**：
     - **§1 敌方名字变种标签条目**：标签数 11 → 16，列举补充 `[要害]`（群攻伤害 -50%）与 `[自爆:群伤/群火/群毒/群穿]`（死亡自爆，可带 `;power:N`）。
     - **§3.9 标题升级 V6.29**；新增两个标签条目：`[要害]`（群攻减伤，与流体家族同型、单体不受影响）与 `[自爆:群X]` 四件套（死亡自爆完整管线、语法/数值口径、反制与演出细节、与 [复活] 自洽）；组合示例区追加自爆组合示例（[复活][自爆] 与 *2 群穿）。
     - **§9 世界书系统**：标签支持数 11 → 16。
  3. **LOG-INDEX 回填**：LOG-090/091/092/093/094 的 HASH 回填为对应代码提交。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后更新 README 并升版本号定版；LOG-090~094 为代码施工与四轮修复记录、本轮为文档定版记录，分条保持可溯源。

## [LOG-096] 2026-08-19 — 记录弹窗新增【结束当前战斗，将过程发送到酒馆】按钮 + 战局记录可解锁编辑（未升版本号）

- **变更行为**：
  1. **背景/Bug**：V6.12 将【记录】拆为纯只读预览（去掉了发送按钮）。战斗结束弹出结算面板后，用户点击【返回查看残局】（closeBattleResult）关闭结算弹窗，再打开右上角【记录】时只剩「关闭」按钮——**找不到任何"发送到酒馆"的入口**。用户需求：在记录中加一个【结束当前战斗，将过程发送到酒馆】按钮，让玩家自由决定何时结束战斗；点击**无需新增文案**（不生成 LLM 旁白/续写提示词），默认由玩家手写后续发展。
  2. **按用户反馈定稿（第二轮调整）**：① **不终止战斗循环**——按钮仅将战局记录注入酒馆输入框，`startRound`/`nextTurn` 守卫与 `state` 零改动（最初实现曾引入 `state.isBattleEnded` 停止循环，用户确认"不用结束回合循环，玩家如后悔可随时返回战斗"后整体撤销）；② **记录默认锁定可解锁编辑**——`history-preview` 保持只读，底部新增【🔓 解锁编辑】按钮，点击后可自由编辑战局文本，便于发送前微调文案。
  3. **记录弹窗 UI**：副标题改为「查看本次战斗历史 · 可随时结束战斗并将过程发送至酒馆」；底部操作栏自左至右为【🔓 解锁编辑】【关闭】【📤 结束当前战斗，将过程发送到酒馆】（发送按钮沿用结算面板同款 indigo-purple 渐变主按钮）。
  4. **解锁编辑**（`toggleHistoryEdit`，index.html:7842）：点击解锁 `preview.readOnly = false` 可编辑，按钮切换为 emerald 渐变「🔒 已解锁 · 点击锁定」，再点锁回并恢复「🔓 解锁编辑」；`showHistoryOnly`（index.html:7821）每次打开填充最新 `battleHistory` 并**重置为默认锁定态**（编辑产物仅用于本次发送、不写回 battleHistory，避免后续战报追加到已编辑文本产生混乱）。
  5. **发送逻辑抽取**：`injectTextToTavern(text)`（index.html:7923）——把原 `sendResultToTavern` 的酒馆注入逻辑（优先 `#send_textarea` 填充+input 事件，找不到时回退 `triggerSlash(/send …|/trigger)`）抽取为可复用助手并返回成功与否；`sendResultToTavern` 改为调用它（行为零变化：失败路径不弹按钮反馈、不关结算弹窗）。
  6. **新增 `endBattleAndSendToTavern()`**（index.html:7863）：空记录提示不执行；否则读取 `history-preview` 当前值（**默认 = 最新战局记录原样，解锁编辑后 = 玩家微调内容**）经 `injectTextToTavern` 注入酒馆输入框，成功后关闭记录弹窗并顶部提示；**不改变任何战斗状态**（不停止循环、不锁定操作），玩家随时可返回继续战斗。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：根因是 V6.12 拆分后记录弹窗丢失发送入口，按用户指定方案在记录内补"发送"按钮；"结束战斗"是**叙事层语义**（把过程交给玩家手写发展），引擎层保持活跃，故不复用 `isGameStarted`、不引入任何停止机制——玩家"后悔"（想继续打）时战斗原样可玩；记录编辑走"默认锁定 + 显式解锁"降低误改风险（锁定是浏览器原生 readonly，防呆零成本），发送读 textarea 当前值使编辑产物天然生效；发送逻辑抽取 `injectTextToTavern` 消除与结算弹窗发送的重复（约 20 行），两处入口行为保持一致。本轮为代码施工记录、未升版本号不改 README（待用户实测确认后定版升 V 并补 README §2.2 记录弹窗说明）。

## [LOG-097] 2026-08-19 — V6.30 定版：记录弹窗发送到酒馆 + 可解锁编辑实测确认 + README §2.2 补充

- **变更行为**：
  1. **实测确认**：用户确认（1）【📤 结束当前战斗，将过程发送到酒馆】按钮正常——战局记录原样注入酒馆输入框、无任何 LLM 文案生成、玩家可自由决定结束时机；（2）发送**不终止战斗循环**——发送后战斗照常进行，后悔可随时返回继续战斗；（3）【🔓 解锁编辑】按钮正常——默认锁定只读、解锁后可编辑、发送内容为编辑后文本、关闭重开恢复锁定并填充最新记录。版本定版 V6.30。
  2. **README 文档更新（V6.29 → V6.30）**：
     - **顶部版本号** `V6.29 → V6.30`。
     - **§2.2【📜 战局记录预览与发送（V6.30）】**条目改写：原「仅只读展示、不发送到酒馆」说明更新为弹窗内两个功能按钮——【🔓 解锁编辑】（默认锁定只读、点击解锁可编辑、再点锁回；每次打开自动重置锁定态并填充最新记录、编辑内容仅用于本次发送不写回战局记录）与【📤 结束当前战斗，将过程发送到酒馆】（原样注入酒馆输入框、不生成旁白/续写文案、由玩家手写发展、**不终止战斗循环**、后悔可随时返回继续战斗）。
  3. **LOG-INDEX 回填**：LOG-096 的 HASH 回填为对应代码提交。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后更新 README 并升版本号定版；LOG-096 为代码施工记录（含首版 `isBattleEnded` 停止循环方案被用户否决后的定稿说明）、本轮为文档定版记录，分两条保持可溯源。

## [LOG-098] 2026-08-19 — 新增敌方变种标签【蜕皮】【荆棘】【连动】（未升版本号）

- **变更行为**：
  1. **【蜕皮】**（Boss 二阶段）：首次 HP 跌破 50% 时——清除自身全部 debuff（毒/燃/晕/降防/降准/降避/降攻，复用【驱散】同款负面谓词）+ 回血 30%（封顶 maxHp）+ 永久攻击 +50%。永久攻击采用 `molted` 一次性标记 + `getEffectiveStats` 被动读取（与【狂暴】同型，非 buff 对象）——不随回合过期、不被驱散清除、跨【复活】仍永久。受击后一次阈值检查（`tryTriggerEnemyMolt`），致死伤害走击杀早退不触发 → 天然形成"斩杀线"决策。
  2. **【荆棘】**：被**近战**命中时反弹 30% **实际伤害**（`AFTER_DAMAGE` 事件内与【吸血】同管道）。反弹走**正常减伤管线**（`calculateDamage`，受攻击者护甲/护盾/防御姿态减免）；反弹致命伤害先 emit `ON_FATAL_DAMAGE` 让毅力留存/回避致命可救场（复用主伤害管线同款判定 + 保命旁白 `triggerAllyFatalSaveSpeak`）。与【吸血】一致，致死一击早退于 AFTER_DAMAGE → 斩杀【荆棘】敌人不反弹；反伤不经过【肃正】屏障（与【吸血】同管道，不加屏障分流）。
  3. **【连动】**：HP ≤ 30% 时立刻行动一次（**一次性** `linked` 标记）。插队方式与【再动】同款 `state.actionQueue.splice(queueIndex+1, ...)` 由 `endTurn→nextTurn` 正常拾取；守卫 `enemy.hp > 0`（DoT 致死不触发）。**TURN_START 额外订阅**覆盖"入场即低血"场景（场面上无跌破瞬间时轮到其回合开始才满足条件），与受击触发共用 `linked` 守卫防重复。
  4. **受击漏斗接线**（与现有 `tryTriggerEnemyLowHpSpeak` 并排，三处全覆盖）：主伤害管线（`applySingleTagEffect` 敌方受击收尾）、反击路径（敌方 caster 被普通反击/强力反击扣血）、DoT tick（`nextTurn` 毒/燃烧回合起始扣血）。
  5. **UI**：详情弹窗 `TAG_BADGE` 注册表追加 3 条可读徽章（【蜕皮】琥珀/【荆棘】翠绿/【连动】品红 + hover 描述）；`startGame` 初始化敌人一次性标记复位（`delete e.molted/linked`，与 `hasTriggeredGrit` 等并列）。
  6. **零解析改动**：三标签经既有双写入点（名字后缀/属性栏）自动收集进 `enemy.tags`，不触碰 `parseEnemyItem`/`parseSkill`/`SKILL_TYPES`。
- **涉及函数/模块**：`getEffectiveStats()`（【蜕皮】永久 atk 被动读取）、新增 `tryTriggerEnemyMolt()` / `tryTriggerEnemyLink()`（阈值辅助）、`applySingleTagEffect()` 敌方受击收尾 / 反击路径 / `nextTurn()` DoT tick（三处受击漏斗接线）、`CombatEvents.on(TURN_START)`（【连动】入场低血）、`CombatEvents.on(AFTER_DAMAGE)`（【荆棘】反伤，与【吸血】同 handler）、`showEnemyInfo()` 的 `TAG_BADGE`（徽章注册表）、`startGame()`（一次性标记复位）
- **决策原因**：需求新增三类 Boss/精英向敌方标签——【蜕皮】制造"斩杀线"决策（受击后一次阈值检查、清 debuff + 回血 + 永久增攻的二阶段设计）；【荆棘】克制无脑平砍（近战反弹 30% 实际伤害，走正常减伤管线与保命被动救场，斩杀可规避形成博弈）；【连动】残血爆发（首次 ≤30% 立刻行动一次，一次性防【再生】回血震荡刷爆）。全部复用现有事件管道与插队模式实现，遵循项目"变种标签运行时挂钩、零解析改动"的既有架构。本轮为代码施工记录、未升版本号不改 README/SPEC（待用户实测确认后定版 V6.31 并补 README §3.9）。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；逻辑经代码走查验证（[蜕皮] 40%→清 debuff+回血+永久 atk / 一波斩杀不触发；[荆棘] 近战反弹、远程法术不反弹、护盾吸收、保命被动救场、斩杀不反弹；[连动] 首次 ≤30% 插队行动、一次性不重复、DoT 致死不触发、TURN_START 入场低血兜底）。

## [LOG-099] 2026-08-19 — 【荆棘】反伤数值上调：反弹 50% + 10 点下限（未升版本号）

- **变更行为**：
  1. **数值调整**：反弹比例由 **30% → 50%** 实际伤害，并新增 **10 点伤害下限**（`reflectRaw = Math.max(10, Math.floor(ctx.hpDmg * 0.5))`）。
  2. **减免逻辑保持不变**：下限施加在反弹原始值上，随后仍走既有正常减伤管线（`calculateDamage`，受攻击者护甲/护盾/防御姿态照常减免）；反弹致命走 `ON_FATAL_DAMAGE` 保命被动救场、致死一击早退不触发等语义全部不变。
  3. **UI**：详情弹窗 `TAG_BADGE` 中【荆棘】描述同步更新为「被近战命中时反弹 50% 实际伤害（下限10）」。
- **涉及函数/模块**：`CombatEvents.on(AFTER_DAMAGE)`（【荆棘】反伤块，`reflectRaw` 计算式）、`showEnemyInfo()` 的 `TAG_BADGE`（描述文本）
- **决策原因**：用户实测反馈——原反弹 30% 实际伤害，因基础伤害已含怪物 armor 减免、反弹又经攻击者 armor 二次减免，实际威慑度偏低；上调至 50% 并加 10 点下限，确保即使低伤刮蹭也能反弹足量伤害，形成对无脑平砍的实质克制，同时维持既有减伤管线与保命被动语义不变（盾卫/防御姿态仍能有效削减反伤）。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错。



## [LOG-100] 2026-08-19 — 【荆棘】10 点下限修正为"护甲减免后保底"（未升版本号）

- **变更行为**：
  1. **语义修正**：LOG-099 实现的下限（`reflectRaw = max(10, floor(hpDmg*0.5))`）施加在反弹**原始值**上，经攻击者护甲二次减免后仍可能只剩 -1/-3 等挠痒数值。按用户澄清改为——下限在**护甲减免后**生效：`reflectRaw = max(floor(hpDmg*0.5), 10 + getEffectiveStats(attacker).def)`，垫高原始反伤值使护甲结算后（护盾吸收前）至少 10 点。
  2. **减免逻辑保持**：垫高后的原始值仍走既有 `calculateDamage` 管线——防御姿态（减半）、护盾（吸收）、免伤等主动减伤照常生效；护盾可全额吸收保底反伤（玩家以护盾资源化解），反弹致命走 `ON_FATAL_DAMAGE` 保命被动救场、致死一击早退不触发等语义全部不变。
  3. **UI**：详情弹窗 `TAG_BADGE` 中【荆棘】描述更新为「被近战命中时反弹 50% 实际伤害（护甲减免后保底10）」。
- **涉及函数/模块**：`CombatEvents.on(AFTER_DAMAGE)`（【荆棘】反伤块，`reflectRaw0`/`reflectRaw` 计算）、`showEnemyInfo()` 的 `TAG_BADGE`（描述文本）
- **决策原因**：用户澄清下限语义——要保底的是"被玩家护甲减免后的最终反伤"，而非反弹原始值；否则高防御玩家仍能把反伤压到 1 点以下，"避免无关痛痒"的目标落空。垫高原始值 + 复用 `getEffectiveStats(attacker).def` 反推，实现最简且与既有减伤管线完全一致（防御姿态/护盾照常）。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；逻辑走查——反伤 10 对防御 15 玩家 → 垫高 25 → 结算 10 点；低伤刮蹭（反伤 6、防御 0）→ 结算 10 点；玩家护盾 20 全额吸收保底反伤（hpDmg=0、护盾-10）。
## [LOG-101] 2026-08-19 — V6.31 定版：新增变种标签【蜕皮】【荆棘】【连动】实测确认 + README 更新

- **变更行为**：
  1. **实测确认**：用户确认（1）【蜕皮】首次 HP 跌破 50% 清全部 debuff + 回血 30% + 永久攻击 +50%，受击一次阈值检查、致死不触发形成"斩杀线"决策；（2）【荆棘】近战反弹 50% 实际伤害、护甲减免后保底 10 点，高防玩家反伤不再出现 -1 挠痒，护盾/防御姿态仍照常减免；（3）【连动】首次 ≤30% 立刻行动一次、一次性不重复。版本定版 V6.31。
  2. **README 文档更新（V6.30 → V6.31）**：
     - **顶部版本号** `V6.30 → V6.31`。
     - **§1 敌方名字变种标签**：标签数 16 → 19，追加 **`[蜕皮]`** / **`[荆棘]`** / **`[连动]`** 简述。
     - **§3.9 敌方变种标签**：标题 `V6.29 → V6.31`；【吸血】条目后新增 3 条（【蜕皮】Boss 二阶段 /【荆棘】近战反伤 /【连动】残血连动，均含完整语义、数值口径与边界）；组合示例区新增 Boss/精英组合示例（荆棘兽王/剧毒花妖）。
     - **§9 世界书**：变种标签支持数 16 → 19。
  3. **LOG-INDEX 回填**：LOG-100 的 HASH 已回填（aaff15e）；本轮追加 LOG-101 行并回填 HASH。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后更新 README 并升版本号定版；LOG-098 为三标签代码施工记录、LOG-099/100 为【荆棘】数值两次修正记录、本轮为文档定版记录，分条保持可溯源。

## [LOG-102] 2026-08-19 — 击杀结算动画按伤害类型分流：近战风格一 / 法术风格三 / 远程风格四（未升版本号）

- **变更行为**：
  1. **需求背景**：`demo-execution.html` 独立原型中已打磨出 5 套击杀结算动画风格（Style 1 同轴斜切刀光 / Style 2 居合一闪 / Style 3 次元裂隙·空间碎镜 / Style 4 战术锁定·矩阵激光切割 / Style 5 星穹漫画）。用户指定接入主引擎三套：**近战击杀 → Style 1（改进后的原版，刀光同轴定位）**、**法术击杀 → Style 3**、**远程击杀 → Style 4**。
  2. **CSS 层（index.html `<style>` 顶部）**：
     - Google Fonts 导入追加 `family=Cinzel:wght@700;900`（Style 4 的 ELIMINATED 等英文艺术字所需）；
     - 删除旧「史诗击杀特效」`exec-*` 全套（`exec-hero-in`/`exec-enemy-in`/`exec-slash`/`exec-shatter-top/bottom`/`exec-vs-pop` + `.anim-exec-*` 类，已确认仅被旧 `playExecutionAnimation` 引用、无其它使用者），替换为新多风格 keyframes：通用 `.font-cinzel` / `.text-outline-thick` / `.heavy-shake` + `@keyframes heavy-shake-anim`；Style 1 的 `s1-hero-in`/`s1-enemy-in`/`s1-slash-anim`/`s1-top-shatter`/`s1-bottom-shatter`/`s1-vs-anim`；Style 3 的 `s3-rift-beam`/`s3-shard-1~4`；Style 4 的 `s4-hud-ring`/`s4-laser-horiz`/`s4-laser-vert`。全部原样取自 demo（关键帧与 CSS 变量 `--hero-ox/oy`、`--enemy-ox/oy`、`--slash-rot` 语义一致）。
  3. **`playExecutionAnimation(hero, killedEnemies, damageType)` 重写**（index.html:1251，签名新增第三参数 `damageType`，缺省 `'近战'`）：保留原 Promise 封装 / `z-[200]` 全屏 overlay / `enemy.img ? img : emoji` 适配 / fade-out + resolve 生命周期 / `playSound('kill')` + 震屏收尾。内部按类型分发三套演出：
     - **Style 1（近战，默认）**：横竖屏同轴数学完整移植（横屏 rot -7° / 竖屏 -14°，`tan(rotRad)` 计算英雄/敌人垂直偏移，使其落在刀光旋转轴上，解决旧版刀光脱离敌我图标的问题）；敌人区由外层 `translate(var(--enemy-ox),var(--enemy-oy))` 定位 + 内层 `s1-enemy-in` flex 并排，**每敌各自上下两半 `s1-top/bottom-shatter` 碎裂**（多敌适配：外层负责斜轴定位、内层逐敌滑入，避免 demo 单敌的 transform 叠置）；刀光 `width:140vw` + `s1-slash-anim`；中心「击破/全灭」玫瑰红艺术字。
     - **Style 3（法术）**：紫粉 `bg-slate-950/85` + 双裂隙光带 `s3-rift-beam`；英雄紫色圆头像入场；**每敌四象限晶体碎片** `s3-shard-1~4` 崩解（右 10vw 区 flex 并排）；中心渐变剪贴文字「湮灭/全灭」（`from-purple-400 via-fuchsia-300 to-rose-400`）；开场 `playSound('burst')`，killDelay 250ms。
     - **Style 4（远程）**：青黑 `bg-slate-950/80` + 青色 HUD 蜂窝点阵底纹；英雄战术框（青色边框 + `OPERATOR: ${hero.name}` 标签）；**每敌旋转锁定环 `s4-hud-ring` + 水平/垂直十字激光 `s4-laser-horiz/vert` + 上下两半碎裂**；中心 Cinzel「ELIMINATED / 全灭」+「TARGET NEUTRALIZED」徽章；开场 `playSound('taunt')`，killDelay 280ms。
  4. **多敌尺寸自适应**：`sizeCls` / `unitSize` 按击杀数 1 / 2 / 3+ 三档收缩（emoji 字号与单元尺寸），避免竖屏群攻全灭时敌人区溢出裁切；文字规则统一「单敌风格字 / 多敌全灭」。
  5. **调用点**（index.html:7762）：`await playExecutionAnimation(caster, _pendingKills, skill.damageType || '近战')`——`skill` 在 `executeSkillAction` 作用域内可直接读取，`selfDestructCount` 等待 + `isExecutingCutin` 互斥锁保持不变。
  6. **音效零新增**：全部复用现有 `audioUrls` 中已存在的 `kill`/`burst`/`taunt` key。
- **涉及文件**：`index.html`、`LOG.md`。
- **决策原因**：按用户指定方案把 demo 打磨完毕的三套风格按伤害类型接入唯一击杀特写入口；`damageType` 从 `skill.damageType || '近战'` 取（引擎全链路统一口径，未显式标注类型默认近战）；"每个敌人各自完整演出对应风格"由用户确认（群攻多杀时逐敌完整演出，视觉最忠实于风格，DOM 随敌数增长但战斗停顿时间不变）；删除旧 `exec-*` 层因新函数已完整覆盖其唯一使用者、避免残留死代码（Coding rule 手术式修改）；Style 2/5 与 DoT/反击/荆棘等其它击杀来源不在本轮范围。本轮为代码施工记录、未升版本号不改 README/SPEC（待用户实测确认后定版升 V 并补 README §2.2）。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；三风格 HTML 模板变量绑定走查（英雄 `hero.img/name`、敌 `img/emoji/name` 均有值兜底）；旧 `exec-*` 引用零残留；音效 key 存在性确认。

## [LOG-103] 2026-08-19 — 击杀动画性能优化：纯 transform 化 + 激光全局单组（未升版本号）

- **变更行为**：
  1. **背景/Bug**：用户实测远程击杀特效（Style 4）帧率较低。根因有两处：
     - **CSS 动画属性**：`s4-laser-horiz/vert` 动画 `height`/`width`（+ `filter: drop-shadow`）——尺寸属性动画强制每帧 **layout + repaint（CPU 主线程）**，无法 GPU 合成；150vw/150vh 的全屏级激光元素还叠加 `filter` 每帧采样，开销最大。
     - **元素数量**：十字激光原为**每个敌人各插一组**（群攻 3 敌 = 6 条全屏级动画元素重叠），多敌时绘制浪费翻倍。
  2. **全局优化原则**：击杀动画（近战/法术/远程）中所有 `height`/`width`/`filter: drop-shadow` 动画全部改写为**纯 `transform`（scaleX/scaleY）+ 静态 `box-shadow` 辉光**——transform/opacity 由 GPU 合成器处理、不触发 layout，辉光从动画帧中移除后由元素静态 box-shadow 承担（视觉不变）：
     - `s1-slash-anim`：height 2→16→8→0 → `scaleY 0.25→2→1→0`（相对 base `h-2/h-2.5`）；`filter: drop-shadow` 移除，辉光由刀光元素既有静态 `shadow-[0_0_20px_#f43f5e,0_0_50px_#fff]` 承担。
     - `s3-rift-beam`：height 0→160→90→0 → `scaleY 0→1→0.5625→0`（相对 base `h-40`=160px）；`filter: drop-shadow` 移除，辉光由裂隙细线既有静态 `shadow-[0_0_30px_#c084fc,0_0_60px_#a855f7]` 承担。
     - `s4-laser-horiz/vert`：height/width 0→5→2→0 → `scaleY/scaleX 0→1.25→0.5→0`（相对 base `h-1/w-1`=4px）；`filter: drop-shadow` 移除，改静态 `box-shadow: 0 0 15px #06b6d4, 0 0 35px #06b6d4`。
     - `s1-top-shatter`：移除 `filter: drop-shadow(0 0 25px #f43f5e)`（保留 `brightness` 爆亮——brightness 走 GPU 光栅化开销低，视觉爆亮效果保留）。
  3. **Style 4 结构性降载**：
     - 十字激光从**每敌一组**提升为**屏幕中心全局单组**（仅保留 1 组水平 + 1 组垂直，位于敌人区之上、全屏切割视觉不变）——群攻多敌时由 6 条全屏激光降至 2 条，多敌数量越多收益越大。
     - HUD 蜂窝点阵底纹加 `transform: translateZ(0)` 隔离层：静态背景独立成层、光栅化一次即缓存，不被相邻动画层波及重绘。
  4. **`will-change: transform, opacity`**：全部动画元素（刀光/裂隙/激光/碎裂片/英雄入场/艺术字）显式声明，提示浏览器提前合成器层、避免动画启动瞬间的层提升卡顿。
- **涉及文件**：`index.html`、`LOG.md`。
- **决策原因**：帧率问题的本质是"每帧强制 layout + repaint 的尺寸动画 × 全屏级超大元素 × 多敌重复"，三点逐项化解——动画改纯 transform 直指根因（Chrome 渲染管线标准优化：width/height 动画永远 CPU layout，transform 动画 GPU 合成）；激光全局单组消除重复的全屏绘制（画面语义不变：十字切割仍是全屏贯通效果）；底纹隔离 + will-change 消除潜在层间重绘。视觉保真：辉光全部由静态 box-shadow 承担、碎裂片保留 brightness 爆亮、裂隙/激光的粗细变化用 scaleY 等比还原。**大幅降低触发次数与每帧成本，效果几乎不变**。本轮为代码施工记录、未升版本号不改 README/SPEC（待用户实测确认帧率达标后并入 LOG-102 一并定版）。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；击杀动画 CSS 区块 grep 确认零 `height:`/`width:`/`filter: drop-shadow` 残留（残留命中均为敌方大招 cutin-* 与呼吸动画等无关区域）；`s4-laser` 出现 4 处 = CSS 定义 2 + JS 全局单组 2，群攻多敌不再按敌复制。

## [LOG-104] 2026-08-19 — 远程击杀动画替换为「极速战术狙杀」狙击镜版（未升版本号）

- **变更行为**：
  1. **背景**：LOG-103 性能优化后近战/法术已流畅，远程（旧 Style 4 十字激光版）仍有卡顿。用户已自行在 `demo-execution.html` 将 Style 4 重构为「🎯 极速战术狙杀（Ultra-Fast Sniper Scope）」轻量化方案并实测达标，要求将主引擎现有的远程击杀替换为新版。
  2. **CSS 层（index.html `<style>`）**：删除旧 `s4-hud-ring` / `s4-laser-horiz` / `s4-laser-vert` 三个 keyframes，替换为狙击版六条：
     - `s4-scope-lock`（SVG 准星缩放锁定：`scale3d 2.4→1→1.3` + rotate，纯 transform）
     - `s4-bullet-streak`（贯穿全屏子弹光束：`scaleX 0→1→1.1` + `scaleY 1→0.5→0`——demo 原 height 6→3→0 动画按 LOG-103 原则改 scaleY，base `h-1.5`=6px）
     - `s4-shockwave-ring`（激波环：纯 `scale 0.1→3.2` 扩散——demo 原 border-width 6→2→0 动画移除、改静态 `border-2`，避免每帧 border 重绘）
     - `s4-sniper-text`（「击破」艺术字：`scale 3.5→0.95→1.08→1→1.25`——demo 原 `filter: blur` 移除）
     - `s4-enemy-split-left/right`（敌人左右两半贯穿碎裂：`translate3d ±75px` + rotate + brightness，纯 GPU transform）
  3. **JS 层（`playExecutionAnimation` 远程分支整体替换）**：
     - 背景 `bg-slate-950/75`（去掉旧 HUD 蜂窝底纹层，随 demo 新方案）；
     - **左侧狙击手 HUD 视窗**：青色细边框 + `SNIPER: ${hero.name}` + `CALIBER: 12.7MM` 标签（用实际击杀者身份替代 demo 硬编码的 sean）；
     - **居中文字**：`[ TARGET NEUTRALIZED ]` 胶囊徽章 + Cinzel「击 破」渐变字（`from-cyan-200 via-cyan-400 to-teal-500`）；多敌显示「全灭」；
     - **每敌单元**（多敌并排，尺寸三档收缩复用 `unitSize`）：极简 SVG 战术瞄准准星（纯矢量，`width:110%;height:110%` 相对单元缩放）+ 激波环（`width:78%`）+ 敌人左右贯穿碎裂（`enemyVisual` img/emoji 适配）；
     - **全局单条超音速子弹光束**：160vw 渐变色条贯穿全屏（穿透整个敌人区，替代旧版每敌十字激光）；
     - 时序：0ms `playSound('taunt')`、240ms `playSound('kill')` + `heavy-shake`（killDelay 240）；
     - 全部动画元素带 `will-change: transform, opacity`。
  4. **性能要点**：新版以「极速狙击」替换旧「激光切割」的代价大幅下降——全屏级激光元素从旧版 2 条（×每敌重复隐患）降为全局 1 条子弹光束；准星为纯 SVG 矢量（静态光栅化后仅 transform 缩放）；敌人碎裂用 `translate3d`（GPU 合成）；无任何 width/height/border-width/filter 动画残留（除碎片保留的 GPU 化 `brightness` 爆亮）。
- **涉及文件**：`index.html`、`LOG.md`。
- **决策原因**：按用户指示"查看 demo 中新的风格四修改，将现有远程击杀替换之"——demo 新版是用户实测优化的参考实现（注释明确「纯 GPU 硬件加速变换 translate3d/scale3d，零卡顿，60FPS」），主引擎完整移植并适配：击杀者身份（`hero.img/name`）替代 demo 固定角色、`enemyVisual` 支持 img/emoji、多敌并排逐敌完整演出（沿用用户已确认的多敌原则）、`playSound` 复用现有音效 key（taunt/kill 零新增）。移植时把 demo 中残留的三处非 transform 动画（bullet height / ring border-width / text blur）也一并按 LOG-103 原则纯 transform 化，确保替换后依旧零重绘。本轮为代码施工记录、未升版本号不改 README/SPEC（待用户实测确认帧率与视觉后并入 LOG-102/103 一并定版）。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；旧 `s4-laser` / `s4-hud-ring` / `ELIMINATED` / `OPERATOR:` 引用零残留；新六条 keyframes + JS 引用齐全。

## [LOG-105] 2026-08-19 — 击杀动画碎裂片爆亮降档：去除过曝白/红闪（未升版本号）

- **变更行为**：
  1. **背景/Bug**：用户实测反馈——显示击杀敌人时出现刺眼的"全屏红色闪烁"，一次击杀多个敌人时闪烁叠加、伤眼睛。根因有二：
     - **碎裂片过曝爆亮**：三套风格的敌人碎裂片动画都把视觉内容（emoji/图片）亮度提到 `brightness(2~2.2)`，浅色敌人会过曝成白/红闪光；且碎裂片为**每敌重复**元素（Style 1 每敌 1 片、Style 3 每敌 4 片、Style 4 每敌 1 片），全部在 0.24~0.28s 同一时刻爆亮——群攻 3 敌时 Style 3 同时 12 个 2 倍过曝点叠加，刺眼感成倍放大。
     - **全屏级红辉光**（风格核心，仅 1 条不叠加）：Style 1 刀光 `shadow 0 0 20px #f43f5e` 玫瑰红辉光横贯全屏——保留不动（改进版原版动画的既定视觉）。
  2. **数值调整**：碎裂片 `brightness` 爆亮降档——`s1-top-shatter` 2.2 → **1.4**；`s3-shard-1~4` 与 `s4-enemy-split-left` 2 → **1.35**（5 处）；`s4-enemy-split-right` 暗侧 0.3 保持。保留"击碎瞬间爆亮"的语义与上下半片亮/暗对比，但不再过曝成白闪，多敌叠加时的整体亮度峰值显著下降。
- **涉及文件**：`index.html`、`LOG.md`。
- **决策原因**：刺眼感的本质是"每敌重复元素 × 同一时刻 × 2 倍以上过曝"的乘积效应。碎裂片是击杀动画的通用组件（三套风格共享碎裂语义），统一降档到 1.35~1.4 倍既保留击碎反馈又不伤眼；全屏刀光/裂隙/光束等风格核心光效仅单条、不随敌数叠加，保持不动（避免破坏既定风格）。若后续仍觉刺眼可进一步降到 1.2 或错峰碎裂动画时间。本轮为代码施工记录、未升版本号不改 README/SPEC（待用户实测确认后并入 LOG-102~104 一并定版）。
- **经验证**：grep 确认碎裂片 brightness 现值全部 1.4/1.35（2.0/2.2 残留 0）；Node 提取 `<script>` 语法校验通过，零报错。

## [LOG-106] 2026-08-19 — 受击全屏红闪与白闪降档：定位并修复"击杀前整屏红色连续闪烁"（未升版本号）

- **变更行为**：
  1. **背景/Bug 定位**：用户反馈"全屏震红在击杀特效**之前**出现、整屏红色连续闪烁数次"，且上轮（LOG-105 碎裂片降档）无改善——说明闪烁**不在击杀 overlay 内**。定位到根因：**受击闪光 `window.spawnHitFlash`**（index.html:3968）——它属于伤害结算管线，任何一次命中都会触发，且发生在击杀 overlay 出现**之前**：
     - **全屏红色暗闪**（L3972）：`intensity > 0.3` 时向 canvas 加一个 `#ff2020` 全屏填充粒子，alpha 最高 `intensity × 0.35`、`life:120`（按粒子引擎每帧 16.7ms 计 ≈ **2 秒**的全屏红色淡出）；
     - **白色剪影三连闪**（L3986）：重创（intensity > 0.45）时受击者 `brightness(5) saturate(0)` **连续闪 3 次**；
     - **多敌叠加**：调用点在 `applySingleTagEffect` 每次命中都触发（L7379），群攻命中 N 个敌人 = N 个全屏红粒子叠加 + 每敌 3 连闪，叠加后刺眼感成倍放大。
  2. **数值降档**（保持"重创反馈"语义、大幅降低伤眼程度）：
     - 全屏红粒子：alpha 系数 `intensity × 0.35 → 0.16`（约减半），寿命 `life:120 → 70`（约 2 秒 → 1.2 秒）；
     - 白色剪影闪：`brightness(5) → 2.4`（保留泛白剪影但不再致盲；`saturate(0)` 黑白化保留）。
  3. **影响面**：`spawnHitFlash` 为全局受击反馈（敌人受击/英雄受击/屏障受击/屏障破碎 L7534 均走此函数），降档对所有重创受击生效——用户反馈"击杀前整屏红"即由此消除；普通轻伤（intensity ≤ 0.3）本就不触发红闪、单闪也一并温和化。
- **涉及文件**：`index.html`、`LOG.md`。
- **决策原因**：上轮 LOG-105 误判为击杀 overlay 碎裂片过曝，用户澄清闪烁在特效之前——实为伤害结算管线的受击闪光，与击杀演出无关。修复直接对准 `spawnHitFlash`：全屏红是"整屏红"的直接来源、white 三连闪是"连续闪烁数次"的来源、每敌独立触发是"多敌叠加"的来源，三处一并降档。保留触发阈值与闪次结构（重创仍三连闪、普通仍单闪），仅降强度/时长，视觉反馈层次不变。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；grep 确认新值 `life:70` / `alpha × 0.16` / `brightness(2.4)` 就位。

## [LOG-107] 2026-08-19 — 受击红闪改为「血溅镜头」边缘径向暗红渐变（未升版本号）

- **变更行为**：
  1. **背景**：LOG-106 将全屏红 alpha/life 降档后用户仍觉刺眼，要求改为**屏幕边缘径向渐变暗红边框**（"像血飞溅到了镜头上"）——中心保持干净不遮战斗主体。
  2. **实现**（`spawnHitFlash` 全屏红粒子 → 边缘 vignette）：用 `ctx.createRadialGradient` 绘制暗红边框——渐变内圈（中心起 42% 半径）全透明、0.72 处半透明暗红（`rgba(127,29,29,…)`）、最外圈加深暗红（`rgba(88,16,16,…)`），整体 alpha 系数 `intensity × 0.6`、寿命 `life:70`（约 1.2 秒）随 pct 淡出。每次命中仍独立触发一次（多敌叠加时仅边缘加深，中心始终干净）。
- **涉及文件**：`index.html`、`LOG.md`。
- **决策原因**：用户明确指定视觉方案——"血溅到镜头"即边缘 vignette：中心区域完全不受影响（观战/操作视线不遮挡），暗红低饱和（red-900 系）替代原先高饱和 `#ff2020`，径向渐变天然在视觉上"从边缘向中心渗入"的血渍感，且多敌叠加不会变成整屏红。渐变每帧由单个粒子创建一次，开销可忽略（保持 LOG-103 性能原则）。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；渐变三档 colorStop（0 透明 / 0.72 半透明 / 1 深红）与 alpha/life 就位。

## [LOG-108] 2026-08-19 — 带 WebM 特效的大招击杀演出延迟 1s，避免与技能演出重叠（未升版本号）

- **变更行为**：
  1. **背景/Bug**：技能带 `[特效:xxx]`（WebM 特效大招，如火焰01/雷暴等）时，击杀结算动画会在技能特效演出尚未播完时立即播放，两段全屏演出重叠互相干扰。
  2. **修复**（`executeSkillAction` 击杀特写块，index.html:7805）：在 `selfDestructCount` 自爆等待与 `isExecutingCutin` 互斥锁之后、调用 `playExecutionAnimation` 之前，追加 `if (skill.fxTag) await sleep(1000);`——技能存在 `[特效:]` 标签（解析为 `skill.fxTag`，非空）时击杀演出延迟约 1s，让 WebM 大招演出先行完整播放。无特效标签技能零影响（立即播放，行为不变）。
- **涉及文件**：`index.html`、`LOG.md`。
- **决策原因**：WebM 特效系统（`playWebMFX`）时长普遍在 1s 级，用户明确要求"延迟 1s 左右"。延迟放在互斥锁内（`isExecutingCutin = true` 之前）——等待期间不抢占锁，敌方大招 cut-in 若同时发生仍可正常排队；复用既有 `skill.fxTag` 字段（解析与技能编辑器下拉共用同一来源），判断成本为零。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；`skill.fxTag` 字段存在性确认（L4618 解析、L9088/9094 编辑器引用）。

## [LOG-109] 2026-08-19 — 结算弹窗【返回查看残局】改为收起 + 战斗记录去除世界书激活情况（未升版本号）

- **变更行为**：
  1. **【返回查看残局】改为收起而非完全消失**（`closeBattleResult`，index.html:8224）：点击后弹窗淡出隐藏，同时底部生成悬浮「📋 重新打开结算」胶囊按钮（复用 `shelvePrompt` 同款恢复按钮机制：fixed 底部居中 z-210、点击移除按钮并重新以 `flex` 显示弹窗）——玩家可随时恢复结算弹窗，重新打开【发送至酒馆输入框】发送战局记录到酒馆，无需等待新一轮战斗结束。按钮文案「返回查看残局」的语义与"收起"一致（原为直接销毁弹窗）。
  2. **发送成功路径改为彻底关闭**（`sendResultToTavern`，index.html:8268）：发送成功后不再调用 `closeBattleResult`（避免残留「重新打开结算」悬浮按钮——发送已完成无需恢复），改为内联彻底关闭（淡出隐藏 + 清理 `battle-result-reopen` 按钮）。
  3. **战斗记录不再写入世界书激活情况**（世界书载入流程，index.html:4891）：删除 `wbLogs.forEach(t => addHistory(t))`——战局记录/结算面板/发送到酒馆的内容中不再出现「📚 图鉴载入：xx → 图鉴条目」与「📚 世界书载入完成：命中 N 个条目」这些行。`wbLogs` 数组保留、`showLog('图鉴命中 N 个敌人')` 载入提示保留（用户仍能看到命中反馈）；激活情况依靠【📚 世界书管理】窗口查看。
- **涉及文件**：`index.html`、`LOG.md`。
- **决策原因**：① 用户反馈——战斗结束后想再打开弹窗发送战斗记录到酒馆，但【查看残局】把弹窗完全销毁，只能等下一轮战斗。采用与反应/看破弹窗一致的「收起 + 悬浮恢复按钮」交互（shelvePrompt 是项目既有的收起范式，零新增样式），发送成功则彻底关闭避免多余按钮。② 用户明确——战斗记录主要用于 AI 续写，世界书激活明细（图鉴载入/命中数）属于系统元信息、混入会污染叙事输入；激活情况在世界书管理窗口一目了然。删除仅影响 `battleHistory` 写入，不触碰世界书载入逻辑本身（命中/替换/UI 提示全保留）。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；`wbLogs.forEach(t => addHistory(t))` 残留 0；`battle-result-reopen` 引用 3 处（创建/移除/清理）就位。

## [LOG-110] 2026-08-19 — V7.0 定版：击杀结算动画多风格分流与系列优化实测确认 + README 更新

- **变更行为**：
  1. **实测确认**：用户确认 LOG-102~109 全部功能有效无误（另用户手动删除了结算模板中残留的「输出【初始化】」提示词文案）：
     - **LOG-102** 击杀动画按伤害类型分流（近战 Style1 同轴斜切 / 法术 Style3 次元裂隙 / 远程 Style4 战术锁定）；
     - **LOG-103** 纯 transform 化性能优化（近战/法术已流畅）；
     - **LOG-104** 远程击杀替换为「极速战术狙杀」狙击镜版（用户 demo 重构方案移植，帧率达标）；
     - **LOG-105** 碎裂片爆亮降档、**LOG-106** 受击全屏红闪定位降档、**LOG-107** 改为「血溅镜头」边缘径向暗红渐变（刺眼问题解决）；
     - **LOG-108** WebM 特效大招击杀演出延迟 1s（不与技能演出重叠）；
     - **LOG-109** 结算弹窗【返回查看残局】改为收起可恢复 + 战斗记录去除世界书激活情况。
  2. **版本号 V6.31 → V7.0**：击杀演出系统从单一动画升级为按伤害类型分流的完整多风格体系 + 系列性能与视觉优化，跨入 V7.0 主版本。
  3. **README 文档更新（V6.31 → V7.0）**：
     - 顶部版本号 `V6.31 → V7.0`；
     - **§2.2** 新增「🎬 击杀结算动画（V7.0）」条目（三风格分流细节、群攻多杀、性能优化、受击血溅镜头、WebM 大招延迟、结算弹窗收起）；
     - **§2.2** 战局记录条目后补充「战局记录不含世界书激活情况（V7.0）」说明。
  4. **LOG-INDEX 回填**：LOG-102~109 的 HASH 回填为对应代码提交。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后更新 README 并升版本号定版；LOG-102~109 为逐轮代码施工记录、本轮为定版文档记录，分条保持可溯源。

## [LOG-111] 2026-08-19 — WEBM_FX_REGISTRY 新增 delay 属性：特效演出与伤害结算同步（未升版本号）

- **变更行为**：
  1. **需求**：为 `WEBM_FX_REGISTRY` 新增可选 `delay` 属性（单位：秒），用于「特效播放后、伤害结算前」的等待，保证较长技能特效（如双枪扫射）的演出打击点与伤害数字同步。
  2. **注册表**（index.html:2953）：`双枪扫射` 条目追加 `delay: 2.2`（单位秒，经用户实测由 1.2 调整为 2.2），并注释说明 `delay` 可选字段语义；其余 5 个特效不配置 delay，行为零变化。
  3. **结算等待**（`executeSkillAction` 特效块尾部，index.html:7760）：在 WebM 特效播放（群攻 `playAOEEffect` / 单体 `playWebMFX`）之后、伤害结算循环之前，若当前标签为攻击类（`isAttackTag`）且特效注册表配置了 `delay`，则 `await sleep(delay * 1000)`，让特效先行播放到打击点再结算伤害。仅攻击类标签生效（同技能的减益/治疗标签不等待）；多攻击标签技能（如三连发）逐标签各播特效、各等一次 delay，与现有逐标签播放行为一致。
  4. **击杀演出不受影响**：击杀特写前对所有带 `[特效:]` 技能的固定 `await sleep(1000)`（LOG-108）保持不变（用户选择仅用于伤害结算）。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：特效播放原为 fire-and-forget 同步调用（`playWebMFX` 无 Promise），视频起播后伤害立即结算，长短特效无法按需同步——per-特效 `delay` 比固定值更灵活，未配置特效零影响；复用既有 `sleep` 工具（L5358）与 `executeSkillAction` 的 async 链，等待期间回合引擎暂停、反应/看破弹窗在伤害结算时照常触发。

## [LOG-112] 2026-08-19 — 职业被动调整：多重施法移交风行者 + 施法者新增【法力回响】（未升版本号）

- **变更行为**：
  1. **【多重施法】由施法者移交风行者**（`CLASS_PASSIVES['风行者']`，index.html:6044）：`onSkillExecuted(caster, skill, isReactionTrigger)` 逻辑完整复制自原施法者版——消耗 MP 释放技能（`cost > 0` 且非反应技）时按 `min(0.3, cost/100*2)` 概率向行动队列插队一个额外行动回合 + 飘字「多重施法!」+ 战报。**零新增订阅**：现有 `TURN_END` 通用订阅（index.html:6453，按 `CLASS_PASSIVES[entity.classType].onSkillExecuted` 调度）自动接管，订阅/emit 注释同步「施法者→风行者」。
  2. **施法者被动改为【法力回响】**（`CLASS_PASSIVES['施法者']`，index.html:6174）：移除 `onSkillExecuted`（【法能护罩】`onBattleInit` 保留），新增 `onManaSpent(entity, mpSpent)`——**每消耗 1 点 MP 独立 2% 概率**判定，命中则 +1 永久加速库存（`hasteStore`，仅被蓄力抵扣、不过期）+15 点 TP（`Math.min(maxTp, tp + n)` 封顶）；触发时战报 + 飘字（`⚡加速+N` / `✦TP+M`）+ `updateHeroUI/updateEnemyUI` 刷新 ⚡加速xN 徽章。
  3. **通用分发器 `notifyManaSpent(entity, mpSpent)`**（index.html:6197）：`CLASS_PASSIVES[entity.classType].onManaSpent` 查表分发，四类角色通用（未来新被动零成本挂接）。
  4. **四处扣蓝点接线**（每处一行，`cost` 即实际消耗）：
     - **主施法入口**（`executeSkillAction`，index.html:7636）：`!skipCost && skill.cost > 0` 时扣蓝后 `notifyManaSpent(caster, skill.cost)`——含反应技，与全局施法 +5 TP（7619）**增量叠加**，一次主动施法最高 +20 TP（不覆盖、不超过 maxTp）。
     - **蓄力押注**（`handleChargeSkill`，index.html:8572）：在 `effective` 与旧加速抵扣计算**之后**落账——本次蓄力所需回合数不受新加速影响，新加速仅对**后续**蓄力生效（用户明确要求"新增加速不对本次蓄力生效"）。
     - **看破**（index.html:6847）：扣蓝后 `notifyManaSpent(chosen.hero, chosen.skill.cost)`。
     - **舍身**（index.html:7044）：扣蓝后 `notifyManaSpent(guardian, chosen.skill.cost)`。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户指定两职业被动方案——①风行者获得原施法者的【多重施法】插队能力；②施法者改为"消耗 MP 概率回馈资源"（每 1 MP 独立 2%：1 加速 + 15 TP）。【法力回响】与旧【多重施法】均为「施法后按耗蓝结算」的同类时机，故沿用 `onSkillExecuted`→`onManaSpent` 的钩子模式；但触发源从"技能释放事件"改为"扣蓝点即时结算"以严格贴合「每消耗 1 点 mp」语义（覆盖主动/反应/蓄力/看破/舍身全部扣蓝途径）。蓄力路径落账顺序特意放在 `effective` 计算之后，避免新加速影响本次蓄力（加速永久保留语义 = 只服务未来蓄力）。TP 与全局施法 +5 TP 为独立 `Math.min` 增量叠加，不互相覆盖。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；`notifyManaSpent` 定义 1 处 + 接线 4 处（7636/8572/6847/7044）就位；`onSkillExecuted` 仅存于风行者（6044）+ 通用订阅调度（6455-6456）；风行者插队逻辑与原施法者版逐行一致（均无 `[再动]` 型回合次数守卫，概率插队语义不变）。

## [LOG-113] 2026-08-19 — V7.1 定版：职业被动调整实测确认 + README 更新

- **变更行为**：
  1. **实测确认**：用户确认 LOG-112 功能有效无误——风行者获得【多重施法】（消耗 MP 技能概率插队额外行动回合）；施法者改为【法力回响】（每消耗 1 MP 独立 2% 概率：+1 永久加速 +15 TP，覆盖主动/反应/蓄力/看破/舍身全部扣蓝途径）；蓄力路径新加速不影响本次蓄力；主动施法法力回响 +15 TP 与全局 +5 TP 增量叠加（一次最高 +20 TP）。
  2. **版本号 V7.0 → V7.1**：职业被动体系调整（被动归属变更 + 新被动机制）跨入 V7.1 次版本。
  3. **README 文档更新（V7.0 → V7.1）**：
     - 顶部版本号 `V7.0 → V7.1`；
     - **§7 职业被动**：风行者新增【被动 - 多重施法（V7.1 转交）】条目（原施法者被动转交）；施法者【多重施法】改写为【被动 - 法力回响（V7.1）】（每 1 MP 独立 2% 概率 +1 永久加速 +15 TP、TP 与全局 +5 叠加不覆盖、全扣蓝途径均计算、蓄力新加速不对本次生效）。
  4. **LOG-INDEX 回填**：LOG-112 的 HASH 回填为对应代码提交；LOG-113 本记录。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后更新 README 并升版本号定版；LOG-112 为代码施工记录、本轮为定版文档记录，分条保持可溯源。

## [LOG-114] 2026-08-19 — 极限爆发附加必中 + 看破过滤设置（未升版本号）

- **变更行为**：
  1. **极限爆发附加必中（仅我方）**：我方英雄消耗 100 TP 激活「极限爆发」（`multiplier === 2`）时，本次攻击的伤害与敌方减益（降/盲/滞/弱/中毒/燃烧/缓）**恒命中**。实现零新增状态——在 `applySingleTagEffect` 顶部以 `const burstGuarantee = multiplier === 2 && caster.id.startsWith('h')` 派生（index.html:7113），两处既有判定接入该标记：初次闪避判定（7149 `skill.guaranteedHit || burstGuarantee` 短路）+ 减益必中判断（7461 镜像）。天然镜像 `[必中]` 全部语义：仍可被反应技/看破主动化解；普攻爆发（`mockAttackSkill` 新建对象）与蓄力释放路径（8628 传同一 multiplier）一并覆盖；**敌方**满 TP 自动爆发（`triggerBurstIfNeeded` 敌方分支）不受影响、难度不变。
  2. **看破过滤设置（可开关 + 阈值，默认开启 x=100）**：`defendSettings` 新增 `kanpoFilterEnabled: true / kanpoFilterThreshold: 100`（index.html:9395），localStorage 持久化（9407-9408 恢复、9264-9265 保存，`persistDefendSettings` 既有调用自动落盘）。
  3. **设置 UI**（`openEditor`「⚙️ 战斗全局设置」区块，index.html:9158）：新增一行「看破过滤」——复选框 `edit-kanpo-filter`（accent-fuchsia-500）+ 阈值数字输入 `edit-kanpo-threshold`（0~10000，默认 100），区块标题改为「战斗全局设置：防御/普攻恢复 · 看破过滤」；`saveEditor` 读取两字段。
  4. **过滤拦截**（`checkKanpoInterrupt` 顶部，index.html:6817-6821）：开启时取敌方技能三个标签槽 `power/power2/power3` 最大值，`maxPower <= 阈值` 则直接 `return` 不弹看破窗。该函数是看破唯一入口，主链（`BEFORE_SKILL_RESOLVE` 事件）与自爆路径（`doEnemySelfDestruct`）**两条路一并拦截**；早退不设置 `ctx.cancelled`，事件语义零破坏（被过滤技能正常结算、自爆正常爆炸）。`maxPower` 与 `parseSkill` 解析结果对齐（裸 `[单体]` 默认 50、无标签兜底 20 也会被过滤）。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：① 极限爆发需消耗满槽 100 TP（需受击/施法/闪避积攒多轮），是珍贵的一次性资源——附加必中让高额翻倍输出稳定落点，避免「攒满爆发却被闪避」的挫败感；仅对我方生效（用户指定），敌方自动爆发保持原判定；选用 `multiplier === 2` 判定而非改 `skill.guaranteedHit` 字段，避免污染持久化技能定义且无需回滚清理。② 看破弹窗在敌方每次攻击时都可能打断战斗节奏，用户希望只对高威力（power > x）技能弹窗；过滤放在 `checkKanpoInterrupt` 顶部（而非 `promptKanpo` 内部）可在候选扫描前零成本早退，且天然覆盖自爆路径。③ 设置并入既有「战斗全局设置」区块，复用 `defendSettings` localStorage 持久化模式，与防御恢复同生命周期、零新增存储结构。
- **经验证**：Node 提取 `<script>`（8992 行）语法校验通过，零报错；`burstGuarantee` 定义 1 处 + 引用 2 处（7149/7461）、`kanpoFilter` 引用 5 处（6818/6820/9395/9407-9408/9264-9265）、`edit-kanpo-*` DOM 读写成对（9158 渲染 / 9264-9265 保存）就位；`multiplier === 2` 仅由 `triggerBurstIfNeeded` 产生（已核对 9 处 `executeSkillAction` 调用点的 multiplier 来源，其余均传字面量 1）。

## [LOG-115] 2026-08-19 — V7.2 定版：极限爆发附加必中 + 看破过滤设置实测确认 + README/SPEC 更新

- **变更行为**：
  1. **实测确认**：用户确认 LOG-114 两项功能有效无误——① 我方极限爆发（消耗 100 TP）本次攻击/技能伤害与敌方减益恒命中；② 看破过滤默认开启（阈值 100），敌方低威力技能不弹看破窗，关闭开关恢复原行为，刷新页面设置保留。
  2. **版本号 V7.1 → V7.2**：两项战斗机制新增（爆发附加必中 + 看破威力过滤）跨入 V7.2 次版本。
  3. **README 文档更新（V7.1 → V7.2）**：
     - 顶部版本号 `V7.1 → V7.2`；
     - **§2.2** TP（潜能槽）条目补「激活爆发后本次攻击/技能附加【必中】效果」（镜像 `[必中]` 语义、仅我方生效）；
     - **§2.2** 新增「👁️ 看破过滤设置（V7.2）」条目（复选框 + 阈值输入，默认开启阈值 100，威力最大值 > 阈值才弹窗，localStorage 持久化）；
     - **§4.3** 看破机制补「威力过滤（V7.2）」条目（过滤在候选扫描前生效，主链 + 自爆两处一并拦截）；
     - **§5** 判定公式新增第 5 点「极限爆发附加必中（V7.2）」。
  4. **SPEC 文档更新**：§4.2 判定公式标准新增「极限爆发附加必中（V7.2）」与「看破威力过滤（V7.2）」两条标准（含实现位置 `burstGuarantee` 派生点 index.html:7113 / 过滤拦截点 6817）。
- **涉及文件**：`README.md`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：按 Coding rule，用户实测确认本轮功能有效无误后更新 README 并升版本号定版；两项改动均为战斗机制/判定标准级变更，SPEC 判定公式章节同步补充保持「标准即现状」；LOG-114 为代码施工记录、本轮为定版文档记录，分条保持可溯源。

## [LOG-116] 2026-08-19 — 16 个全局音效源从 catbox.moe 迁移至 jsdelivr 托管（未升版本号）

- **变更行为**：
  1. **音效源迁移**（`index.html` `audioUrls`，L1249-1261）：将 16 个 `files.catbox.moe` 外链（hitUp/mpHeal/defDown/atk2/atk1/atkUp/hpHeal/taunt/hitDown/shieldUp/defUp/miss/burst/avatarClick/heroTurn/kill）全部替换为 `https://cdn.jsdelivr.net/gh/bachhoang2463j-a11y/test1@main/{key}.mp3`——文件已在同一 GitHub 仓库按代码键值命名备齐（如 `atk1` → `atk1.mp3`）；既有 4 个 jsdelivr 音效（hide/monsterAttack/herocharge/herochargedone）保持不变。
  2. **加载机制零改动**：`audioCache` 页面加载即 `preload='auto'` 预拉、`playSound` 克隆播放等既有机制完全不动，仅替换资源地址。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：实测 `files.catbox.moe`（承载 16/20 个全局音效）当前网络不可达（连接被重置 ECONNRESET），而 `cdn.jsdelivr.net` 可达——远程音效资源加载失败/缓慢是"释放技能时音效延迟、甚至无声"的网络层根因（音效播放本身为同步 fire-and-forget、不阻塞技能流程）。迁移至可达 CDN 后页面加载即预拉即可正常出声。16 个 mp3 由用户上传至 `bachhoang2463j-a11y/test1` 仓库并按键值命名，URL 与代码 key 一一对应、可读可维护。
- **经验证**：Node 提取 `<script>`（单 script）语法校验通过，零报错；`files.catbox.moe` 在 audioUrls 内残留 0（剩余 3 处 catbox 引用为玩家头像兜底 jpg 与火焰/冰霜 WebM 视频，不在本次范围）；jsdelivr 数据 API 确认 16 个文件全部就位，`atk1.mp3` 实测返回 `audio/mpeg`。

> **⚠️ 已回退**（LOG-117 前）：实测基础音效无改善且出现延迟，用户指出"延迟的从来不是基础音效，而是火焰/雷的技能特效音效"，主文件已回退恢复 catbox 源（提交 f1d2614），本 LOG 记录保留。真正根因与修复见 LOG-117。

## [LOG-117] 2026-08-19 — FX 特效音效预热升级为 fetch→Blob 全量预载，根治火焰/雷技能音效延迟（未升版本号）

- **变更行为**（`index.html`）：
  1. **新增 `_fxAudioBlobCache`**（Map：url → blobUrl，fetch 全量预载，fetch 中为 null 占位防重复）。
  2. **`preloadBattleAssets` 音频预热改造**（L3019-3035）：原 `new Audio(url); preload='auto'` 对**非 DOM 挂载元素不可靠**（多数浏览器不真正下载数据，播放时仍现场拉取整段大文件）→ 改为与视频同款 `fetch → blob → URL.createObjectURL` 全量预载；成功打点 `[预加载] 音效: {tag} → 已缓存为 Blob`，失败打点并**删除占位允许重试**。
  3. **`playCustomAudio` 优先 Blob**（L2973-2999）：`_fxAudioBlobCache` 命中 → `new Audio(blobUrl)` 本地数据立即播放（零网络等待）；Blob 未就绪（null 占位）→ 回退 `_fxAudioCache` cloneNode 克隆；无缓存 → 现场 `new Audio` + 补缓存（原路径）。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：实测基础音效无延迟、**延迟的是火焰/雷技能特效音效**——FX 音效（fire01 202KB / thunder01 290KB）为**大文件**，且 `preloadBattleAssets` 对其只用 `preload='auto'`（非挂载 Audio 元素不可靠），导致首次释放技能时 `playCustomAudio` 现场拉取整段大文件 → "点击技能后音效才加载"。视频预热用的是 fetch→Blob（真·全量下载）而音频没有，两者不对称。升级为与视频完全对称的 Blob 全量预载后，战斗载入即下载完毕，播放走本地 Blob URL 瞬时出声。保留 `_fxAudioCache` 回退路径，Blob 未完成时不改变既有行为。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；Node 模拟验证 `playCustomAudio` 四场景（无缓存现场 new Audio 补缓存 / Blob 就绪直接 Blob 播放 / Blob 占位中回退克隆 / `none` 不播放）全部通过；`_fxAudioBlobCache` 引用 6 处（定义/读取/占位/成功/失败删除）就位。

## [LOG-118] 2026-08-19 — 属性持久化开关：攻击/护甲/速度可选持久化（未升版本号）

- **变更行为**（`index.html`）：
  1. **设置模型**（L9414-9421）：`defendSettings` 新增三个布尔字段 `persistAtk` / `persistDef` / `persistSpd`，**默认全 false（=YAML 优先）**；`loadDefendSettings` 补充带类型校验的恢复（L9435-9437），与防御恢复同用 `DEFEND_VAR_KEY` localStorage 持久化。
  2. **编辑器 UI**（openEditor L9180）：「战斗全局设置」区块标题追加「· 属性持久化」，新增**持久化攻击 / 持久化护甲 / 持久化速度**三个独立复选框（`edit-persist-atk/def/spd`），附说明文字「勾选=新战局读聊天记录旧值覆盖 YAML；不勾选=优先读 YAML，YAML 无该项才回退聊天记录」。
  3. **saveEditor**（L9288-9291）：三个复选框读入 `defendSettings` 并随 `persistDefendSettings` 一并落盘。
  4. **构建时记录 YAML 属性来源**（`buildCombatDataFromYAML` L4729-4733）：捕获属性字符串并计算 `statSource = { atk: /\[Atk:\d+\]/, def: /\[Armor:\d+\]/, spd: /\[Speed:\d+\]/ }`（与 `parseAttributes` 同正则，可解析出值才算 YAML 已定义），存入 heroObj。
  5. **加载门控**（`applyPersistedRoster` L9501-9503）：atk/def/spd 覆盖条件改为 `cfg.x != null && (defendSettings.persistX || !(h.statSource||{}).x)`。
- **行为矩阵**：勾选→聊天记录覆盖 YAML（原逻辑不变）；未勾选+YAML 有该项→保留 YAML 实时值；未勾选+YAML 无该项→回退聊天记录；未勾选+无聊天记录值→保留 YAML 解析默认值（攻击10/护甲5/速度100）。保存到聊天记录始终照常写入，切换勾选无损来回。
- **涉及文件**：`index.html`、`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：跑团过程中角色 atk/armor/speed 会随剧情实时变化（YAML 属性栏已更新），但旧聊天记录持久化的旧值会无条件覆盖新 YAML 值，导致实时更新失效。三个独立勾选栏让用户按属性粒度选择「持久化锁定旧值」还是「YAML 实时优先」，默认不勾选贴合"实时属性应生效"的主流诉求，同时保留原行为一键可回。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；`statSource` 写入/读取/深拷贝快照链路就位；三处（定义/UI/saveEditor/应用门控）引用闭环，未勾选时 YAML 定义项不再被聊天记录覆盖。

## [LOG-119] 2026-08-20 — 左侧行动条 UI 动效全面升级：崩铁原味轮转 + 再动两段式爆闪 + 赛博光轨 + 串流灯带 + 变速角标（纯视觉层，未升版本号）

- **变更行为**（`index.html`，仅改视觉层，`state.actionQueue`/`queueIndex`/排序/splice 插队全部零改动）：
  1. **渲染层视觉轮转（核心）**：`renderTurnQueue` 由"全量重建 + 指针高亮"改为"环形扫描 + FLIP 平滑位移"——视觉队列从 `state.queueIndex` 起环形取存活项，**当前行动者恒在顶部**（崩铁时间轴标准形态），已行动者滚回队尾。数据层指针语义不变（`queueIndex++` 不轮转数组），仅渲染顺序模拟轮转。
  2. **回合切换（崩铁原味）**：每次行动切换后其余图标 0.6s 弹簧 FLIP 上移一格、已行动者平滑滑回队尾、新行动者触发 0.6s 金色聚焦冲击（`queue-focus-surge`，scale 0.88→1.22→1.1 过冲回弹）。
  3. **再动两段式爆闪**：再动/多重施法/隐匿者/祈愿/连动 插队项（`isExtraTurn && queueSpd === undefined`）成为当前行动者的瞬间触发 0.6s 闪电能量爆发（`extra-turn-burst-enter`）+ 0.6s 金色冲击波圆环（`lightning-shockwave-ring`，扩散 2.6x 防容器裁切）；未行动的插队项常驻精美「⚡再动」琥珀流金置顶呼吸角标（`extra-badge-active`，居中冠顶不遮挡面部），已行动滚回队尾后消失。
  4. **新回合开始（赛博光轨）**：`startRound` 置 `_roundStartGlowPending`，`renderTurnQueue` 消费一次——全队图标按阵营色（我方青 `rgba(6,182,212,0.85)` / 敌方玫红 `rgba(244,63,94,0.85)` / 再动金 `rgba(251,191,36,0.9)`）发出 0.6s 光晕（`queue-round-glow`，CSS 变量 `--glow-c`），逐项 40ms 错峰，0.8s+ 批量清理。
  5. **串流灯带与能量脉冲**：战场 DOM 中为 `#turn-order-container` 外层补齐纵向青金渐变导轨（`.timeline-rail`）与 2.6s 循环流光粒子脉冲（`.rail-pulse-beam`），使时间轴后方常驻能量细线。
  6. **速度变化角标与飘字**：`TAG_HANDLERS['速']`/`['缓']` 记录 `_recentSpeedChanges`，重排位移时在目标右上角弹出 🟢▲（提速/超车）与 `+N速` / 🔴▼（减速/退条）与 `-N速` 动态角标。
  7. **响应式尺寸与序号徽章**：横屏/桌面下头像尺寸由 48px 收敛至 `w-8 h-8 sm:w-10 sm:h-10`，边框减细，左下角新增 `#1, #2...` 紧凑序号徽章（`rankPill`），纵向不再拥挤。
  8. **uid 分配**：队列条目对象分配稳定 `uid`（跨渲染复用，FLIP 定位 + 行动切换判定）；移除原 `scrollTo` 居中逻辑（当前恒在顶部，改 `scrollTop=0`）。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户指出原版存在横屏图标过大、再动图标简陋、缺少速度变化标识与串流灯带等 4 项缺陷。本次施工完整复刻 Demo 验证的崩铁原味轮转、两阶段爆闪再动、赛博光轨回合光晕与串流导轨，严格统一 0.6s 动效基准，数据层与排轴规则 100% 保持不动。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；CSS class 与 DOM 结构（timeline-rail/rail-pulse-beam/rankPill/extra-badge-active/spd-badge/queue-focus-surge/queue-round-glow）全链路闭环就位。

## [LOG-120] 2026-08-20 — V7.5 定版：左侧行动条 UI 动效全面升级实测确认 + README/LOG-INDEX 更新

- **变更行为**：
  1. **版本号升级 V7.2 → V7.5**：左侧行动条动效体系重大演进（崩铁原味物理弹簧轮转、两阶段雷光爆闪再动、新回合赛博光轨漫射光晕、串流能量导轨与下行流光粒子、变速动态角标 🟢▲/🔴▼ 与飘字、响应式尺寸与 `#1~#N` 序号徽章）实测确认无误，跨入 **V7.5** 版本。
  2. **README.md 同步定版**：
     - 顶部版本号标定为 `V7.5`；
     - **§2.2** 完善「时间轴 (Turn Queue)（V7.5 动效全面升级）」条目，系统性收录 6 大核心视觉动效特性与设计规范。
  3. **仓库全量同步与推流**：完成本地 git 提交、`LOG-INDEX.md` 索引回填与远程分支推送。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **经验证**：浏览器与 Node.js 双重校验通过，实战流转、再动插队、变速位移与回合光晕演出均稳定流畅。

## [LOG-121] 2026-08-20 — 【肃正】屏障三项改造：固定耐久上限 + 存在时灰卡禁用 + 类型配色 + 受击白屏竞态修复（未升版本号）

- **变更行为**（`index.html`）：
  1. **屏障创建语义改为固定耐久上限**（`registerTagHandler('肃正')`，L6104-6116）：原 `teamBarrier += ctx.actualPower` 无限叠加、`teamBarrierMax` 仅作 UI 历史峰值分母且击破不重置——导致"1000 屏障击破后施放 100 屏障显示 100/1000"。改为**覆盖式全新创建**：`teamBarrier = teamBarrierMax = ctx.actualPower`（每次施放以本次技能 power×倍率为耐久上限），护甲/克制属性/名字照旧跟随本次技能；两处击破收口（主管线 L7755 与 `applyBarrierHit` L7968）在 `barrierArmor/barrierSub` 归零的同时补 `teamBarrierMax = 0`，保证下次创建分母准确。
  2. **屏障存在时所有【肃正】技能灰卡禁用（纯视觉，零运行时拦截）**：`updateMenu`（L9332-9353）新增辅助 `skillHasBarrierTag(skill)`（三标签槽任一含"肃正"）与 `isBarrierBlocked = teamBarrier > 0 && skillHasBarrierTag(skill)`，并入 `isEnough` 判定；missingArr（L9479）补 `屏障存在中` 提示。灰卡自动生效：`disabled-card` 置灰 + `if (isEnough) btn.onclick` 不绑定点击 → 点击无响应、不扣资源，蓄力入口同被挡（handleChargeSkill 走同一技能面板）。**不修改** executeSkillAction / handleChargeSkill。
  3. **屏障类型配色**：屏障 CSS 全量变量化（默认金色=法术），`.team-barrier-wrapper` 定义 `--br-*` 变量组（穹顶渐变/边框/流动描边/SVG 网格与中心光晕三 stop/徽章/进度条/受击涟漪/蜂窝聚光/受击辉光），新增 `[data-theme="blue"]`（远程→科幻青蓝系）与 `[data-theme="white"]`（无属性/近战→银白系）覆盖同一组变量；SVG 模板内硬编码色值改用 `var(--br-*)` 并被 CSS 选择器规则（L927-930）兜底覆盖。JS 新增 `getBarrierTheme()`（远程→blue / 法术→gold / 其余→white），`updateTeamBarrierUI`（L5544）写入 `wrapper.dataset.theme`，创建/击破/属性变化自动跟随。
  4. **修复受击白屏竞态**（`spawnHitFlash`，L4152-4160）：根因是重叠调用（屏障为全局伪目标，多敌连续受击/群攻/破碎闪重叠概率高）使 `originalFilter` 捕获到上一次遗留的白色滤镜，恢复定时器顺序错乱导致 `style.filter` 永久卡 `brightness(2.4) saturate(0)`。修复：每元素持久捕获一次 `targetDom._flashOrigFilter`，恢复始终用持久值，重叠不再互相污染（全局通用，所有单位受益）。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户复现"先高耐久后低耐久"上限错乱，确认需要"创建时技能数值为耐久上限"的精准反映；刷新机制经两方案（A 存在时禁止释放 / B 多层堆叠）对比后选 A，且进一步简化为**纯灰卡视觉禁用**——复用资源不足的 `isEnough` 判定链路（`disabled-card` 置灰 + 无 onclick 点击无响应），零运行时拦截、蓄力自然被挡；屏障类型配色让无属性/近战/远程/法术四种屏障一眼可辨，呼应屏障刷新机制收敛后"每次创建即新屏障"的语义。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；`teamBarrierMax` 赋值/归零点、`skillHasBarrierTag`/`isBarrierBlocked`、`data-theme`、CSS 变量引用闭环，屏障样式块无残留硬编码金色。

## [LOG-122] 2026-08-20 — V7.6 定版：【肃正】屏障三项改造实测确认 + README/SPEC/LOG-INDEX 更新

- **变更行为**：
  1. **版本号升级 V7.5 → V7.6**：【肃正】全队共享屏障体系重大改造（固定耐久上限全新创建、屏障存在时灰卡禁用、克制属性动态主题配色金/蓝/银白）以及受击白屏滤镜持久化修复实测确认无误，跨入 **V7.6** 版本。
  2. **README.md 同步定版**：
     - 顶部版本号标定为 `V7.6`；
     - **§2.2** 完善「🛡️ 圣域帷幕与【肃正】全队共享屏障（V7.6）」条目，明确固定耐久上限、灰卡禁用机制与动态主题配色；
     - **§3.2** 同步更新 `[肃正]` 标签条目说明。
  3. **SPEC.md 同步定版**：
     - **§4.2.4** 同步更新 `[肃正]` 全队共享屏障创建语义（固定耐久上限、灰卡禁用规则与主题配色）。
  4. **仓库全量同步与推流**：完成本地 git 提交、`LOG-INDEX.md` 索引回填与远程分支推送。
- **涉及文件**：`README.md`、`SPEC.md`、`LOG.md`、`LOG-INDEX.md`。
- **经验证**：浏览器与 Node.js 双重校验通过，屏障创建、灰卡禁用与克制主题切换均稳定符合设计。

## [LOG-123] 2026-08-21 — 修复思考型模型局内对话被截断：max_tokens 可配置 + 关闭思考开关 + 截断检测（未升版本号）

- **变更行为**（`index.html`）：
  1. **根因定位**：`callLLMAPI` 硬编码 `max_tokens: 300`（原 L10445）。经 OpenAI 兼容代理（gcli.ggchan.dev/v1）转发时 `max_tokens` 映射为 Gemini 的 `maxOutputTokens`，**思考 token 计入该上限**——gemini-3-flash-preview 为思考型模型，300 预算被思考耗尽导致正文被截断；而 gemini-2.5-flash-lite（非思考型）与 deepseek v4f（DeepSeek 官方接口将思考 `reasoning_content` 与正文分开计量，`max_tokens` 仅限制正文）均正常。非安全限制，提示词内容无关。参考对比项目（酒馆助手脚本-生图助手，同渠道 `maxTokens: 8192` 正常返回）确认差异点即 token 预算。
  2. **设置面板新增两项**（`#llm-max-tokens` 输入框 256~8192 默认 4096，提示"思考型模型思考 token 计入该上限，过低会导致回应被截断"；`#llm-disable-thinking` 复选框，标注"仅部分代理支持，发送 thinking:false"）。
  3. **状态与持久化接线**：`defaultPreset`/`llmState` 新增 `maxTokens: 4096`/`disableThinking: false`；`initLLMPresets` p[0] 拷贝、`switchLLMPreset` 读写、`saveLLMSettings` 拷贝、`persistLLMSettings` toSave 五处同步；`loadLLMSettings` 走 `Object.assign` 兼容旧数据（缺字段自动保留默认值，老用户无需重配）。
  4. **`callLLMAPI` 请求与响应**：`max_tokens: llmState.maxTokens || 4096` 替换硬编码 300；勾选关闭思考时附加 `thinking: false`（best-effort，仅部分代理透传，未知字段多数代理静默忽略）；响应兜底解析（对齐参考脚本顺序）`message.content` → `reasoning_content` → `reasoning` → `choice.text` → `data.content/output/response/result`，正文优先；截断检测 `finish_reason === 'length'` → `console.warn` + `showLog('⚠️ AI 回应被截断，请在【💬 对话】中调高 max_tokens')`。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户报告经反向代理 gcli 渠道使用 gemini-3-flash-preview 局内对话频繁被截断（gemini-2.5-flash-lite / deepseek v4f 正常），明确提示词无敏感内容非安全限制；经对比同渠道正常返回的参考脚本，确认唯一关键差异为 `max_tokens` 预算。方案选「max_tokens 可配置 + 截断检测」最小改动直击根因，不移植参考脚本的越狱式生图提示词（与局内对话无关）；「关闭思考」为 best-effort 开关以应对代理透传不确定性。
- **经验证**：Node 提取 `<script>` 语法校验通过，零报错；面板新增字段与 `switchLLMPreset` 读写闭环、`persistLLMSettings` 序列化字段齐备、`callLLMAPI` 请求体/响应兜底/截断检测逻辑就位。

## [LOG-124] 2026-08-21 — V7.7 定版：max_tokens 可配置 + 关闭思考开关实测确认 + README/LOG-INDEX 更新

- **变更行为**：
  1. **版本号升级 V7.6 → V7.7**：思考型模型局内对话截断修复（max_tokens 可配置、关闭思考开关、响应兜底解析、截断检测）经用户酒馆实测确认无误（gemini-3-flash-preview 台词完整不再截断），跨入 **V7.7** 版本。
  2. **README.md 同步定版**：
     - 顶部版本号标定为 `V7.7`；
     - **§2.1** 完善「💬 对话」设置条目，新增 **max_tokens（最大输出）** 与 **🧠 关闭思考** 两项说明（含思考型模型 token 计入上限导致截断的原理与 `thinking:false` 的 best-effort 语义）。
  3. **仓库全量同步与推流**：完成本地 git 提交、`LOG-INDEX.md` 索引回填（LOG-123 HASH）与远程分支推送。
## [LOG-125] 2026-08-22 — 远程击杀特写重构为1920年代【芝加哥打字机】风格（暗红配色+机械转盘准星+4象限崩碎+屏幕溅血，未升版本号）

- **变更行为**（`index.html`）：
  1. **UI 视觉层重构**：将原现代赛博科幻风 Style 4 远程处决动画（青色准星/12.7MM/HUD 视窗）彻底重构为 1920 年代黑帮/跑团复古风味的【芝加哥打字机】演出。
  2. **暗红调色与机械转盘准星**：移除所有高亮青色；引入 SVG 老式黄铜机械转盘准星（`v1-tommy-scope`）+ 金红弹道曳光穿透（`v1-tracer-fire`）。
  3. **四象限密集崩碎**：敌人被密集 .45 弹雨命中后按四象限（`v1-enemy-shatter-tl/tr/bl/br`）向外崩飞消散，多目标并排各自独立碎裂。
  4. **高性能镜头飞溅血液（Lens Blood Splatter）**：加入全屏暗红晕影（`blood-vignette-pulse`）+ 5 朵有机飞溅血花（`blood-splat-burst`）与 2 条垂直血痕（`blood-drip-flow`），全部采用 GPU 硬件加速 `transform` / `opacity` 动画，零 DOM Layout 重绘。
  5. **纯净汉字血印大字**：居中展示纯净的大号 Cinzel「处决」/「歼灭」血印文字（`text-outline-crimson`），彻底移除英文副标题框；左侧照片框显示「档案: 英雄名」。
  6. **音效接线**：开场触发 `shot` 枪声音效（已接入 `audioUrls` 与 Blob 预载管线），220ms 触发 `kill` 击杀音效与镜头强震动。
  7. **逻辑零破坏**：所有的战斗数值、伤害管线、多杀判定与 `_pendingKills` 逻辑 100% 保持不变，仅重构视觉渲染 DOM 与 CSS。
- **涉及文件**：`index.html`、`LOG.md`、`LOG-INDEX.md`。
- **决策原因**：用户反馈原版远程击杀动画过于科幻现代化、缺少 1920 年代复古跑团风味，要求替换为暗红配色、保留准星与敌人碎裂、增加屏幕飞溅血液并移除英文副标题框。
## [LOG-126] 2026-08-22 — V7.8 定版：远程击杀特写重构为1920年代【芝加哥打字机】风格实测确认 + README/LOG-INDEX 更新

- **变更行为**：
  1. **版本号升级 V7.7 → V7.8**：远程击杀特写重构为 1920 年代【芝加哥打字机】风格（暗红复古调色、老式黄铜机械同心转盘准星、敌人4象限崩碎、GPU 硬件加速全屏暗红晕影与5朵镜头飞溅血花/挂滴、纯净大号 Cinzel「处决/歼灭」血印汉字，去除所有英文小条框）经用户实测确认满意无误，跨入 **V7.8** 版本。
  2. **README.md 同步定版**：
     - 顶部版本号标定为 `V7.8`；
     - **§2.2** 完善「🎬 击杀结算动画」条目，将远程处决演出更新为 1920 年代芝加哥打字机复古风味说明。
  3. **仓库全量同步与推流**：完成本地 git 提交、`LOG-INDEX.md` 索引回填与远程分支推送。
- **涉及文件**：`README.md`、`LOG.md`、`LOG-INDEX.md`。
- **经验证**：用户实测确认无误，前端 60FPS 流畅运行，逻辑零破坏。




