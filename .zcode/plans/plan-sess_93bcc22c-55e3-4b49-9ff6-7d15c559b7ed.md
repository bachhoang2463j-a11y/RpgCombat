## 目标
将"防御恢复 TP/MP"从硬编码改为 0–100% 可自定义、localStorage 持久化，配置入口放在技能修改器最上方。

## 改动清单（全部在 `战斗前端-爬塔 V4.1.html`）

### 1. 新增全局设置对象 + 持久化（仿 LLM 设置模板）
- 在 `persistLLMSettings()` 之后新增：
  - `const DEFEND_VAR_KEY = 'rpg_combat_defend_settings';`
  - `const defendSettings = { mpRecoverPct: 20, tpRecoverPct: 25 };`（默认与现状等效）
  - `clampPct(v)` 钳制 0–100
  - `loadDefendSettings()`：localStorage 读取 + 钳制
  - `persistDefendSettings()`：localStorage 写入
- 启动时在 `loadLLMSettings()`（第 6393 行）旁调用 `loadDefendSettings()`。

### 2. 生效点：`actionDefend()` 第 5567 行
硬编码替换为百分比口径：
```js
hero.mp = Math.min(hero.maxMp, hero.mp + Math.floor(hero.maxMp * defendSettings.mpRecoverPct / 100));
hero.tp = Math.min(hero.maxTp, hero.tp + Math.floor(hero.maxTp * defendSettings.tpRecoverPct / 100));
```
TP 统一为百分比（默认 25% = 原 +25，行为不变）。

### 3. 编辑器 UI：`openEditor()` 最上方插入设置区块
- 第 5695 行 sticky 标题栏之后、"我方角色"小节之前插入"⚙️ 战斗全局设置 / 防御恢复"区块：两个 0–100 数字输入框 `#edit-defend-mp-pct`、`#edit-defend-tp-pct`，value 取自 `defendSettings`，沿用 `edit-input` 样式。

### 4. 保存：`saveEditor()` 读取 + 钳制 + 持久化
- `syncEditorDataToMemory()` 之后读取两个输入值，钳制 0–100，写入 `defendSettings` 并调用 `persistDefendSettings()`。

## 提交流程
- 改代码 → 更新 `LOG.md`（追加一条记录）与 `LOG-INDEX.md`（登记，含真实 commit HASH）→ 一次性本地 commit（代码+log 同一次，填真实 hash）→ **不 push 云端**，待用户测试。