/**
 * Cue schema — context-aware popup metadata for adaptive HUD guidance.
 *
 * Cues are separate from panels and widgets. They can target anchors and
 * provide short-lived guidance or awareness hints.
 */

export type HudCueId = 'adaptive-help';
export type HudCueVariant = 'hint' | 'warning' | 'notice';
export type HudCueTargetAnchorId = 'visor-pill' | 'adaptive-policy-badge';

export interface HudCueTarget {
  type: 'hud-anchor';
  anchorId: HudCueTargetAnchorId;
}

export interface HudCueDefinition {
  id: HudCueId;
  variant: HudCueVariant;
  priority: number;
  title: string;
  message: string;
  playLabel?: string;
  target: HudCueTarget;
}

export interface ActiveHudCue extends HudCueDefinition {}

export const HUD_CUE_REGISTRY: HudCueDefinition[] = [
  {
    id: 'adaptive-help',
    variant: 'hint',
    priority: 100,
    title: 'Adaptive HUD',
    message: 'Use collapsed panel chips to promote map panels into the centered main slot.',
    playLabel: 'Play intro',
    target: {
      type: 'hud-anchor',
      anchorId: 'adaptive-policy-badge',
    },
  },
];
