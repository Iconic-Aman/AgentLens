// lib/ws/connection.ts
import { ServerMessage, ClientMessage } from '../types/protocol';
import { SeqBuffer } from './seq-buffer';
import { getBackoffMs } from './reconnect';
import { handlePing } from './ping-handler';

export type ConnectionStatus =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RESUMING'
  | 'LIVE'
  | 'RECONNECTING';

export interface ConnectionConfig {
  wsUrl?: string;
  onMessage: (message: ServerMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export class AgentConnection {
  private status: ConnectionStatus = 'IDLE';
  private ws: WebSocket | null = null;
  private buffer: SeqBuffer;
  private reconnectAttempt = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private wsUrl: string;
  private onMessageCallback: (message: ServerMessage) => void;
  private onStatusChangeCallback?: (status: ConnectionStatus) => void;

  constructor(config: ConnectionConfig) {
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    const url = config.wsUrl || envUrl;
    
    if (!url) {
      throw new Error('WebSocket URL must be configured via env or config.');
    }
    
    this.wsUrl = url;
    this.onMessageCallback = config.onMessage;
    this.onStatusChangeCallback = config.onStatusChange;

    this.buffer = new SeqBuffer({
      onFlush: (message) => {
        if (this.status === 'RESUMING') {
          this.setStatus('LIVE');
        }

        if (message.type === 'TOOL_CALL') {
          this.send({
            type: 'TOOL_ACK',
            call_id: message.call_id,
          });
          this.onMessageCallback({
            type: 'TOOL_ACK',
            call_id: message.call_id,
          } as any);
        }

        this.onMessageCallback(message);
      },
    });
  }

  public connect(): void {
    if (this.status === 'CONNECTING' || this.status === 'LIVE' || this.status === 'RESUMING') {
      return;
    }

    this.setStatus('CONNECTING');
    this.cleanupTimeout();

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.setupSocketHandlers();
    } catch (error) {
      this.handleFailure();
    }
  }

  public disconnect(): void {
    this.setStatus('IDLE');
    this.cleanupTimeout();
    this.reconnectAttempt = 0;
    
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    
    this.buffer.reset(1);
  }

  public send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (message.type === 'USER_MESSAGE') {
        this.buffer.reset(1);
      }
      this.ws.send(JSON.stringify(message));
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getLastSeq(): number {
    return this.buffer.getLastProcessedSeq();
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback(newStatus);
      }
    }
  }

  private setupSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setStatus('CONNECTED');
      
      const lastSeq = this.buffer.getLastProcessedSeq();
      if (lastSeq > 0) {
        this.setStatus('RESUMING');
        this.send({
          type: 'RESUME',
          last_seq: lastSeq,
        });
      } else {
        this.setStatus('LIVE');
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        
        if (message.type === 'PING') {
          const pong = handlePing(message);
          this.send(pong);
          this.onMessageCallback({
            type: 'PONG',
            seq: message.seq,
            echo: pong.echo,
          } as any);
        }
        
        this.buffer.enqueue(message);
      } catch (e) {
        // Ignore malformed JSON or message handling errors
      }
    };

    this.ws.onclose = () => this.handleFailure();
    this.ws.onerror = () => this.handleFailure();
  }

  private handleFailure(): void {
    if (this.status === 'IDLE') return;

    this.setStatus('RECONNECTING');
    this.cleanupTimeout();

    const delay = getBackoffMs(this.reconnectAttempt);
    this.reconnectAttempt++;

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private cleanupTimeout(): void {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }
}
