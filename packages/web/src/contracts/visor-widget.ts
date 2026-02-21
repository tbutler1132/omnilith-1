/**
 * Visor widget contract — shared adaptive widget identity vocabulary.
 *
 * Defines the stable widget ID set used by adaptive visor policy,
 * template slots, and rendering registration.
 */

export const VISOR_WIDGET_IDS = ['map-actions', 'history-navigation', 'compass', 'map-legend', 'vitality'] as const;
export type VisorWidgetId = (typeof VISOR_WIDGET_IDS)[number];
