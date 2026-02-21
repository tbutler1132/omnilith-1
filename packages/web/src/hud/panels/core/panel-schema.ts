/**
 * Panel schema — unified adaptive panel contract for map and visor contexts.
 *
 * Defines panel identity, eligibility, role support, and priority hints.
 * The adaptive layout policy consumes this schema to assign main,
 * secondary, and collapsed roles deterministically.
 */

export type HudContextClass = 'map' | 'interior' | 'visor-organism';

export const MAP_HUD_PANEL_IDS = ['profile', 'my-proposals'] as const;
export type MapHudPanelId = (typeof MAP_HUD_PANEL_IDS)[number];

export const TOGGLE_MAP_HUD_PANEL_IDS = ['profile', 'my-proposals'] as const;
export type ToggleMapHudPanelId = (typeof TOGGLE_MAP_HUD_PANEL_IDS)[number];

export const INTERIOR_HUD_PANEL_IDS = ['interior-actions'] as const;
export type InteriorHudPanelId = (typeof INTERIOR_HUD_PANEL_IDS)[number];

export const VISOR_HUD_PANEL_IDS = [
  'organism',
  'organism-nav',
  'composition',
  'propose',
  'proposals',
  'append',
  'relationships',
  'contributions',
  'history',
  'governance',
] as const;
export type VisorHudPanelId = (typeof VISOR_HUD_PANEL_IDS)[number];

export const VISOR_MAIN_HUD_PANEL_IDS = [
  'organism',
  'composition',
  'propose',
  'proposals',
  'append',
  'relationships',
  'contributions',
  'history',
  'governance',
] as const;
export type VisorMainHudPanelId = (typeof VISOR_MAIN_HUD_PANEL_IDS)[number];

export const UNIVERSAL_VISOR_HUD_PANEL_IDS = [
  'composition',
  'propose',
  'proposals',
  'append',
  'relationships',
  'contributions',
  'history',
  'governance',
] as const;
export type UniversalVisorHudPanelId = (typeof UNIVERSAL_VISOR_HUD_PANEL_IDS)[number];
export type HudPanelId = MapHudPanelId | InteriorHudPanelId | VisorHudPanelId;
export type HudPanelRole = 'main' | 'secondary' | 'collapsed';

export interface HudPanelContext {
  contextClass: HudContextClass;
  surfaced: boolean;
  openTrunk: boolean;
  templateValuesReady: boolean;
  canWrite: boolean;
  interiorOrigin?: boolean;
  thermalRendererPreview?: boolean;
  rendererPreviewFullBleed?: boolean;
}

export interface HudPanelRoleSupport {
  main: boolean;
  secondary: boolean;
  collapsed: boolean;
}

export interface HudPanelDefinition {
  id: HudPanelId;
  label: string;
  purpose: string;
  availableIn: (context: HudPanelContext) => boolean;
  roleSupport: HudPanelRoleSupport;
  defaultMainPriority: number;
  defaultSecondaryPriority: number;
  collapsedPriority: number;
}

export interface HudPanelRegistryEntry extends HudPanelDefinition {}

export const HUD_PANEL_REGISTRY: HudPanelRegistryEntry[] = [
  {
    id: 'profile',
    label: 'Profile',
    purpose: 'Map-level profile placeholder that will absorb regulation-oriented profile context over time.',
    availableIn: (context) => context.contextClass === 'map',
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 84,
    defaultSecondaryPriority: 84,
    collapsedPriority: 81,
  },
  {
    id: 'my-proposals',
    label: 'Proposals',
    purpose: "Review the current user's authored proposals grouped by status.",
    availableIn: (context) => context.contextClass === 'map',
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 88,
    defaultSecondaryPriority: 87,
    collapsedPriority: 84,
  },
  {
    id: 'interior-actions',
    label: 'Collaborate here',
    purpose: 'Open the currently entered organism in the visor.',
    availableIn: (context) => context.contextClass === 'interior',
    roleSupport: { main: false, secondary: false, collapsed: true },
    defaultMainPriority: 0,
    defaultSecondaryPriority: 0,
    collapsedPriority: 100,
  },
  {
    id: 'organism',
    label: 'Overview',
    purpose: 'Inspect organism overview data and raw state payload while preserving tending actions.',
    availableIn: (context) => context.contextClass === 'visor-organism',
    roleSupport: { main: true, secondary: false, collapsed: true },
    defaultMainPriority: 99,
    defaultSecondaryPriority: 0,
    collapsedPriority: 96,
  },
  {
    id: 'organism-nav',
    label: 'Panel shortcuts',
    purpose: 'Promote organism tending panels through one secondary action surface.',
    availableIn: (context) => context.contextClass === 'visor-organism' && context.interiorOrigin === true,
    roleSupport: { main: false, secondary: true, collapsed: false },
    defaultMainPriority: 0,
    defaultSecondaryPriority: 98,
    collapsedPriority: 0,
  },
  {
    id: 'composition',
    label: 'Composition',
    purpose: 'Compose organisms inside the current boundary.',
    availableIn: (context) => context.contextClass === 'visor-organism',
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 90,
    defaultSecondaryPriority: 85,
    collapsedPriority: 86,
  },
  {
    id: 'propose',
    label: 'Open proposal',
    purpose: 'Offer a regulated state proposal for the organism.',
    availableIn: (context) => context.contextClass === 'visor-organism' && !context.openTrunk,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 88,
    defaultSecondaryPriority: 82,
    collapsedPriority: 85,
  },
  {
    id: 'proposals',
    label: 'Proposals',
    purpose: 'Review open proposals and integrate or decline them.',
    availableIn: (context) => context.contextClass === 'visor-organism' && !context.openTrunk,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 86,
    defaultSecondaryPriority: 84,
    collapsedPriority: 94,
  },
  {
    id: 'append',
    label: 'Append state',
    purpose: 'Append state directly for open-trunk organisms.',
    availableIn: (context) => context.contextClass === 'visor-organism' && context.openTrunk && context.canWrite,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 88,
    defaultSecondaryPriority: 82,
    collapsedPriority: 92,
  },
  {
    id: 'relationships',
    label: 'Relationships',
    purpose: 'Inspect membership, stewardship, and integration authority relationships.',
    availableIn: (context) => context.contextClass === 'visor-organism' && context.interiorOrigin !== true,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 73,
    defaultSecondaryPriority: 77,
    collapsedPriority: 80,
  },
  {
    id: 'contributions',
    label: 'Contributions',
    purpose: 'Inspect credited contributions across states, proposals, and tending actions.',
    availableIn: (context) => context.contextClass === 'visor-organism',
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 75,
    defaultSecondaryPriority: 79,
    collapsedPriority: 82,
  },
  {
    id: 'history',
    label: 'State history',
    purpose: 'Inspect organism state history over time.',
    availableIn: (context) => context.contextClass === 'visor-organism' && context.interiorOrigin !== true,
    roleSupport: { main: true, secondary: true, collapsed: true },
    defaultMainPriority: 74,
    defaultSecondaryPriority: 78,
    collapsedPriority: 78,
  },
  {
    id: 'governance',
    label: 'Governance',
    purpose: 'Inspect policy organisms and regulatory mode.',
    availableIn: (context) => context.contextClass === 'visor-organism' && context.interiorOrigin !== true,
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

export function isMapHudPanelId(panelId: HudPanelId): panelId is MapHudPanelId {
  return MAP_HUD_PANEL_IDS.includes(panelId as MapHudPanelId);
}

export function isToggleMapHudPanelId(panelId: HudPanelId): panelId is ToggleMapHudPanelId {
  return TOGGLE_MAP_HUD_PANEL_IDS.includes(panelId as ToggleMapHudPanelId);
}

export function isInteriorHudPanelId(panelId: HudPanelId): panelId is InteriorHudPanelId {
  return INTERIOR_HUD_PANEL_IDS.includes(panelId as InteriorHudPanelId);
}

export function isVisorHudPanelId(panelId: HudPanelId): panelId is VisorHudPanelId {
  return VISOR_HUD_PANEL_IDS.includes(panelId as VisorHudPanelId);
}

export function isVisorMainHudPanelId(panelId: HudPanelId): panelId is VisorMainHudPanelId {
  return VISOR_MAIN_HUD_PANEL_IDS.includes(panelId as VisorMainHudPanelId);
}

export function isUniversalVisorHudPanelId(panelId: HudPanelId): panelId is UniversalVisorHudPanelId {
  return UNIVERSAL_VISOR_HUD_PANEL_IDS.includes(panelId as UniversalVisorHudPanelId);
}
