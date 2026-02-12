/**
 * Governance — shows whether policies govern this organism.
 *
 * Phase 1: shows composed children count and notes governance status.
 * Full governance display (filtering children by policy content types)
 * requires batch-fetching children states, deferred to a follow-up.
 */

import { useChildren } from '../hooks/use-organism.js';

export function Governance({ organismId }: { organismId: string }) {
  const { data, loading, error } = useChildren(organismId);

  if (loading) return <p>Loading governance...</p>;
  if (error) return <p>Failed to load governance.</p>;

  const childCount = data?.length ?? 0;

  return (
    <section>
      <h3>Governance</h3>
      {childCount === 0 ? (
        <p>No composed children. This organism is unregulated.</p>
      ) : (
        <p>
          {childCount} composed {childCount === 1 ? 'child' : 'children'}. Policies among these children govern this
          organism.
        </p>
      )}
    </section>
  );
}
