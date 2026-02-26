/**
 * Text editor app.
 *
 * Provides a focused tending surface for one targeted text organism with
 * explicit save behavior that respects open-trunk versus proposal workflows.
 */

import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../api/api-client.js';
import { hasSessionId } from '../../../api/session.js';
import type { VisorAppRenderProps } from '../app-contract.js';
import styles from './text-editor-app.module.css';
import {
  canEditTextEditorTarget,
  getTextEditorPayload,
  saveTextEditorDraft,
  type TextEditorTarget,
} from './text-editor-write.js';
import { useTextEditorData } from './use-text-editor-data.js';

const EDITOR_NOT_AVAILABLE_MESSAGE = 'Text editor supports text organisms only.';

export function TextEditorApp({ onRequestClose, organismId }: VisorAppRenderProps) {
  void onRequestClose;

  const { data, loading, error, reload } = useTextEditorData(organismId);
  const [draftContent, setDraftContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const editableTarget = useMemo<TextEditorTarget | null>(() => {
    if (!data?.currentState) {
      return null;
    }

    const candidate: TextEditorTarget = {
      organismId: data.organism.id,
      organismName: data.organism.name,
      openTrunk: data.organism.openTrunk ?? false,
      contentTypeId: data.currentState.contentTypeId,
      payload: data.currentState.payload,
    };

    return canEditTextEditorTarget(candidate) ? candidate : null;
  }, [data]);

  useEffect(() => {
    if (!editableTarget) {
      setDraftContent('');
      return;
    }

    const textPayload = getTextEditorPayload(editableTarget.payload);
    setDraftContent(textPayload?.content ?? '');
  }, [editableTarget]);

  useEffect(() => {
    setSaveStatusMessage(null);
    setSaveErrorMessage(null);
    setSaving(false);

    if (organismId === null) {
      setDraftContent('');
    }
  }, [organismId]);

  const handleSave = async () => {
    if (!editableTarget) {
      return;
    }

    if (!hasSessionId()) {
      setSaveErrorMessage('Sign in to tend text organisms.');
      return;
    }

    setSaving(true);
    setSaveStatusMessage(null);
    setSaveErrorMessage(null);

    try {
      const outcome = await saveTextEditorDraft({
        target: editableTarget,
        nextContent: draftContent,
      });

      if (outcome === 'append-state') {
        reload();
      }

      setSaveStatusMessage(outcome === 'append-state' ? 'State appended.' : 'Proposal opened.');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setSaveErrorMessage('You are not authorized to tend this text organism.');
      } else if (error instanceof Error) {
        setSaveErrorMessage(error.message);
      } else {
        setSaveErrorMessage('Failed to save text draft.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.textEditorApp}>
      <h2 className={styles.textEditorTitle}>Text Editor</h2>

      {data ? (
        <p className={styles.textEditorStatus}>
          Looking at: <strong>{data.organism.name}</strong> ({data.organism.id})
        </p>
      ) : null}

      {!organismId ? <p className={styles.textEditorStatus}>Enter an organism to edit text.</p> : null}
      {organismId && loading ? <p className={styles.textEditorStatus}>Loading text editor target...</p> : null}
      {organismId && error ? <p className={styles.textEditorError}>Failed to load text editor target.</p> : null}
      {saveStatusMessage ? <p className={styles.textEditorStatus}>{saveStatusMessage}</p> : null}
      {saveErrorMessage ? <p className={styles.textEditorError}>{saveErrorMessage}</p> : null}

      {organismId && !loading && !error && data && !data.currentState ? (
        <p className={styles.textEditorStatus}>Target organism has no current state to edit.</p>
      ) : null}

      {organismId && !loading && !error && data && data.currentState && !editableTarget ? (
        <p className={styles.textEditorStatus}>{EDITOR_NOT_AVAILABLE_MESSAGE}</p>
      ) : null}

      {editableTarget ? (
        <div className={styles.textEditorPanel}>
          <p className={styles.textEditorMeta}>
            Content type: <strong>{editableTarget.contentTypeId}</strong> ·{' '}
            {editableTarget.openTrunk ? 'open-trunk' : 'regulated'}
          </p>

          <textarea
            className={styles.textEditorTextarea}
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            disabled={saving}
          />

          <div className={styles.textEditorActions}>
            <button type="button" className={styles.textEditorActionButton} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
