<div align="center">

<img src="./src/watch-ui/logo.png" alt="terminal-tool-for-agents, abbreviated as tta" width="520">


### **tta: lets agents operate interactive terminals**

[![npm](https://img.shields.io/npm/v/terminal-tool-for-agents.svg)](https://www.npmjs.com/package/terminal-tool-for-agents)

[中文 README](./README.zh.md)

</div>


## What it is

`tta` is a terminal control tool for agents. Your agent can be a coding agent such as Claude Code, or an assistant agent such as OpenClaw. With `tta`, it can interactively open terminal programs, observe the screen, send input, and wait for output to stabilize.

It is useful for tasks that a normal shell cannot finish in one shot: debugging with `pdb`, operating `IPython`, using TUIs such as `lazygit`, or starting another **coding agent** such as Claude Code. See [tta-agents](./docs/tta-agents-docs.md).

If you are still manually operating interactive terminal programs, manually starting multiple coding agents, passing context, assigning tasks, collecting results, or waiting for one agent to finish before assigning the next task, try automating it with `tta`.

Forked from [tui-use](https://github.com/onesuper/tui-use) and modified for `tta`. Thanks to [onesuper](https://github.com/onesuper) for the original work.

## Flexible options

| Mode | Best for | Docs |
|------|----------|------|
| `tta` | Control a single interactive terminal program, such as debugging, menu selection, or viewing dev server output | This README |
| `tta-agents` | Delegate one clear task to another coding agent, such as using Codex for review | [tta-agents](./docs/tta-agents-docs.md) |
| `tta-agents-orchestrator` | Orchestrate multiple coding agents for long-horizon work, such as coding, review, and testing | [tta-agents-orchestrator](./docs/tta-agents-orchestrator.md) |

`tta` is not tied to one agent. Coding agents such as Codex and OpenCode can use it; assistant agents such as OpenClaw and Hermes can use it too, for example to let OpenClaw remotely control Claude Code. The only hard requirement is Node.js.

## Examples

### tta

Let an agent operate an interactive terminal.

<a href="https://youtu.be/7WcIyX3d6qI" target="_blank" rel="noopener noreferrer">
  <img src="./docs/assets/tta.png" alt="tta pdb example video cover" width="720">
</a>

Steps:

1. Install the `tta` CLI and skills using Quick Start below.
2. Tell your agent directly: use `tta` with `pdb` to finish the debugging task.
3. Run `tta sess watch` to observe.

[IPython example](https://youtu.be/6cZgYbIjAM8)

### tta-agents

Let an agent start another coding agent for a task.

<a href="https://youtu.be/J5YDg4BLOVc" target="_blank" rel="noopener noreferrer">
  <img src="./docs/assets/tta-agents.png" alt="tta-agents review example video cover" width="720">
</a>

Steps:

1. Install the `tta` CLI and skills using Quick Start below.
2. Tell your agent directly: use `tta` to start another coding agent for review.
3. Run `tta sess watch` to observe.

**Note: The `tta` Skill uses the input box by default. If you need slash commands, shortcuts, or model switching, tell the agent exactly how to use them.**

### tta-agents-orchestrator

Let multiple coding agents collaborate through `Orchestrator.md`.

<a href="https://youtu.be/umV0VdJ9a8g" target="_blank" rel="noopener noreferrer">
  <img src="./docs/assets/tta-agents-orchestrator.png" alt="tta-agents-orchestrator dev-team example video cover" width="720">
</a>

Steps:

1. Install the `tta` CLI and skills using Quick Start below.
2. Tell your agent to create an `Orchestrator.md`.
3. Ask the agent to strictly follow `Orchestrator.md` and become the Orchestrator.
4. Give the agent the task you want completed.
5. Run `tta sess watch` to observe.

[Orchestrator.md used in the video](https://github.com/yanggggjie/rising-repo/blob/main/Orchestrator.md)

[Why tta-agents?](./docs/why-tta-agents.md)

## Quick Start

**Copy this into your agent to install:**

```text
Install tta CLI:
npm install -g terminal-tool-for-agents

Install tta skills from GitHub:
Use this directory listing:
https://api.github.com/repos/yanggggjie/terminal-tool-for-agents/contents/skills/tta?ref=main

Install every top-level .md skill file in that directory.
Do not install anything under skills/tta/zh/.
Do not hard-code the file list; discover it from the directory listing.

Confirm CLI and all discovered top-level skill files are installed.
```

**Ask your agent to use tta:**

```text
Use tta to run an interactive terminal program and finish the task.
```

**Observe sessions:**

```bash
tta sess watch
```

Then open http://127.0.0.1:7654/.

## Update

Copy this block into your agent:

```text
Update tta CLI:
npm update -g terminal-tool-for-agents

Update tta skills from GitHub:
Use this directory listing:
https://api.github.com/repos/yanggggjie/terminal-tool-for-agents/contents/skills/tta?ref=main

Update every top-level .md skill file in that directory.
Do not install anything under skills/tta/zh/.
Do not hard-code the file list; discover it from the directory listing.

Confirm CLI and all discovered top-level skill files are updated.
```

## API overview

All tta work happens inside a **session** (`--sess=`):

| API | Commands | Role |
|-----|----------|------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | Create, stop, list sessions; human watch UI |
| **act** | `send text`, `send key` | Send input to a **running** session |
| **obs** | `screen now`, `screen stable`, `screen scroll` | Read session screen |

```text
tta sess start -> (tta act ... -> tta obs screen stable)* -> tta sess kill
```

On failure, tta prints one line: `error: <reason>` and exits with code 1.

Full command templates and error handling: [`skills/tta/SKILL.md`](./skills/tta/SKILL.md).

## Requirements

- **Node.js** 22.x–26.x (`engines`: `>=22.0.0 <27.0.0`); repo includes `.nvmrc` (`24`) for local dev
- Install runs `postinstall` automatically: copies node-pty prebuilds into `build/Release` and verifies the PTY works; no manual `approve-scripts` needed

## Development

For local development:

```bash
just install-dev-version
```

Builds, installs the current repo globally; `postinstall` runs `tta sess killall` to stop the old server.

```bash
tta sess list    # verify CLI
tta sess watch   # http://127.0.0.1:7654
```

Restore the published npm release:

```bash
just install-npm-version
```

## License

MIT
