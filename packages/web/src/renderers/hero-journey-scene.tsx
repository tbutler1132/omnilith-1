/**
 * Hero Journey Scene renderer — cinematic narrative scroll experience.
 *
 * This renderer presents a stage-driven concept arc with synchronized motion.
 * Scroll progression advances stage focus, while a pinned cinematic core
 * responds to the active stage's signal.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useChildren, useChildrenByParentIds, useOrganismsByIds } from '../hooks/use-organism.js';
import type { RendererProps } from './registry.js';

gsap.registerPlugin(ScrollTrigger);

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
  candidates: Array<{ organismId: string; name: string; isComposed: boolean }>;
}

type StageMotif = 'spark' | 'crossing' | 'abyss' | 'ascent' | 'return';

interface StageCue {
  motif: StageMotif;
  label: string;
  signal: string;
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

function resolveStageCue(stage: StageSection | undefined, index: number): StageCue {
  if (!stage) {
    return {
      motif: 'spark',
      label: 'No active stage',
      signal: 'Awaiting stage composition',
    };
  }

  const phrase = `${stage.phase} ${stage.title}`.toLowerCase();
  if (phrase.includes('call') || phrase.includes('awak') || phrase.includes('departure')) {
    return { motif: 'spark', label: 'Ignition vector', signal: 'The story enters motion' };
  }
  if (phrase.includes('cross') || phrase.includes('trial') || phrase.includes('mentor')) {
    return { motif: 'crossing', label: 'Threshold vector', signal: 'Momentum meets resistance' };
  }
  if (phrase.includes('ordeal') || phrase.includes('abyss') || phrase.includes('death') || phrase.includes('dark')) {
    return { motif: 'abyss', label: 'Abyss vector', signal: 'Maximum narrative pressure' };
  }
  if (
    phrase.includes('reward') ||
    phrase.includes('road') ||
    phrase.includes('resurrect') ||
    phrase.includes('return')
  ) {
    return { motif: 'ascent', label: 'Ascent vector', signal: 'Meaning crystallizes through motion' };
  }

  if (index >= 0 && index === 0) {
    return { motif: 'spark', label: 'Ignition vector', signal: 'The story enters motion' };
  }

  return { motif: 'return', label: 'Crown vector', signal: 'Integration and re-entry' };
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
              isComposed: sceneChildById?.[entry.organismId]?.currentState?.contentTypeId === 'song',
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

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const experienceRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLOListElement | null>(null);
  const stagePanelByIdRef = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (stageSections.length === 0) {
      setSelectedStageId(null);
      return;
    }
    setSelectedStageId((current) =>
      stageSections.some((stage) => stage.id === current) ? current : stageSections[0].id,
    );
  }, [stageSections]);

  useEffect(() => {
    const scene = sceneRef.current;
    const experience = experienceRef.current;
    const track = trackRef.current;
    if (!scene || !experience || !track || stageSections.length === 0) return;

    const stagePanels = stageSections
      .map((stage) => stagePanelByIdRef.current.get(stage.id))
      .filter((panel): panel is HTMLLIElement => Boolean(panel));
    if (stagePanels.length === 0) return;

    const context = gsap.context(() => {
      scene.style.setProperty('--hero-scene-progress', '0');
      gsap.set(stagePanels, { autoAlpha: 0.26, y: 72, scale: 0.98 });

      stagePanels.forEach((panel, index) => {
        gsap.to(panel, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: panel,
            start: 'top 82%',
            end: 'top 46%',
            scrub: true,
          },
        });

        ScrollTrigger.create({
          trigger: panel,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => setSelectedStageId(stageSections[index]?.id ?? null),
          onEnterBack: () => setSelectedStageId(stageSections[index]?.id ?? null),
        });
      });

      const progressState = { value: 0 };
      gsap
        .timeline({
          scrollTrigger: {
            trigger: track,
            start: 'top 80%',
            end: 'bottom 28%',
            scrub: 0.6,
          },
        })
        .to(progressState, {
          value: 1,
          duration: 1,
          ease: 'none',
          onUpdate: () => {
            scene.style.setProperty('--hero-scene-progress', progressState.value.toFixed(4));
          },
        });

      const orb = scene.querySelector<HTMLElement>('.hero-journey-scene-cinema-orb');
      if (orb) {
        gsap.to(orb, {
          rotate: 360,
          ease: 'none',
          scrollTrigger: {
            trigger: track,
            start: 'top 85%',
            end: 'bottom 18%',
            scrub: 0.8,
          },
        });
      }

      gsap.utils.toArray<HTMLElement>('.hero-journey-scene-cinema-ring').forEach((ring, index) => {
        gsap.to(ring, {
          rotate: (index % 2 === 0 ? 1 : -1) * (220 + index * 90),
          scale: 1 + index * 0.04,
          ease: 'none',
          scrollTrigger: {
            trigger: track,
            start: 'top 85%',
            end: 'bottom 20%',
            scrub: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>('.hero-journey-scene-cinema-ray').forEach((ray, index) => {
        gsap.to(ray, {
          opacity: 0.24 + ((index + 1) % 3) * 0.2,
          scaleX: 1.15 + index * 0.04,
          transformOrigin: 'center',
          ease: 'sine.inOut',
          duration: 2.7 + index * 0.4,
          repeat: -1,
          yoyo: true,
        });
      });

      const noise = scene.querySelector<HTMLElement>('.hero-journey-scene-cinema-noise');
      if (noise) {
        gsap.to(noise, {
          backgroundPositionX: '280px',
          ease: 'none',
          duration: 7,
          repeat: -1,
        });
      }
    }, scene);

    return () => {
      context.revert();
    };
  }, [stageSections]);

  const activeStageId = stageSections.some((stage) => stage.id === selectedStageId)
    ? selectedStageId
    : stageSections[0]?.id;
  const activeStage = stageSections.find((stage) => stage.id === activeStageId);
  const activeStageIndex = activeStage ? stageSections.findIndex((stage) => stage.id === activeStage.id) : -1;
  const activeCue = resolveStageCue(activeStage, activeStageIndex);

  const stagesBySongId = useMemo(() => {
    const map = new Map<string, StageSection[]>();
    for (const stage of stageSections) {
      for (const candidate of stage.candidates) {
        const rows = map.get(candidate.organismId) ?? [];
        if (!rows.some((row) => row.id === stage.id)) {
          rows.push(stage);
        }
        map.set(candidate.organismId, rows);
      }
    }
    return map;
  }, [stageSections]);

  const connectedSongCount = songs.filter((song) => stagesBySongId.has(song.id)).length;
  const candidateCount = stageSections.reduce((total, stage) => total + stage.candidates.length, 0);
  const coveragePercent = songs.length > 0 ? Math.round((connectedSongCount / songs.length) * 100) : 0;

  function bindStagePanelRef(stageId: string) {
    return (element: HTMLLIElement | null) => {
      if (element) {
        stagePanelByIdRef.current.set(stageId, element);
      } else {
        stagePanelByIdRef.current.delete(stageId);
      }
    };
  }

  function focusStage(stageId: string) {
    setSelectedStageId(stageId);
    stagePanelByIdRef.current.get(stageId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div
      ref={sceneRef}
      className="hero-journey-scene"
      style={
        {
          '--hero-scene-accent': activeStage?.accentColor ?? '#79d0ff',
        } as CSSProperties
      }
    >
      <header className="hero-journey-scene-cinema-header">
        <p className="hero-journey-scene-cinema-eyebrow">Hero Journey Scene</p>
        <h1>{payload.title ?? "Hero's Journey"}</h1>
        <p className="hero-journey-scene-cinema-subtitle">
          {payload.subtitle ?? 'A stage-driven narrative organism with scroll-synced cinematic motion.'}
        </p>
        <div className="hero-journey-scene-cinema-stats">
          <article className="hero-journey-scene-cinema-stat">
            <p>Stages</p>
            <strong>{stageSections.length}</strong>
          </article>
          <article className="hero-journey-scene-cinema-stat">
            <p>Candidates</p>
            <strong>{candidateCount}</strong>
          </article>
          <article className="hero-journey-scene-cinema-stat">
            <p>Composed songs</p>
            <strong>{songs.length}</strong>
          </article>
          <article className="hero-journey-scene-cinema-stat">
            <p>Coverage</p>
            <strong>{coveragePercent}%</strong>
          </article>
        </div>
      </header>

      <section className="hero-journey-scene-cinema-layout">
        <aside className="hero-journey-scene-cinema-rail">
          <p className="hero-journey-scene-cinema-label">Journey timeline</p>
          {stageSections.length === 0 ? (
            <p className="hero-journey-scene-empty">No stages composed yet.</p>
          ) : (
            <ol className="hero-journey-scene-cinema-rail-list">
              {stageSections.map((stage, index) => {
                const isActive = stage.id === activeStage?.id;
                const cue = resolveStageCue(stage, index);
                return (
                  <li key={`rail-${stage.id}`}>
                    <button
                      type="button"
                      className={`hero-journey-scene-cinema-rail-button${isActive ? ' is-active' : ''}`}
                      style={{ '--hero-scene-accent': stage.accentColor ?? '#79d0ff' } as CSSProperties}
                      onClick={() => focusStage(stage.id)}
                      aria-pressed={isActive}
                    >
                      <span className="hero-journey-scene-cinema-rail-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="hero-journey-scene-cinema-rail-copy">
                        <strong>{stage.title}</strong>
                        <small>{cue.label}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>

        <section ref={experienceRef} className="hero-journey-scene-cinema-experience">
          <div className="hero-journey-scene-cinema-sticky">
            <div
              className={`hero-journey-scene-cinema-orb hero-journey-scene-cinema-orb--${activeCue.motif}`}
              aria-hidden="true"
            >
              <span className="hero-journey-scene-cinema-ring hero-journey-scene-cinema-ring--one" />
              <span className="hero-journey-scene-cinema-ring hero-journey-scene-cinema-ring--two" />
              <span className="hero-journey-scene-cinema-ring hero-journey-scene-cinema-ring--three" />
              <span className="hero-journey-scene-cinema-ray hero-journey-scene-cinema-ray--a" />
              <span className="hero-journey-scene-cinema-ray hero-journey-scene-cinema-ray--b" />
              <span className="hero-journey-scene-cinema-ray hero-journey-scene-cinema-ray--c" />
              <span className="hero-journey-scene-cinema-core" />
              <span className="hero-journey-scene-cinema-noise" />
            </div>

            <article
              className="hero-journey-scene-cinema-active"
              style={{ '--hero-scene-accent': activeStage?.accentColor ?? '#79d0ff' } as CSSProperties}
            >
              {activeStage ? (
                <>
                  <p className="hero-journey-scene-cinema-label">
                    Stage {activeStageIndex + 1}/{stageSections.length} · {activeCue.signal}
                  </p>
                  <h2>{activeStage.title}</h2>
                  <p className="hero-journey-scene-cinema-active-summary">{activeStage.summary}</p>
                  <div className="hero-journey-scene-cinema-active-meta">
                    <span>{activeStage.phase}</span>
                    <span>
                      {activeStage.candidates.length} candidate{activeStage.candidates.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {activeStage.candidates.length > 0 ? (
                    <ul className="hero-journey-scene-cinema-active-candidates">
                      {activeStage.candidates.slice(0, 5).map((candidate) => (
                        <li
                          key={`active-${activeStage.id}-${candidate.organismId}`}
                          className={candidate.isComposed ? '' : 'is-uncomposed'}
                        >
                          {candidate.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="hero-journey-scene-empty">No candidates referenced yet.</p>
                  )}
                </>
              ) : (
                <p className="hero-journey-scene-empty">No active stage yet.</p>
              )}
            </article>
          </div>

          {stageSections.length === 0 ? (
            <p className="hero-journey-scene-empty">No stages composed yet.</p>
          ) : (
            <ol ref={trackRef} className="hero-journey-scene-cinema-track">
              {stageSections.map((stage, index) => {
                const isActive = stage.id === activeStage?.id;
                const cue = resolveStageCue(stage, index);
                return (
                  <li
                    key={`track-${stage.id}`}
                    ref={bindStagePanelRef(stage.id)}
                    className={`hero-journey-scene-cinema-panel${isActive ? ' is-active' : ''}`}
                    style={{ '--hero-scene-accent': stage.accentColor ?? '#79d0ff' } as CSSProperties}
                  >
                    <button
                      type="button"
                      className="hero-journey-scene-cinema-panel-hit"
                      onClick={() => focusStage(stage.id)}
                      aria-pressed={isActive}
                    >
                      <p className="hero-journey-scene-cinema-label">
                        Stage {String(index + 1).padStart(2, '0')} · {cue.label}
                      </p>
                      <h3>{stage.title}</h3>
                      <p className="hero-journey-scene-cinema-panel-summary">{stage.summary}</p>
                      <div className="hero-journey-scene-cinema-panel-meta">
                        <span>{stage.phase}</span>
                        <span>
                          {stage.candidates.length} candidate{stage.candidates.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      {stage.candidates.length > 0 ? (
                        <ul className="hero-journey-scene-cinema-panel-candidates">
                          {stage.candidates.slice(0, 4).map((candidate) => (
                            <li
                              key={`panel-${stage.id}-${candidate.organismId}`}
                              className={candidate.isComposed ? '' : 'is-uncomposed'}
                            >
                              {candidate.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="hero-journey-scene-empty">No candidates for this stage yet.</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </section>

      <section className="hero-journey-scene-cinema-songs">
        <header className="hero-journey-scene-cinema-songs-header">
          <p className="hero-journey-scene-cinema-label">Composed songs</p>
          <p className="hero-journey-scene-cinema-songs-copy">
            Song-to-stage relationship map across the full narrative arc.
          </p>
        </header>
        {songs.length === 0 ? (
          <p className="hero-journey-scene-empty">No songs composed yet.</p>
        ) : (
          <ul className="hero-journey-scene-cinema-song-list">
            {songs.map((entry) => {
              const linkedStages = stagesBySongId.get(entry.id) ?? [];
              return (
                <li key={entry.id} className="hero-journey-scene-cinema-song-card">
                  <h3>{entry.data?.organism.name ?? entry.id}</h3>
                  <p className="hero-journey-scene-cinema-song-copy">
                    {linkedStages.length === 0
                      ? 'Not mapped to a stage yet.'
                      : `Appears in ${linkedStages.length} stage${linkedStages.length === 1 ? '' : 's'}.`}
                  </p>
                  {linkedStages.length === 0 ? (
                    <span className="hero-journey-scene-cinema-song-pill hero-journey-scene-cinema-song-pill--unmapped">
                      Unmapped
                    </span>
                  ) : (
                    <div className="hero-journey-scene-cinema-song-pills">
                      {linkedStages.map((linkedStage) => (
                        <span
                          key={`song-${entry.id}-${linkedStage.id}`}
                          className="hero-journey-scene-cinema-song-pill"
                          style={{ '--hero-scene-accent': linkedStage.accentColor ?? '#79d0ff' } as CSSProperties}
                        >
                          {linkedStage.phase}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
