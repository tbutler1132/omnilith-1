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
import { VisorWidgetLane, VitalityWidget } from '../../widgets/index.js';
import { renderVisorPanelBody } from '../core/panel-body-registry.js';
import {
  isVisorHudPanelId,
  isVisorMainHudPanelId,
  type UniversalVisorHudPanelId,
  type VisorHudPanelId,
} from '../core/panel-schema.js';
import { resolvePanelVisorTemplate } from '../core/template-schema.js';
import { VisorPanelDeck } from '../core/VisorPanelDeck.js';

interface OrganismPanelDeckProps {
  organismId: string;
}

interface OrganismShortcutAction {
  panelId: UniversalVisorHudPanelId;
  label: string;
}

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
  const organismTemplate = resolvePanelVisorTemplate('visor-organism');
  const activeWidgets = new Set(adaptiveVisorState.activeWidgets);
  const vitalityWidgetEnabled =
    activeWidgets.has('vitality') && organismTemplate.widgetSlots.allowedWidgets.includes('vitality');
  const historyNavigationEnabled =
    activeWidgets.has('history-navigation') &&
    organismTemplate.widgetSlots.allowedWidgets.includes('history-navigation');

  const { data: organism } = useOrganism(organismId, refreshKey);
  const { surfaced, loading: surfaceLoading } = useIsSurfaced(worldMapId, organismId);

  const name = organism?.organism.name ?? '...';
  const contentType = organism?.currentState?.contentTypeId ?? '...';
  const openTrunk = organism?.organism.openTrunk ?? false;

  const Renderer = organism?.currentState
    ? (getRenderer(organism.currentState.contentTypeId) ?? FallbackRenderer)
    : null;
  const secondaryShortcutActions: OrganismShortcutAction[] = [];

  secondaryShortcutActions.push({ panelId: 'composition', label: 'Open composition' });
  if (openTrunk) {
    if (canWrite) secondaryShortcutActions.push({ panelId: 'append', label: 'Open append state' });
  } else {
    if (canWrite) secondaryShortcutActions.push({ panelId: 'propose', label: 'Open proposal' });
    secondaryShortcutActions.push({ panelId: 'proposals', label: 'Open proposals' });
  }
  secondaryShortcutActions.push({ panelId: 'history', label: 'Open state history' });
  secondaryShortcutActions.push({ panelId: 'governance', label: 'Open governance' });
  secondaryShortcutActions.push({ panelId: 'relationships', label: 'Open relationships' });

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
      {vitalityWidgetEnabled && preferredPanelId !== null && (
        <VisorWidgetLane>
          <VitalityWidget organismId={organismId} refreshKey={refreshKey} />
        </VisorWidgetLane>
      )}

      <VisorPanelDeck
        title="Organism panels"
        template={organismTemplate}
        surfaced={surfaced}
        openTrunk={openTrunk}
        canWrite={canWrite}
        interiorOrigin={interiorOrigin}
        preferredMainPanelId={preferredPanelId}
        historyNavigationEnabled={historyNavigationEnabled}
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
                  <Renderer state={organism.currentState} zoom={1} focused={false} />
                ) : null,
              onOpenAppend: () => setPreferredPanelId('append'),
              onOpenPropose: () => setPreferredPanelId('propose'),
              onOpenProposals: () => setPreferredPanelId('proposals'),
              onCloseVisor: () => closeVisorOrganism(),
              onVisit: handleVisit,
              onSurface: handleSurface,
            },
            universal: {
              organismId,
              refreshKey,
              canWrite,
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
