/**
 * Adaptive visor diagnostics flag resolver.
 *
 * Adaptive rendering is now always enabled. This resolver remains for
 * optional trace logging during policy debugging.
 */

export function isAdaptiveVisorDecisionTraceEnabled(): boolean {
  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get('adaptiveVisorTrace');
  if (queryValue === '1' || queryValue === 'true') return true;

  const envValue = import.meta.env.VITE_ADAPTIVE_VISOR_TRACE;
  return envValue === '1' || envValue === 'true';
}
