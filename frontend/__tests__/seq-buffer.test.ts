// __tests__/seq-buffer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SeqBuffer } from '../lib/ws/seq-buffer';
import { ServerMessage } from '../lib/types/protocol';

describe('SeqBuffer', () => {
  const createMockMessage = (seq: number, text = 'token'): ServerMessage => ({
    type: 'TOKEN',
    seq,
    text,
    stream_id: 'test-stream',
  });

  it('should immediately flush in-order messages', () => {
    const onFlush = vi.fn();
    const buffer = new SeqBuffer({ onFlush });

    buffer.enqueue(createMockMessage(1, 'A'));
    buffer.enqueue(createMockMessage(2, 'B'));

    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush.mock.calls[0][0].text).toBe('A');
    expect(onFlush.mock.calls[1][0].text).toBe('B');
    expect(buffer.getLastProcessedSeq()).toBe(2);
  });

  it('should buffer out-of-order messages and flush when gap is resolved', () => {
    const onFlush = vi.fn();
    const buffer = new SeqBuffer({ onFlush });

    // Enqueue 2 then 3 (gap at 1)
    buffer.enqueue(createMockMessage(2, 'B'));
    buffer.enqueue(createMockMessage(3, 'C'));

    expect(onFlush).not.toHaveBeenCalled();
    expect(buffer.getLastProcessedSeq()).toBe(0);

    // Enqueue 1 to resolve the gap
    buffer.enqueue(createMockMessage(1, 'A'));

    expect(onFlush).toHaveBeenCalledTimes(3);
    expect(onFlush.mock.calls[0][0].text).toBe('A');
    expect(onFlush.mock.calls[1][0].text).toBe('B');
    expect(onFlush.mock.calls[2][0].text).toBe('C');
    expect(buffer.getLastProcessedSeq()).toBe(3);
  });

  it('should deduplicate messages with the same sequence number', () => {
    const onFlush = vi.fn();
    const buffer = new SeqBuffer({ onFlush });

    buffer.enqueue(createMockMessage(1, 'A'));
    buffer.enqueue(createMockMessage(1, 'A-dup')); // duplicate

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush.mock.calls[0][0].text).toBe('A');
  });

  it('should ignore older sequence numbers than nextExpected', () => {
    const onFlush = vi.fn();
    const buffer = new SeqBuffer({ onFlush, initialSeq: 3 });

    buffer.enqueue(createMockMessage(2, 'Old')); // Less than initialSeq 3
    buffer.enqueue(createMockMessage(3, 'Three'));

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush.mock.calls[0][0].text).toBe('Three');
    expect(buffer.getLastProcessedSeq()).toBe(3);
  });

  it('should reset state correctly', () => {
    const onFlush = vi.fn();
    const buffer = new SeqBuffer({ onFlush });

    buffer.enqueue(createMockMessage(1, 'A'));
    expect(buffer.getLastProcessedSeq()).toBe(1);

    buffer.reset(5);
    expect(buffer.getLastProcessedSeq()).toBe(4);

    buffer.enqueue(createMockMessage(5, 'E'));
    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush.mock.calls[1][0].text).toBe('E');
  });
});
