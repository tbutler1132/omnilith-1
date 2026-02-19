import { describe, expect, it } from 'vitest';
import { resolvePublicFileUrl } from './files.js';

describe('resolvePublicFileUrl', () => {
  it('maps local fileReference paths to the public files API route', () => {
    expect(resolvePublicFileUrl('dev/audio/hero song.wav')).toBe('/api/public/files/dev/audio/hero%20song.wav');
  });

  it('returns absolute HTTPS URLs as-is for object storage playback', () => {
    const r2Url = 'https://pub-12345.r2.dev/heros-journey/01-signal.wav';
    expect(resolvePublicFileUrl(r2Url)).toBe(r2Url);
  });
});
