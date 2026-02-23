/**
 * Drag-enabled map viewport.
 *
 * Applies world transforms and translates pointer movement into map pan.
 * Interaction remains intentionally minimal: drag only.
 */

import { type ReactNode, useCallback, useRef, useState } from 'react';
import { applyPan, getWorldTransform, type ScreenSize, type ViewportState } from './viewport-math.js';

interface MapViewportProps {
  readonly viewport: ViewportState;
  readonly screenSize: ScreenSize;
  readonly onViewportChange: (next: ViewportState | ((previous: ViewportState) => ViewportState)) => void;
  readonly children: ReactNode;
}

interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

export function MapViewport({ viewport, screenSize, onViewportChange, children }: MapViewportProps) {
  const [isDragging, setIsDragging] = useState(false);

  const activePointerIdRef = useRef<number | null>(null);
  const previousPointerRef = useRef<PointerPosition | null>(null);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (activePointerIdRef.current !== null) return;

    activePointerIdRef.current = event.pointerId;
    previousPointerRef.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);

    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId || !previousPointerRef.current) {
        return;
      }

      const dx = event.clientX - previousPointerRef.current.x;
      const dy = event.clientY - previousPointerRef.current.y;

      previousPointerRef.current = { x: event.clientX, y: event.clientY };

      onViewportChange((previous) => applyPan(previous, dx, dy));
    },
    [onViewportChange],
  );

  const releasePointer = useCallback((pointerId: number) => {
    if (activePointerIdRef.current !== pointerId) return;

    activePointerIdRef.current = null;
    previousPointerRef.current = null;
    setIsDragging(false);
  }, []);

  const transform = getWorldTransform(viewport, screenSize);

  return (
    <div
      className={`map-viewport ${isDragging ? 'map-viewport--dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => releasePointer(event.pointerId)}
      onPointerCancel={(event) => releasePointer(event.pointerId)}
    >
      <div className="map-world" style={{ transform, transformOrigin: '0 0' }}>
        {children}
      </div>
    </div>
  );
}
