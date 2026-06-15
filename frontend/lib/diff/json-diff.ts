export type DiffStatus = 'added' | 'removed' | 'changed' | 'none';

export interface DiffInfo {
  status: DiffStatus;
  oldValue?: any;
  newValue?: any;
}

export type JsonDiff = Record<string, DiffInfo>;

function isObject(val: any): boolean {
  return val !== null && typeof val === 'object';
}

export function computeJsonDiff(prev: any, next: any, path = ''): JsonDiff {
  const diff: JsonDiff = {};
  const prefix = path ? `${path}.` : '';

  const markTree = (val: any, status: 'added' | 'removed', currentPath: string) => {
    diff[currentPath] = {
      status,
      oldValue: status === 'removed' ? val : undefined,
      newValue: status === 'added' ? val : undefined,
    };
    if (isObject(val)) {
      const keys = Object.keys(val);
      const isArr = Array.isArray(val);
      keys.forEach((k) => {
        const childPath = isArr ? `${currentPath}[${k}]` : `${currentPath}.${k}`;
        markTree(val[k], status, childPath);
      });
    }
  };

  if (prev === next) {
    return diff;
  }

  if (!isObject(prev) || !isObject(next)) {
    diff[path] = {
      status: 'changed',
      oldValue: prev,
      newValue: next,
    };
    return diff;
  }

  const isPrevArray = Array.isArray(prev);
  const isNextArray = Array.isArray(next);

  if (isPrevArray !== isNextArray) {
    diff[path] = {
      status: 'changed',
      oldValue: prev,
      newValue: next,
    };
    return diff;
  }

  if (isPrevArray && isNextArray) {
    const maxLen = Math.max(prev.length, next.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= prev.length) {
        markTree(next[i], 'added', itemPath);
      } else if (i >= next.length) {
        markTree(prev[i], 'removed', itemPath);
      } else {
        Object.assign(diff, computeJsonDiff(prev[i], next[i], itemPath));
      }
    }
  } else {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    const allKeys = Array.from(new Set([...prevKeys, ...nextKeys]));

    for (const key of allKeys) {
      const itemPath = `${prefix}${key}`;
      const hasPrev = key in prev;
      const hasNext = key in next;

      if (hasPrev && !hasNext) {
        markTree(prev[key], 'removed', itemPath);
      } else if (!hasPrev && hasNext) {
        markTree(next[key], 'added', itemPath);
      } else {
        Object.assign(diff, computeJsonDiff(prev[key], next[key], itemPath));
      }
    }
  }

  return diff;
}
