// components/chat/ToolCallCard.tsx
'use client';

import React from 'react';

interface ToolCallCardProps {
  toolName: string;
  args: Record<string, any>;
  result?: Record<string, any>;
  status: 'pending' | 'acked' | 'completed';
  isHighlighted?: boolean;
  onClick?: () => void;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolName,
  args,
  result,
  status,
  isHighlighted = false,
  onClick,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            COMPLETED
          </span>
        );
      case 'acked':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            ACKNOWLEDGED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            CALLING...
          </span>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className={`my-4 overflow-hidden rounded-xl shadow-lg shadow-black/10 backdrop-blur-sm max-w-2xl w-full border transition-all cursor-pointer ${
        isHighlighted
          ? 'bg-amber-950/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30'
          : 'bg-zinc-900/60 border-zinc-850 hover:border-zinc-800'
      }`}
    >
      {/* Card Header */}
      <div className="bg-zinc-950/40 border-b border-zinc-800/60 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Tool Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-500"
          >
            <path d="m21 16-4 4-4-4" />
            <path d="M17 20V4" />
            <path d="m3 8 4-4 4 4" />
            <path d="M7 4v16" />
          </svg>
          <span className="text-xs font-mono font-bold text-zinc-300">
            tool: <span className="text-zinc-100">{toolName}</span>
          </span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3 font-mono text-[11px] leading-relaxed">
        {/* Arguments Block */}
        <div>
          <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-semibold">Arguments</span>
          <pre className="bg-zinc-950/70 border border-zinc-850 p-2.5 rounded-lg text-zinc-400 overflow-x-auto">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>

        {/* Result Block (only if completed/has result) */}
        {status === 'completed' && result && (
          <div className="border-t border-zinc-800/40 pt-3 animate-fadeIn">
            <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-semibold">Result</span>
            <pre className="bg-zinc-950/80 border border-zinc-850 p-2.5 rounded-lg text-amber-500/90 overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
