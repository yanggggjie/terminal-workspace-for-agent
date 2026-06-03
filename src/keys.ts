/** Key name → PTY escape sequence for `send_key` requests. */
const KEY_MAP: Record<string, string> = {
  "ctrl+a": "\x01", "ctrl+b": "\x02", "ctrl+c": "\x03", "ctrl+d": "\x04",
  "ctrl+e": "\x05", "ctrl+f": "\x06", "ctrl+g": "\x07", "ctrl+h": "\x08",
  "ctrl+i": "\x09", "ctrl+j": "\x0a", "ctrl+k": "\x0b", "ctrl+l": "\x0c",
  "ctrl+m": "\x0d", "ctrl+n": "\x0e", "ctrl+o": "\x0f", "ctrl+p": "\x10",
  "ctrl+q": "\x11", "ctrl+r": "\x12", "ctrl+s": "\x13", "ctrl+t": "\x14",
  "ctrl+u": "\x15", "ctrl+v": "\x16", "ctrl+w": "\x17", "ctrl+x": "\x18",
  "ctrl+y": "\x19", "ctrl+z": "\x1a",
  "arrow_up": "\x1b[A", "arrow_down": "\x1b[B",
  "arrow_right": "\x1b[C", "arrow_left": "\x1b[D",
  "page_up": "\x1b[5~", "page_down": "\x1b[6~",
  "home": "\x1b[H", "end": "\x1b[F",
  "enter": "\r", "tab": "\t", "escape": "\x1b",
  "backspace": "\x7f", "delete": "\x1b[3~",
  "f1": "\x1bOP", "f2": "\x1bOQ", "f3": "\x1bOR", "f4": "\x1bOS",
  "f5": "\x1b[15~", "f6": "\x1b[17~", "f7": "\x1b[18~", "f8": "\x1b[19~",
  "f9": "\x1b[20~", "f10": "\x1b[21~",
};

export const SUPPORTED_KEYS = Object.keys(KEY_MAP);

export function resolveKey(name: string): string | null {
  return KEY_MAP[name.toLowerCase()] ?? null;
}
