# 2026-11-17 — 夜雨/冷雾首次扫射与载入前设置异常诊断

## 核心目的

解释用户报告的两处真实酒馆故障，区分已证实原因与待验证假设；本轮只调查，不修改正式战斗代码或代替用户导入新包。

## 具体任务

1. 检查切换【夜雨】【冷雾】后第一次【连续扫射】头像频闪、屏幕血迹变黑、第二次正常、刷新重现的原因。
2. 复现载入战斗前打开设置、随后载入战斗导致 `undefined.classList` 的异常，定位真实调用与数据状态。

## 调查基线与边界

- 工作目录：`D:\Project\RpgCombat`；源码基线：`f0df9eb`，正式维护包 `regex-前端战斗v12_15.json`。
- 用户批准排障模式后，在 `http://127.0.0.1:8000/` 的真实战斗 iframe `TH-message--0--0` 观察；四名英雄、六名敌人，未创建静态服务、harness 或 mock。
- 刷新、打开设置、载入战斗、准备及释放技能均由用户操作。代理只读源码、控制台、DOM/内存状态，并启动/停止调试记录。
- 未改 `index.html`、README、SPEC、维护包或公开版；已有删除与临时文件不纳入提交。

## ② 设置异常：直接原因与数据切换已证实

### 用户确认的触发路径

不是笼统的“开场以后点设置”，而是：**载入战斗前打开设置 → 载入战斗 → 首回合刷新角色界面时报错**。

### 真实错误堆栈

```text
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'classList')
    at about:srcdoc:29:1278770
    at updateActiveHeroDisplay (about:srcdoc:29:1278429)
    at nextTurn (about:srcdoc:29:1207787)
    at startRound (about:srcdoc:29:1202215)
    at startGame 内的 setTimeout 回调
    at startGame (about:srcdoc:29:1199863)
    at startGameFromWorldbook (about:srcdoc:29:1016404)
    at onclick (about:srcdoc:29:282436)
```

### 出错时的现场状态

| 检查项 | 结果 |
| --- | --- |
| `state.isGameStarted` | `true` |
| `editorLiveHeroes !== null` | `true` |
| `editorLiveHeroes` 四名英雄的 `dom` | 均指向已连接的 `hero-wrap-h0`～`hero-wrap-h3` |
| 当前 `heroesData` 四名英雄的 `dom` | 全部为 `undefined` |
| 战场 `hero-card-h0`～`hero-card-h3` | 均存在 |
| `state.actionQueue` 的英雄引用 | 指向当前无 `dom` 的 `heroesData` 元素 |
| 编辑器 | 仍打开 |

编辑器的 `hero-card-0`～`hero-card-3` 与战场的 `hero-card-h0`～`hero-card-h3` ID 不同，**不是重复 ID 导致选错节点**。

### 与当前源码的对应关系

- `index.html:18418` `freezeInitialCaches()` 明确剥除 `dom`，因此开场基线是纯数据。这一行为本身正确，不应把 DOM 写进缓存或持久化。
- `index.html:20265` `initUI()` 为实时英雄建立 `hero.dom` 并挂载战场节点。
- `index.html:27699`～`27702` `openEditor()` 在战斗已经开始且尚无暂存数组时：保存实时数组到 `editorLiveHeroes/editorLiveEnemies`，随后将**全局** `heroesData/enemiesData` 切为开场基线的深拷贝。新副本没有 `dom`。
- `index.html:25241`～`25271` `startRound()` 用当前全局数组建立队列；没有与编辑器草稿隔离。
- `index.html:27244` `updateActiveHeroDisplay()` 只检查卡片节点是否存在；旧战场节点仍在，因此检查通过。随后 `index.html:27247` 或 `27250` 访问 `h.dom.classList`，无 `dom` 的副本立即抛错。
- `index.html:28573` `closeEditor()` 会恢复实时数组，但已抛错中断的首回合链不会因为恢复数组自动续跑。

**结论：编辑器工作副本与战斗运行数组共用全局变量，首回合误用了不含战场引用的编辑副本。不是性能问题，也不是表单按钮本身的异常。** 现场已证实进入了副本切换分支；未记录 `openEditor()` 每一次进入的调用栈，因此不把“载入前仅打开一次必然如何重入”当作已经观测到的事实。

### 修复方向（尚未实施）

修正编辑器生命周期及草稿/实时战斗数据的交接，保证回合管线始终操作实时实体。仅给 `h.dom` 加判空只能吞掉本处异常，不能解决队列继续使用编辑副本、DOM 点击闭包仍引用旧实体等根因。本轮不改 API、不新增 UI，不把建议写成已完成修复。

## ① 首次扫射：发现渲染负担，但黑块/频闪未再次复现

### 源码证实的负担

- `index.html:524`～`534`：整块敌方战场及施法者卡片每 60ms 震动；最多五个目标每 70ms 插值 `brightness/contrast/drop-shadow`。
- `index.html:16526`：战场震动施加到 `#battle-scene`，其内部包含氛围与敌方层；英雄 UI 和顶层特效 Canvas 是场景外的独立层，不能说它们全被同一父容器震动。
- `index.html:16619`～`16625`：头像内层每 100ms 执行移除 class → 读取 `offsetWidth` 强制同步布局 → 重加 class → 45ms 后移除。`index.html:561`～`566` 的头像脉冲含动态 `filter:brightness(...)`。
- `index.html:16374`～`16430`：镜头血迹每次现场创建，八块 SVG 的路径/圆点均有显式红色 `fill`，另有阴影和三条血泪。**不是血迹视频下载或解码未完成，也不是 SVG 遗漏填色。**
- `index.html:4890`～`4947`：氛围切换重新建立 DOM；夜雨为三层持续移动的 SVG 贴图雨幕，无氛围粒子 Canvas；冷雾有三条雾带、mask 与 16 粒子 Canvas。不能把两种主题一概说成“双 Canvas 并发”。
- 第二次施放仍完整执行演出，`skill._fxPlayed` 在正常施放结束后删除，没有“第二次跳过血迹/头像动画”的设计分支。

真实页面为 `812×600` CSS 像素、DPR `1.875`。三张雨幕每张 `1266×1856` CSS 像素；按整张 RGBA 表面换算约 `31.5MiB/张`、三张 `94.5MiB`。这是**像素面积估算，不是测得的 GPU 显存**，只能说明层面积较大，不能据此宣布显存不足。

### 本次真实施放结果

用户先正常载入战斗，再准备夜雨下玛德琳的【死亡编织-双枪扫射】，代理开始记录后由用户实际释放一次。

- 用户反馈：**没有明显黑块或头像闪烁，只有略微掉帧。**
- 录屏扫射窗口约第 18～21 秒；抽取的画面中血迹正常为红色、轮廓完整，没有看到原报告的黑色块状故障。抽帧只能核对此样本，不能证明原故障不存在，也不能完整量化每帧时序。
- 本次控制台没有新增与扫射相关的 `classList` rejection；其他插件的网络/状态更新错误不当成本案根因。
- 录屏保存：`C:\Users\ELevin\AppData\Local\Temp\chrome-devtools-mcp-frLp6P\screencast.mp4`，约 189.10 秒、39.82MB。等待人工操作的时段较长，下次如需录像应尽量只覆盖施放窗口。
- 本地抽帧：`.audit-work/runtime-diagnosis-20261117/overview.png` 与 `strafe-detail.png`（仅调查临时文件，不提交）。
- `performance_stop_trace` 与第一次 `screencast_stop` 均在 30 秒工具限时后超时；录屏第二次停止成功。性能第二次停止返回无活动记录，未找到/取得可分析的 trace，因此**没有有效性能报告，不宣称测到了 GPU 逐出、checkerboard、显存峰值或实际帧率**。未继续重试或重跑记录。

### 判定

动态滤镜、反复同步布局、大面积氛围合成层是明确的渲染负担；与首次冷启动表现有吻合性，但**黑块/频闪的直接根因仍未证实**。单次等待准备后的成功样本，不等价于“切氛围后立即首播”已经通过验收。不能用该样本证明问题已修复，也不应据猜测削弱特效、降低粒子量或改动全部氛围。

如果后续再次出现，应在同一真实战局只记录异常施放窗口，再做逐项隔离（首先头像动态滤镜/同步布局，再血迹阴影，再氛围层合成）；保留首播与再次的对照。不在本轮制造替代环境或循环要求用户复测。

## 本轮交付状态

- ② 已有真实堆栈及内存/DOM 证据，提出根因级修复方向，**未修复**。
- ① 本次只复现轻微掉帧，原黑块/频闪**仍待验证**。
- 本轮仅新增诊断记录及施工日志；不构建、不跑全量回归、不升版、不上传或推送。正式源码没有修改，测试节奏与打包规则不被触发。
- **目的 vs 现状**：仍围绕解释两处故障；②证据闭环，①保留未证实项，未扩大为未经批准的性能重构。
