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




