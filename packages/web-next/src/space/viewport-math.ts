/**
 * Viewport math for web-next map navigation.
 *
 * Keeps pan and transform calculations pure so drag behavior can remain
 * deterministic and testable while the map experience is rebuilt.
 */

import type { Altitude } from '../contracts/altitude.js';

export interface ViewportState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface ScreenSize {
  readonly width: number;
  readonly height: number;
}

const MAP_PADDING = 100;
const ALTITUDE_ORDER: readonly Altitude[] = ['high', 'mid', 'close'];

export interface AltitudeZoomProfile {
  readonly high: number;
  readonly mid: number;
  readonly close: number;
}

export const DEFAULT_ALTITUDE_ZOOM_PROFILE: AltitudeZoomProfile = {
  high: 0.25,
  mid: 0.6,
  close: 1.3,
};

/** Zoom level used while transitioning into a map interior boundary. */
export const ENTER_ZOOM = 4.0;

export function createAltitudeZoomProfile(scale: number): AltitudeZoomProfile {
  const normalizedScale = Number.isFinite(scale) ? Math.max(0.001, scale) : 1;

  return {
    high: DEFAULT_ALTITUDE_ZOOM_PROFILE.high * normalizedScale,
    mid: DEFAULT_ALTITUDE_ZOOM_PROFILE.mid * normalizedScale,
    close: DEFAULT_ALTITUDE_ZOOM_PROFILE.close * normalizedScale,
  };
}

export function createInitialViewport(
  mapWidth: number,
  mapHeight: number,
  zoomProfile: AltitudeZoomProfile = DEFAULT_ALTITUDE_ZOOM_PROFILE,
): ViewportState {
  return {
    x: mapWidth / 2,
    y: mapHeight / 2,
    zoom: zoomForAltitude('high', zoomProfile),
  };
}

export function zoomForAltitude(
  altitude: Altitude,
  zoomProfile: AltitudeZoomProfile = DEFAULT_ALTITUDE_ZOOM_PROFILE,
): number {
  return zoomProfile[altitude];
}

export function altitudeFromZoom(
  zoom: number,
  zoomProfile: AltitudeZoomProfile = DEFAULT_ALTITUDE_ZOOM_PROFILE,
): Altitude {
  let closest = ALTITUDE_ORDER[0];
  let minDistance = Math.abs(zoom - zoomProfile[closest]);

  for (let index = 1; index < ALTITUDE_ORDER.length; index += 1) {
    const candidate = ALTITUDE_ORDER[index];
    const distance = Math.abs(zoom - zoomProfile[candidate]);
    if (distance < minDistance) {
      closest = candidate;
      minDistance = distance;
    }
  }

  return closest;
}

export function nextAltitude(current: Altitude, direction: 'in' | 'out'): Altitude | null {
  const index = ALTITUDE_ORDER.indexOf(current);
  const nextIndex = direction === 'in' ? index + 1 : index - 1;
  return ALTITUDE_ORDER[nextIndex] ?? null;
}

export function interpolateViewport(from: ViewportState, to: ViewportState, t: number): ViewportState {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t,
  };
}

export function frameOrganism(
  wx: number,
  wy: number,
  zoomProfile: AltitudeZoomProfile = DEFAULT_ALTITUDE_ZOOM_PROFILE,
): ViewportState {
  return {
    x: wx,
    y: wy,
    zoom: zoomForAltitude('close', zoomProfile),
  };
}

export function frameOrganismFocus(
  wx: number,
  wy: number,
  zoomProfile: AltitudeZoomProfile = DEFAULT_ALTITUDE_ZOOM_PROFILE,
): ViewportState {
  return {
    x: wx,
    y: wy,
    zoom: zoomForAltitude('mid', zoomProfile),
  };
}

export function frameOrganismEnter(wx: number, wy: number): ViewportState {
  return {
    x: wx,
    y: wy,
    zoom: ENTER_ZOOM,
  };
}

export function getWorldTransform(viewport: ViewportState, screen: ScreenSize): string {
  const tx = screen.width / 2 - viewport.x * viewport.zoom;
  const ty = screen.height / 2 - viewport.y * viewport.zoom;
  return `translate(${tx}px, ${ty}px) scale(${viewport.zoom})`;
}

export function applyPan(viewport: ViewportState, screenDx: number, screenDy: number): ViewportState {
  return {
    ...viewport,
    x: viewport.x - screenDx / viewport.zoom,
    y: viewport.y - screenDy / viewport.zoom,
  };
}

export function clampToMap(
  viewport: ViewportState,
  screen: ScreenSize,
  mapWidth: number,
  mapHeight: number,
): ViewportState {
  if (screen.width === 0 || screen.height === 0) return viewport;

  const halfW = screen.width / 2 / viewport.zoom;
  const halfH = screen.height / 2 / viewport.zoom;

  const minX = Math.min(mapWidth / 2, -MAP_PADDING + halfW);
  const maxX = Math.max(mapWidth / 2, mapWidth + MAP_PADDING - halfW);
  const minY = Math.min(mapHeight / 2, -MAP_PADDING + halfH);
  const maxY = Math.max(mapHeight / 2, mapHeight + MAP_PADDING - halfH);

  return {
    ...viewport,
    x: Math.max(minX, Math.min(maxX, viewport.x)),
    y: Math.max(minY, Math.min(maxY, viewport.y)),
  };
}
