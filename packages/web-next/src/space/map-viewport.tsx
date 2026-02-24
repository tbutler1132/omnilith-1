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
  readonly onPointerWorldMove?: (point: { x: number; y: number } | null) => void;
  readonly children: ReactNode;
}

interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

function toWorldPoint(
  input: { clientX: number; clientY: number },
  viewportElement: HTMLDivElement,
  viewport: ViewportState,
  screenSize: ScreenSize,
): { x: number; y: number } {
  const rect = viewportElement.getBoundingClientRect();
  const screenX = input.clientX - rect.left;
  const screenY = input.clientY - rect.top;
  const tx = screenSize.width / 2 - viewport.x * viewport.zoom;
  const ty = screenSize.height / 2 - viewport.y * viewport.zoom;
  return {
    x: (screenX - tx) / viewport.zoom,
    y: (screenY - ty) / viewport.zoom,
  };
}

export function MapViewport({
  viewport,
  screenSize,
  onViewportChange,
  onPointerWorldMove,
  children,
}: MapViewportProps) {
  const [isDragging, setIsDragging] = useState(false);

  const activePointerIdRef = useRef<number | null>(null);
  const previousPointerRef = useRef<PointerPosition | null>(null);
  const dragViewportRef = useRef<ViewportState | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (activePointerIdRef.current !== null) return;

      activePointerIdRef.current = event.pointerId;
      previousPointerRef.current = { x: event.clientX, y: event.clientY };
      dragViewportRef.current = viewport;
      setIsDragging(true);

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [viewport],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId || !previousPointerRef.current) {
        onPointerWorldMove?.(toWorldPoint(event, event.currentTarget, viewport, screenSize));
        return;
      }

      const dx = event.clientX - previousPointerRef.current.x;
      const dy = event.clientY - previousPointerRef.current.y;

      previousPointerRef.current = { x: event.clientX, y: event.clientY };

      const dragViewport = dragViewportRef.current ?? viewport;
      const nextViewport = applyPan(dragViewport, dx, dy);
      dragViewportRef.current = nextViewport;

      onPointerWorldMove?.(toWorldPoint(event, event.currentTarget, nextViewport, screenSize));
      onViewportChange((previous) => applyPan(previous, dx, dy));
    },
    [onPointerWorldMove, onViewportChange, screenSize, viewport],
  );

  const releasePointer = useCallback((pointerId: number) => {
    if (activePointerIdRef.current !== pointerId) return;

    activePointerIdRef.current = null;
    previousPointerRef.current = null;
    dragViewportRef.current = null;
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
      onPointerLeave={() => onPointerWorldMove?.(null)}
    >
      <div className="map-world" style={{ transform, transformOrigin: '0 0' }}>
        {children}
      </div>
    </div>
  );
}
