/**
 * tta protocol — CLI RPC request/response types (POST /rpc JSON body).
 * Request `type` values match CLI subcommands (e.g. send_text ↔ tta act send text, start ↔ tta sess start).
 */

export interface StartRequest {
  type: "start";
  session_name: string;
  command: string[];
  cwd: string;
}

export interface SendTextRequest {
  type: "send_text";
  session_name: string;
  text: string;
}

export interface SendKeyRequest {
  type: "send_key";
  session_name: string;
  key: string;
}

export interface ScreenNowRequest {
  type: "screen_now";
  session_name: string;
}

export interface ScreenStableRequest {
  type: "screen_stable";
  session_name: string;
}

export interface ScreenScrollRequest {
  type: "screen_scroll";
  session_name: string;
  direction: "up" | "down" | "top" | "bottom";
}

export interface KillRequest {
  type: "kill";
  session_name: string;
}

export interface KillResponse {
  type: "kill";
  ok: boolean;
}

export interface KillAllRequest {
  type: "killall";
}

export interface KillAllResponse {
  type: "killall";
  ok: boolean;
  count: number;
}

export interface ListRequest {
  type: "list";
}

export interface SessionInfo {
  session_name: string;
}

export interface ListResponse {
  type: "list";
  sessions: SessionInfo[];
}

export interface OkResponse {
  type: "ok";
}

export interface ScreenResponse {
  type: "screen";
  screen: string;
}

export interface ErrorResponse {
  type: "error";
  message: string;
}

export type Request =
  | StartRequest
  | SendTextRequest
  | SendKeyRequest
  | ScreenNowRequest
  | ScreenStableRequest
  | ScreenScrollRequest
  | KillRequest
  | KillAllRequest
  | ListRequest;

export type Response =
  | OkResponse
  | ScreenResponse
  | KillResponse
  | KillAllResponse
  | ListResponse
  | ErrorResponse;
