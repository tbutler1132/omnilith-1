import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client.js';
import { classifyOrganismMarkerFetchFailure } from './use-organism.js';

describe('classifyOrganismMarkerFetchFailure', () => {
  it('treats 403 errors as restricted markers', () => {
    expect(classifyOrganismMarkerFetchFailure(new ApiError(403, 'Forbidden'))).toEqual({ kind: 'restricted' });
  });

  it('treats 404 errors as restricted markers', () => {
    expect(classifyOrganismMarkerFetchFailure(new ApiError(404, 'Not found'))).toEqual({ kind: 'restricted' });
  });

  it('treats non-access errors as marker errors', () => {
    const failure = classifyOrganismMarkerFetchFailure(new ApiError(500, 'Server error'));
    expect(failure.kind).toBe('error');
    if (failure.kind === 'error') {
      expect(failure.error.message).toBe('Server error');
    }
  });
});
