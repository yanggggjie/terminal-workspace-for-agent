---
name: create-tta-agens-orchestrator
version: 0.1.10
description: "Bundled tta sub-skill for creating or updating Orchestrator.md, turning tta-agents into a Human -> Orchestrator -> Workers workflow."
---

# create-tta-agens-orchestrator - Create Orchestrator.md

This file is a bundled sub-skill of the tta skill. Use it when the user wants to create, update, or design `Orchestrator.md`.

Goal: write executable project guidance so the current agent acts as Orchestrator and uses tta to start and manage Coding Agent Workers.

## Core Protocol

`Orchestrator.md` must make clear:

1. Human defines the goal, boundaries, permissions, and acceptance criteria.
2. Orchestrator only schedules. It does not read project code or perform coding, testing, review, research, or file reads/writes.
3. Workers execute concrete tasks. They must not use tta, must not load the tta skill, and must not communicate directly with each other.
4. Default scheduling is serial: assign -> wait -> observe -> summarize -> decide the next step.
5. Multiple worker sessions may stay open to preserve context, but one task chain advances one step at a time by default.
6. A `Permissions` section is required. Default permissions are read/write access to the directory containing `Orchestrator.md` and its subdirectories.

## Creation Steps

1. Confirm the target project directory for `Orchestrator.md`; if the user did not specify one, default to the workspace root.
2. Confirm which Workers are needed, such as coder, reviewer, tester, researcher, or browser-qa.
3. Write the template below and replace placeholders with project-specific details.
4. Keep the file self-contained; do not depend on README, docs, or external links.
5. If the file already exists, read it first and update it without overwriting existing constraints.
6. After creating or updating it, remind the user that default permissions can be tightened or expanded in the `Permissions` section.

## API Table

| API | Use in Orchestrator | Note |
|-----|---------------------|------|
| `sess` | Start, reuse, and close Worker sessions | Suggested session name: `worker-<role>-<agent>` |
| `act` | Send prompts or keys to Workers | Prompts must include task, directory, Allowed, and Forbidden |
| `obs` | Observe Worker output | Orchestrator summarizes observations and schedules the next step |

## Orchestrator.md Template

````markdown
# Orchestrator

## Purpose

This project uses a Human -> Orchestrator -> Workers workflow.

Human defines the goal, constraints, permissions, and acceptance criteria. Orchestrator is the current agent. Workers are Coding Agent CLI sessions started by Orchestrator.

## Key Principles

Orchestrator only schedules. It does not read project code or perform coding, review, testing, research, or file reads/writes. All substantive work is done by Workers.

## Roles

| Role | Responsibility | May use tta |
|------|----------------|-------------|
| Human | Defines goal, scope, permissions, and final decisions | No |
| Orchestrator | Decomposes tasks, starts or reuses workers, sends prompts, observes results, and summarizes next steps | Yes |
| Worker | Executes assigned coding, review, testing, research, or QA tasks | No |

Workers must not use tta, must not load tta skill, and must not communicate directly with each other.

## Permissions

Default authorization scope: read and write all files under the directory that contains `Orchestrator.md` and its subdirectories.

Unless Human explicitly authorizes it, Orchestrator and Workers must not read or modify files outside that directory, commit, push, publish, deploy, or run destructive commands.

Human can edit this section to tighten or expand permissions.

## Scheduling

Default to serial scheduling:

1. Assign one task to one worker.
2. Wait and observe the result.
3. Summarize the result and decide the next step.

Multiple worker sessions may stay open to preserve context, but one task chain should advance one step at a time unless Human explicitly asks for parallel work.

## Worker Sessions

Session name examples:

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

Every worker prompt must include Task, Working directory, Allowed, Forbidden, and completion summary requirements. `Forbidden` must include `Using tta`.

Prompt template:

```text
You are a coding worker. Do NOT use tta.

Task: <specific task>
Working directory: /absolute/path/to/project

Allowed:
- Read and write files under the directory that contains Orchestrator.md and its subdirectories.

Forbidden:
- <forbidden action>
- Using tta

When done, summarize what you did, files changed if any, tests run, and any blockers.
```

## Handoff Rules

When passing output from one worker to another, Orchestrator sends only necessary context and does not ask workers to inspect other sessions. Human-facing updates come from Orchestrator.

## Completion

Before reporting completion to Human, Orchestrator should state:

- What changed
- Which workers were used
- What validation ran
- Known risks or unresolved questions
- Which worker sessions were killed or intentionally kept
````

## Notes

- Replace template placeholders with real project commands, directories, and permissions.
- Create `Orchestrator.md` in the user's language; Worker prompts use the same language unless the user asks otherwise.
- Do not add unusable relative links.
- Do not grant workers permissions the user did not authorize.
- Keep the `Permissions` section. By default, it must state read/write access to the directory containing `Orchestrator.md` and its subdirectories.
- If the user wants a minimal version, keep only Purpose, Roles, Permissions, Scheduling, and Worker Prompt Contract.

## Error Handling

| Situation | Handling |
|-----------|----------|
| User did not specify a directory | Default to the workspace root; ask first if there is risk |
| `Orchestrator.md` already exists | Read and merge it; do not overwrite existing constraints |
| Permissions are unclear | Write the default permissions and remind the user they can edit `Permissions` |
| Worker types are unclear | Start with the minimal set: coder, reviewer, tester |
| User asks Orchestrator to code directly | Explain the protocol limit: substantive work must go to Workers |
