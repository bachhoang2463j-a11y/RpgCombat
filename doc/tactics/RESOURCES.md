# 战棋资源清单与复用边界

## 核心目的

尽可能复用已经存在的代码、算法、资源和测试方法，把工作投入集中在新的空间契约、跑圈、语义布阵和AI整合上，不再重建一套音频、编辑器或酒馆环境。

## 具体任务

- 为 [PLAN.md](PLAN.md) 每阶段提供可点击出处和本地源码锚点。
- 下表的行号以2026-11-20读取的 `index.html` 为参考；实际实施按函数名定位，新增代码后不能只沿用旧行号。
- “已有”不等于“战棋已可用”。特别区分逻辑可复用、需要换空间／计时语义、只可参考。
- 原工作树有未提交删除和临时文件，本轮不恢复、删除或打包这些内容。这里只列已经确认存在的本地资源，不把根目录已删除的旧demo作为可打开模板。

## R01—R12：本地资源

| ID | 路径与定位 | 可复用内容 | 必须改造或禁止照搬 |
| --- | --- | --- | --- |
| R01 | [index.html](../../index.html)：`parseSkill` L18643、`parseItem`、`parseSkillList` L18967、`buildCombatDataFromYAML` L19300 | 标签归一化、槽位、子技能组、技能和物品装配、显式字段跟踪 | 增加独立范围及主辅成本；不得用旧单群效果名盖掉显式范围；现有字符串不是完整战棋协议 |
| R02 | index.html：`getEffectiveSpeed` L21461、`startRound` L25238、`nextTurn` L25294、`endTurn` L25501、`renderTurnQueue` L20550 | 有效速度、生命周期、行动轴UI、异步代际取消思路 | `startRound`按Act和速度衰减重建全体队列必须替换；旧Buff首行动扣轮和CD大回合扣减不得照搬 |
| R03 | index.html：`TAG_HANDLERS` L21117、`CLASS_PASSIVES` L21593、`CombatEvents` L22024、`calculateDamage` L22998、`executeSkillAction` L24517、`classifySkill` L26371；命闪防御侧 `target.spd` L23580 | 数值效果、职业钩子、事件、命闪／护甲／护盾／反应链、技能分类 | 接收新的合法空间目标；命闪基础改读独立闪避，旧数据仅首次从基础敏捷迁移，审计`modifyDodgeCap`职业钩子；分离规则提交与DOM，替换旧全队索敌、前后排、全队伪屏障 |
| R04 | index.html：`selectEnemySkillAndTarget` L25838、`executeSummonTurn` L25943、`executeEnemyTurn` L26022 | 治疗／增益／减益／攻击的上下文评分、敌友通用AI入口 | 当前候选默认直接看全体存活名单，不能交给新AI作为真实情报；需增加移动候选与空间收益，不逐技能名硬编码 |
| R05 | index.html：`serializeHeroesForSave` L29234、`applyPersistedRoster` L29793、`readStatusBarSnapshot` L29476、`applyStatusBarRoster` L29517 | 技能与物品配置持久化、角色匹配、MMS读取、显式值补齐模式 | 旧部分持久化开关和MMS直覆YAML与新最高优先规则冲突；HP/MP/库存不偷偷加入新长期资源档 |
| R06 | index.html：`buildCombatResultPayload` L29299、`exportCombatResultToStatus` L29347、`handleCombatApplied` L29378、`COMBAT_*` L29290 | 战后真值、事件通知、BroadcastChannel及结果回执／幂等ID | 独立战棋来源需要验证MMS能接受；原结果字段不是任意扩展都自动兼容；只战后同步，不改成每行动调用 |
| R07 | index.html：`saveEditor` L28947、`runResetPipeline` L27458、`resetBattle` L27511、`freezeInitialCaches`、`editorDraft*`、`serializeHeroesForSave` L29234、`_serializeSkillForRoster` L29223 | 草稿和实时战局隔离、合法保存交接、开场基线、配置序列化和旧回调失效；可作为全体／单角色配置包母版 | 原序列化含物品count等值，导出配置包需排除实时库存并补新空间／闪避字段；导入同名替换、新人追加只改草稿，保存才持久化。战棋地图实体不能被交换成编辑副本 |
| R08 | [技能SVG模板使用与快速移植.md](../../技能SVG模板使用与快速移植.md)、[demo-skill-vfx-template.html](../../demo-skill-vfx-template.html)；index.html `arcaneVfxModule`、`getEntitySpriteDom`、`spawnCanvasParticles` | 临时锚点、粒子、弹道、hit/dodge/cancel反馈、自然收尾、复用母版 | 母版只是演出宿主，不含完整战斗判定；把DOM坐标适配为世界→屏幕映射，不复制演示mock当业务；更近的真音规则优先于旧合成音建议 |
| R09 | index.html：`CombatAudioMixer` L4426、`playSound` L5290、`CombatAudioDirector`；[webm_effects_index.md](../../webm_effects_index.md)／[webm_effects_index.json](../../webm_effects_index.json) | 三轨混音、结果音、资源登记、现有WebM索引与技能真音 | 音效由真实结算事件驱动，隐藏目标音画不能泄露；音频资源基址不等于随单HTML内嵌全部素材；不在本轮上传或搬运整库 |
| R10 | [integration-test/harness.html](../../integration-test/harness.html) L54—68、L69起MOCK、L185以后挂载；[verify-audit-fixes.cjs](../../integration-test/fixtures/verify-audit-fixes.cjs) | 真实HTML/正则加载、message/chat/global作用域、深合并与替换差异、事件和LLM计数、真实函数提取、按stage测试 | 旧harness只认识原源码／v12.16包；新增独立战棋harness和stage runner。不能把复制的玩法实现塞进mock以证明自己正确；不能把旧断言全量直接视为新规格通过 |
| R11 | [verify-summon-roster.cjs](../../integration-test/fixtures/verify-summon-roster.cjs)、[verify-shop-catalog.cjs](../../integration-test/fixtures/verify-shop-catalog.cjs)、[editor-live-isolation-regression.js](../../integration-test/fixtures/editor-live-isolation-regression.js)、[combat-audio-regression.js](../../integration-test/fixtures/combat-audio-regression.js)、[audio-mixer-regression.js](../../integration-test/fixtures/audio-mixer-regression.js) | 召唤敌友路由、购买／售出不复活、编辑副本隔离、音效与混音等回归结构 | 原时间轴或DOM假设应明确适配。提取函数必须有起终哨兵，空片段／不存在函数／零测试不能“通过” |
| R12 | [build-regex.cjs](../../build-regex.cjs)、[build-tailwind.cjs](../../build-tailwind.cjs)、[editor-live-isolation-artifact-check.cjs](../../integration-test/editor-live-isolation-artifact-check.cjs) | 压缩、实体免疫、围栏加固、捕获组替换免疫、产物语法、结构哨兵 | 根打包器硬指向原index和原正则包。未来在tactics内建立独立目标，不能直接运行根打包器覆盖原版；`monsterAttack`三处、特定两脚本等仅原版专项，战棋若资产结构不同应制定对应契约，不能改原版计数 |

### 运行入口注意

- [run-tests.cjs](../../run-tests.cjs) 当前默认面向归档公开版，菜单还显示旧621断言，不能拿它推断现在的测试数量或作为战棋全量入口。
- [run-harness.cjs](../../run-harness.cjs) 使用固定8124且调用系统 `start` 打开外部浏览器；代理不直接运行它来启动用户浏览器。复用静态HTTP服务思路，用无自动开浏览器的测试服务＋IAB。
- harness默认端口策略沿用8123，占用时在8124—8129中选实际空闲者；报告真实URL，不假设端口服务就是本项目。
- 酒馆接口文档：[D:/Project/酒馆助手_TavernHelper_完整开发文档.md](../../../酒馆助手_TavernHelper_完整开发文档.md)。开发前按实际使用接口读取相关章节。

## E01—E09：外部模块与算法

核对日期：2026-11-20。以下是候选资源，不代表已安装、已锁版本或通过酒馆iframe验收；P00必须冻结真实版本和许可副本。未把第三方完整游戏或素材下载进项目。

| ID | 官方出处／算法入口 | 已知能力与许可 | 本项目使用边界 |
| --- | --- | --- | --- |
| E01 | [Phaser仓库](https://github.com/phaserjs/phaser)、[相机文档](https://docs.phaser.io/phaser/concepts/cameras)、[几何文档](https://docs.phaser.io/phaser/concepts/geometry) | MIT；浏览器二维Canvas/WebGL、相机／输入／图形能力 | 候选地图表现壳，不负责回合、技能或AI；开发多模块可打包单HTML。先核验iframe缩放与部署，再决定是否引入，不整套替换现有菜单／音频 |
| E02 | [ROT.js仓库](https://github.com/ondras/rot.js)、[API](https://ondras.github.io/rot.js/doc/)、[Digger源码](https://github.com/ondras/rot.js/blob/master/src/map/digger.ts)、[地图模块](https://github.com/ondras/rot.js/tree/master/src/map)、[寻路模块](https://github.com/ondras/rot.js/tree/master/src/path)、[FOV模块](https://github.com/ondras/rot.js/tree/master/src/fov)、[RNG](https://github.com/ondras/rot.js/blob/master/src/rng.ts) | BSD-3-Clause；房间走廊、Cellular、可复现RNG、格网寻路与视野；浏览器ES模块或预构建ROT | 可用底图生成／寻路/FOV算法；不理解中文地标、队形、剧情硬关系。Digger当前源码默认生成timeLimit=1000ms，只是库默认，不能未经批准作为本项目截止规则，需P00审查或不用这一受限生成路径 |
| E03 | [Rex仓库](https://github.com/rexrainbow/phaser3-rex-notes)、[Board](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board/)、[Pathfinder](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board-pathfinder/)、[Field of view](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board-fieldofview/)、[Shape](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board-shape/) | MIT；棋盘、可达范围、移动成本、方向／FOV等插件 | 只挑所需插件。仓库当前简介Phaser4与Phaser3文档混杂，不能默认最新插件与任意Phaser版本兼容；单格示例不自动解决多格单位、自己的6种范围或场地结界 |
| E04 | [phaser-raycaster仓库](https://github.com/wiserim/phaser-raycaster)、[Ray API](https://wiserim.github.io/phaser-raycaster/Raycaster.Ray.html)、[LICENSE](https://github.com/wiserim/phaser-raycaster/blob/master/LICENSE) | MIT；最近交点、单射线、圆周和锥形检测、动态对象／tilemap映射 | 可用于墙体裁切扇形及视线验证；环形检测不等于爆炸伤害，最近交点不自动代表穿透、命闪或友方免伤。若格网射线已有足够能力，不叠建第二套规则射线 |
| E05 | [EasyStar.js](https://github.com/prettymuchbryce/easystarjs)、[README](https://github.com/prettymuchbryce/easystarjs/blob/master/README.md) | MIT；二维A*、tile/point移动成本、对角移动等 | 作为寻路备选，不与ROT／Rex重复实现同一寻路器；多格通行需以单位占地查询包装，无视觉地图生成或技能AI |
| E06 | [Yuka](https://github.com/Mugen87/yuka)、[README](https://github.com/Mugen87/yuka/blob/master/README.md)、[Docs](https://mugen87.github.io/yuka/docs/)、[示例](https://mugen87.github.io/yuka/examples/) | MIT；目标／状态驱动、视觉、记忆、导航、steering、序列化；不依赖某特定渲染引擎 | 可参考GoalEvaluator/Think/Vision/Memory模式；仍需自己写技能候选和价值。完全回合制不需要照搬实时steering循环；不用完整AI库也可复用架构思路 |
| E07 | [semibran/tactics](https://github.com/semibran/tactics)、[range.js](https://github.com/semibran/tactics/blob/master/lib/range.js)、[pathfind.js](https://github.com/semibran/tactics/blob/master/lib/pathfind.js)、[ai.js](https://github.com/semibran/tactics/blob/master/lib/ai.js) | MIT；轻量格网范围、寻路、AI；最后核对的commit为2018-11-21 | 规则原型参考，构建链旧；不能当作完整稳定引擎。不会直接照搬其双方phase为本项目跑圈 |
| E08 | [pongstylin/tactics](https://github.com/pongstylin/tactics)、[Board.js](https://github.com/pongstylin/tactics/blob/master/src/tactics/Board.js)、[GameState.js](https://github.com/pongstylin/tactics/blob/master/src/tactics/GameState.js)、[Bot.js](https://github.com/pongstylin/tactics/blob/master/src/tactics/Bot.js) | src为Unlicense；BFS可达范围、A*、方向、棋盘交互；2026-11-01有提交 | 参考分层和交互，不套等距棋盘和服务器。README明确原作图像／音频无开放许可，不把试玩素材作为本项目素材包；本地Worker也不证明整套无后端 |
| E09 | [Athena Crisis](https://github.com/nkzw-tech/athena-crisis)、[地图athena](https://github.com/nkzw-tech/athena-crisis/tree/main/athena)、[状态apollo](https://github.com/nkzw-tech/athena-crisis/tree/main/apollo)、[AI dionysus](https://github.com/nkzw-tech/athena-crisis/tree/main/dionysus)、[DionysusAlpha](https://github.com/nkzw-tech/athena-crisis/blob/main/dionysus/DionysusAlpha.tsx) | MIT代码；地图／行动／AI分层；2026-09-06有提交 | 参考行动枚举、评分和数据结构，不复用非开放美术、故事或完整产品后端；自己的6种范围／感知／结界规则仍需整合 |

### 已调查但不是推荐底座

- [AncientBeast](https://github.com/FreezingMoon/AncientBeast)：六角格生物战棋，代码AGPL-3.0，艺术／音频CC-BY-SA-4.0；当前目标是隐藏方格，复用整套还会增加许可与引擎适配工作，仅参考单位技能组织。
- [sviridoff/tactical-rpg](https://github.com/sviridoff/tactical-rpg)：旧React/Redux/TS火纹原型，package元数据ISC但调查时未见独立许可证文件，适合流程参考，不当作已核验可整套搬的底座。
- [Custom Wars Tactics](https://github.com/ctomni231/cwtactics)：MPL-2.0、战争兵种方向，未证明覆盖本项目的感知、语义布阵和技能契约，不作为首选。

## 按阶段选用原则

1. P00仅验证一个表现方案、一套寻路／视野候选与单HTML分发，不同时导入上表所有库。
2. P03跑圈和P07资源／反应仍用自己的玩法契约，外库不能成为更改已定规则的理由。
3. P05语义布阵／硬软约束由本项目写薄适配，不让模型输出逐格坐标，也不声称Digger或Yuka理解中文剧情。
4. P09先复用原评分入口与公共技能预测；只有确有独立收益才引入Yuka，不为使用框架增加实时更新循环。
5. 第三方版本／许可／可用性变动时记录证据和选择理由。原型视频只能证明看见的表现，不能证明作者使用HTML、Phaser或Agent生成。
