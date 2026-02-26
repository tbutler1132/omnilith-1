import type { OrganismState } from '@omnilith/api-contracts';
import { describe, expect, it } from 'vitest';
import { presentOrganismViewStatus, presentStateHistory, stringifyPayload } from './organism-view-presenter.js';

function createState(input: {
  sequenceNumber: number;
  contentTypeId?: string;
  payload?: unknown;
  createdAt?: number;
}): OrganismState {
  return {
    id: `state-${input.sequenceNumber}`,
    organismId: 'org-1',
    contentTypeId: input.contentTypeId ?? 'text',
    payload: input.payload ?? { content: `entry-${input.sequenceNumber}` },
    createdAt: input.createdAt ?? 1700000000000 + input.sequenceNumber,
    createdBy: 'user-1',
    sequenceNumber: input.sequenceNumber,
  };
}

describe('presentOrganismViewStatus', () => {
  it('returns loading while organism view is loading', () => {
    expect(
      presentOrganismViewStatus({
        loading: true,
        error: null,
        hasOrganism: false,
      }),
    ).toEqual({
      status: 'loading',
      message: 'Loading organism view...',
    });
  });

  it('returns empty when no organism is available', () => {
    expect(
      presentOrganismViewStatus({
        loading: false,
        error: null,
        hasOrganism: false,
      }),
    ).toEqual({
      status: 'empty',
      message: 'No organism is available in this boundary context.',
    });
  });

  it('returns ready when data is available', () => {
    expect(
      presentOrganismViewStatus({
        loading: false,
        error: null,
        hasOrganism: true,
      }),
    ).toEqual({
      status: 'ready',
      message: '',
    });
  });
});

describe('presentStateHistory', () => {
  it('orders history by newest sequence first', () => {
    const result = presentStateHistory({
      states: [
        createState({ sequenceNumber: 1 }),
        createState({ sequenceNumber: 3 }),
        createState({ sequenceNumber: 2 }),
      ],
      visibleCount: 20,
    });

    expect(result.entries.map((entry) => entry.sequenceNumber)).toEqual([3, 2, 1]);
    expect(result.hasMore).toBe(false);
  });

  it('indicates when more entries are available than visible', () => {
    const result = presentStateHistory({
      states: Array.from({ length: 25 }, (_, index) => createState({ sequenceNumber: index + 1 })),
      visibleCount: 20,
    });

    expect(result.entries).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });
});

describe('stringifyPayload', () => {
  it('returns a fallback message for undefined payloads', () => {
    expect(stringifyPayload(undefined)).toBe('No payload');
  });

  it('renders object payloads as pretty JSON', () => {
    expect(stringifyPayload({ title: 'Field Note' })).toContain('"title": "Field Note"');
  });
});
