// lib/ws/stream-manager.ts

export interface TextSegment {
  type: 'text';
  text: string;
}

export interface ToolSegment {
  type: 'tool';
  call_id: string;
  tool_name: string;
  args: Record<string, any>;
  result?: Record<string, any>;
  status: 'pending' | 'acked' | 'completed';
}

export type MessageSegment = TextSegment | ToolSegment;

export interface ChatMessage {
  stream_id: string;
  sender: 'user' | 'agent';
  timestamp: number;
  segments: MessageSegment[];
}

export class StreamManager {
  private messages: Map<string, ChatMessage> = new Map();
  private onUpdate: () => void;

  constructor(onUpdate: () => void) {
    this.onUpdate = onUpdate;
  }

  public getMessages(): ChatMessage[] {
    return Array.from(this.messages.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  public clear(): void {
    this.messages.clear();
    this.onUpdate();
  }

  public hasStream(stream_id: string): boolean {
    return this.messages.has(stream_id);
  }

  public handleToken(stream_id: string, text: string, triggerUpdate = true): void {
    const message = this.getOrCreateMessage(stream_id);
    const lastSegment = message.segments[message.segments.length - 1];
    const isNewSegment = !lastSegment || lastSegment.type !== 'text';

    if (lastSegment && lastSegment.type === 'text') {
      lastSegment.text += text;
    } else {
      message.segments.push({
        type: 'text',
        text: text,
      });
    }
    
    if (triggerUpdate || isNewSegment) {
      this.onUpdate();
    }
  }

  public handleToolCall(
    stream_id: string,
    call_id: string,
    tool_name: string,
    args: Record<string, any>
  ): void {
    const message = this.getOrCreateMessage(stream_id);

    // Append new tool segment
    message.segments.push({
      type: 'tool',
      call_id,
      tool_name,
      args,
      status: 'pending',
    });

    this.onUpdate();
  }

  public handleToolAck(stream_id: string, call_id: string): void {
    const message = this.messages.get(stream_id);
    if (!message) return;

    const segment = message.segments.find(
      (seg) => seg.type === 'tool' && seg.call_id === call_id
    ) as ToolSegment | undefined;

    if (segment) {
      segment.status = 'acked';
      this.onUpdate();
    }
  }

  public handleToolResult(
    stream_id: string,
    call_id: string,
    result: Record<string, any>
  ): void {
    const message = this.messages.get(stream_id);
    if (!message) return;

    const segment = message.segments.find(
      (seg) => seg.type === 'tool' && seg.call_id === call_id
    ) as ToolSegment | undefined;

    if (segment) {
      segment.result = result;
      segment.status = 'completed';
      this.onUpdate();
    }
  }

  public handleUserMessage(content: string): void {
    const stream_id = `user_${Date.now()}`;
    this.messages.set(stream_id, {
      stream_id,
      sender: 'user',
      timestamp: Date.now(),
      segments: [{ type: 'text', text: content }],
    });
    this.onUpdate();
  }

  private getOrCreateMessage(stream_id: string): ChatMessage {
    if (!this.messages.has(stream_id)) {
      this.messages.set(stream_id, {
        stream_id,
        sender: 'agent',
        timestamp: Date.now(),
        segments: [],
      });
    }
    return this.messages.get(stream_id)!;
  }
}
