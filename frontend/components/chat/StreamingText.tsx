// components/chat/StreamingText.tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface StreamingTextProps {
  text: string;
}

export const StreamingText: React.FC<StreamingTextProps> = React.memo(({ text }) => {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (spanRef.current) {
      // Direct DOM update to bypass virtual DOM tree reconciliation on the text node hot-path
      spanRef.current.textContent = text;
    }
  }, [text]);

  return (
    <span
      ref={spanRef}
      className="text-zinc-100 text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap font-sans"
    />
  );
});

StreamingText.displayName = 'StreamingText';
