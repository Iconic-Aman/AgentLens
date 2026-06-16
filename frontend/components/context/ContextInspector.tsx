// components/context/ContextInspector.tsx
'use client';

import React, { useMemo } from 'react';
import { ContextSnapshotMessage } from '../../lib/types/protocol';
import { computeJsonDiff } from '../../lib/diff/json-diff';
import { JsonTree } from './JsonTree';
import { SnapshotScrubber } from './SnapshotScrubber';

export interface ContextSnapshotHistoryItem {
  msg: ContextSnapshotMessage;
  timestamp: number;
}

interface ContextInspectorProps {
  snapshots: ContextSnapshotHistoryItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  activeContextId: string | null;
}

export const ContextInspector: React.FC<ContextInspectorProps> = ({
  snapshots,
  currentIndex,
  onIndexChange,
  activeContextId,
}) => {
  // Compute diff against preceding snapshot on index or snapshot changes
  const diff = useMemo(() => {
    if (snapshots.length === 0 || currentIndex < 0 || currentIndex >= snapshots.length) {
      return {};
    }
    const current = snapshots[currentIndex].msg.data;
    if (currentIndex === 0) {
      // Diff against empty object to highlight initial snapshot values as "added"
      return computeJsonDiff({}, current);
    }
    const previous = snapshots[currentIndex - 1].msg.data;
    return computeJsonDiff(previous, current);
  }, [snapshots, currentIndex]);

  const activeItem = snapshots[currentIndex];

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden min-h-[450px]">
      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-zinc-950/40 p-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
          Context Inspector
        </span>
        {activeContextId && (
          <span className="text-[9px] bg-zinc-800/80 text-zinc-400 px-1.5 py-0.5 rounded font-mono truncate max-w-[150px]">
            id: {activeContextId}
          </span>
        )}
      </div>

      {/* Scrubber */}
      <SnapshotScrubber
        currentIndex={currentIndex}
        total={snapshots.length}
        onIndexChange={onIndexChange}
        currentSeq={activeItem?.msg.seq}
        currentTimestamp={activeItem?.timestamp}
      />

      {/* State Viewport */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[400px] bg-zinc-950/20">
        {snapshots.length === 0 ? (
          <div className="text-zinc-650 text-xs italic h-full flex flex-col items-center justify-center text-center p-4">
            <span>No context snapshot received.</span>
            <span className="text-[10px] text-zinc-650 mt-1 font-mono">
              Connect and send a prompt to inspect agent state variables.
            </span>
          </div>
        ) : activeItem ? (
          <div className="space-y-1">
            <JsonTree
              value={activeItem.msg.data}
              diff={diff}
              inheritedStatus="none"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
