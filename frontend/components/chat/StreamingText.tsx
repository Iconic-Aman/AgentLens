// components/chat/StreamingText.tsx
'use client';

import React, { useEffect, useRef } from 'react';

// Shared registry mapping segment IDs (e.g. "streamId_segmentIndex") to their active DOM span elements
export const activeStreamSpans = new Map<string, HTMLSpanElement>();

interface StreamingTextProps {
  streamId: string;
  initialText: string;
}

export const StreamingText: React.FC<StreamingTextProps> = React.memo(({ streamId, initialText }) => {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const span = spanRef.current;
    if (span) {
      activeStreamSpans.set(streamId, span);
      span.textContent = initialText;
    }
    return () => {
      activeStreamSpans.delete(streamId);
    };
  }, [streamId, initialText]);

  return (
    <span
      ref={spanRef}
      className="text-zinc-100 text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap font-sans"
    />
  );
});

StreamingText.displayName = 'StreamingText';
