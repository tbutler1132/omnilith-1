/**
 * Auth API helpers for web-next.
 *
 * Keeps login request details out of rendering modules so shortcut and
 * future auth UI can share the same boundary.
 */

import { apiFetch } from './api-client.js';

export interface LoginResponse {
  readonly userId: string;
  readonly sessionId: string;
}

export interface LogoutResponse {
  readonly ok: boolean;
}

export async function loginWithPassword(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutSession(): Promise<LogoutResponse> {
  return apiFetch<LogoutResponse>('/auth/logout', {
    method: 'POST',
  });
}
