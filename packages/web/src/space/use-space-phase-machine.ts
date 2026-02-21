/**
 * useSpacePhaseMachine — transition policy for map/interior movement.
 *
 * Encapsulates Space's phase state machine and interior fade choreography
 * so Space rendering can stay focused on composition and viewport wiring.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpatialMapEntry } from './use-spatial-map.js';
import type { ViewportState } from './viewport-math.js';
import { frameOrganism, frameOrganismEnter } from './viewport-math.js';

export type SpacePhase = 'map' | 'entering' | 'inside' | 'exiting';

interface UseSpacePhaseMachineOptions {
  entries: SpatialMapEntry[];
  enteredOrganismId: string | null;
  focusOrganism: (organismId: string | null) => void;
  enterOrganism: (organismId: string) => void;
  exitOrganism: () => void;
  animateTo: (target: ViewportState, options?: { duration?: number; onComplete?: () => void }) => void;
  setViewport: (viewport: ViewportState) => void;
}

interface UseSpacePhaseMachineResult {
  phase: SpacePhase;
  interiorOpacity: number;
  interiorOrganismId: string | null;
  handleFocusOrganism: (organismId: string, wx: number, wy: number) => void;
  handleEnterOrganism: (organismId: string, wx: number, wy: number) => void;
  handleExitOrganism: () => void;
}

export function useSpacePhaseMachine({
  entries,
  enteredOrganismId,
  focusOrganism,
  enterOrganism,
  exitOrganism,
  animateTo,
  setViewport,
}: UseSpacePhaseMachineOptions): UseSpacePhaseMachineResult {
  const [phase, setPhase] = useState<SpacePhase>('map');
  const [interiorOpacity, setInteriorOpacity] = useState(0);
  const [interiorOrganismId, setInteriorOrganismId] = useState<string | null>(null);
  const fadeRef = useRef<number | null>(null);

  const cancelFade = useCallback(() => {
    if (fadeRef.current !== null) {
      cancelAnimationFrame(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  useEffect(() => cancelFade, [cancelFade]);

  const handleFocusOrganism = useCallback(
    (organismId: string, wx: number, wy: number) => {
      if (phase !== 'map') return;
      focusOrganism(organismId);
      animateTo(frameOrganism(wx, wy));
    },
    [phase, focusOrganism, animateTo],
  );

  const handleEnterOrganism = useCallback(
    (organismId: string, wx: number, wy: number) => {
      if (phase !== 'map') return;

      setPhase('entering');
      setInteriorOrganismId(organismId);
      setInteriorOpacity(0);
      enterOrganism(organismId);

      const duration = 700;
      animateTo(frameOrganismEnter(wx, wy), {
        duration,
        onComplete: () => setPhase('inside'),
      });

      cancelFade();
      const startTime = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        setInteriorOpacity(t * t);
        if (t < 1) {
          fadeRef.current = requestAnimationFrame(tick);
        } else {
          fadeRef.current = null;
        }
      };
      fadeRef.current = requestAnimationFrame(tick);
    },
    [phase, enterOrganism, animateTo, cancelFade],
  );

  const handleExitOrganism = useCallback(() => {
    if (phase !== 'inside') return;

    setPhase('exiting');
    const entry = entries.find((candidate) => candidate.organismId === interiorOrganismId);
    if (entry) {
      setViewport(frameOrganism(entry.x, entry.y));
    }

    cancelFade();
    const duration = 500;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setInteriorOpacity(1 - eased);
      if (t < 1) {
        fadeRef.current = requestAnimationFrame(tick);
      } else {
        fadeRef.current = null;
        setPhase('map');
        setInteriorOrganismId(null);
        exitOrganism();
      }
    };
    fadeRef.current = requestAnimationFrame(tick);
  }, [phase, entries, interiorOrganismId, setViewport, exitOrganism, cancelFade]);

  useEffect(() => {
    if (!enteredOrganismId && phase === 'inside') {
      handleExitOrganism();
    }
  }, [enteredOrganismId, phase, handleExitOrganism]);

  return {
    phase,
    interiorOpacity,
    interiorOrganismId,
    handleFocusOrganism,
    handleEnterOrganism,
    handleExitOrganism,
  };
}
