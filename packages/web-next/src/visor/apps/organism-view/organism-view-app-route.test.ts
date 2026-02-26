import { describe, expect, it } from 'vitest';
import {
  parseOrganismViewAppRoute,
  resolveOrganismViewAppRouteState,
  writeOrganismViewAppRoute,
} from './organism-view-app-route.js';

describe('organism view app route codec', () => {
  it('parses tab and targeted organism from query params', () => {
    const route = parseOrganismViewAppRoute(new URLSearchParams('organismViewTab=composition&organism=org_42'));

    expect(route).toEqual({
      tab: 'composition',
      targetedOrganismId: 'org_42',
    });
  });

  it('falls back to state tab for unknown values', () => {
    const route = parseOrganismViewAppRoute(new URLSearchParams('organismViewTab=unknown'));

    expect(route).toEqual({
      tab: 'state',
      targetedOrganismId: null,
    });
  });

  it('writes tab and organism target into query params', () => {
    const next = writeOrganismViewAppRoute(new URLSearchParams('visor=open&app=organism-view'), {
      tab: 'governance',
      targetedOrganismId: 'org_99',
    });

    expect(next.get('organismViewTab')).toBe('governance');
    expect(next.get('organism')).toBe('org_99');
  });

  it('resolves app route state with fallback target organism id', () => {
    const resolved = resolveOrganismViewAppRouteState(
      {
        tab: 'state-history',
      },
      'org_from_shell',
    );

    expect(resolved).toEqual({
      tab: 'state-history',
      targetedOrganismId: 'org_from_shell',
    });
  });
});
