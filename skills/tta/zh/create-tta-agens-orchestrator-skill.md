---
name: create-tta-agens-orchestrator
version: 0.1.10
description: "tta skill 内置子 skill，指导用户创建或更新 Orchestrator.md，把 tta-agents 固化为 Human -> Orchestrator -> Workers 的项目工作流。用户提到创建 Orchestrator.md、orchestrator、workers 编排、多 agent 协作、用 tta 管理 coding agents 时使用。"
---

# create-tta-agens-orchestrator - 创建 Orchestrator.md

**本文件是 tta skill 的内置子 skill**。

当用户要创建、更新或设计 `Orchestrator.md` 时使用。目标是在项目内写出一份可执行的编排说明，让当前 Agent 作为 Orchestrator，用 tta 启动和管理多个 Coding Agent Workers。

## 核心协议

`Orchestrator.md` 必须明确：

1. Human 定义目标、边界、权限和验收标准。
2. Orchestrator 是当前正在使用 tta 的 Agent，负责拆分任务、启动或复用 worker session、派发 prompt、观察结果、总结并决定下一步。
3. Workers 是 Orchestrator 启动的 Coding Agent CLI，负责具体执行编码、review、测试、调研等任务。
4. Workers 不能使用 tta，不能加载 tta skill，Workers 之间不直接通信。
5. Orchestrator 默认串行调度：派给一个 worker -> 等待并观察完成 -> 总结 -> 决定下一步。
6. 可以保留多个 worker session 以保存上下文，但同一任务链上默认一次只推进一个步骤。

## 创建步骤

1. 确认 `Orchestrator.md` 的目标项目目录；如果用户没有指定，默认放在当前工作区根目录。
2. 了解用户希望的 workers 类型，例如 coder、reviewer、tester、researcher、browser-qa。
3. 写入下面模板，并按项目实际情况替换占位内容。
4. 保持 `Orchestrator.md` 自包含；不要依赖 README、docs 或外部相对链接。
5. 如果文件已存在，先读取现有内容，再按用户目标更新，不要覆盖用户已有约束。

## Orchestrator.md 模板

````markdown
# Orchestrator

## 目标

本项目使用 Human -> Orchestrator -> Workers 工作流。

Human 定义目标、约束、权限和验收标准。
Orchestrator 是当前正在使用 tta 的 Agent。
Workers 是 Orchestrator 启动的 Coding Agent CLI sessions。

## 角色

| 角色 | 职责 | 能否使用 tta |
|------|----------------|-------------|
| Human | 定义目标、范围、权限和最终决策 | 否 |
| Orchestrator | 规划工作、启动或复用 workers、发送 prompts、观察结果、总结下一步 | 是 |
| Worker | 执行分配的编码、review、测试、调研或 QA 任务 | 否 |

Workers 不得使用 tta，不得加载 tta skill，不得彼此直接通信。

## 调度

默认串行调度：

1. 给一个 worker 分配一个任务。
2. 等待完成并观察结果。
3. 总结结果。
4. 决定继续派给同一 worker、把上下文转交给另一个 worker，或向 Human 汇报。

可以保留多个 worker sessions 来保存上下文；除非 Human 明确要求并行，同一任务链一次只推进一个步骤。

## Worker Sessions

使用类似下面的 session 名：

- `worker-coder-codex`
- `worker-review-claude`
- `worker-test-cursor`
- `worker-research-opencode`

用足以完成任务的最小权限启动 workers。

示例命令：

```bash
tta sess start --sess=worker-coder-codex --cmd="codex --sandbox workspace-write --ask-for-approval never" --cwd="/absolute/path/to/project"
tta sess start --sess=worker-review-claude --cmd="claude --dangerously-skip-permissions" --cwd="/absolute/path/to/project"
tta sess start --sess=worker-test-cursor --cmd="agent --yolo --sandbox disabled" --cwd="/absolute/path/to/project"
```

## Worker Prompt Contract

每个 worker prompt 都必须包含：

- Task
- Working directory
- Allowed actions
- Forbidden actions
- Completion summary requirements

`Forbidden` 必须包含 `Using tta`。

Prompt 模板：

```text
You are a coding worker. Do NOT use tta.

Task: <specific task>
Working directory: /absolute/path/to/project

Allowed:
- <allowed action>

Forbidden:
- <forbidden action>
- Using tta

When done, summarize what you did, files changed if any, tests run, and any blockers.
```

## 交接规则

把一个 worker 的输出转交给另一个 worker 时：

1. Orchestrator 总结相关结果。
2. Orchestrator 只发送必要上下文给下一个 worker。
3. 不要求 workers 检查其他 worker sessions。
4. 面向 Human 的更新由 Orchestrator 给出，不直接来自 workers。

## 完成标准

向 Human 汇报完成前，Orchestrator 应说明：

- 变更内容
- 使用了哪些 workers
- 运行了哪些验证
- 已知风险或未解决问题
- 哪些 worker sessions 已 kill，哪些被有意保留
````

## 写作要求

- 用项目实际命令、目录和权限替换模板占位内容。
- 如果用户没有要求英文，优先按用户当前语言写 `Orchestrator.md`。
- 不要在 `Orchestrator.md` 中加入不可用的相对链接。
- 不要承诺 worker 拥有用户未授权的权限。
- 如果用户只想要最小版本，保留 Purpose、Roles、Scheduling、Worker Prompt Contract 四节即可。
