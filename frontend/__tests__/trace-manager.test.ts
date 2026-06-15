// __tests__/trace-manager.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TraceManager, TokenBatchTraceEvent } from '../lib/ws/trace-manager';

describe('TraceManager', () => {
  it('should log single events and trigger callback', () => {
    const onUpdate = vi.fn();
    const manager = new TraceManager(onUpdate);

    manager.logEvent({ type: 'PING', seq: 1, challenge: 'ch' });

    const events = manager.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('PING');
    expect(events[0].seq).toBe(1);
    expect((events[0] as any).payload.challenge).toBe('ch');
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('should batch consecutive tokens of the same stream', () => {
    const manager = new TraceManager(() => {});

    manager.logEvent({ type: 'TOKEN', seq: 1, text: 'Hello', stream_id: 's1' });
    manager.logEvent({ type: 'TOKEN', seq: 2, text: ' World', stream_id: 's1' });

    const events = manager.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('TOKEN_BATCH');
    const batch = events[0] as TokenBatchTraceEvent;
    expect(batch.tokenCount).toBe(2);
    expect(batch.text).toBe('Hello World');
    expect(batch.stream_id).toBe('s1');
  });

  it('should start a new batch if a different event interrupts or a different stream_id arrives', () => {
    const manager = new TraceManager(() => {});

    manager.logEvent({ type: 'TOKEN', seq: 1, text: 'Hello', stream_id: 's1' });
    // Different stream
    manager.logEvent({ type: 'TOKEN', seq: 2, text: 'World', stream_id: 's2' });
    // Interruption
    manager.logEvent({ type: 'PING', seq: 3, challenge: 'a' });
    // Resumes s1
    manager.logEvent({ type: 'TOKEN', seq: 4, text: '!', stream_id: 's1' });

    const events = manager.getEvents();
    expect(events.length).toBe(4);
    expect(events[0].type).toBe('TOKEN_BATCH');
    expect((events[0] as any).stream_id).toBe('s1');
    expect(events[1].type).toBe('TOKEN_BATCH');
    expect((events[1] as any).stream_id).toBe('s2');
    expect(events[2].type).toBe('PING');
    expect(events[3].type).toBe('TOKEN_BATCH');
    expect((events[3] as any).stream_id).toBe('s1');
  });

  it('should filter events by type correctly', () => {
    const manager = new TraceManager(() => {});

    manager.logEvent({ type: 'PING', seq: 1, challenge: 'a' });
    manager.logEvent({ type: 'TOKEN', seq: 2, text: 'b', stream_id: 's1' });
    manager.logEvent({ type: 'ERROR', seq: 3, code: 'ERR', message: 'fail' });

    expect(manager.getEvents('PING').length).toBe(1);
    expect(manager.getEvents('TOKEN').length).toBe(1); // TOKEN matches TOKEN_BATCH
    expect(manager.getEvents('ERROR').length).toBe(1);
    expect(manager.getEvents('ALL').length).toBe(3);
  });

  it('should search events by content query correctly', () => {
    const manager = new TraceManager(() => {});

    manager.logEvent({ type: 'TOKEN', seq: 1, text: 'SpecialSecretKeyword', stream_id: 's1' });
    manager.logEvent({ type: 'ERROR', seq: 2, code: 'FAILURE_CODE', message: 'something bad' });

    const searchToken = manager.getEvents(undefined, 'SecretKey');
    expect(searchToken.length).toBe(1);
    expect((searchToken[0] as any).text).toContain('SpecialSecret');

    const searchPayload = manager.getEvents(undefined, 'something bad');
    expect(searchPayload.length).toBe(1);
    expect(searchPayload[0].type).toBe('ERROR');
  });
});
