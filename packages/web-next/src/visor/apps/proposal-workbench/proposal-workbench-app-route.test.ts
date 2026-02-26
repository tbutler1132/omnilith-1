import { describe, expect, it } from 'vitest';
import {
  clearProposalWorkbenchAppRoute,
  parseProposalWorkbenchAppRoute,
  resolveProposalWorkbenchAppRouteState,
  writeProposalWorkbenchAppRoute,
} from './proposal-workbench-app-route.js';

describe('proposal workbench app route codec', () => {
  it('parses tab, filter, selected proposal, and target organism', () => {
    const route = parseProposalWorkbenchAppRoute(
      new URLSearchParams(
        'proposalWorkbenchTab=detail&proposalWorkbenchStatus=all&proposalId=proposal_1&organism=org_2',
      ),
    );

    expect(route).toEqual({
      tab: 'detail',
      statusFilter: 'all',
      selectedProposalId: 'proposal_1',
      targetedOrganismId: 'org_2',
    });
  });

  it('falls back to inbox/open defaults for unknown query values', () => {
    const route = parseProposalWorkbenchAppRoute(
      new URLSearchParams('proposalWorkbenchTab=unknown&proposalWorkbenchStatus=unknown'),
    );

    expect(route).toEqual({
      tab: 'inbox',
      statusFilter: 'open',
      selectedProposalId: null,
      targetedOrganismId: null,
    });
  });

  it('writes route values into query params', () => {
    const next = writeProposalWorkbenchAppRoute(new URLSearchParams('visor=open&app=proposal-workbench'), {
      tab: 'detail',
      statusFilter: 'all',
      selectedProposalId: 'proposal_77',
      targetedOrganismId: 'org_99',
    });

    expect(next.get('proposalWorkbenchTab')).toBe('detail');
    expect(next.get('proposalWorkbenchStatus')).toBe('all');
    expect(next.get('proposalId')).toBe('proposal_77');
    expect(next.get('organism')).toBe('org_99');
  });

  it('clears app-specific route params while keeping shared params', () => {
    const cleared = clearProposalWorkbenchAppRoute(
      new URLSearchParams(
        'visor=open&app=proposal-workbench&proposalWorkbenchTab=detail&proposalWorkbenchStatus=all&proposalId=proposal_3&organism=org_1',
      ),
    );

    expect(cleared.get('proposalWorkbenchTab')).toBeNull();
    expect(cleared.get('proposalWorkbenchStatus')).toBeNull();
    expect(cleared.get('proposalId')).toBeNull();
    expect(cleared.get('organism')).toBe('org_1');
  });

  it('resolves app route state with fallback target organism id', () => {
    const resolved = resolveProposalWorkbenchAppRouteState(
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
