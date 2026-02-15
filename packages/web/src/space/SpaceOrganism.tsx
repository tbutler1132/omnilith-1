/**
 * SpaceOrganism — renders a single organism at its world position.
 *
 * Positioned absolutely in world-space coordinates. Renders differently
 * at each altitude: dot at High, badge + label at Mid, full content-type
 * renderer at Close. Handles click (focus + animate to Close) and
 * double-click (enter map for spatial-map organisms).
 */

import { useOrganism } from '../hooks/use-organism.js';
import { usePlatform } from '../platform/index.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';
import { getPreviewText } from '../utils/preview-text.js';
import type { SpatialMapEntry } from './use-spatial-map.js';
import { type Altitude, zoomForAltitude } from './viewport-math.js';

const BASE_SIZE = 160;

interface SpaceOrganismProps {
  entry: SpatialMapEntry;
  altitude: Altitude;
  focused: boolean;
  onFocusOrganism: (organismId: string, wx: number, wy: number) => void;
  onEnterOrganism: (organismId: string, wx: number, wy: number) => void;
}

export function SpaceOrganism({ entry, altitude, focused, onFocusOrganism, onEnterOrganism }: SpaceOrganismProps) {
  const { enterMap } = usePlatform();
  const { data, loading, error } = useOrganism(entry.organismId);

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
      onEnterOrganism(entry.organismId, entry.x, entry.y);
    } else {
      onFocusOrganism(entry.organismId, entry.x, entry.y);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.currentState?.contentTypeId === 'spatial-map') {
      const payload = data.currentState.payload as Record<string, unknown> | null;
      const label =
        (payload && typeof payload.name === 'string' && payload.name) ||
        (payload && typeof payload.title === 'string' && payload.title) ||
        entry.organismId.slice(0, 8);
      enterMap(entry.organismId, label);
    }
  };

  const className = [
    'space-organism',
    focused && 'space-organism--focused',
    loading && 'space-organism--loading',
    error && 'space-organism--error',
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

  if (error || !data?.currentState) {
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

  // Mid altitude: type badge + organism label
  if (altitude === 'mid') {
    const label = getOrganismLabel(data.currentState);
    return (
      <button
        type="button"
        className={`${className} organism-mid`}
        style={style}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <span className="organism-type-badge">{data.currentState.contentTypeId}</span>
        <span className="organism-label">{label}</span>
      </button>
    );
  }

  // Close altitude: full content-type renderer
  const Renderer = getRenderer(data.currentState.contentTypeId) ?? FallbackRenderer;

  return (
    <button type="button" className={className} style={style} onClick={handleClick} onDoubleClick={handleDoubleClick}>
      <Renderer state={data.currentState} zoom={zoomForAltitude('close')} focused={focused} />
    </button>
  );
}

function getOrganismLabel(state: { contentTypeId: string; payload: unknown }): string {
  return getPreviewText(state, 40);
}
