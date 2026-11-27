# 战棋施工日志（tactics 线）

> 双线纪律见根 AGENTS.md 第八节：本文件只记战棋施工轮次；回合制与仓库级操作记根 LOG.md。编号空间与根 LOG 相互独立，溯源以 HASH 为主键（四列索引见 [LOG-INDEX.md](LOG-INDEX.md)，禁止全量通读，按 HASH 定位）。
> 本文件由 2026-11-23 解耦轮自根 LOG.md 迁入 LOG-303~LOG-315 段，解耦记录见根 LOG LOG-317。

---

## [LOG-303] 2026-11-20 — 战棋规则共识、分阶段验收与原型缩略图落盘

- **业务提交**：`af19096`。
- **核心目的**：回顾本会话已确认规则，为独立酒馆战棋前端固化可执行、分步可验证的文档与资源入口，保存视频参考，不直接开始开发或改变原RPG。
- **变更行为**：
  1. 新建 `doc/tactics/INDEX.md`、`SPEC.md`、`PLAN.md`、`RESOURCES.md`、`VERIFICATION.md` 和 `references/SOURCE.md`。SPEC记录敏捷跑圈、主辅行动、六范围、蓄力／专属加速、感知、AI、倒地救援、结界、任务与YAML/MMS职责；PLAN以P00—P12共13阶段标注依赖、交付、已有资源、输入／预期、退出条件和阶段目的回述。
  2. 本轮用户补充并确认独立【闪避】（旧值首次从基础敏捷迁移，后续解耦），以及现有技能编辑器的全体／单角色配置导入导出（带版本JSON、同名替换新人追加、只改草稿保存才生效、不包含实时资源）。同步追加相关验收与工时。
  3. 从前文临时分析目录复制四张原型摘帧：全片总览、射界细节、枪口弹道序列、目标命中序列，保存于 `doc/tactics/references/`，记录原视频与四图SHA-256。只保存图片，不提交整段视频；agy视频读取曾超时，不称多模态读取成功。
  4. 资源清单分别标注原项目可复用函数／测试／打包模板、需替换的旧Act／大回合／全队索敌、第三方模块与许可／素材边界、Phaser3/4版本与库默认deadline待验证事项。未将库模块等同于完整战棋能力。
  5. 净工程估算为198—298小时，包含本轮新增的闪避与配置往返；加联调余量建议230—375小时。约40—60小时的最早切片仅为固定测试图的基础闭环，不冒充完整首版。
- **涉及文件**：`doc/tactics/` 下6份Markdown与4张JPG；`LOG.md`、`LOG-INDEX.md`。
- **验证**：文档静态检查6份／本地引用84个／阶段13个／未来验收测试ID99个且唯一／净工时求和198—298／四图SHA-256一致，无检查问题；`git diff --cached --check`通过，业务暂存10文件均在 `doc/tactics/`。99个是已写的未来测试，未运行战棋功能回归。
- **决策原因**：先把最终规则、资源与测试契约落成项目资料，避免下一会话沿用被撤销的穿透兼范围、蓄力释放再扣点、前端实时资源权威等旧方案；有现成算法优先评估，语义布阵和空间AI以共享规则薄适配完成。
- **边界**：未创建战棋运行程序，未改 `index.html`／根README/SPEC／MMS／生产提示词／原正则包；未重跑原RPG全量、未打包、未启动浏览器／模拟器、未代导入酒馆；未混入已有删除及.audit-work临时文件，未推送远程。
- **目的 vs 现状**：已确认玩法、分步验收和参考图已落盘并校验，真正实现与P00—P12功能验证仍未开工；工时为工程投入估算，不是模型运行时长承诺。

## [LOG-304] 2026-11-21 — P00 隔离技术探针与单 HTML 双尺寸 iframe 验证

- **业务提交**：`ca38c2b`。
- **核心目的**：只验证绘制承载、世界坐标点击、一个可执行寻路／视野方案与单 HTML 分发，不创建正式战棋界面，不开始 P01。
- **变更行为**：
  1. 新增 `tactics/p00-probe/`，锁定 Phaser 3.90.0（MIT）、ROT.js 2.2.1（BSD-3-Clause）、esbuild 0.28.2；含模块源码、锁文件、固定小图、圆形占位头像、相机变换与真实 AStar／PreciseShadowcasting 查询，单 HTML 构建／专项检查／局部 HTTP 服务。
  2. 新增 `integration-test/tactics-p00-harness.html`，读取真实产物，经过围栏／实体往返后挂入 srcdoc，mock 内存变量和生成计数；没有复制规则算法或连接真实酒馆。
  3. 新增 `doc/tactics/P00-REPORT.md` 和截图／结构化结果／服务记录，逐项说明输入、预期与实际；核对 Phaser latest 已为 4.2.1、Rex 当前文档转 Phaser4，以及 Raycaster npm ISC 与 LICENSE MIT 不一致，后两者未安装。
- **涉及文件**：探针目录、独立 mock、本报告；本条与 LOG-INDEX。业务提交共 28 文件，没有混入既有删除、临时文件或生产入口。
- **验证**：六源码模块语法通过；真实算法源码 4/0；单 HTML 专项解析／许可／围栏正反对照通过；IAB 直接页与 iframe 在 1280×720／1600×900 实跑，mock 两尺寸均 4/4，Canvas 像素 3/3、生成调用 0、iframe 子请求 0／CSP 0。相机 (0,0,1)→(94,10,1.3) 前后均点中格 (7,3)；路径 9 步经 (4,5) 绕墙，开墙 5 步，墙后目标不可见／开墙可见。
- **产物**：`probe.html` 1,228,969 字节，SHA-256 `ce52e405113d6b21b7b23c298f8158a3d668db12d503e231e89af7f7d4642f3e`；完整许可证随 HTML 保留。截图和结果位于 probe/evidence。
- **决策原因与限制**：选择一套 Phaser 表现＋ROT 查询，避免重复权威几何；ROT 原生 AStar 每步成本 1，四向探针不代表八向 √2 与多格体型已满足。Digger／Uniform 默认 1000ms、各类尝试数和默认尺寸已审查但未引入生成路径，不新增玩法上限。
- **失败与环境记录**：gh 缺失转官方 API；poly-decomp 无 v0.3.0 标签转 npm gitHead；IAB 导航回退／重载及 DOM 一帧滞后不计入结果，独立标签完成验证；iframe locator 点击误报遮挡后以只读命中核对和普通 CUA 点选完成。未采集控制台，不能称 console 零错。测试后关闭本轮标签和服务。
- **边界**：未改原 index／v12.16／根 README、SPEC／旧 harness／MMS／生产提示词或角色技能；未跑原 RPG 全量、未进入真实酒馆、未调用其他 Agent、未启动系统 Chrome／模拟器；不 amend、不 push。真实导入、WebGL／动画性能／大地图与八向加权仍待验证。
- **目的 vs 现状**：P00 承载、坐标、绕墙遮挡和单文件 iframe 技术验证达标，完整战棋和 P01 尚未开始；停止等待用户检查。

## [LOG-305] 2026-11-21 — 战棋文档第二轮复核收敛与 MMS/复用边界修订

- **业务提交**：`285e638`。
- **核心目的**：在完整保留 `doc/tactics/SPEC.md` 已确认玩法、99 项阶段验收及 `ca38c2b` P00 历史报告的前提下，吸收第二轮跨项目资产审计与双主审收敛意见，修订 `INDEX.md`、`PLAN.md`、`RESOURCES.md` 并新增 `REVISION-2026-11-21.md`。
- **变更行为**：
  1. `RESOURCES.md` 新增 `R13`（`D:\Project\MiniMapStatus\MiniMapStatus.html` 10 种近景材质、24 类近景图元、`mmsRenderMapArt(json, style, 'mini')`、`demo-bigmap.html` 缩放平移、`MMSImages.resolveAvatar` 及 `$rpg_combat_result` 幂等单写者接收协议），明确不修改 MMS 源码与根目录原 RPG 打包器，并更新 `R01—R12` 与 `E01—E09` 推荐路线（R13 SVG 底图＋原生 Canvas 2D/DOM＋统一格网）。
  2. 明确 8 项最小复用与适配切口：修复 `applyPersistedRoster`/`applyStatusBarRoster` 覆盖 YAML 显式字段；权威场景数据双输出；连续 10000 时钟；再动改为主行动点；拟建逐槽空间目标上下文 `spatialCtx.resolveSlotTargets` 与空间合法 `[转火]`；独立闪避与距离视线反应；空间结界；`mkAnchor` 动态重投影/统一变换容器、P08 表现静默与 P09 适配新空间规则的只读预测器分置。
  3. 同步修订 `PLAN.md` 与 `INDEX.md` 工时（完整首版候选净工时 `128—185h`，含 15%—20% 缓冲 `147—222h`；扣除 `ca38c2b` P00 探针后剩余净工时 `127—184h`；MVP `28—40h`），扣除 P02/P05 重复计费，弃用无实测统计的“85%／650行／<0.5ms”口号。
  4. 记录离线实测 `tactics/p00-probe/probe.html` 含 26 处 `/\$[$&`'\d<]/` 序列，区分“禁止危险序列（契约 A）”与“传输层 `$` 加倍后验证单次 `String.replace`＋实体还原字节一致（契约 B）”，保留 `P00-REPORT.md` 与 `VERIFICATION.md` 历史原文不倒改。
- **涉及文件**：`doc/tactics/INDEX.md`、`doc/tactics/PLAN.md`、`doc/tactics/RESOURCES.md`、`doc/tactics/REVISION-2026-11-21.md`；`LOG.md`、`LOG-INDEX.md`。
- **验证**：静态校验确认 13 阶段净工时相加精确为 `128—185h`、99 个唯一测试 ID 完整保留、128 个本地 Markdown 链接断链 `0`；未修改 `SPEC.md`、`P00-REPORT.md`、`VERIFICATION.md`、根 `README.md`/`index.html`/`build-regex.cjs` 或 `MiniMapStatus` 源码。
- **边界**：仅完成文档重构与静态链接/算术检查；未启动浏览器或服务，未重跑 P00 探针、原 RPG 回归或未来 P01—P12 功能测试；未混入既有工作树删除或 `.audit-work` 临时文件；未推送远程。
- **目的 vs 现状**：战棋文档已按双主审共识收敛并固化至 `285e638`；待主审审核确认后可按 P00 补验（真实 `String.replace` 往返与原生视口）及 P01 推进。

## [LOG-306] 2026-11-21 — 主审核通过后的运行优先级与工时口径轻量修订

- **业务提交**：`9ffa031`。
- **核心目的**：主审通过第二轮文档修订（`285e638`）后，把用户确认的运行优先级写入计划并消除一处工时口径歧义与一处 MMS 措辞矛盾；仅轻量修订，不扩展测试或防御。
- **变更行为**：
  1. `PLAN.md` 核心目的后新增运行优先级：成品贴合视觉原型、PC 前端稳定高速流畅；后端／本地规则与 AI 计算以同后端中端安卓设备无需优化稳定运行为基线；首版前端不做手机触控；优先简单高效实现，不为低概率且刷新即可恢复的故障增加兜底层或专门测试。
  2. `PLAN.md` T12-04 增补整局流畅观察项（PC 及同后端中端安卓正常游玩流畅；观察项，不设 FPS 硬门槛或新增性能兜底）。
  3. `PLAN.md` “估算不包含”澄清 P00 探针在“完整首版总投入”口径计入、在“当前剩余投入”口径不计，消除与前置总投入表述的自相矛盾。
  4. `RESOURCES.md` R13 使用边界末尾补一句“上述适配均在战棋侧包装实现，不修改 MMS 仓库文件”，消除与“默认不修改 MMS 源码”的字面矛盾。
- **涉及文件**：`doc/tactics/PLAN.md`、`doc/tactics/RESOURCES.md`；本条与 LOG-INDEX。
- **验证**：仅静态检查改动四处均为一句话级增改；未运行构建、回归或浏览器，不涉及代码。
- **边界**：未改 `SPEC.md`、`INDEX.md`、`REVISION`、`P00-REPORT.md`、根业务源码或打包器；不新增测试清单、FPS 门槛、自动恢复或防御性兜底；不混入工作树既有删除与临时文件。
- **目的 vs 现状**：运行优先级与口径歧义已落盘；P00 补验与 P01—P12 施工仍按修订后 PLAN 未开工。

## [LOG-307] 2026-11-21 — 战棋 P01 协议、独立闪避、配置包与真代码测试底座交付

- **业务提交**：`d615d8c`。
- **核心目的**：按已批准计划完成 P01——独立规范数据协议与冻结契约、独立闪避首次迁移、统一优先级合并（修复 YAML 显式字段被覆盖的旧缺陷）、带版本全体/单角色配置包数据模型，以及测真实业务代码的测试底座；不改原 RPG 与 MiniMapStatus。
- **变更行为**：
  1. 新增 `doc/tactics/P01-CONTRACT.md` 冻结用户确认契约：三原型新建闪避初值（标准人形50/轻型生物70/大型生物30）、三键独立存档（`rpg_tactics_roster`/`$rpg_tactics_state`/`$rpg_tactics_bridge`）、YAML 字段与合法空值、六范围参数映射、主辅行动成本、资源优先级链、配置包白名单与语义布阵数据结构。
  2. 新增 `tactics/src/` 六模块（原生 ESM）：`protocol.mjs`（常量/字段表/原型）、`parser.mjs`（移植 parseSkill/parseItem/parseSkillList/parseItemList/parseAttributes 并扩展 [范围:类型;参数]、[行动:主辅]、[闪避][力量][总重][移动][感知][体型] 标签、对象形态与显式来源追踪；vendor 内联 js-yaml 4.1.0 保留 MIT）、`roster.mjs`（统一合并入口 resolveHero/gapFillSkill/ensureEvasionBaseline，YAML 显式含 0/false/null/空集合严格胜出，persist 开关不反转显式优先）、`lifecycle.mjs`（scene/battle 三分支 classifyLoad/applyLoad/reopenLoad 纯状态转移）、`config-package.mjs`（白名单配置包与导入草稿事务：同名完整替换/新人追加/取消零写入/保存才持久化）、`storage.mjs`（三键整档替换 + rt- 前缀 MMS 兼容桥最小契约）。
  3. 新增 `tactics/tools/run-tests.cjs`：--stage/--group/--all/--self-check/--artifact 门禁，不存在 stage/group/导出、空提取、零用例一律非零退出，T01-06 实测负路径。
  4. 新增 `integration-test/tactics-harness.html` 与 `fixtures/tactics/`：保真三作用域 mock（replaceVariables 真删键/insertOrAssign 深合并/双 LLM 计数恒 0）、契约 B 传输通道（$ 加倍 + 实体处理经真实 String.prototype.replace 字符串替换串往返字节一致）、srcdoc 挂载真实模块执行浏览器侧断言。
  5. 测试覆盖 T01-01～T01-08：Node 侧 146 用例 + IAB 13 断言全绿（passed>0, failed=0, pending=0），报告落盘 `integration-test/fixtures/tactics/reports/P01-2026-11-21.json`（含被测 13 文件 SHA-256、执行 HEAD 97cf9a2+sourceDirty 标注、审查修复记录）。
  6. 只读审查发现并修复 2 处高危：配置包物品 children 绕过白名单泄漏运行态键（packItem/unpackItem 接入 packSkill/unpackSkill 白名单）；对象形态技能/物品 usesRemaining 时序缺陷（maxUses>0 开局锁死）。同步修复中低危 5 项（hasOwnProperty 防原型链、取消零写入真断言、syncGroupFlatRows 同名 FIFO、spd null 迁移缺省、explicitApplied 真实增量）并补回归锁。
  7. `doc/tactics/PLAN.md`/`INDEX.md` 更新 P01 状态为已完成验证、P02—P12 未开工，剩余工时按算术推导为 118—172h；不改已确认玩法与单阶段估算。
- **涉及文件**：`doc/tactics/P01-CONTRACT.md`、`doc/tactics/PLAN.md`、`doc/tactics/INDEX.md`、`tactics/src/`（7 文件）、`tactics/tools/run-tests.cjs`、`integration-test/tactics-harness.html`、`integration-test/fixtures/tactics/`（5 文件）；本条与 LOG-INDEX。
- **验证**：`node tactics/tools/run-tests.cjs --stage=p01` 8 组 146 用例全绿；`--self-check` 负路径全过；IAB 实跑 harness 13/13（截图与机器可读结果已留档）；generateRaw/generate 双计数 0；禁改文件（根 index.html/regex v12_16/build-regex.cjs/README/根 SPEC/doc SPEC/P00 报告/MMS）零改动；未混入工作树既有删除与 .audit-work。
- **边界**：不实施跑圈引擎、地图、AI、命中结算（P02+）；配置导入导出 UI 与真实 MMS 接线留 P11；三键整档保存的串行约束已记入契约第 9 节；未新增生产 LLM 提示词。
- **目的 vs 现状**：P01 目的（可信数据协议 + 真代码测试底座）已达成且可复现；完整战场、UI 与发布打包仍属 P02—P12。

## [LOG-308] 2026-11-21 — 修复 P01 六项交付审查问题

- **业务提交**：`8ebd29b`。
- **核心目的**：修复已复现的六项问题，使协议与保存/重载链路由真实行为测试验证。
- **变更行为**：最大HP/MP独立走配置来源链；配置包支持扁平角色与保存形态再次导出；新增 `loadTacticsRoster` 读档/合并/首次闪避基准写入；按已存scene+battle续接并修复reopen当前指针；尊重组children与物品children/bindings显式空集合；严格验证函数导出与非法筛选参数，并用真实缺函数/零用例子进程失败替换源码文案检查。
- **涉及文件**：tactics/src/{roster,storage,lifecycle,config-package}.mjs、tactics/tools/run-tests.cjs、fixtures/tactics/{p01-node-cases,p01-review-regressions,p01-browser-cases}.mjs、P01-CONTRACT.md、本轮报告及PLAN状态引用。
- **验证**：P01限定8组166项通过，IAB16/16，生成调用0；语法与diff检查通过，报告源码指纹一致。未运行原RPG或战棋全量，未改根生产文件/MMS/P00探针/冻结SPEC，未混入既有删除与.audit-work。
- **复审限制**：独立只读代理未返回最终结论，已停止；不宣称独立复审通过。主代理完成六项反例验证与检查。
- **目的 vs 现状**：六项审查修复已实现并回归通过；独立复审仍未完成，完整战场/UI/MMS接线范围不变。

## [LOG-309] 2026-11-21 — P02 地图呈现、圆形头像、相机与原槽位 UI

- **业务提交**：`2024d5a`。
- **核心目的**：在不动原 RPG、不抢跑后续玩法阶段的前提下，把固定测试房间做成可交互正交战术沙盘：地图、真实占格、圆形头像、状态条与播放中特效共用世界坐标；镜头可平移/缩放/聚焦；原行动轴、菜单、编辑、记录与旁白入口保持原位。
- **变更行为**：
  1. 新增 `tactics/src/` 十一个 P02 模块：`scene.mjs`（固定 20×20 测试房间权威描述 + compileScene 双输出：规则格表(通行/挡弹/遮视/低障碍/材质独立) + R13 美术 JSON + 物件索引）、`geometry.mjs`（米格标尺/占格枚举/占位索引/朝向向量，90° 倍数查表防浮点残差）、`map-art.mjs`（战棋深灰石砖+暗红毯调色板注入）、`vendor/mms-map-art.mjs`（R13 MiniMapStatus mini 渲染管线移植：pattern defs/图元画法同源，不移植宿主/LLM/大地图段；新增战棋侧关闭门叶图元）、`camera.mjs`（唯一 {tx,ty,scale} 矩阵、双向投影、光标锚定缩放、fit/focus、拖拽阈值 6px 手势状态机：pending→dragging 永久、拖远回原点不算点击）、`unit-view.mjs`（正立圆标+阵营环+独立金色朝向箭头+名字/资源条 billboard 逆缩放；头像链 P01 显式 img→MMSImages.resolveAvatar→本地首字 SVG）、`vfx-host.mjs`（世界美术坐标锚点/矩形解析，position:absolute 挂世界层，替代根工程 mkAnchor position:fixed 痛点）、`arcane-vfx.mjs`（R08 切片移植：粒子/贝塞尔弹道/驱动循环 + 真实火焰弹 240+340ms 与敌方法术弹 480ms；坐标全存世界美术 px，相机变化不改演出数据；去音频）、`view-scope.mjs`（代际作用域：计时/rAF/监听/观察器/动画/节点统一注销 + Promise 结算一次 false，时钟可注入）、`sandbox.mjs`（编排：视口/world-root 六分层/R13 底图/叠加 Canvas/手势/选中占格框/mount/reset/destroy）、`ui-shell.mjs`（原槽位壳：行动轴/我方四列/260×172 菜单/顶栏七入口/底栏旁白/safeRect 实算）、`main.mjs`（P01 薄适配：parseYamlText→loadTacticsRoster→applyLoad 三分支路由 mount/update/reset；(side,name,出现序号) 确定性派生 scene 内稳定单位 ID；combatToken 集中换代；独立页内存变量宿主）。
  2. 新增 `tactics/index.html` + `tactics.css`（无 Tailwind CDN/Google Fonts 外链；系统字体栈）；`#enemies-container` 槽位替换为全屏地图视口，UI 悬浮层/行动轴/顶栏在相机树之外。
  3. `tactics/src/parser.mjs` 手术式修复：parseEnemyEntry 补齐原型缺省（口径同 parseHeroEntry，补齐值不标 _explicit）——契约第 1 节"新建角色"覆盖敌方，原实现忽略 原型 字段导致大型生物 footprint 落 1×1；T01 全量 166 断言回归通过。
  4. `tactics/tools/run-tests.cjs`：注册 `--stage=p02`（T02-01~04，requiredExports 存在性门禁 + 函数类型检查保留）、loadModules 按 stage 模块清单加载、runStage 返回汇总修复 --all 既有崩溃、assertRequiredExports 常量白名单扩展（T01-06 函数门禁语义不变）。
  5. `integration-test/tactics-harness.html`：`?stage=p02` 分流（默认 P01 契约 B 流程语义不变）；真实 iframe 挂载 `tactics/index.html`（非 srcdoc 复制）、1280×720/1600×900 双尺寸实测、三态结果（通过/pending/失败）与机器可读 JSON。
  6. 测试：Node 侧 T02-01~04 共 61 用例（双输出单源反证/投影往返/手势全路径/可控时钟生命周期/同名派生 ID/路由分支）+ 浏览器侧 44 断言（双尺寸槽位/菜单导航/正立头像/播放中特效粒子世界坐标不变/2×2 四格命中/拖拽零选取/重置清理/监听不递增/P00-native 双相机位同格）。
- **涉及文件**：`tactics/index.html`、`tactics/tactics.css`、`tactics/src/`（11 新 + parser.mjs + vendor/）、`tactics/tools/run-tests.cjs`、`integration-test/tactics-harness.html`、`integration-test/fixtures/tactics/`（p02-node-cases/p02-browser-cases/p02-fixture + reports/P02-2026-11-21.json + p02-viewport-1280.png）；本条与 LOG-INDEX。
- **验证**：`node tactics/tools/run-tests.cjs --all` 227 通过（P01 166 + P02 61）failed=0 pending=0；`--self-check` 负路径全过；IAB 实跑 P02 harness 42 通过/0 失败/2 pending（报告落盘 `P02-2026-11-21.json`，截图留档）；P01 harness 回归 16/16；generateRaw/generate 双计数 0；禁改文件（根 index.html/根构建器/regex 包/P00 报告/SPEC/README/MMS 仓库）零改动；未混入工作树既有删除与 .audit-work。
- **pending（不冒充全绿）**：①特效 Canvas 真实像素采样 ②focusWorld 缓动推进——IAB rAF 暂停无法验证（两项纯逻辑已在 Node 组覆盖），需用户授权排障模式（真 Chrome）复验；P00 原生视口待验项（P01-CONTRACT 第 9 节）本轮补验了 SVG 显示/双向坐标/无外链/LLM 计数 0，Canvas/rAF 项待真 Chrome 后再关闭，本轮不改 P00-REPORT。
- **边界**：不实施跑圈、六范围结算、感知、AI、布阵求解（P03+）；行动/技能按钮仅导航与 P01 数据展示，不冒充业务能力；固定图不是最终地图生成；本阶段不运行根 RPG 构建、不发布战棋正则包。
- **目的 vs 现状**：P02 目的（视频式战术沙盘承载 + 世界↔屏幕一致 + 原槽位保留 + 特效动态跟随）已达成并实测；表现层 2 项 rAF 依赖验证 pending 待真 Chrome；完整玩法属 P03+。


## [LOG-310] 2026-11-21 — P02 审查修复与定向回归

- 业务提交：b1c0c96。
- 核心目的：修复审查确认的特效清理异常、资源显示、增量视图与场景恢复错误，并补真实反例回归。
- 变更：scope公开节点移除/取消定时接口、loop跟踪当前待帧；特效模块独立登记定时/节点/Promise并完整clear；透传facing；底卡与地图统一bars数据；同步单位增删、朝向和footprint；恢复门/物件/layout，返回旧场景不覆盖站位；新增单位支持显式positions且缺位在写档前拒绝；重置仅恢复当前场景基线；修复描边占位符及safeRect；重复输入保留token与演出。
- 测试：P02 Node69/69、T01-06门禁16/16；真Chrome原harness45/45（0pending）+新增回归16/16（无捕获异常）；原生菜单点击通过。独立只读复审未发现阻断问题。
- 边界：地图完整可信拖拽/滚轮序列本轮未重跑，合成事件只作为处理器集成证据；未跑全量、未发布打包、未代导入酒馆。新增单位必须显式提供位置，不提前实现P05。
- 文件：tactics/src/{view-scope,vfx-host,arcane-vfx,main,sandbox,unit-view,ui-shell,map-art}.mjs、vendor/mms-map-art.mjs、P02测试和repair报告。
- 目的vs现状：审查反例已修复并通过定向测试；完整玩法与发布验收边界未扩大。

## [LOG-311] 2026-11-21 — 战棋 P03 跑圈与全局事件时钟交付

- **业务提交**：`a9097be`。
- **核心目的**：按已批准方案把 SPEC S02/S03/S06/S15#3 固化为无 DOM、无 rAF、无现实定时器的纯规则跑圈时钟与全局事件调度：虚拟时间只在事件点之间跳转，旧大回合能力逐项映射为时钟事件，现实等待（动画/旁白/思考）完全不推进战斗。
- **变更行为**：
  1. 新增契约 `doc/tactics/P03-CLOCK-CONTRACT.md`（冻结）：battleState 数据形状（progress 唯一距离真值、cooldowns 绝对到期、combatState.clock 全量调度元数据）、模块接口（首参统一 battleState）、同刻三阶段时序、旧大回合能力逐项映射表（S15#3：startRound 排轴/CD 扣减、nextTurn Buff/DoT、防御、再生/充能、隐匿者窗口、每回合机会、再动 splice、召唤、复活、救援截止、蓄力、麻痹）与责任边界。
  2. 新增 `tactics/src/scheduler.mjs`（288 行，零 import）：LAP_DISTANCE=10000/ROUND_TIME=100/DEFAULT_RESCUE_TIME=300；settlePhase12 阶段①周期效果含末跳→阶段②状态到期/CD 解除/救援截止；applyStatusRecord 同源重施保节拍仅更新强度/到期；grantNaturalAction 发放 1 移动额度+1主+1辅并交付待领取点；processStunSkip 消耗眩晕重跑一圈；grantMainPoint 立即/待领取两级去重；机会门槛；collectArrivals 基础敏捷降序→稳定序升序。
  3. 新增 `tactics/src/clock.mjs`（346 行，单向 import scheduler）：createClock 恢复/初始化（平局序冻结、忽略输入重排、新单位追加）、dispatchClock 13 类命令、advanceToNextAction 跳点推进（僵持预检=无可行动且无 spd 恢复且无导向终局事件；行动冻结期返回 frozen）、getVisibleTurnQueue 隐藏敌方零占位零人数零身份、getActionState/isOpportunityReadyAt 查询。
  4. `tactics/tools/run-tests.cjs` 仅追加 p03 注册（8 组、requiredExports 门禁、MODULE_FILES 两键），p01/p02 配置零改动。
  5. 独立测试角色（子代理，只写夹具）交付 `p03-node-cases.mjs`：首轮 41 例暴露真实引擎缺陷——零速恢复正速时 lastSync 未锚定导致停跑期追溯计息，违反 T03-03 不倒退；修复为 resyncUnitSpeed 统一入口（先按旧速计息再锚定）。
  6. 只读审查（独立子代理）0 阻断；按其清单处理低级项：交付点并入 extraMain 使冻结期 getActionState 余额正确（补回归断言）、契约补 interval≥1 注记与 hasBattleEndingFuture 注释对齐、夹具未用解构清理；并补齐契约功能面 14 条断言（临时眩晕跳过/隐匿窗口 wasHit/再动全链路/机会门槛/defend/periodic/交付余额）。低-4（collectArrivals 未用 t 参）按冻结签名保留。
  7. 实测报告 `integration-test/fixtures/tactics/reports/P03-2026-11-21.json`：executed:true、HEAD 6c1339a、sourceDirty 标注、8 组 55 例逐用例实际输出、filesTested SHA-256、审查与修复记录。
- **涉及文件**：`doc/tactics/P03-CLOCK-CONTRACT.md`、`tactics/src/clock.mjs`、`tactics/src/scheduler.mjs`、`tactics/tools/run-tests.cjs`、`integration-test/fixtures/tactics/p03-node-cases.mjs`、`integration-test/fixtures/tactics/reports/P03-2026-11-21.json`；本条与 LOG-INDEX。
- **验证**：`node tactics/tools/run-tests.cjs --stage=p03` 8 组 55 例全绿（failed=0 pending=0）；`--stage=p01` 166 全绿；`--self-check` 负路径全过；RUN_TESTS_JSON 机器可读块与逐用例数一致；T03-07 用受控现实钟（Date.now 前移 30000ms 后还原）与 JSON 往返重放逐字节一致证明引擎不读现实钟；禁改文件（根 index.html、tactics/index.html、P02 视图模块、SPEC、P01 契约、根构建器、README、MMS）零改动；未混入工作树既有删除与 .audit-work。
- **边界**：P03 只交付时序与行动资格纯数据接口——伤害数值/技能/蓄力投点归 P07，救援交互归 P10，行动轴渲染由 P02 消费 getVisibleTurnQueue，续载接线归 P11；本轮不接线 UI、不宣称完整战场。备注：PLAN 状态表中 P02 行原为"未开工"，与 LOG-309/310 及 git 历史（2024d5a/b1c0c96）不符，本轮按已提交事实同步该行，避免同表自相矛盾。
- **目的 vs 现状**：P03 目的（可重放跑圈与全局事件时钟、旧大回合逐项映射不留缺口）已达成并实测全绿；P04+ 空间/感知/AI/结算接线未开工。

## [LOG-312] 2026-11-21 — 修复 P03 交付审查发现的时钟边界

- **修复提交**：`2963011`。
- **核心目的**：封闭 P03 时钟的永久 DoT 僵持循环、持续伤害来源误合并与倒地目标持续伤害误结算风险。
- **变更行为**：永久毒/燃（`endAt:null`）不再作为可无限推进的未来终局事件，零速无行动者可一次返回僵持；毒/燃 `source` 强制提供 `{casterId, skillId, effectId}`，连同目标 ID 构成同源键，不同施术者/技能/效果相互隔离；倒地/离场目标仍推进状态节拍，但 `dot-tick.suppressed=true`，下游不得扣持续伤害；契约与 T03 夹具同步。
- **涉及文件**：`tactics/src/{clock,scheduler}.mjs`、`doc/tactics/P03-CLOCK-CONTRACT.md`、`integration-test/fixtures/tactics/p03-node-cases.mjs`、P03 实测报告；本条与 LOG-INDEX。
- **验证**：P03 8组58例全绿；P01 166例全绿；`--self-check` 通过。新增断言覆盖永久 DoT 不死循环、两个施术者同名技能独立刷新、倒地/存活目标 tick 的 suppressed 差异。独立子代理因并发额度未能启动，本轮由主代理核对改动与实跑结果，报告不声称独立复审通过。
- **边界**：未改 P02/UI、SPEC、P01 核心；未触碰工作区历史删除与 `.audit-work`；未推送。
- **目的 vs 现状**：三项审查问题已由具体规则与回归锁定，P03/P01 定向测试全绿；P07 接线仍须遵守四元状态来源与 `suppressed` 过滤契约。

## [LOG-313] 2026-11-21 — 最小可玩战斗 MVP 合体交付

- **业务提交**：`de9e82a`。
- **核心目的**：快速输出能走、能打、敏捷跑圈、敌方还手、分胜负并重开的网页 Demo，供用户亲手确认，不等待 P04—P09 全量施工。
- **变更行为**：
  1. 复用 P01 角色资源、P02 地图/相机/血条、P03 时钟，新增 battle/movement/range/damage/ai/demo-fixture 六个纯模块；当前行动余额直接消费时钟 currentAction.resources，恢复不重发。
  2. 八向 1/√2 移动、完整多格通行、友穿敌挡、绿格与路径；单体/直线/扇形共享预览/执行/AI，独立闪避双骰与基础护甲扣血，HP归零退轴不挡路。
  3. 用户确认复用基础行动/攻击技能/菜单标题/轴/记录/面板壳/右上重置，无新工具栏；查看角色不夺权，点目标两次确认，返回/Esc取消不扣费。敌方采用接近+近远程追打，行动结束全灭结算与完整开场重置。
  4. 独立固定2我方/3敌方样本，全员公开位置；原 P02 A/B/C 夹具隔离（入口 ?stage=p02）。未迁移复杂职业/标签/反应，不接真实酒馆/MMS，根 RPG 与正则未改。
  5. 新增 MVP Node/浏览器用例，注册独立 runner/harness；只读审查发现的恢复余额、AI友方路径提前停步、大型夹角、空范围候选已修复并验证。测试自身 side/起点/共享位置与取消顺序问题修夹具，不改玩法凑绿。
  6. 本地启动脚本与 Demo 说明、ZIP交付；解包真实页面验证5单位启动、CSS与火舌预览提交（main1→0、MP30→27、守卫-14HP）。
- **涉及文件**：`tactics/src/{battle,movement,range,damage,ai,demo-fixture,main,sandbox,ui-shell}.mjs`、`tactics/index.html`/`tactics.css`/`DEMO.md`/`启动Demo.bat`、`tactics/tools/{run-tests,serve,verify-demo}.cjs`、MVP Node/浏览器夹具与三份报告、`integration-test/tactics-harness.html`、`tactics-mvp-2026-11-21.zip`、`doc/tactics/{MVP-PLAN,PLAN}.md`；本条与 LOG-INDEX。
- **验证**：稳定后唯一一次战棋 Node --all 349通过（P01 166/P02 69/P03 58/MVP 56，failed0/pending0）；MVP真实iframe 24通过（含三范围实打、敌还手、GUI失败和重开、独立controller完整局胜利）；直接真实鼠标移动2m与火舌-14HP通过；ZIP解包专项3通过，不再全量。报告含真实逐例结果/源码指纹，源HEAD标记施工前d195c1a+dirty，不回填自指hash。
- **未验/边界**：旧P02浏览器完整动画组在IAB rAF依赖的弹道Promise等待未结束，未报通过；真Chrome动画/时序/截图未获排障授权；不操作安卓/真实酒馆。完整P04/P06/P07/P09仍未验收，其他后置阶段不纳入MVP。README等待用户确认有效后更新。
- **目的 vs 现状**：最小可玩闭环与相关测试/唯一Node全量已达成，可本地打开并重玩；交付让用户确认，不继续扩建完整功能。

## [LOG-314] 2026-11-22 — MVP 补交付自包含单文件版

- **业务提交**：`0962462`。
- **核心目的**：按用户要求补交付与多文件版玩法完全一致的自包含单 HTML（此前批准计划将正式单HTML/正则发布列为后置，本轮仅补本地单文件分发，不含酒馆正则链）。
- **变更行为**：新增 `tactics/tools/build-demo-html.cjs`（esbuild IIFE + CSS 内联；函数式 replacer 防产物 $ 序列被 replace 语义破坏；关键模块入包存在性断言）；产物 `tactics/mvp-standalone.html`（176763 字节，27 模块入包，sha256 63789a3c…）；DEMO.md 增单文件版打开方式。
- **涉及文件**：`tactics/tools/build-demo-html.cjs`、`tactics/mvp-standalone.html`、`tactics/DEMO.md`、报告 `MVP-2026-11-22-standalone.json`；本条与 LOG-INDEX。
- **验证**：构建断言 3 项（入包/零外部 import/闭合标签恰 1）；IAB 真实页面 4 项——启动正常、外链引用 0 且子资源请求 0（完全自包含）、内联 CSS 生效、火舌真实提交 main 1→0/MP 30→27（本次掷骰守卫闪避，双骰命闪正常结算）。未重跑 Node 全量：纯打包新增，玩法源码零改动，沿用 LOG-313 的 349 全量。file:// 双击打开因 IAB 不能导航 file: 协议未验证，已在 DEMO.md 如实标注。
- **边界**：非酒馆正则产物，正式 `build-regex.cjs` 契约 A/B 仍归后置阶段；未改动任何玩法源码。
- **目的 vs 现状**：单文件自包含交付达成且专项全绿；与多文件版并存，酒馆正式发布链仍待后续阶段。

## [LOG-315] 2026-11-22 — 增补战棋单文件交付门禁

- **规则提交**：`9337ec5`。
- **核心目的**：按用户要求把「每轮必须交付单文件版、多文件通过不算通过」固化为项目验收门禁，防止只交源码不交产物。
- **变更行为**：根 AGENTS.md 新增第七节（战棋每轮交付须重打包自包含单文件；产物专项断言＋真实页面战斗流程验证全绿才算通过；源码改动后未重打包视为过期不得交付）；doc/tactics/PLAN.md 测试门禁增第 8 条同口径。
- **涉及文件**：`AGENTS.md`、`doc/tactics/PLAN.md`；本条与 LOG-INDEX。
- **验证**：重跑 build-demo-html.cjs，产物 sha256（63789a3c…）与 0962462 交付版本逐字节一致且 git 无变化，证明当前交付已满足新门禁；本轮纯规则增补、无源码改动，不重跑测试全量。
- **目的 vs 现状**：门禁已固化并核验当前产物合规，后续每轮战棋交付按此执行。




## 2026-11-22 · 战棋视听切片翻新（0adb0a3）
- 行为：战棋 Demo 按"最终视听品质"切片整体翻新；回合制视听模块经生成式提取（tools/extract-rpg-av.cjs → src/vendor/rpg-av）宿主适配复用，不加载根 index.html 第二套战斗。
- 地图：新增 sc-chapel 三层礼拜堂（上层立柱大厅/中殿长椅祭坛/入口厅墓碑，两段窄廊+雕像龛），对齐 doc/tactics/references 缩略图画法；scene 支持 floor 可行走区（区外实心外壁）与 pillar/statue/pew/altar/tomb/banner/rubble 语义物件；chapel-art 由格表派生墙线，以 img 承载 SVG 一次栅格化。
- 交互：轮到我方直接点地面移动、点敌人用首个可用技能锁定、再点/Enter 发动、右键/Esc 返回；技能栏数字键、Space 结束回合（有剩余行动时二次确认）；悬停给命中率/伤害/目标数；开场全图俯瞰缓推到我方。
- 视听：WebAudio 合成 UI 音（hover/select/lock/confirm/cancel/deny/turn/enemyTurn/endTurn）与脚步（大型更沉），接 CombatAudioMixer aux 轨；移动加入逐格起落步态与尘土；轮次横幅、当前行动者光环、卡片受击、行动轴过渡；解锁前取得的首次语音在首次交互后补播；枪械采样准备最多等 600ms 不卡演出。
- 测试：av 49/49、mvp 56/56、p02 69/69；TAV-05/06 与 T02-01 断言按新几何/新面板更新。产物 tactics/mvp-standalone.html 550218 B，sha256 b2126302…a6f2b83bf6a215d。
- 决策原因：用户授权按自有审美完整翻新、移动无需先选"移动"；原 Demo 结束回合/技能入口不直观导致"无法结束回合/技能无特效"的体感。

## 2026-11-22 · 修复点击移动先闪现到终点（e1e64e8）
- 行为：移动命令前先锁住单位显示位置（lockMotion），刷新视图不再把头像瞬移到终点；路径演出结束后解锁并交还权威落点。我方与敌方移动同改。
- 涉及文件：tactics/src/main.mjs、tactics/src/action-director.mjs、tactics/mvp-standalone.html（550513 B，sha256 e98254f1…cbd149f93e）。
- 原因：battle.move 后 refreshBattle 立即按新 placement 摆位，而 playPathMotion 在镜头引导（约 400ms）之后才上锁回放，形成"闪到终点→退回起点再走"。实测显示坐标从起点单调走向终点；av 49/49、mvp 56/56。

## 2026-11-22 · 复用原版行动条/技能栏 + 职业与敌方分级表现（8b5f40f）
- 行为：新增 tools/extract-rpg-ui.cjs（只读根 index.html，sha256 6a7b72f3…）按名字闭包切出原版 40 段声明：renderTurnQueue（导轨流光带/FLIP/聚焦冲击/回合光晕/再动爆闪/变速角标）、updateSkillMenus/createSkillCard/createSkillGroupCard（父子技能组）/createItemCard、标签悬浮提示 tagTip 全套，以及菜单 HTML（四主项/子菜单/目标面板/非玩家回合遮罩）与所用 Tailwind/自定义 CSS（430 规则 + 13 关键帧，作用域 [data-rpg-ui-scope]），生成 src/vendor/rpg-ui/；构建前 --check 过期即失败。
- 宿主适配补丁 6 项：内联 onclick→委托×13、技能卡挂全局索引、行动条外层加 id、防御/撤退禁用注明“战棋未迁移”、基础行动新增第四项【结束回合】、基础行动四项行高对齐主菜单。战棋侧注入伪 state、技能可用判定（主行动+MP+已迁移范围）、瞄准入口；技能卡补“📐 范围”胶囊；目标面板显示瞄准提示/取消；敌方回合显示原版遮罩；我方回合播原版 heroTurn，插队播合成音。
- 职业/分级：新增 src/unit-style.mjs。我方职业取《典型对局.txt》（埃利奥特施法者/弗兰克防守者/玛德琳隐匿者/索恩风行者），八职业各有外层光圈、待机动效（参考 战术地图待机动效示例.html）、步态参数（motion gait：起落/压扁/速度/悬浮/冲锋）、步伐合成音、拖尾（残影/星屑/毒迹/微光）。敌方无职业、外圈保持红色，按原版 getEnemyTier 相对倍数分级：杂兵抽搐+碎步、精英邪光+悬滑+暗影拖尾、BOSS 沉重呼吸+偶发猛震+踏步震屏。夹具：守卫 HP 90→400（BOSS）、邪术师 Atk 9→18（精英）。
- 测试：--all 398（p01 166 / p02 69 / mvp 56 / av 49 / p03 58）全绿；T02-01 槽位与 260×172 断言改读生成文件。浏览器实测：子菜单技能卡/父子组/悬浮标签、目标面板取消、结束回合二次确认、敌方遮罩、隐匿者移动半透明无尘、风行者残影。产物 tactics/mvp-standalone.html 673537 B，sha256 9a7832f7632f8ea4dccb6ab2f6cecdce8ae6dc4a6ba12a5155f949304c6d9a19。
- 原因：用户要求行动条严格复刻原版、技能栏直接移植以免重复造轮子、按职业/敌人分级区分外圈与动效音效。

## 2026-11-22 · 职业呼吸光晕 / 范围胶囊原版化 / 结束回合上移（3a1636d）
- 行为：①我方头像外圈由统一金色实心圈改为职业色呼吸光晕（防守者琥珀/狂战士橙红/风行者青绿/灾厄毒绿/隐匿雾蓝/施法者紫/圣职金白/征伐钢蓝，呼吸节奏各异），去掉第二层虚线/双线环；光晕与待机同挂头像层（box-shadow 与 transform 分轨），移动中光晕加快、待机暂停；敌方外圈保持红色。②技能卡范围胶囊改为原版修饰胶囊样式（同 🎯 命中值胶囊：灰底细边 + 等宽数值），置于第二行末尾，接原版标签悬浮提示（【范围·单体/直线/扇形】说明）。③【结束回合】移到技能栏标题栏右侧（原【可行动/已行动】位置），二次确认态琥珀高亮；基础行动菜单恢复原版三项，提取补丁 6→4。
- 测试：av 49 / mvp 56 / p02 69 全绿；浏览器实测四职业光晕色与动画、敌方红框、标题栏按钮位置与二次确认、范围胶囊与悬浮提示。产物 674988 B，sha256 eeb8734ea13526fb197a4d39022022e7d65aa815b5963662c1e9592084468c8e。

## 2026-11-22 · .gitignore 增补忽略 .audit-work/ 与 备份（无需阅读）/（3c023f1）
- 行为：.gitignore 在 `.zcode/` 之外新增 `.audit-work/`（216 个文件 11MB 的历轮审计/回归过程产物）与 `备份（无需阅读）/`（旧 demo 与公开版归档）两条目录忽略，消除 220+ 条 status 噪音，防误扫入提交。
- 原因：工作区盘点发现历轮过程产物与目录整理归档全部处于“未跟踪且未忽略”状态，任何 `git add -A` 会将其整体吞入提交；本轮仅卫生处理，未触碰当日另一会话进行中的 tactics 改动（已按 mtime 排除）。

## 2026-11-22 · 战棋 P04/P05 部分规则与 P06 六范围后端交付（fe52201）
- 行为：完成 movement 的多格占地/跳跃/推动/碰撞基础，新增确定性三主题场景生成与 FormationSpec 求解；P06 `queryAttack` 统一单体、直线、扇形、圆形、全域、爆炸空间结果，输出真实/披露目标、碰撞接触点、槽级 `resolveSlotTargets` 和 `damageTargetIds`，battle/AI/overlay 共用查询；穿透不隐含穿人/穿墙，全域忽略普通遮挡，爆炸接触点与受击目标分离。
- 交接：新增 `doc/tactics/P06-FX-HANDOFF.md`，记录权威动作与逐目标 payload、世界坐标、单群槽语义、典型对局技能所属阶段、可复用导演/音画资产与 P07+ 缺口；更新 `doc/tactics/PLAN.md` 状态。P04/P05 各仅有 T04-01/T05-01 测试组，不标为完整阶段通过。
- 测试：P04 5、P05 8、P06 9、P02 69、MVP 56、AV 49 定向通过；最终 `node tactics/tools/run-tests.cjs --all` 合计 420 passed、failed=0、pending=0。源码语法检查通过。standalone 重建 716541 B，sha256 `78174877dc847083889574961bbf307cf394c326d004a13337edad3b7372b43f`；构建门禁 36 输入、22 个 required input、20 符号检查通过，零外部业务 import，单个脚本闭合标签。
- 未验：本地服务返回 200、IAB 产物能加载并显示战局，但用户可见菜单点击未能进入攻击选择，真实页面攻击/扣费/命中流程未完成；因此不宣称满足单文件“真实战斗流程”门禁。真 Chrome rAF/音画拍点未验证。

## 2026-11-22 · 目录整理归档提交：删除项落库 + doc/修仙特效/资源 入库（fd8fa47）
- 行为：将用户 11-20 手工整理的目录变动提交为 chore 记录——31 个根目录/修仙特效删除项（demo×20、王之军势×2、index-公开版、regex-公开版、Coding rule、审计三文档、导演兜底人格、敌方生成规则）正式落库；新位置 doc/（5 文档 + mp4 战术参考视频）、修仙特效/（xianxia 两张 + 淘汰/）、资源/（misc-sfx、group-attack、windup-sfx-candidates、vfx/xianxia-fire 素材）入库，共 351 文件 +501/-50363；git rename 检测将移动识别为 100% 相似改名，历史可溯源。.gitignore 增补 .DS_Store 并从暂存区剔除素材包内 15 个该类垃圾文件。
- 原因：用户拍板"将可选内容的变更提交为整理记录"。边界严格排除：另一会话未提交的 tactics/src/ui-shell.mjs 与 tactics.css（M 红线）、其资产 典型对局.txt/战术地图待机动效示例.html、fixtures 历轮遗留、AGENTS.md.bak/.zcodeignore/COC-*.json（非整理范围）。素材体积核验约 40MB、无超 100MB 文件。

## 2026-11-22 · 战棋 P07 行动提交/蓄力/反应规则闭环与 UI 门禁交付（9cfb2db）
- 行为：①蓄力生命周期收口——battle.endAction 对就绪蓄力强制取消（资源不退、不能跨行动藏就绪大招），新增 dispatchBattleClock 包装器统一处理 exitUnit 清 preparing（覆盖 DoT/反击/推动/攻击/开场倒地全部来源）与 grantMainPoint immediate:true 时同步 currentAction.resources.main（即时再动点并入可消费余额，同源每次自然行动至多一次）；②效果槽命中门控精确化——仅当技能无伤害槽时，main-point/spd/def-up/evasion 纯增益免命中直接生效，有伤害槽的附带效果仍须命中；③range.resolveSlotTargets 增加 SPEC 4.3 目标取向——非[他人]的单体友方增益槽（再动/单回/单速等 14 标签）映射施术者本人，[他人] 仍按 aim 选友方；④main.mjs handleFieldAction 接线 prepare/cancel-charge 按钮；⑤P07 定向夹具扩至 14 条（取消不退款/一次扣费投入释放/行动末取消/反击倒地清蓄力/反应距离墙阻/续载限次保留/再动消费闭环/单速只改跑圈不改命闪），p06 治疗夹具补 isOthers 标志；⑥新建 doc/tactics/P07-MIGRATION.md 逐项标 保留/替换/未验证（职业被动/看破/舍身/召唤/治疗增益/肃正/物品/slotTurns 均未验证且保持 skillSupport 拒绝），PLAN.md P04-P07 状态与 T07 表按实际覆盖改写；⑦报告落盘 P04(8)/P05(10)/P06(9)/P07(14)-2026-11-22.json 与 MVP-2026-11-22-standalone.json。
- 测试：定向 p02 69/p03 58/mvp 56/av 49/p04 8/p05 10/p06 9/p07 14 全绿；唯一一次 --all 合计 440 passed/0 failed；standalone 重建 749374 B，sha256 0fdb0e6ed8ea622dda0202074c7a2cb580698f0909750e23f969717c6eef3344，构建断言 37 输入/22 必需/20 符号/零外链/单闭合标签。
- UI 门禁（真实页面 IAB 全链）：设置面板存毒针技能（[单体]+[中毒] power2:4 turns:2）→ roster 落档 → 攻击技能菜单出毒针卡 → 瞄准/锁定（预览命中 88% 伤害 9）→ Enter 发动 → 主行动 1→0、战报"毒针 → 斥候 -9 HP"、血条 100%→77.5% → 时钟推进 t≈195 全局周期 → 战报"斥候 · 中毒 -4 HP"。毒不在提交时提前跳伤，与 P03 周期契约一致。
- 过程发现：①源码版页面加载后不刷新则运行旧模块（保存链按旧 main.mjs 执行导致首两次保存丢毒针），刷新后复测通过；②1280×720 下右下面板 h-[172px] overflow:hidden 将标题栏（含结束回合按钮）裁出可视区，用户确认按钮不可见，键盘 Space 为页面正式入口可完成回合推进——该面板高度缺陷已记录，未在本轮修复；③clock.mjs 全程零改动（蓄力清理全在 battle 包装器，P03 契约不破）。
- 未验/边界：P04/P05/P06 仍为定向组通过、未满足完整阶段退出条件；看破/舍身/召唤/治疗增益/肃正/物品使用未迁移保持拒绝；IAB locator 点击多次超时改用截图坐标+键盘路径，真 Chrome 排障模式未使用（用户未授权）；README 待用户确认本轮有效后更新。
- 原因：P07 退出条件要求用户配置技能在战棋前端有可验证实际效果；蓄力/再动/目标取向规则按 SPEC S03/S06 与 P03 时钟契约实现，未验证能力不伪装可用。

## 2026-11-23 · P07 规则缺口与假绿断言收口，前端交接（871a444）
- 行为：battle.mjs 拒绝未满释放与覆盖另一蓄力；开始/继续库存先抵准备、剩余主点投入；反应只执行扣费一次并向实际来源查墙体；看破/舍身及纯控制减益明确拒绝；同源速度/防御/闪避重施撤旧加新；main.mjs 既有禁用战报使用 skillReason。
- 验证：p07 21 条，p02 69/p03 58/mvp 56/av 49 定向通过；唯一最终全量 447 passed/0 failed。P04/P05/P06/P07 JSON 从本次 RUN_TESTS_JSON 更新，修正墙后超距与队友主点耗尽的假覆盖，增加库存/显式准备/一次反应/速度回滚/毒伤致死清蓄力断言。只读子代理复审无阻断。
- 产物：重新 build-demo-html，750360 B，SHA256 301678794504cc86e6e53cf651da88e4477d37590e726cdc02748846f4512238；37模块/22必需/20关键符号、脚本语法、零外部业务引用、单闭合标签与新规则入包通过。新规则字符串断言首次未考虑 esbuild Unicode 转义而失败，第二次 shell 转义写错，第三次修正后真实通过；无再次全量。
- 页面门禁未通过：IAB 新产物编辑玛德琳毒针→保存重置→卡片出现→选择进入瞄准通过；目标斥候投影 y=-157.113、动画停在整装待发，未完成锁定/Enter/扣费/HP/毒周期；不直调规则伪装页面流程。截图一次30秒超时，设置locator一次超时后DOM实际按钮事件可开。报告 P07-2026-11-23-browser.json 明确 completeP07:false。P07不标完成，不更新README。
- 前端交接：doc/tactics/P07-FRONTEND-HANDOFF.md 汇总8b5f40f之后变化，菜单260×172溢出裁切实测（物品按钮y677.7～707超出底边670）、动作状态/禁用理由/物品边界/JSON编辑体验/保存后敌方emoji头像缺失与验证债；仅提出问题和验收，不限制下一轮改法，本轮未改布局。
- 目的 vs 现状：规则与Node证据更完整，但当前产物真实页面施放门禁仍待人工可操作状态复验，不能宣称P07退出完成。未跟踪文件及.audit-work未触碰。业务备份871a444，日志单向回填，不amend。

## 2026-11-23 · P07 前端翻新：资源条/基础行动格/蓄力槽/禁用原因/手风琴编辑器/场地动作动效（0ab4fe3）
- 核心目的：让已落地的战棋规则可见、可懂、可操作（交接 P07-FRONTEND-HANDOFF 目标 1-7）；用户确认位置：动作并入「基础行动」二级菜单、蓄力复用原版 #charge-menu、授权桌面浏览器验收。
- 技能栏（P0）：原版 260×172 菜单卡、四主项、子菜单滑入与悬浮提示不动；余额与动作移出菜单卡——新增资源条贴在菜单上沿外侧（移动额度条，冲刺追加段琥珀斜纹；主◆/辅●点数格，消耗闪碎；悬停技能/动作/落点预告花费）。基础行动改两列 7 格（普攻/冲刺/跳跃/推动/背起或放下/防御/撤离），每格写「⚡立即 / 🎯选目标 + 主辅花费」，不可用直接写原因；场地动作选目标时复用原版 #target-menu 提示与取消。蓄力中 #charge-menu 替换主项（继续准备/释放/终止，可「先做其他行动」，资源条蓄力徽章随时返回）。
- 原因可读：技能卡底常驻原因行（冷却/限次/资源/主辅不足/蓄力/未迁移），点禁用卡或格子在战报条持久显示完整原因；范围胶囊补圆形/全域/爆炸。物品菜单标题与列表顶部常驻「战棋未迁移·仅查看」，防御/撤离同样标注；skillSupport 未放开。
- 编辑器（P1）：新增 src/editor-panel.mjs，移植原版「数据覆写」多层手风琴（全局设置→阵营 Tab→角色卡→技能/物品卡→变体子技能/用法），技能表单体经提取器直接复用原版 buildSkillFormFieldsHtml（模块 A-E，控件 id 同原版）、标签预览与可搜索标签下拉；新增战棋模块 G（六范围+参数、主/辅行动、蓄力主点）与战棋属性区（原型/占格/移动/力量/总重/感知/闪避/智慧）、11 持久开关药丸；看破/舍身/召唤/肃正/驱散/槽位持续标「未迁移」；高级 JSON 保留，错误定位到行列与「角色·技能#n」。保存语义（持久档+本场覆盖+重置本场、YAML 显式优先）不变。extract-rpg-ui 入口增 8 个编辑器函数，词元扫描纳入 openEditor 与 updateChargeMenu，下拉浮层挂作用域补丁 1 处。
- 修复：保存后敌方 emoji 头像退化（覆盖时身份 emoji 保留，显示名只改称呼），实测 4 敌 emoji 前后一致、行动轴零缺失；全域范围预览 shapePath 缺圆心崩溃（range-overlay）；推动/背起悬停提示引用未定义 esc；编辑器组技能保存后平铺子技能丢失（flattenSkills）。
- 动效：跳跃=下蹲蓄势→拉伸起跳→抛物线（弧高随距离、地影缩小、镜头跟随）→落地压扁+尘环+震屏，选点期紫色落点集+虚线弧预告；推动=后撤前冲→目标减速滑移/撞墙震屏/抵抗晃动；背起/放下=弧线转移，背负中被背者跟随背负者显示；冲刺速度线爆发、蓄力汇聚环；ui-sfx 新增 9 个合成音。
- 验证：定向 p02 69 通过；唯一一次 --all 447 passed/0 failed。standalone 重建 875187 B，sha256 34c71fd5a58ed8701e215544aa817e4f2e53e6ade0a5111825cf8c53f077c4d0，构建断言 38 输入/23 必需/27 符号/零外部 import/单闭合标签。桌面浏览器（同源 iframe 固定视口）实测：1280×720 菜单 498-670、物品按钮底 663（原 707 裁切消除），基础行动 7 格 530-665；1600×900 菜单 678-850，基础/攻击/辅助/物品子菜单内容全部在框内。跳跃 6m 位移 725→425px 连续约 0.8s、落点与规则一致；冲刺/原因行/推动撞墙 7HP 同步卡片/蓄力开始→槽位替换/编辑器保存与新增技能/六范围预览绘制（全域 7 目标）均页面通过；产物页真实流程：我方移动→结束回合→敌方移动+爪击-7HP→交还我方。页面报错仅浏览器自动化注入 namedItem，非项目代码。
- 未验/边界：六范围「预览=实际命中」按同一 queryAttack 保证，逐场景命中名单未逐一点击释放；倒地/背起演出因测试局无倒地友方未页面触发（规则接口已接线）；真 Chrome 原生窗口 1280/1600 以 iframe 固定视口代替；我方 YAML 已写同名技能编辑不覆盖本场（既有 YAML 优先规则，编辑器已如实提示）。README 待用户确认后更新。
- 目的 vs 现状：一致——裁切消除、动作资源一眼可读、禁用原因无需悬停、未迁移能力如实标注、编辑器回到原版手风琴并补齐战棋要素。未跟踪文件与 .audit-work 未触碰。


## 2026-11-23 · FX01 埃利奥特技能移植：通用 fxTag 演出注册表 + 规则接线（13aacdd）
- 核心目的：建立按 fxTag/空间形状/效果槽分发、受 L1–L4 分级约束的通用演出管线，用埃利奥特跑通；可点技能规则真实生效，未迁移槽位保持 skillSupport 拒绝与可读原因。用户确认：多段攻击槽本批逐段结算、属性取典型对局原值、.32 子弹放行并明示；中途修正——压缩爆燃按爆炸约定（投射物撞首个单位/墙于接触点起爆），折影步须真实位移（侧闪 2m）。
- 注册表：新增 src/fx-registry.mjs（GRADE_BUDGETS 时长/蓄势/全屏/暗场/峰值音量，actionInput/reactionInput，fxTag 精确→谓词→兜底，checkBudget）与 src/fx-library.mjs（identity 兜底、arsenic-shot 迁入、volley、fire-blast、self-boost、evade-shift-ghost、evade-shift）；action-director 删除 L20 砷弹特判与 PREPARE_KEYS，playAttack 改为注册表分发 + 逐段揭示 + 接触拍点启动反应演出；世界层地面/顶层经 vfx-host 挂 world-root，闪屏单独挂视口层。
- 演出：萨维奇三连发 L1×3（复用枪击身份，段间 200ms）；压缩爆燃 L3≈2430ms（火纹法阵蓄势→通用火焰弹射向接触点→收 100ms→fire.webm 爆燃/冲击环/闪屏/重震→余烬与 ranshao.webm 燃烧挂载）；预备咏唱 L2 950ms（时针法阵/加速光点/收束飘字）；折影步 L1 600ms（冷闪→沿规则路径滑步+三道头像残影→落位碎影）。音效全为既有真实采样（explosion_aoe_charge/blast、fire01、ranshao、herocharge、link_chime、hide、link_dash），预载清单补齐、去掉不再使用的 thunder 两键。
- 规则：battle 多段攻击槽逐段独立命闪扣血（hits[].segments，聚合值=逐段和，倒地停段，反应只在首段前一次）；range 爆炸被撞敌人计入伤害恰好一次（旧实现剔除其中心格致 1×1 被撞者不受伤），被撞友方只起爆不受伤；反应类型改按来袭技能伤害类型匹配（原比较来源单位，带类型反应从不触发）；新增扩展标签 [位移:侧闪|后撤;距离:n]（parser/roster 补齐），回避成功后垂直攻击线先左后右、八方向量化、复用推动位移追踪真实错位，hits[].reaction 带路径。
- 前端：demo-fixture 埃利奥特换为典型对局原值属性与 16 技能/7 物品全量（每项显式范围）；变体组头按子项给原因；单体·射程 0 自身技能一键锁定自身；预览显示「×3 段」与「弹药未扣减（物品未迁移）」；折影步显示位置锁原位至接触拍点。
- 构建链：工作区 core.autocrlf 检出为 CRLF 致 extract-rpg-av 结构校验失败（"window.playSound 结构变化"）；提取器与构建比对统一 LF，视听/界面生成物仅源指纹头行 6a7b72f3→5c1ab2a1（内容逐字一致）。
- 验证：定向 fx01 16、av 49、p06/p07 通过；T06-04 改为真断言并以旧 range 复核确会失败；唯一一次 --all 463 passed/0 failed。standalone 重建 906302 B，sha256 8b5aaa2789455ec31b48f6f6cb2cd90804e565aeb3822cee734fee1bc80ce567，构建断言 41 入包/26 必需/35 符号，单 script 闭合、零外部 JS/CSS 请求、新模块与关键字符串入包、无砷弹特判。真页（多文件 + standalone）：预备咏唱主行动返还且库存+3；三连发 -52/-52/闪避、及闪避/击杀后余段不结算；压缩爆燃撞守卫/斥候起爆、半径内双目标受伤、命中者挂燃烧；斥候/守卫近战触发折影步 3 次，规则站位侧移 2m、显示 300ms 滑步、MP 110→98；镜头平移+缩放 1.2× 时世界层特效与单位相对偏移同比缩放（探针偏差 0）；全程页面报错 0、特效节点回收 0 残留。
- 未验/边界：回避判定仍用 P07 口径（未用反应 power）；埃利奥特 Armor40 使演示敌人对其仅 1 伤；L3 计时不含镜头引导前置；暂缓技能的预定素材映射见 doc/tactics/FX01-ELLIOTT.md。
- 目的 vs 现状：一致——注册表通用可扩展、四个可执行技能音画与规则同源、其余技能如实拒绝。未跟踪文件未触碰。

## 2026-11-23 · RULES02 原版底层规则与反应自选接线（f560deb）
- 核心目的：在 FX01 基线上完整接入原版底层数值与效果，而非只移植四招演出；用户新增确认单/群效果归一、七范围含自身、公共范围＋槽级自身目标覆盖；舍身与场地结界暂缓。
- 行为：新增 effect-definitions/effect-handlers/class-passives/variant-rules；规范标签跨解析/配置/范围/AI/编辑器共用，逐槽命闪/伤害/护盾穿透/散射/暴击、附带减益至少一次命中、恢复/资源/防御/物品弹药、职业与变种周期/阈值/复活自爆接线。反应改为 beginAttack/beginUseItem 可暂停生成器，玩家将受击时弹窗选择/放弃/收起，不自动代玩家；折影步本段化解与真实侧闪。旧延迟恢复准备语义，库存仅释放后到账；普通冷却使用独立字段。召唤缺词条明确拒绝，不虚构标准人形，提供真实模板可生成/进轴；Demo真实世界书来源尚未接。
- 文件：tactics/src 规则/UI/导演、tactics/tools 测试启动与提取/构建、tactics/mvp-standalone.html、integration-test/fixtures/tactics 新旧定向组与 RULES02 汇总、doc/tactics SPEC/PLAN/STATUS/P07历史说明/RULES02-MIGRATION。根 index、README、已有未跟踪资源均未改。
- 验证：相关组开发回归及独立审查发现并修复减益落空重掷、暴击未接、反应射程/冷却遗漏、耗蓝被动、弹药按目标重复扣、准备haste死标签、速度Buff未同步时钟、存档别名回填与碰撞护盾二次折算。唯一最终全量13阶段536 passed/0 failed/0 pending；独立UI30项（含重复FX注册6项，不与536相加）。全量后的汇总读取首次Windows/tmp路径失败，仅重读日志，没有再次全量。
- 产物：重建980801字节，SHA256 20bc336ef194c9157ffa8d57d6497ac2f5baba56acb6eea5b26aafc18134d9ad；46模块/31必需输入/35符号、脚本语法、单闭合标签、零外部业务JS/CSS专项通过。
- 页面门禁未过：IAB源码及最终单文件可加载，开场镜头动画busy未交还控制，按钮locator和地图拖动超时；真实战斗/反应选择流程未完成，未用伪造动画时钟/直调伤害冒充交互，未擅自用本机Chrome/真酒馆/模拟器。因此P07及本轮完整交付仍待真实页面验收，不更新README，不推送远程。
- 目的 vs 现状：数值管线与源码/产物专项有证据，但完整目的尚未达到；暂缓舍身/结界和页面验证阻断如实保留。业务备份f560deb，日志单向回填，不amend。

## 2026-11-23 · RULES02 排障收口：esc 作用域修复与真页门禁通过（19b4541）
- 排障（chrome-devtools 真 Chrome，用户授权）：真页 mvp-standalone 复现"选技能点目标无法释放"——控制台 `Uncaught ReferenceError: esc is not defined` ×22，根因 `esc` 定义在 renderCommand 局部作用域，attackPreview（悬停/锁定路径）引用不到，预览与锁定点击连续抛错中断。修复：`esc` 提升为 createApp 模块级；重打单文件。
- 真页战斗门禁通过：用户在修复后真页完整打完一局至胜利（移动、柯尔特三连发多次施放、蓄力开始/释放、敌方近战/法术、胜利结算），全程控制台零 JS 错误（仅 2 条既有素材 404）。重置局定向验证反应链：守卫【横扫】弹反应弹窗（折影步/巫师护盾/跳过/收起）→ 选折影步 MP110→106 恰一次 → 回避+900 判定闪避 → 真实侧闪2.0m ((11,35)→(13,35)) → 斥候【爪击】独立结算被回避增益自然闪避不再弹窗。
- 顺带修复：beginTurn 敌方路径补 renderCommand，敌方回合面板不再残留上一英雄锁定提示。相关组复跑 mvp56/av49/fx01 16/rules02-ui 30 全绿（不二次全量）。
- 产物：980818 字节，SHA256 6d97a5428c54d4b861491e590a6a96ce08a3877ac703fb188c5294fa3a860057。RULES02-MIGRATION 与 summary JSON 更新为门禁通过；STATUS 同步。README 未动待用户确认。业务备份 19b4541，日志单向回填。



## 2026-11-23 · SPEC 标签规范补充：召唤范围/不分敌友/飞行/眩晕与单次时效（9674c43）
- 核心目的：把《典型对局》战棋改写底稿审阅中用户拍板的标签语义沉淀进规格，避免数据底稿与规格脱节。
- 行为：仅改 doc/tactics/SPEC.md 五处——S05 范围类型七改八（新增召唤：射程内空地合法格生成）；圆形无射程仅半径、点击即以自身为圆心（指定点投放走爆炸）；S05 补"单X=单次用后即逝／X=持久按Turns"时效语义与【不分敌友】目标覆盖标签、【飞行】移动增益（+50%移动额度、可跨低障碍）；S06 【眩晕】去power、由Aim判定。不动代码与产物。
- 文件：doc/tactics/SPEC.md；doc/tactics/LOG.md、LOG-INDEX.md（本条）。
- 决策原因：底稿中深潜者/食尸鬼沿用×2模板、行军兽钢体、化尘者仅留流体/虚形、再动三处删除均为用户拍板；数据底稿（典型对局战棋版YAML）由用户在会话外维护，未落盘。
- 验证：纯文档轮，无需打包与回归。
- 目的 vs 现状：一致——底稿标签语义全部有规格出处；实现接线仍按 RULES02-MIGRATION 节奏。

## 2026-11-23 · 权威典型对局与后端规则闭环（9f3d0bd）
- 核心目的：以用户改写稿和逐项问答共识为正式版前权威样本，完整支撑四英雄、六敌及两召唤词条；前端交由另一模型，不改main/UI/镜头/特效。
- 行为：先落盘doc/tactics/典型对局-战棋版.yaml、TYPICAL-BATTLE-CONTRACT及BACKEND-PLAN；核验修补巫师护盾遗漏、显式浓雾/冲锋标记、咆哮槽目标、武器完整名弹药绑定与固定2×2北厅站位。生产中文对象与旧标签同入口解析、伤害类别/攻击方式分离，保留旧括号演出兼容。
- 后端：跳跃ceil(基础移动/3)耗辅一次不扣移动、飞行+50%、逐段反应/新位置重查、整技免伤池/累计盾、HP伤害才击退、6m冲锋逐目标一次、浓雾5回合/进入离开/八邻感知/AI离雾、父道具共享次数、合法落点召唤/零跑圈、场地结界与自爆空间结算。补领域事件、过滤快照、种子reset；完整对局发现调度回调移除状态导致nextTickAt空引用，修复并锁回归。
- 文件：tactics/src纯规则模块、scenario-data/regions/perception/barriers；tools测试/打包/产物专项；integration-test/fixtures/tactics定向测试与TYPICAL-BATTLE三报告；doc/tactics样本/契约/计划/SPEC/P01/STATUS。根index、README、main及表现层未改，已有未跟踪资源未动。
- 验证：相关测试收口后唯一一次--all：18阶段761 passed/0 failed；典型data57/space30/ai15/battle33/skills90，90条为专项真实调用，不冒充原棋盘全技能使用。独立只读复审0确证阻断；已反证免伤清理/准备弹药疑点并加独立断言，不按错误审查推断改规则。
- 产物：重新打包1,036,668 B，SHA256 4886a31c8ce6df2195f12e2985439cd480664004fbf5429149394c044dde9ae2；50模块/35必需/41符号、零外部import、单脚本闭合、语法；真实产物后端专项11/11。__TACTICS_BACKEND__供前端模型接线。
- 未通过门禁：原地图/原资源/seed20261123基线自动路线112条操作后失败（剩2敌，英雄全倒），资源守恒/同操作重放一致通过；胜利断言失败单独记账不计761。带召唤反应扩展路线超过本轮30秒检查时限已停止，未冒充通过。IAB产物加载及防御真实扣主点/TP+25通过；旧前端跳距显示6m而规则2m、结束回合入口未推进，完整页面门禁未过，留给前端联合接线。不擅自改前端或推送。
- 目的 vs 现状：后端规则与产物专项有证据，完整胜利/前端真页门禁未达；本次为后端交接而非正式版通过。业务备份9f3d0bd，日志单向回填，README未更新，测试页与本地服务已清理。

## 2026-11-24 · 典型对局战棋 Demo 全技能逐项实现文档（768e5df）
- 核心目的：梳理《典型对局-战棋版.yaml》全量技能/物品/敌方/召唤在战棋 Demo 中复刻的后端、前端接线与特效缺口，经 `ask_question` 对齐 7 项分歧点并按用户最新修订落地 D0–D5 逐项实现文档，为后续施工提供单一验收基线。
- 行为：新增 `doc/tactics/TYPICAL-BATTLE-DEMO-PLAN.md` 并在 `doc/tactics/INDEX.md` 登记；明确 C01–C07 拍板口径（犹格索托斯不加自爆、将 `[吸蓝;power:5]` 与 `[特效:逆咒归源镜]` 合并至 `净蚀反冲` 并去除独立吸蓝、`[转火]` 单体与扇形完整两段交互、声波信标 2→3、暴击按原版整技倍率覆盖全槽、`克虏伯1918型 [加速:3]` 保留原意、优先我方 27 显式特效且敌方/召唤走升级通用模板、视野暂不隐藏留 P08）。
- 文件：`doc/tactics/TYPICAL-BATTLE-DEMO-PLAN.md`、`doc/tactics/INDEX.md`；本轮纯文档，未改任何业务源码、YAML 样本、单文件产物与根 README，其余工作区已有未提交变更与未跟踪文件均未触碰。
- 验证：纯文档轮次（AGENTS.md §七），无需打包与回归；已复核全文无遗留占位符、口径与最新修订一致。
- 目的 vs 现状：一致——完整逐项实现文档已落盘并纳入索引，待用户批准计划后按 D0→D5 分阶段施工。

## 2026-11-24 · 五项反馈修复与相关工作区完整备份（ea89071）
- 核心目的：修正技能伤害/非伤害分类、敌方无差别技能的阵营收益与埃利奥特造雾数值，核对玛德琳移动及北厅大型敌人行动；不擅自扩展感知或修改地图。
- 行为：菜单通过 extract-rpg-ui 宿主适配复用 skillSlots.attack（伤害类别/混合槽，独立于主辅点；纯眩晕归非伤害）；AI 对友军伤害/减益及敌方治疗不再计正收益；埃利奥特造雾改半径5/射程12，深潜者保留半径5/射程15。新增反馈组30项与真实页面报告，蓄力FX测试改用独立开局、敌方等待以解除战斗AI变化导致的施法者死亡耦合。
- 移动核对：普通寻路原本允许穿友军且禁止重叠落脚，未改移动规则/动效。真实单文件玛德琳首次移动因发现新敌人停在(13,37)；第二次经弗兰克(12,36)到(11,35)，160个步态样本峰值1.99997px、正常结束，符合既有隐匿者2px步态。未复现友军阻挡/动画回归。
- 大型敌人：伊塔库亚的眷族视距16m/移动8m、犹格索托斯之子视距18m/移动5m；开局均不见英雄。现地图2×2寻路各115落点且最南仅row16，无法经狭窄通道到南侧；可见但不可追近的情况属于地图/占格限制，未拓宽地图。
- 验证：相关组收口后唯一一次全量19阶段801/0；单文件重建1,127,296B、sha256 9285cbd0061a10e8d5525b03d810bef6b874db64ee3b5e37af2d6b141e5bca9a，产物专项14/14。IAB镜头/rAF停滞后经用户批准进入排障模式，同一权威单文件在Chrome完成穿友军→菜单选择从西班牙射击→食尸鬼B扣49HP并缓速→确认结束到索恩；运行时异常0，控制台仅favicon.ico两次404。
- 文件：tactics/src/ai.mjs、vendor/rpg-ui/rpg-ui.mjs、tools/extract-rpg-ui.cjs/run-tests.cjs/verify-typical-artifact.cjs；权威YAML/契约；feedback05与FX01夹具、FEEDBACK05-page/TYPICAL-BATTLE-artifact报告；当前重建单文件。用户另明确授权将上一轮已在工作区的main/战斗/特效/反应弹窗/样式/打包相关施工一并备份，未触碰无关未跟踪文件、根index与README，未推送。
- 目的 vs 现状：本轮反馈的分类/AI/数值修复及单文件战斗流程通过；移动核对无确证回归。上一轮四新技能完整三阶段视觉/时长音量、反应/舍身/看破外观验收仍未完成，完整状态备份不等于上一轮验收通过或正式发布。业务ea89071，日志单向回填。

## 2026-11-24 · 典型对局战棋 Demo D0–D4 全技能规则/前端/特效实施（6b77ecf）
- 核心目的：按 `TYPICAL-BATTLE-DEMO-PLAN.md` 落地 D0–D4，使《典型对局-战棋版.yaml》全量技能规则、Demo 前端接线与 27 项显式特效（+通用兜底/敌方/召唤模板）接入战棋生产链与单文件产物。
- 行为：
  - D0 样本与契约：`典型对局-战棋版.yaml` 将 `[吸蓝;power:5]`/`[特效:逆咒归源镜]` 合并至 `净蚀反冲`、`逆咒归源镜` 仅留绑定次数载体、声波信标 2→3、补录 `meta.决策记录`；同步 `TYPICAL-BATTLE-CONTRACT.md`。
  - D1 后端：`effect-handlers`/`battle` 实现整技暴击倍率（覆盖非自盲减益/治疗/护盾/吸蓝等）、`净蚀反冲` 看破吸蓝结果透传与纯载体道具拦截、`beginAttack` 交互式两段 `[转火]`（`retarget-request` 支持单体切目标与扇形重调朝向，传 `null` 向后兼容）、`parser` 对象路径 `[智慧]` 回填 `isWise`、`doEnemySelfDestruct` emit `self-destruct` 事件与 `beginAttack` 透传 `events`。
  - D2 前端：`ui-shell` 接入 `getHeroItemBindings`/`skillHasBarrierTag`/`prepareGroupedItemSkill` 与 `召唤` 范围胶囊；`range-overlay` 支持召唤落点轮廓预览；`main` 新增 `syncDynamicUnits`（召唤实时入场）、父子道具传子技能、冲锋/击退显示锁、两段转火浮层与悬停/点击交互、修复重复 `endTurn` 键；`action-director` 新增 `syncBarriers`、`syncPreparations`、冲锋/击退补间与自爆火环演出。
  - D3/D4 特效：`fx-registry` 扩展 `damageCategories`/`hasChargeDash`/`isMixedSlots`/`barrierSub`/`isAllyOnly`/`isDebuffOnly` 与反应分类；`fx-library` 补齐 14 项通用兜底/敌方/召唤/反应条目及 21 项待移植显式特效 + `圣域帷幕` + 3 个延迟起手（合计 51 条目，`webm` 加异常兜底）。
- 文件：`doc/tactics/典型对局-战棋版.yaml`、`TYPICAL-BATTLE-CONTRACT.md`、`tactics/src/{parser,effect-handlers,battle,fx-registry,fx-library,action-director,range-overlay,ui-shell,main}.mjs`、`integration-test/fixtures/tactics/typical-skills-node-cases.mjs`、`tactics/mvp-standalone.html`、`integration-test/fixtures/tactics/reports/TYPICAL-BATTLE-artifact.json`。未触碰根目录回合制文件与无关未跟踪文件。
- 验证：唯一一次源码全量 `node tactics/tools/run-tests.cjs --all` 19 阶段 **808 passed / 0 failed**（含 D1 7 项新单测与全部 51 个特效条目 `TFX-01` 预算断言）；重建 `tactics/mvp-standalone.html`（1,176,495 B，51 模块，0 warning，sha256 `7283e44155fee92e073c3f480571bbe4cb19f2f38b978781cbdea4ec1d420e80`），产物专项断言 **14/14 passed**。真页交互门禁：内置浏览器子代理完成页面 200 加载与玛德琳攻击菜单打开，随后因服务器 `503 No capacity` 中断，完整真页全流程（召唤/结界/转火/自爆等实机目视）留待实机补验，不冒充通过。
- 目的 vs 现状：D0–D4 代码、全量源码回归与单文件产物断言全部达成；完整真页交互门禁受上游模型 503 容量不足影响尚未闭环。

## 2026-11-24 · 转火规则修复与唯一显式特效标签、原版基础 SVG 接线（c5c6e1a）
- 核心目的：先修已确证的战斗 bug，再采用用户确认的唯一演出协议 `[特效:xxx] → 注册表 → 动画`；保留伤害结算分类，不保留旧括号演出识别或属性/范围猜测路线，不重做全部传奇美术。
- 规则：新增不验费用的 `previewRetarget(skill, aim, casterId, slotIndex)`，地图悬停/点击使用当前段校验；AI 默认不等待玩家转火，续段按实时位置重新查询并同步 aim/facing/cells；结果记录真实 shots/shotIndex，包括空发。取消驱动以独立取消信号结清等待，换场/销毁清转火浮层。反击接入整技暴击；单体致死反击中止，群体已提交同一发保留目标名单、后续发停止。公开 endTurn 拒绝忙状态与非玩家回合。
- 演出：fxTag 成为动作/准备/反应唯一分发依据；缺失/未知动作标签使用中性命中反馈。15 类基础 SVG 复用 vendor 原版函数，枪击按真实发序，霰弹方向读取每段实际瞄准且空方向锚不造命中；群体爆炸/火焰/冰霜/雷击按规则爆心/半径/作用格定位。vendor 必要宿主参数补丁同步提取器，根 index.html 只读。补接舍身内部第二次反应的显式标签。
- 数据与编辑：典型样本 93 条、演示 32 条有效 fxTag，纯绑定载体不加演出；合法标签共 60 项，由 getFxTagOptions 同时供编辑器现有下拉与 list-fx-tags 脚本，更新契约与用户要求改写的计划。编辑保存补齐召唤射程字段、典型单位外层名字路径、库存 count 保真；同名 YAML 技能仅在本场覆写 fxTag，不改伤害/费用等规则。
- 定向验证：典型技能 108、典型战斗 33、数据 57、FX01 39、AV 最终 52、MVP 56、P07 21、rules02-ui 最终 47 等相关组通过。第一次 --all 在旧 P07 已提交群攻名单断言失败；按原规则收窄致死修复后只复跑相关组。执行失误：verify-demo.cjs 被当作产物检查调用，实际内部额外执行 --all，834 passed/0 failed，但包装器因硬编码四阶段错误返回非零；已移除过时阶段数条件且未再次全量。后续编辑器/结束回合增补仅定向验证，不能把 834 报告视为最终源码指纹。
- 产物：最终自包含单文件 1,179,975 B，sha256 `2dbb6536679521d745813f10c4b38138e39ffd447f9b41181863aecb2f116d5f`；打包门禁与新增显式协议/逐发/编辑器/区域适配专项共 18/18 通过。
- 真页证据：IAB 多文件实际菜单→地图选点→Enter，原版枪击调用三次、弹药30→27、main=0、busy=false；单文件转火在 main=0 时点击第二目标，两段分别扣92/58HP、提示回收、busy=false、未捕获页面异常为空。最后一次结束回合 guard 增补前的产物实际编辑保存得到冰霜标签，远程/枪击槽/威力75/弹药45保持不变。各用例测试版本与限制记录在 FX-TAG-2026-11-24-browser.json，不把较早产物用例冒充最终产物全流程。
- 未完成门禁：IAB 截图超时，全部基础特效目视比对、完整动画时序、相机缩放和节点回收未验；最终 guard 增补后的完整真实战斗流程仍待补验。内置浏览器没有擅自切换真 Chrome。只读独立审查发现问题后已修复，最后复核无新增明确阻断；页面发现的身份/范围保存问题另作真实验证。
- 文件：tactics/src/{battle,main,action-director,fx-registry,fx-library,demo-fixture,editor-panel}.mjs、vendor/rpg-av/rpg-av.mjs、tools/{extract-rpg-av,list-fx-tags,verify-demo,verify-typical-artifact}、重建单文件；典型 YAML/契约/计划/INDEX；规则与 FX/AV 定向夹具及测试报告。无关未跟踪文件、根 index/README 未修改，未推送。
- 目的 vs 现状：规则修复、唯一标签与原版基础调用已落地，相关回归及产物专项通过；视觉和最终完整真页门禁仍待验，因此本提交是可追溯业务备份，不宣称全部验收完成。业务 c5c6e1a，日志单向回填。

## 2026-11-24 · 原版通用增益/回复 SVG、粒子与真实采样移植（ce19776）
- 核心目的：将根 index.html 已有辅助反馈完整复用到战棋真实受益单位，不重设计光环、不以同名注册或飘字代替原版主体；唯一身份协议仍为 `[特效:xxx] → fxTag → 注册表 → 动画`。
- 原版核对：真实入口 playSVGEffect（index.html:18146）；heal/buff/shield/mpHeal 四模板（18172—18176）和 anim-heal/anim-buff/anim-shield/anim-mp、spawnHealParticles 原样提取。攻击/速度为 buff+atkUp，瞄准 buff+hitUp，闪避及普通净化 buff+defUp，防御 shield+defUp，HP heal+hpHeal，MP/TP共用 mpHeal+mpHeal，护盾 shield+shieldUp。原版没有上述每个属性的独立图形，普通净化无负面也播共用反馈；不引入专属净化中的合成音效。
- 实现：提取器新增 playGenericSupportFx 实体宿主入口并同步生成 vendor JS/CSS；屏幕锚点换成既有 rectSymbol 世界舞台坐标，使用原版粒子及真实音频管理器，音量恢复原版默认0.5。原版余韵并行等待，句柄自然完成true/取消false，换代清场收回SVG/粒子/音频。
- 通用条目：升级单体回复、群体回复、群体增益及再动加速的增益槽，选中显式标签后只读取真实effects；每个受益目标一拍、间隔200ms，同拍按图形及音频键去重，原效果对象只揭示一次。先启动回复及溢出盾反馈再同拍揭示；飘字消费后端value/crit/overheal，不重新掷骰或算暴击。
- 接线：导演镜头名单包含真实effects目标；捕获原scope，在回调及演出结束检查代际，取消后不补揭旧效果到同ID新单位，scope不存在时直接拒绝演出。显示层逐条推进HP/MP/TP/盾后端增量，施法者MP/TP费用与待揭回复分开。典型对局重建从持久roster按名字回读英雄技能及道具子技能fxTag，不覆写其他规则字段；编辑器及合法名清单仍使用getFxTagOptions，无新增UI入口。
- 样本：现有受影响技能、道具子技能、敌方和召唤辅助已有合法显式标签，因此没有修改其伤害、费用、持续时间或库存。新增support-live.yaml仅为可重复导入的验收对局，覆盖九项明确标签技能，不作为生产技能更改。
- 验证：相关FX01最终48/48（含真实导演取消/无scope及持久重建行为）通过，语法与提取器--check通过。源码--all严格只执行一次，审查修正前841项通过；修正后只复跑相关测试，不冒称841为最终代码指纹。git diff --check因原样提取的粒子函数6处空白行尾空格返回2，未改根原版或为了格式检查改变提取内容。
- 独立审查：发现旧scope串写、句柄取消未通知、典型标签刷新回退和音量偏差，均修复；复核确认主要修正并指出无scope空值边界，已补拒绝演出及行为测试通过。未将审查的静态复核当作浏览器运行证据。
- 产物：tactics/mvp-standalone.html由最终源码重建，1,186,141 B，sha256 `6a2749810787805b2abc0dc69eb43e0a89e8e74a5c80dcee4fb16595e10b3d65`；打包52关键符号/36输入断言，产物专项21/21含原版四模板、粒子、真实增量、持久回读、代际隔离及零外部import/单脚本闭合。没有调用内部会再跑全量的verify-demo.cjs。
- 真页证据：源码IAB实际loadYaml→正常菜单处理器/地图选点/Enter→beginAttack/导演：自增和他增分别buff/atkUp定位真实受益目标；单回目标20→35HP；群回真实两目标各一次heal/hpHeal，显示及后端35/50；暴击单回+20HP/盾+16，后端及显示55HP/16盾；增攻增防瞄准三效果共享buff/shield图形，后端5/6/7。截图已捕获阶段图形，但IAB旧粒子残留/调度受限，不能代替完整视觉对照。证据在SUPPORT-FX-2026-11-24-browser.json。
- 未验门禁：IAB跨次调用回退旧源码页/出现about:blank，最终单文件虽可加载但开场持续busy，未成功完成至少一条最终产物战斗流程；编辑器实际保存再刷新未完成；MP/TP/速度/闪避/净化逐项真页流程未完成；原版与战棋完整动画/相机缩放/粒子消退和真实采样可用性/实际听感未完成；真Chrome与安卓模拟器未测。未擅自切换外部浏览器或启动模拟器，未将产物专项冒充真实页面门禁。
- 文件：tactics/src/{fx-library,action-director,main}.mjs、vendor/rpg-av JS/CSS、tools/{extract-rpg-av,build-demo-html,verify-typical-artifact}.cjs、重建单文件、FX01定向夹具、support-live.yaml及两项验证报告。根index.html仅只读参照，README和无关未跟踪文件未动，无推送。
- 目的 vs 现状：原版通用辅助表现与真实受益结果接线已落地，定向与产物专项通过；完整视觉、编辑真页和最终单文件交互仍待验，因此本轮为明确带未验门禁的业务备份，不报告全部验收完成。业务ce19776，日志单向回填。

## 2026-11-24 · 特效层级、发现截停说明、连发与鹿弹自爆卡死修复（e338d7d）
- 核心目的：响应用户四项反馈，让演出在角色上方、查明玛德琳左上移动停在弗兰克旁及平移观感、连发保留间隔且相邻枪声不重复、弗兰克鹿弹击杀后正常结束，不以强制解锁或超时跳过掩盖错误。
- 层级：units父层显式z=2，原版rpg-av舞台z=3，导演top=4/ground=1；解决舞台transform形成堆叠上下文、子z-index再高仍被角色盖住的问题。世界坐标、相机缩放、地表阴影保持原结构，未新增UI入口。
- 移动根因：权威数据规则复现并由用户授权的真Chrome同产物复测，玛德琳14,37向11,34移动，在13,36（弗兰克旁）发现食尸鬼A，stoppedOnDiscovery=true、余量6.5858m；不是预算耗尽或自动绕到邻格。保留发现敌人暂停规则，返回及事件补discoveredIds，现有记录显示发现谁、暂停及余量。历史职业参数未被删，真页setHop连续非零、t-cls-stealth生效；隐匿者原设仅2px轻微起伏，保留而未擅自提高幅度或重做动画。
- 移动边界：playMove捕获moveScope和view，在镜头等待后、回调与收尾验证代际，取消后不再向新视图写终点或反馈；原正常动画仍交还权威位置。
- 连发与枪声：枪击/霰弹按上一发原版身份句柄完成后进入下一发，保留200/220ms段间等待，不再同时积累多发Promise。原index三采样纯随机并无相邻去重，战棋按用户要求从排除上一声后的两项随机；保留gunshot1/2/3和霰弹xiandan，清场或token换代重置历史。补丁同步提取器并重新生成，--check通过，根index只读。
- 鹿弹卡死确证：真Chrome在权威对局正常推进至弗兰克，鹿弹二连发第一段后等待真实转火提示；点击沿用后击杀食尸鬼A并触发自爆，旧产物报Uncaught(in promise) TypeError: undefined is not iterable，栈shake→playAttack→playAttackResult→firePending。自爆使用medium而导演SHAKE仅有light/heavy/quake；补medium[250ms,5px]。该档使用导演WAAPI，不需要增添另一套arcane-shake CSS；未添加任何自动解锁/超时或修改死亡、复活、弹药规则。
- 验证：新增TAV-07四项行为测试（权威截停+日志、真实潜行步态、真实导演自爆震动完成、镜头等待时换scope拒绝旧移动）；AV56、FX01 49、典型战斗33等相关回归通过。源码--all严格一次849 passed；独立只读审查无阻断；diff --check通过。产物专项首次仅中文ASCII转义导致静态includes误报，改用产物真实后端移动日志验语义后25/25通过，未再跑全量或verify-demo。
- 产物：最终tactics/mvp-standalone.html为1,187,053 B，sha256 `abeed4f68d1b602334c84b8ddd64c0d5c1a7c2ca284dfdd0ed94e6cd66657678`，52符号/36输入打包门禁。真实Chrome加载最终产物并重走完整鹿弹流程：两段均作用真实食尸鬼名单，A复活39HP后再次击杀、自爆事件出现，鹿弹12→10、main1→0、busy=false，控制台无错误/警告；实际计算层级units2/rpg3/top4。证据在FEEDBACK-2026-11-24-browser.json，完成最终单文件至少一条真实战斗流程门禁。
- 限制与边界：初次Chrome工具profile占用，用户关闭测试浏览器并明确允许重启后接入；未操作原来的浏览器进程。层级/步态代理服务访问被拒后由主代理完成，不冒报该代理审查通过。截图项目路径被MCP拒绝，使用其默认临时截图而未绕过目录限制。未做安卓模拟器或全职业/全部技能视听组合验收，上一轮辅助全部视觉及编辑刷新验证未在本轮全量补齐。未修改README、根index或无关未跟踪文件，未推送。
- 目的 vs 现状：四项反馈已获确证解释或修复，相关/唯一全量/最终产物专项与真实击杀自爆流程通过；保留原职业轻微步态及合法发现截停，不以改变规则伪造连续走完。业务e338d7d，日志单向回填。

## 2026-11-24 · 原版整体受击接线、现代数字、八档前摇、显式技能组与头像缩放（6626013）
- 核心目的：继续复用原版受击分档/卡肉/飘血/音效，而不是仅有函数或另造特效；改善现有伤害数字，补齐emoji前摇、父子组卡和近远头像可读性。用户确认“数值主导、类型点缀”，并明确允许保留原版已有采样与合成点缀，真Chrome排障终验。
- 受击数据：battle只补结算描述中的outcome、原伤、实际最大HP、盾前后/吸收、crit、穿透和真实伤害类别，不改计算、掷骰或扣资源。导演buildHitFeedback透传，结界/中止不再冒充闪避；零免伤值不盖掉原伤分档。按实际shotIndex分别建音频wave，群体同发归波/卡肉/震动去重，不把整技多发混成一波。显示盾值在接触拍点推进。
- 原版保留与数字适配：classifyHit低于10%/低于50%/重创三档、重创60ms卡肉、血雾2/6/11与血滴4/10/18、后仰/闪白、格挡/破盾/暴击/爆发及原音频链保留。数字改系统字形、高对比实际性质颜色/小标记、HP盾分层、穿透点缀；锚点改真实单位世界位置，不再使用原版屏幕边栏/innerWidth钳制。真实录像发现标签高度使连续数字拥挤后，只把stackSlot改为上下44px错位并保留原750ms连续判定/动画时序。修改均同步提取器重建，未手改根index。
- 八档前摇：原版实际为七类新增＋红单体基线，vendor已有全体，导演原来只分红黄紫×单群；补粉色增益/黑色妨害/无前摇分支，空间只读显式范围，仍330ms出手。sprite字号用--d（42/56px）使原em位移相对主体生效，补八档前摇及三档格挡采样预热；不从此分类更改已选fxTag身份。
- 父子组：中文子技能、规范children、旧嵌套/旧平铺头及混合输入统一解析，父children与全局子行同引用，不按连字符猜组；JSON存档合并后linkSkillGroupRows重连真实平铺对象。复用原版组卡，分类递归子项，父项只展开不执行，编辑保存保留树与原名。默认四英雄早有准备及埃利奥特火舞术改显式父子，完整子技能名/标签/费用/动作/绑定不改。初版子代理违反合同裁名前缀及过度转义，相关测试确实失败；已删除错误逻辑、恢复原名并以明确结构修复，未掩盖失败。
- 头像：初建与onCameraChange统一avatarScaleForZoom=1/min(1,scale)，近景随地图放大、远景才反缩放保持42/56px；名牌/血条/朝向同主体保持可读，保留真实占地及世界特效父层。
- 定向与唯一全量：新增hit-feedback最终43项（真实原函数/粒子/数字、规则字段、wave、缩放及组结构）、AV56、FX01 49、P01 167、典型技能108与配置60等相关通过。源码--all严格只一次894 passed，发生在最后三英雄早有准备样本结构补齐之前；之后仅复跑相关108/60/43与产物专项，不将894冒报最终数据指纹、不再调用verify-demo或第二次全量。diff --check通过。
- 独立审查：一般子代理服务两次访问拒绝，用户明确授权备用agy只读交Gemini；本机实际模型是gemini-3.8-flash-medium（非指南Hydrogen）。检查JSON SUCCESS/有效response/空stderr后接受“无阻断”，不采用未证实的隐藏节点除零兜底或预留阵营身份分支，仅去掉无效side实参；同会话错位复核无确定阻断。完整证据在HIT-2026-11-24-review.json与review-followup.json，不假称审查运行测试。
- 最终产物：tactics/mvp-standalone.html为1,194,003 B，sha256 `ed907290ea5429aab9bf5db190402e367d0922a833b935dbdca9d9bac98e4c3f`；57符号/36输入门禁，专项29/29（含真正产物规则受击字段、四英雄父子引用、零外部import/单脚本闭合）通过。
- 真Chrome证据：用户当前真实切片正常动作，轻伤8/400→tier1/hit_1a，中档48/49/49对400HP→tier2/hit_2b-c-b，重创40/40→tier3/60ms/hit_3a；真实原伤/扣血及采样解码成功。录像主模型不能直接读视频，使用本机ffmpeg在独立临时目录提取有限图片帧确认数字/原版闪光/飘血后仰，未外发视频。真实emoji守卫逐项播放八类原动画，animationName/关键帧9或7及56px字号和八采样调用确认；实际AI斥候red-single/font42另有记录，不冒称八种全由AI技能发生。
- 最终页面门禁：切片父卡火舞术展开两子，实际子卡进入压缩爆燃，父卡/仅选择子卡不扣费，发动仅MP110→105/main1→0。真实设置保存并重置→重载，原子名称/费用/全局4/5及13/14索引保留。首次最终版切片战斗轻伤12、中档57/57/44，新数字worldY分别1830.56/1769.44/1891.67，busy=false。最后补齐三英雄样本后再加载最终默认产物，四英雄组真实可见、玛德琳展开并用辅子提前瞄准→main2/aux0，再真实三连发46/39/38、弹药30→27、busy=false。无运行时JS异常；仅favicon.ico 404，不改无关图标来抹掉报错。
- 范围与未验：源码{battle,action-director,main,parser,unit-view,av-host}、tactics.css、两vendor/两提取器、样本YAML、定向测试/runner/构建专项及报告；根index只读、README/无关未跟踪文件未改，未推送。未为凑覆盖伪造召唤物，实际我方召唤新实体八类全技能实战、所有纯盾/破盾/暴击/爆发与颜色组合/伤害旁路及安卓模拟器仍未逐项目视或听感验收。相关逻辑/原函数已测，不报告所有组合全验。
- 目的 vs 现状：原版基础受击链和实际数据分档已完整接线，数字/八档前摇/显式父子/头像比例已实现并有真实页面与产物证据；保留上述组合未验边界，业务6626013单向日志回填。

## 2026-11-24 · 原版状态/变种生命周期迁移与实际结果事件（8c20066）
- 核心目的：原样复用燃烧/中毒/麻痹持续及tick/解除、蜕皮/狂暴/复活全生命周期与受击锁，不增加专有角色技能、UI或规则算值改动。
- 变更：extract-rpg-av去除clearStatusLayers/clearVariantState空桩，补七入口与messy段常量闭包，保留原版SVG/CSS/owner/采样/锁；舞台矩形与宽高补丁随真实扩大闭包精确核对命中数。av-host用getEffectiveUnit活跃buff/永久期限映射，实际原版函数同步持久层并按事件去重消费；main刷新及导演接触/收尾接线，清场仍走原版取消链。
- 结果事件：battle实际蜕皮回血、复活致死拦截、clock毒燃tick、麻痹跳行动、移除/到期处补纯结果emit；蜕皮/复活不按HP变化猜触发。狂暴依据现有rageAtkMultiplier规则输出进入/退出，Set幂等；保留snapshot视觉结果收口副作用，首次进入透传hasRageNarrated标记，不改倍率和结算。
- 涉及文件：tactics/src/{battle,main,action-director,av-host}.mjs、vendor/rpg-av两生成文件、tactics/tools/{extract-rpg-av,run-tests,verify-typical-artifact}.cjs、tactics/mvp-standalone.html、integration-test/fixtures/tactics/status-variant-node-cases.mjs与hit-feedback-node-cases.mjs及reports/STATUS-VARIANT-*、TYPICAL-BATTLE-artifact.json。根index只读，README及无关未跟踪文件未动。
- 测试：唯一源码--all 912 passed（末次狂暴标记透传与4条真实锁断言补充前）；之后仅相关状态19、受击45通过。单行真实函数提取原先长度断言误判已修正，不掩盖失败；没有verify-demo或第二次全量。最终构建36输入/57符号门禁，产物专项31/31，diff --check通过。
- 独立审查：使用可用agy/claude-sonnet-4-6（模型列表没有指南Hydrogen）；首轮仅读部分源码产生两个错误P0。按真实函数反证并同会话要求小段复读，复审明确撤销并给出无阻断结论；不按误报增加防御代码。保留状态DOM重建迁移、带旧buff复活专项和完整自然战斗覆盖缺口。JSON及stderr原样保存。
- 浏览器：已有8123服务IAB载入产物；真实DOM原版函数定向探针创建3持久层、burnTick/revive返回handle、复活锁true、锁内伤害数字1个、清层0/解锁false成功。探针对应前一产物288cf9d6指纹；最终标记透传后重新打包并仅相关与产物专项验证，未冒称最终页面重验。默认真实敌方首回合busy持续，真实按钮点击超时，未造替代对局或修改rAF；完整页面战斗门禁未完成。chrome-devtools连接返回已有chrome-profile占用，未关闭重启/新开隔离浏览器；需用户解除现有连接占用后补完整动画与真实战斗。安卓未测。
- 最终产物：1,270,442 B，sha256 `c3d7719ea6c239d0ca2b78378e83d29e5adb26c47caa1942b271602013f338fc`；完整真实报告见reports/STATUS-VARIANT-summary.json。两步git备份，业务8c20066；不amend、不push。
- 目的 vs 现状：原版生命周期代码和实际结果接线已实施且离线/定向探针通过，但最终真实浏览器战斗与完整视觉仍阻塞，明确不报告交付门禁全绿。

## 2026-11-24 · 最终产物Chrome真实行动流程补验（b411412）
- 核心目的：补真实战斗与状态变异视觉门禁，严格区分自然触发、直接函数探针和未验项。
- 行为/涉及文件：仅更新 integration-test/fixtures/tactics/reports/STATUS-VARIANT-summary.json；源码与产物未修改。page1真实8123单文件；sha256核对仍为c3d7719ea6c239d0ca2b78378e83d29e5adb26c47caa1942b271602013f338fc。
- 自然证据：玛德琳移动发现截停→从西班牙射击食尸鬼B-48HP/缓速2回/扣弹药→正常二次确认结束；索恩砷弹自然闪避，中毒未施加；AI食尸鬼B攻击反应弹窗跳过→玛德琳-43HP→AI河童之息→t200埃利奥特，busy=false。非玩家回合隐藏文本opacity0/pointerEvents none，不是锁错，不修改UI。结束确认仅2200ms，工具单步延迟超过窗口，重新查询真实按钮两次click完成确认。
- 视觉/音频：真实wheel缩放1.06976→0.40216，截图圆标/血条/菜单正常；资源audio running/unlocked/全部加载ok，未冒称听感。控制台初始两次404，未定位URL，不能报零错。本轮没有直接函数状态探针。
- 缺口/原因：砷弹闪避未施毒；火舞目标未锁定未发动；召雷TP不足；蜕壳/狂暴/复活自然生命周期、变异期受击数字盾暴击缩放及完整对局胜利均未通过。请求用户在当前埃利奥特回合选真实可见食尸鬼发动火舞；其余需真实命中/TP积累及相应真实标签对局，严禁伪造替代。
- 校验：报告JSON有效、git diff --check通过；不重跑唯一全量、不重建未变更产物、不操作其他浏览器/用户环境、不push。验证业务备份b411412，随后单向日志提交。
- 目的 vs 现状：真实基础战斗流程已通过、锁疑点已排除，完整状态变异视觉仍待实证，不将有限补验冒称全绿。

## 2026-11-24 · Chrome favicon与交接证据补正（7f4c121）
- 核心目的：补齐真实网络归因及交接状态，不继续操作页面。
- 行为/涉及文件：仅补STATUS-VARIANT-summary.json及战棋日志索引；主代理核对reqid7/8均GET http://127.0.0.1:8123/favicon.ico 404，console msgid1累计2次，不是战斗脚本或音频错误。最新snapshot埃利奥特回合、精准流火待选目标，提示目标不在本人视野内。
- private来源核对：仅列文件名元数据private/我想说的话.txt，3134 bytes，mtime 2026-11-24 09:49；未读取私有内容。元数据不能确定创建者/来源，不归因于MCP报告写入失败，不改动该目录。
- 校验/备份：JSON有效、diff --check通过；稳定报告提交7f4c121后单向日志提交，不amend、不push，不改源码/产物。
- 目的 vs 现状：404归因已确认，状态变异视觉仍未验；来源不明明确保留，不作推断。

## 2026-11-25 · P07 敌方自然充能分离、温切斯特父子、WebM 抠黑底、L3/L4 屏幕氛围、buff 串行、击杀特写/Cut-in/召唤接线（5107706）
- 核心目的：推进新玩法前尽量还原原版战斗规则与视听；视听优先但不牺牲施术者/目标/范围/反应/命中/伤害/位移/死亡可读性。用户中途选择跳过阶段 E（召唤自动守护、抗性/抑疗/结界专用反馈），直接全量与验收。
- A 规则：敌方 [Charge:N] 改独立 charges[id].current，只认首个 charge 技能、仅 AI 单位；自然行动末（endAction/麻痹跳过）+1，行动起手已满不增长，再动/额外主点/多段不重复；未满 AI 不可用（不进 preparing、不占加速库存），满后 planEnemyAction 优先尝试大招、放不出则保留；预检与付费后才清空并 emit charge-released。删去 charge-cycle 时钟周期（原 inventory 混用）。普通 [延迟] 准备不变；编辑器文案“蓄力”→“充能”。按用户口径每自然回合增长一次，不照搬原版低蓝回蓝漏增。
- A 温切斯特：样本 YAML 改纯父组「温切斯特」+ 子技能 鹿弹二连发/独头二连发，弹药绑定改子名；典型对局.txt:49 同步（未跟踪文件，不入 git）。父组 isGroup 既有施放拦截保留，转火/fxTag/槽序未动。
- B：fx-library webm() 移植原版 playWebMFX 逐帧抠黑底（<12 透明/12–80 渐进/尾 0.35s 渐隐，像素读取失败才 screen），播完释放；坏死雾/圣域帷幕短边=真实直径（cover），生体流转 2.2→4.4m。新增 screen-atmos.mjs：L3/L4 四边围压（22%/28%）+ 同风格母题 SVG + 真实半径范围环；蓄势→爆发→首个揭示即降透明→余韵外撤；L4 蓄势期技能身份卡、爆发前退场。导演仅 L3/L4 启动。
- C：playSupportEffects 按后端 effects 顺序逐目标串行（A 句柄完成才播 B，保持原 200ms 拍点），补原版 debuff/taunt SVG 与 hitDown/defDown 音色；提取器辅助 SVG 分支 4→6。
- D：提取器原样带入 playExecutionAnimation/playEnemyUltimateCutin（挂 iframe 视口屏幕宿主、计时登记可随 clearArcaneFx/setToken 清理）及召唤三瞬与 clearSummonState；CSS 补模板内联 animation 简写与 Tailwind 任意值/负值类。导演：result.summons 真实落点 playSummonEnter、召唤物真实死亡 playSummonExit、自爆后再等 620ms；英雄施术整技能聚合真实死亡（复活存活不计）只播一次击杀特写，排在攻击演出/反应/自爆之后、胜利弹窗之前；main 满充能 Cut-in → 原前摇 → 结算。满充能红色威压辉光。
- 真实页面发现并修复：首版产物启动白屏 ReferenceError summonEnterPending（召唤段引用 arcane 外顶层集合未带入，Node 回归无工厂实例化未覆盖）；extract-rpg-av 原样 topBlock 带入并加 TP7AV-X 断言。
- 测试：新增 p07-av 13 + p07-av-fx 32（WebM 阈值/渐隐/降级/释放、氛围结构与降透明、buff 串行顺序与同目标多槽、击杀聚合、召唤结果、提取入包与清理）；旧用例按新语义调整（p07 charge→delay、typical-ai/typical-battle、rules02-passive B3/B8、typical-data/skills 子技能名），并恢复一处自己误改的 200ms 拍点。唯一全量 --all 962 passed（summonEnterPending 修复前）；修复后仅复跑相关 p07-av-fx 32/p07-av 13/av 56/status-variant 19/hit-feedback 45/fx01 49 与产物专项。
- 产物：tactics/mvp-standalone.html 1,365,116 B，sha256 `c00b68981523be1ec4b46f34a4023895f332d1072c09351d467d3dd406919f2b`；专项 31/31，单脚本闭合、零外部 import，新模块与符号入包。
- 真 Chrome（用户授权，本地 8123，验收后已停服务）：两精英自然充能 1/4→4/4、1/2→2/2，inventory 始终 0；因墙/雾视野不可达满充能保持不白耗；定向探针仅移位犹格（自然 2/2）后：Cut-in→前摇→反应×2→埃利奥特-87/弗兰克-90→充能 2→0、释放 1 次。温切斯特父卡展开两子、独头两段 -68/-57+降防、独头弹 12→10 鹿弹不动。压缩爆燃范围环=2R×镜头缩放居中瞄点，边带 0→0.78→0.25→外撤，fire.webm Canvas 抠黑底未降级。寂静指令弗兰克→玛德琳 SVG 串行 ≈1.3s。柯尔特三连发：复活不计→真正死亡→自爆→远程“处决”特写 1 次。重开零残留；全程零运行时异常。证据 reports/P07AV-2026-11-25-browser.json。
- 未完成/未验：阶段 E 全部（召唤自动守护入口、抗性/抑疗/结界专用反馈）；听觉效果待验（仅调用链）；L4 身份卡、近战/法术/多目标击杀特写、生体流转尺寸、坏死雾缩放平移、召唤三瞬未在页面实测；边缘压缩峰值帧缺清晰截图。README 未改，不 push。
- 目的 vs 现状：A–D 规则与视听主链已实现并有源码、产物与真实页面证据，E 与若干视听组合留待下轮，不报告全部视听完成。

## 2026-11-25 · 战棋新特效研发纯净空白母版（ae0ba3d）
- 核心目的：对标回合制 `demo-skill-vfx-template.html`，提供战棋版独立单文件空白特效演练母版及配套明文工作台（分两轮交付：本轮为不含 50+ 既有 fxTag 条目的纯净前置版）。
- 变更文件：新增 `tactics/src/vfx-primitives.mjs`（与 `fx-library.mjs` 同名同参纯画法原语）、`tactics/src/vfx-template-host.mjs`（裁剪上层立柱大厅 20m×13m 闭合四面墙单房间、上半场 6 敌含 2 个 2×2 精英+下半场 4 友站位、空白演练面板与契约预检、`fitHall()` 全览居中）、`tactics/vfx-workbench.mjs`、`tactics/vfx-template.html`、`tactics/tools/build-vfx-template.cjs`（`strip-fx-library` 插件剥离 50+ 条目且关闭行号/标识符压缩，拼接底部明文 `<style id="vfx-custom-css">` 与 `<script id="vfx-workbench">`），生成单文件产物 `tactics/demo-skill-vfx-template.html`（1,247,995 B，39 模块，`fxLibraryIncluded: false`）。
- 决策原因：采用“IIFE 底座（保留换行与原函数名）+ 底部明文工作台”双段式单文件架构，零修改现有正式源码；内置浏览器实机复查通过（零 JS 报错、零 404、开场全览居中、10 名单位站位无重叠、空白面板与重置按钮正常）并留页交付。

## 2026-11-25 · 修复特效空白母版敌方靶子头像缺失（250b204）
- 核心目的：解决特效空白母版中 6 名敌方靶子显示“头像缺失”的问题。
- 变更文件：`tactics/src/vfx-template-host.mjs`、`tactics/demo-skill-vfx-template.html`。
- 决策原因：`createScenarioData` 会剥离单位名前缀装饰符生成纯文本 `u.name`，导致宿主漏传 `emoji` 被 `unit-view.mjs` 误判为缺图片头像；已对齐 `main.mjs` 的 `buildTypicalViewData` 从原始 YAML 条目拆出 `emoji`/`img`/`avatarUrl`。重打单文件后内置浏览器实机刷新确认：6 名敌方棋子与行动轴均正确显示 `🦈/❄️/🌌/🧟`，`.t-avatar-missing` 计数为 0，零 JS 报错、零 404，标签页保留开启。

## 2026-11-25 · 战棋完整特效工作台与双母版分工指南（48d9b37）
- 核心目的：在不要求单文件内联的前提下，建立直接引用原版最新源码、CSS 与视听资源的完整特效工作台，并明确其与纯净单文件空白母版的分工边界。
- 变更文件：扩展 `tactics/src/vfx-template-host.mjs`（支持 `registerExtra`、`prepare/reaction/fatal` 通道与 `fitHall` 导出），新增 `tactics/vfx-stage.html`、`tactics/vfx-stage.mjs`（接入 `fx-library.mjs` 全部 63 条 `DEFAULT_FX_ENTRIES`，提供命中/闪避/暴击/处决、施法者/单群目标预设与 L1–L4/身份/起手/反应分级筛选）、`tactics/启动工作台.bat`、`tactics/VFX-WORKBENCH.md`，更新 `doc/tactics/INDEX.md` 并重打 `tactics/demo-skill-vfx-template.html`（确认 `fxLibraryIncluded: false`）。
- 决策原因：多文件工作台直连原版源码与资源，原版改动后免打包刷新即生效；纯净单文件母版专注新特效零干扰研发与独立归档。内置浏览器实机复查通过（零 JS 报错、零 404、开场全览居中、63 条 fxTag 列出、L3 筛选 14 条与 `火焰01` 实播 4 群聚杂兵正常、面板无右侧溢出、重置按钮正常）并留页交付。

## 2026-11-25 · 修复特效工作台增益/辅助类点自身误扣 120 伤害（9eee25f）
- 核心目的：修复在完整工作台选中「自身」目标播放增益/回复/护盾/辅助类特效时，因 mock `result.hits` 固定附带 120 点伤害导致自身掉血的问题。
- 变更文件：`tactics/src/vfx-template-host.mjs`、`tactics/vfx-stage.mjs`、同步重打 `tactics/demo-skill-vfx-template.html`（`fxLibraryIncluded: false`）。
- 决策原因：`buildMockResult` 支持 `card.noDamage`（置空 `hits`）；`vfx-stage.mjs` 按 `SUPPORT_FX_KINDS` 识别治疗/护盾/增益/减益/召唤结界类条目并传 `noDamage: true` 与对应 `extraEffects`。内置浏览器实测选中「自身」连续播放 `群体增益` 与 `再动加速` 后埃利奥特血量保持 100/100，零 JS 报错。

## 2026-11-25 · 守护/结界后端合入 + P07 视听第二轮：击杀特写置顶、逐标签串行 buff、18 套 L3/L4 屏幕主演出、生体流转、圣光/雷击/重狙 WebM、原版灵风术（9b4223a）
- 核心目的：按用户逐项反馈打磨视听，并与另一施工者已完成但未提交的守护/结界后端（guard.mjs、barriers、battle 等及 guard-* 测试，见 GUARD-BARRIER-FRONTEND-HANDOFF.md）一并提交（用户确认合并提交，因两边同改 action-director/build-demo-html/run-tests/产物）。
- 击杀特写/Cut-in：av-host 屏幕宿主改为 iframe body 末尾 position:fixed z-index 2147483000、pointer-events:none，对齐原版 body 级 z-[200] 压住全部 UI；destroy 移除。
- buff：playSupportEffects 改为原版 executeSkillAction 口径——后端 effects 按槽→目标顺序，每个真实效果条目独立播一次原版 SVG/音色并在接触拍点揭示，句柄完成后隔 60ms 播下一条（寂静指令＝增攻 A→B、瞄准 A→B 两轮）；溢出转盾单独一拍。TFX-01 与 TP7AV-S 断言随之更新。
- 屏幕主演出：新增 screen-showpiece.mjs，18 个 fullscreen L3/L4 条目各一套独立 SVG 构图（外缘 ~30% 环带、中心留阅读窗、渐变辉光无硬线框、uid 防冲突），蓄势→条目真实冲击拍点 ctx.atmos.burst()（替代原通用径向闪屏，压缩爆燃实测 1368ms 同拍）→首个揭示降透明→余韵外撤；有主演出时边带只留暗场；发光构图 screen 混合，暗色 normal；screen-atmos 去 z-index 叠放上下文。火舌由粗描边改为贴边渐变火苗。
- 生体流转：两拍心搏（心核收缩、八道血管描画、∞ 血珠环流、心电迹线、四道冲击环），第二拍揭示再动；压到 1180ms 守 L2 预算。
- 用户截图反馈：圣光01 去屏幕中央光柱/十字/中央光束（避免双重攻击假象），原版 414.webm 以 min(视口)×1.4 锚目标于命中后 60ms 掀起（实测数字后 ~30ms）；雷击01 主雷 450.webm 同火焰01 口径 R×3.4 覆盖范围（实测 411px 覆盖 242px 范围环）；克虏伯重狙准星（镜孔/十字/密位/冲击环）以真实受击目标视口点为心，snipe-ezremove.mp4 全段 2.1s、max(min(视口)×1.5, 50% 屏面积)（实测 51%），awaitHandle 等视频播完，totalMs 3400。webm() 增加播完句柄（doneAt 取真实时长，释放只通知一次）。
- 灵风术：Demo「A 圣洁羽翼」即根 index playLingFeng 定稿，extract-rpg-av 原样入口提取（innerWidth/innerHeight 补丁计数 10→11、5→7），条目改 identity 直调，双翼拍点 quiet 揭示规则结果；B/C 对比音组为落选项未移植。工作台实测风玫瑰 535ms→疾风 1539ms→双翼 1898ms，四段原版音频加载，零错零残留。
- 调试事故：为抓爆发峰值帧在页面内劫持 setTimeout/rAF 冻结，导致浏览器操作队列卡死，停止调用浏览器工具并请用户重启 AWS Quick；之后改为只读采样。未截到的 0.7s 视频帧以采样数据为证。
- 测试：p07-av-fx 42（新增置顶宿主、18 套主演出与爆发同拍、构图互异、圣光无中柱、准星对目标、三段 WebM 口径、播完句柄、灵风原版入包与 CSS）、fx01 49 等相关通过；唯一全量 --all 1033 passed（含 guard-* 59），之后源码无改动。
- 产物：tactics/mvp-standalone.html 1,438,894 B，sha256 `e212c63bda9322059ad477b07d0956225eb8bc26aac85aa07e1fb5246fb5c3cd`；专项 31/31，守护结界产物 13/13。
- 未验：其余 15 套主演出只做挂载/零错/零残留采样，未逐一截图审美；所有声音听感待验。README 未改，不 push。
- 目的 vs 现状：用户确认三技能与灵风术“很完美”，本轮反馈全部落地；下一步舍身格挡与【肃正】结界前端演出及工作台演示按钮。

## 2026-11-25 · 舍身格挡与【肃正】结界前端演出 + 工作台守护/结界演示（935ba8c）
- 核心目的：消费已落地的守护/结界后端结果（GUARD-BARRIER-FRONTEND-HANDOFF），补齐前端演出，并在工作台加入弗兰克舍身、结界释放、敌方攻击我方等演示按钮。
- 新模块 tactics/src/guard-barrier-fx.mjs：舍身按原版 playRescueSheshen 节拍（决意 0–340ms 蓝环+光点收拢+轻步 → 335ms 出发点残影+沿后端 path 插值到 contactPoint+重步 → 到位虚线守护环），格挡在受击揭示拍点（盾弧凸面朝 origin、辉光、火花锥、双冲击环、parry_perfect、heavy 震屏、「舍身格挡」、显示层后坐），不归位；召唤守护无决意直接冲刺、medium 震屏。结界按原版 team-barrier 三主题（gold/blue/white 只读 visualIdentity）改为 center/radius 圆形穹顶：ground 穹面渐变+蜂窝网格，top 边缘辉光+流光描边+耐久徽标；受击=接触点涟漪(单 120/群 240)+蜂窝聚光+穹顶压缩+「-N」或护甲格挡；隔绝=边界点轻受击+atk2；击碎=色差闪断 200ms→184ms quake+80 片六边晶片→850ms 移除（atk1）；到期/替换淡出。
- 导演：舍身冲刺与攻击条目并行起跑（原版决意/突进先于落点），受击揭示时 revealRule(guard) 触发格挡；宿主自带 presentGuard 时由宿主承担整段（TG-DIRECTOR 契约不变）；舍身段不再叠旧「舍身承伤」反应条目；结界整体吸收的段不播目标受击。holdRegions 同时持有本次新建结界（条目爆发拍点 revealBarriers 展开）并按受击事件计数锁定显示耐久，击破先播破碎再移除；旧临时虚线圈（读 hp/sub 旧字段）替换。纳克提特障壁术/圣域帷幕在爆发拍点揭示 barrier-created。
- 工作台：控制区第 4 排六按钮（敌攻·直击玛德琳 / 弗兰克舍身·护玛德琳 / 结界释放 / 敌攻·结界受击 / 群攻·击破结界 / 减益·结界隔绝），舍身落点与结界范围耐久由真实 previewGuard / previewBarrier / damageBarrier / barrierContact 计算；弗兰克移动 5→舍身半径 2.5m 护不到 3m 外的索恩（规则拒绝），故演示改护 2m 内的玛德琳。
- 验证：新 stage guard-barrier-fx（TGB-G/B/W 20 项）；唯一全量 --all 30 stages 1053 passed 0 failed；产物 1,463,404 B sha256 `b2a0f8acf06db11d407e7ea9960965fe592c6701b0d7707007cfece9cd835c10`，专项 31/31、守护结界产物 13/13（80 符号入包）。工作台真页：结界展开 1.2s 徽标 200/200·甲40·近战克 → 受击 150/200（-50）→ 隔绝·致盲 → 群攻 -150 破碎 80 晶片、穹顶移除，零错误；舍身格挡盾弧出现、终点停在落点；产物页启动零错误。
- 未验：自动化浏览器窗口在后台时 rAF 约 2 帧/秒，舍身冲刺插值过程无法采样（逻辑与终点已验）；真实对局中玩家选择紧急格挡、施放肃正的完整流程未在真页跑；音效听感待用户实听。外部来袭投射物终点仍是目标单位而非结界边界。README 未改，不 push。
- 目的 vs 现状：一致——两项前端表现与演示按钮已落地；剩余抗性/禁疗/免疫原因演出与直接攻击结界瞄准 UI 未做。

## 2026-11-25 · UI 可读性：状态徽章 / 全效果飘字 / 单位检视卡 / 攻击预测 / 主辅角标与过滤 / 冲刺移动确认 / 右键跳跃（93e499d）
- 核心目的：所有已发生的数值变化与当前状态都能在地图上直接读到；常用操作减少点击。用户选做：A 组四项 + 检视卡、攻击预览加强、技能卡信息补全；冲刺触发=额度用完或超出剩余额度；右键两次同格起跳。
- 新模块 tactics/src/status-ui.mjs：statusBadges（原版 updateBuffUI 口径：眩晕/防卫/毒燃麻/攻防命避速/仇恨隐匿/反击/免伤/特性/护盾/蓄力，负面紫色在前，剩 1 回合闪烁，消耗型显示「1次」）、地图紧凑 4 个+N / 英雄卡完整、effectFloat（原版 registerTagHandler 文案：攻+50 3回 / 速-20 3回 / +35 HP / 驱散 N 负面…）、inspectorHtml。
- 后端只读视图：getEffectiveUnit.buffs[].remaining（时钟 statuses[_key].endAt 换算剩余回合）与 stunned；damage.mjs 新增 hitChance(A,D)（resolveHit 的精确命中概率，抽样核对误差<1%）。
- 飘字：统一在导演 revealEffect 揭示拍点按效果条目飘一条（同目标逐条上叠），覆盖攻击附带减益与辅助条目；支援演出原 SUPPORT_NUMBERS 只覆盖 HP/MP/TP/盾，已删除。
- 徽章显示态：syncShown 快照有效属性，效果揭示拍点只刷新该单位（结算演出前不提前剧透）；地图在血条下，英雄卡在卡片上沿外。
- 检视卡：悬停任意单位（敌我）或点选/点行动条头像钉住，右上浮层显示 HP/MP/TP/护盾、攻防命避速移动（含增减量）、充能/蓄力、特性、全部状态。
- 攻击预测：damagePreview 逐槽合计预计 HP 伤害 + 首槽命中概率（必中=100%），目标血条画出预计扣除段、头顶命中率、能打空显示 HP 即「☠ 可击杀」红框；提示改为「命中 84% · 预计 -43 · 缓速 10」（原摘要读不存在的 hitChance 字段）。点敌人的默认技能改为优先选「规则预检能打到该目标」的攻击技能（原先固定首个可用，常是 1m 近战导致超出射程）。
- 技能卡：消耗行前加 ◆主 / ◇辅 角标（组父取子项并集）；资源条「主」「辅」可点过滤并自动打开有匹配技能的技能栏，再点取消；修正 updateSkillMenus 传 tp:0 导致 TP 技能误判不足。
- 操作：额度用完或目标超出剩余额度但冲刺后可达 → 首次点击锁定（提示需/余/+冲刺），同格再点 = sprint()+move()；右键（非瞄准时）进入跳跃并锁定该格，同格再右键起跳，瞄准/其它目标选择中右键仍为取消。
- 事故：空列表提示插入触发技能列表 childList 监听→重绘提示→死循环，浏览器标签卡死；改为仅在内容变化时增删，新开标签恢复。
- 验证：新 stage ui-readability（UIR-S/F/P/W 19 项）；唯一全量 --all 31 stages 1072 passed 0 failed；产物 1,489,176 B sha256 `6e60e6d112deae9bf2da906be44adf885771e8662299282431f6afaf84b623e6`，专项 31/31、守护结界 13/13。源码页真实操作：辅过滤只留 5 张辅卡并自动打开辅助栏；寂静指令飘「攻+10 3回」、两人出现攻+10/命+20 徽章；检视卡显示敌人特性与满属性；右键两次跳跃上移 2 格扣辅；冲刺移动扣主、额度 8→16m 并按规则因发现食尸鬼A暂停；攻击预测 84% / -43 / 血条 33% 预计段（测试时临时改了规则站位以获得视线）。产物页启动、主过滤、徽章零错误。
- 未验：可击杀红框的视觉、AoE 多目标逐个命中率的实际画面、敌方回合对我方施加减益的徽章时机仅代码与单测覆盖。README 未改，不 push。
- 目的 vs 现状：一致；剩余候选（敌方威胁区、快捷键联动）用户本轮未选。

## 2026-11-25 · 检视卡改原版毛玻璃 + 世界书图鉴档案（示例简介）（17d8a58）
- 核心目的：单位检视卡与原版 index showEnemyInfo「20% 超透光战术目镜」同观感，并为未来世界书接入预留档案位与示例简介。
- 样式：.t-insp-glass = 原版 .cyber-modal-enemy（L2340）径向 20%–28% 透明渐变 + backdrop-filter blur(14px) + 青色描边与外发光 + 四角 cyber-corner；头部 emoji + 名字 + 阵营/职业/智慧单位/TARGET INSPECT 徽章；生命/法力/战意仪表沿用原版配色与发光；ATK/DEF/SPD/命中/回避/移动胶囊带增减量；🧬 变种特质用原版 VARIANT_TAG_CONFIG 图标、说明（data-tagtip）与主色；当前状态徽章；底栏「20% 超透光战术目镜」。
- 档案：新模块 tactics/src/lore.mjs，契约与原版一致 unit.wbSource = { wbName, entryName, desc }（原版 L19618/L19801 写入、showEnemyInfo 渲染「📚 世界书图鉴档案」）；接入世界书后宿主写 wbSource 即生效并标 LORE ENTRY，未接入前按去装饰名（剥 emoji/◈〖〗⸨⸩♱、A/B/·N 编号）取 SAMPLE_LORE 示例并标 SAMPLE。示例覆盖典型对局 4 英雄、6 敌（4 类）与 2 召唤模板。
- 验证：ui-readability 22 项（新增毛玻璃 CSS 断言、wbSource 优先于示例、全部单位/模板有档案）；唯一全量 --all 31 stages 1075 passed；产物 1,501,753 B sha256 `3c842085b58f723591d216d8f84d66716ddd76cb350852389e5353bfd22a3c46`，专项 31/31、守护结界 13/13。真页：食尸鬼A 检视卡 computed backdrop-filter blur(14px)，截图可见背后红毯/木椅被模糊透出，复活/流体特质、示例档案正常，零错误（截图工具在 DPR 2.25 下只截左上区域，临时挪卡片位置截图后已还原）。
- 目的 vs 现状：一致。README 未改，不 push。

## 2026-11-25 · 领域后端、结界释放、职业反击核验及检视/击杀修正（8b31419）
- 核心目的：支持浓雾/火焰/中毒领域及持续标签减益，解除敌人和地形对结界释放的限制；核实职业被动与反击；修复启动和指定界面行为。
- 文件：tactics/src/parser.mjs、regions.mjs、scheduler.mjs、battle.mjs、movement.mjs、range.mjs、barriers.mjs；main.mjs、status-ui.mjs、tactics.css；tools/extract-rpg-av.cjs、build-demo-html.cjs、run-tests.cjs 与视听生成物；新增领域/职业反击/敌方转火测试及更新相关旧断言；mvp-standalone.html。
- 领域：支持中文对象与字符串区域标签；施放即时与每100时间对抗，标签减益3回合同源刷新，普通毒叠层不变；浓雾致盲保持区域规则，其余减益参加对抗；火焰敌人路径移动成本翻倍，中毒敌人施放距离减半；本体沿技能持续时间，三型并存同型同施术者替换，区域来源与结界隔绝沿用现有机制。
- 结界：取消切过大型敌人限制，爆炸型创建落点不再被单位/墙体截弹，仍保留射程与异施术者互斥；普通攻击不改。
- 职业：战斗级新增28断言；确认征伐者防御闪避错误读取攻击者职业，改为受击者职业。反击既有两套路径保留，未改数值与触发规则。
- UI：检视仅悬停，删除钉住状态及四角节点/样式；远程击杀按用户最终要求删除我方相框名称，头像、敌人名称与5朵血花保留，生成器同步防止重新提取恢复文字。AI转火不再进入玩家目标选择等待，玩家转火保留。
- 启动：两启动bat本地转换CRLF，新增.gitattributes固定两文件检出行尾；Windows CMD以临时node替身核实中文提示及完整启动命令，未启动第二服务；8126/8127确有既存监听，未关闭。
- 验证：本轮唯一全量1116通过；领域10、职业反击28、敌方转火接线2；产物58模块/42输入/93关键符号入包，单script闭合与语法、零外部script以及本轮规则/无钉住无四角无我方名称检查通过。产物1,506,094 B，sha256 9416a57e0e5ffef67a08b496556d3cf675029d21321155add12098e1ce1f77e6。IAB单文件真实典型对局：首敌增攻后进入玛德琳，点击防御成功，主行动1→0，日志与defend状态一致。
- 未验：用户报告的概率卡死未完整复现，AI转火等待接线修复不能证明所有卡死原因消除；真Chrome远程击杀观感/血块可见性及音效听感未验，未进行完整连续多敌行动回归；独立审查因用户关闭卡住的子代理服务未完成，不重启；README/SPEC未改，不push。
- 目的 vs 现状：指定代码与产物已交付，节点全量和至少一条单文件战斗交互通过；偶发卡死与最终视觉仍需真实环境反馈，未将静态风险当作完整修复结论。

## 2026-11-25 · 嘲讽选敌系统与底部头像永久标签（d0a6170）
- 核心目的：防守者开场+100、隐匿者开场-50及后续嘲讽变化真正影响敌方选敌，并在底部头像框显示永久标签。
- 文件：tactics/src/ai.mjs、battle.mjs、main.mjs、status-ui.mjs、tactics.css；tools/run-tests.cjs、build-demo-html.cjs；integration-test/fixtures/tactics/taunt-ai-node-cases.mjs；tactics/mvp-standalone.html。
- 规则：复用getEffectiveStats，普通攻击从实际可攻击候选按max(1,taunt)轮盘抽选；开场防守者/普通/隐匿者权重200/100/50，负总值保留原版权重1。智慧单位优先合法HP比例≤30%的最残血者，否则回到嘲讽；辅助技能不进入轮盘，AoE保留最佳覆盖收益，射程外追击同样经合法未来攻击方案抽选。随机源由battle注入，候选枚举不抽骰；永久/临时嘲讽及到期重置直接读取当前有效值，不缓存独立仇恨。
- 显示：getEffectiveUnit提供baseTauntBonus；passiveTauntBadges仅并入底部英雄状态槽，不写buff、不增加地图徽章。开场弗兰克显示仇恨+100、玛德琳显示隐匿-50，无倒计时；悬停说明当前总嘲讽与最低权重；永久值变化同步标签，既有临时taunt徽章保留。
- 验证：新增嘲讽27项（固定轮盘/4:2:1抽样、真实攻击、负值下限、智慧、不可见/倒地/制服/超射程、辅助不掷骰、AoE、追击、临时到期、永久值/重开及底部展示范围），典型AI16/职业反击28/UIR-P9/结界空间5相关测试通过；独立只读审查无阻断。本轮唯一全量1143通过。产物58模块/42必需输入/95关键符号，语法/单script闭合/零外部script及嘲讽随机源、底部标签、悬停接线8项检查通过；产物1,508,253 B，sha256 1f0bd278d761ad7bb2413cc6a2cf21e729315b0e906712b8dc36876438e24e28。
- 真页：IAB刷新新单文件，底部弗兰克仇恨+100/总200，玛德琳隐匿-50/总50；首敌行动后隐匿随未受击窗口累计到-60/总40，标签同步。用户手动测试确认敌人优先攻击弗兰克，无问题并要求直接提交，后续页面操作停止。
- 目的 vs 现状：一致——嘲讽已进入实际选敌而非仅属性显示；用户已确认真实敌方攻击行为。未操作酒馆或外部浏览器，不纳入无关未跟踪资源，不push；先前偶发卡死与远程视觉待验不在本轮扩展。
## 2026-11-25 · 6档真实步态音效、三块原版通用音频补齐与毅力/致命回避被动特效移植（82bf9cd）
- 核心目的：接入6档19个真实步态MP3；补齐战棋相对原版index缺失的三块通用级音频；原样移植毅力与致命回避职业被动特效。
- 文件：tactics/tools/extract-rpg-av.cjs、build-demo-html.cjs、run-tests.cjs；tactics/src/unit-style.mjs、motion.mjs、av-host.mjs、action-director.mjs、battle.mjs、fx-library.mjs、guard-barrier-fx.mjs、main.mjs；tactics/src/vendor/rpg-av/rpg-av.{mjs,css}；integration-test/fixtures/tactics/{audio-gait-passive-node-cases.mjs,av-node-cases.mjs}；tactics/mvp-standalone.html（并同步19个move_*.mp3至D:\Project\my_assets\）。
- 步态：6档真实采样池（我方重装/常装/轻敏8职业步距与音高调参+敌方BOSS/精英滑行&步行/杂兵），motion支持连续路程stride步频并兼容无stride单测，相邻去重/立体声pan/音高抖动/stop停音滑行，走skill:C轨免受语音N轨压制。
- 被动：extract-rpg-av原样提取playRescueGrit/playRescueAvoidFatal/clearRescueState及圆形棋子血幕裁剪/残影--d适配；battle自爆结算补传fatalResult；action-director在揭示拍点对接毅力血幕怒吼与致命回避错位碎散。
- 通用音频：原样提取playVariantResistFx（7类抗性）、playCounterAttackL1（反击居合斩）、playSelfDestructWindup/Burst/Interrupt（自爆三幕四形态）、atmoAudio（4种环境氛围音）及4路音效开关；补齐禁疗healSuppressed、结界shieldUp/atk2/atk1、防御defUp、辅助taunt/hide/atkUp、无标签neutralImpact、蓄力herocharge/herochargedone、混合治疗脉冲hpHeal，去重DEMO_AUDIO_KEYS并在设置面板暴露6项开关+主题下拉。
- 验证：extract-rpg-av --check通过（73补丁）；p04(8)/av(56)/audio-gait-passive(7)与其余27个阶段全绿（TAV-02预载有界阈值因通用键扩充由<60调至<90）；build-demo-html单文件打包通过（1,615,832 B，58模块/42输入/105符号）；IAB打开HTTP单文件0 JS报错，解锁AudioContext并实测玛德琳移动（4.2→1.8m）与防御姿态成功（设置面板⚙️在重排后点击因旧ref触发OP_TIMEOUT超时未读回，资源服实机听感待用户确认）。

## 2026-11-25 · 反应闪避反击修复、原版强力反击视听与buff间隔1ms（6c12e42）
- 核心目的：解决弗兰克连续遭近战攻击、反应闪避成功却没有普通/强力反击；对齐最新本地master/index原版两种反击动效与音效；按用户追加要求把辅助动效间的60ms空档降为1ms，并核实风行者与上一轮音频清单。
- 文件：tactics/src/{battle,action-director,main,fx-library}.mjs；tactics/tools/{extract-rpg-av,build-demo-html,run-tests}.cjs；tactics/src/vendor/rpg-av/rpg-av.{mjs,css}；tactics/mvp-standalone.html；integration-test/fixtures/tactics/{counter-av,passive-counter-complete,fx01,guard-barrier-fx,p07av-fx}-node-cases.mjs。
- 规则：基础闪避、本人反应闪避和舍身者二次反应闪避统一进入反击结算；职业强力反击不再被近战门限拦截，未触发时才按近战+counter架势普通反击，保持互斥。事件补真实HP/护盾前后快照，保留伤害/嘲讽/结界规则；导演按segmentId串行衔接，各发结束等待对应反击，不在首个拍点同步后续段最终HP。
- 视听：提取原版playPowerCounterEffect、spawnPowerBurst、聚气粒子、shot01.mp3常量、triggerScreenShake及power-glow/准星/白闪CSS；仅适配实体、舞台坐标、命中回调与取消清理。保留500/350/220ms阶段、atkUp→shot01起播同步、80ms粒子顿帧与20/180震屏；普通反击补300ms衔接、playHitFeedback及CombatAudioDirector。清场/换代清理新增DOM、光效、音效、粒子、帧与等待；正常余波不被提前截断。
- 辅助动效：保留await前一个真实句柄结束的串行规则，条目与溢出转盾的额外间隔60→1ms；不压缩SVG本身时长。
- 验证：相关反击导演9、职业/反击35、FX01 49通过。仅启动一次--all，遇到旧数组名硬编码断言中断；修正该组后只补跑未执行阶段，另修正buff60ms及清场函数顺序的两条旧断言并仅复跑失败组。最终全部注册组覆盖1166用例通过，未再次执行--all，不把最初中断写为一次全量全绿。独立只读复审与补审均无确切阻断。extract-rpg-av --check、源码/底座语法、diff --check通过。
- 产物：重新构建1,632,340 B，58模块/42必需输入/110关键符号、零外部业务import与单script闭合门禁通过；sha256 0d1aeeca4b5c93f45ec88b55453967c8e4ad6a3ac351602a0ed86f036d2d1a1c。IAB在该单文件加载受控双人夹具：食尸鬼两次近战、玩家选择紧急闪避；首次普通反击-20HP、MP100→99、总嘲讽200→220；第二次测试调高仇恨确保强力反击，-40HP、MP99→98、总嘲讽重置200，两次各一事件且弗兰克HP保持180。原版强力函数探针约1144ms、命中一次/72粒子；蓄力取消及命中拍点取消等待结束，新增DOM/红光清除、相对原粒子基线增量0。19个move音频在真实资源基址均报告ok。IAB定位器一次超时后改用同一按钮的DOM点击完成，不为环境改生产代码；临时页面与本轮测试服务已关闭。
- 风行者核实：真实样本暴风雪高伤骰确实扣139，索恩140→1，尚未致死所以不触发回避；干净样本endAction后仍1HP无倒地。提高同技能威力至1000的确定致死回归触发avoid-fatal并完整保留140HP。原版毅力/致命回避函数、导演接线及六档步态/6项设置/四环境音均存在且本轮重新入包；用户实战回合末倒地尚未复现，需该刻战报/状态，未擅改职业或DoT规则。
- 目的 vs 现状：反击断链及原版视听已修复并通过单文件交互，buff空档已降至1ms；风行者139伤害原因已复现解释，但实际回合末倒地与真Chrome动画/最终听感仍待用户实战反馈。README/SPEC未改，未纳入无关未跟踪资源。

## 2026-11-26 · 辅助SVG提速、浮空与隐匿音效、急袭单次及共享发现修复（254e86b）
- 核心目的：让战棋辅助演出更干脆，修正埃利奥特移动无明显音效、隐匿误播嘲讽、隐匿急袭持续加攻以及队友已发现敌人重复截停；对照原版核查其他职业被动差异。
- 文件：tactics/src/{battle,fx-library,main,unit-style}.mjs；tactics/tools/{extract-rpg-av,run-tests,verify-typical-artifact,verify-feedback-artifact}.cjs；tactics/src/vendor/rpg-av/rpg-av.mjs；tactics/mvp-standalone.html；integration-test/fixtures/tactics/{av-node-cases,feedback-fixes-node-cases,feedback-av-node-cases}.mjs 与 reports/{TYPICAL-BATTLE,GUARD-BARRIER}-artifact.json。
- 视听：辅助SVG动画/粒子寿命/粒子速度/句柄完成等待同步1.5倍速（原时长2/3，1100ms收尾变733.33ms），修改提取器再生成底座，根index与移动/WebM/时间轴不变；负kind=taunt正确使用hide，正值仍为taunt。埃利奥特保留浮空，现有滑行采样音量0.36→0.72、自然结束续播，停下/重启停止真实可调用cue而非误用.stop，不新增资源与入口。
- 规则：技能开始前按记录身份捕获已有急袭，整次非反应攻击实际命中后移除并注销时钟；多目标/多段整次享受、未命中保留、本技能刚授予的保留，3回合仅为未使用时过期。授予先清旧急袭再建立新记录以免同源刷新混淆；独立审查发现后段舍身回避会覆盖减益账本，消费判据改用累计hits并补真实组合断言。combatState.discoveredBySide按阵营累计共享发现，快照与移动前登记存活队友可见敌人，移动仅全队首次发现截停；重置清空、控制器存档重建保留，个人施法视线和UI显示范围不变。
- 验证：相关119项通过后唯一一次--all 1187项全绿（最后舍身回避边界修正之前）；审查后一行消费判据修正与新增组合测试只复跑feedback-fixes17、guard-battle14、passive-counter-complete35、feedback-av5共71项，全绿，未执行第二次全量。语法/diff --check/extract-rpg-av --check通过。旧TAV-07及产物典型路径断言按用户要求改为队友已发现不截停；独立首次发现断言保留。新增产物标记断言初次因esbuild空白/双引号/局部变量重命名不匹配失败，按实际产物格式修正后32/32通过，非业务缺失。
- 产物：当前源码重建1,633,733 B、58模块/42必需输入/110关键符号，零外部业务import、单script闭合；sha256 2085022064ee5b99d0e83e32e52ad748050747dbc2d381106908883952b680a5。产物专项32+13通过；同一17项规则用例接入单文件真实createBattle全部通过，未对产物重跑源码全量。
- 页面：IAB打开本轮HTTP单文件，权威典型对局敌方风雪狂暴完成后进入玛德琳回合；辅助菜单选无迹可寻、Enter确认，MP14→12、aux1→0、TP0→5、嘲讽40→10及回避+10真实落地，busy=false、结束回合按钮可用。AudioContext running；hide与move_enemy_elite_glide在既有资源服均报告ok。未操作真实酒馆、未做真Chrome动画/最终听感或安卓测试，临时标签与本轮服务已关闭。
- 其他被动核对：暗袭近战/剑/刺候选差异在战棋解析器仅近战/远程/法术的有效输入下不成立；灾厄使未计入时钟眩晕的每项+15%增伤、施法者开场盾缺原版重复初始化去重仍是两项差异（重复调用50%MP盾实测50→100）。按已批准方案仅报告，不夹带扩大规则修复；再动→行动点、回合窗口→时钟、前后排取消保持战棋设计适配。
- 目的 vs 现状：五项修复已落地并通过单文件规则及真实交互；完整动画观感/最终听感等待用户正常浏览器复测，另两项被动差异待单独决定。README/SPEC未改，无关未跟踪文件未纳入提交。

## 2026-11-26 · 隐匿即时阈值、主行动数字与多目标辅助错峰（add6bdd）
- 核心目的：解释截图永久/临时隐匿两徽章，确认80额外主点/100单次+50并回50与主点UI正常；对照原版加快多目标SVG整体演出，不再逐个等待完整余波。
- 文件：tactics/src/{battle,effect-handlers,fx-library,status-ui,ui-shell}.mjs；tactics/tools/{run-tests,verify-feedback-artifact,verify-typical-artifact}.cjs；tactics/mvp-standalone.html；integration-test/fixtures/tactics/{stealth-threshold,p07av-fx,fx01}-node-cases.mjs 与 reports/{TYPICAL-BATTLE,GUARD-BARRIER}-artifact.json。
- 对照修正：截图永久隐匿60+临时隐匿30应合算90，但战棋effect-handlers漏了原版index L21329临时负嘲讽的即时阈值检查；上一轮将原版辅助SVG误判为等待完整句柄串行，现确认playSVGEffect自行收尾，executeSkillAction L25009仅多目标间隔200ms。
- 规则/UI：taunt成功注册后经rt.checkStealthThresholds接现有class-passives/passiveIo，涨落统一检查；80每循环只加一次主点，100授予急袭、清负taunt并回50，不改算法或阈值数值。有效buff快照补isConcealAtk；既有徽章明确永久/临时隐匿及合算值，急袭+50·1次独立于普通增攻；既有资源条主按钮显示主N，与pips读取同一余额。14专项覆盖79/80/99/100、跌回79解锁、非当前待领取、同技能新急袭保留、真实两次攻击2→1→0及第三次禁止、徽章和真实renderStrip模板。
- 演出：playSupportEffects按后端条目次序启动，跨目标200/1.5约133ms、同目标及溢出转盾1ms；句柄余波重叠，整组末尾Promise.all统一等待，不逐项await733ms。任一句柄失败或错峰等待取消均停止全部已启动句柄。旧测试改用非立即完成句柄，验证B在A结束前启动、时长不逐人累加、独立揭示及两类取消。
- 验证：相关阈值14、错峰7、UI22、职业反击35、前轮反馈17、RULES02-PASSIVE24、P03时钟58及p07-av-fx45通过。只启动一次--all，在FX01旧全1ms串行断言失败中断；按新节奏修正断言后定向复跑FX01 49与未执行RULES02 32/被动24/独立17，全注册组累计覆盖1204通过，未再次--all、不把初次中断写为一次全量全绿。独立只读审查无可确证阻断；语法/diff --check通过。
- 产物：当前源码重建1,635,427 B、58模块/42必需输入/110关键符号，sha256 5113acaef535014f96ea3e1ea845e60271eb65837f153e60221ebda9a2e3fead；零外部import/单script及专项33+13通过。真实产物createBattle接入前轮17与本轮11个后端用例共28通过；3个UI模板用例只计源码回归，未冒充产物GUI验证。
- IAB实测：最终单文件权威典型局，辅助菜单选择寂静指令、地图点玛德琳选中2目标、Enter施放；四次真实SVG/音色启动相对首项0/136/276/413ms，各句柄735/739/737/736ms，B确在A结束前启动，整组1149ms完成并busy=false。不是仅测参数。截图显示永久隐匿来源与主1。
- 验证边界：重开按钮定位器两次超时后按规则改用原有restart回调；之后IAB重开/刷新停在敌方回合busy=true。另用原样本只改玛德琳敏捷为300的玩家先行受控夹具仍未完成入场等待；已恢复原默认单文件。真实点击/既有unlockAudio回调后117音频均ok、unlocked=true，仍未继续，未归因或为此改生产代码。连续主点完整GUI流程及正常Chrome动画待用户复测；不宣称该GUI门禁全绿。本轮临时标签与本机服务已关闭。
- 目的 vs 现状：隐匿完整生效链路及主点模板通过规则回归，多目标整体节奏已在最终产物实测加快；连续主点GUI和真Chrome观感仍有验证缺口。未改根index/README/SPEC，无关未跟踪文件不提交。

## 2026-11-26 · 跳跃多变体音效、施法者轻敏步态与飞行切换、结界半径调整、连发技能记忆（b2ace1f）
- 核心目的：补齐战棋跳跃三阶段多变体音效、定位并修复埃利奥特移动几乎无声问题、按正式口径收敛圣域帷幕(5)与纳克提特障壁术(3)半径，并实现非蓄力攻击技能在多行动点场景下的记忆与直接复用。
- 文件：tactics/src/{av-host,fx-library,main,unit-style}.mjs；tactics/tools/verify-typical-artifact.cjs；tactics/mvp-standalone.html；doc/tactics/{典型对局-战棋版.yaml,TYPICAL-BATTLE-CONTRACT.md,TYPICAL-BATTLE-DEMO-PLAN.md}；integration-test/fixtures/tactics/{audio-gait-passive,feedback-av,typical-data}-node-cases.mjs 与 reports/{TYPICAL-BATTLE,GUARD-BARRIER}-artifact.json；资源/tactics-jump-sfx-candidates/{JUMP-SFX-MANIFEST.md,jump_*.mp3} 与 资源/tactics-move-sfx-candidates/move_flight_wind.mp3。
- 声学排查与步态/飞行修复：实机排查与 ffmpeg 分析确认原 `move_enemy_elite_glide.mp3` 88% 能量在 300Hz 以下（`>300Hz RMS=645`）且带 0.18s 渐入，叠加 `av-host.mjs` 未对 `MOVE_AUDIO_KEYS` 调 `CombatAudioMixer.prepare(url)` 与短移动硬截断，导致埃利奥特移动声极微弱。现将 `CLASS_STYLE['施法者']` 改为轻敏步态（`HERO_LIGHT_POOL`、`hop: 6`、`stride: 0.90`、`step: 'windStep'`）；新增 `isUnitFlying`/`resolveFlightStyle`，仅在获得 `飞行` 效果时动态切为浮空与新合成的高辨识持续飞行音效 `move_flight_wind.mp3`（`1.55s, onset=0.020s, >300Hz=4182`），并同步接入 90ms `fadeStop` 与 `preload()` 预加载。
- 跳跃音效池：合成并同步 18 条 `jump_*` MP3（`crouch`/`takeoff_light`/`takeoff_heavy`/`land_light`/`land_normal`/`land_heavy` 各 3 变体），接入 `av-host.mjs`/`fx-library.mjs`/`unit-style.mjs` 与 `main.mjs`（按 `unitId:phase` 防连重+音高抖动+立体声 pan+`ui` 兜底）。
- 结界半径与连发记忆：典型对局与 `fx-library.mjs` 兜底口径将 `圣域帷幕` 改为 `5`、`纳克提特障壁术` 改为 `3`（旧 `?demo=slice` 保持不动）。`main.mjs` 新增 `lastAttackByUnit` 与 `resolveEnemyQuickAction`，在非蓄力攻击后保留并锁定记忆技能，不可用/超距/被阻挡时明示失败原因且不静默切招；蓄力技能（`charge > 0`）不走快捷连发。
- 验证与产物：`node tactics/tools/run-tests.cjs --all` 全量 1207 项通过（0 失败）；`node tactics/tools/build-demo-html.cjs` 重建 `tactics/mvp-standalone.html`（1,641,728 B、58 模块/42 断言/110 符号，sha256 `4ed2239686e9664e121d5c903174775d6de1f2235da086c022cb8d454993dd5a`）；产物专项 `verify-typical-artifact.cjs` 34/34、`verify-feedback-artifact.cjs` 28/28、`verify-guard-barrier-artifact.cjs` 13/13 全通过。
- 内置浏览器实机验证：`Tactics Standalone Verifier` 在 `http://127.0.0.1:8129/tactics/mvp-standalone.html` 验证开场、新 `jump_*.mp3` 与 `move_flight_wind.mp3` 加载（HTTP 200/206、0 个 4xx/5xx）、玛德琳跳跃扣 `辅` 不扣移动、索恩 `生体流转` 获得 `主 2` 并释放 `“清算”三连发`（首次释放后 HUD 即时保留 `【“清算”三连发】已锁定 · 再次点击目标或 Enter 发动`；第 10 步因视口变窄点偏空地触发移动而未完成第 2 次连发点击，该逻辑已由 1207 全量单测覆盖）。
- 目的 vs 现状：4 项优化全部落地并通过全量单测与单文件产物门禁；Demo 页保留在内置浏览器供用户直接试听与复核。未改根 index/README/SPEC，无关未跟踪文件未纳入提交。

## 2026-11-26 · 肃正屏障永久持续并验证困敌规则（e813586）
- 核心目的：屏障不再因回合数到期消失；屏障内敌方不能离开，已有空间规则保留。
- 文件：tactics/src/{barriers,effect-definitions}.mjs；integration-test/fixtures/tactics/{guard-barrier-flow,guard-barrier-space}-node-cases.mjs；tactics/tools/verify-guard-barrier-artifact.cjs；tactics/mvp-standalone.html；integration-test/fixtures/tactics/reports/GUARD-BARRIER-artifact.json。
- 决策与变更：previewBarrier统一endAt=null，忽略技能/槽位显式持续回合；肃正默认持续改Infinity，删除失效ROUND_TIME导入。不影响同技能其他效果时长、特防/护甲/耐久结算、击碎、同施术者替换与战斗清理。现有barrierCrossing已接普通移动、跳跃/飞行、冲锋、侧闪与推拉，未重写或加防御性二次校验。
- 验证：空间6与流程10定向通过；唯一一次全量1208通过、0失败。新增默认/技能/槽位时长均永久、长期推进、敌方内外跨界/内部移动/友方通行、真实ref.flying开关、普通移动/跳跃/推拉受阻及击碎解除断言。git diff --check通过。
- 产物：重建1,641,675 B、58模块/42输入/110符号，sha256 d128fb286f47d195afe81ef345edf7e6e3a397da148cb9d6f1245e5e5cddec0d；单script闭合/零外部import/关键模块及屏障专项14通过。首轮13通过1失败：速度300夹具推进40次未达到测试要求1000时间；仅延长该测试至80次后定向复跑全绿，未修改业务或重跑全量。
- IAB验证边界：当前单文件通过公开loadYaml载入定向两人对局；原技能按钮点击两次遮挡/定位超时后用DOM click触发原绑定，进入地图选目标状态。通过当前页面app.getBattle正式attack接口完成创建，endAt=null；正式move外部落点返回不可达，推进2066.67时间（约20.7回合）仍存在。页面jump尝试因距离4大于上限2被拒，不计为页面跳跃屏障验证，跳跃/飞行跨界由源码专项覆盖；未完成纯GUI地图选点施放或真Chrome动画验收，不冒充。临时标签与服务均关闭。
- 目的 vs 现状：永久持续与既有困敌规则通过源码全量和单文件专项；页面内正式战斗接口存续/移动通过，纯GUI选点与动画保留用户复测。未改README/SPEC/根index，无关未跟踪文件未提交。

## 2026-11-26 · 落点型范围瞄准圆心快速修复（453134b）
- 核心目的：修复拉莱耶造雾术及同类落点技能的瞄准范围圈，不改实际命中与结算。
- 文件：tactics/src/range-overlay.mjs、tactics/mvp-standalone.html、integration-test/fixtures/tactics/range-preview-center.cjs、integration-test/fixtures/tactics/reports/TYPICAL-BATTLE-artifact.json。
- 决策：爆炸轮廓明确使用shape.center，直线/扇形/自身圆形保留shape.from优先；不扩展修改编辑器归一化或目标查询。
- 验证：语法通过；真实shapePath函数离线绘制圆心专项8/8；唯一全量1208通过；重打包58模块/42输入/110符号，产物专项34通过。修复入包额外断言前两次因压缩及Unicode转义匹配不符失败，核对实际压缩代码后第三次通过，未更改业务、未重跑全量。
- 页面：IAB打开最新单文件；默认敌方回合未自动推进，调用当前页面公开getBattle().runEnemyTurn完成真实风雪狂暴增攻、扣MP及充能，推进至玛德琳回合。仅页面正式接口战斗流程通过，未完成GUI落点瞄准视觉或真Chrome验证，不计为视觉验收。
- 目的 vs 现状：共用预览圆心已修正并重新打包，实际规则未动；圆心离线验证通过，瞄准视觉与用户所述敌人提示仍待用户复测。未改README/SPEC、未触碰无关未跟踪文件。

## 2026-11-26 · 典型对局初始库存核对与父子道具入口修复（7ee6fa1）
- 核心目的：按回合制典型对局确保埃利奥特初始物品可用，不改TP或物品规则。
- 核对：原库存已完整入战棋，精华秘酿6、化尘者之瓶1次、逆咒归源镜3次、安魂曲音叉3次、蝎眼钥匙1次、塞赫美特之愠1、.32子弹45；不重复叠加库存。前轮将绑定技能TP需求混同全部物品禁用的判断已纠正。
- 文件：tactics/src/main.mjs、tactics/mvp-standalone.html、integration-test/fixtures/tactics/initial-items-node.mjs、integration-test/fixtures/tactics/reports/TYPICAL-BATTLE-artifact.json。
- 修复：菜单父道具按是否存在可用子用法判断；点击子用法传child给canUseItem，避免先检查父节点而拒绝。纯绑定镜与弹药仍沿用原规则。
- 验证：语法通过，原库存7项与5种主动物品可用回调、音叉真实结算3→2及初始TP0专项通过；唯一全量1208通过、产物34通过，58模块/42输入/110符号，sha256 7005d30728655b099f7e9cb233139d82225d38f300d711daf29a6b9574ebef21。专项前两次因测试仅友方触发终局、将行动后正常TP收益误当初始值失败，修正夹具后通过，未改业务或重复全量。
- 页面：独立IAB标签保留用户原对局；当前产物7项库存与5种可用项确认。首次音叉使用因异步已切到非持有者回合返回父道具不在场；同次页面脚本推进到埃利奥特再实际useItem，成功且3→2。公开战斗接口流程通过，GUI菜单未刷新到当前回合，未冒充GUI点击验收。
- 目的 vs 现状：初始库存与回合制一致，实际修复是父子道具入口而非加TP或重复加物品；最新单文件已重建，GUI菜单保留用户复测。未改README/SPEC或无关文件。

## 2026-11-26 · 连发复活特效按实际伤害段揭示（5ad216e）
- 核心目的：后续发触发复活时，特效不再在第一发提前出现；不改复活或伤害规则。
- 文件：tactics/src/action-director.mjs、integration-test/fixtures/tactics/counter-av-node-cases.mjs、tactics/mvp-standalone.html、integration-test/fixtures/tactics/reports/TYPICAL-BATTLE-artifact.json。
- 根因与修复：规则emit已合入activeSegment，复活事件本来有segmentId；导演却每段按目标筛出整次攻击所有variant-trigger。只改该筛选，要求事件segmentId与当前受击段一致；无段事件仍由既有攻击收尾消费。蜕皮等同类事件一并避免提前。
- 验证：语法通过，定向导演12/复活规则24通过；新增第三段复活、第二段蜕皮、无段事件收尾三项。唯一全量1211通过，产物34及逐段匹配入包专项通过；58模块/42输入/110符号，sha256 80bd963255543639c348fc23a56888679f4f6ce283e7337114f0147c4dc1f4b2。
- 页面：复用独立IAB测试标签刷新新产物，使用当前产物公开后端构造定向两人对局，真实萨维奇三连发每发55；HP150→95→40→复活90，复活事件shotIndex=3且segmentId等于第三发。首个180HP样本三发后15HP未致死，不算复活验证；改为150HP样本后确认。页面验证为产物后端探针，不是GUI施放或动画视觉验收。
- 目的 vs 现状：逐段事件消费与规则段编号一致，源码时序及产物第三发复活通过；真页GUI演出仍待用户复测。未改README/SPEC、未动无关文件。

## 2026-11-26 · 雾外锁定、召唤头像和敌方预警（dbc7fa9）
- 核心目的：雾外可攻击雾内角色但不扩大普通视野；召唤物正常显示头像、主动追已发现目标；敌方按感知与自身回合联动。
- 文件：tactics/src/{perception,range,scenario-data,battle,ai,main,unit-view}.mjs、tactics/tactics.css、doc/tactics/SPEC.md、战棋回归及打包工具、tactics/mvp-standalone.html 和产物报告。
- 根因与修复：单体锁定与普通视野使用同一拒绝条件；召唤模板在去装饰后丢失头像源，且地图和规则共用单位列表导致新单位跳过视图初始化；AI 只看本人当前视野。分别增加雾外单体锁定例外、保留模板头像并按渲染初始化状态识别新单位、接入我方发现记录及敌方一次性局部警报。收报者读取报告位置，不插队或自动接力。
- 验证：TT-ALERTS 12/12；全量 1223/1223；单文件 58 模块、43 输入、113 符号，产物专项 47/47，sha256 `d20766f0f9da37ec491cdf8bd0d2bd278246c55d7790edb2875f0d11a32f357f`。
- 页面：IAB 实际页面显示 2 枚预警角标、结束玛德琳回合并切到索恩；后续敌方演出未在 IAB 完整跑完。另载短对局通过正式应用指令锁定再施放召唤，MP 110→90，地图与行动轴均显示幻梦行军兽的 🦏。雷电正运行别的应用，未切换；未测真机。
- 目的 vs 现状：三项规则专项和单文件门禁已通过，召唤头像已在实际页面验证。未更新 README，未纳入已有未跟踪文件。

## 2026-11-26 · 自动巡走、召唤跟随、急袭和状态读数（d864da4）
- 核心目的：自动单位没有战斗动作时不再站桩；急袭只给下一次攻击；隐匿与嘲讽仅显示合并后的当前值。
- 文件：`tactics/src/{ai,battle,main,class-passives,status-ui}.mjs`、`tactics/tactics.css`、相关战棋回归及产物断言、`tactics/mvp-standalone.html` 和产物报告。
- 根因与修复：未警戒或无可追目标的敌人曾直接等待，召唤物缺少跟随分支。保留接战与警报追踪；敌人无目标时随机走完可用移动额度，没发现对手不主动施放技能；空闲召唤物沿合法路径停到主人八邻接。页面移动中发现敌对单位后执行新计划。
- 急袭原先混进通用攻击力且仅命中后消费；现在真实出手时从待用状态移入本次攻击账本，落空也消耗，反击不借用，同次新授留到下一击。状态徽章读有效嘲讽，不拆效果来源，内部到期与选敌账本不变。
- 验证：唯一全量 1227/1227；单文件结构及规则 52/52、急袭与隐匿专项 30/30；58 模块、43 输入、113 符号，SHA-256 `88201f8e6c5a353972cb6fe1ac71d4747d53bec59d3075de6f16b3ff89f6df8b`。
- 页面：IAB 单文件开场敌人未警戒，分 7m、1m 走完 8m，MP 16、无攻击，随后切到玛德琳。确认结束回合后切到索恩；英雄卡及地图均只显示当前值。雷电正在运行其它应用，未切换；未测真机。
- 目的 vs 现状：三项变更均通过规则与产物验收，敌方巡走、回合交接与合并显示已在单文件实际页面验证。未更新 README，未操作正式酒馆。

## 2026-11-26 · 中毒/火焰领域、护盾示意、警戒动效与被动到账反馈（85f19cc）
- 核心目的：让领域、护盾、警戒、职业被动资源四类战场信息在地图与左下卡片上看得见、听得出，不改变任何规则结果。
- 文件：`tactics/src/{fx-library,fx-registry,action-director,screen-showpiece,screen-atmos,unit-view,ui-shell,main,battle}.mjs`、`tactics/tactics.css`、`tactics/tools/verify-typical-artifact.cjs`、战棋回归（alerts/fx01/p07av-fx/passive-counter-complete）、`tactics/mvp-standalone.html` 与产物报告。
- 领域：常驻区域层原先只画浓雾，火焰/中毒领域无任何表现。新增两型常驻层（火焰=焦土余烬闪烁+尖顶火舌+火星；中毒=紫绿毒沼漂移+毒泡+孢子，均按规则 cells 羽化），周期判定（region-contest，无 attackId）播边缘脉冲、命中爆点与闪避飘字。按用户确认新增 fire-domain / poison-domain 两条 L3 施放演出与独立屏幕主演出；技能未写特效标签时按 regionEffect.type 匹配，显式标签仍优先、浓雾路径不变。
- 护盾：左下卡片 HP 条叠银白护盾段（HP+盾超上限时整条等比压缩）+ 🔰数值，受击闪亮；地图头像外加半透明防护罩（高光+流光+呼吸），获得展开、减少闪亮、归零碎裂。
- 警戒：新进入预警时感叹号弹跳摇摆+警觉音（bellPing，同刷新只响一次），预警期呼吸辉光；规则层广播时新发 enemy-alarm 事件（报警者/半径/收报名单，数值不变），前端按真实半径外扩红色波纹（bowlBronze），收报者依距离亮红感叹号。
- 被动：规则层在原日志处补发 passive-gain（防守反击 taunt+20、潜行窗口 stealth+10、猎杀 stealth+30、法力回响 haste+1/TP+15），前端头顶图标飘字+职业动效（嘲讽冲击环/隐匿雾收拢虚化/加速时针环）+真实采样（taunt/hide/link_chime），我方卡片闪职业色并弹出数值；攻击内事件在演出收尾播放，周期事件随刷新播放。
- 验证：新增断言 TT-ALERTS 警报事件、PC 四条到账事件、TFX-01 领域分发与预算；p07av-fx 构图计数 18→20（两领域共用一处爆发拍点，计 19 次）。全量逐阶段跑完：除 p07-av-fx/TP7AV-K 一例既有失败外全部通过；该例在本轮改动 stash 后同样失败，原因是 fx-library.mjs 检出为 CRLF 而断言正则按 LF（`\);\n`）匹配，与本轮无关，未改。单文件 58 模块、43 输入、113 符号，产物专项 54/54（含新代码入包与打包后端上的警报用例）、反馈规则 30/30、结界 14/14，SHA-256 `d61c9053e0264ca5d3a9877e49f6530f708f6236a697fa92821dbb51bfb8e591`。
- 页面：多文件页与单文件页实测：注入火焰/中毒区域显示常驻层；冻结帧确认脉冲环/命中爆点/闪避飘字、警报红色波纹与收报感叹号、三类被动飘字、卡片护盾段与被动弹出、头像防护罩；真实规则施放无标签火焰领域走 fire-domain 演出并揭示常驻层（该次落点被弹道截停在我方附近，无敌方入域判定）。未测真机，未操作正式酒馆。
- 目的 vs 现状：四项需求均已落地并通过规则、产物与页面验证；音效取自既有采样，具体音色可再换。未更新 README。

## 2026-11-26 · 坏死雾毒域、燃烧弹火域与投瓶演出、火焰01音效对照（b62ac13）
- 核心目的：索恩【异种坏死雾】与【燃烧弹】（铝热投剂）真正留下中毒/火焰领域，演出从索恩头像投瓶、落点完整播放原版视频，整体自然；压缩爆燃不再借用燃烧弹音画。
- 文件：`doc/tactics/典型对局-战棋版.yaml`、`tactics/src/fx-library.mjs`、`tactics/tools/verify-typical-artifact.cjs`、`integration-test/fixtures/tactics/fx01-node-cases.mjs`、`tactics/mvp-standalone.html` 与产物报告。
- 配置：坏死雾加 `区域: {类型: 中毒}`（半径 8 不变）；铝热投剂改 `[特效:燃烧弹]`、`范围: 爆炸 射程10 半径3`、`区域: {类型: 火焰}`，不改名。半径 3 取原版燃烧弹视频 0.42×屏幕短边在默认镜头下的实际覆盖（约 5.7m）。规则核对：毒域 172 格、火域 26 格，3 回合；落地当拍判定，燃烧30/降防20、中毒30/弱攻20/停滞20 正确挂上。
- 原版对照（index.html WEBM_FX_REGISTRY）：火焰01=fire.webm 1.4 + fire01.mp3；燃烧弹=ranshao.webm 0.42 + ranshao.mp3；异种坏死雾=fog.mp4 0.8、audioUrl:'none'（视频原声 ×2.5）、delay 0.2。
- 坏死雾：旧版在碎裂刚发生的 1.3s 就收层（视频 2.72s），且按半径 8 覆盖铺成约 1422 世界像素宽、超出视口。改为 L4：SVG 毒剂瓶沿抛物线飞到视频首帧瓶位交接，完整播放 fog.mp4（原声经混音器 ×2.5），宽度按原版 0.8×屏幕短边，碎裂点对准落点；镜头随瓶跟到落点，雾起时揭示常驻毒域与逐个判定。
- 燃烧弹：新条目 incendiary-bottle（identity 级，沿用原版资产）：燃烧瓶带火布与火星尾迹投出，落地同拍 ranshao.mp3 + 完整 ranshao.webm（0.42×屏幕短边），火起时揭示常驻火域与判定。
- 火焰01：去掉借用的 ranshao 采样与 ranshao.webm 燃烧挂载（燃烧挂载由状态层统一播放），主音回到原版 fire01；领域施放条目同理去掉尾音。领域判定结果改从 effect-resolved 事件揭示（领域标签不进 result.effects），持续伤害飘字补齐字段。
- 验证：全量逐阶段 41 组，仅 p07-av-fx/TP7AV-K 为上轮已记录的 CRLF 既有失败；新增 TFX-03 配置与分发断言（fx01 51）。单文件 58 模块，产物专项 54/54、反馈规则 30/30、结界 14/14，SHA-256 `6309a9325186e31cec3868905d93849affe83705ab9025e2b664dd94ff032d60`。
- 页面：多文件页用真实规则结果驱动正式导演实测：坏死雾投瓶 560ms 后起播，画布 503×283 全在 1133×629 视口内，碎裂点在目标脚下 16px，视频播完自然结束（3.66s）并留下毒域；燃烧弹投瓶约 405ms，画布 264×240 居中目标，1.27s 播完留下火域。自动化浏览器在后台不推进视频帧回调，未能截到视频画面，需人工目视。
- 目的 vs 现状：两项均已接入领域并按原版资产重做演出；视觉观感待用户目视确认。未更新 README。

## 2026-11-26 · 底部角色卡重做、看破原版演出、跳跃扬尘、灵风术法阵与飞行羽翼（e34d3be）
- 核心目的：护盾不再单独占一行；底部卡片显示 TP 与五项有效属性并有数值交互；补看破、起跳落地灰尘；灵风术法阵缩放不变形，飞行期间常驻白翼。
- 文件：`tactics/src/{ui-shell,main,unit-view,fx-library,action-director}.mjs`、`tactics/tactics.css`、`tactics/tools/extract-rpg-av.cjs`（重新提取 `vendor/rpg-av`，补丁 109→112）、`tactics/mvp-standalone.html` 与产物报告。
- 角色卡：头像 46px + 名字/职业徽记；HP 条加高到 13px，数值与 `+盾` 写在条内，护盾段叠在条尾，卡片上方护盾徽章去掉；MP/TP 双条带数值；底行攻/防/命/避/速为有效值，相对基础值升绿降紫、变化时闪一下，悬停看「基础 ± 加成」。
- 看破：照原版 playKanpoEffect 五拍移植到世界层：来袭者压暗与锁定环 → 看破者头顶金眼 +「看破识破！」+ 金流 → 金环汇聚与金屑 → 斜斩 + 无效化印章 + 暖白闪 + 震屏 + 原版 kanpo 音，尺寸按地图格。反应演出 ctx 补 centerOf/responderId/attackerId。
- 扬尘：导演 playJumpDust 替换旧的单个椭圆：起跳 8 团低扬尘，落地 14 团环形外推 + 碎石，大体型/重步按 1.45 倍；尘团画在顶层。
- 灵风术：原版法阵按整屏 vmax×0.55 取尺寸、透视原点在舞台中心，战棋舞台随镜头缩放后会放大并透视变形；提取器补丁改为按施术者头像高度取尺寸（法阵 4.2×、羽毛环绕 7×）、透视原点钉在阵心、收尾翼纹同尺度。新增常驻羽翼：单位视图头像后方，同原版三排羽片几何，外旋 22° 缓慢扇动，移动时加快；飞行增益存在时显示，到期淡出。
- 验证：相关 11 组通过（仅 TP7AV-K 为既有 CRLF 失败），提取器 --check 一致；单文件产物专项 54/54、反馈规则 30/30、结界 14/14，SHA-256 `07119c97c038269a6a1dd72b3b1ecdece28f70004caa94cdfb3bbfb79d6cc035`。页面实测卡片无溢出、羽翼/扬尘/看破定格截图正常；灵风术 2 倍缩放下法阵 456×176 对头像 84px。自动化浏览器卡死，未完成灵风术全程与唯一全量回归，按用户要求交付自测。
- 目的 vs 现状：四项均已落码打包；灵风术全程观感与全量回归待用户测试。未更新 README。

## 2026-11-26 · AI 台阶跳跃与避雾、统一物品耗费、整备及净嘲讽（37b6f39）
- 核心目的：修复礼拜堂北房通往中殿的 2×2 单位卡步与怪物雾边折返；物品、整备和防守者状态显示按统一行动资源与净增量口径结算。
- 文件：`tactics/src/{ai,movement,battle,main,class-passives,status-ui}.mjs`、`tactics/tools/{run-tests,verify-typical-artifact}.cjs`、行动路线／职业回归夹具、`tactics/mvp-standalone.html` 与典型对局产物报告。
- 路线：步行无法推进时，追击或跟随 AI 复用合法起跳、占格落点、辅助耗费和既有跳跃演出。AI 选路优先避开浓雾、必要时向目标穿过；致盲、视野、真移动耗费与结界规则不变。页面的 AI 在使用技能后和规则引擎一样重算剩余动作，修复增攻后直接结束回合。
- 行动：直接使用物品及子用法统一扣 1 辅，普通物品不扣主；延迟物品先付 1 辅再按原机制投入可用主行动蓄力，释放不重复收费。基础行动末尾追加【整备】，耗 1 主随机祛除自身一条可驱散负面；无候选不耗费。防守者命中和徽章不计通用 100 嘲讽底值，开局净嘲讽 +100、命中 +10，AI 权重仍按总值 200。
- 验证：42 个注册阶段逐组完成，1201 项通过；既有 TP7AV-K 受 Windows CRLF 影响，内存归一换行后该阶段 45/45 通过。页面改动后复跑相关组通过；单文件 56/56，SHA-256 `205264ba8d7701c1018ecfa19051d449c9b21cfbc56f2b819d6998d58a230a35`。
- 页面：IAB 加载实际单文件，预设伊塔库亚与埃利奥特开场站位。战报确认首轮增攻后依次移动 1m、跳跃 3m、移动 1m；整备在无候选时禁用，弗兰克卡片显示嘲讽 +100／命中 10。雷电正在使用，未接管。未更新 README。
- 目的 vs 现状：台阶越障、怪物避雾与行动点口径已落码并打包，既有浓雾机制与底层选敌权重保持。

## 2026-11-26 · 看破与职业被动反馈接线、右侧支援单位折叠（75e8785）
- 核心目的：净蚀反冲实际看破时播放原版完整反馈，职业资源到账同时提示地图与英雄卡；支援单位不再撑高底栏。
- 文件：`tactics/src/{fx-registry,fx-library,main,ui-shell}.mjs`、`tactics/tactics.css`、`tactics/tools/build-demo-html.cjs`、`integration-test/fixtures/tactics/feedback-av-node-cases.mjs`、`tactics/mvp-standalone.html`。
- 看破：按成功反应的 `kanpo` 标记优先分发，避免被「逆咒归源镜」技能标签覆盖；非看破镜系演出不变。金粒子从看破者飞至来袭者，金环先内收，沿用地图尺度、斜斩印章、暖闪震屏与原版 `kanpo` 采样。
- 被动：三种地图演出和采样原已注册，回合交接先于镜头就位播放会影响可见性；现将时钟到账移至镜头就位后，与底栏一起播，缺地图坐标不再阻断采样；加速转环补上指针。规则真值与去重口径不变。
- 界面：底栏最多四张正式英雄卡；召唤物和非底栏友方改为右侧独立折叠头像，详情保留 HP、实际 MP、护盾和简要状态，无 TP 与五维。
- 验证：源码相关组通过（视听10、职业39、界面22、嘲讽25、典型技能108）。唯一全量首次停在依赖源码字面的 TA-UI2，修正后该组已复跑通过，未再执行全量；`p07-av-fx` 仍有既有 Windows CRLF 引起的尺寸断言失败。单文件通过 44 个模块、116 个符号及无外部业务导入/脚本闭合检查，反馈产物规则 30/30，SHA-256 `dad391ac8dab1d88af214523d0904e09256d8cb7242e880be0d4d231b7eafa35`。
- IAB：单文件用蝎眼钥匙实召幻梦行军兽，底部四张卡一排，右侧可展开/收起，显示 HP 420/420、MP 15/15，无 TP；测试临时盟友头像可独立展开。真实规则结果驱动产物演出，看破完成、地图文字及 `kanpo` 采样起播；三种被动各触发地图/底栏且对应采样起播，重复投递未重播。未做真 Chrome／雷电／真酒馆人工声画验收。
- 目的 vs 现状：已修正演出分发与回合时序，召唤物不再占英雄卡槽；完整动画观感待复测。未更新 README。

## 2026-11-26 · 冲锋扫掠、连发反应闪避与持续伤害飘字（6aa2ce3）
- 核心目的：幻梦行军兽不再因单位或结界撞空，连发错位不回放旧位，双方燃烧与中毒实际扣血可见。
- 文件：`tactics/src/{movement,range,range-overlay,battle,ai,main,action-director,fx-library,av-host}.mjs`、战棋样本/规则契约、规则和导演回归夹具、`tactics/tools/verify-typical-artifact.cjs`、`tactics/mvp-standalone.html` 及产物报告。
- 冲锋：八方向扫掠按完整占格共用给预览、AI 与执行。路径仅实墙、关门、地图外壁截停，穿越单位/结界/非墙地形；实际接触敌方只结算一次，未腾出末端占格时落最后可站格。普通移动与击退阻挡规则不变。
- 反馈：连发按当前段揭示，侧闪按响应单位串行并用本段终点；无专用条目仍滑步，通用受击层保留单次「闪避」飘字。燃烧/中毒沿 `status-tick` 一次显示实扣 HP，同拍多层错开。
- 验证：唯一全量在 `fx01` 中断（新增落空补揭去重及既有看破断言），修正后复跑相关组并补跑余下阶段；42 阶段共覆盖 1256 项，产物专项 58/58，SHA-256 `ccec4ee046ad2ee18cc688dc12828553d3aac04e1b78bc12c7ea7023bcc03cd3`。IAB 原页未推进 rAF，使用仅换帧时钟的本地测试壳确认敌方 7m+1m 行走、回合交接与玛德琳防御（主行动 1→0、TP 0→25）；未测试真 Chrome、安卓或真酒馆。
- 目的 vs 现状：三项均有规则或演出回归并已入单文件；三项的实际声画仍待真环境复测。未更新 README。

## 2026-11-26 · 冲锋接触拍点、燃烧贴头像、转火双击与加速库存（b7dc21b）
- 核心目的：真实接触同帧揭示伤害和击退，修复常驻火苗错位；自身直放、同目标连击快速确认；加速库存同时在头像与底部角色卡可见。
- 文件：`tactics/src/{battle,action-director,fx-library,main,sandbox,status-ui}.mjs`、`tactics/tactics.css`、规则/导演/界面回归夹具、`tactics/tools/verify-typical-artifact.cjs`、`tactics/mvp-standalone.html` 与专项报告。
- 冲锋：每个受击段与对应击退记录真实接触步；路径补间到步后同帧揭示伤害并启动击退，击退额外撞击扣血等击退终点，收尾不重复补间。碰撞结算与穿越规则不变。
- 操作与显示：纯自身技能及自身型物品走正式提交；正常点选/Enter 仍可手动转火，双击沿用合法的原目标或方向，失效允许重选或跳过。真实加速库存复用状态徽章，消耗归零消失。常驻火苗和火星按头像比例贴圆框内下缘，不动燃烧每跳与音效。
- 验证：唯一源码全量 1264/1264，产物专项 60/60，SHA-256 `8f5f9188047873fa5b8bf95cd8cc063429defa9d2d3befd77fa355e912c9e4ce`。IAB 使用本地帧时钟与训练布阵：实点咏唱无二次确认、两处显示加速3，1×1/2×2 燃烧火苗位置截图确认；原生形状的完整点击事件序列触发双发同目标且无转火弹条；真实产物导演在冲锋第2/4步对两个目标分别揭示伤害。未接管真 Chrome、雷电或真酒馆。
- 目的 vs 现状：五项均已落地，专项和本地单文件验证通过，真实浏览器帧率与酒馆观感待复测。未更新 README。

## 2026-11-26 · 枪械演出重做、连续扫射运镜与时停顿帧、警戒标记（26b2122）
- 核心目的：玛德琳【枪击穿透】【连续扫射】与普通枪击有力度，连续扫射带屏幕血块且时长对齐原版；用运镜补足战棋头像屏占小的问题；敌方警戒标记不再违和。
- 文件：`tactics/src/{fx-library,fx-registry,sandbox,unit-view}.mjs`、`tactics/tactics.css`、`integration-test/fixtures/tactics/fx01-node-cases.mjs`、`tactics/mvp-standalone.html` 与产物报告。
- 枪械：移植回合制原版构图为共用画法（枪口焰锥 + 8 芒星芯、曳光、抛壳、双圈激波星芒、血雾/火星喷溅、受击颤、屏幕血块）。普通枪击在底座身份演出上叠加出膛焰/抛壳/后坐与命中星芒/血雾/中震；枪击穿透改为弱点准星旋入 → 重枪口焰 + 青色贯穿光束 → 背部破片锥 + 出口血雾 + 重震（L2 1160ms）。
- 连续扫射：52 发 × 50ms = 2600ms 对齐原版 startStrafeBurst；双枪交替、扇形往返、偶数发副枪交叉、按敌数分档限粒子，全程屏幕血块（暗红压暗 + 8 团血渍 + 3 道血泪）。
- 运镜：sandbox 新增 poseAt / poseFrame / cameraTo / cameraTouched，玩家本次动作已拖拽或缩放则演出不抢镜。扫射时间轴为遮幅入场 + 推近出手者 1.6× → 时停定格 140ms（去色高对比 + 放射速度线）→ 拉开框住全部目标并随主目标摆镜 + 持续后坐震屏 → 末击顿帧 150ms 急推 + 白闪 → 回位，总长 4120ms。freeze 原语冻结视口内全部 WAAPI 动画，可复用到其他 L3/L4。
- 预算：L3 上限 2500 → 4200ms，L4 上限 3500 → 5000ms（用户确认）。
- 警戒：黄色圆底感叹号改为头像外暗红扫描弧环（外弧顺转、内刻点逆转）+ 头顶竖瞳猎视之眼（间歇眨眼）；收报者转炽红急扫；弹出为弧环收紧锁定 + 睁眼。
- 验证：唯一全量 42 阶段 1264/1264；fx01 枪击桩补世界层与单位视图。单文件 58 模块/44 断言，产物规则 60/30/14 全通过，SHA-256 `f4e0d7ee8b38e7a3302dfa85c39f32ce6d0ce9ced38ec34d01b1aaf56b1d7a55`。完整工作台实播连续扫射（玛德琳 → 4 杂兵）零报错，镜头缩放实测 0.513 → 0.788 → 0.596 → 0.668 → 0.513。空白母版打包器因既有 stub 缺 `elementFieldHtml` 失败（本轮前即失败），未刷新。
- 目的 vs 现状：三项需求与运镜首例已落码入包；实际观感待用户在真浏览器/酒馆复测。未更新 README。

## 2026-11-26 · 可暂停演出时钟与 L3/L4 通用运镜（2faa58b）
- 核心目的：现有 20 个 L3/L4 技能统一获得运镜、时停与顿帧，补足战棋头像屏占小的问题；新增高阶技能自动生效。
- 文件：`tactics/src/{view-scope,action-director,cinematic,fx-library}.mjs`（cinematic 为新模块）、`integration-test/fixtures/tactics/{p02,guard-director}-node-cases.mjs`、`tactics/mvp-standalone.html` 与产物报告。
- 时钟：view-scope 新增 `hold(ms, onResume)` / `heldMs()`，暂停期间已排与新排的 after 计时整体顺延、按剩余时长续跑；导演 tween 扣除暂停时长。导演 `hold(ms, during)` 再以微任务快照冻结同一同步段内的视口 WAAPI 动画、视频改零速，during 内的定格画面照常播；音频不停。camera 补间不受时钟影响（时停中可推镜）。可控时钟注入键为 `time`（避开测试时钟的 `now` 数值属性）。
- 运镜：cinematic.mjs 按真实结算判类型（创建区域 = 领域；单个伤害目标且单体射程 = 单体；其余有伤害 = 范围；无伤害 = 守护/召唤/增益）。统一流程：遮幅 + 推近出手者（偏向目标）→ 爆发拍时停 120ms（L4 180ms，去色速度线；守护类暖调）→ 按类型构图（单体急甩偏目标 / 范围框落区 / 领域缓拉全场 / 守护框受益者）→ 攻击类首次命中顿帧 90ms（L4 130ms）+ 急推 + 白闪 → 收尾回位 380ms。挂在氛围层 burst、首次揭示与收尾；玩家本次已接管镜头则不推镜。条目 `cine:false` 自行编排（连续扫射保留专属运镜，改用 ctx.hold）。
- 验证：唯一全量 42 阶段 1265/1265（新增 hold 顺延用例；guard-director 作用域桩补 heldMs）。单文件 59 模块/44 断言，产物规则 60/30/14，SHA-256 `2ae1a40d7fa6dc9ccdaab528ada82926c4c002a0f5ff660c2064d7906af906d2`。完整工作台实播克虏伯重狙（单体·L4，缩放 0.543 → 0.973 → 0.543）、火焰01（范围）、火焰领域（领域）、纳克提特障壁术（守护）与连续扫射，零报错，四类遮幅与时停画面均出现、收尾回位。
- 局限：回合制底座自有 setTimeout / Canvas 粒子不受演出时钟控制，时停 ≤180ms 内仍会飘动。
- 目的 vs 现状：一致，20 个条目全部经导演层统一套用；实际观感待用户复测。未更新 README。

## 2026-11-27 · 锁定/弹道类高阶攻击改为打击点特写运镜（d90722d）
- 核心目的：锁定类攻击开场特写攻击目标，释放瞬间猛拉远 + 震屏模拟爆炸冲击；带弹道的攻击兼顾蓄力感知与打击爆发。
- 文件：`tactics/src/{cinematic,action-director,fx-library}.mjs`、`tactics/mvp-standalone.html` 与产物报告。
- 条目声明：`cine:'lock'`（雷击01、圣光01、克虏伯重狙、塞赫美特之愠）、`cine:'projectile'`（火焰01、异种坏死雾）；其余高阶技能沿用按结算自动分类，增益类不变。
- 锁定打击：开场 260ms 快切到打击点（范围取爆心、单体取首个目标），推到 1.7×（L4 1.85×），蓄力期间缓推到 1.12 倍；爆发拍在打击点时停 140ms（L4 200ms），配白闪和 36 道速度线；解冻瞬间 quake 震屏，140ms 拉远到构图的 0.8 倍（过冲），再 480ms 回落到框住爆区的构图（不超过出手前 1.05 倍）。不再叠首次命中顿帧。
- 弹道打击：蓄力时推近施法者 1.45×；条目在发射点调用 `ctx.cine.launch(飞行时长, 延迟, {at, k})`，镜头在飞行 75% 处完成甩到落点并推近（默认 1.65×/L4 1.8×），弹体入画落下；命中流程同锁定打击。火焰01 在聚能 240ms 后甩镜；异种坏死雾以 launch 替代原 guideTo，取落点与视频中心之间、1.25×，保证瓶落轨迹与碎裂点同时入画。
- 尺寸：screenSpanPx / screenCoverPx 在运镜期间按出手前缩放（`cine.homeScale`）计算，避免特写中生成的视频拉远后变小。
- 验证：唯一全量 42 阶段 1265/1265；单文件 59 模块/44 断言，产物规则 60/30/14，SHA-256 `f9336aa58cfa583e73ff4fa467f1f9b29fe8dcda010fa026b5b760a9303ac70d`。工作台实播 6 个技能零报错：锁定类爆发前镜头中心均在目标侧，缩放推到约 1.03–1.13，爆发后过冲到约 0.44–0.46，收尾回到 0.543；火焰01 蓄力时中心在我方，发射后甩到目标侧、爆发时 0.896；坏死雾开场即甩到落点侧。顺手清理了上一轮未退出的 8127 本地服务进程。
- 目的 vs 现状：一致；实际观感待用户复测。未更新 README。

## 2026-11-27 · 打击运镜改为先施法者后甩敌人、坏死雾视频不定格（f660e78）
- 核心目的：锁定类攻击不再开场直切敌人，统一像火焰01：先特写施法者蓄力，再快速切到敌人；异种坏死雾视频自然播放，不卡点。
- 文件：`tactics/src/{cinematic,action-director,fx-library}.mjs`、`tactics/mvp-standalone.html` 与产物报告。
- 锁定打击：开场推近施法者 1.45×（L4 再 ×1.12），在蓄力结束前 480ms（最早 300ms）以 240ms 急甩到打击点 1.65×（L4 1.8×），到位后余下蓄力缓推到 1.1 倍；爆发流程不变（打击点时停 → quake → 过冲拉远 → 回落）。弹道打击的 launch 复用同一甩镜函数（到位后不再缓推）。
- 坏死雾：新增条目字段 `cineHold:false`（导演传为 `freeze`），爆发时不时停、不闪白，视频与动画不被冻结，只做拉远构图，震屏沿用条目自身；甩镜推迟到瓶子飞行 60% 时、300ms 内完成，先留给索恩出手的镜头。
- 验证：唯一全量 42 阶段 1265/1265；单文件 59 模块/44 断言，产物规则 60/30/14，SHA-256 `35af1fe1eb78c99572f9cf625bb9629966fc261d4a2b9b3fe84a54e528114de2`。工作台 6 技能逐个等待完成后实播，零报错：圣光01/克虏伯/塞赫美特/火焰01/坏死雾均先以施法者为镜头中心再转到敌人；坏死雾无时停、视频冻结采样 0，其余技能时停期间视频按设计冻结。被控浏览器在后台，动画帧被节流到约 1 秒一帧，精确切换时刻无法从采样读出，以代码时序为准。
- 目的 vs 现状：一致；观感待用户复测。未更新 README。

## 2026-11-27 · 远程/近战重击按原版移植、弗兰克重击推撞改冲撞、攻击类去时停、运镜幅度 1/3（f6444b8）
- 核心目的：远程重击为巨弹特写蓄力发射，命中与否都溅屏幕血块；近战重击移植原版效果与音效，弗兰克【重击推撞】改为 4 米直线冲撞且不占移动/跳跃额度；去掉攻击类时停顿帧（实战卡顿），特写推拉幅度降为三分之一。
- 文件：`tactics/src/{fx-library,cinematic,action-director}.mjs`、`doc/tactics/典型对局-战棋版.yaml`、`integration-test/fixtures/tactics/{typical-battle,typical-data}-node-cases.mjs`、`tactics/mvp-standalone.html` 与产物报告。
- 规定：用户确认"演出库只用真实采样、禁用振荡器合成"是误写，删除 fx-library 头注释中的该条（`.agents/skills/svg-skill-vfx/SKILL.md` 中给其他模型的同类约束未动）。
- 远程重击（皇家猎象枪）：镜头推近弗兰克，枪口凝出约 1.9 米巨弹（黄铜壳 + 铜尖头，热浪聚能、火星吸入、颤动，herocharge）→ shot01 击发 + 重枪口焰 + 后坐，巨弹拖曳光直飞、镜头追弹甩到目标 → 命中拍 hitDown + 原版低频冲击（sine 140→32Hz/350ms）+ 白闪 + 原版双管重爆（冲击双环、硝烟、8 向火星、十二芒爆核）；原版重震屏关键帧（0.48s）+ 原版 5 团屏幕血块与 2 道血泪（命中/闪避都溅，闪避在目标身后炸开）+ 命中目标中弹后仰。
- 近战重击：原版盾击推撞全部移植（双圈冲击环、沿冲撞方向的推撞新月波、碎裂线、8 向火星、金色爆核、眩晕星环）+ parry_heavy + 原版低频冲击（triangle 160→36Hz/300ms）+ 80ms 后 hitDown + 原版重震屏关键帧（0.44s）+ 金色平闪 + 目标推撞踉跄（沿冲撞方向旋转）；蓄力下压 + 尘环，冲撞沿路径扬尘，接触步由导演 playCharge 回调传入（新增 step 参数），落空只擦火星。
- 冲撞：重击推撞改为 `[位移:冲锋;距离:4][位移:击退;距离:3;方向:冲锋方向]`、范围直线 4×1，复用现有冲锋结算（直接写站位，不扣 moveRemaining/跳跃）。新增用例：解析为冲锋 4 + 击退 3 冲锋方向 + 直线 4；实战冲撞命中路径敌人、落点前进 4 格、移动额度与跳跃状态不变。
- 镜头：cinematic 新增 `ATTACK_STOP_MS = 0`、`ATTACK_HIT_MS = 0`（单体/范围/锁定/弹道不冻结、不出时停画面，白闪与震屏保留；守护/领域仍定格），`ZOOM_AMP = 1/3`、`zoomAt` 收敛所有运镜缩放偏移，`holdOr` 在 0 时直接执行。连续扫射与远程重击同步接入（扫射 totalMs 4120 → 3830）。
- 验证：唯一全量 42 阶段 1268/1268；单文件 59 模块/44 断言，产物规则 60/30/14，SHA-256 `d094f1aa168dfc00a77a3f9add5f0e6a38e78a8728e1fc976ec26207f6f77fb5`，YAML 冲锋 4 已入包（转义形式）。工作台实播零报错：远程重击命中/闪避均出现巨弹、5 团血块、8 向火星、1 次低频振荡器，无时停画面，推近 0.543 → 0.687（= 1.8 倍的 1/3）；近战重击命中出现爆发与低频、闪避无爆发；克虏伯无时停。工作台为模拟结果、无冲锋路径，地图上的实战冲撞演出未实播。
- 目的 vs 现状：一致；冲撞实战观感待用户在对局中复测。未更新 README。

## 2026-11-27 · 远程重击改为快速蓄力 + 红色弹道 + 原版血花，坏死雾去运镜（639aab6）
- 核心目的：远程重击去掉过大的巨弹，改为快速蓄力射出红色弹道并爆开原版血花；异种坏死雾取消运镜。
- 文件：`tactics/src/fx-library.mjs`、`tactics/mvp-standalone.html` 与产物报告。
- 远程重击：删除巨弹画法与专属推镜/追弹运镜；260ms 枪口红光收束 + 火星吸入（herocharge）→ shot01 击发 + 重枪口焰 + 后坐 + 9px 粗红色弹道（110ms）→ 命中拍 hitDown + 低频冲击 + 白闪 + 原版双管重爆 + 原版重震屏 + 原版 5 团屏幕血块与 2 道血泪（命中/闪避都溅）+ 命中后仰与血雾。时长 1180 → 980ms。tracer 新增 `tint` 配色参数（TRACER_RED）。
- 坏死雾：`cine:false`，不再有遮幅、推镜和甩镜；恢复原有的镜头随瓶跟到落点（guideTo，保证视频上半段不被裁），视频自然播放。
- 验证：唯一全量 42 阶段 1268/1268；单文件 59 模块/44 断言，产物规则 60/30/14，SHA-256 `fba9eddca17bcecb8572fab3a566d37b7cb69ebb9fc562b18f3febb33439c636`。工作台实播零报错：远程重击命中/闪避均出现红色弹道、5 团血块、8 向火星，镜头缩放全程不变、无遮幅、无时停；坏死雾无遮幅、无时停、缩放不变。
- 目的 vs 现状：一致；观感待用户复测。未更新 README。

## 2026-11-27 · 去三技能运镜、顿帧全归零、眷族/犹格 4 动 3 动、鹿弹打击感与半径减半、独头弹 L2（63d3763）
- 核心目的：雷击01/圣光01/克虏伯自身蓄势已足，去掉运镜；所有顿帧归零；眷族、犹格索托斯之子按原版[行动次数:4]/[行动次数:3]提升敏捷；鹿弹更有打击感且单发半径减半；独头弹获得专属 L2 特效。
- 文件：`tactics/src/{fx-library,cinematic,av-host}.mjs`、`doc/tactics/典型对局-战棋版.yaml`、`integration-test/fixtures/tactics/{fx01,p07av,typical-battle,typical-data}-node-cases.mjs`、`tactics/mvp-standalone.html` 与产物报告。
- 运镜：雷击01/圣光01/克虏伯重狙改 `cine:false`（仅保留条目自身演出与屏幕氛围）；塞赫美特仍为锁定打击、火焰01 仍为弹道打击。
- 顿帧：cinematic 新增 `SUPPORT_STOP_MS = SUPPORT_STOP_MS_L4 = 0`，守护/领域类时停也归零（攻击类此前已为 0）；回合制底座粒子层 fxEngine.hitStop（受击 60ms / 强力反击 80ms）在 av-host 用访问器锁为 0，不改抽取生成的底座源。
- 速度：眷族敏捷 115 → 270、犹格索托斯之子 65 → 203，取我方四人平均敏捷 67.5 的 4 倍 / 3 倍（战棋按敏捷跑圈，行动频率正比于敏捷），写入 YAML 决策记录。新增跑圈用例：按样本真实敏捷 240 次行动内，眷族约为我方平均的 4 倍、犹格约 3 倍（容差 0.3）。副作用：索恩【动能冲踏】对这两者的速度压制增伤与闪避加成不再触发。
- 鹿弹：鹿弹二连发扇形长度 6 → 3（单发打击半径减半，按扇形半径理解）。basicAttack 定向分支新增出膛钩子；霰弹接入 shotgunFire（主焰 + 两侧斜焰 + 硝烟环 + 160ms 后红色霰弹壳抛出 + 后坐 + 中震）与 shotgunHit（6 颗弹丸散布炸点、血雾、火星、中弹后仰，同一发只重震一次）。
- 独头弹（新 fxTag `独头弹`，独头二连发改用）：L2 1150ms。每发 xiandan 枪声 + 宽口枪焰 + 硝烟环 + 后坐 + 粗短橙白弹头与热浪尾迹（90ms）→ 命中 hitDown + 低频冲击 + 沿弹道法向压扁的盘状冲击双环 + 炽白爆心 + 破甲碎片 + 甲面裂纹（降防）+ 血雾 + 后仰；落空在目标身后掀尘。两发之间 380ms 泵动上膛（mx_gear_lock + 红壳抛出），第二发更重（重震屏）；按全局发序逐段揭示，中间等反应收尾。
- 验证：全量 42 阶段 1269/1269。首次全量在 p07-av 的 TP7AV-W 中断（断言独头二连发 fxTag 仍为枪击，属本轮有意变更），修正断言后相关组复跑通过；第二次全量输出与修改并发、结果失真，第三次全量干净通过——超出"全量仅一次"约定，已在回复中说明。单文件 59 模块/44 断言，产物规则 60/30/14，SHA-256 `57a72fbbffa93a94e8ccee91a8f4c117144017659b957de8f45c767156fc557c`，顿帧锁与独头弹已入包。工作台实播零报错：独头弹命中出现弹道与裂纹、闪避无裂纹；鹿弹出现红壳；雷击01/圣光01/克虏伯全程无遮幅、无时停、镜头缩放不变。工作台模拟为单段，泵动上膛只在真实两段时出现（两段执行由 TP7AV-W 覆盖）。
- 目的 vs 现状：一致；观感与 4 动/3 动的实战压力待用户复测。未更新 README。

## 2026-11-27 · 物品栏判定统一、敌方多动递减、紧急格挡去脚步（b5c0dc8）
- 核心目的：消除物品误灰和技能口径提示；保留高敏敌人多动但让玩家更早插手；紧急格挡只保留挡住攻击时的撞击声。
- 文件：`tactics/src/{battle,clock,scheduler,main,ui-shell,guard-barrier-fx}.mjs`、界面提取器及生成模块、战棋 S02/时钟契约/典型对局、定向夹具与产物验证、`tactics/mvp-standalone.html`。
- 物品：父子卡、悬停和实际使用统一读物品判定；子项不占技能索引。使用仍扣一辅；道具按共享次数、消耗品按数量，无限道具不减库存。缺辅、缺 MP、仅绑定与库存耗尽不再混称。
- 排轴：高敏眷族 270、犹格 203 不变。每只 AI 敌人在同一玩家操作间隔内每动一次，后续推进速度除以 1 加累计次数；玩家实际取得自然行动时清零，不抹进度。典型十单位无干预的前 1000 虚拟时间，玩家首动前敌方 5→3、全敌最长连动 6→5；眷族 18 动、犹格 15 动，仍各多于任一玩家。勘误：L740 将索恩写成拥有动能冲踏不实；索恩是风行者，本轮不改职业。
- 格挡：手动舍身蓄势、起步两段重甲脚步均移除；自动召唤守护的单次脚步和命中格挡声保留，动画与规则不变。
- 验证：首次全量 1202 通过后停在 TR2-B 旧顺序夹具；按实际角色到轴修订，32 项定向通过。经用户确认重跑，42 阶段 1275/1275；单文件 59 模块/44 断言，产物专项 63/30/15，SHA-256 `fa5f7bf0980b14614048de093126dab7a8988524f8f60459f728e3578f8a26e1`。IAB 同一产物看到敌方开场进入玛德琳回合、防御耗主后猫眼石仍可用、瞄准确认后扣辅；库存复验有产物断言，IAB 未复读使用后卡片。未切换正在前台游戏的雷电，未实听格挡声音。
- 目的 vs 现状：三项已入包，相关交互和规则已验证；声音听感待用户自测。未更新 README。

## 2026-11-27 · 召雷推拉运镜、原版秘术/奇物/召唤/造雾与敌方兜底群攻移植（a2422fb）
- 核心目的：召雷术蓄力微推、落雷瞬间拉远（顿帧仍为 0）；音叉三件、飞沙化甲、蝎眼钥匙、高阶召唤术、伊西斯之拥、我方造雾术、怪物近战/远程/法术通用群攻全部换成 index 原版演出，召唤物出场加过渡。
- 文件：`tactics/tools/extract-rpg-av.cjs`、`tactics/src/vendor/rpg-av/{rpg-av.mjs,rpg-av.css}`（重新生成）、`tactics/src/{fx-library,demo-fixture}.mjs`、`doc/tactics/典型对局-战棋版.yaml`、`integration-test/fixtures/tactics/{fx01,p07av-fx}-node-cases.mjs`、`tactics/mvp-standalone.html` 与产物报告。
- 底座：抽取器新增入口 playIsis / playFeiShaHuaJia / playXieYanKey / playHarmonyShelter / playSilenceDomain / playShatterResonance / playMeleeGroup / playRangedGroup / playSpellGroup，另原样带入顶层 RLYEH_FOG_CLOUD_URL、playEldritchWhisper、buildRlyehSedimentFxHtml、buildTitanGazeFxHtml 及其关键帧。宿主补丁：蝎眼钥匙裂隙钉在召唤落点（新增 at 参数，粒子半径沿用原版 1280×720 基准）；谐律之庇音叉悬于受益者包围盒上方 260px。屏幕/视口单位等通用补丁计数随新段同步上调。
- 召雷：条目内自编排镜头（仍 cine:false、无遮幅无时停）：蓄力 900ms 以施法者与爆心中点缓推 1.35×（经 ZOOM_AMP 实际约 1.12），落雷拍 90ms 急拉到爆心 0.66×（实际约 0.89），余韵末 380ms 回位。
- 秘术/奇物：伊西丝之拥、飞沙化甲、谐律之庇、静默之域、碎裂之响、蝎眼钥匙、高阶召唤术改为 identity 级直调原版（与灵风术同口径，不再叠战棋屏幕氛围层），规则结果按原版拍点揭示：伊西丝 1100+260ms 起每人 200ms 错峰（真实驱散追加原版尾韵）、飞沙 280ms、谐律 900ms、静默/碎裂 950ms（碎裂命中追加原版碎光）、蝎眼钥匙单防 2840ms。原版定帧在战棋恒为 0。
- 全屏 SVG：高阶召唤术=原版巨神凝视（古神三全音 + san-shake-dread 震屏 + 视口层暗影/巨瞳/精神海啸，对侧存活单位缠绕）；造雾术=原版黑曜沉潮（fog.mp3×2 + fog-shake-std + 视口层雾浪/蒸气柱，雾区内单位缠绕，300ms 揭示常驻雾区）。
- 召唤过渡：专属召唤特效期间先隐去落点上的新单位，到显形拍点（高阶召唤 520ms、蝎眼钥匙 1900ms）从光核凝形（缩放回弹 + 高光褪去 + 脚下召唤环 + 上升光尘），被打断即复原可见。
- 造雾分流：埃利奥特【拉莱耶造雾术】改 [特效:造雾术] 走原版；深潜者【拉莱耶造雾术】保留战棋版浓雾演出，特效标签独立为 [特效:拉莱耶造雾术]（abyss-fog 同时保留旧标签浓雾）。
- 兜底群攻：新增 enemy-group-attack（fxTags group:melee/ranged/spell）；中性兜底在“敌方 + 无特效标签 + 范围攻击 + 有受击”时按伤害类型转入原版群攻，揭示按原版接触拍点（近战刃尖扫过、远程主晶落点、法术同拍）。按原稿去掉极地暴风雪/时空扭曲震荡/维度撕裂的战棋自制标签，三者走原版法术群攻（旧 frost-blast/void-quake/line-rift 条目保留未删）。YAML 决策记录同步两条。
- 验证：相关组 fx01/p07-av/p07-av-fx/typical-*/av/domain-region 通过（p07-av-fx 按有意变更修订全屏条目计数 20→14、burst 19→13、灵风术导出正则，并新增原版入包断言）；唯一全量 42 阶段 1276/1276。单文件 59 模块/44 断言，产物专项 63/30/15，SHA-256 `17b2a29faf86b5d283891ffadb0c9296c8e497b1ad534342c4a5c52e6dd2250d`，新入口与标签已入包（压缩形式）。完整工作台实播零报错：召雷镜头 1.000→1.117→（落雷）0.887→1.000；伊西丝双翼/暗场、飞沙盾框、三音叉层/WebM/闪色、巨神凝视震屏与 6 个缠绕、蝎眼裂隙定位在落点、造雾雾浪均出现；group:melee/ranged(14 晶)/spell 均出现原版构件。工作台自带桩版中性兜底，未在工作台验证“无标签→群攻”分流（实战走库内兜底，逻辑与显式标签同一条目）；被控浏览器在后台、截图帧滞后，观感以用户复测为准。
- 目的 vs 现状：一致；召唤过渡与群攻观感待用户在对局中复测。未更新 README。

## 2026-11-27 · 精英强力技能专属特效、枪击穿透准心同拍、增益施加动效与头像弧光、整备演出（d5e4778）
- 核心目的：精英强力技能有辨识度；增益/减益施加到持续全程可读；【枪击穿透】准心与伤害同时出现；整备有演出。
- 文件：`tactics/src/{fx-library,screen-showpiece,unit-view,status-ui,main,action-director}.mjs`、`tactics/tactics.css`、`tactics/tools/extract-rpg-av.cjs` 与重新生成的 `vendor/rpg-av/rpg-av.mjs`、`doc/tactics/典型对局-战棋版.yaml`、`integration-test/fixtures/tactics/{p07av-fx,ui-readability,hit-feedback}-node-cases.mjs`、`tactics/mvp-standalone.html` 与产物报告；`doc/tactics/STATUS.md` 补记上一轮（用户已确认）。
- 枪击穿透：开场 300ms 改为枪口青光聚能；弱点准星移到命中拍，与 reveal 同一回调以 snap 帧（满亮急收）出现。实测发现三档重击数字仍等原版 60ms 定帧才弹出，按“顿帧恒为 0”在抽取器补丁 `const stopMs = 0`，命中/闪避两种情况下准星与伤害数字同一任务出现。
- 精英技能（YAML 重新挂标签）：
  - 极地暴风雪 `[特效:极地暴风雪]` L3 2950ms：冰原色罩 + 霜纹阵逆旋 + 雪粒三波螺旋卷入 + 预告霜环 → 双层暴风雪涡旋 + 冰锥群坠地（目标逐个冰棱封裹并揭示）+ 霜冻地表 → 斜吹飞雪；蓄力起手 frost-gather（L2，周身寒气涡旋 + 冰晶冠）。屏幕主演出加上下屏缘横吹风雪带。
  - 时空扭曲震荡 `[特效:时空扭曲震荡]` L2→L3 2550ms：奇点生成 + 三重时轮反向坍缩 + 逆走时针 → 奇点内爆 → 色差三重冲击波 + 空间晶片外飞 + 目标时空残影错位与暗纱 → 涟漪余震；新屏幕主演出（四角破碎时轮 + 屏缘裂纹 + 色差冲击环）。
  - 维度撕裂 `[特效:维度撕裂]` L2→L3 2450ms：沿射线描出锯齿裂缝频闪 → 自施法者向远端撕开星点虚空裂隙，沿途目标按真实距离被斜斩揭示 + 虚空触丝 → 闭合白闪；蓄力起手 rift-gather（L2，周身空间裂纹频闪 + 奇点）；新屏幕主演出（上下屏缘撕裂缝 + 斜贯裂光）。
  - 三条目仍保留旧标签 冰霜爆炸/虚空震荡/直线裂隙 作别名，条目 id 不变（屏幕氛围映射沿用）。
- 增益施加：playSupportEffects 在原版辅助 SVG 的同一揭示拍点叠加按种类区分的动效（增攻炽焰刃 / 增防六角甲片合拢 / 瞄准准星收紧 / 回避疾风弧 / 增速疾光 / 减益紫色下沉折纹 + 暗雾 / 嘲讽怒波 / 隐匿灰雾 / 反击双刃 / 驱散负面碎片剥离）。
- 头像弧光：unit-view 新增 `.t-unit-auras` 与 setAuras；status-ui `auraList` 把徽章映射为弧光种类（同种一层、由内向外最多 4 层，持续伤害/麻痹/护盾已有独立层不重复）；renderStatus 每次刷新同步，新出现的弧环收拢显形，即将到期加快明灭。CSS 纯 conic/repeating-conic 弧形 + 环形遮罩，各类配色/弧形/转速不同。
- 整备：main 改为 runReady（锁定输入）→ 导演 playReady（镜头引导 + 翠色扫环自头顶掠下 + 负面碎片剥离 + 翠光上扬 + 飘字），播完交还。
- 验证：相关组通过（p07-av-fx 按有意变更修订全屏条目 14→16、burst 13→15，测试桩补 children；UIR-F 正则改认新调用；THIT-02 改为重创数字即刻出现）；唯一全量 42 阶段 1276/1276（在去 60ms 定帧补丁前运行，补丁后复跑 hit-feedback/av/p07-av/p07-av-fx/feedback-av/counter-av 全部通过）。单文件 59 模块/44 断言，产物专项 63/30/15，SHA-256 `47a8807e1bdebd5a1770a0696fe53a8f7a014675adbb6147bc476917eb898a88`，新条目与弧光样式已入包。工作台实播零报错：暴风雪冰锥/涡旋于爆发拍出现、伤害随冰锥揭示；三技能与两个起手均播放；群体增益九类效果施加动效出现；playReady 正常结束；头像弧光四层 50→71px 嵌套渲染。工作台不走 main 的 renderStatus，弧光随实际状态增减与整备入口只能在正式对局中验证。
- 目的 vs 现状：一致；观感与弧光强度待用户在对局中复测。

## 2026-11-27 · 战棋转向单房间开局即战（3fad69f）
- 核心目的：战棋负责承接酒馆已开战的剧情而非独立探索；按单房间开局、基础攻防、可破坏地形与追击、集火与 Charge 的顺序施工。
- 文件：`doc/tactics/{SPEC,PLAN,INDEX,STATUS,RESOURCES,TYPICAL-BATTLE-CONTRACT,GUARD-BARRIER-FRONTEND-HANDOFF}.md` 与 `doc/tactics/obsolete_documents/`（7 份过期 Markdown）。不移动当前运行、打包和测试仍读取的三层礼拜堂 YAML；旧场景归档留到第 1 阶段迁移。
- 决策：删除场景迷雾/听力和跨房间接战前置，保留技能雾。Charge 是充能资源，满时只画一次意向，正式释放按最新合法站位重新选点；文档分别记录目标规则和现有 Demo，不把计划写成已实现。
- 验证：14 份改动文档的 184 个相对链接目标均存在，`git diff --check` 通过。纯文档轮次，未改源代码/配置样本/README，未运行功能回归或重新打包。
- 目的 vs 现状：路线与目标一致；下一次施工从单房间与典型对局迁移开始。

## 2026-11-27 · 单房间礼拜堂作为后续可玩基线（5490033）
- 核心目的：以现有典型阵容、行动轴、技能、反应、召唤及结界验证单房间开局即战，不提前开做后续战术机制。
- 文件：`tactics/src/{generation,scene,chapel-art,scenario-data,main,sandbox,battle,ai,perception,range}.mjs`、`tactics/{index.html,tactics.css,mvp-standalone.html,DEMO.md}`、`tactics/tools/{build-demo-html,run-tests,verify-typical-artifact}.cjs`、单房间断言与产物报告、战棋路线/规格/现状/典型对局契约。
- 决策：三档种子地图与新场景ID隔离旧存档，默认小档礼拜堂；地形连段按种子八向，阶梯形占格与表现一致，保留中央2格通路。四角2×2石柱实挡且另计，南北门阶仅装饰。双方开局已知位置，不跑普通接战警戒及发现停步；保留合法遮挡、技能雾及独立旧夹具（`?demo=chapel`）。
- 验证：追加连体障碍前唯一源码全量 43 阶段 1293/1293；追加后仅复跑受影响的 arena（139/139）、p02/p05、typical-space/AI/battle 与 alerts，全部通过。当前产物 59 模块、44 入包断言、66/66 产物专项，SHA-256 `0f2125c2b4e95c2a259623b05e2e88363b2ca3446c22c96aa0d626fedd36853c`。IAB 真页实测敌方开战、索恩反应扣费、玛德琳移动2米（8→6）及重置恢复资源，截图核对场景构件。未验真酒馆/安卓或完成整局，不更新根 README。
- 目的 vs 现状：一致；该单文件是下一阶段的开发基线，友军穿弹、掩护、扩距舍身、借机、双跳、破墙、集火和 Charge 意向仍未接入。
## 2026-11-27 · 单房间礼拜堂重设计为大档教堂中殿（9a709ce）
- 核心目的：单房间 Demo 宽松容纳 10 名角色（含两名 2×2），一眼可辨为教堂，障碍错落有战术层次，美术对齐旧三层图。
- 文件：`tactics/src/{generation,scene,chapel-art,scenario-data}.mjs`、`tactics/{DEMO.md,mvp-standalone.html}`、`tactics/tools/verify-typical-artifact.cjs`、`integration-test/fixtures/tactics/{arena-node-cases.mjs,reports/TYPICAL-BATTLE-artifact.json}`、`doc/tactics/{SPEC,PLAN,STATUS}.md`。
- 决策：`chapel` 固定大档 32×26 骨架、忽略档位，不再走随机八向连段（stone/wild/courtyard 保持原随机障碍）。北端抬高圣坛（祭坛、双烛台、布道坛+读经台按种子左右互换，后墙三扇彩窗投光）；中殿左右 7 排长椅夹 2 格红毯中道，逐条按种子完整/缩短/外移/推向中道/倾倒/断裂/缺失；侧廊 6 根立柱，靠墙 4 槽位每侧不重复抽取告解亭/圣器柜/圣像/石棺/挂毯；南墙双开大门（装饰，规则仍为墙）、门内圣水池与靠墙长凳。新增 kind：pulpit/lectern/candelabra/font（低）、confessional/cabinet（高）、dais/apse/chapelDoor（装饰），删除 chapelSteps。敌方开战带在圣坛台阶前（行 6–7），我方在中殿后段（行 19–20）。objectsIndex 透传 side/variant（顺带修正旧三层图东侧挂毯贴错墙）。新场景 ID `sc-chapel-nave`，避开本地存档里的旧单房间布局。
- 验证：相关阶段 arena 140、p02 70、p05 10、typical-space/ai/battle 与 alerts 通过；唯一一次全量 43 阶段 1416/1416。单文件 59 模块/44 入包断言，产物专项 66/66，SHA-256 `51a908fba55b95eadd57262467d5684f4e29cefd9e2eced7be35d8e499896158`。真页实测：大档礼拜堂渲染正确，开局敌方先手与反应窗口正常，玛德琳真实点击移动（列 20→22），雕像格提示无法到达。
- 目的 vs 现状：一致；开局高敏敌人多动+群攻跨中殿仍能先手重创我方（旧平衡问题，本轮未动）。

## 2026-11-27 · 技能雾不再隐藏棋子，仅限制瞄准（288c482）
- 核心目的：雾中头像、血条、检视与行动轴仍可见；只管出手前的瞄准，不改合法攻击的命中覆盖和伤害。
- 文件：`tactics/src/{main,sandbox,perception,range,regions,battle,ai}.mjs`、`tactics/{tactics.css,mvp-standalone.html}`、`tactics/tools/{run-tests,verify-typical-artifact}.cjs`、`integration-test/fixtures/tactics/{alerts-node-cases,fog-aim-node-cases}.mjs` 及单文件专项报告、`doc/tactics/SPEC.md`。
- 决策：敌我共用瞄准查询；远处不能单锁受对方雾保护的目标，贴脸、合法范围技仍可打。身处对方雾时远瞄一格外的目标或模板不扣资源并提示无法瞄准；近战冲锋仍沿方向移动接触。已知位置不等于能锁定，AI 仍走同一合法性检查。
- 验证：唯一源码全量 44 阶段 1430/1430；独立审查后的冲锋补充复跑雾专项 15/15、典型战斗 52/52。单文件 59 模块、44 入包断言，产物专项 66/66、反馈 30/30，SHA-256 `f484d1951d548c39d1969aef1184078f4b88994486c86b23e64ebc2075180531`。IAB 在单文件测试战斗设置有效敌雾后确认远距单点拒绝且主行动不减，范围攻击使敌人 HP 300→269，雾和头像、血条仍可见。未启动雷电或操作真实酒馆。
- 目的 vs 现状：一致；雾的显示、瞄准与伤害结算已分开。

## 2026-11-27 · 三层棋盘恢复与战斗行动流程更新（9fb0804）
- 核心目的：恢复三层礼拜堂 Demo，敌方开局直接接战；修正看破时序、舍身范围和行动点支付。
- 文件：`tactics/{index.html,mvp-standalone.html}`、`tactics/src/{battle,ai,main,ui-shell,av-host,action-director}.mjs`、战棋打包与测试门禁、`integration-test/fixtures/tactics/` 定向用例和产物报告。
- 决策：双方开局已知位置，保留墙、门和技能雾的实际限制；三层精英每次自然行动最多两跳，空旷处跳优先、前方需越障时先留次数给起跳点。敌方施技扣费后先交由我方全队看破，放行才进入命闪、普通反应及伤害；舍身改用守护者完整有效移动。辅点先用，辅点不足按 1:1 补扣主点；实际获得主点时播阵营提示音与已有角色语音。
- 验证：全量首跑遇到旧发现断言中断，修正后仅复跑受影响的组，并续跑未执行的阶段；累计 46 阶段 1429 项通过。自包含单文件 59 模块、44 项入包校验，专项 63/63、反馈 25/25、舍身与结界 15/15。IAB 已确认 `sc-chapel` 加载及开场，页面处于 `hidden`，未跑通整段交战或实听音频。雷电未启动，未测试。
- 目的 vs 现状：规则和产物断言已通过；浏览器回合交接与实听验收仍待复测。

## 2026-11-27 · 贴脸舍身让位与原地替挡（899200a）
- 核心目的：不要因缺少敌人一侧的普通移动空格，让范围内的弗兰克无法替受击队友格挡。
- 文件：`tactics/src/{guard,battle,action-director}.mjs`、`tactics/mvp-standalone.html`、守护测试与产物验证脚本/报告、`doc/tactics/GUARD-BARRIER-FRONTEND-HANDOFF.md`。
- 决策：舍身资格与落点分开，高墙和关门阻隔才使范围内的普通舍身失去空间资格。贴脸优先让队友后退或侧后退一格，弗兰克接管原格；无合法位置时原地承伤，不叠格也不产生碰撞伤害。召唤物致死守护沿用旧选点。
- 验证：全量 47 阶段 1438 项通过；单文件 59 模块、44 项入包校验，守护专项 16/16、典型战斗产物 63/63。IAB 单文件用贴脸试局弹出「紧急格挡」并选中，弗兰克在第 36 行从列 9 到列 11、HP 180→140、MP 17→16；队友列 11→10、HP 保持 100。未在雷电或真实酒馆运行。
- 目的 vs 现状：一致；贴脸有位则让位，没位也能格挡。

## 2026-11-27 · 第一批走位战术：射界、低墙、背袭、借机与折影步（15daf9e）
- 核心目的：让玩家能从棋盘预判射界、掩护、背袭收益和步行脱离近战的代价。
- 文件：`tactics/src/{range,battle,movement,ai,main,action-director,parser,ui-shell,demo-fixture}.mjs`、`doc/tactics/典型对局-战棋版.yaml`、`tactics/mvp-standalone.html`、`tactics/tools/{run-tests,verify-phase2-artifact}.cjs` 及定向用例。
- 决策：远程直射跳过同阵营单位；贴低墙只为玩家抵减 25% 的符合条件来袭伤害，背袭按正后总宽 45° 单独判定。双方借机在离开完整占格外沿八邻域前按顺序结算，额度随自然行动刷新；AI 可权衡风险。仅反应折影步可在闪避成功后选 2 米落点，换格取消旧路线；主动版选 5 米内本人可见空地，付 1 辅＋4 MP，辅不足允许主点代付。职业新增被动留第二批。
- 数据：屏息瞄准 60→20；砷弹射击 20×1 米、从西班牙射击 25×1 米直线贯穿；两名敌方深潜者造雾半径 5→3，埃利奥特版本不变。
- 验证：全量首跑在旧的深潜者半径断言中断，修正后只复跑受影响组并续跑未执行阶段，累计 49 阶段 1452 项通过；闪现卡片修正后定向复跑通过。单文件 59 模块、44 项入包校验和第一批产物专项通过，SHA-256 `9488c7468cbc1f118ee48b474c1d23efdd01437e19405961c2bc93841004d8c4`。IAB 实页：借机反应选格后埃利奥特由 (4,3) 到 (4,1)，HP100、MP20→16、步行仍 6 米；最终产物主动版从辅助栏选格同样位移，辅 1→0、MP20→16，主点与步数不变、无借机事件。未在雷电或真实酒馆运行。
- 目的 vs 现状：一致；第一批规则、预览及两种折影步交互已验证，不扩展第二批职业被动。
