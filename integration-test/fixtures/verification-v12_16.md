# v12.16 编辑器数据隔离修复验收

日期：2026-11-17。

## 核心目的

彻底分离编辑器草稿与实时战局数据，消除"载入前打开设置 → 载入战斗 → 首回合 `updateActiveHeroDisplay` 访问无 DOM 副本抛 `undefined.classList`"的根因；保留开场基线、保存后完整重置与既有持久化规则。诊断依据：`integration-test/fixtures/diagnosis-runtime-20261117.md`（真实酒馆堆栈 + 内存证据）。

## 用户定版决策

1. 准备页与战斗中统一独立草稿：配置编辑仅在保存时生效，取消全部丢弃（修正准备页增删提前生效的旧行为）。
2. 战斗正式载入、成功收到新 YAML、执行重置时，关闭编辑器并丢弃旧草稿，不让旧表单覆盖新战局。
3. 即时生效的氛围/环境音控制保持原规则。

## 实现范围（index.html）

- 独立草稿 `editorDraftHeroes/editorDraftEnemies` + 访问器 `edHeroes()/edEnemies()`；共享剥 DOM 克隆 `_cloneRosterArray`；`freezeInitialCaches(heroes, enemies)` 带默认参（开场/载入链无参路径不变）。
- `openEditor`：战斗中以本场基线建草稿、准备页以实时阵容建草稿；重渲染复用草稿；实时数组全程不被交换。
- 编辑器全部读写入口迁移：表单渲染、`syncEditorDataToMemory`、角色/技能/物品/绑定增删、变体组与子用法增删折叠、`toggleCharFold/toggleSkillFold/toggleItemFold/toggleAllEntitySkills`、头部/子技能摘要、`updateEnemyHeaderSummary`。`syncSkillGroupFromChildren` 保持显式实参（载入链共用）。
- `saveEditor`：捕获草稿 → `persistHeroesRoster(草稿)` → 草稿归一化/职业收敛 → `freezeInitialCaches(草稿)` → `closeEditor` → `runResetPipeline`（作废旧令牌、重建实时数组与 DOM、冻结层原样）。`serializeHeroesForSave(heroes = heroesData)`、`persistHeroesRoster(heroes = heroesData)` 带默认参，无参调用兼容（summon-roster 等直存路径不受影响）。
- `closeEditor`：仅关面板 + `closeSkillTypeCombo()` 清浮层 + 丢草稿；删除"恢复旧实时数组"逻辑。
- 草稿失效边界：`startGame()` 开战前、`buildCombatDataFromYAML()` 成功尾部、`runResetPipeline()` 重建入口。

## 测试改动

- 新增 harness 第 63 组 + 夹具 `fixtures/editor-live-isolation-regression.js`（10 场景：引用恒等、取消丢弃、增删不提前生效、战斗中 DOM/队列恒等、原始故障点 `updateActiveHeroDisplay` 复现、开窗消耗不回滚、保存交接/幂等二次保存、新 YAML 失效、重置失效、载入后首回合正常）。顶层名产物不被 mangle，组 63 在源码与压缩产物上均可运行。
- 适配旧实现耦合：`opening-roster-regression.js`（草稿快照/恢复、`persistHeroesRoster(editorDraftHeroes)` 显式传参）、`item-fx-editor-regression.js`（草稿快照/清场/恢复）、`variant-grant-regression.js`（快照/清场/表单写回断言目标改草稿/防跨组残留）、harness test20（源码仿真注入 `edHeroes/edEnemies` 访问器，保留守卫与对照组）。
- 新增产物专项 `editor-live-isolation-artifact-check.cjs`；harness 维护包路径更新 v12.15 → v12.16。
- 打包：v12.15 → v12.16（git mv），`scriptName` 同步 `前端战斗v12.16`，正则 ID 保持 `98df0348-59ec-4ab9-a750-d5e2e3eb9b8b`，源码 2181256 → 产物 1512534 字符（-31%）。

## 验证结果（如实记录）

| 阶段 | 结果 |
| --- | --- |
| 源码内联脚本语法（逐块 new Function） | 2/2 通过；旧 `editorLive*` 变量清零 |
| 相关组回归（源码 20/29/30/37/39/41/43/50/60/61/63） | 469/0 |
| 唯一一次源码全量回归（IAB，63 组） | **3463/0**（首轮等待中读到旧实例残留结果 469，另一次宿主回退旧 URL 重跑相关组；最终以真实 URL + 64 个组头核对为全量） |
| 产物行为回归（压缩包 v12.16 上 63/43/50） | 63/0（source 确认为 regex-前端战斗v12_16.json） |
| 产物静态专项 editor-live-isolation | 50/0（首轮 39/11，11 处失败均为断言对产物空白/引号/mangle 格式敏感，改空白无关正则后全绿） |
| 既有产物专项抽查 battle-atmosphere / variant-grant / skill-items | 68/0、23/0、143/0 |
| 真实酒馆原始故障路径 | **待用户导入 v12.16 后验证**（刷新、载入、开设置、保存由用户操作），未验证不宣称通过 |

### 交付前复核修正（2026-11-17 简易审核后，仅测试侧，生产 index.html 零改动）

1. **产物专项假绿修正**：原"编辑器区间无实时数组直读/直改"断言在压缩产物上因起点标记 `'const edHeroes ='`（带空格）indexOf 为 -1、slice 截到空字符串而恒真。修正为无空格前缀定位 + 起点/终点/长度哨兵（片段 <10000 字符即 FAIL），修正后产物侧片段真实有效，专项 52/0。假绿期间 50/0 的产物静态结论作废，以 52/0 为准。
2. **夹具覆盖补强**（editor-live-isolation-regression.js，25→54 断言）：新增场景四B（敌方 AI 实际行动链进行中开关编辑器：伤害实际落在实时实体、链无 rejection、战场节点有效）、场景四C（开窗期间召唤增量入队：守卫跳过无表单召唤物、取消后召唤保留且 DOM 连接）、场景六改造（原为直设 isGameStarted 绕过开战入口，改为真实 `startGame()` 完整路径：载入前开设置→新YAML→开战→首回合显示全程无 classList rejection、队列引用实时实体）。
3. 复跑结果：源码组 63 **54/0**；压缩产物组 63 **54/0**（source=v12_16）；相关组子集 20/43/50/63 **87/0**。期间本地回归服务曾终止（HTTP 000）与 IAB 页面置空一次，重启服务重载后完成，未把失败环境计入通过。生产代码零改动，未重跑全量（协定允许）。

## 边界与如实说明

- IAB 宿主存在"新标签页地址回退旧 URL"与"页面重置回挂载阶段"现象（既往记录一致），本次以真实 location、source 字段与组头计数核对，未把未运行分组计为通过。
- 全量运行中两次读到相关组数字（469）为旧实例/回退实例结果，最终全量以 3463/0 与 64 个组头（63 组 + 汇总行）核实。
- 未跑产物全量（按协定仅跑本轮相关产物回归）；未改 README/SPEC/公开版；扫射黑块/频闪（故障①）不在本轮范围。
