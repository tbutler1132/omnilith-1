/**
 * OrganismView — main page component for viewing a single organism.
 *
 * Fetches organism + current state, resolves the content-type renderer
 * (or falls back), renders the content area above and the universal
 * layer below.
 */

import { Link, useParams } from 'react-router';
import { useOrganism } from '../hooks/use-organism.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';
import { UniversalLayer } from './UniversalLayer.js';

export function OrganismView() {
  const { id } = useParams<{ id: string }>();
  // biome-ignore lint/style/noNonNullAssertion: id guaranteed by route params
  const { data, loading, error } = useOrganism(id!);

  if (loading)
    return (
      <div className="page">
        <p className="loading">Loading organism...</p>
      </div>
    );
  if (error)
    return (
      <div className="page">
        <p className="loading">Organism not found.</p>
      </div>
    );
  if (!data)
    return (
      <div className="page">
        <p className="loading">No data.</p>
      </div>
    );

  const { organism, currentState } = data;
  const Renderer = currentState ? (getRenderer(currentState.contentTypeId) ?? FallbackRenderer) : null;

  return (
    <div className="page organism-detail">
      <header>
        <Link to="/" className="back">
          &larr; All organisms
        </Link>
        <h2>Organism {organism.id}</h2>
        {currentState && (
          <p className="subtitle">
            {currentState.contentTypeId} &middot; state #{currentState.sequenceNumber}
            {organism.openTrunk && ' \u00b7 open-trunk'}
          </p>
        )}
      </header>

      <div className="rendered-content">
        {Renderer && currentState ? <Renderer state={currentState} /> : <p>This organism has no state yet.</p>}
      </div>

      <UniversalLayer organismId={organism.id} />
    </div>
  );
}
