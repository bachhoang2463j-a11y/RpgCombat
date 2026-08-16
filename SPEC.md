# 战斗前端系统项目设计规范文档 (SPEC.md)

---

## 1. 项目目标与定位

本项目旨在提供一个**轻量级、单文件、零依赖、无后端需求的通用 RPG 回合制战斗引擎前端** (`index.html`)。

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
   - **标签策略注册表 (`TAG_HANDLERS`)**：将全部技能标签逻辑（瞄、盲、降、防、盾、免伤、回避、反击、嘲、增、回蓝、冲、回、再动等）独立注册，分发函数降至单行查找，实现彻底解耦。
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

- **`[必中]` 与反应拦截（V6.10 起）**：
  - `[必中]` 仅跳过**被动闪避 roll**（`isDodged = false`，伤害/妨害恒定命中无法被被动闪避规避）。
  - `[必中]` **不豁免主动化解**：目标仍会触发反应拦截（我方弹反应面板、敌方 AI 自动反应）与看破中断（`checkKanpoInterrupt`），反应技/看破仍可将必中伤害规避或无效化。
  - 对应入口条件：反应拦截由 `!isDodged && !(skill && skill.guaranteedHit)` 改为 `!isDodged`。

- **仇恨分布算法**：
  - 基础嘲讽值：防守者 (200)，普通 (100)，隐匿者 (50)。
  - 选中概率：$P(i) = \frac{\text{嘲讽值}_i}{\sum \text{嘲讽值}}$。

- **防守者强力反击几率（随仇恨提升）**：
  - $P_{\text{强力反击}} = 10\% + \max(0, \text{有效仇恨} - 200) \times 0.2\%$，无上限。
  - 打出一次强力反击后，防守者仇恨回归天生 200 点，几率随之重置。
  - **强力反击与普通反击互斥**：本次闪避一旦触发强力反击，即跳过同一次闪避免的普通反击判定，避免一击双重出击。

- **致命伤害避死被动（毅力留存 / 回避致命）**：
  - **毅力留存**：防守者、狂战士持有（每场战斗一次，强制保留 1 点 HP 避免死亡）。
  - **回避致命**：隐匿者、风行者持有（每场战斗一次，完美免除本次伤害）。
  - 每个实体仅归属一个职业，各职业同一事件监听器互斥；一次性标记（`hasTriggeredGrit` / `hasTriggeredAvoidFatal`）在每场战斗开始时清零。

- **隐匿者隐匿值累积**：
  - 隐匿值 $= 100 - \text{有效嘲讽}$（有效嘲讽含 `baseTauntBonus` 永久深度 + 临时 `[嘲]` 负值 buff）。
  - 初始 50；击杀 +30、成功闪避 +4（固化为 `baseTauntBonus` 永久降低嘲讽）；临时负 `[嘲]` 技能按数值累加（默认 3 回合后自然消失、隐匿值回落）。
  - 隐匿值 $\ge 80$：触发 1 次【再动】（跌回 80 以下解锁，可再次触发）。
  - 隐匿值 $\ge 100$：获得下一次非反应攻击 +50 攻击力（单次消耗，参考【回避】/【免伤】），随后隐匿值回归 50 开启新循环。

### 4.2.1 `[延迟]` 蓄力等待 与 `[加速]` 永久加速库存（我方专属）

- **`[延迟:N]`**：技能先"蓄力"N 回合（英雄处于 `⏳蓄力中`）。**资源（MP/HP/TP）在开启蓄力（handleChargeSkill）时即时校验并扣除（押注资源）**；蓄力期间只处于准备态、不结算任何技能效果但**仍可使用反应技能与看破**（不可主动普攻/技能/防御）；蓄力期间右侧面板切换为固定**【1.继续蓄力 2.终止蓄力】**，完成后变为**【1.释放蓄力 2.终止蓄力】**，释放时（`skipCost = true` 避免重复扣除）若满足选目标条件（敌方单体/带 `[他人]` 的我方单体）则进入目标选择，否则直接释放并触发其全部效果（含自身携带的 `[加速:N]`）。
- **`[加速:N]`**：永久加速库存（不自动过期，仅我方）。**只在蓄力释放结算完成时才施加**到角色身上；之后每次蓄力按"所需延迟回合"抵扣库存。加速作为普通技能效果在 `executeSkillAction` 统一结算，可与其它标签同时触发；若技能带 `[他人]` 且所选目标为我方角色，则加速施加到该目标，否则施加到施法者自身。
- **顺序**：**先蓄力 → 完成后结算（此时才 +加速）**。加速永远不影响"本次这一次"，只影响"之后"。
- **抵扣公式**：$covered = \min(\text{delay}, \text{hasteStore})$；$\text{hasteStore} -= covered$；$effective = \text{delay} - covered$。$effective=0$ 立即释放本回合；$effective>0$ 进入蓄力等待。
- **示例 `[延迟:3][加速:3]`**：第一次蓄力3回合，完成后 +3 加速库存；**下一次**再使用，库存3 抵扣 蓄力3 → 立即释放（模拟"狙击枪拼装后持续射击"）。
- **数据字段**（英雄对象）：`hero.hasteStore`（永久加速库存）、`hero.currentDelay = { skill, remaining }`（当前蓄力中技能）。
- **回合推进**：蓄力 `remaining` 仅在该英雄**非额外行动**（`!isExtraTurn`）时 -1；归零后该英雄回合展示**【释放蓄力/终止蓄力】**菜单，由玩家选择释放（含目标选择）或终止。
- **敌方不改**：现有 `[Charge]/[充能]/[蓄力]` 大招充能槽（FGO 风格）完全独立，不受影响。

### 4.2.2 `[驱散:N]` / `[群驱散:N]` 负面状态驱散（我方专属）

- **`[驱散:N]`**：对我方单个目标驱散 N 个负面 buff；**`[群驱散:N]`**：对我方全体各驱散 N 个。`N` 可选，无数字默认 1（如 `[驱散]`、`[群驱散:3]`）。
- **目标负面判定**（复用灾厄使被动口径）：`poison`/`stun`，以及负值 `def`/`hit`/`eva`/`atk`。无负面时显示"无负面"占位反馈，不报错。
- **目标取向**：`[驱散]` 属**纯增益单体**标签——不带 `[他人]` 只能对自己施放，带 `[他人]` 可进入"我方选目标"（对任意我方角色）；`[群驱散]` 因含`群`走 AOE，对我方全体直接施放。
- **实现**：`parseSkill()` 解析 `[驱散:N]`/`[群驱散:N]`（计数存入标签槽 `power`，自然沿用爆发倍率与持久化）；`TAG_HANDLERS['驱散']` 按计数移除最多 N 个负面；`isBeneficial` 与 `classifySkill().hasSingleBuff` 均将其归为增益单体。
- **仅影响我方**：敌方 AI 索敌/技能选择不受影响。

### 4.2.3 `[单冲]` / `[群冲]` 潜能值回复（我方专属）

- **`[单冲]` / `[群冲]`**：恢复潜能值（TP）。`power` 数值即回复点数（如 `[单冲;power:30]` 恢复 30 点 TP），上限 `maxTp`（默认 100），与 `[回蓝]` 的 MP 回复口径完全一致。
- **目标取向**：`[单冲]` 属**纯增益单体**标签——不带 `[他人]` 只能对自己施放，带 `[他人]` 可进入"我方选目标"（对任意我方角色，含自己）；`[群冲]` 因含`群`走 AOE，对我方全体直接施放。
- **实现**：`SKILL_TYPES` 加入 `[单冲]`/`[群冲]`（编辑器下拉）；`TAG_HANDLERS['冲']` 对 `ctx.target.tp` 累加 `ctx.actualPower` 并封顶；`classifySkill().hasSingleBuff` 加入 `单冲`。
- **仅影响我方**：敌方 AI 索敌/技能选择不受影响。

### 4.2.4 `[肃正]` 全队共享伪实体肉盾屏障机制

- **`[肃正]` / `[肃正:N]`**：为我方小队生成/累加全队共享的“伪实体肉盾”圣域结界屏障（`teamBarrier`）。屏障数值与各英雄个人护盾（`entity.shield`）完全独立，开局清零，无上限可无限叠加。
- **屏障名字跟随技能名**：屏障横幅/战报/飘字一律使用施放该屏障的技能名（全局 `teamBarrierName`），不再写死“圣域帷幕”。例如 `【魔法壁垒】[肃正;power:1000]` 施放后屏障即显示为“魔法壁垒”。
- **`Armor:N` 屏障护甲**：语法 `[肃正;power:1000;Armor:40]`。屏障对所有伤害（**含穿透**）拥有 N 点护甲值，伤害进入屏障吸收前**先扣减屏障护甲**。屏障被击破时护甲随之消散重置为 0。解析由 `parseSkill` 先提取并摘除 `;Armor:N`（避免阻断主 `;power:` 标签正则），存入 `skill.barrierArmor`。
- **子类型属性克制**：语法 `[肃正:法术;power:1000;Armor:40]`（子类型仅接受 `近战`/`远程`/`法术`）。屏障对该属性伤害额外 **50% 减免**，减免发生在**护甲扣除之前**（先减半 → 再扣屏障护甲 → 剩余量才进屏障吸收）。子类型缺失时回退到独立 `[法术]`/`[近战]`/`[远程]` 标签（`skill.damageType`）。存入 `skill.barrierSub`，屏障被击破时随之重置为 null。
- **显式覆盖叠加规则**：仅当施放技能携带 `Armor`/子类型参数时才更新屏障的护甲/克制属性；裸 `[肃正]`（或未带参数）补盾时**不修改**已有属性，只累加数值与刷新名字。
- **伪实体肉盾索敌拦截**：当 `teamBarrier > 0` 时，敌方单体索敌函数（`getTauntTarget`）强制归集命中屏障伪目标（`barrierStandIn`）。我方英雄处于完全保护状态，不被单独选中，不触发个人闪避 roll。
- **Armor = 0 与无视穿透**：屏障本身不享受英雄减伤护甲（`Armor=0`）；屏障护甲（`barrierArmor`）与屏障吸收值均按折算后的伤害扣减，`[穿透]` / `[群穿透]` 攻击无法绕过屏障扣减生命值。
- **群攻单次扣减与泄漏**：敌方群攻针对屏障实体**仅命中扣减 1 次**屏障数值；碎盾瞬间溢出的泄漏伤害平铺分发给我方全体英雄，续走各自的护甲与 HP 管线。
- **负面隔离与演出**：全额隔离敌方非伤害 Debuff，跳过受击后反应弹窗（看破不受影响）。受击时触发蜂窝网格过载与屏幕震动，破碎时触发全屏红闪与碎裂音效。
- **底层关联函数**：`applyBarrierHit()`、`getTauntTarget()`、`executeSkillAction()`、`TAG_HANDLERS['肃正']`、`updateTeamBarrierUI()`、`applyBarrierResist()`（屏障护甲/克制统一折算）、`parseSkill()`（`[肃正:子类型;power:N;Armor:N]` 解析）。

### 4.2.5 `[中毒]` / `[燃烧]` 持续伤害（DoT）标签

- **`[中毒;power:x]` / `[群中毒;power:x]`**：施加毒素层，每回合造成固定真实伤害，**叠层加深**——每次施放直接叠加新毒层，各层独立发作、互不覆盖（与灾厄使/施毒者淬毒攻击的 push 叠加语义一致）。Buff 结构 `{ type:'poison', value, duration }`。
- **`[燃烧;power:x]` / `[群燃烧;power:x]`**：施加火焰层，每回合造成固定真实伤害，**灼烧禁疗**——重复施放不叠层、仅刷新强度与持续时间；燃烧期间目标受到的 HP 治疗/回复效果**减半**（`[回]` handler 在治疗前检测 `b.type==='burn'`，`AFTER_HEAL` 事件传减半后的值，溢出转盾联动自动一致）。Buff 结构 `{ type:'burn', value, duration }`（同一目标仅一层）。
- **共同规则**：
  - `power` 即每回合真实伤害，直接扣 HP，**无视护甲/个人护盾/肃正屏障/免伤**（复用 `nextTurn` 毒 tick 的直接扣血管线，不经 `calculateDamage`）。
  - 默认持续 3 回合，支持 `[持续:N]` 调整（经 `skill.turns → globalTurns → effectTurns` 管线）。
  - 受极限爆发倍率影响：施放时 `actualPower = power × multiplier`。
  - 纯 debuff 路线（与 降/盲/滞/弱 同级）：不做闪避判定，可被【肃正】屏障格挡。
  - 目标取向：单目标进入敌方选目标，`[群X]` 走 AOE 打全体敌方（`classifySkill` 排除群前缀、`isBeneficial` 不含毒/燃 → 天然判为减益）。
- **负面口径**：【驱散】可清除毒/燃，灾厄使"痛打落水狗"将毒/燃计入负面增伤（两处负面谓词均含 `poison`/`burn`）；敌方 AI 的 `isDebuff` 识别 中毒/燃烧、`heroesWithoutDebuff` 将二者计入已中负面。
- **底层关联函数**：`TAG_HANDLERS['中毒']` / `TAG_HANDLERS['燃烧']` (`index.html:4622/4632`)、`nextTurn()` 毒/燃 tick (`index.html:6483`)、`updateBuffUI()` 状态徽章 (`index.html:4363`)、`[回]` 治疗禁疗 (`index.html:4780`)。

### 4.3 目标取向与 `[他人]` 标签标准

- **目标取向判定（全标签扫描）**：技能的目标取向由 `classifySkill()` 扫描 `type/type2/type3` 全部标签一次定好，**顺序无关**：
  - 含任一敌方单体伤害/妨害标签（`单体/穿透/眩晕/单降/单盲`）→ 进入**敌方选目标**（即使第一个标签是群攻）。
  - 含 `[他人]` 且含任一纯有益单体标签（`单回/单增/单防/单盾/单瞄/单冲/嘲/避/免伤/反击/驱散`）→ 进入**我方选目标**（不排除自己）。
  - 其余（纯群 AOE / 纯单体有益无他人 / 纯单体伤害兜底）→ 直接施放（纯单体有益无他人时对自己施放）。
- **`[他人]` 标签**：独立布尔标记 `skill.isOthers`（类似 `isReaction`/`kanpoTarget`，不占标签槽位）。只有带 `[他人]` 的单体有益技能才能对"其他角色"（含自己）施放；不带 `[他人]` 的单体有益技能只能对自己施放。
- **敌方 AI**：目标选择逻辑不变（`selectEnemySkillAndTarget`），`[他人]` 对其零副作用。

---

## 5. 代码结构与函数参考 (Function Reference)

> 单文件引擎内联所有 JS，按职责划分为以下模块。行号基于 `index.html`。

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
| `ROSTER_VERSION` | 6656 | 角色配置序列化版本号。 |

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
| `parseSkill` | 3444 | 解析技能串 `【名】[标签]...` 为技能对象。 |
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
| `updateBuffUI` | 3704 | 刷新角色的 Buff 图标悬停 UI。 |
| `renderTurnQueue` | 3728 | 渲染时间轴（行动顺序图标）。 |
| `showLog` | 3754 | 顶部临时提示条（2.5s 淡出）。 |
| `createFloatingText` | 3755 | 飘字（可扩展为 burst 大字）。 |
| `updateHeroUI` | 3757 | 刷新面板我方角色卡。 |
| `updateEnemyUI` | 3819 | 刷新面板敌方角色卡。 |
| `showEnemyInfo` | 5763 | 弹窗展示敌方详情。 |
| `updateMenu` | 6277 | 更新角色菜单（含 `getDisplayType` 子函数）。 |
| `updateActiveHeroDisplay` | 5962 | 更新当前行动者高亮显示。 |
| `openSkillMenu` / `closeSkillMenu` | 5977/5978 | 打开/关闭技能菜单。 |
| `cancelTargeting` | 5760 | 取消目标选择状态并复位 UI。 |

### 5.5 Effect System（标签处理器 / 事件总线 / 职业被动）

| 标识符 | 行号 | 作用 |
| :--- | :--- | :--- |
| `TAG_HANDLERS` | 3931 | 标签策略注册表本体。 |
| `registerTagHandler` | 3933 | 注册一个标签处理函数。 |
| `resolveTagHandler` | 4101 | 按标签名查找并分发到对应处理器。 |
| `CLASS_PASSIVES` | 4114 | 职业被动注册表本体。 |
| `registerClassPassive` | 4052 | 注册一个职业被动定义。 |
| `EVENTS` | 4306 | 事件总线事件名枚举（详见 §5.6）。 |
| `CombatEvents` | 4321 | 发布/订阅事件总线（`on`/`emit`/`emitAsync`，支持优先级）。 |
| `getEffectiveStats` | 4791 | 计算实体含 Buff 修正后的有效面板属性。 |
| `calculateDamage` | 4822 | 结算最终伤害（含护盾吸收、穿透判定）。 |

### 5.6 事件总线 `EVENTS` 键参考

事件总线通过 `CombatEvents.on(EVENTS.XXX, handler, priority)` 订阅、`CombatEvents.emit[Async](EVENTS.XXX, ctx)` 派发。**已实现并投入使用**的键：

| 事件键 | 含义 | 现有订阅方 |
| :--- | :--- | :--- |
| `BEFORE_SKILL_RESOLVE` | 技能宣告后、结算前（看破中断点） | 看破系统 |
| `TURN_START` | 回合开始（毒 tick、眩晕检查前） | 回合主循环 |
| `TURN_END` | 回合结束（充能积攒、多重施法触发） | 施法者被动 |
| `AFTER_DAMAGE` | 伤害结算后（淬毒、眩晕、仇恨附加） | 灾厄使被动 |
| `AFTER_HEAL` | 治疗后（溢出转盾） | 圣职者被动 |
| `ON_FATAL_DAMAGE` | 致命伤害时（毅力留存、回避致命） | 防守者/狂战士毅力留存，隐匿者/风行者回避致命 |
| `ON_DODGE` | 闪避成功时 | 防守者强力反击 / 隐匿者隐匿值+4 |
| `ON_KILL` | 目标被击杀时 | 隐匿者隐匿值+30 |
| `BUFF_EXPIRED` | Buff 过期时 | 回合主循环 / 隐匿者临时负[嘲]回落解锁 |

> ⚠️ **预留但尚未接线（Reserved / Not Wired）**（初期搭框架预留，当前无任何 `emit` 与 `on`，**不会触发**）。以下 3 个键是设计意图的"骨架"，为未来玩法扩充预留，**切勿误以为它们已生效**——若直接 `CombatEvents.on(...)` 订阅将静默失效，需先补上对应的 `emit` 调用点：

| 预留事件键 | 设计意图 | 可支撑的未来玩法 |
| :--- | :--- | :--- |
| `BEFORE_DAMAGE` | 伤害结算前（可修改 `rawDamage`） | 实时减伤/暴击/元素克制/反伤荆棘/护盾优先级钩子 |
| `BEFORE_HEAL` | 治疗前 | 治疗爆发/转化/抑制、濒死救援加成 |
| `BUFF_APPLIED` | Buff 施加时 | Buff 叠加刷新规则、净化反应、状态联动、免疫 |

> 订阅方可通过子代理梳理确认：目前实际 `CombatEvents.on(...)` 订阅的键为 `BEFORE_SKILL_RESOLVE`/`TURN_START`/`TURN_END`/`AFTER_DAMAGE`/`AFTER_HEAL`/`ON_FATAL_DAMAGE`/`ON_DODGE`/`ON_KILL`/`BUFF_EXPIRED`，其余 3 个预留键（`BEFORE_DAMAGE`/`BEFORE_HEAL`/`BUFF_APPLIED`）无任何调用点。

### 5.7 战斗主流程（核心循环）

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `startGame` | 5423 | 初始化战局并启动第一回合。 |
| `startRound` | 5447 | 时间轴排轴、回合主循环（TURN_START/TURN_END、毒 tick、眩晕、充能）。 |
| `getTauntTarget` | 5176 | 按仇恨轮盘概率选取敌方单体的目标。 |
| `selectEnemySkillAndTarget` | 5682 | 敌方 AI 决策：选技能与目标（含 `isHighYieldSkill` 辅助）。 |
| `isHighYieldSkill` | 5657 | 判断技能是否为高收益（用于敌方 AI 策略）。 |
| `prepareAttack` | 5852 | 玩家普通攻击准备。 |
| `handleChargeSkill` | 5902 | `[延迟]` 蓄力技能入口：按 `[加速]` 库存抵扣，进入蓄力状态（remaining<=0 则本回合即可释放）。 |
| `releaseCharge` | 5928 | 蓄力释放：按目标取向进入敌方/我方选目标，或直接释放。 |
| `doReleaseCharge` | 5952 | 实际释放蓄力技能：结算原技能并施加自身 `[加速]` 库存。 |
| `continueCharge` | 5971 | 蓄力中"继续蓄力"：消耗本回合推进蓄力。 |
| `cancelCharge` | 5979 | 终止蓄力：清除蓄力状态并消耗本回合。 |
| `renderHeroMenu` / `updateChargeMenu` | 5990/6003 | 蓄力中渲染专用菜单（继续/释放/终止），否则渲染正常菜单。 |
| `classifySkill` | 6095 | 技能目标取向分类：全标签扫描一次定好（敌方单体/他人/纯群/纯单体有益）。 |
| `prepareSkillTarget` | 6106 | 玩家技能选目标准备（按 `classifySkill` 结果进入敌方/我方/直接施放）。 |
| `promptReaction` | 4836 | 反应拦截弹窗（含 `window.resolveReaction` 回调）。 |
| `promptKanpo` | 4468 | 看破弹窗（含 `window.resolveKanpo` 回调、`shelvePrompt`/`cleanupPrompt` 收起逻辑）。 |
| `getKanpoTarget` | 4454 | 判断技能是否可被某角色看破。 |
| `retreatBattle` | 5566 | 战术撤退入口。 |
| `showBattleResult` / `closeBattleResult` | 5572/5616 | 战后结算面板显示/关闭。 |
| `sendResultToTavern` | 5622 | 将战后小说文本注入酒馆对话框。 |

### 5.8 编辑器与持久化

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `resetBattle` | 6095 | 重置战斗（恢复初始缓存快照）。 |
| `openEditor` / `closeEditor` | 6114/6146 | 全效编辑器打开/关闭。 |
| `syncEditorDataToMemory` | 6147 | 将编辑器表单同步回内存数据。 |
| `saveEditor` | 6213 | 保存编辑器改动并持久化。 |
| `addHeroSkill` / `removeHeroSkill` | 6256/6257 | 我方技能增删。 |
| `addEnemySkill` / `removeEnemySkill` | 6258/6259 | 敌方技能增删。 |
| `addHero` / `removeHero` | 6260/6261 | 我方角色增删。 |
| `addEnemy` / `removeEnemy` | 6262/6263 | 敌方角色增删。 |
| `serializeHeroesForSave` | 6659 | 序列化我方角色配置用于持久化。 |
| `persistHeroesRoster` | 6389 | 将我方角色配置写入酒馆 chat 变量。 |
| `readRoster` | 6395 | 从酒馆 chat 变量读取角色配置。 |
| `applyPersistedRoster` | 6407 | 合并持久化角色配置（同步缓存，供重置恢复）。 |

### 5.9 防御恢复与 LLM 设置（持久化）

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `clampPct` | 6349 | 将数值收敛到 0–100 百分比。 |
| `loadDefendSettings` | 6351 | 读取防御恢复设置。 |
| `persistDefendSettings` | 6363 | 持久化防御恢复设置。 |
| `initLLMPresets` | 6287 | 初始化 LLM 预设列表。 |
| `openLLMSettings` / `closeLLMSettings` | 6437/6443 | LLM 设置面板开关。 |
| `switchLLMPreset` | 6447 | 切换 LLM 预设（可保存当前）。 |

### 5.10 对话与 LLM 叙事系统

| 函数 | 行号 | 作用 |
| :--- | :--- | :--- |
| `initChatInputArea` | 6500 | 初始化底部对话输入区。 |
| `sendPlayerChat` | 6604 | 玩家发送对话。 |
| `toggleAllyAutoSpeak` / `updateAllyToggleUI` | 6519/6525 | 友方自动旁白开关与 UI。 |
| `toggleEnemyAutoSpeak` / `updateEnemyToggleUI` | 6537/6543 | 敌方自动旁白开关与 UI。 |
| `triggerAllyAutoSpeak` | 6636 | 触发友方英雄主动性旁白。 |
| `triggerEnemyAutoSpeak` | 6724 | 触发敌方智慧旁白。 |
| `triggerKanpoNarration` | 6646 | 看破后触发震惊/反应旁白。 |
| `requestLLMResponse` | 6660 | 请求 LLM 生成对话气泡（统一入口）。 |
| `callLLMAPI` | 6732 | 调用 OpenAI 兼容 `/chat/completions` 接口（含酒馆上下文抓取）。 |
| `showChatBubble` | 6556 | 显示对话气泡。 |
| `showThinkingBubble` | 6704 | 显示"思考中"气泡。 |
| `parseLLMResponse` | 6903 | 解析 LLM 返回文本为角色气泡数据。 |

---

## 6. 预留事件钩子扩充指引 (Future: Reserved Event Hooks)

初期搭框架时，`EVENTS` 中预留了 4 个事件键（`BEFORE_DAMAGE` / `BEFORE_HEAL` / `ON_KILL` / `BUFF_APPLIED`），其中 `ON_KILL` 已在 V5.0 中被隐匿者被动接线（击杀累积隐匿值），其余 3 个仍为预留。它们用于在事件流的关键节点上挂载玩法模块。接入规范如下：

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