/**
 * Secret login shortcut policy for local development.
 *
 * Reintroduces the hidden keyboard gesture from the legacy web package
 * so developers can quickly authenticate while iterating.
 */

export const DEV_SHORTCUT_LOGIN_EMAIL = 'dev@omnilith.local';
export const DEV_SHORTCUT_LOGIN_PASSWORD = 'dev';

interface KeyboardShortcutInput {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
}

export function isSecretLoginShortcut(event: KeyboardShortcutInput): boolean {
  const isModifierPressed = event.metaKey || event.ctrlKey;
  if (!isModifierPressed || !event.shiftKey) {
    return false;
  }

  return event.key.toLowerCase() === 'l';
}
