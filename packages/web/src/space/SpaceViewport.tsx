/**
 * SpaceViewport — CSS transform container with pan/zoom event handling.
 *
 * Handles single-pointer pan, two-finger pinch-to-zoom, and mouse wheel
 * zoom. Applies CSS transforms for GPU-accelerated rendering.
 * Triggers onExitMap when zooming out past the exit threshold.
 */

import { type ReactNode, useCallback, useRef, useState } from 'react';
import {
  applyPan,
  applyZoom,
  EXIT_ZOOM,
  getWorldTransform,
  type ScreenSize,
  type ViewportState,
} from './viewport-math.js';

interface SpaceViewportProps {
  viewport: ViewportState;
  screenSize: ScreenSize;
  onViewportChange: (v: ViewportState | ((prev: ViewportState) => ViewportState)) => void;
  onExitMap: () => void;
  /** Whether we're at the root map (exit disabled) */
  atRoot: boolean;
  /** Called when user clicks empty space (not an organism, no drag) */
  onClearFocus?: () => void;
  children: ReactNode;
}

interface PointerInfo {
  x: number;
  y: number;
}

const WHEEL_FACTOR = 0.92;

/** Minimum pointer movement (px) to consider a gesture a drag, not a click */
const DRAG_THRESHOLD = 3;

export function SpaceViewport({
  viewport,
  screenSize,
  onViewportChange,
  onExitMap,
  atRoot,
  onClearFocus,
  children,
}: SpaceViewportProps) {
  const [panning, setPanning] = useState(false);

  // Refs for pointer tracking (avoids stale closure issues)
  const pointersRef = useRef(new Map<number, PointerInfo>());
  const lastPanRef = useRef<PointerInfo | null>(null);
  const pinchDistRef = useRef<number | null>(null);

  // Track drag distance to distinguish clicks from pans
  const pointerDownPosRef = useRef<PointerInfo | null>(null);
  const didDragRef = useRef(false);

  // Use refs for viewport to avoid stale closures in event handlers
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const screenRef = useRef(screenSize);
  screenRef.current = screenSize;

  const atRootRef = useRef(atRoot);
  atRootRef.current = atRoot;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track primary button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Don't start pan if clicking on an organism
    const target = e.target as HTMLElement;
    if (target.closest('.space-organism')) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Record start position for drag detection
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;

    if (pointersRef.current.size === 1) {
      // Start single-pointer pan
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      pinchDistRef.current = null;
      setPanning(true);
    } else if (pointersRef.current.size === 2) {
      // Switch to pinch mode
      const [p1, p2] = Array.from(pointersRef.current.values());
      pinchDistRef.current = distance(p1, p2);
      lastPanRef.current = midpoint(p1, p2);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Detect drag (pointer moved beyond threshold)
      if (!didDragRef.current && pointerDownPosRef.current) {
        const dx = e.clientX - pointerDownPosRef.current.x;
        const dy = e.clientY - pointerDownPosRef.current.y;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          didDragRef.current = true;
        }
      }

      if (pointersRef.current.size === 1 && lastPanRef.current) {
        // Single-pointer pan
        const dx = e.clientX - lastPanRef.current.x;
        const dy = e.clientY - lastPanRef.current.y;
        lastPanRef.current = { x: e.clientX, y: e.clientY };

        onViewportChange((prev) => applyPan(prev, dx, dy));
      } else if (pointersRef.current.size === 2 && pinchDistRef.current !== null && lastPanRef.current) {
        // Pinch-to-zoom
        const [p1, p2] = Array.from(pointersRef.current.values());
        const newDist = distance(p1, p2);
        const mid = midpoint(p1, p2);

        // Zoom factor from distance change
        const factor = newDist / pinchDistRef.current;

        // Pan from midpoint movement
        const dx = mid.x - lastPanRef.current.x;
        const dy = mid.y - lastPanRef.current.y;

        pinchDistRef.current = newDist;
        lastPanRef.current = mid;

        onViewportChange((prev) => {
          const panned = applyPan(prev, dx, dy);
          return applyZoom(panned, screenRef.current, factor, mid.x, mid.y);
        });
      }
    },
    [onViewportChange],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      pointersRef.current.delete(e.pointerId);

      if (pointersRef.current.size === 0) {
        // All pointers released
        lastPanRef.current = null;
        pinchDistRef.current = null;
        setPanning(false);

        // Click on empty space (no drag, not on an organism) → clear focus
        if (!didDragRef.current && onClearFocus) {
          onClearFocus();
        }
        pointerDownPosRef.current = null;
      } else if (pointersRef.current.size === 1) {
        // Dropped to one pointer — resume pan from remaining pointer
        const [remaining] = Array.from(pointersRef.current.values());
        lastPanRef.current = remaining;
        pinchDistRef.current = null;
      }
    },
    [onClearFocus],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;

      onViewportChange((prev) => {
        const next = applyZoom(prev, screenRef.current, factor, e.clientX, e.clientY);

        // Exit map if zoomed out past threshold
        if (next.zoom <= EXIT_ZOOM && !atRootRef.current) {
          onExitMap();
          return prev;
        }

        return next;
      });
    },
    [onViewportChange, onExitMap],
  );

  const transform = getWorldTransform(viewport, screenSize);

  return (
    <div
      className={`space-viewport ${panning ? 'space-viewport--panning' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        className="space-world"
        style={{
          transform,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function distance(a: PointerInfo, b: PointerInfo): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(a: PointerInfo, b: PointerInfo): PointerInfo {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
