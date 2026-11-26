# P03 跑圈与全局事件时钟契约（冻结）

## 核心目的

把 SPEC S02/S03/S06/S15#3 固化为无 DOM、无 rAF、无现实定时器的纯规则时钟：虚拟时间只在明确的事件点之间跳转，旧大回合能力逐项映射为时钟事件，现实等待（动画／旁白／思考）完全不推进战斗。

## 具体任务

- 冻结 `battleState` 内的时钟数据形状、模块接口与同刻结算顺序，供 P02（UI 轴投影）、P07（数值链）、P10（救援）、P11（续载）按此消费。
- 记录旧 `index.html` 大回合力量的逐项映射与责任边界（S15#3），禁止以旧重建器掩盖缺口。
- 本契约只冻结数据与时序；伤害数值、技能效果、空间占位、AI 决策、救援交互分别归 P06/P07/P04/P09/P10。

## 一、数据形状（全部 JSON 可序列化，无函数／Map／Set）

时钟状态存放于 `battleState`（`tactics/src/lifecycle.mjs` `emptyBattleState` 的既有容器）：

```
battleState.progress[unitId] = { distance, lap }      // 已完成距离（0..10000）与已完成圈数；唯一距离真值
battleState.cooldowns[unitId][skillKey] = endAt       // 冷却绝对到期时刻（替代旧"每大回合-1"）
battleState.combatState.clock = {
  now,                                                // 全局虚拟时间
  order: [unitId...],                                 // 稳定平局序（首建冻结，恢复忽略输入数组顺序，新单位追加）
  units: { [unitId]: {
    id, side, name?, baseSpd, speed,                  // baseSpd 为同刻平局排序用的基础敏捷；speed 为当前有效敏捷
    repeatActions?,                                    // AI 敌人自上一玩家自然行动以来实际行动数（未设置按 0）
    status: 'active'|'down'|'out',
    lastSync, spawnedAt,                              // 计距基准时刻；注册时刻
    stun: null|{permanent},                           // 眩晕：消耗下一次自然行动
    hitSinceWindow,                                   // 隐匿窗口受击标记
    extraMain, mainPointSources: [sourceKey...],      // 当前行动内立即生效的额外主行动点及其来源
  }},
  statuses: { [key]: {                                // key = unitId \u0000 casterId \u0000 skillId \u0000 effectId
    key, unitId, source, kind, strength?,
    interval,                                         // 跳伤/周期间隔（缺省 100）
    appliedAt, nextTickAt?, endAt|null,               // endAt=null 表示随战斗存续
  }},
  rescues: { [unitId]: { deadline } },                // 临时盟友救援截止（缺省 now+300，可显式覆盖）
  opportunityGates: { [key]: readyAt },               // "触发后100时间才能再次取得"
  pendingMainPoints: [ { targetId, sourceKey } ],     // 待领取额外主行动点（每来源每目标最多1）
  currentAction: null|{ unitId, resources },          // 行动冻结期标记（grant 到 endAction 之间）
  terminal: null|{ type:'stalemate'|'battle-end', at },// 终局（僵持只发一次）
  log: [ {seq, t, type, ...} ],                       // 事件流水（重放校验用）
}
```

规则：

1. `progress[unitId].distance` 是唯一距离真值；下一到轴时刻由 `剩余距离 ÷ 排轴速度` 现算，不另存预测真值。排轴速度等于 `speed ÷ (1 + repeatActions)`；`battle` 在玩家实际取得自然行动或 AI 敌人实际行动时提交 `recordPacingAction`，清除敌方计数或累加当前敌人计数，保持计距不变。
2. `combatState.clock` 是全局时间与调度元数据的唯一家；HP/MP/TP/库存真值仍不进战术档（P01 契约 §3）。
3. 周期事件携带 `{source, kind, strength, t}` 交给调用方同步结算；`dot-tick` 额外携带 `suppressed`：倒地/离场目标为 `true`（状态照计时但禁止下游扣持续伤害），存活目标为 `false`；时钟不存资源真值、不异步补账。

## 二、模块与接口（`tactics/src/scheduler.mjs` + `tactics/src/clock.mjs`）

`scheduler.mjs`（效果与行动资格域；不 import clock，保持单向依赖）。统一约定：**首参为 `battleState`**（`progress`/`cooldowns` 是其兄弟字段，`clock = battleState.combatState.clock`），浮点比较统一用 `EPS = 1e-9`：

```
LAP_DISTANCE = 10000        // 一圈行动距离
ROUND_TIME   = 100          // 100 虚拟时间 = 1 回合
DEFAULT_RESCUE_TIME = 300   // S10 缺省救援窗口

settlePhase12(battleState, t, hooks) -> events[]
// 阶段①应触发的周期效果（含末跳）→ 阶段②状态到期/冷却解除/救援截止。
// hooks = { onEvent(e)?, resyncSpeed(unitId)? }；hooks 由 clock 提供，调用方可在 onEvent 内
// 同步改 HP、调 dispatchClock（exitUnit/reenterUnit 等）。

collectArrivals(battleState, t) -> [unitRecord...]   // 阶段③候选：基础敏捷降序 → 稳定序升序
nextEffectEventTime(battleState) -> number           // 效果域最近事件时刻（无则 Infinity）
hasFutureSpeedRestore(battleState) -> bool           // 存在未到期的 'spd' 效果
hasBattleEndingFuture(battleState) -> bool           // 存在可导向终局的未来事件（毒/燃未跳完、救援截止；spd 到期由 hasFutureSpeedRestore 单列，clock 组合判定）
hasActionableUnit(battleState) -> bool               // 任一 active 且 speed>0 且非永久眩晕
applyStatusRecord(battleState, cmd, now) -> events[] // 同源刷新：保节拍、只更新强度/到期；interval 有效域 ≥1，≤0 回退 ROUND_TIME
grantNaturalAction(battleState, unitId, now) -> {resources, events}
processStunSkip(battleState, unitId, now) -> event   // 消耗眩晕、重跑一圈
grantMainPoint(battleState, targetId, sourceKey, now) -> event|null
clearPendingPointsFor(battleState, unitId)           // 倒地/离场清除指向它的待领取点
distanceOf / creditDistance / nextArrivalTimeOf / ensureProgress / statusKeyOf / isOpportunityReady
```

`clock.mjs`（距离与时间引擎；import scheduler）：

```
createClock(battleState, units, options?) -> clockState（即 battleState.combatState.clock）
// units: [{id, side, baseSpd, name?}]；options: { stableOrder?, speedOf?(unitId) }
// combatState.clock 已存在 → 恢复：忽略 units 数组顺序，新单位追加，缺失单位置 'out'，不重置进度；
//   恢复时按 speedOf 刷新各单位的当前有效敏捷（计距基准 lastSync 不动，不产生追溯计距）。
// 否则初始化：now=0、全员从零起跑（S01：同场景新战斗从零重新跑圈）；
//   平局序 = options.stableOrder，缺省按稳定 ID 字典序（不受 DOM/读档/枚举顺序影响）。

dispatchClock(battleState, command, rulesContext?) -> {ok, events}
// command.type：
//   speedChange      {unitId}                          结算已跑距离并按 rulesContext.speedOf 重读有效敏捷
//   applyStatus      {unitId, source, kind, strength?, duration?, interval?}
//                    poison/burn 的 source 必须是 {casterId, skillId, effectId}，稳定同源键为
//                    unitId+casterId+skillId+effectId；其他 kind 可继续使用简单 source 字符串。
//                    kind: 'poison'|'burn'（首跳施加+100；同源重施保节拍）、'spd'（到期重算耗时）、
//                          'defend'（刷新期限不叠减伤）、'periodic'（每 interval 触发）、
//                          'stealth-window'（隐匿窗口）、'generic'（仅期限）
//   removeStatus     {unitId, source}                  驱散/取消（不触发到期事件）
//   applyCooldown    {unitId, skillKey, duration}      登记绝对到期；解除先于当刻行动（T03-05）
//   applyStun        {unitId, permanent?}              跳过下一次自然行动全部资源后重跑一圈
//   scheduleRescue   {unitId, deadline?}               缺省 now+300
//   cancelRescue     {unitId}                          压线前获救
//   registerUnit     {unit, fresh:true}                新生成：立即占位、从零跑完整圈（T03-06）
//   exitUnit         {unitId, cause}                   倒地/离场：退出行动轴、清除指向它的待领取点；状态计时照走
//   reenterUnit      {unitId}                          复活/救起：从零跑圈，未到期状态保留（S10）
//   markHit          {unitId}                          隐匿窗口内被命中
//   grantMainPoint   {targetId, sourceKey}             当前行动目标立即加点；否则待领取（每来源每目标≤1）
//   setOpportunityGate {key}                           readyAt = now + 100
//   endAction        {unitId}                          清未用点、解除冻结

advanceToNextAction(battleState, rulesContext) -> result
// rulesContext: { speedOf?(unitId), onEvent?(event), checkBattleEnd?(battleState) }
// result:
//   { status:'action',  time, unitId, resources:{moveQuota, main, aux}, events }
//   { status:'frozen',  time }                // 行动冻结期内调用，时间与进度不变（T03-07）
//   { status:'terminal',time, terminal }      // stalemate/battle-end 只发一次；之后重复查询不重发
// 推进循环：僵持预检 → 跳到最近事件 → 同刻三阶段结算 → 战斗终局钩子 → 发放行动资格。
// 僵持判定 = 无可行动单位 且 无未到期 spd 效果 且 无可导向终局的有限未来事件（有限毒/燃末跳、救援截止）；
// 永久周期回血、永久毒/燃（endAt=null）与已退出单位的状态 tick 不阻止僵持；全员永久眩晕视为无人可行动。

getVisibleTurnQueue(battleState, viewerSide, visibilityState) -> [ {unitId, side, name?, nextActionAt} ]
// visibilityState: { visibleUnitIds:[...] }；友方全显，敌方仅可见集合内返回；隐藏者零占位、零人数、零身份（S02 L37）
// 倒地/离场/零速无到轴者不进轴；同刻按基础敏捷降序→稳定序升序排列。

getUnitNextActionAt(battleState, unitId) -> number|null
getActionState(battleState) -> {unitId, resources}|null   // 冻结期内实时读主行动点余额（1+立即加点数）
isOpportunityReady(battleState, key) -> bool
```

## 三、时序规则（同刻三阶段，SPEC S02 L33）

1. **阶段①周期效果**：`nextTickAt == t` 的效果结算（毒/燃跳伤、周期回血/蓄能、隐匿窗口）；同刻死亡→复活→资格变化在本阶段内同步生效。倒地/离场单位的状态时钟继续推进，但其毒/燃 `dot-tick` 必须带 `suppressed:true`，下游不得扣除持续伤害；存活单位为 `suppressed:false`。
2. **阶段②到期/解除/截止**：`endAt == t` 的状态移除（'spd' 到期立即重算该单位后续耗时）、CD 解除、救援截止、防御到期。
3. **阶段③行动资格**：重新收集 `t` 到轴且仍 active 的单位，按基础敏捷降序→稳定序升序逐一处理：眩晕者跳过（消耗眩晕、重跑一圈、不发资源、待领取点保留），首个可用者获得行动并冻结时钟。
4. 跳点推进：时钟永远停在最早事件点，不逐帧推进、不跳过任何行动点；行动冻结期（grant→endAction）虚拟时间完全静止。
5. **僵持预检**：全部参与单位 `speed<=0` 且不存在任何未到期 `'spd'` 效果，并且没有可改变行动资格的有限未来事件时，本场一次僵持结束；周期回血、永久毒/燃（`endAt:null`）和仅对已退出单位的状态 tick 都不阻止僵持。有限期毒/燃仍推进到末跳/到期，供调用方完成终局结算。
6. DoT 节拍：新施加首跳 `施加时刻+100`；同源（目标+施术者+技能+效果身份）重施保留 `nextTickAt`、仅更新强度与 `endAt=重施时刻+时长`；末跳与到期同刻时先跳后移（阶段①先于②）。

## 四、旧大回合能力映射表（S15#3，锚点按函数名定位 index.html）

| 旧入口 | 旧语义 | P03 映射 |
| --- | --- | --- |
| `startRound` 排轴 | 固定 `Act` 次数 + `effSpd-i*10` 衰减重建队列 | 10000 距离自然到轴；`actCount` 不产生机械轮次 |
| `startRound` CD 扣减 | 每大回合全员 `cooldowns--` | `applyCooldown` 绝对到期；解除在阶段②先于当刻行动 |
| `nextTurn` Buff/DoT | 按"自身首次行动"扣轮、跳伤 | `applyStatus` 独立节拍；首跳 +100、同源保节拍、末跳先于移除 |
| `nextTurn` 防御清除 | 本人下回合开始解除 | `'defend'` 状态 100 时间到期；MP/TP 恢复保持施放时一次结算（调用方） |
| `TURN_START` 再生 | 订阅行动事件回血 | `'periodic'` 每 100 时间触发，与行动次数/速度解耦 |
| `executeEnemyTurn` 充能 | 敌方回合末 +1 | `'periodic'` 每 100 时间；零速/眩晕单位照常结算（全局时钟不依赖行动） |
| 隐匿者 `startRound` +10 | 每大回合未受击累积 | `'stealth-window'` 每 100 时间窗口事件（携带 wasHit）；命中经 `markHit` 记录 |
| 每大回合一次的机会 | 大回合边界解锁 | `setOpportunityGate`：实际触发后 100 时间重新可用 |
| `TAG_HANDLERS['再动']`/风行者/隐匿者 splice | 插队完整轮次 | `grantMainPoint`：当前目标立即加点、他人待领取；不刷移动/辅助 |
| `flushPendingSummons` | 上回合召唤入轴排队 | `registerUnit{fresh:true}`：立即占位、从零跑完整圈（T03-06） |
| `tryReviveEnemy` | 致命时复活沿用当轮行动 | `reenterUnit`：从零跑圈；同刻复活后不再算当刻到轴（距离已清零） |
| 舍身救援 | 受击即时替身（无时限） | `scheduleRescue` 缺省 300 截止（S10/S14）；压线截止先于当刻行动（T03-05） |
| 蓄力 `currentDelay.remaining--` | 每首次行动减 1 | 时钟不自动推进蓄力；P07 按投入主行动点计数（P03 只提供行动点） |
| 麻痹/变种逐类状态 | 概率掷骰、叠层消耗 | P03 只负责普通期限与到期事件；逐类语义迁移归 P07，不擅自并入眩晕 |

## 五、责任边界

- P02：消费 `getVisibleTurnQueue` 渲染行动轴；不得从 DOM 反推时序。
- P06/P07：在 `onEvent` 内同步结算伤害/治疗/蓄力投点；经 `dispatchClock` 登记变速、状态、CD、再动。
- P10：救援截止事件的落人/救起判定；`reenterUnit` 从零跑圈。
- P11：续载直接复用恢复路径（`combatState.clock` 全量 JSON）；新战斗由 `emptyBattleState` 天然清零。
- 性能底线（PLAN L7）：跳点结算 + 单层映射，无逐帧循环、无外库、无人数上限；同后端中端安卓无需额外优化即可瞬时完成。
