// components/Controls.tsx
'use client';

import React from 'react';
import { ConnectionStatus } from '../lib/ws/connection';

interface ControlsProps {
  status: ConnectionStatus;
  input: string;
  setInput: (val: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  status,
  input,
  setInput,
  onConnect,
  onDisconnect,
  onSubmit,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isConnectDisabled = mounted ? status !== 'IDLE' : false;
  const isDisconnectDisabled = mounted ? status === 'IDLE' : true;
  const isInputDisabled = mounted ? (status !== 'LIVE' && status !== 'RESUMING') : true;
  const isSendDisabled = mounted ? (!input.trim() || (status !== 'LIVE' && status !== 'RESUMING')) : true;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Session Control */}
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Session Control</h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">Toggle connection states to test resilience.</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onConnect}
            disabled={isConnectDisabled}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-1.5 px-3 rounded-lg text-xs transition"
          >
            Connect
          </button>
          <button
            onClick={onDisconnect}
            disabled={isDisconnectDisabled}
            className="flex-1 bg-zinc-850 hover:bg-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-700 text-zinc-300 font-bold py-1.5 px-3 rounded-lg text-xs border border-zinc-800 transition"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Send Prompt */}
      <form
        onSubmit={onSubmit}
        className="lg:col-span-2 bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between space-y-3"
      >
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Send Prompt</h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">Submit prompt to trigger token stream and tool calls.</p>
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isInputDisabled}
            placeholder={
              mounted && status === 'LIVE'
                ? 'Ask the AI agent anything...'
                : 'Connect first to enable prompt submission'
            }
            className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50 disabled:bg-zinc-900/50 disabled:text-zinc-700 transition"
          />
          <button
            type="submit"
            disabled={isSendDisabled}
            className="bg-zinc-850 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-700 font-bold py-1.5 px-4 rounded-lg text-xs transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
