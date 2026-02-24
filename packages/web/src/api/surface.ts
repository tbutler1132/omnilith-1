/**
 * surfaceOnWorldMap — places a newly thresholded organism onto the world map.
 *
 * Delegates surfacing to the API's canonical map physics endpoint so
 * derived size is computed server-side and persisted consistently.
 */

import { surfaceOrganismOnMap } from './organisms.js';

export async function surfaceOnWorldMap(worldMapId: string, organismId: string, x: number, y: number): Promise<void> {
  await surfaceOrganismOnMap(worldMapId, { organismId, x, y });
}
