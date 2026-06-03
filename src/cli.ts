#!/usr/bin/env node
/**
 * twa CLI — sess (session lifecycle), act (input), obs (read screen).
 * Options use --name=value syntax.
 */
import * as path from "path";
import { Command } from "commander";
import { ensureServerRunning, sendRequest } from "./client";
import { SERVER_URL } from "./server";
import { validateSessionName } from "./session";
import { SUPPORTED_KEYS } from "./keys";
import { Response, ErrorResponse, ScreenResponse } from "./protocol";
import { version } from "../package.json";

const COMMAND_NAME = "twa";
const SCROLL_DIRECTIONS = ["up", "down", "top", "bottom"] as const;
type ScrollDirection = (typeof SCROLL_DIRECTIONS)[number];

const program = new Command();

const START_EXAMPLE = 'twa sess start --sess=dev --cmd="npm run dev"';

program
  .name(COMMAND_NAME)
  .description("Tool for agents to operate interactive CLI, TUI, and agent REPLs via PTY")
  .addHelpText(
    "beforeAll",
    "twa is short for terminal-workspace-for-agent.\n" +
      "Use twa for interactive programs (prompts, TUI, agent CLIs) — not plain bash.\n"
  )
  .addHelpText(
    "afterAll",
    "\n" +
      "Three APIs:\n" +
      "  sess start / kill / killall / list / keys / watch   session lifecycle\n" +
      "  act send text / key                                send input (stdout: success | error: …)\n" +
      "  obs screen now / stable / scroll                   read screen (stdout: screen text)\n" +
      "\n" +
      "Workflow:  sess start  →  (act → obs screen stable)*  →  sess kill\n" +
      "Observability: agents use obs; humans use sess watch.\n" +
      "Docs: https://github.com/yanggggjie/terminal-workspace-for-agent\n"
  )
  .version(version);

function parseCommandArgv(command: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) {
        quote = null;
        continue;
      }
      current += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (/\s/.test(c)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += c;
  }

  if (current) args.push(current);
  return args;
}

function replySuccess(): void {
  console.log("success");
}

function replyError(message: string): never {
  console.log(`error: ${message}`);
  process.exit(1);
}

function requireSession(sess: string): string {
  const err = validateSessionName(sess);
  if (err) replyError(err);
  return sess;
}

function requireCommandArgv(cmd: string): string[] {
  const argv = parseCommandArgv(cmd.trim());
  if (argv.length === 0) {
    replyError(`--cmd= must not be empty. Example: ${START_EXAMPLE}`);
  }
  return argv;
}

function requireScrollDirection(dir: string): ScrollDirection {
  if ((SCROLL_DIRECTIONS as readonly string[]).includes(dir)) {
    return dir as ScrollDirection;
  }
  replyError(`--dire= must be one of: ${SCROLL_DIRECTIONS.join(", ")}`);
}

function handleOp(res: Response): void {
  if (res.type === "error") replyError((res as ErrorResponse).message);
  replySuccess();
}

function handleObs(res: Response): void {
  if (res.type === "error") replyError((res as ErrorResponse).message);
  if (res.type !== "screen") replyError("expected screen response");
  const screen = (res as ScreenResponse).screen;
  if (screen) console.log(screen);
}

// --- sess: session lifecycle ---

const sess = program
  .command("sess")
  .description("Session lifecycle — start, kill, list, watch (stdout: success | error: …, except list/keys/watch)");

sess
  .command("start")
  .description("Start a session — run an interactive program in a PTY")
  .requiredOption("--sess <name>", "Session name (--sess=dev)")
  .requiredOption("--cmd <command>", 'Command line (--cmd="npm run dev")')
  .option("--cwd <path>", "Working directory (default: current directory; --cwd=./path)")
  .action(async (options: { sess: string; cmd: string; cwd?: string }) => {
    const res = await sendRequest({
      type: "start",
      session_name: requireSession(options.sess),
      command: requireCommandArgv(options.cmd),
      cwd: path.resolve(options.cwd ?? process.cwd()),
    });
    handleOp(res);
  });

sess
  .command("kill")
  .description("Kill a session")
  .requiredOption("--sess <name>", "Session name (--sess=dev)")
  .action(async (options: { sess: string }) => {
    const res = await sendRequest({
      type: "kill",
      session_name: requireSession(options.sess),
    });
    handleOp(res);
  });

sess
  .command("killall")
  .description("Kill all sessions")
  .action(async () => {
    handleOp(await sendRequest({ type: "killall" }));
  });

sess
  .command("list")
  .description("List running sessions (exited processes are removed automatically)")
  .action(async () => {
    const res = await sendRequest({ type: "list" });
    if (res.type === "error") replyError(res.message);
    if (res.type !== "list") replyError("expected list response");
    if (res.sessions.length === 0) {
      console.log("No active sessions");
      return;
    }
    for (const s of res.sessions) console.log(s.session_name);
  });

sess
  .command("keys")
  .description("List key names for `twa act send key`")
  .action(() => {
    console.log(SUPPORTED_KEYS.join(", "));
  });

sess
  .command("watch")
  .description("Human-only: watch sessions in the browser (read-only)")
  .action(async () => {
    await runWatchServer();
  });

// --- act: input to a running session ---

const act = program
  .command("act")
  .description("Send input to a running session (stdout: success | error: …)");

const send = act.command("send").description("Send text or key input to a session");

send
  .command("text")
  .description("Type text (\\n = Enter, \\t = Tab)")
  .requiredOption("--sess <name>", "Session name (--sess=dev)")
  .requiredOption("--txt <text>", "Text to type (--txt=hello)")
  .action(async (options: { sess: string; txt: string }) => {
    handleOp(
      await sendRequest({
        type: "send_text",
        session_name: requireSession(options.sess),
        text: options.txt,
      })
    );
  });

send
  .command("key")
  .description("Press a key (enter, escape, ctrl+c, arrow_up, …)")
  .requiredOption("--sess <name>", "Session name (--sess=dev)")
  .requiredOption("--key <key>", "Key name (--key=enter)")
  .action(async (options: { sess: string; key: string }) => {
    handleOp(
      await sendRequest({
        type: "send_key",
        session_name: requireSession(options.sess),
        key: options.key,
      })
    );
  });

// --- obs: read screen from a running session ---

const obs = program
  .command("obs")
  .description("Read screen from a running session (stdout: screen text | error: …)");

const screen = obs.command("screen").description("Read terminal screen content");

screen
  .command("now")
  .description("Print the current screen immediately")
  .requiredOption("--sess <name>", "Session name (--sess=dev)")
  .action(async (options: { sess: string }) => {
    handleObs(
      await sendRequest({
        type: "screen_now",
        session_name: requireSession(options.sess),
      })
    );
  });

screen
  .command("stable")
  .description("Wait until the screen is stable, then print it")
  .requiredOption("--sess <name>", "Session name (--sess=dev)")
  .action(async (options: { sess: string }) => {
    handleObs(
      await sendRequest({
        type: "screen_stable",
        session_name: requireSession(options.sess),
      })
    );
  });

screen
  .command("scroll")
  .description("Scroll viewport, then print screen")
  .requiredOption("--sess <name>", "Session name (--sess=dev)")
  .requiredOption("--dire <direction>", "Scroll direction: up, down, top, bottom (--dire=up)")
  .action(async (options: { sess: string; dire: string }) => {
    handleObs(
      await sendRequest({
        type: "screen_scroll",
        session_name: requireSession(options.sess),
        direction: requireScrollDirection(options.dire),
      })
    );
  });

async function runWatchServer(): Promise<void> {
  if (!process.stdout.isTTY) {
    process.stderr.write(
      "Error: twa sess watch is for human observation only. Agents must not run this command.\n"
    );
    process.exit(1);
  }

  await ensureServerRunning();

  const res = await sendRequest({ type: "list" });
  if (res.type === "error") {
    process.stderr.write(`Error: ${res.message}\n`);
    process.exit(1);
  }

  process.stderr.write("twa sess watch — read-only session observer (Ctrl+C to exit)\n");
  console.log(SERVER_URL);

  await new Promise<void>((resolve) => {
    const stop = () => resolve();
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  });
}

const argv = process.argv.slice(2);
if (argv.length === 0) {
  program.outputHelp();
  process.exit(0);
}

program.parseAsync(process.argv).catch((err) => {
  replyError(err.message);
});
