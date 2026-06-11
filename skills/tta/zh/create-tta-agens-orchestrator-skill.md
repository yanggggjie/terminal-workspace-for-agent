---
name: create-tta-agens-orchestrator
version: 0.1.10
description: "tta skill 内置子 skill，用于创建或更新 Orchestrator.md，把 tta-agents 固化为 Human -> Orchestrator -> Workers 工作流。"
---

# create-tta-agens-orchestrator - 创建 Orchestrator.md

本文件是 tta skill 的内置子 skill。用户要创建、更新或设计 `Orchestrator.md` 时使用。

目标：写一份可执行的项目内说明，让当前 Agent 作为 Orchestrator，用 tta 启动和管理 Coding Agent Workers。

## 核心协议

`Orchestrator.md` 必须明确：

1. Human 定义目标、边界、权限和验收标准。
2. Orchestrator 只做调度，不读项目代码，不执行编码、测试、review、调研或文件读写。
3. Workers 执行具体任务，不能使用 tta，不能加载 tta skill，彼此不直接通信。
4. 默认串行调度：派发 -> 等待 -> 观察 -> 总结 -> 决定下一步。
5. 可以保留多个 worker session 保存上下文，但同一任务链默认一次只推进一步。
6. 必须包含 `权限` 章节；默认权限是 `Orchestrator.md` 所在目录及其子目录的读写权限。

## 创建步骤

1. 确认 `Orchestrator.md` 的目标项目目录；如果用户没有指定，默认放在当前工作区根目录。
2. 确认需要哪些 Workers，例如 coder、reviewer、tester、researcher、browser-qa。
3. 写入下面模板，并按项目实际情况替换占位内容。
4. 文件必须自包含，不依赖 README、docs 或外部链接。
5. 如果文件已存在，先读现有内容，再更新；不要覆盖用户已有约束。
6. 完成后提醒用户：默认权限可在 `权限` 章节收紧或放宽。

## API 表格

| API | 在 Orchestrator 中的用途 | 注意 |
|-----|---------------------------|------|
| `sess` | 启动、复用、关闭 Worker sessions | session 名建议 `worker-<role>-<agent>` |
| `act` | 给 Worker 发送 prompt 或按键 | prompt 必须包含任务、目录、Allowed、Forbidden |
| `obs` | 观察 Worker 输出 | Orchestrator 基于观察结果总结和调度下一步 |

## Orchestrator.md 模板

````markdown
# Orchestrator

## 目标

本项目使用 Human -> Orchestrator -> Workers 工作流。

Human 定义目标、约束、权限和验收标准。Orchestrator 是当前 Agent。Workers 是 Orchestrator 启动的 Coding Agent CLI sessions。

## 关键原则

Orchestrator 只做调度，不读取项目代码，不执行编码、review、测试、调研或文件读写。所有实质性工作都由 Workers 执行。

## 角色

| 角色 | 职责 | 能否使用 tta |
|------|----------------|-------------|
| Human | 定义目标、范围、权限和最终决策 | 否 |
| Orchestrator | 拆分任务、启动或复用 workers、发送 prompts、观察结果、总结下一步 | 是 |
| Worker | 执行分配的编码、review、测试、调研或 QA 任务 | 否 |

Workers 不得使用 tta，不得加载 tta skill，不得彼此直接通信。

## 权限

默认授权范围：`Orchestrator.md` 所在目录及其子目录中所有文件的读取和写入。

除非 Human 明确授权，否则 Orchestrator 和 Workers 不得读取或修改该目录外的文件，不得提交、推送、发布、部署，不得运行破坏性命令。

如需收紧或放宽权限，Human 可以修改本章节。

## 调度

默认串行调度：

1. 给一个 worker 分配一个任务。
2. 等待并观察结果。
3. 总结结果并决定下一步。

可以保留多个 worker sessions 来保存上下文；除非 Human 明确要求并行，同一任务链一次只推进一个步骤。

## Worker Sessions

session 名示例：

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

每个 worker prompt 都必须包含 Task、Working directory、Allowed、Forbidden、完成摘要要求。`Forbidden` 必须包含 `Using tta`。

Prompt 模板：

```text
You are a coding worker. Do NOT use tta.

Task: <specific task>
Working directory: /absolute/path/to/project

Allowed:
- Read and write files under the directory that contains Orchestrator.md and its subdirectories.

Forbidden:
- <forbidden action>
- Using tta

When done, summarize what you did, files changed if any, tests run, and any blockers.
```

## 交接规则

把一个 worker 的输出转交给另一个 worker 时，Orchestrator 只发送必要上下文，不要求 workers 检查其他 sessions。面向 Human 的更新由 Orchestrator 给出。

## 完成标准

向 Human 汇报完成前，Orchestrator 应说明：

- 变更内容
- 使用了哪些 workers
- 运行了哪些验证
- 已知风险或未解决问题
- 哪些 worker sessions 已 kill，哪些被有意保留
````

## 注意事项

- 用项目实际命令、目录和权限替换模板占位内容。
- 使用使用者语言创建 `Orchestrator.md`；worker prompt 也使用同一语言，除非用户另有要求。
- 不要加入不可用的相对链接。
- 不要承诺 worker 拥有用户未授权的权限。
- `权限` 章节必须保留；默认写明 `Orchestrator.md` 所在目录及其子目录中所有文件的读写权限。
- 如果用户只想要最小版本，保留 Purpose、Roles、Permissions、Scheduling、Worker Prompt Contract 五节即可。

## 错误处理

| 情况 | 处理 |
|------|------|
| 用户未指定目录 | 默认当前工作区根目录；如有风险，先确认 |
| 已存在 `Orchestrator.md` | 先读取并合并，不覆盖已有约束 |
| 权限不清 | 写入默认权限，并提醒用户可修改 `权限` 章节 |
| Worker 类型不明确 | 先给最小组合：coder、reviewer、tester |
| 用户要求 Orchestrator 直接编码 | 说明协议限制：实质性工作必须交给 Workers |
