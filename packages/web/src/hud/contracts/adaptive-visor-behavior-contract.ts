/**
 * Adaptive visor behavior contract — explicit policy agreement for layout orchestration.
 *
 * Captures the expected adaptive visor state space, event vocabulary, and
 * deterministic layout/compositor outcomes independent from React rendering.
 *
 * Design spikes and implementation tests both reference this contract so
 * behavior iteration stays coherent as presentation evolves.
 */

import type { VisorWidgetId } from '../../contracts/visor-widget.js';
import type {
  AdaptiveVisorMapPanelId,
  AdaptiveVisorPanelId,
  AdaptiveVisorWidgetId,
} from '../../platform/adaptive-visor-compositor.js';
import type { HudCueId, HudCueTargetAnchorId } from '../cues/cue-schema.js';
import type { HudContextClass, HudPanelId } from '../panels/core/panel-schema.js';

export type ContractAltitude = 'high' | 'mid' | 'close';

export interface ContractCompositorContextInput {
  visorOrganismId: string | null;
  enteredOrganismId: string | null;
  focusedOrganismId: string | null;
  altitude: ContractAltitude;
}

export type ContractCompositorEvent =
  | {
      type: 'enter-map';
    }
  | {
      type: 'focus-organism';
      organismId: string | null;
    }
  | {
      type: 'enter-organism';
      organismId: string;
    }
  | {
      type: 'exit-organism';
    }
  | {
      type: 'open-visor-organism';
      organismId: string;
    }
  | {
      type: 'close-visor-organism';
    }
  | {
      type: 'set-altitude';
      altitude: ContractAltitude;
    }
  | {
      type: 'toggle-map-panel';
      panelId: AdaptiveVisorMapPanelId;
    }
  | {
      type: 'mutation';
    };

export interface AdaptiveVisorLayoutScenario {
  id: string;
  contextClass: HudContextClass;
  context: {
    surfaced: boolean;
    openTrunk: boolean;
    templateValuesReady: boolean;
    canWrite: boolean;
    interiorOrigin?: boolean;
    thermalRendererPreview?: boolean;
  };
  preferredMainPanelId: HudPanelId | null;
  expected: {
    availablePanelIds: HudPanelId[];
    mainPanelId: HudPanelId | null;
    secondaryPanelIds: HudPanelId[];
    collapsedPanelIds: HudPanelId[];
  };
}

export interface AdaptiveVisorCompositorScenario {
  id: string;
  initialContext: ContractCompositorContextInput;
  events: ContractCompositorEvent[];
  expected: {
    activePanels: AdaptiveVisorPanelId[];
    activeWidgets: AdaptiveVisorWidgetId[];
    activeMapPanel: AdaptiveVisorMapPanelId | null;
    anchors: Array<'navigation-back' | 'dismiss'>;
    intentStack: string[];
    lastMutationToken: number;
  };
}

export interface AdaptiveVisorContextDerivationScenario {
  id: string;
  input: ContractCompositorContextInput;
  expectedContextClass: HudContextClass;
}

export const ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1 = {
  contractId: 'adaptive-visor-behavior',
  version: '1.0.0',
  contextClasses: ['map', 'interior', 'visor-organism'] as HudContextClass[],
  eventTypes: [
    'enter-map',
    'focus-organism',
    'enter-organism',
    'exit-organism',
    'open-visor-organism',
    'close-visor-organism',
    'set-altitude',
    'toggle-map-panel',
    'mutation',
  ] as ContractCompositorEvent['type'][],
  panelIds: [
    'append',
    'composition',
    'governance',
    'history',
    'interior-actions',
    'my-proposals',
    'organism',
    'organism-nav',
    'regulation',
    'proposals',
    'propose',
    'profile',
    'relationships',
    'contributions',
  ] as HudPanelId[],
  compositorPanelIds: ['interior-actions', 'my-proposals', 'profile', 'visor-view'] as const,
  widgetIds: ['compass', 'history-navigation', 'map-actions', 'map-legend', 'vitality'] as VisorWidgetId[],
  cueIds: ['adaptive-help'] as HudCueId[],
  cueAnchorIds: ['adaptive-policy-badge', 'visor-pill'] as HudCueTargetAnchorId[],
  layoutScenarios: [
    {
      id: 'map-write-default',
      contextClass: 'map',
      context: {
        surfaced: false,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: null,
      expected: {
        availablePanelIds: ['profile', 'my-proposals'],
        mainPanelId: null,
        secondaryPanelIds: [],
        collapsedPanelIds: ['my-proposals', 'profile'],
      },
    },
    {
      id: 'map-preferred-proposals',
      contextClass: 'map',
      context: {
        surfaced: false,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: 'my-proposals',
      expected: {
        availablePanelIds: ['profile', 'my-proposals'],
        mainPanelId: 'my-proposals',
        secondaryPanelIds: [],
        collapsedPanelIds: ['profile'],
      },
    },
    {
      id: 'map-guest-empty',
      contextClass: 'map',
      context: {
        surfaced: false,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: false,
      },
      preferredMainPanelId: null,
      expected: {
        availablePanelIds: ['profile', 'my-proposals'],
        mainPanelId: null,
        secondaryPanelIds: [],
        collapsedPanelIds: ['my-proposals', 'profile'],
      },
    },
    {
      id: 'visor-regulated-initial',
      contextClass: 'visor-organism',
      context: {
        surfaced: true,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: null,
      expected: {
        availablePanelIds: ['organism', 'regulation', 'proposals'],
        mainPanelId: null,
        secondaryPanelIds: [],
        collapsedPanelIds: ['organism'],
      },
    },
    {
      id: 'visor-regulated-organism-open',
      contextClass: 'visor-organism',
      context: {
        surfaced: true,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: 'organism',
      expected: {
        availablePanelIds: ['organism', 'regulation', 'proposals'],
        mainPanelId: 'organism',
        secondaryPanelIds: [],
        collapsedPanelIds: ['proposals', 'regulation'],
      },
    },
    {
      id: 'visor-regulated-interior-origin',
      contextClass: 'visor-organism',
      context: {
        surfaced: true,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
        interiorOrigin: true,
        thermalRendererPreview: true,
      },
      preferredMainPanelId: 'organism',
      expected: {
        availablePanelIds: ['organism', 'regulation', 'proposals'],
        mainPanelId: 'organism',
        secondaryPanelIds: [],
        collapsedPanelIds: ['proposals', 'regulation'],
      },
    },
    {
      id: 'visor-open-trunk-initial',
      contextClass: 'visor-organism',
      context: {
        surfaced: true,
        openTrunk: true,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: null,
      expected: {
        availablePanelIds: ['organism', 'regulation'],
        mainPanelId: null,
        secondaryPanelIds: [],
        collapsedPanelIds: ['organism'],
      },
    },
    {
      id: 'visor-open-trunk-organism-open',
      contextClass: 'visor-organism',
      context: {
        surfaced: true,
        openTrunk: true,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: 'organism',
      expected: {
        availablePanelIds: ['organism', 'regulation'],
        mainPanelId: 'organism',
        secondaryPanelIds: [],
        collapsedPanelIds: ['regulation'],
      },
    },
    {
      id: 'interior-collapsed-only',
      contextClass: 'interior',
      context: {
        surfaced: false,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: null,
      expected: {
        availablePanelIds: ['interior-actions'],
        mainPanelId: null,
        secondaryPanelIds: [],
        collapsedPanelIds: ['interior-actions'],
      },
    },
  ] satisfies AdaptiveVisorLayoutScenario[],
  contextDerivationScenarios: [
    {
      id: 'derive-map',
      input: {
        visorOrganismId: null,
        enteredOrganismId: null,
        focusedOrganismId: null,
        altitude: 'high',
      },
      expectedContextClass: 'map',
    },
    {
      id: 'derive-interior',
      input: {
        visorOrganismId: null,
        enteredOrganismId: 'org-entered',
        focusedOrganismId: 'org-entered',
        altitude: 'mid',
      },
      expectedContextClass: 'interior',
    },
    {
      id: 'derive-visor-organism',
      input: {
        visorOrganismId: 'org-visor',
        enteredOrganismId: 'org-entered',
        focusedOrganismId: 'org-entered',
        altitude: 'close',
      },
      expectedContextClass: 'visor-organism',
    },
  ] satisfies AdaptiveVisorContextDerivationScenario[],
  compositorScenarios: [
    {
      id: 'initial-map-state',
      initialContext: {
        visorOrganismId: null,
        enteredOrganismId: null,
        focusedOrganismId: null,
        altitude: 'high',
      },
      events: [],
      expected: {
        activePanels: [],
        activeWidgets: ['map-actions', 'history-navigation', 'compass', 'map-legend'],
        activeMapPanel: null,
        anchors: ['navigation-back', 'dismiss'],
        intentStack: [],
        lastMutationToken: 0,
      },
    },
    {
      id: 'initial-visor-state',
      initialContext: {
        visorOrganismId: 'org-1',
        enteredOrganismId: null,
        focusedOrganismId: null,
        altitude: 'high',
      },
      events: [],
      expected: {
        activePanels: ['visor-view'],
        activeWidgets: ['history-navigation', 'vitality'],
        activeMapPanel: null,
        anchors: ['navigation-back', 'dismiss'],
        intentStack: [],
        lastMutationToken: 0,
      },
    },
    {
      id: 'toggle-map-panel-open-close',
      initialContext: {
        visorOrganismId: null,
        enteredOrganismId: null,
        focusedOrganismId: null,
        altitude: 'high',
      },
      events: [
        { type: 'toggle-map-panel', panelId: 'profile' },
        { type: 'toggle-map-panel', panelId: 'profile' },
      ],
      expected: {
        activePanels: [],
        activeWidgets: ['map-actions', 'history-navigation', 'compass', 'map-legend'],
        activeMapPanel: null,
        anchors: ['navigation-back', 'dismiss'],
        intentStack: [],
        lastMutationToken: 0,
      },
    },
    {
      id: 'map-panel-restores-after-visor-roundtrip',
      initialContext: {
        visorOrganismId: null,
        enteredOrganismId: null,
        focusedOrganismId: null,
        altitude: 'high',
      },
      events: [
        { type: 'toggle-map-panel', panelId: 'profile' },
        { type: 'open-visor-organism', organismId: 'org-2' },
        { type: 'close-visor-organism' },
      ],
      expected: {
        activePanels: ['profile'],
        activeWidgets: ['map-actions', 'history-navigation', 'compass', 'map-legend'],
        activeMapPanel: 'profile',
        anchors: ['navigation-back', 'dismiss'],
        intentStack: [],
        lastMutationToken: 0,
      },
    },
    {
      id: 'mutation-breaks-map-panel-restore',
      initialContext: {
        visorOrganismId: null,
        enteredOrganismId: null,
        focusedOrganismId: null,
        altitude: 'high',
      },
      events: [
        { type: 'toggle-map-panel', panelId: 'profile' },
        { type: 'open-visor-organism', organismId: 'org-2' },
        { type: 'mutation' },
        { type: 'close-visor-organism' },
      ],
      expected: {
        activePanels: [],
        activeWidgets: ['map-actions', 'history-navigation', 'compass', 'map-legend'],
        activeMapPanel: null,
        anchors: ['navigation-back', 'dismiss'],
        intentStack: [],
        lastMutationToken: 1,
      },
    },
    {
      id: 'open-visor-organism-from-map',
      initialContext: {
        visorOrganismId: null,
        enteredOrganismId: null,
        focusedOrganismId: null,
        altitude: 'high',
      },
      events: [
        { type: 'toggle-map-panel', panelId: 'my-proposals' },
        { type: 'open-visor-organism', organismId: 'org-2' },
      ],
      expected: {
        activePanels: ['visor-view'],
        activeWidgets: ['history-navigation', 'vitality'],
        activeMapPanel: null,
        anchors: ['navigation-back', 'dismiss'],
        intentStack: [],
        lastMutationToken: 0,
      },
    },
  ] satisfies AdaptiveVisorCompositorScenario[],
} as const;

/**
 * V2 draft contract — canonical visor behavior model (pre-refactor target).
 *
 * This draft makes "location in space" and "visor target" explicit and
 * derives adaptive context from those fields. It is intentionally defined
 * independent from current runtime wiring so we can refactor toward it
 * without changing visual iteration flow.
 */

export type AdaptiveVisorSpatialLocationV2 = 'map' | 'interior';
export type AdaptiveVisorTargetKindV2 = 'none' | 'organism';

export interface AdaptiveVisorCanonicalStateV2 {
  spatialLocation: AdaptiveVisorSpatialLocationV2;
  enteredOrganismId: string | null;
  focusedOrganismId: string | null;
  visorTarget: {
    kind: AdaptiveVisorTargetKindV2;
    organismId: string | null;
  };
  altitude: ContractAltitude;
  canWrite: boolean;
  openTrunk: boolean;
  surfaced: boolean;
  templateValuesReady: boolean;
  interiorOrigin: boolean;
  preferredMainPanelId: HudPanelId | null;
}

export type AdaptiveVisorCanonicalEventV2 =
  | {
      type: 'enter-map';
    }
  | {
      type: 'focus-organism';
      organismId: string | null;
    }
  | {
      type: 'enter-interior-organism';
      organismId: string;
    }
  | {
      type: 'exit-interior-organism';
    }
  | {
      type: 'open-visor-organism';
      organismId: string;
    }
  | {
      type: 'close-visor-organism';
    }
  | {
      type: 'set-can-write';
      canWrite: boolean;
    }
  | {
      type: 'set-open-trunk';
      openTrunk: boolean;
    }
  | {
      type: 'set-surfaced';
      surfaced: boolean;
    }
  | {
      type: 'set-template-values-ready';
      templateValuesReady: boolean;
    }
  | {
      type: 'promote-main-panel';
      panelId: HudPanelId;
    }
  | {
      type: 'collapse-main-panel';
    };

export interface AdaptiveVisorV2ContextScenario {
  id: string;
  state: AdaptiveVisorCanonicalStateV2;
  expectedContextClass: HudContextClass;
}

export interface AdaptiveVisorV2TransitionScenario {
  id: string;
  initialState: AdaptiveVisorCanonicalStateV2;
  events: AdaptiveVisorCanonicalEventV2[];
  expectedState: Partial<AdaptiveVisorCanonicalStateV2> & {
    visorTarget?: Partial<AdaptiveVisorCanonicalStateV2['visorTarget']>;
  };
  expectedContextClass: HudContextClass;
}

export const ADAPTIVE_VISOR_BEHAVIOR_EVENT_VOCABULARY_V2 = {
  canonicalEvents: [
    'enter-map',
    'focus-organism',
    'enter-interior-organism',
    'exit-interior-organism',
    'open-visor-organism',
    'close-visor-organism',
    'set-can-write',
    'set-open-trunk',
    'set-surfaced',
    'set-template-values-ready',
    'promote-main-panel',
    'collapse-main-panel',
  ] as AdaptiveVisorCanonicalEventV2['type'][],
  policyEvents: ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.eventTypes,
} as const;

export function deriveAdaptiveVisorContextClassV2(state: AdaptiveVisorCanonicalStateV2): HudContextClass {
  if (state.visorTarget.kind === 'organism' && state.visorTarget.organismId) {
    return 'visor-organism';
  }

  if (state.spatialLocation === 'interior' && state.enteredOrganismId) {
    return 'interior';
  }

  return 'map';
}

export function applyAdaptiveVisorCanonicalEventV2(
  state: AdaptiveVisorCanonicalStateV2,
  event: AdaptiveVisorCanonicalEventV2,
): AdaptiveVisorCanonicalStateV2 {
  switch (event.type) {
    case 'enter-map':
      return {
        ...state,
        spatialLocation: 'map',
        enteredOrganismId: null,
        visorTarget: { kind: 'none', organismId: null },
        interiorOrigin: false,
        preferredMainPanelId: null,
      };

    case 'focus-organism':
      return {
        ...state,
        focusedOrganismId: event.organismId,
      };

    case 'enter-interior-organism':
      return {
        ...state,
        spatialLocation: 'interior',
        enteredOrganismId: event.organismId,
        focusedOrganismId: event.organismId,
        visorTarget: { kind: 'none', organismId: null },
        interiorOrigin: false,
        preferredMainPanelId: null,
      };

    case 'exit-interior-organism':
      return {
        ...state,
        spatialLocation: 'map',
        enteredOrganismId: null,
        interiorOrigin: false,
      };

    case 'open-visor-organism':
      return {
        ...state,
        visorTarget: { kind: 'organism', organismId: event.organismId },
        interiorOrigin: state.enteredOrganismId === event.organismId,
      };

    case 'close-visor-organism':
      return {
        ...state,
        visorTarget: { kind: 'none', organismId: null },
        preferredMainPanelId: null,
      };

    case 'set-can-write':
      return {
        ...state,
        canWrite: event.canWrite,
      };

    case 'set-open-trunk':
      return {
        ...state,
        openTrunk: event.openTrunk,
      };

    case 'set-surfaced':
      return {
        ...state,
        surfaced: event.surfaced,
      };

    case 'set-template-values-ready':
      return {
        ...state,
        templateValuesReady: event.templateValuesReady,
      };

    case 'promote-main-panel':
      return {
        ...state,
        preferredMainPanelId: event.panelId,
      };

    case 'collapse-main-panel':
      return {
        ...state,
        preferredMainPanelId: null,
      };
  }
}

const BASE_CANONICAL_STATE_V2: AdaptiveVisorCanonicalStateV2 = {
  spatialLocation: 'map',
  enteredOrganismId: null,
  focusedOrganismId: null,
  visorTarget: {
    kind: 'none',
    organismId: null,
  },
  altitude: 'high',
  canWrite: true,
  openTrunk: false,
  surfaced: true,
  templateValuesReady: false,
  interiorOrigin: false,
  preferredMainPanelId: null,
};

export const ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V2_DRAFT = {
  contractId: 'adaptive-visor-behavior',
  version: '2.0.0-draft',
  status: 'draft',
  canonicalStateModel: {
    separatesSpatialLocationAndVisorTarget: true,
    contextDerivationRule: 'visor target wins over spatial interior; interior wins over map',
  },
  eventVocabulary: ADAPTIVE_VISOR_BEHAVIOR_EVENT_VOCABULARY_V2,
  contextScenarios: [
    {
      id: 'map-no-visor-target',
      state: {
        ...BASE_CANONICAL_STATE_V2,
      },
      expectedContextClass: 'map',
    },
    {
      id: 'interior-no-visor-target',
      state: {
        ...BASE_CANONICAL_STATE_V2,
        spatialLocation: 'interior',
        enteredOrganismId: 'org-interior',
      },
      expectedContextClass: 'interior',
    },
    {
      id: 'interior-plus-visor-target',
      state: {
        ...BASE_CANONICAL_STATE_V2,
        spatialLocation: 'interior',
        enteredOrganismId: 'org-interior',
        visorTarget: { kind: 'organism', organismId: 'org-interior' },
        interiorOrigin: true,
      },
      expectedContextClass: 'visor-organism',
    },
    {
      id: 'map-plus-visor-target',
      state: {
        ...BASE_CANONICAL_STATE_V2,
        visorTarget: { kind: 'organism', organismId: 'org-visor' },
      },
      expectedContextClass: 'visor-organism',
    },
  ] satisfies AdaptiveVisorV2ContextScenario[],
  transitionScenarios: [
    {
      id: 'open-visor-from-map',
      initialState: {
        ...BASE_CANONICAL_STATE_V2,
      },
      events: [{ type: 'open-visor-organism', organismId: 'org-1' }],
      expectedState: {
        spatialLocation: 'map',
        visorTarget: { kind: 'organism', organismId: 'org-1' },
        interiorOrigin: false,
      },
      expectedContextClass: 'visor-organism',
    },
    {
      id: 'open-visor-from-interior-preserves-location',
      initialState: {
        ...BASE_CANONICAL_STATE_V2,
        spatialLocation: 'interior',
        enteredOrganismId: 'org-2',
      },
      events: [{ type: 'open-visor-organism', organismId: 'org-2' }],
      expectedState: {
        spatialLocation: 'interior',
        enteredOrganismId: 'org-2',
        visorTarget: { kind: 'organism', organismId: 'org-2' },
        interiorOrigin: true,
      },
      expectedContextClass: 'visor-organism',
    },
    {
      id: 'close-visor-returns-to-interior-context-when-still-inside',
      initialState: {
        ...BASE_CANONICAL_STATE_V2,
        spatialLocation: 'interior',
        enteredOrganismId: 'org-3',
        visorTarget: { kind: 'organism', organismId: 'org-3' },
        interiorOrigin: true,
        preferredMainPanelId: 'organism',
      },
      events: [{ type: 'close-visor-organism' }],
      expectedState: {
        spatialLocation: 'interior',
        enteredOrganismId: 'org-3',
        visorTarget: { kind: 'none', organismId: null },
        preferredMainPanelId: null,
      },
      expectedContextClass: 'interior',
    },
    {
      id: 'enter-interior-closes-existing-visor-target',
      initialState: {
        ...BASE_CANONICAL_STATE_V2,
        visorTarget: { kind: 'organism', organismId: 'org-previous' },
      },
      events: [{ type: 'enter-interior-organism', organismId: 'org-4' }],
      expectedState: {
        spatialLocation: 'interior',
        enteredOrganismId: 'org-4',
        visorTarget: { kind: 'none', organismId: null },
      },
      expectedContextClass: 'interior',
    },
    {
      id: 'panel-promotion-and-collapse-are-explicit-events',
      initialState: {
        ...BASE_CANONICAL_STATE_V2,
        visorTarget: { kind: 'organism', organismId: 'org-5' },
      },
      events: [{ type: 'promote-main-panel', panelId: 'history' }, { type: 'collapse-main-panel' }],
      expectedState: {
        preferredMainPanelId: null,
        visorTarget: { kind: 'organism', organismId: 'org-5' },
      },
      expectedContextClass: 'visor-organism',
    },
  ] satisfies AdaptiveVisorV2TransitionScenario[],
} as const;
