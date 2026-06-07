#!/usr/bin/env node
/**
 * Watch UI dev: run server with TTA_DEV=1 (static files from src/watch-ui/).
 * Backend changes: run `just install` to rebuild and reinstall global `tta`.
 */
import { execSync, spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = (name) => path.join(root, "node_modules", ".bin", name);

execSync("npm run build", { cwd: root, stdio: "inherit" });

const env = { ...process.env, TTA_DEV: "1" };

const child = spawn(
  bin("nodemon"),
  [
    "--watch",
    "src/watch-ui",
    "--watch",
    "dist/server.js",
    "--ext",
    "js,html,css",
    "--delay",
    "200ms",
    "dist/server.js",
  ],
  { cwd: root, stdio: "inherit", env }
);

function shutdown() {
  child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
