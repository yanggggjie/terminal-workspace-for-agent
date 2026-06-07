# tta local dev — run `just` to list recipes
#
#   just install — build + npm install -g . (test global `tta` after code changes)
#   just dev     — watch-ui dev server (TTA_DEV=1, serves src/watch-ui/)

_default:
    @just --list

# Full build → dist/
build:
    npm run build

# Build + global install from this repo
install:
    npm install
    npm run build
    npm install -g .

# Watch UI dev: server with src/watch-ui/ (optional; backend changes need `just install`)
dev:
    npm run dev

# Build + pack sanity checks
test:
    npm test

# Release: bump → sync skills → commit → tag → npm publish → push
# Usage: just release patch | minor | major
release level:
    npm run release -- {{level}}
