/**
 * twa server — Fastify HTTP/WebSocket, watch UI static files, lifecycle, and entry point.
 */
import * as path from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import { Session, SESSION_NAME_PATTERN } from "./session";
import {
  armIdleTimer,
  handleRequest,
  killAllSessions,
  resolveSession,
  setShutdownIfEmpty,
} from "./handlers";
import { Request } from "./protocol";

const WS_OPEN = 1;

export const SERVER_HOST = "127.0.0.1";
export const SERVER_PORT = 7654;
export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

const UI_DIR = path.join(__dirname, "watch-ui");

interface StreamInit {
  session_name: string;
  replay: string;
  cols: number;
  rows: number;
}

interface SessionRelay {
  clients: Set<WebSocket>;
  unsubData: (() => void) | null;
  unsubExit: (() => void) | null;
  init: StreamInit | null;
}

const relays = new Map<string, SessionRelay>();

function wsSend(ws: WebSocket, payload: object): void {
  if (ws.readyState === WS_OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getRelay(sessionName: string): SessionRelay {
  let relay = relays.get(sessionName);
  if (!relay) {
    relay = { clients: new Set(), unsubData: null, unsubExit: null, init: null };
    relays.set(sessionName, relay);
  }
  return relay;
}

function stopRelay(sessionName: string, relay: SessionRelay): void {
  relay.unsubData?.();
  relay.unsubExit?.();
  relay.unsubData = null;
  relay.unsubExit = null;
  relays.delete(sessionName);
}

function ensureSessionStream(sessionName: string, relay: SessionRelay): void {
  if (relay.unsubData) return;

  const sessionOrError = resolveSession(sessionName);
  if ("type" in sessionOrError) {
    for (const client of relay.clients) {
      wsSend(client, { type: "error", message: sessionOrError.message });
    }
    return;
  }

  const session: Session = sessionOrError;
  relay.init = {
    session_name: sessionName,
    replay: session.getStreamReplay(),
    cols: session.cols,
    rows: session.rows,
  };

  for (const client of relay.clients) {
    wsSend(client, { type: "init", ...relay.init });
  }

  relay.unsubData = session.onStream((data) => {
    for (const client of relay.clients) {
      wsSend(client, { type: "data", data });
    }
  });

  relay.unsubExit = session.onExit(() => {
    for (const client of relay.clients) {
      wsSend(client, { type: "end" });
    }
    stopRelay(sessionName, relay);
  });

  if (session.status === "exited") {
    for (const client of relay.clients) {
      wsSend(client, { type: "end" });
    }
    stopRelay(sessionName, relay);
  }
}

function attachWebSocketClient(sessionName: string, ws: WebSocket): void {
  const relay = getRelay(sessionName);
  relay.clients.add(ws);
  ensureSessionStream(sessionName, relay);

  if (relay.init) {
    wsSend(ws, { type: "init", ...relay.init });
  }

  ws.on("close", () => {
    relay.clients.delete(ws);
    if (relay.clients.size === 0) {
      stopRelay(sessionName, relay);
    }
  });
}

async function buildApp() {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({ ok: true }));

  app.post<{ Body: Request }>("/rpc", async (request, reply) => {
    try {
      return await handleRequest(request.body);
    } catch (err) {
      reply.code(400);
      return {
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });

  await app.register(fastifyWebsocket);

  app.get<{ Params: { sessionName: string } }>(
    "/ws/:sessionName",
    { websocket: true },
    (socket, request) => {
      const { sessionName } = request.params;
      if (!SESSION_NAME_PATTERN.test(sessionName)) {
        socket.close();
        return;
      }
      attachWebSocketClient(sessionName, socket);
    }
  );

  await app.register(fastifyStatic, {
    root: UI_DIR,
    prefix: "/",
    index: ["index.html"],
  });

  return app;
}

function formatListenError(err: NodeJS.ErrnoException): string {
  let message = `server error: ${err.message}`;
  if (err.code === "EADDRINUSE") {
    message += `\n  Port ${SERVER_PORT} is already in use.`;
  } else if (err.code === "EACCES") {
    message += `\n  Permission denied on port ${SERVER_PORT}.`;
  }
  return message;
}

async function startServer(): Promise<void> {
  const app = await buildApp();
  let shuttingDown = false;

  function shutdown(): void {
    if (shuttingDown) return;
    shuttingDown = true;
    killAllSessions({ fromShutdown: true });
    void app.close().finally(() => process.exit(0));
  }

  setShutdownIfEmpty(() => {
    setImmediate(() => shutdown());
  });

  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, shutdown);
  }

  process.on("uncaughtException", (err) => {
    process.stderr.write(`[server] uncaught exception: ${err.message}\n`);
    shutdown();
  });

  try {
    await app.listen({ host: SERVER_HOST, port: SERVER_PORT });
    process.stderr.write(`twa server started (${SERVER_URL})\n`);
  } catch (err) {
    process.stderr.write(`${formatListenError(err as NodeJS.ErrnoException)}\n`);
    process.exit(1);
  }

  armIdleTimer();
}

if (require.main === module) {
  startServer().catch((err) => {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
