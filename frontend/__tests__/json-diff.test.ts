import { describe, it, expect } from 'vitest';
import { computeJsonDiff } from '../lib/diff/json-diff';

describe('computeJsonDiff', () => {
  it('should return empty diff for identical values', () => {
    expect(computeJsonDiff(1, 1)).toEqual({});
    expect(computeJsonDiff('abc', 'abc')).toEqual({});
    expect(computeJsonDiff(true, true)).toEqual({});
    expect(computeJsonDiff(null, null)).toEqual({});
    expect(computeJsonDiff({ a: 1 }, { a: 1 })).toEqual({});
    expect(computeJsonDiff([1, 2], [1, 2])).toEqual({});
  });

  it('should detect primitive value changes', () => {
    expect(computeJsonDiff(1, 2)).toEqual({
      '': { status: 'changed', oldValue: 1, newValue: 2 },
    });
    expect(computeJsonDiff(true, false)).toEqual({
      '': { status: 'changed', oldValue: true, newValue: false },
    });
    expect(computeJsonDiff('hello', 'world')).toEqual({
      '': { status: 'changed', oldValue: 'hello', newValue: 'world' },
    });
  });

  it('should detect object key additions and removals', () => {
    const prev = { a: 1, b: 2 };
    const next = { b: 2, c: 3 };

    expect(computeJsonDiff(prev, next)).toEqual({
      a: { status: 'removed', oldValue: 1, newValue: undefined },
      c: { status: 'added', oldValue: undefined, newValue: 3 },
    });
  });

  it('should detect changes nested inside objects', () => {
    const prev = { nested: { val: 10 } };
    const next = { nested: { val: 20 } };

    expect(computeJsonDiff(prev, next)).toEqual({
      'nested.val': { status: 'changed', oldValue: 10, newValue: 20 },
    });
  });

  it('should recursively mark entire added/removed object subtrees', () => {
    const prev = { user: { name: 'Alice', age: 30 } };
    const next = {};

    expect(computeJsonDiff(prev, next)).toEqual({
      user: { status: 'removed', oldValue: { name: 'Alice', age: 30 }, newValue: undefined },
      'user.name': { status: 'removed', oldValue: 'Alice', newValue: undefined },
      'user.age': { status: 'removed', oldValue: 30, newValue: undefined },
    });

    const prev2 = {};
    const next2 = { user: { name: 'Bob', details: { id: 1 } } };

    expect(computeJsonDiff(prev2, next2)).toEqual({
      user: { status: 'added', oldValue: undefined, newValue: { name: 'Bob', details: { id: 1 } } },
      'user.name': { status: 'added', oldValue: undefined, newValue: 'Bob' },
      'user.details': { status: 'added', oldValue: undefined, newValue: { id: 1 } },
      'user.details.id': { status: 'added', oldValue: undefined, newValue: 1 },
    });
  });

  it('should compare array elements by index', () => {
    const prev = [1, 2, { x: 10 }];
    const next = [1, 3, { x: 10 }, 4];

    expect(computeJsonDiff(prev, next)).toEqual({
      '[1]': { status: 'changed', oldValue: 2, newValue: 3 },
      '[3]': { status: 'added', oldValue: undefined, newValue: 4 },
    });

    const prev2 = [1, 2, 3];
    const next2 = [1];

    expect(computeJsonDiff(prev2, next2)).toEqual({
      '[1]': { status: 'removed', oldValue: 2, newValue: undefined },
      '[2]': { status: 'removed', oldValue: 3, newValue: undefined },
    });
  });

  it('should handle nested structures in arrays', () => {
    const prev = { list: [{ id: 1 }] };
    const next = { list: [{ id: 2 }] };

    expect(computeJsonDiff(prev, next)).toEqual({
      'list[0].id': { status: 'changed', oldValue: 1, newValue: 2 },
    });
  });
});
