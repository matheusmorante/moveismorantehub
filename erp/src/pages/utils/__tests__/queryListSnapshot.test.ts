import { describe, expect, it } from 'vitest';
import { shouldClearQueryListSnapshot } from '../queryListSnapshot';

describe('query list snapshot isolation', () => {
  it('clears the previous key snapshot when the current key fails without data', () => {
    expect(shouldClearQueryListSnapshot(undefined, new Error('query failed'))).toBe(true);
  });

  it('keeps a same-key cached result when its background refetch fails', () => {
    expect(shouldClearQueryListSnapshot([{ id: 'cached' }], new Error('refetch failed'))).toBe(false);
  });

  it('does not clear the snapshot while a new key is still loading', () => {
    expect(shouldClearQueryListSnapshot(undefined, undefined)).toBe(false);
  });
});
