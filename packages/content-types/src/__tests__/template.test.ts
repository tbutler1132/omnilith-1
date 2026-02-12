import { describe, expect, it } from 'vitest';
import { validateTemplate } from '../template/validator.js';

describe('template validator', () => {
  it('accepts a valid template with a single step', () => {
    const result = validateTemplate({
      name: 'Album',
      description: 'A music album template',
      recipe: [
        {
          ref: 'album',
          contentTypeId: 'composition-reference',
          initialPayload: { entries: [], arrangementType: 'sequential' },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('accepts a valid template with composition (composeInto)', () => {
    const result = validateTemplate({
      name: 'Album with track',
      description: 'An album with a default track',
      recipe: [
        {
          ref: 'album',
          contentTypeId: 'composition-reference',
          initialPayload: { entries: [], arrangementType: 'sequential' },
        },
        {
          ref: 'track',
          contentTypeId: 'audio',
          initialPayload: { fileReference: '', durationSeconds: 0, format: 'mp3' },
          composeInto: 'album',
          position: 0,
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects empty name', () => {
    const result = validateTemplate({
      name: '',
      description: 'A template',
      recipe: [{ ref: 'a', contentTypeId: 'text', initialPayload: {} }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('name must be a non-empty string');
  });

  it('rejects empty recipe', () => {
    const result = validateTemplate({
      name: 'Empty',
      description: 'No steps',
      recipe: [],
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('recipe must contain at least one step');
  });

  it('rejects duplicate refs', () => {
    const result = validateTemplate({
      name: 'Dupes',
      description: 'Duplicate refs',
      recipe: [
        { ref: 'same', contentTypeId: 'text', initialPayload: {} },
        { ref: 'same', contentTypeId: 'text', initialPayload: {} },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("'same' is a duplicate"))).toBe(true);
  });

  it('rejects composeInto pointing to nonexistent ref', () => {
    const result = validateTemplate({
      name: 'Bad ref',
      description: 'References missing step',
      recipe: [{ ref: 'a', contentTypeId: 'text', initialPayload: {}, composeInto: 'nonexistent' }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("unknown ref 'nonexistent'"))).toBe(true);
  });

  it('rejects circular composeInto chain', () => {
    const result = validateTemplate({
      name: 'Circular',
      description: 'Circular composition',
      recipe: [
        { ref: 'a', contentTypeId: 'text', initialPayload: {}, composeInto: 'b' },
        { ref: 'b', contentTypeId: 'text', initialPayload: {}, composeInto: 'a' },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('circular composeInto chain'))).toBe(true);
  });

  it('rejects self-referencing composeInto', () => {
    const result = validateTemplate({
      name: 'Self ref',
      description: 'Self composition',
      recipe: [{ ref: 'a', contentTypeId: 'text', initialPayload: {}, composeInto: 'a' }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('cannot reference itself'))).toBe(true);
  });
});
