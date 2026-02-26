import { describe, expect, it } from 'vitest';
import { resolveMarkerVariant } from './marker-variant.js';

describe('resolveMarkerVariant', () => {
  it('returns default marker variant for community content in simplified mode', () => {
    expect(resolveMarkerVariant({ name: 'Capital Community', contentTypeId: 'community' })).toBe('default');
  });

  it('returns institution and system variants for key composition references', () => {
    expect(resolveMarkerVariant({ name: 'Capital Guild', contentTypeId: 'composition-reference' })).toBe('institution');
    expect(resolveMarkerVariant({ name: 'Software System', contentTypeId: 'composition-reference' })).toBe('system');
  });

  it('returns regulation for regulation content types', () => {
    expect(resolveMarkerVariant({ name: 'Policy', contentTypeId: 'integration-policy' })).toBe('regulation');
    expect(resolveMarkerVariant({ name: 'Sensor', contentTypeId: 'sensor' })).toBe('regulation');
  });

  it('returns media-specific marker variants when available', () => {
    expect(resolveMarkerVariant({ name: 'Song A', contentTypeId: 'song' })).toBe('song');
    expect(resolveMarkerVariant({ name: 'Scene A', contentTypeId: 'hero-journey-scene' })).toBe('hero-journey-scene');
    expect(resolveMarkerVariant({ name: 'Repo A', contentTypeId: 'github-repository' })).toBe('github-repository');
  });

  it('falls back to default when no mapped variant exists', () => {
    expect(resolveMarkerVariant({ name: 'Text note', contentTypeId: 'text' })).toBe('default');
    expect(resolveMarkerVariant({ name: 'Unknown', contentTypeId: null })).toBe('default');
  });
});
