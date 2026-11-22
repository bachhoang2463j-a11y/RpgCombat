# RPG Combat - 视觉特效(VFX)设计与实现指南

本文档总结了当前战斗前端的视觉特效渲染架构，用于指导后续开发中如何规范、高效地添加或修改特效。本游戏采用双轨制特效系统：轻量级的**独立 SVG/CSS 特效**，以及重量级的**WebM叠加 + 粒子 + 全屏辉光**综合特效。

---

## 模式一：独立 SVG/CSS 特效 (轻量级、UI级)

适用于单体攻击、Buff/Debuff、治疗、受击准星等短促且需要精准定位的特效。完全通过 DOM 动态注入、CSS `@keyframes` 配合 SVG 矢量图实现。

### 1. 核心原理 (`playSVGEffect` / 动态 DOM 注入)
- **坐标计算**：通过 `targetDom.getBoundingClientRect()` 获取目标中心 `(cx, cy)`。
- **渲染层级**：通过生成一个 `position: fixed; z-index: 96; pointer-events: none;` 的容器包裹 SVG，追加到 `document.body` 上。
- **生命周期**：严格使用 `setTimeout(() => el.remove(), duration)` 确保垃圾回收。

### 2. 设计规范与避坑指南
- **SVG 辉光(Bloom)方块裁剪问题**：
  - **错误**：给外层 SVG 容器或者直接对较小画布内的元素应用大范围 `filter="url(#bloom-*)"` 时，如果 SVG 的 `viewBox` 不够大，光晕会被硬生生切断，屏幕上会看到一个半透明矩形方块（类似旧版刀光bug）。
  - **正确**：推荐在 SVG 内部自建 `<defs><filter>` 并设置超出的渲染边界（如 `x="-40%" y="-40%" width="180%" height="180%"`）；或者干脆放弃 SVG filter，改用外层 DIV 容器的 CSS `filter: drop-shadow(...)`。
- **打击感曲线**：
  - 缩放/突刺类动画，强烈建议使用 `cubic-bezier(0.22, 0.61, 0.36, 1)`（缓出微弹）或类似的贝塞尔曲线，替代平淡的 `linear` 或 `ease`。
  - 例如强力反击的准星：`0%` (极小) -> `15%` (略微放大超调) -> `70%` (回弹锁定) -> `100%` (淡出)，这能营造极强的物理反馈感。

---

## 模式二：WebM叠加 + 全屏辉光 (重量级、AOE/大招)

适用于群体技能、极限爆发等需要全屏震撼视觉的场景。通过多图层协同工作（Canvas + DOM + Video）。

### 1. 架构总览 (`playAOEEffect` & `WEBM_FX_REGISTRY`)
通过 `WEBM_FX_REGISTRY` 注册表定义高级特效，每个标签（如 `火焰01`）对应一组资源的组合：
```javascript
'火焰01': { 
    url: 'https://...', // 透明 WebM 视频地址 
    scale: 1.4,         // 视频缩放比
    particles: 'fire_aoe', // 对应的 Canvas 粒子系统层
    audioUrl: '...'     // 专属音效
}
```
**零延迟加载**：游戏初始化的 `preloadBattleAssets()` 会提取所有登场单位的特效，将 WebM 文件下载并转为 `Blob URL` (`URL.createObjectURL`)，存入 `_fxVideoBlobCache`，确保战斗中瞬间触发无白屏。

### 2. 高质量大招的“五层模型”
开发新的重量级特效时，必须遵循以下图层叠加关系（由底到顶）：

1. **环境光控底板 (Background Vignette)**
   - 作用：压暗非施法区域，让视觉聚焦。
   - 实现：`spawnFocusOverlay(casterDom)`（全屏径向渐变遮罩，施法者高亮）。
2. **全屏辉光/闪光 (Fullscreen Flash)**
   - 作用：表现高能爆发的瞬间盲目感。
   - 实现：创建一个 `inset: 0` 的固定定位 div（如 `spawnFrostParticles` 的蓝白闪 `opacity: 0.35`，或强力反击的 `pc-radial-flash`），持续约 200-300ms 快速衰减。
3. **Canvas 粒子溅射层 (`fx-canvas`)**
   - 作用：提供动态物理细节（碎石、火星、烟雾）。
   - 实现：`spawnCanvasParticles()`。渲染时引擎使用 `globalCompositeOperation = 'screen'` 让发光粒子色彩叠加更加耀眼。包含重力(`gravity`)和空气阻力(`drag`)算法。
4. **WebM / MP4 视频特效 (`playWebMFX`) 最佳实践与避坑指南**
   - **【避坑】浏览器 GPU 图层隔离与实体黑框**：
     - 直接给 HTML5 `<video>` 标签添加 CSS `mix-blend-mode: screen` 时，由于现代浏览器将视频隔离在独立的 GPU 合成图层中，往往只会与视频本身的黑底做混合，导致屏幕上残存巨大的**实体黑色方框**。
     - **解决方案（Canvas 2D 逐像素 Alpha 抠图）**：前端 `playWebMFX` 采用 **Luminance-to-Alpha** 色彩抠图引擎。逐帧将视频绘制到离屏 Canvas 上，通过遍历像素 `Math.max(r, g, b) < 12` 强制将黑底转化为真正的 **PNG 级 Alpha 0 透明度**，彻底消除黑框。
   - **【制作】AI 视频压暗黑底与平滑羽化**：
     - AI 视频生成工具（可灵/Runway/海螺等）导出的黑底视频因 H.264 有损压缩常带有 `RGB 12, 12, 18` 的暗灰噪点。
     - **处理方法**：可在剪辑软件中将“黑色阶/阴影”调低 10% 压沉为纯黑；或在前端处理时开启 `contrast(160%)` 对比度压暗滤镜。同时前端采用 `12~80` 灰阶平滑羽化渐变，确保亮色轮廓边缘 **100% 高清抗锯齿、决无硬边锯齿**。
   - **【形变】自适应宽高比**：
     - 读取 `videoWidth` 与 `videoHeight` 动态按原分辨率比例计算 Canvas 尺寸（`targetWidth / aspect`），避免将 `16:9` 矩形视频强行挤压成正方形导致画面形变拉伸（例如圆形准星变椭圆）。
   - **【渐隐】尾部 0.35s 柔和 Fade-out**：
     - 在视频播放最后 `0.35s` 自动计算 `fadeAlpha` 全局透明度衰减，使特效自然淡出，消除硬断切感。
   - **【音频】音量 2.5 倍 Gain 增益与音效独占 (`audioUrl: 'none'`)**：
     - **音量 2.5 倍放大**：在 JS 中通过 **Web Audio API** (`GainNode`) 建立音轨增益（`gainNode.gain.value = 2.5`），将视频原声音量放大约 **2.5 倍**，音效更爆破震撼。
     - **独占抑制**：在 `WEBM_FX_REGISTRY` 注册项中填入 `audioUrl: 'none'`，可激活引擎的“音效独占”机制，自动压制默认的 `atk1` / `atk2` 普通打击音效，仅播放 2.5 倍放大的视频原声。

---

## 3. 音效与并发管理
- **多通道音效 (`playCustomAudio`)**：不要直接重置唯一的 Audio 对象。系统利用 `audio.cloneNode()` 支持同一个音效瞬间多次触发而不互相打断（例如AOE命中多个目标时的密集打击音效）。

## 4. 后续开发 Check-list
当你要为游戏增加新特效时，请检查：
- [ ] **前摇/蓄力** 是否独立可见？（使用聚集粒子、目标锁定框，至少持续300ms给玩家反应时间）。
- [ ] **高能光晕** 是否裁剪了边框？（检查 SVG `filter` 的长宽配置）。
- [ ] 是否利用了**屏幕震动**和**顿帧**？（好的打击感七成靠镜头反馈）。
- [ ] 大招是否做了**暗场压栈**？（用 Overlay 压暗周围环境，才能突出特效本体的光亮）。
