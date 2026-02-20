/**
 * Hero Journey seed helper — compose stage and song structure consistently.
 *
 * Creates a hero-journey-scene with:
 * - song children under the scene boundary
 * - stage children under the scene boundary
 * - a composition-reference child under each stage that points to candidate songs
 */

import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { composeOrganism, createOrganism } from '@omnilith/kernel';
import type { Container } from '../container.js';

type HeroJourneySongStatus = 'idea' | 'draft' | 'mixing' | 'mastered' | 'released';

export interface HeroJourneySongBlueprint {
  readonly key: string;
  readonly title: string;
  readonly artistCredit: string;
  readonly status: HeroJourneySongStatus;
  readonly notes?: string;
  readonly mix?: {
    readonly fileReference: string;
    readonly durationSeconds: number;
    readonly format?: 'wav' | 'mp3' | 'flac' | 'ogg';
    readonly sampleRate?: number;
  };
}

export interface HeroJourneyStageBlueprint {
  readonly stageId: string;
  readonly phase: string;
  readonly title: string;
  readonly summary: string;
  readonly accentColor?: string;
  readonly candidateSongKeys: ReadonlyArray<string>;
}

export interface HeroJourneyBlueprint {
  readonly name: string;
  readonly subtitle?: string;
  readonly songs: ReadonlyArray<HeroJourneySongBlueprint>;
  readonly stages: ReadonlyArray<HeroJourneyStageBlueprint>;
}

export interface HeroJourneySeedResult {
  readonly sceneOrganismId: OrganismId;
  readonly songIdsByKey: Readonly<Record<string, OrganismId>>;
  readonly stageIdsByStageId: Readonly<Record<string, OrganismId>>;
  readonly stageCandidateReferenceIdsByStageId: Readonly<Record<string, OrganismId>>;
}

function assertUnique(values: ReadonlyArray<string>, label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
}

export async function seedHeroJourney(
  container: Container,
  createdBy: UserId,
  blueprint: HeroJourneyBlueprint,
): Promise<HeroJourneySeedResult> {
  assertUnique(
    blueprint.songs.map((song) => song.key),
    'song key',
  );
  assertUnique(
    blueprint.stages.map((stage) => stage.stageId),
    'stageId',
  );

  const createDeps = {
    organismRepository: container.organismRepository,
    stateRepository: container.stateRepository,
    contentTypeRegistry: container.contentTypeRegistry,
    eventPublisher: container.eventPublisher,
    relationshipRepository: container.relationshipRepository,
    identityGenerator: container.identityGenerator,
  };

  const composeDeps = {
    organismRepository: container.organismRepository,
    compositionRepository: container.compositionRepository,
    visibilityRepository: container.visibilityRepository,
    relationshipRepository: container.relationshipRepository,
    eventPublisher: container.eventPublisher,
    identityGenerator: container.identityGenerator,
  };

  const scene = await createOrganism(
    {
      name: blueprint.name,
      contentTypeId: 'hero-journey-scene' as ContentTypeId,
      payload: {
        title: blueprint.name,
        subtitle: blueprint.subtitle,
      },
      createdBy,
    },
    createDeps,
  );

  const songIdsByKey: Record<string, OrganismId> = {};

  for (const [index, songBlueprint] of blueprint.songs.entries()) {
    const song = await createOrganism(
      {
        name: songBlueprint.title,
        contentTypeId: 'song' as ContentTypeId,
        payload: {
          title: songBlueprint.title,
          artistCredit: songBlueprint.artistCredit,
          status: songBlueprint.status,
          notes: songBlueprint.notes,
        },
        createdBy,
      },
      createDeps,
    );

    songIdsByKey[songBlueprint.key] = song.organism.id;

    await composeOrganism(
      {
        parentId: scene.organism.id,
        childId: song.organism.id,
        composedBy: createdBy,
        position: blueprint.stages.length + index,
      },
      composeDeps,
    );

    if (!songBlueprint.mix) continue;

    const mix = await createOrganism(
      {
        name: `${songBlueprint.title} Mix`,
        contentTypeId: 'audio' as ContentTypeId,
        payload: {
          fileReference: songBlueprint.mix.fileReference,
          durationSeconds: songBlueprint.mix.durationSeconds,
          format: songBlueprint.mix.format ?? 'wav',
          sampleRate: songBlueprint.mix.sampleRate ?? 48000,
          metadata: {
            title: `${songBlueprint.title} Mix`,
            artist: songBlueprint.artistCredit,
          },
        },
        createdBy,
      },
      createDeps,
    );

    await composeOrganism(
      {
        parentId: song.organism.id,
        childId: mix.organism.id,
        composedBy: createdBy,
        position: 0,
      },
      composeDeps,
    );
  }

  const stageIdsByStageId: Record<string, OrganismId> = {};
  const stageCandidateReferenceIdsByStageId: Record<string, OrganismId> = {};

  for (const [index, stageBlueprint] of blueprint.stages.entries()) {
    const stage = await createOrganism(
      {
        name: `${stageBlueprint.phase} — ${stageBlueprint.title}`,
        contentTypeId: 'hero-journey-stage' as ContentTypeId,
        payload: {
          stageId: stageBlueprint.stageId,
          phase: stageBlueprint.phase,
          title: stageBlueprint.title,
          summary: stageBlueprint.summary,
          accentColor: stageBlueprint.accentColor,
        },
        createdBy,
      },
      createDeps,
    );
    stageIdsByStageId[stageBlueprint.stageId] = stage.organism.id;

    await composeOrganism(
      {
        parentId: scene.organism.id,
        childId: stage.organism.id,
        composedBy: createdBy,
        position: index,
      },
      composeDeps,
    );

    const candidateEntries = stageBlueprint.candidateSongKeys.map((songKey, songIndex) => {
      const songId = songIdsByKey[songKey];
      if (!songId) {
        throw new Error(`Stage "${stageBlueprint.stageId}" references unknown song key "${songKey}"`);
      }
      return {
        organismId: songId,
        position: songIndex + 1,
      };
    });

    const candidates = await createOrganism(
      {
        name: `${stageBlueprint.phase} Candidates`,
        contentTypeId: 'composition-reference' as ContentTypeId,
        payload: {
          entries: candidateEntries,
          arrangementType: 'sequential',
        },
        createdBy,
        openTrunk: true,
      },
      createDeps,
    );
    stageCandidateReferenceIdsByStageId[stageBlueprint.stageId] = candidates.organism.id;

    await composeOrganism(
      {
        parentId: stage.organism.id,
        childId: candidates.organism.id,
        composedBy: createdBy,
        position: 0,
      },
      composeDeps,
    );
  }

  return {
    sceneOrganismId: scene.organism.id,
    songIdsByKey,
    stageIdsByStageId,
    stageCandidateReferenceIdsByStageId,
  };
}
