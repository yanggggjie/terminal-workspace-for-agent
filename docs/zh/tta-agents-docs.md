# tta-agents

**tta-agents** 是 [tta](../../README.zh.md) 之上的一层：让当前 Agent 用 tta 启动、观察和管理另一个 Coding Agent CLI。

适合临时委托一个清晰任务，例如：

- 在 Claude Code 里启动 Codex 做一次 review。
- 在 Cursor Agent 里启动 Claude Code 实现一小块功能。
- 让一个 Worker 单独跑测试、调研问题或验证方案。

如果要把 coder / reviewer / tester 等角色固化成一套长程流程，见 [tta-agents-orchestrator](./tta-agents-orchestrator.md)。

## 基础工作流

```text
启动 Worker session -> 观察初始屏幕 -> 发送任务 prompt -> 等待完成 -> 总结结果 -> kill 或保留 session
```

当前 Agent 是 Controller，负责派发任务和总结结果。被启动的 Coding Agent 是 Worker，只执行分配的具体任务。

Worker prompt 至少应包含：

- `Task`：要完成的具体任务。
- `Working directory`：工作目录。
- `Allowed`：允许的操作。
- `Forbidden`：禁止的操作，必须包含 `Using tta`。
- 完成后的摘要要求。

## 权限

**请清晰告知正在使用 tta 的 Agent 你的权限范围（允许/禁止的操作、目录、是否 deploy 等）。被 tta 控制的 Coding Agent 以 auto 模式运行，会把 prompt 当授权执行。**

完整命令模板、Worker 启动命令和错误处理见 [`skills/tta/zh/tta-agents-skill.md`](../../skills/tta/zh/tta-agents-skill.md)。
