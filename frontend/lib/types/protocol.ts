// lib/types/protocol.ts

// ─── Server → Client Messages ─────────────────────────────────

export interface BaseServerMessage {
  seq: number;
}

export interface TokenMessage extends BaseServerMessage {
  type: 'TOKEN';
  text: string;
  stream_id: string;
}

export interface ToolCallMessage extends BaseServerMessage {
  type: 'TOOL_CALL';
  call_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  stream_id: string;
}

export interface ToolResultMessage extends BaseServerMessage {
  type: 'TOOL_RESULT';
  call_id: string;
  result: Record<string, unknown>;
  stream_id: string;
}

export interface ContextSnapshotMessage extends BaseServerMessage {
  type: 'CONTEXT_SNAPSHOT';
  context_id: string;
  data: Record<string, unknown>;
}

export interface PingMessage extends BaseServerMessage {
  type: 'PING';
  challenge: string;   // May be empty string in chaos mode — handle gracefully
}

export interface StreamEndMessage extends BaseServerMessage {
  type: 'STREAM_END';
  stream_id: string;
}

export interface ErrorMessage extends BaseServerMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

export type ServerMessage =
  | TokenMessage
  | ToolCallMessage
  | ToolResultMessage
  | ContextSnapshotMessage
  | PingMessage
  | StreamEndMessage
  | ErrorMessage;

// ─── Client → Server Messages ─────────────────────────────────

export interface UserMessagePayload {
  type: 'USER_MESSAGE';
  content: string;
}

export interface PongPayload {
  type: 'PONG';
  echo: string;
}

export interface ResumePayload {
  type: 'RESUME';
  last_seq: number;
}

export interface ToolAckPayload {
  type: 'TOOL_ACK';
  call_id: string;
}

export type ClientMessage =
  | UserMessagePayload
  | PongPayload
  | ResumePayload
  | ToolAckPayload;
