# 技能 SVG 模板使用与快速移植

## 核心目的

**以后新对话专注于“技能演出怎么设计”，不再重建战斗 UI、粒子引擎、音频引擎或酒馆环境。**

空白母版：[demo-skill-vfx-template.html](demo-skill-vfx-template.html)；正式版移植目标：[index.html](index.html)。先完成独立 demo、确认观感，再把新增部分合入正式版已有模块。

## 具体任务与新对话开工指令

把下面整块文字复制到新对话，然后发送具体技能需求即可，不需要自行拼接工程说明或替换占位符。

```text
核心目的：在 D:\Project\RpgCombat 中设计新的 SVG 技能特效，复用现有正式版风格战场与特效底座，让确认后的演出便于移植进 index.html。

先阅读根目录 AGENTS.md、技能SVG模板使用与快速移植.md 和 demo-skill-vfx-template.html；技能需求以我下一条消息为准。先对齐量级与范围、蓄势、主体意象、美术风格和音效，已经明确的内容不要重复询问。

本轮只复制空白模板生成新的独立 demo，在现有技能栏添加本次技能。保留空白模板、原 demo、正式版和公开版不动；不新增编辑器、页签或工具栏，不重建战斗 UI、粒子引擎、音频引擎或酒馆环境。

特效复用 arcane 模块的坐标、临时层、计时、粒子和音色工具，保持纯演出。真实数值、状态、闪避与扣盾由正式版结算；demo 的模拟反应只写在演示控制区。

交付完整可打开的 HTML，并附移植清单：精确 fxTag、新增 CSS 与函数、蓄势毫秒、总时长、handle 回调、WEBM_FX_REGISTRY 条目、需核对的默认光效去重和技能标签文本。先让我确认演出效果，再进入正式版移植。
```

---

## 1. 检查结论与适用边界

2026-11-10 对业务提交 `229641c` 的空白模板进行了独立只读审查，并核对正式版接线。本轮只补使用注释和本文，不修改运行逻辑或正式版。

| 检查项 | 结论 |
| --- | --- |
| 原 demo 的顶部、行动条、六敌、四角色、右下技能栏、底部对话栏 | 保留原布局；不是正式版全部菜单功能的复制品 |
| 八个旧技能专属实现、样式与卡片 | 已剥离；通用敌方法术弹卡片也已移除 |
| 默认技能内容 | `ARCANE_TAGS = []`、`CARDS = []`，只有“暂无技能” |
| 正式版通用底座 | 四接口、临时层、计时、粒子、合成音色、两类弹道可复用 |
| 演示宿主与可移植模块 | 已分段，不必从整页筛选业务代码 |
| 直接照注释新增普通技能 | 可以；需登记标签、函数、分派和卡片 |
| 复制上述四处就能在正式版上线 | **不可以**；还需正式版注册表、技能数据和对应类别接线 |

**没有阻断性代码问题，但“可移植”不等于“整页粘贴上线”。** 模板只负责演出，未复制标签解析、战斗结算、默认效果去重或世界书/角色技能装配。

已有静态与内存模拟验证覆盖接口、弹道命中/闪避、拍点、中途清理、音频关闭、普通技能锁定及自然退场；前轮另做过 IAB 独立页冒烟。完整反应结算、驱散、共享屏障和发布包仍要在正式版真实源码/产物测试中验证。**本轮文档检查不是一次新的酒馆实机验收。**

## 2. 母版怎么用

### 固定流程

1. 读本文和空白模板，复制为新的 `demo-skill-<主题>.html`，**不要在母版上堆技能**。
2. 对齐五项设计：量级与范围、蓄势、主体意象、风格、音效；确定单体/群体及普通/反应两种触发语义。
3. 只修改新副本的技能 CSS、实现、精确标签、分派和 `CARDS`；UI 沿用当前槽位。
4. 先做语法与演出冒烟，重点看重复播放、中途重置和收尾，再由用户确认观感。
5. 用户要求移植后，执行第 6 节；母版、旧 demo、公开版不随之改动。

### 需要和不需要阅读的代码

| 场景 | 首先阅读 | 无须重新搭建 |
| --- | --- | --- |
| 只设计普通技能 | 本文、模板的新技能接入区及所用工具函数 | UI、酒馆 mock、完整战斗引擎 |
| 闪避/护盾反应演出 | 再读正式版 `playZheYingBu` / `playWuShiHuDun` 的同类骨架 | 命中率、扣盾和反击规则 |
| 群体屏障/群疗驱散 | 再读 `playNakTith` / `playIsis` | 屏障耐久、负面判定和数值计算 |
| 正式移植 | 第 6 节的源码锚点及实际技能数据 | 第二个特效引擎、第二个注册系统 |

### 页面与运行环境

- 双击新 HTML 可演练；UI 仍沿用母版的 **Tailwind CDN 和 Google Fonts**，不是完全离线页面。新技能自身优先用 SVG/CSS/Canvas/Web Audio，不再引入外部资源。
- 浏览器自动化若不支持 `file:`，用仅本机可访问的 HTTP 预览；停止服务后页面可能仍显示旧内容，不能把旧标签页当作磁盘最新版本。
- IAB 用于逻辑和交互；rAF 停顿、点击动作超时不直接等于代码错误。完整动画观感、音画拍点和性能需要用户确认，或在用户要求“排障”后走真 Chrome 验证。
- 顶部世界书/记录/设置等及底部对话栏是 UI 占位，不连接酒馆；只有技能卡和重置是本演练框架的功能入口。

## 3. 文件结构与新增位置

以**注释/函数名搜索锚点**定位，行号会随增加技能变化。

| 模板锚点 | 内容 | 正式移植？ |
| --- | --- | --- |
| `可移植特效样式 BEGIN / END` | `arcane-` CSS 与新技能关键帧 | 只复制新增样式 |
| `演示宿主 BEGIN / END` | 占位数据、`initUI`、资源条、简化宿主 `fxEngine` | **不复制** |
| `const arcaneVfxModule = (function () {` | 模块私有状态和工具，四个 `window` 接口 | 复用正式版已有模块，不整体覆盖 |
| `接入点 1` / `ARCANE_TAGS` | 可识别的精确特效名 | 合并新名字，保留旧名字 |
| `新技能实现 BEGIN / END` | `playXxx`、专属 SVG 生成与音画时间轴 | 复制新增函数、常量、必要工具 |
| `接入点 3` / `playArcaneSkillFx` | 特效名到函数的分派 | 增加一条分派，保留旧分支 |
| `演示控制 BEGIN / END` / `CARDS` | 测试卡片、模拟攻击与反应、锁定和重置 | **不复制** |

新技能通常只动五类内容：**CSS、`ARCANE_TAGS`、`playXxx`、分派、`CARDS`**。母版保持空白。

### 卡片数据

`CARDS` 每项为 `{ name, level, description, fxTag, casterId, targetIds, isReaction }`：

- `name` 是显示名称；`fxTag` 是模块分派的精确键，两者可以不同。
- `level` 使用 L1–L4，仅影响演示文案，不决定范围或数值。
- `casterId` 使用 h1–h4、e1–e6；`targetIds` 是数组，没有目标的技能也填写 `[]`。
- 群体技能应显式传目标列表，或由技能语义使用 `teamSprites(caster)` 取同阵营存活实体，不能在模块中硬编码 h1/h2/e5。
- `isReaction: true` 只传触发模式，**不自动模拟来袭、闪避成功或扣盾**。

## 4. 可直接使用的工具与契约

以下工具在 `arcaneVfxModule` 闭包内部使用，不是所有工具都挂在 `window` 上。

### 坐标、挂载和帧调度

| 工具 | 真实签名与用途 |
| --- | --- |
| `domOf(entity)` | 通过 `getEntitySpriteDom` 找角色卡/敌方精灵；传实体或 ID，不传 demo 私有选择器 |
| `ctr(dom)` | `{ x, y, w, h, top, bottom, left, right }`，窗口坐标 |
| `unionRect(doms)` | 合并范围，返回 `{ x, y, l, r, t, b, w, h }`；不是 `ctr` 的同一字段组 |
| `teamSprites(caster)` | 施法者所属阵营的存活实体 DOM，包含召唤物 |
| `fsLayer(html, ms)` | 创建 `arcane-fs-layer`，登记到 `S.layers`；固定演出传毫秒寿命，无固定寿命则自行收尾 |
| `mkAnchor(x, y)` / `dropAnchor(anchor)` | 创建/删除临时落点；**不要把真实角色卡传给 `dropAnchor`** |
| `after(ms, fn)` / `every(ms, fn)` / `stopEvery(id)` | 带 `combatToken` 守卫且可被重置清理；周期任务要主动停止 |
| `darken(opacity)` | 创建暗场；自然结束调用 `darken(0)`，还包含约 360ms 淡出 |
| `shake('light' / 'heavy' / 'quake')` | 震动战场；不移动顶部菜单 |
| `flash(dom, 'arcane-flash-cold' / 'arcane-flash-heal')` | 已有闪色和统一清理；新闪色需自己补样式与恢复逻辑 |
| `addP(options)` / `burst(n, makeParticle)` | 粒子登记、绘制与自然寿命回收 |
| `fly(a, b, lift, dur, draw, done, ease)` | 二次贝塞尔弹道；`a/b` 为 `{x,y}`，`dur` 为毫秒 |
| `orbitCharge(center, n, dur, makeParticle, rx, ry, shrink)` | 粒子绕场收束，内部使用已登记的周期任务 |

内建粒子形状：`dot / ring / flame / smoke / feather / shard / streak`。旧 demo 的 `ankh / lotus / star` 没有保留，使用这些名字前要新增对应 `DRAW` 实现并一起移植。

SVG 根节点使用 `arcane-fs-anchor` 定位。新 CSS/keyframes 用 `arcane-<技能>-...`，渐变/滤镜 ID 加 `++S.uid` 防止同时演出互相串色。主动画优先只变 `transform/opacity`；不另建永久 rAF、粒子 canvas 或 AudioContext。

层序：暗场 40、SVG/DOM 52、arcane 粒子 canvas 55、正式版浮字 60/70。宿主的 `#fx-canvas` 是既有引擎画布，不是旧 demo 残留，不能当作 `data-arcane-fx` 统一删除。

### 合成音色

复用 `audio / tone / chime / crystal / click / kick / crunch / boom / whoosh / drone / choir / cry`；原 demo 的 `harp`、`tick` 不属于当前模板工具库。

注意本项目真实签名是 **`tone(delaySeconds, options)`**，不是 `tone(type,f0,f1,dur,vol,delay)`。`tone` 的 `options` 使用 `type/f0/f1/dur/vol/wet/...`；`chime(delaySeconds, frequency, durationSeconds, volume, pan)`。

音频延迟与时长是**秒**；`after/every/fly/fsLayer` 是**毫秒**。AudioContext 惰性初始化、全局清理时关闭；单个技能结束不要关闭整个音频总线。音色自然余响可以存在，不应把它误报为 DOM/粒子泄漏。

### handle：自然结束和取消是两件事

| 字段/方法 | 含义 |
| --- | --- |
| `doneAt` | **`Date.now() + 总演出毫秒`**，包含计划中的余韵；不用 `performance.now()`，不用单纯的 1100 作为时间戳 |
| `cancel()` | 取消自身的定时器、周期任务、WAAPI、图层和临时锚点，并从 `S.handles` 删除；不删除真实实体 |
| `dodge(success)` | 正式版实际命中判定后的闪避结果；成功/失败都要正确结束准备阶段 |
| `hit(type)` | 当前正式版在实际个人盾吸收伤害时调用；可收到 `slash/gunshot/shotgun/fire/enemy_spell` 等类型 |
| `dispel(targetDom)` | 正式版实际驱散负面成功后调用的演出反馈 |
| `impactDom` | 来袭弹道的视觉落点，可指向实体 DOM 或自建临时锚点；不直接决定数值目标 |

创建 handle 后加入 `S.handles`；自然结束必须删除并调用 `releaseIdleCanvas()`。所有 `el.animate()` 返回的动画都保存引用，在 `cancel()` 中 `.cancel()`；设置过的角色 inline 样式恢复旧值，不简单清空整个 `style`。

`after()` 虽然会在**全局重置**时取消，但单个 `handle.cancel()` 不会自动摘除该技能的所有定时器，因此要自己保留并注销这些 ID，防止取消后再次爆发。图层同理。**技能内部不调用 `clearArcaneFx()`**：这是全局清理，会清掉其他演出；在 `cancel()` 中调用还会递归。

`combatToken` 在 demo 为数字、正式版为重置时替换的对象；模块只取快照做相等比较，不在新技能中自增或假设它是数字。

### 普通技能与反应技能

- 普通技能：调用后自行播放完整时间轴；`doneAt` 锁定 demo 卡片，正式版在余韵结束后交棒。
- 反应技能：先播放准备，等正式版 `dodge/hit` 的真实结果驱动爆发；不要在模块里写固定“必闪避/必挡住”。
- demo 需要模拟攻击时，放在 **`playDemoSkill` 或独立演示控制函数**中，保留 handle 并按安排调用 `.dodge(true/false)`、`.hit(type)`；这部分移植时丢弃。
- demo 卡片锁在点击时按初始 `doneAt` 安排一次解锁；后来在反应回调中延长 `doneAt` 不会自动重新安排锁。设计反应 demo 时需由演示控制区同步锁时长，不能假定模板已有完整反应调度器。
- `.hit()` 当前不是“任意受击事件”；共享屏障破碎、未扣个人盾、穿透绕盾不应伪造该回调。需要新生命周期接线时，明确向用户说明，再接正式版对应事件。

## 5. 完整可运行的接入示例

这是**接线冒烟示例，不是本次新增的正式技能或美术方案**。在 Windows PowerShell 直接整块执行：只新建根目录 `demo-svg-smoke.html`，母版和正式版不改；同名文件已存在时停止，不覆盖。

示例将 CSS、精确标签、函数、分派和卡片一次性写入新副本，点击后出现 SVG 光环、音效和粒子，约 1.1 秒后解锁。新对话实际设计时直接编辑自己的副本，不必另搭生成器。

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
@'
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = 'D:/Project/RpgCombat';
const target = path.join(ROOT, 'demo-svg-smoke.html');
let html = fs.readFileSync(path.join(ROOT, 'demo-skill-vfx-template.html'), 'utf8');
function replaceOnce(from, to) {
    const index = html.indexOf(from);
    if (index < 0 || html.indexOf(from, index + from.length) >= 0) throw new Error('模板锚点不唯一：' + from);
    html = html.slice(0, index) + to + html.slice(index + from.length);
}
replaceOnce('SVG 技能演练 · 空白模板', 'SVG 技能演练 · 接入冒烟');
replaceOnce('const ARCANE_TAGS = [];', "const ARCANE_TAGS = ['模板接入演示'];");
replaceOnce('    /* 新技能的 arcane- 样式写在这里；移植时只追加新样式，不覆盖正式版的已有样式。 */', `
    .arcane-demo-pulse { width:180px; height:180px; animation:arcane-demo-pulse-life 1.1s ease-out both; }
    @keyframes arcane-demo-pulse-life {
        0% { opacity:0; transform:translate(-50%,-50%) scale(0.2); }
        27% { opacity:1; transform:translate(-50%,-50%) scale(1); }
        40% { opacity:1; transform:translate(-50%,-50%) scale(1.2); }
        100% { opacity:0; transform:translate(-50%,-50%) scale(1.6); }
    }
`);
replaceOnce('    // ===== 新技能实现 END =====', `
    const DEMO_PULSE_CHARGE_MS = 300;
    const DEMO_PULSE_LIFE_MS = 1100;
    function playDemoPulse(caster, targets, isReaction = false) {
        const el = domOf(targets[0] || caster), c = ctr(el);
        const uid = 'arcane-demo-pulse-' + (++S.uid);
        const layers = [], timers = [];
        const handle = {
            doneAt: Date.now() + DEMO_PULSE_LIFE_MS,
            cancel() {
                timers.forEach(id => { clearTimeout(id); S.timers.delete(id); });
                layers.forEach(layer => { layer.remove(); S.layers.delete(layer); });
                S.handles.delete(handle);
                releaseIdleCanvas();
            }
        };
        S.handles.add(handle);
        layers.push(fsLayer('<svg class="arcane-fs-anchor arcane-demo-pulse" style="left:' + c.x + 'px;top:' + c.y + 'px" viewBox="0 0 180 180"><defs><radialGradient id="' + uid + '"><stop offset="0" stop-color="#c4b5fd" stop-opacity="0.7"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient></defs><circle cx="90" cy="90" r="78" fill="url(#' + uid + ')"/><circle cx="90" cy="90" r="54" fill="none" stroke="#ddd6fe" stroke-width="3"/><path d="M90 25L155 90L90 155L25 90Z" fill="none" stroke="#a78bfa" stroke-width="2"/></svg>', DEMO_PULSE_LIFE_MS));
        timers.push(after(DEMO_PULSE_CHARGE_MS, () => {
            tone(0, { f0:660, dur:0.18, vol:0.08 });
            shake('light');
            burst(24, () => {
                const angle = rnd(0, Math.PI * 2), speed = rnd(1.5, 4);
                return { x:c.x, y:c.y, vx:Math.cos(angle) * speed, vy:Math.sin(angle) * speed, drag:0.93, decay:0.04, size:rnd(1, 2.5), color:'#c4b5fd' };
            });
        }));
        timers.push(after(DEMO_PULSE_LIFE_MS, () => handle.cancel()));
        return handle;
    }
    // ===== 新技能实现 END =====
`);
replaceOnce('        // 接入点 3：按 fxTag 分派到上方新技能函数，返回它的 handle。', "        if (fxTag === '模板接入演示') return playDemoPulse(caster, targets, isReaction);");
replaceOnce('const CARDS = [];', "const CARDS = [{ name:'模板接入演示', level:'L2', description:'验证 SVG、音效、粒子与生命周期接入', fxTag:'模板接入演示', casterId:'h2', targetIds:['e5'], isReaction:false }];");
for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(match[1]);
fs.writeFileSync(target, html, { encoding:'utf8', flag:'wx' });
console.log('已创建：' + target + '\n可双击打开，点击技能卡演练。');
'@ | node
```

示例使用的蓄势为 `DEMO_PULSE_CHARGE_MS = 300`。如果将这一示例接入正式版，注册表 `delay` 应为 **0.3 秒**，不是总时长 1.1 秒；技能文本可使用 `【模板接入演示】[单盾;power:1][MP:0][法术][特效:模板接入演示]`。这只是验证原有盾规则的连接示意，不改变现有角色技能。

## 6. 快速移植进 `index.html`

### 6.1 移植前附一份清单

交付 demo 时同时交代以下内容，接手者不用反推时间轴：

- 新 demo 文件、显示技能名、**精确 `fxTag`**、函数名和专属 CSS 前缀。
- 单体/群体、目标取法、普通/反应模式及需要的回调。
- 蓄势 `CHARGE_MS`、总演出时长和 `doneAt`；反应成功后是否会延长。
- 所用新增 `DRAW`/工具/资源（没有就写“仅复用已有”）。
- 真实技能标签文本、对应已有数值规则；需去重的默认视觉效果。
- `WEBM_FX_REGISTRY` 条目；是否保留原有结算音效。

### 6.2 必做接线，不覆盖旧模块

| 步骤 | 正式版搜索锚点 | 操作 |
| --- | --- | --- |
| 1. 新 CSS | `arcane VFX 模块样式`、`.arcane-fs-layer` | 只追加 demo 新增的 `arcane-` CSS/keyframes |
| 2. 新技能函数 | `const arcaneVfxModule` | 合并新函数、常量和必要 `DRAW` 方法，复用已有 `S` 与工具 |
| 3. 精确标签 | `const ARCANE_TAGS` | 在已有五项后增加新 `fxTag`，不改旧名称 |
| 4. 分派 | `function playArcaneSkillFx` | 新增到 `playXxx(caster, targets, isReaction)` 的分派并返回 handle |
| 5. 注册表 | `const WEBM_FX_REGISTRY` | **同时登记** `{ url:'', scale:1.0, particles:'arcane', delay:CHARGE_MS/1000 }`；纯程序演出不需要 WebM URL |
| 6. 技能数据 | 实际角色/敌方/世界书技能文本 | 在既有规则标签后追加 `[特效:精确标签]`，不是改 `CARDS` 来上线 |
| 7. 类别接线 | `registerTagHandler`、`isArcaneSkillFx`、`reactionFx` | 核对第 6.3 节的去重与回调，按需求补缺口 |
| 8. 测试与打包 | `arcane-vfx-regression.js`、`build-regex.cjs` | 覆盖新技能，然后更新非公开版导入包 |

**注册表不能省。** `executeSkillAction` 的 arcane 分支直接读取 `WEBM_FX_REGISTRY[skill.fxTag].delay`；没有条目会报错。只写注册表但漏 `ARCANE_TAGS`，则不会走专属模块分支；只加标签但漏分派，则没有演出。三处精确键必须一致。

`[特效:...]` 解析会 `.trim()` 去掉首尾空白，但内部空格、繁简字和拼写仍需一致。显示技能名与特效键不必相同：现有 `【伊西斯之拥】` 对应的是 **`[特效:伊西丝之拥]`**；旧特效名 `伊西斯之拥` 和 `障壁术` 不是该五技能模块的同义词。

**不要移植：** `HERO_DATA/ENEMY_ROWS`、demo `initUI`、宿主 `CanvasFxEngine`、`CARDS`、`playDemoSkill`、`resetDemo`、顶部/底部 HTML、Tailwind CDN、模拟闪避/攻击代码；不要替换正式版的五个既有技能、全部 `DRAW` 或整段 `arcaneVfxModule`。

### 6.3 根据技能类别核对

#### 时序

- `WEBM_FX_REGISTRY.delay`：秒，在演出开始之后、标签数值结算之前等待，通常等于模块蓄势毫秒除以 1000。
- `handle.doneAt`：绝对毫秒时间戳，普通技能在余韵结束后交棒；不是注册表 `delay`。
- `skill.delay` / `[Delay:...]` 与 `skill.charge` / `[Charge:...]`：战斗规则字段，不为配动画擅自改动。
- 若设计是立即生效后持续演出，登记 `delay:0`；若延迟结算，把视觉爆发安排在同一拍点。别同时在模块和外层串行重复等待。

现有参考：灵风术 `1000ms / delay:1.0`，纳克提特障壁术 `1200ms / 1.2`，伊西丝之拥 `1100ms / 1.1`；折影步、巫师护盾注册表 `delay:0`。

#### 默认视觉去重

目前自动按 `isArcaneSkillFx` 跳过默认 SVG 的主要标签：`盾`、`肃正`、`[回避]`、`[单避]`、`驱散`、回复类 `回`、速度类 `速`；攻击专属分支也检查 arcane 标记。

**并非所有标签都已去重。** `免伤`、`防`、`[群避]`、`反击`、`嘲`、`增`、`回蓝`、`冲`、`再动` 等要逐项看对应 handler。若本次设计应替换这些默认视觉，只对相关 `playSVGEffect` 追加现有 `!isArcaneSkillFx(...)` 条件；**保留数值、Buff、浮字、历史记录和其他技能的效果**，不全局删特效。

辅助标签原有结算音效通常仍保留；arcane 模块再叠加专属合成音。仅设置注册表 `audioUrl:'none'` 不等于所有 `playSound` 都静音。先明确希望的音画搭配，不顺手更改全局音频策略。

#### 真实反应与驱散

- `executeSkillAction` 把 `isReactionTrigger` 传给模块；反应模式不能假定等同于普通施法。
- 实际命中判定后调用 `reactionFx.dodge(isDodged)`；失败也可能需要收掉残影准备。
- `reactionFx.impactDom` 可改变弹道落点，但正式版有个人盾、穿透等判断；不改变真实数值目标。
- `shieldDmg > 0` 后才调用 `reactionFx.hit(type)`；共享屏障等其他生命周期不自动得到这个回调。
- 驱散 handler 仅在实际 `removed.length > 0` 时调用 `.dispel(targetDom)`；无负面目标不伪造净化成功。

现有五技能可作**机制骨架**，不要为新美术复制旧技能的真实名字或所有参数。超出现有回调能力时，单列接线需求，不在 SVG 里自行算伤害、耐久或概率。

### 6.4 源码定位速查

下列为本轮检查时 `index.html` 的行号，仅辅助阅读；后续以搜索锚点为准。

| 锚点 | 本轮位置 |
| --- | --- |
| arcane CSS / `arcaneVfxModule` | `778–820` / `4387–5123` |
| `WEBM_FX_REGISTRY` / 现有五项 | `7562` / `7578–7582` |
| `[特效:...]` 解析 | `9664–9666` |
| 默认 `盾/肃正/回避/单避` 去重 | `12034/12046/12063/12077` |
| 驱散 `.dispel()` | `12143` |
| `reactionFx.dodge()` / 弹道落点 | `14210` / `14224/14325` |
| 真实个人盾 `.hit()` | `14475` |
| arcane 执行分支及注册表 `delay` | `15240–15247` |
| 普通技能等待 `doneAt` | `15400–15404` |

## 7. 检查、回归与打包

### 7.1 单文件语法检查

在 PowerShell 整块运行；默认检查空白母版。检查新 demo 时只改 `$File` 一行即可。脚本提取内联 JS 在临时文件上运行 `node --check`，结束后删除临时文件，不修改项目源码。

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$File = 'D:\Project\RpgCombat\demo-skill-vfx-template.html'
$env:RPG_SVG_CHECK_FILE = $File
@'
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const file = process.env.RPG_SVG_CHECK_FILE;
const html = fs.readFileSync(file, 'utf8');
const blocks = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim());
if (!blocks.length) throw new Error('未找到内联脚本：' + file);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpg-svg-syntax-'));
try {
    blocks.forEach((code, i) => {
        const js = path.join(dir, 'inline-' + i + '.js');
        fs.writeFileSync(js, code);
        const result = spawnSync(process.execPath, ['--check', js], { encoding:'utf8' });
        if (result.status !== 0) throw new Error(result.stderr || result.error || 'node --check 失败');
    });
    console.log('语法检查通过：' + file + '（' + blocks.length + ' 个内联脚本）');
} finally {
    fs.rmSync(dir, { recursive:true, force:true });
}
'@ | node
Remove-Item Env:RPG_SVG_CHECK_FILE
```

### 7.2 demo 冒烟验收

- [ ] 只新增本次技能卡，位置、英雄/敌方锚点与其余 UI 没改变。
- [ ] 有所需蓄势、爆发、余韵，音画同步；不是拿图标平移代替完整演出。
- [ ] 单体、多目标和敌方作为施法者时定位正确；不硬编码某个 demo ID。
- [ ] 普通技能到期解锁；反应成功、失败和等待取消都能正确收尾。
- [ ] 播放中重置，无延迟“复活”的爆发、粒子或音效；可再次完整播放。
- [ ] 自然结束/重置后 `[data-arcane-fx]`、`S.handles`、临时 canvas 和驱动粒子归零（正常尾韵期间除外），真实角色 DOM 没被删。
- [ ] 若 rAF 在 IAB 暂停，结合实际节点/粒子寿命判断，不只凭 `animationFrameId` 非空断言永久空转。

### 7.3 正式版回归

移植时复用 `integration-test/harness.html` 和 `integration-test/fixtures/arcane-vfx-regression.js`，**不要把已有五技能测试全部换成新技能**。现有 fixture 有固定五项标签与技能文本，新项必须另外增加解析、实际执行、去重、清理和相应反应用例。

通过本机 HTTP 服务打开：

- `/integration-test/harness.html`：实际非公开版源码回归。
- `/integration-test/harness.html?artifact=1`：实际 `regex-前端战斗v11_2.json` 压缩导入包回归。

这些是相对路径，使用现有测试服务提供的真实端口；不假定固定 2813/5445 等前轮临时端口。运行页面上的“运行全部断言”。独立 demo 的 `.dodge(true)` 只能证明美术路径，不能代替正式版命中/扣盾/驱散/屏障溢出的回归。

### 7.4 构建非公开版导入包

**仅在正式版移植后执行；只设计 demo 不需要打正式包。** 下面是完整 PowerShell 命令，构建会更新正式版 Tailwind 样式块及非公开版导入 JSON，首次可能下载已约定的构建工具。

```powershell
Push-Location 'D:\Project\RpgCombat'
try {
    node .\build-regex.cjs
    if ($LASTEXITCODE -ne 0) { throw '非公开版正则包构建失败' }
} finally {
    Pop-Location
}
```

`build-regex.cjs` 已先执行 `build-tailwind.cjs`，不必再重复跑；新 Tailwind 类名写完整字面量，禁止动态拼接类名。默认产物为 `regex-前端战斗v11_2.json`，不是新 demo HTML；`index-公开版.html` 和公开版构建流程不动。

构建结构检查不证明新技能效果正确；还需源码回归、产物回归及用户导入确认。原业务提交稳定后再按项目两步法回填 `LOG.md`/`LOG-INDEX.md`，记录实际测过和未测的范围；README 仍等用户确认有效再更新。

---

## 8. 接手者最短检查表

**设计阶段：** 复制母版 → 对齐五项美术需求 → 使用模块已有工具 → 完整生命周期与演示卡片 → 用户确认。

**移植阶段：** 新 CSS + 新函数 + `ARCANE_TAGS` + 分派 + **`WEBM_FX_REGISTRY`** + 实际技能 `[特效:...]` + 按类别去重/反应回调 → 源码与压缩包回归 → 用户导入。

界面和底座已就绪；新对话不必重建框架，但正式版的注册、数值规则边界与真实回调仍需要明确接线。
