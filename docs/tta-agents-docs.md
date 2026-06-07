# tta-agents

**tta-agents** is an application pattern on top of [tta](../README.md): **Orchestrator + Workers** to coordinate multiple coding agents.

- **tta** (infrastructure) — Session, `sess` / `act` / `obs`, for any interactive terminal
- **tta-agents** (application layer, **bundled tta sub-skill**) — run coding agent workers in sessions, **serially** scheduled by the Orchestrator

`skills/tta/tta-agents-skill.md` ships **with** `skills/tta/SKILL.md` — **no separate install**. Only when the user wants tta to drive coding agents should the agent load and follow [`tta-agents-skill.md`](../skills/tta/tta-agents-skill.md). API basics: [`SKILL.md`](../skills/tta/SKILL.md).

---

**If you have permission requirements, tell the Orchestrator clearly and completely** (e.g. allowed/forbidden actions, directories that may be changed, network/install/git push/deploy, etc.). The Orchestrator writes that scope into worker prompts; workers default to **auto mode (no confirmation)** and treat prompts as authorization.

---

## How the Orchestrator works (core)

**Orchestrator = the agent currently using tta.** It:

1. **Manages workers** — `tta sess start` for worker sessions, assign work, read screens, **serially** schedule the task chain
2. **May also use tta on other sessions** — TUI, wizards, `npm run dev`, etc. (per tta skill, not workers)
3. **Runs tasks serially** — long multi-step work is split into phases; **only one worker step advances at a time**, then switch to the next worker or send feedback back

**Workers do not talk to each other.** The previous worker’s outcome is **read and summarized by the Orchestrator**, who **thinks**, then puts the summary/feedback **into the next worker’s prompt**. Review notes, test results, etc. always go through the Orchestrator.

### Serial scheduling loop

```text
Assign to Worker A → obs until done → Orchestrator reads screen and summarizes
    → Orchestrator decides next step
    → Assign to Worker B (or send feedback back to Worker A)
    → obs until done → …
    → until phase / full task completes
```

### Multi-step example (phase one)

| Step | Worker (focus) | Orchestrator |
|------|----------------|--------------|
| 1. Implement | `worker-coder` | Assign dev task → wait → **summarize diff/changes** |
| 2. Review | `worker-reviewer` | Send summary to reviewer → wait → **summarize review feedback** |
| 3. Fix | `worker-coder` (same session, keep context) | **Relay** review feedback to coder → wait → summarize |
| 4. Test | `worker-test` | Send change summary to test worker → wait → summarize test results |

Phase two, three, … same pattern. **Multiple workers separate concerns** (write / review / test), but **scheduling is serial**: no review until coder finishes; coder continues only after review completes and the Orchestrator relays feedback.

You may keep multiple worker **sessions** open (e.g. coder and reviewer), but **do not** have two workers parallelize the same step.

## Roles

| Role | Who | Can use tta? |
|------|-----|--------------|
| **Orchestrator** | **The agent using tta** | **Yes** |
| **Worker** | Coding agent CLI started by Orchestrator | **No** |

## Session and Worker

| Concept | What | How |
|---------|------|-----|
| **Session** | PTY-backed terminal instance | `tta sess start/kill/list`, `--sess=` |
| **Worker** | Session used to run a coding agent (auto mode) | `tta sess start --sess=worker-<role>-<name> ...` |

**Worker ⊆ Session.** Naming: `worker-coder-claude`, `worker-reviewer-codex`, `worker-test-pi`.

## Worker start commands (auto mode)

| Coding Agent | auto mode command |
|--------------|-------------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --sandbox workspace-write --ask-for-approval never` |
| Cursor Agent | `agent --yolo --sandbox disabled` |
| OpenCode | `opencode --yolo` |
| Pi | `pi` |
| Kimi Code | `kimi --auto` |

Details, permissions, prompt templates: [`tta-agents-skill.md`](../skills/tta/tta-agents-skill.md).

## Example: phase one (write → review → fix → test)

Orchestrator schedules serially; logical order, not parallel:

```text
1. worker-coder: implement feature → Orchestrator summarizes changes
2. worker-reviewer: review from Orchestrator’s summary → Orchestrator summarizes feedback
3. worker-coder: Orchestrator relays review feedback, coder fixes → Orchestrator summarizes
4. worker-test: Orchestrator sends summary, run tests → Orchestrator summarizes results
5. If pass, phase two; else Orchestrator decides which step to revisit
```

## When to trigger

- User wants tta to orchestrate coding agent CLIs
- User mentions Orchestrator, Worker, multi-agent collaboration, write/review/test split

TUI, wizards, dev servers, etc. **do not** trigger tta-agents — tta skill alone is enough.
