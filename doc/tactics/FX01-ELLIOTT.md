# FX01 角色技能移植：埃利奥特（首位角色）

## 核心目的

建立一条按「特效标签 / 空间形状 / 效果槽」分发、受 L1–L4 分级约束的通用演出管线，并用埃利奥特跑通：UI 上可点的技能规则真实生效、演出守量级/时长/音量纪律；规则未迁移的技能保持 `skillSupport` 拒绝与可读原因。弗兰克 / 玛德琳 / 索恩随后只往注册表追加条目或复用现有条目。

## 具体任务与现状（2026-11-23）

### 1. 本批移植（规则真实可执行）

| 技能 | 规则接线 | 演出条目 / 分级 | 时间轴（实测） | 素材 |
| --- | --- | --- | --- | --- |
| 萨维奇三连发 | 多段攻击槽**逐段**独立命闪扣血（本批新增），目标倒地后余段不结算；弹药未迁移，预览明示「弹药未扣减」 | `volley` · L1×段数 | 单发 ≤500ms，段间 200ms，逐段揭示 | 复用 `playAttackIdentityFx` 枪击身份 + `gunshot1/2/3`（音量沿用定稿，`reuseAudio`） |
| 压缩爆燃（火舞术） | 爆炸：投射物沿射线撞首个单位/墙于接触点起爆；被撞敌人计入范围伤害**恰好一次**（本批修正），命中者挂燃烧 | `fire-blast` · L3 | 650 蓄势 + 240 火弹聚能 + 340 飞行 + 100 收 + 300 爆发 + 800 余韵 ≈ 2430ms（不含镜头引导） | 回合制通用火焰弹 `playArcaneProjectile('fire')`；`fire.webm`（原 `火焰01` 登记）、`ranshao.webm`；`explosion_aoe_charge` 0.45 / `explosion_aoe_blast` 0.70 / `fire01` 0.62 / `ranshao` 0.30 |
| 预备咏唱（早有准备） | 自身 `[再动]` 返还主行动 + `[加速:3]` 入库存；单体·射程 0 自动锁定自身 | `self-boost` · L2 | 950ms（脚下时针法阵 → 加速光点汇入 → 收束闪光 + 飘字） | SVG 渐变法阵/光点；`herocharge` 0.45 → `link_chime` 0.55 |
| 折影步（反应） | 近战来袭回避成功 → `[位移:侧闪;距离:2]` 真实错位：垂直攻击线先左后右、八方向量化、复用推动位移追踪（墙/单位阻挡即停），不耗移动额度；规则站位立即更新 | `evade-shift-ghost` · L1（通用回避错位兜底 `evade-shift`） | 70 冷闪 + 300 滑步 + 230 落位碎影 = 600ms | 残影克隆头像（不含血条）；`hide` 0.32 / `link_dash` 0.26 |

### 2. 暂缓（保持 `skillSupport` 拒绝；素材映射预留，规则迁移后直接接条目）

| 技能 | 拒绝原因 | 预定分级 | 预定素材 |
| --- | --- | --- | --- |
| 精准流火 / 归尘礼赞 | `[穿透]` 非攻击槽 | L1 直线火流 / L4 圣光（传奇，暗场） | `ranshao.webm` / `414.webm`（`圣光01`）+ `light01` |
| 召雷术 | `[群麻痹]` | L3（高阶） | `450.webm`（`雷击01`）+ `thunder_charge`/`thunder_aoe_hit` |
| 灵风术 / 提前瞄准 / 飞沙化甲 | `[赋予:虚形]` / `[单瞄]` | L2 | `miaozhun.webm` + `miaozhun.mp3` |
| 迅捷愈合法 / 伊西斯之拥 | 治疗 | L2 / L3 | 圣光治疗类 webm（索引 #039/#207）|
| 拉莱耶造雾术 | `slotTurns` | L3 | `fog.mp4` + `fog.mp3`（`造雾术`） |
| 纳克提特障壁术 / 圣域帷幕 | 肃正 | L3 / L4 | `weimu.webm` + `weimu.wav` |
| 双莲祛煞 / 巫师护盾 / 净蚀反冲 | 免伤 / 护盾 / 看破 | L1 反应 | 护盾结界类 webm（#032/#435）|
| 全部物品 | 物品使用未迁移 | — | 回合制 `ITEM_SKILL_FX` 已有定稿音画 |

### 3. 通用注册表（新角色接入方法）

- `tactics/src/fx-registry.mjs`：`GRADE_BUDGETS`（L1–L4 时长/蓄势/全屏/暗场/峰值音量）、`actionInput(result)`（形状 + 槽标签 + 攻击段数 + 自身性）、`reactionInput(reaction)`、`createFxRegistry()`（fxTag 精确 → 谓词 → 兜底）、`checkBudget(entry)`。
- `tactics/src/fx-library.mjs`：条目按特效/效果命名——`identity`（兜底，回合制攻击身份）、`arsenic-shot`（原 L20 砷弹特判迁入）、`volley`、`fire-blast`、`self-boost`、`evade-shift-ghost`、`evade-shift`。
- 接入新角色：技能写显式 `[范围:…]`；有专属演出则加 `[特效:xxx]` 并在 fx-library 注册 `{ id, grade, fxTags, match, timeline, cues, prepareKeys, play(ctx) }`；`ctx` 只给提交结果与 `reveal/revealSegment`、世界层 `fx.top/ground`、视口闪屏 `fx.screen`、`fx.shake/sfx`。`TFX-01` 会断言预算。
- 导演层 `action-director.mjs` 不再含任何单技能判断（`TFX-01` 断言无 `fxTag ===`）。

### 4. 本批附带修正 / 边界

- 反应类型按**来袭技能**伤害类型匹配（原比较来源单位的 `damageType`，带类型的反应从不触发）。
- 回避判定仍沿用 P07 口径（攻击方以命中 100 对受击者闪避掷骰，未用反应 power），未改。
- 埃利奥特按典型对局原值（Armor 40、Speed 50），演示敌人威力 10–18 对其仅 1 点伤害；未调敌方数值。
- 构建链：工作区 `core.autocrlf` 检出为 CRLF 导致提取器失败；提取器与构建比对改为统一 LF，视听/界面生成物仅源指纹头行变化（内容逐字一致）。
