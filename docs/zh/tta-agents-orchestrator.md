# tta-agents-orchestrator

**tta-agents-orchestrator** 是建立在 tta-agents 之上的工作流范式：

> **Human -> Orchestrator -> Workers**

人定义目标和工作流约束。Orchestrator 负责拆分步骤、启动或复用 worker session、派发任务、观察结果，并在 workers 之间转述信息。Workers 负责具体执行：编码、review、测试、调研、浏览器自动化等。

这不是使用 tta-agents 的必选项。如果只是想在 Claude Code 里让 Codex 做一次 review，看 [`tta-agents-docs.md`](./tta-agents-docs.md) 即可。

## 为什么需要这个

### 和 subagents 相比

subagents 能缓解上下文压力，但运行过程通常不可观察。使用 tta 时，Orchestrator 可以通过 `tta obs` 观察 worker 当前状态和输出。

tta worker 也是一个完整的 Coding Agent session，可以跨多次 prompt 保留上下文，更适合长任务链。


### 和 tmux、cmux、herdr 相比

tmux、cmux、herdr 都是很好的终端和 agent 控制工具。tta-agents-orchestrator 的关注点是 **agent 使用 agent**：人类主要通过 `tta sess watch` 观察，Orchestrator 管理 worker 循环。

## 核心协议

1. Orchestrator 是当前正在使用 tta 的 Agent。
2. Workers 是 Orchestrator 在 tta session 中启动的 Coding Agent CLI。
3. Workers 不能使用 tta。
4. Workers 之间不直接通信。
5. Orchestrator 串行派发任务、观察完成、总结结果、决定下一步。
6. 每条 worker prompt 都包含任务、工作目录、`Allowed` 和 `Forbidden`。

默认采用串行调度：

```text
派给 worker A -> 等待并观察完成 -> 总结
    -> 判断下一步
    -> 派给 worker B，或把反馈转回 worker A
    -> 等待并观察完成
    -> 重复，直到阶段或任务完成
```

可以同时保留多个 worker session，让它们各自保留上下文；但同一任务链上默认一次只推进一个步骤。

## 阶段示例

| 步骤 | Worker | Orchestrator 动作 |
|------|--------|-------------------|
| 1. 写代码 | `worker-coder-claude` | 派开发任务，等待，总结变更 |
| 2. Review | `worker-reviewer-codex` | 发送 Orchestrator 总结的变更摘要，等待，总结问题 |
| 3. 修改 | `worker-coder-claude` | 转述总结后的 review 意见，等待，总结修复 |
| 4. 测试 | `worker-test-pi` | 发送变更/修复摘要，等待，总结测试结果 |

reviewer 不直接和 coder 对话。Orchestrator 读取 reviewer 输出，思考后，再把总结后的反馈写入 coder prompt。

## Orchestrator.md 模板

```markdown
# Orchestrator

## Goal

<用户希望完成什么。>

## Permissions

Allowed:
- <用户允许的操作>

Forbidden:
- <用户禁止的操作>
- Using tta from any worker

## Workers

- `worker-coder-claude`: 实现
- `worker-reviewer-codex`: review
- `worker-test-pi`: 测试与验证

## Scheduling Rules

1. 同一时间只推进一个 worker 步骤。
2. 每个 worker 步骤完成后，观察屏幕并总结结果。
3. 信息由 Orchestrator 转述；workers 不直接通信。
4. 如果 worker 越过权限范围，停止它并报告用户。
5. worker session 在上下文仍有价值时保留；工作流结束后 kill。

## Phase 1

1. 请 coder 实现。
2. 总结 coder 变更。
3. 请 reviewer 基于摘要和相关文件 review。
4. 总结 reviewer 问题。
5. 请 coder 修复采纳的问题。
6. 请 tester 运行验证。
7. 汇报结果或进入下一阶段。
```

## 边界

适合长程、多步骤、需要关注点分离的任务。对于一次性的简单任务，直接使用单个 tta-agents worker 更轻量。
