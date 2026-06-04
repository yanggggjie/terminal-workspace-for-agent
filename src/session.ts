/**
 * Wraps a PTY process (node-pty).
 * Uses @xterm/headless as a VT renderer for watch UI streaming.
 */
import * as fs from "fs";
import * as path from "path";
import * as pty from "node-pty";
import { Terminal } from "@xterm/headless";
import { SessionInfo } from "./protocol";

const POLL_MS = 100;
const STABLE_POLLS = 10;

/** One word, or 2–3 words joined by hyphens: dev, vite-once, npm-run-dev */
export const SESSION_NAME_PATTERN = /^[a-z]+(-[a-z]+){0,2}$/;

export function validateSessionName(name: string): string | null {
  if (!name?.trim()) {
    return "session name is required (e.g. dev, vite-once, npm-run-dev)";
  }
  if (!SESSION_NAME_PATTERN.test(name)) {
    return (
      `invalid session name "${name}": use one lowercase word, or 2–3 words joined by hyphens ` +
      "(e.g. dev, vite-once, npm-run-dev)"
    );
  }
  return null;
}

export function validateCwd(cwd: string): string | null {
  if (!cwd?.trim()) {
    return "cwd is required";
  }
  const resolved = path.resolve(cwd);
  try {
    if (!fs.statSync(resolved).isDirectory()) {
      return `not a directory: ${cwd}`;
    }
  } catch {
    return `directory not found: ${cwd}`;
  }
  return null;
}

export class Session {
  readonly name: string;

  private ptyProcess: pty.IPty;
  private terminal: Terminal;
  private _status: "running" | "exited" = "running";
  private outputLog: string = "";
  private streamListeners: Array<(data: string) => void> = [];
  private exitListeners: Array<() => void> = [];

  constructor(name: string, command: string[], options: { cwd: string }) {
    this.name = name;

    const cols = 120;
    const rows = 30;
    const [file, ...args] = command;

    this.terminal = new Terminal({ cols, rows, scrollback: 10000, allowProposedApi: true });

    this.ptyProcess = pty.spawn(file, args, {
      name: "xterm-256color",
      cols,
      rows,
      cwd: options.cwd,
      env: process.env as { [key: string]: string },
    });

    this.ptyProcess.onData((data: string) => {
      this.terminal.write(data);
      this.appendOutput(data);
    });

    this.ptyProcess.onExit(() => {
      this._status = "exited";
      this.notifyExitListeners();
    });
  }

  get status(): "running" | "exited" {
    return this._status;
  }

  get cols(): number {
    return this.terminal.cols;
  }

  get rows(): number {
    return this.terminal.rows;
  }

  getStreamReplay(): string {
    return this.outputLog;
  }

  onStream(listener: (data: string) => void): () => void {
    this.streamListeners.push(listener);
    return () => {
      this.streamListeners = this.streamListeners.filter((l) => l !== listener);
    };
  }

  onExit(listener: () => void): () => void {
    this.exitListeners.push(listener);
    return () => {
      this.exitListeners = this.exitListeners.filter((l) => l !== listener);
    };
  }

  send(text: string): void {
    if (this._status === "exited") {
      throw new Error(`Session ${this.name} has already exited`);
    }
    const interpreted = text
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");
    this.ptyProcess.write(interpreted);
  }

  press(key: string): void {
    if (this._status === "exited") {
      throw new Error(`Session ${this.name} has already exited`);
    }
    this.ptyProcess.write(key);
  }

  private readPlainScreen(): string {
    const buf = this.terminal.buffer.active;
    const lines: string[] = [];
    const startY = buf.viewportY;
    for (let i = 0; i < this.terminal.rows; i++) {
      lines.push((buf.getLine(startY + i)?.translateToString(true) ?? "").trimEnd());
    }
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    while (lines.length > 0 && lines[0] === "") lines.shift();
    return lines.join("\n");
  }

  snapshot(): string {
    return this.readPlainScreen();
  }

  /** Poll every 100ms; 10 consecutive unchanged reads → stable (obs screen stable). */
  async waitForStable(): Promise<string> {
    if (this._status === "exited") {
      return this.snapshot();
    }

    let lastScreen = this.readPlainScreen();
    let stableCount = 0;

    while (stableCount < STABLE_POLLS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      if (this._status !== "running") break;

      const current = this.readPlainScreen();
      if (current === lastScreen) {
        stableCount++;
      } else {
        stableCount = 0;
        lastScreen = current;
      }
    }

    return this.snapshot();
  }

  scroll(direction: "up" | "down" | "top" | "bottom"): void {
    switch (direction) {
      case "up":
        this.terminal.scrollLines(-this.terminal.rows);
        break;
      case "down":
        this.terminal.scrollLines(this.terminal.rows);
        break;
      case "top": {
        const buf = this.terminal.buffer.active;
        this.terminal.scrollLines(-buf.viewportY);
        break;
      }
      case "bottom": {
        const buf = this.terminal.buffer.active;
        const target = Math.max(0, buf.length - this.terminal.rows);
        this.terminal.scrollLines(target - buf.viewportY);
        break;
      }
    }
  }

  kill(): void {
    if (this._status === "running") {
      this.ptyProcess.kill();
    }
  }

  toInfo(): SessionInfo {
    return { session_name: this.name };
  }

  private appendOutput(data: string): void {
    const maxBytes = 512 * 1024;
    this.outputLog += data;
    if (this.outputLog.length > maxBytes) {
      this.outputLog = this.outputLog.slice(-maxBytes);
    }
    const listeners = [...this.streamListeners];
    for (const listener of listeners) {
      listener(data);
    }
  }

  private notifyExitListeners(): void {
    const listeners = [...this.exitListeners];
    this.exitListeners = [];
    for (const listener of listeners) {
      listener();
    }
  }
}
