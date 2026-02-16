import { describe, expect, it } from 'vitest';
import { validateStemsBundle } from '../stems-bundle/validator.js';

describe('stems-bundle validator', () => {
  it('accepts a valid stems-bundle payload', () => {
    const result = validateStemsBundle({
      fileReference: 'dev/stems/song-v3.zip',
      format: 'zip',
      stemCount: 12,
      sampleRate: 48000,
      bitDepth: 24,
    });

    expect(result.valid).toBe(true);
  });

  it('rejects invalid bitDepth', () => {
    const result = validateStemsBundle({
      fileReference: 'dev/stems/song-v3.zip',
      format: 'zip',
      bitDepth: 20,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.includes('bitDepth must be one of'))).toBe(true);
  });

  it('rejects zero sampleRate and stemCount', () => {
    const result = validateStemsBundle({
      fileReference: 'dev/stems/song-v3.zip',
      format: 'zip',
      sampleRate: 0,
      stemCount: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('sampleRate must be a positive number when provided');
    expect(result.issues).toContain('stemCount must be a positive number when provided');
  });
});
