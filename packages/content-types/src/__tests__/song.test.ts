import { describe, expect, it } from 'vitest';
import { validateSong } from '../song/validator.js';

describe('song validator', () => {
  it('accepts a valid song payload', () => {
    const result = validateSong({
      title: 'Signal Bloom',
      artistCredit: 'Omnilith Ensemble',
      status: 'draft',
      tempoBpm: 124,
      keySignature: 'F# minor',
    });

    expect(result.valid).toBe(true);
  });

  it('rejects missing title and artistCredit', () => {
    const result = validateSong({
      title: '',
      artistCredit: '',
      status: 'idea',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('title must be a non-empty string');
    expect(result.issues).toContain('artistCredit must be a non-empty string');
  });

  it('rejects invalid status', () => {
    const result = validateSong({
      title: 'Signal Bloom',
      artistCredit: 'Omnilith Ensemble',
      status: 'shipping',
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.includes('status must be one of'))).toBe(true);
  });
});
