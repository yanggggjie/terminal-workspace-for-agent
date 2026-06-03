---
name: twa
version: 0.1.0
description: Interactive CLI/TUI/agent workspace via PTY. Not for plain bash. Three APIs — sess start/kill/list (session), act send text/key (input), obs screen now/stable/scroll (read screen). Package terminal-workspace-for-agent, command twa. Block synchronously.
---

# twa — terminal workspace for agents

**terminal-workspace-for-agent** / command **`twa`**. Plain CLI → shell directly, **no twa**. Interactive programs → twa.

## Three APIs

| API | Commands | When | stdout |
|-----|----------|------|--------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | Create / end / list sessions; human watch UI | `success` (list: names; keys: key names) |
| **act** | `send text`, `send key` | Send input to a **running** session | `success` |
| **obs** | `screen now`, `screen stable`, `screen scroll` | Read a **running** session's screen | **screen text** |

On failure: one line `error: <reason>` (exit 1).

**Workflow:** `sess start` → `(act → obs screen stable)*` → `sess kill`

```bash
twa sess start --sess=sub-agent --cmd="claude"
twa obs screen stable --sess=sub-agent
twa act send text --sess=sub-agent --txt="run tests"
twa obs screen stable --sess=sub-agent
twa sess kill --sess=sub-agent
```

- `act` / `obs` always need `--sess=` and an existing session.
- Session names: **one lowercase word**, or **2–3 words** joined by `-` (e.g. `dev`, `vite-once`, `npm-run-dev`).
- Forbidden: `twa sess watch`, sleep/polling, background twa, screen output from `act`.

## When to use twa vs shell

| Situation | Tool | Kill session? |
|-----------|------|---------------|
| Plain / non-interactive | shell | — |
| Interactive CLI one-shot (`npm create vite@latest`) | twa | **Yes** when done |
| Interactive TUI (`lazygit`) | twa | **Yes** when done |
| Interactive agent (chat context) | twa | **No** until task done |
| Long-running + logs (`npm run dev`) | twa | **No** while observing |

Rules: kill one-shot sessions promptly when done; keep agent/dev sessions while needed. Exited processes are removed from `sess list` automatically — use `twa sess kill` to stop a session before the process exits.

## Parameters (`--name=value`)

| Flag | Used by |
|------|---------|
| `--sess=` | sess start/kill, act, obs |
| `--cmd=` | sess start |
| `--cwd=` | sess start |
| `--txt=` | act send text |
| `--key=` | act send key |
| `--dire=` | obs screen scroll |

## Commands

```
twa sess start --sess=<name> --cmd=<command> [--cwd=<path>]
twa sess kill --sess=<name>
twa sess killall
twa sess list
twa sess keys
twa sess watch   # human-only

twa act send text --sess=<name> --txt=<text>
twa act send key  --sess=<name> --key=<key>

twa obs screen now    --sess=<name>
twa obs screen stable --sess=<name>
twa obs screen scroll --sess=<name> --dire=<up|down|top|bottom>
```

## Examples

```bash
# One-shot — kill after
twa sess start --sess=vite-once --cmd="npm create vite@latest"
twa obs screen stable --sess=vite-once
twa act send key --sess=vite-once --key=enter
twa obs screen stable --sess=vite-once
twa sess kill --sess=vite-once

# Sub-agent — keep until done
twa sess start --sess=sub-agent --cmd="claude"
twa obs screen stable --sess=sub-agent
twa act send text --sess=sub-agent --txt="fix bug"
twa obs screen stable --sess=sub-agent

# Dev server — keep, use obs
twa sess start --sess=dev --cmd="npm run dev"
twa obs screen stable --sess=dev
twa sess kill --sess=dev
```

Every twa call must block until it exits — one at a time.
