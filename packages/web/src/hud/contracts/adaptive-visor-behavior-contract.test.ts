/**
 * Adaptive visor behavior contract tests — policy conformance guardrails.
 *
 * Ensures runtime adaptive visor behavior remains aligned with the explicit
 * contract for context classes, event vocabulary, layout states, and
 * compositor transitions.
 */

import { describe, expect, it } from 'vitest';
import {
  type AdaptiveVisorCompositorEvent,
  type AdaptiveVisorPanelId,
  computeNextAdaptiveVisorLayout,
  createAdaptiveVisorCompositorState,
  deriveAdaptiveVisorContext,
  selectActiveMapPanel,
} from '../../platform/adaptive-visor-compositor.js';
import { HUD_CUE_REGISTRY, type HudCueTargetAnchorId } from '../cues/cue-schema.js';
import { resolveVisorPanelLayout } from '../panels/core/panel-layout-policy.js';
import {
  HUD_PANEL_REGISTRY,
  type HudContextClass,
  type HudPanelContext,
  type HudPanelId,
} from '../panels/core/panel-schema.js';
import { resolveVisorTemplate } from '../panels/core/template-schema.js';
import { VISOR_WIDGET_IDS } from '../panels/core/widget-schema.js';
import {
  ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1,
  ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V2_DRAFT,
  ADAPTIVE_VISOR_BEHAVIOR_EVENT_VOCABULARY_V2,
  type AdaptiveVisorCanonicalStateV2,
  applyAdaptiveVisorCanonicalEventV2,
  type ContractCompositorContextInput,
  type ContractCompositorEvent,
  deriveAdaptiveVisorContextClassV2,
} from './adaptive-visor-behavior-contract.js';

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function toDerivedContext(input: ContractCompositorContextInput) {
  return deriveAdaptiveVisorContext({
    visorOrganismId: input.visorOrganismId,
    enteredOrganismId: input.enteredOrganismId,
    focusedOrganismId: input.focusedOrganismId,
    altitude: input.altitude,
  });
}

function toCompositorEvent(event: ContractCompositorEvent): AdaptiveVisorCompositorEvent {
  if (event.type === 'toggle-map-panel') {
    return {
      type: 'toggle-map-panel',
      panelId: event.panelId,
    };
  }

  if (event.type === 'enter-map') {
    return { type: 'enter-map' };
  }

  if (event.type === 'focus-organism') {
    return {
      type: 'focus-organism',
      organismId: event.organismId,
    };
  }

  if (event.type === 'enter-organism') {
    return {
      type: 'enter-organism',
      organismId: event.organismId,
    };
  }

  if (event.type === 'exit-organism') {
    return { type: 'exit-organism' };
  }

  if (event.type === 'open-visor-organism') {
    return {
      type: 'open-visor-organism',
      organismId: event.organismId,
    };
  }

  if (event.type === 'close-visor-organism') {
    return { type: 'close-visor-organism' };
  }

  if (event.type === 'set-altitude') {
    return {
      type: 'set-altitude',
      altitude: event.altitude,
    };
  }

  return { type: 'mutation' };
}

function assertV2StateSubset(
  actual: AdaptiveVisorCanonicalStateV2,
  expected: Partial<AdaptiveVisorCanonicalStateV2> & {
    visorTarget?: Partial<AdaptiveVisorCanonicalStateV2['visorTarget']>;
  },
) {
  if (expected.spatialLocation !== undefined) {
    expect(actual.spatialLocation).toBe(expected.spatialLocation);
  }
  if (expected.enteredOrganismId !== undefined) {
    expect(actual.enteredOrganismId).toBe(expected.enteredOrganismId);
  }
  if (expected.focusedOrganismId !== undefined) {
    expect(actual.focusedOrganismId).toBe(expected.focusedOrganismId);
  }
  if (expected.altitude !== undefined) {
    expect(actual.altitude).toBe(expected.altitude);
  }
  if (expected.canWrite !== undefined) {
    expect(actual.canWrite).toBe(expected.canWrite);
  }
  if (expected.openTrunk !== undefined) {
    expect(actual.openTrunk).toBe(expected.openTrunk);
  }
  if (expected.surfaced !== undefined) {
    expect(actual.surfaced).toBe(expected.surfaced);
  }
  if (expected.templateValuesReady !== undefined) {
    expect(actual.templateValuesReady).toBe(expected.templateValuesReady);
  }
  if (expected.interiorOrigin !== undefined) {
    expect(actual.interiorOrigin).toBe(expected.interiorOrigin);
  }
  if (expected.preferredMainPanelId !== undefined) {
    expect(actual.preferredMainPanelId).toBe(expected.preferredMainPanelId);
  }
  if (expected.visorTarget !== undefined) {
    if (expected.visorTarget.kind !== undefined) {
      expect(actual.visorTarget.kind).toBe(expected.visorTarget.kind);
    }
    if (expected.visorTarget.organismId !== undefined) {
      expect(actual.visorTarget.organismId).toBe(expected.visorTarget.organismId);
    }
  }
}

describe('adaptive visor behavior contract', () => {
  it('keeps contract vocabulary synced with registries and type vocabularies', () => {
    const declaredContextClasses: Record<HudContextClass, true> = {
      map: true,
      interior: true,
      'visor-organism': true,
    };

    const declaredEventTypes: Record<AdaptiveVisorCompositorEvent['type'], true> = {
      'enter-map': true,
      'focus-organism': true,
      'enter-organism': true,
      'exit-organism': true,
      'open-visor-organism': true,
      'close-visor-organism': true,
      'set-altitude': true,
      'toggle-map-panel': true,
      mutation: true,
    };

    const declaredCompositorPanelIds: Record<AdaptiveVisorPanelId, true> = {
      'visor-view': true,
      'interior-actions': true,
      profile: true,
      'my-organisms': true,
      'my-proposals': true,
    };

    const declaredCueAnchors: Record<HudCueTargetAnchorId, true> = {
      'adaptive-policy-badge': true,
      'visor-pill': true,
    };

    expect(sortStrings(ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.contextClasses)).toEqual(
      sortStrings(Object.keys(declaredContextClasses)),
    );

    expect(sortStrings(ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.eventTypes)).toEqual(
      sortStrings(Object.keys(declaredEventTypes)),
    );

    expect(sortStrings(ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.compositorPanelIds)).toEqual(
      sortStrings(Object.keys(declaredCompositorPanelIds)),
    );

    expect(sortStrings(ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.panelIds)).toEqual(
      sortStrings(HUD_PANEL_REGISTRY.map((panel) => panel.id)),
    );

    expect(sortStrings(ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.widgetIds)).toEqual(sortStrings(VISOR_WIDGET_IDS));

    expect(sortStrings(ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.cueIds)).toEqual(
      sortStrings(HUD_CUE_REGISTRY.map((cue) => cue.id)),
    );

    expect(sortStrings(ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.cueAnchorIds)).toEqual(
      sortStrings(Object.keys(declaredCueAnchors)),
    );
  });

  it('matches panel layout policy for all contract layout scenarios', () => {
    ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.layoutScenarios.forEach((scenario) => {
      const slots = resolveVisorTemplate(scenario.contextClass).panelSlots;

      const context: HudPanelContext = {
        contextClass: scenario.contextClass,
        surfaced: scenario.context.surfaced,
        openTrunk: scenario.context.openTrunk,
        templateValuesReady: scenario.context.templateValuesReady,
        canWrite: scenario.context.canWrite,
        interiorOrigin: scenario.context.interiorOrigin,
        thermalRendererPreview: scenario.context.thermalRendererPreview,
      };

      const layout = resolveVisorPanelLayout({
        context,
        preferredMainPanelId: scenario.preferredMainPanelId,
        slots,
      });

      expect(layout.availablePanelIds, `${scenario.id} availablePanelIds`).toEqual(scenario.expected.availablePanelIds);
      expect(layout.mainPanelId, `${scenario.id} mainPanelId`).toBe(scenario.expected.mainPanelId);
      expect(layout.secondaryPanelIds, `${scenario.id} secondaryPanelIds`).toEqual(scenario.expected.secondaryPanelIds);
      expect(layout.collapsedPanelIds, `${scenario.id} collapsedPanelIds`).toEqual(scenario.expected.collapsedPanelIds);
    });
  });

  it('matches context derivation rules for all contract derivation scenarios', () => {
    ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.contextDerivationScenarios.forEach((scenario) => {
      const derived = toDerivedContext(scenario.input);

      expect(derived.contextClass, `${scenario.id} contextClass`).toBe(scenario.expectedContextClass);
      expect(derived.altitude, `${scenario.id} altitude`).toBe(scenario.input.altitude);
      expect(derived.focusedOrganismId, `${scenario.id} focusedOrganismId`).toBe(scenario.input.focusedOrganismId);
      expect(derived.enteredOrganismId, `${scenario.id} enteredOrganismId`).toBe(scenario.input.enteredOrganismId);
      expect(derived.visorOrganismId, `${scenario.id} visorOrganismId`).toBe(scenario.input.visorOrganismId);
    });
  });

  it('matches compositor transitions for all contract transition scenarios', () => {
    ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.compositorScenarios.forEach((scenario) => {
      let state = createAdaptiveVisorCompositorState(true, toDerivedContext(scenario.initialContext));

      for (const event of scenario.events) {
        state = computeNextAdaptiveVisorLayout(state, toCompositorEvent(event));
      }

      expect(state.activePanels, `${scenario.id} activePanels`).toEqual(scenario.expected.activePanels);
      expect(state.activeWidgets, `${scenario.id} activeWidgets`).toEqual(scenario.expected.activeWidgets);
      expect(selectActiveMapPanel(state), `${scenario.id} activeMapPanel`).toBe(scenario.expected.activeMapPanel);
      expect(state.anchors, `${scenario.id} anchors`).toEqual(scenario.expected.anchors);
      expect(state.intentStack, `${scenario.id} intentStack`).toEqual(scenario.expected.intentStack);
      expect(state.lastMutationToken, `${scenario.id} lastMutationToken`).toBe(scenario.expected.lastMutationToken);
    });
  });

  it('ensures layout scenarios only reference declared panel IDs', () => {
    const knownPanelIds = new Set<HudPanelId>(ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.panelIds);

    ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1.layoutScenarios.forEach((scenario) => {
      const allExpectedIds = [
        ...scenario.expected.availablePanelIds,
        ...(scenario.expected.mainPanelId ? [scenario.expected.mainPanelId] : []),
        ...scenario.expected.secondaryPanelIds,
        ...scenario.expected.collapsedPanelIds,
      ];

      allExpectedIds.forEach((panelId) => {
        expect(knownPanelIds.has(panelId), `${scenario.id} references declared panel ID ${panelId}`).toBe(true);
      });
    });
  });

  it('keeps v2 draft event vocabulary explicit and deduplicated', () => {
    const canonicalEvents = ADAPTIVE_VISOR_BEHAVIOR_EVENT_VOCABULARY_V2.canonicalEvents;
    const policyEvents = ADAPTIVE_VISOR_BEHAVIOR_EVENT_VOCABULARY_V2.policyEvents;

    expect(new Set(canonicalEvents).size).toBe(canonicalEvents.length);
    expect(new Set(policyEvents).size).toBe(policyEvents.length);
    expect(canonicalEvents).toContain('open-visor-organism');
    expect(canonicalEvents).toContain('close-visor-organism');
    expect(canonicalEvents).toContain('promote-main-panel');
    expect(canonicalEvents).toContain('collapse-main-panel');
  });

  it('matches v2 draft context derivation scenarios', () => {
    ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V2_DRAFT.contextScenarios.forEach((scenario) => {
      const contextClass = deriveAdaptiveVisorContextClassV2(scenario.state);
      expect(contextClass, `${scenario.id} contextClass`).toBe(scenario.expectedContextClass);
    });
  });

  it('matches v2 draft transition scenarios', () => {
    ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V2_DRAFT.transitionScenarios.forEach((scenario) => {
      let current = scenario.initialState;

      for (const event of scenario.events) {
        current = applyAdaptiveVisorCanonicalEventV2(current, event);
      }

      assertV2StateSubset(current, scenario.expectedState);
      expect(deriveAdaptiveVisorContextClassV2(current), `${scenario.id} derived context`).toBe(
        scenario.expectedContextClass,
      );
    });
  });
});
