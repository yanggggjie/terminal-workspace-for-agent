<div align="center">

<img src="docs/terminal-workspace-for-agent-logo.png" alt="terminal-workspace-for-agent — abbreviated as twa" width="520">

# terminal-workspace-for-agent · `twa`

**A terminal workspace for agents to operate interactive terminals (TUI / interactive CLI).**

[![npm](https://img.shields.io/npm/v/terminal-workspace-for-agent.svg)](https://www.npmjs.com/package/terminal-workspace-for-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

`twa` is short for **terminal-workspace-for-agent**. Install the npm package `terminal-workspace-for-agent`, run the command **`twa`**.

## What it is for

**twa is not a replacement for bash.** Use normal shell/tools for non-interactive work (read files, run `git status`, one-shot commands that exit immediately).

Use **twa** when the program expects a human at a keyboard — prompts, menus, full-screen TUI, or an interactive agent REPL.

| Capability | How |
|------------|-----|
| Operate interactive CLI / TUI | `twa sess start` + `twa act send text/key` |
| Operate another agent interactively | Same — e.g. drive Claude Code in a session |
| Agent observes what happened | `twa obs screen now` / `stable` / `scroll` |
| Human observes the agent | `twa sess watch` — browser UI |

**Main agent → sub-agent:** `twa sess start` a sub-agent session, `act` to send input, `obs` to read the screen, user watches via `twa sess watch`.

## Three APIs

All work on a **twa session**. Lifecycle is separate from input/output.

| API | Commands | Role | stdout on success |
|-----|----------|------|-------------------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | Create / destroy / list **running** sessions; human watch UI | `success` (list: session names; keys: key names) |
| **act** | `send text`, `send key` | Send input to a **running** session | `success` |
| **obs** | `screen now`, `screen stable`, `screen scroll` | Read screen from a **running** session | **screen text** |

On failure, **sess** / **act** / **obs** print one line: `error: <reason>` (exit code 1).

**Workflow:**

```
twa sess start  →  (twa act …  →  twa obs screen stable)*  →  twa sess kill
```

- `act` and `obs` both require `--sess=` and assume the session already exists.
- After every `act` that may change the screen → **`twa obs screen stable --sess=…`**
- Agents use **`obs`**. Humans use **`twa sess watch`** (agents must not).

## When **not** to use twa

Plain CLI (`bash`, `git`, file tools) or one-shot non-interactive commands → run directly, **no twa**.

## Session lifecycle by task type

| Kind | Examples | Kill when done? |
|------|----------|-----------------|
| Interactive CLI (one-shot) | `npm create vite@latest` | **Yes** — `twa sess kill --sess=…` |
| Interactive TUI (one-shot) | `lazygit` | **Yes** |
| Interactive agent | Claude Code, agent CLIs | **No** until task complete (kill loses context) |
| Long-running + observe | `npm run dev` | **No** while watching logs; kill when dev done |

Name sessions as **one word** or **2–3 words joined by `-`** (`dev`, `vite-once`, `lazy-git`, `sub-agent`). When the process exits, the session is removed automatically. Use **`twa sess kill`** to stop early; **`twa sess list`** shows only running sessions.

## Install & update

Copy one block to your agent (any tool). Each does **CLI** + **skill**. Node.js ≥ 18. Skill URL: https://raw.githubusercontent.com/yanggggjie/terminal-workspace-for-agent/main/skills/twa/SKILL.md — save to your tool’s skill path (e.g. `~/.cursor/skills/twa/SKILL.md`).

### Install

```
Install twa cli: npm install -g terminal-workspace-for-agent. 
Install the following skill into your skill. 
Skill URL: https://raw.githubusercontent.com/yanggggjie/terminal-workspace-for-agent/main/skills/twa/SKILL.md
Confirm both.
```

### Update

```
Update twa cli: npm update -g terminal-workspace-for-agent. 
Update the following skill into your skill. 
Skill URL: https://raw.githubusercontent.com/yanggggjie/terminal-workspace-for-agent/main/skills/twa/SKILL.md
Confirm both.
```

## Quick start

```bash
# Dev server — keep session, observe with obs
twa sess start --sess=dev --cmd="npm run dev"
twa obs screen stable --sess=dev

# One-shot interactive CLI — kill when done
twa sess start --sess=vite-once --cmd="npm create vite@latest"
twa obs screen stable --sess=vite-once
twa act send key --sess=vite-once --key=enter
twa obs screen stable --sess=vite-once
twa sess kill --sess=vite-once

# Sub-agent — keep session between turns
twa sess start --sess=sub-agent --cmd="claude"
twa obs screen stable --sess=sub-agent
twa act send text --sess=sub-agent --txt="fix the login bug"
twa obs screen stable --sess=sub-agent
```

Human view: `twa sess watch` → http://127.0.0.1:7654

## Parameters

All options use **`--name=value`**.

| Flag | Used by |
|------|---------|
| `--sess=` | sess start/kill, act, obs |
| `--cmd=` | sess start |
| `--cwd=` | sess start |
| `--txt=` | act send text |
| `--key=` | act send key |
| `--dire=` | obs screen scroll |

## Commands

```bash
# sess — session lifecycle
twa sess start  --sess=<name> --cmd=<command> [--cwd=<path>]
twa sess kill   --sess=<name>
twa sess killall
twa sess list
twa sess keys
twa sess watch   # human-only

# act — input (session must exist)
twa act send text --sess=<name> --txt=<text>
twa act send key  --sess=<name> --key=<key>

# obs — read screen (session must exist)
twa obs screen now    --sess=<name>
twa obs screen stable --sess=<name>
twa obs screen scroll --sess=<name> --dire=up|down|top|bottom
```

Agent skill: [`skills/twa/SKILL.md`](skills/twa/SKILL.md)

## Development

```bash
git clone https://github.com/yanggggjie/terminal-workspace-for-agent.git
cd terminal-workspace-for-agent
npm install
npm test
```

## License

MIT
