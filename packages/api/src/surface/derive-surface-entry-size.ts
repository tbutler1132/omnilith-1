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
  SurfaceRepository,
} from '@omnilith/kernel';
import { parseSpatialMapPayload } from './spatial-map-payload.js';

const COMMUNITY_MIN_SIZE = 0.75;
const COMMUNITY_MAX_SIZE = 6.0;
const COMMUNITY_REFERENCE_MAP_AREA = 2000 * 2000;
const DEFAULT_MIN_SIZE = 0.75;
const DEFAULT_MAX_SIZE = 4.5;
const CAPACITY_DENSITY_FACTOR = 0.65;
const REFERENCE_MIN_SEPARATION = 48;
const REFERENCE_CAPACITY_UNITS = Math.floor(
  (COMMUNITY_REFERENCE_MAP_AREA / (REFERENCE_MIN_SEPARATION * REFERENCE_MIN_SEPARATION)) * CAPACITY_DENSITY_FACTOR,
);

const MIN_DERIVED_SIZE = 0.000001;

export type SurfaceSizeStrategy = 'community-map-area' | 'compositional-mass' | 'boundary-proportional-transfer';

export interface DerivedSurfaceEntrySize {
  readonly size: number;
  readonly strategy: SurfaceSizeStrategy;
  readonly inputs: Readonly<Record<string, number | string>>;
}

export interface DeriveSurfaceEntrySizeInput {
  readonly organismId: OrganismId;
  readonly mapOrganismId?: OrganismId;
}

export interface DeriveSurfaceEntrySizeDeps {
  readonly organismRepository: OrganismRepository;
  readonly stateRepository: StateRepository;
  readonly compositionRepository: CompositionRepository;
  readonly surfaceRepository: SurfaceRepository;
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

interface CommunityMapAreaSignals {
  readonly size: number;
  readonly mapOrganismId: string;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly mapArea: number;
}

interface CompositionalSelfSignals {
  readonly payloadBytes: number;
  readonly intrinsicMass: number;
  readonly stateCount: number;
  readonly historyMass: number;
  readonly rawSelfSize: number;
}

interface RecursiveMassSignals {
  readonly unsurfacedDescendantUnits: number;
  readonly unsurfacedDescendantCount: number;
  readonly surfacedDirectChildCount: number;
  readonly unsurfacedDirectChildCount: number;
}

interface EffectiveUnitsResult {
  readonly effectiveUnits: number;
  readonly unsurfacedDescendantCount: number;
}

interface TargetMapSignals {
  readonly mapOrganismId?: OrganismId;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly minSeparation: number;
  readonly capacityUnits: number;
  readonly normalizedCapacityFactor: number;
  readonly entrySizes: ReadonlyMap<OrganismId, number>;
}

interface SourceBoundaryCommunity {
  readonly communityOrganismId: OrganismId;
  readonly communityMapOrganismId: OrganismId;
}

async function tryDeriveCommunityMapAreaSize(
  currentState: OrganismState,
  deps: Pick<DeriveSurfaceEntrySizeDeps, 'stateRepository'>,
): Promise<CommunityMapAreaSignals | null> {
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
    mapOrganismId,
    mapWidth: mapPayload.width,
    mapHeight: mapPayload.height,
    mapArea: area,
  };
}

function calculateCapacityUnits(width: number, height: number, minSeparation: number): number {
  const normalizedMinSeparation = Number.isFinite(minSeparation)
    ? Math.max(1, minSeparation)
    : REFERENCE_MIN_SEPARATION;
  const capacity = Math.floor(
    ((width * height) / (normalizedMinSeparation * normalizedMinSeparation)) * CAPACITY_DENSITY_FACTOR,
  );
  return Math.max(1, capacity);
}

async function resolveMapSignals(
  mapOrganismId: OrganismId | undefined,
  deps: Pick<DeriveSurfaceEntrySizeDeps, 'stateRepository'>,
): Promise<TargetMapSignals> {
  if (!mapOrganismId) {
    return {
      mapWidth: 2000,
      mapHeight: 2000,
      minSeparation: REFERENCE_MIN_SEPARATION,
      capacityUnits: REFERENCE_CAPACITY_UNITS,
      normalizedCapacityFactor: 1,
      entrySizes: new Map<OrganismId, number>(),
    };
  }

  const mapState = await deps.stateRepository.findCurrentByOrganismId(mapOrganismId);
  if (!mapState || mapState.contentTypeId !== 'spatial-map') {
    return {
      mapOrganismId,
      mapWidth: 2000,
      mapHeight: 2000,
      minSeparation: REFERENCE_MIN_SEPARATION,
      capacityUnits: REFERENCE_CAPACITY_UNITS,
      normalizedCapacityFactor: 1,
      entrySizes: new Map<OrganismId, number>(),
    };
  }

  const mapPayload = parseSpatialMapPayload(mapState.payload);
  if (!mapPayload) {
    return {
      mapOrganismId,
      mapWidth: 2000,
      mapHeight: 2000,
      minSeparation: REFERENCE_MIN_SEPARATION,
      capacityUnits: REFERENCE_CAPACITY_UNITS,
      normalizedCapacityFactor: 1,
      entrySizes: new Map<OrganismId, number>(),
    };
  }

  const minSeparation = mapPayload.minSeparation ?? REFERENCE_MIN_SEPARATION;
  const capacityUnits = calculateCapacityUnits(mapPayload.width, mapPayload.height, minSeparation);
  const entrySizes = new Map<OrganismId, number>();
  for (const entry of mapPayload.entries) {
    entrySizes.set(entry.organismId, entry.size ?? 1);
  }
  return {
    mapOrganismId,
    mapWidth: mapPayload.width,
    mapHeight: mapPayload.height,
    minSeparation,
    capacityUnits,
    normalizedCapacityFactor: REFERENCE_CAPACITY_UNITS / capacityUnits,
    entrySizes,
  };
}

async function resolveSourceBoundaryCommunity(
  organismId: OrganismId,
  deps: Pick<DeriveSurfaceEntrySizeDeps, 'stateRepository' | 'compositionRepository'>,
): Promise<SourceBoundaryCommunity | null> {
  const visited = new Set<OrganismId>();
  let cursor = organismId;

  while (true) {
    if (visited.has(cursor)) return null;
    visited.add(cursor);

    const parent = await deps.compositionRepository.findParent(cursor);
    if (!parent) return null;
    const communityCandidateId = parent.parentId;

    const candidateState = await deps.stateRepository.findCurrentByOrganismId(communityCandidateId);
    if (candidateState?.contentTypeId === 'community') {
      const payload = parseCommunityPayload(candidateState.payload);
      const mapOrganismId = payload?.mapOrganismId;
      if (typeof mapOrganismId === 'string' && mapOrganismId.length > 0) {
        return {
          communityOrganismId: communityCandidateId,
          communityMapOrganismId: mapOrganismId as OrganismId,
        };
      }
    }

    cursor = communityCandidateId;
  }
}

async function deriveSelfUnits(
  currentState: OrganismState,
  deps: Pick<DeriveSurfaceEntrySizeDeps, 'stateRepository'>,
): Promise<
  | {
      readonly strategy: 'community-map-area';
      readonly selfUnits: number;
      readonly communitySignals: CommunityMapAreaSignals;
    }
  | {
      readonly strategy: 'compositional-mass';
      readonly selfUnits: number;
      readonly compositionalSignals: CompositionalSelfSignals;
    }
> {
  const communitySignals = await tryDeriveCommunityMapAreaSize(currentState, deps);
  if (communitySignals) {
    return {
      strategy: 'community-map-area',
      selfUnits: communitySignals.size * communitySignals.size,
      communitySignals,
    };
  }

  const bytes = payloadByteLength(currentState.payload);
  const stateCount = currentState.sequenceNumber;
  const intrinsicMass = Math.max(1, bytes / 1200);
  const historyMass = 0.35 * Math.log2(1 + stateCount);
  const rawSelfSize = 0.7 + 0.5 * Math.log2(1 + intrinsicMass) + historyMass;
  const selfUnits = Math.max(DEFAULT_MIN_SIZE * DEFAULT_MIN_SIZE, rawSelfSize * rawSelfSize);

  return {
    strategy: 'compositional-mass',
    selfUnits,
    compositionalSignals: {
      payloadBytes: bytes,
      intrinsicMass,
      stateCount,
      historyMass,
      rawSelfSize,
    },
  };
}

async function deriveRecursiveMassSignals(
  organismId: OrganismId,
  deps: Pick<DeriveSurfaceEntrySizeDeps, 'stateRepository' | 'compositionRepository'>,
  surfacedOrganismIds: ReadonlySet<OrganismId>,
): Promise<RecursiveMassSignals> {
  const children = await deps.compositionRepository.findChildren(organismId);
  let unsurfacedDescendantUnits = 0;
  let unsurfacedDescendantCount = 0;
  let surfacedDirectChildCount = 0;
  let unsurfacedDirectChildCount = 0;
  const activePath = new Set<OrganismId>([organismId]);

  const deriveChildSubtreeUnits = async (childId: OrganismId): Promise<EffectiveUnitsResult> => {
    if (activePath.has(childId)) {
      return { effectiveUnits: 0, unsurfacedDescendantCount: 0 };
    }

    const childState = await deps.stateRepository.findCurrentByOrganismId(childId);
    if (!childState) {
      return { effectiveUnits: 0, unsurfacedDescendantCount: 0 };
    }

    const childSelf = await deriveSelfUnits(childState, deps);
    const childChildren = await deps.compositionRepository.findChildren(childId);
    let childDescendantUnits = 0;
    let childDescendantCount = 0;

    activePath.add(childId);
    try {
      for (const childComposition of childChildren) {
        if (surfacedOrganismIds.has(childComposition.childId)) {
          continue;
        }
        const nested = await deriveChildSubtreeUnits(childComposition.childId);
        childDescendantUnits += nested.effectiveUnits;
        childDescendantCount += 1 + nested.unsurfacedDescendantCount;
      }
    } finally {
      activePath.delete(childId);
    }

    return {
      effectiveUnits: childSelf.selfUnits + childDescendantUnits,
      unsurfacedDescendantCount: childDescendantCount,
    };
  };

  for (const child of children) {
    if (surfacedOrganismIds.has(child.childId)) {
      surfacedDirectChildCount += 1;
      continue;
    }

    unsurfacedDirectChildCount += 1;
    const subtree = await deriveChildSubtreeUnits(child.childId);
    unsurfacedDescendantUnits += subtree.effectiveUnits;
    unsurfacedDescendantCount += 1 + subtree.unsurfacedDescendantCount;
  }

  return {
    unsurfacedDescendantUnits,
    unsurfacedDescendantCount,
    surfacedDirectChildCount,
    unsurfacedDirectChildCount,
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

  const surfacedOrganismIds = await deps.surfaceRepository.listSurfacedOrganismIds();
  const targetMap = await resolveMapSignals(input.mapOrganismId, deps);
  const selfSignals = await deriveSelfUnits(currentState, deps);
  const recursiveSignals = await deriveRecursiveMassSignals(input.organismId, deps, surfacedOrganismIds);
  const effectiveUnits = selfSignals.selfUnits + recursiveSignals.unsurfacedDescendantUnits;

  if (selfSignals.strategy === 'compositional-mass' && input.mapOrganismId) {
    const sourceBoundary = await resolveSourceBoundaryCommunity(input.organismId, deps);
    if (sourceBoundary && sourceBoundary.communityMapOrganismId !== input.mapOrganismId) {
      const sourceMap = await resolveMapSignals(sourceBoundary.communityMapOrganismId, deps);
      const boundaryShare = effectiveUnits / sourceMap.capacityUnits;

      const communityIconSize = targetMap.entrySizes.get(sourceBoundary.communityOrganismId);
      if (communityIconSize !== undefined && communityIconSize > 0) {
        const boundaryAreaOnTarget = communityIconSize * communityIconSize;
        const transferredArea = Math.max(0, boundaryShare * boundaryAreaOnTarget);
        const transferredSize = Math.sqrt(transferredArea);

        return {
          size: Math.max(MIN_DERIVED_SIZE, transferredSize),
          strategy: 'boundary-proportional-transfer',
          inputs: {
            payloadBytes: selfSignals.compositionalSignals.payloadBytes,
            intrinsicMass: selfSignals.compositionalSignals.intrinsicMass,
            stateCount: selfSignals.compositionalSignals.stateCount,
            historyMass: selfSignals.compositionalSignals.historyMass,
            rawSelfSize: selfSignals.compositionalSignals.rawSelfSize,
            baseUnits: selfSignals.selfUnits,
            unsurfacedDescendantUnits: recursiveSignals.unsurfacedDescendantUnits,
            unsurfacedDescendantCount: recursiveSignals.unsurfacedDescendantCount,
            surfacedDirectChildCount: recursiveSignals.surfacedDirectChildCount,
            unsurfacedDirectChildCount: recursiveSignals.unsurfacedDirectChildCount,
            effectiveUnits,
            sourceBoundaryCommunityId: sourceBoundary.communityOrganismId,
            sourceBoundaryMapId: sourceBoundary.communityMapOrganismId,
            sourceBoundaryCapacityUnits: sourceMap.capacityUnits,
            sourceBoundaryShare: boundaryShare,
            targetMapId: input.mapOrganismId,
            targetCommunityIconSize: communityIconSize,
            transferredArea,
            transferredSize,
          },
        };
      }
    }
  }

  const normalizedUnits = effectiveUnits * targetMap.normalizedCapacityFactor;
  const rawSize = Math.sqrt(normalizedUnits);

  const minSize =
    selfSignals.strategy === 'community-map-area'
      ? COMMUNITY_MIN_SIZE
      : input.mapOrganismId
        ? MIN_DERIVED_SIZE
        : DEFAULT_MIN_SIZE;
  const maxSize =
    selfSignals.strategy === 'community-map-area'
      ? COMMUNITY_MAX_SIZE
      : input.mapOrganismId
        ? Number.POSITIVE_INFINITY
        : DEFAULT_MAX_SIZE;
  const size = clamp(minSize, maxSize, rawSize);

  if (selfSignals.strategy === 'community-map-area') {
    return {
      size,
      strategy: 'community-map-area',
      inputs: {
        mapOrganismId: selfSignals.communitySignals.mapOrganismId,
        mapWidth: selfSignals.communitySignals.mapWidth,
        mapHeight: selfSignals.communitySignals.mapHeight,
        mapArea: selfSignals.communitySignals.mapArea,
        referenceMapArea: COMMUNITY_REFERENCE_MAP_AREA,
        baseUnits: selfSignals.selfUnits,
        unsurfacedDescendantUnits: recursiveSignals.unsurfacedDescendantUnits,
        unsurfacedDescendantCount: recursiveSignals.unsurfacedDescendantCount,
        surfacedDirectChildCount: recursiveSignals.surfacedDirectChildCount,
        unsurfacedDirectChildCount: recursiveSignals.unsurfacedDirectChildCount,
        effectiveUnits,
        targetMapCapacityUnits: targetMap.capacityUnits,
        targetMapWidth: targetMap.mapWidth,
        targetMapHeight: targetMap.mapHeight,
        targetMapMinSeparation: targetMap.minSeparation,
        normalizedCapacityFactor: targetMap.normalizedCapacityFactor,
        normalizedUnits,
        rawSize,
      },
    };
  }

  return {
    size,
    strategy: 'compositional-mass',
    inputs: {
      payloadBytes: selfSignals.compositionalSignals.payloadBytes,
      intrinsicMass: selfSignals.compositionalSignals.intrinsicMass,
      stateCount: selfSignals.compositionalSignals.stateCount,
      historyMass: selfSignals.compositionalSignals.historyMass,
      rawSelfSize: selfSignals.compositionalSignals.rawSelfSize,
      baseUnits: selfSignals.selfUnits,
      unsurfacedDescendantUnits: recursiveSignals.unsurfacedDescendantUnits,
      unsurfacedDescendantCount: recursiveSignals.unsurfacedDescendantCount,
      surfacedDirectChildCount: recursiveSignals.surfacedDirectChildCount,
      unsurfacedDirectChildCount: recursiveSignals.unsurfacedDirectChildCount,
      effectiveUnits,
      targetMapCapacityUnits: targetMap.capacityUnits,
      targetMapWidth: targetMap.mapWidth,
      targetMapHeight: targetMap.mapHeight,
      targetMapMinSeparation: targetMap.minSeparation,
      normalizedCapacityFactor: targetMap.normalizedCapacityFactor,
      normalizedUnits,
      rawSize,
    },
  };
}
