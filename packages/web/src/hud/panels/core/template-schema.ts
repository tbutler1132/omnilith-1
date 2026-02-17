/**
 * Visor template schema — defines adaptive slot topology by context.
 *
 * Templates describe how the visor arranges panel roles (main, secondary,
 * collapsed), where widgets are allowed, and which anchor spaces are
 * permanently reserved. The layout policy consumes template slot values.
 */

import type { HudContextClass } from './panel-schema.js';

export type VisorTemplateId = 'map-core' | 'organism-core' | 'interior-core';
export type VisorCollapsedRailPlacement = 'inline' | 'viewport-bottom-left';
export type VisorMainSlotPresentation = 'inline' | 'centered-overlay';
export type VisorReservedAnchor = 'hud-bar' | 'compass' | 'logout' | 'altitude-controls' | 'policy-badge';
export type VisorWidgetId = 'map-actions' | 'history-navigation' | 'compass' | 'vitality';

export interface VisorTemplatePanelSlots {
  main: {
    enabled: boolean;
    allowEmpty: boolean;
    presentation: VisorMainSlotPresentation;
  };
  secondary: {
    enabled: boolean;
    maxPanels: number;
  };
  collapsed: {
    enabled: boolean;
    maxPanels: number | null;
    placement: VisorCollapsedRailPlacement;
  };
}

export interface VisorTemplateWidgetSlots {
  allowedWidgets: VisorWidgetId[];
}

export interface VisorTemplateCueSlots {
  enabled: boolean;
  lane: 'global-overlay';
}

export interface VisorTemplateDefinition {
  id: VisorTemplateId;
  contextClass: HudContextClass;
  label: string;
  panelSlots: VisorTemplatePanelSlots;
  widgetSlots: VisorTemplateWidgetSlots;
  cueSlots: VisorTemplateCueSlots;
  reservedAnchors: VisorReservedAnchor[];
}

const SHARED_RESERVED_ANCHORS: VisorReservedAnchor[] = [
  'hud-bar',
  'compass',
  'logout',
  'altitude-controls',
  'policy-badge',
];

export const VISOR_TEMPLATE_REGISTRY: VisorTemplateDefinition[] = [
  {
    id: 'map-core',
    contextClass: 'map',
    label: 'Map Adaptive Template',
    panelSlots: {
      main: {
        enabled: true,
        allowEmpty: true,
        presentation: 'centered-overlay',
      },
      secondary: {
        enabled: true,
        maxPanels: 0,
      },
      collapsed: {
        enabled: true,
        maxPanels: null,
        placement: 'viewport-bottom-left',
      },
    },
    widgetSlots: {
      allowedWidgets: ['map-actions', 'history-navigation', 'compass'],
    },
    cueSlots: {
      enabled: true,
      lane: 'global-overlay',
    },
    reservedAnchors: SHARED_RESERVED_ANCHORS,
  },
  {
    id: 'organism-core',
    contextClass: 'visor-organism',
    label: 'Organism Adaptive Template',
    panelSlots: {
      main: {
        enabled: true,
        allowEmpty: true,
        presentation: 'centered-overlay',
      },
      secondary: {
        enabled: true,
        maxPanels: 1,
      },
      collapsed: {
        enabled: true,
        maxPanels: null,
        placement: 'viewport-bottom-left',
      },
    },
    widgetSlots: {
      allowedWidgets: ['history-navigation', 'vitality'],
    },
    cueSlots: {
      enabled: true,
      lane: 'global-overlay',
    },
    reservedAnchors: SHARED_RESERVED_ANCHORS,
  },
  {
    id: 'interior-core',
    contextClass: 'interior',
    label: 'Interior Adaptive Template',
    panelSlots: {
      main: {
        enabled: false,
        allowEmpty: true,
        presentation: 'inline',
      },
      secondary: {
        enabled: false,
        maxPanels: 0,
      },
      collapsed: {
        enabled: true,
        maxPanels: null,
        placement: 'viewport-bottom-left',
      },
    },
    widgetSlots: {
      allowedWidgets: [],
    },
    cueSlots: {
      enabled: true,
      lane: 'global-overlay',
    },
    reservedAnchors: SHARED_RESERVED_ANCHORS,
  },
];

export function resolveVisorTemplate(contextClass: HudContextClass): VisorTemplateDefinition {
  const template = VISOR_TEMPLATE_REGISTRY.find((entry) => entry.contextClass === contextClass);
  if (!template) {
    throw new Error(`No visor template for context ${contextClass}`);
  }
  return template;
}

export function resolvePanelVisorTemplate(
  contextClass: HudContextClass,
): VisorTemplateDefinition & { contextClass: HudContextClass } {
  return resolveVisorTemplate(contextClass) as VisorTemplateDefinition & { contextClass: HudContextClass };
}
