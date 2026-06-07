---
name: tta
version: 0.1.6
description: "通过 PTY 操作交互式 CLI、TUI、开发服务器 session。当命令需要按键、重绘终端 UI、分步观察输出，或运行 npm create、lazygit、npm run dev 等交互式程序时使用；不用于普通非交互 bash。API：sess、act、obs。内置 tta-agents 子 skill：用户要用 tta 操作 Coding Agent 时按该子 skill 执行。"
---

# tta - 供 Agent 使用的终端工具

`terminal-tool-for-agents` 提供 `tta` 命令。普通非交互式命令用 shell；需要 PTY 的交互式程序用 `tta`。

核心思路：`sess` 启动后台终端 → `act` 发送按键或文本 → `obs` 等待稳定后读屏。

## Session

tta 的一切操作都在 **Session**（PTY 后台终端实例）内进行：`tta sess start/kill/list`，`--sess=`。

## tta-agents（内置子 skill）

`skills/tta/tta-agents-skill.zh.md` 随 **tta skill 一并提供**，**无需单独安装**。

**何时启用：** 用户要用 tta 驱动 Coding Agent CLI（如 Claude Code、Codex、Cursor Agent、Opencode、Pi），或提到 Orchestrator / Worker / 多 Agent 协作时，读取并按 [`tta-agents-skill.zh.md`](./tta-agents-skill.zh.md) 执行；其余交互式终端（TUI、向导、dev server）只按本 skill 即可。

## 何时使用

**适合用 `tta`：**

- REPL，如 `GDB`、`IPython`
- 交互式安装/初始化，如 `npm create vite@latest`
- TUI，如 `lazygit`
- 需要随时间观察终端输出的长驻进程，如 `npm run dev`
- Coding Agent CLI → 启用内置 [`tta-agents-skill.zh.md`](./tta-agents-skill.zh.md)

**不要用 `tta`：**

- 普通 bash 命令，无需交互、可直接跑完
- 人类观察 session（用 `tta sess watch`，Agent 不要用）

## 标准工作流

按顺序执行，不要跳步：

1. **判断工具** — 交互式 / TUI / 需分步读屏 → `tta`；否则 shell
2. **启动并读屏** — `tta sess start`（见「命令写法」「参数引号」），然后 `tta obs screen stable --sess=<name>`
3. **根据屏幕选择输入方式**
   - TUI 菜单、编号选项、`[Y/n]` → `tta act send key`（只用 key，不用 text）
   - 自由输入、shell 输入 → quoted heredoc 发送文本，再 Enter 提交：

   ```bash
   tta act send text --sess=<name> <<'EOF'
   <你的输入>
   EOF
   tta act send key --sess=<name> --key=enter
   ```

   必须用 `<<'EOF'`（带引号），不要用 `<<EOF`，否则 `$`、`()`、反引号会被 shell 展开。
4. **每次 act 后** — `tta obs screen stable --sess=<name>`，确认屏幕已更新
5. **按类型决定是否 kill** — 一次性 CLI/TUI 完成后 `tta sess kill`；dev server 在观察结束前不要 kill（见「Session 生命周期」表格）
6. **进程已退出** — 仍可用 `obs` 读错误与最终输出，再 `tta sess kill`

```text
sess start -> obs screen stable -> (act -> obs screen stable)* -> [sess kill]
```

## 三个 API

| API | 命令 | 用途 | stdout |
|-----|------|------|--------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | 创建、停止、列出 session；人类 watch UI | `success`（start/kill）；list：`name running` / `name exited exit_code=N` |
| **act** | `send text`, `send key` | 向 **运行中** 的 session 发送输入 | `success` |
| **obs** | `screen now`, `screen stable`, `screen scroll` | 读取 session 屏幕（运行中或已退出） | 屏幕文本 |

失败时：一行 `error: <reason>`（exit 1）。

## Session 生命周期

| Session 用法 | 示例 | 完成后是否 kill？ |
|--------------|------|-------------------|
| 一次性交互 CLI | `npm create vite@latest` | **是** |
| 一次性交互 TUI | `lazygit` | **是** |
| 长驻 + 观察 | `npm run dev` | 观察期间 **否**；结束再 kill |

Coding Agent Worker（多轮保留上下文）见 [`tta-agents-skill.zh.md`](./tta-agents-skill.zh.md)。

**命名：** 一个小写单词，或 2–3 个单词用 `-` 连接，如 `dev`、`vite-once`。

**已退出 session：** PTY 进程退出后，session 在 `sess list` 中仍为 `exited`，直到 `tta sess kill`。此时 `obs` 仍可用；`act` 会失败。先用 `obs` 读错误，再 `kill`。

**行为约束：**

- `act` / `obs` 都需要 `--sess=` 且 session 必须存在
- 发送文本：`tta act send text --sess=<name> <<'EOF'` … `EOF`（quoted heredoc，`<<'EOF'`）
- 不要后台运行 `tta`；每次调用须等上一次完成
- 不要依赖 `act` 的 stdout；用 `obs` 读屏
- 不要用 `tta sess watch`

## 命令写法

- 每条 `tta` **单行**，禁止 `\` 换行
- `--cmd=`、`--cwd=` 等 **禁止 shell 变量**（`$VAR`）；写绝对路径与完整命令字面量
- `act send text` 必须用 **`<<'EOF'`**，禁止 `<<EOF`

## 参数引号

| 参数 | 用于 | 引号 |
|------|------|------|
| `--cmd=` | sess start（**必填**） | 始终 `--cmd="..."` |
| `--cwd=` | sess start（**必填**） | 始终 `--cwd="..."`；优先绝对路径 |
| `--sess=` | sess start/kill、act、obs | 不必加引号 |
| `--key=` | act send key | 不必加引号 |
| `--dire=` | obs screen scroll | 不必加引号 |
| send text 输入 | act send text | 始终 `<<'EOF'` |

**`sess start` 模板：**

```bash
tta sess start --sess=<name> --cmd="<command>" --cwd="/absolute/path/to/project"
```

示例：

```bash
tta sess start --sess=dev --cmd="npm run dev" --cwd="/Users/you/project"
tta sess start --sess=vite-once --cmd="npm create vite@latest" --cwd="/Users/you/project"
tta sess start --sess=lazy --cmd="lazygit" --cwd="/Users/you/project"
```

**常见错误：** 多词 `--cmd=` 未加引号 → `too many arguments`：

```bash
# 错误
tta sess start --sess=dev --cmd=npm run dev --cwd="/tmp"
# 正确
tta sess start --sess=dev --cmd="npm run dev" --cwd="/tmp"
```

### `--cmd=` 与 `--cwd=`

`sess start` 在 `--cwd=` 下的 PTY 中运行 `--cmd=` — 与你在终端里输入的同一条命令行。tta 内部处理平台细节；不要自行选择 shell。

## 提示、选项与确认

**TUI 菜单、编号选项、是/否确认 — 只用 `send key`。** 不要用 `send text` 在 TUI 里选选项。

| 屏幕类型 | 用法 |
|----------|------|
| TUI 菜单、列表、`[Y/n]`、编号选项 | `send key` — `arrow_up` / `arrow_down` 移动，`enter` 选择或确认 |
| 自由输入、shell 输入 | `tta act send text --sess=<name> <<'EOF'` … `EOF`，再 `send key --key=enter` |

### 发送文本（heredoc）

长短输入都用同一写法，`<<'EOF'` 内容原样进 PTY：

```bash
tta act send text --sess=vite-once <<'EOF'
my-project-name
EOF
```

**必须用 `<<'EOF'`** — 禁止 `<<EOF`（否则 `$()`、`` ` ``、`$var` 会被 shell 展开）。

每次 `act` 后运行 `obs screen stable`。

```bash
# TUI 菜单
tta act send key --sess=vite-once --key=arrow_down
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
```

运行 `tta sess keys` 查看支持的按键名。

## 异常与兜底

**屏幕卡住（菜单/确认无进展）：**

1. 先 `send key --key=enter`（接受默认 / 确认）
2. 仍卡住 → 试 `arrow_up` / `arrow_down` 或 `tab`
3. 再 `obs screen stable` 确认是否前进

**`act` 失败：**

1. `tta sess list` 查看 session 是 `running` 还是 `exited`
2. 若 `exited` → 用 `obs screen stable` 读错误，再 `sess kill`
3. 若 `running` 但屏幕未变 → 检查是否误用 `send text` 操作 TUI 选项

**启动失败（命令不存在、引号错误等）：**

```bash
tta sess start --sess=bad --cmd="this-command-does-not-exist" --cwd="/Users/you/project"
tta sess list
tta obs screen stable --sess=bad
tta sess kill --sess=bad
```

## 命令

```bash
tta sess start --sess=<name> --cmd="<command>" --cwd="/absolute/path/to/project"
tta sess kill --sess=<name>
tta sess killall
tta sess list
tta sess keys
tta sess watch   # 仅人类

# send text：quoted heredoc
tta act send text --sess=<name> <<'EOF'
<text>
EOF
tta act send key  --sess=<name> --key=<key>

tta obs screen now    --sess=<name>
tta obs screen stable --sess=<name>
tta obs screen scroll --sess=<name> --dire=<up|down|top|bottom>
```

## 示例

```bash
# 一次性：完成后 kill
tta sess start --sess=vite-once --cmd="npm create vite@latest" --cwd="/Users/you/project"
tta obs screen stable --sess=vite-once
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
tta sess kill --sess=vite-once

# Dev server：保持，用 obs
tta sess start --sess=dev --cmd="npm run dev" --cwd="/Users/you/project"
tta obs screen stable --sess=dev
tta sess kill --sess=dev
```

Coding Agent Worker 示例见 [`tta-agents-skill.zh.md`](./tta-agents-skill.zh.md)。
