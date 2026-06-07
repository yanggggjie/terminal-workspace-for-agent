<div align="center">

<img src="./src/watch-ui/logo.png" alt="terminal-tool-for-agents, abbreviated as tta" width="520">


### **tta: lets agents operate interactive terminals**

[![npm](https://img.shields.io/npm/v/terminal-tool-for-agents.svg)](https://www.npmjs.com/package/terminal-tool-for-agents)

[中文 README](./README.zh.md)

</div>


## What it is

`tta` lets agents drive interactive terminal programs: REPLs (e.g. `GDB`, `IPython`), TUIs (e.g. `lazygit`), setup wizards (e.g. `npm create vite`), dev servers (e.g. `npm run dev`), and **coding agent CLIs** (e.g. Claude Code — see [**tta-agents**](./docs/tta-agents-docs.md)).

Forked from [tui-use](https://github.com/onesuper/tui-use) and modified for `tta`. Thanks to [onesuper](https://github.com/onesuper) for the original work.


## Quick Start

**Copy this into your agent to install:**

```text
Install tta CLI:
npm install -g terminal-tool-for-agents

Install tta skills (English only — do NOT install skills/tta/zh/*.md):
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/tta-agents-skill.md

tta-agents-skill ships with tta skill in the same folder; no separate install.

Confirm CLI and both skill files are installed.
```

**Ask your agent to use tta:**

```text
Use tta to run an interactive terminal program and finish the task.
```

**Observe:**

```bash
tta sess watch
```

Then open http://127.0.0.1:7654/.

## [tta-agents](./docs/tta-agents-docs.md)

Use tta to control coding agent CLIs such as Claude Code, Codex, Cursor Agent, OpenCode, Pi, and Kimi Code. This can be lightweight, such as asking one coding agent to start another for review.

## [tta-agents-orchestrator](./docs/tta-agents-orchestrator.md)

The full `Human -> Orchestrator -> Workers` workflow, for long multi-step tasks that benefit from separated coder / reviewer / tester roles.

## Update

Copy this block into your agent:

```text
Update tta CLI:
npm update -g terminal-tool-for-agents

Update tta skills (English only — do NOT install skills/tta/zh/*.md):
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md
- https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/tta-agents-skill.md

Confirm CLI and both skills are updated.
```

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
