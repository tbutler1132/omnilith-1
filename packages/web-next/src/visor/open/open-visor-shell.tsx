/**
 * Open visor shell.
 *
 * Phone-mode visor layout with a floating shell header spanning both
 * columns, then a thin app rail on the left and active app content on
 * the right. The app rail can collapse into a compact quick-switch mode.
 */

import { type ComponentType, type SVGProps, useCallback, useEffect, useRef, useState } from 'react';
import type { VisorAppOpenRequest } from '../apps/app-contract.js';
import { listCoreVisorApps, listExtraVisorApps, resolveVisorApp } from '../apps/index.js';
import { createSpatialContextChannel } from '../apps/spatial-context-channel.js';
import type { SpatialContextChangedListener, VisorAppSpatialContext } from '../apps/spatial-context-contract.js';
import { OpenVisorHeader } from './open-visor-header.js';

const DEFAULT_APP_BOOT_MS = 520;

interface OpenVisorShellProps {
  readonly appId: string | null;
  readonly organismId: string | null;
  readonly personalOrganismId?: string | null;
  readonly appRouteState?: unknown;
  readonly spatialContext: VisorAppSpatialContext;
  readonly phase: 'opening' | 'open' | 'closing';
  readonly onOpenApp: (appId: string) => void;
  readonly onOpenAppRequest: (request: VisorAppOpenRequest) => void;
  readonly onChangeAppRouteState?: (nextState: unknown) => void;
  readonly onRequestClose: () => void;
}

export function OpenVisorShell({
  appId,
  organismId,
  personalOrganismId,
  appRouteState,
  spatialContext,
  phase,
  onOpenApp,
  onOpenAppRequest,
  onChangeAppRouteState,
  onRequestClose,
}: OpenVisorShellProps) {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBootingApp, setIsBootingApp] = useState(true);
  const appPaneRef = useRef<HTMLDivElement | null>(null);
  const spatialContextChannelRef = useRef(createSpatialContextChannel(spatialContext));
  const appBootTimerRef = useRef<number | null>(null);
  const coreApps = listCoreVisorApps();
  const extraApps = listExtraVisorApps();
  const activeApp = resolveVisorApp(appId);
  const ActiveAppComponent = activeApp.component;
  const AppLoadingComponent = activeApp.loadingComponent ?? GenericVisorAppLoading;
  const activeAppId = activeApp.id;
  const appBootDurationMs = Math.max(0, activeApp.bootDurationMs ?? DEFAULT_APP_BOOT_MS);
  const railToggleLabel = railCollapsed ? 'Expand app rail' : 'Collapse app rail';
  const expandLabel = isExpanded ? 'Restore' : 'Expand';
  const clearAppBootTimer = useCallback(() => {
    if (appBootTimerRef.current !== null) {
      window.clearTimeout(appBootTimerRef.current);
      appBootTimerRef.current = null;
    }
  }, []);
  const onSpatialContextChanged = useCallback(
    (listener: SpatialContextChangedListener) => spatialContextChannelRef.current.subscribe(listener),
    [],
  );

  useEffect(() => {
    spatialContextChannelRef.current.publish(spatialContext);
  }, [spatialContext]);

  useEffect(() => {
    if (!activeAppId) {
      return;
    }

    clearAppBootTimer();
    setIsBootingApp(true);

    appBootTimerRef.current = window.setTimeout(() => {
      setIsBootingApp(false);
      appBootTimerRef.current = null;
    }, appBootDurationMs);
  }, [activeAppId, appBootDurationMs, clearAppBootTimer]);

  useEffect(() => clearAppBootTimer, [clearAppBootTimer]);

  return (
    <section
      className="open-visor-shell"
      data-phase={phase}
      data-expanded={isExpanded ? 'true' : 'false'}
      aria-label="Open visor"
    >
      <OpenVisorHeader
        appLabel={activeApp.label}
        appDescription={activeApp.description}
        isExpanded={isExpanded}
        onToggleExpanded={() => setIsExpanded((current) => !current)}
        onRequestClose={onRequestClose}
      />
      {isExpanded ? (
        <div className="open-visor-expanded-controls">
          <button
            type="button"
            className="open-visor-expand-button"
            onClick={() => setIsExpanded(false)}
            aria-pressed="true"
            aria-label={`${expandLabel} visor app`}
          >
            {expandLabel}
          </button>
          <button type="button" className="open-visor-close-button" onClick={onRequestClose}>
            Close
          </button>
        </div>
      ) : null}

      <div className="open-visor-body" data-rail-collapsed={railCollapsed ? 'true' : 'false'}>
        <aside
          className={`open-visor-rail ${railCollapsed ? 'open-visor-rail--collapsed' : ''}`}
          aria-label="Visor apps"
        >
          <button
            type="button"
            className="open-visor-rail-toggle"
            onClick={() => setRailCollapsed((current) => !current)}
            aria-expanded={!railCollapsed}
            aria-label={railToggleLabel}
            title={railToggleLabel}
          >
            {railCollapsed ? '»' : '«'}
          </button>

          <div className="open-visor-app-list">
            {coreApps.map((app) => (
              <VisorAppLaunchButton
                key={app.id}
                appId={app.id}
                appLabel={app.label}
                isActive={app.id === activeApp.id}
                railCollapsed={railCollapsed}
                onOpenApp={onOpenApp}
                AppIcon={app.icon}
              />
            ))}
            {extraApps.length > 0 ? (
              <>
                <p className="open-visor-app-group-label">Extra</p>
                {extraApps.map((app) => (
                  <VisorAppLaunchButton
                    key={app.id}
                    appId={app.id}
                    appLabel={app.label}
                    isActive={app.id === activeApp.id}
                    railCollapsed={railCollapsed}
                    onOpenApp={onOpenApp}
                    AppIcon={app.icon}
                  />
                ))}
              </>
            ) : null}
          </div>
        </aside>

        <div key={activeAppId} ref={appPaneRef} className="open-visor-app-pane">
          {isBootingApp ? (
            <output className="open-visor-app-boot" aria-live="polite">
              <AppLoadingComponent appLabel={activeApp.label} />
            </output>
          ) : (
            <ActiveAppComponent
              onRequestClose={onRequestClose}
              organismId={organismId}
              personalOrganismId={personalOrganismId}
              spatialContext={spatialContext}
              onSpatialContextChanged={onSpatialContextChanged}
              appRouteState={appRouteState}
              onChangeAppRouteState={onChangeAppRouteState}
              onOpenApp={onOpenAppRequest}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function GenericVisorAppLoading({ appLabel }: { appLabel: string }) {
  return (
    <div className="open-visor-loading">
      <span className="open-visor-loading-orb" aria-hidden="true" />
      <p className="open-visor-loading-label">Booting {appLabel}</p>
    </div>
  );
}

interface VisorAppLaunchButtonProps {
  readonly appId: string;
  readonly appLabel: string;
  readonly isActive: boolean;
  readonly railCollapsed: boolean;
  readonly onOpenApp: (appId: string) => void;
  readonly AppIcon: ComponentType<SVGProps<SVGSVGElement>>;
}

function VisorAppLaunchButton({
  appId,
  appLabel,
  isActive,
  railCollapsed,
  onOpenApp,
  AppIcon,
}: VisorAppLaunchButtonProps) {
  return (
    <button
      type="button"
      className={`open-visor-app-button ${isActive ? 'open-visor-app-button--active' : ''}`}
      onClick={() => onOpenApp(appId)}
      aria-label={`${appLabel} app`}
      title={railCollapsed ? appLabel : undefined}
    >
      <span className="open-visor-app-button-content">
        <AppIcon className="open-visor-app-icon" aria-hidden="true" />
        <span className="open-visor-app-label">{appLabel}</span>
      </span>
    </button>
  );
}
