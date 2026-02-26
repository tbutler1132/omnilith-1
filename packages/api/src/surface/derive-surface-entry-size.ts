/**
 * Derived surface entry size for world-map physics.
 *
 * Computes deterministic `spatial-map.entries[].size` from organism data.
 * Communities derive size from their referenced map area. All other
 * organisms derive from compositional mass signals.
 */

import type {
  CompositionRepository,
  ContentTypeId,
  OrganismId,
  OrganismRepository,
  OrganismState,
  StateRepository,
  SurfaceRepository,
} from '@omnilith/kernel';
import { resolveTypedContentMass } from './content-mass.js';
import { parseSpatialMapPayload } from './spatial-map-payload.js';

const COMMUNITY_MIN_SIZE = 0.12;
const COMMUNITY_MAX_SIZE = 6.0;
const DEFAULT_WORLD_MAP_WIDTH = 5000;
const DEFAULT_WORLD_MAP_HEIGHT = 5000;
const DEFAULT_WORLD_MAP_AREA = DEFAULT_WORLD_MAP_WIDTH * DEFAULT_WORLD_MAP_HEIGHT;
const CAPITAL_TARGET_WORLD_AREA_SHARE = 1 / 30;
const DEFAULT_MIN_SIZE = 0.75;
const DEFAULT_MAX_SIZE = 4.5;
const CAPACITY_DENSITY_FACTOR = 0.65;
const REFERENCE_MIN_SEPARATION = 48;
const REFERENCE_CAPACITY_UNITS = Math.floor(
  (DEFAULT_WORLD_MAP_AREA / (REFERENCE_MIN_SEPARATION * REFERENCE_MIN_SEPARATION)) * CAPACITY_DENSITY_FACTOR,
);
const MIN_CURATION_SCALE = 0.85;
const MAX_CURATION_SCALE = 1.15;

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

function resolveCurationScale(curationScale: number | undefined): number {
  if (typeof curationScale !== 'number' || !Number.isFinite(curationScale)) {
    return 1;
  }

  return clamp(MIN_CURATION_SCALE, MAX_CURATION_SCALE, curationScale);
}

interface CommunityMapAreaSignals {
  readonly size: number;
  readonly mapOrganismId: string;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly mapArea: number;
  readonly worldArea: number;
  readonly worldAreaShare: number;
}

interface CompositionalSelfSignals {
  readonly contentTypeId: ContentTypeId;
  readonly typedContentMass: number;
  readonly payloadBytes: number;
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
  worldArea: number,
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
  const normalizedWorldArea = Math.max(1, worldArea);
  const worldAreaShare = area / normalizedWorldArea;
  const normalized = Math.sqrt(Math.max(0, worldAreaShare));
  const size = clamp(COMMUNITY_MIN_SIZE, COMMUNITY_MAX_SIZE, normalized);

  return {
    size,
    mapOrganismId,
    mapWidth: mapPayload.width,
    mapHeight: mapPayload.height,
    mapArea: area,
    worldArea: normalizedWorldArea,
    worldAreaShare,
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

function normalizeCapacityFactor(capacityUnits: number): number {
  return Math.min(1, REFERENCE_CAPACITY_UNITS / capacityUnits);
}

async function resolveMapSignals(
  mapOrganismId: OrganismId | undefined,
  deps: Pick<DeriveSurfaceEntrySizeDeps, 'stateRepository'>,
  targetMapOverride?: DeriveSurfaceEntrySizeInput['targetMapOverride'],
): Promise<TargetMapSignals> {
  if (targetMapOverride) {
    const mapWidth = Number.isFinite(targetMapOverride.mapWidth)
      ? Math.max(1, targetMapOverride.mapWidth)
      : DEFAULT_WORLD_MAP_WIDTH;
    const mapHeight = Number.isFinite(targetMapOverride.mapHeight)
      ? Math.max(1, targetMapOverride.mapHeight)
      : DEFAULT_WORLD_MAP_HEIGHT;
    const minSeparation = targetMapOverride.minSeparation ?? REFERENCE_MIN_SEPARATION;
    const capacityUnits = calculateCapacityUnits(mapWidth, mapHeight, minSeparation);
    const entrySizes = targetMapOverride.entrySizes
      ? new Map<OrganismId, number>(targetMapOverride.entrySizes)
      : new Map<OrganismId, number>();
    return {
      mapOrganismId,
      mapWidth,
      mapHeight,
      minSeparation,
      capacityUnits,
      normalizedCapacityFactor: normalizeCapacityFactor(capacityUnits),
      entrySizes,
    };
  }

  if (!mapOrganismId) {
    return {
      mapWidth: DEFAULT_WORLD_MAP_WIDTH,
      mapHeight: DEFAULT_WORLD_MAP_HEIGHT,
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
      mapWidth: DEFAULT_WORLD_MAP_WIDTH,
      mapHeight: DEFAULT_WORLD_MAP_HEIGHT,
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
      mapWidth: DEFAULT_WORLD_MAP_WIDTH,
      mapHeight: DEFAULT_WORLD_MAP_HEIGHT,
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
    normalizedCapacityFactor: normalizeCapacityFactor(capacityUnits),
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
  worldArea: number,
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
  const communitySignals = await tryDeriveCommunityMapAreaSize(currentState, worldArea, deps);
  if (communitySignals) {
    return {
      strategy: 'community-map-area',
      selfUnits: communitySignals.size * communitySignals.size,
      communitySignals,
    };
  }

  const typedContentMass = resolveTypedContentMass(currentState.contentTypeId as ContentTypeId, currentState.payload);
  const bytes = payloadByteLength(currentState.payload);
  const stateCount = currentState.sequenceNumber;
  const historyMass = 0.12 * Math.log2(1 + stateCount);
  const rawSelfSize = 0.22 + 0.46 * Math.log2(1 + typedContentMass) + historyMass;
  const selfUnits = Math.max(MIN_DERIVED_SIZE, rawSelfSize * rawSelfSize);

  return {
    strategy: 'compositional-mass',
    selfUnits,
    compositionalSignals: {
      contentTypeId: currentState.contentTypeId,
      typedContentMass,
      payloadBytes: bytes,
      stateCount,
      historyMass,
      rawSelfSize,
    },
  };
}

async function deriveRecursiveMassSignals(
  organismId: OrganismId,
  worldArea: number,
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

    const childSelf = await deriveSelfUnits(childState, worldArea, deps);
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
  const targetMap = await resolveMapSignals(input.mapOrganismId, deps, input.targetMapOverride);
  const worldArea = Math.max(1, targetMap.mapWidth * targetMap.mapHeight);
  const selfSignals = await deriveSelfUnits(currentState, worldArea, deps);
  const recursiveSignals = await deriveRecursiveMassSignals(input.organismId, worldArea, deps, surfacedOrganismIds);
  const effectiveUnits = selfSignals.selfUnits + recursiveSignals.unsurfacedDescendantUnits;
  const curationScale = resolveCurationScale(input.curationScale);

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
        const curatedTransferredSize = Math.max(MIN_DERIVED_SIZE, transferredSize * curationScale);

        return {
          size: curatedTransferredSize,
          strategy: 'boundary-proportional-transfer',
          inputs: {
            curationScale,
            payloadBytes: selfSignals.compositionalSignals.payloadBytes,
            typedContentMass: selfSignals.compositionalSignals.typedContentMass,
            contentTypeId: selfSignals.compositionalSignals.contentTypeId,
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
            curatedTransferredSize,
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
  const unclampedCuratedSize = rawSize * curationScale;
  const size = clamp(minSize, maxSize, unclampedCuratedSize);

  if (selfSignals.strategy === 'community-map-area') {
    return {
      size,
      strategy: 'community-map-area',
      inputs: {
        curationScale,
        mapOrganismId: selfSignals.communitySignals.mapOrganismId,
        mapWidth: selfSignals.communitySignals.mapWidth,
        mapHeight: selfSignals.communitySignals.mapHeight,
        mapArea: selfSignals.communitySignals.mapArea,
        worldArea: selfSignals.communitySignals.worldArea,
        worldAreaShare: selfSignals.communitySignals.worldAreaShare,
        capitalTargetWorldAreaShare: CAPITAL_TARGET_WORLD_AREA_SHARE,
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
      curationScale,
      contentTypeId: selfSignals.compositionalSignals.contentTypeId,
      typedContentMass: selfSignals.compositionalSignals.typedContentMass,
      payloadBytes: selfSignals.compositionalSignals.payloadBytes,
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
