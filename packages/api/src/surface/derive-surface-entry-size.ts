/**
 * Derived surface entry size for world-map physics.
 *
 * Computes deterministic `spatial-map.entries[].size` from organism data.
 * Communities derive size from their referenced map area. All other
 * organisms derive from compositional mass signals.
 */

import type {
  CompositionRepository,
  OrganismId,
  OrganismRepository,
  OrganismState,
  StateRepository,
} from '@omnilith/kernel';
import { parseSpatialMapPayload } from './spatial-map-payload.js';

const COMMUNITY_MIN_SIZE = 0.75;
const COMMUNITY_MAX_SIZE = 6.0;
const COMMUNITY_REFERENCE_MAP_AREA = 2000 * 2000;
const DEFAULT_MIN_SIZE = 0.75;
const DEFAULT_MAX_SIZE = 4.5;

export type SurfaceSizeStrategy = 'community-map-area' | 'compositional-mass';

export interface DerivedSurfaceEntrySize {
  readonly size: number;
  readonly strategy: SurfaceSizeStrategy;
  readonly inputs: Readonly<Record<string, number | string>>;
}

export interface DeriveSurfaceEntrySizeInput {
  readonly organismId: OrganismId;
}

export interface DeriveSurfaceEntrySizeDeps {
  readonly organismRepository: OrganismRepository;
  readonly stateRepository: StateRepository;
  readonly compositionRepository: CompositionRepository;
}

interface CommunityPayloadLike {
  readonly mapOrganismId?: string;
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

function payloadByteLength(payload: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
  } catch {
    return 0;
  }
}

function parseCommunityPayload(payload: unknown): CommunityPayloadLike | null {
  if (!payload || typeof payload !== 'object') return null;
  return payload as CommunityPayloadLike;
}

async function tryDeriveCommunityMapAreaSize(
  currentState: OrganismState,
  deps: Pick<DeriveSurfaceEntrySizeDeps, 'stateRepository'>,
): Promise<DerivedSurfaceEntrySize | null> {
  if (currentState.contentTypeId !== 'community') {
    return null;
  }

  const communityPayload = parseCommunityPayload(currentState.payload);
  const mapOrganismId = communityPayload?.mapOrganismId;
  if (typeof mapOrganismId !== 'string' || mapOrganismId.length === 0) {
    return null;
  }

  const mapState = await deps.stateRepository.findCurrentByOrganismId(mapOrganismId as OrganismId);
  if (!mapState || mapState.contentTypeId !== 'spatial-map') {
    return null;
  }

  const mapPayload = parseSpatialMapPayload(mapState.payload);
  if (!mapPayload) {
    return null;
  }

  const area = mapPayload.width * mapPayload.height;
  const normalized = Math.sqrt(area / COMMUNITY_REFERENCE_MAP_AREA);
  const size = clamp(COMMUNITY_MIN_SIZE, COMMUNITY_MAX_SIZE, normalized);

  return {
    size,
    strategy: 'community-map-area',
    inputs: {
      mapOrganismId,
      mapWidth: mapPayload.width,
      mapHeight: mapPayload.height,
      mapArea: area,
      referenceMapArea: COMMUNITY_REFERENCE_MAP_AREA,
    },
  };
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

  const communitySize = await tryDeriveCommunityMapAreaSize(currentState, deps);
  if (communitySize) {
    return communitySize;
  }

  const children = await deps.compositionRepository.findChildren(input.organismId);
  const stateCount = currentState.sequenceNumber;
  const childCount = children.length;
  const bytes = payloadByteLength(currentState.payload);

  const intrinsicMass = Math.max(1, bytes / 1200);
  const historyMass = 0.35 * Math.log2(1 + stateCount);
  const compositionMass = 0.5 * Math.log2(1 + childCount);
  const rawSize = 0.7 + 0.5 * Math.log2(1 + intrinsicMass) + historyMass + compositionMass;
  const size = clamp(DEFAULT_MIN_SIZE, DEFAULT_MAX_SIZE, rawSize);

  return {
    size,
    strategy: 'compositional-mass',
    inputs: {
      payloadBytes: bytes,
      intrinsicMass,
      stateCount,
      childCount,
      historyMass,
      compositionMass,
      rawSize,
    },
  };
}
