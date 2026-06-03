# Local development for twa (terminal-workspace-for-agent).
#
#   just link-global   — build and npm link (use `twa` anywhere)
#   just dev           — tsc --watch; changes apply after save
#   just unlink-global — restore npm registry global install

_default:
    @just --list

# Install dependencies
install:
    npm install

# Build CLI to dist/
build:
    npm run build

# Rebuild on file changes
dev:
    npm run dev

# Build check
check: build

# Remove node_modules, lockfile, and dist
clean:
    npm run clean

# Build and link `twa` globally for local testing
link-global:
    npm install
    npm run build
    -npm uninstall -g terminal-workspace-for-agent
    npm link
    @echo "Global link ready. Keep \`just dev\` running, then run \`twa\` from any directory."

# Restore global twa from npm registry
unlink-global:
    -npm unlink
    npm install -g terminal-workspace-for-agent
    @echo "Restored global twa from npm ($(npm view terminal-workspace-for-agent version))."

# Show which twa binary is active
which-twa:
    @which twa
    @twa --version

# Quick smoke test: drive examples/ask.py
demo-ask:
    twa sess start --sess=demo --cmd="python3 examples/ask.py"
    twa obs screen stable --sess=demo
    twa act send text --sess=demo --txt="Alice"
    twa act send key --sess=demo --key=enter
    twa obs screen stable --sess=demo
    twa sess kill --sess=demo
