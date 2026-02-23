/**
 * OrganismPanelDeck — shared organism tending panel deck.
 *
 * Encapsulates adaptive panel behavior for tending a single organism so
 * every visor context uses one consistent panel system.
 */

import { useEffect, useState } from 'react';
import { useIsSurfaced } from '../../../hooks/use-is-surfaced.js';
import { useChildren, useOrganism } from '../../../hooks/use-organism.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformAdaptiveVisorState,
  usePlatformMapState,
  usePlatformStaticState,
} from '../../../platform/index.js';
import { HistoryNavigationWidget, VisorWidgetLane, VitalityWidget } from '../../widgets/index.js';
import { renderVisorPanelBody } from '../core/panel-body-registry.js';
import { resolveVisorPanelLayout } from '../core/panel-layout-policy.js';
import {
  isVisorHudPanelId,
  isVisorMainHudPanelId,
  type VisorHudPanelId,
  type VisorMainHudPanelId,
} from '../core/panel-schema.js';
import { resolvePanelVisorTemplate } from '../core/template-schema.js';
import { useMainPanelHistoryNavigation } from '../core/use-main-panel-history-navigation.js';
import { VisorPanelDeck } from '../core/VisorPanelDeck.js';

interface OrganismPanelDeckProps {
  organismId: string;
  initialPanelId?: VisorHudPanelId | null;
}

interface OrganismShortcutAction {
  panelId: VisorMainHudPanelId;
  label: string;
}

export function OrganismPanelDeck({ organismId, initialPanelId = null }: OrganismPanelDeckProps) {
  const { worldMapId, canWrite } = usePlatformStaticState();
  const { enteredOrganismId } = usePlatformMapState();
  const { closeVisorOrganism } = usePlatformActions();
  const { bumpMutationToken } = usePlatformAdaptiveVisorActions();
  const adaptiveVisorState = usePlatformAdaptiveVisorState();

  const interiorOrigin = enteredOrganismId === organismId;
  const [refreshKey, setRefreshKey] = useState(0);
  const [preferredPanelId, setPreferredPanelId] = useState<VisorHudPanelId | null>(
    initialPanelId ?? (interiorOrigin ? 'proposals' : null),
  );
  const organismTemplate = resolvePanelVisorTemplate('visor-organism');
  const activeWidgets = new Set(adaptiveVisorState.activeWidgets);
  const vitalityWidgetEnabled =
    activeWidgets.has('vitality') && organismTemplate.widgetSlots.allowedWidgets.includes('vitality');
  const historyNavigationEnabled =
    activeWidgets.has('history-navigation') &&
    organismTemplate.widgetSlots.allowedWidgets.includes('history-navigation');
  const thermalRendererPreview = false;
  const rendererPreviewFullBleed = false;
  const { data: organism, loading: organismLoading, error: organismError } = useOrganism(organismId, refreshKey);
  const { data: children, loading: childrenLoading, error: childrenError } = useChildren(organismId, refreshKey);
  const { surfaced } = useIsSurfaced(worldMapId, organismId);
  const openTrunk = organism?.organism.openTrunk ?? false;

  useEffect(() => {
    setPreferredPanelId(initialPanelId ?? (interiorOrigin ? 'proposals' : null));
  }, [initialPanelId, interiorOrigin]);

  useEffect(() => {
    if (!interiorOrigin || organismLoading) return;

    setPreferredPanelId((current) => {
      if (current !== null && current !== 'proposals') return current;
      if (openTrunk) return canWrite ? 'append' : 'organism';
      return 'proposals';
    });
  }, [interiorOrigin, organismLoading, openTrunk, canWrite]);

  const organismLayout = resolveVisorPanelLayout({
    context: {
      contextClass: 'visor-organism',
      surfaced,
      openTrunk,
      templateValuesReady: false,
      canWrite,
      interiorOrigin,
      thermalRendererPreview,
      rendererPreviewFullBleed,
    },
    preferredMainPanelId: preferredPanelId,
    slots: organismTemplate.panelSlots,
  });
  const historyNavigation = useMainPanelHistoryNavigation({
    contextClass: 'visor-organism',
    currentMainPanelId: organismLayout.mainPanelId,
    availablePanelIds: organismLayout.availablePanelIds,
    enabled: historyNavigationEnabled,
    onPromotePanel: (panelId) => {
      if (!isVisorHudPanelId(panelId)) return;
      setPreferredPanelId(panelId);
    },
  });
  const showHistoryNavigationWidget = historyNavigation.hasTargets;

  const name = organism?.organism.name ?? '...';
  const contentType = organism?.currentState?.contentTypeId ?? '...';
  const childCountLabel = childrenLoading ? '...' : childrenError ? 'unknown' : String(children?.length ?? 0);
  const secondaryShortcutActions: OrganismShortcutAction[] = [];

  secondaryShortcutActions.push({ panelId: 'organism', label: 'Open overview' });
  secondaryShortcutActions.push({ panelId: 'regulation', label: 'Open regulation' });
  secondaryShortcutActions.push({ panelId: 'boundary-cadence', label: 'Open cadence' });
  secondaryShortcutActions.push({ panelId: 'proposals', label: 'Open collaborate' });

  return (
    <>
      {(vitalityWidgetEnabled && preferredPanelId !== null) || showHistoryNavigationWidget ? (
        <VisorWidgetLane>
          {showHistoryNavigationWidget && (
            <HistoryNavigationWidget
              canGoPrevious={historyNavigation.canGoPrevious}
              canGoNext={historyNavigation.canGoNext}
              onGoPrevious={historyNavigation.goPrevious}
              onGoNext={historyNavigation.goNext}
            />
          )}
          {vitalityWidgetEnabled && preferredPanelId !== null && (
            <VitalityWidget organismId={organismId} refreshKey={refreshKey} />
          )}
        </VisorWidgetLane>
      ) : null}

      <VisorPanelDeck
        title="Organism panels"
        template={organismTemplate}
        surfaced={surfaced}
        openTrunk={openTrunk}
        canWrite={canWrite}
        interiorOrigin={interiorOrigin}
        thermalRendererPreview={thermalRendererPreview}
        rendererPreviewFullBleed={rendererPreviewFullBleed}
        preferredMainPanelId={preferredPanelId}
        onPromotePanel={(panelId) => {
          if (!isVisorHudPanelId(panelId)) return;
          setPreferredPanelId(panelId);
        }}
        onCollapseMainPanel={() => {
          setPreferredPanelId(null);
          // Collapsing organism panels should always return to the underlying
          // spatial context (map or interior) instead of leaving visor mode open.
          closeVisorOrganism();
        }}
        renderPanelBody={(panelId) => {
          if (!isVisorMainHudPanelId(panelId)) return null;
          return renderVisorPanelBody(panelId, {
            organismMain: {
              name,
              contentType,
              childCountLabel,
              organismLoading,
              childrenLoading,
              organismError: organismError ?? undefined,
              childrenError: childrenError ?? undefined,
              hasCurrentState: Boolean(organism?.currentState),
              payload: organism?.currentState?.payload,
            },
            universal: {
              organismId,
              refreshKey,
              canWrite,
              currentContentTypeId: organism?.currentState?.contentTypeId,
              onMutate: () => {
                setRefreshKey((k) => k + 1);
                bumpMutationToken();
              },
            },
          });
        }}
        renderSecondaryBody={(panelId) => {
          if (panelId !== 'organism-nav') return null;

          return (
            <div className="visor-organism-shortcut-actions">
              {secondaryShortcutActions.map((action) => (
                <button
                  key={action.panelId}
                  type="button"
                  className="hud-action-btn"
                  onClick={() => setPreferredPanelId(action.panelId)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          );
        }}
      />
    </>
  );
}
