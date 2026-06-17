// __tests__/stream-manager.test.ts
import { describe, it, expect, vi } from 'vitest';
import { StreamManager } from '../lib/ws/stream-manager';

describe('StreamManager', () => {
  it('should create new message and append tokens to text segment', () => {
    const onUpdate = vi.fn();
    const manager = new StreamManager(onUpdate);

    manager.handleToken('s1', 'Hello');
    manager.handleToken('s1', ' World');

    const messages = manager.getMessages();
    expect(messages.length).toBe(1);
    expect(messages[0].stream_id).toBe('s1');
    expect(messages[0].segments.length).toBe(1);
    expect(messages[0].segments[0]).toEqual({
      type: 'text',
      text: 'Hello World',
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('should freeze text and append tool segment on handleToolCall', () => {
    const onUpdate = vi.fn();
    const manager = new StreamManager(onUpdate);

    manager.handleToken('s1', 'Initial text. ');
    manager.handleToolCall('s1', 'tc1', 'calculator', { value: 10 });

    const messages = manager.getMessages();
    expect(messages[0].segments.length).toBe(2);
    expect(messages[0].segments[0]).toEqual({
      type: 'text',
      text: 'Initial text. ',
    });
    expect(messages[0].segments[1]).toEqual({
      type: 'tool',
      call_id: 'tc1',
      tool_name: 'calculator',
      args: { value: 10 },
      status: 'pending',
    });
  });

  it('should update tool status on handleToolAck', () => {
    const onUpdate = vi.fn();
    const manager = new StreamManager(onUpdate);

    manager.handleToolCall('s1', 'tc1', 'calculator', {});
    manager.handleToolAck('s1', 'tc1');

    const messages = manager.getMessages();
    expect(messages[0].segments[0]).toMatchObject({
      type: 'tool',
      call_id: 'tc1',
      status: 'acked',
    });
  });

  it('should update tool result and start a new text segment on subsequent tokens', () => {
    const onUpdate = vi.fn();
    const manager = new StreamManager(onUpdate);

    manager.handleToken('s1', 'Before ');
    manager.handleToolCall('s1', 'tc1', 'calculator', {});
    manager.handleToolResult('s1', 'tc1', { result: 42 });
    manager.handleToken('s1', ' After');

    const messages = manager.getMessages();
    const segments = messages[0].segments;
    expect(segments.length).toBe(3);
    
    expect(segments[0]).toEqual({
      type: 'text',
      text: 'Before ',
    });
    expect(segments[1]).toEqual({
      type: 'tool',
      call_id: 'tc1',
      tool_name: 'calculator',
      args: {},
      result: { result: 42 },
      status: 'completed',
    });
    expect(segments[2]).toEqual({
      type: 'text',
      text: ' After',
    });
  });

  it('should support stacking multiple tool calls', () => {
    const manager = new StreamManager(() => {});

    manager.handleToolCall('s1', 'tc1', 'toolA', {});
    manager.handleToolCall('s1', 'tc2', 'toolB', {});

    const messages = manager.getMessages();
    expect(messages[0].sender).toBe('agent');
    expect(messages[0].segments.length).toBe(2);
    expect(messages[0].segments[0].type).toBe('tool');
    expect(messages[0].segments[1].type).toBe('tool');
  });

  it('should handle user messages correctly', () => {
    const manager = new StreamManager(() => {});

    manager.handleUserMessage('Hello Agent');

    const messages = manager.getMessages();
    expect(messages.length).toBe(1);
    expect(messages[0].sender).toBe('user');
    expect(messages[0].segments[0]).toEqual({
      type: 'text',
      text: 'Hello Agent',
    });
  });
});
