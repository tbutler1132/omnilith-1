import { describe, expect, it } from 'vitest';
import { resolvePrimaryClickIntent } from './SpaceOrganism.js';

describe('resolvePrimaryClickIntent', () => {
  it('allows focus for restricted markers before close focus', () => {
    expect(
      resolvePrimaryClickIntent({
        restricted: true,
        focused: false,
        altitude: 'mid',
        hasCurrentState: false,
      }),
    ).toBe('focus');
  });

  it('blocks enter for focused restricted markers at close altitude', () => {
    expect(
      resolvePrimaryClickIntent({
        restricted: true,
        focused: true,
        altitude: 'close',
        hasCurrentState: false,
      }),
    ).toBe('none');
  });

  it('allows enter for accessible focused markers at close altitude', () => {
    expect(
      resolvePrimaryClickIntent({
        restricted: false,
        focused: true,
        altitude: 'close',
        hasCurrentState: true,
      }),
    ).toBe('enter');
  });
});
