/**
 * useViewport — manages pan/zoom viewport state for the 2D canvas.
 *
 * Tracks screen size via ResizeObserver and provides viewport state
 * with a setter. Derives altitude from zoom and provides changeAltitude
 * for discrete altitude transitions. Clamps viewport to map bounds.
 * Resets to High altitude centered view when map dimensions change.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Altitude, ScreenSize, ViewportState } from './viewport-math.js';
import { altitudeFromZoom, clampToMap, interpolateViewport, nextAltitude, zoomForAltitude } from './viewport-math.js';

interface UseViewportOptions {
  mapWidth: number;
  mapHeight: number;
}

interface UseViewportResult {
  viewport: ViewportState;
  screenSize: ScreenSize;
  altitude: Altitude;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setViewport: (v: ViewportState | ((prev: ViewportState) => ViewportState)) => void;
  animateTo: (target: ViewportState, options?: { duration?: number; onComplete?: () => void }) => void;
  changeAltitude: (direction: 'in' | 'out') => void;
}

const ANIMATION_DURATION = 300;

export function useViewport({ mapWidth, mapHeight }: UseViewportOptions): UseViewportResult {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [viewport, setViewportRaw] = useState<ViewportState>({
    x: mapWidth / 2,
    y: mapHeight / 2,
    zoom: zoomForAltitude('high'),
  });

  const [screenSize, setScreenSize] = useState<ScreenSize>({ width: 0, height: 0 });

  // Keep refs for clamping (avoids stale closures)
  const screenRef = useRef(screenSize);
  screenRef.current = screenSize;
  const mapRef = useRef({ mapWidth, mapHeight });
  mapRef.current = { mapWidth, mapHeight };

  const altitude = useMemo(() => altitudeFromZoom(viewport.zoom), [viewport.zoom]);

  // Clamped setViewport — every update stays within map bounds
  const setViewport = useCallback((v: ViewportState | ((prev: ViewportState) => ViewportState)) => {
    setViewportRaw((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      return clampToMap(next, screenRef.current, mapRef.current.mapWidth, mapRef.current.mapHeight);
    });
  }, []);

  // Track map dimensions to reset viewport on map change
  const prevMapRef = useRef({ mapWidth, mapHeight });

  useEffect(() => {
    const prev = prevMapRef.current;
    if (prev.mapWidth !== mapWidth || prev.mapHeight !== mapHeight) {
      prevMapRef.current = { mapWidth, mapHeight };
      setViewport({ x: mapWidth / 2, y: mapHeight / 2, zoom: zoomForAltitude('high') });
    }
  }, [mapWidth, mapHeight, setViewport]);

  // Store viewport in ref for animation reads
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Animation state
  const animRef = useRef<{
    id: number;
    startTime: number;
    from: ViewportState;
    to: ViewportState;
  } | null>(null);

  const cancelAnimation = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current.id);
      animRef.current = null;
    }
  }, []);

  // Wrap setViewport to cancel any in-flight animation
  const setViewportWrapped = useCallback(
    (v: ViewportState | ((prev: ViewportState) => ViewportState)) => {
      cancelAnimation();
      setViewport(v);
    },
    [cancelAnimation, setViewport],
  );

  const animateTo = useCallback(
    (target: ViewportState, options?: { duration?: number; onComplete?: () => void }) => {
      cancelAnimation();
      const from = viewportRef.current;
      const duration = options?.duration ?? ANIMATION_DURATION;

      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Ease-out cubic: 1 - (1-t)^3
        const eased = 1 - (1 - t) ** 3;
        setViewport(interpolateViewport(from, target, eased));

        if (t < 1) {
          animRef.current = { id: requestAnimationFrame(tick), startTime, from, to: target };
        } else {
          animRef.current = null;
          options?.onComplete?.();
        }
      };

      animRef.current = {
        id: requestAnimationFrame(tick),
        startTime,
        from,
        to: target,
      };
    },
    [cancelAnimation, setViewport],
  );

  const changeAltitude = useCallback(
    (direction: 'in' | 'out') => {
      const current = altitudeFromZoom(viewportRef.current.zoom);
      const next = nextAltitude(current, direction);
      if (!next) return;

      animateTo({
        ...viewportRef.current,
        zoom: zoomForAltitude(next),
      });
    },
    [animateTo],
  );

  // Clean up animation on unmount
  useEffect(() => cancelAnimation, [cancelAnimation]);

  // Measure container with ResizeObserver
  const measureCallback = useCallback((entries: ResizeObserverEntry[]) => {
    const entry = entries[0];
    if (entry) {
      setScreenSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(measureCallback);
    observer.observe(el);

    // Initial measurement
    const rect = el.getBoundingClientRect();
    setScreenSize({ width: rect.width, height: rect.height });

    return () => observer.disconnect();
  }, [measureCallback]);

  return { viewport, screenSize, altitude, containerRef, setViewport: setViewportWrapped, animateTo, changeAltitude };
}
