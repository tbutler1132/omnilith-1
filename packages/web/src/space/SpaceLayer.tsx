/**
 * SpaceLayer — renders all visible organisms in the current map.
 *
 * Computes visible bounds from the viewport and filters entries to only
 * those in view (with margin). Delegates each to SpaceOrganism.
 */

import { useMemo } from 'react';
import { usePlatform } from '../platform/index.js';
import { SpaceOrganism } from './SpaceOrganism.js';
import type { SpatialMapEntry } from './use-spatial-map.js';
import { getVisibleBounds, isVisible, type ScreenSize, type ViewportState } from './viewport-math.js';

const BASE_SIZE = 160;

interface SpaceLayerProps {
  entries: SpatialMapEntry[];
  viewport: ViewportState;
  screenSize: ScreenSize;
  animateTo: (target: ViewportState) => void;
}

export function SpaceLayer({ entries, viewport, screenSize, animateTo }: SpaceLayerProps) {
  const { state } = usePlatform();

  const visibleEntries = useMemo(() => {
    if (screenSize.width === 0 || screenSize.height === 0) return entries;
    const bounds = getVisibleBounds(viewport, screenSize);
    return entries.filter((e) => isVisible(e.x, e.y, BASE_SIZE * (e.size ?? 1), bounds));
  }, [entries, viewport, screenSize]);

  return (
    <>
      {visibleEntries.map((entry) => (
        <SpaceOrganism
          key={entry.organismId}
          entry={entry}
          zoom={viewport.zoom}
          focused={state.focusedOrganismId === entry.organismId}
          screenSize={screenSize}
          animateTo={animateTo}
        />
      ))}
    </>
  );
}
