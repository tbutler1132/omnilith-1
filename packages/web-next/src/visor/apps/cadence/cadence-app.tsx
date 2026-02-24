/**
 * Boundary cadence app.
 *
 * Shows Move 48 cadence child organisms composed inside the currently focused
 * organism and previews markdown cadence content for quick tending scans.
 */

import { useEffect, useMemo, useState } from 'react';
import type { VisorAppRenderProps } from '../app-contract.js';
import {
  BOUNDARY_CADENCE_TABS,
  type BoundaryCadenceTabId,
  groupBoundaryCadenceChildrenByTab,
  isBoundaryCadenceTabId,
  presentBoundaryCadenceChildren,
} from './boundary-cadence-presenter.js';
import { CadenceMarkdownPreview } from './cadence-markdown-preview.js';
import { useBoundaryCadence } from './use-boundary-cadence.js';

const DEFAULT_TAB_ID: BoundaryCadenceTabId = 'variables';

function getPayloadContent(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const content = (payload as { content?: unknown }).content;
  return typeof content === 'string' ? content : undefined;
}

export function CadenceApp({ onRequestClose, organismId }: VisorAppRenderProps) {
  void onRequestClose;

  const { data, loading, error } = useBoundaryCadence(organismId);
  const cadenceChildren = useMemo(() => presentBoundaryCadenceChildren(data?.children ?? []), [data?.children]);
  const cadenceChildrenByTab = useMemo(() => groupBoundaryCadenceChildrenByTab(cadenceChildren), [cadenceChildren]);

  const [activeTabId, setActiveTabId] = useState<BoundaryCadenceTabId>(DEFAULT_TAB_ID);

  useEffect(() => {
    if (cadenceChildrenByTab.some((entry) => entry.tabId === activeTabId && entry.children.length > 0)) {
      return;
    }

    const fallbackTab = cadenceChildrenByTab.find((entry) => entry.children.length > 0)?.tabId;
    setActiveTabId(fallbackTab ?? DEFAULT_TAB_ID);
  }, [activeTabId, cadenceChildrenByTab]);

  const activeTabChildren = cadenceChildrenByTab.find((entry) => entry.tabId === activeTabId)?.children ?? [];

  return (
    <section className="cadence-app">
      <h2 className="cadence-app-title">Boundary Cadence</h2>

      {!organismId ? <p className="cadence-app-status">Enter an organism to view boundary cadence.</p> : null}
      {organismId && loading ? <p className="cadence-app-status">Loading boundary cadence...</p> : null}
      {organismId && error ? <p className="cadence-app-status">Failed to load boundary cadence.</p> : null}

      {organismId && !loading && !error && cadenceChildren.length === 0 ? (
        <p className="cadence-app-status">No Move 48 cadence organisms are composed in this boundary yet.</p>
      ) : null}

      {organismId && !loading && !error && cadenceChildren.length > 0 ? (
        <>
          <div className="cadence-app-tab-row" role="tablist" aria-label="Boundary cadence tabs">
            {BOUNDARY_CADENCE_TABS.map((tab) => {
              const count = cadenceChildrenByTab.find((entry) => entry.tabId === tab.id)?.children.length ?? 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tab.id === activeTabId}
                  className={`cadence-app-tab-button ${tab.id === activeTabId ? 'cadence-app-tab-button--active' : ''}`}
                  onClick={() => {
                    if (!isBoundaryCadenceTabId(tab.id)) {
                      return;
                    }
                    setActiveTabId(tab.id);
                  }}
                >
                  {tab.label}
                  <span className="cadence-app-tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          {activeTabChildren.length === 0 ? (
            <p className="cadence-app-empty">No cadence organism is composed for this tab yet.</p>
          ) : null}

          {activeTabChildren.map((child) => {
            const previewContent = getPayloadContent(child.payload);

            return (
              <article key={child.childId} className="cadence-app-child">
                <header className="cadence-app-child-header">
                  <h3 className="cadence-app-child-name">{child.name}</h3>
                  <span className="cadence-app-child-type">{child.contentTypeId ?? 'unknown'}</span>
                </header>

                {previewContent ? (
                  <div className="cadence-app-preview">
                    <CadenceMarkdownPreview content={previewContent} />
                  </div>
                ) : (
                  <p className="cadence-app-preview-empty">
                    No markdown preview is available for this cadence organism.
                  </p>
                )}
              </article>
            );
          })}
        </>
      ) : null}
    </section>
  );
}
