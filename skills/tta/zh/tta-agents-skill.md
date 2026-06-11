---
name: tta-agents
version: 0.1.11
description: "tta skill 内置子 skill，用 tta session 驱动 Coding Agent CLI。当前 Agent 是 Controller；Worker 是被启动的 Coding Agent CLI，不能使用 tta。Worker prompt 必须包含任务、工作目录、Allowed、Forbidden。"
---

# tta-agents - 用 tta 控制 Coding Agent

本文件是 tta skill 的内置子 skill。用户要用 tta 运行或控制 Coding Agent CLI 时使用。

创建、更新或设计 `Orchestrator.md` 时，改读 `create-tta-agens-orchestrator-skill.md`。

## 架构

tta-agents 用当前 Agent 作为 Controller，通过 tta 启动和观察 Coding Agent CLI Worker。Worker 做具体任务，Controller 负责派发、观察和总结。

## API 表格

| API | 用途 | 规则 |
|-----|------|------|
| `sess` | 启动、保留或关闭 Worker session | 一次性 Worker 完成后 kill；需要上下文时可保留 |
| `act` | 给 Worker 发送 prompt 或按键 | prompt 用 quoted heredoc；必要时再发 `enter` |
| `obs` | 读取 Worker 屏幕 | 每次 `act` 后都观察，并由 Controller 总结 |

## 角色

| 角色 | 是谁 | 能否用 tta |
|------|------|------------|
| Controller | 当前 Agent | 能 |
| Worker | `tta sess start` 启动的 Coding Agent CLI | 不能 |

Worker 不得调用 tta、不得加载 tta skill。每条 Worker prompt 都要写明这一点。

## 标准工作流

1. 选择 session 名：`worker-<role>-<agent>`，如 `worker-review-codex`。
2. 用 `tta sess start` 启动 Coding Agent CLI。
3. 用 `tta obs screen stable` 读取初始屏幕。
4. 用 `tta act send text` 发送 prompt。
5. 如需提交，发送 `enter`。
6. 用 `tta obs screen stable` 等待结果。
7. Controller 总结 Worker 输出。
8. 根据是否还需要上下文，kill 或保留 session。

## Worker 启动命令

| Coding Agent | `--cmd="..."` |
|--------------|---------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

在任务允许时，优先使用权限更小的命令。

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

## 注意事项

- 所有 `sess`、`act`、`obs` 命令仍遵守基础 tta skill。
- Worker prompt 必须包含任务、工作目录、`Allowed`、`Forbidden`。
- `Forbidden` 必须包含 `Using tta`。
- Prompt 即授权；不要给出用户未授权的权限。
- Prompt 使用使用者语言；只有用户明确要求时才用其他语言。
- 每次操作后读屏，由 Controller 汇总结果，不直接转述未核对的屏幕片段。

## 错误处理

| 情况 | 处理 |
|------|------|
| Worker 没响应 | `obs screen stable` 确认状态；必要时发送 `enter` |
| Worker 提示权限不足 | 不要自行扩大权限；向用户确认或重新发更小范围任务 |
| Worker 尝试使用 tta | 发送更正 prompt，重申 `Forbidden: Using tta` |
| Worker 已退出 | 先 `obs` 读取最终输出，再 `sess kill` |
| 输出不完整 | 继续 `obs screen stable` 或让 Worker 总结当前状态 |

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
```
