/**
 * World-map-only seed profile.
 *
 * Leaves local development data intentionally minimal: only the world map
 * seeded by bootstrap, with no additional organisms composed.
 */

import type { Container } from './container.js';

export async function seedWorldMapOnly(_container: Container): Promise<void> {
  console.log('Using OMNILITH_SEED_PROFILE=world-map-only (no additional organisms).');
}
