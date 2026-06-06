---
name: tta
version: 0.1.2
description: Operate interactive CLI, TUI, dev-server, and coding-agent sessions through a PTY. Use when a command needs keystrokes, redraws a terminal UI, or must be observed between steps, or for claude/opencode/cursor agent, npm create, lazygit, npm run dev, etc. Not for plain non-interactive bash. APIs: sess, act, obs.
---

# tta - terminal tool for agents

`terminal-tool-for-agents` provides the `tta` command. Use shell for plain non-interactive commands. Use `tta` for interactive programs that need a PTY.

Idea: start background terminals as `sess`, send keys or text as `act`, then wait for completion and read results as `obs`.

## When to use

**Use `tta` for:**

- Interactive setup, such as `npm create vite@latest`
- TUIs, such as `lazygit`
- Coding agent CLIs, such as `claude`, `opencode`, `codex`, `cursor agent`
- Long-running processes whose terminal output must be observed over time, such as `npm run dev`

**Do not use `tta` for:**

- Plain bash commands that run to completion without interaction
- Human session observation (use `tta sess watch`; agents must not)

## Standard workflow

Follow in order; do not skip steps:

1. **Pick the tool** — interactive / TUI / needs step-by-step screen reads → `tta`; otherwise shell
2. **Start and read** — `tta sess start --sess=<name> --cmd=<command>`, then `tta obs screen stable --sess=<name>`
3. **Choose input by screen**
   - TUI menu, numbered options, `[Y/n]` → `tta act send key` (keys only, not text)
   - Free-form prompt, agent task, shell input → quoted heredoc, then Enter:

   ```bash
   tta act send text --sess=<name> <<'EOF'
   <your prompt>
   EOF
   tta act send key --sess=<name> --key=enter
   ```

   Must use `<<'EOF'` (quoted delimiter), not `<<EOF`, or `$`, `()`, and backticks will be expanded by the shell.
4. **After every `act`** — `tta obs screen stable --sess=<name>` to confirm the screen updated
5. **Kill by session type** — kill one-shot CLI/TUI when done with `tta sess kill`; keep agent and dev-server sessions until the task or observation is done (see **Session lifecycle** table)
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

| Kind | Examples | Kill when done? |
|------|----------|-----------------|
| One-shot interactive CLI | `npm create vite@latest` | **Yes** — `tta sess kill --sess=...` |
| One-shot interactive TUI | `lazygit` | **Yes** |
| Interactive agent | `claude`, `opencode`, `codex`, etc. | **No** until task complete (kill loses context) |
| Long-running + observe | `npm run dev` | **No** while watching logs; kill when done |

**Naming:** one lowercase word, or 2–3 words joined by `-`, e.g. `dev`, `vite-once`, `sub-agent`.

**Exited sessions:** after the PTY process exits, the session stays `exited` in `sess list` until `tta sess kill`. `obs` still works; `act` fails. Read errors with `obs`, then `kill`.

**Rules:**

- `act` / `obs` require `--sess=` and an existing session
- Send text: `tta act send text --sess=<name> <<'EOF'` … `EOF` (quoted heredoc, `<<'EOF'`)
- Do not background `tta` calls; wait for each to finish
- Do not rely on `act` stdout; use `obs` to read the screen
- Do not use `tta sess watch`

### `--cmd=` (command line)

`sess start` runs `--cmd=` in a PTY under `--cwd=` — the same command line you would type in a terminal. tta handles platform details; do not pick or configure a shell.

- Examples: `npm run dev`, `claude`, `npm create vite@latest`, `cursor agent`
- Pipes, redirects, and `&&` work when the host platform supports them in a normal terminal
- Quote values with spaces: `--cmd="my command here"`

## Coding agent CLIs

```bash
tta sess start --sess=claude-code --cmd="claude"
tta sess start --sess=opencode --cmd="opencode"
tta sess start --sess=cursor --cmd="cursor agent"
```

After start, run `obs screen stable`. Busy TUIs with footer spinners may take longer to stabilize. Keep the same session across turns; do not kill.

## Prompts, choices, and confirmations

**TUI menus, numbered options, yes/no prompts, and confirmations — use `send key` only.** Do not use `send text` to pick TUI options.

| Screen | Use |
|--------|-----|
| TUI menu, list, `[Y/n]`, numbered choices | `send key` — `arrow_up` / `arrow_down` to move, `enter` to select or confirm |
| Free-form prompt, agent task, shell input | `tta act send text --sess=<name> <<'EOF'` … `EOF`, then `send key --key=enter` |

### Send text (heredoc)

Same pattern for short and long prompts; `<<'EOF'` sends content literally to the PTY:

```bash
tta act send text --sess=sub-agent <<'EOF'
fix bug, run tests, and summarize the changes
EOF
```

Short prompts use the same pattern:

```bash
tta act send text --sess=sub-agent <<'EOF'
yes
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

**Start failed (command not found, etc.):**

```bash
tta sess start --sess=bad --cmd="this-command-does-not-exist"
tta sess list
tta obs screen stable --sess=bad
tta sess kill --sess=bad
```

## Parameters (`--name=value`)

| Flag | Used by |
|------|---------|
| `--sess=` | sess start/kill, act, obs |
| `--cmd=` | sess start |
| `--cwd=` | sess start |
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
tta sess start --sess=vite-once --cmd="npm create vite@latest"
tta obs screen stable --sess=vite-once
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
tta sess kill --sess=vite-once

# Sub-agent: heredoc for prompt
tta sess start --sess=sub-agent --cmd="claude"
tta obs screen stable --sess=sub-agent
tta act send text --sess=sub-agent <<'EOF'
fix bug, run tests, and summarize the changes
EOF
tta act send key --sess=sub-agent --key=enter
tta obs screen stable --sess=sub-agent

# Short confirm — same heredoc pattern
tta act send text --sess=sub-agent <<'EOF'
yes
EOF
tta act send key --sess=sub-agent --key=enter
tta obs screen stable --sess=sub-agent

# Dev server: keep, use obs
tta sess start --sess=dev --cmd="npm run dev"
tta obs screen stable --sess=dev
tta sess kill --sess=dev
```
