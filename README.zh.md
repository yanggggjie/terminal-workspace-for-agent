<div align="center">

<img src="./src/watch-ui/logo.png" alt="terminal-tool-for-agents, abbreviated as tta" width="520">


### **tta：供 Agent 使用的终端工具，让 Agent 操作交互式终端。**

[![npm](https://img.shields.io/npm/v/terminal-tool-for-agents.svg)](https://www.npmjs.com/package/terminal-tool-for-agents)

[English README](./README.md)

</div>


## 是什么

`tta` 面向 Agent，驱动交互式终端程序：REPL（如 `GDB`、`IPython`）、TUI（如 `lazygit`）、安装向导（如 `npm create vite`）、持续观察日志的服务（如 `npm run dev`），以及 **Coding Agent CLI**（如`Claude Code` 多 Agent 编排见 [**tta-agents**](./docs/tta-agents-docs.zh.md)）。

核心思路：`sess` 启动后台终端 → `act` 发送按键或文本 → `obs` 等待稳定后读屏。

非交互式命令用 `bash`，交互式命令用 `tta`。

Fork 自 [tui-use](https://github.com/onesuper/tui-use) 并改造为 `tta`。感谢 [onesuper](https://github.com/onesuper) 的原始工作。


## 快速开始

将下面这段复制给你的 Agent：

```text
Install tta CLI:
npm install -g terminal-tool-for-agents

Install tta skills (English only — do NOT install *.zh.md):
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/tta-agents-skill.md

tta-agents-skill ships with tta skill in the same folder; no separate install.

Confirm CLI and both skill files are installed.
```

然后让 Agent 执行任务：

```text
Use tta to run an interactive terminal program and finish the task.
```

**人类观察 session：**

```bash
tta sess watch
```

然后打开 http://127.0.0.1:7654/。

## 更新

将下面这段复制给你的 Agent：

```text
Update tta CLI:
npm update -g terminal-tool-for-agents

Update tta skills (English only — do NOT install *.zh.md):
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/tta-agents-skill.md

Confirm CLI and both skills are updated.
```

## 何时用 tta vs shell

| 场景 | 工具 | 是否 kill session？ |
|------|------|---------------------|
| 普通 / 非交互式命令 | shell | - |
| 一次性交互 CLI（`npm create vite@latest`） | tta | 完成后 **要** |
| 交互式 TUI（`lazygit`） | tta | 完成后 **要** |
| 长驻进程 + 观察日志（`npm run dev`） | tta | 观察期间 **不要** |

Coding Agent（保留对话上下文）→ 触发内置 [tta-agents](./docs/tta-agents-docs.zh.md) 子 skill。

**若用 tta-agents 编排多个 Coding Agent：请清晰告知 Orchestrator 你的权限范围（允许/禁止的操作、目录、是否 deploy 等）。Worker 默认 auto 模式，会把 prompt 当授权执行。** 详见 [tta-agents 文档](./docs/tta-agents-docs.zh.md)。

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

操作细节见 [`skills/tta/SKILL.zh.md`](./skills/tta/SKILL.zh.md)。

## 环境要求

- **Node.js** 22.x–26.x（`engines`：`>=22.0.0 <27.0.0`）；仓库含 `.nvmrc`（`24`）供本地开发
- 安装时会自动运行 `postinstall`，将 node-pty prebuild 复制到 `build/Release` 并验证 PTY 可用；无需手动 `approve-scripts`

## 开发

改代码后重新全局安装再测：

```bash
just install
tta sess list
```

仅开发 Watch UI 时（静态文件从 `src/watch-ui/` 提供）：

```bash
just dev
tta sess watch   # http://127.0.0.1:7654
```

- **后端**（`src/*.ts`）：改完 → `just install` → 再跑 `tta`
- **Watch UI**（`src/watch-ui/*`）：`just dev` 下保存 → 刷新浏览器

## 许可证

MIT
