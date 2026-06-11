---
name: tta
version: 0.1.11
description: "通过 PTY 操作交互式 CLI、TUI 和开发服务器。命令需要按键、读屏、持续观察时使用；普通非交互命令用 shell。API：sess、act、obs。内置 tta-agents 和 create-tta-agens-orchestrator 子 skill。"
---

# tta - 供 Agent 使用的终端工具

普通命令用 shell；需要 PTY 的交互式程序用 `tta`。

核心思路：`sess` 启动后台终端 -> `act` 发送按键或文本 -> `obs` 等待稳定后读屏。

## 何时使用

- 用：REPL、TUI、交互式向导、需要观察输出的长驻进程，如 `npm create vite@latest`、`lazygit`、`npm run dev`。
- 不用：普通 bash 命令、无需交互且可直接跑完的命令。
- 控制 Coding Agent CLI 时，先读 `tta-agents-skill.md`。
- 创建或更新 `Orchestrator.md` 时，先读 `create-tta-agens-orchestrator-skill.md`。

## 标准工作流

1. 判断是否需要 PTY。需要交互、按键、读屏或持续观察时用 `tta`。
2. 启动 session：`tta sess start --sess=<name> --cmd="<command>" --cwd="/absolute/path"`。
3. 读屏：`tta obs screen stable --sess=<name>`。
4. 根据屏幕输入：
   - 菜单、编号、确认框：用 `send key`。
   - 自由文本、shell 输入：用 quoted heredoc 的 `send text`。
5. 每次 `act` 后都执行 `obs screen stable`。
6. 一次性任务完成后 `sess kill`；dev server 观察期间保留。

```text
sess start -> obs screen stable -> (act -> obs screen stable)* -> [sess kill]
```

## API 表格

| API | 命令 | 用途 | stdout |
|-----|------|------|--------|
| `sess` | `start`, `kill`, `killall`, `list`, `keys`, `watch` | 管理 session | `success` 或 session 列表 |
| `act` | `send text`, `send key` | 向运行中的 session 发送输入 | `success` |
| `obs` | `screen now`, `screen stable`, `screen scroll` | 读取运行中或已退出 session 的屏幕 | 屏幕文本 |

失败时输出 `error: <reason>`，退出码为 1。

## 命令模板

```bash
tta sess start --sess=<name> --cmd="<command>" --cwd="/absolute/path/to/project"
tta sess kill --sess=<name>
tta sess killall
tta sess list
tta sess keys
tta sess watch   # 仅人类

tta act send text --sess=<name> <<'EOF'
<text>
EOF
tta act send key  --sess=<name> --key=<key>

tta obs screen now    --sess=<name>
tta obs screen stable --sess=<name>
tta obs screen scroll --sess=<name> --dire=<up|down|top|bottom>
```

`--cmd=` 和 `--cwd=` 必须加引号；`--cwd=` 优先使用绝对路径。每条 `tta` 命令写成单行，不要用 shell 变量。

## 示例

```bash
# 一次性交互命令：完成后 kill
tta sess start --sess=vite-once --cmd="npm create vite@latest" --cwd="/Users/you/project"
tta obs screen stable --sess=vite-once
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
tta sess kill --sess=vite-once

# Dev server：观察期间保留
tta sess start --sess=dev --cmd="npm run dev" --cwd="/Users/you/project"
tta obs screen stable --sess=dev
tta sess kill --sess=dev
```

文本输入必须用 quoted heredoc：

```bash
tta act send text --sess=vite-once <<'EOF'
my-project-name
EOF
tta obs screen stable --sess=vite-once
```

TUI 菜单和确认框用按键：

```bash
tta act send key --sess=vite-once --key=arrow_down
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
```

REPL 多行代码不要逐行粘贴。优先用脚本、加载命令，或单条执行入口：

```bash
tta act send text --sess=pyrepl <<'EOF'
exec("""
for i in range(3):
    print(i)
""")
EOF
tta obs screen stable --sess=pyrepl
```

## 注意事项

- session 名用小写短词或短横线，如 `dev`、`vite-once`。
- `act` / `obs` 都需要 `--sess=`，且 session 必须存在。
- `send text` 必须用 `<<'EOF'`，不要用 `<<EOF`，避免 shell 展开 `$`、`()`、反引号。
- heredoc 的真实换行会原样发送；末尾换行通常等同于提交。
- 菜单、列表、编号、`[Y/n]` 确认只用 `send key`。
- 不要依赖 `act` 的 stdout；用 `obs` 读屏。
- Agent 不要用 `tta sess watch`。
- 已退出 session 仍可 `obs` 读取最终输出；`act` 会失败。读完后 `sess kill`。

## 错误处理

| 情况 | 处理 |
|------|------|
| 屏幕卡住 | 先 `enter`，再试 `arrow_up` / `arrow_down` / `tab`，然后 `obs screen stable` |
| `act` 失败 | `tta sess list` 看状态；若 `exited`，先 `obs` 读错误，再 `sess kill` |
| TUI 无反应 | 检查是否误用 `send text`；菜单和确认框改用 `send key` |
| heredoc 结束不了 | `ctrl+c` 取消；确认结尾 `EOF` 顶格且单独一行 |
| REPL 卡在多行提示符 | 先试空行；仍卡住用 `ctrl+c`，改用脚本、paste/editor 模式或 `exec("""...""")` |
| 启动失败 | `sess list` -> `obs screen stable` 读错误 -> `sess kill` |

常见引号错误：

```bash
# 错误
tta sess start --sess=dev --cmd=npm run dev --cwd="/tmp"

# 正确
tta sess start --sess=dev --cmd="npm run dev" --cwd="/tmp"
```
