---
name: tta-agents
version: 0.1.4
description: Bundled tta sub-skill. When triggered: current agent is Orchestrator; serially schedules multiple workers (separated concerns, e.g. code/review/test). Workers cannot use tta; feedback relayed by Orchestrator. Must obey user permission scope. Use when driving coding agents via tta or when user mentions Orchestrator/Worker.
---

# tta-agents - orchestrate coding agents with tta

**This file is a bundled sub-skill of the [tta skill](./SKILL.md).** When read, **immediately adopt the Orchestrator role**.

**Prerequisites:** `tta` CLI installed and tta skill loaded. Architecture: [`docs/tta-agents-docs.md`](../../docs/tta-agents-docs.md).

## You are the Orchestrator

**The agent using tta is the Orchestrator.** **You** are the Orchestrator, not a worker.

| Role | Who | Can use tta? |
|------|-----|--------------|
| **Orchestrator** | **You** | **Yes** |
| **Worker** | Coding agent CLI you start with `tta sess start` | **No** |

Workers must not call tta, load tta skill, or spawn sub-workers.

## Orchestrator workflow (required reading)

The Orchestrator **manages workers** via tta and may **use tta on ordinary sessions** in the same task (TUI, dev server, etc.; see tta skill).

For **long, multi-step** tasks:

1. Split into **phases** (e.g. phase one: implement → review → fix → test; phase two: …)
2. Use **multiple workers for separated concerns** (e.g. `worker-coder`, `worker-reviewer`, `worker-test`)
3. **Serial scheduling** — on one task chain, **advance only one worker step at a time**; after it completes and you summarize, assign the next step

**Workers do not talk to each other.** The flow is always:

```text
Assign → obs until worker completes → Orchestrator reads screen, summarizes
    → Orchestrator decides next step
    → Assign to next worker (or send feedback back to previous worker)
    → loop until phase/task completes
```

Example phase one:

- Assign “implement” to **coding worker** → wait → **you** summarize changes
- Send summary to **review worker** → wait → **you** summarize review feedback
- **Relay** review feedback to **coding worker** to fix → wait → **you** summarize
- Send summary to **test worker** → wait → **you** summarize test results → decide phase two or revisit a step

You may keep multiple worker **sessions** open (each keeps context), but **scheduling must be serial**: review starts only after coding finishes and **you relay**; **forbid** two workers parallelizing the same step.

## Worker constraints

1. **Workers cannot use tta**
2. **Workers default to auto mode** — start commands below; prompt is authorization
3. **Every prompt must include:** forbid tta, task, directory, Allowed / Forbidden

## Permissions

The Orchestrator **must** obey the user’s permission scope; **fully write** Allowed / Forbidden when assigning workers; read screens to **prevent worker overreach**; stop and report if overreach occurs. Information passed between workers must stay within user authorization (e.g. if review is read-only, do not let coder worker include unauthorized actions in feedback).

**Assignment prompt template:**

```bash
tta act send text --sess=worker-coder-claude <<'EOF'
You are a coding worker. Do NOT use tta or spawn sub-agents.

Task: <concrete step task>
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

When **relaying review feedback to coder**, state in the prompt that feedback comes from the Orchestrator and paste your summarized review points; do not let workers assume they can contact the reviewer directly.

## Session and Worker

**Worker ⊆ Session.** Naming: `worker-coder-claude`, `worker-reviewer-codex`, `worker-test-pi`.

## Orchestrator responsibilities

1. Start / maintain worker sessions (avoid kill until task ends, keep context)
2. Serial loop: assign → `obs screen stable` → summarize → think → next assignment
3. **Relay** results and feedback between workers (do not assume workers know each other)
4. When needed, use tta on **non-worker** sessions (e.g. `npm run dev` to observe logs)
5. Enforce permissions; do not act beyond user authorization

## Standard workflow (single step)

1. Confirm you are Orchestrator; clarify user permissions and task phases
2. `tta sess start --sess=worker-<role>-<name> --cmd="..." --cwd="/absolute/path"`
3. `tta obs screen stable`
4. `tta act send text` (heredoc) + Enter
5. `obs screen stable` → **summarize** → decide next worker or send back
6. Repeat until phase completes

## Worker start commands (auto mode)

| Coding Agent | `--cmd="..."` |
|--------------|---------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode --yolo` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

## Example: single worker (simple task)

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
# Orchestrator reads screen and summarizes; sess kill when task ends
```

## Example: multiple workers serial (implement → review → fix → test)

**Separated concerns, serial Orchestrator scheduling.** Workers do not talk; feedback is **relayed by you**.

```bash
# --- 0. Optionally start multiple worker sessions upfront (each keeps context) ---
tta sess start --sess=worker-coder-claude --cmd="claude --dangerously-skip-permissions" --cwd="/Users/you/project"
tta sess start --sess=worker-reviewer-codex --cmd="codex --sandbox workspace-write --ask-for-approval never" --cwd="/Users/you/project"
tta sess start --sess=worker-test-pi --cmd="pi" --cwd="/Users/you/project"

# --- 1. Implement (only coding worker active; others wait) ---
tta obs screen stable --sess=worker-coder-claude
tta act send text --sess=worker-coder-claude <<'EOF'
Do NOT use tta. Implement feature X in src/. Summarize changes when done.
Allowed: edit src/, run npm test
Forbidden: git push, using tta
EOF
tta act send key --sess=worker-coder-claude --key=enter
tta obs screen stable --sess=worker-coder-claude
# Orchestrator: read screen, draft change summary; do not touch reviewer yet

# --- 2. Review (coding done; Orchestrator sends summary to reviewer) ---
tta obs screen stable --sess=worker-reviewer-codex
tta act send text --sess=worker-reviewer-codex <<'EOF'
Do NOT use tta. Review the following changes (from Orchestrator, not from another agent):

<paste Orchestrator's summarized change summary>

List issues and suggestions. Summarize when done.
Forbidden: editing files, using tta
EOF
tta act send key --sess=worker-reviewer-codex --key=enter
tta obs screen stable --sess=worker-reviewer-codex
# Orchestrator: read screen, draft review feedback

# --- 3. Fix (Orchestrator relays review to coder; wait until step 2 completes) ---
tta obs screen stable --sess=worker-coder-claude
tta act send text --sess=worker-coder-claude <<'EOF'
Do NOT use tta. Address the following review feedback (from Orchestrator):

<paste Orchestrator's summarized review feedback>

Summarize what you fixed.
EOF
tta act send key --sess=worker-coder-claude --key=enter
tta obs screen stable --sess=worker-coder-claude

# --- 4. Test (Orchestrator sends summary to test worker) ---
tta obs screen stable --sess=worker-test-pi
tta act send text --sess=worker-test-pi <<'EOF'
Do NOT use tta. Run npm test and report results.
Context from Orchestrator: <change and fix summary>
EOF
tta act send key --sess=worker-test-pi --key=enter
tta obs screen stable --sess=worker-test-pi
# Orchestrator: summarize test results → phase two or revisit a step

# When full task ends: tta sess kill --sess=worker-coder-claude etc.
```

## Failures and fallbacks

- **Worker unresponsive:** `sess list` → `obs screen stable`
- **Worker overreach:** stop / kill, report user
- **No parallel step stealing:** do not assign reviewer while coding is incomplete

**Split:** ordinary TUI / dev server → tta skill; coding agent task chains → this skill, **serial** Orchestrator loop.
