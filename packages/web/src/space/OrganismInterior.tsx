/**
 * OrganismInterior — full-screen content-type renderer for an entered organism.
 *
 * Displayed when the user has zoomed into an organism's interior.
 * Receives an opacity prop for crossfade transitions. Looks up the
 * appropriate content-type renderer, falling back to FallbackRenderer.
 */

import { useOrganism } from '../hooks/use-organism.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';

interface OrganismInteriorProps {
  organismId: string;
  opacity: number;
}

export function OrganismInterior({ organismId, opacity }: OrganismInteriorProps) {
  const { data, loading, error } = useOrganism(organismId);
  const contentTypeId = data?.currentState?.contentTypeId;

  const Renderer = data?.currentState ? (getRenderer(data.currentState.contentTypeId) ?? FallbackRenderer) : null;

  return (
    <div className="organism-interior" style={{ opacity }}>
      {loading && <div className="organism-interior-loading">Loading...</div>}
      {error && <div className="organism-interior-error">Failed to load organism.</div>}
      {Renderer && data?.currentState && (
        <div
          className={`organism-interior-content${contentTypeId ? ` organism-interior-content--${contentTypeId}` : ''}`}
        >
          <Renderer state={data.currentState} zoom={1} focused />
        </div>
      )}
    </div>
  );
}
