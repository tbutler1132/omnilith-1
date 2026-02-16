/**
 * Community renderer — displays community description at Close altitude.
 *
 * At Mid altitude the type badge already shows "community". This renderer
 * provides the Close-altitude view with the community's description text.
 */

import type { RendererProps } from './registry.js';

interface CommunityPayload {
  description: string;
  mapOrganismId: string;
}

export function CommunityRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as CommunityPayload;
  const description = payload?.description ?? '';

  return (
    <div className="community-renderer">
      <p className="community-description">{description}</p>
    </div>
  );
}
