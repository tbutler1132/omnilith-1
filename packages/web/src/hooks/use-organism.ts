/**
 * Data-fetching hooks for organism data.
 *
 * Each hook calls one API function and returns { data, loading, error }.
 */

import { useEffect, useState } from 'react';
import { ApiError } from '../api/client.js';
import {
  fetchChildren,
  fetchContributions,
  fetchEvents,
  fetchOrganism,
  fetchOrganisms,
  fetchParent,
  fetchProposals,
  fetchRelationships,
  fetchStateHistory,
  fetchUserOrganisms,
  fetchUserProposals,
  fetchVitality,
} from '../api/organisms.js';

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
}

export type OrganismData = {
  organism: Awaited<ReturnType<typeof fetchOrganism>>['organism'];
  currentState: Awaited<ReturnType<typeof fetchOrganism>>['currentState'] | undefined;
};

export type OrganismMarkerData =
  | { kind: 'available'; data: OrganismData }
  | { kind: 'restricted' }
  | { kind: 'error'; error: Error };

const organismCache = new Map<string, OrganismData>();
const organismInflight = new Map<string, Promise<OrganismData>>();
const ORGANISM_BATCH_CONCURRENCY = 4;
const MAX_ORGANISM_CACHE_SIZE = 500;

export function clearOrganismCache(): void {
  organismCache.clear();
  organismInflight.clear();
}

function getCachedOrganismData(id: string): OrganismData | undefined {
  const cached = organismCache.get(id);
  if (!cached) return undefined;

  // Refresh insertion order so frequent reads stay in cache longer (LRU behavior).
  organismCache.delete(id);
  organismCache.set(id, cached);
  return cached;
}

function setCachedOrganismData(id: string, data: OrganismData): void {
  if (organismCache.has(id)) {
    organismCache.delete(id);
  }

  organismCache.set(id, data);

  if (organismCache.size <= MAX_ORGANISM_CACHE_SIZE) return;
  const oldestKey = organismCache.keys().next().value as string | undefined;
  if (!oldestKey) return;
  organismCache.delete(oldestKey);
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

async function fetchOrganismData(id: string): Promise<OrganismData> {
  const res = await fetchOrganism(id);
  return {
    organism: res.organism,
    currentState: res.currentState ?? undefined,
  };
}

function fetchOrganismCached(id: string, refreshKey: number): Promise<OrganismData> {
  // refreshKey=0 uses cache; non-zero refreshes bypass cache while still deduping in-flight.
  const inflightKey = refreshKey > 0 ? `${id}:${refreshKey}` : id;

  if (refreshKey === 0) {
    const cached = getCachedOrganismData(id);
    if (cached) return Promise.resolve(cached);
  }

  const inFlight = organismInflight.get(inflightKey);
  if (inFlight) return inFlight;

  const request = fetchOrganismData(id)
    .then((data) => {
      setCachedOrganismData(id, data);
      return data;
    })
    .finally(() => {
      organismInflight.delete(inflightKey);
    });

  organismInflight.set(inflightKey, request);
  return request;
}

async function fetchOrganismBatch(ids: string[], refreshKey: number): Promise<Record<string, OrganismData>> {
  const out: Record<string, OrganismData> = {};
  const uniqueIds = Array.from(new Set(ids));

  for (let i = 0; i < uniqueIds.length; i += ORGANISM_BATCH_CONCURRENCY) {
    const chunk = uniqueIds.slice(i, i + ORGANISM_BATCH_CONCURRENCY);
    const data = await Promise.all(chunk.map((id) => fetchOrganismCached(id, refreshKey)));
    chunk.forEach((id, idx) => {
      out[id] = data[idx];
    });
  }

  return out;
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

export function classifyOrganismMarkerFetchFailure(error: unknown): Exclude<OrganismMarkerData, { kind: 'available' }> {
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return { kind: 'restricted' };
  }

  return { kind: 'error', error: toError(error) };
}

async function fetchOrganismMarkerBatch(
  ids: string[],
  refreshKey: number,
): Promise<Record<string, OrganismMarkerData>> {
  const out: Record<string, OrganismMarkerData> = {};
  const uniqueIds = Array.from(new Set(ids));

  for (let i = 0; i < uniqueIds.length; i += ORGANISM_BATCH_CONCURRENCY) {
    const chunk = uniqueIds.slice(i, i + ORGANISM_BATCH_CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((id) => fetchOrganismCached(id, refreshKey)));
    chunk.forEach((id, idx) => {
      const result = settled[idx];
      if (result.status === 'fulfilled') {
        out[id] = { kind: 'available', data: result.value };
      } else {
        out[id] = classifyOrganismMarkerFetchFailure(result.reason);
      }
    });
  }

  return out;
}

export function useOrganisms(refreshKey = 0) {
  return useAsync(() => fetchOrganisms({ limit: 200 }).then((r) => r.organisms), [refreshKey]);
}

export function useOrganism(id: string, refreshKey = 0) {
  return useAsync(() => fetchOrganismCached(id, refreshKey), [id, refreshKey]);
}

export function useOrganismsByIds(ids: string[], refreshKey = 0) {
  const key = ids.join(',');
  return useAsync(() => fetchOrganismBatch(ids, refreshKey), [key, refreshKey]);
}

export function useOrganismMarkersByIds(ids: string[], refreshKey = 0) {
  const key = ids.join(',');
  return useAsync(() => fetchOrganismMarkerBatch(ids, refreshKey), [key, refreshKey]);
}

export function useStateHistory(id: string, refreshKey = 0) {
  return useAsync(() => fetchStateHistory(id).then((r) => r.states), [id, refreshKey]);
}

export function useChildren(id: string, refreshKey = 0) {
  return useAsync(() => fetchChildren(id).then((r) => r.children), [id, refreshKey]);
}

async function fetchChildrenBatch(
  parentIds: string[],
): Promise<Record<string, Awaited<ReturnType<typeof fetchChildren>>['children']>> {
  const out: Record<string, Awaited<ReturnType<typeof fetchChildren>>['children']> = {};
  const uniqueIds = Array.from(new Set(parentIds));

  for (let i = 0; i < uniqueIds.length; i += ORGANISM_BATCH_CONCURRENCY) {
    const chunk = uniqueIds.slice(i, i + ORGANISM_BATCH_CONCURRENCY);
    const childLists = await Promise.all(chunk.map((id) => fetchChildren(id).then((r) => r.children)));
    chunk.forEach((id, idx) => {
      out[id] = childLists[idx];
    });
  }

  return out;
}

export function useChildrenByParentIds(parentIds: string[], refreshKey = 0) {
  const key = parentIds.join(',');
  return useAsync(() => fetchChildrenBatch(parentIds), [key, refreshKey]);
}

export function useParent(id: string, refreshKey = 0) {
  return useAsync(() => fetchParent(id).then((r) => r.parent), [id, refreshKey]);
}

export function useVitality(id: string, refreshKey = 0) {
  return useAsync(() => fetchVitality(id).then((r) => r.vitality), [id, refreshKey]);
}

export function useProposals(id: string, refreshKey = 0) {
  return useAsync(() => fetchProposals(id).then((r) => r.proposals), [id, refreshKey]);
}

export function useRelationships(id: string) {
  return useAsync(() => fetchRelationships(id).then((r) => r.relationships), [id]);
}

export function useEvents(id: string) {
  return useAsync(() => fetchEvents(id).then((r) => r.events), [id]);
}

export function useContributions(id: string, refreshKey = 0) {
  return useAsync(() => fetchContributions(id).then((r) => r.contributions), [id, refreshKey]);
}

export function useUserOrganisms(refreshKey = 0) {
  return useAsync(() => fetchUserOrganisms().then((r) => r.organisms), [refreshKey]);
}

export function useUserProposals(refreshKey = 0, enabled = true) {
  return useAsync(
    () => (enabled ? fetchUserProposals().then((r) => r.proposals) : Promise.resolve([])),
    [refreshKey, enabled],
  );
}
