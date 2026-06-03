#!/usr/bin/env node
/**
 * Release to npm: verify → version bump → publish.
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

const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim();
if (dirty) {
  process.stderr.write("release: working tree is not clean — commit or stash first\n");
  process.exit(1);
}

run("node scripts/verify.js");
run(`npm version ${level}`);
run("npm publish");

const version = require("../package.json").version;
const skillUrl =
  "https://raw.githubusercontent.com/yanggggjie/terminal-workspace-for-agent/main/skills/twa/SKILL.md";
process.stdout.write(`\nrelease: published terminal-workspace-for-agent@${version}\n`);
process.stdout.write(`release: skill URL  ${skillUrl}\n`);
process.stdout.write("release: run  git push && git push --tags\n");
