/**
 * Widget schema — shared adaptive widget identity and purpose registry.
 *
 * Defines the complete set of visor widget IDs so template slots and
 * orchestration policies can reference one stable vocabulary.
 */

export const VISOR_WIDGET_IDS = ['map-actions', 'history-navigation', 'compass', 'vitality'] as const;
export type VisorWidgetId = (typeof VISOR_WIDGET_IDS)[number];

export interface VisorWidgetDefinition {
  id: VisorWidgetId;
  label: string;
  purpose: string;
}

export const VISOR_WIDGET_REGISTRY: VisorWidgetDefinition[] = [
  {
    id: 'map-actions',
    label: 'Map actions',
    purpose: 'Contextual map action affordances.',
  },
  {
    id: 'history-navigation',
    label: 'History navigation',
    purpose: 'Back/forward navigation across promoted main panels.',
  },
  {
    id: 'compass',
    label: 'Compass',
    purpose: 'Spatial orientation indicator in map context.',
  },
  {
    id: 'vitality',
    label: 'Vitality',
    purpose: 'Ambient organism vitality signal while tending.',
  },
];

export function getVisorWidgetDefinition(widgetId: VisorWidgetId): VisorWidgetDefinition {
  const definition = VISOR_WIDGET_REGISTRY.find((entry) => entry.id === widgetId);
  if (!definition) {
    throw new Error(`Missing widget definition for ${widgetId}`);
  }
  return definition;
}
