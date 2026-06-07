#!/usr/bin/env node
/**
 * Post-install: set up node-pty native bindings.
 * Copies bundled prebuilds into build/Release (+ chmod on Unix), or rebuilds from source.
 * Does not rely on node-pty install scripts (npm 11 may block dependency scripts).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

const PKG = "tta";
const root = path.join(__dirname, "..");
const platformKey = `${process.platform}-${process.arch}`;

function findNodePtyRoot(fromDir = root) {
  try {
    return path.dirname(require.resolve("node-pty/package.json", { paths: [fromDir] }));
  } catch {
    return null;
  }
}

function log(msg) {
  process.stdout.write(`[${PKG}] ${msg}\n`);
}

function testNodePty(nodePtyDir) {
  const tmpScript = path.join(os.tmpdir(), `${PKG}-test-pty-${process.pid}.js`);
  try {
    fs.writeFileSync(
      tmpScript,
      `
const pty = require(${JSON.stringify(nodePtyDir)});
const shell = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "/bin/sh";
const args = process.platform === "win32" ? ["/c", "exit /b 0"] : ["-c", "exit 0"];
const p = pty.spawn(shell, args, { name: "xterm", cols: 80, rows: 24 });
p.kill();
`
    );
    execSync(`node ${JSON.stringify(tmpScript)}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  } finally {
    try {
      fs.unlinkSync(tmpScript);
    } catch {
      // ignore
    }
  }
}

function copyEntry(src, dest, entry) {
  if (entry.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src, { withFileTypes: true })) {
      copyEntry(path.join(src, child.name), path.join(dest, child.name), child);
    }
    return;
  }
  fs.copyFileSync(src, dest);
  if (process.platform !== "win32") {
    const mode = fs.statSync(dest).mode;
    if ((mode & 0o111) === 0 && (entry.name.endsWith(".node") || entry.name === "spawn-helper")) {
      fs.chmodSync(dest, mode | 0o755);
    }
  }
}

function installPrebuild(nodePtyDir) {
  const prebuildDir = path.join(nodePtyDir, "prebuilds", platformKey);
  const prebuildPty = path.join(prebuildDir, "pty.node");
  if (!fs.existsSync(prebuildPty)) {
    log(`No prebuild for ${platformKey}`);
    return false;
  }

  const targetDir = path.join(nodePtyDir, "build", "Release");
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    for (const entry of fs.readdirSync(prebuildDir, { withFileTypes: true })) {
      copyEntry(path.join(prebuildDir, entry.name), path.join(targetDir, entry.name), entry);
    }
    log(`Installed prebuilt binary for ${platformKey}`);
    return true;
  } catch (err) {
    process.stderr.write(`[${PKG}] Failed to install prebuild: ${err.message}\n`);
    return false;
  }
}

function buildFromSource(nodePtyDir) {
  log("Building node-pty from source (this may take a minute)...");
  try {
    execSync("npx node-gyp rebuild", { stdio: "inherit", cwd: nodePtyDir });
    return true;
  } catch {
    return false;
  }
}

function exitWithBuildError() {
  const fixes = {
    darwin: "  xcode-select --install\n  npm install -g terminal-tool-for-agents",
    linux:
      "  sudo apt-get install build-essential python3 g++\n  npm install -g terminal-tool-for-agents",
  };
  const fix = fixes[process.platform] ?? "  npm install -g terminal-tool-for-agents";
  process.stderr.write(
    `[${PKG}] node-pty native binding failed to load.\n\n[${PKG}] To fix:\n${fix}\n`
  );
  process.exit(1);
}

function killallSessions() {
  try {
    execSync("tta sess killall", { stdio: "ignore" });
  } catch {
    // no server or nothing to kill
  }
}

function ensureNodePty(nodePtyDir) {
  log(`Platform: ${platformKey}`);

  if (testNodePty(nodePtyDir)) {
    log("node-pty is ready");
    return;
  }

  if (installPrebuild(nodePtyDir) && testNodePty(nodePtyDir)) {
    log("Prebuilt binary works");
    return;
  }

  if (buildFromSource(nodePtyDir) && testNodePty(nodePtyDir)) {
    log("node-pty built successfully");
    return;
  }

  exitWithBuildError();
}

if (require.main === module) {
  const nodePtyDir = findNodePtyRoot();
  if (!nodePtyDir) {
    process.stderr.write(`[${PKG}] node-pty not found\n`);
    process.exit(1);
  }
  ensureNodePty(nodePtyDir);
  killallSessions();
}

module.exports = { findNodePtyRoot, testNodePty, ensureNodePty, killallSessions };
