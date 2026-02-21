/**
 * Visor panel layout policy — assigns panel roles for adaptive rendering.
 *
 * The policy resolves which eligible panel is main, which become secondary,
 * and which remain collapsed. Output is deterministic from context + intent.
 */

import { mainPriorityDelta, resolveIntentMatrixRule, secondaryPriorityDelta } from './intent-matrix.js';
import {
  getHudPanelDefinition,
  HUD_PANEL_REGISTRY,
  type HudPanelContext,
  type HudPanelDefinition,
  type HudPanelId,
} from './panel-schema.js';
import type { VisorTemplatePanelSlots } from './template-schema.js';

export interface VisorPanelLayoutInput {
  context: HudPanelContext;
  preferredMainPanelId: HudPanelId | null;
  slots: VisorTemplatePanelSlots;
}

export interface VisorPanelLayout {
  availablePanelIds: HudPanelId[];
  mainPanelId: HudPanelId | null;
  secondaryPanelIds: HudPanelId[];
  collapsedPanelIds: HudPanelId[];
}

function sortByScore(
  panels: HudPanelDefinition[],
  getScore: (panel: HudPanelDefinition) => number,
): HudPanelDefinition[] {
  return [...panels].sort((a, b) => {
    const scoreA = getScore(a);
    const scoreB = getScore(b);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.id.localeCompare(b.id);
  });
}

function findAvailablePanels(context: HudPanelContext): HudPanelDefinition[] {
  return HUD_PANEL_REGISTRY.filter((panel) => panel.availableIn(context));
}

function contextualMainPriority(panel: HudPanelDefinition, context: HudPanelContext): number {
  return panel.defaultMainPriority + mainPriorityDelta(context, panel.id);
}

function contextualSecondaryPriority(panel: HudPanelDefinition, context: HudPanelContext): number {
  return panel.defaultSecondaryPriority + secondaryPriorityDelta(context, panel.id);
}

function chooseMainPanel(
  availablePanels: HudPanelDefinition[],
  preferredMainPanelId: HudPanelId | null,
  context: HudPanelContext,
  slots: VisorTemplatePanelSlots,
): HudPanelId | null {
  if (!slots.main.enabled) return null;
  if (availablePanels.length === 0) return null;

  if (preferredMainPanelId) {
    const preferredPanel = availablePanels.find((panel) => panel.id === preferredMainPanelId);
    if (preferredPanel?.roleSupport.main) return preferredPanel.id;
  }

  if (slots.main.allowEmpty) return null;

  const ranked = sortByScore(
    availablePanels.filter((panel) => panel.roleSupport.main),
    (panel) => contextualMainPriority(panel, context),
  );
  return ranked[0]?.id ?? null;
}

function chooseSecondaryPanels(
  availablePanels: HudPanelDefinition[],
  mainPanelId: HudPanelId | null,
  context: HudPanelContext,
  slots: VisorTemplatePanelSlots,
): HudPanelId[] {
  if (mainPanelId == null) return [];
  if (!slots.secondary.enabled || slots.secondary.maxPanels <= 0) return [];
  if (context.interiorOrigin) return [];
  if (context.rendererPreviewFullBleed && mainPanelId === 'organism') return [];

  const candidates = availablePanels.filter((panel) => panel.id !== mainPanelId && panel.roleSupport.secondary);
  return sortByScore(candidates, (panel) => contextualSecondaryPriority(panel, context))
    .slice(0, slots.secondary.maxPanels)
    .map((panel) => panel.id);
}

function chooseCollapsedPanels(
  availablePanels: HudPanelDefinition[],
  mainPanelId: HudPanelId | null,
  secondaryPanelIds: HudPanelId[],
  context: HudPanelContext,
  slots: VisorTemplatePanelSlots,
): HudPanelId[] {
  if (!slots.collapsed.enabled) return [];

  const intentRule = resolveIntentMatrixRule(context);

  // Context-specific intent matrix can start from one collapsed entry point.
  if (mainPanelId == null && intentRule.initialCollapsedOnlyPanelId) {
    const entryPanel = availablePanels.find(
      (panel) => panel.id === intentRule.initialCollapsedOnlyPanelId && panel.roleSupport.collapsed,
    );
    return entryPanel ? [entryPanel.id] : [];
  }

  const blockedIds = new Set<HudPanelId>([...(mainPanelId ? [mainPanelId] : []), ...secondaryPanelIds]);
  const candidates = availablePanels.filter((panel) => !blockedIds.has(panel.id) && panel.roleSupport.collapsed);
  const ranked = sortByScore(candidates, (panel) => panel.collapsedPriority).map((panel) => panel.id);
  if (slots.collapsed.maxPanels === null) return ranked;
  return ranked.slice(0, slots.collapsed.maxPanels);
}

export function resolveVisorPanelLayout(input: VisorPanelLayoutInput): VisorPanelLayout {
  const availablePanels = findAvailablePanels(input.context);
  const mainPanelId = chooseMainPanel(availablePanels, input.preferredMainPanelId, input.context, input.slots);
  const secondaryPanelIds = chooseSecondaryPanels(availablePanels, mainPanelId, input.context, input.slots);
  const collapsedPanelIds = chooseCollapsedPanels(
    availablePanels,
    mainPanelId,
    secondaryPanelIds,
    input.context,
    input.slots,
  );

  return {
    availablePanelIds: availablePanels.map((panel) => panel.id),
    mainPanelId,
    secondaryPanelIds,
    collapsedPanelIds,
  };
}

export function fallbackMainPanel(panelIds: HudPanelId[]): HudPanelId | null {
  if (panelIds.length === 0) return null;
  const ranked = sortByScore(
    panelIds.map((panelId) => getHudPanelDefinition(panelId)),
    (panel) => panel.defaultMainPriority,
  );
  return ranked[0]?.id ?? null;
}
