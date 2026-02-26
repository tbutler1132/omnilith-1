import { describe, expect, it } from 'vitest';
import {
  clearIntegrationQueueAppRoute,
  parseIntegrationQueueAppRoute,
  resolveIntegrationQueueAppRouteState,
  writeIntegrationQueueAppRoute,
} from './integration-queue-app-route.js';

describe('integration queue app route codec', () => {
  it('parses tab, filter, selected proposal, and target organism', () => {
    const route = parseIntegrationQueueAppRoute(
      new URLSearchParams('integrationQueueTab=detail&integrationQueueStatus=all&proposalId=proposal_1&organism=org_2'),
    );

    expect(route).toEqual({
      tab: 'detail',
      statusFilter: 'all',
      selectedProposalId: 'proposal_1',
      targetedOrganismId: 'org_2',
    });
  });

  it('falls back to queue/open defaults for unknown query values', () => {
    const route = parseIntegrationQueueAppRoute(
      new URLSearchParams('integrationQueueTab=unknown&integrationQueueStatus=unknown'),
    );

    expect(route).toEqual({
      tab: 'queue',
      statusFilter: 'open',
      selectedProposalId: null,
      targetedOrganismId: null,
    });
  });

  it('writes route values into query params', () => {
    const next = writeIntegrationQueueAppRoute(new URLSearchParams('visor=open&app=integration-queue'), {
      tab: 'detail',
      statusFilter: 'all',
      selectedProposalId: 'proposal_77',
      targetedOrganismId: 'org_99',
    });

    expect(next.get('integrationQueueTab')).toBe('detail');
    expect(next.get('integrationQueueStatus')).toBe('all');
    expect(next.get('proposalId')).toBe('proposal_77');
    expect(next.get('organism')).toBe('org_99');
  });

  it('clears app-specific route params while keeping shared params', () => {
    const cleared = clearIntegrationQueueAppRoute(
      new URLSearchParams(
        'visor=open&app=integration-queue&integrationQueueTab=detail&integrationQueueStatus=all&proposalId=proposal_3&organism=org_1',
      ),
    );

    expect(cleared.get('integrationQueueTab')).toBeNull();
    expect(cleared.get('integrationQueueStatus')).toBeNull();
    expect(cleared.get('proposalId')).toBeNull();
    expect(cleared.get('organism')).toBe('org_1');
  });

  it('resolves app route state with fallback target organism id', () => {
    const resolved = resolveIntegrationQueueAppRouteState(
      {
        tab: 'detail',
      },
      'org_from_shell',
    );

    expect(resolved).toEqual({
      tab: 'detail',
      statusFilter: 'open',
      selectedProposalId: null,
      targetedOrganismId: 'org_from_shell',
    });
  });
});
