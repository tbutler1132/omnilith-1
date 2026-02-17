/**
 * SpaceOrganism — renders a single organism at its world position.
 *
 * Positioned absolutely in world-space coordinates. Renders differently
 * at each altitude: dot at High, badge + label at Mid, full content-type
 * renderer at Close. Handles click (focus + animate to Close) and
 * double-click (enter map for spatial-map organisms).
 */

import { memo } from 'react';
import type { OrganismData } from '../hooks/use-organism.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';
import type { SpatialMapEntry } from './use-spatial-map.js';
import { type Altitude, zoomForAltitude } from './viewport-math.js';

const BASE_SIZE = 160;

interface SpaceOrganismProps {
  entry: SpatialMapEntry;
  altitude: Altitude;
  focused: boolean;
  organismDataRequested: boolean;
  organismData: OrganismData | undefined;
  organismDataLoading: boolean;
  organismDataError: Error | undefined;
  onFocusOrganism: (organismId: string, wx: number, wy: number) => void;
  onEnterOrganism: (organismId: string, wx: number, wy: number) => void;
  onEnterMap: (mapId: string, label: string) => void;
}

function SpaceOrganismImpl({
  entry,
  altitude,
  focused,
  organismDataRequested,
  organismData,
  organismDataLoading,
  organismDataError,
  onFocusOrganism,
  onEnterOrganism,
  onEnterMap,
}: SpaceOrganismProps) {
  const data = organismData;
  const loading = organismDataRequested && organismDataLoading && !data;
  const error = organismDataRequested ? organismDataError : undefined;

  // Fixed world-space size — never changes with altitude.
  // Only the rendered content inside changes.
  const size = BASE_SIZE * (entry.size ?? 1);
  const opacity = 0.4 + (entry.emphasis ?? 0.5) * 0.6;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: entry.x - size / 2,
    top: entry.y - size / 2,
    width: size,
    height: size,
    opacity,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (focused) {
      if (!data?.currentState) return;
      if (data?.currentState?.contentTypeId === 'community') {
        const payload = data.currentState.payload as { mapOrganismId: string };
        onEnterMap(payload.mapOrganismId, data.organism.name);
      } else {
        onEnterOrganism(entry.organismId, entry.x, entry.y);
      }
    } else {
      onFocusOrganism(entry.organismId, entry.x, entry.y);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data?.currentState) return;
    if (data?.currentState?.contentTypeId === 'spatial-map') {
      onEnterMap(entry.organismId, data.organism.name);
    } else if (data?.currentState?.contentTypeId === 'community') {
      const payload = data.currentState.payload as { mapOrganismId: string };
      onEnterMap(payload.mapOrganismId, data.organism.name);
    }
  };

  const contentTypeId = data?.currentState?.contentTypeId;

  const className = [
    'space-organism',
    focused && 'space-organism--focused',
    loading && 'space-organism--loading',
    error && 'space-organism--error',
    contentTypeId && `space-organism--${contentTypeId}`,
  ]
    .filter(Boolean)
    .join(' ');

  if (loading) {
    return (
      <button type="button" className={className} style={style} onClick={handleClick}>
        {altitude === 'high' ? null : 'Loading...'}
      </button>
    );
  }

  if (organismDataRequested && (error || !data?.currentState)) {
    return (
      <button
        type="button"
        className={`space-organism space-organism--error ${focused ? 'space-organism--focused' : ''}`}
        style={style}
        onClick={handleClick}
      >
        {altitude === 'high' ? null : error ? 'Error' : 'No state'}
      </button>
    );
  }

  // High altitude: small centered dot inside the fixed bounding box
  if (altitude === 'high') {
    return (
      <button
        type="button"
        className={`${className} space-organism--high`}
        style={style}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <span className="organism-dot" />
      </button>
    );
  }

  if (!data?.currentState) {
    return (
      <button type="button" className={className} style={style} onClick={handleClick} onDoubleClick={handleDoubleClick}>
        {altitude === 'mid' ? <span className="organism-label">Loading...</span> : null}
      </button>
    );
  }

  const currentState = data.currentState;

  // Mid altitude: type badge + organism name
  if (altitude === 'mid') {
    return (
      <button
        type="button"
        className={`${className} organism-mid`}
        style={style}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <span className="organism-type-badge">{currentState.contentTypeId}</span>
        <span className="organism-label">{data.organism.name}</span>
      </button>
    );
  }

  // Close altitude: full content-type renderer
  const Renderer = getRenderer(currentState.contentTypeId) ?? FallbackRenderer;

  return (
    <button type="button" className={className} style={style} onClick={handleClick} onDoubleClick={handleDoubleClick}>
      <Renderer state={currentState} zoom={zoomForAltitude('close')} focused={focused} />
    </button>
  );
}

export const SpaceOrganism = memo(SpaceOrganismImpl);
