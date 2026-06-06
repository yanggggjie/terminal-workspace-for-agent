#!/usr/bin/env node
/**
 * tta CLI — sess (session lifecycle), act (input), obs (read screen).
 * Options use --name=value syntax.
 */
import * as path from "path";
import * as fs from "fs";
import { Command } from "commander";
import { ensureServerRunning, sendRequest } from "./client";
import { SERVER_URL } from "./server";
import { validateSessionName } from "./session";
import { SUPPORTED_KEYS } from "./keys";
import { Response, ErrorResponse, ScreenResponse, ListResponse } from "./protocol";
import { version } from "../package.json";

const COMMAND_NAME = "tta";
const TOP_LEVEL_COMMANDS = new Set(["sess", "act", "obs", "help"]);
const DOCS_URL = "https://github.com/yanggggjie/terminal-tool-for-agents";
const SCROLL_DIRECTIONS = ["up", "down", "top", "bottom"] as const;
type ScrollDirection = (typeof SCROLL_DIRECTIONS)[number];
const MAX_TEXT_INPUT_BYTES = 1024 * 1024;

const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function bold(s: string): string {
  return `${BOLD}${s}${RESET}`;
}

const HELP_API = `
${bold("API")}    ${bold("Commands")}                              ${bold("Example")}
${bold("sess")}   start, kill, killall, list, keys      tta sess start --sess=dev --cmd="npm run dev"
${bold("act")}    send text, send key                   tta act send text --sess=dev  # stdin (heredoc)
${bold("obs")}    screen now, stable, scroll            tta obs screen stable --sess=dev

${bold("Workflow")}:  sess start  →  (act → obs screen stable)*  →  sess kill
${bold("Watch UI")}:  tta sess watch  (humans only — agents use obs)
${bold("Docs")}:      ${DOCS_URL}
`;

const program = new Command();

const START_EXAMPLE = 'tta sess start --sess=dev --cmd="npm run dev"';

function firstPositionalArg(args: string[]): string | undefined {
  for (const a of args) {
    if (!a.startsWith("-")) return a;
  }
  return undefined;
}

function warnWrongTopLevel(got: string): void {
  process.stderr.write(
    `${RED}Unknown top-level command "${got}". Use tta sess, tta act, or tta obs.${RESET}\n\n`
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
    "tta is short for terminal-tool-for-agents.\n" +
      "Use tta for interactive programs (prompts, TUI, agent CLIs) — not plain bash.\n"
  )
  .addHelpText("afterAll", HELP_API)
  .version(version);

function formatSessionLine(session: ListResponse["sessions"][number]): string {
  if (session.status === "exited") {
    return `${session.session_name} exited exit_code=${session.exit_code ?? 1}`;
  }
  return `${session.session_name} running`;
}

function requireCommandString(cmd: string): string {
  const command = cmd.trim();
  if (!command) {
    replyError(`--cmd= must not be empty. Example: ${START_EXAMPLE}`);
  }
  return command;
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

function requireScrollDirection(dir: string): ScrollDirection {
  if ((SCROLL_DIRECTIONS as readonly string[]).includes(dir)) {
    return dir as ScrollDirection;
  }
  replyError(`--dire= must be one of: ${SCROLL_DIRECTIONS.join(", ")}`);
}

function readStdinText(): string {
  if (process.stdin.isTTY) {
    replyError(
      "Missing text input. Use a quoted heredoc, e.g. tta act send text --sess=dev <<'EOF'\\nhello\\nEOF"
    );
  }
  const data = fs.readFileSync(0, "utf8");
  if (Buffer.byteLength(data, "utf8") > MAX_TEXT_INPUT_BYTES) {
    replyError(`Stdin exceeds ${MAX_TEXT_INPUT_BYTES} byte limit`);
  }
  return data;
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
      command: requireCommandString(options.cmd),
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
  .description("List sessions (running and exited; remove with sess kill)")
  .action(async () => {
    const res = await sendRequest({ type: "list" });
    if (res.type === "error") replyError(res.message);
    if (res.type !== "list") replyError("expected list response");
    if (res.sessions.length === 0) {
      console.log("No sessions");
      return;
    }
    for (const s of res.sessions) console.log(formatSessionLine(s));
  });

sess
  .command("keys")
  .description("List key names for `tta act send key`")
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
  .description("Type text from stdin (quoted heredoc or pipe)")
  .requiredOption("--sess <name>", "Session name (--sess=dev)")
  .action(async (options: { sess: string }) => {
    handleOp(
      await sendRequest({
        type: "send_text",
        session_name: requireSession(options.sess),
        text: readStdinText(),
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
  .description("Read screen from a session (stdout: screen text | error: …)");

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
      "Error: tta sess watch is for human observation only. Agents must not run this command.\n"
    );
    process.exit(1);
  }

  await ensureServerRunning();

  const res = await sendRequest({ type: "list" });
  if (res.type === "error") {
    process.stderr.write(`Error: ${res.message}\n`);
    process.exit(1);
  }

  process.stderr.write("tta sess watch — read-only session observer (Ctrl+C to exit)\n");
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
