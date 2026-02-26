import { describe, expect, it } from 'vitest';
import {
  clearSystemsViewAppRoute,
  parseSystemsViewAppRoute,
  resolveSystemsViewAppRouteState,
  writeSystemsViewAppRoute,
} from './systems-view-app-route.js';

describe('systems view app route codec', () => {
  it('parses targeted organism and selected child', () => {
    const route = parseSystemsViewAppRoute(new URLSearchParams('organism=org_2&systemsViewChild=child_7'));

    expect(route).toEqual({
      targetedOrganismId: 'org_2',
      selectedChildId: 'child_7',
    });
  });

  it('normalizes unknown or empty values to null', () => {
    const route = parseSystemsViewAppRoute(new URLSearchParams('organism=%20%20&systemsViewChild='));

    expect(route).toEqual({
      targetedOrganismId: null,
      selectedChildId: null,
    });
  });

  it('writes route values into query params', () => {
    const next = writeSystemsViewAppRoute(new URLSearchParams('visor=open&app=systems-view'), {
      targetedOrganismId: 'org_99',
      selectedChildId: 'child_2',
    });

    expect(next.get('organism')).toBe('org_99');
    expect(next.get('systemsViewChild')).toBe('child_2');
  });

  it('clears app-specific route params while keeping shared params', () => {
    const cleared = clearSystemsViewAppRoute(
      new URLSearchParams('visor=open&app=systems-view&organism=org_1&systemsViewChild=child_1'),
    );

    expect(cleared.get('systemsViewChild')).toBeNull();
    expect(cleared.get('organism')).toBe('org_1');
  });

  it('resolves route state with fallback target organism id', () => {
    const resolved = resolveSystemsViewAppRouteState(
      {
        selectedChildId: 'child_8',
      },
      'org_from_shell',
    );

    expect(resolved).toEqual({
      targetedOrganismId: 'org_from_shell',
      selectedChildId: 'child_8',
    });
  });
});
