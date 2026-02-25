/**
 * World map pointer fetcher for platform bootstrap.
 *
 * Keeps startup data requirements explicit so the platform shell can verify
 * API connectivity before broader rendering logic is introduced.
 */

import type { FetchWorldMapResponse } from '@omnilith/api-contracts';
import { apiFetch } from './api-client.js';

export function fetchWorldMap(): Promise<FetchWorldMapResponse> {
  return apiFetch<FetchWorldMapResponse>('/platform/world-map');
}
