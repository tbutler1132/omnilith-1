/**
 * Auth request bus — lightweight event bridge for opening auth UI.
 *
 * Lets panel-level guest prompts request authentication without coupling
 * deeply to app-shell state.
 */

const AUTH_REQUEST_EVENT = 'omnilith:auth-request';

export function requestAuthDialog(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_REQUEST_EVENT));
}

export function subscribeToAuthDialogRequests(onRequest: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => onRequest();
  window.addEventListener(AUTH_REQUEST_EVENT, handler);

  return () => {
    window.removeEventListener(AUTH_REQUEST_EVENT, handler);
  };
}
