/**
 * OrganismPicker — inline dropdown for selecting an existing organism.
 *
 * Fetches all organisms, filters out those in excludeIds, and presents
 * a clickable list. Used by the Composition section to compose an existing
 * organism into a parent.
 */

import { useOrganisms } from '../hooks/use-organism.js';

function getPreviewText(state: { contentTypeId: string; payload: unknown } | undefined): string {
  if (!state) return 'No state';
  const payload = state.payload as Record<string, unknown>;
  if (state.contentTypeId === 'text' && typeof payload?.content === 'string') {
    const text = payload.content;
    return text.length > 60 ? `${text.slice(0, 60)}...` : text || 'Empty';
  }
  if (typeof payload?.name === 'string') return payload.name;
  if (typeof payload?.title === 'string') return payload.title;
  return `${state.contentTypeId} organism`;
}

interface OrganismPickerProps {
  excludeIds: string[];
  onSelect: (organismId: string) => void;
  onCancel: () => void;
}

export function OrganismPicker({ excludeIds, onSelect, onCancel }: OrganismPickerProps) {
  const { data: organisms, loading } = useOrganisms();

  const excluded = new Set(excludeIds);
  const available = organisms?.filter((o) => !excluded.has(o.organism.id)) ?? [];

  return (
    <div className="organism-picker">
      <div className="organism-picker-header">
        <span>Select an organism</span>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {loading && <p className="organism-picker-loading">Loading...</p>}

      {!loading && available.length === 0 && (
        <p className="organism-picker-empty">No available organisms to compose.</p>
      )}

      {available.map(({ organism, currentState }) => (
        <button type="button" key={organism.id} className="organism-picker-item" onClick={() => onSelect(organism.id)}>
          {currentState && <span className="content-type">{currentState.contentTypeId}</span>}
          <span className="organism-picker-preview">{getPreviewText(currentState)}</span>
          <span className="organism-picker-id">{organism.id.slice(0, 12)}...</span>
        </button>
      ))}
    </div>
  );
}
