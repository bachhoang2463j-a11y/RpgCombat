# 战斗前端系统项目设计规范文档 (SPEC.md)

---

## 1. 项目目标与定位

本项目旨在提供一个**轻量级、单文件、零依赖、无后端需求的通用 RPG 回合制战斗引擎前端** (`战斗前端-爬塔 V4.8.html`)。

引擎专注于：
- 为角色扮演（Roleplay）、跑团及 SillyTavern（酒馆）场景提供即时计算、高可观赏性、可互动调优的战斗模拟器。
- 将“数值计算”与“文学叙事（LLM）”严格分离：保证战斗运算绝对流畅，同时赋予角色丰富的剧情台词与小说级战后总结能力。

---

## 2. 核心设计原则

1. **绝对本地化与零延迟 (Local First & Zero Latency)**：
   - 所有的伤害、闪避、护盾、Buff 结算、AI 索敌、时轴排布均在前端 JavaScript 中同步执行完成。
   - LLM 调用失败或未网络连接时，战斗引擎必须能 100% 正常运行，不阻塞任何战斗操作。
2. **零构建与极简分发 (Zero Build Setup)**：
   - 项目核心采用单 HTML 文件架构，内联 CSS/JS，依赖通过 CDN 引入（Tailwind CSS, js-yaml, jQuery）。
   - 任何设备只要配备标准现代浏览器即可即开即用。
3. **标准化数据交互接口 (Standardized Protocol)**：
   - 统一采用 `<Combat_block>` 格式包裹 YAML 数据作为系统与酒馆/LLM 的通信标准。
   - 格式解析具有高容错性，自动兼容缺失属性与默认技能赋予。
4. **完整 Effect System 架构 (Tag-based, Strategy Handlers & Event Bus)**：
   - **标签策略注册表 (`TAG_HANDLERS`)**：将全部技能标签逻辑（瞄、盲、降、防、盾、免伤、回避、反击、嘲、增、回蓝、回、再动等）独立注册，分发函数降至单行查找，实现彻底解耦。
   - **轻量事件总线 (`CombatEvents`)**：通过发布/订阅模式处理生命周期事件（`TURN_START`, `TURN_END`, `BEFORE_DAMAGE`, `AFTER_DAMAGE`, `BEFORE_HEAL`, `AFTER_HEAL`, `ON_KILL`, `ON_FATAL_DAMAGE`, `BUFF_APPLIED`, `BUFF_EXPIRED`）。
   - **模块化职业被动 (`CLASS_PASSIVES`)**：7 大职业被动挂载于事件总线与面板汇总管道，无任何硬编码条件判断。

---

## 3. 功能边界与范围

### 3.1 包含范围 (In Scope)
- 爬塔/常规战场 UI 界面与单位入场动画。
- 动态时间轴计算算法（含怪物多动速度衰减与插队机制）。
- 反应拦截系统（受击前二次判定与反击/避险）。
- 敌方智慧旁白系统与 FGO 风格 Boss 充能大招（Cut-in 特写）。
- **完整 Effect System 架构**：
  - `TAG_HANDLERS` 策略处理器注册表（支持动态扩充自定义标签）。
  - `CombatEvents` 发布/订阅事件总线（11 个标准生命周期事件点）。
  - `CLASS_PASSIVES` 模块化职业被动注册表（7 大职业）。
- 全效编辑器（实时编辑角色属性、技能标签、智慧标记与多动次数）。
- 粒子 Canvas 与 WebM 高清透明特效渲染引擎。
- LLM API 对话气泡与战后小说模板生成器。

### 3.2 不包含范围 (Out of Scope)
- 复杂后端数据库存储（所有战局状态存储于浏览器内存与 Session 中）。
- 联机网络多人对战（仅为单人与 AI/酒馆对话使用）。
- 慢速 LLM 直接决断每回合伤害的非本地计算模式。
- 抽卡/养成/怪物捕获系统（已废弃清理）。

---

## 4. 核心规范与协议标准

### 4.1 属性解析格式
```text
[HP:当前/最大][MP:当前/最大][Atk:数值][Armor:数值][Speed:数值][职业:职业名]
```
- `[智慧]`：标识敌方具备智力，在战场中可触发敌方发言与气泡回应。

### 4.2 判定公式标准
- **命中与闪避**：
  - $Hit_{max} = 100 + \text{命中Buff}$
  - $Eva_{max} = \text{Speed} + \text{闪避Buff}$
  - $Roll_{Atk} = \text{Random}(1 \sim Hit_{max})$
  - $Roll_{Def} = \text{Random}(1 \sim Eva_{max})$
  - 若 $Roll_{Def} > Roll_{Atk}$，则判定为闪避成功。

- **仇恨分布算法**：
  - 基础嘲讽值：防守者 (200)，普通 (100)，隐匿者 (50)。
  - 选中概率：$P(i) = \frac{\text{嘲讽值}_i}{\sum \text{嘲讽值}}$。

---

## 5. 代码结构与函数参考 (Function Reference)

> 单文件引擎内联所有 JS，按职责划分为以下模块。行号基于 `战斗前端-爬塔 V4.8.html`（约 6807 行）。

### 5.1 数据常量与全局配置

| 标识符 | 行号 | 作用 |
| :--- | :--- | :--- |
| `SKILL_TYPES` | 768 | 技能伤害类型枚举（近战/远程/法术等），供编辑器下拉与判定使用。 |
| `AVATAR_MAP` | 776 | 角色名 → 头像 URL 的映射表，用于自定义角色头像。 |
| `DEFAULT_HERO_IMG` | 825 | 默认头像 URL，新角色兜底用。 |
| `KANPO_SOUND_KEY` | 866 | 看破触发音效的音频缓存键名。 |
| `WEBM_FX_REGISTRY` | 2127 | WebM 特效注册表：`特效名 → { url, scale, particles, audioUrl }`。 |
| `POWER_COUNTER_SOUND_URL` | 4564 | 强力反击专属音效 URL。 |
| `LLM_VAR_KEY` | 6182 | LLM 设置在酒馆 chat 变量中的存储键。 |
| `DEFEND_VAR_KEY` | 6229 | 防御恢复设置在酒馆变量中的存储键。 |
| `ROSTER_VAR_KEY` | 6250 | 我方角色配置持久化的酒馆变量键。 |
| `ROSTER_VERSION` | 6251 | 角色配置序列化版本号。 |

### 5.2 粒子/视觉特效引擎 (VFX)

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `CanvasFxEngine` 类 | ~960 | 全局粒子引擎：`addParticle`/`update`/`draw`，支持 `hitStop` 定帧、`screen` 混合、重力与阻力。实例挂载为全局 `fxEngine`。 |
| `window.triggerScreenShake` | 1060 | 全局平滑震屏，`(intensity, duration)`。 |
| `spawnDodgeSmokeParticles` | 1081 | 闪避成功时生成上浮扩散的环形灰烟粒子（20 粒）。 |
| `spawnSlashParticles` | 1123 | -45° 对角线斩击火花（单体刀光底衬）。 |
| `spawnFireParticles` | 1187 | 火焰粒子（单体火系）。 |
| `spawnHealParticles` | 1231 | 治疗粒子（绿色或自定义主题）。 |
| `getDomCenter` | 1297 | 取 DOM 中心坐标。 |
| `spawnGoldStream` | 1303 | 金色流光（两点连线）。 |
| `spawnGoldBurst` | 1353 | 金色爆裂。 |
| `spawnPowerBurst` | 1407 | 强力能量爆发，可指定方向角。 |
| `spawnExplosionParticles` | 1496 | 爆炸粒子（可缩放）。 |
| `spawnThunderParticles` | 1583 | 雷电粒子（含 `makeLightningPath`/`drawPath` 子函数，可单/AOE）。 |
| `spawnGunshotParticles` | 1853 | 枪击粒子。 |
| `spawnLightParticles` | 1892 | 光系粒子（含 `spawnFeatherBatch` 羽翼批次）。 |
| `playCustomAudio` | 2147 | 多通道音效播放（`cloneNode` 避免打断）。 |
| `preloadBattleAssets` | 2169 | 预加载登场单位的 WebM 特效为 Blob URL，瞬间触发无白屏。 |
| `playWebMFX` | 2217 | 播放 WebM 透明视频层。 |
| `spawnFrostParticles` | 2252 | 冰霜粒子（雾/雪）。 |
| `spawnThunderAOEParticles` | 2398 | 雷电 AOE 粒子。 |
| `spawnHolyLightAOEParticles` | 2529 | 圣光 AOE 粒子。 |
| `spawnDefaultAOEParticles` | 2680 | 默认 AOE 粒子。 |
| `spawnFireAOEParticles` | 2761 | 火焰 AOE 粒子。 |
| `window.spawnCanvasParticles` | 2910 | 粒子类型分发器：`(type, x, y)` 按类型派发到各 spawn 函数。 |
| `window.spawnChargeUpParticles` | 2938 | 蓄力聚集粒子（大招前摇）。 |
| `window.spawnFocusOverlay` | 3019 | 全屏径向渐变遮罩（压暗环境、聚焦施法者）。 |
| `window.spawnHitFlash` | 3051 | 受击白色剪影闪烁（CSS brightness 闪烁）。 |
| `window.spawnBurstAura` | 3117 | 爆发光环（极限爆发/大招）。 |
| `playAOEEffect` | 3217 | AOE 五层模型总调度：`(containerId, type, fxTag)`。 |
| `playSVGEffect` | 3343 | 轻量 SVG/CSS 特效派发：`(targetDom, type)`。 |

### 5.3 数据解析与构建

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `getCleanNameAndEmoji` | 3426 | 从名字中提取纯净名称与 emoji。 |
| `parseAttributes` | 3433 | 解析角色属性串 `[HP:..][Atk:..]...` 为对象。 |
| `parseSkill` | 3443 | 解析技能串 `【名】[标签]...` 为技能对象。 |
| `buildCombatDataFromYAML` | 3501 | 将 `<Combat_block>` YAML 内容构建为战局数据（我方/敌方列表）。 |
| `startSTPolling` | 3548 | 轮询侦测酒馆聊天记录中的 `<Combat_block>` 标签并自动建局。 |
| `loadManualData` | 3593 | 手动加载战局数据入口。 |
| `onCombatDataReceived` | 3603 | 收到战局数据后的统一入口处理。 |

### 5.4 UI 渲染与交互

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `toggleFullScreen` | 830 | 切换全屏。 |
| `addHistory` | 846 | 追加一条战斗历史记录。 |
| `initUI` | 3618 | 初始化界面绑定与事件。 |
| `createCompactBarHTML` | 3664 | 生成紧凑血/蓝/盾条 HTML。 |
| `updateBuffUI` | 3671 | 刷新角色的 Buff 图标悬停 UI。 |
| `renderTurnQueue` | 3728 | 渲染时间轴（行动顺序图标）。 |
| `showLog` | 3754 | 顶部临时提示条（2.5s 淡出）。 |
| `createFloatingText` | 3755 | 飘字（可扩展为 burst 大字）。 |
| `updateHeroUI` | 3757 | 刷新面板我方角色卡。 |
| `updateEnemyUI` | 3819 | 刷新面板敌方角色卡。 |
| `showEnemyInfo` | 5763 | 弹窗展示敌方详情。 |
| `updateMenu` | 5886 | 更新角色菜单（含 `getDisplayType` 子函数）。 |
| `updateActiveHeroDisplay` | 5962 | 更新当前行动者高亮显示。 |
| `openSkillMenu` / `closeSkillMenu` | 5977/5978 | 打开/关闭技能菜单。 |
| `cancelTargeting` | 5760 | 取消目标选择状态并复位 UI。 |

### 5.5 Effect System（标签处理器 / 事件总线 / 职业被动）

| 标识符 | 行号 | 作用 |
| :--- | :--- | :--- |
| `TAG_HANDLERS` | 3886 | 标签策略注册表本体。 |
| `registerTagHandler` | 3888 | 注册一个标签处理函数。 |
| `resolveTagHandler` | 4030 | 按标签名查找并分发到对应处理器。 |
| `CLASS_PASSIVES` | 4043 | 职业被动注册表本体。 |
| `registerClassPassive` | 4045 | 注册一个职业被动定义。 |
| `EVENTS` | 4238 | 事件总线事件名枚举（详见 §5.6）。 |
| `CombatEvents` | 4253 | 发布/订阅事件总线（`on`/`emit`/`emitAsync`，支持优先级）。 |
| `getEffectiveStats` | 4699 | 计算实体含 Buff 修正后的有效面板属性。 |
| `calculateDamage` | 4730 | 结算最终伤害（含护盾吸收、穿透判定）。 |

### 5.6 事件总线 `EVENTS` 键参考

事件总线通过 `CombatEvents.on(EVENTS.XXX, handler, priority)` 订阅、`CombatEvents.emit[Async](EVENTS.XXX, ctx)` 派发。**已实现并投入使用**的键：

| 事件键 | 含义 | 现有订阅方 |
| :--- | :--- | :--- |
| `BEFORE_SKILL_RESOLVE` | 技能宣告后、结算前（看破中断点） | 看破系统 |
| `TURN_START` | 回合开始（毒 tick、眩晕检查前） | 回合主循环 |
| `TURN_END` | 回合结束（充能积攒、多重施法触发） | 施法者被动 |
| `AFTER_DAMAGE` | 伤害结算后（淬毒、眩晕、仇恨附加） | 灾厄使被动 |
| `AFTER_HEAL` | 治疗后（溢出转盾） | 圣职者被动 |
| `ON_FATAL_DAMAGE` | 致命伤害时（毅力留存、回避致命） | 防守者/隐匿者被动 |
| `ON_DODGE` | 闪避成功时 | 防守者强力反击 |
| `BUFF_EXPIRED` | Buff 过期时 | 回合主循环 |

> ⚠️ **预留但尚未接线（Reserved / Not Wired）**（初期搭框架预留，当前无任何 `emit` 与 `on`，**不会触发**）。以下 4 个键是设计意图的"骨架"，为未来玩法扩充预留，**切勿误以为它们已生效**——若直接 `CombatEvents.on(...)` 订阅将静默失效，需先补上对应的 `emit` 调用点：

| 预留事件键 | 设计意图 | 可支撑的未来玩法 |
| :--- | :--- | :--- |
| `BEFORE_DAMAGE` | 伤害结算前（可修改 `rawDamage`） | 实时减伤/暴击/元素克制/反伤荆棘/护盾优先级钩子 |
| `BEFORE_HEAL` | 治疗前 | 治疗爆发/转化/抑制、濒死救援加成 |
| `ON_KILL` | 目标被击杀时 | 处决/击杀回资源/尸爆连锁/复仇战意/Boss 充能 |
| `BUFF_APPLIED` | Buff 施加时 | Buff 叠加刷新规则、净化反应、状态联动、免疫 |

> 订阅方可通过子代理梳理确认：目前仅上述 8 个键被实际 `CombatEvents.on(...)` 订阅，其余 4 个预留键无任何调用点。

### 5.7 战斗主流程（核心循环）

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `startGame` | 5319 | 初始化战局并启动第一回合。 |
| `startRound` | 5343 | 时间轴排轴、回合主循环（TURN_START/TURN_END、毒 tick、眩晕、充能）。 |
| `getTauntTarget` | 5082 | 按仇恨轮盘概率选取敌方单体的目标。 |
| `selectEnemySkillAndTarget` | 5568 | 敌方 AI 决策：选技能与目标（含 `isHighYieldSkill` 辅助）。 |
| `isHighYieldSkill` | 5543 | 判断技能是否为高收益（用于敌方 AI 策略）。 |
| `prepareAttack` | 5738 | 玩家普通攻击准备。 |
| `prepareSkillTarget` | 5743 | 玩家技能选目标准备。 |
| `promptReaction` | 4744 | 反应拦截弹窗（含 `window.resolveReaction` 回调）。 |
| `promptKanpo` | 4380 | 看破弹窗（含 `window.resolveKanpo` 回调、`shelvePrompt`/`cleanupPrompt` 收起逻辑）。 |
| `getKanpoTarget` | 4366 | 判断技能是否可被某角色看破。 |
| `retreatBattle` | 5452 | 战术撤退入口。 |
| `showBattleResult` / `closeBattleResult` | 5458/5502 | 战后结算面板显示/关闭。 |
| `sendResultToTavern` | 5508 | 将战后小说文本注入酒馆对话框。 |

### 5.8 编辑器与持久化

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `resetBattle` | 5980 | 重置战斗（恢复初始缓存快照）。 |
| `openEditor` / `closeEditor` | 5999/6031 | 全效编辑器打开/关闭。 |
| `syncEditorDataToMemory` | 6032 | 将编辑器表单同步回内存数据。 |
| `saveEditor` | 6098 | 保存编辑器改动并持久化。 |
| `addHeroSkill` / `removeHeroSkill` | 6140/6141 | 我方技能增删。 |
| `addEnemySkill` / `removeEnemySkill` | 6142/6143 | 敌方技能增删。 |
| `addHero` / `removeHero` | 6144/6145 | 我方角色增删。 |
| `addEnemy` / `removeEnemy` | 6146/6147 | 敌方角色增删。 |
| `serializeHeroesForSave` | 6254 | 序列化我方角色配置用于持久化。 |
| `persistHeroesRoster` | 6271 | 将我方角色配置写入酒馆 chat 变量。 |
| `readRoster` | 6277 | 从酒馆 chat 变量读取角色配置。 |
| `applyPersistedRoster` | 6289 | 合并持久化角色配置（同步缓存，供重置恢复）。 |

### 5.9 防御恢复与 LLM 设置（持久化）

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `clampPct` | 6232 | 将数值收敛到 0–100 百分比。 |
| `loadDefendSettings` | 6234 | 读取防御恢复设置。 |
| `persistDefendSettings` | 6245 | 持久化防御恢复设置。 |
| `initLLMPresets` | 6171 | 初始化 LLM 预设列表。 |
| `openLLMSettings` / `closeLLMSettings` | 6319/6325 | LLM 设置面板开关。 |
| `switchLLMPreset` | 6329 | 切换 LLM 预设（可保存当前）。 |

### 5.10 对话与 LLM 叙事系统

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `initChatInputArea` | 6382 | 初始化底部对话输入区。 |
| `sendPlayerChat` | 6486 | 玩家发送对话。 |
| `toggleAllyAutoSpeak` / `updateAllyToggleUI` | 6401/6407 | 友方自动旁白开关与 UI。 |
| `toggleEnemyAutoSpeak` / `updateEnemyToggleUI` | 6419/6425 | 敌方自动旁白开关与 UI。 |
| `triggerAllyAutoSpeak` | 6518 | 触发友方英雄主动性旁白。 |
| `triggerEnemyAutoSpeak` | 6606 | 触发敌方智慧旁白。 |
| `triggerKanpoNarration` | 6528 | 看破后触发震惊/反应旁白。 |
| `requestLLMResponse` | 6542 | 请求 LLM 生成对话气泡（统一入口）。 |
| `callLLMAPI` | 6614 | 调用 OpenAI 兼容 `/chat/completions` 接口（含酒馆上下文抓取）。 |
| `showChatBubble` | 6438 | 显示对话气泡。 |
| `showThinkingBubble` | 6586 | 显示"思考中"气泡。 |
| `parseLLMResponse` | 6785 | 解析 LLM 返回文本为角色气泡数据。 |

---

## 6. 预留事件钩子扩充指引 (Future: Reserved Event Hooks)

初期搭框架时，`EVENTS` 中预留了 4 个事件键（`BEFORE_DAMAGE` / `BEFORE_HEAL` / `ON_KILL` / `BUFF_APPLIED`），它们**将来可能被用到**，用于在事件流的关键节点上挂载玩法模块。接入规范如下：

1. **先补 `emit` 调用点**：在伤害/治疗/击杀/Buff 结算代码中，于对应时机调用 `CombatEvents.emit[Async](EVENTS.XXX, ctx)`，传入完整上下文（至少含 `caster`、`target`、`targetDom`、`incomingDamageType`、`rawDamage` 等）。
2. **再注册 `on` 订阅**：通过 `CombatEvents.on(EVENTS.XXX, handler, priority)` 挂载玩法逻辑（如职业被动、标签效果）。
3. **保持对称与幂等**：`BEFORE_*` 钩子应允许 handler 通过修改 `ctx` 字段（如 `ctx.rawDamage`）影响后续结算；handler 需考虑多次触发与优先级顺序。
4. **切勿静默占用**：在接入任一预留键前，务必确认该键当前无生产依赖，避免与未来实现冲突。

> 目的：让"预留→接线→扩充玩法"成为可预期、可回归的安全路径，避免出现"文档承诺了接口、接口却未接通"的隐性失效。

---

## 7. 验收与质量标准

1. **兼容性**：单 HTML 文件在 Chrome / Edge 浏览器下运行正常，零控制台报错。
2. **数据完整性**：粘贴符合规范的 `<Combat_block>` 格式能够正确建立战场单位。
3. **编辑器响应**：运行时修改任何属性或技能，下一次行动立刻生效。
4. **Effect System 架构验证**：标签效果由 `TAG_HANDLERS` 独占处理，事件由 `CombatEvents` 广播响应，职业被动及 Buff 挂载均正常运行。
5. **稳定度**：连续战斗 50 回合以上无内存泄漏或动画卡死现象。