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
  "skills/tta/SKILL.md",
  "skills/tta/tta-agents-skill.md",
];

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function cliOut(shellCmd) {
  try {
    return execSync(shellCmd, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: "/bin/bash",
    });
  } catch (e) {
    return `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
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
for (const rel of ["skills/tta/SKILL.md", "skills/tta/tta-agents-skill.md"]) {
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
  "docs/README.zh.md",
  "skills/tta/SKILL.zh.md",
  "skills/tta/tta-agents-skill.zh.md",
  "docs/tta-agents-docs.zh.md",
  "docs/tta-agents-docs.md",
]) {
  if (dryRun.includes(rel)) {
    process.stderr.write(`verify: npm pack must not include ${rel}\n`);
    process.exit(1);
  }
}

verifyStdinTextInput();
verifyStartOptions();

process.stdout.write("verify: ok\n");

function verifyStdinTextInput() {
  let out = "";
  try {
    out = execSync(`printf 'stdin-ok' | node dist/cli.js act send text --sess=stdin-verify`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  if (out.includes("Missing text input")) {
    process.stderr.write("verify: act send text must accept stdin (heredoc/pipe)\n");
    process.exit(1);
  }

  try {
    execSync(`node dist/cli.js act send text --sess=dev --text=removed`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    process.stderr.write("verify: act send text must not accept --text\n");
    process.exit(1);
  } catch (e) {
    const errOut = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    if (!errOut.includes("unknown option '--text=removed'")) {
      process.stderr.write("verify: expected unknown option error for --text\n");
      process.exit(1);
    }
  }
}

function verifyStartOptions() {
  const cwd = root.replace(/"/g, '\\"');
  const ok = cliOut(
    `node dist/cli.js sess start --sess=quote-test --cmd="lazygit" --cwd="${cwd}"`
  );
  if (ok.includes("too many arguments")) {
    process.stderr.write("verify: quoted sess start should not fail as split args\n");
    process.exit(1);
  }

  const splitCmd = cliOut(
    `node dist/cli.js sess start --sess=quote-test --cmd=npm run dev --cwd="/tmp"`
  );
  if (!splitCmd.includes("too many arguments")) {
    process.stderr.write("verify: unquoted multi-word --cmd= must be rejected (split args)\n");
    process.exit(1);
  }

  const missingCwd = cliOut(`node dist/cli.js sess start --sess=quote-test --cmd="lazygit"`);
  if (!missingCwd.includes("--cwd") || !missingCwd.toLowerCase().includes("required")) {
    process.stderr.write("verify: missing --cwd= must be rejected\n");
    process.exit(1);
  }
}
