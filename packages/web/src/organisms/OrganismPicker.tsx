/**
 * OrganismPicker — inline dropdown for selecting an existing organism.
 *
 * Fetches paged organism search results from the API, filters out
 * excludeIds, and presents a clickable list. Used by the Composition
 * section to compose an existing organism into a parent.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchOrganisms } from '../api/organisms.js';

interface OrganismPickerProps {
  excludeIds: string[];
  onSelect: (organismId: string) => void;
  onCancel: () => void;
}

type OrganismListItem = Awaited<ReturnType<typeof fetchOrganisms>>['organisms'][number];

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 180;

export function OrganismPicker({ excludeIds, onSelect, onCancel }: OrganismPickerProps) {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<OrganismListItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const available = useMemo(() => items.filter((item) => !excluded.has(item.organism.id)), [items, excluded]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setQuery(queryInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [queryInput]);

  const requestPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      const sequence = requestSequence.current + 1;
      requestSequence.current = sequence;
      setLoading(true);

      if (!append) {
        setError('');
      }

      try {
        const response = await fetchOrganisms({
          limit: PAGE_SIZE,
          offset: nextOffset,
          query: query,
        });

        if (requestSequence.current !== sequence) return;

        setItems((current) => (append ? [...current, ...response.organisms] : [...response.organisms]));
        setOffset(nextOffset + response.organisms.length);
        setHasMore(response.organisms.length === PAGE_SIZE);
        setError('');
      } catch (err) {
        if (requestSequence.current !== sequence) return;
        setError(err instanceof Error ? err.message : 'Failed to load organisms.');
      } finally {
        if (requestSequence.current === sequence) {
          setLoading(false);
        }
      }
    },
    [query],
  );

  useEffect(() => {
    void requestPage(0, false);
  }, [requestPage]);

  return (
    <div className="organism-picker">
      <div className="organism-picker-header">
        <span>Select an organism</span>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <input
        type="text"
        className="hud-my-organisms-search"
        value={queryInput}
        onChange={(event) => setQueryInput(event.target.value)}
        placeholder="Search organisms by name..."
        aria-label="Search organisms"
      />

      {loading && items.length === 0 && <p className="organism-picker-loading">Loading...</p>}

      {error && (
        <div className="hud-my-organisms-state">
          <p>{error}</p>
          <button type="button" className="secondary" onClick={() => void requestPage(0, false)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && available.length === 0 && <p className="organism-picker-empty">No organisms found.</p>}

      {available.map(({ organism, currentState }) => (
        <button type="button" key={organism.id} className="organism-picker-item" onClick={() => onSelect(organism.id)}>
          {currentState && <span className="content-type">{currentState.contentTypeId}</span>}
          <span className="organism-picker-preview">{organism.name}</span>
        </button>
      ))}

      {!error && hasMore && (
        <button
          type="button"
          className="secondary organism-picker-load-more"
          disabled={loading}
          onClick={() => void requestPage(offset, true)}
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
