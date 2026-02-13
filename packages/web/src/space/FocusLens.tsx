/**
 * FocusLens — immersive overlay that crossfades in as the viewport zooms.
 *
 * Renders a full-screen overlay with the focused organism's content-type
 * renderer at large scale. Opacity is a pure function of viewport zoom,
 * creating a seamless transition from spatial overview to immersive view.
 * The entire lens is pointer-events: none so scroll/click passes through
 * to the viewport underneath.
 */

import { useEffect, useRef, useState } from 'react';
import { useOrganism } from '../hooks/use-organism.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';
import { lensOpacity, type ViewportState } from './viewport-math.js';

interface FocusLensProps {
  focusedOrganismId: string | null;
  viewport: ViewportState;
}

/** Delay before unmounting after opacity hits 0, to avoid fetch churn */
const UNMOUNT_DELAY = 200;

export function FocusLens({ focusedOrganismId, viewport }: FocusLensProps) {
  const opacity = focusedOrganismId ? lensOpacity(viewport.zoom) : 0;

  // Delayed unmount: keep rendering briefly after opacity drops to 0
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (opacity > 0 && focusedOrganismId) {
      // Cancel any pending unmount and mount immediately
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setMounted(true);
    } else {
      // Delay unmount
      timerRef.current = setTimeout(() => setMounted(false), UNMOUNT_DELAY);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [opacity, focusedOrganismId]);

  if (!mounted || !focusedOrganismId) return null;

  return <FocusLensInner key={focusedOrganismId} organismId={focusedOrganismId} opacity={opacity} />;
}

interface FocusLensInnerProps {
  organismId: string;
  opacity: number;
}

function FocusLensInner({ organismId, opacity }: FocusLensInnerProps) {
  const { data, loading, error } = useOrganism(organismId);

  const Renderer = data?.currentState ? (getRenderer(data.currentState.contentTypeId) ?? FallbackRenderer) : null;

  return (
    <div className="focus-lens" style={{ opacity }}>
      <div className="focus-lens-backdrop" />
      <div className="focus-lens-card">
        {loading && <p className="loading">Loading...</p>}
        {error && <p className="error">Failed to load organism.</p>}
        {Renderer && data?.currentState && <Renderer state={data.currentState} zoom={1} focused />}
      </div>
    </div>
  );
}
