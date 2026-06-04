# twa local dev — run `just` to list recipes
#
#   just dev    — tsc --watch (save TS → dist updates; use with link)
#   just link   — build + npm link (global `twa` points here)
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

# Build and link global `twa` for local testing
link:
    npm install
    npm run build
    -npm uninstall -g terminal-workspace-for-agent
    npm link
    @echo "Linked. Run \`just dev\` in another terminal, then \`twa\` anywhere."

# Restore global install from npm registry
unlink:
    -npm unlink
    npm install -g terminal-workspace-for-agent
    @echo "Restored npm global twa ($(npm view terminal-workspace-for-agent version))."
