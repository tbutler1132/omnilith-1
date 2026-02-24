import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSessionId, hasSessionId, readSessionId } from './session.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('session helpers', () => {
  it('returns null when localStorage is unavailable', () => {
    expect(readSessionId()).toBeNull();
    expect(hasSessionId()).toBe(false);
  });

  it('returns normalized session ids and ignores blank values', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => '  session-42  '),
    } satisfies Pick<Storage, 'getItem'>);

    expect(readSessionId()).toBe('session-42');
    expect(hasSessionId()).toBe(true);

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => '   '),
    } satisfies Pick<Storage, 'getItem'>);

    expect(readSessionId()).toBeNull();
    expect(hasSessionId()).toBe(false);
  });

  it('clears the stored session id when storage supports removeItem', () => {
    const removeItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'session-42'),
      removeItem,
    } satisfies Pick<Storage, 'getItem' | 'removeItem'>);

    clearSessionId();
    expect(removeItem).toHaveBeenCalledWith('sessionId');
  });
});
