// app/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Header } from '../components/Header';
import { StreamingText } from '../components/chat/StreamingText';
import { ToolCallCard } from '../components/chat/ToolCallCard';
import { AgentConnection, ConnectionStatus } from '../lib/ws/connection';
import { StreamManager, ChatMessage } from '../lib/ws/stream-manager';
import { ServerMessage } from '../lib/types/protocol';

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus>('IDLE');
  const [logs, setLogs] = useState<ServerMessage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [lastSeq, setLastSeq] = useState(0);

  const connectionRef = useRef<AgentConnection | null>(null);
  const streamManagerRef = useRef<StreamManager | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const manager = new StreamManager(() => {
      setMessages(manager.getMessages());
    });
    streamManagerRef.current = manager;

    const connection = new AgentConnection({
      onStatusChange: setStatus,
      onMessage: (message) => {
        setLogs((prev) => [...prev, message]);
        setLastSeq(connection.getLastSeq());

        // Process message packets into segments
        if (message.type === 'TOKEN') {
          manager.handleToken(message.stream_id, message.text);
        } else if (message.type === 'TOOL_CALL') {
          manager.handleToolCall(message.stream_id, message.call_id, message.tool_name, message.args);
        } else if (message.type === 'TOOL_RESULT') {
          manager.handleToolResult(message.stream_id, message.call_id, message.result);
        }
      },
    });

    connectionRef.current = connection;
    return () => connection.disconnect();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleConnect = () => connectionRef.current?.connect();
  const handleDisconnect = () => {
    connectionRef.current?.disconnect();
    setLogs([]);
    setLastSeq(0);
    streamManagerRef.current?.clear();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !connectionRef.current || !streamManagerRef.current) return;

    connectionRef.current.send({ type: 'USER_MESSAGE', content: input });
    streamManagerRef.current.handleUserMessage(input);
    setInput('');
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header status={status} lastSeq={lastSeq} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6 overflow-hidden">
        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Session Control</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Toggle connection states to test resilience.</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleConnect}
                disabled={status !== 'IDLE'}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-1.5 px-3 rounded-lg text-xs transition"
              >
                Connect
              </button>
              <button
                onClick={handleDisconnect}
                disabled={status === 'IDLE'}
                className="flex-1 bg-zinc-850 hover:bg-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-700 text-zinc-300 font-bold py-1.5 px-3 rounded-lg text-xs border border-zinc-800 transition"
              >
                Disconnect
              </button>
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="lg:col-span-2 bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Send Prompt</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Submit prompt to trigger token stream and tool calls.</p>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={status !== 'LIVE' && status !== 'RESUMING'}
                placeholder={status === 'LIVE' ? "Ask the AI agent anything..." : "Connect first to enable prompt submission"}
                className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50 disabled:bg-zinc-900/50 disabled:text-zinc-700 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || (status !== 'LIVE' && status !== 'RESUMING')}
                className="bg-zinc-850 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-700 font-bold py-1.5 px-4 rounded-lg text-xs transition"
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Dual Panel Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[450px]">
          {/* Chat Panel */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800/60 rounded-xl flex flex-col overflow-hidden">
            <div className="border-b border-zinc-800/60 px-4 py-2.5 bg-zinc-950/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Agent Streaming Chat</span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[400px]">
              {messages.length === 0 ? (
                <div className="text-zinc-600 text-xs italic h-full flex items-center justify-center">
                  Chat is empty. Connect and send a prompt to start conversation.
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.stream_id} className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    {message.sender === 'user' ? (
                      <div className="bg-zinc-800 border border-zinc-750 text-zinc-200 px-3.5 py-2 rounded-2xl max-w-md text-xs sm:text-sm font-sans">
                        {message.segments[0].type === 'text' && (message.segments[0] as any).text}
                      </div>
                    ) : (
                      <div className="w-full space-y-1 pl-1">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase font-semibold">Agent</div>
                        {message.segments.map((seg, idx) => (
                          <div key={idx}>
                            {seg.type === 'text' && <StreamingText text={seg.text} />}
                            {seg.type === 'tool' && (
                              <ToolCallCard
                                toolName={seg.tool_name}
                                args={seg.args}
                                result={seg.result}
                                status={seg.status}
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

          {/* Raw Log Panel */}
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl flex flex-col overflow-hidden">
            <div className="border-b border-zinc-800/60 px-4 py-2.5 bg-zinc-950/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Resiliency Logs</span>
            </div>

            <div className="flex-1 p-3 font-mono text-[10px] overflow-y-auto space-y-1.5 max-h-[400px] text-zinc-500">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic h-full flex items-center justify-center">
                  Logs are empty.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="border-b border-zinc-850/40 pb-1.5 last:border-0 flex items-start space-x-1.5">
                    <span className="text-amber-500 font-bold">[{log.seq}]</span>
                    <span className="text-cyan-400 font-bold uppercase">{log.type}</span>
                    <span className="break-all text-zinc-400">
                      {log.type === 'TOKEN' && `text: "${log.text}"`}
                      {log.type === 'PING' && `challenge: "${log.challenge}"`}
                      {log.type === 'ERROR' && `code: ${log.code}, msg: ${log.message}`}
                      {log.type === 'STREAM_END' && `stream_id: ${log.stream_id}`}
                      {log.type === 'CONTEXT_SNAPSHOT' && `context_id: ${log.context_id}`}
                      {log.type === 'TOOL_CALL' && `call_id: ${log.call_id}, name: ${log.tool_name}`}
                      {log.type === 'TOOL_RESULT' && `call_id: ${log.call_id}`}
                    </span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
