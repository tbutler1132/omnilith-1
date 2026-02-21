/**
 * Viewport math — pure functions for 2D canvas coordinate transforms.
 *
 * No React, no side effects. All coordinate math for the pan/zoom
 * canvas lives here so it can be tested independently.
 *
 * The altitude system provides three discrete zoom levels that the
 * viewport snaps between, replacing continuous zoom.
 */

import type { Altitude } from '../contracts/altitude.js';

export interface ViewportState {
  /** World-space X coordinate at the center of the screen */
  x: number;
  /** World-space Y coordinate at the center of the screen */
  y: number;
  /** Zoom level (1 = 100%) */
  zoom: number;
}

export interface ScreenSize {
  width: number;
  height: number;
}

export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ── Altitude system ──

interface AltitudeLevel {
  level: Altitude;
  zoom: number;
}

/** Ordered from highest (zoomed out) to closest (zoomed in). */
export const ALTITUDES: readonly AltitudeLevel[] = [
  { level: 'high', zoom: 0.25 },
  { level: 'mid', zoom: 0.6 },
  { level: 'close', zoom: 1.3 },
] as const;

/**
 * Navigate to the next altitude in a direction.
 * Returns null if already at the boundary.
 *
 * 'in' = toward Close (zoom in). 'out' = toward High (zoom out).
 */
export function nextAltitude(current: Altitude, direction: 'in' | 'out'): Altitude | null {
  const idx = ALTITUDES.findIndex((a) => a.level === current);
  const next = direction === 'in' ? idx + 1 : idx - 1;
  return ALTITUDES[next]?.level ?? null;
}

/**
 * Snap a continuous zoom value to the nearest altitude.
 */
export function altitudeFromZoom(zoom: number): Altitude {
  let closest: AltitudeLevel = ALTITUDES[0];
  let minDist = Math.abs(zoom - closest.zoom);

  for (let i = 1; i < ALTITUDES.length; i++) {
    const dist = Math.abs(zoom - ALTITUDES[i].zoom);
    if (dist < minDist) {
      closest = ALTITUDES[i];
      minDist = dist;
    }
  }

  return closest.level;
}

/**
 * Look up the fixed zoom value for an altitude level.
 */
export function zoomForAltitude(altitude: Altitude): number {
  const found = ALTITUDES.find((a) => a.level === altitude);
  return found ? found.zoom : ALTITUDES[0].zoom;
}

// ── Coordinate transforms ──

/**
 * CSS transform string for the world container.
 * Positions the world so that viewport center maps to screen center.
 */
export function getWorldTransform(viewport: ViewportState, screen: ScreenSize): string {
  const tx = screen.width / 2 - viewport.x * viewport.zoom;
  const ty = screen.height / 2 - viewport.y * viewport.zoom;
  return `translate(${tx}px, ${ty}px) scale(${viewport.zoom})`;
}

/**
 * Convert screen coordinates to world coordinates.
 */
export function screenToWorld(
  sx: number,
  sy: number,
  viewport: ViewportState,
  screen: ScreenSize,
): { x: number; y: number } {
  return {
    x: viewport.x + (sx - screen.width / 2) / viewport.zoom,
    y: viewport.y + (sy - screen.height / 2) / viewport.zoom,
  };
}

/**
 * Convert world coordinates to screen coordinates.
 */
export function worldToScreen(
  wx: number,
  wy: number,
  viewport: ViewportState,
  screen: ScreenSize,
): { x: number; y: number } {
  return {
    x: (wx - viewport.x) * viewport.zoom + screen.width / 2,
    y: (wy - viewport.y) * viewport.zoom + screen.height / 2,
  };
}

/**
 * World-space bounding rect currently visible on screen.
 */
export function getVisibleBounds(viewport: ViewportState, screen: ScreenSize): WorldBounds {
  const halfW = screen.width / 2 / viewport.zoom;
  const halfH = screen.height / 2 / viewport.zoom;
  return {
    minX: viewport.x - halfW,
    minY: viewport.y - halfH,
    maxX: viewport.x + halfW,
    maxY: viewport.y + halfH,
  };
}

/**
 * Culling check — is a world-space rect potentially visible?
 * Uses a margin (in world-space pixels) to avoid popping at edges.
 */
export function isVisible(wx: number, wy: number, size: number, bounds: WorldBounds, margin = 200): boolean {
  const half = size / 2;
  return (
    wx + half + margin >= bounds.minX &&
    wx - half - margin <= bounds.maxX &&
    wy + half + margin >= bounds.minY &&
    wy - half - margin <= bounds.maxY
  );
}

/**
 * Compute viewport state that centers on an organism at Close altitude.
 */
export function frameOrganism(wx: number, wy: number): ViewportState {
  return { x: wx, y: wy, zoom: zoomForAltitude('close') };
}

/** Zoom level for the enter-organism transition (past Close, into interior). */
export const ENTER_ZOOM = 4.0;

/**
 * Compute viewport state for entering an organism's interior.
 * Centers on the organism and zooms past Close to ENTER_ZOOM.
 */
export function frameOrganismEnter(wx: number, wy: number): ViewportState {
  return { x: wx, y: wy, zoom: ENTER_ZOOM };
}

/**
 * Linear interpolation between two viewport states.
 * t=0 returns `from`, t=1 returns `to`.
 */
export function interpolateViewport(from: ViewportState, to: ViewportState, t: number): ViewportState {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t,
  };
}

/**
 * Clamp viewport center so the visible area stays within map bounds.
 * Allows some padding at edges but prevents panning into the void.
 */
export function clampToMap(
  viewport: ViewportState,
  screen: ScreenSize,
  mapWidth: number,
  mapHeight: number,
): ViewportState {
  if (screen.width === 0 || screen.height === 0) return viewport;

  const halfW = screen.width / 2 / viewport.zoom;
  const halfH = screen.height / 2 / viewport.zoom;

  // Allow the viewport center to go just far enough that the map edge
  // stays at least at the screen edge (with a small padding).
  const pad = 100;
  const minX = Math.min(mapWidth / 2, -pad + halfW);
  const maxX = Math.max(mapWidth / 2, mapWidth + pad - halfW);
  const minY = Math.min(mapHeight / 2, -pad + halfH);
  const maxY = Math.max(mapHeight / 2, mapHeight + pad - halfH);

  return {
    ...viewport,
    x: Math.max(minX, Math.min(maxX, viewport.x)),
    y: Math.max(minY, Math.min(maxY, viewport.y)),
  };
}

/**
 * Apply a screen-space pan delta to the viewport.
 * Dragging right moves the viewport center left (world slides right).
 */
export function applyPan(viewport: ViewportState, screenDx: number, screenDy: number): ViewportState {
  return {
    ...viewport,
    x: viewport.x - screenDx / viewport.zoom,
    y: viewport.y - screenDy / viewport.zoom,
  };
}
