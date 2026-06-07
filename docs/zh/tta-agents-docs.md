# tta-agents

**tta-agents** 是 [tta](../../README.zh.md) 之上的一层：用 tta 控制 Coding Agent CLI。

它不只适用于完整多 Agent 编排。很简单的场景也可以用：

- 在 Claude Code 里临时启动 Codex 做一次 review。
- 在 Cursor Agent 里启动 Claude Code 实现一小块功能。
- 保留一个长期 Coding Agent session，后续继续追问。

完整长程工作流（coder / reviewer / tester 等分工）见 [`tta-agents-orchestrator.md`](./tta-agents-orchestrator.md)。

## 三层结构

| 层级 | 作用 | 内容 |
|------|------|------|
| **tta** | 通用终端控制 | CLI、`sess` / `act` / `obs`、基础 skill、基础 docs |
| **tta-agents** | 用 tta 控制 Coding Agent CLI | 内置子 skill 与本文档 |
| **tta-agents-orchestrator** | 完整工作流范式 | Orchestrator / Workers 示例与协议 |

`skills/tta/zh/tta-agents-skill.md` 与 `skills/tta/zh/SKILL.md` **一并提供，无需单独安装**。只有当用户要用 tta 驱动 Coding Agent CLI 时，才读取并遵循 [`tta-agents-skill.md`](../../skills/tta/zh/tta-agents-skill.md)。tta 基础 API 见 [`SKILL.md`](../../skills/tta/zh/SKILL.md)。

## 为什么用 tta 控制 Coding Agent

### TUI 是通用接口

不同 Coding Agent 的 SDK、权限模型、streaming API 和命令参数差异很大。但它们的终端交互很相似：启动 CLI、输入 prompt、等待、读屏、继续输入。

tta 选择利用这个共同的 TUI 表面，而不是抽象一套统一 SDK。

### 默认可观察

控制方可以用 `tta obs screen stable` 观察 worker 正在做什么、返回了什么。人类也可以用 `tta sess watch` 旁观 session。

这和很多 subagent 系统不同：subagent 往往只能看到最终结果，中间过程不可见。

### 天然跨 Agent

只要某个 Coding Agent CLI 能在 PTY 中运行，tta 就可以控制它：Claude Code、Codex、Cursor Agent、OpenCode、Pi、Kimi Code 等。

### 不需要 SDK 集成

tta-agents 不需要 provider-specific SDK。它使用的就是人类平时在终端里使用 agent 的方式。

## 角色

| 角色 | 是谁 | 能否用 tta |
|------|------|------------|
| **Controller** | 当前正在用 tta 的 Agent | **能** |
| **Worker** | 在 tta session 中启动的 Coding Agent CLI | **不能** |

Worker 本质上是普通 tta session，只是里面跑的是 Coding Agent CLI。给 Worker 的 prompt 必须写明 `Do NOT use tta`。

当进入完整 Orchestrator / Workers 工作流时，Controller 就成为 Orchestrator。更强的协议见 [`tta-agents-orchestrator.md`](./tta-agents-orchestrator.md)。

## 基础工作流

```text
启动 worker session -> 观察屏幕 -> 发送 prompt -> 等待完成 -> 总结结果 -> kill 或保留 session
```

示例：从另一个 agent 中启动 Codex 做 review。

```bash
tta sess start --sess=worker-review-codex --cmd="codex --sandbox workspace-write --ask-for-approval never" --cwd="/Users/you/project"
tta obs screen stable --sess=worker-review-codex
tta act send text --sess=worker-review-codex <<'EOF'
You are a review worker. Do NOT use tta.

Task: Review the current working tree for correctness bugs and missing tests.
Working directory: /Users/you/project

Allowed:
- Read files
- Run tests

Forbidden:
- Editing files
- git push
- deploy
- Using tta

When done, summarize findings by severity.
EOF
tta act send key --sess=worker-review-codex --key=enter
tta obs screen stable --sess=worker-review-codex
```

## 权限

Worker 通常以 auto 模式运行。每条 prompt 都应被视为授权边界：

- 写清任务和工作目录。
- 写清 `Allowed` 与 `Forbidden`。
- 永远禁止 `Using tta`。
- 如果 Worker 越权，停止它并报告用户。

## Worker 启动命令

| Coding Agent | auto 模式命令 |
|--------------|---------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode --yolo` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

在满足任务和用户授权的前提下，优先使用权限更小的命令。

## 何时触发

- 用户要通过 tta 运行或控制 Coding Agent CLI。
- 用户要求一个 Coding Agent 使用另一个 Coding Agent。
- 用户提到 worker、多 agent review、写代码/review/测试分工，或 Orchestrator。

普通 TUI、安装向导、dev server、REPL 等非 Coding Agent 场景只使用基础 tta skill。
