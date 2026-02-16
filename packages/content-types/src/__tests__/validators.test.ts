import { describe, expect, it } from 'vitest';
import { validateAudio } from '../audio/validator.js';
import { validateCommunity } from '../community/validator.js';
import { validateCompositionReference } from '../composition-reference/validator.js';
import { validateImage } from '../image/validator.js';
import { validateIntegrationPolicy } from '../integration-policy/validator.js';
import { validateSpatialMap } from '../spatial-map/validator.js';
import { validateText } from '../text/validator.js';
import { validateThread } from '../thread/validator.js';

describe('audio validator', () => {
  it('accepts a valid audio payload', () => {
    const result = validateAudio({
      fileReference: 'audio/song.mp3',
      durationSeconds: 180,
      format: 'mp3',
      sampleRate: 44100,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects missing fileReference', () => {
    const result = validateAudio({ durationSeconds: 180, format: 'mp3' });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('fileReference must be a non-empty string');
  });

  it('rejects invalid format', () => {
    const result = validateAudio({
      fileReference: 'audio/song.xyz',
      durationSeconds: 180,
      format: 'xyz',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects zero duration', () => {
    const result = validateAudio({
      fileReference: 'audio/song.mp3',
      durationSeconds: 0,
      format: 'mp3',
    });
    expect(result.valid).toBe(false);
  });
});

describe('text validator', () => {
  it('accepts valid markdown', () => {
    const result = validateText({
      content: '# Hello World',
      format: 'markdown',
    });
    expect(result.valid).toBe(true);
  });

  it('accepts valid plaintext', () => {
    const result = validateText({ content: 'Hello', format: 'plaintext' });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid format', () => {
    const result = validateText({ content: 'Hello', format: 'html' });
    expect(result.valid).toBe(false);
  });

  it('rejects non-string content', () => {
    const result = validateText({ content: 42, format: 'plaintext' });
    expect(result.valid).toBe(false);
  });
});

describe('image validator', () => {
  it('accepts a valid image payload', () => {
    const result = validateImage({
      fileReference: 'images/photo.jpg',
      width: 1920,
      height: 1080,
      format: 'jpg',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects zero dimensions', () => {
    const result = validateImage({
      fileReference: 'images/photo.jpg',
      width: 0,
      height: 1080,
      format: 'jpg',
    });
    expect(result.valid).toBe(false);
  });
});

describe('spatial-map validator', () => {
  it('accepts a valid spatial map', () => {
    const result = validateSpatialMap({
      entries: [
        { organismId: 'org-1', x: 100, y: 100 },
        { organismId: 'org-2', x: 300, y: 300 },
      ],
      width: 1000,
      height: 1000,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects duplicate organism entries', () => {
    const result = validateSpatialMap({
      entries: [
        { organismId: 'org-1', x: 10, y: 20 },
        { organismId: 'org-1', x: 30, y: 40 },
      ],
      width: 1000,
      height: 1000,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid dimensions', () => {
    const result = validateSpatialMap({
      entries: [],
      width: -1,
      height: 1000,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects overlap based on minimum separation', () => {
    const result = validateSpatialMap({
      entries: [
        { organismId: 'org-1', x: 100, y: 100 },
        { organismId: 'org-2', x: 120, y: 120 },
      ],
      width: 1000,
      height: 1000,
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('entries[0] overlaps entries[1]');
  });

  it('rejects removing existing entry during transition validation', () => {
    const result = validateSpatialMap(
      {
        entries: [{ organismId: 'org-1', x: 100, y: 100 }],
        width: 1000,
        height: 1000,
      },
      {
        previousPayload: {
          entries: [
            { organismId: 'org-1', x: 100, y: 100 },
            { organismId: 'org-2', x: 300, y: 300 },
          ],
          width: 1000,
          height: 1000,
        },
      },
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('existing entry removed: org-2');
  });
});

describe('composition-reference validator', () => {
  it('accepts a valid composition reference', () => {
    const result = validateCompositionReference({
      entries: [
        { organismId: 'org-1', position: 0 },
        { organismId: 'org-2', position: 1 },
      ],
      arrangementType: 'sequential',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid arrangement type', () => {
    const result = validateCompositionReference({
      entries: [],
      arrangementType: 'random',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects negative positions', () => {
    const result = validateCompositionReference({
      entries: [{ organismId: 'org-1', position: -1 }],
      arrangementType: 'sequential',
    });
    expect(result.valid).toBe(false);
  });
});

describe('thread validator', () => {
  it('accepts a valid thread creation payload', () => {
    const result = validateThread({
      title: 'Discussion about the album',
      appendOnly: true,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects empty title', () => {
    const result = validateThread({ title: '', appendOnly: true });
    expect(result.valid).toBe(false);
  });

  it('accepts a valid thread post payload', () => {
    const result = validateThread({
      author: 'usr-1',
      content: 'I think we should change the intro.',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(true);
  });

  it('rejects a post with missing content', () => {
    const result = validateThread({
      author: 'usr-1',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
  });
});

describe('community validator', () => {
  it('accepts a valid community payload', () => {
    const result = validateCommunity({
      description: 'A collective of field recordists.',
      mapOrganismId: 'org-1',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects missing description', () => {
    const result = validateCommunity({ mapOrganismId: 'org-1' });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('description must be a non-empty string');
  });

  it('rejects missing mapOrganismId', () => {
    const result = validateCommunity({ description: 'A community.' });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('mapOrganismId must be a non-empty string');
  });

  it('rejects non-object payload', () => {
    const result = validateCommunity('not an object');
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Payload must be an object');
  });
});

describe('integration-policy validator', () => {
  it('accepts a valid single-integrator policy', () => {
    const result = validateIntegrationPolicy({
      mode: 'single-integrator',
      integratorId: 'usr-1',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unknown mode', () => {
    const result = validateIntegrationPolicy({
      mode: 'multi-approver',
      integratorId: 'usr-1',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects missing integratorId', () => {
    const result = validateIntegrationPolicy({
      mode: 'single-integrator',
    });
    expect(result.valid).toBe(false);
  });
});
