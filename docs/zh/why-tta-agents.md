# 为什么 tta-agents？

## 可以并行多个 Coding Agent 吗？

可以。`tta obs screen now` 会立即返回，适合轮询多个 session 的当前状态；`tta obs screen stable` 会等待屏幕稳定后返回，适合顺序等待某个 Worker 完成。

为了长任务的稳定性和逻辑正确性，默认推荐阻塞式观察：派发一个任务，等待完成，总结结果，再决定下一步。

## 和 subagents 有什么不同？

层次不同。subagents 更适合缓解主 Agent 的上下文压力，通常是短任务、单次执行、上下文不连续的 Worker。

tta-agents 是 Agent 应用层的组织方式：当前 Agent 可以启动另一个完整 Coding Agent CLI，并通过 tta 观察它的屏幕输出、保留它的 session 上下文、在需要时继续给它派任务。由 tta-agents 启动的 Coding Agent 仍然可以在自己的环境里使用 subagents。

这也让你可以组合不同 harness 的优点：例如用 Claude Code 日常编码，用 Codex 做 review，用 Pi 处理需要浏览器或扩展能力的任务，用 Kimi Code 做快速探索。

## 为什么走 TUI，而不是统一 SDK？

不同 Coding Agent 的 SDK 形态、抽象层级和权限模型差异很大。为它们设计一个统一 SDK 抽象会很重，也容易落后于各自产品变化。

TUI 则相对一致：启动命令、发送输入、读取屏幕。tta 选择控制终端这层，让 Agent 使用另一个 Agent 的方式尽量接近人类使用 CLI 的方式。需要人工观察时，也可以用 `tta sess watch` 直接看同一个 session。

## 和 tmux、cmux、herdr 有什么不同？

tmux、cmux、herdr 都是很好的终端或多 Agent 控制工具。tta 的目标更窄：聚焦让 Agent 通过 API 稳定控制交互式终端，尤其是控制 Coding Agent CLI。

也就是说，tta-agents 不是通用终端工作台，而是面向 Agent 控制 Agent 的轻量应用。

## tta-agents-orchestrator 到底是什么？

它是一种关注点分离实践：

- Orchestrator 只做调度：拆任务、派发、观察、总结、决定下一步。
- Workers 做具体工作：编码、review、测试、调研、浏览器自动化等。
- 每个 Worker 可以保留自己的上下文；即使某个 Worker 上下文变复杂，Orchestrator 仍能用新的 prompt 拉回目标和边界。

详情见 [tta-agents-orchestrator](./tta-agents-orchestrator.md)。
