# tta-agents

**tta-agents** is the layer on top of [tta](../README.md) for controlling coding agent CLIs through terminal sessions. It is useful for:

- Start Codex from Claude Code for a review.
- Use Claude Code from Cursor Agent to implement a small change.

For full long-horizon workflows with dedicated coder/reviewer/tester workers, see [`tta-agents-orchestrator.md`](./tta-agents-orchestrator.md).

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

**Clearly tell the agent using tta your permission scope (allowed/forbidden actions, directories, deploy, etc.). The coding agent controlled by tta runs in auto mode and treats prompts as authorization.**
