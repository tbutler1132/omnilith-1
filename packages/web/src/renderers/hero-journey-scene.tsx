/**
 * Hero Journey Scene renderer — bespoke concept album presentation for V1.
 *
 * This renderer intentionally prioritizes atmosphere and narrative framing
 * for the demo seed while still exposing composed song organisms and
 * stage-driven candidate song references.
 */

import type { CSSProperties } from 'react';
import { useChildren, useChildrenByParentIds, useOrganismsByIds } from '../hooks/use-organism.js';
import type { RendererProps } from './registry.js';

interface HeroJourneyChapter {
  stageId?: string;
  phase: string;
  title: string;
  summary: string;
  accentColor?: string;
}

interface HeroJourneyScenePayload {
  title?: string;
  subtitle?: string;
  chapters?: HeroJourneyChapter[];
}

interface HeroJourneyStagePayload {
  stageId?: string;
  phase?: string;
  title?: string;
  summary?: string;
  accentColor?: string;
}

interface CompositionReferenceEntry {
  organismId?: string;
  position?: number;
}

interface CompositionReferencePayload {
  entries?: CompositionReferenceEntry[];
}

interface StageSection {
  id: string;
  phase: string;
  title: string;
  summary: string;
  accentColor?: string;
  candidates: Array<{ organismId: string; name: string }>;
}

function sortByPositionThenId(a: { id: string; position?: number }, b: { id: string; position?: number }): number {
  const posA = a.position ?? Number.MAX_SAFE_INTEGER;
  const posB = b.position ?? Number.MAX_SAFE_INTEGER;
  if (posA !== posB) return posA - posB;
  return a.id.localeCompare(b.id);
}

function readCompositionEntries(payload: unknown): Array<{ organismId: string; position: number }> {
  const p = payload as CompositionReferencePayload | undefined;
  if (!p || !Array.isArray(p.entries)) return [];

  const entries = p.entries
    .map((entry, index) => ({
      organismId: typeof entry?.organismId === 'string' ? entry.organismId : '',
      position: typeof entry?.position === 'number' ? entry.position : index + 1,
    }))
    .filter((entry) => entry.organismId.length > 0);

  return entries.sort((a, b) => a.position - b.position);
}

export function HeroJourneySceneRenderer({ state }: RendererProps) {
  const payload = state.payload as HeroJourneyScenePayload;
  const chapters = payload.chapters ?? [];
  const { data: sceneChildren } = useChildren(state.organismId);
  const sceneChildIds = sceneChildren?.map((child) => child.childId) ?? [];
  const { data: sceneChildById } = useOrganismsByIds(sceneChildIds);

  const songs = (sceneChildren ?? [])
    .map((record) => ({ id: record.childId, position: record.position, data: sceneChildById?.[record.childId] }))
    .filter((entry) => entry.data?.currentState?.contentTypeId === 'song')
    .sort(sortByPositionThenId);

  const stageRecords = (sceneChildren ?? [])
    .map((record) => ({ id: record.childId, position: record.position, data: sceneChildById?.[record.childId] }))
    .filter((entry) => entry.data?.currentState?.contentTypeId === 'hero-journey-stage')
    .sort(sortByPositionThenId);

  const stageIds = stageRecords.map((stage) => stage.id);
  const { data: stageChildrenByParentId } = useChildrenByParentIds(stageIds);
  const stageChildIds = Array.from(
    new Set(
      stageIds.flatMap((stageId) =>
        (stageChildrenByParentId?.[stageId] ?? []).map((childRecord) => childRecord.childId),
      ),
    ),
  );
  const { data: stageChildById } = useOrganismsByIds(stageChildIds);

  const candidateReferenceIds = stageChildIds.filter(
    (childId) => stageChildById?.[childId]?.currentState?.contentTypeId === 'composition-reference',
  );
  const { data: candidateReferenceById } = useOrganismsByIds(candidateReferenceIds);

  const referencedSongIds = Array.from(
    new Set(
      candidateReferenceIds.flatMap((referenceId) => {
        const entries = readCompositionEntries(candidateReferenceById?.[referenceId]?.currentState?.payload);
        return entries.map((entry) => entry.organismId);
      }),
    ),
  );
  const { data: referencedSongById } = useOrganismsByIds(referencedSongIds);

  const stageSections: StageSection[] =
    stageRecords.length > 0
      ? stageRecords.map((stageRecord) => {
          const stagePayload = (stageRecord.data?.currentState?.payload ?? {}) as HeroJourneyStagePayload;
          const stageChildren = [...(stageChildrenByParentId?.[stageRecord.id] ?? [])].sort((a, b) => {
            const posA = a.position ?? Number.MAX_SAFE_INTEGER;
            const posB = b.position ?? Number.MAX_SAFE_INTEGER;
            if (posA !== posB) return posA - posB;
            return a.childId.localeCompare(b.childId);
          });
          const candidateReferenceId = stageChildren
            .map((child) => child.childId)
            .find((childId) => stageChildById?.[childId]?.currentState?.contentTypeId === 'composition-reference');
          const candidateEntries = candidateReferenceId
            ? readCompositionEntries(candidateReferenceById?.[candidateReferenceId]?.currentState?.payload)
            : [];
          const candidates = candidateEntries.map((entry) => {
            const resolved = referencedSongById?.[entry.organismId] ?? sceneChildById?.[entry.organismId];
            return {
              organismId: entry.organismId,
              name: resolved?.organism.name ?? entry.organismId,
            };
          });

          return {
            id: stageRecord.id,
            phase: stagePayload.phase ?? 'Stage',
            title: stagePayload.title ?? stagePayload.stageId ?? stageRecord.data?.organism.name ?? stageRecord.id,
            summary: stagePayload.summary ?? 'No stage summary yet.',
            accentColor: stagePayload.accentColor,
            candidates,
          };
        })
      : chapters.map((chapter, index) => ({
          id: chapter.stageId ?? `${chapter.phase}-${index}`,
          phase: chapter.phase,
          title: chapter.title,
          summary: chapter.summary,
          accentColor: chapter.accentColor,
          candidates: [],
        }));

  return (
    <div className="hero-journey-scene">
      <header className="hero-journey-scene-header">
        <p className="hero-journey-scene-eyebrow">Concept Album</p>
        <h1>{payload.title ?? "Hero's Journey"}</h1>
        <p>{payload.subtitle ?? 'A narrative arc composed across songs.'}</p>
      </header>

      <section className="hero-journey-scene-chapters">
        {stageSections.length === 0 ? (
          <p className="hero-journey-scene-empty">No stages composed yet.</p>
        ) : (
          stageSections.map((stage) => (
            <article
              key={stage.id}
              className="hero-journey-scene-chapter"
              style={{ '--hero-scene-accent': stage.accentColor ?? '#4f98b4' } as CSSProperties}
            >
              <p className="hero-journey-scene-phase">{stage.phase}</p>
              <h2>{stage.title}</h2>
              <p>{stage.summary}</p>
              <p className="hero-journey-scene-candidates-label">Candidate songs</p>
              {stage.candidates.length === 0 ? (
                <p className="hero-journey-scene-candidates-empty">No candidates referenced yet.</p>
              ) : (
                <ul className="hero-journey-scene-candidates-list">
                  {stage.candidates.map((candidate) => (
                    <li key={`${stage.id}-${candidate.organismId}`}>{candidate.name}</li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </section>

      <section className="hero-journey-scene-songs">
        <p className="hero-journey-scene-songs-label">Composed songs</p>
        {songs.length === 0 ? (
          <p className="hero-journey-scene-empty">No songs composed yet.</p>
        ) : (
          <ul>
            {songs.map((entry) => (
              <li key={entry.id}>
                <span>{entry.data?.organism.name ?? entry.id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
