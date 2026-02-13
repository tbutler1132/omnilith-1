/**
 * Data-fetching hooks for organism data.
 *
 * Each hook calls one API function and returns { data, loading, error }.
 */

import { useEffect, useState } from 'react';
import {
  fetchChildren,
  fetchEvents,
  fetchOrganism,
  fetchOrganisms,
  fetchParent,
  fetchProposals,
  fetchRelationships,
  fetchStateHistory,
  fetchUserOrganisms,
  fetchVitality,
} from '../api/organisms.js';

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
}

function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    loading: true,
    error: undefined,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: undefined });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: undefined, loading: false, error });
      });

    return () => {
      cancelled = true;
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps passed dynamically by callers
  }, deps);

  return state;
}

export function useOrganisms(refreshKey = 0) {
  return useAsync(() => fetchOrganisms().then((r) => r.organisms), [refreshKey]);
}

export function useOrganism(id: string) {
  return useAsync(
    () =>
      fetchOrganism(id).then((r) => ({
        organism: r.organism,
        currentState: r.currentState ?? undefined,
      })),
    [id],
  );
}

export function useStateHistory(id: string) {
  return useAsync(() => fetchStateHistory(id).then((r) => r.states), [id]);
}

export function useChildren(id: string, refreshKey = 0) {
  return useAsync(() => fetchChildren(id).then((r) => r.children), [id, refreshKey]);
}

export function useParent(id: string) {
  return useAsync(() => fetchParent(id).then((r) => r.parent), [id]);
}

export function useVitality(id: string) {
  return useAsync(() => fetchVitality(id).then((r) => r.vitality), [id]);
}

export function useProposals(id: string) {
  return useAsync(() => fetchProposals(id).then((r) => r.proposals), [id]);
}

export function useRelationships(id: string) {
  return useAsync(() => fetchRelationships(id).then((r) => r.relationships), [id]);
}

export function useEvents(id: string) {
  return useAsync(() => fetchEvents(id).then((r) => r.events), [id]);
}

export function useUserOrganisms(refreshKey = 0) {
  return useAsync(() => fetchUserOrganisms().then((r) => r.organisms), [refreshKey]);
}
