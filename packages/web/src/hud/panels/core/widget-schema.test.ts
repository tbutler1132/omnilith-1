import { describe, expect, it } from 'vitest';
import { VISOR_TEMPLATE_REGISTRY } from './template-schema.js';
import { getVisorWidgetDefinition, VISOR_WIDGET_IDS, VISOR_WIDGET_REGISTRY } from './widget-schema.js';

describe('visor widget schema', () => {
  it('registers one widget definition for each widget ID', () => {
    const idsFromRegistry = VISOR_WIDGET_REGISTRY.map((widget) => widget.id).sort((a, b) => a.localeCompare(b));
    const idsFromSchema = [...VISOR_WIDGET_IDS].sort((a, b) => a.localeCompare(b));

    expect(idsFromRegistry).toEqual(idsFromSchema);
  });

  it('resolves every widget definition by ID', () => {
    VISOR_WIDGET_IDS.forEach((widgetId) => {
      expect(getVisorWidgetDefinition(widgetId).id).toBe(widgetId);
    });
  });

  it('allows only registered widget IDs in template slots', () => {
    const registered = new Set(VISOR_WIDGET_IDS);
    const unregistered = VISOR_TEMPLATE_REGISTRY.flatMap((template) =>
      template.widgetSlots.allowedWidgets.filter((widgetId) => !registered.has(widgetId)),
    );

    expect(unregistered).toEqual([]);
  });

  it('surfaces every registered widget in at least one template', () => {
    const used = new Set(VISOR_TEMPLATE_REGISTRY.flatMap((template) => template.widgetSlots.allowedWidgets));
    const missing = VISOR_WIDGET_IDS.filter((widgetId) => !used.has(widgetId));

    expect(missing).toEqual([]);
  });
});
