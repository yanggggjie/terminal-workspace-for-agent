# tta-agents

**tta-agents** is the layer on top of [tta](../README.md): it lets the current agent start, observe, and manage another coding agent CLI through tta.

It is useful for temporarily delegating one clear task, for example:

- Start Codex from Claude Code for a review.
- Use Claude Code from Cursor Agent to implement a small change.
- Ask one worker to run tests, research an issue, or validate an approach.

For long-horizon workflows that turn coder / reviewer / tester into a fixed process, see [tta-agents-orchestrator](./tta-agents-orchestrator.md).

## Basic workflow

```text
start Worker session -> observe initial screen -> send task prompt -> wait until done -> summarize -> kill or keep session
```

The current agent is the Controller: it assigns work and summarizes results. The coding agent started by tta is the Worker: it only executes the concrete task it was given.

A Worker prompt should include at least:

- `Task`: the concrete task to complete.
- `Working directory`: the working directory.
- `Allowed`: allowed actions.
- `Forbidden`: forbidden actions, which must include `Using tta`.
- A summary requirement for completion.

## Permissions

**Clearly tell the agent using tta your permission scope (allowed/forbidden actions, directories, deploy, etc.). The coding agent controlled by tta runs in auto mode and treats prompts as authorization.**

Full command templates, Worker startup commands, and error handling: [`skills/tta/tta-agents-skill.md`](../skills/tta/tta-agents-skill.md).
