/**
 * Organism interior panel.
 *
 * Renders entered non-map organisms in a plain read surface while
 * keeping users inside Space.
 */

import { OrganismRenderer } from './renderers/organism-renderer.js';
import { useEnteredOrganism } from './use-entered-organism.js';

interface OrganismInteriorProps {
  readonly organismId: string;
}

export function OrganismInterior({ organismId }: OrganismInteriorProps) {
  const { data, loading, error } = useEnteredOrganism(organismId);

  return (
    <section className="space-organism-interior-layer" aria-label="Entered organism">
      <div className="space-organism-interior-body">
        {loading ? <p>Loading organism...</p> : null}
        {error ? <p>{error}</p> : null}
        {!loading && !error && !data?.currentState ? <p>No current state on this organism.</p> : null}
        {!loading && !error && data?.currentState ? (
          <OrganismRenderer contentTypeId={data.currentState.contentTypeId} payload={data.currentState.payload} />
        ) : null}
      </div>
    </section>
  );
}
