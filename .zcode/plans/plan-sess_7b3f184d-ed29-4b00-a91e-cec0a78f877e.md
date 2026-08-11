## 目标
为**我方**新增 `[驱散:N]`（单体）与 `[群驱散:N]`（群体）标签：对我方目标各驱散 N 个负面 buff。`[驱散]` 视同 `[单增]` 类纯增益单体标签（无 `[他人]` 仅能对自己释放，带 `[他人]` 可选我方任意目标）；`[群驱散]` 对我方全体各驱散 N 个。计数用 `:N` 语法（如 `[群驱散:1]`），无数字默认 1。

## 改动点（全部在 `战斗前端-爬塔 V5.4.html`）

### 1. `parseSkill()` (L3444-3514) — 解析 `[驱散:N]`/`[群驱散:N]`
- 在特殊标签解析区（`[延迟]`/`[加速]`/`[限N次]` 附近）新增正则解析 `[驱散:N]`/`[群驱散:N]`（`:N` 可选，无数字默认 1）。
- 在现有 type 槽分配逻辑之后应用：
  - 若当前 `types[0]` 是纯兜底 `'[单体]'`/20（即无任何真实标签被解析），则用 `[驱散]`/`[群驱散]` 覆盖主标签槽。
  - 否则（技能已有其它标签，如 `[群回;power:100][群驱散:1]`），填入第一个空闲的 type2/type3 槽。
- 计数存入对应 `powers[i]`（供 handler 读取，自然沿用 burst 倍率/持久化）。

### 2. `TAG_HANDLERS` 新增 `驱散` handler（L4027 `增` handler 之后）
```js
registerTagHandler('驱散', (ctx) => {
  playSound('defUp'); playSVGEffect(ctx.targetDom, 'buff');
  ctx.target.buffs = ctx.target.buffs || [];
  const count = Math.max(1, Math.floor(ctx.actualPower || 1));
  // 复用灾厄使 L4303 的负面判定谓词
  const isDebuff = b => b.duration > 0 && (b.type==='poison' || b.type==='stun' ||
    (b.type==='def'&&b.value<0) || (b.type==='hit'&&b.value<0) ||
    (b.type==='eva'&&b.value<0) || (b.type==='atk'&&b.value<0));
  const removed = []; const keep = [];
  for (const b of ctx.target.buffs) { if (isDebuff(b) && removed.length < count) removed.push(b); else keep.push(b); }
  ctx.target.buffs = keep;
  createFloatingText(ctx.targetDom, removed.length ? `驱散 ${removed.length} 负面` : '无负面', 'text-emerald-300');
  addHistory(removed.length ? `   ↳ ${ctx.target.name} 净化了 ${removed.length} 个负面状态！` : `   ↳ ${ctx.target.name} 身上没有负面状态可驱散。`);
});
```
- 因 `resolveTagHandler` 子串匹配，key `驱散` 同时命中 `[驱散]` 与 `[群驱散]`；群体行为由目标选择（isAoe → 全体我方）处理。

### 3. `isBeneficial` (L5322) — 加入 `|| tag.includes('驱散')`
使 `[驱散]` 目标取向为**我方**（增益），`[群驱散]` 自动对全体我方。

### 4. `classifySkill()` hasSingleBuff (L6061) — 加入 `|| t.includes('驱散')`
使 `[驱散]`（非群）成为纯增益单体标签：无 `[他人]` 对自己释放；带 `[他人]` 可进入"我方选目标"。`[群驱散]` 因含`群`被排除、走 AOE 直接施放。

### 5. `SKILL_TYPES` (L769) — 新增 `'[驱散]'`、`'[群驱散]'`
使其可在技能编辑器"3 重标签"下拉中选择（计数用该标签的"威"值）。

### 6. `updateMenu()` 徽章配色 (L6262 附近) — 新增 `驱散` 分支（可选润色）
给 `[驱散]`/`[群驱散]` 一个翠绿色徽章配色，与其它类型标签的彩色徽章一致。

## 不改动
- 敌方 AI 索敌/技能选择（本标签仅我方，敌方 AI 不会使用）。
- 持久化/重置逻辑（`identify`：type/power 已随 `serializeHeroesForSave` 落盘，计数存于 power 自动保留）。

## 验证
- **Node 语法校验**：提取 `<script>` 内容用 `node --check` 确保零报错。
- **逻辑走查**：
  - `【伊西斯之拥】[群回;power:100][群驱散:1][MP:10][法术]` → 全体回血 + 我方每人驱散 1 个负面。
  - `[驱散:2]`（无 `[他人]`）→ 对自己驱散 2 个。
  - `[驱散:1][他人]` → 进入"我方选目标"，可对任意我方角色驱散。
  - `[群驱散:3]` → 我方全体各驱散 3 个。
  - 无负面时显示"无负面可驱散"占位反馈，不报错。

## 文档
- 按 Coding rule 在 `LOG.md` 追加 LOG-031 记录 + 同步 `LOG-INDEX.md`。
- **READMEE.md 待你确认本轮有效后**再加 `[驱散]`/`[群驱散]` 说明（不擅自先行改写）。