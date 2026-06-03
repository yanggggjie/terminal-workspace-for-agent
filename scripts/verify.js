#!/usr/bin/env node
/**
 * Build and verify the npm tarball includes runtime assets.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const required = [
  "dist/cli.js",
  "dist/server.js",
  "dist/watch-ui/index.html",
  "dist/watch-ui/app.js",
  "dist/watch-ui/logo.png",
  "dist/watch-ui/vendor/xterm.css",
  "dist/watch-ui/vendor/xterm.js",
  "skills/twa/SKILL.md",
];

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

run("npm run build");

for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    process.stderr.write(`verify: missing ${rel}\n`);
    process.exit(1);
  }
}

const { version: pkgVersion } = require(path.join(root, "package.json"));
const skillContent = fs.readFileSync(path.join(root, "skills/twa/SKILL.md"), "utf8");
const skillVersion = skillContent.match(/^version:\s*(.+)$/m)?.[1]?.trim();
if (skillVersion !== pkgVersion) {
  process.stderr.write(
    `verify: skills/twa/SKILL.md version (${skillVersion ?? "missing"}) must match package.json (${pkgVersion})\n`
  );
  process.exit(1);
}

const dryRun = execSync("npm pack --dry-run 2>&1", { cwd: root, encoding: "utf8" });
for (const rel of ["dist/watch-ui/index.html", "dist/cli.js", "skills/twa/SKILL.md"]) {
  if (!dryRun.includes(rel.replace(/^\//, ""))) {
    process.stderr.write(`verify: npm pack does not include ${rel}\n`);
    process.exit(1);
  }
}

process.stdout.write("verify: ok\n");
