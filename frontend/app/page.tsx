// app/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Header } from '../components/Header';
import { AgentConnection, ConnectionStatus } from '../lib/ws/connection';
import { ServerMessage } from '../lib/types/protocol';

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus>('IDLE');
  const [logs, setLogs] = useState<ServerMessage[]>([]);
  const [input, setInput] = useState('');
  const [lastSeq, setLastSeq] = useState(0);
  
  const connectionRef = useRef<AgentConnection | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Instantiate connection manager reading URL from environmental variable
    const connection = new AgentConnection({
      onMessage: (message) => {
        setLogs((prev) => [...prev, message]);
        setLastSeq(connection.getLastSeq());
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
    });

    connectionRef.current = connection;

    return () => {
      connection.disconnect();
    };
  }, []);

  useEffect(() => {
    // Scroll logs console to bottom on new message
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleConnect = () => {
    if (connectionRef.current) {
      connectionRef.current.connect();
    }
  };

  const handleDisconnect = () => {
    if (connectionRef.current) {
      connectionRef.current.disconnect();
      setLogs([]);
      setLastSeq(0);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !connectionRef.current) return;

    // Send USER_MESSAGE type to WebSocket server
    connectionRef.current.send({
      type: 'USER_MESSAGE',
      content: input,
    });
    
    setInput('');
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header status={status} lastSeq={lastSeq} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
        
        {/* Connection & Input Control Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Session Control</h2>
              <p className="text-xs text-zinc-500 mt-1">Simulate connection drops by toggling manual sessions.</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleConnect}
                disabled={status !== 'IDLE'}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-2 px-4 rounded-lg text-sm transition"
              >
                Connect
              </button>
              <button
                onClick={handleDisconnect}
                disabled={status === 'IDLE'}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-700 text-zinc-300 font-bold py-2 px-4 rounded-lg text-sm border border-zinc-700/50 transition"
              >
                Disconnect
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSendMessage}
            className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-4"
          >
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Send message</h2>
              <p className="text-xs text-zinc-500 mt-1">Submit content to trigger agent responses and token streaming.</p>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={status !== 'LIVE' && status !== 'RESUMING'}
                placeholder={status === 'LIVE' ? "Type a prompt to send..." : "Connect to send messages"}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 disabled:bg-zinc-900 disabled:text-zinc-700 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || (status !== 'LIVE' && status !== 'RESUMING')}
                className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-700 disabled:border-zinc-800 font-bold py-2 px-4 rounded-lg text-sm transition"
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Live Logs Terminal */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden min-h-[400px]">
          <div className="border-b border-zinc-800 px-4 py-3 bg-zinc-950 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Resiliency Log Console</span>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">Gapless Seq Feed</span>
          </div>

          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 h-[350px]">
            {logs.length === 0 ? (
              <div className="text-zinc-600 italic h-full flex items-center justify-center">
                Console idle. Click Connect to start logging protocol packets.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="border-b border-zinc-850 pb-1.5 last:border-0 flex items-start space-x-2">
                  <span className="text-amber-500 font-bold">[{log.seq}]</span>
                  <span className="text-cyan-400 font-semibold uppercase">{log.type}</span>
                  <span className="text-zinc-400 break-all">
                    {log.type === 'TOKEN' && `text: "${log.text}"`}
                    {log.type === 'PING' && `challenge: "${log.challenge}"`}
                    {log.type === 'ERROR' && `code: ${log.code}, msg: ${log.message}`}
                    {log.type === 'STREAM_END' && `stream_id: ${log.stream_id}`}
                    {log.type === 'CONTEXT_SNAPSHOT' && `context_id: ${log.context_id}, data: ${JSON.stringify(log.data)}`}
                    {log.type === 'TOOL_CALL' && `call_id: ${log.call_id}, name: ${log.tool_name}`}
                    {log.type === 'TOOL_RESULT' && `call_id: ${log.call_id}, result: ${JSON.stringify(log.result)}`}
                  </span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

      </main>
    </div>
  );
}
