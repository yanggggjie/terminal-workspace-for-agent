# tta local dev — run `just` to list recipes
#
#   just dev    — tsc --watch + nodemon server (UI from src/; run before tta)
#   just link   — build + npm link (global `tta` points here)
#   just unlink — restore registry global install

_default:
    @just --list

# Full build → dist/
build:
    npm run build

# Dev: compile + auto-restart server; watch-ui served from src/
dev:
    npm run dev

# Build + pack sanity checks
test:
    npm test

# Build and link global `tta` for local testing
link:
    npm install
    npm run build
    -npm uninstall -g terminal-tool-for-agents
    npm link --force
    @echo "Linked. Run \`just dev\` in one terminal, then \`tta\` / \`tta sess watch\` in another."

# Restore global install from npm registry
unlink:
    -npm unlink
    npm install -g terminal-tool-for-agents
    @echo "Restored npm global tta ($(npm view terminal-tool-for-agents version))."
