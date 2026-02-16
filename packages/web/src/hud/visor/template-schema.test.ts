import { describe, expect, it } from 'vitest';
import { resolveVisorTemplate, VISOR_TEMPLATE_REGISTRY } from './template-schema.js';

describe('resolveVisorTemplate', () => {
  it('returns the map template with an empty main slot and viewport collapsed rail', () => {
    const template = resolveVisorTemplate('map');

    expect(template.id).toBe('map-core');
    expect(template.panelSlots.main.allowEmpty).toBe(true);
    expect(template.panelSlots.collapsed.placement).toBe('viewport-bottom-left');
    expect(template.widgetSlots.allowedWidgets).toEqual(['map-actions']);
  });

  it('returns the organism template with non-empty main and collapsed rail capacity', () => {
    const template = resolveVisorTemplate('visor-organism');

    expect(template.id).toBe('organism-core');
    expect(template.panelSlots.main.allowEmpty).toBe(false);
    expect(template.panelSlots.secondary.maxPanels).toBe(0);
    expect(template.panelSlots.collapsed.maxPanels).toBeNull();
  });

  it('registers a template for each adaptive context class', () => {
    const contexts = new Set(VISOR_TEMPLATE_REGISTRY.map((entry) => entry.contextClass));

    expect(contexts.has('map')).toBe(true);
    expect(contexts.has('visor-organism')).toBe(true);
    expect(contexts.has('interior')).toBe(true);
  });
});
