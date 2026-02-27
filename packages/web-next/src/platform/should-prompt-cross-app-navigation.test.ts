import { describe, expect, it } from 'vitest';
import { shouldPromptCrossAppNavigation } from './should-prompt-cross-app-navigation.js';

describe('shouldPromptCrossAppNavigation', () => {
  it('returns true when the requested app differs from the current app', () => {
    expect(
      shouldPromptCrossAppNavigation({
        currentAppId: 'organism',
        requestedAppId: 'organism-view',
      }),
    ).toBe(true);
  });

  it('returns false when the requested app is the current app', () => {
    expect(
      shouldPromptCrossAppNavigation({
        currentAppId: 'organism-view',
        requestedAppId: 'organism-view',
      }),
    ).toBe(false);
  });

  it('returns false when there is no active app context', () => {
    expect(
      shouldPromptCrossAppNavigation({
        currentAppId: null,
        requestedAppId: 'organism',
      }),
    ).toBe(false);
  });
});
