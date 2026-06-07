# tta-agents

**tta-agents** 是 [tta](../../README.zh.md) 之上的一层：用 tta 控制 Coding Agent CLI，适用于：

- 在 Claude Code 里启动 Codex 做一次 review。
- 在 Cursor Agent 里启动 Claude Code 实现一小块功能。

完整长程工作流（coder / reviewer / tester 等分工）见 [`tta-agents-orchestrator.md`](./tta-agents-orchestrator.md)。


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

**请清晰告知正在使用 tta 的 Agent 你的权限范围（允许/禁止的操作、目录、是否 deploy 等）。被 tta 控制的 Coding Agent 以 auto 模式运行，会把 prompt 当授权执行。**
