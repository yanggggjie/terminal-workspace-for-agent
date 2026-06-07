# tta-agents

**tta-agents** 是在 [tta](../README.zh.md) 之上，用 **Orchestrator + Workers** 组织多个 Coding Agent 的应用模式。

- **tta**（基础设施）— Session、`sess` / `act` / `obs`，操作任意交互式终端
- **tta-agents**（应用层，**tta skill 内置子 skill**）— 在 Session 里跑 Coding Agent Worker，由 Orchestrator **串行**调度

`skills/tta/tta-agents-skill.zh.md` 与 `skills/tta/SKILL.zh.md` **一并提供，无需单独安装**。仅当用户要用 tta 操作 Coding Agent 时，Agent 才触发并遵循 [`tta-agents-skill.zh.md`](../skills/tta/tta-agents-skill.zh.md)。API 基础见 [`SKILL.zh.md`](../skills/tta/SKILL.zh.md)。

---

**如果你对权限有要求，请清晰、完整地告知 Orchestrator 权限范围**（例如：允许/禁止的操作、可改动的目录、能否联网/安装依赖/执行 git push/deploy 等）。Orchestrator 会把该范围写入 Worker 的 prompt；Worker 默认 **auto 模式（不确认）**，会把 prompt 当作授权执行。

---

## Orchestrator 怎么工作（核心）

**Orchestrator = 正在使用 tta 的 Agent。** 它负责：

1. **管理 Worker** — 用 `tta sess start` 开启 Worker session，派活、读屏、在任务链上串行调度
2. **同时可使用 tta 操作其他 session** — TUI、安装向导、`npm run dev` 等（按 tta skill，非 Worker）
3. **串行执行任务** — 长久、多步任务拆成若干阶段；**同一时刻只推进一个 Worker 上的当前步骤**，完成后再切到下一个 Worker 或回传

**Worker 之间不直接通信。** 上一个 Worker 的结果由 Orchestrator **读屏、总结**，Orchestrator **思考后**再把摘要/反馈 **写进下一个 Worker 的 prompt**。Review 意见、测试结果等，一律经 Orchestrator 转述。

### 串行调度循环

```text
派活给 Worker A → obs 等待完成 → Orchestrator 读屏并总结
    → Orchestrator 思考下一步
    → 派活给 Worker B（或把反馈派回 Worker A）
    → obs 等待完成 → …
    → 直至本阶段 / 全任务完成
```

### 多步任务示例（阶段一）

| 步骤 | Worker（关注点） | Orchestrator 做什么 |
|------|------------------|---------------------|
| 1. 写代码 | `worker-coder` | 派开发任务 → 等待完成 → **总结 diff/变更** |
| 2. Review | `worker-reviewer` | 把总结发给 reviewer → 等待 → **总结 review 意见** |
| 3. 修改 | `worker-coder`（同 session 保留上下文） | 把 review 意见**转述**给 coder → 等待 → 总结 |
| 4. 测试 | `worker-test` | 把变更摘要发给 test worker → 等待 → 总结测试结果 |

阶段二、三… 同理。**多个 Worker 用于关注点分离**（写 / review / 测），但**调度是串行的**：coder 未完成前不启动 review；review 完成且 Orchestrator 转述反馈后，coder 才继续改。

可同时保留多个 Worker **session**（如 coder、reviewer 各一个），但**不要**让两个 Worker 在同一任务步骤上并行抢做同一件事。

## 角色

| 角色 | 是谁 | 能否用 tta |
|------|------|------------|
| **Orchestrator** | **正在使用 tta 的 Agent** | **能** |
| **Worker** | Orchestrator 拉起的 Coding Agent CLI | **不能** |

## Session 与 Worker

| 概念 | 是什么 | 怎么用 |
|------|--------|--------|
| **Session** | PTY 后台终端实例 | `tta sess start/kill/list`，`--sess=` |
| **Worker** | Session 的一种用法：跑 Coding Agent（auto 模式） | `tta sess start --sess=worker-<角色>-<name> ...` |

**Worker ⊆ Session。** 命名示例：`worker-coder-claude`、`worker-reviewer-codex`、`worker-test-pi`。

## Worker 启动命令（auto 模式）

| Coding Agent | auto 模式命令 |
|--------------|---------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode --yolo` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

操作细节、权限、prompt 模板见 [`tta-agents-skill.zh.md`](../skills/tta/tta-agents-skill.zh.md)。

## 示例：阶段一（写 → Review → 改 → 测）

Orchestrator 串行调度；下列是逻辑顺序，不是并行：

```text
1. worker-coder：实现功能 → Orchestrator 总结变更
2. worker-reviewer：根据 Orchestrator 提供的总结做 review → Orchestrator 总结意见
3. worker-coder：Orchestrator 转述 review 意见，请 coder 修改 → Orchestrator 总结
4. worker-test：Orchestrator 提供摘要，请跑测试 → Orchestrator 总结结果
5. 若通过则进入阶段二；否则 Orchestrator 决定回哪一步
```

## 何时触发

- 用户要用 tta 编排 Coding Agent CLI
- 用户提到 Orchestrator、Worker、多 Agent 协作、写代码/review/测试分工

TUI、向导、dev server 等 **不触发** tta-agents，只按 tta skill 即可。
