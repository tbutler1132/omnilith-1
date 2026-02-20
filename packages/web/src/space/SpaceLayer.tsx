/**
 * SpaceLayer — renders all visible organisms in the current map.
 *
 * Computes visible bounds from the viewport and filters entries to only
 * those in view (with margin). Delegates each to SpaceOrganism.
 * Passes the current altitude for altitude-responsive rendering.
 */

import { useMemo } from 'react';
import { useOrganismMarkersByIds } from '../hooks/use-organism.js';
import { SpaceOrganism } from './SpaceOrganism.js';
import type { SpatialMapEntry } from './use-spatial-map.js';
import { type Altitude, getVisibleBounds, isVisible, type ScreenSize, type ViewportState } from './viewport-math.js';

const BASE_SIZE = 160;

interface SpaceLayerProps {
  entries: SpatialMapEntry[];
  viewport: ViewportState;
  screenSize: ScreenSize;
  altitude: Altitude;
  focusedOrganismId: string | null;
  onFocusOrganism: (organismId: string, wx: number, wy: number) => void;
  onEnterOrganism: (organismId: string, wx: number, wy: number) => void;
  onEnterMap: (mapId: string, label: string) => void;
}

export function resolveDetailIds(visibleEntries: SpatialMapEntry[]): string[] {
  // High-altitude markers still need content-type data for visual distinctions.
  return visibleEntries.map((entry) => entry.organismId);
}

export function SpaceLayer({
  entries,
  viewport,
  screenSize,
  altitude,
  focusedOrganismId,
  onFocusOrganism,
  onEnterOrganism,
  onEnterMap,
}: SpaceLayerProps) {
  const visibleEntries = useMemo(() => {
    if (screenSize.width === 0 || screenSize.height === 0) return entries;
    const bounds = getVisibleBounds(viewport, screenSize);
    return entries.filter((e) => isVisible(e.x, e.y, BASE_SIZE * (e.size ?? 1), bounds));
  }, [entries, viewport, screenSize]);

  const detailIds = useMemo(() => resolveDetailIds(visibleEntries), [visibleEntries]);

  const {
    data: markerDataById,
    loading: markerDataLoading,
    error: markerDataError,
  } = useOrganismMarkersByIds(detailIds);

  return (
    <>
      {visibleEntries.map((entry) => (
        // Visible map entries request organism detail so marker distinctions
        // can reflect content type even at high altitude.
        <SpaceOrganism
          key={entry.organismId}
          entry={entry}
          altitude={altitude}
          focused={focusedOrganismId === entry.organismId}
          marker={markerDataById?.[entry.organismId]}
          markerLoading={markerDataLoading && !markerDataById?.[entry.organismId]}
          markerError={markerDataError}
          onFocusOrganism={onFocusOrganism}
          onEnterOrganism={onEnterOrganism}
          onEnterMap={onEnterMap}
        />
      ))}
    </>
  );
}
