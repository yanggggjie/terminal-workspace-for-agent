# tta local dev — run `just` to list recipes
#
#   just dev    — tsc --watch (save TS → dist updates; use with link)
#   just link   — build + npm link (global `tta` points here)
#   just unlink — restore registry global install

_default:
    @just --list

# Full build → dist/
build:
    npm run build

# TypeScript watch
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
    npm link
    @echo "Linked. Run \`just dev\` in another terminal, then \`tta\` anywhere."

# Restore global install from npm registry
unlink:
    -npm unlink
    npm install -g terminal-tool-for-agents
    @echo "Restored npm global tta ($(npm view terminal-tool-for-agents version))."
