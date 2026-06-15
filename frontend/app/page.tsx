// app/page.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Header } from '../components/Header';
import { Controls } from '../components/Controls';
import { StreamingText } from '../components/chat/StreamingText';
import { ToolCallCard } from '../components/chat/ToolCallCard';
import { TraceTimeline } from '../components/trace/TraceTimeline';
import { JsonTree } from '../components/context/JsonTree';
import { SnapshotScrubber } from '../components/context/SnapshotScrubber';
import { computeJsonDiff } from '../lib/diff/json-diff';
import { AgentConnection, ConnectionStatus } from '../lib/ws/connection';
import { StreamManager, ChatMessage } from '../lib/ws/stream-manager';
import { TraceManager, TraceEvent } from '../lib/ws/trace-manager';

// Mock snapshot history to test Feature 2 and Feature 3 in combination
const mockSnapshots = [
  {
    msg: {
      type: 'CONTEXT_SNAPSHOT' as const,
      seq: 2,
      context_id: 'ctx_user_123',
      data: {
        user: { name: 'Alice', age: 30, roles: ['admin'] },
        settings: { theme: 'dark', notifications: true }
      }
    },
    timestamp: 1774872000000,
  },
  {
    msg: {
      type: 'CONTEXT_SNAPSHOT' as const,
      seq: 4,
      context_id: 'ctx_user_123',
      data: {
        user: { name: 'Alice', age: 31, roles: ['admin'] },
        settings: { theme: 'dark', notifications: true }
      }
    },
    timestamp: 1774872005000,
  },
  {
    msg: {
      type: 'CONTEXT_SNAPSHOT' as const,
      seq: 6,
      context_id: 'ctx_user_123',
      data: {
        user: { name: 'Alice', age: 31, roles: ['admin', 'developer'] },
        settings: { theme: 'dark', notifications: true }
      }
    },
    timestamp: 1774872010000,
  }
];

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus>('IDLE');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [highlightedCallId, setHighlightedCallId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [input, setInput] = useState('');
  const [lastSeq, setLastSeq] = useState(0);

  // Scrubber index state for local testing
  const [scrubberIndex, setScrubberIndex] = useState(2);

  const connectionRef = useRef<AgentConnection | null>(null);
  const streamManagerRef = useRef<StreamManager | null>(null);
  const traceManagerRef = useRef<TraceManager | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stream = new StreamManager(() => setMessages(stream.getMessages()));
    streamManagerRef.current = stream;
    const trace = new TraceManager(() => {
      if (traceManagerRef.current) {
        setTraceEvents(traceManagerRef.current.getEvents(filterType, searchQuery));
      }
    });
    traceManagerRef.current = trace;

    const connection = new AgentConnection({
      onStatusChange: setStatus,
      onMessage: (message) => {
        setLastSeq(connection.getLastSeq());
        trace.logEvent(message);
        const anyMsg = message as any;
        const msgType = anyMsg.type;
        if (msgType === 'TOKEN') {
          stream.handleToken(anyMsg.stream_id, anyMsg.text);
        } else if (msgType === 'TOOL_CALL') {
          stream.handleToolCall(anyMsg.stream_id, anyMsg.call_id, anyMsg.tool_name, anyMsg.args);
        } else if (msgType === 'TOOL_ACK') {
          stream.handleToolAck(anyMsg.stream_id, anyMsg.call_id);
        } else if (msgType === 'TOOL_RESULT') {
          stream.handleToolResult(anyMsg.stream_id, anyMsg.call_id, anyMsg.result);
        }
      },
    });

    connectionRef.current = connection;
    return () => connection.disconnect();
  }, [filterType, searchQuery]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleConnect = () => connectionRef.current?.connect();
  const handleDisconnect = () => {
    connectionRef.current?.disconnect();
    setLastSeq(0);
    setHighlightedId(null);
    setHighlightedCallId(null);
    streamManagerRef.current?.clear();
    traceManagerRef.current?.clear();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !connectionRef.current || !streamManagerRef.current) return;
    connectionRef.current.send({ type: 'USER_MESSAGE', content: input });
    streamManagerRef.current.handleUserMessage(input);
    traceManagerRef.current?.logEvent({ type: 'USER_MESSAGE', content: input });
    setInput('');
  };

  const handleSelectEvent = (event: TraceEvent) => {
    setHighlightedId(event.id);
    if ('payload' in event && event.payload && 'call_id' in event.payload) {
      setHighlightedCallId(event.payload.call_id);
    } else {
      setHighlightedCallId(null);
    }
  };

  const handleSelectToolCard = (callId: string) => {
    setHighlightedCallId(callId);
    if (traceManagerRef.current) {
      const match = traceManagerRef.current.getEvents().find(
        (e) => 'payload' in e && e.payload?.call_id === callId
      );
      if (match) setHighlightedId(match.id);
    }
  };

  // Compute mock diff on the fly based on current scrubber selection
  const currentDiff = useMemo(() => {
    const currentVal = mockSnapshots[scrubberIndex].msg.data;
    if (scrubberIndex === 0) {
      return computeJsonDiff({}, currentVal);
    }
    const prevVal = mockSnapshots[scrubberIndex - 1].msg.data;
    return computeJsonDiff(prevVal, currentVal);
  }, [scrubberIndex]);

  const activeItem = mockSnapshots[scrubberIndex];

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header status={status} lastSeq={lastSeq} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6 overflow-hidden">
        <Controls
          status={status}
          input={input}
          setInput={setInput}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onSubmit={handleSendMessage}
        />

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[480px]">
          {/* Panel 1: Streaming Chat */}
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl flex flex-col overflow-hidden h-full">
            <div className="border-b border-zinc-800/60 px-4 py-2.5 bg-zinc-950/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Agent Streaming Chat</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[400px]">
              {messages.length === 0 ? (
                <div className="text-zinc-650 text-xs italic h-full flex items-center justify-center">Chat is empty. Connect and send a prompt to start.</div>
              ) : (
                messages.map((message) => (
                  <div key={message.stream_id} className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    {message.sender === 'user' ? (
                      <div className="bg-zinc-850 border border-zinc-800 text-zinc-200 px-3.5 py-2 rounded-2xl max-w-md text-xs sm:text-sm font-sans">
                        {message.segments[0].type === 'text' && (message.segments[0] as any).text}
                      </div>
                    ) : (
                      <div className="w-full space-y-1 pl-1">
                        <div className="text-[10px] font-mono text-zinc-550 uppercase font-semibold">Agent</div>
                        {message.segments.map((seg, idx) => (
                          <div key={idx}>
                            {seg.type === 'text' && <StreamingText text={seg.text} />}
                            {seg.type === 'tool' && (
                              <ToolCallCard
                                toolName={seg.tool_name}
                                args={seg.args}
                                result={seg.result}
                                status={seg.status}
                                isHighlighted={highlightedCallId === seg.call_id}
                                onClick={() => handleSelectToolCard(seg.call_id)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Panel 2: Trace Timeline */}
          <TraceTimeline
            events={traceEvents}
            highlightedId={highlightedId}
            onSelectEvent={handleSelectEvent}
            onFilterChange={(type, query) => {
              setFilterType(type);
              setSearchQuery(query);
            }}
          />

          {/* Panel 3: Interactive Inspector Panel (Features 2 & 3 testing) */}
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl flex flex-col overflow-hidden h-full">
            <div className="border-b border-zinc-800/60 px-4 py-2.5 bg-zinc-950/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Mock Inspector (Features 2+3)</span>
            </div>
            <SnapshotScrubber
              currentIndex={scrubberIndex}
              total={mockSnapshots.length}
              onIndexChange={setScrubberIndex}
              currentSeq={activeItem.msg.seq}
              currentTimestamp={activeItem.timestamp}
            />
            <div className="flex-1 p-4 overflow-y-auto max-h-[400px] bg-zinc-950/20">
              <JsonTree value={activeItem.msg.data} diff={currentDiff} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
