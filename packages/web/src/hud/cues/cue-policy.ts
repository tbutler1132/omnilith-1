/**
 * Cue policy — deterministic selection of context-aware HUD cues.
 *
 * For the first cue iteration, show adaptive help once per session
 * when adaptive visor mode is enabled.
 */

import { type ActiveHudCue, HUD_CUE_REGISTRY, type HudCueId } from './cue-schema.js';

export interface HudCuePolicyContext {
  adaptiveEnabled: boolean;
  seenCueIds: HudCueId[];
}

export function resolveActiveHudCues(context: HudCuePolicyContext): ActiveHudCue[] {
  if (!context.adaptiveEnabled) return [];

  const seen = new Set(context.seenCueIds);

  return HUD_CUE_REGISTRY.filter((cue) => !seen.has(cue.id)).sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });
}
