#!/usr/bin/env node
/**
 * Release to npm: verify → version bump → sync skills → git commit + tag → publish → push.
 * Usage: npm run release -- patch|minor|major
 *
 * Uses `npm version --no-git-tag-version` because npm's built-in git commit only
 * includes package.json, not files updated by the "version" lifecycle (skill frontmatter).
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const skillPaths = require("./skill-paths.js");

const level = process.argv[2];
const allowed = ["patch", "minor", "major"];

if (!allowed.includes(level)) {
  process.stderr.write(`Usage: npm run release -- ${allowed.join("|")}\n`);
  process.exit(1);
}

function run(cmd, opts = {}) {
  execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
}

function out(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}

const dirty = out("git status --porcelain");
if (dirty) {
  process.stderr.write("release: working tree is not clean — commit or stash first\n");
  process.exit(1);
}

run("node scripts/verify.js");
// Bump package.json + run sync-skill-version via "version" hook; skip npm's partial git commit.
run(`npm version ${level} --no-git-tag-version`);

const version = require(path.join(root, "package.json")).version;
const tag = `v${version}`;
const filesToCommit = ["package.json", "package-lock.json", ...skillPaths].join(" ");

run(`git add ${filesToCommit}`);
if (out("git diff --cached --name-only")) {
  run(`git commit -m "${version}"`);
} else {
  process.stderr.write("release: nothing to commit after version bump\n");
  process.exit(1);
}

try {
  out(`git rev-parse -q --verify refs/tags/${tag}`);
  process.stderr.write(`release: tag ${tag} already exists\n`);
  process.exit(1);
} catch {
  run(`git tag ${tag}`);
}

run("npm publish");
run("git push && git push --tags");

const skillUrl =
  "https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md";
process.stdout.write(`\nrelease: published terminal-tool-for-agents@${version}\n`);
process.stdout.write(`release: git tag     ${tag}\n`);
process.stdout.write(`release: skill URL   ${skillUrl}\n`);
