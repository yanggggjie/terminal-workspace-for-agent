<div align="center">

<img src="./src/watch-ui/logo.png" alt="terminal-tool-for-agents, abbreviated as tta" width="520">


### **tta：让 Agent 操作交互式终端**

[![npm](https://img.shields.io/npm/v/terminal-tool-for-agents.svg)](https://www.npmjs.com/package/terminal-tool-for-agents)

[English README](./README.md)

</div>


## 是什么

`tta` 让 Agent 能够使用驱动交互式终端程序：REPL（如 `GDB`、`IPython`）、TUI（如 `lazygit`）、安装向导（如 `npm create vite`）、开发服务（如 `npm run dev`），以及 **Coding Agent CLI**（如 `Claude Code`，见 [**tta-agents**](./docs/zh/tta-agents-docs.md)）。

Fork 自 [tui-use](https://github.com/onesuper/tui-use) 并改造为 `tta`。感谢 [onesuper](https://github.com/onesuper) 的原始工作。


## 快速开始

**复制给你的 Agent 来安装**：

```text
Install tta CLI:
npm install -g terminal-tool-for-agents

Install tta skills (English only — do NOT install skills/tta/zh/*.md):
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/tta-agents-skill.md

tta-agents-skill ships with tta skill in the same folder; no separate install.

Confirm CLI and both skill files are installed.
```

**让 Agent 使用tta**：

```text
Use tta to run an interactive terminal program and finish the task.
```

**观察**

```bash
tta sess watch
```

然后打开 http://127.0.0.1:7654/。

## [tta-agents](./docs/zh/tta-agents-docs.md)

用 tta 控制 Claude Code、Codex、Cursor Agent、OpenCode、Pi、Kimi Code 等 Coding Agent CLI。它可以很轻量，比如让一个 Coding Agent 临时启动另一个 Coding Agent 做 review。


## [tta-agents-orchestrator](./docs/zh/tta-agents-orchestrator.md)

完整 `Human -> Orchestrator -> Workers` 工作流，适合长程、多步骤、需要 coder / reviewer / tester 等关注点分离的任务。


## 更新

将下面这段复制给你的 Agent：

```text
Update tta CLI:
npm update -g terminal-tool-for-agents

Update tta skills (English only — do NOT install skills/tta/zh/*.md):
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/tta-agents-skill.md

Confirm CLI and both skills are updated.
```

## API 示例

Tip：Be lazy，不要自己动手尝试，让 Agent 来做。

```bash
# Dev server：保持 session，用 obs 观察
tta sess start --sess=dev --cmd="npm run dev" --cwd="/path/to/project"
tta obs screen stable --sess=dev

# 一次性交互 CLI：完成后 kill
tta sess start --sess=vite-once --cmd="npm create vite@latest" --cwd="/path/to/project"
tta obs screen stable --sess=vite-once
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
tta sess kill --sess=vite-once
```

## API 概览

tta 的一切操作都在 **session** 内进行（`--sess=`）。

| API | 命令 | 作用 |
|-----|------|------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | 创建、停止、列出 session；人类用 watch UI |
| **act** | `send text`, `send key` | 向 **运行中** 的 session 发送输入 |
| **obs** | `screen now`, `screen stable`, `screen scroll` | 读取 session 屏幕 |

```text
tta sess start -> (tta act ... -> tta obs screen stable)* -> tta sess kill
```

失败时输出一行 `error: <reason>`，退出码为 1。

操作细节见 [`skills/tta/zh/SKILL.md`](./skills/tta/zh/SKILL.md)。

## 环境要求

- **Node.js** 22.x–26.x（`engines`：`>=22.0.0 <27.0.0`）；仓库含 `.nvmrc`（`24`）供本地开发
- 安装时会自动运行 `postinstall`，将 node-pty prebuild 复制到 `build/Release` 并验证 PTY 可用；无需手动 `approve-scripts`

## 开发

无论改了后端还是 Watch UI，本地开发统一执行：

```bash
just install-dev-version
```

会 build、全局安装当前仓库版本；`postinstall` 会自动 `tta sess killall` 停掉旧 server。

```bash
tta sess list    # 验证 CLI
tta sess watch   # http://127.0.0.1:7654
```

切回 npm 上的正式版：

```bash
just install-npm-version
```

## 许可证

MIT
