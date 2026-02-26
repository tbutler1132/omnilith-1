/**
 * Spatial nav widget.
 *
 * Shows current spatial organism context and provides a single "up" action
 * to return to the immediate parent boundary, with location label
 * scramble-reveal transitions between boundaries.
 */

import { useEffect, useRef } from 'react';

interface ScrambleTween {
  readonly kill?: () => void;
}

interface GsapRuntime {
  readonly registerPlugin: (...plugins: ReadonlyArray<unknown>) => void;
  readonly to: (target: Element, vars: Readonly<Record<string, unknown>>) => ScrambleTween;
}

let gsapRuntimePromise: Promise<GsapRuntime> | null = null;

async function loadGsapRuntime(): Promise<GsapRuntime> {
  if (gsapRuntimePromise) {
    return gsapRuntimePromise;
  }

  gsapRuntimePromise = Promise.all([import('gsap'), import('gsap/ScrambleTextPlugin')]).then(
    ([gsapModule, scramblePluginModule]) => {
      const gsapRuntime =
        (gsapModule as { readonly gsap?: GsapRuntime }).gsap ?? (gsapModule as unknown as GsapRuntime);
      const scramblePlugin =
        (scramblePluginModule as { readonly ScrambleTextPlugin?: unknown }).ScrambleTextPlugin ??
        (scramblePluginModule as { readonly default?: unknown }).default ??
        scramblePluginModule;
      gsapRuntime.registerPlugin(scramblePlugin);
      return gsapRuntime;
    },
  );

  return gsapRuntimePromise;
}

interface SpatialNavWidgetProps {
  readonly currentLabel: string;
  readonly upTargetLabel: string | null;
  readonly onGoUp: () => void;
  readonly showUpControl: boolean;
  readonly canGoUp: boolean;
}

const WORLD_MAP_LABEL = 'World Map';

export function SpatialNavWidget({
  currentLabel,
  upTargetLabel,
  onGoUp,
  showUpControl,
  canGoUp,
}: SpatialNavWidgetProps) {
  const upButtonAriaLabel = upTargetLabel && upTargetLabel.length > 0 ? `Go up to ${upTargetLabel}` : 'Go up one level';
  const glyphOverlay = currentLabel.length > 12 ? '零界層格点回路' : '零界層格点';
  const upButtonClassName = `space-nav-back-btn ${showUpControl ? '' : 'space-nav-back-btn--hidden'}`.trim();
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const previousLabelRef = useRef<string | null>(null);

  useEffect(() => {
    const labelElement = labelRef.current;
    if (!labelElement) {
      return;
    }

    const previousLabel = previousLabelRef.current;
    const isInitialRender = previousLabel === null;
    const shouldAnimateInitialWorldMap = isInitialRender && currentLabel === WORLD_MAP_LABEL;
    const shouldAnimateLabelChange = previousLabel !== null && previousLabel !== currentLabel;
    previousLabelRef.current = currentLabel;

    if (!shouldAnimateInitialWorldMap && !shouldAnimateLabelChange) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let cancelled = false;
    let tween: ScrambleTween | null = null;

    void loadGsapRuntime()
      .then((gsapRuntime) => {
        if (cancelled) {
          return;
        }

        tween = gsapRuntime.to(labelElement, {
          duration: 0.95,
          ease: 'none',
          scrambleText: {
            text: currentLabel,
            chars: 'upperCase',
            speed: 0.42,
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          labelElement.textContent = currentLabel;
        }
      });

    return () => {
      cancelled = true;
      tween?.kill?.();
    };
  }, [currentLabel]);

  return (
    <nav className="space-nav-content" aria-label="Spatial navigation">
      <button
        type="button"
        className={upButtonClassName}
        onClick={onGoUp}
        aria-label={upButtonAriaLabel}
        aria-hidden={!showUpControl}
        tabIndex={showUpControl ? undefined : -1}
        disabled={!canGoUp || !showUpControl}
      >
        &uarr;
      </button>
      <div className="space-nav-altitude">
        <span className="space-nav-label-stack" data-glyph-overlay={glyphOverlay}>
          <span ref={labelRef} className="space-nav-label space-nav-altitude-label">
            {currentLabel}
          </span>
        </span>
      </div>
    </nav>
  );
}
