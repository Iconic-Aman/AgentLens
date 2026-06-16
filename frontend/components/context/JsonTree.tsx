// components/context/JsonTree.tsx
'use client';

import React, { useState } from 'react';
import { JsonDiff, DiffStatus } from '../../lib/diff/json-diff';

interface JsonTreeProps {
  value: any;
  path?: string;
  diff: JsonDiff;
  label?: string;
  inheritedStatus?: DiffStatus;
}

export const JsonTree: React.FC<JsonTreeProps> = ({
  value,
  path = '',
  diff,
  label,
  inheritedStatus = 'none',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const diffInfo = diff[path];
  const status: DiffStatus = diffInfo?.status || inheritedStatus;

  const isValObject = value !== null && typeof value === 'object';
  const isArr = Array.isArray(value);

  const getDiffBgClass = (s: DiffStatus) => {
    switch (s) {
      case 'added':
        return 'bg-emerald-500/5 hover:bg-emerald-500/10 border-l border-emerald-500/30 pl-1.5 transition-colors';
      case 'removed':
        return 'bg-rose-500/5 hover:bg-rose-500/10 border-l border-rose-500/30 pl-1.5 line-through decoration-rose-500/45 transition-colors';
      case 'changed':
        return 'bg-amber-500/5 hover:bg-amber-500/10 border-l border-amber-500/30 pl-1.5 transition-colors';
      default:
        return 'pl-1.5 border-l border-transparent';
    }
  };

  const getLabelColor = (s: DiffStatus) => {
    switch (s) {
      case 'added':
        return 'text-emerald-400 font-semibold';
      case 'removed':
        return 'text-rose-400/80';
      case 'changed':
        return 'text-amber-400 font-semibold';
      default:
        return 'text-zinc-400';
    }
  };

  const renderPrimitive = (val: any) => {
    if (typeof val === 'string') return <span className="text-emerald-300">"{val}"</span>;
    if (typeof val === 'number') return <span className="text-sky-300">{val}</span>;
    if (typeof val === 'boolean') return <span className="text-indigo-300">{String(val)}</span>;
    if (val === null) return <span className="text-zinc-500">null</span>;
    return <span className="text-zinc-300">{String(val)}</span>;
  };

  if (!isValObject) {
    return (
      <div className={`flex items-start space-x-1.5 py-0.5 font-mono text-[11px] leading-relaxed ${getDiffBgClass(status)}`}>
        {label && <span className={`${getLabelColor(status)}`}>{label}:</span>}
        {status === 'changed' && diffInfo ? (
          <span className="flex items-center space-x-1 flex-wrap">
            <span className="text-zinc-500 line-through">{JSON.stringify(diffInfo.oldValue)}</span>
            <span className="text-zinc-600">→</span>
            {renderPrimitive(diffInfo.newValue)}
          </span>
        ) : (
          renderPrimitive(value)
        )}
      </div>
    );
  }

  const keys = Object.keys(value);
  const size = keys.length;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`flex flex-col py-0.5 font-mono text-[11px] ${getDiffBgClass(status)}`}>
      {/* Header Line */}
      <div
        onClick={handleToggle}
        className="flex items-center space-x-1 cursor-pointer select-none py-0.5 hover:text-zinc-200 text-zinc-400"
      >
        <span className="text-[9px] text-zinc-500 w-3 text-center">
          {size > 0 ? (isExpanded ? '▼' : '▶') : ' '}
        </span>
        {label && <span className={`${getLabelColor(status)} mr-0.5`}>{label}:</span>}
        <span className="text-zinc-500">
          {isArr ? `Array(${size})` : `Object(${size})`}
        </span>
        {!isExpanded && <span className="text-zinc-600 text-[10px]">{isArr ? '[...]' : '{...}'}</span>}
      </div>

      {/* Children (Lazy Loaded) */}
      {isExpanded && size > 0 && (
        <div className="ml-4 border-l border-zinc-800/80 pl-1 mt-0.5 space-y-0.5 flex flex-col">
          {keys.map((key) => {
            const childPath = isArr ? `${path}[${key}]` : (path ? `${path}.${key}` : key);
            return (
              <JsonTree
                key={key}
                value={value[key]}
                path={childPath}
                diff={diff}
                label={key}
                inheritedStatus={status}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
