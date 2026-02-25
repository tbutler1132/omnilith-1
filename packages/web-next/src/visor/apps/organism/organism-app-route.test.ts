import { describe, expect, it } from 'vitest';
import { parseOrganismAppRoute, resolveOrganismAppRouteState, writeOrganismAppRoute } from './organism-app-route.js';

describe('organism app route codec', () => {
  it('parses tab and targeted organism from query params', () => {
    const route = parseOrganismAppRoute(new URLSearchParams('organismTab=my-organisms&organism=org_42'));

    expect(route).toEqual({
      tab: 'my-organisms',
      targetedOrganismId: 'org_42',
    });
  });

  it('falls back to overview tab for unknown values', () => {
    const route = parseOrganismAppRoute(new URLSearchParams('organismTab=unknown'));

    expect(route).toEqual({
      tab: 'overview',
      targetedOrganismId: null,
    });
  });

  it('writes tab and organism target into query params', () => {
    const next = writeOrganismAppRoute(new URLSearchParams('visor=open&app=organism'), {
      tab: 'my-organisms',
      targetedOrganismId: 'org_99',
    });

    expect(next.get('organismTab')).toBe('my-organisms');
    expect(next.get('organism')).toBe('org_99');
  });

  it('resolves app route state with fallback target organism id', () => {
    const resolved = resolveOrganismAppRouteState(
      {
        tab: 'overview',
      },
      'org_from_shell',
    );

    expect(resolved).toEqual({
      tab: 'overview',
      targetedOrganismId: 'org_from_shell',
    });
  });
});
