import { describe, expect, it } from 'vitest';
import { parseVisorRoute } from './visor-route.js';

describe('parseVisorRoute', () => {
  it('defaults to closed mode when query is empty', () => {
    const result = parseVisorRoute(new URLSearchParams(''));

    expect(result).toEqual({
      mode: 'closed',
      appId: null,
      organismId: null,
    });
  });

  it('parses open mode and explicit app context', () => {
    const result = parseVisorRoute(new URLSearchParams('visor=open&app=map&organism=org_123'));

    expect(result).toEqual({
      mode: 'open',
      appId: 'map',
      organismId: 'org_123',
    });
  });

  it('normalizes blank values to null', () => {
    const result = parseVisorRoute(new URLSearchParams('visor=open&app=%20%20&organism='));

    expect(result).toEqual({
      mode: 'open',
      appId: null,
      organismId: null,
    });
  });
});
