/**
 * Viewport math — pure functions for 2D canvas coordinate transforms.
 *
 * No React, no side effects. All coordinate math for the pan/zoom
 * canvas lives here so it can be tested independently.
 */

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

/** Minimum zoom level (zoomed far out) */
export const MIN_ZOOM = 0.1;

/** Maximum zoom level (zoomed far in) */
export const MAX_ZOOM = 4.0;

/** Zoom threshold that triggers navigation back to parent map */
export const EXIT_ZOOM = 0.15;

/** Zoom level where the focus lens begins fading in */
export const LENS_FADE_START = 1.8;

/** Zoom level where the focus lens is fully opaque */
export const LENS_FADE_END = 2.5;

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
 * Compute viewport state that centers on an organism and zooms in so it
 * fills roughly 60% of the smaller screen dimension.
 */
export function frameOrganism(wx: number, wy: number, worldSize: number, screen: ScreenSize): ViewportState {
  const fit = Math.min(screen.width, screen.height);
  const zoom = fit > 0 ? Math.min(MAX_ZOOM, Math.max(1, (0.6 * fit) / worldSize)) : 1;
  return { x: wx, y: wy, zoom };
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
 * Focus lens opacity as a pure function of zoom level.
 * Ramps linearly from 0 to 1 across the crossfade zone.
 */
export function lensOpacity(zoom: number): number {
  if (zoom <= LENS_FADE_START) return 0;
  if (zoom >= LENS_FADE_END) return 1;
  return (zoom - LENS_FADE_START) / (LENS_FADE_END - LENS_FADE_START);
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

/**
 * Zoom toward a screen-space point, keeping the world point under the
 * cursor stationary. Clamps to [MIN_ZOOM, MAX_ZOOM].
 */
export function applyZoom(
  viewport: ViewportState,
  screen: ScreenSize,
  factor: number,
  sx: number,
  sy: number,
): ViewportState {
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));

  // World point under the cursor before zoom
  const wx = viewport.x + (sx - screen.width / 2) / viewport.zoom;
  const wy = viewport.y + (sy - screen.height / 2) / viewport.zoom;

  // Adjust center so that (wx, wy) stays at (sx, sy) on screen
  return {
    x: wx - (sx - screen.width / 2) / newZoom,
    y: wy - (sy - screen.height / 2) / newZoom,
    zoom: newZoom,
  };
}
