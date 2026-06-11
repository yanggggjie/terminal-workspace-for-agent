<div align="center">

<img src="./src/watch-ui/logo.png" alt="terminal-tool-for-agents, abbreviated as tta" width="520">


### **tta：让 Agent 操作交互式终端**

[![npm](https://img.shields.io/npm/v/terminal-tool-for-agents.svg)](https://www.npmjs.com/package/terminal-tool-for-agents)

[English README](./README.md)

</div>


## 是什么

`tta` 让 Agent 能够驱动交互式终端程序：REPL（如 `GDB`、`IPython`）、TUI（如 `lazygit`）、安装向导（如 `npm create vite`）、开发服务（如 `npm run dev`），以及 **Coding Agent CLI**（如 `Claude Code`，见 [tta-agents](./docs/zh/tta-agents-docs.md)）。

Fork 自 [tui-use](https://github.com/onesuper/tui-use) 并改造为 `tta`。感谢 [onesuper](https://github.com/onesuper) 的原始工作。

## 选择使用方式

| 方式 | 适合场景 | 文档 |
|------|----------|------|
| `tta` | 让当前 Agent 操作一个交互式终端程序 | 本 README |
| `tta-agents` | 临时启动另一个 Coding Agent 做单个任务，例如 review | [tta-agents](./docs/zh/tta-agents-docs.md) |
| `tta-agents-orchestrator` | 用多个 Coding Agent 组成 coder / reviewer / tester 等长程工作流 | [tta-agents-orchestrator](./docs/zh/tta-agents-orchestrator.md) |

`tta` 不绑定某个 Agent；Codex、OpenCode 等 Coding Agent 可以使用，OpenClaw、Hermes 等助手 Agent 也行，可以轻松实现 OpenClaw 操控Claude Code远程写代码。硬性要求只有：安装 Node.js。

## 示例

### tta

让 Agent 操作交互式终端。

<a href="https://youtu.be/dcl5HimC-dA?si=uqlNkuK2jX0-kwJ8" target="_blank" rel="noopener noreferrer">
  <img src="./docs/assets/tta.png" alt="tta pdb 示例视频封面" width="720">
</a>

[IPython 示例](https://youtu.be/9QbJjwJP39M?si=SPvCswWN130JV8g1)

### tta-agents

让 Agent 启动另一个 Coding Agent 做任务。

<a href="https://youtu.be/rjKqwjowtJc?si=E6Ne2YlplVcoP3Hg" target="_blank" rel="noopener noreferrer">
  <img src="./docs/assets/tta-agents.png" alt="tta-agents review 示例视频封面" width="720">
</a>

### tta-agents-orchestrator

让多个 Coding Agent 按 `Orchestrator.md` 协作。

<a href="https://youtu.be/rbCijIwmk0Y?si=ax7aFl6SSHW1UWz0" target="_blank" rel="noopener noreferrer">
  <img src="./docs/assets/tta-agents-orchestrator.png" alt="tta-agents-orchestrator dev-team 示例视频封面" width="720">
</a>

[视频中的 Orchestrator.md](https://github.com/yanggggjie/rising-repo/blob/main/Orchestrator.md)

## [为什么使用 tta-agents？](./docs/zh/why-tta-agents.md)

## 快速开始

**复制给你的 Agent 来安装**：

```text
Install tta CLI:
npm install -g terminal-tool-for-agents

Install tta skills from GitHub:
Use this directory listing:
https://api.github.com/repos/yanggggjie/terminal-tool-for-agents/contents/skills/tta?ref=main

Install every top-level .md skill file in that directory.
Do not install anything under skills/tta/zh/.
Do not hard-code the file list; discover it from the directory listing.

Confirm CLI and all discovered top-level skill files are installed.
```

**让 Agent 使用 tta**：

```text
Use tta to run an interactive terminal program and finish the task.
```

**观察 session**：

```bash
tta sess watch
```

然后打开 http://127.0.0.1:7654/。

## 更新

将下面这段复制给你的 Agent：

```text
Update tta CLI:
npm update -g terminal-tool-for-agents

Update tta skills from GitHub:
Use this directory listing:
https://api.github.com/repos/yanggggjie/terminal-tool-for-agents/contents/skills/tta?ref=main

Update every top-level .md skill file in that directory.
Do not install anything under skills/tta/zh/.
Do not hard-code the file list; discover it from the directory listing.

Confirm CLI and all discovered top-level skill files are updated.
```

## API 概览

tta 的一切操作都在 **session** 内进行（`--sess=`）：

| API | 命令 | 作用 |
|-----|------|------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | 创建、停止、列出 session；人类用 watch UI |
| **act** | `send text`, `send key` | 向 **运行中** 的 session 发送输入 |
| **obs** | `screen now`, `screen stable`, `screen scroll` | 读取 session 屏幕 |

```text
tta sess start -> (tta act ... -> tta obs screen stable)* -> tta sess kill
```

失败时输出一行 `error: <reason>`，退出码为 1。

完整命令模板和错误处理见 [`skills/tta/zh/SKILL.md`](./skills/tta/zh/SKILL.md)。

## 环境要求

- **Node.js** 22.x–26.x（`engines`：`>=22.0.0 <27.0.0`）；仓库含 `.nvmrc`（`24`）供本地开发
- 安装时会自动运行 `postinstall`，将 node-pty prebuild 复制到 `build/Release` 并验证 PTY 可用；无需手动 `approve-scripts`

## 开发

本地开发统一执行：

```bash
just install-dev-version
```

会 build、全局安装当前仓库版本；`postinstall` 会自动 `tta sess killall` 停掉旧 server。


如果你修改了 `tta`的skills，请给测试 Agent 加上这条指令：

```text
始终使用本地的tta skills，而不是安装的tta skills
本地tta skills路径@YOURPATH/terminal-tool-for-agents/skills/tta
```

切回 npm 上的正式版：

```bash
just install-npm-version
```

## 许可证

MIT
