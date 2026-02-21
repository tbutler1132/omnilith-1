import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../../api/client.js';
import { presentOrganismOverview } from './organism-overview-presenter.js';

describe('presentOrganismOverview', () => {
  it('returns loading when organism data is still loading', () => {
    const result = presentOrganismOverview({
      organismLoading: true,
      childrenLoading: false,
      hasCurrentState: false,
      payload: undefined,
    });

    expect(result.status).toBe('loading');
  });

  it('returns auth-required when read access is forbidden', () => {
    const result = presentOrganismOverview({
      organismLoading: false,
      childrenLoading: false,
      organismError: new ApiError(403, 'Forbidden'),
      hasCurrentState: false,
      payload: undefined,
    });

    expect(result.status).toBe('auth-required');
  });

  it('returns error for non-auth read failures', () => {
    const result = presentOrganismOverview({
      organismLoading: false,
      childrenLoading: false,
      organismError: new Error('Network timeout'),
      hasCurrentState: false,
      payload: undefined,
    });

    expect(result.status).toBe('error');
    expect(result.message).toBe('Network timeout');
  });

  it('returns empty when there is no current state payload', () => {
    const result = presentOrganismOverview({
      organismLoading: false,
      childrenLoading: false,
      hasCurrentState: false,
      payload: undefined,
    });

    expect(result.status).toBe('empty');
  });

  it('returns ready with formatted payload JSON', () => {
    const result = presentOrganismOverview({
      organismLoading: false,
      childrenLoading: false,
      hasCurrentState: true,
      payload: { title: 'Song', bpm: 128 },
    });

    expect(result.status).toBe('ready');
    expect(result.rawPayload).toContain('"title": "Song"');
    expect(result.rawPayload).toContain('"bpm": 128');
  });

  it('returns error when payload cannot be serialized to JSON', () => {
    const result = presentOrganismOverview({
      organismLoading: false,
      childrenLoading: false,
      hasCurrentState: true,
      payload: { value: 4n },
    });

    expect(result.status).toBe('error');
    expect(result.message).toBe('Unable to render raw state payload.');
  });
});
