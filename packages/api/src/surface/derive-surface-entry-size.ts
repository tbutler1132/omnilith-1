/**
 * Derived surface entry size for unit-grid world-map semantics.
 *
 * During the simplification phase every surfaced organism occupies one
 * grid unit. Derivation still validates target organism existence so
 * surfacing failures stay explicit and deterministic.
 */

import type {
  CompositionRepository,
  OrganismId,
  OrganismRepository,
  StateRepository,
  SurfaceRepository,
} from '@omnilith/kernel';

export const UNIT_GRID_SURFACE_SIZE = 1;

export type SurfaceSizeStrategy = 'unit-grid';

export interface DerivedSurfaceEntrySize {
  readonly size: number;
  readonly strategy: SurfaceSizeStrategy;
  readonly inputs: Readonly<Record<string, number | string>>;
}

export interface DeriveSurfaceEntrySizeInput {
  readonly organismId: OrganismId;
  readonly mapOrganismId?: OrganismId;
  readonly curationScale?: number;
  readonly targetMapOverride?: {
    readonly mapWidth: number;
    readonly mapHeight: number;
    readonly minSeparation?: number;
    readonly entrySizes?: ReadonlyMap<OrganismId, number>;
  };
}

export interface DeriveSurfaceEntrySizeDeps {
  readonly organismRepository: OrganismRepository;
  readonly stateRepository: StateRepository;
  readonly compositionRepository: CompositionRepository;
  readonly surfaceRepository: SurfaceRepository;
}

export async function deriveSurfaceEntrySize(
  input: DeriveSurfaceEntrySizeInput,
  deps: DeriveSurfaceEntrySizeDeps,
): Promise<DerivedSurfaceEntrySize> {
  const organismExists = await deps.organismRepository.exists(input.organismId);
  if (!organismExists) {
    throw new Error(`Organism not found: ${input.organismId}`);
  }

  const currentState = await deps.stateRepository.findCurrentByOrganismId(input.organismId);
  if (!currentState) {
    throw new Error(`Organism has no current state: ${input.organismId}`);
  }

  return {
    size: UNIT_GRID_SURFACE_SIZE,
    strategy: 'unit-grid',
    inputs: {
      organismId: input.organismId,
      contentTypeId: currentState.contentTypeId,
      unitSize: UNIT_GRID_SURFACE_SIZE,
      ...(input.mapOrganismId ? { mapOrganismId: input.mapOrganismId } : {}),
    },
  };
}
