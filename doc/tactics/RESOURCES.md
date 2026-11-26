# 战棋资源清单与复用边界

## 核心目的

尽可能复用已经存在的代码、算法、资源和测试方法，把工作投入集中在新的空间契约、跑圈、语义布阵和AI整合上，不再重建一套音频、编辑器或酒馆环境。

## 具体任务

- 为 [PLAN.md](PLAN.md) 每阶段提供可点击出处和本地源码锚点。
- 下表的行号以 2026-11-21 静态核对的 `index.html`（31,428 行）与 `D:/Project/MiniMapStatus/MiniMapStatus.html`（18,481 行）为基准；实际实施按函数名定位，新增代码后不能只沿用旧行号。
- “已有”不等于“战棋已可用”。特别区分逻辑可直接复用、需要换空间／计时／预测语义、只可参考。
- 原工作树有未提交删除和临时文件，本轮不恢复、删除或打包这些内容。这里只列已经确认存在的本地资源，不把根目录已删除的旧 demo 作为可打开模板。
- 统计口径说明：不再使用未经逐行去重的“85%无需重写”估算；统一界定为**大量解析、数值、状态、编辑器与表现资产可复用，但须在逐槽空间目标、连续时钟、独立闪避、场地结界、相机动态重投影、表现静默与 AI 只读预测处完成结构化适配**。

## R01—R13：本地与跨项目现有资源

| ID | 路径与定位 | 可复用内容 | 必须改造或禁止照搬 |
| --- | --- | --- | --- |
| R01 | [index.html](../../index.html)：`parseSkill` L18643、`parseItem` L18818、`parseSkillList` L18967、`parseItemList` L19017、`getHeroItemBindings`／`consumeAmmoForShot` L19082—19174、`buildCombatDataFromYAML` L19300 | 标签归一化、三效果槽、槽位级轮数 `slotTurns`、嵌套变体组 `children`、物品绑定与按发扣弹药、`_explicit` 显式字段与 `statSource` 追踪 | 增加独立 `[范围:类型;参数]`、主辅成本、独立 `[闪避]`／力量／总重／移动／感知／体型及三原型缺省值；不得用旧单群名称盖掉显式范围；替换 `assignEnemyRows` 前后排分配为语义布阵入口 |
| R02 | [index.html](../../index.html)：`getEffectiveSpeed` L21461、`startRound` L25238、`nextTurn` L25294、`endTurn` L25501、`renderTurnQueue` L20550 | `getEffectiveSpeed`（基础敏捷＋`spd` 类 Buff）、`combatToken` 异步代际取消、左侧行动轴 DOM 槽位与变速角标动效 | `startRound` 按固定 `Act` 和速度衰减重建全体队列必须彻底替换；旧 Buff 首行动扣轮和 CD 大回合扣减不得照搬；仅技能雾等明确遮蔽按既有规则过滤，开局不因普通感知隐藏轴项 |
| R03 | [index.html](../../index.html)：`TAG_HANDLERS` L21117（共 27 个注册键）、`CLASS_PASSIVES` L21593（8 职业）、`CombatEvents` L22024、`getEffectiveStats` L22956、`calculateDamage` L22998、`computeSegmentRawDamage` L23018、`wouldSegmentClearHp` L23032、`applyEnemyTypeResist` L23062、`runReactionIntercept` L23176、`prepareSingleAttackHit` L23553、`applySingleTagEffect` L23677、`executeSkillAction` L24517 | 25 个操作面板或 `buffs[]` 的数值／状态标签处理器、伤害与属性抗性核心公式、暴击与极限爆发倍率、二次反应闪避（L23220 只读新增闪避 Buff）、弹药按发消耗（L24958）、召唤／制服豁免过滤（L24805—24807） | ① `TAG_HANDLERS` 中 `肃正`（L21365）与 `再动`（L21422）2 个注册键及风行者（L21742）／隐匿者（L21792）的 `actionQueue.splice` 必须替换为场地结界与主行动点；② `executeSkillAction` L24738—24803 在循环内逐槽重算 `targets`，不能用单数组覆盖，须接入 `spatialCtx.resolveSlotTargets` 按槽位敌我／自身语义分流，并改写 `[转火]`（L24785）为空间合法目标重选；③ `prepareSingleAttackHit` L23580 改读独立 `target.evasion`、移除 L23573 后排掩护扣远程命中，保留征伐者 `modifyDodgeCap`（L21976）明确有效速度差加成；④ 反应／看破／舍身收集器须增加技能距离、本人视线与实墙阻挡检查 |
| R04 | [index.html](../../index.html)：`selectEnemySkillAndTarget` L25838、`executeSummonTurn` L25943、`executeEnemyTurn` L26022 | 治疗／增益／减益防重复／赋予变种去重／大招与斩杀的上下文评分权重、敌友通用决策骨架 | ① 已开战单位可作为候选；技能雾遮蔽时不能读取隐藏目标的实时位置，集火只保留最后目击点；② `calculateDamage`（L23007）会原地扣 `target.shield`、`applySingleTagEffect`（L23732）会消耗一次性 `[免伤]`，`wouldSegmentClearHp`（L23034—23038）仍读旧 `teamBarrier` 并按 `tag.includes('群')` 判 AoE 抗性；必须组装**适配新空间规则的只读预测器**（在预测副本上连续更新多段护盾／免伤，按显式空间范围判 AoE 抗性与场地结界拦截），不能直接调旧 `wouldSegmentClearHp` 或回滚整条异步 `executeSkillAction` |
| R05 | [index.html](../../index.html)：`serializeHeroesForSave` L29234、`readStatusBarSnapshot` L29476、`applyStatusBarRoster` L29517、`applyPersistedRoster` L29793、`_gapFillSkill` L29745 | 技能字段级补齐 `_gapFillSkill`、组父与组子 `\u0000` 独立命名空间、MMS 状态栏快照解析 | **必须修复两处违反“YAML 显式字段最高优先”的旧实现**：① `applyPersistedRoster` L29815—29821 中 `maxHp/maxMp/maxTp/actCount` 无条件覆盖 YAML，且 `persistAtk/Def/Spd` 开启时强制覆盖 YAML 显式属性；② `applyStatusBarRoster` L29526—29534 从 MMS 读 `hp/maxHp/mp/maxMp/armor` 及物品 `count` 时未检查 `statSource`／`_explicit` 直接覆盖 YAML。战棋版须统一守卫显式字段（含显式 `0`/`false`），并使用独立存档键与原 RPG 隔离 |
| R06 | [index.html](../../index.html)：`buildCombatResultPayload` L29299、`exportCombatResultToStatus` L29347、`handleCombatApplied` L29378、`COMBAT_*` L29290 | 战后真值 `$rpg_combat_result`、事件 `rpgcombat:battle-result`、`BroadcastChannel('rpg-combat-bridge')` 及回执 `mms:combat-applied` | 经核对 MMS 接收端（见 R13），MMS 不限制来源前端脚本名；战棋版保持 `{ v, id, ts, outcome, round, heroes }` 载荷结构即可直连，无需修改 MMS 源码；须将主角团“倒地未死”正确映射至结算载荷，并完成单写者、幂等与同聊天共存回归；仍仅战后同步 |
| R07 | [index.html](../../index.html)：`saveEditor` L28947、`runResetPipeline` L27458、`resetBattle` L27511、`freezeInitialCaches`、`editorDraft*`、`_serializeSkillForRoster` L29223、`serializeHeroesForSave` L29234 | 编辑器草稿与实时战局隔离、保存后重置交接、开场基线冻结、技能与变体组序列化母版 | 原 `serializeHeroesForSave` L29254 含运行时 `count`，导出全体／单角色配置包 JSON 时必须剔除实时 HP/MP/TP、库存 `count`、地图存档与 API 密钥，补齐六范围、主辅成本、独立闪避、力量、总重、移动、感知、体型与持久化开关；导入同名完整替换草稿、新人追加，保存后 YAML 显式字段仍最高优先 |
| R08 | [技能SVG模板使用与快速移植.md](../../技能SVG模板使用与快速移植.md)、[demo-skill-vfx-template.html](../../demo-skill-vfx-template.html)；[index.html](../../index.html) `arcaneVfxModule` L5729、`mkAnchor` L5792、`getEntitySpriteDom` L20720、`spawnCanvasParticles` | 矢量与 Canvas 粒子演出宿主、弹道、命中／闪避／屏障破碎（`triggerBarrierShatter`）反馈、令牌守卫定时 `after/every` | **`mkAnchor` L5792 将屏幕像素写入 `position:fixed`**：仅在创建瞬间传一次 `worldToScreen` 不足以应对播放中途的相机移动；必须**补充动态重投影或统一变换容器等等效机制**，验证特效播放中相机平移、缩放及镜头跟随的一致性，不靠禁用镜头行为省掉验收 |
| R09 | [index.html](../../index.html)：`CombatAudioMixer` L4426、`playSound` L5290、`CombatAudioDirector`；[webm_effects_index.md](../../webm_effects_index.md)／[webm_effects_index.json](../../webm_effects_index.json) | 三轨混音、结果音、多目标波次聚合 `beginWave/closeWave`、现有 WebM 索引与技能真音 | 技能雾的表现过滤：对雾遮蔽下的盲投命中或隐藏行动，必须通过统一可见性过滤器屏蔽未知处受击浮字、隐藏坐标特效、泄露真实身份／HP 的战报及传给 LLM 旁白的入参 |
| R10 | [integration-test/harness.html](../../integration-test/harness.html) L54—68、L69起MOCK、L185以后挂载；[tactics-p00-harness.html](../../integration-test/tactics-p00-harness.html)；[verify-audit-fixes.cjs](../../integration-test/fixtures/verify-audit-fixes.cjs) | 真实 HTML/正则加载、message/chat/global 作用域、深合并与替换差异、LLM 调用计数、真实函数提取 | `tactics-p00-harness.html` L106—120 仅测了围栏与 HTML 实体解码后写入 `srcdoc`，**未模拟酒馆正则 `String.prototype.replace(findRegex, replaceString)` 对 `$1`/`$&`/`$$` 的捕获组替换行为**；正式 `tactics-harness.html` 必须补齐真实 `String.replace` 替换链往返测试 |
| R11 | [verify-summon-roster.cjs](../../integration-test/fixtures/verify-summon-roster.cjs)、[verify-shop-catalog.cjs](../../integration-test/fixtures/verify-shop-catalog.cjs)、[editor-live-isolation-regression.js](../../integration-test/fixtures/editor-live-isolation-regression.js)、[combat-audio-regression.js](../../integration-test/fixtures/combat-audio-regression.js)、[audio-mixer-regression.js](../../integration-test/fixtures/audio-mixer-regression.js) | 召唤敌友路由、商店受管奇物购买／售出不复活、编辑副本隔离、音效与混音等回归结构 | 原时间轴或前后排 DOM 假设应明确适配；提取真实源码函数测试必须有起终哨兵，空片段／不存在函数／零测试不能算通过 |
| R12 | [build-regex.cjs](../../build-regex.cjs) L1—123、[build-tailwind.cjs](../../build-tailwind.cjs)、[tactics/p00-probe/build.mjs](../../tactics/p00-probe/build.mjs)、[tactics/p00-probe/check-artifact.mjs](../../tactics/p00-probe/check-artifact.mjs) | 压缩、全量 `& → &amp;` 实体免疫、围栏反引号加固、产物语法与许可证保留 | **严禁顺手修改根 `build-regex.cjs` 影响原版 RPG**。本轮离线实测 `tactics/p00-probe/probe.html` 含 26 处 `/\$[$&`'\d<]/`（如 Phaser `RegExp.$1`）。“源码/产物禁止 `$` 替换序列（根 `build-regex.cjs` L90 契约 A）”与“传输层将 `$` 加倍为 `$$` 后验证单次 `String.replace`＋实体还原字节一致（契约 B，加倍后仍会触发契约 A 哨兵）”是两种不同构建契约；独立战棋打包器 `tactics/tools/build-regex.cjs` 须明确所选契约、处理顺序与往返断言 |
| R13 | [D:/Project/MiniMapStatus/MiniMapStatus.html](../../../MiniMapStatus/MiniMapStatus.html)：`MMSImages.resolveAvatar` L4397—4416、`MMS_MINI_GROUND_TYPES` L4999（10种材质）、`MMS_MINI_FEATURE_TYPES` L5016（24类图元）、`mmsMiniPal` L5027、`MMS_MINI_PATTERN_DEFS` L5037、`mmsMapArtFeature` L5084—5365、`mmsRenderMapArt(json, style, 'mini')` L5390—5648、`TacticalMapEngine` L5653—5850、`loadCombatResult`／`applyCombatResult` L12416—12560；[demo-bigmap.html](../../../MiniMapStatus/demo-bigmap.html) `zoomAt`/拖拽 L788—823 | ① 10 种近景地面材质（`wood/brick/tile/street/marble/rubber/grass/snow/sand/rock`）＋地毯／土路＋局部暖冷光晕 `<defs>`；② 24 类近景图元（室内 12＋野外 6＋现代 3＋院落 3，支持 `fam:'wood'\|'mod'`、`size`、`rot`），直接覆盖**古典石造、自然野外、街巷庭院**三题材底图素材；③ `1000×1000` 正交俯视 SVG 渲染管线与指针缩放平移逻辑；④ 跨 iframe 权威头像解析 `MMSImages.resolveAvatar`；⑤ 战后结算单写者、幂等 `lastId` 与回执接收端 | ① **区分题材素材与视觉 style**：`flat/parchment` 是两种渲染风格，不是三个地图主题；图元素材复用收益只计入 P02，不在 P05 重复扣减；② **SVG 渲染器不含战棋规则网格**：`mmsMapArtFeature` 不提供通行、挡弹、遮视、低障碍、门开关或多格占地属性，也不含房间连通生成与剧情软硬约束求解——必须由战棋**统一权威场景数据**同时派生米格属性表与 `mmsRenderMapArt` 视觉 JSON，不从 SVG 反推碰撞；③ `demo-bigmap` 需补充公开 `screenToWorld(px,py)`、米格映射及拖拽与点选的手势阈值分离；④ `MMSImages` 需提供 MMS 未挂载时的默认头像回退；上述适配均在战棋侧包装实现，不修改 MMS 仓库文件 |

### 运行入口注意

- [run-tests.cjs](../../run-tests.cjs) 当前默认面向归档公开版，菜单还显示旧621断言，不能拿它推断现在的测试数量或作为战棋全量入口。
- [run-harness.cjs](../../run-harness.cjs) 使用固定8124且调用系统 `start` 打开外部浏览器；代理不直接运行它来启动用户浏览器。复用静态HTTP服务思路，用无自动开浏览器的测试服务＋IAB。
- harness默认端口策略沿用8123，占用时在8124—8129中选实际空闲者；报告真实URL，不假设端口服务就是本项目。
- 酒馆接口文档：[D:/Project/酒馆助手_TavernHelper_完整开发文档.md](../../../酒馆助手_TavernHelper_完整开发文档.md)。开发前按实际使用接口读取相关章节。

## E01—E09：外部模块与算法

核对日期：2026-11-21（含 [P00-REPORT.md](obsolete_documents/P00-REPORT.md) `ca38c2b` 隔离探针结论与第二轮定向复核）。正式开发路线推荐**优先采用 R13 MMS 语义底图（`mmsRenderMapArt('mini')`）＋原生 Canvas 2D／DOM＋统一格网几何（可按需单引 ROT 纯算法子模块）**；不以“外库绝对无法入包”为理由，而是基于体积（Phaser 探针单包约 1.23MB，含未用物理模块）、八向 `1+√2` 成本、多格占地与单一几何源的工程收益做收敛。

| ID | 官方出处／算法入口 | 已知能力与许可 | 本项目使用边界 |
| --- | --- | --- | --- |
| E01 | [Phaser仓库](https://github.com/phaserjs/phaser)、[相机文档](https://docs.phaser.io/phaser/concepts/cameras)、[几何文档](https://docs.phaser.io/phaser/concepts/geometry) | MIT；已在 `tactics/p00-probe` 核实 `3.90.0`（上游 latest 已为 `4.2.1`） | P00 隔离承载探针（`ca38c2b`）已用 Phaser 3.90 Canvas 完成双尺寸 iframe 验证；但 `probe.html` 达 1.23MB 且含 26 处 `$1`/`$&` 序列（需传输层 `$` 转义或改走原生）。正式路线推荐用 R13 SVG 底图＋原生 Canvas 2D 替代 Phaser 表现壳 |
| E02 | [ROT.js仓库](https://github.com/ondras/rot.js)、[API](https://ondras.github.io/rot.js/doc/)、[Digger源码](https://github.com/ondras/rot.js/blob/master/src/map/digger.ts)、[地图模块](https://github.com/ondras/rot.js/tree/master/src/map)、[寻路模块](https://github.com/ondras/rot.js/tree/master/src/path)、[FOV模块](https://github.com/ondras/rot.js/tree/master/src/fov)、[RNG](https://github.com/ondras/rot.js/blob/master/src/rng.ts) | BSD-3-Clause；已在 `tactics/p00-probe` 核实 `rot-js@2.2.1` | `PreciseShadowcasting`（八邻接格网 FOV）与可复现 RNG 可按需保留或对照；原生 `AStar` 为等步成本（`g=prev.g+1`），不满足 `1+√2` 八向几何成本、两实障夹角禁穿与 2×2 多格占地，P04 须用自定义多格加权寻路替代。Digger/Uniform 默认 `timeLimit=1000ms` 不作为本项目规则上限 |
| E03 | [Rex仓库](https://github.com/rexrainbow/phaser3-rex-notes)、[Board](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board/)、[Pathfinder](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board-pathfinder/)、[Field of view](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board-fieldofview/)、[Shape](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board-shape/) | MIT；核实 `phaser3-rex-plugins@1.80.20` 与 `phaser4-rex-plugins@4.2.0` 分叉 | 仅作概念参考，**不安装**。当前官方文档默认指向 Phaser 4 包，且单格 Board 不直接解决 2×2 单位、六种范围与场地结界 |
| E04 | [phaser-raycaster仓库](https://github.com/wiserim/phaser-raycaster)、[Ray API](https://wiserim.github.io/phaser-raycaster/Raycaster.Ray.html)、[LICENSE](https://github.com/wiserim/phaser-raycaster/blob/master/LICENSE) | `0.11.1` npm/package.json 标 ISC，仓库 LICENSE 正文为 MIT（元数据不一致） | **不安装**。许可元数据不一致，且连续多边形射线易与格网障碍形成双重几何偏差；统一采用格网视线／扇形裁剪 |
| E05 | [EasyStar.js](https://github.com/prettymuchbryce/easystarjs)、[README](https://github.com/prettymuchbryce/easystarjs/blob/master/README.md) | MIT；二维 A*、对角移动 | **不安装**。不同时维护多套寻路器；P04 直接实现带 `footprint(1×1/2×2)` 与夹角约束的统一格网寻路 |
| E06 | [Yuka](https://github.com/Mugen87/yuka)、[README](https://github.com/Mugen87/yuka/blob/master/README.md)、[Docs](https://mugen87.github.io/yuka/docs/)、[示例](https://mugen87.github.io/yuka/examples/) | MIT；目标／状态驱动、视觉、记忆、steering | **不安装运行时库**。完全回合制不引入实时 steering 循环；仅参考 Goal/Memory 分层思想，P09 基于 R04 权重与只读预测器实现回合制评分 |
| E07 | [semibran/tactics](https://github.com/semibran/tactics)、[range.js](https://github.com/semibran/tactics/blob/master/lib/range.js)、[pathfind.js](https://github.com/semibran/tactics/blob/master/lib/pathfind.js)、[ai.js](https://github.com/semibran/tactics/blob/master/lib/ai.js) | MIT；轻量格网范围、寻路、AI（2018-11-21） | 规则原型参考，不作为运行依赖，不照搬其双方大回合 phase |
| E08 | [pongstylin/tactics](https://github.com/pongstylin/tactics)、[Board.js](https://github.com/pongstylin/tactics/blob/master/src/tactics/Board.js)、[GameState.js](https://github.com/pongstylin/tactics/blob/master/src/tactics/GameState.js)、[Bot.js](https://github.com/pongstylin/tactics/blob/master/src/tactics/Bot.js) | src 为 Unlicense；BFS 可达范围、A*、方向、棋盘交互 | 仅参考分层与交互，不套等距棋盘和服务器；原作图像／音频无开放许可，绝不使用 |
| E09 | [Athena Crisis](https://github.com/nkzw-tech/athena-crisis)、[地图athena](https://github.com/nkzw-tech/athena-crisis/tree/main/athena)、[状态apollo](https://github.com/nkzw-tech/athena-crisis/tree/main/apollo)、[AI dionysus](https://github.com/nkzw-tech/athena-crisis/tree/main/dionysus)、[DionysusAlpha](https://github.com/nkzw-tech/athena-crisis/blob/main/dionysus/DionysusAlpha.tsx) | MIT 代码；地图／行动／AI 分层 | 仅参考行动枚举与评分结构，不引入其完整代码库、后端或非开放美术 |

### 已调查但不是推荐底座

- [AncientBeast](https://github.com/FreezingMoon/AncientBeast)：六角格生物战棋，代码 AGPL-3.0，艺术／音频 CC-BY-SA-4.0；与隐藏方格目标及许可边界不符。
- [sviridoff/tactical-rpg](https://github.com/sviridoff/tactical-rpg)：旧 React/Redux/TS 火纹原型，未见独立许可证文件，仅作流程参考。
- [Custom Wars Tactics](https://github.com/ctomni231/cwtactics)：MPL-2.0、战争兵种方向，不覆盖本项目感知、语义布阵与技能契约。

## 按阶段选用原则

1. **P00 历史与补验边界**：保留已提交的 `tactics/p00-probe`（`ca38c2b`）作为隔离承载与许可核查证据；正式战棋工程转向 **R13 `mmsRenderMapArt('mini')` 底图＋原生 Canvas 2D／DOM＋统一纯 JS 格网**，并在 P00 收尾补齐真实酒馆正则 `String.replace` 的 `$` 替换序列往返测试与原生视口坐标验证。
2. **单一权威几何**：通行／体型、八种范围／爆炸接触点、技能雾遮蔽、AI 候选与场地结界共用同一套格网与世界坐标查询，表现层不建第二套遮挡或命中判定器。
3. **地图数据双输出（不重复计费）**：P02 一次性计入 R13 既有 10 种材质、24 类图元与缩放视口的复用收益；P05 专注于由单一权威场景数据同时输出米格规则表与 `mmsRenderMapArt` 视觉 JSON，并解决三主题下的三档单房间种子生成及合法布阵。
4. **表现静默与预测隔离分置**：技能雾通过可见性过滤器拦截遮蔽信息的披露；AI 通过适配新空间规则的只读预测器在副本上评估多段护盾／免伤、显式范围 AoE 抗性与场地结界，不调用异步 `executeSkillAction`。
5. **不越界修改外部项目**：默认不修改 `MiniMapStatus` 源码或根目录原版 `build-regex.cjs`；所有新契约在独立 `tactics/` 与 `integration-test/tactics-*` 内实现并验证。
