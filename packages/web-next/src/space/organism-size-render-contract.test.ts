import { describe, expect, it } from 'vitest';
import { ORGANISM_SIZE_RENDER_CONTRACT } from './organism-size-render-contract.js';

describe('organism size render contract', () => {
  it('keeps all minimum thresholds positive', () => {
    expect(ORGANISM_SIZE_RENDER_CONTRACT.minPositiveSize).toBeGreaterThan(0);
    expect(ORGANISM_SIZE_RENDER_CONTRACT.interactionSizeMin).toBeGreaterThan(0);
    expect(ORGANISM_SIZE_RENDER_CONTRACT.detailCardSizeMin).toBeGreaterThan(0);
    expect(ORGANISM_SIZE_RENDER_CONTRACT.focusedCoreSizeMin).toBeGreaterThan(0);
  });

  it('keeps halo bounds ordered', () => {
    expect(ORGANISM_SIZE_RENDER_CONTRACT.haloStrengthMin).toBeLessThanOrEqual(
      ORGANISM_SIZE_RENDER_CONTRACT.haloStrengthMax,
    );
  });

  it('keeps boost bounds ordered', () => {
    expect(ORGANISM_SIZE_RENDER_CONTRACT.worldMapBoostMin).toBeLessThanOrEqual(
      ORGANISM_SIZE_RENDER_CONTRACT.worldMapBoostMax,
    );
  });
});
