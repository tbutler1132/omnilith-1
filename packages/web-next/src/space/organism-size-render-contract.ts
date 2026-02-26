/**
 * Organism size render contract for space-map markers.
 *
 * Defines the rendering-layer policy for how canonical `spatial-map.entries[].size`
 * values become on-screen marker visuals at each altitude. This keeps size-truth
 * (API derivation) separate from readability affordances (UI rendering).
 */

export interface OrganismSizeRenderContract {
  readonly minPositiveSize: number;
  readonly worldMapBoostExponent: number;
  readonly worldMapBoostMin: number;
  readonly worldMapBoostMax: number;
  readonly interactionSizeMin: number;
  readonly detailCardSizeMin: number;
  readonly haloThreshold: number;
  readonly haloStrengthMin: number;
  readonly haloStrengthMax: number;
  readonly focusedCoreSizeMin: number;
}

export const ORGANISM_SIZE_RENDER_CONTRACT: OrganismSizeRenderContract = {
  // Canonical map sizes must remain positive when parsed from payload.
  minPositiveSize: 0.000001,
  // High/mid altitude readability boost (converges back to proportional by close altitude).
  worldMapBoostExponent: 0.82,
  worldMapBoostMin: 0.08,
  worldMapBoostMax: 3.2,
  // Click target floor to keep tiny entries interactive.
  interactionSizeMin: 0.28,
  // Card rendering threshold for mid/close marker shells.
  detailCardSizeMin: 0.35,
  // Tiny-entry halo guidance for discoverability.
  haloThreshold: 0.18,
  haloStrengthMin: 0.24,
  haloStrengthMax: 0.7,
  // Focused entries retain a minimal visible core.
  focusedCoreSizeMin: 0.24,
};
