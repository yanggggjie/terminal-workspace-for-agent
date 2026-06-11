# Why tta-agents?

## Can multiple coding agents run in parallel?

Yes. `tta obs screen now` returns immediately, which makes it useful for polling the current state of multiple sessions. `tta obs screen stable` waits until the screen is stable, which is better when you want to wait for one Worker to finish.

For long tasks, the recommended default is blocking observation: assign one task, wait for completion, summarize the result, then decide the next step.

## How is this different from subagents?

They operate at different layers. Subagents are good at reducing the main agent's context load. They are usually short-lived, single-task workers without continuous context.

tta-agents is an application-level organization pattern: the current agent can start another full coding agent CLI, observe its screen output through tta, keep its session context, and continue assigning tasks when needed. A coding agent started by tta-agents can still use subagents inside its own environment.

It also lets you combine strengths across different harnesses: use Claude Code for day-to-day coding, Codex for review, Pi for browser or extension-heavy tasks, and Kimi Code for fast exploration.

## Why use a TUI instead of a unified SDK?

Different coding agents have very different SDKs, abstraction levels, and permission models. Designing one unified SDK abstraction for all of them would be heavy and likely to lag behind product changes.

TUIs are more consistent: start a command, send input, read the screen. tta controls that terminal layer, so one agent can use another agent in almost the same way a human uses a CLI. When humans need to observe, `tta sess watch` shows the same session directly.

## How is this different from tmux, cmux, or herdr?

tmux, cmux, and herdr are all strong terminal or multi-agent control tools. tta has a narrower goal: let agents reliably control interactive terminals through an API, especially coding agent CLIs.

In other words, tta-agents is not a general terminal workspace. It is a lightweight protocol for agent-controlled agents.

## What exactly is tta-agents-orchestrator?

It is a separation-of-concerns practice:

- The Orchestrator only schedules: break down tasks, assign work, observe, summarize, and decide the next step.
- Workers do the concrete work: coding, review, testing, research, browser automation, and so on.
- Each Worker can keep its own context. Even if a Worker context becomes complex, the Orchestrator can use a new prompt to bring it back to the goal and boundaries.

See [tta-agents-orchestrator](./tta-agents-orchestrator.md) for details.
