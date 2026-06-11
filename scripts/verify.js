#!/usr/bin/env node
/**
 * Build and verify the npm tarball includes runtime assets.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const skillPaths = require("./skill-paths.js");
const required = [
  "dist/cli.js",
  "dist/server.js",
  "dist/watch-ui/index.html",
  "dist/watch-ui/app.js",
  "dist/watch-ui/logo.png",
  "dist/watch-ui/vendor/xterm.css",
  "dist/watch-ui/vendor/xterm.js",
  "skills/tta/SKILL.md",
  "skills/tta/tta-agents-skill.md",
];

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

run("npm run build");

const { findNodePtyRoot } = require("./install.js");
const ptyRoot = findNodePtyRoot(root);
if (!ptyRoot) {
  process.stderr.write("verify: node-pty not found\n");
  process.exit(1);
}

for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    process.stderr.write(`verify: missing ${rel}\n`);
    process.exit(1);
  }
}

const { version: pkgVersion } = require(path.join(root, "package.json"));
for (const rel of skillPaths) {
  const skillContent = fs.readFileSync(path.join(root, rel), "utf8");
  const skillVersion = skillContent.match(/^version:\s*(.+)$/m)?.[1]?.trim();
  if (skillVersion !== pkgVersion) {
    process.stderr.write(
      `verify: ${rel} version (${skillVersion ?? "missing"}) must match package.json (${pkgVersion})\n`
    );
    process.exit(1);
  }
}

const dryRun = execSync("npm pack --dry-run 2>&1", { cwd: root, encoding: "utf8" });
for (const rel of [
  "dist/watch-ui/index.html",
  "dist/cli.js",
  "scripts/install.js",
  "skills/tta/SKILL.md",
  "skills/tta/tta-agents-skill.md",
  "README.md",
]) {
  if (!dryRun.includes(rel.replace(/^\//, ""))) {
    process.stderr.write(`verify: npm pack does not include ${rel}\n`);
    process.exit(1);
  }
}

for (const rel of [
  "skills/tta/zh/SKILL.md",
  "skills/tta/zh/tta-agents-skill.md",
  "docs/zh/tta-agents-docs.md",
  "docs/zh/tta-agents-orchestrator.md",
  "docs/tta-agents-docs.md",
  "docs/tta-agents-orchestrator.md",
]) {
  if (dryRun.includes(rel)) {
    process.stderr.write(`verify: npm pack must not include ${rel}\n`);
    process.exit(1);
  }
}

process.stdout.write("verify: ok\n");
