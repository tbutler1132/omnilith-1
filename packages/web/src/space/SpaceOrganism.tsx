/**
 * SpaceOrganism — renders a single organism at its world position.
 *
 * Positioned absolutely in world-space coordinates. Renders differently
 * at each altitude: dot at High, badge + label at Mid, full content-type
 * renderer at Close. Handles click (focus + animate to Close) and
 * double-click (enter map for spatial-map organisms).
 */

import { memo } from 'react';
import type { Altitude } from '../contracts/altitude.js';
import type { OrganismMarkerData } from '../hooks/use-organism.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';
import type { SpatialMapEntry } from './use-spatial-map.js';
import { zoomForAltitude } from './viewport-math.js';

const BASE_SIZE = 160;
const PRIVATE_MARKER_BADGE_LABEL = 'Private';
const PRIVATE_MARKER_MID_LABEL = 'Private organism';
const PRIVATE_MARKER_CLOSE_LABEL = 'Access restricted';

interface SpaceOrganismProps {
  entry: SpatialMapEntry;
  altitude: Altitude;
  focused: boolean;
  marker: OrganismMarkerData | undefined;
  markerLoading: boolean;
  markerError: Error | undefined;
  onFocusOrganism: (organismId: string, wx: number, wy: number) => void;
  onEnterOrganism: (organismId: string, wx: number, wy: number) => void;
  onEnterMap: (mapId: string, label: string) => void;
}

interface PrimaryClickIntentInput {
  restricted: boolean;
  focused: boolean;
  altitude: Altitude;
  hasCurrentState: boolean;
}

export type PrimaryClickIntent = 'focus' | 'enter' | 'none';

export function resolvePrimaryClickIntent(input: PrimaryClickIntentInput): PrimaryClickIntent {
  if (input.restricted) {
    return input.focused && input.altitude === 'close' ? 'none' : 'focus';
  }

  if (input.focused && input.altitude === 'close') {
    return input.hasCurrentState ? 'enter' : 'none';
  }

  return 'focus';
}

function eventOriginatesFromInteractiveDescendant(e: React.MouseEvent<Element>): boolean {
  const target = e.target;
  if (!(target instanceof Element)) return false;
  if (target === e.currentTarget) return false;
  const nearestInteractive = target.closest('button, a, input, select, textarea, [role="button"], [role="link"]');
  if (!nearestInteractive) return false;
  return nearestInteractive !== e.currentTarget;
}

function eventOriginatesFromNestedInteractiveTarget(
  target: EventTarget | null,
  currentTarget: EventTarget | null,
): boolean {
  if (!(target instanceof Element) || !(currentTarget instanceof Element)) return false;
  if (target === currentTarget) return false;
  const nearestInteractive = target.closest('button, a, input, select, textarea, [role="button"], [role="link"]');
  if (!nearestInteractive) return false;
  return nearestInteractive !== currentTarget;
}

function SpaceOrganismImpl({
  entry,
  altitude,
  focused,
  marker,
  markerLoading,
  markerError,
  onFocusOrganism,
  onEnterOrganism,
  onEnterMap,
}: SpaceOrganismProps) {
  const loading = markerLoading && !marker;
  const restricted = marker?.kind === 'restricted';
  const markerFailure = marker?.kind === 'error' ? marker.error : undefined;
  const error = markerFailure ?? markerError;
  const data = marker?.kind === 'available' ? marker.data : undefined;

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
    if (eventOriginatesFromInteractiveDescendant(e)) return;
    e.stopPropagation();
    const intent = resolvePrimaryClickIntent({
      restricted,
      focused,
      altitude,
      hasCurrentState: Boolean(data?.currentState),
    });

    if (intent === 'none') {
      return;
    }

    if (intent === 'focus') {
      onFocusOrganism(entry.organismId, entry.x, entry.y);
      return;
    }

    if (!data?.currentState) return;
    if (data?.currentState?.contentTypeId === 'community') {
      const payload = data.currentState.payload as { mapOrganismId: string };
      onEnterMap(payload.mapOrganismId, data.organism.name);
    } else {
      onEnterOrganism(entry.organismId, entry.x, entry.y);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (eventOriginatesFromNestedInteractiveTarget(e.target, e.currentTarget)) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    const intent = resolvePrimaryClickIntent({
      restricted,
      focused,
      altitude,
      hasCurrentState: Boolean(data?.currentState),
    });

    if (intent === 'none') {
      return;
    }

    if (intent === 'focus') {
      onFocusOrganism(entry.organismId, entry.x, entry.y);
      return;
    }

    if (!data?.currentState) return;
    if (data?.currentState?.contentTypeId === 'community') {
      const payload = data.currentState.payload as { mapOrganismId: string };
      onEnterMap(payload.mapOrganismId, data.organism.name);
    } else {
      onEnterOrganism(entry.organismId, entry.x, entry.y);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (eventOriginatesFromInteractiveDescendant(e)) return;
    e.stopPropagation();
    if (restricted) return;
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
    restricted && 'space-organism--restricted',
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

  if (restricted) {
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

    return (
      <button
        type="button"
        className={`${className} organism-mid`}
        style={style}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <span className="organism-type-badge">{PRIVATE_MARKER_BADGE_LABEL}</span>
        <span className="organism-label">
          {altitude === 'close' ? PRIVATE_MARKER_CLOSE_LABEL : PRIVATE_MARKER_MID_LABEL}
        </span>
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
    // biome-ignore lint/a11y/useSemanticElements: close renderers can contain nested interactive controls, so wrapper cannot be a <button>.
    <div
      className={className}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`Open organism ${data.organism.name}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDoubleClick={handleDoubleClick}
    >
      <Renderer state={currentState} zoom={zoomForAltitude('close')} focused={focused} />
    </div>
  );
}

export const SpaceOrganism = memo(SpaceOrganismImpl);
