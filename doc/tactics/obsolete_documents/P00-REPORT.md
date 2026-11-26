# P00 技术验证报告

## 核心目的

验证独立战棋前端的浏览器绘制、相机坐标、一个可执行的寻路／视野方案，以及单 HTML 在模拟酒馆助手 iframe 中的承载能力。只完成 P00 技术探针，不创建正式战棋界面，不开始 P01。

## 具体任务与结论

**结论：本次约定的 T00-01—T00-04 均通过 IAB 实际执行。** 该结论只覆盖固定小图、四向绕墙、格网视野与固定扇形、按钮控制的平移缩放及单 HTML 分发；不代表最终战斗规则或真实酒馆导入已通过。

- 推荐的表现底座：**Phaser 3.90.0，Canvas 渲染**。
- 推荐的 P00 规则候选：**ROT.js 2.2.1 的 AStar + PreciseShadowcasting**；渲染只消费其查询结果，不另建遮挡判定。
- 八向几何成本不符合 ROT 原生 AStar 的等步成本语义，不能将本探针直接当成 P04 的最终寻路实现。
- 单 HTML：[probe.html](../../../tactics/p00-probe/probe.html)，**1,228,969 字节，约 1.172 MiB**。
- 浏览器结构化记录：[results.json](../../../tactics/p00-probe/evidence/results.json)。
- 本地工作目录：`D:\Project\RpgCombat`；分支 `fix/summon-subdue-slot-turns-audit-20261009`；任务起始提交 `4d37aa5`。业务提交哈希按两步法记于 LOG／LOG-INDEX，避免报告自指。
- 调研及执行跨本地 2026-11-20／21；报告日期 **2026-11-21，Asia/Shanghai**。服务日志使用 UTC，故可见 `2026-11-20T...Z`，不是不同轮次。

## 阅读与隔离

已阅读 AGENTS、战棋 INDEX／SPEC／PLAN／RESOURCES、技能 SVG 模板使用说明及母版的宿主、坐标／临时锚点与四接口区，并只读参考原 `index.html`：

| 原入口 | 本轮所得 | 本轮使用方式 |
| --- | --- | --- |
| `renderTurnQueue`，20550—20717 | 现有行动轴槽位、圆形头像及 FLIP 坐标来自 DOM | 只读；没有复制行动轴或调度规则 |
| `getEntitySpriteDom`，20720—20725 | 实体 ID 对应原 DOM | 只读；新探针不把原 DOM 坐标当世界位置 |
| `arcaneVfxModule`，5729 起 | `mkAnchor`／`ctr` 属于屏幕演出接口，与世界逻辑不同 | 留作以后世界→屏幕适配参考；本轮未移植技能、粒子或音频 |
| `demo-skill-vfx-template.html` | 含 Tailwind CDN 与 Google Fonts，并非离线分发模板 | 没有整页复制；探针采用本地样式和系统字体 |

按技能要求补读本地 TavernHelper 文档的楼层 iframe／代码围栏章节、`generateRaw` 签名。没有访问 `127.0.0.1:8000`、真实酒馆或账户服务，没有调用 LLM 或其他 Agent。

新增／修改只在 `tactics/p00-probe/**`、`integration-test/tactics-p00-harness.html`、本报告和 LOG／LOG-INDEX。原 index、v12.16 包、根 README／SPEC、旧 harness／夹具、MMS 与技能／提示词未修改；没有执行根构建器或原 RPG 全量。

## 版本、许可证与候选比较

版本核查来自官方 GitHub 仓库／版本源码、官方文档和 npm registry 包元数据，**核实后才安装**。不是根据旧 RESOURCES 中的已知信息推断当前版本。

| 候选 | 实际核查的精确版本／提交 | 许可 | 能力与本轮选择 |
| --- | --- | --- | --- |
| Phaser | npm latest／GitHub latest 均 `4.2.1`；选用 `3.90.0`，npm gitHead `a9965625f49cf366584f454556b039e06e8adad6`，官方标签 `v3.90.0` | MIT | 选用 Canvas、Graphics、输入、Scale FIT 和相机；不启用物理／音频，不采用 Phaser 4 文档冒充 3.x 接口 |
| ROT.js | `rot-js@2.2.1`，标签 `v2.2.1`，提交 `46782e248c2db9d379a5e4f13bb8323f18dff04b` | BSD-3-Clause | 选用两个真实子模块：四向 AStar 与八邻接 PreciseShadowcasting；不导入调度器或地图生成器 |
| Rex Board | `phaser3-rex-plugins@1.80.20`，gitHead `6e1b174230b0e3ec97f8b4cbf2f10e5933a8d833`；当前文档实际安装 `phaser4-rex-plugins@4.2.0`，gitHead `43637cc8d5051b6bcc3fe38656832f26d5f3184d` | 两个包及对应仓库正文均 MIT | Board 提供格网、世界／格坐标转换，并链接 Pathfinder／FOV；本轮不安装，不与 ROT 叠建权威查询 |
| Phaser Raycaster | `phaser-raycaster@0.11.1`，gitHead `cd50bef4aa81a29bbaa6f11fcc35426b05cdd451`；Tags API 最新可见标签仍 `v0.11.0`，不是 npm 版本标签 | **npm 与 package.json 为 ISC，精确提交的 LICENSE 正文却是 MIT** | 官方 README 声称支持 Phaser 3／4，并提供 cast／castCircle／castCone；许可元数据不一致、未实测 3.90，且本轮 ROT 已足以证明墙遮挡，故不安装 |

### Phaser 3／4 边界

1. [3.90.0 发布页](https://github.com/phaserjs/phaser/releases/tag/v3.90.0)注明发布于 2025-05-23。调研时 [latest API](https://api.github.com/repos/phaserjs/phaser/releases/latest)返回 `v4.2.1`，发布日期为 2026-07-09。使用裸 `npm install phaser` 会走另一主版本。
2. [相机概念页](https://docs.phaser.io/phaser/concepts/cameras)同时列 4.x 与 3.x 版本入口；具体实现以 [3.90.0 BaseCamera API](https://docs.phaser.io/api-documentation/3.90.0/class/cameras-scene2d-basecamera)及 [v3.90.0 Camera.js](https://github.com/phaserjs/phaser/blob/v3.90.0/src/cameras/2d/Camera.js)为准。
3. Rex 仓库名字仍含 `phaser3`，README 已写 Phaser4；[Board 文档](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board/)当前 npm 命令指向 `phaser4-rex-plugins`。3 系包精确提交的开发依赖写 `phaser: v3.85.2`，4 系写 `phaser: ^4.2.0`；这不是与任意 Phaser 版本互通的证明。
4. Raycaster 0.11.1 的开发依赖写 `phaser: ^4.1.0`。README 同时声称 3／4 支持，但本轮没有测试该插件，不能把宣传兼容性当作已验证兼容矩阵。

### 为什么选择这一套

Phaser 3.90 的表现、输入和相机足以完成当前验证，版本化文档清晰；ROT 无需额外 Phaser 插件即可在纯 Node 与浏览器中调用同一算法模块。仅两项直接运行依赖和一项构建依赖，避免为技术探针引入 Board、射线插件、生成器或完整游戏。

**不建议**：使用不锁版本的 Phaser latest 配旧 3.x 示例；把 Rex 当前 Phaser4 文档当成 Phaser3 安装说明；同时安装 ROT／Rex／Raycaster 各算一套视线；通过 CDN 运行单 HTML；直接复制带外链的 SVG 母版；把 ROT 四向探针通过等同于已满足完整八向移动。

### 已安装的最小依赖与许可保留

| 名称 | 精确版本 | 用途 |
| --- | --- | --- |
| phaser | 3.90.0 | 官方 `dist/phaser.esm.js` 实际打包进入 IIFE |
| rot-js | 2.2.1 | 仅打包寻路／FOV 所需子模块及其基础依赖 |
| esbuild | 0.28.2 | 构建期，MIT；本地 Node 24.12.0 满足其 Node >=18 要求 |
| eventemitter3 | 5.0.4 | npm 解析出的 Phaser 传递依赖，MIT |
| @esbuild/win32-x64 | 0.28.2 | 本机构建二进制，MIT |

安装输出：`added 5 packages in 50s`；`npm ls --depth=0`仅三项直接依赖。锁文件保留所有平台的 esbuild optional 元数据，不等于安装了所有平台。没有更新全局 npm／配置；缓存和 node_modules 只在探针目录并由局部 .gitignore 忽略。

注意：官方 Phaser ESM 已预打包 EventEmitter3；Phaser 3.90 上游锁文件记录的是 **5.0.1**，不是本次 npm 解析到的 5.0.4。探针没有另外 import 5.0.4，更没有声称发行包内实现版本随 npm 依赖自动升级；两版 MIT 许可正文已对照一致。

完整 Phaser ESM 内仍带未启用的物理等模块，因此本探针不是经过自定义裁剪的最小 Phaser 发行包。构建在 HTML 注释保留 Phaser／ROT／EventEmitter3／Matter.js／内嵌 poly-decomp／Earcut／Simplify 的许可或上游署名。`poly-decomp.LICENSE`来自 [0.3.0 npm gitHead 的官方许可](https://github.com/schteppe/poly-decomp.js/blob/fdbd8edf4972a1694333eb12286dcd37d48aeeeb/LICENSE)，没有安装该候选包。许可注释中的少量行尾空格已清理，正文不变。

## T00-01：iframe mock 显示与零生成

**输入**：实际构建的 `probe.html`由 mock 读取，经过围栏与实体往返后进入 `sandbox="allow-scripts allow-same-origin"`的 `srcdoc` iframe；分别 1280×720 与 1600×900。mock 在主脚本前安装内存变量接口、当前消息读取及 generate／generateRaw 计数器，不连接宿主真实服务。

**预期**：墙体、地面、路径、两个圆形占位头像初始化；Canvas 实际产出像素；两项生成函数调用均为 0。

**实际：通过**。两个尺寸都返回 `about:srcdoc`，真实 `renderer.type = 1`（Canvas）；首帧对墙中心、起点头像头部、目标头像头部各采样一次，3/3 颜色和 alpha 符合绘制值。IAB 截图确认地图、两个头像及读数可见。每个挂载的 generate／generateRaw 总计数为 **0**。

证据：[1280](../../../tactics/p00-probe/evidence/iframe-final-1280-normal.png)、[1600](../../../tactics/p00-probe/evidence/iframe-final-1600-normal.png)。

## T00-02：平移／缩放后的世界坐标

**输入**：地图原点 `(270,76)`，格宽 46；橙色目标逻辑格 `(7,3)`、世界中心 `(615,237)`。先在相机 `(scrollX,scrollY,zoom)=(0,0,1)`点选，再点击“平移并放大”设为 `(94,10,1.3)`，依据截图再次点击同一目标。所有地图点选均通过 IAB 真实指针事件；harness 要求 `isTrusted`。

**预期**：画布输入坐标随相机变化；`camera.getWorldPoint(pointer.x,pointer.y)`返回目标附近的世界位置，逻辑格和对象 ID 不变；不能直接将窗口／DOM 坐标当世界格。

**实际：通过**，四次代表性实测如下，数值保留一位：

| iframe 尺寸 | 相机 | GUI 点击位置（页面 CSS px） | Phaser 画布坐标 | 逆变换世界坐标 | 格／对象 |
| --- | --- | --- | --- | --- | --- |
| 1280×720 | 0,0,1 | 591,375 | 614.6,237.5 | 614.6,237.5 | 7,3 / target |
| 1280×720 | 94,10,1.3 | 511,356 | 527.3,216.8 | 615.0,236.8 | 7,3 / target |
| 1600×900 | 0,0,1 | 763,399 | 615.2,237.0 | 615.2,237.0 | 7,3 / target |
| 1600×900 | 94,10,1.3 | 673,379 | 526.9,217.4 | 614.7,237.2 | 7,3 / target |

直接页也在两个尺寸实际绘制并点选；1280 前后两次点选、1600 放大态点选同样得到 `(7,3)`。上表只采用具有完整前后对照的 iframe 数据。

相机修改在 scene postupdate 应用，读数在下一次真实 POST_RENDER 后发布，避免修改 zoom 后同一调用中读取上一帧矩阵。没有伪造事件、直接调用点击处理器或靠测试代码预先写入结果。

证据：[1280 平移缩放](../../../tactics/p00-probe/evidence/iframe-final-1280-transformed.png)、[1600 平移缩放](../../../tactics/p00-probe/evidence/iframe-final-1600-transformed.png)。按钮仅为探针控制，不实现正式地图拖拽、滚轮、跟随或 P02 界面。

## T00-03：真实单 HTML、围栏／实体及运行时资源

**输入**：esbuild 将 Phaser 发行模块、ROT 真实子模块与 main 打包为单个 IIFE，内联到 HTML；没有外部模块 import／脚本／字体。mock 先包三反引号围栏，再进行 HTML 实体编码和一次 DOM 解码，验证字节相等后写入 iframe。

**预期**：候选模块实际执行，Phaser 绘制与 ROT 查询产生行为证据；许可保留，单 HTML 在 iframe 中不需要 CDN、外部字体、账户或在线模块。

**实际：通过**。两尺寸 mock 都显示围栏／实体 ✓、子请求 0、CSP 0；Phaser 首帧像素、相机点选以及 ROT 的路径／墙后可见性对照均执行。静态文件内出现库名本身没有被作为通过依据。

- 最终文件 **1,228,969 bytes**；SHA-256 `ce52e405113d6b21b7b23c298f8158a3d668db12d503e231e89af7f7d4642f3e`。
- 页面用系统字体、内联 CSS 和程序绘制头像；Phaser 自带默认纹理为内嵌 data URI，不是网络加载。
- CSP 为 `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:`，未设置外部放行域；测试中 CSP 违规事件 0。
- 直接页 `performance.getEntriesByType('resource')`返回 `[]`。
- mock 宿主只有一条 fetch：`http://127.0.0.1:8123/tactics/p00-probe/probe.html`，用于读取被测完整文件。iframe 内 `resource`条目为 `[]`，不存在 script／css／font／账户服务 HTTP(S) 请求。
- `check-artifact.mjs`实际解析两个内联脚本；对同楼层“本组件＋下一组件”执行围栏保护正对照，并故意加入内部围栏验证下一组件引号会遭污染的反对照。mock 则真实执行实体／围栏处理后的产物。它不是完整复制当前酒馆所有 Markdown／宏／正则管线；真实导入仍待用户。
- 首次直接页截图使用 `6cb7d7e...`版；第一轮 mock 使用 `fcf94fb0...`版。后两次仅修正许可注释的行尾空白和一处原文转录，脚本／CSS／HTML 结构完全不变，剔除许可注释的 SHA-256 始终为 `2f366b52c403ff74cc49764ee93fd40b4e4d0e849c70e9a1d0b8ada1c8c69a6a`。最终 `ce52e405...`版已重新载入 iframe 并在两尺寸重做点选；final 命名的四张截图对应最终文件。

证据见 T00-01／02 四张 final 截图及 [结构化结果](../../../tactics/p00-probe/evidence/results.json)。

## T00-04：实际寻路、视野／扇形与上游限制

### 固定输入与预期

10×8 地图；边界墙、内部墙为 `x=4,y=1..4`；起点 `(2,3)`，目标 `(7,3)`。只通过 `(4,5)`绕墙；视野半径 7，东方 90° 扇形。反对照只移除内部墙。

预期路径 9 步、开墙 5 步；墙后目标虽然在扇形角度及距离内，仍不可见，开墙恢复；东方邻格应在范围内，北方可见邻格不在扇形内。

### 实际：通过

真实 AStar 返回：`(2,3)→(3,3)→(3,4)→(3,5)→(4,5)→(5,5)→(5,4)→(5,3)→(6,3)→(7,3)`。9 步，全部是合法地面且相邻四向步长为 1；开墙路径为 x=2..7、y=3，共 5 步。

真实 PreciseShadowcasting 在有墙图对 `(7,3)`返回可见度 0，开墙为 1；扇形筛选据同一查询得到 false／true；`(3,3)`可见且属于扇形，`(2,2)`可见但被角度筛掉。四条 Node 测试 4 pass／0 fail／0 skipped／0 todo；同一源码经 bundle 后在两尺寸 iframe 内重算并满足 harness。

扇形是“ROT 遮挡结果＋固定角度及欧氏距离筛选”，没有另写第二套射线。画出的青色地面格直接消费该结果；橙色墙后头像是已知固定测试对象，并非实现了隐藏敌人信息层。

### ROT 2.2.1 默认时间／规模审查

以下依据精确 [v2.2.1 源码](https://github.com/ondras/rot.js/tree/v2.2.1/src)及已安装 lib，不运行生成器、不把其限制转成玩法：

| 模块 | 上游默认／实现事实 | 本项目如何处理 |
| --- | --- | --- |
| Map 基类 | 默认宽 80、高 25；是构造默认值，不是最大地图尺寸 | 探针固定 10×8，未引入生成器 |
| Digger | roomWidth [3,9]、roomHeight [3,5]、corridorLength [3,10]、dugPercentage 0.2、timeLimit 1000ms；featureAttempts 20 | 未导入；不采用 1000ms 为项目 deadline，后续若用需另议 |
| Uniform | roomWidth [3,9]、roomHeight [3,5]、roomDugPercentage 0.1、timeLimit 1000ms；roomAttempts 20／corridorAttempts 20；超时可返回 null | 未导入；不把失败自动改为删人、缩图或放松硬关系 |
| AStar | 默认 topology 8；`g=prev.g+1`，8 向启发式为 Chebyshev；没有本轮另外设置的节点／时间预算 | 本轮显式 topology 4；成功不代表满足 1+√2 八向加权、多格占位或动态单位避让 |
| PreciseShadowcasting | 按 R 的格网环扩张，接受 lightPasses 回调；无本轮新增人数／时间硬上限 | 本轮 R=7、topology 8；视野用于格中心，固定扇形再查欧氏距离 |

Phaser Raycaster 文档的 range 默认为 `Phaser.Math.MAX_SAFE_INTEGER`；`detectionRange=0`表示检测全部对象，配置表和 setter 默认值表述不同，本轮未安装／未执行，不将该默认值当作已核实的运行限制。Rex、Raycaster 的性能和版本兼容点均未验收。

## 实际命令与执行记录

以下路径以项目根为当前目录。安装已完成；使用锁文件重建可在相同隔离目录用 npm ci，首次实际执行的是下面 install。

```bash
npm install --prefix tactics/p00-probe --registry=https://registry.npmjs.org --cache "$PWD/tactics/p00-probe/.npm-cache" --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=25000
```

安装前实际查询 `npm view phaser dist-tags`、`phaser@>=3.90 <4`、`rot-js`、`phaser3-rex-plugins`、`phaser4-rex-plugins`、`phaser-raycaster`及 esbuild 的版本／许可／gitHead／依赖字段；均指定 npm 官方 registry、`--fetch-retries=0`与 10—12 秒单次读取超时。GitHub 标签／license／精确源码由 Node fetch 和官方网页读取核对。

```bash
for f in tactics/p00-probe/{main,rules,rules.test,build,check-artifact,serve}.mjs; do node --check "$f" || exit; done
```

六个模块语法均通过。

```bash
npm --prefix tactics/p00-probe test
```

4 条真实算法测试通过，0 失败／取消／跳过／待办，首次实测总耗时约 126ms；这不是地图性能基准。没有运行或消耗原 RPG／P12 的唯一全量。

```bash
npm --prefix tactics/p00-probe run build
npm --prefix tactics/p00-probe run check:artifact
```

最终命令也以等价 `node tactics/p00-probe/build.mjs`和 `node tactics/p00-probe/check-artifact.mjs`执行；返回最终字节数与 SHA，围栏正反对照、许可和脚本解析通过。许可注释修订后只重做产物专项和相关浏览器点选，未重复源码全量。

```bash
node tactics/p00-probe/serve.mjs 8123
```

本地服务只允许 GET 两个路径，监听 127.0.0.1，不自动拉起系统浏览器。探活的两条 HEAD 返回 404 是该服务只允许 GET 的结果；后续真实浏览器 GET 均 200。没有切换系统 Chrome、模拟器或另建真酒馆环境。

IAB 实际调用：`agent.browsers.get('iab')`；`setViewportSize({width:1280,height:720})`／`{width:1600,height:900}`；`goto`后明确等待 domcontentloaded；读 DOM 与截图；用 CUA 点击上述可见坐标，所有 evaluate 均只读。

测试 URL 为 `http://127.0.0.1:8123/tactics/p00-probe/probe.html`和 `http://127.0.0.1:8123/integration-test/tactics-p00-harness.html`。完整本地 GET／HEAD 记录归档于 [http.log](../../../tactics/p00-probe/evidence/http.log)。

### 失败、无效执行与工具限制

- `gh`命令未安装，首次仓库元数据查询报 command not found，之后直接使用官方 API；没有安装全局 gh。
- poly-decomp 猜测的 v0.3.0 标签 URL 返回 404；官方 tags API 证实没有该标签，改按 npm gitHead 读取精确 LICENSE。未下载或执行第三方完整项目。
- IAB 同一标签导航／切尺寸有宿主回退与重载，且 DOM snapshot 有时比当次截图慢一帧。未计入半加载／错误页面；建立独立 mock 标签并按真实 URL、iframe 尺寸与后续断言核对。
- IAB frameLocator 的“平移并放大”点击报告被 `<button>`覆盖；后续截图与只读 elementFromPoint 均显示按钮本身可命中，禁用态 false，改为正常屏幕坐标点击后生效。没有 force、脚本触发或绕过前端逻辑。
- 未使用浏览器控制台／Network 面板工具；IAB 当前有效 API 没有相应读取接口。不能宣称 console 零错误；资源结论依据 Resource Timing、CSP 事件、只读 DOM、实际绘制与本地服务访问记录。

## 尚未验证与退出边界

- **待用户自行验证**：真实 TavernHelper／酒馆的完整渲染管线、长消息处理、实际 sandbox 策略、真实导入和跨组件共存。P00 不发布生产正则 JSON，也不替用户导入。
- **待后续技术决定**：八向 √2 成本／夹角／多格占位、动态门烟与体型、连续几何接触点、视野对称性／边角一致性、视距圆边界，以及生产范围规则。不得默认沿用原生 ROT 等步成本。
- **未验收**：WebGL、Phaser4 或 Rex／Raycaster 运行兼容、低端机／手机、大图与多单位压力、后台节流、拖拽／滚轮／镜头跟随、音画时序和真实浏览器动画性能。两尺寸静态绘制与点选通过不覆盖这些项目。
- 没有设置新的游戏 deadline、人数／节点硬上限，没有地图生成、跑圈、伤害、AI、配置编辑／导入导出或 MMS 同步。
- 没有修改 INDEX／PLAN 的未开工表格，因为不在写入范围；**本报告是本轮 P00 执行记录**，不据此自动打开 P01。

**目的 vs 现状**：已用真实库与最终单 HTML 在 IAB iframe 双尺寸验证承载、世界坐标、绕墙和遮挡，P00 技术探针达标；最终八向规则、真实酒馆和后续战棋功能仍未实现／未验证。本轮到此停止，等待用户检查。
