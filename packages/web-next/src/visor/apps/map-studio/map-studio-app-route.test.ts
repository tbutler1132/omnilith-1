import { describe, expect, it } from 'vitest';
import {
  clearMapStudioAppRoute,
  parseMapStudioAppRoute,
  resolveMapStudioAppRouteState,
  writeMapStudioAppRoute,
} from './map-studio-app-route.js';

describe('map studio app route codec', () => {
  it('parses targeted map and selected candidate', () => {
    const route = parseMapStudioAppRoute(new URLSearchParams('organism=map_2&mapStudioCandidate=org_7'));

    expect(route).toEqual({
      targetedOrganismId: 'map_2',
      selectedCandidateId: 'org_7',
    });
  });

  it('normalizes empty route values to null', () => {
    const route = parseMapStudioAppRoute(new URLSearchParams('organism=%20%20&mapStudioCandidate='));

    expect(route).toEqual({
      targetedOrganismId: null,
      selectedCandidateId: null,
    });
  });

  it('writes map studio route params', () => {
    const next = writeMapStudioAppRoute(new URLSearchParams('visor=open&app=map-studio'), {
      targetedOrganismId: 'map_99',
      selectedCandidateId: 'org_2',
    });

    expect(next.get('organism')).toBe('map_99');
    expect(next.get('mapStudioCandidate')).toBe('org_2');
  });

  it('clears app-specific route keys while keeping organism target', () => {
    const cleared = clearMapStudioAppRoute(
      new URLSearchParams('visor=open&app=map-studio&organism=map_1&mapStudioCandidate=org_1'),
    );

    expect(cleared.get('mapStudioCandidate')).toBeNull();
    expect(cleared.get('organism')).toBe('map_1');
  });

  it('resolves fallback targeted map id', () => {
    const resolved = resolveMapStudioAppRouteState(
      {
        selectedCandidateId: 'org_8',
      },
      'map_from_shell',
    );

    expect(resolved).toEqual({
      targetedOrganismId: 'map_from_shell',
      selectedCandidateId: 'org_8',
    });
  });
});
