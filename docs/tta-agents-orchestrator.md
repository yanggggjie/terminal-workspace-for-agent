# tta-agents-orchestrator

**tta-agents-orchestrator** is a workflow pattern built on top of tta-agents:

> **Human -> Orchestrator -> Workers**

The human defines the goal and the workflow contract. The Orchestrator breaks work into steps, starts or reuses worker sessions, assigns tasks, observes results, and relays information between workers. Workers do the concrete execution: coding, review, testing, research, browser automation, and so on.

This is not required for simple tta-agents usage. If you only want Claude Code to ask Codex for a review, use [`tta-agents-docs.md`](./tta-agents-docs.md).

## Why this is needed

### Compared to subagents

Subagents can ease context pressure, but they are often not observable while they run. With tta, the Orchestrator can call `tta obs` to see worker state and output.

A tta worker is also a complete coding agent session. It can keep long-lived context across multiple prompts, which makes it useful for longer task chains.

### Compared to SDK integrations

Different coding agents expose different SDKs and APIs. Orchestrator workflows use the terminal interface instead, which keeps the integration generic across agents.

### Compared to tmux, cmux, and herdr

tmux, cmux, and herdr are useful terminal and agent control tools. tta-agents-orchestrator focuses on **agents using agents**: the human mostly observes with `tta sess watch`, and the Orchestrator manages the worker loop.

## Core protocol

1. The Orchestrator is the current agent using tta.
2. Workers are coding agent CLIs started in tta sessions.
3. Workers must not use tta.
4. Workers do not talk to each other.
5. The Orchestrator serially assigns work, observes completion, summarizes results, and decides the next step.
6. Every worker prompt includes the task, working directory, `Allowed`, and `Forbidden`.

Serial scheduling is the default:

```text
assign to worker A -> observe until done -> summarize
    -> decide next step
    -> assign to worker B or send feedback back to worker A
    -> observe until done
    -> repeat until phase or task completes
```

You may keep multiple worker sessions open so each one retains context, but only one step in the same task chain should be active at a time.

## Example phase

| Step | Worker | Orchestrator action |
|------|--------|---------------------|
| 1. Implement | `worker-coder-claude` | Assign development task, wait, summarize changes |
| 2. Review | `worker-reviewer-codex` | Send the Orchestrator's change summary, wait, summarize findings |
| 3. Fix | `worker-coder-claude` | Relay summarized review feedback, wait, summarize fixes |
| 4. Test | `worker-test-pi` | Send change/fix summary, wait, summarize test result |

The reviewer does not talk to the coder. The Orchestrator reads the reviewer output, thinks, then writes a summarized prompt back to the coder.

## Orchestrator.md template

```markdown
# Orchestrator

## Goal

<What the human wants done.>

## Permissions

Allowed:
- <operations allowed by the human>

Forbidden:
- <operations forbidden by the human>
- Using tta from any worker

## Workers

- `worker-coder-claude`: implementation
- `worker-reviewer-codex`: review
- `worker-test-pi`: tests and verification

## Scheduling Rules

1. Advance one worker step at a time.
2. After every worker step, observe the screen and summarize the result.
3. Relay information through the Orchestrator; workers do not communicate directly.
4. If a worker exceeds permission scope, stop it and report to the human.
5. Keep worker sessions alive while their context is useful; kill them when the workflow ends.

## Phase 1

1. Ask coder to implement.
2. Summarize coder changes.
3. Ask reviewer to review from the summary and relevant files.
4. Summarize reviewer findings.
5. Ask coder to fix accepted findings.
6. Ask tester to run verification.
7. Report result or start the next phase.
```

## Boundaries

Best for long-running, multi-step work where separation of concerns helps stability. It is too heavy for one-off tasks where a single coding agent call is enough.
