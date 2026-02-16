/**
 * Panel schema — unified adaptive panel contract for map and visor contexts.
 *
 * Defines panel identity, eligibility, role support, and priority hints.
 * The adaptive layout policy consumes this schema to assign main,
 * secondary, and collapsed roles deterministically.
 */

export type HudContextClass = 'map' | 'interior' | 'visor-organism';
export type MapHudPanelId = 'threshold' | 'mine' | 'templates' | 'template-values';
export type InteriorHudPanelId = 'interior-actions';
export type VisorHudPanelId = 'organism' | 'vitality' | 'composition' | 'proposals' | 'history' | 'governance';
export type HudPanelId = MapHudPanelId | InteriorHudPanelId | VisorHudPanelId;
export type HudPanelRole = 'main' | 'secondary' | 'collapsed';

export interface HudPanelContext {
  contextClass: HudContextClass;
  surfaced: boolean;
  openTrunk: boolean;
  templateValuesReady: boolean;
  canWrite: boolean;
}

export interface HudPanelRoleSupport {
  main: boolean;
  secondary: boolean;
  collapsed: boolean;
}

export interface HudPanelDefinition {
  id: HudPanelId;
  label: string;
  availableIn: (context: HudPanelContext) => boolean;
  roleSupport: HudPanelRoleSupport;
  defaultMainPriority: number;
  defaultSecondaryPriority: number;
  collapsedPriority: number;
}

export interface HudPanelRegistryEntry extends HudPanelDefinition {}

export const HUD_PANEL_REGISTRY: HudPanelRegistryEntry[] = [
  {
    id: 'templates',
    label: 'Templates',
    availableIn: (context) => context.contextClass === 'map' && context.canWrite,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 88,
    defaultSecondaryPriority: 86,
    collapsedPriority: 82,
  },
  {
    id: 'threshold',
    label: 'Threshold',
    availableIn: (context) => context.contextClass === 'map' && context.canWrite,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 86,
    defaultSecondaryPriority: 84,
    collapsedPriority: 81,
  },
  {
    id: 'mine',
    label: 'My organisms',
    availableIn: (context) => context.contextClass === 'map' && context.canWrite,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 84,
    defaultSecondaryPriority: 83,
    collapsedPriority: 80,
  },
  {
    id: 'template-values',
    label: 'Template values',
    availableIn: (context) => context.contextClass === 'map' && context.templateValuesReady && context.canWrite,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 95,
    defaultSecondaryPriority: 90,
    collapsedPriority: 89,
  },
  {
    id: 'interior-actions',
    label: 'Tend current',
    availableIn: (context) => context.contextClass === 'interior',
    roleSupport: { main: false, secondary: false, collapsed: true },
    defaultMainPriority: 0,
    defaultSecondaryPriority: 0,
    collapsedPriority: 100,
  },
  {
    id: 'organism',
    label: 'Tend',
    availableIn: (context) => context.contextClass === 'visor-organism',
    roleSupport: { main: true, secondary: false, collapsed: true },
    defaultMainPriority: 99,
    defaultSecondaryPriority: 0,
    collapsedPriority: 95,
  },
  {
    id: 'composition',
    label: 'Composition',
    availableIn: (context) => context.contextClass === 'visor-organism',
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 90,
    defaultSecondaryPriority: 85,
    collapsedPriority: 90,
  },
  {
    id: 'vitality',
    label: 'Vitality',
    availableIn: (context) => context.contextClass === 'visor-organism',
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 86,
    defaultSecondaryPriority: 88,
    collapsedPriority: 88,
  },
  {
    id: 'proposals',
    label: 'Proposals',
    availableIn: (context) => context.contextClass === 'visor-organism' && !context.openTrunk,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 84,
    defaultSecondaryPriority: 84,
    collapsedPriority: 87,
  },
  {
    id: 'history',
    label: 'State history',
    availableIn: (context) => context.contextClass === 'visor-organism',
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 74,
    defaultSecondaryPriority: 78,
    collapsedPriority: 78,
  },
  {
    id: 'governance',
    label: 'Governance',
    availableIn: (context) => context.contextClass === 'visor-organism',
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 72,
    defaultSecondaryPriority: 76,
    collapsedPriority: 79,
  },
];

export function getHudPanelDefinition(panelId: HudPanelId): HudPanelDefinition {
  const definition = HUD_PANEL_REGISTRY.find((panel) => panel.id === panelId);
  if (!definition) {
    throw new Error(`Missing panel definition for ${panelId}`);
  }
  return definition;
}

export function getVisorPanelDefinition(panelId: HudPanelId): HudPanelDefinition {
  return getHudPanelDefinition(panelId);
}
