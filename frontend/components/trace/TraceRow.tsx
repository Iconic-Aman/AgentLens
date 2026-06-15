// components/trace/TraceRow.tsx
'use client';

import React, { useState } from 'react';
import { TraceEvent } from '../../lib/ws/trace-manager';

interface TraceRowProps {
  event: TraceEvent;
  isHighlighted: boolean;
  onSelect: () => void;
}

export const TraceRow: React.FC<TraceRowProps> = ({
  event,
  isHighlighted,
  onSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'TOKEN_BATCH':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700/60';
      case 'TOOL_CALL':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'TOOL_ACK':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'TOOL_RESULT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PING':
      case 'PONG':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  // Check if this event represents a tool result to indent it (visual linking)
  const isLinkedResult = event.type === 'TOOL_RESULT' || event.type === 'TOOL_ACK';

  return (
    <div
      onClick={onSelect}
      className={`p-2 border-b border-zinc-900 text-[10px] font-mono transition cursor-pointer select-none flex flex-col space-y-1 hover:bg-zinc-900/30 ${
        isHighlighted ? 'bg-amber-500/10 border-l-2 border-l-amber-500 pl-1.5' : 'pl-2'
      } ${isLinkedResult ? 'border-l-2 border-l-zinc-800 ml-3' : ''}`}
    >
      <div className="flex items-center justify-between">
        {/* Left Info: Time, Seq, Type */}
        <div className="flex items-center space-x-2">
          <span className="text-zinc-600">{formatTime(event.timestamp)}</span>
          {event.seq !== undefined && <span className="text-zinc-500">#{event.seq}</span>}
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${getBadgeClass(event.type)}`}>
            {event.type}
          </span>
        </div>

        {/* Right Info: Additional indicators */}
        <div>
          {event.type === 'TOKEN_BATCH' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-[9px] text-zinc-500 hover:text-zinc-300 font-semibold flex items-center space-x-1"
            >
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
              <span>{isExpanded ? '▲' : '▼'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Event Details Content */}
      <div className="text-zinc-400 leading-normal pl-1">
        {event.type === 'TOKEN_BATCH' && (
          <div>
            <div className="text-zinc-500">
              Streamed {event.tokenCount} tokens ({((event.endTime - event.startTime) / 1000).toFixed(2)}s)
            </div>
            {isExpanded && (
              <pre className="mt-1 bg-zinc-950 p-2 rounded text-zinc-300 border border-zinc-900 overflow-x-auto whitespace-pre-wrap max-h-[80px]">
                {event.text}
              </pre>
            )}
          </div>
        )}

        {event.type === 'TOOL_CALL' && (
          <div>
            call_id: <span className="text-amber-400 font-bold">{event.payload.call_id}</span> | tool: <span className="text-zinc-200">{event.payload.tool_name}</span>
          </div>
        )}

        {event.type === 'TOOL_ACK' && (
          <div>
            Acked call_id: <span className="text-blue-400">{event.payload.call_id}</span>
          </div>
        )}

        {event.type === 'TOOL_RESULT' && (
          <div>
            call_id: <span className="text-emerald-400 font-bold">{event.payload.call_id}</span> | status: <span className="text-zinc-500">resolved</span>
          </div>
        )}

        {event.type === 'PING' && (
          <div>
            Challenge: <span className="text-zinc-500">"{event.payload.challenge || 'empty'}"</span>
          </div>
        )}

        {event.type === 'PONG' && (
          <div>
            Echo: <span className="text-zinc-500">"{event.payload.echo || 'empty'}"</span>
          </div>
        )}

        {event.type === 'CONTEXT_SNAPSHOT' && (
          <div>
            context_id: <span className="text-cyan-400">{event.payload.context_id}</span>
          </div>
        )}

        {event.type === 'ERROR' && (
          <div className="text-rose-400">
            [{event.payload.code}] {event.payload.message}
          </div>
        )}

        {event.type === 'USER_MESSAGE' && (
          <div>
            content: <span className="text-zinc-300">"{event.payload.content}"</span>
          </div>
        )}

        {event.type === 'RESUME' && (
          <div>
            last_seq: <span className="text-zinc-300">{event.payload.last_seq}</span>
          </div>
        )}
      </div>
    </div>
  );
};
