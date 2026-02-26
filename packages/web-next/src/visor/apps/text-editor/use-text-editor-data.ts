/**
 * Text editor read data hook.
 *
 * Loads the currently targeted organism so the text editor can decide whether
 * the target is editable text and render the latest payload.
 */

import type { FetchOrganismResponse } from '@omnilith/api-contracts';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { resolvePublicApiPath } from '../../../api/public-api-path.js';

export interface TextEditorData {
  readonly targetOrganismId: string;
  readonly organism: FetchOrganismResponse['organism'];
  readonly currentState: FetchOrganismResponse['currentState'];
}

interface UseTextEditorDataResult {
  readonly data: TextEditorData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly reload: () => void;
}

export function useTextEditorData(targetedOrganismId: string | null): UseTextEditorDataResult {
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<Omit<UseTextEditorDataResult, 'reload'>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    void reloadCount;

    if (!targetedOrganismId) {
      setState({
        data: null,
        loading: false,
        error: null,
      });
      return;
    }

    setState({
      data: null,
      loading: true,
      error: null,
    });

    apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${targetedOrganismId}`))
      .then((response) => {
        if (cancelled) {
          return;
        }

        setState({
          data: {
            targetOrganismId: targetedOrganismId,
            organism: response.organism,
            currentState: response.currentState,
          },
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setState({
          data: null,
          loading: false,
          error: toError(error, 'Failed to load text editor target.'),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [targetedOrganismId, reloadCount]);

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  return {
    ...state,
    reload,
  };
}

function toError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}
