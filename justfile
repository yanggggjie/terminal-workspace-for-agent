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

# Release: bump → sync skills → commit → tag → npm publish → push
# Usage: just release patch | minor | major
release level:
    npm run release -- {{level}}

# Build and link global `tta` for local testing
link:
    npm install
    npm run build
    -npm uninstall -g terminal-tool-for-agents
    npm link --force
    @echo "Linked. Run \`just dev\` in one terminal, then \`tta\` / \`tta sess watch\` in another."

# Remove global link/install; reinstall from npm if published
unlink:
    -npm uninstall -g terminal-tool-for-agents
    -npm install -g terminal-tool-for-agents --registry=https://registry.npmjs.org/
    @echo "Global link removed. If install failed (404), the package is not on npm yet — use \`just link\` for local dev."
