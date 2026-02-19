/**
 * Hero Journey Stage renderer — focused stage narrative card.
 */

import type { CSSProperties } from 'react';
import type { RendererProps } from './registry.js';

interface HeroJourneyStagePayload {
  stageId?: string;
  phase?: string;
  title?: string;
  summary?: string;
  accentColor?: string;
}

export function HeroJourneyStageRenderer({ state }: RendererProps) {
  const payload = state.payload as HeroJourneyStagePayload;

  return (
    <div
      className="hero-journey-stage-renderer"
      style={{ '--hero-stage-accent': payload.accentColor ?? '#4f98b4' } as CSSProperties}
    >
      <p className="hero-journey-stage-phase">{payload.phase ?? 'Stage'}</p>
      <h2>{payload.title ?? payload.stageId ?? 'Untitled stage'}</h2>
      <p className="hero-journey-stage-summary">{payload.summary ?? 'No stage summary yet.'}</p>
    </div>
  );
}
