/**
 * Visor panel layout policy — assigns panel roles for adaptive rendering.
 *
 * The policy resolves which eligible panel is main, which become secondary,
 * and which remain collapsed. Output is deterministic from context + intent.
 */

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
  let score = panel.defaultMainPriority;
  if (context.contextClass === 'map') {
    if (panel.id === 'templates') score += 4;
    if (panel.id === 'threshold') score += 2;
    if (panel.id === 'template-values') score += 7;
    return score;
  }

  if (panel.id === 'organism') score += 30;

  if (context.surfaced) {
    if (panel.id === 'composition') score += 10;
    if (panel.id === 'proposals') score += 7;
    if (panel.id === 'vitality') score += 5;
  } else {
    if (panel.id === 'vitality') score += 9;
    if (panel.id === 'history') score += 6;
  }
  return score;
}

function contextualSecondaryPriority(panel: HudPanelDefinition, context: HudPanelContext): number {
  let score = panel.defaultSecondaryPriority;
  if (context.contextClass === 'map') {
    if (panel.id === 'mine') score += 4;
    if (panel.id === 'templates') score += 3;
    if (panel.id === 'threshold') score += 2;
    return score;
  }

  if (context.surfaced) {
    if (panel.id === 'proposals') score += 3;
    if (panel.id === 'composition') score += 3;
  } else {
    if (panel.id === 'history') score += 4;
    if (panel.id === 'governance') score += 2;
  }
  return score;
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
  if (!slots.secondary.enabled || slots.secondary.maxPanels <= 0) return [];

  const candidates = availablePanels.filter((panel) => panel.id !== mainPanelId && panel.roleSupport.secondary);
  return sortByScore(candidates, (panel) => contextualSecondaryPriority(panel, context))
    .slice(0, slots.secondary.maxPanels)
    .map((panel) => panel.id);
}

function chooseCollapsedPanels(
  availablePanels: HudPanelDefinition[],
  mainPanelId: HudPanelId | null,
  secondaryPanelIds: HudPanelId[],
  slots: VisorTemplatePanelSlots,
): HudPanelId[] {
  if (!slots.collapsed.enabled) return [];

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
  const collapsedPanelIds = chooseCollapsedPanels(availablePanels, mainPanelId, secondaryPanelIds, input.slots);

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
