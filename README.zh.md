<div align="center">

<img src="src/watch-ui/logo.png" alt="terminal-tool-for-agents, abbreviated as tta" width="520">


### **tta：供 Agent 使用的终端工具，让 Agent 操作交互式终端。**

[![npm](https://img.shields.io/npm/v/terminal-tool-for-agents.svg)](https://www.npmjs.com/package/terminal-tool-for-agents)

[English README](README.md)

</div>


## 是什么

`tta` 面向 Agent，驱动交互式终端程序：Coding Agent (如 `Claude Code`)、REPL （如`GDB`，`IPython`）、TUI（如 `lazygit`）、安装向导（如 `npm create vite`）、持续观察日志的服务 (如`npm run dev`)。

核心思路：`sess` 启动后台终端 → `act` 发送按键或文本 → `obs` 等待稳定后读屏。

非交互式命令用`bash`，交互式命令用`tta`。

Fork 自 [tui-use](https://github.com/onesuper/tui-use) 并改造为 `tta`。感谢 [onesuper](https://github.com/onesuper) 的原始工作。

## 示例

## 快速开始

将下面这段复制给你的 Agent：

```text
Install tta CLI:
npm install -g terminal-tool-for-agents

Install the tta skill from:
https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md

Confirm both are installed.
```

然后让 Agent 执行任务：

```text
Use tta to run an interactive coding agent CLI and finish the task.
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

Update the tta skill from:
https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md

Kill all tta sessions so the background service restarts on next use:
tta sess killall

Confirm both are updated.
```

## 何时用 tta vs shell

| 场景 | 工具 | 是否 kill session？ |
|------|------|---------------------|
| 普通 / 非交互式命令 | shell | - |
| 一次性交互 CLI（`npm create vite@latest`） | tta | 完成后 **要** |
| 交互式 TUI（`lazygit`） | tta | 完成后 **要** |
| 交互式 Agent（保留对话上下文） | tta | 任务完成前 **不要** |
| 长驻进程 + 观察日志（`npm run dev`） | tta | 观察期间 **不要** |

## API 示例
Tip：Be lazy，不要自己动手尝试，让Agent来做。
```bash
# Dev server：保持 session，用 obs 观察
tta sess start --sess=dev --cmd="npm run dev"
tta obs screen stable --sess=dev

# 一次性交互 CLI：完成后 kill
tta sess start --sess=vite-once --cmd="npm create vite@latest"
tta obs screen stable --sess=vite-once
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
tta sess kill --sess=vite-once

# 编程 Agent CLI（多轮保持 session）
tta sess start --sess=claude --cmd="claude"
tta obs screen stable --sess=claude
```

## API 概览

| API | 命令 | 作用 |
|-----|------|------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | 创建、停止、列出 session；人类用 watch UI |
| **act** | `send text`, `send key` | 向 **运行中** 的 session 发送输入 |
| **obs** | `screen now`, `screen stable`, `screen scroll` | 读取 session 屏幕（运行中或已退出） |

```text
tta sess start -> (tta act ... -> tta obs screen stable)* -> tta sess kill
```

失败时输出一行 `error: <reason>`，退出码为 1。

## 环境要求

- **Node.js** 22.x–26.x（`engines`：`>=22.0.0 <27.0.0`）；仓库含 `.nvmrc`（`24`）供本地开发
- `npm install` 或 `npm install -g` 后，若 npm 对 `node-pty` 提示 allow-scripts，请运行 `npm approve-scripts node-pty` 或 `npm approve-scripts --allow-scripts-pending`，然后重新安装，以便 PTY 原生模块正确安装。

## 开发

```bash
just dev 
just link        # 链接以便全局测试
just unlink        # 测试完成删除链接
tta sess watch        # 打开 http://127.0.0.1:7654 观察
```

- **后端**（`src/*.ts`）：保存 → tsc 重编译 → nodemon 重启 server → 刷新浏览器。
- **Watch UI**（`src/watch-ui/*`）：保存 → 刷新浏览器（开发模式下直接从 `src/` 提供）。

## 许可证

MIT
