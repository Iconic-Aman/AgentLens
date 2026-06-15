/*
// components/context/SnapshotScrubber.tsx
'use client';

import React from 'react';

interface SnapshotScrubberProps {
  currentIndex: number;
  total: number;
  onIndexChange: (index: number) => void;
  currentSeq?: number;
  currentTimestamp?: number;
}

export const SnapshotScrubber: React.FC<SnapshotScrubberProps> = ({
  currentIndex,
  total,
  onIndexChange,
  currentSeq,
  currentTimestamp,
}) => {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;
  const isDisabled = total <= 1;

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toTimeString().split(' ')[0];
  };

  return (
    <div className="bg-zinc-950/40 border-b border-zinc-800/60 p-3 flex flex-col space-y-2 select-none">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center space-x-2">
          <span className="text-zinc-400 font-bold uppercase tracking-wider">Scrubber</span>
          <span className="text-zinc-600">|</span>
          <span className="text-amber-500 font-semibold">
            {total === 0 ? 'No snapshots' : `Step ${currentIndex + 1} of ${total}`}
          </span>
        </div>
        {total > 0 && (
          <div className="flex items-center space-x-2 text-zinc-500">
            {currentSeq !== undefined && <span>Seq: #{currentSeq}</span>}
            {currentTimestamp !== undefined && (
              <>
                <span>•</span>
                <span>{formatTime(currentTimestamp)}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => onIndexChange(currentIndex - 1)}
          disabled={isDisabled || isFirst}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-35 disabled:hover:bg-zinc-900 text-zinc-300 font-bold p-1 rounded transition text-xs flex items-center justify-center h-7 w-7"
          title="Previous Snapshot"
        >
          ◀
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={total === 0 ? 0 : currentIndex}
          disabled={isDisabled}
          onChange={(e) => onIndexChange(parseInt(e.target.value, 10))}
          className="flex-1 accent-amber-500 h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        />

        <button
          onClick={() => onIndexChange(currentIndex + 1)}
          disabled={isDisabled || isLast}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-35 disabled:hover:bg-zinc-900 text-zinc-300 font-bold p-1 rounded transition text-xs flex items-center justify-center h-7 w-7"
          title="Next Snapshot"
        >
          ▶
        </button>

        <button
          onClick={() => onIndexChange(total - 1)}
          disabled={isDisabled || isLast}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-35 disabled:hover:bg-zinc-900 text-[10px] text-zinc-400 font-bold px-2 rounded transition h-7"
        >
          Live
        </button>
      </div>
    </div>
  );
};
*/
export const SnapshotScrubber = () => null;
