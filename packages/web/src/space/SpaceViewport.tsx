/**
 * SpaceViewport — CSS transform container with pan and altitude event handling.
 *
 * Handles single-pointer pan, two-finger pinch (pan + accumulated altitude change),
 * scroll wheel (accumulated altitude change), and keyboard shortcuts (+/-).
 * Applies CSS transforms for GPU-accelerated rendering.
 */

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { applyPan, getWorldTransform, type ScreenSize, type ViewportState } from './viewport-math.js';

interface SpaceViewportProps {
  viewport: ViewportState;
  screenSize: ScreenSize;
  onViewportChange: (v: ViewportState | ((prev: ViewportState) => ViewportState)) => void;
  onAltitudeChange: (direction: 'in' | 'out') => void;
  /** Called when user clicks empty space (not an organism, no drag) */
  onClearFocus?: () => void;
  /** When true, disables all pointer interactions (pan, scroll, click) */
  disabled?: boolean;
  children: ReactNode;
}

interface PointerInfo {
  x: number;
  y: number;
}

/** Accumulated scroll deltaY threshold to trigger one altitude change */
const WHEEL_THRESHOLD = 100;

/** Pinch scale ratio thresholds to trigger one altitude change */
const PINCH_IN_THRESHOLD = 1.3;
const PINCH_OUT_THRESHOLD = 0.7;

/** Minimum pointer movement (px) to consider a gesture a drag, not a click */
const DRAG_THRESHOLD = 3;

export function SpaceViewport({
  viewport,
  screenSize,
  onViewportChange,
  onAltitudeChange,
  onClearFocus,
  disabled = false,
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

  // Scroll wheel accumulator
  const wheelAccRef = useRef(0);

  // Pinch scale accumulator
  const pinchScaleRef = useRef(1);

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
      pinchScaleRef.current = 1;
      setPanning(true);
    } else if (pointersRef.current.size === 2) {
      // Switch to pinch mode
      const [p1, p2] = Array.from(pointersRef.current.values());
      pinchDistRef.current = distance(p1, p2);
      pinchScaleRef.current = 1;
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
        // Pinch: pan from midpoint movement, accumulate scale for altitude
        const [p1, p2] = Array.from(pointersRef.current.values());
        const newDist = distance(p1, p2);
        const mid = midpoint(p1, p2);

        // Pan from midpoint movement
        const dx = mid.x - lastPanRef.current.x;
        const dy = mid.y - lastPanRef.current.y;

        // Accumulate scale ratio
        const factor = newDist / pinchDistRef.current;
        pinchScaleRef.current *= factor;

        pinchDistRef.current = newDist;
        lastPanRef.current = mid;

        // Apply pan
        onViewportChange((prev) => applyPan(prev, dx, dy));

        // Check if accumulated scale crossed an altitude threshold
        if (pinchScaleRef.current >= PINCH_IN_THRESHOLD) {
          onAltitudeChange('in');
          pinchScaleRef.current = 1;
        } else if (pinchScaleRef.current <= PINCH_OUT_THRESHOLD) {
          onAltitudeChange('out');
          pinchScaleRef.current = 1;
        }
      }
    },
    [onViewportChange, onAltitudeChange],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // If this pointer was never tracked (e.g., pointerdown was on an organism), ignore it
      if (!pointersRef.current.has(e.pointerId)) return;

      pointersRef.current.delete(e.pointerId);

      if (pointersRef.current.size === 0) {
        // All pointers released
        lastPanRef.current = null;
        pinchDistRef.current = null;
        pinchScaleRef.current = 1;
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
        pinchScaleRef.current = 1;
      }
    },
    [onClearFocus],
  );

  // Attach wheel listener imperatively with { passive: false } so
  // preventDefault() works (React's onWheel is passive by default).
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      wheelAccRef.current += e.deltaY;

      if (wheelAccRef.current >= WHEEL_THRESHOLD) {
        onAltitudeChange('out');
        wheelAccRef.current = 0;
      } else if (wheelAccRef.current <= -WHEEL_THRESHOLD) {
        onAltitudeChange('in');
        wheelAccRef.current = 0;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [disabled, onAltitudeChange]);

  // Keyboard shortcuts for altitude change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        onAltitudeChange('in');
      } else if (e.key === '-' || e.key === '_') {
        onAltitudeChange('out');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAltitudeChange]);

  const transform = getWorldTransform(viewport, screenSize);

  return (
    <div
      ref={containerRef}
      className={`space-viewport ${panning ? 'space-viewport--panning' : ''}`}
      style={disabled ? { pointerEvents: 'none' } : undefined}
      onPointerDown={disabled ? undefined : handlePointerDown}
      onPointerMove={disabled ? undefined : handlePointerMove}
      onPointerUp={disabled ? undefined : handlePointerUp}
      onPointerCancel={disabled ? undefined : handlePointerUp}
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
