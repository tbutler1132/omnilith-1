/**
 * World map pointer fetcher for platform bootstrap.
 *
 * Keeps startup data requirements explicit so the platform shell can verify
 * API connectivity before broader rendering logic is introduced.
 */

import { apiFetch } from './api-client.js';

export interface FetchWorldMapResponse {
  readonly worldMapId: string | null;
}

export function fetchWorldMap(): Promise<FetchWorldMapResponse> {
  return apiFetch<FetchWorldMapResponse>('/platform/world-map');
}
