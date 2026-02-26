import { describe, expect, it } from 'vitest';
import {
  clearQueryExplorerAppRoute,
  parseQueryExplorerAppRoute,
  QUERY_EXPLORER_DEFAULT_LIMIT,
  QUERY_EXPLORER_DEFAULT_OFFSET,
  resolveQueryExplorerAppRouteState,
  writeQueryExplorerAppRoute,
} from './query-explorer-app-route.js';

describe('query explorer app route codec', () => {
  it('parses query explorer filter and pagination state', () => {
    const route = parseQueryExplorerAppRoute(
      new URLSearchParams(
        'organism=org_12&queryExplorerQ=sonic&queryExplorerContentTypeId=text&queryExplorerCreatedBy=user_3&queryExplorerLimit=40&queryExplorerOffset=80&queryExplorerSelected=org_55',
      ),
    );

    expect(route).toEqual({
      targetedOrganismId: 'org_12',
      query: 'sonic',
      contentTypeId: 'text',
      createdBy: 'user_3',
      limit: 40,
      offset: 80,
      selectedOrganismId: 'org_55',
    });
  });

  it('normalizes unknown and invalid values to defaults', () => {
    const route = parseQueryExplorerAppRoute(
      new URLSearchParams(
        'organism=%20%20&queryExplorerQ=%20%20&queryExplorerContentTypeId=&queryExplorerCreatedBy=&queryExplorerLimit=-2&queryExplorerOffset=abc&queryExplorerSelected=%20',
      ),
    );

    expect(route).toEqual({
      targetedOrganismId: null,
      query: '',
      contentTypeId: null,
      createdBy: null,
      limit: QUERY_EXPLORER_DEFAULT_LIMIT,
      offset: QUERY_EXPLORER_DEFAULT_OFFSET,
      selectedOrganismId: null,
    });
  });

  it('writes query explorer route values into query params', () => {
    const next = writeQueryExplorerAppRoute(new URLSearchParams('visor=open&app=query-explorer'), {
      targetedOrganismId: 'org_99',
      query: 'ambient',
      contentTypeId: 'audio',
      createdBy: 'user_9',
      limit: 10,
      offset: 20,
      selectedOrganismId: 'org_11',
    });

    expect(next.get('organism')).toBe('org_99');
    expect(next.get('queryExplorerQ')).toBe('ambient');
    expect(next.get('queryExplorerContentTypeId')).toBe('audio');
    expect(next.get('queryExplorerCreatedBy')).toBe('user_9');
    expect(next.get('queryExplorerLimit')).toBe('10');
    expect(next.get('queryExplorerOffset')).toBe('20');
    expect(next.get('queryExplorerSelected')).toBe('org_11');
  });

  it('clears app-specific route params while keeping shared params', () => {
    const cleared = clearQueryExplorerAppRoute(
      new URLSearchParams(
        'visor=open&app=query-explorer&organism=org_1&queryExplorerQ=abc&queryExplorerContentTypeId=text&queryExplorerCreatedBy=user_1&queryExplorerLimit=25&queryExplorerOffset=0&queryExplorerSelected=org_2',
      ),
    );

    expect(cleared.get('queryExplorerQ')).toBeNull();
    expect(cleared.get('queryExplorerContentTypeId')).toBeNull();
    expect(cleared.get('queryExplorerCreatedBy')).toBeNull();
    expect(cleared.get('queryExplorerLimit')).toBeNull();
    expect(cleared.get('queryExplorerOffset')).toBeNull();
    expect(cleared.get('queryExplorerSelected')).toBeNull();
    expect(cleared.get('organism')).toBe('org_1');
  });

  it('resolves route state with fallback target organism id', () => {
    const resolved = resolveQueryExplorerAppRouteState(
      {
        query: 'map',
        selectedOrganismId: 'org_2',
      },
      'org_from_shell',
    );

    expect(resolved).toEqual({
      targetedOrganismId: 'org_from_shell',
      query: 'map',
      contentTypeId: null,
      createdBy: null,
      limit: QUERY_EXPLORER_DEFAULT_LIMIT,
      offset: QUERY_EXPLORER_DEFAULT_OFFSET,
      selectedOrganismId: 'org_2',
    });
  });
});
