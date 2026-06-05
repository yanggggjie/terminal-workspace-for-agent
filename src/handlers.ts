/**
 * PTY session registry and request handlers.
 */
import * as path from "path";
import { Session, validateCwd, validateSessionName } from "./session";
import { resolveKey } from "./keys";
import {
  Request,
  Response,
  StartRequest,
  ScreenNowRequest,
  ScreenStableRequest,
  SendTextRequest,
  SendKeyRequest,
  ScreenScrollRequest,
  KillRequest,
  SessionInfo,
  ErrorResponse,
} from "./protocol";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

const sessions = new Map<string, Session>();
const startingSessions = new Set<string>();
let idleTimer: NodeJS.Timeout | null = null;
let shutdownIfEmpty: (() => void) | null = null;

export function setShutdownIfEmpty(fn: () => void): void {
  shutdownIfEmpty = fn;
}

function maybeShutdownServer(): void {
  if (sessions.size > 0 || startingSessions.size > 0) return;
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  shutdownIfEmpty?.();
}

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (sessions.size === 0 && startingSessions.size === 0) {
      shutdownIfEmpty?.();
    }
  }, IDLE_TIMEOUT_MS);
  idleTimer.unref();
}

/** Keep exited sessions in the registry until sess kill; refresh idle timer on exit. */
function attachSessionExitHook(session: Session): void {
  session.onExit(() => {
    resetIdleTimer();
  });
}

function getSession(name: string): Session | ErrorResponse {
  const nameErr = validateSessionName(name);
  if (nameErr) return { type: "error", message: nameErr };
  const session = sessions.get(name);
  if (!session) return { type: "error", message: `Session not found: ${name}` };
  return session;
}

const SESSION_IN_USE_HINT = (name: string) =>
  `Session "${name}" is already in use. Use a different session name, or run 'tta sess kill --sess=${name}' first.`;

function screenResponse(screen: string): Response {
  return { type: "screen", screen };
}

function checkSessionNameAvailable(name: string): Response | null {
  if (startingSessions.has(name)) {
    return { type: "error", message: SESSION_IN_USE_HINT(name) };
  }
  const existing = sessions.get(name);
  if (existing) {
    if (existing.status === "exited") {
      sessions.delete(name);
      return null;
    }
    return { type: "error", message: SESSION_IN_USE_HINT(name) };
  }
  return null;
}

export function listSessions(): SessionInfo[] {
  return [...sessions.values()].map((s) => s.toInfo());
}

export function resolveSession(name: string): Session | ErrorResponse {
  return getSession(name);
}

export function killAllSessions(options?: { fromShutdown?: boolean }): number {
  const count = sessions.size;
  for (const session of sessions.values()) {
    try {
      session.kill();
    } catch {
      /* ignore */
    }
  }
  sessions.clear();
  startingSessions.clear();
  if (!options?.fromShutdown) maybeShutdownServer();
  return count;
}

function afterSessionRemoved(): void {
  if (sessions.size === 0 && startingSessions.size === 0) {
    maybeShutdownServer();
  } else {
    resetIdleTimer();
  }
}

export function armIdleTimer(): void {
  resetIdleTimer();
}

export async function handleRequest(req: Request): Promise<Response> {
  switch (req.type) {
    case "start": {
      const r = req as StartRequest;
      const nameErr = validateSessionName(r.session_name);
      if (nameErr) return { type: "error", message: nameErr };
      if (typeof r.command !== "string" || !r.command.trim()) {
        return { type: "error", message: "command required (e.g. npm run dev)" };
      }
      const cwdErr = validateCwd(r.cwd);
      if (cwdErr) return { type: "error", message: cwdErr };
      const unavailable = checkSessionNameAvailable(r.session_name);
      if (unavailable) return unavailable;

      startingSessions.add(r.session_name);
      try {
        const session = new Session(r.session_name, r.command.trim(), {
          cwd: path.resolve(r.cwd),
        });
        attachSessionExitHook(session);
        sessions.set(r.session_name, session);
        resetIdleTimer();
        return { type: "ok" };
      } finally {
        startingSessions.delete(r.session_name);
      }
    }

    case "screen_now": {
      const r = req as ScreenNowRequest;
      const sessionOrError = getSession(r.session_name);
      if ("type" in sessionOrError && sessionOrError.type === "error") return sessionOrError;
      return screenResponse((sessionOrError as Session).snapshot());
    }

    case "screen_stable": {
      const r = req as ScreenStableRequest;
      const sessionOrError = getSession(r.session_name);
      if ("type" in sessionOrError && sessionOrError.type === "error") return sessionOrError;
      return screenResponse(await (sessionOrError as Session).waitForStable());
    }

    case "screen_scroll": {
      const r = req as ScreenScrollRequest;
      const sessionOrError = getSession(r.session_name);
      if ("type" in sessionOrError && sessionOrError.type === "error") return sessionOrError;
      const session = sessionOrError as Session;
      session.scroll(r.direction);
      return screenResponse(session.snapshot());
    }

    case "send_text": {
      const r = req as SendTextRequest;
      const sessionOrError = getSession(r.session_name);
      if ("type" in sessionOrError && sessionOrError.type === "error") return sessionOrError;
      const session = sessionOrError as Session;
      try {
        session.send(r.text);
        return { type: "ok" };
      } catch (e: unknown) {
        return { type: "error", message: e instanceof Error ? e.message : String(e) };
      }
    }

    case "send_key": {
      const r = req as SendKeyRequest;
      const sequence = resolveKey(r.key);
      if (!sequence) {
        return { type: "error", message: `Unknown key "${r.key}"` };
      }
      const sessionOrError = getSession(r.session_name);
      if ("type" in sessionOrError && sessionOrError.type === "error") return sessionOrError;
      const session = sessionOrError as Session;
      try {
        session.press(sequence);
        return { type: "ok" };
      } catch (e: unknown) {
        return { type: "error", message: e instanceof Error ? e.message : String(e) };
      }
    }

    case "kill": {
      const r = req as KillRequest;
      const sessionOrError = getSession(r.session_name);
      if ("type" in sessionOrError && sessionOrError.type === "error") return sessionOrError;
      (sessionOrError as Session).kill();
      sessions.delete(r.session_name);
      afterSessionRemoved();
      return { type: "kill", ok: true };
    }

    case "killall":
      return { type: "killall", ok: true, count: killAllSessions() };

    case "list":
      return { type: "list", sessions: listSessions() };

    default:
      return { type: "error", message: "Unknown request type" };
  }
}
