import { describe, expect, it } from 'vitest';
import { type FetchOrganismResponse, resolveEnterTargetMapId } from './use-entry-organisms.js';

function createResponse(input: {
  organismId: string;
  contentTypeId: string | null;
  payload?: unknown;
}): FetchOrganismResponse {
  return {
    organism: {
      id: input.organismId,
      name: 'Organism',
    },
    currentState:
      input.contentTypeId === null
        ? null
        : {
            contentTypeId: input.contentTypeId,
            payload: input.payload ?? {},
          },
  };
}

describe('resolveEnterTargetMapId', () => {
  it('returns the organism id for spatial-map states', () => {
    const response = createResponse({
      organismId: 'map-root',
      contentTypeId: 'spatial-map',
    });

    expect(resolveEnterTargetMapId(response)).toBe('map-root');
  });

  it('returns linked map id for community states', () => {
    const response = createResponse({
      organismId: 'community-1',
      contentTypeId: 'community',
      payload: { mapOrganismId: 'map-child' },
    });

    expect(resolveEnterTargetMapId(response)).toBe('map-child');
  });

  it('returns null when community map id is missing or invalid', () => {
    const withoutId = createResponse({
      organismId: 'community-1',
      contentTypeId: 'community',
      payload: { mapOrganismId: 42 },
    });
    const withNoPayload = createResponse({
      organismId: 'community-1',
      contentTypeId: 'community',
    });

    expect(resolveEnterTargetMapId(withoutId)).toBeNull();
    expect(resolveEnterTargetMapId(withNoPayload)).toBeNull();
  });

  it('returns null for non-enterable states or missing state', () => {
    const textResponse = createResponse({
      organismId: 'note-1',
      contentTypeId: 'text',
      payload: { content: 'hello' },
    });
    const noStateResponse = createResponse({
      organismId: 'none',
      contentTypeId: null,
    });

    expect(resolveEnterTargetMapId(textResponse)).toBeNull();
    expect(resolveEnterTargetMapId(noStateResponse)).toBeNull();
  });
});
