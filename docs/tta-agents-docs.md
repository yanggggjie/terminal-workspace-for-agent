# tta-agents

**tta-agents** is the layer on top of [tta](../README.md) for controlling coding agent CLIs through terminal sessions.

It is useful even when you only want one agent to briefly use another agent, for example:

- Use Codex from Claude Code for a focused review.
- Use Claude Code from Cursor Agent to implement a small change.
- Keep a long-running coding agent session and ask it follow-up questions later.

For full long-horizon workflows with dedicated coder/reviewer/tester workers, see [`tta-agents-orchestrator.md`](./tta-agents-orchestrator.md).

## Layers

| Layer | Purpose | Content |
|-------|---------|---------|
| **tta** | Generic terminal control | CLI, `sess` / `act` / `obs`, base skill, base docs |
| **tta-agents** | Control coding agent CLIs with tta | bundled sub-skill and this doc |
| **tta-agents-orchestrator** | Full workflow pattern | Orchestrator / Workers example and protocol |

`skills/tta/tta-agents-skill.md` ships **with** `skills/tta/SKILL.md` — **no separate install**. Load it only when the user wants tta to drive coding agent CLIs. API basics stay in [`SKILL.md`](../skills/tta/SKILL.md).

## Why use tta for coding agents

### TUI is the common interface

Coding agents expose very different SDKs, command flags, permission models, and streaming APIs. Their terminal interfaces are much more similar: start the CLI, type a prompt, wait, read the screen, continue.

tta uses that common TUI surface instead of trying to build a unified SDK abstraction.

### Observable by default

The controlling agent can call `tta obs screen stable` to see what the worker is doing and what it returned. A human can also use `tta sess watch` to observe sessions.

This differs from many subagent systems where execution is hidden until the final result.

### Cross-agent by design

Because tta controls the terminal, it can drive any coding agent CLI that works in a PTY: Claude Code, Codex, Cursor Agent, OpenCode, Pi, Kimi Code, and others.

### No SDK integration required

tta-agents does not require provider-specific SDK code. It works with the same commands a human would run in a terminal.

## Roles

| Role | Who | Can use tta? |
|------|-----|--------------|
| **Controller** | The current agent using tta | **Yes** |
| **Worker** | Coding agent CLI started in a tta session | **No** |

Workers are ordinary tta sessions that happen to run coding agent CLIs. Worker prompts must say `Do NOT use tta`.

For a complete Orchestrator / Workers workflow, the controller becomes the Orchestrator. That stronger protocol is documented in [`tta-agents-orchestrator.md`](./tta-agents-orchestrator.md).

## Basic workflow

```text
start worker session -> observe screen -> send prompt -> observe until done -> summarize -> kill or keep session
```

Example: use Codex from another agent for review.

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

## Permissions

Workers often run in auto mode. Treat each prompt as an authorization boundary:

- Include the task and working directory.
- Include explicit `Allowed` and `Forbidden` sections.
- Always forbid `Using tta`.
- If the worker exceeds the scope, stop it and report back to the user.

## Worker start commands

| Coding Agent | auto mode command |
|--------------|-------------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode --yolo` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

Use the least permissive command that still fits the task and user authorization.

## When to trigger

- User wants to run or control a coding agent CLI through tta.
- User asks one coding agent to use another coding agent.
- User mentions workers, multi-agent review, coding/review/test split, or Orchestrator.

TUI, setup wizards, dev servers, and REPLs that are not coding agents use only the base tta skill.
