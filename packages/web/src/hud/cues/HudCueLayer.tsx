/**
 * HudCueLayer — renders context-aware cue popups for the HUD.
 *
 * The initial implementation shows an adaptive-help cue once per browser
 * session.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { computeCuePlacement } from './cue-placement.js';
import { resolveActiveHudCues } from './cue-policy.js';
import { HUD_CUE_REGISTRY, type HudCueId } from './cue-schema.js';

const SESSION_SEEN_KEY = 'omnilith.hud.cues.v1.seen';

interface CueDebugOptions {
  forceShow: boolean;
  resetSessionSeen: boolean;
}

function readCueDebugOptions(): CueDebugOptions {
  const params = new URLSearchParams(window.location.search);
  const forceShowValue = params.get('adaptiveCue');
  const resetValue = params.get('adaptiveCueReset');
  return {
    forceShow: forceShowValue === '1' || forceShowValue === 'true',
    resetSessionSeen: resetValue === '1' || resetValue === 'true',
  };
}

function readSeenCueIdsFromSession(): HudCueId[] {
  try {
    const raw = window.sessionStorage.getItem(SESSION_SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is HudCueId => value === 'adaptive-help');
  } catch {
    return [];
  }
}

function writeSeenCueIdsToSession(ids: HudCueId[]) {
  try {
    window.sessionStorage.setItem(SESSION_SEEN_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage failures in private mode and proceed without persistence.
  }
}

interface CueBubbleProps {
  cueId: HudCueId;
  anchorId: string;
  title: string;
  message: string;
  onDismiss: () => void;
}

function CueBubble({ cueId, anchorId, title, message, onDismiss }: CueBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number; side: 'top' | 'bottom' } | null>(null);

  useEffect(() => {
    function updatePosition() {
      const anchor = document.querySelector<HTMLElement>(`[data-cue-anchor="${anchorId}"]`);
      const bubble = bubbleRef.current;
      if (!anchor || !bubble) {
        setPlacement(null);
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const placementResult = computeCuePlacement(
        anchorRect,
        {
          width: bubble.offsetWidth,
          height: bubble.offsetHeight,
        },
        {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      );

      setPlacement({
        left: placementResult.left,
        top: placementResult.top,
        side: placementResult.placement,
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorId]);

  return (
    <div
      ref={bubbleRef}
      className={`hud-cue ${placement ? `hud-cue--${placement.side}` : 'hud-cue--hidden'}`}
      style={placement ? { left: placement.left, top: placement.top } : { left: -9999, top: -9999 }}
      data-cue-id={cueId}
    >
      <div className="hud-cue-title">{title}</div>
      <p className="hud-cue-message">{message}</p>
      <button type="button" className="hud-cue-dismiss" onClick={onDismiss}>
        Got it
      </button>
    </div>
  );
}

export function HudCueLayer() {
  const [dismissedCueIds, setDismissedCueIds] = useState<HudCueId[]>([]);
  const [sessionVisibleCueIds, setSessionVisibleCueIds] = useState<HudCueId[]>([]);
  const debugOptions = useMemo(() => readCueDebugOptions(), []);

  useEffect(() => {
    if (debugOptions.resetSessionSeen) {
      try {
        window.sessionStorage.removeItem(SESSION_SEEN_KEY);
      } catch {
        // Ignore storage errors.
      }
    }

    const seenCueIds = debugOptions.forceShow ? [] : readSeenCueIdsFromSession();
    const eligibleCueIds = resolveActiveHudCues({ adaptiveEnabled: true, seenCueIds }).map((cue) => cue.id);
    setSessionVisibleCueIds(eligibleCueIds);

    if (!debugOptions.forceShow && eligibleCueIds.length > 0) {
      const nextSeenCueIds = Array.from(new Set([...seenCueIds, ...eligibleCueIds]));
      writeSeenCueIdsToSession(nextSeenCueIds);
    }
  }, [debugOptions.forceShow, debugOptions.resetSessionSeen]);

  const cues = useMemo(
    () =>
      HUD_CUE_REGISTRY.filter((cue) => sessionVisibleCueIds.includes(cue.id) && !dismissedCueIds.includes(cue.id)).sort(
        (a, b) => b.priority - a.priority,
      ),
    [sessionVisibleCueIds, dismissedCueIds],
  );

  return (
    <div className="hud-cue-layer">
      {cues.map((cue) => (
        <CueBubble
          key={cue.id}
          cueId={cue.id}
          anchorId={cue.target.anchorId}
          title={cue.title}
          message={cue.message}
          onDismiss={() => setDismissedCueIds((cur) => (cur.includes(cue.id) ? cur : [...cur, cue.id]))}
        />
      ))}
    </div>
  );
}
