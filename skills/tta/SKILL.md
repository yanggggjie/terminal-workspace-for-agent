---
name: tta
version: 0.1.6
description: "Operate interactive CLI, TUI, and dev-server sessions through a PTY. Use when a command needs keystrokes, redraws a terminal UI, step-by-step screen reads, or for npm create, lazygit, npm run dev, etc. Not for plain non-interactive bash. APIs: sess, act, obs. Bundled tta-agents sub-skill when using tta to control coding agent CLIs."
---

# tta - terminal tool for agents

`terminal-tool-for-agents` provides the `tta` command. Use shell for plain non-interactive commands. Use `tta` for interactive programs that need a PTY.

Idea: start background terminals as `sess`, send keys or text as `act`, then wait for a stable screen and read results as `obs`.

## Session

All tta work happens inside a **session** (PTY-backed terminal instance): `tta sess start/kill/list`, `--sess=`.

## tta-agents (bundled sub-skill)

`skills/tta/tta-agents-skill.md` ships **with the tta skill** — **no separate install**.

**When to enable:** If the user wants tta to drive coding agent CLIs (Claude Code, Codex, Cursor Agent, OpenCode, Pi, etc.) or asks one coding agent to use another, read and follow [`tta-agents-skill.md`](./tta-agents-skill.md). For other interactive terminals (TUI, wizards, dev servers), this skill alone is enough.

## When to use

**Use `tta` for:**

- REPLs, e.g. `GDB`, `IPython`
- Interactive setup, e.g. `npm create vite@latest`
- TUIs, e.g. `lazygit`
- Long-running processes whose output must be observed over time, e.g. `npm run dev`
- Coding agent CLIs → enable bundled [`tta-agents-skill.md`](./tta-agents-skill.md)

**Do not use `tta` for:**

- Plain bash commands that run to completion without interaction
- Human session observation (use `tta sess watch`; agents must not)

## Standard workflow

Follow in order; do not skip steps:

1. **Pick the tool** — interactive / TUI / needs step-by-step screen reads → `tta`; otherwise shell
2. **Start and read** — `tta sess start` (see **Command writing** and **Parameter quoting**), then `tta obs screen stable --sess=<name>`
3. **Choose input by screen**
   - TUI menu, numbered options, `[Y/n]` → `tta act send key` (keys only, not text)
   - Free-form shell input → quoted heredoc, then Enter:

   ```bash
   tta act send text --sess=<name> <<'EOF'
   <your input>
   EOF
   tta act send key --sess=<name> --key=enter
   ```

   Must use `<<'EOF'` (quoted delimiter), not `<<EOF`, or `$`, `()`, and backticks will be expanded by the shell.
4. **After every `act`** — `tta obs screen stable --sess=<name>` to confirm the screen updated
5. **Kill by session type** — kill one-shot CLI/TUI when done with `tta sess kill`; keep dev-server sessions until observation ends (see **Session lifecycle** table)
6. **Process exited** — still use `obs` for errors and final output, then `tta sess kill`

```text
sess start -> obs screen stable -> (act -> obs screen stable)* -> [sess kill]
```

## Three APIs

| API | Commands | Role | stdout |
|-----|----------|------|--------|
| **sess** | `start`, `kill`, `killall`, `list`, `keys`, `watch` | Create, stop, list sessions; human watch UI | `success` (start/kill); list: `name running` / `name exited exit_code=N` |
| **act** | `send text`, `send key` | Send input to a **running** session | `success` |
| **obs** | `screen now`, `screen stable`, `screen scroll` | Read a session's screen (running or exited) | screen text |

On failure: one line `error: <reason>` (exit 1).

## Session lifecycle

| Session usage | Examples | Kill when done? |
|---------------|----------|-----------------|
| One-shot interactive CLI | `npm create vite@latest` | **Yes** |
| One-shot interactive TUI | `lazygit` | **Yes** |
| Long-running + observe | `npm run dev` | **No** while observing; kill when done |

Coding agent workers (multi-turn context) — see [`tta-agents-skill.md`](./tta-agents-skill.md).

**Naming:** one lowercase word, or 2–3 words joined by `-`, e.g. `dev`, `vite-once`.

**Exited sessions:** after the PTY process exits, the session stays `exited` in `sess list` until `tta sess kill`. `obs` still works; `act` fails. Read errors with `obs`, then `kill`.

**Rules:**

- `act` / `obs` require `--sess=` and an existing session
- Send text: `tta act send text --sess=<name> <<'EOF'` … `EOF` (quoted heredoc, `<<'EOF'`)
- Do not background `tta` calls; wait for each to finish
- Do not rely on `act` stdout; use `obs` to read the screen
- Do not use `tta sess watch`

## Command writing

- Each `tta` command on **one line**; do not use `\` line continuation
- **No shell variables** in `--cmd=`, `--cwd=`, etc. (`$VAR`); use absolute paths and full command literals
- `act send text` must use **`<<'EOF'`**; do not use `<<EOF`

## Parameter quoting

| Flag | Used by | Quoting |
|------|---------|---------|
| `--cmd=` | sess start (**required**) | always `--cmd="..."` |
| `--cwd=` | sess start (**required**) | always `--cwd="..."`; prefer absolute paths |
| `--sess=` | sess start/kill, act, obs | not required |
| `--key=` | act send key | not required |
| `--dire=` | obs screen scroll | not required |
| send text input | act send text | always `<<'EOF'` |

**`sess start` template:**

```bash
tta sess start --sess=<name> --cmd="<command>" --cwd="/absolute/path/to/project"
```

Examples:

```bash
tta sess start --sess=dev --cmd="npm run dev" --cwd="/Users/you/project"
tta sess start --sess=vite-once --cmd="npm create vite@latest" --cwd="/Users/you/project"
tta sess start --sess=lazy --cmd="lazygit" --cwd="/Users/you/project"
```

**Common mistake:** an unquoted multi-word command is split by the shell; tta reports `too many arguments`:

```bash
# wrong
tta sess start --sess=dev --cmd=npm run dev --cwd="/tmp"
# correct
tta sess start --sess=dev --cmd="npm run dev" --cwd="/tmp"
```

### `--cmd=` and `--cwd=`

`sess start` runs `--cmd=` in a PTY under `--cwd=` — the same command line you would type in a terminal. tta handles platform details; do not pick or configure a shell.

## Prompts, choices, and confirmations

**TUI menus, numbered options, yes/no prompts — use `send key` only.** Do not use `send text` to pick TUI options.

| Screen | Use |
|--------|-----|
| TUI menu, list, `[Y/n]`, numbered choices | `send key` — `arrow_up` / `arrow_down` to move, `enter` to select or confirm |
| Free-form shell input | `tta act send text --sess=<name> <<'EOF'` … `EOF`, then `send key --key=enter` |

### Send text (heredoc)

Same pattern for short and long input; `<<'EOF'` sends content literally to the PTY:

```bash
tta act send text --sess=vite-once <<'EOF'
my-project-name
EOF
```

**Must use `<<'EOF'` (quoted delimiter)** — not `<<EOF`, or `$()`, backticks, and `$var` will be expanded by the shell.

After every `act`, run `obs screen stable`.

```bash
# TUI menu
tta act send key --sess=vite-once --key=arrow_down
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
```

Run `tta sess keys` for supported key names.

## Fallbacks

**Screen stuck (menu/confirm not advancing):**

1. Try `send key --key=enter` first (accept default / confirm)
2. Still stuck → try `arrow_up` / `arrow_down` or `tab`
3. Run `obs screen stable` again to confirm progress

**`act` failed:**

1. `tta sess list` — check `running` vs `exited`
2. If `exited` → `obs screen stable` for errors, then `sess kill`
3. If `running` but screen unchanged → check whether `send text` was used on a TUI menu by mistake

**Start failed (command not found, quoting error, etc.):**

```bash
tta sess start --sess=bad --cmd="this-command-does-not-exist" --cwd="/Users/you/project"
tta sess list
tta obs screen stable --sess=bad
tta sess kill --sess=bad
```

## Commands

```bash
tta sess start --sess=<name> --cmd="<command>" --cwd="/absolute/path/to/project"
tta sess kill --sess=<name>
tta sess killall
tta sess list
tta sess keys
tta sess watch   # human-only

# send text: quoted heredoc
tta act send text --sess=<name> <<'EOF'
<text>
EOF
tta act send key  --sess=<name> --key=<key>

tta obs screen now    --sess=<name>
tta obs screen stable --sess=<name>
tta obs screen scroll --sess=<name> --dire=<up|down|top|bottom>
```

## Examples

```bash
# One-shot: kill when done
tta sess start --sess=vite-once --cmd="npm create vite@latest" --cwd="/Users/you/project"
tta obs screen stable --sess=vite-once
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
tta sess kill --sess=vite-once

# Dev server: keep, use obs
tta sess start --sess=dev --cmd="npm run dev" --cwd="/Users/you/project"
tta obs screen stable --sess=dev
tta sess kill --sess=dev
```

Coding agent worker examples — see [`tta-agents-skill.md`](./tta-agents-skill.md).
