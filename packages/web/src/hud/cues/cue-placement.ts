/**
 * Cue placement — computes popup coordinates relative to a target anchor.
 *
 * Prefers showing the cue above the anchor. Falls back below when there
 * is not enough top space. Placement is clamped to viewport bounds.
 */

export interface CueBoxSize {
  width: number;
  height: number;
}

export interface CueViewportSize {
  width: number;
  height: number;
}

export interface CuePlacement {
  left: number;
  top: number;
  placement: 'top' | 'bottom';
}

const CUE_OFFSET = 10;
const VIEWPORT_PADDING = 8;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function computeCuePlacement(
  anchorRect: DOMRectReadOnly,
  cueBox: CueBoxSize,
  viewport: CueViewportSize,
): CuePlacement {
  const centeredLeft = anchorRect.left + anchorRect.width / 2 - cueBox.width / 2;
  const minLeft = VIEWPORT_PADDING;
  const maxLeft = Math.max(VIEWPORT_PADDING, viewport.width - cueBox.width - VIEWPORT_PADDING);
  const left = clamp(centeredLeft, minLeft, maxLeft);

  const topCandidate = anchorRect.top - cueBox.height - CUE_OFFSET;
  const minTop = VIEWPORT_PADDING;
  const maxTop = Math.max(VIEWPORT_PADDING, viewport.height - cueBox.height - VIEWPORT_PADDING);

  if (topCandidate >= VIEWPORT_PADDING) {
    return { left, top: clamp(topCandidate, minTop, maxTop), placement: 'top' };
  }

  const bottomCandidate = anchorRect.bottom + CUE_OFFSET;
  return { left, top: clamp(bottomCandidate, minTop, maxTop), placement: 'bottom' };
}
