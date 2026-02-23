/**
 * Viewport state hook for map drag navigation.
 *
 * Tracks container size and clamps pan updates to map bounds so users can
 * drag naturally without panning into empty space. Also exposes the
 * discrete altitude state and transitions for HUD controls.
 */

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { Altitude } from '../contracts/altitude.js';
import {
  altitudeFromZoom,
  clampToMap,
  createInitialViewport,
  interpolateViewport,
  nextAltitude,
  type ScreenSize,
  type ViewportState,
  zoomForAltitude,
} from './viewport-math.js';

interface UseViewportOptions {
  readonly mapWidth: number;
  readonly mapHeight: number;
}

interface UseViewportResult {
  readonly viewport: ViewportState;
  readonly screenSize: ScreenSize;
  readonly altitude: Altitude;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly setViewport: (next: ViewportState | ((previous: ViewportState) => ViewportState)) => void;
  readonly changeAltitude: (direction: 'in' | 'out') => void;
}

const ALTITUDE_ANIMATION_DURATION_MS = 300;

export function useViewport({ mapWidth, mapHeight }: UseViewportOptions): UseViewportResult {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [viewport, setViewportRaw] = useState<ViewportState>(() => createInitialViewport(mapWidth, mapHeight));
  const [screenSize, setScreenSize] = useState<ScreenSize>({ width: 0, height: 0 });

  const screenSizeRef = useRef(screenSize);
  screenSizeRef.current = screenSize;

  const mapSizeRef = useRef({ mapWidth, mapHeight });
  mapSizeRef.current = { mapWidth, mapHeight };

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const animationRef = useRef<number | null>(null);

  const setViewportClamped = useCallback((next: ViewportState | ((previous: ViewportState) => ViewportState)) => {
    setViewportRaw((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      return clampToMap(resolved, screenSizeRef.current, mapSizeRef.current.mapWidth, mapSizeRef.current.mapHeight);
    });
  }, []);

  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const setViewport = useCallback(
    (next: ViewportState | ((previous: ViewportState) => ViewportState)) => {
      cancelAnimation();
      setViewportClamped(next);
    },
    [cancelAnimation, setViewportClamped],
  );

  const animateTo = useCallback(
    (target: ViewportState, durationMs = ALTITUDE_ANIMATION_DURATION_MS) => {
      cancelAnimation();
      const from = viewportRef.current;
      const startedAt = performance.now();

      const step = (now: number) => {
        const elapsed = now - startedAt;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - (1 - progress) ** 3;
        setViewportClamped(interpolateViewport(from, target, eased));

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(step);
          return;
        }

        animationRef.current = null;
      };

      animationRef.current = requestAnimationFrame(step);
    },
    [cancelAnimation, setViewportClamped],
  );

  const altitude = altitudeFromZoom(viewport.zoom);

  const changeAltitude = useCallback(
    (direction: 'in' | 'out') => {
      const current = viewportRef.current;
      const currentAltitude = altitudeFromZoom(current.zoom);
      const next = nextAltitude(currentAltitude, direction);
      if (!next) return;

      animateTo({
        ...current,
        zoom: zoomForAltitude(next),
      });
    },
    [animateTo],
  );

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

  useEffect(() => cancelAnimation, [cancelAnimation]);

  return { viewport, screenSize, altitude, containerRef, setViewport, changeAltitude };
}
