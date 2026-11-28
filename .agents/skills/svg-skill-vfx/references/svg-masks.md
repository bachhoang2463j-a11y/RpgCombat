# SVG 遮罩

斩击擦除、光柱消散或局部显隐需要软边遮罩时读取；普通发光与路径推进优先复用现有原语。

## 范围与现有能力

SVG 遮罩语义已作资料核对；下述是配方设计，不是已接入或经过真实页面验证的项目函数。项目路径均相对仓库根目录。

`tactics/src/vfx-primitives.mjs` 已有 `glowDefs()` 的渐变与辉光，以及 `trail()` 的归一化路径推进。遮罩用于控制主体哪些区域可见，不替代这两种能力，也不改变弹道或规则结算。

## 明确遮罩语义与坐标

- 软边显隐使用 `<mask>`；只需要硬边裁切时再考虑 `<clipPath>`。
- 显式选择 `mask-type`：`luminance` 下白色显示、黑色隐藏，灰度及透明度产生过渡；`alpha` 下只看透明度，不能用不透明黑色表示隐藏。
- 若主体按世界美术像素绘制，优先把 `maskUnits` 与 `maskContentUnits` 都设为 `userSpaceOnUse`，并在相同坐标下指定遮罩区域。
- 若选择 `objectBoundingBox`，按归一化边界组织坐标，不与世界美术像素混用。
- 遮罩区域与滤镜区域分别覆盖主体、描边和辉光外缘；只扩大 SVG 的 `overflow` 并不能解除遮罩或滤镜自身的裁剪。

## 三种可采用的配方设计

| 目标 | 主体与可见区域的组织 |
|---|---|
| 法阵或斩击逐步显现 | 主体保持原位，用白色可见窗口逐步揭开；窗口边缘以灰度或透明度渐变羽化 |
| 光柱从一侧消散 | 主体不沿屏幕平移，遮罩窗口沿光柱轴向收回，边缘渐变保留柔软余韵 |
| 局部孔洞或目标周围留光 | 明确使用 luminance 遮罩，以黑色区域隐藏、白色区域显示；需要软边时加入渐变 |

先画清“主体在哪、窗口在哪、窗口如何变化”，再实现动画。遮罩形状可以是简单几何，因为它不是最终可见主体；最终效果仍遵守主技能的美术纪律。

## 项目适配

- 用本次演出的 `uid` 隔离 mask、gradient 和 filter 的 ID；不复制示例中的固定 ID 到并发演出。
- 在现有世界层或视口层挂载，按效果选择坐标；不要把两个层的坐标混用。
- 窗口动画接现有 WAAPI/演出作用域，清场时连同遮罩定义一起移除。
- 若参考配方用了 SMIL，不假定它自动进入 `time-scale.mjs` 的 WAAPI/CSS 倍速同步；移植时改用现有动画机制或单独验证时间同步。
- SMIL `keySplines` 的四个控制点分量都必须在 `[0,1]`；不要复制 `0.34 1.56 0.64 1`，这是外部 `svg-animations` 的无效示例。
- 不把遮罩、滤镜或路径重绘笼统称为纯合成层动画。保持辉光滤镜参数静态，优先动画窗口的 transform/opacity；实际性能与视觉仍需测量。

## 配方成为可复用实现前

验证软边效果与辉光裁剪、两个同类效果并发时的 ID 隔离、镜头移动、倍速切换和重开清场。未运行这些场景的内容保持“待项目验证”标记，不因读过原文就称为已验证原语。

## 来源与边界

- [supermemoryai：svg-animations](https://github.com/supermemoryai/skills/blob/main/svg-animations/SKILL.md)：只取基础遮罩、渐变与路径配方；不是战斗刀光算法或项目适配实现，不照搬其全部 SMIL 示例。
- [MDN：mask](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/mask)、[mask-type](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-type)：遮罩区域与可见性语义参考。
- [MDN：keySplines](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/keySplines)：控制点取值范围核对来源。

本地参考负责保留核验后的知识；只有补充算法、核验接口或发现资料差异时，才按需查阅外部来源。
