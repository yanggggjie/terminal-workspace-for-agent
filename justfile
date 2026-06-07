# tta local dev — run `just` to list recipes
#
#   just install-dev-version — build + npm install -g . (local repo → global `tta`)
#   just install-npm-version — npm install -g terminal-tool-for-agents (restore published release)

_default:
    @just --list

# Full build → dist/
build:
    npm run build

# Build + global install from this repo (postinstall runs `tta sess killall`)
install-dev-version:
    npm install
    npm run build
    npm install -g .

# Reinstall the published npm release (postinstall runs `tta sess killall`)
install-npm-version:
    npm install -g terminal-tool-for-agents

# Build + pack sanity checks
test:
    npm test

# Release: bump → sync skills → commit → tag → npm publish → push
# Usage: just release patch | minor | major
release level:
    npm run release -- {{level}}
