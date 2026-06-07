<div align="center">

<img src="./src/watch-ui/logo.png" alt="terminal-tool-for-agents, abbreviated as tta" width="520">


### **tta: a terminal tool for agents — lets agents operate interactive terminals.**

[![npm](https://img.shields.io/npm/v/terminal-tool-for-agents.svg)](https://www.npmjs.com/package/terminal-tool-for-agents)

[中文 README](./README.zh.md)

</div>


## What it is

`tta` is for agents. It drives interactive terminal programs: REPLs (e.g. `GDB`, `IPython`), TUIs (e.g. `lazygit`), setup wizards (e.g. `npm create vite`), long-running processes you observe over time (e.g. `npm run dev`), and **coding agent CLIs** (e.g. Claude Code — multi-agent orchestration see [**tta-agents**](./docs/tta-agents-docs.md)).

Idea: start background terminals as `sess`, send keys or text as `act`, then wait for a stable screen and read results as `obs`.

Use `bash` for non-interactive commands. Use `tta` for interactive ones.

Forked from [tui-use](https://github.com/onesuper/tui-use) and modified for `tta`. Thanks to [onesuper](https://github.com/onesuper) for the original work.


## Quick Start

Copy this block into your agent:

```text
Install tta CLI:
npm install -g terminal-tool-for-agents

Install tta skills (English only — do NOT install *.zh.md):
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/tta-agents-skill.md

tta-agents-skill ships with tta skill in the same folder; no separate install.

Confirm CLI and both skill files are installed.
```

Then ask your agent to run a task:

```text
Use tta to run an interactive terminal program and finish the task.
```

**Human session observation:**

```bash
tta sess watch
```

Then open http://127.0.0.1:7654/.

## Update

Copy this block into your agent:

```text
Update tta CLI:
npm update -g terminal-tool-for-agents

Update tta skills (English only — do NOT install *.zh.md):
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/tta-agents-skill.md

Confirm CLI and both skills are updated.
```

## When to use tta vs shell

| Situation | Tool | Kill session? |
|-----------|------|---------------|
| Plain / non-interactive command | shell | - |
| One-shot interactive CLI (`npm create vite@latest`) | tta | **Yes** when done |
| Interactive TUI (`lazygit`) | tta | **Yes** when done |
| Long-running + observe logs (`npm run dev`) | tta | **No** while observing |

Coding agent workers (keep chat context) → triggers bundled [tta-agents](./docs/tta-agents-docs.md) sub-skill.

**If you use tta-agents to orchestrate multiple coding agents: clearly tell the Orchestrator your permission scope (allowed/forbidden actions, directories, deploy, etc.). Workers run in auto mode by default and treat prompts as authorization.** See [tta-agents docs](./docs/tta-agents-docs.md).

## API examples

Tip: Be lazy — don’t try it yourself; let the agent do it.

```bash
# Dev server: keep session, observe with obs
tta sess start --sess=dev --cmd="npm run dev" --cwd="/path/to/project"
tta obs screen stable --sess=dev

# One-shot interactive CLI: kill when done
tta sess start --sess=vite-once --cmd="npm create vite@latest" --cwd="/path/to/project"
tta obs screen stable --sess=vite-once
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
tta sess kill --sess=vite-once
```

## API overview

All tta work happens inside a **session** (`--sess=`).

| API | Commands | Role |
|-----|----------|------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | Create, stop, list sessions; human watch UI |
| **act** | `send text`, `send key` | Send input to a **running** session |
| **obs** | `screen now`, `screen stable`, `screen scroll` | Read session screen |

```text
tta sess start -> (tta act ... -> tta obs screen stable)* -> tta sess kill
```

On failure: one line `error: <reason>`, exit code 1.

Operational details: [`skills/tta/SKILL.md`](./skills/tta/SKILL.md).

## Requirements

- **Node.js** 22.x–26.x (`engines`: `>=22.0.0 <27.0.0`); repo includes `.nvmrc` (`24`) for local dev
- Install runs `postinstall` automatically: copies node-pty prebuilds into `build/Release` and verifies the PTY works; no manual `approve-scripts` needed

## Development

For any local change (backend or Watch UI):

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
