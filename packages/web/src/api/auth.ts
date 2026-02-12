/**
 * Auth API functions — session management.
 */

import { apiFetch } from './client.js';

interface SessionInfo {
  userId: string;
  personalOrganismId: string | null;
}

interface AuthResponse {
  userId: string;
  sessionId: string;
  personalOrganismId?: string;
}

export function fetchSession() {
  return apiFetch<SessionInfo>('/auth/me');
}

export async function login(email: string, password: string) {
  const res = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('sessionId', res.sessionId);
  return res;
}

export async function signup(email: string, password: string) {
  const res = await apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('sessionId', res.sessionId);
  return res;
}
