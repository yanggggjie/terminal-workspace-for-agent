---
name: tta-agents
version: 0.1.9
description: "Bundled tta sub-skill for driving coding agent CLIs through tta sessions. The current agent is the controller; workers are coding agent CLIs and must not use tta. Include task, working directory, Allowed, and Forbidden in worker prompts. For full Orchestrator/Workers workflows, follow the orchestrator docs."
---

# tta-agents - control coding agents with tta

**This file is a bundled sub-skill of the [tta skill](./SKILL.md).**

Use it when the user wants tta to run or control a coding agent CLI. Architecture: [`docs/tta-agents-docs.md`](../../docs/tta-agents-docs.md). Full Orchestrator / Workers workflows: [`docs/tta-agents-orchestrator.md`](../../docs/tta-agents-orchestrator.md).

## Roles

| Role | Who | Can use tta? |
|------|-----|--------------|
| **Controller** | **You**, the current agent using tta | **Yes** |
| **Worker** | Coding agent CLI you start with `tta sess start` | **No** |

Workers must not call tta or load tta skill. Write that rule into every worker prompt.

## Required rules

1. Use base tta rules for all `sess`, `act`, and `obs` commands.
2. Worker prompts must include task, working directory, `Allowed`, and `Forbidden`.
3. Always include `Using tta` in `Forbidden`.
4. Treat worker prompts as authorization; do not grant permissions the user did not grant.
5. Observe worker screens after every action and summarize results yourself.
6. Kill one-off worker sessions when done; keep long-lived worker sessions only while their context is useful.

## Standard workflow

1. Choose a worker session name: `worker-<role>-<agent>`, e.g. `worker-review-codex`.
2. Start the coding agent CLI with `tta sess start`.
3. Read the initial screen with `tta obs screen stable`.
4. Send a quoted heredoc prompt with `tta act send text`, then Enter.
5. Wait with `tta obs screen stable`.
6. Summarize the worker output for the user or for the next step.
7. Kill or keep the session based on whether follow-up context is needed.

## Worker start commands (auto mode)

| Coding Agent | `--cmd="..."` |
|--------------|---------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode --yolo` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

Use the least permissive command that satisfies the task and user authorization.

## Prompt template

```bash
tta act send text --sess=worker-review-codex <<'EOF'
You are a coding worker. Do NOT use tta.

Task: <concrete task>
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

## Example

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
# Read the worker result, summarize it, then kill if no follow-up is needed.
```

