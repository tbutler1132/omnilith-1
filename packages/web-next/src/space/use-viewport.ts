/**
 * Viewport state hook for map drag navigation.
 *
 * Tracks container size and clamps pan updates to map bounds so users can
 * drag naturally without panning into empty space.
 */

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { clampToMap, createInitialViewport, type ScreenSize, type ViewportState } from './viewport-math.js';

interface UseViewportOptions {
  readonly mapWidth: number;
  readonly mapHeight: number;
}

interface UseViewportResult {
  readonly viewport: ViewportState;
  readonly screenSize: ScreenSize;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly setViewport: (next: ViewportState | ((previous: ViewportState) => ViewportState)) => void;
}

export function useViewport({ mapWidth, mapHeight }: UseViewportOptions): UseViewportResult {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [viewport, setViewportRaw] = useState<ViewportState>(() => createInitialViewport(mapWidth, mapHeight));
  const [screenSize, setScreenSize] = useState<ScreenSize>({ width: 0, height: 0 });

  const screenSizeRef = useRef(screenSize);
  screenSizeRef.current = screenSize;

  const mapSizeRef = useRef({ mapWidth, mapHeight });
  mapSizeRef.current = { mapWidth, mapHeight };

  const setViewport = useCallback((next: ViewportState | ((previous: ViewportState) => ViewportState)) => {
    setViewportRaw((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      return clampToMap(resolved, screenSizeRef.current, mapSizeRef.current.mapWidth, mapSizeRef.current.mapHeight);
    });
  }, []);

  useEffect(() => {
    setViewport(createInitialViewport(mapWidth, mapHeight));
  }, [mapWidth, mapHeight, setViewport]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      setScreenSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);

    const rect = element.getBoundingClientRect();
    setScreenSize({ width: rect.width, height: rect.height });

    return () => observer.disconnect();
  }, []);

  return { viewport, screenSize, containerRef, setViewport };
}
