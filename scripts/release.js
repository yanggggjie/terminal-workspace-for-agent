#!/usr/bin/env node
/**
 * Release to npm: verify → version bump (sync skills, git commit, tag) → publish → push.
 * Usage: npm run release -- patch|minor|major
 */
const { execSync } = require("child_process");

const level = process.argv[2];
const allowed = ["patch", "minor", "major"];

if (!allowed.includes(level)) {
  process.stderr.write(`Usage: npm run release -- ${allowed.join("|")}\n`);
  process.exit(1);
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function out(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const dirty = out("git status --porcelain");
if (dirty) {
  process.stderr.write("release: working tree is not clean — commit or stash first\n");
  process.exit(1);
}

run("node scripts/verify.js");
// npm version: bump package.json, run sync-skill-version (en + zh), git commit, tag vX.Y.Z
run(`npm version ${level}`);
run("npm publish");
run("git push && git push --tags");

const version = require("../package.json").version;
const tag = out(`git describe --tags --exact-match HEAD`);
const skillUrl =
  "https://raw.githubusercontent.com/yanggggjie/terminal-tool-for-agents/main/skills/tta/SKILL.md";
process.stdout.write(`\nrelease: published terminal-tool-for-agents@${version}\n`);
process.stdout.write(`release: git tag     ${tag}\n`);
process.stdout.write(`release: skill URL   ${skillUrl}\n`);
