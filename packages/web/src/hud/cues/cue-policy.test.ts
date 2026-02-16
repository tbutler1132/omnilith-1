import { describe, expect, it } from 'vitest';
import { resolveActiveHudCues } from './cue-policy.js';

describe('resolveActiveHudCues', () => {
  it('returns no cues when adaptive mode is disabled', () => {
    const cues = resolveActiveHudCues({
      adaptiveEnabled: false,
      seenCueIds: [],
    });

    expect(cues).toEqual([]);
  });

  it('returns adaptive-help cue when adaptive mode is enabled and unseen', () => {
    const cues = resolveActiveHudCues({
      adaptiveEnabled: true,
      seenCueIds: [],
    });

    expect(cues.map((cue) => cue.id)).toEqual(['adaptive-help']);
  });

  it('does not return a cue that has already been seen in this session', () => {
    const cues = resolveActiveHudCues({
      adaptiveEnabled: true,
      seenCueIds: ['adaptive-help'],
    });

    expect(cues).toEqual([]);
  });
});
