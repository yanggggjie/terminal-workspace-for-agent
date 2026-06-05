#!/usr/bin/env node
/**
 * Dev orchestrator: tsc --watch + nodemon server.
 * - Backend: dist/*.js changes → server restart
 * - Frontend: TTA_DEV=1 → server serves src/watch-ui/ (save + browser refresh)
 * - Writes .tta-dev marker so linked CLI skips auto-spawn
 */
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const marker = path.join(root, ".tta-dev");
const bin = (name) => path.join(root, "node_modules", ".bin", name);

function removeMarker() {
  try {
    fs.unlinkSync(marker);
  } catch {
    /* ignore */
  }
}

execSync(bin("tsc"), { cwd: root, stdio: "inherit" });

fs.writeFileSync(marker, "");

const env = { ...process.env, TTA_DEV: "1" };

const nodemonArgs = [
  "--watch",
  "dist",
  "--ext",
  "js",
  "--delay",
  "200ms",
  "--ignore",
  "dist/cli.js",
  "--ignore",
  "dist/client.js",
  "dist/server.js",
];

const child = spawn(
  bin("concurrently"),
  [
    "-k",
    "-n",
    "tsc,server",
    "-c",
    "blue,green",
    `${bin("tsc")} --watch`,
    `${bin("nodemon")} ${nodemonArgs.join(" ")}`,
  ],
  { cwd: root, stdio: "inherit", env }
);

function shutdown() {
  removeMarker();
  child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code) => {
  removeMarker();
  process.exit(code ?? 0);
});
