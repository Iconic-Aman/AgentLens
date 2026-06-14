// lib/ws/seq-buffer.ts
import { ServerMessage } from '../types/protocol';

export interface SeqBufferOptions {
  initialSeq?: number;
  onFlush: (event: ServerMessage) => void;
}

export class SeqBuffer {
  private buffer = new Map<number, ServerMessage>();
  private processedSeqs = new Set<number>();
  private nextExpected: number;
  private onFlush: (event: ServerMessage) => void;

  constructor(options: SeqBufferOptions) {
    this.nextExpected = options.initialSeq ?? 1;
    this.onFlush = options.onFlush;
  }

  /**
   * Enqueues an incoming server message.
   * Filters out duplicates, stores out-of-order messages, and flushes contiguous sequences.
   */
  public enqueue(message: ServerMessage): void {
    const { seq } = message;

    // Deduplicate: ignore if we have already processed this sequence number
    if (this.processedSeqs.has(seq) || seq < this.nextExpected) {
      return;
    }

    // Buffer the event
    this.buffer.set(seq, message);

    // Flush any contiguous, gapless range starting from nextExpected
    this.flush();
  }

  /**
   * Resets nextExpected sequence pointer (used on session reset).
   */
  public reset(nextExpected: number): void {
    this.nextExpected = nextExpected;
    this.buffer.clear();
    this.processedSeqs.clear();
  }

  /**
   * Returns the last fully-processed sequence number.
   */
  public getLastProcessedSeq(): number {
    return this.nextExpected - 1;
  }

  /**
   * Flushes contiguous buffered messages downstream.
   */
  private flush(): void {
    while (this.buffer.has(this.nextExpected)) {
      const message = this.buffer.get(this.nextExpected)!;
      this.buffer.delete(this.nextExpected);
      this.processedSeqs.add(this.nextExpected);
      this.nextExpected++;
      this.onFlush(message);
    }
  }
}
