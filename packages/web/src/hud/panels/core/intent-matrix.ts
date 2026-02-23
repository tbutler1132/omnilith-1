/**
 * Intent matrix — declarative panel intent rules for adaptive visor layout.
 *
 * Captures context + organism mode behavior as data so panel policy can
 * remain a thin deterministic resolver. This keeps iteration fast without
 * hardwiring flow assumptions into host components.
 */

import type { HudPanelContext, HudPanelId } from './panel-schema.js';

type PanelScoreAdjustments = Partial<Record<HudPanelId, number>>;

interface IntentMatrixRule {
  initialCollapsedOnlyPanelId?: HudPanelId;
  mainPriority: {
    base?: PanelScoreAdjustments;
    surfaced?: PanelScoreAdjustments;
    unsurfaced?: PanelScoreAdjustments;
  };
  secondaryPriority: {
    base?: PanelScoreAdjustments;
    surfaced?: PanelScoreAdjustments;
    unsurfaced?: PanelScoreAdjustments;
  };
}

const MAP_RULE: IntentMatrixRule = {
  mainPriority: {
    base: {
      'my-organisms': 6,
      'my-proposals': 5,
      profile: 3,
    },
  },
  secondaryPriority: {
    base: {
      'my-organisms': 5,
      'my-proposals': 4,
      profile: 3,
    },
  },
};

const ORGANISM_RULE: IntentMatrixRule = {
  initialCollapsedOnlyPanelId: 'organism',
  mainPriority: {
    base: {
      organism: 30,
    },
    surfaced: {
      composition: 10,
      proposals: 7,
      propose: 6,
      append: 6,
    },
    unsurfaced: {
      propose: 9,
      append: 9,
      history: 6,
    },
  },
  secondaryPriority: {
    base: {},
    surfaced: {
      proposals: 3,
      composition: 3,
      propose: 2,
      append: 2,
      relationships: 1,
    },
    unsurfaced: {
      history: 4,
      governance: 2,
      relationships: 2,
    },
  },
};

const INTERIOR_RULE: IntentMatrixRule = {
  mainPriority: {},
  secondaryPriority: {},
};

function scoreFromAdjustments(adjustments: PanelScoreAdjustments | undefined, panelId: HudPanelId): number {
  if (!adjustments) return 0;
  return adjustments[panelId] ?? 0;
}

export function resolveIntentMatrixRule(context: HudPanelContext): IntentMatrixRule {
  if (context.contextClass === 'map') return MAP_RULE;
  if (context.contextClass === 'visor-organism') return ORGANISM_RULE;
  return INTERIOR_RULE;
}

export function mainPriorityDelta(context: HudPanelContext, panelId: HudPanelId): number {
  const rule = resolveIntentMatrixRule(context);
  const stateKey = context.surfaced ? 'surfaced' : 'unsurfaced';

  return (
    scoreFromAdjustments(rule.mainPriority.base, panelId) + scoreFromAdjustments(rule.mainPriority[stateKey], panelId)
  );
}

export function secondaryPriorityDelta(context: HudPanelContext, panelId: HudPanelId): number {
  const rule = resolveIntentMatrixRule(context);
  const stateKey = context.surfaced ? 'surfaced' : 'unsurfaced';

  return (
    scoreFromAdjustments(rule.secondaryPriority.base, panelId) +
    scoreFromAdjustments(rule.secondaryPriority[stateKey], panelId)
  );
}
