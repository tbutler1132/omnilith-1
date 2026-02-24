/**
 * Session access helpers for web-next API calls.
 *
 * Centralizes session-id reads so browser-only globals stay contained
 * and other modules can remain environment-safe.
 */

const SESSION_ID_KEY = 'sessionId';

export function readSessionId(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const storage: Partial<Storage> = localStorage;
  if (typeof storage.getItem !== 'function') {
    return null;
  }

  const value = storage.getItem(SESSION_ID_KEY);
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function hasSessionId(): boolean {
  return readSessionId() !== null;
}
