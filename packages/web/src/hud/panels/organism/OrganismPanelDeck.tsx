/**
 * OrganismPanelDeck — shared organism tending panel deck.
 *
 * Encapsulates adaptive panel behavior for tending a single organism so
 * every visor context uses one consistent panel system.
 */

import { useState } from 'react';
import { surfaceOnWorldMap } from '../../../api/surface.js';
import { useIsSurfaced } from '../../../hooks/use-is-surfaced.js';
import { useOrganism } from '../../../hooks/use-organism.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformAdaptiveVisorState,
  usePlatformMapState,
  usePlatformStaticState,
  usePlatformViewportMeta,
} from '../../../platform/index.js';
import { FallbackRenderer, getRenderer } from '../../../renderers/index.js';
import { HistoryNavigationWidget, VisorWidgetLane, VitalityWidget } from '../../widgets/index.js';
import { renderVisorPanelBody } from '../core/panel-body-registry.js';
import { resolveVisorPanelLayout } from '../core/panel-layout-policy.js';
import {
  isVisorHudPanelId,
  isVisorMainHudPanelId,
  type UniversalVisorHudPanelId,
  type VisorHudPanelId,
} from '../core/panel-schema.js';
import { resolvePanelVisorTemplate } from '../core/template-schema.js';
import { useMainPanelHistoryNavigation } from '../core/use-main-panel-history-navigation.js';
import { VisorPanelDeck } from '../core/VisorPanelDeck.js';
import { ComponentsSection } from './sections/index.js';

interface OrganismPanelDeckProps {
  organismId: string;
}

interface OrganismShortcutAction {
  panelId: UniversalVisorHudPanelId;
  label: string;
}

type RendererPreviewMode = 'thermal' | 'true-renderer';

export function OrganismPanelDeck({ organismId }: OrganismPanelDeckProps) {
  const { worldMapId, canWrite } = usePlatformStaticState();
  const { enteredOrganismId } = usePlatformMapState();
  const { viewportCenter } = usePlatformViewportMeta();
  const { closeVisorOrganism, focusOrganism, bumpMapRefresh } = usePlatformActions();
  const { bumpMutationToken } = usePlatformAdaptiveVisorActions();
  const adaptiveVisorState = usePlatformAdaptiveVisorState();

  const initialPanelId: VisorHudPanelId | null = enteredOrganismId === organismId ? 'organism' : null;
  const interiorOrigin = enteredOrganismId === organismId;
  const [refreshKey, setRefreshKey] = useState(0);
  const [surfacing, setSurfacing] = useState(false);
  const [preferredPanelId, setPreferredPanelId] = useState<VisorHudPanelId | null>(initialPanelId);
  const [previewMode, setPreviewMode] = useState<RendererPreviewMode>('thermal');
  const organismTemplate = resolvePanelVisorTemplate('visor-organism');
  const activeWidgets = new Set(adaptiveVisorState.activeWidgets);
  const vitalityWidgetEnabled =
    activeWidgets.has('vitality') && organismTemplate.widgetSlots.allowedWidgets.includes('vitality');
  const historyNavigationEnabled =
    activeWidgets.has('history-navigation') &&
    organismTemplate.widgetSlots.allowedWidgets.includes('history-navigation');
  const thermalRendererPreview = preferredPanelId === 'organism' && previewMode === 'thermal';
  const rendererPreviewFullBleed = preferredPanelId === 'organism' && previewMode === 'true-renderer';
  const { data: organism } = useOrganism(organismId, refreshKey);
  const { surfaced, loading: surfaceLoading } = useIsSurfaced(worldMapId, organismId);
  const openTrunk = organism?.organism.openTrunk ?? false;
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

  const Renderer = organism?.currentState
    ? (getRenderer(organism.currentState.contentTypeId) ?? FallbackRenderer)
    : null;
  const secondaryShortcutActions: OrganismShortcutAction[] = [];

  secondaryShortcutActions.push({ panelId: 'composition', label: 'Open composition' });
  if (openTrunk) {
    if (canWrite) secondaryShortcutActions.push({ panelId: 'append', label: 'Open append state' });
  } else {
    secondaryShortcutActions.push({ panelId: 'propose', label: 'Open proposal' });
    secondaryShortcutActions.push({ panelId: 'proposals', label: 'Open proposals' });
  }
  secondaryShortcutActions.push({ panelId: 'contributions', label: 'Open contributions' });
  if (!interiorOrigin) {
    secondaryShortcutActions.push({ panelId: 'history', label: 'Open state history' });
    secondaryShortcutActions.push({ panelId: 'governance', label: 'Open governance' });
    secondaryShortcutActions.push({ panelId: 'relationships', label: 'Open relationships' });
  }

  function handleVisit() {
    focusOrganism(organismId);
    closeVisorOrganism();
  }

  async function handleSurface() {
    setSurfacing(true);
    try {
      await surfaceOnWorldMap(worldMapId, organismId, viewportCenter.x, viewportCenter.y);
      bumpMapRefresh();
      bumpMutationToken();
    } finally {
      setSurfacing(false);
    }
  }

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
          // When tending from an interior context, collapsing should return
          // to interior actions instead of leaving an invisible visor target.
          if (enteredOrganismId === organismId) {
            closeVisorOrganism();
          }
        }}
        renderPanelBody={(panelId) => {
          if (!isVisorMainHudPanelId(panelId)) return null;
          return renderVisorPanelBody(panelId, {
            organismMain: {
              name,
              contentType,
              canWrite,
              openTrunk,
              surfaceLoading,
              surfaced,
              surfacing,
              organismRenderer:
                Renderer && organism?.currentState ? (
                  <Renderer state={organism.currentState} zoom={1} focused={false} previewMode={previewMode} />
                ) : null,
              onOpenAppend: () => setPreferredPanelId('append'),
              onOpenPropose: () => setPreferredPanelId('propose'),
              onOpenProposals: () => setPreferredPanelId('proposals'),
              onCloseVisor: () => closeVisorOrganism(),
              onVisit: handleVisit,
              onSurface: handleSurface,
              previewMode,
              onSelectThermalPreview: () => setPreviewMode('thermal'),
              onSelectTrueRendererPreview: () => setPreviewMode('true-renderer'),
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
          if (panelId === 'components') {
            return (
              <ComponentsSection
                organismId={organismId}
                refreshKey={refreshKey}
                supportsRendererHotspots={contentType === 'song'}
              />
            );
          }

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
