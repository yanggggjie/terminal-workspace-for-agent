---
name: tta
version: 0.1.2
description: Operate interactive CLI, TUI, dev-server, and coding-agent sessions through a PTY. Use when a command needs keystrokes, redraws a terminal UI, or must be observed between steps. Not for plain bash. APIs: sess, act, obs.
---

# tta - terminal tool for agents

`terminal-tool-for-agents` provides the `tta` command. Use shell for plain non-interactive commands. Use `tta` for interactive programs that need a PTY.

Idea: start background terminals as `sess`, send keys or text as `act`, then wait for completion and read results as `obs`.

## When to use

Use `tta` for:

- Interactive setup commands, such as `npm create vite@latest`.
- TUIs, such as `lazygit`.
- Coding agent CLIs, such as `claude`, `opencode`, `codex`, or `cursor agent`.
- Long-running processes whose terminal output must be observed over time.

Do not use `tta` for plain bash commands that can run to completion without interaction.

## Coding agent CLIs

Start the same command you would run in a terminal:

```bash
tta sess start --sess=claude-code --cmd="claude"
tta sess start --sess=opencode --cmd="opencode"
tta sess start --sess=cursor --cmd="agent"
```

After `act`, observe the result with `tta obs screen stable`. Busy TUIs with footer spinners may take longer to stabilize.

## Three APIs

| API | Commands | When | stdout |
|-----|----------|------|--------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | Create, stop, list sessions; human watch UI | `success` (start/act/kill); list: `name running` / `name exited exit_code=N` |
| **act** | `send text`, `send key` | Send input to a **running** session | `success` |
| **obs** | `screen now`, `screen stable`, `screen scroll` | Read a session's screen (running or exited) | screen text |

On failure: one line `error: <reason>` (exit 1).

**Workflow:** `sess start` -> `(act -> obs screen stable)*` -> `sess kill`

```bash
tta sess start --sess=sub-agent --cmd="claude"
tta obs screen stable --sess=sub-agent
tmp="/tmp/tta-prompt.txt"
cat > "$tmp" <<'EOF'
run all tests and fix failures
EOF
tta act send text --sess=sub-agent --file="$tmp"
tta act send key --sess=sub-agent --key=enter
tta obs screen stable --sess=sub-agent
tta sess kill --sess=sub-agent
```

## Session lifecycle

| Kind | Examples | Kill when done? |
|------|----------|-----------------|
| Interactive CLI (one-shot) | `npm create vite@latest` | **Yes** - `tta sess kill --sess=...` |
| Interactive TUI (one-shot) | `lazygit` | **Yes** |
| Interactive agent | any coding agent CLI (`claude`, `opencode`, `codex`, etc.) | **No** until task complete (kill loses context) |
| Long-running + observe | `npm run dev` | **No** while watching logs; kill when dev done |

Name sessions as one lowercase word or 2-3 words joined by `-`, such as `dev`, `vite-once`, `lazy-git`, or `sub-agent`.

When the PTY process exits, the session **stays** in `sess list` as `exited` until you run `tta sess kill`. You can still `obs screen` to read errors (e.g. `command not found`) or final output. `act` fails on exited sessions.

- Use `tta sess kill` to remove a session from the registry (running or exited).
- `sess list` shows `name running` or `name exited exit_code=N`. Check list after start if you need status.

### `--cmd=` (command line)

`sess start` runs `--cmd=` in a PTY under `--cwd=` — the same command line you would type in a terminal. tta handles platform details internally; do not pick or configure a shell.

- Examples: `npm run dev`, `claude`, `npm create vite@latest`, `cursor agent`
- Pipes, redirects, and `&&` work when the host platform supports them in a normal terminal
- Quote values with spaces: `--cmd="my command here"`

- `act` / `obs` always need `--sess=` and an existing session.
- **Prefer `tta act send text --file=`** — write prompt text to a temp `.txt` file (absolute path), then send it. Safer for multiline content, quotes, and shell metacharacters. Use `--text=` only for very short input (e.g. a few words with no special characters).
- Do not use `tta sess watch`; it is for humans.
- Do not background `tta` calls. Each call must finish before the next call.
- Do not rely on output from `act`; use `obs` to read the screen.

## Prompts, choices, and confirmations

**TUI menus, numbered options, yes/no prompts, and confirmations — use `send key` only.** Do not use `send text` to pick options in a TUI.

| Screen | Use |
|--------|-----|
| TUI menu, list, `[Y/n]`, numbered choices | `send key` — `arrow_up` / `arrow_down` to move, `enter` to select or confirm |
| Free-form prompt, agent task, shell input | `send text --file=` (or `--text=` if very short), then `send key --key=enter` to submit |

After every `act`, run `obs screen stable` to verify the screen moved on.

**If stuck** — the screen shows a menu, choice, or confirmation and nothing progresses after `obs screen stable`, try **`send key --key=enter`** first (accept default / confirm). Then try arrow keys or `tab` if still stuck.

```bash
# TUI menu: move with arrows, confirm with Enter
tta act send key --sess=vite-once --key=arrow_down
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once

# Default confirmation — just Enter
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once

# Stuck on a choice screen — try Enter first
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
```

Run `tta sess keys` for supported key names.

## Parameters (`--name=value`)

| Flag | Used by |
|------|---------|
| `--sess=` | sess start/kill, act, obs |
| `--cmd=` | sess start |
| `--cwd=` | sess start |
| `--file=` | act send text (preferred) |
| `--text=` | act send text (very short input only) |
| `--key=` | act send key |
| `--dire=` | obs screen scroll |

## Commands

```bash
tta sess start --sess=<name> --cmd=<command> [--cwd=<path>]
tta sess kill --sess=<name>
tta sess killall
tta sess list
tta sess keys
tta sess watch   # human-only

tta act send text --sess=<name> --file=<absolute-path-to-text-file>   # preferred
tta act send text --sess=<name> --text=<text>                         # very short only
tta act send key  --sess=<name> --key=<key>

tta obs screen now    --sess=<name>
tta obs screen stable --sess=<name>
tta obs screen scroll --sess=<name> --dire=<up|down|top|bottom>
```

## Examples

```bash
# One-shot: kill after
tta sess start --sess=vite-once --cmd="npm create vite@latest"
tta obs screen stable --sess=vite-once
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
tta sess kill --sess=vite-once

# Sub-agent: keep until done (prefer --file for prompts)
tta sess start --sess=sub-agent --cmd="claude"
tta obs screen stable --sess=sub-agent
tmp="/tmp/tta-prompt.txt"
cat > "$tmp" <<'EOF'
fix bug, run tests, and summarize the changes
EOF
tta act send text --sess=sub-agent --file="$tmp"
tta act send key --sess=sub-agent --key=enter
tta obs screen stable --sess=sub-agent

# Very short input only — use --text
tta act send text --sess=sub-agent --text="yes"
tta act send key --sess=sub-agent --key=enter
tta obs screen stable --sess=sub-agent

# Dev server: keep, use obs
tta sess start --sess=dev --cmd="npm run dev"
tta obs screen stable --sess=dev
tta sess kill --sess=dev

# Failed start: obs then kill (check list for status)
tta sess start --sess=bad --cmd="this-command-does-not-exist"
tta sess list
tta obs screen stable --sess=bad
tta sess kill --sess=bad
```

