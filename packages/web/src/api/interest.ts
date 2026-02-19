/**
 * Interest API — guest email capture for demo-gated panels.
 */

import { apiFetch } from './client.js';

export type InterestSourcePanel = 'profile' | 'my-proposals' | 'open-proposal' | 'append-state';

interface RegisterInterestResponse {
  ok: true;
  forwarded: boolean;
}

export function registerInterest(email: string, sourcePanel: InterestSourcePanel) {
  return apiFetch<RegisterInterestResponse>('/interest', {
    method: 'POST',
    body: JSON.stringify({ email, sourcePanel }),
  });
}
