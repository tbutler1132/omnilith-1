/**
 * Adaptive visor feature flag resolver.
 *
 * Enables local rollout via URL query (`adaptiveVisorCompositor=1`)
 * and build-time environment flag (`VITE_ADAPTIVE_VISOR_COMPOSITOR=1`).
 */

export function isAdaptiveVisorCompositorEnabled(): boolean {
  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get('adaptiveVisorCompositor') ?? params.get('adaptiveVisor');
  if (queryValue === '1' || queryValue === 'true') return true;

  const envValue = import.meta.env.VITE_ADAPTIVE_VISOR_COMPOSITOR;
  return envValue === '1' || envValue === 'true';
}

export function isAdaptiveVisorDecisionTraceEnabled(): boolean {
  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get('adaptiveVisorTrace');
  if (queryValue === '1' || queryValue === 'true') return true;

  const envValue = import.meta.env.VITE_ADAPTIVE_VISOR_TRACE;
  return envValue === '1' || envValue === 'true';
}
