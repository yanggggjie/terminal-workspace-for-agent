#!/usr/bin/env node
/**
 * twa CLI — sess (session lifecycle), act (input), obs (read screen).
 * Options use --name=value syntax.
 */
import * as path from "path";
import * as fs from "fs";
import { Command } from "commander";
import { ensureServerRunning, sendRequest } from "./client";
import { SERVER_URL } from "./server";
import { validateSessionName } from "./session";
import { SUPPORTED_KEYS } from "./keys";
import { Response, ErrorResponse, ScreenResponse } from "./protocol";
import { version } from "../package.json";

const COMMAND_NAME = "twa";
const TOP_LEVEL_COMMANDS = new Set(["sess", "act", "obs", "help"]);
const DOCS_URL = "https://github.com/yanggggjie/terminal-workspace-for-agent";
const SCROLL_DIRECTIONS = ["up", "down", "top", "bottom"] as const;
type ScrollDirection = (typeof SCROLL_DIRECTIONS)[number];

const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function bold(s: string): string {
  return `${BOLD}${s}${RESET}`;
}

const HELP_API = `
${bold("API")}    ${bold("Commands")}                              ${bold("Example")}
${bold("sess")}   start, kill, killall, list, keys      twa sess start --sess=dev --cmd="npm run dev"
${bold("act")}    send text, send key                   twa act send text --sess=dev --text=hello
${bold("obs")}    screen now, stable, scroll            twa obs screen stable --sess=dev

${bold("Workflow")}:  sess start  →  (act → obs screen stable)*  →  sess kill
${bold("Watch UI")}:  twa sess watch  (humans only — agents use obs)
${bold("Docs")}:      ${DOCS_URL}
`;

const program = new Command();

const START_EXAMPLE = 'twa sess start --sess=dev --cmd="npm run dev"';

function firstPositionalArg(args: string[]): string | undefined {
  for (const a of args) {
    if (!a.startsWith("-")) return a;
  }
  return undefined;
}

function warnWrongTopLevel(got: string): void {
  process.stderr.write(
    `${RED}Unknown top-level command "${got}". Use twa sess, twa act, or twa obs.${RESET}\n\n`
  );
}

function printHelp(): void {
  program.outputHelp();
}

program
  .name(COMMAND_NAME)
  .description("Tool for agents to operate interactive CLI, TUI, and agent REPLs via PTY")
  .addHelpText(
    "beforeAll",
    "twa is short for terminal-workspace-for-agent.\n" +
      "Use twa for interactive programs (prompts, TUI, agent CLIs) — not plain bash.\n"
  )
  .addHelpText("afterAll", HELP_API)
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

function requireTextInput(options: { text?: string; file?: string }): string {
  const hasText = options.text !== undefined;
  const hasFile = options.file !== undefined;
  if (hasText && hasFile) {
    replyError("Use either --text= or --file=, not both");
  }
  if (!hasText && !hasFile) {
    replyError("Missing text input. Use --text=<text> or --file=<path>");
  }
  const file = options.file;
  if (file !== undefined) {
    const filePath = path.resolve(file);
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch (e: unknown) {
      const reason = e instanceof Error ? e.message : String(e);
      replyError(`Cannot read --file=${filePath}: ${reason}`);
    }
  }
  return options.text ?? "";
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
  .description("Type text from --text or a UTF-8 file from --file")
  .requiredOption("--sess <name>", "Session name (--sess=dev)")
  .option("--text <text>", "Text to type (--text=hello)")
  .option("--file <path>", "Read text from a UTF-8 file (--file=/tmp/prompt.txt)")
  .action(async (options: { sess: string; text?: string; file?: string }) => {
    handleOp(
      await sendRequest({
        type: "send_text",
        session_name: requireSession(options.sess),
        text: requireTextInput(options),
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
  printHelp();
  process.exit(0);
}

const top = firstPositionalArg(argv);
if (top && !TOP_LEVEL_COMMANDS.has(top)) {
  warnWrongTopLevel(top);
  printHelp();
  process.exit(1);
}

program.exitOverride();

program.parseAsync(process.argv).catch((err: Error & { code?: string }) => {
  if (err.code?.startsWith("commander.")) {
    printHelp();
    process.exit(1);
  }
  replyError(err.message ?? String(err));
});
