import { describe, expect, it } from 'vitest';
import { validateDawProject } from '../daw-project/validator.js';

describe('daw-project validator', () => {
  it('accepts a valid daw-project payload', () => {
    const result = validateDawProject({
      fileReference: 'dev/projects/song-v2.als',
      daw: 'ableton-live',
      format: 'als',
      versionLabel: 'v2 mix prep',
    });

    expect(result.valid).toBe(true);
  });

  it('rejects missing fileReference', () => {
    const result = validateDawProject({
      daw: 'ableton-live',
      format: 'als',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('fileReference must be a non-empty string');
  });

  it('rejects unknown daw and format', () => {
    const result = validateDawProject({
      fileReference: 'dev/projects/song-v2.abc',
      daw: 'garageband',
      format: 'abc',
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.includes('daw must be one of'))).toBe(true);
    expect(result.issues.some((issue) => issue.includes('format must be one of'))).toBe(true);
  });
});
