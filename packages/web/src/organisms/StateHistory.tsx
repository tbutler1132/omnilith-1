/**
 * StateHistory — reverse-chronological list of all states.
 */

import { useStateHistory } from '../hooks/use-organism.js';

export function StateHistory({ organismId }: { organismId: string }) {
  const { data, loading, error } = useStateHistory(organismId);

  if (loading) return <p>Loading state history...</p>;
  if (error) return <p>Failed to load state history.</p>;
  if (!data || data.length === 0)
    return (
      <section>
        <h3>State History</h3>
        <p>No states recorded.</p>
      </section>
    );

  const reversed = [...data].reverse();

  return (
    <section>
      <h3>State History</h3>
      <ul>
        {reversed.map((s) => (
          <li key={s.id}>
            #{s.sequenceNumber} — {s.contentTypeId}, {new Date(s.createdAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </section>
  );
}
