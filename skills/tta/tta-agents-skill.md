---
name: tta-agents
version: 0.1.12
description: "Bundled tta sub-skill for driving Coding Agent CLIs through tta sessions. The current agent is the Controller; Workers are launched Coding Agent CLIs and must not use tta. Worker prompts must include task, working directory, Allowed, and Forbidden."
---

# tta-agents - control coding agents with tta

This file is a bundled sub-skill of the tta skill. Use it when the user wants tta to run or control a Coding Agent CLI.

When creating, updating, or designing `Orchestrator.md`, read `create-tta-agens-orchestrator-skill.md` instead.

## Architecture

tta-agents uses the current agent as the Controller. The Controller starts and observes Coding Agent CLI Workers through tta. Workers do concrete work; the Controller assigns, observes, and summarizes.

## API Table

| API | Purpose | Rule |
|-----|---------|------|
| `sess` | Start, keep, or close Worker sessions | Kill one-shot Workers when done; keep only when context is useful |
| `act` | Send prompts or keys to Workers | Send prompts with quoted heredocs; send `enter` when needed |
| `obs` | Read Worker screens | Observe after every `act`; Controller summarizes results |

## Roles

| Role | Who | Can use tta? |
|------|-----|--------------|
| Controller | Current agent | Yes |
| Worker | Coding Agent CLI started with `tta sess start` | No |

Workers must not call tta or load the tta skill. State this rule in every Worker prompt.

## Standard workflow

1. Choose a session name: `worker-<role>-<agent>`, such as `worker-review-codex`.
2. Start the Coding Agent CLI with `tta sess start`.
3. Read the initial screen with `tta obs screen stable`.
4. Send the prompt with `tta act send text`.
5. Send `enter` if needed.
6. Wait for results with `tta obs screen stable`.
7. Controller summarizes the Worker output.
8. Kill or keep the session based on whether context is still useful.

## Worker Start Commands

| Coding Agent | `--cmd="..."` |
|--------------|---------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

When the task allows it, use the least permissive command.

## Prompt Template

```bash
tta act send text --sess=worker-review-codex <<'EOF'
You are a coding worker. Do NOT use tta.

Task: <specific task>
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

## Notes

- All `sess`, `act`, and `obs` commands still follow the base tta skill.
- Worker prompts must include the task, working directory, `Allowed`, and `Forbidden`.
- `Forbidden` must include `Using tta`.
- A prompt is authorization; do not grant permissions the user did not grant.
- Prompts use the user's language unless the user explicitly asks for another language.
- Read the screen after every action. The Controller summarizes results instead of directly relaying unchecked screen fragments.

## Error Handling

| Situation | Handling |
|-----------|----------|
| Worker does not respond | Confirm state with `obs screen stable`; send `enter` if needed |
| Worker reports insufficient permissions | Do not expand permissions yourself; ask the user or resend a smaller task |
| Worker tries to use tta | Send a correction prompt and restate `Forbidden: Using tta` |
| Worker has exited | Read final output with `obs`, then `sess kill` |
| Output is incomplete | Continue `obs screen stable` or ask the Worker to summarize current state |

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
```
