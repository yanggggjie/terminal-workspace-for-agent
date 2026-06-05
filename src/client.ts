/**
 * CLI → server HTTP client. Auto-starts the server if needed.
 */
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { SERVER_URL } from "./server";
import { Request, Response } from "./protocol";

const SERVER_START_TIMEOUT_MS = 3000;
const SERVER_POLL_INTERVAL_MS = 100;
const HEALTH_TIMEOUT_MS = 500;

function info(msg: string): void {
  process.stderr.write(`tta: ${msg}\n`);
}

function isDevMode(): boolean {
  return fs.existsSync(path.join(__dirname, "..", ".tta-dev"));
}

export async function ensureServerRunning(): Promise<void> {
  if (await isServerReachable()) return;

  if (isDevMode()) {
    throw new Error(
      "Dev server is not running.\n" +
        "  Start it in the project root: just dev\n" +
        "  Then run tta commands in another terminal."
    );
  }

  info("starting server...");
  await spawnServer();
}

export async function sendRequest(req: Request): Promise<Response> {
  await ensureServerRunning();
  const res = await fetch(`${SERVER_URL}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`Server HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<Response>;
}

async function isServerReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

async function spawnServer(): Promise<void> {
  const serverScript = path.join(__dirname, "server.js");
  if (!fs.existsSync(serverScript)) {
    throw new Error(`Server script not found: ${serverScript}`);
  }

  const child = child_process.spawn(process.execPath, [serverScript], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  child.on("error", (e) => info(`failed to spawn server: ${e.message}`));
  child.unref();

  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
  let attempts = 0;
  while (Date.now() < deadline) {
    await sleep(SERVER_POLL_INTERVAL_MS);
    attempts++;
    if (await isServerReachable()) {
      info(`server ready (${attempts * SERVER_POLL_INTERVAL_MS}ms)`);
      return;
    }
  }

  throw new Error(
    `Server failed to start after ${SERVER_START_TIMEOUT_MS}ms\n` +
      `  Check if port 7654 is in use or see stderr for errors`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
