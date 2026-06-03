#!/usr/bin/env node
/**
 * Sync @xterm/xterm browser assets into src/watch-ui/vendor for npm bundle.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const xtermRoot = path.join(root, "node_modules", "@xterm", "xterm");
const vendorDir = path.join(root, "src", "watch-ui", "vendor");

const copies = [
  ["css/xterm.css", "xterm.css"],
  ["lib/xterm.js", "xterm.js"],
];

if (!fs.existsSync(xtermRoot)) {
  process.stderr.write("copy-watch-vendor: run npm install first\n");
  process.exit(1);
}

fs.mkdirSync(vendorDir, { recursive: true });
for (const [from, to] of copies) {
  const src = path.join(xtermRoot, from);
  const dest = path.join(vendorDir, to);
  if (!fs.existsSync(src)) {
    process.stderr.write(`copy-watch-vendor: missing ${src}\n`);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
}

process.stdout.write("copy-watch-vendor: ok\n");
