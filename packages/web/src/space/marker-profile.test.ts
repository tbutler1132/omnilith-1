import { describe, expect, it } from 'vitest';
import { resolveMarkerProfile } from './marker-profile.js';

describe('resolveMarkerProfile', () => {
  it('classifies capital composition-reference organisms as institutions', () => {
    expect(resolveMarkerProfile({ name: 'Capital Technology', contentTypeId: 'composition-reference' })).toBe(
      'institution',
    );
  });

  it('classifies software system composition-reference organism as system', () => {
    expect(resolveMarkerProfile({ name: 'Software System', contentTypeId: 'composition-reference' })).toBe('system');
  });

  it('classifies regulation content types as regulation', () => {
    expect(resolveMarkerProfile({ name: 'capital-cadence-response-policy', contentTypeId: 'response-policy' })).toBe(
      'regulation',
    );
  });

  it('returns undefined for regular creative content markers', () => {
    expect(resolveMarkerProfile({ name: 'Rain on Tin', contentTypeId: 'audio' })).toBeUndefined();
  });
});
