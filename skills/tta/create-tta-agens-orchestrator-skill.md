---
name: create-tta-agens-orchestrator
version: 0.1.10
description: "Bundled tta sub-skill for creating or updating Orchestrator.md, turning tta-agents into a Human -> Orchestrator -> Workers project workflow. Use when the user mentions creating Orchestrator.md, orchestrator, workers orchestration, multi-agent collaboration, or managing coding agents with tta."
---

# create-tta-agens-orchestrator - Create Orchestrator.md

**This file is a bundled sub-skill of the tta skill.**

Use it when the user wants to create, update, or design `Orchestrator.md`. The goal is to write executable orchestration guidance inside a project so the current agent acts as Orchestrator and uses tta to start and manage multiple Coding Agent Workers.

## Core Protocol

`Orchestrator.md` must make clear:

1. Human defines the goal, boundaries, permissions, and acceptance criteria.
2. Orchestrator is the current agent using tta. It decomposes tasks, starts or reuses worker sessions, sends prompts, observes results, summarizes, and decides the next step.
3. Workers are coding agent CLIs started by Orchestrator. They execute concrete coding, review, testing, research, or QA tasks.
4. Workers must not use tta, must not load the tta skill, and must not communicate directly with each other.
5. Orchestrator defaults to serial scheduling: assign to one worker -> wait and observe completion -> summarize -> decide the next step.
6. Multiple worker sessions may stay open to preserve context, but one task chain should advance one step at a time by default.

## Creation Steps

1. Confirm the target project directory for `Orchestrator.md`; if the user did not specify one, default to the workspace root.
2. Learn which worker types the user wants, such as coder, reviewer, tester, researcher, or browser-qa.
3. Write the template below and replace placeholders with project-specific details.
4. Keep `Orchestrator.md` self-contained; do not depend on README, docs, or external relative links.
5. If the file already exists, read the current content first and update it for the user's goal without overwriting existing constraints.

## Orchestrator.md Template

````markdown
# Orchestrator

## Purpose

This project uses a Human -> Orchestrator -> Workers workflow.

Human defines the goal, constraints, permissions, and acceptance criteria.
Orchestrator is the current agent using tta.
Workers are coding agent CLI sessions started by Orchestrator.

## Roles

| Role | Responsibility | May use tta |
|------|----------------|-------------|
| Human | Defines goal, scope, permissions, and final decisions | No |
| Orchestrator | Plans work, starts/reuses workers, sends prompts, observes results, summarizes next steps | Yes |
| Worker | Executes assigned coding, review, testing, research, or QA tasks | No |

Workers must not use tta, must not load tta skill, and must not communicate directly with each other.

## Scheduling

Default to serial scheduling:

1. Assign one task to one worker.
2. Wait for completion and observe the result.
3. Summarize the result.
4. Decide whether to continue with the same worker, send context to another worker, or report to Human.

Multiple worker sessions may stay open to preserve context, but one task chain should advance one step at a time unless Human explicitly asks for parallel work.

## Worker Sessions

Use session names like:

- `worker-coder-codex`
- `worker-review-claude`
- `worker-test-cursor`
- `worker-research-opencode`

Start workers with the least permissions sufficient for the task.

Example commands:

```bash
tta sess start --sess=worker-coder-codex --cmd="codex --sandbox workspace-write --ask-for-approval never" --cwd="/absolute/path/to/project"
tta sess start --sess=worker-review-claude --cmd="claude --dangerously-skip-permissions" --cwd="/absolute/path/to/project"
tta sess start --sess=worker-test-cursor --cmd="agent --yolo --sandbox disabled" --cwd="/absolute/path/to/project"
```

## Worker Prompt Contract

Every worker prompt must include:

- Task
- Working directory
- Allowed actions
- Forbidden actions
- Completion summary requirements

`Forbidden` must include `Using tta`.

Prompt template:

```text
You are a coding worker. Do NOT use tta.

Task: <specific task>
Working directory: /absolute/path/to/project

Allowed:
- <allowed action>

Forbidden:
- <forbidden action>
- Using tta

When done, summarize what you did, files changed if any, tests run, and any blockers.
```

## Handoff Rules

When passing output from one worker to another:

1. Orchestrator summarizes the relevant result.
2. Orchestrator sends only necessary context to the next worker.
3. Workers should not be asked to inspect other worker sessions.
4. Human-facing updates come from Orchestrator, not directly from workers.

## Completion

Before reporting completion to Human, Orchestrator should state:

- What changed
- Which workers were used
- What validation ran
- Known risks or unresolved questions
- Which worker sessions were killed or intentionally kept
````

## Writing Requirements

- Replace template placeholders with real project commands, directories, and permissions.
- If the user did not ask for another language, write `Orchestrator.md` in the user's current language.
- Do not add unusable relative links to `Orchestrator.md`.
- Do not grant workers permissions the user did not authorize.
- If the user wants a minimal version, keep only Purpose, Roles, Scheduling, and Worker Prompt Contract.
