// components/Header.tsx
'use client';

import React from 'react';
import { ConnectionStatus } from '../lib/ws/connection';

interface HeaderProps {
  status: ConnectionStatus;
  lastSeq: number;
}

export const Header: React.FC<HeaderProps> = ({ status, lastSeq }) => {
  const getStatusColor = (currentStatus: ConnectionStatus) => {
    switch (currentStatus) {
      case 'LIVE':
        return 'bg-emerald-500 text-emerald-100 border-emerald-500/30';
      case 'RESUMING':
        return 'bg-amber-500 text-amber-100 border-amber-500/30 animate-pulse';
      case 'CONNECTING':
        return 'bg-blue-500 text-blue-100 border-blue-500/30 animate-pulse';
      case 'RECONNECTING':
        return 'bg-rose-500 text-rose-100 border-rose-500/30 animate-pulse';
      case 'CONNECTED':
        return 'bg-cyan-500 text-cyan-100 border-cyan-500/30';
      default:
        return 'bg-zinc-700 text-zinc-300 border-zinc-600/30';
    }
  };

  return (
    <header className="border-b border-zinc-800/60 bg-[#0B0B0C] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center w-full">
        {/* Logo */}
        <div className="flex items-center">
          <a className="mr-2 sm:mr-4 -mt-1 -ml-1" href="/">
            <img
              alt="Alchemyst AI"
              loading="lazy"
              width={200}
              height={50}
              className="h-6 sm:h-8 w-auto object-contain"
              src="/logo.png"
            />
          </a>
          <span className="text-zinc-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900/40">
            Console
          </span>
        </div>

        {/* Right Side: Status Badge */}
        <div className="flex items-center space-x-3">
          <span className="text-[10px] text-zinc-500 font-mono">Seq: {lastSeq}</span>

          <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${getStatusColor(status)} flex items-center space-x-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full bg-current ${status === 'CONNECTING' || status === 'RECONNECTING' || status === 'RESUMING' ? 'animate-ping' : ''}`} />
            <span>{status}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
