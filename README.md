<div align="center">

<img src="docs/terminal-workspace-for-agent-logo.png" alt="terminal-workspace-for-agent, abbreviated as twa" width="520">


### **twa: a terminal workspace for agents, used by agents to operate interactive terminals.**

[![npm](https://img.shields.io/npm/v/terminal-workspace-for-agent.svg)](https://www.npmjs.com/package/terminal-workspace-for-agent)

</div>

Install the npm package `terminal-workspace-for-agent`, then let your agent use the command `twa`.

## What it is

`twa` is for agents. It lets an agent drive interactive programs through a real PTY: coding agent CLIs, TUIs like `lazygit`, setup wizards like `npm create vite`, and long-running processes you want to observe.

Idea: start background terminals as `sess`, send keys or text as `act`, then wait for completion and read results as `obs`.

Use normal shell tools for plain, non-interactive commands. Use `twa` when the program expects keystrokes, redraws a terminal UI, or needs screen observation between steps.

Forked from [tui-use](https://github.com/onesuper/tui-use) and modified for `twa`. Thanks to [onesuper](https://github.com/onesuper) for the original work.

## Quick Start

Copy this block into your agent:

```text
Install twa CLI:
npm install -g terminal-workspace-for-agent

Install the twa skill from:
https://raw.githubusercontent.com/yanggggjie/terminal-workspace-for-agent/main/skills/twa/SKILL.md

Confirm both are installed.
```

Then ask your agent to use it:

```text
Use twa to run an interactive coding agent CLI and finish the task.
```

To watch sessions as a human, run:

```bash
twa sess watch
```

Then open http://127.0.0.1:7654/.

## Update

Copy this block into your agent:

```text
Update twa CLI:
npm update -g terminal-workspace-for-agent

Update the twa skill from:
https://raw.githubusercontent.com/yanggggjie/terminal-workspace-for-agent/main/skills/twa/SKILL.md

Kill all twa sessions so the background service restarts on next use:
twa sess killall

Confirm both are updated.
```

## When to use twa vs shell

| Situation | Tool | Kill session? |
|-----------|------|---------------|
| Plain / non-interactive command | shell | - |
| Interactive CLI one-shot (`npm create vite@latest`) | twa | **Yes** when done |
| Interactive TUI (`lazygit`) | twa | **Yes** when done |
| Interactive agent (chat context) | twa | **No** until task done |
| Long-running + logs (`npm run dev`) | twa | **No** while observing |

Kill one-shot sessions promptly when done. Keep agent and dev-server sessions while their context or logs are still useful. Exited processes are removed from `sess list` automatically.

## Coding agent CLIs

`twa` supports any interactive coding agent CLI. Start the same command you would run in a terminal:

```bash
twa sess start --sess=claude --cmd="claude"
twa sess start --sess=opencode --cmd="opencode"
twa sess start --sess=cursor --cmd="cursor agent"
```

Busy TUIs may keep a footer or spinner moving. `twa obs screen stable` waits until the PTY screen stops changing.

## Examples

```bash
# Dev server: keep session, observe with obs
twa sess start --sess=dev --cmd="npm run dev"
twa obs screen stable --sess=dev

# One-shot interactive CLI: kill when done
twa sess start --sess=vite-once --cmd="npm create vite@latest"
twa obs screen stable --sess=vite-once
twa act send key --sess=vite-once --key=enter
twa obs screen stable --sess=vite-once
twa sess kill --sess=vite-once

# Sub-agent: keep session between turns
twa sess start --sess=sub-agent --cmd="claude"
twa obs screen stable --sess=sub-agent
twa act send text --sess=sub-agent --text="fix the login bug"
twa obs screen stable --sess=sub-agent

# Long prompt: write a temp txt file, then send by absolute path
tmp="/tmp/twa-prompt.txt"
cat > "$tmp" <<'EOF'
fix the login bug, run tests, and summarize the changes
EOF
twa act send text --sess=sub-agent --file="$tmp"
twa act send key --sess=sub-agent --key=enter
twa obs screen stable --sess=sub-agent
```


## APIs

All work happens inside a `twa` session. Lifecycle, input, and observation are separate APIs.

| API | Commands | Role | stdout on success |
|-----|----------|------|-------------------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | Create, stop, list sessions; human watch UI | `success` (list: session names; keys: key names) |
| **act** | `send text`, `send key` | Send input to a running session | `success` |
| **obs** | `screen now`, `screen stable`, `screen scroll` | Read screen from a running session | screen text |

On failure, commands print one line: `error: <reason>` and exit with code 1.

**Workflow:**

```text
twa sess start -> (twa act ... -> twa obs screen stable)* -> twa sess kill
```

- `act` and `obs` both require `--sess=` and assume the session already exists.
- For long prompts, write a temporary `.txt` file and send it with `twa act send text --sess=... --file=/absolute/path/to/prompt.txt`.
- After every `act` that may change the screen, run `twa obs screen stable --sess=...`.
- Agents use `obs`. Humans use `twa sess watch`.
Human view: `twa sess watch` -> http://127.0.0.1:7654

## Parameters

All options use `--name=value`.

| Flag | Used by |
|------|---------|
| `--sess=` | sess start/kill, act, obs |
| `--cmd=` | sess start |
| `--cwd=` | sess start |
| `--text=` | act send text |
| `--file=` | act send text |
| `--key=` | act send key |
| `--dire=` | obs screen scroll |

## Commands

```bash
# sess: session lifecycle
twa sess start  --sess=<name> --cmd=<command> [--cwd=<path>]
twa sess kill   --sess=<name>
twa sess killall
twa sess list
twa sess keys
twa sess watch   # human-only

# act: input (session must exist)
twa act send text --sess=<name> --text=<text>
twa act send text --sess=<name> --file=<absolute-path-to-text-file>
twa act send key  --sess=<name> --key=<key>

# obs: read screen (session must exist)
twa obs screen now    --sess=<name>
twa obs screen stable --sess=<name>
twa obs screen scroll --sess=<name> --dire=up|down|top|bottom
```

Agent skill: [`skills/twa/SKILL.md`](skills/twa/SKILL.md)

## Requirements

- **Node.js** 22.x-26.x (`engines`: `>=22.0.0 <27.0.0`); repo includes `.nvmrc` (`24`) for local dev
- After `npm install` or `npm install -g`, if npm warns about allow-scripts for `node-pty`, run `npm approve-scripts node-pty` or `npm approve-scripts --allow-scripts-pending`, then reinstall so PTY prebuilds can install.

## Development

```bash
nvm use          # reads .nvmrc (24)
npm install
npm approve-scripts node-pty   # if npm warns about allow-scripts; then npm install again
just test        # build + verify publish layout
just link        # npm install, build, npm link
just dev         # tsc --watch; updates dist/ for linked twa
```

If you change background service or session/server code, restart running twa sessions:

```bash
twa sess killall
```

## License

MIT
