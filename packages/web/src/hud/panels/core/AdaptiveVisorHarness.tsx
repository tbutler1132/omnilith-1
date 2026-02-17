/**
 * AdaptiveVisorHarness — local orchestration harness for panel slot behavior.
 *
 * Provides a quick, isolated surface to iterate context, panel eligibility,
 * and promotion/collapse behavior without loading platform state or API data.
 */

import { useMemo, useState } from 'react';
import { resolveVisorPanelLayout } from './panel-layout-policy.js';
import { type HudContextClass, type HudPanelId, isVisorHudPanelId } from './panel-schema.js';
import { resolvePanelVisorTemplate } from './template-schema.js';
import { VisorPanelDeck } from './VisorPanelDeck.js';

const HARNESS_CONTEXTS: HudContextClass[] = ['map', 'visor-organism', 'interior'];

export function AdaptiveVisorHarness() {
  const [contextClass, setContextClass] = useState<HudContextClass>('visor-organism');
  const [canWrite, setCanWrite] = useState(true);
  const [openTrunk, setOpenTrunk] = useState(false);
  const [surfaced, setSurfaced] = useState(true);
  const [templateValuesReady, setTemplateValuesReady] = useState(false);
  const [interiorOrigin, setInteriorOrigin] = useState(false);
  const [preferredMainPanelId, setPreferredMainPanelId] = useState<HudPanelId | null>(null);
  const template = resolvePanelVisorTemplate(contextClass);

  const previewLayout = useMemo(
    () =>
      resolveVisorPanelLayout({
        context: {
          contextClass,
          surfaced,
          openTrunk,
          templateValuesReady,
          canWrite,
          interiorOrigin,
        },
        preferredMainPanelId,
        slots: template.panelSlots,
      }),
    [contextClass, surfaced, openTrunk, templateValuesReady, canWrite, interiorOrigin, preferredMainPanelId, template],
  );

  function handleContextChange(nextContextClass: HudContextClass) {
    setContextClass(nextContextClass);
    setPreferredMainPanelId(null);
  }

  function handlePromotePanel(panelId: HudPanelId) {
    if (contextClass === 'visor-organism' && !isVisorHudPanelId(panelId)) return;
    setPreferredMainPanelId(panelId);
  }

  return (
    <div className="platform" style={{ padding: 16 }}>
      <div className="hud-info-section" style={{ marginBottom: 16, maxWidth: 1080 }}>
        <span className="hud-info-label">Adaptive Visor Harness</span>
        <div className="hud-compose-actions">
          {HARNESS_CONTEXTS.map((value) => (
            <button
              key={value}
              type="button"
              className="hud-compose-btn"
              onClick={() => handleContextChange(value)}
              aria-pressed={value === contextClass}
            >
              Context: {value}
            </button>
          ))}
        </div>
        <div className="hud-compose-actions">
          <button type="button" className="hud-compose-btn" onClick={() => setCanWrite((value) => !value)}>
            canWrite: {String(canWrite)}
          </button>
          <button type="button" className="hud-compose-btn" onClick={() => setOpenTrunk((value) => !value)}>
            openTrunk: {String(openTrunk)}
          </button>
          <button type="button" className="hud-compose-btn" onClick={() => setSurfaced((value) => !value)}>
            surfaced: {String(surfaced)}
          </button>
          <button
            type="button"
            className="hud-compose-btn"
            onClick={() => setTemplateValuesReady((value) => !value)}
            disabled={contextClass !== 'map'}
          >
            templateValuesReady: {String(templateValuesReady)}
          </button>
          <button
            type="button"
            className="hud-compose-btn"
            onClick={() => setInteriorOrigin((value) => !value)}
            disabled={contextClass !== 'visor-organism'}
          >
            interiorOrigin: {String(interiorOrigin)}
          </button>
        </div>
        <div className="hud-info-row">
          <span className="hud-info-row-label">Available panels</span>
          <span className="hud-info-row-value">{previewLayout.availablePanelIds.join(', ') || 'none'}</span>
        </div>
        <div className="hud-info-row">
          <span className="hud-info-row-label">Preferred panel</span>
          <span className="hud-info-row-value">{preferredMainPanelId ?? 'none'}</span>
        </div>
      </div>

      <div className="adaptive-visor-surface">
        <VisorPanelDeck
          title="Harness deck"
          template={template}
          surfaced={surfaced}
          openTrunk={openTrunk}
          canWrite={canWrite}
          interiorOrigin={interiorOrigin}
          templateValuesReady={templateValuesReady}
          preferredMainPanelId={preferredMainPanelId}
          onPromotePanel={handlePromotePanel}
          onCollapseMainPanel={() => setPreferredMainPanelId(null)}
          renderPanelBody={(panelId) => (
            <div className="hud-info-section">
              <span className="hud-info-label">Panel Body</span>
              <span className="hud-info-row-value">{panelId}</span>
            </div>
          )}
          renderSecondaryBody={(panelId) => (
            <div className="hud-info-section">
              <span className="hud-info-label">Secondary</span>
              <span className="hud-info-row-value">{panelId}</span>
            </div>
          )}
        />
      </div>
    </div>
  );
}
