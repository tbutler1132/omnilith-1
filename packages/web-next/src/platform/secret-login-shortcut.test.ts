import { describe, expect, it } from 'vitest';
import { isSecretLoginShortcut } from './secret-login-shortcut.js';

describe('isSecretLoginShortcut', () => {
  it('matches shift+meta+l and shift+ctrl+l', () => {
    expect(
      isSecretLoginShortcut({
        key: 'l',
        metaKey: true,
        ctrlKey: false,
        shiftKey: true,
      }),
    ).toBe(true);

    expect(
      isSecretLoginShortcut({
        key: 'L',
        metaKey: false,
        ctrlKey: true,
        shiftKey: true,
      }),
    ).toBe(true);
  });

  it('does not match when modifiers are incomplete', () => {
    expect(
      isSecretLoginShortcut({
        key: 'l',
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
      }),
    ).toBe(false);

    expect(
      isSecretLoginShortcut({
        key: 'l',
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
      }),
    ).toBe(false);
  });

  it('does not match other keys', () => {
    expect(
      isSecretLoginShortcut({
        key: 'k',
        metaKey: true,
        ctrlKey: false,
        shiftKey: true,
      }),
    ).toBe(false);
  });
});
