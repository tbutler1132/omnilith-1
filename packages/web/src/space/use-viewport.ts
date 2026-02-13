/**
 * useViewport — manages pan/zoom viewport state for the 2D canvas.
 *
 * Tracks screen size via ResizeObserver and provides viewport state
 * with a setter. Resets to centered view when map dimensions change.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScreenSize, ViewportState } from './viewport-math.js';
import { interpolateViewport } from './viewport-math.js';

interface UseViewportOptions {
  mapWidth: number;
  mapHeight: number;
}

interface UseViewportResult {
  viewport: ViewportState;
  screenSize: ScreenSize;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setViewport: (v: ViewportState | ((prev: ViewportState) => ViewportState)) => void;
  animateTo: (target: ViewportState) => void;
}

const ANIMATION_DURATION = 300;

export function useViewport({ mapWidth, mapHeight }: UseViewportOptions): UseViewportResult {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [viewport, setViewport] = useState<ViewportState>({
    x: mapWidth / 2,
    y: mapHeight / 2,
    zoom: 0.5,
  });

  const [screenSize, setScreenSize] = useState<ScreenSize>({ width: 0, height: 0 });

  // Track map dimensions to reset viewport on map change
  const prevMapRef = useRef({ mapWidth, mapHeight });

  useEffect(() => {
    const prev = prevMapRef.current;
    if (prev.mapWidth !== mapWidth || prev.mapHeight !== mapHeight) {
      prevMapRef.current = { mapWidth, mapHeight };
      setViewport({ x: mapWidth / 2, y: mapHeight / 2, zoom: 0.5 });
    }
  }, [mapWidth, mapHeight]);

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
    [cancelAnimation],
  );

  const animateTo = useCallback(
    (target: ViewportState) => {
      cancelAnimation();
      const from = viewportRef.current;

      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / ANIMATION_DURATION, 1);
        // Ease-out cubic: 1 - (1-t)^3
        const eased = 1 - (1 - t) ** 3;
        setViewport(interpolateViewport(from, target, eased));

        if (t < 1) {
          animRef.current = { id: requestAnimationFrame(tick), startTime, from, to: target };
        } else {
          animRef.current = null;
        }
      };

      animRef.current = {
        id: requestAnimationFrame(tick),
        startTime,
        from,
        to: target,
      };
    },
    [cancelAnimation],
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

  return { viewport, screenSize, containerRef, setViewport: setViewportWrapped, animateTo };
}
