/**
 * HudMyOrganisms — compact scrollable list of the user's organisms.
 *
 * Displayed inside a floating panel when the user clicks "My Organisms"
 * in the map actions. Clicking an item focuses it on the map.
 */

import { useUserOrganisms } from '../hooks/use-organism.js';
import { usePlatform } from '../platform/index.js';

interface HudMyOrganismsProps {
  onSelect: (organismId: string) => void;
}

export function HudMyOrganisms({ onSelect }: HudMyOrganismsProps) {
  const { state } = usePlatform();
  const { data: organisms, loading, error } = useUserOrganisms();

  if (loading) return <div className="hud-panel-empty">Loading...</div>;
  if (error) return <div className="hud-panel-empty">Failed to load.</div>;
  if (!organisms || organisms.length === 0) {
    return <div className="hud-panel-empty">No organisms yet.</div>;
  }

  return (
    <div className="hud-organism-list">
      {organisms.map((ows) => (
        <button
          key={ows.organism.id}
          type="button"
          className={`hud-organism-item ${state.focusedOrganismId === ows.organism.id ? 'hud-organism-item--focused' : ''}`}
          onClick={() => onSelect(ows.organism.id)}
        >
          <span className="content-type">{ows.currentState?.contentTypeId ?? '...'}</span>
          <span className="hud-organism-preview">{ows.organism.name}</span>
        </button>
      ))}
    </div>
  );
}
