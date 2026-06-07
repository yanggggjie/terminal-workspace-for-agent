# tta-agents-orchestrator

**tta-agents-orchestrator** is a workflow pattern built on top of tta-agents:

> **Human -> Orchestrator -> Workers**

The human defines the goal and the workflow contract. The Orchestrator breaks work into steps, starts or reuses worker sessions, assigns tasks, observes results, and relays information between workers. Workers do the concrete execution: coding, review, testing, research, browser automation, and so on.

## Core protocol

1. The Orchestrator is the current agent using tta.
2. Workers are coding agents started by the Orchestrator. Workers must not use tta. Workers do not talk to each other.
3. The Orchestrator serially assigns work, observes completion, summarizes results, and decides the next step.

Use serial scheduling:

```text
assign to worker A -> observe until done -> summarize
    -> decide next step
    -> assign to worker B or send feedback back to worker A
    -> observe until done
    -> repeat until phase or task completes
```

You may keep multiple worker sessions open so each one retains context, but only one step in the same task chain should be active at a time.
