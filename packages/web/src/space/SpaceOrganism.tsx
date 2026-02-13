/**
 * SpaceOrganism — renders a single organism at its world position.
 *
 * Positioned absolutely in world-space coordinates. Delegates rendering
 * to the content-type renderer registry. Handles click (focus) and
 * double-click (enter map for spatial-map organisms).
 */

import { useOrganism } from '../hooks/use-organism.js';
import { usePlatform } from '../platform/index.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';
import type { SpatialMapEntry } from './use-spatial-map.js';
import { frameOrganism, type ScreenSize, type ViewportState } from './viewport-math.js';

const BASE_SIZE = 160;

interface SpaceOrganismProps {
  entry: SpatialMapEntry;
  zoom: number;
  focused: boolean;
  screenSize: ScreenSize;
  animateTo: (target: ViewportState) => void;
}

export function SpaceOrganism({ entry, zoom, focused, screenSize, animateTo }: SpaceOrganismProps) {
  const { focusOrganism, enterMap } = usePlatform();
  const { data, loading, error } = useOrganism(entry.organismId);

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
    focusOrganism(entry.organismId);
    animateTo(frameOrganism(entry.x, entry.y, size, screenSize));
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
        Loading...
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
        {error ? 'Error' : 'No state'}
      </button>
    );
  }

  const Renderer = getRenderer(data.currentState.contentTypeId) ?? FallbackRenderer;

  return (
    <button type="button" className={className} style={style} onClick={handleClick} onDoubleClick={handleDoubleClick}>
      <Renderer state={data.currentState} zoom={zoom} focused={focused} />
    </button>
  );
}
