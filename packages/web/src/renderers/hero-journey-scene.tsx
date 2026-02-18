/**
 * Hero Journey Scene renderer — bespoke concept album presentation for V1.
 *
 * This renderer intentionally prioritizes atmosphere and narrative framing
 * for the demo seed while still exposing composed song organisms.
 */

import type { CSSProperties } from 'react';
import { useChildren, useOrganismsByIds } from '../hooks/use-organism.js';
import type { RendererProps } from './registry.js';

interface HeroJourneyChapter {
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

export function HeroJourneySceneRenderer({ state }: RendererProps) {
  const payload = state.payload as HeroJourneyScenePayload;
  const chapters = payload.chapters ?? [];
  const { data: children } = useChildren(state.organismId);
  const childIds = children?.map((child) => child.childId) ?? [];
  const { data: childById } = useOrganismsByIds(childIds);

  const songs = childIds
    .map((id) => ({ id, data: childById?.[id] }))
    .filter((entry) => entry.data?.currentState?.contentTypeId === 'song');

  return (
    <div className="hero-journey-scene">
      <header className="hero-journey-scene-header">
        <p className="hero-journey-scene-eyebrow">Concept Album</p>
        <h1>{payload.title ?? "Hero's Journey"}</h1>
        <p>{payload.subtitle ?? 'A narrative arc composed across songs.'}</p>
      </header>

      <section className="hero-journey-scene-chapters">
        {chapters.length === 0 ? (
          <p className="hero-journey-scene-empty">No chapters surfaced yet.</p>
        ) : (
          chapters.map((chapter) => (
            <article
              key={`${chapter.phase}-${chapter.title}`}
              className="hero-journey-scene-chapter"
              style={{ '--hero-scene-accent': chapter.accentColor ?? '#4f98b4' } as CSSProperties}
            >
              <p className="hero-journey-scene-phase">{chapter.phase}</p>
              <h2>{chapter.title}</h2>
              <p>{chapter.summary}</p>
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
