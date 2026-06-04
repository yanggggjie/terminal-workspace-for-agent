---
name: twa
version: 0.1.0
description: Operate interactive CLI, TUI, dev-server, and coding-agent sessions through a PTY. Use when a command needs keystrokes, redraws a terminal UI, or must be observed between steps. Not for plain bash. APIs: sess, act, obs.
---

# twa - terminal workspace for agents

`terminal-workspace-for-agent` provides the `twa` command. Use shell for plain non-interactive commands. Use `twa` for interactive programs that need a PTY.

Idea: start background terminals as `sess`, send keys or text as `act`, then wait for completion and read results as `obs`.

## When to use

Use `twa` for:

- Interactive setup commands, such as `npm create vite@latest`.
- TUIs, such as `lazygit`.
- Coding agent CLIs, such as `claude`, `opencode`, `codex`, or `cursor agent`.
- Long-running processes whose terminal output must be observed over time.

Do not use `twa` for plain bash commands that can run to completion without interaction.

## Coding agent CLIs

Start the same command you would run in a terminal:

```bash
twa sess start --sess=claude-code --cmd="claude"
twa sess start --sess=opencode --cmd="opencode"
twa sess start --sess=cursor --cmd="agent"
```

After `act`, observe the result with `twa obs screen stable`. Busy TUIs with footer spinners may take longer to stabilize.

## Three APIs

| API | Commands | When | stdout |
|-----|----------|------|--------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | Create, stop, list sessions; human watch UI | `success` (list: names; keys: key names) |
| **act** | `send text`, `send key` | Send input to a running session | `success` |
| **obs** | `screen now`, `screen stable`, `screen scroll` | Read a running session's screen | screen text |

On failure: one line `error: <reason>` (exit 1).

**Workflow:** `sess start` -> `(act -> obs screen stable)*` -> `sess kill`

```bash
twa sess start --sess=sub-agent --cmd="claude"
twa obs screen stable --sess=sub-agent
twa act send text --sess=sub-agent --text="run all tests and fix failures"
twa obs screen stable --sess=sub-agent
twa sess kill --sess=sub-agent
```

## Session lifecycle

| Kind | Examples | Kill when done? |
|------|----------|-----------------|
| Interactive CLI (one-shot) | `npm create vite@latest` | **Yes** - `twa sess kill --sess=...` |
| Interactive TUI (one-shot) | `lazygit` | **Yes** |
| Interactive agent | any coding agent CLI (`claude`, `opencode`, `codex`, etc.) | **No** until task complete (kill loses context) |
| Long-running + observe | `npm run dev` | **No** while watching logs; kill when dev done |

Name sessions as one lowercase word or 2-3 words joined by `-`, such as `dev`, `vite-once`, `lazy-git`, or `sub-agent`. When the process exits, the session is removed automatically. Use `twa sess kill` to stop early; `twa sess list` shows only running sessions.

- `act` / `obs` always need `--sess=` and an existing session.
- For long prompts, write a temporary `.txt` file and send it with `twa act send text --sess=... --file=/absolute/path/to/prompt.txt`.
- Do not use `twa sess watch`; it is for humans.
- Do not background `twa` calls. Each call must finish before the next call.
- Do not rely on output from `act`; use `obs` to read the screen.

## Parameters (`--name=value`)

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
twa sess start --sess=<name> --cmd=<command> [--cwd=<path>]
twa sess kill --sess=<name>
twa sess killall
twa sess list
twa sess keys
twa sess watch   # human-only

twa act send text --sess=<name> --text=<text>
twa act send text --sess=<name> --file=<absolute-path-to-text-file>
twa act send key  --sess=<name> --key=<key>

twa obs screen now    --sess=<name>
twa obs screen stable --sess=<name>
twa obs screen scroll --sess=<name> --dire=<up|down|top|bottom>
```

## Examples

```bash
# One-shot: kill after
twa sess start --sess=vite-once --cmd="npm create vite@latest"
twa obs screen stable --sess=vite-once
twa act send key --sess=vite-once --key=enter
twa obs screen stable --sess=vite-once
twa sess kill --sess=vite-once

# Sub-agent: keep until done
twa sess start --sess=sub-agent --cmd="claude"
twa obs screen stable --sess=sub-agent
twa act send text --sess=sub-agent --text="fix bug"
twa obs screen stable --sess=sub-agent

# Long prompt: write a temp txt file, then send by absolute path
tmp="/tmp/twa-prompt.txt"
cat > "$tmp" <<'EOF'
fix bug, run tests, and summarize the changes
EOF
twa act send text --sess=sub-agent --file="$tmp"
twa act send key --sess=sub-agent --key=enter
twa obs screen stable --sess=sub-agent

# Dev server: keep, use obs
twa sess start --sess=dev --cmd="npm run dev"
twa obs screen stable --sess=dev
twa sess kill --sess=dev
```

