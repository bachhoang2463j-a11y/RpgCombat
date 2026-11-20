# P01 冻结契约（2026-11-21 用户确认）

## 核心目的

把 P01 开工前必须拍板的字段、初值、存档键与迁移规则固化为唯一权威文档；本文档只记录"已确认"，不扩展 SPEC 未确认玩法。

## 具体任务

后续 `tactics/src/` 各模块与 T01-01～T01-08 测试均以本文档为字段与语义的唯一来源；与代码不一致时代码为准回改，不再新建第二份契约。

---

## 1. 三原型缺省值（新建角色）

| 原型 | 闪避 | 力量 | 总重 kg | 单次移动 m | 感知 | 占格 |
|---|---:|---:|---:|---:|---:|---|
| 标准人形 | 50 | 50 | 70 | 6 | 50 | 1×1 |
| 轻型生物 | 70 | 30 | 25 | 8 | 60 | 1×1 |
| 大型生物 | 30 | 150 | 250 | 8 | 50 | 2×2 |

- 原型只补缺失字段，绝不重设已有 HP、MP、攻击、护甲、敏捷等。
- 内部字段名：`evasion / strength / totalWeight / moveDistance / perception / footprint{width,height}`。

## 2. 独立闪避初始化与迁移

- 优先级：YAML 显式 `evasion`（含 0）→ 已有独立闪避配置/迁移值 → 首次初始化。
- 旧输入判定：无 `协议版本` 键的输入或明确旧配置适配来源 → 首次缺闪避时取**合并后、未叠 Buff 的原基础 `spd`** 一次性写入战棋独立配置；此后改敏捷不再重算。
- `协议版本: 1` 且无历史角色配置的新角色 → 用原型表闪避初值；同名历史角色不因 YAML 升级 v1 变成新人。
- 迁移幂等：重复载入不重复写；显式 40 / 显式 0 不被迁移覆盖；关闭属性持久化不能让闪避重新跟随敏捷。
- 载入编排入口 `storage.loadTacticsRoster(combatBlock, mmsHeroes)` 读取独立档、调用纯 `resolveHero`，仅在角色缺少独立闪避基准时保存 `config.evasion`；不顺带保存 HP/MP/TP、库存或本场草稿。

## 3. 独立存档命名空间（chat 作用域）

| 键 | 内容 |
|---|---|
| `rpg_tactics_roster` | `{version:1, heroes:[…]}`：角色配置、持久化开关、独立闪避基准 |
| `$rpg_tactics_state` | `{version:1, scenes:{…}, battles:{…}}`：场景物件/位置/行动进度；不得成为 HP/MP/库存第二真值 |
| `$rpg_tactics_bridge` | `{version:1, pendingId:null, lastAckId:null}`：本端发送/回执状态 |

- 不自动读取或迁移原 `rpg_combat_roster`；不覆盖原 RPG 配置。
- MMS 兼容桥仍用共享战后收件箱 `$rpg_combat_result`（载荷 `{v,id,ts,outcome,round,heroes}`，战棋结果 ID 用 `rt-` 前缀）；回执只认匹配 `pendingId`；沿用事件 `rpgcombat:battle-result` / `mms:combat-applied` 与频道 `rpg-combat-bridge`。P01 仅 mock 验证结构，不连真实 MMS。
- MMS 不检查来源；同聊天两前端并发结算的隔离留 P11 验证。

## 4. YAML 字段与空值

- 中文外层保留：`战斗数据栏 / 协议版本 / 场景ID / 战斗ID / 我方列表 / 敌方列表 / 角色 / 名字 / 原型 / 属性 / 技能 / 物品 / 持久化`。
- `属性` 支持旧标签串与规范对象；规范字段：`hp/maxHp/mp/maxMp/tp/maxTp/atk/def/spd/evasion/strength/totalWeight/moveDistance/perception/footprint/classType/isWise`。不增加第二套结构化别名。
- 新属性标签：`[闪避:N] [力量:N] [总重:N] [移动:N] [感知:N] [体型:1x1]`。
- 六范围：单体/直线/扇形/圆形/全域/爆炸。`[范围:直线;长:10;宽:1]` → `range:{type:'直线',length:10,width:1}`；参数映射 射程→castRange、长→length、宽→width、角度→angle（度）、半径→radius（米）。
- 行动成本：`[行动:主]`→`actionCost:{main:1,aux:0}`；`[行动:辅]`→`{main:0,aux:1}`；普通主动缺省主行动；不新增通用零行动主动技。
- 合法空值（必须保留，不算缺失）：`classType:null`、`fxTag:''`、`skills/items/children/bindings:[]`；数值字段 null 不凭空解释为 0。
- 非空集合沿用同名字段优先、缺字段补齐、持久化独有项补入；显式空集合表示清空，不补回旧项。
- 显式范围是唯一空间信息来源；旧 `[单体]/[群攻]` 名称不覆盖它。

## 5. 资源优先级链

- 配置字段：`YAML 显式 > 开启持久化的配置 > MMS 实际提供的相关字段 > 缺省`；`persist*` 开关只影响"缺失字段是否采用存档"，任何开关不能反转 YAML 显式优先。
- 当前 HP/MP/库存：`YAML 显式 > MMS > 初始化缺省`；不读角色配置或战术档中的实时值；TP 新建/重开缺省 0，MMS 不扩展。
- 合并守卫统一走存在性判定（own-property / 标签实际匹配），禁止裸 `||` 真假值合并；槽类型变更不继承原槽参数。

## 6. scene/battle 身份与生命周期

- `sceneId`（地图与物件变化）、`battleId`（行动轴/每场限次/战斗态）必须从输入取得；battle 按 scene 作用域寻址。
- 单位 ID 同 scene 内稳定；不用时间戳/随机数/DOM 顺序生成身份；同名配置匹配与战场单位身份分离。
- 三分支：存档已有 scene+battle → 续接（包括切走后返回，保留进度与限次）；已有 scene、首次出现 battle → 保留位置/物件变化并初始化战斗态；首次出现 scene → 建立场景与布阵。`reopenLoad` 恢复后同步更新当前身份指针，下一次同 ID 更新仍为续接。
- 关闭重开时资源重新从显式 YAML/MMS 装载，不从战术档恢复；战术档不序列化 HP/MP/库存。

## 7. 配置包

- 格式：`{format:'rpg-tactics-config', version:1, scope:'all'|'hero', heroes:[…]}`，单角色包恰好一项；角色条目 `{name, config, persist, skills, items}` 白名单生成。
- 包含：最大资源、基础属性、新属性、独立闪避、原型/体型、全部 `persist*`、三效果槽/`slotTurns*`、组 `children`、六范围、主辅成本、物品定义/绑定/用法/每场次数定义。
- 严格排除：当前 `hp/mp/tp`、库存 `count`、`usesRemaining`、护盾/Buff/冷却/蓄力/加速库存、地图/位置/行动进度、桥台账、API 密钥、DOM、函数。白名单生成，禁止黑名单删键。
- 导入：同名完整替换草稿、新人追加、文件外角色保留；先展示草稿，取消不生效，保存才持久化；保存后新 YAML 显式字段仍最高优先。

## 8. 语义布阵数据结构（仅定义，不求解）

```js
{
  regions:   [{ id, … }],
  landmarks: [{ id, regionId, … }],
  relations: [{ subject, relation, object, strength:'hard'|'soft', params }],
  groups:    [{ id, unitIds, placement }],
  overrides: [{ unitId, placement }]
}
```

个体覆盖组偏好；硬关系不能静默丢弃；精确布阵生成留 P05。

## 9. 测试底座契约

- `node tactics/tools/run-tests.cjs --stage=p01`：真实加载 `tactics/src/*.mjs`；不存在 stage/group/导出、空提取、零用例一律非零退出；`--artifact` 预留但 P01 未支持时明确非零。
- 三键整档保存（`saveTacticsKey` 读-改-写整表）为已知取舍：删除不残留，代价是**跨异步边界的两次保存必须串行**（后写者基于旧快照会覆盖前写者写入的其他键）；调用方约定在同一同步流程内完成保存。
- Mock：三作用域分桶 + message 按楼层隔离；`replaceVariables` 真删键整表替换；`insertOrAssignVariables` 递归深合并（数组/原子整体替换）；`generateRaw`/`generate` 双计数且必须为 0。
- 传输通道：测试宿主用实际 `String.prototype.replace(findRegex, replaceString)`（replacement 字符串，非函数），经传输层 `$` 加倍（契约 B）+ 围栏/实体处理后还原挂载，样本覆盖 `$1/$&/$$`、实体、反引号。
- 本通道是测试底座，不冒充 P12 发布打包器；P00 原生视口补验仍待完成。

---

**目的 vs 现状**：契约已冻结，业务尚未实现。
