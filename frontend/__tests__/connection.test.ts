// __tests__/connection.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentConnection } from '../lib/ws/connection';
import { ServerMessage } from '../lib/types/protocol';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    this.readyState = 0;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }

  triggerOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) this.onopen();
  }

  triggerMessage(data: ServerMessage) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  triggerClose() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }

  triggerError() {
    if (this.onerror) this.onerror();
    this.triggerClose();
  }
}

describe('AgentConnection FSM', () => {
  const wsUrl = 'ws://mock-server/ws';

  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should initialize in IDLE state', () => {
    const onMessage = vi.fn();
    const connection = new AgentConnection({ wsUrl, onMessage });
    expect(connection.getStatus()).toBe('IDLE');
  });

  it('should transition to CONNECTING and then LIVE on open for first connection', () => {
    const onMessage = vi.fn();
    const connection = new AgentConnection({ wsUrl, onMessage });

    connection.connect();
    expect(connection.getStatus()).toBe('CONNECTING');
    expect(MockWebSocket.instances.length).toBe(1);

    const wsInstance = MockWebSocket.instances[0];
    wsInstance.triggerOpen();
    expect(connection.getStatus()).toBe('LIVE');
  });

  it('should respond to PING with PONG and feed it to buffer', () => {
    const onMessage = vi.fn();
    const connection = new AgentConnection({ wsUrl, onMessage });

    connection.connect();
    const wsInstance = MockWebSocket.instances[0];
    wsInstance.triggerOpen();

    wsInstance.triggerMessage({ type: 'PING', seq: 1, challenge: 'ch123' });

    expect(wsInstance.sentMessages.length).toBe(1);
    expect(JSON.parse(wsInstance.sentMessages[0])).toEqual({
      type: 'PONG',
      echo: 'ch123',
    });
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0][0].type).toBe('PING');
  });

  it('should handle corrupt PING (missing challenge) without crashing', () => {
    const onMessage = vi.fn();
    const connection = new AgentConnection({ wsUrl, onMessage });

    connection.connect();
    const wsInstance = MockWebSocket.instances[0];
    wsInstance.triggerOpen();

    // Trigger PING with undefined challenge
    wsInstance.triggerMessage({ type: 'PING', seq: 1 } as any);

    expect(wsInstance.sentMessages.length).toBe(1);
    expect(JSON.parse(wsInstance.sentMessages[0])).toEqual({
      type: 'PONG',
      echo: '',
    });
  });

  it('should trigger reconnect and send RESUME on drop when lastSeq > 0', () => {
    const onMessage = vi.fn();
    const connection = new AgentConnection({ wsUrl, onMessage });

    connection.connect();
    let wsInstance = MockWebSocket.instances[0];
    wsInstance.triggerOpen();

    // Feed a normal token to advance lastProcessedSeq
    wsInstance.triggerMessage({ type: 'TOKEN', seq: 1, text: 'hello', stream_id: 's1' });
    expect(connection.getLastSeq()).toBe(1);

    // Simulate drop
    wsInstance.triggerClose();
    expect(connection.getStatus()).toBe('RECONNECTING');

    // Run backoff timer (500ms for attempt 0)
    vi.advanceTimersByTime(500);

    expect(connection.getStatus()).toBe('CONNECTING');
    expect(MockWebSocket.instances.length).toBe(2);

    // Open second connection
    const secondWsInstance = MockWebSocket.instances[1];
    secondWsInstance.triggerOpen();

    expect(connection.getStatus()).toBe('RESUMING');
    expect(secondWsInstance.sentMessages.length).toBe(1);
    expect(JSON.parse(secondWsInstance.sentMessages[0])).toEqual({
      type: 'RESUME',
      last_seq: 1,
    });
  });

  it('should transition to LIVE once it receives a message during RESUMING', () => {
    const onMessage = vi.fn();
    const connection = new AgentConnection({ wsUrl, onMessage });

    connection.connect();
    let wsInstance = MockWebSocket.instances[0];
    wsInstance.triggerOpen();

    wsInstance.triggerMessage({ type: 'TOKEN', seq: 1, text: 'hello', stream_id: 's1' });
    wsInstance.triggerClose();

    vi.advanceTimersByTime(500);
    const secondWsInstance = MockWebSocket.instances[1];
    secondWsInstance.triggerOpen();
    expect(connection.getStatus()).toBe('RESUMING');

    // Receive a replayed message
    secondWsInstance.triggerMessage({ type: 'TOKEN', seq: 2, text: 'world', stream_id: 's1' });
    expect(connection.getStatus()).toBe('LIVE');
    expect(onMessage).toHaveBeenCalledTimes(2);
  });
});
