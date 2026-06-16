// components/chat/StreamingText.tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface StreamingTextProps {
  text: string;
}

export const StreamingText: React.FC<StreamingTextProps> = React.memo(({ text }) => {
  return (
    <span className="text-zinc-100 text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap font-sans">
      {text}
    </span>
  );
});

StreamingText.displayName = 'StreamingText';
