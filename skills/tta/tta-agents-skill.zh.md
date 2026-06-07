---
name: tta-agents
version: 0.1.4
description: tta skill 内置子 skill。触发后：当前 Agent 即 Orchestrator，串行调度多个 Worker（关注点分离，如写代码/review/测试）。Worker 不能用 tta；反馈由 Orchestrator 转述。须遵守用户权限范围。当用户要用 tta 驱动 Coding Agent 或提到 Orchestrator/Worker 时使用。
---

# tta-agents - 用 tta 编排 Coding Agent

**本文件是 [tta skill](./SKILL.zh.md) 的内置子 skill**。读取时 **立即进入 Orchestrator 角色**。

**前提：** 已安装 `tta` CLI，并已加载 tta skill。架构见 [`docs/tta-agents-docs.zh.md`](../../docs/tta-agents-docs.zh.md)。

## 你是 Orchestrator

**正在使用 tta 的 Agent 就是 Orchestrator。** **你**是 Orchestrator，不是 Worker。

| 角色 | 是谁 | 能否用 tta |
|------|------|------------|
| **Orchestrator** | **你** | **能** |
| **Worker** | 你用 `tta sess start` 拉起的 Coding Agent CLI | **不能** |

Worker 不得调用 tta、不得加载 tta skill、不得 spawn 子 Worker。

## Orchestrator 工作方式（必读）

Orchestrator 通过 tta **管理 Worker**，并可在同一任务中 **用 tta 操作普通 session**（TUI、dev server 等，见 tta skill）。

对**长久、多步**任务：

1. 拆成多个**阶段**（如阶段一：写代码 → review → 修改 → 测试；阶段二：…）
2. 用**多个 Worker 做关注点分离**（如 `worker-coder`、`worker-reviewer`、`worker-test`）
3. **串行调度** — 同一任务链上，**一次只推进一个 Worker 的当前步骤**；该步完成并总结后，再派下一步

**Worker 之间不直接对话。** 流程永远是：

```text
派活 → obs 等待 Worker 完成 → Orchestrator 读屏、总结
    → Orchestrator 思考下一步
    → 派活给下一个 Worker（或把反馈派回上一个 Worker）
    → 循环，直至阶段/任务完成
```

例如阶段一：

- 把「写代码」派给 **coding worker** → 等完成 → **你**总结变更
- 把总结发给 **review worker** → 等完成 → **你**总结 review 意见
- 把 review 意见**转述**给 **coding worker** 修改 → 等完成 → **你**总结
- 把摘要发给 **test worker** → 等完成 → **你**总结测试结果 → 决定进入阶段二或回到某步

可同时开着多个 Worker **session**（保留各自上下文），但**调度必须串行**：review 须等 coding 完成且 **由你转述** 后再开始；**禁止**两个 Worker 并行做同一步骤。

## Worker 约束

1. **Worker 不能使用 tta**
2. **Worker 默认 auto 模式** — 启动命令见下表；prompt 即授权
3. **每条 prompt 须含：** 禁止 tta、任务、目录、Allowed / Forbidden

## 权限

Orchestrator **必须**遵守用户给的权限范围；向 Worker 派活时 **完整写入** Allowed / Forbidden；读屏监督，**防止 Worker 越权**；越权则中止并报告用户。Worker 之间传递的信息也须在用户授权范围内（例如 review 仅只读时，勿让 coder worker 在反馈中附带未授权操作）。

**派活 prompt 模板：**

```bash
tta act send text --sess=worker-coder-claude <<'EOF'
You are a coding worker. Do NOT use tta or spawn sub-agents.

Task: <本步具体任务>
Working directory: /absolute/path/to/project

Allowed:
- ...

Forbidden:
- ...
- Using tta

When done, summarize what you did (files changed, test status).
EOF
tta act send key --sess=worker-coder-claude --key=enter
```

**转述 review 意见给 coder 时**，prompt 里写清意见来自 Orchestrator，并粘贴你总结后的 review 要点，不要让 Worker 假设能直接联系 reviewer。

## Session 与 Worker

**Worker ⊆ Session。** 命名建议：`worker-coder-claude`、`worker-reviewer-codex`、`worker-test-pi`。

## Orchestrator 职责

1. 开启 / 维护 Worker session（任务完成前尽量不 kill，保留上下文）
2. 串行：派活 → `obs screen stable` → 总结 → 思考 → 下一步派活
3. 在 Worker 之间 **转述** 结果与反馈（不假设 Worker 互知）
4. 必要时用 tta 操作**非 Worker** session（如 `npm run dev` 观察日志）
5. 监督权限；用户未授权则不做

## 标准工作流（单步）

1. 确认你是 Orchestrator、明确用户权限与任务阶段
2. `tta sess start --sess=worker-<role>-<name> --cmd="..." --cwd="/absolute/path"`
3. `tta obs screen stable`
4. `tta act send text`（heredoc）+ Enter
5. `obs screen stable` → **总结** → 决定是否派给下一 Worker 或回传
6. 重复直至本阶段完成

## Worker 启动命令（auto 模式）

| Coding Agent | `--cmd="..."` |
|--------------|---------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode --yolo` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

## 示例：单 Worker（简单任务）

```bash
tta sess start --sess=worker-coder-claude --cmd="claude --dangerously-skip-permissions" --cwd="/Users/you/project"
tta obs screen stable --sess=worker-coder-claude
tta act send text --sess=worker-coder-claude <<'EOF'
You are a worker. Do NOT use tta.
Task: Fix auth bug, run npm test, summarize.
Working directory: /Users/you/project
Allowed: edit src/, run npm test
Forbidden: git push, deploy, using tta
EOF
tta act send key --sess=worker-coder-claude --key=enter
tta obs screen stable --sess=worker-coder-claude
# Orchestrator 读屏总结；若任务结束再 sess kill
```

## 示例：多 Worker 串行（写代码 → Review → 修改 → 测试）

**关注点分离，但 Orchestrator 串行调度。** Worker 不互相对话；反馈由 **你** 转述。

```bash
# --- 0. 可预先开启多个 Worker session（各自保留上下文）---
tta sess start --sess=worker-coder-claude --cmd="claude --dangerously-skip-permissions" --cwd="/Users/you/project"
tta sess start --sess=worker-reviewer-codex --cmd="codex --sandbox workspace-write --ask-for-approval never" --cwd="/Users/you/project"
tta sess start --sess=worker-test-pi --cmd="pi" --cwd="/Users/you/project"

# --- 1. 写代码（仅 coding worker 工作；其他 worker 等待）---
tta obs screen stable --sess=worker-coder-claude
tta act send text --sess=worker-coder-claude <<'EOF'
Do NOT use tta. Implement feature X in src/. Summarize changes when done.
Allowed: edit src/, run npm test
Forbidden: git push, using tta
EOF
tta act send key --sess=worker-coder-claude --key=enter
tta obs screen stable --sess=worker-coder-claude
# Orchestrator：读屏，整理《变更摘要》，暂不动 reviewer

# --- 2. Review（coding 已完成；Orchestrator 把摘要发给 reviewer）---
tta obs screen stable --sess=worker-reviewer-codex
tta act send text --sess=worker-reviewer-codex <<'EOF'
Do NOT use tta. Review the following changes (from Orchestrator, not from another agent):

<paste Orchestrator 总结的变更摘要>

List issues and suggestions. Summarize when done.
Forbidden: editing files, using tta
EOF
tta act send key --sess=worker-reviewer-codex --key=enter
tta obs screen stable --sess=worker-reviewer-codex
# Orchestrator：读屏，整理《Review 意见》

# --- 3. 修改（Orchestrator 把 review 意见转述给 coder；须等步骤 2 完成）---
tta obs screen stable --sess=worker-coder-claude
tta act send text --sess=worker-coder-claude <<'EOF'
Do NOT use tta. Address the following review feedback (from Orchestrator):

<paste Orchestrator 总结的 Review 意见>

Summarize what you fixed.
EOF
tta act send key --sess=worker-coder-claude --key=enter
tta obs screen stable --sess=worker-coder-claude

# --- 4. 测试（Orchestrator 把摘要发给 test worker）---
tta obs screen stable --sess=worker-test-pi
tta act send text --sess=worker-test-pi <<'EOF'
Do NOT use tta. Run npm test and report results.
Context from Orchestrator: <变更与修复摘要>
EOF
tta act send key --sess=worker-test-pi --key=enter
tta obs screen stable --sess=worker-test-pi
# Orchestrator：总结测试结果 → 进入阶段二或回到某步

# 全任务结束后：tta sess kill --sess=worker-coder-claude 等
```

## 异常与兜底

- **Worker 无响应：** `sess list` → `obs screen stable`
- **Worker 越权：** 中止 / kill，报告用户
- **勿并行抢步：** 若 coding 尚未完成，不要同时向 reviewer 派活

**分工：** 普通 TUI / dev server → tta skill；Coding Agent 任务链 → 本 skill，**串行** Orchestrator 循环。
