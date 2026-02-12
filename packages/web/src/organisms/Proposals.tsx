/**
 * Proposals — displays open proposals for an organism.
 */

import { useProposals } from '../hooks/use-organism.js';

export function Proposals({ organismId }: { organismId: string }) {
  const { data, loading, error } = useProposals(organismId);

  if (loading) return <p>Loading proposals...</p>;
  if (error) return <p>Failed to load proposals.</p>;
  if (!data || data.length === 0)
    return (
      <section>
        <h3>Proposals</h3>
        <p>No proposals.</p>
      </section>
    );

  return (
    <section>
      <h3>Proposals</h3>
      <ul>
        {data.map((p) => (
          <li key={p.id}>
            <strong>{p.status}</strong> — {p.proposedContentTypeId} by {p.proposedBy},{' '}
            {new Date(p.createdAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </section>
  );
}
