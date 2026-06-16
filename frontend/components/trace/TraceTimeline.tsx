// components/trace/TraceTimeline.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TraceEvent } from '../../lib/ws/trace-manager';
import { TraceRow } from './TraceRow';

interface TraceTimelineProps {
  events: TraceEvent[];
  highlightedId: string | null;
  onSelectEvent: (event: TraceEvent) => void;
  onFilterChange: (type: string, query: string) => void;
}

export const TraceTimeline: React.FC<TraceTimelineProps> = ({
  events,
  highlightedId,
  onSelectEvent,
  onFilterChange,
}) => {
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Notify parent component of filter/search criteria changes
  useEffect(() => {
    onFilterChange(filterType, searchQuery);
  }, [filterType, searchQuery, onFilterChange]);

  const rowVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  // Automatically scroll to bottom if a new event arrives
  useEffect(() => {
    if (events.length > 0) {
      rowVirtualizer.scrollToIndex(events.length - 1, { align: 'end' });
    }
  }, [events.length, rowVirtualizer]);

  // Automatically scroll to highlighted item when it changes
  useEffect(() => {
    if (highlightedId && events.length > 0) {
      const index = events.findIndex((e) => e.id === highlightedId);
      if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, { align: 'center' });
      }
    }
  }, [highlightedId, events, rowVirtualizer]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden min-h-[450px]">
      {/* Header and Filters */}
      <div className="border-b border-zinc-800/60 bg-zinc-950/40 p-3 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Agent Trace Timeline</span>
          <span className="text-[9px] bg-zinc-800/80 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
            {events.length} events
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Filter Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="col-span-1 bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">ALL</option>
            <option value="TOKEN">TOKEN</option>
            <option value="TOOL_CALL">CALL</option>
            <option value="TOOL_RESULT">RESULT</option>
            <option value="PING">PING</option>
            <option value="PONG">PONG</option>
            <option value="CONTEXT_SNAPSHOT">CONTEXT</option>
            <option value="ERROR">ERROR</option>
          </select>

          {/* Search Field */}
          <input
            type="text"
            placeholder="Search trace content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="col-span-2 bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1 text-[10px] text-zinc-300 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Virtualized List Viewport */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto max-h-[400px]"
        style={{ contain: 'strict' }}
      >
        {events.length === 0 ? (
          <div className="text-zinc-600 text-xs italic h-full flex items-center justify-center p-4">
            No events match current filter.
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const event = events[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TraceRow
                    event={event}
                    isHighlighted={highlightedId === event.id}
                    onSelect={() => onSelectEvent(event)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
