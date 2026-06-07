---
name: tta-agents
version: 0.1.6
description: "tta skill 内置子 skill，用 tta session 驱动 Coding Agent CLI。当前 Agent 是 controller；worker 是 Coding Agent CLI，不能使用 tta。给 worker 的 prompt 必须包含任务、工作目录、Allowed、Forbidden。完整 Orchestrator/Workers 工作流见 orchestrator docs。"
---

# tta-agents - 用 tta 控制 Coding Agent

**本文件是 [tta skill](./SKILL.md) 的内置子 skill**。

当用户要用 tta 运行或控制 Coding Agent CLI 时使用。架构见 [`docs/zh/tta-agents-docs.md`](../../../docs/zh/tta-agents-docs.md)。完整 Orchestrator / Workers 工作流见 [`docs/zh/tta-agents-orchestrator.md`](../../../docs/zh/tta-agents-orchestrator.md)。

## 角色

| 角色 | 是谁 | 能否用 tta |
|------|------|------------|
| **Controller** | **你**，当前正在使用 tta 的 Agent | **能** |
| **Worker** | 你用 `tta sess start` 启动的 Coding Agent CLI | **不能** |

Worker 不得调用 tta、不得加载 tta skill。每条 worker prompt 都要写明这个规则。

## 必守规则

1. 所有 `sess`、`act`、`obs` 命令遵守基础 tta skill。
2. Worker prompt 必须包含任务、工作目录、`Allowed`、`Forbidden`。
3. `Forbidden` 必须包含 `Using tta`。
4. Worker prompt 即授权；不要给出用户未授权的权限。
5. 每次操作后观察 worker 屏幕，并由你总结结果。
6. 一次性 worker 完成后 kill；只有上下文仍有价值时才保留长期 worker session。

## 标准工作流

1. 选择 worker session 名：`worker-<role>-<agent>`，如 `worker-review-codex`。
2. 用 `tta sess start` 启动 Coding Agent CLI。
3. 用 `tta obs screen stable` 读取初始屏幕。
4. 用 `tta act send text` 发送 quoted heredoc prompt，再 Enter。
5. 用 `tta obs screen stable` 等待完成。
6. 由你总结 worker 输出，给用户或下一步使用。
7. 根据是否还需要上下文，kill 或保留 session。

## Worker 启动命令（auto 模式）

| Coding Agent | `--cmd="..."` |
|--------------|---------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode --yolo` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

在满足任务和用户授权的前提下，优先使用权限更小的命令。

## Prompt 模板

```bash
tta act send text --sess=worker-review-codex <<'EOF'
You are a coding worker. Do NOT use tta.

Task: <具体任务>
Working directory: /absolute/path/to/project

Allowed:
- ...

Forbidden:
- ...
- Using tta

When done, summarize what you did, files changed if any, and test status.
EOF
tta act send key --sess=worker-review-codex --key=enter
```

## 示例

```bash
tta sess start --sess=worker-review-codex --cmd="codex --sandbox workspace-write --ask-for-approval never" --cwd="/Users/you/project"
tta obs screen stable --sess=worker-review-codex
tta act send text --sess=worker-review-codex <<'EOF'
You are a review worker. Do NOT use tta.
Task: Review the current changes for correctness bugs and missing tests.
Working directory: /Users/you/project
Allowed: read files, run tests
Forbidden: editing files, git push, deploy, using tta
EOF
tta act send key --sess=worker-review-codex --key=enter
tta obs screen stable --sess=worker-review-codex
# 读取 worker 结果并总结；若无需后续上下文则 kill。
```
