# 舍身 / 召唤守护 / 肃正结界 前端交接（后端权威结果契约）

> 2026-11-25。后端已落地，本文全部字段与示例来自真实 `createBattle` 运行结果（`integration-test/fixtures/tactics/guard-*-node-cases.mjs` 导出的 `examples`）。
> 前端只消费结果，不重算落点、路径、伤害、致死、拦截、耐久或减疗。

## 1. 本轮确定规则与 SPEC 差异

| 主题 | 现行规则（已同步 `doc/tactics/SPEC.md` S03/S07） |
|---|---|
| 舍身范围 | 守护者**当前有效完整移动上限的一半**（含飞行 +50%），不读剩余移动、不读被保护者移动；原固定 2m 回退已移除 |
| 舍身落点 | 后端自动选：被保护者**朝攻击来源一侧**相邻合法站位，优先处于来源与目标之间；再按方向对齐、路径成本、row/col。无来源侧可达点即不可执行 |
| 舍身提交 | 选择后重查资源/限次/冷却/材料/路径/占位；通过才一次扣费并真实移动，失败零消费。挡刀后**留在落点不归位** |
| 舍身语义 | 仅单体当前伤害段，在原目标基础闪避失败后触发；守护者用自身抗性/护甲/免伤/护盾/保命，可二次反应，不可递归舍身 |
| 阵营 | 战棋普通舍身对双方阵营开放（原版为我方专属），本轮未改 |
| 召唤自动守护 | 明确 `summonOwnerId` 的召唤物，主人本段**实际伤害会清空 HP** 时自动代挡，零费用，优先于主人选择反应/保命/复活；非致死不触发；多召唤物按路径成本→稳定单位序 |
| 结界取值 | 耐久/时长取**实际肃正槽**（主槽、副槽、规范标签同口径），不再读主槽 power 或依赖 `barrierSub` |
| 结界承伤 | 同一真实伤害段命中同一结界只扣一次耐久，所有被保护目标共享该结果；击破当段无溢出 |
| 结界颜色 | 由创建配置固定：法术 `gold`、远程 `blue`、其余 `white`；不随来袭类型变色 |
| 结界隔绝 | 外敌减益全槽 + 场地（雾）对目标的进入/查询/tick 均被拦；场地实体保留，外围正常生效 |
| 跨界 | 敌方禁止跨界（含外→外途中穿界），内部敌人可在内部行动，不被冻结 |
| 直接攻击 | 空结界可作为非角色目标被攻击，走正式射程/视线/墙/费用预检 |

## 2. 函数签名与字段定义

### 2.1 查询 / 预检 / 提交入口（`battle` 实例）

| 接口 | 用途 | 副作用 |
|---|---|---|
| `battle.previewGuardCandidates(targetId, sourceId, incomingSkill)` | 纯查询：当前可执行的普通舍身候选 | 无 |
| `battle.queryBarrierTargets(skill)` | 纯查询：当前可直接攻击的敌方结界 `[{barrierId, point, query}]` | 无 |
| `queryAttack(ctx, casterId, skill, { barrierId, x?, y? })` | 结界目标预检，见 §7 | 无 |
| `battle.beginAttack(skill, aim, options)` / `battle.attack(...)` | 提交；反应选择经 generator yield | 提交全部规则 |
| `battle.finishBattle()` / `battle.reset()` / `battle.destroy()` | 生命周期清理 | 清结界、切换 `runId` |

`aim = { barrierId }` 时 `queryAttack` 返回 `barrierTargetIds`、`barrierTargets:[{barrierId, point}]`，`actualTargetIds:[]`（不伪造单位），`slotTargets[*].barrierIds` 标出哪些攻击槽打结界。

### 2.2 身份（每个事件与结果段都带）

```
runId      "battle:<实例>:<代际>"   reset/destroy 后变化，旧事件不可匹配新战斗
attackId   "attack:N"               一次 beginAttack
segmentId  "<runId>:<attackId>:slot:<i>:segment:<n>"   一个真实伤害段；群攻多目标共享
eventId    "<runId>:event:<seq>"    领域事件唯一键
```

事件统一含 `seq, eventId, runId, actionId, at, attackId, type`，处于伤害段内时另含 `segmentId, slotIndex, segmentIndex, shotIndex`。

### 2.3 单位与路径（`guard.mjs` → `previewGuard`）

```
from {col,row,facing}         守护者提交前站位（动画前快照）
to   {col,row,facing}         拦截落点（已提交的权威站位，facing 朝攻击来源）
path [{col,row},…]            完整锚点路径（含起点）
distance                      路径预算成本（背人 ×2）
pathDistance                  路径几何米数
origin {x,y}                  攻击者世界中心
startPosition {x,y}           守护者出发世界中心
protectedPosition {x,y}       被保护者世界中心
contactPoint {x,y}            守护落点世界中心（格挡动效落点）
```

### 2.4 抗性原因（`variant-rules.mjs` → `applyTypeResist(..., details)`）

```
{ before, after, layers:[{ reason, sourceKind, sourceId?, damageType, multiplier, before, after }] }
reason     phantom(虚形/近战) | fluid(流体/远程) | anti-magic(破法/法术) | vital(要害/AoE) | resist-map
sourceKind native-variant | granted-variant | resist-map
```

免疫 `immunityReason(unit, kind, buffs)` → `null | { reason, sourceKind, sourceId? }`，reason ∈ `poison-proof | fire-proof | steel-body | immunePoison | immuneBurn`（显式字段 `sourceKind:'explicit-immune'`）。

### 2.5 燃烧减疗（`effect-handlers.mjs` heal 结果）

```
healBeforeSuppression   暴击等倍率后的治疗输入量
healAfterSuppression    减疗后量
healSuppressed          燃烧削减量
value                   实际进入 HP 的量
hpBefore / hpAfter / hpCapped   hpCapped 为被 maxHp 截断的数量（非布尔）
shieldBefore / shieldAfter / overheal   溢出转盾
reason                  'burn-heal-suppressed' | null
suppressionSources      燃烧来源快照数组
```

### 2.6 结界对象（`barriers.mjs`）

```
id "…:barrier:<casterId>:<serial>"   每次创建唯一，替换后不同
casterId, side
center {x,y}, radius, cells[{col,row}], shape, boundary{type:'circle',…}
integrity, maxIntegrity, armor
protectType '法术'|'远程'|'近战'|'all'   visualIdentity 'gold'|'blue'|'white'
createdAt, endAt (虚拟时间；null = 永久)
```

承伤结果字段：`integrityBefore, integrityAfter, rawDamage, resistedDamage(类型减半后), armorDamage(护甲吸收), damage, actualLoss(实际耐久损失), noOverflow:true, broken, barrierBefore, barrierAfter`。

## 3. 单位

- 锚点 `{col,row}` 整数格；世界点 `{x,y}` 单位米，一格 ≈ 1 米（中心 = col+0.5, row+0.5）。
- 路径为锚点序列；八向，斜向成本 √2。
- 时间为虚拟战斗时间，100 = 1 回合（`at / createdAt / endAt`）。
- 像素由前端按相机换算，后端不产生像素坐标。

## 4. 调用顺序

**舍身（玩家选择）**
1. 攻击段结算到"原目标基础闪避失败"→ 后端发出 `reaction-request`（yield，`candidates[*].guardian===true` 的项含完整 `guard` 预览）。
2. 前端弹窗展示；选择后 `gen.next({responderId, skill})`。
3. 后端重检并提交：更新站位 → 扣费 → `reaction-used` → `guard-committed`（同段身份）。
4. 守护者自身二次反应（可再次 yield `reaction-request`）→ 正常承伤管线 → `segment-resolved`。

**舍身（召唤自动）**：无 yield；致死判定命中即自动提交 `guard-committed`（`reason:'summon-lethal-guard'`），随后可能 yield 守护召唤物的二次反应。

**结界**：`previewAttack` 预检 → 提交时 `barrier-created` → 每个真实伤害段命中 `barrier-damaged`（唯一）→ `barrier-removed`（原因见 §5）。

## 5. 后端真实状态 vs 前端展示状态

- 后端在 `beginAttack` 返回前已提交全部站位、资源、伤害、结界状态；**不等待任何动画回调**。
- `result.hits[*].segments[*]` 与 `result.events` 是提交后快照；`guard.from / startPosition` 是动画前快照。
- 导演钩子（`createActionDirector` deps）：`holdGuards(result)` 在普通刷新前把守护者显示位置锁在 `startPosition`；`presentGuard(guard, ctx)`（可选，返回 Promise）播放冲刺→格挡，完成后导演才 `revealSegment` 受击；`onRuleReveal(value, {kind, result})` 依次给出 `guard / resistance / barrier-damage / heal-suppressed / immunity / barrier-blocked / barrier-created / barrier-removed`。scope 失活时全部取消且不揭示旧伤害。
- 前端**不得**根据动画结束位置回写战斗坐标。

## 6. 舍身冲刺→格挡→受击消费示例（召唤自动致死守护，真实输出）

`guard-committed` 事件（节选）：

```json
{ "type":"guard-committed","reason":"summon-lethal-guard","guardianId":"p","originalTargetId":"t","casterId":"s",
  "segmentId":"battle:1:0:attack:1:slot:0:segment:1","attackId":"attack:1",
  "from":{"col":5,"row":5},"to":{"col":7,"row":5,"facing":90},
  "path":[{"col":5,"row":5},{"col":6,"row":5},{"col":7,"row":5}],
  "distance":2,"pathDistance":2,"maxDistance":3,
  "origin":{"x":12.5,"y":5.5},"startPosition":{"x":5.5,"y":5.5},
  "protectedPosition":{"x":6.5,"y":5.5},"contactPoint":{"x":7.5,"y":5.5},
  "finalTargetId":"p","committed":true,
  "lethalCheck":{"targetId":"t","hpBefore":30,"hpDmg":100,"shieldDmg":0,"rawDmg":100,"lethal":true},
  "reactionUsed":{"type":"reaction-used","responderId":"p","skillName":"召唤守护","costs":{"mp":0,"hp":0,"tp":0},"usesLeft":null,"cooldownAt":0} }
```

对应 `segments[0]`（节选）：`"targetId":"p","originalTargetId":"t","finalTargetId":"p","hpBefore":500,"hpAfter":400,"hpDmg":100,"resistance":{"before":100,"after":100,"layers":[]},"fatalResult":null,"reaction":{"guardianId":"p","guard":{…同上}}`。

消费顺序：`holdGuards` → 冲刺（`startPosition→path→contactPoint`）→ 到位格挡（`contactPoint`，`facing` 朝 `origin`）→ 揭示段受击（`hpBefore/hpAfter/shieldBefore/shieldAfter/fatalResult`）→ 不归位。`lethalCheck.lethal` 即触发原因，前端不判断致死。

## 7. 结界：创建→群攻一次承伤→减益拦截→击破（真实输出）

创建：
```json
{ "type":"barrier-created","barrierId":"battle:1:0:barrier:h:1","reason":"created",
  "barrier":{"id":"battle:1:0:barrier:h:1","casterId":"h","side":"hero","center":{"x":5.5,"y":5.5},"radius":2,
    "cells":[{"col":5,"row":3},…13格],"integrity":90,"maxIntegrity":90,"armor":0,
    "protectType":"法术","visualIdentity":"gold","createdAt":50,"endAt":250,
    "shape":{"type":"圆形","center":{"x":5.5,"y":5.5},"radius":2}} }
```
（副槽 `[肃正:法术] power2:90 slotTurns2:2`，主槽为 `[回复]` —— 取值来自实际肃正槽。）

群攻一次整体承伤（保护 h、a 两单位，只此一条）：
```json
{ "type":"barrier-damaged","reason":"damage","segmentId":"…:attack:2:slot:0:segment:1","casterId":"e",
  "origin":{"x":10.5,"y":5.5},"incomingType":"法术","contactPoint":{"x":7.5,"y":5.5},
  "protectedTargetIds":["h","a"],"integrityBefore":100,"integrityAfter":90,
  "rawDamage":20,"resistedDamage":10,"armorDamage":0,"damage":10,"actualLoss":10,"noOverflow":true,"broken":false,
  "barrierBefore":{…},"barrierAfter":{…} }
```
每个被保护目标的 `segments[0].barrierHitId === eventId` —— 按此去重，**同一 eventId 只播一次受击**。

减益拦截：
```json
{ "type":"barrier-blocked","reason":"barrier-debuff","barrierId":"…","casterId":"e","targetId":"h",
  "blockedTag":"弱攻","blockedKind":"buff","origin":{"x":10.5,"y":5.5},"slotIndex":0 }
```
场地拦截同类型，`reason:'barrier-field'`，`blockedTag:'fog'`，附 `source`（施术者 id/阵营/站位快照）。

击破：`barrier-damaged.broken:true, actualLoss:5, integrityAfter:0` 后紧随 `{"type":"barrier-removed","reason":"broken","barrier":{…最终快照}}`；同段内部目标 `hp` 不变。

直接攻击空结界：`queryAttack(…, {barrierId})` →
```json
{ "ok":true,"aim":{"barrierId":"…","x":7.5,"y":5.5},"barrierTargetIds":["…"],"barrierTargets":[{"barrierId":"…","point":{"x":7.5,"y":5.5}}],
  "actualTargetIds":[],"slotTargets":[{"index":0,"attack":true,"barrierIds":["…"]}],"contact":{"type":"barrier","point":{"x":7.5,"y":5.5}}} }
```

## 8. 抗性 / 燃烧减疗消费示例

抗性（段字段 `resistance`，类型 + AoE 叠加各一层）：
```json
{ "before":7,"after":1,"layers":[
  {"reason":"phantom","sourceKind":"native-variant","damageType":"近战","multiplier":0.5,"before":7,"after":3},
  {"reason":"vital","sourceKind":"native-variant","damageType":"AoE","multiplier":0.5,"before":3,"after":1}] }
```
`layers` 为空表示无抗性；护甲/护盾/免伤不进入此字段。

燃烧减疗（`effect-resolved` 事件 / `result.effects`）：
```json
{ "kind":"heal","reason":"burn-heal-suppressed","burning":true,
  "healBeforeSuppression":21,"healAfterSuppression":10,"healSuppressed":11,
  "hpBefore":95,"hpAfter":100,"value":5,"hpCapped":5,"shieldBefore":3,"shieldAfter":8,"overheal":5,
  "suppressionSources":[{"effectId":"burn:1","casterId":"enemy"}] }
```
无燃烧时 `reason:null`、`suppressionSources:[]`。`hpCapped`（满血截断）与 `healSuppressed`（燃烧削减）分开，不得混用。

## 9. 原版视觉移植定位（`index.html` 只读）

| 用途 | 位置 |
|---|---|
| 舍身冲刺 + 格挡 + **归位（不移植）** | `playRescueSheshen` L13523；决意 0–340ms / 突进 335–630ms / 格挡 630ms（`parry_perfect` 采样、`shake('heavy')`）/ 归位 `release()` L13578 **跳过**；样式 `.arcane-rescue-anchor/.arcane-rescue-ghost` L1151、L1154 |
| 召唤守护 | `playSummonGuard` L14082；冲刺 180ms → 格挡 `impact()`（`parry` 采样）；`doReturn()` L14135 **跳过**；`guardianDown` 分支接 `playSummonExit`；样式 `.arcane-summon-anchor/.arcane-summon-aura` L1262、L1268 |
| 召唤守护注入与致死判定 | L19633–19635、L23618–23633 |
| 抗性表现 | `RESIST_FX` 表 L12220（键可直接用 `damageType` 中文：远程→fluid、近战→phantom、法术→antiMagic、要害→vital）；`playVariantResistFx` L12499；`resist_*` 采样 L5243 起 |
| 燃烧禁疗 | `playStatusHealSuppressed` L12821（采样 `healSuppress → ranshao` L12560）；原调用 L21412 |
| 屏障样式 | `.team-barrier-wrapper` 主题变量 L2106–2174（gold 默认 / `[data-theme="blue"]` / `white`）；`.barrier-hit-ripple/.barrier-hex-spotlight/.barrier-hit-impact` L2270–2298；`barrier-vibrate-glitch` L2318 |
| 屏障创建 | `registerTagHandler('肃正')` L21269（`shieldUp` 音效 + `shield` SVG）；主题选择 `getBarrierTheme()` L20493 |
| 屏障受击 | `applyBarrierHit` L24335（涟漪、hex spotlight、`spawnHitFlash`、震屏、`atk1/atk2`）；完全格挡分支 L24405 |
| 屏障减益阻挡 | `triggerBarrierDebuffBlock` L24191（`atk2`） |
| 屏障破碎 | `triggerBarrierShatter` L24230（`atk1`，80 片六边晶片，主题色表 L24239） |

屏障原版是覆盖英雄行的矩形穹顶；战棋需改为按 `barrier.center/radius/cells` 覆盖固定世界范围的圆形。现有 `syncBarriers` 圆环与 `nak-tith-barrier` 条目是临时表现，待前端替换。

## 10. 前端必须遵守

- **不归位**：舍身/召唤守护后单位留在 `to`；禁止调用原版 `release()/doReturn()` 归位段。
- **整体受击**：同一 `eventId` 只播一次；群攻多目标共享 `barrierHitId`，不按受保护人数重复。
- **颜色身份**：只读 `visualIdentity`，不按来袭类型或技能名变色。
- **范围一致**：屏障视觉用 `center/radius/cells`，不用估算圆。
- **不重算**：落点/路径/致死/减疗/耐久全部来自后端；`lethalCheck.lethal`、`resistance.layers`、`reason` 即权威原因。
- **后端不等动画**：冲刺/格挡 Promise 只控制揭示顺序；scope 失活取消且不揭示旧结果。

## 11. 重开 / 结束清理契约

| 场景 | 事件 | `runId` |
|---|---|---|
| 正式结束（胜负/僵持/`finishBattle`） | `barrier-removed reason:'battle-ended'` | 不变 |
| `reset()` | `reason:'reset'`（经 `reset().resetEvents` 返回） | **变化** |
| `destroy()` / 换场 | `reason:'destroyed'` | **变化** |
| 到期 | `reason:'expired'` | 不变 |
| 同施术者替换 | `reason:'replaced'` | 不变 |
| 击破 | `reason:'broken'` | 不变 |

前端按 `runId` 丢弃旧代际事件；`reset()` 返回的快照新增 `runId` 与 `resetEvents`（规则状态与开场一致）。

## 12. 状态清单

**已完成并验证（Node 真实模块）**：舍身路径 14、舍身战斗 14、原因 12、结界流程 10、结界空间 5、导演 4；受影响既有 `typical-battle` 34、`typical-space` 30、`typical-ai` 16、`p07` 21、`fx01` 49、`p04` 8、`rules02-passive` 24。

**仍待前端实现**：冲刺/格挡/召唤守护动效与音效接线（`presentGuard` 钩子已留）；原版屏障穹顶、受击、减益阻挡、破碎表现；抗性、禁疗、免疫的原因驱动演出（`onRuleReveal` 已留）；直接攻击结界的瞄准 UI（后端契约已就绪）。

**待真实页面验收**：唯一全量、打包产物专项与真实页面战斗流程见本轮 LOG 记录；完整视听效果未验收。
