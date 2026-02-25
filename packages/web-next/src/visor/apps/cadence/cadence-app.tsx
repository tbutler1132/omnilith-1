/**
 * Boundary cadence app.
 *
 * Shows Move 48 cadence child organisms composed inside the currently focused
 * organism and previews markdown cadence content for quick tending scans.
 */

import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../api/api-client.js';
import { hasSessionId } from '../../../api/session.js';
import type { VisorAppRenderProps } from '../app-contract.js';
import {
  BOUNDARY_CADENCE_TABS,
  type BoundaryCadenceTabId,
  groupBoundaryCadenceChildrenByTab,
  isBoundaryCadenceTabId,
  presentBoundaryCadenceChildren,
} from './boundary-cadence-presenter.js';
import styles from './cadence-app.module.css';
import { CadenceMarkdownPreview } from './cadence-markdown-preview.js';
import { canEditCadenceChild, getCadenceTextPayload, saveCadenceChildDraft } from './cadence-write.js';
import { useBoundaryCadence } from './use-boundary-cadence.js';

const DEFAULT_TAB_ID: BoundaryCadenceTabId = 'variables';

function getPayloadContent(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const content = (payload as { content?: unknown }).content;
  return typeof content === 'string' ? content : undefined;
}

export function CadenceApp({ onRequestClose, organismId, personalOrganismId }: VisorAppRenderProps) {
  void onRequestClose;

  const { data, loading, error, reload } = useBoundaryCadence(organismId);
  const targetedOrganismLabel = data?.boundary.name ?? organismId;
  const isPersonalTarget =
    organismId !== null &&
    personalOrganismId !== null &&
    personalOrganismId !== undefined &&
    organismId === personalOrganismId;
  const cadenceChildren = useMemo(() => presentBoundaryCadenceChildren(data?.children ?? []), [data?.children]);
  const cadenceChildrenByTab = useMemo(() => groupBoundaryCadenceChildrenByTab(cadenceChildren), [cadenceChildren]);

  const [activeTabId, setActiveTabId] = useState<BoundaryCadenceTabId>(DEFAULT_TAB_ID);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [savingChildId, setSavingChildId] = useState<string | null>(null);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cadenceChildrenByTab.some((entry) => entry.tabId === activeTabId && entry.children.length > 0)) {
      return;
    }

    const fallbackTab = cadenceChildrenByTab.find((entry) => entry.children.length > 0)?.tabId;
    setActiveTabId(fallbackTab ?? DEFAULT_TAB_ID);
  }, [activeTabId, cadenceChildrenByTab]);

  useEffect(() => {
    if (organismId === null) {
      setEditingChildId(null);
      setDraftContent('');
      setSavingChildId(null);
      setSaveStatusMessage(null);
      setSaveErrorMessage(null);
      return;
    }

    setEditingChildId(null);
    setDraftContent('');
    setSavingChildId(null);
    setSaveStatusMessage(null);
    setSaveErrorMessage(null);
  }, [organismId]);

  const activeTabChildren = cadenceChildrenByTab.find((entry) => entry.tabId === activeTabId)?.children ?? [];
  const singleChildInTab = activeTabChildren.length === 1;
  const editingChild = editingChildId
    ? (cadenceChildren.find((child) => child.childId === editingChildId) ?? null)
    : null;
  const signedIn = hasSessionId();

  const handleBeginEdit = (childId: string, payload: unknown) => {
    const textPayload = getCadenceTextPayload(payload);
    if (!textPayload) {
      return;
    }

    setEditingChildId(childId);
    setDraftContent(textPayload.content);
    setSaveStatusMessage(null);
    setSaveErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingChildId(null);
    setDraftContent('');
    setSaveErrorMessage(null);
  };

  const handleSaveEdit = async (child: {
    readonly childId: string;
    readonly name: string;
    readonly openTrunk: boolean;
    readonly contentTypeId: string | null;
    readonly payload: unknown;
  }) => {
    if (!signedIn) {
      setSaveErrorMessage('Sign in to tend cadence organisms.');
      return;
    }

    setSavingChildId(child.childId);
    setSaveErrorMessage(null);
    setSaveStatusMessage(null);

    try {
      const outcome = await saveCadenceChildDraft(child, draftContent);
      setEditingChildId(null);
      setDraftContent('');
      setSaveStatusMessage(outcome === 'append-state' ? 'State appended.' : 'Proposal opened.');
      reload();
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setSaveErrorMessage('You are not authorized to tend this cadence organism.');
      } else if (error instanceof Error) {
        setSaveErrorMessage(error.message);
      } else {
        setSaveErrorMessage('Failed to save cadence update.');
      }
    } finally {
      setSavingChildId(null);
    }
  };

  return (
    <section className={styles.cadenceApp}>
      <h2 className={styles.cadenceAppTitle}>Boundary Cadence</h2>
      {targetedOrganismLabel ? (
        <p className={styles.cadenceAppStatus}>
          Looking at: <strong>{targetedOrganismLabel}</strong>
          {isPersonalTarget ? ' (your personal organism)' : ''}
        </p>
      ) : null}

      {!organismId ? <p className={styles.cadenceAppStatus}>Enter an organism to view boundary cadence.</p> : null}
      {organismId && loading ? <p className={styles.cadenceAppStatus}>Loading boundary cadence...</p> : null}
      {organismId && error ? <p className={styles.cadenceAppStatus}>Failed to load boundary cadence.</p> : null}
      {saveStatusMessage ? <p className={styles.cadenceAppStatus}>{saveStatusMessage}</p> : null}
      {saveErrorMessage ? <p className={styles.cadenceAppError}>{saveErrorMessage}</p> : null}

      {organismId && !loading && !error && cadenceChildren.length === 0 ? (
        <p className={styles.cadenceAppStatus}>No Move 48 cadence organisms are composed in this boundary yet.</p>
      ) : null}

      {organismId && !loading && !error && cadenceChildren.length > 0 ? (
        editingChild ? (
          <section className={styles.cadenceAppEditorScreen}>
            <header className={styles.cadenceAppChildHeader}>
              <h3 className={styles.cadenceAppChildName}>{editingChild.name}</h3>
              <span className={styles.cadenceAppChildType}>{editingChild.contentTypeId ?? 'unknown'}</span>
            </header>

            <textarea
              className={`${styles.cadenceAppTextarea} ${styles.cadenceAppTextareaFull}`}
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              disabled={savingChildId === editingChild.childId}
            />
            <div className={styles.cadenceAppEditorActions}>
              <button
                type="button"
                className={styles.cadenceAppActionButton}
                onClick={() => handleSaveEdit(editingChild)}
                disabled={savingChildId === editingChild.childId}
              >
                {savingChildId === editingChild.childId ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className={styles.cadenceAppActionButtonSecondary}
                onClick={handleCancelEdit}
                disabled={savingChildId === editingChild.childId}
              >
                Cancel
              </button>
            </div>
          </section>
        ) : (
          <section className={styles.cadenceAppReadScreen}>
            <div className={styles.cadenceAppTabRow} role="tablist" aria-label="Boundary cadence tabs">
              {BOUNDARY_CADENCE_TABS.map((tab) => {
                const count = cadenceChildrenByTab.find((entry) => entry.tabId === tab.id)?.children.length ?? 0;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === activeTabId}
                    className={`${styles.cadenceAppTabButton} ${tab.id === activeTabId ? styles.cadenceAppTabButtonActive : ''}`}
                    onClick={() => {
                      if (!isBoundaryCadenceTabId(tab.id)) {
                        return;
                      }
                      setActiveTabId(tab.id);
                    }}
                  >
                    {tab.label}
                    <span className={styles.cadenceAppTabCount}>{count}</span>
                  </button>
                );
              })}
            </div>

            {activeTabChildren.length === 0 ? (
              <p className={styles.cadenceAppEmpty}>No cadence organism is composed for this tab yet.</p>
            ) : null}

            {activeTabChildren.length > 0 ? (
              <div className={styles.cadenceAppReadContent}>
                {activeTabChildren.map((child) => {
                  const previewContent = getPayloadContent(child.payload);
                  const editable = canEditCadenceChild(child);

                  return (
                    <article
                      key={child.childId}
                      className={`${styles.cadenceAppChild} ${singleChildInTab ? styles.cadenceAppChildSingle : ''}`}
                    >
                      <div className={styles.cadenceAppChildMeta}>
                        <h3 className={styles.cadenceAppChildName}>{child.name}</h3>
                        <span className={styles.cadenceAppChildType}>{child.contentTypeId ?? 'unknown'}</span>
                        {editable ? (
                          <button
                            type="button"
                            className={styles.cadenceAppActionButton}
                            onClick={() => handleBeginEdit(child.childId, child.payload)}
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>

                      {previewContent ? (
                        <CadenceMarkdownPreview
                          content={previewContent}
                          className={`${styles.cadenceAppPreview} ${singleChildInTab ? styles.cadenceAppPreviewSingle : ''}`}
                        />
                      ) : (
                        <p className={styles.cadenceAppPreviewEmpty}>
                          No markdown preview is available for this cadence organism.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        )
      ) : null}
    </section>
  );
}
