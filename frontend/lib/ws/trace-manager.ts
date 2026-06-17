// lib/ws/trace-manager.ts
import { ServerMessage, ClientMessage } from '../types/protocol';

export interface BaseTraceEvent {
  id: string;
  timestamp: number;
  seq?: number;
}

export interface SingleTraceEvent extends BaseTraceEvent {
  type:
    | 'PING'
    | 'PONG'
    | 'TOOL_CALL'
    | 'TOOL_RESULT'
    | 'CONTEXT_SNAPSHOT'
    | 'ERROR'
    | 'STREAM_END'
    | 'USER_MESSAGE'
    | 'RESUME'
    | 'TOOL_ACK'
    | 'FSM_STATUS';
  payload: Record<string, any>;
}

export interface TokenBatchTraceEvent extends BaseTraceEvent {
  type: 'TOKEN_BATCH';
  stream_id: string;
  tokenCount: number;
  text: string;
  startTime: number;
  endTime: number;
}

export type TraceEvent = SingleTraceEvent | TokenBatchTraceEvent;

export class TraceManager {
  private events: TraceEvent[] = [];
  private onUpdate: () => void;

  constructor(onUpdate: () => void) {
    this.onUpdate = onUpdate;
  }

  public getEvents(filterType?: string, search?: string): TraceEvent[] {
    return this.events.filter((event) => {
      // 1. Filter by event type
      if (filterType && filterType !== 'ALL') {
        if (event.type === 'TOKEN_BATCH') {
          if (filterType !== 'TOKEN') return false;
        } else if (event.type !== filterType) {
          return false;
        }
      }

      // 2. Search by content
      if (search && search.trim() !== '') {
        const query = search.toLowerCase();
        if (event.type === 'TOKEN_BATCH') {
          return event.text.toLowerCase().includes(query) || event.stream_id.toLowerCase().includes(query);
        } else {
          const payloadStr = JSON.stringify(event.payload).toLowerCase();
          return payloadStr.includes(query) || event.type.toLowerCase().includes(query);
        }
      }

      return true;
    });
  }

  public clear(): void {
    this.events = [];
    this.onUpdate();
  }

  /**
   * Accumulates a TOKEN message into the current batch without triggering
   * a React re-render. The batch will appear on the next logEvent() call.
   */
  public logTokenSilent(message: { type: 'TOKEN'; stream_id: string; text: string; seq?: number }): void {
    const timestamp = Date.now();
    const id = `TOKEN_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const lastEvent = this.events[this.events.length - 1];
    if (lastEvent && lastEvent.type === 'TOKEN_BATCH' && lastEvent.stream_id === message.stream_id) {
      lastEvent.text += message.text;
      lastEvent.tokenCount += 1;
      lastEvent.endTime = timestamp;
    } else {
      this.events.push({
        id,
        type: 'TOKEN_BATCH',
        stream_id: message.stream_id,
        tokenCount: 1,
        text: message.text,
        timestamp,
        startTime: timestamp,
        endTime: timestamp,
        seq: message.seq,
      });
    }
    // No onUpdate() call — intentionally silent
  }

  public logEvent(
    message: ServerMessage | ClientMessage | { type: 'USER_MESSAGE'; content: string }
  ): void {
    const id = `${message.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const seq = 'seq' in message ? message.seq : undefined;

    // Handle token batching logic
    if (message.type === 'TOKEN') {
      const lastEvent = this.events[this.events.length - 1];
      if (lastEvent && lastEvent.type === 'TOKEN_BATCH' && lastEvent.stream_id === message.stream_id) {
        lastEvent.text += message.text;
        lastEvent.tokenCount += 1;
        lastEvent.endTime = timestamp;
      } else {
        this.events.push({
          id,
          type: 'TOKEN_BATCH',
          stream_id: message.stream_id,
          tokenCount: 1,
          text: message.text,
          timestamp,
          startTime: timestamp,
          endTime: timestamp,
          seq,
        });
      }
    } else {
      // Log single protocol events
      this.events.push({
        id,
        type: message.type as SingleTraceEvent['type'],
        timestamp,
        seq,
        payload: { ...message },
      });
    }

    this.onUpdate();
  }
}
