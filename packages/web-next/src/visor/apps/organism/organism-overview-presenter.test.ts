import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../api/api-client.js';
import { presentOrganismOverview } from './organism-overview-presenter.js';

describe('presentOrganismOverview', () => {
  it('returns loading status while organism is loading', () => {
    const result = presentOrganismOverview({
      organismLoading: true,
      hasCurrentState: false,
      payload: null,
    });

    expect(result.status).toBe('loading');
    expect(result.message).toBe('Loading organism overview...');
  });

  it('returns auth-required status when API denies access', () => {
    const result = presentOrganismOverview({
      organismLoading: false,
      organismError: new ApiError(401, 'Unauthorized'),
      hasCurrentState: false,
      payload: null,
    });

    expect(result.status).toBe('auth-required');
    expect(result.message).toBe('Log in to inspect this overview.');
  });

  it('returns error status for non-auth failures', () => {
    const result = presentOrganismOverview({
      organismLoading: false,
      organismError: new Error('Failed'),
      hasCurrentState: false,
      payload: null,
    });

    expect(result.status).toBe('error');
    expect(result.message).toBe('Failed');
  });

  it('returns empty status when state payload is missing', () => {
    const result = presentOrganismOverview({
      organismLoading: false,
      hasCurrentState: false,
      payload: undefined,
    });

    expect(result.status).toBe('empty');
    expect(result.message).toBe('No current state payload to display.');
  });

  it('returns ready status with formatted payload when available', () => {
    const result = presentOrganismOverview({
      organismLoading: false,
      hasCurrentState: true,
      payload: { title: 'Song', bpm: 128 },
    });

    expect(result.status).toBe('ready');
    expect(result.rawPayload).toContain('"title": "Song"');
    expect(result.rawPayload).toContain('"bpm": 128');
  });
});
