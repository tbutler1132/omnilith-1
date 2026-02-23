/**
 * Viewport math for web-next map navigation.
 *
 * Keeps pan and transform calculations pure so drag behavior can remain
 * deterministic and testable while the map experience is rebuilt.
 */

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

export function createInitialViewport(mapWidth: number, mapHeight: number): ViewportState {
  return {
    x: mapWidth / 2,
    y: mapHeight / 2,
    zoom: 0.25,
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
