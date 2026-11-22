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


