/**
 * Map Studio write helpers.
 *
 * Encapsulates surfacing mutations so map-studio actions stay deterministic
 * and independent from rendering concerns.
 */

import { apiFetch } from '../../../api/api-client.js';

export interface SurfaceMapStudioCandidateInput {
  readonly mapOrganismId: string;
  readonly organismId: string;
  readonly x: number;
  readonly y: number;
}

export interface SurfaceMapStudioCandidateResponse {
  readonly status: 'surfaced' | 'already-surfaced' | 'repositioned';
  readonly entry: {
    readonly organismId: string;
    readonly x: number;
    readonly y: number;
    readonly size?: number;
    readonly emphasis?: number;
  };
}

export function surfaceMapStudioCandidate(
  input: SurfaceMapStudioCandidateInput,
): Promise<SurfaceMapStudioCandidateResponse> {
  return apiFetch<SurfaceMapStudioCandidateResponse>(`/organisms/${input.mapOrganismId}/surface`, {
    method: 'POST',
    body: JSON.stringify({
      organismId: input.organismId,
      x: input.x,
      y: input.y,
    }),
  });
}
