# Agent 工作协定

> 本文件为 Agent 持久化协定，优先级高于会话内口头指令。修改本文件需用户显式授权。

## 一、Hook 协定（强制 - 防 Invalid regular expression 复发）

**背景**：曾出现 `matcher` 被误填为 `cat > /tmp/step2_writer.py << 'PY' ...` 多行 shell 脚本，导致 `new RegExp(matcher)` 抛 `Invalid regular expression`，阻塞所有 `Bash/Read/Write` 校验。根因是把“命令内容”当成了“正则表达式”。

### 1. 禁止自行新增/修改 hooks.matcher，需用户显式授权
- Agent 不得在未获用户文字同意前，写入或修改 `~/.zcode/cli/config.json` / `~/.zcode/v2/config.json` / `hooks/hooks.json` / `.zcode/config.json` 中的任何 `matcher`。
- 如需新增 Hook，先口头提案，经用户回复“同意/执行”后再落盘。

### 2. matcher 白名单（只允许匹配工具名）
- 仅允许：`^(Bash|Read|Write|Edit|MultiEdit|NotebookEdit|Agent|Glob|Grep|Task|ApplyPatch)$` 的单项或 `|` 拼接（如 `Bash` / `Edit|Write` / `Bash|Edit|Write`），或留空（匹配全部）。
- 禁止填入：shell 命令、路径、自然语言、多行文本、`<<` / `cat >` / `/tmp/` / `import ` 等代码片段。

### 3. 落盘前必须双重校验（缺一不可）
```bash
# a) 正则合法性（任选其一，失败则拒绝写入）
node -e "new RegExp(matcher)"
python -c "import re; re.compile(matcher)"

# b) 白名单 + 长度 + 非法片段拦截
# matcher 长度 >80 或含换行符 \n 或含 "<<|cat >|/tmp/|import re" 直接拒绝
```
- 校验失败时，Agent 必须回显失败原因并停止写入，不得尝试转义后强行写入。

### 4. 命令与匹配分离（matcher 只管“工具名”，命令走 command/args）
- 待执行脚本一律放在 `hooks[].command`（type:command，timeout 单位为秒）或 `hooks[].args[]`（type:process，timeoutMs 单位为毫秒），不得混用字段。
- 精确过滤在脚本内部通过 `$TOOL_INPUT` / 入参判断（如 `if [[ "$TOOL_INPUT" != *step2_writer* ]]; then exit 0; fi`），不得通过把 shell 内容塞进 matcher 实现。

### 5. 校验脚本通过正常工具执行，禁止用 matcher 拦截内容
- 需要校验/改写代码时，直接使用 `Bash` / `Read` / `Write` / `Edit` 工具执行，不得新增 `PreToolUse(matcher="cat ...")` 这类内容拦截式 Hook。

### 6. 写入后验证（严格 JSON）
```bash
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('JSON OK')"
# 或 cat config.json | node -c 等价校验。hooks JSON 采用严格模式，多余 key 即失败。
```

## 二、备份与回退约定

每次修改配置前必须先备份（已纳入 Agent 固定流程）：

```bash
cp "C:/Users/ELevin/.zcode/cli/config.json" "C:/Users/ELevin/.zcode/cli/config.json.bak.$(date +%Y%m%d)"
cp "C:/Users/ELevin/.zcode/v2/config.json" "C:/Users/ELevin/.zcode/v2/config.json.bak.$(date +%Y%m%d)"
cp "C:/Users/ELevin/.zcode/v2/setting.json" "C:/Users/ELevin/.zcode/v2/setting.json.bak.$(date +%Y%m%d)"
# AGENTS.md 本身修改前：
cp AGENTS.md AGENTS.md.bak
```

- **一键回退 Fix2（Hook 误配置）**：
  ```bash
  cp "C:/Users/ELevin/.zcode/cli/config.json.bak.20260828" "C:/Users/ELevin/.zcode/cli/config.json"
  cp "C:/Users/ELevin/.zcode/v2/config.json.bak.20260828" "C:/Users/ELevin/.zcode/v2/config.json"
  # 或紧急止血：把 config.json 中 "hooks": { "enabled": true } 改为 false
  # 或客户端：Settings -> Plugin Management -> 禁用对应 Hook
  ```
- **一键回退 Fix3（协定过严）**：
  ```bash
  cp AGENTS.md.bak AGENTS.md
  # 或删除本文件“## 一、Hook 协定”一节
  ```

## 三、验证清单（Agent 每次涉及 hooks 时自检）

- [ ] matcher 是否在白名单内且 `new RegExp(matcher)` 通过？
- [ ] 是否将脚本放在 `command`/`args` 而非 `matcher`？
- [ ] 是否已备份原配置？
- [ ] 写入后 JSON 是否校验通过且 `Bash` 试跑不再出现 `TraceID:a60cf4fd` 类报错？
