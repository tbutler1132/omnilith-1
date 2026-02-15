/**
 * VisorMine — lists organisms the current user has stewardship over.
 *
 * Each item is clickable to focus that organism in the Here tab.
 */

import { useUserOrganisms } from '../hooks/use-organism.js';
import { usePlatform } from '../platform/index.js';
import { getPreviewText } from '../utils/preview-text.js';

export function VisorMine() {
  const { state, focusOrganism, setVisorSection } = usePlatform();
  const { data: organisms, loading, error } = useUserOrganisms();

  if (loading) return <div className="visor-section-empty">Loading your organisms...</div>;
  if (error) return <div className="visor-section-empty">Failed to load organisms.</div>;
  if (!organisms || organisms.length === 0) {
    return (
      <div className="visor-section-empty">
        <p>You have no organisms yet.</p>
        <p className="visor-section-hint">Use the Compose tab to threshold your first organism.</p>
      </div>
    );
  }

  function handleSelect(id: string) {
    focusOrganism(id);
    setVisorSection('here');
  }

  return (
    <div className="visor-organism-list">
      {organisms.map((ows) => (
        <button
          key={ows.organism.id}
          type="button"
          className={`visor-organism-item ${state.focusedOrganismId === ows.organism.id ? 'visor-organism-item--focused' : ''}`}
          onClick={() => handleSelect(ows.organism.id)}
        >
          <span className="content-type">{ows.currentState?.contentTypeId ?? '...'}</span>
          <span className="visor-organism-preview">{getPreviewText(ows.currentState)}</span>
          <span className="visor-organism-id">{ows.organism.id.slice(0, 12)}</span>
        </button>
      ))}
    </div>
  );
}
