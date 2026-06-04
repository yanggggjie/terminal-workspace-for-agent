<div align="center">

<img src="docs/terminal-workspace-for-agent-logo.png" alt="terminal-workspace-for-agent — abbreviated as twa" width="520">


### **twa: a terminal workspace for agents to operate interactive terminals (TUI / interactive CLI).**

[![npm](https://img.shields.io/npm/v/terminal-workspace-for-agent.svg)](https://www.npmjs.com/package/terminal-workspace-for-agent)

</div>

Install the npm package `terminal-workspace-for-agent`, run the command **`twa`**.

## What it is

It lets your agent drive interactive programs the way a human would (e.g. **Claude Code**, **Codex**, **Cursor Agent**, **lazygit**, **`npm create vite`**). **OpenCode is not compatible** — do not start it via twa ([details](#coding-agent-cli-compatibility)).

Forked from [tui-use](https://github.com/onesuper/tui-use) and modified for `twa`. Thanks to [onesuper](https://github.com/onesuper) for the original work.

## Usage

Copy the following block into your agent to **install**.

```
Install twa cli: npm install -g terminal-workspace-for-agent. 
Install the following skill into your skill. 
Skill URL: https://raw.githubusercontent.com/yanggggjie/terminal-workspace-for-agent/main/skills/twa/SKILL.md
Confirm both.
```

Then prompt your agent: “Use twa to run a tested coding agent (e.g. Claude Code) to finish some work.” See [Coding agent CLI compatibility](#coding-agent-cli-compatibility).

To watch what the agent is doing with twa, run `twa sess watch` in your terminal and open http://127.0.0.1:7654/.

#### Case




##### Update

```
Update twa cli: npm update -g terminal-workspace-for-agent. 
Update the following skill into your skill. 
Skill URL: https://raw.githubusercontent.com/yanggggjie/terminal-workspace-for-agent/main/skills/twa/SKILL.md
Confirm both.
```

## When to use twa vs shell

| Situation | Tool | Kill session? |
|-----------|------|---------------|
| Plain / non-interactive | shell | — |
| Interactive CLI one-shot (`npm create vite@latest`) | twa | **Yes** when done |
| Interactive TUI (`lazygit`) | twa | **Yes** when done |
| Interactive agent (chat context) | twa | **No** until task done |
| Long-running + logs (`npm run dev`) | twa | **No** while observing |

Rules: kill one-shot sessions promptly when done; keep agent/dev sessions while needed. Exited processes are removed from `sess list` automatically — use `twa sess kill` to stop a session before the process exits.

## Coding agent CLI compatibility

| Status | Agent / CLI |
|--------|-------------|
| **Tested — OK** | Claude Code, Codex, Cursor Agent, Kimi Code, Pi |
| **Not compatible** | **OpenCode** — do **not** use twa to start an OpenCode agent |
| **Unknown** | Other coding agent CLIs — not tested; compatibility not guaranteed |

**Do not run:** `twa sess start --cmd="opencode …"` (or any OpenCode agent entrypoint). Use OpenCode outside twa.

For tested agents, start the same command you would run in a terminal, for example:

```bash
twa sess start --sess=claude --cmd="claude"
twa sess start --sess=cursor --cmd="cursor agent"
```

## Examples

Tip: Be lazy—don’t try it yourself. Sit back and let the agent do the work.

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
twa act send text --sess=sub-agent --text="fix the login bug"
twa obs screen stable --sess=sub-agent
```


## APIs

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



Human view: `twa sess watch` → http://127.0.0.1:7654

## Parameters

All options use **`--name=value`**.

| Flag | Used by |
|------|---------|
| `--sess=` | sess start/kill, act, obs |
| `--cmd=` | sess start |
| `--cwd=` | sess start |
| `--text=` | act send text |
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
twa act send text --sess=<name> --text=<text>
twa act send key  --sess=<name> --key=<key>

# obs — read screen (session must exist)
twa obs screen now    --sess=<name>
twa obs screen stable --sess=<name>
twa obs screen scroll --sess=<name> --dire=up|down|top|bottom
```

Agent skill: [`skills/twa/SKILL.md`](skills/twa/SKILL.md)

## Requirements

- **Node.js** 22.x–26.x (`engines`: `>=22.0.0 <27.0.0`); repo includes `.nvmrc` (`24`) for local dev
- After `npm install` / `npm install -g`, if npm warns about **allow-scripts** for `node-pty`, run `npm approve-scripts node-pty` (or `npm approve-scripts --allow-scripts-pending`) in that environment, then reinstall so PTY prebuilds can install.

## Development

Requires [just](https://github.com/casey/just) (optional but recommended) and Node per [Requirements](#requirements).

```bash
git clone https://github.com/yanggggjie/terminal-workspace-for-agent.git
cd terminal-workspace-for-agent
nvm use          # reads .nvmrc (24)
npm install
npm approve-scripts node-pty   # if npm warns about allow-scripts; then npm install again
just test        # build + verify publish layout
```

**Local `twa` from this repo** (global command points here instead of npm):

```bash
just link        # npm install, build, npm link
```

In a **second terminal**, keep TypeScript compiling on save:

```bash
just dev         # tsc --watch → updates dist/ for linked twa
```

Try changes from any directory: `twa --help`, `twa sess list`, etc.

When finished, restore the registry global install:

```bash
just unlink
```

| Recipe | Same as |
|--------|---------|
| `just build` | `npm run build` |
| `just test` | `npm test` |

Run CLI without linking: `npm start` (after `npm run build`).

Release: `npm run release -- patch` (or `minor` / `major`; clean git tree required).

## License

MIT
