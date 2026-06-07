# tta-agents-orchestrator

**tta-agents-orchestrator** 是建立在 tta-agents 之上的工作流范式：

> **Human -> Orchestrator -> Workers**

人定义目标和工作流约束。Orchestrator 负责拆分步骤、启动或复用 worker session、派发任务、观察结果，并在 workers 之间转述信息。Workers 负责具体执行：编码、review、测试、调研、浏览器自动化等。

## 核心协议

1. Orchestrator 是当前正在使用 tta 的 Agent。
2. Workers 是由 Orchestrator 启动的 Coding Agent。 Workers 不能使用 tta。 Workers 之间不直接通信。
3. Orchestrator 串行派发任务、观察完成、总结结果、决定下一步。

采用串行调度：

```text
派给 worker A -> 等待并观察完成 -> 总结
    -> 判断下一步
    -> 派给 worker B，或把反馈转回 worker A
    -> 等待并观察完成
    -> 重复，直到阶段或任务完成
```

可以同时保留多个 worker session，让它们各自保留上下文；但同一任务链上默认一次只推进一个步骤。
