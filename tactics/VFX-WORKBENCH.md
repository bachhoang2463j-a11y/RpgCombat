# 战棋特效演练工作台与空白母版分工指南

战棋线现提供**两套互补的特效研发与验收工具**，共用同一套上层立柱大厅（`20m × 13m` 四面闭合墙）与上 6 敌 / 下 4 友靶场站位，按场景各司其职。

---

## 一、定位与建议分工

| 维度 | 完整工作台（多文件直连版） | 纯净单文件空白母版 |
| --- | --- | --- |
| **入口文件** | [vfx-stage.html](vfx-stage.html) + [vfx-stage.mjs](vfx-stage.mjs) | [demo-skill-vfx-template.html](demo-skill-vfx-template.html)（多文件开发态：[vfx-template.html](vfx-template.html) + [vfx-workbench.mjs](vfx-workbench.mjs)） |
| **启动方式** | 双击 [启动工作台.bat](启动工作台.bat) 打开 `http://127.0.0.1:8127/tactics/vfx-stage.html` | **双击 HTML 即可运行**，零服务、零网络依赖（静态资源除外部 WebM/音频外全部内联） |
| **是否含 50+ 既有库** | **全量接入**：直连 [fx-library.mjs](src/fx-library.mjs) 全部 `DEFAULT_FX_ENTRIES` | **纯净无干扰**：构建期剥离 `fx-library.mjs`，仅保留同名画法原语 [vfx-primitives.mjs](src/vfx-primitives.mjs) |
| **与原版同步方式** | **免打包实时同步**：直接引用原版 CSS、场景、导演、注册表、音频与 WebM 资源，原版改动后浏览器刷新即生效 | **快照母版**：底座内联锁定，改源码后需重跑 `node tactics/tools/build-vfx-template.cjs` 刷新 |
| **核心适用场景** | 1. 既有 50+ `fxTag` 特效横向对比（音量/时长/L3-L4 围压/粒子）<br>2. 切换 **命中/闪避/暴击/击杀处决** 与 **施法者/单群目标** 做全态验收<br>3. 新特效合入 `fx-library.mjs` 后的联调验收 | 1. **从零研发单个新特效**：复制一份 HTML 直接改底部明文 `<style id="vfx-custom-css">` 与 `<script id="vfx-workbench">`<br>2. 跨会话轻量化交付给其他模型/协作者做单特效 Demo<br>3. 归档特定技能的独立演示页 |

---

## 二、完整工作台如何实时匹配原版最新更改

完整工作台不要求单文件内联，通过原生 `<link>` 与 ES Module 直接加载正式工程正在使用的同一份文件：
- **界面与样式**：`src/vendor/rpg-ui/rpg-ui.css`、`tactics.css`、`src/vendor/rpg-av/rpg-av.css`；
- **演练宿主与导演**：`src/sandbox.mjs`、`src/action-director.mjs`、`src/av-host.mjs`、`src/screen-atmos.mjs`、`src/fx-registry.mjs`；
- **特效条目与资源**：`src/fx-library.mjs`（含 `DEFAULT_FX_ENTRIES` 与 `av-host.mjs` 的 `ASSET_BASE` 音视频资源）；
- **靶场数据**：`doc/tactics/典型对局-战棋版.yaml`。

> 因此，只要通过 [extract-rpg-av.cjs](tools/extract-rpg-av.cjs) / [extract-rpg-ui.cjs](tools/extract-rpg-ui.cjs) 或直接修改 `tactics/src/` 更新了原版表现，**完整工作台无需任何编译步骤，刷新页面即可看到最新效果**。

### 守护 / 结界演示排（控制区第 4 排）

| 按钮 | 内容 | 数据来源 |
| --- | --- | --- |
| 敌攻·直击玛德琳 | 食尸鬼A「撕裂利爪」直接命中，作为舍身对照 | 演出 mock |
| 弗兰克舍身·护玛德琳 | 决意→沿路径突进→到位待格挡→受击拍点盾弧格挡（parry_perfect），不归位 | 真实 `previewGuard`（弗兰克移动 5 的一半 = 2.5m） |
| 结界释放 | 埃利奥特「纳克提特障壁术」爆发拍点展开圆形穹顶（近战肃正 = 银白） | 真实 `previewBarrier` |
| 敌攻·结界受击 | 深潜者A 法术一段：边界接触点涟漪 + 蜂窝聚光 + 耐久扣减 | 真实 `damageBarrier` / `barrierContact` |
| 群攻·击破结界 | 犹格群攻共享一次受击 → 色差闪断 + 80 片六边晶片破碎 | 同上 |
| 减益·结界隔绝 | 食尸鬼A「幽暗凝视」致盲被拦：边界轻受击 + 「隔绝 · 致盲」 | `barrier-blocked` 事件形态 |

受击类按钮在无结界时会先静默立起一座；点击右上 🔄 重置清空结界与站位。

---

## 三、标准研发与移植闭环

1. **研发期（用纯净空白母版）**：
   - 复制 [demo-skill-vfx-template.html](demo-skill-vfx-template.html)（或直接编辑 [vfx-workbench.mjs](vfx-workbench.mjs)），在 `CUSTOM_FX_ENTRIES` 中按 `L1–L4` 规范编写新特效对象，在 `CARDS` 中配置演练按钮；
   - 使用与正式版完全同名的画法原语（`PX`, `worldPx`, `orbHtml`, `particles`, `runeHtml`, `ringHtml`, `flyOrb`, `trail`, `floatText`, `tint`, `worldDarken`, `webm`, `spin`, `grow`）。
2. **合入期（移植到正式库）**：
   - 定稿后将 `CUSTOM_FX_ENTRIES` 中的条目对象**零改写**复制到 [fx-library.mjs](src/fx-library.mjs) 的 `DEFAULT_FX_ENTRIES`（若有自定义 CSS 则并入 [tactics.css](tactics.css)）；
   - 打开 **完整工作台 (`vfx-stage.html`)** 按分级/命中/闪避/暴击/处决/单群目标全态复查，并与既有 50+ 特效横向对齐音量与时长预算。
3. **发布期**：
   - 运行战棋测试与 `node tactics/tools/build-demo-html.cjs` 生成正式单文件交付物 `mvp-standalone.html`。
