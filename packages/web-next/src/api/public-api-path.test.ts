import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePublicApiPath } from './public-api-path.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolvePublicApiPath', () => {
  it('routes to /public without a session', () => {
    expect(resolvePublicApiPath('/organisms/test')).toBe('/public/organisms/test');
    expect(resolvePublicApiPath('organisms/test')).toBe('/public/organisms/test');
  });

  it('keeps private paths with a session', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'session-abc'),
    } satisfies Pick<Storage, 'getItem'>);

    expect(resolvePublicApiPath('/organisms/test')).toBe('/organisms/test');
    expect(resolvePublicApiPath('organisms/test')).toBe('/organisms/test');
  });

  it('does not double-prefix already public paths', () => {
    expect(resolvePublicApiPath('/public/organisms/test')).toBe('/public/organisms/test');
  });
});
