/**
 * Cross-app navigation prompt guard.
 *
 * Centralizes the rule for when the platform should ask for confirmation
 * before a visor app opens a different visor app.
 */

interface ShouldPromptCrossAppNavigationInput {
  readonly currentAppId: string | null;
  readonly requestedAppId: string;
}

export function shouldPromptCrossAppNavigation(input: ShouldPromptCrossAppNavigationInput): boolean {
  if (!input.currentAppId) {
    return false;
  }

  return input.currentAppId !== input.requestedAppId;
}
