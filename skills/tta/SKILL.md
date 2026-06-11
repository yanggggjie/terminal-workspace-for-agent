---
name: tta
version: 0.1.10
description: "Operate interactive CLIs, TUIs, and dev servers through a PTY. Use when a command needs keystrokes, screen reads, or continuous observation; use shell for plain non-interactive commands. APIs: sess, act, obs. Bundled tta-agents and create-tta-agens-orchestrator sub-skills."
---

# tta - terminal tool for agents

Use shell for plain commands. Use `tta` for interactive programs that need a PTY.

Core idea: `sess` starts a background terminal -> `act` sends keys or text -> `obs` waits for a stable screen and reads it.

## When to use

- Use it for REPLs, TUIs, interactive wizards, and long-running processes whose output must be observed, such as `npm create vite@latest`, `lazygit`, and `npm run dev`.
- Do not use it for plain bash commands that run to completion without interaction.
- When controlling a Coding Agent CLI, read `tta-agents-skill.md` first.
- When creating or updating `Orchestrator.md`, read `create-tta-agens-orchestrator-skill.md` first.

## Standard workflow

1. Decide whether a PTY is needed. Use `tta` for interaction, keystrokes, screen reads, or continuous observation.
2. Start a session: `tta sess start --sess=<name> --cmd="<command>" --cwd="/absolute/path"`.
3. Read the screen: `tta obs screen stable --sess=<name>`.
4. Choose input by screen:
   - Menus, numbered options, confirmations: use `send key`.
   - Free-form text or shell input: use `send text` with a quoted heredoc.
5. After every `act`, run `obs screen stable`.
6. Kill one-shot tasks when done; keep dev-server sessions while observing.

```text
sess start -> obs screen stable -> (act -> obs screen stable)* -> [sess kill]
```

## API Table

| API | Commands | Role | stdout |
|-----|----------|------|--------|
| `sess` | `start`, `kill`, `killall`, `list`, `keys`, `watch` | Manage sessions | `success` or session list |
| `act` | `send text`, `send key` | Send input to a running session | `success` |
| `obs` | `screen now`, `screen stable`, `screen scroll` | Read the screen of a running or exited session | screen text |

On failure, tta prints `error: <reason>` and exits with code 1.

## Command Template

```bash
tta sess start --sess=<name> --cmd="<command>" --cwd="/absolute/path/to/project"
tta sess kill --sess=<name>
tta sess killall
tta sess list
tta sess keys
tta sess watch   # human-only

tta act send text --sess=<name> <<'EOF'
<text>
EOF
tta act send key  --sess=<name> --key=<key>

tta obs screen now    --sess=<name>
tta obs screen stable --sess=<name>
tta obs screen scroll --sess=<name> --dire=<up|down|top|bottom>
```

`--cmd=` and `--cwd=` must be quoted; prefer absolute paths for `--cwd=`. Write each `tta` command on one line and do not use shell variables.

## Examples

```bash
# One-shot interactive command: kill when done
tta sess start --sess=vite-once --cmd="npm create vite@latest" --cwd="/Users/you/project"
tta obs screen stable --sess=vite-once
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
tta sess kill --sess=vite-once

# Dev server: keep while observing
tta sess start --sess=dev --cmd="npm run dev" --cwd="/Users/you/project"
tta obs screen stable --sess=dev
tta sess kill --sess=dev
```

Text input must use a quoted heredoc:

```bash
tta act send text --sess=vite-once <<'EOF'
my-project-name
EOF
tta obs screen stable --sess=vite-once
```

Use keys for TUI menus and confirmations:

```bash
tta act send key --sess=vite-once --key=arrow_down
tta act send key --sess=vite-once --key=enter
tta obs screen stable --sess=vite-once
```

Do not paste multi-line REPL code line by line. Prefer scripts, load commands, or a single execution entry:

```bash
tta act send text --sess=pyrepl <<'EOF'
exec("""
for i in range(3):
    print(i)
""")
EOF
tta obs screen stable --sess=pyrepl
```

## Notes

- Use short lowercase session names or hyphenated names, such as `dev` or `vite-once`.
- `act` / `obs` require `--sess=` and the session must exist.
- `send text` must use `<<'EOF'`, not `<<EOF`, to avoid shell expansion of `$`, `()`, and backticks.
- Real newlines in heredocs are sent literally; the trailing newline usually submits.
- Menus, lists, numbered options, and `[Y/n]` confirmations must use `send key`.
- Do not rely on `act` stdout; use `obs` to read the screen.
- Agents must not use `tta sess watch`.
- Exited sessions can still be read with `obs`; `act` fails. Read the final output, then `sess kill`.

## Error Handling

| Situation | Handling |
|-----------|----------|
| Screen is stuck | Try `enter`, then `arrow_up` / `arrow_down` / `tab`, then `obs screen stable` |
| `act` failed | Run `tta sess list`; if `exited`, read errors with `obs`, then `sess kill` |
| TUI does not respond | Check whether `send text` was used by mistake; use `send key` for menus and confirmations |
| heredoc does not finish | Cancel with `ctrl+c`; ensure the ending `EOF` is flush-left and on its own line |
| REPL stuck at continuation prompt | Try an empty line; if still stuck, use `ctrl+c`, then switch to a script, paste/editor mode, or `exec("""...""")` |
| Start failed | `sess list` -> `obs screen stable` to read errors -> `sess kill` |

Common quoting error:

```bash
# wrong
tta sess start --sess=dev --cmd=npm run dev --cwd="/tmp"

# correct
tta sess start --sess=dev --cmd="npm run dev" --cwd="/tmp"
```
